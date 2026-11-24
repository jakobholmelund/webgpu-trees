// What the realistic look's photographs are made from: every scanned source (a bark, a sheet of leaves, a
// conifer's twig cards), where it is published, who made it and under what licence, and how it is cut,
// cleaned and packed into what the library loads (assets/). All CC0 (public domain), from ambientCG and
// Poly Haven; credited all the same (assets/SOURCES.md is written from this list).
//
// fetch.mjs downloads exactly these files into a folder of your choosing; build.mjs turns them into
// assets/. Nothing here is fetched while the library runs.

/** The two publishers, and the licence each states for everything it publishes; and pictures generated for this project. */
export const SITES = {
  generated: {
    name: "AI-generated",
    licence: "AI-generated, not CC0: made for this project (owner-approved)",
    licenceUrl: null,
    page: () => null,
    author: "AI-generated (Nano Banana, gemini-nano-banana-2.1)",
  },
  ambientcg: {
    name: "ambientCG",
    licence: "CC0 1.0 Universal",
    licenceUrl: "https://docs.ambientcg.com/license/",
    page: (id) => `https://ambientcg.com/view?id=${id}`,
    author: "ambientCG (ambientcg.com)",
  },
  polyhaven: {
    name: "Poly Haven",
    licence: "CC0 1.0 Universal",
    licenceUrl: "https://polyhaven.com/license",
    page: (id) => `https://polyhaven.com/a/${id}`,
  },
};

/**
 * The sources. `files` are the maps fetched (name → URL); `kind` says which maps they are.
 * ambientCG packs are one zip each; Poly Haven maps come one file each.
 */
const acg = (id, res, extra = {}) => ({
  site: "ambientcg",
  id,
  res,
  zip: `https://ambientcg.com/get?file=${id}_${res}-JPG.zip`,
  map: (m) => `${id}_${res}-JPG_${m}.jpg`,
  ...extra,
});
const phTex = (id, title, authors, extra = {}) => ({
  site: "polyhaven",
  id,
  title,
  authors,
  res: "2k",
  files: Object.fromEntries(["diff", "nor_gl", "rough", "disp"].map((m) => [m, `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/${id}/${id}_${m}_2k.jpg`])),
  map: (m) => `${id}_${m}_2k.jpg`,
  ...extra,
});
const phModel = (id, part, title, authors, extra = {}) => ({
  site: "polyhaven",
  id,
  part,
  title,
  authors,
  res: "2k",
  files: Object.fromEntries(["diff", "alpha", "nor_gl", "rough"].map((m) => [m, `https://dl.polyhaven.org/file/ph-assets/Models/jpg/2k/${id}/${id}_${part}_${m}_2k.jpg`])),
  map: (m) => `${id}_${part}_${m}_2k.jpg`,
  ...extra,
});

/**
 * A picture generated where no scan exists: one PNG, copied by hand into <raw>/<key>/ (fetch.mjs does not
 * fetch it). Not CC0: generated for this project with the owner's approval; SOURCES.md says so.
 */
const generated = (id, file, title, prompt, extra = {}) => ({
  site: "generated",
  id,
  file,
  title,
  tool: "Nano Banana (gemini-nano-banana-2.1)",
  date: "2026-11-24",
  prompt,
  map: () => file,
  ...extra,
});

