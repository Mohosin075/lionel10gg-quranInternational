require('dotenv').config();
const axios = require('axios');

async function testOpenAIKey() {
  const rawKey = process.env.OPENAI_API_KEY;
  const key = rawKey ? rawKey.trim() : '';

  console.log('----------------------------------------------------');
  console.log('🔍 Testing OpenAI API Key...');
  console.log('Is Key Present? :', Boolean(key));
  console.log('Key Length     :', key.length);
  if (key) {
    console.log('Key Prefix     :', key.slice(0, 10) + '...');
  }
  console.log('----------------------------------------------------');

  if (!key) {
    console.error('❌ OPENAI_API_KEY is not set in .env file!');
    return;
  }

  try {
    const res = await axios.get('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    console.log('✅ OpenAI API Key is 100% VALID & WORKING!');
    console.log(`Available models count: ${res.data.data.length}`);
  } catch (error) {
    console.log('----------------------------------------------------');
    console.error('❌ OPENAI API KEY TEST FAILED (HTTP 401)!');
    if (error.response) {
      console.error('Status Code   :', error.response.status);
      console.error('Error Details :', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error Message :', error.message);
    }
    console.log('----------------------------------------------------');
  }
}

testOpenAIKey();
