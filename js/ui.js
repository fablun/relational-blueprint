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
      <div class="compare-cell" style="color:${row.match ? 'var(--success)' : 'inherit'}">${row.me}</div>
      <div class="compare-cell center">${row.trait}</div>
      <div class="compare-cell" style="color:${row.match ? 'var(--success)' : 'inherit'}">${row.partner}</div>
    </div>
  `).join('');

  return `<div class="compare-table">${headerHtml}${rowsHtml}</div>`;
}

// ── Friction / Synergy cards ──────────────────────────────

export function renderFrictionCard(friction) {
  return `
    <div class="friction-card">
      <div class="friction-tag">⚠ PUNTO DI ATTRITO</div>
      <div class="friction-name">${friction.name}</div>
      <div class="friction-desc">${friction.description}</div>
      <div class="friction-protocol">
        <strong>PROTOCOLLO OPERATIVO</strong>
        ${friction.protocol}
      </div>
    </div>
  `;
}

export function renderSynergyCard(synergy) {
  return `
    <div class="sync-card">
      <div class="sync-tag">✓ AREA DI SINCRONIZZAZIONE</div>
      <div class="sync-name">${synergy.name}</div>
      <div class="sync-desc">${synergy.description}</div>
    </div>
  `;
}
