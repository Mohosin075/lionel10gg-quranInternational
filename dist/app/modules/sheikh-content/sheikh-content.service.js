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
    // Extract playlist ID if list parameter exists
    const playlistRegExp = /[?&]list=([^#\&\?]+)/;
    const playlistMatch = url.match(playlistRegExp);
    if (playlistMatch) {
        result.playlistId = playlistMatch[1];
    }
    // Match video ID from watch, short link, embed, shorts
    const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const videoMatch = url.match(videoRegExp);
    if (videoMatch && videoMatch[2].length === 11) {
        result.youtubeId = videoMatch[2];
    }
    // Extract channel handle (e.g. @abu_alia)
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
const SPEAKER_YOUTUBE_CHANNELS = {
    'abu alia': 'UCY4bNa8fwU9WRzsJh84FA5A',
    'abul baraa': 'UCRsfPhTdW-GBdqHjj-29tvQ',
    'pierre vogel': 'UCPierreVogeloffiziell', // handle: @PierreVogeloffiziell — replace with exact UC ID after confirming from YouTube dashboard
    'one message foundation': 'UCvJyEIx_it2jFYP5M1OzGng',
    'alim hamza': 'UCAlimHamzaOfficial', // handle: @AlimHamzaOfficial — replace with exact UC ID after confirming from YouTube dashboard
};
const getSpeakerContent = async (speakerName) => {
    // Case-insensitive search for speakerName in database
    const query = {
        speakerName: { $regex: new RegExp(`^${speakerName.trim()}$`, 'i') },
        isActive: true,
    };
    const dbContentList = await sheikh_content_model_1.SheikhContent.find(query).lean();
    const dbVideos = dbContentList.filter(item => item.type === 'video');
    const audioTravel = dbContentList.filter(item => item.type === 'audio_travel');
    let videos = [...dbVideos];
    const channelId = SPEAKER_YOUTUBE_CHANNELS[speakerName.trim().toLowerCase()];
    if (channelId) {
        try {
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            const rssResponse = await axios_1.default.get(rssUrl, { timeout: 5000 });
            const xml = rssResponse.data;
            const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
            let match;
            const apiVideos = [];
            while ((match = entryRegex.exec(xml)) !== null) {
                const entryContent = match[1];
                const videoIdMatch = entryContent.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
                const titleMatch = entryContent.match(/<title>([^<]+)<\/title>/);
                const linkMatch = entryContent.match(/<link[^>]+href="([^"]+)"/);
                if (videoIdMatch && titleMatch && linkMatch) {
                    const ytId = videoIdMatch[1];
                    // Check if this video is already present in DB videos (to avoid duplication)
                    const isDuplicate = dbVideos.some(v => v.youtubeId === ytId);
                    if (!isDuplicate) {
                        apiVideos.push({
                            speakerName,
                            type: 'video',
                            title: titleMatch[1],
                            url: linkMatch[1],
                            youtubeId: ytId,
                            isActive: true,
                        });
                    }
                }
            }
            // Prepend dynamic API videos so the newest YouTube uploads show first
            videos = [...apiVideos, ...videos];
        }
        catch (err) {
            console.warn(`⚠️ Failed to fetch YouTube RSS feed for speaker ${speakerName}: ${err.message}`);
        }
    }
    return {
        speakerName,
        videos,
        audioTravel,
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
    getAllContents,
};
