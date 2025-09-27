// Pool Safe Inc Portal Service Worker
// Provides offline functionality and caching for PWA features

const CACHE_NAME = "poolsafe-portal-v1";
const STATIC_CACHE_NAME = "poolsafe-static-v1";
const DYNAMIC_CACHE_NAME = "poolsafe-dynamic-v1";

// Files to cache for offline functionality
const STATIC_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/index.css",
  "/assets/index.js",
  "/assets/logo.svg",
  // Add other static assets as they're created
];

// API endpoints to cache
const CACHE_API_ROUTES = [
  "/api/auth/me",
  "/api/dashboard/stats",
  "/api/partners",
  "/api/tickets",
  "/api/users",
];

// Install event - cache static files
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static files");
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error("[SW] Error caching static files:", error);
      }),
  );

  // Skip waiting to activate new service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );

  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Handle different types of requests
  if (request.method === "GET") {
    if (isStaticAsset(request)) {
      // Cache First strategy for static assets
      event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(request)) {
      // Network First strategy for API requests
      event.respondWith(handleAPIRequest(request));
    } else {
      // Stale While Revalidate for pages
      event.respondWith(handlePageRequest(request));
    }
  }
});

// Handle static assets (CSS, JS, images, fonts)
function handleStaticAsset(request) {
  return caches
    .match(request)
    .then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((fetchResponse) => {
        if (fetchResponse.ok) {
          const responseClone = fetchResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return fetchResponse;
      });
    })
    .catch(() => {
      // Return offline fallback for images
      if (request.destination === "image") {
        return new Response(
          '<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="150" fill="#f0f0f0"/><text x="100" y="75" text-anchor="middle" fill="#999">Image Offline</text></svg>',
          { headers: { "Content-Type": "image/svg+xml" } },
        );
      }
    });
}

// Handle API requests with network-first strategy
function handleAPIRequest(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      return response;
    })
    .catch(() => {
      // Return cached version if network fails
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Return offline API response
        return new Response(
          JSON.stringify({
            error: "Offline",
            message: "This data is not available offline",
            offline: true,
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          },
        );
      });
    });
}

// Handle page requests with stale-while-revalidate
function handlePageRequest(request) {
  return caches.match(request).then((cachedResponse) => {
    const fetchPromise = fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If we have a cached version, return it
        if (cachedResponse) {
          return cachedResponse;
        }

        // Return offline fallback page
        return caches.match("/index.html");
      });

    // Return cached version immediately if available
    return cachedResponse || fetchPromise;
  });
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith("/api/") ||
    CACHE_API_ROUTES.some((route) => url.pathname.startsWith(route))
  );
}

// Background sync for form submissions when offline
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "ticket-submission") {
    event.waitUntil(syncTicketSubmissions());
  } else if (event.tag === "notification-read") {
    event.waitUntil(syncNotificationReads());
  }
});

// Sync offline ticket submissions
async function syncTicketSubmissions() {
  try {
    const cache = await caches.open("offline-submissions");
    const requests = await cache.keys();

    for (const request of requests) {
      if (request.url.includes("/api/tickets")) {
        try {
          const response = await cache.match(request);
          const data = await response.json();

          // Retry submission
          const retryResponse = await fetch("/api/tickets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          if (retryResponse.ok) {
            await cache.delete(request);
            console.log("[SW] Offline ticket submission synced");
          }
        } catch (error) {
          console.error("[SW] Error syncing ticket submission:", error);
        }
      }
    }
  } catch (error) {
    console.error("[SW] Error in syncTicketSubmissions:", error);
  }
}

// Sync offline notification reads
async function syncNotificationReads() {
  try {
    const cache = await caches.open("offline-notifications");
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
        console.log("[SW] Notification read synced");
      } catch (error) {
        console.error("[SW] Error syncing notification read:", error);
      }
    }
  } catch (error) {
    console.error("[SW] Error in syncNotificationReads:", error);
  }
}

// Push notification handling
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const options = {
    body: "You have new updates in Pool Safe Inc Portal",
    icon: "/assets/icon-192x192.png",
    badge: "/assets/badge-72x72.png",
    vibrate: [200, 100, 200],
    data: {
      url: "/",
    },
    actions: [
      {
        action: "view",
        title: "View Details",
        icon: "/assets/action-view.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/assets/action-dismiss.png",
      },
    ],
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data = { ...options.data, ...data };
  }

  event.waitUntil(self.registration.showNotification("Pool Safe Inc Portal", options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  if (event.action === "view") {
    const url = event.notification.data?.url || "/";
    event.waitUntil(self.clients.openWindow(url));
  }
});

// Handle notification close
self.addEventListener("notificationclose", (_event) => {
  console.log("[SW] Notification closed");
  // Track notification dismissal analytics here if needed
});

// Message handling for communication with main app
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data?.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  } else if (event.data?.type === "CACHE_URLS") {
    const { urls } = event.data;
    event.waitUntil(caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.addAll(urls)));
  }
});
