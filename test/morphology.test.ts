// Each species grown true to its kind, held to the numbers docs/MORPHOLOGY.md gives for it. Where a number
// there is read from a source ([S:KEY]) the test says which, and holds the grower to it within what a
// measurement of a grown tree can tell; where it is an estimate ([est.]) or a field appearance ([obs.]) the
// test says so, and gives it a wider margin: a soft wall, to be tightened when a source is found.
//
//   node --test test/morphology.test.ts     (prints each species' numbers)

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { SHEET_ACROSS, SHEET_ALONG, sheetPieces } from "../src/geometry.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { type GrownTree, type TreeSize } from "../src/tree.ts";

const SEEDS = [1, 2, 77];
const DEG = 180 / Math.PI;

const species = (name: string): TreeSpecies => {
  const s = ALL_SPECIES.find((x) => x.name === name);
  if (!s) throw new Error(`no species ${name}`);
  return s;
};
const ownSize = (sp: TreeSpecies): TreeSize => ({ height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius });
const grown = new Map<string, GrownTree[]>();
/** A species grown at its own size, from each seed (kept: several tests read the same trees). */
function trees(sp: TreeSpecies): GrownTree[] {
  let t = grown.get(sp.name);
  if (!t) grown.set(sp.name, (t = SEEDS.map((seed) => growTree(sp, ownSize(sp), seed))));
  return t;
}
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};
function children(t: GrownTree): number[][] {
  const k = t.skeleton;
  const kids: number[][] = Array.from({ length: k.count }, () => []);
  for (let i = 0; i < k.count; i++) if (k.parent[i] >= 0) kids[k.parent[i]].push(i);
  return kids;
}

interface Limb {
  /** Where it leaves the stem (m up). */
  from: number;
  /** The angle it leaves at, from upright (degrees): over its first stretch, a share of the crown's radius. */
  angle: number;
  /** Its nodes, from the stem's node out. */
  nodes: number[];
}

/** Every first-order limb (a broadleaf's scaffold, a conifer's bough): an order-1 axis off a stem, followed out along its own axis. */
function limbs(t: GrownTree): Limb[] {
  const k = t.skeleton;
  const kids = children(t);
  const out: Limb[] = [];
  const stretch = 0.12 * t.size.crownRadius;
  for (let i = 0; i < k.count; i++) {
    const p = k.parent[i];
    if (p < 0 || k.order[i] !== 1 || k.order[p] !== 0) continue;
    // (Dead stubs on a bole are not limbs.)
    if (k.y[i] < t.size.crownBase - 0.5 && kids[i].length <= 1 && k.radius[i] < 0.3 * k.radius[p]) continue;
    const nodes = [p, i];
    let at = i;
    for (;;) {
      const next = kids[at].find((c) => k.order[c] === 1);
      if (next === undefined) break;
      nodes.push(next);
      at = next;
    }
    // (Its way over its first stretch: from the stem to the first node that far out.)
    let to = nodes[nodes.length - 1];
    for (const n of nodes.slice(1)) {
      if (Math.hypot(k.x[n] - k.x[p], k.y[n] - k.y[p], k.z[n] - k.z[p]) >= stretch) {
        to = n;
        break;
      }
    }
    const dx = k.x[to] - k.x[p];
    const dy = k.y[to] - k.y[p];
    const dz = k.z[to] - k.z[p];
    out.push({ from: k.y[p], angle: Math.acos(dy / Math.max(1e-9, Math.hypot(dx, dy, dz))) * DEG, nodes });
  }
  return out;
}

/** The first stem's own axis, foot to top. */
function stem(t: GrownTree): number[] {
  const k = t.skeleton;
  const kids = children(t);
  const out = [0];
  for (;;) {
    const next = kids[out[out.length - 1]].find((c) => k.order[c] === 0);
    if (next === undefined) return out;
    out.push(next);
  }
}

// ---------------------------------------------------------------------------------------------------------
// The leader: excurrent species keep one straight stem to the top; decurrent ones lose it in the crown.

