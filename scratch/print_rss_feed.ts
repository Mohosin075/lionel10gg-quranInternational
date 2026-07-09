import axios from 'axios';

async function printRssFeed() {
  const channelId = 'UCY4bNa8fwU9WRzsJh84FA5A';
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const response = await axios.get(url);
    console.log('XML snippet:');
    console.log(response.data.substring(0, 2000));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

printRssFeed();
