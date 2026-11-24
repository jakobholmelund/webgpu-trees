// A weeping willow's top is a soft dome of leaves: every limb that arches over is clothed along its arch, and no
// bare wood stands above the crown's leaves, in any variant a course grows (its seeds, its shapes, where it
// stands). The realistic look's sprays spring from as high as their clumps are hung over the wood.
//
//   node --test test/weep.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { type FixedCards, cardPieces } from "../src/geometry.ts";
import { clothed, growTree } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { type Stand } from "../src/stand.ts";
import { type GrownTree, type TreeSize } from "../src/tree.ts";

const species = (name: string): TreeSpecies => ALL_SPECIES.find((s) => s.name === name)!;
const willow = species("Weeping willow");

/**
 * The bare wood standing above the crown's leaves: points along the wood in the crown's upper half that no
 * clump's ball lies over, and that stand within `near` metres of (or above) the highest leaves within a
 * metre round them: at the crown's top, not seen through a gap deep inside it.
 */
function bareOverTop(tree: GrownTree, near = 0.5): { x: number; y: number; z: number }[] {
  const { skeleton: s, clumps: c, size } = tree;
  const from = size.crownBase + 0.5 * (size.height - size.crownBase);
  const out: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < s.count; i++) {
    const p = s.parent[i];
    if (p < 0) continue;
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const x = s.x[p] + (s.x[i] - s.x[p]) * t;
      const y = s.y[p] + (s.y[i] - s.y[p]) * t;
      const z = s.z[p] + (s.z[i] - s.z[p]) * t;
      const top = y + s.radius[p] + (s.radius[i] - s.radius[p]) * t;
      if (y < from) continue;
      let over = -Infinity;
      let round = -Infinity;
      for (let k = 0; k < c.count; k++) {
        const r = c.radius[k];
        const d = Math.hypot(c.x[k] - x, c.z[k] - z);
        if (d < r) over = Math.max(over, c.y[k] + Math.sqrt(r * r - d * d));
        const e = Math.max(0, d - 1);
        if (e < r) round = Math.max(round, c.y[k] + Math.sqrt(r * r - e * e));
      }
      if (top > over && top > round - near) out.push({ x, y, z });
    }
  }
  return out;
}

/** The seeds a course grows its variants of a species from (variants.ts), for the species' place in its list, each shape, standing and seed. */
function courseSeeds(rows: number[]): number[] {
  const out: number[] = [];
  for (const s of rows) for (const which of [0, 1, 2]) for (const c of [0, 1]) for (const k of [0, 1]) out.push((s * 7919 + (c + 16 * which) * 104729 + k * 1299709 + 17) >>> 0);
  return out;
}

const SIZES: TreeSize[] = [
  { height: willow.height, crownRadius: willow.crownRadius, crownBase: willow.crownBase, trunkRadius: willow.trunkRadius },
  { height: 14, crownRadius: 7, crownBase: 1.5, trunkRadius: 0.6 },
  { height: 9, crownRadius: 5, crownBase: 0.8, trunkRadius: 0.35 },
  { height: 12, crownRadius: 4.5, crownBase: 2, trunkRadius: 0.4 },
];
const STANDS: (Stand | undefined)[] = [undefined, { enclosure: 0.5, lopsided: 0.64, openX: 1, openZ: 0, canopy: 1, gap: 1 }, { enclosure: 0.85, lopsided: 0.1, openX: 1, openZ: 0, canopy: 1.2, gap: 0.3 }];

test("no bare wood stands above a weeping willow's leaves, in any variant a course grows", () => {
  assert.ok(clothed(willow));
  // (Its row in the gallery, and its place in a course's list: the Paris course's third tree.)
  const seeds = courseSeeds([ALL_SPECIES.indexOf(willow), 2]);
  const bad: string[] = [];
  let trees = 0;
  let points = 0;
  seeds.forEach((seed, j) => {
    const size = SIZES[j % SIZES.length];
    const stand = STANDS[Math.floor(j / SIZES.length) % STANDS.length];
    const tree = growTree(willow, size, seed, stand);
    const bare = bareOverTop(tree);
    trees++;
    points += bare.length;
    if (bare.length > 0) bad.push(`seed ${seed} ${size.height} m${stand ? `, enclosed ${stand.enclosure}` : ""}: ${bare.length} at ${bare.slice(0, 2).map((b) => `(${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.z.toFixed(1)})`).join(" ")}`);
  });
  console.log(`weeping willow: ${points} points of bare wood over the leaves in ${trees} trees`);
  assert.deepEqual(bad, [], "bare wood over the crown");
});

test("the test sees bare wood over a crown: a willow's top unclothed", () => {
  // (Its leaves over the top taken away: the arches under them are bare.)
  const tree = growTree(willow, SIZES[0], 79207);
  const { clumps: c, size } = tree;
  const top = size.crownBase + 0.8 * (size.height - size.crownBase);
  const keep = Array.from({ length: c.count }, (_, k) => k).filter((k) => c.y[k] < top);
  const pick = (a: Float32Array) => Float32Array.from(keep.map((k) => a[k]));
  const stripped: GrownTree = { ...tree, clumps: { ...c, count: keep.length, x: pick(c.x), y: pick(c.y), z: pick(c.z), radius: pick(c.radius) } };
  assert.ok(bareOverTop(stripped).length > 10);
});

test("a birch, which weeps a little, keeps its open top: only a curtain of whips is clothed", () => {
  assert.equal(clothed(species("Silver birch")), false);
});

test("a weeping crown's sprays spring from as high as their clump is hung over its wood (`lift`)", () => {
  const tree = growTree(willow, SIZES[0], 79207);
  const fix = (lift: boolean): FixedCards => ({ half: 0.2, fill: 0.5, most: 36, big: 2, bigSize: 1.15, hang: 0.95, hangTop: 0.6, lift });
  const feet = (f: FixedCards) => {
    const P = cardPieces([tree], 12, 0.8, undefined, [f]);
    const pos = P.attributes.position.array;
    let sum = 0;
    for (let v = 0; v < pos.length; v += 12) sum += pos[v + 1];
    return sum / (pos.length / 12);
  };
  const [hung, lifted] = [feet(fix(false)), feet(fix(true))];
  console.log(`weeping cards: mean height ${hung.toFixed(2)} m hung from the wood, ${lifted.toFixed(2)} m from their clumps`);
  assert.ok(lifted > hung + 0.05);
});
