---
id: 305
title: "Importare Traficom e DGT nel catalogo"
labels: [wayfinder:task]
status: open
assignee:
blocked_by: []
---

## Question

Script che scarica i dati Traficom e DGT delle moto, normalizza i nomi (regole della ricerca sugli open data), raggruppa per marca, famiglia e cilindrata, ricava gli anni e i dati tecnici (cc, kW → CV, massa a vuoto) e li fonde con vPIC e catalog-extra.json, rispettando le specifiche verificate già presenti. Test su casi noti (Z650, SH125, codici interni come WW125 = PCX).
