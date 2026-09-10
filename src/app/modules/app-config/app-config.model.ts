import { Schema, model } from 'mongoose';
import { IAppConfig } from './app-config.interface';

const BannerSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    actionUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const AppConfigSchema = new Schema<IAppConfig>(
  {
    banners: { type: [BannerSchema], default: [] },
    maintenanceMode: {
      isEnabled: { type: Boolean, default: false },
      message: { type: String, default: 'We are currently performing scheduled maintenance. Please check back shortly.' },
      minAppVersion: { type: String, default: '1.0.0' },
    },
    dailyReminder: {
      isEnabled: { type: Boolean, default: true },
      message: { type: String, default: 'Have you recited your Quran verses today?' },
      time: { type: String, default: '09:00' },
    },
    featureFlags: {
      premiumEnabled: { type: Boolean, default: true },
      audioStreamingEnabled: { type: Boolean, default: true },
      aiChatEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const AppConfig = model<IAppConfig>('AppConfig', AppConfigSchema);
