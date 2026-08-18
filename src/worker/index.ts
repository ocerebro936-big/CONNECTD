/* Connected API — Cloudflare Worker
 * - /api/calls/cloud/*  -> proxy autenticado para Cloudflare Realtime SFU (PartyTracks)
 * - POST /api/divino     -> DIVINO IA via Workers AI (com fallback local)
 * - GET  /api/health
 */

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const FIRESTORE_API = 'https://firestore.googleapis.com/v1';
const RTC_API = 'https://rtc.live.cloudflare.com/v1';
const CLOUD_PREFIX = '/api/calls/cloud';

interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_ID: string;
  CALLS_APP_ID: string;
  CALLS_APP_SECRET: string;
  ALLOWED_ORIGINS: string;
  AI: any;
  ANALYTICS: any;
}

let jwksCache: { keys: any[]; fetchedAt: number } | null = null;

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function getJwks(): Promise<any[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < 3600_000) return jwksCache.keys;
  const res = await fetch(FIREBASE_JWKS_URL);
  const data: any = await res.json();
  jwksCache = { keys: data?.keys || [], fetchedAt: Date.now() };
  return jwksCache.keys;
}

async function verifyFirebaseToken(
  token: string,
  projectId: string
): Promise<{ uid: string; email?: string; name?: string; picture?: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (payload.aud !== projectId) return null;
    if ((payload.exp || 0) < Math.floor(Date.now() / 1000) - 30) return null;
    if (header.alg !== 'RS256' || !header.kid) return null;
    const keys = await getJwks();
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), data);
    if (!ok) return null;
    return {
      uid: payload.sub || payload.user_id || '',
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

function decodeFirestoreFields(fields: any): any {
  const out: any = {};
  if (!fields) return out;
  for (const [k, v] of Object.entries<any>(fields)) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = Number(v.doubleValue);
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('timestampValue' in v) out[k] = v.timestampValue;
    else if ('nullValue' in v) out[k] = null;
    else out[k] = v;
  }
  return out;
}

function callsEnabled(env: Env): boolean {
  return Boolean(env.CALLS_APP_ID && env.CALLS_APP_SECRET);
}

function trackAnalytics(
  env: Env,
  request: Request,
  route: string,
  status: number,
  durationMs: number
): void {
  if (!env.ANALYTICS) return;
  try {
    const cf = (request as any).cf || {};
    env.ANALYTICS.writeDataPoint({
      blobs: [
        request.method,
        route,
        String(status),
        cf.countryCode || 'unknown',
        cf.colo || 'unknown',
        (request.headers.get('User-Agent') || '').slice(0, 200),
      ],
      doubles: [durationMs],
      indexes: [new Date()],
    });
  } catch {
    // a telemetria nunca pode quebrar o pedido
  }
}

async function getCallDoc(env: Env, idToken: string, callId: string): Promise<any | null> {
  const url = `${FIRESTORE_API}/projects/${env.FIREBASE_PROJECT_ID}/databases/${env.FIREBASE_DATABASE_ID}/documents/calls/${callId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!res.ok) return null;
  const data: any = await res.json();
  return decodeFirestoreFields(data?.fields);
}

async function handleCloudProxy(
  env: Env,
  request: Request,
  idToken: string,
  verified: { uid: string }
): Promise<Response> {
  if (!callsEnabled(env)) {
    return json({ error: 'calls_not_configured', message: 'Chamadas Cloud ainda não configuradas.' }, 503);
  }

  const url = new URL(request.url);
  const rest = url.pathname.slice(CLOUD_PREFIX.length);
  if (!rest) return json({ error: 'not_found' }, 404);

  const callId = url.searchParams.get('callId') || '';
  const uid = url.searchParams.get('uid') || '';
  if (!callId || !uid || uid !== verified.uid) {
    return json({ error: 'forbidden' }, 403);
  }

  const call = await getCallDoc(env, idToken, callId);
  if (!call) return json({ error: 'call_not_found' }, 404);
  if (call.callerId !== uid && call.receiverId !== uid) return json({ error: 'forbidden' }, 403);

  if (rest === '/generate-ice-servers') {
    return json(
      {
        iceServers: [
          { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
        ],
      },
      200
    );
  }

  const target = `${RTC_API}/apps/${env.CALLS_APP_ID}${rest}${url.search}`;
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${env.CALLS_APP_SECRET}`);
  headers.set('Content-Type', 'application/json');
  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }
  return fetch(target, init);
}

async function handleDivino(env: Env, request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) return json({ error: 'unauthorized' }, 401);
  const verified = await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
  if (!verified) return json({ error: 'invalid_token' }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const messages: { role: string; text: string }[] = Array.isArray(body?.messages)
    ? body.messages.slice(-12)
    : [];
  const query = [...messages].reverse().find((m) => m.role === 'user')?.text || '';
  if (!query) return json({ error: 'empty_query' }, 400);

  const history = messages
    .filter((m) => m.role === 'user' || m.role === 'model')
    .slice(-10)
    .map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }));

  try {
    const result: any = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content:
            'Tu és o DIVINO IA, o núcleo inteligente da plataforma Connected King, criado e controlado pela Bluewhite Corporation Lda. Responde sempre em português de Portugal, de forma útil, breve e oracular. Conheces a plataforma: pontos, níveis (Novo Membro a Lenda Connected), avaliações 0-10, cargos, chamadas, Galeria, Connect TV, Games Online e comunidades.',
        },
        ...history,
      ],
    });
    const text: string = result?.response || '';
    return json({ text: typeof text === 'string' && text ? text : 'O DIVINO IA reflete em silêncio...' });
  } catch {
    return json({ text: 'O DIVINO IA está a meditar sobre essa questão. Reformula ou pergunta sobre pontos, cargos, Galeria, Connect TV ou avaliações 0-10.' }, 200);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(env, origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const notFound = () => json({ error: 'not_found' }, 404, cors);
    const startedAt = Date.now();
    let response: Response;
    let route = 'other';

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        route = 'health';
        response = json({ ok: true, service: 'connected-api' }, 200, cors);
      } else if (url.pathname.startsWith(CLOUD_PREFIX + '/') && ['GET', 'POST', 'PUT'].includes(request.method)) {
        route = 'calls';
        const authHeader = request.headers.get('Authorization') || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        const verified = idToken ? await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID) : null;
        if (!verified) response = json({ error: 'unauthorized' }, 401, cors);
        else response = await handleCloudProxy(env, request, idToken, verified);
      } else if (url.pathname === '/api/divino' && request.method === 'POST') {
        route = 'divino';
        response = await handleDivino(env, request);
      } else {
        response = notFound();
      }
    } catch {
      route = 'error';
      response = json({ error: 'internal' }, 500, cors);
    }

    trackAnalytics(env, request, route, response.status, Date.now() - startedAt);

    const withCors = new Response(response.body, response);
    for (const [k, v] of Object.entries(cors)) withCors.headers.set(k, v);
    return withCors;
  },
};
