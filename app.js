// IELTS Band Calculator BD \u2014 UI wiring. Logic lives in logic.js; strings in i18n.js.
'use strict';

(function () {
  const L = window.Logic;
  const I18N = window.I18N;
  const DESCRIPTORS_BN = window.DESCRIPTORS_BN;
  const LANG_KEY = 'ielts-band-lang';
  const HIST_KEY = 'ielts-band-history';

  let lang = 'en';
  try { lang = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { lang = 'en'; }
  if (lang !== 'bn') lang = 'en';

  let lastResult = null;
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (e) { history = []; }
  if (!Array.isArray(history)) history = [];

  function t(key) { return I18N[lang][key]; }
  function num(v) { return lang === 'bn' ? L.toBnDigits(L.fmtScore(v)) : L.fmtScore(v); }
  function numAvg(v) { return lang === 'bn' ? L.toBnDigits(L.fmtAvg(v)) : L.fmtAvg(v); }
  // Overall bands always show one decimal, per IELTS convention (7.0, not 7).
  function numBand(v) { const s = Number(v).toFixed(1); return lang === 'bn' ? L.toBnDigits(s) : s; }
  function numStr(s) { return lang === 'bn' ? L.toBnDigits(s) : s; }

  function saveHistory() {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(history)); } catch (e) { /* private mode */ }
  }
  function saveLang() {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* private mode */ }
  }

  function descriptorFor(band) {
    if (band >= 9) return lang === 'bn' ? DESCRIPTORS_BN[9] : L.DESCRIPTORS_EN[9];
    if (band <= 0) return lang === 'bn' ? DESCRIPTORS_BN[0] : L.DESCRIPTORS_EN[0];
    const k = Math.floor(band);
    return lang === 'bn' ? DESCRIPTORS_BN[k] : L.DESCRIPTORS_EN[k];
  }

  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (I18N[lang][key] !== undefined) el.textContent = I18N[lang][key];
    });
    document.getElementById('langBtn').textContent = I18N[lang].langBtn;
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    renderGuide();
    renderHistory();
    if (lastResult) {
      document.getElementById('avgVal').textContent = numAvg(lastResult.avg);
      document.getElementById('overallVal').textContent = numBand(lastResult.overall);
      document.getElementById('descVal').textContent = descriptorFor(lastResult.overall);
    }
    const saved = document.getElementById('savedNote');
    if (saved && saved.dataset.shown === '1') saved.textContent = t('savedNote');
  }

  function renderGuide() {
    const tbody = document.getElementById('guideBody');
    let html = '';
    for (let b = 9; b >= 0; b--) {
      const d = lang === 'bn' ? DESCRIPTORS_BN[b] : L.DESCRIPTORS_EN[b];
      html += '<tr><td class="num">' + numStr(String(b)) + '</td><td>' + esc(d) + '</td></tr>';
    }
    tbody.innerHTML = html;
    document.getElementById('bandCol').textContent = t('bandCol');
    document.getElementById('descCol').textContent = t('descCol');
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderHistory() {
    const box = document.getElementById('historyList');
    document.getElementById('dateCol').textContent = t('dateCol');
    document.getElementById('scoresCol').textContent = t('scoresCol');
    document.getElementById('overallCol').textContent = t('overallCol');
    if (history.length === 0) {
      box.innerHTML = '<p class="empty" id="historyEmpty">' + esc(t('historyEmpty')) + '</p>';
      return;
    }
    let html = '<table class="hist"><thead><tr><th>' + esc(t('dateCol')) + '</th><th>' +
      esc(t('scoresCol')) + '</th><th>' + esc(t('avgLabel')) + '</th><th>' +
      esc(t('overallCol')) + '</th><th></th></tr></thead><tbody>';
    history.forEach((e) => {
      const sc = L.SECTIONS.map((s) => num(e.scores[s])).join(' / ');
      html += '<tr><td>' + esc(numStr(e.date)) + '</td><td>' + sc + '</td><td>' +
        numAvg(e.avg) + '</td><td><strong>' + numBand(e.overall) + '</strong></td>' +
        '<td><button class="mini delBtn" data-id="' + esc(e.id) + '">' + esc(t('deleteBtn')) + '</button></td></tr>';
    });
    html += '</tbody></table>';
    box.innerHTML = html;
    box.querySelectorAll('.delBtn').forEach((btn) => {
      btn.addEventListener('click', () => {
        history = history.filter((e) => e.id !== btn.getAttribute('data-id'));
        saveHistory();
        renderHistory();
      });
    });
  }

  function showCalcErrors(errors) {
    L.SECTIONS.forEach((s) => {
      const el = document.getElementById('err-' + s);
      el.textContent = errors[s] ? t(errors[s]) : '';
    });
  }

  function readScores(prefix) {
    const out = {};
    L.SECTIONS.forEach((s) => {
      const raw = document.getElementById(prefix + '-' + s).value;
      out[s] = raw.trim() === '' ? null : L.parseScore(raw);
    });
    return out;
  }

  function todayStr() {
    const d = new Date();
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  document.getElementById('langBtn').addEventListener('click', () => {
    lang = lang === 'en' ? 'bn' : 'en';
    saveLang();
    applyLang();
  });

  document.getElementById('calcBtn').addEventListener('click', () => {
    const errors = {};
    const scores = {};
    let bad = false;
    L.SECTIONS.forEach((s) => {
      const raw = document.getElementById('calc-' + s).value;
      const v = L.validateScoreInput(raw);
      if (!v.ok) { errors[s] = v.error === 'empty' ? 'errEmpty' : v.error === 'range' ? 'errRange' : 'errStep'; bad = true; }
      else scores[s] = v.value;
    });
    showCalcErrors(errors);
    const result = document.getElementById('calcResult');
    const saved = document.getElementById('savedNote');
    if (bad) { result.style.display = 'none'; saved.dataset.shown = '0'; saved.textContent = ''; return; }
    const res = L.calculate(scores);
    lastResult = res;
    document.getElementById('avgVal').textContent = numAvg(res.avg);
    document.getElementById('overallVal').textContent = numBand(res.overall);
    document.getElementById('descVal').textContent = descriptorFor(res.overall);
    result.style.display = 'block';
    const entry = {
      id: 'e' + Date.now() + Math.floor(Math.random() * 1000),
      date: todayStr(), scores: scores, avg: res.avg, overall: res.overall
    };
    history.unshift(entry);
    history = history.slice(0, 20);
    saveHistory();
    renderHistory();
    saved.dataset.shown = '1';
    saved.textContent = t('savedNote');
  });

  document.getElementById('planBtn').addEventListener('click', () => {
    const target = parseFloat(document.getElementById('plan-target').value);
    const known = readScores('plan');
    let bad = false;
    L.SECTIONS.forEach((s) => {
      const el = document.getElementById('plan-err-' + s);
      const v = known[s];
      if (v !== null && !L.isValidScore(v)) { el.textContent = t(v < 0 || v > 9 ? 'errRange' : 'errStep'); bad = true; }
      else el.textContent = '';
    });
    const box = document.getElementById('planResult');
    if (bad) { box.style.display = 'none'; return; }
    const plan = L.planTarget(target, known);
    let html = '';
    if (plan.missing.length === 0) {
      html = '<p>' + esc(t('planAllKnown')) + ' <strong>' + numBand(plan.overall) + '</strong> (' +
        esc(descriptorFor(plan.overall)) + '). ' +
        esc(plan.meets ? t('planMeets') : t('planNotMeets')) + '</p>';
    } else if (!plan.feasible) {
      html = '<p class="warn">' + esc(t('planImpossible')) + '</p>';
    } else if (plan.meets) {
      html = '<p>' + esc(t('planAlready')) + '</p>';
    } else {
      html = '<p>' + esc(t('planNeed')) + ' <strong>' + num(plan.need) + '</strong> ' +
        esc(t('planFrom')) + '</p>';
      html += '<p>' + esc(t('planEven')) + ' <strong>' + num(plan.evenSplit) + '</strong> ' +
        esc(t('planEach')) + '</p>';
      html += '<p>' + esc(t('planMinEach')) + ' <strong>' + num(plan.minEach) + '</strong></p>';
    }
    box.innerHTML = html;
    box.style.display = 'block';
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    const input = document.getElementById('clearInput');
    const msg = document.getElementById('clearMsg');
    if (input.value.trim() !== 'DELETE') { msg.textContent = t('clearWrong'); return; }
    history = [];
    saveHistory();
    renderHistory();
    input.value = '';
    msg.textContent = t('clearDone');
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const data = { app: 'ielts-band-bd', version: 1, entries: history };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ielts-band-history.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('importFile').addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    const msg = document.getElementById('importMsg');
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { msg.textContent = t('importFail'); return; }
      const v = L.validateImport(data);
      if (!v.ok) { msg.textContent = t('importFail'); return; }
      history = v.entries.slice(0, 20);
      saveHistory();
      renderHistory();
      msg.textContent = t('importOk');
    };
    reader.readAsText(file);
    ev.target.value = '';
  });

  // Target select options 4.0 - 9.0 step 0.5.
  const sel = document.getElementById('plan-target');
  for (let v = 4; v <= 9.0001; v += 0.5) {
    const o = document.createElement('option');
    o.value = String(Math.round(v * 10) / 10);
    o.textContent = (Math.round(v * 10) / 10).toFixed(1);
    if (v === 7) o.selected = true;
    sel.appendChild(o);
  }

  applyLang();
})();
