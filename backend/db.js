import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

export function loadData() {
  return {
    sanctions: JSON.parse(readFileSync(join(DATA_DIR, 'sanctions.json'), 'utf8')),
    ppe: JSON.parse(readFileSync(join(DATA_DIR, 'ppe.json'), 'utf8')),
    clients: JSON.parse(readFileSync(join(DATA_DIR, 'clients.json'), 'utf8')),
  };
}

export function createDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sanctions (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT,
      liste TEXT NOT NULL,
      type TEXT NOT NULL,
      motif TEXT,
      risque TEXT,
      reference TEXT
    );
    CREATE TABLE IF NOT EXISTS ppe (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT,
      liste TEXT NOT NULL,
      type TEXT NOT NULL,
      motif TEXT,
      risque TEXT,
      reference TEXT
    );
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT,
      sexe TEXT,
      telephone TEXT,
      adresse TEXT,
      profession TEXT
    );
    CREATE TABLE IF NOT EXISTS comptes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      numero TEXT NOT NULL,
      type TEXT NOT NULL,
      solde INTEGER NOT NULL,
      devise TEXT NOT NULL,
      date_ouverture TEXT,
      statut TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
    CREATE TABLE IF NOT EXISTS alert_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT,
      niveau TEXT NOT NULL,
      liste TEXT,
      type TEXT,
      nom_match TEXT,
      score INTEGER NOT NULL,
      motif TEXT,
      reference TEXT,
      date_creation TEXT NOT NULL
    );
  `);
  return db;
}

export function seed(db, data) {
  const insertSanction = db.prepare(`
    INSERT OR REPLACE INTO sanctions (id, nom, prenom, date_naissance, liste, type, motif, risque, reference)
    VALUES (@id, @nom, @prenom, @date_naissance, @liste, @type, @motif, @risque, @reference)
  `);
  const insertPpe = db.prepare(`
    INSERT OR REPLACE INTO ppe (id, nom, prenom, date_naissance, liste, type, motif, risque, reference)
    VALUES (@id, @nom, @prenom, @date_naissance, @liste, @type, @motif, @risque, @reference)
  `);
  const insertClient = db.prepare(`
    INSERT OR REPLACE INTO clients (id, nom, prenom, date_naissance, sexe, telephone, adresse, profession)
    VALUES (@id, @nom, @prenom, @date_naissance, @sexe, @telephone, @adresse, @profession)
  `);
  const insertCompte = db.prepare(`
    INSERT OR REPLACE INTO comptes (client_id, numero, type, solde, devise, date_ouverture, statut)
    VALUES (@client_id, @numero, @type, @solde, @devise, @date_ouverture, @statut)
  `);

  const tx = db.transaction(() => {
    db.exec('DELETE FROM sanctions; DELETE FROM ppe; DELETE FROM comptes; DELETE FROM clients;');
    for (const s of data.sanctions) insertSanction.run(s);
    for (const p of data.ppe) insertPpe.run(p);
    for (const c of data.clients) {
      insertClient.run(c);
      for (const a of c.comptes) {
        insertCompte.run({ ...a, client_id: c.id });
      }
    }
  });
  tx();

  const counts = {
    sanctions: db.prepare('SELECT COUNT(*) AS n FROM sanctions').get().n,
    ppe: db.prepare('SELECT COUNT(*) AS n FROM ppe').get().n,
    clients: db.prepare('SELECT COUNT(*) AS n FROM clients').get().n,
    comptes: db.prepare('SELECT COUNT(*) AS n FROM comptes').get().n,
  };
  return counts;
}

export function querySanctions(db) {
  return db.prepare('SELECT * FROM sanctions').all();
}

export function queryPpe(db) {
  return db.prepare('SELECT * FROM ppe').all();
}

export function queryClients(db) {
  return db.prepare('SELECT * FROM clients ORDER BY nom, prenom').all();
}

export function queryComptes(db, clientId) {
  return db.prepare('SELECT * FROM comptes WHERE client_id = ? ORDER BY id').all(clientId);
}

export function queryClient(db, id) {
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
}

export function insertAlert(db, alert) {
  return db.prepare(`
    INSERT INTO alert_history (nom, prenom, date_naissance, niveau, liste, type, nom_match, score, motif, reference, date_creation)
    VALUES (@nom, @prenom, @date_naissance, @niveau, @liste, @type, @nom_match, @score, @motif, @reference, @date_creation)
  `).run(alert);
}

export function queryAlertHistory(db, limit = 50) {
  return db.prepare('SELECT * FROM alert_history ORDER BY date_creation DESC, id DESC LIMIT ?').all(limit);
}
