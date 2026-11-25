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

import { flareHeight } from "./grow.ts";
import { palmStemInto } from "./palmGeometry.ts";
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
  /** Sides to a tube of wood: the trunk's, and the thinnest's (between, by its radius to the trunk's to the 3/4). */
  sides: [number, number];
  /** The most a tube of thick wood turns between two of its rings (degrees); thin wood a little further. */
  turn: number;
  /** The most rings a piece of wood between two nodes is cut into: thick wood's, and thin's. */
  rings: [number, number];
  /**
   * A twig's (wood thinner than `TWIG`): its sides (2: a ribbon turned to the eye, `woodPieces`), the most rings
   * to a piece of it, and the most it turns between two (degrees). Most of a near tree's wood is twigs, a pixel
   * or two across even close to: near, a ribbon of two vertices a ring where its tube had four, and its rings
   * every 20 degrees of its turning where they were every 14.
   */
  twig: { sides: number; rings: number; turn: number };
  /** Rounded wood: a collar where a limb leaves its parent, buttresses round a stem's foot. */
  round: boolean;
}

// (Near, all the wood: every leaf grows from a twig, and a twig left out leaves its leaves in the air and the
// branch it grew on ending bare. A twig thinner than a pixel is shrunk away in the shader (engine.ts
// `keepThin`). Mid, the branches that are still a pixel or so across where a tree is handed to it, reaching
// up into the leaves; its twigs would be under a pixel there, and only cost.)
export const TIER_SHAPES: readonly TierShape[] = [
  { dabsPerClump: 3, dabSize: 1.0, gather: 0, woodFrom: 0, sides: [16, 4], turn: 9, rings: [8, 3], twig: { sides: 2, rings: 3, turn: 20 }, round: true },
  { dabsPerClump: 0, dabSize: 1, gather: 56, woodFrom: 0.1, sides: [7, 3], turn: 18, rings: [3, 1], twig: { sides: 3, rings: 1, turn: 28.8 }, round: false },
  { dabsPerClump: 0, dabSize: 1, gather: 16, woodFrom: 9, sides: [3, 3], turn: 30, rings: [1, 1], twig: { sides: 3, rings: 1, turn: 48 }, round: false },
];

/** A run of one variant's pieces in a buffer: what one indirect draw draws. */
export interface Range {
  firstIndex: number;
  indexCount: number;
  baseVertex: number;
  /**
   * Wood's bands (`WOOD_BANDS`), thickest first: for each, the indices and the vertices from the run's first
   * up to and with that band (the last band's are the run's own).
   */
  bands?: { indexCount: number; vertexCount: number }[];
}

/** Plain arrays for a buffer of pieces, and where each variant's run of them is. */
export interface Pieces {
  attributes: Record<string, { array: Float32Array; size: number }>;
  index: Uint32Array;
  ranges: Range[];
}

