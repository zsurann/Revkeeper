// Applica il tema salvato prima del primo disegno (niente lampo bianco col tema Notte).
// File esterno perché la CSP non ammette script inline. Stessa logica di src/theme.ts.
(function () {
  try {
    var t = localStorage.getItem('revkeeper.theme')
    var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    var root = document.documentElement
    if (dark) root.classList.add('dark')
    root.style.colorScheme = dark ? 'dark' : 'light'
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? '#0B0D10' : '#F4F5F7')
  } catch (e) { /* senza localStorage resta il tema chiaro */ }
})()
