"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestSurahTafsir = ingestSurahTafsir;
const axios_1 = __importDefault(require("axios"));
const tafsir_model_1 = require("./tafsir.model");
const translationHelper_1 = require("../../../helpers/translationHelper");
const QURAN_ENC_BASE_URL = 'https://quranenc.com/api/v1';
async function ingestSurahTafsir(surahNumber, edition, lang) {
    try {
        console.log(`Starting Tafsir ingestion for Surah ${surahNumber}, Edition: ${edition}, Lang: ${lang}`);
        // We always fetch the Arabic At-Tafsir Al-Muyassar as the base Tafsir
        const response = await axios_1.default.get(`${QURAN_ENC_BASE_URL}/translation/sura/arabic_moyassar/${surahNumber}`);
        if (!response.data || !response.data.result || !Array.isArray(response.data.result)) {
            throw new Error(`Failed to fetch tafsir for Surah ${surahNumber} from QuranEnc`);
        }
        const rawTafsirs = response.data.result;
        let translatedTexts = [];
        if (lang !== 'ar') {
            const textsToTranslate = rawTafsirs.map(item => item.translation);
            translatedTexts = await translateBatch(textsToTranslate, lang, 'ar');
        }
        else {
            translatedTexts = rawTafsirs.map(item => item.translation);
        }
        const batch = rawTafsirs.map((item, idx) => ({
            surah: Number(item.sura),
            ayah: Number(item.aya),
            lang: lang,
            edition: edition,
            text: translatedTexts[idx] || item.translation,
            version: 1,
        }));
        if (batch.length > 0) {
            await tafsir_model_1.Tafsir.bulkWrite(batch.map((doc) => ({
                updateOne: {
                    filter: {
                        surah: doc.surah,
                        ayah: doc.ayah,
                        lang: doc.lang,
                        edition: doc.edition,
                    },
                    update: { $set: doc },
                    upsert: true,
                },
            })));
            console.log(`Successfully ingested and translated ${batch.length} tafsir ayahs for Surah ${surahNumber} (${edition}, lang: ${lang})`);
        }
    }
    catch (error) {
        console.error(`Failed to ingest Tafsir for Surah ${surahNumber}:`, error);
        throw error;
    }
}
async function translateBatch(texts, targetLang, sourceLang = 'ar') {
    const BATCH_SIZE = 15;
    const chunks = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        chunks.push(texts.slice(i, i + BATCH_SIZE));
    }
    const promises = chunks.map(async (chunk) => {
        const joinedText = chunk.join(' ||| ');
        try {
            const translatedJoined = await translationHelper_1.TranslationHelper.translateText(joinedText, targetLang, sourceLang);
            const translatedChunk = translatedJoined.split('|||').map(t => t.trim());
            if (translatedChunk.length === chunk.length) {
                return translatedChunk;
            }
            console.warn(`[TafsirWorker] Split length mismatch (${translatedChunk.length} vs ${chunk.length}). Falling back to sequential translation for this chunk.`);
        }
        catch (e) {
            console.error('[TafsirWorker] Error in batch chunk translation:', e);
        }
        // Fallback if batch translation failed/split mismatched
        const fallbackChunk = [];
        for (const item of chunk) {
            const single = await translationHelper_1.TranslationHelper.translateText(item, targetLang, sourceLang);
            fallbackChunk.push(single);
        }
        return fallbackChunk;
    });
    const resolvedChunks = await Promise.all(promises);
    return resolvedChunks.flat();
}
