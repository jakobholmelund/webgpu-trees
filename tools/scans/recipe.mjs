// What the realistic look's photographs are made from: every scanned source (a bark, a sheet of leaves, a
// conifer's twig cards), where it is published, who made it and under what licence, and how it is cut,
// cleaned and packed into what the library loads (assets/). All CC0 (public domain), from ambientCG and
// Poly Haven; credited all the same (assets/SOURCES.md is written from this list).
//
// fetch.mjs downloads exactly these files into a folder of your choosing; build.mjs turns them into
// assets/. Nothing here is fetched while the library runs.

/** The two publishers, and the licence each states for everything it publishes. */
export const SITES = {
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

export const SOURCES = {
  // Barks.
  bark_bluegum: phTex("bark_bluegum", "Bark Blue gum", ["Dimitrios Savva"], { sizeMm: [1820, 1820] }),
  plane: acg("Bark009", "1K", { title: "Bark 009", sizeMm: null }),
  // (A scan twice as long as it is wide, for which Poly Haven states one size: taken as its length.)
  chinese_hackberry_bark: phTex("chinese_hackberry_bark", "Chinese Hackberry Bark", ["Charlotte Baglioni"], { sizeMm: [900, 1800], sizeFrom: "measured: Poly Haven's stated 1.8 m, taken as the length of this 1:2 scan" }),
  sakura_bark: phTex("sakura_bark", "Sakura Bark", ["Charlotte Baglioni"], { sizeMm: [1600, 1600] }),
  oak: acg("Bark001", "2K", { title: "Bark 001", sizeMm: null }),
  bark_willow_02: phTex("bark_willow_02", "Bark Willow 02", ["Charlotte Baglioni"], { sizeMm: [2150, 2150] }),
  pine_bark: phTex("pine_bark", "Pine Bark", ["Dimitrios Savva"], { sizeMm: [2000, 2000] }),
  japanese_zelkova_bark: phTex("japanese_zelkova_bark", "Japanese Zelkova Bark", ["Charlotte Baglioni"], { sizeMm: [1800, 1800] }),
  spruce: acg("Bark006", "1K", { title: "Bark 006", sizeMm: null }),
  douglas: acg("Bark014", "1K", { title: "Bark 014", sizeMm: [1200, 1200] }),
  metasequoia_bark: phTex("metasequoia_bark", "Metasequoia Bark", ["Charlotte Baglioni"], { sizeMm: [1940, 1940] }),
  palm_tree_bark: phTex("palm_tree_bark", "Palm Tree Bark", ["Dimitrios Savva", "Rico Cilliers"], { sizeMm: [650, 1300], sizeFrom: "measured: Poly Haven's stated 1.3 m, taken as the length of this 1:2 scan" }),
  palm_bark: phTex("palm_bark", "Palm Bark", ["Charlotte Baglioni"], { sizeMm: [1860, 1860] }),
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
    source: "sakura_bark",
    look: "white, with dark horizontal lenticels (recoloured from a cherry's lenticelled bark)",
    for: ["Silver birch"],
    delight: 0.8,
    // A birch's: base white #EDEBE6, lenticels #2A2725, peach underbark #D9B9A0 (MORPHOLOGY.md).
    birch: { white: "#ece9e2", dark: "#2c2926", peach: "#d6b7a0" },
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
    for: ["Mexican fan palm"],
    delight: 0.5,
  },
  {
    id: "palmFibre",
    source: "palm_bark",
    look: "dark fibrous stem, horizontal leaf-base ridges",
    for: ["Canary date palm"],
    delight: 0.9,
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
 * species set their own sizes).
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
  { id: "lance", source: "LeafSet013", look: "narrow lanceolate leaves", for: ["Weeping willow", "Eucalyptus"], base: "down", px: 384, lengthCm: 12, skip: [2, 4, 5] },
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
  { id: "blade", source: "Foliage001", look: "long narrow blades (a palm's leaflets)", for: ["Canary date palm", "Mexican fan palm"], base: "down", px: 512, lengthCm: 40, skip: [8] },
];
