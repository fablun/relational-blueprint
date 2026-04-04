// ============================================================
// TEST ENGINE — Rendering & navigation dei test
// ============================================================
import { scoreTest }  from './scoring.js';
import { saveTestResult } from './db.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, hideLoading } from './ui.js';

let questionsData = null;
let currentLang   = 'it';

export async function loadQuestions(lang) {
  currentLang = lang;
  const resp = await fetch(`./data/questions-${lang}.json`);
  questionsData = await resp.json();
  return questionsData;
}

// ── Render Test Intro ─────────────────────────────────────

export function renderTestIntro(testId, container, onStart) {
  if (!questionsData) throw new Error('Questions not loaded');
  const test = questionsData[testId];

  container.innerHTML = `
    <div class="test-intro">
      <div class="test-intro-code">MODULO ${getModuleNum(testId)} / 06</div>
      <h2 class="test-intro-title">${test.name}</h2>
      <p class="test-intro-subtitle">${test.subtitle}</p>
      <div class="test-intro-desc">${test.description}</div>
      <div class="test-intro-meta">
        <span>⏱ ${test.duration}</span>
        <span>📋 ${test.questions.length} ${currentLang === 'it' ? 'domande' : 'questions'}</span>
        <span>📏 ${currentLang === 'it' ? 'Scala' : 'Scale'} 1–${test.scale.max}</span>
      </div>
      <button class="btn-start-test" id="btn-start">
        ${currentLang === 'it' ? '→ Inizia il Modulo' : '→ Start Module'}
      </button>
    </div>
  `;
  container.querySelector('#btn-start').addEventListener('click', onStart);
}

// ── Render Test Questions ─────────────────────────────────

export function renderTestRunner(testId, container, onComplete) {
  if (!questionsData) throw new Error('Questions not loaded');
  const test = questionsData[testId];
  const questions = test.questions;
  const answers = {};
  let currentIndex = 0;

  function renderQuestion(idx) {
    const q = questions[idx];
    const pct = Math.round((idx / questions.length) * 100);

    // Progress bar
    document.getElementById('test-progress-fill').style.width = pct + '%';
    document.getElementById('test-progress-count').textContent =
      `${idx + 1} / ${questions.length}`;

    container.innerHTML = `
      <div class="question-block">
        <div class="question-number">
          ${currentLang === 'it' ? 'DOMANDA' : 'QUESTION'} ${idx + 1}
        </div>
        <p class="question-text">${q.text}</p>
        ${renderScale(q, test.scale, answers[q.id])}
        <div class="question-nav">
          <button class="btn-nav" id="btn-prev" ${idx === 0 ? 'disabled' : ''}>
            ← ${currentLang === 'it' ? 'Precedente' : 'Previous'}
          </button>
          <button class="btn-nav btn-next" id="btn-next" ${!answers[q.id] ? 'disabled' : ''}>
            ${idx < questions.length - 1
              ? (currentLang === 'it' ? 'Avanti →' : 'Next →')
              : (currentLang === 'it' ? '✓ Completa' : '✓ Complete')}
          </button>
        </div>
      </div>
    `;

    // Scale interaction
    container.querySelectorAll('.likert-option input').forEach(input => {
      input.addEventListener('change', () => {
        answers[q.id] = parseInt(input.value);
        container.querySelector('#btn-next').disabled = false;
        // Auto-advance after short delay if not last question
        if (idx < questions.length - 1) {
          setTimeout(() => {
            currentIndex++;
            renderQuestion(currentIndex);
          }, 350);
        }
      });
    });

    container.querySelector('#btn-prev')?.addEventListener('click', () => {
      if (currentIndex > 0) { currentIndex--; renderQuestion(currentIndex); }
    });

    container.querySelector('#btn-next').addEventListener('click', async () => {
      if (!answers[q.id]) return;
      if (idx < questions.length - 1) {
        currentIndex++;
        renderQuestion(currentIndex);
      } else {
        await completeTest(testId, answers, onComplete);
      }
    });
  }

  renderQuestion(currentIndex);
}

function renderScale(question, scale, selectedValue) {
  const options = [];
  for (let v = scale.min; v <= scale.max; v++) {
    options.push(`
      <label class="likert-option">
        <input type="radio" name="q_${question.id}" value="${v}"
          ${selectedValue === v ? 'checked' : ''}>
        <div class="likert-dot">${v}</div>
      </label>
    `);
  }

  const firstLabel = scale.labels[0] || '';
  const lastLabel  = scale.labels[scale.labels.length - 1] || '';

  return `
    <div class="likert-scale">
      <div class="likert-labels">
        <span>${firstLabel}</span>
        <span>${lastLabel}</span>
      </div>
      <div class="likert-options">${options.join('')}</div>
    </div>
  `;
}

async function completeTest(testId, answers, onComplete) {
  showLoading(currentLang === 'it' ? 'Elaborazione risultati...' : 'Processing results...');
  try {
    const result = scoreTest(testId, answers);
    const user = getCurrentUser();
    if (user) {
      await saveTestResult(user.uid, testId, result);
    }
    hideLoading();
    showToast(currentLang === 'it' ? 'Modulo completato ✓' : 'Module complete ✓', 'success');
    onComplete(testId, result);
  } catch (err) {
    hideLoading();
    showToast(currentLang === 'it' ? 'Errore nel salvataggio' : 'Save error', 'error');
    console.error(err);
  }
}

// ── Utilities ─────────────────────────────────────────────

function getModuleNum(testId) {
  const map = {
    attachment: '01', loveLanguages: '02', bigFive: '03',
    communication: '04', conflictStyle: '05', apologyLanguages: '06'
  };
  return map[testId] || '01';
}

export function getTestList() {
  if (!questionsData) return [];
  return ['attachment','loveLanguages','bigFive','communication','conflictStyle','apologyLanguages','careStyle','coreValues'].map(id => ({
    id,
    name: questionsData[id].name,
    subtitle: questionsData[id].subtitle,
    duration: questionsData[id].duration,
    questionCount: questionsData[id].questions.length
  }));
}
