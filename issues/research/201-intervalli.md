# 201 — Intervalli di manutenzione ufficiali (nuovi modelli)

Data di verifica: 2026-11-20. Dati in `research/201-models.json` (6 voci). Ogni numero è stato letto
sull'immagine della tabella di manutenzione del libretto ufficiale (PDF del costruttore), non su forum,
siti di riepilogo o valori "tipici". Le tabelle Honda/Yamaha/BMW usano simboli grafici: le pagine sono state
renderizzate e lette come immagine.

## Honda SH125i / SH150i (2020+)

Fonte: portale ufficiale Honda Motopub (`hondamotopub.com`, sezione HMEI = Italiano). SH125 e SH150 condividono
lo stesso libretto e la stessa tabella, quindi le due voci JSON sono identiche.

| Edizione | PDF | Pagine stampate | Esito |
|---|---|---|---|
| 2020 (3LK0RA00) | `https://2rom-prd-data.hondamotopub.com/om/HMEI/SH125_SH150/2020/SH125_SH150_3LK0RA00_0.pdf` | 77–78 | letto per intero |
| 2022-2023 (3LK0RA10) | `.../om/HMEI/SH125_SH150/2022-2023/3LK0RA10_it_web.pdf` | 77–78 | identico |
| 2024 (3LK0RA20) | `.../om/HMEI/SH125_SH150/2024/SH125_SH150AD%20OM%203LK0RA20_ita_WEB.pdf` | 77–78 | identico |

Valori: olio motore primo a 1 000 km poi ogni 6 000 km + sostituzione annuale; filtro aria ogni 18 000 km;
candela controllo 6 000 / sostituzione 12 000; gioco valvole controllo ogni 6 000; cinghia controllo 12 000 /
sostituzione 24 000; olio trasmissione finale ogni 2 anni; liquido freni controllo 6 000 + annuale, sostituzione
2 anni; liquido refrigerante controllo 12 000 + annuale, sostituzione 3 anni; ruote/pneumatici controllo 6 000 + annuale.

Ambiguità:
- Il "filtro olio motore a reticella" va **pulito** (C) a 12/24/36 000 km: non esiste l'azione "clean",
  quindi `oil_filter` è omesso.
- La tabella va fino a 36 000 km; la nota *1 dice di ripetere gli intervalli oltre.
- L'edizione 2026 (K0R261) esiste solo in inglese sul portale e non l'ho letta.

## Honda SH350i (2021+)

Fonte: `https://2rom-prd-data.hondamotopub.com/om/HMEI/SH350A/2021-2022/3LK1WA00%20SH350A%20OM%2020%20ita_WEB.pdf`
(pagine stampate 75–76), confrontata con l'edizione 2025
`.../om/HMEI/SH350A/2025/SH350A_OM_3LK1WA20_ita_WEB.pdf` (pagine 76–77): tabella identica.

Valori: olio motore primo a 1 000 km, poi ogni 12 000 km + annuale; filtro olio a 1 000, 24 000, 48 000 (→ ogni
24 000, primo a 1 000); filtro aria 24 000; candele 12 000; gioco valvole controllo 24 000; cinghia controllo 12 000 /
sostituzione 24 000; olio trasmissione finale 2 anni; liquido freni controllo 12 000 + annuale, sostituzione 2 anni;
refrigerante controllo 12 000 + annuale, sostituzione 3 anni; pneumatici controllo 12 000 + annuale.
Non mappato: "filtro aria carter cinghia" da pulire ogni 12 000 km.

## Yamaha MT-07 (generazione 2021–2024, MTN690)

Fonte: CDN ufficiale Yamaha Europe, libretto italiano
`https://cdn2.yamaha-motor.eu/prod/owner-manuals/Motorcycles/PBAT28199H0H.PDF` (BAT-28199-H0, 1a ed. ottobre 2020),
tabelle alle pagine PDF 51–56 (stampate 6-3 … 6-8; nel JSON `page` = pagina PDF 51 perché il campo è intero).
Controllate anche `PBAT28199H1H.PDF` (BAT-28199-H1) e `PBTK28199H1H.pdf` (BTK-28199-H1, copertina 2023): stesse voci.

