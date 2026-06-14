import { Schema, model } from 'mongoose';
import { IKnowledgeArticle } from './knowledge-library.interface';

const KnowledgeArticleSchema = new Schema<IKnowledgeArticle>(
  {
    articleId: { type: String, required: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true }, // Rich Text HTML/Formatted string
    category: { type: String, required: true }, // One of the 10 main categories
    readTime: { type: Number, required: true, default: 3 },
    imageUrl: { type: String },
    audioUrl: { type: String },
    lang: { type: String, required: true, default: 'de' }, // Initial content in German
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

// Optimize query patterns for dashboard search, category list, and offline syncing
KnowledgeArticleSchema.index({ articleId: 1, lang: 1 }, { unique: true });
KnowledgeArticleSchema.index({ category: 1, lang: 1 });
KnowledgeArticleSchema.index({ version: 1, lang: 1 });

export const KnowledgeArticle = model<IKnowledgeArticle>(
  'KnowledgeArticle',
  KnowledgeArticleSchema
);
