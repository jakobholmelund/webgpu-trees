// The marks the painterly and the sculpted looks lay their crowns with, made
// here by arithmetic from nothing (no picture is loaded).
//
// Painterly: a cluster of small leaves, as a painter of stylized trees lays a
// clump: a few sprays of crisp leaves of the species' kind running out from a
// middle, each leaf its own tone and folded along its midrib (one half a
// little darker), casting a thin shadow on those under it, the sprays' leaves
// making a ragged, lobed outline. One row of the atlas to a kind of leaf
// (`LEAF_KINDS`): three clusters at each of three densities, the leaves
// smaller and more at each, so a dab carries leaves of about the same size in
// metres however big it is (`leafSize`).
//
// Sculpted: three soft lumpy discs, nearly flat in tone (the light is laid
// over them by their lobe, in the shader), and a sprig of two or three
// leaves to stand out of them here and there.
//
// Channels: red is the mark's tone (the shader multiplies the leaves' colour
// by it, as far as `strokes` says); green is a number of each leaf's own,
// 0..1, for the shader to vary the light leaf by leaf; blue is 1 on a sprig;
// alpha is coverage, antialiased by distance to the shape's edge. Where
// nothing is drawn the tone is the mark's mean, so the mips' edges do not
// darken, and no mark comes within a few texels of its cell's border.
//
// Plain arithmetic, no three: the tests read the pixels as they are.

import { hash01 } from "./variants.ts";

/** The kinds of leaf, by row (the same order as `LEAF_KIND_ROWS` in species.ts and `LEAF_KINDS` in leaves.ts). */
const KINDS = ["broad", "narrow", "needle", "small", "frond"] as const;

export const MARK_CELL = 256;
/**
 * How the painterly atlas's clusters are scaled, coarsest first: each density has three clusters across,
 * the leaves of each smaller (and more of them) than the one before. A dab picks the coarsest whose leaves
 * stay under the style's `leafSize` in metres (a big crown's big dabs carry many small leaves, not a few
 * leaves the size of a hand spread wide).
 */
export const PAINTERLY_DENSITIES = [1, 0.6, 0.36] as const;
/** Clusters of one density across. */
export const PAINTERLY_VARIANTS = 3;
/** The painterly atlas: three clusters to a density, three densities, across; a kind to a row. */
export const PAINTERLY_COLS = PAINTERLY_VARIANTS * PAINTERLY_DENSITIES.length;
/**
 * A kind's leaf at the coarsest density, as a share of its mark's half width: its length, the mean over its
 * cluster (a needle's is a bough's hanging needles').
 */
export const LEAF_SHARE: Readonly<Record<(typeof KINDS)[number], number>> = { broad: 0.42, narrow: 0.5, needle: 0.45, small: 0.245, frond: 0.675 };
/** A kind's leaf beside a broad leaf (`leafSize` is a broad leaf's): a frond is a palm's, metres long. */
export const LEAF_SIZE_OF: Readonly<Record<(typeof KINDS)[number], number>> = { broad: 1, narrow: 1.1, needle: 1.2, small: 0.6, frond: 5 };
export { KINDS as MARK_KINDS };
export const PAINTERLY_ROWS = KINDS.length;
/** The sculpted atlas: two by two. */
export const SCULPTED_COLS = 2;
export const SCULPTED_ROWS = 2;
/** The antialiased edge, in texels. */
const RAMP = 1.1;
/** How far inside its cell a mark keeps, as a share of the cell's half width. */
const REACH = 0.94;

/** A leaf blade: its base, which way its midrib runs, how long and how wide, its outline's shape. */
interface Leaf {
  x: number;
  y: number;
  ang: number;
  len: number;
  /** Greatest half width. */
  wid: number;
  /** Half width along it goes as u^p (1 - u)^q (widest at p / (p + q)), scaled to `wid` there. */
  p: number;
  q: number;
  /** How far its midrib bends aside by its tip, a share of its length. */
  bend: number;
  tone: number;
  /** A number of its own, 0..1 (the green channel). */
  own: number;
  /** 1 on a sprig (the blue channel). */
  sprig: number;
}

interface Layer {
  /** Texels across its square. */
  size: number;
  /** Tone, number and sprig, each premultiplied by coverage. */
  tone: Float32Array;
  own: Float32Array;
  sprig: Float32Array;
  cover: Float32Array;
}

