"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigRoutes = void 0;
const express_1 = __importDefault(require("express"));
const app_config_controller_1 = require("./app-config.controller");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
// Public: App fetches config/banners without authentication
router.get('/', app_config_controller_1.AppConfigController.getAppConfig);
// Admin: Manage banners, maintenance mode, and app settings
router.patch('/', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), app_config_controller_1.AppConfigController.updateAppConfig);
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), app_config_controller_1.AppConfigController.updateAppConfig);
exports.AppConfigRoutes = router;
