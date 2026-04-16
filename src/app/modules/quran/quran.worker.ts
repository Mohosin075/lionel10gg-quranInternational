import axios from 'axios';
import { ITranslation, IQuranEncSurahResponse } from './quran.interface';
import { QuranServices } from './quran.service';

const QURAN_ENC_BASE_URL = 'https://quranenc.com/api/v1';

/**
 * ETL Pipeline to ingest data from QuranEnc into MongoDB
 * @param surahNumber 
 * @param translationKey (e.g., 'english_saheeh')
 * @param lang 
 */
export async function ingestSurahTranslations(surahNumber: number, translationKey: string, lang: string) {
  try {
    console.log(`Starting ingestion from QuranEnc for Surah ${surahNumber}, Key: ${translationKey}`);
    
    // If we want Arabic, we use 'english_saheeh' as a source because it includes 'arabic_text'
    const fetchKey = (translationKey === 'quran-uthmani' || translationKey === 'ar') ? 'english_saheeh' : translationKey;
    
    const response = await axios.get<IQuranEncSurahResponse>(
      `${QURAN_ENC_BASE_URL}/translation/sura/${fetchKey}/${surahNumber}`
    );
    
    if (!response.data || !response.data.result || !Array.isArray(response.data.result)) {
      throw new Error(`Failed to fetch translations for Surah ${surahNumber} from QuranEnc`);
    }

    const isArabicOnly = translationKey === 'quran-uthmani' || translationKey === 'ar';

    const batch: ITranslation[] = response.data.result.map((item) => ({
      surah: Number(item.sura),
      ayah: Number(item.aya),
      lang: lang,
      edition: translationKey,
      arabicText: item.arabic_text,
      text: isArabicOnly ? item.arabic_text : item.translation,
      footnotes: isArabicOnly ? undefined : item.footnotes,
      version: 1, // Default version, can be updated from sync service
    }));

    // Bulk upsert into MongoDB using industry standard bulkWrite
    await QuranServices.upsertTranslations(batch);
    
    console.log(`Successfully ingested ${batch.length} ayahs for Surah ${surahNumber} (${translationKey})`);
  } catch (error) {
    console.error(`Failed to ingest Surah ${surahNumber}:`, error);
    throw error;
  }
}

/**
 * Sync all surahs for a specific edition proactively
 * @param translationKey 
 * @param lang 
 */
export async function syncLanguage(translationKey: string, lang: string) {
  for (let surah = 1; surah <= 114; surah++) {
    await ingestSurahTranslations(surah, translationKey, lang);
    // Be kind to the external API
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}
