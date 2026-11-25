import { AnimatePresence, motion } from 'motion/react'
import { Check, CircleAlert, CloudOff, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { dur, spring } from './motion'

// Avvisi brevi in alto ("+222 km salvati", "Sincronizzato"). Chiunque può chiamare toast(); il Toaster li mostra.
export type ToastKind = 'success' | 'info' | 'warn' | 'offline'
type Item = { id: number; kind: ToastKind; title: string; body?: string }

let next = 1
export const toast = (title: string, opts: { kind?: ToastKind; body?: string } = {}) =>
  dispatchEvent(new CustomEvent<Item>('revkeeper:toast', { detail: { id: next++, kind: opts.kind ?? 'success', title, body: opts.body } }))

const icon = { success: Check, info: Info, warn: CircleAlert, offline: CloudOff }
const tone = { success: 'bg-lime text-black', info: 'bg-white/12 text-white', warn: 'bg-[#FFB020] text-black', offline: 'bg-white/12 text-white' }

const Toast = ({ t, onClose }: { t: Item; onClose: () => void }) => {
  const Icon = icon[t.kind]
  useEffect(() => {
    const id = setTimeout(onClose, 3800)
    return () => clearTimeout(id)
  }, [t.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: -24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.98, transition: { duration: dur.fast } }}
      transition={spring.sheet}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.8, bottom: 0.1 }}
      onDragEnd={(_, i) => { if (i.offset.y < -30) onClose() }}
      className="pointer-events-auto flex w-full max-w-[380px] touch-none items-center gap-3 rounded-[18px] bg-[#0E1116] py-2.5 pl-2.5 pr-4 text-white shadow-3 ring-1 ring-white/8"
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tone[t.kind]}`}><Icon size={18} strokeWidth={2.4} /></span>
      <span className="grid min-w-0 flex-1 leading-tight">
        <b className="truncate text-[14px] font-semibold">{t.title}</b>
        {t.body && <span className="text-[13px] text-[#AEB6C2]">{t.body}</span>}
      </span>
    </motion.div>
  )
}

export const Toaster = () => {
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => {
    const on = (e: Event) => setItems((xs) => [...xs.slice(-2), (e as CustomEvent<Item>).detail])
    addEventListener('revkeeper:toast', on)
    return () => removeEventListener('revkeeper:toast', on)
  }, [])
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-50 grid justify-items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {items.map((t) => <Toast key={t.id} t={t} onClose={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} />)}
      </AnimatePresence>
    </div>
  )
}
