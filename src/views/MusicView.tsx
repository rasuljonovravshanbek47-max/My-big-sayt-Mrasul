import { useEffect, useState } from 'react';
import { Info, Search } from 'lucide-react';
import { TrackCard } from '../components/MediaCards';
import { apiFetch } from '../lib/api';
import { MUSIC_GENRES, type MusicTrack, type ProviderStatus } from '../types';

export function MusicView() {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProviderInfo, setShowProviderInfo] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const endpoint = query.trim()
      ? `/api/music/search?q=${encodeURIComponent(query.trim())}`
      : `/api/music/catalog?genre=${encodeURIComponent(selectedGenre)}`;

    const timer = setTimeout(() => {
      apiFetch<{ tracks: MusicTrack[]; providerStatus: ProviderStatus }>(endpoint)
        .then((res) => {
          if (!active) return;
          setTracks(res.tracks || []);
          setProviderStatus(res.providerStatus || null);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }, query.trim() ? 220 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedGenre, query]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Music Universe
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Stream full-length licensed tracks from Audius, official YouTube embeds, and catalog previews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search song title or artist..."
              className="pl-9 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowProviderInfo((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <Info className="w-3.5 h-3.5 text-cyan-500" />
            Provider Status
          </button>
        </div>
      </div>

      {showProviderInfo && providerStatus && (
        <div className="rounded-xl bg-slate-100 dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              Audius · {providerStatus.audius.mode}
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">{providerStatus.audius.note}</p>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              iTunes · {providerStatus.itunes.mode}
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">{providerStatus.itunes.note}</p>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              YouTube · {providerStatus.youtube.apiKeyConfigured ? 'Live Search + Embed' : 'Official Embed Active'}
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">{providerStatus.youtube.note}</p>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              Spotify · {providerStatus.spotify.configured ? 'Configured' : 'Optional Setup'}
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">{providerStatus.spotify.note}</p>
          </div>
        </div>
      )}

      {/* 12 Music Genres */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {['All', ...MUSIC_GENRES].map((genre) => {
          const active = selectedGenre === genre && !query.trim();
          return (
            <button
              key={genre}
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedGenre(genre);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {/* Track Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-8 text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No results found.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try searching another artist or genre, or ask an administrator to add official YouTube tracks in the Admin Dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tracks.map((t) => (
            <TrackCard key={t.id} track={t} queueContext={tracks} />
          ))}
        </div>
      )}
    </div>
  );
}
