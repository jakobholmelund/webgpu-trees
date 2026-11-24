// Palms grown as palms (palm.ts): their leaves round the stem by the golden angle, each standing as its age
// has it, kept to the size asked for however they are pruned, pruned as they say, the same for the same
// seed; drawn from pictures that are there and credited.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { bakeLight, leafAreaIndex } from "../src/light.ts";
import { FROND_CLASSES, GOLDEN_ANGLE, PRUNINGS, type Pruning, frondSurface, growPalm } from "../src/palm.ts";
import { PALM_ATLAS, PALM_PICTURES } from "../src/palmAtlas.ts";
import { palmPieces } from "../src/palmGeometry.ts";
import { growTree } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { type TreeSize } from "../src/tree.ts";

const palms = ALL_SPECIES.filter((s) => s.architecture === "palm");
const sizeOf = (sp: TreeSpecies, k = 1): TreeSize => ({ height: sp.height * k, crownRadius: sp.crownRadius * k, crownBase: sp.crownBase * k, trunkRadius: sp.trunkRadius * k });
const root = new URL("..", import.meta.url);

test("there are four palms: two feather palms and two fan palms, all of California", () => {
  assert.deepEqual(palms.map((p) => p.name).sort(), ["California fan palm", "Canary date palm", "Mexican fan palm", "Queen palm"]);
  assert.equal(palms.filter((p) => p.palmLeaf === "fan").length, 2);
  for (const p of palms) assert.ok(p.regions?.includes("california"), p.name);
});

test("a palm's leaves stand round its stem one after another by the golden angle (137.5 degrees)", () => {
  for (const sp of palms) {
    const p = growPalm(sp, sizeOf(sp), 3, "natural").palm!;
    let n = 0;
    for (let i = 1; i < p.fronds.length; i++) {
      let d = (p.fronds[i].azimuth - p.fronds[i - 1].azimuth) % (2 * Math.PI);
      if (d < 0) d += 2 * Math.PI;
      assert.ok(Math.abs(d - GOLDEN_ANGLE) < (2.5 * Math.PI) / 180, `${sp.name}: frond ${i} is ${((d * 180) / Math.PI).toFixed(1)} degrees on from the one before`);
      n++;
    }
    assert.ok(n >= 10, sp.name);
  }
});

test("each leaf stands as its age has it: the spear upright, the young rising, the old drooping, the dead hanging", () => {
  for (const sp of palms) {
    const p = growPalm(sp, sizeOf(sp), 5, "natural").palm!;
    // (How steeply each class leaves the stem, on the whole: the elevation of its rachis at its foot.)
    const rise = (c: string) => {
      const f = p.fronds.filter((x) => x.cls === c);
      return f.length ? f.reduce((s, x) => s + Math.asin(x.tangent[0][1]), 0) / f.length : NaN;
    };
    const order = FROND_CLASSES.map(rise).filter((r) => !Number.isNaN(r));
    for (let i = 1; i < order.length; i++) assert.ok(order[i] < order[i - 1], `${sp.name}: ${FROND_CLASSES.join(" > ")}: ${order.map((r) => ((r * 180) / Math.PI).toFixed(0)).join(", ")}`);
    const spear = p.fronds.find((f) => f.cls === "spear")!;
    assert.ok(Math.asin(spear.tangent[0][1]) > (70 * Math.PI) / 180, `${sp.name}: the spear stands upright`);
    for (const f of p.fronds.filter((x) => x.cls === "dead")) assert.ok(f.tangent[f.tangent.length - 1][1] < -0.9, `${sp.name}: a dead leaf hangs`);
    // (Ages run from the youngest at the heart to the oldest lowest down the crown shaft.)
    const live = p.fronds.filter((f) => f.cls !== "dead");
    for (let i = 1; i < live.length; i++) assert.ok(live[i].age >= live[i - 1].age, sp.name);
    assert.ok(live[live.length - 1].points[0][1] < live[0].points[0][1], `${sp.name}: the old leaves leave the stem below the young`);
  }
});

