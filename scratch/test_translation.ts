import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

import { KnowledgeLibraryServices } from '../src/app/modules/knowledge-library/knowledge-library.service';

async function testTranslation() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    return;
  }

  try {
    console.log('Connecting to database...');
    await mongoose.connect(dbUrl);
    console.log('Connected!');

    // Let's call the service for English
    console.log('\n--- Testing English Translation ---');
    console.log('Fetching first page of English articles (this will trigger translation)...');
    const enResult = await KnowledgeLibraryServices.getAllArticles('en', undefined, 1, 3);
    console.log(`Successfully fetched ${enResult.data.length} English articles.`);
    enResult.data.forEach((art: any, idx: number) => {
      console.log(`[En Article #${idx+1}] ID: ${art.articleId}, Title: ${art.title}, Category: ${art.category}`);
    });

    // Let's call the service for Bengali
    console.log('\n--- Testing Bengali Translation ---');
    console.log('Fetching first page of Bengali articles...');
    const bnResult = await KnowledgeLibraryServices.getAllArticles('bn', undefined, 1, 3);
    console.log(`Successfully fetched ${bnResult.data.length} Bengali articles.`);
    bnResult.data.forEach((art: any, idx: number) => {
      console.log(`[Bn Article #${idx+1}] ID: ${art.articleId}, Title: ${art.title}, Category: ${art.category}`);
    });

  } catch (error) {
    console.error('Translation test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

testTranslation();
