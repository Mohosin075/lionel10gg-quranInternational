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

// Book Interface
export interface IKnowledgeBook {
  bookId: string;
  title: string;
  author?: string;
  content: string; // Rich Text HTML/Formatted string
  lang: string;
  source: 'islamhouse' | 'manual';
  version: number;
  isActive: boolean;
}

// Fatwa Interface
export interface IKnowledgeFatwa {
  fatwaId: string;
  question: string;
  answer: string; // HTML formatted text
  scholar?: string;
  lang: string;
  version: number;
  isActive: boolean;
}
