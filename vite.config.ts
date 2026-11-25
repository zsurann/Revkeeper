import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
  ],
})
