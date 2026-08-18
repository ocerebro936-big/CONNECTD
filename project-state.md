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

## Connected Storage — fornecedores (agnostico)
- ConnectedStorage + StorageProvider (provider.ts). Firebase = default.
- MEGA adicionado como StorageProvider delegado: cliente em src/lib/cloud-storage/mega-provider.ts (MegaStorageProvider) -> bridge server-side megaBridge (functions/src/index.ts, CON-WORKER) com megajs.
- Credenciais MEGA: env vars da funcao (MEGA_EMAIL/MEGA_PASSWORD). Nunca no cliente.
- Selecionar via createStorageProvider('mega', { bridgeUrl, getIdToken }).
- Registado no Billing Core (PROVIDER_REGISTRY: mega-storage).

## Rebrand -> Connected King (CK)
- Nome oficial: Connected King 👑 (CK). URL pretendida: https://www.connectedking.web.app.
- Central: src/lib/brand.ts (BRAND). domain-config OFFICIAL_URL atualizado.
- index.html (title/OG/twitter/canonical/theme-color #050b20/JSON-LD), public/manifest.json (novo), public/logo.svg (CK + coroa).
- App.tsx titulos/header/share/moderacao, DIVINO (divino-core + divino-engine) saudacao -> Connected King, CloudStatusPage, DivinoIa, DivinoMordomo, AdminPanel, SettingsPage, ProfilePage, app-version APP_NAME.
- SEO: robots.txt + sitemap.xml apontam para connectedking.web.app.
- Pillares (Connected Music/Business/TV/Run) mantidos como sub-marcas; 'Connected Cloud' -> 'Connected King Cloud'.
- PNG icons em public/icons/ precisam ser regenerados com a nova identidade (avatar/coroa).

## Connected Cloud Storage (CCS) — camada propria
- src/lib/ccs/index.ts: estrutura de objetos (users/posts/reels/...), CcsVisibility (public/private/friends/followers/group/admin/system), tiers de receita (free 5GB/plus 50GB/pro 250GB/creator 1TB/business 5TB), CCS_ENGINES (CCS-Core/Upload/Media/CDN/Backup/Security/AI/Analytics), API spec /api/v1/storage, roadmap de escala.
- src/lib/cloud-storage/s3-provider.ts: S3StorageProvider (StorageProvider) via presigned URLs (bridge ccsPresign). createStorageProvider suporta 's3'.
- quota-engine.ts: tiers alinhados ao CCS (free/plus/pro/creator/business).
- topology.ts: CCS_TOPOLOGY (estrutura + motores + camadas + roadmap).
- functions/src/index.ts: ccsPresign (onRequest) gera presigned URLs S3-compatible (PUT/GET/HEAD/DELETE); deps @aws-sdk/client-s3 + s3-request-presigner. Credenciais AWS via env CCS_BUCKET/AWS_REGION (ADC/Secret Manager).

## Componentes de upload CCS (avatar/fotos/videos)
- src/lib/ccs/upload.ts: uploadToCcs() — usa ccsUserKey/ccsPostKey, verifica quota (CCS-Billing), checksum (CCS-Security), regista cloudAsset. ccsFolderForKind mapeia kind->pasta.
- src/components/CcsUploader.tsx: botao de upload reutilizavel (avatar/fotos/videos/audio/docs) com barra de progresso e verificacao de quota.
- cloud-upload.ts publishMediaPost: storagePath/thumbnailPath agora usam ccsUserKey (users/{uid}/{photos|videos|audio|documents}).
- App.handleImageUpload (avatar/capa): passa a usar uploadToCcs (CCS) em vez de uploadString direto.
- ProfilePage: overlay do avatar usa CcsUploader (avatar); secao 'Galeria Connected Cloud' com CcsUploader para fotos e videos.

## Compositor (FeedPage) com CcsUploader
- CcsUploader ligado ao compositor para 'audio' (pasta audio) e 'document' (pasta documents), com barra de progresso e verificacao de quota.
- uploadToCcs passa a devolver {url, assetId, key, file}; CcsUploader devolve CcsUploadResult[] em onUploaded.
- publishCcsMediaPost (cloud-upload.ts): cria o post com o URL ja carregado para a CCS, sem duplo upload. O feed (onSnapshot no pai) atualiza automaticamente.
- ProfilePage atualizado para o novo onUploaded (results[0]?.url).

## PR #2 — CCS Universal Media Pipeline
- Estrutura src/lib/ccs/ nova: upload/ (types, retry, resume, chunk-upload, uploader), media/ (image derivados, video thumb, audio), cache/ (media-cache), providers/ (connected/s3/mega).
- ccsUpload(): pipeline unico validate -> quota -> checksum -> upload resiliente (retry/resume via connectedStorage) -> verify -> derivados de imagem (original/large/medium/small/thumbnail) + thumbnail de video -> publish (cloudAsset). Sem dependencia direta de firebase/storage.
- CcsUploader reconstruido como pasta src/components/ccs/CcsUploader (Progress, Preview, UploadQueue, CcsUploader) com fila e progresso real.
- GalleryPage passou a usar CcsUploader (folder 'gallery'); removido uso direto de firebase/storage na Galeria e no thumbnail de cloud-upload.ts (agora via connectedStorage).
- Firebase Storage deixa de ser dependencia direta da logica da app (provider continua a abstrair; troca futura para Connected Storage proprio = so mudar provider).
- Camera/TV/Marketplace: reutilizarao o mesmo CcsUploader (componente ja universal).

## PR #3 — CCS Media Intelligence + remocao total do Firebase Storage direto
- Removido TODO o uso direto de firebase/storage do codigo da app: ChatModal, FeedPage Stories, upload-engine.ts (resumableUpload via connectedStorage), App.tsx (imports orfaos), storage-upload.ts/music.ts (via connectedStorage), GoLiveModal (connectedStorage). Restam apenas cloud-storage/provider.ts + engines (camada de abstracao) e firebase.ts (init SDK).
- StorageProvider estendido com metadata() e signedUrl() (ConnectedStorage delega; opcionais nos providers S3/MEGA).
- Media Intelligence: media/dimensions.ts (computeImageTargets preservando proporcao + so downscale; VIDEO_PRESETS 1080/720/480), media/quality.ts (pickQuality adaptativa), media/metadata.ts (readMediaMeta via DOM). image.ts agora usa computeImageTargets + pickQuality.
- CcsFolder inclui 'chat'. ccsUpload exportado diretamente em upload.ts.

## PR #4 — Connected Fast Engine ✅ (commit/impl real)
- `src/lib/fast-engine/`: `cache.ts` (FastCache mem+IndexedDB; `feedCache`/`profileCache`/`mediaCache`), `dedupe.ts` (DedupeGuard), `prefetch.ts` (prefetchImages), `lazy.ts` (useInView + getConnectionTier/targetWidthForTier), `connection.ts` (useConnectionTier), `queue.ts` (TaskQueue; `mediaQueue`/`prefetchQueue`), `worker.ts` + `media.worker.ts` (OffscreenCanvas/thumb em worker), `index.ts` (barrel). `src/components/LazyMedia.tsx` (img/vídeo/álbum lazy). Ligado em `PostCard.tsx` e `FeedPage.tsx` (cache de feed + prefetch 12 itens). Branch `ccs-fast-engine`, PR #4, deploy OK.

## PR #5 — Connected RUN (share) ✅ (commit/impl real)
- `src/game/ConnectedRun.tsx` (já existia: 100 níveis, save local+cloud, ranking) ganhou `shareRun` (Web Share/clipboard) + botões Partilhar. Branch `ccs-connected-run`, PR #5, deploy OK.

## PR #6 — Connected Storage Infrastructure ✅ (commit/impl real)
- `src/lib/cloud-storage/init.ts` (`initConnectedStorage` lê VITE_CCS_PRESIGN_URL/VITE_CCS_CDN_BASE + getIdToken; troca provider), `provider.ts` (`use()`+getter), `functions/src/index.ts` `ccsPresign` PUT ACL public-read, `firebase.json` hosting array + `.firebaserc` targets, `.env.example` + `src/vite-env.d.ts` (VITE_CCS_*). Site `connectedking` criado; deploy para `connectedking.web.app` + `connected-ecossistema.web.app`. Branch `ccs-storage-infra`, PR #6, deploy OK.

## PR #7 — DIVINO IA Connected Intelligence Core ✅ (documentado como concluído)
- `src/lib/divino/`: `security/{policy,authority,audit}`, `memory/*`, `knowledge/connected`, `core/{intent,context,reasoning,response,cognition}`, `plugins/{registry,router,permissions}`, `tools/{cloud,social,tv,games,admin}`, `chat.ts`, `index.ts`. `DivinoIa.tsx` usa `divinoCognitiveChat` com badges de especialista/ferramenta + confirmação. Branch `ccs-divino-core`, PR #7, deploy `connectedking.web.app`.

## PR #8 — Connected RUN: KINGDOM ✅ (commit/impl real)
- `src/lib/game-save.ts` RunSave estendido (xp/gems/tickets/badges/energy/region/regiões/items/cosmetics/…) + merge servidor-local. `src/game/kingdom/{regions,character,economy,moments,globalActivity,league,npc}.ts`. `src/game/ConnectedRun.tsx` reescrito (8 regiões, King runner/hero/legend + cosméticos, Connected Mode, economia interna, Global Activity, World League, Divino Coach, NPCs). Branch `ccs-run-kingdom`, PR #8, deploy `connectedking.web.app`.

## PR #9 — Connected King Global Cloud (orquestração global) ✅ (commit/impl real)
- `src/lib/connected/`: `service-bus/{registry,router,events,health}` (Service Bus + Health Engine), `services/{cloud,social,tv,games,marketplace,wallet,jobs,analytics}` (cada serviço com interface + health + ações), `gateway/gateway.ts` (ConnectedGateway: invoke com política RESTRICTED + auditoria; diagnoseAll; runOrchestration), `audit.ts` (Connected Audit: quem/fez o quê/quando/serviço/recurso/resultado → Firestore `audit`), `usage.ts` (Usage & Billing: dimensões storage/bandwidth/compute/ai/video/ads/premium/games + tiers Free/Plus/Pro/Creator/Business/Enterprise), `index.ts` (globalCloud). DIVINO orquestrador: `divino/tools/connected.ts` (`connectedDiagnose`, `connectedOrchestrate`), capacidades `connected_health`/`connected_orchestrate` no `plugins/registry.ts`, intent `orchestrate` em `core/intent.ts`, router mapeia `diagnostics`→`connected_health`. Divino usa o mesmo barramento (não substitui infra física ainda). Branch `ccs-global-cloud`, PR #9, deploy `connectedking.web.app`.
- Arquitetura: Gateway→Service Bus→Serviços→(Cloud)→Providers (S3/MEGA/Firebase). Health Engine emite eventos health:down/degraded. Audit grava ações do Divino/admin. Usage mede sem misturar com Feed. Próximo: substituir progressivamente providers externos pelos servidores próprios da Connected (CCS-Core + nós).

## Estado
- Concluído: PR #1 Cloud Core, PR #2 CCS Universal Pipeline, PR #3 Media Intelligence+remoção firebase/storage, **PR #4 Fast Engine**, **PR #5 Connected RUN share**, **PR #6 Storage Infra**, **PR #7 DIVINO IA Core**, **PR #8 RUN: KINGDOM**, **PR #9 Global Cloud Orchestration** — todos com commits reais e deploy `connectedking.web.app`.
- Pendente (manual): ativar Firebase Storage no console; configurar env S3 (VITE_CCS_PRESIGN_URL/VITE_CCS_CDN_BASE + funções) para back-end próprio.
