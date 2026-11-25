// A leaning trunk (`lean`, a California sycamore's): leaning at its foot as its species says, easing upright
// under its crown, its crown still over its foot; less under a narrow crown, none in a stand, and nothing of
// it in a species that does not lean. And a lifted canopy (`canopyLift`) only on an open-grown crown.
//
//   node --test test/lean.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { formOf, growTree, umbrellaCap } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { type GrownTree, type TreeSize } from "../src/tree.ts";

const species = (name: string): TreeSpecies => ALL_SPECIES.find((s) => s.name === name)!;
const own = (sp: TreeSpecies): TreeSize => ({ height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius });
const DEG = Math.PI / 180;
const sycamore = species("California sycamore");
/** Seeds whose tree is of one stem, and seeds whose trunk forks. */
const single = Array.from({ length: 40 }, (_, i) => i + 1).filter((s) => formOf(sycamore, s).stems === 1).slice(0, 3);
const forked = Array.from({ length: 40 }, (_, i) => i + 1).filter((s) => formOf(sycamore, s).stems > 1 && !formOf(sycamore, s).clump).slice(0, 3);

/** Its first stem's axis (order-0 nodes from its foot). */
function axis(t: GrownTree): number[] {
  const k = t.skeleton;
  const out = [0];
  for (;;) {
    const at = out[out.length - 1];
    let next = -1;
    for (let i = at + 1; i < k.count; i++) if (k.parent[i] === at && k.order[i] === 0) {
      next = i;
      break;
    }
    if (next < 0) return out;
    out.push(next);
  }
}

/** How far its trunk leans from upright (degrees) over its lowest metre, and how far aside it is at a height. */
function footLean(t: GrownTree): number {
  const k = t.skeleton;
  const a = axis(t);
  const j = a.find((i) => k.y[i] >= 0.5) ?? a[a.length - 1];
  return Math.atan2(Math.hypot(k.x[j] - k.x[0], k.z[j] - k.z[0]), k.y[j] - k.y[0]) / DEG;
}
function asideAt(t: GrownTree, y: number): number {
  const k = t.skeleton;
  const a = axis(t);
  const j = a.find((i) => k.y[i] >= y) ?? a[a.length - 1];
  return Math.hypot(k.x[j] - k.x[0], k.z[j] - k.z[0]);
}

test("there are trees of one stem and forked trees of the sycamore to look at", () => {
  assert.ok((sycamore.lean ?? 0) >= 10, "the sycamore leans");
  assert.ok(single.length >= 2 && forked.length >= 2, `${single.length} of one stem, ${forked.length} forked`);
});

test("a sycamore's trunk leans at its foot as its species says, and less without its lean", () => {
  for (const seed of [...single, ...forked]) {
    const leaning = footLean(growTree(sycamore, own(sycamore), seed));
    const upright = footLean(growTree({ ...sycamore, lean: 0 }, own(sycamore), seed));
    console.log(`lean, seed ${seed} (${formOf(sycamore, seed).stems} stems): ${leaning.toFixed(1)} degrees, ${upright.toFixed(1)} without`);
    // (Over its first piece of wood, which averages its easing upright, and the fit stretches up.)
    assert.ok(leaning >= 0.45 * sycamore.lean!, `seed ${seed}: it leans ${leaning.toFixed(1)} degrees at its foot`);
    assert.ok(leaning <= 1.3 * sycamore.lean!, `seed ${seed}: it leans ${leaning.toFixed(1)} degrees at its foot`);
    assert.ok(upright <= 0.5 * leaning, `seed ${seed}: ${upright.toFixed(1)} degrees without its lean`);
  }
});

