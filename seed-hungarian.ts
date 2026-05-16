import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Translation, Language } from './src/app/modules/quran/quran.model';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function seedHungarian() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to database.');

    const translationKey = 'hun_drahmedabdelrah_la';
    const langCode = 'hu';

    // 1. Update or create the Language entry
    console.log('Updating Language document...');
    await Language.findOneAndUpdate(
      { key: translationKey },
      {
        key: translationKey,
        name: 'Hungarian (Dr. Ahmed Abdel Rahman)',
        language: langCode,
        iso: langCode,
        full_language_name: 'Hungarian',
        author: 'Dr. Ahmed Abdel Rahman Okfat Tashaab',
        source: 'local',
        isSynced: true,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    console.log('Language document updated.');

    // 2. Read the JSON file
    console.log('Reading hungarian_quran.json...');
    const dataPath = path.join(process.cwd(), 'hungarian_quran.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const jsonData = JSON.parse(rawData);

    if (!jsonData.quran || !Array.isArray(jsonData.quran)) {
      throw new Error('Invalid JSON format: missing "quran" array');
    }

    const ayahs = jsonData.quran;
    console.log(`Found ${ayahs.length} ayahs.`);

    // 3. Format and chunk for bulk insert
    console.log('Formatting data for bulk insert...');
    const batchSize = 1000;
    let operations = [];

    for (let i = 0; i < ayahs.length; i++) {
      const ayah = ayahs[i];
      
      const doc = {
        surah: ayah.chapter,
        ayah: ayah.verse,
        lang: langCode,
        edition: translationKey,
        text: ayah.text,
        version: 1,
      };

      operations.push({
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
      });

      if (operations.length === batchSize || i === ayahs.length - 1) {
        console.log(`Inserting batch of ${operations.length} records...`);
        await Translation.bulkWrite(operations);
        operations = []; // reset for next batch
      }
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding Hungarian data:', error);
  } finally {
    console.log('Disconnecting from database...');
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedHungarian();