for (const [name, source] of [
  ["White spruce", "S:FEIS, excurrent with a straight trunk"],
  ["Sitka spruce", "S:GDB/EUAT/FEIS, strongly excurrent, straight trunk"],
  ["Corsican pine", "S:GDB, a very straight, single round trunk; its old crown flattens [S:EUAT], so to 85%"],
  ["Spruce", "S:EUAT, regularly conic; excurrent for life [est.]"],
  ["Douglas fir", "excurrent [est.]"],
] as const) {
  test(`${name}: its leader goes on to its top, straight (${source})`, () => {
    for (const t of trees(species(name))) {
      const k = t.skeleton;
      const s = stem(t);
      const top = s[s.length - 1];
      let path = 0;
      for (let j = 1; j < s.length; j++) path += Math.hypot(k.x[s[j]] - k.x[s[j - 1]], k.y[s[j]] - k.y[s[j - 1]], k.z[s[j]] - k.z[s[j - 1]]);
      const chord = Math.hypot(k.x[top], k.y[top], k.z[top]);
      console.log(`leader ${name}: to ${(k.y[top] / t.size.height).toFixed(2)} of its height, path over chord ${(path / chord).toFixed(3)}`);
      assert.ok(k.y[top] >= (name === "Corsican pine" ? 0.85 : 0.9) * t.size.height, `its leader stops at ${k.y[top].toFixed(1)} m of ${t.size.height}`);
      assert.ok(path / chord <= 1.03, `its leader wanders: path over chord ${(path / chord).toFixed(3)}`);
    }
  });
}

for (const [name, source] of [
  ["Stone pine", "S:EUAT/GDB, decurrent from an early age"],
  ["Coast live oak", "S:FEIS, a short trunk under spreading primary branches"],
  ["Oak", "open-grown: the leader lost at 4–10 m [est.]"],
] as const) {
  test(`${name}: no one stem leads to its top; its crown is several limbs (${source})`, () => {
    for (const t of trees(species(name))) {
      const limbsLong = limbs(t).filter((l) => l.nodes.length > 2);
      const k = t.skeleton;
      // (The great limbs reach as high as the stem's own axis does, or higher: none of them is its side branch.)
      const s = stem(t);
      const stemTop = k.y[s[s.length - 1]];
      const limbTops = limbsLong.map((l) => Math.max(...l.nodes.map((n) => k.y[n])));
      const rivals = limbTops.filter((y) => y >= stemTop - 0.15 * (t.size.height - t.size.crownBase)).length;
      console.log(`decurrent ${name}: stem to ${(stemTop / t.size.height).toFixed(2)} of its height, ${rivals} limbs reach as high`);
      // (Its stem stops well short of its top, or limbs rise as high as it: either way, it leads no crown.)
      assert.ok(stemTop <= 0.8 * t.size.height || rivals >= 2, `its stem reaches ${(stemTop / t.size.height).toFixed(2)} of its height, and ${rivals} limbs as high`);
    }
  });
}

// ---------------------------------------------------------------------------------------------------------
// The angles first-order limbs leave at.

/** Sourced angles (degrees from upright), with the margin a grown tree's measurement allows. */
const SOURCED_ANGLES: [string, number, number, string][] = [
  ["Weeping willow", 40, 45, "S:TSO, main branches rise at 45–50° above level"],
  ["Stone pine", 30, 60, "S:GDB, long branches rise at 30–60° above level"],
];
for (const [name, lo, hi, source] of SOURCED_ANGLES) {
  test(`${name}: its great limbs leave at ${lo}–${hi}° from upright (${source})`, () => {
    const angles = trees(species(name)).flatMap((t) => limbs(t).map((l) => l.angle));
    const m = median(angles);
    console.log(`angle ${name}: median ${m.toFixed(0)}° of ${angles.length} limbs, sourced ${lo}–${hi}°`);
    assert.ok(m >= lo - 8 && m <= hi + 8, `median ${m.toFixed(0)}°`);
  });
}

