# Connected Cloud Functions (CON-WORKER / CON-MEDIA)

Funções geridas que fazem o processamento pesado do Connected Cloud Core,
movendo a lógica do cliente para o servidor.

## Funções
- `processMediaOnFinalize` (storage.onFinalize): gera thumbnail de imagens, extrai
  duração/waveform de áudio e thumbnail/duração de vídeo. Atualiza `cloudAssets`
  (processingState: uploading → ready | failed).
- `connectedWorkerTick` (scheduler 2 min): purge de posts eliminados fora da janela
  de recuperação (30 dias) e de `cloudAssets` falhados.

## IAM (service account da função)
Necessário para escrever/ler no Storage e ler/escrever no Firestore:
- storage.objects.create / update / delete / get / list
- storage.buckets.get
- (o projeto Firebase já concede estas ao default runtime service account)

## Deploy
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```
Requer `firebase login --reauth` e o Storage ativo no projeto `connected-ecossistema`.
