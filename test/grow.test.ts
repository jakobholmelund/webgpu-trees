// Growing, held to what a grown tree must be: the size it was asked for, the
// shape of its species' crown, every leaf on wood, a sound skeleton, and cheap
// enough to grow a wood of them.
//
//   node --test test/grow.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { breastHeight, growTree } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { crownProfile, type GrownTree, type TreeSize } from "../src/tree.ts";

const SEEDS = [1, 2, 77];

/**
 * Each species at its own size, and at two others: shorter with a wider crown, taller with a narrower, higher
 * one. (Its crown raised by a quarter, but keeping at least 60% of its depth: a high-crowned tree, a fan
 * palm's head at four fifths of its height, would otherwise be asked for a crown above its own top.)
 */
function sizes(sp: TreeSpecies): [string, TreeSize][] {
  const own: TreeSize = { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius };
  const tall = 1.3 * own.height;
  const tallBase = Math.min(1.3 * 1.25 * own.crownBase, tall - 0.6 * 1.3 * (own.height - own.crownBase));
  return [
    ["its own size", own],
    ["short and wide", { height: 0.6 * own.height, crownRadius: 1.2 * own.crownRadius, crownBase: 0.6 * own.crownBase, trunkRadius: 0.8 * own.trunkRadius }],
    ["tall and narrow", { height: tall, crownRadius: 0.8 * own.crownRadius, crownBase: tallBase, trunkRadius: 1.2 * own.trunkRadius }],
  ];
}

/** A stem's radius at a height, along its axis (its order-0 nodes) from its foot. */
function stemRadiusAt(t: GrownTree, foot: number, y: number): number {
  const k = t.skeleton;
  const kids: number[][] = Array.from({ length: k.count }, () => []);
  for (let i = 0; i < k.count; i++) if (k.parent[i] >= 0) kids[k.parent[i]].push(i);
  let at = foot;
  for (;;) {
    const next = kids[at].find((c) => k.order[c] === k.order[foot]);
    if (next === undefined) return k.radius[at];
    if (k.y[next] >= y) {
      const f = (y - k.y[at]) / (k.y[next] - k.y[at]);
      return k.radius[at] + (k.radius[next] - k.radius[at]) * f;
    }
    at = next;
  }
}

