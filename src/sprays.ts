// The realistic look's leaf cards, from photographs: each species' own leaves (a sheet of single scanned
// leaves, scans.ts) laid on its own twigs, at their real size on the card, as its kind carries them: an oak's
// one to a node with a cluster at the tip, a maple's in pairs, a eucalyptus's few long sickles hanging from
// the twig's end, a willow's all along a hanging whip; a fir's or a cedar's whole scanned sprays, a pine's
// whole shoots; a palm's leaflets along its rachis or round its fan.
//
// Each species has a row of the atlas: three near cards (a short twig with a few leaves, about a third of a
// metre across: `nearCardHalf`) and one big card (a branch's end, a clump wide: the mid tier's cards, a
// conifer's sheets, the far dabs). Its texels are as leaves.ts draws them, so the shaders read either alike:
// red and blue a grey tone (the scan's lightness over its sheet's mean, lit a little by its own relief), green
// a number of each leaf's own (how thin it is: the scan's translucency, by leaf), alpha coverage.
//
// Plain arithmetic, no three: the tests read the cards as they are.

import { type Pixels } from "./mips.ts";
import { hash01 } from "./variants.ts";
import { type LeafSet, type LeafSprite, type ScanLook, nearCardHalf } from "./scans.ts";

/** Columns of a species' row: three near cards and the big one. */
export const SPRAY_COLS = 4;
export const NEAR_CARDS = 3;
export const BIG_CARD = 3;
/** A leaf's tone on average (as leaves.ts's), and a twig's. */
const LEAF = 0.6;
const TWIG = 0.33;
/** Where a near card's twig comes in: this share of the cell from its first row (geometry.ts `SPRAY_FOOT`: 0.8 of the half below the middle). */
const FOOT = 0.1;
/** Texels kept clear round a cell's edge, so its mips do not bleed into the next. */
const MARGIN = 6;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const srgbToLinear = (s: number) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
const LIN = new Float32Array(256).map((_, i) => srgbToLinear(i / 255));

/** A leaf sheet and its texels, decoded. */
export interface Sheet {
  set: LeafSet;
  albedo: Pixels;
  normal: Pixels;
}

interface Layer {
  n: number;
  tone: Float32Array;
  own: Float32Array;
  cover: Float32Array;
}

function rng(seed: number): () => number {
  let k = 0;
  return () => hash01(k++, seed);
}

// ---------------------------------------------------------------------------------------------------------------------
// Drawing: a twig as a tapered stroke, a leaf as its photograph, turned, scaled and bent onto the card.

function stroke(L: Layer, ax: number, ay: number, bx: number, by: number, ra: number, rb: number, tone: number): void {
  const n = L.n;
  const r = Math.max(ra, rb) + 1.5;
  const i0 = Math.max(MARGIN, Math.floor(Math.min(ax, bx) - r));
  const i1 = Math.min(n - 1 - MARGIN, Math.ceil(Math.max(ax, bx) + r));
  const j0 = Math.max(MARGIN, Math.floor(Math.min(ay, by) - r));
  const j1 = Math.min(n - 1 - MARGIN, Math.ceil(Math.max(ay, by) + r));
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  const len = Math.sqrt(len2);
  for (let j = j0; j <= j1; j++) {
    const py = j + 0.5 - ay;
    for (let i = i0; i <= i1; i++) {
      const px = i + 0.5 - ax;
      const t = clamp01((px * dx + py * dy) / len2);
      const ex = px - dx * t;
      const ey = py - dy * t;
      const rad = ra + (rb - ra) * t;
      const d = Math.sqrt(ex * ex + ey * ey);
      const c = clamp01((rad - d) / 1.2 + 0.5);
      if (c <= 0) continue;
      // (Round: lighter along one side.)
      const side = (dx * py - dy * px) / len / Math.max(rad, 0.5);
      const t1 = tone * (1 + 0.18 * Math.max(-1, Math.min(1, side)));
      const o = j * n + i;
      L.tone[o] = L.tone[o] * (1 - c) + t1 * c;
      L.own[o] = L.own[o] * (1 - c) + 0.2 * c;
      L.cover[o] = L.cover[o] * (1 - c) + c;
    }
  }
}