Valori: olio ogni 10 000 km + annuale (primo a 1 000); cartuccia filtro olio a 1 000, 20 000, 40 000 (→ ogni 20 000,
primo a 1 000); filtro aria 40 000; candele controllo 10 000 / sostituzione 20 000; gioco valvole "controllare e
regolare" ogni 40 000; catena "controllare, regolare e lubrificare" ogni 1 000 km (e dopo lavaggio/pioggia);
liquido freni ogni 2 anni; refrigerante controllo 10 000 + annuale, sostituzione ogni 3 anni; pneumatici 10 000 + annuale.

Ambiguità:
- La generazione **2025+** (nuova MT-07 con Y-AMT) **non** è verificata: non ho trovato il codice libretto sul CDN.
  Per questo `yearTo` = 2024.
- Gioco valvole reso come `inspect` (il libretto dice "controllare e regolare").
- Da 50 000 km gli intervalli ripartono da 10 000 km.
- Il catalogo pagine manuali di yamaha-motor.eu non risponde (404); i PDF si scaricano direttamente dal CDN.

## Yamaha Tracer 7 (2020+)

Fonte: `https://cdn2.yamaha-motor.eu/prod/owner-manuals/Motorcycles/PB4TF8199HAH.pdf` (B4T-F8199-HA, MTT690 "TRACER 7",
1a ed. novembre 2021, italiano), pagine PDF 54–59 (stampate 6-3 … 6-8). Confrontata con
`PB4TF8199H1H.pdf` (B4T-F8199-H1, "TRACER 700", 1a ed. marzo 2020): stesse voci e stessi intervalli testuali.
Tabella identica a quella dell'MT-07 (stesso motore CP2): valori come sopra.
Nota: il 2020 si chiamava ancora "Tracer 700" in Italia; l'alias è incluso. Le spunte del H1 le ho verificate solo
via testo/intestazioni, le immagini lette sono quelle dell'HA.

## BMW R 1300 GS (2024+)

Fonte: portale ufficiale `manuals.bmw-motorrad.com`, libretto italiano
`https://manuals.bmw-motorrad.com/manuals/BA-Extern/IN/BA-INTERNET-COM/PDF/R_0M21_RM_0223_04.pdf`
(suffisso `_04` = italiano; `_01` inglese, `_02` francese, ecc.), "Schema di manutenzione" a pagina stampata 301
(PDF 307), testo alle pagine 299–303.

Valori: controllo rodaggio a 500–1 200 km (olio + filtro, nel JSON `firstKm` = 1200, il limite superiore);
olio motore con filtro annualmente o ogni 10 000 km; olio rinvio angolare ogni 2 anni o 20 000 km; gioco valvole,
candele e filtro aria ogni 20 000 km; liquido freni: la prima volta dopo un anno, poi ogni due anni
(nel JSON `months: 24`, il primo cambio a 12 mesi non è esprimibile); pneumatici (pressione e battistrada) controllati
nel service standard (annuale o 10 000 km).

Ambiguità:
- Il liquido di raffreddamento non compare nello schema (solo controllo livello nel service): omesso.
- "Controllo visivo e lubrificazione albero cardanico" ogni 20 000 e sostituzione albero cardanico a 80 000 km
  ("in riferimento al chilometraggio del componente"): nessuna chiave corrispondente, omessi.
- Il chilometraggio massimo del service può essere personalizzato dal concessionario; questi sono i valori dello schema.

## Modelli saltati

- **Vespa GTS 300 (2023+)**: `manuals.vespa.com` risponde 403 al proxy; nessun mirror ufficiale Piaggio trovato.
  Le copie trovate (manualmachine, steelbytes, manualslib) non sono fonti ufficiali.
- **Benelli TRK 502 (2017+)**: `benelli.com/it-it` non ha più la TRK 502 né una sezione manuali (pagine prodotto 404).
  L'unico PDF Benelli trovato su asset.moto.it riguarda la 502C ed è ospitato da terzi. Solo copie non ufficiali (manualshive).
- **Ducati Monster (2021+, 937)**: la pagina ufficiale "manuals, genuine parts and maintenance schedules" su
  ducati.com risponde 403 (sia curl che WebFetch); non ho trovato il PDF su un host Ducati raggiungibile.
