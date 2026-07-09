import { ISheikhContent } from './sheikh-content.interface';
import { SheikhContent } from './sheikh-content.model';

export const extractYoutubeIds = (url: string): { youtubeId?: string; playlistId?: string; channelHandle?: string } => {
  const result: { youtubeId?: string; playlistId?: string; channelHandle?: string } = {};
  if (!url) return result;

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

const getSpeakerContent = async (speakerName: string) => {
  // Case-insensitive search for speakerName
  const query = {
    speakerName: { $regex: new RegExp(`^${speakerName.trim()}$`, 'i') },
    isActive: true,
  };

  const contentList = await SheikhContent.find(query).lean();

  const videos = contentList.filter(item => item.type === 'video');
  const audioTravel = contentList.filter(item => item.type === 'audio_travel');

  return {
    speakerName,
    videos,
    audioTravel,
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
