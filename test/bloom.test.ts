// A flowering species' bloom by the day of the year (scans.ts `bloomShare`, `GORSE_FLOWERING`; the host's day:
// `TreeEnvironment.day`). Common gorse flowers mainly from January to June, at its height in spring, with a few
// flowers most of the year; with no day given, the style's bloom (0.3), not mostly yellow.
//
//   node --test test/bloom.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { ALL_SPECIES, createTrees } from "../src/index.ts";
import { GORSE_FLOWERING, SCAN_LOOKS, bloomShare } from "../src/scans.ts";
import { DEFAULT_STYLE, LOOK_STYLES, REAL_STYLE } from "../src/styles.ts";

const gorse = SCAN_LOOKS.Gorse;
/** The day of the year a date is (not a leap year). */
const dayOf = (month: number, date: number) => [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][month - 1] + date;

test("with no day, the style's bloom: about 0.3 in every look, not mostly in flower", () => {
  assert.equal(REAL_STYLE.bloom, 0.3);
  assert.equal(DEFAULT_STYLE.bloom, 0.3);
  assert.equal(bloomShare(gorse, null, REAL_STYLE.bloom), 0.3);
  assert.equal(bloomShare(gorse, Number.NaN, 0.42), 0.42);
});

test("gorse is in flower mainly from January to June, most in spring", () => {
  const spring = [dayOf(3, 20), dayOf(4, 15), dayOf(5, 10)].map((d) => bloomShare(gorse, d, 0.3));
  for (const s of spring) assert.ok(s >= 0.8, `spring ${s.toFixed(2)}`);
  for (let m = 1; m <= 6; m++) assert.ok(bloomShare(gorse, dayOf(m, 15), 0.3) >= 0.3, `the 15th of month ${m}: ${bloomShare(gorse, dayOf(m, 15), 0.3).toFixed(2)}`);
  for (let m = 8; m <= 10; m++) {
    const s = bloomShare(gorse, dayOf(m, 15), 0.3);
    assert.ok(s > 0.03 && s <= 0.15, `the 15th of month ${m}: a few flowers (${s.toFixed(2)})`);
  }
  const peak = Math.max(...Array.from({ length: 365 }, (_, d) => bloomShare(gorse, d + 1, 0.3)));
  const peakDay = Array.from({ length: 365 }, (_, d) => d + 1).find((d) => bloomShare(gorse, d, 0.3) === peak)!;
  assert.ok(peakDay >= dayOf(3, 15) && peakDay <= dayOf(5, 15), `at its height on day ${peakDay}`);
});

test("the year goes round smoothly, and takes any day", () => {
  let worst = 0;
  for (let d = 0; d <= 731; d += 0.5) worst = Math.max(worst, Math.abs(bloomShare(gorse, d + 0.5, 0.3) - bloomShare(gorse, d, 0.3)));
  assert.ok(worst < 0.02, `no step over a half day: ${worst.toFixed(3)}`);
  assert.ok(Math.abs(bloomShare(gorse, 365.5, 0.3) - bloomShare(gorse, 0.25, 0.3)) < 1e-9, "the 31st of December runs into the 1st of January");
  assert.ok(Math.abs(bloomShare(gorse, 100 + 365.25 * 3, 0.3) - bloomShare(gorse, 100, 0.3)) < 1e-9, "a day of a later year");
  assert.ok(Math.abs(bloomShare(gorse, 100 - 365.25, 0.3) - bloomShare(gorse, 100, 0.3)) < 1e-9, "a day before");
  for (const [d, s] of GORSE_FLOWERING) assert.ok(Math.abs(bloomShare(gorse, d, 0.3) - s) < 1e-9, `day ${d} as named`);
});

test("a species with no flowering of its own keeps the style's bloom, whatever the day", () => {
  assert.equal(bloomShare(SCAN_LOOKS.Oak, dayOf(4, 15), 0.3), 0.3);
});

test("the trees take the day from their environment, none by default", () => {
  const pick = ALL_SPECIES.filter((s) => s.name === "Gorse");
  const made = createTrees({ trees: [{ x: 0, y: 0, z: 0, species: 0 }], species: pick, look: "real", scans: false });
  assert.equal(made.environment.day, null);
  assert.equal(made.style.bloom, LOOK_STYLES.real.bloom);
  made.environment.day = dayOf(4, 15);
  made.dispose();
});
