// The realistic look's crowns held to their photographs: a Monterey pine's clumps with sky between them, a Monterey
// cypress's limbs clothed under its shelves, a Torrey pine's tufts its own shoots
// as brushes, and every conifer of the owner's last batch in its own bark and shoots.
//
//   node --test test/realLook.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { cardPieces } from "../src/geometry.ts";
import { growTree } from "../src/grow.ts";
import { SCAN_LOOKS, barkSet, leafSet } from "../src/scans.ts";
import { ALL_SPECIES } from "../src/species.ts";

const species = (name: string) => ALL_SPECIES.find((s) => s.name === name)!;
const grow = (name: string, seed: number) => {
  const sp = species(name);
  return growTree(sp, { height: sp.height, crownRadius: sp.crownRadius, crownBase: sp.crownBase, trunkRadius: sp.trunkRadius }, seed);
};

/**
 * The share of sky inside a crown seen side-on (along x and along z), between its outermost leaves on each row: each
 * clump drawn as its cushion card's picture is, a dome `size` of its radii wide (four fifths of its card) and 0.7 as high.
 */
function skyInside(name: string, size: number): number {
  const sp = species(name);
  let sky = 0;
  let all = 0;
  for (const seed of [1, 2, 3]) {
    const c = grow(name, seed).clumps;
    const R = sp.crownRadius * 1.3;
    for (const view of [0, 1]) {
      for (let y = sp.crownBase; y < sp.height * 1.05; y += 0.15) {
        const row: boolean[] = [];
        for (let x = -R; x < R; x += 0.15) {
          let hit = false;
          for (let i = 0; i < c.count && !hit; i++) {
            const r = c.radius[i] * size * 0.8;
            hit = ((x - (view ? c.z[i] : c.x[i])) / r) ** 2 + ((y - c.y[i]) / (r * 0.7)) ** 2 < 1;
          }
          row.push(hit);
        }
        const first = row.indexOf(true);
        if (first < 0) continue;
        for (let k = first; k <= row.lastIndexOf(true); k++) {
          all++;
          if (!row[k]) sky++;
        }
      }
    }
  }
  return sky / all;
}

test("a Monterey pine's crown is distinct clumps with sky between them, not one heavy mass", () => {
  // (Its cushions a clump: 2.1 of its radii, and its clumps even through the crown, left under 1% of sky inside it.)
  const share = skyInside("Monterey pine", SCAN_LOOKS["Monterey pine"].cushionSize!);
  assert.ok(share > 0.06 && share < 0.3, `${(share * 100).toFixed(1)}% sky inside the crown`);
  assert.ok((species("Monterey pine").clusters ?? 0) > 0, "its leaves gather into bunches at its branches' ends");
});

test("a Monterey cypress's limbs are clothed under its shelves", () => {
  const t = grow("Monterey cypress", 1);
  const base = { half: 0.39, fill: 0.5, most: 24, big: 4, bigSize: 2.8, hang: 0.35 };
  const bare = cardPieces([t], 12, 0.8, undefined, [base], undefined, [true]);
  const clothed = cardPieces([t], 12, 0.8, undefined, [{ ...base, clothe: 5 }], undefined, [true]);
  const cards = (p: typeof bare) => p.attributes.position.array.length / 12;
  const added = cards(clothed) - cards(bare);
  assert.ok(added >= t.clumps.count * 2, `${added} sprays clothing the wood under ${t.clumps.count} clumps`);
  // (The added sprays lie lower than the clumps they lead into, on the whole.)
  const pos = clothed.attributes.position.array;
  const off = clothed.attributes.aOffset.array;
  let below = 0;
  let n = 0;
  const lowest = Math.min(...Array.from(t.clumps.y).slice(0, t.clumps.count));
  for (let q = cards(bare); q < cards(clothed); q++) {
    n++;
    if (pos[q * 12 + 1] < lowest + 0.5 || off[q * 16 + 3] === 0) below++;
  }
  assert.ok(below / n > 0.5, `${below} of ${n} clothing sprays are small sprays low on the wood`);
});

test("a Torrey pine's tufts are its own shoots, laid as brushes over its drawn needles", () => {
  const l = SCAN_LOOKS["Torrey pine"];
  assert.equal(l.tuftPicture, true);
  assert.equal(l.leaves, "torreyPine");
  assert.ok((l.tuftFan ?? 1) >= 3, "fanned into a brush all round its shoot's end");
  assert.ok((l.tuftShoot ?? 3) < 2, "its picture mostly brush: some two needles long");
  assert.ok((l.tuftFrom ?? 0) > 0, "laid from where its brush begins, its bare twig the card's own wood");
});

test("every conifer of the last batch wears its own bark and shoots", () => {
  const own: [string, string, string | null][] = [
    ["Monterey pine", "montereyPine", null],
    ["Aleppo pine", "aleppoPine", null],
    ["Corsican pine", "corsicanPine", "corsicanShoot"],
    ["Eastern white pine", "whitePine", null],
    ["Sitka spruce", "sitkaSpruce", "sitkaShoot"],
    ["White spruce", "whiteSpruce", "whiteSpruceShoot"],
    ["Monterey cypress", "cypress", null],
    ["Douglas fir", "douglas", "douglasShoot"],
  ];
  for (const [name, bark, leaves] of own) {
    const l = SCAN_LOOKS[name];
    assert.equal(l.bark, bark, `${name}'s bark`);
    assert.equal(barkSet(bark)?.origin, bark === "douglas" ? "scan" : "generated", `${bark} in scans.json`);
    if (leaves) {
      assert.equal(l.leaves, leaves, `${name}'s shoots`);
      assert.ok((leafSet(leaves)?.sprites.length ?? 0) >= 2, `${leaves}: two shoots at the least`);
    }
  }
  assert.equal(SCAN_LOOKS["Corsican pine"].tuftPicture, true, "a Corsican pine's tufts from its own shoots");
});
