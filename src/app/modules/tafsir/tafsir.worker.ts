import axios from 'axios';
import { ITafsir } from './tafsir.interface';
import { Tafsir } from './tafsir.model';
import { IQuranEncSurahResponse } from '../quran/quran.interface';

const QURAN_ENC_BASE_URL = 'https://quranenc.com/api/v1';

export async function ingestSurahTafsir(surahNumber: number, edition: string = 'arabic_moyassar', lang: string = 'ar') {
  try {
    console.log(`Starting Tafsir ingestion for Surah ${surahNumber}, Edition: ${edition}, Lang: ${lang}`);
    
    // We fetch the authentic Arabic At-Tafsir Al-Muyassar from QuranEnc
    const response = await axios.get<IQuranEncSurahResponse>(
      `${QURAN_ENC_BASE_URL}/translation/sura/arabic_moyassar/${surahNumber}`
    );
    
    if (!response.data || !response.data.result || !Array.isArray(response.data.result)) {
      throw new Error(`Failed to fetch tafsir for Surah ${surahNumber} from QuranEnc`);
    }

    const rawTafsirs = response.data.result;

    const batch: ITafsir[] = rawTafsirs.map((item) => ({
      surah: Number(item.sura),
      ayah: Number(item.aya),
      lang: 'ar',
      edition: 'arabic_moyassar',
      text: item.translation,
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
      console.log(`Successfully ingested ${batch.length} authentic tafsir ayahs for Surah ${surahNumber}`);
    }
  } catch (error) {
    console.error(`Failed to ingest Tafsir for Surah ${surahNumber}:`, error);
    throw error;
  }
}

