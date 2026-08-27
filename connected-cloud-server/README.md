# Connected Cloud Gateway

Backend **real** da Connected Cloud: object storage em disco, checksum SHA-256,
dedup, upload resumível, replicação entre nós, backup, Edge/CDN (ETag/304 +
URLs assinadas) e health checks. Node puro (sem dependências externas).

## Endpoints
- `POST /v1/upload/init` · `PUT /v1/upload/:id/:n` (chunk) · `POST /v1/upload/:id/complete`
- `GET /v1/assets/:key` (com `If-None-Match` → 304)
- `POST /v1/replicate` · `POST /v1/backup/snapshot` · `POST /v1/admin/gc` · `POST /v1/admin/audit`
- `GET /v1/nodes/health` · `GET /v1/metrics` · `GET /v1/sign` (URL assinada)
- `GET /v1/objects/:key` e `GET /v1/nodes/:node/objects/:key`

## Configuração (env)
Ver `.env.example`. Em produção, define `CCS_API_KEY` e `CCS_SIGN_KEY` como
**segredos do host / GitHub Actions** — nunca no código ou `.env` commitado.

## Development
```bash
npm install
npm test        # 25 testes de integração (upload, sha, dedup, replica, edge, sign)
node server.js  # sobe em :8787
```

## Deploy (GitHub Actions → GHCR)
O workflow `.github/workflows/gateway.yml`:
1. Corre `npm test` em cada PR/push (valida o Gateway antes de mexer).
2. Em push para `main`, faz build e push da imagem para
   `ghcr.io/<owner>/connected-gateway:latest` (usa `GITHUB_TOKEN`, sem segredos externos).

Depois, aponta um host Node (Cloud Run / Render / Fly) para essa imagem e define
`CCS_API_KEY`, `CCS_SIGN_KEY`, `CCS_ALLOWED_ORIGINS` como secrets de ambiente.

## Cliente (Connected King)
```env
VITE_CCS_GATEWAY_URL=https://<host>/
```
O app usa exclusivamente este Gateway (sem Firebase Storage). Sem Gateway
configurado, o upload falha de forma honesta — não há fallback silencioso.

## HTTPS
O Gateway deve ser exposto sempre por HTTPS (terminado no host / load balancer).
