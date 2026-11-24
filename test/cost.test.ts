// What the trees cost the graphics card, offline (tools/cost/proxy.ts): the near tier's cards (dabs, four
// vertices each, every one marching the tree's box of light) for a tree fitted to a course's size. The courses'
// trees are mostly smaller and narrower than their specimens, grown with more, finer clumps (age.ts, grow.ts
// `CLUMP_NARROW`); drawn three dabs a clump, a Riviera tree took up to 700 cards near to, where its specimen-sized
// clumps had laid 250. A finer clump takes fewer, bigger dabs (geometry.ts `dabsOf`), so the cards follow the
// crown and not its clumps: these hold that.

import assert from "node:assert/strict";
import { test } from "node:test";
import { MORE_SPECIES, STARTER_SPECIES, type TreeSpecies } from "../src/species.ts";
import { growTree } from "../src/grow.ts";
import { RIBBON_WIDE, TIER_SHAPES, TWIG, WOOD_BANDS, dabPieces, dabsOf, woodPieces } from "../src/geometry.ts";
import { fitSizesFor } from "../lab/courseSizes.ts";
import { type Lib, variantCosts } from "../tools/cost/proxy.ts";
import * as grow from "../src/grow.ts";
import * as variants from "../src/variants.ts";
import * as geometry from "../src/geometry.ts";
import * as palm from "../src/palmGeometry.ts";
import * as species from "../src/species.ts";

const lib = { ...grow, ...variants, ...geometry, ...palm, ...species } as unknown as Lib;
const named = (name: string): TreeSpecies => [...Object.values(MORE_SPECIES), ...STARTER_SPECIES].find((s) => s.name === name)!;

/** The species on Riviera's and Torrey Pines' first holes, and Walton Heath's oak: the round's narrow and small ones. */
const FITTED = ["Stone pine", "Coast live oak", "Oak", "Torrey pine", "California sycamore", "Monterey cypress", "Eucalyptus"];
/** The most near cards a fitted tree of these may take, on average over its seeds: its kind's clumps' (a66c411: 340 at the most), with room (3afffb6: 690). */
const MOST_CARDS = 400;
const SEEDS = [1, 2];

test("a tree at a course's size takes no more near cards than its kind's clumps would lay over its crown", () => {
  let total = 0;
  for (const name of FITTED) {
    const sp = named(name);
    for (const f of fitSizesFor(sp).filter((x) => !x.stand)) {
      let cards = 0;
      for (const seed of SEEDS) {
        const g = growTree(sp, { height: f.height, crownRadius: f.crownRadius, crownBase: f.crownBase, trunkRadius: 0.03 * f.height }, seed);
        cards += variantCosts(lib, [g])[0][0].cards;
      }
      cards /= SEEDS.length;
      total += cards;
      assert.ok(cards <= MOST_CARDS, `${name} ${f.key} (${f.height} m, r ${f.crownRadius}): ${cards} near cards, over ${MOST_CARDS}`);
    }
  }
  // (All of them, the sizes taken together: within a tenth of a66c411's 4,850, before the round that made the
  // clumps finer; 3afffb6, after it, drew 8,460 here.)
  assert.ok(total <= 5300, `${total} near cards over the fitted sizes`);
});

test("a finer clump takes fewer dabs, by its area, and never none; a clump of its kind's size takes them all", () => {
  assert.equal(dabsOf(3, 1, 0.99), 3);
  assert.equal(dabsOf(3, 1.4, 0.5), 3);
  assert.equal(dabsOf(3, 0.3, 0), 1);
  // (Half its kind's size: three quarters of a dab, made one.)
  assert.equal(dabsOf(3, 0.5, 0.99), 1);
  // (0.8 of it: 1.92 dabs, two but now and then.)
  const n = Array.from({ length: 1000 }, (_, i) => dabsOf(3, 0.8, (i + 0.5) / 1000));
  const mean = n.reduce((a, b) => a + b, 0) / n.length;
  assert.ok(Math.abs(mean - 1.92) < 0.01, `${mean}`);
});

test("a tree at its specimen's size keeps three dabs to a clump near to", () => {
  const sp = named("Oak");
  const g = growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, 3);
  assert.equal(g.clumpShare, undefined);
  const p = dabPieces([g], TIER_SHAPES[0]);
  const outer = Array.from({ length: g.clumps.count }, (_, c) => g.clumps.depth[c] <= 0.65).filter(Boolean).length;
  // (Three to each outer clump, one to each deep one, and one over any twig's end none covers.)
  assert.ok(p.ranges[0].indexCount / 6 >= 3 * outer + (g.clumps.count - outer));
});

