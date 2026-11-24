// Turn the painterly look's paintings (recipe.mjs) into the marks it lays its crowns with: assets/marks/
// painterly.avif (a row of clusters to each kind of leaf, as src/marks.ts draws them), assets/marks/sheets.avif
// (a conifer's boughs, top and underside), assets/marks/marks.json (what they hold), and the painted marks'
// section of assets/SOURCES.md. Same paintings, same tools, same bytes out.
//
//   node tools/marks/build.mjs <raw> [--preview <dir>]
//
// <raw> is the folder holding the paintings (tools/ai-textures/raw). Each painting is:
// - keyed off its magenta (sampled from its border), its edges' magenta taken out;
// - its lightness (linear) divided by its own lightness blurred over a few leaves, so what is left is each
//   leaf's own light and shade and the dark between leaves, and not the light the painter laid over the whole
//   clump (the shader lays that, over the crown's lobes, from the sun as it is): that is the mark's tone;
// - cut into its painted leaves (flooded from the flat insides of the leaves up the edges and dark valleys
//   between them, the specks merged into their neighbours): each leaf a number of its own, so the shader
//   lights each painted leaf its own way;
// then scaled, turned and mirrored into the atlas's cells, several to a cell where the cell's leaves are to be
// smaller (src/marks.ts `PAINTERLY_DENSITIES`), each leaf about `LEAF_SHARE` of the cell's half width there.
//
// Channels as src/marks.ts writes them: red the tone, green the leaf's own number, blue 0, alpha coverage;
// where nothing is, the cell's mean tone and a number of a half. Rows bottom first (row 0 of the file is v = 0,
// as a DataTexture's): the files read upside down, which the previews put right.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Img, avifVersion, blur, luminance, magickVersion, quantile, read, toLinear, writeAvif, writePng } from "../scans/image.mjs";
import { DATE, PAINTINGS, ROWS, SHEETS, TOOL } from "./recipe.mjs";

const args = process.argv.slice(2);
const raw = args[0];
const previewAt = args.indexOf("--preview") >= 0 ? args[args.indexOf("--preview") + 1] : null;
if (!raw) {
  console.error("usage: node tools/marks/build.mjs <raw> [--preview <dir>]");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(root, "assets/marks");
const TMP = join(previewAt ?? join(root, "node_modules/.cache"), "marks-tmp");
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
if (previewAt) mkdirSync(previewAt, { recursive: true });

// The atlas's layout: src/marks.ts's, read from it so the two cannot drift.
const marks = await import(join(root, "src/marks.ts"));
const { MARK_CELL, MARK_KINDS, PAINTERLY_COLS, PAINTERLY_DENSITIES, PAINTERLY_VARIANTS, LEAF_SHARE, SHEET_CELL, SHEET_COLS, SHEET_ROWS } = marks;
/** How far inside its cell a mark keeps, a share of its half width (src/marks.ts `REACH`, a little less). */
const REACH = 0.92;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** A number 0..1 from integers, the same every time. */
function hash(a, b) {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca77)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------------------------------------------------
// Keying.

/**
 * A painting on magenta keyed out: coverage where it is not magenta, the magenta's share taken out of its
 * edges' colour (so no pink rim); its linear lightness, an edge's taken from the leaf inside it.
 */
function key(img) {
  const { w, h } = img;
  const border = [];
  for (let x = 0; x < w; x += 4) for (const y of [2, h - 3]) border.push(x, y);
  for (let y = 0; y < h; y += 4) for (const x of [2, w - 3]) border.push(x, y);
  const k = [0, 1, 2].map((c) => {
    const v = [];
    for (let i = 0; i < border.length; i += 2) v.push(img.get(border[i], border[i + 1], c));
    return quantile(v, 0.5);
  });
  const keyM = Math.max(0.3, Math.min(k[0], k[2]) - k[1]);
  const alpha = new Img(w, h, 1);
  const rgb = new Img(w, h, 3);
  for (let i = 0; i < w * h; i++) {
    const r = img.data[i * 3];
    const g = img.data[i * 3 + 1];
    const b = img.data[i * 3 + 2];
    const m = Math.min(r, b) - g;
    const near = Math.hypot(r - k[0], g - k[1], b - k[2]);
    const a = Math.min(clamp01((0.8 * keyM - m) / (0.45 * keyM)), clamp01((near - 0.06) / 0.18));
    alpha.data[i] = a;
    const un = (o, bg) => clamp01((o - (1 - a) * bg) / Math.max(a, 0.05));
    let rr = a < 1 ? un(r, k[0]) : r;
    const gg = a < 1 ? un(g, k[1]) : g;
    let bb = a < 1 ? un(b, k[2]) : b;
    const spill = Math.max(0, Math.min(rr, bb) - gg);
    rr -= spill;
    bb -= spill;
    rgb.data[i * 3] = rr;
    rgb.data[i * 3 + 1] = gg;
    rgb.data[i * 3 + 2] = bb;
  }
  // (Lightness: an edge texel's from the leaf just inside it, as its colour is half magenta.)
  const L = new Img(w, h, 1);
  const sure = new Img(w, h, 1);
  const sureL = new Img(w, h, 1);
  for (let i = 0; i < w * h; i++) {
    L.data[i] = luminance(toLinear(rgb.data[i * 3]), toLinear(rgb.data[i * 3 + 1]), toLinear(rgb.data[i * 3 + 2]));
    if (alpha.data[i] > 0.97) {
      sure.data[i] = 1;
      sureL.data[i] = L.data[i];
    }
  }
  const sw = blur(sure, 2, { wrap: false, passes: 2 });
  const sl = blur(sureL, 2, { wrap: false, passes: 2 });
  for (let i = 0; i < w * h; i++) if (alpha.data[i] <= 0.97 && sw.data[i] > 0.02) L.data[i] = sl.data[i] / sw.data[i];
  return { rgb, alpha, L };
}

// ---------------------------------------------------------------------------------------------------------------------
// Tone.

/** A blur of `v` over where `wt` is, normalised by it (what `v` is round about, counting only the painting). */
function blurOver(v, wt, r) {
  const { w, h } = v;
  const vw = new Img(w, h, 1);
  for (let i = 0; i < w * h; i++) vw.data[i] = v.data[i] * wt.data[i];
  const a = blur(vw, r, { wrap: false });
  const b = blur(wt, r, { wrap: false });
  const out = new Img(w, h, 1);
  for (let i = 0; i < w * h; i++) out.data[i] = b.data[i] > 1e-4 ? a.data[i] / b.data[i] : 0;
  return out;
}

/**
 * The mark's tone: the lightness over its own blurred over about a leaf and a half (the clump's light taken
 * out), as a log ratio pressed into the tone the shader reads (0.84 the mean; a leaf's light side up to 1,
 * the dark between leaves down towards a third).
 */
function toneOf(L, rgb, alpha, leafPx) {
  const base = blurOver(L, alpha, Math.max(4, Math.round(leafPx * 0.75)));
  const T = new Img(L.w, L.h, 1);
  for (let i = 0; i < L.data.length; i++) {
    if (alpha.data[i] <= 0.01) continue;
    const x = Math.log(Math.max(1e-4, L.data[i]) / Math.max(1e-4, base.data[i])) * TONE_GAIN;
    let t = 0.9 + (x > 0 ? 0.1 * Math.tanh(x / 0.1) : 0.55 * Math.tanh(x / 0.55));
    // (A painted twig, brown, is wood and not a leaf: dark, as src/marks.ts draws a shoot, not a pale stalk.)
    if (isBrown(rgb.data[i * 3], rgb.data[i * 3 + 1], rgb.data[i * 3 + 2])) t = Math.min(t, 0.5);
    T.data[i] = t;
  }
  return T;
}
/** A painted twig's brown: red over green over blue, warm and not grey. */
function isBrown(r, g, b) {
  return r > g + 0.04 && g > b && r - b > 0.15;
}
const TONE_GAIN = 0.7;

// ---------------------------------------------------------------------------------------------------------------------
// The painted leaves.

/**
 * How much each texel is an edge between leaves: the colour's gradient (sRGB, a little smoothed), and how far
 * it lies in a dark valley below its surroundings (the shade painted between overlapping leaves).
 */
function edges(rgb, alpha, leafPx) {
  const { w, h } = alpha;
  const ch = [0, 1, 2].map((c) => blur(rgb.channel(c), 1, { wrap: false, passes: 2 }));
  const luma = new Img(w, h, 1);
  for (let i = 0; i < w * h; i++) luma.data[i] = 0.299 * ch[0].data[i] + 0.587 * ch[1].data[i] + 0.114 * ch[2].data[i];
  const around = blur(luma, Math.max(2, Math.round(leafPx * 0.12)), { wrap: false, passes: 2 });
  const E = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (alpha.data[i] <= 0.5) continue;
      let g2 = 0;
      for (const c of ch) {
        const gx = c.data[i + 1] - c.data[i - 1];
        const gy = c.data[i + w] - c.data[i - w];
        g2 += gx * gx + gy * gy;
      }
      // (Mostly the dark between leaves: a light vein down a leaf's middle is an edge too, but not between leaves.)
      const below = around.data[i] - luma.data[i];
      E[i] = Math.sqrt(g2) * (below < 0 ? 0.35 : 0.6) + 2.5 * Math.max(0, below);
    }
  return E;
}