test("a leaning trunk eases upright, its crown near over its foot and in its box", () => {
  for (const seed of single) {
    const t = growTree(sycamore, own(sycamore), seed);
    const c = t.clumps;
    // (Upright where its limbs leave it: the trunk's last metre under its crown's base nearly level with it.)
    const lo = asideAt(t, sycamore.crownBase - 1);
    const hi = asideAt(t, sycamore.crownBase);
    assert.ok(Math.abs(hi - lo) <= Math.tan(12 * DEG), `its trunk goes ${(hi - lo).toFixed(2)} m aside over its last metre`);
    // (Its crown's middle over its foot, within a third of its radius; every clump in its reach.)
    let x = 0;
    let z = 0;
    for (let i = 0; i < c.count; i++) {
      x += c.x[i];
      z += c.z[i];
      assert.ok(Math.hypot(c.x[i], c.z[i]) <= 1.05 * sycamore.crownRadius);
    }
    assert.ok(Math.hypot(x, z) / c.count <= sycamore.crownRadius / 3, `its crown's middle ${(Math.hypot(x, z) / c.count).toFixed(2)} m off its foot`);
  }
});

test("a tall bole under a narrow crown leans less, no further aside than 0.3 of its crown's radius; none in a stand", () => {
  for (const seed of single) {
    const size: TreeSize = { height: 22, crownRadius: 2.5, crownBase: 14, trunkRadius: 0.2 };
    const t = growTree(sycamore, size, seed);
    const aside = asideAt(t, size.crownBase);
    assert.ok(aside <= 0.3 * size.crownRadius + 0.25, `${aside.toFixed(2)} m aside under a crown ${size.crownRadius} m round`);
    const inWood = growTree(sycamore, own(sycamore), seed, { enclosure: 0.8, lopsided: 0, openX: 1, openZ: 0, canopy: 0.4, gap: 0.3 });
    assert.ok(footLean(inWood) <= 0.5 * sycamore.lean!, `in a wood it leans ${footLean(inWood).toFixed(1)} degrees`);
  }
});

test("a species that does not lean grows as it did: lean 0 and left out are the same tree", () => {
  const oak = species("Oak");
  const a = growTree(oak, own(oak), 3);
  const b = growTree({ ...oak, lean: 0 }, own(oak), 3);
  assert.deepEqual(Array.from(a.skeleton.x), Array.from(b.skeleton.x));
  assert.deepEqual(Array.from(a.clumps.y), Array.from(b.clumps.y));
});

test("a lifted canopy (`canopyLift`) only on an open-grown crown: fitted as a column, its middle keeps its leaves", () => {
  for (const name of ["Monterey cypress", "Stone pine"]) {
    const sp = species(name);
    const flat = { ...sp, canopyLift: 0 };
    const low = (t: GrownTree) => {
      const c = t.clumps;
      const depth = t.size.height - t.size.crownBase;
      let n = 0;
      for (let i = 0; i < c.count; i++) if (Math.hypot(c.x[i], c.z[i]) < 0.5 * t.size.crownRadius && c.y[i] < t.size.crownBase + 0.3 * depth) n++;
      return n;
    };
    // (Open-grown: the middle of its underside cleared, against the same tree unlifted; over a few seeds, a single
    // tree's lowest limbs, rising into its crown from low on its stems, may carry a few leaves there either way.)
    const lifted = [1, 2, 3].reduce((n, seed) => n + low(growTree(sp, own(sp), seed)), 0);
    const unlifted = [1, 2, 3].reduce((n, seed) => n + low(growTree(flat, own(sp), seed)), 0);
    console.log(`${name}: ${lifted} clumps under the middle of its crown lifted, ${unlifted} unlifted`);
    assert.ok(lifted < unlifted, `${name}: ${lifted} clumps under its middle lifted, ${unlifted} not`);
    // (A column, as a survey hands over for a tree in a wood: not lifted at all, the very tree grown unlifted. An
    // umbrella pine's crown so deep is kept to its top, no column: grow.ts `umbrellaCap`.)
    const column: TreeSize = { height: 18, crownRadius: 1.8, crownBase: 6, trunkRadius: 0.25 };
    if (umbrellaCap(sp, column) !== column) continue;
    assert.deepEqual(Array.from(growTree(sp, column, 1).clumps.y), Array.from(growTree(flat, column, 1).clumps.y), `${name}: a column is lifted`);
  }
});
