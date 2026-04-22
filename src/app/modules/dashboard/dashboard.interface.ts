/* eslint-disable @typescript-eslint/no-explicit-any */
export type IAnalyticsResponse = {
  totalUsers: number;
  activeUsers7d: number;
  dailyActiveUsers: number;
  appDownloads: number;
  monthlyActiveUsersChart: { month: string; activeUsers: number }[];
  mostViewedTranslations: { label: string; value: number }[];
  mostSearchedVerses: { label: string; count: number }[];
  mostBookmarkedVerses: { label: string; count: number }[];
  engagementSummary: {
    totalBookmarks: number;
    totalHighlights: number;
    totalVerseViews: number;
  };
};

export type IUserManagementResponse = {
  totalUsers: number;
  activeUsers: number;
  restrictedUsers: number;
  bannedUsers: number;
  users: any[]; // User data
};

export type INotificationManagementResponse = {
  sentNotifications: number;
  scheduledNotifications: number;
  draftNotifications: number;
  notifications: any[]; // Notification data
};

export type IReportResponse = {
  activeUsers: number;
  totalDownloads: number;
  newUsers7d: number;
  avgSessionTime: string;
  userActivityLast7Days: { date: string; activeUsers: number; newUsers: number }[];
  featureUsageStats: { label: string; count: number }[];
  downloadsByPlatform: { android: number; ios: number };
  reportSummary: {
    totalAppUsers: number;
    totalVerseViews: number;
    totalBookmarksCreated: number;
    totalHighlightsCreated: number;
    avgDailyActiveUsers: number;
  };
};
