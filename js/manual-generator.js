// ============================================================
// MANUAL GENERATOR — Trasforma i punteggi in istruzioni operative
// ============================================================

let manualTemplates = null;
let currentLang = 'it';

export async function loadManualTemplates(lang) {
  currentLang = lang;
  const resp = await fetch(`./data/manual-${lang}.json`);
  manualTemplates = await resp.json();
  return manualTemplates;
}

// ── Main: Genera il "Manuale di Me" ──────────────────────

export function generateManual(testResults, lang = 'it') {
  if (!manualTemplates) throw new Error('Templates not loaded. Call loadManualTemplates() first.');

  const chapters = [];

  // CHAPTER 1: Attachment
  if (testResults.attachment) {
    chapters.push(generateAttachmentChapter(testResults.attachment));
  }

  // CHAPTER 2: Love Languages
  if (testResults.loveLanguages) {
    chapters.push(generateLoveLanguagesChapter(testResults.loveLanguages));
  }

  // CHAPTER 3: Big Five
  if (testResults.bigFive) {
    chapters.push(generateBigFiveChapter(testResults.bigFive));
  }

  // CHAPTER 4: Communication
  if (testResults.communication) {
    chapters.push(generateCommunicationChapter(testResults.communication));
  }

  // CHAPTER 5: Conflict Style
  if (testResults.conflictStyle) {
    chapters.push(generateConflictStyleChapter(testResults.conflictStyle));
  }

  // CHAPTER 6: Apology Languages
  if (testResults.apologyLanguages) {
    chapters.push(generateApologyLanguagesChapter(testResults.apologyLanguages));
  }

  // CHAPTER 7: Care Style
  if (testResults.careStyle) {
    chapters.push(generateCareStyleChapter(testResults.careStyle));
  }

  // CHAPTER 8: Core Values
  if (testResults.coreValues) {
    chapters.push(generateCoreValuesChapter(testResults.coreValues));
  }

  const totalModules = 8;
  return {
    version: `1.${Object.keys(testResults).length}.0`,
    generatedAt: new Date().toISOString(),
    completeness: Math.round((Object.keys(testResults).length / totalModules) * 100),
    chapters
  };
}

// ── Chapter builders ──────────────────────────────────────

function generateAttachmentChapter(result) {
  const tpl = manualTemplates.attachment[result.style];
  if (!tpl) return null;

  return {
    id: 'attachment',
    number: '§ 1',
    code: tpl.code,
    title: currentLang === 'it' ? 'Protocollo Relazionale' : 'Relational Protocol',
    subtitle: tpl.label,
    summary: tpl.summary,
    scores: [
      {
        label: currentLang === 'it' ? 'Ansia' : 'Anxiety',
        value: result.anxietyPct,
        color: result.anxietyPct > 60 ? 'red' : result.anxietyPct > 40 ? 'amber' : 'green'
      },
      {
        label: currentLang === 'it' ? 'Evitamento' : 'Avoidance',
        value: result.avoidancePct,
        color: result.avoidancePct > 60 ? 'red' : result.avoidancePct > 40 ? 'amber' : 'green'
      }
    ],
    instructions: tpl.instructions,
    rawResult: result
  };
}

function generateLoveLanguagesChapter(result) {
  const primaryTpl   = manualTemplates.loveLanguages[result.primary];
  const secondaryTpl = manualTemplates.loveLanguages[result.secondary];
  if (!primaryTpl) return null;

  const langLabels = {
    it: { words: 'Parole', time: 'Tempo', gifts: 'Doni', acts: 'Atti', touch: 'Contatto' },
    en: { words: 'Words', time: 'Time', gifts: 'Gifts', acts: 'Acts', touch: 'Touch' }
  };
  const labels = langLabels[currentLang] || langLabels.it;

  const scoreOrder = result.ranking.map(dim => ({
    label: labels[dim],
    value: result.pcts[dim],
    color: dim === result.primary ? 'blue' : 'green'
  }));

  return {
    id: 'loveLanguages',
    number: '§ 2',
    code: primaryTpl.code,
    title: currentLang === 'it' ? 'Protocollo Affettivo' : 'Affection Protocol',
    subtitle: `${primaryTpl.label} ${secondaryTpl ? `/ ${secondaryTpl.label}` : ''}`,
    summary: primaryTpl.summary,
    scores: scoreOrder,
    instructions: [
      ...primaryTpl.instructions,
      ...(secondaryTpl ? secondaryTpl.instructions.slice(0,1).map(i => ({
        ...i,
        title: `[${currentLang === 'it' ? 'Secondario' : 'Secondary'}] ${i.title}`
      })) : [])
    ],
    rawResult: result
  };
}

