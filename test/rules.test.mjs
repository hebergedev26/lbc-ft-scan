import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAlerts, isListeBloquante, SEUIL_BLOQUANT, SEUIL_INFORMATIF } from '../shared/rules.js';

describe('isListeBloquante', () => {
  test('listes et types bloquants', () => {
    assert.equal(isListeBloquante('ONU'), true);
    assert.equal(isListeBloquante('UE'), true);
    assert.equal(isListeBloquante('terroriste'), true);
    assert.equal(isListeBloquante('financier'), true);
  });
  test('listes non bloquantes', () => {
    assert.equal(isListeBloquante('BCEAO'), false);
    assert.equal(isListeBloquante(''), false);
    assert.equal(isListeBloquante(undefined), false);
  });
});

describe('evaluateAlerts', () => {
  const sanctionTerroriste = {
    id: 'S1', nom: 'Diallo', prenom: 'Mamadou', date_naissance: '1975-01-30',
    liste: 'ONU', type: 'terroriste', motif: 'Financement du terrorisme', reference: 'ONU-2026-1001',
  };
  const ppe = {
    id: 'P1', nom: 'Diop', prenom: 'Moussa', date_naissance: '1980-05-14',
    liste: 'BCEAO', type: 'ppe', motif: 'Ancien ministre', reference: 'PPE-BCEAO-2026-01',
  };
  const sansLien = {
    id: 'P8', nom: 'Sow', prenom: 'Coumba', date_naissance: '1978-12-01',
    liste: 'BCEAO', type: 'ppe', motif: 'Directrice des Marches publics', reference: 'PPE-BCEAO-2026-05',
  };

  test('match exact sur liste terroriste -> bloquant', () => {
    const alerts = evaluateAlerts({ name: 'Mamadou Diallo' }, [sanctionTerroriste]);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].niveau, 'bloquant');
    assert.equal(alerts[0].score, 100);
    assert.equal(alerts[0].reference, 'ONU-2026-1001');
  });

  test('match fort sur liste ONU type financier -> bloquant', () => {
    const fin = { ...sanctionTerroriste, type: 'financier', liste: 'ONU', motif: 'Fraude financiere', reference: 'ONU-2026-1128' };
    const alerts = evaluateAlerts({ name: 'Mamadou Diallo' }, [fin]);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].niveau, 'bloquant');
  });

  test('match exact sur PPE -> informatif', () => {
    const alerts = evaluateAlerts({ name: 'Moussa Diop' }, [ppe]);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].niveau, 'informatif');
    assert.equal(alerts[0].score, 100);
  });

  test('aucune correspondance -> aucune alerte', () => {
    const alerts = evaluateAlerts({ name: 'Fatou Ndiaye' }, [sansLien]);
    assert.deepEqual(alerts, []);
  });

  test('tri par score decroissant', () => {
    const weak = { ...sanctionTerroriste, prenom: 'Lamine', nom: 'Diallo' };
    const alerts = evaluateAlerts({ name: 'Mamadou Diallo' }, [weak, sanctionTerroriste]);
    const scores = alerts.map((a) => a.score);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  });

  test('seuils exposes', () => {
    assert.equal(SEUIL_BLOQUANT, 85);
    assert.equal(SEUIL_INFORMATIF, 60);
  });
});
