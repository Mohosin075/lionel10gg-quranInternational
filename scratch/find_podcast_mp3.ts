import axios from 'axios';

async function findPodcastMp3() {
  const url = 'https://islamiclectures.libsyn.com/rss';
  try {
    console.log('Fetching RSS feed...');
    const res = await axios.get(url);
    const xml = res.data;
    
    const matches = xml.match(/url="([^"]+\.mp3)"/g);
    if (matches) {
      console.log('Found MP3 URLs:');
      matches.slice(0, 10).forEach((m: string) => {
        console.log(m.replace('url="', '').replace('"', ''));
      });
    } else {
      console.log('No MP3 links found in RSS.');
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

findPodcastMp3();
