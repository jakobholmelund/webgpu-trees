// The realistic look's photographs: every set the manifest names is in the repository, none too big, all of
// them together kept modest, and every source credited in SOURCES.md, with its licence (CC0 for a scan; an
// AI-generated picture said to be one, and not CC0).
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

test("bark tiles are a sensible size of bark (cm), leaves a sensible length (a palm frond's whole)", () => {
  for (const b of manifest.bark.sets) {
    assert.equal(b.tileCm.length, 2);
    for (const c of b.tileCm) assert.ok(c >= 20 && c <= 250, `${b.id}: ${c} cm`);
    assert.ok(b.seams.albedo < 2 && b.seams.normal < 2, `${b.id} does not tile: ${JSON.stringify(b.seams)}`);
  }
  for (const l of manifest.leaves.sets) {
    assert.ok(l.lengthCm >= 3 && l.lengthCm <= 600, `${l.id}: ${l.lengthCm} cm`);
    // (A sheet of leaves holds a few, to vary; a whole palm frond may be one.)
    assert.ok(l.sprites.length >= (l.lengthCm > 100 ? 1 : 2), `${l.id}: ${l.sprites.length} leaves`);
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
    assert.ok(["ambientcg", "polyhaven", "generated"].includes(s.site));
    // (A generated picture's row says so, and does not say CC0.)
    const row = md.split("\n").find((l) => l.startsWith("|") && l.includes(`(\`${s.id}\`)`));
    assert.ok(row, `${s.id} has no row`);
    if (s.site === "generated") {
      assert.match(row, /AI-generated/);
      assert.doesNotMatch(row, /CC0 1\.0/);
      assert.ok(md.includes(s.prompt), `${s.id}'s prompt not listed`);
    } else assert.match(row, /CC0 1\.0 Universal/);
  }
});

test("the manifest says which sets are generated, as the recipe does", () => {
  for (const set of [...manifest.bark.sets, ...manifest.leaves.sets]) {
    const site = SOURCES[set.source].site;
    assert.equal(set.origin, site === "generated" ? "generated" : "scan", set.id);
  }
});

test("a Scots pine's upper bark is copper-orange, packed for the shader and read back as it was given", async () => {
  const { SCAN_LOOKS, upperColorCode, upperColorOf } = await import("../src/scans.ts");
  const look = SCAN_LOOKS["Scots pine"];
  assert.ok(look.upper?.color, "Scots pine's upper bark has no colour of its own");
  const code = upperColorCode(look);
  // (A float holds it exactly: under 2^24.)
  assert.ok(code > 0 && code <= 2 ** 24 && Math.fround(code) === code);
  const [r, g, b] = upperColorOf(code);
  assert.equal("#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join(""), look.upper.color.toLowerCase());
  // Copper-orange: its hue between red and yellow, more orange than either; saturated, but not a crayon's.
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const hue = (60 * (g - b)) / (max - min);
  const sat = (max - min) / max;
  assert.ok(r === max && hue > 12 && hue < 40, `hue ${hue.toFixed(0)}°`);
  assert.ok(sat > 0.4 && sat < 0.75, `saturation ${sat.toFixed(2)}`);
  // (No colour, no code; and a species without one keeps its paled bark.)
  assert.equal(upperColorCode(SCAN_LOOKS.Oak), 0);
  assert.equal(upperColorOf(0), null);
  assert.equal(upperColorCode({ ...look, upper: { ...look.upper, color: "#000000" } }), 1);
  assert.deepEqual(upperColorOf(upperColorCode({ ...look, upper: { ...look.upper, color: "#ffffff" } })), [1, 1, 1]);
});