/** Label the covered texels (alpha over a half) by the patch of `mask` texels each is joined to (4 ways); -1 elsewhere. */
function patches(mask, w, h) {
  const lab = new Int32Array(w * h).fill(-1);
  const sizes = [];
  const stack = [];
  for (let i0 = 0; i0 < w * h; i0++) {
    if (!mask[i0] || lab[i0] >= 0) continue;
    const id = sizes.length;
    let n = 0;
    lab[i0] = id;
    stack.push(i0);
    while (stack.length) {
      const i = stack.pop();
      n++;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || !mask[j] || lab[j] >= 0) continue;
        lab[j] = id;
        stack.push(j);
      }
    }
    sizes.push(n);
  }
  return { lab, sizes };
}

/**
 * The painted leaves: seeds where the painting is flattest (its leaves' insides, shrunk a little so two
 * touching leaves seed apart), flooded outwards lowest edge first until they meet; specks under a fifth of
 * a leaf merged into the neighbour they share most edge with. Returns a label to each covered texel.
 */
function leaves(rgb, alpha, leafPx) {
  const { w, h } = alpha;
  const E = edges(rgb, alpha, leafPx);
  const inside = [];
  for (let i = 0; i < w * h; i++) if (alpha.data[i] > 0.5) inside.push(E[i]);
  const thr = quantile(inside, 0.3);
  const maxE = quantile(inside, 0.995) || 1;
  // (The flat insides, shrunk by a texel or two.)
  let flat = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) flat[i] = alpha.data[i] > 0.5 && E[i] < thr ? 1 : 0;
  const shrink = Math.max(1, Math.round(leafPx / 60));
  for (let s = 0; s < shrink; s++) {
    const next = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        next[i] = flat[i] && flat[i - 1] && flat[i + 1] && flat[i - w] && flat[i + w] ? 1 : 0;
      }
    flat = next;
  }
  const minSeed = Math.max(4, (leafPx * 0.06) ** 2);
  const seeds = patches(flat, w, h);
  const lab = new Int32Array(w * h).fill(-1);
  let count = 0;
  const remap = seeds.sizes.map((n) => (n >= minSeed ? count++ : -1));
  // (Flooding: a bucket queue on the edge strength.)
  const LEVELS = 1024;
  const buckets = Array.from({ length: LEVELS }, () => []);
  const level = (i) => Math.min(LEVELS - 1, Math.floor((E[i] / maxE) * (LEVELS - 1)));
  for (let i = 0; i < w * h; i++) {
    const s = seeds.lab[i];
    if (s >= 0 && remap[s] >= 0) {
      lab[i] = remap[s];
      buckets[0].push(i);
    }
  }
  for (let l = 0; l < LEVELS; l++) {
    const b = buckets[l];
    while (b.length) {
      const i = b.pop();
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || lab[j] >= 0 || alpha.data[j] <= 0.5) continue;
        lab[j] = lab[i];
        buckets[Math.max(l, level(j))].push(j);
      }
    }
  }
  // (Covered texels no seed reached: patches of their own.)
  const rest = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) rest[i] = alpha.data[i] > 0.5 && lab[i] < 0 ? 1 : 0;
  const lone = patches(rest, w, h);
  for (let i = 0; i < w * h; i++) if (lone.lab[i] >= 0) lab[i] = count + lone.lab[i];
  count += lone.sizes.length;
  // (Specks merged into the neighbour they touch most.)
  const minLeaf = (leafPx * 0.2) ** 2;
  for (let pass = 0; pass < 3; pass++) {
    const area = new Float64Array(count);
    for (let i = 0; i < w * h; i++) if (lab[i] >= 0) area[lab[i]]++;
    const touch = new Map();
    for (let y = 0; y < h - 1; y++)
      for (let x = 0; x < w - 1; x++) {
        const i = y * w + x;
        const a = lab[i];
        if (a < 0) continue;
        for (const j of [i + 1, i + w]) {
          const b = lab[j];
          if (b < 0 || b === a) continue;
          for (const [p, q] of [[a, b], [b, a]]) {
            if (area[p] >= minLeaf) continue;
            let m = touch.get(p);
            if (!m) touch.set(p, (m = new Map()));
            m.set(q, (m.get(q) ?? 0) + 1);
          }
        }
      }
    const into = new Int32Array(count).map((_, k) => k);
    // (Smallest first, each into its biggest-bordered neighbour that is not itself being merged into it.)
    for (const [p, m] of touch) {
      let best = -1;
      let most = 0;
      for (const [q, n] of m) if (n > most && into[q] !== p) ((most = n), (best = q));
      if (best >= 0) into[p] = best;
    }
    const find = (k) => {
      let seen = 0;
      while (into[k] !== k && seen++ < 64) k = into[k];
      return k;
    };
    for (let i = 0; i < w * h; i++) if (lab[i] >= 0) lab[i] = find(lab[i]);
  }
  // (Numbered afresh, 0 up.)
  const ids = new Map();
  for (let i = 0; i < w * h; i++) if (lab[i] >= 0) {
    if (!ids.has(lab[i])) ids.set(lab[i], ids.size);
    lab[i] = ids.get(lab[i]);
  }
  return { lab, count: ids.size };
}

