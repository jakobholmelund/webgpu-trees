// The realistic look's leaf cards, from photographs: each species' own leaves (a sheet of single scanned
// leaves, scans.ts) laid on its own twigs, at their real size on the card, as its kind carries them: an oak's
// one to a node with a cluster at the tip, a maple's in pairs, a eucalyptus's few long sickles hanging from
// the twig's end, a willow's all along a hanging whip; a fir's or a cedar's whole scanned sprays, a pine's
// whole shoots; a palm's leaflets along its rachis or round its fan.
//
// Each species has a row of the atlas: three near cards (a short twig with a few leaves, about a third of a
// metre across: `nearCardHalf`) and two big cards (a branch's end, a clump wide: the mid tier's cards, a
// conifer's sheets, the far dabs; a pine's cushions, `drawCushionCard` and `drawnCushionCard`). Each card is
// drawn from its foot: its first row is where its twig comes in (`CARD_V`). Its texels are as leaves.ts draws them, so the shaders read either alike:
// red and blue a grey tone (the scan's lightness over its sheet's mean, lit a little by its own relief), green
// a number of each leaf's own (how thin it is: the scan's translucency, by leaf), alpha coverage.
//
// Plain arithmetic, no three: the tests read the cards as they are.

import { type Pixels } from "./mips.ts";
import { hash01 } from "./variants.ts";
import { type LeafSet, type LeafSprite, type ScanLook, nearCardHalf } from "./scans.ts";

/** Columns of a species' row: three near cards and two big ones. */
export const SPRAY_COLS = 5;
export const NEAR_CARDS = 3;
/** The first big card's column, and how many big cards a row has (a clump's mass, a mid tree's cards, a far dab's). */
export const BIG_CARD = 3;
export const BIG_CARDS = 2;
/** A leaf's tone on average (as leaves.ts's), and a twig's. */
const LEAF = 0.6;
const TWIG = 0.33;
/** Where a near card's twig comes in: this share of the cell from its first row (geometry.ts `SPRAY_FOOT`: 0.8 of the half below the middle). */
export const FOOT = 0.1;
/**
 * How a card's corner (`aDab.y`, -1 at its twig's foot, 1 at its far end: geometry.ts `cardPieces`) is laid on
 * its cell in the atlas, its rows from its first (engine.ts `vTreeUv`: v = row + 0.5 + this · aDab.y, over the
 * rows): positive, so the foot corner is the cell's first row, where a card is drawn from its foot. three's
 * WebGPU renderer samples a DataTexture's first row at v = 0 (no flip: `flipY` is for pictures), as WebGL
 * does; checked in the lab with a texture of two rows.
 */
export const CARD_V = 0.5;
/** A big card's leaves behind its own: from how dense a species (1 - openness), and how dark, in their shade. */
const DENSE_FROM = 0.6;
/**
 * A pine's tuft (see `needleTuft`): the stretch of its shoot that bears needles, in needle lengths; the angle its
 * needles leave the shoot at, at the tip (the young, forward) and at the back of that stretch (the old, spread
 * out and falling back), in radians; and how many needles to a needle's length in texels, fewest and most.
 */
const TUFT_STRETCH = 0.8;
/** Behind a long brush's tip (`ScanLook.brush`), the angles its needles stand forward from the shoot at (rad). */
const BRUSH_ANGLE_LO = 0.55;
const BRUSH_ANGLE_HI = 1.15;
const TUFT_TIP_ANGLE = 0.45;
const TUFT_BACK_ANGLE = 1.9;
const TUFT_NEEDLES = 1.4;
const TUFT_LEAST = 18;
const TUFT_MOST = 160;
/** At most this many bundles to a tuft, and how far a bundle's needles stray from its line (rad). */
const TUFT_BUNDLES = 28;
/** At least this many: a tuft of a few big spokes was a palmate leaf a few dozen metres off. */
const TUFT_BUNDLES_LEAST = 12;
const TUFT_BUNDLE_SPREAD = 0.1;
/** The share of a tuft's needles that stand loose between its bundles. */
const TUFT_LOOSE = 0.45;
/** The shortest a pine's shoot that puts out more, in its needles' lengths. */
const PINE_SHOOT = 2.2;
/** A pine's big card: how many branches' shoots it carries side by side, and as many more for a dense one; the fan they spread over (rad). */
const BRANCH_SHOOTS = 5;
const BRANCH_SHOOTS_DENSE = 7;
const BRANCH_FAN = 1.2;
/** How long a pine's big card's branch is, as a share of the card. */
const BRANCH_REACH = 0.8;
/** How thick its wood is beside a near card's: its stems, a texel or two each, were a ladder under the cushion. */
const BRANCH_WOOD = 0.5;
/** Needles shorter than this (m) fill a pine's big card with as many more shoots as they are shorter, to twice as many. */
const BRANCH_NEEDLE = 0.1;
/** A pine's needle when its look gives none: this share of its brush (`leafCm`). */
const NEEDLE_OF_BRUSH = 0.45;
const UNDER_TONE = 0.55;
/** Texels kept clear round a cell's edge, so its mips do not bleed into the next. */
const MARGIN = 6;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const srgbToLinear = (s: number) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
const LIN = new Float32Array(256).map((_, i) => srgbToLinear(i / 255));

/** A leaf sheet and its texels, decoded. */
export interface Sheet {
  set: LeafSet;
  albedo: Pixels;
  normal: Pixels;
}

interface Layer {
  n: number;
  tone: Float32Array;
  own: Float32Array;
  cover: Float32Array;
}

function rng(seed: number): () => number {
  let k = 0;
  return () => hash01(k++, seed);
}

// ---------------------------------------------------------------------------------------------------------------------
// Drawing: a twig as a tapered stroke, a leaf as its photograph, turned, scaled and bent onto the card.

function stroke(L: Layer, ax: number, ay: number, bx: number, by: number, ra: number, rb: number, tone: number, own = 0.2): void {
  const n = L.n;
  const r = Math.max(ra, rb) + 1.5;
  const i0 = Math.max(MARGIN, Math.floor(Math.min(ax, bx) - r));
  const i1 = Math.min(n - 1 - MARGIN, Math.ceil(Math.max(ax, bx) + r));
  const j0 = Math.max(MARGIN, Math.floor(Math.min(ay, by) - r));
  const j1 = Math.min(n - 1 - MARGIN, Math.ceil(Math.max(ay, by) + r));
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  const len = Math.sqrt(len2);
  for (let j = j0; j <= j1; j++) {
    const py = j + 0.5 - ay;
    for (let i = i0; i <= i1; i++) {
      const px = i + 0.5 - ax;
      const t = clamp01((px * dx + py * dy) / len2);
      const ex = px - dx * t;
      const ey = py - dy * t;
      const rad = ra + (rb - ra) * t;
      const d = Math.sqrt(ex * ex + ey * ey);
      const c = clamp01((rad - d) / 1.2 + 0.5);
      if (c <= 0) continue;
      // (Round: lighter along one side.)
      const side = (dx * py - dy * px) / len / Math.max(rad, 0.5);
      const t1 = tone * (1 + 0.18 * Math.max(-1, Math.min(1, side)));
      const o = j * n + i;
      L.tone[o] = L.tone[o] * (1 - c) + t1 * c;
      L.own[o] = L.own[o] * (1 - c) + own * c;
      L.cover[o] = L.cover[o] * (1 - c) + c;
    }
  }
}

