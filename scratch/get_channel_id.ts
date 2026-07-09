import axios from 'axios';

async function getChannelId() {
  const url = 'https://www.youtube.com/@abulbaraatube1927';
  try {
    console.log(`Fetching channel page: ${url}`);
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    });
    const html = res.data;
    
    // Look for channelId or externalChannelId patterns
    const match1 = html.match(/"channelId"\s*:\s*"([^"]+)"/);
    const match2 = html.match(/"externalId"\s*:\s*"([^"]+)"/);
    const match3 = html.match(/meta itemProp="channelId" content="([^"]+)"/);
    const match4 = html.match(/href="https:\/\/www\.youtube\.com\/channel\/([^"]+)"/);
    
    console.log('Match 1 ("channelId"):', match1 ? match1[1] : 'not found');
    console.log('Match 2 ("externalId"):', match2 ? match2[1] : 'not found');
    console.log('Match 3 (meta):', match3 ? match3[1] : 'not found');
    console.log('Match 4 (channel link):', match4 ? match4[1] : 'not found');
    
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

getChannelId();
