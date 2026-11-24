// A pine as the realistic look draws it, and the polish that came with it: its shoots grown whorl by whorl,
// a tuft of needles only at each shoot's end, as long as its needles; a mip that closes a pine's cards over
// their gaps and no other's; a stem's bark laid over its root flare by the surface's length and round the
// stem's radius above it; a blue gum's leaves as narrow as its own.
//
//   node --test test/pines.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { LINE_STRIDE, TIER_SHAPES, flareBark, woodPieces } from "../src/geometry.ts";
import { ALPHA_CUT, alphaOf, coverage, coverageMips } from "../src/mips.ts";
import { leafSet, scanLookOf } from "../src/scans.ts";
import { ALL_SPECIES } from "../src/species.ts";
import { BIG_CARD, SPRAY_COLS, drawSprayRow, needleOf, pineShoots } from "../src/sprays.ts";
import { hash01 } from "../src/variants.ts";

const species = (name: string) => ALL_SPECIES.find((s) => s.name === name)!;
const rng = (seed: number) => {
  let k = 0;
  return () => hash01(k++, seed);
};
const SEEDS = [1, 2, 3, 4, 5, 6];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

test("a pine's shoots carry a tuft of needles at each shoot's end and nowhere else, as long as its needles", () => {
  for (const N of [0.06, 0.12, 0.25]) {
    for (const seed of SEEDS) {
      const { twigs, leaves } = pineShoots(0.5, N, 0.5, rng(seed));
      assert.ok(leaves.length > 0);
      const ends = twigs.map((t) => t.pts[t.pts.length - 1]);
      for (const l of leaves) {
        assert.ok(l.needles, "a tuft, drawn needle by needle");
        assert.ok(
          ends.some((e) => Math.hypot(e.x - l.x, e.y - l.y) < 1e-9),
          "on a shoot's end",
        );
        assert.ok(l.len >= 0.84 * N && l.len <= 1.16 * N, `a tuft ${l.len.toFixed(3)} m long for needles of ${N} m`);
      }
    }
  }
});