export const SOURCES = {
  // Barks.
  bark_bluegum: phTex("bark_bluegum", "Bark Blue gum", ["Dimitrios Savva"], { sizeMm: [1820, 1820] }),
  plane: acg("Bark009", "1K", { title: "Bark 009", sizeMm: null }),
  // (A scan twice as long as it is wide, for which Poly Haven states one size: taken as its length.)
  chinese_hackberry_bark: phTex("chinese_hackberry_bark", "Chinese Hackberry Bark", ["Charlotte Baglioni"], { sizeMm: [900, 1800], sizeFrom: "measured: Poly Haven's stated 1.8 m, taken as the length of this 1:2 scan" }),
  oak: acg("Bark001", "2K", { title: "Bark 001", sizeMm: null }),
  bark_willow_02: phTex("bark_willow_02", "Bark Willow 02", ["Charlotte Baglioni"], { sizeMm: [2150, 2150] }),
  pine_bark: phTex("pine_bark", "Pine Bark", ["Dimitrios Savva"], { sizeMm: [2000, 2000] }),
  japanese_zelkova_bark: phTex("japanese_zelkova_bark", "Japanese Zelkova Bark", ["Charlotte Baglioni"], { sizeMm: [1800, 1800] }),
  spruce: acg("Bark006", "1K", { title: "Bark 006", sizeMm: null }),
  douglas: acg("Bark014", "1K", { title: "Bark 014", sizeMm: [1200, 1200] }),
  metasequoia_bark: phTex("metasequoia_bark", "Metasequoia Bark", ["Charlotte Baglioni"], { sizeMm: [1940, 1940] }),
  palm_tree_bark: phTex("palm_tree_bark", "Palm Tree Bark", ["Dimitrios Savva", "Rico Cilliers"], { sizeMm: [650, 1300], sizeFrom: "measured: Poly Haven's stated 1.3 m, taken as the length of this 1:2 scan" }),
  // Generated, where no scan exists (prompts as given, abbreviated where they were).
  ai_birch_bark: generated("birch-bark-4", "birch-bark-4.png", "Silver birch bark", "Silver birch (Betula pendula) bark… seamless tileable…", { crop: { x: 0.5, size: 1 } }),
  ai_canary_trunk: generated("canary-trunk-3", "canary-trunk-3.png", "Canary Island date palm trunk", "Canary Island date palm trunk surface… diamond-shaped leaf-base scars… seamless tileable", { crop: { x: 0.5, size: 1 } }),
  ai_eucalyptus_leaves: generated("eucalyptus-leaves-2", "eucalyptus-leaves-2.png", "Tasmanian blue gum adult leaves", "Six adult Tasmanian blue gum leaves laid flat on pure flat magenta…", { key: "magenta" }),
  ai_canary_frond: generated("canary-frond-2", "canary-frond-2.png", "Canary Island date palm frond", "One complete Canary Island date palm frond… on magenta…", { key: "magenta" }),
  // The palms' pictures (generated 2026-11-24; the prompts as given in tools/ai-textures/PROMPTS.md).
  ai_fan_leaf: generated("real-fan-leaf-2", "real-fan-leaf-2.jpg", "Mexican fan palm leaf", "One Mexican fan palm (Washingtonia robusta) leaf laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, square. A round costapalmate fan about 1 m across on a short piece of spiny stalk, many stiff pleated bright green segments radiating from the centre, their outer thirds split and drooping, a few fine threads hanging from the tips. The whole leaf inside the frame with a margin, no shadows on the background.", { key: "magenta" }),
  ai_fan_leaf_b: generated("real-fan-leaf-1", "real-fan-leaf-1.jpg", "Mexican fan palm leaf (a second)", "One Mexican fan palm (Washingtonia robusta) leaf laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, square. A round costapalmate fan about 1 m across on a short piece of spiny stalk, many stiff pleated bright green segments radiating from the centre, their outer thirds split and drooping, a few fine threads hanging from the tips. The whole leaf inside the frame with a margin, no shadows on the background.", { key: "magenta" }),
  ai_dead_fronds: generated("real-dead-fronds-1", "real-dead-fronds-1.jpg", "Dead hanging fan palm leaves", "Several dead dry palm fronds hanging straight down side by side, laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, tall 1:2. Straw-tan to grey-brown, papery, folded and frayed fan leaves on long stalks, like the dead skirt of a Washingtonia fan palm. The whole group inside the frame with a margin, no shadows on the background.", { key: "magenta" }),
  ai_queen_frond: generated("real-queen-frond-1", "real-queen-frond-1.jpg", "Queen palm frond", "One queen palm (Syagrus romanzoffiana) frond laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, tall 1:2. A long arching midrib with many soft, narrow, glossy green leaflets set in several planes along it so the frond looks plumose and feathery, the leaflets drooping softly. The whole frond inside the frame with a margin, no shadows on the background.", { key: "magenta" }),
  ai_pineapple: generated("real-pineapple-cut-2", "real-pineapple-cut-2.jpg", "Canary date palm pineapple cut", "The pruned leaf-base crown (\"pineapple cut\") of a Canary Island date palm, photographed straight-on as a flat seamless tileable texture, square. Neatly trimmed short leaf stubs in a tight interlocking diamond spiral, fresh cut faces pale tan and cream, darker brown fibres between them. Even diffuse light, no cast shadows, no perspective, no edges visible. Photographic scan quality.", { crop: { x: 0.5, size: 1 } }),
  ai_paint_frond: generated("painterly-frond-2", "painterly-frond-2.jpg", "Painted feather palm frond", "A hand-painted stylized palm frond for a game tree, on a pure flat magenta #FF00FF background, tall 1:2. One arching feather palm frond, a curved yellow-green midrib from bottom to top with many narrow pointed leaflets on both sides angled forward in a V, longest in the middle; bright yellow-green on top, teal-green beneath, soft painted gradients. Flat orthographic, the whole frond inside the frame with a margin, no outlines, no text.", { key: "magenta" }),
  ai_paint_fan: generated("painterly-fan-1", "painterly-fan-1.jpg", "Painted fan palm leaf", "A hand-painted stylized fan palm leaf for a game tree, on a pure flat magenta #FF00FF background, square. One round fan-shaped leaf of a Mexican fan palm on a short stalk, many pleated narrow segments radiating from the centre with their tips split and drooping, a few hanging threads; yellow-green on top, teal beneath, soft painted gradients. Flat orthographic, centred, inside the frame with a margin, no outlines, no text.", { key: "magenta" }),
  // Leaves.
  LeafSet016: acg("LeafSet016", "2K", { title: "Leaf Set 016" }),
  LeafSet030: acg("LeafSet030", "2K", { title: "Leaf Set 030" }),
  LeafSet010: acg("LeafSet010", "2K", { title: "Leaf Set 010" }),
  LeafSet009: acg("LeafSet009", "2K", { title: "Leaf Set 009" }),
  LeafSet004: acg("LeafSet004", "2K", { title: "Leaf Set 004" }),
  LeafSet014: acg("LeafSet014", "2K", { title: "Leaf Set 014" }),
  LeafSet024: acg("LeafSet024", "2K", { title: "Leaf Set 024", sizeMm: [400, 400] }),
  LeafSet003: acg("LeafSet003", "2K", { title: "Leaf Set 003" }),
  LeafSet013: acg("LeafSet013", "2K", { title: "Leaf Set 013" }),
  LeafSet019: acg("LeafSet019", "2K", { title: "Leaf Set 019" }),
  Foliage001: acg("Foliage001", "2K", { title: "Foliage 001" }),
  pine_tree_01: phModel("pine_tree_01", "twig", "Pine Tree 01 (its twig cards)", ["Rob Tuytel", "Rico Cilliers"]),
  fir_tree_01: phModel("fir_tree_01", "twig", "Fir Tree 01 (its twig cards)", ["Rob Tuytel", "Rico Cilliers"]),
};

