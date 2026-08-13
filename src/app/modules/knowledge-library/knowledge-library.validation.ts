import { z } from 'zod';

const createArticleZodSchema = z.object({
  body: z.object({
    articleId: z.string({ required_error: 'articleId is required' }),
    slug: z.string({ required_error: 'slug is required' }),
    title: z.string({ required_error: 'title is required' }),
    content: z.string({ required_error: 'content is required' }),
    category: z.string({ required_error: 'category is required' }),
    readTime: z.number({ required_error: 'readTime is required' }),
    imageUrl: z.string().optional(),
    audioUrl: z.string().optional(),
    lang: z.string().optional(),
    source: z.enum(['islamhouse', 'manual']).optional(),
    version: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateArticleZodSchema = z.object({
  body: z.object({
    articleId: z.string().optional(),
    slug: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    category: z.string().optional(),
    readTime: z.number().optional(),
    imageUrl: z.string().optional(),
    audioUrl: z.string().optional(),
    lang: z.string().optional(),
    source: z.enum(['islamhouse', 'manual']).optional(),
    version: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const createBookZodSchema = z.object({
  body: z.object({
    bookId: z.string({ required_error: 'bookId is required' }),
    title: z.string({ required_error: 'title is required' }),
    author: z.string().optional(),
    content: z.string({ required_error: 'content is required' }),
    lang: z.string().optional(),
    source: z.enum(['islamhouse', 'manual']).optional(),
    version: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateBookZodSchema = z.object({
  body: z.object({
    bookId: z.string().optional(),
    title: z.string().optional(),
    author: z.string().optional(),
    content: z.string().optional(),
    lang: z.string().optional(),
    source: z.enum(['islamhouse', 'manual']).optional(),
    version: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const createFatwaZodSchema = z.object({
  body: z.object({
    fatwaId: z.string({ required_error: 'fatwaId is required' }),
    question: z.string({ required_error: 'question is required' }),
    answer: z.string({ required_error: 'answer is required' }),
    scholar: z.string().optional(),
    lang: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateFatwaZodSchema = z.object({
  body: z.object({
    fatwaId: z.string().optional(),
    question: z.string().optional(),
    answer: z.string().optional(),
    scholar: z.string().optional(),
    lang: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const KnowledgeLibraryValidations = {
  createArticleZodSchema,
  updateArticleZodSchema,
  createBookZodSchema,
  updateBookZodSchema,
  createFatwaZodSchema,
  updateFatwaZodSchema,
};
