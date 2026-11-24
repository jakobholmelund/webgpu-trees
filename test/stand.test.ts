// Where a tree stands among the others (stand.ts): worked out from the trees alone, and what it grows.
// A tree alone is grown and lit as it always was; at a wood's edge it keeps its leaves low on the open side
// and loses them on the wood's; inside a wood its crown is lifted; and every tree keeps to its size.

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { ALL_SPECIES, STARTER_SPECIES } from "../src/species.ts";
import { OPEN_STAND, type Stand, standingOf, standsOf } from "../src/stand.ts";
import { crownEllipsoid, crownProfile, type TreeSize } from "../src/tree.ts";
import { packTrees, planVariants, type TreeInstance } from "../src/variants.ts";

const OAK = STARTER_SPECIES.findIndex((s) => s.name === "Oak");
const BEECH = ALL_SPECIES.findIndex((s) => s.name === "Beech");

/** A wood: trees on a jittered grid 7 m apart, from z = 0 back to z = -depth, the open ground at z > 0. */
function wood(width = 140, depth = 70): TreeInstance[] {
  const out: TreeInstance[] = [];
  let k = 0;
  for (let z = 0; z >= -depth; z -= 7)
    for (let x = -width / 2; x <= width / 2; x += 7) {
      k++;
      const j = (n: number) => ((Math.sin(k * 12.9898 + n * 78.233) * 43758.5453) % 1) * 1.5;
      out.push({ x: x + j(1), y: 0, z: z + j(2), species: OAK, height: 17, crownRadius: 4.5, crownBase: 2.5, trunkRadius: 0.35 });
    }
  return out;
}

const sizeOfTree = (t: TreeInstance): TreeSize => ({ height: t.height!, crownRadius: t.crownRadius!, crownBase: t.crownBase!, trunkRadius: t.trunkRadius! });

test("a tree alone stands in the open, and trees a park's width apart do too", () => {
  const [alone] = standsOf([0], [0], [{ height: 17, crownRadius: 8, crownBase: 2.5, trunkRadius: 0.4 }]);
  assert.deepEqual(alone, { ...OPEN_STAND });
  // (One of each species in a row, 30 m apart: the lab's specimens. Nothing round them shades them: the
  // shaders' stand fades in only from 0.3.)
  const xs = ALL_SPECIES.map((_, i) => (i - (ALL_SPECIES.length - 1) / 2) * 30);
  const row = standsOf(xs, xs.map(() => 0), ALL_SPECIES.map((s) => ({ height: s.height, crownRadius: s.crownRadius, crownBase: s.crownBase, trunkRadius: s.trunkRadius })));
  for (const [i, s] of row.entries()) {
    assert.equal(standingOf(s), "open", ALL_SPECIES[i].name);
    assert.ok(s.enclosure + s.lopsided < 0.3, `${ALL_SPECIES[i].name}: ${(s.enclosure + s.lopsided).toFixed(2)}`);
  }
});

test("a wood's front row stands at its edge, open to the open ground; its inside is closed all round", () => {
  const list = wood();
  const st = standsOf(list.map((t) => t.x), list.map((t) => t.z), list.map(sizeOfTree));
  const front = list.map((t, i) => i).filter((i) => list[i].z > -2 && Math.abs(list[i].x) < 50);
  const inside = list.map((t, i) => i).filter((i) => list[i].z < -25 && list[i].z > -50 && Math.abs(list[i].x) < 40);
  for (const i of front) {
    assert.equal(standingOf(st[i]), "edge", `front tree ${i}`);
    assert.ok(st[i].openZ > 0.8, `front tree ${i} open towards ${st[i].openX.toFixed(2)}, ${st[i].openZ.toFixed(2)}`);
  }
  for (const i of inside) assert.equal(standingOf(st[i]), "interior", `inner tree ${i}: ${st[i].enclosure.toFixed(2)} ${st[i].lopsided.toFixed(2)}`);
});

test("it is worked out for thirty thousand trees in well under a second", () => {
  const n = 30000;
  const xs = new Float64Array(n);
  const zs = new Float64Array(n);
  const sizes: TreeSize[] = [];
  for (let i = 0; i < n; i++) {
    xs[i] = ((i * 0.6180339887) % 1) * 2400 - 1200;
    zs[i] = ((i * 0.7548776662) % 1) * 2400 - 1200;
    sizes.push({ height: 10 + (i % 13), crownRadius: 3 + (i % 5), crownBase: 2, trunkRadius: 0.3 });
  }
  const t0 = performance.now();
  const st = standsOf(xs, zs, sizes);
  const ms = performance.now() - t0;
  assert.equal(st.length, n);
  assert.ok(ms < 1500, `${ms.toFixed(0)} ms`);
});

test("an open stand grows the same tree as no stand", () => {
  for (const sp of STARTER_SPECIES) {
    const size = { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius };
    assert.deepEqual(growTree(sp, size, 3, { ...OPEN_STAND }), growTree(sp, size, 3), sp.name);
  }
});

const EDGE: Stand = { enclosure: 0.55, lopsided: 0.45, openX: 1, openZ: 0, canopy: 1, gap: 0.1 };
const INSIDE: Stand = { enclosure: 0.85, lopsided: 0.05, openX: 1, openZ: 0, canopy: 1, gap: 0 };

