// What the realistic look's photographs are made from: every scanned source (a bark, a sheet of leaves, a
// conifer's twig cards), where it is published, who made it and under what licence, and how it is cut,
// cleaned and packed into what the library loads (assets/). The scans are all CC0 (public domain), from
// ambientCG and Poly Haven; where no scan exists, a picture was generated (not CC0, owner-approved). All are
// credited (assets/SOURCES.md is written from this list).
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
    author: "AI-generated (each picture names its tool)",
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
 * A picture generated where no scan exists: one PNG or JPG (or, for a sheet of leaves, several, set side by
 * side), copied by hand into <raw>/<key>/ (fetch.mjs does not fetch it). Not CC0: generated for this project
 * with the owner's approval; SOURCES.md says so, with the tool (`extra.tool`, else Nano Banana) and the prompt.
 * `crop`: a bark, cut square at `x` (a share of the spare width) and made to tile; `grade`: its colour brought
 * nearer a real bark's before (`saturation` scaled, its mean moved `toward` an sRGB colour); `overlap`: made to
 * tile from that share of itself, pieced (else cross-faded with itself moved half a tile); `streaks`: its
 * streaks lined up before. `key: "magenta"`: leaves on magenta, keyed out; `unmix`: each edge unmixed from the
 * magenta against the leaf beside it; `sameScale`: a smaller picture brought to the tallest's height first, so its
 * leaves are as big as the others'. `fissures`: dark diamond-shaped fissures laid into a pale bark (build.mjs
 * `fissure`), where the picture has none.
 */
const generated = (id, file, title, prompt, extra = {}) => ({
  site: "generated",
  id,
  file,
  title,
  tool: "Nano Banana (gemini-nano-banana-2.1)",
  date: "2026-11-24",
  prompt,
  map: () => [file].flat()[0],
  ...extra,
});
/** The tool the realistic look's later pictures (tools/ai-textures/PROMPTS.md) were made with. */
const ANTIGRAVITY = { tool: "Antigravity / gemini-3.8-flash image", date: "2026-11-24" };
/** The pines' cushions and clumps were made by the owner in the Antigravity app with Nano Banana. */
const NANO_ANTIGRAVITY = { tool: "Nano Banana via Antigravity", date: "2026-11-24" };
/**
 * The owner's 2048-pixel generations of pictures first made at 1024 (Nano Banana via Antigravity, 2026-11-25): each
 * kept as `-3` with a near twin `-4` spare; the prompt each subject's own words, then the shared rule for its kind.
 */
const REGEN_2048 = { tool: "Nano Banana via Antigravity", date: "2026-11-25" };