/**
 * A pine's tuft drawn needle by needle: the end of a shoot at (x, y) pointing along `ang`, its needles `len`
 * texels long, leaving the last stretch of it (`TUFT_STRETCH`) all round it. Each bundle of needles is set in
 * three dimensions (the young ones near the tip forward, the old ones further back standing out square and
 * falling back) and seen side-on, foreshortened: so a tuft is a starburst, its outline a ring of needle tips,
 * longest forward, and not the fan of a picture laid flat, which made a pine's crown a broad leaf's. Its
 * needles lie together in bundles a little apart, spokes with sky between them, as a pine's tufts are seen a
 * few dozen metres off: needles spread evenly were, once the card was mipped down, a soft round blot. The
 * bundles behind the shoot are drawn first and darker, those in front last and lighter, each needle lighter to
 * its tip.
 */
function needleTuft(L: Layer, x: number, y: number, ang: number, len: number, rnd: () => number, tone: number, own: number, brush = TUFT_STRETCH): void {
  // (A longer brush, as many more needles and bundles as it is longer: as thick all along it.)
  const more = Math.max(1, brush / TUFT_STRETCH);
  const n = Math.round(Math.min(TUFT_MOST * more, Math.max(TUFT_LEAST, len * TUFT_NEEDLES * more)));
  const bundles = Math.max(TUFT_BUNDLES_LEAST, Math.min(Math.round(TUFT_BUNDLES * more), Math.round(n / 4)));
  const tip = len * TUFT_STRETCH;
  const stretch = len * Math.max(TUFT_STRETCH, brush);
  // (A needle at least most of a texel wide: thinner, a branch's card of them is a lace, little of it at the cut.)
  const w = Math.max(0.7, len * 0.012);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const needles: { bx: number; by: number; dx: number; dy: number; front: number; t: number }[] = [];
  for (let b = 0; b < bundles; b++) {
    // (Where along the stretch, 0 at its back and 1 at the tip: more of them towards the tip. Behind the tip's
    // starburst, a long brush's needles stand forward along the shoot, as a bottle brush's: older needles
    // than the tip's, still pointing the way the shoot grew.)
    const q = (b + rnd()) / bundles;
    const back = stretch * (1 - q);
    const s = back <= tip ? 1 - back / tip : 0;
    const theta = back <= tip ? lerp(TUFT_BACK_ANGLE, TUFT_TIP_ANGLE, s) * (0.8 + 0.4 * rnd()) : lerp(BRUSH_ANGLE_LO, BRUSH_ANGLE_HI, rnd());
    const phi = rnd() * Math.PI * 2;
    const bt = LEAF * tone * (0.8 + 0.35 * rnd());
    const per = Math.max(2, Math.round(((n * (1 - TUFT_LOOSE)) / bundles) * (0.6 + 0.8 * rnd())));
    for (let q = 0; q < per; q++) {
      // (Each needle of a bundle a little off its line: a spoke fraying at its end.)
      const th = theta + (rnd() - 0.5) * TUFT_BUNDLE_SPREAD;
      const ph = phi + (rnd() - 0.5) * TUFT_BUNDLE_SPREAD * 2;
      // (Along the shoot, across it in the card, and towards the eye.)
      const u = Math.cos(th);
      const v = Math.sin(th) * Math.cos(ph);
      const front = Math.sin(th) * Math.sin(ph);
      const nl = len * (0.82 + 0.25 * rnd());
      const at = back + (rnd() - 0.5) * tip * 0.12;
      needles.push({ bx: x - ca * at, by: y - sa * at, dx: (ca * u - sa * v) * nl, dy: (sa * u + ca * v) * nl, front, t: bt * (0.9 + 0.2 * rnd()) });
    }
  }
  // (And some loose between them, so close to a tuft is a brush and not a few spokes.)
  for (let q = 0; q < n * TUFT_LOOSE; q++) {
    const at = stretch * rnd();
    const s = at <= tip ? 1 - at / tip : 0;
    const th = at <= tip ? lerp(TUFT_BACK_ANGLE, TUFT_TIP_ANGLE, s) * (0.8 + 0.4 * rnd()) : lerp(BRUSH_ANGLE_LO, BRUSH_ANGLE_HI, rnd());
    const ph = rnd() * Math.PI * 2;
    const u = Math.cos(th);
    const v = Math.sin(th) * Math.cos(ph);
    const nl = len * (0.75 + 0.25 * rnd());
    needles.push({ bx: x - ca * at, by: y - sa * at, dx: (ca * u - sa * v) * nl, dy: (sa * u + ca * v) * nl, front: Math.sin(th) * Math.sin(ph), t: LEAF * tone * (0.75 + 0.35 * rnd()) });
  }
  needles.sort((p, q) => p.front - q.front);
  for (const nd of needles) {
    // (Behind the shoot, in the tuft's own shade; in front, in the light.)
    const lit = 0.7 + 0.45 * (nd.front * 0.5 + 0.5);
    const mx = nd.bx + nd.dx * 0.45;
    const my = nd.by + nd.dy * 0.45;
    stroke(L, nd.bx, nd.by, mx, my, w, w * 0.9, nd.t * lit * 0.62, own);
    stroke(L, mx, my, nd.bx + nd.dx, nd.by + nd.dy, w * 0.9, w * 0.45, nd.t * lit * 1.3, own);
  }
}

/** A pine's needle, metres: its look's, or a share of its brush. */
export function needleOf(look: ScanLook): number {
  return (look.needleCm ?? look.leafCm * NEEDLE_OF_BRUSH) / 100;
}

/** A leaf to lay: its stalk's end (texels), which way it points (radians, the picture's x and rows), and how long. */
interface Lay {
  x: number;
  y: number;
  ang: number;
  len: number;
  sprite: LeafSprite;
  /** Its width over the scan's; its sickle bend (a share of its length, to its left); mirrored or not. */
  width: number;
  bend: number;
  flip: boolean;
  tone: number;
  own: number;
  /** A pine's tuft's brush, in its needles' lengths. */
  brush?: number;
}

/** Bilinear sample of a sheet's channel k at (x, y) texels; 0 off the sheet. */
function sample(p: Pixels, x: number, y: number, k: number): number {
  const x0 = Math.floor(x - 0.5);
  const y0 = Math.floor(y - 0.5);
  const fx = x - 0.5 - x0;
  const fy = y - 0.5 - y0;
  let s = 0;
  for (let q = 0; q < 4; q++) {
    const xx = x0 + (q & 1);
    const yy = y0 + (q >> 1);
    if (xx < 0 || yy < 0 || xx >= p.width || yy >= p.height) continue;
    s += p.data[(yy * p.width + xx) * 4 + k] * ((q & 1 ? fx : 1 - fx) * (q >> 1 ? fy : 1 - fy));
  }
  return s / 255;
}

