// The palms' pictures, in one atlas every palm draws from: a feather palm's whole frond, a queen palm's
// plumose one, a fan palm's skirt of dead leaves, and two fan leaves. Each picture is laid in its cell the
// way palmGeometry.ts lays its leaf on it: a frond from its foot (the cell's bottom) to its tip (its top), its
// rachis up the cell's middle and its widest leaflets to the cell's sides; a fan with its blade's middle at
// (0.5, FAN_CENTRE_V), its rim FAN_RADIUS_UV out, its stalk down the middle below; a skirt's stalks along its
// top and its leaves hanging to its bottom. So any of the pictures fits any palm.
//
// The realistic look's pictures are AI-generated photographs (assets/leaves: frond, queenFrond, fan, fanB,
// deadFronds; SOURCES.md), the other looks' painted ones (paintFrond, paintFan); until they come, or with no
// pictures at all, the cells are drawn here by arithmetic. The texels keep the picture's own colour (sRGB)
// with coverage in alpha; a cell's mean colour (linear) goes with it, so the shader can bring each frond's
// colour to its own (its species', its age's) and keep the picture's light and shade.
//
// Plain arithmetic, no three.

import { type Pixels } from "./mips.ts";
import { type LeafSet } from "./scans.ts";

/** The atlas's size (texels) and its cells' rectangles (texels; rows from v = 0). */
export const PALM_ATLAS = {
  width: 2048,
  height: 1024,
  cells: [
    { x: 0, y: 0, w: 512, h: 1024 },
    { x: 512, y: 0, w: 512, h: 1024 },
    { x: 1024, y: 0, w: 512, h: 1024 },
    { x: 1536, y: 512, w: 512, h: 512 },
    { x: 1536, y: 0, w: 512, h: 512 },
  ],
} as const;
/** The texels its mips keep coverage over (mips.ts). */
export const PALM_ATLAS_CELL = 512;

/** Where a point of a cell (shares of it, v up) is in the atlas. */
export function cellUv(cell: number, u: number, v: number): [number, number] {
  const c = PALM_ATLAS.cells[cell];
  return [(c.x + u * c.w) / PALM_ATLAS.width, (c.y + v * c.h) / PALM_ATLAS.height];
}

/** Where a fan's blade's middle is in its cell, how far its rim, and where its stalk starts (palmGeometry.ts lays them so). */
export const FAN_CENTRE_V = 0.52;
export const FAN_RADIUS_UV = 0.47;
export const FAN_STALK_V = 0.19;

/** Which picture each cell takes in each kind of look: the photographs, or the painted ones. */
export const PALM_PICTURES: Readonly<Record<"real" | "painted", readonly { set: string; fan?: number; mirror?: boolean }[]>> = {
  // (`fan`: where the blade's middle (the hastula) is on a fan's picture, as a share of the way from its stalk's
  // end to its blade's top, as measured on the picture.)
  real: [{ set: "frond" }, { set: "queenFrond" }, { set: "deadFronds" }, { set: "fan", fan: 0.42 }, { set: "fanB", fan: 0.43 }],
  painted: [{ set: "paintFrond" }, { set: "paintFrond", mirror: true }, { set: "deadFronds" }, { set: "paintFan", fan: 0.41 }, { set: "paintFan", fan: 0.41, mirror: true }],
};

const srgbToLinear = (s: number) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
const LIN = new Float32Array(256).map((_, i) => srgbToLinear(i / 255));

/** A new, empty atlas. */
export function emptyPalmAtlas(): Pixels {
  return { data: new Uint8Array(PALM_ATLAS.width * PALM_ATLAS.height * 4), width: PALM_ATLAS.width, height: PALM_ATLAS.height };
}

/** A cell's mean colour (linear) over its coverage. */
function cellMean(px: Pixels, cell: number): [number, number, number] {
  const c = PALM_ATLAS.cells[cell];
  const m = [0, 0, 0];
  let a = 0;
  for (let j = 0; j < c.h; j += 2)
    for (let i = 0; i < c.w; i += 2) {
      const o = ((c.y + j) * px.width + c.x + i) * 4;
      const al = px.data[o + 3] / 255;
      if (al <= 0.5) continue;
      for (let k = 0; k < 3; k++) m[k] += LIN[px.data[o + k]];
      a++;
    }
  return a > 0 ? [m[0] / a, m[1] / a, m[2] / a] : [0.2, 0.3, 0.1];
}

/**
 * Lay a picture (a leaf sheet's one leaf: its texels and its sprite) in a cell, as its kind of cell wants it.
 * Its mean colour (linear), for the shader.
 */
