"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppPurchaseRoutes = void 0;
const express_1 = __importDefault(require("express"));
const in_app_purchase_controller_1 = require("./in-app-purchase.controller");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const auth_1 = __importDefault(require("../../middleware/auth"));
const in_app_purchase_validation_1 = require("./in-app-purchase.validation");
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
router.get('/plans', in_app_purchase_controller_1.InAppPurchaseController.getAvailablePlans);
router.get('/plans/:planId', in_app_purchase_controller_1.InAppPurchaseController.getPlanById);
router.post('/verify', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(in_app_purchase_validation_1.inAppPurchaseValidation.verifyPurchase), in_app_purchase_controller_1.InAppPurchaseController.verifyPurchase);
router.get('/my-purchases', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), in_app_purchase_controller_1.InAppPurchaseController.getUserPurchases);
exports.InAppPurchaseRoutes = router;
