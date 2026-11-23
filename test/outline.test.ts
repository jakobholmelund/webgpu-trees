// A grown tree's outline against a real one's: the crown's width at each height, seen side-on, beside
// the width measured from a photograph of an open-grown tree of the species (test/outlines.json).
//
// Each species is grown at the photographed tree's own proportions (its crown's reach and base for its
// height), so what is compared is the shape of the crown between them: a dome or a diamond, a cone or
// a column, a flat top or a round one. The error is the mean difference in half-width over the bands,
// as a share of the widest: 0 is the photograph's outline exactly.
//
//   node --test test/outline.test.ts     (prints each species' error)

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ALL_SPECIES } from "../src/species.ts";
import { growTree } from "../src/grow.ts";
import { type GrownTree } from "../src/tree.ts";

interface Outline {
  name: string;
  bands: number;
  left: number[];
  right: number[];
  crownBase: number;
  crownRadius: number;
}

const outlines: Outline[] = JSON.parse(readFileSync(new URL("./outlines.json", import.meta.url), "utf8")).trees;

/**
 * A grown tree's half-width in each band from its foot to its top, as shares of its height: the widest
 * reach of its leaves and wood in that band, seen from eight sides and averaged (a photograph is one side;
 * a tree is not round).
 */
export function grownOutline(tree: GrownTree, bands: number): number[] {
  const h = tree.size.height;
  const out = new Array<number>(bands).fill(0);
  const views = 8;
  const sk = tree.skeleton;
  const cl = tree.clumps;
  for (let v = 0; v < views; v++) {
    const a = (v / views) * Math.PI;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    const left = new Array<number>(bands).fill(0);
    const right = new Array<number>(bands).fill(0);
    const mark = (x: number, z: number, y0: number, y1: number, r: number) => {
      const across = x * cx + z * cz;
      const b0 = Math.max(0, Math.floor((y0 / h) * bands));
      const b1 = Math.min(bands - 1, Math.floor((y1 / h) * bands));
      for (let b = b0; b <= b1; b++) {
        left[b] = Math.max(left[b], -across + r);
        right[b] = Math.max(right[b], across + r);
      }
    };
    for (let i = 0; i < cl.count; i++) mark(cl.x[i], cl.z[i], cl.y[i] - cl.radius[i] * 0.7, cl.y[i] + cl.radius[i] * 0.7, cl.radius[i] * 0.85);
    for (let i = 0; i < sk.count; i++) mark(sk.x[i], sk.z[i], sk.y[i], sk.y[i], sk.radius[i]);
    for (let b = 0; b < bands; b++) out[b] += (left[b] + right[b]) / 2 / h / views;
  }
  return out;
}

/** How far a grown outline is from a photographed one: mean difference in half-width, as a share of the photograph's widest. */
export function outlineError(grown: number[], photo: Outline): number {
  const half = photo.left.map((l, i) => (l + photo.right[i]) / 2);
  const widest = Math.max(...half);
  let sum = 0;
  for (let i = 0; i < half.length; i++) sum += Math.abs(grown[i] - half[i]);
  return sum / half.length / widest;
}

/** How far each species' outline may be from its photograph's, for now: tightened as the grower gets better. */
const ALLOWED = 0.12;

for (const photo of outlines) {
  const species = ALL_SPECIES.find((s) => s.name === photo.name);
  test(`${photo.name}: its outline is the photographed tree's`, { skip: !species && "no species of this name" }, () => {
    if (!species) return;
    const height = species.height;
    const errors = [1, 2, 77].map((seed) => {
      const tree = growTree(species, { height, crownRadius: photo.crownRadius * height, crownBase: photo.crownBase * height, trunkRadius: species.trunkRadius }, seed);
      return outlineError(grownOutline(tree, photo.bands), photo);
    });
    const mean = errors.reduce((a, e) => a + e, 0) / errors.length;
    console.log(`outline ${photo.name}: ${(mean * 100).toFixed(1)}% off the photograph (seeds ${errors.map((e) => (e * 100).toFixed(0)).join(", ")})`);
    assert.ok(mean < ALLOWED, `${photo.name} is ${(mean * 100).toFixed(1)}% off its photograph's outline`);
  });
}
