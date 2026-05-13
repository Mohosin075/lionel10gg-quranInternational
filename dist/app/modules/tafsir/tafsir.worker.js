"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestSurahTafsir = ingestSurahTafsir;
const axios_1 = __importDefault(require("axios"));
const tafsir_model_1 = require("./tafsir.model");
const QURAN_ENC_BASE_URL = 'https://quranenc.com/api/v1';
async function ingestSurahTafsir(surahNumber, edition, lang) {
    try {
        console.log(`Starting Tafsir ingestion for Surah ${surahNumber}, Edition: ${edition}`);
        const response = await axios_1.default.get(`${QURAN_ENC_BASE_URL}/translation/sura/${edition}/${surahNumber}`);
        if (!response.data || !response.data.result || !Array.isArray(response.data.result)) {
            throw new Error(`Failed to fetch tafsir for Surah ${surahNumber} from QuranEnc`);
        }
        const batch = response.data.result.map((item) => ({
            surah: Number(item.sura),
            ayah: Number(item.aya),
            lang: lang,
            edition: edition,
            text: item.translation,
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
            console.log(`Successfully ingested ${batch.length} tafsir ayahs for Surah ${surahNumber} (${edition})`);
        }
    }
    catch (error) {
        console.error(`Failed to ingest Tafsir for Surah ${surahNumber}:`, error);
        throw error;
    }
}
