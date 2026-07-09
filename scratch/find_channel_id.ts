import axios from 'axios';

async function findChannelId() {
  const url = 'https://www.youtube.com/@abu_alia';
  console.log(`Fetching channel page from: ${url}...`);
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = response.data;
    
    // Look for channel ID start (UC...)
    const matches = html.match(/UC[a-zA-Z0-9_-]{22}/g);
    if (matches && matches.length > 0) {
      console.log('=========================================');
      console.log('Matches found:', Array.from(new Set(matches)));
      console.log('=========================================');
    } else {
      console.log('Could not find any UC... channel ID match.');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

findChannelId();
