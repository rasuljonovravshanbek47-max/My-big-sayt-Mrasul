import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  db,
  initDatabase,
  hashSecret,
  verifySecret,
  isGameAllowedForAge,
  rowToGame,
  rowToTrack,
} from './server/db.ts';
import {
  fetchAudiusTrending,
  searchAudiusTracks,
  searchItunesTracks,
  searchYoutubeTracks,
  getProviderStatus,
} from './server/musicProviders.ts';
import type { AgeCategory, GameItem, MusicTrack, UserProfile } from './src/types.ts';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'rasuljonovravshanbek47@gmail.com').toLowerCase();

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

interface SessionPayload {
  uid: string;
  exp: number;
}

function signToken(uid: string): string {
  const payload: SessionPayload = {
    uid,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14, // 14 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.uid || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function rowToUser(row: any): UserProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role === 'admin' ? 'admin' : 'user',
    avatarColor: row.avatar_color || '#06b6d4',
    avatarUrl: row.avatar_url || '',
    ageCategory: (row.age_category as AgeCategory) || null,
    hasParentalPin: Boolean(row.parental_pin_hash),
    reducedMotion: Boolean(row.reduced_motion),
    theme: row.theme === 'light' ? 'light' : 'dark',
    createdAt: row.created_at,
  };
}

interface AuthedRequest extends Request {
  user?: UserProfile | null;
}

function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  let token = req.cookies?.mrasul_session as string | undefined;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }
  if (!token) {
    req.user = null;
    return next();
  }
  const payload = verifyToken(token);
  if (!payload) {
    req.user = null;
    return next();
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid) as any;
  req.user = row ? rowToUser(row) : null;
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator privileges required.' });
  }
  next();
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('mrasul_session', token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: 1000 * 60 * 60 * 24 * 14,
    path: '/',
  });
}

app.use(attachUser);

// ========================
// AUTH ROUTES
// ========================
app.post('/api/auth/register', (req: AuthedRequest, res: Response) => {
  const { username, email, password, ageCategory } = req.body || {};
  if (typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 32) {
    return res.status(400).json({ error: 'Username must be between 2 and 32 characters.' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const id = `usr-${crypto.randomUUID()}`;
  const role = normalizedEmail === ADMIN_EMAIL ? 'admin' : 'user';
  const passwordHash = hashSecret(password);
  const now = new Date().toISOString();
  const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, avatar_color, age_category, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, username.trim(), normalizedEmail, passwordHash, role, avatarColor, ageCategory || null, now);

  // Create default playlist
  db.prepare('INSERT INTO playlists (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
    `pl-${crypto.randomUUID()}`,
    id,
    'Cosmic Favorites Mix',
    'Your personal MRASUL UNIVERSE soundtrack',
    now
  );

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(id);
  setSessionCookie(req, res, token);
  res.status(201).json({ user: rowToUser(userRow), token });
});

app.post('/api/auth/login', (req: AuthedRequest, res: Response) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
  if (!userRow || !verifySecret(password, userRow.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (normalizedEmail === ADMIN_EMAIL && userRow.role !== 'admin') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', userRow.id);
    userRow.role = 'admin';
  }
  const token = signToken(userRow.id);
  setSessionCookie(req, res, token);
  res.json({ user: rowToUser(userRow), token });
});

app.post('/api/auth/logout', (req: AuthedRequest, res: Response) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie('mrasul_session', {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
  });
  res.json({ ok: true });
});

app.get('/api/auth/me', (req: AuthedRequest, res: Response) => {
  res.json({ user: req.user || null });
});

app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  const {
    username,
    avatarColor,
    avatarUrl,
    ageCategory,
    parentalPin,
    currentParentalPin,
    clearParentalPin,
    reducedMotion,
    theme,
  } = req.body || {};

  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 32) {
      return res.status(400).json({ error: 'Username must be 2–32 characters.' });
    }
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), userId);
  }

  if (typeof avatarColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(avatarColor)) {
    db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(avatarColor, userId);
  }

  if (typeof avatarUrl === 'string' && avatarUrl.length <= 500) {
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl.trim(), userId);
  }

  if (ageCategory !== undefined) {
    const validAges: AgeCategory[] = ['under_7', '7_9', '10_11', '12_14', '15_17', '18_plus'];
    if (ageCategory !== null && !validAges.includes(ageCategory)) {
      return res.status(400).json({ error: 'Invalid age category.' });
    }
    if (row.parental_pin_hash) {
      if (typeof currentParentalPin !== 'string' || !verifySecret(currentParentalPin, row.parental_pin_hash)) {
        return res.status(403).json({ error: 'Parental safeguard PIN is required to change age category.' });
      }
    }
    db.prepare('UPDATE users SET age_category = ? WHERE id = ?').run(ageCategory, userId);
  }

  if (clearParentalPin && row.parental_pin_hash) {
    if (typeof currentParentalPin !== 'string' || !verifySecret(currentParentalPin, row.parental_pin_hash)) {
      return res.status(403).json({ error: 'Valid current parental PIN required to remove lock.' });
    }
    db.prepare('UPDATE users SET parental_pin_hash = NULL WHERE id = ?').run(userId);
  } else if (typeof parentalPin === 'string' && parentalPin.length > 0) {
    if (!/^\d{4}$/.test(parentalPin)) {
      return res.status(400).json({ error: 'Parental PIN must be exactly 4 digits.' });
    }
    if (row.parental_pin_hash && (!currentParentalPin || !verifySecret(currentParentalPin, row.parental_pin_hash))) {
      return res.status(403).json({ error: 'Current PIN required to set a new PIN.' });
    }
    db.prepare('UPDATE users SET parental_pin_hash = ? WHERE id = ?').run(hashSecret(parentalPin), userId);
  }

  if (typeof reducedMotion === 'boolean') {
    db.prepare('UPDATE users SET reduced_motion = ? WHERE id = ?').run(reducedMotion ? 1 : 0, userId);
  }

  if (theme === 'dark' || theme === 'light') {
    db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, userId);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({ user: rowToUser(updated) });
});

