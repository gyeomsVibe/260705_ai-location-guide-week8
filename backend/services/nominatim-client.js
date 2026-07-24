const DEFAULT_MIN_INTERVAL_MS = 1000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_CACHE_ENTRIES = 200;

function createAbortError() {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

function createNominatimClient({
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  maxCacheEntries = DEFAULT_MAX_CACHE_ENTRIES,
  now = Date.now,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  const cache = new Map();
  let queue = Promise.resolve();
  let lastStartedAt = Number.NEGATIVE_INFINITY;

  function readCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      cache.delete(key);
      return null;
    }
    cache.delete(key);
    cache.set(key, entry);
    return entry.payload;
  }

  function writeCache(key, payload) {
    cache.set(key, { payload, expiresAt: now() + cacheTtlMs });
    while (cache.size > maxCacheEntries) {
      cache.delete(cache.keys().next().value);
    }
  }

  async function execute(key, url, { fetchImpl, signal, headers }) {
    if (signal?.aborted) throw createAbortError();
    const cached = readCache(key);
    if (cached) return { ok: true, status: 200, payload: cached, fromCache: true };

    const waitMs = Math.max(0, lastStartedAt + minIntervalMs - now());
    if (waitMs > 0) await sleep(waitMs);
    if (signal?.aborted) throw createAbortError();
    lastStartedAt = now();

    const response = await fetchImpl(url, { signal, headers });
    if (!response.ok) return { ok: false, status: response.status, payload: null, fromCache: false };
    const payload = await response.json();
    writeCache(key, payload);
    return { ok: true, status: response.status, payload, fromCache: false };
  }

  function request(url, { fetchImpl = globalThis.fetch, signal, headers = {}, bypassQueue = false } = {}) {
    const key = String(url);
    if (bypassQueue) return execute(key, url, { fetchImpl, signal, headers });
    const scheduled = queue.then(
      () => execute(key, url, { fetchImpl, signal, headers }),
      () => execute(key, url, { fetchImpl, signal, headers }),
    );
    queue = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  return { request };
}

const nominatimClient = createNominatimClient();

module.exports = { createNominatimClient, nominatimClient };
