# Skill del progetto: animazioni

| Skill | Fonte | Licenza |
|---|---|---|
| `web-animation-design` | [vercel-labs/open-agents](https://github.com/vercel-labs/open-agents) (dal corso animations.dev di Emil Kowalski) | MIT |
| `web-motion-design` | [dylantarre/animation-principles](https://github.com/dylantarre/animation-principles) | MIT |
| `micro-interactions` | [dylantarre/animation-principles](https://github.com/dylantarre/animation-principles) | MIT |

Copiate senza modifiche. Regole di Revkeeper quando le skill non sono d'accordo:

- Niente rimbalzi o overshoot nell'interfaccia: vale `web-animation-design`, non gli esempi elastici di `web-motion-design`.
- Libreria: `motion/react` già in uso (`src/motion.ts` per durate ed easing); per animazioni ripetute su molti elementi, CSS puro.
- Solo `transform` e `opacity`; niente `backdrop-blur` sulle parti che scorrono.
