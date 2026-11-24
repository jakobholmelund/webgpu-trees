// A crown's lobes: the few big masses a painter sees in it and lights first,
// before any leaf. Its clumps are gathered into a handful by where they
// are (k-means, from clumps spread through it), each lobe a ball round the
// clumps it gathers; every dab is then told which lobe it is in, and the
// shader lights it as the lobe's ball seen from the eye (engine.ts), so the
// light runs smoothly over all of a lobe's dabs and the crown reads as a
// few lit masses, as painted and sculpted trees do.
//
// Plain arithmetic, no three.

import { type Pieces } from "./geometry.ts";
import { type GrownTree } from "./tree.ts";

/** One lobe: its centre (the variant's own frame, metres from its foot) and how far round it reaches. */
export interface Lobe {
  x: number;
  y: number;
  z: number;
  radius: number;
}

/** How many lobes a crown has: its volume over a lobe's, a lobe `share` of the crown's mean radius round. */
export function lobeCount(tree: GrownTree, share: number, least: number, most: number): number {
  const rx = Math.max(0.05, tree.size.crownRadius);
  const ry = Math.max(0.05, (tree.size.height - tree.size.crownBase) / 2);
  const mean = Math.cbrt(rx * rx * ry);
  const r = Math.max(1e-3, share * mean);
  const k = Math.round((rx * rx * ry) / (r * r * r));
  return Math.max(least, Math.min(most, k, tree.clumps.count));
}

/**
 * A crown's clumps gathered into `count` lobes. Seeded from the clumps farthest apart (each next seed the
 * clump farthest from those chosen), so a lobe is a mass of the crown, not a slice through it; then ten
 * rounds of k-means, each clump weighed by its area. A lobe reaches its farthest clump's edge, a little
 * short of it: a lobe is not a ball of clumps, and its rim should fall inside the crown's outline.
 */
export function crownLobes(tree: GrownTree, count: number): Lobe[] {
  const cl = tree.clumps;
  const n = cl.count;
  if (n === 0) return [];
  const k = Math.max(1, Math.min(count, n));
  const cx: number[] = [];
  const cy: number[] = [];
  const cz: number[] = [];
  // (The first seed: the clump farthest from the crown's middle, so the same crown always starts the same.)
  let mx = 0;
  let my = 0;
  let mz = 0;
  for (let i = 0; i < n; i++) {
    mx += cl.x[i];
    my += cl.y[i];
    mz += cl.z[i];
  }
  mx /= n;
  my /= n;
  mz /= n;
  const near = new Float64Array(n).fill(Infinity);
  let pick = 0;
  let far = -1;
  for (let i = 0; i < n; i++) {
    const d = (cl.x[i] - mx) ** 2 + (cl.y[i] - my) ** 2 + (cl.z[i] - mz) ** 2;
    if (d > far) {
      far = d;
      pick = i;
    }
  }
  for (let g = 0; g < k; g++) {
    cx.push(cl.x[pick]);
    cy.push(cl.y[pick]);
    cz.push(cl.z[pick]);
    let best = -1;
    for (let i = 0; i < n; i++) {
      const d = (cl.x[i] - cx[g]) ** 2 + (cl.y[i] - cy[g]) ** 2 + (cl.z[i] - cz[g]) ** 2;
      if (d < near[i]) near[i] = d;
      if (near[i] > best) {
        best = near[i];
        pick = i;
      }
    }
  }
  const of = new Int32Array(n);
  for (let round = 0; round < 10; round++) {
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let g = 0; g < k; g++) {
        const d = (cl.x[i] - cx[g]) ** 2 + (cl.y[i] - cy[g]) ** 2 + (cl.z[i] - cz[g]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = g;
        }
      }
      of[i] = best;
    }
    const sum = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const s = sum[of[i]];
      const w = cl.radius[i] ** 2;
      s[0] += cl.x[i] * w;
      s[1] += cl.y[i] * w;
      s[2] += cl.z[i] * w;
      s[3] += w;
    }
    for (let g = 0; g < k; g++) {
      if (sum[g][3] > 0) {
        cx[g] = sum[g][0] / sum[g][3];
        cy[g] = sum[g][1] / sum[g][3];
        cz[g] = sum[g][2] / sum[g][3];
      }
    }
  }
  const out: Lobe[] = [];
  for (let g = 0; g < k; g++) {
    let reach = 0;
    let m = 0;
    for (let i = 0; i < n; i++) {
      if (of[i] !== g) continue;
      reach = Math.max(reach, Math.hypot(cl.x[i] - cx[g], cl.y[i] - cy[g], cl.z[i] - cz[g]) + cl.radius[i]);
      m++;
    }
    if (m === 0) continue;
    out.push({ x: cx[g], y: cy[g], z: cz[g], radius: Math.max(reach * 0.85, 0.05) });
  }
  return out;
}

/**
 * Each piece's lobe, as one more attribute `aLobe` (its lobe's centre, the variant's own frame, and its
 * radius) on a set of pieces whose `position` is each piece's centre and `aLimb.w` its variant: the lobe whose
 * ball it lies deepest in (distance over radius). The pieces are left as they were otherwise.
 */
export function withLobes(pieces: Pieces, lobes: readonly Lobe[][]): Pieces {
  const pos = pieces.attributes.position.array;
  const limb = pieces.attributes.aLimb.array;
  const count = pos.length / 3;
  const out = new Float32Array(count * 4);
  for (let q = 0; q < count; q++) {
    const v = Math.round(limb[q * 4 + 3]);
    const list = lobes[v] ?? [];
    const x = pos[q * 3];
    const y = pos[q * 3 + 1];
    const z = pos[q * 3 + 2];
    let best: Lobe | null = null;
    let bestF = Infinity;
    for (const l of list) {
      const f = Math.hypot(x - l.x, y - l.y, z - l.z) / l.radius;
      if (f < bestF) {
        bestF = f;
        best = l;
      }
    }
    // (No lobes: a ball about the piece itself, which lights it as the crown's outside.)
    if (best) out.set([best.x, best.y, best.z, best.radius], q * 4);
    else out.set([x, y, z, 1], q * 4);
  }
  return { ...pieces, attributes: { ...pieces.attributes, aLobe: { array: out, size: 4 } } };
}
