import { useState } from 'react';
import { Heart, ListMusic, Play, Plus, Trash2 } from 'lucide-react';
import { GameCard, TrackCard } from '../components/MediaCards';
import { useUniverse } from '../context/UniverseContext';
import type { GameItem, MusicTrack } from '../types';

export function FavoritesView() {
  const { favorites, setActiveTab } = useUniverse();

  const gameFavs = favorites
    .filter((f) => f.itemType === 'game' && f.itemSnapshot)
    .map((f) => f.itemSnapshot as GameItem);
  const musicFavs = favorites
    .filter((f) => f.itemType === 'music' && f.itemSnapshot)
    .map((f) => f.itemSnapshot as MusicTrack);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Your Favorites
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Saved games and music tracks ready to launch or stream anytime.
        </p>
      </div>

      {gameFavs.length === 0 && musicFavs.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-10 text-center">
          <Heart className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            No favorites saved yet
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
            Tap the heart icon on any game or song to save it here.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('games')}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold"
            >
              Browse Games
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('music')}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-semibold"
            >
              Browse Music
            </button>
          </div>
        </div>
      ) : (
        <>
          {gameFavs.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
                Favorite Games ({gameFavs.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {gameFavs.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          )}

          {musicFavs.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
                Favorite Tracks ({musicFavs.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {musicFavs.map((t) => (
                  <TrackCard key={t.id} track={t} queueContext={musicFavs} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function PlaylistsView() {
  const { user, playlists, createPlaylist, deletePlaylist, removeTrackFromPlaylist, playTrack, setAuthModalOpen } =
    useUniverse();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-8 rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-8 text-center">
        <ListMusic className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Personal Playlists</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-5">
          Sign in to create persistent playlists and organize your favorite full-length tracks across sessions.
        </p>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
        >
          Sign In or Register
        </button>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createPlaylist(name.trim(), desc.trim());
      setName('');
      setDesc('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Your Playlists
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Build custom mixes and launch continuous playback directly in the persistent player.
          </p>
        </div>
      </div>

      {/* Create Playlist Form */}
      <form
        onSubmit={handleCreate}
        className="rounded-xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-4 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist name..."
          required
          maxLength={60}
          className="flex-1 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
        />
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Short description (optional)"
          maxLength={140}
          className="flex-1 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#060B1A] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Playlist
        </button>
      </form>

      {/* Playlists List */}
      <div className="space-y-4">
        {playlists.map((pl) => (
          <div
            key={pl.id}
            className="rounded-2xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{pl.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pl.tracks.length} {pl.tracks.length === 1 ? 'track' : 'tracks'}
                  {pl.description ? ` · ${pl.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pl.tracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => playTrack(pl.tracks[0], pl.tracks)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deletePlaylist(pl.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  aria-label={`Delete playlist ${pl.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {pl.tracks.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No tracks added yet. Click the + playlist button on any track card in Music or Search.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {pl.tracks.map((tr) => (
                  <div key={tr.id} className="py-2.5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => playTrack(tr, pl.tracks)}
                      className="flex items-center gap-3 text-left min-w-0 flex-1 group"
                    >
                      <Play className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-cyan-400">
                          {tr.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {tr.artist} · {tr.genre}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTrackFromPlaylist(pl.id, tr.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400"
                      aria-label={`Remove ${tr.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
