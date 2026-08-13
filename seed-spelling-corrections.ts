import mongoose from 'mongoose';
import config from './src/config';
import { Translation } from './src/app/modules/quran/quran.model';
import { KnowledgeArticle } from './src/app/modules/knowledge-library/knowledge-library.model';
import { KnowledgeBook } from './src/app/modules/knowledge-library/knowledge-book.model';
import { KnowledgeFatwa } from './src/app/modules/knowledge-library/knowledge-fatwa.model';
import { SheikhContent } from './src/app/modules/sheikh-content/sheikh-content.model';

const spellingReplacements = [
  { search: /Koran/g, replace: 'Quran' },
  { search: /koran/g, replace: 'quran' },
  { search: /Milchschwestern/g, replace: 'Milchschwester' },
  { search: /milchschwestern/g, replace: 'milchschwester' },
  { search: /konyv/g, replace: 'könyv' },
  { search: /Konyv/g, replace: 'Könyv' },
];

const applyReplacements = (text: string): string => {
  if (!text) return text;
  let updated = text;
  for (const r of spellingReplacements) {
    updated = updated.replace(r.search, r.replace);
  }
  return updated;
};

async function seedSpellingCorrections() {
  try {
    console.log('🚀 Starting spelling corrections script...');
    console.log('📊 Connecting to database...');
    await mongoose.connect(config.database_url as string);
    console.log('✅ Connected to database');

    // 1. Correct spelling in Quran Translation Collection
    console.log('Checking Translation collection...');
    const translations = await Translation.find({
      $or: [
        { text: /Koran|koran|Milchschwestern|milchschwestern|konyv/i },
        { footnotes: /Koran|koran|Milchschwestern|milchschwestern|konyv/i }
      ]
    });
    console.log(`Found ${translations.length} translations with spelling errors.`);
    let transCount = 0;
    for (const t of translations) {
      const originalText = t.text;
      const originalFootnotes = t.footnotes || '';
      t.text = applyReplacements(t.text);
      if (t.footnotes) {
        t.footnotes = applyReplacements(t.footnotes);
      }
      if (originalText !== t.text || originalFootnotes !== t.footnotes) {
        await t.save();
        transCount++;
      }
    }
    console.log(`✅ Corrected ${transCount} translations.`);

    // 2. Correct spelling in KnowledgeArticle Collection
    console.log('Checking KnowledgeArticle collection...');
    const articles = await KnowledgeArticle.find({
      $or: [
        { title: /Koran|koran|Milchschwestern|milchschwestern|konyv/i },
        { content: /Koran|koran|Milchschwestern|milchschwestern|konyv/i },
        { category: /Koran|koran|Milchschwestern|milchschwestern|konyv/i }
      ]
    });
    console.log(`Found ${articles.length} articles with spelling errors.`);
    let articleCount = 0;
    for (const a of articles) {
      a.title = applyReplacements(a.title);
      a.content = applyReplacements(a.content);
      a.category = applyReplacements(a.category);
      await a.save();
      articleCount++;
    }
    console.log(`✅ Corrected ${articleCount} articles.`);

    // 3. Correct spelling in KnowledgeBook Collection
    console.log('Checking KnowledgeBook collection...');
    const books = await KnowledgeBook.find({
      $or: [
        { title: /Koran|koran|Milchschwestern|milchschwestern|konyv/i },
        { content: /Koran|koran|Milchschwestern|milchschwestern|konyv/i }
      ]
    });
    console.log(`Found ${books.length} books with spelling errors.`);
    let bookCount = 0;
    for (const b of books) {
      b.title = applyReplacements(b.title);
      b.content = applyReplacements(b.content);
      await b.save();
      bookCount++;
    }
    console.log(`✅ Corrected ${bookCount} books.`);

    // 4. Correct spelling in KnowledgeFatwa Collection
    console.log('Checking KnowledgeFatwa collection...');
    const fatwas = await KnowledgeFatwa.find({
      $or: [
        { question: /Koran|koran|Milchschwestern|milchschwestern|konyv/i },
        { answer: /Koran|koran|Milchschwestern|milchschwestern|konyv/i }
      ]
    });
    console.log(`Found ${fatwas.length} fatwas with spelling errors.`);
    let fatwaCount = 0;
    for (const f of fatwas) {
      f.question = applyReplacements(f.question);
      f.answer = applyReplacements(f.answer);
      await f.save();
      fatwaCount++;
    }
    console.log(`✅ Corrected ${fatwaCount} fatwas.`);

    // 5. Clean up Rick Astley, Gangnam Style, and incorrect Abu Alia audios
    console.log('Cleaning up unwanted audios and music tracks...');
    const deletedMusic = await SheikhContent.deleteMany({
      $or: [
        { title: /Rick Astley|Gangnam Style|Never Gonna Give You Up/i },
        { url: /youtube\.com.*(rick|gangnam|never gonna)/i }
      ]
    });
    console.log(`✅ Removed ${deletedMusic.deletedCount} unwanted music tracks.`);

    const deletedAbuAliaAudios = await SheikhContent.deleteMany({
      speakerName: { $regex: /^Abu Alia$/i },
      type: 'audio_travel'
    });
    console.log(`✅ Removed ${deletedAbuAliaAudios.deletedCount} incorrect Abu Alia audios.`);

    console.log('🎉 Spelling corrections script completed successfully!');
  } catch (error) {
    console.error('❌ Error during spelling corrections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

seedSpellingCorrections();
