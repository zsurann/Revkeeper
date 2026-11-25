import { useEffect, useState, type ReactNode } from 'react'
import { IgnitionMark, Mark } from './Mark'
import type { Platform } from './domain/platform'
import { promptInstall, useInstallState } from './installPrompt'
import { btn } from './ui'

// Pagina mostrata sui telefoni fuori dall'app installata: porta a installare Revkeeper sulla schermata Home.
// Prototipo approvato: issues/402-prototipo-installazione-e-benvenuto.md

const URL = 'https://revkeeper.pages.dev/'
const big = `${btn.primary} h-14 w-full text-[17px]`
const second = `${btn.secondary} h-13 w-full text-[16px]`

const Icon = ({ d, className = '' }: { d: ReactNode; className?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    {d}
  </svg>
)
const Dots = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
)
const ShareIcon = <Icon d={<><path d="M12 3v12M8 7l4-4 4 4" /><path d="M8 11H6v10h12V11h-2" /></>} />
const AddIcon = <Icon d={<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></>} />
const Toggle = () => (
  <span aria-hidden="true" className="relative block h-7 w-[46px] rounded-full bg-[#34c759]"><i className="absolute right-0.5 top-0.5 size-6 rounded-full bg-white" /></span>
)
const B = ({ children }: { children: ReactNode }) => <b className="font-semibold">{children}</b>

const Shell = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))]">
    <header className="flex items-center gap-2.5">
      <Mark size={36} />
      <span className="t-display text-[22px]">revkeeper</span>
    </header>
    {children}
    <p className="m-0 mt-3 text-[13px] text-ink-3">Già installata? Aprila dall'icona sulla schermata Home.</p>
  </main>
)

const CopyLink = () => {
  const [copied, setCopied] = useState(false)
  if (copied)
    return (
      <>
        <p role="status" className="m-0 flex h-13 items-center justify-center gap-2.5 rounded-full bg-lime-soft text-[16px] font-semibold text-lime-ink animate-[pop_260ms_var(--ease-out)]">
          <Icon d={<path d="M5 12.5l4.5 4.5L19 7.5" className="animate-[draw_420ms_ease-out_120ms_both] [stroke-dasharray:24]" />} />
          Link copiato
        </p>
        <p className="m-0 text-sm text-ink-2">Ora apri il browser e incolla il link nella barra degli indirizzi.</p>
      </>
    )
  return (
    <button className={second} onClick={() => void navigator.clipboard?.writeText(URL).then(() => setCopied(true), () => setCopied(true))}>
      <Icon d={<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>} />
      Copia link
    </button>
  )
}

// Browser interno di un'app (Instagram, Facebook…) o browser che non sa installare: si passa a Safari o Chrome
const OpenElsewhere = ({ p }: { p: Platform }) => {
  const ios = p.os === 'ios'
  const target = ios ? 'Safari' : 'Chrome'
  // x-safari-https: non documentato da Apple ma funziona da iOS 17; intent:// apre Chrome su Android. Se falliscono resta "Copia link"
  const href = ios ? `x-safari-${URL}` : `intent://${URL.slice(8)}#Intent;scheme=https;package=com.android.chrome;end`
  return (
    <>
      <div className="mx-auto mb-5 mt-8 flex items-center gap-4" aria-hidden="true">
        <span className="grid size-14 place-items-center rounded-[14px] bg-surface text-ink-3 shadow-1 ring-1 ring-line"><Dots /></span>
        <svg width="34" height="16" viewBox="0 0 26 16" fill="none" stroke="var(--rk-lime-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="animate-[nudge_1.8s_ease-in-out_infinite]"><path d="M2 8h20M16 2l6 6-6 6" /></svg>
        <Mark size={56} />
      </div>
      <h1 className="m-0 t-display text-[32px]">Aprila in {target} per installarla</h1>
      <p className="m-0 mt-2.5 text-[15px] leading-normal text-ink-2">
        {p.inApp ? `Stai usando il browser interno di ${p.inApp}, che non può aggiungere app alla schermata Home.` : `Questo browser non può aggiungere app alla schermata Home.`}
      </p>
      <div className="mt-auto grid gap-2.5 pt-6">
        <a href={href} className={big}>
          <Icon d={<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>} />
          Apri in {target}
        </a>
        <CopyLink />
        {p.inApp && (
          <p className="m-0 text-[13px] leading-normal text-ink-3">
            Il pulsante non funziona? Tocca <span className="text-ink-2">···</span> in alto a destra e scegli <span className="text-ink-2">Apri nel browser</span>.
          </p>
        )}
      </div>
    </>
  )
}