export class Builder {
  /**
   * Each attribute's numbers so far, as doubles (rounded to floats only by `done`), in typed arrays that grow as
   * they fill: the near wood lays some millions of numbers a course, and as arrays of numbers, each vertex an object
   * of arrays, laying them was half its time. `filled[k]` is how many of `floats[k]` are laid.
   */
  readonly floats: Record<string, Float64Array> = {};
  readonly filled: Record<string, number> = {};
  readonly index: number[] = [];
  readonly ranges: Range[] = [];
  vertices = 0;
  /** Where the variant being built starts: its first index and vertex. */
  start = { index: 0, vertex: 0 };
  // (Not a parameter property: node runs this file's tests by stripping its types, which those are not.)
  readonly sizes: Record<string, number>;
  /** The attributes by number (`slot`), for laying numbers without looking them up by name. */
  private readonly names: string[];
  private readonly data: Float64Array[];
  private readonly at: number[];
  constructor(sizes: Record<string, number>) {
    this.sizes = sizes;
    this.names = Object.keys(sizes);
    this.data = this.names.map((k) => new Float64Array(1024 * sizes[k]));
    this.at = this.names.map(() => 0);
    this.names.forEach((k, i) => {
      Object.defineProperty(this.floats, k, { get: () => this.data[i], enumerable: true });
      Object.defineProperty(this.filled, k, { get: () => this.at[i], enumerable: true });
    });
  }
  /** An attribute's number, for `putAt`. */
  slot(k: string): number {
    return this.names.indexOf(k);
  }
  /** Room in an attribute's numbers for `more` of them. */
  private room(i: number, more: number): Float64Array {
    let a = this.data[i];
    const need = this.at[i] + more;
    if (need > a.length) {
      const b = new Float64Array(Math.max(need, 2 * a.length));
      b.set(a.subarray(0, this.at[i]));
      this.data[i] = a = b;
    }
    return a;
  }
  begin(): void {
    this.start = { index: this.index.length, vertex: this.vertices };
  }
  end(): void {
    this.ranges.push({ firstIndex: this.start.index, indexCount: this.index.length - this.start.index, baseVertex: this.start.vertex });
  }
  /**
   * End a variant whose triangles were put in bands (`bands[k]`, indices numbered from its first vertex) rather
   * than in `index`: laid out band by band, and its vertices renumbered in the order they are first used, so a
   * run of its first bands uses only the vertices at the start of its run.
   */
  endBands(bands: number[][]): void {
    const from = this.start.vertex;
    const count = this.vertices - from;
    const order = new Int32Array(count).fill(-1);
    let next = 0;
    const cumulative: { indexCount: number; vertexCount: number }[] = [];
    const index = this.index;
    const first = index.length;
    for (const band of bands) {
      for (let j = 0; j < band.length; j++) {
        const k = band[j];
        if (order[k] < 0) order[k] = next++;
        index.push(order[k]);
      }
      cumulative.push({ indexCount: index.length - first, vertexCount: next });
    }
    // (Any vertex no triangle uses goes last.)
    for (let k = 0; k < count; k++) if (order[k] < 0) order[k] = next++;
    this.names.forEach((_, i) => {
      const size = this.sizes[this.names[i]];
      const a = this.data[i];
      const old = a.slice(from * size, (from + count) * size);
      for (let k = 0; k < count; k++) {
        const to = (from + order[k]) * size;
        const at = k * size;
        for (let j = 0; j < size; j++) a[to + j] = old[at + j];
      }
    });
    this.ranges.push({ firstIndex: this.start.index, indexCount: index.length - first, baseVertex: from, bands: cumulative });
  }
  /** A vertex, numbered from the variant's first. */
  vertex(values: Record<string, ArrayLike<number>>): number {
    for (const k in values) {
      const i = this.names.indexOf(k);
      const from = values[k];
      const to = this.room(i, from.length);
      let n = this.at[i];
      for (let j = 0; j < from.length; j++) to[n++] = from[j];
      this.at[i] = n;
    }
    return this.vertices++ - this.start.vertex;
  }
  /** One attribute's numbers (by its `slot`) for the vertex being laid (then `next`): as `vertex` lays them, without an object of arrays. */
  putAt(i: number, x: number, y: number, z: number, w?: number): void {
    const to = this.room(i, 4);
    let n = this.at[i];
    to[n++] = x;
    to[n++] = y;
    to[n++] = z;
    if (w !== undefined) to[n++] = w;
    this.at[i] = n;
  }
  /** The vertex whose attributes were `putAt`, numbered from the variant's first. */
  next(): number {
    return this.vertices++ - this.start.vertex;
  }
  done(): Pieces {
    const attributes: Pieces["attributes"] = {};
    this.names.forEach((k, i) => (attributes[k] = { array: Float32Array.from(this.data[i].subarray(0, this.at[i])), size: this.sizes[k] }));
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
 * its variant. A variant `skip` says is left without leaves (its range is empty).
 */
export function dabPieces(trees: readonly GrownTree[], shape: TierShape, part: "leaves" | "stroke" = "leaves", skip?: readonly boolean[]): Pieces {
  const b = new Builder({ position: 3, aDab: 4, aNormal: 4, aOffset: 4, aLimb: 4 });
  const [P, DAB, NORMAL, OFFSET, LIMB] = ["position", "aDab", "aNormal", "aOffset", "aLimb"].map((k) => b.slot(k));
  const quad = (c: number[], size: number, own: number, n: number[], depth: number, off: number[], kind: number, limb: number[], variant: number) => {
    let f = -1;
    for (const [cx, cy] of CORNERS) {
      b.putAt(P, c[0], c[1], c[2]);
      b.putAt(DAB, cx, cy, size, own);
      b.putAt(NORMAL, n[0], n[1], n[2], depth);
      b.putAt(OFFSET, off[0], off[1], off[2], kind);
      b.putAt(LIMB, limb[0], limb[1], limb[2], variant);
      const k = b.next();
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
        // (From its lowest leaves: a crown kept to the top of its size's, a stone pine's or one its stand has
        // lifted, has its trunk bare up to it.)
        let low = tree.size.height;
        for (let c = 0; c < cl.count; c++) low = Math.min(low, cl.y[c] - cl.radius[c]);
        const from = Math.max(tree.size.crownBase, low < tree.size.height ? low : tree.size.crownBase);
        const top = from + (tree.size.height - from) * 0.25;
        quad([0, top / 2, 0], top / 2, 0.5, [trunkHalfWidth(tree), 0, 0], 0, [0, 0, 0], 1, [0, -1, 0], v);
      }
    } else if (skip?.[v]) {
      // (Its leaves are drawn otherwise: a conifer's near boughs as sheets, `sheetPieces`.)
    } else if (shape.dabsPerClump > 0) {
      const twigs = clumpTwigs(tree);
      for (let c = 0; c < cl.count; c++) {
        const centre = [cl.x[c], cl.y[c], cl.z[c]];
        const n = [cl.nx[c], cl.ny[c], cl.nz[c]];
        const r = cl.radius[c];
        // (A clump deep in the crown is mostly hidden by those outside it: one dab is all of it that shows.)
        // (And a finer clump than its kind's, fewer: as many dabs over the crown as its kind's clumps would lay.)
        const dabs = cl.depth[c] > 0.65 ? 1 : dabsOf(shape.dabsPerClump, tree.clumpShare ?? 1, hash01(c * 31, v * 977 + 5));
        const laid: number[][] = [];
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
          const size = dabs >= shape.dabsPerClump ? shape.dabSize : dabs > 1 ? DAB_TWO : 1.45;
          const at = [centre[0] + off[0] * reach, centre[1] + off[1] * reach, centre[2] + off[2] * reach];
          laid.push([...at, r * size * (0.85 + own * 0.3)]);
          quad(at, laid[d][3], own, n, cl.depth[c], off, 0, limbOf(cl.node[c]), v);
        }
        // (And one more over each of its twigs' ends that none of those covers, half way in to its centre:
        // no twig of a clump pokes out of it bare.)
        twigs[c].forEach((t, j) => {
          if (laid.some((q) => Math.hypot(sk.x[t] - q[0], sk.y[t] - q[1], sk.z[t] - q[2]) < q[3])) return;
          const own = hash01(c * 31 + dabs + j, v * 977 + 3);
          const at = [(sk.x[t] + centre[0]) / 2, (sk.y[t] + centre[1]) / 2, (sk.z[t] + centre[2]) / 2];
          const off = norm([sk.x[t] - centre[0], sk.y[t] - centre[1], sk.z[t] - centre[2]]);
          quad(at, r * shape.dabSize * (0.85 + own * 0.3), own, n, cl.depth[c], off, 0, limbOf(t), v);
        });
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

/** Two dabs to a clump: each this big beside it, between three's (`TierShape.dabSize`) and one's (1.45). */
const DAB_TWO = 1.2;

/**
 * How many dabs a clump takes, of `most`, its clump this share of its kind's size (`GrownTree.clumpShare`):
 * as many as cover the same share of the crown, `most` times its area, at least one; a fraction made up by
 * the clump's own number `u`.
 */
export function dabsOf(most: number, share: number, u: number): number {
  const want = Math.max(1, most * Math.min(1, share) ** 2);
  const n = Math.floor(want);
  return Math.min(most, n + (u < want - n ? 1 : 0));
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
    // (And never past it: a dab reaching out of the crown shows, as a tree passes from tier to tier and each
    // draws in the other's pixels, as specks of leaves floating round its top.)
    out.push({ centre: [cx[g], cy[g], cz[g]], size: Math.min(reach, Math.max(Math.sqrt(area) * 1.1, reach * 0.8)), normal: nn.map((q) => q / l), depth: depth / m, own: hash01(g, 41) });
  }
  return out;
}

/** A sample of a drawn centre line, in a line's array: where it is (3), which way the wood runs (3), its radius, how fast that changes along it (per m), and how far along the wood from the ground it is. */
export const LINE_STRIDE = 9;

const DEG = Math.PI / 180;
/** Wood at least this thick (m) is thick: it turns by a tier's `turn` between rings, and thinner wood by `THIN_TURN` times that. */
const THICK = 0.035;
const THIN_TURN = 1.6;
/** Wood thinner than this (m) is a twig, with a tier's twig's sides and rings. */
export const TWIG = 0.02;
/** A twig's ribbon's half width, in its radii: as wide as the four-sided tube it was, on average over the ways that was turned (2 sqrt(2) / pi). */
export const RIBBON_WIDE = (2 * Math.SQRT2) / Math.PI;
/**
 * The near tier's wood in bands by how thick it is (m, as grown): the trunk and wood at least the first, then
 * wood thinner than each. Each variant's triangles are laid out band by band, thickest first, and its
 * vertices in the order they are first used, so drawing a variant's first few bands draws only their
 * vertices: the engine draws, for each tree, the bands that are a pixel's fraction or more across where it
 * stands (engine.ts `WOOD_DEPTHS`); wood thinner than that the shader would shrink to nothing anyway.
 */
export const WOOD_BANDS: readonly number[] = [0.016, 0.006];
/** How far a limb's tube, where it leaves its parent's, is turned towards the way its parent runs: it leaves in a curve, not at an angle. */
const LEAVE = 0.35;
/**
 * A fork: a limb nearly as thick as its parent there (from the first share of its radius to the second) is
 * the parent dividing, not a limb put out of its side. Its tube starts back inside the parent's, up to a
 * parent's radius back, running the parent's way, and bends out of it.
 */
const FORK: [number, number] = [0.35, 0.85];
/** A limb's collar: how much thicker it is where it leaves its parent (at most), in how many of its radii past its parent's surface the swelling falls by e (a trumpet's flare, not a bulb), and the thinnest that has one (m). */
const COLLAR = 0.5;
const COLLAR_FALL = 0.9;
const COLLAR_FROM = 0.025;
/** A stem's buttresses: how much they swell it at the ground, over how much of its flare's height they ease away, and how far the foot goes on under the ground (m, and its radii). */
const BUTTRESS = 0.9;
const BUTTRESS_RISE = 0.55;
/** How wide a buttress is round the stem, in its share of the spacing between them; more sides go round a stem's foot to draw them. */
const BUTTRESS_WIDTH = 0.17;
const BUTTRESS_SIDES = 16;
const UNDERGROUND = 0.15;
const UNDERGROUND_RADII = 0.4;
/** A cap closing a tube's end: a ring this far round from its side towards its tip (rad), on wood with at least `CAP_RING_SIDES` sides. */
const CAP_RING = 55 * DEG;
const CAP_RING_SIDES = 6;

/**
 * The wood's centre lines as a tier draws them. Each node drawn has a line from its parent's node to it,
 * both ends included (`LINE_STRIDE` numbers to a sample): a curve through the nodes, as a cubic Hermite
 * piece whose ends run the way the wood runs through each node, so a tube bends through a node and does not
 * kink there; a limb leaves its parent at the parent's centre line, bending out of it, its collar thickening
 * it where it leaves. Cut into as many samples as it needs to turn no more than the tier's `turn` between
 * two. `main` is the child each node's tube runs on into (its thickest); a node's line is null if the tier
 * does not draw it (or it is a stem's foot).
 */
export interface WoodLines {
  line: (Float64Array | null)[];
  main: Int32Array;
  /**
   * Where each limb's line starts on its parent's: the parent's sample just before it (the line's start lies
   * on the piece from it to the next), or -1 if it starts at the parent's node itself.
   */
  from: Int32Array;
}

/** Each grown tree's wood lines, by tier: the near cards, the near wood and the clumps' shoots all ask for the same ones. */
const LINES = new WeakMap<GrownTree, Map<TierShape, WoodLines>>();

export function woodLines(tree: GrownTree, shape: TierShape): WoodLines {
  let byShape = LINES.get(tree);
  if (!byShape) LINES.set(tree, (byShape = new Map()));
  let lines = byShape.get(shape);
  if (!lines) byShape.set(shape, (lines = linesOf(tree, shape)));
  return lines;
}

function linesOf(tree: GrownTree, shape: TierShape): WoodLines {
  const sk = tree.skeleton;
  const n = sk.count;
  const R = sk.radius;
  const trunk = R[0] || tree.size.trunkRadius;
  const thinnest = trunk * shape.woodFrom;
  const line: (Float64Array | null)[] = new Array(n).fill(null);
  const main = mainChildren(sk);
  const from = new Int32Array(n).fill(-1);
  if (shape.woodFrom >= 1) return { line, main, from };
  const drawn = (i: number) => i >= 0 && sk.parent[i] >= 0 && R[i] >= thinnest;
  const len = new Float64Array(n);
  const dirIn: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = sk.parent[i];
    if (p < 0) {
      const c = main[i];
      dirIn[i] = c >= 0 ? norm([sk.x[c] - sk.x[i], sk.y[c] - sk.y[i], sk.z[c] - sk.z[i]]) : [0, 1, 0];
      continue;
    }
    const d = [sk.x[i] - sk.x[p], sk.y[i] - sk.y[p], sk.z[i] - sk.z[p]];
    len[i] = Math.hypot(d[0], d[1], d[2]);
    dirIn[i] = len[i] > 1e-6 ? [d[0] / len[i], d[1] / len[i], d[2] / len[i]] : dirIn[p];
  }
  // (The way a tube runs through each node: halfway between the pieces either side, if it runs on.)
  const tan: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    const c = main[i];
    tan[i] = sk.parent[i] >= 0 && drawn(c) ? norm(add(dirIn[i], dirIn[c])) : dirIn[i];
  }
  // (How fast its radius falls along it there: between the pieces either side, flat where it swells.)
  const slope = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = sk.parent[i];
    const c = main[i];
    if (p < 0) {
      slope[i] = c >= 0 && len[c] > 1e-6 ? (R[c] - R[i]) / len[c] : 0;
      continue;
    }
    const before = main[p] === i ? R[p] : R[i];
    if (drawn(c)) {
      const g = (R[c] - before) / Math.max(1e-6, len[i] + len[c]);
      slope[i] = (before - R[i]) * (R[i] - R[c]) >= 0 ? g : 0;
    } else slope[i] = (R[i] - before) / Math.max(1e-6, len[i]);
  }
  const hf = flareHeight(tree.size, tree.buttress ?? 0);
  for (let i = 0; i < n; i++) {
    if (!drawn(i)) continue;
    const p = sk.parent[i];
    const lateral = main[p] !== i;
    const b = [sk.x[i], sk.y[i], sk.z[i]];
    let a = [sk.x[p], sk.y[p], sk.z[p]];
    let ta = tan[p];
    let back = 0;
    let fork = 0;
    if (lateral) {
      // (A fork's tube starts back inside its parent's, so the two part as one divides; a limb's at its parent's centre.)
      const u = Math.min(1, Math.max(0, (R[i] / R[p] - FORK[0]) / (FORK[1] - FORK[0])));
      fork = u * u * (3 - 2 * u);
      back = fork * Math.min(R[p], sk.parent[p] >= 0 ? 0.8 * len[p] : R[p]);
      // (Back along the parent's own line as drawn, so it starts on the parent's wood.)
      let way = tan[p];
      const pl = line[p];
      if (back > 0 && pl) {
        let left = back;
        let o = pl.length - LINE_STRIDE;
        while (o > 0) {
          const q = o - LINE_STRIDE;
          const piece = Math.hypot(pl[o] - pl[q], pl[o + 1] - pl[q + 1], pl[o + 2] - pl[q + 2]);
          if (left <= piece || q === 0) {
            const f = Math.min(1, left / Math.max(piece, 1e-9));
            a = [pl[o] + (pl[q] - pl[o]) * f, pl[o + 1] + (pl[q + 1] - pl[o + 1]) * f, pl[o + 2] + (pl[q + 2] - pl[o + 2]) * f];
            way = [pl[q + 3], pl[q + 4], pl[q + 5]];
            from[i] = q / LINE_STRIDE;
            break;
          }
          left -= piece;
          o = q;
        }
      } else if (back > 0) a = sub(a, scale(tan[p], back));
      const chord = norm(sub(b, a));
      ta = norm(add(chord, scale(way, LEAVE + 1.5 * fork)));
      if (dot(ta, chord) < 0.3) ta = chord;
    }
    const L = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), 1e-6);
    const tb = tan[i];
    const r0 = lateral ? R[i] : R[p];
    const g0 = lateral ? 0 : slope[p];
    const r1 = R[i];
    const g1 = slope[i];
    const thick = Math.max(r0, r1) >= THICK;
    const twig = Math.max(r0, r1) < TWIG;
    // (How far it turns along its length, and where: rings go at even steps of its turning, so where it bends
    // hardest, near a node it leaves at an angle, they come closest.)
    const FINE = 24;
    const turned = [0];
    let before = ta;
    for (let q = 1; q <= FINE; q++) {
      const t = q / FINE;
      const t2 = t * t;
      const w0 = 6 * t2 - 6 * t;
      const w1 = (3 * t2 - 4 * t + 1) * L;
      const w2 = -6 * t2 + 6 * t;
      const w3 = (3 * t2 - 2 * t) * L;
      const way = norm([w0 * a[0] + w1 * ta[0] + w2 * b[0] + w3 * tb[0], w0 * a[1] + w1 * ta[1] + w2 * b[1] + w3 * tb[1], w0 * a[2] + w1 * ta[2] + w2 * b[2] + w3 * tb[2]]);
      turned.push(turned[q - 1] + Math.acos(Math.min(1, Math.max(-1, dot(before, way)))));
      before = way;
    }
    const turn = turned[FINE];
    let k = Math.ceil(turn / ((thick ? shape.turn : twig ? shape.twig.turn : shape.turn * THIN_TURN) * DEG) - 1e-9);
    k = Math.min(Math.max(k, 1), thick ? shape.rings[0] : twig ? Math.min(shape.rings[1], shape.twig.rings) : shape.rings[1]);
    const ts: number[] = [0];
    for (let q = 1, j = 1; q < k; q++) {
      const want = (turn * q) / k;
      while (j < FINE && turned[j] < want) j++;
      const f = (want - turned[j - 1]) / Math.max(1e-9, turned[j] - turned[j - 1]);
      ts.push((j - 1 + Math.min(1, Math.max(0, f))) / FINE);
    }
    ts.push(1);
    // (A stem's foot in finer rings, where its buttresses ease away.)
    if (shape.round && sk.order[i] === 0 && sk.y[p] - sk.y[sk.limb[i]] < 2 * hf) {
      const m = Math.min(6, Math.ceil(L / (0.3 * hf)));
      for (let q = 1; q < m; q++) ts.push(q / m);
    }
    // (A limb's collar: swollen inside its parent and where it leaves its surface, falling away fast out of
    // it and then slowly, as a trumpet flares, to nothing by the next node.)
    let collar = { from: 0, C: 0, fall: 1, gone: 1 };
    if (lateral && shape.round && r1 >= COLLAR_FROM) {
      const rp = R[p];
      const c = dot(norm(sub(b, a)), tan[p]);
      const sinA = Math.sqrt(Math.max(0, 1 - c * c));
      const from = Math.min(back + rp / Math.max(sinA, 0.25) - 0.5 * r1, 0.6 * L);
      // (None on a fork: its two tubes run on together inside the parent's, and one swollen would show round the other.)
      const C = Math.min(COLLAR * (1 - fork), Math.max(0, (rp * 0.97) / r1 - 1));
      const fall = COLLAR_FALL * r1;
      if (C > 0.02 && L - from > 0.5 * fall) {
        collar = { from, C, fall, gone: Math.exp(-(L - from) / fall) };
        for (const f of [0, 0.7, 1.6, 3]) if (from + f * fall < L) ts.push((from + f * fall) / L);
      }
    }
    ts.sort((a, b) => a - b);
    const kept = ts.filter((t, j) => t <= 1 && (j === 0 || t - ts[j - 1] > 0.02 || t === 1));
    for (let j = kept.length - 2; j > 0; j--) if (kept[j + 1] - kept[j] <= 0.02) kept.splice(j, 1);
    const out = new Float64Array(kept.length * LINE_STRIDE);
    const lo = Math.min(r0, r1);
    const hi = Math.max(r0, r1);
    kept.forEach((t, q) => {
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      const d00 = 6 * t2 - 6 * t;
      const d10 = 3 * t2 - 4 * t + 1;
      const d01 = -6 * t2 + 6 * t;
      const d11 = 3 * t2 - 2 * t;
      const o = q * LINE_STRIDE;
      const dv = [0, 0, 0];
      for (let x = 0; x < 3; x++) {
        out[o + x] = h00 * a[x] + h10 * L * ta[x] + h01 * b[x] + h11 * L * tb[x];
        dv[x] = d00 * a[x] + d10 * L * ta[x] + d01 * b[x] + d11 * L * tb[x];
      }
      const d = norm(dv);
      out[o + 3] = d[0];
      out[o + 4] = d[1];
      out[o + 5] = d[2];
      let r = h00 * r0 + h10 * L * g0 + h01 * r1 + h11 * L * g1;
      let g = (d00 * r0 + d10 * L * g0 + d01 * r1 + d11 * L * g1) / L;
      if (r < lo || r > hi) {
        r = Math.min(hi, Math.max(lo, r));
        g = 0;
      }
      const s = t * L;
      if (collar.C > 0) {
        const x = Math.exp(-Math.max(0, s - collar.from) / collar.fall);
        const f = 1 + (collar.C * (x - collar.gone)) / (1 - collar.gone);
        const df = s > collar.from ? (-collar.C * x) / collar.fall / (1 - collar.gone) : 0;
        g = g * f + r * df;
        r *= f;
      }
      out[o + 6] = r;
      out[o + 7] = g;
      out[o + 8] = sk.along[p] + s - back;
    });
    line[i] = out;
  }
  return { line, main, from };
}

