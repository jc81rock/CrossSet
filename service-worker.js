const CACHE_NAME = "crossset-pwa-v71";

self.addEventListener("install", function(event) {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(nomes) {
        return Promise.all(
          nomes
            .filter(function(nome) { return nome !== CACHE_NAME; })
            .map(function(nome) { return caches.delete(nome); })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function(event) {
  const requisicao = event.request;

  if (requisicao.method !== "GET") {
    return;
  }

  const url = new URL(requisicao.url);
  const mesmoDominio = url.origin === self.location.origin;
  const arquivoCritico =
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/style.css") ||
    url.pathname.endsWith("/service-worker.js");

  if (mesmoDominio && arquivoCritico) {
    event.respondWith(
      fetch(requisicao, { cache: "no-store" }).catch(function() {
        return fetch(requisicao);
      })
    );
  }
});
