// Download the scans recipe.mjs lists, each into its own folder under <raw>, ready for build.mjs. Files
// already there are kept. Only the CC0 publishers' own download links are used.
//
//   node tools/scans/fetch.mjs <raw>

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BARK, LEAVES, SOURCES } from "./recipe.mjs";

const raw = process.argv[2];
if (!raw) {
  console.error("usage: node tools/scans/fetch.mjs <raw>");
  process.exit(1);
}

async function get(url, file) {
  if (existsSync(file) && statSync(file).size > 0) return;
  const res = await fetch(url, { headers: { "user-agent": "webgpu-trees scan fetch" } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`  ${file} (${(statSync(file).size / 1e6).toFixed(1)} MB)`);
}

const used = new Set([...BARK, ...LEAVES].map((s) => s.source));
for (const key of used) {
  const s = SOURCES[key];
  const dir = join(raw, key);
  mkdirSync(dir, { recursive: true });
  console.log(`${key}: ${s.site} ${s.id}`);
  if (s.zip) {
    const zip = join(dir, `${s.id}_${s.res}-JPG.zip`);
    await get(s.zip, zip);
    execFileSync("unzip", ["-q", "-o", zip, "*.jpg", "-d", dir]);
  } else {
    for (const [m, url] of Object.entries(s.files)) await get(url, join(dir, s.map(m)));
  }
}
