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

/**
 * Where a species is commonly found on courses, by the places Couch Golf Club's courses are in: coastal
 * California (Los Angeles, San Diego, San Francisco), the Pacific Northwest's coast, Great Britain's
 * heaths, France (Paris), Ontario (Toronto), the Dutch coast and Denmark.
 */
export type Region = "california" | "pacific-northwest" | "great-britain" | "france" | "ontario" | "netherlands" | "denmark";
export const REGION_ROWS: readonly Region[] = ["california", "pacific-northwest", "great-britain", "france", "ontario", "netherlands", "denmark"];

export interface TreeSpecies {
  name: string;
  /** Its botanical name, when it is one species (a generic row has none). */
  latin?: string;
  /** Where it is commonly found on courses (`REGION_ROWS`). Read by no grower or shader: for a host choosing a region's trees. */
  regions?: Region[];
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

/**
 * The trees a course in a temperate place is likely to have, at the sizes they reach there. By eye: the oak,
 * the plane, the eucalyptus and the Scots pine set against photographs of open-grown trees (an oak's crown
 * wider than it is tall, a plane's full oval, a park eucalyptus between its vase and Riviera's tall blue
 * gums, a Scots pine's flat lopsided top on a thin trunk).
 */
export const STARTER_SPECIES: readonly TreeSpecies[] = [
  {
    name: "Oak",
    latin: "Quercus robur",
    regions: ["great-britain", "france", "netherlands", "denmark"],
    architecture: "broadleaf",
    height: 17,
    crownRadius: 11,
    crownBase: 2.5,
    trunkRadius: 0.45,
    shape: "spherical",
    foliageDepth: 0.35,
    openness: 0.35,
    stems: 1,
    branchAngle: 60,
    branchAngleSpread: 15,
    bend: -0.1,
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
    latin: "Platanus × hispanica",
    regions: ["france", "great-britain", "netherlands", "california"],
    architecture: "broadleaf",
    height: 22,
    crownRadius: 10,
    crownBase: 3,
    trunkRadius: 0.5,
    shape: "spherical",
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
    latin: "Eucalyptus globulus",
    regions: ["california"],
    architecture: "broadleaf",
    height: 26,
    crownRadius: 8.5,
    crownBase: 7.5,
    trunkRadius: 0.4,
    shape: "spherical",
    foliageDepth: 0.25,
    openness: 0.65,
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
    latin: "Picea abies",
    regions: ["denmark", "netherlands", "ontario"],
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
    latin: "Pinus sylvestris",
    regions: ["great-britain", "denmark", "netherlands"],
    architecture: "conifer",
    height: 19,
    crownRadius: 6.5,
    crownBase: 11.5,
    trunkRadius: 0.35,
    shape: "hemispherical",
    foliageDepth: 0.3,
    openness: 0.4,
    stems: 1,
    branchAngle: 65,
    branchAngleSpread: 20,
    bend: -0.1,
    crooked: 0.7,
    leader: 0.2,
    whorl: 4,
    whorlsPerMetre: 1.6,
    branchiness: 0.85,
    leafKind: "needle",
    clumpSize: 1.7,
    clumpSpread: 0.4,
    leafColor: "#5f7a5c",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.8, 0.95, 0.5],
    barkColor: "#9a6a4a",
    barkPale: 0.45,
    stiffness: 0.8,
  },
  {
    name: "Shrub",
    regions: ["california", "pacific-northwest", "great-britain", "france", "ontario", "netherlands", "denmark"],
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

/**
 * More species, by the regions Couch Golf Club's courses are in, keyed by a short id. Each row's size is a
 * typical open-grown tree of its kind on a course or in a park there (not a forest-grown record tree),
 * taken from the source named over it; its form, colours and the rest are by eye, from photographs.
 * "UF/IFAS" is Gilman and Watson's tree fact sheets (University of Florida, Environmental Horticulture).
 */
export const MORE_SPECIES: Readonly<Record<string, TreeSpecies>> = {
  // UF/IFAS ST-244 (European beech): 50–75 ft tall, 40–60 ft spread. A dense dome, leaves only on its
  // outside, low-branched when open-grown; smooth grey bark.
  beech: {
    name: "Beech",
    latin: "Fagus sylvatica",
    regions: ["denmark", "great-britain", "netherlands", "france"],
    architecture: "broadleaf",
    height: 20,
    crownRadius: 8,
    crownBase: 2.5,
    trunkRadius: 0.45,
    shape: "spherical",
    foliageDepth: 0.15,
    openness: 0.08,
    stems: 1,
    branchAngle: 45,
    branchAngleSpread: 12,
    bend: 0.05,
    crooked: 0.3,
    leader: 0.3,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.95,
    leafKind: "broad",
    clumpSize: 1.5,
    clumpSpread: 0.3,
    leafColor: "#557a36",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.85, 1.0, 0.45],
    barkColor: "#8b8a82",
    barkPale: 0.1,
    stiffness: 0.8,
  },
  // UF/IFAS ST-97 (European birch): 40–50 ft tall, 15–25 ft spread. A narrow open oval with a leader,
  // drooping twigs, light yellow-green; white bark, dark and fissured at its foot.
  silverBirch: {
    name: "Silver birch",
    latin: "Betula pendula",
    regions: ["great-britain", "denmark", "netherlands"],
    architecture: "broadleaf",
    height: 15,
    crownRadius: 3.5,
    crownBase: 3,
    trunkRadius: 0.2,
    shape: "spherical",
    foliageDepth: 0.3,
    openness: 0.6,
    stems: 1,
    branchAngle: 40,
    branchAngleSpread: 12,
    bend: -0.35,
    crooked: 0.35,
    leader: 0.6,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.5,
    leafKind: "small",
    clumpSize: 0.8,
    clumpSpread: 0.35,
    leafColor: "#7b9a48",
    leafVariation: 0.3,
    treeVariation: 0.25,
    throughTint: [0.95, 1.0, 0.5],
    barkColor: "#d4d0c4",
    barkPale: 0.3,
    stiffness: 0.35,
  },
  // UF/IFAS ST-70 (common alder): 40–50 ft tall, 20–40 ft spread. Conical to oval on a leader that keeps
  // on, by water; dark green, dark bark.
  blackAlder: {
    name: "Black alder",
    latin: "Alnus glutinosa",
    regions: ["denmark", "netherlands", "france"],
    architecture: "broadleaf",
    height: 15,
    crownRadius: 4,
    crownBase: 2.5,
    trunkRadius: 0.25,
    shape: "conical",
    foliageDepth: 0.3,
    openness: 0.3,
    stems: 1,
    branchAngle: 55,
    branchAngleSpread: 12,
    bend: 0,
    crooked: 0.3,
    leader: 0.75,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.8,
    leafKind: "broad",
    clumpSize: 1.2,
    clumpSpread: 0.3,
    leafColor: "#4a6a35",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.8, 1.0, 0.45],
    barkColor: "#4f4943",
    barkPale: 0,
    stiffness: 0.6,
  },
  // UF/IFAS ST-501 (Lombardy poplar): 40–60 ft tall, 10–12 ft spread (taller in Europe's lines of them).
  // A column of short branches that all turn up, from near the ground.
  lombardyPoplar: {
    name: "Lombardy poplar",
    latin: "Populus nigra 'Italica'",
    regions: ["france", "netherlands"],
    architecture: "broadleaf",
    height: 22,
    crownRadius: 2.5,
    crownBase: 2,
    trunkRadius: 0.4,
    shape: "tendFlame",
    foliageDepth: 0.45,
    openness: 0.25,
    stems: 1,
    branchAngle: 15,
    branchAngleSpread: 6,
    bend: 0.9,
    crooked: 0.15,
    leader: 0.85,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.9,
    leafKind: "broad",
    clumpSize: 0.9,
    clumpSpread: 0.25,
    leafColor: "#6a8a3e",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.9, 1.0, 0.45],
    barkColor: "#6a6258",
    barkPale: 0.1,
    stiffness: 0.4,
  },
  // UF/IFAS ENH-734 (weeping willow): 30–50 ft tall and as wide. A broad weeping dome, light yellow-green,
  // by lakes. The grower cannot hang whips from arching limbs: branches bend down under bend -1 but still
  // fill the crown from inside, so this is a low, broad, drooping dome, not a curtain.
  weepingWillow: {
    name: "Weeping willow",
    latin: "Salix × sepulcralis",
    regions: ["france", "denmark", "netherlands"],
    architecture: "broadleaf",
    height: 11,
    crownRadius: 7.5,
    crownBase: 1.2,
    trunkRadius: 0.5,
    shape: "hemispherical",
    foliageDepth: 0.35,
    openness: 0.35,
    stems: 1,
    branchAngle: 50,
    branchAngleSpread: 15,
    bend: -0.95,
    crooked: 0.35,
    leader: 0.1,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.85,
    leafKind: "narrow",
    clumpSize: 1.4,
    clumpSpread: 0.35,
    leafColor: "#8ea655",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.95, 1.0, 0.5],
    barkColor: "#6b5e4e",
    barkPale: 0,
    stiffness: 0.1,
  },
  // The Conservation Volunteers' tree library (hawthorn): typically 5–8 m. A small crooked tree, or a hedge
  // left to grow up; dense small leaves, dark.
  hawthorn: {
    name: "Hawthorn",
    latin: "Crataegus monogyna",
    regions: ["great-britain", "denmark", "netherlands", "france"],
    architecture: "broadleaf",
    height: 6,
    crownRadius: 3,
    crownBase: 1.2,
    trunkRadius: 0.15,
    shape: "spherical",
    foliageDepth: 0.45,
    openness: 0.2,
    stems: 1,
    branchAngle: 55,
    branchAngleSpread: 18,
    bend: -0.05,
    crooked: 0.85,
    leader: 0.1,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.9,
    leafKind: "small",
    clumpSize: 0.7,
    clumpSpread: 0.35,
    leafColor: "#4e6b34",
    leafVariation: 0.25,
    treeVariation: 0.25,
    throughTint: [0.85, 1.0, 0.45],
    barkColor: "#5e5248",
    barkPale: 0,
    stiffness: 0.7,
  },
  // RHS (Ulex europaeus): 1.5–2.5 m tall and across. A dense spiny heath shrub, dark green spines (the
  // yellow flowers are spring's, left out).
  gorse: {
    name: "Gorse",
    latin: "Ulex europaeus",
    regions: ["great-britain", "denmark", "netherlands"],
    architecture: "shrub",
    height: 1.6,
    crownRadius: 1.0,
    crownBase: 0.15,
    trunkRadius: 0.03,
    shape: "hemispherical",
    foliageDepth: 0.85,
    openness: 0.08,
    stems: 7,
    branchAngle: 30,
    branchAngleSpread: 15,
    bend: 0.15,
    crooked: 0.6,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 1,
    leafKind: "needle",
    clumpSize: 0.3,
    clumpSpread: 0.3,
    leafColor: "#3e5530",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.75, 0.95, 0.45],
    barkColor: "#5a4a3a",
    barkPale: 0,
    stiffness: 0.65,
  },
  // NC State Extension (Picea sitchensis): 20–30 ft wide; the Gymnosperm Database for its form (a conical
  // crown of level boughs). A big coastal conifer, blue-green, in Danish plantations and the PNW.
  sitkaSpruce: {
    name: "Sitka spruce",
    latin: "Picea sitchensis",
    regions: ["denmark", "pacific-northwest"],
    architecture: "conifer",
    height: 28,
    crownRadius: 4.5,
    crownBase: 1.5,
    trunkRadius: 0.5,
    shape: "conical",
    foliageDepth: 0.5,
    openness: 0.25,
    stems: 1,
    branchAngle: 80,
    branchAngleSpread: 8,
    bend: -0.2,
    crooked: 0.15,
    leader: 1,
    whorl: 5,
    whorlsPerMetre: 1.2,
    branchiness: 0.95,
    leafKind: "needle",
    clumpSize: 1.1,
    clumpSpread: 0.25,
    leafColor: "#3d5a4e",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.7, 0.9, 0.55],
    barkColor: "#6b5f57",
    barkPale: 0,
    stiffness: 0.85,
  },
  // UF/IFAS ENH-627 (Pinus nigra): 40–60 ft in the landscape; Virginia Tech Extension: about 30 ft spread.
  // Dark and dense, the pine of the Dutch dunes and Danish coasts, broad-crowned when old; grey-brown plated
  // bark, pinker up the trunk.
  corsicanPine: {
    name: "Corsican pine",
    latin: "Pinus nigra",
    regions: ["netherlands", "denmark", "france", "great-britain"],
    architecture: "conifer",
    height: 18,
    crownRadius: 4.5,
    crownBase: 5,
    trunkRadius: 0.35,
    shape: "spherical",
    foliageDepth: 0.4,
    openness: 0.2,
    stems: 1,
    branchAngle: 70,
    branchAngleSpread: 15,
    bend: 0.25,
    crooked: 0.3,
    leader: 0.6,
    whorl: 4,
    whorlsPerMetre: 1.2,
    branchiness: 0.95,
    leafKind: "needle",
    clumpSize: 1.6,
    clumpSpread: 0.35,
    leafColor: "#374c33",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.7, 0.9, 0.5],
    barkColor: "#5f524a",
    barkPale: 0.2,
    stiffness: 0.85,
  },
  // UF/IFAS (Pseudotsuga menziesii): 40–60 ft tall, 15–25 ft spread in a landscape; taller on the PNW's
  // courses, so 30 m here. A tall conifer, somewhat open, its boughs drooping and their tips turned up.
  douglasFir: {
    name: "Douglas fir",
    latin: "Pseudotsuga menziesii",
    regions: ["pacific-northwest", "denmark"],
    architecture: "conifer",
    height: 30,
    crownRadius: 5,
    crownBase: 3,
    trunkRadius: 0.55,
    shape: "conical",
    foliageDepth: 0.45,
    openness: 0.45,
    stems: 1,
    branchAngle: 75,
    branchAngleSpread: 10,
    bend: -0.3,
    crooked: 0.3,
    leader: 0.9,
    whorl: 5,
    whorlsPerMetre: 1.0,
    branchiness: 0.75,
    leafKind: "needle",
    clumpSize: 1.3,
    clumpSpread: 0.3,
    leafColor: "#3b573a",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.7, 0.9, 0.5],
    barkColor: "#5a4537",
    barkPale: 0,
    stiffness: 0.85,
  },
  // UF/IFAS ST-631 (Thuja plicata): 50–70 ft tall, 30–40 ft spread. A PNW conifer with drooping boughs and
  // hanging sprays of scale leaves, reddish fibrous bark. Its buttressed foot is not grown (the trunk tapers
  // by the pipe model alone).
  westernRedCedar: {
    name: "Western red cedar",
    latin: "Thuja plicata",
    regions: ["pacific-northwest"],
    architecture: "conifer",
    height: 20,
    crownRadius: 4.5,
    crownBase: 1,
    trunkRadius: 0.5,
    shape: "conical",
    foliageDepth: 0.5,
    openness: 0.15,
    stems: 1,
    branchAngle: 80,
    branchAngleSpread: 10,
    bend: -0.55,
    crooked: 0.2,
    leader: 0.85,
    whorl: 3,
    whorlsPerMetre: 2,
    branchiness: 0.95,
    leafKind: "small",
    clumpSize: 1.1,
    clumpSpread: 0.3,
    leafColor: "#3f5e36",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.75, 0.95, 0.45],
    barkColor: "#7a5443",
    barkPale: 0.1,
    stiffness: 0.75,
  },
  // UF/IFAS ENH-383 (Hesperocyparis macrocarpa): 40–70 ft tall, 30–40 ft spread. On the coast, wind-shaped:
  // a few great limbs holding a broad flat-topped mass of dark scale leaves.
  montereyCypress: {
    name: "Monterey cypress",
    latin: "Hesperocyparis macrocarpa",
    regions: ["california"],
    architecture: "broadleaf",
    height: 18,
    crownRadius: 7,
    crownBase: 3,
    trunkRadius: 0.6,
    shape: "inverseConical",
    foliageDepth: 0.35,
    openness: 0.15,
    stems: 1,
    branchAngle: 45,
    branchAngleSpread: 12,
    bend: 0.15,
    crooked: 0.6,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.9,
    leafKind: "small",
    clumpSize: 2.2,
    clumpSpread: 0.35,
    leafColor: "#2f4a2c",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.7, 0.9, 0.45],
    barkColor: "#6e645a",
    barkPale: 0.1,
    stiffness: 0.85,
  },
  // Britannica (Monterey pine): commonly 12–18 m within 25 years of planting; State Herbarium of South
  // Australia's Plant Selector: 8–10 m spread. An irregular rounded crown going flat, long grass-green
  // needles, dark furrowed bark.
  montereyPine: {
    name: "Monterey pine",
    latin: "Pinus radiata",
    regions: ["california"],
    architecture: "broadleaf",
    height: 20,
    crownRadius: 6.5,
    crownBase: 5,
    trunkRadius: 0.45,
    shape: "spherical",
    foliageDepth: 0.35,
    openness: 0.35,
    stems: 1,
    branchAngle: 60,
    branchAngleSpread: 18,
    bend: 0.25,
    crooked: 0.6,
    leader: 0.15,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.75,
    leafKind: "needle",
    clumpSize: 1.9,
    clumpSpread: 0.4,
    leafColor: "#3f5f35",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.75, 0.95, 0.45],
    barkColor: "#4f463f",
    barkPale: 0.1,
    stiffness: 0.8,
  },
  // California Native Plant Society, San Diego (Pinus torreyana): 40–70 ft tall, 35 ft spread, an open
  // picturesque form. Few crooked limbs, long grey-green needles in tufts. Wild ones lean; the grower stands
  // every tree upright (a host leans it at most 3 degrees).
  torreyPine: {
    name: "Torrey pine",
    latin: "Pinus torreyana",
    regions: ["california"],
    architecture: "conifer",
    height: 15,
    crownRadius: 5.5,
    crownBase: 4,
    trunkRadius: 0.4,
    shape: "hemispherical",
    foliageDepth: 0.25,
    openness: 0.5,
    stems: 1,
    branchAngle: 55,
    branchAngleSpread: 20,
    bend: 0.35,
    crooked: 0.85,
    leader: 0.2,
    whorl: 3,
    whorlsPerMetre: 1.3,
    branchiness: 1,
    leafKind: "needle",
    clumpSize: 1.8,
    clumpSpread: 0.45,
    leafColor: "#5c7350",
    leafVariation: 0.25,
    treeVariation: 0.25,
    throughTint: [0.85, 0.95, 0.55],
    barkColor: "#76604f",
    barkPale: 0.2,
    stiffness: 0.75,
  },
  // CSU Stanislaus campus tree map, after Cal Poly's SelecTree (Pinus halepensis): 30–60 ft tall, 20–40 ft
  // wide. The high-crowned pine of Los Angeles' parks and courses: an irregular open crown of crooked
  // boughs, grey-green; grey bark. It leans in the wild; the grower stands it upright.
  aleppoPine: {
    name: "Aleppo pine",
    latin: "Pinus halepensis",
    regions: ["california", "france"],
    architecture: "conifer",
    height: 15,
    crownRadius: 5.5,
    crownBase: 4,
    trunkRadius: 0.35,
    shape: "hemispherical",
    foliageDepth: 0.3,
    openness: 0.45,
    stems: 1,
    branchAngle: 60,
    branchAngleSpread: 18,
    bend: 0.2,
    crooked: 0.6,
    leader: 0.35,
    whorl: 4,
    whorlsPerMetre: 1.6,
    branchiness: 1,
    leafKind: "needle",
    clumpSize: 1.6,
    clumpSpread: 0.4,
    leafColor: "#5f7656",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.8, 0.95, 0.55],
    barkColor: "#7a7068",
    barkPale: 0.15,
    stiffness: 0.75,
  },
  // UF/IFAS ST-472 (Pinus pinea): 35–60 ft tall, 35–45 ft spread. The umbrella pine: a tall clear trunk that
  // divides into rising limbs under a flat wide crown, so grown as a broadleaf, with needles; orange-brown
  // plated bark.
  stonePine: {
    name: "Stone pine",
    latin: "Pinus pinea",
    regions: ["california", "france"],
    architecture: "broadleaf",
    height: 15,
    crownRadius: 9.5,
    crownBase: 6,
    trunkRadius: 0.45,
    shape: "hemispherical",
    foliageDepth: 0.2,
    openness: 0.25,
    stems: 1,
    branchAngle: 40,
    branchAngleSpread: 10,
    bend: 0.3,
    crooked: 0.35,
    leader: 0.4,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.8,
    leafKind: "needle",
    clumpSize: 1.8,
    clumpSpread: 0.35,
    leafColor: "#4f7334",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.8, 0.95, 0.5],
    barkColor: "#8a5a3e",
    barkPale: 0.3,
    stiffness: 0.8,
  },
  // University of Redlands tree species accounts (Quercus agrifolia): 25–80 ft tall in cultivation; UC Davis
  // Arboretum: 20–50 ft tall and wide. A broad spreading evergreen oak, low on crooked limbs, small dark
  // holly-like leaves.
  coastLiveOak: {
    name: "Coast live oak",
    latin: "Quercus agrifolia",
    regions: ["california"],
    architecture: "broadleaf",
    height: 11,
    crownRadius: 8.5,
    crownBase: 1.8,
    trunkRadius: 0.5,
    shape: "hemispherical",
    foliageDepth: 0.3,
    openness: 0.2,
    stems: 1,
    branchAngle: 70,
    branchAngleSpread: 18,
    bend: -0.1,
    crooked: 0.85,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.85,
    leafKind: "small",
    clumpSize: 1.4,
    clumpSpread: 0.35,
    leafColor: "#3f5a2e",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.8, 0.95, 0.45],
    barkColor: "#6a645c",
    barkPale: 0,
    stiffness: 0.8,
  },
  // California Native Plant Society, San Diego (Platanus racemosa): 40+ ft tall, 30 ft spread, often several
  // trunks; Virginia Tech Dendrology: 40–100 ft. Crooked and open, pale mottled bark; Riviera has many. Its
  // lean and its several trunks are not grown: one upright trunk.
  californiaSycamore: {
    name: "California sycamore",
    latin: "Platanus racemosa",
    regions: ["california"],
    architecture: "broadleaf",
    height: 18,
    crownRadius: 7,
    crownBase: 3.5,
    trunkRadius: 0.5,
    shape: "tendFlame",
    foliageDepth: 0.25,
    openness: 0.55,
    stems: 1,
    branchAngle: 55,
    branchAngleSpread: 20,
    bend: 0.05,
    crooked: 1,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.45,
    leafKind: "broad",
    clumpSize: 1.9,
    clumpSpread: 0.4,
    leafColor: "#71904a",
    leafVariation: 0.3,
    treeVariation: 0.25,
    throughTint: [0.9, 1.0, 0.5],
    barkColor: "#c4bca9",
    barkPale: 0.6,
    stiffness: 0.65,
  },
  // Cornell Woody Plants Database (Acer saccharum): 60–75 ft tall; UF/IFAS ENH-210: 35–50 ft spread. A dense
  // oval crown, its leaves on its outside.
  sugarMaple: {
    name: "Sugar maple",
    latin: "Acer saccharum",
    regions: ["ontario"],
    architecture: "broadleaf",
    height: 20,
    crownRadius: 6.5,
    crownBase: 3,
    trunkRadius: 0.45,
    shape: "spherical",
    foliageDepth: 0.2,
    openness: 0.1,
    stems: 1,
    branchAngle: 40,
    branchAngleSpread: 12,
    bend: 0.15,
    crooked: 0.3,
    leader: 0.4,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.95,
    leafKind: "broad",
    clumpSize: 1.6,
    clumpSpread: 0.3,
    leafColor: "#557a35",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.85, 1.0, 0.45],
    barkColor: "#6a6258",
    barkPale: 0,
    stiffness: 0.75,
  },
  // UF/IFAS ST-560 (northern red oak): 60–70 ft tall, 40–60 ft spread open-grown. Rounded, on a few big
  // limbs; grey bark with paler stripes.
  redOak: {
    name: "Red oak",
    latin: "Quercus rubra",
    regions: ["ontario", "denmark", "netherlands"],
    architecture: "broadleaf",
    height: 20,
    crownRadius: 8,
    crownBase: 3,
    trunkRadius: 0.5,
    shape: "spherical",
    foliageDepth: 0.3,
    openness: 0.25,
    stems: 1,
    branchAngle: 50,
    branchAngleSpread: 15,
    bend: 0.1,
    crooked: 0.45,
    leader: 0.25,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.85,
    leafKind: "broad",
    clumpSize: 1.7,
    clumpSpread: 0.3,
    leafColor: "#56783a",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.85, 1.0, 0.45],
    barkColor: "#6c665d",
    barkPale: 0.1,
    stiffness: 0.75,
  },
  // UF/IFAS ST-476 (Pinus strobus): 50–80 ft tall, 25–35 ft spread. Tiers of level boughs far apart, soft
  // blue-green needles, dark grey bark.
  easternWhitePine: {
    name: "Eastern white pine",
    latin: "Pinus strobus",
    regions: ["ontario"],
    architecture: "conifer",
    height: 22,
    crownRadius: 5.5,
    crownBase: 3,
    trunkRadius: 0.45,
    shape: "tendFlame",
    foliageDepth: 0.35,
    openness: 0.45,
    stems: 1,
    branchAngle: 80,
    branchAngleSpread: 10,
    bend: 0.15,
    crooked: 0.3,
    leader: 0.6,
    whorl: 5,
    whorlsPerMetre: 0.7,
    branchiness: 0.85,
    leafKind: "needle",
    clumpSize: 1.7,
    clumpSpread: 0.35,
    leafColor: "#4b6650",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.75, 0.95, 0.55],
    barkColor: "#5a5550",
    barkPale: 0,
    stiffness: 0.75,
  },
  // UF/IFAS (Picea glauca): 40–60 ft tall, 15–20 ft spread. Narrow and conical, to the ground, blue-green.
  whiteSpruce: {
    name: "White spruce",
    latin: "Picea glauca",
    regions: ["ontario"],
    architecture: "conifer",
    height: 16,
    crownRadius: 2.8,
    crownBase: 0.8,
    trunkRadius: 0.25,
    shape: "conical",
    foliageDepth: 0.6,
    openness: 0.15,
    stems: 1,
    branchAngle: 75,
    branchAngleSpread: 8,
    bend: -0.2,
    crooked: 0.15,
    leader: 1,
    whorl: 5,
    whorlsPerMetre: 1.8,
    branchiness: 1,
    leafKind: "needle",
    clumpSize: 0.9,
    clumpSpread: 0.25,
    leafColor: "#3f5b4c",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.7, 0.9, 0.55],
    barkColor: "#605750",
    barkPale: 0,
    stiffness: 0.85,
  },
};

/** Every species: the starters, then the regional ones. */
export const ALL_SPECIES: readonly TreeSpecies[] = [...STARTER_SPECIES, ...Object.values(MORE_SPECIES)];

/** A copy to change, that changes no one else's. */
export function cloneSpecies(s: TreeSpecies): TreeSpecies {
  return {
    ...s,
    throughTint: [...s.throughTint],
    ...(s.leafColors ? { leafColors: [...s.leafColors] } : {}),
    ...(s.regions ? { regions: [...s.regions] } : {}),
  };
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
  if (s.regions && !s.regions.every((r) => REGION_ROWS.includes(r))) out.push(`regions must be from ${REGION_ROWS.join(", ")}`);
  if (s.leafColors && !s.leafColors.every((c) => /^#[0-9a-f]{6}$/i.test(c))) out.push("leafColors must be hex colours like #5b7f3a");
  return out;
}
