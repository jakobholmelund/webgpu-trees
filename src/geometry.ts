// What is drawn of a grown tree, at each distance: its wood as tubes and its
// clumps of leaves as dabs, many and small close to, few and broad far off.
//
// Every variant's pieces at one distance go into one buffer, one after
// another, so one mesh draws them all: the graphics card draws each
// variant's range once for every tree of it that it found in view (see
// engine.ts). Positions are the variant's own, in metres from its foot; the
// shaders fit them to each tree.
//
// A dab's corners all carry the dab's centre: it is turned to face the eye
// in the shader, and lit as one thing, the way a brush lays a dab.

import { hash01 } from "./variants.ts";
import { type GrownTree } from "./tree.ts";

/** How each distance draws a tree. */
export interface TierShape {
  /** Dabs to a clump of leaves (0: the clumps are gathered into `gather` broad dabs instead). */
  dabsPerClump: number;
  /** How big a dab is beside its clump. */
  dabSize: number;
  /** With dabsPerClump 0: how many broad dabs the whole crown is gathered into. */
  gather: number;
  /** Wood thinner than this share of the trunk is not drawn. 1 or more: no wood, only a stroke for the trunk. */
  woodFrom: number;
  /** Sides to a tube of wood: the trunk's, and the thinnest's. */
  sides: [number, number];
}

export const TIER_SHAPES: readonly TierShape[] = [
  { dabsPerClump: 3, dabSize: 1.0, gather: 0, woodFrom: 0.07, sides: [7, 4] },
  { dabsPerClump: 0, dabSize: 1, gather: 56, woodFrom: 0.3, sides: [5, 3] },
  { dabsPerClump: 0, dabSize: 1, gather: 16, woodFrom: 9, sides: [3, 3] },
];

/** A run of one variant's pieces in a buffer: what one indirect draw draws. */
export interface Range {
  firstIndex: number;
  indexCount: number;
  baseVertex: number;
}

/** Plain arrays for a buffer of pieces, and where each variant's run of them is. */
export interface Pieces {
  attributes: Record<string, { array: Float32Array; size: number }>;
  index: Uint32Array;
  ranges: Range[];
}

class Builder {
  readonly floats: Record<string, number[]> = {};
  readonly index: number[] = [];
  readonly ranges: Range[] = [];
  vertices = 0;
  private start = { index: 0, vertex: 0 };
  constructor(readonly sizes: Record<string, number>) {
    for (const k of Object.keys(sizes)) this.floats[k] = [];
  }
  begin(): void {
    this.start = { index: this.index.length, vertex: this.vertices };
  }
  end(): void {
    this.ranges.push({ firstIndex: this.start.index, indexCount: this.index.length - this.start.index, baseVertex: this.start.vertex });
  }
  /** A vertex, numbered from the variant's first. */
  vertex(values: Record<string, number[]>): number {
    for (const k in values) this.floats[k].push(...values[k]);
    return this.vertices++ - this.start.vertex;
  }
  done(): Pieces {
    const attributes: Pieces["attributes"] = {};
    for (const k of Object.keys(this.sizes)) attributes[k] = { array: new Float32Array(this.floats[k]), size: this.sizes[k] };
    return { attributes, index: new Uint32Array(this.index), ranges: this.ranges };
  }
}

const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/**
 * The dabs of every variant at one distance. Each dab: `position` its centre; `aDab` its corner (x, y),
 * its size (m, across half of it) and a number of its own; `aNormal` its clump's outward normal and how
 * deep in the crown it is; `aOffset` which way it lies from its clump's centre and what it is (0 leaves,
 * 1 a stroke for the trunk, whose half-width is in `aNormal.x`); `aLimb` the foot of the limb it is on, and
 * its variant.
 */
