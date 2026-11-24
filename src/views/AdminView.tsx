import { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useUniverse } from '../context/UniverseContext';
import { apiFetch } from '../lib/api';
import {
  AGE_CATEGORIES,
  GAME_CATEGORIES,
  MUSIC_GENRES,
  type AgeCategory,
  type GameItem,
  type MusicTrack,
  type PlayableType,
  type UserReport,
} from '../types';

interface AdminOverview {
  stats: {
    usersCount: number;
    gamesCount: number;
    tracksCount: number;
    totalGamePlays: number;
    pendingReports: number;
  };
  reports: UserReport[];
  categories: { id: string; kind: string; name: string; is_active: number }[];
  dbTracks: MusicTrack[];
}

export function AdminView() {
  const { user } = useUniverse();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [games, setGames] = useState<GameItem[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Add Game Form
  const [gTitle, setGTitle] = useState('');
  const [gCat, setGCat] = useState<string>('Arcade');
  const [gAgeRating, setGAgeRating] = useState<'E' | '7+' | '10+' | '12+' | '15+' | '18+'>('E');
  const [gMinAge, setGMinAge] = useState<AgeCategory>('under_7');
  const [gPlayable, setGPlayable] = useState<PlayableType>('mrasul-puzzle');
  const [gDesc, setGDesc] = useState('');
  const [gTags, setGTags] = useState('');

  // Add Music Source Form
  const [mTitle, setMTitle] = useState('');
  const [mArtist, setMArtist] = useState('');
  const [mGenre, setMGenre] = useState<string>('Pop');
  const [mProvider, setMProvider] = useState<'youtube' | 'indie_licensed'>('youtube');
  const [mYoutube, setMYoutube] = useState('');
  const [mStream, setMStream] = useState('');
  const [mLicense, setMLicense] = useState('Official YouTube Embed / Licensed Source');

  const loadData = useCallback(async () => {
    try {
      const [ov, gm] = await Promise.all([
        apiFetch<AdminOverview>('/api/admin/overview'),
        apiFetch<{ games: GameItem[] }>('/api/games'),
      ]);
      setOverview(ov);
      setGames(gm.games || []);
    } catch (err: any) {
      setError(err.message || 'Access denied.');
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user, loadData]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto my-10 rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-8 text-center">
        <ShieldCheck className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Administrator Access Required</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          This console is strictly protected by server-side role-based authorization.
        </p>
      </div>
    );
  }

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await apiFetch('/api/admin/games', {
        method: 'POST',
        body: JSON.stringify({
          title: gTitle,
          category: gCat,
          ageRating: gAgeRating,
          minAgeGroup: gMinAge,
          playableType: gPlayable,
          description: gDesc,
          tags: gTags,
        }),
      });
      setGTitle('');
      setGDesc('');
      setGTags('');
      setMsg('Game added to catalog.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await apiFetch('/api/admin/music', {
        method: 'POST',
        body: JSON.stringify({
          title: mTitle,
          artist: mArtist,
          genre: mGenre,
          provider: mProvider,
          youtubeUrlOrId: mProvider === 'youtube' ? mYoutube : undefined,
          streamUrl: mProvider === 'indie_licensed' ? mStream : undefined,
          licenseNote: mLicense,
        }),
      });
      setMTitle('');
      setMArtist('');
      setMYoutube('');
      setMStream('');
      setMsg('Music source added.');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Administrator Dashboard
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage games, licensed music sources, categories, content ratings, and user reports.
        </p>
      </div>

      {msg && <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400">{msg}</div>}
      {error && <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-400">{error}</div>}

      {/* Stats */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Registered Users', val: overview.stats.usersCount },
            { label: 'Catalog Games', val: overview.stats.gamesCount },
            { label: 'Curated Music', val: overview.stats.tracksCount },
            { label: 'Total Game Plays', val: overview.stats.totalGamePlays.toLocaleString() },
            { label: 'Pending Reports', val: overview.stats.pendingReports },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
              <div className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono-tabular">
                {s.val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Game & Add Music */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleAddGame} className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Add Game to Catalog</h2>
          <input
            type="text"
            required
            value={gTitle}
            onChange={(e) => setGTitle(e.target.value)}
            placeholder="Game Title"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={gCat} onChange={(e) => setGCat(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white">
              {GAME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={gPlayable} onChange={(e) => setGPlayable(e.target.value as PlayableType)} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white">
              <option value="mrasul-racing">3D Racing Engine</option>
              <option value="mrasul-penalty">Football Penalty Engine</option>
              <option value="mrasul-football-arena">Football Target Arena</option>
              <option value="mrasul-block-world">3D Voxel Block World</option>
              <option value="mrasul-puzzle">Logic Puzzle Suite</option>
              <option value="mrasul-math-sprint">Math Orbit Sprint</option>
              <option value="mrasul-memory-matrix">Memory Constellation</option>
              <option value="mrasul-tactical-grid">Sector Strategy Grid</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={gAgeRating} onChange={(e) => setGAgeRating(e.target.value as any)} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white">
              {(['E', '7+', '10+', '12+', '15+', '18+'] as const).map((r) => <option key={r} value={r}>Rating {r}</option>)}
            </select>
            <select value={gMinAge} onChange={(e) => setGMinAge(e.target.value as AgeCategory)} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white">
              {AGE_CATEGORIES.map((a) => <option key={a.id} value={a.id}>Min: {a.label}</option>)}
            </select>
          </div>
          <input
            type="text"
            value={gTags}
            onChange={(e) => setGTags(e.target.value)}
            placeholder="Search tags (comma-separated, e.g. football, messi, sports)"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
          />
          <textarea
            value={gDesc}
            onChange={(e) => setGDesc(e.target.value)}
            placeholder="Short description..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
          />
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Game
          </button>
        </form>

        <form onSubmit={handleAddMusic} className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Add Licensed Music Source</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              placeholder="Song Title"
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
            />
            <input
              type="text"
              required
              value={mArtist}
              onChange={(e) => setMArtist(e.target.value)}
              placeholder="Artist Name"
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={mGenre} onChange={(e) => setMGenre(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white">
              {MUSIC_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={mProvider} onChange={(e) => setMProvider(e.target.value as any)} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white">
              <option value="youtube">Official YouTube Embed</option>
              <option value="indie_licensed">Licensed Direct Audio URL</option>
            </select>
          </div>
          {mProvider === 'youtube' ? (
            <input
              type="text"
              required
              value={mYoutube}
              onChange={(e) => setMYoutube(e.target.value)}
              placeholder="YouTube Video URL or 11-char ID"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
            />
          ) : (
            <input
              type="url"
              required
              value={mStream}
              onChange={(e) => setMStream(e.target.value)}
              placeholder="https://... direct licensed audio stream URL"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
            />
          )}
          <input
            type="text"
            value={mLicense}
            onChange={(e) => setMLicense(e.target.value)}
            placeholder="License / attribution note"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
          />
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Music Source
          </button>
        </form>
      </div>

      {/* Games Table */}
      <section className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-6">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">Manage Games ({games.length})</h2>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {games.map((g) => (
            <div key={g.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{g.title}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  {g.category} · Rated {g.ageRating} · {g.playsCount.toLocaleString()} plays
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/admin/games/${g.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ isFeatured: !g.isFeatured }),
                    });
                    await loadData();
                  }}
                  className={`px-3 py-1 rounded-md font-medium ${
                    g.isFeatured ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                  }`}
                >
                  {g.isFeatured ? 'Featured' : 'Set Featured'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/admin/games/${g.id}`, { method: 'DELETE' });
                    await loadData();
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400"
                  aria-label={`Delete ${g.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reports Review */}
      {overview && (
        <section className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">
            User Reports ({overview.reports.length})
          </h2>
          {overview.reports.length === 0 ? (
            <p className="text-xs text-slate-500">No reports submitted.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {overview.reports.map((r) => (
                <div key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {r.itemTitle} ({r.itemType})
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      {r.reason} — by {r.username}
                    </p>
                  </div>
                  <select
                    value={r.status}
                    onChange={async (e) => {
                      await apiFetch(`/api/admin/reports/${r.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: e.target.value }),
                      });
                      await loadData();
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
                  >
                    <option value="pending" className="bg-slate-900 text-white">Pending</option>
                    <option value="reviewed" className="bg-slate-900 text-white">Reviewed</option>
                    <option value="resolved" className="bg-slate-900 text-white">Resolved</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
