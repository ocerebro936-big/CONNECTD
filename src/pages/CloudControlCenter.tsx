// ============================================================================
// Connected Cloud Control Center (PR #22)
// ----------------------------------------------------------------------------
// Uma única central de comando. Só mostra o que os motores REALMENTE suportam
// (Global Node Manager #20, Worker Engine #19, Edge/CDN #21, supervision DIVINO).
// Toda a ação passa pelo Command Bus (autoridade + confirmação + auditoria).
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Cloud, Cpu, Globe, Brain, ShieldCheck, RefreshCw, Trash2, Activity, Server } from "lucide-react";
import { getCloudSupervision } from "../lib/connected-reactor/supervision";
import { globalNodeManager } from "../lib/connected-cloud/global/manager";
import { cloudWorkerEngine } from "../lib/connected-reactor/engine/worker-engine";
import { digitalReactor } from "../lib/connected-reactor/index";
import { getEdgeStatus, getCacheStatus, getDeliveryTrace } from "../lib/connected-edge";
import { commandBus, initCommands } from "../lib/connected-command";
import type { AuditEntry } from "../lib/connected-command";

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "ok" | "warn" | "bad" | "gold" }) {
  const color =
    tone === "ok" ? "text-emerald-300" :
    tone === "warn" ? "text-amber-300" :
    tone === "bad" ? "text-red-300" :
    tone === "gold" ? "text-primary" : "text-white";
  return (
    <div className="glass-card rounded-2xl p-3 border border-white/10">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Section({ icon, title, children, accent }: { icon: ReactNode; title: string; children: ReactNode; accent?: string }) {
  return (
    <section className="glass-card rounded-3xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-primary">{icon}</span>
        <h3 className="font-bold text-white">{title}</h3>
        {accent && <span className="ml-auto text-[10px] text-slate-400">{accent}</span>}
      </div>
      {children}
    </section>
  );
}

const DIVINO_QUESTIONS: { q: string; cap: string }[] = [
  { q: "Como está a Connected Cloud?", cap: "cloud_status" },
  { q: "Estado dos Nodes globais?", cap: "global_cloud_status" },
  { q: "Estado do Edge/CDN?", cap: "edge_status" },
  { q: "Quem é o melhor Node agora?", cap: "best_node" },
  { q: "Rasto de entrega?", cap: "delivery_trace" },
];

export default function CloudControlCenter() {
  const [cloud, setCloud] = useState<any>(null);
  const [snap, setSnap] = useState<any>(null);
  const [workers, setWorkers] = useState<Record<string, any>>({});
  const [reactor, setReactor] = useState<any>(null);
  const [edge, setEdge] = useState<any>(null);
  const [cache, setCache] = useState<any>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [flash, setFlash] = useState<string>("");
  const [divino, setDivino] = useState<string>("");
  const [pending, setPending] = useState<{ cmd: string; token: string; summary: string } | null>(null);
  const [keyInput, setKeyInput] = useState<string>("");

  const refresh = () => {
    setCloud(getCloudSupervision());
    setSnap(globalNodeManager.snapshot());
    setWorkers(cloudWorkerEngine.results());
    setReactor(digitalReactor.summary());
    setEdge(getEdgeStatus());
    setCache(getCacheStatus());
    setAudit(commandBus.getAudit());
  };

  useEffect(() => {
    initCommands();
    refresh();
    const t = setInterval(refresh, 5000);
    if (typeof (t as any).unref === "function") (t as any).unref();
    return () => clearInterval(t);
  }, []);

  const run = async (cmd: string, args: Record<string, any> = {}) => {
    const r = await commandBus.execute(cmd, {
      uid: "control-center",
      role: "admin",
      args,
      token: pending && pending.cmd === cmd ? pending.token : undefined,
    });
    if (r.requiresConfirmation) {
      setPending({ cmd, token: r.token!, summary: r.summary });
      setFlash(r.summary);
      return;
    }
    setPending(null);
    if (cmd === "divino.ask") setDivino(r.summary);
    else setFlash(r.summary);
    refresh();
  };

  const workerRows = useMemo(() => Object.entries(workers), [workers]);
  const traces = useMemo(() => getDeliveryTrace().slice(-6).reverse(), [edge]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 grid place-items-center text-2xl">👑</div>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" /> Connected Cloud Control Center
          </h1>
          <p className="text-xs text-slate-400">Command Bus · Autoridade · Auditoria · Supervisão DIVINO</p>
        </div>
        <button onClick={() => run("cloud.status")} className="ml-auto glass-chip flex items-center gap-2 text-xs"><RefreshCw className="h-4 w-4" />Atualizar</button>
      </div>

      {flash && <div className="glass-card rounded-xl border border-primary/20 px-3 py-2 text-sm text-primary">{flash}</div>}

      {/* 1. CLOUD */}
      <Section icon={<Cloud className="h-5 w-5" />} title="☁️ Cloud · Nodes & Storage" accent={cloud ? cloud.cloud : "—"}>
        {cloud && snap && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Nodes online" value={`${snap.nodesOnline}/${snap.nodesTotal}`} tone={snap.nodesOnline > 0 ? "ok" : "bad"} />
            <Stat label="Armazenamento" value={snap.storagePct != null ? `${snap.storagePct}%` : "—"} tone={(snap.storagePct ?? 0) > 85 ? "warn" : "ok"} />
            <Stat label="Uploads ativos" value={cloud.uploads} />
            <Stat label="Processando" value={cloud.processing} />
            <Stat label="Replicação" value={cloud.replication} tone={cloud.replication === "OK" ? "ok" : "warn"} />
            <Stat label="Backups" value={cloud.backup} tone={cloud.backup === "OK" ? "ok" : "warn"} />
            <Stat label="Latência" value={`${cloud.latencyMs}ms`} />
            <Stat label="Saúde" value={cloud.cloud} tone={cloud.cloud === "HEALTHY" ? "ok" : "warn"} />
          </div>
        )}
        {snap?.nodes?.length > 0 && (
          <div className="mt-3 space-y-1">
            {snap.nodes.map((n: any) => (
              <div key={n.id} className="flex items-center gap-3 text-xs glass-input-dark rounded-xl px-3 py-2">
                <span className={`h-2 w-2 rounded-full ${n.status === "online" ? "bg-emerald-400" : n.status === "degraded" ? "bg-amber-400" : "bg-slate-500"}`} />
                <span className="text-white font-semibold">{n.id}</span>
                <span className="text-slate-400">{n.region}</span>
                <span className="ml-auto text-slate-300">{n.status}</span>
                <span className="text-slate-400">{(n.capacityBytes / 1073741824) | 0}GB</span>
                {n.latencyMs ? <span className="text-slate-400">{n.latencyMs}ms</span> : null}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-2">{snap?.routingNote}</p>
      </Section>

      {/* 2. WORKERS */}
      <Section icon={<Cpu className="h-5 w-5" />} title="⚡ Workers · 7 motores" accent={reactor ? `${reactor.running} a correr` : "—"}>
        {reactor && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <Stat label="Running" value={reactor.running} tone="ok" />
            <Stat label="Queued" value={reactor.queued} />
            <Stat label="Completed" value={reactor.completed} tone="gold" />
            <Stat label="Failed" value={reactor.failed} tone={reactor.failed > 0 ? "bad" : "ok"} />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {workerRows.map(([id, r]: any) => (
            <div key={id} className="glass-input-dark rounded-xl px-3 py-2 border border-white/5">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${r?.ok ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="text-white font-semibold text-sm uppercase">{id}</span>
                <span className="ml-auto text-[10px] text-slate-400">{r?.ts ? new Date(r.ts).toLocaleTimeString() : ""}</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">{r?.summary || "—"}</p>
              {r?.metrics && (
                <p className="text-[10px] text-slate-400">{Object.entries(r.metrics).map(([k, v]) => `${k}:${v}`).join(" · ")}</p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* 3. EDGE */}
      <Section icon={<Globe className="h-5 w-5" />} title="🌍 Edge / CDN" accent={edge?.edge}>
        {edge && cache && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Hit-rate" value={`${Math.round((cache.hitRate ?? 0) * 100)}%`} tone={(cache.hitRate ?? 0) > 0.5 ? "ok" : "warn"} />
            <Stat label="Cache Hits" value={cache.hits} />
            <Stat label="Misses" value={cache.misses} />
            <Stat label="Entries" value={cache.entries} />
            <Stat label="Público" value={cache.publicCount} />
            <Stat label="Autorizado" value={cache.authorizedCount} />
            <Stat label="Adaptive" value={edge.adaptiveTier} tone="gold" />
            <Stat label="Nodes considerados" value={edge.nodesConsidered} />
          </div>
        )}
        {traces.length > 0 && (
          <div className="mt-3 space-y-1">
            {traces.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[11px] glass-input-dark rounded-lg px-2 py-1">
                <span className={`font-bold ${t.status === "HIT" ? "text-emerald-300" : t.status === "ERROR" ? "text-red-300" : "text-amber-300"}`}>{t.status}</span>
                <span className="text-slate-300 truncate">{t.region} · {t.nodeId}</span>
                <span className="ml-auto text-slate-400">{t.latencyMs}ms</span>
                {t.cached ? <span className="text-primary">cached</span> : null}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 4. DIVINO */}
      <Section icon={<Brain className="h-5 w-5" />} title="🧠 DIVINO · Assistente da Control Center" accent="supervisão">
        <div className="flex flex-wrap gap-2 mb-2">
          {DIVINO_QUESTIONS.map((q) => (
            <button key={q.cap} onClick={() => run("divino.ask", { capability: q.cap, question: q.q })} className="glass-chip text-xs">{q.q}</button>
          ))}
        </div>
        {divino && <div className="glass-input-dark rounded-xl p-3 text-sm text-slate-200 whitespace-pre-wrap">{divino}</div>}
        {!divino && <p className="text-xs text-slate-400">Pergunte ao DIVINO sobre a infraestrutura (apenas leitura de supervisão).</p>}
      </Section>

      {/* 5. AÇÕES (Command Bus) */}
      <Section icon={<ShieldCheck className="h-5 w-5" />} title="🔐 Comandos · autoridade + confirmação" accent="audit log">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => run("cloud.snapshot")} className="glass-chip text-xs">📸 Snapshot</button>
          <button onClick={() => run("nodes.failover")} className="glass-chip text-xs">↪ Failover</button>
          <div className="flex items-center gap-1 glass-chip">
            <input value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="key p/ replicar" className="bg-transparent text-xs w-28 outline-none text-white" />
            <button onClick={() => run("cloud.replicate", { key: keyInput })} className="text-primary text-xs">Replicar</button>
          </div>
          <button onClick={() => run("cloud.cleanup")} className="glass-chip text-xs text-red-300 flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" />Limpar sessões</button>
        </div>

        {pending && (
          <div className="mt-3 glass-card rounded-xl border border-amber-400/30 p-3">
            <p className="text-sm text-amber-200">⚠️ {pending.summary}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => run(pending.cmd)} className="glass-chip text-xs text-red-300">Confirmar</button>
              <button onClick={() => setPending(null)} className="glass-chip text-xs">Cancelar</button>
            </div>
          </div>
        )}
      </Section>

      {/* 6. AUDITORIA */}
      <Section icon={<Activity className="h-5 w-5" />} title="📊 Auditoria" accent={`${audit.length} registos`}>
        {audit.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhuma ação ainda. Cada comando deixa registo: quem, o quê, quando, resultado.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-auto">
            {audit.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] glass-input-dark rounded-lg px-2 py-1">
                <span className="text-slate-400">{new Date(a.ts).toLocaleTimeString()}</span>
                <span className="text-white font-semibold">{a.action}</span>
                <span className={`ml-auto font-bold ${a.result === "ok" ? "text-emerald-300" : a.result === "denied" ? "text-amber-300" : "text-red-300"}`}>{a.result}</span>
                <span className="text-slate-400">{a.actor}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
