// ============================================================
// SCORING ENGINE — Calcola i risultati di ogni test
// ============================================================

// ── Attachment Style ─────────────────────────────────────
// Returns: { avoidance: 0-7, anxiety: 0-7, style: 'secure'|'anxious'|'avoidant'|'fearful' }

export function scoreAttachment(answers) {
  // answers: { av1: 1-7, av2: 1-7, ... an1: 1-7, ... }
  const avKeys = ['av1','av2','av3','av4','av5','av6','av7','av8','av9','av10'];
  const anKeys = ['an1','an2','an3','an4','an5','an6','an7','an8','an9','an10'];

  const avoidanceScores = avKeys.map(k => answers[k] || 4);
  const anxietyScores   = anKeys.map(k => answers[k] || 4);

  const avoidanceMean = mean(avoidanceScores);
  const anxietyMean   = mean(anxietyScores);

  // Quadrant threshold: 3.5 on 1-7 scale
  const T = 3.5;
  let style;
  if (anxietyMean < T && avoidanceMean < T)  style = 'secure';
  else if (anxietyMean >= T && avoidanceMean < T)  style = 'anxious';
  else if (anxietyMean < T && avoidanceMean >= T)  style = 'avoidant';
  else style = 'fearful';

  return {
    avoidance: round(avoidanceMean, 2),
    anxiety:   round(anxietyMean, 2),
    style,
    // Normalized 0-100 for display
    avoidancePct: normalize(avoidanceMean, 1, 7),
    anxietyPct:   normalize(anxietyMean, 1, 7)
  };
}

// ── Love Languages ───────────────────────────────────────
// Returns: { primary: 'words'|'time'|'gifts'|'acts'|'touch', scores: {}, ranking: [] }

export function scoreLoveLanguages(answers) {
  const dimensions = ['words','time','gifts','acts','touch'];
  const scores = {};

  for (const dim of dimensions) {
    const keys = Object.keys(answers).filter(k => {
      // e.g. w1,w2,w3 → words
      const map = { w: 'words', t: 'time', g: 'gifts', a: 'acts', p: 'touch' };
      const prefix = k.replace(/\d+$/, '');
      return map[prefix] === dim;
    });
    scores[dim] = keys.length ? mean(keys.map(k => answers[k] || 1)) : 1;
  }

  const ranking = [...dimensions].sort((a, b) => scores[b] - scores[a]);
  const primary = ranking[0];

  // Normalize each to 0-100
  const pcts = {};
  for (const dim of dimensions) {
    pcts[dim] = normalize(scores[dim], 1, 5);
  }

  return { primary, secondary: ranking[1], scores, pcts, ranking };
}

// ── Big Five ─────────────────────────────────────────────
// Returns: { openness, conscientiousness, extraversion, agreeableness, neuroticism } (0-100)

export function scoreBigFive(answers) {
  const traits = ['openness','conscientiousness','extraversion','agreeableness','neuroticism'];
  const prefixes = { openness: 'o', conscientiousness: 'c', extraversion: 'e', agreeableness: 'ag', neuroticism: 'n' };
  const result = {};

  for (const trait of traits) {
    const prefix = prefixes[trait];
    const keys = Object.keys(answers).filter(k => k.startsWith(prefix));
    const rawMean = keys.length ? mean(keys.map(k => answers[k] || 3)) : 3;
    result[trait] = normalize(rawMean, 1, 5);
  }

  // Dominant trait
  const dominant = traits.reduce((a, b) => result[a] > result[b] ? a : b);

  return { ...result, dominant };
}

// ── Communication Style ──────────────────────────────────
// Returns: { rapportScore, reportScore, style: 'rapport'|'report'|'balanced', ratio: 0-100 }

export function scoreCommunication(answers) {
  const rapportKeys = ['rp1','rp2','rp3','rp4','rp5'];
  const reportKeys  = ['rt1','rt2','rt3','rt4','rt5'];

  const rapportMean = mean(rapportKeys.map(k => answers[k] || 3));
  const reportMean  = mean(reportKeys.map(k => answers[k] || 3));

  let style;
  const diff = rapportMean - reportMean;
  if (diff > 0.5)       style = 'rapport';
  else if (diff < -0.5) style = 'report';
  else                  style = 'balanced';

  // ratio: 0 = pure report, 100 = pure rapport
  const ratio = Math.round(normalize(rapportMean, 1, 5));

  return {
    rapportScore: round(rapportMean, 2),
    reportScore:  round(reportMean, 2),
    rapportPct:   normalize(rapportMean, 1, 5),
    reportPct:    normalize(reportMean, 1, 5),
    style,
    ratio
  };
}

// ── Utilities ─────────────────────────────────────────────

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function normalize(value, min, max) {
  return Math.round(((value - min) / (max - min)) * 100);
}

function round(value, decimals) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// ── All Tests Dispatcher ──────────────────────────────────

export function scoreTest(testId, answers) {
  switch (testId) {
    case 'attachment':    return scoreAttachment(answers);
    case 'loveLanguages': return scoreLoveLanguages(answers);
    case 'bigFive':       return scoreBigFive(answers);
    case 'communication': return scoreCommunication(answers);
    default: throw new Error(`Unknown test: ${testId}`);
  }
}