function layer(size = MARK_CELL): Layer {
  const n = size * size;
  return { size, tone: new Float32Array(n), own: new Float32Array(n), sprig: new Float32Array(n), cover: new Float32Array(n) };
}

function rng(seed: number): () => number {
  let n = 0;
  return () => hash01(n++, seed);
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Draw a leaf over what is in the layer, with its thin shadow on what it lies over. */
function drawLeaf(L: Layer, f: Leaf): void {
  const CELL = L.size;
  const half = CELL / 2;
  const px = 1 / half;
  const peak = Math.pow(f.p / (f.p + f.q), f.p) * Math.pow(f.q / (f.p + f.q), f.q);
  const ca = Math.cos(f.ang);
  const sa = Math.sin(f.ang);
  // (Its box, with room for its shadow.)
  const pad = f.wid + f.len * Math.abs(f.bend) + 6 * px;
  const xs = [f.x, f.x + ca * f.len];
  const ys = [f.y, f.y + sa * f.len];
  const i0 = Math.max(0, Math.floor((Math.min(...xs) - pad + 1) * half));
  const i1 = Math.min(CELL - 1, Math.ceil((Math.max(...xs) + pad + 1) * half));
  const j0 = Math.max(0, Math.floor((Math.min(...ys) - pad + 1) * half));
  const j1 = Math.min(CELL - 1, Math.ceil((Math.max(...ys) + pad + 1) * half));
  const shadow = 4 * px;
  for (let j = j0; j <= j1; j++) {
    const y = (j + 0.5) / half - 1;
    for (let i = i0; i <= i1; i++) {
      const x = (i + 0.5) / half - 1;
      const dx = x - f.x;
      const dy = y - f.y;
      const s = dx * ca + dy * sa;
      const u = s / f.len;
      // (Across the midrib, bent aside towards its tip.)
      const t = -dx * sa + dy * ca - f.bend * f.len * u * u;
      let edge: number;
      if (u <= 0 || u >= 1) edge = -Math.max(-s, s - f.len, 0) - Math.abs(t);
      else edge = (f.wid * Math.pow(u, f.p) * Math.pow(1 - u, f.q)) / peak - Math.abs(t);
      const o = j * CELL + i;
      const a = clamp01(edge / (RAMP * px) + 0.5);
      if (a <= 0) {
        // (Just outside its edge: its shadow on what it lies over.)
        if (edge > -shadow && L.cover[o] > 0) {
          const k = 0.8 + 0.2 * clamp01(-edge / shadow);
          L.tone[o] *= k;
        }
        continue;
      }
      // (Folded along its midrib: one half a little darker; lighter towards its tip.)
      const fold = 0.89 + 0.11 * clamp01(t / (1.5 * px) + 0.5);
      const tone = f.tone * fold * (0.93 + 0.07 * u);
      L.tone[o] = L.tone[o] * (1 - a) + tone * a;
      L.own[o] = L.own[o] * (1 - a) + f.own * a;
      L.sprig[o] = L.sprig[o] * (1 - a) + f.sprig * a;
      L.cover[o] = L.cover[o] * (1 - a) + a;
    }
  }
}

/**
 * A kind's cluster: how many leaves stand out round its edge and how many fill its middle, how long they
 * are (a share of the mark's half width), how wide for their length, their outline, how far they bend.
 */
const SHAPES: Record<(typeof KINDS)[number], { rim: number; fill: number; len: [number, number]; wide: number; p: number; q: number; bend: number }> = {
  broad: { rim: 11, fill: 12, len: [0.36, 0.48], wide: 0.36, p: 0.8, q: 1.25, bend: 0.12 },
  narrow: { rim: 14, fill: 16, len: [0.42, 0.58], wide: 0.17, p: 0.75, q: 1.0, bend: 0.2 },
  needle: { rim: 26, fill: 16, len: [0.3, 0.5], wide: 0.08, p: 0.35, q: 1.0, bend: 0.08 },
  small: { rim: 20, fill: 30, len: [0.21, 0.28], wide: 0.46, p: 1, q: 1, bend: 0.05 },
  frond: { rim: 14, fill: 8, len: [0.55, 0.8], wide: 0.11, p: 0.7, q: 1.1, bend: 0.35 },
};

/**
 * A cluster of `kind` leaves, `scale` their size (below 1, smaller and more of them). Laid as a painter lays
 * one: an uneven mass of three to five round lobes, off its middle and of their own sizes, darker under the
 * leaves; leaves over it, each pointing out from its lobe's middle give or take, the outer ones laid last so
 * the outline is their tips standing a little out of the mass, all round. Lumpy and leafy at any density,
 * never a ring of tips pointing out like a star.
 */
function cluster(kind: (typeof KINDS)[number], seed: number, scale: number): Leaf[] {
  if (kind === "needle") return bough(seed, scale);
  const sh = SHAPES[kind];
  const rnd = rng(seed);
  const leafLen = () => (sh.len[0] + rnd() * (sh.len[1] - sh.len[0])) * scale;
  const meanLen = 0.5 * (sh.len[0] + sh.len[1]) * scale;
  const leafOf = (x: number, y: number, ang: number, len: number, tone: number): Leaf => {
    const fit = inside(x, y, ang, len);
    return { x, y, ang, len: len * fit, wid: len * fit * sh.wide, p: sh.p, q: sh.q, bend: (rnd() - 0.5) * 2 * sh.bend, tone, own: rnd(), sprig: 0 };
  };
  // (The mass: its lobes, each kept inside the mark with room for the leaves standing out of it.)
  const edge = REACH * (scale < 1 ? 0.86 : 1) - meanLen * 0.55;
  const lobes: { x: number; y: number; r: number }[] = [];
  const count = 3 + Math.floor(rnd() * 3);
  const turn = rnd() * Math.PI * 2;
  for (let k = 0; k < count; k++) {
    const a = turn + ((k + (rnd() - 0.5) * 0.7) / count) * Math.PI * 2;
    const r = edge * (0.42 + rnd() * 0.16);
    const d = Math.min(edge - r, edge * (0.22 + rnd() * 0.25));
    lobes.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r });
  }
  // (And one in the middle, so the lobes are one mass.)
  lobes.push({ x: 0, y: 0, r: edge * 0.45 });
  const lobeAt = (x: number, y: number): number => {
    let best = -1;
    let most = 0;
    lobes.forEach((l, k) => {
      const inside = 1 - Math.hypot(x - l.x, y - l.y) / l.r;
      if (inside > most) {
        most = inside;
        best = k;
      }
    });
    return best;
  };
  // (Its body: each lobe a round, darker shape under the leaves: where they leave it bare it shows as shade.)
  const back: Leaf[] = lobes.map((l) => {
    const ang = rnd() * Math.PI * 2;
    const len = l.r * 1.9;
    return { x: l.x - Math.cos(ang) * len * 0.5, y: l.y - Math.sin(ang) * len * 0.5, ang, len, wid: l.r * 0.88, p: 1, q: 1, bend: 0, tone: 0.66 + rnd() * 0.08, own: rnd(), sprig: 0 };
  });
  // (The leaves over it: as many as cover it about twice over, a leaf's area being its length by its width.)
  const area = (() => {
    let inside = 0;
    const n = 48;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (lobeAt(((i + 0.5) / n) * 2 - 1, ((j + 0.5) / n) * 2 - 1) >= 0) inside++;
    return (inside / (n * n)) * 4;
  })();
  const leafArea = meanLen * meanLen * sh.wide * 1.1;
  const total = Math.round(Math.min(700, (2 * area) / leafArea));
  const placed: { leaf: Leaf; out: number }[] = [];
  for (let k = 0; k < total; k++) {
    // (A point in the mass, by trying.)
    let x = 0;
    let y = 0;
    let lobe = -1;
    for (let tries = 0; tries < 24 && lobe < 0; tries++) {
      x = rnd() * 2 - 1;
      y = rnd() * 2 - 1;
      lobe = lobeAt(x, y);
    }
    if (lobe < 0) continue;
    const l = lobes[lobe];
    const from = Math.atan2(y - l.y, x - l.x);
    const out = Math.hypot(x - l.x, y - l.y) / l.r;
    // (Pointing out of its lobe, the more nearly the further out it is; near the middle, any way.)
    const ang = from + (rnd() - 0.5) * (2.6 - 1.6 * out);
    const len = leafLen() * (0.85 + 0.25 * out);
    placed.push({ leaf: leafOf(x - Math.cos(ang) * len * 0.35, y - Math.sin(ang) * len * 0.35, ang, len, 0.8 + rnd() * 0.2), out });
  }
  // (Inner ones first, the outer laid over them: give or take, so no ring shows.)
  placed.sort((a, b) => a.out + (rnd() - 0.5) * 0.5 - (b.out + (rnd() - 0.5) * 0.5));
  return [...back, ...placed.map((p) => p.leaf)];
}

