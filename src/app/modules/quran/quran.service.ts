/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import axios from 'axios';
import { Translation } from './quran.model';
import { ITranslation } from './quran.interface';
import { ingestSurahTranslations } from './quran.worker';
import { SURAH_LIST } from './quran.constants';

const QURAN_ENC_URL = 'https://quranenc.com/api/v1';

const fetchLanguages = async (language?: string, localization?: string) => {
  let url = `${QURAN_ENC_URL}/translations/list`;
  if (language) {
    url += `/${language}`;
  }
  if (localization) {
    url += `?localization=${localization}`;
  }
  const response = await axios.get(url);
  return response.data.translations;
};

const fetchSurahs = async () => {
  return SURAH_LIST;
};

const getSurahDetail = async (surahNumber: number, translationKey: string = 'english_saheeh', lang: string = 'en') => {
  // 1. Get Surah Metadata from local constant
  const surahInfo = SURAH_LIST.find((s) => s.number === surahNumber);



  if (!surahInfo) {
    throw new Error(`Surah ${surahNumber} not found`);
  }

  // Handle 'ar' or 'quran-uthmani' as edition
  const isArabicOnly = translationKey === 'ar' || translationKey === 'quran-uthmani';
  if (isArabicOnly) {
    translationKey = 'quran-uthmani';
  }

  // 2. Check if translations exist in DB
  let ayahsData = await getSurahTranslations(surahNumber, translationKey);
  
  // 3. If not found, trigger ingestion (ETL)
  if (!ayahsData.length) {
    const languages: any = { 
      'english_saheeh': 'en', 
      'bengali_zakaria': 'bn',
      'quran-uthmani': 'ar'
    };
    const effectiveLang = languages[translationKey] || lang || 'en';
    
    await ingestSurahTranslations(surahNumber, translationKey, effectiveLang);
    ayahsData = await getSurahTranslations(surahNumber, translationKey);
  }

  // 4. Format response
  const ayahs = ayahsData.map((item) => {
    const s = surahNumber.toString().padStart(3, '0');
    const a = item.ayah.toString().padStart(3, '0');
    
    return {
      number: item.ayah,
      text: item.arabicText || '',
      translation: isArabicOnly ? undefined : (item.text || ''),
      footnotes: isArabicOnly ? undefined : (item.footnotes || ''),
      audio: `https://d.quranenc.com/data/audio/${isArabicOnly ? 'english_saheeh' : translationKey}/${s}${a}.mp3`,
    };
  });

  return {
    ...surahInfo,
    ayahs,
    edition: translationKey,
  };
};

const getAyah = async (surah: number, ayah: number, translationKey: string = 'english_saheeh', lang: string = 'en') => {
    let result = await Translation.findOne({ surah, ayah, edition: translationKey }).lean();
    
    if (!result) {
        // Trigger ingestion for the whole surah for better UX later
        await ingestSurahTranslations(surah, translationKey, lang);
        result = await Translation.findOne({ surah, ayah, edition: translationKey }).lean();
    }
    
    if (result) {
        const s = surah.toString().padStart(3, '0');
        const a = ayah.toString().padStart(3, '0');
        (result as any).audio = `https://d.quranenc.com/data/audio/${translationKey}/${s}${a}.mp3`;
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

const upsertTranslations = async (batch: ITranslation[]) => {
  return await Translation.bulkWrite(
    batch.map((doc) => ({
      updateOne: {
        filter: {
          surah: doc.surah,
          ayah: doc.ayah,
          lang: doc.lang,
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
  getSurahDetail,
  getAyah,
  searchQuran,
  getDailyInspiration,
  upsertTranslations,
  getSurahTranslations,
  getTranslationVersion,
  checkSyncMetadata,
  getSyncData
};