/**
 * The bark sets, one layer each of the bark texture array, in this order. Each is a tileable square of bark
 * 1024 texels across: its colour (sRGB) with its roughness in alpha, and its surface (normal x, normal y,
 * height). `tileCm` is how much bark one tile covers (across the stem, along it): the scan's own measured size
 * where its publisher gives one, else estimated from its pattern against docs/MORPHOLOGY.md (`tileFrom`).
 * `delight` evens out light left in the photograph over distances above about a sixth of a tile (0 none, 1
 * all), so the tile repeats without a bright or dark patch marking each repeat. `for` is which species (by name) it
 * is meant for (the species pick their set; this is only the note).
 */
export const BARK = [
  {
    id: "eucalyptus",
    source: "bark_bluegum",
    look: "smooth, peeling plates, mottled grey-brown-cream (Tasmanian blue gum itself)",
    for: ["Eucalyptus"],
    delight: 0.6,
  },
  {
    id: "plane",
    source: "plane",
    look: "jigsaw exfoliation: cream, olive and sage patches",
    for: ["Plane", "California sycamore"],
    // Patches 3–15 cm on a plane's trunk (MORPHOLOGY.md): the largest patches here span about a fifth of the tile.
    tileCm: [80, 80],
    tileFrom: "estimated: largest patches ~16 cm, a plane's 3–15 cm",
    delight: 0.5,
  },
  {
    id: "beech",
    source: "chinese_hackberry_bark",
    look: "smooth grey skin with lichen dots and faint horizontal lines",
    for: ["Beech"],
    delight: 0.7,
  },
  {
    id: "birch",
    source: "ai_birch_bark",
    look: "white papery bark, dark horizontal lenticels, curling strips, a dark branch-scar eye",
    for: ["Silver birch"],
    // Lenticels 0.5–3 cm long (MORPHOLOGY.md), longer on old stems: some 40–80 texels of the 768 it is cut from.
    tileCm: [70, 70],
    tileFrom: "estimated: lenticels 2.5–5 cm, a birch's 0.5–3 cm on a young stem, longer on an old",
    delight: 0.6,
  },
  {
    id: "oak",
    source: "oak",
    look: "deep vertical fissures between grey checkered ridges",
    for: ["Oak", "Black alder", "Hawthorn", "Coast live oak"],
    // An oak's ridges 2–6 cm wide (MORPHOLOGY.md): about eight across this tile's width.
    tileCm: [35, 70],
    tileFrom: "estimated: ~8 ridges across, an oak's ridges 2–6 cm",
    delight: 0.5,
  },
  {
    id: "ridged",
    source: "bark_willow_02",
    look: "grey-brown interlacing furrows and corky ridges",
    for: ["Weeping willow", "Lombardy poplar", "Red oak", "Sugar maple"],
    delight: 0.6,
  },
  {
    id: "pine",
    source: "pine_bark",
    look: "red-brown plates between dark fissures",
    for: ["Scots pine", "Corsican pine", "Monterey pine", "Torrey pine", "Aleppo pine", "Stone pine", "Eastern white pine"],
    delight: 0.6,
  },
  {
    id: "pineFlakes",
    source: "japanese_zelkova_bark",
    look: "thin papery flakes, orange on a pale ground (a Scots pine's upper stem, once tinted)",
    for: ["Scots pine"],
    delight: 0.6,
  },
  {
    id: "spruce",
    source: "spruce",
    look: "small thin grey scales with orange-brown flakes",
    for: ["Spruce", "Sitka spruce", "White spruce"],
    // Scales 1–3 cm (Norway, white spruce), 3–10 cm (Sitka): about twenty across the tile.
    tileCm: [60, 60],
    tileFrom: "estimated: ~20 scales across, a spruce's 1–3 cm",
    delight: 0.5,
  },
  {
    id: "douglas",
    source: "douglas",
    look: "thick corky red-brown bark, long ridges and deep furrows",
    for: ["Douglas fir"],
    delight: 0.5,
  },
  {
    id: "fibrous",
    source: "metasequoia_bark",
    look: "long red-brown fibrous strips peeling to grey",
    for: ["Western red cedar", "Monterey cypress"],
    delight: 0.6,
  },
  {
    id: "palmRings",
    source: "palm_tree_bark",
    look: "grey stem with ring-like leaf scars",
    for: ["Mexican fan palm", "California fan palm", "Queen palm"],
    delight: 0.5,
    // (The scan has one long dark gash, which marked every repeat of the tile up a tall stem: painted over with
    // the bark half a tile across, where the rings run on at the same heights.)
    heal: [{ x0: -0.03, y0: 0.16, x1: 0.33, y1: 0.67, dx: 0.5, dy: 0 }],
  },
  {
    id: "palmLattice",
    source: "ai_canary_trunk",
    look: "diamond lattice of cut leaf bases among fibres",
    for: ["Canary date palm"],
    // Leaf-base scars 10–15 cm wide (MORPHOLOGY.md): about six across the tile.
    tileCm: [75, 75],
    tileFrom: "estimated: ~6 leaf bases across, a Canary palm's 10–15 cm",
    delight: 0.8,
  },
  {
    id: "palmPineapple",
    source: "ai_pineapple",
    look: "a Canary palm's leaf bases trimmed into a pineapple: tight diamonds of pale cut stubs",
    for: ["Canary date palm (its pineapple cut)"],
    // Trimmed leaf bases 8–12 cm across: about twelve across the tile.
    tileCm: [120, 120],
    tileFrom: "estimated: ~12 cut bases across, a Canary palm's trimmed bases 8–12 cm",
    delight: 0.6,
  },
];

