// The smaller pictures (mips) of an atlas of marks, made so a far crown keeps
// as much of its leaves as a near one.
//
// Each mip averaged from the one before (a box filter) keeps the mean of the
// alpha, but not how much of a cell lies over the alpha's cut: a thin leaf
// four texels wide averaged down to one texel of a third is a pixel the shader
// takes as mostly not there, and alpha to coverage draws two overlapping
// layers of a third in the same samples (the same alpha, the same mask), so a
// crown of them shows the sky through. Far off a crown thinned to a lace.
//
// Castaño (2010): scale each mip's alpha so the share of a cell at or over
// the cut is what it is in the full-size picture. The shader then sharpens the
// alpha about that cut (engine.ts), so a far leaf covers its pixels as a near
// one does, and overlapping leaves add up as near ones do.
//
// Plain arithmetic, no three: the tests read the mips as they are.

/** The alpha a mark's outline is taken at. */
export const ALPHA_CUT = 0.5;

/** One picture: RGBA8, rows of `width` texels. */
export interface Pixels {
  data: Uint8Array;
  width: number;
  height: number;
}

/** How much of each `cell`-square of a picture's alpha is at or over `cut`: a share for each cell, row by row. */
export function coverage(alpha: ArrayLike<number>, width: number, height: number, cell: number, cut: number): number[] {
  const cols = Math.max(1, Math.floor(width / cell));
  const rows = Math.max(1, Math.floor(height / cell));
  const out: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let over = 0;
      for (let j = 0; j < cell; j++) for (let i = 0; i < cell; i++) if (alpha[(r * cell + j) * width + c * cell + i] >= cut) over++;
      out.push(over / (cell * cell));
    }
  }
  return out;
}

/**
 * An atlas's whole mip chain, its full-size picture first: each level half the one before (rounded down,
 * at least a texel, as the graphics card sizes them), averaged from the one before; then, while its cells
 * (`cell` texels square at full size) are at least two texels, each cell's alpha scaled so as much of it is
 * at or over `cut` as at full size. Below that, a cell is a texel and the averaging alone carries on.
 *
 * `fill` (0..1 a level) lets a far mark close up as a painter's far masses do: each level's share goes that
 * much further from the full-size share towards the share of its outline with the gaps between its leaves
 * closed (a needled bough far off is a bough's shape, not a lace of needles). One for every cell, or a cell's
 * own, row by row (a pine's tufts close up, a broad leaf's spray does not).
 */