/** A leaf to lay: its stalk's end (texels), which way it points (radians, the picture's x and rows), and how long. */
interface Lay {
  x: number;
  y: number;
  ang: number;
  len: number;
  sprite: LeafSprite;
  /** Its width over the scan's; its sickle bend (a share of its length, to its left); mirrored or not. */
  width: number;
  bend: number;
  flip: boolean;
  tone: number;
  own: number;
}

/** Bilinear sample of a sheet's channel k at (x, y) texels; 0 off the sheet. */
function sample(p: Pixels, x: number, y: number, k: number): number {
  const x0 = Math.floor(x - 0.5);
  const y0 = Math.floor(y - 0.5);
  const fx = x - 0.5 - x0;
  const fy = y - 0.5 - y0;
  let s = 0;
  for (let q = 0; q < 4; q++) {
    const xx = x0 + (q & 1);
    const yy = y0 + (q >> 1);
    if (xx < 0 || yy < 0 || xx >= p.width || yy >= p.height) continue;
    s += p.data[(yy * p.width + xx) * 4 + k] * ((q & 1 ? fx : 1 - fx) * (q >> 1 ? fy : 1 - fy));
  }
  return s / 255;
}

/** Its box on the card, and whether all of it is inside the card's clear margin. */
function footprint(L: Layer, l: Lay): { i0: number; i1: number; j0: number; j1: number; inside: boolean } {
  const s = l.sprite;
  const sl = Math.hypot(s.tip[0] - s.base[0], s.tip[1] - s.base[1]) || 1;
  const k = l.len / sl;
  const half = (Math.max(s.w, s.h) * k * Math.max(1, l.width)) / 2 + Math.abs(l.bend) * l.len + 2;
  const cx = l.x + Math.cos(l.ang) * l.len * 0.5;
  const cy = l.y + Math.sin(l.ang) * l.len * 0.5;
  const r = Math.min(half, l.len * 0.5 + (s.w * k * l.width) / 2 + Math.abs(l.bend) * l.len + 2);
  const i0 = Math.floor(cx - r);
  const i1 = Math.ceil(cx + r);
  const j0 = Math.floor(cy - r);
  const j1 = Math.ceil(cy + r);
  const n = L.n;
  return { i0, i1, j0, j1, inside: i0 >= MARGIN && j0 >= MARGIN && i1 <= n - 1 - MARGIN && j1 <= n - 1 - MARGIN };
}

