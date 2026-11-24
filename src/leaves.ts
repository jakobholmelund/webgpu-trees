// The picture a realistic crown's leaf cards carry: a spray of foliage at a
// twig's end, one to three metres across, as it would look laid flat. Five
// kinds of leaf, two sprays of each, all drawn here by arithmetic (no picture
// is loaded, so nothing bought or photographed is in the repository). A palm's
// "spray" is a frond: a feather of leaflets on a rachis, or a pleated fan.
//
// A spray is built as a plant is: a twig, side twigs off it, and leaves (or
// needles) on short stalks along them, each its own size, angle and tone.
// Then it is drawn shape by shape, each over what is already there, each in
// its own small box of texels:
//
//   a twig or a needle is a tapered stroke;
//   a blade is an outline about its midrib (its half width along it: ovate,
//   lanceolate, round; shallow lobes or small teeth on its margin), a little
//   bent, lighter along the midrib and on the side that faces up, darker at
//   its rim, and casting a soft shadow on what it lies over.
//
// Channels: red and blue are one grey tone (the shader multiplies the
// species' colour by it); green is a number of each shape's own, 0..1, so the
// shader can tell one leaf from the next (how thin it is, against the light);
// alpha is coverage, antialiased by distance to the shape's edge. No spray comes within a few texels of its cell's border, so
// the mips of one cell do not bleed into the next.

import { hash01 } from "./variants.ts";

/** The kinds of leaf the atlas holds, by index (the same as `LEAF_KIND_ROWS` in species.ts). */
export const LEAF_KINDS = ["broad", "narrow", "needle", "small", "frond", "pine"] as const;
export type LeafKind = (typeof LEAF_KINDS)[number];

const CELL = 256;
const COLS = 4;
/** Two kinds to a row. */
const ROWS = Math.ceil(LEAF_KINDS.length / 2);
const WIDTH = CELL * COLS;
const HEIGHT = CELL * ROWS;
/** How far inside its cell's border a spray's shapes are kept (the clear margin, the edge ramp and a little more). */
const FIT = 4;
/** The width of a shape's antialiased edge, in texels. */
const RAMP = 1.5;
const TWIG = 0.35;
const LEAF = 0.6;

/**
 * Where a spray is in the atlas, as a rectangle of UV (v up from the texture's first row): kind `kind`
 * (an index into `LEAF_KINDS`), variant 0 or 1. Kind k is in row floor(k / 2), columns 2 (k % 2) and
 * 2 (k % 2) + 1.
 */
export function leafCell(kind: number, variant: number): { u0: number; v0: number; du: number; dv: number } {
  const n = LEAF_KINDS.length;
  const k = (((kind | 0) % n) + n) % n;
  const col = 2 * (k % 2) + (variant & 1);
  const row = Math.floor(k / 2);
  return { u0: col / COLS, v0: row / ROWS, du: 1 / COLS, dv: 1 / ROWS };
}

// ---------------------------------------------------------------------------------------------------------------------
// The shapes.

interface Stroke {
  t: "stroke";
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Radius at a and at b, in texels (not scaled when the spray is fitted to its cell). */
  ra: number;
  rb: number;
  tone: number;
  /** How much lighter its upper side is than its lower, 0..1. */
  lit: number;
}

interface Blade {
  t: "blade";
  /** The base of the blade (where the stalk meets it). */
  x: number;
  y: number;
  /** The direction of its midrib, radians. */
  ang: number;
  len: number;
  /** Its greatest half width. */
  wid: number;
  /** The shape of its half width along it: u^p (1 - u)^q, scaled to `wid` at its widest. */
  p: number;
  q: number;
  /** How far its midrib bends to one side by the tip, as a fraction of its length (+ towards its left). */
  bend: number;
  /** Lobes on each side, and how deep their sinuses go (a fraction of the half width). */
  lobes: number;
  lobeDepth: number;
  /** Small teeth on its margin: how many along it, and how deep. */
  teeth: number;
  toothDepth: number;
  /** How strongly its side veins show, 0..1. */
  veins: number;
  tone: number;
  /** The shadow it casts on what it lies over: how far it falls and how soft it is, texels. */
  shadow: number;
  /** Its half width along it for a greatest half width of 1 (see `bladeProfile`), once worked out. */
  prof: Float32Array | null;
}

type Shape = Stroke | Blade;

function stroke(ax: number, ay: number, bx: number, by: number, ra: number, rb: number, tone: number, lit = 0.25): Stroke {
  return { t: "stroke", ax, ay, bx, by, ra, rb, tone, lit };
}

/** A run of numbers from 0 to 1, the same every time for the same seed. */
function rng(seed: number): () => number {
  let n = 0;
  return () => hash01(n++, seed);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A point on a twig: where, which way it runs there, and how far along it (0..1). */
interface Pt {
  x: number;
  y: number;
  a: number;
  s: number;
}

/** A twig of `n` strokes from (x, y), setting off at angle a and turning by `curl` (radians) over its length. */
function twig(out: Shape[], x: number, y: number, a: number, len: number, curl: number, r0: number, r1: number, rnd: () => number, n = 8, wobble = 0.12): Pt[] {
  const pts: Pt[] = [{ x, y, a, s: 0 }];
  const step = len / n;
  for (let i = 1; i <= n; i++) {
    a += curl / n + (rnd() - 0.5) * wobble;
    const nx = x + Math.cos(a) * step;
    const ny = y + Math.sin(a) * step;
    out.push(stroke(x, y, nx, ny, lerp(r0, r1, (i - 1) / n), lerp(r0, r1, i / n), TWIG));
    x = nx;
    y = ny;
    pts.push({ x, y, a, s: i / n });
  }
  return pts;
}

/** The point `s` (0..1) of the way along a twig. */
function along(pts: Pt[], s: number): Pt {
  const f = clamp01(s) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const t = f - i;
  const p = pts[i];
  const q = pts[i + 1];
  return { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t), a: q.a, s };
}

