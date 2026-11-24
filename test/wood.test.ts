// The wood as it is drawn close to, held to what wood looks like: it bends and does not kink, a limb leaves
// its parent from inside it with a collar and no seam, a trunk stands on buttresses, and no tube is left
// open where it could be seen.
//
//   node --test test/wood.test.ts     (prints each species' numbers)

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { ALL_SPECIES } from "../src/species.ts";
import { LINE_STRIDE as S, TIER_SHAPES, woodLines, woodPieces } from "../src/geometry.ts";
import { type GrownTree } from "../src/tree.ts";

const SEEDS = [1, 2];
const NEAR = TIER_SHAPES[0];
/** Wood this thick (m) is a limb or a trunk; thinner, a twig. */
const THICK = 0.035;

function grow(seed: number, sp: (typeof ALL_SPECIES)[number]): GrownTree {
  return growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, seed);
}

function angle(a: number[], b: number[]): number {
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  return (Math.acos(Math.min(1, Math.max(-1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb)))) * 180) / Math.PI;
}

/** How far a point is outside the wood of a node's drawn line and its main child's (m; under 0 inside). */
function outside(t: GrownTree, W: ReturnType<typeof woodLines>, p: number, x: number[]): number {
  let best = Infinity;
  for (const l of [W.line[p], W.line[W.main[p]]]) {
    if (!l) continue;
    for (let o = 0; o + S < l.length; o += S) {
      const d = [l[o + S] - l[o], l[o + S + 1] - l[o + 1], l[o + S + 2] - l[o + 2]];
      const l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      const f = l2 > 0 ? Math.min(1, Math.max(0, ((x[0] - l[o]) * d[0] + (x[1] - l[o + 1]) * d[1] + (x[2] - l[o + 2]) * d[2]) / l2)) : 0;
      const r = l[o + 6] + (l[o + S + 6] - l[o + 6]) * f;
      best = Math.min(best, Math.hypot(x[0] - l[o] - d[0] * f, x[1] - l[o + 1] - d[1] * f, x[2] - l[o + 2] - d[2] * f) - r);
    }
  }
  return best;
}

