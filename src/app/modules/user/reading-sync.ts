import { Request, Response } from 'express'
import { z } from 'zod'
import { JwtPayload } from 'jsonwebtoken'
import catchAsync from '../../../shared/catchAsync'
import { Bookmark } from '../bookmark/bookmark.model'
import { Highlight } from '../highlight/highlight.model'
import { LastRead } from '../lastRead/lastRead.model'
import { User } from './user.model'
import ApiError from '../../../errors/ApiError'

const eventSchema = z
  .object({
    id: z.string().min(8).max(128),
    kind: z.enum(['bookmark', 'highlight', 'lastRead', 'hasanat', 'settings']),
    payload: z.object({
      surahNumber: z.number().int().min(1).max(114).optional(),
      ayahNumber: z.number().int().min(1).max(286).optional(),
      editionIdentifier: z.string().max(128).optional(),
      enabled: z.boolean().optional(),
      color: z.string().max(32).nullable().optional(),
      text: z.string().max(10000).optional(),
      translation: z.string().max(20000).optional(),
      amount: z.number().int().positive().max(10000000).optional(),
      notificationsEnabled: z.boolean().optional(),
    }),
  })
  .superRefine((event, ctx) => {
    if (
      event.kind === 'settings'
        ? event.payload.notificationsEnabled === undefined
        : event.kind === 'hasanat'
          ? !event.payload.amount
          : !event.payload.surahNumber || !event.payload.ayahNumber
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing reading event fields',
      })
    if (event.kind === 'bookmark' && event.payload.enabled === undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bookmark state is required',
      })
    if (event.kind === 'highlight' && event.payload.color === undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Highlight state is required',
      })
  })
export const readingSyncSchema = z.object({
  events: z.array(eventSchema).max(100),
})

export const applyReadingEvents = async (userId: string, input: unknown) => {
  const { events } = readingSyncSchema.parse(input)
  const accepted: string[] = []
  for (const event of events) {
    const { surahNumber, ayahNumber, ...data } = event.payload
    const filter = { user: userId, surahNumber, ayahNumber }
    if (event.kind === 'settings') {
      await User.updateOne(
        { _id: userId },
        { $set: { 'settings.pushNotification': data.notificationsEnabled } },
      )
    } else if (event.kind === 'hasanat') {
      // Deduplication and increment share a single atomic document write. A lost
      // response/retry never increments twice, including concurrent requests.
      await User.updateOne(
        { _id: userId, hasanatEventIds: { $ne: event.id } },
        {
          $inc: { totalHasanat: data.amount! },
          $addToSet: { hasanatEventIds: event.id },
        },
      )
    } else if (event.kind === 'bookmark') {
      if (data.enabled)
        await Bookmark.findOneAndUpdate(
          filter,
          {
            ...filter,
            text: data.text,
            translation: data.translation,
            editionIdentifier: data.editionIdentifier,
          },
          { upsert: true, new: true },
        )
      else await Bookmark.deleteOne(filter)
    } else if (event.kind === 'highlight') {
      if (data.color)
        await Highlight.findOneAndUpdate(
          filter,
          { ...filter, color: data.color, text: data.text },
          { upsert: true, new: true },
        )
      else await Highlight.deleteOne(filter)
    } else {
      await LastRead.findOneAndUpdate(
        { user: userId },
        { ...filter, editionIdentifier: data.editionIdentifier },
        { upsert: true, new: true },
      )
    }
    accepted.push(event.id)
  }
  return accepted
}
export const pushReadingEvents = catchAsync(
  async (req: Request, res: Response) => {
    const accepted = await applyReadingEvents(
      (req.user as JwtPayload).authId,
      req.body,
    )
    res.json({ success: true, data: { accepted } })
  },
)
export const pullReadingState = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req.user as JwtPayload).authId
    const [bookmarks, highlights, lastRead, user] = await Promise.all([
      Bookmark.find({ user: userId }).lean(),
      Highlight.find({ user: userId }).lean(),
      LastRead.findOne({ user: userId }).lean(),
      User.findById(userId).select('totalHasanat').lean(),
    ])
    if (!user) throw new ApiError(404, 'User not found')
    res.json({
      success: true,
      data: {
        bookmarks,
        highlights,
        lastRead,
        totalHasanat: user.totalHasanat,
      },
    })
  },
)
