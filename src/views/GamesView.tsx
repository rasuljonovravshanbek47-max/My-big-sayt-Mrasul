import { useEffect, useState } from 'react';
import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { AgeSelectionGate } from '../components/AgeSelectionGate';
import { GameCard } from '../components/MediaCards';
import { useUniverse } from '../context/UniverseContext';
import { apiFetch } from '../lib/api';
import { AGE_CATEGORIES, GAME_CATEGORIES, type GameItem } from '../types';

export function GamesView() {
  const { ageCategory, setActiveTab } = useUniverse();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sort, setSort] = useState<'featured' | 'plays' | 'rating' | 'newest'>('featured');
  const [filterText, setFilterText] = useState('');
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ageCategory) return;
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({
      ageGroup: ageCategory,
      category: selectedCategory,
      sort,
      q: filterText,
    });
    apiFetch<{ games: GameItem[] }>(`/api/games?${params.toString()}`)
      .then((res) => {
        if (active) setGames(res.games || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ageCategory, selectedCategory, sort, filterText]);

  if (!ageCategory) {
    return (
      <div className="py-6">
        <AgeSelectionGate />
      </div>
    );
  }

  const ageMeta = AGE_CATEGORIES.find((a) => a.id === ageCategory);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Active Age Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Games Universe
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {ageMeta?.label} filter active · {ageMeta?.guidance}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-cyan-500/50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            Age Filter: {ageMeta?.shortLabel}
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              aria-label="Sort games"
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="featured" className="bg-slate-900 text-white">Featured</option>
              <option value="plays" className="bg-slate-900 text-white">Most Played</option>
              <option value="rating" className="bg-slate-900 text-white">Top Rated</option>
              <option value="newest" className="bg-slate-900 text-white">Newest</option>
            </select>
          </div>

          <input
            type="search"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter games..."
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* 12 Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {['All', ...GAME_CATEGORIES].map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-72 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-8 text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No results found.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            No games matched this category under your current {ageMeta?.label} filter. Try selecting "All" categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
