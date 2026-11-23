// Growing a tree: a species says how its kind is built, a size says how big
// this one is, and a seed says which one of its kind it is. Out come its
// branches (a skeleton of nodes) and its leaves (clumps hung on the twigs).
//
// Three ways of building, by the species' architecture, each inside the
// crown's outline: its shape's profile (rounded as Weber and Penn's pruning
// envelope, upright where it is widest), turned round the trunk.
//
// - broadleaf and shrub: from buds, in the light (Palubicki et al. 2009, made
//   light). The trunk rises bare to the crown's base; its great limbs (its
//   scaffolds) leave the top of it, round it by the golden angle and up it one
//   to a slot, the lowest leaving widest, each laid out to the crown's outline
//   along a spine that turns by the species' bend and wanders by how crooked it
//   is; the trunk goes on up the crown as its leader, all the way if it keeps
//   the lead. Then, for eleven cycles: each bud is lit by how little the wood
//   above shades its voxel; the light is gathered down to the foot and handed
//   back up, at each fork more to the main axis (Borchert and Honda's model)
//   and to a scaffold as much as to its trunk; each bud grows as many
//   internodes as it is given, turned towards the least shadow and up or down
//   by the bend, a lateral bud at every one; and a branch that gathers too
//   little light for its wood is shed (Takenaka). A shrub's stems are its
//   scaffolds, from feet spread within a third of the crown. Leaves hang on the
//   lit shoots near their twigs' ends. Then the wood is smoothed (forks held),
//   bowed by its weight (thin wood more), and its straight runs joined.
// - conifer: a leader to the top, with whorls of boughs along it, each as long
//   as the crown is wide where it hangs (some missing, some broken short), and
//   side shoots along each bough; smoothed and bowed as a broadleaf is. A
//   conifer has one leader: its row's stems are not read.
// - palm: one stem to the crown, as thick at its top as at its foot, and a
//   head of fronds spiralling round its top by the golden angle, the young
//   ones upright, the old ones hanging, each arching over as far as the crown
//   lets it reach. Its leaves hang along each frond's outer part.
//
// A broadleaf or a shrub that weeps (`weep`) then hangs whips from its outer
// twigs: a short arch out, then straight down towards the crown's base, leaved
// all along, in place of the leaves at those twigs' ends.
//
// Then the same for all: clumps that crowd each other are thinned, the tree is
// fitted to its size (a survey measured it, and a ball meets it there), and the
// radii come from the pipe model: a branch carries the wood of all it bears,
// of the branches it has shed, and of the twigs it once bore.
//
// Plain Math and no three, so growing runs anywhere: in a worker, in node.

import { type TreeSpecies } from "./species.ts";
import { crownProfile, type Clumps, type GrownTree, type Skeleton, type TreeSize } from "./tree.ts";
import { Random } from "./random.ts";

const DEG = Math.PI / 180;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Under the 4000 nodes a host can count on, with room for a conifer's last bough. */
const MAX_NODES = 3900;
/** The length of a piece of trunk below the crown (m). */
const TRUNK_STEP = 0.8;
/** The thinnest shell a conifer keeps its needles in, as a share of the way in, whatever its foliage depth. */
const MIN_SHELL = 0.12;

// Broadleaves and shrubs: growing by buds in the light (Palubicki et al. 2009).
/** Growing cycles: years, as it were. */
const CYCLES = 11;
/**
 * The crown's size (the cube root of radius² × depth) in internodes: an internode's length. Tied to the
 * crown and not to metres, a big tree and a small one of a kind grow alike, with about as many nodes.
 */
const INTERNODES = 20;
/** The most voxels the shadow grid may have: a long thin crown's internodes are lengthened to keep under it. */
const MAX_VOXELS = 80000;
/** The wood grown, at the most, before it is smoothed and its straight runs joined (less for a tree that weeps). */
const FINE_NODES = 6000;
/** Shadow (Palubicki's): a node shades the voxels in a pyramid under it by a·b^−q, q layers down, to SHADOW_DEPTH layers. */
const SHADOW_A = 1;
const SHADOW_B = 2;
const SHADOW_DEPTH = 5;
/** Full light, in shadow: a bud under this much is in the dark. More in an open crown, whose leaves let light by. */
const LIGHT_FULL = 8;
const LIGHT_OPEN = 3;
/** The resource at a stem's foot, for each unit of light its buds gather (Palubicki's α). */
const ALPHA = 3;
/** The most internodes a bud puts out in a cycle. */
const MAX_METAMERS = 4;
/**
 * Borchert and Honda's λ, how much of the resource at a fork goes on along its main axis rather than to its
 * lateral: at leader 0 (decurrent: an oak's crown of equal limbs) and at leader 1 (excurrent: one stem to the top).
 */
const LAMBDA_LO = 0.47;
const LAMBDA_HI = 0.55;
/** How much a stem's own axis is favoured over its laterals in the crown: at leader 0, and more for each unit of leader. */
const STEM_FAVOUR = 0.6;
const STEM_FAVOUR_LEADER = 1.4;
/** How much a scaffold's own axis is favoured over the shoots it puts out. */
const SCAFFOLD_FAVOUR = 1.3;
/** How far a shoot turns towards the least shadow it sees (Palubicki's ξ), and up or down by its species' bend (η). */
const TO_LIGHT = 0.4;
const TROPISM = 0.22;
/** How hard a stem's shoots turn up, at leader 1. */
const LEADER_UP = 0.35;
/** How far a shoot wanders at random each internode, at crooked 1. */
const WANDER = 0.22;
/** A bud sees the voxels within this angle of its way (the cosine), two voxels round. */
const PERCEIVE = Math.cos(60 * DEG);
/** The light a branch must gather for each of its internodes to be kept, from `openness` and `branchiness`, when `shed` is not given. */
const SHED_BASE = 0.05;
const SHED_OPEN = 0.1;
const SHED_SPARSE = 0.15;
/** The scaffolds leave the trunk from just above the crown's base, up a share of the crown's depth: at leader 0, and more for each unit of leader. */
const SCAFFOLD_FROM = 0;
const SCAFFOLD_SPAN = 0.14;
const SCAFFOLD_SPAN_LEADER = 0.5;
/** How much wider than the species' angle the lowest scaffold leaves (and narrower the highest). */
const SCAFFOLD_SWING = 40 * DEG;
/** How far a scaffold turns up over a crown radius of its length, at bend 1 (down at -1), and how far it arches over by its weight. */
const SCAFFOLD_CURVE = 35 * DEG;
const SCAFFOLD_ARCH = 20 * DEG;
/** A crown narrower than this for its depth (radius over depth) is a column: its limbs rise steeply and arch little. */
const NARROW = 0.35;
/** How far a scaffold's way wanders each internode at crooked 1 (radians, a deviate's spread), and how much of its wander it keeps from the last. */
const LIMB_WANDER = 0.09;
const LIMB_KEEP = 0.85;
/** How far a scaffold sways side to side over its length, at crooked 1. */
const SCAFFOLD_SWAY = 28 * DEG;
/** How far a trunk goes on up its crown, from its scaffolds to the top, at leader 0 (and all the way at leader 1). */
const LEADER_REACH = 0.55;
/** How lumpy an outline is at lobes 1: how far it falls back between its bulges, and how many bulges. */
const LOBE_DEPTH = 0.3;
const LOBE_COUNT = 7;
/** Leaves: on shoots this light or lighter ... */
const LEAF_LIGHT = 0.1;
/** ... within this many internodes of a twig's end at foliage depth 0, and this many more at 1. */
const LEAF_REACH = 1;
const LEAF_REACH_DEPTH = 5;
// The wood, smoothed and simplified, then bowed by its weight.
/** Laplacian passes over the wood, forks held, each moving a node this share of the way to its neighbours' middle. */
const SMOOTH_PASSES = 2;
const SMOOTH = 0.5;
/** A node that bends its wood less than this is dropped, its neighbours joined straight. */
const SIMPLIFY = 4 * DEG;
/** The longest piece simplifying may make, in internodes. */
const SIMPLIFY_SPAN = 5;
/** How far wood turns down under its weight per internode of length (Evergrove's sag), at the most each piece, and the radius (in twigs' pipes) at which it is half as pliant. */
const SAG = 0.06;
const SAG_MOST = 0.3;
const SAG_STIFF = 2.6;

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
/** The share of boughs broken or shaded back, which stop short. */
const BOUGH_BROKEN = 0.2;
/** How far a conifer sags under its weight, as a share of what a broadleaf of its bend does. */
const CONIFER_SAG = 0.5;

// Palms.
/** How far a frond leaves the crown from the level: the youngest, nearly upright ... */
const FROND_YOUNG = 80 * DEG;
/** ... to the oldest, hanging. */
const FROND_OLD = -50 * DEG;
/** How far a frond arches over along its length at arch 1, when it leaves level (less when it leaves upright, which its weight bends less). */
const FROND_ARCH = 110 * DEG;
/** The steepest a frond hangs. */
const FROND_HANG = -85 * DEG;
/** Where the fronds leave the stem: as a share of the way up the crown. */
const PALM_HEART = 0.55;
/** How far down the stem the oldest fronds leave it, below the youngest, as a share of the crown's depth (at most PALM_KNOB_MAX m). */
const PALM_KNOB = 0.12;
const PALM_KNOB_MAX = 1.2;
const PALM_KNOB_NODES = 4;
/** A frond bears leaflets from this share of the way along it to its tip. */
const FROND_LEAFY = 0.2;
/** A frond's rachis radius at its foot, as a share of its length, and at its tip, as a share of its foot's. */
const RACHIS = 0.011;
const RACHIS_TIP = 0.3;
/** How much thicker a palm's stem is at its foot, and over what height the swell dies away (m). */
const PALM_SWELL = 0.25;
const PALM_SWELL_HEIGHT = 0.6;
/** How far a palm's stem bows, per metre of stem at crooked 1 (m). */
const PALM_BOW = 0.05;
/** Pieces of a frond, at the most and the least. */
const FROND_PIECES_MAX = 12;
const FROND_PIECES_MIN = 3;

