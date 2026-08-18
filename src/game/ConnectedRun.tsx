import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Trophy, Coins, RotateCcw, ChevronRight, WifiOff, Crown, Gem, Ticket, Shield, Zap, Star, Sparkles, Store } from 'lucide-react';
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
import { REGIONS, getRegion } from './kingdom/regions';
import { COSMETICS, KING_VERSIONS, kingVersionForLevel } from './kingdom/character';
import { computeAward, applyAward, buyCosmetic } from './kingdom/economy';
import { ConnectedMoments, type RunAction } from './kingdom/moments';
import { recordRun, getGlobalActivity, type GlobalActivity } from './kingdom/globalActivity';
import { getLeague, type LeagueScope, type LeagueMetric } from './kingdom/league';
import { NPCS, randomNpcLine } from './kingdom/npc';
import { divinoCognitiveChat } from '../lib/divino';

type Phase = 'menu' | 'playing' | 'levelComplete' | 'gameover';

const W = 800;
const H = 320;
const GROUND = 260;
const TOTAL_LEVELS = 100;

interface RunGameState {
  player: { y: number; vy: number; onGround: boolean; sliding: boolean; slideUntil: number };
  obstacles: { x: number; w: number; h: number; hit: boolean }[];
  coins: { x: number; y: number; taken: boolean }[];
  distance: number;
  target: number;
  speed: number;
  score: number;
  lives: number;
  combo: number;
  itemsCollected: number;
  spawnTimer: number;
  coinTimer: number;
  running: boolean;
}

