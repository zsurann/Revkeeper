import { expect, it } from 'vitest'
import { createHistoryController, type WindowLike } from './historyLayers'

const makeFakeWindow = () => {
  const entries: unknown[] = [{ initial: true }]
  let idx = 0
  const listeners = new Set<(e: PopStateEvent) => void>()
  const firePop = () => {
    const evt = { state: entries[idx] } as PopStateEvent
    for (const fn of [...listeners]) fn(evt)
  }
  const win: WindowLike = {
    history: {
      get state() { return entries[idx] },
      pushState(data) {
        entries.splice(idx + 1)
        entries.push(data)
        idx = entries.length - 1
      },
      replaceState(data) {
        entries[idx] = data
      },
      back() {
        if (idx > 0) {
          idx -= 1
          queueMicrotask(firePop)
        }
      },
    },
    addEventListener(_t, fn) { listeners.add(fn) },
    removeEventListener(_t, fn) { listeners.delete(fn) },
  }
  return { win, entries, index: () => idx, userBack: () => { if (idx > 0) { idx -= 1; firePop() } } }
}

it('chiude prima gli overlay poi torna tra le schermate con Indietro di sistema', async () => {
  const fake = makeFakeWindow()
  const ctrl = createHistoryController(fake.win)
  const closed: string[] = []

  const s1 = ctrl.pushLayer('screen', () => closed.push('screen1'))
  const s2 = ctrl.pushLayer('screen', () => closed.push('screen2'))
  const o1 = ctrl.pushLayer('overlay', () => closed.push('sheet'))
  await ctrl.flush()

  expect(ctrl.hasOverlay()).toBe(true)
  expect(fake.index()).toBe(3)
  expect((fake.win.history.state as { rkSeq: number }).rkSeq).toBe(3)

  fake.userBack()
  expect(closed).toEqual(['sheet'])
  expect(ctrl.hasOverlay()).toBe(false)
  ctrl.popLayer(o1) // cleanup React dopo popstate: deve essere no-op
  await ctrl.flush()
  expect(fake.index()).toBe(2)

  fake.userBack()
  expect(closed).toEqual(['sheet', 'screen2'])
  ctrl.popLayer(s2)
  await ctrl.flush()
  expect(fake.index()).toBe(1)

  // Chiusura da UI (es. pulsante Indietro)
  ctrl.popLayer(s1)
  await ctrl.flush()
  expect(fake.index()).toBe(0)
  expect(ctrl.depth()).toBe(0)
  ctrl.destroy()
})

it('non perde la sincronia se si chiude un overlay e si riapre subito un altro', async () => {
  const fake = makeFakeWindow()
  const ctrl = createHistoryController(fake.win)
  const closed: string[] = []

  const c1 = ctrl.pushLayer('overlay', () => closed.push('c1'))
  ctrl.popLayer(c1)
  const c2 = ctrl.pushLayer('overlay', () => closed.push('c2'))
  await ctrl.flush()

  expect(ctrl.depth()).toBe(1)
  expect(fake.index()).toBe(1)
  expect((fake.win.history.state as { rkSeq: number }).rkSeq).toBe(1)

  fake.userBack()
  expect(closed).toEqual(['c2'])
  expect(ctrl.depth()).toBe(0)
  expect(fake.index()).toBe(0)
  ctrl.destroy()
})