for (const sp of ALL_SPECIES) {
  for (const [label, size] of sizes(sp)) {
    for (const seed of SEEDS) {
      const name = `${sp.name}, ${label}, seed ${seed}`;
      const tree = growTree(sp, size, seed);
      const k = tree.skeleton;
      const c = tree.clumps;
      const depth = size.height - size.crownBase;

      test(`${name}: the same arguments grow the same tree`, () => {
        const again = growTree(sp, size, seed);
        for (const key of ["x", "y", "z", "radius", "parent", "order", "limb", "along"] as const) {
          assert.deepEqual(again.skeleton[key], k[key], `skeleton.${key}`);
        }
        for (const key of ["x", "y", "z", "radius", "nx", "ny", "nz", "node", "depth", "tx", "ty", "tz"] as const) {
          assert.deepEqual(again.clumps[key], c[key], `clumps.${key}`);
        }
      });

      test(`${name}: it is the size it was asked to be`, () => {
        let top = 0;
        for (let i = 0; i < k.count; i++) top = Math.max(top, k.y[i]);
        let reach = 0;
        let lowest = Infinity;
        for (let i = 0; i < c.count; i++) {
          top = Math.max(top, c.y[i] + c.radius[i]);
          reach = Math.max(reach, Math.hypot(c.x[i], c.z[i]) + c.radius[i]);
          lowest = Math.min(lowest, c.y[i] - c.radius[i]);
        }
        assert.ok(top >= 0.95 * size.height && top <= 1.03 * size.height, `top ${top.toFixed(2)} for height ${size.height}`);
        assert.ok(reach >= 0.9 * size.crownRadius && reach <= 1.04 * size.crownRadius, `reach ${reach.toFixed(2)} for crown radius ${size.crownRadius}`);
        assert.ok(lowest >= size.crownBase - 0.08 * depth, `a clump's bottom at ${lowest.toFixed(2)}, under the crown's base ${size.crownBase}`);
        assert.ok(lowest <= size.crownBase + 0.15 * depth, `the lowest clump's bottom at ${lowest.toFixed(2)}, well over the crown's base ${size.crownBase}`);
      });

      test(`${name}: its crown keeps to its species' outline`, () => {
        const bands = 6;
        for (let i = 0; i < c.count; i++) {
          const t = (c.y[i] - size.crownBase) / depth;
          const b = Math.min(bands - 1, Math.max(0, Math.floor(t * bands)));
          let widest = 0;
          for (let s = 0; s <= 8; s++) widest = Math.max(widest, crownProfile(sp.shape, (b + s / 8) / bands, sp));
          const reach = Math.hypot(c.x[i], c.z[i]) + c.radius[i];
          const may = widest * size.crownRadius * 1.1 + c.radius[i];
          assert.ok(reach <= may, `clump ${i} at band ${b} reaches ${reach.toFixed(2)}, more than ${may.toFixed(2)}`);
        }
      });

      test(`${name}: every clump hangs on wood`, () => {
        assert.ok(c.count > 0, "it has leaves");
        for (let i = 0; i < c.count; i++) {
          const n = c.node[i];
          assert.ok(n >= 0 && n < k.count, `clump ${i} hangs on node ${n}`);
          const d = Math.hypot(c.x[i] - k.x[n], c.y[i] - k.y[n], c.z[i] - k.z[n]);
          assert.ok(d <= c.radius[i], `clump ${i} is ${d.toFixed(3)} m from its node, its radius ${c.radius[i].toFixed(3)}`);
          assert.ok(c.depth[i] >= 0 && c.depth[i] <= 1, `clump ${i} depth ${c.depth[i]}`);
          const nl = Math.hypot(c.nx[i], c.ny[i], c.nz[i]);
          assert.ok(Math.abs(nl - 1) < 1e-3, `clump ${i} normal length ${nl}`);
          // Its twig's way: from its node's parent to its node.
          const p = k.parent[n];
          const want = p < 0 ? [0, 1, 0] : [k.x[n] - k.x[p], k.y[n] - k.y[p], k.z[n] - k.z[p]];
          const wl = Math.hypot(want[0], want[1], want[2]);
          const dot = (c.tx[i] * want[0] + c.ty[i] * want[1] + c.tz[i] * want[2]) / wl;
          assert.ok(Math.abs(Math.hypot(c.tx[i], c.ty[i], c.tz[i]) - 1) < 1e-3 && dot > 0.999, `clump ${i}'s twig way is not its twig's (${dot})`);
        }
      });

      if (sp.architecture === "palm") {
        test(`${name}: a palm is one stem, as thick at its top, crowned with its fronds`, () => {
          let top = 0;
          let fronds = 0;
          for (let i = 0; i < k.count; i++) {
            if (k.order[i] === 0) top = i;
            else if (k.order[k.parent[i]] === 0) fronds++;
            assert.ok(k.order[i] <= 1, `node ${i} is on a branch off a frond`);
          }
          assert.ok(Math.abs(k.radius[top] / size.trunkRadius - 1) <= 0.1, `its stem's top is ${k.radius[top].toFixed(3)} m, not ${size.trunkRadius}`);
          assert.ok(fronds >= 0.8 * sp.whorl && fronds <= sp.whorl, `${fronds} fronds of ${sp.whorl}`);
          for (let i = 0; i < k.count; i++) if (k.order[i] === 1) assert.ok(k.radius[i] < 0.5 * k.radius[top], `frond node ${i} is as thick as a stem`);
        });
      }

      if ((sp.weep ?? 0) >= 0.5) {
        test(`${name}: it weeps, in whips hanging nearly to its crown's base`, () => {
          let hanging = 0;
          let lowest = Infinity;
          for (let i = 0; i < c.count; i++) {
            if (c.ty[i] > -0.9) continue;
            hanging++;
            lowest = Math.min(lowest, c.y[i] - c.radius[i]);
          }
          // (A third at least hang straight down: the rest are its crown's top, and its whips' arches.)
          assert.ok(hanging >= c.count / 3, `${hanging} of ${c.count} clumps hang`);
          assert.ok(lowest <= size.crownBase + 0.1 * depth, `its whips stop at ${lowest.toFixed(2)}, the crown's base ${size.crownBase}`);
        });
      }

      test(`${name}: its skeleton is sound`, () => {
        assert.equal(k.parent[0], -1, "node 0 is a stem's foot");
        let feet = 0;
        for (let i = 0; i < k.count; i++) {
          const p = k.parent[i];
          if (p < 0) {
            feet++;
            assert.equal(k.order[i], 0, `foot ${i} is on a stem`);
            assert.equal(k.limb[i], i, `foot ${i} is its own limb`);
            continue;
          }
          assert.ok(p < i, `node ${i}'s parent ${p} comes before it`);
          assert.ok(k.radius[p] >= k.radius[i], `node ${i} (r ${k.radius[i]}) is thicker than its parent ${p} (r ${k.radius[p]})`);
          assert.ok(k.radius[i] > 0, `node ${i} has wood`);
          assert.ok(k.order[i] === k.order[p] || k.order[i] === k.order[p] + 1, `node ${i}'s order follows its parent's`);
          const seg = Math.hypot(k.x[i] - k.x[p], k.y[i] - k.y[p], k.z[i] - k.z[p]);
          assert.ok(Math.abs(k.along[i] - k.along[p] - seg) < 1e-3, `node ${i}'s along`);
          // Its limb: an order-1 node off a stem, or its stem's foot.
          const l = k.limb[i];
          if (k.order[i] === 0) assert.equal(k.parent[l], -1, `stem node ${i}'s limb is its foot`);
          else {
            assert.equal(k.order[l], 1, `node ${i}'s limb ${l} is order 1`);
            assert.equal(k.order[k.parent[l]], 0, `node ${i}'s limb ${l} leaves a stem`);
            let a = i;
            while (a !== l && a >= 0) a = k.parent[a];
            assert.equal(a, l, `node ${i}'s limb ${l} is an ancestor`);
          }
        }
        assert.equal(feet, Math.max(1, Math.round(sp.stems)), "one foot to a stem");
        const bh = breastHeight(size);
        for (let i = 0; i < k.count; i++) {
          if (k.parent[i] >= 0) continue;
          const r = stemRadiusAt(tree, i, bh);
          assert.ok(Math.abs(r / size.trunkRadius - 1) <= 0.1, `stem ${i}'s radius at ${bh.toFixed(2)} m is ${r.toFixed(3)}, not ${size.trunkRadius}`);
        }
      });
    }
  }

  test(`${sp.name}: grows fast enough, and small enough, at its own size`, () => {
    const size = sizes(sp)[0][1];
    for (let i = 0; i < 3; i++) growTree(sp, size, 100 + i);
    let best = Infinity;
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const t = growTree(sp, size, 200 + i);
      best = Math.min(best, performance.now() - t0);
      assert.ok(t.skeleton.count <= 4000, `${t.skeleton.count} nodes`);
    }
    assert.ok(best < 40, `${best.toFixed(1)} ms`);
  });
}
