/* eslint-disable prefer-const */
import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Bookmark, Highlight, LastRead, Translation } from './quran.model';
import { IBookmark, IHighlight, ILastRead, ITranslation } from './quran.interface';
import { ingestSurahTranslations } from './quran.worker';

const ALQURAN_CLOUD_URL = 'https://api.alquran.cloud/v1';
const QURAN_ENC_URL = 'https://quranenc.com/api/v1';

const fetchLanguages = async () => {
  const response = await axios.get(`${QURAN_ENC_URL}/translations/list`);
  return response.data.translations;
};

const fetchSurahs = async () => {
  const response = await axios.get(`${ALQURAN_CLOUD_URL}/surah`);
  return response.data.data;
};

const fetchSurahDetail = async (surahNumber: number, translationKey: string = 'english_saheeh') => {
  // 1. Check if translations exist in DB
  let translations = await getSurahTranslations(surahNumber, translationKey);
  
  // 2. If not found, trigger ingestion (ETL)
  if (!translations.length) {
    // Determine language from translation key (heuristically or fetch from list)
    // For now, mapping some defaults, but in production, we'd lookup from IQuranEncTranslationInfo
    const languages: any = { 'english_saheeh': 'en', 'bengali_zakaria': 'bn' };
    const language = languages[translationKey] || 'en';
    
    await ingestSurahTranslations(surahNumber, translationKey, language);
    translations = await getSurahTranslations(surahNumber, translationKey);
  }

  // 3. Fetch Arabic (uthmani) text - always ensure it's in DB
  let arabicText = await getSurahTranslations(surahNumber, 'quran-uthmani');
  if (!arabicText.length) {
    await ingestSurahTranslations(surahNumber, 'quran-uthmani', 'ar');
    arabicText = await getSurahTranslations(surahNumber, 'quran-uthmani');
  }

  // 4. Merge them for response
  const ayahs = arabicText.map((arabicAyah, index) => ({
    number: arabicAyah.ayah,
    text: arabicAyah.text,
    translation: translations[index]?.text || '',
  }));

  return {
    number: surahNumber,
    ayahs,
    edition: translationKey,
  };
};

const getAyah = async (surah: number, ayah: number, translationKey: string = 'english_saheeh', language: string = 'en') => {
    let result = await Translation.findOne({ surah, ayah, edition: translationKey }).lean();
    
    if (!result) {
        // Trigger ingestion for the whole surah for better UX later
        await ingestSurahTranslations(surah, translationKey, language);
        result = await Translation.findOne({ surah, ayah, edition: translationKey }).lean();
    }
    return result;
};

const searchQuran = async (keyword: string, translationKey: string = 'english_saheeh', page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  
  const query = {
    edition: translationKey,
    text: { $regex: keyword, $options: 'i' },
  };

  const results = await Translation.find(query)
    .sort({ surah: 1, ayah: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Translation.countDocuments(query);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: results,
  };
};

const getDailyInspiration = async (translationKey: string = 'english_saheeh') => {
  const randomAyahNumber = Math.floor(Math.random() * 6236) + 1;
  
  // For simplicity, we fetch a random one from DB if available, otherwise fallback
  let ayah = await Translation.findOne({ edition: translationKey }).skip(randomAyahNumber).lean();

  if (!ayah) {
    // If not in DB, we could fetch from API, but better to just pick from what we have
    // or return a default for now.
    return { surah: 1, ayah: 1, text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' };
  }
  
  return ayah;
};

// Database Operations
const addBookmark = async (payload: IBookmark) => {
  const result = await Bookmark.findOneAndUpdate(
    { user: payload.user, surahNumber: payload.surahNumber, ayahNumber: payload.ayahNumber },
    payload,
    { upsert: true, new: true }
  );
  return result;
};

const getBookmarks = async (userId: string) => {
  return await Bookmark.find({ user: userId }).sort({ createdAt: -1 });
};

const removeBookmark = async (id: string, userId: string) => {
  const result = await Bookmark.findOneAndDelete({ _id: id, user: userId });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bookmark not found');
  }
  return result;
};

const addHighlight = async (payload: IHighlight) => {
    const result = await Highlight.findOneAndUpdate(
      { user: payload.user, surahNumber: payload.surahNumber, ayahNumber: payload.ayahNumber },
      payload,
      { upsert: true, new: true }
    );
    return result;
  };
  
const getHighlights = async (userId: string) => {
    return await Highlight.find({ user: userId }).sort({ createdAt: -1 });
};

const updateLastRead = async (payload: ILastRead) => {
  const result = await LastRead.findOneAndUpdate(
    { user: payload.user },
    payload,
    { upsert: true, new: true }
  );
  return result;
};

const getLastRead = async (userId: string) => {
  return await LastRead.findOne({ user: userId });
};

const upsertTranslations = async (batch: ITranslation[]) => {
  return await Translation.bulkWrite(
    batch.map((doc) => ({
      updateOne: {
        filter: {
          surah: doc.surah,
          ayah: doc.ayah,
          language: doc.language,
          edition: doc.edition,
        },
        update: { $set: doc },
        upsert: true,
      },
    }))
  );
};

const getSurahTranslations = async (surah: number, translationKey: string) => {
    return await Translation.find({
      surah,
      edition: translationKey,
    }).sort({ ayah: 1 }).lean();
};

const getTranslationVersion = async (translationKey: string) => {
    const latest = await Translation.findOne({ edition: translationKey }).sort({ version: -1 }).select('version');
    return latest?.version || 1;
};

// Sync System Logic
const checkSyncMetadata = async (translationKey: string, clientVersion: number) => {
    const serverVersion = await getTranslationVersion(translationKey);
    return {
        updateAvailable: serverVersion > clientVersion,
        serverVersion,
        clientVersion
    };
};

const getSyncData = async (translationKey: string, fromVersion: number = 0) => {
    // Fetch translations that have a version greater than client version
    return await Translation.find({
        edition: translationKey,
        version: { $gt: fromVersion }
    }).sort({ surah: 1, ayah: 1 }).lean();
};

export const QuranServices = {
  fetchLanguages,
  fetchSurahs,
  fetchSurahDetail,
  getAyah,
  searchQuran,
  getDailyInspiration,
  addBookmark,
  getBookmarks,
  removeBookmark,
  addHighlight,
  getHighlights,
  updateLastRead,
  getLastRead,
  upsertTranslations,
  getSurahTranslations,
  getTranslationVersion,
  checkSyncMetadata,
  getSyncData
};
