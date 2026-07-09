import axios from 'axios';

async function testUrl() {
  const url = 'https://d1.islamhouse.com/data/de/ih_sounds/chain/das-aqidah-gedicht-al-haiyyah/de-01-das-aqidah-gedicht-al-haiyyah.mp3';
  try {
    console.log(`Checking IslamHouse audio link: ${url}`);
    const res = await axios.head(url);
    console.log(`Status: ${res.status}`);
    console.log(`Headers:`, res.headers);
  } catch (err: any) {
    console.log(`Error checking: ${err.message}`);
  }
}

testUrl();
