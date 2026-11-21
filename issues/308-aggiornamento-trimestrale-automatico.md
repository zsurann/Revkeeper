---
id: 308
title: "Aggiornamento trimestrale automatico"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [305]
---

## Question

Attività programmata ogni 3 mesi che rigenera il catalogo (vPIC, Traficom, DGT) e apre una PR da approvare, entro i limiti gratuiti.

## Resolution

Fatto con un **workflow di GitHub Actions** (`.github/workflows/catalog.yml`) invece di un'attività programmata di Claude: è gratis (pochi minuti 4 volte l'anno, dentro i minuti inclusi), non richiede secret né sessioni, e gira dove i siti di Traficom, DGT e vPIC sono raggiungibili.

- Parte il **1° gennaio, aprile, luglio e ottobre** (3:17 UTC) o a mano ("Run workflow").
- Esegue `import-eu.ts`, poi `build-catalog.ts` (scaricando tutto da vPIC), poi i test; se `data/` o `src/data/` sono cambiati, crea il branch `catalog/AAAA-MM` e apre una PR verso `main`. Se i test falliscono, non apre nulla.
- `npm run catalog` ora fa entrambi i passaggi in locale.

**Da fare per l'utente** (una volta): su GitHub, Settings → Actions → General → Workflow permissions: scegliere "Read and write permissions" e spuntare "Allow GitHub Actions to create and approve pull requests".

Non provato: il workflow gira solo su GitHub; da qui ho verificato solo la sintassi YAML. La prima prova è lanciarlo a mano.
