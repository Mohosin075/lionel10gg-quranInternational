"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tafsir = void 0;
const mongoose_1 = require("mongoose");
const TafsirSchema = new mongoose_1.Schema({
    surah: { type: Number, required: true },
    ayah: { type: Number, required: true },
    lang: { type: String, required: true },
    edition: { type: String, required: true },
    text: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
}, { timestamps: true });
TafsirSchema.index({ surah: 1, ayah: 1, lang: 1, edition: 1 }, { unique: true });
exports.Tafsir = (0, mongoose_1.model)('Tafsir', TafsirSchema);
