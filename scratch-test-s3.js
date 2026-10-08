require('dotenv').config();
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME;
const TEST_KEY = 'test-permission-check.txt';

async function runS3PermissionTest() {
  console.log('----------------------------------------------------');
  console.log('🔍 Testing AWS S3 Credentials & Permissions...');
  console.log(`Bucket Name : ${BUCKET}`);
  console.log(`Region      : ${process.env.AWS_REGION}`);
  console.log('----------------------------------------------------');

  try {
    // 1. Test PutObject (Upload)
    console.log('1️⃣ Testing s3:PutObject...');
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: TEST_KEY,
        Body: Buffer.from('Testing AWS S3 IAM permissions', 'utf8'),
        ContentType: 'text/plain',
      })
    );
    console.log('   ✅ s3:PutObject Permission: SUCCESS (Upload worked)');

    // 2. Test HeadObject (Check Existence)
    console.log('2️⃣ Testing s3:HeadObject...');
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: TEST_KEY,
      })
    );
    console.log('   ✅ s3:HeadObject Permission: SUCCESS (Check worked)');

    // 3. Test GetObject (Download)
    console.log('3️⃣ Testing s3:GetObject...');
    await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: TEST_KEY,
      })
    );
    console.log('   ✅ s3:GetObject Permission: SUCCESS (Download worked)');

    // 4. Test DeleteObject (Delete)
    console.log('4️⃣ Testing s3:DeleteObject...');
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: TEST_KEY,
      })
    );
    console.log('   ✅ s3:DeleteObject Permission: SUCCESS (Delete worked)');

    console.log('----------------------------------------------------');
    console.log('🎉 ALL 4 S3 PERMISSIONS ARE 100% WORKING & VERIFIED!');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.log('----------------------------------------------------');
    console.error('❌ S3 PERMISSION TEST FAILED!');
    console.error('Error Code   :', error.name || error.code);
    console.error('Error Message:', error.message);
    if (error.$metadata) {
      console.error('HTTP Status  :', error.$metadata.httpStatusCode);
    }
    console.log('----------------------------------------------------');
  }
}

runS3PermissionTest();
