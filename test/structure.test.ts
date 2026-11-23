// A grown tree's wood, held to what measured trees' wood is: its forks to Leonardo's rule, its great limbs
// to limbs and not noodles, and a pine's and a spruce's upper crown to the shape Rautiainen et al. measured.
//
//   node --test test/structure.test.ts     (prints each species' numbers, and some to compare by eye)

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree, scaffoldCount } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { type GrownTree } from "../src/tree.ts";

const SEEDS = [1, 2, 77];

function grow(sp: TreeSpecies, seed: number): GrownTree {
  return growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, seed);
}

function children(t: GrownTree): number[][] {
  const k = t.skeleton;
  const kids: number[][] = Array.from({ length: k.count }, () => []);
  for (let i = 0; i < k.count; i++) if (k.parent[i] >= 0) kids[k.parent[i]].push(i);
  return kids;
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}

/**
 * Leonardo's exponent at every fork (a node with two or more children): the Δ for which d^Δ = Σ dᵢ^Δ, d the
 * fork's diameter and dᵢ its children's (Eloy 2011: measured trees give 1.8 to 2.3).
 */
function leonardo(t: GrownTree): number[] {
  const k = t.skeleton;
  const out: number[] = [];
  children(t).forEach((kids, i) => {
    if (kids.length < 2) return;
    // 1 - Σ (dᵢ/d)^Δ rises with Δ: halved to where it is 0.
    const f = (D: number) => 1 - kids.reduce((s, c) => s + (k.radius[c] / k.radius[i]) ** D, 0);
    let lo = 0.5;
    let hi = 8;
    if (f(lo) >= 0 || f(hi) <= 0) return out.push(f(lo) >= 0 ? lo : hi);
    for (let n = 0; n < 40; n++) {
      const m = 0.5 * (lo + hi);
      if (f(m) < 0) lo = m;
      else hi = m;
    }
    out.push(0.5 * (lo + hi));
  });
  return out;
}

/** Each first-order limb (an order-1 axis off a stem): its length along the wood, its chord, and the angle it leaves at (degrees from vertical). */
function limbs(t: GrownTree): { path: number; chord: number; angle: number }[] {
  const k = t.skeleton;
  const kids = children(t);
  const out: { path: number; chord: number; angle: number }[] = [];
  for (let i = 0; i < k.count; i++) {
    const p = k.parent[i];
    if (p < 0 || k.order[i] !== 1 || k.order[p] !== 0) continue;
    let at = i;
    let path = Math.hypot(k.x[i] - k.x[p], k.y[i] - k.y[p], k.z[i] - k.z[p]);
    for (;;) {
      const next = kids[at].find((c) => k.order[c] === 1);
      if (next === undefined) break;
      path += Math.hypot(k.x[next] - k.x[at], k.y[next] - k.y[at], k.z[next] - k.z[at]);
      at = next;
    }
    const chord = Math.hypot(k.x[at] - k.x[p], k.y[at] - k.y[p], k.z[at] - k.z[p]);
    const dx = k.x[i] - k.x[p];
    const dy = k.y[i] - k.y[p];
    const dz = k.z[i] - k.z[p];
    out.push({ path, chord, angle: (Math.acos(dy / Math.hypot(dx, dy, dz)) * 180) / Math.PI });
  }
  return out;
}

/**
 * Rautiainen et al.'s (2008) shape exponent t of the crown above its widest: (R/Rmax)^t + (h/c)^t = 1, solved
 * at each point of the crown's profile there and averaged. The profile is the branch tips' reach in bands up
 * the crown, the furthest in each quarter round the trunk, the quarters averaged (they measured four lines).
 */
