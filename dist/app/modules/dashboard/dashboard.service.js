"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const user_model_1 = require("../user/user.model");
const bookmark_model_1 = require("../bookmark/bookmark.model");
const highlight_model_1 = require("../highlight/highlight.model");
const notification_model_1 = require("../notification/notification.model");
const user_1 = require("../../../enum/user");
const getAnalytics = async () => {
    const totalUsers = await user_model_1.User.countDocuments();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers7d = await user_model_1.User.countDocuments({ updatedAt: { $gte: sevenDaysAgo } });
    const dailyActiveUsers = await user_model_1.User.countDocuments({ updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } });
    // Bookmarks count
    const totalBookmarks = await bookmark_model_1.Bookmark.countDocuments();
    const totalHighlights = await highlight_model_1.Highlight.countDocuments();
    // For chart data, we'll provide some mock/estimated data for now
    const monthlyActiveUsersChart = [
        { month: 'Sep', activeUsers: 30000 },
        { month: 'Oct', activeUsers: 34000 },
        { month: 'Nov', activeUsers: 37000 },
        { month: 'Dec', activeUsers: 40000 },
        { month: 'Jan', activeUsers: 39000 },
        { month: 'Feb', activeUsers: 42000 },
        { month: 'Mar', activeUsers: 45000 },
    ];
    const mostViewedTranslations = [
        { label: 'Sahih International', value: 35 },
        { label: 'Yusuf Ali', value: 28 },
        { label: 'Pickthall', value: 19 },
        { label: 'Dr. Ghali', value: 13 },
        { label: 'Others', value: 5 },
    ];
    // Most Bookmarked Verses (Aggregation)
    const mostBookmarkedVersesRaw = await bookmark_model_1.Bookmark.aggregate([
        { $group: { _id: { surah: '$surahNumber', ayah: '$ayahNumber' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
    ]);
    const mostBookmarkedVerses = mostBookmarkedVersesRaw.map(item => ({
        label: `Surah ${item._id.surah}, Ayah ${item._id.ayah}`,
        count: item.count,
    }));
    // Most Searched Verses (Mock for now as search is not tracked)
    const mostSearchedVerses = [
        { label: 'Al-Fatiha (1:1-7)', count: 16000 },
        { label: 'Al-Baqarah (2:255)', count: 12000 },
        { label: 'Al-Ikhlas (112:1-4)', count: 10000 },
        { label: 'Ar-Rahman (55:13)', count: 8000 },
        { label: 'Ya-Sin (36:1-12)', count: 6000 },
    ];
    return {
        totalUsers,
        activeUsers7d,
        dailyActiveUsers,
        appDownloads: 52100, // Mock
        monthlyActiveUsersChart,
        mostViewedTranslations,
        mostSearchedVerses,
        mostBookmarkedVerses,
        engagementSummary: {
            totalBookmarks,
            totalHighlights,
            totalVerseViews: 423567, // Mock
        },
    };
};
const getUserManagement = async () => {
    const totalUsers = await user_model_1.User.countDocuments();
    const activeUsers = await user_model_1.User.countDocuments({ status: user_1.USER_STATUS.ACTIVE });
    const restrictedUsers = await user_model_1.User.countDocuments({ status: user_1.USER_STATUS.INACTIVE }); // Assuming INACTIVE is restricted for now
    const bannedUsers = await user_model_1.User.countDocuments({ status: user_1.USER_STATUS.DELETED }); // Assuming DELETED is banned
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
    const sentNotifications = await notification_model_1.Notification.countDocuments({ status: 'sent' }); // Replace with actual status enum
    const scheduledNotifications = await notification_model_1.Notification.countDocuments({ status: 'scheduled' });
    const draftNotifications = await notification_model_1.Notification.countDocuments({ status: 'draft' });
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
const getReports = async () => {
    const totalUsers = await user_model_1.User.countDocuments();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsers7d = await user_model_1.User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    return {
        activeUsers: 28450, // Mock
        totalDownloads: 52100, // Mock
        newUsers7d,
        avgSessionTime: '12m',
        userActivityLast7Days: [
            { date: 'Mar 18', activeUsers: 10500, newUsers: 3500 },
            { date: 'Mar 19', activeUsers: 11000, newUsers: 3800 },
            { date: 'Mar 20', activeUsers: 10800, newUsers: 3400 },
            { date: 'Mar 21', activeUsers: 11200, newUsers: 3900 },
            { date: 'Mar 22', activeUsers: 11500, newUsers: 4100 },
            { date: 'Mar 23', activeUsers: 11800, newUsers: 4300 },
            { date: 'Mar 24', activeUsers: 11600, newUsers: 4000 },
        ],
        featureUsageStats: [
            { label: 'Bookmarks', count: 89234 },
            { label: 'Highlights', count: 156891 },
            { label: 'Search', count: 234567 },
            { label: 'Translations', count: 321456 },
            { label: 'Audio', count: 178902 },
        ],
        downloadsByPlatform: { android: 32450, ios: 19650 },
        reportSummary: {
            totalAppUsers: totalUsers,
            totalVerseViews: 423567,
            totalBookmarksCreated: await bookmark_model_1.Bookmark.countDocuments(),
            totalHighlightsCreated: await highlight_model_1.Highlight.countDocuments(),
            avgDailyActiveUsers: 12636,
        },
    };
};
exports.DashboardService = {
    getAnalytics,
    getUserManagement,
    getNotificationManagement,
    getReports,
};
