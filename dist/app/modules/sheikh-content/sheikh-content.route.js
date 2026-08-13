"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheikhContentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const sheikh_content_controller_1 = require("./sheikh-content.controller");
const sheikh_content_validation_1 = require("./sheikh-content.validation");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const router = express_1.default.Router();
// User accessible routes (Non-Subscription feature)
router.get('/', 
// auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
sheikh_content_controller_1.SheikhContentController.getSpeakerContent);
// Admin-only routes
router.post('/', 
// auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
(0, validateRequest_1.default)(sheikh_content_validation_1.SheikhContentValidations.createSheikhContentZodSchema), sheikh_content_controller_1.SheikhContentController.createContent);
router.patch('/:id', 
// auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
(0, validateRequest_1.default)(sheikh_content_validation_1.SheikhContentValidations.updateSheikhContentZodSchema), sheikh_content_controller_1.SheikhContentController.updateContent);
router.delete('/:id', 
// auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
sheikh_content_controller_1.SheikhContentController.deleteContent);
router.get('/all', 
// auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
sheikh_content_controller_1.SheikhContentController.getAllContents);
exports.SheikhContentRoutes = router;