test("Eastern white pine: its mid and lower boughs stand out at right angles, its upper ones rise (S:NRCAN)", () => {
  const low: number[] = [];
  const up: number[] = [];
  for (const t of trees(species("Eastern white pine"))) {
    const d = t.size.height - t.size.crownBase;
    for (const l of limbs(t)) ((l.from - t.size.crownBase) / d < 0.6 ? low : up).push(l.angle);
  }
  console.log(`angle Eastern white pine: lower and mid boughs ${median(low).toFixed(0)}°, upper ${median(up).toFixed(0)}°`);
  assert.ok(median(low) >= 78 && median(low) <= 102, `lower and mid boughs leave at ${median(low).toFixed(0)}°`);
  assert.ok(median(up) <= median(low) - 10, "its upper boughs rise more steeply than its lower");
});

test("Spruce: its upper boughs ascend and its lower droop (S:EUAT)", () => {
  const low: number[] = [];
  const up: number[] = [];
  for (const t of trees(species("Spruce"))) {
    const d = t.size.height - t.size.crownBase;
    for (const l of limbs(t)) {
      const f = (l.from - t.size.crownBase) / d;
      if (f < 0.33) low.push(l.angle);
      else if (f > 0.67) up.push(l.angle);
    }
  }
  console.log(`angle Spruce: lower third ${median(low).toFixed(0)}°, upper third ${median(up).toFixed(0)}°`);
  assert.ok(median(up) < 85, `upper boughs leave at ${median(up).toFixed(0)}°`);
  assert.ok(median(low) > 95, `lower boughs leave at ${median(low).toFixed(0)}°`);
});

/** The reference's θ1 for each species (degrees from upright, top of the crown to its base): all [est.]. */
const ESTIMATED_ANGLES: Record<string, [number, number]> = {
  Oak: [45, 90],
  Plane: [35, 55],
  Eucalyptus: [25, 45],
  "Scots pine": [40, 95],
  Beech: [30, 100],
  "Silver birch": [30, 50],
  "Black alder": [60, 80],
  "Lombardy poplar": [10, 25],
  Hawthorn: [45, 70],
  "Sitka spruce": [70, 110],
  "Corsican pine": [50, 95],
  "Douglas fir": [60, 120],
  "Western red cedar": [60, 130],
  "Monterey cypress": [40, 95],
  "Monterey pine": [50, 90],
  "Torrey pine": [60, 90],
  "Aleppo pine": [45, 80],
  "Coast live oak": [60, 100],
  "California sycamore": [40, 80],
  "Sugar maple": [25, 45],
  "Red oak": [40, 60],
  "White spruce": [70, 115],
};
for (const [name, [lo, hi]] of Object.entries(ESTIMATED_ANGLES)) {
  test(`${name}: its first-order limbs leave within the reference's ${lo}–${hi}° ([est.], soft: 15° either side)`, () => {
    const angles = trees(species(name)).flatMap((t) => limbs(t).map((l) => l.angle));
    const m = median(angles);
    console.log(`angle ${name}: median ${m.toFixed(0)}° of ${angles.length} limbs, estimated ${lo}–${hi}°`);
    assert.ok(m >= lo - 15 && m <= hi + 15, `median ${m.toFixed(0)}°`);
  });
}

test("Coast live oak: its primary branches leave a trunk of 1.2–2.4 m and grow out level (S:FEIS)", () => {
  for (const t of trees(species("Coast live oak"))) {
    const ls = limbs(t).filter((l) => l.nodes.length > 3);
    const first = Math.min(...ls.map((l) => l.from));
    const level = median(ls.map((l) => l.angle));
    console.log(`coast live oak: first limb at ${first.toFixed(2)} m, its limbs leave at ${level.toFixed(0)}°`);
    assert.ok(first >= 1.0 && first <= 2.6, `its first great limb leaves at ${first.toFixed(2)} m`);
    assert.ok(level >= 60, `its limbs leave at ${level.toFixed(0)}° from upright`);
  }
});

