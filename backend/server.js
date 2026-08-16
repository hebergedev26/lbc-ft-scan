import { createDb, seed, loadData, querySanctions, queryPpe, queryClients, queryComptes, queryClient, insertAlert, queryAlertHistory } from './db.js';
import { matchPerson, matchLevel, normalize } from '../shared/matcher.js';
import { evaluateAlerts, clientMatchLevel } from '../shared/rules.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import cors from 'cors';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const data = loadData();
const db = createDb(join(__dirname, 'lbc-ft.db'));
seed(db, data);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'LBC-FT-Scan API', time: new Date().toISOString() });
});

app.get('/api/stats', (_req, res) => {
  const totalClients = db.prepare('SELECT COUNT(*) AS n FROM clients').get().n;
  const totalComptes = db.prepare('SELECT COUNT(*) AS n FROM comptes').get().n;
  const totalSolde = db.prepare('SELECT SUM(solde) AS s FROM comptes').get().s || 0;
  const sanctions = db.prepare('SELECT COUNT(*) AS n FROM sanctions').get().n;
  const ppe = db.prepare('SELECT COUNT(*) AS n FROM ppe').get().n;
  const alertes = db.prepare('SELECT COUNT(*) AS n FROM alert_history').get().n;
  res.json({ totalClients, totalComptes, totalSolde, sanctions, ppe, alertes });
});

function findClients(query, clients) {
  const results = [];
  for (const c of clients) {
    const res = matchPerson(query, c);
    if (res.score >= 45) {
      results.push({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        date_naissance: c.date_naissance,
        score: res.score,
        niveau: clientMatchLevel(res.score, res.partial),
      });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

app.get('/api/search', (req, res) => {
  const { q, dob } = req.query;
  if (!q || !normalize(q)) {
    return res.status(400).json({ error: 'Parametre "q" requis' });
  }
  const query = { name: q, dob: dob || null };

  const clients = queryClients(db);
  const sanctions = querySanctions(db);
  const ppe = queryPpe(db);

  const foundClients = findClients(query, clients);
  const alerts = evaluateAlerts(query, [...sanctions, ...ppe]);

  const now = new Date().toISOString();
  for (const a of alerts) {
    insertAlert(db, {
      nom: query.name || '',
      prenom: '',
      date_naissance: query.dob || null,
      niveau: a.niveau,
      liste: a.liste,
      type: a.type,
      nom_match: `${a.prenom} ${a.nom}`.trim(),
      score: a.score,
      motif: a.motif,
      reference: a.reference,
      date_creation: now,
    });
  }

  res.json({ query: { name: q, dob: dob || null }, clients: foundClients, alerts, timeMs: Date.now() });
});

app.get('/api/client/:id', (req, res) => {
  const client = queryClient(db, req.params.id);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  const comptes = queryComptes(db, client.id);
  const total = comptes.reduce((s, a) => s + a.solde, 0);
  res.json({ ...client, comptes, totalSolde: total, nbComptes: comptes.length });
});

app.get('/api/clients', (_req, res) => {
  const clients = queryClients(db);
  res.json(clients);
});

app.get('/api/clients/full', (_req, res) => {
  const clients = queryClients(db).map((c) => {
    const comptes = queryComptes(db, c.id);
    return { ...c, comptes, totalSolde: comptes.reduce((s, a) => s + a.solde, 0) };
  });
  res.json(clients);
});

app.get('/api/sanctions', (_req, res) => {
  res.json({
    sanctions: querySanctions(db),
    ppe: queryPpe(db),
    generatedAt: new Date().toISOString(),
  });
});

app.get('/api/alerts', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  res.json(queryAlertHistory(db, limit));
});

const frontendDist = join(__dirname, '..', 'frontend', 'dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`LBC-FT-Scan API demarree sur http://localhost:${PORT}`);
  console.log(`  Base : SQLite (lbc-ft.db) | ${data.sanctions.length} sanctions | ${data.ppe.length} PPE | ${data.clients.length} clients`);
});
