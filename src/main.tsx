import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { initSentry, reactErrorHandlers } from './sentry'
import { App } from './App'
import { browserAllowed, detectPlatform, isInstalled } from './domain/platform'
import { captureInstallPrompt } from './installPrompt'
import { THEME_KEY } from './theme'

// La pagina di installazione si vede solo nel browser del telefono: non pesa sull'app installata
const Install = lazy(() => import('./Install').then((m) => ({ default: m.Install })))

initSentry()

// Sui telefoni Revkeeper si usa solo installata: nel browser c'è la pagina di installazione. Computer e tablet: sito normale
const platform = detectPlatform(navigator.userAgent)
const gate = platform.os !== 'desktop' && !isInstalled() && !browserAllowed()
if (gate) captureInstallPrompt()

// Azzeramento di tutti i dati del 25/11/2026 (anche sul server): ogni dispositivo cancella una volta i suoi dati locali.
// Per un nuovo azzeramento basta cambiare la data.
const EPOCH = '2026-11-25'
const resetLocalData = () =>
  new Promise<void>((done) => {
    try {
      if (localStorage.getItem('revkeeper.epoch') === EPOCH) return done()
      const dropPush = ('serviceWorker' in navigator
        ? navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => s?.unsubscribe())
        : Promise.resolve()
      ).catch(() => undefined)
      const req = indexedDB.deleteDatabase('revkeeper')
      req.onsuccess = req.onerror = req.onblocked = () => {
        const theme = localStorage.getItem(THEME_KEY) // il tema è una preferenza del dispositivo, non un dato: resta
        localStorage.clear()
        localStorage.setItem('revkeeper.epoch', EPOCH)
        if (theme) localStorage.setItem(THEME_KEY, theme)
        void Promise.race([dropPush, new Promise((r) => setTimeout(r, 300))]).then(() => done())
      }
    } catch {
      done()
    }
  })

// Anche sulla pagina di installazione: senza service worker Chrome non offre il popup
registerSW({ immediate: true })
void resetLocalData().then(() =>
  createRoot(document.getElementById('root')!, reactErrorHandlers).render(<StrictMode>{gate ? <Suspense><Install platform={platform} /></Suspense> : <App />}</StrictMode>),
)
