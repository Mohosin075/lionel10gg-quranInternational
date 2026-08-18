import axios from 'axios';
import { Hadith } from './hadith.model';
import { IHadith } from './hadith.interface';
import { TranslationHelper } from '../../../helpers/translationHelper';

const EDITION_SOURCE_MAP: Record<string, string> = {
  bukhari: 'Sahih al-Bukhari',
  muslim: 'Sahih Muslim',
  abudawud: 'Sunan Abi Dawud',
  tirmidhi: 'Jami at-Tirmidhi',
  nasai: 'Sunan an-Nasai',
  ibnmajah: 'Sunan Ibn Majah',
};

const getSourceName = (edition: string): string => {
  const bookKey = edition.toLowerCase().split('-')[1] || 'hadith';
  return EDITION_SOURCE_MAP[bookKey] || 'Official Hadith';
};

const syncFromGlobalApi = async (edition: string, fromHadith: number, toHadith: number) => {
  let createdCount = 0;
  let updatedCount = 0;

  const sourceName = getSourceName(edition);
  const arabEdition = edition.replace('eng-', 'ara-');

  for (let i = fromHadith; i <= toHadith; i++) {
    try {
      const engUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${edition}/${i}.json`;
      const engRes = await axios.get(engUrl);
      
      if (!engRes.data || !engRes.data.hadiths || engRes.data.hadiths.length === 0) {
        continue;
      }
      
      const engHadith = engRes.data.hadiths[0];
      const chapterName = engRes.data.metadata?.section
        ? (Object.values(engRes.data.metadata.section)[0] as string)
        : 'General';

      let arabicText = 'Arabic text unavailable online';
      try {
        const araUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${arabEdition}/${i}.json`;
        const araRes = await axios.get(araUrl);
        if (araRes.data && araRes.data.hadiths && araRes.data.hadiths.length > 0) {
          arabicText = araRes.data.hadiths[0].text;
        }
      } catch (err) {
        console.error(`Failed to fetch Arabic text for Hadith ${i}:`, err);
      }

      const hadithBookKey = edition.split('-')[1] || 'hadith';
      const hadithNo = `${hadithBookKey}_${i}`;

      const hadithData: Partial<IHadith> = {
        hadithNo,
        source: sourceName,
        chapter: chapterName,
        arabicText,
        translation: engHadith.text,
        authenticity: 'Sahih',
        category: chapterName,
        lang: 'en',
        version: 1,
        isActive: true,
      };

      const result = await Hadith.findOneAndUpdate(
        { hadithNo, lang: 'en' },
        { $set: hadithData },
        { upsert: true, new: false }
      );

      if (result) {
        updatedCount++;
      } else {
        createdCount++;
      }

      await TranslationHelper.sleep(150);
    } catch (error) {
      console.error(`Error syncing Hadith ${i} from global API:`, error);
    }
  }

  return { createdCount, updatedCount };
};