export const SOURCES = {
  // Barks.
  plane: acg("Bark009", "1K", { title: "Bark 009", sizeMm: null }),
  oak: acg("Bark001", "2K", { title: "Bark 001", sizeMm: null }),
  bark_willow_02: phTex("bark_willow_02", "Bark Willow 02", ["Charlotte Baglioni"], { sizeMm: [2150, 2150] }),
  pine_bark: phTex("pine_bark", "Pine Bark", ["Dimitrios Savva"], { sizeMm: [2000, 2000] }),
  spruce: acg("Bark006", "1K", { title: "Bark 006", sizeMm: null }),
  douglas: acg("Bark014", "1K", { title: "Bark 014", sizeMm: [1200, 1200] }),
  metasequoia_bark: phTex("metasequoia_bark", "Metasequoia Bark", ["Charlotte Baglioni"], { sizeMm: [1940, 1940] }),
  palm_tree_bark: phTex("palm_tree_bark", "Palm Tree Bark", ["Dimitrios Savva", "Rico Cilliers"], { sizeMm: [650, 1300], sizeFrom: "measured: Poly Haven's stated 1.3 m, taken as the length of this 1:2 scan" }),
  // Generated, where no scan exists (prompts as given, abbreviated where they were).
  ai_birch_bark: generated("birch-bark-4", "birch-bark-4.png", "Silver birch bark", "Silver birch (Betula pendula) bark… seamless tileable…", { crop: { x: 0.5, size: 1 }, fissures: { count: 4, w: [0.05, 0.14], h: [0.08, 0.24], seed: 5 } }),
  ai_canary_trunk: generated("canary-trunk-3", "canary-trunk-3.png", "Canary Island date palm trunk", "Canary Island date palm trunk surface… diamond-shaped leaf-base scars… seamless tileable", { crop: { x: 0.5, size: 1 } }),
  ai_eucalyptus_leaves: generated("eucalyptus-leaves-2", "eucalyptus-leaves-2.png", "Tasmanian blue gum adult leaves", "Six adult Tasmanian blue gum leaves laid flat on pure flat magenta…", { key: "magenta" }),
  ai_canary_frond: generated("canary-frond-2", "canary-frond-2.png", "Canary Island date palm frond", "One complete Canary Island date palm frond… on magenta…", { key: "magenta" }),
  // The palms' pictures (generated 2026-11-24; the prompts as given in tools/ai-textures/PROMPTS.md).
  ai_fan_leaf: generated("real-fan-leaf-3", "real-fan-leaf-3.png", "Mexican fan palm leaf", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Mexican fan palm leaf (square): one round fan-shaped leaf about 1 m across on a short piece of spiny stalk, many stiff pleated bright green segments radiating from the centre, their outer thirds split and drooping, a few fine threads hanging from the tips. As a top-down photograph like a botanical scan on a pure flat magenta background with no gradient and no shadow, the whole subject fully inside the frame with a clear margin, nothing else in frame, no text, very sharp, even light.", { ...REGEN_2048, key: "magenta", unmix: true }),
  ai_fan_leaf_b: generated("real-fan-leaf-1", "real-fan-leaf-1.jpg", "Mexican fan palm leaf (a second)", "One Mexican fan palm (Washingtonia robusta) leaf laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, square. A round costapalmate fan about 1 m across on a short piece of spiny stalk, many stiff pleated bright green segments radiating from the centre, their outer thirds split and drooping, a few fine threads hanging from the tips. The whole leaf inside the frame with a margin, no shadows on the background.", { key: "magenta" }),
  ai_dead_fronds: generated("real-dead-fronds-3", "real-dead-fronds-3.png", "Dead hanging fan palm leaves", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Dead hanging palm fronds (tall portrait): several dead dry fan-palm leaves hanging straight down side by side on long stalks, straw-tan to grey-brown, papery, folded and frayed, like the dead skirt of a Mexican fan palm. As a top-down photograph like a botanical scan on a pure flat magenta background with no gradient and no shadow, the whole subject fully inside the frame with a clear margin, nothing else in frame, no text, very sharp, even light.", { ...REGEN_2048, key: "magenta", unmix: true }),
  ai_queen_frond: generated("real-queen-frond-3", "real-queen-frond-3.png", "Queen palm frond", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Queen palm frond (tall portrait): one long arching frond, a midrib with many soft, narrow, glossy green leaflets set in several planes along it so the frond looks plumose and feathery, the leaflets drooping softly. As a top-down photograph like a botanical scan on a pure flat magenta background with no gradient and no shadow, the whole subject fully inside the frame with a clear margin, nothing else in frame, no text, very sharp, even light.", { ...REGEN_2048, key: "magenta", unmix: true }),
  ai_pineapple: generated("real-pineapple-cut-2", "real-pineapple-cut-2.jpg", "Canary date palm pineapple cut", "The pruned leaf-base crown (\"pineapple cut\") of a Canary Island date palm, photographed straight-on as a flat seamless tileable texture, square. Neatly trimmed short leaf stubs in a tight interlocking diamond spiral, fresh cut faces pale tan and cream, darker brown fibres between them. Even diffuse light, no cast shadows, no perspective, no edges visible. Photographic scan quality.", { crop: { x: 0.5, size: 1 } }),
  ai_paint_frond: generated("painterly-frond-2", "painterly-frond-2.jpg", "Painted feather palm frond", "A hand-painted stylized palm frond for a game tree, on a pure flat magenta #FF00FF background, tall 1:2. One arching feather palm frond, a curved yellow-green midrib from bottom to top with many narrow pointed leaflets on both sides angled forward in a V, longest in the middle; bright yellow-green on top, teal-green beneath, soft painted gradients. Flat orthographic, the whole frond inside the frame with a margin, no outlines, no text.", { key: "magenta" }),
  ai_paint_fan: generated("painterly-fan-1", "painterly-fan-1.jpg", "Painted fan palm leaf", "A hand-painted stylized fan palm leaf for a game tree, on a pure flat magenta #FF00FF background, square. One round fan-shaped leaf of a Mexican fan palm on a short stalk, many pleated narrow segments radiating from the centre with their tips split and drooping, a few hanging threads; yellow-green on top, teal beneath, soft painted gradients. Flat orthographic, centred, inside the frame with a margin, no outlines, no text.", { key: "magenta" }),
  // The realistic look's species no scan covers (generated 2026-11-24; the prompts as given in
  // tools/ai-textures/PROMPTS.md).
  ai_beech_bark: generated("real-beech-bark-3", "real-beech-bark-3.png", "European beech bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. European beech bark (square): smooth silver-grey bark, faint darker grey mottling, a few small horizontal lenticel lines and pale lichen spots, very fine texture. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 1, overlap: 0.16, relief: 0.35 } }),
  ai_eucalyptus_bark: generated("real-eucalyptus-bark-2", "real-eucalyptus-bark-2.jpg", "Tasmanian blue gum bark, rough and peeling", "Tasmanian blue gum (Eucalyptus globulus) trunk bark, photographed straight-on as a flat seamless tileable texture, square. Smooth pale cream and blue-grey bark with patches of fresh yellow-green and grey, long ribbons of peeling brown bark strips hanging in places, filling the whole frame edge to edge. Even diffuse light, no cast shadows, no perspective, no trunk edges visible. Photographic scan quality.", { ...ANTIGRAVITY, crop: { x: 0.5, size: 1, overlap: 0.16, streaks: true } }),
  ai_eucalyptus_bark_upper: generated("real-eucalyptus-bark-3", "real-eucalyptus-bark-3.png", "Tasmanian blue gum bark, smooth and mottled", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Tasmanian blue gum eucalyptus bark (square): smooth pale cream and blue-grey bark with patches of fresh yellow-green and grey, long ribbons of peeling brown bark strips hanging in places. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 1, overlap: 0.16, streaks: true } }),
  // (Generated far too saturated an orange: brought to a copper that sits with the scanned plates below it.)
  ai_scotspine_upper: generated("real-scotspine-upper-bark-3", "real-scotspine-upper-bark-3.png", "Scots pine upper-stem bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Scots pine bark from high on the trunk (square): thin flaking papery plates of muted copper to rusty orange-brown bark peeling in small curls, natural and not oversaturated, with greyish-brown shadows between the flakes. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 1, overlap: 0.16 }, grade: { saturation: 0.6, toward: [0.71, 0.39, 0.24] } }),
  ai_torrey_shoot: generated("real-torrey-shoot", ["real-torrey-shoot-3.jpg", "real-torrey-shoot-1.jpg"], "Torrey pine shoots", "One Torrey pine (Pinus torreyana) shoot laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, tall 1:2. A stout grey-brown twig ending in a dense tuft of long stiff grey-green needles in bundles of five, 20–30 cm long, spreading forward like a brush. The whole shoot inside the frame with a margin, no shadows on the background.", { ...ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_liveoak_leaves: generated("real-liveoak-leaves-2", "real-liveoak-leaves-2.jpg", "Coast live oak leaves", "Ten coast live oak (Quercus agrifolia) leaves laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, square. Each leaf small, 3–6 cm, oval, cupped and holly-like with spiny toothed edges, dark glossy green; arranged in rows, upright, not touching, each fully inside the frame with a margin. No shadows on the background.", { ...ANTIGRAVITY, key: "magenta", unmix: true }),
  // (Checked by the owner against a photograph of real plane leaves: broad pointed lobes, sparse coarse teeth, the swollen stalk base.)
  ai_plane_leaves: generated("real-plane-leaves", ["real-plane-leaves-5.png", "real-plane-leaves-6.png"], "London plane leaves", "Six real London plane tree leaves (Platanus x hispanica) photographed flat from directly above like a botanical herbarium scan, on a pure flat magenta #FF00FF background with no gradient and no shadow, square, arranged in two rows of three, upright, not touching, each fully inside the frame with a margin, no text. Leaf shape: a broad leaf wider than long, thick and leathery, three big broad triangular lobes at the top and two small low ones at the sides, notches between lobes with wide open V-shaped bottoms, lobe edges with only one or two large teeth each, a broad base, three strong pale veins fanning from the base, matte olive green, a thick stalk with a swollen base.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_cypress_spray: generated("real-cypress-spray", ["real-cypress-spray-1.jpg", "real-cypress-spray-2.jpg"], "Monterey cypress sprays", "One Monterey cypress (Hesperocyparis macrocarpa) branchlet laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, tall 1:2. Dense rope-like cord sprays of tiny scale leaves branching in three dimensions, dark bright green, a thin brown axis; the whole spray inside the frame with a margin, no shadows on the background.", { ...ANTIGRAVITY, key: "magenta", unmix: true }),
  // The pines' cushions and clumps, each picture one whole (generated 2026-11-24 in the Antigravity app; the
  // prompts as given in tools/ai-textures/PROMPTS.md).
  ai_stonepine_cushion: generated("real-stonepine-cushion", ["real-stonepine-cushion-1.png", "real-stonepine-cushion-2.png"], "Stone pine foliage cushion", "One single dense rounded cushion of Italian stone pine (Pinus pinea) foliage, photographed from the side at eye level like a botanical studio photograph, on a pure flat magenta #FF00FF background, wide 2:1. A wide puffy pad about 2 m across, flat underneath and domed on top, made of thousands of long paired grey-green needles in brush-like tufts at the ends of many short upturned shoots; the sunlit top is bright yellow-green, the underside deep dark green almost black, a few thin brown twigs visible under its flat base. Needle-textured ragged edge all round. The whole cushion inside the frame with a clear margin, no other plants, no shadows on the background.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_stonepine_canopy: generated("real-stonepine-canopy", ["real-stonepine-canopy-1.png", "real-stonepine-canopy-2.png"], "Stone pine canopy strip", "A section of the flat-topped canopy of an Italian stone pine (Pinus pinea) seen from the side, made of several overlapping rounded cushions of pine needle foliage side by side, each cushion lit yellow-green on top and dark green beneath, deep shadowed creases between the cushions, a few dark crooked branches visible beneath the flat underside, on a pure flat magenta #FF00FF background, wide 3:1, photographic, even daylight from above, the whole canopy section inside the frame with a margin, no trunk, no shadows on the background.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_pine_clump_dark: generated("real-pine-clump-dark", ["real-pine-clump-dark-1.png", "real-pine-clump-dark-2.png"], "Monterey pine foliage clump", "One dense rounded clump of Monterey pine (Pinus radiata) foliage photographed from the side, on a pure flat magenta #FF00FF background, square. Many stout shoots ending in thick brushes of long dark green needles in bundles of three, packed into a lumpy rounded mass about 1.5 m across, sunlit needle tips lighter green on top, very dark underneath, spiky needle-textured outline. The whole clump inside the frame with a margin, no shadows on the background, photographic.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_pine_clump_light: generated("real-pine-clump-light", ["real-pine-clump-light-1.png", "real-pine-clump-light-2.png"], "Aleppo pine foliage clump", "One loose irregular clump of Aleppo pine (Pinus halepensis) foliage photographed from the side, on a pure flat magenta #FF00FF background, square. Several thin grey-brown twigs ending in soft tufts of fine light grey-green needles, an open airy lumpy mass with small sky gaps, sunlit tips paler, darker beneath, spiky needle outline. The whole clump inside the frame with a margin, no shadows on the background, photographic.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_scotspine_clump: generated("real-scotspine-clump", ["real-scotspine-clump-1.png", "real-scotspine-clump-2.png"], "Scots pine foliage clump", "One dense rounded clump of mature Scots pine (Pinus sylvestris) foliage seen from the side: short twisted blue-green needles in pairs, packed in brushes at the ends of many short upturned shoots on a thin orange-brown branch, forming a lumpy rounded mass about 1.5 m across with small gaps, sunlit tops lighter blue-green, dark underneath, a spiky needle outline. Square. Pure flat magenta #FF00FF background with no gradient and no shadow, the whole subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight from above.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_cypress_pad: generated("real-cypress-pad", ["real-cypress-pad-1.png", "real-cypress-pad-2.png"], "Monterey cypress foliage pad", "One flat-topped pad of Monterey cypress (Hesperocyparis macrocarpa) foliage seen from the side, like a wind-shaped shelf on a coastal tree: very dense rope-like cords of tiny scale leaves branching in all directions (not flat fern-like sprays), packed into a lumpy shelf flat on top and flat underneath, bright dark green on the sunlit top, near-black green beneath, a few crooked grey-brown twigs under its base. Wide 2:1. Pure flat magenta #FF00FF background with no gradient and no shadow, the whole subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight from above.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_stonepine_bark: generated("real-stonepine-bark-1", "real-stonepine-bark-1.png", "Stone pine bark", "Mature Italian stone pine (Pinus pinea) trunk bark: thick flat reddish-brown to orange-brown plates separated by deep dark grey-brown vertical fissures, the plate faces paler and flaking at their edges. Fill the whole frame edge to edge, straight-on, even diffuse light, no shadows, no perspective, no trunk edges visible, photographic scan quality.", { ...NANO_ANTIGRAVITY, crop: { x: 0.5, size: 1, overlap: 0.16 } }),
  // The fifth batch: the owner's pictures for gorse, hawthorn, black alder, Lombardy poplar, California sycamore and
  // coast live oak (Nano Banana via Antigravity, 2026-11-24; the prompts as given in tools/ai-textures/PROMPTS.md: each
  // subject's own words, then the shared rules for its kind).
  ai_gorse_sprig: generated("real-gorse-sprig", ["real-gorse-sprig-1.png", "real-gorse-sprig-2.png"], "Gorse sprig in flower", "One cut sprig of common gorse (Ulex europaeus) laid flat, about 30 cm long: dense dark green rigid spines 1 to 2.5 cm long all along green stems, branching, with clusters of bright yellow pea-like flowers along the upper half. Pure flat magenta #FF00FF background with no gradient and no shadow, the whole subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight from above.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_hawthorn_leaves: generated("real-hawthorn-leaves", ["real-hawthorn-leaves-1.png", "real-hawthorn-leaves-2.png"], "Hawthorn leaves", "Ten common hawthorn (Crataegus monogyna) leaves laid flat: small, 3 to 5 cm, glossy mid green, deeply cut into 3 to 7 narrow lobes reaching almost to the midrib, a wedge-shaped base and a short stalk. Laid flat and photographed from directly above like a botanical herbarium scan, leaves upright, side by side, not touching. Pure flat magenta #FF00FF background with no gradient and no shadow, the whole subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight from above.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_alder_leaves: generated("real-alder-leaves", ["real-alder-leaves-1.png", "real-alder-leaves-2.png"], "Black alder leaves", "Ten black alder (Alnus glutinosa) leaves laid flat: 5 to 9 cm, almost round with a flat or slightly notched tip, double-toothed edges, dark glossy green, 6 to 8 pairs of straight parallel veins, a short stalk. Laid flat and photographed from directly above like a botanical herbarium scan, leaves upright, side by side, not touching. Pure flat magenta #FF00FF background with no gradient and no shadow, the whole subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight from above.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_sycamore_leaves: generated("real-sycamore-leaves", ["real-sycamore-leaves-1.png", "real-sycamore-leaves-2.jpg"], "California sycamore leaves", "Six California sycamore (Platanus racemosa) leaves laid flat: 15 to 25 cm, star-shaped, deeply cut into 3 to 5 long pointed lobes reaching halfway to the base, edges mostly smooth with a few teeth, mid green on top with a soft pale fuzzy underside showing on two of them, a stalk with a swollen base. Laid flat and photographed from directly above like a botanical herbarium scan, leaves upright, side by side, not touching. Pure flat magenta #FF00FF background with no gradient and no shadow, the whole subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight from above.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true, sameScale: true }),
  ai_poplar_leaves: generated("real-poplar-leaves", ["real-poplar-leaves-1.jpg", "real-poplar-leaves-2.jpg"], "Lombardy poplar leaves", "Ten Lombardy poplar (Populus nigra 'Italica') leaves laid flat: 5 to 8 cm, triangular to diamond-shaped, wider than long, with a long tapering tip, finely and regularly toothed edges, bright glossy green, a long flattened stalk. Laid flat and photographed from directly above like a botanical herbarium scan, leaves upright, side by side, not touching. Pure flat magenta #FF00FF background with no gradient and no shadow, the whole subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight from above.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  // (Both barks shade darker towards their sides, as a trunk's curve does: the middle cut out, a little larger than the
  // tile, before it is made to tile.)
  ai_alder_bark: generated("real-alder-bark-3", "real-alder-bark-3.png", "Black alder bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Black alder bark (square): dark grey-brown to almost black, broken into small rough square-ish plates by shallow fissures, a few pale lichen spots. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.8, overlap: 0.16 } }),
  ai_liveoak_bark: generated("real-liveoak-bark-3", "real-liveoak-bark-3.png", "Coast live oak bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Coast live oak bark (square): smooth light grey to grey-brown, broken by shallow irregular vertical furrows into broad flat ridges, patches of pale green and grey lichen. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.8, overlap: 0.16 } }),
  // And six more of the owner's pictures (Nano Banana via Antigravity, 2026-11-24/25): each from one shared header for its
  // kind (a leaf sheet's, a bark's: tools/ai-textures/PROMPTS.md) and its subject's own words.
  ai_birch_leaves: generated("real-birch-leaves", ["real-birch-leaves-1.png", "real-birch-leaves-2.png"], "Silver birch leaves", "Silver birch leaves (square): twelve leaves, each 3 to 6 cm, triangular to diamond-shaped with a long pointed tip and a broad straight base, sharply double-toothed edges, fresh mid green, a thin stalk. As a top-down botanical herbarium scan on a pure flat magenta background with no gradient and no shadow, everything fully inside the frame with a clear margin, nothing else in frame, no text, photographic, even light; leaves laid flat, upright, side by side, not touching.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  ai_willow_leaves: generated("real-willow-leaves", ["real-willow-leaves-1.png", "real-willow-leaves-2.png"], "Weeping willow leaves", "Weeping willow leaves (square): twelve long, very narrow leaves, 8 to 15 cm long and 1 to 2 cm wide, tapering to a fine point, finely toothed edges, bright green on top; three of them upside down showing the paler grey-green underside. As a top-down botanical herbarium scan on a pure flat magenta background with no gradient and no shadow, everything fully inside the frame with a clear margin, nothing else in frame, no text, photographic, even light; leaves laid flat, upright, side by side, not touching.", { ...NANO_ANTIGRAVITY, key: "magenta", unmix: true }),
  // (Its finer, softer, droopier shoots (-3, -4), asked for after the first two (-1, -2), which were stiffer: those left out.)
  ai_whitepine_shoot: generated("real-whitepine-shoot", ["real-whitepine-shoot-3.png", "real-whitepine-shoot-4.png"], "Eastern white pine shoots", "A top-down botanical scan of one eastern white pine (Pinus strobus) shoot laid flat on a pure flat magenta background with no gradient and no shadow, tall portrait format: a slender brown twig ending in a loose, soft, drooping brush of very fine, thin, flexible blue-green needles, each needle 8 to 12 cm long and as thin as a hair, in bundles of five, the needles hanging and fanning softly like a feathery tassel, not stiff or bristly, the whole shoot about 30 cm long, fully inside the frame with a margin. No text, photographic, even light.", { ...NANO_ANTIGRAVITY, date: "2026-11-25", key: "magenta", unmix: true }),
  ai_redoak_bark: generated("real-redoak-bark-1", "real-redoak-bark-1.png", "Northern red oak bark", "A straight-on photographic texture of mature northern red oak (Quercus rubra) trunk bark, filling the whole square frame edge to edge: dark grey to grey-brown, with long, wide, flat-topped shiny grey ridges running straight up the trunk like ski tracks, separated by shallow darker furrows. Even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...NANO_ANTIGRAVITY, date: "2026-11-25", crop: { x: 0.5, size: 0.8, overlap: 0.16 } }),
  ai_birch_foot_bark: generated("real-birch-foot-bark-1", "real-birch-foot-bark-1.png", "Silver birch bark at the foot of an old trunk", "Silver birch bark from the base of an old trunk (square): thick rough blackish-grey bark broken by deep vertical fissures into rugged ridges, with a few small patches of white papery bark showing between the ridges. As a straight-on photographic texture filling the whole square frame edge to edge, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...NANO_ANTIGRAVITY, crop: { x: 0.5, size: 0.8, overlap: 0.16 } }),
  ai_willow_bark: generated("real-willow-bark-1", "real-willow-bark-1.png", "Weeping willow bark", "Weeping willow bark (square): grey-brown, deeply furrowed into long thick interlacing vertical ridges forming a coarse net-like pattern. As a straight-on photographic texture filling the whole square frame edge to edge, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...NANO_ANTIGRAVITY, crop: { x: 0.5, size: 0.8, overlap: 0.16 } }),
  ai_poplar_bark: generated("real-poplar-bark-1", "real-poplar-bark-1.png", "Lombardy poplar bark", "Lombardy poplar bark (square): dark grey, deeply and roughly furrowed into thick vertical ridges, with a few rounded burrs. As a straight-on photographic texture filling the whole square frame edge to edge, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...NANO_ANTIGRAVITY, crop: { x: 0.5, size: 0.8, overlap: 0.16 } }),
  ai_torreypine_bark: generated("real-torreypine-bark-3", "real-torreypine-bark-3.png", "Torrey pine bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Torrey pine bark (square): deeply furrowed into broad flat reddish-brown to grey-brown scaly plates, darker in the furrows. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.8, overlap: 0.16 } }),
  ai_maple_bark: generated("real-maple-bark-3", "real-maple-bark-3.png", "Sugar maple bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Sugar maple bark (square): grey to grey-brown, broken into long irregular vertical plates that curl away from the trunk at one edge, shaggy, with dark furrows between them. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.8, overlap: 0.16 } }),
  // The conifer batch: barks and shoots for the conifers that borrowed another's (Nano Banana via Antigravity,
  // 2026-11-25; 2048-pixel barks, 1536 x 2730 shoots; each bark's `-1` used, its near twin `-2` kept spare, and both of
  // each shoot's, two leaves to a set at the least, mirrored and turned apart on the cards; the prompts as given
  // in tools/ai-textures/PROMPTS.md: the subject's own words, then the shared rule for its kind).
  ai_montereypine_bark: generated("real-montereypine-bark-1", "real-montereypine-bark-1.png", "Monterey pine bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Monterey pine bark (square): very thick dark grey-brown to almost black bark, deeply furrowed into long rough ridges, reddish-brown in the bottoms of the furrows. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.9, overlap: 0.16 } }),
  ai_aleppo_bark: generated("real-aleppo-bark-1", "real-aleppo-bark-1.png", "Aleppo pine bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Aleppo pine bark (square): on an old trunk, deeply fissured dark grey-brown to reddish-brown bark broken into broad flat irregular plates. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.9, overlap: 0.16 } }),
  ai_corsican_bark: generated("real-corsican-bark-1", "real-corsican-bark-1.png", "Corsican pine bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Corsican pine bark (square): dark grey to almost black bark broken into long irregular scaly plates by deep fissures, the plate faces lighter grey and slightly pinkish. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.9, overlap: 0.16 } }),
  ai_whitepine_bark: generated("real-whitepine-bark-1", "real-whitepine-bark-1.png", "Eastern white pine bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Eastern white pine bark (square): mature dark grey bark deeply furrowed into long narrow rectangular ridges with flat tops, a few purplish-brown patches. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.9, overlap: 0.16 } }),
  ai_sitka_bark: generated("real-sitka-bark-1", "real-sitka-bark-1.png", "Sitka spruce bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Sitka spruce bark (square): thin grey bark flaking in small rounded loose scales like a scattering of coins, reddish-brown beneath the scales. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.9, overlap: 0.16 } }),
  ai_whitespruce_bark: generated("real-whitespruce-bark-1", "real-whitespruce-bark-1.png", "White spruce bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. White spruce bark (square): thin grey bark broken into small flaky scales, a few resin spots, pale silvery-grey to light brown. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.9, overlap: 0.16 } }),
  ai_cypress_bark: generated("real-cypress-bark-1", "real-cypress-bark-1.png", "Monterey cypress bark", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Monterey cypress bark (square): old trunk bark, grey to reddish-brown, made of long fibrous vertical strips and ridges, slightly shaggy, with lichen patches. As a straight-on photographic texture filling the whole square frame edge to edge, very sharp, fine detail, even diffuse light, no shadows, no perspective, no trunk edges visible.", { ...REGEN_2048, crop: { x: 0.5, size: 0.9, overlap: 0.16, streaks: true } }),
  ai_sitka_shoot: generated("real-sitka-shoot", ["real-sitka-shoot-1.png", "real-sitka-shoot-2.png"], "Sitka spruce shoot", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Sitka spruce shoot (tall portrait): one branch tip with stiff, sharp, flattened blue-green needles 2 cm long standing out all round the twig, silvery-white underside showing on some. As a top-down photograph like a botanical scan on a pure flat magenta background with no gradient and no shadow, the whole subject fully inside the frame with a clear margin, nothing else in frame, no text, very sharp, even light.", { ...REGEN_2048, key: "magenta", unmix: true }),
  ai_whitespruce_shoot: generated("real-whitespruce-shoot", ["real-whitespruce-shoot-1.png", "real-whitespruce-shoot-2.png"], "White spruce shoot", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. White spruce shoot (tall portrait): one branch tip with short stiff four-sided blue-green needles about 1.5 cm long crowded on the upper side of the twig, slightly curved. As a top-down photograph like a botanical scan on a pure flat magenta background with no gradient and no shadow, the whole subject fully inside the frame with a clear margin, nothing else in frame, no text, very sharp, even light.", { ...REGEN_2048, key: "magenta", unmix: true }),
  ai_douglas_shoot: generated("real-douglas-shoot", ["real-douglas-shoot-1.png", "real-douglas-shoot-2.png"], "Douglas fir shoot", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Douglas fir shoot (tall portrait): one branch tip with soft flat needles 2 to 3 cm long spreading all round the twig like a bottle brush, yellow-green to dark green, two pale lines underneath, a pointed brown bud at the tip. As a top-down photograph like a botanical scan on a pure flat magenta background with no gradient and no shadow, the whole subject fully inside the frame with a clear margin, nothing else in frame, no text, very sharp, even light.", { ...REGEN_2048, key: "magenta", unmix: true }),
  ai_corsican_shoot: generated("real-corsican-shoot", ["real-corsican-shoot-1.png", "real-corsican-shoot-2.png"], "Corsican pine shoot", "Make every image at the highest resolution you can (at least 2048 pixels on the long side) and as PNG. Corsican pine shoot (tall portrait): one stout twig ending in a dense brush of long, stiff, straight dark green needles in pairs, 10 to 15 cm long, spreading forward. As a top-down photograph like a botanical scan on a pure flat magenta background with no gradient and no shadow, the whole subject fully inside the frame with a clear margin, nothing else in frame, no text, very sharp, even light.", { ...REGEN_2048, key: "magenta", unmix: true }),
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
    source: "ai_eucalyptus_bark",
    look: "a blue gum's lower stem: cream, blue-grey and yellow-green patches under strips of rough brown bark peeling away",
    for: ["Eucalyptus"],
    // Smooth patches 5–30 cm and ribbons a metre and more on a blue gum (MORPHOLOGY.md): the patches here span
    // a twentieth to a sixth of the tile, the strips up to half its height. (The tile is the picture's middle
    // 84 %, the rest its overlap: so for all the generated barks here.)
    tileCm: [85, 85],
    tileFrom: "estimated: patches ~5–17 cm, strips up to ~50 cm long, a blue gum's patches 5–30 cm",
    delight: 0.6,
  },
  {
    id: "eucalyptusUpper",
    source: "ai_eucalyptus_bark_upper",
    look: "a blue gum's smooth upper stem: cream, blue-grey and yellow-green patches, a few ribbons of brown bark hanging",
    for: ["Eucalyptus"],
    // Smooth patches 5–30 cm on a blue gum's upper stem (MORPHOLOGY.md): some five or six across the tile here.
    tileCm: [85, 85],
    tileFrom: "estimated: ~5–6 patches across, a blue gum's smooth patches 5–30 cm",
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
    source: "ai_beech_bark",
    look: "smooth silver-grey skin, darker mottling, small horizontal lenticels and lichen spots",
    for: ["Beech"],
    // A beech's lenticels 0.5–2 cm long, longer on an old stem: some 15–30 texels of the 860 here. (At 50 cm its
    // mottling repeated in columns round a trunk: taken at the long end.)
    tileCm: [85, 85],
    tileFrom: "estimated: lenticels ~1.5–3 cm long, a beech's 0.5–2 cm on a young stem, longer on an old",
    delight: 0.85,
  },
  {
    id: "birch",
    source: "ai_birch_bark",
    look: "white papery bark, dark horizontal lenticels, curling strips, a dark branch-scar eye, black diamond fissures (laid in by the build)",
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
    for: ["Oak", "Hawthorn"],
    // An oak's ridges 2–6 cm wide (MORPHOLOGY.md): about eight across this tile's width.
    tileCm: [35, 70],
    tileFrom: "estimated: ~8 ridges across, an oak's ridges 2–6 cm",
    delight: 0.5,
  },
  {
    id: "ridged",
    source: "bark_willow_02",
    look: "grey-brown interlacing furrows and corky ridges",
    for: ["California sycamore", "Shrub", "Gorse"],
    delight: 0.6,
  },
  {
    id: "pine",
    source: "pine_bark",
    look: "red-brown plates between dark fissures",
    for: ["Scots pine"],
    delight: 0.6,
  },
  {
    id: "pineFlakes",
    source: "ai_scotspine_upper",
    look: "thin papery flakes, copper-orange, peeling in small curls (a Scots pine's upper stem and limbs)",
    for: ["Scots pine"],
    // A Scots pine's upper flakes 1–5 cm (MORPHOLOGY.md): most here 30–80 texels of the 860 (the 2048-pixel picture's
    // flakes are smaller in it than the first's).
    tileCm: [45, 45],
    tileFrom: "estimated: flakes ~1.5–4 cm, a Scots pine's upper flakes 1–5 cm",
    delight: 0.6,
  },
  {
    id: "spruce",
    source: "spruce",
    look: "small thin grey scales with orange-brown flakes",
    for: ["Spruce"],
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
    for: ["Western red cedar"],
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
  {
    id: "stonePine",
    source: "ai_stonepine_bark",
    look: "thick flat reddish-brown plates between deep grey-brown fissures (an old stone pine's)",
    for: ["Stone pine"],
    // (An old stone pine's plates 10–25 cm wide and longer than wide: some seven across the 860 texels here.)
    tileCm: [120, 120],
    tileFrom: "estimated: plates ~12–20 cm wide, an old stone pine's 10–25 cm",
    delight: 0.6,
  },
  {
    id: "alder",
    source: "ai_alder_bark",
    look: "dark grey-brown to near black, broken into small rough squarish plates by shallow fissures, a few lichen spots (an old black alder's)",
    for: ["Black alder"],
    // (An old black alder's plates 2–5 cm (MORPHOLOGY.md): some sixteen across the tile here.)
    tileCm: [50, 50],
    tileFrom: "estimated: ~16 plates across, an old black alder's 2–5 cm",
    delight: 0.7,
  },
  {
    id: "liveOak",
    source: "ai_liveoak_bark",
    look: "smooth light grey to grey-brown, broad flat ridges between shallow vertical furrows, pale green and grey lichen (an old coast live oak's)",
    for: ["Coast live oak"],
    // (Broad lighter-grey ridges between deep furrows on an old coast live oak (MORPHOLOGY.md): some seven across the
    // tile here, each 6–10 cm.)
    tileCm: [60, 60],
    tileFrom: "estimated: ~7 broad ridges across, an old coast live oak's ridges several cm wide",
    delight: 0.7,
  },
  {
    id: "birchFoot",
    source: "ai_birch_foot_bark",
    look: "thick rough blackish-grey bark in rugged ridges between deep vertical fissures, a few white papery patches between them (an old silver birch's foot)",
    for: ["Silver birch"],
    // (An old birch's foot: ridges some 3–6 cm wide, about eight across the tile here.)
    tileCm: [45, 45],
    tileFrom: "estimated: ~8 ridges across, an old silver birch's rugged foot",
    delight: 0.7,
  },
  {
    id: "willow",
    source: "ai_willow_bark",
    look: "grey-brown, deeply furrowed into long thick interlacing ridges, a coarse net (a weeping willow's)",
    for: ["Weeping willow"],
    // (A willow's corky ridges 2–5 cm wide: some twelve across the tile here.)
    tileCm: [55, 55],
    tileFrom: "estimated: ~12 interlacing ridges across, a willow's 2–5 cm",
    delight: 0.7,
  },
  {
    id: "poplar",
    source: "ai_poplar_bark",
    look: "dark grey, deeply and roughly furrowed into thick vertical ridges, a few rounded burrs (a Lombardy poplar's)",
    for: ["Lombardy poplar"],
    // (Thick ridges, about seven across, and burrs a hand across: a black poplar's burred trunk.)
    tileCm: [60, 60],
    tileFrom: "estimated: ~7 thick ridges across, burrs ~8–10 cm",
    delight: 0.7,
  },
  {
    id: "torreyPine",
    source: "ai_torreypine_bark",
    look: "broad flat reddish-brown to grey-brown scaly plates between deep furrows (a Torrey pine's)",
    for: ["Torrey pine"],
    // (Broad plates 8–15 cm across: some six across the tile here.)
    tileCm: [75, 75],
    tileFrom: "estimated: ~6 broad plates across, an old pine's 8–15 cm",
    delight: 0.6,
  },
  {
    id: "redOak",
    source: "ai_redoak_bark",
    look: "long wide flat-topped grey ridges running straight up between shallow darker furrows, ski tracks (an old northern red oak's)",
    for: ["Red oak"],
    // (A red oak's ski-track ridges 4–8 cm wide: some seven across the tile here.)
    tileCm: [55, 55],
    tileFrom: "estimated: ~7 flat ridges across, a red oak's 4–8 cm",
    delight: 0.7,
  },
  {
    id: "maple",
    source: "ai_maple_bark",
    look: "grey to grey-brown, long irregular vertical plates curling away at one edge, shaggy, dark furrows between (an old sugar maple's)",
    for: ["Sugar maple"],
    // (An old sugar maple's plates 3–8 cm wide and long: some ten across the tile here.)
    tileCm: [55, 55],
    tileFrom: "estimated: ~10 plates across, an old sugar maple's 3–8 cm",
    delight: 0.7,
  },
  {
    id: "montereyPine",
    source: "ai_montereypine_bark",
    look: "very thick dark grey-brown to near black bark, long rough ridges between deep furrows, reddish in their bottoms (an old Monterey pine's)",
    for: ["Monterey pine"],
    // (An old Monterey pine's long rectangular scaly ridges (MORPHOLOGY.md) 5–10 cm wide: some seven across the tile here.)
    tileCm: [60, 60],
    tileFrom: "estimated: ~7 ridges across, an old Monterey pine's 5–10 cm",
    delight: 0.6,
  },
  {
    id: "aleppoPine",
    source: "ai_aleppo_bark",
    look: "dark grey-brown to reddish-brown, broad flat irregular plates between deep fissures (an old Aleppo pine's)",
    for: ["Aleppo pine"],
    // (An old Aleppo pine's scaly plates (MORPHOLOGY.md) 5–10 cm: some eight across the tile here.)
    tileCm: [60, 60],
    tileFrom: "estimated: ~8 plates across, an old Aleppo pine's 5–10 cm",
    delight: 0.6,
  },
  {
    id: "corsicanPine",
    source: "ai_corsican_bark",
    look: "dark grey to near black, long irregular scaly plates between deep fissures, their faces paler grey and pinkish (an old Corsican pine's)",
    for: ["Corsican pine"],
    // (An old Corsican pine's large plates (MORPHOLOGY.md) 10–20 cm wide: some five across the tile here.)
    tileCm: [75, 75],
    tileFrom: "estimated: ~5 plates across, an old Corsican pine's 10–20 cm",
    delight: 0.6,
  },
  {
    id: "whitePine",
    source: "ai_whitepine_bark",
    look: "dark grey, long narrow flat-topped rectangular ridges between deep furrows, a few purplish-brown patches (an old eastern white pine's)",
    for: ["Eastern white pine"],
    // (An old white pine's long ridges (MORPHOLOGY.md) 2–5 cm wide: some fourteen across the tile here.)
    tileCm: [50, 50],
    tileFrom: "estimated: ~14 ridges across, an old white pine's 2–5 cm",
    delight: 0.6,
  },
  {
    id: "sitkaSpruce",
    source: "ai_sitka_bark",
    look: "thin grey bark flaking in small round loose scales like coins, reddish-brown beneath (a Sitka spruce's)",
    for: ["Sitka spruce"],
    // (A Sitka spruce's scales 3–10 cm (the spruce set's note): some twenty across the tile here, taken at the small end,
    // as on a stem of the size a course has.)
    tileCm: [70, 70],
    tileFrom: "estimated: ~20 scales across, a Sitka spruce's 3–10 cm",
    delight: 0.6,
  },
  {
    id: "whiteSpruce",
    source: "ai_whitespruce_bark",
    look: "thin pale silvery-grey to light brown bark in small flaky scales, a few resin spots (a white spruce's)",
    for: ["White spruce"],
    // (A white spruce's scales 1–3 cm (MORPHOLOGY.md): some thirty across the tile here.)
    tileCm: [50, 50],
    tileFrom: "estimated: ~30 scales across, a white spruce's 1–3 cm",
    delight: 0.6,
  },
  {
    id: "cypress",
    source: "ai_cypress_bark",
    look: "grey to reddish-brown, long fibrous vertical strips and ridges, a little shaggy, lichen patches (an old Monterey cypress's)",
    for: ["Monterey cypress"],
    // (A Monterey cypress's long shallow fibrous ridges (MORPHOLOGY.md) 2–5 cm: some twelve across the tile here.)
    tileCm: [50, 50],
    tileFrom: "estimated: ~12 strips across, a Monterey cypress's 2–5 cm",
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
/** Which way each leaf's stalk points on its sheet, by its order there, where some lie upside down: the alder's and the hawthorn's second pictures each have two in their top row. */
const ALDER_BASES = ["down", "down", "down", "down", "up", "down", "up", "down"];
const HAWTHORN_BASES = ["down", "down", "down", "down", "up", "down", "up", "down"];

export const LEAVES = [
  { id: "oak", source: "LeafSet016", look: "lobed oak leaves", for: ["Oak"], base: "down", px: 320, lengthCm: 11 },
  { id: "redOak", source: "LeafSet030", look: "bristle-lobed red oak leaves (autumn colours, kept as lightness only)", for: ["Red oak"], base: "right", px: 288, lengthCm: 17, tone: true },
  { id: "maple", source: "LeafSet010", look: "palmate maple leaves", for: ["Sugar maple"], base: "down", px: 352, lengthCm: 16 },
  // (Six leaves to each of two pictures: the first row of each and two more, as the sheet holds eight.)
  { id: "londonPlane", source: "ai_plane_leaves", look: "broad London plane leaves, three big pointed lobes and two small, sparse coarse teeth, stalks swollen at the base", for: ["Plane"], base: "down", px: 288, lengthCm: 30 },
  { id: "round", source: "LeafSet009", look: "round leaves, toothed", for: ["a host's species (none of the library's now)"], base: "down", px: 288, lengthCm: 9 },
  { id: "deltoid", source: "LeafSet004", look: "triangular leaves on long stalks", for: ["a host's species (none of the library's now)"], base: "down", px: 320, lengthCm: 10 },
  { id: "serrate", source: "LeafSet014", look: "ovate leaves, finely toothed, straight veins", for: ["a host's species (none of the library's now)"], base: "down", px: 320, lengthCm: 9 },
  { id: "beech", source: "LeafSet024", look: "oval leaves with wavy margins and straight veins", for: ["Beech"], base: "down", px: 288, lengthCm: 9 },
  { id: "elliptic", source: "LeafSet003", look: "elliptic leaves, toothed", for: ["Shrub"], base: "down", px: 320, lengthCm: 7 },
  { id: "liveOak", source: "ai_liveoak_leaves", look: "small cupped holly-like coast live oak leaves, spiny-toothed, glossy dark green", for: ["Coast live oak"], base: "down", px: 256, lengthCm: 6 },
  { id: "lance", source: "LeafSet013", look: "narrow lanceolate leaves", for: ["a host's narrow-leaved species (none of the library's now)"], base: "down", px: 384, lengthCm: 12, skip: [2, 4, 5] },
  { id: "scale", source: "LeafSet019", look: "sprays of scale leaves", for: ["Western red cedar"], base: "left", px: 448, lengthCm: 18, deskew: false },
  // (Each picture one branchlet: one to a sprite.)
  { id: "cypress", source: "ai_cypress_spray", look: "Monterey cypress branchlets of scale leaves, dense, dark green", for: ["Monterey cypress"], base: "down", px: 512, lengthCm: 30, deskew: false, whole: true },
  {
    id: "pine",
    source: "pine_tree_01",
    look: "pine shoots with their needles",
    for: ["Scots pine", "Monterey pine", "Aleppo pine", "Stone pine"],
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
    for: ["Spruce"],
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
  // (Each picture one shoot, its needles apart: one to a sprite. Needles 20–30 cm, about half the shoot.)
  // (A pine's cushions and clumps, each picture one whole, seen from the side, its flat base down: laid one to a
  // big card, sprays.ts `drawCushionCard`. Its length the picture's height; sized to fill the sheet's width.)
  { id: "stonePineCushion", source: "ai_stonepine_cushion", look: "one dense stone pine cushion seen from the side, flat beneath, domed above, lit on top", for: ["Stone pine"], base: "down", px: 440, lengthCm: 100, deskew: false, whole: true },
  { id: "stonePineCanopy", source: "ai_stonepine_canopy", look: "a strip of stone pine canopy: several cushions side by side, crooked branches beneath", for: ["Stone pine"], base: "down", px: 210, lengthCm: 150, deskew: false, whole: true },
  { id: "pineClumpDark", source: "ai_pine_clump_dark", look: "a dense dark Monterey pine clump of stout needle brushes", for: ["Monterey pine"], base: "down", px: 512, lengthCm: 150, deskew: false, whole: true },
  { id: "pineClumpLight", source: "ai_pine_clump_light", look: "an open grey-green Aleppo pine clump, its twigs showing", for: ["Aleppo pine"], base: "down", px: 512, lengthCm: 150, deskew: false, whole: true },
  { id: "scotsPineClump", source: "ai_scotspine_clump", look: "a dense blue-green Scots pine clump of short paired needles on a thin orange-brown branch", for: ["Scots pine"], base: "down", px: 512, lengthCm: 150, deskew: false, whole: true },
  { id: "cypressPad", source: "ai_cypress_pad", look: "a flat-topped Monterey cypress shelf of dense scale-leaf cords, flat beneath", for: ["Monterey cypress"], base: "down", px: 220, lengthCm: 90, deskew: false, whole: true },
  { id: "torreyPine", source: "ai_torrey_shoot", look: "Torrey pine shoots: a stout twig ending in a brush of long grey-green needles", for: ["Torrey pine"], base: "down", px: 512, lengthCm: 50, deskew: false, whole: true },
  // (Two pictures each, set side by side: the first eight leaves in reading order, along both pictures' top rows.)
  { id: "hawthorn", source: "ai_hawthorn_leaves", look: "small hawthorn leaves deeply cut into three to seven narrow lobes, a wedge-shaped base", for: ["Hawthorn"], base: "down", px: 256, lengthCm: 5, bases: HAWTHORN_BASES },
  { id: "alder", source: "ai_alder_leaves", look: "almost round black alder leaves, flat or notched at the tip, double-toothed, straight parallel veins, dark glossy green", for: ["Black alder"], base: "down", px: 288, lengthCm: 9, bases: ALDER_BASES },
  { id: "sycamore", source: "ai_sycamore_leaves", look: "star-shaped California sycamore leaves, three to five long pointed lobes, a few showing the pale fuzzy underside", for: ["California sycamore"], base: "down", px: 352, lengthCm: 25, skip: [7, 10] },
  { id: "poplar", source: "ai_poplar_leaves", look: "triangular to diamond-shaped Lombardy poplar leaves with a long tapering tip, finely toothed, on long flattened stalks", for: ["Lombardy poplar"], base: "down", px: 288, lengthCm: 11 },
  // (The birch's and the willow's two pictures, side by side: the first eight in reading order, along both top rows; two
  // of the willow's eight show their pale undersides.)
  { id: "birch", source: "ai_birch_leaves", look: "silver birch leaves, triangular to diamond-shaped, a long pointed tip, sharply double-toothed, on thin stalks", for: ["Silver birch"], base: "down", px: 288, lengthCm: 8 },
  { id: "willow", source: "ai_willow_leaves", look: "long very narrow weeping willow leaves, finely toothed, two of them showing the pale grey-green underside", for: ["Weeping willow"], base: "down", px: 448, lengthCm: 14 },
  // (Each picture one shoot, its brush of needles at its end: laid one to a tuft, sprays.ts `tuftPicture`.)
  // (The conifer batch's shoots, each picture one branch tip, one to a sprite: a spruce's and a Douglas fir's whole
  // sprays, as a cypress's are; a Corsican pine's brush, laid one to a tuft, as a white pine's.)
  { id: "sitkaShoot", source: "ai_sitka_shoot", look: "a Sitka spruce branch tip: stiff sharp flattened blue-green needles all round the twig, side shoots", for: ["Sitka spruce"], base: "down", px: 512, lengthCm: 28, deskew: false, whole: true },
  { id: "whiteSpruceShoot", source: "ai_whitespruce_shoot", look: "a white spruce branch tip: short stiff blue-green needles crowded on the twig's upper side", for: ["White spruce"], base: "down", px: 512, lengthCm: 22, deskew: false, whole: true },
  { id: "douglasShoot", source: "ai_douglas_shoot", look: "a Douglas fir branch tip: soft flat yellow-green needles all round the twig like a bottle brush, a pointed brown bud", for: ["Douglas fir"], base: "down", px: 512, lengthCm: 25, deskew: false, whole: true },
  { id: "corsicanShoot", source: "ai_corsican_shoot", look: "a Corsican pine shoot: a stout twig ending in a dense brush of long stiff straight dark green needles in pairs", for: ["Corsican pine"], base: "down", px: 512, lengthCm: 32, deskew: false, whole: true },
  { id: "whitePine", source: "ai_whitepine_shoot", look: "eastern white pine shoots: a slender twig ending in a soft feathery brush of fine blue-green needles", for: ["Eastern white pine"], base: "down", px: 448, lengthCm: 30, deskew: false, whole: true },
  // (Each picture one sprig: one to a sprite. Its yellow flowers kept as such: sprays.ts `Layer.flower`.)
  { id: "gorse", source: "ai_gorse_sprig", look: "a spiny gorse sprig, clusters of yellow pea flowers along its upper half", for: ["Gorse"], base: "down", px: 512, lengthCm: 30, deskew: false, whole: true },
  { id: "frond", source: "ai_canary_frond", look: "a whole feather-shaped palm frond", for: ["Canary date palm", "Queen palm"], base: "down", px: 640, lengthCm: 450, deskew: false },
  { id: "blade", source: "Foliage001", look: "long narrow blades (a palm's leaflets)", for: ["Mexican fan palm", "California fan palm"], base: "down", px: 512, lengthCm: 40, skip: [8] },
  // The palms' whole leaves, each one to a picture (palm.ts lays them on its own fronds).
  { id: "fan", source: "ai_fan_leaf", look: "a whole fan palm leaf on a piece of its stalk", for: ["Mexican fan palm", "California fan palm"], base: "down", px: 896, lengthCm: 160, deskew: false, whole: true },
  { id: "fanB", source: "ai_fan_leaf_b", look: "a whole fan palm leaf, a second", for: ["Mexican fan palm", "California fan palm"], base: "down", px: 896, lengthCm: 160, deskew: false, whole: true },
  { id: "deadFronds", source: "ai_dead_fronds", look: "dead fan leaves hanging side by side (a skirt)", for: ["Mexican fan palm", "California fan palm"], base: "down", px: 960, lengthCm: 250, deskew: false, whole: true },
  { id: "queenFrond", source: "ai_queen_frond", look: "a whole plumose queen palm frond", for: ["Queen palm"], base: "down", px: 960, lengthCm: 400, deskew: false, whole: true },
  { id: "paintFrond", source: "ai_paint_frond", look: "a painted feather palm frond (the painterly looks')", for: ["Canary date palm", "Queen palm"], base: "down", px: 960, lengthCm: 450, deskew: false, whole: true },
  { id: "paintFan", source: "ai_paint_fan", look: "a painted fan palm leaf (the painterly looks')", for: ["Mexican fan palm", "California fan palm"], base: "down", px: 896, lengthCm: 160, deskew: false, whole: true },
];
