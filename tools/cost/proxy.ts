// What the trees cost the graphics card, worked out offline: no drawing, no timing. Each variant's pieces
// are built as the engine builds them for the painted look (engine.ts: dabs, wood, a palm's fronds, a far
// tree's stroke, at each of the three tiers), counted, and their area summed; then a view's trees are put
// through the engine's cull (in the frustum, and how tall in the picture, `tierShares`), each tier's pieces
// counted for every tree it draws and their area on the screen added up.
//
// What it counts, per tier:
// - cards: the dabs (quads) a tier draws, each four vertices, each vertex marching the tree's box of light:
//   the vertex work, and what grew with the course sizes' many small clumps;
// - triangles: the dabs', the wood's and the fronds';
// - pixels: the dabs' quads' area facing the camera (overdraw: every pixel of a quad runs its fragment shader
//   up to the alpha test), a tree being handed over between two tiers split between them as their pattern
//   splits its pixels; fronds at half their area (cards at all angles); the wood not at all (small beside them).
//
// The library's modules are passed in (`Lib`), so one checkout's counter can count another's trees
// (tools/cost/course.ts --lib).

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { GrownTree } from "../../src/tree.ts";
import type { Pieces, TierShape } from "../../src/geometry.ts";
import type { Plan, TreeInstance, VariantOptions } from "../../src/variants.ts";
import type { TreeSpecies } from "../../src/species.ts";

/** The parts of a library checkout the counter uses. */
export interface Lib {
  growTree(species: TreeSpecies, size: GrownTree["size"], seed: number, stand?: unknown): GrownTree;
  planVariants(packed: Float32Array, species: readonly TreeSpecies[], options?: VariantOptions, stands?: readonly unknown[], prunings?: readonly unknown[]): Plan;
  packTrees(list: readonly TreeInstance[]): Float32Array;
  DEFAULT_VARIANT_OPTIONS: VariantOptions;
  dabPieces(trees: readonly GrownTree[], shape: TierShape, part?: "leaves" | "stroke", skip?: readonly boolean[]): Pieces;
  woodPieces(trees: readonly GrownTree[], shape: TierShape): Pieces;
  palmPieces(trees: readonly GrownTree[], tier: number): Pieces;
  TIER_SHAPES: readonly TierShape[];
  MORE_SPECIES: Readonly<Record<string, TreeSpecies>>;
  STARTER_SPECIES: readonly TreeSpecies[];
}

/** A library checkout's modules, from its folder (its `src`). */
export async function loadLib(dir: string): Promise<Lib> {
  const at = (f: string) => import(pathToFileURL(resolve(dir, "src", f)).href);
  const [grow, variants, geometry, palm, species] = await Promise.all([at("grow.ts"), at("variants.ts"), at("geometry.ts"), at("palmGeometry.ts"), at("species.ts")]);
  return { ...grow, ...variants, ...geometry, ...palm, ...species } as Lib;
}

export const TIERS = 3;

/** One variant's pieces at one tier. */
export interface TierCost {
  /** Dabs (each a quad of four vertices). */
  cards: number;
  /** The dabs' summed area, as grown (m², each quad 2 half-widths square). */
  cardArea: number;
  /** Triangles of wood, and of a palm's fronds (with their vertices). */
  woodTris: number;
  woodVerts: number;
  frondTris: number;
  frondVerts: number;
  /** The fronds' summed area, as grown (m²); the wood's surface (m²). */
  frondArea: number;
  woodArea: number;
  /** Each dab's centre (x, y, z) and half width, as grown, four numbers a dab: to clip them to the picture. */
  dabs: Float32Array;
}