/** Each leaf's area and length (texels): its length that of an ellipse of its spread, 4 √λ along its longest. */
function leafStats(lab, count, w) {
  const s = Array.from({ length: count }, () => ({ n: 0, x: 0, y: 0, xx: 0, yy: 0, xy: 0 }));
  for (let i = 0; i < lab.length; i++) {
    const k = lab[i];
    if (k < 0) continue;
    const x = i % w;
    const y = (i / w) | 0;
    const q = s[k];
    q.n++;
    q.x += x;
    q.y += y;
    q.xx += x * x;
    q.yy += y * y;
    q.xy += x * y;
  }
  return s.map((q) => {
    const mx = q.x / q.n;
    const my = q.y / q.n;
    const a = q.xx / q.n - mx * mx;
    const b = q.yy / q.n - my * my;
    const c = q.xy / q.n - mx * my;
    const l = (a + b) / 2 + Math.sqrt(((a - b) / 2) ** 2 + c * c);
    return { n: q.n, length: 4 * Math.sqrt(Math.max(0, l)) };
  });
}

/** The median of the leaves' lengths, each leaf weighted by its area (so specks count for little). */
function leafLength(stats) {
  const s = stats.filter((q) => q.n > 8).sort((a, b) => a.length - b.length);
  const total = s.reduce((t, q) => t + q.n, 0);
  let run = 0;
  for (const q of s) if ((run += q.n) >= total / 2) return q.length;
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------------
// Each painting, prepared.

const prepared = new Map();
function prepare(id) {
  if (prepared.has(id)) return prepared.get(id);
  const p = PAINTINGS[id];
  const img = read(join(raw, p.file), { channels: 3 });
  const { rgb, alpha, L } = key(img);
  const { lab, count } = leaves(rgb, alpha, p.leafPx);
  const stats = leafStats(lab, count, img.w);
  const length = leafLength(stats);
  const tone = toneOf(L, rgb, alpha, length || p.leafPx);
  if (p.dropBehind) {
    // (A bough seen from above, along a sheet: its sprays painted behind the others, darker, left out, so air
    // shows between its sprays as between a bough's side shoots; its twig kept.)
    for (let i = 0; i < alpha.data.length; i++) {
      if (isBrown(rgb.data[i * 3], rgb.data[i * 3 + 1], rgb.data[i * 3 + 2])) continue;
      const k = clamp01((tone.data[i] - p.dropBehind) / 0.08);
      alpha.data[i] *= k;
      if (alpha.data[i] <= 0.5) lab[i] = -1;
    }
    // (And the crumbs that leaves behind: bits of a spray much smaller than a leaf.)
    const left = new Uint8Array(alpha.data.length);
    for (let i = 0; i < left.length; i++) left[i] = alpha.data[i] > 0.25 ? 1 : 0;
    const bits = patches(left, img.w, img.h);
    const least = (p.leafPx * 0.5) ** 2;
    for (let i = 0; i < left.length; i++) {
      const k = bits.lab[i];
      if (k >= 0 && bits.sizes[k] < least) {
        alpha.data[i] = 0;
        lab[i] = -1;
      }
    }
  }
  // (Each leaf's own number.)
  const own = Float32Array.from({ length: count }, (_, k) => hash(k, id.length * 977 + id.charCodeAt(id.length - 1) * 31 + id.charCodeAt(0)));
  // (Its box: where its coverage is.)
  let x0 = img.w;
  let y0 = img.h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (alpha.data[y * img.w + x] > 0.02) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const out = { id, w: img.w, h: img.h, rgb, alpha, tone, lab, own, count, length, box: { x0, y0, x1, y1 } };
  prepared.set(id, out);
  console.log(`${id}: ${count} leaves, a leaf ${length.toFixed(0)} texels long (guessed ${p.leafPx}), box ${x1 - x0 + 1} x ${y1 - y0 + 1}`);
  if (previewAt) previewPainting(out);
  return out;
}

function previewPainting(p) {
  const { w, h } = p;
  const img = new Img(w * 3, h, 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = p.alpha.data[i];
      for (let c = 0; c < 3; c++) {
        img.set(x, y, c, p.rgb.data[i * 3 + c] * a + 0.5 * (1 - a));
        img.set(x + w, y, c, p.tone.data[i] * a + 0.15 * (1 - a));
      }
      const k = p.lab[i];
      const col = k >= 0 ? [hash(k, 1), hash(k, 2), hash(k, 3)] : [0, 0, 0];
      for (let c = 0; c < 3; c++) img.set(x + 2 * w, y, c, (0.35 + 0.65 * col[c]) * (0.6 + 0.4 * p.tone.data[i]) * a);
    }
  // (The leaves' edges drawn dark.)
  for (let y = 1; y < h; y++)
    for (let x = 1; x < w; x++) {
      const i = y * w + x;
      if (p.lab[i] !== p.lab[i - 1] || p.lab[i] !== p.lab[i - w]) for (let c = 0; c < 3; c++) img.set(x + 2 * w, y, c, 0);
    }
  writePng(img, join(previewAt, `painting-${p.id}.png`));
}

// ---------------------------------------------------------------------------------------------------------------------
// Laying paintings into a cell.

/**
 * A cell: `size` texels square, each texel tone and number premultiplied by coverage, as src/marks.ts's layers
 * are, the cell's +y up (its rows bottom first).
 */
function cellLayer(size) {
  const n = size * size;
  return { size, tone: new Float32Array(n), own: new Float32Array(n), cover: new Float32Array(n) };
}

/** Bilinear sample of a one-channel picture (or a typed array of `w`), 0 outside. */
function bilinear(data, w, h, x, y) {
  x -= 0.5;
  y -= 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : data[j * w + i]);
  return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
}

