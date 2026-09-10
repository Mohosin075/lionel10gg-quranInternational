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
    malik: 'Muwatta Malik',
    nawawi: 'Forty Hadith Nawawi',
};
const getSourceName = (edition) => {
    const bookKey = edition.toLowerCase().split('-')[1] || 'hadith';
    return EDITION_SOURCE_MAP[bookKey] || 'Official Hadith';
};
const syncFromGlobalApi = async (edition, fromHadith, toHadith) => {
    var _a, _b, _c, _d, _e, _f;
    let createdCount = 0;
    let updatedCount = 0;
    const sourceName = getSourceName(edition);
    const arabEdition = edition.replace('eng-', 'ara-');
    const hadithBookKey = edition.split('-')[1] || 'hadith';
    // Fast Bulk Fetch Approach (Single HTTP Call per edition)
    try {
        const engUrl = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${edition}.min.json`;
        const engRes = await axios_1.default.get(engUrl);
        if (engRes.data && Array.isArray(engRes.data.hadiths) && engRes.data.hadiths.length > 0) {
            let araHadithsMap = {};
            try {
                const araUrl = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${arabEdition}.min.json`;
                const araRes = await axios_1.default.get(araUrl);
                if (araRes.data && Array.isArray(araRes.data.hadiths)) {
                    araRes.data.hadiths.forEach((h, idx) => {
                        const num = h.hadithnumber || (idx + 1);
                        araHadithsMap[num] = h.text;
                    });
                }
            }
            catch (err) {
                console.error(`Failed to fetch Arabic edition JSON for ${arabEdition}:`, err);
            }
            const sections = ((_a = engRes.data.metadata) === null || _a === void 0 ? void 0 : _a.sections) || ((_b = engRes.data.metadata) === null || _b === void 0 ? void 0 : _b.section) || {};
            const allHadiths = engRes.data.hadiths;
            const targetHadiths = allHadiths.filter((h, idx) => {
                const num = h.hadithnumber || (idx + 1);
                return num >= fromHadith && num <= toHadith;
            });
            if (targetHadiths.length > 0) {
                const bulkOps = targetHadiths.map((engHadith, idx) => {
                    var _a, _b;
                    const hadithNum = engHadith.hadithnumber || (fromHadith + idx);
                    const hadithNo = `${hadithBookKey}_${hadithNum}`;
                    const arabicText = araHadithsMap[hadithNum] || 'Arabic text unavailable online';
                    const bookNum = String((_b = (_a = engHadith.reference) === null || _a === void 0 ? void 0 : _a.book) !== null && _b !== void 0 ? _b : 0);
                    let chapterName = sections[bookNum];
                    if (!chapterName || chapterName.trim() === '') {
                        chapterName = bookNum === '0' ? 'General' : `Book ${bookNum}`;
                    }
                    let authenticity = 'Sahih';
                    if (Array.isArray(engHadith.grades) && engHadith.grades.length > 0) {
                        const mainGrade = engHadith.grades.find((g) => { var _a; return (_a = g.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('albani'); }) || engHadith.grades[0];
                        if (mainGrade && mainGrade.grade) {
                            authenticity = mainGrade.grade;
                        }
                    }
                    const hadithData = {
                        hadithNo,
                        source: sourceName,
                        chapter: chapterName,
                        arabicText,
                        translation: engHadith.text,
                        authenticity,
                        category: chapterName,
                        lang: 'en',
                        version: 1,
                        isActive: true,
                    };
                    return {
                        updateOne: {
                            filter: { hadithNo, lang: 'en' },
                            update: { $set: hadithData },
                            upsert: true,
                        },
                    };
                });
                const bulkRes = await hadith_model_1.Hadith.bulkWrite(bulkOps);
                createdCount = bulkRes.upsertedCount || 0;
                updatedCount = bulkRes.modifiedCount || 0;
                return { createdCount, updatedCount };
            }
        }
    }
    catch (fastErr) {
        console.warn(`Fast bulk fetch failed for ${edition}, falling back to item-by-item:`, fastErr);
    }
    // Fallback: item-by-item fetching
    for (let i = fromHadith; i <= toHadith; i++) {
        try {
            const engUrl = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${edition}/${i}.json`;
            const engRes = await axios_1.default.get(engUrl);
            if (!engRes.data || !engRes.data.hadiths || engRes.data.hadiths.length === 0) {
                continue;
            }
            const engHadith = engRes.data.hadiths[0];
            const sections = ((_c = engRes.data.metadata) === null || _c === void 0 ? void 0 : _c.sections) || ((_d = engRes.data.metadata) === null || _d === void 0 ? void 0 : _d.section) || {};
            const bookNum = String((_f = (_e = engHadith.reference) === null || _e === void 0 ? void 0 : _e.book) !== null && _f !== void 0 ? _f : 0);
            let chapterName = sections[bookNum];
            if (!chapterName || chapterName.trim() === '') {
                chapterName = bookNum === '0' ? 'General' : `Book ${bookNum}`;
            }
            let authenticity = 'Sahih';
            if (Array.isArray(engHadith.grades) && engHadith.grades.length > 0) {
                const mainGrade = engHadith.grades.find((g) => { var _a; return (_a = g.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('albani'); }) || engHadith.grades[0];
                if (mainGrade && mainGrade.grade) {
                    authenticity = mainGrade.grade;
                }
            }
            let arabicText = 'Arabic text unavailable online';
            try {
                const araUrl = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${arabEdition}/${i}.json`;
                const araRes = await axios_1.default.get(araUrl);
                if (araRes.data && araRes.data.hadiths && araRes.data.hadiths.length > 0) {
                    arabicText = araRes.data.hadiths[0].text;
                }
            }
            catch (err) {
                console.error(`Failed to fetch Arabic text for Hadith ${i}:`, err);
            }
            const hadithNo = `${hadithBookKey}_${i}`;
            const hadithData = {
                hadithNo,
                source: sourceName,
                chapter: chapterName,
                arabicText,
                translation: engHadith.text,
                authenticity,
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
// Total ~10,042 hadiths distributed across all 8 collections
// so every section of the app has content from day one.
const ALL_HADITH_COLLECTIONS = [
    { key: 'bukhari', edition: 'eng-bukhari', name: 'Sahih al-Bukhari', range: { from: 1, to: 3000 } },
    { key: 'muslim', edition: 'eng-muslim', name: 'Sahih Muslim', range: { from: 1, to: 1500 } },
    { key: 'abudawud', edition: 'eng-abudawud', name: 'Sunan Abi Dawud', range: { from: 1, to: 1500 } },
    { key: 'tirmidhi', edition: 'eng-tirmidhi', name: 'Jami at-Tirmidhi', range: { from: 1, to: 1000 } },
    { key: 'nasai', edition: 'eng-nasai', name: 'Sunan an-Nasai', range: { from: 1, to: 1000 } },
    { key: 'ibnmajah', edition: 'eng-ibnmajah', name: 'Sunan Ibn Majah', range: { from: 1, to: 1000 } },
    { key: 'malik', edition: 'eng-malik', name: 'Muwatta Malik', range: { from: 1, to: 500 } },
    { key: 'nawawi', edition: 'eng-nawawi', name: 'Forty Hadith Nawawi', range: { from: 1, to: 42 } },
];
const seedAllHadithCollections = async () => {
    console.log('[HadithService] Triggering background seed for all 8 Hadith collections...');
    for (const item of ALL_HADITH_COLLECTIONS) {
        try {
            await syncFromGlobalApi(item.edition, item.range.from, item.range.to);
        }
        catch (err) {
            console.error(`[HadithService] Failed to seed ${item.edition}:`, err);
        }
    }
};
const getCollections = async (lang = 'en') => {
    const totalEnglish = await hadith_model_1.Hadith.countDocuments({ lang: 'en' });
    if (totalEnglish === 0) {
        void seedAllHadithCollections();
    }
    const result = await Promise.all(ALL_HADITH_COLLECTIONS.map(async (col) => {
        const count = await hadith_model_1.Hadith.countDocuments({ source: col.name, lang, isActive: true });
        return {
            key: col.key,
            edition: col.edition,
            name: col.name,
            count,
            isAvailable: true,
        };
    }));
    return result;
};
const getAllHadiths = async (lang = 'en', category, source, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    // Auto-populate DB in the background — don't block the HTTP response
    const totalEnglish = await hadith_model_1.Hadith.countDocuments({ lang: 'en' });
    if (totalEnglish === 0) {
        console.log('[HadithService] Triggering background seed for all Hadith collections...');
        void seedAllHadithCollections();
    }
    if (lang !== 'en') {
        const count = await hadith_model_1.Hadith.countDocuments({ lang });
        if (count === 0) {
            // Background translation — can take a very long time
            void (async () => {
                try {
                    await getOrSyncHadithsByLanguage(lang);
                }
                catch (err) {
                    console.error(`[HadithService] Background lang sync failed (${lang}):`, err);
                }
            })();
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
    // Fire-and-forget seed so the HTTP response is NOT blocked for minutes
    const existing = await hadith_model_1.Hadith.countDocuments({ lang });
    if (existing === 0) {
        const totalEnglish = await hadith_model_1.Hadith.countDocuments({ lang: 'en' });
        if (totalEnglish === 0) {
            console.log('[HadithService] download-sync empty — seeding all collections in background...');
            void seedAllHadithCollections();
        }
        if (lang !== 'en') {
            void (async () => {
                try {
                    await getOrSyncHadithsByLanguage(lang);
                }
                catch (err) {
                    console.error(`[HadithService] Background lang sync error (${lang}):`, err);
                }
            })();
        }
        // Return empty immediately — client will retry and get data once seeded
        return {
            data: [],
            meta: { page: 1, limit, total: 0, totalPages: 1 },
        };
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
    getCollections,
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