/**
 * The child each node's wood runs on into: the thickest, as it is the one going straightest on (a leader a
 * little thinner than a limb leaving at an angle carries the stem on; the limb leaves it).
 */
function mainChildren(sk: GrownTree["skeleton"]): Int32Array {
  const n = sk.count;
  const main = new Int32Array(n).fill(-1);
  const score = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = sk.parent[i];
    if (p < 0) continue;
    const g = sk.parent[p];
    const into = g < 0 ? [0, 1, 0] : norm([sk.x[p] - sk.x[g], sk.y[p] - sk.y[g], sk.z[p] - sk.z[g]]);
    const out = norm([sk.x[i] - sk.x[p], sk.y[i] - sk.y[p], sk.z[i] - sk.z[p]]);
    score[i] = sk.radius[i] * (0.5 + 0.5 * dot(into, out));
    if (main[p] < 0 || score[i] > score[main[p]]) main[p] = i;
  }
  return main;
}

/**
 * How many sides a tier gives wood of radius `r` on a tree whose trunk's is `trunk`: a twig the least (most of
 * the wood is twigs, and a twig is a few pixels across even close to), wood thicker than that more, the more
 * of the trunk's radius it has, up to the most on the trunk itself.
 */
function sidesFor(shape: TierShape, r: number, trunk: number): number {
  const [most, least] = shape.sides;
  // (A tube: a twig drawn as a ribbon is not one.)
  if (r < TWIG) return Math.max(3, Math.min(least, shape.twig.sides));
  return Math.max(least, Math.min(most, Math.round(least + 1 + (most - least - 1) * Math.min(1, r / trunk) ** 0.75)));
}

/**
 * A stem's buttresses: lobes round its foot where its roots run off, each its own size and a little off even
 * spacing. Gives how much they widen the stem at an angle round it (1 none) and a height above its foot,
 * how fast that changes round it (per radian) and up it (per m).
 */
function buttresses(seed: number, hf: number, foot = 0): (angle: number, h: number) => [number, number, number] {
  // (A buttressed species' foot has more of them, and they stand out further: a cedar's fluted foot.)
  const count = 4 + Math.floor(hash01(seed, 17) * 3) + Math.round(3 * foot);
  const step = (Math.PI * 2) / count;
  const at: number[] = [];
  const size: number[] = [];
  for (let k = 0; k < count; k++) {
    at.push(step * (k + (hash01(seed + k, 18) - 0.5) * 0.7));
    size.push(0.35 + 0.65 * hash01(seed + k, 19));
  }
  const sigma = step * BUTTRESS_WIDTH;
  const rise = BUTTRESS_RISE * hf;
  return (angle, h) => {
    let lobe = 0;
    let dLobe = 0;
    for (let k = 0; k < count; k++) {
      let d = angle - at[k];
      d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
      const g = size[k] * Math.exp(-0.5 * (d / sigma) ** 2);
      lobe += g;
      dLobe += (-g * d) / (sigma * sigma);
    }
    const A = BUTTRESS * (1 + 0.6 * foot) * Math.exp(-Math.max(0, h) / rise);
    const dA = h > 0 ? -A / rise : 0;
    return [1 + A * (lobe - 0.12), A * dLobe, dA * (lobe - 0.12)];
  };
}

/**
 * How a stem's bark is laid over its root flare, from its centre lines (its first pieces, from its foot at
 * `y0`), the flare's height `hf` and its buttresses (`swell`, as `buttresses`): `along(a, angle)`, how far along
 * the wood a point is over its surface (not up its centre line: where the flare widens, and more on a
 * buttress, the surface runs out as well as up, and bark laid up the centre line was drawn out along it in
 * long smears); and `radius`, the stem's radius over its flare, which the bark is laid round there as round the
 * stem above (the shader's `aWood.w`, as a share of the radius), so its furrows run on down the flare and
 * spread out, as a real stem's do, and do not turn aside, crossing in chevrons where the bark's two sides
 * meet. Above twice the flare's height it is the centre line's own.
 */
export function flareBark(lines: readonly Float64Array[], y0: number, hf: number, swell?: (angle: number, h: number) => [number, number, number]): { along: (a: number, angle: number) => number; radius: number } {
  // (The centre line's samples up to twice the flare's height: how far along, how high, and the radius.)
  const as: number[] = [];
  const hs: number[] = [];
  const rs: number[] = [];
  let radius = 0;
  outer: for (const l of lines) {
    for (let o = 0; o < l.length; o += LINE_STRIDE) {
      if (as.length > 0 && l[o + 8] <= as[as.length - 1]) continue;
      const h = l[o + 1] - y0;
      as.push(l[o + 8]);
      hs.push(h);
      rs.push(l[o + 6]);
      if (h >= hf && radius === 0) radius = l[o + 6];
      if (h >= 2 * hf) break outer;
    }
  }
  if (radius === 0) radius = rs[rs.length - 1] ?? 0;
  const top = as[as.length - 1] ?? 0;
  /** The centre line's height and radius at `a` along it (on at the first piece's slope under its first sample). */
  const at = (a: number): [number, number] => {
    if (as.length < 2) return [a, rs[0] ?? 0];
    let k = 0;
    while (k + 1 < as.length - 1 && as[k + 1] <= a) k++;
    const f = (a - as[k]) / Math.max(1e-9, as[k + 1] - as[k]);
    return [hs[k] + (hs[k + 1] - hs[k]) * f, Math.max(0, rs[k] + (rs[k + 1] - rs[k]) * Math.max(0, f))];
  };
  /** The surface's distance out from the centre line at `a`, round at `angle`. */
  const out = (a: number, angle: number): number => {
    const [h, r] = at(a);
    return r * (swell ? swell(angle, h)[0] : 1);
  };
  const STEPS = 16;
  const along = (a: number, angle: number): number => {
    if (as.length < 2 || a >= top) return a;
    // (The surface's length from here up to the top of the flare, over its length up the centre line.)
    let extra = 0;
    let prev = out(a, angle);
    for (let k = 1; k <= STEPS; k++) {
      const da = (top - a) / STEPS;
      const next = out(a + da * k, angle);
      extra += Math.hypot(da, next - prev) - da;
      prev = next;
    }
    return a - extra;
  };
  return { along, radius };
}

/**
 * The wood of every variant at one distance, as tubes along the curves `woodLines` draws: one tube from each
 * stem's foot, and from where each limb leaves its parent, on through each node's thickest child, its rings
 * as many-sided as the wood is thick there (a ring with fewer sides than the one before it is stitched to
 * it), each tube's end closed in a rounded cap. Each vertex: `position` a point on the centre line;
 * `aRadial` which way the surface lies from it (as long as the surface swells there: buttresses), and the
 * radius there; `aNormal` which way the surface faces; `aLimb` the foot of the limb it is on (a stem's:
 * below its foot), and its variant; `aWood` how far along the wood from the ground (m, over the surface of
 * a stem's root flare: `flareBark`), its order, a number of its own (its tube's), and how much of its radius
 * the bark is laid round (under 1 on a root flare: `flareBark`); `aFrame` the ring's
 * own first direction out from the centre line (carried along the tube without twisting) and `aAxis` the
 * way the wood runs there, so a picture of bark can be wrapped round it (engine.ts).
 */
