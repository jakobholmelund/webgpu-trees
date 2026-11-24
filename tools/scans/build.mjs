// Turn the downloaded scans (fetch.mjs) into what the realistic look loads: assets/bark, assets/leaves,
// assets/scans.json (what each picture holds and how big it is in the world) and assets/SOURCES.md (who made
// each, under what licence). Same sources, same tools, same bytes out.
//
//   node tools/scans/build.mjs <raw> [--preview <dir>]
//
// Bark: each set is a tile 1024 texels square, resampled from the scan as a tile (wrapping round its edges,
// in linear light), with the light left in the photograph evened out over long distances (so a repeat is not
// marked by a bright or dark patch), its normals made unit length, its height stretched to 0..1.
//   <id>.albedo.avif   colour (sRGB), roughness in alpha
//   <id>.normal.avif   normal x, normal y (OpenGL: y up the picture), height; z is sqrt(1 - x² - y²)
// Leaves: each set a sheet of single leaves, cut from the scan along its coverage, stood upright (stalk
// down, tip up), the colour bled out past each leaf's edge (so mipmaps do not darken its rim), packed.
//   <id>.albedo.avif   colour (sRGB), coverage in alpha
//   <id>.normal.avif   normal x, normal y, how much light the leaf lets through (0..1)

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BARK, LEAVES, SITES, SOURCES } from "./recipe.mjs";
import { Img, avifVersion, blur, luminance, magickVersion, quantile, read, seamRatio, size as sizeOf, toLinear, toSrgb, writeAvif, writePng } from "./image.mjs";

