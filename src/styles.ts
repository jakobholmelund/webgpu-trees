// How the trees are drawn, apart from what they are: a style is a row of
// numbers, read each frame, and a look is the set of pieces a style draws
// with (dabs of paint, clusters of leaves, soft lobes, leaf cards), chosen
// when the trees are made. Each look starts from its own style; any style's
// numbers can be changed while the trees stand.
//
// Plain data and arithmetic, no three: the tests read it as it is.

/** How the trees are drawn, apart from what they are. Change it at any time: it is read each frame. */
export interface TreeStyle {
  /** How far a crown's light is laid in flat bands, as paint is, 0 (smooth) to 1 (bands only). */
  steps: number;
  /** How many bands of light, from shade to sun. */
  bands: number;
  /** How round each clump of leaves is lit, 0 (as the crown's outside faces) to 1 (each clump a ball of its own). */
  round: number;
  /** How much one dab differs in tone from the next (and, in a cluster of leaves, one leaf from the next), 0..1. */
  jitter: number;
  /** How big the dabs are, beside what covers their clump: 1 as grown. */
  dabScale: number;
  /** How much sunlight comes through the leaves to an eye looking towards the sun, 0..1. */
  through: number;
  /**
   * How tightly the light through the leaves gathers about the sun, as the eye looks towards it: the power
   * of Barré-Brisebois's view term (GDC 2011). Low, a crown glows from wide of the sun; high, only round it.
   */
  throughPower: number;
  /** How far a leaf's facing bends the light through it, 0..1 (the model's distortion): more, the glow follows the crown's form. */
  throughWarp: number;
  /**
   * How much the light through the leaves varies, 0..1: by how deep in the crown a clump is, how much sun
   * reaches it there (Monsi and Saeki), and leaf by leaf (each its own thickness). 0, every backlit leaf
   * glows the same lime green.
   */
  throughVary: number;
  /** How far the light wraps round past the side of a clump facing away from the sun, 0..1. */
  wrap: number;
  /** How strongly the brush's strokes (or each leaf's own tone in a cluster) show in a dab, 0..1. */
  strokes: number;
  /**
   * How far a crown shades itself, 0..1: 1, as much as the light lost through its leaves makes it (Monsi and
   * Saeki); 0, not at all, every leaf facing the sun as lit as the crown's outside. A painter keeps less of it
   * than there is.
   */
  selfShade: number;
  /** How square to the sun a leaf must face to take all of it: 0.65 lights a form as a painter does, 1 as the sun does. */
  fullLight: number;
  /** How furrowed the bark is, 0 (smooth, a painted trunk) to 1. */
  bark: number;
  /**
   * How much moss the wood carries, 0..1: on what faces up, in the grooves between a trunk's buttresses,
   * low on the trunk and on its side away from the sun.
   */
  moss: number;
  /** How far a realistic tree's near leaf cards turn towards the eye, 0..1: none at all shows some edge-on as slivers. */
  faceEye: number;
  /**
   * How far a crown is lit as a few big masses, 0..1: each of its lobes (its clumps gathered into a handful,
   * `lobes.ts`) shaded as a ball seen from the eye, pixel by pixel, so the light runs smoothly across all the
   * dabs of a lobe. 0: each dab lit as one stroke, as the crown's outside faces where it is.
   */
  lobe: number;
  /** How far each dab is lit as a small ball of its own, pixel by pixel, over its lobe, 0..1 (the sculpted look's bubbles). */
  bulge: number;
  /** How far the light on the leaves turns warm, towards a yellow-green, 0..1 (the sun's own tint stays the host's). */
  warm: number;
  /** How far the shade turns cool, towards a teal blue-green, 0..1 (over the host's shade tint). */
  cool: number;
  /** How saturated the leaves' colour is beside the species', 0 (grey) to 2: 1 as the species has it. */
  chroma: number;
  /** How bright the rim of a lobe is against the light, 0..1: light through its thin edge, and the sky behind it. */
  rim: number;
  /** In a look whose marks have them (sculpted), the share of a near crown's dabs drawn as sprigs of leaves, 0..1. */
  sprigs: number;
  /** How bright the sunlit side of a crown is beside its shade, 1 as the sun gives it: a painter's light is brighter. */
  bright: number;
  /**
   * The painterly look: how long a broad leaf is at most, in metres (other kinds keep to theirs beside it, a
   * palm's fronds far longer). A dab whose leaves would be longer carries smaller ones, more of them.
   */
  leafSize: number;
}

/**
 * How the trees are drawn, chosen when they are made (the pieces differ, not only the light):
 * - `stylized`: crowns laid in dabs of paint, lit in bands (the painted look);
 * - `painterly`: crowns of small, crisp clusters of leaves, the light laid over them as a few big soft masses,
 *   warm where lit and cool in shade;
 * - `sculpted`: crowns as soft clay lobes, a few sprigs of leaves on them;
 * - `real`: near crowns of leaf cards set in the crown, each a spray of the species' leaves, and far ones of
 *   the same sprays.
 */
export type TreeLook = "stylized" | "painterly" | "sculpted" | "real";

export const TREE_LOOKS: readonly TreeLook[] = ["stylized", "painterly", "sculpted", "real"];

/** The painted look's style (and every look's, for the numbers it does not use). */
export const DEFAULT_STYLE: TreeStyle = { steps: 0.75, bands: 3, round: 0.45, jitter: 0.35, dabScale: 1, through: 0.5, throughPower: 4, throughWarp: 0.1, throughVary: 0.4, moss: 0.25, wrap: 0.35, strokes: 0.6, selfShade: 0.5, fullLight: 0.65, bark: 0, faceEye: 0.35, lobe: 0, bulge: 0, warm: 0, cool: 0, chroma: 1, rim: 0, sprigs: 0, bright: 1, leafSize: 0.22 };

