require('dotenv').config();
const mongoose = require('mongoose');

async function checkCollections() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('----------------------------------------------------');
    console.log(' Connected to MongoDB:', mongoose.connection.name);
    console.log('----------------------------------------------------');

    const db = mongoose.connection.db;

    const collections = [
      'hadiths',
      'duas',
      'knowledgearticles',
      'translations',
      'tafsirs',
      'knowledgebooks',
      'knowledgefatwas',
    ];

    for (const collName of collections) {
      try {
        const total = await db.collection(collName).countDocuments({});
        const enCount = await db.collection(collName).countDocuments({ lang: 'en' });
        const sample = await db.collection(collName).findOne({});
        console.log(
          `Collection "${collName.padEnd(20)}": Total = ${String(total).padStart(5)} | English (lang:'en') = ${String(enCount).padStart(5)} | Sample lang = ${sample ? (sample.lang || 'NO_LANG_FIELD') : 'EMPTY_COLLECTION'}`
        );
      } catch (err) {
        console.log(`Collection "${collName}": error (${err.message})`);
      }
    }
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkCollections();
