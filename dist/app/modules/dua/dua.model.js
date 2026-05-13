"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dua = void 0;
const mongoose_1 = require("mongoose");
const DuaSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    arabic: { type: String, required: true },
    translation: { type: String, required: true },
    transliteration: { type: String },
    category: { type: String, required: true },
    audio: { type: String },
    reference: { type: String },
    lang: { type: String, required: true, default: 'en' },
    version: { type: Number, required: true, default: 1 },
}, { timestamps: true });
DuaSchema.index({ lang: 1, category: 1 });
exports.Dua = (0, mongoose_1.model)('Dua', DuaSchema);
