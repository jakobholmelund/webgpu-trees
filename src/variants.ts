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
//
// Where a tree stands is part of its shape (stand.ts): alone in the open, at
// a wood's edge, or inside a wood, each grown in the light its neighbours
// leave it. An edge tree's variant is grown with its open side along +x and
// turned so that side faces the way the tree's own wood is open; it leans
// that way, as far as a lean may go.

import { formDraw, formsVary } from "./grow.ts";
import { type Pruning } from "./palm.ts";
import { type TreeSpecies } from "./species.ts";
import { OPEN_STAND, type Stand, type Standing, standingOf, standsOf } from "./stand.ts";
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
  /** Where it stands among the others, over what is worked out from its neighbours (stand.ts): any part of it. */
  stand?: Partial<Stand>;
  /** A palm's: how it is kept (palm.ts), over its species' `pruning`. */
  pruning?: Pruning;
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
  /**
   * How many shapes each species' trees are sorted into, at the fewest (each grown once a seed): more fit closer
   * and cost more to hold. More are made where its trees' shapes spread further than `stretch` lets one variant
   * be fitted to them all.
   */
  shapes: number;
  /**
   * How far a tree's crown may be stretched from its variant's, one way more than the other (its depth beside its
   * width: 1.3, a crown grown as deep as it is wide fitted to one 1.3 times as deep as wide); a variant may be
   * scaled as a whole by this to the 2.5, and its trunk beside its crown to the 3. Left out, `FIT_STRETCH`.
   */
  stretch?: number;
  /** The most shapes a species' trees are sorted into for one way of standing, whatever their spread (`MOST_SHAPES` left out). */
  mostShapes?: number;
  /** How many trees are grown for each shape, from different seeds. */
  seeds: number;
  /** How far a tree may lean from upright (degrees), at most. */
  lean: number;
  /** Whether a tree may be its variant mirrored. */
  mirror: boolean;
  /** Whether trees are grown for where they stand (stand.ts): edge and interior trees as well as open ones. */
  stands: boolean;
  /**
   * A number mixed into every variant's seed: another set of trees of the same shapes (0 or left out: the
   * set as it has always been).
   */
  seed?: number;
}

/**
 * How many seeds a shape is grown from, at least, for a species whose trees differ in their form at the foot
 * (`formsVary`: some forked, some clumps, some one stem), so that a stand of them shows the mix.
 */
export const FORM_SEEDS = 3;

/**
 * A variant's seed, for a species whose trees differ in form: the first of a run of seeds from `base` whose
 * form's draw (`formDraw`) falls in the `k`th of `m` even shares of 0..1, offset a little for the `c`th of
 * `shapes` shapes. So a shape's few variants are spread over the species' forms by their shares, and not left
 * to chance (two seeds might both be one stem).
 */
function spreadSeed(base: number, k: number, m: number, c: number, shapes: number): number {
  const lo = (k + c / shapes) / m;
  const hi = lo + 1 / (m * shapes);
  for (let j = 0; j < 4000; j++) {
    const seed = (base + Math.imul(j, 0x9e3779b1)) >>> 0;
    const u = formDraw(seed);
    if (u >= lo && u < hi) return seed;
  }
  return base;
}

export const DEFAULT_VARIANT_OPTIONS: VariantOptions = { shapes: 2, seeds: 2, lean: 3, mirror: true, stands: true };

/**
 * How far a tree's crown may be stretched from the variant it is fitted from (see `VariantOptions.stretch`).
 * Every tree is a variant stretched to its own size, up its trunk, up its crown and across it, and the stretch is
 * not the tree's: its clumps keep their size ((across + up) / 2: engine.ts `fitOf`) while the spaces between them
 * and the wood under them stretch. Sorted into two shapes by k-means, Riviera's eucalyptus of 4.7 to 26 m on crowns
 * of 1 to 5.3 m were fitted from variants grown 7.8 and 8 m tall, some crowns stretched six times as far up as
 * across: a Monterey cypress's pads drawn apart up its crown, each on a bare spike of stretched twig with the
 * top of its crown floating over them; a stone pine of 33 m a tower of its 12 m variant's cushions stacked; a
 * blue gum's crown squashed into a thin lid, its limbs pressed into loops; a sycamore's crown a ball on poles.
 */
