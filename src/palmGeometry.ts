// What is drawn of a palm (palm.ts), at each distance: its fronds as leaves laid along them, its fans as
// pleated fans on their stalks, its skirt of dead leaves as shingles round its stem, and its stem as wood.
//
// A feather frond is a ribbon along its rachis, folded up along it in a V (each half a strip of its own, lit
// as it faces), its picture the whole frond from foot to tip; a queen palm's carries a second, drooping pair
// of strips under it, its leaflets in several planes. A fan is a fan of rays round its stalk's end, pleated
// ridge and valley, folded up along its costa, its split tips drooping; its picture laid flat on it. Near,
// all of that; mid, a frond in a few pieces (two crossed planes, the V's two halves); far, in two, a star of
// fronds round the stem. Positions are the variant's own (metres from its foot), as all pieces are: the
// shaders fit, blow and light them.
//
// Plain arithmetic, no three.

import { Builder, type Pieces, type TierShape } from "./geometry.ts";
import { FAN_SPREAD, type Frond, PALM_CELL, STEM_BARK, fanPoint, leafletProfile } from "./palm.ts";
import { FAN_CENTRE_V, FAN_RADIUS_UV, FAN_STALK_V, cellUv } from "./palmAtlas.ts";
import { type GrownTree } from "./tree.ts";
import { hash01 } from "./variants.ts";

/** How finely a palm is laid at each distance. */
interface PalmTier {
  /** Pieces along a feather frond. */
  segs: number;
  /** A fan's rays (odd: one runs on along its stalk) and rings out from its middle; its stalk's pieces. */
  rays: number;
  rings: number;
  stalk: number;
  /** Panels round a skirt, and whether a queen palm's second rank of leaflets is drawn. */
  panels: number;
  plumose: boolean;
  /** Whether its spears are drawn. */
  spears: boolean;
}

export const PALM_TIERS: readonly PalmTier[] = [
  { segs: 12, rays: 25, rings: 4, stalk: 4, panels: 9, plumose: true, spears: true },
  { segs: 5, rays: 11, rings: 2, stalk: 2, panels: 6, plumose: true, spears: true },
  { segs: 2, rays: 7, rings: 1, stalk: 1, panels: 4, plumose: false, spears: false },
];

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: number[], k: number) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]): number[] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v: number[]): number[] => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const lerp3 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** A frond's frame at a share `s` of its length, between its laid points. */
function frameAt(f: Frond, s: number) {
  const last = f.points.length - 1;
  const x = Math.min(last, Math.max(0, s * last));
  const i = Math.min(last - 1, Math.floor(x));
  const t = x - i;
  return { p: lerp3(f.points[i], f.points[i + 1], t), t: norm(lerp3(f.tangent[i], f.tangent[i + 1], t)), a: norm(lerp3(f.across[i], f.across[i + 1], t)), n: norm(lerp3(f.up[i], f.up[i + 1], t)) };
}

/** The attributes every palm piece carries (see `palmPieces`). */
const SIZES = { position: 3, aNormal: 4, aUv: 4, aLimb: 4, aFrond: 4, aAxis: 4 };

/**
 * The palms' leaves at one distance (`tier`: 0 near, 1 mid, 2 far): every frond, fan and skirt of every palm
 * variant, one run a variant (empty for a tree that is not a palm). Each vertex: `position` where it is;
 * `aNormal` its leaf's facing and the share of the way along its frond; `aUv` where in the palms' atlas, its
 * picture (`PALM_CELL`) and how far it lies across its leaf from the rachis (m, signed); `aLimb` its frond's
 * foot and the variant; `aFrond` the frond's own number, how dead, how light, how freely it moves; `aAxis`
 * which way the frond runs there, and its length.
 */
export function palmPieces(trees: readonly GrownTree[], tier: number): Pieces {
  const b = new Builder(SIZES);
  const T = PALM_TIERS[tier];
  trees.forEach((tree, v) => {
    b.begin();
    const palm = tree.palm;
    if (palm) {
      for (const f of palm.fronds) {
        if (f.cls === "spear" && !T.spears) continue;
        if (f.hastula) fan(b, f, T, v);
        else feather(b, f, T, v);
      }
      if (palm.skirt) skirt(b, tree, T, v);
    }
    b.end();
  });
  return b.done();
}

