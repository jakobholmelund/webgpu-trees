// A tree's outline from a photograph of it: how wide its crown is, left and right of its trunk, at each
// height, as shares of its height. The photograph is read and left where it is (it is not this
// repository's to hold); only these numbers are kept (test/outlines.json), with who took it.
//
//   node tools/outline.mjs <photo.bmp> <name> <footX> <footY> <plantY> <cutY> <trunkFrom> <trunkTo> [x0 x1] [check.png]
//
// footX, footY: the trunk's foot in the picture (pixels). plantY: below this row only green or dark
// pixels are the tree's (a wall behind it). cutY: below this row only the trunk's column
// (trunkFrom..trunkTo) is (the ground, far woods).
// x0..x1: the columns the tree can be in. The tree is everything not sky joined to the trunk's foot.
// BMP in (24-bit; `sips -s format bmp photo.jpg --out photo.bmp`), JSON out on stdout.
// SEEDS="x,y;x,y" starts the fill at more places than the foot (in the crown: a trunk in shade is not
// always joined up); EXCLUDE="x0,y0,x1,y1;..." leaves out boxes (a neighbouring tree touching the crown).

import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const [file, name, fx, fy, plant, cut, t0, t1, cx0, cx1, check] = process.argv.slice(2);
const footX = Number(fx);
const footY = Number(fy);
const plantY = Number(plant);
const cutY = Number(cut);
const trunkFrom = Number(t0);
const trunkTo = Number(t1);

const buf = readFileSync(file);
const at = buf.readUInt32LE(10);
const w = buf.readInt32LE(18);
const hRaw = buf.readInt32LE(22);
const h = Math.abs(hRaw);
const stride = Math.ceil((w * 3) / 4) * 4;
const x0 = cx0 ? Number(cx0) : 0;
const x1 = cx1 ? Number(cx1) : w - 1;
/** The pixel at column x, row y (from the top), as 0..1 red, green, blue. */
const px = (x, y) => {
  const row = hRaw > 0 ? h - 1 - y : y;
  const o = at + row * stride + x * 3;
  return [buf[o + 2] / 255, buf[o + 1] / 255, buf[o] / 255];
};

/** Sky: blue and bright, or cloud (bright and grey). */
const isSky = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (b > r + 0.08 && b > g + 0.02 && lum > 0.3) return true;
  if (min > 0.62 && max - min < 0.16) return true;
  return false;
};
/** Leaves or bark: green, or dark. */
const isPlant = (r, g, b) => (g > r + 0.02 && g > b - 0.02) || 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.2;

const tree = new Uint8Array(w * h);
const boxes = (process.env.EXCLUDE ?? "").split(";").filter(Boolean).map((b) => b.split(",").map(Number));
const inTree = (x, y) => {
  if (x < x0 || x > x1 || y < 0 || y > footY) return false;
  if (boxes.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d)) return false;
  const [r, g, b] = px(x, y);
  if (isSky(r, g, b)) return false;
  if (y > cutY) return x >= trunkFrom && x <= trunkTo;
  if (y > plantY) return isPlant(r, g, b);
  return true;
};
// (A fill from the trunk's foot through all that is not sky.)
const stack = [[footX, footY - 2], ...(process.env.SEEDS ?? "").split(";").filter(Boolean).map((p) => p.split(",").map(Number))];
while (stack.length > 0) {
  const [x, y] = stack.pop();
  const k = y * w + x;
  if (tree[k] || !inTree(x, y)) continue;
  tree[k] = 1;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

let top = footY;
for (let y = 0; y <= footY && top === footY; y++) for (let x = x0; x <= x1; x++) if (tree[y * w + x]) { top = y; break; }
const height = footY - top;
const rows = 24;
const left = [];
const right = [];
for (let i = 0; i < rows; i++) {
  // (Each a band of rows, its widest: a thin row of a ragged crown is all gaps.)
  const yA = Math.round(footY - ((i + 0) / rows) * height);
  const yB = Math.round(footY - ((i + 1) / rows) * height);
  let l = 0;
  let r = 0;
  for (let y = yB; y < yA; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!tree[y * w + x]) continue;
      l = Math.max(l, footX - x);
      r = Math.max(r, x - footX);
    }
  }
  left.push(+(l / height).toFixed(4));
  right.push(+(r / height).toFixed(4));
}
// (The crown's base: the lowest band clearly wider than the trunk.)
const trunkHalf = (trunkTo - trunkFrom) / 2 / height;
let base = 0;
for (let i = 0; i < rows; i++) if (left[i] + right[i] > trunkHalf * 6) { base = i / rows; break; }
const out = { name, heightPx: height, bands: rows, left, right, crownBase: +base.toFixed(3), crownRadius: +(Math.max(...left.map((l, i) => (l + right[i]) / 2))).toFixed(4) };
console.log(JSON.stringify(out));

if (check) {
  // A picture of what was taken for the tree, to see that the cut is right: the tree white, the rest dark.
  const png = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    png[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = px(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      const t = tree[y * w + x];
      png[o] = t ? 255 : Math.round(r * 90);
      png[o + 1] = t ? 255 : Math.round(g * 90);
      png[o + 2] = t ? 255 : Math.round(b * 90);
    }
  }
  const crc = (bytes) => {
    let c = ~0;
    for (const v of bytes) {
      c ^= v;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const chunk = (type, data) => {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  writeFileSync(check, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(png)), chunk("IEND", Buffer.alloc(0))]));
}
