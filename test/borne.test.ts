// Leaves and wood belong together: every leaf drawn grows from wood that is drawn, and no twig ends bare.
// Close to, a crown is looked into from below against the sky; a spray of leaves with no twig to it reads
// as pasted in the air, and a twig with no leaves on it as a dead stick poking out of the crown.
//
//   node --test test/borne.test.ts     (prints each species' numbers)

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { IN_CLUMP, LINE_STRIDE, SPRAY_FOOT, TIER_SHAPES, cardPieces, clumpTwigs, dabPieces, woodLines } from "../src/geometry.ts";
import { type GrownTree, type TreeSize } from "../src/tree.ts";

const SEEDS = [1, 2, 77];

function sizes(sp: TreeSpecies): [string, TreeSize][] {
  const own: TreeSize = { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius };
  return [
    ["its own size", own],
    ["short and wide", { height: 0.6 * own.height, crownRadius: 1.2 * own.crownRadius, crownBase: 0.6 * own.crownBase, trunkRadius: 0.8 * own.trunkRadius }],
  ];
}

/**
 * The wood a tier draws (pieces of it at least `from` m in radius), and how far a point is from it: from the
 * centre lines its tubes are drawn along (`woodLines`, close to: curves through the nodes, in short straight
 * pieces), not the skeleton's straight pieces between nodes.
 */
function woodNear(t: GrownTree, from: number): (x: number, y: number, z: number) => number {
  const k = t.skeleton;
  const { line } = woodLines(t, TIER_SHAPES[0]);
  // (Every short straight piece of the drawn lines, as its two ends.)
  const ends: number[] = [];
  for (let i = 0; i < k.count; i++) {
    const l = line[i];
    if (!l || k.radius[i] < from) continue;
    for (let o = 0; o + LINE_STRIDE < l.length; o += LINE_STRIDE) ends.push(l[o], l[o + 1], l[o + 2], l[o + LINE_STRIDE], l[o + LINE_STRIDE + 1], l[o + LINE_STRIDE + 2]);
  }
  // (A grid of the pieces, each in every cell its box touches, so a point asks only the pieces near it.)
  const cell = 0.5;
  const grid = new Map<string, number[]>();
  for (let i = 0; i < ends.length; i += 6) {
    const lo = [0, 1, 2].map((a) => Math.floor(Math.min(ends[i + a], ends[i + 3 + a]) / cell));
    const hi = [0, 1, 2].map((a) => Math.floor(Math.max(ends[i + a], ends[i + 3 + a]) / cell));
    for (let a = lo[0]; a <= hi[0]; a++)
      for (let b = lo[1]; b <= hi[1]; b++)
        for (let c = lo[2]; c <= hi[2]; c++) {
          const key = `${a},${b},${c}`;
          const list = grid.get(key);
          if (list) list.push(i);
          else grid.set(key, [i]);
        }
  }
  const piece = (x: number, y: number, z: number, i: number) => {
    const dx = ends[i + 3] - ends[i];
    const dy = ends[i + 4] - ends[i + 1];
    const dz = ends[i + 5] - ends[i + 2];
    const l2 = dx * dx + dy * dy + dz * dz;
    const s = l2 > 0 ? Math.min(1, Math.max(0, ((x - ends[i]) * dx + (y - ends[i + 1]) * dy + (z - ends[i + 2]) * dz) / l2)) : 0;
    return Math.hypot(x - ends[i] - dx * s, y - ends[i + 1] - dy * s, z - ends[i + 2] - dz * s);
  };
  return (x, y, z) => {
    let best = Infinity;
    for (let ring = 0; ring < 64; ring++) {
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      const cz = Math.floor(z / cell);
      for (let a = -ring; a <= ring; a++)
        for (let b = -ring; b <= ring; b++)
          for (let c = -ring; c <= ring; c++) {
            if (Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) !== ring) continue;
            for (const i of grid.get(`${cx + a},${cy + b},${cz + c}`) ?? []) best = Math.min(best, piece(x, y, z, i));
          }
      // (Nothing nearer can lie in a further ring.)
      if (best <= ring * cell) return best;
    }
    return best;
  };
}

/** The twigs' ends: nodes with nothing beyond them, not a stem's foot. */
function ends(t: GrownTree): number[] {
  const k = t.skeleton;
  const has = new Uint8Array(k.count);
  for (let i = 0; i < k.count; i++) if (k.parent[i] >= 0) has[k.parent[i]] = 1;
  const out: number[] = [];
  for (let i = 0; i < k.count; i++) if (!has[i] && k.parent[i] >= 0) out.push(i);
  return out;
}

