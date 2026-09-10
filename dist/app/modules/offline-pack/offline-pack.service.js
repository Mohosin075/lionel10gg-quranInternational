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
const hadith_model_1 = require("../hadith/hadith.model");
const dua_model_1 = require("../dua/dua.model");
const knowledge_library_model_1 = require("../knowledge-library/knowledge-library.model");
const offline_pack_model_1 = require("./offline-pack.model");
const batch_job_model_1 = require("./batch-job.model");
const gzip = (0, util_1.promisify)(zlib_1.default.gzip);
// ─── S3 Client ────────────────────────────────────────────────────────────────
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET = process.env.AWS_BUCKET_NAME;
const S3_PACK_PREFIX = 'offline-packs';
const getModuleData = async (module, lang) => {
    switch (module) {
        case 'hadith':
            return await hadith_model_1.Hadith.find({ lang, isActive: true }).lean();
        case 'dua':
            return await dua_model_1.Dua.find({ lang }).lean();
        case 'knowledge':
            return await knowledge_library_model_1.KnowledgeArticle.find({ lang }).lean();
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
    }
    catch (s3Err) {
        console.warn(`[OfflinePack] Notice: S3 upload fallback to local storage for ${key} (${(s3Err === null || s3Err === void 0 ? void 0 : s3Err.message) || s3Err})`);
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
    const [hadithCounts, duaCounts, knowledgeCounts, packs, activeJobs] = await Promise.all([
        hadith_model_1.Hadith.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$lang', count: { $sum: 1 } } }]),
        dua_model_1.Dua.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
        knowledge_library_model_1.KnowledgeArticle.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
        offline_pack_model_1.OfflinePack.find({}).lean(),
        batch_job_model_1.BatchJob.find({ status: { $in: ['in_progress', 'validating', 'finalizing', 'completed'] } }).lean(),
    ]);
    const matrix = {};
    const ensureLang = (l) => {
        if (!matrix[l]) {
            matrix[l] = { hadithCount: 0, duaCount: 0, knowledgeCount: 0, activeJobs: {} };
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
    for (const p of packs) {
        if (p.lang) {
            ensureLang(p.lang);
            if (p.module === 'hadith')
                matrix[p.lang].hadithPack = p;
            if (p.module === 'dua')
                matrix[p.lang].duaPack = p;
            if (p.module === 'knowledge')
                matrix[p.lang].knowledgePack = p;
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
exports.OfflinePackService = {
    generateAndUploadPack,
    checkSync,
    getPackStream,
    listPacks,
    computeSha256: exports.computeSha256,
    getCoverageMatrix,
};
