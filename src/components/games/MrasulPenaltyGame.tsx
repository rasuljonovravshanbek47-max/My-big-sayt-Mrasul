import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { gameFx } from '../../lib/audioFx';

type Difficulty = 'amateur' | 'pro' | 'world_class';

export function MrasulPenaltyGame({ title }: { title: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('pro');
  const [round, setRound] = useState(1);
  const [goals, setGoals] = useState(0);
  const [saves, setSaves] = useState(0);
  const [statusText, setStatusText] = useState('Click anywhere inside the goal to strike!');
  const [finished, setFinished] = useState(false);

  const stateRef = useRef({
    ballX: 400,
    ballY: 410,
    ballScale: 1,
    targetX: 400,
    targetY: 160,
    shooting: false,
    progress: 0,
    keeperX: 400,
    keeperTargetX: 400,
    keeperDive: 0,
    outcome: '' as '' | 'GOAL' | 'SAVED' | 'MISS',
  });

  const diffRef = useRef(difficulty);
  diffRef.current = difficulty;

  const roundRef = useRef(round);
  roundRef.current = round;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const render = () => {
      const s = stateRef.current;
      const W = 800;
      const H = 480;

      // Sky & stadium background
      const sky = ctx.createLinearGradient(0, 0, 0, 210);
      sky.addColorStop(0, '#040817');
      sky.addColorStop(1, '#0b193d');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, 210);

      // Stadium floodlights
      ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
      ctx.fillRect(90, 24, 90, 12);
      ctx.fillRect(620, 24, 90, 12);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.beginPath();
      ctx.moveTo(90, 36);
      ctx.lineTo(20, 210);
      ctx.lineTo(250, 210);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(710, 36);
      ctx.lineTo(550, 210);
      ctx.lineTo(780, 210);
      ctx.closePath();
      ctx.fill();

      // Pitch turf stripes
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#0f5132' : '#146c43';
        ctx.fillRect(0, 210 + i * 45, W, 45);
      }

      // Penalty box lines
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(140, 210, 520, 175);
      ctx.beginPath();
      ctx.arc(400, 410, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Goal net & frame
      const gx = 200;
      const gy = 85;
      const gw = 400;
      const gh = 128;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(gx, gy, gw, gh);

      // Net mesh
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
      ctx.lineWidth = 1;
      for (let x = gx; x <= gx + gw; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x, gy + gh);
        ctx.stroke();
      }
      for (let y = gy; y <= gy + gh; y += 18) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx + gw, y);
        ctx.stroke();
      }

      // Goal posts
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.strokeRect(gx, gy, gw, gh);

      // Goalkeeper animation
      if (s.shooting) {
        s.progress += 0.036;
        s.keeperX += (s.keeperTargetX - s.keeperX) * 0.14;
        const t = Math.min(s.progress, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const arcY = Math.sin(t * Math.PI) * -45;
        s.ballX = 400 + (s.targetX - 400) * ease;
        s.ballY = 410 + (s.targetY - 410) * ease + arcY;
        s.ballScale = 1 - ease * 0.48;

        if (t >= 1) {
          s.shooting = false;
          const inGoal = s.targetX >= gx + 10 && s.targetX <= gx + gw - 10 && s.targetY >= gy + 8 && s.targetY <= gy + gh;
          const keeperReach = diffRef.current === 'world_class' ? 54 : diffRef.current === 'pro' ? 44 : 34;
          const saved = inGoal && Math.abs(s.targetX - s.keeperX) < keeperReach && s.targetY > gy + 28;

          if (!inGoal) {
            s.outcome = 'MISS';
            setSaves((v) => v + 1);
            setStatusText('Wide of the post!');
            gameFx.fail();
          } else if (saved) {
            s.outcome = 'SAVED';
            setSaves((v) => v + 1);
            setStatusText('What a save by the goalkeeper!');
            gameFx.fail();
          } else {
            s.outcome = 'GOAL';
            setGoals((v) => v + 1);
            setStatusText('GOAL! Clinical finish into the corner!');
            gameFx.success();
          }

          setTimeout(() => {
            if (roundRef.current >= 5) {
              setFinished(true);
            } else {
              setRound((r) => r + 1);
              s.ballX = 400;
              s.ballY = 410;
              s.ballScale = 1;
              s.keeperX = 400;
              s.keeperTargetX = 400;
              s.outcome = '';
              setStatusText('Click inside the goal to take your next penalty.');
            }
          }, 950);
        }
      } else if (!s.outcome) {
        s.keeperX = 400 + Math.sin(Date.now() * 0.003) * 28;
      }

      // Draw Goalkeeper
      ctx.save();
      ctx.translate(s.keeperX, 178);
      if (s.shooting || s.outcome === 'SAVED') {
        const tilt = (s.keeperTargetX - 400) * 0.0035;
        ctx.rotate(Math.max(-0.65, Math.min(0.65, tilt)));
      }
      // Body
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-16, -24, 32, 38);
      // Head
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(0, -34, 11, 0, Math.PI * 2);
      ctx.fill();
      // Gloves
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-30, -18, 12, 12);
      ctx.fillRect(18, -18, 12, 12);
      ctx.restore();

      // Draw Ball shadow + Ball
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(s.ballX, s.ballY + 14 * s.ballScale, 14 * s.ballScale, 6 * s.ballScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, 15 * s.ballScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (s.shooting || s.outcome || finished) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 480;

    if (y > 240) return; // aim upper half toward goal

    gameFx.kick();
    s.targetX = x;
    s.targetY = y;
    s.progress = 0;
    s.shooting = true;

    // Keeper AI prediction based on difficulty
    const randomX = 230 + Math.random() * 340;
    const accuracy = difficulty === 'world_class' ? 0.68 : difficulty === 'pro' ? 0.45 : 0.2;
    s.keeperTargetX = randomX * (1 - accuracy) + x * accuracy;
  };

  const resetGame = () => {
    gameFx.click();
    stateRef.current = {
      ballX: 400,
      ballY: 410,
      ballScale: 1,
      targetX: 400,
      targetY: 160,
      shooting: false,
      progress: 0,
      keeperX: 400,
      keeperTargetX: 400,
      keeperDive: 0,
      outcome: '',
    };
    setRound(1);
    setGoals(0);
    setSaves(0);
    setFinished(false);
    setStatusText('Click anywhere inside the goal to strike!');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs">
        <div className="flex items-center gap-4 font-mono-tabular">
          <span className="font-semibold text-sm">{title}</span>
          <span>Round: <strong className="text-cyan-400">{round}/5</strong></span>
          <span>Goals: <strong className="text-emerald-400">{goals}</strong></span>
          <span>Saved/Miss: <strong className="text-rose-400">{saves}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {(['amateur', 'pro', 'world_class'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDifficulty(d);
                resetGame();
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                difficulty === d ? 'bg-cyan-500 text-slate-950' : 'bg-white/10 text-slate-300'
              }`}
            >
              {d.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          onClick={handleCanvasClick}
          className="w-full h-auto block cursor-crosshair"
        />

        <div className="px-4 py-2.5 bg-slate-900/95 border-t border-white/10 flex items-center justify-between text-xs text-slate-200">
          <span>{statusText}</span>
          <button
            type="button"
            onClick={resetGame}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart
          </button>
        </div>

        {finished && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-white text-center">
            <Trophy className="w-12 h-12 text-amber-400 mb-3" />
            <h3 className="font-display text-2xl font-bold mb-1">Shootout Complete</h3>
            <p className="text-sm text-slate-300 mb-5 font-mono-tabular">
              Final Score: <strong className="text-cyan-400">{goals} / 5 Goals</strong> ({difficulty.replace('_', ' ')})
            </p>
            <button
              type="button"
              onClick={resetGame}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
