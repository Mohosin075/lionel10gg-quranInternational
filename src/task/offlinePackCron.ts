import cron from 'node-cron';
import { OfflinePackService, SupportedModule } from '../app/modules/offline-pack/offline-pack.service';
import { OfflinePack } from '../app/modules/offline-pack/offline-pack.model';
import { Hadith } from '../app/modules/hadith/hadith.model';
import { Dua } from '../app/modules/dua/dua.model';
import { KnowledgeArticle } from '../app/modules/knowledge-library/knowledge-library.model';
import { Translation } from '../app/modules/quran/quran.model';
import { Tafsir } from '../app/modules/tafsir/tafsir.model';
import { KnowledgeBook } from '../app/modules/knowledge-library/knowledge-book.model';
import { KnowledgeFatwa } from '../app/modules/knowledge-library/knowledge-fatwa.model';

const MODULES: SupportedModule[] = [
  'quran',
  'tafsir',
  'hadith',
  'dua',
  'knowledge',
  'book',
  'fatwa',
];

/**
 * Checks all modules and languages; rebuilds offline packs
 * if new content is present or if pack does not yet exist.
 */
export const runPackExporterWorker = async (): Promise<{
  generated: number;
  skipped: number;
  errors: number;
}> => {
  console.log('[PackExporterWorker] Starting automated offline pack audit & build...');
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const mod of MODULES) {
    try {
      // Find all distinct languages for this module
      let distinctLangs: string[] = [];
      switch (mod) {
        case 'hadith':
          distinctLangs = await Hadith.distinct('lang', { isActive: true });
          break;
        case 'dua':
          distinctLangs = await Dua.distinct('lang');
          break;
        case 'knowledge':
          distinctLangs = await KnowledgeArticle.distinct('lang');
          break;
        case 'quran':
          distinctLangs = await Translation.distinct('lang');
          break;
        case 'tafsir':
          distinctLangs = await Tafsir.distinct('lang');
          break;
        case 'book':
          distinctLangs = await KnowledgeBook.distinct('lang');
          break;
        case 'fatwa':
          distinctLangs = await KnowledgeFatwa.distinct('lang');
          break;
      }

      for (const lang of distinctLangs) {
        if (!lang) continue;
        try {
          // Check existing pack
          const pack = await OfflinePack.findOne({ module: mod, lang }).sort({ version: -1 });

          // Count current records in DB
          let currentCount = 0;
          switch (mod) {
            case 'hadith':
              currentCount = await Hadith.countDocuments({ lang, isActive: true });
              break;
            case 'dua':
              currentCount = await Dua.countDocuments({ lang });
              break;
            case 'knowledge':
              currentCount = await KnowledgeArticle.countDocuments({ lang });
              break;
            case 'quran':
              currentCount = await Translation.countDocuments({ lang });
              break;
            case 'tafsir':
              currentCount = await Tafsir.countDocuments({ lang });
              break;
            case 'book':
              currentCount = await KnowledgeBook.countDocuments({ lang });
              break;
            case 'fatwa':
              currentCount = await KnowledgeFatwa.countDocuments({ lang });
              break;
          }

          if (currentCount === 0) {
            skipped++;
            continue;
          }

          // Generate pack if it doesn't exist or record count changed
          if (!pack || pack.recordCount !== currentCount) {
            console.log(
              `[PackExporterWorker] Generating pack for ${mod}/${lang} (DB: ${currentCount} records, Pack: ${pack?.recordCount ?? 0})...`
            );
            await OfflinePackService.generateAndUploadPack(mod, lang);
            generated++;
          } else {
            skipped++;
          }
        } catch (packErr) {
          errors++;
          console.error(`[PackExporterWorker] Error generating pack for ${mod}/${lang}:`, packErr);
        }
      }
    } catch (modErr) {
      console.error(`[PackExporterWorker] Error auditing module ${mod}:`, modErr);
    }
  }

  console.log(
    `[PackExporterWorker] Completed. Generated: ${generated}, Skipped: ${skipped}, Errors: ${errors}`
  );
  return { generated, skipped, errors };
};

// Schedule to run daily at 4:00 AM (after 3:00 AM Dua synchronization)
cron.schedule('0 4 * * *', async () => {
  try {
    await runPackExporterWorker();
  } catch (err) {
    console.error('[PackExporterWorker] Cron run failed:', err);
  }
});
