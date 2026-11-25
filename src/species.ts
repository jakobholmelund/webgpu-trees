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
 *   plane, eucalyptus; an old pine, whose leader has given up the lead). Grown from its buds, in the light,
 *   inside its crown's outline.
 * - `conifer`: one leader to the top, with branches in whorls along it, longest low down (spruce, fir,
 *   most pines when young). Grown whorl by whorl.
 * - `shrub`: several stems from the ground, no trunk to speak of (holly, gorse, broom, rhododendron).
 * - `palm`: one unbranched stem, as thick at the top as at the foot, crowned with a head of fronds that
 *   arch out from its top and hang (date palm, fan palm). `whorl` is how many fronds the head carries,
 *   `bend` how far they arch over, and `crownRadius` how far they reach.
 */
export type Architecture = "broadleaf" | "conifer" | "shrub" | "palm";

/**
 * What its leaves are like, for the looks' sprays of them: broad (oak, maple, plane), narrow (eucalyptus,
 * willow), needle (a fir's or a spruce's short needles all along its shoots), small (box, holly, a shrub's),
 * frond (a palm's: a pinnate frond or a fan), pine (a pine's long needles in brushes at its shoots' ends,
 * the shoots behind bare: a pine keeps its needles only a few years). A whorled conifer with needles has its
 * near boughs drawn as sheets; a pine's tufts are not boughs, and are drawn as sprays.
 */
export type LeafKind = "broad" | "narrow" | "needle" | "small" | "frond" | "pine";
export const LEAF_KIND_ROWS: readonly LeafKind[] = ["broad", "narrow", "needle", "small", "frond", "pine"];

/**
 * The outline of the crown seen from the side: how wide it is at each height, from its base to its top.
 * Weber and Penn's shapes (1995), less the ones that serve only a tree's first branches, made round
 * (`CROWN_OUTLINES` in tree.ts): each is widest somewhere up the crown, upright there, and curves in above
 * and below. A row's `crownPeak` and `crownRound` say where and how, over its shape's own.
 */
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
  /**
   * The crown proportions its real trees are documented to take, from drawn up in a stand to open-grown,
   * [least, most]: `crownRatio` its crown's radius over its height (a beech in a wood, 0.14, to a parkland
   * beech's dome, 0.5), `baseRatio` its crown's base over its height (branches to the ground in the open to
   * a wood's long clean bole). Read by no grower or shader: for a host telling which species a measured tree
   * is, by the range of its kind and not by the one specimen the row grows when nothing gives a tree's size
   * (`height`, `crownRadius`, `crownBase`), which is set to a showpiece and may be retuned. From
   * docs/MORPHOLOGY.md and its sources, noted on each species. Left out: no source gives them, and a host
   * has only the specimen's.
   */
  crownRatio?: [number, number];
  baseRatio?: [number, number];
  /**
   * How tall its real trees grow (m), [typical, most]: the low end of the height its grown trees commonly
   * reach, and the most the sources give for the species (beyond the odd record tree). Read by no grower or
   * shader: for a host telling which species a measured tree is, so a tree taller than its kind grows is not
   * taken for it (a young tree is well under the typical). From docs/MORPHOLOGY.md and its sources, noted on
   * each species.
   */
  heightRange?: [number, number];
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
  /**
   * Where the crown is widest, as a share of the way up it (0 its base, 1 its top), over its shape's own: an
   * open-grown oak is widest a sixth of the way up, an old Scots pine's top nearly a third.
   */
  crownPeak?: number;
  /**
   * How round the crown is above its widest, over its shape's own: the exponent of the superellipse its
   * outline follows there (Rautiainen et al. 2008), 1 a cone, 2 an ellipse, 3 or more a flat top.
   */
  crownRound?: number;
  /** How lumpy the crown's outline is, 0..1: 0 smooth all round, 1 bulging out and falling back by nearly a third between. */
  lobes?: number;

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
  /**
   * How many great limbs (scaffolds) a broadleaf's trunk carries into its crown, below its leader. Left out:
   * 4, and one more for every third of `leader` (an oak's few, a birch's many along its leader); a shrub's
   * stems are its scaffolds, and it has none besides.
   */
  scaffolds?: number;
  /**
   * How readily a broadleaf or a shrub sheds its shaded branches, 0..1: the light a branch must gather for
   * each of its pieces of wood to be kept (Takenaka 1994). Left out: from `openness` and `branchiness`.
   */
  shed?: number;
  /**
   * How many dead branch stubs a long clean bole keeps, 0..1: the lower branches a tree grown in a wood
   * has lost, broken off short (a birch's, an oak's, an alder's). A pine or a beech prunes itself clean:
   * 0 or left out, none.
   */
  boleStubs?: number;

  // How its limbs grow along their length (Weber and Penn's curvature, SeedThree's per-order settings): all
  // left out, as the rest of the row has them.
  /**
   * The angle its first-order limbs (a broadleaf's great limbs, a conifer's boughs) leave the trunk at
   * (degrees from upright), at the top of its crown and at its base: [top, base]. A spruce's top boughs
   * rise and its low ones droop ([55, 115]); an oak's scaffolds leave steeper above than below. Left out:
   * `branchAngle`, swung wider low and steeper high.
   */
  limbAngle?: [number, number];
  /**
   * How a first-order limb turns along its length (degrees; up +, down -): over all of it, or, when
   * `limbCurveBack` is given, over its inner half, its outer half turning by that instead. A spruce's
   * J-curved bough droops (-35) and its tip turns up (+45); a Torrey pine's limb runs out level and turns up
   * at its end (0, +50); a willow's rises and arches over (+10, -60). Left out: from `bend`.
   */
  limbCurve?: number;
  limbCurveBack?: number;
  /**
   * How far a twig turns at each node where its tip died and a side bud took the lead (sympodial growth,
   * degrees): a plane's or a sycamore's zigzag twigs (25), a maple's or an ash's straight ones (0, its
   * terminal bud goes on). Left out: 15.
   */
  zigzag?: number;
  /**
   * How far its wood runs straight between elbows (m): a crooked tree whose limbs and branches zigzag at
   * angular elbows (a California sycamore's), all their wandering and turning to the light at once at each,
   * rather than a little at every internode, which drawn through its nodes is a wavy line. Left out: they
   * wander as they grow, and `zigzag` sets their twigs aside internode by internode.
   */
  zigzagRun?: number;
  /**
   * How its side buds are set round a shoot: one at a node turning by the golden angle (`spiral`, most
   * trees), opposite in pairs crossed at right angles (`opposite`: maple, ash; one of each pair is grown, so
   * its shoots alternate side to side and cross), or in two ranks in the shoot's plane (`distichous`: beech,
   * elm, whose shoots lie in flat fans). Left out: spiral.
   */
  phyllotaxis?: "spiral" | "opposite" | "distichous";
  /**
   * How far a conifer's side shoots hang from their bough, 0..1: 0 level, in the bough's plane (a fir's flat
   * spray, a pine's plate); 1 straight down (a Norway spruce's comb of hanging shoots, a cedar's hanging
   * sprays). Left out: from `bend`.
   */
  sprayHang?: number;
  /**
   * How much of the crown's underside is cleared of leaves, 0..1, so its limbs show beneath it (a stone
   * pine's umbrella on bare limbs, a park oak's raised skirt): the leaves under a bowl from the crown's base at
   * its rim up to this share of the way to its heart at its middle are not grown.
   */
  canopyLift?: number;
  /**
   * Where a broadleaf's trunk divides into its great limbs, as a share of its crown's base's height (a stone
   * pine's stem forks a third to half of the way up its height, its limbs rising bare in V-forks to the
   * umbrella, the ribs under it): left out, at its crown's base.
   */
  fork?: number;
  /**
   * How many stems a forked stem (`fork`) divides into there, 2 to 4 (a stone pine's few thick crooked stems),
   * each as thick as the pipe model makes it, the stem's wood shared among them; with it, the stem leans or
   * sways on the way up as `crooked` says. Left out: its great limbs leave it one by one, as `scaffolds` says.
   */
  forkStems?: number;
  /**
   * How many times each of those stems divides again in V-forks, rising then spreading, before its arms are
   * limbs (a stone pine's). Left out: its stems are trunks of their own, each leaning out from the fork and
   * turning up, with its share of the crown, its own great limbs (`scaffolds`) and its own leader (a forked
   * oak's two trunks, a coast live oak's leaning ones).
   */
  forkSplits?: number;
  /**
   * The share of its trees whose trunk forks (`fork`, `forkStems`), 0..1: each tree's seed decides, so a
   * stand is a mix (a parkland oak's forked trunk, a coast live oak's two or three leaning trunks). Fewer in
   * a closed wood, where a tree is drawn up on one stem, and those fork higher. Left out: every tree if
   * `fork` and `forkStems` are given, else none.
   */
  forkShare?: number;
  /**
   * How far one tree's fork strays from `fork`, either way, as a share of its crown base's height: a fork
   * near the ground (one root plate, its trunks leaning apart from it) to one under the crown. Left out: 0.
   */
  forkSpread?: number;
  /** The most stems a forked trunk divides into (`forkStems` the least), each tree its own. Left out: `forkStems`. */
  forkStemsMost?: number;
  /**
   * The share of its trees that grow as a clump of a few stems from one root plate, 0..1 (a silver birch's or
   * a black alder's from a stool): each a tree's stem, leaning out a little and turning up, with its share of
   * one crown. Each tree's seed decides; fewer in a closed wood. Left out: none (a shrub's `stems` are its own).
   */
  stemShare?: number;
  /** How many stems such a clump has, [least, most], 2..4. Left out: [2, 3]. */
  stemRange?: [number, number];
  /**
   * How far its leaves gather into flat-topped pads, 0..1: each branch off a great limb keeps only the leaves
   * near its top, so the crown is shelves of foliage with air and bare wood under each (a Monterey cypress
   * on a headland, an old Scots pine's plates, a cloud-pruned pine). 0 or left out: an even skin.
   */
  pads?: number;
  /**
   * How far its leaves gather into a few separate bunches hanging at its branches' ends, with sky between
   * them, 0..1 (a blue gum's pendulous clumps of sickle leaves): each branch off a great limb keeps its leaves
   * only on its last shoots, the bunch hanging under them, bigger the more it gathers, and a share of its
   * branches bear none, their wood shed back to the limb. 0 or left out: an even skin.
   */
  clusters?: number;
  /**
   * How far a tree of one stem leans where it leaves the ground (degrees from upright), its trunk easing back
   * upright by its crown's base, so its crown stands over its foot and its stem is a curve under it (a
   * California sycamore's, by a creek); each tree leans its own way. Left out: 0, it stands upright (a host
   * may lean a whole tree a little).
   */
  lean?: number;
  /**
   * How much its trunk's foot spreads into buttresses and flutes, 0..1 (a western red cedar's, a Sitka
   * spruce's): the root flare wider and higher. Left out: 0, an ordinary flare.
   */
  buttress?: number;

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

  /**
   * How much of the crown hangs in whips, 0..1: twigs that grow out and then fall straight down under their
   * own weight, to as low as the crown's base, leaved along all their length (a weeping willow's curtain,
   * a weeping birch's tresses). 0 or left out: none.
   */
  weep?: number;

  // A palm's (architecture "palm"; palm.ts). All left out, a feather palm's, kept as a palm on a course is.
  /** Its leaf: a feather palm's (leaflets along a rachis: date palm, queen palm) or a fan palm's (a pleated fan on a long stalk). */
  palmLeaf?: "feather" | "fan";
  /**
   * How its trees are kept unless a host says otherwise of a tree: `natural` (its dead leaves hanging under
   * its green, a fan palm's skirt), `skirt` (cut back to a short one), `skinned` (dead and drooping leaves cut,
   * the stem cleaned), `pineapple` (cut back to the leaves above the level, its leaf bases trimmed into a ball
   * under the crown). Left out: a feather palm pineapple cut, a fan palm skinned.
   */
  pruning?: "natural" | "skirt" | "skinned" | "pineapple";
  /** How far a feather palm's leaflets stand in several planes, 0..1 (a queen palm's plumose leaf); 0, two flat rows in a V. */
  plumose?: number;
  /** A dead leaf's colour (hex): straw to grey-brown. */
  deadColor?: string;
  /** How far down its stem a palm's skirt of dead leaves hangs when it is kept natural, 0..1 of the way to the ground. */
  skirt?: number;
  /** How wide its leaves are beside its kind's (1): a feather palm's leaflets' reach, a fan palm's blade. */
  frondWidth?: number;
  /** How far a fan palm's split segment tips droop, beside its kind's (1). */
  fanDroop?: number;
}

