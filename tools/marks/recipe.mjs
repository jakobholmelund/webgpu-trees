// What the painterly look's painted marks are made from: hand-painted leaf clusters and boughs, generated for
// this project (AI-generated, not CC0, owner-approved), and which of them each row of the atlas is laid from.
// build.mjs turns them into assets/marks/; assets/SOURCES.md credits each (its section written by the build).
//
// The pictures lie in tools/ai-textures/raw/ (gitignored); their prompts are tools/ai-textures/PROMPTS.md's.

export const TOOL = "Antigravity / gemini-3.8-flash image";
export const DATE = "2026-11-24";

const BROAD =
  "A hand-painted stylized leaf cluster for a game tree, on a pure flat magenta #FF00FF background, square. A lumpy rounded clump of about 30 crisp oval broadleaf leaves (like oak, beech or lime), overlapping in two or three lobes, leaf tips standing out around the whole outline; warm yellow-green on the sunlit top, cooler teal-green in the shade beneath, soft painted gradients, a few lighter rim leaves. Flat orthographic, centred, filling about 80 percent of the frame with a clear margin, no stems, no outlines, no text.";
const PROMPTS = {
  broad: BROAD,
  broadC: `${BROAD} Lopsided, one lobe larger.`,
  dense: `${BROAD} Same as above but about 120 much smaller leaves in the clump, the outline still ragged with leaf tips; for far trees.`,
  small:
    "A hand-painted stylized leaf cluster for a game tree, on a pure flat magenta #FF00FF background, square. A loose airy clump of about 60 small diamond and oval leaves on fine drooping shoots, some sky gaps through it, leaves hanging down at the bottom edge; light fresh yellow-green on top, teal-green beneath, soft painted gradients. Flat orthographic, centred, about 80 percent of the frame with a margin, no outlines, no text.",
  narrow:
    "A hand-painted stylized leaf cluster for a game tree, on a pure flat magenta #FF00FF background, square. A drooping spray of about 40 long narrow lance-shaped leaves hanging from thin arching shoots, like a willow or eucalyptus, the lower edge a fringe of hanging leaf tips; silvery blue-green on top, deeper teal beneath, soft painted gradients. Flat orthographic, centred, about 80 percent of the frame with a margin, no outlines, no text.",
  pine: "A hand-painted stylized pine branch tip for a game tree, on a pure flat magenta #FF00FF background, square. Three short upturned shoots, each ending in a dense brush-like tuft of long straight needles radiating forward and up like a bottle brush, a little bare brown twig showing between them; dark blue-green needles, lighter where lit on top, teal beneath, soft painted gradients. Flat orthographic, centred, about 80 percent of the frame with a margin, no outlines, no text.",
  fir: "A hand-painted stylized fir bough for a game conifer, painterly Firewatch-like style, on a pure flat magenta #FF00FF background, wide 2:1. One level spruce branch seen from the side and slightly above: a thin brown branch axis running left to right, dense fringes of short needles hanging down and outward along it, lighter blue-green on top, darker teal underneath, drooping slightly toward the tip, ragged painted underside. Flat orthographic, the whole bough inside the frame with a margin, no outlines, no text.",
  scale:
    "A hand-painted stylized cedar bough for a game conifer, on a pure flat magenta #FF00FF background, wide 2:1. A drooping branch with flat hanging fern-like sprays of tiny scale leaves, like a western red cedar, the sprays hanging in soft layered curtains below a thin brown axis that curves down then up at the tip (a J-curve); fresh yellow-green on top, dark teal beneath, soft painted gradients. Flat orthographic, inside the frame with a margin, no outlines, no text.",
};

/**
 * Each painting: its file, what it is, its prompt, and about how long one of its leaves is in its own texels
 * (a guess the segmentation starts from; the build measures them).
 */
