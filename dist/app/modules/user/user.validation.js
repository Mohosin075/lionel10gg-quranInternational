"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUserInterestSchema = exports.updateUserSchema = void 0;
const zod_1 = require("zod");
const user_1 = require("../../../enum/user");
// ------------------ SUB-SCHEMAS ------------------
const addressSchema = zod_1.z.object({
    city: zod_1.z.string().optional(),
    postalCode: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    permanentAddress: zod_1.z.string().optional(),
    presentAddress: zod_1.z.string().optional(),
});
const pointSchema = zod_1.z.object({
    type: zod_1.z.literal('Point').default('Point'),
    coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]).optional(), // [longitude, latitude]
});
const settingsSchema = zod_1.z.object({
    pushNotification: zod_1.z.boolean().optional(),
    emailNotification: zod_1.z.boolean().optional(),
    locationService: zod_1.z.boolean().optional(),
});
// ------------------ UPDATE USER VALIDATION ------------------
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z.string().optional(),
        profile: zod_1.z.string().optional(),
        phone: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        specialties: zod_1.z.array(zod_1.z.string()).optional(),
        address: addressSchema.optional(),
        location: pointSchema.optional(),
        settings: settingsSchema.optional(),
        appId: zod_1.z.string().optional(),
        deviceToken: zod_1.z.string().optional(),
        dateOfBirth: zod_1.z.string().datetime().optional(),
        dietaryRestrictions: zod_1.z.array(zod_1.z.string()).optional(),
        interests: zod_1.z.array(zod_1.z.nativeEnum(user_1.InterestCategory)).optional(),
    })
        .strict(),
});
exports.addUserInterestSchema = zod_1.z.object({
    body: zod_1.z.object({
        interest: zod_1.z.array(zod_1.z.nativeEnum(user_1.InterestCategory)).optional(),
    }),
});
