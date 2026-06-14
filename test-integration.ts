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
    // 1. HADITH INTEGRATION TESTING (GLOBAL API SYNC)
    // ==========================================
    console.log('--- Hadith Integration Tests (Global API) ---');
    
    // Clear previous test records
    await Hadith.deleteMany({ hadithNo: { $regex: '^bukhari_test' } });
    await Hadith.deleteMany({ lang: 'de', hadithNo: { $regex: '^bukhari_test' } });

    console.log('Fetching and caching Hadith 1 and 2 from Sahih al-Bukhari using Global API...');
    // Sync bukhari hadiths 1 to 2
    const syncRes = await HadithServices.syncFromGlobalApi('eng-bukhari', 1, 2);
    console.log('Global API Sync Result:', syncRes);

    // Verify they are saved
    const savedHadiths = await Hadith.find({ lang: 'en', hadithNo: { $in: ['bukhari_1', 'bukhari_2'] } });
    console.log(`Saved English Hadiths count: ${savedHadiths.length}`);
    if (savedHadiths.length > 0) {
      console.log('Hadith 1 English:', {
        hadithNo: savedHadiths[0].hadithNo,
        source: savedHadiths[0].source,
        chapter: savedHadiths[0].chapter,
        translationPreview: savedHadiths[0].translation.substring(0, 100) + '...',
        arabicPreview: savedHadiths[0].arabicText.substring(0, 100) + '...',
      });
    }

    // Test dynamic translation of fetched global Hadiths to German (de)
    console.log('\nTesting dynamic translation of fetched global Hadiths to German...');
    const translatedHadiths = await HadithServices.getOrSyncHadithsByLanguage('de');
    const deHadith1 = translatedHadiths.find(h => h.hadithNo === 'bukhari_1');
    console.log('Translated German Hadith 1:', {
      hadithNo: deHadith1?.hadithNo,
      source: deHadith1?.source,
      chapter: deHadith1?.chapter,
      translationPreview: deHadith1?.translation.substring(0, 100) + '...',
      category: deHadith1?.category,
    });

    // Test Hadith sync version check
    const syncStatus = await HadithServices.checkSyncMetadata('en', 0);
    console.log('\nHadith Sync Status Check (Client version 0):', syncStatus);

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

    // Clean up test data (We keep the fetched bukhari hadiths for visual proof of database seed, but delete translated ones so next run can test translation again)
    await Hadith.deleteMany({ lang: 'de', hadithNo: { $in: ['bukhari_1', 'bukhari_2'] } });
    await KnowledgeArticle.deleteMany({ articleId: 'test_art_999' });
    console.log('Test clean up completed.');

  } catch (error) {
    console.error('Integration Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

testIntegration();
