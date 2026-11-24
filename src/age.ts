// A tree's habit at its own size. A species' row is its specimen: a grown tree of its kind, old enough to
// show all it comes to (a stone pine's umbrella, a Scots pine's flat top and plates, a blue gum's hanging
// bunches on a forked bole, a Torrey pine's tufts on bare upcurved limbs). Most trees a survey hands over are
// smaller than that, and narrower: a course's are planted and young, or drawn up in a wood. Grown from the
// specimen's row at a fraction of its size, they came out as small copies of an old tree (a stone pine of
// 4 m an umbrella on a stick; one of 12 m on a crown half as wide as the specimen's a tower of stacked
// cushions), which is not what young trees of any of these kinds look like.
//
// So before it is grown, a broadleaf's row is taken as its own size grows it (`habitAt`):
//
// - How young it is, from its height or its crown's reach beside its specimen's, whichever is more: none at 0.8
//   of it and over, all of it at 0.3 and under (`AGE_OLD`, `AGE_YOUNG`). What comes with age then fades with youth, as the trees' accounts in
//   docs/MORPHOLOGY.md have it: crowns are rounded and full while young, their flat tops, umbrellas, plates
//   and pads coming as they age (stone pine: "globose and shrubby when young, umbrella-shaped in mid-age and
//   flat and broad in maturity", EU Atlas; Scots pine: "open ovoid-conic when young", old trees "broadly domed
//   or even flat-topped" and forking into sub-leaders, GDB; Torrey pine: wild crowns rounded to irregular, its
//   tufts at the ends of long bare limbs an old tree's; Aleppo pine "flattening and opening up with age"); a
//   young tree keeps its leader (eucalyptus and birch "excurrent while young", Scots pine excurrent young,
//   decurrent old), its trunk not yet forked into its old limbs, its underside not yet lifted bare; a
//   blue gum's hanging bunches are its open adult crown's. (A weeping tree weeps young: a weeping willow is a
//   cultivar that hangs from its first years, so its whips are kept.)
// - How narrow it is for its depth beside its specimen: a flat top or an umbrella is a wide crown's (a crown as
//   deep as it is wide is a dome, not a slab), so a flat-topped species' top rounds as its crown narrows, all
//   the way to a dome at half its specimen's width for its depth.
//
// A tree at its specimen's size and proportions grows exactly as its row says. Palms, conifers grown whorl by
// whorl and shrubs are as their rows say at any size: a palm's head is its leaves, whatever its height, and a
// young spruce is the cone its row already is.

import { type TreeSpecies } from "./species.ts";
import { type TreeSize } from "./tree.ts";

/** A tree this share of its specimen's height or taller is grown as its specimen is ... */
export const AGE_OLD = 0.8;
/** ... and one this share of it or shorter as all young. */
export const AGE_YOUNG = 0.3;
/** How far a young tree keeps its leader, of what its row leaves (0 none more, 1 all the way to one stem). */
const YOUNG_LEADER = 0.4;
/** How much of a row's pads a young tree is without, at youth 1, and of its bunches. */
const YOUNG_PADS = 0.3;
const YOUNG_CLUSTERS = 0.6;
/** Where a young crown is widest, as a share of the way up it: an ovoid's, rounded. */
const YOUNG_PEAK = 0.4;
/** How much of a flat top a crown loses for each share it is narrower than its specimen: all of it at half as wide. */
const NARROW_DOME = 2;
/** The roundness of a crown's top that is neither flat nor pointed: an ellipse's (Rautiainen's exponent 2). */
const ROUND = 2;

/**
 * How young a tree of this size is for its kind, 0 (its specimen's age or older) to 1 (a young tree): by its
 * height or its crown's reach beside its specimen's, whichever is the more (a short tree with a crown as wide as
 * its specimen's is an old one, cut back or on a windy headland, not a young one).
 */
export function youthOf(sp: TreeSpecies, size: TreeSize): number {
  const m = Math.max(size.height / Math.max(0.01, sp.height), size.crownRadius / Math.max(0.01, sp.crownRadius));
  const t = Math.min(1, Math.max(0, (AGE_OLD - m) / (AGE_OLD - AGE_YOUNG)));
  return t * t * (3 - 2 * t);
}

/** How much narrower for its depth a crown is than its specimen's, 0 (as wide or wider) to 1 (a column). */
export function narrownessOf(sp: TreeSpecies, size: TreeSize): number {
  const own = size.crownRadius / Math.max(0.01, size.height - size.crownBase);
  const specimen = sp.crownRadius / Math.max(0.01, sp.height - sp.crownBase);
  return Math.min(1, Math.max(0, 1 - own / Math.max(1e-3, specimen)));
}

/**
 * A species' row as a tree of this size grows (see the head of this file): its own row for a tree as big as
 * its specimen, and for a palm, a conifer or a shrub at any size; else a copy, what comes with age faded by how
 * young it is, its flat top rounded by how narrow.
 */
export function habitAt(sp: TreeSpecies, size: TreeSize): TreeSpecies {
  if (sp.architecture !== "broadleaf") return sp;
  const y = youthOf(sp, size);
  const n = narrownessOf(sp, size);
  if (y <= 0 && n <= 0) return sp;
  const out: TreeSpecies = { ...sp };
  const fade = (v: number | undefined, k: number) => (v === undefined ? undefined : v * (1 - k));
  // Its top: a flat or umbrella top (round over 2) is an old tree's and a wide crown's; young or narrow, rounded.
  // (A crown half as wide for its depth as its specimen's is a dome: an umbrella's limbs have not spread yet.)
  const flat = Math.min(1, Math.max(y, NARROW_DOME * n));
  if (sp.crownRound !== undefined && sp.crownRound > ROUND) out.crownRound = ROUND + (sp.crownRound - ROUND) * (1 - flat);
  if (y > 0) {
    // (Its pads and plates fewer: an old open tree's shelves. A narrow one keeps them: a sheltered Monterey cypress's
    // pads are its kind's.)
    out.pads = fade(sp.pads, YOUNG_PADS * y);
    if (sp.crownPeak !== undefined) out.crownPeak = sp.crownPeak + (YOUNG_PEAK - sp.crownPeak) * 0.5 * y;
    out.leader = sp.leader + (1 - sp.leader) * YOUNG_LEADER * y;
    // (Its old limbs not yet grown: a forked trunk, a stone pine's V-forks, are an older tree's.)
    if (sp.fork !== undefined || sp.forkShare !== undefined) out.forkShare = (sp.forkShare ?? (sp.fork !== undefined && sp.forkStems !== undefined ? 1 : 0)) * (1 - y);
    out.canopyLift = fade(sp.canopyLift, y);
    out.clusters = fade(sp.clusters, YOUNG_CLUSTERS * y);
  }
  // (Fields left out stay left out: a copy with `undefined` written in is the same row to the grower.)
  for (const k of Object.keys(out) as (keyof TreeSpecies)[]) if (out[k] === undefined) delete out[k];
  return out;
}
