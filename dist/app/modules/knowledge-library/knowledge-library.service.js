"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeLibraryServices = void 0;
const knowledge_library_model_1 = require("./knowledge-library.model");
const translationHelper_1 = require("../../../helpers/translationHelper");
const getAllArticles = async (lang = 'de', // Default to German per spec
category, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    // Ensure data exists for the requested language
    if (lang !== 'de') {
        const count = await knowledge_library_model_1.KnowledgeArticle.countDocuments({ lang });
        if (count === 0) {
            await getOrSyncArticlesByLanguage(lang);
        }
    }
    const query = { lang, isActive: true };
    if (category) {
        query.category = category;
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
    return await knowledge_library_model_1.KnowledgeArticle.find({
        lang,
        version: { $gt: fromVersion },
    })
        .sort({ createdAt: -1 })
        .lean();
};
// Automatic dynamic translation helper from German (de) to target language
const getOrSyncArticlesByLanguage = async (targetLang) => {
    const count = await knowledge_library_model_1.KnowledgeArticle.countDocuments({ lang: targetLang });
    if (count > 0) {
        return await knowledge_library_model_1.KnowledgeArticle.find({ lang: targetLang }).lean();
    }
    const baseArticles = await knowledge_library_model_1.KnowledgeArticle.find({ lang: 'de' }).lean();
    if (baseArticles.length === 0)
        return [];
    console.log(`[KnowledgeService] Translating ${baseArticles.length} articles from German to: ${targetLang}...`);
    const results = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < baseArticles.length; i += BATCH_SIZE) {
        const batch = baseArticles.slice(i, i + BATCH_SIZE);
        const translatedBatch = [];
        for (const article of batch) {
            try {
                const translatedTitle = await translationHelper_1.TranslationHelper.translateText(article.title, targetLang, 'de');
                await translationHelper_1.TranslationHelper.sleep(200);
                const translatedContent = await translationHelper_1.TranslationHelper.translateText(article.content, targetLang, 'de');
                await translationHelper_1.TranslationHelper.sleep(200);
                const translatedCategory = await translationHelper_1.TranslationHelper.translateText(article.category, targetLang, 'de');
                translatedBatch.push({
                    articleId: article.articleId,
                    slug: `${article.slug}-${targetLang}`,
                    title: translatedTitle,
                    content: translatedContent,
                    category: translatedCategory,
                    readTime: article.readTime,
                    imageUrl: article.imageUrl,
                    audioUrl: article.audioUrl,
                    lang: targetLang,
                    version: 1,
                    isActive: article.isActive,
                });
            }
            catch (err) {
                console.error(`Translation failed for Knowledge Article ${article.articleId}:`, err);
                translatedBatch.push(null);
            }
            await translationHelper_1.TranslationHelper.sleep(300);
        }
        const validArticles = translatedBatch.filter((a) => a !== null);
        if (validArticles.length > 0) {
            await knowledge_library_model_1.KnowledgeArticle.insertMany(validArticles);
            results.push(...validArticles);
        }
        console.log(`Translated ${i + validArticles.length} of ${baseArticles.length} articles`);
        if (i + BATCH_SIZE < baseArticles.length) {
            await translationHelper_1.TranslationHelper.sleep(1500);
        }
    }
    return results;
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
};
