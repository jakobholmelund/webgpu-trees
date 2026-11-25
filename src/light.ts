// How the light gets into a tree: for each grown tree (each variant), a small
// box of cells over it, in its own frame, holding how thick its leaves and
// wood are in each cell (how fast they take the light, per metre) and how
// much of the sky each cell sees past them.
//
// Every tree fitted to a variant reads its variant's box: the shaders carry
// the point they light back into the variant's frame (the fit undone: its
// place, yaw, lean, mirror and its two stretches up), march a few steps from
// it towards the sun adding up the leaves crossed (Monsi and Saeki: the sun
// falls off as exp(-sum)), and read the sky it sees in one fetch. So a bough
// shades the one below it, the gaps between boughs let the sun through, the
// outer shoots on the sun's side are lit and the pockets inside are not: the
// light has the crown's own structure, where an ellipsoid gave every bough
// at the same depth the same light. The ground's shade (engine.ts
// `bakeShade`) marches the same boxes, so a crown's shadow has its holes.
//
// The leaves are the tree's clumps, each a ball of leaves (IN_CLUMP of its
// radius round, as the dabs and cards spread them), with leaf area by its
// cross-section, all of them together the leaf area its species' crown
// carries (a leaf area index over the crown's ground); the wood is its
// skeleton, each piece taking the light as a cylinder does (its surface over
// four, per volume). Leaves and wood alike: a flat leaf, two-sided, takes
// half its area (G = 0.5), so what is kept is extinction per metre.
//
// Plain arithmetic, no three: the tests read it as it is.

import { type GrownTree, type TreeSize } from "./tree.ts";

/** Cells across (x), up (y) and deep (z) of every variant's box. */
export const LIGHT_CELLS: readonly [number, number, number] = [18, 24, 18];
/** The most extinction (per metre) a cell holds, as stored in a byte: the square root of a share of this. */
export const SIGMA_MAX = 16;
/** How far a clump's leaves spread past its radius (geometry.ts `IN_CLUMP`). */
const SPREAD = 1.2;

/** A variant's box of light: extinction per metre and the sky seen, by cell (x fastest, then z, then y). */
export interface LightVolume {
  nx: number;
  ny: number;
  nz: number;
  /** The box's corner and size (m), in the variant's own frame. */
  min: [number, number, number];
  size: [number, number, number];
  /** Extinction per metre in each cell: leaves and wood. */
  sigma: Float32Array;
  /** How much of the sky each cell's centre sees past the tree's own leaves and wood, 0..1 (cosine-weighted). */
  sky: Float32Array;
  /** The leaf area put in (m²), and the wood's surface over four (m²): what the cells hold, summed over their volume, is half the one plus the other. */
  leafArea: number;
  woodShadow: number;
}

/**
 * How much leaf a species' crown carries: its leaf area index (one-sided leaf area over the ground its crown
 * covers), from how open it is. About 6 for a dense spruce or beech, 3 for an open eucalyptus; measured LAI of
 * single crowns runs 3 to 8 (Bréda 2003).
 */
export function leafAreaIndex(openness: number): number {
  return 1.5 + 4.8 * (1 - Math.min(1, Math.max(0, openness)));
}

/** Where cell (i, j, k) is in the arrays. */
export function cellIndex(v: Pick<LightVolume, "nx" | "nz">, i: number, j: number, k: number): number {
  return (j * v.nz + k) * v.nx + i;
}

/** Twelve directions round a ball, and its centre: where a clump's leaves are put. */
const BALL: readonly [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [[0, 0, 0, 0.2]];
  const g = (1 + Math.sqrt(5)) / 2;
  const ico = [
    [0, 1, g], [0, -1, g], [0, 1, -g], [0, -1, -g],
    [1, g, 0], [-1, g, 0], [1, -g, 0], [-1, -g, 0],
    [g, 0, 1], [-g, 0, 1], [g, 0, -1], [-g, 0, -1],
  ];
  const l = Math.hypot(1, g);
  // (At 0.62 of the ball's radius the twelve and the centre hold its volume about evenly.)
  for (const [x, y, z] of ico) out.push([(x / l) * 0.62, (y / l) * 0.62, (z / l) * 0.62, 0.8 / 12]);
  return out;
})();

