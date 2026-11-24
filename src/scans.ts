// The realistic look's photographs: scanned bark and leaves (assets/, made by tools/scans from CC0 scans, or
// from generated pictures where no scan exists; assets/SOURCES.md says which), which species wears which,
// and loading them.
//
// A species' bark is a set (a tile of bark, its colour and its relief) laid round its wood at its real size,
// or two, one giving way to the other up the stem (a Scots pine's grey plates to its copper flakes, a blue
// gum's rough stocking to its smooth streaks, a birch's black foot to its white). Its leaves are a sheet of single leaves, each laid on the species' own twigs at
// its own size (sprays.ts). Which a species wears is looked up by its name here (a host may give its own:
// `TreesOptions.scans.looks`), and failing that by its kind of leaf.
//
// The pictures are fetched once a page, whichever trees ask first, and kept: the trees are drawn as they
// were (arithmetic bark, drawn sprays) until they come.

import manifest from "../assets/scans.json" with { type: "json" };
import { type Pixels } from "./mips.ts";
import { type TreeSpecies } from "./species.ts";

/** What assets/scans.json says of one bark set. */
export interface BarkSet {
  id: string;
  layer: number;
  /** How much bark one tile covers: across the stem, along it (cm). */
  tileCm: [number, number];
  /** Its mean colour, linear. */
  meanLinear: [number, number, number];
  origin?: "scan" | "generated";
}

/** One leaf on a sheet: its box (texels from the sheet's top left), its stalk's end and tip, its length over its set's longest. */
export interface LeafSprite {
  x: number;
  y: number;
  w: number;
  h: number;
  base: [number, number];
  tip: [number, number];
  size: number;
}

/** What assets/scans.json says of one leaf sheet. */
export interface LeafSet {
  id: string;
  size: [number, number];
  /** How long its longest leaf is, stalk to tip, on the tree it came from (cm). */
  lengthCm: number;
  tone: boolean;
  meanLinear: [number, number, number];
  sprites: LeafSprite[];
  origin?: "scan" | "generated";
}

const M = manifest as unknown as { bark: { size: number; sets: BarkSet[] }; leaves: { sets: LeafSet[] } };
export const BARK_SETS: readonly BarkSet[] = M.bark.sets;
export const LEAF_SETS: readonly LeafSet[] = M.leaves.sets;
export const BARK_SIZE = M.bark.size;
export const barkSet = (id: string): BarkSet | undefined => BARK_SETS.find((b) => b.id === id);
export const leafSet = (id: string): LeafSet | undefined => LEAF_SETS.find((l) => l.id === id);

/** How a species' twigs carry its leaves, as sprays.ts lays them. */
export type SprayKind =
  /** Broad or small leaves, one at a node, to either side in turn, a cluster at the shoot's tip. */
  | "alternate"
  /** Leaves in pairs at each node (a maple's). */
  | "opposite"
  /** A few long leaves hanging from the twig's end (a eucalyptus's adult leaves, sickle-curved). */
  | "hanging"
  /** A long hanging shoot with narrow leaves all along it (a weeping willow's, a birch's drooping twigs). */
  | "weeping"
  /** Whole scanned sprays (a fir's, a cedar's): the picture is already a twig with its needles or scales. */
  | "sprays"
  /** Whole scanned shoots ending in a brush of needles (a pine's). */
  | "tufts"
  /** A palm's feather-shaped leaf: leaflets along a rachis. */
  | "pinnate"
  /** A palm's fan: segments from the petiole's end. */
  | "fan"
  /** The sheet's picture is the whole leaf (a palm's frond): one to a card. */
  | "whole";

