// A grown tree's bole, held to what a real one is: a stem that tapers gently and smoothly from its foot to
// its crown, still a good share of its foot's thickness where the crown starts, whatever the crown is
// like. And a crown grown narrow in a wood, held to being a crown of many sprays and not a few balls.
//
// Trees grown in a wood have tall clean boles under small high crowns (a heathland birch 13 m tall with a
// crown 2 m across starting at 10 m); these are the sizes a survey hands over for them.
//
//   node --test test/bole.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { breastHeight, growTree } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { type GrownTree, type TreeSize } from "../src/tree.ts";

const SEEDS = [1, 2];

/** Tall trees with narrow, high crowns, as grown in a wood: height, crown radius, crown base (m). */
const WOODLAND: [number, number, number][] = [
  [13.3, 1.1, 10],
  [18, 1.6, 12],
  [22, 2.5, 14],
  [11, 1.4, 6.5],
  [26, 2, 20],
];

function sizes(sp: TreeSpecies): [string, TreeSize][] {
  const own: TreeSize = { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius };
  return [["its own size", own], ...WOODLAND.map(([h, r, b]): [string, TreeSize] => [`${h}/${r}/${b}`, { height: h, crownRadius: r, crownBase: b, trunkRadius: h / 110 }])];
}

/** The first stem's nodes from its foot up its own axis (order 0) to its top. */
function stemNodes(t: GrownTree): number[] {
  const k = t.skeleton;
  const out = [0];
  for (;;) {
    const at = out[out.length - 1];
    let next = -1;
    for (let i = at + 1; i < k.count; i++) {
      if (k.parent[i] === at && k.order[i] === 0) {
        next = i;
        break;
      }
    }
    if (next < 0) return out;
    out.push(next);
  }
}

/** The first nodes of the limbs that bear leaves: order-1 axes off a stem with a clump on them or beyond them. */
function livingLimbs(t: GrownTree): Set<number> {
  const k = t.skeleton;
  const leafy = new Uint8Array(k.count);
  for (let c = 0; c < t.clumps.count; c++) leafy[t.clumps.node[c]] = 1;
  for (let i = k.count - 1; i >= 0; i--) if (leafy[i] && k.parent[i] >= 0) leafy[k.parent[i]] = 1;
  const out = new Set<number>();
  for (let i = 0; i < k.count; i++) if (k.order[i] === 1 && k.parent[i] >= 0 && k.order[k.parent[i]] === 0 && leafy[i]) out.add(i);
  return out;
}

/** The height on the stem where its first living limb leaves it. */
function firstLivingLimb(t: GrownTree, stem: number[]): number {
  const k = t.skeleton;
  const living = livingLimbs(t);
  let lowest = Infinity;
  for (const i of living) lowest = Math.min(lowest, k.y[k.parent[i]]);
  return lowest;
}

/** The stem's radius at a height, along its axis. */
function radiusAt(t: GrownTree, stem: number[], y: number): number {
  const k = t.skeleton;
  for (let j = 1; j < stem.length; j++) {
    const a = stem[j - 1];
    const b = stem[j];
    if (k.y[b] >= y) return k.radius[a] + ((k.radius[b] - k.radius[a]) * (y - k.y[a])) / Math.max(1e-9, k.y[b] - k.y[a]);
  }
  return k.radius[stem[stem.length - 1]];
}

const trees = ALL_SPECIES.filter((sp) => sp.architecture !== "palm" && Math.round(sp.stems) <= 1);