/** Add `amount` (extinction × volume) at a point into the cells round it, by trilinear weights: nothing is lost. */
function splat(v: LightVolume, x: number, y: number, z: number, amount: number): void {
  const fx = ((x - v.min[0]) / v.size[0]) * v.nx - 0.5;
  const fy = ((y - v.min[1]) / v.size[1]) * v.ny - 0.5;
  const fz = ((z - v.min[2]) / v.size[2]) * v.nz - 0.5;
  // (Held to the cells' centres at the box's sides: a point in the outer half cell goes wholly to the side's cells.)
  const cx = Math.min(v.nx - 1, Math.max(0, fx));
  const cy = Math.min(v.ny - 1, Math.max(0, fy));
  const cz = Math.min(v.nz - 1, Math.max(0, fz));
  const i0 = Math.min(v.nx - 2, Math.floor(cx));
  const j0 = Math.min(v.ny - 2, Math.floor(cy));
  const k0 = Math.min(v.nz - 2, Math.floor(cz));
  const tx = cx - i0;
  const ty = cy - j0;
  const tz = cz - k0;
  const cellVolume = (v.size[0] / v.nx) * (v.size[1] / v.ny) * (v.size[2] / v.nz);
  const per = amount / cellVolume;
  for (let dj = 0; dj < 2; dj++)
    for (let dk = 0; dk < 2; dk++)
      for (let di = 0; di < 2; di++) {
        const w = (di ? tx : 1 - tx) * (dj ? ty : 1 - ty) * (dk ? tz : 1 - tz);
        if (w > 0) v.sigma[cellIndex(v, i0 + di, j0 + dj, k0 + dk)] += per * w;
      }
}

/** Extinction (per metre) at a point of the variant's frame, between the cells' centres; none outside the box. */
export function sigmaAt(v: LightVolume, x: number, y: number, z: number): number {
  const ux = (x - v.min[0]) / v.size[0];
  const uy = (y - v.min[1]) / v.size[1];
  const uz = (z - v.min[2]) / v.size[2];
  if (ux < 0 || uy < 0 || uz < 0 || ux > 1 || uy > 1 || uz > 1) return 0;
  return trilinear(v, v.sigma, ux, uy, uz);
}

/** How much of the sky a point of the variant's frame sees past its tree (clamped to the box). */
export function skyAt(v: LightVolume, x: number, y: number, z: number): number {
  const c = (q: number) => Math.min(1, Math.max(0, q));
  return trilinear(v, v.sky, c((x - v.min[0]) / v.size[0]), c((y - v.min[1]) / v.size[1]), c((z - v.min[2]) / v.size[2]));
}

function trilinear(v: LightVolume, a: Float32Array, ux: number, uy: number, uz: number): number {
  const cx = Math.min(v.nx - 1, Math.max(0, ux * v.nx - 0.5));
  const cy = Math.min(v.ny - 1, Math.max(0, uy * v.ny - 0.5));
  const cz = Math.min(v.nz - 1, Math.max(0, uz * v.nz - 0.5));
  const i0 = Math.min(v.nx - 2, Math.floor(cx));
  const j0 = Math.min(v.ny - 2, Math.floor(cy));
  const k0 = Math.min(v.nz - 2, Math.floor(cz));
  const tx = cx - i0;
  const ty = cy - j0;
  const tz = cz - k0;
  let s = 0;
  for (let dj = 0; dj < 2; dj++)
    for (let dk = 0; dk < 2; dk++)
      for (let di = 0; di < 2; di++) s += a[cellIndex(v, i0 + di, j0 + dj, k0 + dk)] * (di ? tx : 1 - tx) * (dj ? ty : 1 - ty) * (dk ? tz : 1 - tz);
  return s;
}

