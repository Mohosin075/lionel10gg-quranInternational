"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TafsirService = void 0;
const tafsir_model_1 = require("./tafsir.model");
const tafsir_worker_1 = require("./tafsir.worker");
const getTafsir = async (surah, ayah, edition = 'arabic_moyassar', lang = 'ar') => {
    let result = await tafsir_model_1.Tafsir.findOne({ surah, ayah, edition, lang }).lean();
    if (!result) {
        // Trigger ingestion for the whole surah
        await (0, tafsir_worker_1.ingestSurahTafsir)(surah, edition, lang);
        result = await tafsir_model_1.Tafsir.findOne({ surah, ayah, edition, lang }).lean();
    }
    return result;
};
const getSurahTafsir = async (surah, edition = 'arabic_moyassar', lang = 'ar') => {
    let results = await tafsir_model_1.Tafsir.find({ surah, edition, lang }).sort({ ayah: 1 }).lean();
    if (results.length === 0) {
        await (0, tafsir_worker_1.ingestSurahTafsir)(surah, edition, lang);
        results = await tafsir_model_1.Tafsir.find({ surah, edition, lang }).sort({ ayah: 1 }).lean();
    }
    return results;
};
const getTranslationVersion = async (edition) => {
    const latest = await tafsir_model_1.Tafsir.findOne({ edition }).sort({ version: -1 }).select('version');
    return (latest === null || latest === void 0 ? void 0 : latest.version) || 1;
};
const checkSyncMetadata = async (edition, clientVersion) => {
    const serverVersion = await getTranslationVersion(edition);
    return {
        updateAvailable: serverVersion > clientVersion,
        serverVersion,
        clientVersion
    };
};
const clampSyncLimit = (limit) => {
    const n = Number(limit) || 500;
    return Math.min(Math.max(n, 1), 1000);
};
const getSyncData = async (edition, fromVersion = 0, page = 1, limit = 500) => {
    const safeEdition = edition || 'arabic_moyassar';
    const safeLimit = clampSyncLimit(limit);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;
    // Kickstart empty collection so dump is not permanently empty
    const existing = await tafsir_model_1.Tafsir.countDocuments({ edition: safeEdition });
    if (existing === 0) {
        console.log(`[TafsirService] Empty dump — ingesting Surah 1 for ${safeEdition}...`);
        await (0, tafsir_worker_1.ingestSurahTafsir)(1, safeEdition, 'ar');
    }
    const filter = { edition: safeEdition, version: { $gt: fromVersion } };
    const total = await tafsir_model_1.Tafsir.countDocuments(filter);
    const data = await tafsir_model_1.Tafsir.find(filter)
        .sort({ surah: 1, ayah: 1 })
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
exports.TafsirService = {
    getTafsir,
    getSurahTafsir,
    getTranslationVersion,
    checkSyncMetadata,
    getSyncData,
};
