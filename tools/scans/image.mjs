// Pictures in and out for the scan tools: decoded to plain arrays of numbers 0..1 (ImageMagick does the
// decoding and resampling), worked on here, and written out as PNG (ImageMagick) and AVIF (avifenc).
// Single-threaded and with fixed settings throughout, so the same sources give the same bytes.

import { execFileSync } from "node:child_process";

const MAGICK = process.env.MAGICK ?? "magick";
const AVIFENC = process.env.AVIFENC ?? "avifenc";

/** A picture: `c` channels a texel, rows top to bottom, values 0..1. */
export class Img {
  constructor(w, h, c, data) {
    this.w = w;
    this.h = h;
    this.c = c;
    this.data = data ?? new Float32Array(w * h * c);
  }
  get(x, y, k) {
    return this.data[(y * this.w + x) * this.c + k];
  }
  set(x, y, k, v) {
    this.data[(y * this.w + x) * this.c + k] = v;
  }
  /** One channel of it, as a picture of its own. */
  channel(k) {
    const out = new Img(this.w, this.h, 1);
    for (let i = 0; i < this.w * this.h; i++) out.data[i] = this.data[i * this.c + k];
    return out;
  }
}

/** Its size, without decoding it. */
export function size(file) {
  const [w, h] = execFileSync(MAGICK, ["identify", "-format", "%w %h", `${file}[0]`]).toString().trim().split(" ").map(Number);
  return { w, h };
}

/**
 * Read a picture, `channels` 1 (grey), 3 or 4. `resize` [w, h] resamples it to that size (stretching it if
 * need be), wrapping round its edges as a tile does (`tile`), and in linear light if `linear` (a colour
 * picture: averaged as light adds, then back to sRGB).
 */
export function read(file, { channels = 3, resize = null, tile = false, linear = false } = {}) {
  const args = [file];
  if (channels === 1) args.push("-colorspace", "Gray");
  if (linear) args.push("-colorspace", "RGB");
  if (resize) {
    if (tile) args.push("-virtual-pixel", "tile");
    args.push("-filter", "Lanczos", "-distort", "Resize", `${resize[0]}x${resize[1]}!`);
  }
  if (linear) args.push("-colorspace", "sRGB");
  const { w, h } = resize ? { w: resize[0], h: resize[1] } : size(file);
  const fmt = channels === 1 ? "gray" : channels === 3 ? "rgb" : "rgba";
  args.push("-depth", "16", `${fmt}:-`);
  const buf = execFileSync(MAGICK, args, { maxBuffer: 1 << 30 });
  const n = w * h * channels;
  if (buf.length !== n * 2) throw new Error(`${file}: expected ${n * 2} bytes, read ${buf.length}`);
  const img = new Img(w, h, channels);
  for (let i = 0; i < n; i++) img.data[i] = buf.readUInt16LE(i * 2) / 65535;
  return img;
}

/** Write a picture as an 8-bit PNG (1, 3 or 4 channels). */
export function writePng(img, file) {
  const fmt = img.c === 1 ? "gray" : img.c === 3 ? "rgb" : img.c === 4 ? "rgba" : null;
  if (!fmt) throw new Error(`can't write ${img.c} channels`);
  const n = img.w * img.h * img.c;
  const buf = Buffer.alloc(n);
  for (let i = 0; i < n; i++) buf[i] = Math.round(Math.min(1, Math.max(0, img.data[i])) * 255);
  const out = img.c === 4 ? "png32" : img.c === 3 ? "png24" : "png";
  const type = img.c === 1 ? ["-define", "png:color-type=0", "-define", "png:bit-depth=8"] : [];
  execFileSync(MAGICK, ["-size", `${img.w}x${img.h}`, "-depth", "8", `${fmt}:-`, "-strip", "-define", "png:exclude-chunks=date,time", ...type, `${out}:${file}`], { input: buf });
}

/**
 * Encode a PNG as AVIF. `quality` 0..100 (colour), `alphaQuality` for its alpha plane; `yuv` "444" keeps each
 * channel's own detail (for data: a normal map's x and y), "420" halves colour's (fine for a photograph).
 */
export function writeAvif(png, file, { quality = 60, alphaQuality = 80, yuv = "444" } = {}) {
  execFileSync(AVIFENC, ["-j", "1", "-s", "4", "-q", String(quality), "--qalpha", String(alphaQuality), "--yuv", yuv, "--ignore-exif", "--ignore-xmp", png, file], { stdio: "ignore" });
}

export function avifVersion() {
  return execFileSync(AVIFENC, ["--version"]).toString().split("\n")[0].trim();
}
export function magickVersion() {
  return execFileSync(MAGICK, ["-version"]).toString().split("\n")[0].replace(/https?:\S+/, "").trim();
}

// ---------------------------------------------------------------------------------------------------------------------
// Colour.

export const toLinear = (s) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
export const toSrgb = (l) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.max(0, l) ** (1 / 2.4) - 0.055);
export function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// ---------------------------------------------------------------------------------------------------------------------
// Filters.

/** A box blur of one channel picture, `r` texels each side, `passes` times (three is close to a Gaussian); wrapping round if `wrap`. */
export function blur(img, r, { passes = 3, wrap = true } = {}) {
  const { w, h } = img;
  let a = Float32Array.from(img.data);
  let b = new Float32Array(w * h);
  const at = (i, n) => (wrap ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i)));
  const norm = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += a[y * w + at(k, w)];
      for (let x = 0; x < w; x++) {
        b[y * w + x] = s * norm;
        s += a[y * w + at(x + r + 1, w)] - a[y * w + at(x - r, w)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += b[at(k, h) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = s * norm;
        s += b[at(y + r + 1, h) * w + x] - b[at(y - r, h) * w + x];
      }
    }
  }
  return new Img(w, h, 1, a);
}

/** The value below which a share `q` of a channel's texels lie (of those `mask` keeps, if given). */
export function quantile(values, q, mask = null) {
  const kept = [];
  for (let i = 0; i < values.length; i++) if (!mask || mask[i]) kept.push(values[i]);
  kept.sort((x, y) => x - y);
  return kept.length ? kept[Math.min(kept.length - 1, Math.max(0, Math.floor(q * (kept.length - 1))))] : 0;
}

/**
 * How well a tile wraps: the mean step in value across its seams (its last column to its first, last row to
 * first) over the mean step between neighbouring texels inside it. About 1 for a seamless tile.
 */
export function seamRatio(img) {
  const { w, h, c } = img;
  let seam = 0;
  let inner = 0;
  let ns = 0;
  let ni = 0;
  for (let y = 0; y < h; y++)
    for (let k = 0; k < c; k++) {
      seam += Math.abs(img.get(w - 1, y, k) - img.get(0, y, k));
      ns++;
      for (const x of [w >> 2, w >> 1, (3 * w) >> 2]) {
        inner += Math.abs(img.get(x, y, k) - img.get(x - 1, y, k));
        ni++;
      }
    }
  for (let x = 0; x < w; x++)
    for (let k = 0; k < c; k++) {
      seam += Math.abs(img.get(x, h - 1, k) - img.get(x, 0, k));
      ns++;
      for (const y of [h >> 2, h >> 1, (3 * h) >> 2]) {
        inner += Math.abs(img.get(x, y, k) - img.get(x, y - 1, k));
        ni++;
      }
    }
  return seam / ns / (inner / ni);
}
