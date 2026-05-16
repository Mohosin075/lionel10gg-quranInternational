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
    if (lang !== 'en') {
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
const getSyncData = async (lang = 'en', fromVersion = 0) => {
    return await dua_model_1.Dua.find({
        lang,
        version: { $gt: fromVersion },
    })
        .sort({ category: 1, title: 1 })
        .lean();
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
    // খ) ডাটা না থাকলে ইংরেজি ডাটা থেকে অনুবাদ শুরু করুন
    let englishDuas = await dua_model_1.Dua.find({ lang: 'en' }).lean();
    if (englishDuas.length === 0) {
        await syncEnglishDuas();
        englishDuas = await dua_model_1.Dua.find({ lang: 'en' }).lean();
    }
    console.log(`Translating all duas to: ${targetLang}...`);
    // Custom translation function using the GTX client (more stable)
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
            console.error('Translation API error:', error);
            throw error;
        }
    };
    // গ) অনুবাদ লজিক (Sequential processing for rate limit safety)
    const results = [];
    // To be safe with the free API, we process in chunks of 5 and wait between them
    const BATCH_SIZE = 5;
    for (let i = 0; i < englishDuas.length; i += BATCH_SIZE) {
        const batch = englishDuas.slice(i, i + BATCH_SIZE);
        // Process items in batch sequentially to be even safer
        const translatedBatch = [];
        for (const dua of batch) {
            try {
                const translatedTitle = await translateText(dua.title, targetLang);
                // Small delay between title and text translation
                await new Promise((resolve) => setTimeout(resolve, 300));
                const translatedText = await translateText(dua.translation, targetLang);
                translatedBatch.push({
                    externalId: dua.externalId,
                    title: translatedTitle,
                    arabic: dua.arabic,
                    translation: translatedText,
                    transliteration: dua.transliteration,
                    category: translatedTitle,
                    audio: dua.audio,
                    repeat: dua.repeat,
                    lang: targetLang,
                    version: 1,
                });
            }
            catch (err) {
                console.error(`Translation failed for ${dua.externalId}:`, err);
                translatedBatch.push(null);
            }
            // Delay between each dua
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        const validDuas = translatedBatch.filter((d) => d !== null);
        if (validDuas.length > 0) {
            await dua_model_1.Dua.insertMany(validDuas);
            results.push(...validDuas);
        }
        console.log(`Translated ${i + validDuas.length} of ${englishDuas.length}`);
        // Delay between batches to avoid rate limits
        if (i + BATCH_SIZE < englishDuas.length) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
    if (category) {
        return results.filter((d) => d.category === category);
    }
    return results;
};
exports.DuaService = {
    getAllDuas,
    getDuaById,
    createDua,
    getVersion,
    checkSyncMetadata,
    getSyncData,
    syncEnglishDuas,
    getOrSyncDuasByLanguage,
};
