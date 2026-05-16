import axios from 'axios';
import { translate } from '@vitalets/google-translate-api';
import { Dua } from './dua.model';
import { IDua } from './dua.interface';

const getAllDuas = async (
  lang: string = 'en',
  category?: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;

  // Ensure data exists for the language
  if (lang !== 'en') {
    const count = await Dua.countDocuments({ lang });
    if (count === 0) {
      await getOrSyncDuasByLanguage(lang);
    }
  }

  const query: Record<string, unknown> = { lang };
  if (category) {
    query.category = category;
  }

  const [data, total] = await Promise.all([
    Dua.find(query).skip(skip).limit(limit).sort({ title: 1 }).lean(),
    Dua.countDocuments(query),
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

const getDuaById = async (id: string) => {
  return await Dua.findById(id).lean();
};

const createDua = async (payload: Partial<IDua>) => {
  return await Dua.create(payload);
};

const getVersion = async (lang: string = 'en') => {
  const latest = await Dua.findOne({ lang }).sort({ version: -1 }).select('version');
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
  return await Dua.find({
    lang,
    version: { $gt: fromVersion },
  })
    .sort({ category: 1, title: 1 })
    .lean();
};

// 1. মূল ইংরেজি ডাটা সিঙ্ক
const syncEnglishDuas = async () => {
  const url =
    'https://raw.githubusercontent.com/wafaaelmaandy/Hisn-Muslim-Json/master/husn_en.json';
  const response = await axios.get(url);
  const data = response.data;

  const englishDuas = data.English;
  let updatedCount = 0;
  let createdCount = 0;

  for (const categoryItem of englishDuas) {
    const categoryTitle = categoryItem.TITLE;
    for (const textItem of categoryItem.TEXT) {
      try {
        const externalId = `hisn_${categoryItem.ID}_${textItem.ID}`;

        // Basic validation
        if (!textItem.ARABIC_TEXT || !textItem.TRANSLATED_TEXT) {
          continue;
        }

        const duaData: Partial<IDua> = {
          externalId,
          title: categoryTitle,
          arabic: textItem.ARABIC_TEXT,
          translation: textItem.TRANSLATED_TEXT,
          transliteration: textItem.LANGUAGE_ARABIC_TRANSLATED_TEXT,
          category: categoryTitle,
          audio: textItem.AUDIO,
          repeat: textItem.REPEAT || 1,
          lang: 'en',
        };

        const result = await Dua.findOneAndUpdate(
          { externalId, lang: 'en' },
          { $set: duaData },
          { upsert: true, new: false }
        );

        if (result) {
          updatedCount++;
        } else {
          createdCount++;
        }
      } catch (error) {
        console.error(`Error processing text item ${textItem.ID}:`, error);
      }
    }
  }

  return { createdCount, updatedCount };
};

// 2. ডাইনামিক ল্যাঙ্গুয়েজ সিঙ্ক (অফলাইন সাপোর্ট নিশ্চিত করতে)
const getOrSyncDuasByLanguage = async (targetLang: string, category?: string) => {
  // ক) ডাটাবেজে চেক করুন এই ভাষার ডাটা আছে কি না
  const count = await Dua.countDocuments({ lang: targetLang });

  if (count > 0) {
    const query: Record<string, unknown> = { lang: targetLang };
    if (category) {
      query.category = category;
    }
    return await Dua.find(query).lean();
  }

  // খ) ডাটা না থাকলে ইংরেজি ডাটা থেকে অনুবাদ শুরু করুন
  let englishDuas = await Dua.find({ lang: 'en' }).lean();

  if (englishDuas.length === 0) {
    await syncEnglishDuas();
    englishDuas = await Dua.find({ lang: 'en' }).lean();
  }

  console.log(`Translating all duas to: ${targetLang}...`);

  // গ) অনুবাদ লজিক (Batch processing for rate limit safety)
  const BATCH_SIZE = 20;
  const results: IDua[] = [];

  for (let i = 0; i < englishDuas.length; i += BATCH_SIZE) {
    const batch = englishDuas.slice(i, i + BATCH_SIZE);
    const translatedBatch = await Promise.all(
      batch.map(async (dua) => {
        try {
          // টাইটেল এবং ট্রান্সলেশন অনুবাদ করা হচ্ছে
          const translatedTitle = await translate(dua.title, { to: targetLang });
          const translatedText = await translate(dua.translation, {
            to: targetLang,
          });

          return {
            externalId: dua.externalId,
            title: translatedTitle.text,
            arabic: dua.arabic,
            translation: translatedText.text,
            transliteration: dua.transliteration,
            category: translatedTitle.text,
            audio: dua.audio,
            repeat: dua.repeat,
            lang: targetLang,
            version: 1,
          } as IDua;
        } catch (err) {
          console.error(`Translation failed for ${dua.externalId}:`, err);
          return null;
        }
      })
    );

    const validDuas = translatedBatch.filter((d) => d !== null) as IDua[];
    if (validDuas.length > 0) {
      await Dua.insertMany(validDuas);
      results.push(...validDuas);
    }

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < englishDuas.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (category) {
    return results.filter((d) => d.category === category);
  }
  return results;
};

export const DuaService = {
  getAllDuas,
  getDuaById,
  createDua,
  getVersion,
  checkSyncMetadata,
  getSyncData,
  syncEnglishDuas,
  getOrSyncDuasByLanguage,
};
