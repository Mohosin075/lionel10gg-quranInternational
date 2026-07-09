import axios from 'axios';

async function testIslamhouseAudios() {
  const apiKey = 'paV29H2gm56kvLP';
  const url = `https://api3.islamhouse.com/v3/${apiKey}/main/audios/de/de/1/5/json`;
  
  try {
    console.log(`Fetching audios from: ${url}`);
    const response = await axios.get(url);
    console.log('Keys:', Object.keys(response.data));
    if (response.data.data && response.data.data.length > 0) {
      console.log('Found', response.data.data.length, 'audios.');
      console.log('Sample audio item:');
      console.log(JSON.stringify(response.data.data[0], null, 2));
    } else {
      console.log('No audios found:', JSON.stringify(response.data));
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testIslamhouseAudios();
