import type { MusicTrack, ProviderStatus } from '../src/types.ts';

const AUDIUS_APP = 'MRASUL_UNIVERSE';
const AUDIUS_HOSTS = [
  'https://discoveryprovider.audius.co',
  'https://discoveryprovider2.audius.co',
  'https://discoveryprovider3.audius.co',
];

const cache = new Map<string, { expires: number; data: any }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: any, ttlMs = 120_000) {
  cache.set(key, { expires: Date.now() + ttlMs, data });
}

let lastAudiusStatus = {
  connected: false,
  mode: 'Checking',
  note: 'Audius Decentralized Streaming API (full-length tracks, no key required).',
};

let lastItunesStatus = {
  connected: false,
  mode: 'Checking',
  note: 'iTunes Search API (official metadata, 30s previews & Apple Music links).',
};

const GENRE_ACCENT_MAP: Record<string, string> = {
  Pop: '#06b6d4',
  'Hip-Hop': '#8b5cf6',
  Rap: '#6366f1',
  Electronic: '#22d3ee',
  Classical: '#eab308',
  Rock: '#ef4444',
  Jazz: '#f59e0b',
  'Uzbek Music': '#10b981',
  'Turkish Music': '#f43f5e',
  'English Music': '#3b82f6',
  'Indian Music': '#f97316',
  'Korean Music': '#ec4899',
};

function normalizeGenre(raw?: string): string {
  if (!raw) return 'Electronic';
  const lower = raw.toLowerCase();
  if (lower.includes('pop')) return 'Pop';
  if (lower.includes('hip') || lower.includes('trap')) return 'Hip-Hop';
  if (lower.includes('rap')) return 'Rap';
  if (lower.includes('electr') || lower.includes('house') || lower.includes('techno') || lower.includes('edm') || lower.includes('ambient')) return 'Electronic';
  if (lower.includes('classic')) return 'Classical';
  if (lower.includes('rock') || lower.includes('metal') || lower.includes('alt')) return 'Rock';
  if (lower.includes('jazz') || lower.includes('soul') || lower.includes('blues')) return 'Jazz';
  return raw;
}

async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  } finally {
    clearTimeout(id);
  }
}

function mapAudiusTrack(t: any, host: string, overrideGenre?: string): MusicTrack {
  const artwork =
    t.artwork?.['480x480'] ||
    t.artwork?.['1000x1000'] ||
    t.artwork?.['150x150'] ||
    '';
  const genre = overrideGenre || normalizeGenre(t.genre);
  return {
    id: `audius-${t.id}`,
    externalId: String(t.id),
    title: t.title || 'Untitled Track',
    artist: t.user?.name || t.user?.handle || 'Independent Artist',
    album: t.mood || t.genre || 'Audius Release',
    genre,
    durationSec: Number(t.duration || 180),
    artworkUrl: artwork,
    provider: 'audius',
    playbackType: 'full_stream',
    streamUrl: `${host}/v1/tracks/${encodeURIComponent(t.id)}/stream?app_name=${AUDIUS_APP}`,
    officialUrl: t.permalink ? `https://audius.co${t.permalink}` : 'https://audius.co',
    playsCount: Number(t.play_count || 0),
    isFeatured: Number(t.play_count || 0) > 10000,
    isTrending: true,
    licenseNote: 'Full-length stream licensed via Audius open artist catalog.',
    accentColor: GENRE_ACCENT_MAP[genre] || '#06b6d4',
  };
}

export async function fetchAudiusTrending(genreFilter?: string, limit = 18): Promise<MusicTrack[]> {
  const cacheKey = `audius-trending:${genreFilter || 'all'}:${limit}`;
  const cached = getCached<MusicTrack[]>(cacheKey);
  if (cached) return cached;

  for (const host of AUDIUS_HOSTS) {
    try {
      const genreParam = genreFilter && !['Uzbek Music', 'Turkish Music', 'English Music', 'Indian Music', 'Korean Music'].includes(genreFilter)
        ? `&genre=${encodeURIComponent(genreFilter)}`
        : '';
      const res = await fetchWithTimeout(`${host}/v1/tracks/trending?limit=${limit}&app_name=${AUDIUS_APP}${genreParam}`);
      if (!res.ok) continue;
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      const tracks = rows
        .filter((t: any) => t?.id && t?.is_streamable !== false)
        .map((t: any) => mapAudiusTrack(t, host));

      lastAudiusStatus = {
        connected: true,
        mode: 'Live Full-Length Streaming',
        note: 'Connected to Audius Discovery Network for full-length artist streams.',
      };
      setCached(cacheKey, tracks, 180_000);
      return tracks;
    } catch {
      // try next discovery host
    }
  }

  lastAudiusStatus = {
    connected: false,
    mode: 'Unavailable in current network',
    note: 'Audius Discovery Network could not be reached from this environment.',
  };
  return [];
}

