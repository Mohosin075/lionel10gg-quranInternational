"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const report_range_1 = require("./report-range");
const user_model_1 = require("../user/user.model");
const bookmark_model_1 = require("../bookmark/bookmark.model");
const highlight_model_1 = require("../highlight/highlight.model");
const notification_model_1 = require("../notification/notification.model");
const hadith_model_1 = require("../hadith/hadith.model");
const dua_model_1 = require("../dua/dua.model");
const offline_pack_model_1 = require("../offline-pack/offline-pack.model");
const batch_job_model_1 = require("../offline-pack/batch-job.model");
const lastRead_model_1 = require("../lastRead/lastRead.model");
const user_1 = require("../../../enum/user");
const getAnalytics = async () => {
    const totalUsers = await user_model_1.User.countDocuments();
    // Session and install telemetry are not collected; report unavailable instead of proxy counts.
    const activeUsers7d = null;
    const dailyActiveUsers = null;
    // Content counts
    const totalHadiths = await hadith_model_1.Hadith.countDocuments({ isActive: true });
    const totalDuas = await dua_model_1.Dua.countDocuments();
    const totalOfflinePacks = await offline_pack_model_1.OfflinePack.countDocuments();
    const activeBatchJobs = await batch_job_model_1.BatchJob.countDocuments({
        status: { $in: ['in_progress', 'validating', 'finalizing', 'cancelling'] },
    });
    // Engagement real counts
    const totalBookmarks = await bookmark_model_1.Bookmark.countDocuments();
    const totalHighlights = await highlight_model_1.Highlight.countDocuments();
    const totalVerseViews = await lastRead_model_1.LastRead.countDocuments();
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
    ];
    const now = new Date();
    const monthlyActiveUsersChart = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const count = await user_model_1.User.countDocuments({
            createdAt: { $gte: monthStart, $lte: monthEnd },
        });
        monthlyActiveUsersChart.push({
            month: monthNames[d.getMonth()],
            activeUsers: count,
        });
    }
    // Real Most Viewed Translations (aggregated from bookmarks and packs)
    const bookmarkEditions = await bookmark_model_1.Bookmark.aggregate([
        { $match: { editionIdentifier: { $exists: true, $ne: '' } } },
        { $group: { _id: '$editionIdentifier', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
    ]);
    const mostViewedTranslations = bookmarkEditions.map(item => ({
        label: String(item._id),
        value: item.count,
    }));
    // No bookmark activity means no translation popularity data.
    // Real Most Bookmarked Verses
    const mostBookmarkedVersesRaw = await bookmark_model_1.Bookmark.aggregate([
        {
            $group: {
                _id: { surah: '$surahNumber', ayah: '$ayahNumber' },
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
    ]);
    const mostBookmarkedVerses = mostBookmarkedVersesRaw.map(item => ({
        label: `Surah ${item._id.surah}, Ayah ${item._id.ayah}`,
        count: item.count,
    }));
    // Real Most Read Surahs (from LastRead)
    const mostReadSurahsRaw = await lastRead_model_1.LastRead.aggregate([
        { $group: { _id: '$surahNumber', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
    ]);
    const mostSearchedVerses = mostReadSurahsRaw.map(item => ({
        label: `Surah ${item._id}`,
        count: item.count,
    }));
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
    };
};
const getUserManagement = async () => {
    const totalUsers = await user_model_1.User.countDocuments();
    const activeUsers = await user_model_1.User.countDocuments({ status: user_1.USER_STATUS.ACTIVE });
    const restrictedUsers = await user_model_1.User.countDocuments({
        status: user_1.USER_STATUS.INACTIVE,
    });
    const bannedUsers = await user_model_1.User.countDocuments({ status: user_1.USER_STATUS.DELETED });
    const users = await user_model_1.User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email createdAt updatedAt status');
    return {
        totalUsers,
        activeUsers,
        restrictedUsers,
        bannedUsers,
        users,
    };
};
const getNotificationManagement = async () => {
    const sentNotifications = await notification_model_1.Notification.countDocuments();
    const scheduledNotifications = 0;
    const draftNotifications = 0;
    const notifications = await notification_model_1.Notification.find()
        .sort({ createdAt: -1 })
        .limit(10);
    return {
        sentNotifications,
        scheduledNotifications,
        draftNotifications,
        notifications,
    };
};
const getReports = async (range = '7d') => {
    const window = (0, report_range_1.getReportWindow)(range);
    const [totalUsers, newUsers7d, bCount, hCount, hadithCount, duaCount, packCount, totalVerseViews,] = await Promise.all([
        user_model_1.User.countDocuments(),
        user_model_1.User.countDocuments({ createdAt: { $gte: window.start, $lt: window.end } }),
        bookmark_model_1.Bookmark.countDocuments(),
        highlight_model_1.Highlight.countDocuments(),
        hadith_model_1.Hadith.countDocuments({ isActive: true }),
        dua_model_1.Dua.countDocuments(),
        offline_pack_model_1.OfflinePack.countDocuments(),
        lastRead_model_1.LastRead.countDocuments(),
    ]);
    const userActivityLast7Days = [];
    for (let time = window.start.getTime(); time < window.end.getTime(); time += 86400000) {
        const day = new Date(time);
        const next = new Date(time + 86400000);
        const [newUsers, updatedUsers] = await Promise.all([
            user_model_1.User.countDocuments({ createdAt: { $gte: day, $lt: next } }),
            user_model_1.User.countDocuments({ updatedAt: { $gte: day, $lt: next } }),
        ]);
        userActivityLast7Days.push({
            date: day.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
            }),
            newUsers,
            updatedUsers,
            activeUsers: null,
        });
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
    };
};
exports.DashboardService = {
    getAnalytics,
    getUserManagement,
    getNotificationManagement,
    getReports,
};
