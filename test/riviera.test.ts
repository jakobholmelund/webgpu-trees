// Riviera's trees as the game draws them (2026-11-25): the owner found five misshapen ones from a low eye. A Monterey
// cypress's pads drawn apart up its crown on bare spikes, the top of its crown floating; a blue gum's crown a thin lid,
// another's a mop on a pole with loops of limb in it; a sycamore's ball on two poles; a stone pine fitted 20 m tall on a
// crown from 3 m a tower of stacked cushions. Most of it was the fit: every tree is a variant stretched to its own size,
// and sorted into two shapes, Riviera's trees were stretched up to six times as far up as across (variants.ts
// `FIT_STRETCH`). The rest was growing: a stone pine's crown deep for its width (grow.ts `umbrellaCap`), a crown of
// bunches drawn narrow (`CLUMP_BUNCHED`, `CLUSTER_NARROW`), a shallow crown's clumps as deep as it (`CLUMP_OF_DEPTH`),
// and stems shed or bare in a narrow crown.
//
// These hold it, over trees spread as Riviera's are (each number from its own spread: lab/courseSizes.ts) and at its
// corners, each tree fitted from its variant as the shaders fit it (`fitPoint`).
//
//   node --test test/riviera.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { cornersOf, COURSES, fitSizesFor } from "../lab/courseSizes.ts";
import { LINE_STRIDE, TIER_SHAPES, woodLines } from "../src/geometry.ts";
import { growTree, umbrellaCap } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { type GrownTree, type TreeSize } from "../src/tree.ts";
import { DEFAULT_VARIANT_OPTIONS, FIT_STRETCH, fitPoint, packTrees, planVariants, type TreeInstance } from "../src/variants.ts";

const RIVIERA = COURSES.find((c) => c.id === "c01")!;
const NAMES = ["Eucalyptus", "California sycamore", "Coast live oak", "Stone pine", "Monterey cypress"];
const species = (name: string): TreeSpecies => ALL_SPECIES.find((s) => s.name === name)!;

