import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Target } from 'lucide-react';
import { gameFx } from '../../lib/audioFx';

interface ArenaTarget {
  x: number;
  y: number;
  vx: number;
  r: number;
  points: number;
  color: string;
}

export function MrasulFootballArenaGame({ title }: { title: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try {
      return Number(localStorage.getItem('mrasul_arena_best') || 0);
    } catch {
      return 0;
    }
  });

  const playingRef = useRef(playing);
  playingRef.current = playing;

  const targetsRef = useRef<ArenaTarget[]>([
    { x: 260, y: 120, vx: 1.8, r: 28, points: 100, color: '#22d3ee' },
    { x: 520, y: 155, vx: -2.4, r: 22, points: 200, color: '#f59e0b' },
    { x: 390, y: 95, vx: 3.0, r: 17, points: 350, color: '#a855f7' },
  ]);

  const shotsRef = useRef<{ x: number; y: number; life: number; hit: boolean }[]>([]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPlaying(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      try {
        localStorage.setItem('mrasul_arena_best', String(score));
      } catch {
        // ignore
      }
    }
  }, [score, bestScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const draw = () => {
      const W = 800;
      const H = 440;
      ctx.fillStyle = '#060c1f';
      ctx.fillRect(0, 0, W, H);

      // Pitch gradient
      const pitch = ctx.createLinearGradient(0, 210, 0, H);
      pitch.addColorStop(0, '#0f5132');
      pitch.addColorStop(1, '#083320');
      ctx.fillStyle = pitch;
      ctx.fillRect(0, 210, W, H - 210);

      // Goal frame
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 5;
      ctx.strokeRect(140, 65, 520, 145);

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let x = 140; x <= 660; x += 26) {
        ctx.beginPath();
        ctx.moveTo(x, 65);
        ctx.lineTo(x, 210);
        ctx.stroke();
      }
      for (let y = 65; y <= 210; y += 24) {
        ctx.beginPath();
        ctx.moveTo(140, y);
        ctx.lineTo(660, y);
        ctx.stroke();
      }

      // Update & draw targets
      for (const tg of targetsRef.current) {
        if (playingRef.current) {
          tg.x += tg.vx;
          if (tg.x - tg.r < 150 || tg.x + tg.r > 650) tg.vx *= -1;
        }
        ctx.strokeStyle = tg.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `${tg.color}33`;
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+${tg.points}`, tg.x, tg.y + 4);
      }

      // Draw shot trails
      shotsRef.current = shotsRef.current.filter((sh) => sh.life > 0);
      for (const sh of shotsRef.current) {
        sh.life -= 0.05;
        ctx.strokeStyle = sh.hit ? `rgba(34,211,238,${sh.life})` : `rgba(244,63,94,${sh.life})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(400, 415);
        ctx.lineTo(sh.x, sh.y);
        ctx.stroke();

        ctx.fillStyle = sh.hit ? '#22d3ee' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 8 * sh.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // Striker ball at bottom
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(400, 412, 13, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleShoot = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!playing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 440;

    gameFx.kick();
    let hitTarget = false;
    for (const tg of targetsRef.current) {
      if (Math.hypot(x - tg.x, y - tg.y) <= tg.r + 8) {
        hitTarget = true;
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setScore((s) => s + tg.points * Math.min(3, 1 + Math.floor(nextStreak / 3)));
        tg.x = 190 + Math.random() * 420;
        tg.y = 85 + Math.random() * 95;
        gameFx.success();
        break;
      }
    }

    if (!hitTarget) {
      setStreak(0);
    }

    shotsRef.current.push({ x, y, life: 1, hit: hitTarget });
  };

  const startMatch = () => {
    gameFx.click();
    setScore(0);
    setStreak(0);
    setTimeLeft(45);
    setPlaying(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono-tabular">
        <span className="font-display font-semibold text-sm">{title}</span>
        <div className="flex items-center gap-4">
          <span>Score: <strong className="text-cyan-400">{score}</strong></span>
          <span>Streak: <strong className="text-amber-400">{streak}x</strong></span>
          <span>Time: <strong className={timeLeft <= 10 ? 'text-rose-400' : 'text-white'}>{timeLeft}s</strong></span>
          <span>Best: <strong className="text-emerald-400">{bestScore}</strong></span>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#060c1f]">
        <canvas
          ref={canvasRef}
          width={800}
          height={440}
          onClick={handleShoot}
          className="w-full h-auto block cursor-crosshair"
        />

        {!playing && (
          <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-6 text-white text-center">
            <Target className="w-10 h-10 text-cyan-400 mb-2" />
            <h3 className="font-display text-2xl font-bold mb-1">
              {timeLeft === 0 ? 'Time Up!' : 'Precision Target Challenge'}
            </h3>
            <p className="text-sm text-slate-300 mb-5 max-w-md">
              {timeLeft === 0
                ? `Final Arena Score: ${score} points (Personal Best: ${bestScore})`
                : 'Click the moving holographic target rings inside the stadium goal within 45 seconds to build streak multipliers.'}
            </p>
            <button
              type="button"
              onClick={startMatch}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              {timeLeft === 0 ? 'Play Again' : 'Start Challenge'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
