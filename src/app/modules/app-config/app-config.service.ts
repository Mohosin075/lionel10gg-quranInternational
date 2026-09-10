import { AppConfig } from './app-config.model';
import { IAppConfig } from './app-config.interface';

const getAppConfig = async (): Promise<IAppConfig> => {
  let config = await AppConfig.findOne().lean();
  if (!config) {
    config = await AppConfig.create({
      banners: [
        {
          id: 'banner_1',
          title: 'Welcome to Quran International',
          imageUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80',
          actionUrl: '',
          isActive: true,
          order: 1,
        },
      ],
      maintenanceMode: {
        isEnabled: false,
        message: 'The app is currently undergoing routine maintenance. Please try again soon.',
        minAppVersion: '1.0.0',
      },
      dailyReminder: {
        isEnabled: true,
        message: 'Remember to read Surah Al-Kahf on Friday and stay connected to the Quran.',
        time: '09:00',
      },
      featureFlags: {
        premiumEnabled: true,
        audioStreamingEnabled: true,
        aiChatEnabled: false,
      },
    });
  }
  return config as IAppConfig;
};

const updateAppConfig = async (payload: Partial<IAppConfig>): Promise<IAppConfig> => {
  let config = await AppConfig.findOne();
  if (!config) {
    config = await AppConfig.create(payload);
    return config.toObject() as IAppConfig;
  }

  const updated = await AppConfig.findByIdAndUpdate(
    config._id,
    { $set: payload },
    { new: true, upsert: true },
  ).lean();

  return updated as IAppConfig;
};

export const AppConfigService = {
  getAppConfig,
  updateAppConfig,
};