/**
 * The leaf sets: each a sheet of single leaves (or a conifer's twig sprays, or a palm's leaflet blades) cut
 * from a scan, stood upright (base down, tip up) and packed into one picture: colour (sRGB) with coverage in
 * alpha, and beside it their surface (normal x, normal y, and how much light each texel lets through).
 *
 * `base`: which side of the scan the leaves' stalks are on. `skip`: leaves left out, by their order in the
 * scan (rows top to bottom, then left to right). `rects`: where on the sheet to look (shares of its size),
 * for a sheet that also holds other things (a model's twig sheet holds its cones and bark), with `count` the
 * most leaves to take from one (the biggest). `deskew`: stand
 * each leaf straight along its own long axis (not for sprays). `px`: how long (texels) a leaf is packed.
 * `tone`: keep only its lightness (the scan is an autumn leaf; the species gives the colour).
 * `lengthCm`: how long such a leaf is, stalk to tip, on the species it was scanned from (a typical one; the
 * species set their own sizes). `bases`: the way each leaf's stalk points, by its order, where they differ.
 */
export const LEAVES = [
  { id: "oak", source: "LeafSet016", look: "lobed oak leaves", for: ["Oak", "Hawthorn"], base: "down", px: 320, lengthCm: 11 },
  { id: "redOak", source: "LeafSet030", look: "bristle-lobed red oak leaves (autumn colours, kept as lightness only)", for: ["Red oak"], base: "right", px: 288, lengthCm: 17, tone: true },
  { id: "maple", source: "LeafSet010", look: "palmate maple leaves", for: ["Plane", "California sycamore", "Sugar maple"], base: "down", px: 352, lengthCm: 16 },
  { id: "round", source: "LeafSet009", look: "round leaves, toothed", for: ["Black alder"], base: "down", px: 288, lengthCm: 9 },
  { id: "deltoid", source: "LeafSet004", look: "triangular leaves on long stalks", for: ["Lombardy poplar", "Silver birch"], base: "down", px: 320, lengthCm: 10 },
  { id: "serrate", source: "LeafSet014", look: "ovate leaves, finely toothed, straight veins", for: ["Silver birch"], base: "down", px: 320, lengthCm: 9 },
  { id: "beech", source: "LeafSet024", look: "oval leaves with wavy margins and straight veins", for: ["Beech"], base: "down", px: 288, lengthCm: 9 },
  { id: "elliptic", source: "LeafSet003", look: "elliptic leaves, toothed", for: ["Coast live oak", "Shrub"], base: "down", px: 320, lengthCm: 7 },
  { id: "lance", source: "LeafSet013", look: "narrow lanceolate leaves", for: ["Weeping willow"], base: "down", px: 384, lengthCm: 12, skip: [2, 4, 5] },
  { id: "scale", source: "LeafSet019", look: "sprays of scale leaves", for: ["Western red cedar", "Monterey cypress"], base: "left", px: 448, lengthCm: 18, deskew: false },
  {
    id: "pine",
    source: "pine_tree_01",
    look: "pine shoots with their needles",
    for: ["Scots pine", "Corsican pine", "Monterey pine", "Torrey pine", "Aleppo pine", "Stone pine", "Eastern white pine", "Gorse"],
    base: "down",
    px: 448,
    lengthCm: 22,
    deskew: false,
    // The upright shoot (base down), and the one lying across (base to the left).
    rects: [
      { x0: 0.03, y0: 0.03, x1: 0.225, y1: 0.455, base: "down", count: 1 },
      { x0: 0.655, y0: 0.335, x1: 0.945, y1: 0.53, base: "left", count: 1 },
    ],
  },
  {
    id: "fir",
    source: "fir_tree_01",
    look: "fir sprays, flat-needled",
    for: ["Spruce", "Sitka spruce", "White spruce", "Douglas fir"],
    base: "down",
    px: 448,
    lengthCm: 25,
    deskew: false,
    rects: [{ x0: 0.17, y0: 0.03, x1: 0.955, y1: 0.84, base: "down" }],
  },
  {
    id: "eucalyptus",
    source: "ai_eucalyptus_leaves",
    look: "sickle-shaped adult blue gum leaves",
    for: ["Eucalyptus"],
    base: "down",
    // (Two of the six lie with their stalks up.)
    bases: ["down", "up", "down", "down", "up", "down"],
    px: 448,
    lengthCm: 24,
  },
  { id: "frond", source: "ai_canary_frond", look: "a whole feather-shaped palm frond", for: ["Canary date palm"], base: "down", px: 640, lengthCm: 450, deskew: false },
  { id: "blade", source: "Foliage001", look: "long narrow blades (a palm's leaflets)", for: ["Mexican fan palm"], base: "down", px: 512, lengthCm: 40, skip: [8] },
  // The palms' whole leaves, each one to a picture (palm.ts lays them on its own fronds).
  { id: "fan", source: "ai_fan_leaf", look: "a whole fan palm leaf on a piece of its stalk", for: ["Mexican fan palm", "California fan palm"], base: "down", px: 896, lengthCm: 160, deskew: false, whole: true },
  { id: "fanB", source: "ai_fan_leaf_b", look: "a whole fan palm leaf, a second", for: ["Mexican fan palm", "California fan palm"], base: "down", px: 896, lengthCm: 160, deskew: false, whole: true },
  { id: "deadFronds", source: "ai_dead_fronds", look: "dead fan leaves hanging side by side (a skirt)", for: ["Mexican fan palm", "California fan palm"], base: "down", px: 960, lengthCm: 250, deskew: false, whole: true },
  { id: "queenFrond", source: "ai_queen_frond", look: "a whole plumose queen palm frond", for: ["Queen palm"], base: "down", px: 960, lengthCm: 400, deskew: false, whole: true },
  { id: "paintFrond", source: "ai_paint_frond", look: "a painted feather palm frond (the painterly looks')", for: ["Canary date palm", "Queen palm"], base: "down", px: 960, lengthCm: 450, deskew: false, whole: true },
  { id: "paintFan", source: "ai_paint_fan", look: "a painted fan palm leaf (the painterly looks')", for: ["Mexican fan palm", "California fan palm"], base: "down", px: 896, lengthCm: 160, deskew: false, whole: true },
];