// ========================
// GAMES ROUTES
// ========================
app.get('/api/games', (req: AuthedRequest, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const ageGroup = (typeof req.query.ageGroup === 'string' ? req.query.ageGroup : req.user?.ageCategory || '') as AgeCategory | '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'featured';

  const rows = db.prepare('SELECT * FROM games').all() as any[];
  let games: GameItem[] = rows.map(rowToGame);

  if (ageGroup) {
    games = games.filter((g) => isGameAllowedForAge(g.minAgeGroup, ageGroup));
  }
  if (category && category !== 'All') {
    games = games.filter((g) => g.category.toLowerCase() === category.toLowerCase());
  }
  if (q) {
    games = games.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (sort === 'plays') {
    games.sort((a, b) => b.playsCount - a.playsCount);
  } else if (sort === 'rating') {
    games.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'newest') {
    games.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    games.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.playsCount - a.playsCount);
  }

  res.json({ games });
});

app.post('/api/games/:id/play', (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const gameRow = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as any;
  if (!gameRow) return res.status(404).json({ error: 'Game not found.' });

  db.prepare('UPDATE games SET plays_count = plays_count + 1 WHERE id = ?').run(id);
  const game = rowToGame({ ...gameRow, plays_count: gameRow.plays_count + 1 });

  if (req.user) {
    db.prepare('DELETE FROM recent_activity WHERE user_id = ? AND item_type = ? AND item_id = ?').run(
      req.user.id,
      'game',
      id
    );
    db.prepare(
      'INSERT INTO recent_activity (id, user_id, item_type, item_id, item_snapshot, played_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(`act-${crypto.randomUUID()}`, req.user.id, 'game', id, JSON.stringify(game), new Date().toISOString());
  }

  res.json({ game });
});

// ========================
// MUSIC ROUTES
// ========================
const GENRE_SEARCH_HINTS: Record<string, string> = {
  'Uzbek Music': 'uzbek music',
  'Turkish Music': 'turkish pop',
  'English Music': 'english pop',
  'Indian Music': 'bollywood indian music',
  'Korean Music': 'k-pop korean',
  Classical: 'classical orchestra piano',
  Jazz: 'jazz quartet',
  Rock: 'rock guitar',
  'Hip-Hop': 'hip hop',
  Rap: 'rap instrumental',
  Electronic: 'electronic synthwave',
  Pop: 'pop hits',
};

app.get('/api/music/catalog', async (req: AuthedRequest, res: Response) => {
  const genre = typeof req.query.genre === 'string' ? req.query.genre : 'All';

  const dbRows = db.prepare('SELECT * FROM music_tracks ORDER BY is_featured DESC, plays_count DESC').all() as any[];
  let dbTracks = dbRows.map(rowToTrack);
  if (genre !== 'All') {
    dbTracks = dbTracks.filter((t) => t.genre.toLowerCase() === genre.toLowerCase());
  }

  let audiusTracks: MusicTrack[] = [];
  let itunesTracks: MusicTrack[] = [];

  if (genre === 'All') {
    audiusTracks = await fetchAudiusTrending(undefined, 18);
  } else if (['Uzbek Music', 'Turkish Music', 'English Music', 'Indian Music', 'Korean Music'].includes(genre)) {
    const query = GENRE_SEARCH_HINTS[genre] || genre;
    const [aTracks, iTracks] = await Promise.all([
      searchAudiusTracks(query, 10, genre),
      searchItunesTracks(query, 8, genre),
    ]);
    audiusTracks = aTracks;
    itunesTracks = iTracks;
  } else {
    const [aTrending, aSearch] = await Promise.all([
      fetchAudiusTrending(genre, 12),
      searchAudiusTracks(GENRE_SEARCH_HINTS[genre] || genre, 8, genre),
    ]);
    const seen = new Set<string>();
    audiusTracks = [...aTrending, ...aSearch].filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }

  const combined = [...dbTracks, ...audiusTracks, ...itunesTracks];
  res.json({
    tracks: combined,
    providerStatus: getProviderStatus(),
  });
});

app.get('/api/music/search', async (req: AuthedRequest, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    return res.json({ tracks: [], providerStatus: getProviderStatus() });
  }

  const lowerQ = q.toLowerCase();
  const dbRows = db.prepare('SELECT * FROM music_tracks').all() as any[];
  const dbMatches = dbRows
    .map(rowToTrack)
    .filter(
      (t) =>
        t.title.toLowerCase().includes(lowerQ) ||
        t.artist.toLowerCase().includes(lowerQ) ||
        t.genre.toLowerCase().includes(lowerQ) ||
        t.album.toLowerCase().includes(lowerQ)
    );

  const [audiusMatches, itunesMatches, ytMatches] = await Promise.all([
    searchAudiusTracks(q, 14),
    searchItunesTracks(q, 10),
    searchYoutubeTracks(q, 6),
  ]);

  const seen = new Set<string>();
  const tracks = [...dbMatches, ...audiusMatches, ...ytMatches, ...itunesMatches].filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  res.json({
    tracks,
    providerStatus: getProviderStatus(),
  });
});

