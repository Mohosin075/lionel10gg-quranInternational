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

/** Known channel IDs (verified Aug 2026 — OMF + Alim Hamza corrected). */
const SPEAKER_YOUTUBE_CHANNELS: Record<string, string> = {
  'abu alia': 'UCY4bNa8fwU9WRzsJh84FA5A',
  'abul baraa': 'UCRsfPhTdW-GBdqHjj-29tvQ',
  'pierre vogel': 'UCRkFMKQApHodjgV0IVuAXHQ',
  'one message foundation': 'UCvJyEIx_it2jFYP5M1OzGng',
  'alim hamza': 'UC477ugR0xa6V_ivtjGu0y6g',
};

/** Official handles for the 5 client channels. */
const SPEAKER_CHANNEL_HANDLES: Record<string, string> = {
  'abu alia': '@abu_alia',
  'abul baraa': '@abulbaraatube1927',
  'pierre vogel': '@pierrevogeloffiziell',
  'one message foundation': '@onemessagefoundation',
  'alim hamza': '@alimhamza1',
};

const YT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
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
    // Prefer canonical/externalId — first channelId on page is often unrelated
    const external =
      html.match(/"externalId"\s*:\s*"(UC[^"]+)"/)?.[1] ||
      html.match(/rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[^"]+)"/i)?.[1] ||
      html.match(/"browseId"\s*:\s*"(UC[^"]+)"/)?.[1] ||
      null;
    return external;
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
    validateStatus: () => true,
  });
  if (rssResponse.status !== 200) {
    throw new Error(`RSS HTTP ${rssResponse.status} for ${channelId}`);
  }
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

/** Walk ytInitialData for classic + new lockupViewModel video cards. */
const walkYtVideos = (
  node: any,
  out: { id: string; title: string }[],
  seen: Set<string>,
): void => {
  if (!node || typeof node !== 'object') return;

  const lockup = node.lockupViewModel;
  if (lockup) {
    const id =
      lockup.contentId ||
      lockup.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId ||
      lockup.onTap?.innertubeCommand?.watchEndpoint?.videoId;
    const title = lockup.metadata?.lockupMetadataViewModel?.title?.content;
    if (id && title && !seen.has(id)) {
      seen.add(id);
      out.push({ id, title: String(title).trim() });
    }
  }

  for (const key of ['videoRenderer', 'gridVideoRenderer', 'compactVideoRenderer']) {
    const vr = node[key];
    if (vr?.videoId) {
      const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '';
      if (title && !seen.has(vr.videoId)) {
        seen.add(vr.videoId);
        out.push({ id: vr.videoId, title: String(title).trim() });
      }
    }
  }

  if (Array.isArray(node)) {
    node.forEach(n => walkYtVideos(n, out, seen));
  } else {
    Object.values(node).forEach(n => walkYtVideos(n, out, seen));
  }
};

const parseYtInitialDataVideos = (html: string): { id: string; title: string }[] => {
  const marker = 'var ytInitialData = ';
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const jsonStart = start + marker.length;
  let depth = 0;
  let end = -1;
  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) return [];
  try {
    const data = JSON.parse(html.slice(jsonStart, end));
    const out: { id: string; title: string }[] = [];
    walkYtVideos(data, out, new Set());
    return out;
  } catch {
    return [];
  }
};

/** Fallback when RSS is disabled/404 — scrape channel /videos page. */
const fetchVideosFromChannelPage = async (
  handle: string | undefined,
  channelId: string | undefined,
  speakerName: string,
  existingYoutubeIds: Set<string>,
): Promise<any[]> => {
  const urls: string[] = [];
  if (handle) urls.push(`https://www.youtube.com/${handle}/videos`);
  if (channelId) urls.push(`https://www.youtube.com/channel/${channelId}/videos`);

  for (const url of urls) {
    try {
      const res = await axios.get(url, { timeout: 20000, headers: YT_HEADERS });
      const html = typeof res.data === 'string' ? res.data : '';
      const parsed = parseYtInitialDataVideos(html);
      if (!parsed.length) continue;

      const apiVideos: any[] = [];
      for (const v of parsed) {
        if (existingYoutubeIds.has(v.id)) continue;
        existingYoutubeIds.add(v.id);
        apiVideos.push({
          speakerName,
          type: 'video',
          title: v.title,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          youtubeId: v.id,
          isActive: true,
        });
      }
      if (apiVideos.length) return apiVideos;
    } catch (err: any) {
      console.warn(`⚠️ Channel page scrape failed (${url}): ${err.message}`);
    }
  }
  return [];
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

  const lectureCount = () => videos.filter(v => v.youtubeId).length;
  const dbLectureCount = dbVideos.filter(v => v.youtubeId).length;

  // 1) Hardcoded channel ID via RSS
  if (channelId) {
    try {
      const apiVideos = await fetchVideosFromRss(channelId, speakerName, existingIds);
      videos = [...apiVideos, ...videos];
    } catch (err: any) {
      console.warn(`⚠️ RSS failed for ${speakerName} (${channelId}): ${err.message}`);
    }
  }

  // 2) Resolve live channel ID from @handle if still no fresh videos
  if (channelHandle && lectureCount() <= dbLectureCount) {
    const resolved = await resolveChannelIdFromHandle(channelHandle);
    if (resolved) {
      if (resolved !== channelId) {
        try {
          const apiVideos = await fetchVideosFromRss(resolved, speakerName, existingIds);
          videos = [...apiVideos, ...videos];
          if (apiVideos.length) channelId = resolved;
        } catch (err: any) {
          console.warn(`⚠️ RSS failed for resolved ${speakerName} (${resolved}): ${err.message}`);
          channelId = resolved;
        }
      } else if (!channelId) {
        channelId = resolved;
      }
    }
  }

  // 3) HTML scrape fallback (many DE channels return RSS 404)
  if (lectureCount() <= dbLectureCount) {
    try {
      const scraped = await fetchVideosFromChannelPage(
        channelHandle,
        channelId,
        speakerName,
        existingIds,
      );
      if (scraped.length) {
        videos = [...scraped, ...videos];
      }
    } catch (err: any) {
      console.warn(`⚠️ Scrape fallback failed for ${speakerName}: ${err.message}`);
    }
  }

  // Real lecture videos only in the list — never stamp channelHandle on them
  // (channelHandle on a video made the app treat it as a channel stub and hide everything)
  return {
    speakerName,
    videos: videos.filter(v => v.youtubeId || v.type === 'audio_travel'),
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
