import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/CONNECTD/',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        scope: '/CONNECTD/',
        includeAssets: ['icons/apple-touch-icon.png', 'icons/maskable-512.png'],
        manifest: {
          id: '/CONNECTD/',
          name: 'Connected — Rede Social & Ecossistema Digital',
          short_name: 'Connected',
          description: 'O teu centro de controlo do mundo digital. Rede social, Connect TV, Games, Marketplace, Faculdade e DIVINO IA.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/CONNECTD/',
          lang: 'pt',
          categories: ['social', 'entertainment', 'education', 'shopping'],
          shortcuts: [
            {
              name: 'Feed Social',
              short_name: 'Feed',
              url: '/CONNECTD/?tab=feed',
              icons: [{ src: '/CONNECTD/icons/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Connect TV',
              short_name: 'TV',
              url: '/CONNECTD/?tab=connect-tv',
              icons: [{ src: '/CONNECTD/icons/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Games Online',
              short_name: 'Games',
              url: '/CONNECTD/?tab=games',
              icons: [{ src: '/CONNECTD/icons/icon-192.png', sizes: '192x192' }],
            },
          ],
          icons: [
            {
              src: '/CONNECTD/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/CONNECTD/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/CONNECTD/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
          navigateFallback: '/CONNECTD/index.html',
          navigateFallbackAllowlist: [/^\/CONNECTD\//],
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
