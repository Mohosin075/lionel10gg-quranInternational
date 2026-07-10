import mongoose from 'mongoose';
import { Tafsir } from '../src/app/modules/tafsir/tafsir.model';
import dotenv from 'dotenv';

dotenv.config();

async function checkDb() {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    console.log('Connected.');
    const { Tafsir } = require('../src/app/modules/tafsir/tafsir.model');
    const { TafsirService } = require('../src/app/modules/tafsir/tafsir.service');

    console.log('Cleaning up non-Arabic Tafsirs from DB...');
    const deleteResult = await Tafsir.deleteMany({ lang: { $ne: 'ar' } });
    console.log(`Deleted ${deleteResult.deletedCount} non-Arabic Tafsirs.`);

    console.log('Fetching Surah 1 Tafsir for arabic_moyassar / bn (Bengali)...');
    const resultBn = await TafsirService.getSurahTafsir(1, 'arabic_moyassar', 'bn');
    console.log('Result BN count:', resultBn?.length);
    console.log('Sample Ayah 1 BN Tafsir text:', resultBn?.[0]?.text);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDb();