function leaf(L: Layer, sh: Sheet, l: Lay, shadow: number): void {
  const n = L.n;
  const s = l.sprite;
  const ox = s.x;
  const oy = s.y;
  // (The leaf's own frame on its sheet: up its midrib from its stalk's end, and across to its right.)
  const ax = s.tip[0] - s.base[0];
  const ay = s.tip[1] - s.base[1];
  const sl = Math.hypot(ax, ay) || 1;
  const ux = ax / sl;
  const uy = ay / sl;
  const rx = -uy;
  const ry = ux;
  const k = l.len / sl;
  const da = [Math.cos(l.ang), Math.sin(l.ang)];
  const fl = l.flip ? -1 : 1;
  const dc = [-da[1] * fl, da[0] * fl];
  const box = footprint(L, l);
  const i0 = Math.max(MARGIN, box.i0);
  const i1 = Math.min(n - 1 - MARGIN, box.i1);
  const j0 = Math.max(MARGIN, box.j0);
  const j1 = Math.min(n - 1 - MARGIN, box.j1);
  const meanL = Math.max(0.02, sh.set.meanLinear[0] * 0.2126 + sh.set.meanLinear[1] * 0.7152 + sh.set.meanLinear[2] * 0.0722);
  /** Where on the sheet a texel of the card falls (or null off the leaf's box). */
  const toSheet = (px: number, py: number): [number, number] | null => {
    const a = px * da[0] + py * da[1];
    const u = a / l.len;
    const c = px * dc[0] + py * dc[1] - l.bend * l.len * u * u;
    const along = a / k;
    const across = c / (k * l.width);
    const sx = s.base[0] + ux * along + rx * across;
    const sy = s.base[1] + uy * along + ry * across;
    if (sx < 0 || sy < 0 || sx > s.w || sy > s.h) return null;
    return [ox + sx, oy + sy];
  };
  // (Its shadow on what is already drawn: down and to the right a little, soft.)
  if (shadow > 0) {
    for (let j = j0; j <= j1 + Math.ceil(shadow); j++) {
      if (j > n - 1 - MARGIN) break;
      for (let i = i0; i <= i1 + Math.ceil(shadow * 0.4); i++) {
        if (i > n - 1 - MARGIN) break;
        const o = j * n + i;
        if (L.cover[o] <= 0) continue;
        const at = toSheet(i + 0.5 - l.x - shadow * 0.4, j + 0.5 - l.y - shadow);
        if (!at) continue;
        const c = sample(sh.albedo, at[0], at[1], 3);
        if (c > 0) L.tone[o] *= 1 - 0.3 * c;
      }
    }
  }
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const at = toSheet(i + 0.5 - l.x, j + 0.5 - l.y);
      if (!at) continue;
      const c = sample(sh.albedo, at[0], at[1], 3);
      if (c <= 0.004) continue;
      // (The texel's lightness, from the nearest sheet texel's colour: its photograph's detail.)
      const xi = Math.min(sh.albedo.width - 1, Math.max(0, Math.floor(at[0])));
      const yi = Math.min(sh.albedo.height - 1, Math.max(0, Math.floor(at[1])));
      const q = (yi * sh.albedo.width + xi) * 4;
      const d = sh.albedo.data;
      const lum = 0.2126 * LIN[d[q]] + 0.7152 * LIN[d[q + 1]] + 0.0722 * LIN[d[q + 2]];
      // (Its relief, turned with it: lit a little from the card's top, so a vein or a curl shows.)
      const nx = sample(sh.normal, at[0], at[1], 0) * 2 - 1;
      const ny = sample(sh.normal, at[0], at[1], 1) * 2 - 1;
      const thin = sample(sh.normal, at[0], at[1], 2);
      // (The normal's x runs across the leaf, its y up the leaf to its tip; on the card: across dc, along da.
      // Lit from the card's far end (+rows), a little across.)
      const px = (nx * dc[0] + ny * da[0]) * fl;
      const py = nx * dc[1] + ny * da[1];
      const relief = 1 + 0.35 * (px * 0.35 + py * 0.6);
      const tone = Math.min(1, LEAF * l.tone * Math.pow(lum / meanL, 0.85) * relief);
      const o = j * n + i;
      L.tone[o] = L.tone[o] * (1 - c) + tone * c;
      L.own[o] = L.own[o] * (1 - c) + clamp01(l.own * 0.55 + thin * 0.45) * c;
      L.cover[o] = L.cover[o] * (1 - c) + c;
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The sprays: built in metres from the twig's foot (+y along the card, away from its foot), then laid out.

/** A twig: its points (m), and how thick it is at its foot and its tip (m). */
interface Twig {
  pts: { x: number; y: number; a: number }[];
  r0: number;
  r1: number;
}

/** Leaves to lay, in metres, before they are put on the card. */
interface LeafAt {
  x: number;
  y: number;
  ang: number;
  len: number;
}

function grow(x: number, y: number, a: number, len: number, curl: number, rnd: () => number, n = 8, wobble = 0.08): Twig["pts"] {
  const pts = [{ x, y, a }];
  for (let i = 1; i <= n; i++) {
    a += curl / n + (rnd() - 0.5) * wobble;
    x += Math.cos(a) * (len / n);
    y += Math.sin(a) * (len / n);
    pts.push({ x, y, a });
  }
  return pts;
}

function along(pts: Twig["pts"], s: number): { x: number; y: number; a: number } {
  const f = clamp01(s) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const t = f - i;
  return { x: lerp(pts[i].x, pts[i + 1].x, t), y: lerp(pts[i].y, pts[i + 1].y, t), a: pts[i + 1].a };
}

const UP = Math.PI / 2;

/** A near card's spray of `look`'s leaves, `extent` metres across: a short twig or two and their leaves, in metres from its foot. */
function nearSpray(look: ScanLook, extent: number, rnd: () => number): { twigs: Twig[]; leaves: LeafAt[] } {
  const L = look.leafCm / 100;
  const twigs: Twig[] = [];
  const leaves: LeafAt[] = [];
  const size = () => L * (0.82 + rnd() * 0.3);
  const thick = Math.max(0.0012, L * 0.025);
  const kind = look.spray;
  if (kind === "sprays" || kind === "tufts") {
    // (A short bare stem, and off it the sprays (or shoots) fanning out, the middle one last, on top.)
    const stem = extent * 0.12;
    twigs.push({ pts: grow(0, 0, UP, stem, 0, rnd, 2, 0.02), r0: thick * 1.6, r1: thick * 1.2 });
    const n = 4 + Math.floor(rnd() * 2);
    for (let k = n - 1; k >= 0; k--) {
      const side = k % 2 ? 1 : -1;
      const ang = UP + (k === 0 ? (rnd() - 0.5) * 0.2 : side * (0.3 + 0.22 * Math.ceil(k / 2) + rnd() * 0.15));
      const at = k === 0 ? stem : stem * (0.3 + 0.7 * rnd());
      leaves.push({ x: 0, y: at, ang, len: Math.min(extent * 0.78, size() * (k === 0 ? 1.05 : 0.85 - 0.08 * Math.ceil(k / 2))) });
    }
    return { twigs, leaves };
  }
  const reach = extent * 0.72;
  const main = grow(0, 0, UP + (rnd() - 0.5) * 0.25, reach * (kind === "hanging" ? 0.55 : 1), (rnd() - 0.5) * 0.5, rnd, 10, 0.05);
  twigs.push({ pts: main, r0: thick * 1.4, r1: thick * 0.7 });
  const shoots: { pts: Twig["pts"]; len: number }[] = [{ pts: main, len: reach }];
  if (kind === "alternate" || kind === "opposite") {
    // (Two shorter shoots off the first, one to either side, so the card is a little twig of leaves and not one
    // row of them.)
    let side = rnd() < 0.5 ? 1 : -1;
    for (const at of [0.16 + rnd() * 0.08, 0.36 + rnd() * 0.08, 0.56 + rnd() * 0.08]) {
      const p = along(main, at);
      const len = reach * (0.42 + rnd() * 0.2) * (1.15 - at * 0.6);
      const pts = grow(p.x, p.y, p.a + side * (0.6 + rnd() * 0.3), len, -side * 0.3, rnd, 6, 0.06);
      twigs.push({ pts, r0: thick, r1: thick * 0.6 });
      shoots.push({ pts, len });
      side = -side;
    }
  }
  for (const sh of shoots) {
    const first = sh === shoots[0];
    if (kind === "alternate" || kind === "opposite") {
      // (A leaf at each node, to either side in turn (or a pair), set off from the shoot and forward; nodes
      // closer towards the tip, and a few leaves gathered at it.)
      let s = (first ? 0.22 : 0.12) + rnd() * 0.06;
      let side = rnd() < 0.5 ? 1 : -1;
      const gap = Math.max(0.12, (L * 0.42) / sh.len);
      const per = look.perSpray ? Math.max(1, look.perSpray / 8) : 1;
      while (s < 0.92) {
        const p = along(sh.pts, s);
        for (const sd of kind === "opposite" ? [1, -1] : [(side = -side)]) {
          leaves.push({ x: p.x, y: p.y, ang: p.a + sd * (0.55 + rnd() * 0.45), len: size() * (1 - 0.15 * s) });
        }
        s += (gap / per) * (0.8 + rnd() * 0.4) * (1 - 0.35 * s);
      }
      const tip = sh.pts[sh.pts.length - 1];
      const n = kind === "opposite" ? 3 : 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) leaves.push({ x: tip.x, y: tip.y, ang: tip.a + (k - (n - 1) / 2) * 0.45 + (rnd() - 0.5) * 0.2, len: size() * 0.95 });
    } else if (kind === "hanging") {
      // (A few long leaves from the shoot's last stretch, hanging on with it, sickle-curved, some crossing.)
      const n = look.perSpray ?? 6;
      for (let k = 0; k < n; k++) {
        const p = along(sh.pts, 0.35 + 0.65 * (k / Math.max(1, n - 1)) + (rnd() - 0.5) * 0.08);
        leaves.push({ x: p.x, y: p.y, ang: p.a + (rnd() - 0.5) * 0.9, len: size() * 1.05 });
      }
    } else {
      // (Weeping: narrow leaves all along the hanging shoot, close to it, pointing on down it.)
      const gap = Math.max(0.035, (L * 0.32) / sh.len);
      let side = 1;
      for (let s = 0.06 + rnd() * 0.04; s < 0.97; s += gap * (0.8 + rnd() * 0.4)) {
        const p = along(sh.pts, s);
        side = -side;
        leaves.push({ x: p.x, y: p.y, ang: p.a + side * (0.28 + rnd() * 0.3), len: size() * (0.85 + 0.15 * (1 - s)) });
      }
    }
  }
  return { twigs, leaves };
}