function generateBigFiveChapter(result) {
  const traits = ['openness','conscientiousness','extraversion','agreeableness','neuroticism'];
  const traitLabels = {
    it: { openness:'Apertura', conscientiousness:'Coscienziosità', extraversion:'Estroversione', agreeableness:'Gradevolezza', neuroticism:'Nevroticismo' },
    en: { openness:'Openness', conscientiousness:'Conscientiousness', extraversion:'Extraversion', agreeableness:'Agreeableness', neuroticism:'Neuroticism' }
  };
  const labels = traitLabels[currentLang] || traitLabels.it;

  const scores = traits.map(t => ({
    label: labels[t],
    value: result[t],
    color: 'blue'
  }));

  // Collect instructions for traits that are high (>65) or low (<35)
  const instructions = [];
  for (const trait of traits) {
    const tplTrait = manualTemplates.bigFive[trait];
    if (!tplTrait) continue;
    const pct = result[trait];
    const level = pct >= 65 ? 'high' : pct <= 35 ? 'low' : null;
    if (level && tplTrait[level]) {
      tplTrait[level].instructions.forEach(i => instructions.push(i));
    }
  }

  // Fallback: if no extreme traits, use dominant
  if (instructions.length === 0) {
    const dominant = result.dominant;
    const tplTrait = manualTemplates.bigFive[dominant];
    if (tplTrait && tplTrait.high) instructions.push(...tplTrait.high.instructions);
  }

  const dominantTpl = manualTemplates.bigFive[result.dominant];
  const dominantLabel = dominantTpl
    ? (result[result.dominant] >= 50 ? dominantTpl.high?.label : dominantTpl.low?.label)
    : '';

  return {
    id: 'bigFive',
    number: '§ 3',
    code: 'OCEAN',
    title: currentLang === 'it' ? 'Profilo Operativo' : 'Operational Profile',
    subtitle: dominantLabel || labels[result.dominant],
    summary: currentLang === 'it'
      ? `Tratto dominante: ${labels[result.dominant]} (${result[result.dominant]}%). Le istruzioni seguenti descrivono come questo profilo si manifesta nelle relazioni.`
      : `Dominant trait: ${labels[result.dominant]} (${result[result.dominant]}%). The following instructions describe how this profile manifests in relationships.`,
    scores,
    ocean: traits.map(t => ({ letter: labels[t][0], name: labels[t], pct: result[t] })),
    instructions,
    rawResult: result
  };
}

function generateCommunicationChapter(result) {
  const tpl = manualTemplates.communication[result.style === 'balanced' ? 'rapport' : result.style];
  if (!tpl) return null;

  const styleLabel = result.style === 'balanced'
    ? (currentLang === 'it' ? 'Stile Bilanciato' : 'Balanced Style')
    : tpl.label;

  return {
    id: 'communication',
    number: '§ 4',
    code: result.style === 'balanced' ? 'COMM-BAL' : tpl.code,
    title: currentLang === 'it' ? 'Protocollo Comunicativo' : 'Communication Protocol',
    subtitle: styleLabel,
    summary: tpl.summary,
    scores: [
      {
        label: 'Rapport',
        value: result.rapportPct,
        color: 'teal'
      },
      {
        label: 'Report',
        value: result.reportPct,
        color: 'blue'
      }
    ],
    instructions: tpl.instructions,
    rawResult: result
  };
}

function generateConflictStyleChapter(result) {
  const tpl = manualTemplates.conflictStyle?.[result.primary];
  if (!tpl) return null;

  const dimLabels = {
    it: { competing:'Competitivo', collaborating:'Collaborativo', compromising:'Compromes-so', avoiding:'Evitante', accommodating:'Accomodante' },
    en: { competing:'Competing', collaborating:'Collaborating', compromising:'Compromising', avoiding:'Avoiding', accommodating:'Accommodating' }
  };
  const labels = dimLabels[currentLang] || dimLabels.it;

  const scores = result.ranking.map(dim => ({
    label: labels[dim],
    value: result.pcts[dim],
    color: dim === result.primary ? 'blue' : 'green'
  }));

  const secondaryTpl = manualTemplates.conflictStyle?.[result.secondary];

  return {
    id: 'conflictStyle',
    number: '§ 5',
    code: tpl.code,
    title: currentLang === 'it' ? 'Protocollo Conflitto' : 'Conflict Protocol',
    subtitle: `${tpl.label}${secondaryTpl ? ` / ${secondaryTpl.label}` : ''}`,
    summary: tpl.summary,
    scores,
    instructions: [
      ...tpl.instructions,
      ...(secondaryTpl ? secondaryTpl.instructions.slice(0,1).map(i => ({
        ...i,
        title: `[${currentLang === 'it' ? 'Secondario' : 'Secondary'}] ${i.title}`
      })) : [])
    ],
    rawResult: result
  };
}