test("Lombardy poplar: a column, its branches erect along all its stem (S:TSO 'quite erect'; r/H 0.06–0.10 [est.], soft)", () => {
  const sp = species("Lombardy poplar");
  assert.ok(sp.crownRadius / sp.height <= 0.13, `r/H ${(sp.crownRadius / sp.height).toFixed(3)}`);
  const angles = trees(sp).flatMap((t) => limbs(t).map((l) => l.angle));
  assert.ok(median(angles) <= 30, `its branches leave at ${median(angles).toFixed(0)}°`);
});

// ---------------------------------------------------------------------------------------------------------
// Curvature: a J-curved bough droops and turns up at its tip; a sympodial twig zigzags, a monopodial one runs on.

for (const [name, source] of [
  ["Spruce", "S:EUAT lower boughs drooping; tips turned up [obs.]"],
  ["Western red cedar", "S:GDB branches arch; the J-curve [obs.]"],
  ["Douglas fir", "a mild J-curve [est.]"],
] as const) {
  test(`${name}: its lower boughs droop and turn up at their tips (${source})`, () => {
    let jays = 0;
    let all = 0;
    for (const t of trees(species(name))) {
      const k = t.skeleton;
      const d = t.size.height - t.size.crownBase;
      for (const l of limbs(t)) {
        if ((l.from - t.size.crownBase) / d > 0.5 || l.nodes.length < 4) continue;
        all++;
        const ys = l.nodes.map((n) => k.y[n]);
        const low = Math.min(...ys);
        const tip = ys[ys.length - 1];
        // (Dips below where it leaves, and its tip is above its lowest point.)
        if (low < ys[0] - 0.02 && tip > low + 0.02) jays++;
      }
    }
    console.log(`J-curve ${name}: ${jays} of ${all} lower boughs`);
    assert.ok(jays >= 0.5 * all, `${jays} of ${all} lower boughs droop and turn up`);
  });
}

/** The mean turn (degrees) between one piece of a fine branch (order 2 or more) and the next on its axis. */
function twigTurn(t: GrownTree): number {
  const k = t.skeleton;
  const kids = children(t);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < k.count; i++) {
    const p = k.parent[i];
    if (p < 0 || k.order[i] < 2 || k.order[p] !== k.order[i]) continue;
    const c = kids[i].find((x) => k.order[x] === k.order[i]);
    if (c === undefined) continue;
    const a = [k.x[i] - k.x[p], k.y[i] - k.y[p], k.z[i] - k.z[p]];
    const b = [k.x[c] - k.x[i], k.y[c] - k.y[i], k.z[c] - k.z[i]];
    const cos = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b));
    sum += Math.acos(Math.min(1, Math.max(-1, cos))) * DEG;
    n++;
  }
  return sum / Math.max(1, n);
}

test("Plane's twigs zigzag more than a sugar maple's (S:BC2007: Platanus sympodial, Acer monopodial)", () => {
  const plane = median(trees(species("Plane")).map(twigTurn));
  const maple = median(trees(species("Sugar maple")).map(twigTurn));
  console.log(`zigzag: plane ${plane.toFixed(1)}° a node, sugar maple ${maple.toFixed(1)}°`);
  assert.ok(plane >= maple + 3, `plane ${plane.toFixed(1)}°, maple ${maple.toFixed(1)}°`);
});

// ---------------------------------------------------------------------------------------------------------
// Whorls: a conifer's boughs come a tier at a time, evenly up its leader.

