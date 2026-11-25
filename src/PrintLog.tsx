import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Spending } from './domain/spending'
import type { Bike, Service } from './domain/types'
import { eur, fullDate, km as fmtKm } from './format'

// Libretto stampabile: si monta solo per la stampa ("Salva come PDF" dal dialogo del browser), poi sparisce
export const PrintLog = ({ bike, services, label, stats, onDone }: { bike: Bike; services: Service[]; label: (id: string) => string; stats: Spending; onDone: () => void }) => {
  useEffect(() => {
    const done = () => onDone()
    addEventListener('afterprint', done)
    const t = setTimeout(() => print(), 50)
    return () => { clearTimeout(t); removeEventListener('afterprint', done) }
  }, [onDone])
  return createPortal(
    <article className="rk-print">
      <header>
        <h1>Libretto interventi · {bike.make} {bike.model}</h1>
        <p>{[bike.plate, bike.year && `anno ${bike.year}`, `${services.length} interventi`, `stampato il ${fullDate(new Date().toISOString().slice(0, 10))}`].filter(Boolean).join(' · ')}</p>
      </header>
      <table>
        <thead><tr><th>Data</th><th>Km</th><th>Cosa</th><th>Note</th><th className="num">Costo</th></tr></thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id}>
              <td>{fullDate(s.date)}</td>
              <td>{fmtKm(s.km)}</td>
              <td>{s.itemIds.map(label).join(', ')}</td>
              <td>{s.notes}</td>
              <td className="num">{s.costTotal !== undefined ? eur(s.costTotal) : ''}</td>
            </tr>
          ))}
        </tbody>
        {stats.total > 0 && <tfoot><tr><td colSpan={4}>Totale{stats.perKm !== undefined ? ` · ${eur(stats.perKm)} al km` : ''}</td><td className="num">{eur(stats.total)}</td></tr></tfoot>}
      </table>
      <footer>Revkeeper · revkeeper.pages.dev</footer>
    </article>,
    document.body,
  )
}
