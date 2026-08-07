# ☁️ Connected Cloud Infinity — Plano de Infraestrutura (Enterprise)

> Plano de arquitetura da plataforma escalável da **Connected Enterprise** — Bluewhite Corporation Lda.
> Data: 2026-08-06 · Estado: **proposta de arquitetura** (a implementar por fases)

---

## 1. Estado Atual (Ponto de Partida)

| Camada | Tecnologia | Escalável? |
|---|---|---|
| Frontend (PWA) | React + Vite, GitHub Pages (`/CONNECTD`) | CDN do GitHub, ok para leitura; sem edge dinâmico |
| Autenticação | Firebase Auth (Google/Microsoft/Yahoo/Email) | ✅ gerido |
| Dados principais | Firebase Firestore + Storage | ✅ gerido, mas custos crescem com uso |
| Chamadas (SFU) | Cloudflare Calls (Worker `connected-api`) | ✅ edge nativa |
| IA / assistente | DIVINO IA (frontend + futura API) | ⚪ ainda sem backend |

**Gargalos atuais:** GitHub Pages serve apenas estáticos; toda a lógica dinâmica (feed, recomendações, analytics, filas, notificações push, IA) não tem backend próprio — depende de Workers pontuais e do cliente.

---

## 2. Arquitetura-Alvo

```text
                     🌎 REDE GLOBAL CLOUDFLARE
   ┌──────────────────────────────────────────────────────────────┐
   │  CDN Global (R2 + Cache + Workers em ~330 cidades)           │
   │  · PWA estática edge-first                                   │
   │  · API REST/WebSocket nos PoPs mais próximos                 │
   │  · WAF + DDoS + Rate Limiting em cada borda                  │
   └──────────┬───────────────────────────────────────────────────┘
              │
   ┌──────────▼───────────┐   ┌───────────────────────────────┐
   │ API GATEWAY (Worker) │──▶│ Serviços (Workers por domínio)│
   │ · auth JWT Firebase  │   │ · social · media · chat       │
   │ · routing            │   │ · calls · payments · courses  │
   │ · rate limits        │   │ · search · notifications      │
   └──────────┬───────────┘   └───────┬──────────┬────────────┘
              │                       │          │
   ┌──────────▼───────────┐   ┌───────▼─────────▼───────┐
   │ CAMADA DE DADOS      │   │ DIVINO IA (Worker)      │
   │ · D1 (SQL, réplicas) │   │ · monitorização         │
   │ · KV (cache, sessões)│   │ · previsão de carga     │
   │ · R2 (media global)  │   │ · diagnóstico + sugestões│
   │ · Queue (fila)       │   │ · suporta operações     │
   │ · Durable Objects    │   │   (com aprovação humana)│
   │ · Hyperdrive (DB)    │   └─────────────────────────┘
   └──────────────────────┘
```

### Componentes

| Componente | Cloudflare | Função |
|---|---|---|
| **CDN global** | Rede CF (~330 cidades) | PWA estática, imagens, vídeos, cache em cada PoP |
| **API gateway** | Worker `api` | JWT Firebase, roteamento, rate limit, CORS |
| **Media** | R2 + Cache | Fotos/vídeos/stories com cache global e upload directo (presigned) |
| **Metadados** | D1 + réplicas + Hyperdrive | Publicações, perfis, mensagens, analytics (SQL forte) |
| **Cache distribuído** | KV | Feed pré-renderizado, sessões, contadores, i18n |
| **Filas / tarefas** | Queues | E-mails, notificações push, processos de vídeo, limpeza |
| **Tempo real** | Durable Objects | Presença, chats ao vivo, estados de chamada |
| **Chamadas SFU** | Calls (já ativo) | `connected-api.ocerebro936.workers.dev` |
| **Autenticação** | Firebase Auth (mantido) | Zero-migração de contas |
| **Payments** | Stripe (existente) + Webhook Worker | Sem alteração de fluxo |
| **Monitorização** | Analytics Engine + Workers Logs + Grafana(opt.) | Métricas em tempo real |

---

## 3. Escalabilidade

| Necessidade | Mecanismo |
|---|---|
| Mais utilizadores/publicações | Workers escalam automaticamente por pedido; D1 réplicas de leitura; KV/R2 cache absorve picos |
| Mais vídeos | Upload directo para R2 (streaming em HTTP range + transformações CF) |
| Mais mensagens/chamadas | Durable Objects (estado colocado no PoP do utilizador) |
| Mais empresas | Workers por tenant + isolamento via D1 partitions / namespace |
| Picos de tráfego | Auto-scaling nativo CF + rate limiting + cache TTL dinâmico |
| Falha de região | Failover automático: réplicas D1 + origem R2 ativa |

**Regra de ouro:** estático e cache em primeiro lugar; compute só quando necessário.

---

## 4. Alta Performance (Objetivos)

- Abertura de página: **< 1 s** no mundo (PWA + cache edge)
- Mensagens: **< 200 ms** (DO no PoP local)
- Vídeos: play **< 1 s** (R2 + range requests + cache)
- Imagens: progressivas (transforma + AVIF/WebP automático na borda)
- Chamadas: setup **< 2 s** (Calls edge — já)
- Pesquisa: **< 300 ms** (index KV/dedicado)

