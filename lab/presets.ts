// The lab's presets: what it keeps and hands out, and reading one back from JSON. Pure, so the tests read
// them as the lab does (test/presets.test.ts).

import {
  type Architecture,
  type CrownShape,
  DEFAULT_DETAIL,
  DEFAULT_STYLE,
  DEFAULT_VARIANT_OPTIONS,
  LOOK_STYLES,
  OPTIONAL_SPECIES_FIELDS,
  type SpeciesFieldKind,
  STARTER_SPECIES,
  TREE_LOOKS,
  type TreeDetail,
  type TreeLook,
  type TreeSpecies,
  type TreeStyle,
  type VariantOptions,
  checkSpecies,
  cloneSpecies,
  isSpeciesFieldKind,
} from "../src/index.ts";

/** What the lab keeps and hands out: everything set here that is not where the eye is. */
export interface Preset {
  version: 1;
  /** The look the style is for (left out: the painted look). */
  look?: TreeLook;
  species: TreeSpecies[];
  style: TreeStyle;
  detail: TreeDetail;
  variants: VariantOptions;
}

export const ARCHITECTURES: Architecture[] = ["broadleaf", "conifer", "shrub", "palm"];
export const SHAPES: CrownShape[] = ["conical", "spherical", "hemispherical", "cylindrical", "taperedCylindrical", "flame", "inverseConical", "tendFlame"];

const OPTIONAL: Record<string, SpeciesFieldKind> = OPTIONAL_SPECIES_FIELDS;

/**
 * What is wrong with a species read from JSON, or null: every field a species must have there and of its kind,
 * each it may leave out (`OPTIONAL_SPECIES_FIELDS`) left out or of its kind, then the package's own check.
 */
export function speciesProblem(value: unknown, i: number): string | null {
  if (typeof value !== "object" || value === null) return `species ${i + 1} is not an object`;
  const o = value as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : `species ${i + 1}`;
  // (The fields every species has, as the first starter has them.)
  for (const [key, like] of Object.entries(STARTER_SPECIES[0])) {
    if (key in OPTIONAL) continue;
    if (typeof o[key] !== typeof like) return `${name}: ${key} is missing or not a ${typeof like}`;
  }
  for (const [key, kind] of Object.entries(OPTIONAL)) {
    if (o[key] === undefined || isSpeciesFieldKind(o[key], kind)) continue;
    const want = typeof kind !== "string" ? `one of ${kind.join(", ")}` : kind === "pair" ? "two numbers" : kind === "strings" ? "a list of strings" : `a ${kind}`;
    return `${name}: ${key} must be ${want}, or left out`;
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
export function readPreset(value: unknown): Preset | string {
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

/**
 * A kept preset's species brought up to the package's: a species it knows by name takes every field added
 * since it was kept (a palm's leaf and pruning, a limb's curve) that it leaves out, and the package's
 * species it has not heard of are added after its own. Everything it does set stays as it was set.
 * Without this a preset kept before a field existed grows its trees without it: a fan palm with no fan.
 */
export function upToDate(kept: TreeSpecies[], starters: readonly TreeSpecies[]): TreeSpecies[] {
  const byName = new Map(starters.map((s) => [s.name, s]));
  const out = kept.map((s) => {
    const starter = byName.get(s.name);
    if (!starter) return cloneSpecies(s);
    const filled = cloneSpecies(s) as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(cloneSpecies(starter))) if (!(key in filled)) filled[key] = value;
    return filled as unknown as TreeSpecies;
  });
  const names = new Set(kept.map((s) => s.name));
  for (const s of starters) if (!names.has(s.name)) out.push(cloneSpecies(s));
  return out;
}