/** Its box on the card, and whether all of it is inside the card's clear margin. */
function footprint(L: Layer, l: Lay): { i0: number; i1: number; j0: number; j1: number; inside: boolean } {
  const s = l.sprite;
  const sl = Math.hypot(s.tip[0] - s.base[0], s.tip[1] - s.base[1]) || 1;
  const k = l.len / sl;
  const half = (Math.max(s.w, s.h) * k * Math.max(1, l.width)) / 2 + Math.abs(l.bend) * l.len + 2;
  const cx = l.x + Math.cos(l.ang) * l.len * 0.5;
  const cy = l.y + Math.sin(l.ang) * l.len * 0.5;
  const r = Math.min(half, l.len * 0.5 + (s.w * k * l.width) / 2 + Math.abs(l.bend) * l.len + 2);
  const i0 = Math.floor(cx - r);
  const i1 = Math.ceil(cx + r);
  const j0 = Math.floor(cy - r);
  const j1 = Math.ceil(cy + r);
  const n = L.n;
  return { i0, i1, j0, j1, inside: i0 >= MARGIN && j0 >= MARGIN && i1 <= n - 1 - MARGIN && j1 <= n - 1 - MARGIN };
}

/** Whether all of a tuft (`needleTuft`) at a lay's place, its needles as long as the lay, is inside the card's clear margin. */
function tuftInside(L: Layer, l: Lay): boolean {
  // (Its needles reach on past the tip, out square and a little back, and from as far back as its stretch.)
  const ca = Math.cos(l.ang);
  const sa = Math.sin(l.ang);
  const r = l.len * 1.3;
  const cx = l.x - ca * l.len * 0.2;
  const cy = l.y - sa * l.len * 0.2;
  // (A long brush's back too: its needles stand out from the shoot that far behind the tip.)
  const b = l.len * Math.max(0, (l.brush ?? TUFT_STRETCH) - TUFT_STRETCH);
  const bx = l.x - ca * (l.len * TUFT_STRETCH + b);
  const by = l.y - sa * (l.len * TUFT_STRETCH + b);
  const rb = l.len;
  const ok = (x: number, y: number, rr: number) => x - rr >= MARGIN && y - rr >= MARGIN && x + rr <= L.n - 1 - MARGIN && y + rr <= L.n - 1 - MARGIN;
  return ok(cx, cy, r) && (b <= 0 || ok(bx, by, rb));
}

