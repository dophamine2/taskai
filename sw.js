self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'Tutor', {
      body: data.body || '',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%237B61FF"/><text x="50" y="68" font-size="50" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">T</text></svg>'
    })
  )
})