function generateApologyLanguagesChapter(result) {
  const tpl = manualTemplates.apologyLanguages?.[result.primary];
  if (!tpl) return null;

  const dimLabels = {
    it: { regret:'Rimpianto', responsibility:'Responsabilità', restitution:'Restituzione', repentance:'Ravvedimento', forgiveness:'Perdono' },
    en: { regret:'Regret', responsibility:'Responsibility', restitution:'Restitution', repentance:'Repentance', forgiveness:'Forgiveness' }
  };
  const labels = dimLabels[currentLang] || dimLabels.it;

  const scores = result.ranking.map(dim => ({
    label: labels[dim],
    value: result.pcts[dim],
    color: dim === result.primary ? 'blue' : 'green'
  }));

  const secondaryTpl = manualTemplates.apologyLanguages?.[result.secondary];

  return {
    id: 'apologyLanguages',
    number: '§ 6',
    code: tpl.code,
    title: currentLang === 'it' ? 'Protocollo Riparazione' : 'Repair Protocol',
    subtitle: `${tpl.label}${secondaryTpl ? ` / ${secondaryTpl.label}` : ''}`,
    summary: tpl.summary,
    scores,
    instructions: [
      ...tpl.instructions,
      ...(secondaryTpl ? secondaryTpl.instructions.slice(0,1).map(i => ({
        ...i,
        title: `[${currentLang === 'it' ? 'Secondario' : 'Secondary'}] ${i.title}`
      })) : [])
    ],
    rawResult: result
  };
}

function generateCareStyleChapter(result) {
  const tpl = manualTemplates.careStyle?.[result.primary];
  if (!tpl) return null;
  const dimLabels = {
    it: { emotional:'Emotivo', practical:'Pratico', presence:'Presenza', autonomy:'Autonomia' },
    en: { emotional:'Emotional', practical:'Practical', presence:'Presence', autonomy:'Autonomy' }
  };
  const labels = dimLabels[currentLang] || dimLabels.it;
  const secondaryTpl = manualTemplates.careStyle?.[result.secondary];
  return {
    id: 'careStyle', number: '§ 7', code: tpl.code,
    title: currentLang === 'it' ? 'Protocollo di Cura' : 'Care Protocol',
    subtitle: `${tpl.label}${secondaryTpl ? ` / ${secondaryTpl.label}` : ''}`,
    summary: tpl.summary,
    scores: result.ranking.map(dim => ({ label: labels[dim], value: result.pcts[dim], color: dim === result.primary ? 'blue' : 'green' })),
    instructions: tpl.instructions,
    antiPatterns: tpl.antiPatterns || [],
    partnerInstructions: tpl.partnerInstructions || [],
    rawResult: result
  };
}

function generateCoreValuesChapter(result) {
  const tpl = manualTemplates.coreValues?.[result.primary];
  if (!tpl) return null;
  const dimLabels = {
    it: { security:'Sicurezza', freedom:'Libertà', achievement:'Realizzazione', connection:'Connessione', growth:'Crescita' },
    en: { security:'Security', freedom:'Freedom', achievement:'Achievement', connection:'Connection', growth:'Growth' }
  };
  const labels = dimLabels[currentLang] || dimLabels.it;
  const secondaryTpl = manualTemplates.coreValues?.[result.secondary];
  return {
    id: 'coreValues', number: '§ 8', code: tpl.code,
    title: currentLang === 'it' ? 'Mappa dei Valori' : 'Values Map',
    subtitle: `${tpl.label}${secondaryTpl ? ` / ${secondaryTpl.label}` : ''}`,
    summary: tpl.summary,
    scores: result.ranking.map(dim => ({ label: labels[dim], value: result.pcts[dim], color: dim === result.primary ? 'blue' : 'green' })),
    instructions: tpl.instructions,
    antiPatterns: tpl.antiPatterns || [],
    partnerInstructions: tpl.partnerInstructions || [],
    rawResult: result
  };
}

// ── Couple Report Generator ───────────────────────────────

