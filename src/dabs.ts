// The shapes a stylized crown's dabs take: four brush marks, made here by
// arithmetic from nothing (no picture is loaded), two to a side in one
// texture. Each mark is a spray of a few small dabs of paint gathered into
// one, as a painter lays a clump of leaves: from far off it is one shape,
// close to it is a handful, each a little lighter on its upper side.
//
// Its transparency is its outline. The dabs are drawn with alpha to coverage,
// so a mark's edge is smooth wherever the canvas has samples to spare, and
// a far mark (a small mip) covers as much of its pixels as it should.

import * as THREE from "three/webgpu";
import { hash01 } from "./variants.ts";

const CELL = 128;

/** The atlas: four marks, two to a side, each `CELL` texels square. */
export function makeDabAtlas(): THREE.DataTexture {
  const side = CELL * 2;
  const data = new Uint8Array(side * side * 4);
  for (let m = 0; m < 4; m++) {
    const ox = (m % 2) * CELL;
    const oy = Math.floor(m / 2) * CELL;
    // (The small dabs: one broad one at the middle and five to seven about it, filling the mark's disc
    // without leaving its middle open.)
    const parts: { x: number; y: number; r: number; lobes: [number, number, number][]; tone: number }[] = [];
    const count = 6 + Math.floor(hash01(m, 1) * 3);
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + hash01(m * 31 + k, 2) * 0.9;
      const d = k === 0 ? 0 : 0.36 + hash01(m * 31 + k, 3) * 0.22;
      const r = k === 0 ? 0.44 : 0.27 + hash01(m * 31 + k, 4) * 0.1;
      const lobes: [number, number, number][] = [];
      for (let q = 0; q < 4; q++) lobes.push([3 + q, (0.07 / (1 + q * 0.5)) * (0.5 + hash01(m * 97 + k * 7 + q, 5)), hash01(m * 97 + k * 7 + q, 6) * Math.PI * 2]);
      parts.push({ x: k === 0 ? 0 : Math.cos(a) * d, y: k === 0 ? 0 : Math.sin(a) * d, r, lobes, tone: 0.9 + hash01(m * 31 + k, 7) * 0.2 });
    }
    const px = 2 / CELL;
    for (let j = 0; j < CELL; j++) {
      for (let i = 0; i < CELL; i++) {
        const x = ((i + 0.5) / CELL) * 2 - 1;
        const y = ((j + 0.5) / CELL) * 2 - 1;
        let tone = 0;
        // (The small dab that covers this texel most, and how far inside its own edge the texel is.)
        let best = -Infinity;
        for (const p of parts) {
          const dx = (x - p.x) / p.r;
          const dy = (y - p.y) / p.r;
          const rr = Math.hypot(dx, dy);
          const a = Math.atan2(dy, dx);
          let edge = 1;
          for (const [k, amp, ph] of p.lobes) edge += amp * Math.cos(k * a + ph);
          edge += 0.04 * Math.sin(a * 17 + m * 3);
          const inside = (edge - rr) * p.r;
          if (inside > best) {
            best = inside;
            // (Each small dab lighter on its upper side and towards its middle: the ridge of the paint.)
            const ridge = 0.5 + 0.5 * Math.max(-1, Math.min(1, -dy * 0.8 + dx * 0.2));
            tone = p.tone * (0.74 + 0.18 * ridge + 0.1 * (1 - Math.min(1, rr)));
          }
        }
        const alpha = Math.min(1, Math.max(0, best / (px * 1.25) + 0.5));
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
