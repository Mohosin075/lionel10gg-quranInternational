"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPackExporterWorker = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const offline_pack_service_1 = require("../app/modules/offline-pack/offline-pack.service");
const offline_pack_model_1 = require("../app/modules/offline-pack/offline-pack.model");
const hadith_model_1 = require("../app/modules/hadith/hadith.model");
const dua_model_1 = require("../app/modules/dua/dua.model");
const knowledge_library_model_1 = require("../app/modules/knowledge-library/knowledge-library.model");
const quran_model_1 = require("../app/modules/quran/quran.model");
const tafsir_model_1 = require("../app/modules/tafsir/tafsir.model");
const knowledge_book_model_1 = require("../app/modules/knowledge-library/knowledge-book.model");
const knowledge_fatwa_model_1 = require("../app/modules/knowledge-library/knowledge-fatwa.model");
const MODULES = [
    'quran',
    'tafsir',
    'hadith',
    'dua',
    'knowledge',
    'book',
    'fatwa',
];
/**
 * Checks all modules and languages; rebuilds offline packs
 * if new content is present or if pack does not yet exist.
 */
const runPackExporterWorker = async () => {
    var _a;
    console.log('[PackExporterWorker] Starting automated offline pack audit & build...');
    let generated = 0;
    let skipped = 0;
    let errors = 0;
    for (const mod of MODULES) {
        try {
            // Find all distinct languages for this module
            let distinctLangs = [];
            switch (mod) {
                case 'hadith':
                    distinctLangs = await hadith_model_1.Hadith.distinct('lang', { isActive: true });
                    break;
                case 'dua':
                    distinctLangs = await dua_model_1.Dua.distinct('lang');
                    break;
                case 'knowledge':
                    distinctLangs = await knowledge_library_model_1.KnowledgeArticle.distinct('lang');
                    break;
                case 'quran':
                    distinctLangs = await quran_model_1.Translation.distinct('lang');
                    break;
                case 'tafsir':
                    distinctLangs = await tafsir_model_1.Tafsir.distinct('lang');
                    break;
                case 'book':
                    distinctLangs = await knowledge_book_model_1.KnowledgeBook.distinct('lang');
                    break;
                case 'fatwa':
                    distinctLangs = await knowledge_fatwa_model_1.KnowledgeFatwa.distinct('lang');
                    break;
            }
            for (const lang of distinctLangs) {
                if (!lang)
                    continue;
                try {
                    // Check existing pack
                    const pack = await offline_pack_model_1.OfflinePack.findOne({ module: mod, lang }).sort({ version: -1 });
                    // Count current records in DB
                    let currentCount = 0;
                    switch (mod) {
                        case 'hadith':
                            currentCount = await hadith_model_1.Hadith.countDocuments({ lang, isActive: true });
                            break;
                        case 'dua':
                            currentCount = await dua_model_1.Dua.countDocuments({ lang });
                            break;
                        case 'knowledge':
                            currentCount = await knowledge_library_model_1.KnowledgeArticle.countDocuments({ lang });
                            break;
                        case 'quran':
                            currentCount = await quran_model_1.Translation.countDocuments({ lang });
                            break;
                        case 'tafsir':
                            currentCount = await tafsir_model_1.Tafsir.countDocuments({ lang });
                            break;
                        case 'book':
                            currentCount = await knowledge_book_model_1.KnowledgeBook.countDocuments({ lang });
                            break;
                        case 'fatwa':
                            currentCount = await knowledge_fatwa_model_1.KnowledgeFatwa.countDocuments({ lang });
                            break;
                    }
                    if (currentCount === 0) {
                        skipped++;
                        continue;
                    }
                    // Generate pack if it doesn't exist or record count changed
                    if (!pack || pack.recordCount !== currentCount) {
                        console.log(`[PackExporterWorker] Generating pack for ${mod}/${lang} (DB: ${currentCount} records, Pack: ${(_a = pack === null || pack === void 0 ? void 0 : pack.recordCount) !== null && _a !== void 0 ? _a : 0})...`);
                        await offline_pack_service_1.OfflinePackService.generateAndUploadPack(mod, lang);
                        generated++;
                    }
                    else {
                        skipped++;
                    }
                }
                catch (packErr) {
                    errors++;
                    console.error(`[PackExporterWorker] Error generating pack for ${mod}/${lang}:`, packErr);
                }
            }
        }
        catch (modErr) {
            console.error(`[PackExporterWorker] Error auditing module ${mod}:`, modErr);
        }
    }
    console.log(`[PackExporterWorker] Completed. Generated: ${generated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { generated, skipped, errors };
};
exports.runPackExporterWorker = runPackExporterWorker;
// Schedule to run daily at 4:00 AM (after 3:00 AM Dua synchronization)
node_cron_1.default.schedule('0 4 * * *', async () => {
    try {
        await (0, exports.runPackExporterWorker)();
    }
    catch (err) {
        console.error('[PackExporterWorker] Cron run failed:', err);
    }
});
