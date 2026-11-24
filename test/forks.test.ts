// Trees whose trunk forks, and clumps of stems from one root plate: each tree decides from its own seed, a
// species' shares hold over many trees, a wood's trees fork less and higher, the wood at the fork keeps
// Leonardo's rule, a clump's stems at breast height are the trunk a survey measured, the stems share one
// crown rather than heaping two into a blob, and the crown still fills the space its numbers give.
//
//   node --test test/forks.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { breastHeight, forkHeight, forkShareOf, formOf, formsVary, growTree, stemShareOf, stemsAt, type TreeForm } from "../src/grow.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { type GrownTree, type TreeSize } from "../src/tree.ts";
import { DEFAULT_VARIANT_OPTIONS, packTrees, planVariants, type TreeInstance } from "../src/variants.ts";

const species = (name: string): TreeSpecies => {
  const sp = ALL_SPECIES.find((s) => s.name === name);
  assert.ok(sp, name);
  return sp;
};
const own = (sp: TreeSpecies): TreeSize => ({ height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius });

/** The species that fork or grow as clumps, and those that keep one stem (conifers with a leader among them). */
const VARIED = ALL_SPECIES.filter(formsVary);
const KEEP_ONE = ["Spruce", "Sitka spruce", "Douglas fir", "White spruce", "Corsican pine", "Monterey pine", "Eastern white pine", "Lombardy poplar"];

/** The first seeds from 1 whose form `want` says yes to. */
function seedsWhere(sp: TreeSpecies, want: (f: TreeForm) => boolean, count: number): number[] {
  const out: number[] = [];
  for (let s = 1; out.length < count && s < 5000; s++) if (want(formOf(sp, s))) out.push(s);
  return out;
}

/** The fork: the first node up the root's stem with two or more children of a fair size, and those children. */
function forkOf(t: GrownTree): { at: number; kids: number[] } | null {
  const k = t.skeleton;
  const kids: number[][] = Array.from({ length: k.count }, () => []);
  for (let i = 0; i < k.count; i++) if (k.parent[i] >= 0) kids[k.parent[i]].push(i);
  let at = 0;
  for (let guard = 0; guard < k.count; guard++) {
    const big = kids[at].filter((c) => k.radius[c] >= 0.4 * k.radius[at]);
    if (big.length >= 2) {
      // (A third or fourth stem leaves a little under the others: the trunk goes on to them.)
      for (let guard2 = 0; guard2 < 3; guard2++) {
        const on = big.find((c) => k.order[c] === 0 && k.y[c] - k.y[at] < 0.4 && kids[c].filter((q) => k.radius[q] >= 0.4 * k.radius[c]).length >= 2);
        if (on === undefined) break;
        big.splice(big.indexOf(on), 1, ...kids[on].filter((q) => k.radius[q] >= 0.4 * k.radius[on]));
        at = on;
      }
      return { at, kids: big };
    }
    const next = kids[at].find((c) => k.order[c] === 0);
    if (next === undefined) return null;
    at = next;
  }
  return null;
}

test("the species that fork or grow as clumps are the ones the notes give, and the leaders keep one stem", () => {
  const names = VARIED.map((s) => s.name).sort();
  for (const n of ["Oak", "Beech", "Silver birch", "Black alder", "Weeping willow", "Eucalyptus", "Monterey cypress", "Stone pine", "Scots pine", "Coast live oak", "California sycamore"]) assert.ok(names.includes(n), `${n} forks or grows as clumps`);
  for (const n of KEEP_ONE) {
    const sp = species(n);
    for (let s = 1; s <= 200; s++) assert.equal(formOf(sp, s).stems, 1, `${n}, seed ${s}`);
  }
});