export function woodPieces(trees: readonly GrownTree[], shape: TierShape): Pieces {
  const b = new Builder({ position: 3, aRadial: 4, aNormal: 3, aLimb: 4, aWood: 4, aFrame: 3, aAxis: 3 });
  const [P, RADIAL, NORMAL, LIMB, WOOD, FRAME, AXIS] = ["position", "aRadial", "aNormal", "aLimb", "aWood", "aFrame", "aAxis"].map((k) => b.slot(k));
  trees.forEach((tree, v) => {
    b.begin();
    if (tree.palm) {
      // (A palm's stem, as palm.ts shaped it, all of it in the first band; its fronds' rachises are its leaves'
      // to draw: palmGeometry.ts.)
      palmStemInto(b, tree, shape, v);
      const all = b.index.splice(b.start.index);
      b.endBands([all, ...WOOD_BANDS.map(() => [])]);
      return;
    }
    const sk = tree.skeleton;
    const W = woodLines(tree, shape);
    // (Each band's triangles; a piece of tube goes in the band of the thicker of its two rings.)
    const bands: number[][] = [[], ...WOOD_BANDS.map(() => [])];
    const bandOf = (r: number) => WOOD_BANDS.reduce((k, e) => (r < e ? k + 1 : k), 0);
    const trunk = sk.radius[0] || tree.size.trunkRadius;
    const hf = flareHeight(tree.size, tree.buttress ?? 0);
    const ownOf = new Float64Array(sk.count).fill(0.5);
    const kidCount = new Uint16Array(sk.count);
    // (Children of a fair size: a stem dividing, not a stub or a twig leaving it.)
    for (let i = 0; i < sk.count; i++) if (sk.parent[i] >= 0 && sk.radius[i] >= 0.3 * sk.radius[sk.parent[i]]) kidCount[sk.parent[i]]++;
    const stitch = (a: number, na: number, c: number, nc: number, r: number) => {
      const into = bands[bandOf(r)];
      let i = 0;
      let j = 0;
      while (i < na || j < nc) {
        if (j >= nc || (i < na && (i + 1) / na <= (j + 1) / nc)) {
          into.push(a + (i % na), c + (j % nc), a + ((i + 1) % na));
          i++;
        } else {
          into.push(a + (i % na), c + (j % nc), c + ((j + 1) % nc));
          j++;
        }
      }
    };
    for (let j = 0; j < sk.count; j++) {
      const p = sk.parent[j];
      // A tube starts at a stem's foot, or where a limb leaves its parent.
      const chain: number[] = [];
      let at = p < 0 ? W.main[j] : W.line[j] && W.main[p] !== j ? j : -1;
      while (at >= 0 && W.line[at]) {
        chain.push(at);
        at = W.main[at];
      }
      if (chain.length === 0) continue;
      // (Each tube a shade of its own, from its parent's where it leaves it: no seam of colour at a fork.)
      const own = hash01(chain[0], v * 131 + 5);
      const ownFrom = p < 0 ? own : ownOf[p];
      const blend = p < 0 ? 1 : 4 * sk.radius[j] + 0.3;
      for (const i of chain) ownOf[i] = own;
      if (p < 0) ownOf[j] = own;
      const foot = p < 0 ? j : -1;
      const flared = foot >= 0 && shape.round && sk.radius[foot] > 0.06 && sk.radius[foot] > 1.02 * sk.radius[chain[0]];
      const lobe = flared ? buttresses(foot * 7 + v * 1013, hf, tree.buttress ?? 0) : null;
      let u: number[] = [];
      let last = -1;
      let lastSides = 0;
      let lastR = 0;
      let lastKey = "";
      let end = { c: [0, 1, 0], d: [0, 1, 0], r: 0, attrs: { limb: [0, 0, 0], order: 0, along: 0 } };
      const startAlong = W.line[chain[0]]![8];
      // (Over its root flare up to where the stem first divides, if lower: a forked trunk's or a clump's stems
      // narrow fast where they part, and that is not flare to lay bark over.)
      const parts = flared ? chain.findIndex((i) => (kidCount[i] ?? 0) > 1) : -1;
      const bark = flared ? flareBark((parts >= 0 ? chain.slice(0, parts + 1) : chain).map((i) => W.line[i]!), sk.y[foot], hf, lobe ?? undefined) : null;
      const ownAt = (along: number) => {
        const f = Math.min(1, Math.max(0, (along - startAlong) / blend));
        return ownFrom + (own - ownFrom) * f * f * (3 - 2 * f);
      };
      // (Where a limb leaves its parent, its surface is lit as its parent's is, easing to its own over its
      // first radius or so out of it: two tubes meet in a crease, and lit as two they show it as a seam; lit
      // as one, the eye reads the crotch of a fork, the swell of a collar.)
      const parentLines = p >= 0 && shape.round ? [W.line[p], W.line[W.main[p]]].filter((l): l is Float64Array => l !== null) : [];
      const leaving = (x: number[], rLimb: number): { n: number[]; w: number } | null => {
        let best = Infinity;
        let n: number[] = [];
        for (const l of parentLines) {
          for (let o = 0; o + LINE_STRIDE < l.length; o += LINE_STRIDE) {
            const a = [l[o], l[o + 1], l[o + 2]];
            const dd = [l[o + LINE_STRIDE] - a[0], l[o + LINE_STRIDE + 1] - a[1], l[o + LINE_STRIDE + 2] - a[2]];
            const l2 = dot(dd, dd);
            const f = l2 > 0 ? Math.min(1, Math.max(0, dot(sub(x, a), dd) / l2)) : 0;
            const off = sub(x, add(a, scale(dd, f)));
            const out = Math.hypot(off[0], off[1], off[2]) - (l[o + 6] + (l[o + LINE_STRIDE + 6] - l[o + 6]) * f);
            if (out < best) {
              best = out;
              n = norm(off);
            }
          }
        }
        if (n.length === 0) return null;
        const t = Math.min(1, Math.max(0, best / (1.5 * rLimb)));
        return { n, w: 1 - t * t * (3 - 2 * t) };
      };
      const ring = (c: number[], d: number[], r: number, g: number, limb: number[], order: number, along: number, blend = false): number => {
        u = u.length ? norm(sub(u, scale(d, dot(u, d)))) : basis(d)[0];
        if (!Number.isFinite(u[0]) || Math.hypot(u[0], u[1], u[2]) < 0.5) u = basis(d)[0];
        const w = cross(d, u);
        const h = foot >= 0 ? c[1] - sk.y[foot] : 0;
        const swells = lobe !== null && h < 2.5 * hf;
        // (Its bark laid over the root flare as over the stem above it: see `flareBark`.)
        const barkShare = bark ? Math.min(1, bark.radius / Math.max(r, 1e-4)) : 1;
        const sides = sidesFor(shape, r, trunk) + (swells ? BUTTRESS_SIDES : 0);
        let first = -1;
        // (Its numbers laid one by one (`Builder.put`), each worked out as before, without arrays a vertex.)
        const own = ownAt(along);
        for (let s = 0; s < sides; s++) {
          const a = (s / sides) * Math.PI * 2;
          const cs = Math.cos(a);
          const sn = Math.sin(a);
          const e0 = u[0] * cs + w[0] * sn;
          const e1 = u[1] * cs + w[1] * sn;
          const e2 = u[2] * cs + w[2] * sn;
          const r0 = -u[0] * sn + w[0] * cs;
          const r1 = -u[1] * sn + w[1] * cs;
          const r2 = -u[2] * sn + w[2] * cs;
          let m = 1;
          let mA = 0;
          let mH = 0;
          if (swells) [m, mA, mH] = lobe(a, h);
          // (The surface's normal: out, tipped back where it swells along the wood and round where it swells round it.)
          const slopeAlong = g * m + r * mH * d[1];
          const q0 = e0 - r0 * (mA / m) - d[0] * slopeAlong;
          const q1 = e1 - r1 * (mA / m) - d[1] * slopeAlong;
          const q2 = e2 - r2 * (mA / m) - d[2] * slopeAlong;
          const ql = Math.hypot(q0, q1, q2) || 1;
          let n0 = q0 / ql;
          let n1 = q1 / ql;
          let n2 = q2 / ql;
          if (blend) {
            const at = leaving([c[0] + e0 * r, c[1] + e1 * r, c[2] + e2 * r], r);
            if (at && at.w > 0) [n0, n1, n2] = norm(add(scale([n0, n1, n2], 1 - at.w), scale(at.n, at.w)));
          }
          const barkAlong = bark ? bark.along(along, a) : along;
          b.putAt(P, c[0], c[1], c[2]);
          b.putAt(RADIAL, e0 * m, e1 * m, e2 * m, r);
          b.putAt(NORMAL, n0, n1, n2);
          b.putAt(LIMB, limb[0], limb[1], limb[2], v);
          b.putAt(WOOD, barkAlong, order, own, barkShare);
          b.putAt(FRAME, u[0], u[1], u[2]);
          b.putAt(AXIS, d[0], d[1], d[2]);
          const k = b.next();
          if (first < 0) first = k;
        }
        if (last >= 0) stitch(last, lastSides, first, sides, Math.max(lastR, r));
        last = first;
        lastSides = sides;
        lastR = r;
        end = { c, d, r, attrs: { limb, order, along } };
        return first;
      };
      // A tube's end closed: a rounded cap (a ring part way round and its tip), or on thin wood its tip alone.
      const capTube = () => {
        const { c, d, r, attrs } = end;
        const w = cross(d, u);
        let rim = last;
        let rimSides = lastSides;
        if (lastSides >= CAP_RING_SIDES) {
          const cs = Math.cos(CAP_RING);
          const sn = Math.sin(CAP_RING);
          let first = -1;
          for (let s = 0; s < lastSides; s++) {
            const a = (s / lastSides) * Math.PI * 2;
            const e = [u[0] * Math.cos(a) + w[0] * Math.sin(a), u[1] * Math.cos(a) + w[1] * Math.sin(a), u[2] * Math.cos(a) + w[2] * Math.sin(a)];
            const dir = [e[0] * cs + d[0] * sn, e[1] * cs + d[1] * sn, e[2] * cs + d[2] * sn];
            const k = b.vertex({ position: c, aRadial: [...dir, r], aNormal: dir, aLimb: [...attrs.limb, v], aWood: [attrs.along, attrs.order, ownAt(attrs.along), 1], aFrame: u, aAxis: d });
            if (first < 0) first = k;
          }
          stitch(rim, rimSides, first, lastSides, r);
          rim = first;
        }
        const tip = b.vertex({ position: c, aRadial: [...d, r], aNormal: d, aLimb: [...attrs.limb, v], aWood: [attrs.along, attrs.order, ownAt(attrs.along), 1], aFrame: u, aAxis: d });
        for (let s = 0; s < rimSides; s++) bands[bandOf(r)].push(rim + s, tip, rim + ((s + 1) % rimSides));
      };
      // (A twig, near: a ribbon of two vertices a ring, turned to the eye in the shader (engine.ts), its own
      // side of the centre line in `aRadial.x`, as wide as the four-sided tube it was (`RIBBON_WIDE`); no normal
      // (`aNormal` 0: the shader rounds it, facing the eye in the middle and out to its sides at its edges).
      // Its side is the wood's way crossed with the way to the eye, so its triangles, wound from its -1 side
      // to its +1 and on along the wood, always face the eye.)
      let inRibbon = false;
      const ribbonRing = (c: number[], d: number[], r: number, limb: number[], order: number, along: number) => {
        u = u.length ? norm(sub(u, scale(d, dot(u, d)))) : basis(d)[0];
        if (!Number.isFinite(u[0]) || Math.hypot(u[0], u[1], u[2]) < 0.5) u = basis(d)[0];
        const own = ownAt(along);
        let k = -1;
        for (const side of [-RIBBON_WIDE, RIBBON_WIDE]) {
          b.putAt(P, c[0], c[1], c[2]);
          b.putAt(RADIAL, side, 0, 0, r);
          b.putAt(NORMAL, 0, 0, 0);
          b.putAt(LIMB, limb[0], limb[1], limb[2], v);
          b.putAt(WOOD, along, order, own, 1);
          b.putAt(FRAME, u[0], u[1], u[2]);
          b.putAt(AXIS, d[0], d[1], d[2]);
          const at = b.next();
          if (k < 0) k = at;
        }
        if (last >= 0) bands[bandOf(Math.max(lastR, r))].push(last, last + 1, k, last + 1, k + 1, k);
        last = k;
        lastSides = 2;
        lastR = r;
        end = { c, d, r, attrs: { limb, order, along } };
      };
      // (Its end: a point a radius on.)
      const ribbonTip = () => {
        const { c, d, r, attrs } = end;
        if (last < 0) return;
        const tip = b.vertex({ position: [c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r], aRadial: [0, 0, 0, r], aNormal: [0, 0, 0], aLimb: [...attrs.limb, v], aWood: [attrs.along + r, attrs.order, ownAt(attrs.along), 1], aFrame: u, aAxis: d });
        bands[bandOf(r)].push(last, last + 1, tip);
      };
      // (A ring of the tube, or of its ribbon once it is a twig: a tube closed where its ribbon starts, and a
      // ribbon a ribbon to its end.)
      const put = (c: number[], d: number[], r: number, g: number, limb: number[], order: number, along: number, blend = false) => {
        if (shape.twig.sides === 2 && (inRibbon || r < TWIG)) {
          if (!inRibbon) {
            inRibbon = true;
            if (last >= 0) {
              // (Closed with its tip, and its ribbon starting at its last ring, as thick as the ribbon is here,
              // in the tip: the piece between that ring and this one is the ribbon's.)
              capTube();
              last = -1;
              ribbonRing(end.c, end.d, r, end.attrs.limb, end.attrs.order, end.attrs.along);
            }
          }
          ribbonRing(c, d, r, limb, order, along);
        } else ring(c, d, r, g, limb, order, along, blend);
      };
      for (let q = 0; q < chain.length; q++) {
        const i = chain[q];
        const line = W.line[i]!;
        const limbNode = sk.order[i] === 0 ? -1 : sk.limb[i];
        const limb = limbNode < 0 ? [0, -1, 0] : [sk.x[limbNode], sk.y[limbNode], sk.z[limbNode]];
        const key = `${limbNode},${sk.order[i]}`;
        const samples = line.length / LINE_STRIDE;
        for (let s = 0; s < samples; s++) {
          const o = s * LINE_STRIDE;
          const c = [line[o], line[o + 1], line[o + 2]];
          const d = [line[o + 3], line[o + 4], line[o + 5]];
          if (s === 0) {
            // (Where one piece runs on into the next, they share a ring; where a tube runs on into wood of
            // another limb or order, which the wind moves its own way, a ring of its own starts it again.)
            if (q > 0 && key === lastKey) continue;
            if (q > 0) last = -1;
            if (q === 0 && foot >= 0) {
              // (A stem's foot goes on a little into the ground, so it stands in it on a slope.)
              const deep = UNDERGROUND + UNDERGROUND_RADII * line[o + 6];
              put([c[0] - d[0] * deep, c[1] - d[1] * deep, c[2] - d[2] * deep], d, line[o + 6] * 1.15, 0, limb, sk.order[i], line[o + 8] - deep);
            }
          }
          put(c, d, line[o + 6], line[o + 7], limb, sk.order[i], line[o + 8], q === 0 && parentLines.length > 0);
        }
        lastKey = key;
      }
      if (inRibbon) ribbonTip();
      else capTube();
    }
    b.endBands(bands);
  });
  return b.done();
}