const args = process.argv.slice(2);
const raw = args[0];
const previewAt = args.indexOf("--preview") >= 0 ? args[args.indexOf("--preview") + 1] : null;
const only = args.indexOf("--only") >= 0 ? args[args.indexOf("--only") + 1].split(",") : null;
if (!raw) {
  console.error("usage: node tools/scans/build.mjs <raw> [--preview <dir>] [--only id,id]");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(root, "assets");
const TMP = join(previewAt ?? join(root, "node_modules/.cache"), "scans-tmp");
mkdirSync(join(OUT, "bark"), { recursive: true });
mkdirSync(join(OUT, "leaves"), { recursive: true });
mkdirSync(TMP, { recursive: true });
if (previewAt) mkdirSync(previewAt, { recursive: true });

const BARK_N = 1024;
/** The mean lightness (linear) a leaf kept as lightness only is brought to: a mid green leaf's. */
const TONE_MEAN = 0.18;
const r3 = (x) => Math.round(x * 1000) / 1000;

/** The file holding map `m` of a source (its own names for them; a generated picture's, as prepared). */
function mapFile(key, m) {
  const s = SOURCES[key];
  if (s.site === "generated") {
    const f = join(prepareGenerated(key), `${m}.png`);
    return existsSync(f) ? f : null;
  }
  const names = s.site === "ambientcg" ? { diff: "Color", nor_gl: "NormalGL", rough: "Roughness", disp: "Displacement", alpha: "Opacity", scatter: "Scattering" } : {};
  const f = join(raw, key, s.map(names[m] ?? m));
  return existsSync(f) ? f : null;
}

function encode(img, name, opts) {
  const png = join(TMP, `${name.replace(/\//g, "_")}.png`);
  writePng(img, png);
  writeAvif(png, join(OUT, `${name}.avif`), opts);
  return png;
}

// ---------------------------------------------------------------------------------------------------------------------
// Generated pictures: one colour picture each, from which the maps a scan comes with are made.

const prepared = new Map();
/** The magenta generated leaves lie on (as sampled from their backgrounds). */
const KEY = [0.98, 0.27, 0.96];

/**
 * A generated picture's maps, as a scan's are, in a folder of their own: a bark's colour cut square and made
 * to tile (its edges cross-faded with itself moved half a tile, so it wraps without a seam), its relief from
 * its lightness (the furrows and lenticels darker than round about), its roughness; a sheet of leaves on
 * magenta keyed out (its coverage where it is not magenta, the magenta's spill taken off its edges), its
 * relief from its lightness. The folder.
 */
function prepareGenerated(key) {
  if (prepared.has(key)) return prepared.get(key);
  const s = SOURCES[key];
  const dir = join(TMP, "generated", key);
  mkdirSync(dir, { recursive: true });
  const src = join(raw, key, s.file);
  if (s.crop) {
    const { w, h } = sizeOf(src);
    const n = Math.round(Math.min(w, h) * s.crop.size);
    const x0 = Math.round((w - n) * s.crop.x);
    const y0 = Math.round((h - n) / 2);
    const N = BARK_N;
    const img = read(src, { channels: 3 });
    const sq = new Img(N, N, 3);
    // (Cut square and resampled to the tile's size: box-filtered, in linear light.)
    const k = n / N;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let cnt = 0;
          for (let yy = Math.floor(y0 + y * k); yy < Math.ceil(y0 + (y + 1) * k); yy++)
            for (let xx = Math.floor(x0 + x * k); xx < Math.ceil(x0 + (x + 1) * k); xx++) {
              sum += toLinear(img.get(Math.min(w - 1, xx), Math.min(h - 1, yy), c));
              cnt++;
            }
          sq.set(x, y, c, sum / cnt);
        }
    // (Made to tile: near its edges it is itself moved half a tile, whose middle runs on across them.)
    const tiled = new Img(N, N, 3);
    const band = N * 0.22;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const edge = Math.min(x, N - 1 - x, y, N - 1 - y);
        const t = Math.min(1, edge / band);
        const wgt = t * t * (3 - 2 * t);
        for (let c = 0; c < 3; c++) tiled.set(x, y, c, toSrgb(sq.get(x, y, c) * wgt + sq.get((x + N / 2) % N, (y + N / 2) % N, c) * (1 - wgt)));
      }
    writePng(tiled, join(dir, "diff.png"));
    // Its relief from its lightness: lightly smoothed, its long-range light taken off.
    const L = new Img(N, N, 1);
    for (let i = 0; i < N * N; i++) L.data[i] = luminance(toLinear(tiled.data[i * 3]), toLinear(tiled.data[i * 3 + 1]), toLinear(tiled.data[i * 3 + 2]));
    const fine = blur(L, 1, { passes: 2 });
    const broad = blur(L, Math.round(N / 16));
    const hRaw = fine.data.map((v, i) => Math.log(v + 0.01) - Math.log(broad.data[i] + 0.01));
    const lo = quantile(hRaw, 0.01);
    const hi = quantile(hRaw, 0.99);
    const H = new Img(N, N, 1, hRaw.map((v) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)))));
    writePng(H, join(dir, "disp.png"));
    writePng(normalsFrom(H, 5), join(dir, "nor_gl.png"));
    // (Rougher in its furrows.)
    writePng(new Img(N, N, 1, H.data.map((v) => 0.95 - 0.25 * v)), join(dir, "rough.png"));
  } else if (s.key === "magenta") {
    const img = read(src, { channels: 3 });
    const { w, h } = img;
    const rgb = new Img(w, h, 3);
    const alpha = new Img(w, h, 1);
    const L = new Img(w, h, 1);
    // (The magenta this picture lies on, as sampled from its border: generated pictures' backgrounds run from
    // #FF00FF to a lighter pink-magenta. How magenta a texel is: red and blue both over green, against the key's.)
    const border = [];
    for (let x = 0; x < w; x += 4) for (const y of [2, h - 3]) border.push(x, y);
    for (let y = 0; y < h; y += 4) for (const x of [2, w - 3]) border.push(x, y);
    const key = [0, 1, 2].map((k) => {
      const v = [];
      for (let i = 0; i < border.length; i += 2) v.push(img.get(border[i], border[i + 1], k));
      return quantile(v, 0.5);
    });
    const keyM = Math.max(0.3, Math.min(key[0], key[2]) - key[1]);
    for (let i = 0; i < w * h; i++) {
      const r = img.data[i * 3];
      const g = img.data[i * 3 + 1];
      const b = img.data[i * 3 + 2];
      const m = Math.min(r, b) - g;
      // (Opaque under a third of the key's magenta-ness, clear over four fifths of it; and as near the key's
      // own colour as a texel is, clear too.)
      const near = Math.hypot(r - key[0], g - key[1], b - key[2]);
      const a = Math.min(Math.min(1, Math.max(0, (0.8 * keyM - m) / (0.45 * keyM))), Math.min(1, Math.max(0, (near - 0.06) / 0.18)));
      alpha.data[i] = a;
      // (An edge texel is part leaf, part magenta: the magenta's share taken out of its colour, as it was mixed
      // in, and any magenta left (red and blue both over green) taken off both, so no pink rim is left.)
      const un = (o, bg) => Math.min(1, Math.max(0, (o - (1 - a) * bg) / Math.max(a, 0.05)));
      let rr = a < 1 ? un(r, key[0]) : r;
      const gg = a < 1 ? un(g, key[1]) : g;
      let bb = a < 1 ? un(b, key[2]) : b;
      const spill = Math.max(0, Math.min(rr, bb) - gg);
      rr -= spill;
      bb -= spill;
      rgb.data[i * 3] = rr;
      rgb.data[i * 3 + 1] = gg;
      rgb.data[i * 3 + 2] = bb;
      L.data[i] = luminance(toLinear(rr), toLinear(gg), toLinear(bb));
    }
    writePng(rgb, join(dir, "diff.png"));
    writePng(alpha, join(dir, "alpha.png"));
    // (Its relief: the midrib and veins lighter, and so proud.)
    const fine = blur(L, 1, { passes: 2, wrap: false });
    const H = new Img(w, h, 1, fine.data.map((v, i) => (alpha.data[i] > 0 ? Math.sqrt(v) : 0)));
    writePng(H, join(dir, "disp.png"));
    writePng(normalsFrom(H, 3), join(dir, "nor_gl.png"));
  }
  prepared.set(key, dir);
  return dir;
}