/** Turn angle a towards angle b by fraction t (the short way round). */
function towards(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

interface BladeOptions {
  len: number;
  wid: number;
  p: number;
  q: number;
  bend?: number;
  lobes?: number;
  lobeDepth?: number;
  teeth?: number;
  toothDepth?: number;
  veins?: number;
  shadow?: number;
}

/** A leaf on a stalk of length `stalk` from (x, y), pointing at angle a; its own tone ±10 %. */
function leaf(out: Shape[], x: number, y: number, a: number, stalk: number, o: BladeOptions, rnd: () => number, stalkR = 1.0): void {
  let bx = x;
  let by = y;
  if (stalk > 0) {
    bx = x + Math.cos(a) * stalk;
    by = y + Math.sin(a) * stalk;
    out.push(stroke(x, y, bx, by, stalkR * 1.15, stalkR, TWIG * 1.25, 0));
  }
  out.push({
    t: "blade",
    x: bx,
    y: by,
    ang: a + (rnd() - 0.5) * 0.25,
    len: o.len,
    wid: o.wid,
    p: o.p,
    q: o.q,
    bend: o.bend ?? 0,
    lobes: o.lobes ?? 0,
    lobeDepth: o.lobeDepth ?? 0,
    teeth: o.teeth ?? 0,
    toothDepth: o.toothDepth ?? 0,
    veins: o.veins ?? 0,
    tone: LEAF * (0.9 + rnd() * 0.2),
    shadow: o.shadow ?? 3,
    prof: null,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The sprays, one kind at a time. Built in texels about the twig's foot; fitted to their cell afterwards.

/** Oak, maple, plane, beech: a curved twig, side twigs, broad leaves alternate on short stalks, overlapping. */
function broadSpray(v: number, rnd: () => number): Shape[] {
  const twigs: Shape[] = [];
  const leaves: Shape[] = [];
  const lobed = v === 1;
  const main = twig(twigs, 0, 0, Math.PI / 2 + (rnd() - 0.5) * 0.3, 120, (rnd() - 0.5) * 0.6, 3.2, 1.5, rnd, 10);
  const branches: { pts: Pt[]; len: number; from: number }[] = [{ pts: main, len: 120, from: 0.3 }];
  let side = rnd() < 0.5 ? 1 : -1;
  for (const f of [0.14, 0.34, 0.54, 0.72]) {
    const p = along(main, f + (rnd() - 0.5) * 0.05);
    const len = (66 + rnd() * 22) * (1 - f * 0.4);
    // (The lower side twigs spread wider.)
    const a = p.a + side * (0.85 + (0.6 - f) * 0.9 + rnd() * 0.25);
    branches.push({ pts: twig(twigs, p.x, p.y, a, len, -side * (0.3 + rnd() * 0.3), 2.3, 1.2, rnd, 6), len, from: 0.22 });
    side = -side;
  }
  for (const b of branches) {
    let ls = rnd() < 0.5 ? 1 : -1;
    const gap = (20 + rnd() * 5) / b.len;
    // (Alternate leaves along it, then one at its tip.)
    for (let s = b.from + rnd() * 0.08; s < 0.93; s += gap * (0.85 + rnd() * 0.3)) {
      const p = along(b.pts, s);
      broadLeaf(leaves, p.x, p.y, p.a + ls * (0.65 + rnd() * 0.5), (80 + rnd() * 26) * (1 - 0.15 * s), lobed, rnd);
      ls = -ls;
    }
    const tip = b.pts[b.pts.length - 1];
    broadLeaf(leaves, tip.x, tip.y, tip.a + (rnd() - 0.5) * 0.3, 88 + rnd() * 18, lobed, rnd);
  }
  return [...twigs, ...under(shuffle(leaves, rnd))];
}

function broadLeaf(out: Shape[], x: number, y: number, a: number, len: number, lobed: boolean, rnd: () => number): void {
  // (Seen at an angle, a leaf looks narrower than it is.)
  const wid = len * (0.29 + rnd() * 0.08) * (0.8 + rnd() * 0.2);
  const shallow = !lobed && rnd() < 0.25;
  const o: BladeOptions = { len, wid, p: 0.55 + rnd() * 0.2, q: 0.95 + rnd() * 0.3, bend: (rnd() - 0.5) * 0.16, veins: 1, shadow: 3.5 };
  if (lobed) {
    o.lobes = 4 + Math.floor(rnd() * 2);
    o.lobeDepth = 0.35 + rnd() * 0.15;
    o.wid = len * (0.32 + rnd() * 0.08) * (0.8 + rnd() * 0.2);
    o.p = 0.75 + rnd() * 0.2;
    o.q = 0.75 + rnd() * 0.2;
  } else if (shallow) {
    o.lobes = 3;
    o.lobeDepth = 0.15 + rnd() * 0.08;
  } else {
    o.teeth = 16 + Math.floor(rnd() * 6);
    o.toothDepth = 0.05;
  }
  leaf(out, x, y, a, 5 + rnd() * 5, o, rnd, 1.1);
}

/** Eucalyptus (v 0): long sickle leaves hanging from a few twigs. Willow (v 1): an arching twig, narrow leaves on hanging shoots. */
function narrowSpray(v: number, rnd: () => number): Shape[] {
  const twigs: Shape[] = [];
  const leaves: Shape[] = [];
  const down = -Math.PI / 2;
  if (v === 0) {
    const main = twig(twigs, 0, 0, Math.PI / 2 + (rnd() - 0.5) * 0.3, 190, (rnd() < 0.5 ? 1 : -1) * (0.3 + rnd() * 0.3), 2.8, 1.3, rnd, 10);
    const branches: Pt[][] = [main];
    let side = rnd() < 0.5 ? 1 : -1;
    for (const f of [0.14, 0.28, 0.42, 0.56, 0.7, 0.84]) {
      const p = along(main, f);
      branches.push(twig(twigs, p.x, p.y, p.a + side * (1.0 + rnd() * 0.35), (55 + rnd() * 25) * (1 - f * 0.5), -side * 0.4, 1.9, 1.0, rnd, 6));
      side = -side;
    }
    for (const b of branches) {
      let ls = rnd() < 0.5 ? 1 : -1;
      for (let s = (b === main ? 0.3 : 0.15) + rnd() * 0.1; s < 1.0; s += (b === main ? 0.07 : 0.11) + rnd() * 0.06) {
        const p = along(b, s);
        // (Each leaf set off from its twig, then hanging, the higher ones less.)
        const a = towards(p.a + ls * (0.6 + rnd() * 0.4), down, (0.45 + rnd() * 0.35) * (b === main ? 1 - 0.5 * s : 1));
        const len = 80 + rnd() * 32;
        leaf(leaves, p.x, p.y, a, 7 + rnd() * 5, { len, wid: len * (0.11 + rnd() * 0.04), p: 0.75, q: 1.45, bend: (ls > 0 ? 1 : -1) * (0.1 + rnd() * 0.1), veins: 0, shadow: 2.5 }, rnd, 0.95);
        ls = -ls;
      }
    }
  } else {
    // (The twig arches up and over; shoots hang from it, leaves alongside them.)
    const dir = rnd() < 0.5 ? 1 : -1;
    const main = twig(twigs, 0, 0, Math.PI / 2 - dir * 0.6, 230, -dir * 1.5, 2.4, 1.2, rnd, 12, 0.08);
    const shoots: Pt[][] = [main];
    for (let s = 0.1; s < 0.99; s += 0.05 + rnd() * 0.03) {
      const p = along(main, s);
      shoots.push(twig(twigs, p.x, p.y, towards(p.a, down, 0.55 + rnd() * 0.3), 80 + rnd() * 90 * (1 - Math.abs(s - 0.55)), dir * (rnd() - 0.5) * 0.5, 1.4, 0.8, rnd, 6));
    }
    for (const b of shoots) {
      let ls = rnd() < 0.5 ? 1 : -1;
      const start = b === main ? 0.25 : 0.06;
      for (let s = start + rnd() * 0.05; s < 1.0; s += (b === main ? 0.05 : 0.085) + rnd() * 0.045) {
        const p = along(b, s);
        const a = towards(p.a + ls * (0.25 + rnd() * 0.4), down, b === main ? 0.5 : 0.15);
        const len = 52 + rnd() * 26;
        leaf(leaves, p.x, p.y, a, 2 + rnd() * 2, { len, wid: len * (0.08 + rnd() * 0.03), p: 0.8, q: 1.3, bend: (rnd() - 0.5) * 0.2, veins: 0, shadow: 2 }, rnd, 0.8);
        ls = -ls;
      }
    }
  }
  return [...twigs, ...under(shuffle(leaves, rnd))];
}

/** A fir's or a spruce's spray (two of them, v 0 and 1): a flat frond, side shoots combed with short needles. */
function needleSpray(_v: number, rnd: () => number): Shape[] {
  return conifer(0, rnd);
}

/**
 * A pine's spray (v 0 and 1): a branch's end of shoots, each ending in a brush of needles, the shoots behind
 * them bare, as a pine keeps its needles only on its last few years' growth.
 */
function pineSpray(v: number, rnd: () => number): Shape[] {
  const twigs: Shape[] = [];
  const needles: Shape[] = [];
  // (A branch's end: a shoot forking into shoots, each of the last few years' growth, each ending in its brush;
  // v 1 forks once more, finer.)
  const tips: { x: number; y: number; a: number; len: number }[] = [];
  const main = twig(twigs, 0, 0, Math.PI / 2 + (rnd() - 0.5) * 0.25, 120, (rnd() - 0.5) * 0.3, 3.2, 2.2, rnd, 8, 0.06);
  tips.push({ ...main[main.length - 1], len: 30 + rnd() * 6 });
  let side = rnd() < 0.5 ? 1 : -1;
  const forks = v === 0 ? [0.3, 0.48, 0.64, 0.8] : [0.22, 0.36, 0.5, 0.62, 0.74, 0.86];
  for (const f of forks) {
    const p = along(main, f + (rnd() - 0.5) * 0.04);
    const len = (75 + rnd() * 25) * (1.15 - f * 0.6);
    const pts = twig(twigs, p.x, p.y, p.a + side * (0.6 + rnd() * 0.35), len, -side * 0.25, 2.3, 1.7, rnd, 6, 0.07);
    tips.push({ ...pts[pts.length - 1], len: 26 + rnd() * 6 });
    if (len > 55) {
      const q = along(pts, 0.55 + rnd() * 0.1);
      const sub = twig(twigs, q.x, q.y, q.a - side * (0.5 + rnd() * 0.3), len * 0.45, 0, 1.6, 1.3, rnd, 4, 0.07);
      tips.push({ ...sub[sub.length - 1], len: 22 + rnd() * 5 });
    }
    side = -side;
  }
  for (const tip of tips) {
    const shade = 0.84 + rnd() * 0.26;
    // (Its brush: needles off the last stretch of the shoot and all round its tip, splayed forward, the shoot
    // behind it bare.)
    for (let k = 0; k < 90; k++) {
      const back = rnd() * tip.len * 0.55;
      const x = tip.x - Math.cos(tip.a) * back;
      const y = tip.y - Math.sin(tip.a) * back;
      const a = tip.a + (rnd() - 0.5) * 2.6 * (0.6 + 0.4 * (back / (tip.len * 0.55)));
      const forward = 0.6 + 0.4 * Math.cos(a - tip.a);
      needle(needles, x, y, a, tip.len * forward * (0.75 + rnd() * 0.4), 1.35, rnd, shade);
    }
  }
  return [...twigs, ...needles];
}

/** Fir or spruce (0): a flat frond, side shoots combed with short needles. Pine (1): long needles in brushes. */
function conifer(v: number, rnd: () => number): Shape[] {
  const twigs: Shape[] = [];
  const needles: Shape[] = [];
  const shoots: { pts: Pt[]; len: number }[] = [];
  if (v === 0) {
    const main = twig(twigs, 0, 0, Math.PI / 2 + (rnd() - 0.5) * 0.2, 200, (rnd() - 0.5) * 0.4, 2.4, 1.3, rnd, 12, 0.05);
    shoots.push({ pts: main, len: 200 });
    let side = rnd() < 0.5 ? 1 : -1;
    for (let f = 0.04 + rnd() * 0.03; f < 0.9; f += 0.06 + rnd() * 0.025) {
      const p = along(main, f);
      // (Its outline: widest a third of the way up, ragged.)
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.05 + 0.08)), 0.6);
      const len = Math.max(20, (100 + rnd() * 30) * env * (rnd() < 0.2 ? 0.7 : 1));
      const a = p.a + side * (0.9 + rnd() * 0.25);
      const pts = twig(twigs, p.x, p.y, a, len, -side * (0.15 + rnd() * 0.2), 1.6, 1.0, rnd, 6, 0.06);
      shoots.push({ pts, len });
      if (len > 50) {
        let s2 = rnd() < 0.5 ? 1 : -1;
        for (const g of [0.3, 0.55, 0.75]) {
          const q = along(pts, g + (rnd() - 0.5) * 0.08);
          const l2 = len * (0.3 + rnd() * 0.12) * (1 - g * 0.5);
          shoots.push({ pts: twig(twigs, q.x, q.y, q.a + s2 * (0.75 + rnd() * 0.2), l2, 0, 1.1, 0.9, rnd, 4, 0.06), len: l2 });
          s2 = -s2;
        }
      }
      side = -side;
    }
    for (const sh of shoots) {
      // (Each shoot a little lighter or darker than the next, as it lies nearer the light or further in.)
      const shade = 0.84 + rnd() * 0.26;
      const step = 2.1 / sh.len;
      for (let s = 0.03; s < 1.0; s += step * (0.85 + rnd() * 0.3)) {
        const p = along(sh.pts, s);
        // (Short needles, nearly square to the shoot and a little forward, shorter towards its tip.)
        const nl = (15 + rnd() * 6) * (1 - 0.45 * s * s);
        for (const sd of [1, -1]) {
          if (rnd() < 0.08) continue;
          needle(needles, p.x, p.y, p.a + sd * (1.0 + rnd() * 0.4), nl, 1.3, rnd, shade);
        }
      }
      // (A tuft at its tip.)
      const tip = sh.pts[sh.pts.length - 1];
      for (let k = 0; k < 5; k++) needle(needles, tip.x, tip.y, tip.a + (k - 2) * 0.38 + (rnd() - 0.5) * 0.2, 8 + rnd() * 3, 1.25, rnd, shade);
    }
  } else {
    const main = twig(twigs, 0, 0, Math.PI / 2 + (rnd() - 0.5) * 0.3, 160, (rnd() - 0.5) * 0.5, 3.4, 2.0, rnd, 10, 0.08);
    shoots.push({ pts: main, len: 160 });
    let side = rnd() < 0.5 ? 1 : -1;
    for (const f of [0.12, 0.26, 0.4, 0.54, 0.68, 0.8]) {
      const p = along(main, f + (rnd() - 0.5) * 0.04);
      const len = (90 + rnd() * 25) * (1 - f * 0.4);
      shoots.push({ pts: twig(twigs, p.x, p.y, p.a + side * (0.8 + (0.5 - f) * 0.6 + rnd() * 0.3), len, -side * 0.35, 2.4, 1.6, rnd, 6, 0.08), len });
      side = -side;
    }
    for (const sh of shoots) {
      const shade = 0.84 + rnd() * 0.26;
      // (Long needles all along the shoot's outer part, splayed forward, and a brush about its tip.)
      const step = 0.9 / sh.len;
      for (let s = 0.15 + rnd() * 0.1; s < 1.0; s += step * (0.8 + rnd() * 0.4)) {
        const p = along(sh.pts, s);
        const sd = rnd() < 0.5 ? 1 : -1;
        const a = p.a + sd * (0.35 + rnd() * 0.8) * (1.1 - 0.4 * s);
        needle(needles, p.x, p.y, a, 32 + rnd() * 14, 1.25, rnd, shade);
      }
      const tip = sh.pts[sh.pts.length - 1];
      for (let k = 0; k < 28; k++) needle(needles, tip.x, tip.y, tip.a + (rnd() - 0.5) * 2.4, 26 + rnd() * 14, 1.2, rnd, shade);
    }
  }
  return [...twigs, ...needles];
}

function needle(out: Shape[], x: number, y: number, a: number, len: number, r: number, rnd: () => number, shade = 1): void {
  // (A needle grows a little in from where it leaves the shoot, so its root is hidden on the shoot.)
  const x0 = x + Math.cos(a) * 1.5;
  const y0 = y + Math.sin(a) * 1.5;
  const a2 = a + (rnd() - 0.5) * 0.12;
  out.push(stroke(x0, y0, x0 + Math.cos(a2) * len, y0 + Math.sin(a2) * len, r, r * 0.7, LEAF * shade * (0.9 + rnd() * 0.2), 0.35));
}

/** Box (v 0): small oval leaves in opposite pairs, dense on branching twigs. v 1: rounder leaves, alternate. */
function smallSpray(v: number, rnd: () => number): Shape[] {
  const twigs: Shape[] = [];
  const leaves: Shape[] = [];
  const all: Pt[][] = [];
  const main = twig(twigs, 0, 0, Math.PI / 2 + (rnd() - 0.5) * 0.3, 170, (rnd() - 0.5) * 0.6, 2.4, 1.2, rnd, 10);
  all.push(main);
  let side = rnd() < 0.5 ? 1 : -1;
  for (let f = 0.1 + rnd() * 0.04; f < 0.85; f += 0.1 + rnd() * 0.04) {
    const p = along(main, f);
    const len = (88 + rnd() * 30) * (1 - f * 0.45);
    const b = twig(twigs, p.x, p.y, p.a + side * (0.7 + rnd() * 0.35), len, -side * (0.2 + rnd() * 0.4), 1.7, 1.0, rnd, 6, 0.2);
    all.push(b);
    if (len > 40) {
      for (const g of [0.35, 0.65]) {
        const q = along(b, g + rnd() * 0.1);
        all.push(twig(twigs, q.x, q.y, q.a + (g < 0.5 ? -side : side) * (0.6 + rnd() * 0.3), len * (0.35 + rnd() * 0.15), 0, 1.2, 0.9, rnd, 4, 0.2));
      }
    }
    side = -side;
  }
  for (const b of all) {
    const total = (b.length - 1) * Math.hypot(b[1].x - b[0].x, b[1].y - b[0].y);
    const gap = (v === 0 ? 8 : 5.5) / total;
    let ls = 1;
    for (let s = (b === main ? 0.2 : 0.06) + rnd() * 0.05; s < 1.0; s += gap * (0.85 + rnd() * 0.3)) {
      const p = along(b, s);
      const sides = v === 0 ? [1, -1] : [(ls = -ls)];
      for (const sd of sides) {
        const len = v === 0 ? 21 + rnd() * 8 : 22 + rnd() * 9;
        const wid = len * (v === 0 ? 0.27 + rnd() * 0.06 : 0.37 + rnd() * 0.07) * (0.8 + rnd() * 0.2);
        leaf(leaves, p.x, p.y, p.a + sd * (0.6 + rnd() * 0.45), 1.5, { len, wid, p: 0.85, q: v === 0 ? 0.95 : 0.8, bend: (rnd() - 0.5) * 0.15, shadow: 2 }, rnd, 0.7);
      }
    }
    // (A small tuft of new leaves at the tip.)
    const tip = b[b.length - 1];
    for (const d of [-0.35, 0, 0.35]) {
      const len = 13 + rnd() * 4;
      leaf(leaves, tip.x, tip.y, tip.a + d + (rnd() - 0.5) * 0.2, 1, { len, wid: len * 0.3, p: 0.85, q: 0.95, shadow: 1.5 }, rnd, 0.6);
    }
  }
  return [...twigs, ...under(leaves)];
}

/**
 * Palms. Canary date palm (v 0): a pinnate frond, a stiff rachis with long narrow leaflets in two ranks on
 * each side, angled out and forward, short spines at its foot. Washingtonia (v 1): a petiole to about a
 * third of the way up, then a costapalmate fan of narrow pleated segments radiating over ~200 degrees, joined
 * for half their length, then split and drooping at their tips, a few threads hanging from them.
 */
function frondSpray(v: number, rnd: () => number): Shape[] {
  return v === 0 ? pinnateFrond(rnd) : fanFrond(rnd);
}

function pinnateFrond(rnd: () => number): Shape[] {
  const rachis: Shape[] = [];
  const spines: Shape[] = [];
  const leaflets: Shape[] = [];
  const len = 236;
  const main = twig(rachis, 0, 0, Math.PI / 2 + (rnd() - 0.5) * 0.08, len, (rnd() - 0.5) * 0.2, 2.6, 1.0, rnd, 12, 0.02);
  // (A palm's rachis is pale, not bark.)
  for (const r of rachis) {
    (r as Stroke).tone = LEAF * 0.98;
    (r as Stroke).lit = 0.5;
  }
  for (const sd of [1, -1]) {
    for (let s = 0.025 + rnd() * 0.01; s < 0.985; s += 0.014 + rnd() * 0.006) {
      const p = along(main, s);
      if (s < 0.1) {
        // (The lowest leaflets are spines: short, stiff, steep.)
        const a = p.a + sd * (0.45 + rnd() * 0.25);
        const l = 7 + s * 140 * (0.8 + rnd() * 0.4);
        spines.push(stroke(p.x, p.y, p.x + Math.cos(a) * l, p.y + Math.sin(a) * l, 1.1, 0.4, LEAF * 0.9, 0.3));
        continue;
      }
      // (Longest from a third of the way up, shorter to the tip; each its own length, now and then one missing.)
      if (rnd() < 0.05) continue;
      const env = s < 0.3 ? 0.4 + 0.6 * Math.sin(((s - 0.1) / 0.2) * (Math.PI / 2)) : 1 - 0.78 * Math.pow((s - 0.3) / 0.7, 1.5);
      const l = 122 * env * (0.82 + rnd() * 0.3);
      // (Two ranks, as the leaflets stand in a V about the rachis: one lies wider than the other.)
      const spread = (rnd() < 0.5 ? 0.82 : 1.1) + (rnd() - 0.5) * 0.16;
      const a = p.a + sd * spread * (1 - 0.3 * s * s);
      leaf(leaflets, p.x, p.y, a, 0, { len: l, wid: 1.25 + rnd() * 0.35, p: 0.45, q: 1.05, bend: sd * (0.03 + rnd() * 0.06), shadow: 1.6 }, rnd);
    }
  }
  return [...spines, ...leaflets, ...rachis];
}

function fanFrond(rnd: () => number): Shape[] {
  const stalk: Shape[] = [];
  const pet = twig(stalk, 0, 0, Math.PI / 2 + (rnd() - 0.5) * 0.05, 92, (rnd() - 0.5) * 0.06, 3.2, 2.5, rnd, 6, 0.02);
  for (const r of stalk) {
    (r as Stroke).tone = LEAF * 0.85;
    (r as Stroke).lit = 0.45;
  }
  // (Hooked teeth along the petiole's edges.)
  for (let s = 0.08; s < 0.92; s += 0.075 + rnd() * 0.04) {
    const p = along(pet, s);
    for (const sd of [1, -1]) {
      if (rnd() < 0.3) continue;
      const nx = -Math.sin(p.a) * sd * 2.6;
      const ny = Math.cos(p.a) * sd * 2.6;
      const a = p.a + sd * (0.9 + rnd() * 0.3);
      spinesOn(stalk, p.x + nx, p.y + ny, a, 3.5 + rnd() * 2);
    }
  }
  const h = pet[pet.length - 1];
  const n = 34 + Math.floor(rnd() * 5);
  const from = (-10 * Math.PI) / 180;
  const sweep = (200 * Math.PI) / 180;
  const d = sweep / n;
  const R = 170;
  const valleys: Shape[] = [];
  const ridges: Shape[] = [];
  const threads: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const a = from + d * (i + 0.5) + (rnd() - 0.5) * 0.25 * d;
    // (The fan nearly round, its side segments shorter than its top ones, and a little ragged.)
    const len = R * (0.74 + 0.26 * Math.max(0, Math.sin(a))) * (0.93 + rnd() * 0.12);
    // (Wide enough to overlap its neighbours to past half its length, then narrowing to a tip apart from them.)
    const wid = 0.64 * len * Math.sin(d / 2) * (0.95 + rnd() * 0.1);
    // (Its free end droops: the more so the nearer level it points.)
    const bend = -Math.cos(a) * (0.17 + rnd() * 0.08) + (rnd() - 0.5) * 0.03;
    const ridge = i % 2 === 1;
    const tone = LEAF * (ridge ? 1.1 : 0.86) * (0.95 + rnd() * 0.1);
    (ridge ? ridges : valleys).push(frondBlade(h.x, h.y, a, len, wid, 1, 0.8, bend, tone, ridge ? 2.2 : 1.2));
    // (Now and then a thread hanging from a side segment's tip, drawn under the fan so only its free end shows.)
    if (Math.abs(Math.cos(a)) > 0.4 && rnd() < 0.5) {
      const c = bend * len;
      const tx = h.x + Math.cos(a) * len * 0.97 - Math.sin(a) * c;
      const ty = h.y + Math.sin(a) * len * 0.97 + Math.cos(a) * c;
      const ta = towards(a, -Math.PI / 2, 0.75 + rnd() * 0.2);
      const tl = 9 + rnd() * 12;
      threads.push(stroke(tx, ty, tx + Math.cos(ta) * tl, ty + Math.sin(ta) * tl, 0.6, 0.4, LEAF * 0.8, 0));
    }
  }
  // (The hastula: a small pale crest where the petiole meets the fan.)
  const hastula = frondBlade(h.x, h.y - 2, Math.PI / 2, 18, 4.5, 0.8, 1.2, 0, LEAF * 1.05, 1.5);
  // (The petiole over the fan's foot, where the segments' shadows would gather into a dark spot.)
  return [...threads, ...valleys, ...ridges, ...stalk, hastula];
}