export interface LightBakeOptions {
  /** The leaf area index of its crown (`leafAreaIndex`). */
  lai: number;
  /** Cells across, up and deep (LIGHT_CELLS). */
  cells?: readonly [number, number, number];
}

/**
 * A grown tree's box of light. Its box holds the whole tree, foot to top and every clump's leaves, and half a
 * cell more each way, so its outermost cells are nearly empty and nothing is read past its sides.
 */
export function bakeLight(tree: GrownTree, options: LightBakeOptions): LightVolume {
  const [nx, ny, nz] = options.cells ?? LIGHT_CELLS;
  const cl = tree.clumps;
  const sk = tree.skeleton;
  let x0 = -tree.size.crownRadius * 0.5;
  let x1 = -x0;
  let z0 = x0;
  let z1 = x1;
  let y1 = tree.size.height;
  for (let c = 0; c < cl.count; c++) {
    const r = cl.radius[c] * SPREAD;
    x0 = Math.min(x0, cl.x[c] - r);
    x1 = Math.max(x1, cl.x[c] + r);
    z0 = Math.min(z0, cl.z[c] - r);
    z1 = Math.max(z1, cl.z[c] + r);
    y1 = Math.max(y1, cl.y[c] + r);
  }
  for (let n = 0; n < sk.count; n++) {
    x0 = Math.min(x0, sk.x[n]);
    x1 = Math.max(x1, sk.x[n]);
    z0 = Math.min(z0, sk.z[n]);
    z1 = Math.max(z1, sk.z[n]);
    y1 = Math.max(y1, sk.y[n]);
  }
  // (Half a cell more each way; the foot at the ground, its own height held.)
  const padX = (x1 - x0) / (nx - 1) / 2;
  const padZ = (z1 - z0) / (nz - 1) / 2;
  const padY = y1 / (ny - 1) / 2;
  const min: [number, number, number] = [x0 - padX, 0, z0 - padZ];
  const size: [number, number, number] = [x1 - x0 + 2 * padX, y1 + padY, z1 - z0 + 2 * padZ];
  const v: LightVolume = { nx, ny, nz, min, size, sigma: new Float32Array(nx * ny * nz), sky: new Float32Array(nx * ny * nz), leafArea: 0, woodShadow: 0 };

  // The leaves: each clump's share of the crown's leaf area by its cross-section, spread over its ball.
  let cross = 0;
  for (let c = 0; c < cl.count; c++) cross += cl.radius[c] ** 2;
  // (A palm's, as its fronds measure: a crown of a few huge leaves is not a crown's worth of leaf area index.)
  const leafArea = tree.leafArea ?? options.lai * Math.PI * tree.size.crownRadius ** 2;
  if (cross > 0) {
    for (let c = 0; c < cl.count; c++) {
      const a = (leafArea * cl.radius[c] ** 2) / cross;
      const r = cl.radius[c] * SPREAD;
      for (const [bx, by, bz, w] of BALL) splat(v, cl.x[c] + bx * r, cl.y[c] + by * r, cl.z[c] + bz * r, 0.5 * a * w);
    }
    v.leafArea = leafArea;
  }

  // The wood: each piece from its parent, a cylinder taking its surface over four, laid along it. Not the
  // stems: a stem runs up through the cells it stands in, and its own bark, lit from them, would be in its
  // own shade (a palm's trunk dark at noon); what it hides of the sun is a stripe on the ground.
  const step = Math.min(v.size[0] / nx, v.size[1] / ny, v.size[2] / nz) / 2;
  let wood = 0;
  for (let n = 0; n < sk.count; n++) {
    const p = sk.parent[n];
    if (p < 0 || sk.order[n] === 0) continue;
    const dx = sk.x[n] - sk.x[p];
    const dy = sk.y[n] - sk.y[p];
    const dz = sk.z[n] - sk.z[p];
    const len = Math.hypot(dx, dy, dz);
    if (len <= 0) continue;
    const r = (sk.radius[n] + sk.radius[p]) / 2;
    const shadow = (Math.PI * r * len) / 2;
    const pieces = Math.max(1, Math.ceil(len / step));
    for (let s = 0; s < pieces; s++) {
      const t = (s + 0.5) / pieces;
      splat(v, sk.x[p] + dx * t, sk.y[p] + dy * t, sk.z[p] + dz * t, shadow / pieces);
    }
    wood += shadow;
  }
  v.woodShadow = wood;
  bakeSky(v);
  return v;
}

