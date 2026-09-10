export interface IBanner {
  id: string;
  title: string;
  imageUrl: string;
  actionUrl?: string;
  isActive: boolean;
  order?: number;
}

export interface IAppConfig {
  banners: IBanner[];
  maintenanceMode: {
    isEnabled: boolean;
    message: string;
    minAppVersion?: string;
  };
  dailyReminder: {
    isEnabled: boolean;
    message: string;
    time?: string;
  };
  featureFlags: {
    premiumEnabled: boolean;
    audioStreamingEnabled: boolean;
    aiChatEnabled: boolean;
  };
}
