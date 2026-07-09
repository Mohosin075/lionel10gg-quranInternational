import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { SheikhContentServices } from '../src/app/modules/sheikh-content/sheikh-content.service';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function testSpeakers() {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to DB');

    console.log('\n=============================================');
    console.log('Testing: Abu Alia YouTube Channel (Live Ingest)');
    console.log('=============================================');
    const resAlia = await SheikhContentServices.getSpeakerContent('Abu Alia');
    console.log(`Speaker: ${resAlia.speakerName}`);
    console.log(`Total Videos returned: ${resAlia.videos.length}`);
    resAlia.videos.slice(0, 5).forEach((v: any, index: number) => {
      console.log(`\nVideo #${index + 1}:`);
      console.log(`  Title   : ${v.title}`);
      console.log(`  URL     : ${v.url}`);
      console.log(`  Video ID: ${v.youtubeId}`);
    });

    console.log('\n=============================================');
    console.log('Testing: Abul Baraa YouTube Channel (Live Ingest)');
    console.log('=============================================');
    const resBaraa = await SheikhContentServices.getSpeakerContent('Abul Baraa');
    console.log(`Speaker: ${resBaraa.speakerName}`);
    console.log(`Total Videos returned: ${resBaraa.videos.length}`);
    resBaraa.videos.slice(0, 5).forEach((v: any, index: number) => {
      console.log(`\nVideo #${index + 1}:`);
      console.log(`  Title   : ${v.title}`);
      console.log(`  URL     : ${v.url}`);
      console.log(`  Video ID: ${v.youtubeId}`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testSpeakers();
