import { useEffect, useState } from 'react';
import { Brain, Calculator, Grid3x3, RotateCcw, Sparkles, Swords } from 'lucide-react';
import { gameFx } from '../../lib/audioFx';

// 1. MRASUL PUZZLE (Sliding Logic Grid + Pattern Sequence)
export function MrasulPuzzleGame({ title }: { title: string }) {
  const [mode, setMode] = useState<'sliding' | 'sequence'>('sliding');
  const [gridSize, setGridSize] = useState<3 | 4>(3);
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);

  // Sequence state
  const [seq, setSeq] = useState<number[]>([]);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [seqStatus, setSeqStatus] = useState('Press Start Sequence to test your neural recall.');
  const [seqPlaying, setSeqPlaying] = useState(false);

  const initSliding = (size: 3 | 4) => {
    const total = size * size;
    const arr = Array.from({ length: total }, (_, i) => (i + 1) % total);
    // Perform valid random shuffles from solved state so it is always 100% solvable
    let emptyIdx = total - 1;
    for (let step = 0; step < size * 40; step++) {
      const r = Math.floor(emptyIdx / size);
      const c = emptyIdx % size;
      const neighbors: number[] = [];
      if (r > 0) neighbors.push(emptyIdx - size);
      if (r < size - 1) neighbors.push(emptyIdx + size);
      if (c > 0) neighbors.push(emptyIdx - 1);
      if (c < size - 1) neighbors.push(emptyIdx + 1);
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      [arr[emptyIdx], arr[pick]] = [arr[pick], arr[emptyIdx]];
      emptyIdx = pick;
    }
    setTiles(arr);
    setMoves(0);
    setSolved(false);
  };

  useEffect(() => {
    initSliding(gridSize);
  }, [gridSize]);

  const handleTileClick = (idx: number) => {
    if (solved) return;
    const emptyIdx = tiles.indexOf(0);
    const r1 = Math.floor(idx / gridSize);
    const c1 = idx % gridSize;
    const r2 = Math.floor(emptyIdx / gridSize);
    const c2 = emptyIdx % gridSize;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    gameFx.click();
    const next = [...tiles];
    [next[idx], next[emptyIdx]] = [next[emptyIdx], next[idx]];
    setTiles(next);
    setMoves((m) => m + 1);

    const isDone = next.every((v, i) => (i === next.length - 1 ? v === 0 : v === i + 1));
    if (isDone) {
      setSolved(true);
      gameFx.success();
    }
  };

  const playSequence = async (pattern: number[]) => {
    setSeqPlaying(true);
    setSeqStatus('Watch the pattern...');
    for (const pad of pattern) {
      await new Promise((r) => setTimeout(r, 250));
      setActivePad(pad);
      gameFx.click();
      await new Promise((r) => setTimeout(r, 380));
      setActivePad(null);
    }
    setSeqPlaying(false);
    setSeqStatus(`Repeat all ${pattern.length} tiles in order.`);
  };

  const startSequence = () => {
    const first = [Math.floor(Math.random() * 9)];
    setSeq(first);
    setUserSeq([]);
    playSequence(first);
  };

  const handlePadClick = (idx: number) => {
    if (seqPlaying || seq.length === 0) return;
    setActivePad(idx);
    setTimeout(() => setActivePad(null), 180);

    const nextUser = [...userSeq, idx];
    const step = nextUser.length - 1;
    if (seq[step] !== idx) {
      gameFx.fail();
      setSeqStatus(`Missed on level ${seq.length}. Press Start to try again.`);
      setSeq([]);
      setUserSeq([]);
      return;
    }

    gameFx.click();
    if (nextUser.length === seq.length) {
      gameFx.success();
      const extended = [...seq, Math.floor(Math.random() * 9)];
      setSeq(extended);
      setUserSeq([]);
      setTimeout(() => playSequence(extended), 450);
    } else {
      setUserSeq(nextUser);
    }
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-white/10 p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-display text-lg font-bold">{title}</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setMode('sliding')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${mode === 'sliding' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}
          >
            Quantum Sliding Grid
          </button>
          <button
            type="button"
            onClick={() => setMode('sequence')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${mode === 'sequence' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}
          >
            Neural Pattern Sequence
          </button>
        </div>
      </div>

      {mode === 'sliding' ? (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-4 mb-4 text-xs font-mono-tabular">
            <span>Moves: <strong className="text-cyan-400">{moves}</strong></span>
            <button
              type="button"
              onClick={() => setGridSize(gridSize === 3 ? 4 : 3)}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15"
            >
              Grid: {gridSize}x{gridSize}
            </button>
            <button
              type="button"
              onClick={() => initSliding(gridSize)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Shuffle
            </button>
          </div>

          <div
            className="grid gap-2 p-3 rounded-xl bg-slate-950 border border-white/10"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {tiles.map((val, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleTileClick(idx)}
                disabled={val === 0}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg font-mono-tabular text-lg font-bold transition-transform ${
                  val === 0
                    ? 'bg-transparent cursor-default'
                    : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/30 hover:border-cyan-400 active:scale-95 text-white'
                }`}
              >
                {val !== 0 ? val : ''}
              </button>
            ))}
          </div>

          {solved && (
            <div className="mt-4 text-sm text-emerald-400 font-semibold">
              Grid Solved in {moves} moves!
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-4 mb-4 text-xs">
            <span className="text-slate-300">{seqStatus}</span>
            <span className="font-mono-tabular text-cyan-400">Level: {seq.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950 border border-white/10 mb-4">
            {Array.from({ length: 9 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePadClick(i)}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl border transition-all ${
                  activePad === i
                    ? 'bg-cyan-400 border-white scale-95 shadow-[0_0_24px_rgba(34,211,238,0.7)]'
                    : 'bg-slate-800/80 border-white/10 hover:border-cyan-400/50'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={startSequence}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
          >
            Start Sequence
          </button>
        </div>
      )}
    </div>
  );
}

// 2. MATH ORBIT SPRINT (Educational Game)
export function MathOrbitSprintGame({ title }: { title: string }) {
  const [question, setQuestion] = useState({ text: '4 + 7 = ?', answer: 11, options: [9, 11, 12, 14] });
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState('Solve quickly to power the orbit!');

  const nextQ = () => {
    const a = 2 + Math.floor(Math.random() * 16);
    const b = 2 + Math.floor(Math.random() * 14);
    const op = Math.random() > 0.35 ? '+' : '-';
    const ans = op === '+' ? a + b : Math.max(a, b) - Math.min(a, b);
    const text = op === '+' ? `${a} + ${b} = ?` : `${Math.max(a, b)} - ${Math.min(a, b)} = ?`;
    const opts = new Set<number>([ans]);
    while (opts.size < 4) {
      opts.add(Math.max(0, ans + Math.floor(Math.random() * 7) - 3));
    }
    setQuestion({ text, answer: ans, options: Array.from(opts).sort(() => Math.random() - 0.5) });
  };

  const pick = (opt: number) => {
    if (opt === question.answer) {
      gameFx.success();
      setScore((s) => s + 10 + streak * 5);
      setStreak((st) => st + 1);
      setFeedback('Correct! Orbital velocity boosted.');
    } else {
      gameFx.fail();
      setStreak(0);
      setFeedback(`Not quite — the answer was ${question.answer}.`);
    }
    nextQ();
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-white/10 p-6 text-white text-center">
      <Calculator className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
      <h3 className="font-display text-xl font-bold mb-1">{title}</h3>
      <div className="text-xs text-slate-400 font-mono-tabular mb-6">
        Score: <strong className="text-cyan-400">{score}</strong> · Streak: <strong className="text-amber-400">{streak}</strong>
      </div>

      <div className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-6">{question.text}</div>

      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-5">
        {question.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => pick(opt)}
            className="py-4 rounded-xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 border border-white/10 font-mono-tabular text-xl font-bold transition-colors"
          >
            {opt}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-300">{feedback}</p>
    </div>
  );
}

// 3. MEMORY CONSTELLATION (Brain Training)
const SYMBOLS = ['★', '◆', '▲', '●', '✦', '⬡', '☀', '☾'];

export function MemoryConstellationGame({ title }: { title: string }) {
  const [cards, setCards] = useState<{ id: number; sym: string; flipped: boolean; matched: boolean }[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const reset = () => {
    const deck = [...SYMBOLS, ...SYMBOLS]
      .sort(() => Math.random() - 0.5)
      .map((sym, id) => ({ id, sym, flipped: false, matched: false }));
    setCards(deck);
    setOpen([]);
    setMoves(0);
  };

  useEffect(() => {
    reset();
  }, []);

  const flipCard = (idx: number) => {
    if (open.length === 2 || cards[idx].flipped || cards[idx].matched) return;
    gameFx.click();
    const nextCards = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    const nextOpen = [...open, idx];
    setCards(nextCards);
    setOpen(nextOpen);

    if (nextOpen.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextOpen;
      if (nextCards[a].sym === nextCards[b].sym) {
        gameFx.success();
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          setOpen([]);
        }, 300);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
          setOpen([]);
        }, 650);
      }
    }
  };

  const allMatched = cards.length > 0 && cards.every((c) => c.matched);

  return (
    <div className="rounded-xl bg-slate-900 border border-white/10 p-6 text-white flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-md mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-400" />
          <h3 className="font-display font-bold">{title}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono-tabular">
          <span>Moves: {moves}</span>
          <button type="button" onClick={reset} className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20">
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5 max-w-md w-full">
        {cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => flipCard(i)}
            className={`aspect-square rounded-xl text-2xl font-bold flex items-center justify-center border transition-all ${
              c.matched
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                : c.flipped
                  ? 'bg-cyan-500/25 border-cyan-400 text-white'
                  : 'bg-slate-800 border-white/10 hover:border-cyan-400/40 text-slate-600'
            }`}
          >
            {c.flipped || c.matched ? c.sym : '?'}
          </button>
        ))}
      </div>

      {allMatched && (
        <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
          <Sparkles className="w-4 h-4" /> All Constellations Paired in {moves} moves!
        </div>
      )}
    </div>
  );
}

// 4. SECTOR STRATEGY GRID (Turn-Based Territory Capture vs AI)
export function SectorStrategyGridGame({ title }: { title: string }) {
  const [board, setBoard] = useState<(null | 'P' | 'AI')[]>(Array(25).fill(null));
  const [turn, setTurn] = useState<'P' | 'AI'>('P');
  const [pScore, setPScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  const countScores = (b: (null | 'P' | 'AI')[]) => {
    setPScore(b.filter((x) => x === 'P').length);
    setAiScore(b.filter((x) => x === 'AI').length);
  };

  const applyFlip = (b: (null | 'P' | 'AI')[], idx: number, owner: 'P' | 'AI') => {
    const next = [...b];
    next[idx] = owner;
    const r = Math.floor(idx / 5);
    const c = idx % 5;
    const dirs = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of dirs) {
      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
        const nIdx = nr * 5 + nc;
        if (next[nIdx] && next[nIdx] !== owner) {
          next[nIdx] = owner;
        }
      }
    }
    return next;
  };

  const handleCell = (idx: number) => {
    if (turn !== 'P' || board[idx] !== null) return;
    gameFx.click();
    const afterPlayer = applyFlip(board, idx, 'P');
    setBoard(afterPlayer);
    countScores(afterPlayer);

    const empties = afterPlayer.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
    if (empties.length === 0) {
      gameFx.success();
      return;
    }

    setTurn('AI');
    setTimeout(() => {
      // AI picks cell with maximum flips
      let bestIdx = empties[0];
      let bestGain = -1;
      for (const candidate of empties) {
        const sim = applyFlip(afterPlayer, candidate, 'AI');
        const gain = sim.filter((x) => x === 'AI').length;
        if (gain > bestGain) {
          bestGain = gain;
          bestIdx = candidate;
        }
      }
      const afterAi = applyFlip(afterPlayer, bestIdx, 'AI');
      setBoard(afterAi);
      countScores(afterAi);
      setTurn('P');
    }, 420);
  };

  const reset = () => {
    setBoard(Array(25).fill(null));
    setTurn('P');
    setPScore(0);
    setAiScore(0);
  };

  const full = board.every((x) => x !== null);

  return (
    <div className="rounded-xl bg-slate-900 border border-white/10 p-6 text-white flex flex-col items-center">
      <div className="flex flex-wrap items-center justify-between w-full max-w-md mb-4 gap-2">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-cyan-400" />
          <h3 className="font-display font-bold">{title}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono-tabular">
          <span className="text-cyan-400">You: {pScore}</span>
          <span className="text-rose-400">AI: {aiScore}</span>
          <button type="button" onClick={reset} className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20">
            Reset
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Claim empty sectors to convert adjacent rival nodes. Highest sector count wins.
      </p>

      <div className="grid grid-cols-5 gap-2 max-w-sm w-full">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleCell(i)}
            disabled={cell !== null || turn !== 'P'}
            className={`aspect-square rounded-lg border font-mono-tabular text-xs font-bold transition-colors ${
              cell === 'P'
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                : cell === 'AI'
                  ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                  : 'bg-slate-800 border-white/10 hover:border-cyan-400/60'
            }`}
          >
            {cell === 'P' ? 'YOU' : cell === 'AI' ? 'AI' : ''}
          </button>
        ))}
      </div>

      {full && (
        <div className="mt-4 text-sm font-semibold text-cyan-300">
          {pScore > aiScore ? 'Victory! You control the sector.' : pScore === aiScore ? 'Draw!' : 'AI claimed the sector.'}
        </div>
      )}
    </div>
  );
}
