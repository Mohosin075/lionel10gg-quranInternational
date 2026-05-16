import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { Translation, Language } from './src/app/modules/quran/quran.model';
import { QuranServices } from './src/app/modules/quran/quran.service';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function testHungarian() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(DATABASE_URL);
    
    // 1. Check if Hungarian is in the languages list
    console.log('\n--- Checking Languages ---');
    const languages = await Language.find({ language: 'hu' });
    console.log('Hungarian Language entries found:', languages.map(l => ({ name: l.name, key: l.key, source: l.source })));

    // 2. Fetch Surah Al-Fatihah (Surah 1) in Hungarian using QuranServices
    console.log('\n--- Fetching Surah 1 (Al-Fatihah) in Hungarian ---');
    const surah1 = await QuranServices.getSurahDetail(1, 'hun_drahmedabdelrah_la');
    
    console.log(`Surah Name: ${surah1.name} (${surah1.englishNameTranslation})`);
    console.log(`Edition Used: ${surah1.edition}`);
    console.log(`Total Ayahs returned: ${surah1.ayahs.length}`);
    
    if (surah1.ayahs.length > 0) {
      console.log('\nFirst 3 Ayahs:');
      for (let i = 0; i < Math.min(3, surah1.ayahs.length); i++) {
        console.log(`[${surah1.ayahs[i].number}] ${surah1.ayahs[i].translation}`);
      }
    }

  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testHungarian();