/**
 * Lay painting `p` into cell `L`: its point (sx, sy) (painting texels) at the cell's (cx, cy) (cell texels, y
 * up), `scale` cell texels to a painting's, turned `rot` (rad, anticlockwise as seen), mirrored if `flip`,
 * each leaf's number moved on by `shift`; over what is there, with a thin shade cast on what it lies over.
 * `map` (optional) takes a cell point (x, y up, cell texels) to a painting point, in place of the above.
 */
function lay(L, p, { sx, sy, cx, cy, scale, rot = 0, flip = false, shift = 0, map = null }) {
  const S = L.size;
  const ca = Math.cos(rot);
  const sa = Math.sin(rot);
  const toPainting = map ?? ((x, y) => {
    // (Into the painting's frame: undo the turn, the mirror and the scale; the painting's y runs down.)
    const dx = x - cx;
    const dy = y - cy;
    let u = (dx * ca + dy * sa) / scale;
    const v = (-dx * sa + dy * ca) / scale;
    if (flip) u = -u;
    return [sx + u, sy - v];
  });
  // (Each texel sampled 3 x 3 over its square, so a painting shrunk a lot is averaged, not aliased.)
  const N = 3;
  const A = new Float32Array(S * S);
  const T = new Float32Array(S * S);
  const O = new Float32Array(S * S);
  const step = 1 / N;
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      let a = 0;
      let t = 0;
      let o = 0;
      let wo = 0;
      for (let q = 0; q < N; q++)
        for (let r = 0; r < N; r++) {
          const [u, v] = toPainting(i + (r + 0.5) * step, j + (q + 0.5) * step);
          if (u < 0 || v < 0 || u >= p.w || v >= p.h) continue;
          const al = bilinear(p.alpha.data, p.w, p.h, u, v);
          if (al <= 0) continue;
          a += al;
          t += al * bilinear(p.tone.data, p.w, p.h, u, v);
          const k = p.lab[Math.floor(v) * p.w + Math.floor(u)];
          if (k >= 0) {
            o += al * ((p.own[k] + shift) % 1);
            wo += al;
          }
        }
      const n = j * S + i;
      A[n] = a / (N * N);
      T[n] = a > 0 ? t / a : 0;
      O[n] = wo > 0 ? o / wo : 0.5;
    }
  // (Its thin shade on what it lies over: just outside its edge, a little darker.)
  const shadeR = Math.max(1, Math.round(S / 128));
  const near = blur(new Img(S, S, 1, Float32Array.from(A)), shadeR, { wrap: false, passes: 2 });
  for (let n = 0; n < S * S; n++) {
    const a = A[n];
    const k = 1 - 0.28 * clamp01(near.data[n] * 1.6) * (1 - a);
    L.tone[n] *= k;
    L.tone[n] = L.tone[n] * (1 - a) + T[n] * a;
    L.own[n] = L.own[n] * (1 - a) + O[n] * a;
    L.cover[n] = L.cover[n] * (1 - a) + a;
  }
}

/**
 * Bring a cell's mean tone up to `mean` (its covered texels', over half covered), by a power of it, so its
 * light and dark keep their order and nothing is clipped: a cluster of thin needles is mostly the dark
 * between them, and came out a shade darker than the drawn marks the style was set by.
 */
function lift(L, mean) {
  for (let pass = 0; pass < 3; pass++) {
    let sum = 0;
    let n = 0;
    for (let k = 0; k < L.cover.length; k++) if (L.cover[k] > 0.5) ((sum += L.tone[k] / L.cover[k]), n++);
    const m = n ? sum / n : mean;
    if (m >= mean - 0.002) return;
    const g = Math.log(mean) / Math.log(m);
    for (let k = 0; k < L.cover.length; k++) if (L.cover[k] > 0) L.tone[k] = L.cover[k] * Math.pow(L.tone[k] / L.cover[k], g);
  }
}
/** The mean tone a painterly cell is brought to. */
const TONE_MEAN = 0.82;

