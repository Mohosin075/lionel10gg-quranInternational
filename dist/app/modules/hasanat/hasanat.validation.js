"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HasanatValidation = void 0;
const zod_1 = require("zod");
const collectHasanatZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        amount: zod_1.z.number({
            required_error: 'Amount is required',
        }).positive('Amount must be a positive number'),
    }),
});
exports.HasanatValidation = {
    collectHasanatZodSchema,
};
