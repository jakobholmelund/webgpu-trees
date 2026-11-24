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
// - palm: grown by palm.ts, as a palm: one stem from one tip, and a crown of
//   fronds round its top by the golden angle, the young upright, the old
//   hanging, kept as it is pruned.
//
// Where it stands among other trees (stand.ts) is light too: its neighbours'
// crowns hide the low sky on their side, as a shadow over the voxels where
// the sky they hide would have come in. So an edge tree's buds turn out to
// the open side and its shaded side's lower branches are shed, and a tree
// inside a wood keeps only its top: the shapes come out of the light, as the
// rest of the crown's do. An edge tree's great limbs swing a little to the
// open side, and those that would reach into the dark are never grown; a
// conifer's boughs on its dark side die back or are not there. The crown
// still keeps to its outline: what moves is within it.
//
// A broadleaf or a shrub that weeps (`weep`) then hangs whips from its outer
// twigs: a short arch out, then straight down towards the crown's base, leaved
// all along, in place of the leaves at those twigs' ends.
//
// Then the same for all: clumps that crowd each other are thinned, the twigs
// that thinning left bare are shed (no twig ends without leaves), the tree is
// fitted to its size (a survey measured it, and a ball meets it there), and the
// radii come from the pipe model: a branch carries the wood of all it bears,
// of the branches it has shed, and of the twigs it once bore. A bole under a
// high crown has its own taper (its growth over years, not its crown's
// twigs), and the crown's wood meets it; a species that keeps them has dead
// stubs along a long clean bole.
//
// Plain Math and no three, so growing runs anywhere: in a worker, in node.

import { growPalm } from "./palm.ts";
import { type TreeSpecies } from "./species.ts";
import { type Stand, standShare } from "./stand.ts";
import { crownProfile, type Clumps, type GrownTree, type Skeleton, type TreeSize } from "./tree.ts";
import { Random, hashSeed } from "./random.ts";

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
/**
 * How much of its last internode's turn (its wandering and its turning to the light) a shoot keeps into the
 * next: a shoot bends gently, as it grows, through several internodes; turned afresh at each, it zigzags,
 * and smoothing only rounds the zigzag off.
 */
const BEND_KEEP = 0.4;
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
/** A stem that forks below its crown (`fork`) puts out its limbs over this share of the way from its fork to its crown's base. */
const FORK_SPAN = 0.25;
/**
 * A stem that divides at its fork into a few stems (`forkStems`), each dividing again in V-forks (`forkSplits`):
 * the angles (from upright) its first stems rise at, and how much further out each division's arms lean;
 * how long its first stems are, as a share of the way from the fork to the crown's base and a share of its
 * depth (FORK_INTO), and how much shorter each division's arms; how far apart round the stem its arms swing (rad); and
 * how far a crooked one's piece of fork wanders each internode, as LIMB_WANDER does a limb's.
 */
const FORK_TILT: [number, number] = [28 * DEG, 40 * DEG];
const FORK_TILT_STEP = 13 * DEG;
/** How far into its crown a forked stem's arms rise before they are limbs: a share of its depth past its base. */
const FORK_INTO = 0.3;
/** How far out from its stem all its arms together may lean, a share of its crown's radius (a narrow crown's rise steeply). */
const FORK_REACH = 0.55;
const FORK_SHORTER = 0.72;
const FORK_SWING = 0.5;
const FORK_WANDER = 0.16;
/** How far apart up the stem a third or fourth stem leaves it (m). */
const FORK_APART = 0.3;
/**
 * A forked trunk's or a clump's stems (trunks of their own): how far out from the axis the middle of each one's
 * share of the crown is, as a share of its radius, by how many share it; how far a stem may lean where it
 * leaves (rad) at leader 1 and at leader 0; the most its lean eases as it rises (the power p of 1 - (1 - t)^p:
 * 1 straight, more leaning out at first and then turning up); how far round from its way out its great limbs
 * leave it, at the most, over all its stems (a share of a full turn); and how far into another's share a
 * stem's wood may grow, a share of the crown's radius.
 */
const TRUNK_SHARE = [0, 0, 0.42, 0.5, 0.55];
const TRUNK_TILT: [number, number] = [12 * DEG, 38 * DEG];
const TRUNK_CURVE = 2.4;
const TRUNK_COVER = 1.3;
const SHARE_OVERLAP = 0.08;
/**
 * The first piece of such a stem, from where it leaves (m); and how far up it eases into its lean and steps
 * aside to its own side of the trunk, in trunk radii, and at the least (m).
 */
const STEM_FIRST = 0.2;
/** ... and at least this many of the trunk's radii: it narrows from the trunk to itself over that, a crotch's shoulder. */
const STEM_FIRST_RADII = 1.4;
const STEM_EASE = 1.6;
/** How much thicker such a stem is where it leaves the trunk, fused into it, and over how much of its first piece that falls by e. */
const STEM_JOIN = 0.25;
const STEM_JOIN_FALL = 0.5;
const STEM_EASE_LEAST = 0.45;
/** A trunk is not forked this close under breast height or over it (m): measured, it is one trunk or its stems. */
const FORK_CLEAR_BH = 0.3;
/** How a leaning trunk eases upright (`lean`): its slope falls as (1 - its height over the height it is upright by) to this power. */
const LEAN_EASE = 1.5;
/** ... and goes aside by then no further than this share of its crown's radius. */
const LEAN_OUT = 0.3;
/** How far a forked stem sways, at crooked 1, as a share of its height to the fork: a sinuous or leaning stem. */
const STEM_SWAY = 0.2;
/** How much wider than the species' angle the lowest scaffold leaves (and narrower the highest). */
const SCAFFOLD_SWING = 40 * DEG;
/** How far a scaffold turns up over a crown radius of its length, at bend 1 (down at -1), and how far it arches over by its weight. */
const SCAFFOLD_CURVE = 35 * DEG;
const SCAFFOLD_ARCH = 20 * DEG;
/** A crown narrower than this for its depth (radius over depth) is a column: its limbs rise steeply and arch little. */
const NARROW = 0.35;
/** A crown at least this wide for its depth (radius over depth) is lifted as its species says (`canopyLift`); narrower, less. */
const LIFT_WIDE = 0.8;
/** Wood further than this share of the crown's depth below its base, or further out than this share of its radius, has strayed and is shed (`shedStrays`). */
const STRAY_BELOW = 0.12;
/** A crown narrower than this (radius, m) is lit through: leaves to its middle. */
const SMALL_CROWN = 2.5;
const STRAY_BEYOND = 1.15;
/** How far a scaffold's way wanders each internode at crooked 1 (radians, a deviate's spread), and how much of its wander it keeps from the last. */
const LIMB_WANDER = 0.09;
const LIMB_KEEP = 0.85;
/** How much a crooked tree's wood that runs straight between elbows (`zigzagRun`) turns at each, for each internode of its run, beside what it wanders an internode. */
const ELBOW = 0.8;
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
/** A pad's leaves are those within this many clump radii of its top, at pads 1, and this many more at pads 0. */
const PAD_THIN = 0.9;
const PAD_THICK = 7;
/** The most a crown lit through (small or narrow) is in pads, whatever its species' `pads`. */
const PAD_LIT = 0.9;
/**
 * Bunches (`clusters` 1): a branch's leaves only this share of its foliage depth's reach from its twigs' ends;
 * this share of branches bare; each bunch's clump this much bigger, and hanging this many of its radii under
 * its twig.
 */
const CLUSTER_REACH = 0.8;
const CLUSTER_BARE = 0.3;
const CLUSTER_GROW = 0.6;
const CLUSTER_HANG = 0.15;
/** How far a small or narrow crown's leaves still gather into bunches, beside an open-grown one's. */
const CLUSTER_NARROW = 0;
// The wood, smoothed and simplified, then bowed by its weight.
/** Laplacian passes over the wood, forks held, each moving a node this share of the way to its neighbours' middle. */
const SMOOTH_PASSES = 2;
const SMOOTH = 0.5;
/** A node that bends its wood less than this is dropped, its neighbours joined straight. */
const SIMPLIFY = 4 * DEG;
/** The longest piece simplifying may make, in internodes. */
const SIMPLIFY_SPAN = 5;
/**
 * Where an axis's tip died and the shoot below it took the lead (sympodial growth), the new leader turns
 * part of the way back towards the way the axis ran: past this angle, by this share of the rest. Grown at
 * its lateral's angle and left there, every such node is a corner, and a twig of them a zigzag.
 */
const TAKE_LEAD_KEEP = 15 * DEG;
const TAKE_LEAD = 0.6;
/** ... and for a species whose twigs run straight on (`zigzag` 0: its terminal bud goes on, a maple's), nearly all of it. */
const TAKE_LEAD_STRAIGHT = 0.92;
/** A species' `zigzag` past this (degrees) is grown into its fine branches as a zigzag (`zigzagWood`), by what it is past it. */
const ZIGZAG_FROM = 8;
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
/** A spire (spruce, fir, cedar): the top of the leader clothed in needles all round, this share of the crown's depth at most, and no more than SPIRE_MOST m. */
const SPIRE = 0.18;
const SPIRE_MOST = 3;
/** Its needles' clumps every this many clump radii up the leader, the top one this share of a clump's radius below the tree's top, the finest this share of a clump. */
const SPIRE_STEP = 0.9;
const SPIRE_TIP = 0.35;
const SPIRE_FINE = 0.4;
const SPIRE_FULL = 1.1;
/** A pine's tufts along its bough's tip and its shoots' ends, as a share of its clump (the bough's own end has a full one). */
const TUFT = 1;
/** A pine's side shoots: from this share of the way out along its bough, this share as many as a fir's. */
const TUFT_FROM = 0.45;
const TUFT_SHOOTS = 0.75;
/** The share of boughs broken or shaded back, which stop short. */
const BOUGH_BROKEN = 0.2;
/** How far a conifer sags under its weight, as a share of what a broadleaf of its bend does. */
const CONIFER_SAG = 0.5;
/**
 * The furthest apart a conifer's whorls are, as a share of its crown's radius: a crown grown narrow in a
 * wood has short boughs, and between its whorls the interwhorl branches a forest fir or spruce carries
 * fill it, where a year's whorls alone would leave it a few tufts on a pole.
 */
const WHORL_OF_CROWN = 0.3;

// Whips.
/** The share of the node budget kept from the crown's growing for its whips, at weep 1. */
const WHIP_NODES = 0.45;
/** The share of the clumps a crown may keep that go to its whips, at weep 1 (and a fifth more whatever the weep). */
const WHIP_CLUMPS = 0.75;
/** The share of the leaves along a weeping tree's twigs that it does not bear, at weep 1: they are on its whips. */
const WEEP_TWIG_BARE = 0.4;
/** ... under this share of its crown's depth: over it, every leaf along its twigs is kept. */
const WEEP_TOP = 0.6;
/** A whip's clump, as a share of the species'. */
const WHIP_CLUMP = 0.7;
/** How far a whip turns down with each piece of its arch. */
const WHIP_TURN = 35 * DEG;
/** The steepest a whip leaves its twig upwards, and the lowest. */
const WHIP_RISE = 10 * DEG;
const WHIP_DIP = -20 * DEG;
/** How much shorter a whip may stop than the crown's base, as a share of the way down to it from its twig (squared draws: most reach far). */
const WHIP_STAGGER = 0.45;
/** Whips spring from the tops of a weeping tree's arching limbs as well as its twigs' ends, above this share of its crown's depth. */
const WHIP_ARCH_FROM = 0.5;
/** How far over a whip's arch its clumps are hung there, in their radii. */
const WHIP_ARCH_LIFT = 0.35;
/** A weeping crown's wood above this share of its depth has leaves over it (`clotheTop`): over this share of a clump's radius above it, a spray hung this share of one over it where not. */
const CLOTHE_FROM = 0.45;
const CLOTHE_COVER = 0.6;
const CLOTHE_LIFT = 0.45;
/** ... in a tree that weeps at least this much: a curtain of whips is its crown (a willow's; a birch's few whips hang from an open crown, its twigs seen through it). */
const CLOTHE_WEEP = 0.5;

// Clumps.
/** How far from a clump's centre (in its radii) the twigs it covers are: they bear its leaves, and are not shed as bare. */
const IN_SPRAY = 0.8;
/** A conifer drawn in sheets keeps a twig without a clump of its own only this close to another's centre (in its radii). */
const IN_SHEET = 0.45;
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
/** The largest a clump's radius may be, as a share of the crown's radius: five clumps across it at the least. */
const CLUMP_OF_CROWN = 0.2;

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

/**
 * A bole's taper: its radius goes as the length of stem above to this power (a cone is 1, a paraboloid 0.5;
 * measured boles between the butt and the crown are near 0.5 to 0.7).
 */
const BOLE_TAPER = 0.6;
/** How much thicker a stem is at the ground than its taper alone, where its roots flare out. */
const FLARE = 0.3;
/** How much more a buttressed foot (`buttress` 1) flares than an ordinary one. */
const FLARE_BUTTRESS = 1.2;
/** How far up the flare reaches (m, its e-folding height): this, and this much more for each metre of trunk radius. */
const FLARE_FROM = 0.15;
const FLARE_PER_RADIUS = 1.2;
/** Where a bole is cut near its foot, in flare heights, to draw the flare's curve. */
const FLARE_CUTS = [0.4, 1, 2];
/** The longest piece of bole above the flare (m). */
const BOLE_PIECE = 0.6;

// Stubs on a clean bole.
/** Stubs on a metre of bole, at boleStubs 1. */
const STUBS_PER_METRE = 1.1;
/** The lowest a stub is (m, or breast height if higher), and the highest, as a share of the crown's base. */
const STUB_FROM = 1;
const STUB_TOP = 0.96;
/** A stub's least radius, as a share of the trunk's at its foot: thin enough to be a stub, thick enough to be drawn close to. */
const STUB_THINNEST = 0.08;
/** The longest a stub is (m): what is left of a dead branch once the wind has had the rest. */
const STUB_LONGEST = 0.45;

/**
 * How dark a voxel the stand hides all of its low sky from is to a bud, in the shadow a node of wood casts
 * on the voxel under it: about as dark as under a few layers of its own crown.
 */
const STAND_SHADE = 1.0;
/**
 * In a stand, a crown lives only where it is lit at least this, for its best lit (or in the top
 * `STAND_LIVE_LEAST` of the tree's height, which it keeps however closed its wood: a tree inside a wood has
 * a live crown of nearly half its height or more: Assmann's yield tables, and every forester's eye).
 */
const STAND_LIVE = 0.5;
const STAND_LIVE_LEAST = 0.45;
/** How far an edge tree's great limbs swing to the open side, for how lopsided it stands (radians). */
const STAND_SWING = 0.55;
/** How far its leader leans out to the open side, for how lopsided it stands (a share of its wander). */
const STAND_LEADER = 0.05;
/** A conifer's bough lit less than this is dead, and gone; one lit less than `STAND_BOUGH_FULL` is shorter. */
const STAND_BOUGH = 0.4;
const STAND_BOUGH_FULL = 0.8;
/** Dead stubs along a bole a wood has cleaned, for how enclosed it stands (as `boleStubs`). */
const STAND_STUBS = 0.6;

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

// ---------------------------------------------------------------------------
// A tree's own form: whether its trunk forks, or it grows as a clump of stems.

