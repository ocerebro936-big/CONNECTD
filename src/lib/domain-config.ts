export const DOMAINS = {
  OFFICIAL_URL: 'https://www.connected.org-github.io/',
  CUSTOM_DOMAIN: 'www.connected.org-github.io',
  FIREBASE_AUTH: 'gen-lang-client-0029245143.firebaseapp.com',
  AUTHORIZED_DOMAINS: [
    'connected.org-github.io',
    'www.connected.org-github.io',
    'ocerebro936-big.github.io',
  ],
} as const;

export const getDomainBranding = () => ({
  mainUrl: DOMAINS.OFFICIAL_URL,
  customDomain: DOMAINS.CUSTOM_DOMAIN,
  shortLabel: 'Connected',
});
