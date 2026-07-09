import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { KnowledgeArticle } from './src/app/modules/knowledge-library/knowledge-library.model';
import { KnowledgeLibraryServices } from './src/app/modules/knowledge-library/knowledge-library.service';
import { SheikhContent } from './src/app/modules/sheikh-content/sheikh-content.model';
import { SheikhContentServices, extractYoutubeIds } from './src/app/modules/sheikh-content/sheikh-content.service';
import { PremiumBenefit } from './src/app/modules/subscription/subscription-plan.model';
import { subscriptionService } from './src/app/modules/subscription/subscription.service';
import { PaymentServices } from './src/app/modules/payment/payment.service';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function testNewFeatures() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Connected to database\n');

    // ==========================================
    // 1. KNOWLEDGE LIBRARY - SOURCE TRACKING & MIDDLEWARE REMOVAL
    // ==========================================
    console.log('--- 1. Knowledge Library Source Tracking Test ---');
    // Clear and Create a test article
    await KnowledgeArticle.deleteMany({ articleId: 'test-art-source-999' });

    const newArt = await KnowledgeLibraryServices.createArticle({
      articleId: 'test-art-source-999',
      slug: 'testing-source-field',
      title: 'Testing Source Field',
      content: 'This is test content with source.',
      category: 'Test Category',
      readTime: 3,
      lang: 'de',
      source: 'islamhouse',
    });

    console.log('Created Article details:', {
      articleId: newArt.articleId,
      source: newArt.source, // should be 'islamhouse'
      lang: newArt.lang
    });

    if (newArt.source !== 'islamhouse') {
      throw new Error('Knowledge Library source field was not set/saved correctly');
    }
    console.log('✅ Knowledge Library source field verification passed!\n');

    // ==========================================
    // 2. SHEIKH CONTENT - YOUTUBE ID EXTRACT & DEDICATED WINDOW LOGIC
    // ==========================================
    console.log('--- 2. Sheikh Content URL Parsing & Grouped Retrieval Test ---');
    await SheikhContent.deleteMany({ speakerName: 'Test Sheikh' });

    // Test YouTube Video ID Extraction Helper
    const yt1 = extractYoutubeIds('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const yt2 = extractYoutubeIds('https://youtu.be/9bZkp7q19f0');
    const yt3 = extractYoutubeIds('https://youtube.com/playlist?list=PL45D998B5F9FF0E5E');
    const yt4 = extractYoutubeIds('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL45D998B5F9FF0E5E');
    const yt5 = extractYoutubeIds('https://www.youtube.com/@abu_alia');
    
    console.log('Parsed 1 (standard watch):', yt1);
    console.log('Parsed 2 (short link):', yt2);
    console.log('Parsed 3 (playlist only):', yt3);
    console.log('Parsed 4 (video + playlist):', yt4);
    console.log('Parsed 5 (channel handle):', yt5);

    if (
      yt1.youtubeId !== 'dQw4w9WgXcQ' ||
      yt2.youtubeId !== '9bZkp7q19f0' ||
      yt3.playlistId !== 'PL45D998B5F9FF0E5E' ||
      yt4.youtubeId !== 'dQw4w9WgXcQ' ||
      yt4.playlistId !== 'PL45D998B5F9FF0E5E' ||
      yt5.channelHandle !== '@abu_alia'
    ) {
      throw new Error('YouTube URL extraction logic failed!');
    }
    console.log('YouTube URL parser logic passed!');

    // Create Sheikh Content items
    const sheikhVideo = await SheikhContentServices.createContent({
      speakerName: 'Test Sheikh',
      type: 'video',
      title: 'Islamic Etiquettes',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      isActive: true
    });

    const sheikhAudio = await SheikhContentServices.createContent({
      speakerName: 'Test Sheikh',
      type: 'audio_travel',
      title: 'Sabr in Times of Calamity',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      isActive: true
    });

    console.log('Created Sheikh Video (youtubeId should be extracted):', sheikhVideo);
    console.log('Created Sheikh Audio (youtubeId should be undefined/empty):', sheikhAudio);

    if (sheikhVideo.youtubeId !== 'dQw4w9WgXcQ') {
      throw new Error('Sheikh Content creation failed to auto-extract youtubeId!');
    }

    // Test grouped retrieval
    console.log('Fetching grouped retrieval for Test Sheikh...');
    const grouped = await SheikhContentServices.getSpeakerContent('Test Sheikh');
    console.log('Grouped Speaker Content:', {
      speakerName: grouped.speakerName,
      videosCount: grouped.videos.length,
      audioTravelCount: grouped.audioTravel.length
    });

    if (grouped.videos.length !== 1 || grouped.audioTravel.length !== 1) {
      throw new Error('Sheikh Content grouped retrieval failed!');
    }
    console.log('✅ Sheikh Content tests passed!\n');

    // ==========================================
    // 3. PREMIUM BENEFITS - DYNAMIC 14 POINTS TEXT
    // ==========================================
    console.log('--- 3. Premium Benefits (Dynamic 14 points) Test ---');
    await PremiumBenefit.deleteMany({ text: 'Test Benefit' });

    const newBenefit = await subscriptionService.createPremiumBenefit({
      serialNumber: 15,
      text: 'Test Benefit',
      isActive: true
    });
    console.log('Created Premium Benefit:', newBenefit);

    const activeBenefits = await subscriptionService.getAllPremiumBenefits();
    console.log('Active premium benefits count:', activeBenefits.length);
    const testBenefitFound = activeBenefits.find(b => b.serialNumber === 15);
    console.log('Test Benefit found in active list:', testBenefitFound);

    if (!testBenefitFound) {
      throw new Error('Premium Benefit retrieval or sorting failed!');
    }
    console.log('✅ Premium Benefits verification passed!\n');

    // ==========================================
    // 4. ONE-TIME PAYMENT DEPRECATION
    // ==========================================
    console.log('--- 4. One-Time Payment Deprecation Test ---');
    try {
      console.log('Attempting to call deprecated createCheckoutSession for one-time payment...');
      await PaymentServices.createCheckoutSession({ email: 'test@user.com', authId: '123' }, { amount: 10 });
      throw new Error('Deprecated createCheckoutSession did not throw an error!');
    } catch (err: any) {
      console.log('Success: Expected error thrown for createCheckoutSession:', err.message);
      if (!err.message.includes('One-time payments are disabled')) {
        throw new Error('Deprecated createCheckoutSession threw wrong error: ' + err.message);
      }
    }

    try {
      console.log('Attempting to call deprecated createPaymentIntent...');
      await PaymentServices.createPaymentIntent({ email: 'test@user.com', authId: '123' }, { amount: 10 });
      throw new Error('Deprecated createPaymentIntent did not throw an error!');
    } catch (err: any) {
      console.log('Success: Expected error thrown for createPaymentIntent:', err.message);
      if (!err.message.includes('One-time payments are disabled')) {
        throw new Error('Deprecated createPaymentIntent threw wrong error: ' + err.message);
      }
    }
    console.log('✅ One-time payments deprecation test passed!\n');

    // Cleanup test data
    await KnowledgeArticle.deleteMany({ articleId: 'test-art-source-999' });
    await SheikhContent.deleteMany({ speakerName: 'Test Sheikh' });
    await PremiumBenefit.deleteMany({ serialNumber: 15 });
    console.log('🧹 Cleaned up test data.');
    console.log('\n🎉 ALL NEW FEATURES TESTED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
}

testNewFeatures();