// Whips.
/** The share of the node budget kept from the crown's growing for its whips, at weep 1. */
const WHIP_NODES = 0.45;
/** The share of the clumps a crown may keep that go to its whips, at weep 1 (and a fifth more whatever the weep). */
const WHIP_CLUMPS = 0.75;
/** The share of the leaves along a weeping tree's twigs that it does not bear, at weep 1: they are on its whips. */
const WEEP_TWIG_BARE = 0.4;
/** A whip's clump, as a share of the species'. */
const WHIP_CLUMP = 0.7;
/** How far a whip turns down with each piece of its arch. */
const WHIP_TURN = 35 * DEG;
/** The steepest a whip leaves its twig upwards, and the lowest. */
const WHIP_RISE = 35 * DEG;
const WHIP_DIP = -20 * DEG;
/** How much shorter a whip may stop than the crown's base, as a share of the way down to it from its twig (squared draws: most reach far). */
const WHIP_STAGGER = 0.45;

// Clumps.
/** How far past a twig's end its clump's centre sits, in the clump's radii. */
const HANG = 0.3;
/** How far a clump is lifted out of the crown from its twig, in its radii. */
const HANG_OUT = 0.2;
/** How close two clumps may be, as a share of their radii summed, in a solid crown and in an open one. */
const THIN = 0.6;
const THIN_OPEN = 0.4;
/** Past this many clumps, the crown is thinned again, wider ... */
const MAX_CLUMPS = 240;
/** ... more for a tree that weeps, by its share of whips (at weep 1, twice as many: a curtain is leaves all the way down) ... */
const WEEP_CLUMPS = 1;
/** ... and for a palm, whose leaves are strung along its fronds, and may be closer (a frond's leaflets overlap). */
const PALM_CLUMPS = 1.25;
const PALM_THIN = 0.75;
/** How far one clump's size strays from the species' (as shares of it), at the most. */
const CLUMP_MIN = 0.55;
const CLUMP_MAX = 1.6;

// Fitting to size.
/** How far the outermost clump reaches, as a share of the crown radius. */
const FIT_REACH = 0.985;
/** How high the highest leaf or twig is, as a share of the height. */
const FIT_TOP = 0.995;
/** How far over the crown's base the lowest leaf may be (a share of the crown's depth) before the fit moves it down to it, and how far under (hanging) before it moves it up. */
const FIT_LOW = 0.04;
const FIT_HANG = 0.06;

// Radii.
/** The pipe model's exponent (da Vinci's rule is 2; measured trees give 2.2 to 2.5). */
const PIPE = 2.4;
/**
 * Disused pipes (Shinozaki et al. 1964): wood grows thicker than the twigs it now carries, by the twigs and
 * leaves it once carried and lost. Each internode of wood carries this share more pipes than it hands on.
 */
const DISUSED = 0.08;

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
      hung = budGrow(species, sz, rng.fork(), wood, clumpR);
      break;
    case "palm":
      hung = palm(species, sz, rng.fork(), wood, clumpR);
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
  /** Each node's radius (m), when the grower sets them itself (a palm's): the pipe model is then not used. */
  radius: number[] | null;
  /** The twigs' pipes each node carried to branches it has shed (the pipe model remembers them), or none. */
  shed: number[] | null;
}

function newWood(): Wood {
  return { x: [], y: [], z: [], parent: [], stem: [], cont: [], kids: [], stems: 0, radius: null, shed: null };
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
  if (w.shed) w.shed.push(0);
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
  /** Whether it hangs on a whip: kept before the rest when the crown is thinned. */
  whip: boolean[];
}

function newHung(): Hung {
  return { node: [], x: [], y: [], z: [], r: [], whip: [] };
}

function hang(h: Hung, node: number, x: number, y: number, z: number, r: number, whip = false): void {
  h.node.push(node);
  h.x.push(x);
  h.y.push(y);
  h.z.push(z);
  h.r.push(r);
  h.whip.push(whip);
}

/** One clump's radius: the species' mean, varied by its clump spread. */
function clumpRadius(sp: TreeSpecies, mean: number, rng: Random): number {
  const k = 1 + 0.5 * sp.clumpSpread * rng.gauss();
  return mean * Math.min(CLUMP_MAX, Math.max(CLUMP_MIN, k));
}

// ---------------------------------------------------------------------------
// A species' crown profile, tabled: growing asks it at every step.

const PROFILE_STEPS = 512;

/** A species' `crownProfile` as a function of `t` (0 the crown's base, 1 its top), from a table of it. */
function profileOf(sp: TreeSpecies): (t: number) => number {
  const table = new Float64Array(PROFILE_STEPS + 1);
  for (let i = 0; i <= PROFILE_STEPS; i++) table[i] = crownProfile(sp.shape, i / PROFILE_STEPS, sp);
  return (t: number) => {
    if (!(t > 0)) return table[0];
    if (t >= 1) return table[PROFILE_STEPS];
    const f = t * PROFILE_STEPS;
    const i = Math.floor(f);
    return table[i] + (table[i + 1] - table[i]) * (f - i);
  };
}

// ---------------------------------------------------------------------------
// The crown's envelope: the solid of revolution its profile sweeps, from its
// base to its top. Every profile is concave in height, so the solid is convex:
// a ray from inside leaves it once, which is what lets its reach be bisected.