/** What a set of grown variants costs at each tier, as the painted look draws them (engine.ts `dabSets`, `woodSets`, `frondSets`, `strokeSets`). */
export function variantCosts(lib: Lib, grown: readonly GrownTree[]): TierCost[][] {
  const isPalm = grown.map((g) => !!g.palm);
  const out: TierCost[][] = grown.map(() => []);
  lib.TIER_SHAPES.forEach((shape, t) => {
    const dabs = lib.dabPieces(grown, shape, "leaves", isPalm);
    const strokes = lib.dabPieces(grown, shape, "stroke");
    const wood = lib.woodPieces(grown, shape);
    const fronds = lib.palmPieces(grown, t);
    grown.forEach((_, v) => {
      const d = quadsOf(dabs, v);
      const s = quadsOf(strokes, v);
      const w = trianglesOf(wood, v, "aRadial");
      const f = trianglesOf(fronds, v, null);
      const dabsOf = new Float32Array(4 * (d.quads + s.quads));
      dabsOf.set(d.dabs);
      dabsOf.set(s.dabs, d.dabs.length);
      out[v][t] = { cards: d.quads + s.quads, cardArea: d.area + s.area, woodTris: w.tris, woodVerts: w.verts, woodArea: w.area, frondTris: f.tris, frondVerts: f.verts, frondArea: f.area, dabs: dabsOf };
    });
  });
  return out;
}

function vertexSpan(p: Pieces, v: number): [number, number] {
  const total = p.attributes.position.array.length / 3;
  const from = p.ranges[v].baseVertex;
  // (The next variant's run starts where this one's ends.)
  const to = v + 1 < p.ranges.length ? p.ranges[v + 1].baseVertex : total;
  return [from, to];
}

/** A run of dabs: how many, their area (each quad's half width in `aDab.z`), and each one's centre and half width. */
function quadsOf(p: Pieces, v: number): { quads: number; area: number; dabs: Float32Array } {
  const r = p.ranges[v];
  const quads = r.indexCount / 6;
  const [from, to] = vertexSpan(p, v);
  const dab = p.attributes.aDab.array;
  const pos = p.attributes.position.array;
  const dabs = new Float32Array(4 * quads);
  let area = 0;
  for (let k = from, q = 0; k < to; k += 4, q++) {
    area += (2 * dab[k * 4 + 2]) ** 2;
    dabs.set([pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2], dab[k * 4 + 2]], q * 4);
  }
  return { quads, area, dabs };
}

/**
 * A run of triangles: how many, their vertices, and their area from their positions (wood: its centre line's
 * points, put out to its surface by `aRadial`, a direction and the radius).
 */
function trianglesOf(p: Pieces, v: number, radial: string | null): { tris: number; verts: number; area: number } {
  const r = p.ranges[v];
  const [from, to] = vertexSpan(p, v);
  let area = 0;
  {
    let pos = p.attributes.position.array;
    if (radial) {
      const rad = p.attributes[radial].array;
      pos = new Float32Array(pos);
      for (let k = from; k < to; k++) for (let j = 0; j < 3; j++) pos[k * 3 + j] += rad[k * 4 + j] * rad[k * 4 + 3];
    }
    for (let i = r.firstIndex; i < r.firstIndex + r.indexCount; i += 3) {
      const [a, b, c] = [p.index[i] + r.baseVertex, p.index[i + 1] + r.baseVertex, p.index[i + 2] + r.baseVertex];
      const ux = pos[b * 3] - pos[a * 3];
      const uy = pos[b * 3 + 1] - pos[a * 3 + 1];
      const uz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const wx = pos[c * 3] - pos[a * 3];
      const wy = pos[c * 3 + 1] - pos[a * 3 + 1];
      const wz = pos[c * 3 + 2] - pos[a * 3 + 2];
      area += 0.5 * Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx);
    }
  }
  return { tris: r.indexCount / 3, verts: to - from, area };
}

/** A camera: where, which way (yaw from +x towards +z, pitch, degrees), its vertical field of view, and the picture's size in pixels. */
export interface View {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  fov: number;
  width: number;
  height: number;
}

/** The engine's detail (engine.ts `DEFAULT_DETAIL`). */
export const DETAIL = { nearPx: 260, farPx: 70, band: 0.2, range: 3000 };

/** A view's cost, by tier (0 near, 1 mid, 2 far). */
export interface ViewCost {
  /** Trees each tier draws (a tree being handed over counts in both). */
  trees: number[];
  cards: number[];
  /** Vertices: the dabs' (4 a card), the wood's, the fronds'. */
  cardVerts: number[];
  woodVerts: number[];
  frondVerts: number[];
  /** Pixels covered, summed over every layer (overdraw), within the picture: the dabs', the wood's, the fronds'. */
  cardPx: number[];
  woodPx: number[];
  frondPx: number[];
}

