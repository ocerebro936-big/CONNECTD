import {
  collection,
  doc,
  setDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ChannelValidationResult, ChannelCategory } from './channel-finder';

// ============================================================================
// Connect TV — catálogo de canais (backend real)
// ----------------------------------------------------------------------------
// Substitui a biblioteca hardcoded por documentos em Firestore. Canais
// "integrados" são semeados (idempotente). Fontes externas descobertas pelo
// Channel Finder entram como 'pending' e ficam visíveis após autorização.
// ============================================================================

export interface ChannelDoc {
  id?: string;
  title: string;
  creator: string;
  category: string;
  url: string;
  thumbnail: string;
  duration: string;
  views: number;
  rating: number;
  year: string;
  type: 'integrated' | 'official' | 'external';
  status: 'authorized' | 'pending' | 'rejected';
  source: 'official' | 'user';
  addedBy?: string;
  addedByName?: string;
  authorizedBy?: string;
  validation?: ChannelValidationResult;
  createdAt: number;
}

interface IntegratedSeed {
  title: string;
  creator: string;
  duration: string;
  category: ChannelCategory;
  url: string;
  thumbnail: string;
  views: number;
  rating: number;
  year: string;
}

const GTV = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';

export const INTEGRATED_CHANNELS: IntegratedSeed[] = [
  { title: 'Big Buck Bunny', creator: 'Blender Foundation', duration: '9:56', category: '🎬 Filmes', url: `${GTV}/BigBuckBunny.mp4`, thumbnail: `${GTV}/images/BigBuckBunny.jpg`, views: 1284000, rating: 4.8, year: '2008' },
  { title: 'Sintel', creator: 'Blender Foundation', duration: '14:48', category: '🎬 Filmes', url: `${GTV}/Sintel.mp4`, thumbnail: `${GTV}/images/Sintel.jpg`, views: 842000, rating: 4.7, year: '2010' },
  { title: 'Tears of Steel', creator: 'Blender Foundation', duration: '12:14', category: '🎬 Filmes', url: `${GTV}/TearsOfSteel.mp4`, thumbnail: `${GTV}/images/TearsOfSteel.jpg`, views: 675000, rating: 4.6, year: '2012' },
  { title: 'Elephants Dream', creator: 'Blender Foundation', duration: '10:53', category: '🎬 Filmes', url: `${GTV}/ElephantsDream.mp4`, thumbnail: `${GTV}/images/ElephantsDream.jpg`, views: 531000, rating: 4.5, year: '2006' },
  { title: 'For Bigger Fun', creator: 'Google', duration: '1:00', category: '🎵 Música', url: `${GTV}/ForBiggerFun.mp4`, thumbnail: `${GTV}/images/ForBiggerFun.jpg`, views: 921000, rating: 4.4, year: '2015' },
  { title: 'For Bigger Joyrides', creator: 'Google', duration: '0:15', category: '🎵 Música', url: `${GTV}/ForBiggerJoyrides.mp4`, thumbnail: `${GTV}/images/ForBiggerJoyrides.jpg`, views: 388000, rating: 4.3, year: '2015' },
  { title: 'For Bigger Blazes', creator: 'Google', duration: '0:15', category: '🎵 Música', url: `${GTV}/ForBiggerBlazes.mp4`, thumbnail: `${GTV}/images/ForBiggerBlazes.jpg`, views: 264000, rating: 4.2, year: '2015' },
  { title: 'For Bigger Escapes', creator: 'Google', duration: '0:15', category: '📚 Educação', url: `${GTV}/ForBiggerEscapes.mp4`, thumbnail: `${GTV}/images/ForBiggerEscapes.jpg`, views: 178000, rating: 4.1, year: '2015' },
  { title: 'For Bigger Meltdowns', creator: 'Google', duration: '0:15', category: '📚 Educação', url: `${GTV}/ForBiggerMeltdowns.mp4`, thumbnail: `${GTV}/images/ForBiggerMeltdowns.jpg`, views: 152000, rating: 4.0, year: '2015' },
  { title: 'Volkswagen GTI Review', creator: 'Motor Trend', duration: '10:20', category: '📰 Notícias', url: `${GTV}/VolkswagenGTIReview.mp4`, thumbnail: `${GTV}/images/VolkswagenGTIReview.jpg`, views: 445000, rating: 4.3, year: '2016' },
  { title: 'What Car Can You Get For A Grand?', creator: 'Motoring', duration: '9:30', category: '📰 Notícias', url: `${GTV}/WhatCarCanYouGetForAGrand.mp4`, thumbnail: `${GTV}/images/WhatCarCanYouGetForAGrand.jpg`, views: 233000, rating: 4.2, year: '2016' },
  { title: 'We Are Going On Bullrun', creator: 'Bullrun', duration: '47:20', category: '⚽ Desporto', url: `${GTV}/WeAreGoingOnBullrun.mp4`, thumbnail: `${GTV}/images/WeAreGoingOnBullrun.jpg`, views: 198000, rating: 4.4, year: '2016' },
  { title: 'Subaru Outback: Street & Dirt', creator: 'Car Media', duration: '9:54', category: '🎙 Podcasts', url: `${GTV}/SubaruOutbackOnStreetAndDirt.mp4`, thumbnail: `${GTV}/images/SubaruOutbackOnStreetAndDirt.jpg`, views: 167000, rating: 4.1, year: '2016' },
  { title: 'The Making of Sintel', creator: 'Blender Foundation', duration: '14:48', category: '📽 Documentários', url: `${GTV}/Sintel.mp4`, thumbnail: `${GTV}/images/Sintel.jpg`, views: 412000, rating: 4.6, year: '2011' },
];

