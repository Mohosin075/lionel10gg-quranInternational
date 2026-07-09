import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { QuranServices } from '../src/app/modules/quran/quran.service';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function testYusufAli() {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to DB');

    console.log('Fetching Surah 1 with Yusuf Ali translation (qcom:22)...');
    const result = await QuranServices.getSurahDetail(1, 'qcom:22', 'en');
    console.log('Edition:', result.edition);
    console.log('First verse audio URL:', result.ayahs[0].audio);
    console.log('First verse text:', result.ayahs[0].text);
    console.log('First verse translation:', result.ayahs[0].translation);

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testYusufAli();
