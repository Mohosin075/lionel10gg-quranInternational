import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Hadith } from '../hadith/hadith.model';
import { Dua } from '../dua/dua.model';
import { KnowledgeArticle } from '../knowledge-library/knowledge-library.model';
import { Translation } from '../quran/quran.model';
import { Tafsir } from '../tafsir/tafsir.model';
import { KnowledgeBook } from '../knowledge-library/knowledge-book.model';
import { KnowledgeFatwa } from '../knowledge-library/knowledge-fatwa.model';
import { OfflinePack } from './offline-pack.model';
import { BatchJob } from './batch-job.model';

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
export type SupportedModule =
  | 'hadith'
  | 'dua'
  | 'knowledge'
  | 'quran'
  | 'tafsir'
  | 'book'
  | 'fatwa';

const getModuleData = async (module: SupportedModule, lang: string): Promise<object[]> => {
  switch (module) {
    case 'hadith':
      return await Hadith.find({ lang, isActive: true }).lean();
    case 'dua':
      return await Dua.find({ lang }).lean();
    case 'knowledge':
      return await KnowledgeArticle.find({ lang }).lean();
    case 'quran':
      return await Translation.find({ lang }).sort({ surah: 1, ayah: 1 }).lean();
    case 'tafsir':
      return await Tafsir.find({ lang }).sort({ surah: 1, ayah: 1 }).lean();
    case 'book':
      return await KnowledgeBook.find({ lang }).lean();
    case 'fatwa':
      return await KnowledgeFatwa.find({ lang }).lean();
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
  if (data.length === 0) throw new Error(`No data found in database for module "${module}" and language "${lang}". Please ensure content is added or translated first.`);

  const existing = await OfflinePack.findOne({ module, lang }).sort({ version: -1 });
  const version = (existing?.version ?? 0) + 1;

  const json = JSON.stringify({ module, lang, version, generatedAt: new Date().toISOString(), data });
  const compressed: Buffer = await gzip(Buffer.from(json, 'utf8'), { level: 9 });

  const sha256 = computeSha256(compressed);
  const packSizeMb = parseFloat((compressed.byteLength / (1024 * 1024)).toFixed(3));
  const key = buildS3Key(module, lang, version);

  // 1. Always save locally to server disk (guarantees 100% availability for mobile streaming)
  const localDir = path.join(process.cwd(), 'uploads', 'offline-packs');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  const filename = `${module}_${lang}_v${version}.json.gz`;
  const localPath = path.join(localDir, filename);
  fs.writeFileSync(localPath, compressed);

  // 2. Try upload to AWS S3 if credentials permit
  let downloadUrl = `/api/v1/offline-pack/download/${module}?lang=${lang}`;
  try {
    await uploadToS3(key, compressed, sha256);
    downloadUrl = await getPresignedUrl(key);
  } catch (s3Err: any) {
    console.warn(`[OfflinePack] Notice: S3 upload fallback to local storage for ${key} (${s3Err?.message || s3Err})`);
  }

  await OfflinePack.findOneAndUpdate(
    { module, lang },
    { module, lang, version, sha256, packSizeMb, s3Key: key, recordCount: data.length, generatedAt: new Date() },
    { upsert: true, new: true },
  );

  console.log(`[OfflinePack] ✅ Generated: ${key} | ${packSizeMb} MB | ${data.length} records | sha256: ${sha256.slice(0, 16)}...`);
  return { sha256, packSizeMb, version, s3Key: key, downloadUrl, recordCount: data.length };
};

// ─── Check Sync ───────────────────────────────────────────────────────────────
const checkSync = async (module: SupportedModule, lang: string, clientVersion: number) => {
  const pack = await OfflinePack.findOne({ module, lang }).sort({ version: -1 });
  if (!pack) {
    return { updateAvailable: false, serverVersion: 0, clientVersion, packSizeMb: 0, sha256: '', downloadUrl: '', recordCount: 0 };
  }

  let downloadUrl = `/api/v1/offline-pack/download/${module}?lang=${lang}`;
  try {
    if (pack.version > clientVersion) {
      downloadUrl = await getPresignedUrl(pack.s3Key);
    }
  } catch {
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
const getPackStream = async (module: SupportedModule, lang: string) => {
  const pack = await OfflinePack.findOne({ module, lang }).sort({ version: -1 });
  if (!pack) throw new Error(`No pack found for module "${module}" and language "${lang}". Generate it first.`);

  const localDir = path.join(process.cwd(), 'uploads', 'offline-packs');
  const filename = `${module}_${lang}_v${pack.version}.json.gz`;
  const localPath = path.join(localDir, filename);

  if (fs.existsSync(localPath)) {
    const stream = fs.createReadStream(localPath);
    return { stream, sha256: pack.sha256, packSizeMb: pack.packSizeMb, version: pack.version };
  }

  // Fallback to S3 if file not on local disk
  const exists = await s3Exists(pack.s3Key);
  if (!exists) throw new Error(`Pack missing in storage: ${pack.s3Key}`);

  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: pack.s3Key }));
  return { stream: res.Body as NodeJS.ReadableStream, sha256: pack.sha256, packSizeMb: pack.packSizeMb, version: pack.version };
};

