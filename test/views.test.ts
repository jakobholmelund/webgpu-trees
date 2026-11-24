// The gallery's views (lab/views.ts): each holds what it is for, for every species at its own size.
//
//   pnpm test

import assert from "node:assert/strict";
import { test } from "node:test";
import { ALL_SPECIES } from "../src/index.ts";
import { GROUP, REFERENCE_SCREEN, type Standing, VIEW_NAMES, detailScale, groupSpacing, oneToOneFov, project, shotFor, treePoints } from "../lab/views.ts";

const ASPECT = 0.8;
const LINES = 500;
const one = (i: number): Standing => {
  const s = ALL_SPECIES[i];
  return { x: 0, z: 0, height: s.height, crownRadius: s.crownRadius, crownBase: s.crownBase, trunkRadius: s.trunkRadius };
};
const group = (t: Standing): Standing[] => GROUP.map(([x, z]) => ({ ...t, x: x * groupSpacing(t.crownRadius), z: z * groupSpacing(t.crownRadius) }));
const inside = (q: { x: number; y: number; front: boolean }) => q.front && Math.abs(q.x) <= 1.0001 && Math.abs(q.y) <= 1.0001;

test("the tee, fairway and far views hold the whole of every tree, centred", () => {
  for (let i = 0; i < ALL_SPECIES.length; i++) {
    const t = one(i);
    for (const view of ["tee", "fairway", "far"] as const) {
      const trees = view === "far" ? group(t) : [t];
      const shot = shotFor({ view, trees, forkY: t.crownBase, aspect: ASPECT, cellLines: LINES });
      const qs = trees.flatMap(treePoints).map((p) => project(shot, ASPECT, p));
      for (const q of qs) assert.ok(inside(q), `${ALL_SPECIES[i].name}, ${view}: a point at ${q.x.toFixed(2)}, ${q.y.toFixed(2)}`);
      // (Centred: as much room above as below.)
      const ys = qs.map((q) => q.y);
      assert.ok(Math.abs(Math.max(...ys) + Math.min(...ys)) < 0.02, `${ALL_SPECIES[i].name}, ${view}: not centred up and down`);
      assert.ok(shot.fov >= oneToOneFov(LINES) - 1e-9, `${ALL_SPECIES[i].name}, ${view}: enlarged beyond the screen's pixels`);
      assert.equal(shot.eye[1], 1.6);
    }
  }
});

test("the tee view stands 2.5 crown widths off, or further when the tree would not fit the screen", () => {
  for (let i = 0; i < ALL_SPECIES.length; i++) {
    const t = one(i);
    const shot = shotFor({ view: "tee", trees: [t], forkY: t.crownBase, aspect: ASPECT, cellLines: LINES });
    assert.ok(shot.eye[2] >= t.crownRadius * 5 - 1e-6, ALL_SPECIES[i].name);
    assert.ok(shot.fov <= REFERENCE_SCREEN.fov + 1e-6, ALL_SPECIES[i].name);
  }
});

test("the trunk view holds the foot of the trunk and the ground before it", () => {
  for (let i = 0; i < ALL_SPECIES.length; i++) {
    const t = one(i);
    const shot = shotFor({ view: "trunk", trees: [t], forkY: t.crownBase, aspect: ASPECT, cellLines: LINES });
    for (const p of [[0, 0, 0], [0, 0, t.trunkRadius * 2], [t.trunkRadius, 0.1, 0]] as [number, number, number][]) {
      assert.ok(inside(project(shot, ASPECT, p)), `${ALL_SPECIES[i].name}: the foot is out of the picture`);
    }
    assert.ok(shot.fov <= 40.01);
  }
});

test("the view under the crown looks up into it from under it, or from its edge", () => {
  for (let i = 0; i < ALL_SPECIES.length; i++) {
    const t = one(i);
    const shot = shotFor({ view: "under", trees: [t], forkY: t.crownBase, aspect: ASPECT, cellLines: LINES });
    // (Under it where its crown is off the ground; crouched at its edge where it comes down to the ground.)
    const out = Math.hypot(shot.eye[0], shot.eye[2]);
    if (t.crownBase >= 0.5) assert.ok(out < t.crownRadius, `${ALL_SPECIES[i].name}: not under its crown`);
    else assert.ok(out > t.crownRadius && shot.eye[1] < 0.5, `${ALL_SPECIES[i].name}: not at its edge`);
    assert.ok(shot.target[1] > shot.eye[1], ALL_SPECIES[i].name);
  }
});

test("a cell's tiers are the screen's: one to one at the screen's own scale", () => {
  assert.ok(Math.abs(detailScale(LINES, oneToOneFov(LINES)) - 1) < 1e-9);
  assert.ok(Math.abs(detailScale(REFERENCE_SCREEN.lines, REFERENCE_SCREEN.fov) - 1) < 1e-9);
  assert.ok(detailScale(LINES, REFERENCE_SCREEN.fov) < 1);
  assert.deepEqual([...VIEW_NAMES], ["tee", "fairway", "far", "under", "trunk"]);
});
