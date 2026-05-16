"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HasanatRoutes = void 0;
const express_1 = __importDefault(require("express"));
const hasanat_controller_1 = require("./hasanat.controller");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../../enum/user");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const hasanat_validation_1 = require("./hasanat.validation");
const router = express_1.default.Router();
router.post('/collect', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(hasanat_validation_1.HasanatValidation.collectHasanatZodSchema), hasanat_controller_1.HasanatController.collectHasanat);
exports.HasanatRoutes = router;
