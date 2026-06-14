import axios from 'axios';
import { KnowledgeArticle } from './knowledge-library.model';
import { IKnowledgeArticle } from './knowledge-library.interface';

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
  // Increment version to trigger sync updates on offline clients
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

  // Fetch all base German articles
  let baseArticles = await KnowledgeArticle.find({ lang: 'de' }).lean();
  if (baseArticles.length === 0) {
    return [];
  }

  console.log(`Translating all Knowledge Articles from German to: ${targetLang}...`);

  const translateText = async (text: string, from: string, to: string): Promise<string> => {
    try {
      // Clean HTML tags if present, or translate as is. Standard translation gtx can handle HTML tags reasonably.
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await axios.get(url);
      let translated = '';
      if (res.data && res.data[0]) {
        for (const segment of res.data[0]) {
          translated += segment[0];
        }
      }
      return translated;
    } catch (error) {
      console.error('Knowledge Article translation API error:', error);
      return text;
    }
  };

  const results: IKnowledgeArticle[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < baseArticles.length; i += BATCH_SIZE) {
    const batch = baseArticles.slice(i, i + BATCH_SIZE);
    const translatedBatch: (IKnowledgeArticle | null)[] = [];

    for (const article of batch) {
      try {
        const translatedTitle = await translateText(article.title, 'de', targetLang);
        await new Promise((resolve) => setTimeout(resolve, 200));
        const translatedContent = await translateText(article.content, 'de', targetLang);
        await new Promise((resolve) => setTimeout(resolve, 200));
        const translatedCategory = await translateText(article.category, 'de', targetLang);

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
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const validArticles = translatedBatch.filter((a) => a !== null) as IKnowledgeArticle[];
    if (validArticles.length > 0) {
      await KnowledgeArticle.insertMany(validArticles);
      results.push(...validArticles);
    }
    console.log(`Translated ${i + validArticles.length} of ${baseArticles.length} articles`);
    if (i + BATCH_SIZE < baseArticles.length) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
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