/** Write a cell into an atlas's RGBA8 texels at column `col`, row `row` (row 0 at v = 0), as src/marks.ts `put` does. */
function put(data, width, col, row, L) {
  const S = L.size;
  let sum = 0;
  let wsum = 0;
  for (let n = 0; n < S * S; n++) {
    sum += L.tone[n];
    wsum += L.cover[n];
  }
  const mean = wsum > 0 ? Math.min(1, sum / wsum) : 0.85;
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const n = j * S + i;
      const c = L.cover[n];
      const o = ((row * S + j) * width + col * S + i) * 4;
      const k = Math.round(clamp01(c) * 255);
      data[o] = Math.round(clamp01(k > 0 ? L.tone[n] / c : mean) * 255);
      data[o + 1] = Math.round(clamp01(k > 0 ? L.own[n] : 0.5) * 255);
      data[o + 2] = 0;
      data[o + 3] = k;
    }
}

/**
 * A painterly cell: paintings `ids` laid so their leaves are `leafWant` cell texels long, as many copies as
 * fill the cell's reach (one if one is big enough), set round its middle as a clump's lobes are, each turned
 * a little (or kept upright) and mirrored by its own numbers; then the whole scaled down if it would pass the
 * reach. `seed` makes it its own.
 */
function painterlyCell(ids, leafWant, upright, seed, single = false, row = false) {
  // (And more copies while it covers too little of its cell to read as a clump: airy sprays and tufts.)
  let n = 0;
  let out = null;
  do {
    out = laidCell(ids, leafWant, upright, seed, single, n ? n + 1 : 0, row);
    n = out.copies;
  } while ((!single || row) && n < (single ? 4 : row ? 32 : 8) && coverOf(out.L) < (single ? 0.22 : 0.26));
  return out;
}

/** The share of a cell its marks cover (over half). */
function coverOf(L) {
  let n = 0;
  for (const c of L.cover) if (c > 0.5) n++;
  return n / L.cover.length;
}

/**
 * `painterlyCell` with `count` copies (0: as many as its leaves' size asks). `row`: the copies side by side in
 * a level row, as a pine's shoots stand along a level branch, so a crown of them is plates of tufts (two at
 * the coarsest, a row's worth finer).
 */
function laidCell(ids, leafWant, upright, seed, single, count, row = false) {
  const S = MARK_CELL;
  const reach = REACH * S * 0.5;
  const ps = ids.map(prepare);
  const lenOf = (p) => p.length || PAINTINGS[p.id].leafPx;
  // (How big each painting comes out at that leaf length: its box's half diagonal, near enough its reach.)
  const radiusOf = (p, s) => 0.5 * Math.max(p.box.x1 - p.box.x0, p.box.y1 - p.box.y0) * s;
  const scale0 = leafWant / lenOf(ps[0]);
  const r0 = radiusOf(ps[0], scale0);
  // (How many copies: one if it fills most of the reach, else as many as a clump of lobes that size needs.)
  const n = count || (row ? (single ? 2 : Math.min(32, Math.max(2, Math.round((1.5 * reach) / (1.45 * r0))) * Math.max(2, Math.ceil((2 * reach - 2 * r0) / (0.95 * r0)) + 1))) : single || r0 >= reach * 0.8 ? 1 : Math.min(7, Math.max(2, Math.round((reach / r0) ** 2 * 0.75))));
  const places = [];
  const turn = hash(seed, 1) * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const p = ps[k % ps.length];
    const s = leafWant / lenOf(p);
    // (The first in the middle, the rest round it, the lower ones laid first so the top ones lie over them.)
    const a = turn + (k / Math.max(1, n - 1)) * Math.PI * 2 + (hash(seed, 10 + k) - 0.5) * 0.6;
    const d = k === 0 || n === 1 ? 0 : (reach - radiusOf(p, s)) * (0.75 + 0.25 * hash(seed, 20 + k));
    const rot = upright ? (hash(seed, 30 + k) - 0.5) * 0.25 : (hash(seed, 30 + k) - 0.5) * 1.2;
    // (Plates: the coarsest one plate of two side by side, overlapping; finer, two plates one over the other,
    // the lower one's shoots between the upper's, as src/marks.ts lays a pine's tufts.)
    const r = radiusOf(p, s);
    const plates = n <= 2 ? 1 : single ? 2 : Math.max(2, Math.min(4, Math.round((1.5 * reach) / (1.45 * r0))));
    const across = Math.ceil(n / plates);
    const plate = k % plates;
    const i = Math.floor(k / plates) + (plate ? 0.5 : 0);
    // (The upper and lower plates narrower, drawn in towards the middle: the whole an oval, not a box.)
    const v = plates > 1 ? (plate - (plates - 1) / 2) / (plates / 2) : 0;
    const narrow = Math.sqrt(Math.max(0.2, 1 - 0.85 * v * v));
    const x = row ? ((i - (across - 1) / 2) * r * 0.95 * narrow + (hash(seed, 50 + k) - 0.5) * r * 0.2) : Math.cos(a) * d;
    const y = row ? ((plates - 1) / 2 - plate) * 1.45 * r + (hash(seed, 60 + k) - 0.5) * r * 0.2 : Math.sin(a) * d;
    places.push({ p, s, x, y, rot, flip: hash(seed, 40 + k) < 0.5, shift: k * 0.618 });
  }
  // (Lowest first, so the upper copies' leaves lie over the lower: as light falls on a clump's top.)
  const first = places.shift();
  places.sort((a, b) => a.y - b.y);
  if (n > 1) places.splice(Math.floor(places.length / 2), 0, first);
  else places.push(first);
  // (Fitted: the copies' corners all inside the reach, else everything shrunk about the middle.)
  let most = 0;
  for (const q of places) {
    const { p, s } = q;
    const ca = Math.cos(q.rot);
    const sa = Math.sin(q.rot);
    const mx = (p.box.x0 + p.box.x1) / 2;
    const my = (p.box.y0 + p.box.y1) / 2;
    for (const [bx, by] of [[p.box.x0, p.box.y0], [p.box.x1, p.box.y0], [p.box.x0, p.box.y1], [p.box.x1, p.box.y1]]) {
      const u = (bx - mx) * s * (q.flip ? -1 : 1);
      const v = -(by - my) * s;
      most = Math.max(most, Math.abs(q.x + u * ca - v * sa), Math.abs(q.y + u * sa + v * ca));
    }
  }
  const fit = Math.min(1, reach / most);
  const L = cellLayer(S);
  for (const q of places) {
    const { p } = q;
    lay(L, p, { sx: (p.box.x0 + p.box.x1) / 2, sy: (p.box.y0 + p.box.y1) / 2, cx: S / 2 + q.x * fit, cy: S / 2 + q.y * fit, scale: q.s * fit, rot: q.rot, flip: q.flip, shift: q.shift });
  }
  return { L, copies: n, leaf: leafWant * fit };
}

