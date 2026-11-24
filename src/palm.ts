// Palms, grown as palms: one stem from one growing tip, and a crown of a few dozen huge leaves.
//
// A palm is a monocot. It does not branch: its single stem grows from one tip and is about as thick at its
// top as near its foot (a fan palm's swells at its foot), and it carries the record of every leaf it has
// shed (a Canary palm's diamond lattice of leaf bases, a fan palm's rings). Its crown is its leaves, set
// round that tip one after another by the golden angle (137.5 degrees), each standing as its age has it: the
// unopened spear upright in the middle, young leaves rising, mature ones arching out, old ones drooping, and
// dead ones hanging against the stem (a Washingtonia's petticoat) until they fall or are cut.
//
// So a palm is not grown as the other trees are (grow.ts, a skeleton of branches hung with clumps). Its
// leaves are laid out here as data the drawing reads directly: each frond its rachis (a curve), the frame of
// its leaf along it, its length and width, its age and colour; a feather palm's leaflets in two rows along
// its rachis, folded up in a V (a Canary palm's stiff ones) or in several planes (a queen palm's soft
// plumose ones), and a fan palm's pleated fan at the end of its long stalk, its segments split and drooping
// at their tips. And what it is pruned to: on a course a Canary palm is mostly "pineapple cut" (its old leaf
// bases trimmed into a ball under the crown), a fan palm skinned clean, its dead skirt taken off.
//
// It is still a GrownTree (tree.ts): its stem and its fronds' rachises are the skeleton, and clumps strung
// along its leaves stand for them where the rest of the library needs clumps (its box of light, its lobes,
// its shade on the ground). And it keeps to its envelope: its height, its crown's radius and base, which are
// what a ball meets.
//
// Plain arithmetic, no three: the tests read it as it is.

import { type TreeSpecies } from "./species.ts";
import { type Clumps, type GrownTree, type Skeleton, type TreeSize } from "./tree.ts";
import { Random } from "./random.ts";

const DEG = Math.PI / 180;
/** The golden angle: each leaf of a palm's crown stands this far round from the one before it. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** A feather palm's leaf (pinnate: leaflets along a rachis) or a fan palm's (palmate: a pleated fan on a stalk). */
export type PalmLeaf = "feather" | "fan";
export const PALM_LEAVES: readonly PalmLeaf[] = ["feather", "fan"];

/**
 * How a palm is kept: `natural`, every leaf it has, the dead hanging under the green (a fan palm's skirt to
 * the ground in the wild); `skirt`, its dead leaves cut back to a short skirt under the crown; `skinned`, the
 * dead and the drooping leaves cut off and its stem cleaned; `pineapple`, its leaves cut back to those above
 * the level and its old leaf bases trimmed into a ball under the crown (a Canary palm on a course).
 */
export type Pruning = "natural" | "skirt" | "skinned" | "pineapple";
export const PRUNINGS: readonly Pruning[] = ["natural", "skirt", "skinned", "pineapple"];

/** A frond's age, as it stands: the spear, young, mature, old, dead. */
export type FrondClass = "spear" | "young" | "mature" | "old" | "dead";
export const FROND_CLASSES: readonly FrondClass[] = ["spear", "young", "mature", "old", "dead"];

/** Which picture a frond, a fan or a skirt is drawn with (palmAtlas.ts lays them out). */
export const PALM_CELL = { feather: 0, queen: 1, skirt: 2, fan: 3, fanB: 4, fanFar: 5 } as const;

/** One frond: its rachis from its foot on the stem, the frame of its leaf along it, and what it is. */
export interface Frond {
  cls: FrondClass;
  /** 0 the youngest (the spear) to 1 the oldest green leaf; past 1, dead. */
  age: number;
  /** Which way round the stem it leaves (radians, from +x towards +z). */
  azimuth: number;
  /** Points along its rachis (m, the tree's frame), its foot first. */
  points: number[][];
  /** At each point: the share of its length, which way it runs (unit), across its leaf (unit), its leaf's up (unit). */
  s: number[];
  tangent: number[][];
  across: number[][];
  up: number[][];
  /** Its whole length (m), stalk and leaf. */
  length: number;
  /** The share of its length that is bare stalk (a feather palm's petiole, a fan palm's long stalk). */
  bare: number;
  /** A feather palm's: how far its leaflets reach either side of the rachis, at the widest (m). A fan's: its blade's radius (m). */
  width: number;
  /** How far its leaflets fold up out of its leaf's plane (radians): a feather palm's V; a fan's fold along its costa. */
  fold: number;
  /** A second rank of leaflets drooping from the rachis, 0..1 (a queen palm's plumose leaf). */
  plumose: number;
  /** How far a fan's segments droop past where they split, 0..1. */
  droop: number;
  /** How dead it is, 0 green to 1 dead and dry; and how light, about 1. */
  dead: number;
  tone: number;
  /** How freely it moves in the wind, about 1 (a spear hardly, a dead frond freely). */
  flex: number;
  /** A number of its own, 0..1. */
  own: number;
  /** Its picture (`PALM_CELL`). */
  cell: number;
  /** A fan's blade: where its stalk ends (the hastula), its blade's way out and its up there (unit). */
  hastula?: number[];
  bladeDir?: number[];
  bladeUp?: number[];
}

