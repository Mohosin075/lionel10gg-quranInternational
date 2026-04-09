import { Types } from 'mongoose';

export type IPrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface IPrayerTime {
  name: IPrayerName;
  time: string;
  isActive: boolean;
}

export interface IAdhanRecitation {
  id: string;
  name: string;
  location: string;
  audioUrl: string;
}

export interface IUserPrayerSettings {
  user: Types.ObjectId;
  location: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  activePrayers: IPrayerName[];
  selectedRecitationId: string;
}
