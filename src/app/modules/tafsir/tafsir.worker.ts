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

    const batch: ITafsir[] = [];
    
    for (const item of response.data.result) {
      let text = item.translation; // Arabic tafsir text
      
      if (lang !== 'ar') {
        // Translate from Arabic to the target language
        text = await TranslationHelper.translateText(text, lang, 'ar');
      }
      
      batch.push({
        surah: Number(item.sura),
        ayah: Number(item.aya),
        lang: lang,
        edition: edition,
        text: text,
        version: 1,
      });
    }

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
