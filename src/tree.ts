// What a tree is between being grown and being drawn: its size, the envelope
// it must keep to, its branches and its clumps of leaves.
//
// Growing makes these (grow.ts) from a species, a size and a seed; drawing
// reads them and knows nothing of how they were made. They are plain arrays
// in metres, the tree's foot at the origin, +Y up.

import { type CrownShape } from "./species.ts";

/** How big one tree is (m): what a survey measures of it, and what a ball hitting it meets. */
export interface TreeSize {
  height: number;
  crownRadius: number;
  /** How high its lowest leaves are above the ground. */
  crownBase: number;
  /** Its trunk's radius at breast height: 1.3 m up, or a tenth of the way up a tree under 13 m (a shrub's stems near their foot). */
  trunkRadius: number;
}

/**
 * A crown shape's outline, as Weber and Penn's pruning envelope (1995) made round: how high in the crown
 * it is widest (`peak`, 0 its base, 1 its top), how round it is above that (`round`: the exponent of a
 * superellipse, Lamé's curve, which Rautiainen et al. (2008) fitted to measured crowns: 1 a cone, 2 an
 * ellipse, higher a flatter top), how round below (`roundLow`), and how wide it still is at its base, where
 * its lowest live branches are (`base`, a share of its widest). Its side is upright where it is widest, so
 * no crown has a waist or a corner there; only a cone (round near 1) comes to a point at its top.
 */
export interface CrownOutline {
  peak: number;
  round: number;
  roundLow: number;
  base: number;
}

/** Each shape's outline. Rautiainen et al. (2008) measured round 1.35 for Scots pine and 1.42 for Norway spruce. */
export const CROWN_OUTLINES: Readonly<Record<CrownShape, CrownOutline>> = {
  conical: { peak: 0.2, round: 1.35, roundLow: 2, base: 0.6 },
  spherical: { peak: 0.45, round: 2, roundLow: 2, base: 0.3 },
  hemispherical: { peak: 0.2, round: 2, roundLow: 1.6, base: 0.55 },
  cylindrical: { peak: 0.5, round: 4, roundLow: 4, base: 0.85 },
  taperedCylindrical: { peak: 0.2, round: 1.5, roundLow: 2.5, base: 0.75 },
  flame: { peak: 0.3, round: 1.2, roundLow: 1.5, base: 0.25 },
  inverseConical: { peak: 0.7, round: 2.6, roundLow: 1.3, base: 0.25 },
  tendFlame: { peak: 0.4, round: 1.6, roundLow: 2, base: 0.5 },
};

/** What a species may say of its crown's outline over its shape's (`TreeSpecies` has both). */
export interface CrownOverride {
  crownPeak?: number;
  crownRound?: number;
}

/** A shape's outline, with what a species says over it. */
export function crownOutline(shape: CrownShape, over?: CrownOverride): CrownOutline {
  const o = CROWN_OUTLINES[shape];
  return {
    peak: Math.min(0.95, Math.max(0, over?.crownPeak ?? o.peak)),
    round: Math.max(0.8, over?.crownRound ?? o.round),
    roundLow: o.roundLow,
    base: o.base,
  };
}

/**
 * How wide a crown of a shape is at a height within it, as a share of its widest: `t` is 0 at the crown's
 * base and 1 at its top. Give the species (or its `crownPeak` and `crownRound`) to have its own outline.
 */
export function crownProfile(shape: CrownShape, t: number, over?: CrownOverride): number {
  const o = crownOutline(shape, over);
  const s = Math.min(1, Math.max(0, t));
  if (s >= o.peak) {
    const u = o.peak >= 1 ? 1 : (s - o.peak) / (1 - o.peak);
    return u >= 1 ? 0 : (1 - u ** o.round) ** (1 / o.round);
  }
  const u = (o.peak - s) / o.peak;
  return o.base + (1 - o.base) * (1 - u ** o.roundLow) ** (1 / o.roundLow);
}

/**
 * An ellipsoid from the crown's base to the tree's top, `crownRadius` round: Couch Golf Club's collider for
 * a crown, and what the shaders take the crown to be when they work out how much light gets through it.
 * A drawn crown keeps to its box (`crownRadius` round, from `crownBase` to `height`) and to its species'
 * outline, not to this: a spruce is widest at its foot, where the ellipsoid is narrowest.
 */
export function crownEllipsoid(size: TreeSize): { cy: number; rx: number; ry: number } {
  const depth = Math.max(0.01, size.height - size.crownBase);
  return { cy: size.crownBase + depth / 2, rx: size.crownRadius, ry: depth / 2 };
}

/** How far a point is inside the crown's ellipsoid: under 1 inside, 1 on it, over 1 outside. */
export function insideCrown(size: TreeSize, x: number, y: number, z: number): number {
  const e = crownEllipsoid(size);
  return Math.hypot(x / e.rx, (y - e.cy) / e.ry, z / e.rx);
}

/**
 * The branches, as nodes: each node is a point on a branch with its radius there, joined to its parent by
 * a straight piece of wood. Node 0 is the foot of the first stem; a node whose parent is -1 is the foot
 * of a stem.
 */
export interface Skeleton {
  count: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  radius: Float32Array;
  parent: Int32Array;
  /** 0 a stem (the trunk), 1 a limb off it, 2 a branch off that, and so on. */
  order: Uint8Array;
  /**
   * The node where this node's limb leaves its stem: the first node of the order-1 branch it is on (itself,
   * or an ancestor). For a node on a stem, the stem's foot. Wind moves a limb and all on it together, and
   * gives each limb its own phase from where this node is.
   */
  limb: Int32Array;
  /** How far along the wood from the ground to here (m). */
  along: Float32Array;
}

/**
 * The leaves, gathered into clumps: a spray of leaves at a twig's end, drawn as one thing far off and as
 * its leaves close to. Each is a sphere of leaves hung on a node of the skeleton.
 */
export interface Clumps {
  count: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  radius: Float32Array;
  /** Which way the clump faces out of the crown (unit): where its leaves turn to the light. */
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  /** The skeleton node it hangs from (a twig's end). */
  node: Int32Array;
  /** How deep in the crown it is, 0 (its outside) to 1 (its heart): how much of the sky its leaves see. */
  depth: Float32Array;
  /**
   * Which way its twig runs at the clump (unit): from the node's parent to the node. A leaf card lies along
   * it, so a frond's leaves follow the frond and a whip's hang with the whip.
   */
  tx: Float32Array;
  ty: Float32Array;
  tz: Float32Array;
}

/** A tree, grown. */
export interface GrownTree {
  /** The size it was grown to. */
  size: TreeSize;
  skeleton: Skeleton;
  clumps: Clumps;
}
