// Token di movimento: gli stessi valori di tokens.css, per Motion
import type { Transition } from 'motion/react'

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  needle: [0.34, 1.56, 0.64, 1] as const,
}
export const dur = { instant: 0.09, fast: 0.16, base: 0.24, slow: 0.42, sweep: 1.1 }

// Molle: "snappy" per pulsanti e interruttori, "sheet" per i fogli, "soft" per gli elementi grandi
export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 32, mass: 0.8 } satisfies Transition,
  sheet: { type: 'spring', stiffness: 420, damping: 40, mass: 1 } satisfies Transition,
  soft: { type: 'spring', stiffness: 220, damping: 28 } satisfies Transition,
}

// Ingresso delle pagine e degli elenchi
export const page = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.out } },
  exit: { opacity: 0, y: -6, transition: { duration: dur.fast, ease: ease.inOut } },
}
export const list = { animate: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } } }
export const listItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.out } },
}
export const press = { whileTap: { scale: 0.97 }, transition: spring.snappy }
