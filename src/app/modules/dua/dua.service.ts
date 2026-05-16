import axios from 'axios';
import { Dua } from './dua.model';
import { IDua } from './dua.interface';

const getAllDuas = async (lang: string = 'en', category?: string) => {
  const query: Record<string, unknown> = { lang };
  if (category) {
    query.category = category;
  }
  return await Dua.find(query).lean();
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

const syncFromExternalSource = async () => {
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
          console.warn(
            `Skipping Dua ${externalId} due to missing Arabic text or translation.`
          );
          continue;
        }

        const existingDua = await Dua.findOne({ externalId, lang: 'en' });

        const duaData: Partial<IDua> = {
          externalId,
          title: categoryTitle,
          arabic: textItem.ARABIC_TEXT,
          translation: textItem.TRANSLATED_TEXT,
          transliteration: textItem.LANGUAGE_ARABIC_TRANSLATED_TEXT,
          category: categoryTitle,
          audio: textItem.AUDIO,
          repeat: textItem.REPEAT,
          lang: 'en',
        };

        if (existingDua) {
          // Check if content changed (simple check)
          const isChanged =
            existingDua.arabic !== duaData.arabic ||
            existingDua.translation !== duaData.translation ||
            existingDua.category !== duaData.category;

          if (isChanged) {
            await Dua.updateOne(
              { _id: existingDua._id },
              { ...duaData, version: existingDua.version + 1 }
            );
            updatedCount++;
          }
        } else {
          await Dua.create({ ...duaData, version: 1 });
          createdCount++;
        }
      } catch (error) {
        console.error(`Error processing text item ${textItem.ID}:`, error);
      }
    }
  }

  return { createdCount, updatedCount };
};

export const DuaService = {
  getAllDuas,
  getDuaById,
  createDua,
  getVersion,
  checkSyncMetadata,
  getSyncData,
  syncFromExternalSource,
};
