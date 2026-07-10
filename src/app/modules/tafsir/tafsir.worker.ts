import axios from 'axios';
import { ITafsir } from './tafsir.interface';
import { Tafsir } from './tafsir.model';
import { IQuranEncSurahResponse } from '../quran/quran.interface';
import { TranslationHelper } from '../../../helpers/translationHelper';

const QURAN_ENC_BASE_URL = 'https://quranenc.com/api/v1';

export async function ingestSurahTafsir(surahNumber: number, edition: string, lang: string) {
  try {
    console.log(`Starting Tafsir ingestion for Surah ${surahNumber}, Edition: ${edition}, Lang: ${lang}`);
    
    // We always fetch the Arabic At-Tafsir Al-Muyassar as the base Tafsir
    const response = await axios.get<IQuranEncSurahResponse>(
      `${QURAN_ENC_BASE_URL}/translation/sura/arabic_moyassar/${surahNumber}`
    );
    
    if (!response.data || !response.data.result || !Array.isArray(response.data.result)) {
      throw new Error(`Failed to fetch tafsir for Surah ${surahNumber} from QuranEnc`);
    }

    const rawTafsirs = response.data.result;
    let translatedTexts: string[] = [];

    if (lang !== 'ar') {
      const textsToTranslate = rawTafsirs.map(item => item.translation);
      translatedTexts = await translateBatch(textsToTranslate, lang, 'ar');
    } else {
      translatedTexts = rawTafsirs.map(item => item.translation);
    }

    const batch: ITafsir[] = rawTafsirs.map((item, idx) => ({
      surah: Number(item.sura),
      ayah: Number(item.aya),
      lang: lang,
      edition: edition,
      text: translatedTexts[idx] || item.translation,
      version: 1,
    }));

    if (batch.length > 0) {
      await Tafsir.bulkWrite(
        batch.map((doc) => ({
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
        }))
      );
      console.log(`Successfully ingested and translated ${batch.length} tafsir ayahs for Surah ${surahNumber} (${edition}, lang: ${lang})`);
    }
  } catch (error) {
    console.error(`Failed to ingest Tafsir for Surah ${surahNumber}:`, error);
    throw error;
  }
}

async function translateBatch(texts: string[], targetLang: string, sourceLang: string = 'ar'): Promise<string[]> {
  const BATCH_SIZE = 15;
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    chunks.push(texts.slice(i, i + BATCH_SIZE));
  }

  const promises = chunks.map(async (chunk) => {
    const joinedText = chunk.join(' ||| ');
    try {
      const translatedJoined = await TranslationHelper.translateText(joinedText, targetLang, sourceLang);
      const translatedChunk = translatedJoined.split('|||').map(t => t.trim());
      
      if (translatedChunk.length === chunk.length) {
        return translatedChunk;
      }
      console.warn(`[TafsirWorker] Split length mismatch (${translatedChunk.length} vs ${chunk.length}). Falling back to sequential translation for this chunk.`);
    } catch (e) {
      console.error('[TafsirWorker] Error in batch chunk translation:', e);
    }
    
    // Fallback if batch translation failed/split mismatched
    const fallbackChunk: string[] = [];
    for (const item of chunk) {
      const single = await TranslationHelper.translateText(item, targetLang, sourceLang);
      fallbackChunk.push(single);
    }
    return fallbackChunk;
  });

  const resolvedChunks = await Promise.all(promises);
  return resolvedChunks.flat();
}
