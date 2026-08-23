"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheikhContentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const sheikh_content_controller_1 = require("./sheikh-content.controller");
const sheikh_content_validation_1 = require("./sheikh-content.validation");
const auth_1 = __importDefault(require("../../middleware/auth"));
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
router.get('/', sheikh_content_controller_1.SheikhContentController.getSpeakerContent);
router.get('/all', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), sheikh_content_controller_1.SheikhContentController.getAllContents);
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(sheikh_content_validation_1.SheikhContentValidations.createSheikhContentZodSchema), sheikh_content_controller_1.SheikhContentController.createContent);
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(sheikh_content_validation_1.SheikhContentValidations.updateSheikhContentZodSchema), sheikh_content_controller_1.SheikhContentController.updateContent);
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), sheikh_content_controller_1.SheikhContentController.deleteContent);
exports.SheikhContentRoutes = router;
