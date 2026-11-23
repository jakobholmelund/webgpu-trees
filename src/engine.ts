// The trees themselves: a few grown, every tree on the ground fitted to one,
// and each drawn at the distance it is seen from.
//
// Each frame a compute pass looks at every tree: is it in view, and how tall
// is it in the picture? By that it is put on the list of one of three tiers
// (near: wood and many small dabs; mid: limbs and one dab a clump; far: a few
// broad dabs and a stroke for the trunk), or of two while it passes from one
// to the next. The lists are kept apart by variant, and the graphics card
// draws each variant's pieces once for every tree on its list: one mesh a
// tier draws every variant, and nothing the eye cannot see costs a vertex.
//
// A tree passing between tiers is drawn by both, each in the pixels the
// other leaves (a fixed pattern on the screen, the share of it going over as
// the tree's size in the picture changes), so it never jumps from one to the
// other.
//
// Wind, light and the fit to each tree's size are worked out in the vertex
// shaders from the tree's own numbers and the time: nothing is kept from one
// frame to the next.

import * as THREE from "three/webgpu";
import { Fn, If, atan, atomicAdd, atomicLoad, atomicStore, attribute, bitXor, cameraPosition, cameraWorldMatrix, clamp, cos, cross, dot, exp, float, floor, instanceIndex, length, max, min, mix, mod, normalize, positionGeometry, pow, screenCoordinate, select, shiftRight, sin, smoothstep, sqrt, step, storage, texture, uint, uniform, uniformArray, varying, vec2, vec3, vec4, Discard } from "three/tsl";
import { makeDabAtlas } from "./dabs.ts";
import { makeLeafAtlas } from "./leaves.ts";
import { type Pieces, TIER_SHAPES, cardPieces, dabPieces, woodPieces } from "./geometry.ts";
import { growTree } from "./grow.ts";
import { LEAF_KIND_ROWS, type TreeSpecies } from "./species.ts";
import { type GrownTree, type TreeSize } from "./tree.ts";
import { DEFAULT_VARIANT_OPTIONS, type Plan, type TreeInstance, type VariantOptions, packTrees, planVariants } from "./variants.ts";

type Float = THREE.Node<"float">;
type Vec2 = THREE.Node<"vec2">;
type Vec3 = THREE.Node<"vec3">;
type Vec4 = THREE.Node<"vec4">;
type UInt = THREE.Node<"uint">;

const TIERS = 3;

/** How the trees are drawn, apart from what they are. Change it at any time: it is read each frame. */
export interface TreeStyle {
  /** How far a crown's light is laid in flat bands, as paint is, 0 (smooth) to 1 (bands only). */
  steps: number;
  /** How many bands of light, from shade to sun. */
  bands: number;
  /** How round each clump of leaves is lit, 0 (as the crown's outside faces) to 1 (each clump a ball of its own). */
  round: number;
  /** How much one dab differs in tone from the next, 0..1. */
  jitter: number;
  /** How big the dabs are, beside what covers their clump: 1 as grown. */
  dabScale: number;
  /** How much sunlight comes through the leaves to an eye looking towards the sun, 0..1. */
  through: number;
  /** How far the light wraps round past the side of a clump facing away from the sun, 0..1. */
  wrap: number;
  /** How strongly the brush's strokes show in a dab, 0..1. */
  strokes: number;
  /**
   * How far a crown shades itself, 0..1: 1, as much as the light lost through its leaves makes it (Monsi and
   * Saeki); 0, not at all, every leaf facing the sun as lit as the crown's outside. A painter keeps less of it
   * than there is.
   */
  selfShade: number;
  /** How square to the sun a leaf must face to take all of it: 0.65 lights a form as a painter does, 1 as the sun does. */
  fullLight: number;
  /** How furrowed the bark is, 0 (smooth, a painted trunk) to 1. */
  bark: number;
  /** How far a realistic tree's near leaf cards turn towards the eye, 0..1: none at all shows some edge-on as slivers. */
  faceEye: number;
}

export const DEFAULT_STYLE: TreeStyle = { steps: 0.75, bands: 3, round: 0.45, jitter: 0.35, dabScale: 1, through: 0.5, wrap: 0.35, strokes: 0.6, selfShade: 0.5, fullLight: 0.65, bark: 0, faceEye: 0.35 };

/** The realistic look's style: light as the sun gives it, the crown's shade, light through the leaves, furrowed bark. */
// (selfShade a half, as the painted look's: the crown's own shade taken in full, through a whole leafy
// shell, leaves out the light the leaves scatter to one another, and a sunlit crown comes out dark.)
export const REAL_STYLE: TreeStyle = { steps: 0, bands: 3, round: 0.3, jitter: 0.15, dabScale: 1, through: 0.8, wrap: 0.3, strokes: 1, selfShade: 0.45, fullLight: 0.9, bark: 1, faceEye: 0.35 };

/**
 * How the trees are drawn, chosen when they are made (the pieces differ, not only the light): `stylized`,
 * crowns laid in dabs of paint; `real`, near crowns of leaf cards set in the crown, each a spray of the
 * species' leaves, and far ones of the same sprays.
 */
export type TreeLook = "stylized" | "real";

/** At what size in the picture each tier takes over, and how far trees are drawn at all. Read each frame. */
export interface TreeDetail {
  /** A tree taller than this in the picture (pixels) is drawn near. */
  nearPx: number;
  /** One shorter than this, far. */
  farPx: number;
  /** How wide the hand-over is, as a share either side of each size. */
  band: number;
  /** No tree is drawn beyond this (m). */
  range: number;
}

export const DEFAULT_DETAIL: TreeDetail = { nearPx: 260, farPx: 70, band: 0.2, range: 3000 };

/** See `TreesOptions.world`. Either may be left out. */
export interface TreeWorld {
  /** How much of the sun reaches a place on the ground below, 0..1 (a cloud's shadow), for the leaves above it. */
  sun?(xz: Vec2): Float;
  /** The air between a tree and the eye: given its colour and where it is, the colour that reaches the eye. Called in a vertex shader. */
  air?(colour: Vec3, at: Vec3): Vec3;
}

