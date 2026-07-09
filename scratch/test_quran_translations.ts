import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { QuranServices } from '../src/app/modules/quran/quran.service';
import { Translation } from '../src/app/modules/quran/quran.model';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function testQuranTranslations() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Connected to database\n');

    // Clear previous tests for Surah 112 (Al-Ikhlas) to test ingestion from scratch
    console.log('Clearing existing database translations for Surah 112...');
    await Translation.deleteMany({ surah: 112 });

    // 1. Fetch Surah 112 (Al-Ikhlas) in German (Bubenheim Edition) -> Should fallback to Arabic recitation
    console.log('\n--- 1. Fetching Surah 112 (Al-Ikhlas) in German (Bubenheim Edition) ---');
    const gerResult = await QuranServices.getSurahDetail(112, 'german_bubenheim', 'de');
    console.log(`Surah: ${gerResult.name} (${gerResult.englishName})`);
    gerResult.ayahs.slice(0, 2).forEach((ayah: any) => {
      console.log(`Ayah ${ayah.number}:`);
      console.log(`  German: ${ayah.translation}`);
      console.log(`  Audio URL: ${ayah.audio}`);
    });

    // 2. Fetch Surah 112 in English (Saheeh International) -> Should use English voice translation
    console.log('\n--- 2. Fetching Surah 112 (Al-Ikhlas) in English (Saheeh International) ---');
    const engResult = await QuranServices.getSurahDetail(112, 'english_saheeh', 'en');
    console.log(`Surah: ${engResult.name} (${engResult.englishName})`);
    engResult.ayahs.slice(0, 2).forEach((ayah: any) => {
      console.log(`Ayah ${ayah.number}:`);
      console.log(`  English: ${ayah.translation}`);
      console.log(`  Audio URL: ${ayah.audio}`);
    });

    // 3. Fetch Surah 112 in Turkish -> Should fallback to Arabic recitation
    console.log('\n--- 3. Fetching Surah 112 (Al-Ikhlas) in Turkish ---');
    const turResult = await QuranServices.getSurahDetail(112, 'turkish_shaban', 'tr');
    console.log(`Surah: ${turResult.name} (${turResult.englishName})`);
    turResult.ayahs.slice(0, 2).forEach((ayah: any) => {
      console.log(`Ayah ${ayah.number}:`);
      console.log(`  Turkish: ${ayah.translation}`);
      console.log(`  Audio URL: ${ayah.audio}`);
    });

  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
    process.exit(0);
  }
}

testQuranTranslations();
