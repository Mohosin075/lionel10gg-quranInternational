"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeLibraryServices = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const knowledge_library_model_1 = require("./knowledge-library.model");
const knowledge_book_model_1 = require("./knowledge-book.model");
const knowledge_fatwa_model_1 = require("./knowledge-fatwa.model");
const CATEGORY_MAP = {
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
const getAllArticles = async (lang = 'de', category, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    // 1. Language check: if articles exist in requested lang use it, else fallback to any active
    let langFilter = {};
    const hasRequestedLang = await knowledge_library_model_1.KnowledgeArticle.countDocuments({ lang, isActive: true });
    if (hasRequestedLang > 0) {
        langFilter = { lang };
    }
    else {
        const hasGerman = await knowledge_library_model_1.KnowledgeArticle.countDocuments({ lang: 'de', isActive: true });
        if (hasGerman > 0) {
            langFilter = { lang: 'de' };
        }
    }
    const baseQuery = { ...langFilter, isActive: true };
    if (category && category.trim().length > 0) {
        const normalized = category.trim().toLowerCase();
        const mappedTopics = CATEGORY_MAP[normalized] || [];
        const categoryRegex = new RegExp(category.trim(), 'i');
        const orConditions = [{ category: { $regex: categoryRegex } }];
        if (mappedTopics.length > 0) {
            orConditions.push({ category: { $in: mappedTopics } });
        }
        baseQuery.$or = orConditions;
    }
    let total = await knowledge_library_model_1.KnowledgeArticle.countDocuments(baseQuery);
    let data = await knowledge_library_model_1.KnowledgeArticle.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    // If specific category filter produced 0, fallback to returning all active articles so user never gets stuck
    if (total === 0 && category) {
        const fallbackQuery = { ...langFilter, isActive: true };
        total = await knowledge_library_model_1.KnowledgeArticle.countDocuments(fallbackQuery);
        data = await knowledge_library_model_1.KnowledgeArticle.find(fallbackQuery)
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
    const latest = await knowledge_library_model_1.KnowledgeArticle.findOne({ isActive: true })
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
    // If requested lang has articles use it, else fallback to all active
    let langQuery = {};
    const hasLang = await knowledge_library_model_1.KnowledgeArticle.countDocuments({ lang, isActive: true, version: { $gt: fromVersion } });
    if (hasLang > 0) {
        langQuery = { lang };
    }
    const baseQuery = { ...langQuery, isActive: true, version: { $gt: fromVersion } };
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
// Fetch articles in target language, fallback to base German articles if not yet translated
const getOrSyncArticlesByLanguage = async (targetLang, articlesList) => {
    const existingArticles = await knowledge_library_model_1.KnowledgeArticle.find({ lang: targetLang, isActive: true }).lean();
    if (existingArticles.length > 0) {
        return existingArticles;
    }
    const baseArticles = articlesList || await knowledge_library_model_1.KnowledgeArticle.find({ lang: 'de', isActive: true }).lean();
    return baseArticles;
};
// ==========================================
// BOOKS SERVICES
// ==========================================
const getAllBooks = async (lang = 'de', page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    let langFilter = {};
    const hasLang = await knowledge_book_model_1.KnowledgeBook.countDocuments({ lang, isActive: true });
    if (hasLang > 0) {
        langFilter = { lang };
    }
    else {
        const hasGerman = await knowledge_book_model_1.KnowledgeBook.countDocuments({ lang: 'de', isActive: true });
        if (hasGerman > 0) {
            langFilter = { lang: 'de' };
        }
    }
    const baseQuery = { ...langFilter, isActive: true };
    const total = await knowledge_book_model_1.KnowledgeBook.countDocuments(baseQuery);
    const data = await knowledge_book_model_1.KnowledgeBook.find(baseQuery)
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
const getBookById = async (id, lang) => {
    if (lang) {
        const localized = await knowledge_book_model_1.KnowledgeBook.findOne({
            $or: [
                { bookId: id },
                ...(mongoose_1.default.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
            ],
            lang,
            isActive: true,
        }).lean();
        if (localized)
            return localized;
    }
    if (mongoose_1.default.Types.ObjectId.isValid(id)) {
        const book = await knowledge_book_model_1.KnowledgeBook.findById(id).lean();
        if (book)
            return book;
    }
    return await knowledge_book_model_1.KnowledgeBook.findOne({ bookId: id, isActive: true }).lean();
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
    // Books for targetLang are managed via OpenAI Batch from Dashboard
};
// ==========================================
// FATWAS SERVICES
// ==========================================
const getAllFatwas = async (lang = 'de', page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    let langFilter = {};
    const hasLang = await knowledge_fatwa_model_1.KnowledgeFatwa.countDocuments({ lang, isActive: true });
    if (hasLang > 0) {
        langFilter = { lang };
    }
    else {
        const hasGerman = await knowledge_fatwa_model_1.KnowledgeFatwa.countDocuments({ lang: 'de', isActive: true });
        if (hasGerman > 0) {
            langFilter = { lang: 'de' };
        }
    }
    const baseQuery = { ...langFilter, isActive: true };
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
            totalPages: Math.max(1, Math.ceil(total / limit)),
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
    // Fatwas for targetLang are managed via OpenAI Batch from Dashboard
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
