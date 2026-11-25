// The sizes a course gives its trees: the game fits each tree to its survey (lidar: height, crown radius, crown
// base), and most course trees are far smaller or narrower than their species' specimen. The gallery's fitted
// mode (`?fitted=1`) draws each species at these sizes, beside its specimen and its reference pictures, so a
// tree is judged as the game draws it and not only as its specimen. (Each is grown at its own size here; in the
// game a tree is a variant fitted to it, never stretched more than variants.ts `FIT_STRETCH` from its own shape.)
//
// Measured in the game on 2026-11-25 (library a66c411), on the first hole of three courses (Riviera's on all its
// holes, the same day): the 10th, 50th and 90th percentiles of each number, taken apart (so p10's height, radius
// and base are each the 10th of their own, not one tree's). A species on none of them gets a young, a typical and
// an old tree from its specimen's numbers.

import type { Stand, TreeSpecies } from "../src/index";

/** p10, p50, p90. */
type Spread = [number, number, number];

interface CourseRow {
  n: number;
  h: Spread;
  r: Spread;
  base: Spread;
}

/** A course's first hole, as measured: by species name. */
interface Course {
  id: string;
  name: string;
  /** Its trees stand in woods (Walton Heath's heath woods): drawn at a wood's edge, as seen from the fairway. */
  woods?: string[];
  by: Record<string, CourseRow>;
  /**
   * Species drawn at the corners of the course's spread too (`cornersOf`): its percentiles are each taken
   * apart, so a tree may be tall on a narrow crown, or tall with a low base or a high one, short on a wide
   * crown, or a shallow lid, and each must still look like its kind. (Riviera's, where the owner found five
   * misshapen trees on 2026-11-25: a cypress's pads floating over bare spikes, a blue gum's thin lid and its
   * mop on a pole, a sycamore's lollipop, a deep narrow stone pine's stacked cushions.)
   */
  corners?: string[];
}

export const COURSES: readonly Course[] = [
  {
    id: "c01",
    name: "Riviera",
    // (All 18 holes, measured 2026-11-25: `node scripts/tree-mix.mjs c01 --holes all --shapes` in worldgolf.)
    by: {
      Eucalyptus: { n: 5820, h: [4.7, 10.4, 26.2], r: [1, 3, 5.3], base: [2, 4.7, 13.5] },
      "California sycamore": { n: 2019, h: [4, 9.3, 22.6], r: [1.3, 3.3, 5.5], base: [1.9, 4, 9.5] },
      "Coast live oak": { n: 2028, h: [3.8, 8.5, 20.9], r: [1.4, 3.3, 5.4], base: [1.9, 3.5, 9] },
      "Stone pine": { n: 3322, h: [4, 8.8, 22.5], r: [1.4, 3.3, 5.3], base: [2, 4, 10] },
      "Monterey cypress": { n: 882, h: [3.8, 8.8, 17.4], r: [1.5, 3.4, 5.1], base: [1.7, 3.5, 7.5] },
      "Mexican fan palm": { n: 263, h: [4.9, 12.6, 27.2], r: [1.2, 2.9, 5.1], base: [2, 5.6, 15] },
      "Canary date palm": { n: 335, h: [4.4, 8.6, 26.9], r: [1.4, 3.2, 5.6], base: [2, 4, 10.5] },
      Shrub: { n: 4686, h: [1.3, 2.1, 2.7], r: [0.6, 1.2, 1.5], base: [0.1, 0.1, 0.1] },
    },
    corners: ["Eucalyptus", "California sycamore", "Coast live oak", "Stone pine", "Monterey cypress"],
  },
  {
    id: "c03",
    name: "Torrey Pines",
    by: {
      "Canary date palm": { n: 30, h: [4, 7.4, 15.1], r: [2.3, 3.3, 5.6], base: [1.3, 3.5, 7.5] },
      "Torrey pine": { n: 179, h: [3.4, 4.8, 14.1], r: [1.9, 2.9, 5.2], base: [0.8, 2, 6] },
      Eucalyptus: { n: 376, h: [4.4, 12.3, 17.8], r: [1.9, 3.6, 5.6], base: [1, 4.6, 9.5] },
      "Coast live oak": { n: 3, h: [3.3, 4, 4], r: [2.2, 2.6, 2.6], base: [0.7, 0.8, 0.8] },
      "Mexican fan palm": { n: 42, h: [6.7, 13.2, 19.8], r: [1, 2.3, 4.2], base: [3.6, 6.5, 12] },
      "Monterey cypress": { n: 2, h: [4.1, 4.1, 4.1], r: [2.3, 2.3, 2.3], base: [1, 1, 1] },
      Shrub: { n: 539, h: [1.2, 1.8, 2.7], r: [0.6, 0.9, 1.4], base: [0.1, 0.1, 0.1] },
    },
  },
  {
    id: "c05",
    name: "Walton Heath",
    woods: ["Scots pine", "Silver birch"],
    by: {
      "Scots pine": { n: 357, h: [13.7, 15.9, 18.2], r: [2.4, 3.9, 4.8], base: [4.2, 7.5, 10.3] },
      "Silver birch": { n: 316, h: [13.4, 15.6, 18], r: [2.8, 4.1, 4.9], base: [3.6, 5.8, 9.1] },
      Oak: { n: 11, h: [3.9, 11.1, 16.2], r: [2.8, 4.2, 5.3], base: [1.2, 2.5, 5.3] },
      Hawthorn: { n: 23, h: [1, 2.6, 2.8], r: [0.6, 0.6, 1.3], base: [0.1, 0.1, 0.1] },
      Gorse: { n: 56, h: [0.7, 1.4, 2.8], r: [0.6, 0.8, 1.3], base: [0.1, 0.1, 0.1] },
    },
  },
];

