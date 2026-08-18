import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Trophy, Coins, RotateCcw, ChevronRight, WifiOff } from 'lucide-react';
import {
  loadLocalSave,
  saveLocalSave,
  loadCloudSave,
  syncSaveToCloud,
  mergeSaves,
  getRankings,
  RunRanking,
  RunSave,
} from '../lib/game-save';

type Phase = 'menu' | 'playing' | 'levelComplete' | 'gameover';

const W = 800;
const H = 320;
const GROUND = 260;
const TOTAL_LEVELS = 100;

interface GameState {
  player: { y: number; vy: number; onGround: boolean };
  obstacles: { x: number; w: number; h: number }[];
  coins: { x: number; y: number; taken: boolean }[];
  distance: number;
  target: number;
  speed: number;
  score: number;
  lives: number;
  spawnTimer: number;
  coinTimer: number;
  running: boolean;
}

export function ConnectedRun({ user, onOpenProfile }: { user: any; onOpenProfile?: (uid: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<Phase>('menu');
  const [save, setSave] = useState<RunSave>(() => loadLocalSave());
  const [level, setLevel] = useState(1);
  const [hud, setHud] = useState({ coins: 0, score: 0, lives: 3, distance: 0 });
  const [rankings, setRankings] = useState<RunRanking[]>([]);
  const [lastAward, setLastAward] = useState(0);

  // Carrega cloud ao montar (se online) e funde com local
  useEffect(() => {
    if (!user?.uid) return;
    loadCloudSave(user.uid).then((cloud) => {
      const merged = mergeSaves(loadLocalSave(), cloud);
      saveLocalSave(merged);
      setSave(merged);
    });
  }, [user?.uid]);

  const persist = useCallback(
    (next: RunSave) => {
      saveLocalSave(next);
      setSave(next);
      if (user?.uid) syncSaveToCloud(user.uid, { ...next, displayName: user.displayName || user.email?.split('@')[0] });
    },
    [user]
  );

  const startLevel = useCallback((lvl: number) => {
    setLevel(lvl);
    const speed = 4 + lvl * 0.25;
    stateRef.current = {
      player: { y: GROUND, vy: 0, onGround: true },
      obstacles: [],
      coins: [],
      distance: 0,
      target: 2000 + lvl * 600,
      speed,
      score: 0,
      lives: 3,
      spawnTimer: 60,
      coinTimer: 30,
      running: true,
    };
    setHud({ coins: save.coins, score: 0, lives: 3, distance: 0 });
    setPhase('playing');
  }, [save.coins]);

  const endLevel = useCallback(
    (won: boolean) => {
      const st = stateRef.current;
      if (!st) return;
      st.running = false;
      cancelAnimationFrame(rafRef.current);
      if (won) {
        const award = 20 + level * 5 + Math.floor(st.score / 10);
        const next: RunSave = {
          ...save,
          coins: save.coins + award,
          unlockedLevel: Math.min(TOTAL_LEVELS, Math.max(save.unlockedLevel, level + 1)),
          scores: { ...save.scores, [level]: Math.max(save.scores[level] || 0, st.score) },
        };
        persist(next);
        setLastAward(award);
        setPhase('levelComplete');
      } else {
        setPhase('gameover');
      }
    },
    [level, save, persist]
  );

  const loop = useCallback(
    (ts: number) => {
      const st = stateRef.current;
      const canvas = canvasRef.current;
      if (!st || !canvas || !st.running) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Update
      const p = st.player;
      p.vy += 0.8;
      p.y += p.vy;
      if (p.y >= GROUND) {
        p.y = GROUND;
        p.vy = 0;
        p.onGround = true;
      }
      st.distance += st.speed;
      st.spawnTimer -= 1;
      st.coinTimer -= 1;

      if (st.spawnTimer <= 0) {
        const gap = Math.max(40, 90 - level * 1.2);
        st.spawnTimer = gap + Math.random() * 40;
        const h = 30 + Math.random() * 30;
        st.obstacles.push({ x: W, w: 24, h });
      }
      if (st.coinTimer <= 0) {
        st.coinTimer = 25 + Math.random() * 30;
        st.coins.push({ x: W, y: GROUND - 40 - Math.random() * 80, taken: false });
      }

      st.obstacles.forEach((o) => (o.x -= st.speed));
      st.coins.forEach((c) => {
        c.x -= st.speed;
        if (!c.taken && Math.abs(c.x - 60) < 24 && Math.abs(c.y - p.y) < 40) {
          c.taken = true;
          st.score += 10;
          setHud((h) => ({ ...h, coins: h.coins + 1 }));
        }
      });

      // Colisão com obstáculos
      const hit = st.obstacles.find((o) => o.x < 60 + 22 && o.x + o.w > 60 && GROUND - p.y < o.h + 30);
      if (hit) {
        st.lives -= 1;
        st.obstacles = st.obstacles.filter((o) => o !== hit);
        setHud((h) => ({ ...h, lives: st.lives }));
        if (st.lives <= 0) {
          endLevel(false);
          return;
        }
      }

      st.obstacles = st.obstacles.filter((o) => o.x + o.w > -10);
      st.coins = st.coins.filter((c) => c.x > -10 && !c.taken);

      if (st.distance >= st.target) {
        endLevel(true);
        return;
      }

      setHud((h) => ({ ...h, score: st.score, distance: Math.floor(st.distance) }));

      // Draw
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1b2540';
      ctx.fillRect(0, GROUND, W, H - GROUND);
      // chão em grade
      ctx.strokeStyle = 'rgba(233,184,84,0.25)';
      for (let x = (st.distance % 40); x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND);
        ctx.lineTo(x - 20, H);
        ctx.stroke();
      }
      // moedas
      ctx.fillStyle = '#f5c542';
      st.coins.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });
      // obstáculos
      ctx.fillStyle = '#ff5d5d';
      st.obstacles.forEach((o) => ctx.fillRect(o.x, GROUND - o.h, o.w, o.h));
      // jogador
      ctx.fillStyle = '#4fd1ff';
      ctx.fillRect(48, GROUND - (GROUND - p.y) - 34, 24, 34);

      rafRef.current = requestAnimationFrame(loop);
    },
    [level, endLevel]
  );

  useEffect(() => {
    if (phase === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, loop]);

  const jump = useCallback(() => {
    const st = stateRef.current;
    if (st && st.player.onGround) {
      st.player.vy = -14;
      st.player.onGround = false;
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && phase === 'playing') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump, phase]);

  const loadRankings = useCallback(async () => {
    const r = await getRankings(15);
    setRankings(r);
  }, []);

  const shareRun = useCallback(async (lvl: number, score: number) => {
    const text = `🏃 Connected Run 👑 — Nível ${lvl} completo com ${score} pontos! 🏆 Joga em Connected King`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Connected Run', text });
        return;
      }
    } catch {
      /* utilizador cancelou */
    }
    try {
      await navigator.clipboard.writeText(text);
      alert('Conquista copiada para a área de transferência!');
    } catch {
      /* sem clipboard */
    }
  }, []);

  useEffect(() => {
    if (phase === 'menu' || phase === 'levelComplete' || phase === 'gameover') {
      loadRankings();
    }
  }, [phase, loadRankings]);

  const visibleLevels = Math.min(save.unlockedLevel, TOTAL_LEVELS);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          🏃 Connected Run
        </h1>
        <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
          <span className="flex items-center gap-1"><Coins className="h-4 w-4 text-amber-500" /> {save.coins}</span>
          <span className="flex items-center gap-1"><Trophy className="h-4 w-4 text-primary" /> Nível {save.unlockedLevel}</span>
          {!navigator.onLine && <span className="flex items-center gap-1 text-slate-400"><WifiOff className="h-4 w-4" /> Offline</span>}
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/30 shadow-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={jump}
          className="w-full h-auto bg-[#0b1020] touch-none cursor-pointer"
        />
      </div>

      {phase === 'playing' && (
        <div className="flex items-center justify-between text-sm font-bold text-slate-700">
          <span>Nível {level}</span>
          <span>Pontos: {hud.score}</span>
          <span>❤ {hud.lives}</span>
          <span>{(hud.distance / st_target(level) * 100).toFixed(0)}%</span>
        </div>
      )}

      {phase === 'menu' && (
        <div className="space-y-4">
          <p className="text-slate-600 font-medium">
            Corre, salta e desvia. Completa os {TOTAL_LEVELS} níveis (joga mesmo sem Internet). As tuas moedas e progresso guardam-se no dispositivo e sincronizam quando volta a haver Net.
          </p>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: visibleLevels }, (_, i) => i + 1).map((lvl) => (
              <button
                key={lvl}
                onClick={() => startLevel(lvl)}
                className="aspect-square rounded-xl bg-primary text-black font-bold hover:scale-105 transition-transform flex items-center justify-center"
              >
                {lvl}
              </button>
            ))}
            {visibleLevels < TOTAL_LEVELS && (
              <div className="aspect-square rounded-xl bg-white/50 text-slate-400 flex items-center justify-center text-xs font-bold">
                🔒
              </div>
            )}
          </div>
          {visibleLevels >= 1 && (
            <button
              onClick={() => startLevel(visibleLevels)}
              className="w-full rounded-xl bg-primary text-black font-bold py-3 hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              <Play className="h-5 w-5" /> Jogar Nível {visibleLevels}
            </button>
          )}
        </div>
      )}

      {phase === 'levelComplete' && (
        <div className="text-center space-y-3 glass-card rounded-2xl border border-white/30 p-6">
          <p className="text-2xl font-bold text-emerald-600">Nível {level} completo! 🎉</p>
          <p className="text-slate-700 font-semibold">+{lastAward} Game Coins (economia do jogo, separada do BlueCoin)</p>
           <div className="flex gap-2 justify-center">
             <button onClick={() => startLevel(Math.min(TOTAL_LEVELS, level + 1))} className="rounded-xl bg-primary text-black font-bold px-4 py-2 flex items-center gap-1">
               Próximo <ChevronRight className="h-4 w-4" />
             </button>
             <button onClick={() => setPhase('menu')} className="rounded-xl bg-white/70 text-slate-700 font-bold px-4 py-2">Menu</button>
              <button onClick={() => shareRun(level, hud.score)} className="rounded-xl bg-amber-400 text-black font-bold px-4 py-2 flex items-center gap-1">
               <Trophy className="h-4 w-4" /> Partilhar
             </button>
           </div>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="text-center space-y-3 glass-card rounded-2xl border border-white/30 p-6">
          <p className="text-2xl font-bold text-rose-600">Fim de jogo 💥</p>
           <button onClick={() => startLevel(level)} className="rounded-xl bg-primary text-black font-bold px-4 py-2 flex items-center gap-1 mx-auto">
             <RotateCcw className="h-4 w-4" /> Repetir Nível {level}
           </button>
           <button onClick={() => shareRun(level, hud.score)} className="rounded-xl bg-amber-400 text-black font-bold px-4 py-2 flex items-center gap-1 mx-auto">
             <Trophy className="h-4 w-4" /> Partilhar
           </button>
        </div>
      )}

      {/* Rankings */}
      <div className="glass-card rounded-2xl border border-white/30 p-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-primary" /> Ranking (Game Coins)
        </h3>
        {rankings.length === 0 ? (
          <p className="text-sm text-slate-500">Sem dados de ranking ainda.</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {rankings.map((r, i) => (
              <li key={r.uid} className="flex items-center gap-2">
                <span className="w-6 font-bold text-slate-500">{i + 1}.</span>
                <button
                  onClick={() => r.uid !== user?.uid && onOpenProfile?.(r.uid)}
                  className="flex-1 text-left font-semibold text-slate-800 hover:text-primary"
                >
                  {r.name}
                </button>
                <span className="text-amber-600 font-bold">{r.coins} 🪙</span>
                <span className="text-slate-400 text-xs">N{r.level}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function st_target(level: number) {
  return 2000 + level * 600;
}
