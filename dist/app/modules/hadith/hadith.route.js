"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HadithRoutes = void 0;
const express_1 = __importDefault(require("express"));
const hadith_controller_1 = require("./hadith.controller");
const hadith_validation_1 = require("./hadith.validation");
const auth_1 = __importDefault(require("../../middleware/auth"));
const checkPremium_1 = require("../../middleware/checkPremium");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
// Client routes: require authentication and active premium subscription
router.get('/version', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, hadith_controller_1.HadithController.getVersion);
router.get('/check-sync', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, hadith_controller_1.HadithController.checkSync);
router.get('/download-sync', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, hadith_controller_1.HadithController.downloadSync);
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, hadith_controller_1.HadithController.getAllHadiths);
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, hadith_controller_1.HadithController.getHadithById);
// Admin-only management routes
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(hadith_validation_1.HadithValidations.createHadithZodSchema), hadith_controller_1.HadithController.createHadith);
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(hadith_validation_1.HadithValidations.updateHadithZodSchema), hadith_controller_1.HadithController.updateHadith);
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), hadith_controller_1.HadithController.deleteHadith);
router.post('/sync-external', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), hadith_controller_1.HadithController.syncFromGlobalApi);
exports.HadithRoutes = router;
