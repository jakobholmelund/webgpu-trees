// The gallery: every species, in a look (or every look of one species), from the same five views, under
// the same sun and wind, the same every time. A fixed place to judge the trees by eye, and to set one
// commit's trees beside another's: "Save set" keeps them as a contact sheet named by the commit, and
// "Compare" lays two sheets side by side, flickers them, or shows where they differ.
//
// One renderer, off the page, draws every cell in turn, each into a small picture: a scene with the lab's
// sky and ground (stage.ts), one tree of the species at its own size (or a group of five for the far
// view), from a view worked out from the tree's size (views.ts).
//
//   ?look=painterly | all     the look (stylized, painterly, sculpted, real), or all of them for one species
//   ?one=3                    the species (its row) all the looks are drawn for
//   ?species=0,3,Oak          only these species (rows or names); else ?region= and ?kind= choose them
//   ?region=france ?kind=conifer
//   ?views=tee,far            only these views (tee, fairway, far, under, trunk)
//   ?hour=9 ?wind=4           the sun's hour and the wind (m/s), for every cell (scripts may also give
//                             `style`: numbers of the style over the look's own)
//   ?day=105                  the day of the year (a gorse's bloom); left out, none (the style's bloom)
//   ?cell=400                 a cell's width in pixels (its height is 1.25 times it)
//   ?screen=1080              the lines of the screen a cell is a piece of: the trees choose their tier as on it
//   ?thumbs=0                 no reference photographs' thumbnails (the links stay)
//   ?seed=7 | 3:7,Oak:2       another set of trees (`VariantOptions.seed`), for every species or by species:
//                             a forked trunk or a clump instead of one stem, where its species has them
//   ?photos=<address>         also a photograph of your own per species, <address><name>.jpg, from a
//                             folder outside the repository that you serve yourself
//   ?refs=1                   the reference row: each species' AI-generated reference pictures
//                             (lab/references) over ours from the same four views, framed as they are
//                             (tee25, fairway60, up, foot), in their light: 8:00 with the sun on the left
//   ?sun=left                 the sun mirrored to the eye's left (the reference pictures' light)
//   ?fitted=1                 each species at the sizes the game's courses give it (courseSizes.ts: p10, p50
//                             and p90 of a course's first hole, or a young, typical and old tree), under its
//                             specimen and its reference pictures, from the tee (25 m) and 60 m, in their light
//
// For scripts: `await __gallery.render({ look, views, species, refs })` gives every cell as a PNG data URL;
// `await __gallery.sheet({...})` the contact sheet; `await __gallery.saveCells({...}, prefix)` writes each cell to
// the GALLERY_OUT folder; `await __gallery.save({...})` writes the sheet to the
// folder the dev server was started with (GALLERY_OUT=<folder> pnpm dev).

import * as THREE from "three/webgpu";
import { ALL_SPECIES, type Architecture, DEFAULT_DETAIL, DEFAULT_VARIANT_OPTIONS, LOOK_STYLES, REGION_ROWS, type Region, TREE_LOOKS, type TreeInstance, type TreeLook, type TreeSpecies, type TreeStyle, type Trees, cloneSpecies, createTrees } from "../src/index";
import referenceText from "./REFERENCE.md?raw";
import { type RefSet, readManifest, setsFor, speciesWithReferences } from "./referenceRow";
import { type Reference, readReferences } from "./references";
import manifestText from "./references/manifest.json?raw";
import { SKY, makeGround, makeSky, sunAt, sunFromLeft, tintsFor } from "./stage";
import { ALL_VIEWS, GROUP, REFERENCE_SCREEN, REF_VIEWS, REF_VIEW_NAMES, type Screen, type Shot, type Standing, VIEWS, VIEW_NAMES, type ViewName, aspectOf, detailScale, groupSpacing, shotFor } from "./views";
import { type FitSize, fitSizesFor, surveyTrunk } from "./courseSizes";
import { measured } from "./world";

declare const __COMMIT__: string;

const LOOK_LABELS: Record<TreeLook, string> = { stylized: "Painted", painterly: "Painterly", sculpted: "Sculpted", real: "Real" };
const HOURS: [string, number][] = [["Dawn", 6], ["Early", 8], ["Morning", 9], ["Noon", 13], ["Evening", 18]];
/** The reference pictures' hour: a clear morning, the sun low (34 degrees) and, mirrored, on the left. */
const REF_HOUR = 8;
const WINDS: [string, number][] = [["Still", 0], ["Breeze", 4], ["Wind", 9], ["Gale", 16]];
const KINDS: Architecture[] = ["broadleaf", "conifer", "shrub", "palm"];
const REGION_LABELS: Record<Region, string> = {
  california: "California",
  "pacific-northwest": "Pacific Northwest",
  "great-britain": "Great Britain",
  france: "France",
  ontario: "Ontario",
  netherlands: "Netherlands",
  denmark: "Denmark",
};
/** The moment every cell is drawn at (s): the wind's pose is the same in every picture. */
const TIME_S = 7;
const WIND_HEADING = 37;

type LookChoice = TreeLook | "all";

interface Settings {
  look: LookChoice;
  /** The species all the looks are drawn for. */
  one: number;
  /** Only these species (rows), or null: those the region and kind choose. */
  only: number[] | null;
  region: Region | "all";
  kind: Architecture | "all";
  views: ViewName[];
  hour: number;
  wind: number;
  /** The day of the year (a flowering species' bloom), or null: the style's bloom. */
  day: number | null;
  /** Numbers of the style over the look's own (for scripts: one style beside another). */
  style?: Partial<TreeStyle>;
  /** The reference row: each species' reference pictures over ours, from the reference views. */
  refs: boolean;
  /** The sun mirrored to the eye's left. */
  sunLeft: boolean;
  /** Each species at its course sizes too (courseSizes.ts), under its specimen: the reference row's light and views. */
  fitted: boolean;
}

/** One picture: a species in a look from a view. */
interface Cell {
  key: string;
  row: number;
  look: TreeLook;
  view: ViewName;
  blob: Blob;
  url: string;
  /** How many trees each tier drew. */
  tiers: number[];
  shot: Shot;
  /** The course size it was drawn at, or none: its specimen's. */
  fit?: FitSize;
}

/** What the script asks for (all of it may be left out: the page's own settings). */
interface RenderAsk {
  look?: LookChoice;
  views?: ViewName[];
  /** Rows or names. */
  species?: (number | string)[];
  one?: number | string;
  hour?: number;
  wind?: number;
  /** The day of the year, or null for none. */
  day?: number | null;
  region?: Region | "all";
  kind?: Architecture | "all";
  /** Numbers of the style over the look's own. */
  style?: Partial<TreeStyle>;
  /** The reference row (its views, its light, unless asked otherwise). */
  refs?: boolean;
  sunLeft?: boolean;
  /** Each species at its course sizes too (`?fitted=1`): the reference row with it. */
  fitted?: boolean;
}