export function layPicture(out: Pixels, cell: number, sheet: { set: LeafSet; albedo: Pixels }, fan?: number, mirror = false): [number, number, number] {
  const c = PALM_ATLAS.cells[cell];
  const sp = sheet.set.sprites[0];
  const src = sheet.albedo;
  const bx = sp.x + sp.base[0];
  const by = sp.y + sp.base[1];
  const tx = sp.x + sp.tip[0];
  const ty = sp.y + sp.tip[1];
  const len = Math.hypot(tx - bx, ty - by);
  const ax = (tx - bx) / len;
  const ay = (ty - by) / len;
  // (Across: to the picture's right of the way up it.)
  const px = -ay;
  const py = ax;
  // How far the picture reaches either side of its axis (a frond's, the whole of it in the cell's width).
  let half = 1;
  if (fan === undefined) {
    for (let y = sp.y; y < sp.y + sp.h; y++)
      for (let x = sp.x; x < sp.x + sp.w; x++) {
        if (src.data[(y * src.width + x) * 4 + 3] < 40) continue;
        half = Math.max(half, Math.abs((x - bx) * px + (y - by) * py));
      }
    half *= 1.02;
  }
  const sample = (x: number, y: number, k: number) => {
    const x0 = Math.floor(x - 0.5);
    const y0 = Math.floor(y - 0.5);
    const fx = x - 0.5 - x0;
    const fy = y - 0.5 - y0;
    let s = 0;
    let w = 0;
    for (const [dx, dy, wt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]] as const) {
      const xx = x0 + dx;
      const yy = y0 + dy;
      if (xx < sp.x || yy < sp.y || xx >= sp.x + sp.w || yy >= sp.y + sp.h) continue;
      s += src.data[(yy * src.width + xx) * 4 + k] * wt;
      w += wt;
    }
    return w > 0 ? s / w : 0;
  };
  // (Supersampled two by two: the pictures are as big as the cells or a little bigger.)
  for (let j = 0; j < c.h; j++)
    for (let i = 0; i < c.w; i++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < 2; sy++)
        for (let sx = 0; sx < 2; sx++) {
          let cu = (i + (sx + 0.5) / 2) / c.w;
          const cv = (j + (sy + 0.5) / 2) / c.h;
          if (mirror) cu = 1 - cu;
          let along: number;
          let side: number;
          if (fan !== undefined) {
            const rpx = len * (1 - fan);
            along = len * fan + ((cv - FAN_CENTRE_V) / FAN_RADIUS_UV) * rpx;
            side = ((cu - 0.5) / FAN_RADIUS_UV) * rpx;
          } else {
            along = ((cv - 0.01) / 0.98) * len;
            side = (cu - 0.5) * 2 * half;
          }
          const x = bx + ax * along + px * side;
          const y = by + ay * along + py * side;
          const a = sample(x, y, 3);
          acc[3] += a;
          for (let k = 0; k < 3; k++) acc[k] += sample(x, y, k) * a;
        }
      const o = ((c.y + j) * out.width + c.x + i) * 4;
      const a = acc[3] / 4;
      for (let k = 0; k < 3; k++) out.data[o + k] = acc[3] > 0 ? Math.round(acc[k] / acc[3]) : 0;
      out.data[o + 3] = Math.round(a);
    }
  bleedCell(out, cell);
  return cellMean(out, cell);
}

/** The colour run out past a cell's leaves into its empty texels (so its mips do not darken their edges). */
function bleedCell(px: Pixels, cell: number): void {
  const c = PALM_ATLAS.cells[cell];
  for (let pass = 0; pass < 6; pass++) {
    const fill: [number, number, number, number][] = [];
    for (let j = 0; j < c.h; j++)
      for (let i = 0; i < c.w; i++) {
        const o = ((c.y + j) * px.width + c.x + i) * 4;
        if (px.data[o + 3] > 0 || (px.data[o] | px.data[o + 1] | px.data[o + 2]) !== 0) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const x = i + dx;
          const y = j + dy;
          if (x < 0 || y < 0 || x >= c.w || y >= c.h) continue;
          const q = ((c.y + y) * px.width + c.x + x) * 4;
          if ((px.data[q] | px.data[q + 1] | px.data[q + 2]) === 0) continue;
          r += px.data[q];
          g += px.data[q + 1];
          b += px.data[q + 2];
          n++;
        }
        if (n > 0) fill.push([o, r / n, g / n, b / n]);
      }
    for (const [o, r, g, b] of fill) {
      px.data[o] = Math.max(1, Math.round(r));
      px.data[o + 1] = Math.max(1, Math.round(g));
      px.data[o + 2] = Math.round(b);
    }
  }
}

