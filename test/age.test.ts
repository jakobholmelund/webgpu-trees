// Trees at the sizes a course gives them (age.ts, and the fit in grow.ts, palm.ts and variants.ts): a species'
// row is its specimen, and a tree fitted far smaller or narrower is grown as a younger or narrower tree of its
// kind, not as a small copy of its specimen. The sizes are the game's, measured on the first holes of Riviera,
// Torrey Pines and Walton Heath (lab/courseSizes.ts).
//
//   node --test test/age.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { habitAt, narrownessOf, youthOf } from "../src/age.ts";
import { growTree } from "../src/grow.ts";
import { frondSurface } from "../src/palm.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { crownProfile, type GrownTree, type TreeSize } from "../src/tree.ts";
import { packTrees, planVariants, type TreeInstance } from "../src/variants.ts";

const species = (name: string): TreeSpecies => ALL_SPECIES.find((s) => s.name === name)!;
const own = (sp: TreeSpecies): TreeSize => ({ height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius });
/** A tree of a species at a course's size, its trunk as its species' for its height (as the game's survey leaves it). */
const sized = (sp: TreeSpecies, height: number, crownRadius: number, crownBase: number): TreeSize => ({ height, crownRadius, crownBase, trunkRadius: (sp.trunkRadius * height) / sp.height });
const SEEDS = [1, 2, 3, 4];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** How many of its clumps reach across its crown's radius: its crown's radius over its clumps' mean radius. */
const across = (t: GrownTree) => t.size.crownRadius / mean(Array.from(t.clumps.radius));

test("every specimen grows as its row says: a tree at its specimen's size is neither young nor narrow", () => {
  for (const sp of ALL_SPECIES) {
    assert.equal(habitAt(sp, own(sp)), sp, sp.name);
    assert.equal(youthOf(sp, own(sp)), 0, sp.name);
    assert.equal(narrownessOf(sp, own(sp)), 0, sp.name);
  }
});

test("only a broadleaf's habit changes with its size: a palm's, a conifer's and a shrub's rows hold at any size", () => {
  for (const sp of ALL_SPECIES) {
    if (sp.architecture === "broadleaf") continue;
    assert.equal(habitAt(sp, sized(sp, 0.3 * sp.height, 0.2 * sp.crownRadius, 0.5 * sp.crownBase)), sp, sp.name);
  }
});

test("a short tree as wide as its specimen is not taken for a young one (an old tree cut back, or on a headland)", () => {
  for (const sp of ALL_SPECIES) assert.equal(youthOf(sp, { ...own(sp), height: 0.6 * sp.height, crownBase: 0.6 * sp.crownBase, crownRadius: 1.2 * sp.crownRadius }), 0, sp.name);
});

test("a stone pine fitted at 12 × 5.9 m (Riviera) is not tiered: a dome of its kind's cushions, not a tower of a few big ones", () => {
  const sp = species("Stone pine");
  const size = sized(sp, 12, 5.9, 5.5);
  const h = habitAt(sp, size);
  // Its top rounded, not its specimen's flat umbrella drawn up into a cylinder: at four fifths of the way up its crown
  // it is well in from its widest.
  const atTop = (s: TreeSpecies) => crownProfile(s.shape, 0.8, s) / Math.max(...Array.from({ length: 101 }, (_, i) => crownProfile(s.shape, i / 100, s)));
  console.log(`stone pine 12 x 5.9: round ${h.crownRound?.toFixed(2)} (specimen ${sp.crownRound}), width at 0.8 of its depth ${atTop(h).toFixed(2)} of its widest (specimen's outline ${atTop(sp).toFixed(2)})`);
  assert.ok((h.crownRound ?? 2) <= 2.3, `round ${h.crownRound}`);
  assert.ok(atTop(h) <= 0.85, `${atTop(h).toFixed(2)} of its widest at 0.8 of its depth`);
  // And as many cushions across its crown as its specimen has across its own, within a sixth (fitted as it was, its
  // specimen's 3 m cushions crowded into a crown half as wide: four or five stacked up its side).
  const fitted = mean(SEEDS.map((s) => across(growTree(sp, size, s))));
  const specimen = mean(SEEDS.map((s) => across(growTree(sp, own(sp), s))));
  console.log(`stone pine 12 x 5.9: ${fitted.toFixed(1)} cushions' radii across its crown's radius, its specimen ${specimen.toFixed(1)}`);
  assert.ok(fitted >= 0.84 * specimen, `${fitted.toFixed(1)} across, its specimen ${specimen.toFixed(1)}`);
});

test("a young stone pine (Riviera's median, 5.7 m) is rounded, its stem not yet forked into an umbrella's V-limbs nor its underside lifted", () => {
  const sp = species("Stone pine");
  const size = sized(sp, 5.7, 3, 3.5);
  assert.ok(youthOf(sp, size) > 0.75, `youth ${youthOf(sp, size).toFixed(2)}`);
  const h = habitAt(sp, size);
  assert.ok((h.crownRound ?? 2) <= 2.2 && (h.canopyLift ?? 0) <= 0.15 && (h.forkShare ?? 1) <= 0.25, JSON.stringify({ round: h.crownRound, lift: h.canopyLift, forks: h.forkShare }));
  assert.ok(h.leader > sp.leader, `leader ${h.leader}`);
});

