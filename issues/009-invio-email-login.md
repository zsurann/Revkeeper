---
id: 9
title: "Invio email per il login da Cloudflare Workers"
labels: [wayfinder:research]
status: closed
assignee:
blocked_by: []
---

## Question

Quale servizio usare per inviare le email del login con link o codice da un Worker Cloudflare (Cloudflare Email Service/Email Routing, Resend, Postmark, MailChannels...): piano gratuito, consegna su Gmail e Outlook, dominio richiesto (SPF, DKIM), SDK compatibile con Workers. E come fare il login con link via email in modo sicuro (token monouso con scadenza, sessione in cookie o JWT, limiti di frequenza)?

## Resolution

Serve un **dominio proprio** (DNS su Cloudflare) con SPF e DKIM. Servizio: **Resend Free** (3.000 email al mese, 100 al giorno) chiamato con `fetch` dentro un'unica funzione `sendLoginEmail()`; il binding Cloudflare Email Service richiede Workers Paid. Login: **codice a 6 cifre** come metodo principale (su iOS la PWA non condivide i cookie con Safari, quindi il link fa il login nel posto sbagliato). Il codice si salva come HMAC, vale 10 minuti, è monouso, ammette 5 tentativi. Sessione in cookie `__Host-` HttpOnly con token opaco hashato in D1, niente JWT. Limiti di frequenza con il binding Rate Limiting più un tetto per email. Il "link via email" deciso nel ticket "Push con dati locali" diventa quindi un codice via email, con il link facoltativo. Dettagli: [research/009-invio-email-login.md](research/009-invio-email-login.md).
