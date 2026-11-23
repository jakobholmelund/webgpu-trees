// A tree's envelope, drawn in lines over it: the space its numbers give it.
// This is how one checks by eye that a drawn tree fills the size it was given.
//
//   the crown's ellipsoid (yellow): what a ball meets, from `crownEllipsoid`;
//   the crown's outline (orange): its shape's profile, from `crownProfile`, turned round the trunk;
//   the trunk (white): a thin cylinder of its trunk radius, from the ground to the crown's base.
//
// Plain three lines, made here in the lab from the package's public numbers.
// A tree's lean (a few degrees at most) is left out: the lines stand upright.

import * as THREE from "three/webgpu";
import { type CrownOverride, type CrownShape, type TreeSize, crownEllipsoid, crownProfile } from "../src/index";

/** One tree as the envelope needs it: where its foot is, its own size, and its species' crown shape. */
export interface Standing {
  x: number;
  y: number;
  z: number;
  size: TreeSize;
  shape: CrownShape;
  /** The species' own changes to its shape's outline (`crownPeak`, `crownRound`, `lobes`). */
  over?: CrownOverride;
}

const ROUND = 48;
const MERIDIANS = 8;

/** A circle about the vertical through (x, z), at height y, as line segments. */
function ring(out: number[], x: number, y: number, z: number, r: number) {
  for (let i = 0; i < ROUND; i++) {
    const a = (i / ROUND) * Math.PI * 2;
    const b = ((i + 1) / ROUND) * Math.PI * 2;
    out.push(x + Math.cos(a) * r, y, z + Math.sin(a) * r, x + Math.cos(b) * r, y, z + Math.sin(b) * r);
  }
}

function ellipsoid(out: number[], t: Standing) {
  const { cy, rx, ry } = crownEllipsoid(t.size);
  // (Meridians from the bottom to the top, then a few rings between.)
  for (let m = 0; m < MERIDIANS; m++) {
    const lon = (m / MERIDIANS) * Math.PI * 2;
    for (let i = 0; i < ROUND / 2; i++) {
      const a = -Math.PI / 2 + (i / (ROUND / 2)) * Math.PI;
      const b = -Math.PI / 2 + ((i + 1) / (ROUND / 2)) * Math.PI;
      out.push(
        t.x + Math.cos(a) * rx * Math.cos(lon), t.y + cy + Math.sin(a) * ry, t.z + Math.cos(a) * rx * Math.sin(lon),
        t.x + Math.cos(b) * rx * Math.cos(lon), t.y + cy + Math.sin(b) * ry, t.z + Math.cos(b) * rx * Math.sin(lon),
      );
    }
  }
  for (const deg of [-60, -30, 0, 30, 60]) {
    const lat = (deg * Math.PI) / 180;
    ring(out, t.x, t.y + cy + Math.sin(lat) * ry, t.z, Math.cos(lat) * rx);
  }
}

function profile(out: number[], t: Standing) {
  const { height, crownBase, crownRadius } = t.size;
  const depth = Math.max(0.01, height - crownBase);
  const steps = 40;
  const at = (k: number) => [crownRadius * crownProfile(t.shape, k / steps, t.over), crownBase + (k / steps) * depth] as const;
  for (let m = 0; m < MERIDIANS; m++) {
    const lon = (m / MERIDIANS) * Math.PI * 2;
    const c = Math.cos(lon);
    const s = Math.sin(lon);
    // (Closed at the base and the top, to the trunk's line, so each outline reads as a shape.)
    const [r0, y0] = at(0);
    out.push(t.x, t.y + y0, t.z, t.x + r0 * c, t.y + y0, t.z + r0 * s);
    for (let k = 0; k < steps; k++) {
      const [ra, ya] = at(k);
      const [rb, yb] = at(k + 1);
      out.push(t.x + ra * c, t.y + ya, t.z + ra * s, t.x + rb * c, t.y + yb, t.z + rb * s);
    }
    const [r1, y1] = at(steps);
    out.push(t.x + r1 * c, t.y + y1, t.z + r1 * s, t.x, t.y + y1, t.z);
  }
  // (Rings where the outline is at a quarter, half and three quarters of the crown, and at its widest.)
  let widest = 0;
  for (let k = 1; k <= steps; k++) if (at(k)[0] > at(widest)[0]) widest = k;
  for (const k of [steps / 4, steps / 2, (steps * 3) / 4, widest]) {
    const [r, y] = at(k);
    ring(out, t.x, t.y + y, t.z, r);
  }
}

function trunk(out: number[], t: Standing) {
  const r = t.size.trunkRadius;
  // (Up to the crown's base, or to breast height, where the radius is measured, if the crown starts lower.)
  const top = Math.max(t.size.crownBase, 1.3);
  for (const y of [0, 1.3, top]) ring(out, t.x, t.y + y, t.z, r);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    out.push(t.x + Math.cos(a) * r, t.y, t.z + Math.sin(a) * r, t.x + Math.cos(a) * r, t.y + top, t.z + Math.sin(a) * r);
  }
}

function lines(points: number[], colour: string): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  // (No fog on them: they are a measure, not part of the picture.)
  const material = new THREE.LineBasicNodeMaterial({ color: colour, fog: false, transparent: true, opacity: 0.85 });
  const out = new THREE.LineSegments(geometry, material);
  out.frustumCulled = false;
  return out;
}

/** The envelopes of these trees, as one group of lines to add to the scene. */
export function makeEnvelopes(trees: readonly Standing[]): THREE.Group {
  const e: number[] = [];
  const p: number[] = [];
  const k: number[] = [];
  for (const t of trees) {
    ellipsoid(e, t);
    profile(p, t);
    trunk(k, t);
  }
  const group = new THREE.Group();
  group.name = "envelopes";
  group.add(lines(e, "#ffd56b"), lines(p, "#ff6a3d"), lines(k, "#fffaf0"));
  return group;
}

/** Let the graphics card have the lines' memory back. */
export function disposeEnvelopes(group: THREE.Group) {
  for (const child of group.children) {
    if (!(child instanceof THREE.LineSegments)) continue;
    child.geometry.dispose();
    (child.material as THREE.Material).dispose();
  }
}
