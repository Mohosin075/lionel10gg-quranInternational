"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LastRead = void 0;
const mongoose_1 = require("mongoose");
const LastReadSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    surahNumber: { type: Number, required: true },
    ayahNumber: { type: Number, required: true },
    editionIdentifier: { type: String, default: 'en.sahih' },
}, { timestamps: true });
LastReadSchema.index({ user: 1 }, { unique: true }); // Only one last read record per user
exports.LastRead = (0, mongoose_1.model)('LastRead', LastReadSchema);
