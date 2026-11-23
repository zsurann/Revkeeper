// Caricato dal service worker di Workbox (importScripts): mostra le notifiche push
self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data && e.data.text() } }
  // iOS revoca l'iscrizione se una push non mostra una notifica: la mostriamo sempre
  e.waitUntil(self.registration.showNotification(d.title || 'Revkeeper', {
    body: d.body || 'Hai una scadenza',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png', // Android usa solo la trasparenza: sagoma bianca dell'arco
    tag: 'revkeeper-daily',
    data: { url: d.url || '/' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data.url
  // Finestra già aperta: in primo piano e alla pagina della notifica (navigate fallisce solo se non controllata: resta dov'è)
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) =>
    ws[0] ? ws[0].focus().then((w) => w.navigate(url)).catch(() => {}) : self.clients.openWindow(url)))
})
