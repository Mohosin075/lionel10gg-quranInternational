import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { PremiumBenefit } from './src/app/modules/subscription/subscription-plan.model';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

const defaultBenefits = [
  { serialNumber: 1, text: 'Unlock 400+ articles in German, Turkish, and English', isActive: true },
  { serialNumber: 2, text: 'Access Islamic Tafsir (exegesis) for all Surahs in 100+ languages', isActive: true },
  { serialNumber: 3, text: 'Hasanat Counter System to track your spiritual rewards', isActive: true },
  { serialNumber: 4, text: 'Golden Month: Enjoy a 1-month completely free trial', isActive: true },
  { serialNumber: 5, text: 'Dedicated video and audio contents from Sheikh Abu Alia', isActive: true },
  { serialNumber: 6, text: 'Seamless YouTube player integration for streaming lessons', isActive: true },
  { serialNumber: 7, text: 'Offline Quran audio playback for all 114 Surahs', isActive: true },
  { serialNumber: 8, text: 'Unlimited bookmarks to save and resume your favorite verses', isActive: true },
  { serialNumber: 9, text: 'Interactive highlight tools with custom colors for study', isActive: true },
  { serialNumber: 10, text: 'Location-based precise prayer times calculations', isActive: true },
  { serialNumber: 11, text: 'Choose from 5 premium Adhan notification sounds', isActive: true },
  { serialNumber: 12, text: 'Comprehensive collection of daily Duas and Supplications', isActive: true },
  { serialNumber: 13, text: 'Unlimited access to Tafsir lightbulb quick insights', isActive: true },
  { serialNumber: 14, text: 'Exclusive early access to newly translated Quran versions', isActive: true }
];

async function seedPremiumBenefits() {
  try {
    console.log('🚀 Starting Premium Benefits seeding...');
    console.log(`Resource: ${DATABASE_URL.split('@')[1] || DATABASE_URL}`);
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Connected to database');

    console.log('Clearing existing premium benefits...');
    await PremiumBenefit.deleteMany({});

    console.log('Seeding 14 premium benefits...');
    await PremiumBenefit.insertMany(defaultBenefits);

    console.log('🎉 Seeding successfully completed!');
  } catch (error) {
    console.error('❌ Error seeding premium benefits:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
}

seedPremiumBenefits();
