import { useEffect, useRef } from 'react'

export type LayerKind = 'screen' | 'overlay'
type Layer = { id: number; kind: LayerKind; onBack: () => void }

type HistoryLike = Pick<History, 'state' | 'pushState' | 'replaceState' | 'back'>
export type WindowLike = {
  history: HistoryLike
  addEventListener: (type: 'popstate', fn: (e: PopStateEvent) => void) => void
  removeEventListener: (type: 'popstate', fn: (e: PopStateEvent) => void) => void
}

const baseState = (h: HistoryLike): Record<string, unknown> =>
  h.state && typeof h.state === 'object' ? { ...(h.state as Record<string, unknown>) } : {}

export const createHistoryController = (win: WindowLike) => {
  const layers: Layer[] = []
  let nextId = 1
  let historySeq = 0
  let ignoringPop = 0
  let pendingResolve: (() => void) | null = null
  let opChain: Promise<void> = Promise.resolve()
  let inited = false

  const onPopState = (e: PopStateEvent) => {
    if (ignoringPop > 0) {
      ignoringPop -= 1
      const cb = pendingResolve
      pendingResolve = null
      cb?.()
      return
    }
    const raw = (e.state as { rkSeq?: unknown } | null)?.rkSeq
    const rawTarget = typeof raw === 'number' ? raw : -1
    const target = Math.max(0, rawTarget)
    historySeq = target
    let closed = false
    while (layers.length > target) {
      const top = layers.pop()!
      closed = true
      top.onBack()
    }
    if (rawTarget < 0 && closed) {
      win.history.replaceState({ ...baseState(win.history), rkSeq: 0 }, '')
    }
  }

  const init = () => {
    if (inited) return
    inited = true
    win.history.replaceState({ ...baseState(win.history), rkSeq: 0 }, '')
    win.addEventListener('popstate', onPopState)
  }

  const enqueue = (fn: () => Promise<void> | void) => {
    opChain = opChain.then(fn, fn)
    return opChain
  }

  const pushLayer = (kind: LayerKind, onBack: () => void): number => {
    init()
    const id = nextId++
    layers.push({ id, kind, onBack })
    void enqueue(() => {
      historySeq += 1
      win.history.pushState({ ...baseState(win.history), rkSeq: historySeq }, '')
    })
    return id
  }

  const popLayer = (id: number) => {
    const idx = layers.findIndex((l) => l.id === id)
    if (idx === -1) return // già chiuso da popstate
    layers.splice(idx, 1)
    void enqueue(
      () =>
        new Promise<void>((resolve) => {
          if (historySeq <= 0) return resolve()
          historySeq -= 1
          ignoringPop += 1
          let done = false
          const finish = () => {
            if (done) return
            done = true
            clearTimeout(timer)
            if (pendingResolve === finish) pendingResolve = null
            resolve()
          }
          const timer = setTimeout(() => {
            if (ignoringPop > 0) ignoringPop -= 1
            finish()
          }, 150)
          pendingResolve = finish
          win.history.back()
        }),
    )
  }

  const hasOverlay = () => layers.some((l) => l.kind === 'overlay')
  const depth = () => layers.length
  const flush = () => opChain
  const destroy = () => {
    if (!inited) return
    win.removeEventListener('popstate', onPopState)
    inited = false
  }

  return { init, pushLayer, popLayer, hasOverlay, depth, flush, destroy }
}

const singleton = typeof window !== 'undefined' ? createHistoryController(window) : null

export const hasOverlayLayer = () => singleton?.hasOverlay() ?? false
export const pushBackLayer = (kind: LayerKind, onBack: () => void) => singleton?.pushLayer(kind, onBack) ?? 0
export const popBackLayer = (id: number) => singleton?.popLayer(id)

// Collega un overlay (Sheet, Combobox, PhotoEditor) al tasto Indietro di sistema
export const useBackLayer = (active: boolean, onBack: () => void, kind: LayerKind = 'overlay') => {
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack
  useEffect(() => {
    if (!active) return
    const id = pushBackLayer(kind, () => onBackRef.current())
    return () => popBackLayer(id)
  }, [active, kind])
}

// Sincronizza una pila di schermate (es. App stack o passi di Welcome) con la history del browser
export const useBackDepth = (depth: number, onBack: () => void) => {
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack
  const idsRef = useRef<number[]>([])

  useEffect(() => {
    while (idsRef.current.length < depth) {
      idsRef.current.push(pushBackLayer('screen', () => onBackRef.current()))
    }
    while (idsRef.current.length > depth) {
      popBackLayer(idsRef.current.pop()!)
    }
  }, [depth])

  useEffect(
    () => () => {
      while (idsRef.current.length) popBackLayer(idsRef.current.pop()!)
    },
    [],
  )
}
