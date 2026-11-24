// The realistic look's photographs: scanned bark and leaves (assets/, made by tools/scans from CC0 scans, or
// from generated pictures where no scan exists; assets/SOURCES.md says which), which species wears which,
// and loading them.
//
// A species' bark is a set (a tile of bark, its colour and its relief) laid round its wood at its real size,
// or two, one giving way to the other up the stem (a Scots pine's grey plates to its orange flakes, a birch's
// black foot to its white). Its leaves are a sheet of single leaves, each laid on the species' own twigs at
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
   * the other, raggedly, in tongues up and down the furrows.
   */
  upper?: { set: string; from: number; to: number; scale?: number };
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
}

/** The photographs each of the library's species wears, by name. */
export const SCAN_LOOKS: Readonly<Record<string, ScanLook>> = {
  Oak: { bark: "oak", leaves: "oak", leafCm: 10, spray: "alternate" },
  Plane: { bark: "plane", leaves: "maple", leafCm: 18, spray: "alternate" },
  Eucalyptus: { bark: "eucalyptus", leaves: "eucalyptus", leafCm: 22, spray: "hanging", leafBend: 0.03, hang: 0.85, perSpray: 10 },
  Spruce: { bark: "spruce", leaves: "fir", leafCm: 30, spray: "sprays" },
  "Scots pine": { bark: "pine", upper: { set: "pineFlakes", from: 0.3, to: 0.55, scale: 0.6 }, leaves: "pine", leafCm: 28, spray: "tufts" },
  Shrub: { bark: "ridged", barkScale: 0.4, leaves: "elliptic", leafCm: 5, spray: "alternate" },
  Beech: { bark: "beech", leaves: "beech", leafCm: 8, spray: "alternate" },
  "Silver birch": { bark: "oak", barkScale: 0.6, barkFoot: "#2f2c29", upper: { set: "birch", from: 0.02, to: 0.09 }, leaves: "deltoid", leafCm: 5, spray: "weeping", hang: 0.7 },
  "Black alder": { bark: "oak", barkScale: 0.7, leaves: "round", leafCm: 8, spray: "alternate" },
  "Lombardy poplar": { bark: "ridged", barkScale: 0.8, leaves: "deltoid", leafCm: 8, spray: "alternate" },
  "Weeping willow": { bark: "ridged", leaves: "lance", leafCm: 10, spray: "weeping", leafWidth: 0.75, hang: 0.95 },
  Hawthorn: { bark: "oak", barkScale: 0.45, leaves: "oak", leafCm: 4, spray: "alternate", perSpray: 14 },
  Gorse: { bark: "ridged", barkScale: 0.35, leaves: "pine", leafCm: 12, spray: "tufts" },
  "Sitka spruce": { bark: "spruce", barkScale: 1.6, leaves: "fir", leafCm: 30, spray: "sprays" },
  "Corsican pine": { bark: "pine", barkScale: 1.2, leaves: "pine", leafCm: 32, spray: "tufts" },
  "Douglas fir": { bark: "douglas", barkScale: 1.4, leaves: "fir", leafCm: 30, spray: "sprays" },
  "Western red cedar": { bark: "fibrous", leaves: "scale", leafCm: 30, spray: "sprays", hang: 0.4 },
  "Monterey cypress": { bark: "fibrous", barkScale: 0.8, leaves: "scale", leafCm: 28, spray: "sprays" },
  "Monterey pine": { bark: "pine", leaves: "pine", leafCm: 34, spray: "tufts" },
  "Torrey pine": { bark: "pine", barkScale: 1.1, leaves: "pine", leafCm: 42, spray: "tufts" },
  "Aleppo pine": { bark: "pine", barkScale: 0.9, leaves: "pine", leafCm: 26, spray: "tufts" },
  "Stone pine": { bark: "pine", barkScale: 1.4, leaves: "pine", leafCm: 32, spray: "tufts" },
  "Canary date palm": { bark: "palmLattice", leaves: "frond", leafCm: 450, spray: "whole" },
  "Mexican fan palm": { bark: "palmRings", leaves: "blade", leafCm: 60, spray: "fan" },
  "California fan palm": { bark: "palmRings", barkScale: 1.3, leaves: "blade", leafCm: 70, spray: "fan" },
  "Queen palm": { bark: "palmRings", barkScale: 0.75, leaves: "frond", leafCm: 400, spray: "whole" },
  "Coast live oak": { bark: "oak", barkScale: 0.9, leaves: "elliptic", leafCm: 5, spray: "alternate", perSpray: 12 },
  "California sycamore": { bark: "ridged", barkScale: 0.6, barkFoot: "#5e5348", upper: { set: "plane", from: 0.04, to: 0.16 }, leaves: "maple", leafCm: 20, spray: "alternate" },
  "Sugar maple": { bark: "ridged", barkScale: 0.8, leaves: "maple", leafCm: 12, spray: "opposite" },
  "Red oak": { bark: "ridged", barkScale: 0.9, leaves: "redOak", leafCm: 17, spray: "alternate" },
  "Eastern white pine": { bark: "pine", barkScale: 0.8, leaves: "pine", leafCm: 26, spray: "tufts" },
  "White spruce": { bark: "spruce", barkScale: 0.9, leaves: "fir", leafCm: 26, spray: "sprays" },
};

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

function urlOf(kind: "bark" | "leaves", id: string, map: "albedo" | "normal"): string {
  if (assetBase !== null) return `${assetBase.replace(/\/?$/, "/")}${kind}/${id}.${map}.avif`;
  // (Written out whole, so a bundler sees each folder and copies its pictures.)
  return kind === "bark" ? new URL(`../assets/bark/${id}.${map}.avif`, import.meta.url).href : new URL(`../assets/leaves/${id}.${map}.avif`, import.meta.url).href;
}

const loaded = new Map<string, Promise<Pixels>>();

/** A picture's texels, as they are in the file: RGBA8, no colour conversion, alpha not multiplied in. */
async function decode(url: string, size?: number): Promise<Pixels> {
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