app.get('/api/music/providers', (_req: Request, res: Response) => {
  res.json({ providerStatus: getProviderStatus() });
});

app.post('/api/music/play', (req: AuthedRequest, res: Response) => {
  const { track } = req.body || {};
  if (!track || typeof track.id !== 'string') {
    return res.status(400).json({ error: 'Track payload required.' });
  }

  // Increment DB play count if track is stored locally
  db.prepare('UPDATE music_tracks SET plays_count = plays_count + 1 WHERE id = ?').run(track.id);

  if (req.user) {
    db.prepare('DELETE FROM recent_activity WHERE user_id = ? AND item_type = ? AND item_id = ?').run(
      req.user.id,
      'music',
      track.id
    );
    db.prepare(
      'INSERT INTO recent_activity (id, user_id, item_type, item_id, item_snapshot, played_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(`act-${crypto.randomUUID()}`, req.user.id, 'music', track.id, JSON.stringify(track), new Date().toISOString());
  }

  res.json({ ok: true });
});

// ========================
// GLOBAL SMART SEARCH
// ========================
app.get('/api/search', async (req: AuthedRequest, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category : 'All';
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'relevance';
  const ageGroup = (typeof req.query.ageGroup === 'string' ? req.query.ageGroup : req.user?.ageCategory || '') as AgeCategory | '';
  const genreFilter = typeof req.query.genre === 'string' ? req.query.genre : '';

  if (!q) {
    return res.json({ games: [], tracks: [], artists: [], providerStatus: getProviderStatus() });
  }

  const lowerQ = q.toLowerCase();

  // Save search history for signed-in users
  if (req.user && q.length >= 2) {
    db.prepare('DELETE FROM search_history WHERE user_id = ? AND LOWER(query) = ?').run(req.user.id, lowerQ);
    db.prepare('INSERT INTO search_history (id, user_id, query, category, searched_at) VALUES (?, ?, ?, ?, ?)').run(
      `sh-${crypto.randomUUID()}`,
      req.user.id,
      q,
      category,
      new Date().toISOString()
    );
  }

  let games: GameItem[] = [];
  if (category === 'All' || category === 'Games') {
    const rows = db.prepare('SELECT * FROM games').all() as any[];
    games = rows
      .map(rowToGame)
      .filter((g) => (!ageGroup ? true : isGameAllowedForAge(g.minAgeGroup, ageGroup)))
      .filter(
        (g) =>
          g.title.toLowerCase().includes(lowerQ) ||
          g.category.toLowerCase().includes(lowerQ) ||
          g.description.toLowerCase().includes(lowerQ) ||
          g.tags.some((t) => t.toLowerCase().includes(lowerQ))
      );

    if (sort === 'plays') games.sort((a, b) => b.playsCount - a.playsCount);
    else if (sort === 'rating') games.sort((a, b) => b.rating - a.rating);
    else if (sort === 'newest') games.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else {
      // Relevance: title match first
      games.sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(lowerQ) ? 1 : 0;
        const bTitle = b.title.toLowerCase().includes(lowerQ) ? 1 : 0;
        return bTitle - aTitle || b.playsCount - a.playsCount;
      });
    }
  }

  let tracks: MusicTrack[] = [];
  if (category === 'All' || category === 'Music' || category === 'Artists') {
    const dbRows = db.prepare('SELECT * FROM music_tracks').all() as any[];
    const dbMatches = dbRows
      .map(rowToTrack)
      .filter((t) =>
        category === 'Artists'
          ? t.artist.toLowerCase().includes(lowerQ)
          : t.title.toLowerCase().includes(lowerQ) ||
            t.artist.toLowerCase().includes(lowerQ) ||
            t.genre.toLowerCase().includes(lowerQ) ||
            t.album.toLowerCase().includes(lowerQ)
      );

    const [audiusMatches, itunesMatches, ytMatches] = await Promise.all([
      searchAudiusTracks(q, 12),
      searchItunesTracks(q, 10),
      searchYoutubeTracks(q, 6),
    ]);

    const seen = new Set<string>();
    tracks = [...dbMatches, ...audiusMatches, ...ytMatches, ...itunesMatches].filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      if (category === 'Artists' && !t.artist.toLowerCase().includes(lowerQ)) return false;
      if (genreFilter && genreFilter !== 'All' && t.genre.toLowerCase() !== genreFilter.toLowerCase()) return false;
      return true;
    });

    if (sort === 'plays') {
      tracks.sort((a, b) => b.playsCount - a.playsCount);
    } else if (sort === 'newest') {
      tracks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
  }

  const artistMap = new Map<string, { name: string; trackCount: number; artworkUrl: string; sampleGenre: string }>();
  for (const t of tracks) {
    const existing = artistMap.get(t.artist);
    if (existing) {
      existing.trackCount += 1;
    } else {
      artistMap.set(t.artist, {
        name: t.artist,
        trackCount: 1,
        artworkUrl: t.artworkUrl,
        sampleGenre: t.genre,
      });
    }
  }

  res.json({
    games,
    tracks,
    artists: Array.from(artistMap.values()),
    providerStatus: getProviderStatus(),
  });
});

