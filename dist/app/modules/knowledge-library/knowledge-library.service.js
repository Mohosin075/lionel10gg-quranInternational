"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeLibraryServices = void 0;
const content_publication_1 = require("../offline-pack/content-publication");
const content_snapshot_1 = require("../offline-pack/content-snapshot");
const mongoose_1 = __importDefault(require("mongoose"));
const knowledge_library_model_1 = require("./knowledge-library.model");
const knowledge_book_model_1 = require("./knowledge-book.model");
const knowledge_fatwa_model_1 = require("./knowledge-fatwa.model");
const escapeSearch = (value) => value
    .split('')
    .map(char => '.^$*+?()[]{}|\\'.includes(char) ? String.fromCharCode(92) + char : char)
    .join('');
const CATEGORY_MAP = {
    'probleme der heutigen zeit': [
        'Belief',
        'Ethics',
        'Fiqh',
        'Dawah',
        'Worship',
    ],
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
const getAllArticles = async (lang = 'de', category, page = 1, limit = 10, options = {}) => {
    var _a;
    limit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
    page = Math.max(1, Math.floor(Number(page) || 1));
    const skip = (page - 1) * limit;
    const langFilter = { lang };
    const baseQuery = options.includeUnavailable ? { ...langFilter, isActive: true } : (0, content_publication_1.publishedContentFilter)('knowledge', lang);
    if ((_a = options.searchTerm) === null || _a === void 0 ? void 0 : _a.trim()) {
        const expression = new RegExp(escapeSearch(options.searchTerm.trim()), 'i');
        baseQuery.$and = [
            {
                $or: [
                    { title: expression },
                    { content: expression },
                    { slug: expression },
                ],
            },
        ];
    }
    if (options.source)
        baseQuery.source = options.source;
    if (category && category.trim().length > 0) {
        const normalized = category.trim().toLowerCase();
        const mappedTopics = CATEGORY_MAP[normalized] || [];
        const categoryRegex = new RegExp(escapeSearch(category.trim()), 'i');
        const orConditions = [
            { category: { $regex: categoryRegex } },
        ];
        if (mappedTopics.length > 0) {
            orConditions.push({ category: { $in: mappedTopics } });
        }
        baseQuery.$or = orConditions;
    }
    let total = await knowledge_library_model_1.KnowledgeArticle.countDocuments(baseQuery);
    let data = await knowledge_library_model_1.KnowledgeArticle.find(baseQuery)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    // If specific category filter produced 0, fallback to returning all active articles so user never gets stuck
    if (total === 0 &&
        category &&
        !options.strictLang &&
        !options.searchTerm &&
        !options.source) {
        const fallbackQuery = { ...langFilter, isActive: true };
        total = await knowledge_library_model_1.KnowledgeArticle.countDocuments(fallbackQuery);
        data = await knowledge_library_model_1.KnowledgeArticle.find(fallbackQuery)
            .sort({ createdAt: -1, _id: -1 })
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
    return await knowledge_library_model_1.KnowledgeArticle.findOne({ _id: id, isActive: true }).lean();
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
    return parseInt((await (0, content_snapshot_1.readContentRevision)(knowledge_library_model_1.KnowledgeArticle, lang)).slice(0, 12), 16);
};
const checkSyncMetadata = async (lang = 'de', clientVersion) => {
    const serverVersion = await getVersion(lang);
    return {
        updateAvailable: serverVersion !== clientVersion,
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
    void fromVersion;
    const safeLimit = clampSyncLimit(limit);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;
    const baseQuery = { lang, isActive: true };
    const total = await knowledge_library_model_1.KnowledgeArticle.countDocuments(baseQuery);
    const data = await knowledge_library_model_1.KnowledgeArticle.find(baseQuery)
        .sort({ createdAt: -1, _id: -1 })
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
    void articlesList;
    return knowledge_library_model_1.KnowledgeArticle.find((0, content_publication_1.publishedContentFilter)('knowledge', targetLang)).lean();
};
// ==========================================
// BOOKS SERVICES
// ==========================================
const getAllBooks = async (lang = 'de', page = 1, limit = 50, options = {}) => {
    var _a;
    limit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
    page = Math.max(1, Math.floor(Number(page) || 1));
    const skip = (page - 1) * limit;
    const langFilter = { lang };
    const baseQuery = options.includeUnavailable ? { ...langFilter, isActive: true } : (0, content_publication_1.publishedContentFilter)('book', lang);
    if ((_a = options.searchTerm) === null || _a === void 0 ? void 0 : _a.trim()) {
        const expression = new RegExp(escapeSearch(options.searchTerm.trim()), 'i');
        baseQuery.$and = [
            {
                $or: [
                    { title: expression },
                    { author: expression },
                    { content: expression },
                ],
            },
        ];
    }
    const total = await knowledge_book_model_1.KnowledgeBook.countDocuments(baseQuery);
    const data = await knowledge_book_model_1.KnowledgeBook.find(baseQuery)
        .select('-content')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const withheld = options.includeUnavailable ? await knowledge_book_model_1.KnowledgeBook.find({ $and: [baseQuery, { $nor: [(0, content_publication_1.publishedContentFilter)('book', lang)] }] }).select('_id').lean() : [];
    const unavailableIds = new Set(withheld.map(row => String(row._id)));
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
        data: data.map(row => ({ ...row, isContentAvailable: !unavailableIds.has(String(row._id)) })),
    };
};
const getBookById = async (id, lang) => {
    if (lang) {
        const localized = await knowledge_book_model_1.KnowledgeBook.findOne({
            $or: [
                { bookId: id },
                ...(mongoose_1.default.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
            ],
            ...(0, content_publication_1.publishedContentFilter)('book', lang),
        }).lean();
        return localized;
    }
    if (mongoose_1.default.Types.ObjectId.isValid(id)) {
        const book = await knowledge_book_model_1.KnowledgeBook.findOne({ _id: id, isActive: true }).lean();
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
// ==========================================
// FATWAS SERVICES
// ==========================================
const getAllFatwas = async (lang = 'de', page = 1, limit = 50, options = {}) => {
    var _a;
    limit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
    page = Math.max(1, Math.floor(Number(page) || 1));
    const skip = (page - 1) * limit;
    const langFilter = { lang };
    const baseQuery = options.includeUnavailable ? { ...langFilter, isActive: true } : (0, content_publication_1.publishedContentFilter)('fatwa', lang);
    if ((_a = options.searchTerm) === null || _a === void 0 ? void 0 : _a.trim()) {
        const expression = new RegExp(escapeSearch(options.searchTerm.trim()), 'i');
        baseQuery.$and = [
            {
                $or: [
                    { question: expression },
                    { answer: expression },
                    { scholar: expression },
                ],
            },
        ];
    }
    const total = await knowledge_fatwa_model_1.KnowledgeFatwa.countDocuments(baseQuery);
    const data = await knowledge_fatwa_model_1.KnowledgeFatwa.find(baseQuery)
        .sort({ createdAt: -1, _id: -1 })
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
    return await knowledge_fatwa_model_1.KnowledgeFatwa.findOne({ _id: id, isActive: true }).lean();
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