/** A number from 0 to 1 from an integer and a salt: the same every time. */
function u01(n: number, salt: number): number {
  let h = (Math.imul(n | 0, 0x9e3779b1) ^ Math.imul(salt | 0, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Between p10 and p90 of a spread, on a log scale, and now and then out to p10's half and p90's half again. */
function spreadDraw(s: [number, number, number], u: number): number {
  const lo = Math.log(s[0]);
  const hi = Math.log(s[2]);
  return Math.exp(lo + (hi - lo) * (-0.15 + 1.3 * u));
}

/** A species' trees on Riviera as a survey hands them over: each number drawn from its own spread, apart. */
function survey(name: string, n: number): TreeSize[] {
  const row = RIVIERA.by[name];
  const out: TreeSize[] = [];
  for (let i = 0; i < n; i++) {
    const height = spreadDraw(row.h, u01(i, 1));
    const crownRadius = spreadDraw(row.r, u01(i, 2));
    const crownBase = Math.min(spreadDraw(row.base, u01(i, 3)), 0.9 * height);
    out.push({ height, crownRadius, crownBase, trunkRadius: 0.025 * height });
  }
  for (const c of cornersOf(row)) out.push({ height: c.height, crownRadius: c.crownRadius, crownBase: c.crownBase, trunkRadius: 0.025 * c.height });
  return out;
}

/** A species' survey planned as the game plans it (alone in the open, far apart), its variants grown. */
function planned(name: string, n = 90) {
  const sp = species(name);
  const sizes = survey(name, n);
  const list: TreeInstance[] = sizes.map((z, i) => ({ x: (i % 20) * 60, y: 0, z: Math.floor(i / 20) * 60, species: 0, ...z }));
  const plan = planVariants(packTrees(list), [sp], { ...DEFAULT_VARIANT_OPTIONS, stands: false });
  const grown = plan.variants.map((v) => growTree(sp, v.size, v.seed));
  return { sp, sizes, plan, grown };
}

/** How far one way more than the other a tree's crown is stretched from its variant's: its depth beside its width. */
function aspectStretch(grown: TreeSize, size: TreeSize): number {
  const across = size.crownRadius / grown.crownRadius;
  const up = (size.height - size.crownBase) / Math.max(0.01, grown.height - grown.crownBase);
  return Math.max(up / across, across / up);
}

/** A grown tree fitted to a size (`fitPoint`), its drawn wood's centre lines and its clumps as the shaders draw them. */
function fitted(g: GrownTree, size: TreeSize) {
  const f = (x: number, y: number, z: number) => fitPoint(g.size, size, 1, [x, y, z]);
  const across = size.crownRadius / g.size.crownRadius;
  const up = (size.height - size.crownBase) / Math.max(0.01, g.size.height - g.size.crownBase);
  // (A clump keeps its size as the mean of the stretches: engine.ts `fitOf`.)
  const dab = 0.5 * (across + up);
  const sk = g.skeleton;
  const { line, main } = woodLines(g, TIER_SHAPES[0]);
  const lines: (number[][] | null)[] = line.map((l) => {
    if (!l) return null;
    const pts: number[][] = [];
    for (let o = 0; o < l.length; o += LINE_STRIDE) pts.push([...f(l[o], l[o + 1], l[o + 2]), l[o + 6]]);
    return pts;
  });
  const clumps = Array.from({ length: g.clumps.count }, (_, k) => [...f(g.clumps.x[k], g.clumps.y[k], g.clumps.z[k]), g.clumps.radius[k] * dab]);
  const tips: number[][] = [];
  const kids = new Uint8Array(sk.count);
  for (let i = 0; i < sk.count; i++) if (sk.parent[i] >= 0) kids[sk.parent[i]] = 1;
  for (let i = 0; i < sk.count; i++) if (!kids[i] && sk.parent[i] >= 0) tips.push(f(sk.x[i], sk.y[i], sk.z[i]));
  return { sk, main, lines, clumps, tips };
}

/** How far a point is from the drawn wood (its centre lines' pieces), through a grid of them. */
function woodDistance(lines: (number[][] | null)[]): (p: number[]) => number {
  const cell = 0.6;
  const grid = new Map<string, number[][]>();
  for (const l of lines) {
    if (!l) continue;
    for (let k = 0; k + 1 < l.length; k++) {
      const a = l[k];
      const b = l[k + 1];
      const lo = [0, 1, 2].map((q) => Math.floor(Math.min(a[q], b[q]) / cell));
      const hi = [0, 1, 2].map((q) => Math.floor(Math.max(a[q], b[q]) / cell));
      for (let x = lo[0]; x <= hi[0]; x++)
        for (let y = lo[1]; y <= hi[1]; y++)
          for (let z = lo[2]; z <= hi[2]; z++) {
            const key = `${x},${y},${z}`;
            const list = grid.get(key);
            if (list) list.push([...a, ...b]);
            else grid.set(key, [[...a, ...b]]);
          }
    }
  }
  return (p) => {
    let best = Infinity;
    const c = p.map((v) => Math.floor(v / cell));
    for (let ring = 0; ring < 40; ring++) {
      for (let a = -ring; a <= ring; a++)
        for (let b = -ring; b <= ring; b++)
          for (let d = -ring; d <= ring; d++) {
            if (Math.max(Math.abs(a), Math.abs(b), Math.abs(d)) !== ring) continue;
            for (const s of grid.get(`${c[0] + a},${c[1] + b},${c[2] + d}`) ?? []) {
              const dx = s[4] - s[0];
              const dy = s[5] - s[1];
              const dz = s[6] - s[2];
              const l2 = dx * dx + dy * dy + dz * dz;
              const t = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy + (p[2] - s[2]) * dz) / l2)) : 0;
              best = Math.min(best, Math.hypot(p[0] - s[0] - dx * t, p[1] - s[1] - dy * t, p[2] - s[2] - dz * t));
            }
          }
      if (best <= ring * cell) return best;
    }
    return best;
  };
}

/** Limbs (wood LOOP_THICK and more) that rise and turn back down on themselves: more than LOOP_TURN, coming down by a fifth of their length. */
const LOOP_THICK = 0.015;
const LOOP_TURN = 150;
function loops(F: ReturnType<typeof fitted>): number {
  const { sk, main, lines } = F;
  let n = 0;
  for (let s = 0; s < sk.count; s++) {
    const p = sk.parent[s];
    if (p < 0 || main[p] === s || sk.radius[s] < LOOP_THICK) continue;
    const pts: number[][] = [];
    for (let i = s; i >= 0; i = main[i]) {
      const l = lines[i];
      if (!l || sk.radius[i] < LOOP_THICK) break;
      pts.push(...l);
    }
    if (pts.length < 4) continue;
    const d: number[][] = [];
    let len = 0;
    for (let k = 1; k < pts.length; k++) {
      const a = [0, 1, 2].map((q) => pts[k][q] - pts[k - 1][q]);
      const m = Math.hypot(a[0], a[1], a[2]);
      len += m;
      d.push(m > 1e-6 ? a.map((x) => x / m) : [0, 1, 0]);
    }
    let peak = 0;
    for (let k = 0; k < pts.length; k++) if (pts[k][1] > pts[peak][1]) peak = k;
    let turn = 0;
    let low = pts[peak][1];
    for (let a = 0; a < Math.min(peak, d.length); a++)
      for (let b = peak; b < d.length; b++) {
        turn = Math.max(turn, (Math.acos(Math.max(-1, Math.min(1, d[a][0] * d[b][0] + d[a][1] * d[b][1] + d[a][2] * d[b][2]))) * 180) / Math.PI);
        low = Math.min(low, pts[b + 1][1]);
      }
    if (turn > LOOP_TURN && (pts[peak][1] - low) / len > 0.2) n++;
  }
  return n;
}