export function dabPieces(trees: readonly GrownTree[], shape: TierShape, part: "leaves" | "stroke" = "leaves"): Pieces {
  const b = new Builder({ position: 3, aDab: 4, aNormal: 4, aOffset: 4, aLimb: 4 });
  const quad = (c: number[], size: number, own: number, n: number[], depth: number, off: number[], kind: number, limb: number[], variant: number) => {
    let f = -1;
    for (const [cx, cy] of CORNERS) {
      const k = b.vertex({ position: c, aDab: [cx, cy, size, own], aNormal: [...n, depth], aOffset: [...off, kind], aLimb: [...limb, variant] });
      if (f < 0) f = k;
    }
    b.index.push(f, f + 1, f + 2, f, f + 2, f + 3);
  };
  trees.forEach((tree, v) => {
    b.begin();
    const { clumps: cl, skeleton: sk } = tree;
    const limbOf = (node: number) => {
      const l = sk.limb[node];
      return sk.order[node] === 0 ? [0, -1, 0] : [sk.x[l], sk.y[l], sk.z[l]];
    };
    if (part === "stroke") {
      // (The trunk, far off: one upright stroke from the ground into the crown.)
      if (shape.woodFrom >= 1) {
        const top = tree.size.crownBase + (tree.size.height - tree.size.crownBase) * 0.25;
        quad([0, top / 2, 0], top / 2, 0.5, [trunkHalfWidth(tree), 0, 0], 0, [0, 0, 0], 1, [0, -1, 0], v);
      }
    } else if (shape.dabsPerClump > 0) {
      for (let c = 0; c < cl.count; c++) {
        const centre = [cl.x[c], cl.y[c], cl.z[c]];
        const n = [cl.nx[c], cl.ny[c], cl.nz[c]];
        const r = cl.radius[c];
        // (A clump deep in the crown is mostly hidden by those outside it: one dab is all of it that shows.)
        const dabs = cl.depth[c] > 0.65 ? 1 : shape.dabsPerClump;
        for (let d = 0; d < dabs; d++) {
          const own = hash01(c * 31 + d, v * 977 + 3);
          let off = [0, 0, 0];
          if (dabs > 1) {
            // (Spread over the clump, more on its outer side: the leaves face the light.)
            const u = hash01(c * 31 + d, 11) * 2 - 1;
            const a = hash01(c * 31 + d, 12) * Math.PI * 2;
            const s = Math.sqrt(1 - u * u);
            off = [s * Math.cos(a) + n[0] * 0.6, u + n[1] * 0.6, s * Math.sin(a) + n[2] * 0.6];
            const l = Math.hypot(off[0], off[1], off[2]) || 1;
            off = off.map((q) => q / l);
          }
          const reach = dabs > 1 ? r * 0.5 : 0;
          const size = dabs > 1 ? shape.dabSize : 1.45;
          quad([centre[0] + off[0] * reach, centre[1] + off[1] * reach, centre[2] + off[2] * reach], r * size * (0.85 + own * 0.3), own, n, cl.depth[c], off, 0, limbOf(cl.node[c]), v);
        }
      }
    } else {
      for (const g of gatherClumps(tree, shape.gather)) {
        quad(g.centre, g.size * shape.dabSize, g.own, g.normal, g.depth, [0, 0, 0], 0, [0, -1, 0], v);
      }
    }
    b.end();
  });
  return b.done();
}

function trunkHalfWidth(tree: GrownTree): number {
  return tree.size.trunkRadius * 1.15;
}

