import { useEffect, useState } from 'react'
import { getMeta } from './db'
import { GoogleButton } from './GoogleButton'
import { downloadBlob, localBackup } from './localExport'
import { Notifications } from './Notifications'
import { deleteAccount, downloadAccountExport, logout, logoutAll, syncNow, unsynced } from './sync'
import { Screen, ghost, primary } from './ui'

const ago = (ms?: number) => (ms ? new Date(ms).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : 'mai')
const danger = 'rounded-pill bg-red px-5 py-3 font-gauge text-dash'

export const Account = ({ onClose }: { onClose: () => void }) => {
  const [email, setEmail] = useState<string>()
  const [lastSync, setLastSync] = useState<number>()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [ask, setAsk] = useState<'out' | 'del'>()

  const refresh = async () => {
    setEmail(await getMeta<string>('account'))
    setLastSync(await getMeta<number>('lastSync'))
  }
  useEffect(() => void refresh(), [])

  const sync = async () => {
    setBusy(true)
    try {
      await syncNow()
      setMsg('Sincronizzato')
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
      setMsg('Copia scaricata')
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
      setMsg('Copia scaricata')
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
      <header className="flex items-center justify-between">
        <h1 className="font-gauge text-2xl">Account</h1>
        <button onClick={onClose} className={ghost}>Chiudi</button>
      </header>
      {email ? (
        <section className="grid gap-3 rounded-panel bg-panel p-4">
          <p className="m-0">Accesso con <b>{email}</b></p>
          <p className="m-0 text-sm text-dim">Ultima sincronizzazione: {ago(lastSync)}</p>
          <button onClick={() => void sync()} disabled={busy} className={primary}>Sincronizza ora</button>
          <button onClick={() => void exit()} disabled={busy} className={`justify-self-start ${ghost}`}>Esci</button>
          {ask === 'out' ? (
            <div className="grid gap-2 rounded-lg border border-edge p-3">
              <p className="m-0 text-sm">Chiude l'accesso su tutti i telefoni. I dati online restano; su questo vengono tolti. Le notifiche degli altri dispositivi restano finché non le disattivi.</p>
              <button onClick={() => void exitAll()} disabled={busy} className={danger}>Esci ovunque</button>
              <button onClick={() => setAsk(undefined)} disabled={busy} className={`justify-self-start ${ghost}`}>Annulla</button>
            </div>
          ) : (
            <button onClick={() => setAsk('out')} disabled={busy} className={`justify-self-start ${ghost}`}>Esci da tutti i dispositivi</button>
          )}
          <p className="m-0 text-xs text-dim">Uscendo, i dati restano online ma vengono tolti da questo telefono e le notifiche si spengono.</p>
        </section>
      ) : null}
      {email ? (
        <Notifications />
      ) : (
        <section className="grid gap-3 rounded-panel bg-panel p-4">
          <p className="m-0">Accedi per salvare il garage online e usarlo su più telefoni. Senza accesso l'app funziona lo stesso, solo su questo dispositivo.</p>
          <GoogleButton
            onBusy={setBusy}
            onDone={(err) => {
              setMsg(err ?? 'Dati sincronizzati')
              void refresh()
            }}
          />
          <button onClick={() => void copyLocal()} disabled={busy} className={`justify-self-start ${ghost}`}>Scarica una copia</button>
          <p className="m-0 text-xs text-dim">Senza account i dati stanno solo su questo telefono. La copia è un file che resta qui.</p>
        </section>
      )}
      {email ? (
        <section className="grid gap-3 rounded-panel bg-panel p-4">
          <b className="font-gauge text-lg">I tuoi dati</b>
          <p className="m-0 text-sm text-dim">Scarica una copia di moto, interventi, documenti e file salvati online, oppure elimina l'account. L'eliminazione non si può annullare.</p>
          <button onClick={() => void download()} disabled={busy} className={primary}>Scarica i miei dati</button>
          {ask === 'del' ? (
            <div className="grid gap-2 rounded-lg border border-red p-3">
              <p className="m-0 text-sm">Verranno cancellati l'account, i dati online e i file. Su questo telefono sparisce tutto.</p>
              <button onClick={() => void wipe()} disabled={busy} className={danger}>Elimina definitivamente</button>
              <button onClick={() => setAsk(undefined)} disabled={busy} className={`justify-self-start ${ghost}`}>Annulla</button>
            </div>
          ) : (
            <button onClick={() => setAsk('del')} disabled={busy} className={`justify-self-start ${ghost}`}>Elimina account</button>
          )}
        </section>
      ) : null}
      <p className="m-0 text-xs text-dim">Elenco dei modelli: NHTSA vPIC, Traficom (CC BY 4.0), DGT, ASTRA/USTRA (Ufficio federale delle strade), schede e libretti ufficiali dei costruttori.</p>
      {msg && <p role="status" className="m-0 text-sm text-dim">{busy ? 'Attendi…' : msg}</p>}
    </Screen>
  )
}