/** How much of `len` a leaf from (x, y) pointing at `ang` may have and keep its tip (and a little bend) inside the mark's reach. */
function inside(x: number, y: number, ang: number, len: number): number {
  const reach = REACH - 0.03;
  const tx = Math.cos(ang) * len;
  const ty = Math.sin(ang) * len;
  let f = 1;
  if (x + tx > reach) f = Math.min(f, (reach - x) / tx);
  if (x + tx < -reach) f = Math.min(f, (-reach - x) / tx);
  if (y + ty > reach) f = Math.min(f, (reach - y) / ty);
  if (y + ty < -reach) f = Math.min(f, (-reach - y) / ty);
  return Math.max(0, f);
}

/**
 * A conifer's spray, as painters of stylized firs lay one: a bough across the mark, arching and drooping at
 * its ends, its needles hanging from it in a fringe, longer below than above, so a crown of them is tiers of
 * level boughs with ragged undersides. A darker fan of needles under it is its body. (`scale` below 1: two
 * smaller boughs, one over the other, for a gathered dab.)
 */
function bough(seed: number, scale: number): Leaf[] {
  const rnd = rng(seed);
  const leaves: Leaf[] = [];
  const sprays = scale < 1 ? [0.5, -0.05] : [0.38];
  const s = scale < 1 ? 0.62 : 1;
  for (const y0 of sprays) {
    const reach = REACH * 0.9 * (scale < 1 ? 0.95 : 1);
    const axis = (x: number) => y0 - 0.22 * s * (x / reach) ** 2;
    // (Its body: broad dark blades along the bough, hanging a little.)
    for (let k = 0; k < 5; k++) {
      const x = (k / 4 - 0.5) * reach * 1.2;
      const side = Math.sign(x) || (rnd() < 0.5 ? -1 : 1);
      const len = (0.62 + rnd() * 0.2) * s * (1 - 0.35 * Math.abs(x / reach));
      leaves.push({ x, y: axis(x) + 0.06 * s, ang: -Math.PI / 2 + side * (0.25 + rnd() * 0.4), len, wid: len * 0.42, p: 0.45, q: 1, bend: 0, tone: 0.64 + rnd() * 0.06, own: rnd(), sprig: 0 });
    }
    // (The needles: off both sides of the bough, those below hanging down and out, those above short and up.)
    const count = Math.round(64 * s);
    for (let k = 0; k < count; k++) {
      const x = (rnd() * 2 - 1) * reach;
      const out = x / reach;
      const below = rnd() < 0.72;
      const ang = below ? -Math.PI / 2 + out * 0.9 + (rnd() - 0.5) * 0.5 : Math.PI / 2 - out * 1.1 + (rnd() - 0.5) * 0.6;
      // (Longest in the middle of the bough, shorter to its tip; above it, a short brush.)
      const len = (below ? 0.3 + 0.5 * (1 - Math.abs(out) ** 2) * (0.4 + 0.6 * rnd()) : 0.1 + rnd() * 0.14) * s;
      const y = axis(x);
      const fit = inside(x, y, ang, len);
      leaves.push({ x, y, ang, len: len * fit, wid: len * fit * 0.09, p: 0.35, q: 1, bend: (rnd() - 0.5) * 0.15, tone: 0.8 + rnd() * 0.2, own: rnd(), sprig: 0 });
    }
    // (The bough's tip: a few needles on along it, so it ends in a point.)
    for (const side of [-1, 1]) {
      const x = side * reach * 0.82;
      for (let k = 0; k < 4; k++) {
        const ang = (side > 0 ? 0 : Math.PI) - side * (0.25 + rnd() * 0.5);
        const len = (0.12 + rnd() * 0.08) * s * inside(x, axis(x), ang, (0.12 + 0.08) * s);
        leaves.push({ x, y: axis(x), ang, len, wid: len * 0.1, p: 0.35, q: 1, bend: 0, tone: 0.85 + rnd() * 0.15, own: rnd(), sprig: 0 });
      }
    }
  }
  return leaves;
}