/** The placements to look at closely: each variant's trees stretched furthest each way. */
function extremes(plan: ReturnType<typeof planned>["plan"]): number[] {
  const out = new Set<number>();
  plan.variants.forEach((v, j) => {
    let most = -1;
    let least = -1;
    plan.placements.forEach((p, i) => {
      if (p.variant !== j) return;
      const r = (p.size.height - p.size.crownBase) / p.size.crownRadius;
      if (most < 0 || r > (plan.placements[most].size.height - plan.placements[most].size.crownBase) / plan.placements[most].size.crownRadius) most = i;
      if (least < 0 || r < (plan.placements[least].size.height - plan.placements[least].size.crownBase) / plan.placements[least].size.crownRadius) least = i;
    });
    if (most >= 0) out.add(most);
    if (least >= 0) out.add(least);
  });
  return [...out].sort((a, b) => a - b);
}

const PLANS = new Map<string, ReturnType<typeof planned>>();
const planOf = (name: string) => {
  let p = PLANS.get(name);
  if (!p) PLANS.set(name, (p = planned(name)));
  return p;
};

for (const name of NAMES) {
  test(`${name}: every tree spread as Riviera's is fitted from a variant of nearly its own shape, at most FIT_STRETCH deeper or shallower for its width`, () => {
    const { plan, grown } = planOf(name);
    let worst = 1;
    plan.placements.forEach((p) => (worst = Math.max(worst, aspectStretch(grown[p.variant].size, p.size))));
    console.log(`${name}: ${plan.variants.length} variants for ${plan.placements.length} trees, stretched at most ${worst.toFixed(2)} one way beside the other (51ee946: 6.9 to 9.6 here)`);
    // (As many shapes as its spread needs, up to MOST_SHAPES: beyond them, as near as they come.)
    assert.ok(worst <= 1.45, `a tree's crown stretched ${worst.toFixed(2)} times one way beside the other`);
    // (With room for as many shapes as it needs, never more than FIT_STRETCH.)
    const sizes = survey(name, 90);
    const list: TreeInstance[] = sizes.map((z, i) => ({ x: (i % 20) * 60, y: 0, z: Math.floor(i / 20) * 60, species: 0, ...z }));
    const free = planVariants(packTrees(list), [species(name)], { ...DEFAULT_VARIANT_OPTIONS, stands: false, mostShapes: 100 });
    let most = 1;
    free.placements.forEach((p) => (most = Math.max(most, aspectStretch(free.variants[p.variant].size, p.size))));
    assert.ok(most <= FIT_STRETCH + 1e-6, `with shapes enough, a tree's crown stretched ${most.toFixed(2)} times one way beside the other`);
  });

  test(`${name}: fitted, every clump is within reach of drawn wood, no bare twig ends above its leaves, no limb loops back on itself`, () => {
    const { plan, grown } = planOf(name);
    let far = 0;
    let all = 0;
    let bare = 0;
    let looped = 0;
    for (const i of extremes(plan)) {
      const p = plan.placements[i];
      const F = fitted(grown[p.variant], p.size);
      const near = woodDistance(F.lines);
      for (const c of F.clumps) {
        all++;
        // (A clump is its leaves' spray over the wood it hangs on: that wood is inside it, within 0.9 of its radius
        // as grown (grow.ts `finish`), stretched at most FIT_STRETCH one way beside its size's mean of the two.)
        if (near(c) > 1.1 * c[3]) far++;
      }
      // (A twig ends in its leaves, or under them: never a bare spike over the crown.)
      for (const t of F.tips) {
        const inside = F.clumps.some((c) => Math.hypot(t[0] - c[0], t[1] - c[1], t[2] - c[2]) <= c[3]);
        const under = F.clumps.some((c) => Math.hypot(t[0] - c[0], t[2] - c[2]) <= 1.5 * c[3] && c[1] + c[3] >= t[1]);
        if (!inside && !under) bare++;
      }
      looped += loops(F);
    }
    console.log(`${name}: ${far} of ${all} clumps out of reach of the wood, ${bare} bare twig ends over the leaves, ${looped} limbs looped`);
    assert.equal(far, 0, `${far} clumps hang in the air`);
    assert.equal(bare, 0, `${bare} twig ends stand bare over the leaves`);
    assert.equal(looped, 0, `${looped} limbs loop back on themselves`);
  });

  test(`${name}: at Riviera's sizes and corners, a crown is leaves in layers, not one sheet, and never empty`, () => {
    const sp = species(name);
    for (const f of fitSizesFor(sp).filter((x) => x.key.startsWith("c01"))) {
      for (const seed of [1, 2, 3]) {
        const g = growTree(sp, { height: f.height, crownRadius: f.crownRadius, crownBase: f.crownBase, trunkRadius: 0.025 * f.height }, seed);
        const c = g.clumps;
        assert.ok(c.count >= 12, `${f.key}, seed ${seed}: ${c.count} clumps`);
        let lo = Infinity;
        let hi = -Infinity;
        let r = 0;
        for (let k = 0; k < c.count; k++) {
          lo = Math.min(lo, c.y[k] - c.radius[k]);
          hi = Math.max(hi, c.y[k] + c.radius[k]);
          r += c.radius[k] / c.count;
        }
        // (Its leaves several clumps deep. A flat-topped kind's, an umbrella's or a shelf's (`crownRound` over 3), may be
        // a shallow canopy of its cushions or pads two deep: that is its habit.)
        const layers = (hi - lo) / (2 * r);
        assert.ok(layers >= ((sp.crownRound ?? 0) > 3 ? 1.8 : 2.5), `${f.key} (${f.height}/${f.crownRadius}/${f.crownBase}), seed ${seed}: its leaves ${layers.toFixed(1)} clumps deep`);
      }
    }
  });
}