export const FIT_STRETCH = 1.3;
/**
 * How much further (as a power of `stretch`) a variant may be scaled as a whole, and its trunk beside its crown,
 * than its crown one way beside the other: a tree scaled whole is still its shape (its twigs and clumps a little
 * bigger or smaller), and a trunk is bare.
 */
const WHOLE_STRETCH = 2.5;
const TRUNK_STRETCH = 3;
/** A shape is grown from a seed more for every this many of its trees, up to `VariantOptions.seeds`. */
export const SEED_TREES = 8;
/** ... and for every this many, of a species whose trees differ in form at the foot (`formsVary`). */
export const FORM_TREES = 3;
/** The most shapes a species' trees are sorted into for one way of standing (see `VariantOptions.mostShapes`). */
export const MOST_SHAPES = 12;
/** A crown base is reckoned this much higher (m) when its share is set beside its crown's: a crown on the ground is not infinitely low. */
const BASE_FLOOR = 0.5;

/** A tree to grow. */
export interface Variant {
  species: number;
  size: TreeSize;
  seed: number;
  /** How many trees on the ground are this one. */
  trees: number;
  /** Where it is grown as standing; and its stand, in its own frame (open along +x): its trees' on the whole. */
  standing: Standing;
  stand: Stand;
  /** A palm's pruning, where its trees are kept otherwise than their species says (palm.ts); left out, its species'. */
  pruning?: Pruning;
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
  /** Where it stands (its own, on the ground: stand.ts), and the class of variant that makes it. */
  stand: Stand;
  standing: Standing;
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
function groups(points: number[][], k: number, starts?: number[][]): { centres: number[][]; of: number[] } {
  const n = points.length;
  const dims = n > 0 ? points[0].length : 0;
  k = Math.max(1, Math.min(k, n));
  // (Starts: those given, or the points at even steps through them sorted by the first number, then by the second.)
  const order = points.map((_, i) => i).sort((a, b) => points[a][0] - points[b][0] || points[a][1] - points[b][1]);
  const centres: number[][] = starts ? starts.slice(0, k).map((c) => [...c]) : [];
  for (let c = centres.length; c < k; c++) centres.push([...points[order[Math.floor(((c + 0.5) * n) / k)]]]);
  const of = new Array<number>(n).fill(0);
  for (let round = 0; round < 12; round++) {
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        let d = 0;
        for (let q = 0; q < dims; q++) d += (points[i][q] - centres[c][q]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      of[i] = best;
    }
    for (let c = 0; c < k; c++) {
      const sum = new Array<number>(dims).fill(0);
      let m = 0;
      for (let i = 0; i < n; i++) {
        if (of[i] !== c) continue;
        for (let q = 0; q < dims; q++) sum[q] += points[i][q];
        m++;
      }
      if (m > 0) centres[c] = sum.map((v) => v / m);
    }
  }
  return { centres, of };
}

/** How far apart (in its enclosure) two trees in a wood may stand and be grown as one shape. */
const ENCLOSURE_SPREAD = 0.25;

/**
 * A tree's shape, as a variant is stretched to fit it (`fitPoint`): its crown's depth beside its width, its
 * crown's size (the root of the two multiplied), and its crown's base beside that, each a logarithm, so a
 * difference between two trees is how far one is stretched to the other: `aspect` its crown's depth beside its
 * width, `whole` all of it, `trunk` its trunk beside its crown.
 */
function featuresOf(z: TreeSize): [aspect: number, whole: number, trunk: number] {
  const depth = Math.max(0.05, z.height - z.crownBase);
  const r = Math.max(0.05, z.crownRadius);
  const whole = 0.5 * Math.log(depth * r);
  return [Math.log(depth / r), whole, Math.log((z.crownBase + BASE_FLOOR) / Math.sqrt(depth * r))];
}

/** The size whose shape is these features (`featuresOf` undone). */
function sizeOfFeatures(f: readonly number[]): { height: number; crownRadius: number; crownBase: number } {
  const depth = Math.exp(f[1] + 0.5 * f[0]);
  const crownRadius = Math.exp(f[1] - 0.5 * f[0]);
  const crownBase = Math.max(0, Math.exp(f[2] + f[1]) - BASE_FLOOR);
  return { height: crownBase + depth, crownRadius, crownBase };
}

/**
 * Sorts points into groups so that every point is within 1 of its group's centre in every number (the
 * centre the middle of its group's extent), with as few groups as k-means finds that for: from `k` (`groups`),
 * a group more at a time started at the point furthest from its centre, up to `most` (then as near as `most`
 * groups come). The same every time.
 */
function coveringGroups(points: number[][], k: number, most: number): { centres: number[][]; of: number[] } {
  const n = points.length;
  if (n === 0) return { centres: [], of: [] };
  const dims = points[0].length;
  const far = (p: number[], c: number[]) => {
    let d = 0;
    for (let q = 0; q < dims; q++) d = Math.max(d, Math.abs(p[q] - c[q]));
    return d;
  };
  // (Each group's centre the middle of its extent, and each point to the centre it is least far from, a few rounds.)
  const settle = (centres: number[][], of: number[]) => {
    for (let round = 0; round < 4; round++) {
      for (let c = 0; c < centres.length; c++) {
        const lo = new Array<number>(dims).fill(Infinity);
        const hi = new Array<number>(dims).fill(-Infinity);
        for (let i = 0; i < n; i++) {
          if (of[i] !== c) continue;
          for (let q = 0; q < dims; q++) {
            lo[q] = Math.min(lo[q], points[i][q]);
            hi[q] = Math.max(hi[q], points[i][q]);
          }
        }
        if (Number.isFinite(lo[0])) centres[c] = lo.map((v, q) => 0.5 * (v + hi[q]));
      }
      for (let i = 0; i < n; i++) {
        let best = of[i];
        let bestD = far(points[i], centres[best]);
        for (let c = 0; c < centres.length; c++) {
          const d = far(points[i], centres[c]);
          if (d < bestD - 1e-12) {
            bestD = d;
            best = c;
          }
        }
        of[i] = best;
      }
    }
  };
  let { centres, of } = groups(points, k);
  settle(centres, of);
  while (centres.length < Math.min(most, n)) {
    let worst = -1;
    let worstD = 1;
    for (let i = 0; i < n; i++) {
      const d = far(points[i], centres[of[i]]);
      if (d > worstD + 1e-9) {
        worstD = d;
        worst = i;
      }
    }
    if (worst < 0) break;
    ({ centres, of } = groups(points, centres.length + 1, [...centres, [...points[worst]]]));
    settle(centres, of);
  }
  // (Groups no point is left in are dropped.)
  const used = [...new Set(of)].sort((a, b) => a - b);
  const to = new Map(used.map((c, j) => [c, j]));
  return { centres: used.map((c) => centres[c]), of: of.map((c) => to.get(c)!) };
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

/** The classes of variant, in the order they are grown, and how many shapes each takes of `shapes`. */
const STANDINGS: { standing: Standing; shapes: (n: number) => number }[] = [
  { standing: "open", shapes: (n) => n },
  { standing: "edge", shapes: (n) => n },
  // (Seen from outside only between the edge's trees: one shape fewer, sorted by how closed in it stands as
  // much as by its crown's shape.)
  { standing: "interior", shapes: (n) => Math.max(1, n - 1) },
];

/** A stand with a host's parts over it, kept to what can be grown. */
function standOver(s: Stand, over: Partial<Stand> | null | undefined): Stand {
  if (!over) return s;
  const pick = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);
  const ox = pick(over.openX, s.openX);
  const oz = pick(over.openZ, s.openZ);
  const k = Math.hypot(ox, oz);
  return {
    enclosure: Math.min(1, Math.max(0, pick(over.enclosure, s.enclosure))),
    lopsided: Math.min(1, Math.max(0, pick(over.lopsided, s.lopsided))),
    openX: k > 1e-6 ? ox / k : 1,
    openZ: k > 1e-6 ? oz / k : 0,
    canopy: Math.min(3, Math.max(0, pick(over.canopy, s.canopy))),
    gap: Math.min(3, Math.max(-0.3, pick(over.gap, s.gap))),
  };
}

/**
 * What to grow for these trees, and how each is fitted to what is grown. Each tree's stand is worked out
 * from its neighbours (stand.ts) unless `options.stands` is off; `stands` (by tree) sets any part of it.
 */
export function planVariants(packed: Float32Array, species: readonly TreeSpecies[], options: VariantOptions = DEFAULT_VARIANT_OPTIONS, stands?: readonly (Partial<Stand> | null | undefined)[], prunings?: readonly (Pruning | null | undefined)[]): Plan {
  const count = Math.floor(packed.length / TREE_STRIDE);
  const variants: Variant[] = [];
  const placements: Placement[] = new Array(count);
  // (By species, and a palm's by how it is kept where a tree says so: a pineapple cut and a natural palm are
  // grown apart.)
  const bySpecies = new Map<string, { s: number; pruning?: Pruning; members: number[] }>();
  const speciesOf = (i: number) => Math.min(species.length - 1, Math.max(0, Math.round(packed[i * TREE_STRIDE + 3])));
  for (let i = 0; i < count; i++) {
    const s = speciesOf(i);
    const own = species[s].architecture === "palm" ? (prunings?.[i] ?? undefined) : undefined;
    const pruning = own && own !== species[s].pruning ? own : undefined;
    const key = `${s}|${pruning ?? ""}`;
    let g = bySpecies.get(key);
    if (!g) bySpecies.set(key, (g = { s, pruning, members: [] }));
    g.members.push(i);
  }
  const allSizes: TreeSize[] = Array.from({ length: count }, (_, i) => sizeOf(packed, i, species[speciesOf(i)]));
  // Where each tree stands, from its neighbours; then whatever the host says of it.
  const xs = new Float64Array(count);
  const zs = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    xs[i] = packed[i * TREE_STRIDE];
    zs[i] = packed[i * TREE_STRIDE + 2];
  }
  const worked = options.stands !== false ? standsOf(xs, zs, allSizes) : null;
  const standOf = (i: number): Stand => standOver(worked ? worked[i] : { ...OPEN_STAND }, stands?.[i]);
  const leanMax = Math.sin((options.lean * Math.PI) / 180);
  const stretch = Math.max(1.01, options.stretch ?? FIT_STRETCH);
  const mostShapes = options.mostShapes ?? MOST_SHAPES;
  for (const { s, pruning, members } of [...bySpecies.values()].sort((a, b) => a.s - b.s || (a.pruning ?? "").localeCompare(b.pruning ?? ""))) {
    const sp = species[s];
    // (A shrub or a palm is grown as it stands in the open wherever it is: it is not shaped by a wood.)
    const shaped = options.stands !== false && (sp.architecture === "broadleaf" || sp.architecture === "conifer");
    const ownStand = members.map(standOf);
    const classOf = ownStand.map((st) => (shaped ? standingOf(st) : "open"));
    STANDINGS.forEach(({ standing, shapes: shapesOf }, which) => {
      const inClass = members.filter((_, j) => classOf[j] === standing);
      if (inClass.length === 0) return;
      const stOf = ownStand.filter((_, j) => classOf[j] === standing);
      const sizes = inClass.map((i) => allSizes[i]);
      // (A tree's shape: how deep its crown is for its width, how big it is, and how high its crown starts beside
      // its crown's size, each on a log scale by how far a tree may be stretched that way from its variant; and,
      // in a wood, how closed it stands, which shapes it as much: a tree one row in from the edge is not one deep
      // inside. Its size counts: a tree's habit changes with it (age.ts: a stone pine of 4 m is a young rounded
      // one, of 15 m an umbrella), so a shape's variant is grown near its trees' heights.)
      const aspectLog = Math.log(stretch);
      const wholeLog = WHOLE_STRETCH * aspectLog;
      const trunkLog = TRUNK_STRETCH * aspectLog;
      const shapes = sizes.map((z, j) => {
        const f = featuresOf(z);
        const out = [f[0] / aspectLog, f[1] / wholeLog, f[2] / trunkLog];
        if (standing !== "open") out.push(stOf[j].enclosure / ENCLOSURE_SPREAD);
        return out;
      });
      // (A palm's head is its fronds, as long as its kind's whatever its crown's numbers, and a palm takes many
      // times a broadleaf's time to grow: its few shapes stay few.)
      const fewest = shapesOf(options.shapes);
      const { centres: scaled, of } = coveringGroups(shapes, fewest, sp.architecture === "palm" ? fewest : Math.max(fewest, mostShapes));
      const centres = scaled.map((c) => sizeOfFeatures([c[0] * aspectLog, c[1] * wholeLog, c[2] * trunkLog]));
      const firstOf: number[] = [];
      const seedsOf: number[] = [];
      for (let c = 0; c < centres.length; c++) {
        firstOf.push(variants.length);
        const inShape = sizes.filter((_, j) => of[j] === c);
        const { height, crownRadius, crownBase } = centres[c];
        const trunkShare = median(inShape.map((z) => z.trunkRadius / z.height)) || sp.trunkRadius / sp.height;
        // (Its stand: its trees' on the whole, its open side along +x. An open tree's is the open ground's, so
        // it grows as it always has.)
        const st = stOf.filter((_, j) => of[j] === c);
        const mean = (f: (x: Stand) => number) => st.reduce((sum, x) => sum + f(x), 0) / Math.max(1, st.length);
        const stand: Stand = standing === "open" ? { ...OPEN_STAND } : { enclosure: mean((x) => x.enclosure), lopsided: mean((x) => x.lopsided), openX: 1, openZ: 0, canopy: mean((x) => x.canopy), gap: mean((x) => x.gap) };
        // (No more seeds than trees of this shape: a second variant nothing is fitted to is grown for nothing.)
        const varied = formsVary(sp);
        // (And a seed more only for every `SEED_TREES` of its trees (`FORM_TREES`, of a species whose forms vary): a
        // shape of a few trees is one or two trees. The forms are spread over the shapes too, `spreadSeed`.)
        const seeds = Math.max(1, Math.min(varied ? Math.max(options.seeds, FORM_SEEDS) : options.seeds, Math.ceil(inShape.length / (varied ? FORM_TREES : SEED_TREES))));
        for (let k = 0; k < seeds; k++) {
          // (An open tree's seed as it always was; an edge or interior tree's its own; another set's mixed.)
          const base = (s * 7919 + (c + 16 * which) * 104729 + k * 1299709 + 17 + Math.imul(Math.round(options.seed ?? 0), 0x2545f491)) >>> 0;
          variants.push({
            species: s,
            size: { height, crownRadius, crownBase, trunkRadius: trunkShare * height },
            seed: varied ? spreadSeed(base, k, seeds, c, centres.length) : base,
            trees: 0,
            standing,
            stand,
            ...(pruning ? { pruning } : {}),
          });
        }
        seedsOf.push(seeds);
      }
      inClass.forEach((i, j) => {
        const o = i * TREE_STRIDE;
        const x = packed[o];
        const z = packed[o + 2];
        const seed = Number.isFinite(packed[o + 9]) ? packed[o + 9] >>> 0 : seedOfPlace(x, z);
        const v = firstOf[of[j]] + Math.floor(hash01(seed, 1) * seedsOf[of[j]]);
        variants[v].trees++;
        const st = stOf[j];
        const mirror = options.mirror && hash01(seed, 7) < 0.5 ? -1 : 1;
        let yaw = Number.isFinite(packed[o + 8]) ? packed[o + 8] : hash01(seed, 2) * Math.PI * 2;
        let leanA = hash01(seed, 3) * Math.PI * 2;
        let leanR = leanMax * Math.sqrt(hash01(seed, 4));
        if (standing !== "open") {
          // Its variant's open side (+x, or -x mirrored) turned to face its own open side, give or take a
          // little: a wood's edge is not ruled straight. Its own yaw, if the host gave one, is not kept.
          yaw = Math.atan2(-st.openZ, st.openX) + (hash01(seed, 10) - 0.5) * 0.6 + (mirror < 0 ? Math.PI : 0);
          // And it leans out over the open ground, towards the light, more the more lopsided it stands. (The
          // lean is in the tree's own frame, before it is turned.)
          const c = Math.cos(yaw);
          const sn = Math.sin(yaw);
          leanA = Math.atan2(st.openZ * c + st.openX * sn, st.openX * c - st.openZ * sn);
          leanR = leanMax * Math.min(1, 0.35 + st.lopsided) * (0.7 + 0.3 * hash01(seed, 4));
        }
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
          mirror,
          tint: [ratio[0] * tone * (1 + warm), ratio[1] * tone, ratio[2] * tone * (1 - warm)],
          own: hash01(seed, 8),
          stand: st,
          standing,
        };
      });
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