/** Normals (OpenGL: y up the picture) from a height picture, `k` its relief's strength, wrapping round. */
function normalsFrom(H, k) {
  const { w, h } = H;
  const out = new Img(w, h, 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = H.get((x + 1) % w, y, 0) - H.get((x - 1 + w) % w, y, 0);
      const dy = H.get(x, (y + 1) % h, 0) - H.get(x, (y - 1 + h) % h, 0);
      let nx = -dx * k;
      let ny = dy * k;
      const l = Math.hypot(nx, ny, 1);
      out.set(x, y, 0, (nx / l) * 0.5 + 0.5);
      out.set(x, y, 1, (ny / l) * 0.5 + 0.5);
      out.set(x, y, 2, (1 / l) * 0.5 + 0.5);
    }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Bark.

function buildBark(set, layer) {
  const s = SOURCES[set.source];
  const N = BARK_N;
  const opt = { resize: [N, N], tile: true };
  const albedo = read(mapFile(set.source, "diff"), { channels: 3, ...opt, linear: true });
  const nor = read(mapFile(set.source, "nor_gl"), { channels: 3, ...opt });
  const rough = read(mapFile(set.source, "rough"), { channels: 1, ...opt });
  const disp = read(mapFile(set.source, "disp"), { channels: 1, ...opt });
  for (const r of set.heal ?? []) for (const img of [albedo, nor, rough, disp]) heal(img, r);
  const seams = { albedo: r3(seamRatio(albedo)), normal: r3(seamRatio(nor)) };

  // Into linear light.
  const lin = new Img(N, N, 3);
  for (let i = 0; i < lin.data.length; i++) lin.data[i] = toLinear(albedo.data[i]);

  // Even out the photograph's light: its lightness over long distances (a blur a sixth of the tile wide) is
  // pulled towards the tile's mean, as much as `delight` says. Colour is kept, only scaled.
  const logL = new Img(N, N, 1);
  for (let i = 0; i < N * N; i++) logL.data[i] = Math.log(luminance(lin.data[i * 3], lin.data[i * 3 + 1], lin.data[i * 3 + 2]) + 0.005);
  const meanLog = logL.data.reduce((a, b) => a + b, 0) / (N * N);
  const low = blur(logL, Math.round(N / 12));
  for (let i = 0; i < N * N; i++) {
    const f = Math.exp((meanLog - low.data[i]) * set.delight);
    for (let k = 0; k < 3; k++) lin.data[i * 3 + k] = Math.min(1, lin.data[i * 3 + k] * f);
  }


  // Height: stretched so its 0.5 % and 99.5 % points are 0 and 1.
  const h0 = quantile(disp.data, 0.005);
  const h1 = quantile(disp.data, 0.995);
  const height = disp.data.map((v) => Math.min(1, Math.max(0, (v - h0) / Math.max(1e-6, h1 - h0))));

  const out = new Img(N, N, 4);
  const surf = new Img(N, N, 3);
  const mean = [0, 0, 0];
  let roughMean = 0;
  for (let i = 0; i < N * N; i++) {
    for (let k = 0; k < 3; k++) {
      out.data[i * 4 + k] = toSrgb(lin.data[i * 3 + k]);
      mean[k] += lin.data[i * 3 + k] / (N * N);
    }
    out.data[i * 4 + 3] = rough.data[i];
    roughMean += rough.data[i] / (N * N);
    let x = nor.data[i * 3] * 2 - 1;
    let y = nor.data[i * 3 + 1] * 2 - 1;
    let z = nor.data[i * 3 + 2] * 2 - 1;
    const l = Math.hypot(x, y, Math.max(0.05, z));
    x /= l;
    y /= l;
    surf.data[i * 3] = x * 0.5 + 0.5;
    surf.data[i * 3 + 1] = y * 0.5 + 0.5;
    surf.data[i * 3 + 2] = height[i];
  }
  const aPng = encode(out, `bark/${set.id}.albedo`, { quality: 62, alphaQuality: 50, yuv: "420" });
  const nPng = encode(surf, `bark/${set.id}.normal`, { quality: 70, yuv: "444" });
  if (previewAt) barkPreview(set, aPng, nPng);

  const mm = set.tileCm ? set.tileCm.map((c) => c * 10) : s.sizeMm;
  return {
    id: set.id,
    layer,
    tileCm: mm.map((v) => Math.round(v) / 10),
    tileFrom: set.tileFrom ?? s.sizeFrom ?? `measured: ${SITES[s.site].name}'s stated size of the scan`,
    meanLinear: mean.map(r3),
    meanColor: "#" + mean.map((v) => Math.round(toSrgb(v) * 255).toString(16).padStart(2, "0")).join(""),
    roughness: r3(roughMean),
    seams,
    origin: s.site === "generated" ? "generated" : "scan",
    look: set.look,
    for: set.for,
    source: set.source,
  };
}

/**
 * Paint over a mark that would show at every repeat of a tile: the rectangle `r` (shares of the tile, may run
 * past its edges, wrapping) taken from the tile moved by (dx, dy), feathered into what is round it.
 */
function heal(img, r) {
  const { w, h, c } = img;
  const src = Float32Array.from(img.data);
  const F = 0.04;
  for (let y = Math.floor((r.y0 - F) * h); y < Math.ceil((r.y1 + F) * h); y++)
    for (let x = Math.floor((r.x0 - F) * w); x < Math.ceil((r.x1 + F) * w); x++) {
      const u = x / w;
      const v = y / h;
      const inside = Math.min(u - r.x0, r.x1 - u, v - r.y0, r.y1 - v);
      const t = Math.min(1, Math.max(0, (inside + F) / F));
      const k = t * t * (3 - 2 * t);
      if (k <= 0) continue;
      const xi = ((x % w) + w) % w;
      const yi = ((y % h) + h) % h;
      const xs = (((x + Math.round(r.dx * w)) % w) + w) % w;
      const ys = (((y + Math.round(r.dy * h)) % h) + h) % h;
      for (let q = 0; q < c; q++) img.data[(yi * w + xi) * c + q] = src[(yi * w + xi) * c + q] * (1 - k) + src[(ys * w + xs) * c + q] * k;
    }
}

/** A preview of a bark set: its colour tiled two by two, and its surface lit from the upper left. */
function barkPreview(set, aPng, nPng) {
  const nrm = read(nPng, { channels: 3 });
  const N = nrm.w;
  const lit = new Img(N, N, 3);
  const L = [-0.5, 0.6, 0.62];
  for (let i = 0; i < N * N; i++) {
    const x = nrm.data[i * 3] * 2 - 1;
    const y = nrm.data[i * 3 + 1] * 2 - 1;
    const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    const d = Math.max(0, x * L[0] + y * L[1] + z * L[2]);
    lit.data[i * 3] = d * 0.8 + 0.1;
    lit.data[i * 3 + 1] = d * 0.8 + 0.1;
    lit.data[i * 3 + 2] = nrm.data[i * 3 + 2];
  }
  const litPng = join(TMP, `${set.id}-lit.png`);
  writePng(lit, litPng);
  execMagick([aPng, "-alpha", "off", "-write", "mpr:a", "+delete", "mpr:a", "mpr:a", "+append", "-write", "mpr:r", "+delete", "mpr:r", "mpr:r", "-append", "-resize", "1024x1024", join(previewAt, `bark-${set.id}-tiled.jpg`)]);
  execMagick([aPng, "-alpha", "off", "-resize", "512x512", litPng, "-resize", "512x512", "+append", join(previewAt, `bark-${set.id}.jpg`)]);
}

function execMagick(a) {
  execFileSync(process.env.MAGICK ?? "magick", a);
}

// ---------------------------------------------------------------------------------------------------------------------
// Leaves.

/** Label each covered texel (alpha over a half) by the patch of covered texels it is joined to (8 ways). */
function components(alpha) {
  const { w, h } = alpha;
  const lab = new Int32Array(w * h).fill(-1);
  const comps = [];
  const stack = [];
  for (let i0 = 0; i0 < w * h; i0++) {
    if (lab[i0] >= 0 || alpha.data[i0] <= 0.5) continue;
    const id = comps.length;
    const c = { id, n: 0, sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0, x0: w, y0: h, x1: 0, y1: 0 };
    lab[i0] = id;
    stack.push(i0);
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      const y = (i / w) | 0;
      c.n++;
      c.sx += x;
      c.sy += y;
      c.sxx += x * x;
      c.syy += y * y;
      c.sxy += x * y;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (lab[j] < 0 && alpha.data[j] > 0.5) {
            lab[j] = id;
            stack.push(j);
          }
        }
    }
    comps.push(c);
  }
  return { lab, comps };
}