/**
 * The directions the sky is seen in, with their weights (cosine-weighted, summing to 1): the zenith, a ring of
 * six at 30° from it and nine at 62°; the last ten degrees above the horizon are the stand's (engine.ts `standOn`).
 */
export const SKY_DIRECTIONS: readonly [number, number, number, number][] = (() => {
  const rings: [number, number, number, number][] = [
    // (Polar angle, how many, and the band of polar angle each ring stands for.)
    [0, 1, 0, 15],
    [30, 6, 15, 45],
    [62, 9, 45, 80],
  ];
  const out: [number, number, number, number][] = [];
  const rad = Math.PI / 180;
  for (const [theta, n, a, b] of rings) {
    const omega = (2 * Math.PI * (Math.cos(a * rad) - Math.cos(b * rad))) / n;
    for (let k = 0; k < n; k++) {
      const phi = ((k + (n > 1 ? 0.5 * (theta / 30) : 0)) / n) * 2 * Math.PI;
      const s = Math.sin(theta * rad);
      out.push([s * Math.cos(phi), Math.cos(theta * rad), s * Math.sin(phi), omega * Math.cos(theta * rad)]);
    }
  }
  const sum = out.reduce((m, d) => m + d[3], 0);
  return out.map(([x, y, z, w]) => [x, y, z, w / sum] as [number, number, number, number]);
})();

/**
 * Each cell's sky: for each direction, the leaves and wood crossed from the cell's centre up out of the box,
 * swept down layer by layer (a cell's is the one above's, a layer's step along the direction, read between the
 * cells there, and the stretch between them); then the transmitted light of each direction, weighted.
 */
function bakeSky(v: LightVolume): void {
  const { nx, ny, nz } = v;
  const cx = v.size[0] / nx;
  const cy = v.size[1] / ny;
  const cz = v.size[2] / nz;
  const layer = nx * nz;
  let above = new Float32Array(layer);
  let here = new Float32Array(layer);
  let sigAbove = new Float32Array(layer);
  let sigHere = new Float32Array(layer);
  v.sky.fill(0);
  // (Where a cell reads the layer above, between its cells' centres, nothing past the box's sides: the same for
  // every cell of a column or a row along one direction, so worked out once a direction, by column and by row.)
  const i0s = new Int32Array(nx);
  const tis = new Float64Array(nx);
  const iIn = new Uint8Array(nx);
  const k0s = new Int32Array(nz);
  const tks = new Float64Array(nz);
  const kIn = new Uint8Array(nz);
  const place = (f: number, n: number, at: Int32Array, t: Float64Array, inside: Uint8Array, q: number) => {
    inside[q] = f < -0.5 || f > n - 0.5 ? 0 : 1;
    const c = Math.min(n - 1, Math.max(0, f));
    at[q] = Math.min(n - 2, Math.floor(c));
    t[q] = c - at[q];
  };
  const read = (a: Float32Array, i: number, k: number): number => {
    if (!iIn[i] || !kIn[k]) return 0;
    const i0 = i0s[i];
    const k0 = k0s[k];
    const ti = tis[i];
    const tk = tks[k];
    return (a[k0 * nx + i0] * (1 - ti) + a[k0 * nx + i0 + 1] * ti) * (1 - tk) + (a[(k0 + 1) * nx + i0] * (1 - ti) + a[(k0 + 1) * nx + i0 + 1] * ti) * tk;
  };
  for (const [dx, dy, dz, w] of SKY_DIRECTIONS) {
    const run = cy / dy;
    const si = (dx * run) / cx;
    const sk = (dz * run) / cz;
    for (let i = 0; i < nx; i++) place(i + si, nx, i0s, tis, iIn, i);
    for (let k = 0; k < nz; k++) place(k + sk, nz, k0s, tks, kIn, k);
    for (let j = ny - 1; j >= 0; j--) {
      for (let k = 0; k < nz; k++)
        for (let i = 0; i < nx; i++) {
          const q = k * nx + i;
          const s = v.sigma[j * layer + q];
          sigHere[q] = s;
          if (j === ny - 1) here[q] = s * run * 0.5;
          else here[q] = read(above, i, k) + 0.5 * (s + read(sigAbove, i, k)) * run;
          v.sky[j * layer + q] += w * Math.exp(-here[q]);
        }
      [above, here] = [here, above];
      [sigAbove, sigHere] = [sigHere, sigAbove];
    }
  }
}

