// A tree's box of light (light.ts): what it holds is the leaf area and wood put in, no more and no less; the sky
// it sees darkens going down into a crown; the sun gets through gaps and not through a dense crown; and a tree
// fitted to its variant reads its own leaves where they are.

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { bakeLight, boxSpan, cellIndex, dirToFit, type Fit, fitToWorld, leafAreaIndex, packLightAtlas, SKY_DIRECTIONS, sigmaAt, sunThrough, worldToCrownFit, worldToFit, type LightVolume } from "../src/light.ts";
import { ALL_SPECIES } from "../src/species.ts";
import { type GrownTree, type TreeSize } from "../src/tree.ts";
import { packTrees, planVariants } from "../src/variants.ts";

const byName = (name: string) => ALL_SPECIES.findIndex((s) => s.name === name);
const sizeOf = (row: number): TreeSize => {
  const s = ALL_SPECIES[row];
  return { height: s.height, crownRadius: s.crownRadius, crownBase: s.crownBase, trunkRadius: s.trunkRadius };
};
const grownOf = (name: string, seed = 1) => {
  const row = byName(name);
  return { row, tree: growTree(ALL_SPECIES[row], sizeOf(row), seed) };
};
const cellVolume = (v: LightVolume) => (v.size[0] / v.nx) * (v.size[1] / v.ny) * (v.size[2] / v.nz);
const total = (v: LightVolume) => v.sigma.reduce((m, s) => m + s, 0) * cellVolume(v);

test("the sky is seen from every direction it is baked for, weighted to one", () => {
  const sum = SKY_DIRECTIONS.reduce((m, d) => m + d[3], 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  for (const [x, y, z] of SKY_DIRECTIONS) {
    assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-9);
    assert.ok(y > 0.15, "every direction above the last ten degrees");
  }
});

test("a box of light holds the leaf area and the wood put in: nothing lost, nothing made", () => {
  for (const name of ["Oak", "Spruce", "Silver birch", "Mexican fan palm", "Gorse"]) {
    const { row, tree } = grownOf(name);
    const lai = leafAreaIndex(ALL_SPECIES[row].openness);
    const v = bakeLight(tree, { lai });
    const want = 0.5 * lai * Math.PI * tree.size.crownRadius ** 2 + v.woodShadow;
    assert.ok(Math.abs(v.leafArea - lai * Math.PI * tree.size.crownRadius ** 2) < 1e-6, name);
    assert.ok(Math.abs(total(v) - want) / want < 1e-4, `${name}: ${total(v)} held, ${want} put in`);
    assert.ok(v.sigma.every((s) => s >= 0 && Number.isFinite(s)), name);
  }
});

test("the box holds the whole tree: every clump's leaves and all its wood", () => {
  const { tree } = grownOf("Oak");
  const v = bakeLight(tree, { lai: 4 });
  const inside = (x: number, y: number, z: number) => x >= v.min[0] && y >= v.min[1] && z >= v.min[2] && x <= v.min[0] + v.size[0] && y <= v.min[1] + v.size[1] && z <= v.min[2] + v.size[2];
  const cl = tree.clumps;
  for (let c = 0; c < cl.count; c++) assert.ok(inside(cl.x[c], cl.y[c], cl.z[c]));
  const sk = tree.skeleton;
  for (let n = 0; n < sk.count; n++) assert.ok(inside(sk.x[n], sk.y[n], sk.z[n]));
});

test("a denser crown holds more: twice the leaf area index, twice the leaves' extinction", () => {
  const { tree } = grownOf("Beech");
  const a = bakeLight(tree, { lai: 3 });
  const b = bakeLight(tree, { lai: 6 });
  const leaves = (v: LightVolume) => total(v) - v.woodShadow;
  assert.ok(Math.abs(leaves(b) / leaves(a) - 2) < 1e-4);
});

/** A tree of one even layer of leaves, `top` down to `bottom`, wide: a slab. */
function slab(top: number, bottom: number): GrownTree {
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (let y = bottom; y <= top; y += 0.5) for (let x = -8; x <= 8; x += 0.5) for (let z = -8; z <= 8; z += 0.5) (xs.push(x), ys.push(y), zs.push(z));
  const n = xs.length;
  const f = (a: number[]) => Float32Array.from(a);
  return {
    size: { height: top + 0.5, crownRadius: 8, crownBase: bottom, trunkRadius: 0.2 },
    skeleton: { count: 1, x: f([0]), y: f([0]), z: f([0]), radius: f([0.2]), parent: Int32Array.from([-1]), order: Uint8Array.from([0]), limb: Int32Array.from([0]), along: f([0]) },
    clumps: { count: n, x: f(xs), y: f(ys), z: f(zs), radius: new Float32Array(n).fill(0.3), nx: new Float32Array(n), ny: new Float32Array(n).fill(1), nz: new Float32Array(n), node: new Int32Array(n), depth: new Float32Array(n), tx: new Float32Array(n), ty: new Float32Array(n).fill(1), tz: new Float32Array(n) },
  };
}

