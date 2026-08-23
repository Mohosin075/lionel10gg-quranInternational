"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeLibraryServices = void 0;
const knowledge_library_model_1 = require("./knowledge-library.model");
const knowledge_book_model_1 = require("./knowledge-book.model");
const knowledge_fatwa_model_1 = require("./knowledge-fatwa.model");
const translationHelper_1 = require("../../../helpers/translationHelper");
const getAllArticles = async (lang = 'de', // Default to German per spec
category, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const baseQuery = { lang: 'de', isActive: true };
    if (category) {
        const categoryRegex = new RegExp(category.trim(), 'i');
        baseQuery.category = { $regex: categoryRegex };
    }
    const total = await knowledge_library_model_1.KnowledgeArticle.countDocuments(baseQuery);
    const data = await knowledge_library_model_1.KnowledgeArticle.find(baseQuery)
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
const getArticleById = async (id) => {
    return await knowledge_library_model_1.KnowledgeArticle.findById(id).lean();
};
const createArticle = async (payload) => {
    return await knowledge_library_model_1.KnowledgeArticle.create(payload);
};
const updateArticle = async (id, payload) => {
    const current = await knowledge_library_model_1.KnowledgeArticle.findById(id);
    const newVersion = current ? (current.version || 1) + 1 : 1;
    return await knowledge_library_model_1.KnowledgeArticle.findByIdAndUpdate(id, { ...payload, version: newVersion }, { new: true });
};
const deleteArticle = async (id) => {
    return await knowledge_library_model_1.KnowledgeArticle.findByIdAndUpdate(id, { isActive: false }, { new: true });
};
const getVersion = async (lang = 'de') => {
    const latest = await knowledge_library_model_1.KnowledgeArticle.findOne({ lang: 'de' })
        .sort({ version: -1 })
        .select('version');
    return (latest === null || latest === void 0 ? void 0 : latest.version) || 1;
};
const checkSyncMetadata = async (lang = 'de', clientVersion) => {
    const serverVersion = await getVersion(lang);
    return {
        updateAvailable: serverVersion > clientVersion,
        serverVersion,
        clientVersion,
        lang,
    };
};
const clampSyncLimit = (limit) => {
    const n = Number(limit) || 500;
    return Math.min(Math.max(n, 1), 1000);
};
const getSyncData = async (lang = 'de', fromVersion = 0, page = 1, limit = 500) => {
    const safeLimit = clampSyncLimit(limit);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;
    const baseQuery = { lang: 'de', isActive: true, version: { $gt: fromVersion } };
    const total = await knowledge_library_model_1.KnowledgeArticle.countDocuments(baseQuery);
    const data = await knowledge_library_model_1.KnowledgeArticle.find(baseQuery)
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
// Automatic dynamic translation helper from German (de) to target language
const getOrSyncArticlesByLanguage = async (targetLang, articlesList) => {
    const baseArticles = articlesList || await knowledge_library_model_1.KnowledgeArticle.find({ lang: 'de', isActive: true }).lean();
    if (baseArticles.length === 0)
        return [];
    console.log(`[KnowledgeService] Checking/translating articles from German to: ${targetLang}...`);
    const results = [];
    // Find all existing translated articles for targetLang matching base article IDs
    const articleIds = baseArticles.map(a => a.articleId);
    const existingArticles = await knowledge_library_model_1.KnowledgeArticle.find({ lang: targetLang, articleId: { $in: articleIds } }).lean();
    const existingMap = new Map(existingArticles.map(a => [a.articleId, a]));
    const articlesToTranslate = [];
    for (const base of baseArticles) {
        const existing = existingMap.get(base.articleId);
        if (!existing || existing.version < base.version) {
            articlesToTranslate.push(base);
        }
        else {
            results.push(existing);
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
                const translatedTitle = await translationHelper_1.TranslationHelper.translateText(article.title, targetLang, 'de');
                await translationHelper_1.TranslationHelper.sleep(200);
                const translatedContent = await translationHelper_1.TranslationHelper.translateText(article.content, targetLang, 'de');
                await translationHelper_1.TranslationHelper.sleep(200);
                const translatedCategory = await translationHelper_1.TranslationHelper.translateText(article.category, targetLang, 'de');
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
                const updated = await knowledge_library_model_1.KnowledgeArticle.findOneAndUpdate({ articleId: article.articleId, lang: targetLang }, { $set: translatedDoc }, { upsert: true, new: true }).lean();
                if (updated) {
                    results.push(updated);
                }
            }
            catch (err) {
                console.error(`Translation failed for Knowledge Article ${article.articleId} to ${targetLang}:`, err);
            }
        }
    }
    return results;
};
// ==========================================
// BOOKS SERVICES
// ==========================================
const getAllBooks = async (lang = 'de', page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const baseQuery = { lang: 'de', isActive: true };
    const total = await knowledge_book_model_1.KnowledgeBook.countDocuments(baseQuery);
    const data = await knowledge_book_model_1.KnowledgeBook.find(baseQuery)
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
const getBookById = async (id) => {
    return await knowledge_book_model_1.KnowledgeBook.findById(id).lean();
};
const createBook = async (payload) => {
    return await knowledge_book_model_1.KnowledgeBook.create(payload);
};
const updateBook = async (id, payload) => {
    const current = await knowledge_book_model_1.KnowledgeBook.findById(id);
    const newVersion = current ? (current.version || 1) + 1 : 1;
    return await knowledge_book_model_1.KnowledgeBook.findByIdAndUpdate(id, { ...payload, version: newVersion }, { new: true });
};
const deleteBook = async (id) => {
    return await knowledge_book_model_1.KnowledgeBook.findByIdAndUpdate(id, { isActive: false }, { new: true });
};
const getOrSyncBooksByLanguage = async (targetLang, booksList) => {
    const baseBooks = booksList || await knowledge_book_model_1.KnowledgeBook.find({ lang: 'de', isActive: true }).lean();
    if (baseBooks.length === 0)
        return;
    const bookIds = baseBooks.map(b => b.bookId);
    const existingBooks = await knowledge_book_model_1.KnowledgeBook.find({ lang: targetLang, bookId: { $in: bookIds } }).lean();
    const existingMap = new Map(existingBooks.map(b => [b.bookId, b]));
    const booksToTranslate = [];
    for (const base of baseBooks) {
        const existing = existingMap.get(base.bookId);
        if (!existing || existing.version < base.version) {
            booksToTranslate.push(base);
        }
    }
    if (booksToTranslate.length === 0)
        return;
    console.log(`[KnowledgeService] Translating ${booksToTranslate.length} books to: ${targetLang}...`);
    for (const book of booksToTranslate) {
        try {
            const title = await translationHelper_1.TranslationHelper.translateText(book.title, targetLang, 'de');
            await translationHelper_1.TranslationHelper.sleep(200);
            const content = await translationHelper_1.TranslationHelper.translateText(book.content, targetLang, 'de');
            await translationHelper_1.TranslationHelper.sleep(200);
            const author = book.author
                ? await translationHelper_1.TranslationHelper.translateText(book.author, targetLang, 'de')
                : book.author;
            await knowledge_book_model_1.KnowledgeBook.findOneAndUpdate({ bookId: book.bookId, lang: targetLang }, {
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
            }, { upsert: true });
        }
        catch (err) {
            console.error(`Translation failed for book ${book.bookId}:`, err);
        }
    }
};
// ==========================================
// FATWAS SERVICES
// ==========================================
const getAllFatwas = async (lang = 'de', page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const baseQuery = { lang: 'de', isActive: true };
    const total = await knowledge_fatwa_model_1.KnowledgeFatwa.countDocuments(baseQuery);
    const data = await knowledge_fatwa_model_1.KnowledgeFatwa.find(baseQuery)
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
const getFatwaById = async (id) => {
    return await knowledge_fatwa_model_1.KnowledgeFatwa.findById(id).lean();
};
const createFatwa = async (payload) => {
    return await knowledge_fatwa_model_1.KnowledgeFatwa.create(payload);
};
const updateFatwa = async (id, payload) => {
    const current = await knowledge_fatwa_model_1.KnowledgeFatwa.findById(id);
    const newVersion = current ? (current.version || 1) + 1 : 1;
    return await knowledge_fatwa_model_1.KnowledgeFatwa.findByIdAndUpdate(id, { ...payload, version: newVersion }, { new: true });
};
const deleteFatwa = async (id) => {
    return await knowledge_fatwa_model_1.KnowledgeFatwa.findByIdAndUpdate(id, { isActive: false }, { new: true });
};
const getOrSyncFatwasByLanguage = async (targetLang, fatwasList) => {
    const baseFatwas = fatwasList || await knowledge_fatwa_model_1.KnowledgeFatwa.find({ lang: 'de', isActive: true }).lean();
    if (baseFatwas.length === 0)
        return;
    const fatwaIds = baseFatwas.map(f => f.fatwaId);
    const existingFatwas = await knowledge_fatwa_model_1.KnowledgeFatwa.find({ lang: targetLang, fatwaId: { $in: fatwaIds } }).lean();
    const existingMap = new Map(existingFatwas.map(f => [f.fatwaId, f]));
    const fatwasToTranslate = [];
    for (const base of baseFatwas) {
        const existing = existingMap.get(base.fatwaId);
        if (!existing || existing.version < base.version) {
            fatwasToTranslate.push(base);
        }
    }
    if (fatwasToTranslate.length === 0)
        return;
    console.log(`[KnowledgeService] Translating ${fatwasToTranslate.length} fatwas to: ${targetLang}...`);
    for (const fatwa of fatwasToTranslate) {
        try {
            const question = await translationHelper_1.TranslationHelper.translateText(fatwa.question, targetLang, 'de');
            await translationHelper_1.TranslationHelper.sleep(200);
            const answer = await translationHelper_1.TranslationHelper.translateText(fatwa.answer, targetLang, 'de');
            await translationHelper_1.TranslationHelper.sleep(200);
            await knowledge_fatwa_model_1.KnowledgeFatwa.findOneAndUpdate({ fatwaId: fatwa.fatwaId, lang: targetLang }, {
                $set: {
                    fatwaId: fatwa.fatwaId,
                    question,
                    answer,
                    scholar: fatwa.scholar,
                    lang: targetLang,
                    version: fatwa.version || 1,
                    isActive: true,
                },
            }, { upsert: true });
        }
        catch (err) {
            console.error(`Translation failed for fatwa ${fatwa.fatwaId}:`, err);
        }
    }
};
exports.KnowledgeLibraryServices = {
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