/**
 * How much of the sun gets through the tree from a point of its frame along a direction of it (unit), past its
 * leaves and wood, their extinction scaled by `scale`, from `from` metres along it: marched in steps of a third
 * of a cell.
 */
export function sunThrough(v: LightVolume, p: readonly number[], d: readonly number[], scale = 1, from = 0): number {
  const [a, t1] = boxSpan(v, p, d);
  const t0 = Math.max(a, from);
  if (t1 <= t0) return 1;
  const step = Math.min(v.size[0] / v.nx, v.size[1] / v.ny, v.size[2] / v.nz) / 3;
  const n = Math.max(1, Math.ceil((t1 - t0) / step));
  const dt = (t1 - t0) / n;
  let tau = 0;
  for (let s = 0; s < n; s++) {
    const t = t0 + (s + 0.5) * dt;
    tau += sigmaAt(v, p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t) * dt;
  }
  return Math.exp(-tau * scale);
}

/** Where a ray from `p` along `d` is in the box: from and to (both 0 or less if it misses). */
export function boxSpan(v: Pick<LightVolume, "min" | "size">, p: readonly number[], d: readonly number[]): [number, number] {
  let t0 = 0;
  let t1 = Infinity;
  for (let a = 0; a < 3; a++) {
    const lo = v.min[a];
    const hi = v.min[a] + v.size[a];
    if (Math.abs(d[a]) < 1e-9) {
      if (p[a] < lo || p[a] > hi) return [0, 0];
      continue;
    }
    const ta = (lo - p[a]) / d[a];
    const tb = (hi - p[a]) / d[a];
    t0 = Math.max(t0, Math.min(ta, tb));
    t1 = Math.min(t1, Math.max(ta, tb));
  }
  return [t0, t1];
}

// ---- A tree's fit to its variant, as the shaders have it (engine.ts `fitOf`, `toWorld`). ----

/** What fits a variant to a tree on the ground: the tree's place and turn, its size, and the variant's as grown. */
export interface Fit {
  x: number;
  y: number;
  z: number;
  yaw: number;
  leanX: number;
  leanZ: number;
  mirror: number;
  size: TreeSize;
  grown: TreeSize;
}

const stretches = (f: Fit) => ({
  across: f.size.crownRadius / f.grown.crownRadius,
  trunkUp: f.size.crownBase / Math.max(f.grown.crownBase, 0.01),
  crownUp: (f.size.height - f.size.crownBase) / Math.max(f.grown.height - f.grown.crownBase, 0.01),
});

/** A point of the variant's frame into the world, on the tree fitted to it (no wind). */
export function fitToWorld(f: Fit, p: readonly number[]): [number, number, number] {
  const { across, trunkUp, crownUp } = stretches(f);
  const y = p[1] < f.grown.crownBase ? p[1] * trunkUp : f.size.crownBase + (p[1] - f.grown.crownBase) * crownUp;
  const qx = p[0] * f.mirror * across;
  const qz = p[2] * across;
  const lx = qx + f.leanX * y;
  const lz = qz + f.leanZ * y;
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  return [f.x + lx * c + lz * s, f.y + y, f.z + lz * c - lx * s];
}

