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

  return {
    version: `1.${Object.keys(testResults).length}.0`,
    generatedAt: new Date().toISOString(),
    completeness: Math.round((Object.keys(testResults).length / 4) * 100),
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

// ── Couple Report Generator ───────────────────────────────

export function generateCoupleReport(myResults, partnerResults, lang = 'it') {
  if (!manualTemplates) throw new Error('Templates not loaded');

  const report = {
    frictions: [],
    synergies: [],
    comparisonRows: []
  };

  // Detect friction patterns
  const fp = manualTemplates.coupleReport?.frictionPatterns || {};

  // 1. Avoidant + Anxious
  const myAttach = myResults.attachment?.style;
  const ptAttach = partnerResults.attachment?.style;
  if (
    (myAttach === 'avoidant' && ptAttach === 'anxious') ||
    (myAttach === 'anxious'  && ptAttach === 'avoidant')
  ) {
    report.frictions.push({ ...fp.avoidant_anxious, key: 'avoidant_anxious' });
  }

  // 2. Report + Rapport communication mismatch
  const myComm = myResults.communication?.style;
  const ptComm = partnerResults.communication?.style;
  if (myComm !== ptComm && myComm !== 'balanced' && ptComm !== 'balanced') {
    report.frictions.push({ ...fp.report_rapport, key: 'report_rapport' });
  }

  // 3. Different primary love languages
  const myLang = myResults.loveLanguages?.primary;
  const ptLang = partnerResults.loveLanguages?.primary;
  if (myLang && ptLang && myLang !== ptLang) {
    report.frictions.push({ ...fp.different_love_languages, key: 'different_love_languages' });
  }

  // 4. Neuroticism gap
  const myN = myResults.bigFive?.neuroticism;
  const ptN = partnerResults.bigFive?.neuroticism;
  if (myN !== undefined && ptN !== undefined && Math.abs(myN - ptN) > 35) {
    report.frictions.push({ ...fp.high_neuroticism_low, key: 'high_neuroticism_low' });
  }

  // Detect synergies
  if (myAttach === 'secure' || ptAttach === 'secure') {
    report.synergies.push({
      name: lang === 'it' ? 'Base Sicura' : 'Secure Base',
      description: lang === 'it'
        ? 'Almeno uno di voi ha un attaccamento sicuro. Questo funge da ancora di stabilità per la coppia nei momenti di stress.'
        : 'At least one of you has a secure attachment. This serves as a stability anchor for the couple during stress.'
    });
  }

  if (myLang === ptLang) {
    report.synergies.push({
      name: lang === 'it' ? 'Linguaggio Condiviso' : 'Shared Language',
      description: lang === 'it'
        ? `Entrambi parlate ${getLangLabel(myLang, lang)}. Non c'è rischio di "investimento non riconosciuto" su questo fronte.`
        : `You both speak ${getLangLabel(myLang, lang)}. No risk of "unrecognized investment" on this front.`
    });
  }

  if (myComm === ptComm) {
    report.synergies.push({
      name: lang === 'it' ? 'Stile Comunicativo Compatibile' : 'Compatible Communication Style',
      description: lang === 'it'
        ? 'Avete lo stesso stile comunicativo di base. Le vostre conversazioni partiranno già allineate.'
        : 'You share the same base communication style. Your conversations start already aligned.'
    });
  }

  // Build comparison rows
  report.comparisonRows = buildComparisonRows(myResults, partnerResults, lang);

  return report;
}

function buildComparisonRows(myR, ptR, lang) {
  const rows = [];
  const labels = {
    it: {
      attachment: 'Attaccamento',
      loveLanguage: 'Linguaggio Amore',
      communication: 'Comunicazione',
      openness: 'Apertura',
      neuroticism: 'Nevroticismo'
    },
    en: {
      attachment: 'Attachment',
      loveLanguage: 'Love Language',
      communication: 'Communication',
      openness: 'Openness',
      neuroticism: 'Neuroticism'
    }
  };
  const l = labels[lang] || labels.it;

  const styleLabels = {
    it: { secure:'Sicuro', anxious:'Ansioso', avoidant:'Evitante', fearful:'Disorganizzato',
          rapport:'Rapport', report:'Report', balanced:'Bilanciato' },
    en: { secure:'Secure', anxious:'Anxious', avoidant:'Avoidant', fearful:'Fearful',
          rapport:'Rapport', report:'Report', balanced:'Balanced' }
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

  return rows;
}

function getLangLabel(dim, lang) {
  const map = {
    it: { words:'Parole di Affermazione', time:'Tempo di Qualità', gifts:'Doni', acts:'Atti di Servizio', touch:'Contatto Fisico' },
    en: { words:'Words of Affirmation', time:'Quality Time', gifts:'Gifts', acts:'Acts of Service', touch:'Physical Touch' }
  };
  return (map[lang] || map.it)[dim] || dim;
}