test("down through an even layer of leaves the sky seen darkens all the way, the deeper the darker", () => {
  const v = bakeLight(slab(9, 4), { lai: 5 });
  const i = v.nx >> 1;
  const k = v.nz >> 1;
  let above = Infinity;
  // (To the layer's foot: below it the slanting sky comes in under its edges, as under a real crown.)
  for (let j = v.ny - 1; v.min[1] + ((j + 0.5) * v.size[1]) / v.ny >= 4; j--) {
    const sky = v.sky[cellIndex(v, i, j, k)];
    assert.ok(sky <= above + 1e-6, `layer ${j}: ${sky} under ${above}`);
    above = sky;
  }
  assert.ok(v.sky[cellIndex(v, i, v.ny - 1, k)] > 0.9, "the top sees nearly all the sky");
  assert.ok(v.sky[cellIndex(v, i, Math.floor((4 / v.size[1]) * v.ny), k)] < 0.3, "its foot, little");
});

test("in a grown crown the sky seen darkens going down into it, layer by layer", () => {
  for (const name of ["Oak", "Spruce", "Beech"]) {
    const { row, tree } = grownOf(name);
    const v = bakeLight(tree, { lai: leafAreaIndex(ALL_SPECIES[row].openness) });
    // (Each layer's sky over the cells that hold leaves, from the crown's top to its base.)
    const mean: number[] = [];
    for (let j = 0; j < v.ny; j++) {
      let s = 0;
      let n = 0;
      for (let k = 0; k < v.nz; k++)
        for (let i = 0; i < v.nx; i++) {
          const q = cellIndex(v, i, j, k);
          if (v.sigma[q] > 0.05) ((s += v.sky[q]), n++);
        }
      mean.push(n > 3 ? s / n : NaN);
    }
    const layers = mean.map((m, j) => [j, m]).filter(([, m]) => Number.isFinite(m));
    const top = layers[layers.length - 1][1];
    const bottom = layers[0][1];
    assert.ok(top > bottom + 0.3, `${name}: the crown's top sees ${top.toFixed(2)} of the sky, its base ${bottom.toFixed(2)}`);
    // (Down from the top, a layer never sees much more sky than the one above it.)
    for (let a = layers.length - 1; a > 0; a--) assert.ok(layers[a - 1][1] <= layers[a][1] + 0.08, `${name}: layer ${layers[a - 1][0]}`);
  }
});

test("the sun gets through a gap and not through a crown", () => {
  const { tree } = grownOf("Oak");
  const v = bakeLight(tree, { lai: 4.5 });
  const centreY = (tree.size.crownBase + tree.size.height) / 2;
  const down: number[] = [0, 1, 0];
  // (From the ground under the crown's middle straight up: through all of it.)
  assert.ok(sunThrough(v, [0.5, 0.2, 0.5], down) < 0.1);
  // (From beside the crown, up past it: nothing in the way.)
  assert.ok(sunThrough(v, [tree.size.crownRadius + 3, centreY, 0], down) > 0.99);
  // (From the top of the crown: hardly any leaves above.)
  assert.ok(sunThrough(v, [0, tree.size.height - 0.3, 0], down) > 0.6);
  const [t0, t1] = boxSpan(v, [0, centreY, 0], down);
  assert.ok(t0 === 0 && Math.abs(t1 - (v.min[1] + v.size[1] - centreY)) < 1e-9);
});

test("a fitted tree reads its own leaves: each clump, fitted, turned, leant and mirrored, comes back to its own cell", () => {
  const row = byName("Oak");
  const trees = [0, 1, 2, 3, 4, 5].map((k) => ({ x: k * 23 - 40, y: 1.5 * k, z: (k % 3) * 17, species: row, height: 14 + k * 1.3, crownRadius: 6 + k * 0.8, crownBase: 2 + k * 0.4, trunkRadius: 0.4, yaw: k * 1.1 }));
  const plan = planVariants(packTrees(trees), ALL_SPECIES, { shapes: 2, seeds: 2, lean: 6, mirror: true, stands: false });
  const grown = plan.variants.map((v) => growTree(ALL_SPECIES[v.species], v.size, v.seed));
  const volumes = grown.map((g) => bakeLight(g, { lai: 4.5 }));
  let mirrored = 0;
  for (const p of plan.placements) {
    const g = grown[p.variant];
    const v = volumes[p.variant];
    const fit: Fit = { x: p.x, y: p.y, z: p.z, yaw: p.yaw, leanX: p.leanX, leanZ: p.leanZ, mirror: p.mirror, size: p.size, grown: g.size };
    if (p.mirror < 0) mirrored++;
    const cl = g.clumps;
    for (let c = 0; c < cl.count; c += 7) {
      const own = [cl.x[c], cl.y[c], cl.z[c]];
      const back = worldToFit(fit, fitToWorld(fit, own));
      for (let a = 0; a < 3; a++) assert.ok(Math.abs(back[a] - own[a]) < 1e-3, `clump ${c}: ${back} for ${own}`);
      const cell = (q: number[]) => [0, 1, 2].map((a) => Math.floor(((q[a] - v.min[a]) / v.size[a]) * [v.nx, v.ny, v.nz][a]));
      assert.deepEqual(cell(back), cell(own));
      // (And the leaves there are what the box holds at the clump.)
      assert.ok(sigmaAt(v, back[0], back[1], back[2]) > 0);
    }
    // (A direction carried in and out keeps its sense: up is up, the stretch only shortens or lengthens it.)
    const up = dirToFit(fit, [0, 1, 0]);
    assert.ok(up.dir[1] > 0.9);
  }
  assert.ok(mirrored > 0, "some tree is mirrored");
});

