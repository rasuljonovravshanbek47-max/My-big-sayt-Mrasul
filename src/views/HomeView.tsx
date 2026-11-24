import { useEffect, useState } from 'react';
import { ArrowRight, Compass, Gamepad2, Headphones } from 'lucide-react';
import { motion } from 'motion/react';
import { UniverseHero3D } from '../components/UniverseHero3D';
import { GameCard, TrackCard } from '../components/MediaCards';
import { useUniverse } from '../context/UniverseContext';
import { apiFetch } from '../lib/api';
import type { GameItem, MusicTrack } from '../types';

export function HomeView() {
  const { setActiveTab, ageCategory, reducedMotion } = useUniverse();
  const [featuredGames, setFeaturedGames] = useState<GameItem[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const qs = ageCategory ? `?ageGroup=${encodeURIComponent(ageCategory)}` : '';
    apiFetch<{ trendingGames: GameItem[]; trendingMusic: MusicTrack[] }>(`/api/discover${qs}`)
      .then((res) => {
        if (!active) return;
        setFeaturedGames((res.trendingGames || []).slice(0, 6));
        setTrendingTracks((res.trendingMusic || []).slice(0, 6));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ageCategory]);

  return (
    <div className="space-y-14 pb-12">
      {/* Hero Section with 3D Digital Planet */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#060C1F] via-[#091331] to-[#050814] border border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[460px] lg:min-h-[520px]">
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 18 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 p-7 sm:p-10 lg:p-12 flex flex-col justify-center relative z-10"
          >
            <div className="text-xs font-medium tracking-wider text-cyan-400 mb-3">
              Gaming · Music · 3D Worlds
            </div>

            <h1
              className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-white leading-[1.06]"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              MRASUL UNIVERSE
            </h1>

            <p className="mt-3 font-display text-lg sm:text-xl font-semibold text-cyan-300 tracking-tight">
              ONE UNIVERSE. UNLIMITED ENTERTAINMENT.
            </p>

            <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Enter a unified futuristic entertainment operating system. Launch 3D racing and voxel worlds, compete in football challenges, and stream full-length music tracks in one seamless platform.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('games')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
              >
                <Gamepad2 className="w-4 h-4" />
                Enter Games Universe
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('music')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
              >
                <Headphones className="w-4 h-4" />
                Stream Music
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('discover')}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-cyan-300 hover:text-cyan-200 text-sm font-medium whitespace-nowrap shrink-0"
              >
                <Compass className="w-4 h-4" />
                Discover
              </button>
            </div>
          </motion.div>

          <div className="lg:col-span-6 relative min-h-[340px] lg:min-h-[520px]">
            <UniverseHero3D />
          </div>
        </div>
      </section>

      {/* Featured Playable Games */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Featured Playable Worlds
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Launch 3D racing, football arenas, voxel building, and brain-training games directly in your browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline whitespace-nowrap shrink-0"
          >
            All Games <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-72 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredGames.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </section>

      {/* Trending Music */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Trending Full-Length Music
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Live streams from independent artists and official providers with persistent playback across the platform.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('music')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline whitespace-nowrap shrink-0"
          >
            Open Music <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-64 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : trendingTracks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 p-6 text-sm text-slate-500 dark:text-slate-400">
            Live music providers are initializing. Visit the Music tab to search artists or check provider connectivity.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {trendingTracks.map((t) => (
              <TrackCard key={t.id} track={t} queueContext={trendingTracks} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
