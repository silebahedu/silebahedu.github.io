/**
 * SiLebah EDU - Automatic Instant Image Caching Engine
 * Caches external images (i.ibb.co.com, etc.) into localStorage as Base64 Data URIs
 * for 0ms instant loading on subsequent app launches.
 */

(function () {
    const CACHE_PREFIX = 'silebah_img_v1_';

    // Helper: Register Service Worker for Cache-First offline image loading
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(err => {
                console.log('ServiceWorker registration note:', err);
            });
        });
    }

    // Convert Blob to Base64 Data URI
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Save image to localStorage as Base64 Data URI
    async function cacheImage(url) {
        if (!url || !url.startsWith('http') || url.startsWith('data:')) return null;
        const cacheKey = CACHE_PREFIX + url;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) return cached;

            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) return null;
            const blob = await response.blob();
            const dataUri = await blobToBase64(blob);

            try {
                localStorage.setItem(cacheKey, dataUri);
            } catch (e) {
                // Quota exceeded protection: clear old image caches
                clearOldImageCache();
                try {
                    localStorage.setItem(cacheKey, dataUri);
                } catch (err) {
                    console.warn('LocalStorage full, skipping cache for:', url);
                }
            }
            return dataUri;
        } catch (e) {
            return null;
        }
    }

    // Clear oldest image caches if storage gets tight
    function clearOldImageCache() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                keys.push(key);
            }
        }
        // Remove first half of cached images
        keys.slice(0, Math.ceil(keys.length / 2)).forEach(k => localStorage.removeItem(k));
    }

    // Get cached Data URI synchronously if available
    function getCachedDataUri(url) {
        if (!url || !url.startsWith('http')) return null;
        return localStorage.getItem(CACHE_PREFIX + url);
    }

    // Apply cache to all images and data-img attributes
    function processElements() {
        // 1. Process <img> tags
        const images = document.querySelectorAll('img[src]');
        images.forEach(img => {
            const originalUrl = img.getAttribute('data-original-src') || img.src;
            if (originalUrl && originalUrl.startsWith('http')) {
                if (!img.getAttribute('data-original-src')) {
                    img.setAttribute('data-original-src', originalUrl);
                }
                const cached = getCachedDataUri(originalUrl);
                if (cached) {
                    img.src = cached;
                } else {
                    cacheImage(originalUrl).then(dataUri => {
                        if (dataUri) img.src = dataUri;
                    });
                }
            }
        });

        // 2. Process data-img attributes (personnel cards, modals)
        const dataImgElements = document.querySelectorAll('[data-img]');
        dataImgElements.forEach(el => {
            const originalUrl = el.getAttribute('data-original-img') || el.getAttribute('data-img');
            if (originalUrl && originalUrl.startsWith('http')) {
                if (!el.getAttribute('data-original-img')) {
                    el.setAttribute('data-original-img', originalUrl);
                }
                const cached = getCachedDataUri(originalUrl);
                if (cached) {
                    el.setAttribute('data-img', cached);
                } else {
                    cacheImage(originalUrl).then(dataUri => {
                        if (dataUri) el.setAttribute('data-img', dataUri);
                    });
                }
            }
        });

        // 3. Process <link rel="preload"> tags to pre-fetch & store into cache
        const preloads = document.querySelectorAll('link[rel="preload"][as="image"]');
        preloads.forEach(link => {
            const href = link.href;
            if (href && href.startsWith('http') && !getCachedDataUri(href)) {
                cacheImage(href);
            }
        });
    }

    // Run processing immediately & on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processElements);
    } else {
        processElements();
    }

    // Expose global helper for dynamic modals (bukaPopupPuskesmas, etc.)
    window.SilebahImageCache = {
        get: getCachedDataUri,
        cache: cacheImage,
        resolveUrl: function (url) {
            return getCachedDataUri(url) || url;
        }
    };
})();
