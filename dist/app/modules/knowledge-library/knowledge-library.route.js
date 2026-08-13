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
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
// Client routes: require authentication (no premium check required per instruction.md)
router.get('/version', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.getVersion);
router.get('/check-sync', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.checkSync);
router.get('/download-sync', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.downloadSync);
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.getAllArticles);
// Client routes: Books & Fatwas
router.get('/books', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.getAllBooks);
router.get('/books/:id', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.getBookById);
router.get('/fatwas', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.getAllFatwas);
router.get('/fatwas/:id', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.getFatwaById);
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ORGANIZER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.getArticleById);
// Admin-only management routes: Articles
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(knowledge_library_validation_1.KnowledgeLibraryValidations.createArticleZodSchema), knowledge_library_controller_1.KnowledgeLibraryController.createArticle);
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(knowledge_library_validation_1.KnowledgeLibraryValidations.updateArticleZodSchema), knowledge_library_controller_1.KnowledgeLibraryController.updateArticle);
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.deleteArticle);
// Admin-only management routes: Books
router.post('/books', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(knowledge_library_validation_1.KnowledgeLibraryValidations.createBookZodSchema), knowledge_library_controller_1.KnowledgeLibraryController.createBook);
router.patch('/books/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(knowledge_library_validation_1.KnowledgeLibraryValidations.updateBookZodSchema), knowledge_library_controller_1.KnowledgeLibraryController.updateBook);
router.delete('/books/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.deleteBook);
// Admin-only management routes: Fatwas
router.post('/fatwas', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(knowledge_library_validation_1.KnowledgeLibraryValidations.createFatwaZodSchema), knowledge_library_controller_1.KnowledgeLibraryController.createFatwa);
router.patch('/fatwas/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(knowledge_library_validation_1.KnowledgeLibraryValidations.updateFatwaZodSchema), knowledge_library_controller_1.KnowledgeLibraryController.updateFatwa);
router.delete('/fatwas/:id', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), knowledge_library_controller_1.KnowledgeLibraryController.deleteFatwa);
exports.KnowledgeLibraryRoutes = router;
