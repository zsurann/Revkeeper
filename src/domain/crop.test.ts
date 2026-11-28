import { expect, it } from 'vitest'
import { clampPose, drawRect, type View } from './crop'

const v: View = { iw: 900, ih: 1200, vw: 320, vh: 180 } // foto verticale in un riquadro largo (la geometria non dipende dal formato)

it('a zoom 1 la foto copre il riquadro e si sposta solo in verticale', () => {
  const p = clampPose(v, { z: 1, tx: 50, ty: -9999 })
  expect(p.tx).toBe(0)
  const r = drawRect(v, p)
  expect(r.w).toBeCloseTo(320)
  expect(r.y + r.h).toBeCloseTo(180) // spinta in alto fino al bordo: nessuna banda vuota sotto
})

it('limita lo zoom e scala la posa uguale per l export a 1600 px', () => {
  expect(clampPose(v, { z: 9, tx: 0, ty: 0 }).z).toBe(4)
  const p = clampPose(v, { z: 2, tx: 100, ty: 20 })
  const a = drawRect(v, p)
  const b = drawRect(v, p, 1600)
  expect(b.x / 5).toBeCloseTo(a.x)
  expect(b.w / 5).toBeCloseTo(a.w)
  expect(b.x).toBeLessThanOrEqual(0)
  expect(b.x + b.w).toBeGreaterThanOrEqual(1600)
})
