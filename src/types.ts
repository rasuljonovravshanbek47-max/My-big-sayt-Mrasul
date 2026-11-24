export type AgeCategory =
  | 'under_7'
  | '7_9'
  | '10_11'
  | '12_14'
  | '15_17'
  | '18_plus';

export interface AgeCategoryMeta {
  id: AgeCategory;
  label: string;
  shortLabel: string;
  minAge: number;
  description: string;
  guidance: string;
}

export const AGE_CATEGORIES: AgeCategoryMeta[] = [
  {
    id: 'under_7',
    label: 'Under 7 years',
    shortLabel: 'Under 7',
    minAge: 0,
    description: 'Gentle creative building, counting, memory matching, and safe exploration.',
    guidance: 'Parental supervision recommended for young explorers.',
  },
  {
    id: '7_9',
    label: '7–9 years',
    shortLabel: '7–9 yrs',
    minAge: 7,
    description: 'Logic puzzles, brain training, math sprints, creative voxel worlds, and friendly kart racing.',
    guidance: 'Parental guidance recommended for younger players.',
  },
  {
    id: '10_11',
    label: '10–11 years',
    shortLabel: '10–11 yrs',
    minAge: 10,
    description: 'Educational challenges, logic puzzles, non-violent racing, and creative sandboxes.',
    guidance: 'Parental guidance recommended for users under 12.',
  },
  {
    id: '12_14',
    label: '12–14 years',
    shortLabel: '12–14 yrs',
    minAge: 12,
    description: 'Sports competitions, adventure quests, strategy grids, and challenging puzzles.',
    guidance: 'Filtered to exclude 15+ and 18+ rated content.',
  },
  {
    id: '15_17',
    label: '15–17 years',
    shortLabel: '15–17 yrs',
    minAge: 15,
    description: 'Competitive multiplayer sports, advanced strategy, high-speed racing, and action.',
    guidance: 'Filtered to exclude adult 18+ rated content.',
  },
  {
    id: '18_plus',
    label: '18+ years',
    shortLabel: '18+',
    minAge: 18,
    description: 'Full catalog access subject to content ratings and platform guidelines.',
    guidance: 'Self-selected age preference.',
  },
];

export const GAME_CATEGORIES = [
  'Racing',
  'Football',
  'Sports',
  'Adventure',
  'Strategy',
  'Puzzle',
  'Brain Training',
  'Arcade',
  'Simulation',
  'Multiplayer',
  'Creative Games',
  'Educational Games',
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number];

export const MUSIC_GENRES = [
  'Pop',
  'Hip-Hop',
  'Rap',
  'Electronic',
  'Classical',
  'Rock',
  'Jazz',
  'Uzbek Music',
  'Turkish Music',
  'English Music',
  'Indian Music',
  'Korean Music',
] as const;

export type MusicGenre = (typeof MUSIC_GENRES)[number];

export type PlayableType =
  | 'mrasul-racing'
  | 'mrasul-penalty'
  | 'mrasul-puzzle'
  | 'mrasul-block-world'
  | 'mrasul-football-arena'
  | 'mrasul-math-sprint'
  | 'mrasul-memory-matrix'
  | 'mrasul-tactical-grid';

export interface GameItem {
  id: string;
  slug: string;
  title: string;
  category: GameCategory;
  ageRating: 'E' | '7+' | '10+' | '12+' | '15+' | '18+';
  minAgeGroup: AgeCategory;
  description: string;
  thumbnailUrl: string;
  playableType: PlayableType;
  tags: string[];
  rating: number;
  playsCount: number;
  isFeatured: boolean;
  createdAt: string;
}

export type MusicProvider = 'audius' | 'youtube' | 'itunes_preview' | 'indie_licensed';
export type PlaybackType = 'full_stream' | 'youtube_embed' | 'preview_30s' | 'external_link';

export interface MusicTrack {
  id: string;
  externalId?: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  durationSec: number;
  artworkUrl: string;
  provider: MusicProvider;
  playbackType: PlaybackType;
  streamUrl?: string;
  youtubeVideoId?: string;
  officialUrl?: string;
  playsCount: number;
  isFeatured: boolean;
  isTrending: boolean;
  licenseNote: string;
  accentColor?: string;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatarColor: string;
  avatarUrl?: string;
  ageCategory: AgeCategory | null;
  hasParentalPin: boolean;
  reducedMotion: boolean;
  theme: 'dark' | 'light';
  createdAt: string;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string;
  tracks: MusicTrack[];
  createdAt: string;
}

export interface FavoriteEntry {
  id: string;
  itemType: 'game' | 'music';
  itemId: string;
  itemSnapshot?: MusicTrack | GameItem;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  itemType: 'game' | 'music';
  itemId: string;
  itemSnapshot?: MusicTrack | GameItem;
  playedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserReport {
  id: string;
  userId: string;
  username?: string;
  itemType: 'game' | 'music';
  itemId: string;
  itemTitle?: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export interface ProviderStatus {
  audius: { connected: boolean; mode: string; note: string };
  itunes: { connected: boolean; mode: string; note: string };
  youtube: { embedReady: boolean; apiKeyConfigured: boolean; note: string };
  spotify: { configured: boolean; note: string };
}
