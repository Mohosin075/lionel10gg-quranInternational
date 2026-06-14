"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HadithValidations = void 0;
const zod_1 = require("zod");
const createHadithZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        hadithNo: zod_1.z.string({ required_error: 'hadithNo is required' }),
        source: zod_1.z.string({ required_error: 'source is required' }),
        chapter: zod_1.z.string({ required_error: 'chapter is required' }),
        arabicText: zod_1.z.string({ required_error: 'arabicText is required' }),
        translation: zod_1.z.string({ required_error: 'translation is required' }),
        authenticity: zod_1.z.string().optional(),
        category: zod_1.z.string({ required_error: 'category is required' }),
        lang: zod_1.z.string().optional(),
        version: zod_1.z.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const updateHadithZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        hadithNo: zod_1.z.string().optional(),
        source: zod_1.z.string().optional(),
        chapter: zod_1.z.string().optional(),
        arabicText: zod_1.z.string().optional(),
        translation: zod_1.z.string().optional(),
        authenticity: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        lang: zod_1.z.string().optional(),
        version: zod_1.z.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.HadithValidations = {
    createHadithZodSchema,
    updateHadithZodSchema,
};
