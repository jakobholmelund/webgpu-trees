// The marks the painterly and the sculpted looks lay their crowns with, made
// here by arithmetic from nothing (no picture is loaded).
//
// Painterly: a cluster of small leaves, as a painter of stylized trees lays a
// clump: five to thirty crisp leaves of the species' kind fanned out from a
// middle, each its own tone and folded along its midrib (one half a little
// darker), casting a thin shadow on those under it, their tips standing out
// of the cluster's outline one by one. One row of the atlas to a kind of
// leaf (`LEAF_KINDS`): three clusters, and a fourth of many smaller leaves for
// the broad dabs a mid or far crown is gathered into.
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
/** The painterly atlas: four clusters to a kind across, a kind to a row. */
export const PAINTERLY_COLS = 4;
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
  /** Tone, number and sprig, each premultiplied by coverage. */
  tone: Float32Array;
  own: Float32Array;
  sprig: Float32Array;
  cover: Float32Array;
}

function layer(): Layer {
  const n = MARK_CELL * MARK_CELL;
  return { tone: new Float32Array(n), own: new Float32Array(n), sprig: new Float32Array(n), cover: new Float32Array(n) };
}

function rng(seed: number): () => number {
  let n = 0;
  return () => hash01(n++, seed);
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Draw a leaf over what is in the layer, with its thin shadow on what it lies over. */
function drawLeaf(L: Layer, f: Leaf): void {
  const half = MARK_CELL / 2;
  const px = 1 / half;
  const peak = Math.pow(f.p / (f.p + f.q), f.p) * Math.pow(f.q / (f.p + f.q), f.q);
  const ca = Math.cos(f.ang);
  const sa = Math.sin(f.ang);
  // (Its box, with room for its shadow.)
  const pad = f.wid + f.len * Math.abs(f.bend) + 6 * px;
  const xs = [f.x, f.x + ca * f.len];
  const ys = [f.y, f.y + sa * f.len];
  const i0 = Math.max(0, Math.floor((Math.min(...xs) - pad + 1) * half));
  const i1 = Math.min(MARK_CELL - 1, Math.ceil((Math.max(...xs) + pad + 1) * half));
  const j0 = Math.max(0, Math.floor((Math.min(...ys) - pad + 1) * half));
  const j1 = Math.min(MARK_CELL - 1, Math.ceil((Math.max(...ys) + pad + 1) * half));
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
      const o = j * MARK_CELL + i;
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
 * A cluster of `kind` leaves, `scale` their size (the fourth column's are smaller and more). The rim's leaves
 * first, each pointing out with its tip near the mark's edge, so the cluster's outline is leaf tips; then
 * the middle filled with leaves pointing every way, some of the rim's laid again over them.
 */
function cluster(kind: (typeof KINDS)[number], seed: number, scale: number): Leaf[] {
  const sh = SHAPES[kind];
  const rnd = rng(seed);
  const many = scale < 1 ? 0.75 / (scale * scale) : 1;
  const leafOf = (x: number, y: number, ang: number, len: number, tone: number): Leaf => ({ x, y, ang, len, wid: len * sh.wide, p: sh.p, q: sh.q, bend: (rnd() - 0.5) * 2 * sh.bend, tone, own: rnd(), sprig: 0 });
  // (Its body: a few broad, darker shapes under the leaves, from its middle, so the cluster is a mass with
  // leaves on it and not a scatter: the leaves deeper in, in their own shade.)
  const back: Leaf[] = [];
  const bodies = 6;
  for (let k = 0; k < bodies; k++) {
    const ang = ((k + rnd() * 0.6) / bodies) * Math.PI * 2;
    const len = REACH * (scale < 1 ? 0.78 : 0.7) * (0.85 + rnd() * 0.15);
    back.push({ x: 0, y: 0, ang, len, wid: len * 0.42, p: 0.6, q: 1.1, bend: (rnd() - 0.5) * 0.2, tone: 0.66 + rnd() * 0.08, own: rnd(), sprig: 0 });
  }
  const rim = Math.round(sh.rim * many);
  const rimLeaves: Leaf[] = [];
  for (let k = 0; k < rim; k++) {
    const len = (sh.len[0] + rnd() * (sh.len[1] - sh.len[0])) * scale;
    const at = ((k + rnd() * 0.8) / rim) * Math.PI * 2;
    const ang = at + (rnd() - 0.5) * 0.7;
    // (Its tip out near the edge, a little in or out of it.)
    const tip = REACH * (scale < 1 ? 0.55 + rnd() * 0.42 : 0.8 + rnd() * 0.2);
    const x = Math.cos(at) * tip - Math.cos(ang) * len;
    const y = Math.sin(at) * tip - Math.sin(ang) * len;
    rimLeaves.push(leafOf(x, y, ang, len, 0.8 + rnd() * 0.2));
  }
  const fill = Math.round(sh.fill * many);
  const middle: Leaf[] = [];
  for (let k = 0; k < fill; k++) {
    const len = (sh.len[0] + rnd() * (sh.len[1] - sh.len[0])) * scale * 0.9;
    const at = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * Math.max(0, REACH * (scale < 1 ? 0.8 : 0.72) - len);
    const ang = r > 0.05 ? at + (rnd() - 0.5) * 1.6 : rnd() * Math.PI * 2;
    middle.push(leafOf(Math.cos(at) * r, Math.sin(at) * r, ang, len, 0.82 + rnd() * 0.18));
  }
  // (Each group laid in no order of its own; a third of the rim's leaves over the middle's.)
  const shuffle = (list: Leaf[]) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  shuffle(rimLeaves);
  const over = rimLeaves.splice(0, Math.floor(rimLeaves.length / 3));
  return [...back, ...rimLeaves, ...shuffle(middle), ...over];
}

/** Write one cell's layer into an atlas at column `col`, row `row` (row 0 is v = 0). */
function put(data: Uint8Array, width: number, col: number, row: number, L: Layer): void {
  let sum = 0;
  let wsum = 0;
  for (let n = 0; n < L.cover.length; n++) {
    sum += L.tone[n];
    wsum += L.cover[n];
  }
  const mean = wsum > 0 ? Math.min(1, sum / wsum) : 0.85;
  for (let j = 0; j < MARK_CELL; j++) {
    for (let i = 0; i < MARK_CELL; i++) {
      const n = j * MARK_CELL + i;
      const c = L.cover[n];
      const o = ((row * MARK_CELL + j) * width + col * MARK_CELL + i) * 4;
      const k = Math.round(clamp01(c) * 255);
      data[o] = Math.round(clamp01(k > 0 ? L.tone[n] / c : mean) * 255);
      data[o + 1] = Math.round(clamp01(k > 0 ? L.own[n] / c : 0.5) * 255);
      data[o + 2] = Math.round(clamp01(k > 0 ? L.sprig[n] / c : 0) * 255);
      data[o + 3] = k;
    }
  }
}

/** The painterly atlas's texels, RGBA8: a row to each kind of leaf, three clusters and one of smaller leaves. */
export function painterlyAtlasPixels(): { data: Uint8Array; width: number; height: number } {
  const width = MARK_CELL * PAINTERLY_COLS;
  const height = MARK_CELL * PAINTERLY_ROWS;
  const data = new Uint8Array(width * height * 4);
  KINDS.forEach((kind, row) => {
    for (let col = 0; col < PAINTERLY_COLS; col++) {
      const L = layer();
      for (const leaf of cluster(kind, 4099 * (row + 1) + 173 * col + 11, col === 3 ? 0.55 : 1)) drawLeaf(L, leaf);
      put(data, width, col, row, L);
    }
  });
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
