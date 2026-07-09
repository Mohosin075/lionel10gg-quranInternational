import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Language } from '../src/app/modules/quran/quran.model';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function findYusufKey() {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to DB');

    const result = await Language.find({ name: { $regex: 'yusuf', $options: 'i' } }).lean();
    console.log(`Found ${result.length} matches:`);
    result.forEach((r: any) => {
      console.log(`Key: ${r.key}, Name: ${r.name}, Source: ${r.source}, Language: ${r.language}`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

findYusufKey();
