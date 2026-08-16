export function normalize(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function tokenSimilarity(a, b) {
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  const dist = levenshtein(a, b);
  const levSim = 1 - dist / max;

  let soundexSim = 0;
  const sa = soundex(a);
  const sb = soundex(b);
  if (sa && sb && sa === sb) {
    soundexSim = 0.7;
  }
  return Math.max(levSim, soundexSim);
}

const SOUNDEX_MAP = {
  b: '1', f: '1', p: '1', v: '1',
  c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
  d: '3', t: '3',
  l: '4',
  m: '5', n: '5',
  r: '6',
};

export function soundex(word) {
  const w = normalize(word).replace(/[^a-z]/g, '');
  if (!w) return '';
  const first = w[0].toUpperCase();
  let code = first;
  let prevCode = SOUNDEX_MAP[first.toLowerCase()] || '';
  for (let i = 1; i < w.length && code.length < 4; i++) {
    const c = w[i];
    const codeChar = SOUNDEX_MAP[c] || '';
    if (codeChar && codeChar !== prevCode && c !== 'h' && c !== 'w') {
      code += codeChar;
    }
    if (!['h', 'w', 'a', 'e', 'i', 'o', 'u', 'y'].includes(c)) {
      prevCode = codeChar;
    }
  }
  return (code + '000').slice(0, 4);
}

function tokenize(name) {
  return normalize(name).split(' ').filter(Boolean);
}

export function fullName(person = {}) {
  if (person.name) return person.name;
  return [person.prenom, person.nom].filter(Boolean).join(' ');
}

export function matchPerson(query, candidate) {
  const qTokens = tokenize(query.name || '');
  const cTokens = tokenize(fullName(candidate));

  if (!qTokens.length || !cTokens.length) {
    return { score: 0, matchedTokens: [], partial: false };
  }

  const used = new Array(cTokens.length).fill(false);
  const matches = [];

  for (const qt of qTokens) {
    let best = -1;
    let bestIdx = -1;
    for (let j = 0; j < cTokens.length; j++) {
      if (used[j]) continue;
      const sim = tokenSimilarity(qt, cTokens[j]);
      if (sim >= 0.45 && sim > best) {
        best = sim;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) {
      used[bestIdx] = true;
      matches.push({ q: qt, c: cTokens[bestIdx], sim: best });
    }
  }

  const matchedLen = matches.reduce((s, m) => s + m.q.length * m.sim, 0);
  const totalLen = qTokens.reduce((s, t) => s + t.length, 0);
  const unmatchedLen = cTokens.reduce((s, t, i) => (used[i] ? s : s + t.length), 0);
  let score = totalLen + unmatchedLen * 0.5 ? (100 * matchedLen) / (totalLen + unmatchedLen * 0.5) : 0;

  let bonus = 0;
  if (query.dob && candidate.dob) {
    if (query.dob === candidate.dob) bonus += 8;
    else if (score >= 85) bonus -= 10;
  }

  const hasStrongToken = matches.some((m) => m.sim >= 0.85);
  const finalScore = Math.max(0, Math.min(100, Math.round(score + bonus)));

  return {
    score: finalScore,
    matchedTokens: matches.map((m) => m.c),
    partial: hasStrongToken,
    details: {
      raw: Math.round(score),
      bonus,
      exactDob: !!(query.dob && candidate.dob && query.dob === candidate.dob),
    },
  };
}

export function matchLevel(score, hasStrongToken = false) {
  if (score >= 85) return 'fort';
  if (score >= 60 && hasStrongToken) return 'probable';
  if (score >= 60 && score >= 75) return 'probable';
  if (score >= 50 && hasStrongToken) return 'faible';
  return 'aucun';
}
