"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeFatwa = void 0;
const mongoose_1 = require("mongoose");
const KnowledgeFatwaSchema = new mongoose_1.Schema({
    fatwaId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true }, // HTML formatted text
    scholar: { type: String },
    lang: { type: String, required: true, default: 'de' },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true });
KnowledgeFatwaSchema.index({ fatwaId: 1, lang: 1 }, { unique: true });
KnowledgeFatwaSchema.index({ isActive: 1 });
KnowledgeFatwaSchema.index({ version: 1, lang: 1 });
exports.KnowledgeFatwa = (0, mongoose_1.model)('KnowledgeFatwa', KnowledgeFatwaSchema);
