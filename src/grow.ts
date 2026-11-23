// Growing a tree: a species says how its kind is built, a size says how big
// this one is, and a seed says which one of its kind it is. Out come its
// branches (a skeleton of nodes) and its leaves (clumps hung on the twigs).
//
// Two ways of building, by the species' architecture:
//
// - broadleaf and shrub: space colonization (Runions, Lane and Prusinkiewicz
//   2007). Points are scattered through the crown where leaves will be;
//   branches grow towards the nearest of them and use each up as they reach
//   it. The branches end where the leaves are, so every clump hangs on wood.
//   (The generator this replaces scattered leaves on a crown's shell with no
//   wood under them, and most of them floated.) Each stem rises bare to the
//   crown's base and divides there into its leader and its great limbs, more
//   of them the less the leader keeps the lead.
// - conifer: a leader to the top, with whorls of boughs along it, each as long
//   as the crown is wide where it hangs, and side shoots along each bough. A
//   conifer has one leader: its row's stems are not read.
//
// Then the same for all: clumps that crowd each other are thinned, the tree is
// fitted to its size (a survey measured it, and a ball meets it there), and the
// radii come from the pipe model: a branch carries the wood of all it bears.
//
// Plain Math and no three, so growing runs anywhere: in a worker, in node.

import { type CrownShape, type TreeSpecies } from "./species.ts";
import { crownProfile, type Clumps, type GrownTree, type Skeleton, type TreeSize } from "./tree.ts";
import { Random } from "./random.ts";