test("a short-needled pine's twig carries more tufts than a long-needled one's, with air between them", () => {
  const tufts = (N: number) => mean(SEEDS.map((s) => pineShoots(0.5, N, 0.5, rng(s)).leaves.length));
  const short = tufts(0.06);
  const long = tufts(0.25);
  console.log(`tufts on half a metre of shoot: ${short.toFixed(1)} of 6 cm needles, ${long.toFixed(1)} of 25 cm`);
  assert.ok(short > 2 * long, `${short} against ${long}`);
  // (Each tuft's nearest neighbour, on average, at least half a needle off: a candelabrum, not a mat.)
  for (const N of [0.06, 0.12, 0.25]) {
    const gaps = SEEDS.flatMap((s) => {
      const ls = pineShoots(0.5, N, 0.5, rng(s)).leaves;
      return ls.length < 2 ? [] : ls.map((a) => Math.min(...ls.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
    });
    if (gaps.length > 0) assert.ok(mean(gaps) >= 0.5 * N, `tufts ${mean(gaps).toFixed(3)} m apart for needles of ${N} m`);
  }
});

test("a dense pine's branch carries more of its shoots than an open one's", () => {
  const count = (d: number) => mean(SEEDS.map((s) => pineShoots(1.5, 0.1, d, rng(s)).leaves.length));
  assert.ok(count(0.9) > count(0.1), `${count(0.9)} against ${count(0.1)}`);
});

test("every pine's tufts are its own needles long, as the reference gives them (MORPHOLOGY.md)", () => {
  const RANGES: Record<string, [number, number]> = {
    "Scots pine": [4, 7],
    "Corsican pine": [8, 16],
    "Monterey pine": [8, 15],
    "Torrey pine": [20, 30],
    "Aleppo pine": [6, 12],
    "Stone pine": [10, 18],
    "Eastern white pine": [5, 15],
  };
  for (const [name, [lo, hi]] of Object.entries(RANGES)) {
    const cm = needleOf(scanLookOf(species(name))) * 100;
    assert.ok(cm >= lo && cm <= hi, `${name}: ${cm} cm`);
  }
});

test("a mip closes over its gaps only in the cells asked to, as far as each is asked", () => {
  // (Two cells of the same lace: needles a texel wide, scattered, with gaps between them.)
  const cell = 64;
  const px = { data: new Uint8Array(cell * 2 * cell * 4), width: cell * 2, height: cell };
  for (let y = 8; y < cell - 8; y++)
    for (let x = 8; x < cell - 8; x++) {
      if (hash01(y * cell + x, 77) > 0.3) continue;
      for (const c of [0, 1]) px.data[(y * px.width + c * cell + x) * 4 + 3] = 255;
    }
  const plain = coverageMips(px, cell, ALPHA_CUT, 0);
  const some = coverageMips(px, cell, ALPHA_CUT, [0, 0.4]);
  const at = (levels: typeof plain, l: number) => coverage(alphaOf(levels[l]), levels[l].width, levels[l].height, cell >> l, ALPHA_CUT);
  for (const l of [1, 2, 3]) {
    const [a0, a1] = at(some, l);
    const [p0] = at(plain, l);
    assert.equal(a0, p0, `level ${l}: a cell with no fill is as it was`);
    assert.ok(a1 > a0 + 0.05, `level ${l}: a filled cell closes over its gaps (${a1.toFixed(2)} against ${a0.toFixed(2)})`);
  }
});

test("a root flare's bark is laid by the length of its surface, longer over a buttress", () => {
  // (A stem up the y axis, its radius 0.3 m above a flare that doubles it at the ground.)
  const n = 60;
  const line = new Float64Array(n * LINE_STRIDE);
  const rOf = (a: number) => 0.3 * (1 + Math.exp(-a / 0.25));
  for (let k = 0; k < n; k++) {
    const a = (k / (n - 1)) * 2;
    line.set([0, a, 0, 0, 1, 0, rOf(a), 0, a], k * LINE_STRIDE);
  }
  const hf = 0.6;
  const bark = flareBark([line], 0, hf);
  // (Its radius above the flare is the stem's there.)
  assert.ok(Math.abs(bark.radius - rOf(hf)) < 0.02, `${bark.radius}`);
  // (Up from the ground, the surface's own length: finely summed here.)
  const top = 2 * hf;
  let surface = 0;
  for (let k = 0; k < 2000; k++) {
    const a0 = (k / 2000) * top;
    const a1 = ((k + 1) / 2000) * top;
    surface += Math.hypot(a1 - a0, rOf(a1) - rOf(a0));
  }
  const laid = bark.along(top, 0) - bark.along(0, 0);
  assert.ok(Math.abs(laid - surface) / surface < 0.03, `laid over ${laid.toFixed(3)} m of a surface ${surface.toFixed(3)} m long`);
  assert.ok(laid > top * 1.05, "longer than the centre line under it");
  // (Over a buttress, which swells the foot further at its angle, longer still.)
  const swell = (angle: number, h: number): [number, number, number] => [1 + (Math.abs(angle) < 0.3 ? 0.8 : 0) * Math.exp(-Math.max(0, h) / 0.3), 0, 0];
  const lobed = flareBark([line], 0, hf, swell);
  assert.ok(lobed.along(top, 0) - lobed.along(0, 0) > laid + 0.05, "over the buttress");
  assert.ok(Math.abs(lobed.along(top, 1.5) - lobed.along(0, 1.5) - laid) < 1e-6, "between the buttresses, as without them");
  // (Above twice the flare, the centre line's own.)
  assert.equal(bark.along(1.7, 0), 1.7);
});

test("a stem's bark is laid round its own radius over its root flare, and round the wood's radius above it", () => {
  for (const name of ["Oak", "Western red cedar", "Stone pine"]) {
    const sp = species(name);
    const tree = growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, 1);
    const P = woodPieces([tree], TIER_SHAPES[0]);
    const pos = P.attributes.position.array;
    const wood = P.attributes.aWood.array;
    let foot = Infinity;
    let above = 0;
    for (let v = 0; v < pos.length / 3; v++) {
      const y = pos[3 * v + 1];
      const share = wood[4 * v + 3];
      assert.ok(share > 0 && share <= 1, `${name}: a share of ${share}`);
      if (y < 0.05) foot = Math.min(foot, share);
      if (y > 2.5) above = Math.max(above, Math.abs(1 - share));
    }
    console.log(`flare ${name}: bark laid round ${(foot * 100).toFixed(0)}% of the radius at the ground`);
    assert.ok(foot < 0.9, `${name}: its flare's bark is laid round ${foot.toFixed(2)} of its radius`);
    assert.ok(above < 1e-6, `${name}: above its flare, round its own radius`);
  }
});

test("a blue gum's leaves are as narrow as its adult leaves (12–30 by 1.7–3 cm, EUCLID), its picture's narrowed", () => {
  const look = scanLookOf(species("Eucalyptus"));
  const set = leafSet(look.leaves)!;
  // (A sprite's box holds its sickle's curve too, so its width over its length is over the leaf's own.)
  const ratio = mean(set.sprites.map((s) => s.w / Math.hypot(s.tip[0] - s.base[0], s.tip[1] - s.base[1]))) * (look.leafWidth ?? 1);
  assert.ok(ratio <= 0.2, `${ratio.toFixed(3)}`);
});

// ---- The pines' crowns against their photographs (the owner's stone pine references: an umbrella 2.5 to 3
// times as wide as deep, flat on top, on a stem that forks a third to half of the way up). ----

/** A grown tree's crown, from its clumps: its width (seen side-on, the most of eight sides), its depth, and how high its top is at each ring out from its stem. */
function crownOf(tree: ReturnType<typeof growTree>) {
  const c = tree.clumps;
  let lo = Infinity;
  let hi = -Infinity;
  let reach = 0;
  for (let i = 0; i < c.count; i++) {
    lo = Math.min(lo, c.y[i] - c.radius[i]);
    hi = Math.max(hi, c.y[i] + c.radius[i]);
    reach = Math.max(reach, Math.hypot(c.x[i], c.z[i]) + c.radius[i]);
  }
  let width = 0;
  for (let v = 0; v < 8; v++) {
    const a = (v / 8) * Math.PI;
    let l = 0;
    let r = 0;
    for (let i = 0; i < c.count; i++) {
      const across = c.x[i] * Math.cos(a) + c.z[i] * Math.sin(a);
      l = Math.min(l, across - c.radius[i]);
      r = Math.max(r, across + c.radius[i]);
    }
    width = Math.max(width, r - l);
  }
  const rings = new Array(5).fill(-Infinity);
  for (let i = 0; i < c.count; i++) {
    const k = Math.min(4, Math.floor((Math.hypot(c.x[i], c.z[i]) / reach) * 5));
    rings[k] = Math.max(rings[k], c.y[i] + c.radius[i]);
  }
  return { width, depth: hi - lo, top: hi, rings };
}

test("a stone pine is an umbrella: two and a half to four times as wide as deep, its top flat", () => {
  const sp = species("Stone pine");
  for (const seed of SEEDS) {
    const tree = growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, seed);
    const { width, depth, top, rings } = crownOf(tree);
    const ratio = width / depth;
    console.log(`stone pine seed ${seed}: ${width.toFixed(1)} m wide, ${depth.toFixed(1)} m deep (${ratio.toFixed(2)}), top by ring ${rings.map((r) => r.toFixed(1)).join(" ")}`);
    assert.ok(ratio >= 2.5 && ratio <= 4, `seed ${seed}: ${ratio.toFixed(2)} times as wide as deep`);
    // (Flat: its top over the inner four fifths of its reach within a fourteenth of its height of the highest; a
    // dome as deep falls a third of its depth, some 2.5 m, by four fifths of the way out.)
    for (const r of rings.slice(0, 4)) assert.ok(top - r <= 0.07 * sp.height, `seed ${seed}: a ring's top ${(top - r).toFixed(2)} m under the crown's`);
  }
});

