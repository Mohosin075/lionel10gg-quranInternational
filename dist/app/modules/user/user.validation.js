'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.addUserInterestSchema =
  exports.createStaffSchema =
  exports.STAFF_SPECIALTY =
  exports.updateUserSchema =
    void 0
const zod_1 = require('zod')
const user_1 = require('../../../enum/user')
// ------------------ SUB-SCHEMAS ------------------
const addressSchema = zod_1.z.object({
  city: zod_1.z.string().optional(),
  postalCode: zod_1.z.string().optional(),
  country: zod_1.z.string().optional(),
  permanentAddress: zod_1.z.string().optional(),
  presentAddress: zod_1.z.string().optional(),
})
const pointSchema = zod_1.z.object({
  type: zod_1.z.literal('Point').default('Point'),
  coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]).optional(), // [longitude, latitude]
})
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
      appId: zod_1.z.string().optional(),
      deviceToken: zod_1.z.string().optional(),
      dateOfBirth: zod_1.z.string().datetime().optional(),
      dietaryRestrictions: zod_1.z.array(zod_1.z.string()).optional(),
      interests: zod_1.z
        .array(zod_1.z.nativeEnum(user_1.InterestCategory))
        .optional(),
    })
    .strict(),
})
exports.STAFF_SPECIALTY = zod_1.z.enum([
  'Cleaning',
  'Cooking',
  'Laundry',
  'Grocery',
  'Maintenance',
])
exports.createStaffSchema = zod_1.z.object({
  body: zod_1.z.object({
    name: zod_1.z.string({ required_error: 'Name is required' }),
    email: zod_1.z.string().email({ message: 'Invalid email address' }),
    specialties: zod_1.z
      .array(exports.STAFF_SPECIALTY, {
        required_error: 'At least one specialty is required',
      })
      .min(1, 'Select at least one specialty'),
    bio: zod_1.z.string().optional(),
  }),
})
exports.addUserInterestSchema = zod_1.z.object({
  body: zod_1.z.object({
    interest: zod_1.z
      .array(zod_1.z.nativeEnum(user_1.InterestCategory))
      .optional(),
  }),
})
