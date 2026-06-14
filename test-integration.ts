import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { Hadith } from './src/app/modules/hadith/hadith.model';
import { HadithServices } from './src/app/modules/hadith/hadith.service';
import { KnowledgeArticle } from './src/app/modules/knowledge-library/knowledge-library.model';
import { KnowledgeLibraryServices } from './src/app/modules/knowledge-library/knowledge-library.service';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function testIntegration() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(DATABASE_URL);
    console.log('Database connected successfully.\n');

    // ==========================================
    // 1. HADITH INTEGRATION TESTING
    // ==========================================
    console.log('--- Hadith Integration Tests ---');
    
    // Clear previous test records
    await Hadith.deleteMany({ hadithNo: 'test_999' });

    // Seed English Hadith
    console.log('Seeding test English Hadith...');
    const englishHadith = await HadithServices.createHadith({
      hadithNo: 'test_999',
      source: 'Sahih al-Bukhari',
      chapter: 'Book of Revelation',
      arabicText: 'إنما الأعمال بالنيات',
      translation: 'Actions are judged by intentions.',
      authenticity: 'Sahih',
      category: 'Intentions',
      lang: 'en',
      version: 1,
      isActive: true,
    });
    console.log('English Hadith seeded:', englishHadith._id);

    // Test dynamic translation (translate test Hadith to German)
    console.log('Testing dynamic translation to German...');
    const translatedHadith = await HadithServices.getOrSyncHadithsByLanguage('de');
    const deTestHadith = translatedHadith.find(h => h.hadithNo === 'test_999');
    console.log('Translated German Hadith:', deTestHadith);

    // Test Hadith sync version check
    const syncStatus = await HadithServices.checkSyncMetadata('en', 0);
    console.log('Hadith Sync Status Check (Client version 0):', syncStatus);

    // Test Hadith sync data retrieval
    const syncData = await HadithServices.getSyncData('en', 0);
    console.log('Sync data items count:', syncData.length);

    console.log('Hadith tests completed successfully.\n');

    // ==========================================
    // 2. KNOWLEDGE LIBRARY INTEGRATION TESTING
    // ==========================================
    console.log('--- Knowledge Library Integration Tests ---');

    // Clear previous test records
    await KnowledgeArticle.deleteMany({ articleId: 'test_art_999' });

    // Seed German Knowledge Article
    console.log('Seeding test German Knowledge Article...');
    const germanArticle = await KnowledgeLibraryServices.createArticle({
      articleId: 'test_art_999',
      slug: 'die-kraft-des-gebets',
      title: 'Die Kraft des Gebets',
      content: '<p>Das Gebet verändert das Leben eines Muslims grundlegend.</p>',
      category: 'Gute Taten & spirituelles Wachstum',
      readTime: 5,
      lang: 'de',
      version: 1,
      isActive: true,
    });
    console.log('German Article seeded:', germanArticle._id);

    // Test dynamic translation from German to English
    console.log('Testing dynamic translation to English...');
    const translatedArticles = await KnowledgeLibraryServices.getOrSyncArticlesByLanguage('en');
    const enTestArticle = translatedArticles.find(a => a.articleId === 'test_art_999');
    console.log('Translated English Article:', enTestArticle);

    // Test Knowledge sync version check
    const articleSyncStatus = await KnowledgeLibraryServices.checkSyncMetadata('de', 0);
    console.log('Knowledge Sync Status Check (Client version 0):', articleSyncStatus);

    // Test Knowledge sync data retrieval
    const articleSyncData = await KnowledgeLibraryServices.getSyncData('de', 0);
    console.log('Article sync items count:', articleSyncData.length);

    console.log('Knowledge Library tests completed successfully.\n');

    // Clean up test data
    await Hadith.deleteMany({ hadithNo: 'test_999' });
    await KnowledgeArticle.deleteMany({ articleId: 'test_art_999' });
    console.log('Test data cleaned up successfully.');

  } catch (error) {
    console.error('Integration Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

testIntegration();
