// ============================================================
// APP.JS — Main SPA Router & Controller
// ============================================================
import { initAuth, onAuthChange, getCurrentUser, getCurrentProfile,
         signInGoogle, signInEmail, signUpEmail, resetPassword,
         signOutUser, refreshProfile } from './auth.js';
import { loadQuestions, renderTestIntro, renderTestRunner, getTestList } from './test-engine.js';
import { loadManualTemplates, generateManual, generateCoupleReport } from './manual-generator.js';
import { getTestResults, findUserByPartnerCode, linkPartners,
         getPartnerProfile, updateUserProfile } from './db.js';
import { showToast, showLoading, hideLoading,
         renderManualChapter, renderTOC, animateScoreBars,
         renderCompareTable, renderFrictionCard, renderSynergyCard } from './ui.js';

// ── State ─────────────────────────────────────────────────
const state = {
  lang: localStorage.getItem('rb_lang') || 'it',
  currentView: 'landing',
  testResults: {},
  partnerProfile: null
};

// ── Init ──────────────────────────────────────────────────

async function init() {
  // Mostra schermata di caricamento finché Firebase non risolve la sessione
  showInitLoader();

  await Promise.all([
    loadQuestions(state.lang),
    loadManualTemplates(state.lang)
  ]);

  // Prima onAuthChange risolve lo stato, poi avviamo il router
  await new Promise(resolve => {
    initAuth(state.lang);

    onAuthChange(async (user, profile) => {
      if (user && profile) {
        state.testResults = await getTestResults(user.uid);
        if (profile.partnerId) {
          state.partnerProfile = await getPartnerProfile(profile.partnerId);
        }
        updateAuthUI(user, profile);
        document.getElementById('app-header').style.display = 'flex';
        hideInitLoader();
        navigate('dashboard');
      } else {
        document.getElementById('app-header').style.display = 'none';
        hideInitLoader();
        navigate('landing');
      }
      resolve(); // dopo il primo fire non serve più aspettare
    });
  });

  setupRouter();
  setupLangSwitcher();
  setupSignOutBtn();
}

function showInitLoader() {
  const el = document.createElement('div');
  el.id = 'init-loader';
  el.style.cssText = `
    position:fixed;inset:0;background:var(--ink);
    display:flex;align-items:center;justify-content:center;
    z-index:9999;flex-direction:column;gap:16px;
  `;
  el.innerHTML = `
    <div style="font-family:'IBM Plex Mono',monospace;font-size:18px;color:#fff;letter-spacing:-0.02em">
      Relational <span style="color:#0ea5e9;border-bottom:2px solid #0ea5e9">Blueprint</span>
    </div>
    <div style="width:32px;height:32px;border:2px solid rgba(255,255,255,0.1);
      border-top-color:#0ea5e9;border-radius:50%;animation:spin 0.7s linear infinite">
    </div>
  `;
  document.body.appendChild(el);
}

function hideInitLoader() {
  const el = document.getElementById('init-loader');
  if (!el) return;
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.2s';
  setTimeout(() => el.remove(), 200);
}

// ── Router ────────────────────────────────────────────────

function setupRouter() {
  // routeFromHash() solo su navigazione successiva (back/forward)
  // Il primo render è già gestito da onAuthChange
  window.addEventListener('hashchange', () => {
    if (getCurrentUser()) routeFromHash();
  });
}

function routeFromHash() {
  const hash = window.location.hash.replace('#', '') || 'landing';
  const [view, param] = hash.split('/');
  renderView(view, param);
}

function navigate(view, param) {
  state.currentView = view;
  const hash = param ? `#${view}/${param}` : `#${view}`;
  history.pushState(null, '', hash);
  renderView(view, param);
}

function renderView(view, param) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Update nav
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  const user = getCurrentUser();

  switch (view) {
    case 'landing':    renderLanding();    break;
    case 'dashboard':  if (user) renderDashboard(); else navigate('landing'); break;
    case 'test':       if (user) renderTest(param); else navigate('landing'); break;
    case 'manual':     if (user) renderManual();    else navigate('landing'); break;
    case 'sync':       if (user) renderSync();      else navigate('landing'); break;
    case 'report':     if (user) renderReport();    else navigate('landing'); break;
    default:           navigate('dashboard');
  }
}

