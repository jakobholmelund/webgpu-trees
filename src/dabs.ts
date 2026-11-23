// The shapes a stylized crown's dabs take: four brush marks, made here by
// arithmetic from nothing (no picture is loaded), two to a side in one
// texture. A mark's outline is a rounded blob with lobes and a ragged edge;
// inside it, the strokes of the brush, a little lighter and darker.
//
// Its transparency is its outline. The dabs are drawn with alpha to coverage,
// so a mark's edge is smooth wherever the canvas has samples to spare, and
// a far mark (a small mip) covers as much of its pixels as it should.

import * as THREE from "three/webgpu";
import { hash01 } from "./variants.ts";

const CELL = 128;

/** The atlas: `cells` marks to a side, each `CELL` texels square. */
export function makeDabAtlas(): THREE.DataTexture {
  const side = CELL * 2;
  const data = new Uint8Array(side * side * 4);
  for (let m = 0; m < 4; m++) {
    const ox = (m % 2) * CELL;
    const oy = Math.floor(m / 2) * CELL;
    // (Lobes: a few broad ones and some smaller, at angles of the mark's own.)
    const lobes: [number, number, number][] = [];
    for (let k = 0; k < 7; k++) lobes.push([2 + k, (0.07 / (1 + k * 0.4)) * (0.6 + hash01(m * 17 + k, 1)), hash01(m * 17 + k, 2) * Math.PI * 2]);
    const strokeAngle = hash01(m, 3) * Math.PI;
    for (let j = 0; j < CELL; j++) {
      for (let i = 0; i < CELL; i++) {
        const x = ((i + 0.5) / CELL) * 2 - 1;
        const y = ((j + 0.5) / CELL) * 2 - 1;
        const r = Math.hypot(x, y);
        const a = Math.atan2(y, x);
        let edge = 0.74;
        for (const [k, amp, ph] of lobes) edge += amp * Math.cos(k * a + ph);
        // (A ragged edge: fine bumps, as a dry brush leaves.)
        edge += 0.025 * Math.sin(a * 23 + m * 5) + 0.018 * Math.sin(a * 41 + m * 2);
        const px = 1 / CELL;
        const alpha = Math.min(1, Math.max(0, (edge - r) / (px * 2.5) + 0.5));
        // (The strokes: bands across the mark at its own angle, uneven.)
        const along = x * Math.cos(strokeAngle) + y * Math.sin(strokeAngle);
        const across = -x * Math.sin(strokeAngle) + y * Math.cos(strokeAngle);
        const stroke = 0.5 + 0.5 * Math.sin(across * 26 + Math.sin(along * 3 + m) * 2.2);
        // (Lighter towards the mark's upper side, as a dab of paint catches the light on its ridge.)
        const ridge = 0.5 + 0.5 * Math.min(1, Math.max(-1, -y * 0.8 + x * 0.2));
        const tone = 0.8 + 0.1 * stroke + 0.12 * ridge - 0.08 * r;
        const o = ((oy + j) * side + ox + i) * 4;
        const t = Math.round(Math.min(1, Math.max(0, tone)) * 255);
        data[o] = t;
        data[o + 1] = t;
        data[o + 2] = t;
        data[o + 3] = Math.round(alpha * 255);
      }
    }
  }
  const tex = new THREE.DataTexture(data, side, side, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}
