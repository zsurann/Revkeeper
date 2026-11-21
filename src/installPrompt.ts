import { useSyncExternalStore } from 'react'

// Popup di installazione di Chrome/Samsung/Opera su Android: catturato prima di React e usato dal pulsante "Scarica app"
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: InstallEvent | undefined
let installed = false
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export const captureInstallPrompt = () => {
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // niente mini-barra di Chrome: c'è il nostro pulsante
    deferred = e as InstallEvent
    emit()
  })
  addEventListener('appinstalled', () => {
    deferred = undefined
    installed = true
    emit()
  })
}

export type InstallState = 'waiting' | 'ready' | 'installed'
export const useInstallState = () =>
  useSyncExternalStore<InstallState>(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => (installed ? 'installed' : deferred ? 'ready' : 'waiting'),
  )

// Ogni evento vale una volta sola. false = popup non disponibile: servono i passi manuali
export const promptInstall = async () => {
  const d = deferred
  if (!d) return false
  deferred = undefined
  emit()
  await d.prompt()
  if ((await d.userChoice).outcome === 'accepted') {
    installed = true
    emit()
  }
  return true
}
