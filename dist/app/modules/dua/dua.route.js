"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuaRoutes = void 0;
const express_1 = __importDefault(require("express"));
const dua_controller_1 = require("./dua.controller");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
router.get('/version', dua_controller_1.DuaController.getVersion);
router.get('/check-sync', dua_controller_1.DuaController.checkSync);
router.get('/download-sync', dua_controller_1.DuaController.downloadSync);
router.get('/', dua_controller_1.DuaController.getAllDuas);
router.get('/:id', dua_controller_1.DuaController.getDuaById);
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), dua_controller_1.DuaController.createDua);
exports.DuaRoutes = router;