/**
 * How one tree of its kind is built at the foot, from its own seed (`formOf`): one stem, a trunk that forks
 * (`forkShare`), or a clump of stems from one root plate (`stemShare`).
 */
export interface TreeForm {
  /** How many stems: 1, or a fork's or a clump's 2 to 4. */
  stems: number;
  /** Where a forked trunk divides, as a share of its crown base's height (1 for one stem). */
  fork: number;
  /** Whether its stems rise from one root plate (a clump), not from a trunk that forks. */
  clump: boolean;
  /** A clump's stems part this many flare heights (`flareHeight`) up, over the root plate. */
  join: number;
}

/** The seed's own stream for its form, apart from the one it grows by. */
const FORM_SALT = 0x2f6b1c3d;
/** In a closed wood (enclosure 1): this share fewer of its trees fork, or grow as clumps ... */
const WOOD_FEWER_FORKS = 0.6;
const WOOD_FEWER_CLUMPS = 0.35;
/** ... and those that fork do so this share of the way higher, towards the crown's base. */
const WOOD_HIGHER = 0.5;
/** Where a clump's stems part from their root plate, in flare heights. */
const CLUMP_JOIN: [number, number] = [1.4, 2.2];
/** A fork is never lower than this many flare heights (or half its crown's base): its root plate, under it. */
const ROOT_PLATE = 1.2;

/** A number 0..1 from a seed alone, which decides its form: below a species' shares, it forks or is a clump. */
export function formDraw(seed: number): number {
  return new Random(hashSeed(seed) ^ FORM_SALT).next();
}

/** The share of a species' trees whose trunk forks. */
export function forkShareOf(sp: TreeSpecies): number {
  if (sp.architecture !== "broadleaf") return 0;
  return Math.min(1, Math.max(0, sp.forkShare ?? (sp.fork !== undefined && sp.forkStems !== undefined ? 1 : 0)));
}

/** The share of a species' trees that grow as a clump of stems from one root plate. */
export function stemShareOf(sp: TreeSpecies): number {
  if (sp.architecture !== "broadleaf") return 0;
  return Math.min(1, Math.max(0, sp.stemShare ?? 0));
}

/** Whether a species' trees differ in their form at the foot, one from the next. */
export function formsVary(sp: TreeSpecies): boolean {
  const f = forkShareOf(sp);
  return stemShareOf(sp) > 0 || (f > 0 && (f < 1 || (sp.forkSpread ?? 0) > 0 || (sp.forkStemsMost ?? 0) > (sp.forkStems ?? 0)));
}

/**
 * A tree's form, from its own seed (and where it stands: in a closed wood fewer trees fork or grow as
 * clumps, and those that fork do so higher). The same seed always gives the same form; over many seeds, a
 * species' shares.
 */
export function formOf(sp: TreeSpecies, seed: number, stand?: Stand): TreeForm {
  const rng = new Random(hashSeed(seed) ^ FORM_SALT);
  const u = rng.next();
  const v = rng.next();
  const w = rng.next();
  const shut = Math.min(1, Math.max(0, stand?.enclosure ?? 0));
  const clump = stemShareOf(sp) * (1 - WOOD_FEWER_CLUMPS * shut);
  const forks = forkShareOf(sp) * (1 - WOOD_FEWER_FORKS * shut);
  // (Fewer stems are likelier than more.)
  const count = (lo: number, hi: number) => Math.min(hi, lo + Math.floor(v ** 1.3 * (hi - lo + 1)));
  if (u < clump) {
    const [lo, hi] = sp.stemRange ?? [2, 3];
    return { stems: count(Math.max(2, lo), Math.min(4, hi)), fork: 0, clump: true, join: CLUMP_JOIN[0] + (CLUMP_JOIN[1] - CLUMP_JOIN[0]) * w };
  }
  if (u < clump + forks) {
    const lo = Math.max(2, Math.min(4, Math.round(sp.forkStems ?? 2)));
    const hi = Math.max(lo, Math.min(4, Math.round(sp.forkStemsMost ?? lo)));
    let at = Math.min(1, Math.max(0, sp.fork ?? 0.6)) + (sp.forkSpread ?? 0) * (2 * w - 1);
    at += shut * WOOD_HIGHER * (1 - at);
    return { stems: count(lo, hi), fork: Math.min(1, Math.max(0.02, at)), clump: false, join: 0 };
  }
  return { stems: 1, fork: 1, clump: false, join: 0 };
}

/**
 * Where a tree's stems part (m): a clump's a little over its root plate, a forked trunk's where its form says
 * (but over its root plate: the stems of a trunk forked near the ground still rise from one), a stone pine's
 * (V-forks) where its form says.
 */
export function forkHeight(sp: TreeSpecies, size: TreeSize, form: TreeForm): number {
  if (form.stems <= 1) return size.crownBase;
  const hf = flareHeight(size, sp.buttress ?? 0);
  const bh = breastHeight(size);
  // (A stem's first piece, from the trunk's thickness to its own, ends under breast height or well over it.)
  const under = Math.max(FORK_CLEAR_BH, stemFirst(size));
  if (form.clump) return Math.max(0.1, Math.min(hf * form.join, 0.6 * bh, bh - under, 0.6 * size.crownBase));
  if (sp.forkSplits !== undefined) return form.fork * size.crownBase;
  const y = Math.max(form.fork * size.crownBase, Math.min(ROOT_PLATE * hf, 0.5 * size.crownBase));
  // (Not at breast height, where its trunk is measured: over it if the crown leaves room, else under it.)
  if (y > bh - under && y < bh + FORK_CLEAR_BH) return bh + FORK_CLEAR_BH <= 0.9 * size.crownBase ? bh + FORK_CLEAR_BH : Math.max(0.1, Math.min(y, bh - under));
  return y;
}

/**
 * The wood a grown tree has at a height (m): where each piece of it crosses that height (x, z from its foot)
 * and how thick it is there, the thickest first, leaving out wood thinner than `least` of its trunk's
 * radius. At 1 m, a forked or clumped tree's stems: what a ball meets of it low down (one circle for a tree
 * of one stem).
 */
export function stemsAt(tree: GrownTree, y: number, least = 0.15): { x: number; z: number; r: number }[] {
  const k = tree.skeleton;
  const out: { x: number; z: number; r: number }[] = [];
  for (let i = 0; i < k.count; i++) {
    const p = k.parent[i];
    if (p < 0 || k.y[p] > y || k.y[i] <= y) continue;
    const f = (y - k.y[p]) / Math.max(1e-9, k.y[i] - k.y[p]);
    const r = k.radius[p] + (k.radius[i] - k.radius[p]) * f;
    if (r < least * tree.size.trunkRadius) continue;
    out.push({ x: k.x[p] + (k.x[i] - k.x[p]) * f, z: k.z[p] + (k.z[i] - k.z[p]) * f, r });
  }
  return out.sort((a, b) => b.r - a.r);
}

/** How long the first piece of a forked trunk's or a clump's stem is (m). */
function stemFirst(size: TreeSize): number {
  // (No longer than leaves room for a fork just over the root plate to end under breast height: a short
  // tree's stems may still part low.)
  const room = breastHeight(size) - ROOT_PLATE * flareHeight(size) - 0.05;
  return Math.max(STEM_FIRST, Math.min(STEM_FIRST_RADII * size.trunkRadius, room));
}

/** A branch's angle from its parent (radians): the species', varied by its spread, within two spreads. */
function branchAngle(sp: TreeSpecies, rng: Random): number {
  const g = Math.max(-2, Math.min(2, rng.gauss()));
  return Math.max(5 * DEG, Math.min(175 * DEG, (sp.branchAngle + sp.branchAngleSpread * g) * DEG));
}

/**
 * Grow one tree of a species to a size. The same arguments give the same tree. A `stand` (in the tree's own
 * frame: its open side along +x) grows it in the light its neighbours leave it; left out, it stands alone.
 */
export function growTree(species: TreeSpecies, size: TreeSize, seed: number, stand?: Stand): GrownTree {
  const sz = soundSize(size);
  const rng = new Random(seed);
  const wood = newWood();
  // (Nothing round it is no stand: it grows exactly as one alone.)
  const st = stand && (stand.enclosure > 0 || stand.lopsided > 0) && species.architecture !== "palm" ? stand : undefined;
  // (Where its live crown starts: its base, unless its wood has lifted it.)
  const lift = st ? liveBaseOf(species, sz, st) : sz.crownBase;
  // The species' clump, scaled by the tree's height against the species' own (a younger tree's twigs
  // are smaller, but less so than the tree). No more than a share of the crown's radius, though: a crown
  // grown narrow in a wood is still a crown of many sprays, not two or three balls on a stick.
  const own = 0.5 * species.clumpSize * Math.sqrt(sz.height / species.height);
  const clumpR = species.architecture === "palm" ? own : Math.min(own, CLUMP_OF_CROWN * sz.crownRadius);
  // (Its form at the foot, from its own seed: one stem, a forked trunk, or a clump of stems.)
  const form = species.architecture === "broadleaf" ? formOf(species, seed, st) : { stems: 1, fork: 1, clump: false, join: 0 };
  let hung: Hung;
  switch (species.architecture) {
    case "conifer":
      hung = whorled(species, sz, rng.fork(), wood, clumpR, st, lift);
      break;
    case "broadleaf":
    case "shrub":
      hung = budGrow(species, sz, rng.fork(), wood, clumpR, st, lift, form);
      break;
    case "palm":
      // (A palm is grown as a palm: palm.ts.)
      return growPalm(species, sz, seed);
  }
  // (A stone pine's V-forks below its crown keep their limbs from there; a forked trunk's or a clump's
  // stems are kept as trunks.)
  const vForkY = form.stems > 1 && species.forkSplits !== undefined ? forkHeight(species, sz, form) : undefined;
  // (A forked trunk's or a clump's: where its stems part and their first pieces are kept as grown by the fit.)
  const keepBelow = form.stems > 1 && species.forkSplits === undefined ? forkHeight(species, sz, form) + stemFirst(sz) + 0.05 : 0;
  const tree = boleStubs(species, finish(species, sz, wood, hung, st ? lift : undefined, vForkY, keepBelow), rng.fork(), st);
  const habit = { sprayHang: species.sprayHang, pads: species.pads, clusters: species.clusters };
  const said = Object.values(habit).some((v) => v !== undefined && v > 0);
  return species.buttress || said ? { ...tree, ...(species.buttress ? { buttress: species.buttress } : {}), ...(said ? { habit } : {}) } : tree;
}

/** A size growing can use: positive, with its crown's base under its top. */
function soundSize(s: TreeSize): TreeSize {
  const height = Math.max(0.1, s.height);
  const crownRadius = Math.max(0.05, s.crownRadius);
  const crownBase = Math.min(Math.max(0, s.crownBase), 0.95 * height);
  const trunkRadius = Math.max(0.001, s.trunkRadius);
  return { height, crownRadius, crownBase, trunkRadius };
}

/**
 * How much of a place's sky a tree's stand leaves it (stand.ts, `standShare`, its crown taken as the
 * shaders take it), for the most it leaves anywhere in the crown: 1 where the crown is best off. So a tree
 * in an even shade all over (a sapling under a wood's canopy) is grown as one in the open: what shapes a
 * crown is where its light comes from, not how much of it there is.
 */
function standLightOf(sp: TreeSpecies, stand: Stand, size: TreeSize): (x: number, y: number, z: number) => number {
  const k = 0.5 * (0.3 + (1 - sp.openness) * 1.1);
  const depth = Math.max(0.01, size.height - size.crownBase);
  const shell = Math.max(sp.foliageDepth, 0.15) * Math.min(size.crownRadius, 0.5 * depth);
  const at = (x: number, y: number, z: number) => standShare(stand, size, k, shell, x, y, z);
  // (The best: over the crown's ellipsoid, at a few heights, out from its axis to near its side.)
  let best = 1e-3;
  for (let i = 0; i <= 12; i++) {
    const e = i / 6 - 1;
    const y = size.crownBase + 0.5 * depth * (1 + e);
    const r = size.crownRadius * Math.sqrt(Math.max(0, 1 - e * e));
    for (const f of [0, 0.5, 0.9])
      for (let j = 0; j < (f > 0 ? 8 : 1); j++) best = Math.max(best, at(f * r * Math.cos((j * Math.PI) / 4), y, f * r * Math.sin((j * Math.PI) / 4)));
  }
  return (x, y, z) => Math.min(1, at(x, y, z) / best);
}

/**
 * Where a crown in a stand lives from (m): the lowest height at which a place halfway out on its most open
 * side is lit enough to keep its leaves (`STAND_LIVE`), and no higher than the top `STAND_LIVE_LEAST` of the
 * tree. At a wood's edge that is its base (its open side keeps its leaves to the ground); inside a wood, high.
 */
