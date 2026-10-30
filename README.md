# IELTS Band Calculator BD

Offline, bilingual (English / বাংলা) IELTS overall-band calculator with a target
planner, an official band-descriptor guide, and a saved-results history. No
account, no network calls, no data leaves your browser.

## Problem

IELTS reports four section scores (Listening, Reading, Writing, Speaking) and
one overall band, but the rounding rule surprises many test-takers: an average
of 6.75 becomes 7.0, while 6.25 becomes 6.5. Students planning a retake also need
to know what they must score in their remaining sections to reach a target
band. This tool answers both questions with the official rule, in English or
বাংলা.

## Features

1. **Overall band calculator**  --  enter the four section scores (0-9, 0.5 steps,
   inline validation for empty / out-of-range / non-half-step input) and get
   the exact average, the rounded overall band, and the band descriptor.
2. **Target planner**  --  pick a target band (4.0-9.0) and fill in sections you
   already scored; the planner reports the combined score still needed from the
   remaining sections, an even split, the minimum one section needs if the
   others score 9.0, or that the target is unreachable.
3. **Band guide**  --  the official IELTS whole-band descriptors, 9 down to 0.
4. **History**  --  every calculation is saved locally (newest first, max 20),
   survives reloads, and can be deleted per row or erased with a typed-DELETE
   gate. JSON export / strict import round-trips the history.
5. **Bilingual UI**  --  EN/বাংলা toggle persisted in localStorage, with Bengali
   digits in Bengali mode. Fully responsive down to 390 px.

## The rounding rule (read this before doubting a result)

The overall band is the mean of the four sections rounded to the nearest half
band, with a mean ending in .25 rounding **up** to the next half band and a
mean ending in .75 rounding **up** to the next whole band. That is exactly
`floor(mean x 2 + 0.5) / 2`. Consequence used by the planner: the smallest mean
that rounds to target T is T - 0.25 (so 6.75 already rounds to 7.0).

## Stack

Vanilla HTML / CSS / JavaScript, no build step, no dependencies. Data persists
in `localStorage` only.

## Run locally

```sh
# just open it
open index.html
# or serve it
python3 -m http.server 8000
```

## Testing

```sh
node tests/test.js    # unit tests (rounding, planner, validation, import)
node tests/smoke.js   # headless-Chrome smoke tests (raw CDP, file:// page)
```

See [TEST_RESULTS.md](TEST_RESULTS.md) for the recorded results.

## Limitations

- This tool implements the published overall-band rounding rule; it does not
  predict or replace an official IELTS result, and it is not affiliated with
  IELTS, the British Council, IDP, or Cambridge.
- Half-band descriptors are shown via the whole band below them (e.g. 6.5
  shows the "Competent user" descriptor), because IELTS publishes descriptors
  for whole bands.
- The planner assumes the same rounding rule for every test format; confirm
  any high-stakes decision with an official source.
- The planner result panel does not re-translate when the language is toggled
  after planning; press "Plan my target" again to see it in the new language.
- History lives in one browser's localStorage; exporting JSON is the way to
  move it to another device.

## Status

MVP complete. See [TEST_RESULTS.md](TEST_RESULTS.md).