// ---------------------------------------------------------------------------------------------------------------------
// The painterly atlas.

const HALF = MARK_CELL * 0.5;
const width = MARK_CELL * PAINTERLY_COLS;
const height = MARK_CELL * MARK_KINDS.length;
const atlas = new Uint8Array(width * height * 4);
const rowsMeta = {};
/** Each painted kind's leaf at its coarsest, a share of a cell's half width (as `LEAF_SHARE`, for the shader). */
const leafShare = {};
MARK_KINDS.forEach((kind, row) => {
  const plan = ROWS[kind];
  if (!plan) return;
  const cells = [];
  const share = (leaf) => Math.round((leaf / HALF) * 1000) / 1000;
  const make = (col, want, single) => {
    const d = Math.floor(col / PAINTERLY_VARIANTS);
    const v = col % PAINTERLY_VARIANTS;
    const ids = plan.densities[d].slice(v).concat(plan.densities[d].slice(0, v));
    const { L, copies, leaf } = painterlyCell(ids, want, plan.upright, 7919 * (row + 1) + 131 * col + 3, single, plan.layout === "row");
    lift(L, TONE_MEAN);
    put(atlas, width, col, row, L);
    cells[col] = { paintings: [...new Set(ids.slice(0, copies))], copies, leafShare: share(leaf) };
    console.log(`  ${kind} ${col}: ${copies} cop${copies > 1 ? "ies" : "y"} of ${ids.slice(0, copies).join(", ")}, a leaf ${(share(leaf) * 100).toFixed(0)}% of its half width (want ${((want / HALF) * 100).toFixed(0)}%)`);
    return leaf;
  };
  // (The coarsest: one painting a cell, as big as it fits and its leaves no bigger than the kind's drawn ones;
  // the kind's leaf is then theirs, and the finer densities' leaves that much smaller again, as the shader
  // takes them to be.)
  let sum = 0;
  for (let v = 0; v < PAINTERLY_VARIANTS; v++) sum += make(v, LEAF_SHARE[kind] * HALF, true);
  // (A pine's: its brushes are about the size in the cell the drawn marks' are, and a brush, not a needle, is
  // what the shader's leaf size is for (it chose clusters of brushes twice the size, and a pine read as a
  // broadleaf): the drawn marks' share.)
  const s0 = Math.min(LEAF_SHARE[kind], sum / PAINTERLY_VARIANTS / HALF);
  leafShare[kind] = plan.layout === "row" ? LEAF_SHARE[kind] : Math.round(s0 * 1000) / 1000;
  for (let col = PAINTERLY_VARIANTS; col < PAINTERLY_COLS; col++) make(col, s0 * PAINTERLY_DENSITIES[Math.floor(col / PAINTERLY_VARIANTS)] * HALF, false);
  rowsMeta[kind] = { row, upright: plan.upright, leafShare: leafShare[kind], cells };
});

// ---------------------------------------------------------------------------------------------------------------------
// The sheet atlas: a conifer's bough seen from above, its foot at the bottom of the cell and its tip at the top
// (src/marks.ts `sheetBough`). A painted bough is seen from the side, its sprays hanging from its twig: turned
// so its twig runs up the cell's middle, its sprays reach out to one side, as a bough's side shoots reach out
// level seen from above; another bough's (mirrored) to the other side. Its tip half, which narrows to the
// bough's tip as a bough does, scaled so its sprays reach across the cell's half.

/** A painted bough's twig: points along it from its foot (left) to its tip, each with its way and its normal towards the hanging sprays. */
function twigOf(p) {
  // (Each column's brown, weighted: the twig's middle there.)
  const xs = [];
  const ys = [];
  const ws = [];
  for (let x = p.box.x0; x <= p.box.x1; x++) {
    let n = 0;
    let sy = 0;
    for (let y = p.box.y0; y <= p.box.y1; y++) {
      const i = y * p.w + x;
      if (p.alpha.data[i] > 0.5 && isBrown(p.rgb.data[i * 3], p.rgb.data[i * 3 + 1], p.rgb.data[i * 3 + 2])) {
        n++;
        sy += y;
      }
    }
    if (n >= 3) {
      xs.push(x);
      ys.push(sy / n);
      ws.push(n);
    }
  }
  if (xs.length < 20) throw new Error(`${p.id}: no twig found`);
  // (A cubic through them, least squares, in x scaled to -1..1.)
  const xa = xs[0];
  const xb = xs[xs.length - 1];
  const t = (x) => ((x - xa) / (xb - xa)) * 2 - 1;
  const M = Array.from({ length: 4 }, () => new Float64Array(5));
  xs.forEach((x, k) => {
    const pw = [1, t(x), t(x) ** 2, t(x) ** 3];
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) M[a][b] += ws[k] * pw[a] * pw[b];
      M[a][4] += ws[k] * pw[a] * ys[k];
    }
  });
  for (let c = 0; c < 4; c++) {
    let piv = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < 4; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 5; k++) M[r][k] -= f * M[c][k];
    }
  }
  const coef = M.map((row, c) => row[4] / row[c]);
  const yAt = (x) => coef[0] + coef[1] * t(x) + coef[2] * t(x) ** 2 + coef[3] * t(x) ** 3;
  const pts = [];
  let s = 0;
  for (let x = xa; x <= xb; x++) {
    const y = yAt(x);
    if (pts.length) s += Math.hypot(x - pts[pts.length - 1].x, y - pts[pts.length - 1].y);
    pts.push({ x, y, s });
  }
  const at = (s) => {
    // (Past either end, straight on along its last way.)
    const k = Math.max(1, Math.min(pts.length - 1, pts.findIndex((q) => q.s >= s) < 0 ? pts.length - 1 : pts.findIndex((q) => q.s >= s)));
    const a = pts[k - 1];
    const b = pts[k];
    const len = Math.max(1e-6, b.s - a.s);
    const tx = (b.x - a.x) / len;
    const ty = (b.y - a.y) / len;
    const f = (s - a.s) / len;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, tx, ty, nx: -ty, ny: tx };
  };
  return { length: s, at };
}