export function ConnectedRun({ user, onOpenProfile }: { user: any; onOpenProfile?: (uid: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RunGameState | null>(null);
  const rafRef = useRef<number>(0);
  const momentsRef = useRef(new ConnectedMoments());
  const connectedUntilRef = useRef(0);
  const regionRef = useRef('city');

  const [phase, setPhase] = useState<Phase>('menu');
  const [save, setSave] = useState<RunSave>(() => loadLocalSave());
  const [level, setLevel] = useState(1);
  const [hud, setHud] = useState({ coins: 0, score: 0, lives: 3, distance: 0, combo: 0, mode: false });
  const [rankings, setRankings] = useState<RunRanking[]>([]);
  const [lastAward, setLastAward] = useState<Award | null>(null);
  const [region, setRegion] = useState<string>(save.region || 'city');
  const [shopOpen, setShopOpen] = useState(false);
  const [leagueScope, setLeagueScope] = useState<LeagueScope>('global');
  const [leagueMetric, setLeagueMetric] = useState<LeagueMetric>('score');
  const [leagueRows, setLeagueRows] = useState<{ uid: string; name: string; value: number }[]>([]);
  const [global, setGlobal] = useState<GlobalActivity | null>(null);
  const [npc, setNpc] = useState(() => randomNpcLine());
  const [coachReply, setCoachReply] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);

  useEffect(() => { regionRef.current = region; }, [region]);

  // Cloud save + fusão
  useEffect(() => {
    if (!user?.uid) return;
    loadCloudSave(user.uid).then((cloud) => {
      const merged = mergeSaves(loadLocalSave(), cloud);
      saveLocalSave(merged);
      setSave(merged);
      setRegion(merged.region || 'city');
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
    momentsRef.current = new ConnectedMoments();
    connectedUntilRef.current = 0;
    stateRef.current = {
      player: { y: GROUND, vy: 0, onGround: true, sliding: false, slideUntil: 0 },
      obstacles: [],
      coins: [],
      distance: 0,
      target: 2000 + lvl * 600,
      speed,
      score: 0,
      lives: 3,
      combo: 0,
      itemsCollected: 0,
      spawnTimer: 60,
      coinTimer: 30,
      running: true,
    };
    setHud({ coins: save.coins, score: 0, lives: 3, distance: 0, combo: 0, mode: false });
    setPhase('playing');
  }, [save.coins]);

  const endLevel = useCallback(
    (won: boolean) => {
      const st = stateRef.current;
      if (!st) return;
      st.running = false;
      cancelAnimationFrame(rafRef.current);
      if (won) {
        const a = computeAward(save, level, st.score, st.combo);
        const next: RunSave = {
          ...save,
          ...applyAward(save, a),
          unlockedLevel: Math.min(TOTAL_LEVELS, Math.max(save.unlockedLevel || 1, level + 1)),
          scores: { ...save.scores, [level]: Math.max(save.scores[level] || 0, st.score) },
          bestCombo: Math.max(save.bestCombo || 0, st.combo),
          bestDistance: Math.max(save.bestDistance || 0, Math.floor(st.distance)),
          itemsCollected: (save.itemsCollected || 0) + st.itemsCollected,
          kingVersion: kingVersionForLevel(Math.min(TOTAL_LEVELS, Math.max(save.unlockedLevel || 1, level + 1))),
          region,
        };
        persist(next);
        setLastAward(a);
        if (user?.uid) recordRun(region).then(setGlobal);
        setPhase('levelComplete');
      } else {
        setLastAward(null);
        setPhase('gameover');
      }
    },
    [level, save, persist, region, user]
  );

  const logAction = (action: RunAction) => {
    const now = performance.now();
    const res = momentsRef.current.log(action, now);
    if (res.connectedMoment) connectedUntilRef.current = now + 6000;
    return res;
  };

  const loop = useCallback(
    (ts: number) => {
      const st = stateRef.current;
      const canvas = canvasRef.current;
      if (!st || !canvas || !st.running) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const now = performance.now();
      const modeOn = now < connectedUntilRef.current;

      // Update
      const p = st.player;
      if (p.sliding && now > p.slideUntil) p.sliding = false;
      p.vy += 0.8;
      p.y += p.vy;
      if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
      const speed = modeOn ? st.speed * 1.35 : st.speed;
      st.distance += speed;
      st.spawnTimer -= 1;
      st.coinTimer -= 1;

      if (st.spawnTimer <= 0) {
        const gap = Math.max(40, 90 - level * 1.2);
        st.spawnTimer = gap + Math.random() * 40;
        const h = 30 + Math.random() * 30;
        st.obstacles.push({ x: W, w: 24, h, hit: false });
      }
      if (st.coinTimer <= 0) {
        st.coinTimer = 25 + Math.random() * 30;
        st.coins.push({ x: W, y: GROUND - 40 - Math.random() * 80, taken: false });
      }

      st.obstacles.forEach((o) => (o.x -= speed));
      st.coins.forEach((c) => {
        c.x -= speed;
        if (!c.taken && Math.abs(c.x - 60) < 24 && Math.abs(c.y - p.y) < 40) {
          c.taken = true;
          st.score += modeOn ? 20 : 10;
          st.itemsCollected += 1;
          logAction('collect');
          setHud((h) => ({ ...h, coins: h.coins + 1, score: st.score, combo: momentsRef.current.combo }));
        }
      });

      const hit = st.obstacles.find((o) => o.x < 60 + 22 && o.x + o.w > 60 && GROUND - p.y < o.h);
      if (hit && !hit.hit) {
        hit.hit = true;
        st.lives -= 1;
        st.combo = 0;
        setHud((h) => ({ ...h, lives: st.lives, combo: 0 }));
        if (st.lives <= 0) { endLevel(false); return; }
      }
      // dodge: obstáculo evitado (saiu do ecrã sem colisão)
      st.obstacles = st.obstacles.filter((o) => {
        if (o.x + o.w < -10) {
          if (!o.hit && o.x < 60) logAction('dodge');
          return false;
        }
        return true;
      });
      st.coins = st.coins.filter((c) => c.x > -10 && !c.taken);

      if (st.distance >= st.target) { endLevel(true); return; }

      setHud((h) => ({ ...h, score: st.score, distance: Math.floor(st.distance), mode: modeOn }));

      // Draw (região)
      const reg = getRegion(regionRef.current);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = modeOn ? '#1a0b3a' : reg.sky;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = reg.ground;
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.strokeStyle = modeOn ? reg.accent : 'rgba(233,184,84,0.25)';
      for (let x = (st.distance % 40); x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND);
        ctx.lineTo(x - 20, H);
        ctx.stroke();
      }
      // Connected Mode glow
      if (modeOn) {
        ctx.fillStyle = 'rgba(255,93,210,0.12)';
        ctx.fillRect(0, 0, W, H);
      }
      // moedas
      ctx.fillStyle = reg.accent;
      st.coins.forEach((c) => { ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill(); });
      // obstáculos
      ctx.fillStyle = reg.obstacle;
      st.obstacles.forEach((o) => ctx.fillRect(o.x, GROUND - o.h, o.w, o.h));
      // NPC decorativo
      const npcDef = NPCS[(Math.floor(st.distance / 400)) % NPCS.length];
      ctx.font = '22px serif';
      ctx.fillText(npcDef.emoji, W - 40, GROUND - 4);
      // jogador (King)
      drawKing(ctx, 48, GROUND - (GROUND - p.y) - (p.sliding ? 16 : 34), save, modeOn);

      rafRef.current = requestAnimationFrame(loop);
    },
    [level, endLevel, save]
  );

  useEffect(() => {
    if (phase === 'playing') rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, loop]);

  const jump = useCallback(() => {
    const st = stateRef.current;
    if (st && st.player.onGround) {
      st.player.vy = -14;
      st.player.onGround = false;
      logAction('jump');
    }
  }, []);

  const slide = useCallback(() => {
    const st = stateRef.current;
    if (st) {
      st.player.sliding = true;
      st.player.slideUntil = performance.now() + 450;
      logAction('slide');
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      if (e.code === 'ArrowDown') { e.preventDefault(); slide(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump, slide, phase]);

  const loadRankings = useCallback(async () => {
    setRankings(await getRankings(15));
  }, []);

  useEffect(() => {
    if (phase === 'menu' || phase === 'levelComplete' || phase === 'gameover') loadRankings();
  }, [phase, loadRankings]);

  const loadGlobal = useCallback(async () => {
    setGlobal(await getGlobalActivity());
  }, []);
  useEffect(() => { loadGlobal(); }, [loadGlobal]);

  const openLeague = useCallback(async () => {
    setLeagueRows(await getLeague(leagueScope, leagueMetric, 10));
  }, [leagueScope, leagueMetric]);

  const askCoach = useCallback(async () => {
    setCoachBusy(true);
    try {
      const r = await divinoCognitiveChat(
        [
          { role: 'user', text: `Estratégia para o Connected RUN nível ${level} com personagem ${save.kingVersion}, cosméticos ${save.cosmetics?.join(',') || 'nenhum'}, pontuação ${hud.score}, combo ${hud.combo}.` },
        ],
        { uid: user?.uid || 'guest', modelId: 'divino-core', userName: user?.displayName }
      );
      setCoachReply(r.text);
    } catch {
      setCoachReply('O Divino está a meditar. Tenta novamente.');
    } finally {
      setCoachBusy(false);
    }
  }, [level, save, hud, user]);

  const shareRun = useCallback(async (lvl: number, score: number) => {
    const text = `🏃 Connected Run 👑 — Nível ${lvl} completo com ${score} pontos! 🏆 Joga em Connected King`;
    try {
      if ((navigator as any).share) { await (navigator as any).share({ title: 'Connected Run', text }); return; }
    } catch {}
    try { await navigator.clipboard.writeText(text); alert('Conquista copiada para a área de transferência!'); } catch {}
  }, []);

  const visibleLevels = Math.min(save.unlockedLevel || 1, TOTAL_LEVELS);
  const reg = getRegion(region);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Cabeçalho + economia */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">🏃 Connected RUN: KINGDOM</h1>
        <div className="flex items-center gap-3 text-sm font-bold text-slate-700 flex-wrap">
          <span className="flex items-center gap-1"><Coins className="h-4 w-4 text-amber-500" /> {save.coins}</span>
          <span className="flex items-center gap-1"><Star className="h-4 w-4 text-sky-500" /> {save.xp || 0} XP</span>
          <span className="flex items-center gap-1"><Gem className="h-4 w-4 text-fuchsia-500" /> {save.gems || 0}</span>
          <span className="flex items-center gap-1"><Ticket className="h-4 w-4 text-rose-500" /> {save.tickets || 0}</span>
          <span className="flex items-center gap-1"><Shield className="h-4 w-4 text-emerald-500" /> {save.badges || 0}</span>
          <span className="flex items-center gap-1"><Zap className="h-4 w-4 text-yellow-500" /> {save.energy ?? 100}</span>
          <span className="flex items-center gap-1"><Trophy className="h-4 w-4 text-primary" /> Nível {save.unlockedLevel}</span>
          {!navigator.onLine && <span className="flex items-center gap-1 text-slate-400"><WifiOff className="h-4 w-4" /> Offline</span>}
        </div>
      </div>

      {/* Banner de atividade global */}
      {global && (
        <div className="glass-card rounded-2xl border border-white/30 p-3 text-sm font-semibold text-slate-700">
          🌍 <b>{global.totalRuns.toLocaleString()}</b> corridas globais · Regiões desbloqueadas: {global.regionsUnlocked.length}/{REGIONS.length}
          {global.regionsUnlocked.includes(region) ? '' : ' · complete corridas para ajudar a desbloquear o mundo!'}
        </div>
      )}

      {/* Seletor de região */}
      <div className="flex flex-wrap gap-1.5">
        {REGIONS.map((r) => {
          const unlocked = (global?.regionsUnlocked || ['city']).includes(r.id);
          return (
            <button
              key={r.id}
              onClick={() => unlocked && setRegion(r.id)}
              disabled={!unlocked}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold ${region === r.id ? 'bg-primary text-black' : unlocked ? 'bg-white/60 text-slate-700' : 'bg-white/30 text-slate-400 line-through'}`}
              title={`${r.name} — ${r.climate}`}
            >
              {r.emoji} {r.name}
            </button>
          );
        })}
      </div>

      <div className="glass-card rounded-2xl border border-white/30 shadow-lg overflow-hidden">
        <canvas ref={canvasRef} width={W} height={H} onClick={jump} onContextMenu={(e) => { e.preventDefault(); slide(); }} className="w-full h-auto bg-[#0b1020] touch-none cursor-pointer" />
      </div>

      {phase === 'playing' && (
        <div className="flex items-center justify-between text-sm font-bold text-slate-700 flex-wrap gap-2">
          <span>Nível {level}</span>
          <span>Pontos: {hud.score}</span>
          <span>❤ {hud.lives}</span>
          <span>Combo: {hud.combo}</span>
          <span>{(hud.distance / (2000 + level * 600) * 100).toFixed(0)}%</span>
          {hud.mode && <span className="text-fuchsia-600 animate-pulse flex items-center gap-1"><Zap className="h-4 w-4" /> CONNECTED MODE</span>}
        </div>
      )}

      {phase === 'menu' && (
        <div className="space-y-4">
          <p className="text-slate-600 font-medium">
            Não estás apenas a correr — estás a ajudar a construir o Connected World. {reg.emoji} {reg.name}: clima {reg.climate}, música {reg.music}. Completa sequências perfeitas para ativar o 🔥 Connected Mode!
          </p>

          {/* Personagem + King version */}
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-slate-700">Personagem:</span>
            {KING_VERSIONS.map((kv) => (
              <span key={kv.id} className={`px-2 py-1 rounded-lg ${save.kingVersion === kv.id ? 'bg-primary text-black' : 'bg-white/60 text-slate-500'}`}>
                {kv.emoji} {kv.name}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: visibleLevels }, (_, i) => i + 1).map((lvl) => (
              <button key={lvl} onClick={() => startLevel(lvl)} className="aspect-square rounded-xl bg-primary text-black font-bold hover:scale-105 transition-transform flex items-center justify-center">
                {lvl}
              </button>
            ))}
            {visibleLevels < TOTAL_LEVELS && (
              <div className="aspect-square rounded-xl bg-white/50 text-slate-400 flex items-center justify-center text-xs font-bold">🔒</div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => startLevel(visibleLevels)} className="rounded-xl bg-primary text-black font-bold py-3 px-4 hover:bg-primary/90 flex items-center gap-2">
              <Play className="h-5 w-5" /> Jogar Nível {visibleLevels}
            </button>
            <button onClick={() => setShopOpen((v) => !v)} className="rounded-xl bg-white/70 text-slate-700 font-bold py-3 px-4 flex items-center gap-2">
              <Store className="h-5 w-5" /> Loja
            </button>
            <button onClick={askCoach} disabled={coachBusy} className="rounded-xl bg-amber-400 text-black font-bold py-3 px-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> {coachBusy ? 'A pensar...' : 'Divino Coach'}
            </button>
          </div>

          {coachReply && (
            <div className="glass-card rounded-2xl border border-amber-300/40 p-3 text-sm text-slate-700">👑 <b>DIVINO:</b> {coachReply}</div>
          )}

          {shopOpen && (
            <div className="glass-card rounded-2xl border border-white/30 p-4 space-y-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Store className="h-4 w-4" /> Loja de Cosméticos (usar 🪙 Coins)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COSMETICS.map((c) => {
                  const owned = (save.cosmetics || []).includes(c.id);
                  return (
                    <button key={c.id} disabled={owned} onClick={() => persist(buyCosmetic(save, c.cost, c.id))}
                      className={`rounded-xl p-2 text-left text-xs font-semibold ${owned ? 'bg-emerald-100 text-emerald-700' : 'bg-white/70 hover:bg-white text-slate-700'}`}>
                      {c.emoji} {c.name} {owned ? '✓' : `— ${c.cost}🪙`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* World League */}
          <div className="glass-card rounded-2xl border border-white/30 p-4 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Trophy className="h-4 w-4" /> Connected RUN League</h3>
            <div className="flex flex-wrap gap-1.5">
              {(['global', 'africa', 'mozambique', 'friends'] as LeagueScope[]).map((s) => (
                <button key={s} onClick={() => { setLeagueScope(s); }} className={`px-2 py-1 rounded-lg text-xs font-bold ${leagueScope === s ? 'bg-primary text-black' : 'bg-white/60 text-slate-600'}`}>{s}</button>
              ))}
              {(['score', 'distance', 'combo', 'explorer', 'collector'] as LeagueMetric[]).map((m) => (
                <button key={m} onClick={() => { setLeagueMetric(m); }} className={`px-2 py-1 rounded-lg text-xs font-bold ${leagueMetric === m ? 'bg-amber-400 text-black' : 'bg-white/60 text-slate-600'}`}>{m}</button>
              ))}
              <button onClick={openLeague} className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-700 text-white">Ver</button>
            </div>
            {leagueRows.length > 0 && (
              <ol className="space-y-1 text-sm">
                {leagueRows.map((r, i) => (
                  <li key={r.uid} className="flex items-center gap-2">
                    <span className="w-6 font-bold text-slate-500">{i + 1}.</span>
                    <button onClick={() => r.uid !== user?.uid && onOpenProfile?.(r.uid)} className="flex-1 text-left font-semibold text-slate-800 hover:text-primary">{r.name}</button>
                    <span className="text-amber-600 font-bold">{r.value}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {phase === 'levelComplete' && (
        <div className="text-center space-y-3 glass-card rounded-2xl border border-white/30 p-6">
          <p className="text-2xl font-bold text-emerald-600">Nível {level} completo! 🎉</p>
          {lastAward && (
            <p className="text-slate-700 font-semibold">
              +{lastAward.coins}🪙 · +{lastAward.xp} XP · {lastAward.gems ? `+${lastAward.gems}💎 ` : ''}{lastAward.tickets ? `+${lastAward.tickets}🎫 ` : ''}{lastAward.badges ? `+${lastAward.badges}🛡️` : ''} (economia do jogo, separada do BlueCoin)
            </p>
          )}
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={() => startLevel(Math.min(TOTAL_LEVELS, level + 1))} className="rounded-xl bg-primary text-black font-bold px-4 py-2 flex items-center gap-1"><ChevronRight className="h-4 w-4" /> Próximo</button>
            <button onClick={() => setPhase('menu')} className="rounded-xl bg-white/70 text-slate-700 font-bold px-4 py-2">Menu</button>
            <button onClick={() => shareRun(level, hud.score)} className="rounded-xl bg-amber-400 text-black font-bold px-4 py-2 flex items-center gap-1"><Trophy className="h-4 w-4" /> Partilhar</button>
          </div>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="text-center space-y-3 glass-card rounded-2xl border border-white/30 p-6">
          <p className="text-2xl font-bold text-rose-600">Fim de jogo 💥</p>
          <button onClick={() => startLevel(level)} className="rounded-xl bg-primary text-black font-bold px-4 py-2 flex items-center gap-1 mx-auto"><RotateCcw className="h-4 w-4" /> Repetir Nível {level}</button>
          <button onClick={() => shareRun(level, hud.score)} className="rounded-xl bg-amber-400 text-black font-bold px-4 py-2 flex items-center gap-1 mx-auto"><Trophy className="h-4 w-4" /> Partilhar</button>
        </div>
      )}

      {/* NPC vivo */}
      <div className="text-xs text-slate-500 flex items-center gap-2">
        <span className="text-lg">{npc.npc.emoji}</span>
        <span><b>{npc.npc.name}:</b> {npc.line}</span>
        <button onClick={() => setNpc(randomNpcLine())} className="ml-auto underline">seguinte</button>
      </div>

      {/* Rankings gerais */}
      <div className="glass-card rounded-2xl border border-white/30 p-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3"><Trophy className="h-5 w-5 text-primary" /> Ranking (Game Coins)</h3>
        {rankings.length === 0 ? (
          <p className="text-sm text-slate-500">Sem dados de ranking ainda.</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {rankings.map((r, i) => (
              <li key={r.uid} className="flex items-center gap-2">
                <span className="w-6 font-bold text-slate-500">{i + 1}.</span>
                <button onClick={() => r.uid !== user?.uid && onOpenProfile?.(r.uid)} className="flex-1 text-left font-semibold text-slate-800 hover:text-primary">{r.name}</button>
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

interface Award { coins: number; xp: number; gems: number; tickets: number; badges: number; energy: number; }

function drawKing(ctx: CanvasRenderingContext2D, x: number, y: number, save: RunSave, modeOn: boolean) {
  const h = 34;
  ctx.fillStyle = modeOn ? '#ff5dd2' : '#4fd1ff';
  ctx.fillRect(x, y, 24, h);
  if (modeOn) {
    ctx.fillStyle = 'rgba(255,93,210,0.5)';
    ctx.fillRect(x - 4, y - 4, 32, h + 8);
  }
  const cosmetics = save.cosmetics || [];
  if (cosmetics.some((c) => c.startsWith('crown'))) { ctx.font = '16px serif'; ctx.fillText('👑', x + 2, y - 2); }
  if (cosmetics.some((c) => c.startsWith('trail'))) { ctx.fillStyle = 'rgba(255,140,0,0.6)'; ctx.fillRect(x - 10, y + h - 4, 10, 4); }
}
