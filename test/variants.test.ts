// Every tree on the ground is one of a few grown trees, fitted to its own size: these hold the fit to
// what the trees' numbers say (the space a ball meets), whatever variant a tree was given.

import assert from "node:assert/strict";
import { test } from "node:test";
import { STARTER_SPECIES } from "../src/species.ts";
import { growTree } from "../src/grow.ts";
import { DEFAULT_VARIANT_OPTIONS, fitPoint, packTrees, planVariants, type TreeInstance } from "../src/variants.ts";

/** Trees of every starter species, their sizes spread as a survey finds them. */
function survey(n: number): TreeInstance[] {
  const out: TreeInstance[] = [];
  for (let i = 0; i < n; i++) {
    const s = i % STARTER_SPECIES.length;
    const sp = STARTER_SPECIES[s];
    const f = 0.6 + ((i * 0.618) % 1) * 0.8;
    out.push({ x: i * 3.1, y: 0, z: (i * 7.3) % 200, species: s, height: sp.height * f, crownRadius: sp.crownRadius * f * (0.75 + ((i * 0.37) % 1) * 0.5), crownBase: sp.crownBase * f * (0.6 + ((i * 0.71) % 1) * 0.8), trunkRadius: sp.trunkRadius * f });
  }
  return out;
}

test("every tree is fitted to a variant of its own species", () => {
  const list = survey(600);
  const plan = planVariants(packTrees(list), STARTER_SPECIES);
  // (A shape a seed for each of where they stand: in the open, at an edge, inside a wood.)
  const o = DEFAULT_VARIANT_OPTIONS;
  assert.ok(plan.variants.length <= STARTER_SPECIES.length * 3 * o.shapes * o.seeds, `${plan.variants.length} variants`);
  // (Grown as alone, as many as ever.)
  const alone = planVariants(packTrees(list), STARTER_SPECIES, { ...o, stands: false });
  assert.ok(alone.variants.length <= STARTER_SPECIES.length * o.shapes * o.seeds, `${alone.variants.length} variants alone`);
  assert.ok(alone.placements.every((p) => p.standing === "open" && p.stand.enclosure === 0));
  plan.placements.forEach((p, i) => assert.equal(plan.variants[p.variant].species, list[i].species));
  const total = plan.variants.reduce((s, v) => s + v.trees, 0);
  assert.equal(total, list.length);
});

test("the same trees are planned the same way every time", () => {
  const a = planVariants(packTrees(survey(300)), STARTER_SPECIES);
  const b = planVariants(packTrees(survey(300)), STARTER_SPECIES);
  assert.deepEqual(a, b);
});

test("a fitted tree fills its own envelope: its top, its crown's base and its reach", () => {
  const list = survey(240);
  const plan = planVariants(packTrees(list), STARTER_SPECIES);
  const grown = plan.variants.map((v) => growTree(STARTER_SPECIES[v.species], v.size, v.seed, v.standing === "open" ? undefined : v.stand));
  plan.placements.forEach((p, i) => {
    const g = grown[p.variant];
    const c = g.clumps;
    let top = 0;
    let low = Infinity;
    let reach = 0;
    for (let k = 0; k < c.count; k++) {
      const [x, y, z] = fitPoint(g.size, p.size, p.mirror, [c.x[k], c.y[k], c.z[k]]);
      const r = c.radius[k] * (p.size.crownRadius / g.size.crownRadius);
      top = Math.max(top, y + c.radius[k] * ((p.size.height - p.size.crownBase) / (g.size.height - g.size.crownBase)));
      low = Math.min(low, y - c.radius[k]);
      reach = Math.max(reach, Math.hypot(x, z) + r);
    }
    const s = p.size;
    const depth = s.height - s.crownBase;
    const what = `tree ${i} (${STARTER_SPECIES[list[i].species].name})`;
    assert.ok(top > s.height * 0.93 && top < s.height * 1.05, `${what}: top ${top.toFixed(2)} for ${s.height.toFixed(2)}`);
    assert.ok(reach > s.crownRadius * 0.88 && reach < s.crownRadius * 1.06, `${what}: reach ${reach.toFixed(2)} for ${s.crownRadius.toFixed(2)}`);
    // (A crown that starts at the ground may rest its lowest clumps on it, half in the grass. One inside a wood
    // has had its crown lifted, but keeps at least the top 45% of the tree.)
    const highest = s.crownBase + depth * 0.2 + (p.standing === "interior" ? Math.max(0, s.height * 0.55 - s.crownBase) : 0);
    assert.ok(low > Math.min(s.crownBase - depth * 0.12, -0.3) && low < highest, `${what} (${p.standing}): lowest leaves ${low.toFixed(2)} for a crown base of ${s.crownBase.toFixed(2)}`);
  });
});
