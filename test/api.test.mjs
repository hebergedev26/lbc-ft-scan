import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Math.floor(20000 + Math.random() * 30000);
const BASE = `http://localhost:${PORT}`;
const DB_PATH = join(process.env.TEMP || '/tmp', `lbc-ft-test-${PORT}.db`);

let child;

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

before(async () => {
  for (const f of [`${DB_PATH}`, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    try { rmSync(f, { force: true }); } catch {}
  }
  child = spawn(process.execPath, ['server.js'], {
    cwd: join(__dirname, '..', 'backend'),
    env: { ...process.env, PORT: String(PORT), DB_PATH },
    stdio: 'ignore',
  });

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Le serveur de test ne demarre pas');
});

after(() => {
  if (child) child.kill();
});

describe('API', () => {
  test('GET /api/health -> ok', async () => {
    const { status, body } = await getJson('/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'LBC-FT-Scan API');
  });

  test('GET /api/stats -> chiffres du jeu de donnees', async () => {
    const { status, body } = await getJson('/api/stats');
    assert.equal(status, 200);
    assert.equal(body.totalClients, 5);
    assert.equal(body.totalComptes, 10);
    assert.equal(body.totalSolde, 9220000);
    assert.equal(body.sanctions, 200);
    assert.equal(body.ppe, 8);
    assert.ok(typeof body.alertes === 'number' && body.alertes >= 0);
  });

  test('GET /api/search?q=Mamadou Diallo -> client + alerte bloquante', async () => {
    const { status, body } = await getJson('/api/search?q=Mamadou%20Diallo');
    assert.equal(status, 200);
    const client = body.clients.find((c) => c.id === 'CLI-0002');
    assert.ok(client, 'CLI-0002 present');
    assert.equal(client.score, 100);
    assert.equal(client.niveau, 'fort');
    const bloquant = body.alerts.find((a) => a.niveau === 'bloquant');
    assert.ok(bloquant, 'au moins une alerte bloquante');
    assert.ok(['ONU', 'UE'].includes(bloquant.liste));
    assert.equal(bloquant.type, 'terroriste');
  });

  test('GET /api/search?q=Moussa Diop -> alerte PPE informative + homonyme', async () => {
    const { status, body } = await getJson('/api/search?q=Moussa%20Diop');
    assert.equal(status, 200);
    const ppe = body.alerts.find((a) => a.reference === 'PPE-BCEAO-2026-01');
    assert.ok(ppe, 'alerte PPE BCEAO presente');
    assert.equal(ppe.niveau, 'informatif');
    assert.equal(ppe.score, 100);
    const homonyme = body.clients.find((c) => c.id === 'CLI-0004');
    assert.ok(homonyme, 'homonyme Diop-Sow present');
    assert.equal(homonyme.score, 87);
  });

  test('GET /api/search?q=Aminata Toure -> alerte PPE informative', async () => {
    const { status, body } = await getJson('/api/search?q=Aminata%20Toure');
    assert.equal(status, 200);
    const ppe = body.alerts.find((a) => a.reference === 'PPE-BCEAO-2026-02');
    assert.ok(ppe, 'alerte PPE Aminata Toure presente');
    assert.equal(ppe.niveau, 'informatif');
  });

  test('GET /api/search?q=Fatou Ndiaye -> aucune alerte (cas vert)', async () => {
    const { status, body } = await getJson('/api/search?q=Fatou%20Ndiaye');
    assert.equal(status, 200);
    assert.deepEqual(body.alerts, []);
    const client = body.clients.find((c) => c.id === 'CLI-0005');
    assert.ok(client, 'CLI-0005 present');
  });

  test('GET /api/search sans q -> 400', async () => {
    const { status, body } = await getJson('/api/search');
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  test('GET /api/client/:id -> comptes et solde consolide', async () => {
    const { status, body } = await getJson('/api/client/CLI-0002');
    assert.equal(status, 200);
    assert.equal(body.nom, 'Diallo');
    assert.equal(body.nbComptes, 2);
    assert.equal(body.totalSolde, 4000000);
    assert.equal(body.comptes.length, 2);
  });

  test('GET /api/client/INCONNU -> 404', async () => {
    const { status } = await getJson('/api/client/CLI-9999');
    assert.equal(status, 404);
  });

  test('GET /api/clients -> 5 clients', async () => {
    const { status, body } = await getJson('/api/clients');
    assert.equal(status, 200);
    assert.equal(body.length, 5);
  });

  test('GET /api/clients/full -> comptes inclus', async () => {
    const { status, body } = await getJson('/api/clients/full');
    assert.equal(status, 200);
    assert.equal(body.length, 5);
    for (const c of body) {
      assert.ok(Array.isArray(c.comptes), `${c.id} a un tableau comptes`);
      assert.equal(c.totalSolde, c.comptes.reduce((s, a) => s + a.solde, 0));
    }
  });

  test('GET /api/sanctions -> 200 sanctions + 8 PPE', async () => {
    const { status, body } = await getJson('/api/sanctions');
    assert.equal(status, 200);
    assert.equal(body.sanctions.length, 200);
    assert.equal(body.ppe.length, 8);
    assert.ok(body.generatedAt);
  });

  test('GET /api/alerts -> historique (tableau)', async () => {
    const { status, body } = await getJson('/api/alerts?limit=5');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
  });
});