const listPacks = async () => {
  const packs = await OfflinePack.find({}).sort({ module: 1, lang: 1 }).lean();
  return packs.map((p: any) => ({
    ...p,
    downloadUrl: `/api/v1/offline-pack/download/${p.module}?lang=${p.lang}`,
  }));
};

// ─── Coverage Matrix (DB records + S3 packs + Active jobs per lang) ───────────
const getCoverageMatrix = async () => {
  const [
    hadithCounts,
    duaCounts,
    knowledgeCounts,
    quranCounts,
    tafsirCounts,
    bookCounts,
    fatwaCounts,
    packs,
    activeJobs,
  ] = await Promise.all([
    Hadith.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$lang', count: { $sum: 1 } } }]),
    Dua.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
    KnowledgeArticle.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
    Translation.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
    Tafsir.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
    KnowledgeBook.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
    KnowledgeFatwa.aggregate([{ $group: { _id: '$lang', count: { $sum: 1 } } }]),
    OfflinePack.find({}).lean(),
    BatchJob.find({ status: { $in: ['in_progress', 'validating', 'finalizing', 'completed'] } }).lean(),
  ]);

  const matrix: Record<
    string,
    {
      hadithCount: number;
      duaCount: number;
      knowledgeCount: number;
      quranCount: number;
      tafsirCount: number;
      bookCount: number;
      fatwaCount: number;
      hadithPack?: any;
      duaPack?: any;
      knowledgePack?: any;
      quranPack?: any;
      tafsirPack?: any;
      bookPack?: any;
      fatwaPack?: any;
      activeJobs?: Record<string, any>;
    }
  > = {};

  const ensureLang = (l: string) => {
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
      if (p.module === 'hadith') matrix[p.lang].hadithPack = p;
      if (p.module === 'dua') matrix[p.lang].duaPack = p;
      if (p.module === 'knowledge') matrix[p.lang].knowledgePack = p;
      if (p.module === 'quran') matrix[p.lang].quranPack = p;
      if (p.module === 'tafsir') matrix[p.lang].tafsirPack = p;
      if (p.module === 'book') matrix[p.lang].bookPack = p;
      if (p.module === 'fatwa') matrix[p.lang].fatwaPack = p;
    }
  }
  for (const j of activeJobs) {
    if (j.targetLang) {
      ensureLang(j.targetLang);
      if (matrix[j.targetLang].activeJobs) {
        matrix[j.targetLang].activeJobs![j.module] = j;
      }
    }
  }

  return matrix;
};

// ─── Available Languages (Online Public Discovery) ────────────────────────────
let availableLanguagesCache: { timestamp: number; data: any } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute memory cache

const getAvailableLanguages = async () => {
  const now = Date.now();
  if (availableLanguagesCache && now - availableLanguagesCache.timestamp < CACHE_TTL_MS) {
    return availableLanguagesCache.data;
  }

  const matrix = await getCoverageMatrix();
  const availableCodes: string[] = [];
  const languages: Array<{
    code: string;
    totalRecords: number;
    modules: string[];
    hasPacks: boolean;
    details: Record<string, number>;
  }> = [];

  for (const [lang, stats] of Object.entries(matrix)) {
    const totalRecords =
      (stats.hadithCount || 0) +
      (stats.duaCount || 0) +
      (stats.knowledgeCount || 0) +
      (stats.quranCount || 0) +
      (stats.tafsirCount || 0) +
      (stats.bookCount || 0) +
      (stats.fatwaCount || 0);

    const hasAnyPack = !!(
      stats.hadithPack ||
      stats.duaPack ||
      stats.knowledgePack ||
      stats.quranPack ||
      stats.tafsirPack ||
      stats.bookPack ||
      stats.fatwaPack
    );

    if (totalRecords > 0 || hasAnyPack) {
      availableCodes.push(lang);
      const modules: string[] = [];
      if (stats.hadithCount > 0 || stats.hadithPack) modules.push('hadith');
      if (stats.duaCount > 0 || stats.duaPack) modules.push('dua');
      if (stats.knowledgeCount > 0 || stats.knowledgePack) modules.push('knowledge');
      if (stats.quranCount > 0 || stats.quranPack) modules.push('quran');
      if (stats.tafsirCount > 0 || stats.tafsirPack) modules.push('tafsir');
      if (stats.bookCount > 0 || stats.bookPack) modules.push('book');
      if (stats.fatwaCount > 0 || stats.fatwaPack) modules.push('fatwa');

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

export const OfflinePackService = {
  generateAndUploadPack,
  checkSync,
  getPackStream,
  listPacks,
  computeSha256,
  getCoverageMatrix,
  getAvailableLanguages,
};

