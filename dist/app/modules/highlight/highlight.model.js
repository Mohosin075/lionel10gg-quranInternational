"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Highlight = void 0;
const mongoose_1 = require("mongoose");
const HighlightSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    surahNumber: { type: Number, required: true },
    ayahNumber: { type: Number, required: true },
    color: { type: String, required: true },
    text: { type: String },
}, { timestamps: true });
HighlightSchema.index({ user: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });
exports.Highlight = (0, mongoose_1.model)('Highlight', HighlightSchema);
