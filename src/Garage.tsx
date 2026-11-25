import { m } from 'motion/react'
import { Check, Pencil, Plus, Trash2, TriangleAlert, Warehouse } from 'lucide-react'
import { useState } from 'react'
import { bikeDeleteSummary, type BikeDeleteSummary } from './db'
import type { Bike, Id } from './domain/types'
import { km as fmtKm } from './format'
import { list, listItem } from './motion'
import { deleteBikeEverywhere } from './sync'
import { toast } from './toast'
import { Empty, ErrorText, PageHead, Screen, Sheet, btn, card, usePhoto } from './ui'

// Targa italiana delle moto: fondo bianco, bordo nero, banda blu a sinistra
export const Plate = ({ plate }: { plate: string }) => (
  <span className="inline-flex h-6 items-stretch overflow-hidden rounded-[5px] bg-white text-[12px] font-bold tracking-[0.06em] text-[#0E1116] ring-1 ring-[#0E1116]/70">
    <span className="grid w-3 place-items-center bg-[#1F4FB4] text-[6px] text-white" aria-hidden="true">I</span>
    <span className="grid place-items-center px-1.5 font-mono">{plate.toUpperCase()}</span>
  </span>
)

const Row = ({ bike, km, active, onPick, onEdit, onAskDelete }: { bike: Bike; km: number; active: boolean; onPick: () => void; onEdit: () => void; onAskDelete: () => void }) => {
  const photo = usePhoto(bike.photoId)
  return (
    <m.li variants={listItem} className={`${card} relative overflow-hidden ${active ? 'ring-2 ring-ink dark:ring-lime' : ''}`}>
      <button type="button" onClick={onPick} aria-current={active} className="grid w-full text-left">
        <span className="relative block aspect-[16/7] overflow-hidden bg-sunken">
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : (
            <span className="grid h-full place-items-center bg-[#0E1116]"><span className="t-display text-[44px] text-[#D4FF3A]/90">{bike.make.slice(0, 2).toUpperCase()}</span></span>
          )}
          {active && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[12px] font-semibold text-black"><Check size={13} strokeWidth={3} />In uso</span>}
        </span>
        <span className="flex items-center justify-between gap-3 p-4 pr-28">
          <span className="grid min-w-0 gap-1">
            <b className="t-title truncate text-[18px]">{bike.make} {bike.model}</b>
            <span className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">{bike.plate && <Plate plate={bike.plate} />}{bike.year} · {fmtKm(km)}</span>
          </span>
        </span>
      </button>
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button type="button" onClick={onEdit} className="grid size-11 place-items-center rounded-full bg-surface text-ink shadow-1 ring-1 ring-line transition-shadow hover:ring-line-strong active:scale-95" aria-label={`Modifica ${bike.make} ${bike.model}`}><Pencil size={17} /></button>
        <button type="button" onClick={onAskDelete} className="grid size-11 place-items-center rounded-full bg-surface text-ink-2 shadow-1 ring-1 ring-line transition-colors hover:bg-red-soft hover:text-red-ink hover:ring-red/30 active:scale-95" aria-label={`Elimina ${bike.make} ${bike.model}`}><Trash2 size={17} /></button>
      </div>
    </m.li>
  )
}

const summaryLines = (s: BikeDeleteSummary) => [
  s.services > 0 && (s.services === 1 ? '1 intervento registrato' : `${s.services} interventi registrati`),
  s.readings > 0 && (s.readings === 1 ? '1 lettura km' : `${s.readings} letture km`),
  s.documents > 0 && (s.documents === 1 ? '1 documento (bollo, revisione o assicurazione)' : `${s.documents} documenti`),
  s.notes > 0 && (s.notes === 1 ? '1 nota salvata' : `${s.notes} note salvate`),
  s.attachments > 0 && (s.attachments === 1 ? '1 foto o allegato' : `${s.attachments} foto o allegati`),
  'tutte le voci di manutenzione e i promemoria della moto',
].filter(Boolean) as string[]

