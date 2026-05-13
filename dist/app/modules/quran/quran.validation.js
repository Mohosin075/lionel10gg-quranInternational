"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuranValidations = void 0;
const zod_1 = require("zod");
const getSurahDetailValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        number: zod_1.z.string().regex(/^\d+$/, 'Surah number must be a digit'),
    }),
    query: zod_1.z.object({
        edition: zod_1.z.string().optional(),
        lang: zod_1.z.string().optional(),
    }),
});
const getAyahValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        surah: zod_1.z.string().regex(/^\d+$/, 'Surah number must be a digit'),
        ayah: zod_1.z.string().regex(/^\d+$/, 'Ayah number must be a digit'),
    }),
    query: zod_1.z.object({
        edition: zod_1.z.string().optional(),
        lang: zod_1.z.string().optional(),
    }),
});
const checkSyncValidationSchema = zod_1.z.object({
    query: zod_1.z.object({
        edition: zod_1.z.string({ required_error: 'Edition is required' }),
        version: zod_1.z.string().regex(/^\d+$/, 'Version must be a digit').optional(),
    }),
});
const downloadSyncValidationSchema = zod_1.z.object({
    query: zod_1.z.object({
        edition: zod_1.z.string({ required_error: 'Edition is required' }),
        fromVersion: zod_1.z.string().regex(/^\d+$/, 'fromVersion must be a digit').optional(),
    }),
});
exports.QuranValidations = {
    getSurahDetailValidationSchema,
    getAyahValidationSchema,
    checkSyncValidationSchema,
    downloadSyncValidationSchema,
};
