# TEST RESULTS — IELTS Band Calculator BD

Date: 2026-10-30 (11:00 slot). Commands: `node tests/test.js`, `node tests/smoke.js`
(headless Chrome via raw CDP, file:// page, Hatch WebGL policy flags).

## Unit tests: 43/43 passed

Rounding rule (official .25-up / .75-up, implemented as floor(mean x 2 + 0.5) / 2):

- 6.75 -> 7.0; 6.25 -> 6.5; 6.125 -> 6.0; 5.875 -> 6.0; 7.375 -> 7.5;
  6.0 -> 6.0; 9.0 -> 9.0; 0 -> 0; 8.875 -> 9.0.

Hand-verified calculations (exact means, multiples of 0.125):

- 7 / 7 / 6.5 / 6.5 -> avg 6.75, overall 7.0.
- 6 / 6 / 6 / 7 -> avg 6.25, overall 6.5.
- 5.5 / 6 / 6 / 6 -> avg 5.875, overall 6.0.
- 8 / 7.5 / 7 / 7 -> avg 7.375, overall 7.5.
- All 9s -> 9.0. A 6.3 section score is rejected (not a half step).

Planner (minimum mean for target T is T - 0.25):

- Target 7.0, known 7/7, two missing: required sum 27, need 13, even split 6.5,
  minimum in one section if the other scores 9.0 is 4.0.
- All known 7/7/7/6: sum 27, avg 6.75, overall 7.0, meets target.
- All known 7/7/6/6: sum 26, avg 6.5, overall 6.5, does not meet 7.0.
- Target 9.0 from known 5 with three missing: need 30 > 27, infeasible.
- Known 8/8, target 6.0: need 7, even 3.5, minEach 0, not yet guaranteed.
- Known 9/9/9, target 6.0: already guaranteed.

Validation / descriptors / import:

- Empty, out-of-range (10, -1), non-half-step (6.3), and non-numeric inputs
  rejected with distinct errors; 6.5 accepted.
- Descriptor 7 = "Good user"; 6.5 uses the floor descriptor ("Competent user");
  0 = "Did not attempt the test".
- Bengali digits: 6.75 -> 6.75 in Bengali digits; 2026 converts correctly.
- Import: valid export accepted; wrong app, wrong version, average mismatch,
  bad score, and duplicate id all rejected.

## Smoke tests: 18/18 passed, 0 console/page errors

- Title renders; band guide has 10 rows (9 down to 0).
- Calculator happy path: 7/7/6.5/6.5 -> overall 7.0, avg 6.75, "Good user",
  one history row.
- Invalid 6.3 shows the 0.5-step inline error and hides the result.
- Planner happy path shows need 13 / even 6.5; infeasible case shows the
  "Not reachable" message.
- Language toggle sets lang="bn" and renders the Bengali title; history
  survives the toggle and a full page reload (localStorage).
- Clear-all gate: a wrong word does not erase; DELETE erases.
- 390 px viewport: no horizontal overflow.

## Repairs during this run (all real, all re-verified)

1. Mean kept exact (multiples of 0.125) instead of rounding to 2 decimals:
   5.5/6/6/6 mean is 5.875, not 5.88. Added fmtAvg (max 3 decimals).
2. Two test expectations corrected against the rule itself: 7/7/7/6 sums to 27
   (avg 6.75 -> 7.0, meets target), and known 8/8 does not "already meet"
   target 6.0 (remaining sections could still score 0).
3. Overall band now always shows one decimal per IELTS convention (7.0, not 7).
4. Language toggle now re-renders a shown calculation result in Bengali digits.
5. Planner all-known case rewritten to show a proper meets / does-not-meet
   message instead of a dead branch.

## Known limitation (documented in README)

The planner result panel does not re-translate on a language toggle made after
planning; pressing "Plan my target" again renders it in the new language.
