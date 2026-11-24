// The tree lab: a plain ground, a sky, the package's trees on it, and a panel
// that edits the species, the style and the detail while you look.
//
// It reaches the package only through its public face (../src/index.ts), as a
// stranger's project would: what the lab cannot do through that, the package
// cannot do.
//
//   ?scene=one | specimen | grove | woodland | course   what stands on the ground (grove by default)
//   ?species=2       the species (its row) the inspector opens on, and the one "One tree" grows
//   ?fill=1          the scene with only that species in it
//   ?hour=9          the sun's hour, 5 to 19
//   ?wind=4          the wind's speed (m/s)
//   ?eye=standing | tree | overhead | course   where the eye starts
//   ?at=x,y,z,tx,ty,tz   exactly a view, as "Share view" writes it
//   ?look=painterly  the look: stylized (painted), painterly, sculpted or real
//   ?tier=0|1|2      draw one tier alone
//   ?fresh           ignore what the lab kept from last time

import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import {
  type Architecture,
  type CrownShape,
  DEFAULT_DETAIL,
  DEFAULT_STYLE,
  DEFAULT_VARIANT_OPTIONS,
  ALL_SPECIES,
  LEAF_KIND_ROWS,
  LOOK_STYLES,
  STARTER_SPECIES,
  STYLE_RANGES,
  TREE_LOOKS,
  type TreeLook,
  type TreeDetail,
  type TreeInstance,
  type TreeSpecies,
  type TreeStyle,
  type Trees,
  type VariantOptions,
  checkSpecies,
  cloneSpecies,
  createTrees,
} from "../src/index";
import { course, grove, oneTree, specimenRow, specimens, woodland } from "./world";
import { type Standing, disposeEnvelopes, makeEnvelopes } from "./envelope";
import { SKY as SKY_HEX, makeGround, makeSky, sunAt, tintsFor } from "./stage";

// (v3: the styles: four looks, and the style has lobe, bulge, warm, cool, chroma, rim and sprigs.)
const STORE_KEY = "tree-lab-preset-v3";
const query = new URLSearchParams(location.search);

/** What the lab keeps and hands out: everything set here that is not where the eye is. */
interface Preset {
  version: 1;
  /** The look the style is for (left out: the painted look). */
  look?: TreeLook;
  species: TreeSpecies[];
  style: TreeStyle;
  detail: TreeDetail;
  variants: VariantOptions;
}

type SceneName = "one" | "specimen" | "grove" | "woodland" | "course";
const SCENES: [string, SceneName][] = [["One tree", "one"], ["Specimen", "specimen"], ["Grove", "grove"], ["Wood edge", "woodland"], ["Course", "course"]];
type EyeName = "standing" | "tree" | "overhead" | "course";
const EYES: [string, EyeName, number][] = [["Standing", "standing", 1.7], ["Up a tree", "tree", 8], ["Overhead", "overhead", 60], ["Course", "course", 30]];
const HOURS: [string, number][] = [["Dawn", 6], ["Morning", 9], ["Noon", 13], ["Evening", 18]];
const WINDS: [string, number][] = [["Still", 0], ["Breeze", 4], ["Wind", 9], ["Gale", 16]];
const ARCHITECTURES: Architecture[] = ["broadleaf", "conifer", "shrub", "palm"];
const SHAPES: CrownShape[] = ["conical", "spherical", "hemispherical", "cylindrical", "taperedCylindrical", "flame", "inverseConical", "tendFlame"];

function fail(text: string): never {
  document.getElementById("fail-text")!.textContent = text;
  document.getElementById("fail")!.classList.add("on");
  throw new Error(text);
}

/** What is wrong with a species read from JSON, or null: every field there and of its kind, then the package's own check. */
const OPTIONAL_FIELDS = new Set(["latin", "regions", "leafColors"]);