app.get('/api/search/history', requireAuth, (req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare('SELECT query, category, searched_at FROM search_history WHERE user_id = ? ORDER BY searched_at DESC LIMIT 10')
    .all(req.user!.id);
  res.json({ history: rows });
});

app.delete('/api/search/history', requireAuth, (req: AuthedRequest, res: Response) => {
  db.prepare('DELETE FROM search_history WHERE user_id = ?').run(req.user!.id);
  res.json({ ok: true });
});

// ========================
// DISCOVER ROUTE
// ========================
app.get('/api/discover', async (req: AuthedRequest, res: Response) => {
  const ageGroup = (typeof req.query.ageGroup === 'string' ? req.query.ageGroup : req.user?.ageCategory || '') as AgeCategory | '';
  const allGames = (db.prepare('SELECT * FROM games').all() as any[])
    .map(rowToGame)
    .filter((g) => (!ageGroup ? true : isGameAllowedForAge(g.minAgeGroup, ageGroup)));

  const trendingGames = [...allGames].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.playsCount - a.playsCount).slice(0, 6);
  const mostPlayedGames = [...allGames].sort((a, b) => b.playsCount - a.playsCount).slice(0, 6);
  const editorsPicks = allGames.filter((g) => g.rating >= 4.8).slice(0, 6);
  const recentlyAddedGames = [...allGames].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const dbTracks = (db.prepare('SELECT * FROM music_tracks').all() as any[]).map(rowToTrack);
  const audiusTrending = await fetchAudiusTrending(undefined, 14);
  const allTracks = [...dbTracks, ...audiusTrending];

  const trendingMusic = allTracks.slice(0, 8);
  const mostListenedTracks = [...allTracks].sort((a, b) => b.playsCount - a.playsCount).slice(0, 8);
  const recommendedTracks = [...allTracks].reverse().slice(0, 8);

  res.json({
    trendingGames,
    mostPlayedGames,
    editorsPicks,
    recentlyAddedGames,
    trendingMusic,
    mostListenedTracks,
    recommendedTracks,
    providerStatus: getProviderStatus(),
  });
});

