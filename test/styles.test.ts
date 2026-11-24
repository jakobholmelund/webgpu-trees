// The looks and their styles, held to what they must be: every look has a style, every style's numbers are
// in their ranges, the painted and realistic looks are as they were, and the marks the painterly and sculpted
// looks lay their crowns with are what the shader reads (coverage, a clear border, leaves of their own).
// A crown's lobes: a few, covering its clumps, each dab told one.
//
//   node --test test/styles.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { dabPieces, TIER_SHAPES } from "../src/geometry.ts";
import { growTree } from "../src/grow.ts";
import { crownLobes, lobeCount, withLobes } from "../src/lobes.ts";
import { MARK_CELL, PAINTERLY_COLS, PAINTERLY_ROWS, SCULPTED_COLS, SCULPTED_ROWS, painterlyAtlasPixels, sculptedAtlasPixels } from "../src/marks.ts";
import { LEAF_KIND_ROWS, STARTER_SPECIES } from "../src/species.ts";
import { DEFAULT_STYLE, LOOK_LOBES, LOOK_STYLES, REAL_STYLE, STYLE_RANGES, TREE_LOOKS, checkStyle } from "../src/styles.ts";

test("every look has a style, and every style keeps to the ranges", () => {
  assert.deepEqual([...TREE_LOOKS].sort(), Object.keys(LOOK_STYLES).sort());
  for (const look of TREE_LOOKS) {
    const style = LOOK_STYLES[look];
    assert.deepEqual(Object.keys(style).sort(), Object.keys(STYLE_RANGES).sort(), `${look}: every number, and no other`);
    assert.deepEqual(checkStyle(style), [], look);
    const lobes = LOOK_LOBES[look];
    assert.ok(lobes.share > 0 && lobes.share <= 1 && lobes.least >= 1 && lobes.most >= lobes.least && lobes.most <= 32, `${look}'s lobes`);
  }
  for (const r of Object.values(STYLE_RANGES)) assert.ok(r.min < r.max && r.step > 0);
});

test("a style out of its range is said to be", () => {
  assert.equal(checkStyle({ ...DEFAULT_STYLE, lobe: 1.5 }).length, 1);
  assert.equal(checkStyle({ ...DEFAULT_STYLE, chroma: Number.NaN }).length, 1);
});

test("the painted and realistic looks light as they did: no lobes, no hue turned, colour as the species'", () => {
  for (const style of [DEFAULT_STYLE, REAL_STYLE]) {
    assert.equal(style.lobe, 0);
    assert.equal(style.bulge, 0);
    assert.equal(style.warm, 0);
    assert.equal(style.cool, 0);
    assert.equal(style.chroma, 1);
    assert.equal(style.rim, 0);
    assert.equal(style.bright, 1);
  }
  // (The numbers the painted look had before the styles.)
  assert.deepEqual({ steps: DEFAULT_STYLE.steps, bands: DEFAULT_STYLE.bands, round: DEFAULT_STYLE.round, jitter: DEFAULT_STYLE.jitter, wrap: DEFAULT_STYLE.wrap, selfShade: DEFAULT_STYLE.selfShade, fullLight: DEFAULT_STYLE.fullLight }, { steps: 0.75, bands: 3, round: 0.45, jitter: 0.35, wrap: 0.35, selfShade: 0.5, fullLight: 0.65 });
});

test("the painterly and sculpted looks light by lobes, warm in the light and cool in the shade", () => {
  for (const look of ["painterly", "sculpted"] as const) {
    const s = LOOK_STYLES[look];
    assert.ok(s.lobe >= 0.5 && s.warm > 0 && s.cool > 0 && s.chroma > 1, look);
  }
  assert.ok(LOOK_STYLES.sculpted.bulge > LOOK_STYLES.painterly.bulge, "the sculpted look's dabs are rounder");
  assert.ok(LOOK_STYLES.sculpted.sprigs > 0 && LOOK_STYLES.painterly.sprigs === 0);
});

/** Coverage of a cell: its share of texels drawn, and whether its border is clear. */
function cellOf(px: { data: Uint8Array; width: number }, col: number, row: number) {
  let drawn = 0;
  let border = 0;
  let toneSum = 0;
  const owns = new Set<number>();
  for (let j = 0; j < MARK_CELL; j++) {
    for (let i = 0; i < MARK_CELL; i++) {
      const o = ((row * MARK_CELL + j) * px.width + col * MARK_CELL + i) * 4;
      const a = px.data[o + 3];
      if (a > 127) {
        drawn++;
        toneSum += px.data[o];
        owns.add(px.data[o + 1] >> 4);
      }
      if ((i < 2 || j < 2 || i >= MARK_CELL - 2 || j >= MARK_CELL - 2) && a > 0) border++;
    }
  }
  return { cover: drawn / (MARK_CELL * MARK_CELL), border, tone: drawn > 0 ? toneSum / drawn / 255 : 0, owns: owns.size };
}

