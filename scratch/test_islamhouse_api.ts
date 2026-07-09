import axios from 'axios';

async function testCount() {
  const apiKey = 'paV29H2gm56kvLP';
  const url = `https://api3.islamhouse.com/v3/${apiKey}/main/articles/de/de/1/1/json`;
  try {
    const response = await axios.get(url);
    console.log('Response keys:', Object.keys(response.data));
    console.log('Links details:', response.data.links);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testCount();