function leaf(L: Layer, sh: Sheet, l: Lay, shadow: number): void {
  const n = L.n;
  const s = l.sprite;
  const ox = s.x;
  const oy = s.y;
  // (The leaf's own frame on its sheet: up its midrib from its stalk's end, and across to its right.)
  const ax = s.tip[0] - s.base[0];
  const ay = s.tip[1] - s.base[1];
  const sl = Math.hypot(ax, ay) || 1;
  const ux = ax / sl;
  const uy = ay / sl;
  const rx = -uy;
  const ry = ux;
  const k = l.len / sl;
  const da = [Math.cos(l.ang), Math.sin(l.ang)];
  const fl = l.flip ? -1 : 1;
  const dc = [-da[1] * fl, da[0] * fl];
  const box = footprint(L, l);
  const i0 = Math.max(MARGIN, box.i0);
  const i1 = Math.min(n - 1 - MARGIN, box.i1);
  const j0 = Math.max(MARGIN, box.j0);
  const j1 = Math.min(n - 1 - MARGIN, box.j1);
  const meanL = Math.max(0.02, sh.set.meanLinear[0] * 0.2126 + sh.set.meanLinear[1] * 0.7152 + sh.set.meanLinear[2] * 0.0722);
  /** Where on the sheet a texel of the card falls (or null off the leaf's box). */
  const toSheet = (px: number, py: number): [number, number] | null => {
    const a = px * da[0] + py * da[1];
    const u = a / l.len;
    const c = px * dc[0] + py * dc[1] - l.bend * l.len * u * u;
    const along = a / k;
    const across = c / (k * l.width);
    const sx = s.base[0] + ux * along + rx * across;
    const sy = s.base[1] + uy * along + ry * across;
    if (sx < 0 || sy < 0 || sx > s.w || sy > s.h) return null;
    return [ox + sx, oy + sy];
  };
  // (Its shadow on what is already drawn: down and to the right a little, soft.)
  if (shadow > 0) {
    for (let j = j0; j <= j1 + Math.ceil(shadow); j++) {
      if (j > n - 1 - MARGIN) break;
      for (let i = i0; i <= i1 + Math.ceil(shadow * 0.4); i++) {
        if (i > n - 1 - MARGIN) break;
        const o = j * n + i;
        if (L.cover[o] <= 0) continue;
        const at = toSheet(i + 0.5 - l.x - shadow * 0.4, j + 0.5 - l.y - shadow);
        if (!at) continue;
        const c = sample(sh.albedo, at[0], at[1], 3);
        if (c > 0) L.tone[o] *= 1 - 0.3 * c;
      }
    }
  }
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const at = toSheet(i + 0.5 - l.x, j + 0.5 - l.y);
      if (!at) continue;
      const c = sample(sh.albedo, at[0], at[1], 3);
      if (c <= 0.004) continue;
      // (The texel's lightness, from the nearest sheet texel's colour: its photograph's detail.)
      const xi = Math.min(sh.albedo.width - 1, Math.max(0, Math.floor(at[0])));
      const yi = Math.min(sh.albedo.height - 1, Math.max(0, Math.floor(at[1])));
      const q = (yi * sh.albedo.width + xi) * 4;
      const d = sh.albedo.data;
      const lum = 0.2126 * LIN[d[q]] + 0.7152 * LIN[d[q + 1]] + 0.0722 * LIN[d[q + 2]];
      // (Its relief, turned with it: lit a little from the card's top, so a vein or a curl shows.)
      const nx = sample(sh.normal, at[0], at[1], 0) * 2 - 1;
      const ny = sample(sh.normal, at[0], at[1], 1) * 2 - 1;
      const thin = sample(sh.normal, at[0], at[1], 2);
      // (The normal's x runs across the leaf, its y up the leaf to its tip; on the card: across dc, along da.
      // Lit from the card's far end (+rows), a little across.)
      const px = (nx * dc[0] + ny * da[0]) * fl;
      const py = nx * dc[1] + ny * da[1];
      const relief = 1 + 0.35 * (px * 0.35 + py * 0.6);
      const tone = Math.min(1, LEAF * l.tone * Math.pow(lum / meanL, 0.85) * relief);
      const o = j * n + i;
      L.tone[o] = L.tone[o] * (1 - c) + tone * c;
      L.own[o] = L.own[o] * (1 - c) + clamp01(l.own * 0.55 + thin * 0.45) * c;
      L.cover[o] = L.cover[o] * (1 - c) + c;
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The sprays: built in metres from the twig's foot (+y along the card, away from its foot), then laid out.

/** A twig: its points (m), and how thick it is at its foot and its tip (m). */
interface Twig {
  pts: { x: number; y: number; a: number }[];
  r0: number;
  r1: number;
}

/** Leaves to lay, in metres, before they are put on the card. */
interface LeafAt {
  x: number;
  y: number;
  ang: number;
  len: number;
  /** Drawn needle by needle (a pine's tuft, `needleTuft`), not as its picture. */
  needles?: boolean;
  /** A tuft's brush along its shoot, in its needles' lengths (`ScanLook.brush`). */
  brush?: number;
}

function grow(x: number, y: number, a: number, len: number, curl: number, rnd: () => number, n = 8, wobble = 0.08): Twig["pts"] {
  const pts = [{ x, y, a }];
  for (let i = 1; i <= n; i++) {
    a += curl / n + (rnd() - 0.5) * wobble;
    x += Math.cos(a) * (len / n);
    y += Math.sin(a) * (len / n);
    pts.push({ x, y, a });
  }
  return pts;
}

function along(pts: Twig["pts"], s: number): { x: number; y: number; a: number } {
  const f = clamp01(s) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const t = f - i;
  return { x: lerp(pts[i].x, pts[i + 1].x, t), y: lerp(pts[i].y, pts[i + 1].y, t), a: pts[i + 1].a };
}

const UP = Math.PI / 2;

/** A near card's spray of `look`'s leaves, `extent` metres across: a short twig or two and their leaves, in metres from its foot. */
function nearSpray(look: ScanLook, extent: number, rnd: () => number, density = 0.5): { twigs: Twig[]; leaves: LeafAt[] } {
  const L = look.leafCm / 100;
  const twigs: Twig[] = [];
  const leaves: LeafAt[] = [];
  const size = () => L * (0.82 + rnd() * 0.3);
  const thick = Math.max(0.0012, L * 0.025);
  const kind = look.spray;
  if (kind === "tufts") {
    // (A pine's twig's end: its last few years' shoots, each year's a whorl, and a tuft of needles at the end
    // of each: two or three big brushes on a long-needled pine, a dozen small ones on a short-needled one.)
    return pineShoots(extent * 0.55, Math.min(needleOf(look), extent * 0.3), density, rnd, look.brush);
  }
  if (kind === "sprays") {
    // (A short bare stem, and off it the sprays fanning out, the middle one last, on top.)
    const stem = extent * 0.12;
    twigs.push({ pts: grow(0, 0, UP, stem, 0, rnd, 2, 0.02), r0: thick * 1.6, r1: thick * 1.2 });
    const n = 4 + Math.floor(rnd() * 2);
    for (let k = n - 1; k >= 0; k--) {
      const side = k % 2 ? 1 : -1;
      const ang = UP + (k === 0 ? (rnd() - 0.5) * 0.2 : side * (0.3 + 0.22 * Math.ceil(k / 2) + rnd() * 0.15));
      const at = k === 0 ? stem : stem * (0.3 + 0.7 * rnd());
      leaves.push({ x: 0, y: at, ang, len: Math.min(extent * 0.78, size() * (k === 0 ? 1.05 : 0.85 - 0.08 * Math.ceil(k / 2))) });
    }
    return { twigs, leaves };
  }
  const reach = extent * 0.72;
  const main = grow(0, 0, UP + (rnd() - 0.5) * 0.25, reach * (kind === "hanging" ? 0.7 : 1), (rnd() - 0.5) * 0.5, rnd, 10, 0.05);
  twigs.push({ pts: main, r0: thick * 1.4, r1: thick * 0.7 });
  const shoots: { pts: Twig["pts"]; len: number }[] = [{ pts: main, len: reach }];
  if (kind === "alternate" || kind === "opposite") {
    // (Two shorter shoots off the first, one to either side, so the card is a little twig of leaves and not one
    // row of them.)
    let side = rnd() < 0.5 ? 1 : -1;
    for (const at of [0.16 + rnd() * 0.08, 0.36 + rnd() * 0.08, 0.56 + rnd() * 0.08]) {
      const p = along(main, at);
      const len = reach * (0.42 + rnd() * 0.2) * (1.15 - at * 0.6);
      const pts = grow(p.x, p.y, p.a + side * (0.6 + rnd() * 0.3), len, -side * 0.3, rnd, 6, 0.06);
      twigs.push({ pts, r0: thick, r1: thick * 0.6 });
      shoots.push({ pts, len });
      side = -side;
    }
  }
  for (const sh of shoots) {
    const first = sh === shoots[0];
    if (kind === "alternate" || kind === "opposite") {
      // (A leaf at each node, to either side in turn (or a pair), set off from the shoot and forward; nodes
      // closer towards the tip, and a few leaves gathered at it.)
      let s = (first ? 0.22 : 0.12) + rnd() * 0.06;
      let side = rnd() < 0.5 ? 1 : -1;
      const gap = Math.max(0.12, (L * 0.42) / sh.len);
      const per = look.perSpray ? Math.max(1, look.perSpray / 8) : 1;
      while (s < 0.92) {
        const p = along(sh.pts, s);
        for (const sd of kind === "opposite" ? [1, -1] : [(side = -side)]) {
          leaves.push({ x: p.x, y: p.y, ang: p.a + sd * (0.55 + rnd() * 0.45), len: size() * (1 - 0.15 * s) });
        }
        s += (gap / per) * (0.8 + rnd() * 0.4) * (1 - 0.35 * s);
      }
      const tip = sh.pts[sh.pts.length - 1];
      const n = kind === "opposite" ? 3 : 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) leaves.push({ x: tip.x, y: tip.y, ang: tip.a + (k - (n - 1) / 2) * 0.45 + (rnd() - 0.5) * 0.2, len: size() * 0.95 });
    } else if (kind === "hanging") {
      // (A few long leaves alternate along the shoot's outer stretch, each hanging on its stalk beside it,
      // sickle-curved and edge on, a little apart: gathered at its end, they lay over one another into a lobed
      // mass, an oak's leaf.)
      const n = look.perSpray ?? 6;
      let sd = rnd() < 0.5 ? 1 : -1;
      for (let k = 0; k < n; k++) {
        const p = along(sh.pts, 0.2 + 0.8 * (k / Math.max(1, n - 1)) + (rnd() - 0.5) * 0.06);
        sd = -sd;
        leaves.push({ x: p.x, y: p.y, ang: p.a + sd * (0.12 + rnd() * 0.22), len: size() * 1.05 });
      }
    } else {
      // (Weeping: narrow leaves all along the hanging shoot, close to it, pointing on down it.)
      const gap = Math.max(0.035, (L * 0.32) / sh.len);
      let side = 1;
      for (let s = 0.06 + rnd() * 0.04; s < 0.97; s += gap * (0.8 + rnd() * 0.4)) {
        const p = along(sh.pts, s);
        side = -side;
        leaves.push({ x: p.x, y: p.y, ang: p.a + side * (0.28 + rnd() * 0.3), len: size() * (0.85 + 0.15 * (1 - s)) });
      }
    }
  }
  return { twigs, leaves };
}

/**
 * A pine's shoots, grown as a pine grows them: a shoot `reach` metres long from the card's foot, a whorl of two
 * or three shoots a year up it, each of them in turn putting out its own, all turning up at their ends; and a
 * tuft of needles `N` metres long (`needleTuft`) only at the end of each shoot, the wood behind it bare. So a
 * pine's branch is a candelabrum of separate tufts with sky between, not a mat of needles, which read as a
 * broad leaf's mass; a dense pine's (`density`) more crowded, an open one's sparser.
 */
