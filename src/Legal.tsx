import type { ReactNode } from 'react'
import { EMAIL, OWNER } from './contact'

// Informativa privacy (art. 13 GDPR) e termini d'uso: pagine /privacy e /termini, leggibili anche senza installare l'app.
// Decisioni: issues 43, 44, 49, 53, 56 della mappa "Revkeeper pronta al lancio pubblico".
const UPDATED = '28 novembre 2026'

const H = ({ children }: { children: ReactNode }) => <h2 className="t-title m-0 mt-7 text-[19px]">{children}</h2>
const Mail = () => (EMAIL ? <a className="underline" href={`mailto:${EMAIL}`}>{EMAIL}</a> : <span>(email da completare)</span>)

const Privacy = () => (
  <>
    <h1 className="t-display m-0 text-[32px]">Informativa privacy</h1>
    <p>Aggiornata il {UPDATED}.</p>
    <H>Chi tratta i dati</H>
    <p>Revkeeper è un servizio gratuito gestito da una persona privata, {OWNER}, titolare del trattamento. Contatto per ogni richiesta: <Mail />.</p>
    <H>Quali dati, perché e su che base</H>
    <ul>
      <li><b>Dati della moto</b> (marca, modello, targa e telaio se li inserisci, km, interventi, spese, scadenze, foto e PDF allegati): servono a far funzionare l'app. Restano sul telefono; vanno sul server solo se accedi con Google o attivi le notifiche (senza Google foto e PDF restano comunque sul telefono). Base: esecuzione del servizio che richiedi (art. 6.1.b).</li>
      <li><b>Account Google</b> (identificativo ed email): per salvare il garage online e usarlo su più telefoni. Base: art. 6.1.b.</li>
      <li><b>Account ospite</b>: se attivi le notifiche senza Google, il server crea un account pseudonimo (un codice casuale, senza email) legato al telefono, per calcolare e inviare i promemoria. Base: art. 6.1.b.</li>
      <li><b>Notifiche</b>: l'indirizzo di consegna fornito dal browser, l'ora e il fuso scelti. Il testo mostra moto e scadenza, mai la targa. Base: art. 6.1.b.</li>
      <li><b>Errori tecnici</b> (Sentry): tipo di errore, versione dell'app, pagina, senza email, IP, contenuti del garage né dati del dispositivo. Base: legittimo interesse a far funzionare l'app (art. 6.1.f).</li>
      <li><b>Statistiche di visita</b> (Cloudflare Web Analytics): conteggi anonimi di pagine e dispositivi, senza cookie. Base: art. 6.1.f.</li>
      <li><b>Copie di sicurezza</b> del database e dei file: per recuperare i dati dopo un guasto. Base: art. 6.1.f.</li>
    </ul>
    <p>Nessuna profilazione, pubblicità o vendita di dati. Non c'è bisogno di consenso e non usiamo cookie di tracciamento: l'app salva sul telefono solo ciò che le serve per funzionare (dati del garage, sessione di accesso, tema).</p>
    <p>Dare i dati è facoltativo: senza i dati di una moto l'app non può calcolarne le scadenze. Non prendiamo decisioni automatizzate né facciamo profilazione (art. 22): i promemoria sono solo calcoli su date e chilometri che inserisci tu.</p>
    <H>Chi riceve i dati</H>
    <ul>
      <li><b>Cloudflare</b> (hosting, database, file, statistiche): database e file in data center nell'Unione europea.</li>
      <li><b>Google</b> (accesso con Google: per mostrare il pulsante "Accedi con Google" il browser contatta Google già all'apertura della schermata, che riceve indirizzo IP e tipo di browser anche se non accedi), <b>Sentry</b> (errori, server in Germania) e i servizi di notifica del browser (Google, Apple, Mozilla, Microsoft).</li>
    </ul>
    <p>Alcuni fornitori hanno sede negli Stati Uniti: i trasferimenti si basano sul Data Privacy Framework UE-USA e sulle clausole contrattuali standard dei fornitori.</p>
    <H>Per quanto tempo</H>
    <ul>
      <li>Account Google: finché non lo elimini. Dopo 24 mesi senza accessi viene eliminato, con un avviso prima se hai le notifiche attive.</li>
      <li>Account ospite: eliminato se non usi l'app per circa 6 mesi (la sessione si rinnova finché la usi).</li>
      <li>Copie di sicurezza: il database fino a 5 settimane, i file 30 giorni. Dopo l'eliminazione dell'account i dati possono restare nelle copie fino a quella scadenza; se una copia viene ripristinata, le eliminazioni vengono riapplicate.</li>
    </ul>
    <H>I tuoi diritti</H>
    <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opporti al trattamento basato sul legittimo interesse. Nell'app, in Account, puoi già scaricare tutti i tuoi dati ed eliminare l'account (o, senza Google, la copia anonima usata per le notifiche). Rispondiamo entro 30 giorni. Puoi anche presentare reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>
    <H>Età minima</H>
    <p>Revkeeper è per chi ha almeno 14 anni.</p>
    <H>Sicurezza e violazioni</H>
    <p>Connessione cifrata, accesso solo ai propri dati, copie di sicurezza. In caso di violazione che metta a rischio i tuoi dati ti avvisiamo via notifica ed email e, quando previsto, informiamo il Garante entro 72 ore.</p>
  </>
)

const Terms = () => (
  <>
    <h1 className="t-display m-0 text-[32px]">Termini d'uso</h1>
    <p>Aggiornati il {UPDATED}.</p>
    <ul>
      <li>Revkeeper è gratuito, offerto da {OWNER} "così com'è", senza garanzie di funzionamento continuo.</li>
      <li>Scadenze e intervalli di manutenzione sono indicativi: non sostituiscono il libretto di uso e manutenzione, i documenti ufficiali né il parere di un meccanico. Controlla sempre le date di assicurazione, bollo e revisione.</li>
      <li>I dati tecnici del catalogo vengono da registri pubblici e documentazione dei costruttori, elaborati e aggregati per modello, senza garanzia di esattezza. Nessuna fonte partecipa a Revkeeper né lo sostiene. Marchi e nomi dei modelli appartengono ai rispettivi proprietari.</li>
      <li>Sei responsabile dei contenuti che carichi (foto, PDF): non caricare dati di altre persone senza averne diritto.</li>
      <li>Il servizio può cambiare o chiudere: in caso di chiusura avvisiamo con almeno 30 giorni di anticipo, per darti il tempo di scaricare i tuoi dati da Account.</li>
      <li>Per l'uso dei dati personali vale l'<a className="underline" href="/privacy">informativa privacy</a>. Contatto: <Mail />.</li>
      <li>Si applica la legge italiana; restano validi i diritti che ti riconosce la legge come consumatore.</li>
    </ul>
  </>
)

export const LEGAL_PATHS = ['/privacy', '/termini']

export const Legal = ({ path }: { path: string }) => (
  <main className="mx-auto max-w-[680px] px-6 py-10 text-[15px] leading-relaxed text-ink-2 [&_b]:text-ink [&_h1]:text-ink [&_h2]:text-ink [&_li]:mt-2 [&_ul]:pl-5">
    <a href="/" className="text-[14px] font-semibold text-ink">← Revkeeper</a>
    <div className="mt-6">{path === '/termini' ? <Terms /> : <Privacy />}</div>
  </main>
)

// Link discreti ai documenti, da mettere sotto le azioni che trattano dati (accesso, notifiche)
export const LegalLinks = ({ className = '' }: { className?: string }) => (
  <p className={`m-0 text-[12px] text-ink-3 ${className}`}>
    <a href="/privacy" className="underline underline-offset-2">Privacy</a> · <a href="/termini" className="underline underline-offset-2">Termini</a>
  </p>
)