test("a tree whose trunk and crown are stretched apart casts its shadow under its crown: a ray from the ground runs straight", () => {
  const { tree } = grownOf("Oak");
  const v = bakeLight(tree, { lai: 4.5 });
  const g = tree.size;
  // (The trunk stretched up twice as much as the crown: its crown's base twice as high, the crown as deep.)
  const size: TreeSize = { ...g, crownBase: g.crownBase * 2, height: g.height + g.crownBase };
  const fit: Fit = { x: 3, y: 1, z: -2, yaw: 0.7, leanX: 0.03, leanZ: -0.02, mirror: -1, size, grown: g };
  const sun = [0.55, 0.6, -0.58];
  const l = Math.hypot(sun[0], sun[1], sun[2]);
  const d = sun.map((c) => c / l);
  const ray = dirToFit(fit, d).dir;
  // (The crown's middle, in the world, and the place on the ground the sun's ray through it comes down to.)
  const middle = [0, (g.crownBase + g.height) / 2, 0];
  const w = fitToWorld(fit, middle);
  const down = (w[1] - fit.y) / d[1];
  const ground = [w[0] - d[0] * down, fit.y, w[2] - d[2] * down];
  const along = (from: number[]) => {
    // (How far the ray from `from` along `ray` passes from the crown's middle, in the frame.)
    const o = [0, 1, 2].map((a) => middle[a] - from[a]);
    const t = o[0] * ray[0] + o[1] * ray[1] + o[2] * ray[2];
    return Math.hypot(o[0] - ray[0] * t, o[1] - ray[1] * t, o[2] - ray[2] * t);
  };
  const start = worldToCrownFit(fit, ground);
  assert.ok(along(start) < 1e-6, `the ray passes ${along(start)} m from the crown's middle`);
  assert.ok(sunThrough(v, start, ray) < 0.15, "and its leaves shade it");
  // (Taken in by the trunk's stretch, the ray started (sun's slope) × (crown base − grown base × crown stretch) aside.)
  const bent = worldToFit(fit, ground);
  const slope = Math.hypot(d[0], d[2]) / d[1];
  assert.ok(along(bent) > slope * g.crownBase * 0.3, `the trunk's stretch would have moved it (${along(bent).toFixed(2)} m)`);
  // (A point on the trunk below the crown's base: the same line.)
  const low = [ground[0] + d[0] * (down * 0.2), fit.y + d[1] * (down * 0.2), ground[2] + d[2] * (down * 0.2)];
  assert.ok(along(worldToCrownFit(fit, low)) < 1e-6);
  // (Within the crown both are the fit undone.)
  const inCrown = fitToWorld(fit, [1, g.crownBase + 1, -1]);
  assert.deepEqual(worldToCrownFit(fit, inCrown).map((c) => +c.toFixed(6)), worldToFit(fit, inCrown).map((c) => +c.toFixed(6)));
});

test("the boxes pack into one texture, each in its own slot, and read back as baked", () => {
  const volumes = ["Oak", "Spruce", "Silver birch"].map((n) => bakeLight(grownOf(n).tree, { lai: 4 }));
  const cells: [number, number, number] = [volumes[0].nx, volumes[0].ny, volumes[0].nz];
  const atlas = packLightAtlas(volumes, cells, cells[2] * 2);
  assert.equal(atlas.perColumn, 2);
  assert.equal(atlas.width, cells[0] * 2);
  assert.equal(atlas.depth, cells[2] * 2);
  const v = volumes[2];
  const [i, j, k] = [5, 11, 7];
  // (The third box: the second column, the first slot deep.)
  const o = (k * atlas.height * atlas.width + j * atlas.width + cells[0] + i) * 2;
  assert.equal(atlas.data[o + 1], Math.round(v.sky[cellIndex(v, i, j, k)] * 255));
});