export function generateCoupleReport(myResults, partnerResults, lang = 'it') {
  if (!manualTemplates) throw new Error('Templates not loaded');

  const fp  = manualTemplates.coupleReport?.frictionPatterns || {};
  const cmi = manualTemplates.crossModuleInsights || {};
  const myAttach  = myResults.attachment?.style;
  const ptAttach  = partnerResults.attachment?.style;
  const myComm    = myResults.communication?.style;
  const ptComm    = partnerResults.communication?.style;
  const myLang    = myResults.loveLanguages?.primary;
  const ptLang    = partnerResults.loveLanguages?.primary;
  const myN       = myResults.bigFive?.neuroticism;
  const ptN       = partnerResults.bigFive?.neuroticism;
  const myC       = myResults.bigFive?.conscientiousness;
  const ptC       = partnerResults.bigFive?.conscientiousness;
  const myConflict = myResults.conflictStyle?.primary;
  const ptConflict = partnerResults.conflictStyle?.primary;
  const myApology  = myResults.apologyLanguages?.primary;
  const ptApology  = partnerResults.apologyLanguages?.primary;

  const frictions = [];
  const synergies = [];

  // ── Friction detection ──
  if ((myAttach === 'avoidant' && ptAttach === 'anxious') ||
      (myAttach === 'anxious'  && ptAttach === 'avoidant')) {
    frictions.push({ ...fp.avoidant_anxious, key: 'avoidant_anxious' });
  }
  if (myAttach === 'anxious' && ptAttach === 'anxious') {
    frictions.push({ ...fp.anxious_anxious, key: 'anxious_anxious' });
  }
  if (myAttach === 'avoidant' && ptAttach === 'avoidant') {
    frictions.push({ ...fp.avoidant_avoidant, key: 'avoidant_avoidant' });
  }
  if (myComm !== ptComm && myComm !== 'balanced' && ptComm !== 'balanced') {
    frictions.push({ ...fp.report_rapport, key: 'report_rapport' });
  }
  if (myLang && ptLang && myLang !== ptLang) {
    frictions.push({ ...fp.different_love_languages, key: 'different_love_languages' });
  }
  if (myN !== undefined && ptN !== undefined && Math.abs(myN - ptN) > 35) {
    frictions.push({ ...fp.high_neuroticism_low, key: 'high_neuroticism_low' });
  }
  if (myC !== undefined && ptC !== undefined && Math.abs(myC - ptC) > 40) {
    frictions.push({ ...fp.high_conscientiousness_low, key: 'high_conscientiousness_low' });
  }

  // Conflict style frictions
  if (myConflict && ptConflict) {
    if ((myConflict === 'competing' && ptConflict === 'avoiding') ||
        (myConflict === 'avoiding' && ptConflict === 'competing')) {
      if (fp.competing_avoiding) frictions.push({ ...fp.competing_avoiding, key: 'competing_avoiding' });
    }
    if (myConflict === 'avoiding' && ptConflict === 'avoiding') {
      if (fp.avoiding_avoiding) frictions.push({ ...fp.avoiding_avoiding, key: 'avoiding_avoiding' });
    }
    if (myConflict === 'competing' && ptConflict === 'competing') {
      if (fp.competing_competing) frictions.push({ ...fp.competing_competing, key: 'competing_competing' });
    }
  }

  // Apology language mismatch
  if (myApology && ptApology && myApology !== ptApology) {
    if (fp.different_apology_languages) frictions.push({ ...fp.different_apology_languages, key: 'different_apology_languages' });
  }

  // ── Synergy detection ──
  if (myAttach === 'secure' && ptAttach === 'secure') {
    synergies.push({
      name: lang === 'it' ? 'Doppia Base Sicura' : 'Double Secure Base',
      description: lang === 'it'
        ? 'Entrambi avete attaccamento sicuro. La coppia ha una solida capacità di gestire conflitti, vicinanza e distanza senza escalation.'
        : 'You both have secure attachment. Your couple has a solid ability to handle conflict, closeness, and distance without escalation.'
    });
  } else if (myAttach === 'secure' || ptAttach === 'secure') {
    synergies.push({
      name: lang === 'it' ? 'Base Sicura Presente' : 'Secure Base Present',
      description: lang === 'it'
        ? 'Uno di voi ha attaccamento sicuro. Questo funge da ancora di stabilità per la coppia nei momenti di stress e conflitto.'
        : 'One of you has a secure attachment — a stability anchor for the couple during stress and conflict.'
    });
  }
  if (myLang === ptLang && myLang) {
    synergies.push({
      name: lang === 'it' ? 'Linguaggio d\'Amore Condiviso' : 'Shared Love Language',
      description: lang === 'it'
        ? `Entrambi parlate ${getLangLabel(myLang, lang)}. Non c'è rischio di "investimento non riconosciuto" — quello che date è esattamente quello che l'altro vuole ricevere.`
        : `You both speak ${getLangLabel(myLang, lang)}. No risk of "unrecognized investment" — what you give is exactly what the other wants.`
    });
  }
  if (myComm === ptComm && myComm) {
    synergies.push({
      name: lang === 'it' ? 'Stile Comunicativo Allineato' : 'Aligned Communication Style',
      description: lang === 'it'
        ? 'Avete lo stesso stile comunicativo. Le vostre conversazioni partono già allineate su cosa cercate dal dialogo.'
        : 'You share the same communication style. Your conversations start already aligned on what you seek from dialogue.'
    });
  }
  if (myN !== undefined && ptN !== undefined && Math.abs(myN - ptN) < 20) {
    synergies.push({
      name: lang === 'it' ? 'Intensità Emotiva Simile' : 'Similar Emotional Intensity',
      description: lang === 'it'
        ? 'Avete un livello simile di intensità emotiva. Nessuno dei due tende a sentirsi sopraffatto o ignorato dall\'altro sul piano affettivo.'
        : 'You have a similar level of emotional intensity — neither tends to feel overwhelmed or ignored by the other.'
    });
  }

  // ── Cross-module insights (individual patterns) ──
  const crossInsights = [];

  function pushInsight(raw, who) {
    // Map JSON field names (title/content/partnerNote) to render field names (name/description/protocol)
    crossInsights.push({
      name: raw.title,
      description: raw.content,
      protocol: who === 'partner' ? raw.partnerNote : raw.content,
      who
    });
  }

  // Avoidant attachment + avoiding conflict = double avoidance trap
  if (myAttach === 'avoidant' && myConflict === 'avoiding' && cmi.avoidant_avoiding) {
    pushInsight(cmi.avoidant_avoiding, 'me');
  }
  if (ptAttach === 'avoidant' && ptConflict === 'avoiding' && cmi.avoidant_avoiding) {
    pushInsight(cmi.avoidant_avoiding, 'partner');
  }

  // Anxious attachment + competing conflict = emotional escalation risk
  if (myAttach === 'anxious' && myConflict === 'competing' && cmi.anxious_competing) {
    pushInsight(cmi.anxious_competing, 'me');
  }
  if (ptAttach === 'anxious' && ptConflict === 'competing' && cmi.anxious_competing) {
    pushInsight(cmi.anxious_competing, 'partner');
  }

  // Accommodating conflict + anxious attachment = self-erasure risk
  if (myConflict === 'accommodating' && myAttach === 'anxious' && cmi.accommodating_anxious) {
    pushInsight(cmi.accommodating_anxious, 'me');
  }
  if (ptConflict === 'accommodating' && ptAttach === 'anxious' && cmi.accommodating_anxious) {
    pushInsight(cmi.accommodating_anxious, 'partner');
  }

  // Competing conflict + report communication = high pressure combo
  if (myConflict === 'competing' && myComm === 'report' && cmi.competing_report) {
    pushInsight(cmi.competing_report, 'me');
  }
  if (ptConflict === 'competing' && ptComm === 'report' && cmi.competing_report) {
    pushInsight(cmi.competing_report, 'partner');
  }

  // Avoiding conflict + repentance apology = repair gap
  if (myConflict === 'avoiding' && myApology === 'repentance' && cmi.avoiding_repentance) {
    pushInsight(cmi.avoiding_repentance, 'me');
  }
  if (ptConflict === 'avoiding' && ptApology === 'repentance' && cmi.avoiding_repentance) {
    pushInsight(cmi.avoiding_repentance, 'partner');
  }

  // ── Compatibility score ──
  const compatibility = calculateCompatibility(myResults, partnerResults);

  // ── Scenarios ──
  const scenarios = generateScenarios(myResults, partnerResults, lang);

  // ── Weekly actions ──
  const weeklyActions = frictions
    .filter(f => f.weeklyAction)
    .map(f => ({ friction: f.name, action: f.weeklyAction }));

  return {
    frictions,
    synergies,
    crossInsights,
    comparisonRows: buildComparisonRows(myResults, partnerResults, lang),
    compatibility,
    scenarios,
    weeklyActions
  };
}

