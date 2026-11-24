import { useEffect, useState } from 'react';
import { GameCard, TrackCard } from '../components/MediaCards';
import { useUniverse } from '../context/UniverseContext';
import { apiFetch } from '../lib/api';
import { GAME_CATEGORIES, MUSIC_GENRES, type GameItem, type MusicTrack } from '../types';

interface DiscoverPayload {
  trendingGames: GameItem[];
  mostPlayedGames: GameItem[];
  editorsPicks: GameItem[];
  recentlyAddedGames: GameItem[];
  trendingMusic: MusicTrack[];
  mostListenedTracks: MusicTrack[];
  recommendedTracks: MusicTrack[];
}

export function DiscoverView() {
  const { ageCategory, setActiveTab, setSearchQuery } = useUniverse();
  const [data, setData] = useState<DiscoverPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const qs = ageCategory ? `?ageGroup=${encodeURIComponent(ageCategory)}` : '';
    apiFetch<DiscoverPayload>(`/api/discover${qs}`)
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ageCategory]);

  if (loading || !data) {
    return (
      <div className="space-y-8 pb-12">
        <div className="h-8 w-56 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-72 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Discover Universe
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Curated cross-platform highlights combining trending games, top charts, and editor selections.
        </p>
      </div>

      {/* Popular Categories */}
      <section>
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-3">
          Popular Categories
        </h2>
        <div className="flex flex-wrap gap-2">
          {[...GAME_CATEGORIES.slice(0, 6), ...MUSIC_GENRES.slice(0, 6)].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSearchQuery(cat);
                setActiveTab('search');
              }}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Trending Games */}
      <section>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">Trending Games</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.trendingGames.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </section>

      {/* Trending Music */}
      {data.trendingMusic.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">Trending Music</h2>
          <div className="flex gap-4 overflow-x-auto pb-3">
            {data.trendingMusic.map((t) => (
              <div key={t.id} className="w-44 shrink-0">
                <TrackCard track={t} queueContext={data.trendingMusic} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Most Played Games */}
      <section>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">Most Played Games</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.mostPlayedGames.map((g) => (
            <GameCard key={`mp-${g.id}`} game={g} />
          ))}
        </div>
      </section>

      {/* Most Listened & Recommended */}
      {data.mostListenedTracks.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
            Most Listened Tracks
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-3">
            {data.mostListenedTracks.map((t) => (
              <div key={`ml-${t.id}`} className="w-44 shrink-0">
                <TrackCard track={t} queueContext={data.mostListenedTracks} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Editor's Picks & Recently Added */}
      <section>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">Editor&apos;s Picks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.editorsPicks.map((g) => (
            <GameCard key={`ep-${g.id}`} game={g} />
          ))}
        </div>
      </section>
    </div>
  );
}
