"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuaService = void 0;
const dua_model_1 = require("./dua.model");
const getAllDuas = async (lang = 'en', category) => {
    const query = { lang };
    if (category) {
        query.category = category;
    }
    return await dua_model_1.Dua.find(query).lean();
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
        lang
    };
};
const getSyncData = async (lang = 'en', fromVersion = 0) => {
    return await dua_model_1.Dua.find({
        lang,
        version: { $gt: fromVersion }
    }).sort({ category: 1, title: 1 }).lean();
};
exports.DuaService = {
    getAllDuas,
    getDuaById,
    createDua,
    getVersion,
    checkSyncMetadata,
    getSyncData,
};
