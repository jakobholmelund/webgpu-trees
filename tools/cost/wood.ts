// What a course's near wood is, from its 1st tee (proxy.ts, load.ts): every vertex of the wood the near tier draws,
// by how thick it is (fitted), how far from the eye, how many pixels across it is there (engine.ts `keepThin`
// shrinks wood under 0.25 px to nothing, all of it from 0.6), and how much of the tree's own leaves lie between
// it and the eye (its box of light, light.ts, marched towards the eye).
//
//   node tools/cost/wood.ts [c01 …] [--tier 0] [--lib <checkout>] [--game <worldgolf checkout>]

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KEEP_THIN, loadLib, pxPerMOf, seenTrees } from "./proxy.ts";
import { type Mix, loadCourse } from "./load.ts";
import { type Fit, bakeLight, dirToFit, fitToWorld, leafAreaIndex, sunThrough } from "../../src/light.ts";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const option = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const valued = new Set(["--lib", "--game", "--tier"].map(option).filter(Boolean));
const ids = args.filter((a) => /^c\d\d$/.test(a) && !valued.has(a));
const libDir = resolve(option("--lib") ?? here);
const gameDir = resolve(option("--game") ?? "/Users/jakob/Dev/worldgolf/.claude/worktrees/trees-in-game");
const tier = Number(option("--tier") ?? 0);
const lib = await loadLib(libDir);
const mix = (await import(join(gameDir, "src/webgpu/treemix.ts"))) as Mix;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A table: rows by one class, each its vertices (k) and its share. */
function table(title: string, labels: string[], counts: number[], total: number) {
  console.log(`  ${title}`);
  labels.forEach((l, k) => console.log(`    ${l.padEnd(22)} ${(counts[k] / 1e3).toFixed(0).padStart(6)}k  ${((100 * counts[k]) / Math.max(1, total)).toFixed(1).padStart(5)}%`));
}