function spinesOn(out: Shape[], x: number, y: number, a: number, len: number): void {
  out.push(stroke(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 0.9, 0.35, LEAF * 0.75, 0));
}

function frondBlade(x: number, y: number, ang: number, len: number, wid: number, p: number, q: number, bend: number, tone: number, shadow: number): Blade {
  return { t: "blade", x, y, ang, len, wid, p, q, bend, lobes: 0, lobeDepth: 0, teeth: 0, toothDepth: 0, veins: 0, tone, shadow, prof: null };
}

/** The leaves' stalks first, under every blade (a stalk drawn across another leaf reads as a scratch). */
function under(leaves: Shape[]): Shape[] {
  return [...leaves.filter((s) => s.t === "stroke"), ...leaves.filter((s) => s.t === "blade")];
}

function shuffle<T>(list: T[], rnd: () => number): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// ---------------------------------------------------------------------------------------------------------------------
// Fitting a spray to its cell, and drawing it.

/** Scale and move a spray (about its own middle) so its shapes sit inside the cell, `FIT` texels clear of the border. */
function fit(shapes: Shape[]): void {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (x: number, y: number, r: number) => {
    x0 = Math.min(x0, x - r);
    y0 = Math.min(y0, y - r);
    x1 = Math.max(x1, x + r);
    y1 = Math.max(y1, y + r);
  };
  for (const s of shapes) {
    if (s.t === "stroke") {
      add(s.ax, s.ay, s.ra);
      add(s.bx, s.by, s.rb);
    } else {
      // (Its outline, sampled along the midrib.)
      const prof = bladeProfile(s);
      const cx = Math.cos(s.ang);
      const cy = Math.sin(s.ang);
      for (let n = 0; n <= 16; n++) {
        const u = n / 16;
        const a = u * s.len;
        const c = s.bend * s.len * u * u;
        const w = s.wid * prof[Math.round(u * PROFILE)];
        add(s.x + cx * a - cy * c, s.y + cy * a + cx * c, w);
      }
    }
  }
  const room = CELL - 2 * FIT;
  const k = Math.min(room / (x1 - x0), room / (y1 - y0));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const mx = (x: number) => CELL / 2 + (x - cx) * k;
  const my = (y: number) => CELL / 2 + (y - cy) * k;
  for (const s of shapes) {
    if (s.t === "stroke") {
      s.ax = mx(s.ax);
      s.ay = my(s.ay);
      s.bx = mx(s.bx);
      s.by = my(s.by);
    } else {
      s.x = mx(s.x);
      s.y = my(s.y);
      s.len *= k;
      s.wid *= k;
    }
  }
}

