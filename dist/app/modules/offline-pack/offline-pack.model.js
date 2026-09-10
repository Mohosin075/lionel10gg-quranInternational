"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflinePack = void 0;
const mongoose_1 = require("mongoose");
const OfflinePackSchema = new mongoose_1.Schema({
    module: { type: String, required: true },
    lang: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    sha256: { type: String, required: true },
    packSizeMb: { type: Number, required: true },
    s3Key: { type: String, required: true },
    recordCount: { type: Number, required: true, default: 0 },
    generatedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });
// One pack metadata record per module+lang (latest version only)
OfflinePackSchema.index({ module: 1, lang: 1 }, { unique: true });
exports.OfflinePack = (0, mongoose_1.model)('OfflinePack', OfflinePackSchema);
