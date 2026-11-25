// Where each tree stands among the others: alone in the open, at a wood's
// edge, or deep in a wood. Worked out from the trees themselves (where they
// stand and how big their crowns are), so a host hands over only its list.
//
// A tree's light comes from the sky round it as much as from above. Round a
// tree alone, the sky comes down to the horizon on every side, and it keeps
// its branches to the ground and grows round. At a wood's edge, its
// neighbours' crowns hide the low sky on the wood's side: there its lower
// branches starve and die (it self-prunes), its crown reaches out over the
// open ground and keeps its leaves low on that side, and leans a little to
// it. Deep in a wood the low sky is hidden all round, and a tree keeps only
// a small crown high up, on a tall clean bole.
//
// So for each tree, round it in sixteen sectors: how much of each sector the
// crowns of its neighbours fill, as walls of leaves standing past its own
// crown. A neighbour counts by how much of the sector it spans (its crown's
// width at its distance), how high it reaches over this tree's crown base
// (a shrub under an oak hides nothing of the oak's sky), and how near it
// stands (one a tree's height off past the crowns hides little); and one
// crown hides only so much (`CROWN_HIDES`), so a way is closed as far as
// it is crowns deep. From the
// sixteen, kept as the first two terms of their Fourier series (all one
// needs to tell an edge from the inside of a wood):
//
//   enclosure   their mean: 0 in the open, about a half at a straight edge,
//               1 deep in a wood;
//   lopsided    how much more closed one side is than the other (the first
//               harmonic's amplitude: 0.64 for a straight edge);
//   open        which way it is most open (unit, on the ground);
//   canopy      how tall the walls stand, for its own height;
//   gap         how far past its own crown they stand, for its crown's radius.
//
// Growing (grow.ts) and the shaders (engine.ts) both read the light of a
// place in or under the crown from these the same way (`standLight`): the
// sky of each sector is hidden up to the wall's top as seen from there.

import { type TreeSize } from "./tree.ts";

/** Where a tree stands among the others. See the head of stand.ts. */
export interface Stand {
  enclosure: number;
  lopsided: number;
  /** Which way it is most open, on the ground (x, z: unit). */
  openX: number;
  openZ: number;
  canopy: number;
  gap: number;
}

/** A tree on open ground: nothing round it. */
export const OPEN_STAND: Readonly<Stand> = { enclosure: 0, lopsided: 0, openX: 1, openZ: 0, canopy: 1, gap: 1 };

/** How a tree is grown for where it stands: a variant's class. */
export type Standing = "open" | "edge" | "interior";

/** How many sectors round a tree its neighbours are reckoned in. */
export const STAND_SECTORS = 16;
/** A neighbour this far past the crowns (as a share of the tree's height) hides nothing of its sky. */
const STAND_REACH = 0.8;
/**
 * How much of what lies behind it one crown hides: a crown is leaves, not a wall (exp(-k L) across a
 * crown's leafy shell twice, for a crown of middling density). Two crowns deep a way is mostly closed,
 * three nearly all: so a wood's second row still has some of the open side's light.
 */
const CROWN_HIDES = 0.7;
/** The nearest a wall is taken to stand from a place, as a share of the crown's radius. */
const WALL_NEAREST = 0.15;

/** How closed a tree is in a direction on the ground (unit): its stand's two terms, 0..1. */
export function closedness(stand: Stand, ux: number, uz: number): number {
  return Math.min(1, Math.max(0, stand.enclosure - stand.lopsided * (ux * stand.openX + uz * stand.openZ)));
}

/**
 * What class of variant a tree is grown as: `interior` where even its most open side is mostly closed,
 * `edge` where one side is closed and another open, `open` where nothing much is closed anywhere.
 */
export function standingOf(stand: Stand): Standing {
  const least = stand.enclosure - stand.lopsided;
  const most = stand.enclosure + stand.lopsided;
  if (least >= 0.4) return "interior";
  if (most >= 0.5) return "edge";
  return "open";
}

