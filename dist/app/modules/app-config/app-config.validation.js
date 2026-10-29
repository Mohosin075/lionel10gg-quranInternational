"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfigSchema = void 0;
const zod_1 = require("zod");
exports.appConfigSchema = zod_1.z.object({
    banners: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().min(1).max(128), title: zod_1.z.string().max(300),
        imageUrl: zod_1.z.string().max(2048), actionUrl: zod_1.z.string().max(2048).optional(),
        isActive: zod_1.z.boolean(), order: zod_1.z.number().int().optional(),
    })).max(30).optional(),
    maintenanceMode: zod_1.z.object({ isEnabled: zod_1.z.boolean().optional(), message: zod_1.z.string().max(2000).optional(),
        minAppVersion: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/).optional() }).optional(),
    dailyReminder: zod_1.z.object({ isEnabled: zod_1.z.boolean().optional(), message: zod_1.z.string().max(1000).optional(),
        time: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional() }).optional(),
    featureFlags: zod_1.z.object({ premiumEnabled: zod_1.z.boolean().optional(), audioStreamingEnabled: zod_1.z.boolean().optional(), aiChatEnabled: zod_1.z.boolean().optional() }).optional(),
}).strict();
