import { useEffect, useRef } from 'react';
import {
  ExternalLink,
  Heart,
  ListMusic,
  Maximize2,
  Minimize2,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useUniverse } from '../context/UniverseContext';
import { formatDuration } from './MediaCards';

function WaveformVisualizer({ isPlaying, accent, height = 28 }: { isPlaying: boolean; accent: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reducedMotion } = useUniverse();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let phase = 0;

    const bars = 28;
    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (isPlaying && !reducedMotion) phase += 0.14;
      const barW = Math.max(2, (w - (bars - 1) * 3) / bars);

      for (let i = 0; i < bars; i++) {
        const amp = isPlaying
          ? 0.25 + 0.72 * Math.abs(Math.sin(phase + i * 0.45) * Math.cos(phase * 0.6 + i * 0.2))
          : 0.14;
        const bh = Math.max(3, amp * h);
        const x = i * (barW + 3);
        const y = (h - bh) / 2;

        ctx.fillStyle = isPlaying ? accent : 'rgba(148, 163, 184, 0.35)';
        ctx.beginPath();
        ctx.roundRect(x, y, barW, bh, 2);
        ctx.fill();
      }

      if (isPlaying && !reducedMotion) {
        raf = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, accent, reducedMotion]);

  return <canvas ref={canvasRef} width={160} height={height} className="w-full h-full block" />;
}

