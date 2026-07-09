import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { KnowledgeArticle } from '../src/app/modules/knowledge-library/knowledge-library.model';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function updateSources() {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Connected to database');

    const result = await KnowledgeArticle.updateMany(
      { source: { $exists: false } },
      { $set: { source: 'manual' } }
    );

    console.log(`Updated ${result.modifiedCount} articles to source 'manual'.`);
  } catch (error) {
    console.error('Error updating articles:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

updateSources();
