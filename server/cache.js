const store = new Map();

export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry.data;
}

export function setCache(key, data, ttlMs) {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearCache(prefix) {
  if (!prefix) { store.clear(); return; }
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
