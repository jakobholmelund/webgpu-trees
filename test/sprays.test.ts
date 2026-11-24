// The realistic look's photographs on the trees: every species wears bark and leaves that are in the
// repository, its bark tiles are bark-sized once scaled, its near cards a twig's end, and a leaf laid on a card
// is as long on it as on the tree.
//
//   node --test test/sprays.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { ALL_SPECIES } from "../src/species.ts";
import { BARK_SETS, type LeafSet, SCAN_LOOKS, type ScanLook, barkSet, flowerColorCode, leafSet, nearCardHalf, scanLookOf, upperColorOf } from "../src/scans.ts";
import { drawCushionCard, drawSprayCard, flowerOf } from "../src/sprays.ts";

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

test("every species' bark and leaf sets name it among those they are for (SOURCES.md says who wears what)", () => {
  const forOf = (id: string, kind: "bark" | "leaves") => ((kind === "bark" ? barkSet(id) : leafSet(id)) as unknown as { for?: string[] } | undefined)?.for ?? [];
  for (const sp of ALL_SPECIES) {
    const l = scanLookOf(sp);
    for (const [id, kind] of [[l.bark, "bark"], [l.leaves, "leaves"], ...(l.upper ? [[l.upper.set, "bark"] as const] : []), ...(l.cushion && l.cushion !== "drawn" ? [[l.cushion, "leaves"] as const] : [])] as const) {
      assert.ok(forOf(id, kind).includes(sp.name), `${sp.name}: ${kind} ${id} is for ${forOf(id, kind).join(", ")}`);
    }
  }
});

test("a flower is told from a leaf by its colour: a gorse's yellow and orange, not its green spines or a bright leaf", () => {
  assert.ok(flowerOf(0.95, 0.76, 0.12) > 0.95, "yellow");
  assert.ok(flowerOf(0.85, 0.55, 0.08) > 0.8, "orange-yellow in its own shade");
  assert.equal(flowerOf(0.25, 0.32, 0.12), 0, "a spine");
  assert.equal(flowerOf(0.45, 0.62, 0.2), 0, "a bright green leaf");
  assert.equal(flowerOf(0.4, 0.32, 0.22), 0, "a brown stem");
  // (The gorse's flower colour, packed for the shader as an upper bark's is, reads back as given.)
  const c = upperColorOf(flowerColorCode(SCAN_LOOKS.Gorse))!;
  assert.deepEqual(c.map((v) => Math.round(v * 255)), [0xf2, 0xc2, 0x30]);
  assert.equal(flowerColorCode(SCAN_LOOKS.Oak), 0);
});

/** A sheet of one picture `w` x `h` texels, filled where `fill` says with the colour it gives (sRGB bytes), its stalk at the bottom. */
function sheetOf(w: number, h: number, fill: (x: number, y: number) => [number, number, number] | null, lengthCm = 10) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = fill(x, y);
      if (c) data.set([...c, 255], (y * w + x) * 4);
    }
  const normal = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) normal.set([128, 128, 255, 200], i * 4);
  const set: LeafSet = { id: "test", size: [w, h], lengthCm, tone: false, meanLinear: [0.1, 0.2, 0.05], sprites: [{ x: 0, y: 0, w, h, base: [w / 2, h - 2], tip: [w / 2, 2], size: 1 }] };
  return { set, albedo: { data, width: w, height: h }, normal: { data: normal, width: w, height: h } };
}

test("a flowering look's cards keep where its flowers are (blue), and its flowers and spines each at a leaf's tone", () => {
  // (A sprig: green spines below, yellow flowers on its upper half.)
  const sheet = sheetOf(40, 200, (x, y) => (x < 8 || x > 32 || y < 4 || y > 196 ? null : y < 100 ? [240, 190, 40] : [60, 85, 40]));
  const n = 192;
  const cardOf = (look: ScanLook) => {
    const out = { data: new Uint8Array(n * n * 4), width: n, height: n };
    drawSprayCard(out, 0, 0, n, sheet, look, 0.6, false, 5);
    return out.data;
  };
  const flowering = cardOf({ ...SCAN_LOOKS.Gorse, leaves: "test" });
  const plain = cardOf({ ...SCAN_LOOKS.Gorse, leaves: "test", flowers: undefined });
  let fl = 0;
  let sp = 0;
  const tones = { fl: 0, sp: 0 };
  for (let i = 0; i < n * n; i++) {
    if (flowering[i * 4 + 3] < 250) continue;
    if (flowering[i * 4 + 2] > 200) ((fl += 1), (tones.fl += flowering[i * 4]));
    else if (flowering[i * 4 + 2] < 30) ((sp += 1), (tones.sp += flowering[i * 4]));
    // (Without its flowers kept, blue is its tone again, as every other card's.)
    if (plain[i * 4 + 3] >= 250) assert.equal(plain[i * 4 + 2], plain[i * 4]);
  }
  assert.ok(fl > 200 && sp > 200, `flowers ${fl}, spines ${sp}`);
  // (Each against its own kind's mean: the spines not darkened beside the bright flowers.)
  const [tf, ts] = [tones.fl / fl / 255, tones.sp / sp / 255];
  assert.ok(Math.abs(tf - ts) < 0.15 && ts > 0.4, `flowers ${tf.toFixed(2)}, spines ${ts.toFixed(2)}`);
});

test("a pad thinner in its picture than its look's pads is laid in layers, as thick as they are", () => {
  // (A thin shelf: 200 x 40 texels, lit on top.)
  const sheet = sheetOf(200, 40, (x, y) => (x < 4 || x > 196 || y < 4 || y > 36 ? null : y < 18 ? [80, 120, 50] : [25, 40, 20]), 90);
  const n = 256;
  const extent = (thick: number) => {
    const out = { data: new Uint8Array(n * n * 4), width: n, height: n };
    drawCushionCard(out, 0, 0, n, sheet, 0, thick);
    let x0 = n;
    let x1 = -1;
    let y0 = n;
    let y1 = -1;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (out.data[(y * n + x) * 4 + 3] > 128) ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y)));
    return { w: x1 - x0 + 1, h: y1 - y0 + 1, foot: y0 };
  };
  const one = extent(0);
  const thick = extent(SCAN_LOOKS["Monterey cypress"].padThick!);
  assert.ok(one.h / one.w < 0.25, `as its picture: ${(one.h / one.w).toFixed(2)}`);
  assert.ok(thick.h / thick.w > 0.4 && thick.h / thick.w < 0.55, `layered: ${(thick.h / thick.w).toFixed(2)}`);
  // (Still from the card's foot, and still most of its width.)
  assert.ok(thick.foot <= 12 && thick.w > n * 0.75, `foot ${thick.foot}, width ${thick.w}`);
});
