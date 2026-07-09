import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { SheikhContent } from './src/app/modules/sheikh-content/sheikh-content.model';
import { extractYoutubeIds } from './src/app/modules/sheikh-content/sheikh-content.service';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

const demoSheikhContent = [
  {
    speakerName: 'Abu Alia',
    type: 'video' as const,
    title: 'Die Bedeutung der Absicht (Niyyah) im Islam',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeId: '',
    playlistId: '',
    isActive: true
  },
  {
    speakerName: 'Abu Alia',
    type: 'video' as const,
    title: 'Wie reinige ich mein Herz? - Sheikh Abu Alia',
    url: 'https://youtu.be/9bZkp7q19f0',
    youtubeId: '',
    playlistId: '',
    isActive: true
  },
  {
    speakerName: 'Abu Alia',
    type: 'audio_travel' as const,
    title: 'Reise-Audio: Das Aqidah-Gedicht Al-Haiyyah (Einleitung)',
    url: 'https://d1.islamhouse.com/data/de/ih_sounds/chain/das-aqidah-gedicht-al-haiyyah/de-01-das-aqidah-gedicht-al-haiyyah.mp3',
    isActive: true
  },
  {
    speakerName: 'Abu Alia',
    type: 'audio_travel' as const,
    title: 'Reise-Audio: Das Aqidah-Gedicht Al-Haiyyah (Vers 2 - 3)',
    url: 'https://d1.islamhouse.com/data/de/ih_sounds/chain/das-aqidah-gedicht-al-haiyyah/de-02-das-aqidah-gedicht-al-haiyyah.mp3',
    isActive: true
  }
];

async function seedSheikhContent() {
  try {
    console.log('🚀 Starting Sheikh Content seeding...');
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Connected to database');

    console.log('Clearing existing sheikh content...');
    await SheikhContent.deleteMany({});

    console.log('Seeding sheikh content items...');
    for (const item of demoSheikhContent) {
      if (item.type === 'video') {
        const { youtubeId, playlistId } = extractYoutubeIds(item.url);
        item.youtubeId = youtubeId || '';
        item.playlistId = playlistId || '';
      }
      await SheikhContent.create(item);
    }

    console.log('🎉 Seeding successfully completed!');
  } catch (error) {
    console.error('❌ Error seeding sheikh content:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
}

seedSheikhContent();
