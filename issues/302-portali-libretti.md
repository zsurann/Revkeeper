---
id: 302
title: "Portali ufficiali dei libretti per marca"
labels: [wayfinder:research]
status: closed
assignee: claude
blocked_by: []
---

## Question

Per le marche del catalogo, quali costruttori pubblicano gratis i libretti uso e manutenzione o i programmi di manutenzione (Honda Motopub, Yamaha, BMW, Kawasaki techinfo, Suzuki, KTM, Ducati, Triumph, Piaggio/Vespa/Aprilia/Moto Guzzi, Benelli, Royal Enfield…)? Sono raggiungibili da script o solo da browser? Le tabelle sono testo o immagini? Quanti modelli copre ciascuno? Che limiti d'uso hanno?

## Resolution

Dettagli: [research/302-portali-libretti.md](research/302-portali-libretti.md).

- **Scaricabili da script** (PDF con testo): Honda, Yamaha, BMW, KTM/Husqvarna/GasGas (API JSON pubblica, 427 combinazioni modello-anno), Triumph, MV Agusta (GET con PDF su S3, 61 modelli), Royal Enfield, e i distributori italiani di Kymco, Voge e CFMoto. Suzuki solo dai siti AU/BR.
- **Bloccati da Akamai** (403 anche da browser automatico): Ducati e tutto il Gruppo Piaggio (Vespa, Aprilia, Moto Guzzi). Si possono scaricare solo a mano da un browser normale.
- **Login o nessun portale**: Kawasaki (da ospite solo l'edizione USA), Harley-Davidson (PDF 403), Benelli, SYM.
- **Formato**: testo estraibile con `pdftotext -layout`, niente OCR, ma le tabelle hanno intestazioni ruotate e pallini da riallineare: serve sempre una verifica.
- **Pipeline proposta**: un lister per marca → download lento fuori dal repo → individuazione delle pagine di manutenzione → estrazione in JSON (agente su testo o immagine) → regole automatiche + verifica → nel repo solo numeri con URL, pagina ed edizione, mai i PDF.
- Termini d'uso: letti per intero solo quelli Honda (copyright, divieto di ridistribuire i PDF); vale la regola "solo fatti con fonte".
