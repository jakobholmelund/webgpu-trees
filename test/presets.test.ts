// The lab's presets (lab/presets.ts): every species the package has reads back as it went out, so a preset
// saved, a preset loaded and the lab's Reset take them all; and the fields a species may leave out are its
// type's optional ones (species.ts `OPTIONAL_SPECIES_FIELDS`).

import assert from "node:assert/strict";
import { test } from "node:test";
import { ALL_SPECIES, DEFAULT_DETAIL, DEFAULT_VARIANT_OPTIONS, LOOK_STYLES, OPTIONAL_SPECIES_FIELDS, STARTER_SPECIES, TREE_LOOKS, cloneSpecies, isSpeciesFieldKind } from "../src/index.ts";
import { readPreset, speciesProblem, upToDate } from "../lab/presets.ts";

const resetPreset = (look: (typeof TREE_LOOKS)[number]) => ({ version: 1, look, species: ALL_SPECIES.map((s) => cloneSpecies(s)), style: LOOK_STYLES[look], detail: DEFAULT_DETAIL, variants: DEFAULT_VARIANT_OPTIONS });

test("every species reads back as it is", () => {
  ALL_SPECIES.forEach((s, i) => assert.equal(speciesProblem(JSON.parse(JSON.stringify(s)), i), null, s.name));
});

test("the lab's Reset, and a preset saved as JSON, load in every look", () => {
  for (const look of TREE_LOOKS) {
    const read = readPreset(resetPreset(look));
    assert.notEqual(typeof read, "string", `${look}: ${read}`);
    const back = readPreset(JSON.parse(JSON.stringify(read)));
    assert.notEqual(typeof back, "string", `${look} through JSON: ${back}`);
    if (typeof back !== "string") assert.deepEqual(back.species, ALL_SPECIES.map((s) => cloneSpecies(s)));
  }
});

test("a species field may be left out only if the type says so, and must be of its kind when given", () => {
  const oak = JSON.parse(JSON.stringify(STARTER_SPECIES[0]));
  for (const key of Object.keys(OPTIONAL_SPECIES_FIELDS)) {
    const without = { ...oak };
    delete without[key];
    assert.equal(speciesProblem(without, 0), null, `${key} may be left out`);
    assert.match(speciesProblem({ ...oak, [key]: { wrong: true } }, 0) ?? "", new RegExp(key), `${key} must be of its kind`);
  }
  for (const key of Object.keys(oak).filter((k) => !(k in OPTIONAL_SPECIES_FIELDS))) {
    const without = { ...oak };
    delete without[key];
    assert.notEqual(speciesProblem(without, 0), null, `${key} may not be left out`);
  }
});

test("the optional fields' kinds are what the species carry", () => {
  const fields = OPTIONAL_SPECIES_FIELDS as Record<string, Parameters<typeof isSpeciesFieldKind>[1]>;
  const seen = new Set<string>();
  for (const s of ALL_SPECIES) {
    for (const [key, value] of Object.entries(s)) {
      if (!(key in fields)) continue;
      seen.add(key);
      assert.ok(isSpeciesFieldKind(value, fields[key]), `${s.name}: ${key}`);
    }
  }
  // (Most of them are set by some species: a list that had drifted from the species would show here.)
  assert.ok(seen.size >= Object.keys(fields).length - 3, `${[...seen].join(", ")}`);
});

test("the documented crown proportions go out and come back with a preset, and a copy is its own", () => {
  const ranged = ALL_SPECIES.filter((s) => s.crownRatio && s.baseRatio);
  assert.ok(ranged.length > 0);
  for (const s of ranged) {
    const i = ALL_SPECIES.indexOf(s);
    const back = JSON.parse(JSON.stringify(s));
    assert.equal(speciesProblem(back, i), null, s.name);
    assert.deepEqual([back.crownRatio, back.baseRatio], [s.crownRatio, s.baseRatio], s.name);
    assert.equal(speciesProblem({ ...back, crownRatio: [0.4] }, i)?.includes("crownRatio"), true, `${s.name}: one number is not a range`);
    const copy = cloneSpecies(s);
    assert.ok(copy.crownRatio !== s.crownRatio && copy.baseRatio !== s.baseRatio && copy.heightRange !== s.heightRange, `${s.name}: its ranges copied, not shared`);
    assert.deepEqual(back.heightRange, s.heightRange, s.name);
  }
  const read = readPreset(resetPreset("stylized"));
  assert.notEqual(typeof read, "string", `${read}`);
  if (typeof read !== "string") for (const [i, s] of ALL_SPECIES.entries()) assert.deepEqual([read.species[i].crownRatio, read.species[i].baseRatio], [s.crownRatio, s.baseRatio], s.name);
});

test("a preset kept before fields and species were added is brought up to date, its own settings kept", () => {
  const fan = ALL_SPECIES.find((s) => s.palmLeaf === "fan");
  assert.ok(fan, "a fan palm among the species");
  // (As kept before palms had leaves of their own: no palmLeaf, no pruning, and its height changed by hand.)
  const old = JSON.parse(JSON.stringify(fan)) as Record<string, unknown>;
  delete old.palmLeaf;
  delete old.pruning;
  old.height = 19;
  const kept = [JSON.parse(JSON.stringify(ALL_SPECIES[0])), old as unknown as typeof fan];
  const now = upToDate(kept, ALL_SPECIES);
  const back = now.find((s) => s.name === fan.name);
  assert.equal(back?.palmLeaf, "fan", "the field it left out comes from the package");
  assert.equal(back?.pruning, fan.pruning);
  assert.equal(back?.height, 19, "what it set stays");
  assert.equal(now.length, ALL_SPECIES.length, "the species it had not heard of are added");
  assert.deepEqual(now.slice(0, 2).map((s) => s.name), [ALL_SPECIES[0].name, fan.name], "its own come first, in its order");
  // (A species of its own making stays, and takes nothing.)
  const mine = { ...JSON.parse(JSON.stringify(ALL_SPECIES[0])), name: "My oak" };
  assert.equal(upToDate([mine], ALL_SPECIES)[0].name, "My oak");
});
