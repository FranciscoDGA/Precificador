/**
 * Precificador Pro - Service Worker
 * Garante funcionamento 100% Offline no celular e desktop
 */

const CACHE_NAME = 'precificador-pro-v2.2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.html',
  './precificador-mercadolivre.html',
  './precificador-amazon.html',
  './precificador-shopee.html',
  './precificador-shein.html',
  './politica-de-privacidade.html',
  './termos-de-uso.html',
  './sobre.html',
  './contato.html',
  './manifest.json',
  './assets/css/main.css',
  './assets/css/landing.css',
  './assets/css/app.css',
  './assets/js/landing.js',
  './assets/js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// Instalação: Baixa os assets para o cache local
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Algum asset opcional falhou no cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação: Cache-First com fallback de rede
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna o cache e tenta atualizar em background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Se não está no cache, busca na rede
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Se estiver offline e pedir HTML, serve o app.html
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./app.html');
        }
      });
    })
  );
});