const DEG = Math.PI / 180;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Space colonization's distances, as shares of the crown's size (the cube root
// of radius² × depth). Tied to the crown and not to metres, a big tree and a
// small one of a kind grow alike, with about as many nodes.
/** A point is used up when wood comes this near it. */
const KILL = 0.08;
/** How far a tip grows in a step, as a share of the kill distance. */
const STEP = 0.5;
/** How far a tip feels points from, in kill distances. */
const INFLUENCE = 5;
/** Crown volume per point at branchiness 1, in kill distances cubed. */
const ATTRACTOR_VOLUME = 1.6;
const MIN_ATTRACTORS = 80;
const MAX_ATTRACTORS = 1600;
/** Under the 4000 nodes a host can count on, with room for a conifer's last bough. */
const MAX_NODES = 3900;
const MAX_STEPS = 300;
// How a tip turns as it grows: towards the points it feels (weight 1), on the
// way it was going, up or down by the species' bend, up again on the leader,
// and a little at random by how crooked the species is.
const PERSIST = 0.6;
const BEND_PULL = 0.35;
const LEADER_PULL = 0.8;
const CROOK_PULL = 0.3;
/** How far a new side branch turns towards its species' branch angle (0 not at all, 1 all the way). */
const LATERAL_PULL = 0.6;
/** A new shoot closer than this (cosine) to one already there is the same shoot: it is not grown twice. */
const SAME_SHOOT = 0.92;
/** How many shoots one node puts out, at most (a trunk's fork is laid out apart). */
const MAX_KIDS = 3;
/** The great limbs a trunk divides into when no leader keeps on (leader 0), shared among its stems. */
const LIMBS = 4;
/** The length of a piece of trunk below the crown (m). */
const TRUNK_STEP = 0.8;
/** The thinnest shell of points, as a share of the way in, whatever the foliage depth. */
const MIN_SHELL = 0.12;
/** Directions the crown's reach is tabled for, to scatter its points by volume. */
const DIRECTIONS = 512;
/** Points set at the crown's base and at its top, as a share of the rest (each), in a slab this deep (share of the crown). */
const END_POINTS = 0.02;
const END_SLAB = 0.06;

// Conifers.
/** How far a bough bends over its length at bend ±1 ... */
const BOUGH_CURVE = 50 * DEG;
/** ... and further for a long one, as its weight tells (per crown radius of length). */
const BOUGH_WEIGHT = 40 * DEG;
/** How far the top boughs turn up when the leader gives up the lead (leader 0): a pine's flat top. */
const TOP_TURN = 25 * DEG;
/** How far short of the top a leader stops when it does not keep the lead (leader 0), as a share of the crown's depth. */
const LEADER_SHORT = 0.3;
/** The length of a piece of bough, as a share of the crown's radius. */
const BOUGH_STEP = 0.12;
const MAX_BOUGH_STEPS = 8;
/** A side shoot's length, as a share of its bough's, at the bough's foot (shorter towards its tip). */
const SHOOT_LENGTH = 0.45;
/** The angle a side shoot leaves its bough at. */
const SHOOT_ANGLE = 55 * DEG;

// Clumps.
/** How far past a twig's end its clump's centre sits, in the clump's radii. */
const HANG = 0.3;
/** How far a clump is lifted out of the crown from its twig, in its radii. */
const HANG_OUT = 0.2;
/** Wood bearing this many twig ends or fewer is a twig, and leaves may hang along it. */
const TWIG_TIPS = 3;
/** How close two clumps may be, as a share of their radii summed, in a solid crown and in an open one. */
const THIN = 0.6;
const THIN_OPEN = 0.4;
/** Past this many clumps, the crown is thinned again, wider. */
const MAX_CLUMPS = 240;
/** How far one clump's size strays from the species' (as shares of it), at the most. */
const CLUMP_MIN = 0.55;
const CLUMP_MAX = 1.6;

// Fitting to size.
/** How far the outermost clump reaches, as a share of the crown radius. */
const FIT_REACH = 0.985;
/** How high the highest leaf or twig is, as a share of the height. */
const FIT_TOP = 0.995;

// Radii.
/** The pipe model's exponent (da Vinci's rule is 2; measured trees give 2.2 to 2.5). */
const PIPE = 2.3;
/** How much thicker wood is a metre further down a branch that does not divide. */
const TAPER = 0.015;

/** Where a trunk's radius is measured (m): breast height. */
export const BREAST_HEIGHT = 1.3;

/**
 * Where this tree's trunk radius is measured: breast height, or a tenth of its height if it is under 13 m.
 * A shrub's stems are measured near their foot, below where they divide: at breast height a shrub is all
 * twigs.
 */
export function breastHeight(size: TreeSize): number {
  return Math.min(BREAST_HEIGHT, 0.1 * size.height);
}

/** A branch's angle from its parent (radians): the species', varied by its spread, within two spreads. */
function branchAngle(sp: TreeSpecies, rng: Random): number {
  const g = Math.max(-2, Math.min(2, rng.gauss()));
  return Math.max(5 * DEG, Math.min(175 * DEG, (sp.branchAngle + sp.branchAngleSpread * g) * DEG));
}

/** Grow one tree of a species to a size. The same arguments give the same tree. */
export function growTree(species: TreeSpecies, size: TreeSize, seed: number): GrownTree {
  const sz = soundSize(size);
  const rng = new Random(seed);
  const wood = newWood();
  // The species' clump, scaled by the tree's height against the species' own (a younger tree's twigs
  // are smaller, but less so than the tree).
  const clumpR = 0.5 * species.clumpSize * Math.sqrt(sz.height / species.height);
  let hung: Hung;
  switch (species.architecture) {
    case "conifer":
      hung = whorled(species, sz, rng.fork(), wood, clumpR);
      break;
    case "broadleaf":
    case "shrub":
      hung = colonize(species, sz, rng.fork(), wood, clumpR);
      break;
  }
  return finish(species, sz, wood, hung);
}

/** A size growing can use: positive, with its crown's base under its top. */
function soundSize(s: TreeSize): TreeSize {
  const height = Math.max(0.1, s.height);
  const crownRadius = Math.max(0.05, s.crownRadius);
  const crownBase = Math.min(Math.max(0, s.crownBase), 0.95 * height);
  const trunkRadius = Math.max(0.001, s.trunkRadius);
  return { height, crownRadius, crownBase, trunkRadius };
}

// ---------------------------------------------------------------------------
// The wood as it grows: plain arrays, a node's parent always before it.

interface Wood {
  x: number[];
  y: number[];
  z: number[];
  parent: number[];
  /** Which stem a node is on (0, 1, ...). */
  stem: number[];
  /** Whether a node goes on its parent's axis (the leader's next node, a bough's), or starts a new one. */
  cont: boolean[];
  kids: number[][];
  stems: number;
}

function newWood(): Wood {
  return { x: [], y: [], z: [], parent: [], stem: [], cont: [], kids: [], stems: 0 };
}

function addNode(w: Wood, x: number, y: number, z: number, parent: number, cont: boolean): number {
  const i = w.x.length;
  w.x.push(x);
  w.y.push(y);
  w.z.push(z);
  w.parent.push(parent);
  w.stem.push(parent < 0 ? w.stems++ : w.stem[parent]);
  w.cont.push(parent >= 0 && cont);
  w.kids.push([]);
  if (parent >= 0) w.kids[parent].push(i);
  return i;
}

/** Clumps hung but not yet thinned: the node each hangs on, its centre and radius. */
interface Hung {
  node: number[];
  x: number[];
  y: number[];
  z: number[];
  r: number[];
}

function newHung(): Hung {
  return { node: [], x: [], y: [], z: [], r: [] };
}

function hang(h: Hung, node: number, x: number, y: number, z: number, r: number): void {
  h.node.push(node);
  h.x.push(x);
  h.y.push(y);
  h.z.push(z);
  h.r.push(r);
}

/** One clump's radius: the species' mean, varied by its clump spread. */
function clumpRadius(sp: TreeSpecies, mean: number, rng: Random): number {
  const k = 1 + 0.5 * sp.clumpSpread * rng.gauss();
  return mean * Math.min(CLUMP_MAX, Math.max(CLUMP_MIN, k));
}

// ---------------------------------------------------------------------------
// The crown's envelope: the solid of revolution its profile sweeps, from its
// base to its top. Every profile is concave in height, so the solid is convex:
// a ray from inside leaves it once, which is what lets its reach be bisected.

class Envelope {
  private readonly shape: CrownShape;
  private readonly base: number;
  private readonly depth: number;
  private readonly radius: number;
  private readonly side: number;
  /** Its lowest and highest points, inside any margins. */
  readonly lo: number;
  readonly hi: number;
  /** The height of its centroid, on the axis: where the crown's heart is. */
  readonly cy: number;
  /** Its volume (m³). */
  readonly volume: number;

  /**
   * The crown's envelope, shrunk by margins (m) at its side, bottom and top: the space a clump's centre
   * may take and keep the clump inside.
   */
  constructor(shape: CrownShape, size: TreeSize, side = 0, bottom = 0, top = 0) {
    this.shape = shape;
    this.base = size.crownBase;
    this.depth = Math.max(0.01, size.height - size.crownBase);
    this.radius = size.crownRadius;
    this.side = side;
    this.lo = size.crownBase + Math.min(bottom, 0.4 * this.depth);
    this.hi = Math.max(this.lo + 0.01, size.height - Math.min(top, 0.4 * this.depth));
    // Slices for the volume and the centroid.
    let v = 0;
    let vy = 0;
    const n = 64;
    for (let i = 0; i < n; i++) {
      const y = this.lo + ((i + 0.5) / n) * (this.hi - this.lo);
      const w = Math.max(0, this.width(y));
      v += w * w;
      vy += w * w * y;
    }
    this.volume = (Math.PI * v * (this.hi - this.lo)) / n;
    this.cy = v > 0 ? vy / v : 0.5 * (this.lo + this.hi);
  }

  /** How far it reaches from the axis at a height (m); below 0 where it does not reach at all. */
  width(y: number): number {
    if (y < this.lo || y > this.hi) return -1;
    return crownProfile(this.shape, (y - this.base) / this.depth) * this.radius - this.side;
  }

  inside(x: number, y: number, z: number): boolean {
    const w = this.width(y);
    return w >= 0 && x * x + z * z <= w * w;
  }

  /** How far it is from its heart (0, cy, 0) to its surface, along a unit direction. */
  reach(dx: number, dy: number, dz: number): number {
    let lo = 0;
    let hi = Math.hypot(this.radius, this.hi - this.lo) + 1;
    for (let i = 0; i < 24; i++) {
      const m = 0.5 * (lo + hi);
      if (this.inside(dx * m, this.cy + dy * m, dz * m)) lo = m;
      else hi = m;
    }
    return lo;
  }

  /** The outward normal of its surface at a point on it (or near it): side, top or bottom, whichever is nearest. */
  normal(x: number, y: number, z: number): [number, number, number] {
    const yc = Math.min(this.hi, Math.max(this.lo, y));
    const d = Math.hypot(x, z);
    const sideGap = Math.abs(this.width(yc) - d);
    const topGap = Math.abs(this.hi - y);
    const bottomGap = Math.abs(y - this.lo);
    if (topGap <= sideGap && topGap <= bottomGap) return [0, 1, 0];
    if (bottomGap <= sideGap) return [0, -1, 0];
    const h = 0.01 * (this.hi - this.lo);
    const slope = (this.width(Math.min(this.hi, yc + h)) - this.width(Math.max(this.lo, yc - h))) / (2 * h);
    const ux = d > 1e-9 ? x / d : 1;
    const uz = d > 1e-9 ? z / d : 0;
    const k = 1 / Math.hypot(1, slope);
    return [ux * k, -slope * k, uz * k];
  }

  /**
   * How deep a sphere sits in it, 0 (touching its surface) to 1 (at its heart), and which way it faces out:
   * the surface's normal near it, turned halfway to the way out from the heart.
   */
  place(x: number, y: number, z: number, r: number): { depth: number; n: [number, number, number] } {
    const dy = y - this.cy;
    const dist = Math.hypot(x, dy, z);
    let ux = 0;
    let uy = 1;
    let uz = 0;
    if (dist > 1e-9) {
      ux = x / dist;
      uy = dy / dist;
      uz = z / dist;
    }
    const L = this.reach(ux, uy, uz);
    const depth = L > 0 ? Math.min(1, Math.max(0, 1 - (dist + r) / L)) : 0;
    const s = this.normal(ux * L, this.cy + uy * L, uz * L);
    const nx = s[0] + ux;
    const ny = s[1] + uy;
    const nz = s[2] + uz;
    const k = Math.hypot(nx, ny, nz);
    return { depth, n: k > 1e-9 ? [nx / k, ny / k, nz / k] : [0, 1, 0] };
  }
}

/**
 * Points scattered through a shell of the envelope, uniform by volume, with no retries: a direction from
 * the heart is drawn by the volume of crown that lies along it (reach cubed, from a table), then a depth
 * along it by the volume at each depth (the cube root of a uniform draw).
 */
function scatter(env: Envelope, n: number, shell: number, rng: Random): Float64Array {
  const dirs = new Float64Array(DIRECTIONS * 3);
  const cdf = new Float64Array(DIRECTIONS);
  let total = 0;
  for (let k = 0; k < DIRECTIONS; k++) {
    const [dx, dy, dz] = rng.onSphere();
    dirs[3 * k] = dx;
    dirs[3 * k + 1] = dy;
    dirs[3 * k + 2] = dz;
    const L = env.reach(dx, dy, dz);
    total += L * L * L;
    cdf[k] = total;
  }
  const a = (1 - shell) ** 3;
  const out = new Float64Array(n * 3);
  // A drawn direction is nudged off the table's by about the gap between its directions.
  const nudge = 2 / Math.sqrt(DIRECTIONS);
  for (let i = 0; i < n; i++) {
    const want = rng.next() * total;
    let lo = 0;
    let hi = DIRECTIONS - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (cdf[m] < want) lo = m + 1;
      else hi = m;
    }
    const j = rng.onSphere();
    let dx = dirs[3 * lo] + nudge * j[0];
    let dy = dirs[3 * lo + 1] + nudge * j[1];
    let dz = dirs[3 * lo + 2] + nudge * j[2];
    const k = 1 / Math.hypot(dx, dy, dz);
    dx *= k;
    dy *= k;
    dz *= k;
    const L = env.reach(dx, dy, dz);
    const u = Math.cbrt(a + (1 - a) * rng.next());
    out[3 * i] = dx * L * u;
    out[3 * i + 1] = env.cy + dy * L * u;
    out[3 * i + 2] = dz * L * u;
  }
  return out;
}