function add(a: number[], b: number[]): number[] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(a: number[], k: number): number[] {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: number[], b: number[]): number[] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
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

/** How far from a clump's centre (in its radii) a twig's end may be and still be one of the clump's twigs: a little past the grower's 0.8, which the fitting and the outline move. */
export const IN_CLUMP = 1.2;
/** How far back along the wood from a clump's twig end its cards' feet may be, in the clump's radii. */
const SHOOT = 1.1;
/** Where a spray's twig enters its card, from the card's centre, in its half-lengths (the sprays in leaves.ts start 0.7 to 0.97 below). */
export const SPRAY_FOOT = 0.8;
/** An upright cushion card's size about its kind's, from 1 - this / 2 to 1 + this / 2; and how far up or down its twig it stands, in its clump's radii. */
const CUSHION_VARY = 0.7;
const CUSHION_RISE = 1;

/**
 * Each clump's twigs: the node it hangs on, then the ends of the other twigs inside it. A clump is a spray of
 * leaves over the twigs where it hangs, and the grower keeps the twigs inside one for that (grow.ts
 * `leafy`); a twig's end that no clump hangs on goes to the clump it is deepest in, if it is in one.
 */
/** Each grown tree's clumps' twigs (`clumpTwigs`), worked out once: its dabs, near cards and mid cards each ask. */
const TWIGS = new WeakMap<GrownTree, number[][]>();

export function clumpTwigs(tree: GrownTree): number[][] {
  let twigs = TWIGS.get(tree);
  if (!twigs) TWIGS.set(tree, (twigs = twigsOf(tree)));
  return twigs;
}

function twigsOf(tree: GrownTree): number[][] {
  const { clumps: cl, skeleton: sk } = tree;
  const out: number[][] = [];
  const hung = new Uint8Array(sk.count);
  for (let c = 0; c < cl.count; c++) {
    out.push([cl.node[c]]);
    hung[cl.node[c]] = 1;
  }
  const kids = new Uint8Array(sk.count);
  for (let i = 0; i < sk.count; i++) if (sk.parent[i] >= 0) kids[sk.parent[i]] = 1;
  for (let i = 0; i < sk.count; i++) {
    if (kids[i] || hung[i] || sk.parent[i] < 0) continue;
    let best = -1;
    let bestF = IN_CLUMP;
    for (let c = 0; c < cl.count; c++) {
      const f = Math.hypot(sk.x[i] - cl.x[c], sk.y[i] - cl.y[c], sk.z[i] - cl.z[c]) / cl.radius[c];
      if (f < bestF) {
        bestF = f;
        best = c;
      }
    }
    if (best >= 0) out[best].push(i);
  }
  return out;
}

/**
 * The wood leading to a node, back from it along its parents for up to `most` metres (not down onto a stem,
 * unless the node is on one), along its centre line as drawn close to (`lines`): `at(s)` is the point `s`
 * metres back from the node, and which way the wood runs there (out, towards the node).
 */
function shootOf(sk: GrownTree["skeleton"], lines: WoodLines, node: number, most: number): { length: number; at(s: number): { p: number[]; d: number[] } } {
  const pts: number[][] = [[sk.x[node], sk.y[node], sk.z[node]]];
  const dirs: number[][] = [];
  const lens: number[] = [];
  let length = 0;
  const back = (q: number[]) => {
    const a = pts[pts.length - 1];
    const seg = [a[0] - q[0], a[1] - q[1], a[2] - q[2]];
    const l = Math.hypot(seg[0], seg[1], seg[2]);
    if (l <= 1e-6) return;
    pts.push(q);
    dirs.push(seg.map((x) => x / l));
    lens.push(l);
    length += l;
  };
  // (Down each line from where the wood came onto it: a node's own line from its end, its parent's from
  // where the node's line left it.)
  let at = -1;
  for (let i = node; length < most; ) {
    const p = sk.parent[i];
    if (p < 0 || (sk.order[i] === 0 && sk.order[node] > 0)) break;
    const line = lines.line[i];
    const top = at >= 0 ? at * LINE_STRIDE : line ? line.length - 2 * LINE_STRIDE : 0;
    if (line) for (let o = top; o >= 0 && length < most; o -= LINE_STRIDE) back([line[o], line[o + 1], line[o + 2]]);
    else back([sk.x[p], sk.y[p], sk.z[p]]);
    at = lines.from[i];
    i = p;
  }
  length = Math.min(length, most);
  return {
    length,
    at(s: number) {
      if (dirs.length === 0) return { p: pts[0], d: [0, 1, 0] };
      let left = Math.min(Math.max(0, s), length);
      for (let j = 0; j < lens.length; j++) {
        if (left <= lens[j] || j === lens.length - 1) {
          const f = Math.min(1, left / lens[j]);
          const a = pts[j];
          const b = pts[j + 1];
          return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], d: dirs[j] };
        }
        left -= lens[j];
      }
      return { p: pts[0], d: dirs[0] };
    },
  };
}

/** How a conifer's sheet is shaped: rows along it, columns across it (a sheet is (ROWS-1) (COLS-1) quads). */
export const SHEET_ALONG = 4;
export const SHEET_ACROSS = 3;
/** The most sheets a clump of its own is laid with: one along its own twig, and one along another of its twigs that reaches out of the first. */
export const SHEETS_PER_CLUMP = 2;
/** A clump's own sheet: its length, and its half width, in the clump's radii; how far back along the wood its foot is. */
const SHEET_LENGTH = 3.6;
const SHEET_HALF = 1.4;
/** A spire's sheets round its leader: how many to a clump, and how long and wide, in its clump's radii. */
const SPIRE_SHEETS = 3;
const SPIRE_SHEET_LENGTH = 2.2;
const SPIRE_SHEET_HALF = 0.95;
const SHEET_BACK = 0.75;
/**
 * How far a sheet's edges fall away for a species whose side shoots hang in curtains (`habit.sprayHang` 1),
 * over its own arch, in its half widths: a Norway spruce's low boughs hang their combs of shoots, so from the
 * side a bough is a fringe the depth of the gap to the next, and the crown is closed. The highest boughs hang
 * this share of it.
 */
const CURTAIN = 1.4;
/** The most a sheet's edges fall for curtains, over its own arch (half widths): its top still faces up. */
const CURTAIN_MOST = 0.6;
const CURTAIN_TOP = 0.35;

/** How much a sheet's edges fall, over its own arch, for a tree's habit, its foot at height `y`. */
function curtainOf(tree: GrownTree, y: number): number {
  const hang = tree.habit?.sprayHang ?? 0;
  if (hang <= 0) return 0;
  const { crownBase, height } = tree.size;
  const up = Math.min(1, Math.max(0, (y - crownBase) / Math.max(0.01, height - crownBase)));
  return Math.min(CURTAIN_MOST, CURTAIN * hang * (CURTAIN_TOP + (1 - CURTAIN_TOP) * (1 - up)));
}

/** A bough's sheets: each this many of its clumps' radii long, the next starting this share of it on. */
const BOUGH_PIECE = 3.2;
const BOUGH_STEP = 0.62;

/**
 * A conifer's near foliage as sheets: curved strips lying along its boughs, a comb of needles (Koerye's
 * foliage-mass study found these read as tiered boughs from every side, where loose leaves gave spiky balls
 * and closed blocks cushions). Each bough is laid with a run of them along its own wood, from its first
 * clump to its tip, overlapping, each as wide as its clumps reach either side of it; a clump off its bough's
 * line, or on the leader, a sheet or two of its own along its twig. Each sheet's foot is on the wood. It is lifted there and droops to its tip, its edges falling
 * away either side of its middle, a little twisted, so seen from the side it is a bough hanging its fringe
 * and from below a bough's shade.
 *
 * `kinds[v]` says what kind of sheet each variant's clumps are laid with (an index into marks.ts
 * `SHEET_KINDS`: 0 fir, 1 cedar), or -1 for none (its clumps are dabs). Each vertex: `position` where
 * it is (its variant's frame); `aDab` where it is on the sheet's picture (x across, y along its length, each
 * -1..1), half the sheet's length (m), and a number of the sheet's own; `aNormal` its clump's outward normal
 * and depth; `aOffset` the sheet's own normal there (its top's side) and its kind; `aLimb` the foot of its
 * limb and its variant; `aSpine` from it to the sheet's middle line, across.
 */
