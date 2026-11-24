// Which way up a realistic card is drawn: its picture's first row at its twig's foot, its leaves on past it,
// for every species alike, and a pine's cushion picture standing on its flat base. Once, a pine's cards
// were written bottom row first to make up for cards thought drawn upside down: its tufts then hung under
// their shoots, its shoots' bare wood stood over them, and its cushions hung beneath their branches. In
// the lab (a two-row texture through three's WebGPU renderer, and a triangle on every card with the twigs
// all turned up) the first row is at the foot: these hold it so.
//
//   node --test test/orientation.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { SPRAY_FOOT, cardPieces } from "../src/geometry.ts";
import { type LeafSet, SCAN_LOOKS, nearCardHalf } from "../src/scans.ts";
import { ALL_SPECIES } from "../src/species.ts";
import { CARD_V, FOOT, type Sheet, drawCushionCard, drawSprayCard, drawnCushionCard } from "../src/sprays.ts";

/** A sheet of one leaf, 40 texels wide and 200 long, its stalk at the bottom (as the sheets stand them). */
function leafSheet(): Sheet {
  const W = 64;
  const H = 220;
  const data = new Uint8Array(W * H * 4);
  for (let y = 10; y < 210; y++) for (let x = 12; x < 52; x++) data.set([90, 140, 60, 255], (y * W + x) * 4);
  const normal = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) normal.set([128, 128, 255, 200], i * 4);
  const set: LeafSet = { id: "test", size: [W, H], lengthCm: 10, tone: false, meanLinear: [0.1, 0.25, 0.05], sprites: [{ x: 0, y: 0, w: W, h: H, base: [32, 210], tip: [32, 10], size: 1 }] };
  return { set, albedo: { data, width: W, height: H }, normal: { data: normal, width: W, height: H } };
}

/**
 * A sheet of one cushion: a half disc, flat side down (the sheet's bottom rows), 240 texels wide and 120 high,
 * its upper half twice as light as its lower (a cushion's sunlit top over its shaded underside).
 */
function cushionSheet(): Sheet {
  const W = 256;
  const H = 136;
  const data = new Uint8Array(W * H * 4);
  const cx = 128;
  const base = 128;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / 120;
      const dy = (base - y) / 120;
      if (dy < 0 || dx * dx + dy * dy > 1) continue;
      const v = dy > 0.5 ? 200 : 100;
      data.set([v, v, v, 255], (y * W + x) * 4);
    }
  const normal = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) normal.set([128, 128, 255, 128], i * 4);
  const set: LeafSet = { id: "cushion", size: [W, H], lengthCm: 200, tone: false, meanLinear: [0.15, 0.15, 0.15], sprites: [{ x: 0, y: 0, w: W, h: H, base: [cx, base], tip: [cx, 8], size: 1 }] };
  return { set, albedo: { data, width: W, height: H }, normal: { data: normal, width: W, height: H } };
}

/** A cell's coverage by row: how many texels of each row are covered. */
function rows(out: { data: Uint8Array; width: number }, n: number): number[] {
  const r = new Array(n).fill(0);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (out.data[(y * out.width + x) * 4 + 3] >= 128) r[y]++;
  return r;
}

test("the shaders lay a card's first row at its twig's foot, where the cards are drawn from", () => {
  // (engine.ts: v = row + 0.5 + CARD_V · aDab.y; geometry.ts puts aDab.y = -1 at the twig's end of the card.)
  assert.ok(CARD_V > 0, "the foot corner is the cell's first row");
  assert.equal(CARD_V, 0.5, "a corner at either end of the cell");
  // (A near card's twig comes in FOOT of the cell from its first row: the card's middle SPRAY_FOOT of its half on from its foot.)
  assert.ok(Math.abs((1 - SPRAY_FOOT) / 2 - FOOT) < 1e-9, `${FOOT} against ${SPRAY_FOOT}`);
});

