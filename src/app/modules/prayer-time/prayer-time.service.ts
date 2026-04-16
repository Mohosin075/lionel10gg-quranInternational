import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { PrayerSettings } from './prayer-time.model';
import {
  IAdhanRecitation,
  IUserPrayerSettings,
} from './prayer-time.interface';

const BASE_URL = 'https://api.aladhan.com/v1';

const adhanRecitations: IAdhanRecitation[] = [
  {
    id: 'makkah',
    name: 'Makkah',
    location: 'HARAM AL-MAKKI',
    audioUrl: 'https://download.quranicaudio.com/adhan/makkah.mp3',
  },
  {
    id: 'madinah',
    name: 'Madinah',
    location: 'HARAM AL-MADANI',
    audioUrl: 'https://download.quranicaudio.com/adhan/madinah.mp3',
  },
  {
    id: 'al-aqsa',
    name: 'Al-Aqsa',
    location: 'QUDS',
    audioUrl: 'https://download.quranicaudio.com/adhan/aqsa.mp3',
  },
  {
    id: 'egypt',
    name: 'Egypt',
    location: 'AL-AZHAR',
    audioUrl: 'https://download.quranicaudio.com/adhan/egypt.mp3',
  },
  {
    id: 'turkey',
    name: 'Turkey',
    location: 'BLUE MOSQUE',
    audioUrl: 'https://download.quranicaudio.com/adhan/turkey.mp3',
  },
];

const getPrayerTimes = async (city: string, country: string) => {
  try {
    const response = await axios.get(`${BASE_URL}/timingsByCity`, {
      params: {
        city,
        country,
        method: 2, // ISNA or other methods can be configured
      },
    });

    const timings = response.data.data.timings;
    return {
      Fajr: timings.Fajr,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
      date: response.data.data.date.readable,
      timezone: response.data.data.meta.timezone,
    };
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to fetch prayer times');
  }
};

const getPrayerSettings = async (userId?: string) => {
  if (!userId) {
    return {
      location: { city: 'Dhaka', country: 'Bangladesh' },
      calculationMethod: 'ISNA',
      activePrayers: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
      selectedRecitationId: 'makkah',
    };
  }
  let settings = await PrayerSettings.findOne({ user: userId });
  if (!settings) {
    settings = await PrayerSettings.create({ user: userId });
  }
  return settings;
};

const updatePrayerSettings = async (
  userId: string,
  payload: Partial<IUserPrayerSettings>,
) => {
  const result = await PrayerSettings.findOneAndUpdate(
    { user: userId },
    { $set: payload },
    { new: true, upsert: true },
  );
  return result;
};

const getAdhanRecitations = () => {
  return adhanRecitations;
};

export const PrayerTimeServices = {
  getPrayerTimes,
  getPrayerSettings,
  updatePrayerSettings,
  getAdhanRecitations,
};