export function sheetPieces(trees: readonly GrownTree[], kinds: readonly number[], coarse = false): Pieces {
  const b = new Builder({ position: 3, aDab: 4, aNormal: 4, aOffset: 4, aLimb: 4, aSpine: 3 });
  trees.forEach((tree, v) => {
    b.begin();
    const kind = kinds[v] ?? -1;
    if (kind >= 0) {
      const { clumps: cl, skeleton: sk } = tree;
      const lines = woodLines(tree, TIER_SHAPES[0]);
      const covered = new Uint8Array(cl.count);
      boughSheets(b, tree, lines, kind, v, covered, coarse);
      const twigs = clumpTwigs(tree);
      const spire: number[] = [];
      for (let c = 0; c < cl.count; c++) {
        if (covered[c]) continue;
        const r = cl.radius[c];
        const n = [cl.nx[c], cl.ny[c], cl.nz[c]];
        // (Along its own twig first, then along the twig of it that reaches farthest from that sheet's line.)
        const laid: { foot: number[]; dir: number[]; length: number }[] = [];
        // (Mid, only the leader's: a bough's own sheets, wider there, cover its side shoots' clumps well enough
        // from where a mid tree is seen.)
        if (coarse && sk.order[cl.node[c]] > 0) continue;
        if (sk.order[cl.node[c]] === 0 && coarse) {
          // (Mid, the spire is one: below.)
          spire.push(c);
          continue;
        }
        if (sk.order[cl.node[c]] === 0) {
          // (On the leader, its spire: short sheets round it, splayed out and up as a fir's top shoots are,
          // each turned from the last, so the leader is clothed in needles all round and ends in a point.)
          const node = cl.node[c];
          const foot = [sk.x[node], sk.y[node] - r * 0.35, sk.z[node]];
          const around = coarse ? 2 : SPIRE_SHEETS;
          const turn0 = c * 2.39996;
          for (let s = 0; s < around; s++) {
            const a = turn0 + (s * 2 * Math.PI) / around;
            const out = [Math.cos(a), 0, Math.sin(a)];
            const k = c * 53 + s;
            const dir = norm([out[0] * 0.85, 1, out[2] * 0.85]);
            const length = r * SPIRE_SHEET_LENGTH * (0.9 + 0.2 * hash01(k, 12));
            sheet(b, foot, dir, length, r * SPIRE_SHEET_HALF, { lift: 0.04, droop: 0.12 + 0.08 * hash01(k, 14), arch: 0.5 + 0.3 * hash01(k, 15), twist: (hash01(k, 16) - 0.5) * 0.4 }, hash01(k, v * 389 + 11), n, cl.depth[c], kind, limbOf(sk, node), v, coarse ? 2 : SHEET_ALONG);
          }
          continue;
        }
        const most = cl.depth[c] > 0.65 || coarse ? 1 : SHEETS_PER_CLUMP;
        const order = [...twigs[c]].sort((p, q) => (p === cl.node[c] ? -1 : q === cl.node[c] ? 1 : 0));
        for (const t of order) {
          if (laid.length >= most) break;
          const tip = [sk.x[t], sk.y[t], sk.z[t]];
          if (laid.some((s) => offLine(tip, s.foot, s.dir, s.length) < r * 0.7)) continue;
          const k = c * 53 + laid.length;
          const shoot = shootOf(sk, lines, t, r * SHEET_BACK * 1.5);
          const foot = shoot.at(Math.min(shoot.length, r * SHEET_BACK)).p;
          // (Along its limb more than along its own twig, out from the trunk, and nearer level than either:
          // sprays lie flat and turn up only a little.)
          const d0 = shoot.at(0).d;
          const l = sk.limb[t];
          const limb = sk.order[t] === 0 ? d0 : norm([tip[0] - sk.x[l], tip[1] - sk.y[l], tip[2] - sk.z[l]]);
          const out = norm([tip[0], 0, tip[2]]);
          const run = add(add(scale(limb, 0.6), scale(d0, 0.4)), scale(out, 0.2));
          // (On the leader, upright: a conifer's top is a spire, not a flag.)
          const dir = sk.order[t] === 0 ? norm([d0[0] * 0.3, 1, d0[2] * 0.3]) : norm([run[0], run[1] * 0.45 + 0.03, run[2]]);
          const length = r * SHEET_LENGTH * (0.85 + 0.3 * hash01(k, 12)) * (coarse ? 1.2 : 1);
          const half = r * SHEET_HALF * (0.85 + 0.3 * hash01(k, 13)) * (coarse ? 1.15 : 1) * (sk.order[t] === 0 ? 0.3 : 1);
          laid.push({ foot, dir, length });
          const a = hash01(k, 14);
          sheet(b, foot, dir, length, half, { lift: 0.1 + 0.08 * a, droop: 0.26 + 0.22 * a, arch: 0.55 + 0.35 * hash01(k, 15) + curtainOf(tree, foot[1]), twist: (hash01(k, 16) - 0.5) * 0.7 }, hash01(k, v * 389 + 11), n, cl.depth[c], kind, limbOf(sk, t), v, coarse ? 2 : SHEET_ALONG);
        }
      }
      // (Any twig's end the sheets leave out, a sheet of its own along that twig, over its end: a twig poking out
      // of a conifer's needles bare is a dead stick, which it is not.)
      coverEnds(b, tree, lines, kind, v, coarse);
      if (spire.length > 0) {
        // (Mid, a spire is two sheets crossed, from its lowest needles to its tip, widest at its foot: a
        // narrow point and not a string of beads, which a few small sheets each its own read as.)
        let lo = Infinity;
        let hi = -Infinity;
        let wide = 0;
        let lowest = spire[0];
        for (const c of spire) {
          const r = cl.radius[c];
          if (cl.y[c] - r * 0.6 < lo) {
            lo = cl.y[c] - r * 0.6;
            lowest = c;
          }
          hi = Math.max(hi, cl.y[c] + r * 0.9);
          wide = Math.max(wide, r);
        }
        const node = cl.node[lowest];
        const foot = [sk.x[node], lo, sk.z[node]];
        const n = [cl.nx[lowest], cl.ny[lowest], cl.nz[lowest]];
        for (let s = 0; s < 2; s++) {
          const a = lowest * 2.39996 + s * Math.PI * 0.5;
          const dir = norm([Math.cos(a) * 0.04, 1, Math.sin(a) * 0.04]);
          sheet(b, foot, dir, hi - lo, wide * 1.15, { lift: 0, droop: 0.02, arch: 0.25, twist: 0, point: true }, hash01(lowest * 53 + s, v * 389 + 11), n, cl.depth[lowest], kind, limbOf(sk, node), v, 2);
        }
      }
    }
    b.end();
  });
  return b.done();
}

/**
 * A fir's boughs: each limb's clumps that lie along its own wood, laid as a run of overlapping sheets on that
 * wood from its first clump to past its last, each as wide as those clumps reach either side of it. The
 * clumps it covers are marked in `covered`; one off its line is left to a sheet of its own.
 */
function boughSheets(b: Builder, tree: GrownTree, lines: WoodLines, kind: number, v: number, covered: Uint8Array, coarse: boolean): void {
  const { clumps: cl, skeleton: sk } = tree;
  const byLimb = new Map<number, number[]>();
  for (let c = 0; c < cl.count; c++) {
    const node = cl.node[c];
    if (sk.order[node] === 0) continue;
    const l = sk.limb[node];
    if (!byLimb.has(l)) byLimb.set(l, []);
    byLimb.get(l)!.push(c);
  }
  let piece = 0;
  for (const [l, list] of byLimb) {
    // (The bough's wood as drawn: its centre line from where it leaves the trunk, on through its thickest child.)
    const pts: number[][] = [];
    for (let i = l; i >= 0 && lines.line[i]; i = lines.main[i]) {
      const line = lines.line[i]!;
      for (let o = 0; o < line.length; o += LINE_STRIDE) {
        const p = [line[o], line[o + 1], line[o + 2]];
        const last = pts[pts.length - 1];
        if (!last || Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) > 1e-4) pts.push(p);
      }
    }
    if (pts.length < 2) continue;
    const along = [0];
    for (let q = 1; q < pts.length; q++) along.push(along[q - 1] + Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1], pts[q][2] - pts[q - 1][2]));
    const total = along[along.length - 1];
    const at = (s: number): number[] => {
      const t = Math.min(total, Math.max(0, s));
      let q = 1;
      while (q < pts.length - 1 && along[q] < t) q++;
      const f = (t - along[q - 1]) / Math.max(1e-9, along[q] - along[q - 1]);
      return [pts[q - 1][0] + (pts[q][0] - pts[q - 1][0]) * f, pts[q - 1][1] + (pts[q][1] - pts[q - 1][1]) * f, pts[q - 1][2] + (pts[q][2] - pts[q - 1][2]) * f];
    };
    // (Where each clump lies along the bough, and how far off it.)
    const on: { c: number; s: number; off: number }[] = [];
    for (const c of list) {
      const p = [cl.x[c], cl.y[c], cl.z[c]];
      let best = { s: 0, off: Infinity };
      for (let q = 1; q < pts.length; q++) {
        const a = pts[q - 1];
        const d = sub(pts[q], a);
        const l2 = dot(d, d);
        const f = l2 > 0 ? Math.min(1, Math.max(0, dot(sub(p, a), d) / l2)) : 0;
        const off = Math.hypot(p[0] - a[0] - d[0] * f, p[1] - a[1] - d[1] * f, p[2] - a[2] - d[2] * f);
        if (off < best.off) best = { s: along[q - 1] + f * (along[q] - along[q - 1]), off };
      }
      on.push({ c, ...best });
    }
    const rMean = on.reduce((sum, o) => sum + cl.radius[o.c], 0) / on.length;
    // (A clump far off the bough's line is a side shoot of its own: its own sheet.)
    const near = on.filter((o) => o.off < cl.radius[o.c] * 2.2 + rMean * (coarse ? 1.5 : 0.5));
    if (near.length === 0) continue;
    // (From its first clump, or from a third of the way out if that is nearer the trunk: a bough is leafy
    // along most of its length, and the grower's clumps keep to its outer part.)
    const s0 = Math.max(0, Math.min(total * 0.3, ...near.map((o) => o.s - cl.radius[o.c] * 1.2)));
    const s1 = Math.min(total + rMean, Math.max(...near.map((o) => o.s + cl.radius[o.c] * 1.4)));
    // (Mid, longer pieces, fewer of them: a bough or two to a sheet.)
    const length = rMean * BOUGH_PIECE * (coarse ? 2.8 : 1);
    const count = Math.max(1, Math.ceil((s1 - s0 - length) / (length * BOUGH_STEP)) + 1);
    const step = count > 1 ? (s1 - s0 - length) / (count - 1) : 0;
    for (const o of near) covered[o.c] = 1;
    for (let k = 0; k < count; k++) {
      const sa = s0 + step * k;
      const sb = sa + length;
      const foot = at(sa);
      // (Its clumps: those it lies over, for how wide it is, which way they face, how deep they are.)
      const mine = near.filter((o) => o.s > sa - cl.radius[o.c] && o.s < sb + cl.radius[o.c]);
      const use = mine.length ? mine : near;
      const half = Math.max(rMean * 1.3, Math.max(...use.map((o) => o.off + cl.radius[o.c])) * 1.15) * (coarse ? 1.15 : 1);
      const nn = norm(use.reduce((m, o) => [m[0] + cl.nx[o.c], m[1] + cl.ny[o.c], m[2] + cl.nz[o.c]], [0, 0, 0]));
      const depth = use.reduce((m, o) => m + cl.depth[o.c], 0) / use.length;
      // (Along the bough's chord over its length, nearer level: past the bough's tip, on as it ran.)
      const end = sb <= total ? at(sb) : add(at(total), scale(norm(sub(at(total), at(Math.max(0, total - length * 0.5)))), sb - total));
      const chord = norm(sub(end, foot));
      const dir = norm([chord[0], chord[1] * 0.5 + 0.02, chord[2]]);
      // (The last of a bough's sheets hangs most, as its tip does; those along it lie as the wood does.)
      const tipward = sb >= s1 - 1e-6 ? 1 : 0.35;
      const h = piece * 31 + v * 7;
      sheet(b, foot, dir, length * (0.95 + 0.1 * hash01(h, 21)), half, { lift: 0.06, droop: (0.12 + 0.12 * hash01(h, 22)) * (0.5 + tipward) * (coarse ? 0.7 : 1), arch: 0.55 + 0.3 * hash01(h, 23) + curtainOf(tree, foot[1]), twist: (hash01(h, 24) - 0.5) * 0.4 }, hash01(h, v * 389 + 11), nn, depth, kind, [sk.x[l], sk.y[l], sk.z[l]], v, coarse ? 2 : SHEET_ALONG);
      piece++;
    }
  }
}

/** How far past a sheet a twig's end may be (in its clump's radii, near and mid) before it is given a sheet of its own. */
const END_UNDER = [0.18, 0.4];

/**
 * Each twig's end in the crown that the variant's sheets so far (those since `b.begin()`) leave more than
 * `END_UNDER` of a clump's radius from them: a short sheet along its twig, over its end.
 */
