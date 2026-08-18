export const DOMAINS = {
  OFFICIAL_URL: 'https://connected-ecossistema.web.app/',
  CUSTOM_DOMAIN: 'www.connected.org-github.io',
  FIREBASE_AUTH: 'gen-lang-client-0029245143.firebaseapp.com',
  AUTHORIZED_DOMAINS: [
    'connected-ecossistema.web.app',
    'ocerebro936-big.github.io',
  ],
} as const;

export const getDomainBranding = () => ({
  mainUrl: DOMAINS.OFFICIAL_URL,
  customDomain: DOMAINS.CUSTOM_DOMAIN,
  shortLabel: 'Connected',
});
