// The reference photographs (lab/REFERENCE.md), as the gallery reads them: every row is a species the
// package has, with at least one photograph of the whole tree, each a link with its credit.
//
//   pnpm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ALL_SPECIES } from "../src/index.ts";
import { readReferences } from "../lab/references.ts";

const refs = readReferences(readFileSync(new URL("../lab/REFERENCE.md", import.meta.url), "utf8"));

test("every row of REFERENCE.md is a species, with its photographs' links and credits", () => {
  assert.ok(refs.length >= 8, "the table is read");
  for (const r of refs) {
    assert.ok(ALL_SPECIES.some((s) => s.name === r.name), `${r.name} is not a species' name`);
    assert.ok(r.whole.length > 0, `${r.name} has no photograph of the whole tree`);
    for (const p of [...r.whole, ...r.foliage]) {
      assert.match(p.url, /^https:\/\//, `${r.name}: ${p.title}`);
      assert.ok(p.credit.length > 0 && !p.credit.includes("|"), `${r.name}: ${p.title} has no credit`);
      assert.ok(p.thumb, `${r.name}: ${p.title} is not a Commons file`);
    }
  }
});
