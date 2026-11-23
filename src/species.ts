// A species: what one kind of tree is. Its form and behaviour, as plain data,
// so a wood is described and not programmed.
//
// Nothing that draws a tree names a species: growing reads the row, and the
// shaders read what growing made of it. A tree's size is not the species'
// but its own (`TreeInstance`): a species says how a tree of that kind is
// built, and a measured tree says how big this one is.

/**
 * How the tree is put together (Hallé and Oldeman's models, by the handful that matter on a course):
 *
 * - `broadleaf`: a short trunk that soon divides into a few great limbs, which divide again (oak, maple,
 *   plane, eucalyptus). Grown by space colonization into the crown.
 * - `conifer`: one leader to the top, with branches in whorls along it, longest low down (spruce, fir,
 *   most pines when young). Grown whorl by whorl.
 * - `shrub`: several stems from the ground, no trunk to speak of (holly, gorse, broom, rhododendron).
 */
export type Architecture = "broadleaf" | "conifer" | "shrub";

/**
 * The outline of the crown seen from the side: how wide it is at each height, from its base to its top.
 * Weber and Penn's shapes (1995), less the ones that serve only a tree's first branches.
 */
/**
 * What its leaves are like, for the realistic look's sprays of them: broad (oak, maple, plane), narrow
 * (eucalyptus, willow), needle (spruce, pine), small (box, holly, a shrub's).
 */
export type LeafKind = "broad" | "narrow" | "needle" | "small";
export const LEAF_KIND_ROWS: readonly LeafKind[] = ["broad", "narrow", "needle", "small"];

export type CrownShape = "conical" | "spherical" | "hemispherical" | "cylindrical" | "taperedCylindrical" | "flame" | "inverseConical" | "tendFlame";

export interface TreeSpecies {
  name: string;
  architecture: Architecture;

  // A tree of this kind, when nothing gives its own size (the lab's specimen, a host with no survey).
  /** How tall (m). */
  height: number;
  /** How far its crown reaches from the trunk (m). */
  crownRadius: number;
  /** How high its lowest leaves are above the ground (m). */
  crownBase: number;
  /** Its trunk's radius at breast height (m). */
  trunkRadius: number;

  // The crown.
  shape: CrownShape;
  /**
   * How deep into the crown its leaves go, 0..1: 0, on its outside only (a beech in summer, all its
   * leaves in the light); 1, through to the trunk (a young conifer, a shrub). Real crowns are mostly
   * shells: a leaf in deep shade costs the tree more than it gives.
   */
  foliageDepth: number;
  /** How see-through the crown is, 0 (solid) to 1 (sky through it everywhere): a pine's open crown, a birch's. */
  openness: number;

  // The branches.
  /** How many stems rise from the ground: 1 for a tree, several for a shrub or a coppiced stool. */
  stems: number;
  /** The angle a branch leaves its parent at (degrees), and how much that differs branch to branch. */
  branchAngle: number;
  branchAngleSpread: number;
  /**
   * How the branches bend as they grow, -1..1: up towards the light (1, a fastigiate poplar), level, or
   * down under their own weight (-1, a spruce's lower boughs, a weeping beech).
   */
  bend: number;
  /** How crooked the branches are, 0 (straight) to 1 (an old oak's). */
  crooked: number;
  /**
   * How much the leader keeps the lead, 0..1: 1, one stem to the top (a conifer); 0, it divides early and
   * none leads (an oak in the open).
   */
  leader: number;
  /** How many branches to a whorl (conifers), and how many whorls a metre of leader carries. */
  whorl: number;
  whorlsPerMetre: number;
  /** How many branches it carries, as a share of what fills its crown: 0.3, a sparse old pine; 1, full. */
  branchiness: number;

  // The leaves, gathered into clumps: a twig's spray, a branchlet's.
  leafKind: LeafKind;
  /** How big a clump of leaves is (m across), on a tree of this kind at its own size. */
  clumpSize: number;
  /** How much one clump differs in size from the next, 0..1. */
  clumpSpread: number;

