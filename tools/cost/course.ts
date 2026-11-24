// What a course's trees cost from its 1st tee, offline (proxy.ts): the trees the game hands the library for a
// hole, each its species as the game chooses it (the game's src/webgpu/treemix.ts, read from its checkout, as
// its scripts/tree-mix.mjs reads a course), planned and grown as `createTrees` grows them, and counted
// through the engine's cull from the game's bench camera (4 m behind the tee, looking at the pin).
//
//   node tools/cost/course.ts [c01 c03 …] [--hole 1] [--lib <checkout>] [--mix-lib <checkout>]
//                             [--game <worldgolf checkout>] [--within 150] [--json] [--species]
//
// --lib       the library checkout whose trees are grown and counted (default: this one)
// --mix-lib   the checkout whose species choose which tree is which (default: --lib), to hold a course's mix
//             still while the growing changes
// --within    also count the trees within this many metres of the tee alone (default 150)
// --species   also a line for each species' near tier: trees, cards a tree, and cards in all
// --json      the numbers as JSON

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type ViewCost, TIERS, loadLib, pxOf, teeView, variantCosts, vertsOf, viewCost } from "./proxy.ts";
import type { TreeInstance } from "../../src/variants.ts";
import type { TreeSpecies } from "../../src/species.ts";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const option = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (f: string) => args.includes(f);
const valued = new Set(["--hole", "--lib", "--mix-lib", "--game", "--within"].map(option).filter(Boolean));
const ids = args.filter((a) => /^c\d\d$/.test(a) && !valued.has(a));
const libDir = resolve(option("--lib") ?? here);
const mixDir = resolve(option("--mix-lib") ?? libDir);
const gameDir = resolve(option("--game") ?? "/Users/jakob/Dev/worldgolf/.claude/worktrees/trees-in-game");
const holeNum = Number(option("--hole") ?? 1);
const within = Number(option("--within") ?? 150);

const lib = await loadLib(libDir);
const mixLib = mixDir === libDir ? lib : await loadLib(mixDir);
const mix = await import(join(gameDir, "src/webgpu/treemix.ts"));

/** A species by its id (`MORE_SPECIES`) or a starter's name, as the game's treelib.ts finds it. */
function speciesNamed(l: typeof lib, id: string): TreeSpecies {
  const s = l.MORE_SPECIES[id] ?? l.STARTER_SPECIES.find((x) => x.name === id);
  if (!s) throw new Error(`no species "${id}"`);
  return structuredClone(s) as TreeSpecies;
}

// (As the game has them: src/terrain.ts.)
const MARGIN = 115;
const EDGE_HIDE_M = 14;

function holesOf(text: string) {
  const out: { num: number; tee: [number, number]; pin: [number, number] }[] = [];
  const re = /num:\s*(\d+),[\s\S]*?tee:\s*\(([-\d.]+),\s*([-\d.]+)\),\s*pin:\s*\(([-\d.]+),\s*([-\d.]+)\)/g;
  for (let m; (m = re.exec(text)); ) out.push({ num: +m[1], tee: [+m[2], +m[3]], pin: [+m[4], +m[5]] });
  return out;
}

function vegetationOf(text: string) {
  const out: { kind: number; x: number; z: number; height: number; crownRadius: number; crownBase: number; trunkRadius: number }[] = [];
  const re = /species:"(\w+)",pos:\(([-\d.e]+),([-\d.e]+)\)[^()]*?trunk_radius_m:([-\d.e]+),height_m:([-\d.e]+),crown_radius_m:([-\d.e]+),crown_base_m:([-\d.e]+)/g;
  for (let m; (m = re.exec(text)); ) {
    const sp = m[1].toLowerCase();
    out.push({ kind: sp === "conifer" ? 1 : sp === "shrub" ? 2 : 0, x: +m[2], z: +m[3], trunkRadius: +m[4], height: +m[5], crownRadius: +m[6], crownBase: +m[7] });
  }
  return out;
}

