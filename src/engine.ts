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
import { Fn, If, Loop, atan, fwidth, atomicAdd, atomicLoad, atomicStore, attribute, bitXor, cameraPosition, cameraWorldMatrix, clamp, cos, cross, dot, exp, float, floor, instanceIndex, length, max, min, mix, mod, normalize, positionGeometry, pow, screenCoordinate, select, shiftRight, sin, smoothstep, sqrt, step, storage, texture, uint, uniform, uniformArray, varying, vec2, vec3, vec4, Discard } from "three/tsl";
import { makeDabAtlas } from "./dabs.ts";

/** The painted look's brush marks' texels (dabs.ts makes them as a texture). */
function makeDabPixels(): Pixels {
  const tex = makeDabAtlas();
  const img = tex.image as { data: Uint8Array; width: number; height: number };
  tex.dispose();
  return { data: img.data, width: img.width, height: img.height };
}
import { leafAtlasPixels } from "./leaves.ts";
import { crownLobes, lobeCount, withLobes } from "./lobes.ts";
import { LEAF_SHARE, LEAF_SIZE_OF, MARK_CELL, MARK_KINDS, PAINTERLY_COLS, PAINTERLY_DENSITIES, PAINTERLY_ROWS, PAINTERLY_VARIANTS, SCULPTED_COLS, SCULPTED_ROWS, SHEET_CELL, SHEET_COLS, SHEET_ROWS, painterlyAtlasPixels, sculptedAtlasPixels, sheetAtlasPixels } from "./marks.ts";
import { ALPHA_CUT, type Pixels, coverageMips } from "./mips.ts";
import { LOOK_LOBES, LOOK_STYLES, type TreeLook, type TreeStyle } from "./styles.ts";
import { type Pieces, TIER_SHAPES, cardPieces, dabPieces, sheetPieces, woodPieces } from "./geometry.ts";
import { growTree } from "./grow.ts";
import { LEAF_KIND_ROWS, type TreeSpecies } from "./species.ts";
import { type Stand, standingOf } from "./stand.ts";
import { type GrownTree, type TreeSize } from "./tree.ts";
import { DEFAULT_VARIANT_OPTIONS, type Plan, type TreeInstance, type VariantOptions, packTrees, planVariants } from "./variants.ts";

type Float = THREE.Node<"float">;
type Vec2 = THREE.Node<"vec2">;
type Vec3 = THREE.Node<"vec3">;
type Vec4 = THREE.Node<"vec4">;
type UInt = THREE.Node<"uint">;

const TIERS = 3;
/** The least of the sky a stand leaves anywhere (engine.ts `standOn`). */
const STAND_SKY = 0.22;
/** Rows (vec4) a tree has in the shaders' list of trees. */
const TREE_ROWS = 5;
/** The most lobes a crown is lit as (styles.ts LOOK_LOBES keeps under it). */
const MAX_LOBES = 32;

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
  /**
   * Where each tree stands among the others (by tree, as in `trees`), over what is worked out from its
   * neighbours (stand.ts): any part of it, or nothing. A list of trees may say it of each tree instead.
   */
  stands?: readonly (Partial<Stand> | null | undefined)[];
  /** Grow trees some other way than this library's (see `growTree`; `stand` left out, a tree alone). */
  grow?: (species: TreeSpecies, size: TreeSize, seed: number, stand?: Stand) => GrownTree;
  /** The look (`stylized` unless given). `style` starts as the look's (`LOOK_STYLES`). */
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
  /** Each tier's pieces for one tree of each variant, all told: dabs, pieces of wood, and the triangles of conifers' sheets. */
  readonly pieces: { dabs: number; wood: number; sheets: number }[];
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

/**
 * An atlas of marks as a texture, with its mips made so a far crown keeps as much of its leaves as a near one
 * (mips.ts): worked out once a page, then shared.
 */
