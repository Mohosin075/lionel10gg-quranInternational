import axios from 'axios';

async function testRssParser() {
  const channelId = 'UCY4bNa8fwU9WRzsJh84FA5A';
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    console.log('Fetching RSS feed...');
    const response = await axios.get(url);
    const xml = response.data;
    
    // Match all entries
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    const videos = [];
    
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryContent = match[1];
      
      const videoIdMatch = entryContent.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entryContent.match(/<title>([^<]+)<\/title>/);
      const linkMatch = entryContent.match(/<link[^>]+href="([^"]+)"/);
      
      if (videoIdMatch && titleMatch && linkMatch) {
        videos.push({
          youtubeId: videoIdMatch[1],
          title: titleMatch[1],
          url: linkMatch[1]
        });
      }
    }
    
    console.log(`Parsed ${videos.length} videos from RSS feed.`);
    console.log('Sample parsed videos:', JSON.stringify(videos.slice(0, 3), null, 2));
  } catch (err: any) {
    console.error('Error parsing feed:', err.message);
  }
}

testRssParser();