// ── Compatibility Score ───────────────────────────────────

function calculateCompatibility(myR, ptR) {
  const scores = [];

  // Attachment (weight: 35%)
  const attachScore = {
    secure_secure: 100, secure_anxious: 72, secure_avoidant: 70, secure_fearful: 55,
    anxious_anxious: 45, avoidant_avoidant: 52, anxious_avoidant: 22,
    fearful_fearful: 30, anxious_fearful: 35, avoidant_fearful: 38
  };
  const myA = myR.attachment?.style;
  const ptA = ptR.attachment?.style;
  if (myA && ptA) {
    const key = [myA, ptA].sort().join('_');
    const s = attachScore[key] ?? attachScore[[ptA, myA].join('_')] ?? 50;
    scores.push({ label: 'Attaccamento', score: s, weight: 0.35 });
  }

  // Love Languages (weight: 25%)
  if (myR.loveLanguages && ptR.loveLanguages) {
    const same = myR.loveLanguages.primary === ptR.loveLanguages.primary;
    const secondaryCross = myR.loveLanguages.secondary === ptR.loveLanguages.primary ||
                           myR.loveLanguages.primary   === ptR.loveLanguages.secondary;
    const s = same ? 100 : secondaryCross ? 68 : 38;
    scores.push({ label: 'Linguaggi Amore', score: s, weight: 0.25 });
  }

  // Communication (weight: 25%)
  const myC = myR.communication?.style;
  const ptC = ptR.communication?.style;
  if (myC && ptC) {
    const s = myC === ptC ? 100 : (myC === 'balanced' || ptC === 'balanced') ? 72 : 38;
    scores.push({ label: 'Comunicazione', score: s, weight: 0.25 });
  }

  // Neuroticism gap (weight: 15%)
  const myN = myR.bigFive?.neuroticism;
  const ptN = ptR.bigFive?.neuroticism;
  if (myN !== undefined && ptN !== undefined) {
    const gap = Math.abs(myN - ptN);
    const s = gap < 15 ? 100 : gap < 30 ? 75 : gap < 45 ? 50 : 25;
    scores.push({ label: 'Intensità Emotiva', score: s, weight: 0.15 });
  }

  if (scores.length === 0) return null;

  const totalWeight = scores.reduce((s, x) => s + x.weight, 0);
  const weighted = scores.reduce((s, x) => s + x.score * x.weight, 0) / totalWeight;
  const overall = Math.round(weighted);

  const level = overall >= 75 ? 'excellent' : overall >= 55 ? 'good' : overall >= 38 ? 'moderate' : 'low';
  const tpl = manualTemplates.coupleReport?.compatibilityLabels?.[level] || {};

  return { overall, level, label: tpl.label || '', desc: tpl.desc || '', breakdown: scores };
}