test("a young Torrey pine (Torrey Pines' median, 4.8 m) is rounded, its tufts less in plates than an old one's", () => {
  const sp = species("Torrey pine");
  const h = habitAt(sp, sized(sp, 4.8, 2.9, 2));
  assert.ok((h.crownRound ?? 2) <= 2.2, `round ${h.crownRound}`);
  assert.ok((h.pads ?? 0) < (sp.pads ?? 0) && (h.pads ?? 0) > 0.5 * (sp.pads ?? 0), `pads ${h.pads}`);
  // (A tall one, 14 m, is its specimen's habit.)
  assert.equal(habitAt(sp, sized(sp, 14.1, 5.2, 6)).leader, sp.leader);
});

test("a young blue gum keeps its leader and fewer of its trunks fork; a tall one (26 m) is its specimen's", () => {
  const sp = species("Eucalyptus");
  const young = habitAt(sp, sized(sp, 10.6, 3.6, 4.5));
  assert.ok(young.leader > sp.leader + 0.2 && (young.forkShare ?? 0) < 0.5 * (sp.forkShare ?? 0) && (young.clusters ?? 0) < (sp.clusters ?? 0), JSON.stringify({ leader: young.leader, forks: young.forkShare, clusters: young.clusters }));
  assert.equal(habitAt(sp, sized(sp, 26.5, 6, 11.5)).leader, sp.leader);
});

test("a weeping willow weeps young: its whips are kept", () => {
  const sp = species("Weeping willow");
  assert.equal(habitAt(sp, sized(sp, 0.3 * sp.height, 0.3 * sp.crownRadius, 0.3 * sp.crownBase)).weep, sp.weep);
});

test("a Mexican fan palm on a head 1.4 m round (Riviera's median) keeps leaves near its kind's size, held up, not a third of them", () => {
  const sp = species("Mexican fan palm");
  const leaves = (t: GrownTree) => Math.max(...t.palm!.fronds.filter((f) => f.cls === "mature" || f.cls === "young").map((f) => f.length));
  const specimen = leaves(growTree(sp, own(sp), 1));
  for (const seed of [1, 2, 3]) {
    const t = growTree(sp, sized(sp, 14, 1.4, 9.3), seed);
    const L = leaves(t);
    let reach = 0;
    for (const f of t.palm!.fronds) for (const q of frondSurface(f)) reach = Math.max(reach, Math.hypot(q[0], q[2]));
    console.log(`fan palm 14 x 1.4, seed ${seed}: leaves ${L.toFixed(2)} m (its specimen's ${specimen.toFixed(2)} m), reaching ${reach.toFixed(2)} m`);
    assert.ok(L >= 0.6 * specimen, `leaves ${L.toFixed(2)} m, its specimen's ${specimen.toFixed(2)}`);
    assert.ok(reach <= 1.4 + 0.02, `reaches ${reach.toFixed(2)} m`);
  }
  // (Nor are an old tall palm's (31 m, its head 4.7 m round) half as long again as its kind's.)
  const tall = leaves(growTree(sp, sized(sp, 31, 4.7, 22), 1));
  assert.ok(tall <= 1.25 * specimen, `leaves ${tall.toFixed(2)} m on a palm of 31 m, its specimen's ${specimen.toFixed(2)}`);
});

test("trees of one shape but different heights are grown near their own heights, not one habit stretched over both", () => {
  const s = ALL_SPECIES.findIndex((x) => x.name === "Torrey pine");
  const sp = ALL_SPECIES[s];
  const list: TreeInstance[] = [];
  for (let i = 0; i < 20; i++) {
    const h = i < 10 ? 3.4 + 0.05 * i : 14.1 - 0.05 * i;
    list.push({ x: i * 40, y: 0, z: 0, species: s, height: h, crownRadius: 0.55 * h, crownBase: 0.25 * h, trunkRadius: (sp.trunkRadius * h) / sp.height });
  }
  const plan = planVariants(packTrees(list), ALL_SPECIES);
  for (const [i, p] of plan.placements.entries()) {
    const grown = plan.variants[p.variant].size.height;
    assert.ok(Math.abs(Math.log(grown / list[i].height!)) < Math.log(1.5), `a tree of ${list[i].height!.toFixed(1)} m fitted from one grown at ${grown.toFixed(1)} m`);
  }
});

test("a Scots pine drawn up in a wood (Walton Heath's p10, 13.7 m on a crown 2.4 m round) is not a pagoda of shelves up its stem", () => {
  const sp = species("Scots pine");
  const size = sized(sp, 13.7, 2.4, 4.2);
  // (How much of the crown's height, up its stem, has next to no leaves: the air between shelves.)
  const thin = SEEDS.map((seed) => {
    const c = growTree(sp, size, seed).clumps;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < c.count; i++) {
      lo = Math.min(lo, c.y[i] - c.radius[i]);
      hi = Math.max(hi, c.y[i] + c.radius[i]);
    }
    let n = 0;
    let gaps = 0;
    for (let y = lo; y < hi; y += 0.1) {
      n++;
      let cover = 0;
      for (let i = 0; i < c.count; i++) if (Math.abs(c.y[i] - y) < 0.7 * c.radius[i]) cover++;
      if (cover < 2) gaps++;
    }
    return gaps / n;
  });
  console.log(`Scots pine 13.7 x 2.4: ${thin.map((t) => t.toFixed(2)).join(", ")} of its height between shelves`);
  // (In shelves, as an open old tree's plates, 0.14 on average over these seeds.)
  assert.ok(mean(thin) <= 0.11, `${mean(thin).toFixed(2)} of its height between shelves`);
});
