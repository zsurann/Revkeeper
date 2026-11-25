// Genera il marchio Revkeeper "Hi-Vis": contagiri a segmenti + lancetta.
import { writeFileSync, mkdirSync } from 'node:fs'
const out = new URL('../public/icons/', import.meta.url)
mkdirSync(out, { recursive: true })
const C = { ink: '#0E1116', lime: '#D4FF3A', red: '#FF4D2E', off: '#2A3039' }
const cx = 256, cy = 272, r = 152, sw = 34, N = 11, start = 135, sweep = 270, gap = 6.5 // gradi di vuoto tra segmenti
const pt = (a, rad = r) => [cx + rad * Math.cos((a * Math.PI) / 180), cy + rad * Math.sin((a * Math.PI) / 180)]
const f = (n) => n.toFixed(1)
const seg = (i) => {
  const step = sweep / N
  const a0 = start + i * step + gap / 2, a1 = start + (i + 1) * step - gap / 2
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1)
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 0 1 ${f(x1)} ${f(y1)}`
}
export const segments = (lit = 6, mono = false) =>
  Array.from({ length: N }, (_, i) => {
    const color = mono ? '#fff' : i === N - 1 ? C.red : i < lit ? C.lime : C.off
    const op = mono && i >= lit && i < N - 1 ? ' opacity=".35"' : ''
    return `<path d="${seg(i)}" stroke="${color}" stroke-width="${sw}" stroke-linecap="butt" fill="none"${op}/>`
  }).join('')
const needleAngle = 305 // circa le 2: zona alta del contagiri
const needle = (color, hub = C.ink) => {
  const [tx, ty] = pt(needleAngle, 112)
  const [lx, ly] = pt(needleAngle - 90, 15), [rx, ry] = pt(needleAngle + 90, 15)
  return `<path d="M${f(lx)} ${f(ly)}L${f(tx)} ${f(ty)}L${f(rx)} ${f(ry)}Z" fill="${color}" stroke="${color}" stroke-width="6" stroke-linejoin="round"/>` +
    `<circle cx="${cx}" cy="${cy}" r="26" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="10" fill="${hub}"/>`
}
const mark = (lit, mono) => segments(lit, mono) + needle(mono ? '#fff' : C.lime, mono ? 'transparent' : C.ink)
const svg = (body, bg = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${body}</svg>\n`
// Icona piena (maskable: tutto dentro il cerchio sicuro dell'80%)
writeFileSync(new URL('icon-maskable.svg', out), svg(mark(7), `<rect width="512" height="512" fill="${C.ink}"/>`))
// Icona con angoli arrotondati (favicon, tab del browser)
writeFileSync(new URL('icon.svg', out), svg(mark(7), `<rect width="512" height="512" rx="116" fill="${C.ink}"/>`))
// Badge monocromatico per Android (solo trasparenza)
const badgeNeedle = (() => { const [tx, ty] = pt(needleAngle, 112), [lx, ly] = pt(needleAngle - 90, 18), [rx, ry] = pt(needleAngle + 90, 18); return `<path d="M${f(lx)} ${f(ly)}L${f(tx)} ${f(ty)}L${f(rx)} ${f(ry)}Z" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="30" fill="#fff"/>` })()
writeFileSync(new URL('badge.svg', out), svg(Array.from({ length: N }, (_, i) => `<path d="${seg(i)}" stroke="#fff" stroke-width="44" fill="none"/>`).join('') + badgeNeedle))
// Marchio per sfondi chiari (inchiostro + lime solo sui segmenti accesi)
writeFileSync(new URL('mark-light.svg', out), svg(Array.from({ length: N }, (_, i) => `<path d="${seg(i)}" stroke="${i === N - 1 ? C.red : i < 7 ? C.ink : '#C9CED6'}" stroke-width="${sw}" fill="none"/>`).join('') + needle(C.ink, '#fff')))
console.log('ok')
