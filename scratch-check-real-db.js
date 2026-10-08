require('dotenv').config();
const mongoose = require('mongoose');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME;

async function checkRealDatabaseAndS3() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('====================================================');
    console.log('🔍 REAL DATABASE & S3 INTEGRITY CHECK');
    console.log(` Database Name : ${mongoose.connection.name}`);
    console.log(` S3 Bucket     : ${BUCKET}`);
    console.log('====================================================\n');

    const db = mongoose.connection.db;

    // 1. Check BatchJob Collection
    console.log('📦 1. RECENT BATCH TRANSLATION JOBS (batchjobs):');
    const jobs = await db.collection('batchjobs').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    if (jobs.length === 0) {
      console.log('   No batch jobs found yet in DB.');
    } else {
      jobs.forEach((j, i) => {
        console.log(`   [Job ${i + 1}] Module: ${j.module.toUpperCase()} | Lang: ${j.targetLang} | Status: ${j.status} | Processed: ${j.processedCount}/${j.recordCount} | JobId: ${j.batchId}`);
      });
    }
    console.log('');

    // 2. Check OfflinePack Collection
    console.log('🗂️ 2. PUBLISHED OFFLINE PACKS (offlinepacks):');
    const packs = await db.collection('offlinepacks').find({}).sort({ updatedAt: -1 }).limit(10).toArray();
    if (packs.length === 0) {
      console.log('   No offline packs found in DB.');
    } else {
      for (const p of packs) {
        let s3Status = 'NOT_CHECKED';
        if (p.s3Key) {
          try {
            await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: p.s3Key }));
            s3Status = '✅ EXISTS_IN_S3';
          } catch (err) {
            s3Status = `❌ MISSING_IN_S3 (${err.name || err.code})`;
          }
        }
        console.log(`   • ${p.module.padEnd(10)} | Lang: ${p.lang.padEnd(5)} | v${p.version} | ${p.packSizeMb} MB | Records: ${p.recordCount} | S3: ${s3Status}`);
      }
    }
    console.log('');

    // 3. Check Language Counts in Content Collections
    console.log('🌐 3. CONTENT COLLECTIONS TRANSLATIONS BY LANGUAGE:');
    const collections = [
      { name: 'hadiths', model: 'Hadith' },
      { name: 'duas', model: 'Dua' },
      { name: 'knowledgearticles', model: 'KnowledgeArticle' },
      { name: 'translations', model: 'Quran Translation' },
      { name: 'tafsirs', model: 'Tafsir' },
      { name: 'knowledgebooks', model: 'Book' },
      { name: 'knowledgefatwas', model: 'Fatwa' },
    ];

    for (const coll of collections) {
      const langCounts = await db.collection(coll.name).aggregate([
        { $group: { _id: '$lang', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      const langSummary = langCounts.map(l => `${l._id || 'null'}:${l.count}`).join(', ');
      console.log(`   • ${coll.name.padEnd(20)}: ${langSummary || 'Empty'}`);
    }

    console.log('\n====================================================');
    console.log('🎉 REAL DATA & S3 AUDIT COMPLETED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkRealDatabaseAndS3();
