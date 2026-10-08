"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflinePackService = exports.computeSha256 = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const config_1 = __importDefault(require("../../../config"));
const hadith_model_1 = require("../hadith/hadith.model");
const dua_model_1 = require("../dua/dua.model");
const knowledge_library_model_1 = require("../knowledge-library/knowledge-library.model");
const quran_model_1 = require("../quran/quran.model");
const tafsir_model_1 = require("../tafsir/tafsir.model");
const knowledge_book_model_1 = require("../knowledge-library/knowledge-book.model");
const knowledge_fatwa_model_1 = require("../knowledge-library/knowledge-fatwa.model");
const offline_pack_model_1 = require("./offline-pack.model");
const batch_job_model_1 = require("./batch-job.model");
const gzip = (0, util_1.promisify)(zlib_1.default.gzip);
// ─── S3 Client ────────────────────────────────────────────────────────────────
const s3 = new client_s3_1.S3Client({
    region: config_1.default.aws.region || 'ap-southeast-1',
    credentials: {
        accessKeyId: config_1.default.aws.access_key_id,
        secretAccessKey: config_1.default.aws.secret_access_key,
    },
});
const BUCKET = config_1.default.aws.bucket_name;
const S3_PACK_PREFIX = 'offline-packs';
const getModuleData = async (module, lang) => {
    switch (module) {
        case 'hadith':
            return await hadith_model_1.Hadith.find({ lang, isActive: true }).lean();
        case 'dua':
            return await dua_model_1.Dua.find({ lang }).lean();
        case 'knowledge':
            return await knowledge_library_model_1.KnowledgeArticle.find({ lang }).lean();
        case 'quran':
            return await quran_model_1.Translation.find({ lang }).sort({ surah: 1, ayah: 1 }).lean();
        case 'tafsir':
            return await tafsir_model_1.Tafsir.find({ lang }).sort({ surah: 1, ayah: 1 }).lean();
        case 'book':
            return await knowledge_book_model_1.KnowledgeBook.find({ lang }).lean();
        case 'fatwa':
            return await knowledge_fatwa_model_1.KnowledgeFatwa.find({ lang }).lean();
        default:
            throw new Error(`Unsupported module: ${module}`);
    }
};
// ─── SHA-256 ──────────────────────────────────────────────────────────────────
const computeSha256 = (buffer) => crypto_1.default.createHash('sha256').update(buffer).digest('hex');
exports.computeSha256 = computeSha256;
// ─── S3 key helper ────────────────────────────────────────────────────────────
const buildS3Key = (module, lang, version) => `${S3_PACK_PREFIX}/${module}_${lang}_v${version}.json.gz`;
// ─── Upload to S3 ─────────────────────────────────────────────────────────────
const uploadToS3 = async (key, buffer, sha256) => {
    await s3.send(new client_s3_1.PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'application/octet-stream',
        ContentEncoding: 'gzip',
        Metadata: { sha256, generatedAt: new Date().toISOString() },
    }));
};
// ─── Presigned URL (7-day) ────────────────────────────────────────────────────
const getPresignedUrl = async (key) => {
    const cmd = new client_s3_1.GetObjectCommand({ Bucket: BUCKET, Key: key });
    return await (0, s3_request_presigner_1.getSignedUrl)(s3, cmd, { expiresIn: 7 * 24 * 3600 });
};
// ─── Existence check ──────────────────────────────────────────────────────────
const s3Exists = async (key) => {
    try {
        await s3.send(new client_s3_1.HeadObjectCommand({ Bucket: BUCKET, Key: key }));
        return true;
    }
    catch (_a) {
        return false;
    }
};
// ─── CORE: Generate, Compress, Upload ────────────────────────────────────────
const generateAndUploadPack = async (module, lang) => {
    var _a;
    const data = await getModuleData(module, lang);
    if (data.length === 0)
        throw new Error(`No data found in database for module "${module}" and language "${lang}". Please ensure content is added or translated first.`);
    const existing = await offline_pack_model_1.OfflinePack.findOne({ module, lang }).sort({ version: -1 });
    const version = ((_a = existing === null || existing === void 0 ? void 0 : existing.version) !== null && _a !== void 0 ? _a : 0) + 1;
    const json = JSON.stringify({ module, lang, version, generatedAt: new Date().toISOString(), data });
    const compressed = await gzip(Buffer.from(json, 'utf8'), { level: 9 });
    const sha256 = (0, exports.computeSha256)(compressed);
    const packSizeMb = parseFloat((compressed.byteLength / (1024 * 1024)).toFixed(3));
    const key = buildS3Key(module, lang, version);
    // 1. Always save locally to server disk (guarantees 100% availability for mobile streaming)
    const localDir = path_1.default.join(process.cwd(), 'uploads', 'offline-packs');
    if (!fs_1.default.existsSync(localDir))
        fs_1.default.mkdirSync(localDir, { recursive: true });
    const filename = `${module}_${lang}_v${version}.json.gz`;
    const localPath = path_1.default.join(localDir, filename);
    fs_1.default.writeFileSync(localPath, compressed);
    // 2. Try upload to AWS S3 if credentials permit
    let downloadUrl = `/api/v1/offline-pack/download/${module}?lang=${lang}`;
    try {
        await uploadToS3(key, compressed, sha256);
        downloadUrl = await getPresignedUrl(key);
        // 3. Clean up previous S3 object to prevent duplicate files accumulation
        if ((existing === null || existing === void 0 ? void 0 : existing.s3Key) && existing.s3Key !== key) {
            try {
                await s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: BUCKET, Key: existing.s3Key }));
                console.log(`[OfflinePack] 🧹 Cleaned up previous S3 pack version: ${existing.s3Key}`);
            }
            catch (cleanErr) {
                console.warn(`[OfflinePack] Notice: Old S3 pack cleanup (${existing.s3Key}):`, cleanErr === null || cleanErr === void 0 ? void 0 : cleanErr.message);
            }
        }
    }
    catch (s3Err) {
        console.warn(`[OfflinePack] Notice: S3 upload fallback to local storage for ${key} (${(s3Err === null || s3Err === void 0 ? void 0 : s3Err.message) || s3Err})`);
    }
    // Clean up previous local file version
    if ((existing === null || existing === void 0 ? void 0 : existing.version) && existing.version !== version) {
        const oldLocalFile = path_1.default.join(localDir, `${module}_${lang}_v${existing.version}.json.gz`);
        if (fs_1.default.existsSync(oldLocalFile)) {
            try {
                fs_1.default.unlinkSync(oldLocalFile);
            }
            catch (_b) { }
        }
    }
    await offline_pack_model_1.OfflinePack.findOneAndUpdate({ module, lang }, { module, lang, version, sha256, packSizeMb, s3Key: key, recordCount: data.length, generatedAt: new Date() }, { upsert: true, new: true });
    console.log(`[OfflinePack] ✅ Generated: ${key} | ${packSizeMb} MB | ${data.length} records | sha256: ${sha256.slice(0, 16)}...`);
    return { sha256, packSizeMb, version, s3Key: key, downloadUrl, recordCount: data.length };
};
// ─── Check Sync ───────────────────────────────────────────────────────────────
const checkSync = async (module, lang, clientVersion) => {
    const pack = await offline_pack_model_1.OfflinePack.findOne({ module, lang }).sort({ version: -1 });
    if (!pack) {
        return { updateAvailable: false, serverVersion: 0, clientVersion, packSizeMb: 0, sha256: '', downloadUrl: '', recordCount: 0 };
    }
    let downloadUrl = `/api/v1/offline-pack/download/${module}?lang=${lang}`;
    try {
        if (pack.version > clientVersion) {
            downloadUrl = await getPresignedUrl(pack.s3Key);
        }
    }
    catch (_a) {
        downloadUrl = `/api/v1/offline-pack/download/${module}?lang=${lang}`;
    }
    return {
        updateAvailable: pack.version > clientVersion,
        serverVersion: pack.version,
        clientVersion,
        packSizeMb: pack.packSizeMb,
        sha256: pack.sha256,
        downloadUrl,
        recordCount: pack.recordCount,
    };
};
// ─── Stream Pack from Local or S3 ─────────────────────────────────────────────
const getPackStream = async (module, lang) => {
    const pack = await offline_pack_model_1.OfflinePack.findOne({ module, lang }).sort({ version: -1 });
    if (!pack)
        throw new Error(`No pack found for module "${module}" and language "${lang}". Generate it first.`);
    const localDir = path_1.default.join(process.cwd(), 'uploads', 'offline-packs');
    const filename = `${module}_${lang}_v${pack.version}.json.gz`;
    const localPath = path_1.default.join(localDir, filename);
    if (fs_1.default.existsSync(localPath)) {
        const stream = fs_1.default.createReadStream(localPath);
        return { stream, sha256: pack.sha256, packSizeMb: pack.packSizeMb, version: pack.version };
    }
    // Fallback to S3 if file not on local disk
    const exists = await s3Exists(pack.s3Key);
    if (!exists)
        throw new Error(`Pack missing in storage: ${pack.s3Key}`);
    const res = await s3.send(new client_s3_1.GetObjectCommand({ Bucket: BUCKET, Key: pack.s3Key }));
    return { stream: res.Body, sha256: pack.sha256, packSizeMb: pack.packSizeMb, version: pack.version };
};
const listPacks = async () => {
    const packs = await offline_pack_model_1.OfflinePack.find({}).sort({ module: 1, lang: 1 }).lean();
    return packs.map((p) => ({
        ...p,
        downloadUrl: `/api/v1/offline-pack/download/${p.module}?lang=${p.lang}`,
    }));
};
// ─── Coverage Matrix (DB records + S3 packs + Active jobs per lang) ───────────
const getCoverageMatrix = async () => {
    const [hadithCounts, duaCounts, knowledgeCounts, quranCounts, tafsirCounts, bookCounts, fatwaCounts, packs, activeJobs,] = await Promise.all([
        hadith_model_1.Hadith.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$lang', count: { $sum: 1 } } }]),
        dua_model_1.Dua.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
        knowledge_library_model_1.KnowledgeArticle.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
        quran_model_1.Translation.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
        tafsir_model_1.Tafsir.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
        knowledge_book_model_1.KnowledgeBook.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
        knowledge_fatwa_model_1.KnowledgeFatwa.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
        offline_pack_model_1.OfflinePack.find({}).lean(),
        batch_job_model_1.BatchJob.find({ status: { $in: ['in_progress', 'validating', 'finalizing', 'completed'] } }).lean(),
    ]);
    const matrix = {};
    const ensureLang = (l) => {
        if (!matrix[l]) {
            matrix[l] = {
                hadithCount: 0,
                duaCount: 0,
                knowledgeCount: 0,
                quranCount: 0,
                tafsirCount: 0,
                bookCount: 0,
                fatwaCount: 0,
                activeJobs: {},
            };
        }
    };
    for (const h of hadithCounts) {
        if (h._id) {
            ensureLang(h._id);
            matrix[h._id].hadithCount = h.count;
        }
    }
    for (const d of duaCounts) {
        if (d._id) {
            ensureLang(d._id);
            matrix[d._id].duaCount = d.count;
        }
    }
    for (const k of knowledgeCounts) {
        if (k._id) {
            ensureLang(k._id);
            matrix[k._id].knowledgeCount = k.count;
        }
    }
    for (const q of quranCounts) {
        if (q._id) {
            ensureLang(q._id);
            matrix[q._id].quranCount = q.count;
        }
    }
    for (const t of tafsirCounts) {
        if (t._id) {
            ensureLang(t._id);
            matrix[t._id].tafsirCount = t.count;
        }
    }
    for (const b of bookCounts) {
        if (b._id) {
            ensureLang(b._id);
            matrix[b._id].bookCount = b.count;
        }
    }
    for (const f of fatwaCounts) {
        if (f._id) {
            ensureLang(f._id);
            matrix[f._id].fatwaCount = f.count;
        }
    }
    for (const p of packs) {
        if (p.lang) {
            ensureLang(p.lang);
            if (p.module === 'hadith')
                matrix[p.lang].hadithPack = p;
            if (p.module === 'dua')
                matrix[p.lang].duaPack = p;
            if (p.module === 'knowledge')
                matrix[p.lang].knowledgePack = p;
            if (p.module === 'quran')
                matrix[p.lang].quranPack = p;
            if (p.module === 'tafsir')
                matrix[p.lang].tafsirPack = p;
            if (p.module === 'book')
                matrix[p.lang].bookPack = p;
            if (p.module === 'fatwa')
                matrix[p.lang].fatwaPack = p;
        }
    }
    for (const j of activeJobs) {
        if (j.targetLang) {
            ensureLang(j.targetLang);
            if (matrix[j.targetLang].activeJobs) {
                matrix[j.targetLang].activeJobs[j.module] = j;
            }
        }
    }
    return matrix;
};
// ─── Available Languages (Online Public Discovery) ────────────────────────────
let availableLanguagesCache = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute memory cache
const getAvailableLanguages = async () => {
    const now = Date.now();
    if (availableLanguagesCache && now - availableLanguagesCache.timestamp < CACHE_TTL_MS) {
        return availableLanguagesCache.data;
    }
    const matrix = await getCoverageMatrix();
    const availableCodes = [];
    const languages = [];
    for (const [lang, stats] of Object.entries(matrix)) {
        const totalRecords = (stats.hadithCount || 0) +
            (stats.duaCount || 0) +
            (stats.knowledgeCount || 0) +
            (stats.quranCount || 0) +
            (stats.tafsirCount || 0) +
            (stats.bookCount || 0) +
            (stats.fatwaCount || 0);
        const hasAnyPack = !!(stats.hadithPack ||
            stats.duaPack ||
            stats.knowledgePack ||
            stats.quranPack ||
            stats.tafsirPack ||
            stats.bookPack ||
            stats.fatwaPack);
        if (totalRecords > 0 || hasAnyPack) {
            availableCodes.push(lang);
            const modules = [];
            if (stats.hadithCount > 0 || stats.hadithPack)
                modules.push('hadith');
            if (stats.duaCount > 0 || stats.duaPack)
                modules.push('dua');
            if (stats.knowledgeCount > 0 || stats.knowledgePack)
                modules.push('knowledge');
            if (stats.quranCount > 0 || stats.quranPack)
                modules.push('quran');
            if (stats.tafsirCount > 0 || stats.tafsirPack)
                modules.push('tafsir');
            if (stats.bookCount > 0 || stats.bookPack)
                modules.push('book');
            if (stats.fatwaCount > 0 || stats.fatwaPack)
                modules.push('fatwa');
            languages.push({
                code: lang,
                totalRecords,
                modules,
                hasPacks: hasAnyPack,
                details: {
                    hadithCount: stats.hadithCount,
                    duaCount: stats.duaCount,
                    knowledgeCount: stats.knowledgeCount,
                    quranCount: stats.quranCount,
                    tafsirCount: stats.tafsirCount,
                    bookCount: stats.bookCount,
                    fatwaCount: stats.fatwaCount,
                },
            });
        }
    }
    // Base fallback guarantee: ensure 'en' is always supported
    if (!availableCodes.includes('en')) {
        availableCodes.push('en');
        languages.push({
            code: 'en',
            totalRecords: 1,
            modules: ['hadith', 'dua', 'quran'],
            hasPacks: false,
            details: {},
        });
    }
    const result = {
        availableCodes,
        languages,
    };
    availableLanguagesCache = { timestamp: now, data: result };
    return result;
};
exports.OfflinePackService = {
    generateAndUploadPack,
    checkSync,
    getPackStream,
    listPacks,
    computeSha256: exports.computeSha256,
    getCoverageMatrix,
    getAvailableLanguages,
};
