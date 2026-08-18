import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

const DEVICE_KEY = 'connected_device_id';
const SESSION_VERSION_KEY = 'connected_session_version';

export interface DeviceInfo {
  deviceId: string;
  browser: string;
  os: string;
  isMobile: boolean;
  userAgent: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  deviceId: string;
  browser: string;
  os: string;
  isMobile: boolean;
  userAgent: string;
  lastSeen: number;
  createdAt: number;
}

const getOs = (ua: string): string => {
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Desconhecido';
};

const getBrowser = (ua: string): string => {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  if (/opera|opr\//i.test(ua)) return 'Opera';
  return 'Navegador';
};

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return {
    deviceId,
    browser: getBrowser(ua),
    os: getOs(ua),
    isMobile: /android|iphone|ipad|ipod/i.test(ua),
    userAgent: ua.slice(0, 500),
  };
}

export function getSessionVersion(userId: string): number {
  return Number(localStorage.getItem(`${SESSION_VERSION_KEY}:${userId}`) || '0');
}

export function setSessionVersion(userId: string, version: number) {
  localStorage.setItem(`${SESSION_VERSION_KEY}:${userId}`, String(version));
}

export interface RegisterSessionResult {
  sessionId: string;
  isNewDevice: boolean;
}

export async function registerSession(userId: string): Promise<RegisterSessionResult> {
  const dev = getDeviceInfo();
  const sessionsRef = collection(db, 'sessions');
  const q = query(sessionsRef, where('userId', '==', userId), where('deviceId', '==', dev.deviceId));
  const existing = await getDocs(q);
  const lastSeen = Date.now();

  if (!existing.empty) {
    const snap = existing.docs[0];
    await updateDoc(doc(db, 'sessions', snap.id), { lastSeen }).catch(() => {});
    return { sessionId: snap.id, isNewDevice: false };
  }

  const created = await addDoc(sessionsRef, {
    userId,
    deviceId: dev.deviceId,
    browser: dev.browser,
    os: dev.os,
    isMobile: dev.isMobile,
    userAgent: dev.userAgent,
    lastSeen,
    createdAt: lastSeen,
  });
  return { sessionId: created.id, isNewDevice: true };
}

export async function listActiveSessions(userId: string): Promise<ActiveSession[]> {
  const q = query(collection(db, 'sessions'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActiveSession));
}

export async function revokeSession(sessionId: string) {
  await deleteDoc(doc(db, 'sessions', sessionId));
}

export async function revokeAllOtherSessions(userId: string, currentDeviceId: string) {
  const sessions = await listActiveSessions(userId);
  await Promise.all(
    sessions.filter((s) => s.deviceId !== currentDeviceId).map((s) => revokeSession(s.id))
  );
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { sessionVersion: increment(1) }).catch(() => {});
  const snap = await getDoc(userRef);
  const version = snap.data()?.sessionVersion || 0;
  setSessionVersion(userId, version);
  return sessions.filter((s) => s.deviceId !== currentDeviceId).length;
}

export const is2FAEnabled = async (user: any): Promise<boolean> => {
  try {
    const { multiFactor } = await import('firebase/auth');
    const mfa = multiFactor(user);
    return mfa.enrolledFactors.length > 0;
  } catch {
    return false;
  }
};