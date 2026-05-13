"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bookmark = void 0;
const mongoose_1 = require("mongoose");
const BookmarkSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    surahNumber: { type: Number, required: true },
    ayahNumber: { type: Number, required: true },
    text: { type: String },
    translation: { type: String },
    editionIdentifier: { type: String, default: 'en.sahih' },
}, { timestamps: true });
// Ensuring unique bookmarks per user-ayah
BookmarkSchema.index({ user: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });
exports.Bookmark = (0, mongoose_1.model)('Bookmark', BookmarkSchema);