class Envelope {
  private readonly profile: (t: number) => number;
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
  constructor(sp: TreeSpecies, size: TreeSize, side = 0, bottom = 0, top = 0) {
    this.profile = profileOf(sp);
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
    return this.profile((y - this.base) / this.depth) * this.radius - this.side;
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

// ---------------------------------------------------------------------------
// Broadleaves and shrubs: growing by buds, in the light.

/**
 * How many great limbs (scaffolds) a broadleaf's trunk carries into its crown: its row's `scaffolds`, or 4
 * and one more for every third of its leader. A shrub's (or a stool's) stems are its scaffolds: it has none
 * besides.
 */
export function scaffoldCount(sp: TreeSpecies): number {
  if (sp.architecture !== "broadleaf" && sp.architecture !== "shrub") return 0;
  if (Math.round(sp.stems) > 1) return 0;
  return Math.max(0, Math.round(sp.scaffolds ?? 4 + 3 * sp.leader));
}

/**
 * Bulges on a crown's outline: a few directions from its heart where it reaches all the way out, falling
 * back between them, by how lumpy the species is.
 */
class Lobes {
  private readonly dirs: Float64Array;
  private readonly amount: number;

  constructor(amount: number, rng: Random) {
    this.amount = Math.min(1, Math.max(0, amount)) * LOBE_DEPTH;
    this.dirs = new Float64Array(LOBE_COUNT * 3);
    for (let k = 0; k < LOBE_COUNT; k++) this.dirs.set(rng.onSphere(), 3 * k);
  }

  /** The share of the outline's reach in a direction from the heart (not unit: it is normalized here). */
  reach(ux: number, uy: number, uz: number): number {
    if (this.amount <= 0) return 1;
    const k = Math.hypot(ux, uy, uz);
    if (k < 1e-9) return 1;
    let best = 0;
    for (let j = 0; j < LOBE_COUNT; j++) {
      const d = (ux * this.dirs[3 * j] + uy * this.dirs[3 * j + 1] + uz * this.dirs[3 * j + 2]) / k;
      if (d > 0) best = Math.max(best, d * d * d);
    }
    return 1 - this.amount * (1 - best);
  }
}

/**
 * A broadleaf or a shrub, grown from its buds (Palubicki et al. 2009, lightened). Its trunk rises bare to the
 * crown's base; its great limbs leave the top of it, set round it and up it as Weber and Penn set a tree's
 * first branches, each reaching out to the crown's outline. Then, cycle by cycle: every bud is lit by how
 * little the wood above shades it (shadow cast down through a grid of voxels); the light is gathered down to
 * the foot and handed back up as what to grow with, more to the main axis at each fork (Borchert and
 * Honda); each bud grows as many internodes as it is given, its way turned towards the least shadow and up
 * or down by the species' bend, with a lateral bud at every one (by the golden angle); and a branch that
 * gathers too little light for its wood is shed (Takenaka). Nothing grows out of the crown's outline.
 */
function budGrow(sp: TreeSpecies, size: TreeSize, rng: Random, w: Wood, clumpR: number): Hung {
  const { height: H, crownRadius: R, crownBase: base } = size;
  const depth = Math.max(0.01, H - base);
  const crown = Math.cbrt(R * R * depth);
  let L = crown / INTERNODES;
  const voxels = (l: number) => (Math.ceil((2 * R) / l) + 7) ** 2 * (Math.ceil(H / l) + 6);
  while (voxels(L) > MAX_VOXELS) L *= 1.08;
  const weep = weepOf(sp);
  const target = Math.round(FINE_NODES * (1 - WHIP_NODES * weep));
  const cap = 2 * target + 600;

  // The crown its leaves keep to, its outline drawn in by a clump's room: its lobes, and the heights it spans.
  const lobes = new Lobes(sp.lobes ?? 0, rng);
  const side = 1.2 * clumpR;
  const lo = base + Math.min(0.25 * clumpR, 0.2 * depth);
  const hi = H - Math.min(1.05 * clumpR, 0.3 * depth);
  const mid = base + 0.5 * depth;
  const profile = profileOf(sp);
  const widthAt = (y: number) => profile((y - base) / depth) * R;
  const inCrown = (x: number, y: number, z: number): boolean => {
    if (y < lo || y > hi) return false;
    const wd = widthAt(y) * lobes.reach(x / R, (y - mid) / (0.5 * depth), z / R) - side;
    return wd > 0 && x * x + z * z <= wd * wd;
  };

  // The voxels: shadow in each, and whether each is in the crown.
  const vs = L;
  const nx = Math.ceil((2 * R) / vs) + 7;
  const nz = nx;
  const ny = Math.ceil(H / vs) + 6;
  const ox = -0.5 * nx * vs;
  const oz = ox;
  const oy = -2 * vs;
  const shadow = new Float64Array(nx * ny * nz);
  const room = new Uint8Array(nx * ny * nz);
  for (let iy = 0; iy < ny; iy++) {
    const y = oy + (iy + 0.5) * vs;
    if (y < lo || y > hi) continue;
    for (let iz = 0; iz < nz; iz++)
      for (let ix = 0; ix < nx; ix++) {
        if (inCrown(ox + (ix + 0.5) * vs, y, oz + (iz + 0.5) * vs)) room[ix + nx * (iz + nz * iy)] = 1;
      }
  }
  const fall = new Float64Array(SHADOW_DEPTH + 1);
  for (let q = 0; q <= SHADOW_DEPTH; q++) fall[q] = SHADOW_A * SHADOW_B ** -q;
  const voxel = (x: number, y: number, z: number): number => {
    const ix = Math.floor((x - ox) / vs);
    const iy = Math.floor((y - oy) / vs);
    const iz = Math.floor((z - oz) / vs);
    if (ix < 0 || iy < 0 || iz < 0 || ix >= nx || iy >= ny || iz >= nz) return -1;
    return ix + nx * (iz + nz * iy);
  };
  const shade = (x: number, y: number, z: number, sign: number) => {
    const ix = Math.floor((x - ox) / vs);
    const iy = Math.floor((y - oy) / vs);
    const iz = Math.floor((z - oz) / vs);
    if (ix < 0 || iz < 0 || ix >= nx || iz >= nz || iy < 0 || iy >= ny) return;
    for (let q = 0; q <= SHADOW_DEPTH; q++) {
      const ly = iy - q;
      if (ly < 0) break;
      const amt = sign * fall[q];
      const x0 = Math.max(0, ix - q);
      const x1 = Math.min(nx - 1, ix + q);
      const z0 = Math.max(0, iz - q);
      const z1 = Math.min(nz - 1, iz + q);
      for (let zz = z0; zz <= z1; zz++) {
        const row = nx * (zz + nz * ly);
        for (let xx = x0; xx <= x1; xx++) shadow[row + xx] += amt;
      }
    }
  };
  const full = LIGHT_FULL + LIGHT_OPEN * sp.openness;
  const lightAt = (x: number, y: number, z: number): number => {
    const c = voxel(x, y, z);
    const s = c < 0 ? 0 : shadow[c];
    return Math.min(1, Math.max(0, (full - s + SHADOW_A) / full));
  };
  // What a bud sees: the voxels two round it, within its cone. The least shaded three of them in the crown
  // give the way to the light (straight on, where they are alike), as the mean of their directions.
  const seen: number[] = [];
  for (let a = -2; a <= 2; a++)
    for (let b = -2; b <= 2; b++)
      for (let c = -2; c <= 2; c++) {
        if (a === 0 && b === 0 && c === 0) continue;
        const k = Math.hypot(a, b, c);
        seen.push(a, b, c, a / k, b / k, c / k);
      }
  const toLight: V3 = [0, 0, 0];
  const best = new Float64Array(3);
  const bestAt = new Int32Array(3);
  const lookForLight = (x: number, y: number, z: number, d: V3): boolean => {
    const ix = Math.floor((x - ox) / vs);
    const iy = Math.floor((y - oy) / vs);
    const iz = Math.floor((z - oz) / vs);
    best.fill(Infinity);
    bestAt.fill(-1);
    for (let k = 0; k < seen.length; k += 6) {
      const dot = seen[k + 3] * d[0] + seen[k + 4] * d[1] + seen[k + 5] * d[2];
      if (dot < PERCEIVE) continue;
      const jx = ix + seen[k];
      const jy = iy + seen[k + 1];
      const jz = iz + seen[k + 2];
      if (jx < 0 || jy < 0 || jz < 0 || jx >= nx || jy >= ny || jz >= nz) continue;
      const c = jx + nx * (jz + nz * jy);
      if (!room[c]) continue;
      const score = shadow[c] - 0.05 * SHADOW_A * dot;
      // (Kept in order, least first.)
      let j = 2;
      if (score >= best[j]) continue;
      while (j > 0 && score < best[j - 1]) {
        best[j] = best[j - 1];
        bestAt[j] = bestAt[j - 1];
        j--;
      }
      best[j] = score;
      bestAt[j] = k;
    }
    if (bestAt[0] < 0) return false;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (let j = 0; j < 3; j++) {
      const k = bestAt[j];
      if (k < 0) break;
      sx += seen[k + 3];
      sy += seen[k + 4];
      sz += seen[k + 5];
    }
    const l = Math.hypot(sx, sy, sz);
    toLight[0] = sx / l;
    toLight[1] = sy / l;
    toLight[2] = sz / l;
    return true;
  };

  // The wood as it grows. Each node ends an internode, and bears a terminal bud (until it grows on or dies)
  // and a lateral bud (until it grows out or dies); its main child goes on its axis, its lateral child
  // starts a new one.
  const px = new Float64Array(cap);
  const py = new Float64Array(cap);
  const pz = new Float64Array(cap);
  const dx = new Float64Array(cap);
  const dy = new Float64Array(cap);
  const dz = new Float64Array(cap);
  const par = new Int32Array(cap);
  const main = new Int32Array(cap);
  const lat = new Int32Array(cap);
  /** 0 a stem, 1 a scaffold, 2 a shoot. */
  const kind = new Uint8Array(cap);
  const alive = new Uint8Array(cap);
  const tBud = new Uint8Array(cap);
  const lBud = new Uint8Array(cap);
  const az = new Float64Array(cap);
  const light = new Float64Array(cap);
  const gathered = new Float64Array(cap);
  const internodes = new Int32Array(cap);
  const pipes = new Float64Array(cap);
  const shedPipes = new Float64Array(cap);
  const vIn = new Float64Array(cap);
  const vT = new Float64Array(cap);
  const vL = new Float64Array(cap);
  let count = 0;
  let living = 0;
  const roots: number[] = [];

  const add = (x: number, y: number, z: number, parent: number, onAxis: boolean, k: number, d: V3): number => {
    const i = count++;
    px[i] = x;
    py[i] = y;
    pz[i] = z;
    dx[i] = d[0];
    dy[i] = d[1];
    dz[i] = d[2];
    par[i] = parent;
    main[i] = -1;
    lat[i] = -1;
    kind[i] = k;
    alive[i] = 1;
    living++;
    tBud[i] = 0;
    lBud[i] = y >= base ? 1 : 0;
    if (parent >= 0) {
      if (onAxis) main[parent] = i;
      else lat[parent] = i;
      az[i] = onAxis ? az[parent] + GOLDEN_ANGLE : rng.range(0, 2 * Math.PI);
    } else roots.push(i);
    shade(x, y, z, 1);
    return i;
  };
  const dirOf = (i: number): V3 => [dx[i], dy[i], dz[i]];

  /**
   * A spine laid out ahead of growing (a scaffold, a leader, a shrub's stem): from a node along a way that
   * turns as `way(s)` says (s, metres along it), an internode at a time, until it leaves the crown (once it
   * has been in it) or has gone `most` metres. Returns its nodes' places.
   */
  const spine = (from: number, way: (s: number) => V3, most: number): number[] => {
    const pts: number[] = [];
    let x = px[from];
    let y = py[from];
    let z = pz[from];
    let entered = inCrown(x, y, z);
    for (let s = 0; s < most; s += L) {
      const d = way(s);
      const nx2 = x + d[0] * L;
      const ny2 = y + d[1] * L;
      const nz2 = z + d[2] * L;
      if (inCrown(nx2, ny2, nz2)) entered = true;
      else if (entered || ny2 < 0) break;
      x = nx2;
      y = ny2;
      z = nz2;
      pts.push(x, y, z);
    }
    return pts;
  };
  const lay = (from: number, pts: number[], keep: number, k: number, onAxis: boolean): number => {
    let at = from;
    for (let j = 0; j < keep; j++) {
      const x = pts[3 * j];
      const y = pts[3 * j + 1];
      const z = pts[3 * j + 2];
      const d = norm([x - px[at], y - py[at], z - pz[at]]);
      at = add(x, y, z, at, j > 0 || onAxis, k, d);
    }
    if (keep > 0) tBud[at] = 1;
    return at;
  };

  // The stems. One for a tree; for a shrub or a stool, several from feet spread within a third of the
  // crown, leaning out from it.
  const stems = Math.max(1, Math.round(sp.stems));
  const scaffolds = scaffoldCount(sp);
  const turn = rng.range(0, 2 * Math.PI);
  for (let s = 0; s < stems; s++) {
    const azs = turn + s * GOLDEN_ANGLE + rng.range(-0.3, 0.3);
    if (stems > 1) {
      // A shrub's stem: from its foot, leaning out, turning up by its bend, through the crown to its edge.
      const rr = (R / 3) * Math.sqrt((s + 0.5) / stems);
      const lean = Math.min(0.5 * sp.branchAngle * DEG, Math.atan(Math.max(0, 0.6 * R - rr) / Math.max(L, 0.5 * depth)));
      const foot = add(rr * Math.cos(azs), 0, rr * Math.sin(azs), -1, true, 0, [0, 1, 0]);
      const e0 = 0.5 * Math.PI - lean * rng.range(0.6, 1.2);
      const sway = SCAFFOLD_SWAY * sp.crooked * rng.range(-1, 1);
      const pts = spine(foot, (u) => {
        const f = u / Math.max(L, R);
        const e = Math.min(0.5 * Math.PI, e0 + 0.5 * sp.bend * SCAFFOLD_CURVE * f);
        const a = azs + sway * Math.sin(Math.PI * Math.min(1, f));
        return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
      }, 2 * (H + R));
      lay(foot, pts, Math.max(1, Math.round((pts.length / 3) * rng.range(0.75, 1))), 0, true);
      continue;
    }
    // A tree's trunk: bare to its crown's base, then through the scaffolds' span, one of them at each of
    // their heights (one in each of as many slots up it), its own lateral buds between.
    const yLo = base + SCAFFOLD_FROM * depth;
    const span = Math.min(0.8, SCAFFOLD_SPAN + SCAFFOLD_SPAN_LEADER * sp.leader);
    const yHi = Math.max(yLo + L, base + span * depth);
    const levels: { y: number; scaffold: number }[] = [];
    const below = Math.max(1, Math.ceil(yLo / TRUNK_STEP));
    for (let k = 1; k < below; k++) levels.push({ y: (yLo * k) / below, scaffold: -1 });
    const marks: number[] = [];
    for (let k = 0; k < scaffolds; k++) marks.push(yLo + ((k + rng.range(0.15, 0.85)) / scaffolds) * (yHi - yLo));
    const section: { y: number; scaffold: number }[] = marks.map((y, k) => ({ y, scaffold: k }));
    for (let y = yLo; y <= yHi + 1e-9; y += L) if (marks.every((m) => Math.abs(m - y) > 0.4 * L)) section.push({ y, scaffold: -1 });
    section.sort((a, b) => a.y - b.y);
    levels.push(...section);
    let at = add(0, 0, 0, -1, true, 0, [0, 1, 0]);
    lBud[at] = 0;
    let wx = 0;
    let wz = 0;
    const holds: { node: number; scaffold: number }[] = [];
    for (const lv of levels) {
      const j = rng.onSphere();
      wx = 0.6 * wx + 0.08 * sp.crooked * j[0];
      wz = 0.6 * wz + 0.08 * sp.crooked * j[2];
      const d = norm([wx, 1, wz]);
      const len = (lv.y - py[at]) / d[1];
      at = add(px[at] + d[0] * len, lv.y, pz[at] + d[2] * len, at, true, 0, d);
      if (lv.scaffold >= 0) {
        lBud[at] = 0;
        holds.push({ node: at, scaffold: lv.scaffold });
      }
    }
    // The trunk goes on up the crown as its leader, all the way when it keeps the lead; otherwise part way,
    // and its bud grows on from there as one more limb.
    {
      const top = yHi + Math.min(1, LEADER_REACH + (1 - LEADER_REACH) * sp.leader) * (hi - L - yHi);
      let lx = 0;
      let lz = 0;
      const pts = spine(at, () => {
        const j = rng.onSphere();
        lx = 0.7 * lx + 0.06 * sp.crooked * j[0];
        lz = 0.7 * lz + 0.06 * sp.crooked * j[2];
        return norm([lx, 1, lz]);
      }, Math.max(0, top - py[at]));
      at = lay(at, pts, pts.length / 3, 0, true);
    }
    tBud[at] = 1;
    // The scaffolds, round the trunk by the golden angle, the lowest leaving widest; each turns up (or down)
    // by the species' bend and arches over by its weight, sways a little, and reaches out to the crown's
    // outline (some stop a little short).
    for (const { node, scaffold: k } of holds) {
      const pos = scaffolds > 1 ? k / (scaffolds - 1) : 0.5;
      const g = Math.max(-2, Math.min(2, rng.gauss()));
      // (No wider than the crown has room for: in a crown narrow for its depth (a tree grown in a wood, a
      // column), the limbs rise steeply, or they would reach its side at once and curl over into hooks.)
      const room = R / depth < NARROW ? Math.atan((2.4 * R) / depth) : Math.PI;
      const angle = Math.min(110 * DEG, room, Math.max(8 * DEG, (sp.branchAngle + 0.5 * sp.branchAngleSpread * g) * DEG + SCAFFOLD_SWING * (0.5 - pos)));
      const a0 = azs + k * GOLDEN_ANGLE + rng.range(-0.3, 0.3);
      const e0 = 0.5 * Math.PI - angle;
      const sway = SCAFFOLD_SWAY * sp.crooked * rng.range(-1, 1);
      const phase = rng.range(0, Math.PI);
      // (And it wanders, up and down and side to side, a bend every few internodes: a crooked limb's elbows.)
      let we = 0;
      let wa = 0;
      const pts = spine(node, (u) => {
        // (Its arch over the crown, reckoned over the crown's reach: the larger of its radius and most of its
        // depth, so a long limb in a narrow crown rises rather than arching back down.)
        const f = u / (R / depth < NARROW ? Math.max(R, 0.6 * depth) : R);
        we = LIMB_KEEP * we + LIMB_WANDER * sp.crooked * rng.gauss();
        wa = LIMB_KEEP * wa + LIMB_WANDER * sp.crooked * rng.gauss();
        const e = Math.min(0.5 * Math.PI, e0 + sp.bend * SCAFFOLD_CURVE * f - SCAFFOLD_ARCH * f * f + we);
        const a = a0 + sway * Math.sin(Math.PI * f + phase) + wa;
        return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
      }, R + depth);
      const n = pts.length / 3;
      lay(node, pts, Math.max(Math.min(2, n), Math.round(n * rng.range(0.82, 1))), 1, false);
    }
  }

  // Light at every node, then gathered down to each foot: what each axis and branch collects, how many
  // internodes it is, and how many twigs' pipes it carries (the wood it sheds, too).
  const gather = () => {
    for (let i = count - 1; i >= 0; i--) {
      if (!alive[i]) continue;
      let q = (tBud[i] ? light[i] : 0) + (lBud[i] ? light[i] : 0);
      let n = 1;
      let p = shedPipes[i];
      const m = main[i];
      const l = lat[i];
      if (m >= 0) {
        q += gathered[m];
        n += internodes[m];
        p += pipes[m];
      }
      if (l >= 0) {
        q += gathered[l];
        n += internodes[l];
        p += pipes[l];
      }
      if (m < 0 && l < 0) p += 1;
      gathered[i] = q;
      internodes[i] = n;
      pipes[i] = p;
    }
  };
  const cut = (c: number) => {
    const stack = [c];
    while (stack.length > 0) {
      const i = stack.pop() as number;
      if (!alive[i]) continue;
      alive[i] = 0;
      living--;
      shade(px[i], py[i], pz[i], -1);
      if (main[i] >= 0) stack.push(main[i]);
      if (lat[i] >= 0) stack.push(lat[i]);
    }
  };
  /** Shed every branch (a lateral off its axis, not a scaffold) that gathers too little light for its wood. */
  const shedThreshold = sp.shed ?? SHED_BASE + SHED_OPEN * sp.openness + SHED_SPARSE * (1 - sp.branchiness);
  const shedDark = (): boolean => {
    let any = false;
    for (let i = 0; i < count; i++) {
      const c = lat[i];
      if (!alive[i] || c < 0 || !alive[c] || kind[c] === 1 || internodes[c] < 3) continue;
      if (gathered[c] / internodes[c] >= shedThreshold) continue;
      shedPipes[i] += pipes[c];
      cut(c);
      lat[i] = -1;
      lBud[i] = 0;
      any = true;
    }
    return any;
  };

  const lambda = LAMBDA_LO + (LAMBDA_HI - LAMBDA_LO) * sp.leader;
  const stemFavour = STEM_FAVOUR + STEM_FAVOUR_LEADER * sp.leader;
  const lift = TROPISM * sp.bend;
  const grow = (from: number, onAxis: boolean, n: number) => {
    let at = from;
    let d: V3;
    if (onAxis) d = dirOf(from);
    else {
      lBud[from] = 0;
      d = cone(dirOf(from), branchAngle(sp, rng), az[from]);
      // (A shoot is not put out straight down: it leaves its axis's other side.)
      if (d[1] < -0.6) d = cone(dirOf(from), branchAngle(sp, rng), az[from] + Math.PI);
    }
    const k = onAxis ? kind[from] : 2;
    for (let m = 0; m < n && count < cap; m++) {
      const j = rng.onSphere();
      const up = lift + (k === 0 ? LEADER_UP * sp.leader : 0);
      let tx = d[0] + WANDER * sp.crooked * j[0];
      let ty = d[1] + up + WANDER * sp.crooked * j[1];
      let tz = d[2] + WANDER * sp.crooked * j[2];
      if (lookForLight(px[at], py[at], pz[at], d)) {
        tx += TO_LIGHT * toLight[0];
        ty += TO_LIGHT * toLight[1];
        tz += TO_LIGHT * toLight[2];
      }
      d = norm([tx, ty, tz]);
      const x = px[at] + d[0] * L;
      const y = py[at] + d[1] * L;
      const z = pz[at] + d[2] * L;
      if (!inCrown(x, y, z)) {
        if (at !== from || onAxis) tBud[at] = 0;
        return;
      }
      if (at === from && onAxis) tBud[from] = 0;
      const i = add(x, y, z, at, at !== from || onAxis, k, d);
      if (at !== from) tBud[at] = 0;
      tBud[i] = 1;
      at = i;
    }
  };

  for (let cycle = 0; cycle < CYCLES && living < target; cycle++) {
    for (let i = 0; i < count; i++) if (alive[i]) light[i] = lightAt(px[i], py[i], pz[i]);
    gather();
    if (cycle > 1 && shedDark()) gather();
    // The resource, at each foot by the light its stem gathers, but no more than the wood left to grow
    // allows this cycle; handed up, at each node, between its main axis and its lateral.
    let total = 0;
    for (const r of roots) total += gathered[r];
    const budget = (target - living) / (CYCLES - cycle);
    vIn.fill(0, 0, count);
    for (const r of roots) vIn[r] = total > 0 ? Math.min(ALPHA * gathered[r], (budget * gathered[r]) / total) : 0;
    for (let i = 0; i < count; i++) {
      vT[i] = 0;
      vL[i] = 0;
      if (!alive[i]) continue;
      const v = vIn[i];
      if (v <= 0) continue;
      const m = main[i];
      const l = lat[i];
      const qm = m >= 0 ? gathered[m] : tBud[i] ? light[i] : 0;
      const ql = l >= 0 ? gathered[l] : lBud[i] ? light[i] : 0;
      // (A scaffold has as much say as the trunk it leaves: the great limbs share by the light each gathers.)
      const wm = lambda * (kind[i] === 0 ? stemFavour : kind[i] === 1 ? SCAFFOLD_FAVOUR : 1) * qm;
      const wl = (l >= 0 && kind[l] === 1 ? lambda * stemFavour : 1 - lambda) * ql;
      if (wm + wl <= 0) continue;
      const vm = (v * wm) / (wm + wl);
      if (m >= 0) vIn[m] = vm;
      else vT[i] = vm;
      if (l >= 0) vIn[l] = v - vm;
      else vL[i] = v - vm;
    }
    const before = count;
    for (let i = 0; i < before; i++) {
      if (!alive[i]) continue;
      if (tBud[i] && vT[i] >= 1) grow(i, true, Math.min(MAX_METAMERS, Math.floor(vT[i])));
      if (lBud[i] && vL[i] >= 1) grow(i, false, Math.min(MAX_METAMERS, Math.floor(vL[i])));
    }
    if (count === before) break;
  }
  // And a last reckoning of the light: what has grown into the dark is shed.
  for (let i = 0; i < count; i++) if (alive[i]) light[i] = lightAt(px[i], py[i], pz[i]);
  gather();
  if (shedDark()) gather();

  // Into the wood, the living nodes in order (a parent before its children), with what each sheds.
  const index = new Int32Array(count).fill(-1);
  const shed: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!alive[i]) continue;
    const p = par[i];
    index[i] = addNode(w, px[i], py[i], pz[i], p < 0 ? -1 : index[p], p >= 0 && main[p] === i);
    shed.push(shedPipes[i]);
  }
  w.shed = shed;

