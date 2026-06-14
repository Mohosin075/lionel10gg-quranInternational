"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HadithServices = void 0;
const axios_1 = __importDefault(require("axios"));
const hadith_model_1 = require("./hadith.model");
const getAllHadiths = async (lang = 'en', category, source, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    // Ensure data exists for the requested language
    if (lang !== 'en') {
        const count = await hadith_model_1.Hadith.countDocuments({ lang });
        if (count === 0) {
            await getOrSyncHadithsByLanguage(lang);
        }
    }
    const query = { lang, isActive: true };
    if (category) {
        query.category = category;
    }
    if (source) {
        query.source = source;
    }
    const [data, total] = await Promise.all([
        hadith_model_1.Hadith.find(query).skip(skip).limit(limit).sort({ hadithNo: 1 }).lean(),
        hadith_model_1.Hadith.countDocuments(query),
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
const getHadithById = async (id) => {
    return await hadith_model_1.Hadith.findById(id).lean();
};
const createHadith = async (payload) => {
    return await hadith_model_1.Hadith.create(payload);
};
const updateHadith = async (id, payload) => {
    // If editing, increment the version to trigger sync updates on offline clients
    const current = await hadith_model_1.Hadith.findById(id);
    const newVersion = current ? (current.version || 1) + 1 : 1;
    return await hadith_model_1.Hadith.findByIdAndUpdate(id, { ...payload, version: newVersion }, { new: true });
};
const deleteHadith = async (id) => {
    return await hadith_model_1.Hadith.findByIdAndUpdate(id, { isActive: false }, { new: true });
};
const getVersion = async (lang = 'en') => {
    const latest = await hadith_model_1.Hadith.findOne({ lang }).sort({ version: -1 }).select('version');
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
const getSyncData = async (lang = 'en', fromVersion = 0) => {
    return await hadith_model_1.Hadith.find({
        lang,
        version: { $gt: fromVersion },
    })
        .sort({ hadithNo: 1 })
        .lean();
};
// Dynamic Google translation support for rare languages
const getOrSyncHadithsByLanguage = async (targetLang) => {
    const count = await hadith_model_1.Hadith.countDocuments({ lang: targetLang });
    if (count > 0) {
        return await hadith_model_1.Hadith.find({ lang: targetLang }).lean();
    }
    // Translate from English source hadiths
    let sourceHadiths = await hadith_model_1.Hadith.find({ lang: 'en' }).lean();
    if (sourceHadiths.length === 0) {
        // Fallback if no english hadiths exist in database
        return [];
    }
    console.log(`Translating all Hadiths to: ${targetLang}...`);
    const translateText = async (text, to) => {
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
            const res = await axios_1.default.get(url);
            let translated = '';
            if (res.data && res.data[0]) {
                for (const segment of res.data[0]) {
                    translated += segment[0];
                }
            }
            return translated;
        }
        catch (error) {
            console.error('Hadith translation API error:', error);
            return text; // Return original text on translation fail
        }
    };
    const results = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < sourceHadiths.length; i += BATCH_SIZE) {
        const batch = sourceHadiths.slice(i, i + BATCH_SIZE);
        const translatedBatch = [];
        for (const hadith of batch) {
            try {
                const translatedChapter = await translateText(hadith.chapter, targetLang);
                await new Promise((resolve) => setTimeout(resolve, 200));
                const translatedTranslation = await translateText(hadith.translation, targetLang);
                await new Promise((resolve) => setTimeout(resolve, 200));
                const translatedCategory = await translateText(hadith.category, targetLang);
                translatedBatch.push({
                    hadithNo: hadith.hadithNo,
                    source: hadith.source,
                    chapter: translatedChapter,
                    arabicText: hadith.arabicText,
                    translation: translatedTranslation,
                    authenticity: hadith.authenticity,
                    category: translatedCategory,
                    lang: targetLang,
                    version: 1,
                    isActive: hadith.isActive,
                });
            }
            catch (err) {
                console.error(`Translation failed for Hadith ${hadith.hadithNo}:`, err);
                translatedBatch.push(null);
            }
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
        const validHadiths = translatedBatch.filter((h) => h !== null);
        if (validHadiths.length > 0) {
            await hadith_model_1.Hadith.insertMany(validHadiths);
            results.push(...validHadiths);
        }
        console.log(`Translated ${i + validHadiths.length} of ${sourceHadiths.length} Hadiths`);
        if (i + BATCH_SIZE < sourceHadiths.length) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
    }
    return results;
};
exports.HadithServices = {
    getAllHadiths,
    getHadithById,
    createHadith,
    updateHadith,
    deleteHadith,
    getVersion,
    checkSyncMetadata,
    getSyncData,
    getOrSyncHadithsByLanguage,
};
