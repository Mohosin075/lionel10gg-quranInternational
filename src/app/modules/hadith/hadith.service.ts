import axios from 'axios';
import { Hadith } from './hadith.model';
import { IHadith } from './hadith.interface';

const getAllHadiths = async (
  lang: string = 'en',
  category?: string,
  source?: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  // Ensure data exists for the requested language
  if (lang !== 'en') {
    const count = await Hadith.countDocuments({ lang });
    if (count === 0) {
      await getOrSyncHadithsByLanguage(lang);
    }
  }

  const query: Record<string, unknown> = { lang, isActive: true };
  if (category) {
    query.category = category;
  }
  if (source) {
    query.source = source;
  }

  const [data, total] = await Promise.all([
    Hadith.find(query).skip(skip).limit(limit).sort({ hadithNo: 1 }).lean(),
    Hadith.countDocuments(query),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
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
  // If editing, increment the version to trigger sync updates on offline clients
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

const getSyncData = async (lang: string = 'en', fromVersion: number = 0) => {
  return await Hadith.find({
    lang,
    version: { $gt: fromVersion },
  })
    .sort({ hadithNo: 1 })
    .lean();
};

// Dynamic Google translation support for rare languages
const getOrSyncHadithsByLanguage = async (targetLang: string) => {
  const count = await Hadith.countDocuments({ lang: targetLang });
  if (count > 0) {
    return await Hadith.find({ lang: targetLang }).lean();
  }

  // Translate from English source hadiths
  let sourceHadiths = await Hadith.find({ lang: 'en' }).lean();
  if (sourceHadiths.length === 0) {
    // Fallback if no english hadiths exist in database
    return [];
  }

  console.log(`Translating all Hadiths to: ${targetLang}...`);

  const translateText = async (text: string, to: string): Promise<string> => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await axios.get(url);
      let translated = '';
      if (res.data && res.data[0]) {
        for (const segment of res.data[0]) {
          translated += segment[0];
        }
      }
      return translated;
    } catch (error) {
      console.error('Hadith translation API error:', error);
      return text; // Return original text on translation fail
    }
  };

  const results: IHadith[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < sourceHadiths.length; i += BATCH_SIZE) {
    const batch = sourceHadiths.slice(i, i + BATCH_SIZE);
    const translatedBatch: (IHadith | null)[] = [];

    for (const hadith of batch) {
      try {
        const translatedChapter = await translateText(hadith.chapter, targetLang);
        await new Promise((resolve) => setTimeout(resolve, 200));
        const translatedTranslation = await translateText(hadith.translation, targetLang);
        await new Promise((resolve) => setTimeout(resolve, 200));
        const translatedCategory = await translateText(hadith.category, targetLang);

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
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const validHadiths = translatedBatch.filter((h) => h !== null) as IHadith[];
    if (validHadiths.length > 0) {
      await Hadith.insertMany(validHadiths);
      results.push(...validHadiths);
    }
    console.log(`Translated ${i + validHadiths.length} of ${sourceHadiths.length} Hadiths`);
    if (i + BATCH_SIZE < sourceHadiths.length) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
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
};
