// How spiky a card's outline is at the alpha cut: what the shader draws of it (engine.ts `crisp`). Plain
// arithmetic on a picture, for the tests (test/pineMips.test.ts) and the lab.

import { ALPHA_CUT, type Pixels } from "../src/mips.ts";

/** A cell's outline at the cut: how much of it is at or over the cut, and how long its edge is for its area. */
export interface Outline {
  /** The share of the cell at or over the cut. */
  share: number;
  /** Its edge (texel sides between in and out) over the square root of its area: 4 for a square, 3.5 for a disc, more for a starburst. */
  edge: number;
}

/** The outline at `cut` of the `size`-texel cell at (x0, y0) of a picture. */
export function outlineOf(px: Pixels, x0: number, y0: number, size: number, cut = ALPHA_CUT): Outline {
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && px.data[((y0 + y) * px.width + x0 + x) * 4 + 3] >= cut * 255;
  let area = 0;
  let edges = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!on(x, y)) continue;
      area++;
      if (!on(x + 1, y)) edges++;
      if (!on(x - 1, y)) edges++;
      if (!on(x, y + 1)) edges++;
      if (!on(x, y - 1)) edges++;
    }
  return { share: area / (size * size), edge: edges / Math.sqrt(Math.max(1, area)) };
}
