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
    // Ensure data exists and is up to date for the requested language
    if (lang !== 'de') {
        await getOrSyncArticlesByLanguage(lang);
    }
    const query = { lang, isActive: true };
    if (category) {
        const categoryRegex = new RegExp(category.trim(), 'i');
        // Check if category matches any base German articles to fetch by articleId
        const baseArticles = await knowledge_library_model_1.KnowledgeArticle.find({
            lang: 'de',
            category: { $regex: categoryRegex }
        }).select('articleId').lean();
        if (baseArticles.length > 0) {
            const articleIds = baseArticles.map(a => a.articleId);
            query.$or = [
                { category: { $regex: categoryRegex } },
                { articleId: { $in: articleIds } }
            ];
        }
        else {
            query.category = { $regex: categoryRegex };
        }
    }
    const [data, total] = await Promise.all([
        knowledge_library_model_1.KnowledgeArticle.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
        knowledge_library_model_1.KnowledgeArticle.countDocuments(query),
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
    if (lang !== 'de') {
        await getOrSyncArticlesByLanguage(lang);
    }
    const latest = await knowledge_library_model_1.KnowledgeArticle.findOne({ lang })
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
const getSyncData = async (lang = 'de', fromVersion = 0) => {
    if (lang !== 'de') {
        await getOrSyncArticlesByLanguage(lang);
    }
    return await knowledge_library_model_1.KnowledgeArticle.find({
        lang,
        version: { $gt: fromVersion },
    })
        .sort({ createdAt: -1 })
        .lean();
};
// Automatic dynamic translation helper from German (de) to target language
const getOrSyncArticlesByLanguage = async (targetLang) => {
    const baseArticles = await knowledge_library_model_1.KnowledgeArticle.find({ lang: 'de', isActive: true, source: 'manual' }).lean();
    if (baseArticles.length === 0)
        return [];
    console.log(`[KnowledgeService] Checking/translating articles from German to: ${targetLang}...`);
    const results = [];
    // Find all existing translated articles for targetLang
    const existingArticles = await knowledge_library_model_1.KnowledgeArticle.find({ lang: targetLang }).lean();
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
    const query = { lang, isActive: true };
    const [data, total] = await Promise.all([
        knowledge_book_model_1.KnowledgeBook.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
        knowledge_book_model_1.KnowledgeBook.countDocuments(query),
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
// ==========================================
// FATWAS SERVICES
// ==========================================
const getAllFatwas = async (lang = 'de', page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const query = { lang, isActive: true };
    const [data, total] = await Promise.all([
        knowledge_fatwa_model_1.KnowledgeFatwa.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
        knowledge_fatwa_model_1.KnowledgeFatwa.countDocuments(query),
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
const getFatwaById = async (id) => {
    return await knowledge_fatwa_model_1.KnowledgeFatwa.findById(id).lean();
};
const createFatwa = async (payload) => {
    return await knowledge_fatwa_model_1.KnowledgeFatwa.create(payload);
};
const updateFatwa = async (id, payload) => {
    return await knowledge_fatwa_model_1.KnowledgeFatwa.findByIdAndUpdate(id, payload, { new: true });
};
const deleteFatwa = async (id) => {
    return await knowledge_fatwa_model_1.KnowledgeFatwa.findByIdAndUpdate(id, { isActive: false }, { new: true });
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
