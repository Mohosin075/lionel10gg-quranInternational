/* eslint-disable @typescript-eslint/no-explicit-any */
export type IAnalyticsResponse = {
  totalUsers: number
  activeUsers7d: number | null
  dailyActiveUsers: number | null
  appDownloads: number | null
  monthlyActiveUsersChart: { month: string; activeUsers: number }[]
  mostViewedTranslations: { label: string; value: number }[]
  mostSearchedVerses: { label: string; count: number }[]
  mostBookmarkedVerses: { label: string; count: number }[]
  engagementSummary: {
    totalBookmarks: number
    totalHighlights: number
    totalVerseViews: number
  }
  totalHadiths?: number
  totalDuas?: number
  totalOfflinePacks?: number
  activeBatchJobs?: number
}

export type IUserManagementResponse = {
  totalUsers: number
  activeUsers: number
  restrictedUsers: number
  bannedUsers: number
  users: any[] // User data
}

export type INotificationManagementResponse = {
  sentNotifications: number
  scheduledNotifications: number
  draftNotifications: number
  notifications: any[] // Notification data
}

export type IReportResponse = {
  activeUsers: number | null
  totalDownloads: number | null
  newUsers7d: number
  avgSessionTime: string | null
  userActivityLast7Days: {
    date: string
    activeUsers: number | null
    updatedUsers: number
    newUsers: number
  }[]
  featureUsageStats: { label: string; count: number }[]
  downloadsByPlatform: { android: number; ios: number } | null
  range: { start: string; end: string; label: string }
  reportSummary: {
    totalAppUsers: number
    totalVerseViews: number
    totalBookmarksCreated: number
    totalHighlightsCreated: number
    avgDailyActiveUsers: number | null
  }
}
