"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheikhContentServices = exports.extractYoutubeIds = void 0;
const axios_1 = __importDefault(require("axios"));
const sheikh_content_model_1 = require("./sheikh-content.model");
const extractYoutubeIds = (url) => {
    const result = {};
    if (!url)
        return result;
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
exports.extractYoutubeIds = extractYoutubeIds;
const createContent = async (payload) => {
    if (payload.type === 'video' && payload.url) {
        const { youtubeId, playlistId, channelHandle } = (0, exports.extractYoutubeIds)(payload.url);
        payload.youtubeId = youtubeId;
        payload.playlistId = playlistId;
        payload.channelHandle = channelHandle;
    }
    return await sheikh_content_model_1.SheikhContent.create(payload);
};
const updateContent = async (id, payload) => {
    if (payload.url && payload.type !== 'audio_travel') {
        const { youtubeId, playlistId, channelHandle } = (0, exports.extractYoutubeIds)(payload.url);
        payload.youtubeId = youtubeId;
        payload.playlistId = playlistId;
        payload.channelHandle = channelHandle;
    }
    return await sheikh_content_model_1.SheikhContent.findByIdAndUpdate(id, payload, { new: true });
};
const deleteContent = async (id) => {
    return await sheikh_content_model_1.SheikhContent.findByIdAndUpdate(id, { isActive: false }, { new: true });
};
/** Known channel IDs (verified Aug 2026 — OMF + Alim Hamza corrected). */
const SPEAKER_YOUTUBE_CHANNELS = {
    'abu alia': 'UCY4bNa8fwU9WRzsJh84FA5A',
    'abul baraa': 'UCRsfPhTdW-GBdqHjj-29tvQ',
    'pierre vogel': 'UCRkFMKQApHodjgV0IVuAXHQ',
    'one message foundation': 'UCvJyEIx_it2jFYP5M1OzGng',
    'alim hamza': 'UC477ugR0xa6V_ivtjGu0y6g',
};
/** Official handles for the 5 client channels. */
const SPEAKER_CHANNEL_HANDLES = {
    'abu alia': '@abu_alia',
    'abul baraa': '@abulbaraatube1927',
    'pierre vogel': '@pierrevogeloffiziell',
    'one message foundation': '@onemessagefoundation',
    'alim hamza': '@alimhamza1',
};
const YT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
};
const YT_CLIENT = {
    clientName: 'WEB',
    clientVersion: '2.20240815.00.00',
    hl: 'de',
    gl: 'DE',
};
const stripXmlTitle = (raw) => raw
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
const toApiVideo = (speakerName, id, title) => ({
    speakerName,
    type: 'video',
    title,
    url: `https://www.youtube.com/watch?v=${id}`,
    youtubeId: id,
    isActive: true,
});
const extractContinuationToken = (node, found) => {
    var _a, _b;
    if (!node || typeof node !== 'object' || found.token)
        return;
    if ((_a = node.continuationCommand) === null || _a === void 0 ? void 0 : _a.token) {
        found.token = node.continuationCommand.token;
        return;
    }
    if ((_b = node.nextContinuationData) === null || _b === void 0 ? void 0 : _b.continuation) {
        found.token = node.nextContinuationData.continuation;
        return;
    }
    if (Array.isArray(node)) {
        node.forEach(n => extractContinuationToken(n, found));
    }
    else {
        Object.values(node).forEach(n => extractContinuationToken(n, found));
    }
};
const walkYtVideos = (node, out, seen) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    if (!node || typeof node !== 'object')
        return;
    const lockup = node.lockupViewModel;
    if (lockup) {
        const id = lockup.contentId ||
            ((_e = (_d = (_c = (_b = (_a = lockup.rendererContext) === null || _a === void 0 ? void 0 : _a.commandContext) === null || _b === void 0 ? void 0 : _b.onTap) === null || _c === void 0 ? void 0 : _c.innertubeCommand) === null || _d === void 0 ? void 0 : _d.watchEndpoint) === null || _e === void 0 ? void 0 : _e.videoId) ||
            ((_h = (_g = (_f = lockup.onTap) === null || _f === void 0 ? void 0 : _f.innertubeCommand) === null || _g === void 0 ? void 0 : _g.watchEndpoint) === null || _h === void 0 ? void 0 : _h.videoId);
        const title = (_l = (_k = (_j = lockup.metadata) === null || _j === void 0 ? void 0 : _j.lockupMetadataViewModel) === null || _k === void 0 ? void 0 : _k.title) === null || _l === void 0 ? void 0 : _l.content;
        if (id && title && !seen.has(id)) {
            seen.add(id);
            out.push({ id, title: String(title).trim() });
        }
    }
    for (const key of ['videoRenderer', 'gridVideoRenderer', 'compactVideoRenderer']) {
        const vr = node[key];
        if (vr === null || vr === void 0 ? void 0 : vr.videoId) {
            const title = ((_p = (_o = (_m = vr.title) === null || _m === void 0 ? void 0 : _m.runs) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.text) || ((_q = vr.title) === null || _q === void 0 ? void 0 : _q.simpleText) || '';
            if (title && !seen.has(vr.videoId)) {
                seen.add(vr.videoId);
                out.push({ id: vr.videoId, title: String(title).trim() });
            }
        }
    }
    if (Array.isArray(node)) {
        node.forEach(n => walkYtVideos(n, out, seen));
    }
    else {
        Object.values(node).forEach(n => walkYtVideos(n, out, seen));
    }
};
const parseYtInitialData = (html) => {
    const marker = 'var ytInitialData = ';
    const start = html.indexOf(marker);
    if (start < 0)
        return { videos: [], continuation: null };
    const jsonStart = start + marker.length;
    let depth = 0;
    let end = -1;
    for (let i = jsonStart; i < html.length; i++) {
        const ch = html[i];
        if (ch === '{')
            depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) {
                end = i + 1;
                break;
            }
        }
    }
    if (end < 0)
        return { videos: [], continuation: null };
    try {
        const data = JSON.parse(html.slice(jsonStart, end));
        const videos = [];
        walkYtVideos(data, videos, new Set());
        const found = {};
        extractContinuationToken(data, found);
        return { videos, continuation: found.token || null };
    }
    catch (_a) {
        return { videos: [], continuation: null };
    }
};
const fetchVideosFromRss = async (channelId, speakerName, existingYoutubeIds) => {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssResponse = await axios_1.default.get(rssUrl, {
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
    const apiVideos = [];
    while ((match = entryRegex.exec(xml)) !== null) {
        const entryContent = match[1];
        const videoIdMatch = entryContent.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = entryContent.match(/<link[^>]+href="([^"]+)"/);
        if (videoIdMatch && titleMatch && linkMatch) {
            const ytId = videoIdMatch[1];
            if (existingYoutubeIds.has(ytId))
                continue;
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
/** First page of /videos + continuation token for lazy load. */
const fetchFirstPageFromChannel = async (handle, channelId, speakerName, existingYoutubeIds) => {
    const urls = [];
    if (handle)
        urls.push(`https://www.youtube.com/${handle}/videos`);
    if (channelId)
        urls.push(`https://www.youtube.com/channel/${channelId}/videos`);
    for (const url of urls) {
        try {
            const res = await axios_1.default.get(url, { timeout: 20000, headers: YT_HEADERS });
            const html = typeof res.data === 'string' ? res.data : '';
            const parsed = parseYtInitialData(html);
            if (!parsed.videos.length)
                continue;
            const apiVideos = [];
            for (const v of parsed.videos) {
                if (existingYoutubeIds.has(v.id))
                    continue;
                existingYoutubeIds.add(v.id);
                apiVideos.push(toApiVideo(speakerName, v.id, v.title));
            }
            return { videos: apiVideos, continuation: parsed.continuation };
        }
        catch (err) {
            console.warn(`⚠️ Channel page scrape failed (${url}): ${err.message}`);
        }
    }
    return { videos: [], continuation: null };
};
/** Next page via YouTube innertube continuation (lazy load). */
const fetchMoreFromContinuation = async (continuation, speakerName, existingYoutubeIds) => {
    const res = await axios_1.default.post('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
        context: { client: YT_CLIENT },
        continuation,
    }, {
        timeout: 20000,
        headers: {
            ...YT_HEADERS,
            'Content-Type': 'application/json',
            'X-Youtube-Client-Name': '1',
            'X-Youtube-Client-Version': YT_CLIENT.clientVersion,
        },
        validateStatus: () => true,
    });
    if (res.status !== 200) {
        throw new Error(`Continuation HTTP ${res.status}`);
    }
    const parsed = [];
    walkYtVideos(res.data, parsed, new Set());
    const found = {};
    extractContinuationToken(res.data, found);
    const apiVideos = [];
    for (const v of parsed) {
        if (existingYoutubeIds.has(v.id))
            continue;
        existingYoutubeIds.add(v.id);
        apiVideos.push(toApiVideo(speakerName, v.id, v.title));
    }
    return { videos: apiVideos, continuation: found.token || null };
};
const getSpeakerContent = async (speakerName) => {
    const query = {
        speakerName: { $regex: new RegExp(`^${speakerName.trim()}$`, 'i') },
        isActive: true,
    };
    const dbContentList = await sheikh_content_model_1.SheikhContent.find(query).lean();
    const dbVideos = dbContentList.filter(item => item.type === 'video');
    let videos = [];
    const key = speakerName.trim().toLowerCase();
    const channelId = SPEAKER_YOUTUBE_CHANNELS[key];
    const channelHandle = SPEAKER_CHANNEL_HANDLES[key];
    let continuation = null;
    const existingIds = new Set();
    // Prefer channel /videos page (supports lazy-load continuation)
    const page = await fetchFirstPageFromChannel(channelHandle, channelId, speakerName, existingIds);
    videos = [...page.videos];
    continuation = page.continuation;
    // RSS fallback / merge if page empty
    if (!videos.length && channelId) {
        try {
            const rssVideos = await fetchVideosFromRss(channelId, speakerName, existingIds);
            videos = [...rssVideos];
        }
        catch (err) {
            console.warn(`⚠️ RSS failed for ${speakerName} (${channelId}): ${err.message}`);
        }
    }
    // Append DB-only videos that weren't in live feed
    for (const dbv of dbVideos) {
        if (dbv.youtubeId && !existingIds.has(dbv.youtubeId)) {
            videos.push(dbv);
            existingIds.add(dbv.youtubeId);
        }
    }
    return {
        speakerName,
        videos: videos.filter(v => v.youtubeId),
        continuationToken: continuation,
        hasMore: Boolean(continuation),
        channelHandle: channelHandle || undefined,
        channelId: channelId || undefined,
    };
};
const getMoreSpeakerVideos = async (speakerName, continuation) => {
    if (!(continuation === null || continuation === void 0 ? void 0 : continuation.trim())) {
        return { speakerName, videos: [], continuationToken: null, hasMore: false };
    }
    const existingIds = new Set();
    const page = await fetchMoreFromContinuation(continuation.trim(), speakerName, existingIds);
    return {
        speakerName,
        videos: page.videos,
        continuationToken: page.continuation,
        hasMore: Boolean(page.continuation),
    };
};
const getAllContents = async () => {
    return await sheikh_content_model_1.SheikhContent.find({ isActive: true }).lean();
};
exports.SheikhContentServices = {
    createContent,
    updateContent,
    deleteContent,
    getSpeakerContent,
    getMoreSpeakerVideos,
    getAllContents,
};
