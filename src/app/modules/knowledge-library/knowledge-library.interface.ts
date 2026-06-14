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
  version: number;
  isActive: boolean;
}
