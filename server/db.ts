import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import type { AgeCategory, GameItem, MusicTrack } from '../src/types.ts';

const DB_PATH = path.resolve(process.cwd(), 'mrasul_universe.db');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(secret, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar_color TEXT NOT NULL DEFAULT '#06b6d4',
      avatar_url TEXT DEFAULT '',
      age_category TEXT DEFAULT NULL,
      parental_pin_hash TEXT DEFAULT NULL,
      reduced_motion INTEGER NOT NULL DEFAULT 0,
      theme TEXT NOT NULL DEFAULT 'dark',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      age_rating TEXT NOT NULL,
      min_age_group TEXT NOT NULL,
      description TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      playable_type TEXT NOT NULL,
      tags TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 4.8,
      plays_count INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS music_tracks (
      id TEXT PRIMARY KEY,
      external_id TEXT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT NOT NULL,
      genre TEXT NOT NULL,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      artwork_url TEXT NOT NULL,
      provider TEXT NOT NULL,
      playback_type TEXT NOT NULL,
      stream_url TEXT,
      youtube_video_id TEXT,
      official_url TEXT,
      plays_count INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_trending INTEGER NOT NULL DEFAULT 0,
      license_note TEXT NOT NULL,
      accent_color TEXT DEFAULT '#06b6d4',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_snapshot TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, item_type, item_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      id TEXT PRIMARY KEY,
      playlist_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      track_snapshot TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL,
      FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recent_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_snapshot TEXT,
      played_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      query TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'All',
      searched_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_title TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories_meta (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(kind, name)
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const existingGames = db.prepare('SELECT COUNT(*) as cnt FROM games').get() as { cnt: number };
  if (existingGames.cnt === 0) {
    const now = new Date().toISOString();
    const insertGame = db.prepare(`
      INSERT INTO games (id, slug, title, category, age_rating, min_age_group, description, thumbnail_url, playable_type, tags, rating, plays_count, is_featured, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedGames: Array<Omit<GameItem, 'createdAt'>> = [
      {
        id: 'game-mrasul-racing',
        slug: 'mrasul-racing',
        title: 'MRASUL RACING',
        category: 'Racing',
        ageRating: '7+',
        minAgeGroup: '7_9',
        description: '3D high-speed orbital circuit racing with selectable hypercars, turbo boost lanes, and responsive keyboard or touch steering.',
        thumbnailUrl: '/src/assets/images/game_mrasul_racing_1795321098132.jpg',
        playableType: 'mrasul-racing',
        tags: ['racing', 'cars', '3d', 'drift', 'speed', 'track', 'hypercar'],
        rating: 4.9,
        playsCount: 18420,
        isFeatured: true,
      },
      {
        id: 'game-mrasul-penalty',
        slug: 'mrasul-penalty',
        title: 'MRASUL PENALTY',
        category: 'Football',
        ageRating: '7+',
        minAgeGroup: '7_9',
        description: 'Step up to the floodlit penalty spot against adaptive goalkeeper AI across three difficulty tiers.',
        thumbnailUrl: '/src/assets/images/game_mrasul_penalty_1795321099298.jpg',
        playableType: 'mrasul-penalty',
        tags: ['football', 'soccer', 'penalty', 'messi', 'goalkeeper', 'shootout', 'stadium'],
        rating: 4.9,
        playsCount: 16290,
        isFeatured: true,
      },
      {
        id: 'game-mrasul-puzzle',
        slug: 'mrasul-puzzle',
        title: 'MRASUL PUZZLE',
        category: 'Puzzle',
        ageRating: 'E',
        minAgeGroup: 'under_7',
        description: 'Interactive brain-training suite featuring sliding quantum grids and neural pattern sequence challenges.',
        thumbnailUrl: '/src/assets/images/game_mrasul_puzzle_1795321097810.jpg',
        playableType: 'mrasul-puzzle',
        tags: ['puzzle', 'logic', 'brain', 'memory', 'grid', 'thinking'],
        rating: 4.8,
        playsCount: 14110,
        isFeatured: true,
      },
      {
        id: 'game-mrasul-block-world',
        slug: 'mrasul-block-world',
        title: 'MRASUL BLOCK WORLD',
        category: 'Creative Games',
        ageRating: 'E',
        minAgeGroup: 'under_7',
        description: 'Creative 3D voxel building sandbox. Sculpt islands, place crystal blocks, and design structures in real-time 3D.',
        thumbnailUrl: '/src/assets/images/game_mrasul_block_world_1795321098604.jpg',
        playableType: 'mrasul-block-world',
        tags: ['minecraft', 'voxel', 'blocks', 'building', 'creative', 'sandbox', '3d'],
        rating: 4.9,
        playsCount: 21540,
        isFeatured: true,
      },
      {
        id: 'game-mrasul-football-arena',
        slug: 'mrasul-football-arena',
        title: 'MRASUL FOOTBALL ARENA',
        category: 'Sports',
        ageRating: '10+',
        minAgeGroup: '10_11',
        description: 'Timed precision shooting challenge inside an illuminated stadium arena with moving holographic target rings.',
        thumbnailUrl: '/src/assets/images/game_mrasul_football_arena_1795321098220.jpg',
        playableType: 'mrasul-football-arena',
        tags: ['football', 'soccer', 'sports', 'messi', 'arena', 'accuracy', 'timed'],
        rating: 4.8,
        playsCount: 13840,
        isFeatured: true,
      },
      {
        id: 'game-math-orbit-sprint',
        slug: 'math-orbit-sprint',
        title: 'Math Orbit Sprint',
        category: 'Educational Games',
        ageRating: 'E',
        minAgeGroup: 'under_7',
        description: 'Age-adaptive arithmetic and number-logic sprint designed to build mental speed and confidence.',
        thumbnailUrl: '/src/assets/images/game_mrasul_puzzle_1795321097810.jpg',
        playableType: 'mrasul-math-sprint',
        tags: ['math', 'educational', 'learning', 'numbers', 'kids', 'brain'],
        rating: 4.7,
        playsCount: 9320,
        isFeatured: false,
      },
      {
        id: 'game-memory-constellation',
        slug: 'memory-constellation',
        title: 'Memory Constellation',
        category: 'Brain Training',
        ageRating: 'E',
        minAgeGroup: 'under_7',
        description: 'Flip and pair celestial geometric emblems across progressive grids to sharpen visual recall.',
        thumbnailUrl: '/src/assets/images/game_mrasul_puzzle_1795321097810.jpg',
        playableType: 'mrasul-memory-matrix',
        tags: ['memory', 'brain training', 'matching', 'cards', 'kids', 'logic'],
        rating: 4.8,
        playsCount: 10850,
        isFeatured: false,
      },
      {
        id: 'game-junior-skyway-kart',
        slug: 'junior-skyway-kart',
        title: 'Junior Skyway Kart',
        category: 'Racing',
        ageRating: 'E',
        minAgeGroup: 'under_7',
        description: 'Friendly, bright-track 3D kart cruise built for younger racers with smooth steering and gentle speed pacing.',
        thumbnailUrl: '/src/assets/images/game_mrasul_racing_1795321098132.jpg',
        playableType: 'mrasul-racing',
        tags: ['racing', 'kart', 'kids', 'safe', 'cars', '3d'],
        rating: 4.7,
        playsCount: 8420,
        isFeatured: false,
      },
      {
        id: 'game-voxel-horizon-quest',
        slug: 'voxel-horizon-quest',
        title: 'Voxel Horizon Quest',
        category: 'Adventure',
        ageRating: '10+',
        minAgeGroup: '10_11',
        description: 'Explore elevated floating sky biomes and construct bridges and outposts across the 3D voxel archipelago.',
        thumbnailUrl: '/src/assets/images/game_mrasul_block_world_1795321098604.jpg',
        playableType: 'mrasul-block-world',
        tags: ['adventure', 'minecraft', 'voxel', 'explore', 'world', '3d'],
        rating: 4.8,
        playsCount: 11290,
        isFeatured: false,
      },
      {
        id: 'game-sector-strategy-grid',
        slug: 'sector-strategy-grid',
        title: 'Sector Strategy Grid',
        category: 'Strategy',
        ageRating: '12+',
        minAgeGroup: '12_14',
        description: 'Outsmart an adaptive tactical AI on a hexagonal-inspired energy grid by capturing sectors and blocking supply lines.',
        thumbnailUrl: '/src/assets/images/game_mrasul_puzzle_1795321097810.jpg',
        playableType: 'mrasul-tactical-grid',
        tags: ['strategy', 'tactics', 'board', 'capture', 'ai', 'thinking'],
        rating: 4.7,
        playsCount: 7640,
        isFeatured: false,
      },
      {
        id: 'game-apex-drift-sim',
        slug: 'apex-drift-sim',
        title: 'Apex Drift Simulation',
        category: 'Simulation',
        ageRating: '12+',
        minAgeGroup: '12_14',
        description: 'Precision night-circuit vehicle simulation focusing on cornering lines, turbo energy management, and clean laps.',
        thumbnailUrl: '/src/assets/images/game_mrasul_racing_1795321098132.jpg',
        playableType: 'mrasul-racing',
        tags: ['simulation', 'racing', 'cars', 'circuit', '3d'],
        rating: 4.8,
        playsCount: 9120,
        isFeatured: false,
      },
      {
        id: 'game-neon-arcade-striker',
        slug: 'neon-arcade-striker',
        title: 'Neon Arcade Striker',
        category: 'Arcade',
        ageRating: '12+',
        minAgeGroup: '12_14',
        description: 'Rapid-fire arcade target shooting in the stadium spotlight with combo multipliers and timed waves.',
        thumbnailUrl: '/src/assets/images/game_mrasul_football_arena_1795321098220.jpg',
        playableType: 'mrasul-football-arena',
        tags: ['arcade', 'football', 'messi', 'striker', 'targets', 'fast'],
        rating: 4.6,
        playsCount: 8210,
        isFeatured: false,
      },
      {
        id: 'game-champions-shootout-cup',
        slug: 'champions-shootout-cup',
        title: 'Champions Shootout Cup',
        category: 'Multiplayer',
        ageRating: '12+',
        minAgeGroup: '12_14',
        description: 'Two-player local pass-and-play or AI tournament penalty shootout with sudden-death tiebreakers.',
        thumbnailUrl: '/src/assets/images/game_mrasul_penalty_1795321099298.jpg',
        playableType: 'mrasul-penalty',
        tags: ['multiplayer', 'football', 'penalty', 'cup', 'versus', 'messi'],
        rating: 4.8,
        playsCount: 10340,
        isFeatured: false,
      },
      {
        id: 'game-quantum-command-elite',
        slug: 'quantum-command-elite',
        title: 'Quantum Command Elite',
        category: 'Strategy',
        ageRating: '18+',
        minAgeGroup: '18_plus',
        description: 'High-stakes tactical grid warfare against an aggressive grandmaster AI on an expanded orbital sector board.',
        thumbnailUrl: '/src/assets/images/game_mrasul_puzzle_1795321097810.jpg',
        playableType: 'mrasul-tactical-grid',
        tags: ['strategy', 'competitive', 'tactical', 'elite'],
        rating: 4.7,
        playsCount: 5410,
        isFeatured: false,
      },
    ];

    for (const g of seedGames) {
      insertGame.run(
        g.id,
        g.slug,
        g.title,
        g.category,
        g.ageRating,
        g.minAgeGroup,
        g.description,
        g.thumbnailUrl,
        g.playableType,
        JSON.stringify(g.tags),
        g.rating,
        g.playsCount,
        g.isFeatured ? 1 : 0,
        now
      );
    }
  }

  // Seed categories metadata
  const existingCats = db.prepare('SELECT COUNT(*) as cnt FROM categories_meta').get() as { cnt: number };
  if (existingCats.cnt === 0) {
    const insertCat = db.prepare('INSERT INTO categories_meta (id, kind, name, description, is_active) VALUES (?, ?, ?, ?, 1)');
    const gameCats = [
      'Racing', 'Football', 'Sports', 'Adventure', 'Strategy', 'Puzzle',
      'Brain Training', 'Arcade', 'Simulation', 'Multiplayer', 'Creative Games', 'Educational Games',
    ];
    for (const name of gameCats) {
      insertCat.run(`gcat-${name.toLowerCase().replace(/\s+/g, '-')}`, 'game', name, `${name} games in MRASUL UNIVERSE`);
    }
    const musicGenres = [
      'Pop', 'Hip-Hop', 'Rap', 'Electronic', 'Classical', 'Rock',
      'Jazz', 'Uzbek Music', 'Turkish Music', 'English Music', 'Indian Music', 'Korean Music',
    ];
    for (const name of musicGenres) {
      insertCat.run(`mcat-${name.toLowerCase().replace(/\s+/g, '-')}`, 'music', name, `${name} curated and live streams`);
    }
  }

  // Seed global welcome notification
  const existingNotifs = db.prepare('SELECT COUNT(*) as cnt FROM notifications').get() as { cnt: number };
  if (existingNotifs.cnt === 0) {
    db.prepare('INSERT INTO notifications (id, user_id, title, message, is_read, created_at) VALUES (?, NULL, ?, ?, 0, ?)').run(
      'notif-welcome-1',
      'Welcome to MRASUL UNIVERSE',
      'Explore 3D playable worlds, age-safe game filtering, and full-length music streaming via Audius & official embeds.',
      new Date().toISOString()
    );
  }
}

export const AGE_GROUP_ORDER: Record<AgeCategory, number> = {
  under_7: 0,
  '7_9': 1,
  '10_11': 2,
  '12_14': 3,
  '15_17': 4,
  '18_plus': 5,
};

export function isGameAllowedForAge(gameMinAge: AgeCategory, userAge: AgeCategory | null): boolean {
  if (!userAge) return true;
  const userRank = AGE_GROUP_ORDER[userAge] ?? 5;
  const gameRank = AGE_GROUP_ORDER[gameMinAge] ?? 0;
  // Users under 12 only see under-12 safe games (ranks 0, 1, 2)
  if (userRank <= 2) {
    return gameRank <= userRank;
  }
  // Users 12-17 never see 18+ games (rank 5)
  if (userRank <= 4) {
    return gameRank <= userRank && gameRank < 5;
  }
  return true;
}

export function rowToGame(row: any): GameItem {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags || '[]');
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    ageRating: row.age_rating,
    minAgeGroup: row.min_age_group,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    playableType: row.playable_type,
    tags,
    rating: Number(row.rating),
    playsCount: Number(row.plays_count),
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
  };
}

export function rowToTrack(row: any): MusicTrack {
  return {
    id: row.id,
    externalId: row.external_id || undefined,
    title: row.title,
    artist: row.artist,
    album: row.album,
    genre: row.genre,
    durationSec: Number(row.duration_sec || 0),
    artworkUrl: row.artwork_url,
    provider: row.provider,
    playbackType: row.playback_type,
    streamUrl: row.stream_url || undefined,
    youtubeVideoId: row.youtube_video_id || undefined,
    officialUrl: row.official_url || undefined,
    playsCount: Number(row.plays_count || 0),
    isFeatured: Boolean(row.is_featured),
    isTrending: Boolean(row.is_trending),
    licenseNote: row.license_note,
    accentColor: row.accent_color || '#06b6d4',
    createdAt: row.created_at,
  };
}
