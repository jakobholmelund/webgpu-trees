// The painterly look's painted marks (assets/marks/, made by tools/marks/build.mjs): laid out cell for cell as
// the drawn marks are, every cell what the shader reads (a mass of leaves, a clear border, its tone where the
// shader expects it, its painted leaves each a number of its own), the files small, and every painting they
// are made from credited in SOURCES.md as AI-generated, not CC0, with its tool, date and whole prompt.
//
//   node --test test/marks.test.mjs

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { LEAF_SHARE, MARK_CELL, MARK_KINDS, PAINTERLY_COLS, SHEET_CELL, SHEET_COLS, SHEET_ROWS } from "../src/marks.ts";
import { PAINTED_KINDS, PAINTED_LEAF_SHARE } from "../src/paintedMarks.ts";
import { DATE, PAINTINGS, ROWS, SHEETS, TOOL } from "../tools/marks/recipe.mjs";

const at = (p) => new URL(`../assets/${p}`, import.meta.url);
const meta = JSON.parse(readFileSync(at("marks/marks.json"), "utf8"));

test("the painted atlases are laid out as the drawn ones, a row to each painted kind, the palms' fronds left drawn", () => {
  assert.equal(meta.painterly.cell, MARK_CELL);
  assert.equal(meta.painterly.cols, PAINTERLY_COLS);
  assert.equal(meta.painterly.rows, MARK_KINDS.length);
  assert.deepEqual([meta.sheets.cell, meta.sheets.cols, meta.sheets.rows], [SHEET_CELL, SHEET_COLS, SHEET_ROWS]);
  assert.deepEqual(Object.keys(meta.painterly.kinds).sort(), Object.keys(ROWS).sort());
  assert.deepEqual([...PAINTED_KINDS].sort(), Object.keys(ROWS).sort());
  assert.ok(!PAINTED_KINDS.includes("frond"), "a palm's fronds keep their drawn marks");
  for (const [kind, k] of Object.entries(meta.painterly.kinds)) {
    assert.equal(k.row, MARK_KINDS.indexOf(kind), kind);
    assert.equal(k.cells.length, PAINTERLY_COLS, kind);
  }
  assert.equal(meta.sheets.columns.length, SHEETS.length);
});

test("the files are AVIF, and small", () => {
  let total = 0;
  for (const f of ["marks/painterly.avif", "marks/sheets.avif"]) {
    assert.ok(existsSync(at(f)), `${f} missing`);
    assert.equal(readFileSync(at(f)).subarray(4, 12).toString("latin1"), "ftypavif", `${f} is not AVIF`);
    const n = statSync(at(f)).size;
    assert.ok(n > 50_000 && n < 1_400_000, `${f}: ${n} bytes`);
    total += n;
  }
  assert.ok(total < 2_000_000, `${(total / 1e6).toFixed(2)} MB`);
});

/** What every cell is held to, as test/styles.test.ts holds the drawn marks. */
function heldTo(c, at, { cover = [0.2, 0.75], tone = [0.6, 1] } = {}) {
  assert.ok(c.cover > cover[0] && c.cover < cover[1], `${at}: covers ${c.cover}`);
  assert.equal(c.border, 0, `${at}: its border is clear, so the mips of one cell do not bleed into the next`);
  assert.ok(c.tone > tone[0] && c.tone < tone[1], `${at}: tone ${c.tone}`);
  assert.ok(c.owns >= 8, `${at}: ${c.owns} leaves' numbers`);
}

test("every painted cluster is a mass of leaves of their own, toned as the shader expects (as decoded at build)", () => {
  for (const [kind, k] of Object.entries(meta.painterly.kinds)) k.cells.forEach((c, col) => heldTo(c, `${kind}, cluster ${col}`));
  for (const [col, s] of meta.sheets.columns.entries()) {
    heldTo(s.top, `sheet ${col}, top`, { cover: [0.15, 0.75] });
    heldTo(s.under, `sheet ${col}, underside`, { cover: [0.15, 0.75], tone: [0.5, 1] });
    assert.equal(s.top.cover, s.under.cover, "a bough's underside has its top's outline");
    assert.ok(s.under.tone < s.top.tone, "and is darker");
  }
});

