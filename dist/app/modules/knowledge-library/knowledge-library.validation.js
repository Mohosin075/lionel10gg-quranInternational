"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeLibraryValidations = void 0;
const zod_1 = require("zod");
const createArticleZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        articleId: zod_1.z.string({ required_error: 'articleId is required' }),
        slug: zod_1.z.string({ required_error: 'slug is required' }),
        title: zod_1.z.string({ required_error: 'title is required' }),
        content: zod_1.z.string({ required_error: 'content is required' }),
        category: zod_1.z.string({ required_error: 'category is required' }),
        readTime: zod_1.z.number({ required_error: 'readTime is required' }),
        imageUrl: zod_1.z.string().optional(),
        audioUrl: zod_1.z.string().optional(),
        lang: zod_1.z.string().optional(),
        source: zod_1.z.enum(['islamhouse', 'manual']).optional(),
        version: zod_1.z.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const updateArticleZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        articleId: zod_1.z.string().optional(),
        slug: zod_1.z.string().optional(),
        title: zod_1.z.string().optional(),
        content: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        readTime: zod_1.z.number().optional(),
        imageUrl: zod_1.z.string().optional(),
        audioUrl: zod_1.z.string().optional(),
        lang: zod_1.z.string().optional(),
        source: zod_1.z.enum(['islamhouse', 'manual']).optional(),
        version: zod_1.z.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const createBookZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        bookId: zod_1.z.string({ required_error: 'bookId is required' }),
        title: zod_1.z.string({ required_error: 'title is required' }),
        author: zod_1.z.string().optional(),
        content: zod_1.z.string({ required_error: 'content is required' }),
        lang: zod_1.z.string().optional(),
        source: zod_1.z.enum(['islamhouse', 'manual']).optional(),
        version: zod_1.z.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const updateBookZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        bookId: zod_1.z.string().optional(),
        title: zod_1.z.string().optional(),
        author: zod_1.z.string().optional(),
        content: zod_1.z.string().optional(),
        lang: zod_1.z.string().optional(),
        source: zod_1.z.enum(['islamhouse', 'manual']).optional(),
        version: zod_1.z.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const createFatwaZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        fatwaId: zod_1.z.string({ required_error: 'fatwaId is required' }),
        question: zod_1.z.string({ required_error: 'question is required' }),
        answer: zod_1.z.string({ required_error: 'answer is required' }),
        scholar: zod_1.z.string().optional(),
        lang: zod_1.z.string().optional(),
        version: zod_1.z.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const updateFatwaZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        fatwaId: zod_1.z.string().optional(),
        question: zod_1.z.string().optional(),
        answer: zod_1.z.string().optional(),
        scholar: zod_1.z.string().optional(),
        lang: zod_1.z.string().optional(),
        version: zod_1.z.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.KnowledgeLibraryValidations = {
    createArticleZodSchema,
    updateArticleZodSchema,
    createBookZodSchema,
    updateBookZodSchema,
    createFatwaZodSchema,
    updateFatwaZodSchema,
};