export const Garage = ({ bikes, kms, activeId, onPick, onEdit, onDeleted, onAdd, onClose, onAccount }: {
  bikes: Bike[]
  kms: Record<Id, number>
  activeId?: Id
  onPick: (id: Id) => void
  onEdit: (id: Id) => void
  onDeleted: (id: Id) => Promise<void>
  onAdd: () => void
  onClose: () => void
  onAccount?: () => void
}) => {
  const [target, setTarget] = useState<Bike>()
  const [summary, setSummary] = useState<BikeDeleteSummary>()
  const [step, setStep] = useState<1 | 2>(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const askDelete = (b: Bike) => {
    setTarget(b)
    setSummary(undefined)
    setStep(1)
    setError('')
    void bikeDeleteSummary(b.id).then(setSummary)
  }

  const closeSheet = () => {
    if (busy) return
    setTarget(undefined)
    setTimeout(() => { setSummary(undefined); setStep(1); setError('') }, 250)
  }

  const confirmDelete = async () => {
    if (!target) return
    setBusy(true)
    setError('')
    try {
      const { synced } = await deleteBikeEverywhere(target.id)
      const name = `${target.make} ${target.model}`
      const deletedId = target.id
      setTarget(undefined)
      setSummary(undefined)
      setStep(1)
      toast('Moto eliminata', { kind: 'info', body: synced ? `${name} · dati e allegati rimossi` : name })
      await onDeleted(deletedId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eliminazione non riuscita')
    } finally {
      setBusy(false)
    }
  }

  const nextBike = target ? bikes.find((b) => b.id !== target.id) : undefined

  return (
    <Screen>
      <PageHead
        title="Garage"
        sub={bikes.length === 0 ? 'Nessuna moto' : bikes.length === 1 ? '1 moto' : `${bikes.length} moto`}
        onBack={bikes.length > 0 ? onClose : undefined}
        action={<button type="button" onClick={onAdd} className={`${btn.primary} h-11 px-5`}><Plus size={18} strokeWidth={2.6} />Moto</button>}
      />
      {bikes.length === 0 ? (
        <Empty
          icon={<Warehouse size={28} />}
          title="Nessuna moto nel garage"
          text="Aggiungi una moto per tenere sotto controllo tagliandi, km, documenti e spese."
          action={(
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={onAdd} className={btn.primary}><Plus size={18} strokeWidth={2.6} />Aggiungi moto</button>
              {onAccount && <button type="button" onClick={onAccount} className={btn.secondary}>Account</button>}
            </div>
          )}
        />
      ) : (
        <m.ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2" variants={list} initial="initial" animate="animate">
          {bikes.map((b) => (
            <Row
              key={b.id}
              bike={b}
              km={kms[b.id] ?? b.startKm}
              active={b.id === activeId}
              onPick={() => onPick(b.id)}
              onEdit={() => onEdit(b.id)}
              onAskDelete={() => askDelete(b)}
            />
          ))}
        </m.ul>
      )}

      <Sheet open={Boolean(target)} onClose={closeSheet} title={target ? `Eliminare ${target.make} ${target.model}?` : 'Eliminare moto?'}>
        {target && (
          <div className="grid gap-4 pb-1">
            <div className="flex gap-3 rounded-md bg-red-soft p-4 text-[14px] text-ink">
              <TriangleAlert size={20} className="mt-0.5 shrink-0 text-red-ink" />
              <div className="grid gap-2">
                <b className="font-semibold">Verranno eliminati definitivamente:</b>
                {summary ? (
                  <ul className="m-0 grid list-disc gap-1 pl-4 text-[13px] text-ink-2">
                    {summaryLines(summary).map((line) => <li key={line}>{line}</li>)}
                  </ul>
                ) : (
                  <p className="m-0 text-[13px] text-ink-2">Moto, interventi, letture km, note, documenti, allegati e promemoria.</p>
                )}
                <p className="m-0 text-[13px] text-ink-2">
                  {target.id === activeId
                    ? nextBike
                      ? `La moto attiva passerà a ${nextBike.make} ${nextBike.model}.`
                      : 'È l’unica moto presente: il garage resterà vuoto.'
                    : 'I dati online e gli allegati collegati verranno rimossi.'}
                </p>
              </div>
            </div>

            {step === 2 && (
              <p role="alert" className="m-0 rounded-md bg-sunken px-3.5 py-2.5 text-[13px] font-medium text-red-ink">
                Ultima conferma: non potrai più recuperare {target.make} {target.model} né i suoi dati.
              </p>
            )}
            {error && <ErrorText>{error}</ErrorText>}

            {step === 1 ? (
              <>
                <button type="button" onClick={() => setStep(2)} className={`${btn.danger} w-full`}><Trash2 size={17} />Elimina moto e dati</button>
                <button type="button" onClick={closeSheet} className={`${btn.secondary} w-full`}>Annulla</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => void confirmDelete()} disabled={busy} className={`${btn.danger} w-full`}>
                  <Trash2 size={17} />{busy ? 'Eliminazione in corso…' : 'Elimina definitivamente'}
                </button>
                <button type="button" onClick={() => setStep(1)} disabled={busy} className={`${btn.secondary} w-full`}>Torna indietro</button>
              </>
            )}
          </div>
        )}
      </Sheet>
    </Screen>
  )
}
