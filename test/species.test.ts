// The species rows, held to what a row must be: sound by the package's own check, named once, and
// placed in the regions' vocabulary.
//
//   node --test test/species.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { ALL_SPECIES, MORE_SPECIES, REGION_ROWS, STARTER_SPECIES, checkSpecies } from "../src/species.ts";

test("every species is sound", () => {
  for (const sp of ALL_SPECIES) assert.deepEqual(checkSpecies(sp), [], sp.name);
});

test("every species has a name of its own", () => {
  const names = ALL_SPECIES.map((s) => s.name);
  assert.equal(new Set(names).size, names.length, names.join(", "));
});

test("ALL_SPECIES is the starters, then the regional rows", () => {
  assert.deepEqual(ALL_SPECIES, [...STARTER_SPECIES, ...Object.values(MORE_SPECIES)]);
});

test("every regional row has its botanical name and its regions", () => {
  for (const [id, sp] of Object.entries(MORE_SPECIES)) {
    assert.match(id, /^[a-z][A-Za-z]*$/, `${id} is a short camelCase id`);
    assert.ok(sp.latin && sp.latin.length > 0, `${sp.name} has its botanical name`);
    assert.ok(sp.regions && sp.regions.length > 0, `${sp.name} has its regions`);
  }
  for (const sp of ALL_SPECIES) for (const r of sp.regions ?? []) assert.ok(REGION_ROWS.includes(r), `${sp.name}: ${r}`);
});

test("every region has trees", () => {
  for (const r of REGION_ROWS) assert.ok(ALL_SPECIES.filter((s) => s.regions?.includes(r) && s.architecture !== "shrub").length >= 3, r);
});

test("a bad region is caught", () => {
  const bad = { ...STARTER_SPECIES[0], regions: ["atlantis"] } as unknown as (typeof STARTER_SPECIES)[0];
  assert.equal(checkSpecies(bad).length, 1);
});

test("a species' documented crown proportions are sane, and its specimen is of them or near", () => {
  const ranged = ALL_SPECIES.filter((s) => s.crownRatio || s.baseRatio);
  assert.ok(ranged.length >= 20, `${ranged.length} species with documented ranges`);
  for (const s of ranged) {
    // (A specimen may be a showpiece, a little beyond what is documented: within the 0.2 of its height a
    // host's matching falls off over, not far beyond it.)
    for (const [range, own, most] of [
      [s.crownRatio, s.crownRadius / s.height, 1.5],
      [s.baseRatio, s.crownBase / s.height, 1],
    ] as const) {
      if (!range) continue;
      const [lo, hi] = range;
      assert.ok(lo >= 0 && lo < hi && hi <= most, `${s.name}: [${lo}, ${hi}]`);
      assert.ok(own >= lo - 0.2 && own <= hi + 0.2, `${s.name}: its specimen's ${own.toFixed(2)} against [${lo}, ${hi}]`);
    }
    // (Stand-grown crowns are narrower than open-grown ones: a range is one, not a point.)
    if (s.crownRatio) assert.ok(s.crownRatio[1] - s.crownRatio[0] >= 0.05, `${s.name}: crownRatio spans stand to open`);
  }
});

test("bad documented crown proportions are caught", () => {
  for (const [field, value] of [
    ["crownRatio", [0.5, 0.2]],
    ["crownRatio", [0, 0.3]],
    ["crownRatio", [0.2, 2]],
    ["baseRatio", [0.3, 0.3]],
    ["baseRatio", [-0.1, 0.5]],
    ["baseRatio", [0.2, 1]],
  ] as const) {
    const bad = { ...STARTER_SPECIES[0], [field]: value };
    assert.equal(checkSpecies(bad).length, 1, `${field} ${JSON.stringify(value)}`);
    assert.match(checkSpecies(bad)[0], new RegExp(field));
  }
});