export interface TreesOptions {
  /** The trees on the ground: a list, or packed (see `packTrees`). */
  trees: readonly TreeInstance[] | Float32Array;
  species: readonly TreeSpecies[];
  variants?: Partial<VariantOptions>;
  world?: TreeWorld;
  /** Grow trees some other way than this library's (see `growTree`). */
  grow?: (species: TreeSpecies, size: TreeSize, seed: number) => GrownTree;
  /** The look (`stylized` unless given). `style` starts as the look's (DEFAULT_STYLE or REAL_STYLE). */
  look?: TreeLook;
}

export interface Trees {
  /** Add this to the scene. */
  object: THREE.Group;
  /**
   * The light and the air, for the host to set, as the grass library takes them: `sun` points at the sun;
   * a leaf is lit `sunTint` where the sun reaches it and `shadeTint` where only the sky does; `wind` is
   * its heading (x, y: unit, in the ground's x and z) and its speed in metres a second (z).
   */
  environment: { sun: THREE.Vector3; sunTint: THREE.Vector3; shadeTint: THREE.Vector3; wind: THREE.Vector3 };
  style: TreeStyle;
  detail: TreeDetail;
  /** What was grown and how the trees were fitted to it. */
  readonly plan: Plan;
  /** The trees as grown, by variant. */
  readonly grown: readonly GrownTree[];
  /** Each tier's pieces for one tree of each variant, all told: dabs and pieces of wood. */
  readonly pieces: { dabs: number; wood: number }[];
  /** Once a frame, before rendering. */
  update(renderer: THREE.WebGPURenderer, camera: THREE.PerspectiveCamera, timeS: number): void;
  /** How many trees each tier drew last frame: read back from the graphics card, so not every frame. */
  countDrawn(renderer: THREE.WebGPURenderer): Promise<number[]>;
  /**
   * Read the species' colours, light and stiffness again (or from another list in the same order). What
   * shapes a tree (its branching, clumps, crown) is read when it is grown: for those, create the trees again.
   */
  setSpecies(list: readonly TreeSpecies[]): void;
  /**
   * Work out the trees' shade on the ground over an area (`cell` metres to a texel), for the sun as
   * `environment.sun` has it now: how much of the sun reaches each place past the crowns, which take it
   * as their leaves do (exp(-k L) over the leafy shell it crosses, the crown as its ellipsoid). The ground
   * is taken as level at each tree's foot. Do it again when the sun has moved.
   */
  bakeShade(area: { x0: number; z0: number; width: number; depth: number; cell: number }): void;
  /**
   * How much of the sun reaches a place on the ground past the trees, 0..1, from the last `bakeShade` (1
   * outside it, or before it): for a host's ground and grass (the grass library's `world.sun`).
   */
  sunAt(xz: Vec2): Float;
  /** Which tiers are drawn (for looking at one alone). */
  show: { near: boolean; mid: boolean; far: boolean; wood: boolean; leaves: boolean };
  dispose(): void;
}