export function pineShoots(reach: number, N: number, density: number, rnd: () => number, brush?: number): { twigs: Twig[]; leaves: LeafAt[] } {
  const twigs: Twig[] = [];
  const leaves: LeafAt[] = [];
  // (A shoot shorter than this ends in a tuft and puts out no more: a year's shoot is some twice its needles
  // long, and its tufts were a mat of needles where its shoots were shorter.)
  const least = N * PINE_SHOOT;
  const keep = 0.55 + 0.45 * Math.min(1, Math.max(0, density));
  const shoot = (x: number, y: number, a: number, len: number, r: number, depth: number) => {
    const pts = grow(x, y, a, len, (UP - a) * 0.35, rnd, 6, 0.06);
    twigs.push({ pts, r0: r, r1: r * 0.6 });
    const tip = pts[pts.length - 1];
    leaves.push({ x: tip.x, y: tip.y, ang: tip.a, len: N * (0.85 + 0.3 * rnd()), needles: true, brush });
    if (depth >= 3 || len < least) return;
    // (Its whorls up it, two or three shoots each, shorter towards its end; a few of them lost.)
    for (let f = 0.3 + rnd() * 0.1; f < 0.9; f += 0.28 * (0.85 + rnd() * 0.3)) {
      const p = along(pts, f);
      const m = 2 + (rnd() < 0.35 ? 1 : 0);
      for (let q = 0; q < m; q++) {
        const sub = len * (0.62 - f * 0.4) * (0.8 + rnd() * 0.4);
        if (sub < least * 0.6 || rnd() > keep) continue;
        const side = q % 2 ? 1 : -1;
        const off = side * (0.6 + 0.35 * rnd()) + (q === 2 ? (rnd() - 0.5) * 0.3 : 0);
        shoot(p.x, p.y, p.a + off, sub, r * 0.7, depth + 1);
      }
    }
  };
  // (A pine's shoot a centimetre or so through, a long-needled one's stouter; a branch's thicker at its foot.)
  shoot(0, 0, UP + (rnd() - 0.5) * 0.2, reach, Math.min(0.012, Math.max(0.002, N * 0.035 * Math.sqrt(reach / Math.max(N, 0.01)) * 0.6)), 0);
  return { twigs, leaves };
}

/**
 * A pine's big card: the end of a branch a clump wide, `extent` metres, seen from the side: the branch running
 * across the card, a little bowed, its shoots rising off it side by side, each of them a pine's shoots
 * (`pineShoots`) at their size, longer towards its middle. A cushion of tufts, flat beneath and domed above,
 * wider than high, as many and as close as the pine is dense, its rim the tufts' spikes: a pine's clump as it
 * is seen from afar. One branch's shoots fanned from a point were a round blot, a broad leaf's mass, and a
 * crown of them a cloud.
 */
function pineBranch(extent: number, N: number, density: number, rnd: () => number, brush?: number): { twigs: Twig[]; leaves: LeafAt[] } {
  const twigs: Twig[] = [];
  const leaves: LeafAt[] = [];
  const d = Math.min(1, Math.max(0, density));
  // (A short-needled pine's tufts are small: more of its shoots to fill the cushion.)
  const m = Math.round((BRANCH_SHOOTS + BRANCH_SHOOTS_DENSE * d) * Math.min(2, Math.max(1, BRANCH_NEEDLE / Math.max(N, 0.01))));
  const reach = extent * BRANCH_REACH;
  const main = grow(-reach / 2, 0, (rnd() - 0.5) * 0.1, reach, -0.25 + (rnd() - 0.5) * 0.15, rnd, 10, 0.03);
  const r = Math.min(0.02, Math.max(0.004, N * 0.06));
  twigs.push({ pts: main, r0: r * BRANCH_WOOD, r1: r * 0.5 * BRANCH_WOOD });
  for (let q = 0; q < m; q++) {
    // (Along the branch evenly, give or take; the middle's shoots longest, so the cushion's top is a dome.)
    const f = Math.min(1, Math.max(0, (q + 0.2 + 0.6 * rnd()) / m));
    const p = along(main, f);
    const mid = 1 - Math.abs(2 * f - 1);
    const a = UP + (f - 0.5) * BRANCH_FAN + (rnd() - 0.5) * 0.35;
    const len = extent * (0.1 + 0.22 * mid) * (0.75 + 0.5 * rnd());
    const one = pineShoots(len, N, density, rnd, brush);
    const c = Math.cos(a - UP);
    const sn = Math.sin(a - UP);
    for (const t of one.twigs) twigs.push({ pts: t.pts.map((u) => ({ x: p.x + u.x * c - u.y * sn, y: p.y + u.x * sn + u.y * c, a: u.a + a - UP })), r0: t.r0 * BRANCH_WOOD, r1: t.r1 * BRANCH_WOOD });
    for (const l of one.leaves) leaves.push({ ...l, x: p.x + l.x * c - l.y * sn, y: p.y + l.x * sn + l.y * c, ang: l.ang + a - UP });
  }
  return { twigs, leaves };
}

/**
 * A big card's spray: a branch's end `extent` metres long, side shoots off it, and all along them its near
 * sprays (`near` metres across each), turned their own ways: as many leaves as a clump of the tree carries.
 */
function bigSpray(look: ScanLook, extent: number, near: number, rnd: () => number, density = 0): { twigs: Twig[]; leaves: LeafAt[] } {
  if (look.spray === "tufts") return pineBranch(extent, needleOf(look), density, rnd, look.brush);
  const twigs: Twig[] = [];
  const leaves: LeafAt[] = [];
  const kind = look.spray;
  const thick = Math.max(0.003, (look.leafCm / 100) * 0.04);
  const hangs = kind === "hanging" || kind === "weeping";
  const reach = extent * 0.8;
  const main = grow(0, 0, UP + (rnd() - 0.5) * 0.2, reach, (rnd() - 0.5) * 0.4, rnd, 12, 0.04);
  twigs.push({ pts: main, r0: thick * 2.2, r1: thick * 0.8 });
  const shoots: Twig["pts"][] = [main];
  let side = rnd() < 0.5 ? 1 : -1;
  for (let f = 0.05 + rnd() * 0.03; f < 0.88; f += 0.075 * (0.8 + rnd() * 0.4)) {
    const p = along(main, f);
    const off = hangs ? 0.2 + rnd() * 0.3 : 0.65 + (0.6 - f) * 0.5 + rnd() * 0.3;
    const len = reach * (hangs ? 0.7 - f * 0.3 : 0.55 - f * 0.3) * (0.8 + rnd() * 0.4);
    const pts = grow(p.x, p.y, p.a + side * off, len, -side * (0.15 + rnd() * 0.3), rnd, 6, 0.06);
    twigs.push({ pts, r0: thick * 1.3, r1: thick * 0.6 });
    shoots.push(pts);
    side = -side;
  }
  // (The sprays along every shoot, about half a spray apart, to either side in turn, the last at its tip.)
  for (const pts of shoots) {
    const len = pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
    // (A conifer's sprays and shoots closer: a bough's needles are a dense comb.)
    const gap = (near * (kind === "sprays" ? 0.17 : 0.3)) / Math.max(len, 1e-3);
    let sd = rnd() < 0.5 ? 1 : -1;
    for (let s = 0.12 + rnd() * 0.08; s <= 1.001; s += gap * (0.75 + rnd() * 0.5)) {
      const p = along(pts, Math.min(1, s));
      sd = -sd;
      const turn = p.a - UP + (s > 0.97 ? (rnd() - 0.5) * 0.3 : sd * (hangs ? 0.15 + rnd() * 0.3 : 0.5 + rnd() * 0.5));
      const k = 0.75 + rnd() * 0.35;
      const c = Math.cos(turn);
      const sn = Math.sin(turn);
      const one = nearSpray(look, near, rnd);
      for (const t of one.twigs) twigs.push({ pts: t.pts.map((q) => ({ x: p.x + (q.x * c - q.y * sn) * k, y: p.y + (q.x * sn + q.y * c) * k, a: q.a + turn })), r0: t.r0 * k, r1: t.r1 * k });
      for (const l of one.leaves) leaves.push({ x: p.x + (l.x * c - l.y * sn) * k, y: p.y + (l.x * sn + l.y * c) * k, ang: l.ang + turn, len: l.len * k, needles: l.needles });
    }
  }
  return { twigs, leaves };
}