/** Single trees seen in the game, worth a row of their own (the owner's, by eye). */
const SEEN: Record<string, { label: string; note: string; height: number; crownRadius: number; crownBase: number }[]> = {
  "Stone pine": [{ label: "Riviera, seen", note: "a stone pine the owner saw grown as a layer cake (its base not measured: p90's)", height: 12, crownRadius: 5.9, crownBase: 5.5 }],
  // (A tall palm the survey hands over: the owner's giant carrot of boots was a 27 m fan palm on Riviera.)
  "Mexican fan palm": [{ label: "27 m", note: "a 27 m palm, its head Riviera's p50 (r 2.9) from 22 m", height: 27, crownRadius: 2.9, crownBase: 22 }],
  "Canary date palm": [{ label: "27 m", note: "a 27 m palm, its head Riviera's p50 (r 3.2) from 21 m", height: 27, crownRadius: 3.2, crownBase: 21 }],
  "California fan palm": [
    { label: "Riviera's p50", note: "at the Mexican fan palm's Riviera p50: 12.6 m tall, r 2.9, base 5.6", height: 12.6, crownRadius: 2.9, crownBase: 5.6 },
    { label: "27 m", note: "a 27 m palm, its head r 2.9 from 22 m", height: 27, crownRadius: 2.9, crownBase: 22 },
  ],
};

/**
 * The trunk's radius the game's survey hands over with a tree: 3 % of its height, to 0.6 m at the most (it is
 * not measured), so a fitted palm is drawn with the trunk the game gives it.
 */
export const surveyTrunk = (height: number): number => Math.min(0.6, 0.03 * height);

/** A size the gallery draws a species at, with what it is. */
export interface FitSize {
  /** Unique within its species: part of a cell's key. */
  key: string;
  label: string;
  note: string;
  height: number;
  crownRadius: number;
  crownBase: number;
  /** Drawn standing at a wood's edge, its open side to the eye (+z), when given. */
  stand?: Partial<Stand>;
}

/** A wood's edge, open towards the eye (+z): its back half closed, as a straight edge's front row is. */
export const EDGE_TO_EYE: Partial<Stand> = { enclosure: 0.5, lopsided: 0.64, openX: 0, openZ: 1, canopy: 1, gap: 0.3 };

const PCT = ["p10", "p50", "p90"] as const;
const f1 = (v: number) => (Math.round(v * 10) / 10).toString();

