import axios from 'axios';

async function testAlafasy() {
  const url = 'https://everyayah.com/data/Alafasy_128kbps/112001.mp3';
  try {
    console.log(`Checking Alafasy Audio: ${url}`);
    const res = await axios.head(url);
    console.log(`Status: ${res.status}`);
    console.log(`Headers:`, res.headers);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
  }
}

testAlafasy();
