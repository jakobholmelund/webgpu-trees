// The realistic look's photographs on the trees: every species wears bark and leaves that are in the
// repository, its bark tiles are bark-sized once scaled, its near cards a twig's end, and a leaf laid on a card
// is as long on it as on the tree.
//
//   node --test test/sprays.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { ALL_SPECIES } from "../src/species.ts";
import { BARK_SETS, type LeafSet, SCAN_LOOKS, barkSet, leafSet, nearCardHalf, scanLookOf } from "../src/scans.ts";
import { drawSprayCard } from "../src/sprays.ts";

test("every species wears bark and leaves the manifest has", () => {
  for (const sp of ALL_SPECIES) {
    const l = scanLookOf(sp);
    assert.ok(barkSet(l.bark), `${sp.name}: no bark ${l.bark}`);
    if (l.upper) assert.ok(barkSet(l.upper.set), `${sp.name}: no bark ${l.upper.set}`);
    assert.ok(leafSet(l.leaves), `${sp.name}: no leaves ${l.leaves}`);
    assert.ok(SCAN_LOOKS[sp.name], `${sp.name} has no photographs of its own`);
  }
});

test("bark tiles, as each species scales them, are a hand's width to three metres of bark", () => {
  for (const sp of ALL_SPECIES) {
    const l = scanLookOf(sp);
    for (const [id, scale] of [[l.bark, l.barkScale ?? 1], ...(l.upper ? [[l.upper.set, l.upper.scale ?? 1] as const] : [])] as const) {
      const b = barkSet(id)!;
      // (The shader lays a tile over this much wood: its size in cm over 100, times the species' scale.)
      const [w, h] = b.tileCm.map((c) => (c / 100) * scale);
      assert.ok(w >= 0.15 && w <= 3 && h >= 0.15 && h <= 3, `${sp.name} ${id}: ${w.toFixed(2)} x ${h.toFixed(2)} m`);
    }
  }
  assert.ok(BARK_SETS.every((b, i) => b.layer === i));
});

test("near cards are a twig's end: a fifth to a little under half a metre from their middle; a palm's, its leaf or a stretch of it", () => {
  for (const sp of ALL_SPECIES) {
    const l = scanLookOf(sp);
    const half = nearCardHalf(l);
    if (l.spray === "whole" || l.spray === "fan") assert.ok(half > 0.5 && half <= 1.2, `${sp.name}: ${half}`);
    else if (sp.architecture === "palm") assert.equal(half, 0, sp.name);
    else assert.ok(half >= 0.2 && half <= 0.45, `${sp.name}: ${half}`);
  }
});

test("a leaf on a near card is as long on it as on the tree", () => {
  // (A sheet of one leaf: 40 texels wide, 200 long, stalk at the bottom.)
  const W = 64;
  const H = 220;
  const data = new Uint8Array(W * H * 4);
  for (let y = 10; y < 210; y++) for (let x = 12; x < 52; x++) data.set([90, 140, 60, 255], (y * W + x) * 4);
  const normal = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) normal.set([128, 128, 255, 200], i * 4);
  const set: LeafSet = { id: "test", size: [W, H], lengthCm: 10, tone: false, meanLinear: [0.1, 0.25, 0.05], sprites: [{ x: 0, y: 0, w: W, h: H, base: [32, 210], tip: [32, 10], size: 1 }] };
  const look = { bark: "oak", leaves: "test", leafCm: 12, spray: "hanging" as const, perSpray: 1 };
  const n = 256;
  const extent = 0.5;
  const out = { data: new Uint8Array(n * n * 4), width: n, height: n };
  drawSprayCard(out, 0, 0, n, { set, albedo: { data, width: W, height: H }, normal: { data: normal, width: W, height: H } }, look, extent, false, 3);
  // (Its covered texels' reach along the card: the leaf hangs on along the twig, here down the card's rows.)
  let y0 = n;
  let y1 = -1;
  let x0 = n;
  let x1 = -1;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (out.data[(y * n + x) * 4 + 3] > 128 && out.data[(y * n + x) * 4] > 0.45 * 255) {
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
  assert.ok(y1 > y0, "a leaf is drawn");
  // (12 cm, give or take its own size (0.82 to 1.12) and its lie on the twig: on a card 0.5 m across, 256 texels.)
  const metres = Math.hypot(x1 - x0, y1 - y0) / (n / extent);
  assert.ok(metres > 0.12 * 0.7 && metres < 0.12 * 1.35, `${(metres * 100).toFixed(1)} cm`);
});