for (const sp of ALL_SPECIES) {
  for (const [label, size] of sizes(sp)) {
    const trees = SEEDS.map((seed) => growTree(sp, size, seed));
    const name = `${sp.name}, ${label}`;

    test(`${name}: every leaf card grows from wood that is drawn`, () => {
      const worst = [0, 0];
      for (const t of trees) {
        const trunk = t.skeleton.radius[0];
        // Near and mid, as the realistic look draws them (engine.ts): its spray's foot is on the wood that
        // tier draws, or, mid, on wood thinner than that tier draws (too thin to show there), on the tree's own.
        for (const [tier, per, size] of [
          [0, 12, 0.8],
          [1, 2, 1.45],
        ] as const) {
          const near = woodNear(t, tier === 0 ? trunk * TIER_SHAPES[0].woodFrom : 0);
          const P = cardPieces([t], per, size);
          const pos = P.attributes.position.array;
          const dab = P.attributes.aDab.array;
          const tan = P.attributes.aTangent.array;
          for (let v = 0; v < pos.length / 3; v += 4) {
            const on = dab[4 * v + 2] * SPRAY_FOOT;
            const d = near(pos[3 * v] - tan[4 * v] * on, pos[3 * v + 1] - tan[4 * v + 1] * on, pos[3 * v + 2] - tan[4 * v + 2] * on);
            worst[tier] = Math.max(worst[tier], d);
          }
        }
      }
      console.log(`cards ${name}: farthest foot from wood ${worst[0].toFixed(3)} m near, ${worst[1].toFixed(3)} m mid`);
      assert.ok(worst[0] < 0.01 && worst[1] < 0.01, `a card's foot is ${Math.max(...worst).toFixed(3)} m from the wood`);
    });

    test(`${name}: every painted dab near is on wood that is drawn`, () => {
      let off = 0;
      let all = 0;
      let worst = 0;
      for (const t of trees) {
        const near = woodNear(t, t.skeleton.radius[0] * TIER_SHAPES[0].woodFrom);
        const D = dabPieces([t], TIER_SHAPES[0]);
        const pos = D.attributes.position.array;
        const dab = D.attributes.aDab.array;
        for (let v = 0; v < pos.length / 3; v += 4) {
          const f = near(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]) / dab[4 * v + 2];
          worst = Math.max(worst, f);
          all++;
          if (f > 1) off++;
        }
      }
      console.log(`dabs ${name}: ${((100 * off) / all).toFixed(1)}% of dabs reach no wood, the farthest ${worst.toFixed(2)} of its size from it`);
      // (A dab is a round mark of paint, as wide as its clump: the wood it hangs on is under it, or nearly.)
      assert.ok(off <= 0.05 * all, `${off} of ${all} dabs reach no wood`);
      assert.ok(worst < 1.6, `a dab is ${worst.toFixed(2)} of its size from the wood`);
    });

    test(`${name}: no twig ends bare`, () => {
      for (const t of trees) {
        const cl = t.clumps;
        const twigs = clumpTwigs(t);
        const mine = new Int32Array(t.skeleton.count).fill(-1);
        twigs.forEach((list, c) => list.forEach((i) => (mine[i] = c)));
        // Each end bears a clump, or is inside one (and so bears its leaves) ...
        // (Dead stubs on a clean bole, below the crown, bear no leaves: `boleStubs`.)
        const bare = ends(t).filter((i) => mine[i] < 0 && t.skeleton.y[i] >= t.size.crownBase);
        assert.equal(bare.length, 0, `${bare.length} twigs end with no clump on them or round them (more than ${IN_CLUMP} of a clump's radius from its centre)`);
        // ... and a card's foot is at it, and a painted dab over it.
        const k = t.skeleton;
        const P = cardPieces([t], 12, 0.8);
        const pos = P.attributes.position.array;
        const dabA = P.attributes.aDab.array;
        const tan = P.attributes.aTangent.array;
        const feet: number[] = [];
        for (let v = 0; v < pos.length / 3; v += 4) {
          const on = dabA[4 * v + 2] * SPRAY_FOOT;
          feet.push(pos[3 * v] - tan[4 * v] * on, pos[3 * v + 1] - tan[4 * v + 1] * on, pos[3 * v + 2] - tan[4 * v + 2] * on);
        }
        const D = dabPieces([t], TIER_SHAPES[0]);
        const dp = D.attributes.position.array;
        const dd = D.attributes.aDab.array;
        for (const i of ends(t)) {
          if (mine[i] < 0) continue;
          const r = cl.radius[mine[i]];
          let foot = Infinity;
          for (let f = 0; f < feet.length; f += 3) foot = Math.min(foot, Math.hypot(feet[f] - k.x[i], feet[f + 1] - k.y[i], feet[f + 2] - k.z[i]));
          assert.ok(foot <= 0.25 * r, `twig ${i}'s end is ${foot.toFixed(2)} m from the nearest spray's foot (its clump ${r.toFixed(2)} m round)`);
          let under = false;
          for (let v = 0; v < dp.length / 3 && !under; v += 4) under = Math.hypot(dp[3 * v] - k.x[i], dp[3 * v + 1] - k.y[i], dp[3 * v + 2] - k.z[i]) < dd[4 * v + 2];
          assert.ok(under, `twig ${i}'s end is under no painted dab`);
        }
      }
    });
  }
}