test("each painted kind's leaf is no bigger than the drawn one's, and the shader is told it", () => {
  for (const kind of MARK_KINDS) {
    const s = PAINTED_LEAF_SHARE[kind];
    assert.ok(s > 0.05 && s <= LEAF_SHARE[kind] + 1e-9, `${kind}: ${s}`);
    if (meta.painterly.leafShare[kind] !== undefined) assert.equal(s, meta.painterly.leafShare[kind]);
  }
  // (Finer densities, smaller leaves: each cell's leaf about its density's share of the coarsest's.)
  for (const [kind, k] of Object.entries(meta.painterly.kinds)) {
    const coarse = k.cells.slice(0, 3).reduce((a, c) => a + c.leafShare, 0) / 3;
    const finest = k.cells.slice(6).reduce((a, c) => a + c.leafShare, 0) / 3;
    assert.ok(finest < coarse * 0.6, `${kind}: finest ${finest}, coarsest ${coarse}`);
  }
});

test("every painting used is credited in SOURCES.md: AI-generated, not CC0, its tool, date and whole prompt", () => {
  const md = readFileSync(at("SOURCES.md"), "utf8");
  const prompts = readFileSync(new URL("../tools/ai-textures/PROMPTS.md", import.meta.url), "utf8");
  const used = new Set([...Object.values(ROWS).flatMap((r) => r.densities.flat()), ...SHEETS.flatMap((s) => s.sides)]);
  assert.deepEqual(meta.sources.map((s) => s.id).sort(), [...used].sort());
  for (const id of used) {
    const p = PAINTINGS[id];
    const line = md.split("\n").find((l) => l.includes(`\`${p.file}\``));
    assert.ok(line, `${p.file} is not credited`);
    assert.ok(line.includes("AI-generated, not CC0") && line.includes(TOOL) && line.includes(DATE), `${p.file}: ${line.slice(0, 120)}`);
    assert.ok(line.includes(p.prompt), `${p.file}: its whole prompt`);
    // (The prompt as PROMPTS.md gives it: its first sentences word for word.)
    assert.ok(prompts.includes(p.prompt.split(". ").slice(0, 2).join(". ")), `${p.file}: its prompt is PROMPTS.md's`);
  }
});

const avifdec = (() => {
  try {
    execFileSync("avifdec", ["--version"], { stdio: "ignore" });
    execFileSync("magick", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

test("the files decode to what marks.json says of them", { skip: !avifdec && "needs avifdec and ImageMagick" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "marks-test-"));
  try {
    const read = (f, w, h) => {
      const png = join(dir, "x.png");
      execFileSync("avifdec", ["--depth", "8", at(f).pathname, png], { stdio: "ignore" });
      const buf = execFileSync("magick", [png, "-depth", "8", "rgba:-"], { maxBuffer: 1 << 30 });
      assert.equal(buf.length, w * h * 4, f);
      return buf;
    };
    const cellOf = (px, width, cell, col, row) => {
      let drawn = 0;
      let border = 0;
      let blue = 0;
      const owns = new Set();
      for (let j = 0; j < cell; j++)
        for (let i = 0; i < cell; i++) {
          const o = ((row * cell + j) * width + col * cell + i) * 4;
          if (px[o + 3] > 127) ((drawn += 1), owns.add(px[o + 1] >> 4));
          if ((i < 2 || j < 2 || i >= cell - 2 || j >= cell - 2) && px[o + 3] > 0) border++;
          blue = Math.max(blue, px[o + 2]);
        }
      return { cover: drawn / (cell * cell), border, owns: owns.size, blue };
    };
    const W = MARK_CELL * PAINTERLY_COLS;
    const px = read("marks/painterly.avif", W, MARK_CELL * MARK_KINDS.length);
    for (const [kind, k] of Object.entries(meta.painterly.kinds))
      k.cells.forEach((c, col) => {
        const d = cellOf(px, W, MARK_CELL, col, k.row);
        assert.ok(Math.abs(d.cover - c.cover) < 0.002 && d.border === c.border && d.owns === c.owns, `${kind} ${col}`);
        // (Blue is a sprig's, which a painted cluster is not: the shader lightens a mark by it. A few levels of the
        // encoder's ringing, a percent of light at most.)
        assert.ok(d.blue <= 8, `${kind} ${col}: blue ${d.blue}`);
      });
    const SW = SHEET_CELL * SHEET_COLS;
    const sp = read("marks/sheets.avif", SW, SHEET_CELL * SHEET_ROWS);
    meta.sheets.columns.forEach((s, col) => assert.ok(Math.abs(cellOf(sp, SW, SHEET_CELL, col, 0).cover - s.top.cover) < 0.002, `sheet ${col}`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
