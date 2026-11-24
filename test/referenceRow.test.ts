// The gallery's reference row (lab/references): the owner's AI-generated reference pictures, as the gallery
// reads them from manifest.json. Every picture it names is there, and is of a species the library has, from
// one of the four views the row draws ours from; and none of them is in the package.
//
//   pnpm test

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { test } from "node:test";
import { ALL_SPECIES } from "../src/index.ts";
import { readManifest, setsFor, speciesWithReferences } from "../lab/referenceRow.ts";
import { REF_VIEWS } from "../lab/views.ts";

const dir = new URL("../lab/references/", import.meta.url);
const manifest = readManifest(readFileSync(new URL("manifest.json", dir), "utf8"));

test("every reference picture in the manifest is there, and is a species the library has, from one of the row's views", () => {
  assert.ok(manifest.references.length >= 40, "the manifest is read");
  const views = new Set(REF_VIEWS.map((v) => v.ref));
  const seen = new Set<string>();
  for (const r of manifest.references) {
    const file = new URL(r.file, dir);
    assert.ok(existsSync(file), `${r.file} is missing`);
    assert.ok(statSync(file).size > 1000, `${r.file} is empty`);
    assert.ok(ALL_SPECIES.some((s) => s.name === r.species), `${r.file}: ${r.species} is not a species' name`);
    assert.ok(views.has(r.view), `${r.file}: ${r.view} is not one of the row's views`);
    assert.equal(r.file, `${r.set}-${r.view}.avif`, `${r.file} is not named by its set and view`);
    assert.ok(manifest.sets[r.set], `${r.file}: its set ${r.set} is not listed`);
    assert.equal(manifest.sets[r.set].species, r.species, `${r.file}: not its set's species`);
    assert.ok(!seen.has(`${r.set}|${r.view}`), `${r.set} has two pictures of ${r.view}`);
    seen.add(`${r.set}|${r.view}`);
    // (Landscape for the views from the tee and the fairway, upright for those under it and at its foot.)
    const wide = REF_VIEWS.find((v) => v.ref === r.view)!.aspect > 1;
    assert.equal(r.width > r.height, wide, `${r.file} is not ${wide ? "landscape" : "portrait"}`);
    assert.ok(Math.max(r.width, r.height) <= 1024, `${r.file} is bigger than the row needs`);
  }
  // (And nothing in the folder that the manifest does not name.)
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".avif"))) assert.ok(manifest.references.some((r) => r.file === f), `${f} is not in the manifest`);
});

test("the reference row finds a species' sets by its name, and each set has all four views", () => {
  const torrey = setsFor(manifest, "Torrey pine");
  assert.equal(torrey.length, 1);
  assert.deepEqual([...torrey[0].pictures.keys()].sort(), ["60m", "foot", "tee", "under"]);
  assert.equal(setsFor(manifest, "Stone pine").length, 2, "the stone pine's two trees");
  assert.equal(setsFor(manifest, "Monterey pine").length, 0, "no pictures, no row");
  for (const name of speciesWithReferences(manifest)) for (const set of setsFor(manifest, name)) assert.equal(set.pictures.size, 4, `${set.set} lacks a view`);
});

test("the reference pictures are credited as AI-generated, and are not in the package", () => {
  const sources = readFileSync(new URL("SOURCES.md", dir), "utf8");
  assert.match(sources, /AI-generated/);
  assert.match(sources, /Nano Banana/);
  for (const set of Object.keys(manifest.sets)) assert.ok(sources.includes(`| ${set} |`), `${set} is not in SOURCES.md`);
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { files: string[] };
  for (const f of pkg.files) assert.ok(!"lab/references".startsWith(f.replace(/\/$/, "")) && !f.startsWith("lab"), `the package's files take in ${f}`);
});
