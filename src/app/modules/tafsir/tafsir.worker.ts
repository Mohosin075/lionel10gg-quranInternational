import axios from 'axios';
import { ITafsir } from './tafsir.interface';
import { Tafsir } from './tafsir.model';
import { IQuranEncSurahResponse } from '../quran/quran.interface';

const QURAN_ENC_BASE_URL = 'https://quranenc.com/api/v1';

export async function ingestSurahTafsir(surahNumber: number, edition: string, lang: string) {
  try {
    console.log(`Starting Tafsir ingestion for Surah ${surahNumber}, Edition: ${edition}`);
    
    const response = await axios.get<IQuranEncSurahResponse>(
      `${QURAN_ENC_BASE_URL}/translation/sura/${edition}/${surahNumber}`
    );
    
    if (!response.data || !response.data.result || !Array.isArray(response.data.result)) {
      throw new Error(`Failed to fetch tafsir for Surah ${surahNumber} from QuranEnc`);
    }

    const batch: ITafsir[] = response.data.result.map((item) => ({
      surah: Number(item.sura),
      ayah: Number(item.aya),
      lang: lang,
      edition: edition,
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
      console.log(`Successfully ingested ${batch.length} tafsir ayahs for Surah ${surahNumber} (${edition})`);
    }
  } catch (error) {
    console.error(`Failed to ingest Tafsir for Surah ${surahNumber}:`, error);
    throw error;
  }
}
