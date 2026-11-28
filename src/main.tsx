import { lazy, StrictMode, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { Guard, initSentry, reactErrorHandlers } from './sentry'
import { Legal, LEGAL_PATHS } from './Legal'
import { browserAllowed, detectPlatform, isInstalled } from './domain/platform'
import { captureInstallPrompt } from './installPrompt'
import { offerUpdate } from './UpdatePrompt'

// La pagina di installazione si vede solo nel browser del telefono: non pesa sull'app installata
const Install = lazy(() => import('./Install').then((m) => ({ default: m.Install })))
const Landing = lazy(() => import('./Install').then((m) => ({ default: m.Landing })))
// L'app vera arriva solo a chi la usa: la pagina di installazione non la scarica
const App = lazy(() => import('./App').then((m) => ({ default: m.App })))

initSentry()

// Sui telefoni Revkeeper si usa solo installata: nel browser c'è la pagina di installazione. Computer e tablet: sito normale
const platform = detectPlatform(navigator.userAgent)
const legal = LEGAL_PATHS.includes(location.pathname)
const gate = !legal && platform.os !== 'desktop' && !isInstalled() && !browserAllowed()
// Computer, prima volta: presentazione con QR. Chi ha già usato l'app (benvenuto fatto) o ha scelto il computer entra diretto
const WEB = 'revkeeper.web'
const seen = () => { try { return localStorage.getItem(WEB) === '1' || localStorage.getItem('revkeeper.welcomed') === '1' } catch { return true } }
const landing = !legal && platform.os === 'desktop' && !isInstalled() && !browserAllowed() && !seen()
const Desktop = () => {
  const [enter, setEnter] = useState(!landing)
  if (enter) return <Suspense><App /></Suspense>
  return <Suspense><Landing onEnter={() => { try { localStorage.setItem(WEB, '1') } catch { /* resta per questa visita */ } setEnter(true) }} /></Suspense>
}
if (gate) captureInstallPrompt()

// Anche sulla pagina di installazione: senza service worker Chrome non offre il popup
// Una nuova versione non si attiva da sola: App mostra "Aggiornamento disponibile". Controllo ogni ora per chi tiene l'app aperta.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => offerUpdate(() => updateSW(true)),
  onRegisteredSW: (_url, reg) => { if (reg) setInterval(() => void reg.update().catch(() => undefined), 3_600_000) },
})
createRoot(document.getElementById('root')!, reactErrorHandlers).render(<StrictMode><Guard>{legal ? <Legal path={location.pathname} /> : gate ? <Suspense><Install platform={platform} /></Suspense> : <Desktop />}</Guard></StrictMode>)