/**
 * A big card's spray: a branch's end `extent` metres long, side shoots off it, and all along them its near
 * sprays (`near` metres across each), turned their own ways: as many leaves as a clump of the tree carries.
 */
function bigSpray(look: ScanLook, extent: number, near: number, rnd: () => number): { twigs: Twig[]; leaves: LeafAt[] } {
  const twigs: Twig[] = [];
  const leaves: LeafAt[] = [];
  const kind = look.spray;
  const thick = Math.max(0.003, (look.leafCm / 100) * 0.04);
  const hangs = kind === "hanging" || kind === "weeping";
  const reach = extent * 0.8;
  const main = grow(0, 0, UP + (rnd() - 0.5) * 0.2, reach, (rnd() - 0.5) * 0.4, rnd, 12, 0.04);
  twigs.push({ pts: main, r0: thick * 2.2, r1: thick * 0.8 });
  const shoots: Twig["pts"][] = [main];
  let side = rnd() < 0.5 ? 1 : -1;
  for (let f = 0.05 + rnd() * 0.03; f < 0.88; f += 0.075 * (0.8 + rnd() * 0.4)) {
    const p = along(main, f);
    const off = hangs ? 0.2 + rnd() * 0.3 : 0.65 + (0.6 - f) * 0.5 + rnd() * 0.3;
    const len = reach * (hangs ? 0.7 - f * 0.3 : 0.55 - f * 0.3) * (0.8 + rnd() * 0.4);
    const pts = grow(p.x, p.y, p.a + side * off, len, -side * (0.15 + rnd() * 0.3), rnd, 6, 0.06);
    twigs.push({ pts, r0: thick * 1.3, r1: thick * 0.6 });
    shoots.push(pts);
    side = -side;
  }
  // (The sprays along every shoot, about half a spray apart, to either side in turn, the last at its tip.)
  for (const pts of shoots) {
    const len = pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
    // (A conifer's sprays and shoots closer: a bough's needles are a dense comb.)
    const gap = (near * (kind === "sprays" || kind === "tufts" ? 0.17 : 0.3)) / Math.max(len, 1e-3);
    let sd = rnd() < 0.5 ? 1 : -1;
    for (let s = 0.12 + rnd() * 0.08; s <= 1.001; s += gap * (0.75 + rnd() * 0.5)) {
      const p = along(pts, Math.min(1, s));
      sd = -sd;
      const turn = p.a - UP + (s > 0.97 ? (rnd() - 0.5) * 0.3 : sd * (hangs ? 0.15 + rnd() * 0.3 : 0.5 + rnd() * 0.5));
      const k = 0.75 + rnd() * 0.35;
      const c = Math.cos(turn);
      const sn = Math.sin(turn);
      const one = nearSpray(look, near, rnd);
      for (const t of one.twigs) twigs.push({ pts: t.pts.map((q) => ({ x: p.x + (q.x * c - q.y * sn) * k, y: p.y + (q.x * sn + q.y * c) * k, a: q.a + turn })), r0: t.r0 * k, r1: t.r1 * k });
      for (const l of one.leaves) leaves.push({ x: p.x + (l.x * c - l.y * sn) * k, y: p.y + (l.x * sn + l.y * c) * k, ang: l.ang + turn, len: l.len * k });
    }
  }
  return { twigs, leaves };
}

