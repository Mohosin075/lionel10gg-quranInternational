"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuaService = void 0;
const axios_1 = __importDefault(require("axios"));
const dua_model_1 = require("./dua.model");
const getAllDuas = async (lang = 'en', category, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    // Ensure data exists for the language
    if (lang === 'en') {
        const count = await dua_model_1.Dua.countDocuments({ lang: 'en' });
        if (count === 0) {
            await syncEnglishDuas();
        }
    }
    else {
        const count = await dua_model_1.Dua.countDocuments({ lang });
        if (count === 0) {
            await getOrSyncDuasByLanguage(lang);
        }
    }
    const query = { lang };
    if (category) {
        query.category = category;
    }
    const [data, total] = await Promise.all([
        dua_model_1.Dua.find(query).skip(skip).limit(limit).sort({ title: 1 }).lean(),
        dua_model_1.Dua.countDocuments(query),
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
const getDuaById = async (id) => {
    return await dua_model_1.Dua.findById(id).lean();
};
const createDua = async (payload) => {
    return await dua_model_1.Dua.create(payload);
};
const updateDua = async (id, payload) => {
    const current = await dua_model_1.Dua.findById(id);
    const newVersion = current ? (current.version || 1) + 1 : 1;
    return await dua_model_1.Dua.findByIdAndUpdate(id, { ...payload, version: newVersion }, { new: true });
};
const deleteDua = async (id) => {
    return await dua_model_1.Dua.findByIdAndDelete(id);
};
const getCategories = async (lang = 'en') => {
    const categories = await dua_model_1.Dua.distinct('category', { lang });
    return categories.filter(Boolean);
};
const getVersion = async (lang = 'en') => {
    const latest = await dua_model_1.Dua.findOne({ lang }).sort({ version: -1 }).select('version');
    return (latest === null || latest === void 0 ? void 0 : latest.version) || 1;
};
const checkSyncMetadata = async (lang = 'en', clientVersion) => {
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
const getSyncData = async (lang = 'en', fromVersion = 0, page = 1, limit = 500) => {
    // Ingest-if-empty so first download-sync can fill the phone
    const existing = await dua_model_1.Dua.countDocuments({ lang });
    if (existing === 0) {
        if (lang === 'en') {
            await syncEnglishDuas();
        }
        else {
            await getOrSyncDuasByLanguage(lang);
        }
    }
    const safeLimit = clampSyncLimit(limit);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;
    const filter = { lang, version: { $gt: fromVersion } };
    const total = await dua_model_1.Dua.countDocuments(filter);
    const data = await dua_model_1.Dua.find(filter)
        .sort({ category: 1, title: 1 })
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
// 1. মূল ইংরেজি ডাটা সিঙ্ক
const syncEnglishDuas = async () => {
    const url = 'https://raw.githubusercontent.com/wafaaelmaandy/Hisn-Muslim-Json/master/husn_en.json';
    const response = await axios_1.default.get(url);
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
                    continue;
                }
                const duaData = {
                    externalId,
                    title: categoryTitle,
                    arabic: textItem.ARABIC_TEXT,
                    translation: textItem.TRANSLATED_TEXT,
                    transliteration: textItem.LANGUAGE_ARABIC_TRANSLATED_TEXT,
                    category: categoryTitle,
                    audio: textItem.AUDIO,
                    repeat: textItem.REPEAT || 1,
                    lang: 'en',
                };
                const result = await dua_model_1.Dua.findOneAndUpdate({ externalId, lang: 'en' }, { $set: duaData }, { upsert: true, new: false });
                if (result) {
                    updatedCount++;
                }
                else {
                    createdCount++;
                }
            }
            catch (error) {
                console.error(`Error processing text item ${textItem.ID}:`, error);
            }
        }
    }
    return { createdCount, updatedCount };
};
// 2. ডাইনামিক ল্যাঙ্গুয়েজ সিঙ্ক (অফলাইন সাপোর্ট নিশ্চিত করতে)
const getOrSyncDuasByLanguage = async (targetLang, category) => {
    // ক) ডাটাবেজে চেক করুন এই ভাষার ডাটা আছে কি না
    const count = await dua_model_1.Dua.countDocuments({ lang: targetLang });
    if (count > 0) {
        const query = { lang: targetLang };
        if (category) {
            query.category = category;
        }
        return await dua_model_1.Dua.find(query).lean();
    }
    // খ) ডাটা না থাকলে ইংরেজি ডাটা রিটার্ন করুন (অনুবাদ ড্যাশবোর্ডের OpenAI Batch API দিয়ে পরিচালিত হয়)
    let englishDuas = await dua_model_1.Dua.find({ lang: 'en' }).lean();
    if (englishDuas.length === 0) {
        await syncEnglishDuas();
        englishDuas = await dua_model_1.Dua.find({ lang: 'en' }).lean();
    }
    if (category) {
        return englishDuas.filter((d) => d.category === category);
    }
    return englishDuas;
};
exports.DuaService = {
    getAllDuas,
    getDuaById,
    createDua,
    updateDua,
    deleteDua,
    getCategories,
    getVersion,
    checkSyncMetadata,
    getSyncData,
    syncEnglishDuas,
    getOrSyncDuasByLanguage,
};