function shapeExponent(t: GrownTree): number {
  const k = t.skeleton;
  const kids = children(t);
  const tips: number[] = [];
  for (let i = 0; i < k.count; i++) if (kids[i].length === 0) tips.push(i);
  const bands = 20;
  const base = t.size.crownBase;
  const top = Math.max(...tips.map((i) => k.y[i]));
  const quarters = Array.from({ length: 4 }, () => new Array<number>(bands).fill(0));
  for (const i of tips) {
    const b = Math.min(bands - 1, Math.floor(((k.y[i] - base) / (top - base)) * bands));
    if (b < 0) continue;
    const q = Math.min(3, Math.floor(((Math.atan2(k.z[i], k.x[i]) + Math.PI) / (2 * Math.PI)) * 4));
    quarters[q][b] = Math.max(quarters[q][b], Math.hypot(k.x[i], k.z[i]));
  }
  const profile = Array.from({ length: bands }, (_, b) => quarters.reduce((s, q) => s + q[b], 0) / 4);
  let widest = 0;
  for (let b = 1; b < bands; b++) if (profile[b] > profile[widest]) widest = b;
  const at = (b: number) => base + ((b + 0.5) / bands) * (top - base);
  const c = top - at(widest);
  const ts: number[] = [];
  for (let b = widest + 1; b < bands; b++) {
    const r = profile[b] / profile[widest];
    const h = (at(b) - at(widest)) / c;
    if (!(r > 0 && r < 1 && h < 1)) continue;
    // r^t + h^t - 1 falls with t.
    let lo = 0.2;
    let hi = 10;
    for (let n = 0; n < 40; n++) {
      const m = 0.5 * (lo + hi);
      if (r ** m + h ** m > 1) lo = m;
      else hi = m;
    }
    ts.push(0.5 * (lo + hi));
  }
  return ts.reduce((s, x) => s + x, 0) / ts.length;
}

for (const sp of ALL_SPECIES) {
  const trees = SEEDS.map((seed) => grow(sp, seed));

  if (sp.architecture !== "palm") {
    test(`${sp.name}: its forks keep Leonardo's rule`, () => {
      const all = trees.flatMap(leonardo);
      const m = median(all);
      console.log(`leonardo ${sp.name}: median Δ ${m.toFixed(2)} over ${all.length} forks`);
      assert.ok(m >= 1.8 && m <= 2.3, `median Δ ${m.toFixed(2)}`);
    });
  }

  if (sp.architecture === "broadleaf") {
    test(`${sp.name}: its great limbs are limbs, not noodles`, () => {
      const scaffolds = scaffoldCount(sp);
      trees.forEach((t, n) => {
        const ls = limbs(t);
        const depth = t.size.height - t.size.crownBase;
        const tort = median(ls.filter((l) => l.chord > 1e-6).map((l) => l.path / l.chord));
        const long = ls.filter((l) => l.path > 0.6 * depth).length;
        console.log(`limbs ${sp.name}, seed ${SEEDS[n]}: ${ls.length} first-order, median tortuosity ${tort.toFixed(3)}, ${long} longer than 60% of the crown's depth (${scaffolds} scaffolds)`);
        assert.ok(tort <= 1.15, `median tortuosity ${tort.toFixed(3)}`);
        assert.ok(long <= scaffolds + 3, `${long} first-order limbs reach past 60% of the crown's depth`);
      });
    });
  }
}

// Rautiainen et al. (2008), table 3: t averaged 1.35 for Scots pine and 1.42 for Norway spruce (sd 0.24, 0.26).
for (const [name, mean] of [
  ["Scots pine", 1.35],
  ["Spruce", 1.42],
] as const) {
  const sp = ALL_SPECIES.find((s) => s.name === name);
  test(`${name}: its upper crown is the shape Rautiainen et al. measured`, { skip: !sp && "no such species" }, () => {
    if (!sp) return;
    const ts = SEEDS.map((seed) => shapeExponent(grow(sp, seed)));
    const t = ts.reduce((s, x) => s + x, 0) / ts.length;
    console.log(`shape ${name}: t ${t.toFixed(2)} (seeds ${ts.map((x) => x.toFixed(2)).join(", ")}), measured ${mean}`);
    assert.ok(Math.abs(t - mean) <= 0.5, `t ${t.toFixed(2)}`);
  });
}

// For eyes, not asserted: how steeply the first-order limbs leave.
test("first-order limb angles, to compare", () => {
  for (const name of ["Scots pine", "Spruce"]) {
    const sp = ALL_SPECIES.find((s) => s.name === name);
    if (!sp) continue;
    const angles = SEEDS.flatMap((seed) => limbs(grow(sp, seed)).map((l) => l.angle));
    const within = angles.filter((a) => a >= 40 && a <= 70).length / Math.max(1, angles.length);
    console.log(`angles ${name}: median ${median(angles).toFixed(0)}° from vertical, ${(within * 100).toFixed(0)}% within 40–70°, of ${angles.length}`);
  }
});