function coverEnds(b: Builder, tree: GrownTree, lines: WoodLines, kind: number, v: number, coarse: boolean): void {
  const { clumps: cl, skeleton: sk } = tree;
  if (cl.count === 0) return;
  const pos = b.floats.position;
  // (This variant's triangles, as corner positions.)
  const start = b.start;
  const tris: number[] = [];
  for (let t = start.index; t < b.index.length; t += 3) {
    for (let c = 0; c < 3; c++) {
      const vtx = (b.index[t + c] + start.vertex) * 3;
      tris.push(pos[vtx], pos[vtx + 1], pos[vtx + 2]);
    }
  }
  const has = new Uint8Array(sk.count);
  for (let i = 0; i < sk.count; i++) if (sk.parent[i] >= 0) has[sk.parent[i]] = 1;
  // (Each end's clump: the nearest whose ball it is in, for the size of what covers it.)
  let rMean = 0;
  for (let c = 0; c < cl.count; c++) rMean += cl.radius[c] / cl.count;
  const reach = END_UNDER[coarse ? 1 : 0];
  const off = (p: number[], most: number): number => {
    let best = most;
    for (let t = 0; t < tris.length; t += 9) {
      const lo = Math.max(Math.min(tris[t], tris[t + 3], tris[t + 6]) - p[0], p[0] - Math.max(tris[t], tris[t + 3], tris[t + 6]), Math.min(tris[t + 1], tris[t + 4], tris[t + 7]) - p[1], p[1] - Math.max(tris[t + 1], tris[t + 4], tris[t + 7]), Math.min(tris[t + 2], tris[t + 5], tris[t + 8]) - p[2], p[2] - Math.max(tris[t + 2], tris[t + 5], tris[t + 8]));
      if (lo >= best) continue;
      best = Math.min(best, triangleDistance(p, tris, t));
    }
    return best;
  };
  for (let i = 0; i < sk.count; i++) {
    if (has[i] || sk.parent[i] < 0 || sk.order[i] === 0 || sk.y[i] < tree.size.crownBase) continue;
    const tip = [sk.x[i], sk.y[i], sk.z[i]];
    let r = rMean;
    let nearest = Infinity;
    for (let c = 0; c < cl.count; c++) {
      const d = Math.hypot(cl.x[c] - tip[0], cl.y[c] - tip[1], cl.z[c] - tip[2]);
      if (d < nearest) {
        nearest = d;
        r = cl.radius[c];
      }
    }
    r = Math.min(r, rMean);
    if (off(tip, reach * r + 1e-6) <= reach * r) continue;
    const shoot = shootOf(sk, lines, i, r * 1.2);
    const foot = shoot.at(Math.min(shoot.length, r * 0.9)).p;
    const along = norm(sub(tip, foot));
    const dir = along;
    const k = i * 37 + 5;
    const length = Math.max(r * 1.7, Math.hypot(...sub(tip, foot)) * 1.6);
    sheet(b, foot, dir, length, r * (coarse ? 0.9 : 0.75), { lift: 0, droop: 0.02 + 0.04 * hash01(k, 22), arch: 0.35, twist: (hash01(k, 24) - 0.5) * 0.4 }, hash01(k, v * 389 + 11), norm([tip[0], 0.4, tip[2]]), 0.3, kind, limbOf(sk, i), v, coarse ? 2 : SHEET_ALONG);
    // (Its triangles count for the ends after it.)
    const vtx = b.vertices - (coarse ? 2 : SHEET_ALONG) * SHEET_ACROSS;
    const rows = coarse ? 2 : SHEET_ALONG;
    for (let j = 0; j + 1 < rows; j++)
      for (let q = 0; q + 1 < SHEET_ACROSS; q++) {
        const a = (vtx + j * SHEET_ACROSS + q) * 3;
        const c2 = (vtx + (j + 1) * SHEET_ACROSS + q) * 3;
        for (const [x, y, z] of [
          [a, a + 3, c2],
          [a + 3, c2 + 3, c2],
        ])
          tris.push(pos[x], pos[x + 1], pos[x + 2], pos[y], pos[y + 1], pos[y + 2], pos[z], pos[z + 1], pos[z + 2]);
      }
  }
}

/** How far a point is from the triangle at `t` in a flat list of corners. */
function triangleDistance(p: number[], tris: number[], t: number): number {
  const a = [tris[t], tris[t + 1], tris[t + 2]];
  const ab = [tris[t + 3] - a[0], tris[t + 4] - a[1], tris[t + 5] - a[2]];
  const ac = [tris[t + 6] - a[0], tris[t + 7] - a[1], tris[t + 8] - a[2]];
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  const d00 = dot(ab, ab);
  const d01 = dot(ab, ac);
  const d11 = dot(ac, ac);
  const den = d00 * d11 - d01 * d01;
  if (den > 1e-12) {
    const s = (d11 * d1 - d01 * d2) / den;
    const w = (d00 * d2 - d01 * d1) / den;
    if (s >= 0 && w >= 0 && s + w <= 1) return Math.hypot(ap[0] - ab[0] * s - ac[0] * w, ap[1] - ab[1] * s - ac[1] * w, ap[2] - ab[2] * s - ac[2] * w);
  }
  const seg = (u: number[], d: number[]) => {
    const f = Math.min(1, Math.max(0, dot(sub(p, u), d) / Math.max(1e-12, dot(d, d))));
    return Math.hypot(p[0] - u[0] - d[0] * f, p[1] - u[1] - d[1] * f, p[2] - u[2] - d[2] * f);
  };
  const b = [tris[t + 3], tris[t + 4], tris[t + 5]];
  return Math.min(seg(a, ab), seg(a, ac), seg(b, [tris[t + 6] - b[0], tris[t + 7] - b[1], tris[t + 8] - b[2]]));
}

/** How far a point lies from a sheet's line (its foot, the way it runs, its length): 0 on it. */
function offLine(p: number[], foot: number[], dir: number[], length: number): number {
  const d = sub(p, foot);
  const s = Math.min(length, Math.max(0, dot(d, dir)));
  return Math.hypot(d[0] - dir[0] * s, d[1] - dir[1] * s, d[2] - dir[2] * s);
}

function limbOf(sk: GrownTree["skeleton"], node: number): number[] {
  const l = sk.limb[node];
  return sk.order[node] === 0 ? [0, -1, 0] : [sk.x[l], sk.y[l], sk.z[l]];
}

/** How a sheet curves: lifted at its foot and drooping to its tip (shares of its length), its edges falling (a share of its half width), and twisted (rad). */
interface SheetShape {
  lift: number;
  droop: number;
  arch: number;
  twist: number;
  /** Widest at its foot and narrowing to a point at its tip (a spire's), not narrower at both ends. */
  point?: boolean;
}

/**
 * One sheet: `rows` rows of `SHEET_ACROSS` points from its foot along `dir`, `length` long and `half`
 * wide either side at its widest, curved as `shape` says.
 */
function sheet(b: Builder, foot: number[], dir: number[], length: number, half: number, shape: SheetShape, own: number, n: number[], depth: number, kind: number, limb: number[], v: number, rows = SHEET_ALONG): void {
  const up = [0, 1, 0];
  let side = cross(up, dir);
  if (Math.hypot(side[0], side[1], side[2]) < 0.2) side = basis(dir)[0];
  side = norm(side);
  const top = norm(cross(dir, side));
  const { lift, droop, arch, twist } = shape;
  const point = (u: number, s: number): number[] => {
    // (Its middle line: on along the bough, up a little at first, then down to its tip as it hangs.)
    const h = length * (lift * u * (1 - u) * 2 - droop * u * u);
    const c = [foot[0] + dir[0] * length * u, foot[1] + dir[1] * length * u + h, foot[2] + dir[2] * length * u];
    // (Across it, turned about its length by its twist, more towards its tip; narrower at its foot and its tip.)
    const t = twist * u;
    const sd = add(scale(side, Math.cos(t)), scale(top, Math.sin(t)));
    const tp = sub(scale(top, Math.cos(t)), scale(side, Math.sin(t)));
    const wide = shape.point ? half * Math.max(0.03, 1 - u) ** 0.85 : half * (0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.95)));
    return add(add(c, scale(sd, s * wide)), scale(tp, -arch * wide * s * s));
  };
  let first = -1;
  for (let j = 0; j < rows; j++) {
    const u = j / (rows - 1);
    for (let i = 0; i < SHEET_ACROSS; i++) {
      const s = (i / (SHEET_ACROSS - 1)) * 2 - 1;
      const p = point(u, s);
      // (Its normal, from the way it runs along and across here: its top's side.)
      const e = 1e-3;
      const du = sub(point(Math.min(1, u + e), s), point(Math.max(0, u - e), s));
      const ds = sub(point(u, Math.min(1, s + e)), point(u, Math.max(-1, s - e)));
      let nrm = norm(cross(du, ds));
      if (dot(nrm, top) < 0) nrm = scale(nrm, -1);
      // (And where its middle line is, from it: a sheet may be turned about it, as the painterly look does.)
      const mid = point(u, 0);
      const k = b.vertex({ position: p, aDab: [s, u * 2 - 1, length / 2, own], aNormal: [...n, depth], aOffset: [...nrm, kind], aLimb: [...limb, v], aSpine: sub(mid, p) });
      if (first < 0) first = k;
    }
  }
  for (let j = 0; j + 1 < rows; j++) {
    for (let i = 0; i + 1 < SHEET_ACROSS; i++) {
      const q = first + j * SHEET_ACROSS + i;
      // (Wound so its top faces the way its normal does.)
      b.index.push(q, q + SHEET_ACROSS, q + SHEET_ACROSS + 1, q, q + SHEET_ACROSS + 1, q + 1);
    }
  }
}

/**
 * The realistic look's near leaves: each clump as `perClump` cards (close to, at least one for each of its
 * twigs), each a spray of leaves growing from the tree's own wood, its foot on one of the clump's
 * twigs, set in the crown at angles of their own (not turned to the eye: a card's face shows as it is). They face
 * out of the crown and a little up, as leaves turn to the light, each its own way about that. Each card:
 * `position` its centre; `aDab` its corner, its size (m, across half of it), a number of its own;
 * `aNormal` its clump's outward normal and depth; `aOffset` its own facing (unit) and 0; `aTangent` the
 * way its twig runs (unit, square to its facing) and how high the corner is in its clump (its radii); `aLimb` the foot of its limb and its variant. A variant
 * `skip` says is left without cards.
 */
/**
 * A tree whose leaves lie in pads (`habit.pads` 1): its near sprays spread this much wider about their shoots
 * and this share less high, and lie this share nearer level, facing up by this much more, so a pad is a
 * shelf, flat-topped and thin.
 */
/** A clump faces up past this when its sprays hang less there (`FixedCards.hangTop`). */
const HANG_TOP_FROM = 0.3;
const PAD_WIDE = 0.5;
const PAD_FLAT = 0.75;
const PAD_LEVEL = 0.8;
const PAD_FACE_UP = 1.2;
/** How far back along the wood under a clump its clothing sprays reach (m, `FixedCards.clothe`), and how big they are beside its own. */
const CLOTHE_REACH = 3.5;
/** A crown this far in pads is shelves (a coastal cypress's), each laid on its wood and not hung below it. */
const PAD_SHELF = 0.8;
const CLOTHE_SIZE = 0.8;

/** Near cards of a size of their own (m, half across), as many to a clump as cover it, hanging as much as `hang` (0..1). */
export interface FixedCards {
  half: number;
  /** How much more of a card its spray fills than a whole clump's picture does (so how many fewer are needed). */
  fill: number;
  /** The most cards to a clump. */
  most: number;
  /** Big cards to a clump besides, `bigSize` of its radius from their middle (`aOffset.w` 1 on them). */
  big: number;
  bigSize: number;
  hang: number;
  /**
   * How much less its sprays hang on a clump facing straight up, over the top of its crown (a weeping willow's:
   * hung all below their twigs there, they left the wood over them a bare wire along the crown's top).
   */
  hangTop?: number;
  /** Whether its sprays spring from as high as their clump is hung over its wood (a weeping crown's clothed top: `clothed`). */
  lift?: boolean;
  /** How far its sprays turn up along their twigs, 0..1 (a pine's shoots turn up to the light, their tufts like brushes held up). */
  rise?: number;
  /**
   * How many short sprays to lay along the wood leading up into each clump, under it (`CLOTHE_REACH` metres of it, past
   * the clump's own): a coastal cypress's limbs are clothed in sprays below its shelves, not bare wavy sticks up to a
   * floating disc.
   */
  clothe?: number;
}