/** The realistic look's photographs for a species. */
export interface ScanLook {
  /** Its bark: the set (assets/scans.json) and how much bigger or smaller its pattern is than the scan's (1). */
  bark: string;
  barkScale?: number;
  /** Its colour at its foot, where not the species' bark colour (a birch's black foot). */
  barkFoot?: string;
  /**
   * The bark it takes on up the stem: from `from` to `to` (shares of the tree's height) the one gives way to
   * the other, raggedly, in tongues up and down the furrows; and its colour (sRGB), where not the species' bark
   * colour paled up the trunk (a Scots pine's copper flakes over its grey-brown plates).
   */
  upper?: { set: string; from: number; to: number; scale?: number; color?: string };
  /** Its leaves: the sheet, and how long one is on this species, stalk to tip (cm). */
  leaves: string;
  leafCm: number;
  spray: SprayKind;
  /** How narrow its leaves are beside the scan's (1: as scanned; under 1 narrower). */
  leafWidth?: number;
  /** How far its leaves curve to one side, a share of their length (a eucalyptus's sickle). */
  leafBend?: number;
  /** How far its near sprays hang down, 0..1 (a eucalyptus's, a willow's, a birch's). */
  hang?: number;
  /** How many leaves a near spray carries, about (else as its kind does). */
  perSpray?: number;
  /** A pine's needles, how long (cm): its tufts are as big (else a share of `leafCm`, `sprays.ts` `needleOf`). */
  needleCm?: number;
  /**
   * How long a pine's brush of needles is along its shoot's end, in its needles' lengths (else `TUFT_STRETCH`,
   * a starburst at the tip): a pine keeps its needles two to four years, so a dense one's shoots are clothed
   * along their last years' growth, bottle brushes standing side by side (a stone pine's, a Monterey pine's).
   */
  brush?: number;
  /**
   * A pine's cushions (a leaf set of whole pictures, assets/scans.json): its foliage as it is seen from a little
   * way off, each picture one dense cushion or clump seen from the side, its flat base down, its own light and
   * shade (its sunlit top yellow-green, its underside near black). Laid one to a big card (sprays.ts
   * `drawCushionCard`), which stands upright and turns to the eye about the vertical, so its flat base stays
   * flat: the canopy's cushions as game foliage lays its cluster cards. Its near cards stay its own drawn tufts.
   * "drawn": no picture, its cushions drawn needle by needle (sprays.ts `drawnCushionCard`).
   */
  cushion?: string;
  /**
   * Pictures of a pine's canopy for its far cards (a mid tree's, a far dab's), where they differ from its
   * cushions: a strip of cushions side by side (a stone pine's wide flat crown), laid one to a card.
   */
  cushionFar?: string;
  /**
   * How thick its cushions are for their width, where they are pads thinner in their pictures (a Monterey cypress's
   * shelves, 1–2 m deep on old coastal trees): each picture laid in layers on its card until it is so thick
   * (sprays.ts `drawCushionCard`).
   */
  padThick?: number;
  /**
   * A pine whose leaf pictures are its whole shoots (a twig ending in its brush, an eastern white pine's soft fine
   * needles): its tufts laid from them, one to a shoot's end, and not drawn needle by needle (sprays.ts `needleTuft`).
   */
  tuftPicture?: boolean;
  /**
   * How long a shoot picture laid at a tuft is, in the pine's needles' lengths (`tuftPicture`; else `sprays.ts`
   * `TUFT_SHOOT`, 3: a white pine's 30 cm shoot of 8–12 cm needles). A Torrey pine's picture is mostly its brush, its
   * needles some two thirds of it.
   */
  tuftShoot?: number;
  /**
   * Where along a shoot picture its brush begins, a share of the way from its stalk's end (`tuftPicture`): the picture
   * laid from there on, its bare twig left to the card's own wood. And how many of it to lay at a tuft, fanned about the
   * brush's foot (`tuftFan`; else one): a long-needled pine's brush stands out all round its shoot's end.
   */
  tuftFrom?: number;
  tuftFan?: number;
  /**
   * How many cushion cards to a clump near to, and how big (half width over the clump's radius), where not as closed
   * as its crown is (engine.ts `closedOf`: four of two radii on a closed crown, one of 1.1 on an open one).
   */
  cushionCards?: number;
  cushionSize?: number;
  /**
   * The colour of its flowers (sRGB), where its leaf pictures show them (a gorse sprig's yellow pea flowers): the
   * cards keep where they are (sprays.ts `Layer.flower`), and the shader colours them so, as far as the style's
   * `bloom` says (0 out of flower: the flowers gone, its spines left).
   */
  flowers?: string;
  /**
   * When it flowers: the share of its sprays in flower through the year, as [day of the year, share] from January on,
   * eased between them and round from December to January (`bloomShare`). Without it, or with no day given, the
   * style's `bloom`.
   */
  flowering?: readonly (readonly [number, number])[];
}