/** Grow every patch's label `r` texels into the uncovered texels round it (so its soft edge is its own). */
function growLabels(lab, w, h, r) {
  let cur = lab;
  for (let p = 0; p < r; p++) {
    const next = Int32Array.from(cur);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cur[i] >= 0) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && cur[yy * w + xx] >= 0) {
            next[i] = cur[yy * w + xx];
            break;
          }
        }
      }
    cur = next;
  }
  return cur;
}

/** Bilinear sample of channel k at (x, y), 0 outside. */
function sample(img, x, y, k) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  let s = 0;
  for (const [dx, dy, wgt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const xx = x0 + dx;
    const yy = y0 + dy;
    if (xx < 0 || yy < 0 || xx >= img.w || yy >= img.h) continue;
    s += img.data[(yy * img.w + xx) * img.c + k] * wgt;
  }
  return s;
}

const BASE_DIR = { down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1] };

function buildLeaves(set) {
  const key = set.source;
  const color = read(mapFile(key, "diff"), { channels: 3 });
  const alpha = read(mapFile(key, "alpha"), { channels: 1 });
  const nor = read(mapFile(key, "nor_gl"), { channels: 3 });
  const dispFile = mapFile(key, "disp");
  const disp = dispFile ? read(dispFile, { channels: 1 }) : null;
  const scatFile = mapFile(key, "scatter");
  const scat = scatFile ? read(scatFile, { channels: 1 }) : null;
  const { w, h } = color;

  // Where to look, and which way the stalks point there.
  const rects = set.rects ?? [{ x0: 0, y0: 0, x1: 1, y1: 1, base: set.base }];
  const inRect = new Int8Array(w * h).fill(-1);
  rects.forEach((r, k) => {
    for (let y = Math.floor(r.y0 * h); y < Math.ceil(r.y1 * h); y++) for (let x = Math.floor(r.x0 * w); x < Math.ceil(r.x1 * w); x++) inRect[y * w + x] = k;
  });
  const a = new Img(w, h, 1, alpha.data.map((v, i) => (inRect[i] >= 0 ? v : 0)));
  const found = components(a);
  let { lab, comps } = found;
  if (set.whole) {
    // (A whole leaf whose parts the picture shows apart (a fan's split tips, its threads, dead leaves side by
    // side): every patch but specks, one leaf.)
    const keep = comps.filter((c) => c.n >= 40);
    const one = { id: 0, n: 0, sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0, x0: w, y0: h, x1: 0, y1: 0 };
    for (const c of keep) {
      for (const k of ["n", "sx", "sy", "sxx", "syy", "sxy"]) one[k] += c[k];
      one.x0 = Math.min(one.x0, c.x0);
      one.y0 = Math.min(one.y0, c.y0);
      one.x1 = Math.max(one.x1, c.x1);
      one.y1 = Math.max(one.y1, c.y1);
    }
    const ids = new Set(keep.map((c) => c.id));
    lab = lab.map((l) => (ids.has(l) ? 0 : -1));
    comps = [one];
  }

  // The leaves: patches at least a tenth the size of the biggest in their rectangle (not specks, not bits).
  let leaves = [];
  rects.forEach((r, k) => {
    const mine = comps.filter((c) => inRect[c.y0 * w + c.x0] === k || inRect[Math.round(c.sy / c.n) * w + Math.round(c.sx / c.n)] === k);
    const biggest = Math.max(...mine.map((c) => c.n));
    const big = mine.filter((c) => c.n >= biggest * 0.1).sort((p, q) => q.n - p.n);
    for (const c of big.slice(0, r.count ?? big.length)) leaves.push({ ...c, base: r.base ?? set.base });
  });
  // In reading order: rows (patches whose middles are within half a typical patch's height), then left to right.
  const midY = (c) => (c.y0 + c.y1) / 2;
  leaves.sort((p, q) => midY(p) - midY(q));
  const rowsOf = [];
  const typH = quantile(leaves.map((c) => c.y1 - c.y0), 0.5);
  for (const c of leaves) {
    const row = rowsOf.find((r) => Math.abs(midY(r[0]) - midY(c)) < typH * 0.5);
    if (row) row.push(c);
    else rowsOf.push([c]);
  }
  leaves = rowsOf.flatMap((r) => r.sort((p, q) => p.x0 - q.x0));
  if (set.bases) leaves.forEach((c, i) => (c.base = set.bases[i] ?? c.base));
  if (process.env.DEBUG) leaves.forEach((c, i) => console.log(`  ${i}: x ${c.x0}..${c.x1} y ${c.y0}..${c.y1} n ${c.n}`));
  leaves = leaves.filter((_, i) => !(set.skip ?? []).includes(i)).slice(0, set.max ?? 8);
  const grown = growLabels(lab, w, h, 3);

  // Each stood up: its long axis turned to point its stalk straight down (within 40° of the way the recipe
  // says its stalk points; else just that way).
  for (const c of leaves) {
    const b = BASE_DIR[c.base];
    let u = b;
    if (set.deskew !== false) {
      const mx = c.sx / c.n;
      const my = c.sy / c.n;
      const cxx = c.sxx / c.n - mx * mx;
      const cyy = c.syy / c.n - my * my;
      const cxy = c.sxy / c.n - mx * my;
      const ang = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
      let v = [Math.cos(ang), Math.sin(ang)];
      if (v[0] * b[0] + v[1] * b[1] < 0) v = [-v[0], -v[1]];
      if (v[0] * b[0] + v[1] * b[1] > Math.cos((40 * Math.PI) / 180)) u = v;
    }
    // The turn taking u to (0, 1): out = R · d.
    const th = Math.atan2(1, 0) - Math.atan2(u[1], u[0]);
    c.cos = Math.cos(th);
    c.sin = Math.sin(th);
    // Its extent once turned.
    let ox0 = Infinity;
    let ox1 = -Infinity;
    let oy0 = Infinity;
    let oy1 = -Infinity;
    for (let y = c.y0; y <= c.y1; y++)
      for (let x = c.x0; x <= c.x1; x++) {
        if (lab[y * w + x] !== c.id) continue;
        const X = c.cos * x - c.sin * y;
        const Y = c.sin * x + c.cos * y;
        if (X < ox0) ox0 = X;
        if (X > ox1) ox1 = X;
        if (Y < oy0) oy0 = Y;
        if (Y > oy1) oy1 = Y;
      }
    Object.assign(c, { ox0, ox1, oy0, oy1, len: oy1 - oy0 });
  }
  const longest = Math.max(...leaves.map((c) => c.len));
  const scale = set.px / longest;
  const PAD = 6;
  const SS = 3;

  const sprites = leaves.map((c) => {
    const sw = Math.ceil((c.ox1 - c.ox0) * scale) + 2 * PAD;
    const sh = Math.ceil((c.oy1 - c.oy0) * scale) + 2 * PAD;
    const col = new Img(sw, sh, 4);
    const sur = new Img(sw, sh, 3);
    const thick = [];
    for (let oy = 0; oy < sh; oy++)
      for (let ox = 0; ox < sw; ox++) {
        let A = 0;
        const rgb = [0, 0, 0];
        let nx = 0;
        let ny = 0;
        let tr = 0;
        for (let sy = 0; sy < SS; sy++)
          for (let sx = 0; sx < SS; sx++) {
            // Back from the sprite to the scan: unscale, unturn.
            const X = (ox + (sx + 0.5) / SS - PAD) / scale + c.ox0;
            const Y = (oy + (sy + 0.5) / SS - PAD) / scale + c.oy0;
            const x = c.cos * X + c.sin * Y;
            const y = -c.sin * X + c.cos * Y;
            const xi = Math.round(x);
            const yi = Math.round(y);
            if (xi < 0 || yi < 0 || xi >= w || yi >= h || grown[yi * w + xi] !== c.id) continue;
            const al = sample(a, x, y, 0);
            if (al <= 0) continue;
            A += al;
            for (let k = 0; k < 3; k++) rgb[k] += toLinear(sample(color, x, y, k)) * al;
            // The normal turned with the leaf (the picture's y runs down, the normal's up).
            const n0 = sample(nor, x, y, 0) * 2 - 1;
            const n1 = -(sample(nor, x, y, 1) * 2 - 1);
            nx += (c.cos * n0 - c.sin * n1) * al;
            ny += -(c.sin * n0 + c.cos * n1) * al;
            tr += (scat ? sample(scat, x, y, 0) : disp ? sample(disp, x, y, 0) : 0.5) * al;
          }
        const i = oy * sw + ox;
        const cover = A / (SS * SS);
        col.data[i * 4 + 3] = cover;
        if (A > 0) {
          for (let k = 0; k < 3; k++) col.data[i * 4 + k] = rgb[k] / A;
          sur.data[i * 3] = nx / A;
          sur.data[i * 3 + 1] = ny / A;
          sur.data[i * 3 + 2] = tr / A;
          if (cover > 0.5) thick.push(tr / A);
        }
      }
    // Light through: the scan's own scattering map where it has one, else thinner where the leaf lies lower
    // than its veins and midrib (its displacement): 0.35 at the thickest, 1 at the thinnest.
    const t0 = quantile(thick, 0.05);
    const t1 = quantile(thick, 0.95);
    for (let i = 0; i < sw * sh; i++) {
      const v = (sur.data[i * 3 + 2] - t0) / Math.max(1e-6, t1 - t0);
      const t = Math.min(1, Math.max(0, v));
      sur.data[i * 3 + 2] = scat ? 0.35 + 0.65 * t : disp ? 1 - 0.65 * t : 0.75;
    }
    // Where it stands: its stalk's end (the middle of its lowest covered row) and its tip (of its highest).
    const rowMid = (oy) => {
      let s = 0;
      let n = 0;
      for (let ox = 0; ox < sw; ox++)
        if (col.data[(oy * sw + ox) * 4 + 3] > 0.5) {
          s += ox;
          n++;
        }
      return n ? s / n : null;
    };
    let by = sh - 1;
    while (by > 0 && rowMid(by) === null) by--;
    let ty = 0;
    while (ty < sh - 1 && rowMid(ty) === null) ty++;
    return { col, sur, w: sw, h: sh, base: [rowMid(by), by + 1], tip: [rowMid(ty), ty], size: c.len / longest };
  });

  // Colour, and the turned normals, bled out past the edges; then lightness only, for an autumn scan.
  for (const s of sprites) {
    bleed(s.col, 4, [0, 1, 2]);
    const cov = new Img(s.w, s.h, 4);
    for (let i = 0; i < s.w * s.h; i++) {
      cov.data[i * 4] = s.sur.data[i * 3];
      cov.data[i * 4 + 1] = s.sur.data[i * 3 + 1];
      cov.data[i * 4 + 2] = s.sur.data[i * 3 + 2];
      cov.data[i * 4 + 3] = s.col.data[i * 4 + 3];
    }
    bleed(cov, 4, [0, 1, 2]);
    for (let i = 0; i < s.w * s.h; i++) {
      let x = cov.data[i * 4];
      let y = cov.data[i * 4 + 1];
      const l = Math.hypot(x, y);
      if (l > 0.98) {
        x *= 0.98 / l;
        y *= 0.98 / l;
      }
      s.sur.data[i * 3] = x * 0.5 + 0.5;
      s.sur.data[i * 3 + 1] = y * 0.5 + 0.5;
      s.sur.data[i * 3 + 2] = cov.data[i * 4 + 3] > 0 ? cov.data[i * 4 + 2] : 0.75;
    }
    if (set.tone) {
      // Lightness only, each leaf brought to the same mean (an autumn sheet's leaves run from tan to near
      // black; the species gives a live leaf's colour, so only each leaf's own shading is kept).
      let sum = 0;
      let n = 0;
      for (let i = 0; i < s.w * s.h; i++) {
        const L = luminance(s.col.data[i * 4], s.col.data[i * 4 + 1], s.col.data[i * 4 + 2]);
        const al = s.col.data[i * 4 + 3];
        sum += Math.log(L + 0.005) * al;
        n += al;
        for (let k = 0; k < 3; k++) s.col.data[i * 4 + k] = L;
      }
      const f = TONE_MEAN / Math.exp(sum / n);
      for (let i = 0; i < s.w * s.h; i++) for (let k = 0; k < 3; k++) s.col.data[i * 4 + k] = Math.min(1, s.col.data[i * 4 + k] * f);
    }
    for (let i = 0; i < s.w * s.h; i++) for (let k = 0; k < 3; k++) s.col.data[i * 4 + k] = toSrgb(s.col.data[i * 4 + k]);
  }

  // Packed in shelves, tallest first, at whichever width (512, 768 or 1024) leaves the smallest sheet.
  const GAP = 4;
  const order = sprites.map((_, i) => i).sort((p, q) => sprites[q].h - sprites[p].h || p - q);
  const pack = (W) => {
    let x = GAP;
    let y = GAP;
    let shelf = 0;
    const at = [];
    for (const i of order) {
      const s = sprites[i];
      if (s.w + 2 * GAP > W) return null;
      if (x + s.w + GAP > W) {
        x = GAP;
        y += shelf + GAP;
        shelf = 0;
      }
      at[i] = [x, y];
      x += s.w + GAP;
      shelf = Math.max(shelf, s.h);
    }
    return { W, H: Math.ceil((y + shelf + GAP) / 16) * 16, at };
  };
  const best = [512, 768, 1024].map(pack).filter((p) => p).sort((p, q) => p.W * p.H - q.W * q.H || p.W - q.W)[0];
  const { W, H } = best;
  sprites.forEach((s, i) => ([s.x, s.y] = best.at[i]));
  const sheet = new Img(W, H, 4);
  const surf = new Img(W, H, 3);
  for (let i = 0; i < W * H; i++) {
    surf.data[i * 3] = 0.5;
    surf.data[i * 3 + 1] = 0.5;
    surf.data[i * 3 + 2] = 0.75;
  }
  const mean = [0, 0, 0];
  let covered = 0;
  for (const s of sprites)
    for (let yy = 0; yy < s.h; yy++)
      for (let xx = 0; xx < s.w; xx++) {
        const i = yy * s.w + xx;
        const j = (s.y + yy) * W + s.x + xx;
        for (let k = 0; k < 4; k++) sheet.data[j * 4 + k] = s.col.data[i * 4 + k];
        for (let k = 0; k < 3; k++) surf.data[j * 3 + k] = s.sur.data[i * 3 + k];
        const al = s.col.data[i * 4 + 3];
        for (let k = 0; k < 3; k++) mean[k] += toLinear(s.col.data[i * 4 + k]) * al;
        covered += al;
      }
  const aPng = encode(sheet, `leaves/${set.id}.albedo`, { quality: 66, alphaQuality: 80, yuv: "420" });
  encode(surf, `leaves/${set.id}.normal`, { quality: 66, yuv: "444" });
  if (previewAt) execMagick([aPng, "-background", "#8a9aa8", "-alpha", "remove", "-alpha", "off", join(previewAt, `leaves-${set.id}.jpg`)]);

  const m = mean.map((v) => v / covered);
  return {
    id: set.id,
    size: [W, H],
    lengthCm: set.lengthCm,
    tone: !!set.tone,
    meanLinear: m.map(r3),
    meanColor: "#" + m.map((v) => Math.round(toSrgb(v) * 255).toString(16).padStart(2, "0")).join(""),
    origin: SOURCES[set.source].site === "generated" ? "generated" : "scan",
    sprites: sprites.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h, base: s.base.map((v) => Math.round(v * 10) / 10), tip: s.tip.map((v) => Math.round(v * 10) / 10), size: r3(s.size) })),
    look: set.look,
    for: set.for,
    source: set.source,
  };
}