/** The realistic look's style: light as the sun gives it, the crown's shade, light through the leaves, furrowed bark. */
// (selfShade a half, as the painted look's: the crown's own shade taken in full, through a whole leafy
// shell, leaves out the light the leaves scatter to one another, and a sunlit crown comes out dark.)
export const REAL_STYLE: TreeStyle = { ...DEFAULT_STYLE, steps: 0, bands: 3, round: 0.3, jitter: 0.15, dabScale: 1, through: 0.9, throughPower: 3.5, throughWarp: 0.2, throughVary: 0.8, moss: 0.55, wrap: 0.3, strokes: 1, selfShade: 0.45, fullLight: 0.9, bark: 1, faceEye: 0.35 };

/**
 * The painterly look's style, after the painted crowns of stylized games: smooth light laid over big lobes
 * (no bands), wrapping well round them, a cluster's leaves each a little their own tone, the lit side warm
 * and the shade cool, the colour a step richer than the species', a bright rim against the sun.
 */
export const PAINTERLY_STYLE: TreeStyle = { ...DEFAULT_STYLE, steps: 0, bands: 4, round: 0.15, jitter: 0.4, dabScale: 1.4, through: 0.7, throughPower: 3, throughWarp: 0.12, throughVary: 0.65, moss: 0.45, wrap: 0.5, strokes: 0.55, selfShade: 0.2, fullLight: 0.7, bark: 0, lobe: 0.8, bulge: 0.1, warm: 0.6, cool: 0.6, chroma: 1.35, rim: 0.6, sprigs: 0, bright: 1.7 };

/** The sculpted look's style: clay lobes, lit smooth and soft, each dab a little ball on its lobe, a few sprigs. */
export const SCULPTED_STYLE: TreeStyle = { ...DEFAULT_STYLE, steps: 0, bands: 4, round: 0, jitter: 0.08, dabScale: 1.5, through: 0.3, throughPower: 3, throughWarp: 0.2, throughVary: 0.4, moss: 0.35, wrap: 0.35, strokes: 0.25, selfShade: 0.25, fullLight: 0.8, bark: 0, lobe: 0.85, bulge: 0.45, warm: 0.45, cool: 0.5, chroma: 1.25, rim: 0.25, sprigs: 0.14, bright: 1.5 };

/** Each look's own style, which `trees.style` starts as. */
export const LOOK_STYLES: Readonly<Record<TreeLook, TreeStyle>> = { stylized: DEFAULT_STYLE, painterly: PAINTERLY_STYLE, sculpted: SCULPTED_STYLE, real: REAL_STYLE };

/** The range each of a style's numbers keeps to (and the step a slider takes over it). */
export const STYLE_RANGES: Readonly<Record<keyof TreeStyle, { min: number; max: number; step: number }>> = {
  steps: { min: 0, max: 1, step: 0.01 },
  bands: { min: 1, max: 8, step: 1 },
  round: { min: 0, max: 1, step: 0.01 },
  jitter: { min: 0, max: 1, step: 0.01 },
  dabScale: { min: 0.25, max: 2.5, step: 0.01 },
  through: { min: 0, max: 1, step: 0.01 },
  throughPower: { min: 1, max: 16, step: 0.1 },
  throughWarp: { min: 0, max: 1, step: 0.01 },
  throughVary: { min: 0, max: 1, step: 0.01 },
  wrap: { min: 0, max: 1, step: 0.01 },
  strokes: { min: 0, max: 1, step: 0.01 },
  selfShade: { min: 0, max: 1, step: 0.01 },
  fullLight: { min: 0.2, max: 1, step: 0.01 },
  bark: { min: 0, max: 1, step: 0.01 },
  moss: { min: 0, max: 1, step: 0.01 },
  faceEye: { min: 0, max: 1, step: 0.01 },
  lobe: { min: 0, max: 1, step: 0.01 },
  bulge: { min: 0, max: 1, step: 0.01 },
  warm: { min: 0, max: 1, step: 0.01 },
  cool: { min: 0, max: 1, step: 0.01 },
  chroma: { min: 0, max: 2, step: 0.01 },
  rim: { min: 0, max: 1, step: 0.01 },
  sprigs: { min: 0, max: 0.5, step: 0.01 },
  bright: { min: 0.5, max: 2.5, step: 0.01 },
  leafSize: { min: 0.05, max: 1.5, step: 0.01 },
};

/** What is wrong with a style: every number there, finite, and in its range. Empty if nothing. */
export function checkStyle(style: TreeStyle): string[] {
  const out: string[] = [];
  for (const [key, r] of Object.entries(STYLE_RANGES) as [keyof TreeStyle, { min: number; max: number }][]) {
    const v = style[key];
    if (typeof v !== "number" || !Number.isFinite(v)) out.push(`${key} is not a number`);
    else if (v < r.min || v > r.max) out.push(`${key} ${v} is outside ${r.min}..${r.max}`);
  }
  return out;
}

/**
 * How a look's crown is gathered into lobes, the masses its light is laid over: a lobe is about `share` of
 * the crown's mean radius round, and a crown has `least` to `most` of them.
 */
export const LOOK_LOBES: Readonly<Record<TreeLook, { share: number; least: number; most: number }>> = {
  stylized: { share: 0.5, least: 2, most: 24 },
  painterly: { share: 0.52, least: 2, most: 20 },
  sculpted: { share: 0.4, least: 3, most: 32 },
  real: { share: 0.5, least: 2, most: 24 },
};
