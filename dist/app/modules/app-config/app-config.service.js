"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigService = void 0;
const app_config_model_1 = require("./app-config.model");
const getAppConfig = async () => {
    let config = await app_config_model_1.AppConfig.findOne().lean();
    if (!config) {
        config = await app_config_model_1.AppConfig.create({
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
    return config;
};
const updateAppConfig = async (payload) => {
    let config = await app_config_model_1.AppConfig.findOne();
    if (!config) {
        config = await app_config_model_1.AppConfig.create(payload);
        return config.toObject();
    }
    const updated = await app_config_model_1.AppConfig.findByIdAndUpdate(config._id, { $set: payload }, { new: true, upsert: true }).lean();
    return updated;
};
exports.AppConfigService = {
    getAppConfig,
    updateAppConfig,
};