  // Leaves: on the lit shoots near their twigs' ends (further back the deeper the species keeps its leaves),
  // the lighter the bigger; each at its node, a little on along its twig and out of the crown.
  const reach = LEAF_REACH + Math.round(LEAF_REACH_DEPTH * Math.min(1, Math.max(0, sp.foliageDepth)));
  const fromTip = new Int32Array(count).fill(1 << 20);
  for (let i = count - 1; i >= 0; i--) {
    if (!alive[i]) continue;
    const m = main[i];
    const l = lat[i];
    if (m < 0 && l < 0) fromTip[i] = 0;
    const p = par[i];
    if (p >= 0) fromTip[p] = Math.min(fromTip[p], fromTip[i] + 1);
  }
  const h = newHung();
  const heart = base + 0.5 * depth;
  for (let i = 0; i < count; i++) {
    if (!alive[i] || kind[i] === 0 || fromTip[i] > reach || light[i] < LEAF_LIGHT || py[i] < base) continue;
    const end = main[i] < 0 && lat[i] < 0;
    const t: V3 = end ? dirOf(i) : [0, 0, 0];
    const o = norm([px[i], py[i] - heart, pz[i]]);
    const r = clumpRadius(sp, clumpR, rng) * (0.8 + 0.3 * light[i]);
    hang(h, index[i], px[i] + (t[0] * HANG + o[0] * HANG_OUT) * r, py[i] + (t[1] * HANG + o[1] * HANG_OUT) * r, pz[i] + (t[2] * HANG + o[2] * HANG_OUT) * r, r);
  }

