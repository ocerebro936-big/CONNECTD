# Connected — Estado do Projeto

## Objetivo
Plataforma social (React + Firebase) com backend real: Social + Connected Music + Connected TV + Connected Run + Connected Business + DIVINO + Discovery + SEO, e agora **Connected Cloud Core** (infraestrutura própria de motores autónomos). Publicada em Firebase Hosting.

## Ambiente / Deploy
- Projeto Firebase: `connected-ecossistema` (hosting: **https://connected-ecossistema.web.app** — já publicado).
- `firebase-applet-config.json`, `index.html`, `firebase.json` (public dist, cleanUrls, sw.js) apontam para `connected-ecossistema`.
- **BLOQUEIO DEPLOY**: firebase login expirou → `firebase login --reauth` necessário para publicar. Storage ainda não ativado no console (clicar "Get Started" em console.firebase.google.com/project/connected-ecossistema/storage).
- Comandos: `npx firebase deploy --only hosting`, `firestore`, `storage`. Build: `npm run build` (= `tsc && vite build`; PWA gera dist/sw.js). tsc limpo.

## Estrutura de ficheiros-chave
- `src/lib/connected-engine.ts` — base `ConnectedEngine` + `EngineRegistry` + health store (localStorage).
- `src/lib/engines/engines.ts` — 10 motores: Storage, Health, Media, SEO, Discovery, Cleanup, Backup, Security, Notification, Billing.
- `src/lib/engines/index.ts` — `startCloudCore()` regista motores e corre a cada 2 min (iniciado em App.tsx useEffect).
- `src/lib/cloud-storage/` — **Connected Storage API (provider-agnóstico)**: `provider.ts` (StorageProvider + FirebaseStorageProvider + ConnectedStorage), `quota-engine.ts` (escalões FREE/CREATOR/PRO/BUSINESS + checkQuota), `checksum.ts` (SHA-256), `access-guard.ts` (canAccess WHO/WHAT/ACTION), `download-engine.ts`, `delete-engine.ts`, `media/image-engine.ts` (thumbnail), `media/audio-engine.ts` (waveform/duration), `media/video-engine.ts` (thumbnail+duração), `index.ts` (barrel).
- `src/lib/storage-upload.ts` — Upload Engine resumível (uploadBytesResumable + progresso + cloudAssets metadata). Ligado à Music (quota+checksum no MusicUpload).
- `src/lib/billing-core.ts` — Connected Billing Core (Provider Registry, custos estimados, alertas de consumo/quota).
- `src/lib/post-api.ts` — soft delete de posts (status deleted + janela de recuperação 30d; Cleanup Engine faz permanent delete). DashboardPage tem secção "Publicações eliminadas (recuperáveis)".
- `src/lib/connected-brand.ts` — hierarquia oficial da marca (CONNECT→CONNECTING→CONNECTED→CONNECTION→CONNECTED KING 👑) + `getBrandTier(points)`.
- `src/components/CrownBadge.tsx` — badge com Coroa (símbolo de reconhecimento, não admin); visível no perfil.
- `src/lib/topology.ts` — Connected Server Stack oficial (CON-APP/DATA/CACHE/MEDIA/WORKER/SEC) + schema de BD + mapeamento Firebase→servidor dedicado.
- `functions/` — **Cloud Functions** (CON-WORKER/CON-MEDIA): `processMediaOnFinalize` (thumbnail/áudio/vídeo) + `connectedWorkerTick` (purge agendado). IAM + deploy em `functions/README.md`.
- `src/pages/CloudStatusPage.tsx` — painel de saúde dos motores; nav "Cloud" (sidebar + bottom nav).
- `src/lib/seed.ts` — `seedDemoMusic`, `seedDemoBusinesses`, `seedDemoPost` (botões "Carregar exemplo" em MusicPage e BusinessPage).
- `src/lib/music.ts`, `src/lib/business.ts`, `src/lib/seo.ts`, `src/lib/game-save.ts`, `src/lib/divino-engine.ts`, `src/lib/discovery.ts` — pilares funcionais.
- `src/pages/MusicPage.tsx`, `BusinessPage.tsx`, `FeedPage.tsx`, `ConnectionsPage.tsx`, `GamesPage.tsx`, `App.tsx`.
- `firestore.rules` (cloudAssets DENTRO do bloco documents — corrigido), `storage.rules`, `public/robots.txt`, `public/sitemap.xml` (host connected-ecossistema.web.app).

## Estado
- Concluído: DIVINO CORE + Discovery + Feed personalizado; Connected Music/Business/Run/SEO; firestore.rules deploy OK; hosting deploy OK; **Connected Cloud Core** (base + 10 motores + painel + nav) — tsc+build OK (58 entries).
- Pendente deploy: hosting/cloud-core novo precisa re-auth; storage.rules precisa Storage ativado no console.
- Próximos (arquitetura Cloud Core): Storage Engine + Upload Engine (chunked/resume) + Media Engine (transcode/thumbnail via Cloud Functions) + Health Engine real; depois Plugin Engine; ligar SEO/Discovery/Security/DIVINO.

## Regras
- Tudo o que aparece tem backend real (Firestore/Storage).
- Não alterar `src/lib/divino-core.ts` (original). Novo core em `divino-engine.ts`.
- Game Coins, Connected Points, BlueCoin = sistemas separados.
