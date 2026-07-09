import { KnowledgeArticle } from './knowledge-library.model';
import { IKnowledgeArticle } from './knowledge-library.interface';
import { TranslationHelper } from '../../../helpers/translationHelper';

const getAllArticles = async (
  lang: string = 'de', // Default to German per spec
  category?: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  // Ensure data exists and is up to date for the requested language
  if (lang !== 'de') {
    await getOrSyncArticlesByLanguage(lang);
  }

  const query: Record<string, any> = { lang, isActive: true };
  if (category) {
    const categoryRegex = new RegExp(category.trim(), 'i');
    
    // Check if category matches any base German articles to fetch by articleId
    const baseArticles = await KnowledgeArticle.find({
      lang: 'de',
      category: { $regex: categoryRegex }
    }).select('articleId').lean();

    if (baseArticles.length > 0) {
      const articleIds = baseArticles.map(a => a.articleId);
      query.$or = [
        { category: { $regex: categoryRegex } },
        { articleId: { $in: articleIds } }
      ];
    } else {
      query.category = { $regex: categoryRegex };
    }
  }

  const [data, total] = await Promise.all([
    KnowledgeArticle.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
    KnowledgeArticle.countDocuments(query),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data,
  };
};

const getArticleById = async (id: string) => {
  return await KnowledgeArticle.findById(id).lean();
};

const createArticle = async (payload: Partial<IKnowledgeArticle>) => {
  return await KnowledgeArticle.create(payload);
};

const updateArticle = async (id: string, payload: Partial<IKnowledgeArticle>) => {
  const current = await KnowledgeArticle.findById(id);
  const newVersion = current ? (current.version || 1) + 1 : 1;
  return await KnowledgeArticle.findByIdAndUpdate(
    id,
    { ...payload, version: newVersion },
    { new: true },
  );
};

const deleteArticle = async (id: string) => {
  return await KnowledgeArticle.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

const getVersion = async (lang: string = 'de') => {
  if (lang !== 'de') {
    await getOrSyncArticlesByLanguage(lang);
  }
  const latest = await KnowledgeArticle.findOne({ lang })
    .sort({ version: -1 })
    .select('version');
  return latest?.version || 1;
};

const checkSyncMetadata = async (lang: string = 'de', clientVersion: number) => {
  const serverVersion = await getVersion(lang);
  return {
    updateAvailable: serverVersion > clientVersion,
    serverVersion,
    clientVersion,
    lang,
  };
};

const getSyncData = async (lang: string = 'de', fromVersion: number = 0) => {
  if (lang !== 'de') {
    await getOrSyncArticlesByLanguage(lang);
  }
  return await KnowledgeArticle.find({
    lang,
    version: { $gt: fromVersion },
  })
    .sort({ createdAt: -1 })
    .lean();
};

// Automatic dynamic translation helper from German (de) to target language
const getOrSyncArticlesByLanguage = async (targetLang: string) => {
  const baseArticles = await KnowledgeArticle.find({ lang: 'de', isActive: true }).lean();
  if (baseArticles.length === 0) return [];

  console.log(`[KnowledgeService] Checking/translating articles from German to: ${targetLang}...`);

  const results: IKnowledgeArticle[] = [];
  
  // Find all existing translated articles for targetLang
  const existingArticles = await KnowledgeArticle.find({ lang: targetLang }).lean();
  const existingMap = new Map(existingArticles.map(a => [a.articleId, a]));

  const articlesToTranslate: IKnowledgeArticle[] = [];
  for (const base of baseArticles) {
    const existing = existingMap.get(base.articleId);
    if (!existing || existing.version < base.version) {
      articlesToTranslate.push(base as unknown as IKnowledgeArticle);
    } else {
      results.push(existing as unknown as IKnowledgeArticle);
    }
  }

  if (articlesToTranslate.length === 0) {
    return results;
  }

  console.log(`[KnowledgeService] Translating ${articlesToTranslate.length} out-of-date/new articles to: ${targetLang}...`);
  const BATCH_SIZE = 5;

  for (let i = 0; i < articlesToTranslate.length; i += BATCH_SIZE) {
    const batch = articlesToTranslate.slice(i, i + BATCH_SIZE);
    
    for (const article of batch) {
      try {
        const translatedTitle = await TranslationHelper.translateText(article.title, targetLang, 'de');
        await TranslationHelper.sleep(200);
        const translatedContent = await TranslationHelper.translateText(article.content, targetLang, 'de');
        await TranslationHelper.sleep(200);
        const translatedCategory = await TranslationHelper.translateText(article.category, targetLang, 'de');

        const translatedDoc = {
          articleId: article.articleId,
          slug: `${article.slug}-${targetLang}`,
          title: translatedTitle,
          content: translatedContent,
          category: translatedCategory,
          readTime: article.readTime,
          imageUrl: article.imageUrl,
          audioUrl: article.audioUrl,
          lang: targetLang,
          source: article.source || 'manual',
          version: article.version, // Keep version aligned with German base
          isActive: article.isActive,
        };

        const updated = await KnowledgeArticle.findOneAndUpdate(
          { articleId: article.articleId, lang: targetLang },
          { $set: translatedDoc },
          { upsert: true, new: true }
        ).lean();

        if (updated) {
          results.push(updated as unknown as IKnowledgeArticle);
        }
      } catch (err) {
        console.error(`Translation failed for Knowledge Article ${article.articleId} to ${targetLang}:`, err);
      }
      await TranslationHelper.sleep(300);
    }
    
    console.log(`Translated ${Math.min(i + BATCH_SIZE, articlesToTranslate.length)} of ${articlesToTranslate.length} articles`);
    if (i + BATCH_SIZE < articlesToTranslate.length) {
      await TranslationHelper.sleep(1500);
    }
  }

  return results;
};

export const KnowledgeLibraryServices = {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  getVersion,
  checkSyncMetadata,
  getSyncData,
  getOrSyncArticlesByLanguage,
};
