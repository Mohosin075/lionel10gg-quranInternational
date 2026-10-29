"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContentSnapshot = exports.snapshotRevision = exports.contentModels = void 0;
const crypto_1 = __importDefault(require("crypto"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const hadith_model_1 = require("../hadith/hadith.model");
const dua_model_1 = require("../dua/dua.model");
const knowledge_library_model_1 = require("../knowledge-library/knowledge-library.model");
const knowledge_book_model_1 = require("../knowledge-library/knowledge-book.model");
const knowledge_fatwa_model_1 = require("../knowledge-library/knowledge-fatwa.model");
// A fingerprint includes deleted/inactive rows. Unlike MAX(row.version), every
// create/edit/delete changes it, and an empty collection is a valid snapshot.
exports.contentModels = {
    hadith: hadith_model_1.Hadith, dua: dua_model_1.Dua, knowledge: knowledge_library_model_1.KnowledgeArticle, book: knowledge_book_model_1.KnowledgeBook, fatwa: knowledge_fatwa_model_1.KnowledgeFatwa,
};
const snapshotRevision = (rows) => crypto_1.default.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
exports.snapshotRevision = snapshotRevision;
exports.getContentSnapshot = (0, catchAsync_1.default)(async (req, res) => {
    const model = exports.contentModels[req.params.module];
    const lang = String(req.query.lang || 'en');
    if (!model || !/^[a-z]{2,3}(-[a-zA-Z0-9]+)*$/.test(lang))
        throw new ApiError_1.default(400, 'Invalid content scope');
    const page = Math.max(1, Math.trunc(Number(req.query.page) || 1));
    const limit = Math.min(200, Math.max(1, Math.trunc(Number(req.query.limit) || 100)));
    const readRevision = async () => (0, exports.snapshotRevision)(await model.find({ lang }).select('_id updatedAt version isActive').sort({ _id: 1 }).lean());
    const revision = await readRevision();
    if (req.query.revision && req.query.revision !== revision)
        throw new ApiError_1.default(409, 'Content changed during download; retry the snapshot');
    const filter = { lang, isActive: { $ne: false } };
    const total = await model.countDocuments(filter);
    let query = model.find(filter).sort({ _id: 1 }).skip((page - 1) * limit).limit(limit);
    // Preserve already downloaded book bodies on mobile; reading a new book fetches
    // its body explicitly. Listing every book must not download an entire library.
    if (req.params.module === 'book')
        query = query.select('-content');
    const rows = await query.lean();
    if (revision !== await readRevision())
        throw new ApiError_1.default(409, 'Content changed during download; retry the snapshot');
    res.json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), revision, lang, module: req.params.module } });
});