test("a stone pine's stem forks a third to half of the way up into a few thick stems, which fork again in V-forks", () => {
  const sp = species("Stone pine");
  for (const seed of SEEDS) {
    const tree = growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, seed);
    const k = tree.skeleton;
    const kids: number[][] = Array.from({ length: k.count }, () => []);
    for (let i = 0; i < k.count; i++) if (k.parent[i] >= 0) kids[k.parent[i]].push(i);
    // (Its fork: the first node up its stem with more than one child. Its stems: the children there, and a
    // third or fourth leaving a little above it.)
    let at = 0;
    while (kids[at].length === 1) at = kids[at][0];
    const forkY = k.y[at];
    assert.ok(forkY >= 0.3 * sp.height && forkY <= 0.5 * sp.height, `seed ${seed}: it forks at ${forkY.toFixed(1)} m of ${sp.height}`);
    const stems: number[] = [...kids[at]];
    for (let guard = 0; guard < 4; guard++) {
      const on = stems.find((c) => k.order[c] === 0 && kids[c].length === 2 && k.y[c] - forkY < 0.5);
      if (on === undefined) break;
      stems.splice(stems.indexOf(on), 1, ...kids[on]);
    }
    assert.ok(stems.length >= 2 && stems.length <= 4, `seed ${seed}: ${stems.length} stems at its fork`);
    // (Thick: each at least 0.45 of the stem under the fork, and together, by the pipe model, about as thick.)
    const r0 = k.radius[k.parent[at]];
    for (const c of stems) assert.ok(k.radius[c] >= 0.45 * r0, `seed ${seed}: a stem ${k.radius[c].toFixed(3)} m thick off a stem ${r0.toFixed(3)} m`);
    const pipe = Math.sqrt(stems.reduce((sum, c) => sum + k.radius[c] ** 2, 0));
    assert.ok(pipe >= 0.85 * r0 && pipe <= 1.3 * r0, `seed ${seed}: its stems together ${pipe.toFixed(3)} m against ${r0.toFixed(3)} m`);
    // (Each of them forks again under its crown's top in a V: two arms, the lesser at least half the greater.)
    let vForks = 0;
    for (const s0 of stems) {
      let c = s0;
      for (let guard = 0; guard < 200 && kids[c].length > 0; guard++) {
        if (kids[c].length >= 2) {
          const rs = kids[c].map((q) => k.radius[q]).sort((x, y) => y - x);
          if (rs[1] >= 0.5 * rs[0] && rs[1] >= 0.25 * r0) {
            vForks++;
            break;
          }
        }
        c = kids[c].reduce((best, q) => (k.radius[q] > k.radius[best] ? q : best), kids[c][0]);
      }
    }
    assert.ok(vForks >= stems.length - 1, `seed ${seed}: ${vForks} of its ${stems.length} stems fork again in a V`);
    // (Bare below its umbrella: no leaves under its crown's base.)
    for (let c = 0; c < tree.clumps.count; c++) assert.ok(tree.clumps.y[c] >= 0.95 * sp.crownBase, `seed ${seed}: a clump at ${tree.clumps.y[c].toFixed(1)} m`);
  }
});