export function coverageMips(px: Pixels, cell: number, cut = ALPHA_CUT, fill: number | readonly number[] = 0): Pixels[] {
  const levels: Pixels[] = [px];
  const base = alphaOf(px);
  const kept = coverage(base, px.width, px.height, cell, cut);
  const fillOf = (q: number) => (typeof fill === "number" ? fill : (fill[q] ?? 0));
  const fills = kept.some((_, q) => fillOf(q) > 0);
  // (Filling in: each level's share goes that much of the way to its cell's outline closed over its gaps.)
  // (Worked out on the picture shrunk to cells of 128 texels or fewer, which is plenty for a share.)
  const closed = fills ? closedCoverage(base, px.width, px.height, cell, cut) : kept;
  let level = 0;
  let want = kept;
  // (The averaged alpha, unscaled, from which each next level is averaged: scaled alpha averaged would scale twice.)
  let alpha = base;
  let w = px.width;
  let h = px.height;
  let rgb = px.data;
  let size = cell;
  while (w > 1 || h > 1) {
    level++;
    if (fills) want = kept.map((k, q) => k + (Math.max(k, closed[q]) - k) * Math.min(1, fillOf(q) * level));
    const nw = Math.max(1, w >> 1);
    const nh = Math.max(1, h >> 1);
    const data = new Uint8Array(nw * nh * 4);
    const nextAlpha = new Float32Array(nw * nh);
    for (let j = 0; j < nh; j++) {
      const j0 = Math.min(h - 1, j * 2);
      const j1 = Math.min(h - 1, j * 2 + 1);
      for (let i = 0; i < nw; i++) {
        const i0 = Math.min(w - 1, i * 2);
        const i1 = Math.min(w - 1, i * 2 + 1);
        const o = (j * nw + i) * 4;
        const q = [(j0 * w + i0), (j0 * w + i1), (j1 * w + i0), (j1 * w + i1)];
        for (let ch = 0; ch < 3; ch++) data[o + ch] = Math.round((rgb[q[0] * 4 + ch] + rgb[q[1] * 4 + ch] + rgb[q[2] * 4 + ch] + rgb[q[3] * 4 + ch]) / 4);
        nextAlpha[j * nw + i] = (alpha[q[0]] + alpha[q[1]] + alpha[q[2]] + alpha[q[3]]) / 4;
      }
    }
    size = size / 2;
    // (Each cell's scale: the alpha its share `want` of texels is at or over, brought to the cut.)
    const scaleOf = new Float32Array(Math.max(1, want.length)).fill(1);
    const cellsAlign = size >= 2 && Number.isInteger(size) && nw % size === 0 && nh % size === 0;
    if (cellsAlign) {
      const cols = nw / size;
      const rows = nh / size;
      const bins = 1024;
      const hist = new Uint32Array(bins);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const k = r * cols + c;
          const target = want[k] ?? 0;
          if (target <= 0) continue;
          hist.fill(0);
          for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) hist[Math.min(bins - 1, Math.floor(nextAlpha[(r * size + j) * nw + c * size + i] * bins))]++;
          // (The alpha at the top `target` share of the cell's texels.)
          const count = Math.max(1, Math.round(target * size * size));
          let seen = 0;
          let b = bins - 1;
          for (; b > 0; b--) {
            seen += hist[b];
            if (seen >= count) break;
          }
          const at = Math.max(b / bins, 1 / 255);
          scaleOf[k] = Math.min(8, Math.max(0.25, cut / at));
        }
      }
      for (let j = 0; j < nh; j++) {
        const rowCell = Math.floor(j / size) * (nw / size);
        for (let i = 0; i < nw; i++) {
          const a = nextAlpha[j * nw + i] * scaleOf[rowCell + Math.floor(i / size)];
          data[(j * nw + i) * 4 + 3] = Math.round(Math.min(1, a) * 255);
        }
      }
    } else {
      // (A cell under two texels: the level below's scaled alpha, averaged, carries the coverage on.)
      const prev = levels[levels.length - 1];
      for (let j = 0; j < nh; j++) {
        const j0 = Math.min(h - 1, j * 2);
        const j1 = Math.min(h - 1, j * 2 + 1);
        for (let i = 0; i < nw; i++) {
          const i0 = Math.min(w - 1, i * 2);
          const i1 = Math.min(w - 1, i * 2 + 1);
          const pa = prev.data;
          data[(j * nw + i) * 4 + 3] = Math.round((pa[(j0 * w + i0) * 4 + 3] + pa[(j0 * w + i1) * 4 + 3] + pa[(j1 * w + i0) * 4 + 3] + pa[(j1 * w + i1) * 4 + 3]) / 4);
        }
      }
    }
    levels.push({ data, width: nw, height: nh });
    alpha = nextAlpha;
    rgb = data;
    w = nw;
    h = nh;
  }
  return levels;
}

/**
 * A picture's alpha closed over gaps up to about `r` texels (the most of it within `r`, then the least of
 * that within `r`): a mark's outline with the sky between its leaves filled. Square neighbourhoods, each way
 * in turn.
 */
export function closedAlpha(alpha: Float32Array, width: number, height: number, r: number): Float32Array {
  const pass = (src: Float32Array, most: boolean, alongX: boolean): Float32Array => {
    const out = new Float32Array(src.length);
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        let v = most ? 0 : 1;
        for (let d = -r; d <= r; d++) {
          const x = alongX ? Math.min(width - 1, Math.max(0, i + d)) : i;
          const y = alongX ? j : Math.min(height - 1, Math.max(0, j + d));
          const a = src[y * width + x];
          v = most ? Math.max(v, a) : Math.min(v, a);
        }
        out[j * width + i] = v;
      }
    }
    return out;
  };
  return pass(pass(pass(pass(alpha, true, true), true, false), false, true), false, false);
}

/** Each cell's share at or over `cut` once its alpha is closed over gaps of about a sixteenth of the cell. */
function closedCoverage(alpha: Float32Array, width: number, height: number, cell: number, cut: number): number[] {
  const f = Math.max(1, Math.floor(cell / 128));
  const w = Math.floor(width / f);
  const h = Math.floor(height / f);
  const small = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let sum = 0;
      for (let y = 0; y < f; y++) for (let x = 0; x < f; x++) sum += alpha[(j * f + y) * width + i * f + x];
      small[j * w + i] = sum / (f * f);
    }
  }
  const c = cell / f;
  return coverage(closedAlpha(small, w, h, Math.max(2, Math.round(c / 16))), w, h, c, cut);
}

/** A picture's alpha, 0..1. */
export function alphaOf(px: Pixels): Float32Array {
  const out = new Float32Array(px.width * px.height);
  for (let n = 0; n < out.length; n++) out[n] = px.data[n * 4 + 3] / 255;
  return out;
}
