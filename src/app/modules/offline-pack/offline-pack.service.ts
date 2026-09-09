import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Hadith } from '../hadith/hadith.model';
import { Dua } from '../dua/dua.model';
import { KnowledgeArticle } from '../knowledge-library/knowledge-library.model';
import { OfflinePack } from './offline-pack.model';

const gzip = promisify(zlib.gzip);

// ─── S3 Client ────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME!;
const S3_PACK_PREFIX = 'offline-packs';

// ─── Module → Model resolver ──────────────────────────────────────────────────
export type SupportedModule = 'hadith' | 'dua' | 'knowledge';

const getModuleData = async (module: SupportedModule, lang: string): Promise<object[]> => {
  switch (module) {
    case 'hadith':
      return await Hadith.find({ lang, isActive: true }).lean();
    case 'dua':
      return await Dua.find({ lang }).lean();
    case 'knowledge':
      return await KnowledgeArticle.find({ lang }).lean();
    default:
      throw new Error(`Unsupported module: ${module}`);
  }
};

// ─── SHA-256 ──────────────────────────────────────────────────────────────────
export const computeSha256 = (buffer: Buffer): string =>
  crypto.createHash('sha256').update(buffer).digest('hex');

// ─── S3 key helper ────────────────────────────────────────────────────────────
const buildS3Key = (module: string, lang: string, version: number) =>
  `${S3_PACK_PREFIX}/${module}_${lang}_v${version}.json.gz`;

// ─── Upload to S3 ─────────────────────────────────────────────────────────────
const uploadToS3 = async (key: string, buffer: Buffer, sha256: string): Promise<void> => {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/octet-stream',
      ContentEncoding: 'gzip',
      Metadata: { sha256, generatedAt: new Date().toISOString() },
    }),
  );
};

// ─── Presigned URL (7-day) ────────────────────────────────────────────────────
const getPresignedUrl = async (key: string): Promise<string> => {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return await getSignedUrl(s3, cmd, { expiresIn: 7 * 24 * 3600 });
};

// ─── Existence check ──────────────────────────────────────────────────────────
const s3Exists = async (key: string): Promise<boolean> => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
};

// ─── CORE: Generate, Compress, Upload ────────────────────────────────────────
const generateAndUploadPack = async (
  module: SupportedModule,
  lang: string,
): Promise<{ sha256: string; packSizeMb: number; version: number; s3Key: string; downloadUrl: string; recordCount: number }> => {
  const data = await getModuleData(module, lang);
  if (data.length === 0) throw new Error(`No data for module="${module}" lang="${lang}"`);

  const existing = await OfflinePack.findOne({ module, lang }).sort({ version: -1 });
  const version = (existing?.version ?? 0) + 1;

  const json = JSON.stringify({ module, lang, version, generatedAt: new Date().toISOString(), data });
  const compressed: Buffer = await gzip(Buffer.from(json, 'utf8'), { level: 9 });

  const sha256 = computeSha256(compressed);
  const packSizeMb = parseFloat((compressed.byteLength / (1024 * 1024)).toFixed(3));
  const key = buildS3Key(module, lang, version);

  await uploadToS3(key, compressed, sha256);
  const downloadUrl = await getPresignedUrl(key);

  await OfflinePack.findOneAndUpdate(
    { module, lang },
    { module, lang, version, sha256, packSizeMb, s3Key: key, recordCount: data.length, generatedAt: new Date() },
    { upsert: true, new: true },
  );

  console.log(`[OfflinePack] ✅ ${key} | ${packSizeMb} MB | ${data.length} records | sha256: ${sha256.slice(0, 16)}...`);
  return { sha256, packSizeMb, version, s3Key: key, downloadUrl, recordCount: data.length };
};

// ─── Check Sync ───────────────────────────────────────────────────────────────
const checkSync = async (module: SupportedModule, lang: string, clientVersion: number) => {
  const pack = await OfflinePack.findOne({ module, lang }).sort({ version: -1 });
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
const getPackStream = async (module: SupportedModule, lang: string) => {
  const pack = await OfflinePack.findOne({ module, lang }).sort({ version: -1 });
  if (!pack) throw new Error(`No pack found. Generate it first via POST /offline-pack/generate`);
  const exists = await s3Exists(pack.s3Key);
  if (!exists) throw new Error(`Pack missing in S3: ${pack.s3Key}`);

  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: pack.s3Key }));
  return { stream: res.Body as NodeJS.ReadableStream, sha256: pack.sha256, packSizeMb: pack.packSizeMb, version: pack.version };
};

// ─── List all packs ───────────────────────────────────────────────────────────
const listPacks = async () => OfflinePack.find({}).sort({ module: 1, lang: 1 }).lean();

export const OfflinePackService = {
  generateAndUploadPack,
  checkSync,
  getPackStream,
  listPacks,
  computeSha256,
};
