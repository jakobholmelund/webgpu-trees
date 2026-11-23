// Which trees are grown, and how each tree on the ground is fitted to one.
//
// A course has tens of thousands of trees, each of its own measured size;
// growing each would take minutes and hold gigabytes. So a few trees of each
// species are grown (its variants), one for each shape its trees come in
// (how wide for their height, how high their crown starts) and a seed or
// two each, and every tree on the ground is one of them, fitted to its own
// size exactly:
//
//   up the tree, in two stretches: the trunk to the tree's own crown base,
//   the crown from there to its own top;
//   across it, to its own crown radius;
//   the wood, thickened or thinned to its own trunk radius (positions and
//   thickness scale apart: a tree's wood is drawn from its centre lines).
//
// So a drawn tree fills the space its numbers give, which is what a ball
// meets. Then it is turned (yaw), maybe mirrored, leant a little and tinted,
// so the same variant twice does not look twice.

import { type TreeSpecies } from "./species.ts";
import { type TreeSize } from "./tree.ts";

/** One tree on the ground. Its size, left out, is its species'. */
export interface TreeInstance {
  x: number;
  /** The ground's height at its foot. */
  y: number;
  z: number;
  /** Its species, by row in the list of species. */
  species: number;
  height?: number;
  crownRadius?: number;
  crownBase?: number;
  trunkRadius?: number;
  /** Which way it faces (radians). Left out, it is chosen from its place. */
  yaw?: number;
  /** Its own number, for whatever is chosen of it at random. Left out, it is made from its place. */
  seed?: number;
}

/** Trees packed as numbers, `TREE_STRIDE` to a tree, in the order of `TREE_FIELDS`: what a host with many trees hands over. NaN for a size, yaw or seed is "left out". */
export const TREE_FIELDS = ["x", "y", "z", "species", "height", "crownRadius", "crownBase", "trunkRadius", "yaw", "seed"] as const;
export const TREE_STRIDE = TREE_FIELDS.length;

export function packTrees(list: readonly TreeInstance[]): Float32Array {
  const out = new Float32Array(list.length * TREE_STRIDE);
  list.forEach((t, i) => {
    const o = i * TREE_STRIDE;
    out[o] = t.x;
    out[o + 1] = t.y;
    out[o + 2] = t.z;
    out[o + 3] = t.species;
    out[o + 4] = t.height ?? NaN;
    out[o + 5] = t.crownRadius ?? NaN;
    out[o + 6] = t.crownBase ?? NaN;
    out[o + 7] = t.trunkRadius ?? NaN;
    out[o + 8] = t.yaw ?? NaN;
    out[o + 9] = t.seed ?? NaN;
  });
  return out;
}

/** A number from 0 to 1 that depends on an integer and a salt and nothing else (an integer hash: the same on every machine). */
export function hash01(n: number, salt: number): number {
  let h = (Math.imul(n | 0, 0x9e3779b1) ^ Math.imul(salt | 0, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A hex colour (sRGB) as linear red, green and blue. */
export function linearRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)];
}

/** An integer seed from a place on the ground: stable between loads, to the centimetre. */
export function seedOfPlace(x: number, z: number): number {
  return (Math.imul(Math.round(x * 100), 73856093) ^ Math.imul(Math.round(z * 100), 19349663)) >>> 0;
}

export interface VariantOptions {
  /** How many shapes each species' trees are sorted into (each grown once a seed): more fit closer and cost more to hold. */
  shapes: number;
  /** How many trees are grown for each shape, from different seeds. */
  seeds: number;
  /** How far a tree may lean from upright (degrees), at most. */
  lean: number;
  /** Whether a tree may be its variant mirrored. */
  mirror: boolean;
}

export const DEFAULT_VARIANT_OPTIONS: VariantOptions = { shapes: 2, seeds: 2, lean: 3, mirror: true };

/** A tree to grow. */
export interface Variant {
  species: number;
  size: TreeSize;
  seed: number;
  /** How many trees on the ground are this one. */
  trees: number;
}

