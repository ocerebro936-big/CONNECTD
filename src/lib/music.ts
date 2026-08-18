// ============================================================================
// Connected Music — publicação e reprodução de áudio com backend real
// ----------------------------------------------------------------------------
// Regra: o que aparece existe de verdade. Cada música é um documento em
// Firestore (coleção `music`) + áudio/cover no Storage. Likes, plays, shares,
// downloads e comentários são reais.
// ============================================================================
import { storage, db } from '../firebase';
import { uploadResumable } from './storage-upload';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  increment,
  query,
  orderBy,
  where,
  limit as qLimit,
  serverTimestamp,
} from 'firebase/firestore';

export type MusicRights = 'original' | 'authorized' | 'cover';

export interface MusicTrack {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatar?: string;
  title: string;
  cover?: string;
  audioUrl: string;
  genre?: string;
  description?: string;
  duration?: number;
  plays: number;
  likes: number;
  shares: number;
  comments: number;
  downloads: number;
  rights: MusicRights;
  createdAt: any;
}

export interface PublishMusicInput {
  artistId: string;
  artistName: string;
  artistAvatar?: string;
  title: string;
  audioFile: File;
  coverFile?: File;
  genre?: string;
  description?: string;
  rights: MusicRights;
  duration?: number;
  checksum?: string;
  coverChecksum?: string;
  onProgress?: (label: string, pct: number) => void;
}

export async function publishMusicTrack(input: PublishMusicInput): Promise<string> {
  const trackRef = doc(collection(db, 'music'));
  const trackId = trackRef.id;

  const audio = uploadResumable({
    path: `music/${input.artistId}/${trackId}/audio`,
    file: input.audioFile,
    ownerUid: input.artistId,
    mimeType: input.audioFile.type,
    checksum: input.checksum,
    onProgress: (pct) => input.onProgress?.('Áudio', pct),
  });
  const audioUrl = await audio.promise;

  let cover: string | undefined;
  if (input.coverFile) {
    const coverUp = uploadResumable({
      path: `music/covers/${trackId}`,
      file: input.coverFile,
      ownerUid: input.artistId,
      mimeType: input.coverFile.type,
      checksum: input.coverChecksum,
      onProgress: (pct) => input.onProgress?.('Capa', pct),
    });
    cover = await coverUp.promise;
  }

  const track: Omit<MusicTrack, 'id'> = {
    artistId: input.artistId,
    artistName: input.artistName,
    artistAvatar: input.artistAvatar,
    title: input.title,
    cover,
    audioUrl,
    genre: input.genre,
    description: input.description,
    duration: input.duration,
    plays: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    downloads: 0,
    rights: input.rights,
    createdAt: serverTimestamp(),
  };

  await setDoc(trackRef, track);
  return trackId;
}

export async function listMusicTracks(lim = 50): Promise<MusicTrack[]> {
  const q = query(collection(db, 'music'), orderBy('createdAt', 'desc'), qLimit(lim));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as MusicTrack);
}

export async function listMusicByArtist(artistId: string, lim = 50): Promise<MusicTrack[]> {
  const q = query(
    collection(db, 'music'),
    where('artistId', '==', artistId),
    orderBy('createdAt', 'desc'),
    qLimit(lim)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as MusicTrack);
}

export async function getMusicTrack(trackId: string): Promise<MusicTrack | null> {
  const snap = await getDoc(doc(db, 'music', trackId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as MusicTrack;
}

export async function incrementPlays(trackId: string): Promise<void> {
  await updateDoc(doc(db, 'music', trackId), { plays: increment(1) });
}

export async function incrementShares(trackId: string): Promise<void> {
  await updateDoc(doc(db, 'music', trackId), { shares: increment(1) });
}

export async function incrementDownloads(trackId: string): Promise<void> {
  await updateDoc(doc(db, 'music', trackId), { downloads: increment(1) });
}

// Likes reais (subcoleção musicLikes para evitar contagem dupla)
export async function isMusicLiked(trackId: string, uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'music', trackId, 'likes', uid));
  return snap.exists();
}

export async function toggleMusicLike(trackId: string, uid: string): Promise<boolean> {
  const likeRef = doc(db, 'music', trackId, 'likes', uid);
  const snap = await getDoc(likeRef);
  if (snap.exists()) {
    await updateDoc(likeRef, { active: false });
    await updateDoc(doc(db, 'music', trackId), { likes: increment(-1) });
    return false;
  }
  await setDoc(likeRef, { uid, active: true, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'music', trackId), { likes: increment(1) });
  return true;
}

export interface MusicComment {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  text: string;
  createdAt: any;
}

export async function addMusicComment(
  trackId: string,
  comment: { userId: string; name: string; avatar?: string; text: string }
): Promise<void> {
  await addDoc(collection(db, 'music', trackId, 'comments'), {
    userId: comment.userId,
    authorName: comment.name,
    authorAvatar: comment.avatar,
    text: comment.text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'music', trackId), { comments: increment(1) });
}

export async function listMusicComments(trackId: string, lim = 50): Promise<MusicComment[]> {
  const q = query(collection(db, 'music', trackId, 'comments'), orderBy('createdAt', 'desc'), qLimit(lim));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as MusicComment);
}

// Lê a duração de um ficheiro de áudio no browser (para metadata real)
export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => resolve(Math.round(audio.duration) || 0);
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
}
