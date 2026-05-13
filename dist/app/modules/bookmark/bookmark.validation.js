"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarkValidations = void 0;
const zod_1 = require("zod");
const createBookmarkSchema = zod_1.z.object({
    body: zod_1.z.object({
        surahNumber: zod_1.z.number({ required_error: 'Surah number is required' }),
        ayahNumber: zod_1.z.number({ required_error: 'Ayah number is required' }),
        text: zod_1.z.string().optional(),
        translation: zod_1.z.string().optional(),
        editionIdentifier: zod_1.z.string().optional(),
    }),
});
exports.BookmarkValidations = {
    createBookmarkSchema,
};
