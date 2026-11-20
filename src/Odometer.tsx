import { useEffect, useState } from 'react'

const H = 34 // altezza di una cifra in px

// Contachilometri a rulli: a riposo mostra già `value`; al cambio rulla da `from`
export const Odometer = ({ value, from }: { value: number; from?: number }) => {
  const [shown, setShown] = useState(from ?? value)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(id)
  }, [value])
  const digits = String(Math.max(0, Math.round(shown))).padStart(6, '0').slice(-6).split('')
  return (
    <div className="text-center" aria-label={`${value.toLocaleString('it-IT')} km`} role="img">
      <div className="inline-flex gap-[3px] rounded-md bg-well px-2 py-1.5 shadow-well" aria-hidden="true">
        {digits.map((d, i) => (
          <div key={i} className="h-[34px] w-[22px] overflow-hidden rounded-digit bg-gradient-to-b from-[#1a1f27] via-[#0c0f14] to-[#1a1f27]">
            <div
              className="transition-transform duration-[var(--duration-roll)] ease-needle"
              style={{ transform: `translateY(-${Number(d) * H}px)` }}
            >
              {Array.from({ length: 10 }, (_, k) => (
                <div key={k} className="h-[34px] text-center font-gauge text-[26px] leading-[34px] text-amber [text-shadow:0_0_10px_rgb(255_181_71/0.55)]">
                  {k}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 text-xs text-dim">km totali</div>
    </div>
  )
}
