import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Cloudflare Pages passa ramo e commit alla build: diventano ambiente e release di Sentry
const sha = process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA
const branch = process.env.CF_PAGES_BRANCH
const sentryEnv = !sha ? 'local' : branch === 'main' ? 'production' : 'preview'
// Le mappe dei sorgenti si generano solo se c'è il token per caricarle su Sentry, poi si cancellano da dist:
// non finiscono mai online
const uploadMaps = !!process.env.SENTRY_AUTH_TOKEN && !!sha

export default defineConfig({
  define: {
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sha ?? 'dev'),
    'import.meta.env.VITE_SENTRY_ENVIRONMENT': JSON.stringify(sentryEnv),
  },
  build: { sourcemap: uploadMaps ? 'hidden' : false },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script', // file esterno: la CSP non ammette script inline
      manifest: {
        name: 'Revkeeper',
        short_name: 'Revkeeper',
        description: 'Il libretto di manutenzione della tua moto, sempre in tasca.',
        lang: 'it',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F5F7', // schermata di avvio del telefono: stesso fondo chiaro dell'app
        theme_color: '#F4F5F7',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['push-sw.js'],
        inlineWorkboxRuntime: true, // il service worker non carica script da storage.googleapis.com
        // I modelli di ogni marca non si scaricano all'installazione: solo quando la marca viene scelta
        globIgnores: ['**/b-*.js', '**/_headers'],
        // Archivo è incluso nell'app: si precarica solo l'alfabeto latino, il resto arriva se serve
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/archivo-latin-wdth-normal-*.woff2', '**/archivo-latin-ext-wdth-normal-*.woff2'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/b-[^/]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'catalogo', expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
    // Ultimo plugin: carica le mappe della build finale e lega la release al commit
    uploadMaps && sentryVitePlugin({
      org: 'grok-bot-w1',
      project: 'revkeeper',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: sha, deploy: { env: sentryEnv } }, // il token dell'organizzazione sa già che Sentry è nella regione UE
      sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
      telemetry: false,
    }),
  ],
})
