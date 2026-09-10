const mongoose = require('mongoose');
require('dotenv').config();

async function testS3() {
  console.log('AWS_REGION:', process.env.AWS_REGION);
  console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME);
  console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
  console.log('AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);

  await mongoose.connect(process.env.DATABASE_URL);
  console.log('MongoDB connected');

  // Let's test generating a pack for dua bn
  const { OfflinePackService } = require('./dist/app/modules/offline-pack/offline-pack.service');
  try {
    const res = await OfflinePackService.generateAndUploadPack('dua', 'bn');
    console.log('Success generating dua bn pack:', res);
  } catch (err) {
    console.error('Error generating dua bn pack:', err);
  }

  await mongoose.disconnect();
}

testS3().catch(console.error);
