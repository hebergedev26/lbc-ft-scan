import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20240814);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const pad = (n) => String(n).padStart(2, '0');

function randomDob(minYear, maxYear) {
  const y = minYear + Math.floor(rand() * (maxYear - minYear + 1));
  const m = 1 + Math.floor(rand() * 12);
  const d = 1 + Math.floor(rand() * 28);
  return `${y}-${pad(m)}-${pad(d)}`;
}

const PRENOMS = [
  'Abdou', 'Awa', 'Bakary', 'Cheikh', 'Demba', 'Fatou', 'Ibrahim', 'Kadiatou',
  'Moussa', 'Mariama', 'Ousmane', 'Seydou', 'Aminata', 'Mamadou', 'Aissatou',
  'Ibrahima', 'Fanta', 'Souleymane', 'Modou', 'Khady', 'Yacine', 'Tidiane',
  'Astou', 'Boubacar', 'Coumba', 'Djibril', 'Mame', 'Ndeye', 'Pape', 'Serigne',
  'Rokhaya', 'Adama', 'Salif', 'Youssouph', 'Omar', 'Hawa', 'Lamine', 'Alassane',
];

const NOMS = [
  'Diop', 'Ndiaye', 'Sow', 'Diallo', 'Ba', 'Fall', 'Sall', 'Sy', 'Diagne',
  'Gueye', 'Cisse', 'Faye', 'Mbaye', 'Kane', 'Traore', 'Kone', 'Bamba',
  'Ouattara', 'Konate', 'Sangare', 'Sanogo', 'Coulibaly', 'Doumbia', 'Keita',
  'Toure', 'Camara', 'Barry', 'Bah', 'Kourouma', 'Conde', 'Sylla', 'Cissoko',
  'Dabo', 'Doucoure', 'Sidibe', 'Sacko', 'Sissoko', 'Kanté', 'Bodian', 'Gomis',
];

const PRENOMS_INT = ['Viktor', 'Alexei', 'Dmitri', 'Sergei', 'Maria', 'John', 'Hassan', 'Ali', 'Fatima', 'Mehdi', 'Ivan', 'Natalia'];
const NOMS_INT = ['Antonov', 'Petrov', 'Volkov', 'Garcia', 'Smith', 'Al-Farouk', 'Karimi', 'Hassani', 'Novikov', 'Rahmani'];

const MOTIFS = {
  terroriste: [
    'Financement du terrorisme - Reseau Al-Qaida',
    'Membre d\'un groupe arme designe',
    'Soutien financier au terrorisme international',
  ],
  proliferation: [
    'Proliferation d\'armes de destruction massive',
    'Participation a un programme nucleaire non declare',
  ],
  financier: [
    'Blanchiment de capitaux',
    'Financement de la criminalite organisee',
    'Fraude financiere internationale',
  ],
  corruption: [
    'Detournement de fonds publics',
    'Corruption d\'agents publics',
  ],
  trafic: [
    'Trafic de stupefiants',
    'Traite des personnes',
  ],
};

const REF_PREFIX = { ONU: 'ONU', UE: 'UE', BCEAO: 'BCEAO' };

function buildSanctions() {
  const sanctions = [];
  let seq = 1000;
  const nb = 200;

  const demo = [
    {
      nom: 'Diallo', prenom: 'Mamadou', date_naissance: '1975-01-30',
      liste: 'ONU', type: 'terroriste', motif: 'Financement du terrorisme - Reseau Al-Qaida', risque: 'critique',
    },
    {
      nom: 'Diallo', prenom: 'Mamadou', date_naissance: null,
      liste: 'UE', type: 'terroriste', motif: 'Membre d\'un groupe arme designe', risque: 'critique',
    },
    {
      nom: 'Antonov', prenom: 'Viktor', date_naissance: '1962-07-11',
      liste: 'ONU', type: 'proliferation', motif: 'Proliferation d\'armes de destruction massive', risque: 'haut',
    },
    {
      nom: 'Al-Farouk', prenom: 'Hassan', date_naissance: '1970-03-02',
      liste: 'UE', type: 'financier', motif: 'Blanchiment de capitaux', risque: 'haut',
    },
  ];

  for (const d of demo) sanctions.push({ id: `SAN-${seq++}`, ...d, reference: `${REF_PREFIX[d.liste]}-2026-${pad(seq)}`, demo: true });

  const types = ['terroriste', 'terroriste', 'financier', 'financier', 'proliferation', 'trafic', 'corruption'];
  const listes = ['ONU', 'UE', 'BCEAO', 'ONU', 'UE', 'BCEAO'];

  while (sanctions.length < nb) {
    const useIntl = chance(0.12);
    const nom = useIntl ? pick(NOMS_INT) : pick(NOMS);
    const prenom = useIntl ? pick(PRENOMS_INT) : pick(PRENOMS);
    const type = pick(types);
    const liste = pick(listes);
    sanctions.push({
      id: `SAN-${seq++}`,
      nom,
      prenom,
      date_naissance: chance(0.7) ? randomDob(1960, 1995) : null,
      liste,
      type,
      motif: pick(MOTIFS[type] || MOTIFS.financier),
      risque: type === 'terroriste' ? 'critique' : pick(['haut', 'moyen']),
      reference: `${REF_PREFIX[liste]}-2026-${pad(seq)}`,
    });
  }

  return sanctions;
}