  // Smoothed, bowed by its weight, and its straight runs joined; then a tree that weeps hangs its whips.
  const unit = L;
  smoothWood(w, h);
  // (Less in a narrow crown: its wood rises steep and short-armed, and bowed it hooks.)
  sagWood(w, h, sagOf(sp) * (R / depth < NARROW ? Math.max(0.25, R / depth / NARROW) : 1), unit);
  const most = Math.round(MAX_NODES * (1 - WHIP_NODES * weep));
  const simple = simplifyWood(w, h, unit * SIMPLIFY_SPAN, most);
  if (weep <= 0) return h;
  const whips = hangWhips(sp, size, simple, clumpR, weep, rng);
  const out = newHung();
  for (let c = 0; c < h.node.length; c++) {
    if (whips.bears.has(h.node[c])) continue;
    // A tree that weeps bears most of its leaves on its whips, few along its twigs.
    if (simple.kids[h.node[c]].length > 0 && rng.chance(WEEP_TWIG_BARE * weep)) continue;
    hang(out, h.node[c], h.x[c], h.y[c], h.z[c], h.r[c]);
  }
  for (let c = 0; c < whips.h.node.length; c++) hang(out, whips.h.node[c], whips.h.x[c], whips.h.y[c], whips.h.z[c], whips.h.r[c], true);
  return out;
}

/** How far a species' wood sags under its weight, 0..1: more the more it bends down, little if it turns up. */
function sagOf(sp: TreeSpecies): number {
  return Math.min(1, Math.max(0.05, 0.35 - 0.65 * sp.bend));
}

// ---------------------------------------------------------------------------
// The wood made good: smoothed, bowed, simplified. Each moves the clumps with the nodes they hang on.

/** Laplacian smoothing (as Evergrove's): each node of a run moves part way to its neighbours' middle; forks, feet and ends stay. */
function smoothWood(w: Wood, h: Hung, passes = SMOOTH_PASSES, k = SMOOTH): void {
  const n = w.x.length;
  const x0 = Float64Array.from(w.x);
  const y0 = Float64Array.from(w.y);
  const z0 = Float64Array.from(w.z);
  const nx = new Float64Array(n);
  const ny = new Float64Array(n);
  const nz = new Float64Array(n);
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < n; i++) {
      nx[i] = w.x[i];
      ny[i] = w.y[i];
      nz[i] = w.z[i];
      const p = w.parent[i];
      if (p < 0 || w.kids[i].length !== 1) continue;
      const c = w.kids[i][0];
      nx[i] += ((w.x[p] + w.x[c]) / 2 - w.x[i]) * k;
      ny[i] += ((w.y[p] + w.y[c]) / 2 - w.y[i]) * k;
      nz[i] += ((w.z[p] + w.z[c]) / 2 - w.z[i]) * k;
    }
    for (let i = 0; i < n; i++) {
      w.x[i] = nx[i];
      w.y[i] = ny[i];
      w.z[i] = nz[i];
    }
  }
  follow(w, h, x0, y0, z0);
}

/** Each clump moved as its node has moved, from where it was. */
function follow(w: Wood, h: Hung, x0: Float64Array, y0: Float64Array, z0: Float64Array): void {
  for (let c = 0; c < h.node.length; c++) {
    const i = h.node[c];
    h.x[c] += w.x[i] - x0[i];
    h.y[c] += w.y[i] - y0[i];
    h.z[c] += w.z[i] - z0[i];
  }
}

/**
 * The wood bowed under its weight (as Evergrove's gravity): each piece turns towards straight down by an angle
 * that grows with its length and falls fast with its thickness (a beam's stiffness goes as its radius to
 * the fourth, its load slower), at most SAG_MOST, and all beyond it turns with it, so a limb's bends add up
 * along it and its twigs hang. `unit` is the length the sag is reckoned per.
 */
