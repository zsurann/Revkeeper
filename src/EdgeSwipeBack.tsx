import { animate, m, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { detectPlatform, isInstalled } from './domain/platform'
import { hasOverlayLayer } from './historyLayers'
import { ease, spring } from './motion'

const EDGE_PX = 32
const SLOP = 10

export const supportsEdgeSwipeBack = (ua = navigator.userAgent, installed = isInstalled()) => {
  // In Safari/browser su iOS lo swipe nativo dal bordo è già gestito dal sistema; nella PWA installata no.
  return detectPlatform(ua).os === 'ios' && installed
}

const isBlockedTarget = (target: EventTarget | null): boolean => {
  let el = target as HTMLElement | null
  while (el && el !== document.body) {
    if (el.getAttribute('role') === 'dialog' || el.getAttribute('role') === 'listbox') return true
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
    if (el.scrollWidth > el.clientWidth + 2 && el.scrollLeft > 0) return true
    el = el.parentElement
  }
  return false
}

export const EdgeSwipeBack = ({ enabled, onBack, children }: { enabled: boolean; onBack: () => void; children: ReactNode }) => {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const scrimOpacity = useTransform(x, [0, 360], [0.22, 0])
  const pillOpacity = useTransform(x, [0, 56], [0, 1])
  const pillX = useTransform(x, [0, 120], [-16, 4])
  const [swiping, setSwiping] = useState(false)
  const [ready, setReady] = useState(false)
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack
  const animatingRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      x.set(0)
      setSwiping(false)
      setReady(false)
      return
    }

    let state: {
      pointerId: number
      startX: number
      startY: number
      originX: number
      lastX: number
      lastT: number
      vx: number
      dx: number
      active: boolean
    } | null = null

    const cleanupDrag = () => {
      state = null
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onEnd)
      removeEventListener('pointercancel', onEnd)
      removeEventListener('touchmove', onTouchMove)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (state?.active && e.cancelable) e.preventDefault()
    }

    const commitDist = () => Math.min(120, Math.max(84, window.innerWidth * 0.3))

    const onMove = (e: PointerEvent) => {
      if (!state || e.pointerId !== state.pointerId) return
      const now = performance.now()
      if (!state.active) {
        const dx = e.clientX - state.startX
        const dy = e.clientY - state.startY
        if (Math.hypot(dx, dy) < SLOP) return
        if (dx > 0 && dx > Math.abs(dy) * 1.2 && !hasOverlayLayer()) {
          state.active = true
          state.originX = e.clientX
          state.lastX = e.clientX
          state.lastT = now
          setSwiping(true)
          setReady(false)
        } else {
          cleanupDrag()
          return
        }
      }
      const dx = Math.max(0, e.clientX - state.originX)
      const dt = Math.max(1, now - state.lastT)
      const instantVx = ((e.clientX - state.lastX) / dt) * 1000
      state.vx = state.vx * 0.5 + instantVx * 0.5
      state.dx = dx
      state.lastX = e.clientX
      state.lastT = now
      if (!reduce) x.set(dx)
      setReady(dx >= commitDist() || (state.vx >= 450 && dx >= 36))
    }

    const onEnd = (e: PointerEvent) => {
      if (!state || e.pointerId !== state.pointerId) return
      const s = state
      cleanupDrag()
      if (!s.active) return

      const shouldBack = e.type === 'pointerup' && (s.dx >= commitDist() || (s.vx >= 450 && s.dx >= 36))
      if (shouldBack) {
        if (reduce) {
          x.set(0)
          setSwiping(false)
          setReady(false)
          onBackRef.current()
        } else {
          animatingRef.current = true
          void animate(x, window.innerWidth, { duration: 0.16, ease: ease.out }).then(() => {
            animatingRef.current = false
            x.set(0)
            setSwiping(false)
            setReady(false)
            onBackRef.current()
          })
        }
      } else {
        setReady(false)
        if (reduce) {
          x.set(0)
          setSwiping(false)
        } else {
          animatingRef.current = true
          void animate(x, 0, spring.sheet).then(() => {
            animatingRef.current = false
            setSwiping(false)
          })
        }
      }
    }

    const onDown = (e: PointerEvent) => {
      if (animatingRef.current || !e.isPrimary || e.button !== 0) return
      if (e.clientX > EDGE_PX) return
      if (hasOverlayLayer() || isBlockedTarget(e.target)) return
      state = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: e.clientX,
        lastX: e.clientX,
        lastT: performance.now(),
        vx: 0,
        dx: 0,
        active: false,
      }
      addEventListener('pointermove', onMove)
      addEventListener('pointerup', onEnd)
      addEventListener('pointercancel', onEnd)
      addEventListener('touchmove', onTouchMove, { passive: false })
    }

    addEventListener('pointerdown', onDown)
    return () => {
      removeEventListener('pointerdown', onDown)
      cleanupDrag()
    }
  }, [enabled, reduce, x])

  if (!enabled) return <>{children}</>

  return (
    <>
      {swiping && !reduce && (
        <>
          <m.div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20 bg-[#0E1116]" style={{ opacity: scrimOpacity }} />
          <m.div
            aria-hidden="true"
            style={{ opacity: pillOpacity, x: pillX }}
            className={`pointer-events-none fixed left-3 top-1/2 z-30 grid size-10 -translate-y-1/2 place-items-center rounded-full shadow-2 transition-colors duration-150 ${ready ? 'bg-lime text-black' : 'bg-surface text-ink ring-1 ring-line'}`}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </m.div>
        </>
      )}
      <m.div
        style={{ x: reduce ? 0 : x, touchAction: 'pan-y' }}
        className={swiping && !reduce ? 'relative z-20 min-h-dvh bg-bg shadow-3' : 'min-h-dvh'}
      >
        {children}
      </m.div>
    </>
  )
}
