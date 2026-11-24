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
import { needleOf, pineShoots } from "../src/sprays.ts";
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
