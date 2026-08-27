import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Hadith } from './src/app/modules/hadith/hadith.model';
import { HadithServices } from './src/app/modules/hadith/hadith.service';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not defined in .env!");
  process.exit(1);
}

const books = [
  { edition: 'eng-bukhari', limit: 100 },
  { edition: 'eng-muslim', limit: 100 },
  { edition: 'eng-abudawud', limit: 50 },
  { edition: 'eng-tirmidhi', limit: 50 },
  { edition: 'eng-nasai', limit: 50 },
  { edition: 'eng-ibnmajah', limit: 50 },
];

async function run() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(dbUrl!);
    console.log("Connected successfully!");

    console.log("Wiping existing Hadiths collection...");
    await Hadith.deleteMany({});
    console.log("Wiped Hadiths collection.");

    for (const book of books) {
      console.log(`Syncing ${book.edition} (1 to ${book.limit})...`);
      const syncResult = await HadithServices.syncFromGlobalApi(book.edition, 1, book.limit);
      console.log(`Synced ${book.edition}: created ${syncResult.createdCount}, updated ${syncResult.updatedCount}`);
    }

    console.log("Starting translation of all seeded Hadiths to Bengali ('bn')...");
    const bnResults = await HadithServices.getOrSyncHadithsByLanguage('bn');
    console.log(`Successfully translated and seeded ${bnResults.length} Hadiths to Bengali!`);

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

run();
