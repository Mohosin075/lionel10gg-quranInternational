"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HighlightValidations = void 0;
const zod_1 = require("zod");
const createHighlightSchema = zod_1.z.object({
    body: zod_1.z.object({
        surahNumber: zod_1.z.number({ required_error: 'Surah number is required' }),
        ayahNumber: zod_1.z.number({ required_error: 'Ayah number is required' }),
        color: zod_1.z.string({ required_error: 'Color is required' }).regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color code'),
        text: zod_1.z.string().optional(),
    }),
});
exports.HighlightValidations = {
    createHighlightSchema,
};
