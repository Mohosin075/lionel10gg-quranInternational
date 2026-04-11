import { Highlight } from './highlight.model';
import { IHighlight } from './highlight.interface';

const addHighlight = async (payload: IHighlight) => {
  const result = await Highlight.findOneAndUpdate(
    { user: payload.user, surahNumber: payload.surahNumber, ayahNumber: payload.ayahNumber },
    payload,
    { upsert: true, new: true }
  );
  return result;
};

const getHighlights = async (userId: string) => {
  return await Highlight.find({ user: userId }).sort({ createdAt: -1 });
};

export const HighlightServices = {
  addHighlight,
  getHighlights,
};