/**
 * How much of the sky (as a horizontal surface sees it, the sky taken as evenly bright: Moon and Spencer's
 * uniform sky) reaches a place in a tree's own frame (metres from its foot, its open side along +x), past
 * the walls of its neighbours' crowns: 1 in the open, little at the foot of a wood's interior. In each
 * sector the sky is hidden up to the wall's top as seen from the place, as far as the sector is closed;
 * the share of a uniform sky below an elevation θ is sin²θ. The wall stands `gap` crown radii past the
 * crown. (The tree's own crown is not counted: see `standShare`.) The shaders work it out the same way.
 */
export function standLight(stand: Stand, size: TreeSize, x: number, y: number, z: number): number {
  if (stand.enclosure <= 0 && stand.lopsided <= 0) return 1;
  const rise = stand.canopy * size.height - y;
  if (rise <= 0) return 1;
  const wall = size.crownRadius * (1 + stand.gap);
  let lost = 0;
  for (let s = 0; s < STAND_SECTORS; s++) {
    const a = ((s + 0.5) / STAND_SECTORS) * 2 * Math.PI;
    const ux = Math.cos(a);
    const c = Math.min(1, Math.max(0, stand.enclosure - stand.lopsided * ux));
    const d = Math.max(WALL_NEAREST * size.crownRadius, wall - (x * ux + z * Math.sin(a)));
    lost += (c * rise * rise) / (rise * rise + d * d);
  }
  return 1 - lost / STAND_SECTORS;
}

/** The elevations of the sky's bands a place's light is reckoned in (radians), and each band's share of a uniform sky. */
const BANDS = [0, 22.5, 45, 67.5, 90].map((d) => (d * Math.PI) / 180);
// (Worked out once: each sector's way round, each band's bounds as sin² and its middle ray's elevation. `standShare`
// is asked for every few voxels of every crown grown in a stand, and these were most of its time.)
const SECTOR_UX = Float64Array.from({ length: STAND_SECTORS }, (_, s) => Math.cos(((s + 0.5) / STAND_SECTORS) * 2 * Math.PI));
const SECTOR_UZ = Float64Array.from({ length: STAND_SECTORS }, (_, s) => Math.sin(((s + 0.5) / STAND_SECTORS) * 2 * Math.PI));
const BAND_LO = Float64Array.from({ length: BANDS.length - 1 }, (_, b) => Math.sin(BANDS[b]) ** 2);
const BAND_HI = Float64Array.from({ length: BANDS.length - 1 }, (_, b) => Math.sin(BANDS[b + 1]) ** 2);
const BAND_COS = Float64Array.from({ length: BANDS.length - 1 }, (_, b) => Math.cos(0.5 * (BANDS[b] + BANDS[b + 1])));
const BAND_SIN = Float64Array.from({ length: BANDS.length - 1 }, (_, b) => Math.sin(0.5 * (BANDS[b] + BANDS[b + 1])));

/**
 * Of the sky that would reach a place in a tree's crown were it standing alone, the share its stand leaves
 * it, 0..1 (its own frame, its open side along +x). Its sky comes to it through its own crown either way:
 * the crown taken as its ellipsoid with a leafy shell `shell` deep and an airy heart, which lets through
 * exp(-k L) over the leafy length L a ray crosses (Monsi and Saeki, as the shaders light a crown). The
 * stand hides what comes in below its walls' tops. So a place on the shaded side of an edge tree, which
 * had most of its sky from its own side, keeps only what comes over or through the rest of the crown; a
 * place on the open side loses only what reached it through the crown already. A tree in an even shade
 * all over (a shrub under a wood's canopy) keeps all of its share where nothing hides its sides: what
 * shapes a crown is where its light comes from, not how much there is.
 */
