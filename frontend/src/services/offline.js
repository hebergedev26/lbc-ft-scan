const DB_NAME = 'lbc-ft-cache';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sanctions')) db.createObjectStore('sanctions');
      if (!db.objectStoreNames.contains('ppe')) db.createObjectStore('ppe');
      if (!db.objectStoreNames.contains('clients')) db.createObjectStore('clients');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putAll(storeName, records) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const rec of records) store.put(rec, rec.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheSanctions(sanctions, ppe) {
  await putAll('sanctions', sanctions);
  await putAll('ppe', ppe);
}

export async function cacheClients(clients) {
  await putAll('clients', clients);
}

export async function getCachedSanctions() {
  return getAll('sanctions');
}

export async function getCachedPpe() {
  return getAll('ppe');
}

export async function getCachedClients() {
  return getAll('clients');
}

export async function hasCache() {
  try {
    const [sanctions, clients] = await Promise.all([getCachedSanctions(), getCachedClients()]);
    return sanctions.length > 0 && clients.length > 0;
  } catch {
    return false;
  }
}