/** One cell's picture as it is drawn: tone and each shape's own number premultiplied by coverage, and coverage. */
interface Layer {
  tone: Float32Array;
  own: Float32Array;
  cover: Float32Array;
}

function box(cx0: number, cy0: number, cx1: number, cy1: number): [number, number, number, number] {
  return [Math.max(0, Math.floor(cx0)), Math.max(0, Math.floor(cy0)), Math.min(CELL - 1, Math.ceil(cx1)), Math.min(CELL - 1, Math.ceil(cy1))];
}

function drawStroke(L: Layer, s: Stroke, own: number): void {
  const r = Math.max(s.ra, s.rb) + RAMP;
  const [i0, j0, i1, j1] = box(Math.min(s.ax, s.bx) - r, Math.min(s.ay, s.by) - r, Math.max(s.ax, s.bx) + r, Math.max(s.ay, s.by) + r);
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  const len = Math.sqrt(len2);
  // (Its upper side: the side of it whose normal points up.)
  const ny = dx / len;
  for (let j = j0; j <= j1; j++) {
    const py = j + 0.5 - s.ay;
    for (let i = i0; i <= i1; i++) {
      const px = i + 0.5 - s.ax;
      const t = clamp01((px * dx + py * dy) / len2);
      const ex = px - dx * t;
      const ey = py - dy * t;
      const rad = s.ra + (s.rb - s.ra) * t;
      const dist = Math.sqrt(ex * ex + ey * ey);
      const c = clamp01((rad - dist) / RAMP + 0.5);
      if (c <= 0) continue;
      const off = (dx * py - dy * px) / len / rad;
      const light = Math.max(-1, Math.min(1, off * Math.sign(ny || 1)));
      const tone = s.tone * (1 + s.lit * 0.3 * light) * (1 + 0.1 * t * s.lit);
      const o = j * CELL + i;
      L.tone[o] = L.tone[o] * (1 - c) + tone * c;
      L.own[o] = L.own[o] * (1 - c) + own * c;
      L.cover[o] = L.cover[o] * (1 - c) + c;
    }
  }
}