// ── Landing View ──────────────────────────────────────────

function renderLanding() {
  showView('landing');
}

// ── Dashboard View ────────────────────────────────────────

async function renderDashboard() {
  showView('dashboard');
  const profile = getCurrentProfile();
  const tests = getTestList();

  // Header
  const completedCount = Object.keys(state.testResults).length;
  const pct = Math.round((completedCount / 4) * 100);

  document.getElementById('dash-user-name').textContent =
    profile?.displayName?.split(' ')[0] || 'Utente';
  document.getElementById('dash-partner-code').textContent =
    profile?.partnerCode || '------';
  document.getElementById('dash-progress-fill').style.width = pct + '%';
  document.getElementById('dash-progress-label').textContent =
    `${completedCount}/4 ${state.lang === 'it' ? 'moduli completati' : 'modules completed'}`;

  // CTA
  const ctaEl = document.getElementById('dash-cta');
  if (completedCount === 4) {
    ctaEl.innerHTML = `
      <div class="dashboard-cta-text">
        <h3>${state.lang === 'it' ? 'Il tuo Manuale è pronto' : 'Your Manual is ready'}</h3>
        <p>${state.lang === 'it' ? 'Tutti i moduli completati. Visualizza le tue istruzioni operative.' : 'All modules complete. View your operational instructions.'}</p>
      </div>
      <button class="btn-primary" onclick="window.app.navigate('manual')">
        ${state.lang === 'it' ? '→ Visualizza Manuale' : '→ View Manual'}
      </button>
    `;
    ctaEl.style.display = 'flex';
  } else if (completedCount > 0) {
    const nextTest = tests.find(t => !state.testResults[t.id]);
    ctaEl.innerHTML = `
      <div class="dashboard-cta-text">
        <h3>${state.lang === 'it' ? 'Continua il profilo' : 'Continue your profile'}</h3>
        <p>${state.lang === 'it' ? `Prossimo modulo: ${nextTest?.name}` : `Next module: ${nextTest?.name}`}</p>
      </div>
      <button class="btn-primary" onclick="window.app.navigate('test', '${nextTest?.id}')">
        ${state.lang === 'it' ? '→ Continua' : '→ Continue'}
      </button>
    `;
    ctaEl.style.display = 'flex';
  } else {
    ctaEl.style.display = 'flex';
  }

  // Test cards
  const grid = document.getElementById('tests-grid');
  const testOrder = ['attachment','loveLanguages','bigFive','communication'];
  const moduleNums = ['01','02','03','04'];
  const moduleNames = {
    it: { attachment:'Attaccamento', loveLanguages:"Linguaggi dell'Amore", bigFive:'Big Five OCEAN', communication:'Stile Comunicativo' },
    en: { attachment:'Attachment', loveLanguages:'Love Languages', bigFive:'Big Five OCEAN', communication:'Communication Style' }
  };

  const resultLabels = {
    it: {
      attachment: { secure:'Sicuro', anxious:'Ansioso', avoidant:'Evitante', fearful:'Disorganizzato' },
      loveLanguages: { words:'Parole', time:'Tempo', gifts:'Doni', acts:'Atti', touch:'Contatto' },
      communication: { rapport:'Rapport Talk', report:'Report Talk', balanced:'Bilanciato' }
    },
    en: {
      attachment: { secure:'Secure', anxious:'Anxious', avoidant:'Avoidant', fearful:'Fearful' },
      loveLanguages: { words:'Words', time:'Time', gifts:'Gifts', acts:'Acts', touch:'Touch' },
      communication: { rapport:'Rapport Talk', report:'Report Talk', balanced:'Balanced' }
    }
  };

  grid.innerHTML = testOrder.map((id, i) => {
    const test = tests.find(t => t.id === id);
    const done = !!state.testResults[id];
    const result = state.testResults[id];
    const rl = resultLabels[state.lang] || resultLabels.it;

    let resultStr = '';
    if (done && result) {
      if (id === 'attachment')    resultStr = rl.attachment[result.style] || '';
      if (id === 'loveLanguages') resultStr = rl.loveLanguages[result.primary] || '';
      if (id === 'bigFive')       resultStr = `${state.lang === 'it' ? 'Dominante' : 'Dominant'}: ${result.dominant}`;
      if (id === 'communication') resultStr = rl.communication[result.style] || '';
    }

    return `
      <div class="test-card ${done ? 'completed' : ''}"
           onclick="window.app.navigate('test', '${id}')">
        <div class="test-card-header">
          <span class="test-card-code">MOD.${moduleNums[i]}</span>
          <span class="test-card-status ${done ? 'status-done' : 'status-pending'}">
            ${done ? '✓ DONE' : (state.lang === 'it' ? 'DA FARE' : 'TODO')}
          </span>
        </div>
        <h3 class="test-card-title">${test?.name || moduleNames[state.lang]?.[id]}</h3>
        <p class="test-card-subtitle">${test?.subtitle || ''}</p>
        <div class="test-card-meta">
          <span>⏱ ${test?.duration || ''}</span>
          <span>📋 ${test?.questionCount || ''} ${state.lang === 'it' ? 'domande' : 'q.'}</span>
        </div>
        ${done && resultStr ? `
          <div class="test-card-result">
            <div class="result-label">${state.lang === 'it' ? 'RISULTATO' : 'RESULT'}</div>
            ${resultStr}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Partner section
  updatePartnerSection(profile);
}

function updatePartnerSection(profile) {
  const el = document.getElementById('dash-partner-status');
  if (!el) return;
  if (profile?.partnerId && state.partnerProfile) {
    const pt = state.partnerProfile;
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        ${pt.photoURL ? `<img src="${pt.photoURL}" style="width:32px;height:32px;border-radius:50%;border:2px solid var(--success)">` : ''}
        <div>
          <div class="text-mono text-xs text-faint">${state.lang === 'it' ? 'IN SYNC CON' : 'IN SYNC WITH'}</div>
          <div class="text-mono" style="color:var(--success)">${pt.displayName || 'Partner'}</div>
        </div>
        <button class="btn-secondary" onclick="window.app.navigate('report')">
          ${state.lang === 'it' ? '→ Vedi Report' : '→ View Report'}
        </button>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="text-mono text-xs text-faint" style="margin-bottom:8px">
        ${state.lang === 'it' ? 'NESSUN PARTNER COLLEGATO' : 'NO PARTNER LINKED'}
      </div>
      <button class="btn-secondary" onclick="window.app.navigate('sync')">
        ${state.lang === 'it' ? '→ Collega Partner' : '→ Link Partner'}
      </button>
    `;
  }
}

// ── Test View ─────────────────────────────────────────────

function renderTest(testId) {
  if (!testId) { navigate('dashboard'); return; }
  showView('test');

  const container = document.getElementById('test-content');
  const alreadyDone = !!state.testResults[testId];
  const label = alreadyDone
    ? (state.lang === 'it' ? 'RIFARE IL TEST' : 'RETAKE TEST')
    : (state.lang === 'it' ? 'INIZIA' : 'START');

  // Show intro first
  renderTestIntro(testId, container, () => {
    renderTestRunner(testId, container, async (id, result) => {
      state.testResults[id] = result;
      navigate('dashboard');
    });
  });
}

// ── Manual View ───────────────────────────────────────────

async function renderManual() {
  showView('manual');
  const profile = getCurrentProfile();
  const manual = generateManual(state.testResults, state.lang);

  // Cover
  document.getElementById('manual-owner-name').textContent =
    profile?.displayName || 'Utente';
  document.getElementById('manual-version').textContent =
    `v${manual.version} — ${formatDate(manual.generatedAt)}`;
  document.getElementById('manual-partner-code-val').textContent =
    profile?.partnerCode || '------';

  const completeness = manual.completeness;
  document.getElementById('manual-completeness').textContent =
    `${completeness}% ${state.lang === 'it' ? 'completo' : 'complete'}`;

  // Body
  const body = document.getElementById('manual-body');
  const validChapters = manual.chapters.filter(Boolean);

  if (validChapters.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">
          ${state.lang === 'it' ? 'Nessun modulo completato' : 'No modules completed'}
        </div>
        <div class="empty-state-desc">
          ${state.lang === 'it'
            ? 'Completa almeno un test per generare il tuo manuale.'
            : 'Complete at least one test to generate your manual.'}
        </div>
      </div>
    `;
    return;
  }

  const tocHtml = renderTOC(validChapters, state.lang);
  const chaptersHtml = validChapters.map(ch => renderManualChapter(ch)).join('');

  body.innerHTML = tocHtml + chaptersHtml;

  // TOC click handlers
  body.querySelectorAll('.toc-item[data-target]').forEach(item => {
    item.addEventListener('click', () => {
      const el = document.getElementById(item.dataset.target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Animate bars after paint
  setTimeout(() => animateScoreBars(body), 100);
}

// ── Sync View ─────────────────────────────────────────────

function renderSync() {
  showView('sync');
  const profile = getCurrentProfile();

  const container = document.getElementById('sync-content');
  container.innerHTML = `
    <div class="sync-panel">
      <h2 class="sync-panel-title">
        ${state.lang === 'it' ? 'Collega il Partner' : 'Link Your Partner'}
      </h2>
      <p class="sync-panel-desc">
        ${state.lang === 'it'
          ? 'Condividi il tuo codice con il partner, poi inserisci il suo per collegarvi.'
          : 'Share your code with your partner, then enter theirs to link up.'}
      </p>

      <div style="background:var(--blueprint-light);border-left:4px solid var(--blueprint);padding:16px;border-radius:0 4px 4px 0;margin-bottom:24px">
        <div class="text-mono text-xs text-faint" style="margin-bottom:4px">
          ${state.lang === 'it' ? 'IL TUO CODICE PARTNER' : 'YOUR PARTNER CODE'}
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-family:var(--mono);font-size:28px;letter-spacing:0.15em;color:var(--blueprint)">
            ${profile?.partnerCode || '------'}
          </span>
          <button class="btn-copy" id="copy-code">
            ${state.lang === 'it' ? 'Copia' : 'Copy'}
          </button>
        </div>
      </div>

      <div class="input-group">
        <label class="input-label">
          ${state.lang === 'it' ? 'INSERISCI IL CODICE DEL PARTNER' : "ENTER PARTNER'S CODE"}
        </label>
        <input class="input-field" type="text" id="partner-code-input"
          placeholder="${state.lang === 'it' ? 'es: AB3XKM' : 'e.g.: AB3XKM'}"
          maxlength="6">
      </div>
      <div id="sync-error" style="color:var(--danger);font-family:var(--mono);font-size:12px;margin-bottom:12px;display:none"></div>
      <button class="btn-sync" id="btn-link-partner">
        ${state.lang === 'it' ? '→ Collegati' : '→ Link Up'}
      </button>

      ${profile?.partnerId && state.partnerProfile ? `
        <hr class="divider">
        <div style="font-family:var(--mono);font-size:12px;color:var(--ink-muted);margin-bottom:12px">
          ${state.lang === 'it' ? 'ATTUALMENTE IN SYNC CON:' : 'CURRENTLY LINKED TO:'}
          <strong style="color:var(--success)">${state.partnerProfile.displayName || 'Partner'}</strong>
        </div>
        <button class="btn-secondary" id="btn-unlink" style="width:100%">
          ${state.lang === 'it' ? 'Rimuovi collegamento' : 'Remove link'}
        </button>
      ` : ''}
    </div>
  `;

  // Copy code
  document.getElementById('copy-code')?.addEventListener('click', () => {
    navigator.clipboard.writeText(profile?.partnerCode || '');
    showToast(state.lang === 'it' ? 'Codice copiato!' : 'Code copied!', 'success');
  });

  // Format input: uppercase
  document.getElementById('partner-code-input')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '');
  });

  // Link button
  document.getElementById('btn-link-partner')?.addEventListener('click', async () => {
    const code = document.getElementById('partner-code-input').value.trim();
    if (code.length !== 6) {
      showSyncError(state.lang === 'it' ? 'Il codice deve essere di 6 caratteri' : 'Code must be 6 characters');
      return;
    }
    await linkPartnerByCode(code);
  });

  // Unlink
  document.getElementById('btn-unlink')?.addEventListener('click', async () => {
    const { unlinkPartner } = await import('./db.js');
    const user = getCurrentUser();
    const prof = getCurrentProfile();
    if (!prof.partnerId) return;
    showLoading();
    try {
      await unlinkPartner(user.uid, prof.partnerId);
      state.partnerProfile = null;
      await refreshProfileAndReload();
      showToast(state.lang === 'it' ? 'Collegamento rimosso' : 'Link removed', 'success');
      renderSync();
    } catch (e) {
      hideLoading();
      showToast('Errore', 'error');
    }
  });
}

async function linkPartnerByCode(code) {
  const user = getCurrentUser();
  const prof = getCurrentProfile();
  const errorEl = document.getElementById('sync-error');
  const btn = document.getElementById('btn-link-partner');

  // Prevent self-link
  if (code === prof.partnerCode) {
    showSyncError(state.lang === 'it' ? 'Non puoi collegare te stesso/a' : "Can't link to yourself");
    return;
  }

  btn.disabled = true;
  btn.textContent = state.lang === 'it' ? 'Ricerca...' : 'Searching...';
  errorEl.style.display = 'none';

  try {
    const partner = await findUserByPartnerCode(code);
    if (!partner) {
      showSyncError(state.lang === 'it' ? 'Codice non trovato' : 'Code not found');
      btn.disabled = false;
      btn.textContent = state.lang === 'it' ? '→ Collegati' : '→ Link Up';
      return;
    }

    showLoading(state.lang === 'it' ? 'Collegamento in corso...' : 'Linking...');
    await linkPartners(user.uid, partner.uid);
    state.partnerProfile = partner;
    await refreshProfileAndReload();
    hideLoading();
    showToast(
      state.lang === 'it'
        ? `Collegato con ${partner.displayName}!`
        : `Linked with ${partner.displayName}!`,
      'success'
    );
    navigate('report');
  } catch (err) {
    hideLoading();
    showSyncError('Errore: ' + err.message);
    btn.disabled = false;
    btn.textContent = state.lang === 'it' ? '→ Collegati' : '→ Link Up';
  }
}

function showSyncError(msg) {
  const el = document.getElementById('sync-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// ── Report View ───────────────────────────────────────────

async function renderReport() {
  showView('report');
  const profile  = getCurrentProfile();
  const partner  = state.partnerProfile;

  if (!partner) {
    document.getElementById('report-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔗</div>
        <div class="empty-state-title">
          ${state.lang === 'it' ? 'Nessun partner collegato' : 'No partner linked'}
        </div>
        <div class="empty-state-desc">
          ${state.lang === 'it'
            ? 'Collega un partner per generare il Report di Interfaccia.'
            : 'Link a partner to generate the Interface Report.'}
        </div>
        <button class="btn-secondary" style="margin-top:24px" onclick="window.app.navigate('sync')">
          ${state.lang === 'it' ? '→ Collega Partner' : '→ Link Partner'}
        </button>
      </div>
    `;
    return;
  }

  // Update header
  document.getElementById('report-my-name').textContent =
    profile?.displayName?.split(' ')[0] || 'Tu';
  document.getElementById('report-partner-name').textContent =
    partner.displayName?.split(' ')[0] || 'Partner';

  // Load partner results
  const partnerResults = partner.testResults || {};
  const myResults = state.testResults;

  const hasEnoughData = Object.keys(myResults).length > 0 && Object.keys(partnerResults).length > 0;

  if (!hasEnoughData) {
    document.getElementById('report-body').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">
          ${state.lang === 'it' ? 'Dati insufficienti' : 'Not enough data'}
        </div>
        <div class="empty-state-desc">
          ${state.lang === 'it'
            ? 'Entrambi i partner devono completare almeno un test.'
            : 'Both partners need to complete at least one test.'}
        </div>
      </div>
    `;
    return;
  }

  const report = generateCoupleReport(myResults, partnerResults, state.lang);

  const myName = profile?.displayName?.split(' ')[0] || 'Tu';
  const ptName = partner.displayName?.split(' ')[0] || 'Partner';

  let bodyHtml = '';

  // Section A: Comparison table
  if (report.comparisonRows.length > 0) {
    bodyHtml += `
      <div class="report-section">
        <div class="report-section-header">
          <span class="report-section-code">SEZ. A</span>
          <h3 class="report-section-title">
            ${state.lang === 'it' ? 'Tabella di Confronto' : 'Comparison Table'}
          </h3>
        </div>
        ${renderCompareTable(report.comparisonRows, myName, ptName, state.lang)}
      </div>
    `;
  }

  // Section B: Friction points
  bodyHtml += `
    <div class="report-section">
      <div class="report-section-header">
        <span class="report-section-code">SEZ. B</span>
        <h3 class="report-section-title">
          ${state.lang === 'it' ? 'Punti di Attrito Identificati' : 'Identified Friction Points'}
        </h3>
      </div>
      ${report.frictions.length > 0
        ? report.frictions.map(renderFrictionCard).join('')
        : `<div class="sync-card">
             <div class="sync-tag">✓ NESSUN ATTRITO CRITICO</div>
             <div class="sync-name">${state.lang === 'it' ? 'Profili compatibili' : 'Compatible profiles'}</div>
             <div class="sync-desc">
               ${state.lang === 'it'
                 ? 'Non sono state rilevate incompatibilità critiche basate sui profili attuali.'
                 : 'No critical incompatibilities detected based on current profiles.'}
             </div>
           </div>`
      }
    </div>
  `;

  // Section C: Synergies
  if (report.synergies.length > 0) {
    bodyHtml += `
      <div class="report-section">
        <div class="report-section-header">
          <span class="report-section-code">SEZ. C</span>
          <h3 class="report-section-title">
            ${state.lang === 'it' ? 'Aree di Sincronizzazione' : 'Sync Areas'}
          </h3>
        </div>
        ${report.synergies.map(renderSynergyCard).join('')}
      </div>
    `;
  }

  document.getElementById('report-body').innerHTML = bodyHtml;
}

// ── UI Helpers ────────────────────────────────────────────

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`view-${viewId}`);
  if (el) {
    el.classList.add('active');
    window.scrollTo(0, 0);
  }
}

function updateAuthUI(user, profile) {
  const chip = document.getElementById('user-chip');
  if (chip) {
    chip.innerHTML = `
      ${user.photoURL ? `<img src="${user.photoURL}" alt="">` : ''}
      <span>${user.displayName?.split(' ')[0] || user.email}</span>
    `;
  }
}

async function refreshProfileAndReload() {
  const { refreshProfile } = await import('./auth.js');
  await refreshProfile();
  state.testResults = await getTestResults(getCurrentUser().uid);
  const prof = getCurrentProfile();
  if (prof?.partnerId) {
    state.partnerProfile = await getPartnerProfile(prof.partnerId);
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(state.lang === 'it' ? 'it-IT' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ── Language Switcher ─────────────────────────────────────

function setupLangSwitcher() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === state.lang);
    btn.addEventListener('click', async () => {
      const newLang = btn.dataset.lang;
      if (newLang === state.lang) return;
      state.lang = newLang;
      localStorage.setItem('rb_lang', newLang);
      document.querySelectorAll('.lang-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.lang === newLang)
      );
      showLoading(newLang === 'it' ? 'Cambio lingua...' : 'Switching language...');
      await loadQuestions(newLang);
      await loadManualTemplates(newLang);
      hideLoading();
      renderView(state.currentView);
    });
  });
}

// ── Sign out ──────────────────────────────────────────────

function setupSignOutBtn() {
  document.getElementById('btn-signout')?.addEventListener('click', async () => {
    await signOutUser();
    navigate('landing');
  });
}

// ── Auth buttons (landing) ────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {

  // Google
  document.getElementById('btn-google')?.addEventListener('click', async () => {
    try { await signInGoogle(); }
    catch (e) { showAuthError(e); }
  });

  // Toggle login / registrazione
  document.getElementById('toggle-auth-mode')?.addEventListener('click', () => {
    const isLogin = document.getElementById('auth-form').dataset.mode !== 'register';
    setAuthMode(isLogin ? 'register' : 'login');
  });

  // Password reset
  document.getElementById('btn-forgot')?.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    if (!email) { showAuthError({ message: state.lang === 'it' ? 'Inserisci l\'email prima' : 'Enter email first' }); return; }
    try {
      await resetPassword(email);
      showToast(state.lang === 'it' ? 'Email di reset inviata!' : 'Reset email sent!', 'success');
    } catch(e) { showAuthError(e); }
  });

  // Submit form (login o registrazione)
  document.getElementById('auth-submit')?.addEventListener('click', async () => {
    const mode     = document.getElementById('auth-form').dataset.mode || 'login';
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name     = document.getElementById('auth-name')?.value.trim();

    if (!email || !password) {
      showAuthError({ message: state.lang === 'it' ? 'Compila tutti i campi' : 'Fill in all fields' });
      return;
    }
    if (mode === 'register' && password.length < 6) {
      showAuthError({ message: state.lang === 'it' ? 'Password minimo 6 caratteri' : 'Password min 6 characters' });
      return;
    }

    const btn = document.getElementById('auth-submit');
    btn.disabled = true;
    btn.textContent = '...';

    try {
      if (mode === 'register') {
        await signUpEmail(email, password, name);
      } else {
        await signInEmail(email, password);
      }
    } catch(e) {
      showAuthError(e);
      btn.disabled = false;
      btn.textContent = mode === 'register'
        ? (state.lang === 'it' ? 'Crea account' : 'Create account')
        : (state.lang === 'it' ? 'Accedi' : 'Sign in');
    }
  });

  // Nav links
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });
});

