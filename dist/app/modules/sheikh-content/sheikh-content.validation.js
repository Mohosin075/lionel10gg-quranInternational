"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheikhContentValidations = void 0;
const zod_1 = require("zod");
const createSheikhContentZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        speakerName: zod_1.z.string({ required_error: 'Speaker name is required' }),
        type: zod_1.z.enum(['video', 'audio_travel'], { required_error: 'Type must be video or audio_travel' }),
        title: zod_1.z.string({ required_error: 'Title is required' }),
        url: zod_1.z.string({ required_error: 'URL is required' }).url('Invalid URL format'),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const updateSheikhContentZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        speakerName: zod_1.z.string().optional(),
        type: zod_1.z.enum(['video', 'audio_travel']).optional(),
        title: zod_1.z.string().optional(),
        url: zod_1.z.string().url('Invalid URL format').optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.SheikhContentValidations = {
    createSheikhContentZodSchema,
    updateSheikhContentZodSchema,
};