const PROFILE = 128;

/** A blade's half width along it without lobes or teeth, for a greatest half width of 1: `PROFILE` + 1 samples from base to tip. */
function bladeProfile(b: Blade): Float32Array {
  if (b.prof) return b.prof;
  const um = b.p / (b.p + b.q);
  const k = 1 / (Math.pow(um, b.p) * Math.pow(1 - um, b.q));
  const out = new Float32Array(PROFILE + 1);
  for (let n = 1; n < PROFILE; n++) out[n] = k * Math.pow(n / PROFILE, b.p) * Math.pow(1 - n / PROFILE, b.q);
  b.prof = out;
  return out;
}

function bladeWidth(b: Blade, prof: Float32Array, u: number, side: number): number {
  if (u <= 0 || u >= 1) return 0;
  const f = u * PROFILE;
  const n = Math.floor(f);
  let w = b.wid * (prof[n] + (prof[n + 1] - prof[n]) * (f - n));
  if (b.lobes > 0) {
    // (Narrow, rounded sinuses between broad lobes, the two sides a little out of step.)
    const c = 0.5 + 0.5 * Math.cos(Math.PI * 2 * b.lobes * u + (side > 0 ? 0 : 1.9));
    w *= 1 - b.lobeDepth * c * c * c * Math.min(1, u * 4);
  }
  if (b.teeth > 0) {
    const f = b.teeth * u + (side > 0 ? 0 : 0.5);
    w *= 1 - b.toothDepth * (f - Math.floor(f));
  }
  return w;
}

