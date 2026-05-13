"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LastReadValidations = void 0;
const zod_1 = require("zod");
const updateLastReadSchema = zod_1.z.object({
    body: zod_1.z.object({
        surahNumber: zod_1.z.coerce.number({
            required_error: 'Surah number is required',
        }),
        ayahNumber: zod_1.z.coerce.number({
            required_error: 'Ayah number is required',
        }),
        editionIdentifier: zod_1.z.string().optional(),
    }),
});
exports.LastReadValidations = {
    updateLastReadSchema,
};
