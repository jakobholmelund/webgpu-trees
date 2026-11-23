// The package's walls (README.md):
//
//   src imports three and its own files, and nothing else;
//   lab imports three and the package's public face (src/index.ts) and its
//   own files, so the lab can do only what a stranger's project could.
//
//   pnpm test

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const LAB = join(ROOT, "lab");

/** Every module a file imports or re-exports from. */
function imports(file) {
  const text = readFileSync(file, "utf8");
  const found = [
    ...text.matchAll(/(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/g),
    ...text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
    ...text.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g),
  ];
  return found.map((m) => m[1]);
}

const sources = (dir) => readdirSync(dir, { recursive: true }).filter((f) => /\.(ts|mjs|js)$/.test(f)).map((f) => join(dir, f));
const isThree = (spec) => spec === "three" || spec.startsWith("three/");

test("the package imports only three and itself", () => {
  const files = sources(SRC);
  assert.ok(files.length >= 4, "src has its files");
  for (const file of files) {
    for (const spec of imports(file)) {
      if (isThree(spec)) continue;
      assert.ok(spec.startsWith("."), `${relative(ROOT, file)} imports ${spec}`);
      const to = resolve(dirname(file), spec);
      assert.ok(to.startsWith(SRC + "/"), `${relative(ROOT, file)} imports ${spec}, outside src`);
    }
  }
});

test("the lab reaches the package only through its public face", () => {
  const files = sources(LAB);
  assert.ok(files.length >= 2, "lab has its files");
  let usesPackage = false;
  for (const file of files) {
    for (const spec of imports(file)) {
      if (isThree(spec)) continue;
      assert.ok(spec.startsWith("."), `${relative(ROOT, file)} imports ${spec}`);
      const to = resolve(dirname(file), spec);
      if (to.startsWith(LAB + "/")) continue;
      assert.equal(to.replace(/\.ts$/, ""), join(SRC, "index"), `${relative(ROOT, file)} imports ${spec}: the lab may import only src/index.ts from outside itself`);
      usesPackage = true;
    }
  }
  assert.ok(usesPackage, "the lab imports the package");
});
