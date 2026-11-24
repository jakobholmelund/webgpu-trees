// A pine's tufts from the tee: its cards' mips drawn for themselves (sprays.ts `pineMip`), each needle as wide
// as a texel there and as many fewer, so a tuft a few dozen metres off keeps its spikes; averaged down, its
// needles fell under the cut and only its dense heart was left, a disc, a broad leaf's blot.
//
//   node --test test/pineMips.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { ALPHA_CUT, coverageMips } from "../src/mips.ts";
import { scanLookOf } from "../src/scans.ts";
import { ALL_SPECIES } from "../src/species.ts";
import { BIG_CARD, FAR_CARD, NEAR_CARDS, PINE_MIPS, SPRAY_COLS, drawSprayRow, needledCards, pineMips } from "../src/sprays.ts";
import { outlineOf } from "./silhouette.ts";

const species = (name: string) => ALL_SPECIES.find((s) => s.name === name)!;
// (No photographs here: a pine's tufts drawn needle by needle, as the cards draw them under its pictures.)
const sheet = { set: { sprites: [{ size: 1, base: [0, 0], tip: [0, 1] }] }, albedo: { width: 1, height: 1, data: new Uint8Array(4) }, normal: { width: 1, height: 1, data: new Uint8Array(4) } } as never;
const N = 512;

function rowOf(name: string) {
  const sp = species(name);
  const look = scanLookOf(sp);
  const px = { width: SPRAY_COLS * N, height: N, data: new Uint8Array(SPRAY_COLS * N * N * 4) };
  drawSprayRow(px, 0, N, sheet, look, 1.45 * sp.clumpSize, 7, 1 - sp.openness);
  return { sp, look, px };
}

test("a pine's near tufts keep their spikes at the mips seen from the tee, and cover about what they do near to", () => {
  // (Its near cards 0.9 m across: from the tee, 25 m off on a 1080-line screen, some 50 pixels; at 512 texels a
  // card, its third and fourth mips.)
  for (const name of ["Stone pine", "Monterey pine", "Aleppo pine"]) {
    const { sp, look, px } = rowOf(name);
    const averaged = coverageMips(px, N, ALPHA_CUT, 0);
    const drawn = coverageMips(px, N, ALPHA_CUT, 0, { levels: pineMips(N, sheet, look, 1.45 * sp.clumpSize, 7, 1 - sp.openness), cells: needledCards(look) });
    for (const level of [3, 4]) {
      const s = N >> level;
      const mean = (f: (c: number) => number) => (f(0) + f(1) + f(2)) / NEAR_CARDS;
      const full = mean((c) => outlineOf(px, c * N, 0, N).share);
      const a = mean((c) => outlineOf(averaged[level], c * s, 0, s).edge);
      const d = mean((c) => outlineOf(drawn[level], c * s, 0, s).edge);
      const share = mean((c) => outlineOf(drawn[level], c * s, 0, s).share);
      // (Its outline at the cut longer for its area: spikes, not a disc.)
      assert.ok(d > 1.15 * a, `${name}, mip ${level}: its outline ${d.toFixed(1)} for its area, against ${a.toFixed(1)} averaged`);
      assert.ok(share > 0.9 * full && share < 1.3 * full, `${name}, mip ${level}: covers ${share.toFixed(3)} of its cards, ${full.toFixed(3)} near to`);
    }
  }
});

test("only a pine's needled cards have their mips drawn, and every other cell is mipped as it was", () => {
  assert.deepEqual(needledCards(scanLookOf(species("Oak"))), Array(SPRAY_COLS).fill(false));
  // (A pine whose tufts are each one picture of its shoot draws no needles: its pictures' mips are as they were.)
  assert.deepEqual(needledCards(scanLookOf(species("Corsican pine"))), Array(SPRAY_COLS).fill(false));
  // (A pine with photographs of its cushions: those are its big cards, mipped as they were.)
  const cushioned = needledCards(scanLookOf(species("Stone pine")), { set: { sprites: [{}] } } as never, { set: { sprites: [{}] } } as never);
  assert.deepEqual(cushioned.slice(0, NEAR_CARDS), [true, true, true]);
  assert.ok(cushioned.slice(BIG_CARD).every((c) => !c));
  // (Without them, its big cards are drawn tufts too, and its far cards copies of them.)
  const drawn = needledCards(scanLookOf(species("Torrey pine")));
  assert.ok(drawn.every(Boolean));
  assert.equal(drawn[FAR_CARD], drawn[BIG_CARD]);
  // (A broad leaf's cells beside a pine's: the same mips with the pine's drawn as without.)
  const { sp, look, px } = rowOf("Scots pine");
  const levels = pineMips(N, sheet, look, 1.45 * sp.clumpSize, 7, 1 - sp.openness);
  assert.equal(levels.length, PINE_MIPS);
  const none = coverageMips(px, N, ALPHA_CUT, 0);
  const off = coverageMips(px, N, ALPHA_CUT, 0, { levels, cells: Array(SPRAY_COLS).fill(false) });
  for (let l = 0; l < none.length; l++) assert.deepEqual(off[l].data, none[l].data, `mip ${l} unchanged where no cell is drawn`);
});
