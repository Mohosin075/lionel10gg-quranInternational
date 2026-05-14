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
    lang
  };
};

const getSyncData = async (lang: string = 'en', fromVersion: number = 0) => {
  return await Dua.find({
    lang,
    version: { $gt: fromVersion }
  }).sort({ category: 1, title: 1 }).lean();
};

export const DuaService = {
  getAllDuas,
  getDuaById,
  createDua,
  getVersion,
  checkSyncMetadata,
  getSyncData,
};
