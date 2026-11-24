// How a species carries its leaves, as the realistic look draws them: a blue gum's bunches hanging at its
// branches' ends with sky between, its sprays hanging edge to the sky; a Monterey cypress's pads lying level;
// a Norway spruce's boughs hanging their curtains; a dense crown's big cards closed; a pine's tufts needles.
//
//   node --test test/habit.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { growTree } from "../src/grow.ts";
import { type FixedCards, SHEET_ACROSS, SHEET_ALONG, cardPieces, sheetPieces } from "../src/geometry.ts";
import { type LeafSet, type ScanLook } from "../src/scans.ts";
import { ALL_SPECIES, type TreeSpecies } from "../src/species.ts";
import { drawSprayCard } from "../src/sprays.ts";
import { type TreeSize } from "../src/tree.ts";

const species = (name: string): TreeSpecies => ALL_SPECIES.find((s) => s.name === name)!;
const own = (sp: TreeSpecies): TreeSize => ({ height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius });
const SEEDS = [1, 2, 3];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

test("a blue gum's leaves gather in fewer, bigger bunches than the same tree grown without (`clusters`)", () => {
  const sp = species("Eucalyptus");
  assert.ok((sp.clusters ?? 0) > 0.5);
  const even = { ...sp, clusters: 0 };
  const count = (s: TreeSpecies) => mean(SEEDS.map((seed) => growTree(s, own(s), seed).clumps.count));
  const radius = (s: TreeSpecies) =>
    mean(
      SEEDS.map((seed) => {
        const c = growTree(s, own(s), seed).clumps;
        return mean(Array.from(c.radius));
      }),
    );
  const [nb, ne] = [count(sp), count(even)];
  const [rb, re] = [radius(sp), radius(even)];
  console.log(`bunches Eucalyptus: ${nb.toFixed(0)} clumps of ${rb.toFixed(2)} m, ${ne.toFixed(0)} of ${re.toFixed(2)} m without`);
  assert.ok(nb <= 0.85 * ne, `${nb} clumps, ${ne} without`);
  assert.ok(rb >= 1.15 * re, `${rb.toFixed(2)} m, ${re.toFixed(2)} m without`);
  // (And it says so to its drawing.)
  assert.equal(growTree(sp, own(sp), 1).habit?.clusters, sp.clusters);
});

test("a grown tree carries its species' habit only where it has one", () => {
  assert.equal(growTree(species("Beech"), own(species("Beech")), 1).habit, undefined);
  assert.equal(growTree(species("Spruce"), own(species("Spruce")), 1).habit?.sprayHang, species("Spruce").sprayHang);
  assert.equal(growTree(species("Monterey cypress"), own(species("Monterey cypress")), 1).habit?.pads, species("Monterey cypress").pads);
});

const fixed = (over: Partial<FixedCards> = {}): FixedCards => ({ half: 0.4, fill: 0.5, most: 36, big: 2, bigSize: 1.15, hang: 0, ...over });

/** Each card's facing, the way its twig runs, its middle, and whether it is a big one. */
function cards(tree: ReturnType<typeof growTree>, fix: FixedCards) {
  const P = cardPieces([tree], 12, 0.8, undefined, [fix]);
  const off = P.attributes.aOffset.array;
  const tan = P.attributes.aTangent.array;
  const pos = P.attributes.position.array;
  const out: { face: number[]; twig: number[]; at: number[]; big: boolean }[] = [];
  for (let v = 0; v < pos.length / 3; v += 4) out.push({ face: [off[4 * v], off[4 * v + 1], off[4 * v + 2]], twig: [tan[4 * v], tan[4 * v + 1], tan[4 * v + 2]], at: [pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]], big: off[4 * v + 3] > 0.5 });
  return out;
}

test("hanging sprays hang edge to the sky: their cards stand upright, their twigs run down", () => {
  const sp = species("Eucalyptus");
  const tree = growTree(sp, own(sp), 1);
  const hung = cards(tree, fixed({ hang: 0.85 }));
  const level = cards(tree, fixed());
  const up = (cs: typeof hung) => mean(cs.map((c) => Math.abs(c.face[1])));
  const down = (cs: typeof hung) => mean(cs.map((c) => c.twig[1]));
  console.log(`hanging cards: facing up ${up(hung).toFixed(2)}, twig ${down(hung).toFixed(2)}; level ${up(level).toFixed(2)}, ${down(level).toFixed(2)}`);
  assert.ok(up(hung) < 0.5 * up(level), "their faces stand up");
  assert.ok(down(hung) < -0.5, "their twigs run down");
  // (Their big cards too: a clump's hanging mass.)
  assert.ok(mean(hung.filter((c) => c.big).map((c) => c.twig[1])) < -0.4);
});

test("a weeping crown's sprays hang less over its top (`hangTop`), and as they did under it", () => {
  const sp = species("Weeping willow");
  const tree = growTree(sp, own(sp), 1);
  const plain = cards(tree, fixed({ hang: 0.95 }));
  const topped = cards(tree, fixed({ hang: 0.95, hangTop: 0.6 }));
  const H = sp.height;
  const high = (cs: typeof plain) => cs.filter((c) => !c.big && c.at[1] > 0.85 * H);
  const low = (cs: typeof plain) => cs.filter((c) => !c.big && c.at[1] < 0.5 * H);
  const down = (cs: typeof plain) => mean(cs.map((c) => c.twig[1]));
  console.log(`weeping top: twigs ${down(high(topped)).toFixed(2)} with hangTop, ${down(high(plain)).toFixed(2)} without`);
  assert.ok(down(high(topped)) > down(high(plain)) + 0.1, "over the top, they hang less");
  assert.ok(Math.abs(down(low(topped)) - down(low(plain))) < 0.1, "low down, as they were");
});