// (Where the last point `bladeEdge` measured is: along the blade 0..1, across it from the midrib, and the half width there.)
const edge = { u: 0, v: 0, w: 0 };

/** Signed distance (texels, + inside) from a point in a blade's own frame (a along its midrib's chord, c across it) to its edge. */
function bladeEdge(b: Blade, prof: Float32Array, a: number, c: number): number {
  const u = a / b.len;
  const v = c - b.bend * b.len * u * u;
  edge.u = u;
  edge.v = v;
  edge.w = 0;
  if (u <= 0) return -Math.sqrt(a * a + v * v);
  if (u >= 1) return -Math.sqrt((a - b.len) * (a - b.len) + v * v);
  // (Well outside its widest: no closer than that.)
  const av = Math.abs(v);
  if (av > b.wid + 4) return b.wid - av;
  const w = bladeWidth(b, prof, u, v >= 0 ? 1 : -1);
  edge.w = w;
  // (The outline's slope, from the base profile alone: enough to keep the edge ramp even.)
  const dw = (w * (b.p / u - b.q / (1 - u))) / b.len;
  return (w - av) / Math.sqrt(1 + dw * dw);
}

/** The texels of a row that can lie in a blade's band: [first, last], from the row's own [i0, i1]. */
const span = [0, 0];

