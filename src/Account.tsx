import { useEffect, useState } from 'react'
import { getMeta } from './db'
import { GoogleButton } from './GoogleButton'
import { Notifications } from './Notifications'
import { logout, syncNow } from './sync'
import { Screen, ghost, primary } from './ui'

const ago = (ms?: number) => (ms ? new Date(ms).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : 'mai')

export const Account = ({ onClose }: { onClose: () => void }) => {
  const [email, setEmail] = useState<string>()
  const [lastSync, setLastSync] = useState<number>()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

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
          <button onClick={() => void logout().then(refresh)} className={`justify-self-start ${ghost}`}>Esci</button>
          <p className="m-0 text-xs text-dim">Uscendo, i dati restano su questo telefono ma smettono di sincronizzarsi.</p>
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
        </section>
      )}
      <p className="m-0 text-xs text-dim">Elenco dei modelli: NHTSA vPIC, Traficom (CC BY 4.0), DGT, ASTRA/USTRA (Ufficio federale delle strade), schede e libretti ufficiali dei costruttori.</p>
      {msg && <p role="status" className="m-0 text-sm text-dim">{busy ? 'Attendi…' : msg}</p>}
    </Screen>
  )
}