/** A palm's leaf, fitted to the card: leaflets along a rachis (`pinnate`), or segments round a fan. */
function frond(look: ScanLook, rnd: () => number): { twigs: Twig[]; leaves: LeafAt[] } {
  const twigs: Twig[] = [];
  const leaves: LeafAt[] = [];
  if (look.spray === "pinnate") {
    const len = 1;
    const rachis = grow(0, 0, UP + (rnd() - 0.5) * 0.06, len, (rnd() - 0.5) * 0.15, rnd, 12, 0.01);
    twigs.push({ pts: rachis, r0: 0.012, r1: 0.004 });
    for (const sd of [1, -1]) {
      for (let s = 0.08 + rnd() * 0.01; s < 0.98; s += 0.016 + rnd() * 0.006) {
        if (rnd() < 0.05) continue;
        const p = along(rachis, s);
        const env = s < 0.3 ? 0.4 + 0.6 * Math.sin(((s - 0.08) / 0.22) * (Math.PI / 2)) : 1 - 0.78 * Math.pow((s - 0.3) / 0.7, 1.5);
        const spread = (rnd() < 0.5 ? 0.82 : 1.1) + (rnd() - 0.5) * 0.16;
        leaves.push({ x: p.x, y: p.y, ang: p.a + sd * spread * (1 - 0.3 * s * s), len: 0.5 * env * (0.82 + rnd() * 0.3) });
      }
    }
  } else {
    const pet = grow(0, 0, UP, 0.38, (rnd() - 0.5) * 0.05, rnd, 6, 0.01);
    twigs.push({ pts: pet, r0: 0.014, r1: 0.011 });
    const h = pet[pet.length - 1];
    const n = 34 + Math.floor(rnd() * 5);
    const from = (-10 * Math.PI) / 180;
    const d = ((200 * Math.PI) / 180) / n;
    for (let i = 0; i < n; i++) {
      const a = from + d * (i + 0.5) + (rnd() - 0.5) * 0.25 * d;
      leaves.push({ x: h.x, y: h.y, ang: a, len: 0.62 * (0.74 + 0.26 * Math.max(0, Math.sin(a))) * (0.93 + rnd() * 0.12) });
    }
  }
  return { twigs, leaves };
}

