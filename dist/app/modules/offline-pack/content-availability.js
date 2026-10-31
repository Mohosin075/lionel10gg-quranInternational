"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCompleteContentLanguages = exports.hasAllContentModules = exports.REQUIRED_CONTENT_MODULES = void 0;
const content_snapshot_1 = require("./content-snapshot");
const content_publication_1 = require("./content-publication");
const available_editions_1 = require("../quran/available-editions");
const quran_model_1 = require("../quran/quran.model");
exports.REQUIRED_CONTENT_MODULES = ['quran', 'hadith', 'dua', 'knowledge', 'book', 'fatwa', 'tafsir'];
const hasAllContentModules = (details) => exports.REQUIRED_CONTENT_MODULES.every(module => (details[module] || 0) > 0);
exports.hasAllContentModules = hasAllContentModules;
const readCompleteContentLanguages = async () => {
    var _a;
    const details = new Map();
    const [editionKeys, counts] = await Promise.all([
        (0, available_editions_1.readCompleteEditionKeys)(),
        Promise.all(Object.entries(content_snapshot_1.contentModels).map(async ([module, model]) => ({
            module,
            rows: await model.aggregate([
                { $match: (0, content_publication_1.publishedModuleFilter)(module) },
                { $group: { _id: '$lang', count: { $sum: 1 } } },
            ]),
        }))),
    ]);
    for (const { module, rows } of counts)
        for (const row of rows) {
            if (!row._id)
                continue;
            const code = row._id.toLowerCase();
            const value = details.get(code) || {};
            value[module] = row.count;
            details.set(code, value);
        }
    const editions = await quran_model_1.Language.find({ key: { $in: editionKeys } }).select('iso key').lean();
    for (const edition of editions) {
        const code = (_a = edition.iso) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (!code)
            continue;
        const value = details.get(code) || {};
        value.quran = 6236;
        details.set(code, value);
    }
    const languages = [...details].filter(([, value]) => (0, exports.hasAllContentModules)(value)).map(([code, value]) => ({
        code, details: value, modules: [...exports.REQUIRED_CONTENT_MODULES],
        totalRecords: Object.values(value).reduce((sum, count) => sum + count, 0), hasPacks: false,
    }));
    const codes = new Set(languages.map(row => row.code));
    return { languages, availableCodes: [...codes], editionKeys: editions.filter(row => { var _a; return codes.has(((_a = row.iso) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || ''); }).map(row => row.key) };
};
exports.readCompleteContentLanguages = readCompleteContentLanguages;