for (const id of ids.length ? ids : ["c01"]) {
  const course = loadCourse(lib, lib, mix, gameDir, id, 1);
  const { plan, grown, species, view } = course;
  const wood = lib.woodPieces(grown, lib.TIER_SHAPES[tier]);
  const pos = wood.attributes.position.array;
  const rad = wood.attributes.aRadial.array;
  const pxPerM = pxPerMOf(view);
  const eye = [view.x, view.y, view.z];
  const boxes = new Map<number, ReturnType<typeof bakeLight>>();
  const boxOf = (v: number) => {
    if (!boxes.has(v)) {
      const sp = species[plan.variants[v].species];
      boxes.set(v, bakeLight(grown[v], { lai: leafAreaIndex(sp.openness) * (sp.leafKind === "pine" ? 0.6 : 1) }));
    }
    return boxes.get(v)!;
  };
  const R_EDGES = [0.005, 0.01, 0.02, 0.035, 0.1, Infinity];
  const R_LABELS = ["r < 5 mm", "5-10 mm", "10-20 mm", "20-35 mm", "35-100 mm", ">= 100 mm"];
  const D_EDGES = [25, 50, 100, 150, 250, Infinity];
  const D_LABELS = ["< 25 m", "25-50 m", "50-100 m", "100-150 m", "150-250 m", ">= 250 m"];
  const P_EDGES = [0.25, 0.6, 1, 2, 4, Infinity];
  const P_LABELS = ["< 0.25 px (gone)", "0.25-0.6 px (shrinking)", "0.6-1 px", "1-2 px", "2-4 px", ">= 4 px"];
  const T_EDGES = [0.01, 0.05, 0.2, 0.5, Infinity];
  const T_LABELS = ["< 1% (deep inside)", "1-5%", "5-20%", "20-50%", ">= 50% (open)"];
  const bin = (edges: number[], x: number) => edges.findIndex((e) => x < e);
  const byR = new Array(R_EDGES.length).fill(0);
  const byD = new Array(D_EDGES.length).fill(0);
  const byP = new Array(P_EDGES.length).fill(0);
  const byT = new Array(T_EDGES.length).fill(0);
  // (Radius class by pixels: how many vertices of each are under a pixel.)
  const rUnder = new Array(R_EDGES.length).fill(0);
  const nrm = wood.attributes.aNormal.array;
  let ribbons = 0;
  let total = 0;
  let gone = 0;
  let goneAndHidden = 0;
  let trees = 0;
  for (const { i, dist, shares } of seenTrees(plan, species, view)) {
    if (shares[tier] < 0) continue;
    trees++;
    const p = plan.placements[i];
    const v = p.variant;
    const g = grown[v].size;
    const fitWood = p.size.trunkRadius / g.trunkRadius;
    const f: Fit = { x: p.x, y: p.y, z: p.z, yaw: p.yaw, leanX: p.leanX, leanZ: p.leanZ, mirror: p.mirror, size: p.size, grown: g };
    const r = wood.ranges[v];
    const from = r.baseVertex;
    let to = v + 1 < wood.ranges.length ? wood.ranges[v + 1].baseVertex : pos.length / 3;
    // (Near, as the engine draws it: the bands of its wood the tree needs, `WOOD_DEPTHS`; their vertices come first.)
    if (tier === 0 && r.bands && lib.WOOD_BANDS) {
      const sphere = Math.max(p.size.height * 0.55, p.size.crownRadius) + p.size.height * 0.06;
      const nearest = Math.max(dist - sphere, 0.1);
      to = from + r.bands[lib.WOOD_BANDS.filter((e) => (2 * e * fitWood * pxPerM) / nearest >= KEEP_THIN[0]).length].vertexCount;
    }
    const box = boxOf(v);
    for (let k = from; k < to; k++) {
      const c = [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
      const w = fitToWorld(f, c);
      const d = Math.hypot(w[0] - eye[0], w[1] - eye[1], w[2] - eye[2]);
      const rf = rad[k * 4 + 3] * fitWood;
      const px = (2 * rf * pxPerM) / Math.max(d, 0.1);
      const toEye = [(eye[0] - w[0]) / d, (eye[1] - w[1]) / d, (eye[2] - w[2]) / d];
      const { dir, perMetre } = dirToFit(f, toEye);
      // (From a cell out: the twig's own clump is blurred over the cell it is in.)
      const cell = Math.min(box.size[0] / box.nx, box.size[1] / box.ny, box.size[2] / box.nz);
      const through = sunThrough(box, c, dir, 1 / perMetre, cell);
      if (nrm[k * 3] === 0 && nrm[k * 3 + 1] === 0 && nrm[k * 3 + 2] === 0) ribbons++;
      total++;
      byR[bin(R_EDGES, rf)]++;
      byD[bin(D_EDGES, dist)]++;
      byP[bin(P_EDGES, px)]++;
      byT[bin(T_EDGES, through)]++;
      if (px < 1) rUnder[bin(R_EDGES, rf)]++;
      if (smooth(KEEP_THIN[0], KEEP_THIN[1], px) === 0) {
        gone++;
        if (through < 0.05) goneAndHidden++;
      }
    }
  }
  console.log(`${id}: tier ${tier}, ${trees} trees, ${(total / 1e3).toFixed(0)}k wood vertices drawn (${(ribbons / 1e3).toFixed(0)}k on twigs' ribbons); ${(gone / 1e3).toFixed(0)}k (${((100 * gone) / total).toFixed(1)}%) shrunk to nothing (under ${KEEP_THIN[0]} px), ${(goneAndHidden / 1e3).toFixed(0)}k of them also behind 95% of leaves`);
  table("by radius (fitted)", R_LABELS, byR, total);
  table("by radius, under a pixel across", R_LABELS, rUnder, total);
  table("by the tree's distance", D_LABELS, byD, total);
  table("by pixels across", P_LABELS, byP, total);
  table("by the tree's own leaves' light passed towards the eye", T_LABELS, byT, total);
}