export function standShare(stand: Stand, size: TreeSize, k: number, shell: number, x: number, y: number, z: number): number {
  if (stand.enclosure <= 0 && stand.lopsided <= 0) return 1;
  const rise = stand.canopy * size.height - y;
  if (rise <= 0) return 1;
  const ry = Math.max(0.05, 0.5 * (size.height - size.crownBase));
  const rx = Math.max(0.05, size.crownRadius);
  const air = 0.18 * Math.min(rx, ry);
  const px = x / rx;
  const py = (y - size.crownBase - ry) / ry;
  const pz = z / rx;
  const c0 = px * px + py * py + pz * pz - 1;
  const wall = size.crownRadius * (1 + stand.gap);
  let alone = 0;
  let left = 0;
  for (let s = 0; s < STAND_SECTORS; s++) {
    const ux = SECTOR_UX[s];
    const uz = SECTOR_UZ[s];
    const closed = Math.min(1, Math.max(0, stand.enclosure - stand.lopsided * ux));
    const d = Math.max(WALL_NEAREST * size.crownRadius, wall - (x * ux + z * uz));
    // (The wall's top as seen from here, as sin² of its elevation: the share of the sky below it.)
    const below = (rise * rise) / (rise * rise + d * d);
    for (let b = 0; b < BAND_LO.length; b++) {
      const lo = BAND_LO[b];
      const hi = BAND_HI[b];
      // (Through its own crown along the band's middle ray: the leafy length it crosses, the crown's ellipsoid.)
      const dx = (BAND_COS[b] * ux) / rx;
      const dy = BAND_SIN[b] / ry;
      const dz = (BAND_COS[b] * uz) / rx;
      const qa = dx * dx + dy * dy + dz * dz;
      const qb = px * dx + py * dy + pz * dz;
      const disc = qb * qb - qa * c0;
      let through = 1;
      if (disc > 0) {
        const root = Math.sqrt(disc);
        const len = Math.max(0, (-qb + root) / qa) - Math.max(0, (-qb - root) / qa);
        through = Math.exp(-k * Math.min(Math.max(len - air, 0), 2 * shell));
      }
      const sky = hi - lo;
      const hidden = closed * Math.min(1, Math.max(0, (below - lo) / sky));
      alone += sky * through;
      left += sky * through * (1 - hidden);
    }
  }
  return alone > 0 ? left / alone : 1;
}

/**
 * Each tree's stand, from where the trees stand and their sizes: `x` and `z` (the ground's), one each a
 * tree, and their sizes. Neighbours are found through a grid of cells hashed by place, so it takes some tens
 * of milliseconds for tens of thousands of trees.
 */
