import { Schema, model } from 'mongoose'
import { Request, Response } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import { z } from 'zod'
import catchAsync from '../../../shared/catchAsync'
import { User } from '../user/user.model'

export const DeviceRegistration = model(
  'DeviceRegistration',
  new Schema(
    {
      token: { type: String, required: true, unique: true },
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
    },
    { timestamps: true },
  ),
)
const tokenSchema = z.object({ token: z.string().min(20).max(4096) })
export const registerDevice = catchAsync(
  async (req: Request, res: Response) => {
    const { token } = tokenSchema.parse(req.body)
    const user = (req.user as JwtPayload).authId
    await User.updateMany(
      { deviceToken: token },
      { $unset: { deviceToken: 1 } },
    )
    await DeviceRegistration.findOneAndUpdate(
      { token },
      { user },
      { upsert: true, new: true },
    )
    res.json({ success: true, data: { registered: true } })
  },
)
export const unregisterDevice = catchAsync(
  async (req: Request, res: Response) => {
    const { token } = tokenSchema.parse(req.body)
    const user = (req.user as JwtPayload).authId
    await DeviceRegistration.deleteOne({ token, user })
    await User.updateOne(
      { _id: user, deviceToken: token },
      { $unset: { deviceToken: 1 } },
    )
    res.json({ success: true, data: { registered: false } })
  },
)
