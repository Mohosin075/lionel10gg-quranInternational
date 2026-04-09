import { Schema, model } from 'mongoose';
import { IUserPrayerSettings } from './prayer-time.interface';

const prayerSettingsSchema = new Schema<IUserPrayerSettings>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    location: {
      city: { type: String, required: true, default: 'Dhaka' },
      country: { type: String, required: true, default: 'Bangladesh' },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    activePrayers: {
      type: [String],
      enum: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
      default: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
    },
    selectedRecitationId: {
      type: String,
      default: 'makkah',
    },
  },
  {
    timestamps: true,
  },
);

export const PrayerSettings = model<IUserPrayerSettings>(
  'PrayerSettings',
  prayerSettingsSchema,
);
