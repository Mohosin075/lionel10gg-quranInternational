import axios from 'axios';

async function verifyChannelIds() {
  const ids = [
    'UCHAGrAeJPG3QRXTa0V5v9Ol',
    'UCY4bNa8fwU9WRzsJh84FA5A',
    'UCP9A7ZJf9F7tRR8sbCJk9MA',
    'UCEJSsCRgBIhMIzvTWwLHGlQ',
    'UC1aVmZ6d08yM2lidHFvd1Fo'
  ];
  
  for (const id of ids) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
    try {
      console.log(`Checking ${id}...`);
      const response = await axios.get(url, { timeout: 8000 });
      console.log(`Status: ${response.status}`);
      
      const titleMatch = response.data.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        console.log(`🎉 Found Title: ${titleMatch[1]}`);
      }
    } catch (err: any) {
      console.log(`Failed for ${id}: ${err.message}`);
    }
  }
}

verifyChannelIds();
