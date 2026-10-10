import mongoose from 'mongoose';
import { KnowledgeArticle } from './knowledge-library.model';
import { KnowledgeBook } from './knowledge-book.model';
import { KnowledgeFatwa } from './knowledge-fatwa.model';
import { IKnowledgeArticle, IKnowledgeBook, IKnowledgeFatwa } from './knowledge-library.interface';

const CATEGORY_MAP: Record<string, string[]> = {
  'probleme der heutigen zeit': ['Belief', 'Ethics', 'Fiqh', 'Dawah', 'Worship'],
  'problems of today': ['Belief', 'Ethics', 'Fiqh', 'Dawah', 'Worship'],
  'charakter & reinigung der seele': ['Ethics', 'Belief', 'Charakter'],
  'character & soul': ['Ethics', 'Belief', 'Charakter'],
  'gute taten & spirituelles wachstum': ['Worship', 'Ethics', 'Belief'],
  'good deeds & spiritual growth': ['Worship', 'Ethics', 'Belief'],
  'geschichten & lehren': ['History', 'Hadith', 'Quran'],
  'stories & lessons': ['History', 'Hadith', 'Quran'],
  'biographien der rechtschaffenen': ['History', 'Hadith', 'Prophet'],
  'biographies of the righteous': ['History', 'Hadith', 'Prophet'],
  'beziehungen, ehe & familie': ['Family', 'Ethics'],
  'relationships, marriage & family': ['Family', 'Ethics'],
  'jugend, motivation & disziplin': ['Ethics', 'Belief', 'Worship'],
  'youth, motivation & discipline': ['Ethics', 'Belief', 'Worship'],
  'herz, emotionen & mentale kämpfe': ['Belief', 'Ethics'],
  'mental & emotional struggles': ['Belief', 'Ethics'],
  'dunya, geld & moderne gesellschaft': ['Belief', 'Ethics', 'Fiqh'],
  'dunya, wealth & modern society': ['Belief', 'Ethics', 'Fiqh'],
  'quran, dua & verbindung zu allah': ['Quran', 'Worship', 'Hadith'],
  'quran, dua & connection to allah': ['Quran', 'Worship', 'Hadith'],
};