const getAllHadiths = async (
  lang: string = 'en',
  category?: string,
  source?: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  // Auto-populate DB with enough Hadith for offline (not a handful)
  const totalEnglish = await Hadith.countDocuments({ lang: 'en' });
  if (totalEnglish === 0) {
    console.log('[HadithService] Auto-syncing Bukhari 1-100 + Muslim 1-50...');
    await syncFromGlobalApi('eng-bukhari', 1, 100);
    await syncFromGlobalApi('eng-muslim', 1, 50);
  }

  if (lang !== 'en') {
    const count = await Hadith.countDocuments({ lang });
    if (count === 0) {
      await getOrSyncHadithsByLanguage(lang);
    }
  }

  const query: Record<string, unknown> = { lang, isActive: true };
  if (category) query.category = category;
  if (source) query.source = source;

  const [data, total] = await Promise.all([
    Hadith.find(query).skip(skip).limit(limit).sort({ hadithNo: 1 }).lean(),
    Hadith.countDocuments(query),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

const getHadithById = async (id: string) => {
  return await Hadith.findById(id).lean();
};

const createHadith = async (payload: Partial<IHadith>) => {
  return await Hadith.create(payload);
};

const updateHadith = async (id: string, payload: Partial<IHadith>) => {
  const current = await Hadith.findById(id);
  const newVersion = current ? (current.version || 1) + 1 : 1;
  return await Hadith.findByIdAndUpdate(
    id,
    { ...payload, version: newVersion },
    { new: true },
  );
};

const deleteHadith = async (id: string) => {
  return await Hadith.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

const getVersion = async (lang: string = 'en') => {
  const latest = await Hadith.findOne({ lang }).sort({ version: -1 }).select('version');
  return latest?.version || 1;
};

const checkSyncMetadata = async (lang: string = 'en', clientVersion: number) => {
  const serverVersion = await getVersion(lang);
  return {
    updateAvailable: serverVersion > clientVersion,
    serverVersion,
    clientVersion,
    lang,
  };
};

const clampSyncLimit = (limit: number) => {
  const n = Number(limit) || 500
  return Math.min(Math.max(n, 1), 1000)
}

const getSyncData = async (
  lang: string = 'en',
  fromVersion: number = 0,
  page: number = 1,
  limit: number = 500,
) => {
  // Ingest-if-empty so download-sync can fill the phone
  const existing = await Hadith.countDocuments({ lang })
  if (existing === 0) {
    const totalEnglish = await Hadith.countDocuments({ lang: 'en' })
    if (totalEnglish === 0) {
      console.log('[HadithService] download-sync empty — seeding Bukhari 1-100 + Muslim 1-50...')
      await syncFromGlobalApi('eng-bukhari', 1, 100)
      await syncFromGlobalApi('eng-muslim', 1, 50)
    }
    if (lang !== 'en') {
      await getOrSyncHadithsByLanguage(lang)
    }
  }

  const safeLimit = clampSyncLimit(limit)
  const safePage = Math.max(Number(page) || 1, 1)
  const skip = (safePage - 1) * safeLimit
  const filter = { lang, isActive: { $ne: false }, version: { $gt: fromVersion } }
  const total = await Hadith.countDocuments(filter)
  const data = await Hadith.find(filter)
    .sort({ hadithNo: 1 })
    .skip(skip)
    .limit(safeLimit)
    .lean()
  return {
    data,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  }
}

const getOrSyncHadithsByLanguage = async (targetLang: string) => {
  const count = await Hadith.countDocuments({ lang: targetLang });
  if (count > 0) {
    return await Hadith.find({ lang: targetLang }).lean();
  }

  const sourceHadiths = await Hadith.find({ lang: 'en' }).lean();
  if (sourceHadiths.length === 0) return [];

  console.log(`[HadithService] Translating ${sourceHadiths.length} Hadiths to: ${targetLang}...`);

  const results: IHadith[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < sourceHadiths.length; i += BATCH_SIZE) {
    const batch = sourceHadiths.slice(i, i + BATCH_SIZE);
    const translatedBatch: (IHadith | null)[] = [];

    for (const hadith of batch) {
      try {
        const translatedChapter = await TranslationHelper.translateText(hadith.chapter, targetLang);
        await TranslationHelper.sleep(200);
        const translatedTranslation = await TranslationHelper.translateText(hadith.translation, targetLang);
        await TranslationHelper.sleep(200);
        const translatedCategory = await TranslationHelper.translateText(hadith.category, targetLang);

        translatedBatch.push({
          hadithNo: hadith.hadithNo,
          source: hadith.source,
          chapter: translatedChapter,
          arabicText: hadith.arabicText,
          translation: translatedTranslation,
          authenticity: hadith.authenticity,
          category: translatedCategory,
          lang: targetLang,
          version: 1,
          isActive: hadith.isActive,
        } as IHadith);
      } catch (err) {
        console.error(`Translation failed for Hadith ${hadith.hadithNo}:`, err);
        translatedBatch.push(null);
      }
      await TranslationHelper.sleep(300);
    }

    const validHadiths = translatedBatch.filter((h) => h !== null) as IHadith[];
    if (validHadiths.length > 0) {
      await Hadith.insertMany(validHadiths);
      results.push(...validHadiths);
    }
    console.log(`Translated ${i + validHadiths.length} of ${sourceHadiths.length} Hadiths`);
    if (i + BATCH_SIZE < sourceHadiths.length) {
      await TranslationHelper.sleep(1500);
    }
  }

  return results;
};

export const HadithServices = {
  getAllHadiths,
  getHadithById,
  createHadith,
  updateHadith,
  deleteHadith,
  getVersion,
  checkSyncMetadata,
  getSyncData,
  getOrSyncHadithsByLanguage,
  syncFromGlobalApi,
};