  // Its colour. Hex colours are sRGB.
  /** The colour of the crown in sunlight, seen from a way off (leaves, not one leaf). */
  leafColor: string;
  /**
   * Colours its trees take instead, one each, chosen by the tree's seed: a host whose look gives each kind
   * of tree a few greens. Left out, every tree is `leafColor`, varied by `treeVariation`.
   */
  leafColors?: string[];
  /** How much one clump differs in tone from the next, and one tree from the next, 0..1. */
  leafVariation: number;
  treeVariation: number;
  /** What the sun through the leaves is tinted by (it comes through greener and warmer than it falls). */
  throughTint: [number, number, number];
  barkColor: string;
  /** How much lighter its bark is up the trunk than at its foot, 0..1: a eucalyptus's, a birch's. */
  barkPale: number;

  // How it behaves.
  /** How little the wind moves it, 0 (a willow's whips) to 1 (an old oak's trunk). */
  stiffness: number;
}

/** The trees a course in a temperate place is likely to have, at the sizes they reach there. Rough, and by eye, until set against photographs. */
export const STARTER_SPECIES: readonly TreeSpecies[] = [
  {
    name: "Oak",
    architecture: "broadleaf",
    height: 17,
    crownRadius: 7.5,
    crownBase: 3.2,
    trunkRadius: 0.45,
    shape: "spherical",
    foliageDepth: 0.35,
    openness: 0.25,
    stems: 1,
    branchAngle: 50,
    branchAngleSpread: 15,
    bend: 0.1,
    crooked: 0.7,
    leader: 0.15,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.8,
    leafKind: "broad",
    clumpSize: 1.6,
    clumpSpread: 0.35,
    leafColor: "#5b7f3a",
    leafVariation: 0.3,
    treeVariation: 0.25,
    throughTint: [0.85, 1.0, 0.45],
    barkColor: "#5d5247",
    barkPale: 0,
    stiffness: 0.75,
  },
  {
    name: "Plane",
    architecture: "broadleaf",
    height: 22,
    crownRadius: 8,
    crownBase: 4.5,
    trunkRadius: 0.5,
    shape: "tendFlame",
    foliageDepth: 0.3,
    openness: 0.3,
    stems: 1,
    branchAngle: 40,
    branchAngleSpread: 12,
    bend: 0.25,
    crooked: 0.4,
    leader: 0.35,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.8,
    leafKind: "broad",
    clumpSize: 1.7,
    clumpSpread: 0.3,
    leafColor: "#62873f",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.9, 1.0, 0.45],
    barkColor: "#6f6a5c",
    barkPale: 0.35,
    stiffness: 0.7,
  },
  {
    name: "Eucalyptus",
    architecture: "broadleaf",
    height: 24,
    crownRadius: 6,
    crownBase: 9,
    trunkRadius: 0.4,
    shape: "flame",
    foliageDepth: 0.25,
    openness: 0.6,
    stems: 1,
    branchAngle: 32,
    branchAngleSpread: 14,
    bend: -0.15,
    crooked: 0.55,
    leader: 0.4,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.55,
    leafKind: "narrow",
    clumpSize: 1.4,
    clumpSpread: 0.45,
    leafColor: "#7d8c62",
    leafVariation: 0.3,
    treeVariation: 0.3,
    throughTint: [0.95, 1.0, 0.6],
    barkColor: "#8e8576",
    barkPale: 0.7,
    stiffness: 0.55,
  },
  {
    name: "Spruce",
    architecture: "conifer",
    height: 20,
    crownRadius: 3.4,
    crownBase: 1.5,
    trunkRadius: 0.35,
    shape: "conical",
    foliageDepth: 0.6,
    openness: 0.15,
    stems: 1,
    branchAngle: 80,
    branchAngleSpread: 8,
    bend: -0.45,
    crooked: 0.15,
    leader: 1,
    whorl: 5,
    whorlsPerMetre: 1.6,
    branchiness: 1,
    leafKind: "needle",
    clumpSize: 1.0,
    clumpSpread: 0.25,
    leafColor: "#34553a",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.7, 0.9, 0.5],
    barkColor: "#4e4239",
    barkPale: 0,
    stiffness: 0.85,
  },
  {
    name: "Scots pine",
    architecture: "conifer",
    height: 19,
    crownRadius: 4.2,
    crownBase: 10,
    trunkRadius: 0.35,
    shape: "hemispherical",
    foliageDepth: 0.3,
    openness: 0.4,
    stems: 1,
    branchAngle: 65,
    branchAngleSpread: 20,
    bend: 0.2,
    crooked: 0.6,
    leader: 0.5,
    whorl: 4,
    whorlsPerMetre: 1.4,
    branchiness: 0.85,
    leafKind: "needle",
    clumpSize: 1.7,
    clumpSpread: 0.4,
    leafColor: "#4b6440",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.8, 0.95, 0.5],
    barkColor: "#9a6a4a",
    barkPale: 0.45,
    stiffness: 0.8,
  },
  {
    name: "Shrub",
    architecture: "shrub",
    height: 2.4,
    crownRadius: 1.6,
    crownBase: 0.1,
    trunkRadius: 0.05,
    shape: "hemispherical",
    foliageDepth: 0.7,
    openness: 0.15,
    stems: 5,
    branchAngle: 30,
    branchAngleSpread: 15,
    bend: 0.2,
    crooked: 0.5,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.9,
    leafKind: "small",
    clumpSize: 0.55,
    clumpSpread: 0.3,
    leafColor: "#4f6e3b",
    leafVariation: 0.25,
    treeVariation: 0.25,
    throughTint: [0.85, 1.0, 0.5],
    barkColor: "#5a4d42",
    barkPale: 0,
    stiffness: 0.6,
  },
];