test("a pine's big cards are cushions of tufts, wider than high, and its near cards stand on their twigs' feet", () => {
  for (const name of ["Stone pine", "Scots pine", "Monterey pine"]) {
    const sp = species(name);
    const look = scanLookOf(sp);
    const n = 128;
    const sheet = { set: { sprites: [{ size: 1 }] }, albedo: { width: 1, height: 1, data: new Uint8Array(4) }, normal: { width: 1, height: 1, data: new Uint8Array(4) } };
    const out = { width: SPRAY_COLS * n, height: n, data: new Uint8Array(SPRAY_COLS * n * 4 * n) };
    drawSprayRow(out, 0, n, sheet as never, look, 1.45 * sp.clumpSize, 7, 1 - sp.openness);
    const box = (col: number) => {
      let x0 = n, x1 = 0, y0 = n, y1 = 0, rows = 0, sum = 0;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          if (out.data[(y * out.width + col * n + x) * 4 + 3] < 128) continue;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          rows += y; sum++;
        }
      return { w: x1 - x0, h: y1 - y0, meanRow: rows / Math.max(1, sum), cover: sum / (n * n) };
    };
    for (let col = BIG_CARD; col < SPRAY_COLS; col++) {
      const big = box(col);
      assert.ok(big.w > 1.3 * big.h, `${name}: its cushion ${big.w} texels wide and ${big.h} high`);
      assert.ok(big.cover > 0.12, `${name}: its cushion covers ${(big.cover * 100).toFixed(0)}% of its card`);
    }
    // (Its cards are drawn from their foot, their first row (test/orientation.test.ts): its tufts on past it,
    // its twig coming in at the first rows.)
    for (const col of [0, 1, 2]) {
      const near = box(col);
      assert.ok(near.meanRow > 0.3 * n, `${name}: a near card's needles past its foot (their mean row ${near.meanRow.toFixed(0)} of ${n})`);
      assert.ok(out.data[((Math.round(0.1 * n) + 1) * out.width + col * n + n / 2) * 4 + 3] > 0, `${name}: its twig comes in at its foot`);
    }
  }
});
