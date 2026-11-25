import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { IgnitionMark } from './Mark'
import { ease } from './motion'

// Accensione all'apertura dell'app (una volta per sessione): il marchio fa il self-test del cruscotto e sfuma via.
// Con "riduci movimento" non compare.
const KEY = 'revkeeper.splash'
const seen = () => {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return true }
}

export const Splash = () => {
  const reduce = useReducedMotion()
  const [show, setShow] = useState(() => !seen() && !matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (!show) return
    try { sessionStorage.setItem(KEY, '1') } catch { /* si rivede alla prossima apertura */ }
    const t = setTimeout(() => setShow(false), 2300) // tetto: anche se l'animazione non finisce
    return () => clearTimeout(t)
  }, [show])
  return (
    <AnimatePresence>
      {show && !reduce && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-bg"
          exit={{ opacity: 0, transition: { duration: 0.32, ease: ease.inOut } }}
          aria-hidden="true"
        >
          <div className="grid justify-items-center gap-5">
            <motion.div exit={{ scale: 0.92, transition: { duration: 0.3 } }}>
              <IgnitionMark size={128} onDone={() => setTimeout(() => setShow(false), 280)} />
            </motion.div>
            <motion.span className="t-display text-[26px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.42, ease: ease.out }}>
              revkeeper
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