export function PersistentMusicPlayer() {
  const {
    currentTrack,
    queue,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    isFullScreenPlayer,
    showQueueDrawer,
    audioError,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setFullScreenPlayer,
    setShowQueueDrawer,
    playTrack,
    removeFromQueue,
    isFavorited,
    toggleFavorite,
  } = useUniverse();

  if (!currentTrack) return null;

  const accent = currentTrack.accentColor || '#06b6d4';
  const totalSec = duration || currentTrack.durationSec || 0;
  const pct = totalSec > 0 ? Math.min(100, (currentTime / totalSec) * 100) : 0;
  const favorited = isFavorited('music', currentTrack.id);

  return (
    <>
      {/* Queue Drawer */}
      {showQueueDrawer && (
        <div className="fixed bottom-20 right-4 z-50 w-80 max-w-[92vw] max-h-96 rounded-2xl bg-white/95 dark:bg-[#0B1228]/95 backdrop-blur-xl border border-slate-200 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Playback Queue ({queue.length})
            </span>
            <button
              type="button"
              onClick={() => setShowQueueDrawer(false)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-2 space-y-1">
            {queue.map((t) => {
              const active = t.id === currentTrack.id;
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg text-xs ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300'
                      : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => playTrack(t)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-slate-500 dark:text-slate-400 truncate">{t.artist}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(t.id)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                    aria-label={`Remove ${t.title} from queue`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full-Screen Immersive Player */}
      {isFullScreenPlayer && (
        <div
          className="fixed inset-0 z-50 bg-[#050814] text-white flex flex-col overflow-y-auto"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 22%, ${accent}30 0%, #050814 65%)`,
          }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="text-xs text-slate-400">
              Now Playing · {currentTrack.genre} ·{' '}
              <span className="text-cyan-400">
                {currentTrack.playbackType === 'preview_30s'
                  ? '30s Official Preview'
                  : currentTrack.playbackType === 'youtube_embed'
                    ? 'YouTube Official Full Embed'
                    : 'Full-Length Licensed Stream'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFullScreenPlayer(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium"
            >
              <Minimize2 className="w-4 h-4" />
              Minimize
            </button>
          </div>

          <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col items-center justify-center gap-6">
            {currentTrack.playbackType === 'youtube_embed' && currentTrack.youtubeVideoId ? (
              <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black">
                <iframe
                  title={currentTrack.title}
                  src={`https://www.youtube.com/embed/${currentTrack.youtubeVideoId}?autoplay=1&rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-slate-900 flex items-center justify-center">
                {currentTrack.artworkUrl ? (
                  <img
                    src={currentTrack.artworkUrl}
                    alt={currentTrack.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music2 className="w-16 h-16 text-cyan-400" />
                )}
              </div>
            )}

            <div className="text-center max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{currentTrack.title}</h2>
              <p className="text-slate-300 mt-1">
                {currentTrack.artist} · {currentTrack.album}
              </p>
              <p className="text-xs text-slate-400 mt-2">{currentTrack.licenseNote}</p>
            </div>

            {audioError && (
              <div className="px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 max-w-lg text-center">
                {audioError}
              </div>
            )}

            <div className="w-full max-w-xl h-14">
              <WaveformVisualizer isPlaying={isPlaying} accent={accent} height={56} />
            </div>

            {currentTrack.playbackType !== 'youtube_embed' && (
              <div className="w-full max-w-xl space-y-2">
                <input
                  type="range"
                  min={0}
                  max={totalSec || 100}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-label="Seek track position"
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-xs font-mono-tabular text-slate-400">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(totalSec)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`p-2 rounded-lg ${shuffle ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-400 hover:text-white'}`}
                aria-label="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button type="button" onClick={prevTrack} className="p-2 text-slate-200 hover:text-white" aria-label="Previous track">
                <SkipBack className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
              </button>
              <button type="button" onClick={nextTrack} className="p-2 text-slate-200 hover:text-white" aria-label="Next track">
                <SkipForward className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                className={`p-2 rounded-lg ${repeat !== 'off' ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-400 hover:text-white'}`}
                aria-label="Repeat"
              >
                {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            {currentTrack.officialUrl && (
              <a
                href={currentTrack.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-cyan-300"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Official Provider Page
              </a>
            )}
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <aside
        aria-label="Music Player"
        className="fixed bottom-0 inset-x-0 z-40 h-16 sm:h-20 bg-white/90 dark:bg-[#070D1F]/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.25)]"
      >
        {/* Top micro progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-200 dark:bg-white/10">
          <div className="h-full bg-cyan-500 transition-all duration-150" style={{ width: `${pct}%` }} />
        </div>

        <div className="max-w-[1440px] mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-3">
          {/* Track info */}
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:max-w-xs">
            <button
              type="button"
              onClick={() => setFullScreenPlayer(true)}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-white/10"
              aria-label="Open full-screen player"
            >
              {currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-cyan-400" />
                </div>
              )}
            </button>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                {currentTrack.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {currentTrack.artist} · {currentTrack.playbackType === 'preview_30s' ? '30s Preview' : 'Full Stream'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleFavorite('music', currentTrack.id, currentTrack)}
              className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-rose-400"
              aria-label="Favorite current track"
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>

          {/* Center Controls + Seek */}
          <div className="flex flex-col items-center gap-1 flex-1 max-w-md">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`hidden sm:inline-flex p-1.5 rounded ${shuffle ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                aria-label="Shuffle"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={prevTrack}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-cyan-400"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={nextTrack}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-cyan-400"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                className={`hidden sm:inline-flex p-1.5 rounded ${repeat !== 'off' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                aria-label="Repeat"
              >
                {repeat === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
              </button>
            </div>

            {currentTrack.playbackType !== 'youtube_embed' && (
              <div className="hidden sm:flex items-center gap-2 w-full text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                <span className="w-9 text-right">{formatDuration(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={totalSec || 100}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-label="Seek audio"
                  className="flex-1 h-1 accent-cyan-500 cursor-pointer"
                />
                <span className="w-9">{formatDuration(totalSec)}</span>
              </div>
            )}
          </div>

          {/* Visualizer + Volume + Queue + Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:block w-28 h-7">
              <WaveformVisualizer isPlaying={isPlaying} accent={accent} height={28} />
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-cyan-400"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="w-16 h-1 accent-cyan-500 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowQueueDrawer(!showQueueDrawer)}
              className={`p-2 rounded-lg transition-colors ${
                showQueueDrawer
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              aria-label="Toggle queue"
            >
              <ListMusic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setFullScreenPlayer(true)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              aria-label="Full-screen player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