const emptyCost = (): ViewCost => ({ trees: [0, 0, 0], cards: [0, 0, 0], cardVerts: [0, 0, 0], woodVerts: [0, 0, 0], frondVerts: [0, 0, 0], cardPx: [0, 0, 0], woodPx: [0, 0, 0], frondPx: [0, 0, 0] });

/** A view cost's vertices, and its pixels, of a tier (or all of them). */
export const vertsOf = (c: ViewCost, t?: number) => (t === undefined ? [0, 1, 2] : [t]).reduce((a, k) => a + c.cardVerts[k] + c.woodVerts[k] + c.frondVerts[k], 0);
export const pxOf = (c: ViewCost, t?: number) => (t === undefined ? [0, 1, 2] : [t]).reduce((a, k) => a + c.cardPx[k] + c.woodPx[k] + c.frondPx[k], 0);

/**
 * A view's trees through the engine's cull and tiers, each tier's pieces counted for every tree it draws.
 * `keep` picks the trees to count (all, by default: a nearer subset, say).
 */
export function viewCost(plan: Plan, costs: readonly TierCost[][], grown: readonly GrownTree[], species: readonly TreeSpecies[], view: View, keep: (i: number) => boolean = () => true): ViewCost {
  const out = emptyCost();
  const pxPerM = view.height / (2 * Math.tan((view.fov * Math.PI) / 360));
  const fw = forwardOf(view);
  const tanV = Math.tan((view.fov * Math.PI) / 360);
  const tanH = tanV * (view.width / view.height);
  const right = norm([-fw[2], 0, fw[0]]);
  const up = cross(right, fw);
  const W = view.width;
  const H = view.height;
  /** A square on the screen (centre and half width, px): its area within the picture. */
  const clipped = (sx: number, sy: number, h: number) => Math.max(0, Math.min(W, sx + h) - Math.max(0, sx - h)) * Math.max(0, Math.min(H, sy + h) - Math.max(0, sy - h));
  /** A point of the world on the screen (px, y down) and how far in front of the eye it is. */
  const project = (x: number, y: number, z: number): [number, number, number] => {
    const d = [x - view.x, y - view.y, z - view.z];
    const zc = dot(d, fw);
    const k = pxPerM / Math.max(zc, 1e-3);
    return [W / 2 + dot(d, right) * k, H / 2 - dot(d, up) * k, zc];
  };
  plan.placements.forEach((p, i) => {
    if (!keep(i)) return;
    const s = p.size;
    const v = p.variant;
    const sp = species[plan.variants[v].species];
    // (engine.ts `cull`: a sphere round the whole tree.)
    const c = [p.x, p.y + s.height * 0.5, p.z];
    const radius = Math.max(s.height * 0.55, s.crownRadius) + s.height * 0.06;
    const d = [c[0] - view.x, c[1] - view.y, c[2] - view.z];
    const zc = dot(d, fw);
    const xc = dot(d, right);
    const yc = dot(d, up);
    // (Each side plane's distance, as the frustum's planes test it.)
    const sideH = (Math.abs(xc) - zc * tanH) / Math.hypot(1, tanH);
    const sideV = (Math.abs(yc) - zc * tanV) / Math.hypot(1, tanV);
    if (zc < -radius || sideH > radius || sideV > radius) return;
    const dist = Math.hypot(d[0], d[1], d[2]);
    if (dist >= DETAIL.range) return;
    // (engine.ts `tierSize`: a palm by its crown, at most.)
    const size = sp.architecture === "palm" ? Math.min(s.height, Math.max(2 * s.crownRadius, s.height - s.crownBase) * 2) : s.height;
    const px = (size * pxPerM) / Math.max(dist, 0.1);
    const near = clamp01((px - DETAIL.nearPx * (1 - DETAIL.band)) / (DETAIL.nearPx * DETAIL.band * 2));
    const far = clamp01((px - DETAIL.farPx * (1 - DETAIL.band)) / (DETAIL.farPx * DETAIL.band * 2));
    // (Which tiers draw it, and the share of its pixels each: near below `near` of the pattern, mid to `far`, far the rest.)
    const shares = [near > 0 ? near : -1, near < 1 && far > 0 ? far - near : -1, far < 1 ? 1 - far : -1];
    const g = grown[v].size;
    const across = s.crownRadius / g.crownRadius;
    const trunkUp = s.crownBase / Math.max(g.crownBase, 0.01);
    const crownUp = (s.height - s.crownBase) / Math.max(g.height - g.crownBase, 0.01);
    const fit = 0.5 * (across + crownUp);
    const yawC = Math.cos(p.yaw);
    const yawS = Math.sin(p.yaw);
    // (How much of the tree's sphere is in the picture: its wood's and fronds' share of their pixels.)
    const [cx, cy] = project(c[0], c[1], c[2]);
    const rs = (radius * pxPerM) / Math.max(dist, 0.1);
    const inPicture = clipped(cx, cy, rs) / (4 * rs * rs);
    const onScreen = (pxPerM / Math.max(dist, 0.1)) ** 2;
    shares.forEach((share, t) => {
      if (share < 0) return;
      const k = costs[v][t];
      out.trees[t]++;
      out.cards[t] += k.cards;
      out.cardVerts[t] += 4 * k.cards;
      out.woodVerts[t] += k.woodVerts;
      out.frondVerts[t] += k.frondVerts;
      // (Each dab fitted to the tree, as `fitOf` fits it, turned and stood at its foot, and clipped to the picture.)
      let dabPx = 0;
      for (let q = 0; q < k.dabs.length; q += 4) {
        const gx = k.dabs[q] * p.mirror * across;
        const gy = k.dabs[q + 1] < g.crownBase ? k.dabs[q + 1] * trunkUp : s.crownBase + (k.dabs[q + 1] - g.crownBase) * crownUp;
        const gz = k.dabs[q + 2] * across;
        const [sx, sy, sz] = project(p.x + gx * yawC + gz * yawS, p.y + gy, p.z + gz * yawC - gx * yawS);
        if (sz < 0.2) continue;
        dabPx += clipped(sx, sy, (k.dabs[q + 3] * fit * pxPerM) / sz);
      }
      out.cardPx[t] += share * dabPx;
      // (Fronds stretched as the crown is, seen at all angles: half their area; the wood's tubes, the third of
      // their surface that faces the eye, as a cylinder shows 2rL of its 2πrL.)
      out.frondPx[t] += share * inPicture * onScreen * 0.5 * k.frondArea * across * crownUp;
      out.woodPx[t] += share * inPicture * onScreen * (k.woodArea / Math.PI) * fit * fit;
    });
  });
  return out;
}