function speciesProblem(value: unknown, i: number): string | null {
  if (typeof value !== "object" || value === null) return `species ${i + 1} is not an object`;
  const o = value as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : `species ${i + 1}`;
  // (Every field a species must have; `latin`, `regions` and `leafColors` may be left out.)
  for (const [key, like] of Object.entries(STARTER_SPECIES[0])) {
    if (OPTIONAL_FIELDS.has(key)) continue;
    if (typeof o[key] !== typeof like) return `${name}: ${key} is missing or not a ${typeof like}`;
  }
  if (!Array.isArray(o.throughTint) || o.throughTint.length !== 3 || !o.throughTint.every((v) => Number.isFinite(v))) return `${name}: throughTint must be three numbers`;
  if (!ARCHITECTURES.includes(o.architecture as Architecture)) return `${name}: architecture must be one of ${ARCHITECTURES.join(", ")}`;
  if (!SHAPES.includes(o.shape as CrownShape)) return `${name}: shape must be one of ${SHAPES.join(", ")}`;
  for (const key of ["leafColor", "barkColor"]) if (!/^#[0-9a-f]{6}$/i.test(o[key] as string)) return `${name}: ${key} must be a colour like #5b7f3a`;
  const bad = checkSpecies(o as unknown as TreeSpecies);
  return bad.length > 0 ? `${name}: ${bad.join("; ")}` : null;
}

/** Whether every field of `like` is a finite number in `value` (for style, detail and variants read from JSON). */
function numbersLike(value: unknown, like: object): boolean {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return Object.entries(like).every(([key, v]) => (typeof v === "number" ? Number.isFinite(o[key]) : typeof o[key] === typeof v));
}

/** A preset read from JSON, or the reason it cannot be. */
function readPreset(value: unknown): Preset | string {
  const p = value as Partial<Preset> | null;
  if (typeof p !== "object" || p === null || p.version !== 1) return "not a tree lab preset (version 1)";
  if (!Array.isArray(p.species) || p.species.length === 0) return "it has no species";
  for (let i = 0; i < p.species.length; i++) {
    const bad = speciesProblem(p.species[i], i);
    if (bad) return bad;
  }
  // (A style from before a number was added takes the package's for it: only those it has must be numbers.)
  if (typeof p.style !== "object" || p.style === null || !Object.entries(p.style).every(([k, v]) => !(k in DEFAULT_STYLE) || Number.isFinite(v))) return "its style has something not a number";
  if (!numbersLike(p.detail, DEFAULT_DETAIL)) return "its detail is missing a number";
  // (Variants came later than the rest: a preset without them takes the package's own.)
  // (And each option since: a preset without it takes the package's own.)
  const variants = { ...DEFAULT_VARIANT_OPTIONS, ...p.variants };
  if (!numbersLike(variants, DEFAULT_VARIANT_OPTIONS)) return "its variants are missing a number";
  const look = p.look === undefined ? "stylized" : p.look;
  if (!TREE_LOOKS.includes(look)) return `its look must be one of ${TREE_LOOKS.join(", ")}`;
  return {
    version: 1,
    look,
    species: p.species.map((s) => cloneSpecies(s)),
    style: { ...LOOK_STYLES[look], ...p.style },
    detail: { ...DEFAULT_DETAIL, ...p.detail },
    variants: { ...DEFAULT_VARIANT_OPTIONS, ...variants },
  };
}

async function start() {
  const canvas = document.getElementById("view") as HTMLCanvasElement;
  if (!("gpu" in navigator)) fail("This page needs WebGPU, which this browser does not have.");
  // (Timestamps: the graphics card times its own passes, for Measure. Not see-through: a far dab is drawn
  // with less than its whole pixel, and on a canvas that keeps its alpha the page shows through it.)
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: false, trackTimestamp: true, reversedDepthBuffer: true });
  try {
    await renderer.init();
  } catch (err) {
    fail(`WebGPU could not be started here: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!(renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend) fail("This page needs WebGPU; only WebGL is available here.");
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  // ---- What the lab is set to. The trees are made from these, and these outlive any one making of them. ----

  // (Every species the package has: its starters and the regional ones.)
  let species: TreeSpecies[] = ALL_SPECIES.map((s) => cloneSpecies(s));
  const style: TreeStyle = { ...DEFAULT_STYLE };
  const detail: TreeDetail = { ...DEFAULT_DETAIL };
  const variants: VariantOptions = { ...DEFAULT_VARIANT_OPTIONS };
  const show = { near: true, mid: true, far: true, wood: true, leaves: true };
  const tierAsked = query.get("tier");
  if (tierAsked !== null) Object.assign(show, { near: tierAsked === "0", mid: tierAsked === "1", far: tierAsked === "2" });
  const hourAsked = Number(query.get("hour"));
  const windAsked = Number(query.get("wind"));
  const light = { hour: query.has("hour") && Number.isFinite(hourAsked) ? hourAsked : 9, windSpeed: query.has("wind") && Number.isFinite(windAsked) ? windAsked : 4, windHeading: 37 };
  const sceneAsked = query.get("scene") === "specimens" ? "specimen" : query.get("scene");
  const state = {
    scene: (SCENES.find(([, name]) => name === sceneAsked)?.[1] ?? "grove") as SceneName,
    fill: query.get("fill") === "1",
    envelope: false,
    look: (TREE_LOOKS.find((l) => l === query.get("look")) ?? "stylized") as TreeLook,
  };
  Object.assign(style, LOOK_STYLES[state.look]);

  // What was kept from last time, unless asked not to.
  const applyPreset = (p: Preset) => {
    species = p.species;
    // (The look from the address wins over the kept one, as the scene does.)
    if (p.look && !query.has("look")) state.look = p.look;
    Object.assign(style, p.style);
    Object.assign(detail, p.detail);
    Object.assign(variants, p.variants);
  };
  if (!query.has("fresh")) {
    try {
      const kept = localStorage.getItem(STORE_KEY);
      const p = kept ? readPreset(JSON.parse(kept)) : null;
      if (p && typeof p !== "string") applyPreset(p);
    } catch {
      // Nothing kept, or not readable: the starter species stand.
    }
  }
  const rowAsked = Number(query.get("species"));
  const chosen = { row: Number.isInteger(rowAsked) ? Math.max(0, Math.min(species.length - 1, rowAsked)) : 0 };

  // ---- The world: a sky, a plain lit ground. ----

  const SKY = new THREE.Color(SKY_HEX);
  const scene = new THREE.Scene();
  scene.background = SKY;
  const fog = new THREE.Fog(SKY, 100, 700);
  scene.fog = fog;
  const setFog = () => {
    const far = state.scene === "course" ? 2600 : 700;
    fog.near = far * 0.15;
    fog.far = far;
  };
  setFog();

  // The sky, and the ground: flat, mown grass, lit by the same sun and in the same light's colours as the
  // leaves, in the trees' shade (stage.ts). (Later the grass library may stand on it, as an option.)
  scene.add(makeSky());
  const { mesh: ground, uSun, uSunTint, uShadeTint, materialFor: groundFor } = makeGround();
  scene.add(ground);
  /** What the shade was last worked out for: the trees and the hour. */
  let shadeFor: { trees: Trees | null; hour: number } = { trees: null, hour: NaN };

  // ---- The trees. ----

  /** The trees the scene stands, as plain numbers: the lab's own, handed to the package as any host's would be. */
  const treesFor = (): TreeInstance[] => {
    const row = chosen.row;
    // (Filled: the scene made for that one species alone, then told which row it is.)
    const only = (list: TreeInstance[]) => list.map((t) => ({ ...t, species: row }));
    switch (state.scene) {
      case "one":
        return oneTree(row);
      case "specimen":
        return state.fill ? specimenRow(species[row], row) : specimens(species);
      case "grove":
        return state.fill ? only(grove([species[row]])) : grove(species);
      case "woodland":
        return state.fill ? only(woodland(species)) : woodland(species);
      case "course":
        return state.fill ? only(course([species[row]])) : course(species);
    }
  };
  const growNow = () => {
    const list = treesFor();
    const t0 = performance.now();
    const made = createTrees({ trees: list, species, variants: { ...variants }, look: state.look });
    return { made, count: list.length, ms: performance.now() - t0 };
  };
  let grownAt = growNow();
  let trees: Trees = grownAt.made;
  scene.add(trees.object);

  // ---- The eye. ----

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20000);
  const controls = new OrbitControls(camera, canvas);
  /** Where the eye stands and what it looks at, for each scene and eye height. */
  const viewFor = (name: SceneName, eye: EyeName): { at: number[]; look: number[] } => {
    if (name === "one") {
      // (Far enough off to see all of the tree, whatever its size.)
      const sp = species[chosen.row];
      const h = sp.height;
      const d = Math.max(h * 1.5, sp.crownRadius * 3.5, 6);
      if (eye === "standing") return { at: [0, 1.7, d], look: [0, h * 0.5, 0] };
      if (eye === "tree") return { at: [0, 8, d], look: [0, h * 0.55, 0] };
      if (eye === "overhead") return { at: [0, 60, d * 0.5 + 4], look: [0, h * 0.3, 0] };
      return { at: [0, 30, d * 3], look: [0, h * 0.4, 0] };
    }
    if (name === "specimen") {
      if (eye === "standing") return { at: [0, 1.7, 80], look: [0, 9, 0] };
      if (eye === "tree") return { at: [0, 8, 60], look: [0, 8, 0] };
      if (eye === "overhead") return { at: [0, 60, 70], look: [0, 0, 0] };
      return { at: [-60, 30, 170], look: [0, 8, 0] };
    }
    if (name === "grove") {
      // (From the clearing in the middle, or from outside the grove.)
      if (eye === "standing") return { at: [0, 1.7, 20], look: [0, 7, -60] };
      if (eye === "tree") return { at: [0, 8, 20], look: [0, 8, -60] };
      if (eye === "overhead") return { at: [0, 60, 120], look: [0, 0, 0] };
      return { at: [0, 30, 260], look: [0, 8, 0] };
    }
    if (name === "woodland") {
      // (Out on the open ground, a fairway's width off the edge, at a golfer's eye; up a tree, inside the
      // wood looking out to the edge.)
      if (eye === "standing") return { at: [0, 1.6, 100], look: [0, 9, 0] };
      if (eye === "tree") return { at: [12, 8, -70], look: [0, 6, 30] };
      if (eye === "overhead") return { at: [0, 60, 150], look: [0, 0, -20] };
      return { at: [-40, 30, 230], look: [0, 8, -20] };
    }
    if (eye === "standing") return { at: [180, 1.7, 0], look: [180, 6, -200] };
    if (eye === "tree") return { at: [40, 8, 40], look: [100, 8, 90] };
    if (eye === "overhead") return { at: [0, 60, 400], look: [0, 0, 0] };
    return { at: [-60, 30, 260], look: [0, 10, 0] };
  };
  const defaultEye = (name: SceneName): EyeName => (name === "course" ? "course" : "standing");
  const lookFrom = (at: number[], look: number[]) => {
    camera.position.fromArray(at);
    controls.target.fromArray(look);
    controls.update();
  };
  const eyeAsked = query.get("eye");
  const firstEye = EYES.find(([, name, height]) => name === eyeAsked || String(height) === eyeAsked)?.[1] ?? defaultEye(state.scene);
  {
    const v = viewFor(state.scene, firstEye);
    lookFrom(v.at, v.look);
    // (?at=: exactly a view, as "Share view" writes it.)
    const at = (query.get("at") ?? "").split(",").map(Number);
    if (at.length === 6 && at.every(Number.isFinite)) lookFrom(at.slice(0, 3), at.slice(3));
  }
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / Math.max(1, innerHeight);
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize);
  resize();

  // ---- The envelopes: each tree's numbers drawn round it, in the scenes with few enough trees. ----

  let envelopes: THREE.Group | null = null;
  const envelopeScene = () => state.scene === "one" || state.scene === "specimen";
  const refreshEnvelope = () => {
    if (envelopes) {
      scene.remove(envelopes);
      disposeEnvelopes(envelopes);
      envelopes = null;
    }
    el("envelope").hidden = !envelopeScene();
    el("envelope").setAttribute("aria-pressed", String(state.envelope));
    if (!state.envelope || !envelopeScene()) return;
    // (Each tree as it was fitted: its own size, from the plan, and its species' crown shape.)
    const standing: Standing[] = trees.plan.placements.map((p) => ({ x: p.x, y: p.y, z: p.z, size: p.size, shape: species[trees.plan.variants[p.variant].species].shape, over: species[trees.plan.variants[p.variant].species] }));
    envelopes = makeEnvelopes(standing);
    scene.add(envelopes);
  };

  // ---- The panel: the lab's own bar, rail and inspector (index.html, lab.css), with lil-gui for the rows of numbers. ----

  function el<T extends HTMLElement = HTMLElement>(id: string) {
    return document.getElementById(id) as T;
  }
  const hud = el("status-line");
  const speciesGui = new GUI({ container: el("species-gui"), title: "" });
  const sceneGui = new GUI({ container: el("scene-gui"), title: "" });
  const refreshNumbers = () => [speciesGui, sceneGui].forEach((g) => g.controllersRecursive().forEach((c) => c.updateDisplay()));

  /** Say something in the status strip that stays a few seconds, over the running readout. */
  let saidUntil = 0;
  const said = (message: string) => {
    hud.textContent = message;
    saidUntil = performance.now() + 6000;
  };

  const preset = (): Preset => ({ version: 1, look: state.look, species: species.map((s) => cloneSpecies(s)), style: { ...style }, detail: { ...detail }, variants: { ...variants } });
  const save = () => {
    // (Only a sound state is kept: one that will not grow would be thrown away on the next load, and all with it.)
    if (species.some((s) => checkSpecies(s).length > 0)) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(preset()));
    } catch {
      // No storage here (a private window): the lab works without it.
    }
  };

  // Growing again: what shapes a tree is read only when it is grown, so a change to it makes the trees
  // again (the old ones are let go, the eye stays where it is). A slider sends many changes; the trees
  // are made again once they stop for a moment.
  let growing = false;
  let growToken = 0;
  let growTimer = 0;
  const problemsOfAll = () => species.flatMap((s) => checkSpecies(s).map((p) => `${s.name}: ${p}`));
  const regrow = async (): Promise<boolean> => {
    clearTimeout(growTimer);
    const problems = problemsOfAll();
    if (problems.length > 0) {
      said(`Not grown: ${problems[0]}.`);
      return false;
    }
    const token = ++growToken;
    growing = true;
    readout();
    // (A moment for the strip to say so before the page is busy. Not a frame: a pane out of view draws none.)
    await new Promise((done) => setTimeout(done, 30));
    if (token !== growToken) return false;
    let next: typeof grownAt;
    try {
      next = growNow();
    } catch (err) {
      growing = false;
      said(`Could not grow: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
    scene.remove(trees.object);
    trees.dispose();
    grownAt = next;
    trees = next.made;
    scene.add(trees.object);
    drawn = [0, 0, 0];
    growing = false;
    refreshEnvelope();
    readout();
    return true;
  };
  const regrowSoon = () => {
    clearTimeout(growTimer);
    growTimer = window.setTimeout(() => void regrow(), 300);
  };

  /** A row of buttons of which one is pressed. Returns what presses the right one again after a change from elsewhere. */
  const segment = <T>(host: HTMLElement, options: [string, T][], current: () => T | null, pick: (value: T) => void) => {
    const buttons = options.map(([label, value]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
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

  // The bar: what stands on the ground, where the eye is, the hour and the wind.
  const setScene = (name: SceneName) => {
    if (name === state.scene) return;
    const eye = EYES.find(([, , height]) => Math.abs(camera.position.y - height) < height * 0.03)?.[1] ?? defaultEye(name);
    state.scene = name;
    setFog();
    const v = viewFor(name, eye);
    lookFrom(v.at, v.look);
    refreshEye();
    // (The envelopes follow once the new trees are grown: drawn now, they would be round the old scene's.)
    void regrow();
  };
  const refreshScene = segment(el("scene"), SCENES.map(([label, name]) => [label, name] as [string, SceneName]), () => state.scene, setScene);
  const stepScene = (by: number) => {
    const i = SCENES.findIndex(([, name]) => name === state.scene);
    setScene(SCENES[(i + by + SCENES.length) % SCENES.length][1]);
    refreshScene();
  };
  const refreshEye = segment(el("eye"), EYES.map(([label, name]) => [label, name] as [string, EyeName]), () => EYES.find(([, , height]) => Math.abs(camera.position.y - height) < height * 0.03)?.[1] ?? null, (eye) => {
    const v = viewFor(state.scene, eye);
    lookFrom(v.at, v.look);
  });
  controls.addEventListener("end", () => refreshEye());
  const refreshHour = segment(el("hour"), HOURS, () => HOURS.find(([, h]) => h === light.hour)?.[1] ?? null, (h) => {
    light.hour = h;
    refreshNumbers();
  });
  const refreshWind = segment(el("wind"), WINDS, () => WINDS.find(([, w]) => w === light.windSpeed)?.[1] ?? null, (w) => {
    light.windSpeed = w;
    refreshNumbers();
  });
  // The look: the pieces differ (dabs, leaf clusters, lobes, or leaf cards), so the trees are made again, with
  // the look's own style.
  const refreshLook = segment(el("look"), [["Painted", "stylized"], ["Painterly", "painterly"], ["Sculpted", "sculpted"], ["Real", "real"]] as [string, TreeLook][], () => state.look, (look) => setLook(look));
  const setLook = (look: TreeLook) => {
    state.look = look;
    Object.assign(style, LOOK_STYLES[look]);
    sceneGui.controllersRecursive().forEach((c) => c.updateDisplay());
    refreshLook();
    save();
    return regrow();
  };
  el("envelope").addEventListener("click", () => {
    state.envelope = !state.envelope;
    refreshEnvelope();
  });

  const setBare = (on: boolean) => {
    document.body.classList.toggle("bare", on);
    el("bare").setAttribute("aria-pressed", String(on));
  };
  el("bare").addEventListener("click", () => setBare(!document.body.classList.contains("bare")));
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest?.("input, textarea, select, dialog")) return;
    if (e.key === "h" || e.key === "H") setBare(!document.body.classList.contains("bare"));
    if (e.key === "]") stepScene(1);
    if (e.key === "[") stepScene(-1);
  });
  for (const b of el("tabs").querySelectorAll("button")) {
    b.addEventListener("click", () => {
      for (const other of el("tabs").querySelectorAll("button")) {
        other.setAttribute("aria-pressed", String(other === b));
        el(`tab-${other.dataset.tab}`).hidden = other !== b;
      }
    });
  }

  // A link to exactly this view: the scene, the species, the hour, the wind and the eye, written into the
  // address (so a reload keeps it) and copied.
  el("copy-view").addEventListener("click", () => {
    const q = new URLSearchParams();
    q.set("scene", state.scene);
    if (state.look !== "stylized") q.set("look", state.look);
    q.set("species", String(chosen.row));
    if (state.fill) q.set("fill", "1");
    q.set("hour", String(light.hour));
    q.set("wind", String(light.windSpeed));
    q.set("at", [...camera.position.toArray(), ...controls.target.toArray()].map((n) => Number(n.toFixed(2))).join(","));
    history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
    navigator.clipboard.writeText(location.href).then(() => said("The link to this view is in the address, and copied."), () => said("The link to this view is in the address (it could not be copied)."));
  });

  // The species: the rail to choose one, the inspector to change it.
  const refreshFill = () => el("fill").setAttribute("aria-pressed", String(state.fill));
  el("fill").addEventListener("click", () => {
    state.fill = !state.fill;
    refreshFill();
    void regrow();
  });
  refreshFill();
  const refreshRail = () => {
    const rows = species.map((sp, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.title = sp.name;
      b.setAttribute("aria-current", String(i === chosen.row));
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = sp.leafColor;
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = sp.name;
      const tall = document.createElement("span");
      tall.className = "tall";
      tall.textContent = `${sp.height.toFixed(sp.height < 10 ? 1 : 0)} m`;
      b.append(swatch, name, tall);
      b.addEventListener("click", () => {
        if (i === chosen.row) return;
        chosen.row = i;
        rebuildSpecies();
        // (One tree, or a scene filled with one species: the chosen one is what stands there.)
        if (state.scene === "one" || state.fill) void regrow();
      });
      li.append(b);
      return li;
    });
    el("species").replaceChildren(...rows);
    el("who-swatch").style.background = species[chosen.row].leafColor;
    const nameBox = el<HTMLInputElement>("who-name");
    if (document.activeElement !== nameBox) nameBox.value = species[chosen.row].name;
  };
  /** What is wrong with the species being edited, said under its name. */
  const refreshProblems = () => {
    const problems = checkSpecies(species[chosen.row]);
    const box = el("problems");
    box.hidden = problems.length === 0;
    box.replaceChildren(...problems.map((p) => Object.assign(document.createElement("li"), { textContent: p })));
  };
  el<HTMLInputElement>("who-name").addEventListener("input", (e) => {
    species[chosen.row].name = (e.target as HTMLInputElement).value;
    refreshRail();
    save();
  });
  el<HTMLInputElement>("who-name").addEventListener("blur", (e) => {
    const box = e.target as HTMLInputElement;
    if (box.value.trim() === "") species[chosen.row].name = box.value = "Unnamed tree";
    refreshRail();
    save();
  });

  /** Which of the inspector's folders are shut, by title, so that making it again leaves them as they were. */
  const shut = new Set<string>();
  function rebuildSpecies() {
    for (const f of speciesGui.folders) (f._closed ? shut.add(f._title) : shut.delete(f._title));
    [...speciesGui.controllers].forEach((c) => c.destroy());
    [...speciesGui.folders].forEach((f) => f.destroy());
    chosen.row = Math.min(chosen.row, species.length - 1);
    const s = species[chosen.row];
    // Two kinds of change: what the shaders read (colour, light, stiffness) goes in at once; what growing
    // reads makes the trees again.
    const live = () => {
      trees.setSpecies(species);
      refreshRail();
      refreshProblems();
      save();
    };
    const grows = () => {
      refreshRail();
      refreshProblems();
      save();
      regrowSoon();
    };
    const folder = (title: string) => {
      const f = speciesGui.addFolder(title);
      if (shut.has(title)) f.close();
      return f;
    };
    // (A number that is one of three, shown as a slider of its own: lil-gui cannot hold an array's item.)
    const part = (tint: [number, number, number], i: number) => ({
      get v() {
        return tint[i];
      },
      set v(x: number) {
        tint[i] = x;
      },
    });

    const kind = folder("Kind and size");
    kind.add(s, "architecture", ARCHITECTURES).name("architecture").onChange(grows);
    kind.add(s, "height", 0.5, 45, 0.1).name("height (m)").onChange(grows);
    kind.add(s, "crownRadius", 0.2, 20, 0.1).name("crown radius (m)").onChange(grows);
    kind.add(s, "crownBase", 0, 30, 0.1).name("crown base (m)").onChange(grows);
    kind.add(s, "trunkRadius", 0.01, 1.5, 0.01).name("trunk radius (m)").onChange(grows);
    const crown = folder("Crown");
    crown.add(s, "shape", SHAPES).name("shape").onChange(grows);
    crown.add(s, "foliageDepth", 0, 1, 0.01).name("leaves inward (0 shell, 1 all)").onChange(grows);
    crown.add(s, "openness", 0, 1, 0.01).name("openness").onChange(grows);
    const branches = folder("Branches");
    branches.add(s, "stems", 1, 12, 1).name("stems").onChange(grows);
    branches.add(s, "branchAngle", 0, 120, 1).name("angle (°)").onChange(grows);
    branches.add(s, "branchAngleSpread", 0, 45, 1).name("angle spread (°)").onChange(grows);
    branches.add(s, "bend", -1, 1, 0.01).name("bend (down to up)").onChange(grows);
    branches.add(s, "crooked", 0, 1, 0.01).name("crooked").onChange(grows);
    branches.add(s, "leader", 0, 1, 0.01).name("leader").onChange(grows);
    branches.add(s, "whorl", 0, 60, 1).name("to a whorl").onChange(grows);
    branches.add(s, "whorlsPerMetre", 0, 4, 0.05).name("whorls a metre").onChange(grows);
    branches.add(s, "branchiness", 0, 1, 0.01).name("branchiness").onChange(grows);
    // (Left out of a row, it is none: the slider needs a number.)
    if (s.weep === undefined) s.weep = 0;
    branches.add(s as Required<Pick<TreeSpecies, "weep">>, "weep", 0, 1, 0.01).name("hangs in whips").onChange(grows);
    const leaves = folder("Clumps of leaves");
    leaves.add(s, "leafKind", [...LEAF_KIND_ROWS]).name("leaves (real look)").onChange(live);
    leaves.add(s, "clumpSize", 0.1, 4, 0.05).name("across (m)").onChange(grows);
    leaves.add(s, "clumpSpread", 0, 1, 0.01).name("size spread").onChange(grows);
    const colour = folder("Colour");
    colour.addColor(s, "leafColor").name("leaves").onChange(live);
    colour.add(s, "leafVariation", 0, 1, 0.01).name("clump to clump").onChange(live);
    // (A tree's own tint is chosen when the trees are fitted to their variants: it makes them again.)
    colour.add(s, "treeVariation", 0, 1, 0.01).name("tree to tree").onChange(grows);
    (["red", "green", "blue"] as const).forEach((ch, i) => colour.add(part(s.throughTint, i), "v", 0, 1.5, 0.01).name(`through, ${ch}`).onChange(live));
    colour.addColor(s, "barkColor").name("bark").onChange(live);
    colour.add(s, "barkPale", 0, 1, 0.01).name("bark paler up").onChange(live);
    const behaviour = folder("Behaviour");
    behaviour.add(s, "stiffness", 0, 1, 0.01).name("stiffness").onChange(live);
    refreshRail();
    refreshProblems();
  }
  rebuildSpecies();

  // The scene: what holds for every species.
  const lightPanel = sceneGui.addFolder("Light and wind");
  lightPanel.add(light, "hour", 4, 20, 0.25).name("hour").onChange(() => refreshHour());
  lightPanel.add(light, "windSpeed", 0, 20, 0.5).name("wind (m/s)").onChange(() => refreshWind());
  lightPanel.add(light, "windHeading", 0, 360, 1).name("wind heading (°)");
  const stylePanel = sceneGui.addFolder("Style");
  // (Every number of the style, in the package's own ranges; the button sets the look's own again.)
  const STYLE_NAMES: Record<keyof TreeStyle, string> = {
    steps: "flat bands",
    bands: "how many bands",
    round: "clumps lit round",
    jitter: "dab to dab",
    dabScale: "dab size",
    through: "sun through",
    throughPower: "through: gathered to the sun",
    throughWarp: "through: bent by the leaf",
    throughVary: "through: varies leaf to leaf",
    moss: "moss on the wood",
    wrap: "light wraps",
    strokes: "brush strokes",
    selfShade: "crown shades itself",
    fullLight: "full sun from",
    bark: "bark furrows",
    faceEye: "cards face the eye",
    lobe: "lit as big lobes",
    bulge: "each dab a ball",
    warm: "light warm",
    cool: "shade cool",
    chroma: "colour",
    rim: "rim against the sun",
    sprigs: "sprigs (sculpted)",
    bright: "sunlit side's brightness",
    leafSize: "longest leaf, m (painterly)",
  };
  for (const [key, r] of Object.entries(STYLE_RANGES) as [keyof TreeStyle, { min: number; max: number; step: number }][]) {
    stylePanel.add(style, key, r.min, r.max, r.step).name(STYLE_NAMES[key]).onChange(save);
  }
  stylePanel.add({ reset: () => (Object.assign(style, LOOK_STYLES[state.look]), refreshNumbers(), save()) }, "reset").name("the look's own style");
  const detailPanel = sceneGui.addFolder("Detail");
  detailPanel.add(detail, "nearPx", 20, 1200, 1).name("near above (px)").onChange(save);
  detailPanel.add(detail, "farPx", 5, 600, 1).name("far below (px)").onChange(save);
  detailPanel.add(detail, "band", 0, 0.6, 0.01).name("hand-over").onChange(save);
  detailPanel.add(detail, "range", 100, 6000, 10).name("drawn to (m)").onChange(save);
  const showPanel = sceneGui.addFolder("Show");
  showPanel.add(show, "near").name("near tier");
  showPanel.add(show, "mid").name("mid tier");
  showPanel.add(show, "far").name("far tier");
  showPanel.add(show, "wood").name("wood");
  showPanel.add(show, "leaves").name("leaves");
  // How many trees are grown for each species: what is grown is shared by all the trees fitted to it.
  const variantPanel = sceneGui.addFolder("Variants (grown again)");
  const variantsChanged = () => {
    save();
    regrowSoon();
  };
  variantPanel.add(variants, "shapes", 1, 8, 1).name("shapes a species").onChange(variantsChanged);
  variantPanel.add(variants, "seeds", 1, 6, 1).name("seeds a shape").onChange(variantsChanged);
  variantPanel.add(variants, "lean", 0, 10, 0.5).name("lean up to (°)").onChange(variantsChanged);
  variantPanel.add(variants, "mirror").name("mirrored").onChange(variantsChanged);
  variantPanel.add(variants, "stands").name("grown where they stand").onChange(variantsChanged);

  // ---- Presets: the lab's state as JSON, to keep and to hand to a game. ----

  /** Take a preset in; the reason if it cannot be. */
  const load = async (value: unknown): Promise<string | null> => {
    const p = readPreset(value);
    if (typeof p === "string") return p;
    // (The list may be longer or shorter than before: the trees are made again from it, never re-read.)
    applyPreset(p);
    // (A preset handed in is all of it, its look too, whatever the address said.)
    if (p.look) state.look = p.look;
    refreshLook();
    chosen.row = Math.min(chosen.row, species.length - 1);
    rebuildSpecies();
    refreshNumbers();
    save();
    await regrow();
    return null;
  };
  const box = el<HTMLDialogElement>("preset");
  const text = el<HTMLTextAreaElement>("preset-text");
  const note = el("preset-note");
  el("open-preset").addEventListener("click", () => {
    text.value = JSON.stringify(preset(), null, 2);
    note.textContent = "";
    box.showModal();
  });
  el("preset-close").addEventListener("click", () => box.close());
  el("preset-copy").addEventListener("click", () => {
    navigator.clipboard.writeText(text.value).then(() => (note.textContent = "Copied."), () => (note.textContent = "Could not copy: select the text instead."));
  });
  el("preset-reset").addEventListener("click", async () => {
    await load({ version: 1, look: state.look, species: ALL_SPECIES.map((s) => cloneSpecies(s)), style: LOOK_STYLES[state.look], detail: DEFAULT_DETAIL, variants: DEFAULT_VARIANT_OPTIONS });
    text.value = JSON.stringify(preset(), null, 2);
    note.textContent = "Back to the package's starter species.";
  });
  el("preset-load").addEventListener("click", async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.value);
    } catch {
      note.textContent = "That is not JSON.";
      return;
    }
    const bad = await load(parsed);
    note.textContent = bad ? `Not loaded: ${bad}.` : "Loaded.";
  });

  // ---- Each frame. ----

  let drawn = [0, 0, 0];
  let counting = false;
  let frames = 0;
  let fpsSince = performance.now();
  let fps = 0;
  const sceneLabel = () => SCENES.find(([, name]) => name === state.scene)![0] + (state.fill && state.scene !== "one" ? `, all ${species[chosen.row].name}` : "");
  /** The running readout in the status strip. */
  function readout() {
    if (growing) {
      hud.textContent = "Growing…";
      return;
    }
    if (performance.now() < saidUntil) return;
    const eye = camera.position.y;
    hud.textContent = `${sceneLabel()} · ${grownAt.count.toLocaleString("en")} trees · ${trees.plan.variants.length} variants grown in ${grownAt.ms.toFixed(0)} ms · drawn near ${drawn[0]}, mid ${drawn[1]}, far ${drawn[2]} · ${fps.toFixed(0)} fps · eye at ${eye.toFixed(eye < 10 ? 1 : 0)} m`;
  }

  const clock = new THREE.Timer();
  const sunNow = new THREE.Vector3();
  const frame = () => {
    clock.update();
    // The lab's settings into the trees as they are now (they may have been made again since the last frame).
    sunNow.copy(sunAt(light.hour));
    tintsFor(sunNow, uSunTint.value, uShadeTint.value);
    uSun.value.copy(sunNow);
    trees.environment.sun.copy(sunNow);
    trees.environment.sunTint.copy(uSunTint.value);
    trees.environment.shadeTint.copy(uShadeTint.value);
    const heading = THREE.MathUtils.degToRad(light.windHeading);
    trees.environment.wind.set(Math.cos(heading), Math.sin(heading), light.windSpeed);
    Object.assign(trees.style, style);
    Object.assign(trees.detail, detail);
    Object.assign(trees.show, show);
    // (The shade on the ground, again whenever the trees or the sun have changed. Over the scene's ground:
    // finer for a few trees, coarser for a course.)
    if (shadeFor.trees !== trees || shadeFor.hour !== light.hour) {
      if (shadeFor.trees !== trees) {
        (ground.material as THREE.Material).dispose();
        ground.material = groundFor(trees);
      }
      const side = state.scene === "course" ? 2600 : state.scene === "grove" || state.scene === "woodland" ? 400 : 200;
      trees.bakeShade({ x0: -side / 2, z0: -side / 2, width: side, depth: side, cell: state.scene === "course" ? 1.25 : 0.4 });
      shadeFor = { trees, hour: light.hour };
    }
    trees.update(renderer, camera, clock.getElapsed());
    renderer.render(scene, camera);
    frames++;
    const now = performance.now();
    if (now - fpsSince > 1000) {
      fps = (frames * 1000) / (now - fpsSince);
      frames = 0;
      fpsSince = now;
      // (How many trees each tier drew: asked of the graphics card once a second, as it is a wait.)
      if (!counting) {
        counting = true;
        const asked = trees;
        asked
          .countDrawn(renderer)
          .then((d) => {
            if (asked === trees) drawn = d;
          })
          .catch(() => undefined)
          .finally(() => (counting = false));
      }
      readout();
    }
  };
  renderer.setAnimationLoop(frame);
  refreshEnvelope();
  readout();

  // ---- Measure: the graphics card's own time for each part of a frame, over fixed views. ----

  // (The grove's and the course's views are the ones measured since the first cut, so numbers compare.)
  const FIXED_VIEWS: Partial<Record<SceneName, [string, number[], number[]][]>> = {
    course: [
      ["Over the course, 30 m up", [-60, 30, 260], [0, 10, 0]],
      ["On a fairway, standing", [180, 1.7, 0], [180, 6, -200]],
      ["Under the trees", [40, 1.7, 40], [80, 6, 60]],
      ["High, the whole course", [0, 400, 1400], [0, 0, 0]],
    ],
    grove: [
      ["In the clearing", [0, 6, 30], [0, 8, -60]],
      ["From outside", [0, 20, 260], [0, 8, 0]],
    ],
    specimen: [["The row", [0, 6, 120], [0, 9, 0]]],
    woodland: [
      ["From the fairway, 100 m", [0, 1.6, 100], [0, 9, 0]],
      ["From the fairway, 60 m", [-30, 1.6, 60], [-10, 7, -10]],
      ["Inside the wood", [10, 1.6, -60], [10, 5, 40]],
    ],
  };
  const viewsToMeasure = (): [string, number[], number[]][] =>
    FIXED_VIEWS[state.scene] ??
    EYES.map(([label, eye]) => {
      const v = viewFor(state.scene, eye);
      return [label, v.at, v.look];
    });
  let measuring = false;
  /** Run from the console too: `await __treeLab.measure()`. */
  const measure = async (): Promise<string> => {
    if (measuring) return "Already measuring.";
    measuring = true;
    renderer.setAnimationLoop(null);
    const was = { at: camera.position.toArray(), look: controls.target.toArray() };
    const rows: string[] = [];
    try {
      for (const [name, eye, at] of viewsToMeasure()) {
        lookFrom(eye, at);
        for (let i = 0; i < 10; i++) frame();
        await renderer.resolveTimestampsAsync("compute");
        await renderer.resolveTimestampsAsync("render");
        let compute = 0;
        let draw = 0;
        const count = 30;
        for (let i = 0; i < count; i++) {
          frame();
          compute += Number(await renderer.resolveTimestampsAsync("compute")) || 0;
          draw += Number(await renderer.resolveTimestampsAsync("render")) || 0;
        }
        const d = await trees.countDrawn(renderer);
        rows.push(`${name.padEnd(28)} ${(compute / count).toFixed(2).padStart(6)} ms ${(draw / count).toFixed(2).padStart(6)} ms   near ${d[0]} mid ${d[1]} far ${d[2]}`);
      }
    } finally {
      lookFrom(was.at, was.look);
      renderer.setAnimationLoop(frame);
      measuring = false;
    }
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    return [`${size.x} x ${size.y}, ${sceneLabel()}, ${grownAt.count} trees, ${trees.plan.variants.length} variants`, "view                         compute     draw", ...rows].join("\n");
  };
  const benchBox = el<HTMLDialogElement>("bench");
  el("open-bench").addEventListener("click", async () => {
    el("bench-text").textContent = "Measuring…";
    el("bench-note").textContent = "";
    benchBox.showModal();
    el("bench-text").textContent = await measure();
  });
  el("bench-close").addEventListener("click", () => benchBox.close());
  el("bench-copy").addEventListener("click", () => {
    navigator.clipboard.writeText(el("bench-text").textContent ?? "").then(() => (el("bench-note").textContent = "Copied."), () => (el("bench-note").textContent = "Could not copy: select the text instead."));
  });

  // For checking the lab by script. `trees` is whichever trees stand now: they are made again on a change.
  const lab = {
    get trees() {
      return trees;
    },
    get species() {
      return species;
    },
    renderer,
    camera,
    controls,
    scene,
    frame,
    measure,
    style,
    detail,
    variants,
    show,
    light,
    state,
    chosen,
    regrow,
    load,
    preset,
    setBare,
    setLook,
    setScene: (name: SceneName) => {
      setScene(name);
      refreshScene();
    },
  };
  (window as unknown as { __treeLab: typeof lab }).__treeLab = lab;
}

start().catch((err) => console.error(err));
