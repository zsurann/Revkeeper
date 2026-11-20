---
id: 19
title: "Client OAuth Google per il login"
labels: [wayfinder:task]
status: open
assignee:
blocked_by: []
---

## Question

L'utente crea un progetto su Google Cloud Console, configura la schermata di consenso OAuth (tipo esterno, nome Revkeeper, ambiti `openid email profile`) e un client OAuth "Applicazione web" con origini autorizzate `https://revkeeper.pages.dev` e `http://localhost:5173`, più l'URI di reindirizzamento `https://revkeeper.pages.dev/auth/google`. Annotare il Client ID (non è segreto). Il Worker verifica l'ID token di Google Identity Services con le chiavi pubbliche di Google: non serve il client secret. Su iOS la PWA installata usa la modalità redirect, non il popup.
