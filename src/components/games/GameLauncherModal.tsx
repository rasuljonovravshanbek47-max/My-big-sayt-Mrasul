import { useState } from 'react';
import { Flag, Heart, X } from 'lucide-react';
import { useUniverse } from '../../context/UniverseContext';
import { apiFetch } from '../../lib/api';
import { MrasulRacingGame } from './MrasulRacingGame';
import { MrasulBlockWorldGame } from './MrasulBlockWorldGame';
import { MrasulPenaltyGame } from './MrasulPenaltyGame';
import { MrasulFootballArenaGame } from './MrasulFootballArenaGame';
import {
  MathOrbitSprintGame,
  MemoryConstellationGame,
  MrasulPuzzleGame,
  SectorStrategyGridGame,
} from './MrasulPuzzleAndMiniGames';

export function GameLauncherModal() {
  const { activeGame, closeGame, isFavorited, toggleFavorite, user, setAuthModalOpen } = useUniverse();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportStatus, setReportStatus] = useState('');

  if (!activeGame) return null;

  const favorited = isFavorited('game', activeGame.id);

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          itemType: 'game',
          itemId: activeGame.id,
          itemTitle: activeGame.title,
          reason: reportReason,
        }),
      });
      setReportStatus('Report submitted for review.');
      setReportReason('');
      setTimeout(() => {
        setReportOpen(false);
        setReportStatus('');
      }, 1200);
    } catch (err: any) {
      setReportStatus(err.message || 'Could not submit report.');
    }
  };

  const renderGameEngine = () => {
    switch (activeGame.playableType) {
      case 'mrasul-racing':
        return <MrasulRacingGame title={activeGame.title} />;
      case 'mrasul-block-world':
        return <MrasulBlockWorldGame title={activeGame.title} />;
      case 'mrasul-penalty':
        return <MrasulPenaltyGame title={activeGame.title} />;
      case 'mrasul-football-arena':
        return <MrasulFootballArenaGame title={activeGame.title} />;
      case 'mrasul-puzzle':
        return <MrasulPuzzleGame title={activeGame.title} />;
      case 'mrasul-math-sprint':
        return <MathOrbitSprintGame title={activeGame.title} />;
      case 'mrasul-memory-matrix':
        return <MemoryConstellationGame title={activeGame.title} />;
      case 'mrasul-tactical-grid':
        return <SectorStrategyGridGame title={activeGame.title} />;
      default:
        return <MrasulPuzzleGame title={activeGame.title} />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={activeGame.title}
    >
      <div className="w-full max-w-5xl rounded-2xl bg-[#090F24] border border-white/15 shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10">
          <div className="min-w-0">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>{activeGame.category}</span>
              <span aria-hidden="true">·</span>
              <span>Rated {activeGame.ageRating}</span>
            </div>
            <h2 className="font-display text-lg font-bold text-white truncate">{activeGame.title}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleFavorite('game', activeGame.id, activeGame)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
            >
              <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
              {favorited ? 'Saved' : 'Favorite'}
            </button>
            <button
              type="button"
              onClick={() => setReportOpen((r) => !r)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
              title="Report issue"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={closeGame}
              className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white transition-colors"
              aria-label="Close game"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {reportOpen && (
          <form onSubmit={submitReport} className="px-5 py-3 bg-slate-900 border-b border-white/10 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe content or technical issue..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white"
              required
            />
            <button type="submit" className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold">
              Submit Report
            </button>
            {reportStatus && <span className="text-xs text-cyan-300">{reportStatus}</span>}
          </form>
        )}

        <div className="p-4 sm:p-5">{renderGameEngine()}</div>
      </div>
    </div>
  );
}