/** The sizes a species is drawn at in the fitted mode, smallest first within each course. */
export function fitSizesFor(sp: TreeSpecies): FitSize[] {
  const out: FitSize[] = [];
  for (const c of COURSES) {
    const row = c.by[sp.name];
    if (!row) continue;
    const wood = c.woods?.includes(sp.name) ?? false;
    for (let i = 0; i < 3; i++) {
      // (A course of few trees has the same tree at two percentiles: once is enough.)
      const same = out.some((o) => o.key.startsWith(c.id) && o.height === row.h[i] && o.crownRadius === row.r[i] && o.crownBase === row.base[i]);
      if (same) continue;
      const size = { height: row.h[i], crownRadius: row.r[i], crownBase: Math.min(row.base[i], 0.92 * row.h[i]) };
      const what = `${f1(size.height)} m tall, r ${f1(size.crownRadius)}, base ${f1(size.crownBase)} (n ${row.n})`;
      out.push({ key: `${c.id}-${PCT[i]}`, label: `${c.name} ${PCT[i]}`, note: `${what}${wood ? ", in the open" : ""}`, ...size });
      if (wood) out.push({ key: `${c.id}-${PCT[i]}-edge`, label: `${c.name} ${PCT[i]}, wood edge`, note: `${what}, at a wood's edge`, ...size, stand: EDGE_TO_EYE });
    }
    if (c.corners?.includes(sp.name)) for (const k of cornersOf(row)) out.push({ ...k, key: `${c.id}-${k.key}`, label: `${c.name}, ${k.label}`, note: `${k.note}: ${f1(k.height)} m tall, r ${f1(k.crownRadius)}, base ${f1(k.crownBase)}` });
  }
  const seen = (SEEN[sp.name] ?? []).map((s) => ({ key: `seen-${slugOf(s.label)}`, ...s }));
  if (out.length > 0) return [...out, ...seen];
  // (On none of the courses: a young tree, a typical course tree (smaller and narrower than the specimen, as
  // most measured ones are), and the specimen's own size, old.)
  const H = sp.height;
  const R = sp.crownRadius;
  const B = sp.crownBase;
  const sets: [string, string, number, number, number][] = [
    ["young", "a young tree: a third of the specimen's height, its crown a third as wide", 0.35, 0.35, 0.35],
    ["typical", "a typical course tree: two thirds of its height, its crown half as wide", 0.65, 0.5, 0.65],
  ];
  for (const [label, note, h, r, b] of sets) {
    const size = { height: H * h, crownRadius: R * r, crownBase: Math.min(B * b, 0.9 * H * h) };
    out.push({ key: label, label, note: `${note}: ${f1(size.height)} m tall, r ${f1(size.crownRadius)}, base ${f1(size.crownBase)}`, ...size });
  }
  return [...out, ...seen];
}

/**
 * A course's spread's corners for a species (its percentiles taken apart): tall and narrow, tall with a low base
 * (the deepest crown), tall with a high base, short and wide (the widest), and a shallow lid.
 */
export function cornersOf(row: CourseRow): { key: string; label: string; note: string; height: number; crownRadius: number; crownBase: number }[] {
  const [h10, h50, h90] = row.h;
  const [, r50, r90] = row.r;
  const [b10, b50, b90] = row.base;
  const base = (h: number, b: number) => Math.min(b, 0.9 * h);
  return [
    { key: "tall-narrow", label: "tall and narrow", note: "p90's height on p50's crown radius and base", height: h90, crownRadius: r50, crownBase: base(h90, b50) },
    { key: "deepest", label: "tall, low base", note: "p90's height and radius, p10's base: the deepest crown", height: h90, crownRadius: r90, crownBase: base(h90, b10) },
    { key: "tall-high", label: "tall, high base", note: "p90's height and base, p50's radius: a crown on a long stem", height: h90, crownRadius: r50, crownBase: base(h90, b90) },
    { key: "widest", label: "short and wide", note: "p10's height and base, p90's radius: the widest for its height", height: Math.max(h10, 1.2 * b10 + 1.5), crownRadius: r90, crownBase: b10 },
    { key: "shallowest", label: "shallow", note: "p50's height, p90's radius, a base three quarters of the way up: a shallow crown", height: h50, crownRadius: r90, crownBase: base(h50, Math.min(b90, 0.75 * h50)) },
  ];
}

function slugOf(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "");
}
