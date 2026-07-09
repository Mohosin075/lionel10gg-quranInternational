import { Model, Types } from 'mongoose';

export interface ISheikhContent {
  _id?: Types.ObjectId;
  speakerName: string;
  type: 'video' | 'audio_travel';
  title: string;
  url: string;
  youtubeId?: string;
  playlistId?: string;
  channelHandle?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SheikhContentModel = Model<ISheikhContent>;
