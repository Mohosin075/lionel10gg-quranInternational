import axios from 'axios';
import { ITranslation, IQuranEncSurahResponse, IQuranComChapterResponse } from './quran.interface';
import { QuranServices } from './quran.service';
import { Language } from './quran.model';

const QURAN_ENC_BASE_URL = 'https://quranenc.com/api/v1';
const QURAN_COM_BASE_URL = 'https://api.quran.com/api/v4';

/**
 * ETL Pipeline to ingest data from QuranEnc or Quran.com into MongoDB
 * @param surahNumber 
 * @param translationKey (e.g., 'english_saheeh' or 'qcom:85')
 * @param lang 
 */
export async function ingestSurahTranslations(surahNumber: number, translationKey: string, lang?: string) {
  try {
    console.log(`Starting ingestion for Surah ${surahNumber}, Key: ${translationKey}`);
    
    // If lang is not provided, try to find it from Language model
    let targetLang = lang;
    if (!targetLang || targetLang === 'en') {
      const langInfo = await Language.findOne({ key: translationKey });
      if (langInfo) {
        targetLang = langInfo.language;
      } else {
        targetLang = targetLang || 'en';
      }
    }

    let batch: ITranslation[] = [];

    if (translationKey.startsWith('qcom:')) {
      const translationId = translationKey.split(':')[1];
      
      // Fetch from Quran.com - using per_page=300 to get all verses of any surah in one call
      const response = await axios.get<IQuranComChapterResponse>(
        `${QURAN_COM_BASE_URL}/verses/by_chapter/${surahNumber}?translations=${translationId}&fields=text_uthmani&per_page=300`
      );

      if (!response.data || !response.data.verses || !Array.isArray(response.data.verses)) {
        throw new Error(`Failed to fetch translations for Surah ${surahNumber} from Quran.com`);
      }

      batch = response.data.verses.map((verse) => ({
        surah: surahNumber,
        ayah: verse.verse_number, 
        lang: targetLang!,
        edition: translationKey,
        arabicText: verse.text_uthmani,
        text: verse.translations[0]?.text || '',
        footnotes: undefined,
        version: 1,
      }));
    } else {
      // Default to QuranEnc
      const fetchKey = (translationKey === 'quran-uthmani' || translationKey === 'ar') ? 'english_saheeh' : translationKey;
      
      const response = await axios.get<IQuranEncSurahResponse>(
        `${QURAN_ENC_BASE_URL}/translation/sura/${fetchKey}/${surahNumber}`
      );
      
      if (!response.data || !response.data.result || !Array.isArray(response.data.result)) {
        throw new Error(`Failed to fetch translations for Surah ${surahNumber} from QuranEnc`);
      }

      const isArabicOnly = translationKey === 'quran-uthmani' || translationKey === 'ar';

      batch = response.data.result.map((item) => ({
        surah: Number(item.sura),
        ayah: Number(item.aya),
        lang: targetLang!,
        edition: translationKey,
        arabicText: item.arabic_text,
        text: isArabicOnly ? item.arabic_text : item.translation,
        footnotes: isArabicOnly ? undefined : item.footnotes,
        version: 1,
      }));
    }

    // Bulk upsert into MongoDB
    if (batch.length > 0) {
      await QuranServices.upsertTranslations(batch);
      console.log(`Successfully ingested ${batch.length} ayahs for Surah ${surahNumber} (${translationKey})`);
    }
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
export async function syncLanguage(translationKey: string, lang?: string) {
  console.log(`Starting full sync for language: ${translationKey}`);
  for (let surah = 1; surah <= 114; surah++) {
    await ingestSurahTranslations(surah, translationKey, lang);
    // Be kind to the external API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Mark as synced
  await Language.updateOne(
    { key: translationKey },
    { isSynced: true, lastSyncedAt: new Date() }
  );
  console.log(`Full sync completed for language: ${translationKey}`);
}

/**
 * Sync all available languages
 */
export async function syncAllLanguages() {
  const languages = await Language.find({ isSynced: false });
  console.log(`Starting sync for ${languages.length} languages`);
  
  for (const lang of languages) {
    try {
      await syncLanguage(lang.key, lang.language);
    } catch (error) {
      console.error(`Failed to sync language ${lang.key}:`, error);
      // Continue with next language
    }
  }
}
