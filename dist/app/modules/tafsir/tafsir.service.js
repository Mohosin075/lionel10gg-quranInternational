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
const getSyncData = async (edition, fromVersion = 0) => {
    return await tafsir_model_1.Tafsir.find({
        edition,
        version: { $gt: fromVersion }
    }).sort({ surah: 1, ayah: 1 }).lean();
};
exports.TafsirService = {
    getTafsir,
    getSurahTafsir,
    getTranslationVersion,
    checkSyncMetadata,
    getSyncData,
};