function sagWood(w: Wood, h: Hung, amount: number, unit: number): void {
  if (amount <= 0) return;
  const n = w.x.length;
  const r = pipeUnits(w, unit);
  const x0 = Float64Array.from(w.x);
  const y0 = Float64Array.from(w.y);
  const z0 = Float64Array.from(w.z);
  // Each node's turn, as a quaternion (x, y, z, w).
  const q = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) {
    q[4 * i + 3] = 1;
    const p = w.parent[i];
    if (p < 0) continue;
    const sx = x0[i] - x0[p];
    const sy = y0[i] - y0[p];
    const sz = z0[i] - z0[p];
    const len = Math.hypot(sx, sy, sz);
    let qx = q[4 * p];
    let qy = q[4 * p + 1];
    let qz = q[4 * p + 2];
    let qw = q[4 * p + 3];
    if (len > 1e-9) {
      const [ex, ey, ez] = rotate(qx, qy, qz, qw, sx / len, sy / len, sz / len);
      // Its axis: square to it and to straight down (d × down = (ez, 0, -ex)).
      const ax = ez;
      const azv = -ex;
      const al = Math.hypot(ax, azv);
      if (al > 1e-6) {
        const toDown = Math.acos(Math.min(1, Math.max(-1, -ey)));
        const stiff = (r[i] / SAG_STIFF) ** 3;
        const angle = Math.min(toDown, SAG_MOST, (SAG * amount * len) / unit / (1 + stiff));
        const s = Math.sin(angle / 2) / al;
        const bx = ax * s;
        const bz = azv * s;
        const bw = Math.cos(angle / 2);
        // b (about the axis, which has no y) times the parent's turn.
        const nqx = bw * qx + bx * qw + 0 * qz - bz * qy;
        const nqy = bw * qy - bx * qz + 0 * qw + bz * qx;
        const nqz = bw * qz + bx * qy - 0 * qx + bz * qw;
        const nqw = bw * qw - bx * qx - 0 * qy - bz * qz;
        qx = nqx;
        qy = nqy;
        qz = nqz;
        qw = nqw;
      }
    }
    q[4 * i] = qx;
    q[4 * i + 1] = qy;
    q[4 * i + 2] = qz;
    q[4 * i + 3] = qw;
    const [rx, ry, rz] = rotate(qx, qy, qz, qw, sx, sy, sz);
    w.x[i] = w.x[p] + rx;
    w.y[i] = w.y[p] + ry;
    w.z[i] = w.z[p] + rz;
  }
  follow(w, h, x0, y0, z0);
}

/** A vector turned by a unit quaternion. */
function rotate(qx: number, qy: number, qz: number, qw: number, vx: number, vy: number, vz: number): V3 {
  // t = 2 q × v; v' = v + w t + q × t
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [vx + qw * tx + (qy * tz - qz * ty), vy + qw * ty + (qz * tx - qx * tz), vz + qw * tz + (qx * ty - qy * tx)];
}

/**
 * The wood with the nodes that hardly bend it dropped, their neighbours joined straight (as Evergrove's):
 * every foot, fork and end is kept, and no joined piece is longer than `longest`. If that leaves more nodes
 * than `most`, again with a wider angle. A clump on a dropped node goes to the nearer kept one along its
 * twig. Returns the new wood, which `w` now is.
 */
function simplifyWood(w: Wood, h: Hung, longest: number, most: number): Wood {
  let angle = SIMPLIFY;
  for (let tries = 0; ; tries++) {
    const done = simplifyOnce(w, h, angle, longest);
    if (w.x.length <= most || tries >= 6 || !done) return w;
    angle *= 1.6;
    longest *= 1.3;
  }
}

function simplifyOnce(w: Wood, h: Hung, angle: number, longest: number): boolean {
  const n = w.x.length;
  const parent = w.parent.slice();
  const kids = w.kids.map((k) => k.slice());
  const cont = w.cont.slice();
  const shed = w.shed ? w.shed.slice() : new Array<number>(n).fill(0);
  const gone = new Uint8Array(n);
  const cos = Math.cos(angle);
  let dropped = 0;
  for (let i = 0; i < n; i++) {
    const p = parent[i];
    if (p < 0 || kids[i].length !== 1) continue;
    const c = kids[i][0];
    if (!cont[c]) continue;
    const ax = w.x[i] - w.x[p];
    const ay = w.y[i] - w.y[p];
    const az = w.z[i] - w.z[p];
    const bx = w.x[c] - w.x[i];
    const by = w.y[c] - w.y[i];
    const bz = w.z[c] - w.z[i];
    const la = Math.hypot(ax, ay, az);
    const lb = Math.hypot(bx, by, bz);
    if (la < 1e-9 || lb < 1e-9) continue;
    if ((ax * bx + ay * by + az * bz) / (la * lb) < cos) continue;
    if (Math.hypot(w.x[c] - w.x[p], w.y[c] - w.y[p], w.z[c] - w.z[p]) > longest) continue;
    parent[c] = p;
    kids[p][kids[p].indexOf(i)] = c;
    cont[c] = cont[i];
    shed[p] += shed[i];
    gone[i] = 1;
    dropped++;
  }
  if (dropped === 0) return false;
  const remap = new Int32Array(n).fill(-1);
  let m = 0;
  for (let i = 0; i < n; i++) if (!gone[i]) remap[i] = m++;
  /** The kept node a dropped one's clumps go to: the nearer of the kept ones either side of it on its run. */
  const keptFor = (i: number, x: number, y: number, z: number): number => {
    let up = i;
    while (gone[up]) up = parent[up];
    let down = i;
    while (gone[down]) down = kids[down][0];
    const du = Math.hypot(w.x[up] - x, w.y[up] - y, w.z[up] - z);
    const dd = Math.hypot(w.x[down] - x, w.y[down] - y, w.z[down] - z);
    return dd < du ? down : up;
  };
  for (let c = 0; c < h.node.length; c++) {
    const i = h.node[c];
    h.node[c] = remap[gone[i] ? keptFor(i, h.x[c], h.y[c], h.z[c]) : i];
  }
  const out = newWood();
  const outShed: number[] = [];
  for (let i = 0; i < n; i++) {
    if (gone[i]) continue;
    const j = addNode(out, w.x[i], w.y[i], w.z[i], parent[i] < 0 ? -1 : remap[parent[i]], cont[i]);
    out.stem[j] = w.stem[i];
    outShed.push(shed[i]);
  }
  w.x = out.x;
  w.y = out.y;
  w.z = out.z;
  w.parent = out.parent;
  w.cont = out.cont;
  w.kids = out.kids;
  w.stem = out.stem;
  w.shed = outShed;
  return true;
}

/**
 * Whips, hung from a share `weep` of the crown's twig ends, its outer and upper ones first: each arches out
 * a little and then hangs straight down under its weight, to as low as the crown's base (some stop
 * short), kept inside the crown's outline, and leaved along all its length. Two whips do not hang where
 * their leaves would crowd each other. Returns the twigs they hang from and their clumps.
 */