function buildPpe() {
  const base = [
    ['Diop', 'Moussa', '1980-05-14', 'Ancien ministre de l\'Economie et des Finances'],
    ['Toure', 'Aminata', '1992-11-03', 'Directrice Generale d\'une banque publique'],
    ['Ndiaye', 'Ibrahima', '1968-04-21', 'Membre du Parlement - Commission des Finances'],
    ['Ba', 'Abdou', '1972-09-09', 'Directeur de la Douane nationale'],
    ['Sow', 'Coumba', '1978-12-01', 'Directrice des Marches publics'],
    ['Kane', 'Ousmane', '1965-06-17', 'Secretaire d\'Etat aux Investissements'],
    ['Sall', 'Boubacar', '1970-10-30', 'Gouverneur adjoint de banque centrale'],
    ['Gueye', 'Awa', '1985-02-25', 'Maire d\'une commune de la capitale'],
  ];
  return base.map(([nom, prenom, date_naissance, motif], i) => ({
    id: `PPE-${pad(i + 1)}`,
    nom,
    prenom,
    date_naissance,
    liste: 'BCEAO',
    type: 'ppe',
    motif,
    risque: 'moyen',
    reference: `PPE-BCEAO-2026-${pad(i + 1)}`,
  }));
}

function buildClients() {
  return [
    {
      id: 'CLI-0001',
      nom: 'Diop', prenom: 'Moussa', date_naissance: '1980-05-14',
      sexe: 'M', telephone: '+221 77 123 45 67', adresse: 'Medina, Dakar',
      profession: 'Commercant',
      comptes: [
        { numero: 'SN-001-2345-01', type: 'Epargne', solde: 1850000, devise: 'FCFA', date_ouverture: '2019-04-12', statut: 'actif' },
        { numero: 'SN-001-2345-02', type: 'Compte courant', solde: 650000, devise: 'FCFA', date_ouverture: '2021-08-03', statut: 'actif' },
      ],
    },
    {
      id: 'CLI-0002',
      nom: 'Diallo', prenom: 'Mamadou', date_naissance: '1975-01-30',
      sexe: 'M', telephone: '+221 70 555 22 11', adresse: 'Rufisque',
      profession: 'Importateur',
      comptes: [
        { numero: 'SN-002-3456-01', type: 'Compte courant', solde: 3200000, devise: 'FCFA', date_ouverture: '2018-02-20', statut: 'actif' },
        { numero: 'SN-002-3456-02', type: 'Epargne', solde: 800000, devise: 'FCFA', date_ouverture: '2020-06-15', statut: 'actif' },
      ],
    },
    {
      id: 'CLI-0003',
      nom: 'Toure', prenom: 'Aminata', date_naissance: '1992-11-03',
      sexe: 'F', telephone: '+221 76 888 99 00', adresse: 'Plateau, Dakar',
      profession: 'Directrice financiere',
      comptes: [
        { numero: 'SN-003-4567-01', type: 'Epargne', solde: 950000, devise: 'FCFA', date_ouverture: '2022-01-10', statut: 'actif' },
        { numero: 'SN-003-4567-02', type: 'Epargne', solde: 450000, devise: 'FCFA', date_ouverture: '2023-09-25', statut: 'actif' },
      ],
    },
    {
      id: 'CLI-0004',
      nom: 'Diop-Sow', prenom: 'Moussa', date_naissance: '1985-08-22',
      sexe: 'M', telephone: '+221 78 222 33 44', adresse: 'Parcelles Assainies',
      profession: 'Enseignant',
      comptes: [
        { numero: 'SN-004-5678-01', type: 'Compte courant', solde: 220000, devise: 'FCFA', date_ouverture: '2021-03-18', statut: 'actif' },
        { numero: 'SN-004-5678-02', type: 'Epargne', solde: 1300000, devise: 'FCFA', date_ouverture: '2022-11-05', statut: 'actif' },
      ],
    },
    {
      id: 'CLI-0005',
      nom: 'Ndiaye', prenom: 'Fatou', date_naissance: '1988-02-17',
      sexe: 'F', telephone: '+221 77 999 11 22', adresse: 'Thies',
      profession: 'Transformatrice de produits agricoles',
      comptes: [
        { numero: 'SN-005-6789-01', type: 'Epargne', solde: 150000, devise: 'FCFA', date_ouverture: '2020-12-01', statut: 'actif' },
        { numero: 'SN-005-6789-02', type: 'Credit', solde: -350000, devise: 'FCFA', date_ouverture: '2024-04-20', statut: 'actif' },
      ],
    },
  ];
}

const outDir = join(__dirname, 'data');
mkdirSync(outDir, { recursive: true });

const sanctions = buildSanctions();
const ppe = buildPpe();
const clients = buildClients();

writeFileSync(join(outDir, 'sanctions.json'), JSON.stringify(sanctions, null, 2));
writeFileSync(join(outDir, 'ppe.json'), JSON.stringify(ppe, null, 2));
writeFileSync(join(outDir, 'clients.json'), JSON.stringify(clients, null, 2));

console.log(`OK: ${sanctions.length} sanctions, ${ppe.length} PPE, ${clients.length} clients generes.`);
