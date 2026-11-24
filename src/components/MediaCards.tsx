import { useState } from 'react';
import { ExternalLink, Gamepad2, Heart, ListPlus, Music2, Play, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useUniverse } from '../context/UniverseContext';
import type { GameItem, MusicTrack } from '../types';

export function formatDuration(sec: number): string {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function GameCard({ game }: { game: GameItem }) {
  const { launchGame, isFavorited, toggleFavorite, reducedMotion } = useUniverse();
  const [imgFailed, setImgFailed] = useState(false);
  const favorited = isFavorited('game', game.id);

  return (
    <motion.article
      whileHover={reducedMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col rounded-xl bg-white dark:bg-[#0D152C] border border-slate-200 dark:border-white/10 overflow-hidden transition-colors hover:border-cyan-500/50"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
        {!imgFailed && game.thumbnailUrl ? (
          <img
            src={game.thumbnailUrl}
            alt={game.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-[#0d1c3d] to-slate-950 p-4 text-center">
            <Gamepad2 className="w-9 h-9 text-cyan-400 mb-2" />
            <span className="text-xs font-medium text-slate-300">{game.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite('game', game.id, game);
          }}
          aria-label={favorited ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
          className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-black/55 border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-500 text-rose-500' : 'text-slate-200'}`} />
        </button>
      </div>

      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span>{game.category}</span>
          <span aria-hidden="true">·</span>
          <span>Rated {game.ageRating}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-mono-tabular">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {game.rating.toFixed(1)}
          </span>
        </div>

        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white tracking-tight line-clamp-1">
          {game.title}
        </h3>

        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 flex-1">
          {game.description}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            {game.playsCount.toLocaleString()} plays
          </span>
          <button
            type="button"
            onClick={() => launchGame(game)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Play Now
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function TrackCard({
  track,
  queueContext,
}: {
  track: MusicTrack;
  queueContext?: MusicTrack[];
}) {
  const {
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    isFavorited,
    toggleFavorite,
    playlists,
    addTrackToPlaylist,
    reducedMotion,
    user,
    setAuthModalOpen,
  } = useUniverse();

  const [imgFailed, setImgFailed] = useState(false);
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const favorited = isFavorited('music', track.id);

  const playbackLabel =
    track.playbackType === 'full_stream'
      ? 'Full Track'
      : track.playbackType === 'youtube_embed'
        ? 'YouTube Full'
        : track.playbackType === 'preview_30s'
          ? '30s Preview'
          : 'Official Link';

  const handlePlayAction = () => {
    if (isCurrent) {
      togglePlay();
    } else if (track.playbackType === 'external_link' && track.officialUrl) {
      window.open(track.officialUrl, '_blank', 'noopener,noreferrer');
    } else {
      playTrack(track, queueContext);
    }
  };

  return (
    <motion.article
      whileHover={reducedMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col rounded-xl bg-white dark:bg-[#0D152C] border transition-colors p-3.5 ${
        isCurrent
          ? 'border-cyan-500/70'
          : 'border-slate-200 dark:border-white/10 hover:border-cyan-500/40'
      }`}
    >
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-900 mb-3">
        {!imgFailed && track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt={`${track.title} by ${track.artist}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
            style={{
              background: `linear-gradient(135deg, ${track.accentColor || '#06b6d4'}33 0%, #0b132b 100%)`,
            }}
          >
            <Music2 className="w-10 h-10 text-cyan-300 mb-2" />
            <span className="text-xs text-slate-300 line-clamp-2">{track.artist}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />

        <button
          type="button"
          onClick={handlePlayAction}
          aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 focus-visible:outline-2 focus-visible:outline-white"
        >
          {track.playbackType === 'external_link' ? (
            <ExternalLink className="w-4 h-4" />
          ) : isCurrent && isPlaying ? (
            <span className="flex items-center gap-0.5">
              <span className="w-1 h-3.5 bg-slate-950 rounded-xs" />
              <span className="w-1 h-3.5 bg-slate-950 rounded-xs" />
            </span>
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">
        <span className="truncate">{track.genre}</span>
        <span aria-hidden="true">·</span>
        <span className={track.playbackType === 'preview_30s' ? 'text-amber-500 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'}>
          {playbackLabel}
        </span>
      </div>

      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white truncate">
        {track.title}
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">{track.artist}</p>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 relative">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
          {formatDuration(track.durationSec)}
        </span>

        <div className="flex items-center gap-1">
          {track.officialUrl && (
            <a
              href={track.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open on official provider"
              className="p-1.5 rounded-md text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              if (!user) {
                setAuthModalOpen(true);
                return;
              }
              setPlaylistMenuOpen((o) => !o);
            }}
            title="Add to playlist"
            className="p-1.5 rounded-md text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite('music', track.id, track)}
            aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
            className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 transition-colors"
          >
            <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {playlistMenuOpen && (
          <div className="absolute right-0 bottom-9 z-30 w-48 rounded-lg bg-white dark:bg-[#101A36] border border-slate-200 dark:border-white/15 shadow-xl p-1.5">
            <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Add to Playlist
            </div>
            {playlists.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-slate-500">Create a playlist first</div>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={async () => {
                    await addTrackToPlaylist(pl.id, track);
                    setPlaylistMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 truncate"
                >
                  {pl.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}