/** Write one cell's layer into an atlas at column `col`, row `row` (row 0 is v = 0). */
function put(data: Uint8Array, width: number, col: number, row: number, L: Layer): void {
  const CELL = L.size;
  let sum = 0;
  let wsum = 0;
  for (let n = 0; n < L.cover.length; n++) {
    sum += L.tone[n];
    wsum += L.cover[n];
  }
  const mean = wsum > 0 ? Math.min(1, sum / wsum) : 0.85;
  for (let j = 0; j < CELL; j++) {
    for (let i = 0; i < CELL; i++) {
      const n = j * CELL + i;
      const c = L.cover[n];
      const o = ((row * CELL + j) * width + col * CELL + i) * 4;
      const k = Math.round(clamp01(c) * 255);
      data[o] = Math.round(clamp01(k > 0 ? L.tone[n] / c : mean) * 255);
      data[o + 1] = Math.round(clamp01(k > 0 ? L.own[n] / c : 0.5) * 255);
      data[o + 2] = Math.round(clamp01(k > 0 ? L.sprig[n] / c : 0) * 255);
      data[o + 3] = k;
    }
  }
}

/** The painterly atlas's texels, RGBA8: a row to each kind of leaf, three clusters at each density. */
export function painterlyAtlasPixels(): { data: Uint8Array; width: number; height: number } {
  const width = MARK_CELL * PAINTERLY_COLS;
  const height = MARK_CELL * PAINTERLY_ROWS;
  const data = new Uint8Array(width * height * 4);
  KINDS.forEach((kind, row) => {
    for (let col = 0; col < PAINTERLY_COLS; col++) {
      const L = layer();
      const density = PAINTERLY_DENSITIES[Math.floor(col / PAINTERLY_VARIANTS)];
      for (const leaf of cluster(kind, 4099 * (row + 1) + 173 * col + 11, density)) drawLeaf(L, leaf);
      put(data, width, col, row, L);
    }
  });
  return { data, width, height };
}

