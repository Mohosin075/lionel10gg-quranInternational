/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import axios from 'axios';
import { Translation, Language } from './quran.model';
import { ITranslation, ILanguage } from './quran.interface';
import { ingestSurahTranslations, syncLanguage, syncAllLanguages } from './quran.worker';
import { SURAH_LIST } from './quran.constants';

const QURAN_ENC_URL = 'https://quranenc.com/api/v1';
const QURAN_COM_URL = 'https://api.quran.com/api/v4';

const fetchLanguages = async (page: number = 1, limit: number = 200, language?: string, localization?: string) => {
  const skip = (page - 1) * limit;

  // 1. Try to fetch from DB first
  let query: any = {};
  if (language) {
    query.language = language;
  }

  let dbLanguages = await Language.find(query).sort({ language: 1, name: 1 }).skip(skip).limit(limit).lean();
  let total = await Language.countDocuments(query);

  // 2. If DB is empty or explicitly requested (not implemented here, but could be), fetch from API
  if (dbLanguages.length === 0) {
    // Fetch from API
    let encUrl = `${QURAN_ENC_URL}/translations/list`;
    if (language) {
      encUrl += `/${language}`;
    }
    if (localization) {
      encUrl += `?localization=${localization}`;
    }
    
    const comTranslationsUrl = `${QURAN_COM_URL}/resources/translations`;
    const comLanguagesUrl = `${QURAN_COM_URL}/resources/languages`;
    
    const [encResponse, comTransResponse, comLangResponse] = await Promise.all([
      axios.get(encUrl).catch(() => ({ data: { translations: [] } })),
      axios.get(comTranslationsUrl).catch(() => ({ data: { translations: [] } })),
      axios.get(comLanguagesUrl).catch(() => ({ data: { languages: [] } }))
    ]);

    const langMap = new Map();
    (comLangResponse.data.languages || []).forEach((l: any) => {
      langMap.set(l.name.toLowerCase(), l.iso_code);
    });

    const encTranslations: Partial<ILanguage>[] = (encResponse.data.translations || []).map((t: any) => ({
      key: t.key,
      name: t.title,
      language: t.language_iso_code,
      author: t.description,
      source: 'quranenc'
    }));

    const comTranslations: Partial<ILanguage>[] = (comTransResponse.data.translations || []).map((t: any) => {
      const langName = t.language_name.toLowerCase();
      return {
        key: `qcom:${t.id}`,
        name: t.name,
        language: langMap.get(langName) || t.language_name,
        author: t.author_name,
        source: 'qurancom'
      };
    });

    const allTranslations = [...encTranslations, ...comTranslations];
    
    // Save to DB
    if (allTranslations.length > 0) {
      await Language.bulkWrite(
        allTranslations.map((t) => ({
          updateOne: {
            filter: { key: t.key },
            update: { $set: t },
            upsert: true,
          },
        }))
      );
    }

    dbLanguages = await Language.find(query).sort({ language: 1, name: 1 }).skip(skip).limit(limit).lean();
    total = await Language.countDocuments(query);
  }

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    data: dbLanguages
  };
};

const fetchSurahs = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  const total = SURAH_LIST.length;
  const data = SURAH_LIST.slice(skip, skip + limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    data
  };
};

const getSurahDetail = async (surahNumber: number, translationKey: string = 'english_saheeh', lang?: string) => {
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
    // Determine the correct language for this edition
    let targetLang = lang;
    if (!targetLang || targetLang === 'en') {
      const langInfo = await Language.findOne({ key: translationKey });
      if (langInfo) {
        targetLang = langInfo.language;
      } else {
        targetLang = targetLang || 'en';
      }
    }

    await ingestSurahTranslations(surahNumber, translationKey, targetLang);
    ayahsData = await getSurahTranslations(surahNumber, translationKey);
  }

  // 4. Format response
  const ayahs = ayahsData.map((item) => {
    const s = surahNumber.toString().padStart(3, '0');
    const a = item.ayah.toString().padStart(3, '0');
    
    // For audio, we use a stable source (QuranEnc Arabic) for all translations
    // unless it's specifically an Arabic edition.
    const audioKey = isArabicOnly ? 'english_saheeh' : (translationKey.startsWith('qcom:') ? 'english_saheeh' : translationKey);
    
    return {
      number: item.ayah,
      text: item.arabicText || '',
      translation: isArabicOnly ? undefined : (item.text || ''),
      footnotes: isArabicOnly ? undefined : (item.footnotes || ''),
      audio: `https://d.quranenc.com/data/audio/${audioKey}/${s}${a}.mp3`,
    };
  });

  return {
    ...surahInfo,
    ayahs,
    edition: translationKey,
  };
};

const getAyah = async (surah: number, ayah: number, translationKey: string = 'english_saheeh', lang?: string) => {
    let result = await Translation.findOne({ surah, ayah, edition: translationKey }).lean();
    
    if (!result) {
        // Determine the correct language for this edition
        let targetLang = lang;
        if (!targetLang || targetLang === 'en') {
          const langInfo = await Language.findOne({ key: translationKey });
          if (langInfo) {
            targetLang = langInfo.language;
          } else {
            targetLang = targetLang || 'en';
          }
        }

        // Trigger ingestion for the whole surah for better UX later
        await ingestSurahTranslations(surah, translationKey, targetLang);
        result = await Translation.findOne({ surah, ayah, edition: translationKey }).lean();
    }
    
    if (result) {
        const s = surah.toString().padStart(3, '0');
        const a = ayah.toString().padStart(3, '0');
        const audioKey = translationKey.startsWith('qcom:') ? 'english_saheeh' : translationKey;
        (result as any).audio = `https://d.quranenc.com/data/audio/${audioKey}/${s}${a}.mp3`;
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

const syncEdition = async (edition: string) => {
  // Run in background
  syncLanguage(edition);
};

const syncAll = async () => {
  // Run in background
  syncAllLanguages();
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
  getSyncData,
  syncEdition,
  syncAll
};
