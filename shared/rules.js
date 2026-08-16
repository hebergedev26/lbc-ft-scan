import { matchLevel, matchPerson } from './matcher.js';

export const THRESHOLDS = {
  FORT: 85,
  PROBABLE: 60,
  FAIBLE: 50,
};

export const SEUIL_BLOQUANT = THRESHOLDS.FORT;
export const SEUIL_INFORMATIF = THRESHOLDS.PROBABLE;

const LISTE_BLOQUANTE = new Set(['ONU', 'UE', 'terroriste', 'financier']);

export function isListeBloquante(liste) {
  const l = String(liste || '').toLowerCase();
  return LISTE_BLOQUANTE.has(l);
}

export function evaluateAlerts(query, records) {
  const alerts = [];
  for (const rec of records) {
    const res = matchPerson(query, rec);
    const level = matchLevel(res.score, res.partial);
    if (level === 'aucun' || level === 'faible') continue;

    const bloquante = isListeBloquante(rec.liste) || rec.type === 'terroriste';
    const niveau = level === 'fort' && bloquante ? 'bloquant' : 'informatif';

    alerts.push({
      niveau,
      liste: rec.liste,
      type: rec.type,
      nom: rec.nom,
      prenom: rec.prenom,
      date_naissance: rec.date_naissance || null,
      score: res.score,
      matchedTokens: res.matchedTokens,
      motif: rec.motif,
      reference: rec.reference,
      date: new Date().toISOString(),
    });
  }

  alerts.sort((a, b) => b.score - a.score);
  return alerts;
}

export function clientMatchLevel(score, partial) {
  return matchLevel(score, partial);
}
