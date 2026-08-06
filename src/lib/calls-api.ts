import { auth } from '../firebase';
import { PartyTracks } from 'partytracks/client';

export const CALLS_API_URL: string = (import.meta.env.VITE_CALLS_API_URL as string) || 'https://connected-api.ocerebro936.workers.dev';

export const CLOUD_PREFIX = '/api/calls/cloud';

export interface CloudContext {
  callId: string;
  uid: string;
}

/**
 * Cria um PartyTracks apontado ao proxy do Worker (SFU Cloudflare).
 * Todas as chamadas de sessão/track passam pelo Worker com auth Firebase.
 */
export async function createPartyTracks(ctx: CloudContext): Promise<PartyTracks | null> {
  if (!CALLS_API_URL) return null;
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return null;
    return new PartyTracks({
      prefix: `${CALLS_API_URL}${CLOUD_PREFIX}`,
      headers: new Headers({ Authorization: `Bearer ${idToken}` }),
      apiExtraParams: `callId=${encodeURIComponent(ctx.callId)}&uid=${encodeURIComponent(ctx.uid)}`,
    });
  } catch {
    return null;
  }
}

export async function divinoCloudChat(
  messages: { role: string; text: string }[]
): Promise<string | null> {
  if (!CALLS_API_URL) return null;
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return null;
    const res = await fetch(`${CALLS_API_URL}/api/divino`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.text === 'string' && data.text ? data.text : null;
  } catch {
    return null;
  }
}
