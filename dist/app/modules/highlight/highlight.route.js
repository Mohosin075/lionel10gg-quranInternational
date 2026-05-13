"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HighlightRoutes = void 0;
const express_1 = __importDefault(require("express"));
const highlight_controller_1 = require("./highlight.controller");
const auth_1 = __importDefault(require("../../middleware/auth"));
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const highlight_validation_1 = require("./highlight.validation");
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(highlight_validation_1.HighlightValidations.createHighlightSchema), highlight_controller_1.HighlightController.addHighlight);
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), highlight_controller_1.HighlightController.getHighlights);
exports.HighlightRoutes = router;