/** How far a bough's sprays hang from its twig (painting texels): most of them, along the twig's normal. */
function hangOf(p, twig) {
  const reach = [];
  for (let s = 0; s < twig.length; s += 4) {
    const q = twig.at(s);
    let far = 0;
    for (let d = 0; d < 600; d += 2) {
      const x = Math.round(q.x + q.nx * d);
      const y = Math.round(q.y + q.ny * d);
      if (x < 0 || y < 0 || x >= p.w || y >= p.h) break;
      if (p.alpha.data[y * p.w + x] > 0.5) far = d;
    }
    reach.push(far);
  }
  return quantile(reach, 0.98);
}

const SC = SHEET_CELL;
const sheetW = SC * SHEET_COLS;
const sheetH = SC * SHEET_ROWS;
const sheetAtlas = new Uint8Array(sheetW * sheetH * 4);
const sheetsMeta = [];
/** Where a sheet's twig starts and ends in its cell (cell texels, y up), and how far its sprays reach to each side. */
const FOOT = SC * 0.04;
const TIP = SC * 0.9;
const SIDE = SC * 0.5 * REACH;
SHEETS.forEach((plan, col) => {
  const top = cellLayer(SC);
  const parts = [];
  plan.sides.forEach((id, k) => {
    const p = prepare(id);
    const twig = twigOf(p);
    const hang = hangOf(p, twig);
    // (Above its twig a bough has a short brush: kept, reaching a little over the twig to the other side.)
    const above = hang * 0.22;
    const scale = SIDE / hang;
    const along = (TIP - FOOT) / scale;
    // (Its tip half: from where the window takes in its tip and a little past, back along the twig; started
    // in the gap between two sprays nearest there, so its foot does not cut a spray through.)
    const end = twig.length + hang * 0.12;
    let start = Math.max(0, end - along);
    let best = Infinity;
    for (let s = Math.max(0, start - hang * 0.4); s <= Math.min(end - along * 0.6, start + hang * 0.4); s += 2) {
      const q = twig.at(s);
      let n = 0;
      for (let d = 0; d < hang; d += 2) {
        const x = Math.round(q.x + q.nx * d);
        const y = Math.round(q.y + q.ny * d);
        if (x >= 0 && y >= 0 && x < p.w && y < p.h) n += p.alpha.data[y * p.w + x];
      }
      if (n < best) ((best = n), (start = s));
    }
    const span = (TIP - FOOT) / (end - start);
    const side = k === 0 ? 1 : -1;
    const mid = SC / 2;
    lay(top, p, {
      shift: k * 0.5,
      map: (x, y) => {
        // (Nothing within a few texels of the cell's edge, so its mips do not bleed into the next.)
        if (x < 8 || y < 8 || x > SC - 8 || y > SC - 8) return [-1, -1];
        const s = start + (y - FOOT) / span;
        if (s < start) return [-1, -1];
        const d = ((x - mid) * side) / scale;
        if (d < -above) return [-1, -1];
        const q = twig.at(s);
        return [q.x + q.nx * d, q.y + q.ny * d];
      },
    });
    parts.push({ painting: id, side: side > 0 ? "right" : "left", from: Math.round(start), to: Math.round(end), scale: Math.round(scale * 1000) / 1000 });
    console.log(`  sheet ${col} (${plan.kind}) ${side > 0 ? "right" : "left"}: ${id}, its twig ${twig.length.toFixed(0)} texels, sprays hang ${hang.toFixed(0)}, from ${start.toFixed(0)}`);
  });
  put(sheetAtlas, sheetW, col, 0, top);
  // (Its underside: the same outline, a shade darker, its needles' backs.)
  const under = cellLayer(SC);
  for (let n = 0; n < SC * SC; n++) {
    under.tone[n] = top.tone[n] * 0.82;
    under.own[n] = top.own[n];
    under.cover[n] = top.cover[n];
  }
  put(sheetAtlas, sheetW, col, 1, under);
  sheetsMeta.push({ kind: plan.kind, parts });
});

// ---------------------------------------------------------------------------------------------------------------------
// Out.

/** AVIF quality: the tone is a painting's detail, the most of the bytes; 65 keeps it and its leaves' edges. */
const AVIF_Q = Number(process.env.MARKS_Q ?? 65);
/** Write an atlas's texels (rows as they are: bottom first) as AVIF, each channel its own (no colour matrix). */
function writeAtlas(data, w, h, name) {
  const img = new Img(w, h, 4);
  for (let i = 0; i < data.length; i++) img.data[i] = data[i] / 255;
  const png = join(TMP, `${name}.png`);
  writePng(img, png);
  const file = join(OUT, `${name}.avif`);
  // (Identity matrix, 4:4:4, full range: tone, number and coverage each kept apart, as data are.)
  execFileSync(process.env.AVIFENC ?? "avifenc", ["-j", "1", "-s", "4", "-q", String(AVIF_Q), "--qalpha", "90", "-y", "444", "-r", "full", "--cicp", "1/13/0", "--ignore-exif", "--ignore-xmp", png, file], { stdio: "ignore" });
  return { file, bytes: statSync(file).size };
}

/** An atlas as it decodes (avifdec, then ImageMagick), RGBA8, rows as in the file. */
function decodeAvif(file, w, h) {
  const png = join(TMP, "decoded.png");
  execFileSync(process.env.AVIFDEC ?? "avifdec", ["--depth", "8", file, png], { stdio: "ignore" });
  const buf = execFileSync(process.env.MAGICK ?? "magick", [png, "-depth", "8", "rgba:-"], { maxBuffer: 1 << 30 });
  if (buf.length !== w * h * 4) throw new Error(`${file}: decoded ${buf.length} bytes`);
  return new Uint8Array(buf);
}

