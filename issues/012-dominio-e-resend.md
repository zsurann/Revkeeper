---
id: 12
title: "Dominio e account Resend"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

L'utente compra o sceglie un dominio (DNS su Cloudflare), crea un account Resend, verifica il dominio (record SPF e DKIM) e collega la chiave API come credenziale della sessione per `api.resend.com`. Annotare il dominio e il mittente (es. `accesso@<dominio>`).

## Resolution

Chiuso senza farlo: l'utente non ha un dominio e ha scelto il **login con Google** al posto del codice via email. Dominio e Resend non servono più; l'app sta su `revkeeper.pages.dev`. Al suo posto c'è il ticket "Client OAuth Google per il login".
