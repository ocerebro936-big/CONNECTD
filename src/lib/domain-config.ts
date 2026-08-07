export const DOMAINS = {
  OFFICIAL_URL: 'https://ocerebro936-big.github.io/CONNECTD/',
  CUSTOM_DOMAIN: 'www.connected.org-github.io',
  FIREBASE_AUTH: 'gen-lang-client-0029245143.firebaseapp.com',
  AUTHORIZED_DOMAINS: [
    'ocerebro936-big.github.io',
  ],
} as const;

export const getDomainBranding = () => ({
  mainUrl: DOMAINS.OFFICIAL_URL,
  customDomain: DOMAINS.CUSTOM_DOMAIN,
  shortLabel: 'Connected',
});