// ── Scenarios Generator ───────────────────────────────────

function generateScenarios(myR, ptR, lang) {
  const scenarios = [];
  const myAttach = myR.attachment?.style;
  const ptAttach = ptR.attachment?.style;
  const myComm   = myR.communication?.style;
  const ptComm   = ptR.communication?.style;
  const myLang   = myR.loveLanguages?.primary;
  const ptLang   = ptR.loveLanguages?.primary;

  // Scenario: Conflitto
  let conflictMe = '', conflictPt = '', conflictDo = '';
  const conflictBehavior = {
    secure:   lang === 'it' ? 'tende ad affrontare il problema direttamente' : 'tends to address the issue directly',
    anxious:  lang === 'it' ? 'cerca contatto e rassicurazione immediata' : 'seeks immediate contact and reassurance',
    avoidant: lang === 'it' ? 'si ritira e ha bisogno di spazio per calmarsi' : 'withdraws and needs space to calm down',
    fearful:  lang === 'it' ? 'oscilla tra avvicinarsi e allontanarsi' : 'oscillates between approaching and withdrawing'
  };
  if (myAttach && ptAttach) {
    conflictMe = conflictBehavior[myAttach] || '';
    conflictPt = conflictBehavior[ptAttach] || '';

    if (myAttach === 'avoidant' && ptAttach === 'anxious') {
      conflictDo = lang === 'it'
        ? 'Accordatevi su un tempo di pausa definito ("30 min, poi ne parliamo"). Il partner ansioso pratica l\'attesa attiva senza messaggi. Il partner evitante rispetta il rientro promesso.'
        : 'Agree on a defined break time ("30 min, then we talk"). The anxious partner practices active waiting without messages. The avoidant partner respects the promised return.';
    } else if (myAttach === 'anxious' && ptAttach === 'avoidant') {
      conflictDo = lang === 'it'
        ? 'Stessa regola — il partner evitante annuncia il ritiro con ETA. Il partner ansioso si fida del rientro e non insegue.'
        : 'Same rule — the avoidant partner announces withdrawal with ETA. The anxious partner trusts the return and doesn\'t chase.';
    } else if (myAttach === 'secure' || ptAttach === 'secure') {
      conflictDo = lang === 'it'
        ? 'Il partner sicuro funge da regolatore: resta calmo, non amplifica, propone una pausa breve se l\'altro è sopraffatto. Poi riprende quando entrambi sono pronti.'
        : 'The secure partner acts as a regulator: stays calm, doesn\'t amplify, proposes a short break if the other is overwhelmed. Then resumes when both are ready.';
    } else {
      conflictDo = lang === 'it'
        ? 'Concordate PRIMA di litigare: una parola-segnale che significa "ho bisogno di 10 minuti". Non è fuga — è autoregolazione. Chi la usa torna sempre.'
        : 'Agree BEFORE arguing: a signal word meaning "I need 10 minutes". It\'s not escape — it\'s self-regulation. Whoever uses it always comes back.';
    }
    scenarios.push({
      icon: '⚡',
      title: lang === 'it' ? 'Scenario: Litigata' : 'Scenario: Conflict',
      meLabel: lang === 'it' ? 'Come ti comporti' : 'How you behave',
      ptLabel: lang === 'it' ? 'Come si comporta il partner' : 'How your partner behaves',
      meText: conflictMe,
      ptText: conflictPt,
      protocol: conflictDo
    });
  }

  // Scenario: Bisogno di affetto
  if (myLang && ptLang) {
    const langDesc = {
      it: {
        words:  'cerca conferme verbali esplicite di amore e apprezzamento',
        time:   'ha bisogno di presenza indivisa e attenzione totale',
        gifts:  'si sente amato/a con gesti fisici e simboli tangibili',
        acts:   'si sente amato/a quando l\'altro fa qualcosa di concreto per lui/lei',
        touch:  'ha bisogno di contatto fisico per sentirsi connesso/a'
      },
      en: {
        words:  'seeks explicit verbal confirmation of love and appreciation',
        time:   'needs undivided presence and full attention',
        gifts:  'feels loved with physical gestures and tangible symbols',
        acts:   'feels loved when the other does something concrete for them',
        touch:  'needs physical contact to feel connected'
      }
    };
    const ld = langDesc[lang] || langDesc.it;
    const affectionDo = myLang === ptLang
      ? (lang === 'it'
          ? `Entrambi parlate lo stesso linguaggio — continuate a usarlo. Rischiate solo di darlo per scontato col tempo: rendetelo intenzionale.`
          : `You both speak the same language — keep using it. The only risk is taking it for granted over time: make it intentional.`)
      : (lang === 'it'
          ? `Ogni settimana: un gesto nel linguaggio dell'altro. Non spontaneo — programmato. Chiediti: "Cosa farebbe sentire amato/a il mio partner, non io?"`
          : `Every week: one gesture in the other's language. Not spontaneous — planned. Ask yourself: "What would make my partner feel loved, not me?"`);

    scenarios.push({
      icon: '💙',
      title: lang === 'it' ? 'Scenario: Bisogno di Affetto' : 'Scenario: Need for Affection',
      meLabel: lang === 'it' ? 'Come vuoi ricevere amore' : 'How you want to receive love',
      ptLabel: lang === 'it' ? 'Come vuole ricevere amore il partner' : 'How your partner wants to receive love',
      meText: ld[myLang] || myLang,
      ptText: ld[ptLang] || ptLang,
      protocol: affectionDo
    });
  }

  // Scenario: Comunicazione difficile
  if (myComm && ptComm && myComm !== ptComm) {
    const commDesc = {
      it: {
        rapport:  'vuole essere ascoltato/a prima di ricevere consigli — cerca connessione emotiva',
        report:   'vuole arrivare a una soluzione — trova lungo l\'elaborazione emotiva',
        balanced: 'si adatta al contesto'
      },
      en: {
        rapport:  'wants to be heard before receiving advice — seeks emotional connection',
        report:   'wants to reach a solution — finds emotional processing lengthy',
        balanced: 'adapts to context'
      }
    };
    const cd = commDesc[lang] || commDesc.it;
    scenarios.push({
      icon: '💬',
      title: lang === 'it' ? 'Scenario: Problema da Discutere' : 'Scenario: Problem Discussion',
      meLabel: lang === 'it' ? 'Il tuo approccio' : 'Your approach',
      ptLabel: lang === 'it' ? 'L\'approccio del partner' : 'Partner\'s approach',
      meText:  cd[myComm]  || myComm,
      ptText:  cd[ptComm]  || ptComm,
      protocol: lang === 'it'
        ? 'Prima di iniziare: dite ad alta voce cosa cercate. "Ho bisogno di sfogarmi per 10 min" oppure "Ho un problema, mi serve un consiglio pratico". Questo evita il 90% dei fraintendimenti comunicativi.'
        : 'Before starting: say out loud what you need. "I need to vent for 10 min" or "I have a problem, I need practical advice." This prevents 90% of communication misunderstandings.'
    });
  }

  return scenarios;
}

