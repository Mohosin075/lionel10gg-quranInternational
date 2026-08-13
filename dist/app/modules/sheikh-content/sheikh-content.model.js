"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheikhContent = void 0;
const mongoose_1 = require("mongoose");
const SheikhContentSchema = new mongoose_1.Schema({
    speakerName: { type: String, required: true }, // e.g. 'Abu Alia'
    type: { type: String, enum: ['video', 'audio_travel'], required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    youtubeId: { type: String }, // Parsed Youtube video ID
    playlistId: { type: String }, // Parsed Youtube playlist ID
    channelHandle: { type: String }, // Parsed Youtube channel handle (e.g. @abu_alia)
    isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true });
SheikhContentSchema.index({ speakerName: 1, type: 1 });
SheikhContentSchema.index({ isActive: 1 });
exports.SheikhContent = (0, mongoose_1.model)('SheikhContent', SheikhContentSchema);
