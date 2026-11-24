// The gallery's fixed views: where the eye stands for each, what it looks at, and how wide it sees. Plain
// arithmetic on a tree's measured size (no three), so the same tree gets the same picture every time and
// the framing can be tested (test/views.test.ts).
//
// Every view looks along -z, from the +z side, at trees standing round x = 0, z = 0. A cell is a piece of
// a reference screen (`Screen`: 1080 lines, 50 degrees from top to bottom, as the lab's eye): the piece
// the subject fills, shrunk to fit the cell when it is bigger than the cell, never enlarged beyond the
// screen's own pixels. The trees choose their tier by their size on that screen (`detailScale`), so a cell
// shows the tier a player at that spot would see.

export type ViewName = "tee" | "fairway" | "far" | "under" | "trunk" | RefViewName;
/** The reference pictures' views (lab/references): framed as the owner asked for them, with a phone's lens. */
export type RefViewName = "tee25" | "fairway60" | "up" | "foot";

export interface ViewInfo {
  name: ViewName;
  label: string;
  /** What it is, in a line. */
  note: string;
}

export const VIEWS: readonly ViewInfo[] = [
  { name: "tee", label: "Tee", note: "side-on from 1.6 m, 2.5 crown widths off (further if it would not fit)" },
  { name: "fairway", label: "Fairway, 60 m", note: "one tree from 60 m, at 1.6 m" },
  { name: "far", label: "Far, 150 m", note: "a group of five from 150 m, at 1.6 m" },
  { name: "under", label: "Under the crown", note: "standing under it, looking up" },
  { name: "trunk", label: "Trunk and fork", note: "close on the foot of the trunk and its first fork" },
];
export const VIEW_NAMES: readonly ViewName[] = VIEWS.map((v) => v.name);

/**
 * The reference row's views, each as the reference pictures were asked for, through a phone's main camera
 * (26 mm equivalent: 69 degrees across the long side of the picture, 43 across the short side of a 16:9
 * one), landscape or portrait as the picture is. `ref` is the reference picture's view the cell sits under.
 */
export const REF_VIEWS: readonly (ViewInfo & { name: RefViewName; ref: string; aspect: number })[] = [
  { name: "tee25", label: "Tee, 25 m", note: "from 25 m at 1.6 m, landscape (further only if the tree would not fit)", ref: "tee", aspect: 16 / 9 },
  { name: "fairway60", label: "Fairway, 60 m", note: "from 60 m at 1.6 m, landscape", ref: "60m", aspect: 16 / 9 },
  { name: "up", label: "Straight up", note: "beside the trunk, looking straight up into the crown, portrait", ref: "under", aspect: 9 / 16 },
  { name: "foot", label: "Trunk foot", note: "the lower 2 m of the trunk and its flare from 3 m, portrait", ref: "foot", aspect: 9 / 16 },
];
export const REF_VIEW_NAMES: readonly RefViewName[] = REF_VIEWS.map((v) => v.name);
/** Every view, the gallery's and the reference row's. */
export const ALL_VIEWS: readonly ViewInfo[] = [...VIEWS, ...REF_VIEWS];
/** The phone's field of view from top to bottom (degrees): a 16:9 picture held level, or upright. */
export const PHONE_FOV = { landscape: 42.6, portrait: 69.4 };
/** The width over the height of a view's picture: a reference view's own, else the cell's. */
export const aspectOf = (view: ViewName, cellAspect: number) => REF_VIEWS.find((v) => v.name === view)?.aspect ?? cellAspect;

/** The screen a cell is a piece of: how many lines it has and its field of view from top to bottom (degrees). */
export interface Screen {
  lines: number;
  fov: number;
}
export const REFERENCE_SCREEN: Screen = { lines: 1080, fov: 50 };

/** A tree as the views need it: where it stands and its measured size (m). */
export interface Standing {
  x: number;
  z: number;
  height: number;
  crownRadius: number;
  crownBase: number;
  trunkRadius: number;
}

export type Vec3 = [number, number, number];

