import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Bookmark, Highlight, LastRead } from './quran.model';
import { IAyah, IBookmark, IHighlight, ILastRead } from './quran.interface';

const BASE_URL = 'https://api.alquran.cloud/v1';

const fetchEditions = async (type?: string) => {
  const url = `${BASE_URL}/edition${type ? `?type=${type}` : ''}`;
  const response = await axios.get(url);
  return response.data.data;
};

const fetchSurahs = async () => {
  const response = await axios.get(`${BASE_URL}/surah`);
  return response.data.data;
};

const fetchSurahDetail = async (surahNumber: number, edition: string = 'en.sahih') => {
  // We fetch both uthmani (for Arabic) and the requested edition (for translation)
  const url = `${BASE_URL}/surah/${surahNumber}/editions/quran-uthmani,${edition}`;
  const response = await axios.get(url);
  
  const [arabic, translation] = response.data.data;
  
  // Merge them for easier frontend use
  const ayahs = arabic.ayahs.map((ayah: IAyah, index: number) => ({
    ...ayah,
    translation: translation.ayahs[index].text,
  }));

  return {
    ...arabic,
    ayahs,
    edition: translation.edition,
  };
};

const fetchJuz = async (juzNumber: number, edition: string = 'en.sahih') => {
  const url = `${BASE_URL}/juz/${juzNumber}/${edition}`;
  const response = await axios.get(url);
  return response.data.data;
};

const searchQuran = async (keyword: string, edition: string = 'en.sahih') => {
  const url = `${BASE_URL}/search/${encodeURIComponent(keyword)}/all/${edition}`;
  const response = await axios.get(url);
  return response.data.data;
};

const getDailyInspiration = async (edition: string = 'en.sahih') => {
  // Total ayahs are 6236
  const randomAyahNumber = Math.floor(Math.random() * 6236) + 1;
  const url = `${BASE_URL}/ayah/${randomAyahNumber}/${edition}`;
  const response = await axios.get(url);
  return response.data.data;
};

// Database Operations
const addBookmark = async (payload: IBookmark) => {
  const result = await Bookmark.findOneAndUpdate(
    { user: payload.user, surahNumber: payload.surahNumber, ayahNumber: payload.ayahNumber },
    payload,
    { upsert: true, new: true }
  );
  return result;
};

const getBookmarks = async (userId: string) => {
  return await Bookmark.find({ user: userId }).sort({ createdAt: -1 });
};

const removeBookmark = async (id: string, userId: string) => {
  const result = await Bookmark.findOneAndDelete({ _id: id, user: userId });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bookmark not found');
  }
  return result;
};

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

const updateLastRead = async (payload: ILastRead) => {
  const result = await LastRead.findOneAndUpdate(
    { user: payload.user },
    payload,
    { upsert: true, new: true }
  );
  return result;
};

const getLastRead = async (userId: string) => {
  return await LastRead.findOne({ user: userId });
};

export const QuranServices = {
  fetchEditions,
  fetchSurahs,
  fetchSurahDetail,
  fetchJuz,
  searchQuran,
  getDailyInspiration,
  addBookmark,
  getBookmarks,
  removeBookmark,
  addHighlight,
  getHighlights,
  updateLastRead,
  getLastRead,
};
