"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_route_1 = require("../app/modules/user/user.route");
const quran_route_1 = require("../app/modules/quran/quran.route");
const bookmark_route_1 = require("../app/modules/bookmark/bookmark.route");
const highlight_route_1 = require("../app/modules/highlight/highlight.route");
const lastRead_route_1 = require("../app/modules/lastRead/lastRead.route");
const auth_route_1 = require("../app/modules/auth/auth.route");
const express_1 = __importDefault(require("express"));
const public_route_1 = require("../app/modules/public/public.route");
const support_route_1 = require("../app/modules/support/support.route");
const upload_route_1 = require("../app/modules/upload/upload.route");
const prayer_time_route_1 = require("../app/modules/prayer-time/prayer-time.route");
const notification_routes_1 = require("../app/modules/notification/notification.routes");
const message_routes_1 = require("../app/modules/message/message.routes");
const chat_routes_1 = require("../app/modules/chat/chat.routes");
const hasanat_route_1 = require("../app/modules/hasanat/hasanat.route");
const tafsir_route_1 = require("../app/modules/tafsir/tafsir.route");
const dua_route_1 = require("../app/modules/dua/dua.route");
const http_status_codes_1 = require("http-status-codes");
const dashboard_route_1 = require("../app/modules/dashboard/dashboard.route");
const router = express_1.default.Router();
const apiRoutes = [
    { path: '/user', route: user_route_1.UserRoutes },
    { path: '/auth', route: auth_route_1.AuthRoutes },
    { path: '/dashboard', route: dashboard_route_1.DashboardRoutes },
    { path: '/notifications', route: notification_routes_1.NotificationRoutes },
    { path: '/public', route: public_route_1.PublicRoutes },
    { path: '/support', route: support_route_1.SupportRoutes },
    { path: '/upload', route: upload_route_1.UploadRoutes },
    { path: '/message', route: message_routes_1.MessageRoutes },
    { path: '/chat', route: chat_routes_1.ChatRoutes },
    { path: '/quran', route: quran_route_1.QuranRoutes },
    { path: '/bookmark', route: bookmark_route_1.BookmarkRoutes },
    { path: '/highlight', route: highlight_route_1.HighlightRoutes },
    { path: '/last-read', route: lastRead_route_1.LastReadRoutes },
    { path: '/prayer-time', route: prayer_time_route_1.PrayerTimeRoutes },
    { path: '/hasanat', route: hasanat_route_1.HasanatRoutes },
    { path: '/tafsir', route: tafsir_route_1.TafsirRoutes },
    { path: '/dua', route: dua_route_1.DuaRoutes },
];
apiRoutes.forEach(route => {
    router.use(route.path, route.route);
});
router.get('/status', (req, res) => {
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: 'Server is running smoothly',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV,
    });
});
exports.default = router;