test("however it is pruned, a palm keeps to its envelope: its height, its crown's radius, its crown's base", () => {
  for (const sp of palms)
    for (const pruning of PRUNINGS)
      for (const [seed, k] of [[1, 1], [9, 0.7], [23, 1.3]] as const) {
        const size = sizeOf(sp, k);
        const g = growPalm(sp, size, seed, pruning);
        const p = g.palm!;
        const tag = `${sp.name} ${pruning} seed ${seed} x${k}`;
        let top = 0;
        let reach = 0;
        let low = Infinity;
        for (const f of p.fronds)
          for (const q of frondSurface(f)) {
            top = Math.max(top, q[1]);
            reach = Math.max(reach, Math.hypot(q[0], q[2]));
            if (f.cls !== "dead") low = Math.min(low, q[1]);
            assert.ok(q[1] > 0, `${tag}: a leaf below the ground`);
          }
        assert.ok(top <= size.height + 0.02, `${tag}: ${top.toFixed(2)} over its height ${size.height}`);
        assert.ok(top >= size.height - 0.05, `${tag}: its top ${top.toFixed(2)} short of its height ${size.height}`);
        assert.ok(reach <= size.crownRadius + 0.02, `${tag}: reaches ${reach.toFixed(2)} past its crown's radius ${size.crownRadius}`);
        assert.ok(low >= size.crownBase - 0.05, `${tag}: green leaves down to ${low.toFixed(2)}, below its crown's base ${size.crownBase}`);
        // (And it fills it: out to most of its radius, or down to near its base.)
        const depth = size.height - size.crownBase;
        assert.ok(reach >= 0.7 * size.crownRadius || low <= size.crownBase + 0.25 * depth, `${tag}: reaches ${reach.toFixed(2)} of ${size.crownRadius}, down to ${low.toFixed(2)} of ${size.crownBase}`);
        if (p.ball) assert.ok(p.ball.radius < size.crownRadius && p.ball.y0 > size.crownBase * 0.3, tag);
        if (p.skirt) assert.ok(p.skirt.bottom >= 0.3 && p.skirt.top <= p.heart[1] && p.skirt.outTop < 0.5 * size.crownRadius + 0.3, tag);
        // (Its skeleton and clumps within it too: what the rest of the library reads.)
        for (let i = 0; i < g.skeleton.count; i++) assert.ok(g.skeleton.y[i] <= size.height + 0.02 && Math.hypot(g.skeleton.x[i], g.skeleton.z[i]) <= size.crownRadius + 0.02, tag);
      }
});

test("pruning does what it says: a pineapple cut has its ball and no dead leaves, a skinned palm no dead leaves and no skirt, a natural one its dead", () => {
  for (const sp of palms) {
    const grow = (p: Pruning) => growPalm(sp, sizeOf(sp), 11, p).palm!;
    const pine = grow("pineapple");
    const under = pine.stem.radius[pine.stem.y.findIndex((y) => y >= pine.ball!.y0)];
    assert.ok(pine.ball && pine.ball.radius > 1.3 * under, `${sp.name}: a pineapple cut's ball`);
    assert.ok(pine.stem.surface.some((s) => s === 2), `${sp.name}: the ball's trimmed bases on the stem`);
    assert.equal(pine.fronds.filter((f) => f.cls === "dead").length, 0, sp.name);
    assert.ok(pine.fronds.every((f) => f.tangent[0][1] > -0.12), `${sp.name}: a pineapple cut keeps the leaves above the level`);
    const skinned = grow("skinned");
    assert.equal(skinned.fronds.filter((f) => f.cls === "dead").length, 0, sp.name);
    assert.equal(skinned.skirt, null, sp.name);
    assert.equal(skinned.ball, null, sp.name);
    const natural = grow("natural");
    assert.ok(natural.fronds.filter((f) => f.cls === "dead").length > 0, `${sp.name}: a natural palm keeps its dead leaves`);
    if (sp.palmLeaf === "fan") {
      assert.ok(natural.skirt && natural.skirt.top - natural.skirt.bottom > 0.4 * natural.heart[1], `${sp.name}: a natural fan palm's skirt hangs well down its stem`);
      const skirt = grow("skirt");
      assert.ok(skirt.skirt && skirt.skirt.top - skirt.skirt.bottom < natural.skirt!.top - natural.skirt!.bottom, `${sp.name}: a skirt cut back is shorter`);
    }
  }
  // The species' own, as courses keep them.
  const own = (name: string) => growTree(ALL_SPECIES.find((s) => s.name === name)!, sizeOf(ALL_SPECIES.find((s) => s.name === name)!), 4).palm!.pruning;
  assert.equal(own("Canary date palm"), "pineapple");
  assert.equal(own("Mexican fan palm"), "skinned");
  assert.equal(own("California fan palm"), "skinned");
  assert.equal(own("Queen palm"), "skinned");
});