// ========================
// USER LIBRARY (FAVORITES, PLAYLISTS, ACTIVITY, NOTIFICATIONS, REPORTS)
// ========================
app.get('/api/user/library', requireAuth, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;

  const favRows = db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
  const favorites = favRows.map((r) => ({
    id: r.id,
    itemType: r.item_type,
    itemId: r.item_id,
    itemSnapshot: r.item_snapshot ? JSON.parse(r.item_snapshot) : undefined,
    createdAt: r.created_at,
  }));

  const plRows = db.prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
  const playlists = plRows.map((p) => {
    const tracksRows = db
      .prepare('SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC, added_at ASC')
      .all(p.id) as any[];
    return {
      id: p.id,
      userId: p.user_id,
      name: p.name,
      description: p.description,
      tracks: tracksRows.map((tr) => JSON.parse(tr.track_snapshot)),
      createdAt: p.created_at,
    };
  });

  const actRows = db
    .prepare('SELECT * FROM recent_activity WHERE user_id = ? ORDER BY played_at DESC LIMIT 20')
    .all(userId) as any[];
  const recentActivity = actRows.map((a) => ({
    id: a.id,
    itemType: a.item_type,
    itemId: a.item_id,
    itemSnapshot: a.item_snapshot ? JSON.parse(a.item_snapshot) : undefined,
    playedAt: a.played_at,
  }));

  const notifRows = db
    .prepare('SELECT * FROM notifications WHERE user_id IS NULL OR user_id = ? ORDER BY created_at DESC LIMIT 15')
    .all(userId) as any[];
  const notifications = notifRows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    isRead: Boolean(n.is_read),
    createdAt: n.created_at,
  }));

  res.json({ favorites, playlists, recentActivity, notifications });
});

app.get('/api/notifications', (req: AuthedRequest, res: Response) => {
  const rows = req.user
    ? (db
        .prepare('SELECT * FROM notifications WHERE user_id IS NULL OR user_id = ? ORDER BY created_at DESC LIMIT 15')
        .all(req.user.id) as any[])
    : (db.prepare('SELECT * FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 10').all() as any[]);
  res.json({
    notifications: rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
  });
});

app.post('/api/notifications/read', requireAuth, (req: AuthedRequest, res: Response) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL').run(req.user!.id);
  res.json({ ok: true });
});

app.post('/api/favorites/toggle', requireAuth, (req: AuthedRequest, res: Response) => {
  const { itemType, itemId, itemSnapshot } = req.body || {};
  if ((itemType !== 'game' && itemType !== 'music') || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Invalid favorite payload.' });
  }
  const existing = db
    .prepare('SELECT id FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?')
    .get(req.user!.id, itemType, itemId) as any;

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    return res.json({ favorited: false });
  }

  db.prepare('INSERT INTO favorites (id, user_id, item_type, item_id, item_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    `fav-${crypto.randomUUID()}`,
    req.user!.id,
    itemType,
    itemId,
    itemSnapshot ? JSON.stringify(itemSnapshot) : null,
    new Date().toISOString()
  );
  res.json({ favorited: true });
});

