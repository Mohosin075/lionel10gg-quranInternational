"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflinePackService = exports.computeSha256 = void 0;
const crypto_1 = __importDefault(require("crypto"));
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const hadith_model_1 = require("../hadith/hadith.model");
const dua_model_1 = require("../dua/dua.model");
const knowledge_library_model_1 = require("../knowledge-library/knowledge-library.model");
const offline_pack_model_1 = require("./offline-pack.model");
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
        throw new Error(`No data for module="${module}" lang="${lang}"`);
    const existing = await offline_pack_model_1.OfflinePack.findOne({ module, lang }).sort({ version: -1 });
    const version = ((_a = existing === null || existing === void 0 ? void 0 : existing.version) !== null && _a !== void 0 ? _a : 0) + 1;
    const json = JSON.stringify({ module, lang, version, generatedAt: new Date().toISOString(), data });
    const compressed = await gzip(Buffer.from(json, 'utf8'), { level: 9 });
    const sha256 = (0, exports.computeSha256)(compressed);
    const packSizeMb = parseFloat((compressed.byteLength / (1024 * 1024)).toFixed(3));
    const key = buildS3Key(module, lang, version);
    await uploadToS3(key, compressed, sha256);
    const downloadUrl = await getPresignedUrl(key);
    await offline_pack_model_1.OfflinePack.findOneAndUpdate({ module, lang }, { module, lang, version, sha256, packSizeMb, s3Key: key, recordCount: data.length, generatedAt: new Date() }, { upsert: true, new: true });
    console.log(`[OfflinePack] ✅ ${key} | ${packSizeMb} MB | ${data.length} records | sha256: ${sha256.slice(0, 16)}...`);
    return { sha256, packSizeMb, version, s3Key: key, downloadUrl, recordCount: data.length };
};
// ─── Check Sync ───────────────────────────────────────────────────────────────
const checkSync = async (module, lang, clientVersion) => {
    const pack = await offline_pack_model_1.OfflinePack.findOne({ module, lang }).sort({ version: -1 });
    if (!pack) {
        return { updateAvailable: false, serverVersion: 0, clientVersion, packSizeMb: 0, sha256: '', downloadUrl: '', recordCount: 0 };
    }
    const downloadUrl = pack.version > clientVersion ? await getPresignedUrl(pack.s3Key) : '';
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
// ─── Stream Pack from S3 ──────────────────────────────────────────────────────
const getPackStream = async (module, lang) => {
    const pack = await offline_pack_model_1.OfflinePack.findOne({ module, lang }).sort({ version: -1 });
    if (!pack)
        throw new Error(`No pack found. Generate it first via POST /offline-pack/generate`);
    const exists = await s3Exists(pack.s3Key);
    if (!exists)
        throw new Error(`Pack missing in S3: ${pack.s3Key}`);
    const res = await s3.send(new client_s3_1.GetObjectCommand({ Bucket: BUCKET, Key: pack.s3Key }));
    return { stream: res.Body, sha256: pack.sha256, packSizeMb: pack.packSizeMb, version: pack.version };
};
// ─── List all packs ───────────────────────────────────────────────────────────
const listPacks = async () => offline_pack_model_1.OfflinePack.find({}).sort({ module: 1, lang: 1 }).lean();
exports.OfflinePackService = {
    generateAndUploadPack,
    checkSync,
    getPackStream,
    listPacks,
    computeSha256: exports.computeSha256,
};
