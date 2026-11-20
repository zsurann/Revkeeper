---
id: 19
title: "Client OAuth Google per il login"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

L'utente crea un progetto su Google Cloud Console, configura la schermata di consenso OAuth (tipo esterno, nome Revkeeper, ambiti `openid email profile`) e un client OAuth "Applicazione web" con origini autorizzate `https://revkeeper.pages.dev` e `http://localhost:5173`, più l'URI di reindirizzamento `https://revkeeper.pages.dev/auth/google`. Annotare il Client ID (non è segreto). Il Worker verifica l'ID token di Google Identity Services con le chiavi pubbliche di Google: non serve il client secret. Su iOS la PWA installata usa la modalità redirect, non il popup.

## Resolution

L'utente ha creato il client OAuth. Client ID: `517496172383-1l7otafbhost3ubro8ei3qqnlgsa77ma.apps.googleusercontent.com` (pubblico: va nel client come `VITE_GOOGLE_CLIENT_ID` e nel Worker come `GOOGLE_CLIENT_ID` per controllare l'`aud` dell'ID token). Origini e URI di reindirizzamento non verificati da qui: si controllano al primo login vero.