/** Where one tree on the ground stands and how its variant is fitted to it. */
export interface Placement {
  variant: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Its own size. */
  size: TreeSize;
  /** How far it leans, along x and z (as the sine of the angle). */
  leanX: number;
  leanZ: number;
  /** 1, or -1 for its variant mirrored. */
  mirror: number;
  /** A tint for the tree's leaves, about 1 in each of r, g and b (its bark takes only how light it is). */
  tint: [number, number, number];
  /** A number of its own, 0..1. */
  own: number;
}

export interface Plan {
  variants: Variant[];
  placements: Placement[];
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Sorts points into `k` groups by nearness (k-means, from spread-out starts, a fixed number of rounds: the same every time). */
function groups(points: [number, number][], k: number): { centres: [number, number][]; of: number[] } {
  const n = points.length;
  k = Math.max(1, Math.min(k, n));
  // (Starts: the points at even steps through them sorted by the first number, then by the second.)
  const order = points.map((_, i) => i).sort((a, b) => points[a][0] - points[b][0] || points[a][1] - points[b][1]);
  const centres: [number, number][] = [];
  for (let c = 0; c < k; c++) centres.push([...points[order[Math.floor(((c + 0.5) * n) / k)]]] as [number, number]);
  const of = new Array<number>(n).fill(0);
  for (let round = 0; round < 12; round++) {
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (points[i][0] - centres[c][0]) ** 2 + (points[i][1] - centres[c][1]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      of[i] = best;
    }
    for (let c = 0; c < k; c++) {
      let sx = 0;
      let sy = 0;
      let m = 0;
      for (let i = 0; i < n; i++) {
        if (of[i] !== c) continue;
        sx += points[i][0];
        sy += points[i][1];
        m++;
      }
      if (m > 0) centres[c] = [sx / m, sy / m];
    }
  }
  return { centres, of };
}

/** A tree's own size: its own numbers where it has them, its species' where not, and never one that cannot be grown. */
export function sizeOf(packed: Float32Array, i: number, species: TreeSpecies): TreeSize {
  const o = i * TREE_STRIDE;
  const pick = (v: number, d: number) => (Number.isFinite(v) && v > 0 ? v : d);
  const height = pick(packed[o + 4], species.height);
  const crownRadius = pick(packed[o + 5], species.crownRadius * (height / species.height));
  // (A crown base of 0 is a measured one: leaves to the ground.)
  const cb = packed[o + 6];
  const crownBase = Math.min(height * 0.92, Number.isFinite(cb) && cb >= 0 ? cb : species.crownBase * (height / species.height));
  const trunkRadius = pick(packed[o + 7], species.trunkRadius * (height / species.height));
  return { height, crownRadius: Math.max(0.15, crownRadius), crownBase, trunkRadius: Math.max(0.01, trunkRadius) };
}

/** What to grow for these trees, and how each is fitted to what is grown. */
export function planVariants(packed: Float32Array, species: readonly TreeSpecies[], options: VariantOptions = DEFAULT_VARIANT_OPTIONS): Plan {
  const count = Math.floor(packed.length / TREE_STRIDE);
  const variants: Variant[] = [];
  const placements: Placement[] = new Array(count);
  const bySpecies = new Map<number, number[]>();
  for (let i = 0; i < count; i++) {
    const s = Math.min(species.length - 1, Math.max(0, Math.round(packed[i * TREE_STRIDE + 3])));
    let list = bySpecies.get(s);
    if (!list) bySpecies.set(s, (list = []));
    list.push(i);
  }
  const leanMax = Math.sin((options.lean * Math.PI) / 180);
  for (const [s, members] of [...bySpecies.entries()].sort((a, b) => a[0] - b[0])) {
    const sp = species[s];
    const sizes = members.map((i) => sizeOf(packed, i, sp));
    // (A tree's shape: how wide its crown is for its height, how high its crown starts, as shares of its height.)
    const shapes = sizes.map((z) => [z.crownRadius / z.height, z.crownBase / z.height] as [number, number]);
    const { centres, of } = groups(shapes, options.shapes);
    const firstOf: number[] = [];
    const seedsOf: number[] = [];
    for (let c = 0; c < centres.length; c++) {
      firstOf.push(variants.length);
      const inShape = sizes.filter((_, j) => of[j] === c);
      const height = median(inShape.map((z) => z.height)) || sp.height;
      const trunkShare = median(inShape.map((z) => z.trunkRadius / z.height)) || sp.trunkRadius / sp.height;
      // (No more seeds than trees of this shape: a second variant nothing is fitted to is grown for nothing.)
      const seeds = Math.max(1, Math.min(options.seeds, inShape.length));
      for (let k = 0; k < seeds; k++) {
        variants.push({
          species: s,
          size: { height, crownRadius: centres[c][0] * height, crownBase: centres[c][1] * height, trunkRadius: trunkShare * height },
          seed: (s * 7919 + c * 104729 + k * 1299709 + 17) >>> 0,
          trees: 0,
        });
      }
      seedsOf.push(seeds);
    }
    members.forEach((i, j) => {
      const o = i * TREE_STRIDE;
      const x = packed[o];
      const z = packed[o + 2];
      const seed = Number.isFinite(packed[o + 9]) ? packed[o + 9] >>> 0 : seedOfPlace(x, z);
      const v = firstOf[of[j]] + Math.floor(hash01(seed, 1) * seedsOf[of[j]]);
      variants[v].trees++;
      const yaw = Number.isFinite(packed[o + 8]) ? packed[o + 8] : hash01(seed, 2) * Math.PI * 2;
      const leanA = hash01(seed, 3) * Math.PI * 2;
      const leanR = leanMax * Math.sqrt(hash01(seed, 4));
      const tv = sp.treeVariation;
      const tone = 1 + (hash01(seed, 5) - 0.5) * 0.3 * tv;
      const warm = (hash01(seed, 6) - 0.5) * 0.2 * tv;
      // (A species with a palette: this tree's colour from it, as a tint over the species' own.)
      const own = sp.leafColors && sp.leafColors.length > 0 ? sp.leafColors[Math.floor(hash01(seed, 9) * sp.leafColors.length)] : sp.leafColor;
      const pick = linearRgb(own);
      const base = linearRgb(sp.leafColor);
      const ratio = pick.map((c, k) => c / Math.max(base[k], 1e-4));
      placements[i] = {
        variant: v,
        x,
        y: packed[o + 1],
        z,
        yaw,
        size: sizes[j],
        leanX: Math.cos(leanA) * leanR,
        leanZ: Math.sin(leanA) * leanR,
        mirror: options.mirror && hash01(seed, 7) < 0.5 ? -1 : 1,
        tint: [ratio[0] * tone * (1 + warm), ratio[1] * tone, ratio[2] * tone * (1 - warm)],
        own: hash01(seed, 8),
      };
    });
  }
  return { variants, placements };
}

/**
 * Where a point of a variant (its own frame, metres from its foot) is on a tree fitted from it, in that
 * tree's frame before it is turned and leant: what the shaders do to every vertex (engine.ts, `fitOf`).
 */
export function fitPoint(grownSize: TreeSize, size: TreeSize, mirror: number, p: [number, number, number]): [number, number, number] {
  const across = size.crownRadius / grownSize.crownRadius;
  const trunkUp = size.crownBase / Math.max(grownSize.crownBase, 0.01);
  const crownUp = (size.height - size.crownBase) / Math.max(grownSize.height - grownSize.crownBase, 0.01);
  const y = p[1] < grownSize.crownBase ? p[1] * trunkUp : size.crownBase + (p[1] - grownSize.crownBase) * crownUp;
  return [p[0] * mirror * across, y, p[2] * across];
}
