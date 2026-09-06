import { Tafsir } from './tafsir.model';
import { ingestSurahTafsir } from './tafsir.worker';

const getTafsir = async (surah: number, ayah: number, edition: string = 'arabic_moyassar', lang: string = 'ar') => {
  let result = await Tafsir.findOne({ surah, ayah, edition, lang }).lean();

  if (!result) {
    try {
      // Trigger ingestion for the whole surah
      await ingestSurahTafsir(surah, edition, lang);
      result = await Tafsir.findOne({ surah, ayah, edition, lang }).lean();
    } catch (err) {
      console.error(`[TafsirService] Ingestion failed for surah ${surah} (${edition}, ${lang}):`, err);
    }
  }

  // Fallback: If requested language/edition was not found or failed, return Arabic base tafsir
  if (!result) {
    result = await Tafsir.findOne({ surah, ayah, edition: 'arabic_moyassar', lang: 'ar' }).lean();
  }

  return result;
};

const getSurahTafsir = async (surah: number, edition: string = 'arabic_moyassar', lang: string = 'ar') => {
  let results = await Tafsir.find({ surah, edition, lang }).sort({ ayah: 1 }).lean();

  if (results.length === 0) {
    try {
      await ingestSurahTafsir(surah, edition, lang);
      results = await Tafsir.find({ surah, edition, lang }).sort({ ayah: 1 }).lean();
    } catch (err) {
      console.error(`[TafsirService] Surah ingestion failed for surah ${surah} (${edition}, ${lang}):`, err);
    }
  }

  // Fallback: Return Arabic base tafsir if requested language returned empty
  if (results.length === 0) {
    results = await Tafsir.find({ surah, edition: 'arabic_moyassar', lang: 'ar' }).sort({ ayah: 1 }).lean();
  }

  return results;
};

const getTranslationVersion = async (edition: string) => {
  const latest = await Tafsir.findOne({ edition }).sort({ version: -1 }).select('version');
  return latest?.version || 1;
};

const checkSyncMetadata = async (edition: string, clientVersion: number) => {
  const serverVersion = await getTranslationVersion(edition);
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

const getSyncData = async (
  edition: string,
  fromVersion: number = 0,
  page: number = 1,
  limit: number = 500,
) => {
  const safeEdition = edition || 'arabic_moyassar'
  const safeLimit = clampSyncLimit(limit)
  const safePage = Math.max(Number(page) || 1, 1)
  const skip = (safePage - 1) * safeLimit

  // Kickstart empty collection so dump is not permanently empty
  const existing = await Tafsir.countDocuments({ edition: safeEdition })
  if (existing === 0) {
    console.log(`[TafsirService] Empty dump — ingesting Surah 1 for ${safeEdition}...`)
    await ingestSurahTafsir(1, safeEdition, 'ar')
  }

  const filter = { edition: safeEdition, version: { $gt: fromVersion } }
  const total = await Tafsir.countDocuments(filter)
  const data = await Tafsir.find(filter)
    .sort({ surah: 1, ayah: 1 })
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

export const TafsirService = {
  getTafsir,
  getSurahTafsir,
  getTranslationVersion,
  checkSyncMetadata,
  getSyncData,
};
