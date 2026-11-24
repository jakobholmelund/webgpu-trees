// The painterly look's painted marks: its leaf clusters and its conifers' boughs laid from hand-painted
// pictures (assets/marks/, made by tools/marks/build.mjs; assets/SOURCES.md says from which), in place of the
// marks src/marks.ts draws by arithmetic. The same layout, cell for cell, so the shader reads them as it reads
// those: red each mark's tone, green each painted leaf's own number, alpha coverage.
//
// Fetched once a page, whichever trees ask first, and kept: until they come (or when they cannot be had, or
// `scans: false`), the trees are drawn with the drawn marks.

import meta from "../assets/marks/marks.json" with { type: "json" };
import { LEAF_SHARE, MARK_CELL, MARK_KINDS, PAINTERLY_COLS, SHEET_CELL, SHEET_COLS, SHEET_ROWS, painterlyAtlasPixels } from "./marks.ts";
import { type Pixels } from "./mips.ts";
import { assetUrl, decode } from "./scans.ts";

type Kind = (typeof MARK_KINDS)[number];
const M = meta as unknown as { painterly: { cell: number; cols: number; rows: number; leafShare: Partial<Record<Kind, number>>; kinds: Partial<Record<Kind, { row: number; upright: boolean }>> }; sheets: { cell: number; cols: number; rows: number } };

/** The kinds of leaf the paintings cover (the rest, a palm's fronds, keep their drawn marks). */
export const PAINTED_KINDS: readonly Kind[] = MARK_KINDS.filter((k) => M.painterly.kinds[k]);

/**
 * Each kind's leaf at the coarsest density in the painted marks, a share of a mark's half width (as
 * `LEAF_SHARE` for the drawn ones): a painted cluster holds more, smaller leaves than a drawn one.
 */
export const PAINTED_LEAF_SHARE: Readonly<Record<Kind, number>> = Object.fromEntries(MARK_KINDS.map((k) => [k, M.painterly.leafShare[k] ?? LEAF_SHARE[k]])) as Record<Kind, number>;

if (M.painterly.cell !== MARK_CELL || M.painterly.cols !== PAINTERLY_COLS || M.painterly.rows !== MARK_KINDS.length || M.sheets.cell !== SHEET_CELL || M.sheets.cols !== SHEET_COLS || M.sheets.rows !== SHEET_ROWS) {
  throw new Error("webgpu-trees: assets/marks/ was built for another layout of the marks; run tools/marks/build.mjs");
}

let loading: Promise<{ painterly: Pixels; sheets: Pixels }> | null = null;

/**
 * The painted atlases' texels, RGBA8, as src/marks.ts's: the painterly atlas (its unpainted rows the drawn
 * marks') and the sheet atlas.
 */
export function loadPaintedMarks(): Promise<{ painterly: Pixels; sheets: Pixels }> {
  if (!loading) {
    loading = (async () => {
      // (Written out whole, so a bundler sees each file and copies it.)
      const [painted, sheets] = await Promise.all([
        decode(assetUrl("marks/painterly.avif", new URL("../assets/marks/painterly.avif", import.meta.url).href)),
        decode(assetUrl("marks/sheets.avif", new URL("../assets/marks/sheets.avif", import.meta.url).href)),
      ]);
      const drawn = painterlyAtlasPixels();
      if (painted.width !== drawn.width || painted.height !== drawn.height) throw new Error(`painted marks ${painted.width} x ${painted.height}, not ${drawn.width} x ${drawn.height}`);
      // (The kinds with no paintings keep the drawn rows.)
      const rowBytes = drawn.width * MARK_CELL * 4;
      for (const k of PAINTED_KINDS) {
        const row = MARK_KINDS.indexOf(k);
        drawn.data.set(painted.data.subarray(row * rowBytes, (row + 1) * rowBytes), row * rowBytes);
      }
      return { painterly: drawn, sheets };
    })();
    loading.catch(() => (loading = null));
  }
  return loading;
}