/** The stem, as rings up it: where its centre is, its radius, and what its surface is (0 its bark, 2 a pineapple's trimmed leaf bases, 3 old leaf bases, boots). */
export interface PalmStem {
  x: number[];
  y: number[];
  z: number[];
  radius: number[];
  surface: number[];
}
export const STEM_BARK = 0;
export const STEM_PINEAPPLE = 2;
export const STEM_BOOTS = 3;

/**
 * How far a skirt stands out from its stem's surface at a share `k` of the way down it (0 its top, 1 its foot):
 * a rounded shoulder tucked in under the crown, widest a tenth of the way down, then tapering steadily, a
 * carrot's, to its narrow foot.
 */
export function skirtOut(sk: Skirt, k: number): number {
  const shoulder = 0.35 + 0.65 * Math.min(1, k / 0.1) * (2 - Math.min(1, k / 0.1));
  const taper = Math.max(0, (k - 0.1) / 0.9);
  return shoulder * (sk.outTop + (sk.outBottom - sk.outTop) * Math.pow(taper, 1.15));
}

/**
 * How weathered a skirt's dead leaves are at a share `k` of the way down it, `tall` metres long: 0 freshly dead
 * tan (its top metre or two: all of a skirt cut back short, the top tenth or so of a wild one), 1 old silver-grey.
 */
export function skirtWeathered(k: number, tall: number): number {
  const t = Math.min(1, Math.max(0, (k * tall - 0.6) / 1.5));
  return t * t * (3 - 2 * t);
}

/** A skirt of dead leaves hanging against the stem: from under the green crown down. */
export interface Skirt {
  top: number;
  bottom: number;
  /** How far it stands out from the stem's surface (m), at its top and its bottom. */
  outTop: number;
  outBottom: number;
}

/** What makes a palm's crown, beside the skeleton every tree has. */
export interface PalmCrown {
  leaf: PalmLeaf;
  pruning: Pruning;
  /** Where the crown's fronds leave the stem: its growing tip. */
  heart: number[];
  fronds: Frond[];
  stem: PalmStem;
  /** A pineapple cut's ball: from and to (m up), and its widest radius (m). */
  ball: { y0: number; y1: number; radius: number } | null;
  /** Old leaf bases kept on the stem, from and to (m up). */
  boots: { y0: number; y1: number } | null;
  skirt: Skirt | null;
  /** Its green leaves' area, one side (m²). */
  leafArea: number;
}

/** How a kind of palm leaf is made, before its species says more. */
interface LeafForm {
  /** Length of a mature frond beside the crown's radius (it arches out and down). */
  reach: number;
  /** Leaflets' reach either side, or a fan blade's radius, over the frond's length. */
  width: number;
  bare: number;
  fold: number;
  /** How far a mature frond arches down along its length (radians), at bend 0. */
  arch: number;
  /** Elevation at its foot (degrees over the level) through the crown's ages: young, mature, old. */
  rise: [number, number, number, number];
  /** How deep (m per metre of frond) the leaves' feet go down the stem, the youngest to the oldest. */
  knob: number;
}

const FORMS: Readonly<Record<PalmLeaf, LeafForm>> = {
  // (A Canary palm's leaves: arching, 3–6 m, leaflets to 40 cm each side in a V; the young near upright, the
  // mature out level and arching, the old down to 100–130° from upright: MORPHOLOGY.md.)
  feather: { reach: 1.02, width: 0.14, bare: 0.16, fold: 30 * DEG, arch: 62 * DEG, rise: [80, 58, 18, -32], knob: 0.22 },
  // (A fan palm's: a long stalk, a blade at its end; held up and out, 20–60° from upright, old ones
  // drooping, the dead hanging straight down.)
  // (A blade 0.6–1.35 m across on a leaf 2–2.5 m long, its stalk about half of it (W. robusta; W. filifera's
  // twice as long, its blade 1–1.8 m): MORPHOLOGY.md 23 and 31. The old green leaves hang 30–60 degrees below
  // the level before they die.)
  // (The owner's reference pictures of a course's W. robusta have its head a sunburst of fans held out, not up:
  // its young leaves at 50 degrees over the level, its mature at 15, within the 20–60 degrees from upright of
  // MORPHOLOGY.md 23 for the green crown, at its wide end; their feet down the top 2 m of its stem (SMM), round
  // its collar of boots, not all from its tip.)
  fan: { reach: 1.0, width: 0.31, bare: 0.55, fold: 9 * DEG, arch: 18 * DEG, rise: [84, 50, 15, -48], knob: 0.6 },
};

/** A species' palm leaf (feather unless it says fan). */
export function leafOf(sp: TreeSpecies): PalmLeaf {
  return sp.palmLeaf ?? "feather";
}

/** How a species' palms are kept unless a tree says otherwise: its own word, else a feather palm pineapple cut and a fan palm skinned (as on a course). */
export function pruningOf(sp: TreeSpecies, over?: Pruning): Pruning {
  return over ?? sp.pruning ?? (leafOf(sp) === "fan" ? "skinned" : "pineapple");
}

/** Its elevation at its foot (radians) for its age, 0 the youngest to 1 the oldest green leaf. */
function riseAt(form: LeafForm, age: number): number {
  const [spear, young, mature, old] = form.rise;
  const a = Math.min(1, Math.max(0, age));
  const d = a < 0.15 ? spear + (young - spear) * (a / 0.15) : a < 0.6 ? young + (mature - young) * ((a - 0.15) / 0.45) : mature + (old - mature) * ((a - 0.6) / 0.4);
  return d * DEG;
}

