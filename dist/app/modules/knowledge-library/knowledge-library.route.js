"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeLibraryRoutes = void 0;
const express_1 = __importDefault(require("express"));
const knowledge_library_controller_1 = require("./knowledge-library.controller");
const knowledge_library_validation_1 = require("./knowledge-library.validation");
const auth_1 = __importDefault(require("../../middleware/auth"));
const checkPremium_1 = require("../../middleware/checkPremium");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
// Client routes: require authentication and active premium subscription
router.get('/version', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, knowledge_library_controller_1.KnowledgeLibraryController.getVersion);
router.get('/check-sync', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, knowledge_library_controller_1.KnowledgeLibraryController.checkSync);
router.get('/download-sync', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, knowledge_library_controller_1.KnowledgeLibraryController.downloadSync);
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, knowledge_library_controller_1.KnowledgeLibraryController.getAllArticles);
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), checkPremium_1.checkPremium, knowledge_library_controller_1.KnowledgeLibraryController.getArticleById);
// Admin-only management routes
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(knowledge_library_validation_1.KnowledgeLibraryValidations.createArticleZodSchema), knowledge_library_controller_1.KnowledgeLibraryController.createArticle);
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(knowledge_library_validation_1.KnowledgeLibraryValidations.updateArticleZodSchema), knowledge_library_controller_1.KnowledgeLibraryController.updateArticle);
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.deleteArticle);
exports.KnowledgeLibraryRoutes = router;
