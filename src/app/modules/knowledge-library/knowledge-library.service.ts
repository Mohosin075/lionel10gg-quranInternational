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

  // Ensure data exists for the requested language
  if (lang !== 'de') {
    const count = await KnowledgeArticle.countDocuments({ lang });
    if (count === 0) {
      await getOrSyncArticlesByLanguage(lang);
    }
  }

  const query: Record<string, unknown> = { lang, isActive: true };
  if (category) {
    query.category = category;
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
  return await KnowledgeArticle.find({
    lang,
    version: { $gt: fromVersion },
  })
    .sort({ createdAt: -1 })
    .lean();
};

// Automatic dynamic translation helper from German (de) to target language
const getOrSyncArticlesByLanguage = async (targetLang: string) => {
  const count = await KnowledgeArticle.countDocuments({ lang: targetLang });
  if (count > 0) {
    return await KnowledgeArticle.find({ lang: targetLang }).lean();
  }

  const baseArticles = await KnowledgeArticle.find({ lang: 'de' }).lean();
  if (baseArticles.length === 0) return [];

  console.log(`[KnowledgeService] Translating ${baseArticles.length} articles from German to: ${targetLang}...`);

  const results: IKnowledgeArticle[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < baseArticles.length; i += BATCH_SIZE) {
    const batch = baseArticles.slice(i, i + BATCH_SIZE);
    const translatedBatch: (IKnowledgeArticle | null)[] = [];

    for (const article of batch) {
      try {
        const translatedTitle = await TranslationHelper.translateText(article.title, targetLang, 'de');
        await TranslationHelper.sleep(200);
        const translatedContent = await TranslationHelper.translateText(article.content, targetLang, 'de');
        await TranslationHelper.sleep(200);
        const translatedCategory = await TranslationHelper.translateText(article.category, targetLang, 'de');

        translatedBatch.push({
          articleId: article.articleId,
          slug: `${article.slug}-${targetLang}`,
          title: translatedTitle,
          content: translatedContent,
          category: translatedCategory,
          readTime: article.readTime,
          imageUrl: article.imageUrl,
          audioUrl: article.audioUrl,
          lang: targetLang,
          version: 1,
          isActive: article.isActive,
        } as IKnowledgeArticle);
      } catch (err) {
        console.error(`Translation failed for Knowledge Article ${article.articleId}:`, err);
        translatedBatch.push(null);
      }
      await TranslationHelper.sleep(300);
    }

    const validArticles = translatedBatch.filter((a) => a !== null) as IKnowledgeArticle[];
    if (validArticles.length > 0) {
      await KnowledgeArticle.insertMany(validArticles);
      results.push(...validArticles);
    }
    console.log(`Translated ${i + validArticles.length} of ${baseArticles.length} articles`);
    if (i + BATCH_SIZE < baseArticles.length) {
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