for (const name of ["Spruce", "Corsican pine", "Eastern white pine", "White spruce", "Douglas fir"]) {
  test(`${name}: its boughs are in whorls, evenly spaced (one whorl a year, S:GDB for the pines; spacing and count [est.], soft)`, () => {
    const sp = species(name);
    for (const t of trees(sp)) {
      const hs = limbs(t).map((l) => l.from).sort((a, b) => a - b);
      const spacing = 1 / sp.whorlsPerMetre;
      const whorls: number[][] = [];
      for (const y of hs) {
        const last = whorls[whorls.length - 1];
        if (last && y - last[0] < 0.3 * Math.min(spacing, 0.3 * t.size.crownRadius)) last.push(y);
        else whorls.push([y]);
      }
      const gaps = whorls.slice(1).map((w, j) => w[0] - whorls[j][0]);
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
      const per = median(whorls.map((w) => w.length));
      console.log(`whorls ${name}: ${whorls.length} whorls, ${per} boughs each, ${mean.toFixed(2)} m apart (cv ${(sd / mean).toFixed(2)})`);
      assert.ok(per >= 2, `${per} boughs to a whorl`);
      assert.ok(sd / mean <= 0.6, `whorls spaced unevenly (cv ${(sd / mean).toFixed(2)})`);
    }
  });
}

// ---------------------------------------------------------------------------------------------------------
// Crowns: open-grown proportions, and wider than a forest tree's.

/** Open-grown live crown ratio (live crown over height), from the reference: [est.] unless said. */
const CROWN_RATIO: Record<string, [number, number]> = {
  Oak: [0.75, 0.9],
  Spruce: [0.85, 1],
  Beech: [0.85, 0.95],
  "Silver birch": [0.6, 0.8],
  "Black alder": [0.6, 0.8],
  "Lombardy poplar": [0.85, 0.95],
  "Weeping willow": [0.85, 0.95],
  Hawthorn: [0.7, 0.9],
  "Sitka spruce": [0.85, 1],
  "Corsican pine": [0.6, 0.8],
  "Douglas fir": [0.9, 1],
  "Western red cedar": [0.85, 1],
  "Coast live oak": [0.85, 1],
  "Sugar maple": [0.75, 0.9],
  "Red oak": [0.7, 0.85],
  "Eastern white pine": [0.6, 0.9],
  "White spruce": [0.85, 1],
};
for (const [name, [lo, hi]] of Object.entries(CROWN_RATIO)) {
  test(`${name}: an open-grown crown ratio of ${lo}–${hi} ([est.], soft: 0.1 either side)`, () => {
    const sp = species(name);
    const cr = (sp.height - sp.crownBase) / sp.height;
    assert.ok(cr >= lo - 0.1 && cr <= hi + 0.1, `crown ratio ${cr.toFixed(2)}`);
  });
}

/**
 * TALLO's (Jucker et al. 2022, CC BY 4.0) median crown radius over height for the species, by height band,
 * mostly forest-grown: an open-grown tree's crown is wider than a forest one's of its height.
 */