/** A palm's leaf, fitted to the card: leaflets along a rachis (`pinnate`), or segments round a fan. */
function frond(look: ScanLook, rnd: () => number): { twigs: Twig[]; leaves: LeafAt[] } {
  const twigs: Twig[] = [];
  const leaves: LeafAt[] = [];
  if (look.spray === "pinnate") {
    const len = 1;
    const rachis = grow(0, 0, UP + (rnd() - 0.5) * 0.06, len, (rnd() - 0.5) * 0.15, rnd, 12, 0.01);
    twigs.push({ pts: rachis, r0: 0.012, r1: 0.004 });
    for (const sd of [1, -1]) {
      for (let s = 0.08 + rnd() * 0.01; s < 0.98; s += 0.016 + rnd() * 0.006) {
        if (rnd() < 0.05) continue;
        const p = along(rachis, s);
        const env = s < 0.3 ? 0.4 + 0.6 * Math.sin(((s - 0.08) / 0.22) * (Math.PI / 2)) : 1 - 0.78 * Math.pow((s - 0.3) / 0.7, 1.5);
        const spread = (rnd() < 0.5 ? 0.82 : 1.1) + (rnd() - 0.5) * 0.16;
        leaves.push({ x: p.x, y: p.y, ang: p.a + sd * spread * (1 - 0.3 * s * s), len: 0.5 * env * (0.82 + rnd() * 0.3) });
      }
    }
  } else {
    const pet = grow(0, 0, UP, 0.38, (rnd() - 0.5) * 0.05, rnd, 6, 0.01);
    twigs.push({ pts: pet, r0: 0.014, r1: 0.011 });
    const h = pet[pet.length - 1];
    const n = 34 + Math.floor(rnd() * 5);
    const from = (-10 * Math.PI) / 180;
    const d = ((200 * Math.PI) / 180) / n;
    for (let i = 0; i < n; i++) {
      const a = from + d * (i + 0.5) + (rnd() - 0.5) * 0.25 * d;
      leaves.push({ x: h.x, y: h.y, ang: a, len: 0.62 * (0.74 + 0.26 * Math.max(0, Math.sin(a))) * (0.93 + rnd() * 0.12) });
    }
  }
  return { twigs, leaves };
}

/**
 * Draw one card of a species' leaves into `out` (RGBA8, as leaves.ts's atlas), its cell `n` texels square at
 * (ox, oy): a near card (`big` false, `extent` its width in metres, its twig coming in near its first row),
 * or its big card. `seed` makes each card its own.
 */
export function drawSprayCard(out: Pixels, ox: number, oy: number, n: number, sheet: Sheet, look: ScanLook, extent: number, big: boolean, seed: number, density = 0): void {
  const rnd = rng(seed);
  const whole = look.spray === "whole";
  const palm = look.spray === "pinnate" || look.spray === "fan" || whole;
  // (A whole leaf (a Canary palm's frond) is laid at its size: the card, one of the clumps along the frond, shows
  // the stretch of it the card covers, a third to two thirds of the way out.)
  const section = whole ? 0.3 + rnd() * 0.35 : 0;
  const { twigs, leaves } = whole ? { twigs: [] as Twig[], leaves: [{ x: 0, y: -section * (look.leafCm / 100), ang: UP + (rnd() - 0.5) * 0.06, len: look.leafCm / 100 }] } : palm ? frond(look, rnd) : big ? bigSpray(look, extent, 2 * nearCardHalf(look), rnd, density) : nearSpray(look, extent, rnd, density);
  // (A dense species' big card has a second branch's leaves behind its own, in their shade: the leaves deeper
  // in a clump, which close the gaps a single layer of sprays leaves, as a dense crown is closed. As many of
  // them as it is dense past DENSE_FROM.)
  const under: LeafAt[] = [];
  const thick = big && !palm ? Math.min(1, Math.max(0, (density - DENSE_FROM) / (1 - DENSE_FROM))) : 0;
  if (thick > 0) {
    const more = bigSpray(look, extent, 2 * nearCardHalf(look), rnd, density);
    for (const l of more.leaves) if (rnd() < thick) under.push(l);
  }
  const L: Layer = { n, tone: new Float32Array(n * n), own: new Float32Array(n * n), cover: new Float32Array(n * n) };
  // (Metres to texels: a near card at its real size, its foot near its first row; a big card or a palm's
  // leaf fitted inside its cell.)
  let k = n / extent;
  let fx = n / 2;
  let fy = n * FOOT;
  if (whole) fy = n / 2;
  else if (big || palm) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    const add = (x: number, y: number) => {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    };
    for (const t of twigs) for (const p of t.pts) add(p.x, p.y);
    for (const l of leaves) {
      add(l.x, l.y);
      add(l.x + Math.cos(l.ang) * l.len, l.y + Math.sin(l.ang) * l.len);
    }
    // (The leaves behind lie within the branch's own reach: they do not widen the card.)
    const pad = palm ? 0.04 : (look.leafCm / 100) * 0.3;
    const room = n - 2 * MARGIN - 4;
    const fit = Math.min(room / (x1 - x0 + 2 * pad), room / (y1 - y0 + 2 * pad));
    // (A big card keeps its leaves at their size in metres where it can; only a branch too big for it shrinks.)
    k = palm ? fit : Math.min(k, fit);
    fx = n / 2 - ((x0 + x1) / 2) * k;
    fy = n / 2 - ((y0 + y1) / 2) * k;
  }
  const X = (x: number) => fx + x * k;
  const Y = (y: number) => fy + y * k;
  for (const t of twigs) {
    for (let i = 1; i < t.pts.length; i++) {
      const f0 = (i - 1) / (t.pts.length - 1);
      const f1 = i / (t.pts.length - 1);
      stroke(L, X(t.pts[i - 1].x), Y(t.pts[i - 1].y), X(t.pts[i].x), Y(t.pts[i].y), Math.max(0.7, lerp(t.r0, t.r1, f0) * k), Math.max(0.6, lerp(t.r0, t.r1, f1) * k), TWIG);
    }
  }
  const sprites = sheet.set.sprites;
  // (Its leaves in a shuffled order, so which lies over which is not by where they are.)
  const order = leaves.map((_, i) => i);
  if (!(look.spray === "sprays" || look.spray === "tufts")) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  const shadow = Math.max(1, Math.min(4, n / 160));
  const all = [...under, ...leaves];
  const deep = under.length;
  for (const i of [...under.map((_, j) => j), ...order.map((j) => j + deep)]) {
    const l = all[i];
    const sprite = sprites[Math.floor(rnd() * sprites.length) % sprites.length];
    const lay: Lay = {
      x: X(l.x),
      y: Y(l.y),
      ang: l.ang,
      len: l.len * k * (l.needles ? 1 : 0.75 + 0.25 * sprite.size),
      sprite,
      width: look.leafWidth ?? 1,
      bend: (look.leafBend ?? 0) * (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.6) + (rnd() - 0.5) * 0.04,
      flip: rnd() < 0.5,
      tone: (0.9 + rnd() * 0.2) * (i < deep ? UNDER_TONE : 1),
      own: rnd(),
      brush: l.brush,
    };
    // (A leaf that would reach past the card's edge is made smaller, or left off: cut by the edge, it shows a
    // straight line.)
    const inside = () => (l.needles ? tuftInside(L, lay) : footprint(L, lay).inside);
    let fits = whole || inside();
    for (let t = 0; t < 3 && !fits; t++) {
      lay.len *= 0.85;
      fits = inside();
    }
    if (!fits) continue;
    if (l.needles) needleTuft(L, lay.x, lay.y, lay.ang, lay.len, rnd, lay.tone, lay.own, l.brush);
    else leaf(L, sheet, lay, palm ? shadow * 0.5 : shadow);
  }
  // (Where nothing is drawn, the card's mean tone, so its mips' edges do not darken.)
  let sum = 0;
  let wsum = 0;
  for (let o = 0; o < n * n; o++) {
    sum += L.tone[o];
    wsum += L.cover[o];
  }
  const mean = Math.min(1, wsum > 0 ? sum / wsum : LEAF);
  write(out, ox, oy, n, L, mean, whole);
}

