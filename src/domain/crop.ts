// Matematica dell'editor foto: la foto copre sempre il riquadro, pan e zoom (1–4×) restano nei limiti
export type View = { iw: number; ih: number; vw: number; vh: number }
export type Pose = { z: number; tx: number; ty: number }

export const MAX_ZOOM = 4
export const cover = ({ iw, ih, vw, vh }: View) => Math.max(vw / iw, vh / ih)

export const clampPose = (v: View, p: Pose): Pose => {
  const z = Math.min(MAX_ZOOM, Math.max(1, p.z))
  const s = cover(v) * z
  const mx = Math.max(0, (v.iw * s - v.vw) / 2)
  const my = Math.max(0, (v.ih * s - v.vh) / 2)
  return { z, tx: Math.min(mx, Math.max(-mx, p.tx)), ty: Math.min(my, Math.max(-my, p.ty)) }
}

// Rettangolo in cui disegnare la foto in un riquadro largo `outW` (anteprima o export), stessa posa
export const drawRect = (v: View, p: Pose, outW = v.vw) => {
  const k = outW / v.vw
  const s = cover(v) * p.z * k
  const w = v.iw * s
  const h = v.ih * s
  return { x: (outW - w) / 2 + p.tx * k, y: ((v.vh * k) - h) / 2 + p.ty * k, w, h }
}