/**
 * The kinds of conifer bough a sheet carries (geometry.ts `sheetPieces`): a fir's or a spruce's flat comb of
 * short needles, a cedar's lace of scales.
 */
export const SHEET_KINDS = ["fir", "scale"] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];
/** The sheet atlas: a column to each top (two firs, a cedar), its underside in the row above. */
export const SHEET_COLS = 3;
export const SHEET_ROWS = 2;
/** A sheet's picture, texels square: a bough a metre or two long is seen close to, under it. */
export const SHEET_CELL = 512;
/** A sheet kind's columns, its top's: a fir has two, chosen by a sheet's own number. */
export const SHEET_COLUMNS: Readonly<Record<SheetKind, readonly number[]>> = { fir: [0, 1], scale: [2] };

/**
 * A conifer's bough as a painter lays one, seen from above, for a sheet lying along it: its foot at the
 * bottom of the cell (y -1), its tip at the top. A twig up the middle, side shoots off it reaching forward,
 * the longest a third of the way out and shorter to a point at its tip, each combed with needles (a fir) or
 * laced with scales (a cedar); a darker body under the needles,
 * so a gap between shoots reads as the bough's shade and not the sky. `top` lays the needles over the
 * body, light; the underside lays the body over the needles, dark, the fringe of needles hanging round it.
 * Both sides are the same shapes, so a sheet's outline is the same seen from above or below.
 */
