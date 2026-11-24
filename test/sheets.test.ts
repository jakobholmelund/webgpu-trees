// A conifer's boughs as sheets, held to what they must be: a few triangles each, every one with its foot on
// the tree's own wood, lying along its bough and drooping from it, its top's side up; the realistic look's
// leaf atlas carries a number of each leaf's own; and the atlases' mips keep, far off, as much of each mark at
// the alpha's cut as the full-size picture has.
//
//   node --test test/sheets.test.ts     (prints each conifer's sheets)

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { ALL_SPECIES } from "../src/species.ts";
import { LINE_STRIDE, SHEET_ACROSS, SHEET_ALONG, TIER_SHAPES, sheetPieces, woodLines } from "../src/geometry.ts";
import { leafAtlasPixels } from "../src/leaves.ts";
import { SHEET_CELL, SHEET_COLS, SHEET_ROWS, painterlyAtlasPixels, sheetAtlasPixels } from "../src/marks.ts";
import { ALPHA_CUT, alphaOf, coverage, coverageMips } from "../src/mips.ts";
import { type GrownTree } from "../src/tree.ts";

const CONIFERS = ALL_SPECIES.filter((s) => s.architecture === "conifer");
const kindOf = (leafKind: string) => (leafKind === "needle" ? 0 : 1);

function grow(sp: (typeof ALL_SPECIES)[number], seed = 1): GrownTree {
  return growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, seed);
}

/** How far a point is outside the wood as drawn close to (m; under 0 inside it). */
function offWood(tree: GrownTree, p: number[]): number {
  const W = woodLines(tree, TIER_SHAPES[0]);
  let best = Infinity;
  for (const l of W.line) {
    if (!l) continue;
    for (let o = 0; o + LINE_STRIDE < l.length; o += LINE_STRIDE) {
      const d = [l[o + LINE_STRIDE] - l[o], l[o + LINE_STRIDE + 1] - l[o + 1], l[o + LINE_STRIDE + 2] - l[o + 2]];
      const l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      const f = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - l[o]) * d[0] + (p[1] - l[o + 1]) * d[1] + (p[2] - l[o + 2]) * d[2]) / l2)) : 0;
      const r = l[o + 6] + (l[o + LINE_STRIDE + 6] - l[o + 6]) * f;
      best = Math.min(best, Math.hypot(p[0] - l[o] - d[0] * f, p[1] - l[o + 1] - d[1] * f, p[2] - l[o + 2] - d[2] * f) - r);
    }
  }
  return best;
}

for (const sp of CONIFERS) {
  test(`${sp.name}: its boughs are sheets of a few triangles, each footed on its wood, drooping, its top up`, () => {
    const tree = grow(sp);
    const near = sheetPieces([tree], [kindOf(sp.leafKind)]);
    const mid = sheetPieces([tree], [kindOf(sp.leafKind)], true);
    const per = (SHEET_ALONG - 1) * (SHEET_ACROSS - 1) * 2;
    assert.equal(near.index.length % (per * 3), 0, "whole sheets");
    const sheets = near.index.length / (per * 3);
    const cl = tree.clumps.count;
    // (Bounded: no more than two sheets a clump close to, and the mid tier's coarser, at most half the triangles.)
    assert.ok(sheets >= 1 && sheets <= cl * 2, `${sheets} sheets for ${cl} clumps`);
    assert.ok(mid.index.length <= near.index.length / 2, `mid ${mid.index.length / 3} triangles, near ${near.index.length / 3}`);
    const pos = near.attributes.position.array;
    const dab = near.attributes.aDab.array;
    const off = near.attributes.aOffset.array;
    const verts = SHEET_ALONG * SHEET_ACROSS;
    let footFar = 0;
    let worst = 0;
    let up = 0;
    let droops = 0;
    for (let s = 0; s < sheets; s++) {
      const v0 = s * verts;
      // (Its foot: the middle of its first row.)
      const f = v0 + (SHEET_ACROSS - 1) / 2;
      const foot = [pos[f * 3], pos[f * 3 + 1], pos[f * 3 + 2]];
      const o = offWood(tree, foot);
      worst = Math.max(worst, o);
      if (o > 0.05) footFar++;
      // (It bends down along its length: its tip lower than its first piece, carried on straight, would reach.)
      const t = v0 + (SHEET_ALONG - 1) * SHEET_ACROSS + (SHEET_ACROSS - 1) / 2;
      const r1 = f + SHEET_ACROSS;
      if (pos[t * 3 + 1] < foot[1] + (pos[r1 * 3 + 1] - foot[1]) * (SHEET_ALONG - 1)) droops++;
      for (let k = v0; k < v0 + verts; k++) {
        assert.ok(Math.abs(dab[k * 4]) <= 1 + 1e-6 && Math.abs(dab[k * 4 + 1]) <= 1 + 1e-6, "on its picture");
        const n = [off[k * 4], off[k * 4 + 1], off[k * 4 + 2]];
        assert.ok(Math.abs(Math.hypot(n[0], n[1], n[2]) - 1) < 1e-3, "a unit normal");
        up += n[1];
      }
    }
    console.log(`${sp.name.padEnd(20)} ${sheets} sheets near (${near.index.length / 3} triangles), ${mid.index.length / 3} mid; feet off the wood at most ${worst.toFixed(3)} m`);
    // (Every foot on the wood, within a couple of centimetres of its surface, give or take where a curve is cut short.)
    assert.equal(footFar, 0, `${footFar} of ${sheets} sheets have their foot off the wood (worst ${worst.toFixed(3)} m)`);
    // (A sheet lies along its bough, its top's side up, and droops to its tip.)
    assert.ok(up / (sheets * verts) > 0.5, "tops face up");
    assert.equal(droops, sheets, `${droops} of ${sheets} droop`);
  });
}