function classOf(age: number, spear: boolean): FrondClass {
  if (spear) return "spear";
  if (age > 1) return "dead";
  return age < 0.2 ? "young" : age < 0.62 ? "mature" : "old";
}

const norm = (v: number[]): number[] => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: number[], b: number[]): number[] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** `v` turned by `ang` about the unit axis `k` (Rodrigues). */
function rotate(v: number[], k: number[], ang: number): number[] {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const kv = cross(k, v);
  const d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  return [v[0] * c + kv[0] * s + k[0] * d * (1 - c), v[1] * c + kv[1] * s + k[1] * d * (1 - c), v[2] * c + kv[2] * s + k[2] * d * (1 - c)];
}

/** What is planned of one frond before it is laid out at its length. */
interface FrondPlan {
  cls: FrondClass;
  age: number;
  azimuth: number;
  /** How far down the stem its foot is below the heart (m per metre of frond length). */
  drop: number;
  rise: number;
  arch: number;
  twist: number;
  lengthK: number;
  widthK: number;
  fold: number;
  plumose: number;
  droop: number;
  dead: number;
  tone: number;
  flex: number;
  own: number;
  cell: number;
  wander: number;
  /** A fan's blade turned about its own line (radians). */
  roll: number;
}

/**
 * A skinned fan palm's head less deep than this many of its radii may have its hanging green leaves cut
 * (`growPalm`'s fit), at this cost to the fit for each share of them cut.
 */
const PALM_HANG_DEEP = 1.4;
const PALM_CUT_COST = 0.6;

/** Points along a frond's rachis: POINTS pieces, the last ones shorter (a frond bends most towards its tip). */
const POINTS = 14;

/**
 * Lay a frond out at length `L` from its foot: its rachis arching down from `rise` by `arch` (more towards its
 * tip, and never past hanging), its leaf's frame turning about it by `twist` towards its tip.
 */
function layFrond(p: FrondPlan, foot: number[], L: number, form: LeafForm, sp: TreeSpecies): Frond {
  const ca = Math.cos(p.azimuth);
  const sa = Math.sin(p.azimuth);
  const points: number[][] = [foot];
  const s: number[] = [0];
  const tangent: number[][] = [];
  const across: number[][] = [];
  const up: number[][] = [];
  const hang = -88 * DEG;
  const frame = (e: number, k: number) => {
    const t = [Math.cos(e) * ca, Math.sin(e), Math.cos(e) * sa];
    const a0 = [-sa, 0, ca];
    const n0 = cross(a0, t);
    const tw = p.twist * k * k;
    return { t, a: rotate(a0, t, tw), n: rotate(n0, t, tw) };
  };
  let at = foot;
  for (let i = 0; i <= POINTS; i++) {
    const k = i / POINTS;
    const e = Math.max(hang, p.rise - p.arch * k ** 1.5);
    const f = frame(e, k);
    tangent.push(f.t);
    across.push(f.a);
    up.push(f.n);
    if (i < POINTS) {
      const kk = (i + 0.5) / POINTS;
      const em = Math.max(hang, p.rise - p.arch * kk ** 1.5);
      const step = L / POINTS;
      // (A little wander sideways, as a real rachis has.)
      const side = p.wander * Math.sin((i + 1) * 0.9 + p.own * 6) * step;
      at = [at[0] + Math.cos(em) * ca * step - sa * side, at[1] + Math.sin(em) * step, at[2] + Math.cos(em) * sa * step + ca * side];
      points.push(at);
      s.push((i + 1) / POINTS);
    }
  }
  const fr: Frond = {
    cls: p.cls,
    age: p.age,
    azimuth: p.azimuth,
    points,
    s,
    tangent,
    across,
    up,
    length: L,
    bare: sp.palmLeaf === "fan" ? form.bare : Math.min(0.5, form.bare * (sp.plumose ? 1.6 : 1)),
    width: L * form.width * (sp.frondWidth ?? 1) * p.widthK,
    fold: p.fold,
    plumose: p.plumose,
    droop: p.droop,
    dead: p.dead,
    tone: p.tone,
    flex: p.flex,
    own: p.own,
    cell: p.cell,
  };
  if (leafOf(sp) === "fan") {
    // The blade at the stalk's end: held tilted up from the stalk's line (a dead one folded down), its stalk
    // running on into it a little way (costapalmate).
    const end = points.length - 1 - Math.round(POINTS * (1 - fr.bare));
    const h = points[Math.max(1, end)];
    const t = tangent[Math.max(1, end)];
    const n = up[Math.max(1, end)];
    const a = across[Math.max(1, end)];
    const tilt = p.cls === "dead" ? -55 * DEG : p.cls === "spear" ? 5 * DEG : 12 * DEG - 26 * DEG * Math.max(0, p.age - 0.5);
    fr.hastula = h;
    fr.bladeDir = rotate(t, a, -tilt);
    // (Each blade turned on its own about its line, held stiffly at whatever angle it opened: seen from below
    // or across the crown, many stand edge-on.)
    fr.bladeUp = rotate(rotate(n, a, -tilt), fr.bladeDir, p.roll);
  }
  return fr;
}