const TALLO: Record<string, Record<string, number>> = {
  Oak: { "10-18": 0.25, "18-25": 0.2 },
  Eucalyptus: { "18-25": 0.08, "25+": 0.09 },
  Spruce: { "18-25": 0.1 },
  "Scots pine": { "18-25": 0.1, "10-18": 0.15 },
  Beech: { "18-25": 0.15 },
  "Silver birch": { "10-18": 0.12, "18-25": 0.12 },
  "Black alder": { "10-18": 0.11 },
  Hawthorn: { "3-10": 0.25 },
  "Corsican pine": { "10-18": 0.2, "18-25": 0.16 },
  "Douglas fir": { "25+": 0.11 },
  "Monterey pine": { "18-25": 0.12 },
  "Aleppo pine": { "10-18": 0.23 },
  "Stone pine": { "10-18": 0.29 },
  "Sugar maple": { "18-25": 0.16 },
  "Red oak": { "18-25": 0.19 },
  "Eastern white pine": { "18-25": 0.15 },
  "White spruce": { "10-18": 0.1 },
};
const band = (h: number) => (h < 10 ? "3-10" : h < 18 ? "10-18" : h < 25 ? "18-25" : "25+");
for (const [name, bands] of Object.entries(TALLO)) {
  test(`${name}: its open-grown crown is wider for its height than TALLO's forest median (S:TALLO)`, () => {
    const sp = species(name);
    const want = bands[band(sp.height)];
    assert.ok(want !== undefined, `no TALLO band for ${sp.height} m`);
    assert.ok(sp.crownRadius / sp.height >= want, `r/H ${(sp.crownRadius / sp.height).toFixed(3)} under TALLO's ${want}`);
  });
  test(`${name}: grown at TALLO's forest median r/H, it is a crown of many sprays in its box (S:TALLO)`, () => {
    const sp = species(name);
    const want = bands[band(sp.height)];
    const height = sp.height;
    const crownRadius = want * height;
    // (A forest tree's crown is the top half or so of it.)
    const size: TreeSize = { height, crownRadius, crownBase: 0.5 * height, trunkRadius: height / 110 };
    const t = growTree(sp, size, 1);
    let reach = 0;
    for (let i = 0; i < t.clumps.count; i++) reach = Math.max(reach, Math.hypot(t.clumps.x[i], t.clumps.z[i]) + t.clumps.radius[i]);
    assert.ok(t.clumps.count >= 30, `${t.clumps.count} clumps`);
    assert.ok(reach >= 0.9 * crownRadius && reach <= 1.04 * crownRadius, `reach ${reach.toFixed(2)} for ${crownRadius.toFixed(2)}`);
  });
}

// ---------------------------------------------------------------------------------------------------------
// Special forms.

test("Gorse: a dense spiny mound to the ground, its stems hidden in it ([obs.])", () => {
  for (const t of trees(species("Gorse"))) {
    const k = t.skeleton;
    const c = t.clumps;
    let lowest = Infinity;
    for (let i = 0; i < c.count; i++) lowest = Math.min(lowest, c.y[i] - c.radius[i]);
    // (Its wood as seen from outside: a node further out than half the crown's radius, or under a fifth of its
    // height, that no clump covers, shows.)
    let shows = 0;
    let all = 0;
    for (let i = 0; i < k.count; i++) {
      if (k.y[i] < 0.08) continue;
      all++;
      let covered = false;
      for (let j = 0; j < c.count && !covered; j++) covered = Math.hypot(k.x[i] - c.x[j], k.y[i] - c.y[j], k.z[i] - c.z[j]) < 1.05 * c.radius[j];
      if (!covered && (Math.hypot(k.x[i], k.z[i]) > 0.5 * t.size.crownRadius || k.y[i] < 0.2 * t.size.height)) shows++;
    }
    console.log(`gorse: lowest leaves at ${lowest.toFixed(2)} m, ${shows} of ${all} wood nodes show`);
    assert.ok(lowest <= 0.25, `its lowest leaves are ${lowest.toFixed(2)} m up`);
    assert.ok(shows <= 0.1 * all, `${shows} of ${all} wood nodes show`);
  }
});

test("Stone pine: bare limbs under its umbrella (S:EUAT, the high crown carries no low branches; canopyLift)", () => {
  const sp = species("Stone pine");
  for (const t of trees(sp)) {
    const c = t.clumps;
    const depth = t.size.height - t.size.crownBase;
    // (Under the middle of its crown, near a third of the way to its heart: no leaves.)
    let under = 0;
    for (let i = 0; i < c.count; i++) if (Math.hypot(c.x[i], c.z[i]) < 0.35 * t.size.crownRadius && c.y[i] < t.size.crownBase + 0.15 * depth) under++;
    assert.equal(under, 0, `${under} clumps under the middle of its umbrella`);
  }
});

/** The share of a tree's clumps with another clump close over them: a crown's skin is layered; a pad has air under it. */
function overhung(t: GrownTree): number {
  const c = t.clumps;
  let n = 0;
  for (let i = 0; i < c.count; i++) {
    for (let j = 0; j < c.count; j++) {
      const dy = c.y[j] - c.y[i];
      if (j !== i && dy > 0.5 * c.radius[i] && dy < 2.5 * c.radius[i] && Math.hypot(c.x[j] - c.x[i], c.z[j] - c.z[i]) < c.radius[i]) {
        n++;
        break;
      }
    }
  }
  return n / Math.max(1, c.count);
}

