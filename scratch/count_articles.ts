import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { KnowledgeArticle } from '../src/app/modules/knowledge-library/knowledge-library.model';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

async function countArticles() {
  try {
    await mongoose.connect(DATABASE_URL);
    const count = await KnowledgeArticle.countDocuments({});
    console.log(`\n=========================================`);
    console.log(`Total Articles in Database: ${count}`);
    console.log(`=========================================\n`);
    
    // Also, print count by language
    const langs = await KnowledgeArticle.aggregate([
      { $group: { _id: '$lang', count: { $sum: 1 } } }
    ]);
    console.log('Breakdown by language:');
    langs.forEach((l: any) => {
      console.log(`- ${l._id}: ${l.count} articles`);
    });
    
    // Check if there are any articles matching manual or islamhouse
    const sources = await KnowledgeArticle.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    console.log('\nBreakdown by source:');
    sources.forEach((s: any) => {
      console.log(`- ${s._id || 'undefined'}: ${s.count} articles`);
    });
    
  } catch (error) {
    console.error('Error counting articles:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

countArticles();
