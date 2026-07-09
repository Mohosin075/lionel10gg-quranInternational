import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { KnowledgeArticle } from './src/app/modules/knowledge-library/knowledge-library.model';
const pdf = require('pdf-parse');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;
const API_KEY = 'paV29H2gm56kvLP';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove non-word characters
    .replace(/[\s_]+/g, '-') // replace spaces with -
    .replace(/^-+|-+$/g, ''); // trim dashes
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function seedIslamHouseArticles() {
  try {
    console.log('🚀 Starting IslamHouse Official API Article Syncer...');
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Connected to database\n');

    const totalPages = 16; // 398 items total, 25 items per page = 16 pages
    const limit = 25;
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let page = 1; page <= totalPages; page++) {
      const url = `https://api3.islamhouse.com/v3/${API_KEY}/main/articles/de/de/${page}/${limit}/json`;
      console.log(`\n=========================================`);
      console.log(`📖 FETCHING PAGE ${page} OF ${totalPages}...`);
      console.log(`URL: ${url}`);
      console.log(`=========================================`);

      let response;
      try {
        response = await axios.get(url, { timeout: 15000 });
      } catch (err: any) {
        console.error(`❌ Failed to fetch page ${page}: ${err.message}`);
        continue;
      }

      const articles = response.data.data;
      if (!articles || articles.length === 0) {
        console.log('No articles found on this page.');
        continue;
      }

      console.log(`Found ${articles.length} articles on Page ${page}. Processing...`);

      for (const item of articles) {
        const articleId = `islamhouse-${item.id}`;
        
        // Check if already synced
        const existing = await KnowledgeArticle.findOne({ articleId, lang: 'de' });
        if (existing) {
          skippedCount++;
          console.log(`- [SKIP] "${item.title.substring(0, 40)}..." (Already exists)`);
          continue;
        }

        console.log(`\n- [SYNCING] "${item.title}"`);
        
        let contentText = item.description || '';
        const attachment = item.attachments && item.attachments.find((att: any) => att.extension_type === 'PDF');
        
        if (attachment) {
          console.log(`  Downloading PDF: ${attachment.url} (${attachment.size})...`);
          try {
            const pdfRes = await axios.get(attachment.url, { responseType: 'arraybuffer', timeout: 25000 });
            const uint8Array = new Uint8Array(pdfRes.data);
            
            console.log('  Parsing PDF content...');
            const parserInstance = new pdf.PDFParse(uint8Array);
            await parserInstance.load();
            const result = await parserInstance.getText();
            
            const parsedText = result.text ? result.text.replace(/-- \d+ of \d+ --/g, '').trim() : '';
            if (parsedText.length > 100) {
              // Convert text formatting slightly for HTML rendering
              contentText = parsedText
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, ' ')
                .trim();
              contentText = `<p>${contentText}</p>`;
              console.log(`  Successfully extracted ${parsedText.length} characters.`);
            } else {
              console.log('  PDF contains little/no text (possibly scanned). Using description.');
            }
          } catch (pdfErr: any) {
            console.warn(`  ⚠️ Failed to parse PDF: ${pdfErr.message}. Using description instead.`);
          }
        } else {
          console.log('  No PDF attachment found. Using description.');
        }

        // Clean up content to be formatted HTML
        if (!contentText.startsWith('<p>')) {
          contentText = `<p>${contentText.replace(/\n/g, '<br/>')}</p>`;
        }

        // Determine category
        let category = 'Allgemeines Wissen';
        if (item.prepared_by && item.prepared_by.length > 0) {
          category = item.prepared_by[0].title || 'Allgemeines Wissen';
        }

        const articleDoc = {
          articleId,
          slug: `${generateSlug(item.title)}-${item.id}`,
          title: item.title,
          content: contentText,
          category,
          readTime: Math.max(1, Math.ceil(contentText.replace(/<[^>]*>/g, '').split(' ').length / 200)),
          imageUrl: item.image || undefined,
          lang: 'de',
          source: 'islamhouse' as const,
          version: 1,
          isActive: true
        };

        try {
          await KnowledgeArticle.create(articleDoc);
          syncedCount++;
          console.log(`  ✅ Successfully saved: ${articleId}`);
        } catch (saveErr: any) {
          errorCount++;
          console.error(`  ❌ Failed to save article to DB: ${saveErr.message}`);
        }

        // Sleep for 300ms to be polite to the IslamHouse server
        await sleep(300);
      }
    }

    console.log(`\n=========================================`);
    console.log(`🎉 IMPORT COMPLETED SUMMARY:`);
    console.log(`- Total synced: ${syncedCount}`);
    console.log(`- Total skipped (already existed): ${skippedCount}`);
    console.log(`- Total errors: ${errorCount}`);
    console.log(`=========================================\n`);

  } catch (error) {
    console.error('❌ Sync script execution failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
}

seedIslamHouseArticles();
