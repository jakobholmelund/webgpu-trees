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
 * How wide a crown of a shape is at a height within it, as a share of its widest: `t` is 0 at the crown's
 * base and 1 at its top. Weber and Penn's shape ratios (1995), turned the way up a crown is read, and scaled
 * so each reaches 1 at its widest.
 */
export function crownProfile(shape: CrownShape, t: number): number {
  const r = 1 - Math.min(1, Math.max(0, t)); // (Weber and Penn's ratio: 1 at the crown's base, 0 at its top.)
  switch (shape) {
    case "conical":
      return 0.2 + 0.8 * r;
    case "spherical":
      return 0.2 + 0.8 * Math.sin(Math.PI * r);
    case "hemispherical":
      return 0.2 + 0.8 * Math.sin(0.5 * Math.PI * r);
    case "cylindrical":
      return 1;
    case "taperedCylindrical":
      return 0.5 + 0.5 * r;
    case "flame":
      return Math.max(0.05, r <= 0.7 ? r / 0.7 : (1 - r) / 0.3);
    case "inverseConical":
      return 1 - 0.8 * r;
    case "tendFlame":
      return r <= 0.7 ? 0.5 + (0.5 * r) / 0.7 : 0.5 + (0.5 * (1 - r)) / 0.3;
  }
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
}

/** A tree, grown. */
export interface GrownTree {
  /** The size it was grown to. */
  size: TreeSize;
  skeleton: Skeleton;
  clumps: Clumps;
}
