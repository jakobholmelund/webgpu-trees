// The realistic look's leaf atlas, and the mips of every atlas: nothing in them that a card shows as a line
// or a ring round its leaves.

import assert from "node:assert/strict";
import { test } from "node:test";
import { LEAF_KINDS, leafAtlasPixels, leafAtlasWood, leafCell } from "../src/leaves.ts";
import { SHEET_CELL, painterlyAtlasPixels, sheetAtlasPixels } from "../src/marks.ts";
import { ALPHA_CUT, type Pixels, coverageMips } from "../src/mips.ts";

const CELL = 256;

/**
 * The longest run of a spray's wood along its outline in the half of its cell away from its foot (the far edge
 * of a card, round its leaves), as the length of its bounding box's diagonal, in texels: the wood whose texels
 * touch sky that reaches the cell's border.
 */
function woodOnOutline(px: Pixels, wood: Float32Array, kind: number, variant: number): number {
  const { u0, v0 } = leafCell(kind, variant);
  const ox = Math.round(u0 * px.width);
  const oy = Math.round(v0 * px.height);
  const covered = (i: number, j: number) => px.data[((oy + j) * px.width + ox + i) * 4 + 3] >= ALPHA_CUT * 255;
  // (The sky outside the spray: clear texels reached from the cell's border.)
  const outside = new Uint8Array(CELL * CELL);
  const stack: number[] = [];
  for (let k = 0; k < CELL; k++) for (const n of [k, (CELL - 1) * CELL + k, k * CELL, k * CELL + CELL - 1]) if (!outside[n] && !covered(n % CELL, (n / CELL) | 0)) {
    outside[n] = 1;
    stack.push(n);
  }
  while (stack.length) {
    const n = stack.pop() as number;
    const i = n % CELL;
    const j = (n / CELL) | 0;
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      if (a < 0 || b < 0 || a >= CELL || b >= CELL) continue;
      const m = b * CELL + a;
      if (outside[m] || covered(a, b)) continue;
      outside[m] = 1;
      stack.push(m);
    }
  }
  const edge = new Uint8Array(CELL * CELL);
  for (let j = CELL >> 1; j < CELL - 1; j++) {
    for (let i = 1; i < CELL - 1; i++) {
      const n = j * CELL + i;
      if (!covered(i, j) || wood[(oy + j) * px.width + ox + i] <= 0.5) continue;
      if (outside[n + 1] || outside[n - 1] || outside[n + CELL] || outside[n - CELL]) edge[n] = 1;
    }
  }
  let longest = 0;
  const seen = new Uint8Array(CELL * CELL);
  for (let s = 0; s < edge.length; s++) {
    if (!edge[s] || seen[s]) continue;
    seen[s] = 1;
    stack.push(s);
    let [x0, y0, x1, y1] = [CELL, CELL, -1, -1];
    while (stack.length) {
      const n = stack.pop() as number;
      const i = n % CELL;
      const j = (n / CELL) | 0;
      [x0, y0, x1, y1] = [Math.min(x0, i), Math.min(y0, j), Math.max(x1, i), Math.max(y1, j)];
      for (let b = j - 1; b <= j + 1; b++) {
        for (let a = i - 1; a <= i + 1; a++) {
          const m = b * CELL + a;
          if (a >= 0 && b >= 0 && a < CELL && b < CELL && edge[m] && !seen[m]) {
            seen[m] = 1;
            stack.push(m);
          }
        }
      }
    }
    longest = Math.max(longest, Math.hypot(x1 - x0, y1 - y0));
  }
  return longest;
}

test("no spray's twig runs bare along the far edge of its leaves (a dark arc round a card)", () => {
  const px = leafAtlasPixels();
  const { wood } = leafAtlasWood();
  const lines: string[] = [];
  LEAF_KINDS.forEach((name, kind) => {
    for (let v = 0; v < 2; v++) {
      const run = woodOnOutline(px, wood, kind, v);
      lines.push(`${name} ${v}: ${run.toFixed(0)}`);
      // (A stalk or a twig's end showing between leaves is a few tens of texels; the weeping spray's twig,
      // arched over its leaves, ran 195 across the cell's top.)
      assert.ok(run < CELL * 0.2, `${name} spray ${v}: bare wood ${run.toFixed(0)} texels along its outline`);
    }
  });
  console.log(`wood along the outline, texels: ${lines.join(", ")}`);
});

test("the leaf atlas's wood is its twigs: some of every broadleaf spray, none outside a spray", () => {
  const px = leafAtlasPixels();
  const { wood } = leafAtlasWood();
  for (let n = 0; n < wood.length; n++) if (wood[n] > 0) assert.ok(px.data[n * 4 + 3] > 0, "wood only where something is drawn");
  for (const kind of [0, 1, 3]) {
    for (let v = 0; v < 2; v++) {
      const { u0, v0 } = leafCell(kind, v);
      let some = 0;
      for (let j = 0; j < CELL; j++) for (let i = 0; i < CELL; i++) if (wood[(Math.round(v0 * px.height) + j) * px.width + Math.round(u0 * px.width) + i] > 0.5) some++;
      assert.ok(some > 100, `${LEAF_KINDS[kind]} spray ${v} has its twig`);
    }
  }
});

for (const [name, make, cell] of [
  ["painterly", painterlyAtlasPixels, 256],
  ["sheet", sheetAtlasPixels, SHEET_CELL],
  ["leaf", leafAtlasPixels, 256],
] as const) {
  test(`the ${name} atlas's mips draw nothing outside its marks' outlines (no ring of faint alpha raised past the cut)`, () => {
    const px = make();
    const levels = coverageMips(px, cell, ALPHA_CUT);
    const cut = ALPHA_CUT * 255;
    for (let l = 1; l < levels.length && levels[l].width >= 4; l++) {
      const L = levels[l];
      const f = px.width / L.width;
      let stray = 0;
      let drawn = 0;
      for (let j = 0; j < L.height; j++) {
        for (let i = 0; i < L.width; i++) {
          if (L.data[(j * L.width + i) * 4 + 3] < cut) continue;
          drawn++;
          // (Over the cut at this level: something over the cut at full size under it, or one of this level's
          // texels away, as a filter's footprint reaches.)
          let near = false;
          for (let y = Math.max(0, (j - 1) * f); !near && y < Math.min(px.height, (j + 2) * f); y++) {
            for (let x = Math.max(0, (i - 1) * f); x < Math.min(px.width, (i + 2) * f); x++) {
              if (px.data[(y * px.width + x) * 4 + 3] >= cut) {
                near = true;
                break;
              }
            }
          }
          if (!near) stray++;
        }
      }
      assert.equal(stray, 0, `${name} level ${l}: ${stray} of ${drawn} texels over the cut outside the marks`);
    }
  });
}