/** A copy to change, that changes no one else's. */
export function cloneSpecies(s: TreeSpecies): TreeSpecies {
  return { ...s, throughTint: [...s.throughTint], ...(s.leafColors ? { leafColors: [...s.leafColors] } : {}) };
}

/** What is wrong with a species, if anything: a list of plain sentences, empty when it is sound. */
export function checkSpecies(s: TreeSpecies): string[] {
  const out: string[] = [];
  if (!(s.height > 0)) out.push("height must be above 0");
  if (!(s.crownRadius > 0)) out.push("crownRadius must be above 0");
  if (!(s.crownBase >= 0 && s.crownBase < s.height)) out.push("crownBase must be from 0 to under height");
  if (!(s.trunkRadius > 0)) out.push("trunkRadius must be above 0");
  if (!(s.stems >= 1)) out.push("stems must be 1 or more");
  if (s.architecture === "conifer" && !(s.whorl >= 1 && s.whorlsPerMetre > 0)) out.push("a conifer needs whorl and whorlsPerMetre");
  if (!(s.clumpSize > 0)) out.push("clumpSize must be above 0");
  if (!LEAF_KIND_ROWS.includes(s.leafKind)) out.push(`leafKind must be one of ${LEAF_KIND_ROWS.join(", ")}`);
  for (const k of ["foliageDepth", "openness", "leader", "branchiness", "crooked", "leafVariation", "treeVariation", "barkPale", "stiffness", "clumpSpread"] as const) {
    if (!(s[k] >= 0 && s[k] <= 1)) out.push(`${k} must be 0..1`);
  }
  if (!(s.bend >= -1 && s.bend <= 1)) out.push("bend must be -1..1");
  if (s.leafColors && !s.leafColors.every((c) => /^#[0-9a-f]{6}$/i.test(c))) out.push("leafColors must be hex colours like #5b7f3a");
  return out;
}