/**
 * Fill the uncovered texels' channels `ks` (alpha in channel 3) from the covered ones round them: a pyramid
 * of coverage-weighted averages, each level filling the holes of the one below (push-pull). `levels` deep.
 */
function bleed(img, levels, ks) {
  const pyr = [img];
  for (let l = 0; l < levels; l++) {
    const p = pyr[l];
    const w = Math.max(1, p.w >> 1);
    const h = Math.max(1, p.h >> 1);
    const q = new Img(w, h, 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const acc = [0, 0, 0];
        let A = 0;
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            const xx = Math.min(p.w - 1, 2 * x + dx);
            const yy = Math.min(p.h - 1, 2 * y + dy);
            const a = p.data[(yy * p.w + xx) * 4 + 3];
            A += a;
            for (const k of ks) acc[k] += p.data[(yy * p.w + xx) * 4 + k] * a;
          }
        for (const k of ks) q.data[(y * w + x) * 4 + k] = A > 0 ? acc[k] / A : 0;
        q.data[(y * w + x) * 4 + 3] = Math.min(1, A);
      }
    pyr.push(q);
  }
  for (let l = levels - 1; l >= 0; l--) {
    const p = pyr[l];
    const q = pyr[l + 1];
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) {
        const i = (y * p.w + x) * 4;
        const a = p.data[i + 3];
        if (a >= 0.999) continue;
        const j = (Math.min(q.h - 1, y >> 1) * q.w + Math.min(q.w - 1, x >> 1)) * 4;
        if (q.data[j + 3] <= 0) continue;
        // Below the leaf's own colour where it is partly covered; the coarser level's where it is not.
        for (const k of ks) p.data[i + k] = a > 0 ? p.data[i + k] : q.data[j + k];
        if (l > 0) p.data[i + 3] = Math.max(a, q.data[j + 3] > 0 ? 1 : 0);
      }
  }
}