/** A point of the world into the variant's frame: the fit undone. */
export function worldToFit(f: Fit, w: readonly number[]): [number, number, number] {
  return unfit(f, w, false);
}

/**
 * A point of the world into the variant's frame as the start of a ray towards the sun (`dirToFit`): by the
 * crown's stretch alone, below the crown's base as well. The fit stretches a tree up by two amounts, its trunk's
 * below the crown's base and its crown's above, but a ray's direction is carried in by one, the crown's (it is
 * the crown's leaves that it crosses). A point below the base carried in by the trunk's stretch would start the
 * ray where the crown's would not: the ray bends where it meets the crown, and a shadow on the ground moves
 * sideways by the sun's slope times the difference (size.crownBase − grown.crownBase × crownUp). Carried in by
 * the crown's alone, the whole ray is one straight line in the frame, as in the world.
 */
export function worldToCrownFit(f: Fit, w: readonly number[]): [number, number, number] {
  return unfit(f, w, true);
}

function unfit(f: Fit, w: readonly number[], crownOnly: boolean): [number, number, number] {
  const { across, trunkUp, crownUp } = stretches(f);
  const dx = w[0] - f.x;
  const y = w[1] - f.y;
  const dz = w[2] - f.z;
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  const lx = dx * c - dz * s;
  const lz = dz * c + dx * s;
  const qx = lx - f.leanX * y;
  const qz = lz - f.leanZ * y;
  const py = y < f.size.crownBase && !crownOnly ? y / Math.max(trunkUp, 1e-6) : f.grown.crownBase + (y - f.size.crownBase) / Math.max(crownUp, 1e-6);
  return [(qx * f.mirror) / across, py, qz / across];
}

/**
 * A direction of the world into the variant's frame (unit), as the crown is stretched: what a ray's leaves are
 * marched along. Its length there per metre of the world is the second number.
 */
export function dirToFit(f: Fit, d: readonly number[]): { dir: [number, number, number]; perMetre: number } {
  const { across, crownUp } = stretches(f);
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  const lx = d[0] * c - d[2] * s;
  const lz = d[2] * c + d[0] * s;
  const x = ((lx - f.leanX * d[1]) * f.mirror) / across;
  const y = d[1] / crownUp;
  const z = (lz - f.leanZ * d[1]) / across;
  const l = Math.hypot(x, y, z);
  return { dir: [x / l, y / l, z / l], perMetre: l };
}

// ---- All the variants' boxes in one texture, for the shaders. ----

/**
 * Every variant's box as bytes, side by side in one 3D texture: variant v in the slot `v % perColumn` deep and
 * `floor(v / perColumn)` across. Two bytes a cell: the square root of its extinction's share of SIGMA_MAX, and
 * its sky.
 */
export function packLightAtlas(volumes: readonly LightVolume[], cells: readonly [number, number, number] = LIGHT_CELLS, maxDepth = 2048): { data: Uint8Array; width: number; height: number; depth: number; perColumn: number } {
  const [nx, ny, nz] = cells;
  const count = Math.max(1, volumes.length);
  const perColumn = Math.max(1, Math.min(count, Math.floor(maxDepth / nz)));
  const columns = Math.ceil(count / perColumn);
  const width = nx * columns;
  const height = ny;
  const depth = nz * perColumn;
  const data = new Uint8Array(width * height * depth * 2);
  volumes.forEach((v, n) => {
    const ox = Math.floor(n / perColumn) * nx;
    const oz = (n % perColumn) * nz;
    for (let j = 0; j < ny; j++)
      for (let k = 0; k < nz; k++)
        for (let i = 0; i < nx; i++) {
          const q = cellIndex(v, i, j, k);
          const o = ((oz + k) * height * width + j * width + (ox + i)) * 2;
          data[o] = Math.round(Math.sqrt(Math.min(1, v.sigma[q] / SIGMA_MAX)) * 255);
          data[o + 1] = Math.round(Math.min(1, Math.max(0, v.sky[q])) * 255);
        }
  });
  return { data, width, height, depth, perColumn };
}