/**
 * How thick a tree's pads are: for each branch off a great limb (or off a stem) bearing three clumps or more, how
 * far its clumps' centres span in height, in their radii; the median of them. A pad is a shelf, thin.
 */
function padThickness(t: GrownTree): number {
  const k = t.skeleton;
  const c = t.clumps;
  const padOf = (n: number) => {
    let last = -1;
    for (let p = n; p >= 0 && k.order[p] >= 2; p = k.parent[p]) last = p;
    return last;
  };
  const pads = new Map<number, number[]>();
  for (let i = 0; i < c.count; i++) {
    const p = padOf(c.node[i]);
    if (p >= 0) pads.set(p, [...(pads.get(p) ?? []), i]);
  }
  const spans: number[] = [];
  for (const list of pads.values()) {
    if (list.length < 3) continue;
    const ys = list.map((i) => c.y[i]);
    spans.push((Math.max(...ys) - Math.min(...ys)) / (list.reduce((s, i) => s + c.radius[i], 0) / list.length));
  }
  return median(spans);
}

test("Monterey cypress: its foliage in flat pads with air under them ([obs.], against the same tree grown without pads)", () => {
  const sp = species("Monterey cypress");
  const flat = { ...sp, pads: 0, canopyLift: 0 };
  const evenTrees = SEEDS.map((s) => growTree(flat, ownSize(sp), s));
  const padded = median(trees(sp).map(overhung));
  const even = median(evenTrees.map(overhung));
  const thin = median(trees(sp).map(padThickness));
  const thick = median(evenTrees.map(padThickness));
  console.log(`pads Monterey cypress: ${(padded * 100).toFixed(0)}% of clumps overhung, ${(even * 100).toFixed(0)}% without pads; its pads ${thin.toFixed(1)} clumps' radii thick, ${thick.toFixed(1)} without`);
  // Each pad a shelf: its leaves gathered near its branch's top, well under as thick as that branch's leaves without pads ...
  assert.ok(thin <= 0.6 * thick, `pads ${thin.toFixed(1)} radii thick, ${thick.toFixed(1)} without`);
  // ... with air under it: fewer clumps with another just over them.
  assert.ok(padded <= 0.7 * even, `${(padded * 100).toFixed(0)}% overhung, ${(even * 100).toFixed(0)}% without pads`);
});

test("A spruce's top is a spire: its leader clothed in needles to its tip, no bare stick (owner, 2026-11-24)", () => {
  for (const name of ["Spruce", "White spruce", "Sitka spruce", "Douglas fir", "Western red cedar"]) {
    for (const t of trees(species(name))) {
      const k = t.skeleton;
      const c = t.clumps;
      const s = stem(t);
      const H = t.size.height;
      let bare = 0;
      for (const n of s) {
        if (k.y[n] < H - Math.min(3, 0.15 * (H - t.size.crownBase))) continue;
        let on = false;
        for (let j = 0; j < c.count && !on; j++) on = Math.hypot(k.x[n] - c.x[j], k.y[n] - c.y[j], k.z[n] - c.z[j]) < c.radius[j];
        if (!on) bare++;
      }
      let top = 0;
      for (let j = 0; j < c.count; j++) top = Math.max(top, c.y[j] + c.radius[j]);
      assert.equal(bare, 0, `${name}: ${bare} of its leader's top nodes are bare`);
      assert.ok(top >= 0.97 * H, `${name}: its needles stop at ${top.toFixed(1)} m of ${H}`);
    }
  }
});

// ---------------------------------------------------------------------------------------------------------
// No bare twig in the look that draws it: a conifer drawn in sheets has every twig's end under a sheet.

