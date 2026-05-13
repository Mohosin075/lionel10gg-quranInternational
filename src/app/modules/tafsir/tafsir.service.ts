import { Tafsir } from './tafsir.model';
import { ingestSurahTafsir } from './tafsir.worker';

const getTafsir = async (surah: number, ayah: number, edition: string = 'arabic_moyassar', lang: string = 'ar') => {
  let result = await Tafsir.findOne({ surah, ayah, edition, lang }).lean();

  if (!result) {
    // Trigger ingestion for the whole surah
    await ingestSurahTafsir(surah, edition, lang);
    result = await Tafsir.findOne({ surah, ayah, edition, lang }).lean();
  }

  return result;
};

const getSurahTafsir = async (surah: number, edition: string = 'arabic_moyassar', lang: string = 'ar') => {
  let results = await Tafsir.find({ surah, edition, lang }).sort({ ayah: 1 }).lean();

  if (results.length === 0) {
    await ingestSurahTafsir(surah, edition, lang);
    results = await Tafsir.find({ surah, edition, lang }).sort({ ayah: 1 }).lean();
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

const getSyncData = async (edition: string, fromVersion: number = 0) => {
  return await Tafsir.find({
    edition,
    version: { $gt: fromVersion }
  }).sort({ surah: 1, ayah: 1 }).lean();
};

export const TafsirService = {
  getTafsir,
  getSurahTafsir,
  getTranslationVersion,
  checkSyncMetadata,
  getSyncData,
};
