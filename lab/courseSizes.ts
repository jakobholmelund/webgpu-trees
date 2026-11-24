// The sizes a course gives its trees: the game fits each tree to its survey (lidar: height, crown radius, crown
// base), and most course trees are far smaller or narrower than their species' specimen. The gallery's fitted
// mode (`?fitted=1`) draws each species at these sizes, beside its specimen and its reference pictures, so a
// tree is judged as the game draws it and not only as its specimen.
//
// Measured in the game on 2026-11-25 (library a66c411), on the first hole of three courses: the 10th, 50th
// and 90th percentiles of each number, taken apart (so p10's height, radius and base are each the 10th of
// their own, not one tree's). A species on none of them gets a young, a typical and an old tree from its
// specimen's numbers.

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
}

export const COURSES: readonly Course[] = [
  {
    id: "c01",
    name: "Riviera",
    by: {
      Eucalyptus: { n: 350, h: [4.9, 10.6, 26.5], r: [1.4, 3.6, 6], base: [2, 4.5, 11.5] },
      "Stone pine": { n: 29, h: [3.6, 5.7, 10.5], r: [2.3, 3, 5], base: [2, 3.5, 5.5] },
      "Mexican fan palm": { n: 66, h: [6.8, 14, 31], r: [1, 1.4, 4.7], base: [4.6, 9.3, 22] },
      "California sycamore": { n: 41, h: [4, 6.7, 10.5], r: [2, 3.1, 4.4], base: [1.4, 2.5, 4.5] },
      "Canary date palm": { n: 17, h: [5, 9, 24.5], r: [2.1, 4, 5.4], base: [2, 5, 9.5] },
      Shrub: { n: 512, h: [1.2, 2, 2.7], r: [0.7, 1.3, 1.5], base: [0.1, 0.1, 0.1] },
    },
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
};

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
  }
  for (const s of SEEN[sp.name] ?? []) out.push({ key: `seen-${slugOf(s.label)}`, ...s });
  if (out.length > 0) return out;
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
  return out;
}

function slugOf(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "");
}