/** Points uniform in a slab of the envelope, between two heights; on its axis where it has no width. */
function scatterSlab(env: Envelope, y0: number, y1: number, n: number, rng: Random): Float64Array {
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const y = rng.range(y0, y1);
    const w = Math.max(0, env.width(y));
    const [dx, dz] = rng.inDisc();
    out[3 * i] = dx * w;
    out[3 * i + 1] = y;
    out[3 * i + 2] = dz * w;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Small vector helpers, on [x, y, z] tuples.

type V3 = [number, number, number];

function norm(v: V3): V3 {
  const k = Math.hypot(v[0], v[1], v[2]);
  return k > 1e-12 ? [v[0] / k, v[1] / k, v[2] / k] : [0, 1, 0];
}

/** Some unit vector square to a unit vector. */
function perpendicular(a: V3): V3 {
  const b: V3 = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return norm([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
}

/** A direction at an angle from an axis, turned round it by an azimuth (both radians). */
function cone(axis: V3, angle: number, azimuth: number): V3 {
  const p = perpendicular(axis);
  const q: V3 = [axis[1] * p[2] - axis[2] * p[1], axis[2] * p[0] - axis[0] * p[2], axis[0] * p[1] - axis[1] * p[0]];
  const c = Math.cos(azimuth);
  const s = Math.sin(azimuth);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return norm([
    axis[0] * ca + (p[0] * c + q[0] * s) * sa,
    axis[1] * ca + (p[1] * c + q[1] * s) * sa,
    axis[2] * ca + (p[2] * c + q[2] * s) * sa,
  ]);
}

/** A direction turned, in the plane it makes with an axis, part of the way to an angle from that axis. */
function towardAngle(d: V3, axis: V3, angle: number, part: number): V3 {
  const c = Math.min(1, Math.max(-1, d[0] * axis[0] + d[1] * axis[1] + d[2] * axis[2]));
  let p: V3 = [d[0] - axis[0] * c, d[1] - axis[1] * c, d[2] - axis[2] * c];
  p = Math.hypot(p[0], p[1], p[2]) > 1e-6 ? norm(p) : perpendicular(axis);
  const now = Math.acos(c);
  const to = now + (angle - now) * part;
  const ct = Math.cos(to);
  const st = Math.sin(to);
  return [axis[0] * ct + p[0] * st, axis[1] * ct + p[1] * st, axis[2] * ct + p[2] * st];
}

// ---------------------------------------------------------------------------
// Broadleaves and shrubs: space colonization.

function colonize(sp: TreeSpecies, size: TreeSize, rng: Random, w: Wood, clumpR: number): Hung {
  const { height: H, crownRadius: R, crownBase: base } = size;
  const depth = Math.max(0.01, H - base);
  const crown = Math.cbrt(R * R * depth);
  const dk = KILL * crown;
  const D = STEP * dk;
  const di = INFLUENCE * dk;
  const dk2 = dk * dk;
  const di2 = di * di;

  // The points: where a clump's centre may be, in the shell the species keeps its leaves in.
  const inner = new Envelope(sp.shape, size, clumpR, clumpR, clumpR);
  const shell = Math.max(MIN_SHELL, Math.min(1, sp.foliageDepth));
  const shellVolume = inner.volume * (1 - (1 - shell) ** 3);
  let n = Math.round(Math.min(MAX_ATTRACTORS, Math.max(MIN_ATTRACTORS, (sp.branchiness * shellVolume) / (dk * dk * dk * ATTRACTOR_VOLUME))));
  // And a few at the crown's base and its top, whatever its shape: a survey measured the lowest leaves
  // and the highest, so some wood goes to each, even where a pointed crown has little room.
  const ends = Math.max(4, Math.round(END_POINTS * n));
  const att = new Float64Array((n + 2 * ends) * 3);
  att.set(scatter(inner, n, shell, rng));
  att.set(scatterSlab(inner, inner.lo, inner.lo + END_SLAB * (inner.hi - inner.lo), ends, rng), n * 3);
  att.set(scatterSlab(inner, inner.hi - END_SLAB * (inner.hi - inner.lo), inner.hi, ends, rng), (n + ends) * 3);
  n += 2 * ends;
  const alive = new Uint8Array(n).fill(1);
  const near = new Int32Array(n).fill(-1);
  const nearD2 = new Float64Array(n).fill(Infinity);

  // A grid of the points, a cell the size of the influence distance, so a new node looks at its
  // neighbours only.
  const ox = -R - di;
  const oz = -R - di;
  const nx = Math.max(1, Math.ceil((2 * (R + di)) / di));
  const ny = Math.max(1, Math.ceil((H + di) / di));
  const nz = nx;
  const cellOf = (x: number, y: number, z: number) => {
    const ix = Math.min(nx - 1, Math.max(0, Math.floor((x - ox) / di)));
    const iy = Math.min(ny - 1, Math.max(0, Math.floor(y / di)));
    const iz = Math.min(nz - 1, Math.max(0, Math.floor((z - oz) / di)));
    return ix + nx * (iy + ny * iz);
  };
  const start = new Int32Array(nx * ny * nz + 1);
  for (let a = 0; a < n; a++) start[cellOf(att[3 * a], att[3 * a + 1], att[3 * a + 2]) + 1]++;
  for (let c = 0; c < nx * ny * nz; c++) start[c + 1] += start[c];
  const items = new Int32Array(n);
  const fill = start.slice(0, nx * ny * nz);
  for (let a = 0; a < n; a++) items[fill[cellOf(att[3 * a], att[3 * a + 1], att[3 * a + 2])]++] = a;

  // Each node's lot in the growing: whether it may still put out shoots, how many steps it may grow on
  // feeling nothing (a limb crossing the bare inside of the crown to its leaves), whether it is on the
  // leader, and what it felt this step.
  const growable: boolean[] = [];
  const seekLeft: number[] = [];
  const leader: boolean[] = [];
  const acc = new Float64Array((MAX_NODES + 64) * 3);
  const accN = new Int32Array(MAX_NODES + 64);

  /** A node is grown: the points it is now nearest to are its, and those it is on are used up. */
  const register = (i: number) => {
    const x = w.x[i];
    const y = w.y[i];
    const z = w.z[i];
    const ix0 = Math.max(0, Math.floor((x - di - ox) / di));
    const ix1 = Math.min(nx - 1, Math.floor((x + di - ox) / di));
    const iy0 = Math.max(0, Math.floor((y - di) / di));
    const iy1 = Math.min(ny - 1, Math.floor((y + di) / di));
    const iz0 = Math.max(0, Math.floor((z - di - oz) / di));
    const iz1 = Math.min(nz - 1, Math.floor((z + di - oz) / di));
    for (let iz = iz0; iz <= iz1; iz++)
      for (let iy = iy0; iy <= iy1; iy++)
        for (let ix = ix0; ix <= ix1; ix++) {
          const c = ix + nx * (iy + ny * iz);
          for (let k = start[c]; k < start[c + 1]; k++) {
            const a = items[k];
            if (!alive[a]) continue;
            const ex = att[3 * a] - x;
            const ey = att[3 * a + 1] - y;
            const ez = att[3 * a + 2] - z;
            const d2 = ex * ex + ey * ey + ez * ez;
            if (d2 < dk2) alive[a] = 0;
            else if (d2 < di2 && d2 < nearD2[a]) {
              nearD2[a] = d2;
              near[a] = i;
            }
          }
        }
  };

  const grow = (x: number, y: number, z: number, parent: number, cont: boolean, canGrow: boolean, seek: number, lead: boolean) => {
    const i = addNode(w, x, y, z, parent, cont);
    growable.push(canGrow);
    seekLeft.push(seek);
    leader.push(lead);
    if (canGrow) register(i);
    return i;
  };

  // The stems: one for a tree; for a shrub or a stool, several from feet spread within a third of the
  // crown, leaning out from it.
  const stems = Math.max(1, Math.round(sp.stems));
  const spread = stems > 1 ? R / 3 : 0;
  const forkY = Math.max(base, D);
  const maxSeek = Math.ceil((depth + R) / D);
  const limbs = Math.round(((1 - sp.leader) * LIMBS) / stems);
  const turn = rng.range(0, 2 * Math.PI);
  for (let s = 0; s < stems; s++) {
    const az = turn + s * GOLDEN_ANGLE + rng.range(-0.3, 0.3);
    const rr = spread * Math.sqrt((s + 0.5) / stems);
    // A stem leans out by half the branch angle, but not so far that it reaches its crown outside the
    // middle half of it.
    const lean = stems > 1 ? Math.min(0.5 * sp.branchAngle * DEG, Math.atan(Math.max(0, 0.5 * R - rr) / forkY)) : 0;
    const fx = rr * Math.cos(az);
    const fz = rr * Math.sin(az);
    const stemDir: V3 = norm([Math.sin(lean) * Math.cos(az), Math.cos(lean), Math.sin(lean) * Math.sin(az)]);
    // The trunk, to the crown: straight but for its wander, which is pulled back to the stem's line.
    let i = grow(fx, 0, fz, -1, false, false, 0, false);
    const steps = Math.max(1, Math.ceil(forkY / TRUNK_STEP));
    const rise = forkY / steps;
    let wx = 0;
    let wz = 0;
    let dir = stemDir;
    for (let k = 0; k < steps; k++) {
      const j = rng.onSphere();
      wx = 0.6 * wx + 0.08 * sp.crooked * j[0];
      wz = 0.6 * wz + 0.08 * sp.crooked * j[2];
      dir = norm([stemDir[0] + wx, stemDir[1], stemDir[2] + wz]);
      const len = rise / dir[1];
      i = grow(w.x[i] + dir[0] * len, w.y[i] + dir[1] * len, w.z[i] + dir[2] * len, i, true, false, 0, false);
    }
    // The fork: the stem goes on as the leader, and the great limbs leave it, round it by the golden
    // angle, at the species' branch angle.
    const f = i;
    grow(w.x[f] + dir[0] * D, w.y[f] + dir[1] * D, w.z[f] + dir[2] * D, f, true, true, maxSeek, true);
    for (let k = 0; k < limbs; k++) {
      const d = cone(dir, branchAngle(sp, rng), az + (2 * Math.PI * k) / limbs + rng.range(-0.4, 0.4));
      grow(w.x[f] + d[0] * D, w.y[f] + d[1] * D, w.z[f] + d[2] * D, f, false, true, maxSeek, false);
    }
  }

  // Grow, a step at a time, until no tip feels a point or the wood is all it may be.
  const growing: number[] = [];
  for (let step = 0; step < MAX_STEPS && w.x.length < MAX_NODES; step++) {
    for (let a = 0; a < n; a++) {
      const i = near[a];
      if (!alive[a] || i < 0) continue;
      const ex = att[3 * a] - w.x[i];
      const ey = att[3 * a + 1] - w.y[i];
      const ez = att[3 * a + 2] - w.z[i];
      const k = 1 / Math.sqrt(ex * ex + ey * ey + ez * ez);
      acc[3 * i] += ex * k;
      acc[3 * i + 1] += ey * k;
      acc[3 * i + 2] += ez * k;
      accN[i]++;
    }
    growing.length = 0;
    const count = w.x.length;
    for (let i = 0; i < count; i++) {
      if (!growable[i]) continue;
      if (accN[i] > 0 || (seekLeft[i] > 0 && w.kids[i].length === 0)) growing.push(i);
    }
    if (growing.length === 0) break;
    let grew = 0;
    for (const i of growing) {
      if (w.x.length >= MAX_NODES) break;
      const kids = w.kids[i];
      const felt = accN[i] > 0;
      const p = w.parent[i];
      const axis = norm([w.x[i] - w.x[p], w.y[i] - w.y[p], w.z[i] - w.z[p]]);
      // A tip that feels nothing yet goes on: a limb crossing to the crown, the leader to its top. It
      // stops on leaving the crown's bounds.
      if (!felt && (w.y[i] > H || Math.hypot(w.x[i], w.z[i]) > R)) continue;
      let d: V3 = felt ? norm([acc[3 * i], acc[3 * i + 1], acc[3 * i + 2]]) : axis;
      const lateral = kids.length > 0;
      if (lateral) {
        if (kids.length >= MAX_KIDS) continue;
        d = towardAngle(d, axis, branchAngle(sp, rng), LATERAL_PULL);
      } else {
        d = [d[0] + axis[0] * PERSIST, d[1] + axis[1] * PERSIST, d[2] + axis[2] * PERSIST];
      }
      const j = rng.onSphere();
      const lift = sp.bend * BEND_PULL + (leader[i] && !lateral ? sp.leader * LEADER_PULL : 0);
      d = norm([d[0] + j[0] * sp.crooked * CROOK_PULL, d[1] + lift + j[1] * sp.crooked * CROOK_PULL, d[2] + j[2] * sp.crooked * CROOK_PULL]);
      let same = false;
      for (const c of kids) {
        const kd = norm([w.x[c] - w.x[i], w.y[c] - w.y[i], w.z[c] - w.z[i]]);
        if (kd[0] * d[0] + kd[1] * d[1] + kd[2] * d[2] > SAME_SHOOT) same = true;
      }
      if (same) continue;
      grow(w.x[i] + d[0] * D, w.y[i] + d[1] * D, w.z[i] + d[2] * D, i, !lateral, true, felt ? 0 : seekLeft[i] - 1, leader[i] && !lateral);
      grew++;
    }
    for (const i of growing) {
      acc[3 * i] = acc[3 * i + 1] = acc[3 * i + 2] = 0;
      accN[i] = 0;
    }
    if (grew === 0) break;
  }

  // Clumps on the twigs: at every twig's end, a little past it and out of the crown, and along the
  // twigs (wood that bears few tips) where they are in the shell the species keeps its leaves in.
  const tips = new Int32Array(w.x.length);
  for (let i = w.x.length - 1; i >= 0; i--) {
    if (w.kids[i].length === 0) tips[i] = 1;
    if (w.parent[i] >= 0) tips[w.parent[i]] += tips[i];
  }
  const h = newHung();
  const heart = inner.cy;
  const env = new Envelope(sp.shape, size);
  for (let i = 0; i < w.x.length; i++) {
    if (!growable[i]) continue;
    const end = w.kids[i].length === 0;
    if (!end && (tips[i] > TWIG_TIPS || env.place(w.x[i], w.y[i], w.z[i], 0).depth > shell)) continue;
    const p = w.parent[i];
    const t = end ? norm([w.x[i] - w.x[p], w.y[i] - w.y[p], w.z[i] - w.z[p]]) : ([0, 0, 0] as V3);
    const o = norm([w.x[i], w.y[i] - heart, w.z[i]]);
    const r = clumpRadius(sp, clumpR, rng);
    hang(
      h,
      i,
      w.x[i] + (t[0] * HANG + o[0] * HANG_OUT) * r,
      w.y[i] + (t[1] * HANG + o[1] * HANG_OUT) * r,
      w.z[i] + (t[2] * HANG + o[2] * HANG_OUT) * r,
      r,
    );
  }
  return h;
}

// ---------------------------------------------------------------------------
// Conifers: a leader, and whorls of boughs.

/** A bough's line, of unit length: from the horizontal at `rise`, bending by `curve` along it, in n pieces. */
function boughLine(rise: number, curve: number, n: number): { h: number[]; v: number[] } {
  const h = [0];
  const v = [0];
  for (let k = 0; k < n; k++) {
    const e = rise + (curve * (k + 0.5)) / n;
    h.push(h[k] + Math.cos(e) / n);
    v.push(v[k] + Math.sin(e) / n);
  }
  return { h, v };
}

function whorled(sp: TreeSpecies, size: TreeSize, rng: Random, w: Wood, clumpR: number): Hung {
  const { height: H, crownRadius: R, crownBase: base } = size;
  const depth = Math.max(0.01, H - base);
  const profileAt = (y: number) => crownProfile(sp.shape, (y - base) / depth) * R;
  const spacing = 1 / Math.max(0.05, sp.whorlsPerMetre);
  const top = H - 1.1 * clumpR;
  const segLen = Math.max(0.05, BOUGH_STEP * R);
  const h = newHung();
  const shell = Math.max(MIN_SHELL, Math.min(1, sp.foliageDepth));
  /** How far a bough's tip may reach from the axis at a height, its clump inside the crown. */
  const reachAt = (y: number) => Math.max(0.15 * clumpR, profileAt(Math.min(H, Math.max(base, y))) - 0.9 * clumpR);

  /**
   * A bough's shape at a height: how it rises and bends, and the longest it can be with every node of it
   * in the crown, with room for a clump, and its tip under the crown's top. (Found by halving: the crown is
   * narrower where a rising bough's tip goes, and wider where a drooping one's does.)
   */
  const plan = (y: number, angle: number) => {
    const t = Math.min(1, Math.max(0, (y - base) / depth));
    const rise = 90 * DEG - angle + (1 - sp.leader) * t * TOP_TURN;
    const room = Math.max(0.05, top - y);
    const full = reachAt(y);
    const curve = sp.bend * (BOUGH_CURVE + (BOUGH_WEIGHT * full) / R);
    const n = Math.min(MAX_BOUGH_STEPS, Math.max(2, Math.round(full / segLen)));
    const line = boughLine(rise, curve, n);
    const fits = (len: number) => {
      if (line.v[n] * len > room) return false;
      for (let k = 1; k <= n; k++) if (line.h[k] * len > reachAt(y + line.v[k] * len)) return false;
      return true;
    };
    let lo = 0;
    let hi = 3 * R + room;
    for (let i = 0; i < 30; i++) {
      const m = 0.5 * (lo + hi);
      if (fits(m)) lo = m;
      else hi = m;
    }
    return { line, n, len: lo };
  };

  // The lowest whorl is set so its boughs' leaves hang at the crown's base: above it when they droop,
  // below it when they rise (a pine's lowest live boughs leave the trunk under its crown and turn up into it).
  const low = plan(base, sp.branchAngle * DEG);
  const lowLeaf = Math.min(low.n, Math.max(1, Math.ceil(low.n * (1 - shell))));
  const y0 = Math.max(0.5 * base, base + clumpR - Math.min(low.line.v[lowLeaf], low.line.v[low.n]) * low.len);

  // The leader's heights: the bare trunk in pieces, then a node at every whorl, then its top.
  const levels: { y: number; whorl: boolean }[] = [];
  const trunkSteps = Math.max(1, Math.ceil(y0 / TRUNK_STEP));
  for (let k = 1; k < trunkSteps; k++) levels.push({ y: (y0 * k) / trunkSteps, whorl: false });
  // A leader that gives up the lead stops short of the top, and its last boughs, turned up, make the
  // crown's top round or flat: an old pine's.
  const lead = Math.max(y0 + spacing, top - (1 - sp.leader) * LEADER_SHORT * depth);
  for (let y = y0; y < lead - 0.5 * spacing; y += spacing) {
    const yy = Math.min(lead - 0.25 * spacing, y + 0.15 * spacing * rng.range(-1, 1));
    const last = levels.length > 0 ? levels[levels.length - 1].y : 0;
    const fill = Math.floor((yy - last) / TRUNK_STEP);
    for (let k = 1; k <= fill; k++) levels.push({ y: last + ((yy - last) * k) / (fill + 1), whorl: false });
    levels.push({ y: yy, whorl: true });
  }
  levels.push({ y: Math.min(top, lead), whorl: false });

  let i = addNode(w, 0, 0, 0, -1, false);
  let wx = 0;
  let wz = 0;
  let turn = rng.range(0, 2 * Math.PI);
  for (const lv of levels) {
    const dy = lv.y - w.y[i];
    const j = rng.onSphere();
    wx = 0.85 * wx + 0.06 * sp.crooked * dy * j[0];
    wz = 0.85 * wz + 0.06 * sp.crooked * dy * j[2];
    i = addNode(w, wx, lv.y, wz, i, true);
    if (!lv.whorl) continue;
    turn += GOLDEN_ANGLE;
    const per = Math.max(1, Math.round(sp.whorl));
    for (let b = 0; b < per; b++) {
      // An open tree has lost boughs from its whorls.
      if (!rng.chance(sp.branchiness) || w.x.length >= MAX_NODES - 40) continue;
      const az = turn + (2 * Math.PI * b) / per + rng.range(-0.25, 0.25) * (2 * Math.PI) / per;
      const angle = branchAngle(sp, rng);
      const { line, n, len } = plan(lv.y, angle);
      // A bough whose leaves would hang below the crown's base is in the shade of those above: it has
      // died and fallen, as a forest tree's lower boughs do.
      const leafFrom = Math.min(n, Math.max(1, Math.ceil(n * (1 - shell))));
      if (lv.y + Math.min(line.v[leafFrom], line.v[n]) * len - 1.25 * clumpR < base - 0.25 * clumpR) continue;
      const ca = Math.cos(az);
      const sa = Math.sin(az);
      // Along the bough, a wander square to it, by how crooked the species is.
      let jitter = 0;
      let prev = i;
      const bough: number[] = [];
      for (let k = 1; k <= n; k++) {
        jitter += (0.15 * sp.crooked * len * rng.gauss()) / n;
        const hh = line.h[k] * len;
        const x = w.x[i] + hh * ca - jitter * sa;
        const z = w.z[i] + hh * sa + jitter * ca;
        prev = addNode(w, x, lv.y + line.v[k] * len, z, prev, k > 1);
        bough.push(prev);
      }
      // Side shoots, left and right, longest near the bough's foot, on the part of it that is in leaf (as
      // deep as the species keeps its leaves, and a little more); then the leaves, on that part of the
      // bough and at every shoot's end.
      const leafy = Math.max(0.15, 1 - shell - 0.15);
      for (let k = 1; k < n * 2; k++) {
        const f = Math.floor(k / 2) / n;
        const at = bough[Math.floor(k / 2) - 1];
        if (f < leafy || !rng.chance(Math.max(0.3, sp.branchiness))) continue;
        const nxt = bough[Math.floor(k / 2)];
        const bd = norm([w.x[nxt] - w.x[at], w.y[nxt] - w.y[at], w.z[nxt] - w.z[at]]);
        const side = k % 2 === 0 ? 1 : -1;
        const sideDir: V3 = norm([-bd[2] * side, 0, bd[0] * side]);
        const c = Math.cos(SHOOT_ANGLE);
        const s = Math.sin(SHOOT_ANGLE);
        const sd = norm([bd[0] * c + sideDir[0] * s, bd[1] * c + sp.bend * 0.3, bd[2] * c + sideDir[2] * s]);
        let sl = len * SHOOT_LENGTH * (1 - 0.6 * f);
        // Kept inside the crown, shortened if it would poke out.
        for (let tries = 0; tries < 4; tries++) {
          const tx = w.x[at] + sd[0] * sl;
          const ty = w.y[at] + sd[1] * sl;
          const tz = w.z[at] + sd[2] * sl;
          if (Math.hypot(tx, tz) <= profileAt(Math.max(base, ty)) - 0.5 * clumpR) break;
          sl *= 0.6;
        }
        const pieces = sl > 4 * segLen ? 2 : 1;
        let q = at;
        for (let m = 1; m <= pieces; m++) {
          const d = (sl * m) / pieces;
          q = addNode(w, w.x[at] + sd[0] * d, w.y[at] + sd[1] * d, w.z[at] + sd[2] * d, q, m > 1);
        }
        hangNeedles(h, w, q, sp, size, clumpR, rng);
      }
      for (let k = 1; k <= n; k++) if (k === n || k / n >= 1 - shell) hangNeedles(h, w, bough[k - 1], sp, size, clumpR, rng);
    }
  }
  // And a tuft at the leader's top.
  hangNeedles(h, w, i, sp, size, clumpR, rng);
  return h;
}

/** A conifer's clump on a node: needles hang under their shoot, so its centre sits a little below. */
function hangNeedles(h: Hung, w: Wood, node: number, sp: TreeSpecies, size: TreeSize, clumpR: number, rng: Random): void {
  const r = clumpRadius(sp, clumpR, rng);
  const y = w.y[node] - 0.25 * r;
  // None under the crown's base: down there it is too dark for needles.
  if (y - r < size.crownBase - 0.25 * r) return;
  hang(h, node, w.x[node], y, w.z[node], r);
}

// ---------------------------------------------------------------------------
// For every tree: thin the clumps, fit to size, the radii, and the arrays.

function finish(sp: TreeSpecies, size: TreeSize, w: Wood, hung: Hung): GrownTree {
  const env = new Envelope(sp.shape, size);
  const keep = thin(sp, env, hung);
  fit(size, w, hung, keep);

  // A clump keeps to its twig: its centre within its radius of the node it hangs on.
  for (const c of keep) {
    const nd = hung.node[c];
    const dx = hung.x[c] - w.x[nd];
    const dy = hung.y[c] - w.y[nd];
    const dz = hung.z[c] - w.z[nd];
    const d = Math.hypot(dx, dy, dz);
    const most = 0.9 * hung.r[c];
    if (d > most) {
      hung.x[c] = w.x[nd] + (dx * most) / d;
      hung.y[c] = w.y[nd] + (dy * most) / d;
      hung.z[c] = w.z[nd] + (dz * most) / d;
    }
  }

  const n = w.x.length;
  const skeleton: Skeleton = {
    count: n,
    x: Float32Array.from(w.x),
    y: Float32Array.from(w.y),
    z: Float32Array.from(w.z),
    radius: new Float32Array(n),
    parent: Int32Array.from(w.parent),
    order: new Uint8Array(n),
    limb: new Int32Array(n),
    along: new Float32Array(n),
  };
  const radius = pipeRadii(size, w);
  skeleton.radius.set(radius);
  for (let i = 0; i < n; i++) {
    const p = w.parent[i];
    if (p < 0) {
      skeleton.order[i] = 0;
      skeleton.limb[i] = i;
      skeleton.along[i] = w.y[i];
      continue;
    }
    const o = w.cont[i] ? skeleton.order[p] : Math.min(255, skeleton.order[p] + 1);
    skeleton.order[i] = o;
    skeleton.limb[i] = o === 0 ? skeleton.limb[p] : o === 1 && skeleton.order[p] === 0 ? i : skeleton.limb[p];
    skeleton.along[i] = skeleton.along[p] + Math.hypot(w.x[i] - w.x[p], w.y[i] - w.y[p], w.z[i] - w.z[p]);
  }

  const m = keep.length;
  const clumps: Clumps = {
    count: m,
    x: new Float32Array(m),
    y: new Float32Array(m),
    z: new Float32Array(m),
    radius: new Float32Array(m),
    nx: new Float32Array(m),
    ny: new Float32Array(m),
    nz: new Float32Array(m),
    node: new Int32Array(m),
    depth: new Float32Array(m),
  };
  for (let k = 0; k < m; k++) {
    const c = keep[k];
    clumps.x[k] = hung.x[c];
    clumps.y[k] = hung.y[c];
    clumps.z[k] = hung.z[c];
    clumps.radius[k] = hung.r[c];
    clumps.node[k] = hung.node[c];
    const at = env.place(hung.x[c], hung.y[c], hung.z[c], hung.r[c]);
    clumps.depth[k] = at.depth;
    clumps.nx[k] = at.n[0];
    clumps.ny[k] = at.n[1];
    clumps.nz[k] = at.n[2];
  }
  return { size, skeleton, clumps };
}

/**
 * Thin the clumps that crowd each other, the outermost kept first (they make the crown's outline), so
 * no two are closer than a share of their radii summed: nearer in a solid crown, further in an open one.
 * If that still leaves more than a host should draw, again, wider.
 */
function thin(sp: TreeSpecies, env: Envelope, h: Hung): number[] {
  const count = h.node.length;
  const outer = new Float64Array(count);
  for (let c = 0; c < count; c++) outer[c] = env.place(h.x[c], h.y[c], h.z[c], h.r[c]).depth;
  // A clump whose centre is out of the crown's outline, or that hangs half out of its base, is out of the
  // light the crown grows to: dropped.
  const within = (c: number) =>
    Math.hypot(h.x[c], h.z[c]) <= env.width(Math.min(env.hi, Math.max(env.lo, h.y[c]))) && h.y[c] - 0.5 * h.r[c] >= env.lo;
  const byOuter = Array.from({ length: count }, (_, c) => c)
    .filter(within)
    .sort((a, b) => outer[a] - outer[b] || a - b);
  let rMax = 0;
  for (let c = 0; c < count; c++) rMax = Math.max(rMax, h.r[c]);
  const pass = (k: number): number[] => {
    const cell = Math.max(1e-3, 2 * rMax * k);
    const grid = new Map<string, number[]>();
    const kept: number[] = [];
    for (const c of byOuter) {
      const ix = Math.floor(h.x[c] / cell);
      const iy = Math.floor(h.y[c] / cell);
      const iz = Math.floor(h.z[c] / cell);
      let free = true;
      for (let a = -1; a <= 1 && free; a++)
        for (let b = -1; b <= 1 && free; b++)
          for (let d = -1; d <= 1 && free; d++) {
            const list = grid.get(`${ix + a},${iy + b},${iz + d}`);
            if (!list) continue;
            for (const o of list) {
              const gap = k * (h.r[c] + h.r[o]);
              const dx = h.x[c] - h.x[o];
              const dy = h.y[c] - h.y[o];
              const dz = h.z[c] - h.z[o];
              if (dx * dx + dy * dy + dz * dz < gap * gap) {
                free = false;
                break;
              }
            }
          }
      if (!free) continue;
      kept.push(c);
      const key = `${ix},${iy},${iz}`;
      const list = grid.get(key);
      if (list) list.push(c);
      else grid.set(key, [c]);
    }
    return kept;
  };
  // Clumps fill a shell, so their count goes as the spacing's inverse square: each pass widens it by
  // that, and a little more, so few passes are needed.
  let k = THIN + THIN_OPEN * sp.openness;
  let kept = pass(k);
  for (let tries = 0; tries < 4 && kept.length > MAX_CLUMPS; tries++) {
    k *= 1.05 * Math.sqrt(kept.length / MAX_CLUMPS);
    kept = pass(k);
  }
  return kept.sort((a, b) => a - b);
}

/**
 * Fit the grown tree to its size: across, about its axis, so its outermost clump reaches the crown
 * radius; and up, stretching what is above the crown's base, so its highest leaf is at its height. The
 * growing aims at both already; this takes up what it misses by.
 */
function fit(size: TreeSize, w: Wood, h: Hung, keep: number[]): void {
  let reach = 0;
  let topY = 0;
  for (const c of keep) {
    reach = Math.max(reach, Math.hypot(h.x[c], h.z[c]) + h.r[c]);
    topY = Math.max(topY, h.y[c] + h.r[c]);
  }
  for (let i = 0; i < w.y.length; i++) topY = Math.max(topY, w.y[i]);
  const across = reach > 0 ? (FIT_REACH * size.crownRadius) / reach : 1;
  const pivot = size.crownBase;
  const upward = topY > pivot ? (FIT_TOP * size.height - pivot) / (topY - pivot) : 1;
  const stretch = (y: number) => (y > pivot ? pivot + (y - pivot) * upward : y);
  for (let i = 0; i < w.x.length; i++) {
    w.x[i] *= across;
    w.z[i] *= across;
    w.y[i] = stretch(w.y[i]);
  }
  for (let c = 0; c < h.node.length; c++) {
    h.x[c] *= across;
    h.z[c] *= across;
    h.y[c] = stretch(h.y[c]);
  }
}

/**
 * The pipe model (Shinozaki et al. 1964, after da Vinci): a branch's cross-section carries all the twigs
 * beyond it, r^PIPE = Σ r_child^PIPE, with a little taper along wood that does not divide. Each stem is
 * then scaled so its radius at breast height is the size's trunk radius (a shrub's stems all have it).
 */
function pipeRadii(size: TreeSize, w: Wood): Float64Array {
  const n = w.x.length;
  const r = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    const kids = w.kids[i];
    if (kids.length === 0) {
      r[i] = 1;
      continue;
    }
    let sum = 0;
    let tapered = 0;
    for (const c of kids) {
      sum += r[c] ** PIPE;
      const len = Math.hypot(w.x[c] - w.x[i], w.y[c] - w.y[i], w.z[c] - w.z[i]);
      tapered = Math.max(tapered, r[c] * (1 + TAPER * len));
    }
    r[i] = Math.max(sum ** (1 / PIPE), tapered);
  }
  // Each stem's radius at breast height, along its axis from its foot.
  const bh = breastHeight(size);
  const scale = new Float64Array(w.stems).fill(1);
  for (let i = 0; i < n; i++) {
    if (w.parent[i] >= 0) continue;
    let at = i;
    let measured = r[i];
    for (;;) {
      const next = w.kids[at].find((c) => w.cont[c]);
      if (next === undefined) {
        measured = r[at];
        break;
      }
      if (w.y[next] >= bh) {
        const f = (bh - w.y[at]) / Math.max(1e-9, w.y[next] - w.y[at]);
        measured = r[at] + (r[next] - r[at]) * Math.min(1, Math.max(0, f));
        break;
      }
      at = next;
    }
    scale[w.stem[i]] = size.trunkRadius / measured;
  }
  for (let i = 0; i < n; i++) r[i] *= scale[w.stem[i]];
  return r;
}