/** Narrow `span` to the texels whose point (i + 0.5 - ox, py) has k (i + 0.5 - ox) + k0 within [lo, hi]. */
function clip(k: number, k0: number, lo: number, hi: number, ox: number): void {
  if (Math.abs(k) < 1e-6) {
    if (k0 < lo || k0 > hi) span[1] = span[0] - 1;
    return;
  }
  let p0 = (lo - k0) / k;
  let p1 = (hi - k0) / k;
  if (p0 > p1) [p0, p1] = [p1, p0];
  span[0] = Math.max(span[0], Math.floor(p0 + ox - 0.5));
  span[1] = Math.min(span[1], Math.ceil(p1 + ox - 0.5));
}

/** The texels of row j near the blade (its base at ox, oy): within `reach` of its midrib's chord, and of its length. */
function bladeRow(j: number, ox: number, oy: number, cx: number, cy: number, len: number, reach: number, i0: number, i1: number): void {
  const py = j + 0.5 - oy;
  span[0] = i0;
  span[1] = i1;
  clip(cx, py * cy, -reach, len + reach, ox);
  clip(-cy, py * cx, -reach, reach, ox);
}

function drawBlade(L: Layer, b: Blade, own: number): void {
  const cx = Math.cos(b.ang);
  const cy = Math.sin(b.ang);
  // (Its left side, +v: does it face up?)
  const nx = -cy;
  const ny = cx;
  const upSide = ny;
  const prof = bladeProfile(b);
  const reach = b.wid + Math.abs(b.bend) * b.len + RAMP + 1;
  const tipX = b.x + cx * b.len;
  const tipY = b.y + cy * b.len;
  const sx = 1.0 * (b.shadow / 3);
  const sy = -b.shadow;
  const [i0, j0, i1, j1] = box(Math.min(b.x, tipX) - reach, Math.min(b.y, tipY) - reach + Math.min(0, sy), Math.max(b.x, tipX) + reach + Math.max(0, sx), Math.max(b.y, tipY) + reach);
  // (Its shadow first, on what is already drawn: offset down and soft.)
  if (b.shadow > 0) {
    for (let j = j0; j <= j1; j++) {
      bladeRow(j, b.x + sx, b.y + sy, cx, cy, b.len, reach + b.shadow * 0.6, i0, i1);
      for (let i = span[0]; i <= span[1]; i++) {
        const o = j * CELL + i;
        if (L.cover[o] <= 0) continue;
        const px = i + 0.5 - b.x - sx;
        const py = j + 0.5 - b.y - sy;
        const d = bladeEdge(b, prof, px * cx + py * cy, px * nx + py * ny);
        const c = clamp01(d / (b.shadow * 1.2) + 0.5);
        if (c > 0) L.tone[o] *= 1 - 0.32 * c;
      }
    }
  }
  const rib = Math.max(0.8, b.wid * 0.05);
  const veinGap = b.len / 8;
  for (let j = j0; j <= j1; j++) {
    bladeRow(j, b.x, b.y, cx, cy, b.len, reach, i0, i1);
    for (let i = span[0]; i <= span[1]; i++) {
      const px = i + 0.5 - b.x;
      const py = j + 0.5 - b.y;
      const a = px * cx + py * cy;
      const cc = px * nx + py * ny;
      const d = bladeEdge(b, prof, a, cc);
      const c = clamp01(d / RAMP + 0.5);
      if (c <= 0) continue;
      const u = clamp01(edge.u);
      const v = edge.v;
      const w = Math.max(1e-3, edge.w);
      const sv = Math.max(-1, Math.min(1, v / w));
      // (Lit from above: the half that faces up lighter, the other darker; the base a little darker.)
      let tone = b.tone * (1 + 0.13 * sv * upSide) * (0.9 + 0.1 * Math.min(1, u * 3));
      // (Its midrib, lighter, fading to the tip.)
      const ribW = rib * (1 - 0.6 * u);
      const m = clamp01((ribW - Math.abs(v)) / 0.9 + 0.5) * (1 - 0.7 * u);
      tone *= 1 + 0.2 * m;
      // (Side veins running out and forward from the midrib, faint.)
      if (b.veins > 0 && Math.abs(v) > ribW && Math.abs(sv) < 0.85) {
        const q = (a - Math.abs(v) * 1.1) / veinGap;
        const dd = Math.abs(q - Math.round(q)) * veinGap;
        tone *= 1 + 0.08 * b.veins * clamp01(1 - dd / 0.9);
      }
      // (A darker rim.)
      if (d < 2.2) tone *= 0.88 + 0.12 * clamp01(d / 2.2);
      const o = j * CELL + i;
      L.tone[o] = L.tone[o] * (1 - c) + tone * c;
      L.own[o] = L.own[o] * (1 - c) + own * c;
      L.cover[o] = L.cover[o] * (1 - c) + c;
    }
  }
}