/** Where the eye is, what it looks at, and its field of view from top to bottom (degrees). */
export interface Shot {
  eye: Vec3;
  target: Vec3;
  fov: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** A point's place in the picture, -1..1 across and up (out of the picture beyond), and whether it is in front. */
export function project(shot: Shot, aspect: number, p: Vec3): { x: number; y: number; front: boolean } {
  const f = norm(sub(shot.target, shot.eye));
  const right = norm(cross(f, [0, 1, 0]));
  const up = cross(right, f);
  const rel = sub(p, shot.eye);
  const zc = dot(rel, f);
  const t = Math.tan(rad(shot.fov) / 2);
  return { x: dot(rel, right) / zc / (t * aspect), y: dot(rel, up) / zc / t, front: zc > 0 };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The points that must be in the picture for a whole tree: its foot, its top, and its crown's box. */
export function treePoints(t: Standing): Vec3[] {
  const r = t.crownRadius;
  const mid = t.crownBase + (t.height - t.crownBase) * 0.45;
  const out: Vec3[] = [
    [t.x, 0, t.z],
    [t.x, t.height, t.z],
    // (The ground just in front of its foot.)
    [t.x, 0, t.z + Math.max(r * 0.3, t.trunkRadius * 3)],
  ];
  for (const y of [t.crownBase, mid, t.height * 0.85]) for (const sx of [-1, 1]) out.push([t.x + sx * r, y, t.z], [t.x + sx * r * 0.7, y, t.z + r * 0.7]);
  return out;
}

/**
 * The narrowest view from `eye` (x is chosen here, centred on the points) at a distance from the subject
 * (along +z from z = 0) that holds every point with `margin` to spare: its pitch put midway between the
 * highest and lowest point, its field of view as wide as the widest of them needs.
 */
export function fitFrom(points: readonly Vec3[], eyeY: number, distance: number, aspect: number, margin = 0.08): Shot {
  const xs = points.map((p) => p[0]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const eye: Vec3 = [cx, eyeY, distance];
  // (Up and down by the angle each point stands above the eye: the pitch halves them, which centres them exactly.)
  const angles = points.map((p) => Math.atan2(p[1] - eyeY, distance - p[2]));
  const pitch = (Math.min(...angles) + Math.max(...angles)) / 2;
  const target: Vec3 = [cx, eyeY + Math.tan(pitch) * distance, 0];
  // (Then the field of view the furthest out of them needs, up or across.)
  const probe: Shot = { eye, target, fov: 90 };
  let need = 0;
  for (const p of points) {
    const q = project(probe, 1, p);
    need = Math.max(need, Math.abs(q.y), Math.abs(q.x) / aspect);
  }
  return { eye, target, fov: deg(2 * Math.atan(need * Math.tan(rad(45)) * (1 + margin))) };
}

/** The nearest distance (at least `least`) from which `fitFrom` holds the points within `fov`. */
export function fitDistance(points: readonly Vec3[], eyeY: number, aspect: number, fov: number, least: number, margin = 0.08): number {
  if (fitFrom(points, eyeY, least, aspect, margin).fov <= fov) return least;
  let lo = least;
  let hi = least * 2;
  while (fitFrom(points, eyeY, hi, aspect, margin).fov > fov && hi < 1e5) hi *= 2;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (fitFrom(points, eyeY, mid, aspect, margin).fov > fov) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** The field of view at which a cell `cellLines` high shows the screen's pixels one to one. */
export function oneToOneFov(cellLines: number, screen: Screen = REFERENCE_SCREEN): number {
  return deg(2 * Math.atan((Math.tan(rad(screen.fov) / 2) * cellLines) / screen.lines));
}

/**
 * How many of the cell's pixels a metre is for one of the screen's at the same distance: what the tiers'
 * sizes in the picture (the package's `detail.nearPx`, `farPx`) are multiplied by, so a tree chooses the
 * tier it would on the screen.
 */
export function detailScale(cellLines: number, fov: number, screen: Screen = REFERENCE_SCREEN): number {
  return (cellLines / Math.tan(rad(fov) / 2)) / (screen.lines / Math.tan(rad(screen.fov) / 2));
}

/** Five trees of one kind standing together, as fractions of a spacing: x and z. The first is in front, in the middle. */
export const GROUP: readonly [number, number][] = [
  [0, 0.6],
  [-1.7, -0.9],
  [1.6, -0.4],
  [0.3, -2.6],
  [-0.6, 1.9],
];

/** The spacing of the group (m) for a species' crown radius. */
export const groupSpacing = (crownRadius: number) => Math.max(crownRadius * 1.15, 3);

export interface ShotInput {
  view: ViewName;
  /** The trees in the picture: one at x = 0, z = 0, or the group for `far`. */
  trees: readonly Standing[];
  /** How high the trunk's first fork is (m): from the tree as grown. */
  forkY: number;
  /** The cell's width over its height, and its height in pixels. */
  aspect: number;
  cellLines: number;
  screen?: Screen;
}

/** The view a cell is drawn from. */
export function shotFor(input: ShotInput): Shot {
  const screen = input.screen ?? REFERENCE_SCREEN;
  const { aspect, cellLines } = input;
  const least = oneToOneFov(cellLines, screen);
  const t = input.trees[0];
  const points = input.trees.flatMap(treePoints);
  // (Never enlarged beyond the screen's pixels: a small tree far off stays small, as it is.)
  const atLeast = (s: Shot): Shot => ({ ...s, fov: Math.max(s.fov, least) });
  switch (input.view) {
    case "tee": {
      // (2.5 crown widths off, or as far as the whole tree needs to fit the screen's own field.)
      const d = fitDistance(points, 1.6, aspect, screen.fov, t.crownRadius * 5);
      return atLeast(fitFrom(points, 1.6, d, aspect));
    }
    case "fairway":
      return atLeast(fitFrom(points, 1.6, 60, aspect));
    case "far":
      return atLeast(fitFrom(points, 1.6, 150, aspect));
    case "under": {
      // (Standing between the trunk and the crown's edge, at eye height if the crown is high enough, or
      // crouched under a low one, looking up into it.)
      // A crown down to the ground (a shrub's, a gorse's) has no under: the eye crouches at its edge instead,
      // looking up and into it.
      const r = t.crownRadius;
      const up = t.crownBase + (t.height - t.crownBase) * 0.55;
      if (t.crownBase < 0.5) return { eye: [t.x + r * 0.15, 0.3, t.z + r * 1.15 + 0.3], target: [t.x, t.height * 0.75, t.z - r * 0.2], fov: 70 };
      const eyeY = Math.min(1.6, Math.max(0.4, t.crownBase * 0.75));
      return { eye: [t.x + r * 0.12, eyeY, t.z + Math.max(r * 0.5, t.trunkRadius + 1.2)], target: [t.x, up, t.z - r * 0.2], fov: 70 };
    }
    case "tee25": {
      // (From 25 m, the phone's field, pitched so the tree stands in the middle; further back only for a
      // tree too tall for it.)
      // (A margin of a fifth: a drawn crown's cards reach a little past its measured box.)
      const d = fitDistance(points, 1.6, aspect, PHONE_FOV.landscape, 25, 0.2);
      const fit = fitFrom(points, 1.6, d, aspect, 0.2);
      return { ...fit, fov: PHONE_FOV.landscape };
    }
    case "fairway60": {
      const fit = fitFrom(points, 1.6, 60, aspect, 0.2);
      return { ...fit, fov: Math.max(PHONE_FOV.landscape, fit.fov) };
    }
    case "up": {
      // (A step from the trunk, at eye height, facing it, the phone tipped back 74 degrees: the trunk rises
      // from the foot of the picture into the crown, and the top of the picture is past straight up.)
      const back = t.trunkRadius + 1.0;
      const eyeY = 1.6;
      const pitch = rad(74);
      return { eye: [t.x + 0.15, eyeY, t.z + back], target: [t.x + 0.15, eyeY + Math.sin(pitch) * 10, t.z + back - Math.cos(pitch) * 10], fov: PHONE_FOV.portrait };
    }
    case "foot": {
      // (3 m from the bark, at 1.1 m, looking at the trunk 1 m up: the flare in the lower part of the
      // picture, the ground before it below, the stem on up out of the top.)
      const d = t.trunkRadius + 3;
      return { eye: [t.x, 1.1, t.z + d], target: [t.x, 1.0, t.z], fov: PHONE_FOV.portrait };
    }
    case "trunk": {
      // (From the ground in front of its foot to a little above where it first forks: the flare, the bark,
      // the collars of its first limbs.)
      // (A fork high on a long bole, a eucalyptus's or a pine's, is still in the picture, up to 12 m: further
      // off, so the foot is smaller. A palm has no fork: its bole to 12 m.)
      const top = Math.min(t.height, Math.max(2, Math.min(12, input.forkY * 1.25)));
      const w = Math.max(0.9, t.trunkRadius * 4);
      const box: Vec3[] = [];
      for (const y of [0, top]) for (const sx of [-1, 1]) box.push([t.x + sx * w, y, t.z]);
      box.push([t.x, 0, t.z + w]);
      const eyeY = Math.min(1.6, top * 0.45);
      const d = fitDistance(box, eyeY, aspect, 40, t.trunkRadius + 0.8);
      return fitFrom(box, eyeY, d, aspect);
    }
  }
}