const getAllArticles = async (
  lang: string = 'de',
  category?: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  // 1. Language check: if articles exist in requested lang use it, else fallback to any active
  let langFilter: Record<string, any> = {};
  const hasRequestedLang = await KnowledgeArticle.countDocuments({ lang, isActive: true });
  if (hasRequestedLang > 0) {
    langFilter = { lang };
  } else {
    const hasGerman = await KnowledgeArticle.countDocuments({ lang: 'de', isActive: true });
    if (hasGerman > 0) {
      langFilter = { lang: 'de' };
    }
  }

  const baseQuery: Record<string, any> = { ...langFilter, isActive: true };

  if (category && category.trim().length > 0) {
    const normalized = category.trim().toLowerCase();
    const mappedTopics = CATEGORY_MAP[normalized] || [];
    const categoryRegex = new RegExp(category.trim(), 'i');

    const orConditions: Record<string, any>[] = [{ category: { $regex: categoryRegex } }];
    if (mappedTopics.length > 0) {
      orConditions.push({ category: { $in: mappedTopics } });
    }
    baseQuery.$or = orConditions;
  }

  let total = await KnowledgeArticle.countDocuments(baseQuery);
  let data = await KnowledgeArticle.find(baseQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // If specific category filter produced 0, fallback to returning all active articles so user never gets stuck
  if (total === 0 && category) {
    const fallbackQuery = { ...langFilter, isActive: true };
    total = await KnowledgeArticle.countDocuments(fallbackQuery);
    data = await KnowledgeArticle.find(fallbackQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    data,
  };
};

const getArticleById = async (id: string) => {
  return await KnowledgeArticle.findById(id).lean();
};

const createArticle = async (payload: Partial<IKnowledgeArticle>) => {
  return await KnowledgeArticle.create(payload);
};

const updateArticle = async (id: string, payload: Partial<IKnowledgeArticle>) => {
  const current = await KnowledgeArticle.findById(id);
  const newVersion = current ? (current.version || 1) + 1 : 1;
  return await KnowledgeArticle.findByIdAndUpdate(
    id,
    { ...payload, version: newVersion },
    { new: true },
  );
};

const deleteArticle = async (id: string) => {
  return await KnowledgeArticle.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

const getVersion = async (lang: string = 'de') => {
  const latest = await KnowledgeArticle.findOne({ isActive: true })
    .sort({ version: -1 })
    .select('version');
  return latest?.version || 1;
};

const checkSyncMetadata = async (lang: string = 'de', clientVersion: number) => {
  const serverVersion = await getVersion(lang);
  return {
    updateAvailable: serverVersion > clientVersion,
    serverVersion,
    clientVersion,
    lang,
  };
};

const clampSyncLimit = (limit: number) => {
  const n = Number(limit) || 500;
  return Math.min(Math.max(n, 1), 1000);
};

const getSyncData = async (
  lang: string = 'de',
  fromVersion: number = 0,
  page: number = 1,
  limit: number = 500,
) => {
  const safeLimit = clampSyncLimit(limit);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  // If requested lang has articles use it, else fallback to all active
  let langQuery: Record<string, any> = {};
  const hasLang = await KnowledgeArticle.countDocuments({ lang, isActive: true, version: { $gt: fromVersion } });
  if (hasLang > 0) {
    langQuery = { lang };
  }

  const baseQuery = { ...langQuery, isActive: true, version: { $gt: fromVersion } };
  const total = await KnowledgeArticle.countDocuments(baseQuery);
  const data = await KnowledgeArticle.find(baseQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit)
    .lean();

  return {
    data,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};

// Fetch articles in target language, fallback to base German articles if not yet translated
const getOrSyncArticlesByLanguage = async (targetLang: string, articlesList?: any[]) => {
  const existingArticles = await KnowledgeArticle.find({ lang: targetLang, isActive: true }).lean();
  if (existingArticles.length > 0) {
    return existingArticles as unknown as IKnowledgeArticle[];
  }

  const baseArticles = articlesList || await KnowledgeArticle.find({ lang: 'de', isActive: true }).lean();
  return baseArticles as unknown as IKnowledgeArticle[];
};

// ==========================================
// BOOKS SERVICES
// ==========================================
const getAllBooks = async (
  lang: string = 'de',
  page: number = 1,
  limit: number = 50,
) => {
  const skip = (page - 1) * limit;

  let langFilter: Record<string, any> = {};
  const hasLang = await KnowledgeBook.countDocuments({ lang, isActive: true });
  if (hasLang > 0) {
    langFilter = { lang };
  } else {
    const hasGerman = await KnowledgeBook.countDocuments({ lang: 'de', isActive: true });
    if (hasGerman > 0) {
      langFilter = { lang: 'de' };
    }
  }

  const baseQuery = { ...langFilter, isActive: true };
  const total = await KnowledgeBook.countDocuments(baseQuery);
  const data = await KnowledgeBook.find(baseQuery)
    .select('-content')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    data,
  };
};

const getBookById = async (id: string, lang?: string) => {
  if (lang) {
    const localized = await KnowledgeBook.findOne({
      $or: [
        { bookId: id },
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
      ],
      lang,
      isActive: true,
    }).lean();
    if (localized) return localized;
  }

  if (mongoose.Types.ObjectId.isValid(id)) {
    const book = await KnowledgeBook.findById(id).lean();
    if (book) return book;
  }
  return await KnowledgeBook.findOne({ bookId: id, isActive: true }).lean();
};

const createBook = async (payload: Partial<IKnowledgeBook>) => {
  return await KnowledgeBook.create(payload);
};

const updateBook = async (id: string, payload: Partial<IKnowledgeBook>) => {
  const current = await KnowledgeBook.findById(id);
  const newVersion = current ? (current.version || 1) + 1 : 1;
  return await KnowledgeBook.findByIdAndUpdate(
    id,
    { ...payload, version: newVersion },
    { new: true },
  );
};

const deleteBook = async (id: string) => {
  return await KnowledgeBook.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

const getOrSyncBooksByLanguage = async (targetLang: string, booksList?: any[]) => {
  const baseBooks = booksList || await KnowledgeBook.find({ lang: 'de', isActive: true }).lean();
  if (baseBooks.length === 0) return;

  // Books for targetLang are managed via OpenAI Batch from Dashboard
};

// ==========================================
// FATWAS SERVICES
// ==========================================
const getAllFatwas = async (
  lang: string = 'de',
  page: number = 1,
  limit: number = 50,
) => {
  const skip = (page - 1) * limit;

  let langFilter: Record<string, any> = {};
  const hasLang = await KnowledgeFatwa.countDocuments({ lang, isActive: true });
  if (hasLang > 0) {
    langFilter = { lang };
  } else {
    const hasGerman = await KnowledgeFatwa.countDocuments({ lang: 'de', isActive: true });
    if (hasGerman > 0) {
      langFilter = { lang: 'de' };
    }
  }

  const baseQuery = { ...langFilter, isActive: true };
  const total = await KnowledgeFatwa.countDocuments(baseQuery);
  const data = await KnowledgeFatwa.find(baseQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    data,
  };
};

const getFatwaById = async (id: string) => {
  return await KnowledgeFatwa.findById(id).lean();
};

const createFatwa = async (payload: Partial<IKnowledgeFatwa>) => {
  return await KnowledgeFatwa.create(payload);
};

const updateFatwa = async (id: string, payload: Partial<IKnowledgeFatwa>) => {
  const current = await KnowledgeFatwa.findById(id);
  const newVersion = current ? (current.version || 1) + 1 : 1;
  return await KnowledgeFatwa.findByIdAndUpdate(
    id,
    { ...payload, version: newVersion },
    { new: true },
  );
};

const deleteFatwa = async (id: string) => {
  return await KnowledgeFatwa.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

const getOrSyncFatwasByLanguage = async (targetLang: string, fatwasList?: any[]) => {
  const baseFatwas = fatwasList || await KnowledgeFatwa.find({ lang: 'de', isActive: true }).lean();
  if (baseFatwas.length === 0) return;

  // Fatwas for targetLang are managed via OpenAI Batch from Dashboard
};

export const KnowledgeLibraryServices = {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  getVersion,
  checkSyncMetadata,
  getSyncData,
  getOrSyncArticlesByLanguage,
  // Books
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  // Fatwas
  getAllFatwas,
  getFatwaById,
  createFatwa,
  updateFatwa,
  deleteFatwa,
};