/** A view 4 m behind a tee at eye height looking at the pin (the game's bench `teeCam`), on a 2880×1800 picture. */
export function teeView(tee: [number, number], pin: [number, number], ground: (x: number, z: number) => number): View {
  const a = Math.atan2(pin[1] - tee[1], pin[0] - tee[0]);
  const x = tee[0] - Math.cos(a) * 4;
  const z = tee[1] - Math.sin(a) * 4;
  return { x, y: ground(x, z) + 1.7, z, yaw: (a * 180) / Math.PI, pitch: -4, fov: 48, width: 2880, height: 1800 };
}

function forwardOf(v: View): number[] {
  const y = (v.yaw * Math.PI) / 180;
  const p = (v.pitch * Math.PI) / 180;
  return [Math.cos(y) * Math.cos(p), Math.sin(p), Math.sin(y) * Math.cos(p)];
}

const clamp01 = (q: number) => Math.min(1, Math.max(0, q));
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function norm(a: number[]): number[] {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return a.map((q) => q / l);
}

/** Two view costs added. */
export function addCost(a: ViewCost, b: ViewCost): ViewCost {
  const o = emptyCost();
  for (const k of Object.keys(o) as (keyof ViewCost)[]) for (let t = 0; t < TIERS; t++) o[k][t] = a[k][t] + b[k][t];
  return o;
}
