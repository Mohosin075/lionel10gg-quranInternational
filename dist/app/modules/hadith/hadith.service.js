"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HadithServices = void 0;
const axios_1 = __importDefault(require("axios"));
const hadith_model_1 = require("./hadith.model");
const translationHelper_1 = require("../../../helpers/translationHelper");
const EDITION_SOURCE_MAP = {
    bukhari: 'Sahih al-Bukhari',
    muslim: 'Sahih Muslim',
    abudawud: 'Sunan Abi Dawud',
    tirmidhi: 'Jami at-Tirmidhi',
    nasai: 'Sunan an-Nasai',
    ibnmajah: 'Sunan Ibn Majah',
};
const getSourceName = (edition) => {
    const bookKey = edition.toLowerCase().split('-')[1] || 'hadith';
    return EDITION_SOURCE_MAP[bookKey] || 'Official Hadith';
};
const syncFromGlobalApi = async (edition, fromHadith, toHadith) => {
    var _a;
    let createdCount = 0;
    let updatedCount = 0;
    const sourceName = getSourceName(edition);
    const arabEdition = edition.replace('eng-', 'ara-');
    for (let i = fromHadith; i <= toHadith; i++) {
        try {
            const engUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${edition}/${i}.json`;
            const engRes = await axios_1.default.get(engUrl);
            if (!engRes.data || !engRes.data.hadiths || engRes.data.hadiths.length === 0) {
                continue;
            }
            const engHadith = engRes.data.hadiths[0];
            const chapterName = ((_a = engRes.data.metadata) === null || _a === void 0 ? void 0 : _a.section)
                ? Object.values(engRes.data.metadata.section)[0]
                : 'General';
            let arabicText = 'Arabic text unavailable online';
            try {
                const araUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${arabEdition}/${i}.json`;
                const araRes = await axios_1.default.get(araUrl);
                if (araRes.data && araRes.data.hadiths && araRes.data.hadiths.length > 0) {
                    arabicText = araRes.data.hadiths[0].text;
                }
            }
            catch (err) {
                console.error(`Failed to fetch Arabic text for Hadith ${i}:`, err);
            }
            const hadithBookKey = edition.split('-')[1] || 'hadith';
            const hadithNo = `${hadithBookKey}_${i}`;
            const hadithData = {
                hadithNo,
                source: sourceName,
                chapter: chapterName,
                arabicText,
                translation: engHadith.text,
                authenticity: 'Sahih',
                category: chapterName,
                lang: 'en',
                version: 1,
                isActive: true,
            };
            const result = await hadith_model_1.Hadith.findOneAndUpdate({ hadithNo, lang: 'en' }, { $set: hadithData }, { upsert: true, new: false });
            if (result) {
                updatedCount++;
            }
            else {
                createdCount++;
            }
            await translationHelper_1.TranslationHelper.sleep(150);
        }
        catch (error) {
            console.error(`Error syncing Hadith ${i} from global API:`, error);
        }
    }
    return { createdCount, updatedCount };
};
const getAllHadiths = async (lang = 'en', category, source, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    // Auto-populate DB with enough Hadith for offline (not a handful)
    const totalEnglish = await hadith_model_1.Hadith.countDocuments({ lang: 'en' });
    if (totalEnglish === 0) {
        console.log('[HadithService] Auto-syncing Bukhari 1-100 + Muslim 1-50...');
        await syncFromGlobalApi('eng-bukhari', 1, 100);
        await syncFromGlobalApi('eng-muslim', 1, 50);
    }
    if (lang !== 'en') {
        const count = await hadith_model_1.Hadith.countDocuments({ lang });
        if (count === 0) {
            await getOrSyncHadithsByLanguage(lang);
        }
    }
    const query = { lang, isActive: true };
    if (category)
        query.category = category;
    if (source)
        query.source = source;
    const [data, total] = await Promise.all([
        hadith_model_1.Hadith.find(query).skip(skip).limit(limit).sort({ hadithNo: 1 }).lean(),
        hadith_model_1.Hadith.countDocuments(query),
    ]);
    return {
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
const clampSyncLimit = (limit) => {
    const n = Number(limit) || 500;
    return Math.min(Math.max(n, 1), 1000);
};
const getSyncData = async (lang = 'en', fromVersion = 0, page = 1, limit = 500) => {
    // Ingest-if-empty so download-sync can fill the phone
    const existing = await hadith_model_1.Hadith.countDocuments({ lang });
    if (existing === 0) {
        const totalEnglish = await hadith_model_1.Hadith.countDocuments({ lang: 'en' });
        if (totalEnglish === 0) {
            console.log('[HadithService] download-sync empty — seeding Bukhari 1-100 + Muslim 1-50...');
            await syncFromGlobalApi('eng-bukhari', 1, 100);
            await syncFromGlobalApi('eng-muslim', 1, 50);
        }
        if (lang !== 'en') {
            await getOrSyncHadithsByLanguage(lang);
        }
    }
    const safeLimit = clampSyncLimit(limit);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;
    const filter = { lang, isActive: { $ne: false }, version: { $gt: fromVersion } };
    const total = await hadith_model_1.Hadith.countDocuments(filter);
    const data = await hadith_model_1.Hadith.find(filter)
        .sort({ hadithNo: 1 })
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
const getOrSyncHadithsByLanguage = async (targetLang) => {
    const count = await hadith_model_1.Hadith.countDocuments({ lang: targetLang });
    if (count > 0) {
        return await hadith_model_1.Hadith.find({ lang: targetLang }).lean();
    }
    const sourceHadiths = await hadith_model_1.Hadith.find({ lang: 'en' }).lean();
    if (sourceHadiths.length === 0)
        return [];
    console.log(`[HadithService] Translating ${sourceHadiths.length} Hadiths to: ${targetLang}...`);
    const results = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < sourceHadiths.length; i += BATCH_SIZE) {
        const batch = sourceHadiths.slice(i, i + BATCH_SIZE);
        const translatedBatch = [];
        for (const hadith of batch) {
            try {
                const translatedChapter = await translationHelper_1.TranslationHelper.translateText(hadith.chapter, targetLang);
                await translationHelper_1.TranslationHelper.sleep(200);
                const translatedTranslation = await translationHelper_1.TranslationHelper.translateText(hadith.translation, targetLang);
                await translationHelper_1.TranslationHelper.sleep(200);
                const translatedCategory = await translationHelper_1.TranslationHelper.translateText(hadith.category, targetLang);
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
            await translationHelper_1.TranslationHelper.sleep(300);
        }
        const validHadiths = translatedBatch.filter((h) => h !== null);
        if (validHadiths.length > 0) {
            await hadith_model_1.Hadith.insertMany(validHadiths);
            results.push(...validHadiths);
        }
        console.log(`Translated ${i + validHadiths.length} of ${sourceHadiths.length} Hadiths`);
        if (i + BATCH_SIZE < sourceHadiths.length) {
            await translationHelper_1.TranslationHelper.sleep(1500);
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
    syncFromGlobalApi,
};