test("a broadleaf's clumps, and a variant left out, have no sheets", () => {
  const oak = grow(ALL_SPECIES[0]);
  const spruce = grow(ALL_SPECIES[3]);
  const p = sheetPieces([oak, spruce], [-1, 0]);
  assert.equal(p.ranges[0].indexCount, 0);
  assert.ok(p.ranges[1].indexCount > 0);
});

test("the sheet atlas: a bough's top and underside are the same shape, the underside darker, the border clear", () => {
  const px = sheetAtlasPixels();
  assert.equal(px.width, SHEET_CELL * SHEET_COLS);
  assert.equal(px.height, SHEET_CELL * SHEET_ROWS);
  for (let col = 0; col < SHEET_COLS; col++) {
    let same = 0;
    let drawn = 0;
    let top = 0;
    let under = 0;
    let border = 0;
    for (let j = 0; j < SHEET_CELL; j++) {
      for (let i = 0; i < SHEET_CELL; i++) {
        const a = ((j * px.width) + col * SHEET_CELL + i) * 4;
        const b = (((SHEET_CELL + j) * px.width) + col * SHEET_CELL + i) * 4;
        if (px.data[a + 3] > 127) {
          drawn++;
          top += px.data[a];
          under += px.data[b];
          if (px.data[b + 3] > 127) same++;
        }
        if ((i < 2 || j < 2 || i >= SHEET_CELL - 2 || j >= SHEET_CELL - 2) && (px.data[a + 3] > 0 || px.data[b + 3] > 0)) border++;
      }
    }
    assert.ok(drawn / (SHEET_CELL * SHEET_CELL) > 0.15, `bough ${col} covers ${(drawn / SHEET_CELL / SHEET_CELL).toFixed(2)}`);
    assert.equal(same, drawn, `bough ${col}: its underside has its top's outline`);
    assert.ok(under < top * 0.85, `bough ${col}: its underside is darker`);
    assert.equal(border, 0, `bough ${col}: its border is clear`);
  }
});

test("the realistic leaf atlas: each leaf a number of its own in green, the tone in red and blue", () => {
  const px = leafAtlasPixels();
  const owns = new Set<number>();
  for (let n = 0; n < px.data.length; n += 4) {
    if (px.data[n + 3] > 200) {
      owns.add(px.data[n + 1] >> 3);
      assert.equal(px.data[n], px.data[n + 2]);
    }
  }
  assert.ok(owns.size >= 24, `${owns.size} leaves' numbers`);
});

for (const [name, make, cell, fill] of [
  ["painterly", painterlyAtlasPixels, 256, 0],
  ["sheet", sheetAtlasPixels, SHEET_CELL, 0],
  ["leaf", leafAtlasPixels, 256, 0],
] as const) {
  test(`the ${name} atlas's mips keep each mark's coverage at the alpha's cut`, () => {
    const px = make();
    const levels = coverageMips(px, cell, ALPHA_CUT, fill);
    // (Every level the graphics card would make, each half the one before.)
    assert.equal(levels.length, Math.floor(Math.log2(Math.max(px.width, px.height))) + 1);
    const base = coverage(alphaOf(px), px.width, px.height, cell, ALPHA_CUT);
    const lines: string[] = [];
    for (let l = 1; (cell >> l) >= 8; l++) {
      const L = levels[l];
      assert.equal(L.width, Math.max(1, px.width >> l));
      const c = coverage(alphaOf(L), L.width, L.height, cell >> l, ALPHA_CUT);
      // (Within a texel or so of a cell's edge at the smaller levels.)
      const tolerance = (cell >> l) >= 16 ? 0.02 : 0.04;
      c.forEach((x, k) => {
        if (base[k] === 0) return;
        assert.ok(Math.abs(x - base[k]) <= tolerance, `${name} level ${l}, cell ${k}: ${x.toFixed(3)} against ${base[k].toFixed(3)}`);
      });
      lines.push(`L${l} ${(c.reduce((a, b) => a + b, 0) / c.length).toFixed(3)}`);
    }
    console.log(`${name}: full size ${(base.reduce((a, b) => a + b, 0) / base.length).toFixed(3)}, ${lines.join(", ")}`);
  });
}

test("a painterly sheet's far mips close up towards its outline, never thinner than at full size", () => {
  const px = sheetAtlasPixels();
  const plain = coverageMips(px, SHEET_CELL);
  const filled = coverageMips(px, SHEET_CELL, ALPHA_CUT, 0.3);
  const base = coverage(alphaOf(px), px.width, px.height, SHEET_CELL, ALPHA_CUT);
  for (let l = 2; (SHEET_CELL >> l) >= 8; l++) {
    const a = coverage(alphaOf(plain[l]), plain[l].width, plain[l].height, SHEET_CELL >> l, ALPHA_CUT);
    const b = coverage(alphaOf(filled[l]), filled[l].width, filled[l].height, SHEET_CELL >> l, ALPHA_CUT);
    b.forEach((x, k) => {
      assert.ok(x >= base[k] - 0.02, `level ${l}, cell ${k}: no thinner`);
      assert.ok(x >= a[k] - 0.01, `level ${l}, cell ${k}: at least as full as kept`);
    });
  }
});