for (const sp of VARIED) {
  test(`${sp.name}: over many seeds, its trees fork and grow as clumps in its shares, fewer in a closed wood`, () => {
    const n = 4000;
    const count = (enclosure: number) => {
      let forks = 0;
      let clumps = 0;
      let low = 0;
      const stand = { enclosure, lopsided: 0, openX: 1, openZ: 0, canopy: 1, gap: 0 };
      let at = 0;
      for (let s = 0; s < n; s++) {
        const f = formOf(sp, s * 7 + 3, enclosure > 0 ? stand : undefined);
        if (f.clump) clumps++;
        else if (f.stems > 1) {
          forks++;
          at += f.fork;
          if (f.fork < 0.35) low++;
        }
        assert.ok(f.stems >= 1 && f.stems <= 4);
      }
      return { forks: forks / n, clumps: clumps / n, at: forks > 0 ? at / forks : 1, low: low / n };
    };
    const open = count(0);
    const wood = count(1);
    console.log(`forms ${sp.name}: open ${(open.forks * 100).toFixed(1)}% forked (mean at ${open.at.toFixed(2)} of its crown base), ${(open.clumps * 100).toFixed(1)}% clumps; in a wood ${(wood.forks * 100).toFixed(1)}% forked (at ${wood.at.toFixed(2)}), ${(wood.clumps * 100).toFixed(1)}% clumps`);
    assert.ok(Math.abs(open.forks - forkShareOf(sp)) <= 0.03, `${(open.forks * 100).toFixed(1)}% forked, not ${forkShareOf(sp) * 100}%`);
    assert.ok(Math.abs(open.clumps - stemShareOf(sp)) <= 0.03, `${(open.clumps * 100).toFixed(1)}% clumps, not ${stemShareOf(sp) * 100}%`);
    // (In a closed wood: fewer of either, and the forks higher.)
    if (forkShareOf(sp) > 0 && forkShareOf(sp) < 1) assert.ok(wood.forks < 0.6 * open.forks, `in a wood ${(wood.forks * 100).toFixed(1)}% fork`);
    if (forkShareOf(sp) > 0) assert.ok(wood.at > open.at + 0.05 || open.at > 0.9, `in a wood they fork at ${wood.at.toFixed(2)}, in the open at ${open.at.toFixed(2)}`);
    if (stemShareOf(sp) > 0) assert.ok(wood.clumps < open.clumps, `in a wood ${(wood.clumps * 100).toFixed(1)}% clumps`);
    // (And the same seed gives the same form.)
    assert.deepEqual(formOf(sp, 12345), formOf(sp, 12345));
  });
}