/** A crown's clumps gathered into a few broad ones: where each lies, how big it is, which way it faces. */
export function gatherClumps(tree: GrownTree, count: number): { centre: number[]; size: number; normal: number[]; depth: number; own: number }[] {
  const cl = tree.clumps;
  const n = cl.count;
  if (n === 0) return [];
  const k = Math.min(count, n);
  // (k-means over the clumps' centres, from clumps at even steps through them.)
  const cx: number[] = [];
  const cy: number[] = [];
  const cz: number[] = [];
  for (let g = 0; g < k; g++) {
    const i = Math.floor(((g + 0.5) * n) / k);
    cx.push(cl.x[i]);
    cy.push(cl.y[i]);
    cz.push(cl.z[i]);
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
  const out: { centre: number[]; size: number; normal: number[]; depth: number; own: number }[] = [];
  for (let g = 0; g < k; g++) {
    let reach = 0;
    let area = 0;
    const nn = [0, 0, 0];
    let depth = 0;
    let m = 0;
    for (let i = 0; i < n; i++) {
      if (of[i] !== g) continue;
      const d = Math.hypot(cl.x[i] - cx[g], cl.y[i] - cy[g], cl.z[i] - cz[g]) + cl.radius[i];
      reach = Math.max(reach, d);
      area += cl.radius[i] ** 2;
      nn[0] += cl.nx[i];
      nn[1] += cl.ny[i];
      nn[2] += cl.nz[i];
      depth += cl.depth[i];
      m++;
    }
    if (m === 0) continue;
    const l = Math.hypot(nn[0], nn[1], nn[2]) || 1;
    // (Big enough to cover what it gathers, seen from any side, short of its farthest edge: a group of
    // clumps is not a ball of them.)
    out.push({ centre: [cx[g], cy[g], cz[g]], size: Math.max(Math.sqrt(area) * 1.1, reach * 0.8), normal: nn.map((q) => q / l), depth: depth / m, own: hash01(g, 41) });
  }
  return out;
}

/**
 * The wood of every variant at one distance, as tubes. Each vertex: `position` a point on a branch's centre
 * line; `aRadial` which way the surface lies from it, and the branch's radius there; `aLimb` the foot of the
 * limb it is on (a stem's: below its foot), and its variant; `aWood` how far along the wood from the ground
 * (m), its order, a number of its own, and how far up the tube's length it is.
 */
export function woodPieces(trees: readonly GrownTree[], shape: TierShape): Pieces {
  const b = new Builder({ position: 3, aRadial: 4, aLimb: 4, aWood: 4 });
  trees.forEach((tree, v) => {
    b.begin();
    const sk = tree.skeleton;
    if (shape.woodFrom < 1) {
      const trunk = sk.radius[0] || tree.size.trunkRadius;
      const from = trunk * shape.woodFrom;
      // (Which child carries each node on: its thickest. A tube runs on through it without a seam.)
      const main = new Int32Array(sk.count).fill(-1);
      for (let i = 1; i < sk.count; i++) {
        const p = sk.parent[i];
        if (p >= 0 && (main[p] < 0 || sk.radius[i] > sk.radius[main[p]])) main[p] = i;
      }
      const dirIn = (i: number): number[] => {
        const p = sk.parent[i];
        if (p < 0) {
          const c = main[i];
          return c >= 0 ? norm([sk.x[c] - sk.x[i], sk.y[c] - sk.y[i], sk.z[c] - sk.z[i]]) : [0, 1, 0];
        }
        return norm([sk.x[i] - sk.x[p], sk.y[i] - sk.y[p], sk.z[i] - sk.z[p]]);
      };
      const ringDir = (i: number): number[] => {
        const a = dirIn(i);
        const c = main[i];
        if (c < 0) return a;
        const o = norm([sk.x[c] - sk.x[i], sk.y[c] - sk.y[i], sk.z[c] - sk.z[i]]);
        return norm([a[0] + o[0], a[1] + o[1], a[2] + o[2]]);
      };
      for (let i = 0; i < sk.count; i++) {
        const p = sk.parent[i];
        if (p < 0 || sk.radius[i] < from) continue;
        const own = hash01(i, v * 131 + 5);
        const sides = sk.radius[i] > trunk * 0.4 ? shape.sides[0] : shape.sides[1];
        const isMain = main[p] === i;
        const r0 = isMain ? sk.radius[p] : sk.radius[i];
        const d0 = isMain ? ringDir(p) : dirIn(i);
        const d1 = ringDir(i);
        const limbNode = sk.order[i] === 0 ? -1 : sk.limb[i];
        const limb = limbNode < 0 ? [0, -1, 0] : [sk.x[limbNode], sk.y[limbNode], sk.z[limbNode]];
        const ring = (at: number, dir: number[], r: number, up: number): number => {
          const [u, w] = basis(dir);
          let first = -1;
          for (let s = 0; s < sides; s++) {
            const a = (s / sides) * Math.PI * 2;
            const radial = [u[0] * Math.cos(a) + w[0] * Math.sin(a), u[1] * Math.cos(a) + w[1] * Math.sin(a), u[2] * Math.cos(a) + w[2] * Math.sin(a)];
            const k = b.vertex({ position: [sk.x[at], sk.y[at], sk.z[at]], aRadial: [...radial, r], aLimb: [...limb, v], aWood: [sk.along[at], sk.order[i], own, up] });
            if (first < 0) first = k;
          }
          return first;
        };
        const a0 = ring(p, d0, r0, 0);
        const a1 = ring(i, d1, sk.radius[i], 1);
        for (let s = 0; s < sides; s++) {
          const s1 = (s + 1) % sides;
          b.index.push(a0 + s, a1 + s, a1 + s1, a0 + s, a1 + s1, a0 + s1);
        }
      }
    }
    b.end();
  });
  return b.done();
}

function norm(a: number[]): number[] {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

/** Two directions square to `d` and to each other, chosen the same way for every `d`, so rings along a branch do not twist. */
function basis(d: number[]): [number[], number[]] {
  const ref = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm([ref[1] * d[2] - ref[2] * d[1], ref[2] * d[0] - ref[0] * d[2], ref[0] * d[1] - ref[1] * d[0]]);
  const w = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  return [u, w];
}

/**
 * The realistic look's near leaves: each clump as `perClump` cards, each a spray of leaves on a twig, set
 * in the crown at angles of their own (not turned to the eye: a card's face shows as it is). They face
 * out of the crown and a little up, as leaves turn to the light, each its own way about that. Each card:
 * `position` its centre; `aDab` its corner, its size (m, across half of it), a number of its own;
 * `aNormal` its clump's outward normal and depth; `aOffset` its own facing (unit) and 0; `aTangent` the
 * way its twig runs (unit, square to its facing); `aLimb` the foot of its limb and its variant.
 */
export function cardPieces(trees: readonly GrownTree[], perClump: number, size: number): Pieces {
  const b = new Builder({ position: 3, aDab: 4, aNormal: 4, aOffset: 4, aTangent: 4, aLimb: 4 });
  trees.forEach((tree, v) => {
    b.begin();
    const { clumps: cl, skeleton: sk } = tree;
    for (let c = 0; c < cl.count; c++) {
      const n = [cl.nx[c], cl.ny[c], cl.nz[c]];
      const r = cl.radius[c];
      const node = cl.node[c];
      const l = sk.limb[node];
      const limb = sk.order[node] === 0 ? [0, -1, 0] : [sk.x[l], sk.y[l], sk.z[l]];
      // (Deep in the crown, fewer: little of it shows.)
      const count = cl.depth[c] > 0.65 ? Math.max(1, perClump >> 1) : perClump;
      for (let d = 0; d < count; d++) {
        const k = c * 37 + d;
        const own = hash01(k, v * 613 + 7);
        const u = hash01(k, 21) * 2 - 1;
        const a = hash01(k, 22) * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const off = [s * Math.cos(a), u, s * Math.sin(a)];
        const at = [cl.x[c] + off[0] * r * 0.4, cl.y[c] + off[1] * r * 0.4, cl.z[c] + off[2] * r * 0.4];
        // (Its facing: out of the crown and up, turned its own way by as much again.)
        const face = norm([n[0] * 0.9 + off[0] * 0.8, n[1] * 0.9 + off[1] * 0.8 + 0.5, n[2] * 0.9 + off[2] * 0.8]);
        // (Its twig: square to its facing, at an angle of its own about it, leaning outward and down.)
        const [e1, e2] = basis(face);
        const t = hash01(k, 23) * Math.PI * 2;
        const tangent = norm([e1[0] * Math.cos(t) + e2[0] * Math.sin(t), e1[1] * Math.cos(t) + e2[1] * Math.sin(t), e1[2] * Math.cos(t) + e2[2] * Math.sin(t)]);
        const half = r * size * (0.8 + hash01(k, 24) * 0.4);
        let f = -1;
        for (const [cx, cy] of CORNERS) {
          const i = b.vertex({ position: at, aDab: [cx, cy, half, own], aNormal: [...n, cl.depth[c]], aOffset: [...face, 0], aTangent: [...tangent, 0], aLimb: [...limb, v] });
          if (f < 0) f = i;
        }
        b.index.push(f, f + 1, f + 2, f, f + 2, f + 3);
      }
    }
    b.end();
  });
  return b.done();
}
