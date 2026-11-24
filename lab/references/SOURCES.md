# Reference pictures (AI-generated)

The pictures in this folder are **AI-generated**, not photographs, and not
CC0. The owner made them on 2026-11-25 (the oak's under and foot pictures and the Scots pine's the same evening) with Nano Banana in the Antigravity
app, to set the realistic look's trees against, species by species, in the
gallery's reference row. They are for the lab and the gallery only: they are
not in the package (`package.json` `files` lists `src`, `assets`, the README
and the licence, and nothing here).

The owner checked every set against what the real species looks like; the
stone pine's also against real photographs. Where a picture contradicts
`docs/MORPHOLOGY.md`'s sources, the sources win (the notes in the gallery's
row and in the commit messages say where).

Each species has four views of one tree, in the same framing and light, a
clear morning with a low sun from the left, on a golf course:

| View | File | What it is |
| --- | --- | --- |
| tee | `<set>-tee.avif` | from 25 m at standing eye height, the whole tree, landscape |
| 60m | `<set>-60m.avif` | from 60 m at standing eye height, the tree small with the fairway round it, landscape |
| under | `<set>-under.avif` | standing under the crown beside the trunk, looking straight up, portrait |
| foot | `<set>-foot.avif` | the lower 2 m of the trunk and its root flare from 3 m, portrait |

`manifest.json` lists each picture, the library species it stands for and its
size. `tools/references/build.mjs <raw folder>` makes them from the owner's
originals (kept outside the repository, in the ignored
`tools/ai-references/raw/`): each resized in linear light to 1024 pixels on
its long side, sharpened a little, written as AVIF (avifenc, quality 58,
4:2:0).

## The prompt

> For each of the tree species below, generate 4 separate images, one at a
> time, of the same mature, open-grown tree of that species standing alone on
> a golf course, photographed realistically on a clear morning with soft low
> sun from the left, natural colours, no people, no text. View 1: from 25
> metres away at standing eye height, the whole tree in frame, landscape.
> View 2: from 60 metres away at standing eye height, the whole tree small in
> frame with the fairway around it, landscape. View 3: standing under the
> crown next to the trunk, looking straight up into the branches and foliage,
> portrait. View 4: the lower 2 metres of the trunk and its root flare from 3
> metres away, portrait.

Each species was given a qualifier, for example "Torrey pine (*Pinus
torreyana*), as it grows on the California coast", "Monterey cypress, an old
coastal tree with flat-topped wind-shaped foliage", "Mexican fan palm, a tall
skinned palm as kept on golf courses", "Canary Island date palm, with its leaf
bases trimmed into a pineapple shape".

## The sets

| Set | Species | Notes |
| --- | --- | --- |
| stone-pine | Stone pine (*Pinus pinea*) | the first set, as WebP; its tee and 60 m pictures were named the other way round, and the build swaps them |
| stone-pine-2 | Stone pine | a second tree; its foot and under pictures are much like the first set's |
| torrey-pine | Torrey pine (*Pinus torreyana*) | as it grows on the California coast |
| monterey-cypress | Monterey cypress (*Hesperocyparis macrocarpa*) | an old coastal tree with flat-topped wind-shaped foliage |
| eucalyptus | Eucalyptus | |
| coast-live-oak | Coast live oak (*Quercus agrifolia*) | its under picture looks up from a few metres off, not straight up |
| california-sycamore | California sycamore (*Platanus racemosa*) | |
| mexican-fan-palm | Mexican fan palm (*Washingtonia robusta*) | a tall skinned palm as kept on golf courses |
| canary-date-palm | Canary date palm (*Phoenix canariensis*) | its leaf bases trimmed into a pineapple shape |
| silver-birch | Silver birch (*Betula pendula*) | |
| beech | Beech (*Fagus sylvatica*) | |
| oak | Oak (*Quercus robur*) | a large open-grown parkland oak |
| scots-pine | Scots pine (*Pinus sylvestris*) | a mature tree with a long orange upper stem and a flat-topped crown |
