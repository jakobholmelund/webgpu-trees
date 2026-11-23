// The lab's trees: plain numbers made here, handed to the package as any host's would be.
// Each scene is a list of trees with their own measured sizes, as a survey gives them.

import { type TreeInstance, type TreeSpecies } from "../src/index";

/** A number 0..1 from an integer: the lab's own, so its scenes are the same every time. */
function rnd(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A tree of a species with its size varied as real trees of one kind vary: taller and shorter, wider and narrower, its crown higher or lower. */
function measured(sp: TreeSpecies, row: number, x: number, z: number, k: number, spread = 1): TreeInstance {
  const h = sp.height * (0.7 + rnd(k * 5 + 1) * 0.6 * spread + (1 - spread) * 0.3);
  const s = h / sp.height;
  return {
    x,
    y: 0,
    z,
    species: row,
    height: h,
    crownRadius: sp.crownRadius * s * (0.8 + rnd(k * 5 + 2) * 0.4 * spread + (1 - spread) * 0.2),
    crownBase: sp.crownBase * s * (0.7 + rnd(k * 5 + 3) * 0.6 * spread + (1 - spread) * 0.3),
    trunkRadius: sp.trunkRadius * s * (0.85 + rnd(k * 5 + 4) * 0.3),
  };
}

/** One of each species at its own size, in a row along x, 30 m apart. */
export function specimens(species: readonly TreeSpecies[]): TreeInstance[] {
  return species.map((_, i) => ({ x: (i - (species.length - 1) / 2) * 30, y: 0, z: 0, species: i }));
}

/** One tree of a species at its own size, at the plot's centre: the "One tree" scene. */
export function oneTree(row: number): TreeInstance[] {
  return [{ x: 0, y: 0, z: 0, species: row }];
}

/** Five trees of one species in a row, each a little different in size, as five of a kind measured in a park would be. */
export function specimenRow(sp: TreeSpecies, row: number): TreeInstance[] {
  const step = Math.max(10, sp.crownRadius * 3);
  return [0, 1, 2, 3, 4].map((i) => measured(sp, row, (i - 2) * step, 0, i + 1));
}

/** A grove: a few hundred trees of every kind in clumps over 300 m, with a clearing in the middle. */
export function grove(species: readonly TreeSpecies[], count = 400): TreeInstance[] {
  const out: TreeInstance[] = [];
  for (let k = 0; out.length < count && k < count * 20; k++) {
    const a = rnd(k * 3 + 11) * Math.PI * 2;
    const r = 40 + Math.sqrt(rnd(k * 3 + 12)) * 110;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // (Kinds in patches, as they are planted and seed: by where the tree stands.)
    const patch = Math.floor((Math.atan2(z, x) / (Math.PI * 2) + 0.5) * 7 + Math.sin(r / 30) * 0.8);
    const row = ((patch % species.length) + species.length) % species.length;
    out.push(measured(species[row], row, x, z, k));
  }
  return out;
}

/**
 * A course's worth of trees: about `count` over a square `side` metres across, in woods and lines with
 * fairways between them, as a parkland course is. The kinds go by woods.
 */
export function course(species: readonly TreeSpecies[], count = 30000, side = 2400): TreeInstance[] {
  const out: TreeInstance[] = [];
  const fairway = (x: number, z: number) => {
    // (Eighteen-ish winding strips with no trees on them.)
    const u = Math.abs(((x + 140 * Math.sin(z / 260)) % 360) + 360) % 360;
    return u > 150 && u < 230;
  };
  for (let k = 0; out.length < count && k < count * 6; k++) {
    const x = (rnd(k * 4 + 1) - 0.5) * side;
    const z = (rnd(k * 4 + 2) - 0.5) * side;
    if (fairway(x, z)) continue;
    // (Thicker in woods, thinner in the open between them.)
    const wood = 0.5 + 0.5 * Math.sin(x / 170) * Math.cos(z / 130) + 0.25 * Math.sin((x + z) / 90);
    if (rnd(k * 4 + 3) > wood) continue;
    const kind = Math.floor((Math.sin(x / 410 + 1.3) * Math.cos(z / 330) * 0.5 + 0.5) * species.length * 0.999 + rnd(k * 4 + 4) * 1.4) % species.length;
    out.push(measured(species[kind], kind, x, z, k));
  }
  return out;
}
