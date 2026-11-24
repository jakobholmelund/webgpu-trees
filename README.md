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
- **Light and wind** (`trees.environment`) are the host's to set, as the
  grass takes them: the sun's direction, the colour of sunlight and of
  shade, the wind's heading and speed. `world.sun(xz)` and `world.air(colour,
  at)` let a host's clouds and haze reach the trees.

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
| `painterly` | lumpy clusters of small crisp leaves of the species' kind (`marks.ts`), never longer than `leafSize` metres however big the crown: ovate leaves for broadleaves, round leaves for small-leaved trees, curved leaflets for palms; a conifer's boughs as sheets of needles (*Boughs*) | a few big lobes, warm yellow-green where lit, cool teal in shade, a rim against the sun |
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
A cluster is a lumpy mass of a few round lobes, darker under its leaves,
the leaves pointing out from their lobe, so its outline is ragged leaf
tips all round and no ring of tips pointing out like a star.

**Marks.** All drawn by arithmetic, no picture loaded. A painterly leaf is
an outline about its midrib, folded (one half a little darker), lighter
to its tip, its own tone, casting a thin shadow on what it lies over;
green carries a number of each leaf's own, so leaves in the light vary one
by one. A mark's edge is sharpened over one pixel, so leaves stay crisp
close to, where a texel covers more than a pixel, and keep their coverage
far off (see *Far leaves*).

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
| Eucalyptus | *Eucalyptus globulus* | a high open vase of pale limbs, grey-green sprays | california | 26 | 8.5 | 7.5 |
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
| Corsican pine | *Pinus nigra* | a dark dense oval pine | netherlands, denmark, france, great-britain | 18 | 4.5 | 5 |
| Douglas fir | *Pseudotsuga menziesii* | a tall, somewhat open cone | pacific-northwest, denmark | 30 | 5 | 3 |
| Western red cedar | *Thuja plicata* | a cone of drooping sprays, red bark | pacific-northwest | 20 | 4.5 | 1 |
| Monterey cypress | *Hesperocyparis macrocarpa* | a wind-shaped flat top on a few great limbs | california | 18 | 7 | 3 |
| Monterey pine | *Pinus radiata* | an irregular rounded crown, grass-green | california | 20 | 6.5 | 5 |
| Torrey pine | *Pinus torreyana* | an open crooked crown, long grey-green needles | california | 15 | 5.5 | 4 |
| Aleppo pine | *Pinus halepensis* | an irregular open crown, grey-green | california, france | 15 | 6.5 | 3 |
| Stone pine | *Pinus pinea* | an umbrella on a tall clear trunk | california, france | 15 | 10.5 | 5 |
| Canary date palm | *Phoenix canariensis* | a big round head of arching fronds on a thick trunk | california | 15 | 5 | 7 |
| Mexican fan palm | *Washingtonia robusta* | a tall thin pole flared at its foot, a small tight head of fan leaves | california | 22 | 2.2 | 18 |
| California fan palm | *Washingtonia filifera* | a stout grey column, a head of grey-green fans; in the wild a skirt of dead leaves to the ground | california | 12 | 2.8 | 9 |
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
stone pines are grown as broadleaves, with needles.

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
weeps (`weep`, 0..1) hangs whips from that share of its outer twigs: a short
arch out, then straight down to as low as the crown's base, leaved all
along (the willow's curtain, the birch's tresses).

What the grower cannot do yet, so those rows come as close as their data
allows: a lean (Torrey, Aleppo, California sycamore; a host leans a tree at
most 3 degrees), several trunks from one foot (a sycamore's, a coast live
oak's).

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
deep narrow one lets them hang.

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
  under a fan palm's crown; `pineapple`, cut back to the leaves above the level,
  its leaf bases trimmed into a ball under the crown. Left out, as courses keep
  them: a Canary palm pineapple cut, the others skinned. Trees kept otherwise
  than their species are their own variants.
- **Drawn**: near, every frond in twelve pieces and every fan in nineteen
  rays; mid, five and nine; far, two and five, a star of fronds round the
  stem. A skirt is shingles of dead leaves round the stem, each row half over
  the one below. The stem wears its bark (a Canary palm's lattice, a fan
  palm's rings), its boots and a pineapple's trimmed bases; where the look
  paints bark flat, their pattern is still drawn faintly. Its leaves' area is
  its fronds' own, which its box of light takes (`GrownTree.leafArea`).
- **Wind**: the stem bends further than a tree's trunk and its crown follows a
  moment late, the bend running up it; the crown tilts as the stem's top does.
  Each frond streams downwind in the gusts, flaps and twists on its own beat
  as its age lets it (a dead one swings freely, a spear hardly moves), and its
  leaflets shimmer.
- **Cost**, a grove of 400 palms of one kind at 1104 x 1868 (graphics card's
  time for the frame, before and after): Canary palms, realistic, 0.83 to
  0.61 ms in the clearing and 1.15 to 0.97 from outside; painterly 0.98 to
  0.63 and 0.92 to 0.99; Mexican fan palms, realistic, 0.45 to 0.45-0.58 and
  0.56 to 0.78-0.83 (a tall palm is drawn near from far off: its tier goes by
  its height in the picture, its crown a small part of it).

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
  a Torrey pine's runs out level and turns up into its candelabra (0, +50); a
  willow's rises and arches over (+5, -55); a Monterey cypress's rises,
  elbows and runs level (-50).
- **`zigzag`**: how far a fine branch turns at each node where its tip died and
  a side bud took the lead (sympodial growth: a plane's, a sycamore's
  twigs, 25 degrees), or none (a maple's, whose terminal bud goes on). Grown
  into the wood after it is smoothed, which would iron a zigzag flat.
- **`phyllotaxis`**: how its side buds are set round a shoot, by the golden
  angle (most trees), opposite and crossed (a maple's: one of each pair
  grown), or in two ranks in the shoot's plane (a beech's flat fans).
- **`sprayHang`**: how far a conifer's side shoots hang from their bough, from
  a fir's flat spray to a Norway spruce's comb or a cedar's hanging sprays.
- **`canopyLift`**: how much of the crown's underside is cleared of leaves,
  a bowl from its rim up into its middle, so its limbs show beneath it: a
  stone pine's umbrella on its bare vase of limbs.
- **`pads`**: how far its leaves gather into flat-topped pads, each branch
  off a great limb keeping only the leaves near its top, with air and bare
  wood under each: a Monterey cypress on a headland, an old Scots pine's
  plates, a Torrey pine's tufts on bare limbs.
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
`]` step the scenes. `?scene=`, `?look=`, `?species=`, `?hour=`, `?wind=`, `?eye=`
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
same pixels. Beside each species are its botanical name, its regions and the
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
`?views=`, `?hour=`, `?wind=`, `?cell=` (width in pixels), `?screen=` (lines)
and `?photos=<address>` (a photograph of your own per species,
`<address><name>.jpg`, from a folder you serve yourself) set it from the
address.

For scripts: `await __gallery.render({ look, views, species })` gives every
cell as a PNG data URL with the tiers drawn; `await __gallery.sheet({...})`
the contact sheet; and with the dev server started as
`GALLERY_OUT=<folder> pnpm dev`, `await __gallery.save({...})` writes the
sheet into that folder and returns where.

## How a tree grows

`growTree(species, size, seed)` grows one tree, the same every time for the
same arguments, in plain arithmetic (no three), in 1 to 20 ms on this Mac.

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
   a few balls on a stick).
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
  stands*), then into shapes by how wide their crowns are for their height
  and how high the crown starts (and, in a wood, how closed in they are);
  each shape is grown once a seed (two by default), at the shape's typical
  size (see *How a tree grows*), in the light its trees' neighbours leave
  them. Leaves hang in clumps at the twigs, never in the air.
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
  drawn by both, each in the pixels the other leaves.
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
and, where no scan exists, a few AI-generated pictures (a silver birch's bark,
a Canary palm's trunk and frond, a blue gum's sickle leaves, the palms' fans,
queen palm frond, dead skirt and pineapple cut, and the painted fronds and fans
of the other looks), all credited in
`assets/SOURCES.md` (the generated ones marked so: they are not CC0).
`tools/scans/fetch.mjs` downloads the sources, `tools/scans/build.mjs` makes
`assets/` from them (`tools/scans/recipe.mjs` lists both, and how each is cut).
8.3 MB of AVIF (4:4:4 for the normal maps, which WebP's halved colour planes
spoil).

- **Bark** is a set a species wears (`scans.ts` `SCAN_LOOKS`): a tile of
  1024 texels of bark, its colour (roughness in alpha) and its relief (normal
  and height), with the photograph's long-range light evened out so a repeat
  is not marked. It is wrapped round the wood at its real size (the scan's
  measured size, or one estimated from its pattern against
  `docs/MORPHOLOGY.md`, times the species' `barkScale`): seen from two sides
  square to the wood, each laid up the wood as the bark runs, the two blended
  by which way the surface faces and by their relief, so there is no seam
  round a stem and the furrows run up a limb however it leans. Its colour is
  the scan's, scaled from the set's mean to the species' bark colour (paler up
  the trunk where the species' is); its relief lights each ridge's sunny side,
  and the sky's light is less deep in its furrows, where moss gathers first.
  A species may give way to a second set up its stem, raggedly, in tongues up
  the furrows: a Scots pine's plates to its orange flakes, a birch's black
  foot to its white. Twigs stay a twig's dark grey-brown. Only the near tier's
  wood wears them; further off the bark is drawn as before.
- **Leaves** are a sheet of single leaves a species wears, cut from a scan
  and stood upright, laid on the species' own twigs at their real size
  (`sprays.ts`): a row of cards for each species in the trees: three near
  cards (a twig's end of a few shoots, 0.4 to 0.9 m across) and one big card
  (a branch's end, a clump wide, for the mid tier, a conifer's sheets and the
  far dabs). An oak's leaves one to a node with a cluster at the tip, a
  maple's in pairs, a blue gum's few long sickles hanging from the twig's end
  (its cards hang too), a willow's and a birch's along hanging whips; a fir's
  and a cedar's whole scanned sprays, a pine's whole shoots fanning from a bare
  stem; a Canary palm's card a two-metre stretch of its frond, a fan palm's
  its whole fan. The near cards are many small ones (as many to a clump as
  cover it, at most 36), spread through the clump about its shoots, over two
  big cards a clump set into it, its mass (three under needles and scales).
  The card keeps the drawn sprays' channels (a grey tone
  from the scan's lightness, lit a little by its own relief; each leaf's own
  thinness, from the scan's translucency; coverage), so the shaders read
  either alike and the species' colour still tints them.
- **Cost**: in the lab's grove, 1552 x 1868, the frame took 1.80 to 1.92 ms
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
  live oak's); leaning trunks.
- In a wood: crowns that press into each other's shapes (each is still its
  kind's outline, lifted or lopsided), the light that comes in under an
  edge's crowns to the trees behind it, and the undergrowth, which is the
  host's to plant (the lab's wood has some).
- Phones: WebGPU only.