test("every species' near card is drawn from its foot: its twig comes in at the first rows, its leaves on past it", () => {
  const n = 128;
  const sheet = leafSheet();
  for (const [name, look] of Object.entries(SCAN_LOOKS)) {
    if (look.spray === "whole" || look.spray === "fan" || look.spray === "pinnate") continue;
    const out = { data: new Uint8Array(n * n * 4), width: n, height: n };
    drawSprayCard(out, 0, 0, n, sheet, look, 2 * nearCardHalf(look), false, 5, 0.5);
    const r = rows(out, n);
    const total = r.reduce((a, b) => a + b, 0);
    assert.ok(total > 0, `${name}: nothing drawn`);
    // (Its twig at its foot: covered in the middle of the cell, FOOT of the way up.)
    const fy = Math.round(FOOT * n) + 1;
    let twig = 0;
    for (let x = n / 2 - 8; x <= n / 2 + 8; x++) if (out.data[(fy * n + x) * 4 + 3] > 0) twig++;
    assert.ok(twig > 0, `${name}: no twig at its foot (row ${fy})`);
    // (Nothing before its foot but the twig's end, and its leaves on past it: their mean row well up the card.)
    const before = r.slice(0, Math.round(FOOT * n) - 2).reduce((a, b) => a + b, 0);
    assert.ok(before <= 0.02 * total, `${name}: ${((before / total) * 100).toFixed(1)}% of it before its foot`);
    const mean = r.reduce((a, c, y) => a + c * y, 0) / total;
    assert.ok(mean > 0.3 * n, `${name}: its leaves' mean row ${mean.toFixed(0)} of ${n}, by its foot`);
  }
});

test("a pine's tufts are held up off their shoots: the needles past the shoots' bare foot", () => {
  const n = 160;
  for (const name of ["Stone pine", "Scots pine", "Monterey pine", "Aleppo pine", "Torrey pine"]) {
    const look = SCAN_LOOKS[name];
    const out = { data: new Uint8Array(n * n * 4), width: n, height: n };
    drawSprayCard(out, 0, 0, n, leafSheet(), look, 2 * nearCardHalf(look), false, 9, 0.6);
    const r = rows(out, n);
    // (The near half of the card past its foot has the bare shoot; the far half, the tufts.)
    const near = r.slice(0, Math.round(0.35 * n)).reduce((a, b) => a + b, 0);
    const far = r.slice(Math.round(0.35 * n)).reduce((a, b) => a + b, 0);
    assert.ok(far > 2 * near, `${name}: ${far} texels of needles past its foot's third, ${near} by it`);
  }
});

test("a cushion picture stands on its flat base at the card's foot, its lit top at the far end", () => {
  const n = 128;
  const out = { data: new Uint8Array(n * n * 4), width: n, height: n };
  drawCushionCard(out, 0, 0, n, cushionSheet(), 0);
  const r = rows(out, n);
  const covered = r.map((c, y) => (c > 0 ? y : -1)).filter((y) => y >= 0);
  const first = covered[0];
  const last = covered[covered.length - 1];
  // (Its widest row, its flat base, at its first covered rows; it narrows to its dome's top.)
  const widest = r.indexOf(Math.max(...r));
  assert.ok(widest - first <= 3, `its widest row ${widest}, its first ${first}`);
  assert.ok(r[last] < 0.4 * r[widest], "its top is a dome's");
  assert.ok(first <= 0.15 * n, `its base at row ${first}`);
  // (As wide as the card, about, and half as high: a cushion is wider than high.)
  assert.ok(r[widest] > 0.8 * n && last - first < 0.6 * n, `${r[widest]} wide, ${last - first} high`);
  // (Its light top towards the far end: the upper rows' tone over the lower's.)
  const tone = (y0: number, y1: number) => {
    let s = 0;
    let c = 0;
    for (let y = y0; y < y1; y++)
      for (let x = 0; x < n; x++) {
        const o = (y * n + x) * 4;
        if (out.data[o + 3] < 200) continue;
        s += out.data[o];
        c++;
      }
    return s / Math.max(1, c);
  };
  const mid = Math.round((first + last) / 2);
  assert.ok(tone(mid + 4, last) > 1.4 * tone(first, mid - 4), `its top ${tone(mid + 4, last).toFixed(0)}, its underside ${tone(first, mid - 4).toFixed(0)}`);
});