/**
 * One big card of a pine's cushions (`ScanLook.cushion`): a whole picture of one of them seen from the side
 * (`cushions`, its `pick`th), its flat base on the card's foot row and as wide as the card, its domed top
 * towards the far end: its own light and shade, lit top and dark beneath, kept as its tone. Fitted inside the
 * cell's clear margin.
 */
export function drawCushionCard(out: Pixels, ox: number, oy: number, n: number, cushions: Sheet, pick: number): void {
  const sprites = cushions.set.sprites;
  const s = sprites[((pick % sprites.length) + sprites.length) % sprites.length];
  const L: Layer = { n, tone: new Float32Array(n * n), own: new Float32Array(n * n), cover: new Float32Array(n * n) };
  // (Its frame on the sheet: up from its base (its flat base's middle) to its top, as the sheet stands it.)
  const sl = Math.hypot(s.tip[0] - s.base[0], s.tip[1] - s.base[1]) || 1;
  const room = n - 2 * MARGIN - 4;
  // (As wide as the card, or as tall; below its base (twigs under it) as much of the picture as hangs there.)
  const k = Math.min(room / s.w, room / s.h);
  const lay: Lay = { x: n / 2 + (s.base[0] - s.w / 2) * k, y: MARGIN + 2 + Math.max(0, s.h - s.base[1]) * k, ang: UP, len: sl * k, sprite: s, width: 1, bend: 0, flip: true, tone: 1, own: 0.5 };
  leaf(L, cushions, lay, 0);
  const mean = (() => {
    let sum = 0;
    let w = 0;
    for (let o = 0; o < n * n; o++) {
      sum += L.tone[o];
      w += L.cover[o];
    }
    return Math.min(1, w > 0 ? sum / w : LEAF);
  })();
  write(out, ox, oy, n, L, mean, false);
}

/** A drawn cushion's lit top and shaded underside (tone, as a leaf's), and how dark the creases between its lumps. */
const CUSHION_TOP = 1.6;
const CUSHION_UNDER = 0.28;
const CUSHION_CREASE = 0.6;
/** How high a drawn cushion's dome is for its width, and how many tufts to a tuft's own area within it (its closeness). */
const CUSHION_HIGH = 0.5;
/** How far a drawn cushion's flat base curls up at its ends, a share of its height. */
const CUSHION_CURL = 0.35;
/** A pine less dense than this has loose clumps of lumps, not a dome. */
const CUSHION_LOOSE = 0.5;
const CUSHION_PACK = 6;

/**
 * A pine's cushion drawn needle by needle, where it has no picture of one (`ScanLook.cushion` "drawn"): seen
 * from the side, a few lumps side by side on one flat base, the middle's highest, together as wide as the card;
 * filled with its own tufts (`needleTuft`, its needles' length at the card's scale) packed as close as it is
 * dense, each bristling out of its lump; each lit as high as it is in its lump, its top's tips light and its
 * underside near black, darker still in the creases where two lumps meet, a few twigs under its flat base.
 * So a far cushion is a cushion's shape and light, and a near one its needles.
 */
