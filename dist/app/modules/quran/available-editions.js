"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCompleteEditionKeys = exports.completeEditionKeys = void 0;
const quran_model_1 = require("./quran.model");
const quran_constants_1 = require("./quran.constants");
const completeEditionKeys = (rows) => {
    var _a;
    const editions = new Map();
    for (const row of rows) {
        const expected = (_a = quran_constants_1.SURAH_LIST.find(s => s.number === row._id.surah)) === null || _a === void 0 ? void 0 : _a.numberOfAyahs;
        if (!expected || row.count !== expected || row.valid !== expected || row.first !== 1 || row.last !== expected)
            continue;
        const key = row._id.edition + '\0' + row._id.lang;
        const surahs = editions.get(key) || new Set();
        surahs.add(row._id.surah);
        editions.set(key, surahs);
    }
    return [...new Set([...editions].filter(([, surahs]) => surahs.size === 114).map(([key]) => key.split('\0')[0]))];
};
exports.completeEditionKeys = completeEditionKeys;
const readCompleteEditionKeys = async () => {
    const arabic = new RegExp('[' + String.fromCharCode(0x600) + '-' + String.fromCharCode(0x6ff) + ']');
    const rows = await quran_model_1.Translation.aggregate([
        { $group: {
                _id: { edition: '$edition', lang: '$lang', surah: '$surah' },
                count: { $sum: 1 }, first: { $min: '$ayah' }, last: { $max: '$ayah' },
                valid: { $sum: { $cond: [{ $and: [
                                    { $regexMatch: { input: { $ifNull: ['$arabicText', ''] }, regex: arabic } },
                                    { $regexMatch: { input: { $ifNull: ['$text', ''] }, regex: /\S/ } },
                                ] }, 1, 0] } },
            } },
    ]).allowDiskUse(true);
    return (0, exports.completeEditionKeys)(rows);
};
exports.readCompleteEditionKeys = readCompleteEditionKeys;