/** The atlas's texels, RGBA8 (row 0 is v = 0): the realistic look's texture (engine.ts makes it, with its mips: mips.ts). Pure, so it runs anywhere. */
export function leafAtlasPixels(): { data: Uint8Array; width: number; height: number } {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  const L: Layer = { tone: new Float32Array(CELL * CELL), own: new Float32Array(CELL * CELL), cover: new Float32Array(CELL * CELL) };
  for (let kind = 0; kind < LEAF_KINDS.length; kind++) {
    for (let v = 0; v < 2; v++) {
      const rnd = rng(7919 * (kind + 1) + 131 * v + 17);
      const shapes = [broadSpray, narrowSpray, needleSpray, smallSpray, frondSpray, pineSpray][kind](v, rnd);
      fit(shapes);
      L.tone.fill(0);
      L.own.fill(0);
      L.cover.fill(0);
      // (Each shape's own number from where it is in the list, not from the spray's run of numbers, which
      // laid the spray as it is.)
      shapes.forEach((s, n) => {
        const own = hash01(n, 7919 * (kind + 1) + 131 * v + 29);
        if (s.t === "stroke") drawStroke(L, s, own);
        else drawBlade(L, s, own);
      });
      // (Where nothing is drawn, the spray's mean tone, so the mips' edges do not darken.)
      const T = L.tone;
      const C = L.cover;
      let sum = 0;
      let wsum = 0;
      for (let n = 0; n < CELL * CELL; n++) {
        sum += T[n];
        wsum += C[n];
      }
      const mean = Math.min(1, wsum > 0 ? sum / wsum : LEAF);
      const { u0, v0 } = leafCell(kind, v);
      const ox = Math.round(u0 * WIDTH);
      const oy = Math.round(v0 * HEIGHT);
      for (let j = 0; j < CELL; j++) {
        let o = ((oy + j) * WIDTH + ox) * 4;
        for (let n = j * CELL, end = n + CELL; n < end; n++, o += 4) {
          const a = C[n];
          const k = (a * 255 + 0.5) | 0;
          const tone = k > 0 ? Math.min(1, T[n] / a) : mean;
          const t = (tone * 255 + 0.5) | 0;
          data[o] = t;
          data[o + 1] = k > 0 ? ((Math.min(1, L.own[n] / a) * 255 + 0.5) | 0) : 128;
          data[o + 2] = t;
          data[o + 3] = k;
        }
      }
    }
  }
  // (The empty cells of the last row: clear, at a leaf's tone, so a mip of the cells beside them does not darken.)
  const t = (LEAF * 255 + 0.5) | 0;
  for (let cell = LEAF_KINDS.length * 2; cell < COLS * ROWS; cell++) {
    const k = Math.floor(cell / 2);
    const ox = (2 * (k % 2) + (cell % 2)) * CELL;
    const oy = Math.floor(k / 2) * CELL;
    for (let j = 0; j < CELL; j++) {
      for (let o = ((oy + j) * WIDTH + ox) * 4, end = o + CELL * 4; o < end; o += 4) {
        data[o] = data[o + 2] = t;
        data[o + 1] = 128;
      }
    }
  }
  return { data, width: WIDTH, height: HEIGHT };
}
