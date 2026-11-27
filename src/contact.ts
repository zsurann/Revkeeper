// Titolare e contatto pubblici (informativa, termini, "Scrivici"). Valori in .env.production, non nel codice.
export const OWNER = import.meta.env.VITE_OWNER_NAME || 'il titolare (nome da completare)'
export const EMAIL = import.meta.env.VITE_CONTACT_EMAIL || ''

const device = () => `${navigator.userAgent.match(/\(([^)]+)\)/)?.[1] ?? 'sconosciuto'}`

// Email già compilata con versione e sistema: niente dati del garage
export const mailto = (subject: string, extra = '') =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    `\n\n\n---\nVersione: ${import.meta.env.VITE_SENTRY_RELEASE?.slice(0, 7) ?? 'locale'}\nDispositivo: ${device()}${extra}`,
  )}`
