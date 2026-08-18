export const DOMAINS = {
  OFFICIAL_URL: 'https://www.connectedking.web.app/',
  CUSTOM_DOMAIN: 'www.connectedking.web.app',
  FIREBASE_AUTH: 'gen-lang-client-0029245143.firebaseapp.com',
  AUTHORIZED_DOMAINS: [
    'connectedking.web.app',
    'www.connectedking.web.app',
    'connected-ecossistema.web.app',
    'ocerebro936-big.github.io',
  ],
} as const;

export const getDomainBranding = () => ({
  mainUrl: DOMAINS.OFFICIAL_URL,
  customDomain: DOMAINS.CUSTOM_DOMAIN,
  shortLabel: 'CK',
});
