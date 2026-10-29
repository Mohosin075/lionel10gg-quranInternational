import { z } from 'zod'

export const appConfigSchema = z.object({
  banners: z.array(z.object({
    id: z.string().min(1).max(128), title: z.string().max(300),
    imageUrl: z.string().max(2048), actionUrl: z.string().max(2048).optional(),
    isActive: z.boolean(), order: z.number().int().optional(),
  })).max(30).optional(),
  maintenanceMode: z.object({ isEnabled: z.boolean().optional(), message: z.string().max(2000).optional(),
    minAppVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional() }).optional(),
  dailyReminder: z.object({ isEnabled: z.boolean().optional(), message: z.string().max(1000).optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional() }).optional(),
  featureFlags: z.object({ premiumEnabled: z.boolean().optional(), audioStreamingEnabled: z.boolean().optional(), aiChatEnabled: z.boolean().optional() }).optional(),
}).strict()