function sheetBough(kind: SheetKind, seed: number): { body: Leaf[]; needles: Leaf[] } {
  const rnd = rng(seed);
  const body: Leaf[] = [];
  const needles: Leaf[] = [];
  const foot = -0.92;
  const reach = 1.8;
  const ribAt = (s: number) => ({ x: 0.04 * Math.sin(s * 5 + seed), y: foot + reach * s });
  const needle = (x: number, y: number, ang: number, len: number, tone: number, own: number, wide = 0.09) => {
    const fit = inside(x, y, ang, len);
    if (fit <= 0.2) return;
    needles.push({ x, y, ang, len: len * fit, wid: len * fit * wide, p: 0.35, q: 1, bend: (rnd() - 0.5) * 0.12, tone, own, sprig: 0 });
  };
  // (The twig up the middle: a slender dark blade.)
  body.push({ x: 0, y: foot, ang: Math.PI / 2, len: reach * 0.97, wid: 0.028, p: 0.2, q: 0.6, bend: 0.02, tone: 0.55, own: rnd(), sprig: 0 });
  // (How far out a shoot reaches at s along the twig: widest a third of the way, to a point at the tip.)
  const envelope = (s: number) => (s < 0.3 ? 0.55 + 1.5 * s : 1 - 0.95 * ((s - 0.3) / 0.7) ** 1.2);
  // (A fir's or a cedar's: side shoots alternate off the twig, reaching forward, each combed with needles or
  // laced with scales; side shoots off the longer ones.)
  const scale = kind === "scale";
  const shoots: { x: number; y: number; a: number; len: number; own: number; shade: number }[] = [];
  shoots.push({ x: 0, y: foot, a: Math.PI / 2, len: reach * 0.95, own: rnd(), shade: 0.95 });
  let side = rnd() < 0.5 ? 1 : -1;
  for (let s = 0.05 + rnd() * 0.04; s < 0.9; s += 0.085 + rnd() * 0.035) {
    const p = ribAt(s);
    const len = (0.7 + rnd() * 0.25) * envelope(s) * (rnd() < 0.15 ? 0.7 : 1);
    const a = Math.PI / 2 - side * (0.9 + rnd() * 0.3);
    const own = rnd();
    const shade = 0.82 + rnd() * 0.18;
    shoots.push({ x: p.x, y: p.y, a, len, own, shade });
    if (len > 0.35) {
      for (const g of [0.35, 0.65]) {
        const q = { x: p.x + Math.cos(a) * len * g, y: p.y + Math.sin(a) * len * g };
        const s2 = rnd() < 0.5 ? 1 : -1;
        shoots.push({ x: q.x, y: q.y, a: a - s2 * (0.7 + rnd() * 0.3), len: len * (0.32 + rnd() * 0.12), own: Math.min(1, Math.max(0, own + (rnd() - 0.5) * 0.3)), shade: shade * (0.95 + rnd() * 0.08) });
      }
    }
    side = -side;
  }
  // (The body: dark strokes along under each shoot, inside the needles' reach, so between shoots is shade.)
  for (const sh of shoots) {
    const len = sh.len * 0.92;
    body.push({ x: sh.x, y: sh.y, ang: sh.a, len, wid: Math.min(0.09, len * 0.16), p: 0.5, q: 0.9, bend: 0, tone: 0.6 + rnd() * 0.06, own: rnd(), sprig: 0 });
  }
  for (const sh of shoots) {
    body.push({ x: sh.x, y: sh.y, ang: sh.a, len: sh.len, wid: 0.016, p: 0.2, q: 0.6, bend: 0, tone: 0.58, own: sh.own, sprig: 0 });
    const step = scale ? 0.045 : 0.032;
    for (let s = 0.04; s < 1; s += step * (0.8 + rnd() * 0.4)) {
      const x = sh.x + Math.cos(sh.a) * sh.len * s;
      const y = sh.y + Math.sin(sh.a) * sh.len * s;
      const taper = 1 - 0.5 * s * s;
      const own = Math.min(1, Math.max(0, sh.own + (rnd() - 0.5) * 0.25));
      if (scale) {
        // (A cedar's shoot: small overlapping scales either side, rounded, the spray flat and lacy.)
        for (const sd of [1, -1]) {
          const ang = sh.a - sd * (0.5 + rnd() * 0.3);
          const len = (0.09 + rnd() * 0.03) * taper;
          const fit = inside(x, y, ang, len);
          if (fit > 0.3) needles.push({ x, y, ang, len: len * fit, wid: len * fit * 0.34, p: 0.7, q: 1.1, bend: 0, tone: sh.shade * (0.88 + rnd() * 0.12), own, sprig: 0 });
        }
      } else {
        // (A fir's comb: short needles nearly square to the shoot and a little forward, both sides.)
        for (const sd of [1, -1]) {
          if (rnd() < 0.06) continue;
          needle(x, y, sh.a - sd * (0.9 + rnd() * 0.35), (0.11 + rnd() * 0.05) * taper, sh.shade * (0.86 + rnd() * 0.14), own, 0.12);
        }
      }
    }
    // (A tuft at its tip.)
    const tx = sh.x + Math.cos(sh.a) * sh.len;
    const ty = sh.y + Math.sin(sh.a) * sh.len;
    for (let k = 0; k < 4; k++) needle(tx, ty, sh.a + (k - 1.5) * 0.4 + (rnd() - 0.5) * 0.2, 0.06 + rnd() * 0.025, sh.shade, sh.own, scale ? 0.4 : 0.09);
  }
  return { body, needles };
}