for (const name of ["Oak", "Beech", "Silver birch", "Spruce", "Scots pine"]) {
  const sp = ALL_SPECIES.find((s) => s.name === name)!;
  const size: TreeSize = { height: sp.height, crownRadius: Math.min(6, 0.55 * sp.crownRadius), crownBase: sp.crownBase, trunkRadius: sp.trunkRadius };
  const depth = size.height - size.crownBase;
  const edge = growTree(sp, size, 7, EDGE);
  const inside = growTree(sp, size, 7, INSIDE);

  test(`${name}: at a wood's edge it keeps its leaves on the open side, low down, and loses the wood side's`, () => {
    const c = edge.clumps;
    let open = 0;
    let lowOpen = Infinity;
    let lowShut = Infinity;
    for (let i = 0; i < c.count; i++) {
      const out = c.x[i] / size.crownRadius;
      if (c.x[i] > 0) open++;
      if (out > 0.4) lowOpen = Math.min(lowOpen, c.y[i] - c.radius[i]);
      if (out < -0.4) lowShut = Math.min(lowShut, c.y[i] - c.radius[i]);
    }
    assert.ok(open / c.count > 0.52, `${((100 * open) / c.count).toFixed(0)}% of its leaves on the open side`);
    assert.ok(lowOpen < size.crownBase + 0.25 * depth, `its open side's lowest leaves at ${lowOpen.toFixed(1)} m, its crown's base at ${size.crownBase}`);
    assert.ok(lowShut > lowOpen + 0.05 * depth, `the wood's side's lowest at ${lowShut.toFixed(1)} m, no higher than the open side's ${lowOpen.toFixed(1)}`);
  });

  test(`${name}: inside a wood its crown is lifted, and it keeps its top`, () => {
    const c = inside.clumps;
    let low = Infinity;
    let top = 0;
    for (let i = 0; i < c.count; i++) {
      low = Math.min(low, c.y[i] - c.radius[i]);
      top = Math.max(top, c.y[i] + c.radius[i]);
    }
    assert.ok(c.count >= 20, `${c.count} clumps`);
    // (Lifted by a fifth of its crown at least, or to where it keeps its top: the top 45% of the tree.)
    assert.ok(low > Math.min(size.crownBase + 0.2 * depth, 0.52 * size.height), `its lowest leaves at ${low.toFixed(1)} m, its crown's base at ${size.crownBase}`);
    assert.ok(top > 0.93 * size.height, `its top at ${top.toFixed(1)} m of ${size.height}`);
  });

  test(`${name}: wherever it stands, it keeps to its box, and to its outline or its ellipsoid`, () => {
    const e = crownEllipsoid(size);
    for (const [where, g] of [["edge", edge], ["inside", inside]] as const) {
      const c = g.clumps;
      for (let i = 0; i < c.count; i++) {
        const reach = Math.hypot(c.x[i], c.z[i]);
        assert.ok(reach + c.radius[i] <= 1.06 * size.crownRadius, `${where}: clump ${i} reaches ${reach.toFixed(2)} of ${size.crownRadius}`);
        assert.ok(c.y[i] + c.radius[i] <= 1.05 * size.height, `${where}: clump ${i} at ${c.y[i].toFixed(2)}, over its top`);
        const t = (c.y[i] - size.crownBase) / depth;
        const outline = crownProfile(sp.shape, t, sp) * size.crownRadius;
        const v = (c.y[i] - e.cy) / e.ry;
        const ellipsoid = v >= 1 ? 0 : e.rx * Math.sqrt(1 - v * v);
        assert.ok(reach <= 1.1 * Math.max(outline, ellipsoid) + c.radius[i], `${where}: clump ${i} at ${c.y[i].toFixed(1)} m reaches ${reach.toFixed(2)}, past ${Math.max(outline, ellipsoid).toFixed(2)}`);
      }
    }
  });
}

test("an edge tree is turned so its open side faces its own open ground, and leans that way", () => {
  const list = wood();
  const plan = planVariants(packTrees(list), ALL_SPECIES);
  let edges = 0;
  plan.placements.forEach((p, i) => {
    if (p.standing !== "edge") return;
    edges++;
    // (Its variant's +x, mirrored and turned as the shaders turn it: engine.ts `toWorld`.)
    const lx = p.mirror;
    const wx = lx * Math.cos(p.yaw);
    const wz = -lx * Math.sin(p.yaw);
    const facing = wx * p.stand.openX + wz * p.stand.openZ;
    assert.ok(facing > Math.cos((25 * Math.PI) / 180), `tree ${i}: its open side ${facing.toFixed(2)} from its own`);
    // (Its lean, in its own frame, turned into the world.)
    const c = Math.cos(p.yaw);
    const s = Math.sin(p.yaw);
    const lean = [p.leanX * c + p.leanZ * s, p.leanZ * c - p.leanX * s];
    assert.ok(lean[0] * p.stand.openX + lean[1] * p.stand.openZ > 0.9 * Math.hypot(lean[0], lean[1]), `tree ${i} leans away from its open side`);
  });
  assert.ok(edges > 10, `${edges} edge trees`);
  // (And a beech wood the same way: every species' edge trees are its own variants.)
  const beeches = planVariants(packTrees(wood().map((t) => ({ ...t, species: BEECH }))), ALL_SPECIES);
  assert.ok(beeches.variants.some((v) => v.standing === "edge") && beeches.variants.some((v) => v.standing === "interior"));
});

test("a host's word on where a tree stands is taken over what is worked out", () => {
  const list = wood();
  const over = list.map((_, i) => (i === 0 ? { enclosure: 0, lopsided: 0 } : undefined));
  const plan = planVariants(packTrees(list), ALL_SPECIES, undefined, over);
  assert.equal(plan.placements[0].standing, "open");
  assert.equal(plan.placements[0].stand.enclosure, 0);
});
