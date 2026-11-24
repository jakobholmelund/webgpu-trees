// The realistic look's scanned pictures: every set the manifest names is in the repository, none too big,
// all of them together kept modest, and every source credited in SOURCES.md, with its licence (CC0).
//
//   node --test test/scans.test.mjs

import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { BARK, LEAVES, SOURCES } from "../tools/scans/recipe.mjs";

const at = (p) => new URL(`../assets/${p}`, import.meta.url);
const manifest = JSON.parse(readFileSync(at("scans.json"), "utf8"));
const files = [
  ...manifest.bark.sets.flatMap((b) => [`bark/${b.id}.albedo.avif`, `bark/${b.id}.normal.avif`]),
  ...manifest.leaves.sets.flatMap((l) => [`leaves/${l.id}.albedo.avif`, `leaves/${l.id}.normal.avif`]),
];

test("every set the recipe makes is in the manifest, in the recipe's order", () => {
  assert.deepEqual(manifest.bark.sets.map((b) => b.id), BARK.map((b) => b.id));
  assert.deepEqual(manifest.leaves.sets.map((l) => l.id), LEAVES.map((l) => l.id));
  manifest.bark.sets.forEach((b, i) => assert.equal(b.layer, i));
});

test("every picture is there, an AVIF, under 1 MB; all of them under 15 MB", () => {
  let total = 0;
  for (const f of files) {
    assert.ok(existsSync(at(f)), `${f} missing`);
    const bytes = readFileSync(at(f));
    assert.equal(bytes.subarray(4, 12).toString("latin1"), "ftypavif", `${f} is not AVIF`);
    const n = statSync(at(f)).size;
    assert.ok(n > 5_000 && n < 1_000_000, `${f}: ${n} bytes`);
    total += n;
  }
  assert.ok(total < 15e6, `${(total / 1e6).toFixed(1)} MB`);
});

test("bark tiles are a sensible size of bark (cm), leaves a sensible length", () => {
  for (const b of manifest.bark.sets) {
    assert.equal(b.tileCm.length, 2);
    for (const c of b.tileCm) assert.ok(c >= 20 && c <= 250, `${b.id}: ${c} cm`);
    assert.ok(b.seams.albedo < 2 && b.seams.normal < 2, `${b.id} does not tile: ${JSON.stringify(b.seams)}`);
  }
  for (const l of manifest.leaves.sets) {
    assert.ok(l.lengthCm >= 3 && l.lengthCm <= 60, `${l.id}: ${l.lengthCm} cm`);
    assert.ok(l.sprites.length >= 2, `${l.id}: ${l.sprites.length} leaves`);
    for (const s of l.sprites) {
      assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= l.size[0] && s.y + s.h <= l.size[1], `${l.id}: a leaf off its sheet`);
      // Stood up: its stalk's end below its tip.
      assert.ok(s.base[1] > s.tip[1], `${l.id}: a leaf upside down`);
      assert.ok(s.size > 0 && s.size <= 1);
    }
  }
});

test("SOURCES.md credits every source used, with its page, author and CC0 licence", () => {
  const md = readFileSync(at("SOURCES.md"), "utf8");
  const used = new Set([...BARK, ...LEAVES].map((s) => s.source));
  for (const key of used) {
    const s = SOURCES[key];
    assert.ok(md.includes(`(\`${s.id}\`)`), `${s.id} not credited`);
    for (const a of s.authors ?? []) assert.ok(md.includes(a), `${a} not credited`);
    assert.ok(["ambientcg", "polyhaven"].includes(s.site));
  }
  assert.ok(md.includes("CC0 1.0 Universal"));
});
