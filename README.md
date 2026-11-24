# Trees

Trees for three.js on WebGPU, written in TSL: grown from a species' data to
each tree's own measured size, and drawn in their tens of thousands. It is the
sibling of [webgpu-grass](https://github.com/jakobholmelund/webgpu-grass), and
began as the trees of Couch Golf Club, a browser golf game.

It is early. It has four looks from the same grown trees: `stylized`,
crowns laid in dabs of paint, as the game draws them; `painterly`, crowns of
small crisp leaves lit as a few big soft masses; `sculpted`, crowns of soft
clay lobes; and `real`, crowns of leaf cards made of the species' own
scanned leaves, with scanned bark (see *Photographs*).
WebGPU only (three.js r187, `three/webgpu`).

```
src/      the package: imports three and nothing else
assets/   the realistic look's photographs: scanned bark and leaves (CC0, SOURCES.md)
tools/    scans/ makes assets/ from the downloaded scans
lab/      the lab: ground, sky, and the package's trees on it; and its gallery
```

`pnpm test` holds the walls: the package imports only three, the lab
reaches it only through `src/index.ts`, growing keeps to the size asked
for, and every tree is fitted to its own numbers.

## The contract

```ts
const trees = createTrees({
  trees: [{ x, y, z, species: 0, height: 17, crownRadius: 7.5, crownBase: 3.2, trunkRadius: 0.45 }, ...],
  species: STARTER_SPECIES,
});
scene.add(trees.object);
// each frame, before rendering:
trees.update(renderer, camera, timeSeconds);
```

- **The renderer should keep depth reversed**
  (`new WebGPURenderer({ reversedDepthBuffer: true })`). Neighbouring
  crowns grow into each other, and their leaves' dabs, all facing the eye,
  can lie closer in depth than an ordinary depth buffer tells apart a few
  dozen metres off: which is in front then changes from frame to frame as
  they sway, and leaves flicker, at every distance and with the eye still.
  Reversed depth tells them apart to a fraction of a millimetre at any
  distance. In the lab's grove, 1609 pixels flickering over a dozen frames
  became 191 (scattered edge pixels), and the near plane no longer matters.
  `update` says so once on the console if it is not.
- **A tree on the ground** is a place and the four numbers a survey
  measures of it: height, crown radius, the height of its crown's base, its
  trunk's radius (all optional; left out, they are its species'). A yaw and
  a seed may be given; left out, they come from its place. Many trees go in
  packed, ten numbers a tree (`packTrees`, `TREE_FIELDS`).
- **Where it stands** (alone, at a wood's edge, inside a wood) is worked
  out from the list itself, from each tree's neighbours (see *Where a tree
  stands*). A host that knows better says so, of any tree: `stand` on a
  tree in the list, or `stands` beside a packed list.
- **A species** is a row of plain data (`species.ts`): how the tree is put
  together (broadleaf, conifer, shrub), its crown's outline, how deep its
  leaves go and how open it is, how it branches, its clumps of leaves, its
  colours and its stiffness. Nothing that draws a tree names a species.
- **Style** (`trees.style`) is how it is drawn, apart from what it is:
  light in painted bands, how round each clump is lit, the dabs' size,
  light through the leaves. **Detail** (`trees.detail`) says at what size
  in the picture each tier takes over.
- **Look** (`createTrees({ look: "painterly" })`) is chosen when the trees
  are made, the pieces being different; `style` starts as the look's
  (`LOOK_STYLES[look]`) and can be changed at any time.
- **Shade on the ground**: `trees.bakeShade(area)` works out how much sun
  reaches the ground past the crowns (as their own leaves and limbs take it:
  see "Light from the crown's own leaves"), and
  `trees.sunAt(xz)` hands it to a host's ground or grass as a TSL node (the
  grass library takes it as `world.sun`).
- **Photographs** (the realistic look's scanned bark and leaves, in
  `assets/`) are fetched once a page and put in as they come; until then,
  and with `scans: false`, the bark and the sprays are drawn by arithmetic.
  `trees.ready` settles when they are in. A bundler must copy the package's
  `assets/` with it: Vite does, for `new URL(..., import.meta.url)`, unless
  it pre-bundles the package (then exclude it from `optimizeDeps`, or copy
  `assets/` somewhere served and pass `scans: { base: "/where/" }`). Hosts
  may give species photographs of their own (`scans.looks`).
- **Light, wind and season** (`trees.environment`) are the host's to set, as the
  grass takes them: the sun's direction, the colour of sunlight and of
  shade, the wind's heading and speed; and the day of the year (`day`, 1 on
  the 1st of January, or null), from which a flowering species' bloom is
  worked out (see *Flowers*). `world.sun(xz)` and `world.air(colour,
  at)` let a host's clouds and haze reach the trees. Without `world.air` the
  trees take the scene's fog; with it, only the host's air.

## Styles

A look is the pieces a crown is laid with, chosen when the trees are made; a
style is a row of numbers (`TreeStyle`) saying how they are lit, read each
frame. Each look starts from its own style (`LOOK_STYLES`: `DEFAULT_STYLE`,
`PAINTERLY_STYLE`, `SCULPTED_STYLE`, `REAL_STYLE`), and every number keeps
to a range (`STYLE_RANGES`, `checkStyle`). The host's sun, its tints and the
wind stay the host's (`trees.environment`); a style turns them, never
replaces them.

| Look | Its crowns | Its light |
| --- | --- | --- |
| `stylized` (painted) | brush marks, a few dabs to a clump | the crown's form and each clump's, in flat bands |
| `painterly` | lumpy clusters of small crisp leaves of the species' kind, hand-painted (`paintedMarks.ts`, *Painted marks*), never longer than `leafSize` metres however big the crown: oval leaves for broadleaves, small diamond leaves for small-leaved trees, hanging lance leaves for willows and eucalyptus, brushes of needles for pines, curved leaflets for palms; a conifer's boughs as sheets of painted sprays (*Boughs*) | a few big lobes, warm yellow-green where lit, cool teal in shade, a rim against the sun |
| `sculpted` | soft lumpy clay discs, and sprigs of two or three leaves on the tops of its lobes | the lobes as clay balls, each dab a small ball on its lobe |
| `real` | leaf cards set in the crown, each a spray of the species' leaves; a conifer's boughs as sheets carrying its sprays | as the sun gives it, with light through the leaves |

**Lobes.** The painterly and sculpted looks light a crown as a painter does,
as a handful of masses before any leaf. Each crown's clumps are gathered
into lobes (`lobes.ts`: k-means, about half the crown's mean radius each,
seeded from the clumps farthest apart), and every dab is lit, pixel by
pixel, as the ball of the lobe the eye's ray through it meets first, so
lobes hide one another as solid masses do and the light runs smoothly over
all of a lobe's dabs. Lit each by its own lobe instead, the dabs of two
overlapping lobes interleave into a patchwork. `lobe` says how far a crown
is lit so (0: as the painted look, each dab one stroke), `bulge` how far
each dab is its own small ball over it.

**Colour.** `warm` turns the sunlit side towards a yellow-green and `cool`
the shade towards a teal blue-green, each keeping its brightness (a green
leaf multiplied by a blue light stays green; turned, it goes teal);
`chroma` makes the colour richer than the species' and `bright` the sunlit
side brighter beside the shade. `rim` lights a lobe's edge against the sun.
Mid and far trees are lit the same way over the same lobes, with the
look's own marks (a cluster of smaller leaves for a gathered dab), so a
tree keeps its colours as it passes from tier to tier.