/**
 * The sheet atlas's texels, RGBA8: each kind of bough's top in the lower row, its underside in the upper,
 * cell for cell the same outline. The top: needles over the body, light, the shoots each a tone of their
 * own. The underside: the dark body over the needles, so seen from below a bough is its shade with a fringe
 * of needles round it, as boughs overhead are.
 */
export function sheetAtlasPixels(): { data: Uint8Array; width: number; height: number } {
  const width = SHEET_CELL * SHEET_COLS;
  const height = SHEET_CELL * SHEET_ROWS;
  const data = new Uint8Array(width * height * 4);
  const cells: [SheetKind, number][] = [
    ["fir", 0],
    ["fir", 1],
    ["scale", 2],
  ];
  for (const [kind, col] of cells) {
    const { body, needles } = sheetBough(kind, 6007 + 389 * col);
    const top = layer(SHEET_CELL);
    for (const leaf of body) drawLeaf(top, leaf);
    for (const leaf of needles) drawLeaf(top, leaf);
    put(data, width, col, 0, top);
    const under = layer(SHEET_CELL);
    for (const leaf of needles) drawLeaf(under, { ...leaf, tone: leaf.tone * 0.74 });
    for (const leaf of body) drawLeaf(under, { ...leaf, tone: leaf.tone * 0.78 });
    put(data, width, col, 1, under);
  }
  return { data, width, height };
}

/** Smooth value noise, 0..1, on a grid of whole numbers. */
function noise(x: number, y: number, seed: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash01((a + 1000) * 7919 + (b + 1000), 911 + seed);
  return (h(i, j) * (1 - sx) + h(i + 1, j) * sx) * (1 - sy) + (h(i, j + 1) * (1 - sx) + h(i + 1, j + 1) * sx) * sy;
}

/** The sculpted atlas's texels, RGBA8: three soft lumpy discs and a sprig. */
export function sculptedAtlasPixels(): { data: Uint8Array; width: number; height: number } {
  const width = MARK_CELL * SCULPTED_COLS;
  const height = MARK_CELL * SCULPTED_ROWS;
  const data = new Uint8Array(width * height * 4);
  const half = MARK_CELL / 2;
  for (let m = 0; m < 3; m++) {
    const L = layer();
    const lobes: [number, number, number][] = [];
    for (let q = 0; q < 4; q++) lobes.push([3 + q, (0.045 / (1 + q * 0.6)) * (0.5 + hash01(m * 13 + q, 61)), hash01(m * 13 + q, 62) * Math.PI * 2]);
    for (let j = 0; j < MARK_CELL; j++) {
      const y = (j + 0.5) / half - 1;
      for (let i = 0; i < MARK_CELL; i++) {
        const x = (i + 0.5) / half - 1;
        const r = Math.hypot(x, y);
        const a = Math.atan2(y, x);
        let edge = 0.86;
        for (const [k, amp, ph] of lobes) edge += amp * Math.cos(k * a + ph);
        const alpha = clamp01(((edge - r) * half) / RAMP + 0.5);
        if (alpha <= 0) continue;
        // (Nearly flat, a faint mottle as on painted clay: its edge inside its lobe should not show.)
        const mottle = 0.05 * (noise(x * 9, y * 9, m) - 0.5) + 0.03 * (noise(x * 23, y * 23, m + 7) - 0.5);
        const tone = 0.95 + mottle;
        const n = j * MARK_CELL + i;
        L.tone[n] = tone * alpha;
        L.own[n] = 0.5 * alpha;
        L.cover[n] = alpha;
      }
    }
    put(data, width, m % 2, Math.floor(m / 2), L);
  }
  // (The sprig: two or three small leaves on a short stalk, standing up out of the mark's middle.)
  const S = layer();
  const rnd = rng(7121);
  const leaves = 3;
  for (let k = 0; k < leaves; k++) {
    const ang = Math.PI / 2 + (k - (leaves - 1) / 2) * 0.75 + (rnd() - 0.5) * 0.2;
    const len = 0.42 + rnd() * 0.12;
    drawLeaf(S, { x: 0, y: -0.05, ang, len, wid: len * 0.3, p: 0.8, q: 1.2, bend: (rnd() - 0.5) * 0.2, tone: 0.95, own: rnd(), sprig: 1 });
  }
  put(data, width, 1, 1, S);
  return { data, width, height };
}