test("the painterly atlas: a row of clusters for every kind of leaf, each a mass of leaves of their own", () => {
  const px = painterlyAtlasPixels();
  assert.equal(px.width, MARK_CELL * PAINTERLY_COLS);
  assert.equal(px.height, MARK_CELL * PAINTERLY_ROWS);
  assert.equal(PAINTERLY_ROWS, LEAF_KIND_ROWS.length);
  for (let row = 0; row < PAINTERLY_ROWS; row++) {
    for (let col = 0; col < PAINTERLY_COLS; col++) {
      const c = cellOf(px, col, row);
      const at = `${LEAF_KIND_ROWS[row]}, cluster ${col}`;
      // (A mass, not a scatter, and not a disc: a fifth to three quarters of its square covered, a disc's being 0.79.)
      assert.ok(c.cover > 0.2 && c.cover < 0.75, `${at}: covers ${c.cover.toFixed(2)}`);
      assert.equal(c.border, 0, `${at}: its border is clear, so the mips of one cell do not bleed into the next`);
      assert.ok(c.tone > 0.6 && c.tone < 1, `${at}: tone ${c.tone.toFixed(2)}`);
      // (Its leaves each have their own number, which lights them each their own way.)
      assert.ok(c.owns >= 8, `${at}: ${c.owns} leaves' numbers`);
    }
  }
});

test("the sculpted atlas: three discs nearly flat in tone, and a sprig", () => {
  const px = sculptedAtlasPixels();
  assert.equal(px.width, MARK_CELL * SCULPTED_COLS);
  assert.equal(px.height, MARK_CELL * SCULPTED_ROWS);
  for (let m = 0; m < 3; m++) {
    const c = cellOf(px, m % 2, Math.floor(m / 2));
    assert.ok(c.cover > 0.45 && c.cover < 0.7, `disc ${m}: covers ${c.cover.toFixed(2)}`);
    assert.equal(c.border, 0);
    assert.ok(c.tone > 0.85, `disc ${m}: tone ${c.tone.toFixed(2)}`);
  }
  const sprig = cellOf(px, 1, 1);
  assert.ok(sprig.cover > 0.02 && sprig.cover < 0.25, `the sprig covers ${sprig.cover.toFixed(2)}`);
  // (Its blue says it is a sprig.)
  let blue = 0;
  for (let j = 0; j < MARK_CELL; j++) for (let i = 0; i < MARK_CELL; i++) if (px.data[((MARK_CELL + j) * px.width + MARK_CELL + i) * 4 + 2] > 200) blue++;
  assert.ok(blue > 100);
});

test("the atlases are the same every time", () => {
  assert.deepEqual(painterlyAtlasPixels().data, painterlyAtlasPixels().data);
});

test("a crown's lobes: a few, round all its clumps, and every dab told its own", () => {
  for (const sp of STARTER_SPECIES) {
    const tree = growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, 1);
    for (const look of ["painterly", "sculpted"] as const) {
      const shape = LOOK_LOBES[look];
      const k = lobeCount(tree, shape.share, shape.least, shape.most);
      assert.ok(k >= Math.min(shape.least, tree.clumps.count) && k <= shape.most, `${sp.name}: ${k} lobes`);
      const lobes = crownLobes(tree, k);
      assert.ok(lobes.length >= 1 && lobes.length <= k, `${sp.name}: ${lobes.length} of ${k}`);
      // (Every clump's centre inside some lobe's ball, or near it: the lobes are the crown's masses.)
      const cl = tree.clumps;
      for (let c = 0; c < cl.count; c++) {
        const inside = lobes.some((l) => Math.hypot(cl.x[c] - l.x, cl.y[c] - l.y, cl.z[c] - l.z) <= l.radius / 0.85 + 1e-6);
        assert.ok(inside, `${sp.name}: clump ${c} is in a lobe`);
      }
      const pieces = withLobes(dabPieces([tree], TIER_SHAPES[0]), [lobes]);
      const a = pieces.attributes.aLobe;
      assert.equal(a.size, 4);
      assert.equal(a.array.length / 4, pieces.attributes.position.array.length / 3);
      for (let q = 0; q < a.array.length; q += 4) assert.ok(lobes.some((l) => l.x === a.array[q] || Math.abs(l.x - a.array[q]) < 1e-4), "a lobe of the tree's own");
    }
  }
});