test("a pine's cushion cards stand upright on their twigs, their foot corners lowest", () => {
  const sp = ALL_SPECIES.find((s) => s.name === "Stone pine")!;
  const tree = growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, 1);
  const half = nearCardHalf(SCAN_LOOKS["Stone pine"]);
  const fixed = { half, fill: 0.6, most: 24, big: 2, bigSize: 1.25, hang: 0, rise: 0.8 };
  for (const [label, p] of [
    ["near", cardPieces([tree], 12, 0.8, undefined, [fixed], undefined, [true])],
    ["mid", cardPieces([tree], 2, 1.45, undefined, undefined, [1], [true])],
  ] as const) {
    const dab = p.attributes.aDab.array;
    const off = p.attributes.aOffset.array;
    const tan = p.attributes.aTangent.array;
    let upright = 0;
    let cards = 0;
    for (let v = 0; v < dab.length / 4; v += 4) {
      // (A near tree's big cards (aOffset.w 1), every one of a mid tree's.)
      if (label === "near" && off[v * 4 + 3] < 0.5) continue;
      cards++;
      assert.ok(Math.abs(off[v * 4 + 1]) < 1e-6, `${label}: a cushion card facing ${off[v * 4 + 1].toFixed(2)} up`);
      if (tan[v * 4 + 1] > 0.999) upright++;
      // (Its corners: those at aDab.y -1 the lowest in its clump, the card's foot on its twig.)
      const at = (c: number) => tan[(v + c) * 4 + 3];
      for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) if (dab[(v + c) * 4 + 1] < 0 && dab[(v + d) * 4 + 1] > 0) assert.ok(at(c) <= at(d) + 1e-6, `${label}: a foot corner above its far one`);
    }
    assert.ok(cards > 20, `${label}: ${cards} cushion cards`);
    assert.equal(upright, cards, `${label}: ${cards - upright} of ${cards} not upright`);
  }
});

test("a pine's drawn cushion is a dome on a flat base at the card's foot, lit on top and dark beneath; an open pine's looser", () => {
  const n = 192;
  const cover = (name: string, density: number) => {
    const look = SCAN_LOOKS[name];
    const out = { data: new Uint8Array(n * n * 4), width: n, height: n };
    drawnCushionCard(out, 0, 0, n, look, 3, 17, density);
    const r = rows(out, n);
    const covered = r.map((c, y) => (c > 0 ? y : -1)).filter((y) => y >= 0);
    const first = covered[0];
    const last = covered[covered.length - 1];
    const tone = (y0: number, y1: number) => {
      let s = 0;
      let c = 0;
      for (let y = y0; y < y1; y++)
        for (let x = 0; x < n; x++) {
          const o = (y * n + x) * 4;
          if (out.data[o + 3] < 200) continue;
          s += out.data[o];
          c++;
        }
      return s / Math.max(1, c);
    };
    return { r, first, last, tone, total: r.reduce((a, b) => a + b, 0) };
  };
  const dense = cover("Stone pine", 0.75);
  assert.ok(dense.first <= 0.15 * n, `its base at row ${dense.first}`);
  const widest = Math.max(...dense.r);
  assert.ok(widest > 0.75 * n, `${widest} texels wide of ${n}`);
  assert.ok(dense.last - dense.first < 0.75 * widest, `${dense.last - dense.first} high for ${widest} wide: wider than high`);
  // (Its widest in its lower half, narrowing to its top: a dome.)
  const at = dense.r.indexOf(widest);
  assert.ok(at < (dense.first + dense.last) / 2, `widest at row ${at}`);
  assert.ok(dense.r[dense.last - 2] < 0.5 * widest, "a dome's top");
  const mid = Math.round((dense.first + dense.last) / 2);
  assert.ok(dense.tone(mid, dense.last) > 1.3 * dense.tone(dense.first, mid), `its top ${dense.tone(mid, dense.last).toFixed(0)}, beneath ${dense.tone(dense.first, mid).toFixed(0)}`);
  // (An open pine's (an Aleppo pine's) is looser: less of its card covered.)
  const open = cover("Aleppo pine", 0.4);
  assert.ok(open.total < 0.8 * dense.total, `${open.total} texels against a dense one's ${dense.total}`);
});