function liveBaseOf(sp: TreeSpecies, size: TreeSize, stand: Stand): number {
  const at = standLightOf(sp, stand, size);
  const profile = profileOf(sp);
  const depth = Math.max(0.01, size.height - size.crownBase);
  const top = size.height * (1 - STAND_LIVE_LEAST);
  for (let i = 0; i <= 40; i++) {
    const y = size.crownBase + (i / 40) * depth;
    if (y >= top) return Math.max(size.crownBase, top);
    if (at(0.5 * profile(i / 40) * size.crownRadius, y, 0) >= STAND_LIVE) return y;
  }
  return Math.max(size.crownBase, top);
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

/**
 * How far a crown reaches from its axis at a height (m): its species' outline from its base to its top. A
 * crown a wood has lifted (its live crown starting at `lift`, above its base: stand.ts) is a whole crown of
 * its kind over what is left of the tree, its outline drawn from `lift` to the top, as wide as its own
 * outline or that, whichever is wider, and never past the crown's ellipsoid: what a ball meets
 * (`crownEllipsoid`). So a tree inside a wood keeps a full crown, high up and as wide as its neighbours let
 * it be, not the top of an open-grown one.
 */
function outlineOf(sp: TreeSpecies, size: TreeSize, lift = size.crownBase): (y: number) => number {
  const profile = profileOf(sp);
  const base = size.crownBase;
  const depth = Math.max(0.01, size.height - base);
  const R = size.crownRadius;
  const own = (y: number) => profile((y - base) / depth) * R;
  if (!(lift > base + 0.02 * depth)) return own;
  const live = Math.max(0.01, size.height - lift);
  const ry = 0.5 * depth;
  const cy = base + ry;
  return (y: number) => {
    const w = own(y);
    if (y <= lift) return w;
    const e = (y - cy) / ry;
    const ellipsoid = e >= 1 ? 0 : R * Math.sqrt(1 - e * e);
    return Math.max(w, Math.min(ellipsoid, profile((y - lift) / live) * R));
  };
}

// ---------------------------------------------------------------------------
// The crown's envelope: the solid of revolution its profile sweeps, from its
// base to its top. Every profile is concave in height, so the solid is convex:
// a ray from inside leaves it once, which is what lets its reach be bisected.

class Envelope {
  private readonly outline: (y: number) => number;
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
  constructor(sp: TreeSpecies, size: TreeSize, side = 0, bottom = 0, top = 0, lift = size.crownBase) {
    this.outline = outlineOf(sp, size, lift);
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
    return this.outline(y) - this.side;
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
 * A leaning trunk (`lean`): as far as its species says at its foot, its own way round (from `rng`, drawn only
 * when it leans), easing back upright by `to` metres up (its fork, or where its limbs leave it), a curve; so
 * its crown stands near over its foot: no further aside by then than LEAN_OUT of its crown's radius `R` (a tall
 * bole under a narrow crown leans less). Its slope (x, z per metre up) at a height, and how far it has gone
 * aside by then. Not in a stand (`inStand`), where its neighbours draw it up.
 */
function leanOf(sp: TreeSpecies, inStand: boolean, rng: Random, to: number, R: number): { slope: (y: number) => [number, number]; at: (y: number) => [number, number] } {
  const h = Math.max(0.01, to);
  const t = (sp.lean ?? 0) > 0 && !inStand ? Math.min(Math.tan(Math.min(35, sp.lean ?? 0) * DEG), (LEAN_OUT * R * (LEAN_EASE + 1)) / h) : 0;
  if (t === 0) return { slope: () => [0, 0], at: () => [0, 0] };
  const a = rng.range(0, 2 * Math.PI);
  const ease = (y: number) => Math.max(0, 1 - y / h);
  return {
    slope: (y) => [t * ease(y) ** LEAN_EASE * Math.cos(a), t * ease(y) ** LEAN_EASE * Math.sin(a)],
    at: (y) => {
      const d = (t * h * (1 - ease(Math.min(y, h)) ** (LEAN_EASE + 1))) / (LEAN_EASE + 1);
      return [d * Math.cos(a), d * Math.sin(a)];
    },
  };
}

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
function budGrow(sp: TreeSpecies, size: TreeSize, rng: Random, w: Wood, clumpR: number, stand?: Stand, liftTo = size.crownBase, form: TreeForm = { stems: 1, fork: 1, clump: false, join: 0 }): Hung {
  const { height: H, crownRadius: R, crownBase: base } = size;
  const depth = Math.max(0.01, H - base);
  const crown = Math.cbrt(R * R * depth);
  let L = crown / INTERNODES;
  // (The grid starts a few layers under the crown: shadow falls only downwards, and nothing on the bare
  // trunk below grows, so a tall clean bole costs it no voxels and its crown no fineness.)
  const under = (l: number) => Math.max(0, Math.floor(base / l) - 4);
  const voxels = (l: number) => (Math.ceil((2 * R) / l) + 7) ** 2 * (Math.ceil(H / l) + 6 - under(l));
  while (voxels(L) > MAX_VOXELS) L *= 1.08;
  /** How many internodes a run of a crooked tree's wood is between its elbows (`zigzagRun`), or 1. */
  const elbows = sp.zigzagRun ? Math.max(1, Math.round(sp.zigzagRun / L)) : 1;
  const weep = weepOf(sp);
  const target = Math.round(FINE_NODES * (1 - WHIP_NODES * weep));
  const cap = 2 * target + 600;

  // The crown its leaves keep to, its outline drawn in by a clump's room: its lobes, and the heights it spans.
  const lobes = new Lobes(sp.lobes ?? 0, rng);
  const side = 1.2 * clumpR;
  const lo = base + Math.min(0.25 * clumpR, 0.2 * depth);
  const hi = H - Math.min(1.05 * clumpR, 0.3 * depth);
  const mid = base + 0.5 * depth;
  const widthAt = outlineOf(sp, size, liftTo);
  // (In a stand, only where its neighbours leave it light enough to live: `liveAt`, below.)
  let liveAt: ((x: number, y: number, z: number) => boolean) | null = null;
  const inCrown = (x: number, y: number, z: number): boolean => {
    if (y < lo || y > hi) return false;
    const wd = widthAt(y) * lobes.reach(x / R, (y - mid) / (0.5 * depth), z / R) - side;
    return wd > 0 && x * x + z * z <= wd * wd && (!liveAt || liveAt(x, y, z));
  };

  // The voxels: shadow in each, and whether each is in the crown.
  const vs = L;
  const nx = Math.ceil((2 * R) / vs) + 7;
  const nz = nx;
  const skip = under(vs);
  const ny = Math.ceil(H / vs) + 6 - skip;
  const ox = -0.5 * nx * vs;
  const oz = ox;
  const oy = (skip - 2) * vs;
  const shadow = new Float64Array(nx * ny * nz);
  const room = new Uint8Array(nx * ny * nz);
  const full = LIGHT_FULL + LIGHT_OPEN * sp.openness;
  // In a stand: its light in each voxel, as its own crown leaves it (standLightOf). Where it is too dark for
  // leaves to pay for themselves, the crown does not grow at all (its lower branches there died young and
  // were shed long ago: a wood cleans its trees' boles), except in the top of the tree, which a tree keeps
  // however closed its wood; and the rest is shaded by it, STAND_SHADE layers of the crown's own where its
  // neighbours hide all of the sky the place has, so its buds turn to the open side. It does
  // not move as the tree grows.
  const standAt = stand ? standLightOf(sp, stand, size) : null;
  const standShadow = new Float64Array(standAt ? nx * ny * nz : 0);
  const standAlive = new Uint8Array(standAt ? nx * ny * nz : 0);
  if (standAt) {
    const alive = standAlive;
    const keepTop = H * (1 - STAND_LIVE_LEAST);
    // (Worked out at every third voxel each way and shared by the 27 about it: it changes slowly.)
    const share = new Float32Array(nx * ny * nz);
    for (let iy = 0; iy < ny; iy += 3)
      for (let iz = 0; iz < nz; iz += 3)
        for (let ix = 0; ix < nx; ix += 3) {
          const l = standAt(ox + (ix + 1.5) * vs, oy + (iy + 1.5) * vs, oz + (iz + 1.5) * vs);
          for (let a = iy; a < Math.min(ny, iy + 3); a++)
            for (let b = iz; b < Math.min(nz, iz + 3); b++)
              for (let d = ix; d < Math.min(nx, ix + 3); d++) {
                const c = d + nx * (b + nz * a);
                share[c] = l;
                // (In its top it lives in half the light: but not on an edge's dark side, nor deep in the dark.)
                alive[c] = l >= STAND_LIVE || (oy + (a + 0.5) * vs >= keepTop && l >= 0.5 * STAND_LIVE) ? 1 : 0;
              }
        }
    // (The shadow is the stand's light beside the best lit at the same height: it turns buds to the open
    // side, and darkens nothing where the stand is even all round; the dark below is `alive`'s.)
    for (let iy = 0; iy < ny; iy++) {
      const layer = nx * nz * iy;
      let best = 1e-3;
      for (let c = layer; c < layer + nx * nz; c++) best = Math.max(best, share[c]);
      for (let c = layer; c < layer + nx * nz; c++) standShadow[c] = STAND_SHADE * full * (1 - share[c] / best);
    }
    const cellOf = (x: number, y: number, z: number): number => {
      const ix = Math.min(nx - 1, Math.max(0, Math.floor((x - ox) / vs)));
      const iy = Math.min(ny - 1, Math.max(0, Math.floor((y - oy) / vs)));
      const iz = Math.min(nz - 1, Math.max(0, Math.floor((z - oz) / vs)));
      return ix + nx * (iz + nz * iy);
    };
    liveAt = (x, y, z) => alive[cellOf(x, y, z)] === 1;
  }
  for (let iy = 0; iy < ny; iy++) {
    const y = oy + (iy + 0.5) * vs;
    if (y < lo || y > hi) continue;
    for (let iz = 0; iz < nz; iz++)
      for (let ix = 0; ix < nx; ix++) {
        if (inCrown(ox + (ix + 0.5) * vs, y, oz + (iz + 0.5) * vs)) room[ix + nx * (iz + nz * iy)] = 1;
      }
  }
  // (Where the live crown starts: its base, unless a stand has lifted it.)
  let liveLow = Infinity;
  for (let c = 0; c < room.length && liveAt; c++) if (room[c]) liveLow = Math.min(liveLow, oy + (Math.floor(c / (nx * nz)) + 0.5) * vs);
  if (!Number.isFinite(liveLow)) liveLow = lo;
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
  const lightAt = (x: number, y: number, z: number): number => {
    const c = voxel(x, y, z);
    // (In a stand, a bud where no crown lives is in the dark: it gets nothing, and gives its branch nothing.)
    if (standAt && c >= 0 && !standAlive[c]) return 0;
    const s = c < 0 ? 0 : shadow[c] + (standAt ? standShadow[c] : 0);
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
      const score = shadow[c] + (standAt ? standShadow[c] : 0) - 0.05 * SHADOW_A * dot;
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
  /** Each node's turn as it grew (its wandering and its turning to the light), handed on to its next internode. */
  const tw = new Float64Array(cap * 3);
  const par = new Int32Array(cap);
  const main = new Int32Array(cap);
  const lat = new Int32Array(cap);
  /** 0 a stem, 1 a scaffold, 2 a shoot. */
  const kind = new Uint8Array(cap);
  const alive = new Uint8Array(cap);
  const tBud = new Uint8Array(cap);
  const lBud = new Uint8Array(cap);
  /** A V-fork (`forkStems`): its two arms share what it is given by the light each gathers, neither favoured. */
  const even = new Uint8Array(cap);
  const az = new Float64Array(cap);
  /** Which of a forked trunk's or a clump's stems a node is on (-1: the trunk under them, or a tree of one stem). */
  const owner = new Int8Array(cap).fill(-1);
  /** How many nodes along its axis a node is: which of its axis's buds it bears, for opposite or two-ranked buds. */
  const rank = new Int32Array(cap);
  const phyllo = sp.phyllotaxis ?? "spiral";
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
    owner[i] = parent >= 0 ? owner[parent] : -1;
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
      rank[i] = onAxis ? rank[parent] + 1 : 0;
      // (Round its axis: by the golden angle; opposite pairs crossed, one of each grown (a half turn, then a
      // quarter back); two ranks, a half turn each, starting square to the shoot's plane, so its laterals lie
      // in a flat fan either side of it.)
      az[i] = onAxis
        ? az[parent] + (phyllo === "opposite" ? (rank[i] % 2 === 1 ? Math.PI : -0.5 * Math.PI) : phyllo === "distichous" ? Math.PI : GOLDEN_ANGLE)
        : phyllo === "distichous"
          ? (rng.chance(0.5) ? 0 : Math.PI)
          : rng.range(0, 2 * Math.PI);
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
  const spine = (from: number, way: (s: number) => V3, most: number, keep?: (x: number, z: number) => boolean): number[] => {
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
      if (inCrown(nx2, ny2, nz2) && (!keep || keep(nx2, nz2))) entered = true;
      // (In a stand, a spine that has found no live crown by the crown's edge never will.)
      else if (entered || ny2 < 0 || (liveAt && nx2 * nx2 + nz2 * nz2 > R * R)) break;
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
  // (A forked trunk's or a clump's stems share the crown: each the part of it nearer the middle of its own
  // share than of another's, by a little. Their middles, out from the axis, are laid with the stems.)
  const shareX: number[] = [];
  const shareZ: number[] = [];
  const overlap = SHARE_OVERLAP * R;
  const owns = (k: number, x: number, z: number): boolean => {
    for (let j = 0; j < shareX.length; j++) {
      if (j === k) continue;
      const ux = shareX[k] - shareX[j];
      const uz = shareZ[k] - shareZ[j];
      const l = Math.hypot(ux, uz);
      if (l < 1e-6) continue;
      if (((x - 0.5 * (shareX[k] + shareX[j])) * ux + (z - 0.5 * (shareZ[k] + shareZ[j])) * uz) / l < -overlap) return false;
    }
    return true;
  };
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
    /** The scaffolds to lay: where each leaves, and (a forked stem's) which way and at what angle from upright. */
    const holds: { node: number; scaffold: number; az?: number; angle?: number; pos?: number; own?: number }[] = [];
    // (A stone pine's stem divides in V-forks; a forked trunk's or a clump's stems are trunks of their own.)
    const vFork = form.stems > 1 && sp.forkSplits !== undefined;
    // (Not a crown grown narrow, in a wood: its stem's limbs leave it one by one, rising steeply, as any tree's.)
    if (vFork && !liveAt && R / depth >= NARROW) {
      // A stem that divides at its fork into a few stems, each dividing again in V-forks, rising and then
      // spreading, their last arms the limbs that reach out under the crown (a stone pine's): its fork a share
      // of the way to its crown's base, its stem sinuous or leaning a little on the way, as crooked as it is.
      const yF = forkHeight(sp, size, form);
      const lean = rng.range(0, 2 * Math.PI);
      const sway = STEM_SWAY * sp.crooked * yF * rng.range(0.6, 1);
      const wave = rng.range(0.7, 1.1);
      const steps = Math.max(2, Math.ceil(yF / TRUNK_STEP));
      let at = add(0, 0, 0, -1, true, 0, [0, 1, 0]);
      lBud[at] = 0;
      const stemAt = (y: number): V3 => {
        const o = sway * Math.sin(Math.PI * wave * (y / yF));
        return [o * Math.cos(lean), y, o * Math.sin(lean)];
      };
      // (Its stems leave it a little apart up it: a node has one stem to go on and one to put out, so a third
      // or fourth leaves a little below the others.)
      const n = form.stems;
      const below: number[] = [];
      for (let k = 1; k <= steps; k++) {
        const y = (yF * k) / steps;
        const q = stemAt(y);
        at = add(q[0], q[1], q[2], at, true, 0, norm([q[0] - px[at], q[1] - py[at], q[2] - pz[at]]));
        lBud[at] = 0;
      }
      for (let k = 2; k < n; k++) {
        below.push(at);
        const q = stemAt(yF);
        at = add(q[0], py[at] + FORK_APART, q[2], at, true, 0, [0, 1, 0]);
        lBud[at] = 0;
      }
      const top = at;
      even[top] = 1;
      for (const b of below) even[b] = 1;
      const az0 = rng.range(0, 2 * Math.PI);
      const splits = Math.max(0, Math.round(sp.forkSplits ?? 1));
      // (Its first arms as long as rise, with the arms after them, from its fork a little into its crown.)
      let levels = 0;
      for (let q = 0; q <= splits; q++) levels += FORK_SHORTER ** q;
      const first = (Math.max(0.5, base - yF) + FORK_INTO * depth) / (levels * Math.cos(0.5 * (FORK_TILT[0] + FORK_TILT[1]) + FORK_TILT_STEP));
      /** The most an arm `len` long may lean (from upright): its share of how far out they all may. */
      const most = (len: number) => Math.asin(Math.min(1, (FORK_REACH * R) / (splits + 1) / Math.max(len, 1e-3)));
      let scaffold = 0;
      /** A piece of fork from `from`, `len` metres at `tilt` from upright round `a`, wandering; then its V-fork, or its limb. */
      const arm = (from: number, onAxis: boolean, a: number, lean: number, len: number, left: number) => {
        const tilt = Math.min(lean, most(len));
        const m = Math.max(2, Math.round(len / L));
        let node = from;
        let we = 0;
        let wa = 0;
        for (let j = 0; j < m; j++) {
          we = LIMB_KEEP * we + FORK_WANDER * sp.crooked * rng.gauss();
          wa = LIMB_KEEP * wa + FORK_WANDER * sp.crooked * rng.gauss();
          // (It rises, then leans out further along it: a V-fork's arms spread as they go.)
          const e = 0.5 * Math.PI - Math.max(4 * DEG, Math.min(80 * DEG, tilt + 0.5 * FORK_TILT_STEP * (j / m) + we));
          const d: V3 = [Math.cos(e) * Math.cos(a + wa), Math.sin(e), Math.cos(e) * Math.sin(a + wa)];
          // (Bare below its crown; in it, its buds put out shoots as a limb's do.)
          node = add(px[node] + d[0] * (len / m), py[node] + d[1] * (len / m), pz[node] + d[2] * (len / m), node, j > 0 || onAxis, 1, d);
        }
        const t = tilt + FORK_TILT_STEP;
        if (left <= 0) {
          holds.push({ node, scaffold: scaffold++, az: a + wa, angle: t + FORK_TILT_STEP });
          return;
        }
        // (A V-fork: the arm that goes on steeper, the other swung out wider and leaning further.)
        even[node] = 1;
        const swing = FORK_SWING * rng.range(0.7, 1.2) * (rng.chance(0.5) ? 1 : -1);
        arm(node, true, a + wa - 0.4 * swing, t - 0.7 * FORK_TILT_STEP, len * FORK_SHORTER * rng.range(0.85, 1.15), left - 1);
        arm(node, false, a + wa + 0.6 * swing, t + 0.5 * FORK_TILT_STEP, len * FORK_SHORTER * rng.range(0.85, 1.15), left - 1);
      };
      const nodes = [top, top, ...below];
      for (let k = 0; k < n; k++) {
        const a = az0 + (k * 2 * Math.PI) / n + rng.range(-0.3, 0.3);
        const tilt = rng.range(FORK_TILT[0], FORK_TILT[1]);
        // (Some stems divide once less: not every arm of an old pine forked as often.)
        const more = splits - (k > 0 && rng.chance(0.3) ? 1 : 0);
        arm(nodes[k], k === 0, a, tilt, first * rng.range(0.85, 1.15), more);
      }
    } else if (form.stems > 1) {
      // A trunk that forks into a few stems (`forkShare`; near the ground, its stems rising from one root
      // plate and leaning apart from it), or a clump of stems from one root plate (`stemShare`): each a tree's
      // stem of its own, leaning out from where they part and turning up, its leader in the middle of its own
      // share of the crown, its great limbs round it and out over its share (crowns that touch, not one
      // blob: Leonardo's tree is one crown however many its stems).
      const n = form.stems;
      const yF = forkHeight(sp, size, form);
      // (Its stems part a little apart: under breast height downwards from the fork, over it upwards, so a
      // trunk is measured there as one trunk or as its stems.)
      const apart = Math.min(FORK_APART, 0.12 * yF);
      const yLow = yF >= breastHeight(size) ? yF : yF - apart * (n - 2);
      let at = add(0, 0, 0, -1, true, 0, [0, 1, 0]);
      lBud[at] = 0;
      // (A leaning tree's trunk, `lean`, leans under its fork, easing upright to it.)
      const leaning = leanOf(sp, liveAt !== null, rng, yLow, R);
      const steps = Math.max(1, Math.ceil(yLow / TRUNK_STEP));
      for (let k = 1; k <= steps; k++) {
        const y = (yLow * k) / steps;
        const o = leaning.at(y);
        at = add(o[0], y, o[1], at, true, 0, norm([o[0] - px[at], y - py[at], o[1] - pz[at]]));
        lBud[at] = 0;
      }
      const below: number[] = [];
      for (let k = 2; k < n; k++) {
        below.push(at);
        at = add(0, py[at] + apart, 0, at, true, 0, [0, 1, 0]);
        lBud[at] = 0;
      }
      even[at] = 1;
      for (const b of below) even[b] = 1;
      const from = [at, at, ...below];
      const az0 = rng.range(0, 2 * Math.PI);
      // (Its share's middle: out from the axis, the further the more stems share the crown.)
      const out = TRUNK_SHARE[Math.min(4, n)] * R;
      const azOf: number[] = [];
      for (let k = 0; k < n; k++) {
        const a = az0 + (k * 2 * Math.PI) / n + rng.range(-0.25, 0.25);
        const d = out * rng.range(0.85, 1.15);
        azOf.push(a);
        shareX.push(d * Math.cos(a));
        shareZ.push(d * Math.sin(a));
      }
      // (How far a stem may lean where it leaves: an excurrent tree's stems rise nearly upright, a decurrent
      // one's lean out.)
      const tiltMost = TRUNK_TILT[0] + (TRUNK_TILT[1] - TRUNK_TILT[0]) * (1 - sp.leader);
      const span = Math.min(0.8, SCAFFOLD_SPAN + SCAFFOLD_SPAN_LEADER * sp.leader);
      const each = Math.max(2, Math.round(scaffolds / Math.sqrt(n)));
      const cover = Math.min(1, TRUNK_COVER / n);
      for (let k = 0; k < n; k++) {
        const a = azOf[k];
        const d = Math.hypot(shareX[k], shareZ[k]);
        const yLo = Math.max(base + SCAFFOLD_FROM * depth, liveAt ? liveLow : 0, yF + L);
        const yHi = liveAt ? Math.max(yLo + L, yLo + span * (H - yLo)) : Math.max(yLo + L, base + span * depth);
        const top = Math.max(yHi + L, yHi + Math.min(1, LEADER_REACH + (1 - LEADER_REACH) * sp.leader) * (hi - L - yHi));
        // Its way out: from where it leaves, out to its share's middle by its leader's top, leaning out most
        // at first and turning up (1 - (1 - t)^p), no more than it may lean where it leaves.
        const rise = Math.max(L, top - yF);
        const p = Math.min(TRUNK_CURVE, Math.max(1, (Math.tan(tiltMost) * rise) / Math.max(1e-3, d)));
        // (Eased in over its first few trunk radii, as are its stepping aside to its own side of the trunk and
        // the wandering it starts with: a trunk bent harder than its thickness folds over on itself.)
        const ramp = Math.max(STEM_EASE_LEAST, STEM_EASE * size.trunkRadius);
        // (Its step aside: out to where its outer side is the trunk's where they part (the trunk there its
        // stems' areas together, a stem its share), taken over its first piece.)
        const first0 = stemFirst(size);
        const trunkAt = (size.trunkRadius * boleShape(size, yF, sp.buttress ?? 0)) / boleShape(size, breastHeight(size), sp.buttress ?? 0);
        const aside = Math.max(0, trunkAt * (1 - 1 / Math.sqrt(n)));
        const slope = (y: number): number => {
          const t = Math.min(1, Math.max(0, (y - yF) / rise));
          const u = Math.min(1, Math.max(0, (y - yF) / ramp));
          return ((d * p * (1 - t) ** (p - 1)) / rise) * u * u * (3 - 2 * u) + (y - yF < first0 ? aside / first0 : 0);
        };
        const marks: number[] = [];
        for (let j = 0; j < each; j++) marks.push(yLo + ((j + rng.range(0.15, 0.85)) / each) * (yHi - yLo));
        const levels: { y: number; scaffold: number }[] = [];
        // (A short first piece, a stem leaving the fork as itself and not as a cone from the trunk's thickness;
        // then pieces close enough to draw its easing out as a curve.)
        for (const y of [first0, ...[0.4, 0.7, 1].map((f) => f * ramp).filter((y) => y > first0 + 0.1)]) if (yF + y < yLo - 0.1) levels.push({ y: yF + y, scaffold: -1 });
        const from0 = levels.length > 0 ? levels[levels.length - 1].y : yF;
        const rest = Math.max(1, Math.ceil((yLo - from0) / TRUNK_STEP));
        for (let j = 1; j < rest; j++) levels.push({ y: from0 + ((yLo - from0) * j) / rest, scaffold: -1 });
        const section: { y: number; scaffold: number }[] = marks.map((y, j) => ({ y, scaffold: j }));
        for (let y = yLo; y <= yHi + 1e-9; y += L) if (marks.every((m) => Math.abs(m - y) > 0.4 * L)) section.push({ y, scaffold: -1 });
        section.sort((u, v) => u.y - v.y);
        levels.push(...section);
        let node = from[k];
        let wx = 0;
        let wz = 0;
        let first = true;
        const phase = rng.range(0, 2 * Math.PI);
        for (const lv of levels) {
          const j = rng.onSphere();
          // (Its stems stand side by side in the trunk where they part, each stepping out from its middle to its
          // own side: so a stem's outer side runs on from the trunk's, and they part in a crotch between them.)
          const calm = Math.min(1, Math.max(0, (lv.y - yF) / ramp));
          wx = 0.6 * wx + 0.08 * sp.crooked * j[0] * calm;
          wz = 0.6 * wz + 0.08 * sp.crooked * j[2] * calm;
          const sl = slope(0.5 * (py[node] + lv.y));
          const dir = norm([wx + sl * Math.cos(a), 1, wz + sl * Math.sin(a)]);
          const len = (lv.y - py[node]) / dir[1];
          node = add(px[node] + dir[0] * len, lv.y, pz[node] + dir[2] * len, node, first ? k === 0 : true, 0, dir);
          if (first) owner[node] = k;
          first = false;
          if (lv.scaffold >= 0) {
            lBud[node] = 0;
            // (Its great limbs round it and out over its share, few towards the others'.)
            const off = (((lv.scaffold * GOLDEN_ANGLE + phase) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            holds.push({ node, scaffold: lv.scaffold, pos: each > 1 ? lv.scaffold / (each - 1) : 0.5, az: a + cover * (off - Math.PI) + rng.range(-0.2, 0.2), own: k });
          } else if (lv.y < yLo) lBud[node] = 0;
        }
        // Its leader, on up to its top.
        let lx = 0;
        let lz = 0;
        const y0 = py[node];
        const pts = spine(
          node,
          (u) => {
            const j = rng.onSphere();
            lx = 0.7 * lx + 0.06 * sp.crooked * j[0] + (stand ? STAND_LEADER * stand.lopsided : 0);
            lz = 0.7 * lz + 0.06 * sp.crooked * j[2];
            const sl = slope(y0 + u);
            return norm([lx + sl * Math.cos(a), 1, lz + sl * Math.sin(a)]);
          },
          Math.max(0, top - y0),
          (x, z) => owns(k, x, z),
        );
        node = lay(node, pts, pts.length / 3, 0, true);
        tBud[node] = 1;
      }
    } else {
    // A tree's trunk: bare to its crown's base, then through the scaffolds' span, one of them at each of
    // their heights (one in each of as many slots up it), its own lateral buds between.
    // (In a stand, from where its live crown starts, its wood's shade having lifted it.)
    // (Or lower, where the species' stem forks (`fork`): its limbs rise bare to its crown.)
    const vase = vFork ? forkHeight(sp, size, form) : undefined;
    const yLo = Math.max(vase !== undefined ? vase : base + SCAFFOLD_FROM * depth, liveAt ? liveLow : 0);
    const span = Math.min(0.8, SCAFFOLD_SPAN + SCAFFOLD_SPAN_LEADER * sp.leader);
    // (A forked stem's limbs leave it close together, in a vase: its V-forks.)
    const yHi = liveAt ? Math.max(yLo + L, yLo + span * (H - yLo)) : vase !== undefined ? Math.max(yLo + L, yLo + FORK_SPAN * (base - yLo)) : Math.max(yLo + L, base + span * depth);
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
    // (A leaning stem, `lean`, easing upright by where its limbs leave it.)
    const leaning = leanOf(sp, liveAt !== null, rng, Math.max(L, yLo), R);
    for (const lv of levels) {
      const j = rng.onSphere();
      wx = 0.6 * wx + 0.08 * sp.crooked * j[0];
      wz = 0.6 * wz + 0.08 * sp.crooked * j[2];
      const sl = leaning.slope(0.5 * (py[at] + lv.y));
      const d = norm([wx + sl[0], 1, wz + sl[1]]);
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
        lx = 0.7 * lx + 0.06 * sp.crooked * j[0] + (stand ? STAND_LEADER * stand.lopsided : 0);
        lz = 0.7 * lz + 0.06 * sp.crooked * j[2];
        return norm([lx, 1, lz]);
      }, Math.max(0, top - py[at]));
      at = lay(at, pts, pts.length / 3, 0, true);
    }
    tBud[at] = 1;
    }
    // The scaffolds, round the trunk by the golden angle, the lowest leaving widest; each turns up (or down)
    // by the species' bend and arches over by its weight, sways a little, and reaches out to the crown's
    // outline (some stop a little short).
    /** A scaffold's turning, a share `f` of the crown's reach along it: the species' curve (and back), or its bend's turn up and its weight's arch over. */
    const limbTurn = (f: number): number => {
      if (sp.limbCurve === undefined && sp.limbCurveBack === undefined) return sp.bend * SCAFFOLD_CURVE * f - SCAFFOLD_ARCH * f * f;
      const c = (sp.limbCurve ?? 0) * DEG;
      if (sp.limbCurveBack === undefined) return c * Math.min(f, 1.2);
      return 2 * c * Math.min(f, 0.5) + 2 * sp.limbCurveBack * DEG * Math.min(0.7, Math.max(0, f - 0.5));
    };
    for (const h of holds) {
      const { node, scaffold: k } = h;
      const pos = h.pos ?? (scaffolds > 1 ? k / (scaffolds - 1) : 0.5);
      const g = Math.max(-2, Math.min(2, rng.gauss()));
      // (No wider than the crown has room for: in a crown narrow for its depth (a tree grown in a wood, a
      // column), the limbs rise steeply, or they would reach its side at once and curl over into hooks.)
      // (A species that says its limbs' angles keeps them: an alder's short level limbs on its leader, in a
      // narrow cone, stop at its side.)
      const room = R / depth < NARROW && !sp.limbAngle ? Math.atan((2.4 * R) / depth) : Math.PI;
      // (The species' angle at its height in the crown, if it says; else its branch angle, swung wider low.)
      const want = h.angle !== undefined ? h.angle : sp.limbAngle ? limbAngleAt(sp, (py[node] - base) / depth) + 0.5 * sp.branchAngleSpread * g * DEG : (sp.branchAngle + 0.5 * sp.branchAngleSpread * g) * DEG + SCAFFOLD_SWING * (0.5 - pos);
      const angle = Math.min(110 * DEG, room, Math.max(8 * DEG, want));
      let a0 = h.az ?? azs + k * GOLDEN_ANGLE + rng.range(-0.3, 0.3);
      if (standAt && stand) {
        // (An edge tree's limbs swing out to the open side, along +x; one whose end would be in the dark has
        // died young and gone.)
        a0 -= STAND_SWING * stand.lopsided * Math.sin(a0);
        const reachY = Math.min(hi, py[node] + 0.25 * depth);
        const reachR = 0.8 * widthAt(reachY);
        if (!inCrown(reachR * Math.cos(a0), reachY, reachR * Math.sin(a0))) continue;
      }
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
        // (A tree whose wood runs straight between elbows, `zigzagRun`, turns only at them, by as much at once.)
        const kick = elbows > 1 ? ((Math.round(u / L) + 1) % elbows === 0 ? ELBOW * elbows : 0) : 1;
        const ge = rng.gauss();
        const ga = rng.gauss();
        if (kick > 0) {
          we = LIMB_KEEP ** elbows * we + kick * LIMB_WANDER * sp.crooked * ge;
          wa = LIMB_KEEP ** elbows * wa + kick * LIMB_WANDER * sp.crooked * ga;
        }
        const e = Math.max(-80 * DEG, Math.min(0.5 * Math.PI, e0 + limbTurn(f) + we));
        const a = a0 + sway * Math.sin(Math.PI * f + phase) + wa;
        return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
      }, R + depth, h.own !== undefined ? (x, z) => owns(h.own as number, x, z) : undefined);
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
      if (!alive[i] || c < 0 || !alive[c] || kind[c] <= 1 || internodes[c] < 3) continue;
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
    // (The turn it grows with: on along its axis, what its last internode turned by; a new shoot's afresh.)
    const turn: V3 = onAxis ? [tw[3 * from], tw[3 * from + 1], tw[3 * from + 2]] : [0, 0, 0];
    let first = !onAxis;
    for (let m = 0; m < n && count < cap; m++) {
      const j = rng.onSphere();
      const up = lift + (k === 0 ? LEADER_UP * sp.leader : 0);
      // (Wood that runs straight between elbows, `zigzagRun`, wanders all at once at each: as much as it would
      // have over the run, or more.)
      const wander = WANDER * sp.crooked * (elbows > 1 ? ((rank[at] + 1) % elbows === 0 ? ELBOW * elbows : 0) : 1);
      let wx = wander * j[0];
      let wy = wander * j[1];
      let wz = wander * j[2];
      // (Turned to the light as it grows; wood that runs straight between elbows, at them, by as much at once.)
      const elbow = elbows === 1 || (rank[at] + 1) % elbows === 0;
      if (elbow && lookForLight(px[at], py[at], pz[at], d)) {
        wx += elbows * TO_LIGHT * toLight[0];
        wy += elbows * TO_LIGHT * toLight[1];
        wz += elbows * TO_LIGHT * toLight[2];
      }
      const keep = first ? 0 : BEND_KEEP;
      first = false;
      turn[0] = keep * turn[0] + (1 - keep) * wx;
      turn[1] = keep * turn[1] + (1 - keep) * wy;
      turn[2] = keep * turn[2] + (1 - keep) * wz;
      d = norm([d[0] + turn[0], d[1] + up + turn[1], d[2] + turn[2]]);
      const x = px[at] + d[0] * L;
      const y = py[at] + d[1] * L;
      const z = pz[at] + d[2] * L;
      if (!inCrown(x, y, z) || (owner[at] >= 0 && !owns(owner[at], x, z))) {
        if (at !== from || onAxis) tBud[at] = 0;
        return;
      }
      if (at === from && onAxis) tBud[from] = 0;
      const i = add(x, y, z, at, at !== from || onAxis, k, d);
      tw[3 * i] = turn[0];
      tw[3 * i + 1] = turn[1];
      tw[3 * i + 2] = turn[2];
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
      const wm = even[i] ? qm : lambda * (kind[i] === 0 ? stemFavour : kind[i] === 1 ? SCAFFOLD_FAVOUR : 1) * qm;
      const wl = even[i] ? ql : (l >= 0 && kind[l] === 1 ? lambda * stemFavour : 1 - lambda) * ql;
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
  // (A forked trunk's or a clump's stems are stems of their own, each with its own bole: `pipeRadii`.)
  const feet = w.stems;
  let lastOwner = -1;
  for (let i = 0; i < count; i++) {
    if (!alive[i] || owner[i] < 0) continue;
    w.stem[index[i]] = feet + owner[i];
    lastOwner = Math.max(lastOwner, owner[i]);
  }
  w.stems = feet + lastOwner + 1;

  // Leaves: on the lit shoots near their twigs' ends (further back the deeper the species keeps its leaves),
  // the lighter the bigger; each at its node, a little on along its twig and out of the crown.
  // (A small or narrow crown is lit through and full of leaves to its middle, along its leader too: kept to
  // a shell, a crown two or three metres across is a ring, which from afar reads as a hook.)
  const lit = R / depth < NARROW || R < SMALL_CROWN;
  const reach = lit ? LEAF_REACH + LEAF_REACH_DEPTH : LEAF_REACH + Math.round(LEAF_REACH_DEPTH * Math.min(1, Math.max(0, sp.foliageDepth)));
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
  const bears = (i: number) => alive[i] && !(kind[i] === 0 && !lit) && fromTip[i] <= reach && light[i] >= (lit ? 0.5 * LEAF_LIGHT : LEAF_LIGHT) && py[i] >= base;
  // (Pads, `pads`: each branch off a great limb keeps only the leaves near its top, a shelf with air and bare
  // wood under it. A pad is a branch's shoots, by the branch that leaves the limb.)
  const padTop = new Map<number, number>();
  const padOf = new Int32Array(count).fill(-1);
  // (Less in a crown lit through, a small or narrow one, `PAD_LIT` at most: a tree grown in shelter or in a wood
  // is not shaped into such thin shelves, and kept to their tops so small a crown is a few balls.)
  const padding = lit ? Math.min(PAD_LIT, sp.pads ?? 0) : (sp.pads ?? 0);
  // (Bunches only where the crown has room for them: a small or narrow crown, a tree grown in a wood, is many
  // sprays all through it, as below.)
  const clustering = Math.min(1, Math.max(0, sp.clusters ?? 0)) * (R / depth < NARROW || R < SMALL_CROWN ? CLUSTER_NARROW : 1);
  if (padding > 0 || clustering > 0) {
    for (let i = 0; i < count; i++) {
      if (!alive[i]) continue;
      const p = par[i];
      if (kind[i] === 0 || p < 0) padOf[i] = -1;
      else if (kind[p] <= 1 && kind[i] === 2) padOf[i] = i;
      else if (kind[i] === 1) padOf[i] = kind[p] === 0 ? count + i : padOf[p];
      else padOf[i] = padOf[p];
      if (padOf[i] >= 0 && bears(i)) padTop.set(padOf[i], Math.max(padTop.get(padOf[i]) ?? -Infinity, py[i]));
    }
  }
  const padDepth = clumpR * (PAD_THIN + PAD_THICK * (1 - padding));
  // (Bunches, `clusters`: a branch bears only at its shoots' ends, or, a share of branches, not at all; which
  // is decided once a branch, in the order they are met.)
  const clusterReach = Math.max(1, Math.round(reach * (1 - CLUSTER_REACH * clustering)));
  const bareBranch = new Map<number, boolean>();
  for (let i = 0; i < count; i++) {
    if (!bears(i)) continue;
    if (padding > 0 && padOf[i] >= 0 && py[i] < (padTop.get(padOf[i]) ?? -Infinity) - padDepth) continue;
    if (clustering > 0 && padOf[i] >= 0) {
      if (fromTip[i] > clusterReach) continue;
      let bare = bareBranch.get(padOf[i]);
      if (bare === undefined) bareBranch.set(padOf[i], (bare = rng.chance(CLUSTER_BARE * clustering)));
      if (bare) continue;
    }
    const end = main[i] < 0 && lat[i] < 0;
    const t: V3 = end ? dirOf(i) : [0, 0, 0];
    const o = norm([px[i], py[i] - heart, pz[i]]);
    const r = clumpRadius(sp, clumpR, rng) * (0.8 + 0.3 * light[i]) * (1 + CLUSTER_GROW * clustering);
    // (A bunch hangs a little under its twig.)
    const drop = CLUSTER_HANG * clustering * r;
    hang(h, index[i], px[i] + (t[0] * HANG + o[0] * HANG_OUT) * r, py[i] + (t[1] * HANG + o[1] * HANG_OUT) * r - drop, pz[i] + (t[2] * HANG + o[2] * HANG_OUT) * r, r);
  }

  // Smoothed, bowed by its weight, and its straight runs joined; then a tree that weeps hangs its whips.
  const unit = L;
  straightenLeads(w, h, (sp.zigzag ?? TAKE_LEAD_KEEP / DEG) * DEG, sp.zigzag === 0 ? TAKE_LEAD_STRAIGHT : TAKE_LEAD);
  smoothWood(w, h);
  // (Wood that runs straight between elbows, `zigzagRun`, has zigzagged as it grew: not again, internode by
  // internode, which drawn as a curve through its nodes is a wavy line.)
  if ((sp.zigzag ?? 0) > ZIGZAG_FROM && elbows === 1) zigzagWood(w, h, ((sp.zigzag ?? 0) - ZIGZAG_FROM) * DEG);
  // (Less in a narrow crown: its wood rises steep and short-armed, and bowed it hooks.)
  sagWood(w, h, sagOf(sp) * (R / depth < NARROW ? Math.max(0.25, R / depth / NARROW) : 1), unit);
  const most = Math.round(MAX_NODES * (1 - WHIP_NODES * weep));
  const simple = simplifyWood(w, h, unit * SIMPLIFY_SPAN, most);
  if (weep <= 0) return h;
  const whips = hangWhips(sp, size, simple, clumpR, weep, rng, liveAt, liftTo);
  const out = newHung();
  for (let c = 0; c < h.node.length; c++) {
    if (whips.bears.has(h.node[c])) continue;
    // A tree that weeps bears most of its leaves on its whips, few along its twigs; but all of them over the
    // top of its crown, which they clothe over its arching limbs.
    if (simple.kids[h.node[c]].length > 0 && h.y[c] < base + WEEP_TOP * depth && rng.chance(WEEP_TWIG_BARE * weep)) continue;
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

/**
 * Each shoot that took the lead where its axis's tip died (its node's only child, starting an axis of its
 * own) turned back towards the way the axis ran, past TAKE_LEAD_KEEP by TAKE_LEAD of the rest, and all it
 * bears with it. Nodes come parents first.
 */
function straightenLeads(w: Wood, h: Hung, keepTurn = TAKE_LEAD_KEEP, share = TAKE_LEAD): void {
  const n = w.x.length;
  const x0 = Float64Array.from(w.x);
  const y0 = Float64Array.from(w.y);
  const z0 = Float64Array.from(w.z);
  const q = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) {
    q[4 * i + 3] = 1;
    const p = w.parent[i];
    if (p < 0) continue;
    let qx = q[4 * p];
    let qy = q[4 * p + 1];
    let qz = q[4 * p + 2];
    let qw = q[4 * p + 3];
    const seg: V3 = [x0[i] - x0[p], y0[i] - y0[p], z0[i] - z0[p]];
    const g = w.parent[p];
    if (g >= 0 && !w.cont[i] && w.kids[p].length === 1) {
      const into = norm([w.x[p] - w.x[g], w.y[p] - w.y[g], w.z[p] - w.z[g]]);
      const out = norm(rotate(qx, qy, qz, qw, seg[0], seg[1], seg[2]));
      const turn = Math.acos(Math.min(1, Math.max(-1, into[0] * out[0] + into[1] * out[1] + into[2] * out[2])));
      // (About the axis square to both, turning `out` towards `into`.)
      const ax: V3 = [out[1] * into[2] - out[2] * into[1], out[2] * into[0] - out[0] * into[2], out[0] * into[1] - out[1] * into[0]];
      const al = Math.hypot(ax[0], ax[1], ax[2]);
      if (turn > keepTurn && al > 1e-6) {
        const angle = (turn - keepTurn) * share;
        const sn = Math.sin(angle / 2) / al;
        const bx = ax[0] * sn;
        const by = ax[1] * sn;
        const bz = ax[2] * sn;
        const bw = Math.cos(angle / 2);
        // b times the parent's turn.
        const nqx = bw * qx + bx * qw + by * qz - bz * qy;
        const nqy = bw * qy - bx * qz + by * qw + bz * qx;
        const nqz = bw * qz + bx * qy - by * qx + bz * qw;
        const nqw = bw * qw - bx * qx - by * qy - bz * qz;
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
    const [rx, ry, rz] = rotate(qx, qy, qz, qw, seg[0], seg[1], seg[2]);
    w.x[i] = w.x[p] + rx;
    w.y[i] = w.y[p] + ry;
    w.z[i] = w.z[p] + rz;
  }
  follow(w, h, x0, y0, z0);
}

/**
 * A sympodial species' fine branches zigzag (`zigzag`): each shoot ended in a flower or a dead tip and the bud
 * under it took the lead, a little aside, the next time the other way. Each node on a branch's own axis (the
 * second order and finer) is set aside from its axis's line, alternately left and right, by the share of its
 * piece that turns it by `angle`; all beyond it moves with it. Grown so after smoothing, which would iron a
 * zigzag flat.
 */
function zigzagWood(w: Wood, h: Hung, angle: number): void {
  const n = w.x.length;
  const x0 = Float64Array.from(w.x);
  const y0 = Float64Array.from(w.y);
  const z0 = Float64Array.from(w.z);
  const order = new Uint8Array(n);
  const step = new Int32Array(n);
  const ox = new Float64Array(n);
  const oy = new Float64Array(n);
  const oz = new Float64Array(n);
  const k = Math.tan(0.5 * angle);
  for (let i = 0; i < n; i++) {
    const p = w.parent[i];
    if (p < 0) continue;
    order[i] = w.cont[i] ? order[p] : Math.min(255, order[p] + 1);
    step[i] = w.cont[i] ? step[p] + 1 : 0;
    ox[i] = ox[p];
    oy[i] = oy[p];
    oz[i] = oz[p];
    if (order[i] < 2 || !w.cont[i]) continue;
    const sx = x0[i] - x0[p];
    const sy = y0[i] - y0[p];
    const sz = z0[i] - z0[p];
    const len = Math.hypot(sx, sy, sz);
    // (Aside square to the piece and level: a twig zigzags in its own plane, as it lies.)
    let ax = -sz;
    let az = sx;
    const al = Math.hypot(ax, az);
    if (al < 1e-6 || len < 1e-6) continue;
    ax /= al;
    az /= al;
    const by = (step[i] % 2 === 0 ? 1 : -1) * k * len;
    ox[i] += ax * by;
    oz[i] += az * by;
  }
  for (let i = 0; i < n; i++) {
    w.x[i] = x0[i] + ox[i];
    w.y[i] = y0[i] + oy[i];
    w.z[i] = z0[i] + oz[i];
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
    // (A stem leaving a forked trunk keeps its first node: its first piece is where it narrows to itself.)
    if (p < 0 || kids[i].length !== 1 || w.stem[i] !== w.stem[p]) continue;
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
function hangWhips(sp: TreeSpecies, size: TreeSize, w: Wood, clumpR: number, weep: number, rng: Random, alive?: ((x: number, y: number, z: number) => boolean) | null, lift = size.crownBase): { bears: Set<number>; h: Hung } {
  const { crownBase: base, crownRadius: R, height: H } = size;
  const depth = Math.max(0.01, H - base);
  const rW = WHIP_CLUMP * clumpR;
  const thinK = thinGap(sp);
  const piece = 2.3 * thinK * rW;
  const gap = 2 * thinK * rW;
  const inner = new Envelope(sp, size, rW, 0.7 * rW, rW, lift);
  const ends: number[] = [];
  for (let i = 0; i < w.x.length; i++) if (w.kids[i].length === 0 && w.parent[i] >= 0 && w.y[i] > base) ends.push(i);
  // (And the tops of the arches its limbs make in its upper crown, where they turn over and down: a willow's
  // whips spring from all along the top of its arching limbs. Hung only from its twigs' ends, the arches were
  // bare wire looping over the crown.)
  for (let i = 0; i < w.x.length; i++) {
    const p = w.parent[i];
    if (p < 0 || w.kids[i].length === 0 || w.y[i] < base + WHIP_ARCH_FROM * depth || w.y[i] <= w.y[p]) continue;
    if (w.kids[i].every((k) => w.y[k] < w.y[i])) ends.push(i);
  }
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
      // (In a stand, no lower than its crown lives there: a whip hangs to the ground on the open side.)
      if (alive && !alive(nx, ny, nz)) break;
      // Inside the crown's outline: drawn in to it (its arch, from a twig at the crown's edge, follows the
      // edge round), and ended where the outline narrows fast under it as it hangs.
      const wd = inner.width(ny);
      if (wd < 0) break;
      const r = Math.hypot(nx, nz);
      if (r > wd) {
        if (hangAt >= 0 && r - wd > 0.7 * piece) break;
        // (Past the outline, it goes no further out and turns down the sooner: drawn back in to the outline, a
        // whip arching up out of the crown's narrow top turned back on itself, and its wood was drawn as a loop
        // of wire over the crown.)
        const r0 = Math.hypot(x, z);
        if (r > r0 && r0 > 1e-6) {
          nx = x + (nx - x) - (x / r0) * (r - r0);
          nz = z + (nz - z) - (z / r0) * (r - r0);
        }
        e = Math.max(-0.5 * Math.PI, e - WHIP_TURN);
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
    // (A twig's end gives its leaves to its whip; an arch's top keeps its own, over the wood.)
    if (w.kids[i].length === 0) bears.add(i);
    let q = i;
    const n = Math.min(pieces, nodesLeft, clumpsLeft);
    for (let k = 0; k < n; k++) {
      q = addNode(w, path[3 * k], path[3 * k + 1], path[3 * k + 2], q, true);
      const r = rW * Math.min(1.3, Math.max(0.75, 1 + 0.25 * sp.clumpSpread * rng.gauss()));
      // (Along its arch, over the wood, which its leaves hide: hung under it there, they left the arch a bare
      // wire over the crown's top. Hanging, a little under it.)
      const arch = hangAt >= 0 && 3 * k < hangAt;
      hang(h, q, w.x[q], w.y[q] + (arch ? WHIP_ARCH_LIFT : -0.15) * r, w.z[q], r);
    }
    nodesLeft -= n;
    clumpsLeft -= n;
  }
  return { bears, h };
}

// ---------------------------------------------------------------------------
// Conifers: a leader, and whorls of boughs.

/**
 * A bough's line, of unit length: from the horizontal at `rise`, bending by `curve` along it, in n pieces;
 * or, given `back`, by `curve` over its inner half and `back` over its outer (Weber and Penn's nCurve and
 * nCurveBack: a J-curved bough droops, then its tip turns up). Never past straight up or straight down.
 */
function boughLine(rise: number, curve: number, n: number, back?: number): { h: number[]; v: number[] } {
  const h = [0];
  const v = [0];
  let e = rise;
  for (let k = 0; k < n; k++) {
    const s = (k + 0.5) / n;
    const turn = back === undefined ? curve / n : s < 0.5 ? (2 * curve) / n : (2 * back) / n;
    e = Math.max(-88 * DEG, Math.min(88 * DEG, e + turn));
    h.push(h[k] + Math.cos(e) / n);
    v.push(v[k] + Math.sin(e) / n);
  }
  return { h, v };
}

/**
 * The angle a first-order limb leaves its trunk at (radians from upright), at a share `t` of the way up the
 * crown: the species' `limbAngle` from its base to its top, or its `branchAngle`.
 */
function limbAngleAt(sp: TreeSpecies, t: number): number {
  if (!sp.limbAngle) return sp.branchAngle * DEG;
  const u = Math.min(1, Math.max(0, t));
  return (sp.limbAngle[1] + (sp.limbAngle[0] - sp.limbAngle[1]) * u) * DEG;
}

/** Whether a species carries its needles as a pine does: in tufts at its shoots' ends, the wood behind them bare. */
function tufted(sp: TreeSpecies): boolean {
  return sp.leafKind === "pine";
}

/**
 * Whether a conifer's top is a spire: its leader kept (excurrent) and clothed in needles all round over its
 * last few metres, with the short upswept boughs of its last whorls (a spruce's, a fir's, a cedar's).
 */
function spired(sp: TreeSpecies): boolean {
  return sp.architecture === "conifer" && sp.leader >= 0.8 && !tufted(sp);
}

function whorled(sp: TreeSpecies, size: TreeSize, rng: Random, w: Wood, clumpR: number, stand?: Stand, lift = size.crownBase): Hung {
  const { height: H, crownRadius: R, crownBase: base } = size;
  const depth = Math.max(0.01, H - base);
  const standAt = stand ? standLightOf(sp, stand, size) : null;
  const profileAt = outlineOf(sp, size, lift);
  const spacing = Math.min(1 / Math.max(0.05, sp.whorlsPerMetre), WHORL_OF_CROWN * R);
  const top = H - 1.1 * clumpR;
  const segLen = Math.max(0.05, BOUGH_STEP * R);
  const h = newHung();
  const shed: number[] = [];
  w.shed = shed;
  const shell = Math.max(MIN_SHELL, Math.min(1, sp.foliageDepth));
  const tufts = tufted(sp);
  const spire = spired(sp);
  /** The top of the leader clothed in needles all round: its length (m). */
  const spireLen = spire ? Math.min(SPIRE_MOST, SPIRE * depth, 0.6 * depth) : 0;
  /** How far a bough's tip may reach from the axis at a height, its clump inside the crown. */
  const reachAt = (y: number) => Math.max(0.15 * clumpR, profileAt(Math.min(H, Math.max(base, y))) - 0.9 * clumpR);
  /** A bough's turning along it (radians): the species' curve (and back), or from its bend, more for a long one. */
  const curveOf = (full: number): { curve: number; back?: number } => {
    if (sp.limbCurve === undefined && sp.limbCurveBack === undefined) return { curve: sp.bend * (BOUGH_CURVE + (BOUGH_WEIGHT * full) / R) };
    // (A long bough's weight bends it further than a short one's: the curve is a typical bough's, about the
    // crown's radius long.)
    const weight = 0.55 + 0.45 * Math.min(1.6, full / Math.max(0.01, 0.8 * R));
    return { curve: (sp.limbCurve ?? 0) * DEG * weight, back: sp.limbCurveBack === undefined ? undefined : sp.limbCurveBack * DEG };
  };

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
    const { curve, back } = curveOf(full);
    const n = Math.min(MAX_BOUGH_STEPS, Math.max(2, Math.round(full / segLen)));
    const line = boughLine(rise, curve, n, back);
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
  /** A bough's angle at a height: the species' there, varied by its spread. */
  const angleAt = (y: number) => {
    const g = Math.max(-2, Math.min(2, rng.gauss()));
    return Math.max(5 * DEG, Math.min(175 * DEG, limbAngleAt(sp, (y - base) / depth) + sp.branchAngleSpread * g * DEG));
  };

  // The lowest whorl is set so its boughs' leaves hang at the crown's base: above it when they droop,
  // below it when they rise (a pine's lowest live boughs leave the trunk under its crown and turn up into it).
  const low = plan(base, limbAngleAt(sp, 0));
  const lowLeaf = Math.min(low.n, Math.max(1, Math.ceil(low.n * (1 - shell))));
  const y0 = Math.max(0.5 * base, base + clumpR - Math.min(low.line.v[lowLeaf], low.line.v[low.n]) * low.len);

  // The leader's heights: the bare trunk in pieces, then a node at every whorl, then its top; over its spire,
  // a node every so often between, for the needles that clothe it.
  const levels: { y: number; whorl: boolean }[] = [];
  const trunkSteps = Math.max(1, Math.ceil(y0 / TRUNK_STEP));
  for (let k = 1; k < trunkSteps; k++) levels.push({ y: (y0 * k) / trunkSteps, whorl: false });
  // A leader that gives up the lead stops short of the top, and its last boughs, turned up, make the
  // crown's top round or flat: an old pine's.
  const lead = Math.max(y0 + spacing, top - (1 - sp.leader) * LEADER_SHORT * depth);
  const leaderTop = spire ? H - SPIRE_TIP * clumpR : Math.min(top, lead);
  const spireFrom = leaderTop - spireLen;
  const step = (y: number) => (spire && y >= spireFrom - 1e-9 ? Math.min(TRUNK_STEP, SPIRE_STEP * clumpR) : TRUNK_STEP);
  for (let y = y0; y < lead - 0.5 * spacing; y += spacing) {
    const yy = Math.min(lead - 0.25 * spacing, y + 0.15 * spacing * rng.range(-1, 1));
    const last = levels.length > 0 ? levels[levels.length - 1].y : 0;
    const fill = Math.floor((yy - last) / step(yy));
    for (let k = 1; k <= fill; k++) levels.push({ y: last + ((yy - last) * k) / (fill + 1), whorl: false });
    levels.push({ y: yy, whorl: true });
  }
  {
    const last = levels.length > 0 ? levels[levels.length - 1].y : 0;
    const fill = Math.floor((leaderTop - last) / step(leaderTop));
    for (let k = 1; k <= fill; k++) levels.push({ y: last + ((leaderTop - last) * k) / (fill + 1), whorl: false });
  }
  levels.push({ y: leaderTop, whorl: false });

  let i = addNode(w, 0, 0, 0, -1, false);
  let wx = 0;
  let wz = 0;
  let turn = rng.range(0, 2 * Math.PI);
  /** The leader's nodes over its spire, to clothe. */
  const spireNodes: number[] = [];
  for (const lv of levels) {
    const dy = lv.y - w.y[i];
    const j = rng.onSphere();
    wx = 0.85 * wx + 0.06 * sp.crooked * dy * j[0];
    wz = 0.85 * wz + 0.06 * sp.crooked * dy * j[2];
    i = addNode(w, wx, lv.y, wz, i, true);
    if (spire && lv.y >= spireFrom - 1e-9) spireNodes.push(i);
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
      const planned = plan(lv.y, angleAt(lv.y));
      const { line, n } = planned;
      // Not every bough is whole: some were broken or shaded back, and stop short.
      let len = planned.len * (rng.chance(BOUGH_BROKEN) ? rng.range(0.45, 0.8) : rng.range(0.85, 1));
      if (standAt) {
        // In a stand, a bough on the dark side is shorter, or dead and gone (its stub may stay: boleStubs).
        const lit = standAt(0.5 * len * Math.cos(az), lv.y, 0.5 * len * Math.sin(az));
        if (lit < STAND_BOUGH && lv.y < H * (1 - STAND_LIVE_LEAST)) {
          shed[i] += 0.5 * n;
          continue;
        }
        len *= 0.55 + 0.45 * Math.min(1, (lit - STAND_BOUGH) / (STAND_BOUGH_FULL - STAND_BOUGH));
      }
      // A bough whose leaves would hang below the crown's base is in the shade of those above: it has
      // died and fallen, as a forest tree's lower boughs do (the trunk keeps its wood).
      const leafFrom = Math.min(n, Math.max(1, Math.ceil(n * (1 - shell))));
      if (lv.y + Math.min(line.v[leafFrom], line.v[n]) * len - 1.25 * clumpR < base - 0.25 * clumpR) {
        shed[i] += 0.5 * n;
        continue;
      }
      // (Too short to carry a leaf past its spire's needles: not grown, the spire clothes the leader there.)
      if (spire && lv.y >= spireFrom && len < 0.8 * clumpR) continue;
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
      // bough and at every shoot's end. A pine's needles are at its shoots' ends only, in tufts.
      // (A pine's shoots are on its bough's outer part, fewer, each tufted at its end: the bough's inner part bare.)
      // (A narrow crown, grown in a wood, is short boughs tufted all along: there is no inner part to be bare.)
      const sparse = tufts && R >= SMALL_CROWN;
      const leafy = sparse ? TUFT_FROM : Math.max(0.15, 1 - shell - 0.15);
      // (How far the shoots hang from the bough: a comb's or a cedar's hang down, a fir's lie in its plane.)
      const hang = sp.sprayHang;
      for (let k = 1; k < n * 2; k++) {
        const f = Math.floor(k / 2) / n;
        const at = bough[Math.floor(k / 2) - 1];
        if (f < leafy || !rng.chance(Math.max(0.3, sp.branchiness) * (sparse ? TUFT_SHOOTS : 1))) continue;
        const nxt = bough[Math.floor(k / 2)];
        const bd = norm([w.x[nxt] - w.x[at], w.y[nxt] - w.y[at], w.z[nxt] - w.z[at]]);
        const side = k % 2 === 0 ? 1 : -1;
        const sideDir: V3 = norm([-bd[2] * side, 0, bd[0] * side]);
        const c = Math.cos(SHOOT_ANGLE);
        const s = Math.sin(SHOOT_ANGLE);
        const sd = hang === undefined ? norm([bd[0] * c + sideDir[0] * s, bd[1] * c + sp.bend * 0.3, bd[2] * c + sideDir[2] * s]) : norm([(bd[0] * c + sideDir[0] * s) * (1 - 0.75 * hang), bd[1] * c * (1 - hang) - 1.6 * hang, (bd[2] * c + sideDir[2] * s) * (1 - 0.75 * hang)]);
        let sl = len * SHOOT_LENGTH * (1 - 0.6 * f) * (hang === undefined ? 1 : 1 - 0.35 * hang);
        // Kept inside the crown, shortened if it would poke out.
        for (let tries = 0; tries < 4; tries++) {
          const tx = w.x[at] + sd[0] * sl;
          const ty = w.y[at] + sd[1] * sl;
          const tz = w.z[at] + sd[2] * sl;
          if (Math.hypot(tx, tz) <= profileAt(Math.max(base, ty)) - 0.5 * clumpR && ty <= top) break;
          sl *= 0.6;
        }
        const pieces = sl > 4 * segLen ? 2 : 1;
        let q = at;
        for (let m = 1; m <= pieces; m++) {
          const d = (sl * m) / pieces;
          q = addNode(w, w.x[at] + sd[0] * d, w.y[at] + sd[1] * d, w.z[at] + sd[2] * d, q, m > 1);
        }
        hangNeedles(h, w, q, sp, size, clumpR * (sparse ? TUFT : 1), rng);
      }
      for (let k = 1; k <= n; k++) {
        if (sparse ? k === n || (k === n - 1 && n > 2) : k === n || k / n >= 1 - shell) hangNeedles(h, w, bough[k - 1], sp, size, clumpR * (sparse && k < n ? TUFT : 1), rng);
      }
    }
  }
  if (spire) {
    // The spire: needles all round the leader over its last few metres, finer towards its tip, so its top is
    // a dense point and no bare stick (each kept before the boughs' when clumps are thinned).
    for (const node of spireNodes) {
      const u = Math.min(1, Math.max(0, (w.y[node] - spireFrom) / Math.max(1e-3, leaderTop - spireFrom)));
      const r = clumpR * (SPIRE_FINE + (SPIRE_FULL - SPIRE_FINE) * (1 - u) ** 0.7);
      hang(h, node, w.x[node], w.y[node] - 0.1 * r, w.z[node], r, true);
    }
  } else {
    // And a tuft at the leader's top.
    hangNeedles(h, w, i, sp, size, clumpR, rng);
  }
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
// For every tree: thin the clumps, fit to size, the radii, and the arrays.

function finish(sp: TreeSpecies, size: TreeSize, w: Wood, hung: Hung, lift?: number, forkY?: number, keepBelow = 0): GrownTree {
  const lifted = lift !== undefined;
  const env = new Envelope(sp, size, 0, 0, 0, lift);
  liftCanopy(sp, size, hung);
  let keep = thin(sp, env, hung);
  // (A conifer whose boughs are drawn as sheets keeps a twig only where its needles lie close over it: a sheet
  // lies along its bough, and a twig off it, inside a clump's ball but not under the sheet, pokes out bare.)
  if (sp.architecture !== "palm") keep = shedBare(w, hung, keep, sp.architecture === "conifer" && !tufted(sp) ? IN_SHEET : IN_SPRAY);
  if (clothed(sp)) keep = clotheTop(size, w, hung, keep);
  fit(size, w, hung, keep, lifted, keepBelow);
  if (sp.architecture !== "palm") keepToOutline(env, w, hung);
  // (And again where drawing the crown in to its outline took its clothing off its wood.)
  if (clothed(sp)) keep = clotheTop(size, w, hung, keep);
  if (!w.radius) refineBoles(size, w, hung, sp.buttress ?? 0);

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
  skeleton.radius.set(w.radius ?? pipeRadii(size, w, sp.buttress ?? 0));
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
  if (sp.architecture === "palm") return { size, skeleton, clumps };
  // (A trunk's stems, a forked one's or a clump's, are not strays however low they leave it.)
  const trunks = new Uint8Array(n);
  for (const start of stemStarts(w)) for (const i of trunkBole(w, start)) trunks[i] = 1;
  return shedStrays(size, skeleton, clumps, forkY, trunks);
}

/** Whether a species' crown is a weeping one whose top is clothed in leaves (`clotheTop`): its sprays are hung over its wood there. */
export function clothed(sp: TreeSpecies): boolean {
  return weepOf(sp) >= CLOTHE_WEEP;
}

/**
 * A weeping crown's top clothed: every piece of its upper wood with leaves over it. A willow's arching limbs
 * carry the springing bases of its whips and short leafy shoots all along their tops, so from any side its
 * top is a dome of leaves and no wood shows over it; grown, its arches' tops between the whips it hung were
 * bare wire over the crown. Wherever a piece of wood in the crown's upper part (CLOTHE_FROM of its depth) has
 * no clump's inner core (CLOTHE_COVER of its radius) over it, a whip's spray is hung over it, its centre
 * CLOTHE_LIFT of its radius above the wood, the highest wood first (one hung over it covers what is under
 * it). Kept as a whip's leaves are. Returns `keep` with the new clumps' indices.
 */
function clotheTop(size: TreeSize, w: Wood, h: Hung, keep: number[]): number[] {
  const base = size.crownBase;
  const depth = Math.max(0.01, size.height - base);
  const from = base + CLOTHE_FROM * depth;
  if (keep.length === 0) return keep;
  // (The size of the whips' sprays, or the crown's.)
  const own = keep.filter((c) => h.whip[c]).map((c) => h.r[c]);
  const rs = (own.length > 0 ? own : keep.map((c) => h.r[c])).sort((a, b) => a - b);
  const r = rs[rs.length >> 1];
  const list = keep.slice();
  const covered = (x: number, y: number, z: number): boolean => {
    for (const c of list) {
      const rc = h.r[c];
      const dx = h.x[c] - x;
      const dz = h.z[c] - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < rc * rc && h.y[c] + CLOTHE_COVER * Math.sqrt(rc * rc - d2) >= y) return true;
    }
    return false;
  };
  const samples: { node: number; x: number; y: number; z: number }[] = [];
  for (let i = 0; i < w.x.length; i++) {
    const p = w.parent[i];
    if (p < 0) continue;
    // (Along it, every half a spray's radius, each on the nearer of its ends.)
    const steps = Math.max(1, Math.ceil(Math.hypot(w.x[i] - w.x[p], w.y[i] - w.y[p], w.z[i] - w.z[p]) / (0.5 * r)));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const y = w.y[p] + (w.y[i] - w.y[p]) * t;
      if (y >= from) samples.push({ node: t < 0.5 ? p : i, x: w.x[p] + (w.x[i] - w.x[p]) * t, y, z: w.z[p] + (w.z[i] - w.z[p]) * t });
    }
  }
  samples.sort((a, b) => b.y - a.y || a.node - b.node);
  const out = keep.slice();
  for (const s of samples) {
    if (covered(s.x, s.y, s.z)) continue;
    hang(h, s.node, s.x, s.y + CLOTHE_LIFT * r, s.z, r, true);
    list.push(h.node.length - 1);
    out.push(h.node.length - 1);
  }
  return out;
}

/**
 * The crown's underside cleared (`canopyLift`), so its limbs show beneath it: no leaves under a bowl from
 * the lowest leaves at the crown's rim up to that share of the way to its heart at its middle. Reckoned on
 * the leaves as grown and bowed, from the lowest of them (the fit then sets those at the crown's base), and
 * marked by moving them out of the crown, below it, where thinning drops them. Only an open-grown crown is
 * lifted so: one narrower than it is deep (a tree grown in a wood or in shelter, as a survey may hand over)
 * keeps its leaves down its middle, the lift fading from a crown as wide as LIFT_WIDE of its depth to none
 * at a column's (NARROW); cleared, a narrow crown's bowl is most of it.
 */
function liftCanopy(sp: TreeSpecies, size: TreeSize, h: Hung): void {
  const wide = size.crownRadius / Math.max(0.01, size.height - size.crownBase);
  const L = (sp.canopyLift ?? 0) * Math.min(1, Math.max(0, (wide - NARROW) / (LIFT_WIDE - NARROW)));
  if (L <= 0 || h.node.length === 0) return;
  let low = Infinity;
  let top = -Infinity;
  for (let c = 0; c < h.node.length; c++) {
    low = Math.min(low, h.y[c] - h.r[c]);
    top = Math.max(top, h.y[c] + h.r[c]);
  }
  const heart = low + 0.5 * (top - low);
  for (let c = 0; c < h.node.length; c++) {
    const rho = Math.min(1, Math.hypot(h.x[c], h.z[c]) / size.crownRadius);
    if (h.y[c] < low + L * (heart - low) * (1 - rho * rho)) h.y[c] = -1e6;
  }
}

/**
 * Which nodes bear leaves (1) or lead to wood that does: a node a clump hangs on, a node inside a clump
 * (within IN_SPRAY of its radii of its centre: a clump is a spray of leaves over the twigs there, not one
 * twig's), every node on the way down from one, and every stem's foot. Each clump is [node, x, y, z,
 * radius]; nodes not `alive` (if given) bear nothing.
 */
function leafy(n: number, parent: ArrayLike<number>, x: ArrayLike<number>, y: ArrayLike<number>, z: ArrayLike<number>, clumps: number[][], alive?: Uint8Array, inSpray = IN_SPRAY): Uint8Array {
  const bears = new Uint8Array(n);
  for (const [node] of clumps) bears[node] = 1;
  // (A hashed grid of the clumps, by the largest's reach.)
  let most = 0;
  for (const c of clumps) most = Math.max(most, inSpray * c[4]);
  const cell = Math.max(1e-3, most);
  const size = 4096;
  const head = new Int32Array(size).fill(-1);
  const next = new Int32Array(clumps.length).fill(-1);
  const key = (ix: number, iy: number, iz: number) => (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791)) & (size - 1);
  clumps.forEach((c, k) => {
    const h = key(Math.floor(c[1] / cell), Math.floor(c[2] / cell), Math.floor(c[3] / cell));
    next[k] = head[h];
    head[h] = k;
  });
  for (let i = 0; i < n; i++) {
    if (bears[i] || (alive && !alive[i])) continue;
    const ix = Math.floor(x[i] / cell);
    const iy = Math.floor(y[i] / cell);
    const iz = Math.floor(z[i] / cell);
    for (let a = -1; a <= 1 && !bears[i]; a++)
      for (let b = -1; b <= 1 && !bears[i]; b++)
        for (let d = -1; d <= 1 && !bears[i]; d++)
          for (let k = head[key(ix + a, iy + b, iz + d)]; k >= 0; k = next[k]) {
            const c = clumps[k];
            const reach = inSpray * c[4];
            if ((x[i] - c[1]) ** 2 + (y[i] - c[2]) ** 2 + (z[i] - c[3]) ** 2 < reach * reach) {
              bears[i] = 1;
              break;
            }
          }
  }
  for (let i = n - 1; i >= 0; i--) {
    const p = parent[i];
    if (alive && !alive[i]) bears[i] = 0;
    if (p < 0) bears[i] = 1;
    else if (bears[i]) bears[p] = 1;
  }
  return bears;
}

/**
 * Every twig that bears no leaves, nor leads to any, is shed, back to the wood that does: once the crown is
 * thinned, a twig whose clump went is a dead twig, and a tree drops those (they are what litters the ground
 * under it). Left on, they are bare forks poking out of the crown, and the leaves they no longer lead to
 * hang in the air between them. A stem's foot stays. (The pipe model is not told of these, as it is of the
 * branches shed in the dark: they are many and small, and a fork that kept their pipes would be far thicker
 * than Leonardo's rule has it.) Keeps only the kept clumps in `h`, and returns their indices, now 0, 1, ...
 */
function shedBare(w: Wood, h: Hung, keep: number[], inSpray = IN_SPRAY): number[] {
  const n = w.x.length;
  if (keep.length === 0) return keep;
  const bears = leafy(n, w.parent, w.x, w.y, w.z, keep.map((c) => [h.node[c], h.x[c], h.y[c], h.z[c], h.r[c]]), undefined, inSpray);
  const to = new Int32Array(n).fill(-1);
  const out = newWood();
  const outShed: number[] = [];
  const outRadius: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!bears[i]) continue;
    const p = w.parent[i];
    to[i] = addNode(out, w.x[i], w.y[i], w.z[i], p < 0 ? -1 : to[p], w.cont[i]);
    out.stem[to[i]] = w.stem[i];
    outShed.push(w.shed ? w.shed[i] : 0);
    if (w.radius) outRadius.push(w.radius[i]);
  }
  w.x = out.x;
  w.y = out.y;
  w.z = out.z;
  w.parent = out.parent;
  w.cont = out.cont;
  w.kids = out.kids;
  w.stem = out.stem;
  w.shed = outShed;
  if (w.radius) w.radius = outRadius;
  const kept = newHung();
  for (const c of keep) hang(kept, to[h.node[c]], h.x[c], h.y[c], h.z[c], h.r[c], h.whip[c]);
  Object.assign(h, kept);
  return keep.map((_, k) => k);
}

/**
 * Wood that has strayed well out of the tree's own space is shed, from where it strays on: a long thin
 * branch bowed by its weight out below the crown's base or out past its reach (in a narrow crown, a hook
 * hanging from it), as a tree drops a limb it cannot hold up or light. Stems stay; a clump on shed wood
 * goes with it, and wood it leaves bare goes after it.
 */
function shedStrays(size: TreeSize, sk: Skeleton, cl: Clumps, forkY?: number, trunks?: Uint8Array): GrownTree {
  const depth = Math.max(0.01, size.height - size.crownBase);
  // (A stem that forks below its crown (`fork`) keeps its limbs from there.)
  const low = Math.min(size.crownBase - STRAY_BELOW * depth, forkY !== undefined ? forkY - 0.5 : Infinity);
  const far = STRAY_BEYOND * size.crownRadius;
  const keep = new Uint8Array(sk.count);
  for (let i = 0; i < sk.count; i++) {
    const p = sk.parent[i];
    const out = sk.order[i] > 0 && !trunks?.[i] && (sk.y[i] < low || Math.hypot(sk.x[i], sk.z[i]) > far);
    keep[i] = (p < 0 || keep[p]) && !out ? 1 : 0;
  }
  // (What is left bare by that goes too: a twig whose leaves were all on the wood shed past it is dead.)
  const on: number[][] = [];
  for (let c = 0; c < cl.count; c++) if (keep[cl.node[c]]) on.push([cl.node[c], cl.x[c], cl.y[c], cl.z[c], cl.radius[c]]);
  const bears = leafy(sk.count, sk.parent, sk.x, sk.y, sk.z, on, keep);
  let shed = 0;
  for (let i = 0; i < sk.count; i++) {
    if (cl.count > 0 && !bears[i]) keep[i] = 0;
    if (!keep[i]) shed++;
  }
  if (shed === 0) return { size, skeleton: sk, clumps: cl };
  const to = new Int32Array(sk.count).fill(-1);
  let n = 0;
  for (let i = 0; i < sk.count; i++) if (keep[i]) to[i] = n++;
  const pick = <A extends Float32Array | Int32Array | Uint8Array>(a: A, make: (n: number) => A) => {
    const b = make(n);
    for (let i = 0; i < sk.count; i++) if (keep[i]) b[to[i]] = a[i];
    return b;
  };
  const skeleton: Skeleton = {
    count: n,
    x: pick(sk.x, (k) => new Float32Array(k)),
    y: pick(sk.y, (k) => new Float32Array(k)),
    z: pick(sk.z, (k) => new Float32Array(k)),
    radius: pick(sk.radius, (k) => new Float32Array(k)),
    parent: new Int32Array(n),
    order: pick(sk.order, (k) => new Uint8Array(k)),
    limb: new Int32Array(n),
    along: pick(sk.along, (k) => new Float32Array(k)),
  };
  for (let i = 0; i < sk.count; i++) {
    if (!keep[i]) continue;
    skeleton.parent[to[i]] = sk.parent[i] < 0 ? -1 : to[sk.parent[i]];
    skeleton.limb[to[i]] = to[sk.limb[i]];
  }
  const kept: number[] = [];
  for (let c = 0; c < cl.count; c++) if (keep[cl.node[c]]) kept.push(c);
  const m = kept.length;
  const f = () => new Float32Array(m);
  const clumps: Clumps = { count: m, x: f(), y: f(), z: f(), radius: f(), nx: f(), ny: f(), nz: f(), node: new Int32Array(m), depth: f(), tx: f(), ty: f(), tz: f() };
  kept.forEach((c, k) => {
    for (const key of ["x", "y", "z", "radius", "nx", "ny", "nz", "depth", "tx", "ty", "tz"] as const) clumps[key][k] = cl[key][c];
    clumps.node[k] = to[cl.node[c]];
  });
  return { size, skeleton, clumps };
}

/**
 * Dead stubs on a long clean bole, as many as the species keeps (`boleStubs`): the lower branches a tree
 * grown in a wood once had, died back in the shade above and broken off short. More of them high on the
 * bole, under the crown, where they died last; the low ones have long since rotted off and healed over.
 * Wood only: no leaves below the crown's base. (No living shoots from dormant buds: a leafless one reads
 * as a bare twig.)
 */
function boleStubs(sp: TreeSpecies, tree: GrownTree, rng: Random, stand?: Stand): GrownTree {
  // (A tree in a wood keeps the stubs of the branches the wood's shade killed, whatever its kind: a
  // conifer's too, its dead boughs.)
  const amount = Math.min(1, Math.max(0, sp.boleStubs ?? 0, stand ? STAND_STUBS * stand.enclosure : 0));
  const sk = tree.skeleton;
  const kinds = sp.architecture === "broadleaf" || (stand && sp.architecture === "conifer");
  if (amount <= 0 || !kinds || Math.round(sp.stems) > 1) return tree;
  // The bole: the first stem's nodes from its foot to the first that bears a branch.
  const bole = [0];
  for (;;) {
    const at = bole[bole.length - 1];
    let next = -1;
    let kids = 0;
    for (let i = at + 1; i < sk.count; i++) {
      if (sk.parent[i] !== at) continue;
      kids++;
      if (sk.order[i] === 0) next = i;
    }
    if (next < 0 || kids > 1) break;
    bole.push(next);
  }
  const top = sk.y[bole[bole.length - 1]];
  const from = Math.max(STUB_FROM, breastHeight(tree.size));
  // (Up to the crown's base; in a wood, up to the first living limb, where the wood's shade lifted it.)
  const length = STUB_TOP * (stand ? top : Math.min(top, tree.size.crownBase)) - from;
  const room = MAX_NODES + 100 - sk.count;
  const count = Math.min(Math.floor(room / 2), Math.round(amount * STUBS_PER_METRE * length));
  if (count < 1) return tree;
  const foot = sk.radius[0];
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];
  const radius: number[] = [];
  const parent: number[] = [];
  for (let k = 0; k < count; k++) {
    // (Squared towards the top: most stubs are just under the crown.)
    const want = from + length * Math.sqrt(rng.next());
    let at = bole[0];
    for (const b of bole) if (Math.abs(sk.y[b] - want) < Math.abs(sk.y[at] - want)) at = b;
    if (sk.y[at] < from - 0.3) continue;
    const rb = sk.radius[at];
    // (A dead branch's stub is a thin one's: the thick lower limbs of a tree grown in a wood were few, and
    // what they leave is a scar, not a peg.)
    const r0 = Math.min(0.3 * rb, Math.max(STUB_THINNEST * foot, rb * rng.range(0.1, 0.2)));
    const len = Math.min(STUB_LONGEST, r0 * rng.range(5, 12)) * (0.6 + 0.4 * ((sk.y[at] - from) / Math.max(0.01, length)));
    // Off at the species' angle and a little lower: a dead branch has stopped turning to the light.
    const angle = Math.min(100 * DEG, (sp.branchAngle + rng.range(5, 35)) * DEG);
    const d = cone([0, 1, 0], angle, rng.range(0, 2 * Math.PI));
    const ax = sk.x[at] + d[0] * len;
    const ay = sk.y[at] + d[1] * len;
    const az = sk.z[at] + d[2] * len;
    x.push(ax);
    y.push(ay);
    z.push(az);
    radius.push(r0);
    parent.push(at);
    // (Broken off, not sawn: its end narrows over a little more, ragged, so its tube does not end in an open
    // ring.)
    const tip = r0 * rng.range(1, 2);
    x.push(ax + d[0] * tip);
    y.push(ay + d[1] * tip);
    z.push(az + d[2] * tip);
    radius.push(r0 * 0.35);
    parent.push(-1 - (x.length - 2));
  }
  const m = x.length;
  if (m === 0) return tree;
  const grow = <A extends Float32Array | Int32Array | Uint8Array>(a: A, make: (k: number) => A) => {
    const b = make(sk.count + m);
    b.set(a);
    return b;
  };
  const out: Skeleton = {
    count: sk.count + m,
    x: grow(sk.x, (k) => new Float32Array(k)),
    y: grow(sk.y, (k) => new Float32Array(k)),
    z: grow(sk.z, (k) => new Float32Array(k)),
    radius: grow(sk.radius, (k) => new Float32Array(k)),
    parent: grow(sk.parent, (k) => new Int32Array(k)),
    order: grow(sk.order, (k) => new Uint8Array(k)),
    limb: grow(sk.limb, (k) => new Int32Array(k)),
    along: grow(sk.along, (k) => new Float32Array(k)),
  };
  for (let k = 0; k < m; k++) {
    const i = sk.count + k;
    // (A negative parent is one of these new nodes: the stub a tip ends.)
    const p = parent[k] < 0 ? sk.count + (-1 - parent[k]) : parent[k];
    out.x[i] = x[k];
    out.y[i] = y[k];
    out.z[i] = z[k];
    out.radius[i] = radius[k];
    out.parent[i] = p;
    out.order[i] = 1;
    out.limb[i] = out.order[p] === 0 ? i : out.limb[p];
    out.along[i] = out.along[p] + Math.hypot(out.x[i] - out.x[p], out.y[i] - out.y[p], out.z[i] - out.z[p]);
  }
  return { size: tree.size, skeleton: out, clumps: tree.clumps };
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
  const spire = spired(sp);
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
      // (A conifer's spire is kept whole: its needles clothe the leader, close together.)
      let free = true;
      if (spire && h.whip[c]) {
        kept.push(c);
        const kc = key(ix, iy, iz);
        next[c] = head[kc];
        head[kc] = c;
        continue;
      }
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
function fit(size: TreeSize, w: Wood, h: Hung, keep: number[], lifted = false, below = 0): void {
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
  // (A crown its stand has lifted keeps its lowest leaves where they grew: down to the crown's base on its open
  // side, if it has one, and no lower; inside a wood, higher.)
  if (Number.isFinite(lowY) && ((off > FIT_LOW * depth && !lifted) || off < -FIT_HANG * depth) && lowY > 0.01 * size.height && size.crownBase > 0.03 * size.height) {
    from = lowY;
    to = size.crownBase + 0.5 * FIT_LOW * depth;
  }
  const upward = topY > from ? (FIT_TOP * size.height - to) / (topY - from) : 1;
  // (A trunk that forks or a clump's root plate keeps where its stems part, and their first pieces, as grown:
  // what is stretched is the trunk over them. So a fork kept clear of breast height stays clear of it.)
  const b = Math.max(0, Math.min(below, 0.8 * to, 0.8 * from));
  const stretch = (y: number) => (y > from ? to + (y - from) * upward : from <= 0 ? y : y <= b ? y : b + ((y - b) * (to - b)) / (from - b));
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
 * A stem's bole: its nodes from its start (its foot, or where it leaves a trunk that forks) up its own axis
 * to the first that bears a branch of its own (the lowest live limb, where the crown starts), that node last.
 * A trunk that forks into stems (each a stem of its own: `Wood.stem`) runs on through the nodes they leave,
 * to the last of them.
 */
function trunkBole(w: Wood, start: number): number[] {
  const out = [start];
  const s = w.stem[start];
  let at = start;
  for (;;) {
    const kids = w.kids[at];
    const next = kids.find((c) => w.cont[c] && w.stem[c] === s);
    if (next === undefined || kids.some((c) => c !== next && w.stem[c] === s)) return out;
    at = next;
    out.push(at);
  }
}

/** Where each stem starts: its foot, or where it leaves the trunk it forks from. Parents first. */
function stemStarts(w: Wood): number[] {
  const out: number[] = [];
  for (let i = 0; i < w.x.length; i++) {
    const p = w.parent[i];
    if (p < 0 || w.stem[p] !== w.stem[i]) out.push(i);
  }
  return out;
}

/** The stems that leave a bole (a trunk forking, or a clump's root plate): their starts. */
function stemsOff(w: Wood, bole: readonly number[]): number[] {
  const out: number[] = [];
  for (const b of bole) for (const c of w.kids[b]) if (w.stem[c] !== w.stem[b]) out.push(c);
  return out;
}

/** How far up a stem its root flare reaches (m): its e-folding height, more for a thicker trunk, under breast height. */
export function flareHeight(size: TreeSize, buttress = 0): number {
  const b = Math.min(1, Math.max(0, buttress));
  return Math.min((0.4 + 0.25 * b) * breastHeight(size), (FLARE_FROM + FLARE_PER_RADIUS * size.trunkRadius) * (1 + b));
}

/**
 * The shape of a bole's taper, as a radius at a height to be scaled: a power of the length of stem still
 * above (Behre's and Kozak's taper curves are near this between the butt and the crown), swollen at its
 * foot where the roots flare out.
 */
function boleShape(size: TreeSize, y: number, buttress = 0): number {
  const H = Math.max(0.1, size.height);
  const above = Math.max(0.02, (H - y) / H);
  return above ** BOLE_TAPER * (1 + FLARE * (1 + FLARE_BUTTRESS * buttress) * Math.exp(-Math.max(0, y) / flareHeight(size, buttress)));
}

/**
 * A bole's long bare pieces cut shorter, and more finely near its foot, where the root flare swells it: so
 * its taper is drawn as a smooth curve and not as cones stacked on cones. The new nodes lie on the pieces
 * they cut, so nothing moves; a clump keeps to its node.
 */
function refineBoles(size: TreeSize, w: Wood, h: Hung, buttress = 0): void {
  const n = w.x.length;
  const bh = breastHeight(size);
  const hf = flareHeight(size, buttress);
  /** For each node, the heights at which to cut the piece under it. */
  const cuts = new Map<number, number[]>();
  for (const start of stemStarts(w)) {
    const bole = trunkBole(w, start);
    // (A stem's under breast height is a shrub's, of the pipe model: but not a root plate that stems leave.)
    if (w.y[bole[bole.length - 1]] <= bh && stemsOff(w, bole).length === 0) continue;
    // (A stem off a forked trunk from the piece under its start.)
    for (let k = w.parent[start] >= 0 ? 0 : 1; k < bole.length; k++) {
      const c = bole[k];
      const y0 = w.y[w.parent[c]];
      const y1 = w.y[c];
      const ys: number[] = [];
      // (Not the first piece of a stem leaving a forked trunk: it narrows from the trunk to itself along it,
      // and cut, it would narrow at the cut, a ledge.)
      if (k > 0 || w.parent[start] < 0) for (const f of FLARE_CUTS) if (f * hf > y0 + 0.05 && f * hf < y1 - 0.05) ys.push(f * hf);
      const from = ys.length > 0 ? ys[ys.length - 1] : y0;
      const pieces = Math.ceil((y1 - from) / BOLE_PIECE - 1e-9);
      for (let m = 1; m < pieces; m++) ys.push(from + ((y1 - from) * m) / pieces);
      if (ys.length > 0) cuts.set(c, ys);
    }
  }
  if (cuts.size === 0) return;
  const out = newWood();
  const shed: number[] = [];
  const remap = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const p = w.parent[i];
    let parent = p < 0 ? -1 : remap[p];
    const ys = cuts.get(i);
    // (The first piece cut keeps the node's place on its parent: a stem leaving a fork leaves it as it did.)
    let cont = w.cont[i];
    if (ys && p >= 0) {
      for (const y of ys) {
        const f = (y - w.y[p]) / Math.max(1e-9, w.y[i] - w.y[p]);
        parent = addNode(out, w.x[p] + (w.x[i] - w.x[p]) * f, y, w.z[p] + (w.z[i] - w.z[p]) * f, parent, cont);
        out.stem[parent] = w.stem[i];
        shed.push(0);
        cont = true;
      }
    }
    remap[i] = addNode(out, w.x[i], w.y[i], w.z[i], parent, cont);
    out.stem[remap[i]] = w.stem[i];
    shed.push(w.shed ? w.shed[i] : 0);
  }
  for (let c = 0; c < h.node.length; c++) h.node[c] = remap[h.node[c]];
  w.x = out.x;
  w.y = out.y;
  w.z = out.z;
  w.parent = out.parent;
  w.cont = out.cont;
  w.kids = out.kids;
  w.stem = out.stem;
  w.shed = shed;
}

/**
 * The radii (m). A stem whose crown starts above breast height has a bole: it is given its taper
 * (`boleShape`), scaled to the size's trunk radius at breast height, and its crown the pipe model's radii,
 * scaled to meet the bole where the crown starts. The pipe model alone would make the bole of the wood a
 * small crown has carried and lost: a long clean bole under a narrow crown, reckoned in that crown's short
 * internodes, swells to many times its top's thickness, a thread under the crown. A real bole's taper is
 * its own growth over years, not its crown's twigs. A stem whose crown starts low (a shrub's) is the pipe
 * model's, scaled so its radius at breast height is the trunk radius.
 */
function pipeRadii(size: TreeSize, w: Wood, buttress = 0): Float64Array {
  const n = w.x.length;
  const r = pipeUnits(w, unitOf(size));
  const bh = breastHeight(size);
  const scale = new Float64Array(w.stems).fill(1);
  const boleR = new Float64Array(n).fill(-1);
  const shape = (y: number) => boleShape(size, y, buttress);
  /** A stem's bole tapered as a bole does, from a radius at a height; its crown scaled to meet it where it starts. */
  const taper = (bole: readonly number[], r0: number, y0: number, swell: (y: number) => number = () => 1) => {
    for (const b of bole) boleR[b] = (r0 * shape(w.y[b]) * swell(w.y[b])) / (shape(y0) * swell(y0));
    const top = bole[bole.length - 1];
    scale[w.stem[top]] = boleR[top] / r[top];
  };
  for (let i = 0; i < n; i++) {
    if (w.parent[i] >= 0) continue;
    const bole = trunkBole(w, i);
    const top = bole[bole.length - 1];
    const stems = stemsOff(w, bole);
    if (stems.length > 0) {
      // A trunk that forks into stems, or a clump's root plate: its stems share its wood by their area (the
      // pipe model with Leonardo's 2), each tapering as a bole does to its own crown. Forked under breast
      // height, their areas there together are the trunk's (what a survey measures of a clump is its stems'
      // basal area); above it, the trunk is measured there, as one stem is.
      const boles = stems.map((c) => trunkBole(w, c));
      let total = 0;
      for (const c of stems) total += r[c] * r[c];
      const share = stems.map((c) => (r[c] * r[c]) / Math.max(1e-12, total));
      const yTop = w.y[top];
      // (Each stem swells a little into the trunk where it leaves it, as a limb's collar does: fused there.)
      const join = (y: number) => 1 + STEM_JOIN * Math.exp(-Math.max(0, y - yTop) / (STEM_JOIN_FALL * stemFirst(size)));
      if (yTop >= bh) {
        taper(bole, size.trunkRadius, bh);
        stems.forEach((c, k) => {
          const yP = w.y[w.parent[c]];
          taper(boles[k], boleR[w.parent[c]] * Math.sqrt(share[k]) * (shape(w.y[c]) / shape(yP)), w.y[c], join);
        });
      } else {
        let area = 0;
        stems.forEach((_, k) => {
          const rs = size.trunkRadius * Math.sqrt(share[k]);
          taper(boles[k], rs, bh, join);
          area += ((rs * shape(yTop)) / shape(bh)) ** 2;
        });
        taper(bole, Math.sqrt(area), yTop);
      }
      continue;
    }
    if (w.y[top] > bh) {
      taper(bole, size.trunkRadius, bh);
      continue;
    }
    // Each stem's radius at breast height, along its axis from its foot.
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
  for (let i = 0; i < n; i++) r[i] = boleR[i] >= 0 ? boleR[i] : r[i] * scale[w.stem[i]];
  return r;
}
