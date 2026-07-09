export interface IKnowledgeArticle {
  articleId: string;
  slug: string;
  title: string;
  content: string;
  category: string;
  readTime: number;
  imageUrl?: string;
  audioUrl?: string;
  lang: string;
  source: 'islamhouse' | 'manual';
  version: number;
  isActive: boolean;
}
