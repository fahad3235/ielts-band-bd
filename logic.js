// IELTS Band Calculator BD \u2014 pure logic (Node-testable, no DOM).
// IELTS overall-band rule (official): the mean of the four section scores is
// rounded to the nearest half band; a mean ending in .25 rounds up to the next
// half band and a mean ending in .75 rounds up to the next whole band. That is
// exactly round-half-up to the nearest 0.5: floor(mean*2 + 0.5) / 2.
// Consequence: the smallest mean that rounds to target T is T - 0.25.
'use strict';

const SECTIONS = ['listening', 'reading', 'writing', 'speaking'];

const DESCRIPTORS_EN = {
  9: 'Expert user',
  8: 'Very good user',
  7: 'Good user',
  6: 'Competent user',
  5: 'Modest user',
  4: 'Limited user',
  3: 'Extremely limited user',
  2: 'Intermittent user',
  1: 'Non-user',
  0: 'Did not attempt the test'
};

function isValidScore(v) {
  if (typeof v !== 'number' || !isFinite(v)) return false;
  if (v < 0 || v > 9) return false;
  // Must be a multiple of 0.5 (IELTS reports half bands only).
  return Math.abs(v * 2 - Math.round(v * 2)) < 1e-9;
}

function parseScore(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === '') return null;
  const v = Number(s);
  if (!isFinite(v)) return null;
  return v;
}

// Validate one raw input string. Returns {ok, value} or {ok:false, error}.
function validateScoreInput(raw) {
  const v = parseScore(raw);
  if (v === null) return { ok: false, error: 'empty' };
  if (v < 0 || v > 9) return { ok: false, error: 'range' };
  if (!isValidScore(v)) return { ok: false, error: 'step' };
  return { ok: true, value: v };
}

function roundBand(avg) {
  const r = Math.floor(avg * 2 + 0.5) / 2;
  return Math.round(Math.min(9, Math.max(0, r)) * 10) / 10;
}

function average(scores) {
  const sum = SECTIONS.reduce((a, s) => a + scores[s], 0);
  return sum / 4;
}

function calculate(scores) {
  for (const s of SECTIONS) {
    if (!isValidScore(scores[s])) return { ok: false, error: 'invalid:' + s };
  }
  // Means of half-step scores are exact multiples of 0.125, so keep the
  // exact mean here; display formatting (fmtAvg) trims to at most 3 decimals.
  const avg = average(scores);
  return { ok: true, avg: avg, overall: roundBand(avg) };
}

// Whole-band descriptor; half bands use the descriptor of the band below
// (e.g. 6.5 -> Competent user), matching how IELTS describes whole bands.
function descriptorFor(band) {
  if (band >= 9) return DESCRIPTORS_EN[9];
  if (band <= 0) return DESCRIPTORS_EN[0];
  return DESCRIPTORS_EN[Math.floor(band)];
}

function minAvgForTarget(target) {
  if (target <= 0) return 0;
  return Math.round((target - 0.25) * 100) / 100;
}

function ceilToHalf(x) {
  return Math.ceil(x * 2 - 1e-9) / 2;
}

// Plan to reach `target` given known section scores (null = not yet taken).
// Returns {feasible, meets, requiredSum, need, missing, evenSplit, minEach, overall?}
function planTarget(target, known) {
  const missing = SECTIONS.filter((s) => known[s] === null || known[s] === undefined);
  const knownSum = SECTIONS.reduce((a, s) => a + (known[s] || 0), 0);
  const requiredSum = 4 * minAvgForTarget(target);
  const need = Math.round((requiredSum - knownSum) * 100) / 100;
  if (missing.length === 0) {
    const res = calculate(known);
    return {
      feasible: res.ok && res.overall >= target,
      meets: res.ok && res.overall >= target,
      requiredSum, need: 0, missing: [], evenSplit: null, minEach: null,
      overall: res.ok ? res.overall : null, avg: res.ok ? res.avg : null
    };
  }
  if (need <= 0) {
    return {
      feasible: true, meets: true, requiredSum, need: 0,
      missing, evenSplit: 0, minEach: 0, overall: null, avg: null
    };
  }
  if (need > missing.length * 9) {
    return {
      feasible: false, meets: false, requiredSum, need,
      missing, evenSplit: null, minEach: null, overall: null, avg: null
    };
  }
  return {
    feasible: true, meets: false, requiredSum, need,
    missing,
    evenSplit: ceilToHalf(need / missing.length),
    minEach: Math.max(0, ceilToHalf(need - 9 * (missing.length - 1))),
    overall: null, avg: null
  };
}

function fmtScore(v) {
  if (v === null || v === undefined) return '';
  const r = Math.round(v * 100) / 100;
  return String(r);
}

// Exact display for means: at most 3 decimals, trailing zeros trimmed
// (5.875 stays 5.875; 6.75 stays 6.75; 7.0 shows as 7).
function fmtAvg(v) {
  if (v === null || v === undefined) return '';
  return String(Math.round(v * 1000) / 1000);
}

const BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
function toBnDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

// Strict history import validation. Returns {ok, entries} or {ok:false, error}.
function validateImport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'not-object' };
  if (data.app !== 'ielts-band-bd') return { ok: false, error: 'wrong-app' };
  if (data.version !== 1) return { ok: false, error: 'wrong-version' };
  if (!Array.isArray(data.entries)) return { ok: false, error: 'no-entries' };
  if (data.entries.length > 100) return { ok: false, error: 'too-many' };
  const seen = new Set();
  for (const e of data.entries) {
    if (!e || typeof e !== 'object') return { ok: false, error: 'bad-entry' };
    if (typeof e.id !== 'string' || e.id === '' || seen.has(e.id)) return { ok: false, error: 'bad-id' };
    seen.add(e.id);
    if (typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return { ok: false, error: 'bad-date' };
    if (!e.scores || typeof e.scores !== 'object') return { ok: false, error: 'bad-scores' };
    for (const s of SECTIONS) {
      if (!isValidScore(e.scores[s])) return { ok: false, error: 'bad-score' };
    }
    const res = calculate(e.scores);
    if (!res.ok) return { ok: false, error: 'bad-calc' };
    if (Math.abs(res.avg - e.avg) > 0.011) return { ok: false, error: 'avg-mismatch' };
    if (res.overall !== e.overall) return { ok: false, error: 'overall-mismatch' };
  }
  return { ok: true, entries: data.entries };
}

const Logic = {
  SECTIONS, DESCRIPTORS_EN, isValidScore, parseScore, validateScoreInput,
  roundBand, average, calculate, descriptorFor, minAvgForTarget, ceilToHalf,
  planTarget, fmtScore, fmtAvg, toBnDigits, validateImport
};
if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
if (typeof window !== 'undefined') window.Logic = Logic;
