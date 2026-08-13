"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBook = void 0;
const mongoose_1 = require("mongoose");
const KnowledgeBookSchema = new mongoose_1.Schema({
    bookId: { type: String, required: true },
    title: { type: String, required: true },
    author: { type: String },
    content: { type: String, required: true }, // Rich Text HTML/Formatted string
    lang: { type: String, required: true, default: 'de' },
    source: { type: String, enum: ['islamhouse', 'manual'], required: true, default: 'manual' },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true });
KnowledgeBookSchema.index({ bookId: 1, lang: 1 }, { unique: true });
KnowledgeBookSchema.index({ version: 1, lang: 1 });
exports.KnowledgeBook = (0, mongoose_1.model)('KnowledgeBook', KnowledgeBookSchema);
