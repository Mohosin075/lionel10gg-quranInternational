import { z } from 'zod'
import { InterestCategory } from '../../../enum/user'

// ------------------ SUB-SCHEMAS ------------------
const addressSchema = z.object({
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  permanentAddress: z.string().optional(),
  presentAddress: z.string().optional(),
})

const pointSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z.tuple([z.number(), z.number()]).optional(), // [longitude, latitude]
})

// ------------------ UPDATE USER VALIDATION ------------------
export const updateUserSchema = z.object({
  body: z
    .object({
      name: z.string().optional(),
      profile: z.string().optional(),
      phone: z.string().optional(),
      description: z.string().optional(),
      specialties: z.array(z.string()).optional(),

      address: addressSchema.optional(),
      location: pointSchema.optional(),

      appId: z.string().optional(),
      deviceToken: z.string().optional(),

      dateOfBirth: z.string().datetime().optional(),
      dietaryRestrictions: z.array(z.string()).optional(),
      interests: z.array(z.nativeEnum(InterestCategory)).optional(),
    })
    .strict(),
})

export const STAFF_SPECIALTY = z.enum([
  'Cleaning',
  'Cooking',
  'Laundry',
  'Grocery',
  'Maintenance',
])

export const createStaffSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    email: z.string().email({ message: 'Invalid email address' }),
    specialties: z
      .array(STAFF_SPECIALTY, {
        required_error: 'At least one specialty is required',
      })
      .min(1, 'Select at least one specialty'),
    bio: z.string().optional(),
  }),
})

export const addUserInterestSchema = z.object({
  body: z.object({
    interest: z.array(z.nativeEnum(InterestCategory)).optional(),
  }),
})