type Vert = { p: number[]; n: number[]; s: number; uv: number[]; cell: number; lateral: number; foot: number[]; t: number[] };

function put(b: Builder, f: { own: number; dead: number; tone: number; flex: number; length: number }, q: Vert, v: number): number {
  return b.vertex({ position: q.p, aNormal: [...q.n, q.s], aUv: [q.uv[0], q.uv[1], q.cell, q.lateral], aLimb: [...q.foot, v], aFrond: [f.own, f.dead, f.tone, f.flex], aAxis: [...q.t, f.length] });
}

/** A strip of quads between rows of vertices (each row's indices), wound one way. */
function strip(b: Builder, rows: number[][]): void {
  for (let r = 0; r + 1 < rows.length; r++) {
    const A = rows[r];
    const B = rows[r + 1];
    for (let c = 0; c + 1 < A.length; c++) b.index.push(A[c], B[c], B[c + 1], A[c], B[c + 1], A[c + 1]);
  }
}

/** A feather frond: the V of its two ranks of leaflets, each half a strip, and a queen palm's drooping second rank. */
function feather(b: Builder, f: Frond, T: PalmTier, v: number): void {
  const foot = f.points[0];
  const segs = f.cls === "spear" ? Math.max(2, Math.round(T.segs / 2)) : T.segs;
  const layers: { fold: number; width: number; flip: boolean }[] = [{ fold: f.fold, width: f.width, flip: false }];
  if (f.plumose > 0 && T.plumose) layers.push({ fold: -0.6 * f.fold - 0.44, width: f.width * 0.9 * f.plumose, flip: true });
  for (const layer of layers) {
    for (const side of [-1, 1]) {
      const rows: number[][] = [];
      for (let k = 0; k <= segs; k++) {
        const s = k / segs;
        const { p, t, a, n } = frameAt(f, s);
        const prof = leafletProfile(s);
        const w = layer.width * prof;
        // (This half's leaflets run out from the rachis, up by the fold; it faces square to them and the rachis.)
        const out = add(scale(a, side * Math.cos(layer.fold)), scale(n, Math.sin(layer.fold)));
        let nn = norm(cross(t, out));
        if (dot(nn, n) < 0) nn = scale(nn, -1);
        const edge = add(p, scale(out, w));
        const vCell = 0.01 + 0.98 * s;
        const uEdge = 0.5 + 0.5 * prof * side * (layer.flip ? -1 : 1);
        const centre = put(b, f, { p, n: nn, s, uv: cellUv(f.cell, 0.5, vCell), cell: f.cell, lateral: 0, foot, t }, v);
        const rim = put(b, f, { p: edge, n: nn, s, uv: cellUv(f.cell, uEdge, vCell), cell: f.cell, lateral: side * w, foot, t }, v);
        rows.push(side < 0 ? [rim, centre] : [centre, rim]);
      }
      strip(b, rows);
    }
  }
}

