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

/**
 * A wood's edge across open ground, as a fairway sees one: a stand of several hundred trees, its edge
 * running along x in bays and points, the wood to the north (z below the edge) some 160 m deep and the open
 * ground to the south, so the sun is on the edge's face; oak and beech with birch along the edge and
 * patches of spruce and Scots pine behind, and two trees standing alone out in the open. Under it, as a
 * wood has: a mantle of hawthorn and shrubs along its edge, and young trees and shrubs scattered inside.
 * The trees are measured as a host with only a survey has them, all alike wherever they stand: a wood's
 * crowns narrower than a park tree's, close enough that they touch. Where each stands (edge, interior) is
 * left to the package to work out.
 */
export function woodland(species: readonly TreeSpecies[]): TreeInstance[] {
  const row = (name: string, or: number) => {
    const i = species.findIndex((s) => s.name === name);
    return i >= 0 ? i : Math.min(or, species.length - 1);
  };
  const oak = row("Oak", 0);
  const beech = row("Beech", 0);
  const birch = row("Silver birch", 0);
  const spruce = row("Spruce", 0);
  const pine = row("Scots pine", 0);
  const edgeAt = (x: number) => 18 * Math.sin(x / 41) + 9 * Math.sin(x / 17 + 1.3) + 4 * Math.sin(x / 7.3 + 0.4);
  const out: TreeInstance[] = [];
  // (Dart throwing over a grid of 4 m cells: each tree keeps its neighbours about a crown's width off.)
  const cell = 4;
  const taken = new Map<string, number[]>();
  const room = (x: number, z: number, r: number) => {
    const ix = Math.floor(x / cell);
    const iz = Math.floor(z / cell);
    for (let a = -3; a <= 3; a++)
      for (let b = -3; b <= 3; b++)
        for (const k of taken.get(`${ix + a},${iz + b}`) ?? []) {
          const t = out[k];
          if (Math.hypot(t.x - x, t.z - z) < 0.72 * (r + (t.crownRadius ?? 0))) return false;
        }
    return true;
  };
  for (let k = 0; k < 100000 && out.length < 1400; k++) {
    const x = (rnd(k * 7 + 101) - 0.5) * 340;
    const z = edgeAt(x) - rnd(k * 7 + 102) * 160;
    const into = edgeAt(x) - z;
    // (Kinds in patches: conifers in blocks behind, birch along the edge, oak and beech the rest.)
    const patch = Math.sin(x / 47 + 0.7) * Math.cos(z / 39) + 0.4 * Math.sin((x - z) / 23);
    const kind = into > 35 && patch > 0.45 ? (patch > 0.8 ? spruce : pine) : into < 14 && rnd(k * 7 + 103) < 0.3 ? birch : patch < -0.2 ? beech : oak;
    const sp = species[kind];
    const h = sp.height * (0.85 + rnd(k * 7 + 104) * 0.3);
    const s = h / sp.height;
    const r = Math.max(2.2, Math.min(sp.crownRadius * 0.55, 6.5)) * s * (0.85 + rnd(k * 7 + 105) * 0.3);
    if (!room(x, z, r)) continue;
    const t: TreeInstance = { x, y: 0, z, species: kind, height: h, crownRadius: r, crownBase: sp.crownBase * s * (0.8 + rnd(k * 7 + 106) * 0.4), trunkRadius: sp.trunkRadius * s * (0.75 + rnd(k * 7 + 107) * 0.25) };
    const key = `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    let list = taken.get(key);
    if (!list) taken.set(key, (list = []));
    list.push(out.length);
    out.push(t);
  }
  // The undergrowth: a mantle of hawthorn and shrubs along the edge, where the light comes in from the side,
  // and young beech, spruce and hawthorn, and shrubs, scattered in the wood's shade.
  const thorn = row("Hawthorn", 0);
  const shrub = row("Shrub", 0);
  const under: TreeInstance[] = [];
  const clear = (x: number, z: number, r: number) => under.every((t) => Math.hypot(t.x - x, t.z - z) >= 0.8 * (r + (t.crownRadius ?? 0)));
  for (let k = 0; k < 20000 && under.length < 360; k++) {
    const x = (rnd(k * 5 + 901) - 0.5) * 340;
    const mantle = k % 3 !== 2;
    const into = mantle ? -2 + rnd(k * 5 + 902) * 9 : 6 + rnd(k * 5 + 902) * 150;
    const z = edgeAt(x) - into;
    const pick = rnd(k * 5 + 903);
    const kind = mantle ? (pick < 0.55 ? thorn : shrub) : pick < 0.3 ? beech : pick < 0.45 ? spruce : pick < 0.7 ? thorn : shrub;
    const sp = species[kind];
    // (Young trees inside: a third to half of a grown one's height; the mantle's at their own.)
    const young = !mantle && (kind === beech || kind === spruce);
    const h = sp.height * (young ? 0.3 + rnd(k * 5 + 904) * 0.2 : 0.7 + rnd(k * 5 + 904) * 0.5);
    const s = h / sp.height;
    const r = sp.crownRadius * s * (young ? 0.6 : 0.8 + rnd(k * 5 + 905) * 0.4);
    if (!clear(x, z, r)) continue;
    under.push({ x, y: 0, z, species: kind, height: h, crownRadius: r, crownBase: sp.crownBase * s * (young ? 0.3 : 1), trunkRadius: sp.trunkRadius * s });
  }
  out.push(...under);
  // Two standing alone out in the open: an oak and a beech, grown as park trees are.
  out.push({ x: -55, y: 0, z: 45, species: oak });
  out.push({ x: 70, y: 0, z: 60, species: beech });
  return out;
}