/**
 * The cells drawn by arithmetic, for before the pictures come (or with none): a frond of narrow leaflets in a
 * V along a pale rachis, a fan of pleated segments split and drooping at their tips on its stalk, a skirt of
 * hanging straw. Their mean colours (linear).
 */
export function drawnPalmAtlas(): { px: Pixels; means: [number, number, number][] } {
  const px = emptyPalmAtlas();
  const set = (cell: number, i: number, j: number, rgb: [number, number, number], a: number) => {
    const c = PALM_ATLAS.cells[cell];
    const o = ((c.y + j) * px.width + c.x + i) * 4;
    px.data[o] = rgb[0];
    px.data[o + 1] = rgb[1];
    px.data[o + 2] = rgb[2];
    px.data[o + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255);
  };
  const smooth = (e: number, x: number) => Math.min(1, Math.max(0, 0.5 - x / e));
  for (const cell of [0, 1]) {
    const c = PALM_ATLAS.cells[cell];
    for (let j = 0; j < c.h; j++)
      for (let i = 0; i < c.w; i++) {
        const u = (i + 0.5) / c.w;
        const v = (j + 0.5) / c.h;
        const s = (v - 0.01) / 0.98;
        const x = Math.abs(u - 0.5) * 2;
        const width = 0.32 + 0.68 * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, s * 0.97 + 0.02)))));
        // (The rachis, and leaflets angled forward, each a narrow blade tapering to its tip.)
        const rachis = smooth(2 / c.w, Math.abs(u - 0.5) * 1 - 0.006 * (1 - 0.6 * s));
        const along = s + x * 0.22;
        const period = 0.021;
        const f = (((along / period) % 1) + 1) % 1;
        const blade = x < width && s > 0.1 && s < 1 ? smooth(0.08, Math.abs(f - 0.5) - 0.18 * (1 - x / width)) : 0;
        const a = Math.max(rachis, blade);
        if (a <= 0) continue;
        const tone = 0.75 + 0.35 * (1 - x) + 0.15 * (f - 0.5);
        const rgb: [number, number, number] = rachis > blade ? [190, 180, 90] : [Math.round(92 * tone), Math.round(128 * tone), Math.round(52 * tone)];
        set(cell, i, j, rgb, a);
      }
  }
  {
    const cell = 2;
    const c = PALM_ATLAS.cells[cell];
    for (let j = 0; j < c.h; j++)
      for (let i = 0; i < c.w; i++) {
        const u = (i + 0.5) / c.w;
        const v = (j + 0.5) / c.h;
        const strand = Math.sin(u * 180 + Math.sin(v * 7 + u * 30) * 2) * 0.5 + 0.5;
        const ragged = 0.08 + 0.12 * (Math.sin(u * 61) * 0.5 + 0.5);
        const a = u > 0.03 && u < 0.97 && v > ragged ? smooth(0.2, 0.35 - strand) : 0;
        if (a <= 0) continue;
        const t = 0.8 + 0.3 * strand;
        set(cell, i, j, [Math.round(168 * t), Math.round(146 * t), Math.round(104 * t)], a);
      }
  }
  for (const cell of [3, 4]) {
    const c = PALM_ATLAS.cells[cell];
    for (let j = 0; j < c.h; j++)
      for (let i = 0; i < c.w; i++) {
        const u = (i + 0.5) / c.w;
        const v = (j + 0.5) / c.h;
        const dx = (u - 0.5) / FAN_RADIUS_UV;
        const dy = (v - FAN_CENTRE_V) / FAN_RADIUS_UV;
        const r = Math.hypot(dx, dy);
        const th = Math.atan2(dx, dy);
        const segs = 46;
        const f = ((((th / (2 * Math.PI)) * segs) % 1) + 1) % 1;
        const split = r > 0.55;
        const seg = split ? smooth(0.15, Math.abs(f - 0.5) - 0.32 * (1 - (r - 0.55) * 1.6)) : 1;
        const blade = r < 1 && Math.abs(th) < 2.6 ? seg : 0;
        const stalk = v < FAN_CENTRE_V && v > FAN_STALK_V ? smooth(2 / c.w, Math.abs(u - 0.5) - 0.018) : 0;
        const a = Math.max(blade, stalk);
        if (a <= 0) continue;
        const tone = 0.8 + 0.25 * Math.cos(f * Math.PI * 2) * 0.5 + 0.1 * (1 - r);
        const rgb: [number, number, number] = stalk > blade ? [150, 160, 80] : [Math.round(96 * tone), Math.round(130 * tone), Math.round(58 * tone)];
        set(cell, i, j, rgb, a);
      }
  }
  for (let k = 0; k < PALM_ATLAS.cells.length; k++) bleedCell(px, k);
  return { px, means: PALM_ATLAS.cells.map((_, k) => cellMean(px, k)) };
}
