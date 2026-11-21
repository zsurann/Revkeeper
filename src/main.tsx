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

// Anche sulla pagina di installazione: senza service worker Chrome non offre il popup
registerSW({ immediate: true })
createRoot(document.getElementById('root')!).render(<StrictMode>{gate ? <Install platform={platform} /> : <App />}</StrictMode>)