/**
 * Draw one card of a species' leaves into `out` (RGBA8, as leaves.ts's atlas), its cell `n` texels square at
 * (ox, oy): a near card (`big` false, `extent` its width in metres, its twig coming in near its first row),
 * or its big card. `seed` makes each card its own.
 */
export function drawSprayCard(out: Pixels, ox: number, oy: number, n: number, sheet: Sheet, look: ScanLook, extent: number, big: boolean, seed: number): void {
  const rnd = rng(seed);
  const whole = look.spray === "whole";
  const palm = look.spray === "pinnate" || look.spray === "fan" || whole;
  // (A whole leaf (a Canary palm's frond) is laid at its size: the card, one of the clumps along the frond, shows
  // the stretch of it the card covers, a third to two thirds of the way out.)
  const section = whole ? 0.3 + rnd() * 0.35 : 0;
  const { twigs, leaves } = whole ? { twigs: [] as Twig[], leaves: [{ x: 0, y: -section * (look.leafCm / 100), ang: UP + (rnd() - 0.5) * 0.06, len: look.leafCm / 100 }] } : palm ? frond(look, rnd) : big ? bigSpray(look, extent, 2 * nearCardHalf(look), rnd) : nearSpray(look, extent, rnd);
  const L: Layer = { n, tone: new Float32Array(n * n), own: new Float32Array(n * n), cover: new Float32Array(n * n) };
  // (Metres to texels: a near card at its real size, its foot near its first row; a big card or a palm's
  // leaf fitted inside its cell.)
  let k = n / extent;
  let fx = n / 2;
  let fy = n * FOOT;
  if (whole) fy = n / 2;
  else if (big || palm) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    const add = (x: number, y: number) => {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    };
    for (const t of twigs) for (const p of t.pts) add(p.x, p.y);
    for (const l of leaves) {
      add(l.x, l.y);
      add(l.x + Math.cos(l.ang) * l.len, l.y + Math.sin(l.ang) * l.len);
    }
    const pad = palm ? 0.04 : (look.leafCm / 100) * 0.3;
    const room = n - 2 * MARGIN - 4;
    const fit = Math.min(room / (x1 - x0 + 2 * pad), room / (y1 - y0 + 2 * pad));
    // (A big card keeps its leaves at their size in metres where it can; only a branch too big for it shrinks.)
    k = palm ? fit : Math.min(k, fit);
    fx = n / 2 - ((x0 + x1) / 2) * k;
    fy = n / 2 - ((y0 + y1) / 2) * k;
  }
  const X = (x: number) => fx + x * k;
  const Y = (y: number) => fy + y * k;
  for (const t of twigs) {
    for (let i = 1; i < t.pts.length; i++) {
      const f0 = (i - 1) / (t.pts.length - 1);
      const f1 = i / (t.pts.length - 1);
      stroke(L, X(t.pts[i - 1].x), Y(t.pts[i - 1].y), X(t.pts[i].x), Y(t.pts[i].y), Math.max(0.7, lerp(t.r0, t.r1, f0) * k), Math.max(0.6, lerp(t.r0, t.r1, f1) * k), TWIG);
    }
  }
  const sprites = sheet.set.sprites;
  // (Its leaves in a shuffled order, so which lies over which is not by where they are.)
  const order = leaves.map((_, i) => i);
  if (!(look.spray === "sprays" || look.spray === "tufts")) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  const shadow = Math.max(1, Math.min(4, n / 160));
  for (const i of order) {
    const l = leaves[i];
    const sprite = sprites[Math.floor(rnd() * sprites.length) % sprites.length];
    const lay: Lay = {
      x: X(l.x),
      y: Y(l.y),
      ang: l.ang,
      len: l.len * k * (0.75 + 0.25 * sprite.size),
      sprite,
      width: look.leafWidth ?? 1,
      bend: (look.leafBend ?? 0) * (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.6) + (rnd() - 0.5) * 0.04,
      flip: rnd() < 0.5,
      tone: 0.9 + rnd() * 0.2,
      own: rnd(),
    };
    // (A leaf that would reach past the card's edge is made smaller, or left off: cut by the edge, it shows a
    // straight line.)
    let fits = whole || footprint(L, lay).inside;
    for (let t = 0; t < 3 && !fits; t++) {
      lay.len *= 0.85;
      fits = footprint(L, lay).inside;
    }
    if (!fits) continue;
    leaf(L, sheet, lay, palm ? shadow * 0.5 : shadow);
  }
  // (Where nothing is drawn, the card's mean tone, so its mips' edges do not darken.)
  let sum = 0;
  let wsum = 0;
  for (let o = 0; o < n * n; o++) {
    sum += L.tone[o];
    wsum += L.cover[o];
  }
  const mean = Math.min(1, wsum > 0 ? sum / wsum : LEAF);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      const p = ((oy + j) * out.width + ox + i) * 4;
      // (A frond's stretch fades out at the card's edges, where its leaflets run on past it.)
      const edge = Math.min(i, j, n - 1 - i, n - 1 - j) - MARGIN;
      const fade = whole ? clamp01(edge / (n * 0.08)) : 1;
      const a = L.cover[o] * fade * (2 - fade);
      const cov = (a * 255 + 0.5) | 0;
      const tone = cov > 0 ? Math.min(1, L.tone[o] / L.cover[o]) : mean;
      const t = (tone * 255 + 0.5) | 0;
      out.data[p] = t;
      out.data[p + 1] = cov > 0 ? ((Math.min(1, L.own[o] / L.cover[o]) * 255 + 0.5) | 0) : 128;
      out.data[p + 2] = t;
      out.data[p + 3] = cov;
    }
  }
}

/** A species' row: its three near cards and its big card. `bigExtent`: how wide its big card is (m). */
export function drawSprayRow(out: Pixels, row: number, n: number, sheet: Sheet, look: ScanLook, bigExtent: number, seed: number): void {
  // (A palm's near cards are the drawn ones' size: a clump's radius and a little less (geometry.ts `cardPieces`),
  // a big card's 0.8 / 1.45 of it.)
  const near = 2 * nearCardHalf(look) || bigExtent * (0.8 / 1.45);
  for (let c = 0; c < SPRAY_COLS; c++) {
    const big = c === BIG_CARD;
    drawSprayCard(out, c * n, row * n, n, sheet, look, big && look.spray !== "whole" ? bigExtent : near, big, seed * 31 + c * 7 + 3);
  }
}
