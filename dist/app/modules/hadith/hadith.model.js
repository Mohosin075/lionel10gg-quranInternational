"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hadith = void 0;
const mongoose_1 = require("mongoose");
const HadithSchema = new mongoose_1.Schema({
    hadithNo: { type: String, required: true },
    source: { type: String, required: true },
    chapter: { type: String, required: true },
    arabicText: { type: String, required: true },
    translation: { type: String, required: true },
    authenticity: { type: String, required: true, default: 'Sahih' },
    category: { type: String, required: true },
    lang: { type: String, required: true, default: 'en' },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true });
// Optimize query patterns for front-end searches and sync endpoints
HadithSchema.index({ lang: 1, category: 1 });
HadithSchema.index({ hadithNo: 1, lang: 1 }, { unique: true });
HadithSchema.index({ version: 1, lang: 1 });
exports.Hadith = (0, mongoose_1.model)('Hadith', HadithSchema);