function buildComparisonRows(myR, ptR, lang) {
  const rows = [];
  const labels = {
    it: {
      attachment: 'Attaccamento',
      loveLanguage: 'Linguaggio Amore',
      communication: 'Comunicazione',
      conflictStyle: 'Stile Conflitto',
      apologyLanguage: 'Linguaggio Scuse'
    },
    en: {
      attachment: 'Attachment',
      loveLanguage: 'Love Language',
      communication: 'Communication',
      conflictStyle: 'Conflict Style',
      apologyLanguage: 'Apology Language'
    }
  };
  const l = labels[lang] || labels.it;

  const styleLabels = {
    it: { secure:'Sicuro', anxious:'Ansioso', avoidant:'Evitante', fearful:'Disorganizzato',
          rapport:'Rapport', report:'Report', balanced:'Bilanciato',
          competing:'Competitivo', collaborating:'Collaborativo', compromising:'Compromesso',
          avoiding:'Evitante', accommodating:'Accomodante',
          regret:'Rimpianto', responsibility:'Responsabilità', restitution:'Restituzione',
          repentance:'Ravvedimento', forgiveness:'Perdono' },
    en: { secure:'Secure', anxious:'Anxious', avoidant:'Avoidant', fearful:'Fearful',
          rapport:'Rapport', report:'Report', balanced:'Balanced',
          competing:'Competing', collaborating:'Collaborating', compromising:'Compromising',
          avoiding:'Avoiding', accommodating:'Accommodating',
          regret:'Regret', responsibility:'Responsibility', restitution:'Restitution',
          repentance:'Repentance', forgiveness:'Forgiveness' }
  };
  const sl = styleLabels[lang] || styleLabels.it;

  const loveLangLabels = {
    it: { words:'Parole', time:'Tempo', gifts:'Doni', acts:'Atti', touch:'Contatto' },
    en: { words:'Words', time:'Time', gifts:'Gifts', acts:'Acts', touch:'Touch' }
  };
  const ll = loveLangLabels[lang] || loveLangLabels.it;

  if (myR.attachment && ptR.attachment) {
    rows.push({
      trait: l.attachment,
      me: sl[myR.attachment.style],
      partner: sl[ptR.attachment.style],
      match: myR.attachment.style === ptR.attachment.style
    });
  }
  if (myR.loveLanguages && ptR.loveLanguages) {
    rows.push({
      trait: l.loveLanguage,
      me: ll[myR.loveLanguages.primary],
      partner: ll[ptR.loveLanguages.primary],
      match: myR.loveLanguages.primary === ptR.loveLanguages.primary
    });
  }
  if (myR.communication && ptR.communication) {
    rows.push({
      trait: l.communication,
      me: sl[myR.communication.style],
      partner: sl[ptR.communication.style],
      match: myR.communication.style === ptR.communication.style
    });
  }
  if (myR.conflictStyle && ptR.conflictStyle) {
    rows.push({
      trait: l.conflictStyle,
      me: sl[myR.conflictStyle.primary],
      partner: sl[ptR.conflictStyle.primary],
      match: myR.conflictStyle.primary === ptR.conflictStyle.primary
    });
  }
  if (myR.apologyLanguages && ptR.apologyLanguages) {
    rows.push({
      trait: l.apologyLanguage,
      me: sl[myR.apologyLanguages.primary],
      partner: sl[ptR.apologyLanguages.primary],
      match: myR.apologyLanguages.primary === ptR.apologyLanguages.primary
    });
  }

  return rows;
}

function getLangLabel(dim, lang) {
  const map = {
    it: { words:'Parole di Affermazione', time:'Tempo di Qualità', gifts:'Doni', acts:'Atti di Servizio', touch:'Contatto Fisico' },
    en: { words:'Words of Affirmation', time:'Quality Time', gifts:'Gifts', acts:'Acts of Service', touch:'Physical Touch' }
  };
  return (map[lang] || map.it)[dim] || dim;
}
