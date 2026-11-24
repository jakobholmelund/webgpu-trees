// Make the gallery's reference row from the owner's AI-generated reference pictures: each one resized to
// 1024 pixels on its long side and written as AVIF to lab/references/<set>-<view>.avif, with
// lab/references/manifest.json saying what each is (the library's species it stands for, its view, its size).
// The raw pictures stay out of the repository (tools/ai-references/raw/ is ignored); these are for the lab
// and the gallery only, and are not in the package's `files`.
//
//   node tools/references/build.mjs <raw folder>
//
// A set is a species' four views: `<set>-tee`, `-60m`, `-under`, `-foot`, as .png or .webp. A set missing
// a view is written with the views it has.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MAGICK = process.env.MAGICK ?? "magick";
const AVIFENC = process.env.AVIFENC ?? "avifenc";
const LONG = 1024;
const QUALITY = 58;

/** The sets, by their file names' stem: the library's species each stands for, and what was asked of it. */
export const SETS = {
  // (Its 60 m picture is the nearer of the two and its tee picture the further: given the other way round.)
  "stone-pine": { species: "Stone pine", note: "checked against real photographs by the owner; its tee and 60 m pictures were named the other way round", from: { tee: "60m", "60m": "tee" } },
  "stone-pine-2": { species: "Stone pine", note: "a second tree, generated again (its foot and under pictures much like the first set's)" },
  "torrey-pine": { species: "Torrey pine", note: "as it grows on the California coast" },
  "monterey-cypress": { species: "Monterey cypress", note: "an old coastal tree with flat-topped wind-shaped foliage" },
  eucalyptus: { species: "Eucalyptus", note: "" },
  "coast-live-oak": { species: "Coast live oak", note: "" },
  "california-sycamore": { species: "California sycamore", note: "" },
  "mexican-fan-palm": { species: "Mexican fan palm", note: "a tall skinned palm as kept on golf courses" },
  "canary-date-palm": { species: "Canary date palm", note: "its leaf bases trimmed into a pineapple shape" },
  "silver-birch": { species: "Silver birch", note: "" },
  beech: { species: "Beech", note: "" },
  oak: { species: "Oak", note: "a large open-grown parkland oak" },
  "scots-pine": { species: "Scots pine", note: "a mature tree with a long orange upper stem and a flat-topped crown" },
};
/** The views, in the gallery's order, and the gallery's view each is set beside. */
export const REF_VIEWS = [
  { name: "tee", gallery: "tee", label: "25 m, eye height" },
  { name: "60m", gallery: "fairway", label: "60 m, eye height" },
  { name: "under", gallery: "under", label: "under the crown, looking straight up" },
  { name: "foot", gallery: "trunk", label: "the lower 2 m of the trunk from 3 m" },
];

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const raw = process.argv[2];
if (raw) build(raw);

function build(rawDir) {
  const out = join(root, "lab/references");
  mkdirSync(out, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), "refs-"));
  const files = readdirSync(rawDir);
  const entries = [];
  try {
    for (const [set, info] of Object.entries(SETS)) {
      for (const view of REF_VIEWS) {
        const stem = `${set}-${info.from?.[view.name] ?? view.name}`;
        const src = ["png", "webp", "jpg"].map((x) => `${stem}.${x}`).find((f) => files.includes(f));
        if (!src) continue;
        const png = join(tmp, `${set}-${view.name}.png`);
        // (Resized in linear light, sharpened a little after, its profile and metadata left out.)
        execFileSync(MAGICK, [join(rawDir, src), "-colorspace", "RGB", "-resize", `${LONG}x${LONG}>`, "-colorspace", "sRGB", "-unsharp", "0x0.6+0.4+0", "-strip", png]);
        const file = `${set}-${view.name}.avif`;
        execFileSync(AVIFENC, ["-j", "1", "-s", "4", "-q", String(QUALITY), "--yuv", "420", "--ignore-exif", "--ignore-xmp", png, join(out, file)], { stdio: "ignore" });
        const [w, h] = execFileSync(MAGICK, ["identify", "-format", "%w %h", png]).toString().trim().split(" ").map(Number);
        entries.push({ set, species: info.species, view: view.name, file, source: src, width: w, height: h, bytes: statSync(join(out, file)).size });
        console.log(`${file}  ${w}×${h}  ${(statSync(join(out, file)).size / 1024).toFixed(0)} KB`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  const manifest = {
    about: "AI-generated reference pictures (Nano Banana, in the Antigravity app), made by the owner on 2026-11-25; see SOURCES.md. Not photographs, not CC0; for the lab and the gallery only.",
    views: REF_VIEWS,
    sets: Object.fromEntries(Object.entries(SETS).filter(([s]) => entries.some((e) => e.set === s)).map(([s, { from, ...info }]) => [s, info])),
    references: entries.map(({ bytes, ...e }) => e),
  };
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const total = entries.reduce((a, e) => a + e.bytes, 0);
  console.log(`${entries.length} pictures, ${(total / 1e6).toFixed(2)} MB`);
  if (!existsSync(join(out, "SOURCES.md"))) console.warn("lab/references/SOURCES.md is missing");
}
