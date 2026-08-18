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
import { getAuth } from 'firebase-admin/auth';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import * as sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import * as fs from 'node:fs';
import { Storage as MegaStorage } from 'megajs';

initializeApp();
const db = getFirestore();
const storage = getStorage();
const auth = getAuth();

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
  const thumbBuf = fs.readFileSync('/tmp/' + thumbPath.split('/').pop()!);
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

// ============================================================================
// CON-WORKER → megaBridge: ponte server-side para o MEGA (Storage Provider).
// As credenciais MEGA vivem em variáveis de ambiente da função (NUNCA no
// cliente). O cliente autentica-se com o seu ID token Firebase. Requer a
// dependência `megajs` e as env vars MEGA_EMAIL / MEGA_PASSWORD (ou
// MEGA_SESSION). Validar a API exata do `megajs` instalado antes de produzir.
// ============================================================================
async function megaClient(): Promise<any> {
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;
  if (!email || !password) throw new Error('MEGA_EMAIL/MEGA_PASSWORD não configurados na função.');
  const mega = new MegaStorage({ email, password });
  await mega.ready;
  return mega;
}

function findMegaNode(mega: any, key: string): any {
  const walk = (node: any): any => {
    if (node.name === key) return node;
    if (node.children) for (const c of node.children) {
      const found = walk(c);
      if (found) return found;
    }
    return null;
  };
  return walk(mega.root);
}

export const megaBridge = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    const token = (req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) { res.status(401).send('unauthorized'); return; }
    await auth.verifyIdToken(token); // autentica o utilizador Connected

    const key = String(req.query.key || '');
    if (!key) { res.status(400).send('key required'); return; }

    if (req.method === 'POST' && req.path.endsWith('/upload')) {
      const buffer: Buffer = (req as any).rawBody || (req.body as Buffer);
      const mime = req.header('x-mime') || 'application/octet-stream';
      const mega = await megaClient();
      const file: any = await mega.upload({ name: key, size: buffer.length, mime }, buffer).complete;
      res.json({ url: file.link });
      return;
    }

    if (req.method === 'GET' && req.path.endsWith('/download')) {
      const mega = await megaClient();
      const node = findMegaNode(mega, key);
      if (!node) { res.status(404).send('not found'); return; }
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        node.download((e: any, data: Buffer) => {
          if (e) return reject(e);
          if (!data) return resolve();
          chunks.push(data);
        });
      });
      res.set('Content-Type', node.mime || 'application/octet-stream').send(Buffer.concat(chunks));
      return;
    }

    if (req.method === 'POST' && req.path.endsWith('/delete')) {
      const mega = await megaClient();
      const node = findMegaNode(mega, key);
      if (!node) { res.status(404).send('not found'); return; }
      await node.delete();
      res.json({ ok: true });
      return;
    }

    if (req.method === 'GET' && req.path.endsWith('/exists')) {
      const mega = await megaClient();
      const node = findMegaNode(mega, key);
      res.json({ exists: !!node });
      return;
    }

    res.status(405).send('method not allowed');
  } catch (err: any) {
    res.status(500).send(String(err?.message || err));
  }
});
