# Registro delle attività di trattamento (art. 30 GDPR)

Titolare: _nome e cognome_ — contatto: _email dedicata_ (gli stessi di `VITE_OWNER_NAME` e `VITE_CONTACT_EMAIL`).
Nessun DPO (non obbligatorio). Aggiornato il 27/11/2026.

| Trattamento | Finalità | Base giuridica | Interessati e dati | Destinatari | Trasferimenti extra-UE | Conservazione |
|---|---|---|---|---|---|---|
| Account Google | Accesso, sincronizzazione tra dispositivi | Contratto (6.1.b) | Utenti: id Google, email | Cloudflare, Google | Google (DPF) | Fino alla cancellazione; 24 mesi di inattività |
| Dati del garage | Funzionamento dell'app | Contratto (6.1.b) | Utenti: moto, targa, telaio, km, interventi, spese, scadenze, allegati | Cloudflare (D1, R2 in UE) | — | Come l'account |
| Account ospite e notifiche | Promemoria senza account | Contratto (6.1.b) | Utenti: codice casuale, endpoint push, ora e fuso | Cloudflare, servizi push dei browser | Google, Apple, Mozilla, Microsoft (DPF/SCC) | Sessione + 7 giorni |
| Errori tecnici | Correzione dei guasti | Legittimo interesse (6.1.f) | Utenti: errore, versione, pagina (niente IP, user-agent, email) | Sentry (DE) | Sentry (DPF) | Secondo Sentry (90 giorni) |
| Statistiche di visita | Capire l'uso del sito | Legittimo interesse (6.1.f) | Visitatori: conteggi anonimi senza cookie | Cloudflare | Cloudflare (DPF) | Secondo Cloudflare |
| Copie di sicurezza | Recupero dopo guasti | Legittimo interesse (6.1.f) | Come sopra | Cloudflare R2 (UE) | — | DB 5 settimane, file 30 giorni |

Misure di sicurezza (art. 32): HTTPS, sessioni con cookie `__Host-` HttpOnly, accesso limitato ai propri dati, limiti di frequenza, CSP, backup e procedura di ripristino (`RIPRISTINO.md`).
Violazioni: valutazione entro 72 ore, notifica al Garante se c'è rischio, avviso agli utenti coinvolti via notifica ed email.
