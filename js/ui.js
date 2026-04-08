// ============================================================
// UI HELPERS — Toast, loading, rendering utilities
// ============================================================

// ── Toast notifications ───────────────────────────────────

let toastContainer = null;

export function showToast(message, type = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}

// ── Loading overlay ───────────────────────────────────────

let loadingEl = null;

export function showLoading(message = '...') {
  if (loadingEl) return;
  loadingEl = document.createElement('div');
  loadingEl.className = 'loading-overlay';
  loadingEl.innerHTML = `
    <div class="loading-box">
      <div class="spinner"></div>
      <div>${message}</div>
    </div>
  `;
  document.body.appendChild(loadingEl);
}

export function hideLoading() {
  if (loadingEl) { loadingEl.remove(); loadingEl = null; }
}

// ── Score bar ─────────────────────────────────────────────

export function renderScoreBars(scores) {
  return scores.map(s => `
    <div class="score-row">
      <div class="score-label">${s.label}</div>
      <div class="score-track">
        <div class="score-fill score-fill-${s.color || 'blue'}"
             style="width:0%"
             data-target="${s.value}%">
        </div>
      </div>
      <div class="score-value">${s.value}%</div>
    </div>
  `).join('');
}

export function animateScoreBars(container) {
  requestAnimationFrame(() => {
    container.querySelectorAll('.score-fill[data-target]').forEach(el => {
      el.style.width = el.dataset.target;
    });
  });
}

// ── Manual chapter renderer ───────────────────────────────

export function renderManualChapter(chapter, index) {
  if (!chapter) return '';

  const scoreBars = chapter.scores ? renderScoreBars(chapter.scores) : '';
  const oceanGrid = chapter.ocean ? renderOceanGrid(chapter.ocean) : '';

  const instructionsHtml = (chapter.instructions || []).map((inst, i) => `
    <div class="instruction-card" data-index="${i + 1}">
      <div class="instruction-title">${inst.title}</div>
      <div class="instruction-content">${inst.content}</div>
    </div>
  `).join('');

  return `
    <section class="manual-chapter" id="chapter-${chapter.id}">
      <div class="chapter-header">
        <div class="chapter-num">${chapter.number}</div>
        <div class="chapter-title-block">
          <div class="chapter-code">${chapter.code}</div>
          <h2 class="chapter-title">${chapter.title}</h2>
          <p class="chapter-subtitle">${chapter.subtitle}</p>
        </div>
      </div>

      ${chapter.summary ? `<div class="chapter-summary">${chapter.summary}</div>` : ''}

      ${oceanGrid}

      ${scoreBars ? `<div class="score-viz">${scoreBars}</div>` : ''}

      <div class="instructions-grid">${instructionsHtml}</div>
    </section>
  `;
}

