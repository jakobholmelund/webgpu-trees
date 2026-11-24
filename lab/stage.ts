// What the lab and the gallery set their trees in: the sun at an hour, the light's colours for it, a sky
// and a plain lit ground. One place, so a tree in the gallery is lit as it is in the lab.

import * as THREE from "three/webgpu";
import { dot, float, max, mix, normalize, positionGeometry, positionWorld, pow, smoothstep, uniform, vec3 } from "three/tsl";
import { type Trees } from "../src/index";

/** The sky's colour at the horizon, for the scene's background and fog. */
export const SKY = "#c9d8e3";

/** Where the sun is at an hour of a summer's day at 50 degrees north (a direction towards it). */
export function sunAt(hour: number): THREE.Vector3 {
  const decl = THREE.MathUtils.degToRad(20);
  const lat = THREE.MathUtils.degToRad(50);
  const ha = THREE.MathUtils.degToRad((hour - 12) * 15);
  const up = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const east = -Math.cos(decl) * Math.sin(ha);
  const north = Math.cos(lat) * Math.sin(decl) - Math.sin(lat) * Math.cos(decl) * Math.cos(ha);
  return new THREE.Vector3(east, up, -north).normalize();
}

/**
 * The light's colours for a sun at this height, as the grass lab has them: white and high at noon, warmer
 * and lower at either end of the day. A sun above about 32 degrees gives a clear morning's light.
 */
export function tintsFor(sun: THREE.Vector3, sunTint: THREE.Vector3, shadeTint: THREE.Vector3) {
  const elevation = THREE.MathUtils.radToDeg(Math.asin(Math.min(1, Math.max(-1, sun.y))));
  const low = 1 - Math.min(1, Math.max(0, (elevation - 5) / 27));
  const s = low * low * (3 - 2 * low);
  sunTint.set(1.14 + 0.2 * s, 1.04 - 0.12 * s, 0.86 - 0.3 * s);
  shadeTint.set(0.6 - 0.08 * s, 0.7 - 0.1 * s, 0.88 - 0.04 * s);
}

/** The sky: pale at the horizon, bluer overhead. */
export function makeSky(): THREE.Mesh {
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, fog: false, depthWrite: false });
  const up = normalize(positionGeometry);
  mat.colorNode = mix(vec3(0.79, 0.85, 0.89), vec3(0.37, 0.58, 0.81), pow(smoothstep(float(0), float(0.75), up.y), float(0.6)));
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), mat);
  sky.renderOrder = -1;
  return sky;
}

/**
 * The ground: flat, mown grass, lit by the same sun and in the same light's colours as the leaves, and in
 * the trees' shade where they cast it (the package's `sunAt`, from its `bakeShade`): so its material is
 * made again for each making of the trees (`materialFor`). The sun and the tints are the host's to set.
 */
export function makeGround() {
  const uSun = uniform(new THREE.Vector3(0, 1, 0));
  const uSunTint = uniform(new THREE.Vector3(1.14, 1.04, 0.86));
  const uShadeTint = uniform(new THREE.Vector3(0.6, 0.7, 0.88));
  const materialFor = (t: Trees | null) => {
    const mat = new THREE.MeshBasicNodeMaterial();
    const lit = max(dot(vec3(0, 1, 0), uSun), float(0));
    const sunLeft = t ? t.sunAt(positionWorld.xz) : float(1);
    mat.colorNode = vec3(0.16, 0.25, 0.09).mul(mix(uShadeTint, uSunTint, lit.mul(sunLeft)));
    return mat;
  };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000).rotateX(-Math.PI / 2), materialFor(null));
  return { mesh, uSun, uSunTint, uShadeTint, materialFor };
}

/**
 * The sun at an hour, but standing to the left of an eye that looks along -z (as every gallery view does):
 * the reference pictures' clear morning with a low sun from the left. The morning's sun mirrored east to
 * west, so it is as high and as far round as at that hour.
 */
export function sunFromLeft(hour: number): THREE.Vector3 {
  const s = sunAt(hour);
  s.x = -Math.abs(s.x);
  return s;
}
