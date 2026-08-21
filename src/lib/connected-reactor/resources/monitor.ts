// ============================================================================
// Resource Monitor — sinais reais do lado do cliente.
// ----------------------------------------------------------------------------
// Não fingimos produzir eletricidade. Reportamos o que é mensurável de forma
// honesta: concorrência de CPU (núcleos), memória do JS (se o browser
// expuser), fila e latência. Onde não há métrica real, reportamos null.
// ============================================================================

export interface ResourceSample {
  cpuCores: number | null;
  deviceMemoryMb: number | null;
  jsHeapUsedMb: number | null;
  jsHeapLimitMb: number | null;
  queued: number;
  running: number;
  latencyMs: number | null;
  sampledAt: number;
}

export class ResourceMonitor {
  private latencyMs: number | null = null;

  constructor(private queueSize: () => number, private runningCount: () => number) {}

  noteLatency(ms: number): void {
    this.latencyMs = ms;
  }

  sample(): ResourceSample {
    const nav = (globalThis as any).navigator || {};
    const perf = (globalThis as any).performance || {};
    const mem = perf.memory || null; // Chrome expõe; outros: null
    return {
      cpuCores: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
      deviceMemoryMb: typeof nav.deviceMemory === "number" ? nav.deviceMemory * 1024 : null,
      jsHeapUsedMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
      jsHeapLimitMb: mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : null,
      queued: this.queueSize(),
      running: this.runningCount(),
      latencyMs: this.latencyMs,
      sampledAt: Date.now(),
    };
  }
}