for (const name of ["Oak", "Coast live oak", "Silver birch", "Black alder", "California sycamore", "Monterey cypress", "Eucalyptus", "Beech", "Weeping willow"]) {
  const sp = species(name);
  const size = own(sp);
  const bh = breastHeight(size);
  const seeds = seedsWhere(sp, (f) => f.stems > 1, 4);
  for (const seed of seeds) {
    const form = formOf(sp, seed);
    const tree = growTree(sp, size, seed);
    const label = `${name}, seed ${seed} (${form.stems} stems, ${form.clump ? "a clump" : `forked at ${forkHeight(sp, size, form).toFixed(2)} m`})`;

    test(`${label}: its trunk divides into its stems, by Leonardo's rule at the fork`, () => {
      const fork = forkOf(tree);
      assert.ok(fork, "it divides");
      const k = tree.skeleton;
      // (Its stems: what leaves the fork, and a third or fourth leaving just under it.)
      const stems = fork.kids.length;
      const area = fork.kids.reduce((sum, c) => sum + k.radius[c] ** 2, 0);
      assert.equal(stems, form.stems, `${stems} stems leave the trunk`);
      // (Each a stem, not a limb: a good share of the trunk.)
      for (const c of fork.kids) assert.ok(k.radius[c] >= 0.4 * k.radius[fork.at], `a stem ${k.radius[c].toFixed(3)} m off a trunk ${k.radius[fork.at].toFixed(3)} m`);
      // Leonardo: the stems' areas together about the trunk's where they part (Δ = 2, within a fifth).
      const share = area / k.radius[fork.at] ** 2;
      assert.ok(share >= 0.8 && share <= 1.25, `the stems' area is ${share.toFixed(2)} of the trunk's`);
    });

    if (forkHeight(sp, size, form) < bh) {
      test(`${label}: its stems' basal area at breast height is the trunk a survey measured`, () => {
        // (Its stems: the thickest wood there; a low crown's great limbs may leave under breast height too.)
        const at = stemsAt(tree, bh, 0.3).slice(0, form.stems);
        assert.equal(at.length, form.stems, `${at.length} stems at ${bh} m`);
        const r = Math.sqrt(at.reduce((s, c) => s + c.r * c.r, 0));
        assert.ok(Math.abs(r / size.trunkRadius - 1) <= 0.05, `their basal area is that of a trunk ${r.toFixed(3)} m round, not ${size.trunkRadius}`);
      });
    } else {
      test(`${label}: its trunk at breast height is the trunk a survey measured`, () => {
        const at = stemsAt(tree, bh);
        assert.equal(at.length, 1);
        assert.ok(Math.abs(at[0].r / size.trunkRadius - 1) <= 0.05, `${at[0].r.toFixed(3)} m, not ${size.trunkRadius}`);
      });
    }

    test(`${label}: its stems share one crown, each its own part of it, not a blob of overlapping crowns`, () => {
      const k = tree.skeleton;
      const c = tree.clumps;
      const fork = forkOf(tree);
      assert.ok(fork);
      // (Each clump to the stem it grows on: the trunk's child, at or under the fork, it is reached through.)
      const stemOf = new Int32Array(k.count).fill(-1);
      const starts: number[] = [];
      for (let i = 0; i < k.count; i++) {
        const p = k.parent[i];
        if (p < 0) continue;
        if (stemOf[p] >= 0) stemOf[i] = stemOf[p];
        else if (k.y[p] <= k.y[fork.at] + 1e-6 && k.radius[i] >= 0.4 * k.radius[p] && (k.order[i] > 0 || p === fork.at)) {
          stemOf[i] = starts.length;
          starts.push(i);
        }
      }
      const n = starts.length;
      assert.ok(n >= 2, `${n} stems`);
      const sx = new Float64Array(n);
      const sz = new Float64Array(n);
      const m = new Float64Array(n);
      for (let j = 0; j < c.count; j++) {
        const s = stemOf[c.node[j]];
        if (s < 0) continue;
        sx[s] += c.x[j];
        sz[s] += c.z[j];
        m[s]++;
      }
      const R = size.crownRadius;
      for (let s = 0; s < n; s++) {
        assert.ok(m[s] >= 0.1 * (c.count / n), `stem ${s} bears ${m[s]} of ${c.count} clumps`);
        sx[s] /= m[s];
        sz[s] /= m[s];
      }
      // Each stem's leaves are centred on its own side, apart from the others' ...
      for (let a = 0; a < n; a++)
        for (let b = a + 1; b < n; b++) {
          const d = Math.hypot(sx[a] - sx[b], sz[a] - sz[b]);
          assert.ok(d >= 0.25 * R, `stems ${a} and ${b}'s leaves centred ${d.toFixed(2)} m apart in a crown ${R} m round`);
        }
      // ... and few lie well over on another's side: past the line halfway between their middles.
      let over = 0;
      for (let j = 0; j < c.count; j++) {
        const s = stemOf[c.node[j]];
        if (s < 0) continue;
        for (let o = 0; o < n; o++) {
          if (o === s) continue;
          const ux = sx[s] - sx[o];
          const uz = sz[s] - sz[o];
          const l = Math.hypot(ux, uz);
          if (((c.x[j] - 0.5 * (sx[s] + sx[o])) * ux + (c.z[j] - 0.5 * (sz[s] + sz[o])) * uz) / l < -0.15 * R) {
            over++;
            break;
          }
        }
      }
      assert.ok(over <= 0.12 * c.count, `${over} of ${c.count} clumps lie well over on another stem's side`);
    });

    test(`${label}: it fills its crown's envelope as one tree of its size does`, () => {
      const c = tree.clumps;
      let reach = 0;
      let top = 0;
      let low = Infinity;
      for (let j = 0; j < c.count; j++) {
        reach = Math.max(reach, Math.hypot(c.x[j], c.z[j]) + c.radius[j]);
        top = Math.max(top, c.y[j] + c.radius[j]);
        low = Math.min(low, c.y[j] - c.radius[j]);
      }
      assert.ok(reach >= 0.9 * size.crownRadius && reach <= 1.04 * size.crownRadius, `it reaches ${reach.toFixed(2)} of ${size.crownRadius}`);
      assert.ok(top >= 0.95 * size.height && top <= 1.03 * size.height, `its top at ${top.toFixed(2)} of ${size.height}`);
      const depth = size.height - size.crownBase;
      assert.ok(Math.abs(low - size.crownBase) <= 0.15 * depth, `its lowest leaf at ${low.toFixed(2)}, its crown's base ${size.crownBase}`);
      // (And its wood keeps inside it: nothing out past its reach.)
      const k = tree.skeleton;
      for (let i = 0; i < k.count; i++) assert.ok(Math.hypot(k.x[i], k.z[i]) <= 1.05 * size.crownRadius, `wood at ${Math.hypot(k.x[i], k.z[i]).toFixed(2)} m out`);
    });
  }
}

test("a stand of a species whose trees differ in form is grown from variants of each form", () => {
  for (const name of ["Silver birch", "Coast live oak", "Oak", "Black alder"]) {
    const sp = species(name);
    const row = ALL_SPECIES.indexOf(sp);
    // (Twelve trees in the open, far enough apart to stand alone, a little different in size.)
    const list: TreeInstance[] = Array.from({ length: 12 }, (_, i) => ({ x: (i % 4) * 40, y: 0, z: Math.floor(i / 4) * 40, species: row, height: sp.height * (0.85 + 0.03 * i), crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }));
    const plan = planVariants(packTrees(list), ALL_SPECIES, DEFAULT_VARIANT_OPTIONS);
    const forms = plan.variants.map((v) => formOf(sp, v.seed));
    const one = forms.filter((f) => f.stems === 1).length;
    const more = forms.filter((f) => f.stems > 1).length;
    assert.ok(one >= 1 && more >= 1, `${name}: ${one} variants of one stem, ${more} forked or clumps`);
    // (And the trees on the ground are spread over them: some of each.)
    const many = plan.placements.filter((p) => forms[p.variant].stems > 1).length;
    assert.ok(many >= 1 && many <= 11, `${name}: ${many} of 12 trees forked or clumps`);
  }
});