for (const sp of ALL_SPECIES) {
  const trees = SEEDS.map((seed) => grow(seed, sp));

  test(`${sp.name}: its wood bends, and does not kink`, () => {
    // Along every tube, piece to piece (through the nodes too): a limb's turn between two pieces stays small
    // enough to read as a curve; a twig, a few pixels across, turns further. (Drawn straight from node to
    // node, as the grower leaves them, a limb kinks by 40° to 60° at the worst, a twig by 90°.)
    let thickWorst = 0;
    const thin: number[] = [];
    for (const t of trees) {
      const W = woodLines(t, NEAR);
      for (let i = 0; i < t.skeleton.count; i++) {
        const l = W.line[i];
        if (!l) continue;
        const pts: number[][] = [];
        for (let o = 0; o < l.length; o += S) pts.push([l[o], l[o + 1], l[o + 2], l[o + 6]]);
        const c = W.main[i];
        const m = c >= 0 ? W.line[c] : null;
        if (m) pts.push([m[S], m[S + 1], m[S + 2], m[S + 6]]);
        for (let k = 1; k + 1 < pts.length; k++) {
          const a = [0, 1, 2].map((j) => pts[k][j] - pts[k - 1][j]);
          const b = [0, 1, 2].map((j) => pts[k + 1][j] - pts[k][j]);
          if (Math.hypot(a[0], a[1], a[2]) < 1e-4 || Math.hypot(b[0], b[1], b[2]) < 1e-4) continue;
          const turn = angle(a, b);
          if (pts[k][3] >= THICK) thickWorst = Math.max(thickWorst, turn);
          else thin.push(turn);
        }
      }
    }
    thin.sort((a, b) => a - b);
    const p99 = thin[Math.floor(0.99 * (thin.length - 1))] ?? 0;
    console.log(`bends ${sp.name}: a limb turns at most ${thickWorst.toFixed(1)}° from piece to piece, a twig ${p99.toFixed(1)}° (99th percentile)`);
    assert.ok(thickWorst <= 25, `a limb turns ${thickWorst.toFixed(1)}° from one piece to the next`);
    assert.ok(p99 <= 40, `a twig turns ${p99.toFixed(1)}° from one piece to the next (99th percentile)`);
  });

  test(`${sp.name}: no tube is open where it can be seen`, () => {
    for (const t of trees) {
      const sk = t.skeleton;
      const W = woodLines(t, NEAR);
      const P = woodPieces([t], NEAR);
      const pos = P.attributes.position.array;
      const rad = P.attributes.aRadial.array;
      const index = P.index;
      // (Edges with one triangle: the rims of the tubes' open ends.)
      const edges = new Map<string, number>();
      for (let k = 0; k < index.length; k += 3) {
        for (let e = 0; e < 3; e++) {
          const a = index[k + e];
          const b = index[k + ((e + 1) % 3)];
          const key = a < b ? `${a},${b}` : `${b},${a}`;
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
      }
      // (A twig's ribbon, near, is open by nature: turned to the eye, it is all the eye sees of the twig. Its
      // vertices have no normal.)
      const nrm = P.attributes.aNormal.array;
      const ribbon = (v: number) => nrm[3 * v] === 0 && nrm[3 * v + 1] === 0 && nrm[3 * v + 2] === 0;
      const rim = new Set<number>();
      for (const [key, n] of edges) if (n === 1) for (const v of key.split(",")) if (!ribbon(+v)) rim.add(+v);
      // Each is where a tube starts: a stem's foot, under the ground, or a limb's start, inside its parent's wood.
      const starts: { at: number[]; parent: number }[] = [];
      for (let i = 0; i < sk.count; i++) {
        const p = sk.parent[i];
        const l = W.line[i];
        if (l && p >= 0 && W.main[p] !== i) starts.push({ at: [l[0], l[1], l[2]], parent: p });
      }
      // (Where a tube runs on into wood of another limb, which the wind moves its own way, the two meet ring
      // to ring: two rims in one place, closed.)
      const at = (v: number) => [0, 1, 2].map((j) => pos[3 * v + j] + rad[4 * v + j] * rad[4 * v + 3]);
      const seams = new Map<string, number>();
      for (const v of rim) {
        const key = at(v).map((q) => q.toFixed(5)).join(",");
        seams.set(key, (seams.get(key) ?? 0) + 1);
      }
      for (const v of rim) {
        const c = [pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]];
        const surface = at(v);
        if (surface[1] < 0 || (seams.get(surface.map((q) => q.toFixed(5)).join(",")) ?? 0) >= 2) continue;
        const start = starts.find((s) => Math.hypot(s.at[0] - c[0], s.at[1] - c[1], s.at[2] - c[2]) < 1e-5);
        assert.ok(start, `an open rim at ${c.map((q) => q.toFixed(2)).join(", ")}, not where a tube starts`);
        const out = outside(t, W, start.parent, surface);
        assert.ok(out <= 0.1 * sk.radius[start.parent] + 0.002, `a limb's start shows ${(out * 100).toFixed(1)} cm out of its parent`);
      }
    }
  });

  test(`${sp.name}: a limb leaves its parent swollen, and its wood runs on without a step`, () => {
    for (const t of trees) {
      const sk = t.skeleton;
      const W = woodLines(t, NEAR);
      for (let i = 0; i < sk.count; i++) {
        const l = W.line[i];
        if (!l) continue;
        const n = l.length / S;
        // Its line ends at its node, as thick as the node, and its main child's line starts there as thick.
        assert.ok(Math.abs(l[(n - 1) * S + 6] - sk.radius[i]) < 1e-6, `node ${i}'s wood is not its radius at its end`);
        const m = W.line[W.main[i]];
        if (m) assert.ok(Math.abs(m[6] - l[(n - 1) * S + 6]) < 1e-6 && Math.hypot(m[0] - l[(n - 1) * S], m[1] - l[(n - 1) * S + 1], m[2] - l[(n - 1) * S + 2]) < 1e-6, `a step where node ${i}'s wood runs on`);
        const p = sk.parent[i];
        if (W.main[p] === i) continue;
        // A limb: as thick as itself or thicker where it leaves, thinner than its parent, and thinning (or
        // keeping its thickness) out from there; thick enough, thicker where it leaves than further out.
        for (let q = 0; q < n; q++) {
          assert.ok(l[q * S + 6] >= sk.radius[i] - 1e-6, `limb ${i} is thinner than itself`);
          assert.ok(l[q * S + 6] <= Math.max(sk.radius[p], sk.radius[i]) + 1e-6, `limb ${i} is thicker than its parent`);
          if (q > 0) assert.ok(l[q * S + 6] <= l[(q - 1) * S + 6] + 1e-6, `limb ${i} swells out from its parent`);
        }
        if (sk.radius[i] >= 0.04 && sk.radius[i] < 0.5 * sk.radius[p]) assert.ok(l[6] >= 1.2 * sk.radius[i], `limb ${i} leaves its parent with no collar`);
      }
    }
  });

  test(`${sp.name}: its trunk stands on buttresses, which ease away up it`, () => {
    if (sp.architecture === "palm") return;
    for (const t of trees) {
      const sk = t.skeleton;
      if (sk.radius[0] < 0.1) continue;
      const P = woodPieces([t], NEAR);
      const pos = P.attributes.position.array;
      const rad = P.attributes.aRadial.array;
      // (Each ring of the trunk near the ground: its radius round it.)
      const rings = new Map<string, number[]>();
      for (let v = 0; v < pos.length / 3; v++) {
        if (Math.hypot(pos[3 * v], pos[3 * v + 2]) > 0.5 * sk.radius[0] || pos[3 * v + 1] > 1.5) continue;
        if (rad[4 * v + 3] < 0.5 * sk.radius[0]) continue;
        const key = pos[3 * v + 1].toFixed(4);
        const r = Math.hypot(rad[4 * v], rad[4 * v + 1], rad[4 * v + 2]) * rad[4 * v + 3];
        rings.set(key, [...(rings.get(key) ?? []), r]);
      }
      const spread = (y: number) => {
        let best = [Infinity, 0];
        for (const [k, rs] of rings) if (Math.abs(+k - y) < Math.abs(best[0] - y)) best = [+k, Math.max(...rs) / Math.min(...rs)];
        return best[1];
      };
      assert.ok(spread(0) >= 1.3, `its foot is round: ${spread(0).toFixed(2)} between its widest and narrowest`);
      assert.ok(spread(1.3) <= 1.05, `its buttresses reach breast height: ${spread(1.3).toFixed(2)}`);
    }
  });
}
