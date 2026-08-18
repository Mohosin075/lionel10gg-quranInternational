import axios from 'axios';
import { ISheikhContent } from './sheikh-content.interface';
import { SheikhContent } from './sheikh-content.model';

export const extractYoutubeIds = (url: string): { youtubeId?: string; playlistId?: string; channelHandle?: string } => {
  const result: { youtubeId?: string; playlistId?: string; channelHandle?: string } = {};
  if (!url) return result;

  const playlistRegExp = /[?&]list=([^#\&\?]+)/;
  const playlistMatch = url.match(playlistRegExp);
  if (playlistMatch) {
    result.playlistId = playlistMatch[1];
  }

  const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const videoMatch = url.match(videoRegExp);
  if (videoMatch && videoMatch[2].length === 11) {
    result.youtubeId = videoMatch[2];
  }

  const handleRegExp = /youtube\.com\/(@[a-zA-Z0-9_-]+)/;
  const handleMatch = url.match(handleRegExp);
  if (handleMatch) {
    result.channelHandle = handleMatch[1];
  }

  return result;
};

const createContent = async (payload: ISheikhContent): Promise<ISheikhContent> => {
  if (payload.type === 'video' && payload.url) {
    const { youtubeId, playlistId, channelHandle } = extractYoutubeIds(payload.url);
    payload.youtubeId = youtubeId;
    payload.playlistId = playlistId;
    payload.channelHandle = channelHandle;
  }
  return await SheikhContent.create(payload);
};

const updateContent = async (id: string, payload: Partial<ISheikhContent>): Promise<ISheikhContent | null> => {
  if (payload.url && payload.type !== 'audio_travel') {
    const { youtubeId, playlistId, channelHandle } = extractYoutubeIds(payload.url);
    payload.youtubeId = youtubeId;
    payload.playlistId = playlistId;
    payload.channelHandle = channelHandle;
  }
  return await SheikhContent.findByIdAndUpdate(id, payload, { new: true });
};

const deleteContent = async (id: string): Promise<ISheikhContent | null> => {
  return await SheikhContent.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

/** Known channel IDs (may go stale — handle resolve is fallback). */
const SPEAKER_YOUTUBE_CHANNELS: Record<string, string> = {
  'abu alia': 'UCY4bNa8fwU9WRzsJh84FA5A',
  'abul baraa': 'UCRsfPhTdW-GBdqHjj-29tvQ',
  'pierre vogel': 'UCRkFMKQApHodjgV0IVuAXHQ',
  'one message foundation': 'UC6D0k5i21aKMN8cDgw8RNtg',
  'alim hamza': 'UC6dD8l_g824jUe-4360eT6A',
};

/** Official / working YouTube handles for the 5 client channels. */
const SPEAKER_CHANNEL_HANDLES: Record<string, string> = {
  'abu alia': '@abu_alia',
  'abul baraa': '@abulbaraatube1927',
  'pierre vogel': '@pierrevogeloffiziell',
  'one message foundation': '@onemessagefoundation',
  'alim hamza': '@AlimHamza',
};

const YT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

const stripXmlTitle = (raw: string): string =>
  raw
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();

const resolveChannelIdFromHandle = async (handle: string): Promise<string | null> => {
  try {
    const res = await axios.get(`https://www.youtube.com/${handle}`, {
      timeout: 12000,
      headers: YT_HEADERS,
    });
    const html = typeof res.data === 'string' ? res.data : '';
    const match =
      html.match(/"channelId"\s*:\s*"(UC[^"]+)"/) ||
      html.match(/"externalId"\s*:\s*"(UC[^"]+)"/) ||
      html.match(/meta itemprop="channelId" content="(UC[^"]+)"/i);
    return match?.[1] || null;
  } catch (err: any) {
    console.warn(`⚠️ resolveChannelIdFromHandle(${handle}): ${err.message}`);
    return null;
  }
};

const fetchVideosFromRss = async (
  channelId: string,
  speakerName: string,
  existingYoutubeIds: Set<string>,
): Promise<any[]> => {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const rssResponse = await axios.get(rssUrl, {
    timeout: 12000,
    headers: YT_HEADERS,
  });
  const xml = typeof rssResponse.data === 'string' ? rssResponse.data : '';
  if (!xml.includes('<entry>')) {
    throw new Error(`RSS empty/invalid for ${channelId}`);
  }

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  const apiVideos: any[] = [];

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryContent = match[1];
    const videoIdMatch = entryContent.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = entryContent.match(/<link[^>]+href="([^"]+)"/);

    if (videoIdMatch && titleMatch && linkMatch) {
      const ytId = videoIdMatch[1];
      if (existingYoutubeIds.has(ytId)) continue;
      existingYoutubeIds.add(ytId);
      apiVideos.push({
        speakerName,
        type: 'video',
        title: stripXmlTitle(titleMatch[1]),
        url: linkMatch[1],
        youtubeId: ytId,
        isActive: true,
      });
    }
  }

  return apiVideos;
};

const getSpeakerContent = async (speakerName: string) => {
  const query = {
    speakerName: { $regex: new RegExp(`^${speakerName.trim()}$`, 'i') },
    isActive: true,
  };

  const dbContentList = await SheikhContent.find(query).lean();
  const dbVideos = dbContentList.filter(item => item.type === 'video');
  const audioTravel = dbContentList.filter(item => item.type === 'audio_travel');

  let videos: any[] = [...dbVideos];
  const key = speakerName.trim().toLowerCase();
  let channelId: string | undefined = SPEAKER_YOUTUBE_CHANNELS[key];
  const channelHandle = SPEAKER_CHANNEL_HANDLES[key];

  const existingIds = new Set(
    dbVideos.map(v => v.youtubeId).filter(Boolean) as string[],
  );

  const tryFetch = async (id: string) => {
    const apiVideos = await fetchVideosFromRss(id, speakerName, existingIds);
    videos = [...apiVideos, ...videos];
    return apiVideos.length;
  };

  // 1) Hardcoded channel ID
  if (channelId) {
    try {
      await tryFetch(channelId);
    } catch (err: any) {
      console.warn(`⚠️ RSS failed for ${speakerName} (${channelId}): ${err.message}`);
      channelId = undefined;
    }
  }

  // 2) Resolve live channel ID from @handle if needed
  if (channelHandle && videos.filter(v => v.youtubeId).length <= dbVideos.filter(v => v.youtubeId).length) {
    const resolved = await resolveChannelIdFromHandle(channelHandle);
    if (resolved && resolved !== SPEAKER_YOUTUBE_CHANNELS[key]) {
      try {
        const added = await tryFetch(resolved);
        if (added > 0) channelId = resolved;
      } catch (err: any) {
        console.warn(`⚠️ RSS failed for resolved ${speakerName} (${resolved}): ${err.message}`);
      }
    } else if (resolved && !channelId) {
      try {
        await tryFetch(resolved);
        channelId = resolved;
      } catch (err: any) {
        console.warn(`⚠️ RSS failed for resolved ${speakerName} (${resolved}): ${err.message}`);
      }
    }
  }

  return {
    speakerName,
    videos,
    audioTravel,
    channelHandle: channelHandle || undefined,
    channelId: channelId || undefined,
  };
};

const getAllContents = async () => {
  return await SheikhContent.find({ isActive: true }).lean();
};

export const SheikhContentServices = {
  createContent,
  updateContent,
  deleteContent,
  getSpeakerContent,
  getAllContents,
};
