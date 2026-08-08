export const RTMP_SERVERS = [
  { id: 'connected-eu', label: 'Connected EU', rtmp: 'rtmp://eu.live.connected.cloud/live' },
  { id: 'connected-us', label: 'Connected US', rtmp: 'rtmp://us.live.connected.cloud/live' },
  { id: 'connected-asia', label: 'Connected Asia', rtmp: 'rtmp://asia.live.connected.cloud/live' },
];

export const generateStreamKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let key = '';
  for (let i = 0; i < bytes.length; i++) key += chars[bytes[i] % chars.length];
  return key;
};

export const getStreamSettings = (): { serverId: string; streamKey: string } => {
  const saved = localStorage.getItem('connected_stream_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.streamKey && parsed.serverId) return parsed;
    } catch {
      /* ignore */
    }
  }
  const settings = { serverId: RTMP_SERVERS[0].id, streamKey: generateStreamKey() };
  localStorage.setItem('connected_stream_settings', JSON.stringify(settings));
  return settings;
};

export const saveStreamSettings = (settings: { serverId: string; streamKey: string }) => {
  localStorage.setItem('connected_stream_settings', JSON.stringify(settings));
};

export const getRtmpServer = (serverId: string) =>
  RTMP_SERVERS.find((s) => s.id === serverId) || RTMP_SERVERS[0];

export const buildRtmpUrl = (serverId: string, streamKey: string) =>
  `${getRtmpServer(serverId).rtmp}/${streamKey}`;

export const parseLiveLink = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('live');
    return id;
  } catch {
    return null;
  }
};
