---
id: 506
title: "Allineare client e server sul pareggio di orario nel sync"
labels: [wayfinder:task]
status: open
---

## Question

A parità di `updatedAt` il server sceglie il `device_id` più grande, mentre il client in `pullAll` tiene sempre la copia locale (`>=`): due dispositivi possono restare diversi per sempre. Applicare in `pullAll` la stessa regola del server, con un test. Raro ma economico. PR e pubblicazione.