/** The members of a type that may be left out. */
type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

/** What kind of value a species field read from JSON must be: a number, a string, a list of strings, two numbers, or one of some words. */
export type SpeciesFieldKind = "number" | "string" | "strings" | "pair" | readonly string[];

/**
 * Every field a species may leave out (`TreeSpecies`'s optional members), and what it must be when given: for
 * a host reading species from JSON (the lab's presets). The compiler holds the list to the type: a member
 * missing or one too many will not build. The rest of a species must all be there; `checkSpecies` then says
 * whether the values are sound.
 */
export const OPTIONAL_SPECIES_FIELDS = {
  latin: "string",
  regions: "strings",
  crownRatio: "pair",
  baseRatio: "pair",
  heightRange: "pair",
  crownPeak: "number",
  crownRound: "number",
  lobes: "number",
  scaffolds: "number",
  shed: "number",
  boleStubs: "number",
  limbAngle: "pair",
  limbCurve: "number",
  limbCurveBack: "number",
  zigzag: "number",
  zigzagRun: "number",
  phyllotaxis: ["spiral", "opposite", "distichous"],
  sprayHang: "number",
  canopyLift: "number",
  fork: "number",
  forkStems: "number",
  forkSplits: "number",
  forkShare: "number",
  forkSpread: "number",
  forkStemsMost: "number",
  stemShare: "number",
  stemRange: "pair",
  pads: "number",
  clusters: "number",
  lean: "number",
  buttress: "number",
  leafColors: "strings",
  weep: "number",
  palmLeaf: ["feather", "fan"],
  pruning: ["natural", "skirt", "skinned", "pineapple"],
  plumose: "number",
  deadColor: "string",
  skirt: "number",
  frondWidth: "number",
  fanDroop: "number",
} as const satisfies Record<OptionalKeys<TreeSpecies>, SpeciesFieldKind>;

/** Whether `value` is of `kind` (`SpeciesFieldKind`). */
export function isSpeciesFieldKind(value: unknown, kind: SpeciesFieldKind): boolean {
  if (typeof kind !== "string") return typeof value === "string" && kind.includes(value);
  if (kind === "number") return typeof value === "number" && Number.isFinite(value);
  if (kind === "string") return typeof value === "string";
  if (kind === "strings") return Array.isArray(value) && value.every((v) => typeof v === "string");
  return Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number" && Number.isFinite(v));
}

/**
 * The trees a course in a temperate place is likely to have, at the sizes they reach there. By eye: the oak,
 * the plane, the eucalyptus and the Scots pine set against photographs of open-grown trees (an oak's crown
 * wider than it is tall, a plane's full oval, a park eucalyptus between its vase and Riviera's tall blue
 * gums, a Scots pine's flat lopsided top on a thin trunk). The oak's, the Scots pine's and the spruce's
 * outlines and proportions (crown reach and base for height) are measured from photographs of open-grown
 * trees (test/outlines.json): an open-grown spruce is much wider than a forest one. An old Scots pine has
 * given up its leader, and is grown as a broadleaf, with needles.
 */
