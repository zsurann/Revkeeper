// Tema dell'app: "Chiaro" è il predefinito, "Notte" e "Sistema" si scelgono da Account → Aspetto.
// La scelta resta sul dispositivo (localStorage). public/theme-init.js la applica prima del primo disegno,
// con la stessa chiave e gli stessi colori: se cambi qui, cambia anche lì.
import { useEffect, useState } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
export const THEME_KEY = 'revkeeper.theme'
export const THEME_COLOR = { light: '#F4F5F7', dark: '#0B0D10' } as const

export const parseTheme = (v: string | null | undefined): ThemePref => (v === 'dark' || v === 'system' ? v : 'light')
export const resolveTheme = (pref: ThemePref, systemDark: boolean): 'light' | 'dark' =>
  pref === 'system' ? (systemDark ? 'dark' : 'light') : pref

const systemDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

export const readTheme = (): ThemePref => {
  try { return parseTheme(localStorage.getItem(THEME_KEY)) } catch { return 'light' }
}

export const applyTheme = (pref: ThemePref) => {
  const mode = resolveTheme(pref, systemDark())
  const root = document.documentElement
  root.classList.toggle('dark', mode === 'dark')
  root.style.colorScheme = mode
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[mode])
  dispatchEvent(new CustomEvent('revkeeper:theme', { detail: mode }))
  return mode
}

export const setTheme = (pref: ThemePref) => {
  try { localStorage.setItem(THEME_KEY, pref) } catch { /* preferenza per dispositivo, non critica */ }
  return applyTheme(pref)
}

// Con "Sistema" segue il telefono anche mentre l'app è aperta
export const watchSystemTheme = () => {
  if (typeof matchMedia !== 'function') return () => {}
  const q = matchMedia('(prefers-color-scheme: dark)')
  const on = () => { if (readTheme() === 'system') applyTheme('system') }
  q.addEventListener('change', on)
  return () => q.removeEventListener('change', on)
}

// Tema effettivo, per i componenti che disegnano fuori dai token (pulsante Google)
export const useResolvedTheme = () => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'))
  useEffect(() => {
    const on = (e: Event) => setMode((e as CustomEvent<'light' | 'dark'>).detail)
    addEventListener('revkeeper:theme', on)
    return () => removeEventListener('revkeeper:theme', on)
  }, [])
  return mode
}
