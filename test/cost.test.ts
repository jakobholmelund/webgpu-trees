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
import { TIER_SHAPES, dabPieces, dabsOf } from "../src/geometry.ts";
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