export function standsOf(x: ArrayLike<number>, z: ArrayLike<number>, sizes: readonly TreeSize[]): Stand[] {
  const n = sizes.length;
  const out: Stand[] = new Array(n);
  if (n === 0) return out;
  let maxR = 0;
  let maxReach = 0;
  for (const s of sizes) {
    maxR = Math.max(maxR, s.crownRadius);
    maxReach = Math.max(maxReach, s.crownRadius + STAND_REACH * s.height);
  }
  const cell = Math.max(4, (maxR + maxReach) / 3);
  // (A hashed grid: each cell's trees chained through `next`, its first in `head`.)
  const slots = 1 << Math.max(10, Math.ceil(Math.log2(n * 2)));
  const head = new Int32Array(slots).fill(-1);
  const next = new Int32Array(n).fill(-1);
  const key = (ix: number, iz: number) => (Math.imul(ix, 73856093) ^ Math.imul(iz, 19349663)) & (slots - 1);
  for (let i = 0; i < n; i++) {
    const k = key(Math.floor(x[i] / cell), Math.floor(z[i] / cell));
    next[i] = head[k];
    head[k] = i;
  }
  const w = (2 * Math.PI) / STAND_SECTORS;
  const open = new Float64Array(STAND_SECTORS);
  const nearest = new Float64Array(STAND_SECTORS);
  const cos = Float64Array.from({ length: STAND_SECTORS }, (_, s) => Math.cos((s + 0.5) * w));
  const sin = Float64Array.from({ length: STAND_SECTORS }, (_, s) => Math.sin((s + 0.5) * w));
  for (let i = 0; i < n; i++) {
    const si = sizes[i];
    const depth = Math.max(0.1, si.height - si.crownBase);
    const far = si.crownRadius + maxR + STAND_REACH * si.height;
    const span = Math.ceil(far / cell);
    const cx = Math.floor(x[i] / cell);
    const cz = Math.floor(z[i] / cell);
    // (Each sector's sky left open, as the product of what each neighbour leaves of it.)
    open.fill(1);
    nearest.fill(Infinity);
    let tall = 0;
    let weight = 0;
    const seen = new Set<number>();
    for (let a = -span; a <= span; a++)
      for (let b = -span; b <= span; b++) {
        const k = key(cx + a, cz + b);
        if (seen.has(k)) continue;
        seen.add(k);
        for (let j = head[k]; j >= 0; j = next[j]) {
          if (j === i) continue;
          const dx = x[j] - x[i];
          const dz = z[j] - z[i];
          const d = Math.hypot(dx, dz);
          if (d < 1e-3 || d > far) continue;
          const sj = sizes[j];
          const gap = d - si.crownRadius - sj.crownRadius;
          // (How far it reaches over this tree's crown base, for the crown's depth; and how near it stands.)
          const over = Math.min(1, Math.max(0, (sj.height - si.crownBase) / depth));
          const near = Math.min(1, Math.max(0, 1 - Math.max(0, gap) / (STAND_REACH * si.height)));
          const p = CROWN_HIDES * over * near;
          if (p <= 0.01) continue;
          // (The angle its crown spans from here, and the sectors that takes in, each by how much of it.)
          const phi = Math.atan2(dz, dx);
          const half = d > sj.crownRadius ? Math.asin(sj.crownRadius / d) : 0.5 * Math.PI;
          const s0 = Math.floor((phi - half) / w);
          const s1 = Math.floor((phi + half) / w);
          for (let s = s0; s <= s1; s++) {
            const lo = Math.max(phi - half, s * w);
            const hi = Math.min(phi + half, (s + 1) * w);
            const f = Math.max(0, hi - lo) / w;
            if (f <= 0) continue;
            const q = ((s % STAND_SECTORS) + STAND_SECTORS) % STAND_SECTORS;
            open[q] *= 1 - f * p;
            tall += f * p * sj.height;
            weight += f * p;
            // (The wall a sector has is its nearest crown that fills a fair part of it.)
            if (f * p >= 0.2) nearest[q] = Math.min(nearest[q], gap);
          }
        }
      }
    let c0 = 0;
    let re = 0;
    let im = 0;
    let gaps = 0;
    let walled = 0;
    for (let s = 0; s < STAND_SECTORS; s++) {
      const c = 1 - open[s];
      c0 += c;
      re += c * cos[s];
      im += c * sin[s];
      if (Number.isFinite(nearest[s])) {
        gaps += c * nearest[s];
        walled += c;
      }
    }
    c0 /= STAND_SECTORS;
    // (The first harmonic: twice the mean of closedness turned round by each sector's direction.)
    re *= 2 / STAND_SECTORS;
    im *= 2 / STAND_SECTORS;
    const c1 = Math.hypot(re, im);
    out[i] = {
      enclosure: c0,
      lopsided: c1,
      openX: c1 > 1e-6 ? -re / c1 : 1,
      openZ: c1 > 1e-6 ? -im / c1 : 0,
      canopy: weight > 0 ? tall / weight / si.height : 1,
      gap: walled > 0 ? Math.min(3, Math.max(-0.3, gaps / walled / si.crownRadius)) : 1,
    };
  }
  return out;
}
