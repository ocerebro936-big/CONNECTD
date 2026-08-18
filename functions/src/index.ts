// ============================================================================
// Connected Cloud Core — Cloud Functions (CON-WORKER / CON-MEDIA)
// ----------------------------------------------------------------------------
// Processamento server-side de média + trabalhos autónomos agendados.
// Substitui a parte pesada dos motores client-side (thumbnail, transcode,
// waveform) por funções geridas, mantendo o orquestrador do cliente.
//
// IAM necessário (service account da função):
//   storage.objects.create / update / delete / get / list
//   storage.buckets.get
//   (as permissões em https://privacycg.github.io/storage-access/ não se aplicam;
//    aqui usamos Firebase Storage Security Rules + IAM de serviço)
// ============================================================================
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

initializeApp();
const db = getFirestore();
const storage = getStorage();

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic as string);

const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

async function findAssetByKey(storageKey: string) {
  const snap = await db.collection('cloudAssets').where('storageKey', '==', storageKey).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ref: d.ref, data: d.data() as any };
}

async function downloadBuffer(filePath: string): Promise<Buffer> {
  const [buf] = await storage.bucket().file(filePath).download();
  return buf;
}

async function uploadBuffer(dest: string, buf: Buffer, contentType: string): Promise<string> {
  const file = storage.bucket().file(dest);
  await file.save(buf, { contentType, metadata: { contentType } });
  await file.makePublic();
  return `https://storage.googleapis.com/${storage.bucket().name}/${dest}`;
}

async function processImage(filePath: string): Promise<Partial<any>> {
  const buf = await downloadBuffer(filePath);
  const thumb = await sharp(buf).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  const url = await uploadBuffer(`thumbnails/${filePath}`, thumb, 'image/jpeg');
  return { thumbnailUrl: url, width: 512, height: 512 };
}

async function processAudio(filePath: string): Promise<Partial<any>> {
  const local = `/tmp/${filePath.replace(/\//g, '_')}`;
  await storage.bucket().file(filePath).download({ destination: local });
  const duration = await new Promise<number>((resolve) => {
    ffmpeg(local).ffprobe((_, data) => resolve(Math.round((data?.format?.duration || 0))));
  });
  return { duration };
}

async function processVideo(filePath: string): Promise<Partial<any>> {
  const local = `/tmp/${filePath.replace(/\//g, '_')}`;
  await storage.bucket().file(filePath).download({ destination: local });
  const thumbPath = `thumbnails/${filePath}.jpg`;
  await new Promise<void>((resolve, reject) => {
    ffmpeg(local)
      .screenshots({ count: 1, filename: thumbPath.split('/').pop()!, folder: '/tmp' })
      .on('end', () => resolve())
      .on('error', reject);
  });
  const thumbBuf = require('node:fs').readFileSync('/tmp/' + thumbPath.split('/').pop()!);
  const url = await uploadBuffer(thumbPath, thumbBuf, 'image/jpeg');
  const duration = await new Promise<number>((resolve) => {
    ffmpeg(local).ffprobe((_, data) => resolve(Math.round(data?.format?.duration || 0)));
  });
  return { thumbnailUrl: url, duration };
}

// CON-MEDIA: processa cada objeto finalizado no Storage.
export const processMediaOnFinalize = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  const contentType = event.data.contentType || '';
  const asset = await findAssetByKey(filePath);
  if (!asset) return; // não rastreado por cloudAssets
  try {
    let derived: Partial<any> = {};
    if (contentType.startsWith('image/')) derived = await processImage(filePath);
    else if (contentType.startsWith('audio/')) derived = await processAudio(filePath);
    else if (contentType.startsWith('video/')) derived = await processVideo(filePath);
    await asset.ref.update({ ...derived, processingState: 'ready', updatedAt: FieldValue.serverTimestamp() });
  } catch (err) {
    await asset.ref.update({ processingState: 'failed', updatedAt: FieldValue.serverTimestamp() });
    throw err;
  }
});

// CON-WORKER: tick autónomo — limpeza de objetos/posts fora da janela.
export const connectedWorkerTick = onSchedule({ schedule: 'every 2 minutes' }, async () => {
  const cutoff = Date.now() - RECOVERY_WINDOW_MS;

  const deleted = await db.collection('posts').where('status', '==', 'deleted').limit(200).get();
  for (const d of deleted.docs) {
    const ts = d.data()?.deletedAt?.toMillis?.() || 0;
    if (ts && ts < cutoff) await d.ref.delete();
  }

  const failed = await db.collection('cloudAssets').where('processingState', '==', 'failed').limit(200).get();
  for (const d of failed.docs) {
    const ts = d.data()?.updatedAt?.toMillis?.() || 0;
    if (ts && ts < cutoff) await d.ref.delete();
  }
});