/** The ground's height (base heightmap, bilinear; the detail patches left out). */
function groundOf(dir: string, w: number, d: number, spacing: number) {
  const buf = readFileSync(join(dir, "base.r32"));
  const h = new Float32Array(buf.buffer, buf.byteOffset, w * d);
  return (x: number, z: number) => {
    const gx = Math.min(w - 1.001, Math.max(0, x / spacing));
    const gz = Math.min(d - 1.001, Math.max(0, z / spacing));
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const at = (a: number, b: number) => h[b * w + a];
    return (at(ix, iz) * (1 - fx) + at(ix + 1, iz) * fx) * (1 - fz) + (at(ix, iz + 1) * (1 - fx) + at(ix + 1, iz + 1) * fx) * fz;
  };
}

interface CourseResult {
  id: string;
  trees: number;
  variants: number;
  all: ViewCost;
  near: ViewCost;
  bySpecies: Record<string, { trees: number; cards: number; clumps: number; woodVerts: number; px: number }>;
}

const results: CourseResult[] = [];
for (const id of ids.length ? ids : ["c01"]) {
  const dir = join(gameDir, "public/courses", id);
  if (!existsSync(join(dir, "vegetation.ron"))) throw new Error(`${dir}: no vegetation.ron`);
  const course = readFileSync(join(dir, "course.ron"), "utf8");
  const [, w, d] = course.match(/size:\s*\((\d+),\s*(\d+)\)/)!.map(Number);
  const spacing = Number(course.match(/spacing_m:\s*([\d.]+)/)![1]);
  const extent = [(w - 1) * spacing, (d - 1) * spacing];
  const hole = holesOf(readFileSync(join(dir, "holes.ron"), "utf8")).find((h) => h.num === holeNum)!;
  const veg = vegetationOf(readFileSync(join(dir, "vegetation.ron"), "utf8"));
  const ground = groundOf(dir, w, d, spacing);
  const flora = mix.FLORAS[mix.COURSE_FLORA[id] ?? "denmark"] as { trees: [string, number][]; shrubs: [string, number][] };
  const make = (l: typeof lib) => ({ trees: flora.trees.map(([s, weight]) => ({ species: speciesNamed(l, s), weight })), shrubs: flora.shrubs.map(([s, weight]) => ({ species: speciesNamed(l, s), weight })) });
  const grownPool = make(lib);
  const choosePool = make(mixLib);
  const species = [...grownPool.trees, ...grownPool.shrubs].map((e) => e.species);
  // (The hole's region, terrain.ts `regionForHole`, and the trees its edge hides left out: treelib.ts `gameTrees`.)
  const x0 = Math.max(0, Math.floor(Math.min(hole.tee[0], hole.pin[0]) - MARGIN));
  const z0 = Math.max(0, Math.floor(Math.min(hole.tee[1], hole.pin[1]) - MARGIN));
  const x1 = Math.min(Math.floor(extent[0]), Math.ceil(Math.max(hole.tee[0], hole.pin[0]) + MARGIN));
  const z1 = Math.min(Math.floor(extent[1]), Math.ceil(Math.max(hole.tee[1], hole.pin[1]) + MARGIN));
  const list: TreeInstance[] = [];
  for (const t of veg) {
    if (t.x < x0 || t.x > x1 || t.z < z0 || t.z > z1) continue;
    if (Math.min(t.x - x0, x1 - t.x, t.z - z0, z1 - t.z) < EDGE_HIDE_M) continue;
    // (As the game hands them over, f32s.)
    const [x, z, height, crownRadius, crownBase, trunkRadius] = Float32Array.of(t.x, t.z, t.height, t.crownRadius, t.crownBase, t.trunkRadius);
    const pool = t.kind === 2 ? choosePool.shrubs : choosePool.trees;
    const first = t.kind === 2 ? choosePool.trees.length : 0;
    const row = mix.chooseSpecies(pool, x, z, height, crownRadius, crownBase, t.kind);
    list.push({ x, y: ground(x, z), z, species: first + row, height, crownRadius, crownBase, trunkRadius: t.kind === 2 ? NaN : trunkRadius });
  }
  const plan = lib.planVariants(lib.packTrees(list), species, lib.DEFAULT_VARIANT_OPTIONS, list.map(() => undefined), list.map(() => undefined));
  const grown = plan.variants.map((v) => lib.growTree(v.pruning ? { ...species[v.species], pruning: v.pruning } : species[v.species], v.size, v.seed, v.standing === "open" ? undefined : v.stand));
  const costs = variantCosts(lib, grown);
  const view = teeView(hole.tee, hole.pin, ground);
  const all = viewCost(plan, costs, grown, species, view);
  const near = viewCost(plan, costs, grown, species, view, (i) => Math.hypot(list[i].x - hole.tee[0], list[i].z - hole.tee[1]) <= within);
  const bySpecies: CourseResult["bySpecies"] = {};
  // (Each species' near tier: the trees it draws near, and their cards.)
  species.forEach((s, k) => {
    const only = viewCost(plan, costs, grown, species, view, (i) => list[i].species === k);
    const vs = plan.variants.map((v, j) => (v.species === k ? j : -1)).filter((j) => j >= 0);
    const clumps = vs.reduce((a, j) => a + grown[j].clumps.count * plan.variants[j].trees, 0) / Math.max(1, vs.reduce((a, j) => a + plan.variants[j].trees, 0));
    bySpecies[s.name] = { trees: only.trees[0], cards: only.cards[0], clumps, woodVerts: only.woodVerts[0], px: pxOf(only, 0) };
  });
  results.push({ id, trees: list.length, variants: plan.variants.length, all, near, bySpecies });
}

