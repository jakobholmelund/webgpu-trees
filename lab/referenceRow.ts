// The reference row's pictures (lab/references/manifest.json, made by tools/references/build.mjs): the
// owner's AI-generated pictures of each species from the four views the gallery's reference row draws ours
// from (views.ts REF_VIEWS). Plain data, read here, so the gallery and the tests read it the same way.

export interface RefPicture {
  /** The set it belongs to: a species may have two (another tree of it). */
  set: string;
  /** The library's species it stands for, by name. */
  species: string;
  /** Its view, as the pictures name them: tee, 60m, under, foot. */
  view: string;
  /** Its file, in lab/references/. */
  file: string;
  /** The owner's original it was made from. */
  source: string;
  width: number;
  height: number;
}

export interface RefManifest {
  about: string;
  views: { name: string; gallery: string; label: string }[];
  sets: Record<string, { species: string; note: string }>;
  references: RefPicture[];
}

export interface RefSet {
  set: string;
  note: string;
  /** Its pictures by view (tee, 60m, under, foot); a view it lacks is not there. */
  pictures: Map<string, RefPicture>;
}

export function readManifest(text: string): RefManifest {
  return JSON.parse(text) as RefManifest;
}

/** A species' sets of reference pictures, in the manifest's order (none: an empty list). */
export function setsFor(m: RefManifest, species: string): RefSet[] {
  const out: RefSet[] = [];
  for (const [set, info] of Object.entries(m.sets)) {
    if (info.species !== species) continue;
    const pictures = new Map(m.references.filter((r) => r.set === set).map((r) => [r.view, r]));
    if (pictures.size > 0) out.push({ set, note: info.note, pictures });
  }
  return out;
}

/** The species the manifest has pictures of, by name. */
export function speciesWithReferences(m: RefManifest): Set<string> {
  return new Set(m.references.map((r) => r.species));
}