**Leaf size.** A painterly cluster's leaves are a share of its dab, and a
big crown's dabs are a metre and more across: drawn so, its leaves were
the size of a tray beside a golfer. The atlas holds each kind's clusters
at three densities (`PAINTERLY_DENSITIES`, the leaves smaller and more at
each), and each dab takes the coarsest whose leaves stay under `leafSize`
(0.22 m for a broad leaf; a palm's fronds are allowed five times that).
Nor finer than leaves four pixels across: further off, a leaf's size in
metres is not seen, and finer leaves were a shimmer of specks over a birch
or a willow at the fairway; and leaves seven pixels across or fewer are
drawn softly, their own tone and number eased towards the mean (to a third
at two pixels), so a far crown is soft painted masses with crisp edges. A
painterly tree passing between tiers hands its dabs and sheets over piece by
piece (`pieceShare`), as the realistic look does: handed over pixel by pixel,
a crown at 60 m was a speckle of sky inside it and lone leaves round it.
A cluster is a lumpy mass of a few round lobes, darker under its leaves,
the leaves pointing out from their lobe, so its outline is ragged leaf
tips all round and no ring of tips pointing out like a star.

**Marks.** Until the painted marks come (and with `scans: false`), drawn by
arithmetic (`marks.ts`), no picture loaded. A painterly leaf is
an outline about its midrib, folded (one half a little darker), lighter
to its tip, its own tone, casting a thin shadow on what it lies over;
green carries a number of each leaf's own, so leaves in the light vary one
by one. A mark's edge is sharpened over one pixel, so leaves stay crisp
close to, where a texel covers more than a pixel, and keep their coverage
far off (see *Far leaves*).

**Painted marks.** The painterly look lays its crowns with clusters and
boughs cut from hand-painted pictures (generated for this project, not
CC0: `assets/SOURCES.md`), cell for cell where the drawn marks are
(`assets/marks/`, made offline by `tools/marks/build.mjs` from the pictures
`tools/marks/recipe.mjs` lists). The shader still colours each leaf from
its species and the light, so a picture gives only its form: its lightness
over its own blurred over a leaf and a half (the painter's light on the
whole clump taken out, the lobes' laid in its place) is the tone, brought
to the same mean in every cell; its coverage is keyed off its magenta; and
each painted leaf, found by flooding from the flat insides of the leaves
up the edges and dark valleys between them, is a number of its own, so
the light varies leaf by painted leaf. Broadleaves come from three clumps
of some thirty leaves and, densest, one of a hundred and twenty; birch,
hawthorn and alder from airy drooping clumps; willow and eucalyptus from
hanging sprays (kept upright, as a pine's brushes are); a pine's (and a
spruce's far dabs) from shoots ending in brushes, laid level side by
side in plates. A finer density is several pictures smaller, set round
as a clump's lobes are; each dab is turned, mirrored and sized by its
own number, so no picture repeats the same way. A painted cluster holds
more and smaller leaves than a drawn one, and the shader is told how much
smaller (`PAINTED_LEAF_SHARE`), so each dab still takes the coarsest
density whose leaves keep under `leafSize`, mid dabs too. A conifer's
sheets are painted boughs turned along their twig, their sprays reaching
out to either side (another bough's, mirrored, on the far side), the
sprays painted behind the others left out so air shows between them, the
underside a shade darker. 1.7 MB of AVIF (4:4:4, no colour matrix: tone,
number and coverage kept apart); some 0.2 s once a page to make their
mips. The same views drew within a few percent of the drawn marks' time.

**Boughs.** A conifer grown whorl by whorl (spruces, firs, cedars) lays
its boughs, near and mid, as sheets lying along them, in the painterly and
the realistic looks (`sheetPieces`). Dabs facing the eye made a fir a stack
of blocks, and a bough is not a ball of leaves: it is a flat, drooping
spray, lit on its top and dark beneath. Koerye's foliage-mass study tried
three ways and found the same: loose leaves gave spiky balls, dense
clusters looked fragmented and closed blocks cushions, while curved sheets
held their volume from every side and read as tiered boughs. So each bough
is a run of overlapping strips on its own wood, from its first clump to
past its tip, each as wide as the bough's side shoots reach, lifted at its
foot and drooping to its tip, its edges falling away either side of its
middle and a little twisted: from the tee a bough hangs its fringe, from
under it is a bough's shade, and from above its top. A sheet has two
sides, its top light (needles over a darker body) and its underside dark
(the body over the needles), the same outline cell for cell; which shows
is the pixel's to say, and the side lit as itself over its lobe, so
neighbouring boughs shade as one mass. The sun on a bough's top comes
through to its underside. Twelve triangles a sheet close to, about 4,300
a spruce (its dabs were 1,360, its realistic cards 5,450); mid, the same
boughs in fewer, longer sheets of four, about 480 a spruce. The mid tier
had been dabs, and a tree passing between the two changed from boughs to
blots pixel by pixel, a speckle over the whole hand-over. An old pine
grown as a broadleaf has no whorled boughs, its needles tufts at its
twigs' ends, and sheets made its crown a palm's fronds: it keeps its
clusters.

A painterly sheet seen aslant had its picture squeezed across its sprays
into streaks along its bough, and under a cedar the near ones were big
smeared sheets. So, near, each is turned about its middle line (`aSpine`)
towards the eye until it faces it at least 0.25 (the cosine), and 0.6
within three of its half lengths, never more than 63 degrees: a bough seen
from the tee lies as it lies, its tiers so, and one overhead is never a
streak. What is still edge-on (under 0.2, or 0.42 close to) goes spray by
spray, by each painted spray's own number, as its mips thin to their
hearts; and from five of its half lengths in to one and a half, half its
sprays go, so close to it breaks into sprays with air between, the rest by
six tenths of one (a sheet at the eye was a smear). Mid sheets are as they
were: turned or thinned, a far spruce was a row of spikes.

**Light through the leaves.** A thin leaf passes on about as much light as
it sends back. To an eye looking towards the sun through it, the light is
bent a little by how the leaf faces and gathers about the sun
(Barré-Brisebois, GDC 2011: `throughWarp`, `throughPower`), as much as
`through` says. SeedThree's lesson is that the model alone makes every
backlit leaf the same lime green: it knows only where the eye, the sun
and the leaf face, and a crown is not one thickness. So the leaves are as
thin as the crown lets the sun reach them (Monsi and Saeki, the share of
sun at the leaf), thicker deep in the crown, and each leaf its own (the
marks' green is each leaf's number; the realistic sprays carry one too),
as far as `throughVary` says: the crown's edge glows where little lies
between, and its heart stays dark. Close to it is worked out pixel by
pixel, the leaf's facing its lobe's (painterly) or its own (cards); far
off, once a dab.

**Moss.** The wood takes moss where it holds the wet: on what faces up (a
limb's top), low on the trunk, in the grooves between its buttresses
(where the surface swells less than round), more on its side away from
the sun, and never on twigs; `moss` says how much, and a species' bark
how much it takes (none on a palm, less on pale peeling bark). Painted, it
is a flat soft green; on furrowed bark, darker and in patches, in the
furrows first. A few operations a pixel.

**Far leaves.** Drawn with alpha to coverage, a far crown thinned away to a
lace. Each smaller picture (mip) of an atlas, averaged from the one before,
keeps the alpha's mean but not how much of a mark is over its cut: a
thin leaf averaged down is a pixel mostly not there, and two overlapping
leaves of the same soft alpha get the same samples, so a far crown of them
shows the sky through. The atlases' mips are made here (`mips.ts`), each
cell's alpha scaled so as much of it lies at or over the cut as at full
size (Castaño 2010), and the shader sharpens every mark at the cut over a
pixel: a far leaf covers its pixels as a near one does, and overlapping
leaves add up. A painterly bough's mips go further, closing towards its
outline with distance (a needled bough far off is a bough's shape, as a
painter's far masses are, not a lace of needles).

**Cost**, the grove (400 trees) on this Mac at 2800 x 1800, 4x MSAA, the
least of four runs, graphics card's time for the whole frame: painted 1.8
ms in the clearing and 1.3 ms from outside, painterly 3.4 and 2.1,
sculpted 3.5 and 2.1, real 3.0 and 2.3. The same pieces in every look but
the realistic one; the painterly and sculpted looks' dabs are larger
(`dabScale` 1.4 and 1.5), which is most of their cost, and their lobe is
found by a search over the crown's lobes in the vertex shader. A sheet is
lit by its own lobe, with no search: it faces as its bough does, and the
search for each of a sheet's twelve vertices was most of what a conifer
cost.

Boughs as sheets, the light through and the far leaves, measured against
the drawing before them at 1780 x 1868 (the least of two runs each,
interleaved; this Mac is shared): the grove of 400 spruces, painterly,
1.54 to 1.76 ms in the clearing and 2.18 to 2.55 from outside; realistic,
where sheets replace cards, 1.67 to 1.32 and 2.46 to 1.97. The course's
30,000 trees of 30 species, painterly, 0.1 to 0.25 ms more of 3 to 5;
realistic, 0.1 to 0.5 ms less. Anisotropic filtering is the painterly
sheets' alone: on the realistic atlas, which every card samples, it cost
0.25 ms of the grove for little to see.

## Species

`STARTER_SPECIES` are six trees of a temperate course; `MORE_SPECIES` adds
rows by the regions Couch Golf Club's courses are in, keyed by a short id
(`MORE_SPECIES.stonePine`); `ALL_SPECIES` is both. A row's size is a typical
open-grown tree of its kind on a course or in a park there (not a forest
record), with its source named over the row in `species.ts`; a tree's own
measured size replaces it. `regions` are from `REGION_ROWS`: california,
pacific-northwest, great-britain, france, ontario, netherlands, denmark.

| Name | Latin | Look | Regions | Height (m) | Crown radius (m) | Crown base (m) |
| --- | --- | --- | --- | ---: | ---: | ---: |
| Oak | *Quercus robur* | a broad dome, wider than tall, on crooked limbs | great-britain, france, netherlands, denmark | 17 | 11 | 2.5 |
| Plane | *Platanus × hispanica* | a big full oval, pale mottled bark | france, great-britain, netherlands, california | 22 | 10 | 3 |
| Eucalyptus | *Eucalyptus globulus* | an upright, open, irregular crown of hanging bunches on a few ascending pale limbs | california | 26 | 8.5 | 7.5 |
| Spruce | *Picea abies* | a dark cone, boughs hanging to the ground | denmark, netherlands, ontario | 20 | 5.8 | 1 |
| Scots pine | *Pinus sylvestris* | a flat lopsided top on a tall orange trunk | great-britain, denmark, netherlands | 19 | 8 | 9 |
| Shrub | (generic) | a dense mound of small leaves | california, pacific-northwest, great-britain, france, ontario, netherlands, denmark | 2.4 | 1.6 | 0.1 |
| Beech | *Fagus sylvatica* | a dense dome, smooth grey bark | denmark, great-britain, netherlands, france | 20 | 8 | 2.5 |
| Silver birch | *Betula pendula* | a narrow open oval of drooping tresses, white bark | great-britain, denmark, netherlands | 15 | 3.5 | 3 |
| Black alder | *Alnus glutinosa* | a dark cone-to-oval on a leader, by water | denmark, netherlands, france | 15 | 4 | 2.5 |
| Lombardy poplar | *Populus nigra 'Italica'* | a narrow column | france, netherlands | 22 | 2.5 | 2 |
| Weeping willow | *Salix × sepulcralis* | a broad mound of hanging curtains, nearly to the ground, yellow-green | france, denmark, netherlands | 11 | 7.5 | 1 |
| Hawthorn | *Crataegus monogyna* | a small crooked tree, dense and dark | great-britain, denmark, netherlands, france | 6 | 3 | 1.2 |
| Gorse | *Ulex europaeus* | a dense dark spiny heath shrub | great-britain, denmark, netherlands | 1.6 | 1 | 0.15 |
| Sitka spruce | *Picea sitchensis* | a big blue-green cone | denmark, pacific-northwest | 28 | 4.5 | 1.5 |
| Corsican pine | *Pinus nigra* | a dark pine of level whorls, its top blunt | netherlands, denmark, france, great-britain | 18 | 4.5 | 5 |
| Douglas fir | *Pseudotsuga menziesii* | a tall, somewhat open cone | pacific-northwest, denmark | 30 | 5 | 3 |
| Western red cedar | *Thuja plicata* | a cone of drooping sprays, red bark | pacific-northwest | 20 | 4.5 | 1 |
| Monterey cypress | *Hesperocyparis macrocarpa* | a wind-shaped flat top on a few great limbs | california | 18 | 7 | 3 |
| Monterey pine | *Pinus radiata* | a heavy, lumpy rounded crown going flat, dark green | california | 20 | 7.5 | 4 |
| Torrey pine | *Pinus torreyana* | an open crooked crown, long grey-green needles | california | 15 | 5.5 | 4 |
| Aleppo pine | *Pinus halepensis* | an irregular open crown, grey-green | california, france | 15 | 6.5 | 3 |
| Stone pine | *Pinus pinea* | a flat umbrella of dense cushions on a stem forked into rising limbs | california, france | 15 | 11.5 | 8 |
| Canary date palm | *Phoenix canariensis* | a big round head of arching fronds on a thick trunk | california | 15 | 5 | 7 |
| Mexican fan palm | *Washingtonia robusta* | a tall thin pole flared at its foot, a small tight head of fan leaves | california | 22 | 2.2 | 18 |
| California fan palm | *Washingtonia filifera* | a stout grey column, a head of grey-green fans; in the wild a skirt of dead leaves to the ground | california | 12 | 3 | 7.5 |
| Queen palm | *Syagrus romanzoffiana* | a smooth grey ringed pole, a few soft plumose fronds arching over | california | 10 | 3.2 | 5.5 |
| Coast live oak | *Quercus agrifolia* | a low, broad, dark evergreen dome | california | 11 | 8.5 | 1.8 |
| California sycamore | *Platanus racemosa* | open and crooked, pale bark | california | 18 | 7 | 3.5 |
| Sugar maple | *Acer saccharum* | a dense oval | ontario | 20 | 6.5 | 3 |
| Red oak | *Quercus rubra* | a rounded crown on a few big limbs | ontario, denmark, netherlands | 20 | 8 | 3 |
| Eastern white pine | *Pinus strobus* | tiers of level boughs, soft blue-green | ontario | 22 | 5.5 | 3 |
| White spruce | *Picea glauca* | a narrow blue-green cone | ontario | 16 | 2.8 | 0.8 |

The oak's, the Scots pine's, the spruce's, the Aleppo pine's and the stone
pine's proportions (crown reach and base for height) and outlines are
measured from photographs of open-grown trees (`test/outlines.json`; each
grows within 12% of its photograph's outline, `test/outline.test.ts`). An
old pine has given up its leader: the Scots, Torrey, Aleppo, Monterey and
stone pines are grown as broadleaves, with needles. A stone pine's stem, sinuous
or leaning a little as it is crooked, forks a third of the way up (`fork`, a share
of its crown's base, each tree a little higher or lower: `forkSpread`) into two or
three thick crooked stems (`forkStems` to `forkStemsMost`, each tree its own; the stem's wood
shared among them by the pipe model, each half or more its thickness), each of which
divides twice more in V-forks (`forkSplits`), rising and then leaning out further at
each, their last arms the limbs that reach out under the umbrella: the dark fan of
limbs under its canopy. A V-fork's two arms share what the crown gives them by the
light each gathers, neither favoured. Its crown is some three times as wide as deep
and flat on top (`test/pines.test.ts`); its outline test still reads the Roquebrune
photograph, whose low left is another tree behind it. Grown narrow in a wood (a crown
less than a third as wide as deep) its limbs leave its stem one by one, as any tree's.

A crown's outline is its `shape`'s, made round (`CROWN_OUTLINES`): widest
some way up, upright there, curving in above and below. `crownPeak` (0..1)
says how far up the crown it is widest and `crownRound` how round it is
above that (the exponent of a superellipse: 1 a cone, 2 an ellipse, 3 or
more a flat top; Rautiainen et al. 2008 measured 1.35 for Scots pine and
1.42 for Norway spruce), over the shape's own; `lobes` (0..1) makes it
lumpy, bulging out in a few directions and falling back between. A
broadleaf's `scaffolds` are its great limbs (4, and one more for every
third of `leader`, if left out), and `shed` (0..1) how readily it drops its
shaded branches (from `openness` and `branchiness` if left out).

A palm (`architecture: "palm"`) is grown as a palm (`palm.ts`; see *Palms*).
A broadleaf or a shrub that
weeps (`weep`, 0..1) hangs whips from that share of its outer twigs and of
the tops of its upper limbs' arches: a short arch out, then straight down to
as low as the crown's base, leaved all along and over its arch (the willow's
curtain, the birch's tresses). Past the crown's outline a whip goes no
further out and turns down the sooner; drawn back in to it, a whip arching
out of the crown's narrow top turned back on itself, a loop of wire over the
crown. A crown that weeps half or more (a willow's) has its top clothed: once
it is thinned and fitted, every piece of wood in its upper half that no
clump's core lies over gets a whip's spray over it, the highest first, so no
bare limb stands over its dome of leaves in any variant a course grows
(`test/weep.test.ts`); the realistic look's sprays there spring from as high
as their clump is hung (`FixedCards.lift`), not from the wood under it.

What the grower cannot do yet, so those rows come as close as their data
allows: several trunks from one foot (a sycamore's, a coast live oak's). A
species may lean (`lean`: the trunk leans from its foot and turns upright near its
crown's base, so the crown stands over its foot; the Torrey pine's, the California sycamore's), and a
host leans a tree at most 3 degrees besides.

## Palms

A palm is a monocot: it does not branch. Its one stem grows from one tip, as
thick at its top as near its foot (a fan palm's tapers a little and swells at
its foot, `buttress`), and its crown is its leaves: `whorl` green fronds set
round that tip one after another by the golden angle (137.5 degrees), each
standing as its age has it. The pale unopened spear stands upright in the
middle, the young leaves rise, the mature ones arch out, the old droop, and the
dead hang against the stem. So a palm is not grown as the other trees are
(`palm.ts`, beside the grower): each frond is laid out as data the drawing reads
directly (its rachis, the frame of its leaf along it, its length, width, age
and colour), and the crown is fitted to the tree's envelope (its height, its
crown's radius and base, what a ball meets) by how long its fronds are and how
far they droop together: a crown wider than deep holds its leaves flatter, a
deep narrow one lets them hang. Its leaves are kept near its kind's size (within
a fifth of its specimen's, a young palm's a little smaller), whatever head a
survey hands over: a Mexican fan palm's head measured 1.4 m round had fans a
third of their size, a feather duster, and one 4.7 m round leaves half as long
again. A head too narrow for them holds them up, and a skinned fan palm's that
narrow (under 0.6 of its specimen's reach) is cut hard, its hanging leaves gone,
as an over-pruned course palm is.

- **Leaves** (`palmLeaf`): a feather palm's frond is a ribbon along its
  rachis, folded up in a V (`fold`, a Canary palm's stiff leaflets), a queen
  palm's (`plumose`) a second, drooping rank under it, its leaflets in
  several planes; a fan palm's is a pleated fan at the end of a long stalk,
  folded up along its costa, its segments split past the middle and drooping
  at their tips (`fanDroop`). Their pictures are whole leaves, one atlas for
  all palms (`palmAtlas.ts`): AI-generated photographs for the realistic look,
  painted ones for the others, drawn ones until they come; each picture's
  light and shade over the frond's own colour (its species' green, paler when
  young, going to `deadColor`).
- **Pruning** (`pruning`, by species, or by tree: `TreeInstance.pruning`, or
  `prunings` beside a packed list): `natural`, every leaf it has, the dead
  hanging under the green (a fan palm's skirt as far down its stem as `skirt`
  says); `skirt`, cut back to a short skirt; `skinned`, the dead and drooping
  leaves cut and its stem cleaned, a collar of boots (old leaf bases) left
  under a fan palm's crown, its leaves' feet down its top 2 m round it (a head
  too shallow for its leaves to hang, less deep than 1.4 of its radius, may
  lose its lowest green ones instead of having them all shortened); `pineapple`, cut back to the leaves above the level,
  its leaf bases trimmed into a ball under the crown. Left out, as courses keep
  them: a Canary palm pineapple cut, the others skinned. Trees kept otherwise
  than their species are their own variants.
- **Drawn**: near, every frond in twelve pieces and every fan in nineteen
  rays; mid, five and nine; far, two and five, a star of fronds round the
  stem. A fan's blade is turned on its own about its line, so across the crown
  and from below many stand edge-on, its stalk a spoke from the stem. Further
  off (mid, far, and a near fan under about 40 pixels across) a fan is drawn as
  a starburst of a few broad segments in its photograph's colours: its
  photograph mipped down to a few pixels was a disc, and a crown of discs a
  lettuce. A near fan goes over to its starburst whole, between 40 and 22
  pixels, each fan at a size of its own: gone over pixel by pixel, half of a
  fan's pixels its photograph and half its thin starburst, a California fan
  palm's crown from the tee was a speckled lace. A skirt, near, is shingles of dead leaves round the stem, each row
  half over the one below; mid and far, one continuous thatch from under the
  crown to its ragged foot. It is carrot-shaped: its shoulder, tucked under
  the hanging green leaves, flares about as wide as they reach, then it tapers
  steadily to a narrow foot. Its top metre or two is freshly dead, tan to
  ochre; below, weathered pale silvery grey-beige. A skirt cut back short is
  all fresh, a brown tuft under the green. A fan palm's leaves are glossy. The stem wears its bark (a Canary palm's lattice, a fan
  palm's rings), its boots and a pineapple's trimmed bases; where the look
  paints bark flat, their pattern is still drawn faintly. Its leaves' area is
  its fronds' own, which its box of light takes (`GrownTree.leafArea`).
- **Tiers**: a palm's tier goes by its crown (twice the larger of its width
  and depth), not its height: a 22 m fan palm's stem is a line, and by its
  height it drew its near crown from 200 m off.
- **Wind**: the stem bends further than a tree's trunk and its crown follows a
  moment late, the bend running up it; the crown tilts as the stem's top does.
  Each frond streams downwind in the gusts, flaps and twists on its own beat
  as its age lets it (a dead one swings freely, a spear hardly moves), and its
  leaflets shimmer.
- **Cost**, a grove of 400 palms of one kind (graphics card's time for the
  frame, before the palm grower and after): at 1104 x 1868, Canary palms,
  realistic, 0.83 to 0.61 ms in the clearing and 1.15 to 0.97 from outside;
  painterly 0.98 to 0.63 and 0.92 to 0.99. At 3456 x 1894, Mexican fan palms,
  realistic, 1.18-1.37 to 1.23-1.38 ms in the clearing and 1.43-1.60 to
  1.53-1.60 from outside, with 38 leaves where it had 25, its trees drawn near
  from outside 113 to 13.
- **The lab** keeps every palm one way (*Palms as kept*, *Natural*, *Skirt*,
  *Skinned*, *Pineapple*; `?prune=`), to judge them by eye.

## Species morphology

A tree is known first by its outline, and then, nearer, by how it is put
together: whether one stem runs to its top, at what angle its limbs leave
it, how they bend along their length, how its twigs run, where on them its
leaves are. Two trees of the same outline, one with a spruce's drooping
boughs that turn up at their tips and one with an oak's crooked limbs run
out level, are not mistaken for each other a hundred metres off. So each
species' row says these things too, and the grower grows them.

[`docs/MORPHOLOGY.md`](docs/MORPHOLOGY.md) is where the numbers come from:
for each species its form, branching, foliage, bark and the few traits it is
known by, every number tagged as read from a source (`[S:...]`, the sources
and their licences listed at its end), estimated (`[est.]`) or seen in the
field (`[obs.]`), and a table of what a grower needs. It is our own
synthesis, with citations; TALLO's measured crowns (Jucker et al. 2022,
CC BY 4.0) give each species' crown radius for its height in a forest.

What a row may say, over its `branchAngle` and `bend` (all left out, a row
grows as it did):

- **`limbAngle`** `[top, base]`: the angle its first-order limbs (a
  broadleaf's great limbs, a conifer's boughs) leave the trunk at, at the top
  of its crown and at its base, in degrees from upright. A Norway spruce's
  top boughs rise and its low ones droop (`[45, 115]`); a white pine's stand
  out at right angles below and rise above; a willow's main branches rise at
  40 to 45 degrees (Trees and Shrubs Online).
- **`limbCurve`** and **`limbCurveBack`**: how a limb turns along its length,
  Weber and Penn's curve and curve-back: over its inner half, and over its
  outer. A spruce's J-curved bough droops and turns up at its tip (-30, +50);
  a Torrey pine's runs out level, dips and turns up into its candelabra (-10, +30); a
  willow's rises and arches over (+5, -35); a Monterey cypress's rises,
  elbows and runs level (-50).
- **`zigzag`**: how far a fine branch turns at each node where its tip died and
  a side bud took the lead (sympodial growth: a plane's, a sycamore's
  twigs, 25 degrees), or none (a maple's, whose terminal bud goes on). Grown
  into the wood after it is smoothed, which would iron a zigzag flat.
- **`zigzagRun`**: how far a crooked tree's wood runs straight between elbows
  (m): a California sycamore's limbs and branches turn, wander and seek the
  light all at once at each elbow, rather than a little at every internode,
  which drawn as a curve through its nodes was a wavy line hanging in the
  gaps between its pads (`test/crooked.test.ts`: it turns back a fiftieth as
  often a metre, its limbs as crooked).
- **`phyllotaxis`**: how its side buds are set round a shoot, by the golden
  angle (most trees), opposite and crossed (a maple's: one of each pair
  grown), or in two ranks in the shoot's plane (a beech's flat fans).
- **`sprayHang`**: how far a conifer's side shoots hang from their bough, from
  a fir's flat spray to a Norway spruce's comb or a cedar's hanging sprays;
  drawn as sheets, its boughs' edges fall in curtains as far again, more low
  down, so a Norway spruce is a closed dark cone and not tiers of lace.
- **`canopyLift`**: how much of the crown's underside is cleared of leaves,
  a bowl from its rim up into its middle, so its limbs show beneath it: a
  stone pine's umbrella on its bare vase of limbs, a headland cypress's. Only an
  open-grown crown: fitted narrower than 0.8 of its depth it is lifted less,
  and not at all as a column (radius under 0.35 of its depth).
- **`fork`**, **`forkStems`**, **`forkSplits`**: where a broadleaf's stem divides
  below its crown (a share of the crown's base), into how many stems (2 to 4),
  and how many times each divides again in V-forks before its arms are limbs: a
  stone pine's sinuous stem forked into a few thick crooked stems. Without
  `forkSplits`, each stem is a trunk of its own with its share of the crown
  (below).
- **`forkShare`**, **`forkSpread`**, **`forkStemsMost`**: the share of its
  trees whose trunk forks, how far one tree's fork strays from `fork` (either
  way, a share of the crown's base: from near the ground to under the crown),
  and the most stems a fork has (`forkStems` the least). Each tree decides
  from its own seed (`formOf`): a parkland oak's forked trunk, a coast live
  oak's or a Monterey cypress's two or three leaning trunks from near the
  ground.
- **`stemShare`**, **`stemRange`**: the share of its trees that grow as a
  clump of a few stems from one root plate, and how many ([least, most], 2
  to 4): a silver birch's or a black alder's stool, a eucalyptus's regrowth.
- **`pads`**: how far its leaves gather into flat-topped pads, each branch
  off a great limb keeping only the leaves near its top, with air and bare
  wood under each: a Monterey cypress on a headland, an old Scots pine's
  plates, a Torrey pine's tufts on bare limbs. A small or narrow crown, lit
  through, is in pads 0.9 at most.
- **`lean`**: how far a tree's trunk leans (degrees), grown so: from its foot,
  holding most of its lean up its bole and turning upright near its crown's
  base (or its fork), its crown grown upright from there, near over its foot,
  each tree its own way (from its seed on a stream of its own, so a lean bends
  the tree it is and grows no other): a Torrey pine's on the bluffs, a
  California sycamore's. A tall bole under a narrow crown leans less (no further
  aside than 0.3 of its crown's radius; a column, under 0.35 of its depth wide,
  not at all), and none in a stand.
- **`clusters`**: how far its leaves gather into a few bunches hanging at its
  branches' ends, with sky between them: each branch off a great limb keeps
  its leaves only on its last shoots, the bunch bigger and hanging a little
  under them, and a share of its branches bear none, their wood shed back to
  the limb (a blue gum's pendulous clumps of sickle leaves). A small or narrow
  crown, grown in a wood, has none: it is many sprays all through.
- **`buttress`**: how far its foot spreads into buttresses and flutes, more
  of them and higher (a western red cedar's, a Sitka spruce's).

Two things follow from the row without a setting. A conifer that keeps its
leader and wears needles or scales (a spruce, a fir, a cedar) has a spire:
its leader clothed in needles all round over its last few metres, finer to
its tip, its last whorls' boughs short, so its top is a dense point and no
bare stick; drawn as sheets, round the leader, splayed out and up as a fir's
top shoots are (one crossed pair, mid). And a pine (`leafKind: "pine"`)
carries its needles as a pine does, in brushes at its shoots' ends, the
wood behind them bare, because a pine keeps its needles only on its last
few years' growth: its sprays are brushes on forked shoots (real), plates
of upright tufts held level (painterly), never a fir's flat combs, which
made a pine read as a fir.

What draws the eye as wrong first is wood with no leaves where a tree would
have them: a twig poking out of a conifer's needles. A conifer drawn in
sheets keeps a twig only where its needles lie close over it, and any twig
whose end its boughs' sheets still miss is given a sheet of its own along
it (`test/morphology.test.ts` holds every twig end under its sheets, near and
mid).

`test/morphology.test.ts` holds the species to the reference's numbers that
a grown tree can be measured for: the sourced ones within what measuring a
grown tree allows (a spruce's leader to its top and straight; a willow's
and a stone pine's limb angles; a white pine's boughs square to its stem
below and rising above; a coast live oak's limbs leaving a trunk of 1.2 to
2.4 m and running out level; upper spruce boughs rising and lower ones
drooping; a plane's twigs zigzagging more than a maple's; every row's crown
wider for its height than TALLO's forest median, and grown at that median a
crown of many sprays in its box), and the estimated ones as soft walls,
with a margin, saying so (each species' limb angles, J-curves, whorls, open
crown ratios, the cypress's pads, the gorse's mound to the ground, the stone
pine's bare limbs under its umbrella).

## The lab

```bash
pnpm install
pnpm dev
```

Then open the address it prints (the lab is at `/lab/`). Drag to turn,
right-drag to move, the wheel to come nearer. The bar chooses what stands on
the ground (*One tree*, *Specimen*: one of each, *Grove*: 400, *Wood edge*:
a wood of some 1,400 trees, their undergrowth among them, seen across open
ground, *Course*: 30,000 over 2.4 km), the look (*Painted*, *Painterly*, *Sculpted*, *Real*,
each with its own style), the eye, the hour and the wind; *Envelope* draws each
tree's measured size over it (its crown's box, outline and ellipsoid, its
trunk), which is how one sees a drawn tree fills the numbers it was given.
The rail chooses a species; the inspector changes it (colours and light at
once, its form by growing it again) or the scene (style, detail, which
tiers show, how many variants). *Preset* is all of it as JSON; *Measure*
times the graphics card over fixed views. H puts the panels away, `[` and
`]` step the scenes. `?scene=`, `?look=`, `?species=`, `?hour=`, `?wind=`, `?day=`, `?eye=`
and `?fresh` (ignore what the lab kept) set it from the address.

## The gallery

`/lab/gallery.html` (*Gallery* on the lab's bar) is where the trees are
judged by eye, and where one commit's trees are set beside another's. Every
species, in one look (or every look of one species), from the same five
views: the **tee** (side-on from 1.6 m, two and a half crown widths off, or
further if the tree would not fit), the **fairway** (one tree from 60 m),
**far** (a group of five from 150 m), **under the crown** looking up (at the
edge of a crown that comes down to the ground), and the **trunk** close, from
its foot to a little above its first fork. Same sun, wind and moment for
every cell, the package's own species and seeds: the same commit draws the
same pixels (`?seed=7`, or by species `?seed=Oak:9,Silver birch:7`, draws
another set: a forked trunk or a clump where the species has them). Beside
each species are its botanical name, its regions and the
links in `lab/REFERENCE.md` (with small copies the browser loads from
Wikimedia Commons; none is kept here).

One renderer off the page draws each cell into a small picture in turn. A
cell is a piece of a 1080-line, 50 degree screen: the piece the trees fill,
shrunk to fit the cell, never enlarged beyond the screen's own pixels; the
trees choose their tier as they would on that screen, and each cell's
caption says which tier drew them, from how far, at what field of view.

*Save set* downloads one contact sheet, named by the commit (and `-dirty`
when tracked files differ from it), the look, the hour and the wind:
`trees-9029955-painterly-h9-w4.png`. *Compare* takes two sheets and shows
them side by side, flickering, or as their difference (with how many pixels
differ). `?look=` (or `all` with `?one=`), `?species=`, `?region=`, `?kind=`,
`?views=`, `?hour=`, `?wind=`, `?day=`, `?cell=` (width in pixels), `?screen=` (lines)
and `?photos=<address>` (a photograph of your own per species,
`<address><name>.jpg`, from a folder you serve yourself) set it from the
address.

*Reference row* (`?refs=1`) sets each species under the owner's reference
pictures of it (`lab/references/`: AI-generated, not photographs, credited in
its `SOURCES.md`; a species with two trees of it, the stone pine, has two
rows), and draws ours from the views they were taken from, through a phone's
lens: the **tee** from 25 m at eye height and the **fairway** from 60 m,
landscape; **straight up** from a step beside the trunk, and the trunk's
**foot** from 3 m with its lower 2 m in the picture, upright. Their light is
the pictures' clear morning, the sun low on the left (8:00, mirrored: *Sun
left*, `?sun=left`, has it for any hour). These cells are drawn at the
screen's own pixels for their field of view and shrunk into the cell, as a
screenshot of the game is, so a pine's needles are mipped as a player sees
them. Only species with pictures are shown; the contact sheet has the
pictures' rows too, so `__gallery.save({ look: "real", refs: true, species:
["Torrey pine"] })` writes a sheet of the pictures over ours.
`tools/references/build.mjs <folder>` makes the row's pictures (1024 pixels,
AVIF, 5.3 MB in all) and its `manifest.json` from the owner's originals,
which stay out of the repository; `test/referenceRow.test.ts` holds the
manifest to its files and the library's species.

*Course sizes* (`?fitted=1`, or `fitted: true` from a script) draws each
species at the sizes the game's courses give it (`lab/courseSizes.ts`: the
10th, 50th and 90th percentiles of height, crown radius and crown base on
the first holes of Riviera, Torrey Pines and Walton Heath, measured in the
game; for a species on none of them, a young and a typical course tree),
under its specimen and its reference pictures, from the tee (25 m), from
60 m and from the gallery's own tee (two and a half crown widths off), in
the reference pictures' light. A wood's species (Walton Heath's Scots pine
and birch) are drawn at a wood's edge too, their open side to the eye, and
a single tree the owner saw in the game (a stone pine of 12 m on a crown
5.9 m round) has a row of its own.

For scripts: `await __gallery.render({ look, views, species, refs })` gives every
cell as a PNG data URL with the tiers drawn; `await __gallery.sheet({...})`
the contact sheet; and with the dev server started as
`GALLERY_OUT=<folder> pnpm dev`, `await __gallery.save({...})` writes the
sheet into that folder and returns where.

## How a tree grows

`growTree(species, size, seed)` grows one tree, the same every time for the
same arguments, in plain arithmetic (no three), in 1 to 20 ms on this Mac.

0. **Its habit at its size** (`age.ts`). A species' row is its specimen, a
   tree old enough to show all it comes to, and most trees a survey hands
   over are smaller or narrower. So a broadleaf's row is taken as its own
   size grows it: how young it is, by its height or its crown's reach beside
   its specimen's, whichever is more (none at 0.8 of it, all at 0.3), fades
   what comes with age: a flat or umbrella top rounds, its pads and its
   blue gum's hanging bunches are fewer, it keeps its leader, its trunk is
   not yet forked (a stone pine's V-forks) nor its underside lifted bare; and
   how much narrower its crown is for its depth than its specimen's rounds a
   flat top too, to a dome at half as wide (docs/MORPHOLOGY.md, *Young, old
   and narrow trees*). A tree at its specimen's size grows exactly as its row
   says; palms, whorled conifers and shrubs do at any size, and a weeping
   tree weeps young.
1. **The crown's outline**: the shape's profile (above), turned round the
   trunk, `size.crownRadius` round, from `size.crownBase` to
   `size.height`. Nothing grows out of it.
2. **The trunk and its great limbs** (a broadleaf or a shrub). The trunk
   rises bare to the crown's base. Its scaffolds leave it one to each slot
   up the top part of it (a longer part the more it keeps its leader),
   round it by the golden angle, the lowest leaving widest and the highest
   steepest (as Weber and Penn set a tree's first branches): each turns up
   or down by `bend`, arches over by its weight, wanders by `crooked`, and
   reaches out to the outline. The trunk goes on up the crown as its leader,
   all the way if `leader` is 1. A shrub's stems, leaning out from feet
   spread within a third of the crown, are its scaffolds.

   A tree whose trunk forks, or that grows as a clump, is decided by its own
   seed (`formOf`: its species' `forkShare` and `stemShare`; in a closed wood
   fewer, and those that fork do so higher, its stem drawn up). Its trunk
   rises from one root plate to where its stems part (a clump's a little
   over its root flare; a fork's where its form says, never under its root
   plate nor within a fork's first piece of breast height). There they stand
   side by side, each stepping out to its own side so its outer bark runs on
   from the trunk's, and lean apart, eased in over a few trunk radii (a trunk
   bent harder than its thickness folds over on itself), then turn up: an
   excurrent tree's stems nearly upright, a decurrent one's leaning out to
   some 38 degrees. Each is a tree's stem of its own: its leader rises to the
   middle of its share of the crown, its great limbs (`scaffolds`, shared out)
   leave it round its own side, and its wood keeps to its share (the part of
   the crown nearer its share's middle than another's, by a little): one
   crown, the stems' parts touching, not crowns heaped into a blob. The light
   at a fork is shared by what each stem gathers, neither favoured. Their
   radii: each stem a bole of its own, its area at the fork its share of the
   trunk's (Leonardo, Δ 2), swelling a little into the trunk where it leaves
   it; under breast height the stems' areas there together are the size's
   `trunkRadius` (a clump's basal area), over it the trunk is measured there
   as one stem is. The fit to the size keeps the fork where it grew.
   `stemsAt(tree, y)` gives where its wood crosses a height and how thick:
   at 1 m, a forked tree's stems for a host's colliders.
3. **Growing from buds, in the light** (Palubicki et al. 2009, made light),
   eleven cycles of: every bud's light, from how much wood above shades its
   voxel (each node shades a pyramid under it); that light gathered down to
   the foot and handed back up as what to grow with, at each fork more to
   the main axis than to the lateral (Borchert and Honda's model, its
   leaning from `leader`), a scaffold as much as its trunk; each bud growing
   as many internodes as it is given, turned towards the least shadow it
   sees and up or down by `bend` (a shoot keeps some of its last
   internode's turn into the next, so it bends over several and does not
   zigzag), with a lateral bud at every internode by the golden angle at
   `branchAngle`; and every branch that gathers too
   little light for its wood shed (`shed`). So the crown is a shell of lit
   shoots on bare, branching limbs, its inside shed as it shades.
4. **Leaves** hang in clumps on the lit shoots near their twigs' ends (the
   deeper the species keeps its leaves, `foliageDepth`, the further back),
   bigger the more light they have, and never more than a fifth of the
   crown's radius round (a crown grown narrow in a wood is many sprays, not
   a few balls on a stick; a column, narrower than 0.35 of its depth, a sixth).
   A crown narrower for its height than its specimen's has its clumps smaller
   by as much (to 0.6 of what its height gives them, at the least): as many of
   its sprays across it as its specimen has, not its specimen's few big ones
   crowded in (a stone pine of 12 m on a crown half its specimen's width was a
   tower of four or five big cushions stacked). A column's leaves are in pads
   at most 0.4 (`pads`): its sky comes from round it as much as from above,
   and a Scots pine drawn up in a wood kept in its old plates was a pagoda of
   balls up its stem.
5. **The wood made good**: where an axis's tip died and the shoot below it
   took the lead, that shoot turned part way back to where the axis ran (a
   twig of such corners is a zigzag); then smoothed (twice, forks held),
   bowed by its weight (thin wood more, `bend` down more), and its straight
   runs joined into single pieces. A tree that weeps then hangs its whips.
6. **Conifers** grow whorl by whorl instead: a leader to the top and
   `whorl` boughs to each of `whorlsPerMetre` (closer in a narrow crown,
   for its interwhorl branches), each as long as the outline
   lets it be (some missing, some broken short), with side shoots along
   their leafy parts; then smoothed and bowed. **Palms** grow a head of
   fronds on one stem.
7. **Dead twigs dropped**: once crowding clumps are thinned, every twig
   that neither bears a clump, nor lies inside one, nor leads to one is
   shed back to the wood that does. So no twig ends bare, and every clump
   has wood leading to it (`test/borne.test.ts`).
8. **Fitted to its size**: across so its leaves reach the crown radius, up
   so they reach its height and come down to its crown's base, and drawn in
   to the outline where that moved them out of it. The growing aims at all
   of it, so this is a few percent: up to a tenth across, and more up only
   for a tall narrow crown that did not grow to its top.
9. **The wood's thickness** from the pipe model (Shinozaki et al. 1964): a
   branch's cross-section to the 2.4 carries all the twigs beyond it, the
   branches it has shed and the pipes its own length has outlived, so at a
   fork d^Δ = Σ dᵢ^Δ with Δ near 2.1 (measured trees: 1.8 to 2.3, Eloy
   2011). A bole under a crown that starts above breast height has a taper
   of its own instead: its radius goes as the length of stem above it to
   the 0.6 (between a cone and a paraboloid, as measured boles are), with
   its roots flaring at its foot, at its measured radius at breast height;
   the crown's wood is scaled to meet it where the crown starts. (The pipe
   model alone, reckoned in a small crown's short internodes, swelled a
   long clean bole to many times its top's thickness: a thread under the
   crown.) A species that keeps them (`boleStubs`: birch, oak, alder) has
   dead stubs along a long bole, more just under the crown.

`test/structure.test.ts` holds the wood to what measured trees are: every
species' forks to Leonardo's rule, a broadleaf's great limbs straight
enough (path over chord) and few, and the Scots pine's and the spruce's
upper crowns to Rautiainen's exponents.

## How a course's trees are drawn

- **A few are grown.** Each species' trees are sorted by where they stand
  (in the open, at a wood's edge, inside a wood: see *Where a tree
  stands*), then into shapes by how wide their crowns are for their height,
  how high the crown starts and how tall they are for their kind (a
  doubling counting as a crown a sixth of its height wider: a tree's habit
  changes with its size, so a 14 m Torrey pine is not a 4 m one's young
  habit stretched) (and, in a wood, how closed in they are);
  each shape is grown once a seed (two by default), at the shape's typical
  size (see *How a tree grows*), in the light its trees' neighbours leave
  them. Leaves hang in clumps at the twigs, never in the air. A species
  whose trees differ in form at the foot (`forkShare`, `stemShare`) is grown
  from three seeds a shape at the least, each seed chosen so the shape's
  variants are spread over its forms by their shares (`FORM_SEEDS`): a stand
  of twelve shows its forked trunks and clumps among its single stems, not
  two seeds that both came up one stem. `VariantOptions.seed` grows another
  set of the same shapes (the gallery's `?seed=`, by species).
- **Every tree is fitted to its own numbers.** Up the tree in two
  stretches (the trunk to its crown's base, the crown to its top), across
  to its crown radius, and the wood thickened to its trunk radius apart
  from where it runs. So a drawn tree fills the space its numbers give,
  which is what a ball hitting it meets. It is then turned, maybe mirrored,
  leant up to 3 degrees and tinted. An edge tree is turned so its open side
  faces its own open ground (give or take 17 degrees), and leans that way.
- **Three tiers, chosen on the graphics card.** A compute pass puts every
  tree in view on the list of the tier its size in the picture calls for:
  near (all its wood, down to the twigs, and three dabs to a clump of
  leaves, one more over any of its twigs they leave out), mid (its limbs
  and branches, its clumps gathered into at most 56 broad dabs), far (16
  dabs and a stroke for its trunk). A conifer's boughs, near and mid, are
  sheets (see *Boughs*). Each tier is one mesh holding every variant, drawn
  once per variant by an indirect draw for as many trees as are on its
  list: nothing out of view costs a vertex. A tree passing between tiers is
  drawn by both, each in the pixels the other leaves; the realistic look's
  leaves piece by piece instead, each card, dab or sheet growing in or
  shrinking away by a number of its own as the other tier's do the
  opposite (`pieceShare`): the two tiers' leaves do not lie in the same
  places, and handed over pixel by pixel they were a speckle of sky inside
  the crown and of leaves outside it over the whole hand-over.
- **The wood is drawn as wood**: a tube along a curve through the nodes
  (a cubic through each, running the way the wood runs there), its rings
  at even steps of its turning (9 degrees on limbs, 14 on twigs, close to;
  18 and 29 mid), as many-sided as it is thick (16 round the trunk, 4
  round a twig), on through each node into its thickest child, which goes
  straightest on. A limb starts inside its parent and bends out of it,
  flaring where it leaves (its collar); a fork starts back along its
  parent, and the two part as one divides. Where a limb leaves, its
  surface is lit and furrowed as its parent's is, easing to its own: two
  tubes meet in a crease, and lit as one they read as one wood. A trunk
  stands on four to six buttresses, gone by breast height, and every end
  is closed, rounded on thick wood. (`test/wood.test.ts`.)
- **The realistic look** draws a near tree's clumps as leaf cards set in
  the crown at angles of their own, each spray growing from a twig (its
  foot on one of the clump's twigs or the last of the wood leading to it),
  facing out and up as leaves turn to the light, turned a little to the
  eye so none is seen edge-on; lit as the sun
  lights them, with light through the leaves to an eye looking towards it.
  The sprays are drawn by arithmetic, eight of them (broad, oak, eucalyptus,
  willow, fir, pine, box, a round-leaved shrub): a species says which kind
  its leaves are (`leafKind`). Mid and far trees are the same sprays turned
  to the eye.
- **Light from the crown's own leaves.** Sunlight reaching a leaf falls off
  as exp(-sum of k dl) over the leaves it crosses (Monsi and Saeki). Each
  grown tree has a small box of cells over it (`light.ts`: 18 x 24 x 18, two
  bytes a cell, some 15 KB a variant, all of them in one 3D texture): how
  thick its leaves and limbs are to the light in each cell, and how much of
  the sky each cell sees past them. The leaves are its clumps, each a ball
  of leaves with leaf area by its cross-section, together the leaf area its
  species' crown carries (a leaf area index of 1.5 to 6.3 over the crown's
  ground, by how open it is); the limbs take the light as cylinders do (not
  the stem, which would shade its own bark). The sky is baked once, swept
  down the box layer by layer along sixteen directions over the sky. Every
  fitted tree reads its variant's box: the vertex shaders carry the point
  back into the variant's frame (the fit undone) and march six steps
  towards the sun, the sun's direction stretched as the crown is, each at a
  place of its own along its step (the piece's own number: no noise from
  frame to frame), from a cell and a half out (the cells blur the leaves a
  metre wide, and a shoot on the sunny side would be in its own blur); the
  sky is one read. So a bough shades the one below, the sun comes through
  the gaps, the outer shoots on the sun's side are lit and the pockets
  inside are not, and the trunk and limbs under a dense crown are in its
  shade. The march follows the sun as it moves; nothing is baked for it.
  A far dab, which stands for a gathered group of clumps, is lit half its
  size out along its facing, as the near leaves it hands over to are. The
  style's `structure` says how far a crown's light is its own leaves' and
  how far its ellipsoid's (a hollow heart, as before; `selfShade` scales
  that one), `density` how thick the leaves are to the light. A dab faces
  as the crown's outside does there, turned towards its own clump's face.
  The ground's shade (`bakeShade`) marches the same boxes, so a crown's
  shadow has its gaps.
- **Wind from the place and the time.** The tree leans with gusts as they
  reach it, a tall one later and slower; each limb swings about its foot on
  its own beat. Nothing is kept from frame to frame.

On this Mac (Apple, 3200 x 2000, 4x MSAA), 30,000 trees over 2.4 km of 30
species cost 2.4 to 3.4 ms of the graphics card's time a frame in the painted
look and 4.5 to 7.2 ms in the realistic one, ground and sky included; the
cull pass 0.02 ms. `await __treeLab.measure()` in the lab measures it.
That was before the near tier drew its twigs, and before its wood was
curved: a near tree's wood is now some 25,000 triangles and 14,700
vertices on average over the species (9,700 and 9,700 straight, 1,500
before the twigs), a mid tree's 1,160 (620). In the lab's grove (400
trees, 107 near from the clearing) the wood takes some 0.7 ms of a 2.4 ms
frame in the clearing and 0.55 of 1.8 ms from outside, 0.4 and 0.33 ms of
2.15 and 1.5 drawn straight.

## Where a tree stands

A course is mostly woods seen from a fairway, 50 to 200 m off, and a wood
is not a row of trees each grown alone. Its edge trees keep long low
branches and dense leaves on the side facing the open ground and reach
out to the light there, while their side in the wood dies back; inside, a
tree keeps a crown only high up, on a tall clean bole, and little sky
reaches in. All of it is the light: a tree's sky comes from round it as
much as from above, and its neighbours' crowns hide the low sky on their
side.

**Each tree's stand** (`standsOf`, `stand.ts`) is worked out from where the
trees stand and how big their crowns are, through a grid of cells hashed by
place (some 200 ms for 30,000 trees on this Mac). Round each tree, in
sixteen sectors: how much of each its neighbours' crowns fill, as walls of
leaves standing past its own crown. A neighbour counts by the angle its
crown spans, by how far it reaches over this tree's crown base (a shrub
under an oak hides nothing of the oak's sky), by how near it stands (one a
tree's height off past the crowns hides little), and one crown hides only
seven tenths of what is behind it, so a way is closed as far as the wood is
crowns deep. The sixteen are kept as the first two terms of their Fourier
series: how closed it is all round (`enclosure`: 0 in the open, about a half
at a straight edge, 0.8 and more inside a wood), how much more on one side
(`lopsided`) and which way it is most open; and how tall the walls stand
and how far off. A host may set any of it, tree by tree.

**Three kinds of tree are grown from it.** Where even its most open side is
mostly closed, a tree is grown as one inside a wood; where one side is closed
and another open, as one at an edge; else as one in the open, as it always
was (`standingOf`). Each kind is grown for its trees' stand on the whole,
its open side along +x, and every tree of it is turned so that side faces
its own open ground. Shrubs and palms are grown as in the open wherever
they stand; a tree alone, or a park's trees 30 m apart, are grown and lit
exactly as before.

**Grown in the light its neighbours leave it** (`grow.ts`). Of the sky that
would reach a place in the crown were the tree alone, the share its stand
leaves it (`standShare`): its sky comes through its own crown either way
(exp(-k L) over the leafy shell a ray crosses, as the shaders light a
crown), and the walls hide what comes in below their tops. So a place on
an edge tree's wood side, which had most of its sky from that side, keeps
only what comes over or through the rest of the crown, and a place on its
open side loses only what reached it through the crown already. Taken for
the best lit of the crown, so a sapling in an even shade under a canopy is
grown as one in the open. Where it is under half, the crown does not grow at
all: its lower branches there died young and were shed (a tree always
keeps the top 45% of its height, as foresters find of a dominant tree in a
closed stand); and the rest of the crown is shaded by it beside the best
lit at the same height, so its buds turn to the open side. An edge tree's
great limbs swing out to the open side and those that would end in the
dark are never grown; its leader leans out a little; a conifer's boughs on
its dark side are shorter, or dead and gone; a weeping tree's whips hang no
lower than its crown lives. A crown a wood has lifted is a whole crown of
its kind over what is left of the tree, its outline drawn from where it
starts to the top and as wide as its own outline or that, never past the
crown's ellipsoid (what a ball meets): so a tree inside a wood keeps a full
crown, high up, as wide as its neighbours let it be. Its bole keeps dead
stubs up to the first living limb, a conifer's too.

**Lit as it stands** (`engine.ts`, a fifth row of numbers a tree): the
walls hide the sky below their tops as seen from each piece of the tree,
the way it faces as far as it faces sideways and all round as far as it
faces up, never below a fifth of it (light comes down through the canopy's
gaps and off the leaves round about); and the sun as far as its ray runs
through the walls before it is over their top. So a wood's floor and its
trunks are dim, its inside dark from outside, and its edge bright where the
sun is on it. A tree whose stand is little (under 0.3 closed on its most
closed side) is lit as it always was.

**Cost.** More is grown: the lab's course of 30,000 trees grows 275 variants
for 120 (an edge and an inside kind of most species; inside, one shape
fewer), in 4.5 s for 1.7 s in node on this Mac; its stands are worked out in
some 0.3 s. Drawing costs no more: a fifth row of numbers a tree, read once a
vertex, and a lifted crown has fewer leaves (the course's views and the wood
edge's measured the same or less, within what other work on this Mac
swings them by).

`test/stand.test.ts` holds it: a tree alone and the specimens are in the
open; a wood's front row stands at its edge, open to the open ground, and
its inside is interior; an open stand grows the same tree as none; at an
edge a tree keeps its leaves low on the open side and loses the wood
side's, inside it is lifted and keeps its top, and wherever it stands it
keeps to its box and to its outline or its ellipsoid; an edge tree faces
and leans its own way.

## Photographs

The realistic look wears photographs: scanned bark and scanned leaves, CC0
from [ambientCG](https://ambientcg.com) and [Poly Haven](https://polyhaven.com),
and, where no scan exists, AI-generated pictures (a silver birch's bark, its
rugged foot's too, a beech's, a blue gum's rough stocking and smooth streaked
stem, a Scots pine's copper upper flakes, a stone pine's plates, a black
alder's, a coast live oak's, a weeping willow's, a Lombardy poplar's, a Torrey
pine's, a sugar maple's and a red oak's bark, and a Monterey pine's, an Aleppo
pine's, a Corsican pine's, an eastern white pine's, a Sitka spruce's, a white
spruce's and a Monterey cypress's; a Canary palm's trunk and frond,
a blue gum's sickle leaves, a London plane's leaves, a coast live oak's, a
hawthorn's, a black alder's, a California sycamore's, a Lombardy poplar's, a
silver birch's and a weeping willow's, a gorse's flowering sprigs, a Monterey
cypress's sprays and pads, the pines' cushions and clumps, a Torrey pine's, an
eastern white pine's and a Corsican pine's shoots, a Sitka spruce's, a white
spruce's and a Douglas fir's branch tips; the palms' fans, queen palm frond, dead skirt
and pineapple cut, and the painted fronds and fans of the other looks), all
credited in `assets/SOURCES.md` with the tool and the prompt each was made with
(the generated ones marked so: they are not CC0). A generated bark is pieced
into a tile from its own overlap, along the path where its two edges differ
least (its streaks first lined up, where it has long ones), and its relief
read from its lightness; a generated sheet of leaves is keyed off its magenta,
each edge taking the colour of the leaf beside it, so no pink rim is left.
`tools/scans/fetch.mjs` downloads the sources, `tools/scans/build.mjs` makes
`assets/` from them (`tools/scans/recipe.mjs` lists both, and how each is cut).
20.5 MB of AVIF (4:4:4 for the normal maps, which WebP's halved colour planes
spoil). Where the owner gave a picture again at 2048 pixels, that one is used.

- **Bark** is a set a species wears (`scans.ts` `SCAN_LOOKS`): a tile of
  1024 texels of bark, its colour (roughness in alpha) and its relief (normal
  and height), with the photograph's long-range light evened out so a repeat
  is not marked. It is wrapped round the wood at its real size (the scan's
  measured size, or one estimated from its pattern against
  `docs/MORPHOLOGY.md`, times the species' `barkScale`): seen from two sides
  square to the wood, each laid up the wood as the bark runs, the two blended
  by which way the surface faces and by their relief, so there is no seam
  round a stem and the furrows run up a limb however it leans. Over a stem's
  root flare and its buttresses it is laid by the length of the surface (not
  up the centre line, which drew it out in long smears where the foot widens)
  and round the stem's radius above the flare, so its furrows run on down
  the flare and spread, and do not cross in chevrons where the two sides
  meet (`geometry.ts` `flareBark`). Its colour is
  the scan's, scaled from the set's mean to the species' bark colour (paler up
  the trunk where the species' is); its relief lights each ridge's sunny side,
  and the sky's light is less deep in its furrows, where moss gathers first.
  A species may give way to a second set up its stem, raggedly, in tongues up
  the furrows: a Scots pine's plates to its copper flakes (which take a colour
  of their own, not its bark's paled), a blue gum's rough stocking to its
  smooth streaks, a birch's black
  foot to its white. The edge runs up and down the furrows in streaks, ragged
  at two sizes, and a foot's own colour lightens up the stem as it gives way,
  so a birch's foot is black and rough at the ground and greys into white
  plates, not a black sock. A birch's white tile has black diamond fissures
  laid into it by the build (`fissures`), where the picture had none. Twigs
  stay a twig's dark grey-brown. Only the near tier's wood wears the
  photographs; further off the bark is drawn as before, in the colours they
  have close to (a foot's, an upper bark's), so a pine's copper does not go
  grey-brown as it passes from near to mid.
- **Leaves** are a sheet of single leaves a species wears, cut from a scan
  and stood upright, laid on the species' own twigs at their real size
  (`sprays.ts`): a row of cards for each species in the trees: three near
  cards (a twig's end of a few shoots, 0.4 to 0.9 m across), two big cards
  (a branch's end, a clump wide: a near clump's mass and a conifer's sheets)
  and two far cards (the mid tier's and the far dabs': the big cards again, or a
  pine's canopy pictures, `cushionFar`), each one of its two by a number of its own. A card is
  drawn from its foot: its first row is where its twig comes in, and the
  shaders lay its first row at its twig's foot (`CARD_V`). An oak's leaves one to a node with a cluster at the tip, a
  maple's in pairs, a blue gum's few long sickles hanging from the twig's end
  (its cards hang too, standing upright, their leaves edge to the sky, as a
  blue gum's do: a card that faced up had no way down along it, and its
  leaves lay flat; its leaves narrowed to its own, 12 to 30 by 2 to 3 cm, and
  hung alternately along the shoot, as gathered at its end they lay over one
  another into an oak's lobed leaf), a willow's and a birch's along hanging
  whips; a fir's and a cedar's whole scanned sprays. A pine's are its shoots
  grown as a pine grows them, a whorl of two or three a year, each putting out
  its own, turning up at their ends, and a tuft of needles only at the end of
  each, the wood behind it bare (`pineShoots`): a long-needled pine's twig two
  or three big brushes, a short-needled one's a dozen small ones, as long as
  its needles (`needleCm`, from `docs/MORPHOLOGY.md`), and its big card a
  branch of them, a candelabrum with sky between. A tuft is drawn needle by
  needle, each bundle set in three dimensions (forward near the tip, standing
  out square and falling back further down) and seen side-on: a starburst,
  darker at its heart, its needles lying together in spokes so a tuft keeps
  its spikes when the card is mipped down a few dozen metres off. Its picture
  as a fan to a shoot made a pine's spray a palmate leaf, and its crown a
  broad leaf's. A pine's cards are turned about their shoots to the eye (a
  brush is alike all round), keep a soft fringe of needle tips while a pixel
  is a few of their texels, and close over their gaps as they are mipped, its
  big card most (`coverageMips`, a fill a cell). A Canary palm's card a
  two-metre stretch of its frond, a fan palm's its whole fan. A crown in pads
  (`pads`) lays its sprays level and facing the sky, in shelves wider than high, so a Monterey cypress is
  flat-topped tiers and not a heap of balls. The near cards are many small ones (as many to a clump as
  cover it, at most 36), spread through the clump about its shoots, over two
  big cards a clump set into it, its mass (three under needles and scales,
  none under a pine's tufts, whose picture a clump wide was a lump close to,
  as many tufts to a clump as the pine is dense). A dense species' big card (`openness` under 0.4)
  has a second branch's leaves behind its own, darker, in their shade: one
  layer of sprays left gaps a dense crown does not have. Close to, a big card
  is turned to the eye at least two thirds of the way (seen near edge on, a
  picture a clump wide was a smear through the crown, its mip chosen by the
  way it is squeezed most), as a mid tree's cards are, and it gives way to the small sprays over it from
  five of its half widths off, gone by two and a half, where its texels would
  be larger than a pixel.
  The card keeps the drawn sprays' channels (a grey tone
  from the scan's lightness, lit a little by its own relief; each leaf's own
  thinness, from the scan's translucency; coverage), so the shaders read
  either alike and the species' colour still tints them.
- **Cost** of the polish above (bunches, pads, curtains, closed big cards,
  needles, big cards giving way close to): in the lab's grove, 1104 x 1868,
  the frame took 1.37 to 1.57 ms in the clearing and 1.92 to 2.32 from
  outside before, 1.25 to 1.28 and 1.70 to 1.72 after (two runs each,
  interleaved; this Mac is shared): fewer near cards on a pine and on a blue
  gum's bunches pay for the rest.
- **Pines as cushions** (the owner's stone pine references: dense cushions, lit on top
  and dark beneath, on a flat-topped layer). A pine's tuft is a brush along its
  shoot's last years (`ScanLook.brush`, in needle lengths: a stone pine's 2, a Monterey
  pine's 1.8, a Scots pine's 1.6, an Aleppo pine's 1.2), its needles behind the tip's
  starburst standing forward as a bottle brush's, in a dozen or more bundles (a few big
  spokes were a palmate leaf a few dozen metres off). Its big card is a branch seen
  side-on, its shoots rising off it (`pineBranch`): a cushion flat beneath and domed
  above, wider than high, its wood half a near card's; a pine's mid cards stand up on
  their twigs (`cardPieces`' `rises`) so the cushions stay cushions, and a dense pine
  (`openness` under 0.45) has one under its near tufts. Its cards are lit by how high
  each corner is in its clump (`aTangent.w`): dark at the clump's foot, lighter and
  yellower at its top. Its light box holds its leaf area times a clumping index of
  0.55 (Chen and Black 1992): spread evenly through each clump's ball, it shaded the
  cushions' sunlit tops. Its near cards spread above their shoots, not under them.
- **Which way up a card is.** Thought drawn upside down on their twigs (a triangle card
  had shown its point down on a pine), a pine's cards had been written bottom row
  first; its tufts then hung under their shoots, their bare wood stood above them as
  sticks over the crown, and its big cards' cushions hung under their branches. They
  were never upside down: three's WebGPU renderer samples a DataTexture's first row at
  v = 0, as WebGL does (`flipY` is for pictures, not data; checked in the lab with a
  texture of two rows), the shaders lay v = 0 at a card's foot corner, and every
  card is drawn from its foot. A triangle on every card, with every twig turned up,
  stands point up; a willow's hanging whips hang theirs point down. A pine's twigs
  mostly rise, but not all (a fifth lie sideways, a twentieth point down, under the
  crown), which is likely what was seen. Now every card is written the one way, first
  row at the foot (`test/orientation.test.ts`), and no other species needed retuning.
- **Pines' cushions** (`ScanLook.cushion`). A stone pine's canopy is many dense cushions of
  tufts, lit yellow-green on top and near black beneath, with dark creases between
  them, as photographs show it: built of many small needle cards, it read as a scatter
  of leafy blobs. A pine with cushions has them on its big cards, one to a card, as
  game foliage lays its cluster cards: a picture of a cushion (a leaf set of whole
  pictures, when there are any), or one drawn needle by needle (`"drawn"`,
  `drawnCushionCard`): a dome as wide as the card on a flat base curling up a little
  at its ends, puffs on its top and shoulders, packed with the pine's own tufts at
  their size, each lit as high as it is in its puff and in the dome, darker in the
  creases where two puffs meet; an open pine's (an Aleppo pine's) a few loose lumps
  of its own at heights of their own, with air between. Two to a clump near to,
  1.45 of its radius from their middle (one to an open pine's clump), and every mid
  card: each stands upright on its twig, facing out of the crown level
  (`cardPieces`' `upright`), and the shader turns it to the eye about the vertical,
  a cylindrical billboard, so its flat base stays level; looked at steeply (from
  under the crown) it tips over to the eye, a mass overhead and not a card edge on.
  A far dab of such a pine stands upright too. Its tuft cards are fewer (three tenths
  of a pine's) and drawn only close to, whole to 9 m and gone by 15 m: a tuft a few
  pixels across was a broad leaf's blot on the cushions. Its wood thinner than 2 cm
  is not drawn (it crossed over the cushions as sticks); its limbs are.
- **Cushions from photographs.** The owner's pictures (AI-generated, not CC0; `assets/SOURCES.md`),
  keyed off magenta and kept whole (`tools/scans`): a stone pine's single cushions on its big
  cards and strips of its canopy, several cushions side by side over crooked branches, on its
  far cards, its mid cards 2.6 of a clump's radius from their middle so a strip's cushions are
  a cushion's size; a Monterey pine's dense dark clumps; an Aleppo pine's open grey-green
  ones, twigs showing; a Scots pine's blue-green ones; a Monterey cypress's flat-topped pads
  (its whole sprays fewer over them). Each card keeps its picture's own light and shade as
  its tone, and its warmth (red over blue beside its sheet's mean) in the channel the drawn
  cards spend on tone again: the shader warms its sunlit top and cools its underside by it
  (`CUSHION_WARMTH`), and lays only a little of a pine's clump shading over it
  (`CUSHION_PHOTO_SHADE`), lit from the light box half a card up, at its top, and not its
  middle, deep in the clump, which darkened a picture already dark beneath. How many to a
  clump and how big go with how closed the crown is (`closedOf`, openness 0.25 to 0.6,
  squared): four 2 clump radii from their middle on a stone pine, a Monterey pine or a
  cypress, about two of 1.4 on a Scots pine, one of 1.1 on an Aleppo pine. Their sizes vary
  by a third either way and they stand up to half a clump's radius up or down their twigs,
  so the crown seen from beneath is not rings of plates at one height; tipped over to an eye
  below, from 20 degrees up, they are drawn up to 1.6 times bigger, closing into a ceiling,
  and darkened to their undersides. Close overhead they give way to the pine's own tufts from
  further off than other big cards do (`PINE_BENEATH_FAR`, 2.5 times as far): under a stone pine a
  player sees its brushes on their reddish branches with sky between, as the owner's reference
  picture has it, not the cushions' dark undersides, stacked plates. The stone pine wears its own bark too, thick reddish
  plates between deep fissures (`stonePine`, a tile 1.2 m square). The drawn cushions
  (`"drawn"`) remain for a pine with no pictures.
- **A photograph's tone at the species' colour.** A species' leaf colour is its crown's as it is seen
  from some way off (`docs/MORPHOLOGY.md`), its own leaves' shade already in it. A card's tone is
  each leaf's lightness over its sheet's mean, 0.6 on average, and the shader had laid it on at 1.12
  (as the drawn marks' are), so a photographed crown was 0.67 of its colour before the crown's own
  shade and the sun were laid over it: the pictures' shade under their leaves counted twice, and the
  crowns came out darker than the photographs beside them in the gallery. A photographed card's tone
  is now brought to its species' colour on average (`PHOTO_TONE`, 1/0.6), every realistic crown about
  half again as bright in linear light; the drawn sprays (`scans: false`) are as they were.
- **Pads in layers** (`ScanLook.padThick`). A Monterey cypress's pad picture is a thin shelf, a fifth
  as high as wide; laid one to a card, an old coastal cypress's thick flat-topped shelves (1–2 m deep,
  the Lone Cypress's) were thin dark discs floating apart. Each pad card now lays its picture in up to
  four layers, each a little narrower, higher and to one side, the higher ones behind, a quarter
  taller than the picture, until the pad is 0.45 as thick as wide: lumpy, lit along each layer's top,
  dark beneath. Its pads are bigger (`cushionSize`, 2.8 clump radii from their middle, its mid cards
  as big), so they join each other and the crown into flat-topped masses, and it has as many whole
  sprays as a crown without pads, a third of them hanging under the pads, so the wood leading into a
  shelf is clothed near it; and five short sprays more a shelf along the wood leading up into it, over
  3.5 m of it (`FixedCards.clothe`). A shelf stands up from its wood, never dropped under it (hung below,
  its own limb ran on bare above it). Seen from well beneath (tipped more than 0.6 of the way over to the
  eye), a cushion card is turned its own way about the eye, and a pad's drawn longer up its picture, about
  as deep as it is wide: their up had been the way out from under the eye, the same for every one
  overhead, so their wide low pictures lay in rings of stretched bands round the eye. From the tee
  they stay level bands.
- **A Monterey pine in clumps.** Real Monterey pines are dense but lumpy: distinct rounded clumps, sky
  between them, an irregular outline (the Big Sur reference). Its cushion a clump had been 2.1 of the
  clump's radius from its middle, its clumps even through the crown 1.4 radii apart: side-on, under 1% of
  the crown inside its outline showed sky, one heavy mass. Its leaves now gather into bunches at its
  branches' ends, some branches bare (`clusters` 0.7), it is a little more open (0.35) and lumpier (lobes
  0.6), and its cushion is 1.2 radii: some 10% sky inside its outline, the clumps rounded masses apart,
  its bare lower limbs showing under them (`test/realLook.test.ts`).
- **Flowers** (`ScanLook.flowers`, the style's `bloom`). A gorse wears its own sprigs whole (a
  `sprays` kind, as a cypress's), their yellow pea flowers along their upper half. Its cards keep
  how far each texel is a flower (yellow or orange: red and green well over blue, red not under
  green; `flowerOf`) in the channel the drawn cards spend on tone again, each flower's tone against
  the flowers' mean and each spine's against the spines', and the shader colours a flower in the
  look's own flower colour (`#f2c230`), lit as the leaf there is (the light on the leaf over the
  leaf's colour, times the flower's; the air's own light taken off and put back). `bloom` is the
  share of a bush's sprays in flower, each by its own number: 1 in full flower, 0 out of flower (its
  flowers gone and its spines left); 0.3 with no day given, a few flowers, not a bush mostly yellow.
  Given the day of the year (`trees.environment.day`), a species' own year says instead
  (`ScanLook.flowering`, eased between the days it names and round from December to January, written to
  the species' rows only when the day changes): common gorse's (`GORSE_FLOWERING`) mainly in flower from
  January to June, at its height from March to May (0.95 on the 20th of April), a few flowers the rest of
  the year (0.08 to 0.18; Clements et al. 2001, Tarayre et al. 2007). A host south of the equator passes
  the day half a year on.
- **Shoots for tufts** (`ScanLook.tuftPicture`). An eastern white pine's needles are long, soft and
  fine, in fives; drawn needle by needle as a Scots pine's they were stiff spiky brushes. Its tufts
  are laid from its own shoot pictures instead, a soft drooping tassel at each shoot's end (the
  picture three needles long, its brush reaching as far past the shoot as a drawn tuft would). A
  Corsican pine's from its own shoots too, a stout twig in a brush of long stiff needles (the picture two
  needles long, `tuftShoot`). A Torrey pine's long stiff grey-green brushes from its own: its picture is
  mostly brush (`tuftShoot` 1.6), so it is cut where its brush begins (`tuftFrom` 0.3, its bare twig left
  to the card's own wood) and laid five to a tuft, fanned 0.55 rad apart about the brush's foot
  (`tuftFan`), each a little longer or shorter, over the pine's own drawn needles, a little longer than
  them: one flat-laid picture was a narrow tassel, a broad leaf's blot from the tee, and a fan of pictures
  alone a fan palm's leaf from under the crown; the drawn needles give the brush its edge of needle tips.
- **A pine's tufts drawn for each mip** (`pineMip`, `coverageMips`' `drawn`). From the tee a pine read as a
  broad leaf: averaged down, each needle a quarter of a texel wide was a quarter of an alpha, under the cut, so
  the mips kept only a tuft's dense heart, and the coverage the mips keep (Castaño) went to filling that heart
  out into a disc, a broad leaf's blot. Now a pine's needled cards (`needledCards`: its near cards, and its big
  and far ones unless they are photographs; not a pine whose tufts are one shoot picture each) have their first
  four mips drawn for themselves: the row drawn again at full size with each needle as wide as that mip's texel
  and kept by chance as often as it is narrower than that, so a tuft covers about what its needles do but in
  spokes a texel wide with sky between, then averaged down (Cook et al. 2007, *Stochastic simplification of
  aggregate detail*: fewer elements, each bigger, the same cover). Their alpha is scaled up to the full-size
  share where it falls short, never down; past the fourth mip they are averaged on as before. A Torrey pine's
  fanned shoot pictures, the few big lobes of a palmate leaf a few dozen metres off, are left out of its mips
  from the second on, its drawn needles half again as many in their place. Each tuft's needles are lit as a
  brush is from above (`TUFT_UP_LIGHT`): those pointing up lighter, those hanging darker, the inner half of each
  needle darker (`TUFT_HEART`), a dark heart and lit tips rather than one flat tone. At the third and fourth
  mips (a near card from the tee) a tuft's outline at the cut is a fifth to a quarter longer for its area than
  averaged, its cover within a tenth of what it was (Torrey 10.7 to 13.7 at the third, Stone 11.0 to 13.5,
  Monterey 10.1 to 12.8, Aleppo 14.2 to 16.5; `test/pineMips.test.ts`, `test/silhouette.ts`). No more texture
  or shader work on the graphics card: the same atlas and mips, only their pictures differ. The page draws each
  pine's row four times more once its leaves come, some 60 ms a level at 512 texels a card (a quarter of that
  at 256), a mip at a time between frames.
- **A lean** (`TreeSpecies.lean`). A Torrey pine on the bluffs leans (MORPHOLOGY.md 19, the owner's
  reference): grown leaning 16 degrees its own way from its foot, turning upright near its crown's base, so its
  crown stands over its foot and keeps to its box, which a ball meets (the grower's `lean`, merged with the
  California sycamore's: one lean, grown into the trunk).
- **Scots and stone pines against their references.** A Scots pine forks at its crown's base into two or three
  heavy orange sub-leaders in seven trees of ten (MORPHOLOGY.md 5), on a straighter, thicker stem, olive where
  lit. Its references' crown is flat-topped, the photographed tree's (`test/outlines.json`, a solitary Dutch
  tree of no stated age) widest just over its crown's base and round-topped, a middle-aged tree's; the outline
  test holds it to that (9.4% off, 11.7% before), and Rautiainen et al.'s upper-crown shape (t 1.47, measured 1.35), so its top stays round. A stone pine forks lower (two thirds of its crown
  base) into three thick stems, a trunk 1.4 m through (1.24 before), its crown shallower and its cushions six smaller ones to a
  clump, a smoother umbrella.
- **Where one bark gives way to the next** is laid round the tree's own axis and up its height, eased
  pixel by pixel: laid round each tube and along it, and eased once a vertex, a forked stem's or a
  clump's stems took the pattern up afresh where they part, and a sycamore's or a birch's foot bark
  ended in a line round the top of its root plate.
- **The bark's stand-in.** Until the photographs come, the bark's texture is one texel. three builds a
  texture's sampling into the shader from the texture there when the wood is first drawn, and the stand-in
  had its defaults, nearest on both sides and clamped: built so, the photographs were read a texel at a time
  and clamped at the tile's edge wherever the bark ran past it, long vertical streaks up every stem close
  to. The lab draws before they come and showed it; the gallery waits for `ready`. The stand-in and the
  sets are now made by one function (`barkLayers`, `test/barkTexture.test.ts`), sampled alike.
- **Cost** of the sixth round (the 2048-pixel pictures, the conifers' own bark and shoots, the Monterey pine's clumps,
  the cypress's clothed limbs, the Torrey pine's fanned brushes): in the lab's grove, 1104 x 1868, the least of two or
  three runs each, interleaved against main on a shared, busy Mac: the mixed grove 1.38 ms in the clearing and 1.30
  from outside before, 1.46 and 1.31 after; a grove of Monterey cypresses 1.20 and 1.38 before, 1.45 and 1.34 after
  (five sprays more a shelf near to); of Monterey pines 0.95 and 1.50 before, 0.87 and 1.11 after (smaller cushions,
  fewer clumps); of Torrey pines 0.96 and 0.78 before, 0.97 and 0.78 after. The pictures added to the package are
  3.6 MB of AVIF (seven bark sets, four shoot sets, and the 2048-pixel pictures a little bigger than the 1024 ones):
  20.5 MB of bark and leaves, 22.2 MB with the painted marks.
- **Cost** of the fifth batch (pads in layers, the Monterey pine's cushions, gorse's sprigs and flowers, the white
  pine's shoots, the new bark and leaves): in the lab's grove, 3456 x 2006, the least of two or three runs each,
  interleaved against main on a shared, busy Mac (graphics card's time for the frame): the mixed grove 4.08 ms in
  the clearing and 2.77 from outside before, 3.50 and 3.03 after; a grove of Monterey cypresses 3.81 and 3.65 before,
  4.14 and 3.32 after (bigger, layered pads and more sprays near to); of Monterey pines 3.22 and 3.03 before, 2.82 and
  2.69 after (one cushion a clump, not four); of gorse (all far dabs there) 0.87 and 0.81 before, 0.78 and 0.78
  after. All within this Mac's noise but perhaps the cypress's clearing, some 0.3 ms. The pictures added to the
  package are 4.1 MB of AVIF (eight leaf sets and eight bark sets): 16.9 MB in all.
- **Cost** of the photographed cushions: in the lab's grove of stone pines only, 3456 x 2006,
  the frame took 3.48 and 3.28 ms in the clearing and 2.51 and 2.53 from outside before, 4.01
  and 4.02 and 3.40 and 4.21 after (runs interleaved against the drawn cushions, on a shared,
  busy Mac): more and bigger cushion cards near to, and mid cards a strip of canopy each, more
  overdraw. The mixed grove (a Scots pine's clumps in it) 3.36 and 2.89 ms before, 3.40 and
  2.42 after. On the graphics card the cards' atlas is seven cards a row (from five); the
  pictures added to the package are 2.7 MB of AVIF (six leaf sets and a bark set).
- **Cost** of the cushion cards (and two big cards a species row): in the lab's grove
  of stone pines only (`?scene=grove&fill=1`, 400 trees), 3456 x 1892, the frame took
  6.24 and 4.51 ms in the clearing and 5.19 and 2.62 from outside before, 3.96 and 3.01
  and 3.15 and 2.15 after (runs interleaved against the commit before, on a shared,
  busy Mac): a cushion card a few tufts' cards' worth, and three tenths of the tufts.
  In the mixed grove (no cushioned pine in it) 4.44 and 3.71 ms before, 4.29 and 3.52
  after. On the graphics card the cards' atlas is a quarter wider (five cards a row).
- **Cost** of the pines as cushions: in the lab's grove, 3456 x 2006, the frame took
  3.81 to 3.89 ms in the clearing and 3.39 to 3.50 from outside before, 4.05 to 5.63
  and 3.68 to 5.14 after (runs interleaved on a shared, busy Mac): more near cards to a
  dense pine's clump, and a cushion card under them.
- **Cost** of the pines' shoots, the hand-over piece by piece and the bark
  over the flare: in the lab's grove, 1104 x 1868, the frame took 1.29 to
  1.34 ms in the clearing and 1.70 to 1.80 from outside before, 1.21 to 1.45
  and 1.91 to 2.05 after (a mid tree's cards turned to the eye cover more); in
  the wood edge, from the fairway at 100 m and 60 m, 3.62 and 4.24 ms at the
  least before, 2.82 and 3.50 after (likely the hand-over: a tree in it no
  longer draws both tiers whole and throws half away). Runs interleaved on a
  shared, busy Mac.
- **Cost** when the photographs came: in the lab's grove, 1552 x 1868, the frame took 1.80 to 1.92 ms
  in the clearing and 2.40 to 2.45 from outside, against 1.35 to 1.58 and 1.75 to
  1.83 without the photographs (`scans: false`): the near cards about twice
  as many (four light steps each instead of six), the near wood's bark
  sampled four times a pixel. On the graphics card: the bark set's layers
  (1024 square, mipmapped, two textures) about 11 MB each, and the cards 4
  MB a species row (512 texels a card for up to six species, 256 beyond).

## Left out, for now

- The photographs: a birch's dark diamonds are not drawn; the leaves' own colour is used only as lightness (the
  species gives the hue); the cards are composed on the page's thread, a row
  of cards a task (a worker would keep a busy page smoother); a set's tile
  repeats along a tall straight stem.

- Pines grown as broadleaves (Scots, Monterey, Torrey, Aleppo, stone) keep
  their clusters and cards: their tufts want sheets of their own, pads
  along the twigs. A species' kind of sheet is chosen when the trees are
  made: changing its leaves in the lab needs it grown again.

- Trees' shadows on each other and on what stands under them (the ground's
  shade is baked; see above): a tree's light is its own leaves' and its
  stand's, not a neighbour's crown's in particular.
- A tree's light box is its clumps' leaves, blurred about a cell wide: a
  conifer's sheets and a realistic crown's cards reach past their clumps
  and are not in it as drawn; the stem is not in it; the sky it sees is
  baked for the tree as grown, not stretched with its fit.
- Impostors for the farthest trees.
- A fan palm's skirt of dead fronds; multi-stemmed trees (a sycamore's, a
  live oak's).
- In a wood: crowns that press into each other's shapes (each is still its
  kind's outline, lifted or lopsided), the light that comes in under an
  edge's crowns to the trees behind it, and the undergrowth, which is the
  host's to plant (the lab's wood has some).
- Phones: WebGPU only.