/** What the tests hold a cell to: its coverage, whether its border is clear, its mean tone, how many leaves' numbers. */
function cellStats(data, w, cell, col, row) {
  let drawn = 0;
  let border = 0;
  let tone = 0;
  const owns = new Set();
  for (let j = 0; j < cell; j++)
    for (let i = 0; i < cell; i++) {
      const o = ((row * cell + j) * w + col * cell + i) * 4;
      const a = data[o + 3];
      if (a > 127) {
        drawn++;
        tone += data[o];
        owns.add(data[o + 1] >> 4);
      }
      if ((i < 2 || j < 2 || i >= cell - 2 || j >= cell - 2) && a > 0) border++;
    }
  return { cover: Math.round((drawn / (cell * cell)) * 1000) / 1000, border, tone: drawn ? Math.round((tone / drawn / 255) * 1000) / 1000 : 0, owns: owns.size };
}

const painted = writeAtlas(atlas, width, height, "painterly");
const sheets = writeAtlas(sheetAtlas, sheetW, sheetH, "sheets");
const back = decodeAvif(painted.file, width, height);
const backSheets = decodeAvif(sheets.file, sheetW, sheetH);
for (const meta of Object.values(rowsMeta)) meta.cells.forEach((c, col) => Object.assign(c, cellStats(back, width, MARK_CELL, col, meta.row)));
sheetsMeta.forEach((m, col) => Object.assign(m, { top: cellStats(backSheets, sheetW, SC, col, 0), under: cellStats(backSheets, sheetW, SC, col, 1) }));

const used = [...new Set([...Object.values(ROWS).flatMap((r) => r.densities.flat()), ...SHEETS.flatMap((s) => s.sides)])];
const manifest = {
  about: "The painterly look's painted marks: hand-painted leaf clusters and boughs (AI-generated, not CC0; SOURCES.md), keyed, toned and cut into their leaves. Written by tools/marks/build.mjs.",
  tools: { magick: magickVersion(), avifenc: avifVersion() },
  channels: "red tone, green each painted leaf's own number, blue 0, alpha coverage; rows bottom first (row 0 of the file is v = 0)",
  painterly: { file: "painterly.avif", bytes: painted.bytes, cell: MARK_CELL, cols: PAINTERLY_COLS, rows: MARK_KINDS.length, kinds: rowsMeta, leafShare },
  sheets: { file: "sheets.avif", bytes: sheets.bytes, cell: SC, cols: SHEET_COLS, rows: SHEET_ROWS, columns: sheetsMeta },
  sources: used.map((id) => ({ id, file: PAINTINGS[id].file, title: PAINTINGS[id].title, leaves: prepare(id).count, leafTexels: Math.round(prepare(id).length) })),
};
writeFileSync(join(OUT, "marks.json"), `${JSON.stringify(manifest, null, 2)}\n`);

// (The painted marks' section of SOURCES.md, between its markers, the rest as tools/scans/build.mjs wrote it.)
const BEGIN = "<!-- painted marks: written by tools/marks/build.mjs -->";
const END = "<!-- end of painted marks -->";
const section = [
  BEGIN,
  "## Painted marks (the painterly look)",
  "",
  "The painterly look's leaf clusters and boughs (`marks/`) are laid from these hand-painted pictures, keyed off their magenta,",
  "toned and cut into their painted leaves by `tools/marks/build.mjs` (which writes this section; the list is `tools/marks/recipe.mjs`).",
  "Each is **AI-generated, not CC0**: made for this project with the owner's approval, with the tool, on the date and from the prompt",
  "given (the prompts are `tools/ai-textures/PROMPTS.md`'s).",
  "",
  ...used.map((id) => `- \`${PAINTINGS[id].file}\` (${PAINTINGS[id].title}): AI-generated, not CC0; ${TOOL}, ${DATE}. Prompt: "${PAINTINGS[id].prompt}"`),
  END,
].join("\n");
const mdFile = join(root, "assets/SOURCES.md");
const md = readFileSync(mdFile, "utf8");
const b = md.indexOf(BEGIN);
const e = md.indexOf(END);
writeFileSync(mdFile, b >= 0 && e > b ? md.slice(0, b) + section + md.slice(e + END.length) : `${md.trimEnd()}\n\n${section}\n`);

console.log(`painterly.avif ${(painted.bytes / 1024).toFixed(0)} KB, sheets.avif ${(sheets.bytes / 1024).toFixed(0)} KB`);
for (const [kind, m] of Object.entries(rowsMeta)) console.log(`  ${kind}: leaf ${m.leafShare}; ${m.cells.map((c) => `${c.cover}/${c.tone}/${c.owns}${c.border ? "/B" + c.border : ""}`).join(" ")}`);
for (const m of sheetsMeta) console.log(`  sheet ${m.kind}: top ${m.top.cover}/${m.top.tone}/${m.top.owns}/B${m.top.border}, under ${m.under.cover}/${m.under.tone}/B${m.under.border}`);

if (previewAt) {
  // (The atlases as they decode, the right way up: tone over grey, and each leaf's number coloured.)
  const preview = (data, w, h, name) => {
    const img = new Img(w * 2, h, 3);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const o = ((h - 1 - j) * w + i) * 4;
        const a = data[o + 3] / 255;
        const t = data[o] / 255;
        const g = data[o + 1] / 255;
        const leaf = [0.3 + 0.55 * g, 0.75 - 0.4 * g, 0.35 + 0.5 * (1 - Math.abs(g - 0.5) * 2)];
        for (let c = 0; c < 3; c++) {
          img.set(i, j, c, t * a + 0.45 * (1 - a));
          img.set(i + w, j, c, leaf[c] * t * a + 0.12 * (1 - a));
        }
      }
    writePng(img, join(previewAt, name));
  };
  preview(back, width, height, "atlas-painterly.png");
  preview(backSheets, sheetW, sheetH, "atlas-sheets.png");
}