// ---------------------------------------------------------------------------------------------------------------------

const manifestFile = join(OUT, "scans.json");
const prev = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : { bark: { sets: [] }, leaves: { sets: [] } };
const bark = BARK.map((set, layer) => {
  if (only && !only.includes(set.id)) return prev.bark.sets.find((b) => b.id === set.id);
  console.log(`bark ${set.id}`);
  return buildBark(set, layer);
}).filter(Boolean);
const leaves = LEAVES.map((set) => {
  if (only && !only.includes(set.id)) return prev.leaves.sets.find((b) => b.id === set.id);
  console.log(`leaves ${set.id}`);
  return buildLeaves(set);
}).filter(Boolean);
const manifest = {
  about: "What the realistic look's scanned pictures hold. Written by tools/scans/build.mjs; sources and licences in SOURCES.md.",
  tools: { magick: magickVersion(), avifenc: avifVersion() },
  bark: { size: BARK_N, albedo: "colour (sRGB), roughness in alpha", normal: "normal x, normal y (OpenGL, y up the picture), height 0..1", sets: bark },
  leaves: { albedo: "colour (sRGB), coverage in alpha", normal: "normal x, normal y (OpenGL), light let through 0..1", sprite: "x, y, w, h in texels from the top left; base (stalk end) and tip in the sprite's texels; size: its length over its set's longest", sets: leaves },
};
writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(join(OUT, "SOURCES.md"), sourcesMd());
console.log("done");