/** A fan palm's leaf: its stalk, a narrow strip, and its blade, a pleated fan of rays round the stalk's end. */
function fan(b: Builder, f: Frond, T: PalmTier, v: number): void {
  const foot = f.points[0];
  const cell = f.cell;
  // (The stalk: a strip facing up, from its foot to the blade, the picture's own stalk along it.)
  const stalkW = Math.max(0.02, 0.022 * f.length);
  const rows: number[][] = [];
  for (let k = 0; k <= T.stalk; k++) {
    const s = (k / T.stalk) * f.bare;
    const { p, t, a, n } = frameAt(f, s);
    const vC = FAN_STALK_V + (FAN_CENTRE_V - FAN_STALK_V) * (k / T.stalk);
    const row: number[] = [];
    for (const side of [-1, 1]) row.push(put(b, f, { p: add(p, scale(a, side * stalkW)), n, s, uv: cellUv(cell, 0.5 + side * 0.022, vC), cell, lateral: side * stalkW, foot, t }, v));
    rows.push(row);
  }
  strip(b, rows);
  // The blade: rays round the stalk's end, rings out to its rim.
  const d = f.bladeDir!;
  const up = f.bladeUp!;
  const across = norm(cross(up, d));
  const point = (th: number, r: number, pleat: number) => fanPoint(f, th, r, across, pleat);
  const grid: number[][] = [];
  for (let j = 0; j <= T.rings; j++) {
    const r = j === 0 ? 0.03 : j / T.rings;
    const row: number[] = [];
    for (let i = 0; i < T.rays; i++) {
      const th = -FAN_SPREAD + (2 * FAN_SPREAD * i) / (T.rays - 1);
      // (Ridge and valley in turn, as its segments fold; none at its middle, where they meet.)
      const pleat = T.rays >= 9 && j > 0 ? (i % 2 === 0 ? 1 : -1) : 0;
      const p = point(th, r, pleat);
      const dt = 0.02;
      const dr = 0.02;
      const pt = sub(point(th + dt, r, pleat), point(th - dt, r, pleat));
      const pr = sub(point(th, Math.min(1, r + dr), pleat), point(th, Math.max(0, r - dr), pleat));
      let n = norm(cross(pr, pt));
      if (dot(n, up) < 0) n = scale(n, -1);
      const radial = [Math.sin(th), Math.cos(th)];
      const uv = cellUv(cell, 0.5 + FAN_RADIUS_UV * r * radial[0], FAN_CENTRE_V + FAN_RADIUS_UV * r * radial[1]);
      const lateral = dot(sub(p, f.hastula!), across);
      row.push(put(b, f, { p, n, s: f.bare + (1 - f.bare) * r, uv, cell, lateral, foot, t: r < 0.05 ? d : norm(sub(p, f.hastula!)) }, v));
    }
    grid.push(row);
  }
  strip(b, grid);
}


/**
 * A skirt of dead leaves, hanging round the stem from under the green crown: shingles of panels in rows, each
 * row overlapping the one below, each panel the picture of dead leaves hanging side by side, the rows turned
 * against each other so their joins do not line up.
 */
function skirt(b: Builder, tree: GrownTree, T: PalmTier, v: number): void {
  const palm = tree.palm!;
  const sk = palm.skirt!;
  const st = palm.stem;
  const radiusAt = (y: number) => {
    let k = 0;
    while (k + 1 < st.y.length && st.y[k + 1] < y) k++;
    const t = k + 1 < st.y.length ? Math.min(1, Math.max(0, (y - st.y[k]) / Math.max(1e-6, st.y[k + 1] - st.y[k]))) : 0;
    const r = st.radius[k] + (st.radius[Math.min(k + 1, st.y.length - 1)] - st.radius[k]) * t;
    return { r, x: st.x[k], z: st.z[k] };
  };
  const tall = sk.top - sk.bottom;
  const rowH = Math.min(2.6, Math.max(1.2, tall));
  const rows = Math.max(1, Math.ceil((tall - rowH) / (0.7 * rowH)) + 1);
  const cell = PALM_CELL.skirt;
  for (let row = 0; row < rows; row++) {
    const top = rows === 1 ? sk.top : sk.top - (row * (tall - rowH)) / (rows - 1);
    const k0 = (sk.top - top) / Math.max(tall, 1e-3);
    const turn = hash01(row, v * 13 + 5) * Math.PI * 2;
    const P = T.panels;
    for (let q = 0; q < P; q++) {
      const a0 = turn + (q / P) * Math.PI * 2;
      const span = ((Math.PI * 2) / P) * 1.55;
      const cols = 3;
      const vr = 3;
      const grid: number[][] = [];
      const shade = 0.85 + 0.3 * hash01(q + row * 31, v * 7 + 1);
      for (let j = 0; j <= vr; j++) {
        const fj = j / vr;
        const y = top - rowH * fj;
        const kk = k0 + (rowH / Math.max(tall, 1e-3)) * fj;
        const out = sk.outTop + (sk.outBottom - sk.outTop) * Math.min(1, kk);
        // (Each panel bellies out a little below its top: the leaves fall from their stalks against the stem and splay.)
        const { r, x: cx, z: cz } = radiusAt(Math.max(0, y));
        const rr = r + out * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, fj * 0.8 + 0.2))) + 0.05 * (row % 2);
        const line: number[] = [];
        for (let i = 0; i <= cols; i++) {
          const a = a0 - span / 2 + (span * i) / cols;
          const p = [cx + Math.cos(a) * rr, Math.max(0.05, y), cz + Math.sin(a) * rr];
          const n = norm([Math.cos(a), 0.25, Math.sin(a)]);
          const uv = cellUv(cell, 0.04 + (0.92 * i) / cols, 0.985 - 0.97 * fj);
          line.push(put(b, { own: hash01(q, row * 17 + v), dead: 1, tone: shade, flex: 0.3 + 0.4 * fj, length: rowH }, { p, n, s: fj, uv, cell, lateral: 0, foot: [cx, top, cz], t: [0, -1, 0] }, v));
        }
        grid.push(line);
      }
      strip(b, grid);
    }
  }
}

