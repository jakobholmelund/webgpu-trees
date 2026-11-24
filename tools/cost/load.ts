// A course's trees for a hole, as the game hands them to the library (course.ts, wood.ts): read from a worldgolf
// checkout's course files, each its species as the game chooses it (its src/webgpu/treemix.ts, as its
// scripts/tree-mix.mjs reads a course), planned and grown as `createTrees` grows them, and the game's bench camera
// on its tee.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Lib, type View, teeView } from "./proxy.ts";
import type { GrownTree } from "../../src/tree.ts";
import type { Plan, TreeInstance } from "../../src/variants.ts";
import type { TreeSpecies } from "../../src/species.ts";

/** The game's tree mix (src/webgpu/treemix.ts), as far as it is used here. */
export interface Mix {
  FLORAS: Record<string, { trees: [string, number][]; shrubs: [string, number][] }>;
  COURSE_FLORA: Record<string, string>;
  chooseSpecies(pool: { species: TreeSpecies; weight: number }[], x: number, z: number, height: number, crownRadius: number, crownBase: number, kind: number): number;
}

/** A species by its id (`MORE_SPECIES`) or a starter's name, as the game's treelib.ts finds it. */
function speciesNamed(l: Lib, id: string): TreeSpecies {
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

/** A hole's trees, planned and grown, and the bench camera on its tee. */
export interface Course {
  id: string;
  hole: { num: number; tee: [number, number]; pin: [number, number] };
  list: TreeInstance[];
  species: TreeSpecies[];
  plan: Plan;
  grown: GrownTree[];
  view: View;
}

/** Course `id`'s hole `holeNum` from the game's checkout: `lib` grows its trees, `mixLib`'s species choose which is which. */
export function loadCourse(lib: Lib, mixLib: Lib, mix: Mix, gameDir: string, id: string, holeNum: number): Course {
  const dir = join(gameDir, "public/courses", id);
  if (!existsSync(join(dir, "vegetation.ron"))) throw new Error(`${dir}: no vegetation.ron`);
  const course = readFileSync(join(dir, "course.ron"), "utf8");
  const [, w, d] = course.match(/size:\s*\((\d+),\s*(\d+)\)/)!.map(Number);
  const spacing = Number(course.match(/spacing_m:\s*([\d.]+)/)![1]);
  const extent = [(w - 1) * spacing, (d - 1) * spacing];
  const hole = holesOf(readFileSync(join(dir, "holes.ron"), "utf8")).find((h) => h.num === holeNum)!;
  const veg = vegetationOf(readFileSync(join(dir, "vegetation.ron"), "utf8"));
  const ground = groundOf(dir, w, d, spacing);
  const flora = mix.FLORAS[mix.COURSE_FLORA[id] ?? "denmark"];
  const make = (l: Lib) => ({ trees: flora.trees.map(([s, weight]) => ({ species: speciesNamed(l, s), weight })), shrubs: flora.shrubs.map(([s, weight]) => ({ species: speciesNamed(l, s), weight })) });
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
  return { id, hole, list, species, plan, grown, view: teeView(hole.tee, hole.pin, ground) };
}
