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
  malik: 'Muwatta Malik',
  nawawi: 'Forty Hadith Nawawi',
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
  const hadithBookKey = edition.split('-')[1] || 'hadith';

  // Fast Bulk Fetch Approach (Single HTTP Call per edition)
  try {
    const engUrl = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${edition}.min.json`;
    const engRes = await axios.get(engUrl);

    if (engRes.data && Array.isArray(engRes.data.hadiths) && engRes.data.hadiths.length > 0) {
      let araHadithsMap: Record<number, string> = {};
      try {
        const araUrl = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${arabEdition}.min.json`;
        const araRes = await axios.get(araUrl);
        if (araRes.data && Array.isArray(araRes.data.hadiths)) {
          araRes.data.hadiths.forEach((h: any, idx: number) => {
            const num = h.hadithnumber || (idx + 1);
            araHadithsMap[num] = h.text;
          });
        }
      } catch (err) {
        console.error(`Failed to fetch Arabic edition JSON for ${arabEdition}:`, err);
      }

      const sections = engRes.data.metadata?.sections || engRes.data.metadata?.section || {};
      const allHadiths = engRes.data.hadiths;

      const targetHadiths = allHadiths.filter((h: any, idx: number) => {
        const num = h.hadithnumber || (idx + 1);
        return num >= fromHadith && num <= toHadith;
      });

      if (targetHadiths.length > 0) {
        const bulkOps = targetHadiths.map((engHadith: any, idx: number) => {
          const hadithNum = engHadith.hadithnumber || (fromHadith + idx);
          const hadithNo = `${hadithBookKey}_${hadithNum}`;
          const arabicText = araHadithsMap[hadithNum] || 'Arabic text unavailable online';

          const bookNum = String(engHadith.reference?.book ?? 0);
          let chapterName = sections[bookNum];
          if (!chapterName || chapterName.trim() === '') {
            chapterName = bookNum === '0' ? 'General' : `Book ${bookNum}`;
          }

          let authenticity = 'Sahih';
          if (Array.isArray(engHadith.grades) && engHadith.grades.length > 0) {
            const mainGrade = engHadith.grades.find((g: any) => g.name?.toLowerCase().includes('albani')) || engHadith.grades[0];
            if (mainGrade && mainGrade.grade) {
              authenticity = mainGrade.grade;
            }
          }

          const hadithData: Partial<IHadith> = {
            hadithNo,
            source: sourceName,
            chapter: chapterName,
            arabicText,
            translation: engHadith.text,
            authenticity,
            category: chapterName,
            lang: 'en',
            version: 1,
            isActive: true,
          };

          return {
            updateOne: {
              filter: { hadithNo, lang: 'en' },
              update: { $set: hadithData },
              upsert: true,
            },
          };
        });

        const bulkRes = await Hadith.bulkWrite(bulkOps);
        createdCount = bulkRes.upsertedCount || 0;
        updatedCount = bulkRes.modifiedCount || 0;

        return { createdCount, updatedCount };
      }
    }
  } catch (fastErr) {
    console.warn(`Fast bulk fetch failed for ${edition}, falling back to item-by-item:`, fastErr);
  }

  // Fallback: item-by-item fetching
  for (let i = fromHadith; i <= toHadith; i++) {
    try {
      const engUrl = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${edition}/${i}.json`;
      const engRes = await axios.get(engUrl);

      if (!engRes.data || !engRes.data.hadiths || engRes.data.hadiths.length === 0) {
        continue;
      }

      const engHadith = engRes.data.hadiths[0];
      const sections = engRes.data.metadata?.sections || engRes.data.metadata?.section || {};
      const bookNum = String(engHadith.reference?.book ?? 0);
      let chapterName = sections[bookNum];
      if (!chapterName || chapterName.trim() === '') {
        chapterName = bookNum === '0' ? 'General' : `Book ${bookNum}`;
      }

      let authenticity = 'Sahih';
      if (Array.isArray(engHadith.grades) && engHadith.grades.length > 0) {
        const mainGrade = engHadith.grades.find((g: any) => g.name?.toLowerCase().includes('albani')) || engHadith.grades[0];
        if (mainGrade && mainGrade.grade) {
          authenticity = mainGrade.grade;
        }
      }

      let arabicText = 'Arabic text unavailable online';
      try {
        const araUrl = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${arabEdition}/${i}.json`;
        const araRes = await axios.get(araUrl);
        if (araRes.data && araRes.data.hadiths && araRes.data.hadiths.length > 0) {
          arabicText = araRes.data.hadiths[0].text;
        }
      } catch (err) {
        console.error(`Failed to fetch Arabic text for Hadith ${i}:`, err);
      }

      const hadithNo = `${hadithBookKey}_${i}`;

      const hadithData: Partial<IHadith> = {
        hadithNo,
        source: sourceName,
        chapter: chapterName,
        arabicText,
        translation: engHadith.text,
        authenticity,
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

// Total ~10,042 hadiths distributed across all 8 collections
// so every section of the app has content from day one.
const ALL_HADITH_COLLECTIONS = [
  { key: 'bukhari',  edition: 'eng-bukhari',  name: 'Sahih al-Bukhari',    range: { from: 1, to: 3000 } },
  { key: 'muslim',   edition: 'eng-muslim',   name: 'Sahih Muslim',        range: { from: 1, to: 1500 } },
  { key: 'abudawud', edition: 'eng-abudawud', name: 'Sunan Abi Dawud',     range: { from: 1, to: 1500 } },
  { key: 'tirmidhi', edition: 'eng-tirmidhi', name: 'Jami at-Tirmidhi',    range: { from: 1, to: 1000 } },
  { key: 'nasai',    edition: 'eng-nasai',    name: 'Sunan an-Nasai',      range: { from: 1, to: 1000 } },
  { key: 'ibnmajah', edition: 'eng-ibnmajah', name: 'Sunan Ibn Majah',    range: { from: 1, to: 1000 } },
  { key: 'malik',    edition: 'eng-malik',    name: 'Muwatta Malik',       range: { from: 1, to: 500  } },
  { key: 'nawawi',   edition: 'eng-nawawi',   name: 'Forty Hadith Nawawi', range: { from: 1, to: 42   } },
];

const seedAllHadithCollections = async () => {
  console.log('[HadithService] Triggering background seed for all 8 Hadith collections...');
  for (const item of ALL_HADITH_COLLECTIONS) {
    try {
      await syncFromGlobalApi(item.edition, item.range.from, item.range.to);
    } catch (err) {
      console.error(`[HadithService] Failed to seed ${item.edition}:`, err);
    }
  }
};

const getCollections = async (lang: string = 'en') => {
  const totalEnglish = await Hadith.countDocuments({ lang: 'en' });
  if (totalEnglish === 0) {
    void seedAllHadithCollections();
  }

  const result = await Promise.all(
    ALL_HADITH_COLLECTIONS.map(async (col) => {
      const count = await Hadith.countDocuments({ source: col.name, lang, isActive: true });
      return {
        key: col.key,
        edition: col.edition,
        name: col.name,
        count,
        isAvailable: true,
      };
    })
  );
  return result;
};

const getAllHadiths = async (
  lang: string = 'en',
  category?: string,
  source?: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  // Auto-populate DB in the background — don't block the HTTP response
  const totalEnglish = await Hadith.countDocuments({ lang: 'en' });
  if (totalEnglish === 0) {
    console.log('[HadithService] Triggering background seed for all Hadith collections...');
    void seedAllHadithCollections();
  }

  if (lang !== 'en') {
    const count = await Hadith.countDocuments({ lang });
    if (count === 0) {
      // Background translation — can take a very long time
      void (async () => {
        try { await getOrSyncHadithsByLanguage(lang); } catch (err) {
          console.error(`[HadithService] Background lang sync failed (${lang}):`, err);
        }
      })();
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
  // Fire-and-forget seed so the HTTP response is NOT blocked for minutes
  const existing = await Hadith.countDocuments({ lang })
  if (existing === 0) {
    const totalEnglish = await Hadith.countDocuments({ lang: 'en' })
    if (totalEnglish === 0) {
      console.log('[HadithService] download-sync empty — seeding all collections in background...')
      void seedAllHadithCollections()
    }
    if (lang !== 'en') {
      void (async () => {
        try { await getOrSyncHadithsByLanguage(lang) } catch (err) {
          console.error(`[HadithService] Background lang sync error (${lang}):`, err)
        }
      })()
    }
    // Return empty immediately — client will retry and get data once seeded
    return {
      data: [],
      meta: { page: 1, limit, total: 0, totalPages: 1 },
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
  getCollections,
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
