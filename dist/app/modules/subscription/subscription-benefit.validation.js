"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionBenefitValidations = void 0;
const zod_1 = require("zod");
const createBenefitZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        serialNumber: zod_1.z.number({ required_error: 'Serial number is required' }),
        text: zod_1.z.string({ required_error: 'Feature text is required' }),
        defaultLanguage: zod_1.z
            .string()
            .regex(/^[a-z]{2,3}(-[a-zA-Z]+)?$/)
            .optional(),
        translations: zod_1.z
            .record(zod_1.z.string().regex(/^[a-z]{2,3}(-[a-zA-Z]+)?$/), zod_1.z.string().min(1).max(2000))
            .optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const updateBenefitZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        serialNumber: zod_1.z.number().optional(),
        text: zod_1.z.string().optional(),
        defaultLanguage: zod_1.z
            .string()
            .regex(/^[a-z]{2,3}(-[a-zA-Z]+)?$/)
            .optional(),
        translations: zod_1.z
            .record(zod_1.z.string().regex(/^[a-z]{2,3}(-[a-zA-Z]+)?$/), zod_1.z.string().min(1).max(2000))
            .optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.SubscriptionBenefitValidations = {
    createBenefitZodSchema,
    updateBenefitZodSchema,
};