test("a padded crown's sprays lie level in thin shelves (`habit.pads`)", () => {
  const sp = species("Monterey cypress");
  // (At its own size, a headland tree's low wide crown, and at a sheltered one's, deeper than it is wide, as a
  // survey may hand over for a tree inland.)
  for (const [label, size] of [
    ["its own size", own(sp)],
    ["sheltered", { height: 18, crownRadius: 6, crownBase: 3, trunkRadius: 0.6 }],
  ] as const) {
    const tree = growTree(sp, size, 1);
    assert.ok((tree.habit?.pads ?? 0) > 0.5);
    const flat = cards(tree, fixed());
    const round = cards({ ...tree, habit: undefined }, fixed());
    const steep = (cs: typeof flat) => mean(cs.filter((c) => !c.big).map((c) => Math.abs(c.twig[1])));
    console.log(`pad cards, ${label}: twigs ${steep(flat).toFixed(2)} up or down, ${steep(round).toFixed(2)} without pads`);
    // (A third flatter and more. A low wide crown's clumps face the sky over most of it, so its twigs lie
    // flatter without pads than a tall crown's (0.40 of upright, the 18 m tree's it was 0.43), and its pads have less
    // to level: held to 0.65 of that there, to 0.6 in a deep crown.)
    const most = label === "sheltered" ? 0.6 : 0.65;
    assert.ok(steep(flat) < most * steep(round), `${label}: ${steep(flat).toFixed(2)} against ${steep(round).toFixed(2)}`);
  }
});

test("a spruce's boughs hang their curtains: its sheets' edges fall further than a fir's, more low down, its tops still up", () => {
  const sp = species("Spruce");
  const tree = growTree(sp, own(sp), 1);
  const fall = (t: typeof tree) => {
    const P = sheetPieces([t], [0]);
    const pos = P.attributes.position.array;
    const verts = SHEET_ALONG * SHEET_ACROSS;
    let sum = 0;
    let n = 0;
    for (let s = 0; s < pos.length / 3 / verts; s++) {
      // (Its middle row: how far its edges hang under its middle, over its width.)
      const row = s * verts + Math.floor(SHEET_ALONG / 2) * SHEET_ACROSS;
      const [a, m, b] = [row, row + 1, row + 2].map((k) => [pos[3 * k], pos[3 * k + 1], pos[3 * k + 2]]);
      const w = Math.hypot(b[0] - a[0], b[2] - a[2]) / 2;
      if (w < 1e-3) continue;
      sum += (m[1] - (a[1] + b[1]) / 2) / w;
      n++;
    }
    return sum / n;
  };
  const curtained = fall(tree);
  const flat = fall({ ...tree, habit: undefined });
  console.log(`curtains Spruce: edges ${curtained.toFixed(2)} of a half width under the middle, ${flat.toFixed(2)} without`);
  assert.ok(curtained > flat + 0.2, `${curtained.toFixed(2)} against ${flat.toFixed(2)}`);
});

/** A sheet of leaves to draw from: two plain leaves, drawn here. */
function plainSheet(): { set: LeafSet; albedo: { data: Uint8Array; width: number; height: number }; normal: { data: Uint8Array; width: number; height: number } } {
  const W = 64;
  const H = 128;
  const albedo = new Uint8Array(W * H * 4);
  const normal = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const inside = Math.abs(x + 0.5 - W / 2) < 10 * Math.sin((Math.PI * (y + 0.5)) / H) + 1;
      albedo.set([60, 110, 50, inside ? 255 : 0], i);
      normal.set([128, 128, 190, 255], i);
    }
  const set: LeafSet = { id: "plain", size: [W, H], lengthCm: 10, tone: false, meanLinear: [0.05, 0.15, 0.03], sprites: [{ x: 0, y: 0, w: W, h: H, base: [W / 2, H], tip: [W / 2, 0], size: 1 }] };
  return { set, albedo: { data: albedo, width: W, height: H }, normal: { data: normal, width: W, height: H } };
}

const coverOf = (look: ScanLook, big: boolean, density: number, n = 256): number => {
  const out = { data: new Uint8Array(n * n * 4), width: n, height: n };
  drawSprayCard(out, 0, 0, n, plainSheet(), look, big ? 2.2 : 0.8, big, 11, density);
  let c = 0;
  for (let i = 3; i < out.data.length; i += 4) c += out.data[i] / 255;
  return c / (n * n);
};

test("a dense species' big card is closed: leaves behind its own fill its gaps; an open one's is not", () => {
  const look: ScanLook = { bark: "oak", leaves: "plain", leafCm: 10, spray: "alternate" };
  const open = coverOf(look, true, 0.3);
  const dense = coverOf(look, true, 0.9);
  console.log(`big card cover: ${(open * 100).toFixed(0)}% open, ${(dense * 100).toFixed(0)}% dense`);
  assert.ok(dense > open * 1.15, `${dense} against ${open}`);
  // (Near cards are as they were: the leaves behind are a big card's.)
  assert.equal(coverOf(look, false, 0.3), coverOf(look, false, 0.9));
});

test("a pine's tufts are drawn needle by needle, at its shoots' ends, a dense pine's branch more of them", () => {
  const look: ScanLook = { bark: "pine", leaves: "plain", leafCm: 25, spray: "tufts" };
  // (Its near card and its big card both hold needles, though its picture is a plain leaf; a branch of them is
  // mostly sky, more crowded on a dense pine.)
  assert.ok(coverOf(look, false, 0) > 0.02);
  assert.ok(coverOf(look, true, 0) > 0.01);
  assert.ok(coverOf(look, true, 0) < 0.25);
  assert.ok(coverOf(look, true, 0.9) > coverOf(look, true, 0));
});
