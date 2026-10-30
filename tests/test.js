// IELTS Band Calculator BD \u2014 node unit tests. Run: node tests/test.js
'use strict';
const L = require('../logic.js');

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('ok - ' + name); }
  else { failed++; console.log('FAIL - ' + name + (extra ? ' :: ' + extra : '')); }
}
function eq(a, b) { return Math.abs(a - b) < 1e-9; }

// --- roundBand: official .25-up / .75-up rule, verified by hand ---
check('round 6.75 -> 7.0', eq(L.roundBand(6.75), 7.0));
check('round 6.25 -> 6.5', eq(L.roundBand(6.25), 6.5));
check('round 6.125 -> 6.0', eq(L.roundBand(6.125), 6.0));
check('round 5.875 -> 6.0', eq(L.roundBand(5.875), 6.0));
check('round 7.375 -> 7.5', eq(L.roundBand(7.375), 7.5));
check('round 6.0 -> 6.0', eq(L.roundBand(6.0), 6.0));
check('round 9.0 -> 9.0', eq(L.roundBand(9.0), 9.0));
check('round 0 -> 0', eq(L.roundBand(0), 0));
check('round 8.875 -> 9.0', eq(L.roundBand(8.875), 9.0));

// --- calculate: hand-verified cases ---
let r = L.calculate({ listening: 7, reading: 7, writing: 6.5, speaking: 6.5 });
check('calc 7/7/6.5/6.5 avg 6.75 overall 7.0', r.ok && eq(r.avg, 6.75) && eq(r.overall, 7.0), JSON.stringify(r));
r = L.calculate({ listening: 6, reading: 6, writing: 6, speaking: 7 });
check('calc 6/6/6/7 avg 6.25 overall 6.5', r.ok && eq(r.avg, 6.25) && eq(r.overall, 6.5), JSON.stringify(r));
r = L.calculate({ listening: 5.5, reading: 6, writing: 6, speaking: 6 });
check('calc 5.5/6/6/6 avg 5.875 overall 6.0', r.ok && eq(r.avg, 5.875) && eq(r.overall, 6.0), JSON.stringify(r));
r = L.calculate({ listening: 8, reading: 7.5, writing: 7, speaking: 7 });
check('calc 8/7.5/7/7 avg 7.375 overall 7.5', r.ok && eq(r.avg, 7.375) && eq(r.overall, 7.5), JSON.stringify(r));
r = L.calculate({ listening: 9, reading: 9, writing: 9, speaking: 9 });
check('calc all 9 -> 9.0', r.ok && eq(r.overall, 9.0));
r = L.calculate({ listening: 7, reading: 7, writing: 7, speaking: 6.3 });
check('calc rejects 6.3 (not a half step)', !r.ok);

// --- validateScoreInput ---
check('validate empty', !L.validateScoreInput('').ok);
check('validate 10 range', L.validateScoreInput('10').error === 'range');
check('validate -1 range', L.validateScoreInput('-1').error === 'range');
check('validate 6.3 step', L.validateScoreInput('6.3').error === 'step');
check('validate 6.5 ok', L.validateScoreInput('6.5').ok && eq(L.validateScoreInput('6.5').value, 6.5));
check('validate abc empty-ish', !L.validateScoreInput('abc').ok);

// --- descriptors ---
check('descriptor 7 Good', L.descriptorFor(7) === 'Good user');
check('descriptor 6.5 floor->Competent', L.descriptorFor(6.5) === 'Competent user');
check('descriptor 0', L.descriptorFor(0) === 'Did not attempt the test');

// --- target planner ---
check('minAvg 7.0 -> 6.75', eq(L.minAvgForTarget(7), 6.75));
check('minAvg 6.5 -> 6.25', eq(L.minAvgForTarget(6.5), 6.25));
let p = L.planTarget(7, { listening: 7, reading: 7, writing: null, speaking: null });
check('plan 7/7 + 2 missing: need 13, even 6.5, minEach 4',
  p.feasible && eq(p.requiredSum, 27) && eq(p.need, 13) && eq(p.evenSplit, 6.5) && eq(p.minEach, 4),
  JSON.stringify(p));
p = L.planTarget(7, { listening: 7, reading: 7, writing: 7, speaking: 6 });
check('plan all known 7/7/7/6: sum 27, avg 6.75, overall 7.0, meets',
  p.meets && eq(p.overall, 7.0) && eq(p.avg, 6.75), JSON.stringify(p));
p = L.planTarget(7, { listening: 7, reading: 7, writing: 6, speaking: 6 });
check('plan all known 7/7/6/6: sum 26, avg 6.5, overall 6.5, not meets',
  !p.meets && eq(p.overall, 6.5), JSON.stringify(p));
p = L.planTarget(7, { listening: 7, reading: 7, writing: 7, speaking: 7 });
check('plan all known 7s: meets', p.meets && eq(p.overall, 7.0));
p = L.planTarget(9, { listening: 5, reading: null, writing: null, speaking: null });
check('plan target 9 from 5: infeasible (need 30 > 27)',
  !p.feasible && eq(p.need, 30), JSON.stringify(p));
p = L.planTarget(6, { listening: 8, reading: 8, writing: null, speaking: null });
check('plan known 8/8 target 6: need 7, even 3.5, minEach 0, not yet guaranteed',
  p.feasible && !p.meets && eq(p.need, 7) && eq(p.evenSplit, 3.5) && eq(p.minEach, 0), JSON.stringify(p));
p = L.planTarget(6, { listening: 9, reading: 9, writing: 9, speaking: null });
check('plan known 9/9/9 target 6: already guaranteed (need <= 0)',
  p.meets && p.feasible, JSON.stringify(p));
check('ceilToHalf 6.25 -> 6.5', eq(L.ceilToHalf(6.25), 6.5));
check('ceilToHalf 6.5 -> 6.5', eq(L.ceilToHalf(6.5), 6.5));

// --- Bengali digits ---
check('toBnDigits 6.75', L.toBnDigits('6.75') === '\u09ec.\u09ed\u09eb');
check('toBnDigits 2026', L.toBnDigits('2026') === '\u09e8\u09e6\u09e8\u09ec');

// --- import validation ---
const good = { app: 'ielts-band-bd', version: 1, entries: [
  { id: 'e1', date: '2026-10-30', scores: { listening: 7, reading: 7, writing: 6.5, speaking: 6.5 }, avg: 6.75, overall: 7 }
] };
check('import good', L.validateImport(good).ok);
check('import wrong app', !L.validateImport({ app: 'other', version: 1, entries: [] }).ok);
check('import wrong version', !L.validateImport({ app: 'ielts-band-bd', version: 2, entries: [] }).ok);
const badAvg = JSON.parse(JSON.stringify(good)); badAvg.entries[0].avg = 6.0;
check('import avg mismatch rejected', !L.validateImport(badAvg).ok);
const badScore = JSON.parse(JSON.stringify(good)); badScore.entries[0].scores.writing = 6.3;
check('import bad score rejected', !L.validateImport(badScore).ok);
const dup = JSON.parse(JSON.stringify(good)); dup.entries.push(JSON.parse(JSON.stringify(good.entries[0])));
check('import dup id rejected', !L.validateImport(dup).ok);

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
