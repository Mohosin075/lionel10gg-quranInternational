const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const gzip = promisify(zlib.gzip);

async function generateAllAvailable() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('MongoDB connected');

  const Hadith = mongoose.model('Hadith', new mongoose.Schema({ lang: String, isActive: Boolean }, { strict: false }));
  const Dua = mongoose.model('Dua', new mongoose.Schema({ lang: String }, { strict: false }));
  const KnowledgeArticle = mongoose.model('KnowledgeArticle', new mongoose.Schema({ lang: String }, { strict: false }));
  const OfflinePack = mongoose.model('OfflinePack', new mongoose.Schema({
    module: String,
    lang: String,
    version: Number,
    sha256: String,
    packSizeMb: Number,
    s3Key: String,
    recordCount: Number,
    generatedAt: Date
  }, { timestamps: true }));

  const targets = [
    { module: 'dua', lang: 'en', model: Dua },
    { module: 'dua', lang: 'ar', model: Dua },
    { module: 'hadith', lang: 'en', model: Hadith },
    { module: 'knowledge', lang: 'de', model: KnowledgeArticle },
  ];

  const localDir = path.join(process.cwd(), 'uploads', 'offline-packs');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  for (const t of targets) {
    const filter = t.module === 'hadith' ? { lang: t.lang, isActive: true } : { lang: t.lang };
    const data = await t.model.find(filter).lean();
    if (data.length === 0) continue;

    const version = 1;
    const json = JSON.stringify({ module: t.module, lang: t.lang, version, generatedAt: new Date().toISOString(), data });
    const compressed = await gzip(Buffer.from(json, 'utf8'), { level: 9 });

    const sha256 = crypto.createHash('sha256').update(compressed).digest('hex');
    const packSizeMb = parseFloat((compressed.byteLength / (1024 * 1024)).toFixed(3));
    const key = `offline-packs/${t.module}_${t.lang}_v${version}.json.gz`;

    const localPath = path.join(localDir, `${t.module}_${t.lang}_v${version}.json.gz`);
    fs.writeFileSync(localPath, compressed);

    await OfflinePack.findOneAndUpdate(
      { module: t.module, lang: t.lang },
      { module: t.module, lang: t.lang, version, sha256, packSizeMb, s3Key: key, recordCount: data.length, generatedAt: new Date() },
      { upsert: true, new: true }
    );
    console.log(`Generated ${t.module} [${t.lang}]: ${data.length} records, ${packSizeMb} MB`);
  }

  const allPacks = await OfflinePack.find({}).lean();
  console.log(`Total offline packs now available: ${allPacks.length}`);

  await mongoose.disconnect();
}

generateAllAvailable().catch(console.error);
