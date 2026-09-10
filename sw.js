/**
 * Precificador Pro - Service Worker v3.0
 * Garante funcionamento Offline com suporte a Clean URLs da Vercel e navegação fluida
 */

const CACHE_NAME = 'precificador-pro-v4.0';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app',
  '/app.html',
  '/precificador-mercadolivre',
  '/precificador-mercadolivre.html',
  '/precificador-amazon',
  '/precificador-amazon.html',
  '/precificador-shopee',
  '/precificador-shopee.html',
  '/precificador-shein',
  '/precificador-shein.html',
  '/politica-de-privacidade',
  '/politica-de-privacidade.html',
  '/termos-de-uso',
  '/termos-de-uso.html',
  '/sobre',
  '/sobre.html',
  '/contato',
  '/contato.html',
  '/manifest.json',
  '/assets/css/main.css',
  '/assets/css/landing.css',
  '/assets/css/app.css',
  '/assets/js/landing.js',
  '/assets/js/app.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon.svg'
];

// Instalação: Cacheia os recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa caches legados imediatamente
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

// Interceptação inteligente
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Navegação de Páginas (HTML / Clicar em links / Voltar no histórico)
  // Estratégia: Network-First (NUNCA bloqueia redirects da Vercel e evita tela branca)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Se obteve resposta com sucesso, atualiza o cache
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Se estiver OFFLINE, busca no cache por variações da URL
          const cache = await caches.open(CACHE_NAME);
          const cached = (await cache.match(event.request)) ||
                         (await cache.match(url.pathname)) ||
                         (await cache.match(url.pathname + '.html')) ||
                         (await cache.match('/app.html')) ||
                         (await cache.match('/index.html'));
          if (cached) return cached;

          return new Response('<html><body style="background:#0b0f19;color:#fff;font-family:sans-serif;text-align:center;padding:50px;"><h2>Modo Offline</h2><p>Conecte-se à internet para carregar esta página pela primeira vez.</p><a href="/" style="color:#3b82f6;">Voltar ao Início</a></body></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 2. Assets Estáticos (CSS, JS, Imagens, Fontes): Cache-First com atualização em background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    })
  );
});
