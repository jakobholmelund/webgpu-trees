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

### London plane leaves — file: `real-plane-leaves`
Six London plane (Platanus × hispanica) leaves laid flat on a pure flat magenta #FF00FF background, top-down orthographic photograph like a botanical scan, square. Each leaf palmate with five pointed lobes and toothed edges, 12–20 cm, mid green with paler veins, a long stalk at the bottom; side by side, upright, not touching, each fully inside the frame with a margin. No shadows on the background, sharp edges.

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