const Hero = ({ title, text }: { title: string; text: string }) => (
  <>
    <div className="mt-8"><IgnitionMark size={104} /></div>
    <h1 className="m-0 mt-2 t-display text-[34px]">{title}</h1>
    <p className="m-0 mt-3 text-[15px] leading-normal text-ink-2">{text}</p>
  </>
)

const ANDROID_HELP: Partial<Record<Platform['browser'], ReactNode>> = {
  chrome: <>In Chrome tocca <B>⋮</B> in alto a destra, poi <B>Installa e crea scorciatoia</B> e <B>Installa</B>.</>,
  samsung: <>Tocca <B>≡</B> in basso a destra, poi <B>Aggiungi pagina a</B> e <B>Schermata Home</B>.</>,
}

const Android = ({ p }: { p: Platform }) => {
  const state = useInstallState()
  const [help, setHelp] = useState(false)
  const canSelf = p.browser === 'chrome' || p.browser === 'samsung' || p.browser === 'opera'
  const install = async () => {
    if (await promptInstall()) return
    // Niente popup (prima visita troppo breve o rifiutato da poco): passi del menu, o Chrome per gli altri browser
    if (canSelf) setHelp(true)
    else location.href = `intent://${URL.slice(8)}#Intent;scheme=https;package=com.android.chrome;end`
  }
  return (
    <>
      <Hero title="La manutenzione della moto, sempre sotto controllo" text="Revkeeper si usa come app: installala sul telefono. È gratis e funziona anche senza rete." />
      <ul className="m-0 mt-5 grid list-none gap-3 p-0 text-[15px]">
        <li className="flex items-center gap-3"><Icon className="text-lime-ink" d={<path d="M14.7 6.3a4 4 0 0 0-5.3 5.2l-5.6 5.6a1.6 1.6 0 0 0 2.3 2.3l5.6-5.6a4 4 0 0 0 5.2-5.3l-2.5 2.5-2.1-.6-.6-2.1z" />} />Tagliandi e intervalli dal libretto</li>
        <li className="flex items-center gap-3"><Icon className="text-lime-ink" d={<><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></>} />Promemoria per assicurazione, bollo e revisione</li>
        <li className="flex items-center gap-3"><Icon className="text-lime-ink" d={<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>} />Interventi e ricevute in un posto solo</li>
      </ul>
      <div className="mt-auto grid gap-3 pt-6">
        {state === 'installed' ? (
          <p role="status" className="m-0 flex items-center gap-3 rounded-lg bg-surface px-4 py-3.5 shadow-1 ring-1 ring-line animate-[pop_520ms_var(--ease-out)]">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-black"><Icon d={<path d="M5 12.5l4.5 4.5L19 7.5" />} /></span>
            <span className="grid gap-0.5"><b className="font-semibold">Installata</b><span className="text-[13px] text-ink-3">Aprila dall'icona Revkeeper sulla schermata Home.</span></span>
          </p>
        ) : (
          <button onClick={() => void install()} className={big}>
            <Icon d={<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />} />
            Scarica app
          </button>
        )}
        {canSelf && state !== 'installed' && (
          <details open={help} onToggle={(e) => setHelp(e.currentTarget.open)} className="text-[13px] text-ink-3">
            <summary className="flex min-h-8 cursor-pointer items-center">Il pulsante non apre niente?</summary>
            <p className="m-0 mt-1.5 leading-normal [&_b]:text-ink">{ANDROID_HELP[p.browser] ?? ANDROID_HELP.chrome}</p>
          </details>
        )}
      </div>
    </>
  )
}