for (const sp of trees) {
  for (const [label, size] of sizes(sp)) {
    const bh = breastHeight(size);
    // (A bole worth the name: its crown starts well above breast height, and is a fifth of the tree or more.)
    if (size.crownBase < bh + 1 || size.height - size.crownBase < 0.2 * size.height) continue;
    for (const seed of SEEDS) {
      const name = `${sp.name}, ${label}, seed ${seed}`;
      const tree = growTree(sp, size, seed);
      const k = tree.skeleton;
      const stem = stemNodes(tree);

      test(`${name}: its bole under the crown is no thread`, () => {
        // (Under its fork, where a stem forks below its crown (`fork`, a stone pine's): above it, the stem
        // followed is one of its limbs.)
        const under = Math.min(size.crownBase, (sp.fork ?? 1) * size.crownBase);
        const share = radiusAt(tree, stem, 0.97 * under) / radiusAt(tree, stem, bh);
        assert.ok(share >= 0.35, `its radius under the crown is ${(share * 100).toFixed(0)}% of its radius at breast height`);
      });

      test(`${name}: its bole tapers smoothly, without steps`, () => {
        // (Its bole: the stem under its crown, up to its first living limb if that is lower: under a raised
        // canopy (a stone pine's umbrella) or a crown of pads, the great limbs leave the stem bare below the
        // leaves, and a stem narrows where a limb leaves it, by Leonardo's rule.)
        const firstLimb = firstLivingLimb(tree, stem);
        const bole = stem.filter((i) => k.y[i] <= Math.min(size.crownBase, firstLimb));
        for (let j = 1; j < bole.length; j++) {
          assert.ok(k.radius[bole[j]] <= k.radius[bole[j - 1]] + 1e-6, `its bole swells at ${k.y[bole[j]].toFixed(2)} m`);
        }
        // Above its root flare, no node bends the taper: each node's radius is near the line between its
        // neighbours' (stacked cones of a geometric taper miss it by 3% and more).
        for (let j = 1; j + 1 < bole.length; j++) {
          const [a, b, c] = [bole[j - 1], bole[j], bole[j + 1]];
          if (k.y[a] < bh) continue;
          const f = (k.y[b] - k.y[a]) / (k.y[c] - k.y[a]);
          const line = k.radius[a] + (k.radius[c] - k.radius[a]) * f;
          const kink = Math.abs(k.radius[b] - line) / k.radius[b];
          assert.ok(kink <= 0.015, `its taper bends by ${(kink * 100).toFixed(1)}% at ${k.y[b].toFixed(2)} m`);
        }
        // No piece of it is long: a curve is drawn as a curve.
        for (let j = 1; j < bole.length; j++) assert.ok(k.y[bole[j]] - k.y[bole[j - 1]] <= 0.85, `a piece of bole ${(k.y[bole[j]] - k.y[bole[j - 1]]).toFixed(2)} m long`);
      });

      test(`${name}: it is thicker at its foot than at breast height (its roots flare)`, () => {
        assert.ok(k.radius[0] >= 1.1 * radiusAt(tree, stem, bh), `its foot is ${k.radius[0].toFixed(3)} m, at breast height ${radiusAt(tree, stem, bh).toFixed(3)} m`);
      });

      if (size.crownRadius < 3) {
        test(`${name}: a narrow crown is many sprays, not a few balls`, () => {
          assert.ok(tree.clumps.count >= 30, `${tree.clumps.count} clumps`);
          let biggest = 0;
          for (let i = 0; i < tree.clumps.count; i++) biggest = Math.max(biggest, tree.clumps.radius[i]);
          assert.ok(biggest <= 0.35 * size.crownRadius, `a clump ${biggest.toFixed(2)} m round in a crown ${size.crownRadius} m round`);
        });
      }

      test(`${name}: the stubs on its bole are short, thin and leafless, and only where the species keeps them`, () => {
        // (Wood off the stem well under the crown. A conifer's lowest live boughs may leave its stem under
        // its crown and turn up into it, so only a broadleaf's are reckoned.)
        if (sp.architecture !== "broadleaf") return;
        // (A stub is dead: a living limb, bare where it leaves the stem under a raised canopy but in leaf
        // further out, is not one.)
        const living = livingLimbs(tree);
        const below: number[] = [];
        for (let i = 0; i < k.count; i++) if (k.order[i] === 1 && k.order[k.parent[i]] === 0 && k.y[k.parent[i]] < 0.9 * size.crownBase && !living.has(i)) below.push(i);
        if (!sp.boleStubs) {
          assert.equal(below.length, 0, `${below.length} stubs on a species that prunes itself clean`);
          return;
        }
        assert.ok(below.length >= 1, "a long clean bole with no stubs at all");
        for (const i of below) {
          const p = k.parent[i];
          const len = Math.hypot(k.x[i] - k.x[p], k.y[i] - k.y[p], k.z[i] - k.z[p]);
          assert.ok(len <= 0.65, `a stub ${len.toFixed(2)} m long`);
          assert.ok(k.radius[i] <= 0.6 * k.radius[p], `a stub as thick as its bole`);
          for (let c = 0; c < tree.clumps.count; c++) assert.notEqual(tree.clumps.node[c], i, "a stub in leaf");
        }
      });
    }
  }
}