app.post('/api/playlists', requireAuth, (req: AuthedRequest, res: Response) => {
  const { name, description } = req.body || {};
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 60) {
    return res.status(400).json({ error: 'Playlist name must be 1–60 characters.' });
  }
  const id = `pl-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO playlists (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    req.user!.id,
    name.trim(),
    typeof description === 'string' ? description.trim().slice(0, 180) : '',
    now
  );
  res.status(201).json({
    playlist: { id, userId: req.user!.id, name: name.trim(), description: description || '', tracks: [], createdAt: now },
  });
});

app.delete('/api/playlists/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const pl = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!pl) return res.status(404).json({ error: 'Playlist not found.' });
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/playlists/:id/tracks', requireAuth, (req: AuthedRequest, res: Response) => {
  const pl = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!pl) return res.status(404).json({ error: 'Playlist not found.' });

  const { track } = req.body || {};
  if (!track || typeof track.id !== 'string') {
    return res.status(400).json({ error: 'Valid track object required.' });
  }

  const dup = db
    .prepare('SELECT id FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?')
    .get(req.params.id, track.id);
  if (dup) return res.json({ ok: true, alreadyExists: true });

  const countRow = db
    .prepare('SELECT COUNT(*) as cnt FROM playlist_tracks WHERE playlist_id = ?')
    .get(req.params.id) as { cnt: number };

  db.prepare(
    'INSERT INTO playlist_tracks (id, playlist_id, track_id, track_snapshot, position, added_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    `plt-${crypto.randomUUID()}`,
    req.params.id,
    track.id,
    JSON.stringify(track),
    countRow.cnt,
    new Date().toISOString()
  );

  res.status(201).json({ ok: true });
});

app.delete('/api/playlists/:id/tracks/:trackId', requireAuth, (req: AuthedRequest, res: Response) => {
  const pl = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!pl) return res.status(404).json({ error: 'Playlist not found.' });
  db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(
    req.params.id,
    req.params.trackId
  );
  res.json({ ok: true });
});

app.post('/api/reports', requireAuth, (req: AuthedRequest, res: Response) => {
  const { itemType, itemId, itemTitle, reason } = req.body || {};
  if ((itemType !== 'game' && itemType !== 'music') || typeof itemId !== 'string' || typeof reason !== 'string' || reason.trim().length < 4) {
    return res.status(400).json({ error: 'Please provide a clear reason (at least 4 characters).' });
  }
  const id = `rep-${crypto.randomUUID()}`;
  db.prepare(
    'INSERT INTO user_reports (id, user_id, item_type, item_id, item_title, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.user!.id, itemType, itemId, itemTitle || itemId, reason.trim().slice(0, 400), 'pending', new Date().toISOString());
  res.status(201).json({ ok: true, id });
});

// ========================
// ADMIN ROUTES (RBAC PROTECTED)
// ========================
app.get('/api/admin/overview', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const usersCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt;
  const gamesCount = (db.prepare('SELECT COUNT(*) as cnt FROM games').get() as any).cnt;
  const tracksCount = (db.prepare('SELECT COUNT(*) as cnt FROM music_tracks').get() as any).cnt;
  const totalGamePlays = (db.prepare('SELECT COALESCE(SUM(plays_count), 0) as total FROM games').get() as any).total;
  const pendingReports = (db.prepare("SELECT COUNT(*) as cnt FROM user_reports WHERE status = 'pending'").get() as any).cnt;
  const reports = db
    .prepare(
      `SELECT r.*, u.username FROM user_reports r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC LIMIT 50`
    )
    .all() as any[];
  const categories = db.prepare('SELECT * FROM categories_meta ORDER BY kind, name').all();
  const dbTracks = (db.prepare('SELECT * FROM music_tracks ORDER BY created_at DESC').all() as any[]).map(rowToTrack);

  res.json({
    stats: { usersCount, gamesCount, tracksCount, totalGamePlays, pendingReports },
    reports: reports.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username || 'User',
      itemType: r.item_type,
      itemId: r.item_id,
      itemTitle: r.item_title,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
    })),
    categories,
    dbTracks,
    providerStatus: getProviderStatus(),
  });
});

app.post('/api/admin/games', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { title, category, ageRating, minAgeGroup, description, thumbnailUrl, playableType, tags, isFeatured } = req.body || {};
  if (typeof title !== 'string' || title.trim().length < 2) {
    return res.status(400).json({ error: 'Game title is required.' });
  }
  const id = `game-${crypto.randomUUID().slice(0, 8)}`;
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO games (id, slug, title, category, age_rating, min_age_group, description, thumbnail_url, playable_type, tags, rating, plays_count, is_featured, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4.8, 0, ?, ?)
  `).run(
    id,
    slug,
    title.trim(),
    category || 'Arcade',
    ageRating || 'E',
    minAgeGroup || 'under_7',
    description || 'Interactive game in MRASUL UNIVERSE.',
    thumbnailUrl || '/src/assets/images/game_mrasul_puzzle_1795321097810.jpg',
    playableType || 'mrasul-puzzle',
    JSON.stringify(Array.isArray(tags) ? tags : String(tags || '').split(',').map((s) => s.trim()).filter(Boolean)),
    isFeatured ? 1 : 0,
    now
  );

  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
  res.status(201).json({ game: rowToGame(row) });
});

