import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
const { PDFParse } = require('pdf-parse');
const WordExtractor = require('word-extractor');

dotenv.config();

// Connect to Database
const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/quran-international';

// Schemas & Models
const KnowledgeArticleSchema = new mongoose.Schema(
  {
    articleId: { type: String, required: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    readTime: { type: Number, required: true, default: 3 },
    imageUrl: { type: String },
    audioUrl: { type: String },
    lang: { type: String, required: true, default: 'de' },
    source: { type: String, enum: ['islamhouse', 'manual'], required: true, default: 'islamhouse' },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);
KnowledgeArticleSchema.index({ articleId: 1, lang: 1 }, { unique: true });
const KnowledgeArticle = mongoose.model('KnowledgeArticle', KnowledgeArticleSchema);

const KnowledgeBookSchema = new mongoose.Schema(
  {
    bookId: { type: String, required: true },
    title: { type: String, required: true },
    author: { type: String },
    content: { type: String, required: true },
    lang: { type: String, required: true, default: 'de' },
    source: { type: String, enum: ['islamhouse', 'manual'], required: true, default: 'islamhouse' },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);
KnowledgeBookSchema.index({ bookId: 1, lang: 1 }, { unique: true });
const KnowledgeBook = mongoose.model('KnowledgeBook', KnowledgeBookSchema);

const KnowledgeFatwaSchema = new mongoose.Schema(
  {
    fatwaId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    scholar: { type: String },
    lang: { type: String, required: true, default: 'de' },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);
KnowledgeFatwaSchema.index({ fatwaId: 1, lang: 1 }, { unique: true });
const KnowledgeFatwa = mongoose.model('KnowledgeFatwa', KnowledgeFatwaSchema);

// Keywords mapping helper for Categories
function determineCategory(filename: string, content: string): string {
  const normalized = `${filename} ${content.slice(0, 1000)}`.toLowerCase();
  
  if (/fasten|gebet|fastenvorschriften|wudu|tayamum|ghusl|zakaah|hajj|ramadan|sawum|pilgrimage|pray/.test(normalized)) {
    return 'Worship';
  }
  if (/ehemann|ehefrau|ehe\b|schliche|familie|kinder|marriage|polygamy|family|women|frauen/.test(normalized)) {
    return 'Family';
  }
  if (/ethik|morality|ethics|zunge|anger|humility|patience|gute|chlaq/.test(normalized)) {
    return 'Ethics';
  }
  if (/quran|sure|koran|rezitation|ayat|verse/.test(normalized)) {
    return 'Quran';
  }
  if (/hadith|sunnah|bukhari|muslim|ahadith/.test(normalized)) {
    return 'Hadith';
  }
  if (/schirk|aqida|glaube|monotheism|god|angels|hell|paradies|creationism|atheism|agnosticism|schöpfer|tot\b|jenseits/.test(normalized)) {
    return 'Belief';
  }
  if (/prophet|muhammad|jesus|maria|mary|moses|abraham|history|biographie|joseph|job|omar|uthman|abu_bakr|sahaba|geschichte/.test(normalized)) {
    return 'History';
  }
  if (/dawah|islam-verstehen|accepting_islam|converting_to_islam|introduction_to_islam|einladung|botschaft/.test(normalized)) {
    return 'Dawah';
  }
  if (/fiqh|recht|urteile|fatwa/.test(normalized)) {
    return 'Fiqh';
  }
  return 'Belief'; // Default
}

function cleanTitle(rawName: string): string {
  // Remove de_ and de- prefixes, extension, and replace dashes/underscores with spaces
  let name = rawName.replace(/^de[-_]/i, '').replace(/\.[^/.]+$/, '');
  name = name.replace(/[-_]/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Extractor setup
const extractor = new WordExtractor();

async function parseDoc(filePath: string): Promise<string> {
  try {
    const doc = await extractor.extract(filePath);
    return doc.getBody();
  } catch (err) {
    console.error(`Error parsing DOC/DOCX: ${filePath}`, err);
    return '';
  }
}

async function parsePdf(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfInstance = new PDFParse({ data: dataBuffer });
    const result = await pdfInstance.getText();
    return result.text || '';
  } catch (err) {
    console.error(`Error parsing PDF: ${filePath}`, err);
    return '';
  }
}

// Recursive file search helper
function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFilesRecursively(name, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.pdf', '.docx', '.doc'].includes(ext)) {
        fileList.push(name);
      }
    }
  }
  return fileList;
}

async function startSeeding() {
  try {
    console.log('🚀 Starting IslamHouse Knowledge Seeder...');
    console.log('🔗 Connecting to database...');
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB!');

    // Get files
    const libDir = path.join(process.cwd(), 'files/library');
    const folderDir = path.join(process.cwd(), 'files/folder');
    
    console.log('Searching for files...');
    const allFiles = [
      ...getFilesRecursively(libDir),
      ...getFilesRecursively(folderDir)
    ];
    
    // Filter duplicates by filename
    const uniqueFilesMap = new Map<string, string>();
    for (const f of allFiles) {
      uniqueFilesMap.set(path.basename(f), f);
    }
    const filesToProcess = Array.from(uniqueFilesMap.values());
    console.log(`🔍 Found ${allFiles.length} raw files. Processing ${filesToProcess.length} unique documents...`);

    let articleCount = 0;
    let bookCount = 0;
    let fatwaCount = 0;

    for (let i = 0; i < filesToProcess.length; i++) {
      const filePath = filesToProcess[i];
      const filename = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const stats = fs.statSync(filePath);

      console.log(`[${i + 1}/${filesToProcess.length}] Extracting: ${filename}...`);
      
      let text = '';
      if (ext === '.pdf') {
        text = await parsePdf(filePath);
      } else if (ext === '.docx' || ext === '.doc') {
        text = await parseDoc(filePath);
      }

      if (!text || text.trim().length < 50) {
        console.log(`⚠️ Empty or invalid content for: ${filename}. Skipping.`);
        continue;
      }

      // Formatting text as HTML paragraph structures
      const formattedContent = text
        .split(/\n\s*\n/)
        .map(p => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
        .join('\n');

      const title = cleanTitle(filename);
      const category = determineCategory(filename, text);

      // Determine Document Type (Book vs Fatwa vs Article)
      const isFatwa = /fatwa|urteile|urteil|frage/i.test(filename) || text.slice(0, 1000).includes('Frage:') || text.slice(0, 1000).includes('Antwort:');
      const isBook = stats.size > 800000 || text.length > 40000; // Over 800KB or 40k characters is considered a Book

      if (isBook) {
        // Seed as Book
        const bookId = `book-${slugify(title)}`;
        await KnowledgeBook.findOneAndUpdate(
          { bookId, lang: 'de' },
          {
            $set: {
              bookId,
              title,
              content: formattedContent,
              author: 'IslamHouse',
              lang: 'de',
              source: 'islamhouse',
              version: 1,
              isActive: true
            }
          },
          { upsert: true }
        );
        bookCount++;
      } else if (isFatwa) {
        // Seed as Fatwa
        const fatwaId = `fatwa-${slugify(title)}`;
        // Split Q&A if possible, or put whole text as answer and title as question
        let question = title;
        let answer = formattedContent;
        
        const qMatch = text.match(/Frage:([\s\S]+?)Antwort:/i);
        if (qMatch) {
          question = qMatch[1].trim();
          answer = text.slice(text.indexOf('Antwort:') + 8).trim();
          answer = answer
            .split(/\n\s*\n/)
            .map(p => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
            .join('\n');
        }

        await KnowledgeFatwa.findOneAndUpdate(
          { fatwaId, lang: 'de' },
          {
            $set: {
              fatwaId,
              question,
              answer,
              scholar: 'IslamHouse',
              lang: 'de',
              version: 1,
              isActive: true
            }
          },
          { upsert: true }
        );
        fatwaCount++;
      } else {
        // Seed as Article
        const articleId = `art-${slugify(title)}`;
        const slug = slugify(title);
        // Estimate read time (words / 200)
        const wordCount = text.split(/\s+/).length;
        const readTime = Math.max(Math.ceil(wordCount / 200), 2);

        await KnowledgeArticle.findOneAndUpdate(
          { articleId, lang: 'de' },
          {
            $set: {
              articleId,
              slug,
              title,
              content: formattedContent,
              category,
              readTime,
              lang: 'de',
              source: 'islamhouse',
              version: 1,
              isActive: true
            }
          },
          { upsert: true }
        );
        articleCount++;
      }
    }

    console.log('\n=========================================');
    console.log('🎉 Seeding completed successfully!');
    console.log(` - Seeding Articles: ${articleCount}`);
    console.log(` - Seeding Books: ${bookCount}`);
    console.log(` - Seeding Fatwas: ${fatwaCount}`);
    console.log('=========================================');
  } catch (err) {
    console.error('❌ Seeding failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

startSeeding();