/** How far a point is from the nearest of a set of sheets' triangles (m). */
function offSheets(pos: ArrayLike<number>, index: ArrayLike<number>, p: number[]): number {
  let best = Infinity;
  for (let t = 0; t < index.length; t += 3) {
    const a = [pos[index[t] * 3], pos[index[t] * 3 + 1], pos[index[t] * 3 + 2]];
    const b = [pos[index[t + 1] * 3], pos[index[t + 1] * 3 + 1], pos[index[t + 1] * 3 + 2]];
    const c = [pos[index[t + 2] * 3], pos[index[t + 2] * 3 + 1], pos[index[t + 2] * 3 + 2]];
    // (A cheap bound first.)
    const lo = [0, 1, 2].map((i) => Math.min(a[i], b[i], c[i]) - p[i]);
    const hi = [0, 1, 2].map((i) => p[i] - Math.max(a[i], b[i], c[i]));
    if (Math.max(...lo, ...hi, 0) >= best) continue;
    best = Math.min(best, pointTriangle(p, a, b, c));
  }
  return best;
}

function pointTriangle(p: number[], a: number[], b: number[], c: number[]): number {
  const sub = (u: number[], v: number[]) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  const d00 = dot(ab, ab);
  const d01 = dot(ab, ac);
  const d11 = dot(ac, ac);
  const den = d00 * d11 - d01 * d01;
  if (den > 1e-12) {
    const v = (d11 * d1 - d01 * d2) / den;
    const w = (d00 * d2 - d01 * d1) / den;
    if (v >= 0 && w >= 0 && v + w <= 1) {
      const q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
      return Math.hypot(...sub(p, q));
    }
  }
  const seg = (u: number[], v: number[]) => {
    const d = sub(v, u);
    const f = Math.min(1, Math.max(0, dot(sub(p, u), d) / Math.max(1e-12, dot(d, d))));
    return Math.hypot(p[0] - u[0] - d[0] * f, p[1] - u[1] - d[1] * f, p[2] - u[2] - d[2] * f);
  };
  return Math.min(seg(a, b), seg(b, c), seg(c, a));
}

for (const sp of ALL_SPECIES.filter((s) => s.architecture === "conifer" && (s.leafKind === "needle" || s.leafKind === "small"))) {
  test(`${sp.name}: every twig's end is under its sheets, near and mid (owner, 2026-11-24: no bare twigs)`, () => {
    const kind = sp.leafKind === "needle" ? 0 : 1;
    for (const t of trees(sp)) {
      const k = t.skeleton;
      const kids = children(t);
      const c = t.clumps;
      let rMean = 0;
      for (let i = 0; i < c.count; i++) rMean += c.radius[i] / c.count;
      for (const coarse of [false, true]) {
        const P = sheetPieces([t], [kind], coarse);
        const pos = P.attributes.position.array;
        const index = P.index;
        assert.ok(index.length >= (SHEET_ALONG - 1) * (SHEET_ACROSS - 1) * 6, "it has sheets");
        let worst = 0;
        let off = 0;
        let ends = 0;
        for (let i = 0; i < k.count; i++) {
          if (kids[i].length > 0 || k.parent[i] < 0 || k.y[i] < t.size.crownBase) continue;
          ends++;
          const d = offSheets(pos, index, [k.x[i], k.y[i], k.z[i]]);
          worst = Math.max(worst, d);
          // (Close to, a twig's end within a fifth of a clump's radius of a sheet is hidden in its needles; mid,
          // where a sheet covers several clumps and a twig is a pixel, within half.)
          if (d > (coarse ? 0.5 : 0.25) * rMean) off++;
        }
        console.log(`under sheets ${sp.name} ${coarse ? "mid" : "near"}: ${off} of ${ends} twig ends off them, the farthest ${worst.toFixed(2)} m (clumps ${rMean.toFixed(2)} m)`);
        assert.ok(off <= (coarse ? 0.1 : 0.03) * ends, `${off} of ${ends} twig ends are off its sheets`);
      }
    }
  });
}
