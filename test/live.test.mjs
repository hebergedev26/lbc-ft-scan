import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.LIVE_URL || 'https://lbc-ft-scan.onrender.com';

describe('Site en ligne (E2E)', () => {
  const skip = process.env.LIVE !== '1';
  test('API : health', { skip }, async () => {
    const res = await fetch(`${BASE}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  test('API : stats conformes', { skip }, async () => {
    const res = await fetch(`${BASE}/api/stats`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.totalClients, 5);
    assert.equal(body.sanctions, 200);
    assert.equal(body.ppe, 8);
  });

  test('recherche Mamadou Diallo -> bloquant', { skip }, async () => {
    const res = await fetch(`${BASE}/api/search?q=Mamadou%20Diallo`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.alerts.some((a) => a.niveau === 'bloquant'));
  });

  test('recherche Moussa Diop -> informatif (PPE)', { skip }, async () => {
    const res = await fetch(`${BASE}/api/search?q=Moussa%20Diop`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.alerts.some((a) => a.reference === 'PPE-BCEAO-2026-01'));
  });

  test('recherche Fatou Ndiaye -> aucun resultat d\'alerte', { skip }, async () => {
    const res = await fetch(`${BASE}/api/search?q=Fatou%20Ndiaye`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.alerts, []);
  });

  test('page d\'accueil servie', { skip }, async () => {
    const res = await fetch(BASE);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('<!doctype html>') || html.includes('<div id="root">'));
  });
});