export function cardPieces(trees: readonly GrownTree[], perClump: number, size: number, skip?: readonly boolean[], fixed?: readonly (FixedCards | null)[], rises?: readonly number[], upright?: readonly boolean[], sizes?: readonly number[]): Pieces {
  const b = new Builder({ position: 3, aDab: 4, aNormal: 4, aOffset: 4, aTangent: 4, aLimb: 4 });
  const [P, DAB, NORMAL, OFFSET, TANGENT, LIMB] = ["position", "aDab", "aNormal", "aOffset", "aTangent", "aLimb"].map((k) => b.slot(k));
  trees.forEach((tree, v) => {
    b.begin();
    if (skip?.[v]) {
      // (Its leaves are drawn as sheets: `sheetPieces`.)
      b.end();
      return;
    }
    const { clumps: cl, skeleton: sk } = tree;
    const twigs = clumpTwigs(tree);
    const lines = woodLines(tree, TIER_SHAPES[0]);
    const pads = Math.min(1, Math.max(0, tree.habit?.pads ?? 0));
    for (let c = 0; c < cl.count; c++) {
      const n = [cl.nx[c], cl.ny[c], cl.nz[c]];
      const r = cl.radius[c];
      // (Its twigs in turn, the one it hangs on first. Close to, a card for each at the least: no twig of it
      // is left bare. A few broad cards a clump (mid) cover it whole, and its twigs are under a pixel there.
      // Deep in the crown, fewer: little of it shows.)
      const shoots = twigs[c].map((t) => shootOf(sk, lines, t, r * SHOOT));
      const fix = fixed?.[v] ?? null;
      // (Cards of a fixed size: as many as cover the clump as the usual ones would, the leaves' spray a card
      // fills more of than a whole clump's; the deep ones fewer, as below.)
      const own = fix ? Math.round(Math.min(fix.most, Math.max(perClump, perClump * ((r * size) / fix.half) ** 2 * fix.fill))) : perClump;
      const base = cl.depth[c] > 0.65 ? Math.max(1, own >> 1) : own;
      const count = fix ? base : perClump >= 4 ? Math.max(base, Math.min(shoots.length, 4 * perClump)) : base;
      // (With small cards, a few big ones too, a clump wide, set a little into it: the mass of its leaves, which
      // the small ones at its surface lay their detail over.)
      const big = fix ? (cl.depth[c] > 0.65 ? Math.min(1, fix.big) : fix.big) : 0;
      // (Sprays clothing the wood under it (`clothe`): along its first twig's wood, back past its own reach.)
      const clothes = fix?.clothe && cl.depth[c] <= 0.65 ? fix.clothe : 0;
      const unders = clothes > 0 ? twigs[c].slice(0, 2).map((t) => shootOf(sk, lines, t, r * SHOOT + CLOTHE_REACH)) : [];
      for (let d = 0; d < count + big + clothes; d++) {
        const clothing = d >= count + big;
        const filler = d >= count && !clothing;
        const twig = twigs[c][d % shoots.length];
        const shoot = clothing && unders.length > 0 ? unders[d % unders.length] : shoots[d % shoots.length];
        const reach = shoot.length;
        const l = sk.limb[twig];
        const limb = sk.order[twig] === 0 ? [0, -1, 0] : [sk.x[l], sk.y[l], sk.z[l]];
        const k = c * 37 + d;
        const own = hash01(k, v * 613 + 7);
        const u = hash01(k, 21) * 2 - 1;
        const a = hash01(k, 22) * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const off = [s * Math.cos(a), u, s * Math.sin(a)];
        // (Its foot is on the wood: on its twig, or on the last of the wood leading to it, more of them near
        // its end, and each twig's first card at its very end. A spray grows from a shoot; set about the
        // clump's centre, the cards hang in the air beside the twig, and past its end.)
        const near0 = Math.min(reach, r * SHOOT);
        const at0 = clothing ? shoot.at(near0 + (reach - near0) * ((d - count - big + hash01(k, 25)) / clothes)) : shoot.at(reach * hash01(k, 25) ** 1.6 * (d < shoots.length ? 0.2 : 1));
        // (Small cards spread through the clump about their shoots, as its side twigs carry them: else they
        // would crowd along a line or two.)
        // (In a tree whose leaves lie in pads, `habit.pads`, flattened into a shelf: wider, and thin.)
        const spread = fix && !filler ? r * (clothing ? 0.2 : 0.55) * Math.sqrt(hash01(k, 26)) : 0;
        const wide = 1 + PAD_WIDE * pads;
        // (A weeping tree's sprays, `lift`, spring from as high as their clump is hung over its wood: a
        // whip's arch, its crown's clothed top. Hung from the wood, they left it bare over them.)
        const lift = fix?.lift ? Math.max(0, cl.y[c] - at0.p[1]) : 0;
        // (A pine's tufts, held up off their shoots, make a cushion domed above them: none hang under it.)
        const offUp = fix && (fix.rise ?? 0) > 0.5 ? Math.abs(off[1]) : off[1];
        const from = fix && !filler ? { p: [at0.p[0] + off[0] * spread * wide, at0.p[1] + lift + offUp * spread * (1 - PAD_FLAT * pads), at0.p[2] + off[2] * spread * wide], d: at0.d } : lift > 0 ? { p: [at0.p[0], at0.p[1] + lift, at0.p[2]], d: at0.d } : at0;
        // (A hanging spray's twig turned down, as far as the species' sprays hang: a eucalyptus's, a willow's;
        // its big cards too, the clump's hanging mass.)
        // (Less on a clump facing the sky, as far as its kind says: `hangTop`.)
        const top = Math.max(0, (n[1] - HANG_TOP_FROM) / (1 - HANG_TOP_FROM));
        const hang = fix ? fix.hang * (filler ? 0.85 : 0.75 + 0.5 * hash01(k, 27)) * (1 - (fix.hangTop ?? 0) * top) : 0;
        // (Its facing: out of the crown and up, turned its own way by as much again; a hanging spray's no
        // more up than its leaves let it, as they hang edge to the sky: a card facing up has no way down
        // along it, and its leaves would lie flat.)
        // (So too a spray that rises along its twig, half as far.)
        // (Its big cards too, and a mid card of a variant `rises` says, as far: a pine's big card is a branch's
        // cushion of tufts held up off it, flat beneath and domed above; spun any way about its facing, a blot.)
        const rise = fix ? (fix.rise ?? 0) : (rises?.[v] ?? 0);
        // (A pad's sprays face the sky, as a shelf's top does.)
        const face = norm([n[0] * 0.9 + off[0] * 0.8, (n[1] * 0.9 + off[1] * 0.8 + 0.5) * (1 - 0.85 * Math.min(1, hang)) * (1 - 0.5 * rise) + PAD_FACE_UP * pads, n[2] * 0.9 + off[2] * 0.8]);
        // (Its twig: on along the wood its foot is on, out of the crown a little, turned its own way (a
        // frond's leaves follow the frond, a whip's hang with the whip), and square to its facing.)
        const [e1, e2] = basis(face);
        const t = hash01(k, 23) * Math.PI * 2;
        const spin = [e1[0] * Math.cos(t) + e2[0] * Math.sin(t), e1[1] * Math.cos(t) + e2[1] * Math.sin(t), e1[2] * Math.cos(t) + e2[2] * Math.sin(t)];
        // (A rising spray's shoots point out of the crown as well as up: a pine's tufts bristle from its outline.)
        const out = 0.3 + 0.5 * rise;
        const along0 = [from.d[0] + spin[0] * 0.6 * (1 - 0.5 * rise) + n[0] * out, from.d[1] + spin[1] * 0.6 * (1 - 0.5 * rise) + n[1] * out + rise, from.d[2] + spin[2] * 0.6 * (1 - 0.5 * rise) + n[2] * out];
        const l0 = Math.hypot(along0[0], along0[1], along0[2]) || 1;
        // (A pad's sprays, its big cards too, lie level: from the side a pad is a band of them, not a ball.)
        const level = 1 - PAD_LEVEL * pads * (1 - Math.min(1, rise));
        const along = [(along0[0] / l0) * (1 - hang), ((along0[1] / l0) * (1 - hang) - hang) * level, (along0[2] / l0) * (1 - hang)];
        const dotF = along[0] * face[0] + along[1] * face[1] + along[2] * face[2];
        const flat = [along[0] - face[0] * dotF, along[1] - face[1] * dotF, along[2] - face[2] * dotF];
        // (A variant `upright` says stands its big cards (a near tree's, every one of a mid tree's) upright on
        // their twigs, facing out of the crown level: a pine's cushion picture, its flat base kept level, which the
        // shader turns to the eye about the vertical.)
        const stands = upright?.[v] === true && (!fix || filler);
        const tangent = stands ? [0, 1, 0] : Math.hypot(flat[0], flat[1], flat[2]) > 1e-3 ? norm(flat) : norm(spin);
        const facing = stands ? (Math.hypot(n[0], n[2]) > 1e-3 ? norm([n[0], 0, n[2]]) : norm([off[0] + 1e-3, 0, off[2]])) : face;
        // (A variant's own size for its cards where `sizes` gives one: a stone pine's mid cards, strips of its canopy.)
        // (Upright cushions vary more, and stand at heights of their own about their twigs, a half of the
        // clump's radius up or down: at one height, a crown of them seen from beneath was rings of plates.)
        const vary = stands ? CUSHION_VARY : 0.4;
        const half = (fix && !filler ? fix.half * (clothing ? CLOTHE_SIZE : 1) : fix ? r * fix.bigSize : r * (sizes?.[v] ?? size)) * (1 - vary / 2 + hash01(k, 24) * vary);
        // (The spray's own twig enters its picture near the bottom edge (leaves.ts): its centre is that far
        // on from its foot.)
        // (A shelf (a crown in pads, `pads` 0.8 or more) only up from its wood: dropped under it, it hung below its own
        // limb, the limb running on bare above it.)
        const upDown = pads >= PAD_SHELF ? 0.5 * hash01(k, 28) : hash01(k, 28) - 0.5;
        const on = half * SPRAY_FOOT + (stands ? upDown * r * CUSHION_RISE : 0);
        const at = [from.p[0] + tangent[0] * on, from.p[1] + tangent[1] * on, from.p[2] + tangent[2] * on];
        let f = -1;
        for (const [cx, cy] of CORNERS) {
          // (How high the corner is in its clump, in the clump's radii: along the twig, which the card keeps
          // however it is turned to the eye. A dense clump's needles low in it are in its own shade.)
          const inClump = Math.max(-1.5, Math.min(1.5, (at[1] + tangent[1] * cy * half - cl.y[c]) / Math.max(r, 1e-3)));
          b.putAt(P, at[0], at[1], at[2]);
          b.putAt(DAB, cx, cy, half, own);
          b.putAt(NORMAL, n[0], n[1], n[2], cl.depth[c]);
          b.putAt(OFFSET, facing[0], facing[1], facing[2], filler ? 1 : 0);
          b.putAt(TANGENT, tangent[0], tangent[1], tangent[2], inClump);
          b.putAt(LIMB, limb[0], limb[1], limb[2], v);
          const i = b.next();
          if (f < 0) f = i;
        }
        b.index.push(f, f + 1, f + 2, f, f + 2, f + 3);
      }
    }
    b.end();
  });
  return b.done();
}
