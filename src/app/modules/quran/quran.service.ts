/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Translation, Language } from './quran.model';
import { ITranslation, ILanguage } from './quran.interface';
import { ingestSurahTranslations, syncLanguage, syncAllLanguages } from './quran.worker';
import { SURAH_LIST, AUDIO_TRANSLATIONS, LANGUAGE_TO_AUDIO_KEY, DEFAULT_AUDIO_KEY, POPULAR_RECITERS } from './quran.constants';

const QURAN_ENC_URL = 'https://quranenc.com/api/v1';
const QURAN_COM_URL = 'https://api.quran.com/api/v4';

const resolveAudioUrl = (
  surahNumber: number,
  ayahNumber: number,
  reciterId?: string
): string => {
  const s = surahNumber.toString().padStart(3, '0');
  const a = ayahNumber.toString().padStart(3, '0');

  if (reciterId) {
    const reciter = POPULAR_RECITERS.find(
      (r) => r.id === reciterId.toLowerCase() || r.urlKey.toLowerCase() === reciterId.toLowerCase()
    );
    if (reciter) {
      return `https://everyayah.com/data/${reciter.urlKey}/${s}${a}.mp3`;
    }
  }

  // Global Audio Logic: Recitation is always in original Arabic. Default is Mishary Rashid Alafasy.
  return `https://everyayah.com/data/Alafasy_128kbps/${s}${a}.mp3`;
};

