"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchJob = void 0;
const mongoose_1 = require("mongoose");
const BatchJobSchema = new mongoose_1.Schema({
    batchId: { type: String, required: true, unique: true },
    fileId: { type: String, required: true },
    module: { type: String, required: true },
    targetLang: { type: String, required: true },
    status: {
        type: String,
        required: true,
        enum: ['in_progress', 'completed', 'failed', 'cancelled', 'processed'],
        default: 'in_progress',
    },
    recordCount: { type: Number, required: true, default: 0 },
    processedCount: { type: Number, required: true, default: 0 },
    outputFileId: { type: String },
    errorFileId: { type: String },
}, { timestamps: true });
BatchJobSchema.index({ module: 1, targetLang: 1 });
BatchJobSchema.index({ status: 1 });
exports.BatchJob = (0, mongoose_1.model)('BatchJob', BatchJobSchema);