/**
 * Common gorse's year (Ulex europaeus): in flower mainly from January to June, at its height in spring (March to
 * May), and with a few flowers on it most of the year besides ("when gorse is out of blossom, kissing's out of
 * fashion"), fewest in late summer and autumn (Clements, Peterson and Prasad 2001, The biology of Canadian weeds:
 * Ulex europaeus; Tarayre et al. 2007, flowering phenology of Ulex europaeus).
 */
export const GORSE_FLOWERING: readonly (readonly [number, number])[] = [
  [1, 0.3], // 1 January: out, here and there
  [32, 0.5], // 1 February
  [74, 0.85], // 15 March
  [110, 0.95], // 20 April: at its height
  [140, 0.8], // 20 May
  [171, 0.45], // 20 June
  [201, 0.15], // 20 July: going over
  [244, 0.08], // 1 September: a few flowers
  [305, 0.1], // 1 November
  [335, 0.18], // 1 December: coming out again
];

/** The year's length the flowering is laid round (days). */
const YEAR_DAYS = 365.25;

/**
 * How far in flower a species is, 0..1 (the share of its sprays in flower): on `day` (of the year, 1 on the 1st of
 * January), as its `flowering` says, eased between the days it names; with no day given, or no flowering of its own,
 * `bloom` (the style's).
 */
