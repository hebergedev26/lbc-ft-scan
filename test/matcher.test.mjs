import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize,
  levenshtein,
  soundex,
  tokenSimilarity,
  fullName,
  matchPerson,
  matchLevel,
} from '../shared/matcher.js';

describe('normalize', () => {
  test('minuscule, sans accents, espaces propres', () => {
    assert.equal(normalize('Mamadou ÉLOI'), 'mamadou eloi');
    assert.equal(normalize('  Jean  Paul,   DUPONT  '), 'jean paul dupont');
  });
  test('chaine vide et entrees non-string', () => {
    assert.equal(normalize(''), '');
    assert.equal(normalize(null), '');
    assert.equal(normalize(undefined), '');
    assert.equal(normalize(123), '123');
  });
});

describe('levenshtein', () => {
  test('cas de base', () => {
    assert.equal(levenshtein('', 'abc'), 3);
    assert.equal(levenshtein('abc', ''), 3);
    assert.equal(levenshtein('same', 'same'), 0);
    assert.equal(levenshtein('kitten', 'sitting'), 3);
  });
});

describe('soundex', () => {
  test('mots phonetiquement proches partagent le code', () => {
    assert.equal(soundex('Robert'), 'R163');
    assert.equal(soundex('Rupert'), 'R163');
    assert.equal(soundex('Ashcraft'), 'A261');
    assert.equal(soundex(''), '');
  });
});

describe('tokenSimilarity', () => {
  test('identiques = 1, texte vide = 1', () => {
    assert.equal(tokenSimilarity('diallo', 'diallo'), 1);
    assert.equal(tokenSimilarity('', ''), 1);
  });
  test('typo simple -> proche de 1', () => {
    const s = tokenSimilarity('diallo', 'dialo');
    assert.ok(s >= 0.8 && s < 1, `attendu ~0.83, obtenu ${s}`);
  });
  test('retombe sur Soundex quand Levenshtein faible', () => {
    assert.ok(tokenSimilarity('sight', 'site') >= 0.4);
  });
});

describe('fullName', () => {
  test('priorise le champ name, sinon prenom + nom', () => {
    assert.equal(fullName({ name: 'A B' }), 'A B');
    assert.equal(fullName({ nom: 'Diop', prenom: 'Moussa' }), 'Moussa Diop');
    assert.equal(fullName({ nom: 'Diop' }), 'Diop');
  });
});

describe('matchPerson', () => {
  test('correspondance exacte -> 100', () => {
    const r = matchPerson({ name: 'Mamadou Diallo' }, { nom: 'Diallo', prenom: 'Mamadou' });
    assert.equal(r.score, 100);
    assert.equal(r.partial, true);
    assert.deepEqual(r.matchedTokens, ['mamadou', 'diallo']);
  });

  test('petite faute de frappe -> score eleve', () => {
    const r = matchPerson({ name: 'Mamadou Dialo' }, { nom: 'Diallo', prenom: 'Mamadou' });
    assert.ok(r.score >= 88 && r.score <= 96, `score=${r.score}`);
  });

  test('homonyme a tokens supplementaires (Diop vs Diop-Sow) -> 87', () => {
    const r = matchPerson({ name: 'Moussa Diop' }, { nom: 'Diop-Sow', prenom: 'Moussa' });
    assert.equal(r.score, 87);
    assert.deepEqual(r.matchedTokens, ['moussa', 'diop']);
    assert.equal(r.partial, true);
  });

  test('pas de correspondance -> 0', () => {
    const r = matchPerson({ name: 'Koffi Mensah' }, { nom: 'Ndiaye', prenom: 'Fatou' });
    assert.equal(r.score, 0);
    assert.deepEqual(r.matchedTokens, []);
  });

  test('DOB identique -> bonus +8 (borne a 100)', () => {
    const r = matchPerson(
      { name: 'Mamadou Diallo', dob: '1975-01-30' },
      { nom: 'Diallo', prenom: 'Mamadou', date_naissance: '1975-01-30' }
    );
    assert.equal(r.score, 100);
    assert.equal(r.details.exactDob, true);
    assert.equal(r.details.bonus, 8);
  });

  test('DOB differente sur score fort -> -10', () => {
    const r = matchPerson(
      { name: 'Mamadou Diallo', dob: '1980-06-01' },
      { nom: 'Diallo', prenom: 'Mamadou', date_naissance: '1975-01-30' }
    );
    assert.equal(r.score, 90);
    assert.equal(r.details.bonus, -10);
  });

  test('pas de DOB -> pas de bonus', () => {
    const r = matchPerson({ name: 'Mamadou Diallo' }, { nom: 'Diallo', prenom: 'Mamadou' });
    assert.equal(r.details.bonus, 0);
  });
});

describe('matchLevel', () => {
  test('seuils', () => {
    assert.equal(matchLevel(100), 'fort');
    assert.equal(matchLevel(85), 'fort');
    assert.equal(matchLevel(84), 'probable');
    assert.equal(matchLevel(77, false), 'probable');
    assert.equal(matchLevel(60, true), 'probable');
    assert.equal(matchLevel(60, false), 'aucun');
    assert.equal(matchLevel(50, true), 'faible');
    assert.equal(matchLevel(50, false), 'aucun');
    assert.equal(matchLevel(20), 'aucun');
  });
});