// The near wood (geometry.ts `woodPieces`, engine.ts `WOOD_DEPTHS`): most of a near tree's vertices were its twigs,
// every one marching the box of light. A twig is a ribbon turned to the eye, two vertices a ring where its tube
// had four, and turns a little further between rings; and the wood lies in bands by how thick it is, thickest
// first, so a tree whose thinner bands are under a pixel's fraction across where it stands is drawn without
// them (each band's wood is thinner than the edge before it, and its vertices come after the thicker bands').

test("a tree at a course's size draws its near wood in two-fifths fewer vertices", () => {
  let total = 0;
  for (const name of FITTED) {
    const sp = named(name);
    for (const f of fitSizesFor(sp).filter((x) => !x.stand)) {
      for (const seed of SEEDS) {
        const g = growTree(sp, { height: f.height, crownRadius: f.crownRadius, crownBase: f.crownBase, trunkRadius: 0.03 * f.height }, seed);
        total += variantCosts(lib, [g])[0][0].woodVerts / SEEDS.length;
      }
    }
  }
  // (d8bd96b, every twig a four-sided tube: 330,950 over the fitted sizes; ribbons, 207,700.)
  assert.ok(total <= 215_000, `${total} near wood vertices over the fitted sizes`);
});

test("the near wood lies in bands, thickest first, each thinner than the edge before it, its vertices after the thicker bands'", () => {
  for (const name of ["Oak", "California sycamore", "Weeping willow", "Eucalyptus", "Shrub", "Canary date palm"]) {
    const sp = named(name);
    const g = growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, 1);
    const p = woodPieces([g], TIER_SHAPES[0]);
    const r = p.ranges[0];
    const bands = r.bands!;
    assert.equal(bands.length, WOOD_BANDS.length + 1);
    assert.equal(bands[bands.length - 1].indexCount, r.indexCount);
    const rad = p.attributes.aRadial.array;
    let from = 0;
    bands.forEach((b, k) => {
      assert.ok(b.indexCount >= from, `${name}: band ${k} runs backwards`);
      for (let i = from; i < b.indexCount; i++) {
        const v = p.index[r.firstIndex + i];
        assert.ok(v < b.vertexCount, `${name}: band ${k} uses a vertex past its run`);
        if (k > 0) assert.ok(rad[(r.baseVertex + v) * 4 + 3] < WOOD_BANDS[k - 1] + 1e-9, `${name}: band ${k} holds wood ${rad[(r.baseVertex + v) * 4 + 3]} m thick`);
      }
      from = b.indexCount;
    });
  }
});

test("a near twig is a ribbon of two vertices a ring, either side of its centre line; a mid one is still a tube", () => {
  // (A birch's and a shrub's finest wood is millimetres thick, and most of their vertices; an oak's at its
  // specimen's size is no thinner than 19 mm, and most of its wood is tubes.)
  for (const [name, most] of [["Silver birch", 0.4], ["Shrub", 0.4], ["Oak", 0.05]] as const) {
    const sp = named(name);
    const g = growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, 1);
    const near = woodPieces([g], TIER_SHAPES[0]);
    const rad = near.attributes.aRadial.array;
    const nrm = near.attributes.aNormal.array;
    const count = near.attributes.position.array.length / 3;
    let ribbons = 0;
    let twigTubes = 0;
    for (let k = 0; k < count; k++) {
      const flat = nrm[k * 3] === 0 && nrm[k * 3 + 1] === 0 && nrm[k * 3 + 2] === 0;
      if (flat) {
        ribbons++;
        // (Its side and its half width, or its tip, a radius on.)
        assert.ok([RIBBON_WIDE, -RIBBON_WIDE, 0].some((x) => Math.abs(rad[k * 4] - x) < 1e-6) && rad[k * 4 + 1] === 0 && rad[k * 4 + 2] === 0);
        assert.ok(rad[k * 4 + 3] < 2 * TWIG, `${name}: a ribbon ${rad[k * 4 + 3]} m thick`);
      } else if (rad[k * 4 + 3] < TWIG) twigTubes++;
    }
    assert.ok(ribbons >= most * count, `${name}: ${ribbons} of ${count} vertices on ribbons`);
    // (A tube thinning into a twig is closed where its ribbon starts: only its cap is a twig's thickness.)
    assert.ok(twigTubes <= 0.25 * ribbons, `${name}: ${twigTubes} tube vertices thinner than a twig, ${ribbons} on ribbons`);
    const mid = woodPieces([g], TIER_SHAPES[1]).attributes.aNormal.array;
    for (let k = 0; k < mid.length; k += 3) assert.ok(Math.hypot(mid[k], mid[k + 1], mid[k + 2]) > 0.5);
  }
});