/** Every point of a frond's leaf a ball would meet: its rachis, its leaflets' edges, its fan's rim (for the envelope). */
export function frondSurface(f: Frond): number[][] {
  const out: number[][] = [];
  if (f.hastula && f.bladeDir && f.bladeUp) {
    for (let i = 0; i < f.points.length; i++) if (f.s[i] <= f.bare + 1e-6) out.push(f.points[i]);
    const a = norm(cross(f.bladeUp, f.bladeDir));
    for (let r = 1; r <= 3; r++)
      for (let k = -6; k <= 6; k++) {
        const th = (k / 6) * FAN_SPREAD;
        const p = fanPoint(f, th, r / 3, a, 0);
        out.push(p);
      }
    return out;
  }
  for (let i = 0; i < f.points.length; i++) {
    out.push(f.points[i]);
    if (f.s[i] < f.bare) continue;
    const w = f.width * leafletProfile(f.s[i]);
    for (const side of [-1, 1]) {
      const c = Math.cos(f.fold) * w * side;
      const u = Math.sin(f.fold) * w;
      out.push([f.points[i][0] + f.across[i][0] * c + f.up[i][0] * u, f.points[i][1] + f.across[i][1] * c + f.up[i][1] * u, f.points[i][2] + f.across[i][2] * c + f.up[i][2] * u]);
      if (f.plumose > 0) {
        const fd = -0.6 * f.fold - 25 * DEG;
        const c2 = Math.cos(fd) * w * side * 0.9;
        const u2 = Math.sin(fd) * w * 0.9;
        out.push([f.points[i][0] + f.across[i][0] * c2 + f.up[i][0] * u2, f.points[i][1] + f.across[i][1] * c2 + f.up[i][1] * u2, f.points[i][2] + f.across[i][2] * c2 + f.up[i][2] * u2]);
      }
    }
  }
  return out;
}

/** How far a feather frond's leaflets reach either side at a share of its length, over their widest: narrow at its foot and tip. */
export function leafletProfile(s: number): number {
  const k = Math.min(1, Math.max(0, s * 0.97 + 0.02));
  return 0.32 + 0.68 * Math.sqrt(Math.sin(Math.PI * k));
}

/** A fan's blade spreads this far either side of its stalk's line (radians): the rest of the round is where the stalk comes in. */
export const FAN_SPREAD = 150 * DEG;
/** Where a fan's segments split, as a share of its radius: they droop beyond. */
export const FAN_SPLIT = 0.5;

/**
 * A point of a fan's blade: `th` round from its stalk's line, `r` out (0..1 of its radius), pleated by `pleat`
 * (+1 a ridge, -1 a valley, 0 none). Folded up along its costa, its segments drooping past where they split.
 */
export function fanPoint(f: Frond, th: number, r: number, across: number[], pleat: number): number[] {
  const R = f.width;
  const d = f.bladeDir!;
  const n = f.bladeUp!;
  const h = f.hastula!;
  const c = Math.cos(th);
  const sn = Math.sin(th);
  const dir = [d[0] * c + across[0] * sn, d[1] * c + across[1] * sn, d[2] * c + across[2] * sn];
  // (Folded up either side of the costa, and pleated: each segment a shallow V.)
  const lift = R * r * (Math.sin(f.fold) * Math.abs(sn) + 0.045 * pleat);
  const past = Math.max(0, (r - FAN_SPLIT) / (1 - FAN_SPLIT));
  const droop = R * 0.85 * f.droop * past ** 1.5;
  return [h[0] + dir[0] * R * r + n[0] * lift, h[1] + dir[1] * R * r + n[1] * lift - droop, h[2] + dir[2] * R * r + n[2] * lift];
}

/**
 * A palm of a species grown to a size (its height, crown radius and base; its trunk's radius at breast
 * height), kept as `pruning` says (else as its species is). The same arguments give the same palm.
 */