type Step = { text: ReactNode; chip: ReactNode }
const common: Step[] = [
  { text: <>Scorri e tocca <B>Aggiungi alla schermata Home</B></>, chip: AddIcon },
  { text: <>Lascia attivo <B>Apri come app web</B>, se c'è, e tocca <B>Aggiungi</B></>, chip: <Toggle /> },
]
const iosSteps = (p: Platform): Step[] => {
  if (p.browser === 'chrome') return [{ text: <>Tocca <B>Condividi</B> in alto a destra, nella barra dell'indirizzo</>, chip: ShareIcon }, ...common]
  if (p.browser === 'edge') return [{ text: <>Tocca <B>···</B> in basso, poi <B>Condividi</B></>, chip: <Dots /> }, ...common]
  if (p.browser === 'firefox') return [{ text: <>Tocca <B>≡</B> in basso a destra, poi <B>Condividi</B></>, chip: <Icon d={<path d="M4 7h16M4 12h16M4 17h16" />} /> }, ...common]
  if ((p.safariVersion ?? 26) < 26) return [{ text: <>Tocca <B>Condividi</B> nella barra in basso</>, chip: ShareIcon }, ...common]
  return [{ text: <>Tocca <B>···</B> in basso a destra</>, chip: <Dots /> }, { text: <>Tocca <B>Condividi</B></>, chip: ShareIcon }, ...common]
}

const Iphone = ({ p }: { p: Platform }) => {
  const steps = iosSteps(p)
  const [active, setActive] = useState(0)
  // I passi si accendono uno dopo l'altro; con "riduci movimento" restano tutti fermi
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setActive((a) => (a + 1) % steps.length), 2600)
    return () => clearInterval(id)
  }, [steps.length])
  const safari26 = p.browser === 'safari' && (p.safariVersion ?? 26) >= 26
  return (
    <>
      <h1 className="m-0 mt-6 t-display text-[34px]">Aggiungila alla schermata Home</h1>
      <p className="m-0 mt-2.5 text-[15px] leading-normal text-ink-2">Revkeeper si usa come app. Bastano pochi tocchi, poi si apre dall'icona.</p>
      <ol className="-mx-3 mt-4 grid list-none gap-1.5 p-0">
        {steps.map((s, i) => (
          <li
            key={i}
            className={`flex items-center gap-3.5 rounded-2xl p-3 transition-[background-color,box-shadow] duration-300 ${i === active ? 'bg-surface shadow-[0_0_0_2px_var(--rk-ink)] dark:shadow-[0_0_0_2px_var(--rk-lime)]' : ''}`}
          >
            <span className={`grid size-[30px] shrink-0 place-items-center rounded-full t-num text-[17px] transition-colors duration-300 ${i === active ? 'bg-lime text-black' : 'bg-sunken text-ink-3'}`}>{i + 1}</span>
            <span className="flex-1 text-[15px] leading-snug">{s.text}</span>
            <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center rounded-full bg-ink text-bg">
              {s.chip}
              {i === active && <i key={active} className="absolute -inset-1.5 rounded-full border-2 border-lime-ink animate-[tap_1.2s_ease-out_300ms_both]" />}
            </span>
          </li>
        ))}
      </ol>
      <p className="m-0 mt-3.5 text-[13px] leading-normal text-ink-3">
        Non trovi <span className="text-ink-2">Aggiungi alla schermata Home</span>? Tocca <span className="text-ink-2">Modifica azioni</span> in fondo all'elenco. Se ancora non c'è, apri il sito direttamente in Safari.
      </p>
      {safari26 && (
        // punta al tasto "···" di Safari, che sta nella barra appena sotto la pagina
        <div className="pointer-events-none fixed bottom-[max(6px,env(safe-area-inset-bottom))] right-7" aria-hidden="true">
          <svg width="26" height="30" viewBox="0 0 26 30" fill="none" stroke="var(--rk-lime-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="animate-[bob_1.2s_ease-in-out_infinite]"><path d="M13 2v24M4 17l9 9 9-9" /></svg>
        </div>
      )}
    </>
  )
}

export const Install = ({ platform: p }: { platform: Platform }) => (
  <Shell>
    {p.os === 'android' ? (
      p.inApp ? <OpenElsewhere p={p} /> : <Android p={p} />
    ) : p.inApp || p.browser === 'opera' || p.browser === 'other' ? (
      <OpenElsewhere p={p} />
    ) : (
      <Iphone p={p} />
    )}
  </Shell>
)
