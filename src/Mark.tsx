import { animate, m, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { ease } from './motion'

// Marchio "contagiri a segmenti": stessa geometria di public/icons/icon.svg (scripts/icons.mjs)
const cx = 256, cy = 272, r = 152, N = 11, start = 135, sweep = 270, gap = 6.5
const pt = (a: number, rad = r) => [cx + rad * Math.cos((a * Math.PI) / 180), cy + rad * Math.sin((a * Math.PI) / 180)] as const
const seg = (i: number) => {
  const step = sweep / N
  const [x0, y0] = pt(start + i * step + gap / 2), [x1, y1] = pt(start + (i + 1) * step - gap / 2)
  return `M${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}`
}
const NEEDLE = 305
const needlePath = () => {
  const [tx, ty] = pt(NEEDLE, 112), [lx, ly] = pt(NEEDLE - 90, 15), [rx, ry] = pt(NEEDLE + 90, 15)
  return `M${lx} ${ly}L${tx} ${ty}L${rx} ${ry}Z`
}

type Tone = 'display' | 'ink' | 'mono'
const colors = (tone: Tone, i: number, lit: number) => {
  if (tone === 'mono') return 'currentColor'
  if (i === N - 1) return '#FF4D2E'
  if (tone === 'ink') return i < lit ? 'var(--rk-ink)' : 'var(--rk-line-strong)'
  return i < lit ? '#D4FF3A' : '#2A3039'
}

export const Mark = ({ size = 40, tone = 'display', tile = tone === 'display', className = '' }: { size?: number; tone?: Tone; tile?: boolean; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true">
    {tile && <rect width="512" height="512" rx="116" fill="#0E1116" />}
    {Array.from({ length: N }, (_, i) => <path key={i} d={seg(i)} stroke={colors(tone, i, 7)} strokeWidth={34} fill="none" />)}
    <path d={needlePath()} fill={tone === 'ink' ? 'var(--rk-ink)' : tone === 'mono' ? 'currentColor' : '#D4FF3A'} stroke={tone === 'ink' ? 'var(--rk-ink)' : tone === 'mono' ? 'currentColor' : '#D4FF3A'} strokeWidth={6} strokeLinejoin="round" />
    <circle cx={cx} cy={cy} r={26} fill={tone === 'ink' ? 'var(--rk-ink)' : tone === 'mono' ? 'currentColor' : '#D4FF3A'} />
    <circle cx={cx} cy={cy} r={10} fill={tone === 'ink' ? 'var(--rk-surface)' : '#0E1116'} />
  </svg>
)

// Logo animato dello splash: accensione del cruscotto. I segmenti si accendono in sequenza fino alla zona rossa,
// la lancetta sale a fondo scala e ricade al minimo, poi si assesta (come il self-test di una TFT all'avvio).
export const IgnitionMark = ({ size = 160, onDone }: { size?: number; onDone?: () => void }) => {
  const reduce = useReducedMotion()
  const step = 0.055
  const rot = useMotionValue(reduce ? 0 : -170)
  const transform = useTransform(rot, (v) => `rotate(${v} ${cx} ${cy})`)
  useEffect(() => {
    if (reduce) { onDone?.(); return }
    const c = animate(rot, [-170, 28, -8, 0], { duration: 1.5, times: [0, 0.45, 0.75, 1], delay: 0.25, ease: ease.inOut, onComplete: onDone })
    return () => c.stop()
  }, [reduce]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Revkeeper">
      <m.rect width="512" height="512" rx="116" fill="#0E1116" initial={reduce ? false : { scale: 0.86, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: ease.out }} style={{ transformOrigin: '256px 256px' }} />
      {Array.from({ length: N }, (_, i) => (
        <m.path
          key={i}
          d={seg(i)}
          strokeWidth={34}
          fill="none"
          initial={reduce ? false : { stroke: '#2A3039' }}
          animate={reduce ? { stroke: colors('display', i, 7) } : { stroke: ['#2A3039', i === N - 1 ? '#FF4D2E' : '#D4FF3A', colors('display', i, 7)] }}
          transition={{ duration: 1.25, times: [0, 0.35, 1], delay: 0.25 + i * step, ease: 'linear' }}
        />
      ))}
      <m.g transform={transform}
      >
        <path d={needlePath()} fill="#D4FF3A" stroke="#D4FF3A" strokeWidth={6} strokeLinejoin="round" />
        <circle cx={cx} cy={cy} r={26} fill="#D4FF3A" />
        <circle cx={cx} cy={cy} r={10} fill="#0E1116" />
      </m.g>
    </svg>
  )
}