/**
 * A palm's stem as wood (geometry.ts `woodPieces` lays it so, for a palm): rings up it as palm.ts set them,
 * its crown shaft swelling round the leaves' feet and closing over at the heart; each ring says what its
 * surface is (`aWood.w`: its bark, a pineapple cut's trimmed leaf bases, or old leaf bases).
 */
export function palmStemInto(b: Builder, tree: GrownTree, shape: TierShape, v: number): void {
  const st = tree.palm!.stem;
  if (shape.woodFrom >= 1) return;
  const sides = shape.sides[0];
  const n = st.y.length;
  let u = [1, 0, 0];
  let last = -1;
  const own = hash01(v, 131);
  const ring = (c: number[], d: number[], r: number, slope: number, along: number, surface: number) => {
    u = norm(sub(u, scale(d, dot(u, d))));
    const w = cross(d, u);
    let first = -1;
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const e = add(scale(u, Math.cos(a)), scale(w, Math.sin(a)));
      const nrm = norm(sub(e, scale(d, slope)));
      const k = b.vertex({ position: c, aRadial: [...e, r], aNormal: nrm, aLimb: [0, -1, 0, v], aWood: [along, 0, own, surface], aFrame: u, aAxis: d });
      if (first < 0) first = k;
    }
    if (last >= 0) {
      for (let s = 0; s < sides; s++) {
        const s1 = (s + 1) % sides;
        b.index.push(last + s, first + s, last + s1, last + s1, first + s, first + s1);
      }
    }
    last = first;
  };
  const dirAt = (k: number) => norm(sub([st.x[Math.min(n - 1, k + 1)], st.y[Math.min(n - 1, k + 1)], st.z[Math.min(n - 1, k + 1)]], [st.x[Math.max(0, k - 1)], st.y[Math.max(0, k - 1)], st.z[Math.max(0, k - 1)]]));
  // (Its foot a little into the ground, so it stands in it on a slope.)
  ring([st.x[0], -0.15, st.z[0]], [0, 1, 0], st.radius[0] * 1.05, 0, -0.15, STEM_BARK);
  for (let k = 0; k < n; k++) {
    const d = dirAt(k);
    const dy = st.y[Math.min(n - 1, k + 1)] - st.y[Math.max(0, k - 1)];
    const slope = dy > 1e-4 ? (st.radius[Math.min(n - 1, k + 1)] - st.radius[Math.max(0, k - 1)]) / dy : 0;
    ring([st.x[k], st.y[k], st.z[k]], d, st.radius[k], Math.max(-3, Math.min(3, slope)), st.y[k], st.surface[k]);
  }
  // Closed over at its top.
  const k = n - 1;
  const tip = b.vertex({ position: [st.x[k], st.y[k] + st.radius[k] * 0.3, st.z[k]], aRadial: [0, 1, 0, 0], aNormal: [0, 1, 0], aLimb: [0, -1, 0, v], aWood: [st.y[k], 0, own, st.surface[k]], aFrame: u, aAxis: [0, 1, 0] });
  for (let s = 0; s < sides; s++) b.index.push(last + s, tip, last + ((s + 1) % sides));
}