function hangWhips(sp: TreeSpecies, size: TreeSize, w: Wood, clumpR: number, weep: number, rng: Random): { bears: Set<number>; h: Hung } {
  const { crownBase: base, crownRadius: R, height: H } = size;
  const depth = Math.max(0.01, H - base);
  const rW = WHIP_CLUMP * clumpR;
  const thinK = thinGap(sp);
  const piece = 2.3 * thinK * rW;
  const gap = 2 * thinK * rW;
  const inner = new Envelope(sp, size, rW, 0.7 * rW, rW);
  const ends: number[] = [];
  for (let i = 0; i < w.x.length; i++) if (w.kids[i].length === 0 && w.parent[i] >= 0 && w.y[i] > base) ends.push(i);
  const score = (i: number) => Math.hypot(w.x[i], w.z[i]) / R + (0.5 * (w.y[i] - base)) / depth;
  const order = ends.map((i) => ({ i, s: score(i) })).sort((a, b) => b.s - a.s || a.i - b.i);
  const chosen = order.slice(0, Math.round(weep * order.length));
  let nodesLeft = MAX_NODES - w.x.length - 8;
  let clumpsLeft = Math.round(clumpCap(sp) * Math.min(1, 0.2 + WHIP_CLUMPS * weep));
  const bears = new Set<number>();
  const h = newHung();
  const lines: number[] = [];
  const path: number[] = [];
  for (const { i } of chosen) {
    if (nodesLeft < 4 || clumpsLeft < 2) break;
    const p = w.parent[i];
    const t = norm([w.x[i] - w.x[p], w.y[i] - w.y[p], w.z[i] - w.z[p]]);
    // Out from the crown's axis, and on the way the twig was going.
    const rho = Math.hypot(w.x[i], w.z[i]);
    const th = Math.hypot(t[0], t[2]);
    let hx = (th > 1e-6 ? t[0] / th : 0) + (rho > 1e-6 ? w.x[i] / rho : 0);
    let hz = (th > 1e-6 ? t[2] / th : 0) + (rho > 1e-6 ? w.z[i] / rho : 0);
    const hk = Math.hypot(hx, hz);
    if (hk < 1e-6) {
      const a = rng.range(0, 2 * Math.PI);
      hx = Math.cos(a);
      hz = Math.sin(a);
    } else {
      hx /= hk;
      hz /= hk;
    }
    const stop = base + 0.8 * rW + (w.y[i] - base) * WHIP_STAGGER * rng.next() ** 2;
    if (w.y[i] - stop < 2 * piece) continue;
    let e = Math.min(WHIP_RISE, Math.max(WHIP_DIP, Math.asin(Math.max(-1, Math.min(1, t[1])))));
    let x = w.x[i];
    let y = w.y[i];
    let z = w.z[i];
    let sx = 0;
    let sz = 0;
    let hangAt = -1;
    path.length = 0;
    for (let k = 0; k < 64 && path.length < 3 * nodesLeft; k++) {
      e = Math.max(-0.5 * Math.PI, e - WHIP_TURN);
      // It sways a little as it hangs, by how crooked the species is.
      const j = rng.onSphere();
      sx = 0.7 * sx + 0.12 * sp.crooked * j[0];
      sz = 0.7 * sz + 0.12 * sp.crooked * j[2];
      const c = Math.cos(e);
      const d = norm([c * hx + sx + 0.04 * hx, Math.sin(e), c * hz + sz + 0.04 * hz]);
      let nx = x + d[0] * piece;
      const ny = y + d[1] * piece;
      let nz = z + d[2] * piece;
      if (ny < stop) break;
      // Inside the crown's outline: drawn in to it (its arch, from a twig at the crown's edge, follows the
      // edge round), and ended where the outline narrows fast under it as it hangs.
      const wd = inner.width(ny);
      if (wd < 0) break;
      const r = Math.hypot(nx, nz);
      if (r > wd) {
        if (hangAt >= 0 && r - wd > 0.7 * piece) break;
        nx *= wd / r;
        nz *= wd / r;
      }
      x = nx;
      y = ny;
      z = nz;
      path.push(x, y, z);
      if (hangAt < 0 && e <= -0.5 * Math.PI + 1e-6) hangAt = path.length - 3;
    }
    const pieces = path.length / 3;
    if (pieces < 2) continue;
    // Where it hangs, seen from above: not on another's line.
    const at = hangAt >= 0 ? hangAt : path.length - 3;
    const lx = path[at];
    const lz = path[at + 2];
    let free = true;
    for (let k = 0; k < lines.length && free; k += 2) if (Math.hypot(lines[k] - lx, lines[k + 1] - lz) < gap) free = false;
    if (!free) continue;
    lines.push(lx, lz);
    bears.add(i);
    let q = i;
    const n = Math.min(pieces, nodesLeft, clumpsLeft);
    for (let k = 0; k < n; k++) {
      q = addNode(w, path[3 * k], path[3 * k + 1], path[3 * k + 2], q, true);
      const r = rW * Math.min(1.3, Math.max(0.75, 1 + 0.25 * sp.clumpSpread * rng.gauss()));
      hang(h, q, w.x[q], w.y[q] - 0.15 * r, w.z[q], r);
    }
    nodesLeft -= n;
    clumpsLeft -= n;
  }
  return { bears, h };
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
  const profile = profileOf(sp);
  const profileAt = (y: number) => profile((y - base) / depth) * R;
  const spacing = 1 / Math.max(0.05, sp.whorlsPerMetre);
  const top = H - 1.1 * clumpR;
  const segLen = Math.max(0.05, BOUGH_STEP * R);
  const h = newHung();
  const shed: number[] = [];
  w.shed = shed;
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
      if (!rng.chance(sp.branchiness) || w.x.length >= MAX_NODES - 40) {
        shed[i] += 1;
        continue;
      }
      const az = turn + (2 * Math.PI * b) / per + rng.range(-0.4, 0.4) * (2 * Math.PI) / per;
      const angle = branchAngle(sp, rng);
      const planned = plan(lv.y, angle);
      const { line, n } = planned;
      // Not every bough is whole: some were broken or shaded back, and stop short.
      const len = planned.len * (rng.chance(BOUGH_BROKEN) ? rng.range(0.45, 0.8) : rng.range(0.85, 1));
      // A bough whose leaves would hang below the crown's base is in the shade of those above: it has
      // died and fallen, as a forest tree's lower boughs do (the trunk keeps its wood).
      const leafFrom = Math.min(n, Math.max(1, Math.ceil(n * (1 - shell))));
      if (lv.y + Math.min(line.v[leafFrom], line.v[n]) * len - 1.25 * clumpR < base - 0.25 * clumpR) {
        shed[i] += 0.5 * n;
        continue;
      }
      const ca = Math.cos(az);
      const sa = Math.sin(az);
      // Along the bough, a wander square to it, side to side and up and down, by how crooked the species is.
      let jitter = 0;
      let heave = 0;
      let prev = i;
      const bough: number[] = [];
      for (let k = 1; k <= n; k++) {
        jitter += (0.15 * sp.crooked * len * rng.gauss()) / n;
        heave += (0.1 * sp.crooked * len * rng.gauss()) / n;
        const hh = line.h[k] * len;
        const x = w.x[i] + hh * ca - jitter * sa;
        const z = w.z[i] + hh * sa + jitter * ca;
        prev = addNode(w, x, lv.y + line.v[k] * len + heave, z, prev, k > 1);
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
  // Smoothed, bowed a little by its weight (its boughs' droop is grown already), and its straight runs joined.
  smoothWood(w, h);
  sagWood(w, h, CONIFER_SAG * sagOf(sp), segLen);
  simplifyWood(w, h, 4 * segLen, MAX_NODES);
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
// Palms: one stem, and a head of fronds.

/** A frond's line, of unit length: from `rise` over the level, arching down by `curve`, more towards its tip, in n pieces. */
function frondLine(rise: number, curve: number, n: number): { h: number[]; v: number[] } {
  const h = [0];
  const v = [0];
  for (let k = 0; k < n; k++) {
    const s = (k + 0.5) / n;
    const e = Math.max(FROND_HANG, rise - curve * s * Math.sqrt(s));
    h.push(h[k] + Math.cos(e) / n);
    v.push(v[k] + Math.sin(e) / n);
  }
  return { h, v };
}

function palm(sp: TreeSpecies, size: TreeSize, rng: Random, w: Wood, clumpR: number): Hung {
  const { height: H, crownRadius: R, crownBase: base } = size;
  const depth = Math.max(0.01, H - base);
  // Where a clump's centre may be: in the crown, with room for the clump (and for a big one under it).
  const inner = new Envelope(sp, size, clumpR, 1.2 * clumpR, clumpR);
  const heart = Math.min(inner.hi - 0.05 * depth, Math.max(inner.lo + 0.05 * depth, base + PALM_HEART * depth));
  const knob = Math.min(PALM_KNOB_MAX, PALM_KNOB * depth, 0.5 * (heart - inner.lo));
  const arch = Math.min(1, Math.max(0, 0.5 * (1 - sp.bend)));
  const fronds = Math.max(3, Math.round(sp.whorl));
  const h = newHung();
  const radius: number[] = [];
  w.radius = radius;

  // The stem: from its foot, bowed once by how crooked it is (a lean it has grown out of, upright at its
  // top), as thick at its top as at breast height, and swollen at its foot.
  const bh = breastHeight(size);
  const swell = (y: number) => 1 + PALM_SWELL * Math.exp(-Math.max(0, y) / PALM_SWELL_HEIGHT);
  const stemR = (y: number) => (size.trunkRadius * swell(y)) / swell(bh);
  const lean = rng.range(0, 2 * Math.PI);
  const bow = PALM_BOW * sp.crooked * heart;
  const stemAt = (y: number): [number, number] => {
    const u = Math.min(1, Math.max(0, y / heart));
    const b = bow * (1 - (1 - u) * (1 - u));
    return [b * Math.cos(lean), b * Math.sin(lean)];
  };
  // (Closer at the foot, where it swells.)
  const clear = heart - knob;
  const heights = [0, Math.min(0.25, 0.3 * clear), Math.min(0.6, 0.6 * clear)];
  const steps = Math.max(1, Math.ceil((clear - heights[2]) / TRUNK_STEP));
  for (let k = 1; k <= steps; k++) heights.push(heights[2] + ((clear - heights[2]) * k) / steps);
  for (let k = 1; k <= PALM_KNOB_NODES; k++) heights.push(clear + (knob * k) / PALM_KNOB_NODES);
  let prev = -1;
  const knobNodes: number[] = [];
  for (let k = 0; k < heights.length; k++) {
    const y = heights[k];
    const [x, z] = stemAt(y);
    prev = addNode(w, x, y, z, prev, true);
    radius.push(stemR(y));
    if (k >= heights.length - PALM_KNOB_NODES - 1) knobNodes.push(prev);
  }
  const top = radius[radius.length - 1];

  // The fronds, the youngest first: round the stem by the golden angle, from nearly upright to hanging,
  // the older ones leaving the stem lower down. Each arches over by its weight, and is as long as the
  // crown lets it be.
  const piece = 2.1 * thinGap(sp) * clumpR;
  const turn = rng.range(0, 2 * Math.PI);
  // (The oldest first: where crowded clumps are thinned, the lowest leaves are kept.)
  for (let f = fronds - 1; f >= 0; f--) {
    const age = Math.min(1, Math.max(0, (f + rng.range(0.2, 0.8)) / fronds));
    const at = knobNodes[Math.round((1 - age) * (knobNodes.length - 1))];
    const az = turn + f * GOLDEN_ANGLE + rng.range(-0.1, 0.1);
    const ca = Math.cos(az);
    const sa = Math.sin(az);
    const rise = FROND_YOUNG + (FROND_OLD - FROND_YOUNG) * age + 4 * DEG * rng.gauss();
    const curve = arch * FROND_ARCH * (0.35 + 0.65 * Math.max(0, Math.cos(rise)));
    const ax = w.x[at];
    const ay = w.y[at];
    const az0 = w.z[at];
    const longest = (n: number, most: number) => {
      const line = frondLine(rise, curve, n);
      const fits = (len: number) => {
        for (let k = 1; k <= n; k++) {
          const y = ay + line.v[k] * len;
          const wd = inner.width(y);
          if (wd < 0 || Math.hypot(ax + line.h[k] * len * ca, az0 + line.h[k] * len * sa) > wd) return false;
        }
        return true;
      };
      let lo = 0;
      let hi = most;
      for (let i = 0; i < 24; i++) {
        const m = 0.5 * (lo + hi);
        if (fits(m)) lo = m;
        else hi = m;
      }
      return { line, len: lo };
    };
    const first = longest(16, 2 * R + depth);
    // (In a crown with no room for it, a frond is a stub, and has no leaves.)
    if (first.len < 0.5 * clumpR) continue;
    const n = Math.min(FROND_PIECES_MAX, Math.max(FROND_PIECES_MIN, Math.round(first.len / piece)));
    const { line, len } = longest(n, first.len * rng.range(0.92, 1));
    const r0 = Math.min(0.5 * top, Math.max(0.008, RACHIS * len));
    // A little wander square to the frond, by how crooked the species is.
    let jitter = 0;
    let q = at;
    for (let k = 1; k <= n; k++) {
      jitter += (0.06 * sp.crooked * len * rng.gauss()) / n;
      const hh = line.h[k] * len;
      q = addNode(w, ax + hh * ca - jitter * sa, ay + line.v[k] * len, az0 + hh * sa + jitter * ca, q, k > 1);
      radius.push(r0 * (1 - ((1 - RACHIS_TIP) * k) / n));
      if (k / n < FROND_LEAFY) continue;
      // Its leaflets, along it: they hang a little under the rachis.
      const r = clumpRadius(sp, clumpR, rng);
      hang(h, q, w.x[q], w.y[q] - 0.15 * r, w.z[q], r);
    }
  }
  return h;
}

// ---------------------------------------------------------------------------
// For every tree: thin the clumps, fit to size, the radii, and the arrays.

function finish(sp: TreeSpecies, size: TreeSize, w: Wood, hung: Hung): GrownTree {
  const env = new Envelope(sp, size);
  const keep = thin(sp, env, hung);
  fit(size, w, hung, keep);
  if (sp.architecture !== "palm") keepToOutline(env, w, hung);

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
  skeleton.radius.set(w.radius ?? pipeRadii(size, w));
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
    tx: new Float32Array(m),
    ty: new Float32Array(m),
    tz: new Float32Array(m),
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
    // Its twig's way: from the node's parent to the node (a stem's foot, up).
    const nd = hung.node[c];
    const p = w.parent[nd];
    const t: V3 = p >= 0 ? norm([w.x[nd] - w.x[p], w.y[nd] - w.y[p], w.z[nd] - w.z[p]]) : [0, 1, 0];
    clumps.tx[k] = t[0];
    clumps.ty[k] = t[1];
    clumps.tz[k] = t[2];
  }
  return { size, skeleton, clumps };
}

/** How close two clumps may be, as a share of their radii summed. */
function thinGap(sp: TreeSpecies): number {
  return (THIN + THIN_OPEN * sp.openness) * (sp.architecture === "palm" ? PALM_THIN : 1);
}

/** How many clumps a tree of a species keeps, at most. */
function clumpCap(sp: TreeSpecies): number {
  if (sp.architecture === "palm") return Math.round(MAX_CLUMPS * PALM_CLUMPS);
  return Math.round(MAX_CLUMPS * (1 + WEEP_CLUMPS * weepOf(sp)));
}

/** A species' share of whips, 0..1 (none for a conifer or a palm, which do not grow them). */
function weepOf(sp: TreeSpecies): number {
  if (sp.architecture !== "broadleaf" && sp.architecture !== "shrub") return 0;
  return Math.min(1, Math.max(0, sp.weep ?? 0));
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
  // A clump whose centre is out of the crown's outline, or that hangs half out of its base (or by more than
  // a twentieth of the crown's depth), is out of the light the crown grows to: dropped.
  const within = (c: number) =>
    Math.hypot(h.x[c], h.z[c]) <= env.width(Math.min(env.hi, Math.max(env.lo, h.y[c]))) &&
    h.y[c] - 0.5 * h.r[c] >= env.lo &&
    h.y[c] - h.r[c] >= env.lo - 0.05 * (env.hi - env.lo);
  // (A whip's leaves first: a weeping tree is its curtain.)
  const byOuter = Array.from({ length: count }, (_, c) => c)
    .filter(within)
    .sort((a, b) => Number(h.whip[b]) - Number(h.whip[a]) || outer[a] - outer[b] || a - b);
  let rMax = 0;
  for (let c = 0; c < count; c++) rMax = Math.max(rMax, h.r[c]);
  const pass = (k: number): number[] => {
    const cell = Math.max(1e-3, 2 * rMax * k);
    // A hashed grid: each cell's clumps chained through `next`, its first in `head`.
    const size = 4096;
    const head = new Int32Array(size).fill(-1);
    const next = new Int32Array(count).fill(-1);
    const key = (ix: number, iy: number, iz: number) => (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791)) & (size - 1);
    const kept: number[] = [];
    for (const c of byOuter) {
      const ix = Math.floor(h.x[c] / cell);
      const iy = Math.floor(h.y[c] / cell);
      const iz = Math.floor(h.z[c] / cell);
      let free = true;
      for (let a = -1; a <= 1 && free; a++)
        for (let b = -1; b <= 1 && free; b++)
          for (let d = -1; d <= 1 && free; d++) {
            for (let o = head[key(ix + a, iy + b, iz + d)]; o >= 0; o = next[o]) {
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
      const kc = key(ix, iy, iz);
      next[c] = head[kc];
      head[kc] = c;
    }
    return kept;
  };
  // Clumps fill a shell, so their count goes as the spacing's inverse square: each pass widens it by
  // that, and a little more, so few passes are needed.
  let k = thinGap(sp);
  const most = clumpCap(sp);
  let kept = pass(k);
  // A weeping tree keeps its whips' leaves as they are, and loses the deepest of the rest.
  if (weepOf(sp) > 0) return kept.slice(0, most).sort((a, b) => a - b);
  for (let tries = 0; tries < 4 && kept.length > most; tries++) {
    k *= 1.05 * Math.sqrt(kept.length / most);
    kept = pass(k);
  }
  return kept.sort((a, b) => a - b);
}

/**
 * What the fit and the wood's sag pushed out of the crown's outline is drawn back in to it, square to the
 * trunk, its clumps with it (and any clump still out, after it): a twig the shears would have taken.
 */
function keepToOutline(env: Envelope, w: Wood, h: Hung): void {
  const n = w.x.length;
  const dx = new Float64Array(n);
  const dz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (w.parent[i] < 0) continue;
    const wd = env.width(Math.min(env.hi, Math.max(env.lo, w.y[i])));
    const d = Math.hypot(w.x[i], w.z[i]);
    if (wd <= 0 || d <= wd) continue;
    const k = wd / d;
    dx[i] = w.x[i] * (k - 1);
    dz[i] = w.z[i] * (k - 1);
    w.x[i] += dx[i];
    w.z[i] += dz[i];
  }
  for (let c = 0; c < h.node.length; c++) {
    h.x[c] += dx[h.node[c]];
    h.z[c] += dz[h.node[c]];
    const wd = env.width(Math.min(env.hi, Math.max(env.lo, h.y[c])));
    const d = Math.hypot(h.x[c], h.z[c]);
    if (wd > 0 && d > wd) {
      h.x[c] *= wd / d;
      h.z[c] *= wd / d;
    }
  }
}

/**
 * Fit the grown tree to its size: across, about its axis, so its outermost clump reaches the crown
 * radius; and up, so its highest leaf is at its height and (when the growing missed it by more than a
 * little) its lowest at its crown's base, stretching the crown and the trunk under it apart. The growing
 * aims at all three already; this takes up what it misses by.
 */
function fit(size: TreeSize, w: Wood, h: Hung, keep: number[]): void {
  let reach = 0;
  let topY = 0;
  let lowY = Infinity;
  for (const c of keep) {
    reach = Math.max(reach, Math.hypot(h.x[c], h.z[c]) + h.r[c]);
    topY = Math.max(topY, h.y[c] + h.r[c]);
    lowY = Math.min(lowY, h.y[c] - h.r[c]);
  }
  for (let i = 0; i < w.y.length; i++) topY = Math.max(topY, w.y[i]);
  const across = reach > 0 ? (FIT_REACH * size.crownRadius) / reach : 1;
  const depth = Math.max(0.01, size.height - size.crownBase);
  // The pivot: the crown's base, or its lowest leaf if that is off the base and there is trunk under it to stretch.
  let from = size.crownBase;
  let to = size.crownBase;
  const off = lowY - size.crownBase;
  if (Number.isFinite(lowY) && (off > FIT_LOW * depth || off < -FIT_HANG * depth) && lowY > 0.01 * size.height && size.crownBase > 0.03 * size.height) {
    from = lowY;
    to = size.crownBase + 0.5 * FIT_LOW * depth;
  }
  const upward = topY > from ? (FIT_TOP * size.height - to) / (topY - from) : 1;
  const stretch = (y: number) => (y > from ? to + (y - from) * upward : from > 0 ? (y * to) / from : y);
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
 * The pipe model (Shinozaki et al. 1964, after da Vinci), with a twig's end 1: a branch's cross-section,
 * r^PIPE, carries all the twigs beyond it, the pipes of the branches it has shed, and the disused pipes
 * its own length has gathered. `unit` is an internode's length.
 */
function pipeUnits(w: Wood, unit: number): Float64Array {
  const n = w.x.length;
  const pipes = new Float64Array(n);
  const r = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let a = w.shed ? w.shed[i] : 0;
    const kids = w.kids[i];
    if (kids.length === 0) a += 1;
    for (const c of kids) {
      const len = Math.hypot(w.x[c] - w.x[i], w.y[c] - w.y[i], w.z[c] - w.z[i]);
      a += pipes[c] * (1 + (DISUSED * len) / unit);
    }
    pipes[i] = a;
    r[i] = a ** (1 / PIPE);
  }
  return r;
}

/** An internode's length on a tree of a size: the crown's size over INTERNODES. */
function unitOf(size: TreeSize): number {
  return Math.cbrt(size.crownRadius * size.crownRadius * Math.max(0.01, size.height - size.crownBase)) / INTERNODES;
}

/**
 * The radii (m): the pipe model's, each stem then scaled so its radius at breast height is the size's
 * trunk radius (a shrub's stems all have it).
 */
function pipeRadii(size: TreeSize, w: Wood): Float64Array {
  const n = w.x.length;
  const r = pipeUnits(w, unitOf(size));
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
