"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrayerTimeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const prayer_time_controller_1 = require("./prayer-time.controller");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
router.get('/', 
// Public access for general prayer times
prayer_time_controller_1.PrayerTimeControllers.getMyPrayerTimes);
router.get('/recitations', 
// Public access
prayer_time_controller_1.PrayerTimeControllers.getAdhanRecitations);
router.patch('/settings', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), prayer_time_controller_1.PrayerTimeControllers.updateSettings);
exports.PrayerTimeRoutes = router;
