/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
};

// ── Types for Background/Periodic Sync ──────────────────────────────────────
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}
interface PeriodicSyncEvent extends ExtendableEvent {
  readonly tag: string;
}
declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
    periodicsync: PeriodicSyncEvent;
  }
}

// ── Constants ──────────────────────────────────────────────────────────────
const PRECACHE = 'meditrack-precache-v1';
const RUNTIME  = 'meditrack-runtime-v1';
const BG_SYNC_TAG = 'meditrack-sync';
const PERIODIC_TAG = 'meditrack-periodic';

// VitePWA replaces this at build time with the actual precache manifest
const precacheManifest = self.__WB_MANIFEST;

// ── Install: precache all build assets ────────────────────────────────────
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => {
      const urls = precacheManifest.map((entry) =>
        typeof entry === 'string' ? entry : entry.url,
      );
      return cache.addAll(urls);
    }).then(() => self.skipWaiting()),
  );
});

// ── Activate: remove stale caches ─────────────────────────────────────────
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== PRECACHE && k !== RUNTIME)
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

// ── Fetch: stale-while-revalidate for same-origin, network-first for nav ──
self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigate = event.request.mode === 'navigate';

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && isSameOrigin) {
            const clone = response.clone();
            caches.open(RUNTIME).then((c) => c.put(event.request, clone));
          }
          return response;
        })
        .catch((): Response | Promise<Response | undefined> => {
          if (isNavigate) return caches.match('/index.html') as Promise<Response>;
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });

      // Return stale cache immediately while updating in background
      return cached ?? networked;
    }),
  );
});

// ── Background Sync ────────────────────────────────────────────────────────
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === BG_SYNC_TAG) {
    event.waitUntil(replaySyncQueue());
  }
});

async function replaySyncQueue(): Promise<void> {
  try {
    const db = await openSyncDB();
    const entries = await getAllFromDB(db);
    await Promise.all(
      entries.map(async (entry: SyncEntry) => {
        try {
          await fetch(entry.url, {
            method: entry.method,
            headers: entry.headers,
            body: entry.body ?? undefined,
          });
          await deleteFromDB(db, entry.id);
        } catch {
          // Will retry on next sync
        }
      }),
    );
  } catch {
    // IndexedDB unavailable – silently skip
  }
}

// ── Periodic Background Sync ──────────────────────────────────────────────
self.addEventListener('periodicsync', (event: PeriodicSyncEvent) => {
  if (event.tag === PERIODIC_TAG) {
    event.waitUntil(periodicRefresh());
  }
});

async function periodicRefresh(): Promise<void> {
  const cache = await caches.open(RUNTIME);
  const keys = await cache.keys();
  await Promise.allSettled(
    keys.map(async (req) => {
      try {
        const res = await fetch(req);
        if (res && res.status === 200) await cache.put(req, res);
      } catch {
        /* offline – keep stale */
      }
    }),
  );
}

// ── Push Notifications ────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; tag?: string; url?: string } = {
    title: 'Meditrack',
    body: 'You have a medicine reminder.',
  };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Meditrack', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag ?? 'meditrack-push',
      data: data.url ?? '/',
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url: string = event.notification.data ?? '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});

// ── IndexedDB helpers for sync queue ─────────────────────────────────────
interface SyncEntry {
  id: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('meditrack-sync', 1);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore('queue', {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

function getAllFromDB(db: IDBDatabase): Promise<SyncEntry[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly');
    const req = tx.objectStore('queue').getAll();
    req.onsuccess = (e) => resolve((e.target as IDBRequest<SyncEntry[]>).result);
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

function deleteFromDB(db: IDBDatabase, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const req = tx.objectStore('queue').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}
