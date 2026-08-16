# LBC-FT-Scan — Système de Filtrage, d'Alerte et de Surveillance Client (IMF)

Prototype de conformité **LBC/FT/FP** (Lutte contre le Blanchiment de Capitaux, le
Financement du Terrorisme et de la Prolifération) pour une Institution de
Microfinance (IMF). Thématique **01** — Hackathon 72h.

## Fonctionnalités

- **Scan client en < 1 s** : champ de recherche (nom/prénom + date de naissance optionnelle).
- **Solde consolidé** : profil client avec total de tous ses comptes (« M. X possède 2 comptes. Solde total : 2 500 000 FCFA »).
- **Alertes intelligentes** :
  - 🟢 Conforme — aucune correspondance.
  - 🟠 Informatif — Personne Politiquement Exposée (PPE) ou correspondance partielle.
  - 🔴 Bloquant — correspondance forte avec une liste de sanctions terroriste/financière.
- **Moteur de matching** : Levenshtein + Soundex, pondération par mots, tolérance aux fautes de frappe, gestion des homonymies (Diop vs Diop-Sow) et des dates de naissance.
- **Historique des alertes** persisté en base.
- **Offline First** : Service Worker (PWA) + IndexedDB + moteur de recherche local embarqué dans le navigateur.

## Architecture

```
┌──────────────┐   REST /api   ┌───────────────────────┐
│  React + Vite │ ───────────▶ │  Express (Node.js)     │
│  (PWA offline) │ ◀─────────── │  SQLite (better-sqlite3)│
└──────────────┘  (SW + IDB)   └───────────────────────┘
   shared/matcher.js (partagé : backend ET frontend offline)
```

- `backend/` : API Express + SQLite embarquée (`lbc-ft.db`).
- `frontend/` : React + Vite, Service Worker, IndexedDB.
- `shared/` : moteur de matching (Levenshtein + Soundex + pondération) utilisé côté serveur et côté client hors ligne.
- `backend/generate-data.js` : génère les données factices (`data/*.json`).

## Données de démo (100 % fictives)

| Recherche | Résultat attendu |
|---|---|
| `Mamadou Diallo` | Profil trouvé + 🔴 **bloquant** (liste ONU/UE terroriste) |
| `Moussa Diop` | Profil + 🟠 **informatif** (PPE BCEAO) + homonyme Diop-Sow à 87 % |
| `Moussa Diop-Sow` | Profil + 🟠 correspondance partielle (77 %) |
| `Aminata Toure` | Profil + 🟠 **informatif** (PPE) |
| `Fatou Ndiaye` | 🟢 conforme |

- 200 sanctions (ONU/UE/BCEAO) + 8 PPE + 5 clients × 2 comptes.

## Démarrage rapide

### 1. Backend (port 4000)

```bash
cd backend
npm install
npm start          # API sur http://localhost:4000
```

### 2. Frontend (port 5173) — mode développement

```bash
cd frontend
npm install
npm run dev        # UI sur http://localhost:5173 (proxy /api → :4000)
```

### 3. Mode production (une seule commande, démo offline)

```bash
cd frontend
npm run build      # génère dist/
cd ../backend
npm start          # sert l'API ET le frontend buildé sur http://localhost:4000
```

Test du mode hors ligne : ouvrez http://localhost:4000 en ligne une première
fois (le cache IndexedDB + Service Worker se remplissent), puis coupez le Wi-Fi
et relancez la recherche — elle fonctionne en local.

## API

| Endpoint | Description |
|---|---|
| `GET /api/search?q=Nom&dob=AAAA-MM-JJ` | Recherche : clients + alertes (score de correspondance) |
| `GET /api/client/:id` | Profil complet + comptes + solde consolidé |
| `GET /api/clients` / `GET /api/clients/full` | Liste clients (avec comptes pour le cache offline) |
| `GET /api/sanctions` | Liste des sanctions + PPE (pour le cache offline) |
| `GET /api/alerts?limit=50` | Historique des alertes |
| `GET /api/stats` | Indicateurs du tableau de bord |
| `GET /api/health` | État du service |

## Règles de matching (seuils)

- **Fort** : score ≥ 85 % → 🔴 bloquant si liste terroriste/financière, 🟠 sinon.
- **Probable** : 60–84 % (avec un token fort) → 🟠 à surveiller.
- **Faible / aucun** : < 60 % → 🟢.

Bonus +8 si date de naissance identique, pénalité −10 si nom exact mais DOB
différente. Token inattendu côté liste (ex. « Diop-Sow ») → pénalité qui évite
les faux positifs.