---

## 5. Monitorização & Painel

**Fontes de dados:** Workers Analytics Engine, Logs (pull/push), D1 metrics, Calls telemetry, Firebase metrics, Stripe events.

**Painel administrativo (na app, tab Admin):**
- CPU/memória/storage/largura de banda por serviço
- Estado dos servidores e saúde das bases (réplicas, latência)
- Filas de mensagens (backlog, throughput)
- Erros 4xx/5xx em tempo real por rota
- Alertas configuráveis: expansão automática ou notificação à equipa

**Alertas padrão:** latência > X, 5xx > Y%, fila > Z, calls falhadas, pagamentos a falhar.

---

## 6. DIVINO IA — Centro Inteligente

- **Monitoriza:** métricas agregadas, logs, anomalias
- **Prevê:** necessidade de capacidade (modelo simples baseado em tendências)
- **Identifica:** falhas antes do utilizador notar
- **Sugere:** otimizações (cache, índices, queries)
- **Atua** apenas em tarefas não-críticas (limpeza de cache, relatórios);
  operações críticas (infra em produção, pagamentos, segurança) **exigem aprovação** — Bluewhite Corporation Lda.

---

## 7. Notificações, Sons & Sincronização (resumo de estado)

| Funcionalidade | Estado |
|---|---|
| PWA + atualização automática (UpdateNotifier) | 🟢 feito |
| Sons por evento (engine + prefs + preview nas Definições) | 🟢 feito |
| Centro de Notificações (sino + Firestore `notifications`) | 🟢 base feito |
| Push real (FCM no telemóvel) | 🟡 pendente (requer FCM config + permissão) |
| Sincronização entre dispositivos | 🟢 base (Firestore em tempo real) |

---

## 8. Plano de Implementação (Fases)

### Fase 0 — Hoje (já feito)
- Design v2.0 dourado + dia/noite · Login novo (Entrar/Criar Conta/Baixar Aplicativo) · Merchant Identity · Calls SFU em produção

### Fase 1 — Fundação Cloudflare (próximas 2–3 semanas)
1. `wrangler` local funcional + deploy `connected-api` (chamadas) já feito ✔
2. **Media → R2:** upload directo + cache global (substitui Storage para media pesada)
3. **API gateway Worker** para operações sociais (feed, followers, likes)
4. **KV:** cache de perfis públicos + feed pré-renderizado
5. Analytics Engine ligado (métricas base)

### Fase 2 — Dados & Tempo Real
6. **D1 + Hyperdrive:** migração de dados quentes (posts, mensagens) com espelho Firestore em modo leitura
7. **Durable Objects:** presença + chat em tempo real nos PoPs
8. **Queues:** notificações push, e-mails, processamento de vídeo

### Fase 3 — Inteligência & Observabilidade
9. Painel de monitorização na app (Admin)
10. DIVINO IA como centro operacional (Worker + previsão de carga)
11. Alertas + auto-expansão configurados

---

## 9. Riscos & Decisões

| Decisão | Recomendação |
|---|---|
| Firestore vs D1 | Híbrido: Firestore para dados do utilizador/contas; D1 para conteúdo social + analytics |
| Domínio próprio | **Necessário** — apontar CNAME para a CF (remove limitação GitHub Pages) |
| Custos | CF gratuito até limites generosos; R2 storage ~gratuito egress |
| Continuidade | GitHub Pages continua como fallback; domínio aponta para CF |

---

## 10. Primeiras Ações Concretas

1. **Registar domínio próprio** e mover o deploy para Cloudflare Pages/Workers (mantém GitHub Pages como fallback)
2. **Criar bucket R2** `connected-media` + Worker de upload directo
3. **Ligar Analytics Engine** no worker `connected-api` (já em produção)
4. **Desenhar schema D1** para posts/mensagens (primeiro passo da Fase 2)
5. **Definir painel de monitorização** na app (Fase 3, pode começar com dados do Analytics Engine já na Fase 1)

---

## 11. Recursos Oficiais & Infraestrutura Existente

### Links de referência
- **YouTube Data API v3 — Getting Started:** https://developers.google.com/youtube/v3/getting-started
- **Firebase Console (projeto `gen-lang-client-0029245143`):** https://console.firebase.google.com/project/gen-lang-client-0029245143
  - **Data Connect:** `us-east4` → serviço `gen-lang-client-0029245143-service`
  - Direto (dados): `https://console.firebase.google.com/project/gen-lang-client-0029245143/dataconnect/locations/us-east4/services/gen-lang-client-0029245143-service/data`
  - Firestore database: `ai-studio-12e32cf3-fb55-47b1-a2e3-74c92b9956df`

### Cloud SQL (backend SQL do Data Connect)
| Campo | Valor |
|---|---|
| Região | `us-east4` |
| Instância | `gen-lang-client-0029245143-instance` |
| Banco de dados | `gen-lang-client-0029245143-database` |

> Nota: o Firebase Data Connect do projeto usa esta instância Cloud SQL como base. Para a Fase 2 (D1), manter Firestore como fonte de verdade enquanto o Data Connect/Cloud SQL é adotado para dados quentes (posts, mensagens, analytics) — ou usar Hyperdrive para ligar a esta instância a partir dos Workers, evitando migração inicial.
