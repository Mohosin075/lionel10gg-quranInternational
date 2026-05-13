"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Language = exports.Translation = void 0;
const mongoose_1 = require("mongoose");
const TranslationSchema = new mongoose_1.Schema({
    surah: { type: Number, required: true },
    ayah: { type: Number, required: true },
    lang: { type: String, required: true },
    edition: { type: String, required: true },
    arabicText: { type: String },
    text: { type: String, required: true },
    footnotes: { type: String },
    version: { type: Number, required: true, default: 1 },
}, { timestamps: true });
// Critical index for Translation
TranslationSchema.index({ surah: 1, ayah: 1, lang: 1, edition: 1 }, { unique: true });
// Text index for search
TranslationSchema.index({ text: 'text' });
exports.Translation = (0, mongoose_1.model)('Translation', TranslationSchema);
const LanguageSchema = new mongoose_1.Schema({
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    language: { type: String, required: true },
    iso: { type: String },
    full_language_name: { type: String },
    author: { type: String },
    source: { type: String, enum: ['quranenc', 'qurancom'], required: true },
    isSynced: { type: Boolean, default: false },
    lastSyncedAt: { type: Date },
}, { timestamps: true });
exports.Language = (0, mongoose_1.model)('Language', LanguageSchema);
