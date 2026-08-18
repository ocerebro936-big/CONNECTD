import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  const base = process.env.VITE_BASE || '/';
  return {
    base,
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        scope: base,
        includeAssets: ['icons/apple-touch-icon.png', 'icons/maskable-512.png', 'logo.svg'],
        manifest: {
          id: base,
          name: 'Connected — Rede Social & Ecossistema Digital',
          short_name: 'Connected',
          description: 'O teu centro de controlo do mundo digital. Rede social, Connect TV, Games, Marketplace, Faculdade e DIVINO IA.',
          theme_color: '#12100c',
          background_color: '#12100c',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          lang: 'pt',
          categories: ['social', 'entertainment', 'education', 'shopping'],
          shortcuts: [
            {
              name: 'Feed Social',
              short_name: 'Feed',
              url: `${base}?tab=feed`,
              icons: [{ src: `${base}icons/icon-192.png`, sizes: '192x192' }],
            },
            {
              name: 'Connect TV',
              short_name: 'TV',
              url: `${base}?tab=connect-tv`,
              icons: [{ src: `${base}icons/icon-192.png`, sizes: '192x192' }],
            },
            {
              name: 'Games Online',
              short_name: 'Games',
              url: `${base}?tab=games`,
              icons: [{ src: `${base}icons/icon-192.png`, sizes: '192x192' }],
            },
          ],
          icons: [
            {
              src: `${base}icons/icon-192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}icons/icon-512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}icons/maskable-512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
          navigateFallback: `${base}index.html`,
          navigateFallbackAllowlist: base === '/' ? [/.*/] : [new RegExp(`^${base}`)],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://images.unsplash.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'connected-backgrounds',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://picsum.photos',
              handler: 'CacheFirst',
              options: {
                cacheName: 'connected-covers',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://img.youtube.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'connected-thumbnails',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'connected-images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://generativelanguage.googleapis.com',
              handler: 'NetworkOnly',
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://firestore.googleapis.com' || url.origin === 'https://identitytoolkit.googleapis.com',
              handler: 'NetworkOnly',
            },
          ],
        },
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