const fetchLanguages = async (page: number = 1, limit: number = 200, language?: string, localization?: string, edition?: string) => {
  const skip = (page - 1) * limit;

  // 1. Try to fetch from DB first
  let query: any = {};
  if (language) {
    query.language = language;
  }
  if (edition) {
    query.key = edition;
  }

  let dbLanguages = await Language.find(query).sort({ language: 1, name: 1 }).skip(skip).limit(limit).lean();
  let total = await Language.countDocuments(query);

  // 2. If DB is empty or missing full_language_name/iso, fetch from API
   const needsRefresh = dbLanguages.length > 0 && !dbLanguages.every(l => l.full_language_name && l.iso);
  if (dbLanguages.length === 0 || needsRefresh) {
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
    const isoToNameMap = new Map();
    (comLangResponse.data.languages || []).forEach((l: any) => {
      langMap.set(l.name.toLowerCase(), l.iso_code);
      isoToNameMap.set(l.iso_code, l.name);
    });

    const encTranslations: Partial<ILanguage>[] = (encResponse.data.translations || []).map((t: any) => ({
      key: t.key,
      name: t.title,
      language: t.language_iso_code,
      iso: t.language_iso_code,
      full_language_name: isoToNameMap.get(t.language_iso_code) || t.language_iso_code,
      author: t.description,
      source: 'quranenc'
    }));

    const comTranslations: Partial<ILanguage>[] = (comTransResponse.data.translations || []).map((t: any) => {
      const langName = t.language_name.toLowerCase();
      const iso = langMap.get(langName) || t.language_name;
      return {
        key: `qcom:${t.id}`,
        name: t.name,
        language: iso,
        iso: iso,
        full_language_name: t.language_name,
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

const fetchSurahs = async (page: number = 1, limit: number = 10, language?: string) => {
  const skip = (page - 1) * limit;
  const total = SURAH_LIST.length;
  let data: any[] = SURAH_LIST.slice(skip, skip + limit);

  if (language && language !== 'en') {
    try {
      const response = await axios.get(`${QURAN_COM_URL}/chapters?language=${language}`);
      const chapters = response.data.chapters;
      if (chapters && chapters.length > 0) {
        data = data.map(surah => {
          const chapter = chapters.find((c: any) => c.id === surah.number);
          if (chapter && chapter.translated_name) {
            return {
              ...surah,
              translatedName: chapter.translated_name.name
            };
          }
          return surah;
        });
      }
    } catch (error) {
      console.error('Failed to fetch translated surah names:', error);
    }
  }

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

const resolveTranslationKey = async (translationKey: string): Promise<string> => {
  if (!translationKey) return 'english_saheeh';
  
  const langDoc = await Language.findOne({
    $or: [
      { key: translationKey },
      { language: translationKey.toLowerCase() },
      { iso: translationKey.toLowerCase() }
    ]
  }).lean();

  if (langDoc) {
    return langDoc.key;
  }

  return translationKey;
};

const getSurahDetail = async (surahNumber: number, translationKey: string = 'english_saheeh', lang?: string, reciter?: string) => {
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

  translationKey = await resolveTranslationKey(translationKey);

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
    return {
      number: item.ayah,
      text: item.arabicText || '',
      translation: isArabicOnly ? '' : (item.text || ''),
      footnotes: isArabicOnly ? '' : (item.footnotes || ''),
      audio: resolveAudioUrl(surahNumber, item.ayah, reciter),
    };
  });

  return {
    ...surahInfo,
    ayahs,
    edition: translationKey,
  };
};

const getAyah = async (surah: number, ayah: number, translationKey: string = 'english_saheeh', lang?: string, reciter?: string) => {
    translationKey = await resolveTranslationKey(translationKey);
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
        (result as any).audio = resolveAudioUrl(surah, ayah, reciter);
        (result as any).shareUrl = `quraninternational://surah/${surah}/ayah/${ayah}`;
        (result as any).shareText = `${result.arabicText || ''}\n[Quran ${surah}:${ayah}]`;
    }
    
    return result;
};

const searchQuran = async (keyword: string, translationKey: string = 'english_saheeh', page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  
  translationKey = await resolveTranslationKey(translationKey);
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

const getDailyInspiration = async (translationKey: string = 'english_saheeh', lang?: string) => {
  translationKey = await resolveTranslationKey(translationKey);
  const count = await Translation.countDocuments({ edition: translationKey });
  if (count === 0) {
    const inspirationalVerses = [
      { surah: 94, ayah: 5 },
      { surah: 94, ayah: 6 },
      { surah: 2, ayah: 152 },
      { surah: 3, ayah: 139 },
      { surah: 65, ayah: 3 },
      { surah: 1, ayah: 1 },
    ];
    const picked = inspirationalVerses[Math.floor(Math.random() * inspirationalVerses.length)];
    try {
      const ayahDoc = await getAyah(picked.surah, picked.ayah, translationKey, lang);
      if (ayahDoc && ayahDoc.text) {
        return {
          surah: picked.surah,
          ayah: picked.ayah,
          text: ayahDoc.text,
          edition: translationKey,
        };
      }
    } catch (_) {}
    return { surah: 1, ayah: 1, text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' };
  }
  
  const randomSkip = Math.floor(Math.random() * count);
  let ayah = await Translation.findOne({ edition: translationKey }).skip(randomSkip).lean();

  if (!ayah) {
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

const clampSyncLimit = (limit: number) => {
  const n = Number(limit) || 500
  return Math.min(Math.max(n, 1), 1000)
}

/**
 * Paginated dump for offline-first clients.
 * Pages in Mongo (skip/limit) — does not load the full edition into RAM.
 * Returns ayah rows the Flutter app can insert into SQLite.
 */
const getSyncData = async (
  translationKey: string,
  fromVersion: number = 0,
  page: number = 1,
  limit: number = 500,
) => {
  const safeLimit = clampSyncLimit(limit)
  const safePage = Math.max(Number(page) || 1, 1)
  const skip = (safePage - 1) * safeLimit

  const filter = {
    edition: translationKey,
    version: { $gt: fromVersion },
  }

  let total = await Translation.countDocuments(filter)

  // First fill: empty edition → ingest all 114 surahs once, then dump
  if (total === 0 && fromVersion === 0) {
    const langInfo = await Language.findOne({ key: translationKey })
    await syncLanguage(translationKey, langInfo?.language)
    total = await Translation.countDocuments(filter)
  }

  const data = await Translation.find(filter)
    .sort({ surah: 1, ayah: 1 })
    .skip(skip)
    .limit(safeLimit)
    .lean()

  const rows = data.map(item => ({
    surah: item.surah,
    number: item.ayah,
    text: item.arabicText || '',
    translation: item.text || '',
    footnotes: item.footnotes || '',
    audio: resolveAudioUrl(item.surah, item.ayah),
    edition: item.edition,
    lang: item.lang,
    version: item.version,
  }))

  return {
    data: rows,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  }
}

const getGzippedLanguagePack = async (translationKey: string): Promise<string> => {
  const latestVersion = await getTranslationVersion(translationKey);
  const dirPath = path.join(process.cwd(), 'uploads/lang-packs');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, `lang_${translationKey}_v${latestVersion}.json.gz`);

  // Check if cached file exists
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  // Fetch from Mongo
  let data = await Translation.find({ edition: translationKey }).sort({ surah: 1, ayah: 1 }).lean();

  // Ingest if empty
  if (data.length === 0) {
    const langInfo = await Language.findOne({ key: translationKey });
    await syncLanguage(translationKey, langInfo?.language);
    data = await Translation.find({ edition: translationKey }).sort({ surah: 1, ayah: 1 }).lean();
  }

  const rows = data.map(item => ({
    surah: item.surah,
    number: item.ayah,
    text: item.arabicText || '',
    translation: item.text || '',
    footnotes: item.footnotes || '',
    audio: resolveAudioUrl(item.surah, item.ayah),
    edition: item.edition,
    lang: item.lang,
    version: item.version,
  }));

  const jsonStr = JSON.stringify(rows);
  const compressed = zlib.gzipSync(jsonStr);
  fs.writeFileSync(filePath, compressed);

  // Clean up older versions
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (
        file.startsWith(`lang_${translationKey}_v`) &&
        file.endsWith('.json.gz') &&
        file !== `lang_${translationKey}_v${latestVersion}.json.gz`
      ) {
        fs.unlinkSync(path.join(dirPath, file));
      }
    }
  } catch (_) {}

  return filePath;
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
  syncAll,
  getGzippedLanguagePack
};
