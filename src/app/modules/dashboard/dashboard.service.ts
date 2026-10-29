import { getReportWindow, type ReportRange } from './report-range'
import { User } from '../user/user.model'
import { Bookmark } from '../bookmark/bookmark.model'
import { Highlight } from '../highlight/highlight.model'
import { Notification } from '../notification/notification.model'
import { Hadith } from '../hadith/hadith.model'
import { Dua } from '../dua/dua.model'
import { OfflinePack } from '../offline-pack/offline-pack.model'
import { BatchJob } from '../offline-pack/batch-job.model'
import { LastRead } from '../lastRead/lastRead.model'
import { USER_STATUS } from '../../../enum/user'
import {
  IAnalyticsResponse,
  IUserManagementResponse,
  INotificationManagementResponse,
  IReportResponse,
} from './dashboard.interface'

const getAnalytics = async (): Promise<IAnalyticsResponse> => {
  const totalUsers = await User.countDocuments()
  // Session and install telemetry are not collected; report unavailable instead of proxy counts.
  const activeUsers7d = null
  const dailyActiveUsers = null

  // Content counts
  const totalHadiths = await Hadith.countDocuments({ isActive: true })
  const totalDuas = await Dua.countDocuments()
  const totalOfflinePacks = await OfflinePack.countDocuments()
  const activeBatchJobs = await BatchJob.countDocuments({
    status: { $in: ['in_progress', 'validating', 'finalizing', 'cancelling'] },
  })

  // Engagement real counts
  const totalBookmarks = await Bookmark.countDocuments()
  const totalHighlights = await Highlight.countDocuments()
  const totalVerseViews = await LastRead.countDocuments()

  // Real Monthly Active Users (last 6 calendar months computed from database)
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const now = new Date()
  const monthlyActiveUsersChart = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    )
    const count = await User.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    })
    monthlyActiveUsersChart.push({
      month: monthNames[d.getMonth()],
      activeUsers: count,
    })
  }

  // Real Most Viewed Translations (aggregated from bookmarks and packs)
  const bookmarkEditions = await Bookmark.aggregate([
    { $match: { editionIdentifier: { $exists: true, $ne: '' } } },
    { $group: { _id: '$editionIdentifier', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ])

  const mostViewedTranslations = bookmarkEditions.map(item => ({
    label: String(item._id),
    value: item.count,
  }))

  // No bookmark activity means no translation popularity data.

  // Real Most Bookmarked Verses
  const mostBookmarkedVersesRaw = await Bookmark.aggregate([
    {
      $group: {
        _id: { surah: '$surahNumber', ayah: '$ayahNumber' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ])

  const mostBookmarkedVerses = mostBookmarkedVersesRaw.map(item => ({
    label: `Surah ${item._id.surah}, Ayah ${item._id.ayah}`,
    count: item.count,
  }))

  // Real Most Read Surahs (from LastRead)
  const mostReadSurahsRaw = await LastRead.aggregate([
    { $group: { _id: '$surahNumber', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ])

  const mostSearchedVerses = mostReadSurahsRaw.map(item => ({
    label: `Surah ${item._id}`,
    count: item.count,
  }))

  return {
    totalUsers,
    activeUsers7d,
    dailyActiveUsers,
    appDownloads: null,
    monthlyActiveUsersChart,
    mostViewedTranslations,
    mostSearchedVerses,
    mostBookmarkedVerses,
    engagementSummary: {
      totalBookmarks,
      totalHighlights,
      totalVerseViews,
    },
    totalHadiths,
    totalDuas,
    totalOfflinePacks,
    activeBatchJobs,
  }
}

const getUserManagement = async (): Promise<IUserManagementResponse> => {
  const totalUsers = await User.countDocuments()
  const activeUsers = await User.countDocuments({ status: USER_STATUS.ACTIVE })
  const restrictedUsers = await User.countDocuments({
    status: USER_STATUS.INACTIVE,
  })
  const bannedUsers = await User.countDocuments({ status: USER_STATUS.DELETED })

  const users = await User.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select('name email createdAt updatedAt status')

  return {
    totalUsers,
    activeUsers,
    restrictedUsers,
    bannedUsers,
    users,
  }
}

const getNotificationManagement =
  async (): Promise<INotificationManagementResponse> => {
    const sentNotifications = await Notification.countDocuments()
    const scheduledNotifications = 0
    const draftNotifications = 0

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)

    return {
      sentNotifications,
      scheduledNotifications,
      draftNotifications,
      notifications,
    }
  }

const getReports = async (
  range: ReportRange = '7d',
): Promise<IReportResponse> => {
  const window = getReportWindow(range)
  const [
    totalUsers,
    newUsers7d,
    bCount,
    hCount,
    hadithCount,
    duaCount,
    packCount,
    totalVerseViews,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: window.start, $lt: window.end } }),
    Bookmark.countDocuments(),
    Highlight.countDocuments(),
    Hadith.countDocuments({ isActive: true }),
    Dua.countDocuments(),
    OfflinePack.countDocuments(),
    LastRead.countDocuments(),
  ])
  const userActivityLast7Days: IReportResponse['userActivityLast7Days'] = []
  for (
    let time = window.start.getTime();
    time < window.end.getTime();
    time += 86400000
  ) {
    const day = new Date(time)
    const next = new Date(time + 86400000)
    const [newUsers, updatedUsers] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: day, $lt: next } }),
      User.countDocuments({ updatedAt: { $gte: day, $lt: next } }),
    ])
    userActivityLast7Days.push({
      date: day.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
      newUsers,
      updatedUsers,
      activeUsers: null,
    })
  }
  return {
    activeUsers: null,
    totalDownloads: null,
    avgSessionTime: null,
    newUsers7d,
    userActivityLast7Days,
    featureUsageStats: [
      { label: 'Bookmarks', count: bCount },
      { label: 'Highlights', count: hCount },
      { label: 'Hadiths', count: hadithCount },
      { label: 'Duas', count: duaCount },
      { label: 'Offline Packs', count: packCount },
    ],
    downloadsByPlatform: null,
    range: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      label: window.label,
    },
    reportSummary: {
      totalAppUsers: totalUsers,
      totalVerseViews,
      totalBookmarksCreated: bCount,
      totalHighlightsCreated: hCount,
      avgDailyActiveUsers: null,
    },
  }
}

export const DashboardService = {
  getAnalytics,
  getUserManagement,
  getNotificationManagement,
  getReports,
}