export function bloomShare(look: ScanLook, day: number | null, bloom: number): number {
  const year = look.flowering;
  if (day === null || !Number.isFinite(day) || !year || year.length === 0) return bloom;
  const d = (((day - 1) % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS + 1;
  for (let i = 0; i < year.length; i++) {
    const [d0, s0] = year[i];
    const [d1raw, s1] = year[(i + 1) % year.length];
    const d1 = i + 1 < year.length ? d1raw : d1raw + YEAR_DAYS;
    // (Past the last named day, or before the first: round the year from December to January.)
    const at = d < year[0][0] ? d + YEAR_DAYS : d;
    if (at >= d0 && at <= d1) {
      const f = (at - d0) / Math.max(d1 - d0, 1e-6);
      return s0 + (s1 - s0) * (0.5 - 0.5 * Math.cos(Math.PI * f));
    }
  }
  return year[year.length - 1][1];
}

/** The photographs each of the library's species wears, by name. */
export const SCAN_LOOKS: Readonly<Record<string, ScanLook>> = {
  Oak: { bark: "oak", leaves: "oak", leafCm: 10, spray: "alternate" },
  // (The plane's leaf on its long stalk: some 16 cm of blade.)
  Plane: { bark: "plane", leaves: "londonPlane", leafCm: 30, spray: "alternate" },
  // (Its rough stocking, a few metres, giving way to the smooth mottled stem.)
  // (Its adult leaves 12–30 by 1.7–3 cm (EUCLID): narrower than the picture's.)
  Eucalyptus: { bark: "eucalyptus", upper: { set: "eucalyptusUpper", from: 0.04, to: 0.12 }, leaves: "eucalyptus", leafCm: 22, spray: "hanging", leafWidth: 0.6, leafBend: 0.03, hang: 0.85, perSpray: 8 },
  Spruce: { bark: "spruce", leaves: "fir", leafCm: 30, spray: "sprays" },
  // (Its grey-brown plates giving way, from about a third of the way up, to copper-orange flakes: the plates
  // its own grey-brown, not the orange its species is known by from afar.)
  "Scots pine": { bark: "pine", barkFoot: "#6f5a4b", upper: { set: "pineFlakes", from: 0.25, to: 0.5, color: "#b4643c" }, leaves: "pine", leafCm: 28, spray: "tufts", needleCm: 6, brush: 1.6, cushion: "scotsPineClump" },
  Shrub: { bark: "ridged", barkScale: 0.4, leaves: "elliptic", leafCm: 5, spray: "alternate" },
  Beech: { bark: "beech", leaves: "beech", leafCm: 8, spray: "alternate" },
  // (Its own rugged blackish foot giving way to its white upper bark; its own leaves, 3–6 cm and a thin stalk.)
  "Silver birch": { bark: "birchFoot", barkFoot: "#2f2c29", upper: { set: "birch", from: 0.03, to: 0.12 }, leaves: "birch", leafCm: 6, spray: "weeping", hang: 0.7 },
  // (Its own leaves, almost round, 5–9 cm and a short stalk; its own dark bark of small squarish plates.)
  "Black alder": { bark: "alder", leaves: "alder", leafCm: 9, spray: "alternate" },
  // (Its own leaves, 5–8 cm on a long flattened stalk.)
  "Lombardy poplar": { bark: "poplar", leaves: "poplar", leafCm: 10, spray: "alternate" },
  // (Its own leaves, 8–15 cm and as narrow as they grow; its own netted bark.)
  "Weeping willow": { bark: "willow", leaves: "willow", leafCm: 12, spray: "weeping", hang: 0.95 },
  // (Its own deeply cut leaves, 3–5 cm with their stalk.)
  Hawthorn: { bark: "oak", barkScale: 0.45, leaves: "hawthorn", leafCm: 5, spray: "alternate", perSpray: 14 },
  // (Its own sprigs, spines and yellow flowers, whole: a twig's end of a few of them, the flowers kept yellow.)
  // (In flower mainly from January to June, a few flowers most of the year: `GORSE_FLOWERING`, for the host's day.)
  Gorse: { bark: "ridged", barkScale: 0.35, leaves: "gorse", leafCm: 22, spray: "sprays", flowers: "#f2c230", flowering: GORSE_FLOWERING },
  // (Its own bark of loose round scales, its own branch tips of stiff sharp blue-green needles.)
  "Sitka spruce": { bark: "sitkaSpruce", leaves: "sitkaShoot", leafCm: 28, spray: "sprays" },
  // (Its own bark of long scaly plates; its own shoots, a stout twig in a brush of long stiff needles in pairs, 10–15
  // cm: its tufts laid from them, `tuftPicture`, the picture some two needles long.)
  "Corsican pine": { bark: "corsicanPine", leaves: "corsicanShoot", leafCm: 32, spray: "tufts", needleCm: 12, tuftPicture: true, tuftShoot: 2.2 },
  // (Its own branch tips, soft flat needles all round the twig, a pointed bud.)
  "Douglas fir": { bark: "douglas", barkScale: 1.4, leaves: "douglasShoot", leafCm: 25, spray: "sprays" },
  "Western red cedar": { bark: "fibrous", leaves: "scale", leafCm: 30, spray: "sprays", hang: 0.4 },
  // (Its own bark of long fibrous strips, lichened.)
  "Monterey cypress": { bark: "cypress", leaves: "cypress", leafCm: 28, spray: "sprays", cushion: "cypressPad", padThick: 0.45, cushionSize: 2.8 },
  // (Its own very thick dark ridged bark, reddish in the furrows.)
  "Monterey pine": { bark: "montereyPine", leaves: "pine", leafCm: 34, spray: "tufts", needleCm: 12, brush: 1.8, cushion: "pineClumpDark", cushionCards: 1, cushionSize: 1.2 },
  // (Its shoot: a stout twig and a brush of needles 20–30 cm long, grey-green and stiff: its tufts laid from its own
  // shoot pictures, `tuftPicture`, the brush two thirds of the picture.)
  "Torrey pine": { bark: "torreyPine", leaves: "torreyPine", leafCm: 48, spray: "tufts", needleCm: 25, tuftPicture: true, tuftShoot: 1.6, tuftFrom: 0.3, tuftFan: 3 },
  // (Its own bark of broad flat plates.)
  "Aleppo pine": { bark: "aleppoPine", leaves: "pine", leafCm: 26, spray: "tufts", needleCm: 8, brush: 1.2, cushion: "pineClumpLight" },
  "Stone pine": { bark: "stonePine", barkScale: 1, leaves: "pine", leafCm: 32, spray: "tufts", needleCm: 14, brush: 2, cushion: "stonePineCushion", cushionFar: "stonePineCanopy" },
  "Canary date palm": { bark: "palmLattice", leaves: "frond", leafCm: 450, spray: "whole" },
  "Mexican fan palm": { bark: "palmRings", leaves: "blade", leafCm: 60, spray: "fan" },
  "California fan palm": { bark: "palmRings", barkScale: 1.3, leaves: "blade", leafCm: 70, spray: "fan" },
  "Queen palm": { bark: "palmRings", barkScale: 0.75, leaves: "frond", leafCm: 400, spray: "whole" },
  "Coast live oak": { bark: "liveOak", leaves: "liveOak", leafCm: 5, spray: "alternate", perSpray: 12 },
  "California sycamore": { bark: "ridged", barkScale: 0.6, barkFoot: "#5e5348", upper: { set: "plane", from: 0.05, to: 0.22 }, leaves: "sycamore", leafCm: 24, spray: "alternate" },
  "Sugar maple": { bark: "maple", leaves: "maple", leafCm: 12, spray: "opposite" },
  "Red oak": { bark: "redOak", leaves: "redOak", leafCm: 17, spray: "alternate" },
  // (Its own shoots, soft feathery brushes of fine needles 8–12 cm in fives: its tufts laid from them, `tuftPicture`.)
  "Eastern white pine": { bark: "whitePine", leaves: "whitePine", leafCm: 26, spray: "tufts", needleCm: 10, tuftPicture: true },
  // (Its own pale flaky scales; its own branch tips, short stiff needles crowded on the twig's upper side.)
  "White spruce": { bark: "whiteSpruce", leaves: "whiteSpruceShoot", leafCm: 22, spray: "sprays" },
};

/**
 * A look's upper bark colour packed in one number for the shaders (a float holds it exactly): its sRGB bytes,
 * red · 65536 + green · 256 + blue, plus 1; 0 where it has none.
 */
export function upperColorCode(look: ScanLook): number {
  const hex = look.upper?.color;
  if (!hex) return 0;
  if (!/^#?[0-9a-f]{6}$/i.test(hex)) throw new Error(`upper bark colour ${hex}: not #rrggbb`);
  return parseInt(hex.replace(/^#/, ""), 16) + 1;
}

/** A look's flower colour packed as an upper bark colour is (`upperColorCode`); 0 where it has none. */
export function flowerColorCode(look: ScanLook): number {
  return look.flowers ? upperColorCode({ ...look, upper: { set: "", from: 0, to: 0, color: look.flowers } }) : 0;
}

/** The sRGB colour (0..1) an upper bark colour code holds (as the shader reads it), or null for none. */
export function upperColorOf(code: number): [number, number, number] | null {
  if (code < 0.5) return null;
  const v = code - 1;
  const r = Math.floor(v / 65536);
  const g = Math.floor((v - r * 65536) / 256);
  return [r / 255, g / 255, (v - r * 65536 - g * 256) / 255];
}

/** What a species with no look of its own here wears: by its kind of leaf. */
const BY_KIND: Readonly<Record<TreeSpecies["leafKind"], ScanLook>> = {
  broad: SCAN_LOOKS.Oak,
  narrow: SCAN_LOOKS["Weeping willow"],
  needle: SCAN_LOOKS.Spruce,
  small: SCAN_LOOKS.Shrub,
  frond: SCAN_LOOKS["Canary date palm"],
  pine: SCAN_LOOKS["Scots pine"],
};

/**
 * The photographs a species wears: a host's (`looks`, by the species' name) over its name's here, else its kind
 * of leaf's.
 */
export function scanLookOf(s: TreeSpecies, looks?: Readonly<Record<string, Partial<ScanLook>>>): ScanLook {
  const own = looks?.[s.name];
  const base = SCAN_LOOKS[s.name] ?? BY_KIND[s.leafKind] ?? SCAN_LOOKS.Oak;
  return own ? { ...base, ...own } : base;
}

/** How far a species' near cards reach from their middle (m): a twig's end, a few shoots with their leaves. */
export function nearCardHalf(look: ScanLook): number {
  const leaf = look.leafCm / 100;
  if (look.spray === "pinnate") return 0;
  // (A fan palm's leaf, whole, a card: about its own width.)
  if (look.spray === "fan") return Math.min(1, leaf * 1.25);
  // (A palm's frond, a stretch of it a card, a couple of metres: the picture holds no finer.)
  if (look.spray === "whole") return Math.min(1.1, leaf * 0.25);
  // (A twig's end of several shoots: some five leaves long for broad leaves, a few shoots' length for needles.)
  if (look.spray === "sprays" || look.spray === "tufts") return Math.min(0.45, Math.max(0.2, leaf * 1.4));
  if (look.spray === "hanging") return Math.min(0.45, Math.max(0.2, leaf * 1.6));
  if (look.spray === "weeping") return Math.min(0.45, Math.max(0.2, leaf * 2.2));
  return Math.min(0.45, Math.max(0.2, leaf * 2.5));
}

// ---------------------------------------------------------------------------------------------------------------------
// Loading.

/** Where the pictures are: beside this module in the package (assets/), unless a host says. */
let assetBase: string | null = null;
/**
 * Fetch the photographs from `base` (a folder holding bark/ and leaves/, as assets/ does) instead of from
 * beside the package: for a host whose bundler moves the package's modules away from its files.
 */
export function setScanBase(base: string | null): void {
  assetBase = base;
}

/** A file of assets/ at `path` there: from where `setScanBase` says, if it was set, else `here` (its URL beside the package). */
export function assetUrl(path: string, here: string): string {
  return assetBase !== null ? `${assetBase.replace(/\/?$/, "/")}${path}` : here;
}

function urlOf(kind: "bark" | "leaves", id: string, map: "albedo" | "normal"): string {
  if (assetBase !== null) return `${assetBase.replace(/\/?$/, "/")}${kind}/${id}.${map}.avif`;
  // (Written out whole, so a bundler sees each folder and copies its pictures.)
  return kind === "bark" ? new URL(`../assets/bark/${id}.${map}.avif`, import.meta.url).href : new URL(`../assets/leaves/${id}.${map}.avif`, import.meta.url).href;
}

const loaded = new Map<string, Promise<Pixels>>();

/** A picture's texels, as they are in the file: RGBA8, no colour conversion, alpha not multiplied in. */
export async function decode(url: string, size?: number): Promise<Pixels> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none", ...(size ? { resizeWidth: size, resizeHeight: size, resizeQuality: "high" as const } : {}) });
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
  ctx.drawImage(bmp, 0, 0);
  const img = ctx.getImageData(0, 0, bmp.width, bmp.height);
  bmp.close();
  return { data: new Uint8Array(img.data.buffer), width: img.width, height: img.height };
}

function picture(kind: "bark" | "leaves", id: string, map: "albedo" | "normal", size?: number): Promise<Pixels> {
  const key = `${kind}/${id}.${map}@${size ?? 0}`;
  let p = loaded.get(key);
  if (!p) {
    p = decode(urlOf(kind, id, map), size);
    loaded.set(key, p);
    p.catch(() => loaded.delete(key));
  }
  return p;
}

/** A bark set's colour (roughness in alpha) and relief (normal x, y, height), `size` texels square. */
export async function loadBark(id: string, size = BARK_SIZE): Promise<{ albedo: Pixels; normal: Pixels }> {
  const s = size === BARK_SIZE ? undefined : size;
  const [albedo, normal] = await Promise.all([picture("bark", id, "albedo", s), picture("bark", id, "normal", s)]);
  return { albedo, normal };
}

/** A leaf sheet's colour (coverage in alpha) and surface (normal x, y, light let through). */
export async function loadLeaves(id: string): Promise<{ albedo: Pixels; normal: Pixels }> {
  const [albedo, normal] = await Promise.all([picture("leaves", id, "albedo"), picture("leaves", id, "normal")]);
  return { albedo, normal };
}
