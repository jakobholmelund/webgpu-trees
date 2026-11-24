// A California sycamore is crooked but angular: its limbs and branches run straight between elbows
// (`zigzagRun`), and do not wave back and forth a little at every internode, which drawn as a curve through
// their nodes was a wavy line in the gaps between its leaf pads.
//
//   node --test test/crooked.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { type GrownTree } from "../src/tree.ts";

const species = (name: string): TreeSpecies => ALL_SPECIES.find((s) => s.name === name)!;
const SEEDS = [1, 2, 3, 4];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * How often its wood turns back the other way, per metre of it: along each axis, two turns in a row (of more
 * than 5 degrees each) about opposite ways. A wave turns back every other internode; a zigzag of straight
 * runs only at its elbows. And how crooked its great limbs are: their length over their chord.
 */
function wood(tree: GrownTree): { reversals: number; crooked: number } {
  const s = tree.skeleton;
  const next = new Int32Array(s.count).fill(-1);
  for (let i = 0; i < s.count; i++) if (s.parent[i] >= 0 && s.order[i] === s.order[s.parent[i]]) next[s.parent[i]] = i;
  let back = 0;
  let length = 0;
  const limbs: number[] = [];
  const least = Math.sin((5 * Math.PI) / 180);
  for (let i = 0; i < s.count; i++) {
    const p = s.parent[i];
    if (p < 0 || s.order[i] === s.order[p]) continue;
    const axis = [p, i];
    for (let q = next[i]; q >= 0; q = next[q]) axis.push(q);
    const way: number[][] = [];
    let run = 0;
    for (let k = 1; k < axis.length; k++) {
      const [a, b] = [axis[k - 1], axis[k]];
      const v = [s.x[b] - s.x[a], s.y[b] - s.y[a], s.z[b] - s.z[a]];
      const l = Math.hypot(v[0], v[1], v[2]);
      run += l;
      way.push(v.map((x) => x / l));
    }
    length += run;
    const turns: number[][] = [];
    for (let k = 1; k < way.length; k++) {
      const [a, b] = [way[k - 1], way[k]];
      turns.push([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
    }
    for (let k = 1; k < turns.length; k++) {
      const [a, b] = [turns[k - 1], turns[k]];
      if (Math.hypot(a[0], a[1], a[2]) > least && Math.hypot(b[0], b[1], b[2]) > least && a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < 0) back++;
    }
    if (s.order[i] === 1 && s.order[p] === 0) {
      const e = axis[axis.length - 1];
      limbs.push(run / Math.hypot(s.x[e] - s.x[p], s.y[e] - s.y[p], s.z[e] - s.z[p]));
    }
  }
  return { reversals: back / length, crooked: mean(limbs) };
}

test("a California sycamore's wood runs straight between elbows, and does not wave (`zigzagRun`)", () => {
  const sp = species("California sycamore");
  assert.ok((sp.zigzagRun ?? 0) > 0);
  const waving = { ...sp, zigzagRun: undefined };
  const size = { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius };
  const [run, wave] = [sp, waving].map((s) => SEEDS.map((seed) => wood(growTree(s, size, seed))));
  const [r1, r0] = [mean(run.map((w) => w.reversals)), mean(wave.map((w) => w.reversals))];
  const [c1, c0] = [mean(run.map((w) => w.crooked)), mean(wave.map((w) => w.crooked))];
  console.log(`sycamore: turns back ${r1.toFixed(3)} a metre in runs, ${r0.toFixed(3)} waving; limbs ${c1.toFixed(3)} and ${c0.toFixed(3)} of their chord`);
  assert.ok(r1 < 0.25 * r0, "it turns back far less often");
  // (Still crooked: its limbs as long for their chord as they were.)
  assert.ok(c1 >= c0 - 0.002, "its limbs no straighter");
});

test("a species that does not say grows as it did: its runs an internode", () => {
  const sp = species("Plane");
  assert.equal(sp.zigzagRun, undefined);
  const size = { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius };
  const a = growTree(sp, size, 1);
  const b = growTree({ ...sp, zigzagRun: 0 }, size, 1);
  assert.deepEqual(Array.from(a.skeleton.x), Array.from(b.skeleton.x));
});
