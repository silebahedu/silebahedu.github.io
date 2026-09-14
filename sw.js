const CACHE_NAME = 'silebah-image-v1';

// Install event
self.addEventListener('install', event => {
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event: Cache-First Strategy for Images
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = request.url;

    // Cache image requests (i.ibb.co.com, png, jpg, jpeg, webp, svg)
    if (
        request.method === 'GET' &&
        (url.includes('i.ibb.co.com') ||
         url.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i) ||
         request.destination === 'image')
    ) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async cache => {
                const cachedResponse = await cache.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (error) {
                    return cachedResponse || Response.error();
                }
            })
        );
    }
});
