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

// ── Care Style ───────────────────────────────────────────
// Returns: { primary, secondary, scores: {}, pcts: {}, ranking: [] }

export function scoreCareStyle(answers) {
  const dimensions = ['emotional','practical','presence','autonomy'];
  const prefixes = {
    emotional: ['cs_em1','cs_em2','cs_em3','cs_em4'],
    practical:  ['cs_pr1','cs_pr2','cs_pr3','cs_pr4'],
    presence:   ['cs_ps1','cs_ps2','cs_ps3','cs_ps4'],
    autonomy:   ['cs_au1','cs_au2','cs_au3','cs_au4']
  };
  const scores = {};
  for (const dim of dimensions) {
    scores[dim] = mean(prefixes[dim].map(k => answers[k] || 3));
  }
  const ranking = [...dimensions].sort((a, b) => scores[b] - scores[a]);
  const pcts = {};
  for (const dim of dimensions) pcts[dim] = normalize(scores[dim], 1, 5);
  return { primary: ranking[0], secondary: ranking[1], scores, pcts, ranking };
}

// ── Core Values ───────────────────────────────────────────
// Returns: { primary, secondary, scores: {}, pcts: {}, ranking: [] }

export function scoreCoreValues(answers) {
  const dimensions = ['security','freedom','achievement','connection','growth'];
  const prefixes = {
    security:    ['cv_sec1','cv_sec2','cv_sec3','cv_sec4'],
    freedom:     ['cv_fre1','cv_fre2','cv_fre3','cv_fre4'],
    achievement: ['cv_ach1','cv_ach2','cv_ach3','cv_ach4'],
    connection:  ['cv_con1','cv_con2','cv_con3','cv_con4'],
    growth:      ['cv_gr1','cv_gr2','cv_gr3','cv_gr4']
  };
  const scores = {};
  for (const dim of dimensions) {
    scores[dim] = mean(prefixes[dim].map(k => answers[k] || 3));
  }
  const ranking = [...dimensions].sort((a, b) => scores[b] - scores[a]);
  const pcts = {};
  for (const dim of dimensions) pcts[dim] = normalize(scores[dim], 1, 5);
  return { primary: ranking[0], secondary: ranking[1], scores, pcts, ranking };
}

// ── Conflict Style ───────────────────────────────────────
// Returns: { primary, secondary, scores: {}, pcts: {}, ranking: [] }

export function scoreConflictStyle(answers) {
  const dimensions = ['competing','collaborating','compromising','avoiding','accommodating'];
  const prefixes = {
    competing:      ['cs_comp1','cs_comp2','cs_comp3','cs_comp4','cs_comp5'],
    collaborating:  ['cs_coll1','cs_coll2','cs_coll3','cs_coll4','cs_coll5'],
    compromising:   ['cs_comp6','cs_comp7','cs_comp8','cs_comp9','cs_comp10'],
    avoiding:       ['cs_avoi1','cs_avoi2','cs_avoi3','cs_avoi4','cs_avoi5'],
    accommodating:  ['cs_acco1','cs_acco2','cs_acco3','cs_acco4','cs_acco5']
  };

  const scores = {};
  for (const dim of dimensions) {
    const keys = prefixes[dim];
    scores[dim] = mean(keys.map(k => answers[k] || 3));
  }

  const ranking = [...dimensions].sort((a, b) => scores[b] - scores[a]);
  const pcts = {};
  for (const dim of dimensions) {
    pcts[dim] = normalize(scores[dim], 1, 5);
  }

  return {
    primary: ranking[0],
    secondary: ranking[1],
    scores,
    pcts,
    ranking
  };
}

// ── Apology Languages ────────────────────────────────────
// Returns: { primary, secondary, scores: {}, pcts: {}, ranking: [] }

export function scoreApologyLanguages(answers) {
  const dimensions = ['regret','responsibility','restitution','repentance','forgiveness'];
  const prefixes = {
    regret:         ['ap_reg1','ap_reg2','ap_reg3'],
    responsibility: ['ap_res1','ap_res2','ap_res3'],
    restitution:    ['ap_rest1','ap_rest2','ap_rest3'],
    repentance:     ['ap_rep1','ap_rep2','ap_rep3'],
    forgiveness:    ['ap_for1','ap_for2','ap_for3']
  };

  const scores = {};
  for (const dim of dimensions) {
    const keys = prefixes[dim];
    scores[dim] = mean(keys.map(k => answers[k] || 3));
  }

  const ranking = [...dimensions].sort((a, b) => scores[b] - scores[a]);
  const pcts = {};
  for (const dim of dimensions) {
    pcts[dim] = normalize(scores[dim], 1, 5);
  }

  return {
    primary: ranking[0],
    secondary: ranking[1],
    scores,
    pcts,
    ranking
  };
}

// ── All Tests Dispatcher ──────────────────────────────────

export function scoreTest(testId, answers) {
  switch (testId) {
    case 'attachment':      return scoreAttachment(answers);
    case 'loveLanguages':   return scoreLoveLanguages(answers);
    case 'bigFive':         return scoreBigFive(answers);
    case 'communication':   return scoreCommunication(answers);
    case 'conflictStyle':   return scoreConflictStyle(answers);
    case 'apologyLanguages':return scoreApologyLanguages(answers);
    case 'careStyle':       return scoreCareStyle(answers);
    case 'coreValues':      return scoreCoreValues(answers);
    default: throw new Error(`Unknown test: ${testId}`);
  }
}