if (flag("--json")) {
  console.log(JSON.stringify(results, null, 1));
} else {
  const f = (n: number, unit = 1, digits = 0) => (n / unit).toFixed(digits);
  for (const r of results) {
    console.log(`${r.id} hole ${holeNum}: ${r.trees} trees, ${r.variants} variants  [lib ${libDir}${mixDir !== libDir ? `, mix ${mixDir}` : ""}]`);
    for (const [label, c] of [["in view", r.all], [`within ${within} m`, r.near]] as const) {
      const tiers = Array.from({ length: TIERS }, (_, t) => `${["near", "mid", "far"][t]} ${c.trees[t]} trees ${f(c.cards[t], 1e3, 1)}k cards ${f(vertsOf(c, t), 1e3, 0)}k verts (wood ${f(c.woodVerts[t], 1e3, 0)}k) ${f(pxOf(c, t), 1e6, 2)} Mpx (dabs ${f(c.cardPx[t], 1e6, 2)})`);
      const tot = (k: keyof ViewCost) => c[k].reduce((a, b) => a + b, 0);
      console.log(`  ${label.padEnd(14)} total ${f(tot("cards"), 1e3, 1)}k cards ${f(vertsOf(c), 1e3, 0)}k verts ${f(pxOf(c), 1e6, 2)} Mpx\n      ${tiers.join("\n      ")}`);
    }
    if (flag("--species")) for (const [name, s] of Object.entries(r.bySpecies)) if (s.trees > 0) console.log(`    ${name.padEnd(22)} near ${String(s.trees).padStart(4)} trees  ${(s.cards / s.trees).toFixed(0).padStart(5)} cards/tree  ${(s.cards / 1e3).toFixed(1).padStart(6)}k cards  ${(s.woodVerts / s.trees / 1e3).toFixed(1).padStart(5)}k wood verts/tree  ${(s.px / 1e6).toFixed(2).padStart(6)} Mpx  (${s.clumps.toFixed(0)} clumps/tree on the hole)`);
  }
}
