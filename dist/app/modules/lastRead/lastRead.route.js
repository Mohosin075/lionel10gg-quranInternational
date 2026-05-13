"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LastReadRoutes = void 0;
const express_1 = __importDefault(require("express"));
const lastRead_controller_1 = require("./lastRead.controller");
const auth_1 = __importDefault(require("../../middleware/auth"));
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const lastRead_validation_1 = require("./lastRead.validation");
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
router.patch('/', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(lastRead_validation_1.LastReadValidations.updateLastReadSchema), lastRead_controller_1.LastReadController.updateLastRead);
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), lastRead_controller_1.LastReadController.getLastRead);
exports.LastReadRoutes = router;
