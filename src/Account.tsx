import { BarChart3, Cloud, Download, LogOut, Monitor, Moon, RefreshCw, Sun, Trash2, TriangleAlert } from 'lucide-react'
import { AdminStats } from './AdminStats'
import { useEffect, useState, type ReactNode } from 'react'
import { getMeta } from './db'
import { GoogleButton } from './GoogleButton'
import { downloadBlob, localBackup } from './localExport'
import { Notifications } from './Notifications'
import { deleteAccount, downloadAccountExport, logout, logoutAll, syncNow, unsynced } from './sync'
import { readTheme, setTheme, type ThemePref } from './theme'
import { toast } from './toast'
import { PageHead, Screen, Segmented, Sheet, btn, card } from './ui'

const ago = (ms?: number) => (ms ? new Date(ms).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : 'mai')

const Section = ({ title, children, id }: { title: string; children: ReactNode; id: string }) => (
  <section aria-labelledby={id} className="grid gap-3">
    <h2 id={id} className="t-label m-0 px-1 text-ink-3">{title}</h2>
    <div className={`${card} grid gap-4 p-4`}>{children}</div>
  </section>
)

export const Account = ({ onClose, onAccount }: { onClose: () => void; onAccount?: (email?: string) => void }) => {
  const [email, setEmail] = useState<string>()
  const [lastSync, setLastSync] = useState<number>()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [ask, setAsk] = useState<'out' | 'del' | 'stats'>()
  const [admin, setAdmin] = useState(false)
  const [theme, pickTheme] = useState<ThemePref>(readTheme)

  const refresh = async () => {
    const e = await getMeta<string>('account')
    setEmail(e)
    onAccount?.(e)
    setLastSync(await getMeta<number>('lastSync'))
  }
  useEffect(() => void refresh(), []) // eslint-disable-line react-hooks/exhaustive-deps
  // Il server decide chi è admin (ADMIN_EMAILS su Cloudflare): qui serve solo a mostrare il pulsante
  useEffect(() => {
    if (!email) return setAdmin(false)
    fetch('/api/me')
      .then((r) => (r.ok ? (r.json() as Promise<{ admin?: boolean } | null>) : null))
      .then((me) => setAdmin(me?.admin === true), () => undefined)
  }, [email])

  const changeTheme = (t: ThemePref) => {
    pickTheme(t)
    setTheme(t)
  }

  const sync = async () => {
    setBusy(true)
    try {
      await syncNow()
      setMsg('')
      toast('Sincronizzato', { kind: 'success', body: 'Garage aggiornato su tutti i dispositivi' })
    } catch (e) {
      setMsg(e instanceof Error ? `Sync non riuscito: ${e.message}` : 'Sync non riuscito')
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  const exit = async () => {
    setBusy(true)
    try {
      await syncNow().catch(() => undefined) // prima prova a salvare online le ultime modifiche
      const n = await unsynced()
      if (n && !confirm(`${n} modifiche non sono ancora online e andranno perse. Esci lo stesso?`)) return
      await logout()
      location.reload() // l'app riparte vuota
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Uscita non riuscita')
    } finally {
      setBusy(false)
    }
  }

  const exitAll = async () => {
    setBusy(true)
    try {
      await syncNow().catch(() => undefined)
      const n = await unsynced()
      if (n && !confirm(`${n} modifiche non sono ancora online e andranno perse. Esci lo stesso?`)) return
      await logoutAll()
      location.reload()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Uscita non riuscita')
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    setBusy(true)
    try {
      await syncNow()
      await downloadAccountExport()
      toast('Copia scaricata', { body: 'Moto, interventi, documenti e file' })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Download non riuscito')
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  const copyLocal = async () => {
    setBusy(true)
    try {
      const data = await localBackup()
      downloadBlob('revkeeper-copia.json', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      toast('Copia scaricata', { body: 'Il file resta su questo dispositivo' })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Download non riuscito')
    } finally {
      setBusy(false)
    }
  }

  const wipe = async () => {
    setBusy(true)
    try {
      await syncNow().catch(() => undefined)
      const n = await unsynced()
      if (n && !confirm(`${n} modifiche non sono ancora online e verranno perse. Eliminare lo stesso?`)) return
      await deleteAccount()
      location.reload()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Eliminazione non riuscita')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <PageHead title="Account" sub="Accesso, promemoria, aspetto e dati." onBack={onClose} />

      <Section title="Aspetto" id="h-look">
        <Segmented
          id="theme"
          label="Tema"
          value={theme}
          onChange={changeTheme}
          options={[
            { value: 'light', label: 'Chiaro', icon: <Sun size={16} /> },
            { value: 'dark', label: 'Notte', icon: <Moon size={16} /> },
            { value: 'system', label: 'Sistema', icon: <Monitor size={16} /> },
          ]}
        />
        <p className="m-0 text-[13px] text-ink-3">Notte scurisce tutta l'app per guidare di sera; Sistema segue il telefono.</p>
      </Section>

      {email ? (
        <Section title="Sincronizzazione" id="h-sync">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lime-soft text-lime-ink"><Cloud size={20} /></span>
            <span className="grid min-w-0"><b className="truncate text-[15px] font-semibold">{email}</b><span className="text-[13px] text-ink-3">Ultima sincronizzazione: {ago(lastSync)}</span></span>
          </div>
          <button type="button" onClick={() => void sync()} disabled={busy} className={`${btn.primary} w-full`}><RefreshCw size={17} className={busy ? 'animate-spin' : ''} />Sincronizza ora</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void exit()} disabled={busy} className={btn.secondary}><LogOut size={16} />Esci</button>
            <button type="button" onClick={() => setAsk('out')} disabled={busy} className={btn.secondary}>Esci ovunque</button>
          </div>
          <p className="m-0 text-[12px] text-ink-3">Uscendo, i dati restano online ma vengono tolti da questo telefono e le notifiche si spengono.</p>
        </Section>
      ) : (
        <Section title="Accesso" id="h-login">
          <p className="m-0 text-[15px]">Accedi per salvare il garage online e usarlo su più telefoni. Senza accesso l'app funziona lo stesso, solo su questo dispositivo.</p>
          <GoogleButton
            onBusy={setBusy}
            onDone={(err) => {
              if (err) setMsg(err)
              else toast('Dati sincronizzati', { body: 'Accesso eseguito' })
              void refresh()
            }}
          />
          <button type="button" onClick={() => void copyLocal()} disabled={busy} className={`${btn.secondary} justify-self-start`}><Download size={16} />Scarica una copia</button>
          <p className="m-0 text-[12px] text-ink-3">Senza account i dati stanno su questo telefono (con le notifiche attive, una copia anonima serve al server per i promemoria). La copia è un file che resta qui.</p>
        </Section>
      )}

      <section aria-labelledby="h-push" className="grid gap-3">
        <h2 id="h-push" className="t-label m-0 px-1 text-ink-3">Promemoria</h2>
        <Notifications />
      </section>

      {admin && (
        <Section title="Statistiche · solo per te" id="h-stats">
          <p className="m-0 text-[14px] text-ink-2">Utenti, moto e interventi registrati, in numeri aggregati.</p>
          <button type="button" onClick={() => setAsk('stats')} className={`${btn.secondary} w-full`}><BarChart3 size={16} />Apri statistiche</button>
        </Section>
      )}

      {email && (
        <Section title="I tuoi dati" id="h-data">
          <p className="m-0 text-[14px] text-ink-2">Scarica una copia di moto, interventi, documenti e file salvati online, oppure elimina l'account.</p>
          <button type="button" onClick={() => void download()} disabled={busy} className={`${btn.secondary} w-full`}><Download size={16} />Scarica i miei dati</button>
          <button type="button" onClick={() => setAsk('del')} disabled={busy} className={`${btn.ghost} justify-self-start text-red-ink hover:bg-red-soft`}><Trash2 size={16} />Elimina account</button>
        </Section>
      )}

      {msg && !busy && <p role="alert" className="m-0 rounded-md bg-red-soft px-4 py-3 text-[14px] font-medium text-red-ink">{msg}</p>}
      <p className="m-0 px-1 text-[12px] leading-relaxed text-ink-3">
        Elenco dei modelli e dati tecnici elaborati da{' '}
        <a href="https://vpic.nhtsa.dot.gov/" target="_blank" rel="noopener noreferrer" className="underline decoration-ink-3 underline-offset-2 hover:text-ink">NHTSA vPIC</a>,{' '}
        <a href="https://avoindata.suomi.fi/data/en/dataset/ajoneuvojen-avoin-data" target="_blank" rel="noopener noreferrer" className="underline decoration-ink-3 underline-offset-2 hover:text-ink">Traficom</a>{' '}
        (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline decoration-ink-3 underline-offset-2 hover:text-ink">CC BY 4.0</a>),{' '}
        <a href="https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/dgt-en-cifras-detalle/Microdatos-de-Matriculaciones-de-Vehiculos-mensual/" target="_blank" rel="noopener noreferrer" className="underline decoration-ink-3 underline-offset-2 hover:text-ink">DGT</a>,{' '}
        <a href="https://opendata.astra.admin.ch/ivzod/4000-Typengenehmigungen_TAS/4300-Datensaetze/TAS_Motorrad.csv" target="_blank" rel="noopener noreferrer" className="underline decoration-ink-3 underline-offset-2 hover:text-ink">Ufficio federale delle strade (USTRA/ASTRA)</a>,{' '}
        schede tecniche e libretti ufficiali dei costruttori.
      </p>

      <Sheet open={ask === 'stats'} onClose={() => setAsk(undefined)} title="Statistiche">
        {ask === 'stats' && <AdminStats />}
      </Sheet>
      <Sheet open={ask === 'del'} onClose={() => setAsk(undefined)} title="Eliminare l'account?">
        <div className="grid gap-4 pb-1">
          <div className="flex gap-3 rounded-md bg-red-soft p-4 text-[14px] text-ink">
            <TriangleAlert size={20} className="mt-0.5 shrink-0 text-red-ink" />
            <span>Verranno cancellati l'account, i dati online e i file. Su questo telefono sparisce tutto. Non si può annullare.</span>
          </div>
          <button type="button" onClick={() => void wipe()} disabled={busy} className={`${btn.danger} w-full`}><Trash2 size={17} />Elimina definitivamente</button>
          <button type="button" onClick={() => setAsk(undefined)} disabled={busy} className={`${btn.secondary} w-full`}>Annulla</button>
        </div>
      </Sheet>
      <Sheet open={ask === 'out'} onClose={() => setAsk(undefined)} title="Uscire da tutti i dispositivi?">
        <div className="grid gap-4 pb-1">
          <p className="m-0 text-[14px] text-ink-2">Chiude l'accesso su tutti i telefoni. I dati online restano; su questo vengono tolti. Si spengono anche le notifiche su tutti i dispositivi.</p>
          <button type="button" onClick={() => void exitAll()} disabled={busy} className={`${btn.danger} w-full`}><LogOut size={17} />Esci ovunque</button>
          <button type="button" onClick={() => setAsk(undefined)} disabled={busy} className={`${btn.secondary} w-full`}>Annulla</button>
        </div>
      </Sheet>
    </Screen>
  )
}
