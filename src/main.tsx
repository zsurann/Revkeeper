import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { App } from './App'
import { browserAllowed, detectPlatform, isInstalled } from './domain/platform'
import { Install } from './Install'
import { captureInstallPrompt } from './installPrompt'

// Sui telefoni Revkeeper si usa solo installata: nel browser c'è la pagina di installazione. Computer e tablet: sito normale
const platform = detectPlatform(navigator.userAgent)
const gate = platform.os !== 'desktop' && !isInstalled() && !browserAllowed()
if (gate) captureInstallPrompt()

// Azzeramento di tutti i dati del 21/11/2026 (anche sul server): ogni dispositivo cancella una volta i suoi dati locali.
// Per un nuovo azzeramento basta cambiare la data.
const EPOCH = '2026-11-21'
const resetLocalData = () =>
  new Promise<void>((done) => {
    try {
      if (localStorage.getItem('revkeeper.epoch') === EPOCH) return done()
      const req = indexedDB.deleteDatabase('revkeeper')
      req.onsuccess = req.onerror = req.onblocked = () => {
        localStorage.clear()
        localStorage.setItem('revkeeper.epoch', EPOCH)
        done()
      }
    } catch {
      done()
    }
  })

// Anche sulla pagina di installazione: senza service worker Chrome non offre il popup
registerSW({ immediate: true })
void resetLocalData().then(() =>
  createRoot(document.getElementById('root')!).render(<StrictMode>{gate ? <Install platform={platform} /> : <App />}</StrictMode>),
)