function renderOceanGrid(ocean) {
  return `
    <div class="ocean-grid">
      ${ocean.map(t => `
        <div class="ocean-cell">
          <div class="ocean-letter">${t.letter}</div>
          <div class="ocean-name">${t.name}</div>
          <div class="ocean-pct">${t.pct}%</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Table of Contents ─────────────────────────────────────

export function renderTOC(chapters, lang) {
  const items = chapters.filter(Boolean).map((ch, i) => `
    <div class="toc-item" data-target="chapter-${ch.id}">
      <span class="toc-num">${ch.number}</span>
      <span class="toc-name">${ch.title}</span>
      <span class="toc-code">${ch.code}</span>
    </div>
  `).join('');

  return `
    <div class="manual-toc">
      <div class="manual-toc-title">
        ${lang === 'it' ? 'INDICE DEL MANUALE' : 'TABLE OF CONTENTS'}
      </div>
      ${items}
    </div>
  `;
}

// ── Couple comparison table ───────────────────────────────

export function renderCompareTable(rows, meLabel, partnerLabel, lang) {
  const l = lang === 'it'
    ? { trait: 'TRATTO', match: 'MATCH' }
    : { trait: 'TRAIT',  match: 'MATCH' };

  const headerHtml = `
    <div class="compare-row header">
      <div class="compare-cell header-cell">${meLabel}</div>
      <div class="compare-cell center">${l.trait}</div>
      <div class="compare-cell header-cell">${partnerLabel}</div>
    </div>
  `;

  const rowsHtml = rows.map(row => `
    <div class="compare-row">
      <div class="compare-cell ${row.match ? 'compare-match' : ''}">${row.me}</div>
      <div class="compare-cell center">
        <div class="compare-trait-name">${row.trait}</div>
        <div class="compare-match-icon ${row.match ? 'match' : 'no-match'}">${row.match ? '=' : '≠'}</div>
      </div>
      <div class="compare-cell ${row.match ? 'compare-match' : ''}">${row.partner}</div>
    </div>
  `).join('');

  return `<div class="compare-table">${headerHtml}${rowsHtml}</div>`;
}

// ── Friction / Synergy cards ──────────────────────────────

export function renderFrictionCard(friction, lang = 'it') {
  const sevMap = {
    alta:  { cls: 'severity-alta',  label: lang === 'it' ? 'ALTA'  : 'HIGH'   },
    media: { cls: 'severity-media', label: lang === 'it' ? 'MEDIA' : 'MEDIUM' },
    bassa: { cls: 'severity-bassa', label: lang === 'it' ? 'BASSA' : 'LOW'    }
  };
  const sev = sevMap[friction.severity] || sevMap.media;

  const borderColor = friction.severity === 'alta'
    ? 'rgba(239,68,68,0.35)'
    : friction.severity === 'bassa'
      ? 'rgba(34,197,94,0.3)'
      : 'rgba(245,158,11,0.3)';
  const bgColor = friction.severity === 'alta'
    ? 'rgba(239,68,68,0.04)'
    : friction.severity === 'bassa'
      ? 'rgba(34,197,94,0.03)'
      : 'rgba(245,158,11,0.04)';

  return `
    <div class="friction-card" style="border-color:${borderColor};background:${bgColor}">
      <div class="friction-tag" style="display:flex;align-items:center;gap:8px">
        ⚠ ${lang === 'it' ? 'PUNTO DI ATTRITO' : 'FRICTION POINT'}
        <span class="friction-severity ${sev.cls}">${sev.label}</span>
      </div>
      <div class="friction-name">${friction.name}</div>
      <div class="friction-desc">${friction.description}</div>
      ${friction.whatHappens ? `
        <div class="friction-what">
          <strong>${lang === 'it' ? 'COME SI MANIFESTA' : 'HOW IT MANIFESTS'}</strong>
          ${friction.whatHappens}
        </div>
      ` : ''}
      <div class="friction-protocol">
        <strong>${lang === 'it' ? 'COME GESTIRLO' : 'HOW TO HANDLE IT'}</strong>
        ${friction.protocol}
      </div>
      ${friction.weeklyAction ? `
        <div class="friction-weekly">
          <strong>💡 ${lang === 'it' ? 'AZIONE QUESTA SETTIMANA' : "THIS WEEK'S ACTION"}</strong>
          ${friction.weeklyAction}
        </div>
      ` : ''}
    </div>
  `;
}

export function renderSynergyCard(synergy) {
  return `
    <div class="sync-card">
      <div class="sync-tag">✓ SINERGIA RILEVATA</div>
      <div class="sync-name">${synergy.name}</div>
      <div class="sync-desc">${synergy.description}</div>
    </div>
  `;
}

// ── Couple Manual Chapter ─────────────────────────────────

export function renderCoupleChapter(chapter, myName, ptName, lang) {
  const it = lang === 'it';

  const ptInstructionsHtml = chapter.partnerInstructions.map((inst, i) => `
    <div class="instruction-card" data-index="${i + 1}">
      <div class="instruction-title">${inst.title}</div>
      <div class="instruction-content">${inst.content}</div>
    </div>
  `).join('');

  const myInstructionsHtml = chapter.myInstructions.map((inst, i) => `
    <div class="instruction-card instruction-card-alt" data-index="${i + 1}">
      <div class="instruction-title">${inst.title}</div>
      <div class="instruction-content">${inst.content}</div>
    </div>
  `).join('');

  return `
    <section class="couple-chapter" id="couple-${chapter.id}">
      <div class="chapter-header">
        <div class="chapter-num">${chapter.number}</div>
        <div class="chapter-title-block">
          <div class="chapter-code">${chapter.code}</div>
          <h2 class="chapter-title">${chapter.moduleLabel}</h2>
          <div class="couple-styles-row">
            <span class="couple-style-tag couple-style-me">${it ? 'Tu' : 'You'}: ${chapter.myLabel}</span>
            <span class="couple-style-sep">•</span>
            <span class="couple-style-tag couple-style-pt">${ptName}: ${chapter.ptLabel}</span>
          </div>
        </div>
      </div>

      ${chapter.intro ? `<div class="chapter-intro">${chapter.intro}</div>` : ''}

      <div class="couple-section">
        <div class="couple-section-label">
          ${it ? `COME RAPPORTARTI CON ${ptName.toUpperCase()}` : `HOW TO INTERACT WITH ${ptName.toUpperCase()}`}
        </div>
        <div class="instructions-grid">${ptInstructionsHtml}</div>
      </div>

      <div class="couple-section couple-section-mine">
        <div class="couple-section-label">
          ${it ? `COSA ${ptName.toUpperCase()} DOVREBBE SAPERE DI TE` : `WHAT ${ptName.toUpperCase()} SHOULD KNOW ABOUT YOU`}
        </div>
        <div class="instructions-grid">${myInstructionsHtml}</div>
      </div>
    </section>
  `;
}

export function renderCoupleTOC(chapters, myName, ptName, lang) {
  const it = lang === 'it';
  const items = chapters.map(ch => `
    <div class="toc-item" data-target="couple-${ch.id}">
      <span class="toc-num">${ch.number}</span>
      <span class="toc-name">${ch.moduleLabel}</span>
      <span class="couple-toc-styles">${it ? 'Tu' : 'You'}: ${ch.myLabel} / ${ptName}: ${ch.ptLabel}</span>
    </div>
  `).join('');

  return `
    <div class="manual-toc">
      <div class="manual-toc-title">
        ${it ? 'MANUALE DI COPPIA — INDICE' : 'COUPLE MANUAL — TABLE OF CONTENTS'}
      </div>
      ${items}
    </div>
  `;
}