test("the same seed grows the same palm; another seed another", () => {
  for (const sp of palms) {
    const a = growPalm(sp, sizeOf(sp), 77);
    const b = growPalm(sp, sizeOf(sp), 77);
    assert.deepEqual(a.palm, b.palm, sp.name);
    assert.deepEqual(Array.from(a.skeleton.x), Array.from(b.skeleton.x), sp.name);
    const c = growPalm(sp, sizeOf(sp), 78);
    assert.notDeepEqual(c.palm!.fronds.map((f) => f.azimuth), a.palm!.fronds.map((f) => f.azimuth), sp.name);
  }
});

test("a palm's light is its fronds' own leaf area, not a crown's worth of leaf area index", () => {
  for (const sp of palms) {
    const g = growPalm(sp, sizeOf(sp), 2);
    assert.ok(g.leafArea! > 0 && g.leafArea === g.palm!.leafArea, sp.name);
    const vol = bakeLight(g, { lai: leafAreaIndex(sp.openness) });
    assert.equal(vol.leafArea, g.leafArea, sp.name);
    assert.ok(g.clumps.count > 0, sp.name);
  }
});

test("a palm's pieces at every distance are finite, fewer further off, and read their pictures inside the atlas", () => {
  const grown = palms.map((sp) => growPalm(sp, sizeOf(sp), 6, sp.palmLeaf === "fan" ? "natural" : "pineapple"));
  const tris = [0, 1, 2].map((t) => {
    const P = palmPieces(grown, t);
    const pos = P.attributes.position.array;
    const uv = P.attributes.aUv.array;
    for (const v of pos) assert.ok(Number.isFinite(v));
    for (let i = 0; i < uv.length; i += 4) {
      assert.ok(uv[i] >= 0 && uv[i] <= 1 && uv[i + 1] >= 0 && uv[i + 1] <= 1, `uv ${uv[i]}, ${uv[i + 1]}`);
      assert.ok(uv[i + 2] >= 0 && uv[i + 2] < PALM_ATLAS.cells.length);
    }
    const n = pos.length / 3;
    for (const k of P.index) assert.ok(k < n);
    assert.equal(P.ranges.length, grown.length);
    return P.index.length / 3;
  });
  assert.ok(tris[0] > tris[1] && tris[1] > tris[2], `triangles near, mid, far: ${tris.join(", ")}`);
  // (A tree that is not a palm has none.)
  const oak = growTree(ALL_SPECIES[0], sizeOf(ALL_SPECIES[0]), 1);
  assert.equal(palmPieces([oak], 0).index.length, 0);
});

test("the palms' pictures are in assets/, AI-generated and credited as such with their prompts", () => {
  const manifest = JSON.parse(readFileSync(new URL("assets/scans.json", root), "utf8"));
  const sources = readFileSync(new URL("assets/SOURCES.md", root), "utf8");
  const sets = new Set([...PALM_PICTURES.real, ...PALM_PICTURES.painted].map((p) => p.set));
  for (const id of sets) {
    const set = manifest.leaves.sets.find((s: { id: string }) => s.id === id);
    assert.ok(set, `leaf set ${id} in scans.json`);
    assert.equal(set.sprites.length, 1, `${id}: one whole leaf`);
    for (const map of ["albedo", "normal"]) assert.ok(existsSync(new URL(`assets/leaves/${id}.${map}.avif`, root)), `${id}.${map}.avif`);
    assert.equal(set.origin, "generated", id);
    assert.match(sources, new RegExp(`\\| ${id} \\|[^\\n]*AI-generated[^\\n]*not CC0`), `${id} credited as AI-generated in SOURCES.md`);
  }
  for (const id of ["palmPineapple", "palmLattice"]) {
    assert.ok(manifest.bark.sets.some((s: { id: string }) => s.id === id), id);
    assert.ok(existsSync(new URL(`assets/bark/${id}.albedo.avif`, root)), id);
  }
  for (const file of ["real-fan-leaf-2", "real-fan-leaf-1", "real-dead-fronds-1", "real-queen-frond-1", "real-pineapple-cut-2", "painterly-frond-2", "painterly-fan-1"]) {
    assert.match(sources, new RegExp(`\`${file}\\.jpg\`[^\\n]*Nano Banana[^\\n]*2026-11-24\\. Prompt: ".{80,}"`), `${file}: tool, date and prompt in SOURCES.md`);
  }
});
