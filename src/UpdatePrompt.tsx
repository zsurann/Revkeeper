import { AnimatePresence, m } from 'motion/react'
import { RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { spring } from './motion'

// Nuova versione pronta: il service worker aspetta finché l'utente non tocca "Aggiorna",
// così un form a metà non sparisce per un ricaricamento improvviso.
let apply: (() => Promise<void>) | undefined
export const offerUpdate = (update: () => Promise<void>) => {
  apply = update
  dispatchEvent(new Event('revkeeper:update'))
}

export const UpdatePrompt = () => {
  const [show, setShow] = useState(Boolean(apply))
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const on = () => setShow(true)
    addEventListener('revkeeper:update', on)
    return () => removeEventListener('revkeeper:update', on)
  }, [])
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 grid justify-items-center px-4 lg:bottom-6">
      <AnimatePresence>
        {show && (
          <m.div
            role="alert"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={spring.sheet}
            className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-[18px] bg-[#0E1116] py-2.5 pl-4 pr-2 text-white shadow-3 ring-1 ring-white/8"
          >
            <span className="grid min-w-0 flex-1 leading-tight">
              <b className="text-[14px] font-semibold">Aggiornamento disponibile</b>
              <span className="text-[13px] text-[#AEB6C2]">Una nuova versione di Revkeeper è pronta.</span>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setBusy(true); void apply?.() }}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-lime px-4 text-[14px] font-semibold text-black disabled:opacity-60"
            >
              <RefreshCw size={15} strokeWidth={2.6} className={busy ? 'motion-safe:animate-spin' : ''} />Aggiorna
            </button>
            <button type="button" onClick={() => setShow(false)} className="grid size-9 shrink-0 place-items-center rounded-full text-[#AEB6C2] hover:bg-white/10" aria-label="Più tardi"><X size={16} /></button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