const painting = (file, title, prompt, leafPx, extra = {}) => ({ file, title, prompt, leafPx, ...extra });
/** A bough's: its darker sprays, painted behind, left out below this tone. */
const BOUGH = { dropBehind: 0.6 };
export const PAINTINGS = {
  "broad-a-1": painting("painterly-broad-a-1.jpg", "Painted broadleaf cluster (a)", PROMPTS.broad, 150),
  "broad-a-2": painting("painterly-broad-a-2.jpg", "Painted broadleaf cluster (a, second)", PROMPTS.broad, 150),
  "broad-b-1": painting("painterly-broad-b-1.jpg", "Painted broadleaf cluster (b)", PROMPTS.broad, 150),
  "broad-b-2": painting("painterly-broad-b-2.jpg", "Painted broadleaf cluster (b, second)", PROMPTS.broad, 150),
  "broad-c-1": painting("painterly-broad-c-1.jpg", "Painted broadleaf cluster, lopsided (c)", PROMPTS.broadC, 150),
  "broad-c-2": painting("painterly-broad-c-2.jpg", "Painted broadleaf cluster, lopsided (c, second)", PROMPTS.broadC, 150),
  "broad-dense-1": painting("painterly-broad-dense-1.jpg", "Painted broadleaf cluster, dense", PROMPTS.dense, 60),
  "broad-dense-2": painting("painterly-broad-dense-2.jpg", "Painted broadleaf cluster, dense (second)", PROMPTS.dense, 60),
  "small-a-1": painting("painterly-small-a-1.jpg", "Painted small-leaved cluster (a)", PROMPTS.small, 60),
  "small-a-2": painting("painterly-small-a-2.jpg", "Painted small-leaved cluster (a, second)", PROMPTS.small, 60),
  "small-b-1": painting("painterly-small-b-1.jpg", "Painted small-leaved cluster (b)", PROMPTS.small, 60),
  "small-b-2": painting("painterly-small-b-2.jpg", "Painted small-leaved cluster (b, second)", PROMPTS.small, 60),
  "narrow-a-1": painting("painterly-narrow-a-1.jpg", "Painted narrow-leaved spray (a)", PROMPTS.narrow, 130),
  "narrow-a-2": painting("painterly-narrow-a-2.jpg", "Painted narrow-leaved spray (a, second)", PROMPTS.narrow, 130),
  "narrow-b-1": painting("painterly-narrow-b-1.jpg", "Painted narrow-leaved spray (b)", PROMPTS.narrow, 130),
  "narrow-b-2": painting("painterly-narrow-b-2.jpg", "Painted narrow-leaved spray (b, second)", PROMPTS.narrow, 130),
  "pine-a-1": painting("painterly-pine-a-1.jpg", "Painted pine tufts (a)", PROMPTS.pine, 120),
  "pine-a-2": painting("painterly-pine-a-2.jpg", "Painted pine tufts (a, second)", PROMPTS.pine, 120),
  "pine-b-1": painting("painterly-pine-b-1.jpg", "Painted pine tufts (b)", PROMPTS.pine, 120),
  "pine-b-2": painting("painterly-pine-b-2.jpg", "Painted pine tufts (b, second)", PROMPTS.pine, 120),
  "fir-b-1": painting("painterly-fir-b-1.jpg", "Painted fir bough (b)", PROMPTS.fir, 90, BOUGH),
  "fir-b-2": painting("painterly-fir-b-2.jpg", "Painted fir bough (b, second)", PROMPTS.fir, 90, BOUGH),
  "scale-a-1": painting("painterly-scale-a-1.jpg", "Painted cedar bough (a)", PROMPTS.scale, 90, BOUGH),
  "scale-a-2": painting("painterly-scale-a-2.jpg", "Painted cedar bough (a, second)", PROMPTS.scale, 90, BOUGH),
  "scale-b-1": painting("painterly-scale-b-1.jpg", "Painted cedar bough (b)", PROMPTS.scale, 90, BOUGH),
  "scale-b-2": painting("painterly-scale-b-2.jpg", "Painted cedar bough (b, second)", PROMPTS.scale, 90, BOUGH),
};

/**
 * Each row of the painterly atlas (src/marks.ts `MARK_KINDS`) a kind of leaf has paintings for: the paintings
 * each density's three clusters are laid from, coarsest first, and how upright its clusters are kept (they
 * hang, or stand as a pine's shoots do: the shader keeps those dabs upright too). A kind not here (a palm's
 * fronds) keeps its drawn marks. `layout: "row"`: its paintings laid side by side, level, as plates of a pine's tufts are.
 */
export const ROWS = {
  broad: { upright: false, densities: [["broad-a-1", "broad-b-1", "broad-c-1"], ["broad-a-2", "broad-b-2", "broad-c-2"], ["broad-dense-1", "broad-dense-2", "broad-dense-1"]] },
  narrow: { upright: true, densities: [["narrow-a-1", "narrow-b-1", "narrow-a-2"], ["narrow-b-2", "narrow-a-1", "narrow-b-1"], ["narrow-a-2", "narrow-b-2", "narrow-a-1"]] },
  needle: { upright: true, layout: "row", densities: [["pine-b-2", "pine-a-2", "pine-b-1"], ["pine-a-1", "pine-b-2", "pine-a-2"], ["pine-b-1", "pine-a-1", "pine-b-2"]] },
  small: { upright: true, densities: [["small-a-1", "small-b-1", "small-a-2"], ["small-b-2", "small-a-1", "small-b-1"], ["small-a-2", "small-b-2", "small-a-1"]] },
  pine: { upright: true, layout: "row", densities: [["pine-a-1", "pine-b-1", "pine-a-2"], ["pine-b-2", "pine-a-1", "pine-b-1"], ["pine-a-2", "pine-b-2", "pine-a-1"]] },
};

/** The sheet atlas's columns (src/marks.ts `SHEET_COLUMNS`: two firs, a cedar): the boughs each side of its twig is laid from. */
export const SHEETS = [
  { kind: "fir", sides: ["fir-b-1", "fir-b-2"] },
  { kind: "fir", sides: ["fir-b-2", "fir-b-1"] },
  { kind: "scale", sides: ["scale-a-1", "scale-b-1"] },
];