test("a stone pine deep for its width keeps its crown to its top, on a clean stem: no tiers of cushions up a column", () => {
  const sp = species("Stone pine");
  for (const f of fitSizesFor(sp).filter((x) => x.key.startsWith("c01"))) {
    const size = { height: f.height, crownRadius: f.crownRadius, crownBase: f.crownBase, trunkRadius: 0.025 * f.height };
    const cap = umbrellaCap(sp, size);
    for (const seed of [1, 2]) {
      const g = growTree(sp, size, seed);
      // (It keeps the size it was asked for: the fit stretches it from there.)
      assert.deepEqual(g.size, size);
      let lo = Infinity;
      for (let k = 0; k < g.clumps.count; k++) lo = Math.min(lo, g.clumps.y[k] - g.clumps.radius[k]);
      const depth = size.height - Math.max(cap.crownBase, size.crownBase);
      assert.ok(lo >= cap.crownBase - 0.15 * depth, `${f.key}: leaves from ${lo.toFixed(1)} m, its crown kept from ${cap.crownBase.toFixed(1)} m`);
    }
    // (No deeper than one and a half of its radius, or three tenths of its height: a forest-grown one's.)
    assert.ok(size.height - cap.crownBase <= Math.max(1.5 * size.crownRadius, 0.3 * size.height) + 1e-9);
  }
  // (Open-grown and as wide as it is deep, as its specimen and the courses' typical ones are, it keeps its size.)
  const own = { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius };
  assert.deepEqual(umbrellaCap(sp, own), own);
  // (Other kinds keep theirs whatever their depth.)
  const deep = { height: 22, crownRadius: 3, crownBase: 3, trunkRadius: 0.5 };
  for (const name of ["Eucalyptus", "California sycamore", "Coast live oak", "Monterey cypress"]) assert.deepEqual(umbrellaCap(species(name), deep), deep);
});

test("a stone pine with a short crown on a tall stem grows its leaves (its V-forks' arms within its crown)", () => {
  const sp = species("Stone pine");
  for (const h of [8, 12, 16, 22, 28])
    for (const rr of [0.25, 0.35, 0.45, 0.6])
      for (const dd of [0.2, 0.3, 0.45])
        for (const seed of [1, 2, 3])
          for (const trunk of [1 / 110, 0.03]) {
            const depth = dd * h;
            const g = growTree(sp, { height: h, crownRadius: rr * depth, crownBase: h - depth, trunkRadius: trunk * h }, seed);
            assert.ok(g.clumps.count >= 10, `${h}/${(rr * depth).toFixed(2)}/${(h - depth).toFixed(2)}, seed ${seed}: ${g.clumps.count} clumps`);
          }
});

test("a narrow crown is one stem's, and a forked tree keeps its stems' limbs that leave them low and rise into its crown", () => {
  // (A blue gum's clump of two stems, 24 m tall under a crown 1 m round, bore one clump of leaves; a Monterey cypress
  // forked low, its limbs leaving its stems under its crown's base, was a bare stump.)
  const gum = growTree(species("Eucalyptus"), { height: 24.205459618330572, crownRadius: 1, crownBase: 15.778703876609576, trunkRadius: 0.5959489473927456 }, 1309862022);
  assert.ok(gum.clumps.count >= 50, `${gum.clumps.count} clumps`);
  const cypress = growTree(species("Monterey cypress"), { height: 11.413391420151388, crownRadius: 3.505557403301516, crownBase: 6.245368781616021, trunkRadius: 0.34240174260454165 }, 1015235628);
  assert.ok(cypress.clumps.count >= 12, `${cypress.clumps.count} clumps`);
});