export async function searchAudiusTracks(query: string, limit = 16, overrideGenre?: string): Promise<MusicTrack[]> {
  if (!query.trim()) return [];
  const cacheKey = `audius-search:${query.toLowerCase()}:${limit}`;
  const cached = getCached<MusicTrack[]>(cacheKey);
  if (cached) return cached;

  for (const host of AUDIUS_HOSTS) {
    try {
      const res = await fetchWithTimeout(
        `${host}/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}&app_name=${AUDIUS_APP}`
      );
      if (!res.ok) continue;
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      const tracks = rows
        .filter((t: any) => t?.id && t?.is_streamable !== false)
        .map((t: any) => mapAudiusTrack(t, host, overrideGenre));

      lastAudiusStatus = {
        connected: true,
        mode: 'Live Full-Length Streaming',
        note: 'Connected to Audius Discovery Network for full-length artist streams.',
      };
      setCached(cacheKey, tracks, 120_000);
      return tracks;
    } catch {
      // try next discovery host
    }
  }

  return [];
}

export async function searchItunesTracks(query: string, limit = 12, overrideGenre?: string): Promise<MusicTrack[]> {
  if (!query.trim()) return [];
  const cacheKey = `itunes-search:${query.toLowerCase()}:${limit}`;
  const cached = getCached<MusicTrack[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = Array.isArray(json?.results) ? json.results : [];
    const tracks: MusicTrack[] = rows
      .filter((r: any) => r.trackId && r.trackName)
      .map((r: any) => {
        const genre = overrideGenre || normalizeGenre(r.primaryGenreName);
        const artwork = typeof r.artworkUrl100 === 'string'
          ? r.artworkUrl100.replace('100x100bb', '600x600bb')
          : '';
        return {
          id: `itunes-${r.trackId}`,
          externalId: String(r.trackId),
          title: r.trackName,
          artist: r.artistName || 'Unknown Artist',
          album: r.collectionName || 'Single',
          genre,
          durationSec: Math.round((Number(r.trackTimeMillis || 30000)) / 1000),
          artworkUrl: artwork,
          provider: 'itunes_preview',
          playbackType: r.previewUrl ? 'preview_30s' : 'external_link',
          streamUrl: r.previewUrl || undefined,
          officialUrl: r.trackViewUrl || r.artistViewUrl || undefined,
          playsCount: 0,
          isFeatured: false,
          isTrending: false,
          licenseNote: r.previewUrl
            ? 'Official 30-second provider preview. Open official link for full licensed stream.'
            : 'Metadata only — full playback available on official Apple Music link.',
          accentColor: GENRE_ACCENT_MAP[genre] || '#3b82f6',
        };
      });

    lastItunesStatus = {
      connected: true,
      mode: 'Official 30s Preview + Catalog Links',
      note: 'Connected to iTunes Search API. Previews are transparently labeled as 30s Previews.',
    };
    setCached(cacheKey, tracks, 180_000);
    return tracks;
  } catch {
    lastItunesStatus = {
      connected: false,
      mode: 'Unavailable in current network',
      note: 'iTunes Search API could not be reached from this environment.',
    };
    return [];
  }
}

export async function searchYoutubeTracks(query: string, limit = 8): Promise<MusicTrack[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !query.trim()) return [];
  const cacheKey = `yt-search:${query.toLowerCase()}:${limit}`;
  const cached = getCached<MusicTrack[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=${limit}&q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const json = await res.json();
    const items = Array.isArray(json?.items) ? json.items : [];
    const tracks: MusicTrack[] = items.map((item: any) => ({
      id: `yt-${item.id.videoId}`,
      externalId: item.id.videoId,
      title: item.snippet?.title || 'YouTube Track',
      artist: item.snippet?.channelTitle || 'Official Channel',
      album: 'YouTube Music',
      genre: 'Pop',
      durationSec: 210,
      artworkUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
      provider: 'youtube',
      playbackType: 'youtube_embed',
      youtubeVideoId: item.id.videoId,
      officialUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      playsCount: 0,
      isFeatured: false,
      isTrending: false,
      licenseNote: 'Full-length playback via Official YouTube Embedded Player.',
      accentColor: '#ef4444',
    }));
    setCached(cacheKey, tracks, 180_000);
    return tracks;
  } catch {
    return [];
  }
}

export function getProviderStatus(): ProviderStatus {
  return {
    audius: lastAudiusStatus,
    itunes: lastItunesStatus,
    youtube: {
      embedReady: true,
      apiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY),
      note: process.env.YOUTUBE_API_KEY
        ? 'YouTube Data API v3 live search and Official Embedded Player active.'
        : 'Official YouTube Embedded Player active for curated/admin links. Add YOUTUBE_API_KEY in secrets for live YouTube search.',
    },
    spotify: {
      configured: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
      note: process.env.SPOTIFY_CLIENT_ID
        ? 'Spotify credentials configured.'
        : 'Optional: Add SPOTIFY_CLIENT_ID & SPOTIFY_CLIENT_SECRET to enable Spotify Web API metadata.',
    },
  };
}
