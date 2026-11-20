import { useEffect, useState, type ReactNode } from 'react'
import { getAttachment } from './db'
import type { Id } from './domain/types'

export const field = 'w-full min-w-0 rounded-lg border border-edge bg-panel px-3 py-2.5 text-ink placeholder:text-dim/70'
export const primary = 'rounded-pill bg-amber px-5 py-3 font-gauge text-amber-ink shadow-fab transition-transform duration-[var(--duration-ui)] active:scale-96'
export const ghost = 'rounded-pill border border-edge px-4 py-2 text-sm text-ink active:scale-96'

export const Screen = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto grid max-w-sm gap-6 px-4 pb-28 pt-[max(24px,env(safe-area-inset-top))]">{children}</main>
)

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="grid gap-1 text-sm text-dim">
    {label}
    {children}
  </label>
)

// Object URL della foto salvata in IndexedDB, revocato quando cambia o si smonta
export const usePhoto = (id?: Id) => {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let u: string | undefined
    let live = true
    if (id) void getAttachment(id).then((a) => a && live && setUrl((u = URL.createObjectURL(a.blob))))
    else setUrl(undefined)
    return () => {
      live = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [id])
  return url
}