function linear(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function createTrees(options: TreesOptions): Trees {
  let species = options.species;
  const packed = options.trees instanceof Float32Array ? options.trees : packTrees(options.trees);
  const plan = planVariants(packed, species, { ...DEFAULT_VARIANT_OPTIONS, ...options.variants });
  const grow = options.grow ?? growTree;
  const grown = plan.variants.map((v) => grow(species[v.species], v.size, v.seed));
  const N = plan.placements.length;
  const V = plan.variants.length;
  const world = options.world ?? {};

  const group = new THREE.Group();
  group.name = "trees";
  const look: TreeLook = options.look ?? "stylized";
  const real = look === "real";
  const style: TreeStyle = { ...(real ? REAL_STYLE : DEFAULT_STYLE) };
  const detail: TreeDetail = { ...DEFAULT_DETAIL };
  const show = { near: true, mid: true, far: true, wood: true, leaves: true };

  // ---- What the shaders read: the trees, the variants, the species. ----

  // Four rows a tree: where (x, y, z) and which way (yaw); its size; its tint and a number of its own; its
  // lean (x, z), whether mirrored, and its variant.
  const treeData = new Float32Array(Math.max(1, N) * 16);
  plan.placements.forEach((p, i) => {
    treeData.set([p.x, p.y, p.z, p.yaw, p.size.height, p.size.crownBase, p.size.crownRadius, p.size.trunkRadius, p.tint[0], p.tint[1], p.tint[2], p.own, p.leanX, p.leanZ, p.mirror, p.variant], i * 16);
  });
  // Two rows a variant: its size as grown; where its lists start, how long each is, and its species.
  const counts = plan.variants.map((v) => v.trees);
  const starts: number[] = [];
  counts.reduce((sum, n, v) => ((starts[v] = sum), sum + n), 0);
  const variantData = new Float32Array(Math.max(1, V) * 8);
  plan.variants.forEach((v, i) => {
    const g = grown[i].size;
    variantData.set([g.height, g.crownBase, g.crownRadius, g.trunkRadius, starts[i] * TIERS, counts[i], v.species, 0], i * 8);
  });
  // Four rows a species: its leaves' colour (linear) and how much it varies; its bark's, and how pale it
  // goes up the trunk; the colour of light through its leaves, and its stiffness; how fast its crown
  // takes the light (per metre).
  const speciesData = new Float32Array(Math.max(1, species.length) * 16);
  const packSpecies = () => {
    species.forEach((s, i) => {
      const leaf = linear(s.leafColor);
      const bark = linear(s.barkColor);
      // (Leaf area per cubic metre of crown, about 0.3 in an open crown to 1.4 in a dense one, half of it
      // facing any one way: Monsi and Saeki's extinction through a crown, with G = 0.5.)
      const k = 0.5 * (0.3 + (1 - s.openness) * 1.1);
      speciesData.set([leaf.r, leaf.g, leaf.b, s.leafVariation, bark.r, bark.g, bark.b, s.barkPale, s.throughTint[0], s.throughTint[1], s.throughTint[2], s.stiffness, k, s.foliageDepth, Math.max(0, LEAF_KIND_ROWS.indexOf(s.leafKind)), 0], i * 16);
    });
  };
  packSpecies();

  const treeAttr = new THREE.StorageBufferAttribute(treeData, 4);
  const variantAttr = new THREE.StorageBufferAttribute(variantData, 4);
  const speciesAttr = new THREE.StorageBufferAttribute(speciesData, 4);
  const treesR = storage(treeAttr, "vec4", treeData.length / 4).toReadOnly();
  const variantsR = storage(variantAttr, "vec4", variantData.length / 4).toReadOnly();
  const speciesR = storage(speciesAttr, "vec4", speciesData.length / 4).toReadOnly();

  // The lists: for each variant, a run of places for each tier, as many as it has trees.
  const visibleAttr = new THREE.StorageBufferAttribute(new Uint32Array(Math.max(1, N * TIERS)), 1);
  const visibleW = storage(visibleAttr, "uint", Math.max(1, N * TIERS));
  const visibleR = storage(visibleAttr, "uint", Math.max(1, N * TIERS)).toReadOnly();
  // How many trees each tier of each variant has this frame (tier-major: tier * V + variant).
  const countAttr = new THREE.StorageBufferAttribute(new Uint32Array(Math.max(1, V * TIERS)), 1);
  const countStore = storage(countAttr, "uint", Math.max(1, V * TIERS)).toAtomic();

  // ---- The pieces, and their draws. ----

  // (The realistic look's near leaves are cards set in the crown; further off, both looks' are dabs.)
  const dabSets: Pieces[] = TIER_SHAPES.map((s, t) => (real && t === 0 ? cardPieces(grown, 12, 0.8) : dabPieces(grown, s)));
  const strokeSets: Pieces[] = TIER_SHAPES.map((s) => dabPieces(grown, s, "stroke"));
  const woodSets: Pieces[] = TIER_SHAPES.map((s) => woodPieces(grown, s));
  const makeArgs = (sets: Pieces[]) => {
    const a = new Uint32Array(Math.max(1, TIERS * V) * 5);
    sets.forEach((set, t) =>
      set.ranges.forEach((r, v) => {
        a.set([r.indexCount, 0, r.firstIndex, r.baseVertex, 0], (t * V + v) * 5);
      }),
    );
    return new THREE.IndirectStorageBufferAttribute(a, 5);
  };
  const dabArgs = makeArgs(dabSets);
  const woodArgs = makeArgs(woodSets);
  const strokeArgs = makeArgs(strokeSets);
  const dabArgsStore = storage(dabArgs, "uint", dabArgs.array.length);
  const woodArgsStore = storage(woodArgs, "uint", woodArgs.array.length);
  const strokeArgsStore = storage(strokeArgs, "uint", strokeArgs.array.length);

  // ---- Uniforms. ----

  const uSun = uniform(new THREE.Vector3(0.4, 0.8, 0.3).normalize());
  const uSunTint = uniform(new THREE.Vector3(1.0, 0.96, 0.88));
  const uShadeTint = uniform(new THREE.Vector3(0.42, 0.48, 0.58));
  const uWind = uniform(new THREE.Vector3(1, 0, 3));
  const uTime = uniform(0);
  const uCam = uniform(new THREE.Vector3());
  const uPlanes = uniformArray(Array.from({ length: 6 }, () => new THREE.Vector4()), "vec4");
  /** Pixels in the picture a metre a metre away covers. */
  const uPxPerM = uniform(1000);
  const uDetail = uniform(new THREE.Vector4(DEFAULT_DETAIL.nearPx, DEFAULT_DETAIL.farPx, DEFAULT_DETAIL.band, DEFAULT_DETAIL.range));
  const uStyle = uniform(new THREE.Vector4());
  const uStyle2 = uniform(new THREE.Vector4());
  /** selfShade, fullLight, bark, faceEye. */
  const uStyle3 = uniform(new THREE.Vector4(0.5, 0.65, 0, 0.35));
  /** Below this a dab's texel is not drawn: next to nothing with alpha to coverage, half without it. */
  const uAlphaCut = uniform(0.02);

  // ---- The pass that finds the trees in view. ----

  /** How much of a tree each tier draws: the share of the pattern below which it is drawn, from and to. */
  const tierShares = (px: Float) => {
    const near = clamp(px.sub(uDetail.x.mul(float(1).sub(uDetail.z))).div(uDetail.x.mul(uDetail.z).mul(2)), 0, 1);
    const far = clamp(px.sub(uDetail.y.mul(float(1).sub(uDetail.z))).div(uDetail.y.mul(uDetail.z).mul(2)), 0, 1);
    return { near, far };
  };

  const cull = Fn(() => {
    const id = instanceIndex;
    If(id.lessThan(uint(N)), () => {
      const r0 = treesR.element(id.mul(4));
      const r1 = treesR.element(id.mul(4).add(1));
      const r3 = treesR.element(id.mul(4).add(3));
      const v = uint(r3.w);
      // (A sphere round the whole tree, foot to top and crown wide, leant as far as it may.)
      const centre = vec3(r0.x, r0.y.add(r1.x.mul(0.5)), r0.z);
      const radius = max(r1.x.mul(0.55), r1.z).add(r1.x.mul(0.06));
      const seen = float(1).toVar();
      for (let p = 0; p < 6; p++) {
        const plane = uPlanes.element(p) as unknown as Vec4;
        If(dot(plane.xyz, centre).add(plane.w).lessThan(radius.negate()), () => {
          seen.assign(0);
        });
      }
      const dist = length(centre.sub(uCam));
      If(seen.greaterThan(0.5).and(dist.lessThan(uDetail.w)), () => {
        const px = r1.x.mul(uPxPerM).div(max(dist, float(0.1)));
        const { near, far } = tierShares(px);
        const vrow = variantsR.element(v.mul(2).add(1));
        const base = uint(vrow.x);
        const n = uint(vrow.y);
        const put = (t: number) => {
          const slot = atomicAdd(countStore.element(uint(t * V).add(v)), uint(1));
          visibleW.element(base.add(n.mul(t)).add(slot)).assign(id);
        };
        If(near.greaterThan(0), () => put(0));
        If(near.lessThan(1).and(far.greaterThan(0)), () => put(1));
        If(far.lessThan(1), () => put(2));
      });
    });
  })().compute(Math.max(1, N));

  // The counts go into the draws' arguments, and are cleared for the next frame.
  const finish = Fn(() => {
    const k = instanceIndex;
    If(k.lessThan(uint(TIERS * V)), () => {
      const c = atomicLoad(countStore.element(k));
      dabArgsStore.element(k.mul(5).add(1)).assign(c);
      woodArgsStore.element(k.mul(5).add(1)).assign(c);
      strokeArgsStore.element(k.mul(5).add(1)).assign(c);
      atomicStore(countStore.element(k), uint(0));
    });
  })().compute(Math.max(1, TIERS * V));

  // ---- What every tree's shaders share: which tree, its fit, its wind, its light. ----

  /** The tree this instance of variant `v` in tier `t` is, and its rows. */
  const treeOf = (t: number, v: Float) => {
    const vrow0 = variantsR.element(uint(v).mul(2));
    const vrow1 = variantsR.element(uint(v).mul(2).add(1));
    const id = visibleR.element(uint(vrow1.x).add(uint(vrow1.y).mul(t)).add(instanceIndex));
    const r0 = treesR.element(id.mul(4));
    const r1 = treesR.element(id.mul(4).add(1));
    const r2 = treesR.element(id.mul(4).add(2));
    const r3 = treesR.element(id.mul(4).add(3));
    const rows = [0, 1, 2, 3].map((k) => speciesR.element(uint(vrow1.z).mul(4).add(k)));
    const srow = (k: number) => rows[k];
    // (Its yaw's cosine and sine, once: every turn into and out of the tree's frame uses them.)
    const yawC = cos(r0.w);
    const yawS = sin(r0.w);
    return { vrow0, vrow1, r0, r1, r2, r3, srow, yawC, yawS };
  };
  type TreeRows = ReturnType<typeof treeOf>;

  /** How a variant is stretched to a tree: across, up its trunk, up its crown; and its wood's thickness. */
  const fitOf = (T: TreeRows) => {
    const across = T.r1.z.div(T.vrow0.z);
    const trunkUp = T.r1.y.div(max(T.vrow0.y, float(0.01)));
    const crownUp = T.r1.x.sub(T.r1.y).div(max(T.vrow0.x.sub(T.vrow0.y), float(0.01)));
    const wood = T.r1.w.div(T.vrow0.w);
    const point = (p: Vec3): Vec3 => {
      const y = select(p.y.lessThan(T.vrow0.y), p.y.mul(trunkUp), T.r1.y.add(p.y.sub(T.vrow0.y).mul(crownUp)));
      return vec3(p.x.mul(T.r3.z).mul(across), y, p.z.mul(across));
    };
    const normal = (n: Vec3): Vec3 => normalize(vec3(n.x.mul(T.r3.z).div(across), n.y.div(crownUp), n.z.div(across)));
    const radial = (n: Vec3): Vec3 => vec3(n.x.mul(T.r3.z), n.y, n.z);
    return { across, trunkUp, crownUp, wood, point, normal, radial, size: across.add(crownUp).mul(0.5) };
  };

  /** How light a tree's bark is beside its species': a tenth either way, by its own number (its tint and palette are its leaves'). */
  const barkTone = (T: TreeRows): Float => float(0.9).add(T.r2.w.mul(0.2));

  /** Into the world: leant, turned and stood at the tree's foot. */
  const toWorld = (T: TreeRows, q: Vec3): Vec3 => {
    const lx = q.x.add(T.r3.x.mul(q.y));
    const lz = q.z.add(T.r3.y.mul(q.y));
    const c = T.yawC;
    const s = T.yawS;
    return vec3(T.r0.x.add(lx.mul(c).add(lz.mul(s))), T.r0.y.add(q.y), T.r0.z.add(lz.mul(c).sub(lx.mul(s))));
  };
  const dirToWorld = (T: TreeRows, n: Vec3): Vec3 => {
    const c = T.yawC;
    const s = T.yawS;
    return vec3(n.x.mul(c).add(n.z.mul(s)), n.y, n.z.mul(c).sub(n.x.mul(s)));
  };
  /** A direction in the world, into the tree's own frame (before its yaw). */
  const dirToTree = (T: TreeRows, n: Vec3): Vec3 => {
    const c = T.yawC;
    const s = T.yawS;
    return vec3(n.x.mul(c).sub(n.z.mul(s)), n.y, n.z.mul(c).add(n.x.mul(s)));
  };

  /**
   * How a point of the tree (its own frame, fitted) moves in the wind. The whole tree leans with the gusts
   * as they reach it, a tall one later and slower; each limb swings about its foot on its own beat, by how
   * far out along it the point is. `limb` is the limb's foot (fitted); `onLimb` 0 for a stem.
   */
  const windAt = (T: TreeRows, p: Vec3, limb: Vec3, onLimb: Float): Vec3 => {
    const h = T.r1.x;
    const stiff = T.srow(2).w;
    const speed = uWind.z;
    const dir = vec2(uWind.x, uWind.y);
    const dirTree = dirToTree(T, vec3(dir.x, 0, dir.y));
    // (The gust at the tree, as it was a moment ago at its crown: gusts roll downwind at about the wind's speed, in waves of tens of metres.)
    const lag = sqrt(h).mul(0.15);
    const along = dot(vec2(T.r0.x, T.r0.z), dir);
    const across = dot(vec2(T.r0.x, T.r0.z), vec2(dir.y.negate(), dir.x));
    const wave = along.sub(speed.mul(uTime.sub(lag)));
    const gust = float(0.55).add(sin(wave.mul(0.11)).mul(0.3)).add(sin(wave.mul(0.047).add(across.mul(0.021))).mul(0.25));
    const push = min(speed.mul(speed).div(100), float(4)).mul(float(1).sub(stiff.mul(0.85)));
    // (Its own sway: about half a cycle a second for a tree of 15 m, slower for a taller one.)
    const beat = float(2.6).div(sqrt(max(h, float(1)))).mul(uTime).add(T.r2.w.mul(6.283));
    const lean = push.mul(gust).add(sin(beat).mul(push.mul(0.25).add(0.02))).mul(h).mul(0.03);
    const up = clamp(p.y.div(h), 0, 1);
    const trunk = vec3(dirTree.x, 0, dirTree.z).mul(lean.mul(up.mul(up)));
    // (A limb: its own beat, from where it leaves the trunk.)
    const arm = length(p.sub(limb));
    const phase = limb.x.mul(1.37).add(limb.y.mul(0.71)).add(limb.z.mul(1.13)).add(T.r2.w.mul(17));
    const swing = sin(uTime.mul(float(2.1).add(speed.mul(0.06))).add(phase)).add(gust.sub(0.5).mul(1.2));
    const limbMove = vec3(dirTree.x.mul(0.7), 0.45, dirTree.z.mul(0.7)).mul(swing.mul(arm).mul(float(0.012).add(push.mul(0.012))).mul(float(1).sub(stiff.mul(0.6)))).mul(onLimb);
    return trunk.add(limbMove);
  };

  /**
   * The light on a piece of the tree at `at` (the world) facing `n`: the sun, as much of it as gets through
   * the crown between (Monsi and Saeki: it falls off as exp(-k L) over the length L of crown it crosses, the
   * crown taken as its ellipsoid), and the sky, as much as the crown above lets through.
   */
  const crownAt = (T: TreeRows, at: Vec3) => {
    const k = T.srow(3).x.mul(uStyle3.x);
    const ry = max(T.r1.x.sub(T.r1.y).mul(0.5), float(0.05));
    const rx = max(T.r1.z, float(0.05));
    const centre = vec3(T.r0.x, T.r0.y.add(T.r1.y).add(ry), T.r0.z);
    const scale = vec3(rx, ry, rx);
    const p = at.sub(centre).div(scale);
    /** How far (m) from `p` along `d` until the crown is left. */
    const crossing = (d: Vec3): Float => {
      const ds = d.div(scale);
      const a = dot(ds, ds);
      const b = dot(p, ds);
      const c = dot(p, p).sub(1);
      return max(b.negate().add(sqrt(max(b.mul(b).sub(a.mul(c)), float(0)))).div(a), float(0));
    };
    // (The light crosses leaves only in the crown's leafy shell: its outer `foliageDepth`, at least a
    // clump deep. It goes through the shell here and the shell on the far side, and the hollow heart
    // between costs it nothing; and a crown's outline is not its ellipsoid, so the first metre or so of
    // what the ellipsoid counts is air about a narrower crown.)
    const shell = max(T.srow(3).y, float(0.15)).mul(min(rx, ry));
    const leafy = (d: Vec3): Float => min(max(crossing(d).sub(min(rx, ry).mul(0.18)), float(0)), shell.mul(2));
    const sunIn = exp(k.negate().mul(leafy(uSun)));
    const sky = mix(float(0.4), float(1), exp(k.negate().mul(0.6).mul(leafy(vec3(0, 1, 0)))));
    const cloud = world.sun ? world.sun(vec2(at.x, at.z)) : float(1);
    // (Which way the crown as a whole faces here: its ellipsoid's normal. The shape a painter lights first.)
    const form = normalize(p.div(scale));
    return { sunIn, sky, form, cloud };
  };
  type Crown = ReturnType<typeof crownAt>;
  /**
   * How much sun a piece facing `n` gets: all of it from well short of square-on, none from `wrap` past its
   * side (as a painter lights a form, and Couch Golf Club's own trees: smoothstep(-wrap, 0.65, n . sun)).
   */
  const sunOn = (C: Crown, n: Vec3, wrap: Float): Float => smoothstep(wrap.negate(), uStyle3.y, dot(n, uSun)).mul(C.sunIn).mul(C.cloud);

  /** Into the air between it and the eye. */
  const intoAir = (col: Vec3, at: Vec3): Vec3 => (world.air ? world.air(col, at) : col);

  /** How much of a tree a tier draws, by its size in the picture: from and to, in the pattern's shares. */
  const sharesFor = (t: number, T: TreeRows): Vec2 => {
    const centre = vec3(T.r0.x, T.r0.y.add(T.r1.x.mul(0.5)), T.r0.z);
    const dist = length(centre.sub(cameraPosition));
    const px = T.r1.x.mul(uPxPerM).div(max(dist, float(0.1)));
    const { near, far } = tierShares(px);
    // (Thinned out to nothing over the last tenth of the range.)
    const gone = smoothstep(uDetail.w.mul(0.9), uDetail.w, dist);
    const to = t === 0 ? near : t === 1 ? far : float(1);
    const from = t === 0 ? float(0) : t === 1 ? near : far;
    return vec2(from, to.mul(float(1).sub(gone)));
  };

  /** A share of a fixed pattern on the screen, 0..1, per pixel: an integer hash of where the pixel is. */
  const pixelShare = (): Float => {
    const x = uint(screenCoordinate.x);
    const y = uint(screenCoordinate.y);
    let h: UInt = bitXor(x.mul(uint(0x27d4eb2d)), y.mul(uint(0x165667b1)));
    h = bitXor(h, shiftRight(h, uint(15))).mul(uint(0x2c1b3c6d));
    h = bitXor(h, shiftRight(h, uint(12)));
    return float(h.bitAnd(uint(0xffff))).div(65536);
  };
  const handOver = (shares: Vec2) => {
    const s = pixelShare();
    Discard(s.lessThan(shares.x).or(s.greaterThanEqual(shares.y)));
  };

  const atlas = real ? makeLeafAtlas() : makeDabAtlas();

  // ---- The dabs. ----

  /** The dabs of a tier: its leaves, or (`stroke`) the far tier's one upright stroke for each trunk. */
  const dabMaterial = (t: number, stroke: boolean, card = false) => {
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, fog: true });
    m.alphaToCoverage = !stroke;
    const aDab = attribute<"vec4">("aDab", "vec4");
    const aNormal = attribute<"vec4">("aNormal", "vec4");
    const aOffset = attribute<"vec4">("aOffset", "vec4");
    const aLimb = attribute<"vec4">("aLimb", "vec4");
    const T = treeOf(t, aLimb.w);
    const fit = fitOf(T);
    const own = aDab.w;
    let colour: Vec3;
    let position: Vec3;

    if (!stroke) {
      // Where the dab's centre is, in the wind.
      const centre = fit.point(positionGeometry);
      const limb = fit.point(aLimb.xyz);
      const onLimb = select(aLimb.y.lessThan(-0.5), float(0), float(1));
      const at = toWorld(T, centre.add(windAt(T, centre, limb, onLimb)));

      // Which way it faces: the crown's outside here, turned towards its clump's face and its own place on
      // the clump as far as `round` says (the crown's form first, then its clumps'); lit as one stroke of
      // paint, in steps.
      const toEye = normalize(cameraPosition.sub(at));
      const C = crownAt(T, at);
      // (A card: its own face, turned towards the eye as far as `faceEye` says, and lit from the side the eye
      // sees, as a leaf is: the other side's light is what comes through it.)
      const face0 = dirToWorld(T, fit.normal(aOffset.xyz));
      const face = normalize(mix(face0, toEye, uStyle3.w));
      const seen = face.mul(select(dot(face, toEye).lessThan(0), float(-1), float(1)));
      const nClump = card ? normalize(mix(seen, dirToWorld(T, fit.normal(aNormal.xyz)), uStyle.z)) : dirToWorld(T, fit.normal(normalize(aNormal.xyz.add(aOffset.xyz.mul(0.6)))));
      const nLit = card ? nClump : normalize(mix(C.form, nClump, uStyle.z));
      const jit = own.sub(0.5).mul(uStyle.w);
      const raw = clamp(sunOn(C, nLit, uStyle2.z).add(jit.mul(0.35)), 0, 1);
      const bands = max(uStyle.y, float(1));
      const lit = mix(raw, floor(raw.mul(bands).add(0.5)).div(bands), uStyle.x);
      const leaf = T.srow(0);
      const tone = float(1).add(jit.mul(leaf.w).mul(0.6));
      const albedo = leaf.xyz.mul(T.r2.xyz).mul(tone).mul(vec3(float(1).add(jit.mul(0.06)), 1, float(1).sub(jit.mul(0.1))));
      // (Deep in the crown the leaves see little sky as well as little sun: the crown's own shade.)
      const sky = C.sky.mul(mix(float(1), float(0.7), aNormal.w));
      // (The sun through the leaves, to an eye looking towards it: strongest where little crown lies between.)
      const toward = pow(max(dot(toEye.negate(), uSun), float(0)), float(4));
      const through = albedo.mul(T.srow(2).xyz).mul(uSunTint).mul(toward.mul(uStyle2.y).mul(sqrt(C.sunIn)).mul(0.9));
      colour = albedo.mul(mix(uShadeTint.mul(sky), uSunTint, lit)).add(through);
      if (card) {
        // (A leaf seen from the side away from the sun is lit through: a thin leaf passes on about as much
        // light as it sends back, greener and warmer (throughTint), by how squarely the sun is behind it.)
        const behind = max(dot(nLit, uSun).negate(), float(0)).mul(C.sunIn).mul(C.cloud);
        colour = colour.add(albedo.mul(T.srow(2).xyz).mul(uSunTint).mul(behind.mul(uStyle2.y).mul(0.75)));
      }
      colour = intoAir(colour, at);

      // The corner: turned to face the eye, and spun to an angle of its own (with a flutter in the wind).
      const right = cameraWorldMatrix.mul(vec4(1, 0, 0, 0)).xyz;
      const upCam = cameraWorldMatrix.mul(vec4(0, 1, 0, 0)).xyz;
      const flutter = sin(uTime.mul(5.3).add(own.mul(40))).mul(0.08).mul(clamp(uWind.z.div(6), 0.1, 1.5));
      const ang = own.mul(6.283).add(flutter);
      const ca = cos(ang);
      const sa = sin(ang);
      const corner = vec2(ca.mul(aDab.x).sub(sa.mul(aDab.y)), sa.mul(aDab.x).add(ca.mul(aDab.y)));
      const size = aDab.z.mul(fit.size).mul(uStyle2.x);
      if (card) {
        // (Its twig runs along `aTangent`, fitted and turned as the tree is, and kept square to its face.)
        const aTangent = attribute<"vec4">("aTangent", "vec4");
        const twig0 = dirToWorld(T, normalize(fit.radial(aTangent.xyz).mul(vec3(fit.across, fit.crownUp, fit.across))));
        const twig = normalize(twig0.sub(face.mul(dot(twig0, face))).add(vec3(0, 1e-4, 0)));
        const across = cross(face, twig);
        const sway = vec2(aDab.x, aDab.y).add(vec2(flutter.mul(0.5), flutter));
        position = at.add(across.mul(sway.x.mul(size))).add(twig.mul(sway.y.mul(size)));
      } else {
        position = at.add(right.mul(corner.x.mul(size))).add(upCam.mul(corner.y.mul(size)));
      }
    } else {
      // The trunk's stroke stands upright from the ground into the crown, turned about its own axis to the
      // eye, and is lit as a cylinder seen side-on.
      const top = fit.point(vec3(0, positionGeometry.y.mul(2), 0)).y;
      const y = aDab.y.mul(0.5).add(0.5).mul(top);
      const axis = toWorld(T, vec3(0, y, 0).add(windAt(T, vec3(0, y, 0), vec3(0, 0, 0), float(0))));
      const toEye = normalize(cameraPosition.sub(axis));
      const side = normalize(cross(vec3(0, 1, 0), toEye).add(vec3(1e-4, 0, 0)));
      position = axis.add(side.mul(aDab.x.mul(aNormal.x).mul(fit.wood)));
      const C = crownAt(T, position);
      const n = normalize(side.mul(aDab.x).add(normalize(vec3(toEye.x, 0, toEye.z).add(vec3(0, 0, 1e-4))).mul(0.4)));
      const bark = T.srow(1);
      colour = intoAir(bark.xyz.mul(barkTone(T)).mul(mix(uShadeTint.mul(C.sky), uSunTint, sunOn(C, n, float(0.3)))), position);
    }
    m.positionNode = position;

    const vCol = varying(colour, "vTreeCol");
    const vShares = varying(sharesFor(t, T), "vTreeShares");
    if (!stroke) {
      // (Which picture in the atlas: one of four brush marks; or, for the realistic look, one of the two sprays
      // of the species' kind of leaf, four columns by two rows, `leafCell` in leaves.ts.)
      const kind = T.srow(3).z;
      const realCell = vec2(mod(kind, float(2)).mul(2).add(step(float(0.5), own)), floor(kind.div(2)));
      const vCell = varying(real ? realCell : vec2(mod(floor(own.mul(4)), float(2)), floor(floor(own.mul(4)).div(2))), "vTreeCell");
      const vSpin = varying(aDab.xy, "vTreeUv");
      m.colorNode = Fn(() => {
        handOver(vShares);
        // (The leaf atlas: four columns, two kinds of leaf to a row; leaves.ts `leafCell`.)
        const cells = real ? vec2(4, Math.ceil(LEAF_KIND_ROWS.length / 2)) : vec2(2, 2);
        const cuv = vCell.add(vSpin.mul(0.5).add(0.5)).div(cells);
        const mark = texture(atlas, cuv);
        Discard(mark.a.lessThan(uAlphaCut));
        return vec4(vCol.mul(mix(float(1), mark.r.mul(1.12), uStyle2.w)), mark.a);
      })();
    } else {
      m.colorNode = Fn(() => {
        handOver(vShares);
        return vec4(vCol, 1);
      })();
    }
    m.name = `trees-${stroke ? "strokes" : "dabs"}-${t}`;
    return m;
  };

  // ---- The wood. ----

  const woodMaterial = (t: number) => {
    const m = new THREE.MeshBasicNodeMaterial({ fog: true });
    const aRadial = attribute<"vec4">("aRadial", "vec4");
    const aLimb = attribute<"vec4">("aLimb", "vec4");
    const aWood = attribute<"vec4">("aWood", "vec4");
    const T = treeOf(t, aLimb.w);
    const fit = fitOf(T);
    const centre = fit.point(positionGeometry);
    const limb = fit.point(aLimb.xyz);
    const onLimb = select(aWood.y.greaterThan(0.5), float(1), float(0));
    const moved = centre.add(windAt(T, centre, limb, onLimb));
    const radial = fit.radial(aRadial.xyz);
    const surface = moved.add(radial.mul(aRadial.w).mul(fit.wood));
    const at = toWorld(T, surface);
    const nWorld = dirToWorld(T, radial);
    const C = crownAt(T, at);
    const bark = T.srow(1);
    // (Paler up the trunk where the species' bark is: a eucalyptus's, a plane's.)
    const pale = bark.w.mul(smoothstep(float(0.05), float(0.5), surface.y.div(T.r1.x)));
    const albedo = mix(bark.xyz, vec3(0.42, 0.4, 0.35), pale.mul(0.7)).mul(barkTone(T)).mul(float(0.9).add(aWood.z.mul(0.2)));
    // (Darker at its foot, in the grass and its own shade.)
    const foot = mix(float(0.6), float(1), smoothstep(float(0), float(1.2), surface.y));
    const col = albedo.mul(mix(uShadeTint.mul(C.sky), uSunTint, sunOn(C, nWorld, float(0.2)))).mul(foot);
    m.positionNode = at;
    const vCol = varying(intoAir(col, at), "vWoodCol");
    const vShares = varying(sharesFor(t, T), "vWoodShares");
    // (Its furrows: ridges running up the wood, some nine round a trunk, wandering a little as they go.)
    const vBark = varying(vec3(aRadial.x, aRadial.z, aWood.x), "vWoodBark");
    m.colorNode = Fn(() => {
      handOver(vShares);
      const round = atan(vBark.y, vBark.x);
      const ridge = sin(round.mul(9).add(sin(vBark.z.mul(1.7).add(round.mul(2))).mul(1.4)));
      const furrows = mix(float(1), float(0.68).add(smoothstep(float(-0.4), float(0.7), ridge).mul(0.42)), uStyle3.z);
      return vec4(vCol.mul(furrows), 1);
    })();
    m.name = `trees-wood-${t}`;
    return m;
  };

  // ---- Meshes. ----

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const meshes: { mesh: THREE.Mesh; tier: number; wood: boolean }[] = [];
  const offsetsFor = (t: number) => Array.from({ length: V }, (_, v) => (t * V + v) * 5 * 4);
  const geometryOf = (set: Pieces, args: THREE.IndirectStorageBufferAttribute, t: number) => {
    const g = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(set.attributes)) g.setAttribute(name, new THREE.BufferAttribute(a.array, a.size));
    g.setIndex(new THREE.BufferAttribute(set.index, 1));
    g.setIndirect(args, offsetsFor(t));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    return g;
  };
  for (let t = 0; t < TIERS; t++) {
    if (V === 0) break;
    if (dabSets[t].index.length > 0) {
      const g = geometryOf(dabSets[t], dabArgs, t);
      const m = dabMaterial(t, false, real && t === 0);
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      mesh.name = m.name;
      group.add(mesh);
      geometries.push(g);
      materials.push(m);
      meshes.push({ mesh, tier: t, wood: false });
    }
    if (strokeSets[t].index.length > 0) {
      const g = geometryOf(strokeSets[t], strokeArgs, t);
      const m = dabMaterial(t, true);
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      mesh.name = m.name;
      group.add(mesh);
      geometries.push(g);
      materials.push(m);
      meshes.push({ mesh, tier: t, wood: true });
    }
    if (woodSets[t].index.length > 0) {
      const g = geometryOf(woodSets[t], woodArgs, t);
      const m = woodMaterial(t);
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      mesh.name = m.name;
      group.add(mesh);
      geometries.push(g);
      materials.push(m);
      meshes.push({ mesh, tier: t, wood: true });
    }
  }

  // ---- The trees' shade on the ground. ----

  const shadeTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  shadeTex.magFilter = shadeTex.minFilter = THREE.LinearFilter;
  shadeTex.needsUpdate = true;
  const shadeNode = texture(shadeTex);
  const uShadeArea = uniform(new THREE.Vector4(0, 0, 1, 1));
  const bakeShade = (area: { x0: number; z0: number; width: number; depth: number; cell: number }) => {
    const nx = Math.max(1, Math.ceil(area.width / area.cell));
    const nz = Math.max(1, Math.ceil(area.depth / area.cell));
    const sun = uSun.value.clone().normalize();
    const trans = new Float32Array(nx * nz).fill(1);
    if (sun.y > 0.02) {
      const ks = species.map((sp) => 0.5 * (0.3 + (1 - sp.openness) * 1.1));
      for (const p of plan.placements) {
        const s = p.size;
        const ry = Math.max(0.05, (s.height - s.crownBase) / 2);
        const rx = Math.max(0.05, s.crownRadius);
        const cy = s.crownBase + ry;
        const sp = species[plan.variants[p.variant].species];
        const k = ks[plan.variants[p.variant].species];
        const shell = Math.max(sp.foliageDepth, 0.15) * Math.min(rx, ry);
        const air = Math.min(rx, ry) * 0.18;
        // (Where the crown's shadow falls: its centre carried down the sun's ray to the ground at its foot.)
        const sx = p.x - (sun.x * cy) / sun.y;
        const sz = p.z - (sun.z * cy) / sun.y;
        const reach = Math.max(rx, ry) / Math.max(sun.y, 0.15) + rx;
        const i0 = Math.max(0, Math.floor((sx - reach - area.x0) / area.cell));
        const i1 = Math.min(nx - 1, Math.ceil((sx + reach - area.x0) / area.cell));
        const j0 = Math.max(0, Math.floor((sz - reach - area.z0) / area.cell));
        const j1 = Math.min(nz - 1, Math.ceil((sz + reach - area.z0) / area.cell));
        const dx = sun.x / rx;
        const dy = sun.y / ry;
        const dz = sun.z / rx;
        const a = dx * dx + dy * dy + dz * dz;
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            // (The ray from this place on the ground towards the sun, in the crown's own unit sphere.)
            const px = (area.x0 + (i + 0.5) * area.cell - p.x) / rx;
            const py = -cy / ry;
            const pz = (area.z0 + (j + 0.5) * area.cell - p.z) / rx;
            const b = px * dx + py * dy + pz * dz;
            const c = px * px + py * py + pz * pz - 1;
            const disc = b * b - a * c;
            if (disc <= 0) continue;
            const chord = (2 * Math.sqrt(disc)) / a;
            const leafy = Math.min(Math.max(chord - air, 0), shell * 2);
            trans[j * nx + i] *= Math.exp(-k * leafy);
          }
        }
      }
    }
    const data = new Uint8Array(nx * nz * 4);
    for (let q = 0; q < nx * nz; q++) {
      const v = Math.round(trans[q] * 255);
      data[q * 4] = data[q * 4 + 1] = data[q * 4 + 2] = v;
      data[q * 4 + 3] = 255;
    }
    const next = new THREE.DataTexture(data, nx, nz, THREE.RGBAFormat);
    next.magFilter = next.minFilter = THREE.LinearFilter;
    next.wrapS = next.wrapT = THREE.ClampToEdgeWrapping;
    next.needsUpdate = true;
    const old = shadeNode.value;
    shadeNode.value = next;
    if (old !== shadeTex) old.dispose();
    uShadeArea.value.set(area.x0, area.z0, nx * area.cell, nz * area.cell);
  };
  const sunAt = (xz: Vec2): Float => {
    const uv = xz.sub(vec2(uShadeArea.x, uShadeArea.y)).div(vec2(uShadeArea.z, uShadeArea.w));
    const inside = step(float(0), uv.x).mul(step(float(0), uv.y)).mul(step(uv.x, float(1))).mul(step(uv.y, float(1)));
    return mix(float(1), shadeNode.sample(uv).level(float(0)).r, inside);
  };

  const frustum = new THREE.Frustum();
  const pv = new THREE.Matrix4();
  const size = new THREE.Vector2();

  const pieces = TIER_SHAPES.map((_, t) => ({ dabs: dabSets[t].index.length / 6, wood: woodSets[t].index.length / 3 }));

  return {
    object: group,
    environment: { sun: uSun.value, sunTint: uSunTint.value, shadeTint: uShadeTint.value, wind: uWind.value },
    style,
    detail,
    plan,
    grown,
    pieces,
    show,
    update(renderer, camera, timeS) {
      uTime.value = timeS;
      camera.updateMatrixWorld();
      uCam.value.setFromMatrixPosition(camera.matrixWorld);
      pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pv, THREE.WebGPUCoordinateSystem);
      frustum.planes.forEach((p, i) => (uPlanes.array[i] as THREE.Vector4).set(p.normal.x, p.normal.y, p.normal.z, p.constant));
      renderer.getDrawingBufferSize(size);
      uPxPerM.value = (size.y * camera.zoom) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      uDetail.value.set(detail.nearPx, detail.farPx, detail.band, detail.range);
      uStyle.value.set(style.steps, style.bands, style.round, style.jitter);
      uStyle2.value.set(style.dabScale, style.through, style.wrap, style.strokes);
      uStyle3.value.set(style.selfShade, style.fullLight, style.bark, style.faceEye);
      uAlphaCut.value = (renderer.samples ?? 0) > 1 ? 0.02 : 0.5;
      for (const { mesh, tier, wood } of meshes) {
        mesh.visible = (tier === 0 ? show.near : tier === 1 ? show.mid : show.far) && (wood ? show.wood : show.leaves);
      }
      if (N > 0 && V > 0) renderer.compute([cull, finish]);
    },
    bakeShade,
    sunAt,
    setSpecies(list) {
      species = list;
      packSpecies();
      speciesAttr.needsUpdate = true;
    },
    async countDrawn(renderer) {
      const buf = new Uint32Array(await renderer.getArrayBufferAsync(dabArgs));
      const out = [0, 0, 0];
      for (let t = 0; t < TIERS; t++) for (let v = 0; v < V; v++) out[t] += buf[(t * V + v) * 5 + 1];
      return out;
    },
    dispose() {
      // (The compute passes own pipelines and bind groups in the renderer, and the storage buffers live
      // apart from any geometry: none of them is freed unless disposed by name.)
      cull.dispose();
      finish.dispose();
      for (const a of [treeAttr, variantAttr, speciesAttr, visibleAttr, countAttr, dabArgs, woodArgs, strokeArgs]) a.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      atlas.dispose();
      if (shadeNode.value !== shadeTex) shadeNode.value.dispose();
      shadeTex.dispose();
    },
  };
}