function setAuthMode(mode) {
  const form    = document.getElementById('auth-form');
  const nameEl  = document.getElementById('auth-name-group');
  const submit  = document.getElementById('auth-submit');
  const toggle  = document.getElementById('toggle-auth-mode');
  const forgot  = document.getElementById('btn-forgot');
  const title   = document.getElementById('auth-title');
  const sub     = document.getElementById('auth-sub');

  form.dataset.mode = mode;
  document.getElementById('auth-error').textContent = '';

  if (mode === 'register') {
    if (nameEl) nameEl.style.display = 'block';
    if (forgot) forgot.style.display = 'none';
    submit.textContent  = state.lang === 'it' ? 'Crea account' : 'Create account';
    toggle.textContent  = state.lang === 'it' ? 'Hai già un account? Accedi' : 'Already have an account? Sign in';
    title.textContent   = state.lang === 'it' ? 'Crea il tuo account' : 'Create your account';
    sub.textContent     = state.lang === 'it' ? 'Inizia a costruire il tuo Manuale' : 'Start building your Manual';
  } else {
    if (nameEl) nameEl.style.display = 'none';
    if (forgot) forgot.style.display = 'block';
    submit.textContent  = state.lang === 'it' ? 'Accedi' : 'Sign in';
    toggle.textContent  = state.lang === 'it' ? 'Non hai un account? Registrati' : "Don't have an account? Sign up";
    title.textContent   = state.lang === 'it' ? 'Bentornato' : 'Welcome back';
    sub.textContent     = state.lang === 'it' ? 'Accedi per continuare' : 'Sign in to continue';
  }
}

function showAuthError(err) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  const map = {
    'auth/user-not-found':       state.lang === 'it' ? 'Account non trovato' : 'Account not found',
    'auth/wrong-password':       state.lang === 'it' ? 'Password errata' : 'Wrong password',
    'auth/email-already-in-use': state.lang === 'it' ? 'Email già registrata' : 'Email already in use',
    'auth/invalid-email':        state.lang === 'it' ? 'Email non valida' : 'Invalid email',
    'auth/weak-password':        state.lang === 'it' ? 'Password troppo debole' : 'Password too weak',
    'auth/invalid-credential':   state.lang === 'it' ? 'Email o password errati' : 'Wrong email or password',
  };
  el.textContent = map[err.code] || err.message;
}

// Expose navigate globally for onclick handlers
window.app = { navigate };

// ── Boot ──────────────────────────────────────────────────
init();
