import { KnowledgeArticle } from './knowledge-library.model';
import { KnowledgeBook } from './knowledge-book.model';
import { KnowledgeFatwa } from './knowledge-fatwa.model';
import { IKnowledgeArticle, IKnowledgeBook, IKnowledgeFatwa } from './knowledge-library.interface';
import { TranslationHelper } from '../../../helpers/translationHelper';

const getAllArticles = async (
  lang: string = 'de', // Default to German per spec
  category?: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  const baseQuery: Record<string, any> = { lang: 'de', isActive: true };
  if (category) {
    const categoryRegex = new RegExp(category.trim(), 'i');
    baseQuery.category = { $regex: categoryRegex };
  }

  const total = await KnowledgeArticle.countDocuments(baseQuery);
  const data = await KnowledgeArticle.find(baseQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

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
  const latest = await KnowledgeArticle.findOne({ lang: 'de' })
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
  const n = Number(limit) || 500
  return Math.min(Math.max(n, 1), 1000)
}

const getSyncData = async (
  lang: string = 'de',
  fromVersion: number = 0,
  page: number = 1,
  limit: number = 500,
) => {
  const safeLimit = clampSyncLimit(limit)
  const safePage = Math.max(Number(page) || 1, 1)
  const skip = (safePage - 1) * safeLimit

  const baseQuery = { lang: 'de', isActive: true, version: { $gt: fromVersion } }
  const total = await KnowledgeArticle.countDocuments(baseQuery)
  const data = await KnowledgeArticle.find(baseQuery)
    .sort({ createdAt: -1 })
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

// Automatic dynamic translation helper from German (de) to target language
const getOrSyncArticlesByLanguage = async (targetLang: string, articlesList?: any[]) => {
  const baseArticles = articlesList || await KnowledgeArticle.find({ lang: 'de', isActive: true }).lean();
  if (baseArticles.length === 0) return [];

  console.log(`[KnowledgeService] Checking/translating articles from German to: ${targetLang}...`);

  const results: IKnowledgeArticle[] = [];
  
  // Find all existing translated articles for targetLang matching base article IDs
  const articleIds = baseArticles.map(a => a.articleId);
  const existingArticles = await KnowledgeArticle.find({ lang: targetLang, articleId: { $in: articleIds } }).lean();
  const existingMap = new Map(existingArticles.map(a => [a.articleId, a]));

  const articlesToTranslate: IKnowledgeArticle[] = [];
  for (const base of baseArticles) {
    const existing = existingMap.get(base.articleId);
    if (!existing || existing.version < base.version) {
      articlesToTranslate.push(base as unknown as IKnowledgeArticle);
    } else {
      results.push(existing as unknown as IKnowledgeArticle);
    }
  }

  if (articlesToTranslate.length === 0) {
    return results;
  }

  console.log(`[KnowledgeService] Translating ${articlesToTranslate.length} out-of-date/new articles to: ${targetLang}...`);
  const BATCH_SIZE = 5;

  for (let i = 0; i < articlesToTranslate.length; i += BATCH_SIZE) {
    const batch = articlesToTranslate.slice(i, i + BATCH_SIZE);
    
    for (const article of batch) {
      try {
        const translatedTitle = await TranslationHelper.translateText(article.title, targetLang, 'de');
        await TranslationHelper.sleep(200);
        const translatedContent = await TranslationHelper.translateText(article.content, targetLang, 'de');
        await TranslationHelper.sleep(200);
        const translatedCategory = await TranslationHelper.translateText(article.category, targetLang, 'de');

        const translatedDoc = {
          articleId: article.articleId,
          slug: `${article.slug}-${targetLang}`,
          title: translatedTitle,
          content: translatedContent,
          category: translatedCategory,
          readTime: article.readTime,
          imageUrl: article.imageUrl,
          audioUrl: article.audioUrl,
          lang: targetLang,
          source: article.source || 'manual',
          version: article.version, // Keep version aligned with German base
          isActive: article.isActive,
        };

        const updated = await KnowledgeArticle.findOneAndUpdate(
          { articleId: article.articleId, lang: targetLang },
          { $set: translatedDoc },
          { upsert: true, new: true }
        ).lean();

        if (updated) {
          results.push(updated as unknown as IKnowledgeArticle);
        }
      } catch (err) {
        console.error(`Translation failed for Knowledge Article ${article.articleId} to ${targetLang}:`, err);
      }
    }
  }

  return results;
};

// ==========================================
// BOOKS SERVICES
// ==========================================
const getAllBooks = async (
  lang: string = 'de',
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  const baseQuery = { lang: 'de', isActive: true };
  const total = await KnowledgeBook.countDocuments(baseQuery);
  const data = await KnowledgeBook.find(baseQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

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

const getBookById = async (id: string) => {
  return await KnowledgeBook.findById(id).lean();
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

  const bookIds = baseBooks.map(b => b.bookId);
  const existingBooks = await KnowledgeBook.find({ lang: targetLang, bookId: { $in: bookIds } }).lean();
  const existingMap = new Map(existingBooks.map(b => [b.bookId, b]));

  const booksToTranslate = [];
  for (const base of baseBooks) {
    const existing = existingMap.get(base.bookId);
    if (!existing || existing.version < base.version) {
      booksToTranslate.push(base);
    }
  }

  if (booksToTranslate.length === 0) return;

  console.log(`[KnowledgeService] Translating ${booksToTranslate.length} books to: ${targetLang}...`)
  for (const book of booksToTranslate) {
    try {
      const title = await TranslationHelper.translateText(book.title, targetLang, 'de')
      await TranslationHelper.sleep(200)
      const content = await TranslationHelper.translateText(book.content, targetLang, 'de')
      await TranslationHelper.sleep(200)
      const author = book.author
        ? await TranslationHelper.translateText(book.author, targetLang, 'de')
        : book.author

      await KnowledgeBook.findOneAndUpdate(
        { bookId: book.bookId, lang: targetLang },
        {
          $set: {
            bookId: book.bookId,
            title,
            author,
            content,
            lang: targetLang,
            source: book.source || 'islamhouse',
            version: book.version || 1,
            isActive: true,
          },
        },
        { upsert: true },
      )
    } catch (err) {
      console.error(`Translation failed for book ${book.bookId}:`, err)
    }
  }
}

// ==========================================
// FATWAS SERVICES
// ==========================================
const getAllFatwas = async (
  lang: string = 'de',
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  const baseQuery = { lang: 'de', isActive: true };
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
      totalPages: Math.ceil(total / limit),
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

  const fatwaIds = baseFatwas.map(f => f.fatwaId);
  const existingFatwas = await KnowledgeFatwa.find({ lang: targetLang, fatwaId: { $in: fatwaIds } }).lean();
  const existingMap = new Map(existingFatwas.map(f => [f.fatwaId, f]));

  const fatwasToTranslate = [];
  for (const base of baseFatwas) {
    const existing = existingMap.get(base.fatwaId);
    if (!existing || existing.version < base.version) {
      fatwasToTranslate.push(base);
    }
  }

  if (fatwasToTranslate.length === 0) return;

  console.log(`[KnowledgeService] Translating ${fatwasToTranslate.length} fatwas to: ${targetLang}...`)
  for (const fatwa of fatwasToTranslate) {
    try {
      const question = await TranslationHelper.translateText(fatwa.question, targetLang, 'de')
      await TranslationHelper.sleep(200)
      const answer = await TranslationHelper.translateText(fatwa.answer, targetLang, 'de')
      await TranslationHelper.sleep(200)

      await KnowledgeFatwa.findOneAndUpdate(
        { fatwaId: fatwa.fatwaId, lang: targetLang },
        {
          $set: {
            fatwaId: fatwa.fatwaId,
            question,
            answer,
            scholar: fatwa.scholar,
            lang: targetLang,
            version: fatwa.version || 1,
            isActive: true,
          },
        },
        { upsert: true },
      )
    } catch (err) {
      console.error(`Translation failed for fatwa ${fatwa.fatwaId}:`, err)
    }
  }
}

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
