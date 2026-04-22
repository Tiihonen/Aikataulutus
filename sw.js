// Työnjohtajan Työkalu — Service Worker
// Versio: 1.0.0
const CACHE = 'tyonjohtaja-v1';
const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Asenna ja välimuistita resurssit
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // Jos joku resurssi epäonnistuu, jatka silti
        return cache.add('./');
      });
    })
  );
  self.skipWaiting();
});

// Siivoa vanhat välimuistit
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Palvele pyyynnöt välimuistista (offline-first)
self.addEventListener('fetch', e => {
  // Ohita ei-GET-pyynnöt
  if (e.request.method !== 'GET') return;
  // Ohita API-kutsut
  if (e.request.url.includes('api.anthropic.com')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Välimuistita onnistuneet vastaukset
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline: palauta välimuistista tai tyhjä sivu
        return caches.match('./') || new Response('<h1>Offline</h1>', {headers: {'Content-Type': 'text/html'}});
      });
    })
  );
});

// Taustailmoitukset (push)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || '🏗️ Työnjohtajan Työkalu', {
      body: data.body || 'Uusi ilmoitus',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'default',
      data: data
    })
  );
});

// Ilmoituksen klikkaus → avaa sovellus
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('./');
    })
  );
});
