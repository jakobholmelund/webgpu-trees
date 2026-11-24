// The air between a tree and the eye (engine.ts `world.air`): a host that gives its own has the whole of the
// haze in the trees' colour, so none of the trees' materials lays the scene's fog over it as well; a host that
// gives none has the scene's fog on every one of them. In every look, the palms' fronds and the wood as well.

import assert from "node:assert/strict";
import { test } from "node:test";
import { float } from "three/tsl";
import { ALL_SPECIES, TREE_LOOKS, createTrees, type TreeInstance } from "../src/index.ts";

const pick = ["Oak", "Scots pine", "Mexican fan palm"].map((name) => {
  const row = ALL_SPECIES.findIndex((s) => s.name === name);
  assert.ok(row >= 0, `${name} is a species`);
  return ALL_SPECIES[row];
});
const trees: TreeInstance[] = pick.map((_, i) => ({ x: i * 20, y: 0, z: 0, species: i }));

const fogOf = (look: (typeof TREE_LOOKS)[number], air: boolean) => {
  const made = createTrees({ trees, species: pick, look, scans: false, world: air ? { air: (c, at) => c.mul(float(0.5)).add(at.mul(0)) } : {} });
  const found: [string, boolean][] = [];
  made.object.traverse((o) => {
    const m = (o as { material?: { name: string; fog: boolean } }).material;
    if (m) found.push([m.name, m.fog]);
  });
  made.dispose();
  return found;
};

for (const look of TREE_LOOKS) {
  test(`${look}: with the host's air, no material takes the scene's fog as well`, () => {
    const found = fogOf(look, true);
    assert.ok(found.some(([n]) => n.startsWith("trees-dabs")), "the leaves are there");
    assert.ok(found.some(([n]) => n.startsWith("trees-wood")), "the wood is there");
    assert.ok(found.some(([n]) => n.startsWith("trees-fronds")), "the palms' fronds are there");
    for (const [name, fog] of found) assert.equal(fog, false, `${name} keeps to the host's air`);
  });

  test(`${look}: without it, every material takes the scene's fog`, () => {
    for (const [name, fog] of fogOf(look, false)) assert.equal(fog, true, `${name} takes the scene's fog`);
  });
}
