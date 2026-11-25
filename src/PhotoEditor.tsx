import { useEffect, useRef, useState } from 'react'
import { clampPose, drawRect, MAX_ZOOM, type Pose, type View } from './domain/crop'
import { btn } from './ui'

const OUT_W = 1600
const OUT_H = 900

// Editor a schermo intero: trascina, pizzica, rotella o barra per lo zoom; Conferma esporta 1600×900 JPEG
export const PhotoEditor = ({ file, onDone, onCancel }: { file: File; onDone: (b: Blob) => void; onCancel: () => void }) => {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<ImageBitmap>()
  const [pose, setPose] = useState<Pose>({ z: 1, tx: 0, ty: 0 })
  const [error, setError] = useState('')
  const pts = useRef(new Map<number, { x: number; y: number }>())

  useEffect(() => {
    let bmp: ImageBitmap | undefined
    createImageBitmap(file).then((b) => setImg((bmp = b))).catch(() => setError('Non riesco a leggere questa foto'))
    return () => bmp?.close()
  }, [file])

  const view = (): View | undefined => {
    const r = stage.current?.getBoundingClientRect()
    return img && r ? { iw: img.width, ih: img.height, vw: r.width, vh: r.height } : undefined
  }
  const update = (fn: (p: Pose) => Pose) => setPose((p) => {
    const v = view()
    return v ? clampPose(v, fn(p)) : p
  })

  useEffect(() => {
    const v = view()
    const c = canvas.current
    if (!v || !c || !img) return
    const d = devicePixelRatio || 1
    c.width = v.vw * d
    c.height = v.vh * d
    const r = drawRect(v, pose, v.vw * d)
    const g = c.getContext('2d')!
    g.fillStyle = '#000'
    g.fillRect(0, 0, c.width, c.height)
    g.drawImage(img, r.x, r.y, r.w, r.h)
  })

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      update((p) => ({ ...p, z: p.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    const resize = () => update((p) => p)
    addEventListener('resize', resize)
    return () => {
      el.removeEventListener('wheel', wheel)
      removeEventListener('resize', resize)
    }
  })

  const move = (e: React.PointerEvent) => {
    const p = pts.current.get(e.pointerId)
    if (!p) return
    if (pts.current.size === 1) {
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      update((q) => ({ ...q, tx: q.tx + dx, ty: q.ty + dy }))
    } else {
      const [a, b] = [...pts.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      const before = Math.hypot(a.x - b.x, a.y - b.y)
      p.x = e.clientX
      p.y = e.clientY
      const [a2, b2] = [...pts.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      const after = Math.hypot(a2.x - b2.x, a2.y - b2.y)
      if (before > 0) update((q) => ({ ...q, z: q.z * (after / before) }))
    }
    p.x = e.clientX
    p.y = e.clientY
  }

  const confirm = () => {
    const v = view()
    if (!v || !img) return
    const out = document.createElement('canvas')
    out.width = OUT_W
    out.height = OUT_H
    const r = drawRect(v, pose, OUT_W)
    out.getContext('2d')!.drawImage(img, r.x, r.y, r.w, r.h)
    out.toBlob((b) => (b ? onDone(b) : setError('Ritaglio non riuscito')), 'image/jpeg', 0.82)
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ed-title"
      className="dark fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] gap-4 bg-[#05070a] text-ink px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onClick={onCancel} className={btn.ghost}>Annulla</button>
        <h2 id="ed-title" className="t-title m-0 text-[18px]">Sistema la foto</h2>
        <button type="button" onClick={confirm} disabled={!img} className={`${btn.primary} h-11 px-5`}>Conferma</button>
      </header>
      <div
        ref={stage}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        }}
        onPointerMove={move}
        onPointerUp={(e) => pts.current.delete(e.pointerId)}
        onPointerCancel={(e) => pts.current.delete(e.pointerId)}
        onDoubleClick={() => update(() => ({ z: 1, tx: 0, ty: 0 }))}
        className="relative aspect-[16/9] w-full max-w-xl cursor-grab touch-none self-center justify-self-center overflow-hidden rounded-md outline outline-2 outline-[#D4FF3A] active:cursor-grabbing"
      >
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-50 [&>i]:border-white/40 [&>i]:border-[0.5px]">
          {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
        </div>
      </div>
      <footer className="mx-auto grid w-full max-w-xl gap-3">
        <input id="photo-zoom" type="range" min="1" max={MAX_ZOOM} step="0.01" value={pose.z} aria-label="Zoom"
          onChange={(e) => update((p) => ({ ...p, z: Number(e.target.value) }))} className="w-full accent-[#D4FF3A]" />
        <p className="m-0 text-center text-[13px] text-ink-3">Trascina per spostare · pizzica o usa la barra per lo zoom · doppio tocco per ripartire</p>
        {error && <p role="alert" className="m-0 text-center text-[14px] text-red-ink">{error}</p>}
      </footer>
    </div>
  )
}