export function drawnCushionCard(out: Pixels, ox: number, oy: number, n: number, look: ScanLook, extent: number, seed: number, density: number): void {
  const rnd = rng(seed);
  const L: Layer = { n, tone: new Float32Array(n * n), own: new Float32Array(n * n), cover: new Float32Array(n * n) };
  const k = n / extent;
  const N = Math.max(6, Math.min(n * 0.09, needleOf(look) * k));
  const d = clamp01(density);
  // (Its lumps: as wide as the card all told, less a needle at either side for their tufts' tips.)
  const base = MARGIN + 3 + N * 0.35;
  const x0 = MARGIN + N;
  const x1 = n - MARGIN - N;
  // (A dome as wide as the card, flat beneath, and on it its puffs: lumps on its top and shoulders, each
  // a smaller dome of its own, with creases between them.)
  const W = x1 - x0;
  // (An open pine's clumps (an Aleppo pine's) are looser: a few lumps of their own, at heights of their own,
  // with air between, and no one dome under them.)
  const loose = d < CUSHION_LOOSE;
  const lumps: { x: number; y: number; rx: number; ry: number }[] = loose ? [] : [{ x: (x0 + x1) / 2, y: base, rx: W / 2, ry: W * CUSHION_HIGH }];
  const m = loose ? 4 + Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 3);
  for (let q = 0; q < m; q++) {
    if (loose) {
      const rx = W * (0.13 + 0.1 * rnd());
      const ry = rx * (0.65 + 0.35 * rnd());
      const f = (q + 0.5 + (rnd() - 0.5) * 0.8) / m;
      lumps.push({ x: x0 + rx + (W - 2 * rx) * f, y: base + ry * 0.4 + W * CUSHION_HIGH * 0.5 * rnd() * (1 - Math.abs(2 * f - 1) * 0.6), rx, ry });
      continue;
    }
    // (Round the dome from shoulder to shoulder, a little apart.)
    const a = Math.PI * (0.12 + 0.76 * ((q + 0.5 + (rnd() - 0.5) * 0.5) / m));
    const rx = W * (0.15 + 0.08 * rnd());
    const ry = rx * (0.75 + 0.3 * rnd());
    const cx = (x0 + x1) / 2 - Math.cos(a) * (W / 2 - rx * 0.6);
    const cy = base + Math.sin(a) * (W * CUSHION_HIGH - ry * 0.7) * 0.9;
    lumps.push({ x: cx, y: cy, rx, ry });
  }
  /** How far in a point is in a lump (0 its rim, 1 its heart), and which lumps it is in. */
  const inLump = (x: number, y: number, l: { x: number; y: number; rx: number; ry: number }) => {
    // (Its base flat beneath, curling up a little at its ends: a cushion's underside, not a board's edge.)
    const u0 = (x - (x0 + x1) / 2) / (W / 2);
    if (y < base + CUSHION_CURL * W * CUSHION_HIGH * u0 * u0 - N * 0.1) return 0;
    const u = (x - l.x) / l.rx;
    const v = (y - l.y) / l.ry;
    return 1 - Math.hypot(u, l.y <= base ? Math.max(0, v) : v);
  };
  // (A few twigs under its flat base, its branch's shoots going up into it.)
  for (let q = 0; q < (loose ? 0 : m + 2); q++) {
    const x = x0 + (x1 - x0) * ((q + 0.5) / (m + 2)) + (rnd() - 0.5) * N;
    stroke(L, x + (rnd() - 0.5) * N * 2, base - N * 0.25, x, base + N * 1.2, 1.2, 0.8, TWIG * 0.7);
  }
  // (Its tufts: as many as cover it some times over, fewer in an open pine's, with gaps between.)
  const area = lumps.reduce((a, l) => a + (Math.PI / 2) * l.rx * l.ry, 0);
  const count = Math.round(((area / (Math.PI * N * N * 0.5)) * CUSHION_PACK * (0.55 + 0.45 * d)));
  const tufts: { x: number; y: number; ang: number; h: number; crease: number; t: number }[] = [];
  for (let q = 0; q < count * 3 && tufts.length < count; q++) {
    const x = x0 + (x1 - x0) * rnd();
    const y = base + (n - MARGIN - base) * rnd() * 0.9;
    let best = -1;
    let bi = 0;
    let second = -1;
    for (let i = 0; i < lumps.length; i++) {
      const f = inLump(x, y, lumps[i]);
      if (f > best) {
        second = best;
        best = f;
        bi = i;
      } else if (f > second) second = f;
    }
    if (best <= 0) continue;
    // (An open pine's cushion has holes: a share of its tufts left out, more of them deep in it.)
    if (rnd() > 0.45 + 0.55 * d + 0.3 * (1 - best)) continue;
    const l = lumps[bi];
    // (Out of its lump: from its base's middle, up and out, the more so towards its top.)
    const ux = (x - l.x) / l.rx;
    const vy = (y - l.y) / l.ry;
    const ang = Math.atan2(vy + 0.25, ux) + (rnd() - 0.5) * 1.6;
    // (How high it is: in its lump, 0 at the lump's foot and 1 at its top above it, and in the cushion.)
    const top = l.y + l.ry * Math.sqrt(Math.max(0, 1 - ux * ux));
    const own = clamp01((y - (l.y - (l.y > base ? l.ry * 0.6 : 0))) / Math.max(1, top - l.y + (l.y > base ? l.ry * 0.6 : 0)));
    const whole = clamp01((y - base) / (W * CUSHION_HIGH));
    const h = 0.55 * own + 0.45 * whole;
    // (In a crease where two lumps meet: both about as deep.)
    const crease = second > 0 ? clamp01(1 - (best - second) / 0.25) : 0;
    tufts.push({ x, y, ang, h, crease, t: 0.85 + 0.3 * rnd() });
  }
  // (The deep and low ones first, those on its top and rim last, over them.)
  tufts.sort((a, b) => a.h - b.h);
  for (const tf of tufts) {
    const lit = lerp(CUSHION_UNDER, CUSHION_TOP, smoothstep01(tf.h ** 1.3)) * (1 - CUSHION_CREASE * tf.crease * (1 - tf.h * 0.5));
    needleTuft(L, tf.x, tf.y, tf.ang, N * (0.8 + 0.4 * rnd()), rnd, lit * tf.t, rnd(), look.brush);
  }
  let sum = 0;
  let w = 0;
  for (let o = 0; o < n * n; o++) {
    sum += L.tone[o];
    w += L.cover[o];
  }
  write(out, ox, oy, n, L, Math.min(1, w > 0 ? sum / w : LEAF), false);
}

const smoothstep01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/** A card's layer written into its cell of the atlas: tone, its own number, coverage; where nothing is drawn, the card's mean tone. Its first row is its foot. */
function write(out: Pixels, ox: number, oy: number, n: number, L: Layer, mean: number, whole: boolean): void {
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      // (Its first row is its foot: the shaders lay a card's first row at its twig's foot (geometry.ts
      // `cardPieces`, engine.ts `vTreeUv`), every species' alike.)
      const p = ((oy + j) * out.width + ox + i) * 4;
      // (A frond's stretch fades out at the card's edges, where its leaflets run on past it.)
      const edge = Math.min(i, j, n - 1 - i, n - 1 - j) - MARGIN;
      const fade = whole ? clamp01(edge / (n * 0.08)) : 1;
      const a = L.cover[o] * fade * (2 - fade);
      const cov = (a * 255 + 0.5) | 0;
      const tone = cov > 0 ? Math.min(1, L.tone[o] / L.cover[o]) : mean;
      const t = (tone * 255 + 0.5) | 0;
      out.data[p] = t;
      out.data[p + 1] = cov > 0 ? ((Math.min(1, L.own[o] / L.cover[o]) * 255 + 0.5) | 0) : 128;
      out.data[p + 2] = t;
      out.data[p + 3] = cov;
    }
  }
}

/**
 * A species' row: its three near cards and its big cards. `bigExtent`: how wide its big cards are (m). A pine
 * with pictures of its cushions (`cushions`, `ScanLook.cushion`) has them on its big cards, one to a card.
 */
export function drawSprayRow(out: Pixels, row: number, n: number, sheet: Sheet, look: ScanLook, bigExtent: number, seed: number, density = 0, cushions?: Sheet): void {
  // (A palm's near cards are the drawn ones' size: a clump's radius and a little less (geometry.ts `cardPieces`),
  // a big card's 0.8 / 1.45 of it.)
  const near = 2 * nearCardHalf(look) || bigExtent * (0.8 / 1.45);
  for (let c = 0; c < SPRAY_COLS; c++) {
    const big = c >= BIG_CARD;
    if (big && look.cushion && cushions && cushions.set.sprites.length > 0) drawCushionCard(out, c * n, row * n, n, cushions, c - BIG_CARD);
    else if (big && look.cushion) drawnCushionCard(out, c * n, row * n, n, look, bigExtent, seed * 31 + c * 7 + 3, density);
    else drawSprayCard(out, c * n, row * n, n, sheet, look, big && look.spray !== "whole" ? bigExtent : near, big, seed * 31 + c * 7 + 3, density);
  }
}
