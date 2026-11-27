# GDPR e normativa italiana: cosa serve a Revkeeper per il lancio pubblico

Issue: [#43](https://github.com/zsurann/Revkeeper/issues/43) · Ricerca del 27/11/2026 · **Non è una consulenza legale**: è una sintesi delle fonti primarie da verificare prima del lancio.

## TL;DR

- L'esenzione "domestica" **non si applica**: Revkeeper è un servizio offerto a un numero indefinito di persone su Internet. Il gestore privato è **titolare del trattamento** a tutti gli effetti del GDPR.
- Obblighi certi al lancio: informativa art. 13 accessibile prima del login e da ogni pagina; procedura per i diritti (accesso, rettifica, cancellazione, portabilità); accordi art. 28 con i fornitori (DPA di Cloudflare e Sentry, accettati online); misure di sicurezza art. 32; procedura data breach art. 33-34; trasferimenti extra-UE coperti (DPF o clausole tipo).
- **Banner cookie non necessario**: lo storage usato è tecnico (preferenza tema, moto attiva, sessione, iscrizione push richiesta dall'utente). Basta descriverlo nell'informativa.
- Notifiche push: non serve un "consenso privacy" separato; serve che l'utente le attivi lui (permesso del browser dopo un'azione esplicita) e possa disattivarle.
- DPO: **non** obbligatorio. Registro dei trattamenti: formalmente dovuto (trattamento non occasionale), costa poco; consigliato tenerlo.
- Età minima: per i trattamenti basati sul consenso, in Italia 14 anni (art. 2-quinquies Codice). Per Revkeeper conviene dichiarare un'età minima (14 o 18, vedi §5) nei termini.
- Termini d'uso: non imposti dal GDPR, ma fortemente consigliati (limitazione di responsabilità, età minima, chiusura del servizio).

## 1. Esenzione "household": non si applica

L'art. 2(2)(c) GDPR esclude i trattamenti "effettuati da una persona fisica per l'esercizio di attività a carattere esclusivamente personale o domestico". Il considerando 18 precisa che l'esenzione riguarda attività **senza connessione con un'attività commerciale o professionale**, ma **non** si estende ai titolari che forniscono i mezzi per trattare dati personali per tali attività.

- La Corte di giustizia ha sempre letto l'esenzione in modo restrittivo: pubblicare dati su Internet accessibili a un numero indefinito di persone ne esce (C-101/01 *Lindqvist*, punto 47); anche una semplice telecamera domestica che riprende la strada ne esce (C-212/13 *Ryneš*, punti 29-33).
- Revkeeper è un servizio pubblico per terzi: il gestore fornisce i mezzi, quindi è titolare. L'assenza di scopo di lucro **non** cambia la qualifica: il GDPR non distingue tra profit e non profit.
- Gli utenti che annotano la *propria* moto sono invece in ambito domestico per i loro dati: il considerando 18 lo dice espressamente.

Fonti: [GDPR (testo IT, EUR-Lex)](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679) art. 2 e cons. 18 · [C-101/01 Lindqvist](https://curia.europa.eu/juris/liste.jsf?num=C-101/01) · [C-212/13 Ryneš](https://curia.europa.eu/juris/liste.jsf?num=C-212/13)

## 2. Mappa dei trattamenti e base giuridica (art. 6)

| Trattamento | Dati | Base giuridica | Note |
|---|---|---|---|
| Account e sincronizzazione (login Google opzionale) | email, identificativo Google (`sub`), nome se ricevuto | Art. 6(1)(b) contratto: erogare il servizio richiesto | Le [Linee guida EDPB 2/2019](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_it) ammettono la 6(1)(b) solo per ciò che è oggettivamente necessario al servizio. Login e sync lo sono. |
| Dati moto: targa, telaio, km, interventi, spese, scadenze, foto/PDF | dati dell'utente; targa e telaio sono dati personali perché riconducibili a una persona | 6(1)(b) | Le foto possono ritrarre persone o altre targhe: avvertire nell'informativa di non caricare dati di terzi. Nessun dato "particolare" art. 9 previsto. |
| Account ospite anonimo per le notifiche | ID casuale, iscrizione push, scadenze | 6(1)(b) | "Anonimo" è improprio: un ID persistente legato a un endpoint push è un dato **pseudonimo**, quindi personale (cons. 26). Nell'informativa chiamarlo "account ospite senza email". |
| Notifiche push | endpoint del servizio push del browser, chiavi, scadenze da notificare | 6(1)(b) (funzione chiesta dall'utente) | Vedi §7. L'endpoint passa dal servizio push del vendor del browser (Google FCM, Mozilla, Apple): va citato. |
| Log di sicurezza e anti-abuso (IP, user-agent nei log Cloudflare) | IP, data/ora | 6(1)(f) legittimo interesse (sicurezza, cons. 49) | Indicare il legittimo interesse nell'informativa (art. 13(1)(d)). |
| Errori applicativi (Sentry, regione DE) | stack trace, browser, URL; nessun dato personale per configurazione | 6(1)(f) | Anche senza email, IP e user-agent possono arrivare a Sentry se non disattivati: verificare `sendDefaultPii: false` e lo scrubbing IP lato progetto. Se davvero nulla di personale arriva, il trattamento è comunque da citare per trasparenza. |
| Statistiche Cloudflare Web Analytics (senza cookie) | dati aggregati di visita | 6(1)(f) | Nessun cookie né fingerprint secondo Cloudflare: niente consenso ex art. 122. |
| Backup notturno 7 giorni | copia del DB | 6(1)(f) / art. 32 (sicurezza e integrità) | Vedi §8. |
| Risposta a richieste dell'utente / obblighi di legge | email, contenuto della richiesta | 6(1)(c) obbligo legale (rispondere ai diritti, art. 12) | |

Il **consenso** (6(1)(a)) non serve per nessuno dei trattamenti sopra, ed è meglio non usarlo: un consenso revocabile come base per un servizio richiesto crea solo problemi ([Linee guida EDPB 05/2020 sul consenso](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_it), §1 e §2.1).

## 3. Contenuti minimi dell'informativa (art. 13)

Da fornire **al momento della raccolta** (prima del login e prima di attivare le notifiche), in forma "concisa, trasparente, intelligibile e facilmente accessibile, con linguaggio semplice e chiaro" (art. 12(1)). Checklist art. 13:

1. **Identità e contatti del titolare** (art. 13(1)(a)): nome e cognome della persona fisica e un recapito. Un indirizzo email dedicato basta per il GDPR; un indirizzo postale non è richiesto dall'art. 13, ma vedi D.Lgs. 70/2003 in §4.
2. Dati di contatto del DPO: **non applicabile** (vedi §10), dirlo o ometterlo.
3. **Finalità e base giuridica** di ciascun trattamento (13(1)(c)): la tabella del §2 in forma leggibile.
4. **Legittimi interessi** perseguiti, quando la base è 6(1)(f) (13(1)(d)): sicurezza, diagnosi errori, statistiche aggregate.
5. **Destinatari o categorie** (13(1)(e)): Cloudflare (hosting, DB, file), Google (login), Sentry (errori), servizi push dei browser. Indicare il ruolo (responsabile del trattamento o titolare autonomo, vedi §6).
6. **Trasferimenti extra-UE** e garanzia usata (13(1)(f)): DPF / clausole contrattuali tipo, con link (vedi §6).
7. **Periodo di conservazione** o criteri (13(2)(a)): fino alla cancellazione dell'account; account ospite inattivo dopo N mesi (decisione del titolare, vedi sotto); backup 7 giorni; log Cloudflare secondo il loro periodo; Sentry 90 giorni (piano standard; da verificare sul proprio piano).
8. **Diritti** (13(2)(b)): accesso, rettifica, cancellazione, limitazione, opposizione (per i trattamenti 6(1)(f)), portabilità (per quelli 6(1)(b)). Come esercitarli: dalle impostazioni dell'app (esporta / elimina account) o via email. Termine di risposta: 1 mese (art. 12(3)).
9. Diritto di revocare il consenso: solo se c'è un trattamento basato sul consenso; con l'impostazione proposta non c'è.
10. **Diritto di reclamo al Garante** (13(2)(d)), con link a [garanteprivacy.it](https://www.garanteprivacy.it/home/diritti/come-agire-per-tutelare-i-tuoi-dati-personali/reclamo).
11. Se il conferimento è **obbligo contrattuale o requisito** e conseguenze del mancato conferimento (13(2)(e)): senza login non c'è sincronizzazione; senza iscrizione push niente promemoria.
12. **Processi decisionali automatizzati / profilazione** (13(2)(f)): dichiarare che non ce ne sono.
13. Sezione **storage locale** (richiesta dalle Linee guida cookie del Garante anche per gli strumenti tecnici): elenco delle chiavi usate (tema, moto attiva, sessione, service worker/cache, iscrizione push), finalità, durata.
14. Data di ultimo aggiornamento e come vengono comunicate le modifiche.

Forma: pagina raggiungibile da ogni schermata (footer o menu) e linkata vicino al pulsante "Accedi con Google" e al pulsante per attivare le notifiche. Approccio a livelli consigliato dalle [Linee guida WP29 sulla trasparenza (WP260 rev.01, fatte proprie dall'EDPB)](https://ec.europa.eu/newsroom/article29/items/622227).

## 4. Termini d'uso

- **GDPR**: non li richiede.
- **D.Lgs. 70/2003** (commercio elettronico), art. 7: il prestatore di un "servizio della società dell'informazione" deve rendere accessibili nome, indirizzo geografico, email ed eventuale partita IVA. La definizione (art. 2(a), dalla Direttiva 2000/31) riguarda servizi "prestati normalmente dietro retribuzione". Un servizio gratuito e senza pubblicità di un privato è al limite: la Corte di giustizia legge "retribuzione" in senso largo (anche finanziata da altri), ma qui non c'è nessuna economia. **Rischio basso; prudenza suggerisce comunque di pubblicare almeno nome ed email** (che servono già per l'art. 13). [Testo su Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-04-09;70).
- **Consigliati comunque**, perché proteggono il gestore: servizio offerto "così com'è" e gratuito; l'utente resta responsabile delle scadenze reali (bollo, revisione, assicurazione) e i promemoria sono un aiuto, non una garanzia; età minima; divieto di caricare dati di terzi o contenuti illeciti; diritto del gestore di chiudere il servizio con preavviso e possibilità di esportare i dati; legge italiana. La limitazione di responsabilità non può coprire dolo o colpa grave (art. 1229 c.c.) e, se gli utenti sono consumatori, non può essere vessatoria (Codice del consumo, artt. 33-36, applicabile solo se il gestore è "professionista", cosa dubbia per un privato non profit).

## 5. Età minima

- **Art. 8 GDPR**: per i servizi della società dell'informazione offerti direttamente ai minori, **quando la base è il consenso**, il minore deve avere almeno 16 anni, salvo età inferiore fissata dallo Stato membro.
- **Italia: 14 anni**, art. 2-quinquies del Codice privacy (D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018). Il comma 2 impone anche, verso i minori, un'informativa con linguaggio "particolarmente chiaro e semplice".
- Revkeeper **non usa il consenso** come base, quindi l'art. 8 a rigore non scatta. Resta però la questione della **capacità di contrarre** (art. 2 c.c.: maggiore età a 18 anni) per la base contrattuale 6(1)(b). Per un servizio gratuito che un 14-17enne usa per il proprio motorino/125, le Linee guida EDPB 2/2019 (§13 e ss.) rimandano al diritto nazionale dei contratti.
- Decisione al titolare: "almeno 14 anni" (coerente con il Codice e con il pubblico dei ciclomotori) oppure "almeno 18 anni" (più semplice sul piano contrattuale). Non serve verifica dell'età: basta la dichiarazione nei termini e un controllo ragionevole (cons. 38, art. 8(2) "sforzi ragionevoli" si applica solo al consenso).

Fonti: [GDPR art. 8](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679) · [Codice privacy coordinato, Garante](https://www.garanteprivacy.it/codice)

## 6. Fornitori, ruoli e trasferimenti extra-UE

| Fornitore | Ruolo | Dove | Garanzia trasferimento |
|---|---|---|---|
| Cloudflare (Pages, Workers, D1, R2 UE, Web Analytics) | Responsabile (art. 28) tramite il [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/), incluso nei termini del servizio | R2 in giurisdizione UE; D1 e la rete edge **non** sono vincolati all'UE salvo configurazione (location hint / jurisdiction). Cloudflare Inc. è statunitense. | Cloudflare dichiara la certificazione **EU-U.S. DPF** e include le clausole contrattuali tipo (SCC) nel DPA ([trust hub GDPR](https://www.cloudflare.com/trust-hub/gdpr/)). |
| Google Identity Services | **Titolare autonomo** per l'autenticazione dell'account Google; Revkeeper riceve l'ID token | USA/UE | Google LLC certificata DPF; per l'utente UE il titolare dell'account Google è Google Ireland. Basta citarlo e linkare la [privacy policy di Google](https://policies.google.com/privacy). |
| Sentry (Functional Software, Inc.) | Responsabile tramite il [Sentry DPA](https://sentry.io/legal/dpa/) | Dati su regione DE; società USA, accessi di supporto possibili dagli USA | Sentry dichiara la certificazione DPF più SCC ([documento trasferimenti](https://sentry.io/astro-assets/trust/International-Data-Transfers-With-Sentry-2025-12-26.pdf)). |
| Servizi push dei browser (FCM, Mozilla autopush, Apple) | Destinatari tecnici scelti dal browser dell'utente | Prevalentemente USA | Il contenuto è cifrato end-to-end (RFC 8291), il vendor vede endpoint e metadati. Citarli in informativa; ridurre il testo della notifica al minimo (es. "Scadenza in arrivo", senza targa). |

**DPF**: la Commissione ha adottato la [decisione di adeguatezza (UE) 2023/1795](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32023D1795) il 10/07/2023: i trasferimenti verso organizzazioni certificate non richiedono ulteriori garanzie (art. 45). Il Tribunale UE ha respinto il ricorso di annullamento nella causa T-553/23 *Latombe* (settembre 2025); è possibile un'impugnazione e il quadro politico USA è instabile, quindi conviene che i DPA contengano anche le SCC come rete di sicurezza (Cloudflare e Sentry lo fanno). **Obbligo pratico**: verificare la certificazione attiva di ciascuna società sulla [lista ufficiale DPF](https://www.dataprivacyframework.gov/list) prima del lancio e citare la garanzia nell'informativa.

**DPA art. 28**: il titolare deve avere un contratto con ogni responsabile. Per Cloudflare e Sentry i DPA sono incorporati nei termini self-serve; conviene salvarne una copia PDF con data e, per Sentry, accettarlo dalle impostazioni dell'organizzazione se richiesto.

## 7. Storage locale e notifiche push (art. 122 Codice privacy)

L'**art. 122 del Codice** (recepimento dell'art. 5(3) Direttiva ePrivacy 2002/58) richiede il consenso per archiviare o accedere a informazioni sul terminale dell'utente, **salvo** che sia "strettamente necessario al fornitore di un servizio della società dell'informazione esplicitamente richiesto dal contraente o dall'utente".

- Le [Linee guida cookie del Garante del 10/06/2021 (doc. web 9677876)](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876) chiariscono che gli strumenti **tecnici** non richiedono consenso né banner, ma vanno descritti nell'informativa. La regola vale per qualsiasi tecnologia (localStorage, IndexedDB, cache del service worker), non solo per i cookie; lo conferma l'EDPB nelle [Linee guida 2/2023 sull'ambito tecnico dell'art. 5(3)](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2023/guidelines-22023-technical-scope-art-53-eprivacy_it).
- Revkeeper usa: preferenza tema, moto attiva, token di sessione, dati offline e cache PWA. Sono tutti necessari a una funzione richiesta: **niente consenso, niente banner**. Gli analytics Cloudflare senza cookie non scrivono sul terminale; cookie di terze parti assenti. Se in futuro si aggiunge un analytics con cookie/ID persistente, il banner diventa obbligatorio.
- **Push**: l'iscrizione crea un endpoint e chiavi sul dispositivo. È lo storage necessario a un servizio (promemoria) che l'utente chiede esplicitamente, quindi rientra nell'eccezione. Condizioni pratiche: chiedere il permesso **solo dopo un'azione dell'utente** (pulsante "Attiva promemoria"), mai all'apertura; spiegare cosa si riceverà; offrire la disattivazione in app; cancellare l'iscrizione lato server quando l'utente la revoca o l'endpoint restituisce 404/410. Il permesso del browser **non è** un consenso GDPR e non serve che lo sia: la base è 6(1)(b).
- Le notifiche non devono contenere promozioni: servono per scadenze, altrimenti diventano comunicazioni promozionali (art. 130 Codice) con consenso specifico.

## 8. Backup conservati 7 giorni dopo la cancellazione

Il diritto alla cancellazione (art. 17) va soddisfatto "senza ingiustificato ritardo" e al più entro un mese (art. 12(3)). Non esiste una norma che imponga di riscrivere i backup, e il principio di limitazione della conservazione (art. 5(1)(e)) è rispettato se:

1. i backup hanno una **durata breve e fissa** (7 giorni va bene) e scadono automaticamente (D1 Time Travel / export R2 con regola di lifecycle);
2. i dati nei backup sono "fuori uso": nessun accesso se non per ripristino (art. 32);
3. in caso di **ripristino** si ripetono le cancellazioni avvenute dopo il backup (tenere un elenco minimo degli ID cancellati per i 7 giorni, senza altri dati);
4. l'informativa lo dice esplicitamente: "dopo l'eliminazione dell'account, i tuoi dati restano nei backup cifrati per al massimo 7 giorni, poi vengono sovrascritti".

Questa è la prassi riconosciuta dalle autorità (vedi ad es. la guida ICO sul "right to erasure" e i backup). Lo stesso vale per i file su R2: cancellare l'oggetto subito; se il bucket ha versioning, far scadere le versioni entro lo stesso termine.

Fonti: [GDPR artt. 5, 12, 17, 32](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679) · [ICO, Right to erasure (backup)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/)

## 9. Registro dei trattamenti (art. 30)

- L'art. 30(5) esonera le organizzazioni con meno di 250 dipendenti **salvo** che il trattamento possa presentare un rischio, **non sia occasionale**, o includa dati particolari/penali.
- Un servizio online che tratta dati di utenti in modo continuativo è **non occasionale**: l'esenzione non regge. Lo conferma la lettura del Garante nelle [FAQ sul registro delle attività di trattamento](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9047529) e la [position paper WP29/EDPB sull'art. 30(5)](https://ec.europa.eu/newsroom/article29/items/624045), secondo cui basta che un'attività sia non occasionale per doverla registrare.
- In pratica: un documento (anche un foglio) con, per ciascun trattamento del §2, finalità, categorie di interessati e dati, destinatari, trasferimenti e garanzie, termini di cancellazione, descrizione delle misure di sicurezza (art. 30(1)). Il Garante pubblica un [modello semplificato](https://www.garanteprivacy.it/regolamentoue/registro). Non va pubblicato: si esibisce su richiesta.

## 10. DPO (art. 37)

Obbligatorio solo per autorità pubbliche, per chi monitora su larga scala in modo regolare e sistematico, o tratta su larga scala dati particolari/penali. Revkeeper non rientra (niente profilazione, niente tracciamento comportamentale, niente dati sanitari). **Non serve.** Fonte: [Linee guida WP29 sui DPO (WP243 rev.01)](https://ec.europa.eu/newsroom/article29/items/612048).

Una DPIA (art. 35) non è obbligatoria: nessuno dei criteri dell'[elenco del Garante (doc. web 9058979)](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9058979) è soddisfatto in modo significativo.

## 11. Altri obblighi operativi

- **Sicurezza (art. 32)**: HTTPS, controllo accessi per account (già presenti), link firmati/temporanei per i file R2, cifratura a riposo di Cloudflare, 2FA sugli account Cloudflare/Google/Sentry/GitHub del gestore, segreti fuori dal repo.
- **Privacy by default (art. 25)**: login opzionale e account ospite sono già un buon esempio; non chiedere dati superflui; testo delle push senza targa.
- **Data breach (artt. 33-34)**: notificare al Garante entro 72 ore se c'è rischio per gli interessati, tramite la [procedura telematica](https://servizi.gpdp.it/databreach/s/); documentare comunque ogni violazione. Scrivere una procedura di mezza pagina.
- **Diritti**: export dati (JSON/ZIP) ed eliminazione account dall'app coprono portabilità e cancellazione; per accesso/rettifica basta l'app più l'email di contatto.
- **Rappresentante UE (art. 27)**: non serve, il titolare è in Italia.

## 12. Cosa rischia un privato

- **Sanzioni amministrative (art. 83)**: fino a 10 milioni o 20 milioni di euro a seconda della violazione, ma devono essere "effettive, proporzionate e dissuasive" e il Garante considera natura, gravità, dimensione, colpa, misure adottate e collaborazione (art. 83(2)). Per una persona fisica senza lucro che ha informativa, DPA e misure di sicurezza ragionevoli, il rischio pratico è basso; più probabile un ammonimento o un ordine di adeguamento (art. 58(2)). Il Garante sanziona anche persone fisiche (ad es. per videosorveglianza o diffusione illecita), con importi di solito nell'ordine di centinaia o poche migliaia di euro.
- **Risarcimento (art. 82)**: l'utente può chiedere i danni materiali o immateriali; la Corte di giustizia richiede la prova di un danno effettivo, anche lieve (C-300/21 *Österreichische Post*).
- **Penale (artt. 167-167-bis Codice)**: solo per trattamenti illeciti con dolo di profitto o danno; non rilevante per un uso corretto.
- I rischi più concreti per Revkeeper: data breach dei file allegati (foto di libretti, documenti), informativa assente o incompleta, richieste di cancellazione ignorate.

## 13. Decisioni che restano al titolare

1. Quale nome e recapito pubblicare (nome e cognome + email dedicata; indirizzo postale sì/no ai fini del D.Lgs. 70/2003).
2. Età minima: 14 o 18 anni.
3. Durata di conservazione degli account ospite inattivi e degli account inattivi in generale (es. 24 mesi senza accesso, con avviso).
4. Se vincolare anche D1 alla giurisdizione UE (riduce i trasferimenti) e se configurare Sentry per scartare IP e user-agent.
5. Testo delle notifiche push (generico o con nome moto/scadenza).
6. Contenuto dei termini d'uso (limitazione di responsabilità, preavviso di chiusura).

## Fonti primarie

- [Regolamento (UE) 2016/679 (GDPR), testo italiano, EUR-Lex](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679)
- [Codice in materia di protezione dei dati personali (D.Lgs. 196/2003), testo coordinato sul sito del Garante](https://www.garanteprivacy.it/codice): artt. 2-quinquies, 122, 130, 166-167
- [Garante, Linee guida cookie e altri strumenti di tracciamento, 10/06/2021, doc. web 9677876](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876)
- [Garante, FAQ sul registro delle attività di trattamento, doc. web 9047529](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9047529)
- [Garante, elenco dei trattamenti soggetti a DPIA, doc. web 9058979](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9058979)
- [EDPB, Linee guida 05/2020 sul consenso](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_it)
- [EDPB, Linee guida 2/2019 sull'art. 6(1)(b)](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_it)
- [EDPB, Linee guida 2/2023 sull'ambito tecnico dell'art. 5(3) ePrivacy](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2023/guidelines-22023-technical-scope-art-53-eprivacy_it)
- [WP29/EDPB, Linee guida sulla trasparenza WP260 rev.01](https://ec.europa.eu/newsroom/article29/items/622227) · [Linee guida sui DPO WP243 rev.01](https://ec.europa.eu/newsroom/article29/items/612048) · [Position paper art. 30(5)](https://ec.europa.eu/newsroom/article29/items/624045)
- [Decisione di adeguatezza (UE) 2023/1795, EU-U.S. Data Privacy Framework](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32023D1795) · [Lista ufficiale DPF](https://www.dataprivacyframework.gov/list)
- Corte di giustizia: [C-101/01 Lindqvist](https://curia.europa.eu/juris/liste.jsf?num=C-101/01) · [C-212/13 Ryneš](https://curia.europa.eu/juris/liste.jsf?num=C-212/13) · [C-300/21 Österreichische Post](https://curia.europa.eu/juris/liste.jsf?num=C-300/21)
- [D.Lgs. 70/2003 (commercio elettronico), Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-04-09;70)
- Fornitori: [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) · [Cloudflare trust hub GDPR](https://www.cloudflare.com/trust-hub/gdpr/) · [Sentry DPA](https://sentry.io/legal/dpa/) · [Sentry, trasferimenti internazionali](https://sentry.io/astro-assets/trust/International-Data-Transfers-With-Sentry-2025-12-26.pdf) · [Privacy policy Google](https://policies.google.com/privacy)

**Limiti di questa ricerca**: le certificazioni DPF dei fornitori sono riportate dalle loro dichiarazioni, non verificate sulla lista ufficiale; l'esito della causa T-553/23 e i periodi di conservazione di Sentry/Cloudflare vanno ricontrollati al momento del lancio; i link docweb del Garante e WP29 sono citati per numero di documento e vanno aperti prima di riprodurne il testo.