// Semea os canais integrados de forma idempotente (doc id estável).
export async function seedIntegratedChannels(): Promise<void> {
  const base = Date.now() - 1000 * 60 * 60 * 24 * 365;
  const writes = INTEGRATED_CHANNELS.map((c, i) => {
    const ref = doc(db, 'tvChannels', `integrated-${i}`);
    const docData: ChannelDoc = {
      title: c.title,
      creator: c.creator,
      category: c.category,
      url: c.url,
      thumbnail: c.thumbnail,
      duration: c.duration,
      views: c.views,
      rating: c.rating,
      year: c.year,
      type: 'integrated',
      status: 'authorized',
      source: 'official',
      createdAt: base + i * 1000,
    };
    return setDoc(ref, docData, { merge: true });
  });
  await Promise.all(writes);
}

export async function listTvChannels(
  uid?: string,
  isAdmin = false
): Promise<ChannelDoc[]> {
  if (isAdmin) {
    const snap = await getDocs(query(collection(db, 'tvChannels'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChannelDoc));
  }
  // Utilizador normal: não pode ler canais de outros utilizadores nem
  // pendentes. Fazemos duas queries seguras (autorizados + os seus próprios).
  const authorizedSnap = await getDocs(
    query(collection(db, 'tvChannels'), where('status', '==', 'authorized'), orderBy('createdAt', 'desc'))
  );
  const authorized = authorizedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ChannelDoc));
  if (!uid) return authorized;
  const ownSnap = await getDocs(
    query(collection(db, 'tvChannels'), where('addedBy', '==', uid), orderBy('createdAt', 'desc'))
  );
  const own = ownSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ChannelDoc));
  const byId = new Map<string, ChannelDoc>();
  [...authorized, ...own].forEach((c) => byId.set(c.id!, c));
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export interface AddChannelInput {
  url: string;
  title: string;
  category: string;
  thumbnail?: string;
  validation: ChannelValidationResult;
  user: { uid: string; displayName?: string; email?: string };
}

export async function addChannelFromFinder(input: AddChannelInput): Promise<string> {
  const status: ChannelDoc['status'] = input.validation.authorized ? 'authorized' : 'pending';
  const ref = await addDoc(collection(db, 'tvChannels'), {
    title: input.title.trim() || input.validation.domain,
    creator: input.user.displayName || input.user.email?.split('@')[0] || 'Utilizador',
    category: input.category,
    url: input.validation.normalized,
    thumbnail:
      input.thumbnail ||
      `https://picsum.photos/seed/${encodeURIComponent(input.title || input.validation.domain)}/600/400`,
    duration: '—',
    views: 0,
    rating: 0,
    year: new Date().getFullYear().toString(),
    type: 'external',
    status,
    source: 'user',
    addedBy: input.user.uid,
    addedByName: input.user.displayName || input.user.email?.split('@')[0] || 'Utilizador',
    validation: input.validation,
    createdAt: Date.now(),
  } as ChannelDoc);
  return ref.id;
}

export async function listPendingChannels(): Promise<ChannelDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'tvChannels'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChannelDoc));
}

export async function setChannelStatus(
  id: string,
  status: 'authorized' | 'rejected',
  adminUid: string
): Promise<void> {
  await updateDoc(doc(db, 'tvChannels', id), {
    status,
    authorizedBy: adminUid,
  });
}

export async function incrementChannelViews(id: string): Promise<void> {
  // Incremento leve; tolerante a falhas (não bloqueia a reprodução).
  try {
    const ref = doc(db, 'tvChannels', id);
    await updateDoc(ref, { views: increment(1) });
  } catch {
    /* ignora */
  }
}