const atlasMips: Partial<Record<"painterly" | "sculpted" | "sheets" | "leaves" | "dabs", Pixels[]>> = {};
function markAtlas(which: "painterly" | "sculpted" | "sheets" | "leaves" | "dabs", cell = MARK_CELL, from?: Pixels, fill = 0): THREE.DataTexture {
  const levels = (atlasMips[which] ??= coverageMips(from ?? (which === "painterly" ? painterlyAtlasPixels() : which === "sculpted" ? sculptedAtlasPixels() : which === "sheets" ? sheetAtlasPixels() : leafAtlasPixels()), cell, ALPHA_CUT, fill));
  const tex = new THREE.DataTexture(levels[0].data, levels[0].width, levels[0].height, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.mipmaps = levels as unknown as typeof tex.mipmaps;
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = false;
  // (Sheets and cards are seen aslant, from under a bough: sampled along the slant, they keep their needles.)
  tex.anisotropy = which === "sheets" ? 4 : 1;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Which kind of sheet a species' boughs are (marks.ts `SHEET_KINDS`), or -1 if its leaves are dabs or cards:
 * a needled conifer's a fir's comb, a scaled one's (a cedar's) lace. Only a conifer grown whorl by whorl has
 * boughs to lay them along: an old pine grown as a broadleaf carries its needles in tufts at its twigs' ends,
 * which sheets made a crown of fronds, a palm's; a shrub's needles (gorse) a mound.
 */
function sheetKindOf(s: TreeSpecies): number {
  if (s.architecture !== "conifer") return -1;
  return s.leafKind === "needle" ? 0 : s.leafKind === "small" ? 1 : -1;
}

function linear(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function createTrees(options: TreesOptions): Trees {
  let species = options.species;
  const packed = options.trees instanceof Float32Array ? options.trees : packTrees(options.trees);
  const stands = options.stands ?? (options.trees instanceof Float32Array ? undefined : options.trees.map((t) => t.stand));
  const plan = planVariants(packed, species, { ...DEFAULT_VARIANT_OPTIONS, ...options.variants }, stands);
  const grow = options.grow ?? growTree;
  const grown = plan.variants.map((v) => grow(species[v.species], v.size, v.seed, v.standing === "open" ? undefined : v.stand));
  const N = plan.placements.length;
  const V = plan.variants.length;
  const world = options.world ?? {};

  const group = new THREE.Group();
  group.name = "trees";
  const look: TreeLook = options.look ?? "stylized";
  const real = look === "real";
  // (Every look but the realistic one lays its leaves as dabs lit over the crown's lobes, as far as its style's
  // `lobe` says: the painted look's says not at all.)
  const lobed = !real && look !== "stylized";
  const style: TreeStyle = { ...LOOK_STYLES[look] };
  // (A lobed look's crowns gathered into lobes, which their dabs are lit over: lobes.ts.)
  const lobeShape = LOOK_LOBES[look];
  const lobes = lobed ? grown.map((g) => crownLobes(g, Math.min(MAX_LOBES, lobeCount(g, lobeShape.share, lobeShape.least, lobeShape.most)))) : [];
  const detail: TreeDetail = { ...DEFAULT_DETAIL };
  const show = { near: true, mid: true, far: true, wood: true, leaves: true };

  // ---- What the shaders read: the trees, the variants, the species. ----

  // Five rows a tree: where (x, y, z) and which way (yaw); its size; its tint and a number of its own; its
  // lean (x, z), whether mirrored, and its variant; its stand (stand.ts): how enclosed, which way open by how
  // much (on the ground), and its walls' top and how far off they stand (decimetres, packed in one number:
  // top * 1024 + off). A tree that stands in the open has none: whatever little its neighbours hide of its
  // sky (a park's next tree, 30 m off) fades out, and it is lit as it always was.
  const treeData = new Float32Array(Math.max(1, N) * TREE_ROWS * 4);
  plan.placements.forEach((p, i) => {
    const st = p.stand;
    const most = st.enclosure + st.lopsided;
    // (A shrub in a wood is grown as in the open but lit as where it stands.)
    const by = p.standing !== "open" || standingOf(st) !== "open" ? 1 : Math.min(1, Math.max(0, (most - 0.3) / 0.2));
    const top = Math.min(1000, Math.round(10 * st.canopy * p.size.height));
    const off = Math.min(1023, Math.round(10 * p.size.crownRadius * (1 + st.gap)));
    treeData.set([p.x, p.y, p.z, p.yaw, p.size.height, p.size.crownBase, p.size.crownRadius, p.size.trunkRadius, p.tint[0], p.tint[1], p.tint[2], p.own, p.leanX, p.leanZ, p.mirror, p.variant, st.enclosure * by, st.lopsided * st.openX * by, st.lopsided * st.openZ * by, top * 1024 + off], i * TREE_ROWS * 4);
  });
  // Two rows a variant: its size as grown; where its lists start, how long each is, its species, and how many
  // lobes its crown has (a lobed look's).
  const counts = plan.variants.map((v) => v.trees);
  const starts: number[] = [];
  counts.reduce((sum, n, v) => ((starts[v] = sum), sum + n), 0);
  const variantData = new Float32Array(Math.max(1, V) * 8);
  plan.variants.forEach((v, i) => {
    const g = grown[i].size;
    variantData.set([g.height, g.crownBase, g.crownRadius, g.trunkRadius, starts[i] * TIERS, counts[i], v.species, lobes[i]?.length ?? 0], i * 8);
  });
  // Four rows a species: its leaves' colour (linear) and how much it varies; its bark's, and how pale it
  // goes up the trunk; the colour of light through its leaves, and its stiffness; how fast its crown
  // takes the light (per metre), how deep its leaves go, its kind of leaf, and how much moss its bark
  // takes (none on a palm's stem, less on pale, peeling bark: a birch's, a eucalyptus's, a plane's).
  const speciesData = new Float32Array(Math.max(1, species.length) * 16);
  const packSpecies = () => {
    species.forEach((s, i) => {
      const leaf = linear(s.leafColor);
      const bark = linear(s.barkColor);
      // (Leaf area per cubic metre of crown, about 0.3 in an open crown to 1.4 in a dense one, half of it
      // facing any one way: Monsi and Saeki's extinction through a crown, with G = 0.5.)
      const k = 0.5 * (0.3 + (1 - s.openness) * 1.1);
      speciesData.set([leaf.r, leaf.g, leaf.b, s.leafVariation, bark.r, bark.g, bark.b, s.barkPale, s.throughTint[0], s.throughTint[1], s.throughTint[2], s.stiffness, k, s.foliageDepth, Math.max(0, LEAF_KIND_ROWS.indexOf(s.leafKind)), s.architecture === "palm" ? 0 : 1 - 0.6 * s.barkPale], i * 16);
    });
  };
  packSpecies();

  const treeAttr = new THREE.StorageBufferAttribute(treeData, 4);
  const variantAttr = new THREE.StorageBufferAttribute(variantData, 4);
  const speciesAttr = new THREE.StorageBufferAttribute(speciesData, 4);
  const treesR = storage(treeAttr, "vec4", treeData.length / 4).toReadOnly();
  const variantsR = storage(variantAttr, "vec4", variantData.length / 4).toReadOnly();
  const speciesR = storage(speciesAttr, "vec4", speciesData.length / 4).toReadOnly();
  // (A lobed look's lobes, MAX_LOBES places a variant: centre (its own frame) and radius, 0 where there is none.)
  const lobeData = new Float32Array(Math.max(1, V) * MAX_LOBES * 4);
  lobes.forEach((list, v) => list.slice(0, MAX_LOBES).forEach((l, i) => lobeData.set([l.x, l.y, l.z, l.radius], (v * MAX_LOBES + i) * 4)));
  const lobeAttr = new THREE.StorageBufferAttribute(lobeData, 4);
  const lobesR = storage(lobeAttr, "vec4", lobeData.length / 4).toReadOnly();

  // The lists: for each variant, a run of places for each tier, as many as it has trees.
  const visibleAttr = new THREE.StorageBufferAttribute(new Uint32Array(Math.max(1, N * TIERS)), 1);
  const visibleW = storage(visibleAttr, "uint", Math.max(1, N * TIERS));
  const visibleR = storage(visibleAttr, "uint", Math.max(1, N * TIERS)).toReadOnly();
  // How many trees each tier of each variant has this frame (tier-major: tier * V + variant).
  const countAttr = new THREE.StorageBufferAttribute(new Uint32Array(Math.max(1, V * TIERS)), 1);
  const countStore = storage(countAttr, "uint", Math.max(1, V * TIERS)).toAtomic();

  // ---- The pieces, and their draws. ----

  // (The realistic look's near and mid leaves are cards set in the crown; far off, both looks' are dabs.)
  // (Mid trees too: gathered into broad billboards, the leaf sprays smeared into blots; two large cards a
  // clump keep a crown of leaves at a cost the mid tier can carry.)
  // (A conifer's near boughs, in the painterly and the realistic looks, are sheets lying along them, and not
  // dabs or cards: `sheetPieces`.)
  const sheetKinds = look === "painterly" || real ? plan.variants.map((v) => sheetKindOf(species[v.species])) : plan.variants.map(() => -1);
  const sheeted = sheetKinds.map((k) => k >= 0);
  const dabSets: Pieces[] = TIER_SHAPES.map((s, t) => (real && t === 0 ? cardPieces(grown, 12, 0.8, sheeted) : real && t === 1 ? cardPieces(grown, 2, 1.45, sheeted) : lobed ? withLobes(dabPieces(grown, s, "leaves", t <= 1 ? sheeted : undefined), lobes) : dabPieces(grown, s)));
  // (Mid trees too, in longer, coarser sheets: drawn as dabs, a conifer passing from near to mid changed
  // from boughs to blots, pixel by pixel, a speckle over the whole hand-over.)
  const sheetSets: Pieces[] = TIER_SHAPES.map((_, t) => {
    const p = sheetPieces(grown, t <= 1 ? sheetKinds : sheetKinds.map(() => -1), t === 1);
    return lobed ? withLobes(p, lobes) : p;
  });
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
  const sheetArgs = makeArgs(sheetSets);
  const dabArgsStore = storage(dabArgs, "uint", dabArgs.array.length);
  const woodArgsStore = storage(woodArgs, "uint", woodArgs.array.length);
  const strokeArgsStore = storage(strokeArgs, "uint", strokeArgs.array.length);
  const sheetArgsStore = storage(sheetArgs, "uint", sheetArgs.array.length);

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
  /** lobe, bulge, warm, cool. */
  const uStyle4 = uniform(new THREE.Vector4(0, 0, 0, 0));
  /** chroma, rim, sprigs, bright. */
  const uStyle5 = uniform(new THREE.Vector4(1, 0, 0, 1));
  /** leafSize (m). */
  const uLeafSize = uniform(0.22);
  /** throughPower, throughWarp, throughVary, moss. */
  const uThrough = uniform(new THREE.Vector4(4, 0, 0, 0));
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
      const r0 = treesR.element(id.mul(TREE_ROWS));
      const r1 = treesR.element(id.mul(TREE_ROWS).add(1));
      const r3 = treesR.element(id.mul(TREE_ROWS).add(3));
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
      sheetArgsStore.element(k.mul(5).add(1)).assign(c);
      atomicStore(countStore.element(k), uint(0));
    });
  })().compute(Math.max(1, TIERS * V));

  // ---- What every tree's shaders share: which tree, its fit, its wind, its light. ----

  /** The tree this instance of variant `v` in tier `t` is, and its rows. */
  const treeOf = (t: number, v: Float) => {
    const vrow0 = variantsR.element(uint(v).mul(2));
    const vrow1 = variantsR.element(uint(v).mul(2).add(1));
    const id = visibleR.element(uint(vrow1.x).add(uint(vrow1.y).mul(t)).add(instanceIndex));
    const r0 = treesR.element(id.mul(TREE_ROWS));
    const r1 = treesR.element(id.mul(TREE_ROWS).add(1));
    const r2 = treesR.element(id.mul(TREE_ROWS).add(2));
    const r3 = treesR.element(id.mul(TREE_ROWS).add(3));
    const r4 = treesR.element(id.mul(TREE_ROWS).add(4));
    const rows = [0, 1, 2, 3].map((k) => speciesR.element(uint(vrow1.z).mul(4).add(k)));
    const srow = (k: number) => rows[k];
    // (Its yaw's cosine and sine, once: every turn into and out of the tree's frame uses them.)
    const yawC = cos(r0.w);
    const yawS = sin(r0.w);
    return { vrow0, vrow1, r0, r1, r2, r3, r4, srow, yawC, yawS };
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
   * The light on a piece of the tree at `at` (the world) facing `n` (its crown's form, left out): the sun, as
   * much of it as gets through the crown between (Monsi and Saeki: it falls off as exp(-k L) over the length L
   * of crown it crosses, the crown taken as its ellipsoid), and the sky, as much as the crown above lets
   * through; and both as much as its stand leaves it (`standOn`).
   */
  const crownAt = (T: TreeRows, at: Vec3, n?: Vec3) => {
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
    const stand = standOn(T, at, n ?? form, k);
    return { sunIn: sunIn.mul(stand.sun), sky: sky.mul(stand.sky), standSky: stand.sky, form, cloud };
  };

  /**
   * What a tree's stand (stand.ts) leaves of the sky and the sun at `at`, facing `n`: its neighbours' crowns
   * are walls standing round it, as far as each way is closed, up to their top. The sky they hide is what
   * lies below their top as seen from here (sin² of its elevation, of a uniform sky): the way the piece
   * faces, as far as it faces sideways, and all round, as far as it faces up. The sun is hidden as far as its
   * ray, rising to the walls' top, runs through them first (exp(-k L), their leaves taken as the tree's own).
   * So a wood's interior is dark from its floor up to its canopy, and an edge tree's open side is lit.
   */
  const standOn = (T: TreeRows, at: Vec3, n: Vec3, k: Float) => {
    const S = T.r4;
    const top = floor(S.w.div(1024));
    const wall = S.w.sub(top.mul(1024)).mul(0.1);
    const rise = max(top.mul(0.1).sub(at.y.sub(T.r0.y)), float(0));
    const q = vec2(at.x.sub(T.r0.x), at.z.sub(T.r0.z));
    const nearest = T.r1.z.mul(0.15);
    const below = (d: Float): Float => rise.mul(rise).div(rise.mul(rise).add(d.mul(d)).add(1e-4));
    const nh = vec2(n.x, n.z);
    const side = length(nh);
    const u = nh.div(max(side, float(1e-4)));
    const closedThere = clamp(S.x.sub(dot(u, S.yz)), 0, 1);
    const lostThere = closedThere.mul(below(max(wall.sub(dot(q, u)), nearest)));
    const lostRound = S.x.mul(below(max(wall, nearest)));
    // (Never below STAND_SKY: light comes down through the canopy's gaps and off the leaves round about, and
    // a wood's floor is dim, not black.)
    const sky = max(float(1).sub(mix(lostRound, lostThere, side)), float(STAND_SKY));
    // (The sun: closed the way it comes from as far as the stand is; its ray runs `inside` metres through the
    // walls before it is over their top.)
    const sunH = vec2(uSun.x, uSun.z);
    const sunSide = max(length(sunH), float(1e-4));
    const s = sunH.div(sunSide);
    const closedSun = clamp(S.x.sub(dot(s, S.yz)), 0, 1);
    const run = rise.mul(sunSide).div(max(uSun.y, float(0.05)));
    const inside = max(run.sub(max(wall.sub(dot(q, s)), float(0))), float(0));
    const sun = float(1).sub(closedSun.mul(float(1).sub(exp(k.negate().mul(inside).div(sunSide)))));
    return { sky, sun };
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

  const atlas = real ? markAtlas("leaves") : look === "painterly" ? markAtlas("painterly") : look === "sculpted" ? markAtlas("sculpted") : markAtlas("dabs", 128, makeDabPixels());
  // (A painterly conifer's sheets carry boughs of needles of their own; a realistic one's, its needle sprays.)
  const sheetAtlas = look === "painterly" && sheeted.some((k) => k) ? markAtlas("sheets", SHEET_CELL, undefined, 0.3) : null;

  // ---- The dabs. ----

  /**
   * The light through a leaf, as Barré-Brisebois's model has it (GDC 2011): to an eye looking towards the sun
   * through it, the sun's light bent a little by the leaf's facing `n` (`throughWarp`), gathered about the sun
   * as `throughPower` says, and as thin as the leaf is: `own` (0..1) its own number, which `throughVary`
   * turns into a thickness of its own (each leaf its own, so a backlit crown is not one lime green).
   */
  const throughView = (n: Vec3, eye: Vec3, own: Float): Float => throughBent(n, eye).mul(leafThin(own));
  /** The model's view term alone: how squarely the eye looks into the sun through a leaf facing `n`. */
  const throughBent = (n: Vec3, eye: Vec3): Float => pow(clamp(dot(eye, uSun.add(n.mul(uThrough.y)).negate()), 0, 1), uThrough.x);
  /** How thin a leaf is for its own number (0..1), as far as `throughVary` says: 1 on average. */
  const leafThin = (own: Float): Float => mix(float(1), own.mul(1.3).add(0.35), uThrough.z);
  /**
   * How thin the crown is to the sun here, for the light through its leaves: the share of the sun that reaches
   * a leaf (Monsi and Saeki) and how deep its clump is, and each card or sheet a thickness of its own, as far
   * as `throughVary` says. With none, the square root of the sun's share, as the looks had it.
   */
  const crownThin = (C: Crown, depth: Float, own: Float): Float => mix(sqrt(C.sunIn), pow(C.sunIn, float(0.75)).mul(float(1).sub(depth.mul(0.6))).mul(own.add(0.5)), uThrough.z);

  /**
   * The dabs of a tier: its leaves, or (`stroke`) the far tier's one upright stroke for each trunk; `card`, the
   * realistic look's leaf cards; `sheet`, a conifer's boughs as sheets lying along them (geometry.ts
   * `sheetPieces`): each vertex where it is, the sheet's top and underside lit and drawn each as itself.
   */
  const dabMaterial = (t: number, stroke: boolean, card = false, sheet = false) => {
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, fog: true });
    const marks = sheet && sheetAtlas ? sheetAtlas : atlas;
    m.alphaToCoverage = !stroke;
    const aDab = attribute<"vec4">("aDab", "vec4");
    const aNormal = attribute<"vec4">("aNormal", "vec4");
    const aOffset = attribute<"vec4">("aOffset", "vec4");
    const aLimb = attribute<"vec4">("aLimb", "vec4");
    const T = treeOf(t, aLimb.w);
    const fit = fitOf(T);
    const own = aDab.w;
    let colour: Vec3 = vec3(0);
    let position: Vec3;
    // (A lobed look's dabs are lit pixel by pixel, over their lobe: what the vertex hands on for it.)
    let lobeLight: { shade: Vec4; lit: Vec4; rim: Vec3; q: Vec3; eye: Vec3; form: Vec3; corner: Vec3; through: Vec4 } | null = null;
    // (The light through the leaves, for the pixel to finish, and a sheet's two sides' colours, where unlobed.)
    let thruV: { col: Vec4; n: Vec3; eye: Vec3 } | null = null;
    let sheetCols: { top: Vec3; under: Vec3 } | null = null;
    let sheetFace: Vec3 | null = null;
    // (Which picture in the atlas a sculpted dab takes: a sprig, or one of three discs.)
    // (Only on the upper half of its lobe, as sprigs stand on the tops of clay masses: from below they would
    // show as scraps.)
    const sprig = look === "sculpted" && t === 0 && lobed ? step(float(1).sub(uStyle5.z), own).mul(step(attribute<"vec4">("aLobe", "vec4").y, positionGeometry.y)) : float(0);

    if (!stroke) {
      // Where the dab's centre is, in the wind.
      let centre = fit.point(positionGeometry);
      const limb = fit.point(aLimb.xyz);
      const onLimb = select(aLimb.y.lessThan(-0.5), float(0), float(1));
      // (A sheet bends: each of its points moves as the wood there does, and its tip bobs as a bough's does.)
      const along = aDab.y.mul(0.5).add(0.5);
      const bob = sheet ? vec3(0, sin(uTime.mul(3.1).add(own.mul(40))).mul(aDab.z.mul(fit.size).mul(0.05).mul(along.mul(along))).mul(clamp(uWind.z.div(6), 0.1, 1.5)), 0) : vec3(0);
      const blown = windAt(T, centre, limb, onLimb).add(bob);
      // (Its lobe's centre, carried by the same wind as the dab, and how far it reaches: lobes.ts.)
      const aLobe = lobed ? attribute<"vec4">("aLobe", "vec4") : null;
      const lobeAt = aLobe ? toWorld(T, fit.point(aLobe.xyz).add(blown)) : null;
      const lobeR = aLobe ? max(aLobe.w.mul(fit.size), float(0.05)) : null;
      // (A sprig stands out of its own clump, away from its lobe's middle, where it shows: not on the lobe's
      // ball, which reaches past the crown's dabs here and there and would leave it in the air.)
      if (aLobe && look === "sculpted") {
        const lc = fit.point(aLobe.xyz);
        const out = centre.sub(lc);
        const onSkin = centre.add(out.div(max(length(out), float(1e-3))).mul(aDab.z.mul(fit.size).mul(0.6)));
        centre = mix(centre, onSkin, sprig);
      }
      const at = toWorld(T, centre.add(blown));
      // (The lobe it is lit by: the one whose ball the eye's ray through it meets first, as solid masses hide
      // one another; its own, nearest, where the ray meets none (a leaf standing out of the crown's outline).
      // Lobes overlap, and lit each by its own the dabs of two lobes would interleave in a patchwork.)
      let frontAt: Vec3 | null = null;
      let frontR: Float | null = null;
      if (lobeAt && lobeR && sheet) {
        // (A sheet is lit by its own lobe: it lies along its bough and faces as the bough does, and that, more
        // than the lobe, is how its light runs; the search over the crown's lobes, for every one of its
        // vertices, was most of what a conifer cost.)
        frontAt = lobeAt;
        frontR = lobeR;
      } else if (lobeAt && lobeR) {
        // (Statements, so a function of their own: TSL keeps a loop only inside one.)
        const front = Fn(() => {
          const best = vec4(lobeAt, lobeR).toVar();
          const nearest = float(1e9).toVar();
          const ray = normalize(at.sub(cameraPosition));
          Loop({ start: uint(0), end: uint(T.vrow1.w), type: "uint", condition: "<" }, ({ i }) => {
            const L = lobesR.element(uint(aLimb.w).mul(MAX_LOBES).add(i));
            If(L.w.greaterThan(0), () => {
              const c = toWorld(T, fit.point(L.xyz).add(blown));
              const r = L.w.mul(fit.size);
              const oc = c.sub(cameraPosition);
              const along = dot(oc, ray);
              const miss = dot(oc, oc).sub(along.mul(along));
              const enter = along.sub(sqrt(max(r.mul(r).sub(miss), float(0))));
              If(miss.lessThan(r.mul(r)).and(enter.lessThan(nearest)), () => {
                nearest.assign(enter);
                best.assign(vec4(c, r));
              });
            });
          });
          return best;
        })();
        frontAt = front.xyz;
        frontR = max(front.w, float(0.05));
      }

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
      // (A sheet's own facing, its top's side, as fitted; and its clump's, which its light is laid over.)
      const sheetN = face0;
      const clumpN = dirToWorld(T, fit.normal(aNormal.xyz));
      const nClump = card ? normalize(mix(seen, clumpN, uStyle.z)) : sheet ? clumpN : dirToWorld(T, fit.normal(normalize(aNormal.xyz.add(aOffset.xyz.mul(0.6)))));
      const nLit = card ? nClump : normalize(mix(C.form, nClump, uStyle.z));
      const jit = own.sub(0.5).mul(uStyle.w);
      const leaf = T.srow(0);
      const tone = float(1).add(jit.mul(leaf.w).mul(0.6));
      let albedo = leaf.xyz.mul(T.r2.xyz).mul(tone).mul(vec3(float(1).add(jit.mul(0.06)), 1, float(1).sub(jit.mul(0.1))));
      // (Deep in the crown the leaves see little sky as well as little sun: the crown's own shade.)
      const sky = C.sky.mul(mix(float(1), float(0.7), aNormal.w));
      // (The sun through the leaves, to an eye looking towards it: its colour, and how thin the crown is here.
      // The rest is the leaf's, worked out pixel by pixel: `throughView`.)
      const thin = crownThin(C, aNormal.w, own);
      const throughCol = (a: Vec3): Vec3 => a.mul(T.srow(2).xyz).mul(uSunTint).mul(uStyle2.y.mul(0.9).mul(C.cloud));
      if (lobed) {
        // (Its colour as rich as the style says: away from its own grey, or towards it.)
        const grey = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
        albedo = max(mix(vec3(grey), albedo, uStyle5.x), vec3(0));
        // (The light turned warm and the shade cool, as a painter lays them, each keeping about its brightness:
        // a yellow-green where the sun falls, a teal blue-green where only the sky does. The host's tints
        // stay in charge; the style turns them.)
        const lum = (c: Vec3): Float => dot(c, vec3(0.2126, 0.7152, 0.0722));
        const hueOf = (hue: Vec3, by: Float): Vec3 => mix(albedo, hue.mul(lum(albedo).div(lum(hue))), by);
        // (Far off, the light through the leaves is laid once a dab, as its crown's form faces: a far dab is a
        // few pixels, and worked out pixel by pixel it cost more than all the rest of the far crowns' light.)
        const farThrough = t === 2 ? throughCol(albedo).mul(thin).mul(throughView(nLit, toEye, float(0.5))) : vec3(0);
        const shade = hueOf(vec3(0.07, 0.4, 0.62), uStyle4.w.mul(0.8)).mul(uShadeTint).mul(sky).add(farThrough);
        const lit = hueOf(vec3(0.6, 0.85, 0.12), uStyle4.z.mul(0.7)).mul(uSunTint).mul(uStyle5.w).add(farThrough);
        // (The rim of a lobe, against the light: the sun through its thin edge, more the more the eye looks
        // towards the sun, and the sky's light round it.)
        const against = float(0.3).add(smoothstep(float(-0.3), float(0.9), dot(toEye.negate(), uSun)).mul(0.9));
        const rimCol = albedo.mul(T.srow(2).xyz).mul(uSunTint).mul(against.mul(C.cloud).mul(sqrt(C.sunIn))).add(albedo.mul(uShadeTint).mul(C.standSky).mul(0.35)).mul(uStyle5.y).mul(3);
        const shadeAir = intoAir(shade, at);
        const litAir = intoAir(lit, at);
        const rimAir = intoAir(rimCol, at).sub(intoAir(vec3(0), at));
        // (Its corner and where it is on its lobe's ball as the eye sees it: the corner's offset from the lobe's
        // centre, square to the eye, in the lobe's radii. Across the dab this runs linearly, so the pixel's own
        // place on the ball comes out of it exactly.)
        const thruAir = intoAir(throughCol(albedo), at).sub(intoAir(vec3(0), at));
        lobeLight = { shade: vec4(shadeAir, C.sunIn.mul(C.cloud)), lit: vec4(litAir, jit.mul(0.35)), rim: rimAir, q: vec3(0), eye: toEye, form: nLit, corner: vec3(0), through: vec4(thruAir, thin) };
      } else {
        const litBy = (n: Vec3): Vec3 => {
          const raw = clamp(sunOn(C, n, uStyle2.z).add(jit.mul(0.35)), 0, 1);
          const bands = max(uStyle.y, float(1));
          const lit = mix(raw, floor(raw.mul(bands).add(0.5)).div(bands), uStyle.x);
          let c = albedo.mul(mix(uShadeTint.mul(sky), uSunTint, lit));
          if (card || sheet) {
            // (A leaf seen from the side away from the sun is lit through: a thin leaf passes on about as much
            // light as it sends back, greener and warmer (throughTint), by how squarely the sun is behind it.)
            const behind = max(dot(n, uSun).negate(), float(0)).mul(C.sunIn).mul(C.cloud).mul(mix(float(1), thin.div(max(sqrt(C.sunIn), float(0.05))), uThrough.z));
            c = c.add(albedo.mul(T.srow(2).xyz).mul(uSunTint).mul(behind.mul(uStyle2.y).mul(0.75)));
          }
          return intoAir(c, at);
        };
        if (sheet) {
          // (Its top and its underside each lit as itself, as far as `round` turns it from its clump's facing; the
          // underside a shade darker, its needles' backs. Which shows is the pixel's to say.)
          const own = float(0.25).add(uStyle.z.mul(0.5));
          sheetCols = { top: litBy(normalize(mix(nClump, sheetN, own))), under: litBy(normalize(mix(nClump, sheetN.negate(), own))).mul(0.82) };
        }
        colour = litBy(nLit);
        if (t === 2) colour = colour.add(intoAir(throughCol(albedo), at).sub(intoAir(vec3(0), at)).mul(thin).mul(throughView(nLit, toEye, float(0.5))));
        else {
          // (The view term once a corner, as the leaf faces (a sheet's side towards the eye): across a card it
          // hardly changes. The leaf's own thickness is the pixel's.)
          const nSeen = sheet ? sheetN.mul(select(dot(sheetN, toEye).lessThan(0), float(-1), float(1))) : nLit;
          thruV = { col: vec4(intoAir(throughCol(albedo), at).sub(intoAir(vec3(0), at)).mul(thin), throughBent(nSeen, toEye)), n: nLit, eye: toEye };
        }
      }

      // The corner: turned to face the eye, and spun to an angle of its own (with a flutter in the wind).
      const right = cameraWorldMatrix.mul(vec4(1, 0, 0, 0)).xyz;
      const upCam = cameraWorldMatrix.mul(vec4(0, 1, 0, 0)).xyz;
      const flutter = sin(uTime.mul(5.3).add(own.mul(40))).mul(0.08).mul(clamp(uWind.z.div(6), 0.1, 1.5));
      let ang: Float = own.mul(6.283).add(flutter);
      if (look === "painterly") {
        // (A painterly conifer's sprays are boughs: kept level, give or take a little, hanging their needles.)
        const needle = select(T.srow(3).z.equal(float(LEAF_KIND_ROWS.indexOf("needle"))), float(1), float(0));
        ang = mix(ang, own.sub(0.5).mul(0.5).add(flutter), needle);
      }
      if (lobeAt && look === "sculpted") {
        // (A sprig stands up out of its lobe, as the eye sees it: its picture's up turned away from the lobe's middle.)
        const out = at.sub(lobeAt);
        ang = mix(ang, atan(dot(out, upCam), dot(out, right)).sub(1.5708).add(flutter), sprig);
      }
      const ca = cos(ang);
      const sa = sin(ang);
      const corner = vec2(ca.mul(aDab.x).sub(sa.mul(aDab.y)), sa.mul(aDab.x).add(ca.mul(aDab.y)));
      const size = aDab.z.mul(fit.size).mul(uStyle2.x).mul(mix(float(1), float(0.7), sprig));
      if (sheet) {
        // (A sheet's point is where it is: nothing turns it to the eye.)
        position = at;
        sheetFace = sheetN;
        if (lobeLight && frontAt && frontR) {
          const d = position.sub(frontAt);
          lobeLight.q = d.sub(toEye.mul(dot(d, toEye))).div(frontR);
        }
      } else if (card) {
        // (Its twig runs along `aTangent`, fitted and turned as the tree is, and kept square to its face.)
        const aTangent = attribute<"vec4">("aTangent", "vec4");
        const twig0 = dirToWorld(T, normalize(fit.radial(aTangent.xyz).mul(vec3(fit.across, fit.crownUp, fit.across))));
        const twig = normalize(twig0.sub(face.mul(dot(twig0, face))).add(vec3(0, 1e-4, 0)));
        const across = cross(face, twig);
        const sway = vec2(aDab.x, aDab.y).add(vec2(flutter.mul(0.5), flutter));
        position = at.add(across.mul(sway.x.mul(size))).add(twig.mul(sway.y.mul(size)));
      } else {
        const cornerW = right.mul(corner.x).add(upCam.mul(corner.y));
        position = at.add(cornerW.mul(size));
        if (lobeLight && frontAt && frontR) {
          const d = position.sub(frontAt);
          lobeLight.q = d.sub(toEye.mul(dot(d, toEye))).div(frontR);
          lobeLight.corner = cornerW;
        }
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
      const n = normalize(side.mul(aDab.x).add(normalize(vec3(toEye.x, 0, toEye.z).add(vec3(0, 0, 1e-4))).mul(0.4)));
      const C = crownAt(T, position, n);
      const bark = T.srow(1);
      colour = intoAir(bark.xyz.mul(barkTone(T)).mul(mix(uShadeTint.mul(C.sky), uSunTint, sunOn(C, n, float(0.3)))), position);
    }
    m.positionNode = position;

    const vShares = varying(sharesFor(t, T), "vTreeShares");
    if (!stroke) {
      // (Which picture in the atlas: one of four brush marks; for the realistic look, one of the two sprays of
      // the species' kind of leaf, four columns by two rows, `leafCell` in leaves.ts; for the painterly look,
      // one of three clusters of its kind of leaf near, the cluster of smaller leaves for a gathered dab
      // (marks.ts); for the sculpted, one of three discs or a sprig.)
      const kind = T.srow(3).z;
      const realCell = vec2(mod(kind, float(2)).mul(2).add(step(float(0.5), own)), floor(kind.div(2)));
      const paintedCell = vec2(mod(floor(own.mul(4)), float(2)), floor(floor(own.mul(4)).div(2)));
      // (Painterly: the coarsest density whose leaves keep under leafSize in metres on this dab, the leaf of its
      // kind being LEAF_SHARE of the dab's half width at the coarsest; a gathered dab at least the second.)
      const markSize = aDab.z.mul(fitOf(T).size).mul(uStyle2.x);
      let share: Float = float(LEAF_SHARE.broad);
      let allowed: Float = float(LEAF_SIZE_OF.broad);
      MARK_KINDS.forEach((k, row) => {
        share = select(kind.equal(float(row)), float(LEAF_SHARE[k]), share);
        allowed = select(kind.equal(float(row)), float(LEAF_SIZE_OF[k]), allowed);
      });
      const want = uLeafSize.mul(allowed).div(max(markSize.mul(share), float(1e-4)));
      let density: Float = float(PAINTERLY_DENSITIES.length - 1);
      for (let d = PAINTERLY_DENSITIES.length - 2; d >= 0; d--) density = select(want.greaterThanEqual(float(PAINTERLY_DENSITIES[d])), float(d), density);
      if (t > 0) density = max(density, float(1));
      const painterlyCell = vec2(floor(own.mul(PAINTERLY_VARIANTS - 0.001)).add(density.mul(PAINTERLY_VARIANTS)), kind);
      const disc = floor(own.mul(7.31).fract().mul(2.999));
      const sculptedCell = mix(vec2(mod(disc, float(2)), floor(disc.div(2))), vec2(1, 1), sprig);
      // (A sheet: its kind's top in the sheet atlas (its underside is the row above, chosen by the pixel), a
      // fir one of two by its own number; realistic, its kind's needle or scale spray in the leaf atlas.)
      const sheetKind = aOffset.w;
      const sheetCell = real ? vec2(sheetKind.mul(2), 1) : vec2(select(sheetKind.equal(float(0)), floor(own.mul(1.999)), float(2)), 0);
      const cell = sheet ? sheetCell : real ? realCell : look === "painterly" ? painterlyCell : look === "sculpted" ? sculptedCell : paintedCell;
      const cells = sheet && !real ? vec2(SHEET_COLS, SHEET_ROWS) : real ? vec2(4, Math.ceil(LEAF_KIND_ROWS.length / 2)) : look === "painterly" ? vec2(PAINTERLY_COLS, PAINTERLY_ROWS) : look === "sculpted" ? vec2(SCULPTED_COLS, SCULPTED_ROWS) : vec2(2, 2);
      /** A mark's alpha, kept crisp at any distance (see below). */
      const crisp = (tex: Vec4): Float => {
        // (Its outline kept crisp: the edge's ramp drawn over one pixel, not over however many a texel spans
        // close to, nor smeared over a far pixel's many texels. The mips keep each cell's share at or over the
        // cut as at full size (mips.ts), so a far crown sharpened at the cut keeps the coverage it should, and
        // its overlapping leaves add up as near ones do: alpha to coverage gives two leaves of the same soft
        // alpha the same samples, and a crown of soft far leaves showed the sky through.)
        return clamp(tex.a.sub(0.5).div(clamp(fwidth(tex.a), float(1e-3), float(1))).add(0.5), 0, 1);
      };
      // (Which side of a sheet the eye sees: its top or its underside, pixel by pixel.)
      const vSheetN = sheetFace ? varying(sheetFace, "vTreeSheet") : null;
      const underOf = (eye: Vec3): Float => (vSheetN ? step(dot(vSheetN, eye), float(0)) : float(0));
      const sheetUv = (uv: Vec2, under: Float): Vec2 => (sheet && !real ? uv.add(vec2(0, under.div(SHEET_ROWS))) : uv);
      // (Where in the atlas each corner is: linear across the dab, so worked out once a corner.)
      const vUv = varying(cell.add(aDab.xy.mul(0.5).add(0.5)).div(cells), "vTreeUv");
      if (lobeLight) {
        const L = lobeLight;
        const vShade = varying(L.shade, "vTreeShade");
        const vLit = varying(L.lit, "vTreeLit");
        const vRim = varying(L.rim, "vTreeRim");
        const vQ = varying(L.q, "vTreeLobe");
        const vEye = varying(L.eye, "vTreeEye");
        const vForm = varying(L.form, "vTreeForm");
        const vCorner = varying(L.corner, "vTreeCorner");
        const vThru = t < 2 ? varying(L.through, "vTreeThrough") : null;
        // (Whether its marks are leaves, whose own number lights each leaf its own way.)
        const leafy = look === "painterly" || look === "sculpted" ? 1 : 0;
        m.colorNode = Fn(() => {
          handOver(vShares);
          const eye = normalize(vEye);
          const under = underOf(eye);
          const uv = sheetUv(vUv, under);
          const tex = texture(marks, uv);
          const mark = vec4(tex.rgb, crisp(tex));
          Discard(mark.a.lessThan(uAlphaCut));
          // (A point on a ball seen from the eye, from where it is across the ball's disc in its radii; held
          // just inside the disc's edge, where a dab reaches past its lobe's outline.)
          const ball = (q: Vec3): Vec3 => {
            const l2 = dot(q, q);
            const qs = q.mul(min(float(1), float(0.995).div(sqrt(max(l2, float(1e-6))))));
            return normalize(qs.add(eye.mul(sqrt(max(float(1).sub(dot(qs, qs)), float(0))))));
          };
          const nLobe = ball(vQ);
          const nBulge = ball(vCorner.div(0.9));
          let n = normalize(mix(mix(normalize(vForm), nLobe, uStyle4.x), nBulge, uStyle4.y));
          // (A sheet's own facing, its top's or its underside's, over its lobe's: neighbouring sheets shade as
          // one mass, and a bough's top still catches the light its underside does not.)
          if (vSheetN) n = normalize(mix(n, normalize(vSheetN).mul(float(1).sub(under.mul(2))), float(0.55).add(uStyle.z.mul(0.3))));
          const ownLeaf = mark.g.sub(0.5).mul(uStyle.w).mul(0.5 * leafy);
          const raw = clamp(smoothstep(uStyle2.z.negate(), uStyle3.y, dot(n, uSun)).mul(vShade.w).add(vLit.w).add(ownLeaf), 0, 1);
          const bands = max(uStyle.y, float(1));
          const lit = mix(raw, floor(raw.mul(bands).add(0.5)).div(bands), uStyle.x);
          const edge = pow(float(1).sub(max(dot(n, eye), float(0))), float(2));
          let col = mix(vShade.xyz, vLit.xyz, lit).add(vRim.mul(edge));
          // (The sun through the leaves, each leaf as thin as its own number makes it.)
          const ownThin = leafy ? mark.g.mul(0.7).add(0.15) : float(0.5);
          if (vThru) col = col.add(vThru.xyz.mul(vThru.w).mul(throughView(n, eye, ownThin)));
          // (A bough's underside, under a sunlit top: the sun through its needles, as a card's back has it.)
          if (vThru && vSheetN) col = col.add(vThru.xyz.mul(vThru.w).mul(under.mul(max(dot(normalize(vSheetN), uSun), float(0))).mul(0.6).mul(leafThin(ownThin))));
          // (A sprig is a little lighter than the clay it stands on.)
          col = col.mul(float(1).add(mark.b.mul(0.45)));
          return vec4(col.mul(mix(float(1), mark.r.mul(1.12), uStyle2.w)), mark.a);
        })();
      } else {
        const vCol = varying(colour, "vTreeCol");
        const vUnder = sheetCols ? varying(sheetCols.under, "vTreeUnder") : null;
        const vTop = sheetCols ? varying(sheetCols.top, "vTreeTop") : null;
        const vThru = thruV ? varying(thruV.col, "vTreeThrough") : null;
        const vEye = sheetCols && thruV ? varying(thruV.eye, "vTreeEye") : null;
        // (The painted look's marks have no leaves of their own: each mark one thickness.)
        const ownLeaf = look === "stylized" ? 0 : 1;
        m.colorNode = Fn(() => {
          handOver(vShares);
          const eye = vEye ? normalize(vEye) : vec3(0, 1, 0);
          const under = underOf(eye);
          const uv = sheetUv(vUv, under);
          const tex = texture(marks, uv);
          const mark = vec4(tex.rgb, crisp(tex));
          Discard(mark.a.lessThan(uAlphaCut));
          let base: Vec3 = vTop && vUnder ? mix(vTop, vUnder, under) : vCol;
          base = base.mul(mix(float(1), mark.r.mul(1.12), uStyle2.w));
          if (vThru) base = base.add(vThru.xyz.mul(vThru.w).mul(leafThin(ownLeaf ? mark.g : float(0.5))));
          return vec4(base, mark.a);
        })();
      }
    } else {
      const vCol = varying(colour, "vTreeCol");
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
    // (Which way the surface faces: out from the centre line, tipped where the wood swells, at a collar or a buttress.)
    const aNormal = attribute<"vec3">("aNormal", "vec3");
    const T = treeOf(t, aLimb.w);
    const fit = fitOf(T);
    const centre = fit.point(positionGeometry);
    const limb = fit.point(aLimb.xyz);
    const onLimb = select(aWood.y.greaterThan(0.5), float(1), float(0));
    const moved = centre.add(windAt(T, centre, limb, onLimb));
    const radial = fit.radial(aRadial.xyz);
    // (A twig thinner than half a pixel in the picture is shrunk away: it shows only as a line blinking in and
    // out between pixels as the eye moves. The trunk and limbs never are.)
    const r0 = aRadial.w.mul(fit.wood);
    const atCentre = toWorld(T, moved);
    const pxAcross = r0.mul(2).mul(uPxPerM).div(max(length(cameraPosition.sub(atCentre)), float(0.1)));
    const keepThin = smoothstep(float(0.25), float(0.6), pxAcross);
    const surface = moved.add(radial.mul(r0.mul(keepThin)));
    const at = toWorld(T, surface);
    const nWorld = dirToWorld(T, fit.radial(aNormal));
    const C = crownAt(T, at, nWorld);
    const bark = T.srow(1);
    // (Paler up the trunk where the species' bark is: a eucalyptus's, a plane's.)
    const pale = bark.w.mul(smoothstep(float(0.05), float(0.5), surface.y.div(T.r1.x)));
    // (Twigs are a twig's dark grey-brown whatever the trunk is: a birch is white only on its trunk and big
    // limbs, and white sticks out of its crown read as bones.)
    const thick = aRadial.w.mul(fit.wood);
    const twig = float(1).sub(smoothstep(float(0.03), float(0.11), thick));
    const albedo = mix(mix(bark.xyz, vec3(0.42, 0.4, 0.35), pale.mul(0.7)), vec3(0.055, 0.047, 0.038), twig.mul(0.85)).mul(barkTone(T)).mul(float(0.9).add(aWood.z.mul(0.2)));
    // (Darker at its foot, in the grass and its own shade.)
    const foot = mix(float(0.6), float(1), smoothstep(float(0), float(1.2), surface.y));
    const light = mix(uShadeTint.mul(C.sky), uSunTint, sunOn(C, nWorld, float(0.2))).mul(foot);
    const col = albedo.mul(light);
    // (Moss: where the wood faces up and holds the wet, on a limb's top; low on the trunk, and in the grooves
    // between its buttresses, where its surface swells less than round (aRadial shorter than 1); more on its
    // side away from the sun. None on twigs. As much as the style and the species' bark take.)
    const facesUp = smoothstep(float(0.3), float(0.85), nWorld.y);
    const away = smoothstep(float(0.2), float(-0.6), dot(normalize(vec2(nWorld.x, nWorld.z).add(vec2(1e-4, 0))), normalize(vec2(uSun.x, uSun.z).add(vec2(1e-4, 0)))));
    const low = float(1).sub(smoothstep(float(0.1), float(1.6), surface.y));
    const groove = smoothstep(float(0.99), float(0.91), length(aRadial.xyz)).mul(low);
    const mossAmount = clamp(facesUp.mul(mix(float(0.45), float(1), away)).add(low.mul(mix(float(0.3), float(1), away)).mul(0.75)).add(groove.mul(0.8)), 0, 1)
      .mul(smoothstep(float(0.025), float(0.07), thick))
      .mul(uThrough.w.mul(T.srow(3).w).mul(1.6));
    // (A painter's moss a soft yellow-green; a real one darker, olive.)
    const mossAlbedo = mix(vec3(0.2, 0.3, 0.06), vec3(0.075, 0.1, 0.028), uStyle3.z);
    const vMoss = varying(vec4(intoAir(mossAlbedo.mul(light), at), mossAmount), "vWoodMoss");
    m.positionNode = at;
    const vCol = varying(intoAir(col, at), "vWoodCol");
    const vShares = varying(sharesFor(t, T), "vWoodShares");
    // (Its furrows: ridges running up the wood, some nine round a trunk, wandering a little as they go; round
    // by the way its surface faces, so where a limb leaves its parent, lit as its parent, they run on from its.)
    const vBark = varying(vec3(aNormal.x, aNormal.z, aWood.x), "vWoodBark");
    m.colorNode = Fn(() => {
      handOver(vShares);
      const round = atan(vBark.y, vBark.x);
      const ridge = sin(round.mul(9).add(sin(vBark.z.mul(1.7).add(round.mul(2))).mul(1.4)));
      const furrows = mix(float(1), float(0.68).add(smoothstep(float(-0.4), float(0.7), ridge).mul(0.42)), uStyle3.z);
      // (The moss: flat and soft where the bark is painted; where it is furrowed, in the furrows first and
      // in patches, a cheap wobble of the furrows' own coordinates.)
      const patch = sin(round.mul(7).add(vBark.z.mul(4.3))).mul(sin(round.mul(4).sub(vBark.z.mul(6.1)))).mul(0.22).add(sin(vBark.z.mul(19.7).add(round.mul(23))).mul(sin(round.mul(31).sub(vBark.z.mul(27.1)))).mul(0.16)).add(0.5);
      const inFurrow = float(1).sub(smoothstep(float(-0.4), float(0.7), ridge));
      const where = patch.mul(0.6).add(inFurrow.mul(0.4));
      const real = smoothstep(float(1).sub(vMoss.w), float(1.18).sub(vMoss.w), where);
      const cover = mix(smoothstep(float(0.4), float(0.5), vMoss.w), real, uStyle3.z);
      const moss = vMoss.xyz.mul(mix(float(1), patch.mul(0.5).add(0.75), uStyle3.z));
      return vec4(mix(vCol.mul(furrows), moss, cover), 1);
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
      const m = dabMaterial(t, false, real && t <= 1);
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      mesh.name = m.name;
      group.add(mesh);
      geometries.push(g);
      materials.push(m);
      meshes.push({ mesh, tier: t, wood: false });
    }
    if (sheetSets[t].index.length > 0) {
      const g = geometryOf(sheetSets[t], sheetArgs, t);
      const m = dabMaterial(t, false, false, true);
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      mesh.name = `trees-sheets-${t}`;
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
  let warnedDepth = false;
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

  const pieces = TIER_SHAPES.map((_, t) => ({ dabs: dabSets[t].index.length / 6, wood: woodSets[t].index.length / 3, sheets: sheetSets[t].index.length / 3 }));

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
      if (!warnedDepth && !renderer.reversedDepthBuffer) {
        warnedDepth = true;
        console.warn("webgpu-trees: the renderer's depth is not reversed (reversedDepthBuffer: true): neighbouring crowns' leaves will flicker, their dabs lying closer in depth than it can tell apart.");
      }
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
      uStyle4.value.set(style.lobe, style.bulge, style.warm, style.cool);
      uStyle5.value.set(style.chroma, style.rim, style.sprigs, style.bright);
      uLeafSize.value = style.leafSize;
      uThrough.value.set(style.throughPower, style.throughWarp, style.throughVary, style.moss);
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
      for (const a of [treeAttr, variantAttr, speciesAttr, lobeAttr, visibleAttr, countAttr, dabArgs, woodArgs, strokeArgs, sheetArgs]) a.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      atlas.dispose();
      sheetAtlas?.dispose();
      if (shadeNode.value !== shadeTex) shadeNode.value.dispose();
      shadeTex.dispose();
    },
  };
}
