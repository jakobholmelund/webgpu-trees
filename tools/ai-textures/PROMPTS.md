# AI texture prompts

Prompts for the textures no scan covers, and for the painterly look's leaf
marks. Generate with Nano Banana (`gemini-nano-banana-2.1` or the newest Gemini
image model). The pilot of 2026-11-24 came from these (birch, eucalyptus,
Canary palm frond and trunk, two painterly clusters, two painterly boughs).

## Rules for every image

- **Save to** `tools/ai-textures/raw/`, named exactly as the heading's
  `file:` says, with `-1`, `-2` … for each variation you keep
  (e.g. `painterly-broad-a-1.png`). PNG, the model's full size.
- **Keep 2–4 variations** of each; delete ones with text, frames, shadows on
  the background, cropped edges or leaves touching the border.
- **Cut-outs** (leaves, sprays, clusters, boughs) go on a **pure flat magenta
  #FF00FF** background: no gradient, no shadow, nothing else in frame, a clear
  margin all round. The build keys the magenta out.
- **Tiles** (bark) fill the frame edge to edge, straight-on, even light, no
  shadows or perspective; they are made seamless afterwards.
- Square 1:1 unless the heading says otherwise (if the model returns 16:9,
  that's fine: the build crops).

## Painterly look (hand-painted, crisp, game texture)

All painterly prompts share this style line, already in each prompt: hand-painted
stylized game foliage like a Ghibli-inspired stylized game, crisp clean-edged
leaves, soft painted gradients, warm yellow-green on the sunlit top, cooler
teal-green in the shade beneath, no outlines, no text.

### Broad-leaved clusters — file: `painterly-broad-a`, `painterly-broad-b`, `painterly-broad-c`
A hand-painted stylized leaf cluster for a game tree, on a pure flat magenta #FF00FF background, square. A lumpy rounded clump of about 30 crisp oval broadleaf leaves (like oak, beech or lime), overlapping in two or three lobes, leaf tips standing out around the whole outline; warm yellow-green on the sunlit top, cooler teal-green in the shade beneath, soft painted gradients, a few lighter rim leaves. Flat orthographic, centred, filling about 80 percent of the frame with a clear margin, no stems, no outlines, no text.
*(Run it three times as a, b, c; for c add "lopsided, one lobe larger".)*

### Broad-leaved, dense — file: `painterly-broad-dense`
Same as above but about 120 much smaller leaves in the clump, the outline still ragged with leaf tips; for far trees.

### Small-leaved clusters (birch, hawthorn, alder) — file: `painterly-small-a`, `painterly-small-b`
A hand-painted stylized leaf cluster for a game tree, on a pure flat magenta #FF00FF background, square. A loose airy clump of about 60 small diamond and oval leaves on fine drooping shoots, some sky gaps through it, leaves hanging down at the bottom edge; light fresh yellow-green on top, teal-green beneath, soft painted gradients. Flat orthographic, centred, about 80 percent of the frame with a margin, no outlines, no text.

### Narrow-leaved clusters (willow, eucalyptus) — file: `painterly-narrow-a`, `painterly-narrow-b`
A hand-painted stylized leaf cluster for a game tree, on a pure flat magenta #FF00FF background, square. A drooping spray of about 40 long narrow lance-shaped leaves hanging from thin arching shoots, like a willow or eucalyptus, the lower edge a fringe of hanging leaf tips; silvery blue-green on top, deeper teal beneath, soft painted gradients. Flat orthographic, centred, about 80 percent of the frame with a margin, no outlines, no text.

### Pine tufts — file: `painterly-pine-a`, `painterly-pine-b`
A hand-painted stylized pine branch tip for a game tree, on a pure flat magenta #FF00FF background, square. Three short upturned shoots, each ending in a dense brush-like tuft of long straight needles radiating forward and up like a bottle brush, a little bare brown twig showing between them; dark blue-green needles, lighter where lit on top, teal beneath, soft painted gradients. Flat orthographic, centred, about 80 percent of the frame with a margin, no outlines, no text.

### Fir and spruce boughs — file: `painterly-fir-a`, `painterly-fir-b` (wide 2:1)
A hand-painted stylized fir bough for a game conifer, painterly Firewatch-like style, on a pure flat magenta #FF00FF background, wide 2:1. One level spruce branch seen from the side and slightly above: a thin brown branch axis running left to right, dense fringes of short needles hanging down and outward along it, lighter blue-green on top, darker teal underneath, drooping slightly toward the tip, ragged painted underside. Flat orthographic, the whole bough inside the frame with a margin, no outlines, no text.
*(The pilot's `painterly-bough-1` and `-4` count as fir a; one more run as b.)*

### Cedar and cypress sprays — file: `painterly-scale-a`, `painterly-scale-b` (wide 2:1)
A hand-painted stylized cedar bough for a game conifer, on a pure flat magenta #FF00FF background, wide 2:1. A drooping branch with flat hanging fern-like sprays of tiny scale leaves, like a western red cedar, the sprays hanging in soft layered curtains below a thin brown axis that curves down then up at the tip (a J-curve); fresh yellow-green on top, dark teal beneath, soft painted gradients. Flat orthographic, inside the frame with a margin, no outlines, no text.

### Palm frond — file: `painterly-frond` (tall 1:2)
A hand-painted stylized palm frond for a game tree, on a pure flat magenta #FF00FF background, tall 1:2. One arching feather palm frond, a curved yellow-green midrib from bottom to top with many narrow pointed leaflets on both sides angled forward in a V, longest in the middle; bright yellow-green on top, teal-green beneath, soft painted gradients. Flat orthographic, the whole frond inside the frame with a margin, no outlines, no text.

### Fan palm leaf — file: `painterly-fan` (square)
A hand-painted stylized fan palm leaf for a game tree, on a pure flat magenta #FF00FF background, square. One round fan-shaped leaf of a Mexican fan palm on a short stalk, many pleated narrow segments radiating from the centre with their tips split and drooping, a few hanging threads; yellow-green on top, teal beneath, soft painted gradients. Flat orthographic, centred, inside the frame with a margin, no outlines, no text.

## Realistic look — species no scan covers

Photographic, botanical-scan quality, even soft diffuse light.

### London plane leaves — file: `real-plane-leaves` (kept: -5, -6)
Six real London plane tree leaves (Platanus x hispanica) photographed flat from directly above like a botanical herbarium scan, on a pure flat magenta #FF00FF background with no gradient and no shadow, square, arranged in two rows of three, upright, not touching, each fully inside the frame with a margin, no text. Leaf shape: a broad leaf wider than long, thick and leathery, three big broad triangular lobes at the top and two small low ones at the sides, notches between lobes with wide open V-shaped bottoms, lobe edges with only one or two large teeth each, a broad base, three strong pale veins fanning from the base, matte olive green, a thick stalk with a swollen base.

### Coast live oak leaves — file: `real-liveoak-leaves`
Ten coast live oak (Quercus agrifolia) leaves laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, square. Each leaf small, 3–6 cm, oval, cupped and holly-like with spiny toothed edges, dark glossy green; arranged in rows, upright, not touching, each fully inside the frame with a margin. No shadows on the background.

### Torrey pine needles — file: `real-torrey-shoot`
One Torrey pine (Pinus torreyana) shoot laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, tall 1:2. A stout grey-brown twig ending in a dense tuft of long stiff grey-green needles in bundles of five, 20–30 cm long, spreading forward like a brush. The whole shoot inside the frame with a margin, no shadows on the background.

### Monterey cypress spray — file: `real-cypress-spray`
One Monterey cypress (Hesperocyparis macrocarpa) branchlet laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, tall 1:2. Dense rope-like cord sprays of tiny scale leaves branching in three dimensions, dark bright green, a thin brown axis; the whole spray inside the frame with a margin, no shadows on the background.

### Beech bark — file: `real-beech-bark`
European beech (Fagus sylvatica) bark, photographed straight-on as a flat seamless tileable texture, square. Smooth silver-grey bark filling the whole frame edge to edge, faint darker grey mottling, a few small horizontal lenticel lines and pale lichen spots, very fine texture. Even diffuse overcast light, no cast shadows, no perspective, no trunk edges visible. Photographic scan quality, neutral colour.

### Scots pine upper bark — file: `real-scotspine-upper-bark`
Scots pine (Pinus sylvestris) bark from high on the stem, photographed straight-on as a flat seamless tileable texture, square. Thin flaking papery plates of bright orange to copper-red bark peeling in small curls, filling the whole frame edge to edge. Even diffuse light, no cast shadows, no perspective, no trunk edges visible. Photographic scan quality.

### Eucalyptus bark — file: `real-eucalyptus-bark`
Tasmanian blue gum (Eucalyptus globulus) trunk bark, photographed straight-on as a flat seamless tileable texture, square. Smooth pale cream and blue-grey bark with patches of fresh yellow-green and grey, long ribbons of peeling brown bark strips hanging in places, filling the whole frame edge to edge. Even diffuse light, no cast shadows, no perspective, no trunk edges visible. Photographic scan quality.

## When done

Tell Claude the files are in `tools/ai-textures/raw/`. The build keys out the
magenta, makes tiles seamless, derives relief maps, and records every image
in `assets/SOURCES.md` as AI-generated (not CC0), with its prompt. The raw
folder is gitignored; only processed assets are committed.

## Palms (added 2026-11-24)

### Fan palm leaf — file: `real-fan-leaf`
One Mexican fan palm (Washingtonia robusta) leaf laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, square. A round costapalmate fan about 1 m across on a short piece of spiny stalk, many stiff pleated bright green segments radiating from the centre, their outer thirds split and drooping, a few fine threads hanging from the tips. The whole leaf inside the frame with a margin, no shadows on the background.

### Dead hanging fronds — file: `real-dead-fronds`
Several dead dry palm fronds hanging straight down side by side, laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, tall 1:2. Straw-tan to grey-brown, papery, folded and frayed fan leaves on long stalks, like the dead skirt of a Washingtonia fan palm. The whole group inside the frame with a margin, no shadows on the background.

### Queen palm frond — file: `real-queen-frond` (tall 1:2)
One queen palm (Syagrus romanzoffiana) frond laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, tall 1:2. A long arching midrib with many soft, narrow, glossy green leaflets set in several planes along it so the frond looks plumose and feathery, the leaflets drooping softly. The whole frond inside the frame with a margin, no shadows on the background.

### Pineapple cut — file: `real-pineapple-cut`
The pruned leaf-base crown ("pineapple cut") of a Canary Island date palm, photographed straight-on as a flat seamless tileable texture, square. Neatly trimmed short leaf stubs in a tight interlocking diamond spiral, fresh cut faces pale tan and cream, darker brown fibres between them. Even diffuse light, no cast shadows, no perspective, no edges visible. Photographic scan quality.

## Pines' cushions and clumps (added 2026-11-24)

Made by the owner in the Antigravity app with Nano Banana, two variations each, on magenta. Each is one
whole cushion or clump seen from the side, laid one to a big card (`ScanLook.cushion`).

### Stone pine cushion — file: `real-stonepine-cushion` (wide 2:1)
One single dense rounded cushion of Italian stone pine (Pinus pinea) foliage, photographed from the side at eye level like a botanical studio photograph, on a pure flat magenta #FF00FF background, wide 2:1. A wide puffy pad about 2 m across, flat underneath and domed on top, made of thousands of long paired grey-green needles in brush-like tufts at the ends of many short upturned shoots; the sunlit top is bright yellow-green, the underside deep dark green almost black, a few thin brown twigs visible under its flat base. Needle-textured ragged edge all round. The whole cushion inside the frame with a clear margin, no other plants, no shadows on the background.

### Stone pine canopy — file: `real-stonepine-canopy` (wide 3:1)
A section of the flat-topped canopy of an Italian stone pine (Pinus pinea) seen from the side, made of several overlapping rounded cushions of pine needle foliage side by side, each cushion lit yellow-green on top and dark green beneath, deep shadowed creases between the cushions, a few dark crooked branches visible beneath the flat underside, on a pure flat magenta #FF00FF background, wide 3:1, photographic, even daylight from above, the whole canopy section inside the frame with a margin, no trunk, no shadows on the background.

### Monterey pine clump — file: `real-pine-clump-dark`
One dense rounded clump of Monterey pine (Pinus radiata) foliage photographed from the side, on a pure flat magenta #FF00FF background, square. Many stout shoots ending in thick brushes of long dark green needles in bundles of three, packed into a lumpy rounded mass about 1.5 m across, sunlit needle tips lighter green on top, very dark underneath, spiky needle-textured outline. The whole clump inside the frame with a margin, no shadows on the background, photographic.

### Aleppo pine clump — file: `real-pine-clump-light`
One loose irregular clump of Aleppo pine (Pinus halepensis) foliage photographed from the side, on a pure flat magenta #FF00FF background, square. Several thin grey-brown twigs ending in soft tufts of fine light grey-green needles, an open airy lumpy mass with small sky gaps, sunlit tips paler, darker beneath, spiky needle outline. The whole clump inside the frame with a margin, no shadows on the background, photographic.

### Scots pine clump — file: `real-scotspine-clump`
One dense rounded clump of mature Scots pine (Pinus sylvestris) foliage seen from the side: short twisted blue-green needles in pairs, packed in brushes at the ends of many short upturned shoots on a thin orange-brown branch, forming a lumpy rounded mass about 1.5 m across with small gaps, sunlit tops lighter blue-green, dark underneath, a spiky needle outline. Square. Pure flat magenta #FF00FF background with no gradient and no shadow, the whole subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight from above.

### Monterey cypress pad — file: `real-cypress-pad` (wide 2:1)
One flat-topped pad of Monterey cypress (Hesperocyparis macrocarpa) foliage seen from the side, like a wind-shaped shelf on a coastal tree: very dense rope-like cords of tiny scale leaves branching in all directions (not flat fern-like sprays), packed into a lumpy shelf flat on top and flat underneath, bright dark green on the sunlit top, near-black green beneath, a few crooked grey-brown twigs under its base. Wide 2:1. Pure flat magenta #FF00FF background with no gradient and no shadow, the whole subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight from above.

### Stone pine bark — file: `real-stonepine-bark`
Mature Italian stone pine (Pinus pinea) trunk bark: thick flat reddish-brown to orange-brown plates separated by deep dark grey-brown vertical fissures, the plate faces paler and flaking at their edges. Fill the whole frame edge to edge, straight-on, even diffuse light, no shadows, no perspective, no trunk edges visible, photographic scan quality.

## The fifth batch: gorse, hawthorn, alder, sycamore, poplar, live oak (added 2026-11-24)

Made by the owner in the Antigravity app with Nano Banana, two variations each (`-1`, `-2`; some PNG, some JPG).
Each prompt is the subject's own words and then the shared rules for its kind:

- **Cut-outs** (all on magenta): "pure flat magenta #FF00FF background with no gradient and no shadow, the whole
  subject inside the frame with a clear margin, nothing else in frame, no text, photographic quality, even daylight
  from above"
- **Leaf sheets**: "laid flat and photographed from directly above like a botanical herbarium scan, leaves upright,
  side by side, not touching"
- **Bark**: "fill the whole frame edge to edge, straight-on, even diffuse light, no shadows, no perspective, no trunk
  edges visible, photographic scan quality"

### Gorse sprig — file: `real-gorse-sprig` (cut-out)
One cut sprig of common gorse (Ulex europaeus) laid flat, about 30 cm long: dense dark green rigid spines 1 to 2.5 cm long all along green stems, branching, with clusters of bright yellow pea-like flowers along the upper half.

### Hawthorn leaves — file: `real-hawthorn-leaves` (leaf sheet)
Ten common hawthorn (Crataegus monogyna) leaves laid flat: small, 3 to 5 cm, glossy mid green, deeply cut into 3 to 7 narrow lobes reaching almost to the midrib, a wedge-shaped base and a short stalk.

### Black alder leaves — file: `real-alder-leaves` (leaf sheet)
Ten black alder (Alnus glutinosa) leaves laid flat: 5 to 9 cm, almost round with a flat or slightly notched tip, double-toothed edges, dark glossy green, 6 to 8 pairs of straight parallel veins, a short stalk.

### Black alder bark — file: `real-alder-bark` (bark)
Mature black alder (Alnus glutinosa) trunk bark: dark grey-brown to almost black, broken into small rough square-ish plates by shallow fissures, a few pale lichen spots.

### California sycamore leaves — file: `real-sycamore-leaves` (leaf sheet)
Six California sycamore (Platanus racemosa) leaves laid flat: 15 to 25 cm, star-shaped, deeply cut into 3 to 5 long pointed lobes reaching halfway to the base, edges mostly smooth with a few teeth, mid green on top with a soft pale fuzzy underside showing on two of them, a stalk with a swollen base.

### Lombardy poplar leaves — file: `real-poplar-leaves` (leaf sheet)
Ten Lombardy poplar (Populus nigra 'Italica') leaves laid flat: 5 to 8 cm, triangular to diamond-shaped, wider than long, with a long tapering tip, finely and regularly toothed edges, bright glossy green, a long flattened stalk.

### Coast live oak bark — file: `real-liveoak-bark` (bark)
Mature coast live oak (Quercus agrifolia) trunk bark: smooth light grey to grey-brown, broken by shallow irregular vertical furrows into broad flat ridges, patches of pale green and grey lichen.

## Birch, willow, poplar, Torrey pine, sugar maple, white pine, red oak (added 2026-11-24/25)

Made by the owner in the Antigravity app with Nano Banana, two variations each, from one shared header for its
kind and the subject's own words:

- **Leaf and shoot images**: "a top-down botanical herbarium scan on a pure flat magenta background with no gradient
  and no shadow, everything fully inside the frame with a clear margin, nothing else in frame, no text, photographic,
  even light; leaves laid flat, upright, side by side, not touching"
- **Bark images**: "a straight-on photographic texture filling the whole square frame edge to edge, even diffuse
  light, no shadows, no perspective, no trunk edges visible"

### Silver birch leaves — file: `real-birch-leaves`
Silver birch leaves (square): twelve leaves, each 3 to 6 cm, triangular to diamond-shaped with a long pointed tip and a broad straight base, sharply double-toothed edges, fresh mid green, a thin stalk.

### Silver birch foot bark — file: `real-birch-foot-bark`
Silver birch bark from the base of an old trunk (square): thick rough blackish-grey bark broken by deep vertical fissures into rugged ridges, with a few small patches of white papery bark showing between the ridges.

### Weeping willow leaves — file: `real-willow-leaves`
Weeping willow leaves (square): twelve long, very narrow leaves, 8 to 15 cm long and 1 to 2 cm wide, tapering to a fine point, finely toothed edges, bright green on top; three of them upside down showing the paler grey-green underside.

### Weeping willow bark — file: `real-willow-bark`
Weeping willow bark (square): grey-brown, deeply furrowed into long thick interlacing vertical ridges forming a coarse net-like pattern.

### Lombardy poplar bark — file: `real-poplar-bark`
Lombardy poplar bark (square): dark grey, deeply and roughly furrowed into thick vertical ridges, with a few rounded burrs.

### Torrey pine bark — file: `real-torreypine-bark`
Torrey pine bark (square): deeply furrowed into broad flat reddish-brown to grey-brown scaly plates, darker in the furrows.

### Sugar maple bark — file: `real-maple-bark`
Sugar maple bark (square): grey to grey-brown, broken into long irregular vertical plates that curl away from the trunk at one edge, shaggy, with dark furrows between them.

### Eastern white pine shoot — file: `real-whitepine-shoot` (tall portrait; -1, -2 first, -3, -4 kept)
The first two (2026-11-25, leaf header): "Eastern white pine shoot (tall portrait): one slender brown twig ending in a soft feathery brush of fine flexible blue-green needles 8 to 12 cm long in bundles of five, the whole shoot about 30 cm long."

The finer, softer two that are used (-3, -4), a prompt of their own:
A top-down botanical scan of one eastern white pine (Pinus strobus) shoot laid flat on a pure flat magenta background with no gradient and no shadow, tall portrait format: a slender brown twig ending in a loose, soft, drooping brush of very fine, thin, flexible blue-green needles, each needle 8 to 12 cm long and as thin as a hair, in bundles of five, the needles hanging and fanning softly like a feathery tassel, not stiff or bristly, the whole shoot about 30 cm long, fully inside the frame with a margin. No text, photographic, even light.

### Northern red oak bark — file: `real-redoak-bark` (-1 used; -2, -3, -4 kept spare)
A straight-on photographic texture of mature northern red oak (Quercus rubra) trunk bark, filling the whole square frame edge to edge: dark grey to grey-brown, with long, wide, flat-topped shiny grey ridges running straight up the trunk like ski tracks, separated by shallow darker furrows. Even diffuse light, no shadows, no perspective, no trunk edges visible.