export const STARTER_SPECIES: readonly TreeSpecies[] = [
  // Set against the owner's reference pictures: a parkland oak's broad dome on heavy limbs, the limbs seen
  // through it (open 0.45), dark green; its bark grey-brown. Wider than it is tall, as the pictures have it and
  // TSO says: 27 m across on 18 m (r/H 0.75; TSO's open-grown 18–24 m tall and 20–30 m across), its clumps
  // bigger to fill so wide a dome; its trunk 1.4 m through, as Hemery's open-grown oaks have for such a crown.
  {
    name: "Oak",
    latin: "Quercus robur",
    regions: ["great-britain", "france", "netherlands", "denmark"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile; TSO's
    // open-grown 20–30 m across on 18–24 m, wider than high (the photographed one in test/outlines.json,
    // 0.66). Base: live crown 0.75–0.90 open-grown, 0.30–0.45 in a wood [est.].
    crownRatio: [0.18, 0.8],
    baseRatio: [0.1, 0.7],
    // Height (docs/MORPHOLOGY.md): TSO's open-grown 18–24 m; 20–30 m, exceptionally 40 m.
    heightRange: [18, 40],
    architecture: "broadleaf",
    height: 18,
    crownRadius: 13.5,
    crownBase: 2.5,
    trunkRadius: 0.7,
    shape: "hemispherical",
    crownPeak: 0.15,
    crownRound: 2.0,
    foliageDepth: 0.35,
    openness: 0.45,
    stems: 1,
    branchAngle: 60,
    branchAngleSpread: 15,
    bend: -0.2,
    crooked: 0.7,
    leader: 0.15,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.8,
    scaffolds: 8,
    forkShare: 0.35,
    fork: 0.7,
    forkSpread: 0.3,
    forkStems: 2,
    forkStemsMost: 3,
    boleStubs: 0.8,
    limbAngle: [55, 95],
    limbCurve: -15,
    limbCurveBack: 25,
    zigzag: 15,
    pads: 0.2,
    leafKind: "broad",
    clumpSize: 1.8,
    clumpSpread: 0.35,
    leafColor: "#4d6b33",
    leafVariation: 0.3,
    treeVariation: 0.25,
    throughTint: [0.85, 1.0, 0.45],
    barkColor: "#6b655c",
    barkPale: 0,
    stiffness: 0.75,
  },
  {
    name: "Plane",
    latin: "Platanus × hispanica",
    regions: ["france", "great-britain", "netherlands", "california"],
    // Real crowns (docs/MORPHOLOGY.md, not in TALLO): open-grown r/H 0.30–0.45; street and stand trees to
    // 0.2 [est.]. Base: low in parks, raised on streets [est.].
    crownRatio: [0.2, 0.45],
    baseRatio: [0.1, 0.6],
    // Height (docs/MORPHOLOGY.md): 25–35 m typical, to 50 m (TSO; one tree at Pau past 52 m).
    heightRange: [25, 50],
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
    limbAngle: [35, 55],
    limbCurve: 10,
    limbCurveBack: -35,
    zigzag: 25,
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
  // Set against the owner's reference pictures: an open-grown blue gum, "broadly rounded" (secondary, in
  // docs/MORPHOLOGY.md), 20 m across (the top of 10–20 m), its bole a metre and more through, most of them
  // forked low into a V of ascending limbs, few leading; its crown from 6 m (an open-grown live crown of
  // 0.6–0.8), widest near halfway up and broad-shouldered, fuller (open 0.4, its bunches less apart).
  {
    name: "Eucalyptus",
    latin: "Eucalyptus globulus",
    regions: ["california"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile;
    // open-grown 0.20–0.35 [est.]. Base: live crown 0.6–0.8 open-grown, 0.25–0.40 in groves [est.].
    crownRatio: [0.08, 0.35],
    baseRatio: [0.2, 0.75],
    // Height (docs/MORPHOLOGY.md): 30–55 m typical, to 70 m (EUCLID); planted in California 30–50 m.
    heightRange: [30, 70],
    architecture: "broadleaf",
    height: 26,
    crownRadius: 10,
    crownBase: 6,
    trunkRadius: 0.6,
    shape: "hemispherical",
    crownPeak: 0.45,
    crownRound: 2.6,
    lobes: 0.65,
    foliageDepth: 0.3,
    openness: 0.4,
    stems: 1,
    forkShare: 0.75,
    fork: 0.8,
    forkSpread: 0.2,
    forkStems: 2,
    stemShare: 0.25,
    stemRange: [2, 3],
    branchAngle: 32,
    branchAngleSpread: 14,
    bend: -0.15,
    crooked: 0.4,
    leader: 0.25,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.55,
    scaffolds: 6,
    limbAngle: [35, 75],
    limbCurve: 6,
    limbCurveBack: -12,
    zigzag: 5,
    clusters: 0.6,
    leafKind: "narrow",
    clumpSize: 1.6,
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
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile; the
    // photographed open-grown one (test/outlines.json), 0.31. Base: to the ground open-grown (photographed,
    // 0), live crown 0.35–0.55 in plantations [est.].
    crownRatio: [0.09, 0.31],
    baseRatio: [0, 0.65],
    // Height (docs/MORPHOLOGY.md): 30–50 m typical, up to 50–60 m (EUAT); the record 62.7 m (GDB).
    heightRange: [30, 60],
    architecture: "conifer",
    height: 20,
    crownRadius: 5.8,
    crownBase: 1,
    trunkRadius: 0.35,
    shape: "conical",
    foliageDepth: 0.6,
    openness: 0.1,
    stems: 1,
    branchAngle: 80,
    branchAngleSpread: 8,
    bend: -0.45,
    crooked: 0.15,
    leader: 1,
    whorl: 5,
    whorlsPerMetre: 1.6,
    branchiness: 1,
    limbAngle: [45, 115],
    limbCurve: -30,
    limbCurveBack: 50,
    sprayHang: 0.5,
    leafKind: "needle",
    clumpSize: 1.0,
    clumpSpread: 0.25,
    leafColor: "#2f4d35",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.7, 0.9, 0.5],
    barkColor: "#4e4239",
    barkPale: 0,
    stiffness: 0.85,
  },
  // Set against the owner's reference pictures: its crown more open, its clumps apart with sky between (open
  // 0.5; its outline stays the photographed tree's, test/outlines.json), grey-green rather than teal, olive where
  // lit. Most old ones fork into two or three sub-leaders at the crown's base (MORPHOLOGY.md 5: "old trees often
  // fork into 2–4 sub-leaders"), the heavy orange limbs the references show; a stem straight to there, and
  // thicker (a mature tree's).
  {
    name: "Scots pine",
    latin: "Pinus sylvestris",
    regions: ["great-britain", "denmark", "netherlands"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile; the
    // photographed open-grown one (test/outlines.json), 0.43. Base: live crown 0.5–0.8 open-grown
    // (photographed, base 0.46), 0.25–0.40 in plantations [est.].
    crownRatio: [0.1, 0.43],
    baseRatio: [0.2, 0.75],
    // Height (docs/MORPHOLOGY.md): 23–27 m on average, over 40 m possible (EUAT); to 40 m (GDB).
    heightRange: [23, 40],
    architecture: "broadleaf",
    height: 19,
    crownRadius: 8,
    crownBase: 9,
    trunkRadius: 0.42,
    shape: "hemispherical",
    crownPeak: 0.4,
    crownRound: 2.4,
    lobes: 0.25,
    foliageDepth: 0.3,
    openness: 0.5,
    stems: 1,
    branchAngle: 65,
    branchAngleSpread: 20,
    bend: -0.1,
    crooked: 0.3,
    leader: 0.2,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.6,
    scaffolds: 5,
    limbAngle: [45, 90],
    limbCurve: -5,
    limbCurveBack: 35,
    zigzag: 10,
    fork: 1,
    forkStems: 2,
    forkStemsMost: 3,
    forkSplits: 1,
    forkShare: 0.7,
    pads: 0.85,
    leafKind: "pine",
    clumpSize: 2.0,
    clumpSpread: 0.4,
    leafColor: "#748060",
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
    // Height (docs/MORPHOLOGY.md): a course's understorey and rough, 0.5–3 m (MORPHOLOGY.md 30).
    heightRange: [0.5, 3],
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
  // Set against the owner's reference pictures: an open-grown beech's broad dome, widest low, skirted nearly to
  // the ground at its rim (crown from 1.5 m), its limbs seen sweeping out under it (canopyLift 0.3), 24 m across on 18 m (r/H 0.67: UF's 60 ft spread on a 50 ft tree, 0.6, and
  // the 15–25 m open-grown spread of MORPHOLOGY.md), its many limbs spreading wide and low; silver-grey bark
  // (EUAT, #9A9A91 to #B5B5AC), its trunk 1.4 m through (Hemery's open-grown beech for a 24 m crown). Its
  // branches grown all round its limbs: two-ranked, every branch lay in its
  // limb's plane and the crown came out a stack of shelves (its sprays' flat fans are its leaves').
  beech: {
    name: "Beech",
    latin: "Fagus sylvatica",
    regions: ["denmark", "great-britain", "netherlands", "france"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile;
    // open-grown 0.35–0.50 [est.] (TSO: spreading, low-branched). Base: live crown 0.85–0.95 open-grown,
    // 0.35–0.50 in a wood [est.].
    crownRatio: [0.14, 0.5],
    baseRatio: [0.05, 0.65],
    // Height (docs/MORPHOLOGY.md): commonly 30–40 m, up to 50 m (EUAT); the record 49.2 m (TSO).
    heightRange: [30, 50],
    architecture: "broadleaf",
    height: 18,
    crownRadius: 12,
    crownBase: 1.5,
    trunkRadius: 0.7,
    shape: "hemispherical",
    crownPeak: 0.2,
    crownRound: 3,
    foliageDepth: 0.4,
    openness: 0.12,
    stems: 1,
    forkShare: 0.2,
    fork: 0.6,
    forkSpread: 0.35,
    forkStems: 2,
    branchAngle: 45,
    branchAngleSpread: 12,
    bend: -0.3,
    crooked: 0.45,
    leader: 0.2,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 1,
    scaffolds: 9,
    limbAngle: [40, 105],
    canopyLift: 0.3,
    zigzag: 12,
    leafKind: "broad",
    clumpSize: 2,
    clumpSpread: 0.25,
    leafColor: "#557a36",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.85, 1.0, 0.45],
    barkColor: "#aeada4",
    barkPale: 0.1,
    stiffness: 0.8,
  },
  // UF/IFAS ST-97 (European birch): 40–50 ft tall, 15–25 ft spread. A narrow open oval with a leader,
  // drooping twigs (some of them hang in tresses), light yellow-green; white bark, dark and fissured at its
  // foot.
  // Set against the owner's reference pictures: 12 m across (the top of 6–12 m, MORPHOLOGY.md) on 18 m (15–25 m),
  // its black rugged base up to 1–3 m (WT: the lowest 0.5–3 m; scans.ts), 0.6 m through (Hemery); full (open 0.3), and its twigs hanging in
  // curtains (weep 0.45: "pendulous, hanging 150–180 degrees ... in long whip-like curtains"), its top open.
  silverBirch: {
    name: "Silver birch",
    latin: "Betula pendula",
    regions: ["great-britain", "denmark", "netherlands"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile;
    // open-grown 0.20–0.30 [est.]. Base: live crown 0.6–0.8 open-grown, 0.3–0.5 in a stand [est.].
    crownRatio: [0.1, 0.3],
    baseRatio: [0.2, 0.7],
    // Height (docs/MORPHOLOGY.md): 15–25 m typical, to 30 m (WT).
    heightRange: [15, 30],
    architecture: "broadleaf",
    height: 18,
    crownRadius: 6,
    crownBase: 2.5,
    trunkRadius: 0.3,
    shape: "spherical",
    foliageDepth: 0.3,
    openness: 0.3,
    stems: 1,
    stemShare: 0.3,
    stemRange: [2, 4],
    branchAngle: 40,
    branchAngleSpread: 12,
    bend: -0.35,
    crooked: 0.35,
    leader: 0.6,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.9,
    boleStubs: 0.7,
    limbAngle: [35, 60],
    limbCurve: 5,
    limbCurveBack: -35,
    zigzag: 15,
    leafKind: "small",
    clumpSize: 1.2,
    clumpSpread: 0.35,
    leafColor: "#7b9a48",
    leafVariation: 0.3,
    treeVariation: 0.25,
    throughTint: [0.95, 1.0, 0.5],
    barkColor: "#d4d0c4",
    barkPale: 0.3,
    stiffness: 0.35,
    weep: 0.45,
  },
  // UF/IFAS ST-70 (common alder): 40–50 ft tall, 20–40 ft spread. Conical to oval on a leader that keeps
  // on, by water; dark green, dark bark.
  blackAlder: {
    name: "Black alder",
    latin: "Alnus glutinosa",
    regions: ["denmark", "netherlands", "france"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile;
    // open-grown 0.15–0.25 [est.]. Base: live crown 0.6–0.8 open-grown, 0.35–0.55 in a stand [est.].
    crownRatio: [0.09, 0.25],
    baseRatio: [0.2, 0.65],
    // Height (docs/MORPHOLOGY.md): usually 15–25 m [est.], to 35 m (TSO).
    heightRange: [15, 35],
    architecture: "broadleaf",
    height: 15,
    crownRadius: 4,
    crownBase: 2.5,
    trunkRadius: 0.25,
    shape: "conical",
    foliageDepth: 0.3,
    openness: 0.3,
    stems: 1,
    stemShare: 0.3,
    stemRange: [2, 4],
    branchAngle: 55,
    branchAngleSpread: 12,
    bend: 0,
    crooked: 0.3,
    leader: 0.85,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.8,
    boleStubs: 0.6,
    limbAngle: [55, 75],
    limbCurve: 0,
    limbCurveBack: 0,
    zigzag: 8,
    scaffolds: 10,
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
    // Real crowns (docs/MORPHOLOGY.md): the clone's column, r/H 0.06–0.10; TALLO's species (not split by
    // clone) 0.10–0.21, so up to 0.16 [est.]. Base: branched from low on the stem [est.].
    crownRatio: [0.05, 0.16],
    baseRatio: [0.03, 0.5],
    // Height (docs/MORPHOLOGY.md): about 15 m at 25 years, the largest 30–35 m (TSO; the UK champion 38.5 m).
    heightRange: [15, 35],
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
    limbAngle: [10, 25],
    limbCurve: 8,
    zigzag: 5,
    scaffolds: 12,
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
  // by lakes: limbs that rise and arch, and from them a curtain of whips hanging nearly to the ground.
  weepingWillow: {
    name: "Weeping willow",
    latin: "Salix × sepulcralis",
    regions: ["france", "denmark", "netherlands"],
    // Real crowns (docs/MORPHOLOGY.md, not in TALLO): open-grown r/H 0.45–0.60; crowded by water 0.3 [est.].
    // Base: its curtains hang near the ground [est.].
    crownRatio: [0.3, 0.6],
    baseRatio: [0, 0.4],
    // Height (docs/MORPHOLOGY.md): 15–23 m; the largest 'Chrysocoma' 23 m (TSO).
    heightRange: [15, 23],
    architecture: "broadleaf",
    height: 11,
    crownRadius: 7.5,
    crownBase: 1,
    trunkRadius: 0.5,
    shape: "hemispherical",
    foliageDepth: 0.35,
    openness: 0.35,
    stems: 1,
    forkShare: 0.4,
    fork: 0.7,
    forkSpread: 0.3,
    forkStems: 2,
    forkStemsMost: 3,
    branchAngle: 50,
    branchAngleSpread: 15,
    bend: 0.1,
    crooked: 0.35,
    leader: 0.1,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.85,
    limbAngle: [40, 45],
    limbCurve: 5,
    limbCurveBack: -35,
    zigzag: 5,
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
    weep: 0.85,
  },
  // The Conservation Volunteers' tree library (hawthorn): typically 5–8 m. A small crooked tree, or a hedge
  // left to grow up; dense small leaves, dark.
  hawthorn: {
    name: "Hawthorn",
    latin: "Crataegus monogyna",
    regions: ["great-britain", "denmark", "netherlands", "france"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 3–10 m lower quartile (its
    // height); open-grown 0.40–0.60 [est.]. Base: live crown 0.7–0.9 [est.].
    crownRatio: [0.17, 0.6],
    baseRatio: [0.1, 0.3],
    // Height (docs/MORPHOLOGY.md): usually 5–10 m [est.], to about 15 m (WT).
    heightRange: [5, 15],
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
    limbAngle: [45, 70],
    limbCurve: -10,
    limbCurveBack: 10,
    zigzag: 25,
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
    // Height (docs/MORPHOLOGY.md): usually about 2 m, up to 4 m left uncut (BSBI).
    heightRange: [1.5, 4],
    architecture: "shrub",
    height: 1.6,
    crownRadius: 1.0,
    crownBase: 0.15,
    trunkRadius: 0.03,
    shape: "hemispherical",
    foliageDepth: 1,
    openness: 0.08,
    stems: 14,
    branchAngle: 30,
    branchAngleSpread: 15,
    bend: 0.15,
    crooked: 0.6,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 1,
    crownPeak: 0.05,
    crownRound: 2.2,
    leafKind: "pine",
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
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's only 10 records (14–33 m tall),
    // their quartiles 0.13–0.21; open-grown 0.15–0.22 [est.]. Base: long trunks with no lower limbs in the
    // forest (FEIS), live crown 0.30–0.50 in plantations, 0.85–1.0 open-grown [est.].
    crownRatio: [0.13, 0.22],
    baseRatio: [0, 0.7],
    // Height (docs/MORPHOLOGY.md): British plantations 25–40 m at harvest [est.]; in Europe rarely over 50 m
    // (EUAT), in its own range to 80 m (GDB).
    heightRange: [25, 80],
    architecture: "conifer",
    height: 28,
    crownRadius: 4.5,
    crownBase: 1.5,
    trunkRadius: 0.5,
    shape: "conical",
    foliageDepth: 0.5,
    openness: 0.15,
    stems: 1,
    branchAngle: 80,
    branchAngleSpread: 8,
    bend: -0.2,
    crooked: 0.15,
    leader: 1,
    whorl: 5,
    whorlsPerMetre: 1.2,
    branchiness: 0.95,
    limbAngle: [75, 100],
    limbCurve: -10,
    limbCurveBack: 20,
    sprayHang: 0.45,
    buttress: 0.5,
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
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m quartiles, wider than
    // the open-grown 0.15–0.22 [est.]. Base: live crown 0.6–0.8 open-grown, 0.25–0.40 in plantations
    // [est.].
    crownRatio: [0.16, 0.26],
    baseRatio: [0.2, 0.75],
    // Height (docs/MORPHOLOGY.md): UK plantations 25–35 m [est.]; commonly 30 m, exceptionally 40 m (EUAT); to
    // 50 m (GDB).
    heightRange: [25, 50],
    architecture: "conifer",
    height: 18,
    crownRadius: 4.5,
    crownBase: 5,
    trunkRadius: 0.35,
    shape: "conical",
    crownPeak: 0.3,
    foliageDepth: 0.65,
    openness: 0.4,
    stems: 1,
    branchAngle: 70,
    branchAngleSpread: 15,
    bend: 0.25,
    crooked: 0.1,
    leader: 0.8,
    whorl: 4,
    whorlsPerMetre: 1.0,
    branchiness: 0.95,
    limbAngle: [55, 90],
    limbCurve: 0,
    limbCurveBack: 15,
    sprayHang: 0,
    crownRound: 2.2,
    leafKind: "pine",
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
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile;
    // open-grown 0.15–0.22 [est.]. Base: branches near the ground when young and open-grown (FEIS), live
    // crown 0.30–0.50 in managed stands [est.].
    crownRatio: [0.08, 0.22],
    baseRatio: [0, 0.7],
    // Height (docs/MORPHOLOGY.md): plantations in Europe 35–55 m [est.]; old growth commonly 76 m (FEIS),
    // exceptionally over 100 m (EUAT).
    heightRange: [35, 100],
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
    limbAngle: [65, 115],
    limbCurve: -20,
    limbCurveBack: 45,
    sprayHang: 0.45,
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
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's lower quartile over 25 m and
    // upper quartile at 3–10 m (no 10–18 m band). Base: live crown 0.85–1.0 open-grown, 0.4–0.6 in a stand
    // [est.].
    crownRatio: [0.1, 0.27],
    baseRatio: [0, 0.6],
    // Height (docs/MORPHOLOGY.md): ornamental and UK trees 20–35 m [est.]; 50(–70) m (GDB).
    heightRange: [20, 70],
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
    branchAngleSpread: 16,
    bend: -0.55,
    crooked: 0.2,
    leader: 0.85,
    whorl: 3,
    whorlsPerMetre: 2.6,
    branchiness: 0.95,
    limbAngle: [65, 120],
    limbCurve: -40,
    limbCurveBack: 60,
    sprayHang: 0.7,
    buttress: 0.8,
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
  // Set against the owner's reference pictures: a headland tree, low, wide and flat-topped, 24 m across on 12 m
  // (r/H 1.0, the top of MORPHOLOGY.md's 0.50–1.00; GDB: "often wider than tall"), widest high and flat
  // across its top (crownRound 5); a short massive trunk (1.5 m through) forking low into a few heavy limbs
  // that run out at 55–85 degrees, bare under the canopy (canopyLift 0.8), its foliage in thin pads on them
  // (pads 1) with sky between (open 0.45). Fitted narrow (a sheltered tree inland), it is neither lifted nor
  // so thinly padded (grow.ts).
  montereyCypress: {
    name: "Monterey cypress",
    latin: "Hesperocyparis macrocarpa",
    regions: ["california"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): GDB: broad-spreading, wider than tall on
    // headlands, more upright where sheltered; 0.50–1.00 exposed, 0.25 sheltered [est.]. Base: GDB's few
    // major limbs near the trunk's foot, live crown 0.6–1.0 [est.].
    crownRatio: [0.25, 1],
    baseRatio: [0, 0.4],
    // Height (docs/MORPHOLOGY.md): no low end is given (its specimen's); typical maximum 25 m, planted trees to
    // 31 m in the US and 48 m in San Francisco (GDB).
    heightRange: [12, 48],
    architecture: "broadleaf",
    height: 12,
    crownRadius: 12,
    crownBase: 3.5,
    trunkRadius: 0.75,
    shape: "inverseConical",
    crownPeak: 0.7,
    crownRound: 5,
    lobes: 0.6,
    foliageDepth: 0.2,
    openness: 0.45,
    stems: 1,
    forkShare: 1,
    fork: 0.6,
    forkSpread: 0.3,
    forkStems: 3,
    forkStemsMost: 3,
    branchAngle: 45,
    branchAngleSpread: 12,
    bend: 0.15,
    crooked: 0.7,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.8,
    scaffolds: 4,
    limbAngle: [55, 85],
    limbCurve: -20,
    limbCurveBack: 10,
    zigzag: 5,
    pads: 1,
    canopyLift: 0.8,
    leafKind: "small",
    clumpSize: 1.5,
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
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile;
    // open-grown 0.30–0.45 [est.]. Base: GDB's stands' crowns 10–20 % of height, open-grown live crown
    // 0.6–0.9 [est.].
    crownRatio: [0.12, 0.45],
    baseRatio: [0.1, 0.9],
    // Height (docs/MORPHOLOGY.md): 15–30 m typical (GDB), 15–35 m (FEIS); occasionally 64 m (GDB).
    heightRange: [15, 64],
    architecture: "broadleaf",
    height: 20,
    crownRadius: 7.5,
    crownBase: 4,
    trunkRadius: 0.45,
    shape: "spherical",
    crownPeak: 0.5,
    crownRound: 3.2,
    lobes: 0.6,
    foliageDepth: 0.5,
    openness: 0.35,
    stems: 1,
    branchAngle: 60,
    branchAngleSpread: 18,
    bend: 0.25,
    crooked: 0.6,
    leader: 0.15,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.9,
    limbAngle: [50, 85],
    limbCurve: 0,
    limbCurveBack: 20,
    zigzag: 10,
    pads: 0.5,
    // (Its foliage in distinct rounded clumps at its branches' ends, sky between them, some branches bare: `clusters`.)
    clusters: 0.7,
    leafKind: "pine",
    clumpSize: 1.9,
    clumpSpread: 0.4,
    leafColor: "#33512c",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.75, 0.95, 0.45],
    barkColor: "#4f463f",
    barkPale: 0.1,
    stiffness: 0.8,
  },
  // California Native Plant Society, San Diego (Pinus torreyana): 40–70 ft tall, 35 ft spread, an open
  // picturesque form. Few crooked limbs, long grey-green needles in tufts, so grown as a broadleaf, with
  // needles. Coastal ones lean, wind-sculpted on the bluffs (MORPHOLOGY.md 19, the owner's reference): each
  // grown leaning 16 degrees its own way, its crown back over its foot (`lean`); its limbs less looped
  // and its brushes smaller and more of them (0.9 m clumps, branchier), so its crown is layered tufts on crooked
  // limbs and not a broad leaf's lobes. Set
  // against the owner's reference pictures (lab/references): a crown wider than it is tall (r/H 0.67, the top
  // of docs/MORPHOLOGY.md's 0.40–0.70), from low limbs that run out level and turn up at their ends, open,
  // the sky between its brushes, which are grey-green.
  torreyPine: {
    name: "Torrey pine",
    latin: "Pinus torreyana",
    regions: ["california"],
    // Real crowns (docs/MORPHOLOGY.md, not in TALLO): open-grown r/H 0.40–0.70 from the species notes; the
    // stand-grown end at 0.25 [est.]. Base: crowns from low on the bluffs to high in a stand [est.].
    crownRatio: [0.25, 0.7],
    baseRatio: [0.1, 0.55],
    // Height (docs/MORPHOLOGY.md): natural trees often 5–12 m [est.]; to 15(–23) m, the tallest cultivated
    // (GDB).
    heightRange: [5, 23],
    architecture: "broadleaf",
    height: 12,
    crownRadius: 8,
    crownBase: 2.5,
    trunkRadius: 0.38,
    shape: "hemispherical",
    crownPeak: 0.25,
    crownRound: 3,
    lobes: 0.5,
    foliageDepth: 0.15,
    openness: 0.8,
    stems: 1,
    branchAngle: 55,
    branchAngleSpread: 20,
    bend: -0.2,
    crooked: 0.45,
    lean: 16,
    leader: 0.05,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.8,
    scaffolds: 5,
    limbAngle: [75, 105],
    limbCurve: -10,
    limbCurveBack: 20,
    zigzag: 6,
    pads: 0.85,
    leafKind: "pine",
    clumpSize: 0.9,
    clumpSpread: 0.45,
    leafColor: "#728262",
    leafVariation: 0.25,
    treeVariation: 0.25,
    throughTint: [0.85, 0.95, 0.55],
    barkColor: "#76604f",
    barkPale: 0.2,
    stiffness: 0.75,
  },
  // CSU Stanislaus campus tree map, after Cal Poly's SelecTree (Pinus halepensis): 30–60 ft tall, 20–40 ft
  // wide. The high-crowned pine of Los Angeles' parks and courses: an irregular open crown of crooked
  // boughs, grey-green, grown as a broadleaf with needles; grey bark. It leans in the wild; the grower
  // stands it upright. Its crown's reach and base are a photographed open-grown tree's (test/outlines.json).
  aleppoPine: {
    name: "Aleppo pine",
    latin: "Pinus halepensis",
    regions: ["california", "france"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile; the
    // photographed open-grown one (test/outlines.json), 0.48. Base: live crown 0.4–0.7 (EUAT), the
    // photographed one's base 0.125.
    crownRatio: [0.18, 0.48],
    baseRatio: [0.12, 0.6],
    // Height (docs/MORPHOLOGY.md): 15–25 m (GDB); up to 20 m (EUAT).
    heightRange: [15, 25],
    architecture: "broadleaf",
    height: 15,
    crownRadius: 6.5,
    crownBase: 3,
    trunkRadius: 0.35,
    shape: "hemispherical",
    crownRound: 2.2,
    lobes: 0.5,
    foliageDepth: 0.2,
    openness: 0.6,
    stems: 1,
    branchAngle: 60,
    branchAngleSpread: 18,
    bend: 0.2,
    crooked: 0.85,
    leader: 0.35,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.9,
    scaffolds: 7,
    limbAngle: [45, 80],
    limbCurve: 0,
    limbCurveBack: 30,
    zigzag: 10,
    pads: 0.7,
    leafKind: "pine",
    clumpSize: 1.8,
    clumpSpread: 0.4,
    leafColor: "#66795a",
    leafVariation: 0.25,
    treeVariation: 0.2,
    throughTint: [0.8, 0.95, 0.55],
    barkColor: "#7a7068",
    barkPale: 0.15,
    stiffness: 0.75,
  },
  // UF/IFAS ST-472 (Pinus pinea): 35–60 ft tall, 35–45 ft spread. The umbrella pine: a stem that forks a
  // third of the way up into a few crooked limbs rising in V-forks and spreading under a flat wide crown of
  // dense cushions, some three times as wide as deep, its underside flat and bare; so grown as a broadleaf,
  // with needles; orange-brown plated bark. Its reach as old trees photographed open-grown have it
  // (test/outlines.json, and the owner's references: wider than UF's landscape trees). As the references and
  // the owner's photographs: a thick short stem forking into three thick sinuous limbs, a shallow smooth
  // canopy of many smaller cushions.
  stonePine: {
    name: "Stone pine",
    latin: "Pinus pinea",
    regions: ["california", "france"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile; the
    // photographed open-grown one (test/outlines.json), 0.74. Base: no low branches (EUAT), live crown
    // 0.25–0.45 when mature [est.], the photographed one's base 0.25.
    crownRatio: [0.22, 0.74],
    baseRatio: [0.25, 0.75],
    // Height (docs/MORPHOLOGY.md): 12–25(–35) m (GDB); up to 25–30 m (EUAT).
    heightRange: [12, 35],
    architecture: "broadleaf",
    height: 15,
    crownRadius: 11.5,
    crownBase: 8,
    trunkRadius: 0.7,
    shape: "hemispherical",
    crownPeak: 0.45,
    crownRound: 4,
    foliageDepth: 0.2,
    openness: 0.25,
    stems: 1,
    branchAngle: 45,
    branchAngleSpread: 10,
    bend: 0.05,
    crooked: 0.5,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.8,
    scaffolds: 5,
    limbAngle: [25, 40],
    limbCurve: -30,
    limbCurveBack: -10,
    zigzag: 5,
    canopyLift: 0.6,
    fork: 0.66,
    forkSpread: 0.08,
    forkStems: 3,
    forkStemsMost: 3,
    forkSplits: 2,
    leafKind: "pine",
    clumpSize: 2.2,
    clumpSpread: 0.35,
    leafColor: "#476a2e",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.8, 0.95, 0.5],
    barkColor: "#8a5a3e",
    barkPale: 0.3,
    stiffness: 0.8,
  },
  // UF/IFAS, Gilman and Watson's fact sheet (Phoenix canariensis): 40–60 ft tall, 20–40 ft spread, a trunk
  // to 3 ft across. California's grand avenue palm: a thick trunk patterned with old leaf bases, a big round
  // head of arching pinnate fronds 3–6 m long (UF: 130–150 on a healthy palm; a course's are cut back), the
  // old ones hanging. On courses mostly pineapple cut (MORPHOLOGY.md). As the owner's reference pictures
  // have a course's: 12 m, its head 12 m across (the top of 8–12 m) and deep, its fronds down to 3.5 m, a
  // trunk over a metre through; its fronds arching over in a fountain (bend -0.8; "the rachis arches along its
  // whole length; tips droop"), their leaflets reaching 0.55 m either side (20–70 cm, in a V).
  canaryDatePalm: {
    name: "Canary date palm",
    latin: "Phoenix canariensis",
    regions: ["california"],
    // Real crowns (docs/MORPHOLOGY.md, not in TALLO): r/H 0.30–0.60, falling with age as the trunk grows;
    // tall old palms to 0.2 [est.]. Base: the head's lowest fronds, half to most of the height [est.].
    crownRatio: [0.2, 0.6],
    baseRatio: [0.2, 0.85],
    // Height (docs/MORPHOLOGY.md): UF/IFAS 40–60 ft (12–18 m); old planted palms 15–20 m [est.]; 6 m in the
    // Santa Monica range, potentially 15 m or more (SMM).
    heightRange: [12, 20],
    architecture: "palm",
    height: 12,
    crownRadius: 6,
    crownBase: 3.5,
    trunkRadius: 0.55,
    shape: "spherical",
    foliageDepth: 0.5,
    openness: 0.3,
    stems: 1,
    branchAngle: 60,
    branchAngleSpread: 20,
    bend: -0.8,
    crooked: 0.2,
    leader: 1,
    whorl: 80,
    whorlsPerMetre: 0,
    branchiness: 1,
    buttress: 0.15,
    leafKind: "frond",
    clumpSize: 0.8,
    clumpSpread: 0.2,
    leafColor: "#556f2f",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.85, 1.0, 0.45],
    barkColor: "#8a7b66",
    barkPale: 0,
    stiffness: 0.55,
    palmLeaf: "feather",
    pruning: "pineapple",
    deadColor: "#9c8664",
    skirt: 0.35,
    frondWidth: 0.7,
  },
  // UF/IFAS, Gilman and Watson's fact sheet (Washingtonia robusta): 80–100 ft tall, 10–15 ft spread, a trunk
  // about 1 ft across. The tall thin palm of Los Angeles' streets and courses: a pole flared at its foot with a
  // small tight head of 30 or so fan leaves on long stalks; skinned on courses, a straw skirt in the wild.
  // As the owner's reference pictures have a course's: 18 m (SMM: under 16 m in the range, to 25 m), its head
  // 6 m across and 6 m deep (blades 0.9–1.5 m across on stalks of 1.2–1.8 m, UF), its leaves held out round a
  // collar of boots down the top 2 m of its stem (palm.ts), a trunk half a metre through.
  mexicanFanPalm: {
    name: "Mexican fan palm",
    latin: "Washingtonia robusta",
    regions: ["california"],
    // Real crowns (docs/MORPHOLOGY.md, not in TALLO): r/H 0.05–0.12; young palms wider, to 0.2 [est.]. Base:
    // a small head at the top of a tall trunk [est.].
    crownRatio: [0.05, 0.2],
    baseRatio: [0.4, 0.92],
    // Height (docs/MORPHOLOGY.md): under 16 m in the Santa Monica range, old cultivated palms over 30 m (SMM);
    // UF/IFAS 80–100 ft (24–30 m).
    heightRange: [16, 30],
    architecture: "palm",
    height: 18,
    crownRadius: 3,
    crownBase: 12,
    trunkRadius: 0.26,
    shape: "spherical",
    foliageDepth: 0.5,
    openness: 0.25,
    stems: 1,
    branchAngle: 50,
    branchAngleSpread: 20,
    bend: 0,
    crooked: 0.35,
    leader: 1,
    whorl: 38,
    whorlsPerMetre: 0,
    branchiness: 1,
    buttress: 0.6,
    leafKind: "frond",
    clumpSize: 1,
    clumpSpread: 0.2,
    leafColor: "#466229",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.9, 1.0, 0.45],
    barkColor: "#857866",
    barkPale: 0.1,
    stiffness: 0.35,
    palmLeaf: "fan",
    pruning: "skinned",
    deadColor: "#a88f68",
    skirt: 0.55,
  },
  // University of Redlands tree species accounts (Quercus agrifolia): 25–80 ft tall in cultivation; UC Davis
  // Arboretum: 20–50 ft tall and wide. A broad spreading evergreen oak, low on crooked limbs, small dark
  // holly-like leaves.
  // Set against the owner's reference pictures: a broad low dome (spread "often greater than height", VT),
  // its limbs reclining at its rim (FEIS), dark glossy green (#2F4A2A at 50–150 m); its bark the grey of its
  // broad ridges (VT: mature ridges #7E7A73), not near black. 22 m across on 12 m (r/H 0.92: spread 10–30 m);
  // a massive short trunk, dividing at 2 m and more (FEIS: 1.2–2.4 m) into its heavy limbs, or forked near the
  // ground into two or three leaning trunks, seen under its raised rim and through its crown (open 0.5, its
  // leaves a shell, canopyLift 0.5).
  coastLiveOak: {
    name: "Coast live oak",
    latin: "Quercus agrifolia",
    regions: ["california"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): VT: spread often more than height
    // (0.50–0.80 open-grown); in dense stands irregular crowns (FEIS), 0.25 [est.]. Base: open-grown trunks
    // 1.2–2.4 m and foliage to the ground, branchless to about 6 m in dense stands (FEIS).
    crownRatio: [0.25, 0.8],
    baseRatio: [0, 0.5],
    // Height (docs/MORPHOLOGY.md): 6–25 m (FEIS); up to 30 m (VT).
    heightRange: [6, 30],
    architecture: "broadleaf",
    height: 12,
    crownRadius: 11,
    crownBase: 2,
    trunkRadius: 0.65,
    shape: "hemispherical",
    lobes: 0.3,
    foliageDepth: 0.35,
    openness: 0.5,
    stems: 1,
    forkShare: 0.4,
    fork: 0.45,
    forkSpread: 0.3,
    forkStems: 2,
    forkStemsMost: 3,
    stemShare: 0.1,
    stemRange: [2, 3],
    branchAngle: 70,
    branchAngleSpread: 18,
    bend: -0.2,
    crooked: 0.85,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.85,
    limbAngle: [65, 100],
    limbCurve: -10,
    limbCurveBack: 25,
    zigzag: 15,
    scaffolds: 6,
    leafKind: "small",
    clumpSize: 1.9,
    clumpSpread: 0.35,
    leafColor: "#36502c",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.8, 0.95, 0.45],
    barkColor: "#76726b",
    barkPale: 0.15,
    stiffness: 0.8,
    crownRound: 2.2,
    canopyLift: 0.5,
  },
  // California Native Plant Society, San Diego (Platanus racemosa): 40+ ft tall, 30 ft spread, often several
  // trunks; Virginia Tech Dendrology: 40–100 ft. Crooked and open, pale mottled bark; Riviera has many.
  // Set against the owner's reference pictures and docs/MORPHOLOGY.md: open, rounded and irregular (VT), 20 m
  // across on 15 m (spread 10–25 m), its bone-white limbs showing between patchy light grey-green masses
  // (#7A8A5A at 50–150 m): few branches, their leaves in smaller bunches apart. Its trunk leans 20 degrees at
  // its foot ("often leaning", MORPHOLOGY.md) and turns up into its crown, forking at 2.4 m when it forks.
  californiaSycamore: {
    name: "California sycamore",
    latin: "Platanus racemosa",
    regions: ["california"],
    // Real crowns (docs/MORPHOLOGY.md, not in TALLO): open-grown r/H 0.30–0.50; stand-grown end 0.2 [est.].
    // Base: forked low or leaning by creeks, higher in a riparian stand [est.].
    crownRatio: [0.2, 0.5],
    baseRatio: [0.1, 0.5],
    // Height (docs/MORPHOLOGY.md): 12–30 m (VT, 40–100 ft); to about 40 m (TSO).
    heightRange: [12, 40],
    architecture: "broadleaf",
    height: 15,
    crownRadius: 10,
    crownBase: 3,
    trunkRadius: 0.5,
    shape: "hemispherical",
    lobes: 0.3,
    foliageDepth: 0.25,
    openness: 0.7,
    lean: 20,
    stems: 1,
    forkShare: 0.45,
    fork: 0.8,
    forkSpread: 0.15,
    forkStems: 2,
    forkStemsMost: 3,
    stemShare: 0.15,
    stemRange: [2, 3],
    branchAngle: 55,
    branchAngleSpread: 20,
    bend: 0.05,
    crooked: 0.6,
    leader: 0,
    whorl: 0,
    whorlsPerMetre: 0,
    branchiness: 0.4,
    limbAngle: [45, 90],
    limbCurve: 0,
    limbCurveBack: 5,
    zigzag: 25,
    zigzagRun: 1.1,
    pads: 0.3,
    leafKind: "broad",
    clumpSize: 1.3,
    clumpSpread: 0.4,
    leafColor: "#7a8f52",
    leafVariation: 0.3,
    treeVariation: 0.25,
    throughTint: [0.9, 1.0, 0.5],
    barkColor: "#c4bca9",
    barkPale: 0.6,
    stiffness: 0.65,
    crownPeak: 0.35,
  },
  // Cornell Woody Plants Database (Acer saccharum): 60–75 ft tall; UF/IFAS ENH-210: 35–50 ft spread. A dense
  // oval crown, its leaves on its outside.
  sugarMaple: {
    name: "Sugar maple",
    latin: "Acer saccharum",
    regions: ["ontario"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile; Silvics'
    // champion 20.1 m across on 23.8 m (0.42), open-grown 0.30–0.45. Base: two-thirds clear bole in the
    // forest (NRCAN), live crown 0.75–0.90 open-grown [est.].
    crownRatio: [0.13, 0.45],
    baseRatio: [0.1, 0.7],
    // Height (docs/MORPHOLOGY.md): 27–37 m, exceptionally 40 m (FEIS); up to 35 m (NRCAN).
    heightRange: [27, 40],
    architecture: "broadleaf",
    height: 20,
    crownRadius: 6.5,
    crownBase: 3,
    trunkRadius: 0.45,
    shape: "spherical",
    foliageDepth: 0.45,
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
    zigzag: 0,
    leafKind: "broad",
    clumpSize: 2.0,
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
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile;
    // open-grown 0.35–0.50 [est.] (Silvics: short boles and spreading crowns in the open). Base: live crown
    // 0.70–0.85 open-grown, 0.35–0.45 in the forest [est.].
    crownRatio: [0.16, 0.5],
    baseRatio: [0.15, 0.65],
    // Height (docs/MORPHOLOGY.md): 20–30 m, up to 49 m on good sites (FEIS).
    heightRange: [20, 49],
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
    boleStubs: 0.5,
    limbAngle: [40, 60],
    limbCurve: 10,
    limbCurveBack: 0,
    zigzag: 10,
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
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile;
    // open-grown 0.25–0.35 [est.]. Base: branch-free for the lower two-thirds in the forest (NRCAN, FEIS),
    // live crown 0.6–0.9 open-grown [est.].
    crownRatio: [0.14, 0.35],
    baseRatio: [0.1, 0.7],
    // Height (docs/MORPHOLOGY.md): to 30 m, occasionally more (NRCAN), so 20 m its low end [est.];
    // virgin-forest trees 46 m (FEIS; the record 57.6 m, GDB).
    heightRange: [20, 46],
    architecture: "conifer",
    height: 22,
    crownRadius: 5.5,
    crownBase: 3,
    trunkRadius: 0.45,
    shape: "tendFlame",
    foliageDepth: 0.6,
    openness: 0.5,
    stems: 1,
    branchAngle: 80,
    branchAngleSpread: 10,
    bend: 0.15,
    crooked: 0.3,
    leader: 0.6,
    whorl: 5,
    whorlsPerMetre: 0.55,
    branchiness: 0.85,
    limbAngle: [55, 100],
    limbCurve: 0,
    limbCurveBack: 25,
    sprayHang: 0,
    leafKind: "pine",
    clumpSize: 1.7,
    clumpSpread: 0.35,
    leafColor: "#4d6a5b",
    leafVariation: 0.2,
    treeVariation: 0.2,
    throughTint: [0.75, 0.95, 0.55],
    barkColor: "#5a5550",
    barkPale: 0,
    stiffness: 0.75,
  },
  // Hodel 2014 (UC Cooperative Extension), UF/IFAS and Virginia Tech (Washingtonia filifera): 12–18 m in
  // cultivation, a stout grey trunk 50–90 cm through, only slightly flared; 20–30 grey-green fans 1–1.8 m
  // across on stalks as long, their segments split with white threads, the old green ones hanging 30–60
  // degrees below the level (so its crown's base 4–5 m under its top). In the wild its dead leaves hang in a
  // skirt to the ground; on courses it is skinned (MORPHOLOGY.md 31).
  californiaFanPalm: {
    name: "California fan palm",
    latin: "Washingtonia filifera",
    regions: ["california"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): UF/IFAS: 3–4.5 m across on 12–18 m; a
    // healthy planted palm 5–7 m across on 12 m [est.].
    crownRatio: [0.08, 0.28],
    // Height (docs/MORPHOLOGY.md): commonly 12–15 m, capable of 24 m (UF/IFAS); 9–15 m (FEIS), to 20 m (HOD14).
    heightRange: [12, 24],
    architecture: "palm",
    height: 12,
    crownRadius: 3,
    crownBase: 7.5,
    trunkRadius: 0.35,
    shape: "spherical",
    foliageDepth: 0.5,
    openness: 0.25,
    stems: 1,
    branchAngle: 50,
    branchAngleSpread: 20,
    bend: -0.15,
    crooked: 0.15,
    leader: 1,
    whorl: 32,
    whorlsPerMetre: 0,
    branchiness: 1,
    buttress: 0.25,
    leafKind: "frond",
    clumpSize: 1.2,
    clumpSpread: 0.2,
    leafColor: "#5f6f52",
    leafVariation: 0.15,
    treeVariation: 0.12,
    throughTint: [0.9, 1.0, 0.55],
    barkColor: "#857a6a",
    barkPale: 0.05,
    stiffness: 0.5,
    palmLeaf: "fan",
    pruning: "skinned",
    deadColor: "#a39373",
    skirt: 0.92,
    frondWidth: 1.1,
    fanDroop: 0.8,
  },
  // UF/IFAS (Syagrus romanzoffiana) and Noblick 2017: 8–15 m, a smooth grey ringed trunk 20–40 cm through;
  // 7–25 soft feather leaves 3–5 m long, their leaflets in several planes (plumose), drooping. Not
  // self-cleaning: courses cut its dead leaves, leaving the clean trunk (MORPHOLOGY.md 32).
  queenPalm: {
    name: "Queen palm",
    latin: "Syagrus romanzoffiana",
    regions: ["california"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): UF/IFAS: 6–7.5 m across, up to 15 m
    // tall; 8–12 m tall on a course [est.].
    crownRatio: [0.2, 0.47],
    // Height (docs/MORPHOLOGY.md): usually 10–15 m, to 20 m (BBNE); up to 15 m (UF/IFAS, VT).
    heightRange: [10, 20],
    architecture: "palm",
    height: 10,
    crownRadius: 3.2,
    crownBase: 5.5,
    trunkRadius: 0.15,
    shape: "spherical",
    foliageDepth: 0.5,
    openness: 0.4,
    stems: 1,
    branchAngle: 50,
    branchAngleSpread: 20,
    bend: -0.55,
    crooked: 0.25,
    leader: 1,
    whorl: 18,
    whorlsPerMetre: 0,
    branchiness: 1,
    buttress: 0.1,
    leafKind: "frond",
    clumpSize: 0.8,
    clumpSpread: 0.2,
    leafColor: "#4a6b32",
    leafVariation: 0.2,
    treeVariation: 0.15,
    throughTint: [0.85, 1.0, 0.45],
    barkColor: "#a29d92",
    barkPale: 0,
    stiffness: 0.4,
    palmLeaf: "feather",
    pruning: "skinned",
    plumose: 1,
    deadColor: "#8c7352",
    frondWidth: 1.25,
  },
  // UF/IFAS (Picea glauca): 40–60 ft tall, 15–20 ft spread. Narrow and conical, to the ground, blue-green.
  whiteSpruce: {
    name: "White spruce",
    latin: "Picea glauca",
    regions: ["ontario"],
    // Real crowns, stand-grown to open-grown (docs/MORPHOLOGY.md): TALLO's 10–18 m lower quartile;
    // open-grown 0.12–0.18 [est.]. Base: live crown close to the ground (FEIS), 0.5–0.7 in a stand [est.].
    crownRatio: [0.08, 0.18],
    baseRatio: [0, 0.5],
    // Height (docs/MORPHOLOGY.md): Ontario 15–30 m [est.]; average about 25 m, over 30 m on good sites (FEIS);
    // up to 50 m (GDB).
    heightRange: [15, 50],
    architecture: "conifer",
    height: 16,
    crownRadius: 2.8,
    crownBase: 0.8,
    trunkRadius: 0.25,
    shape: "conical",
    foliageDepth: 0.6,
    openness: 0.1,
    stems: 1,
    branchAngle: 75,
    branchAngleSpread: 8,
    bend: -0.2,
    crooked: 0.15,
    leader: 1,
    whorl: 5,
    whorlsPerMetre: 1.8,
    branchiness: 1,
    limbAngle: [70, 110],
    limbCurve: -10,
    limbCurveBack: 20,
    sprayHang: 0.3,
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
    ...(s.limbAngle ? { limbAngle: [s.limbAngle[0], s.limbAngle[1]] as [number, number] } : {}),
    ...(s.stemRange ? { stemRange: [s.stemRange[0], s.stemRange[1]] as [number, number] } : {}),
    ...(s.leafColors ? { leafColors: [...s.leafColors] } : {}),
    ...(s.regions ? { regions: [...s.regions] } : {}),
    ...(s.crownRatio ? { crownRatio: [s.crownRatio[0], s.crownRatio[1]] as [number, number] } : {}),
    ...(s.baseRatio ? { baseRatio: [s.baseRatio[0], s.baseRatio[1]] as [number, number] } : {}),
    ...(s.heightRange ? { heightRange: [s.heightRange[0], s.heightRange[1]] as [number, number] } : {}),
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
  if (s.architecture === "palm" && !(s.whorl >= 3)) out.push("a palm needs whorl (its fronds) of 3 or more");
  if (s.weep !== undefined && !(s.weep >= 0 && s.weep <= 1)) out.push("weep must be 0..1");
  if (s.palmLeaf !== undefined && !["feather", "fan"].includes(s.palmLeaf)) out.push("palmLeaf must be feather or fan");
  if (s.pruning !== undefined && !["natural", "skirt", "skinned", "pineapple"].includes(s.pruning)) out.push("pruning must be natural, skirt, skinned or pineapple");
  for (const k of ["plumose", "skirt"] as const) if (s[k] !== undefined && !((s[k] as number) >= 0 && (s[k] as number) <= 1)) out.push(`${k} must be 0..1`);
  for (const k of ["frondWidth", "fanDroop"] as const) if (s[k] !== undefined && !((s[k] as number) >= 0.3 && (s[k] as number) <= 2)) out.push(`${k} must be 0.3..2`);
  if (s.deadColor !== undefined && !/^#[0-9a-f]{6}$/i.test(s.deadColor)) out.push("deadColor must be a hex colour like #a88f68");
  if (s.crownPeak !== undefined && !(s.crownPeak >= 0 && s.crownPeak <= 0.95)) out.push("crownPeak must be 0..0.95");
  if (s.crownRound !== undefined && !(s.crownRound >= 0.8 && s.crownRound <= 8)) out.push("crownRound must be 0.8..8");
  if (s.lobes !== undefined && !(s.lobes >= 0 && s.lobes <= 1)) out.push("lobes must be 0..1");
  if (s.scaffolds !== undefined && !(Number.isInteger(s.scaffolds) && s.scaffolds >= 0 && s.scaffolds <= 12)) out.push("scaffolds must be a whole number 0..12");
  if (s.forkStems !== undefined && !(Number.isInteger(s.forkStems) && s.forkStems >= 1 && s.forkStems <= 4)) out.push("forkStems must be a whole number 1..4");
  if (s.forkSplits !== undefined && !(Number.isInteger(s.forkSplits) && s.forkSplits >= 0 && s.forkSplits <= 3)) out.push("forkSplits must be a whole number 0..3");
  if (s.forkStemsMost !== undefined && !(Number.isInteger(s.forkStemsMost) && s.forkStemsMost >= (s.forkStems ?? 2) && s.forkStemsMost <= 4)) out.push("forkStemsMost must be a whole number from forkStems to 4");
  if (s.forkSpread !== undefined && !(s.forkSpread >= 0 && s.forkSpread <= 1)) out.push("forkSpread must be 0..1");
  if (s.stemRange !== undefined && !(s.stemRange.length === 2 && s.stemRange.every((n) => Number.isInteger(n) && n >= 2 && n <= 4) && s.stemRange[0] <= s.stemRange[1])) out.push("stemRange must be [least, most], whole numbers 2..4");
  if ((s.forkShare ?? 0) + (s.stemShare ?? 0) > 1) out.push("forkShare and stemShare together must be 1 or less");
  if (s.shed !== undefined && !(s.shed >= 0 && s.shed <= 1)) out.push("shed must be 0..1");
  if (s.boleStubs !== undefined && !(s.boleStubs >= 0 && s.boleStubs <= 1)) out.push("boleStubs must be 0..1");
  if (s.limbAngle !== undefined && !(s.limbAngle.length === 2 && s.limbAngle.every((a) => a >= 0 && a <= 175))) out.push("limbAngle must be [top, base], each 0..175 degrees");
  for (const k of ["limbCurve", "limbCurveBack"] as const) if (s[k] !== undefined && !(Math.abs(s[k] as number) <= 180)) out.push(`${k} must be -180..180 degrees`);
  if (s.zigzag !== undefined && !(s.zigzag >= 0 && s.zigzag <= 60)) out.push("zigzag must be 0..60 degrees");
  if (s.lean !== undefined && !(s.lean >= 0 && s.lean <= 35)) out.push("lean must be 0..35 degrees");
  if (s.zigzagRun !== undefined && !(s.zigzagRun >= 0 && s.zigzagRun <= 5)) out.push("zigzagRun must be 0..5 m");
  if (s.phyllotaxis !== undefined && !["spiral", "opposite", "distichous"].includes(s.phyllotaxis)) out.push("phyllotaxis must be spiral, opposite or distichous");
  for (const k of ["sprayHang", "canopyLift", "pads", "clusters", "buttress", "fork", "forkShare", "stemShare"] as const) if (s[k] !== undefined && !((s[k] as number) >= 0 && (s[k] as number) <= 1)) out.push(`${k} must be 0..1`);
  if (!(s.clumpSize > 0)) out.push("clumpSize must be above 0");
  if (!LEAF_KIND_ROWS.includes(s.leafKind)) out.push(`leafKind must be one of ${LEAF_KIND_ROWS.join(", ")}`);
  for (const k of ["foliageDepth", "openness", "leader", "branchiness", "crooked", "leafVariation", "treeVariation", "barkPale", "stiffness", "clumpSpread"] as const) {
    if (!(s[k] >= 0 && s[k] <= 1)) out.push(`${k} must be 0..1`);
  }
  if (!(s.bend >= -1 && s.bend <= 1)) out.push("bend must be -1..1");
  if (s.crownRatio !== undefined && !(s.crownRatio.length === 2 && s.crownRatio[0] > 0 && s.crownRatio[0] < s.crownRatio[1] && s.crownRatio[1] <= 1.5)) out.push("crownRatio must be [least, most], above 0 and to 1.5, the least under the most");
  if (s.baseRatio !== undefined && !(s.baseRatio.length === 2 && s.baseRatio[0] >= 0 && s.baseRatio[0] < s.baseRatio[1] && s.baseRatio[1] < 1)) out.push("baseRatio must be [least, most], from 0 to under 1, the least under the most");
  if (s.heightRange !== undefined && !(s.heightRange.length === 2 && s.heightRange[0] > 0 && s.heightRange[0] < s.heightRange[1] && s.heightRange[1] <= 150)) out.push("heightRange must be [typical, most] in metres, above 0 and to 150, the typical under the most");
  if (s.regions && !s.regions.every((r) => REGION_ROWS.includes(r))) out.push(`regions must be from ${REGION_ROWS.join(", ")}`);
  if (s.leafColors && !s.leafColors.every((c) => /^#[0-9a-f]{6}$/i.test(c))) out.push("leafColors must be hex colours like #5b7f3a");
  return out;
}