const query = new URLSearchParams(location.search);
const species: TreeSpecies[] = ALL_SPECIES.map((s) => cloneSpecies(s));
const references = new Map<string, Reference>(readReferences(referenceText).map((r) => [r.name, r]));
const refManifest = readManifest(manifestText);
const refSpecies = speciesWithReferences(refManifest);
/** The reference pictures' addresses, by file name (Vite hands out each one's). */
const refUrls = new Map(Object.entries(import.meta.glob("./references/*.avif", { eager: true, query: "?url", import: "default" }) as Record<string, string>).map(([k, v]) => [k.replace(/^.*\//, ""), v]));
const cellW = Math.max(120, Math.min(1200, Number(query.get("cell")) || 400));
const cellH = Math.round(cellW * 1.25);
/** A cell's size for a view: a reference view's as wide as its picture is for the cell's height. */
const isRef = (view: ViewName) => (REF_VIEW_NAMES as readonly string[]).includes(view);
const sizeOf = (view: ViewName) => {
  const a = aspectOf(view, cellW / cellH);
  return a === cellW / cellH ? { w: cellW, h: cellH } : { w: Math.round(cellH * a), h: cellH };
};
const screen: Screen = { lines: Math.max(200, Number(query.get("screen")) || REFERENCE_SCREEN.lines), fov: REFERENCE_SCREEN.fov };
const photosAt = query.get("photos");
/** Another set of trees (`?seed`), for every species or by species: its seed for a row. */
const seedFor = (row: number): number => {
  let all = 0;
  for (const part of (query.get("seed") ?? "").split(",").filter(Boolean)) {
    const [a, b] = part.split(":");
    if (b === undefined) all = Number(a) || 0;
    else if (rowOf(a) === row) return Number(b) || 0;
  }
  return all;
};

function el<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}
function make<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}
function fail(text: string): never {
  el("fail-text").textContent = text;
  el("fail").classList.add("on");
  throw new Error(text);
}
const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "");

/** A species by its row or its name (any case), or -1. */
function rowOf(v: number | string): number {
  if (typeof v === "number" || /^\d+$/.test(v)) {
    const n = Number(v);
    return n >= 0 && n < species.length ? n : -1;
  }
  const s = v.trim().toLowerCase();
  return species.findIndex((sp) => sp.name.toLowerCase() === s || slug(sp.name) === slug(s) || sp.latin?.toLowerCase() === s);
}

function settingsFromQuery(): Settings {
  const look = query.get("look");
  const fitted = query.get("fitted") === "1";
  const refs = fitted || query.get("refs") === "1";
  const views = (query.get("views") ?? "").split(",").filter((v): v is ViewName => (viewsFor({ refs, fitted }) as string[]).includes(v));
  const only = (query.get("species") ?? "").split(",").filter(Boolean).map(rowOf).filter((r) => r >= 0);
  const region = query.get("region") as Region | null;
  const kind = query.get("kind") as Architecture | null;
  const hour = Number(query.get("hour"));
  const wind = Number(query.get("wind"));
  const day = Number(query.get("day"));
  return {
    look: look === "all" ? "all" : (TREE_LOOKS.find((l) => l === look) ?? "stylized"),
    one: Math.max(0, rowOf(query.get("one") ?? "0")),
    only: only.length > 0 ? only : null,
    region: region && REGION_ROWS.includes(region) ? region : "all",
    kind: kind && KINDS.includes(kind) ? kind : "all",
    views: views.length > 0 ? views : fitted ? [...FITTED_VIEWS] : refs ? [...REF_VIEW_NAMES] : [...VIEW_NAMES],
    hour: query.has("hour") && Number.isFinite(hour) ? hour : refs ? REF_HOUR : 9,
    wind: query.has("wind") && Number.isFinite(wind) ? wind : 4,
    day: query.has("day") && Number.isFinite(day) ? day : null,
    refs,
    sunLeft: query.has("sun") ? query.get("sun") === "left" : refs,
    fitted,
  };
}

/**
 * The fitted mode's views: the tee from 25 m and the fairway from 60 m, as the reference pictures are, and the
 * gallery's own tee (two and a half crown widths off), close enough to judge a small tree's form.
 */
const FITTED_VIEWS: readonly ViewName[] = ["tee25", "fairway60", "tee"];
/** The views a setting may draw: the reference row's, or the gallery's; the fitted mode's either. */
const viewsFor = (s: { refs: boolean; fitted: boolean }): readonly ViewName[] => (s.fitted ? [...REF_VIEW_NAMES, ...VIEW_NAMES] : s.refs ? REF_VIEW_NAMES : VIEW_NAMES);

/** A row of cells: a species in a look, at its specimen's size or at a course's (`fit`). */
interface Row {
  row: number;
  look: TreeLook;
  fit?: FitSize;
}

/** The rows a setting draws: species in a look, or the looks of one species; in the fitted mode, each at its course sizes too. */
function rowsOf(s: Settings): Row[] {
  if (s.look === "all") return TREE_LOOKS.map((look) => ({ row: s.one, look }));
  const rows = s.only ?? species.map((_, i) => i).filter((i) => (s.region === "all" || (species[i].regions ?? []).includes(s.region as Region)) && (s.kind === "all" || species[i].architecture === s.kind) && (s.fitted || !s.refs || refSpecies.has(species[i].name)));
  return rows.flatMap((row) => [{ row, look: s.look as TreeLook }, ...(s.fitted ? fitSizesFor(species[row]).map((fit) => ({ row, look: s.look as TreeLook, fit })) : [])]);
}

/** A setting's picture of the trees, as a file name: the commit, the look, the light, and what was left out. */
function setName(s: Settings, commit: string): string {
  const parts = ["trees", commit, s.look === "all" ? `${slug(species[s.one].name)}-all-looks` : s.look, `h${s.hour}${s.sunLeft ? "left" : ""}`, `w${s.wind}`];
  if (s.refs) parts.splice(2, 0, s.fitted ? "fitted" : "refs");
  if (s.look !== "all") {
    if (s.only && s.only.length < species.length) parts.push(s.only.length <= 4 ? s.only.map((r) => slug(species[r].name)).join("+") : `${s.only.length}-species`);
    else {
      if (s.region !== "all") parts.push(s.region);
      if (s.kind !== "all") parts.push(s.kind);
    }
  }
  if (s.views.join() !== (s.fitted ? FITTED_VIEWS : s.refs ? REF_VIEW_NAMES : VIEW_NAMES).join()) parts.push(s.views.join("+"));
  if (cellW !== 400) parts.push(`c${cellW}`);
  if (screen.lines !== REFERENCE_SCREEN.lines) parts.push(`s${screen.lines}`);
  return parts.join("-") + ".png";
}

async function commitNow(): Promise<string> {
  // (The dev server says the commit as it is now; a build has the one it was built at.)
  try {
    const r = await fetch("/__gallery/commit");
    const text = (await r.text()).trim();
    if (r.ok && /^[0-9a-f]{4,40}(-dirty)?$/.test(text)) return text;
  } catch {
    // Not the dev server.
  }
  return __COMMIT__;
}

async function start() {
  if (!("gpu" in navigator)) fail("This page needs WebGPU, which this browser does not have.");
  // (As the lab's: drawn with four samples, its depth reversed, not see-through.)
  const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false, reversedDepthBuffer: true });
  try {
    await renderer.init();
  } catch (err) {
    fail(`WebGPU could not be started here: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!(renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend) fail("This page needs WebGPU; only WebGL is available here.");
  renderer.setPixelRatio(1);
  renderer.setSize(cellW, cellH, false);

  // ---- The stage: the lab's sky and ground, its fog as for one tree. ----

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 105, 700);
  scene.add(makeSky());
  const ground = makeGround();
  scene.add(ground.mesh);
  const plainGround = ground.mesh.material;
  const camera = new THREE.PerspectiveCamera(50, cellW / cellH, 0.05, 20000);
  // (Each picture is copied off the renderer's canvas at once, in the same task it was drawn in.)
  const grab = make("canvas", { width: cellW, height: cellH });
  const grabCtx = grab.getContext("2d")!;

  // ---- The trees: for a species in a look, one at its own size, and five of its kind together. ----

  interface Stand {
    trees: Trees;
    groundMat: THREE.MeshBasicNodeMaterial;
    standing: Standing[];
    forkY: number;
    shadeHour: number;
    shadeSide: number;
  }
  const standOf = (row: number, look: TreeLook, group: boolean, over?: Partial<TreeStyle>, fit?: FitSize): Stand => {
    const sp = species[row];
    const step = groupSpacing(sp.crownRadius);
    // (At a course's size, its trunk as its species' for its height, as the game's survey leaves it; a palm's
    // the survey's own, 3 % of its height.)
    const one: TreeInstance = fit ? { x: 0, y: 0, z: 0, species: row, height: fit.height, crownRadius: fit.crownRadius, crownBase: fit.crownBase, ...(sp.architecture === "palm" ? { trunkRadius: surveyTrunk(fit.height) } : {}), ...(fit.stand ? { stand: fit.stand } : {}) } : { x: 0, y: 0, z: 0, species: row };
    const list: TreeInstance[] = group ? GROUP.map(([x, z], k) => measured(sp, row, x * step, z * step, k + 1)) : [one];
    const trees = createTrees({ trees: list, species, look, variants: { ...DEFAULT_VARIANT_OPTIONS, seed: seedFor(row) } });
    Object.assign(trees.style, LOOK_STYLES[look], over);
    const standing = trees.plan.placements.map((p) => ({ x: p.x, z: p.z, ...p.size }));
    // (Where the trunk first forks: the lowest limb of a fair size leaving the stem, in the tree as grown, at
    // the size it stands at. A tree of many stems forks at its foot.)
    const p0 = trees.plan.placements[0];
    const g = trees.grown[p0.variant];
    const sk = g.skeleton;
    let fork = Infinity;
    for (let i = 0; i < sk.count; i++) {
      const parent = sk.parent[i];
      if (parent < 0 || sk.order[i] !== 1 || sk.order[parent] !== 0) continue;
      if (sk.radius[i] < sk.radius[0] * 0.25) continue;
      fork = Math.min(fork, sk.y[parent]);
    }
    if (sp.stems > 1) fork = 0;
    const forkY = (Number.isFinite(fork) ? fork : g.size.crownBase) * (p0.size.height / g.size.height);
    return { trees, groundMat: ground.materialFor(trees), standing, forkY, shadeHour: NaN, shadeSide: group ? 420 : 320 };
  };
  const dropStand = (s: Stand) => {
    scene.remove(s.trees.object);
    s.trees.dispose();
    s.groundMat.dispose();
  };

  const sunNow = new THREE.Vector3();
  /** Draw one cell. Nothing else may draw meanwhile (see `exclusive`). */
  const drawCell = async (stand: Stand, row: number, look: TreeLook, view: ViewName, s: Settings, fit?: FitSize): Promise<Cell> => {
    const { w, h } = sizeOf(view);
    const shot = shotFor({ view, trees: stand.standing, forkY: stand.forkY, aspect: w / h, cellLines: h, screen });
    // (A reference view, through a phone's wide lens, drawn at the screen's own pixels for its field and shrunk
    // into the cell, as a screenshot of the game would be: drawn at the cell's few pixels, a pine's needles
    // were mipped down into a broad leaf's blot a player never sees. The tiers as on the screen.)
    const ss = isRef(view) ? Math.min(4, Math.max(1, (screen.lines * Math.tan((shot.fov * Math.PI) / 360)) / Math.tan((screen.fov * Math.PI) / 360) / h)) : 1;
    const rw = Math.round(w * ss);
    const rh = Math.round(h * ss);
    renderer.setSize(rw, rh, false);
    if (grab.width !== w || grab.height !== h) Object.assign(grab, { width: w, height: h });
    camera.fov = shot.fov;
    camera.aspect = rw / rh;
    camera.position.set(...shot.eye);
    camera.lookAt(...shot.target);
    camera.updateProjectionMatrix();
    const t = stand.trees;
    // (The realistic look's photographs first, so a cell never shows the trees without them.)
    await t.ready;
    scene.add(t.object);
    ground.mesh.material = stand.groundMat;
    // The light, as the lab sets it.
    sunNow.copy(s.sunLeft ? sunFromLeft(s.hour) : sunAt(s.hour));
    tintsFor(sunNow, ground.uSunTint.value, ground.uShadeTint.value);
    ground.uSun.value.copy(sunNow);
    t.environment.sun.copy(sunNow);
    t.environment.sunTint.copy(ground.uSunTint.value);
    t.environment.shadeTint.copy(ground.uShadeTint.value);
    const heading = THREE.MathUtils.degToRad(WIND_HEADING);
    t.environment.wind.set(Math.cos(heading), Math.sin(heading), s.wind);
    t.environment.day = s.day;
    const shadeKey = s.sunLeft ? -s.hour : s.hour;
    if (stand.shadeHour !== shadeKey) {
      const side = stand.shadeSide;
      t.bakeShade({ x0: -side / 2, z0: -side / 2, width: side, depth: side, cell: 0.4 });
      stand.shadeHour = shadeKey;
    }
    // (The tiers by the tree's size on the screen the cell is a piece of, not on the cell.)
    const k = detailScale(rh, shot.fov, screen);
    t.detail.nearPx = DEFAULT_DETAIL.nearPx * k;
    t.detail.farPx = DEFAULT_DETAIL.farPx * k;
    // (Twice: whatever the first frame of new trees has still to set up, the second has.)
    for (let i = 0; i < 2; i++) {
      t.update(renderer, camera, TIME_S);
      renderer.render(scene, camera);
    }
    grabCtx.imageSmoothingEnabled = true;
    grabCtx.imageSmoothingQuality = "high";
    grabCtx.drawImage(renderer.domElement, 0, 0, w, h);
    scene.remove(t.object);
    ground.mesh.material = plainGround;
    const tiers = await t.countDrawn(renderer);
    const blob = await new Promise<Blob>((done, no) => grab.toBlob((b) => (b ? done(b) : no(new Error("no picture"))), "image/png"));
    return { key: cellKey(row, look, view, s, fit), row, look, view, blob, url: URL.createObjectURL(blob), tiers, shot, fit };
  };

  const cellKey = (row: number, look: TreeLook, view: ViewName, s: Settings, fit?: FitSize) => `${row}|${look}|${view}|${s.hour}${s.sunLeft ? "L" : ""}|${s.wind}|${s.day}${s.style ? `|${JSON.stringify(s.style)}` : ""}${fit ? `|${fit.key}` : ""}`;
  const cells = new Map<string, Cell>();

  /** One thing at a time on the renderer: what asks next waits for what asked before. */
  let queue: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  };

  /**
   * Every cell of a setting, drawn if not drawn already, in order, row by row; `onCell` hears of each.
   * `stillWanted` is asked between cells: false stops it.
   */
  const renderSet = (s: Settings, onCell: (c: Cell, done: number, all: number) => void, stillWanted: () => boolean = () => true) =>
    exclusive(async () => {
      const rows = rowsOf(s);
      const all = rows.length * s.views.length;
      let done = 0;
      const out: Cell[] = [];
      for (const { row, look, fit } of rows) {
        const wanted = s.views.filter((v) => !cells.has(cellKey(row, look, v, s, fit)));
        let one: Stand | null = null;
        let group: Stand | null = null;
        try {
          for (const view of s.views) {
            if (!stillWanted()) return out;
            let c = cells.get(cellKey(row, look, view, s, fit));
            if (!c && wanted.includes(view)) {
              const stand = view === "far" ? (group ??= standOf(row, look, true, s.style)) : (one ??= standOf(row, look, false, s.style, fit));
              c = await drawCell(stand, row, look, view, s, fit);
              cells.set(c.key, c);
              // (A moment for the page between cells: a pane out of view draws no frames, so not a frame.)
              await new Promise((r) => setTimeout(r, 0));
            }
            out.push(c!);
            onCell(c!, ++done, all);
          }
        } finally {
          if (one) dropStand(one);
          if (group) dropStand(group);
        }
      }
      return out;
    });

  // ---- The contact sheet: every cell of a setting in one picture, with what it is written on it. ----

  const SHEET = { pad: 16, label: 250, gap: 6, head: 58, colHead: 26, caption: 18 };
  const tierText = (t: number[]) => {
    const names = ["near", "mid", "far"];
    const drawn = t.map((n, i) => [n, names[i]] as const).filter(([n]) => n > 0);
    if (drawn.length === 0) return "nothing drawn";
    return drawn.map(([n, name]) => (t.reduce((a, b) => a + b, 0) > 1 ? `${name} ${n}` : name)).join(" · ");
  };
  const caption = (c: Cell) => `${tierText(c.tiers)} · ${Math.hypot(c.shot.eye[0], c.shot.eye[2]).toFixed(c.view === "trunk" || c.view === "under" ? 1 : 0)} m · ${c.shot.fov.toFixed(0)}°`;

  /** A reference picture, decoded, by file name (kept: the same few are drawn into many sheets). */
  const refBitmaps = new Map<string, Promise<ImageBitmap | null>>();
  const refBitmap = (file: string) => {
    let p = refBitmaps.get(file);
    if (!p) {
      const url = refUrls.get(file);
      p = url
        ? fetch(url)
            .then((r) => r.blob())
            .then((b) => createImageBitmap(b))
            .catch(() => null)
        : Promise.resolve(null);
      refBitmaps.set(file, p);
    }
    return p;
  };
  /** A species' reference sets, when the setting shows the reference row. */
  const refSetsOf = (s: Settings, row: number): RefSet[] => (s.refs && s.look !== "all" ? setsFor(refManifest, species[row].name) : []);
  /** The reference picture a reference view's cell sits under. */
  const refPicture = (set: RefSet, view: ViewName) => set.pictures.get(REF_VIEWS.find((v) => v.name === view)?.ref ?? "");

  const makeSheet = async (s: Settings, list: Cell[], commit: string): Promise<Blob> => {
    const rows = rowsOf(s);
    const n = s.views.length;
    const colW = s.views.map((v) => sizeOf(v).w);
    const colX = colW.map((_, i) => colW.slice(0, i).reduce((a, b) => a + b + SHEET.gap, 0));
    const w = SHEET.pad * 2 + SHEET.label + colW.reduce((a, b) => a + b, 0) + n * SHEET.gap;
    const rowH = cellH + SHEET.caption + SHEET.gap;
    const refRows = rows.reduce((a, r) => a + (r.fit ? 0 : refSetsOf(s, r.row).length), 0);
    const h = SHEET.pad * 2 + SHEET.head + SHEET.colHead + (rows.length + refRows) * rowH;
    const canvas = make("canvas", { width: w, height: h });
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f6f1e4";
    ctx.fillRect(0, 0, w, h);
    const ink = "#1f3a2b";
    const soft = "#55695c";
    const serif = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
    const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.font = `600 22px ${serif}`;
    const title = s.look === "all" ? `${species[s.one].name}, every look` : `${LOOK_LABELS[s.look]} look${s.fitted ? ", at the courses' sizes, under the specimen and its reference pictures (AI-generated)" : s.refs ? ", under its reference pictures (AI-generated)" : ""}`;
    ctx.fillText(`webgpu-trees ${commit} · ${title}`, SHEET.pad, SHEET.pad);
    ctx.fillStyle = soft;
    ctx.font = `13px ${sans}`;
    const hourLabel = HOURS.find(([, v]) => v === s.hour)?.[0];
    ctx.fillText(`${hourLabel ? `${hourLabel}, ` : ""}${s.hour}:00${s.sunLeft ? ", the sun on the left" : ""} · wind ${s.wind} m/s · cells ${cellW}×${cellH}, pieces of a ${screen.lines}-line, ${screen.fov}° screen (tiers as on it) · time ${TIME_S} s`, SHEET.pad, SHEET.pad + 30);
    const x0 = SHEET.pad + SHEET.label;
    const y0 = SHEET.pad + SHEET.head;
    ctx.font = `600 12px ${sans}`;
    ctx.fillStyle = soft;
    s.views.forEach((v, i) => ctx.fillText(ALL_VIEWS.find((x) => x.name === v)!.label.toUpperCase(), x0 + colX[i], y0 + 6));
    const byKey = new Map(list.map((c) => [c.key, c]));
    let line = 0;
    for (let r = 0; r < rows.length; r++) {
      const { row, look, fit } = rows[r];
      const sp = species[row];
      // (Its reference pictures first, a row a set, each over the view of ours framed as it is.)
      for (const set of fit ? [] : refSetsOf(s, row)) {
        const y = y0 + SHEET.colHead + line++ * rowH;
        ctx.fillStyle = ink;
        ctx.font = `600 17px ${serif}`;
        ctx.fillText(sp.name, SHEET.pad, y + 2, SHEET.label - 12);
        ctx.font = `italic 13px ${serif}`;
        ctx.fillStyle = soft;
        ctx.fillText(`Reference, AI-generated (${set.set})`, SHEET.pad, y + 24, SHEET.label - 12);
        ctx.font = `12px ${sans}`;
        wrapText(ctx, set.note, SHEET.pad, y + 44, SHEET.label - 14, 16);
        for (let i = 0; i < n; i++) {
          const pic = refPicture(set, s.views[i]);
          const bmp = pic ? await refBitmap(pic.file) : null;
          if (!bmp) continue;
          const { w: cw, h: ch } = sizeOf(s.views[i]);
          // (Cover the cell: the picture's own shape is the cell's, to a pixel or two.)
          const k = Math.max(cw / bmp.width, ch / bmp.height);
          const sw = cw / k;
          const sh = ch / k;
          ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, x0 + colX[i], y, cw, ch);
          ctx.fillStyle = soft;
          ctx.font = `11px ${sans}`;
          ctx.fillText(`${pic!.file} · AI-generated`, x0 + colX[i], y + cellH + 3, cw);
        }
      }
      const y = y0 + SHEET.colHead + line++ * rowH;
      ctx.fillStyle = ink;
      ctx.font = `600 17px ${serif}`;
      ctx.fillText(s.look === "all" ? LOOK_LABELS[look] : sp.name, SHEET.pad, y + 2, SHEET.label - 12);
      ctx.font = `italic 13px ${serif}`;
      ctx.fillStyle = soft;
      if (fit) {
        ctx.fillText(fit.label, SHEET.pad, y + 24, SHEET.label - 12);
        ctx.font = `12px ${sans}`;
        wrapText(ctx, fit.note, SHEET.pad, y + 44, SHEET.label - 14, 16);
      } else {
        ctx.fillText(s.fitted ? "Specimen" : s.look === "all" ? sp.name : (sp.latin ?? ""), SHEET.pad, y + 24, SHEET.label - 12);
        ctx.font = `12px ${sans}`;
        ctx.fillText(`${sp.architecture} · ${sp.height} m, crown ${(sp.crownRadius * 2).toFixed(0)} m`, SHEET.pad, y + 44, SHEET.label - 12);
        const regions = (sp.regions ?? []).map((g) => REGION_LABELS[g]).join(", ");
        wrapText(ctx, regions, SHEET.pad, y + 62, SHEET.label - 14, 16);
      }
      for (let i = 0; i < n; i++) {
        const c = byKey.get(cellKey(row, look, s.views[i], s, fit));
        const x = x0 + colX[i];
        if (!c) continue;
        const bmp = await createImageBitmap(c.blob);
        ctx.drawImage(bmp, x, y);
        bmp.close();
        ctx.fillStyle = soft;
        ctx.font = `11px ${sans}`;
        ctx.fillText(caption(c), x, y + cellH + 3, colW[i]);
      }
    }
    return new Promise<Blob>((done, no) => canvas.toBlob((b) => (b ? done(b) : no(new Error("the sheet could not be made"))), "image/png"));
  };
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineH: number) {
    let line = "";
    for (const word of text.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        ctx.fillText(line, x, y);
        y += lineH;
        line = word;
      } else line = next;
    }
    if (line) ctx.fillText(line, x, y);
  }

  // ---- The page: the bar, the grid. ----

  const settings = settingsFromQuery();
  let commit = await commitNow();
  el("gcommit").textContent = `commit ${commit}`;
  const status = (text: string) => (el("gstatus-line").textContent = text);
  document.documentElement.style.setProperty("--cell-aspect", `${cellW} / ${cellH}`);
  const barH = () => document.documentElement.style.setProperty("--bar-h", `${el("gbar").offsetHeight}px`);
  addEventListener("resize", barH);

  const writeQuery = () => {
    const q = new URLSearchParams();
    if (settings.look !== "stylized") q.set("look", settings.look);
    if (settings.look === "all") q.set("one", String(settings.one));
    if (settings.only) q.set("species", settings.only.join(","));
    if (settings.region !== "all") q.set("region", settings.region);
    if (settings.kind !== "all") q.set("kind", settings.kind);
    if (settings.views.join() !== (settings.fitted ? FITTED_VIEWS : settings.refs ? REF_VIEW_NAMES : VIEW_NAMES).join()) q.set("views", settings.views.join(","));
    if (settings.fitted) q.set("fitted", "1");
    else if (settings.refs) q.set("refs", "1");
    if (settings.hour !== (settings.refs ? REF_HOUR : 9)) q.set("hour", String(settings.hour));
    if (settings.sunLeft !== settings.refs) q.set("sun", settings.sunLeft ? "left" : "right");
    if (settings.wind !== 4) q.set("wind", String(settings.wind));
    if (settings.day !== null) q.set("day", String(settings.day));
    for (const key of ["cell", "screen", "photos", "thumbs", "seed"]) if (query.has(key)) q.set(key, query.get(key)!);
    const text = q.toString();
    history.replaceState(null, "", text ? `${location.pathname}?${text}` : location.pathname);
  };

  const segment = <T>(host: HTMLElement, options: [string, T][], current: () => T, pick: (value: T) => void) => {
    const buttons = options.map(([label, value]) => {
      const b = make("button", { type: "button", textContent: label });
      b.addEventListener("click", () => {
        pick(value);
        refresh();
      });
      host.append(b);
      return [b, value] as const;
    });
    const refresh = () => buttons.forEach(([b, value]) => b.setAttribute("aria-pressed", String(current() === value)));
    refresh();
    return refresh;
  };
  const changed = () => {
    writeQuery();
    refreshBar();
    void show();
  };
  segment(el("look"), [...TREE_LOOKS.map((l) => [LOOK_LABELS[l], l] as [string, LookChoice]), ["All looks", "all"] as [string, LookChoice]], () => settings.look, (l) => ((settings.look = l), changed()));
  const refreshHour = segment(el("hour"), HOURS, () => settings.hour, (h) => ((settings.hour = h), changed()));
  // (The reference row: its views and its light, the sun on the left at 8:00; off, the gallery's own.)
  const refsButton = el("refs");
  const sunButton = el("sunleft");
  const refreshToggles = () => {
    refsButton.setAttribute("aria-pressed", String(settings.refs && !settings.fitted));
    el("fitted").setAttribute("aria-pressed", String(settings.fitted));
    sunButton.setAttribute("aria-pressed", String(settings.sunLeft));
    refreshHour();
  };
  refsButton.addEventListener("click", () => {
    settings.refs = !settings.refs;
    settings.fitted = false;
    settings.views = settings.refs ? [...REF_VIEW_NAMES] : [...VIEW_NAMES];
    settings.hour = settings.refs ? REF_HOUR : 9;
    settings.sunLeft = settings.refs;
    settings.only = null;
    if (settings.refs && settings.look === "all") settings.look = "real";
    refreshToggles();
    changed();
  });
  // (The courses' sizes: each species as the game fits it, under its specimen and its reference pictures.)
  const fittedButton = el("fitted");
  fittedButton.addEventListener("click", () => {
    settings.fitted = !settings.fitted;
    settings.refs = settings.fitted;
    settings.views = settings.fitted ? [...FITTED_VIEWS] : [...VIEW_NAMES];
    settings.hour = settings.refs ? REF_HOUR : 9;
    settings.sunLeft = settings.refs;
    if (settings.fitted && settings.look === "all") settings.look = "real";
    refreshToggles();
    changed();
  });
  sunButton.addEventListener("click", () => {
    settings.sunLeft = !settings.sunLeft;
    refreshToggles();
    changed();
  });
  refreshToggles();
  segment(el("wind"), WINDS, () => settings.wind, (w) => ((settings.wind = w), changed()));
  const oneBox = el<HTMLSelectElement>("one");
  oneBox.append(...species.map((sp, i) => make("option", { value: String(i), textContent: sp.name })));
  oneBox.addEventListener("change", () => ((settings.one = Number(oneBox.value)), changed()));
  const regionBox = el<HTMLSelectElement>("region");
  regionBox.append(make("option", { value: "all", textContent: "Every region" }), ...REGION_ROWS.map((r) => make("option", { value: r, textContent: REGION_LABELS[r] })));
  regionBox.addEventListener("change", () => ((settings.region = regionBox.value as Region | "all"), (settings.only = null), changed()));
  const kindBox = el<HTMLSelectElement>("kind");
  kindBox.append(make("option", { value: "all", textContent: "Every kind" }), ...KINDS.map((k) => make("option", { value: k, textContent: k })));
  kindBox.addEventListener("change", () => ((settings.kind = kindBox.value as Architecture | "all"), (settings.only = null), changed()));
  const refreshBar = () => {
    oneBox.hidden = settings.look !== "all";
    regionBox.hidden = kindBox.hidden = settings.look === "all";
    oneBox.value = String(settings.one);
    regionBox.value = settings.region;
    kindBox.value = settings.kind;
    barH();
  };
  refreshBar();
  const thumbsOn = () => !document.body.classList.contains("no-thumbs");
  document.body.classList.toggle("no-thumbs", query.get("thumbs") === "0");
  el("thumbs").setAttribute("aria-pressed", String(thumbsOn()));
  el("thumbs").addEventListener("click", () => {
    document.body.classList.toggle("no-thumbs", thumbsOn());
    el("thumbs").setAttribute("aria-pressed", String(thumbsOn()));
    if (thumbsOn()) query.delete("thumbs");
    else query.set("thumbs", "0");
    // (Thumbnails load only once wanted: make the rows again with them.)
    buildGrid();
    for (const c of shownCells) placeCell(c);
    writeQuery();
  });

  /** The species' name, botanical name, kind, size, regions, and its reference photographs. */
  const whoOf = (row: number, look: TreeLook | null) => {
    const sp = species[row];
    const box = make("div", { className: "who" });
    box.append(make("h2", { textContent: look ? LOOK_LABELS[look] : sp.name }));
    if (look) box.append(make("div", { className: "latin", textContent: sp.name }));
    else if (sp.latin) box.append(make("div", { className: "latin", textContent: sp.latin }));
    box.append(make("div", { className: "facts", textContent: `${sp.architecture} · ${sp.height} m tall, crown ${(sp.crownRadius * 2).toFixed(0)} m across` }));
    box.append(make("div", { className: "facts", textContent: (sp.regions ?? []).map((g) => REGION_LABELS[g]).join(", ") }));
    if (look && look !== "stylized") return box;
    const refs = make("div", { className: "refs" });
    const ref = references.get(sp.name);
    const listOf = (label: string, photos: Reference["whole"]) => {
      if (photos.length === 0) return;
      refs.append(make("div", { className: "label", textContent: label }));
      if (thumbsOn()) {
        const thumbs = make("div", { className: "thumbs" });
        for (const p of photos) {
          if (!p.thumb) continue;
          const img = make("img", { src: p.thumb, alt: p.title, title: `${p.title} (${p.credit})`, loading: "lazy", referrerPolicy: "no-referrer" });
          img.addEventListener("error", () => img.remove());
          thumbs.append(make("a", { href: p.url, target: "_blank", rel: "noopener" }, img));
        }
        refs.append(thumbs);
      }
      photos.forEach((p, i) => refs.append(i > 0 ? "; " : "", make("a", { href: p.url, target: "_blank", rel: "noopener", textContent: p.title, title: p.credit })));
    };
    if (ref) {
      listOf("Whole tree", ref.whole);
      listOf("Foliage", ref.foliage);
    } else refs.append(make("div", { className: "none", textContent: "No reference photographs yet (lab/REFERENCE.md)" }));
    if (photosAt) {
      const own = make("img", { src: `${photosAt}${slug(sp.name)}.jpg`, alt: `${sp.name}, your own`, title: `${photosAt}${slug(sp.name)}.jpg` });
      own.addEventListener("error", () => own.remove());
      refs.append(make("div", { className: "label", textContent: "Your own" }), make("div", { className: "thumbs" }, own));
    }
    box.append(refs);
    return box;
  };

  /** The cells' places in the page, by key. */
  let slots = new Map<string, { pic: HTMLElement; cap: HTMLElement }>();
  let shownCells: Cell[] = [];
  const grid = el("grid");
  const buildGrid = () => {
    const rows = rowsOf(settings);
    grid.style.setProperty("--cols", String(settings.views.length));
    // (Reference views are as wide as their pictures: the columns in proportion to them.)
    grid.style.setProperty("--tracks", settings.views.map((v) => `minmax(0, ${sizeOf(v).w}fr)`).join(" "));
    slots = new Map();
    const head = make("div", { className: "grow head" }, make("div", { textContent: settings.look === "all" ? "Look" : "Species" }));
    for (const v of settings.views) {
      const info = ALL_VIEWS.find((x) => x.name === v)!;
      head.append(make("div", {}, info.label, make("span", { className: "note", textContent: info.note })));
    }
    const out: HTMLElement[] = [head];
    if (settings.look === "all") {
      const top = make("div", { className: "grow" }, whoOf(settings.one, null));
      out.push(top);
    }
    for (const { row, look, fit } of rows) {
      for (const set of fit ? [] : refSetsOf(settings, row)) {
        const who = make("div", { className: "who" }, make("h2", { textContent: species[row].name }), make("div", { className: "latin", textContent: `Reference, AI-generated (${set.set})` }), make("div", { className: "facts", textContent: set.note }));
        const line = make("div", { className: "grow ref" }, who);
        for (const v of settings.views) {
          const p = refPicture(set, v);
          const pic = make("div", { className: "pic" });
          pic.style.aspectRatio = `${sizeOf(v).w} / ${sizeOf(v).h}`;
          if (p) {
            const img = make("img", { src: refUrls.get(p.file) ?? "", alt: `${species[row].name}, reference (AI-generated), ${p.view}`, title: `${p.file}, from ${p.source}: AI-generated (lab/references/SOURCES.md)` });
            img.addEventListener("click", () => window.open(img.src, "_blank"));
            pic.append(img);
          }
          line.append(make("figure", { className: "cell" }, pic, make("figcaption", { textContent: p ? `${p.file} · AI-generated` : "no picture of this view" })));
        }
        out.push(line);
      }
      const who = fit ? make("div", { className: "who" }, make("h2", { textContent: species[row].name }), make("div", { className: "latin", textContent: fit.label }), make("div", { className: "facts", textContent: fit.note })) : whoOf(row, settings.look === "all" ? look : null);
      const line = make("div", { className: "grow" }, who);
      for (const v of settings.views) {
        const pic = make("div", { className: "pic waiting" });
        pic.style.aspectRatio = `${sizeOf(v).w} / ${sizeOf(v).h}`;
        const cap = make("figcaption", { textContent: " " });
        line.append(make("figure", { className: "cell" }, pic, cap));
        slots.set(cellKey(row, look, v, settings, fit), { pic, cap });
      }
      out.push(line);
    }
    grid.replaceChildren(...out);
    shownCells = [];
  };
  const placeCell = (c: Cell) => {
    const slot = slots.get(c.key);
    if (!slot) return;
    const sp = species[c.row];
    const img = make("img", { src: c.url, alt: `${sp.name}, ${LOOK_LABELS[c.look]}, ${c.view}`, width: sizeOf(c.view).w, height: sizeOf(c.view).h });
    img.addEventListener("click", () => openZoom(c));
    slot.pic.classList.remove("waiting");
    slot.pic.replaceChildren(img);
    slot.cap.textContent = caption(c);
    slot.cap.title = `${ALL_VIEWS.find((v) => v.name === c.view)!.note}; eye at ${c.shot.eye.map((n) => n.toFixed(1)).join(", ")}, looking at ${c.shot.target.map((n) => n.toFixed(1)).join(", ")}`;
  };

  let showing = 0;
  let lastSet: Cell[] = [];
  /** Draw what the settings ask for, into the grid. */
  const show = async () => {
    const token = ++showing;
    buildGrid();
    const s = { ...settings, views: [...settings.views] };
    const t0 = performance.now();
    const list = await renderSet(
      s,
      (c, done, all) => {
        if (token !== showing) return;
        placeCell(c);
        shownCells.push(c);
        status(`Drawn ${done} of ${all}: ${species[c.row].name}, ${LOOK_LABELS[c.look]}, ${c.view}`);
      },
      () => token === showing,
    );
    if (token !== showing) return;
    lastSet = list;
    status(`${list.length} cells, ${rowsOf(s).length} rows · ${((performance.now() - t0) / 1000).toFixed(1)} s · ${settings.hour}:00, wind ${settings.wind} m/s · tiers as on a ${screen.lines}-line screen · click a cell to see it larger`);
  };

  // ---- A cell, larger. ----

  const zoom = el<HTMLDialogElement>("zoom");
  const zoomImg = el<HTMLImageElement>("zoom-img");
  const openZoom = (c: Cell) => {
    zoomImg.src = c.url;
    zoomImg.width = sizeOf(c.view).w * (zoomImg.classList.contains("px") ? 2 : 1);
    el("zoom-note").textContent = `${species[c.row].name} · ${LOOK_LABELS[c.look]} · ${ALL_VIEWS.find((v) => v.name === c.view)!.label} · ${caption(c)}`;
    zoom.showModal();
  };
  el("zoom-close").addEventListener("click", () => zoom.close());
  el("zoom-px").addEventListener("click", () => {
    const on = zoomImg.classList.toggle("px");
    zoomImg.width = (zoomImg.naturalWidth || cellW) * (on ? 2 : 1);
    el("zoom-px").setAttribute("aria-pressed", String(on));
  });

  // ---- Save set. ----

  const download = (blob: Blob, name: string) => {
    const a = make("a", { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  };
  const sheetFor = async (s: Settings) => {
    commit = await commitNow();
    el("gcommit").textContent = `commit ${commit}`;
    const list = await renderSet(s, () => undefined);
    return { blob: await makeSheet(s, list, commit), name: setName(s, commit), list };
  };
  el("save").addEventListener("click", async () => {
    status("Making the contact sheet…");
    const { blob, name } = await sheetFor({ ...settings });
    download(blob, name);
    status(`Saved ${name} (${(blob.size / 1e6).toFixed(1)} MB)`);
  });

  // ---- Compare: two sheets. ----

  const cmp = { a: null as null | { url: string; name: string; img: HTMLImageElement }, b: null as null | { url: string; name: string; img: HTMLImageElement }, mode: "side" as "side" | "flicker" | "diff", timer: 0 };
  const cmpView = el("compare-view");
  const cmpNote = (t: string) => (el("compare-note").textContent = t);
  const loadSheet = (blob: Blob, name: string) =>
    new Promise<{ url: string; name: string; img: HTMLImageElement }>((done, no) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => done({ url, name, img });
      img.onerror = () => no(new Error(`${name} is not a picture`));
      img.src = url;
    });
  const pick = (which: "a" | "b") => async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    cmp[which] = await loadSheet(f, f.name);
    drawCompare();
  };
  el("file-a").addEventListener("change", pick("a"));
  el("file-b").addEventListener("change", pick("b"));
  el("use-this").addEventListener("click", async () => {
    cmpNote("Making this page's sheet…");
    const { blob, name } = await sheetFor({ ...settings });
    cmp.b = await loadSheet(blob, `${name} (this page)`);
    drawCompare();
  });
  segment(el("mode"), [["Side by side", "side"], ["Flicker", "flicker"], ["Difference", "diff"]] as [string, typeof cmp.mode][], () => cmp.mode, (m) => ((cmp.mode = m), drawCompare()));
  el("actual").addEventListener("click", () => {
    const on = cmpView.classList.toggle("actual");
    el("actual").setAttribute("aria-pressed", String(on));
  });
  el("compare-open").addEventListener("click", () => {
    el("compare").hidden = false;
    drawCompare();
  });
  el("compare-close").addEventListener("click", () => {
    el("compare").hidden = true;
    clearInterval(cmp.timer);
  });
  const figure = (label: string, media: HTMLElement) => make("figure", {}, make("figcaption", { textContent: label }), media);
  function drawCompare() {
    clearInterval(cmp.timer);
    const { a, b } = cmp;
    if (!a || !b) {
      cmpNote("Choose two sheets saved by Save set (A, the one before; B, the one after), or put this page's in as B.");
      cmpView.replaceChildren(...[a, b].filter((x) => x).map((x) => figure(x!.name, make("img", { src: x!.url }))));
      return;
    }
    const sameSize = a.img.naturalWidth === b.img.naturalWidth && a.img.naturalHeight === b.img.naturalHeight;
    const sizeNote = sameSize ? "" : ` · not the same size (${a.img.naturalWidth}×${a.img.naturalHeight} and ${b.img.naturalWidth}×${b.img.naturalHeight}): set side by side from their top left corners`;
    if (cmp.mode === "side") {
      cmpNote(`A: ${a.name} · B: ${b.name}${sizeNote}`);
      cmpView.replaceChildren(make("div", { className: "pair" }, figure(`A · ${a.name}`, make("img", { src: a.url })), figure(`B · ${b.name}`, make("img", { src: b.url }))));
    } else if (cmp.mode === "flicker") {
      const img = make("img", { src: a.url });
      const label = make("figcaption", { textContent: `A · ${a.name}` });
      let onA = true;
      const flip = () => {
        onA = !onA;
        img.src = onA ? a.url : b.url;
        label.textContent = onA ? `A · ${a.name}` : `B · ${b.name}`;
      };
      cmp.timer = window.setInterval(flip, 600);
      img.addEventListener("click", () => {
        if (cmp.timer) {
          clearInterval(cmp.timer);
          cmp.timer = 0;
        } else cmp.timer = window.setInterval(flip, 600);
      });
      cmpNote(`Flickering A and B every 0.6 s · click the picture to hold it or let it go${sizeNote}`);
      cmpView.replaceChildren(make("figure", {}, label, img));
    } else {
      const w = Math.max(a.img.naturalWidth, b.img.naturalWidth);
      const h = Math.max(a.img.naturalHeight, b.img.naturalHeight);
      const c = make("canvas", { width: w, height: h, className: "diff" });
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(a.img, 0, 0);
      ctx.globalCompositeOperation = "difference";
      ctx.drawImage(b.img, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      // (How much differs, counted in strips so a tall sheet is not read all at once.)
      let differ = 0;
      let most = 0;
      for (let y = 0; y < h; y += 512) {
        const d = ctx.getImageData(0, y, w, Math.min(512, h - y)).data;
        for (let i = 0; i < d.length; i += 4) {
          const m = Math.max(d[i], d[i + 1], d[i + 2]);
          if (m > 2) differ++;
          if (m > most) most = m;
        }
      }
      cmpNote(`|A − B|, six times as bright: black where they are the same · ${differ.toLocaleString("en")} pixels differ (${((differ / (w * h)) * 100).toFixed(2)}%), by at most ${most} of 255${sizeNote}`);
      cmpView.replaceChildren(figure(`|A − B| · ${a.name} against ${b.name}`, c));
    }
  }

  // ---- For scripts. ----

  const askToSettings = (ask: RenderAsk = {}): Settings => {
    const s: Settings = { ...settings, views: [...settings.views] };
    if (ask.look) s.look = ask.look;
    if (ask.refs !== undefined && ask.refs !== s.refs) {
      // (Into the reference row or out of it: its views and its light, unless asked for others.)
      s.refs = ask.refs;
      s.views = ask.refs ? [...REF_VIEW_NAMES] : [...VIEW_NAMES];
      s.hour = ask.refs ? REF_HOUR : 9;
      s.sunLeft = ask.refs;
    }
    if (ask.fitted !== undefined && ask.fitted !== s.fitted) {
      // (Into the fitted mode or out of it: the reference row's light, and its two views.)
      s.fitted = ask.fitted;
      s.refs = ask.fitted || (ask.refs ?? false);
      s.views = ask.fitted ? [...FITTED_VIEWS] : s.refs ? [...REF_VIEW_NAMES] : [...VIEW_NAMES];
      s.hour = s.refs ? REF_HOUR : 9;
      s.sunLeft = s.refs;
    }
    if (ask.views) s.views = ask.views.filter((v) => viewsFor(s).includes(v));
    if (ask.sunLeft !== undefined) s.sunLeft = ask.sunLeft;
    if (ask.one !== undefined) s.one = Math.max(0, rowOf(ask.one));
    if (ask.species) s.only = ask.species.map(rowOf).filter((r) => r >= 0);
    if (ask.region) ((s.region = ask.region), ask.species || (s.only = null));
    if (ask.kind) ((s.kind = ask.kind), ask.species || (s.only = null));
    if (ask.hour !== undefined) s.hour = ask.hour;
    if (ask.wind !== undefined) s.wind = ask.wind;
    if (ask.day !== undefined) s.day = ask.day;
    if (ask.style) s.style = ask.style;
    return s;
  };
  const dataUrl = (blob: Blob) =>
    new Promise<string>((done) => {
      const r = new FileReader();
      r.onload = () => done(r.result as string);
      r.readAsDataURL(blob);
    });
  const api = {
    renderer,
    species,
    views: VIEWS,
    cell: { width: cellW, height: cellH },
    screen,
    get settings() {
      return { ...settings };
    },
    /** Every cell asked for, as PNG data URLs. */
    async render(ask?: RenderAsk) {
      const s = askToSettings(ask);
      const list = await renderSet(s, () => undefined);
      return {
        commit: await commitNow(),
        cells: await Promise.all(list.map(async (c) => ({ species: species[c.row].name, row: c.row, look: c.look, view: c.view, tiers: c.tiers, shot: c.shot, dataURL: await dataUrl(c.blob) }))),
      };
    },
    /** The contact sheet, as a PNG data URL, and the name Save set gives it. */
    async sheet(ask?: RenderAsk) {
      const { blob, name } = await sheetFor(askToSettings(ask));
      return { name, dataURL: await dataUrl(blob), bytes: blob.size };
    },
    /** The contact sheet, written by the dev server into its GALLERY_OUT folder: where it went. */
    async save(ask?: RenderAsk & { name?: string }) {
      const { blob, name } = await sheetFor(askToSettings(ask));
      const r = await fetch(`/__gallery/save?name=${encodeURIComponent(ask?.name ?? name)}`, { method: "POST", body: blob });
      const text = await r.text();
      if (!r.ok) throw new Error(text);
      return text;
    },
    /** Every cell asked for, each written by the dev server into its GALLERY_OUT folder as <prefix>-<species>-<look>-<view>.png: their names. */
    async saveCells(ask?: RenderAsk, prefix = "cell") {
      const list = await renderSet(askToSettings(ask), () => undefined);
      const out: string[] = [];
      for (const c of list) {
        const name = `${prefix}-${species[c.row].name.replace(/\W+/g, "_")}-${c.look}-${c.view}.png`;
        const r = await fetch(`/__gallery/save?name=${encodeURIComponent(name)}`, { method: "POST", body: c.blob });
        if (!r.ok) throw new Error(await r.text());
        out.push(name);
      }
      return out;
    },
    /** Forget every drawn cell (to draw again after the code changed under a running page). */
    forget() {
      for (const c of cells.values()) URL.revokeObjectURL(c.url);
      cells.clear();
    },
    get lastSet() {
      return lastSet.length;
    },
  };
  (window as unknown as { __gallery: typeof api }).__gallery = api;

  await show();
}

start().catch((err) => {
  console.error(err);
  const line = document.getElementById("gstatus-line");
  if (line) line.textContent = `Failed: ${err instanceof Error ? err.message : String(err)}`;
});