app.patch('/api/admin/games/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const existing = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Game not found.' });

  const { title, category, ageRating, minAgeGroup, description, playableType, isFeatured, tags } = req.body || {};
  db.prepare(`
    UPDATE games
    SET title = ?, category = ?, age_rating = ?, min_age_group = ?, description = ?, playable_type = ?, is_featured = ?, tags = ?
    WHERE id = ?
  `).run(
    title ?? existing.title,
    category ?? existing.category,
    ageRating ?? existing.age_rating,
    minAgeGroup ?? existing.min_age_group,
    description ?? existing.description,
    playableType ?? existing.playable_type,
    isFeatured !== undefined ? (isFeatured ? 1 : 0) : existing.is_featured,
    tags !== undefined
      ? JSON.stringify(Array.isArray(tags) ? tags : String(tags).split(',').map((s) => s.trim()).filter(Boolean))
      : existing.tags,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  res.json({ game: rowToGame(updated) });
});

app.delete('/api/admin/games/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function extractYoutubeId(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).slice(0, 11);
    const v = u.searchParams.get('v');
    if (v) return v.slice(0, 11);
  } catch {
    // ignore
  }
  return null;
}

app.post('/api/admin/music', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { title, artist, album, genre, durationSec, provider, youtubeUrlOrId, streamUrl, officialUrl, licenseNote, isFeatured } = req.body || {};
  if (typeof title !== 'string' || typeof artist !== 'string' || !title.trim() || !artist.trim()) {
    return res.status(400).json({ error: 'Track title and artist are required.' });
  }

  const ytId = extractYoutubeId(youtubeUrlOrId);
  if (provider === 'youtube' && !ytId) {
    return res.status(400).json({ error: 'Please provide a valid YouTube Video ID or URL.' });
  }

  const id = `trk-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const artworkUrl = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '';
  const playbackType = ytId ? 'youtube_embed' : streamUrl ? 'full_stream' : 'external_link';

  db.prepare(`
    INSERT INTO music_tracks (id, external_id, title, artist, album, genre, duration_sec, artwork_url, provider, playback_type, stream_url, youtube_video_id, official_url, plays_count, is_featured, is_trending, license_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)
  `).run(
    id,
    ytId || null,
    title.trim(),
    artist.trim(),
    (album || 'Single').trim(),
    genre || 'Pop',
    Number(durationSec || 210),
    artworkUrl,
    provider || (ytId ? 'youtube' : 'indie_licensed'),
    playbackType,
    streamUrl || null,
    ytId || null,
    officialUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : null),
    isFeatured ? 1 : 0,
    licenseNote || 'Authorized by platform administrator.',
    now
  );

  const row = db.prepare('SELECT * FROM music_tracks WHERE id = ?').get(id);
  res.status(201).json({ track: rowToTrack(row) });
});

app.delete('/api/admin/music/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  db.prepare('DELETE FROM music_tracks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/admin/reports/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { status } = req.body || {};
  if (!['pending', 'reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  db.prepare('UPDATE user_reports SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/categories', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { kind, name, description } = req.body || {};
  if ((kind !== 'game' && kind !== 'music') || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Valid kind and category name required.' });
  }
  const id = `${kind}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  db.prepare('INSERT OR REPLACE INTO categories_meta (id, kind, name, description, is_active) VALUES (?, ?, ?, ?, 1)').run(
    id,
    kind,
    name.trim(),
    description || ''
  );
  res.status(201).json({ ok: true });
});

app.patch('/api/admin/categories/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const { isActive } = req.body || {};
  db.prepare('UPDATE categories_meta SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// ========================
// VITE / STATIC SERVING
// ========================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MRASUL UNIVERSE server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