function sourcesMd() {
  const lines = [
    "# Scanned sources",
    "",
    "The realistic look's bark and leaf pictures (this folder) are made from these scans, and, where no scan exists, from a few",
    "AI-generated pictures. Every scan is **CC0 1.0 Universal** (public domain dedication) as its publisher states for everything",
    "it publishes: ambientCG (" + SITES.ambientcg.licenceUrl + ") and Poly Haven (" + SITES.polyhaven.licenceUrl + "). Credit is not",
    "required; it is given here anyway, with thanks. The **AI-generated** pictures (marked so below) are not CC0 scans: they were",
    "made for this project with Nano Banana (gemini-nano-banana-2.1), with the owner's approval; their prompts are listed below.",
    "",
    "They are cut, cleaned, resampled and packed by `tools/scans/build.mjs` from the files `tools/scans/fetch.mjs` downloads",
    "(the list is `tools/scans/recipe.mjs`). This file is written by the build.",
    "",
    "## Bark",
    "",
    "| Set | Look | For | Source | Author | Licence | Tile (cm) |",
    "|---|---|---|---|---|---|---|",
  ];
  const credit = (key) => {
    const s = SOURCES[key];
    const site = SITES[s.site];
    const page = site.page(s.id);
    if (s.site === "generated") return { src: `${s.title} (\`${s.id}\`)`, author: `AI-generated (${s.tool}, ${s.date}; prompt below)`, licence: "AI-generated, **not CC0**: made for this project, owner-approved" };
    return { src: `[${site.name}: ${s.title ?? s.id}](${page}) (\`${s.id}\`)`, author: s.authors ? s.authors.join(", ") : site.author, licence: `[${site.licence}](${site.licenceUrl})` };
  };
  for (const b of bark) {
    const c = credit(b.source);
    lines.push(`| ${b.id} | ${b.look} | ${b.for.join(", ")} | ${c.src} | ${c.author} | ${c.licence} | ${b.tileCm.join(" × ")} |`);
  }
  lines.push("", "## Leaves", "", "| Set | Look | For | Source | Author | Licence |", "|---|---|---|---|---|---|");
  for (const l of leaves) {
    const c = credit(l.source);
    lines.push(`| ${l.id} | ${l.look} | ${l.for.join(", ")} | ${c.src} | ${c.author} | ${c.licence} |`);
  }
  const used = [...new Set([...BARK, ...LEAVES].map((s) => s.source))];
  lines.push("", "## AI-generated pictures", "");
  for (const key of used) {
    const s = SOURCES[key];
    if (s.site !== "generated") continue;
    lines.push(`- \`${s.file}\` (${s.title}): ${s.tool}, ${s.date}. Prompt: "${s.prompt}"`);
  }
  lines.push("", "## Downloaded files", "");
  for (const key of used) {
    const s = SOURCES[key];
    if (s.site === "generated") continue;
    const urls = s.zip ? [s.zip] : Object.values(s.files);
    lines.push(`- \`${s.id}\`: ${urls.map((u) => `<${u}>`).join(", ")}`);
  }
  lines.push("");
  return lines.join("\n");
}
