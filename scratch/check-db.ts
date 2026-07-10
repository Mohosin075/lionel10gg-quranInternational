import mongoose from 'mongoose';
import { Tafsir } from '../src/app/modules/tafsir/tafsir.model';
import dotenv from 'dotenv';

dotenv.config();

async function checkDb() {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    console.log('Connected.');
    const { TafsirService } = require('../src/app/modules/tafsir/tafsir.service');
    const { Tafsir } = require('../src/app/modules/tafsir/tafsir.model');

    console.log('Cleaning up Turkish Tafsirs from DB...');
    await Tafsir.deleteMany({ lang: 'tr' });

    const startTime = Date.now();
    console.log('Fetching Surah 2 Ayah 8 Tafsir for qcom:124 / tr (Turkish)...');
    const resultTr = await TafsirService.getTafsir(2, 8, 'qcom:124', 'tr');
    const elapsed = Date.now() - startTime;
    console.log(`Result Tafsir fetched in ${elapsed}ms:`, resultTr);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDb();
