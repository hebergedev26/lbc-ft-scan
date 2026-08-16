import { matchPerson } from '../../../shared/matcher.js';
import { evaluateAlerts, clientMatchLevel } from '../../../shared/rules.js';
import { cacheSanctions, cacheClients, getCachedSanctions, getCachedPpe, getCachedClients } from './offline.js';
let lastSync = null;

function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function searchClient(name, dob) {
  const params = new URLSearchParams({ q: name });
  if (dob) params.set('dob', dob);
  try {
    const res = await withTimeout(fetch(`/api/search?${params}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ...data, offline: false };
  } catch {
    return offlineSearch(name, dob);
  }
}

export async function getClientProfile(id) {
  try {
    const res = await withTimeout(fetch(`/api/client/${id}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { client: await res.json(), offline: false };
  } catch {
    const clients = await getCachedClients();
    const client = clients.find((c) => c.id === id);
    if (!client) return { client: null, offline: true };
    const totalSolde = (client.comptes || []).reduce((s, a) => s + a.solde, 0);
    return { client: { ...client, totalSolde, nbComptes: client.comptes?.length || 0 }, offline: true };
  }
}

async function offlineSearch(name, dob) {
  const query = { name, dob: dob || null };
  const [cachedClients, sanctions, ppe] = await Promise.all([
    _clients || getCachedClients(),
    _sanctions || getCachedSanctions(),
    _ppe || getCachedPpe(),
  ]);
  const foundClients = [];
  for (const c of cachedClients) {
    const res = matchPerson(query, c);
    if (res.score >= 45) {
      foundClients.push({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        date_naissance: c.date_naissance,
        score: res.score,
        niveau: clientMatchLevel(res.score, res.partial),
      });
    }
  }
  foundClients.sort((a, b) => b.score - a.score);

  const alerts = evaluateAlerts(query, [...sanctions, ...ppe]);

  return {
    query,
    clients: foundClients,
    alerts,
    timeMs: 0,
    offline: true,
    depuisCache: lastSync,
  };
}

let _clients = null;
let _sanctions = null;
let _ppe = null;
let _apiReachable = null;

export function isApiReachable() {
  return _apiReachable;
}

async function tryFetchJson(url, timeoutMs = 12000) {
  try {
    const res = await withTimeout(fetch(url), timeoutMs);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function hydrateCache() {
  let online = false;

  if (navigator.onLine) {
    for (let attempt = 0; attempt < 3 && !online; attempt++) {
      const timeoutMs = attempt === 0 ? 25000 : 40000;
      const [sanctions, ppe, clients] = await Promise.all([
        tryFetchJson('/api/sanctions', timeoutMs),
        tryFetchJson('/api/clients/full', timeoutMs),
      ]);
      if (sanctions && clients) {
        _sanctions = sanctions.sanctions;
        _ppe = sanctions.ppe;
        _clients = clients;
        try {
          await cacheSanctions(sanctions.sanctions, sanctions.ppe);
          await cacheClients(clients);
        } catch {
          /* le cache IDB reste dans les variables mémoire */
        }
        lastSync = new Date().toISOString();
        online = true;
      } else if (attempt < 2) {
        await sleep(4000);
      }
    }
  }

  _apiReachable = online;

  if (!online) {
    const [s, p, c] = await Promise.all([getCachedSanctions(), getCachedPpe(), getCachedClients()]);
    _sanctions = s;
    _ppe = p;
    _clients = c;
    lastSync = lastSync || 'cache local';
  }

  return online;
}

export async function getStats() {
  try {
    const res = await withTimeout(fetch('/api/stats'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { stats: await res.json(), offline: false };
  } catch {
    const clients = await getCachedClients();
    const sanctions = await getCachedSanctions();
    const ppe = await getCachedPpe();
    const totalSolde = clients.reduce((s, c) => s + (c.totalSolde || 0), 0);
    return {
      stats: {
        totalClients: clients.length,
        totalComptes: clients.reduce((s, c) => s + (c.comptes?.length || 0), 0),
        totalSolde,
        sanctions: sanctions.length,
        ppe: ppe.length,
        alertes: 0,
      },
      offline: true,
    };
  }
}

export async function getAlertHistory() {
  try {
    const res = await withTimeout(fetch('/api/alerts?limit=50'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { alerts: await res.json(), offline: false };
  } catch {
    return { alerts: [], offline: true };
  }
}
