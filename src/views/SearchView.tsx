import { useEffect, useState } from 'react';
import { Disc3, Search, X } from 'lucide-react';
import { GameCard, TrackCard } from '../components/MediaCards';
import { useUniverse } from '../context/UniverseContext';
import { apiFetch } from '../lib/api';
import { MUSIC_GENRES, type GameItem, type MusicTrack } from '../types';

interface ArtistResult {
  name: string;
  trackCount: number;
  artworkUrl: string;
  sampleGenre: string;
}

const SUGGESTIONS = ['Minecraft', 'Racing', 'Football', 'Messi', 'Puzzle', 'Electronic', 'Uzbek Music', 'Classical'];

export function SearchView() {
  const { searchQuery, setSearchQuery, ageCategory } = useUniverse();
  const [category, setCategory] = useState<'All' | 'Games' | 'Music' | 'Artists'>('All');
  const [sort, setSort] = useState<'relevance' | 'plays' | 'rating' | 'newest'>('relevance');
  const [genre, setGenre] = useState('All');

  const [games, setGames] = useState<GameItem[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setGames([]);
      setTracks([]);
      setArtists([]);
      setHasSearched(false);
      return;
    }

    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q,
        category,
        sort,
        genre,
        ...(ageCategory ? { ageGroup: ageCategory } : {}),
      });
      apiFetch<{ games: GameItem[]; tracks: MusicTrack[]; artists: ArtistResult[] }>(`/api/search?${params.toString()}`)
        .then((res) => {
          if (!active) return;
          setGames(res.games || []);
          setTracks(res.tracks || []);
          setArtists(res.artists || []);
          setHasSearched(true);
        })
        .catch(() => {
          if (active) setHasSearched(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, category, sort, genre, ageCategory]);

  const totalCount = games.length + tracks.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Input */}
      <div className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-5 sm:p-6">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Global Smart Search
        </h1>

        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Minecraft, Racing, Football, Messi, song titles, or artists..."
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-slate-100 dark:bg-[#060B1A] border border-slate-200 dark:border-white/15 text-sm sm:text-base text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {/* Search Categories */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-white/5">
            {(['All', 'Games', 'Music', 'Artists'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  category === cat
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Filters & Sort */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              aria-label="Filter by music genre"
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
            >
              <option value="All" className="bg-slate-900 text-white">All Genres</option>
              {MUSIC_GENRES.map((g) => (
                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              aria-label="Sort search results"
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
            >
              <option value="relevance" className="bg-slate-900 text-white">Sort: Relevance</option>
              <option value="plays" className="bg-slate-900 text-white">Sort: Most Played</option>
              <option value="rating" className="bg-slate-900 text-white">Sort: Top Rated</option>
              <option value="newest" className="bg-slate-900 text-white">Sort: Newest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty Query Suggestions */}
      {!searchQuery.trim() && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D152C] p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-2">
            Try searching across Games & Music
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
            Search for genres, playable titles, football athletes, or recording artists.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSearchQuery(s)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/20 text-xs font-medium text-slate-800 dark:text-cyan-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-56 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && hasSearched && totalCount === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D152C] p-10 text-center">
          <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">No results found.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Nothing matched &ldquo;{searchQuery}&rdquo; across games or connected music providers.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.slice(0, 5).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSearchQuery(s)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-xs text-cyan-500 hover:bg-cyan-500/15"
              >
                Try {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matching Games */}
      {!loading && games.length > 0 && (category === 'All' || category === 'Games') && (
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
            Matching Games ({games.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {games.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}

      {/* Matching Artists */}
      {!loading && artists.length > 0 && (category === 'All' || category === 'Artists') && (
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
            Artists ({artists.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {artists.map((a) => (
              <button
                key={a.name}
                type="button"
                onClick={() => {
                  setCategory('Music');
                  setSearchQuery(a.name);
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 text-left transition-colors"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                  {a.artworkUrl ? (
                    <img src={a.artworkUrl} alt={a.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <Disc3 className="w-5 h-5 text-cyan-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{a.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {a.trackCount} {a.trackCount === 1 ? 'track' : 'tracks'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Matching Music */}
      {!loading && tracks.length > 0 && (category === 'All' || category === 'Music' || category === 'Artists') && (
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
            Matching Music ({tracks.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {tracks.map((t) => (
              <TrackCard key={t.id} track={t} queueContext={tracks} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
