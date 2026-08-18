// ============================================================================
// SEO — meta dinâmica + Structured Data (Schema.org) injetado por conteúdo
// ----------------------------------------------------------------------------
// O crawler do Google executa JS, por isso injetar JSON-LD quando o utilizador
// abre um conteúdo público (música, perfil) ajuda a indexação real. Para
// indexação completa de URL por URL seria necessário SSR/prerender (futuro).
// ============================================================================

function setMeta(name: string, content: string) {
  let m = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!m) {
    m = document.createElement('meta');
    m.setAttribute('name', name);
    document.head.appendChild(m);
  }
  m.setAttribute('content', content);
}

function setMetaProperty(prop: string, content: string) {
  let m = document.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`);
  if (!m) {
    m = document.createElement('meta');
    m.setAttribute('property', prop);
    document.head.appendChild(m);
  }
  m.setAttribute('content', content);
}

export function setPageMeta(title: string, description?: string): void {
  document.title = title;
  setMetaProperty('og:title', title);
  setMetaName('twitter:title', title);
  if (description) {
    setMeta('description', description);
    setMetaProperty('og:description', description);
    setMetaName('twitter:description', description);
  }
}

function setMetaName(name: string, content: string) {
  setMeta(name, content);
}

export function injectJsonLd(id: string, schema: Record<string, any>): void {
  let s = document.getElementById(id) as HTMLScriptElement | null;
  if (!s) {
    s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = id;
    document.head.appendChild(s);
  }
  s.textContent = JSON.stringify(schema);
}

export function removeJsonLd(id: string): void {
  const s = document.getElementById(id);
  if (s) s.remove();
}

// Schemas prontos
export function musicRecordingSchema(track: {
  id: string;
  title: string;
  artistName: string;
  audioUrl: string;
  cover?: string;
  duration?: number;
  genre?: string;
  description?: string;
}): Record<string, any> {
  const host = window.location.origin;
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: track.title,
    byArtist: { '@type': 'Person', name: track.artistName },
    url: `${host}/?tab=music`,
    ...(track.cover ? { image: track.cover } : {}),
    ...(track.audioUrl ? { associatedMedia: { '@type': 'MediaObject', contentUrl: track.audioUrl, encodingFormat: 'audio/mpeg' } } : {}),
    ...(track.duration ? { duration: `PT${track.duration}S` } : {}),
    ...(track.genre ? { genre: track.genre } : {}),
    description: track.description || `Ouça ${track.title} de ${track.artistName} na Connected Music.`,
  };
}

export function personSchema(p: {
  name: string;
  avatar?: string;
  bio?: string;
  country?: string;
}): Record<string, any> {
  const host = window.location.origin;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    url: `${host}/?tab=profile`,
    ...(p.avatar ? { image: p.avatar } : {}),
    ...(p.bio ? { description: p.bio } : {}),
    ...(p.country ? { homeLocation: p.country } : {}),
  };
}
