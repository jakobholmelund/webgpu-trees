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

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type ViewCost, TIERS, loadLib, msOf, pxOf, variantCosts, vertsOf, viewCost } from "./proxy.ts";
import { type Mix, loadCourse } from "./load.ts";

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
const mix = (await import(join(gameDir, "src/webgpu/treemix.ts"))) as Mix;

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
  const { list, plan, grown, species, view, hole } = loadCourse(lib, mixLib, mix, gameDir, id, holeNum);
  const costs = variantCosts(lib, grown);
  const all = viewCost(plan, costs, grown, species, view, undefined, lib.WOOD_BANDS);
  const near = viewCost(plan, costs, grown, species, view, (i) => Math.hypot(list[i].x - hole.tee[0], list[i].z - hole.tee[1]) <= within, lib.WOOD_BANDS);
  const bySpecies: CourseResult["bySpecies"] = {};
  // (Each species' near tier: the trees it draws near, and their cards.)
  species.forEach((s, k) => {
    const only = viewCost(plan, costs, grown, species, view, (i) => list[i].species === k, lib.WOOD_BANDS);
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
      const tiers = Array.from({ length: TIERS }, (_, t) => `${["near", "mid", "far"][t]} ${c.trees[t]} trees ${f(c.cards[t], 1e3, 1)}k cards ${f(vertsOf(c, t), 1e3, 0)}k verts (wood ${f(c.woodVerts[t], 1e3, 0)}k) ${f(pxOf(c, t), 1e6, 2)} Mpx (dabs ${f(c.cardPx[t], 1e6, 2)}, wood ${f(c.woodPx[t], 1e6, 2)})  ~${msOf(c, t).toFixed(3)} ms`);
      const tot = (k: keyof ViewCost) => c[k].reduce((a, b) => a + b, 0);
      console.log(`  ${label.padEnd(14)} total ${f(tot("cards"), 1e3, 1)}k cards ${f(vertsOf(c), 1e3, 0)}k verts ${f(pxOf(c), 1e6, 2)} Mpx  ~${msOf(c).toFixed(3)} ms (wood ~${msOf(c, undefined, "wood").toFixed(3)})\n      ${tiers.join("\n      ")}`);
    }
    if (flag("--species")) for (const [name, s] of Object.entries(r.bySpecies)) if (s.trees > 0) console.log(`    ${name.padEnd(22)} near ${String(s.trees).padStart(4)} trees  ${(s.cards / s.trees).toFixed(0).padStart(5)} cards/tree  ${(s.cards / 1e3).toFixed(1).padStart(6)}k cards  ${(s.woodVerts / s.trees / 1e3).toFixed(1).padStart(5)}k wood verts/tree  ${(s.px / 1e6).toFixed(2).padStart(6)} Mpx  (${s.clumps.toFixed(0)} clumps/tree on the hole)`);
  }
}
