// The bark sets' texture and the texel standing in for it until the photographs come (engine.ts `barkLayers`).
// three builds a texture's sampling into the shader from the texture there when the material is first drawn: with
// nearest filtering on both sides, a load of one texel, and its wrapping as code. The lab draws before the
// photographs come, the gallery waits for them; the stand-in had three's defaults (nearest, clamped), so in the lab
// the photographs were read texel by texel and clamped at the tile's edge wherever the bark ran past it, long
// vertical streaks up every stem close to, and in the gallery they were sampled as meant.
//
//   node --test test/barkTexture.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three/webgpu";
import { barkLayers } from "../src/engine.ts";

const sampling = (t: THREE.Texture) => ({ wrapS: t.wrapS, wrapT: t.wrapT, magFilter: t.magFilter, minFilter: t.minFilter, type: t.type, format: t.format, colorSpace: t.colorSpace, mips: t.generateMipmaps });

test("the stand-in texel is sampled as the bark sets that replace it", () => {
  const standIn = barkLayers(new Uint8Array([128, 128, 255, 255]), 1, 1);
  const sets = barkLayers(new Uint8Array(4 * 4 * 4 * 3), 4, 3);
  assert.deepEqual(sampling(standIn), sampling(sets));
});

test("the bark is filtered (not a load of one texel) and repeats round and up the wood", () => {
  const t = barkLayers(new Uint8Array([128, 128, 255, 255]), 1, 1);
  assert.ok(!(t.magFilter === THREE.NearestFilter && t.minFilter === THREE.NearestFilter), "not nearest on both sides");
  assert.equal(t.wrapS, THREE.RepeatWrapping);
  assert.equal(t.wrapT, THREE.RepeatWrapping);
});