export function growPalm(sp: TreeSpecies, size: TreeSize, seed: number, pruningOver?: Pruning): GrownTree {
  const rng = new Random(seed ^ 0x5a1d);
  const leaf = leafOf(sp);
  const form = FORMS[leaf];
  const pruning = pruningOf(sp, pruningOver);
  const { height: H, crownRadius: R, crownBase: base, trunkRadius } = size;
  const live = Math.max(3, Math.round(sp.whorl));
  const turn = rng.range(0, 2 * Math.PI);
  const bend = Math.min(1, Math.max(-1, sp.bend));
  // (A queen palm's soft leaves arch further; a stiff one's less: the species' bend, -1 all the way over.)
  const archK = 1 - 0.55 * bend;
  const plumose = sp.plumose ?? 0;

  // ---- The leaves it carries, the youngest first: green, then (as it is kept) dead. ----
  const spears = leaf === "feather" ? 2 : 1;
  const keepDead = pruning === "natural" ? (leaf === "fan" ? 0.35 : 0.3) : pruning === "skirt" ? (leaf === "fan" ? 0.25 : 0.15) : 0;
  const deadCount = Math.round(live * keepDead);
  const plans: FrondPlan[] = [];
  for (let i = 0; i < live + deadCount; i++) {
    const dead = i >= live;
    const age = dead ? 1 + (i - live + 0.5) / Math.max(1, deadCount) * 0.5 : i / Math.max(1, live - 1);
    const cls = classOf(age, !dead && i < spears);
    const own = rng.next();
    const g = rng.gauss();
    let rise = riseAt(form, age) + 4 * DEG * g;
    let arch = form.arch * archK * (cls === "spear" ? 0.08 : cls === "young" ? 0.35 + age * 2 : cls === "mature" ? 0.85 + 0.3 * age : 1.15) * (0.9 + 0.2 * rng.next());
    if (dead) {
      // (A dead leaf hangs from its foot, nearly straight down, against the stem.)
      rise = -(74 + 12 * rng.next()) * DEG;
      arch = 6 * DEG;
    }
    const young = Math.min(1, age / 0.2);
    plans.push({
      cls,
      age,
      azimuth: turn + i * GOLDEN_ANGLE + rng.range(-1, 1) * DEG,
      drop: dead ? form.knob * (1.15 + 0.5 * (age - 1)) : form.knob * Math.pow(Math.min(1, age), 0.9),
      rise,
      arch,
      twist: (cls === "spear" ? 0 : cls === "young" ? 8 : cls === "mature" ? 18 : cls === "old" ? 35 : 70) * DEG * (own < 0.5 ? -1 : 1) * (0.6 + 0.8 * rng.next()),
      lengthK: cls === "spear" ? 0.62 + 0.1 * i : cls === "young" ? 0.78 + 0.22 * young : dead ? 0.92 : 1 - 0.04 * Math.max(0, age - 0.6),
      widthK: cls === "spear" ? 0.12 : cls === "young" ? 0.7 + 0.3 * young : dead ? 0.6 : 1,
      fold: cls === "spear" ? 72 * DEG : dead ? (leaf === "fan" ? 60 * DEG : -55 * DEG) : form.fold * (cls === "young" ? 1.35 : 1) * (0.9 + 0.2 * rng.next()),
      plumose: dead || cls === "spear" ? 0 : plumose,
      droop: leaf === "fan" ? (cls === "young" ? 0.3 : cls === "spear" ? 0 : dead ? 1.4 : 0.8 + 0.5 * Math.max(0, age - 0.5)) * (sp.fanDroop ?? 1) : 0,
      // (A fan palm's freshly dead leaves, a brown tuft under its green: past 1, as a skirt's fresh top is.)
      dead: dead ? (leaf === "fan" ? 1 + 0.06 * rng.next() : 0.85 + 0.15 * rng.next()) : cls === "old" ? Math.max(0, (age - 0.82) * 1.4) : 0,
      tone: cls === "spear" ? 1.3 : cls === "young" ? 1.12 : cls === "old" ? 0.95 : 1,
      flex: cls === "spear" ? 0.12 : cls === "young" ? 0.55 : cls === "mature" ? 1 : dead ? 1.5 : 1.2,
      own,
      cell: leaf === "fan" ? (rng.next() < 0.5 ? PALM_CELL.fan : PALM_CELL.fanB) : plumose > 0 ? PALM_CELL.queen : PALM_CELL.feather,
      wander: 0.04 * sp.crooked,
      roll: leaf === "fan" && !dead && cls !== "spear" ? (rng.next() - 0.5) * 110 * DEG : 0,
    });
  }
  // (Pruned: a skinned palm loses its dead leaves and those hanging well below the level; a pineapple cut
  // leaves only those above about the level, the classic cut back to "ten and two".)
  const kept = plans.filter((p) => {
    // (A fan palm skinned keeps all its green leaves, the old hanging ones too: only its dead skirt is cut.)
    if (pruning === "skinned") return p.cls !== "dead" && (leaf === "fan" || p.rise > -40 * DEG);
    if (pruning === "pineapple") return p.cls !== "dead" && p.rise > -6 * DEG;
    return true;
  });

  // ---- The stem's shape: its radius up it (a feather palm's straight, a fan palm's tapering, both swollen at the foot). ----
  const bh = Math.min(1.3, 0.1 * H);
  const flare = 0.18 + 0.55 * (sp.buttress ?? 0);
  const swell = (y: number) => 1 + flare * Math.exp(-Math.max(0, y) / (0.35 + 0.9 * (sp.buttress ?? 0)));
  const taper = leaf === "fan" ? 0.2 : 0.04;
  const lean = rng.range(0, 2 * Math.PI);
  const bowK = 0.035 * sp.crooked;

  // ---- How long its leaves are, and how far they droop, to fill its crown. ----
  const stemR = (y: number, heartY: number) => {
    const u = Math.min(1, Math.max(0, y / Math.max(heartY, 0.01)));
    return ((trunkRadius * swell(y)) / swell(bh)) * (1 - taper * u);
  };
  const stemAt = (y: number, heartY: number): [number, number] => {
    const u = Math.min(1, Math.max(0, y / Math.max(heartY, 0.01)));
    const b = bowK * heartY * (1 - (1 - u) * (1 - u));
    return [b * Math.cos(lean), b * Math.sin(lean)];
  };
  // (Its leaves' feet round the stem's top: the youngest at the heart, the older lower, round the crown shaft.)
  const footOf = (p: FrondPlan, L: number, heartY: number) => {
    const y = heartY - p.drop * L;
    const [cx, cz] = stemAt(y, heartY);
    const r = stemR(y, heartY) * (p.cls === "spear" ? 0.2 : 0.95);
    return [cx + Math.cos(p.azimuth) * r, y, cz + Math.sin(p.azimuth) * r];
  };
  // (A crown wider than it is deep has its leaves held flatter; a deep narrow one, its leaves hanging further:
  // `k` scales how far they arch over, and drops the old ones' feet' elevation with it.)
  const drooped = (p: FrondPlan, k: number): FrondPlan =>
    p.cls === "dead" || p.cls === "spear" ? p : { ...p, arch: p.arch * k, rise: Math.max(-70 * DEG, p.rise - (k - 1) * 22 * DEG * Math.max(0, p.age - 0.35)) };
  const r0 = 0.9 * trunkRadius;
  // (Where its bowed stem's top is, about: the crown stands over it.)
  const [bx, bz] = stemAt(0.82 * H, 0.82 * H);
  /** Its leaves laid at length L with the heart at 0: how high over it they reach, how low under it the green go, how far out. */
  const extent = (plans: FrondPlan[], L: number) => {
    let top = 0;
    let low = Infinity;
    let reach = 0;
    for (const p of plans) {
      const f = layFrond(p, [bx + Math.cos(p.azimuth) * r0, -p.drop * L, bz + Math.sin(p.azimuth) * r0], L * p.lengthK, form, sp);
      for (const q of frondSurface(f)) {
        top = Math.max(top, q[1]);
        reach = Math.max(reach, Math.hypot(q[0], q[2]));
        if (f.cls !== "dead") low = Math.min(low, q[1]);
      }
    }
    return { top, low, reach };
  };
  /** The longest its leaves may be at a droop: no wider than its crown, no deeper, its heart well over the ground. */
  const longest = (plans: FrondPlan[]) => {
    const fits = (L: number) => {
      const e = extent(plans, L);
      const heartY = H - e.top;
      return e.reach <= R && heartY + e.low >= base - 0.02 && heartY > 0.35 * H;
    };
    let lo = 0.05;
    let hi = R * form.reach * 1.6;
    if (fits(hi)) return hi;
    for (let k = 0; k < (leaf === "fan" ? 13 : 18); k++) {
      const mid = 0.5 * (lo + hi);
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  let best = { score: Infinity, L: 0, plans: kept };
  const depthBox = Math.max(0.01, H - base);
  // (A skinned fan palm's crew may cut its green leaves that hang well below the level too, to "nine and three"
  // (ANSI A300: none with its tip above the level). So a head too shallow for its leaves to hang (a survey's
  // crown base high under its top: less deep than PALM_HANG_DEEP of its radius) may keep its leaves their
  // length, out to its crown's radius, and lose its lowest instead (down to "ten and two" at the most), as
  // the fit finds best. A head deep enough keeps them all.)
  const shallow = (H - base) / R;
  const cuts = leaf !== "fan" || pruning !== "skinned" || shallow >= PALM_HANG_DEEP ? [-90] : [-90, -30, -12, 5];
  for (const cut of cuts) {
    const green = cut <= -90 ? kept : kept.filter((p) => p.cls === "spear" || p.rise > cut * DEG);
    if (green.length < 0.5 * kept.length) continue;
    const lost = 1 - green.length / kept.length;
    for (const k of leaf === "fan" ? [0.5, 0.75, 1, 1.3, 1.75] : pruning === "pineapple" ? [0.5, 0.7, 0.85, 1, 1.15, 1.3] : [0.45, 0.65, 0.85, 1, 1.2, 1.45, 1.8]) {
      const plans = green.map((p) => drooped(p, k));
      const L = longest(plans);
      const e = extent(plans, L);
      const heartY = H - e.top;
      const fillR = e.reach / R;
      const fillD = (H - (heartY + e.low)) / depthBox;
      const score = 2 * (1 - fillR) + (1 - fillD) + 0.3 * Math.abs(Math.log(k)) + PALM_CUT_COST * lost;
      if (score < best.score) best = { score, L, plans };
    }
  }
  // (Laid on the stem as it is, and held in if the stem's own bow and girth carry it past its crown's radius.)
  let L = best.L;
  let heartY = H - extent(best.plans, L).top;
  let fronds = best.plans.map((p) => layFrond(p, footOf(p, L, heartY), L * p.lengthK, form, sp));
  for (let pass = 0; pass < 4; pass++) {
    let reach = 0;
    let top = 0;
    for (const f of fronds)
      for (const q of frondSurface(f)) {
        reach = Math.max(reach, Math.hypot(q[0], q[2]));
        top = Math.max(top, q[1]);
      }
    if (reach <= R && top <= H + 1e-3) break;
    L *= Math.min(R / reach, (H - heartY) / Math.max(1e-3, top - heartY)) * 0.995;
    heartY = H - extent(best.plans, L).top;
    fronds = best.plans.map((p) => layFrond(p, footOf(p, L, heartY), L * p.lengthK, form, sp));
  }

  // ---- What it is kept as, on its stem. ----
  const knobLow = heartY - form.knob * L;
  const rTop = stemR(heartY, heartY);
  let ball: PalmCrown["ball"] = null;
  let boots: PalmCrown["boots"] = null;
  let skirt: Skirt | null = null;
  if (pruning === "pineapple") {
    // (A ball of trimmed leaf bases, widest a third of the way down, as tall as it is wide or a little more:
    // about one and a half times the stem across.)
    const radius = Math.min(rTop * 1.75, 0.4 * R);
    const tall = Math.min(2.4 * radius, 0.45 * heartY);
    ball = { y0: heartY - tall, y1: heartY + 0.15 * radius, radius };
  } else if (leaf === "fan" && pruning === "skinned") {
    // (Leaf bases still firm on the stem are left when it is skinned: a collar of boots under the green.)
    boots = { y0: Math.max(0.3 * heartY, knobLow - Math.min(2.2, 0.12 * H)), y1: heartY };
  } else {
    // (Unskinned: old leaf bases all down the crown shaft and a way below it.)
    boots = { y0: Math.max(0.25 * heartY, knobLow - (leaf === "fan" ? 0.25 : 0.12) * H), y1: heartY };
  }
  if (leaf === "fan" && (pruning === "natural" || pruning === "skirt")) {
    // (A fan palm's dead leaves hang in a skirt from under its green ones: in the wild to near the ground; cut back, a few metres.)
    // (From a little into the crown, under its hanging green leaves, so they overlap its fresh brown top.)
    const top = knobLow + 0.04 * L;
    const longest = pruning === "natural" ? Math.max(0.15, sp.skirt ?? 0.6) * top : Math.min(0.3 * top, 0.9 * L);
    // (Carrot-shaped: its shoulder flared about as wide as its lowest green leaves reach, the dead leaves hanging
    // from their whole length, then tapering steadily to a narrow ragged foot: `skirtOut`.)
    const outTop = Math.min(0.6 * L + 0.1, 0.48 * R);
    skirt = { top, bottom: Math.max(0.4, top - longest), outTop, outBottom: Math.min(0.3 * outTop, 0.15 + 0.03 * L) };
  }

  // ---- The stem, ring by ring, to the top of the crown shaft. ----
  const stem: PalmStem = { x: [], y: [], z: [], radius: [], surface: [] };
  const top = heartY + 0.25 * rTop;
  const ringYs: number[] = [0, Math.min(0.12, 0.05 * H), Math.min(0.3, 0.1 * H), Math.min(0.6, 0.15 * H)];
  const shaft = knobLow;
  const along = Math.max(1, Math.ceil((shaft - ringYs[3]) / 0.9));
  for (let k = 1; k <= along; k++) ringYs.push(ringYs[3] + ((shaft - ringYs[3]) * k) / along);
  const head = 8;
  for (let k = 1; k <= head; k++) ringYs.push(shaft + ((top - shaft) * k) / head);
  if (ball) for (let k = 0; k <= 10; k++) ringYs.push(ball.y0 + ((ball.y1 - ball.y0) * k) / 10);
  if (boots) ringYs.push(boots.y0 - 0.05, boots.y0);
  const ys = [...new Set(ringYs.map((y) => Math.round(y * 1000) / 1000))].filter((y) => y >= 0 && y <= top).sort((a, b) => a - b);
  for (const y of ys) {
    const [cx, cz] = stemAt(Math.min(y, heartY), heartY);
    let r = stemR(Math.min(y, heartY), heartY);
    let surface = STEM_BARK;
    // (The crown shaft: the leaves' bases wrapping the stem's top, swelling, rounding over at the heart; a fan
    // palm's, unless its bases are trimmed to a ball, its broad collar of split boots, near twice the stem across.)
    if (y > shaft) {
      const u = (y - shaft) / Math.max(1e-3, top - shaft);
      r *= (1 + (leaf === "fan" ? (pruning === "pineapple" ? 0.22 : 0.75) : 0.35) * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.15))) * Math.sqrt(Math.max(0.04, 1 - Math.pow(Math.max(0, u - 0.55) / 0.45, 2)));
      surface = STEM_BOOTS;
    }
    if (boots && y >= boots.y0 && y <= boots.y1) {
      surface = STEM_BOOTS;
      // (Boots stand out from the stem, the more the nearer the crown: a fan palm's collar of split leaf bases
      // under its green, as wide again as its stem at the top.)
      if (y <= shaft) r *= 1.12 + (leaf === "fan" ? 0.55 * Math.pow(Math.max(0, (y - boots.y0) / Math.max(1e-3, shaft - boots.y0)), 1.5) : 0);
    }
    if (ball && y >= ball.y0 - 1e-6 && y <= ball.y1 + 1e-6) {
      const u = (y - ball.y0) / (ball.y1 - ball.y0);
      // (Widest a third of the way down from its top, tapering into the stem below and into the leaves above.)
      const shape = u < 0.67 ? Math.sin((u / 0.67) * Math.PI * 0.5) ** 0.7 : Math.cos(((u - 0.67) / 0.33) * Math.PI * 0.42);
      r = Math.max(r, rTop + (ball.radius - rTop) * shape);
      surface = STEM_PINEAPPLE;
    }
    stem.x.push(cx);
    stem.y.push(y);
    stem.z.push(cz);
    stem.radius.push(r);
    stem.surface.push(surface);
  }

  // ---- The skeleton: the stem's nodes, and each frond's rachis off the node at its foot. ----
  const sx: number[] = [];
  const sy: number[] = [];
  const sz: number[] = [];
  const sr: number[] = [];
  const parent: number[] = [];
  const order: number[] = [];
  const limb: number[] = [];
  const alongArr: number[] = [];
  let lastStem = -1;
  // (The skeleton's stem the stem's wood, never thicker than below it: its swellings, the crown shaft's and a
  // pineapple's, are its leaf bases, drawn as its surface.)
  let rMin = Infinity;
  for (let k = 0; k < stem.y.length; k++) {
    sx.push(stem.x[k]);
    sy.push(stem.y[k]);
    sz.push(stem.z[k]);
    rMin = Math.min(rMin, Math.max(0.01, stemR(Math.min(stem.y[k], heartY), heartY)));
    sr.push(rMin);
    parent.push(lastStem);
    order.push(0);
    limb.push(0);
    alongArr.push(stem.y[k]);
    lastStem = k;
  }
  const stemNodeAt = (y: number) => {
    let best = 0;
    for (let k = 0; k < stem.y.length; k++) if (Math.abs(stem.y[k] - y) < Math.abs(stem.y[best] - y)) best = k;
    return best;
  };
  const clumps = { x: [] as number[], y: [] as number[], z: [] as number[], r: [] as number[], nx: [] as number[], ny: [] as number[], nz: [] as number[], node: [] as number[], depth: [] as number[], tx: [] as number[], ty: [] as number[], tz: [] as number[] };
  let leafArea = 0;
  const addClump = (c: number[], r: number, n: number[], t: number[], node: number, f: Frond) => {
    clumps.x.push(c[0]);
    clumps.y.push(c[1]);
    clumps.z.push(c[2]);
    clumps.r.push(r);
    clumps.nx.push(n[0]);
    clumps.ny.push(n[1]);
    clumps.nz.push(n[2]);
    clumps.node.push(node);
    clumps.depth.push(f.cls === "young" || f.cls === "spear" ? 0.55 : 0.25);
    clumps.tx.push(t[0]);
    clumps.ty.push(t[1]);
    clumps.tz.push(t[2]);
  };
  for (const f of fronds) {
    let prev = stemNodeAt(f.points[0][1]);
    const footNode = sx.length;
    const r0 = Math.min(0.5 * rTop, 0.022 * f.length);
    // (A fan's rachis runs on into its blade as its costa: its skeleton ends at the blade, which its clumps stand for.)
    const end = f.hastula ? f.s.findIndex((x) => x >= f.bare - 1e-6) : f.points.length - 1;
    for (let i = 1; i <= end; i++) {
      const q = f.points[i];
      const node = sx.length;
      sx.push(q[0]);
      sy.push(q[1]);
      sz.push(q[2]);
      sr.push(Math.max(0.006, r0 * (1 - 0.8 * f.s[i])));
      parent.push(prev);
      order.push(1);
      limb.push(footNode);
      alongArr.push(alongArr[prev] + Math.hypot(q[0] - sx[prev], q[1] - sy[prev], q[2] - sz[prev]));
      prev = node;
      if (f.cls === "dead" || f.hastula || f.s[i] < f.bare) continue;
      // Clumps strung along its leaf, a leaf's width apart, standing for it where the library needs clumps.
      const pq = f.points[i - 1];
      const chord = norm([q[0] - pq[0], q[1] - pq[1], q[2] - pq[2]]);
      addClump(q, Math.max(0.08, f.width * leafletProfile(f.s[i]) * 0.8), f.up[i], chord, node, f);
    }
    if (f.hastula && f.cls !== "dead") {
      // (A fan's blade: three clumps across it.)
      const a = norm(cross(f.bladeUp!, f.bladeDir!));
      const h = [sx[prev], sy[prev], sz[prev]];
      const pp = parent[prev];
      const chord = norm([h[0] - sx[pp], h[1] - sy[pp], h[2] - sz[pp]]);
      for (const th of [-0.45 * FAN_SPREAD, 0, 0.45 * FAN_SPREAD]) {
        const c = fanPoint(f, th, 0.5, a, 0);
        addClump(c, Math.max(0.45 * f.width, 1.01 * Math.hypot(c[0] - h[0], c[1] - h[1], c[2] - h[2])), f.bladeUp!, chord, prev, f);
      }
    }
    if (f.cls !== "dead") {
      // (Its leaf's area, one side: a feather's leaflets about two thirds fill the band either side of the
      // rachis; a fan's blade nearly fills its round, less its split tips.)
      leafArea += f.hastula ? 0.75 * (FAN_SPREAD / Math.PI) * Math.PI * f.width ** 2 : 0.62 * 2 * f.width * 0.82 * f.length * (1 - f.bare) * (1 + 0.8 * f.plumose);
    }
  }
  const n = sx.length;
  const skeleton: Skeleton = {
    count: n,
    x: Float32Array.from(sx),
    y: Float32Array.from(sy),
    z: Float32Array.from(sz),
    radius: Float32Array.from(sr),
    parent: Int32Array.from(parent),
    order: Uint8Array.from(order),
    limb: Int32Array.from(limb),
    along: Float32Array.from(alongArr),
  };
  const cc = clumps.x.length;
  const cl: Clumps = {
    count: cc,
    x: Float32Array.from(clumps.x),
    y: Float32Array.from(clumps.y),
    z: Float32Array.from(clumps.z),
    radius: Float32Array.from(clumps.r),
    nx: Float32Array.from(clumps.nx),
    ny: Float32Array.from(clumps.ny),
    nz: Float32Array.from(clumps.nz),
    node: Int32Array.from(clumps.node),
    depth: Float32Array.from(clumps.depth),
    tx: Float32Array.from(clumps.tx),
    ty: Float32Array.from(clumps.ty),
    tz: Float32Array.from(clumps.tz),
  };
  const palm: PalmCrown = { leaf, pruning, heart: [stemAt(heartY, heartY)[0], heartY, stemAt(heartY, heartY)[1]], fronds, stem, ball, boots, skirt, leafArea };
  return { size, skeleton, clumps: cl, palm, leafArea, ...(sp.buttress ? { buttress: sp.buttress } : {}) };
}
