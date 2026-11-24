# Trees

Trees for three.js on WebGPU, written in TSL: grown from a species' data to
each tree's own measured size, and drawn in their tens of thousands. It is the
sibling of [webgpu-grass](https://github.com/jakobholmelund/webgpu-grass), and
began as the trees of Couch Golf Club, a browser golf game.

It is early. It has two looks from the same grown trees: `stylized`, crowns
laid in dabs of paint, as the game draws them, and `real`, crowns of leaf
cards, each a spray of the species' leaves, with furrowed bark.
WebGPU only (three.js r187, `three/webgpu`).

```
src/   the package: imports three and nothing else
lab/   the lab: ground, sky, and the package's trees on it
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
- **A species** is a row of plain data (`species.ts`): how the tree is put
  together (broadleaf, conifer, shrub), its crown's outline, how deep its
  leaves go and how open it is, how it branches, its clumps of leaves, its
  colours and its stiffness. Nothing that draws a tree names a species.
- **Style** (`trees.style`) is how it is drawn, apart from what it is:
  light in painted bands, how round each clump is lit, the dabs' size,
  light through the leaves. **Detail** (`trees.detail`) says at what size
  in the picture each tier takes over.
- **Look** (`createTrees({ look: "real" })`) is chosen when the trees are
  made, the pieces being different; `style` starts as the look's
  (`DEFAULT_STYLE`, `REAL_STYLE`) and can be changed at any time.
- **Shade on the ground**: `trees.bakeShade(area)` works out how much sun
  reaches the ground past the crowns (as their leaves take it), and
  `trees.sunAt(xz)` hands it to a host's ground or grass as a TSL node (the
  grass library takes it as `world.sun`).
- **Light and wind** (`trees.environment`) are the host's to set, as the
  grass takes them: the sun's direction, the colour of sunlight and of
  shade, the wind's heading and speed. `world.sun(xz)` and `world.air(colour,
  at)` let a host's clouds and haze reach the trees.

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
| Mexican fan palm | *Washingtonia robusta* | a tall thin pole with a small tight head of fan leaves | california | 22 | 2.2 | 18 |
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

A palm (`architecture: "palm"`) is one stem, as thick at its top as at
breast height and swollen at its foot, with a head of `whorl` fronds round
its top by the golden angle: the young ones upright, the old ones hanging,
each arching over by `bend` as far as the crown lets it reach; its leaves
hang along each frond's outer four fifths. A broadleaf or a shrub that
weeps (`weep`, 0..1) hangs whips from that share of its outer twigs: a short
arch out, then straight down to as low as the crown's base, leaved all
along (the willow's curtain, the birch's tresses).

What the grower cannot do yet, so those rows come as close as their data
allows: a lean (Torrey, Aleppo, California sycamore; a host leans a tree at
most 3 degrees), several trunks from one foot (a sycamore's, a coast live
oak's), a buttressed foot (western red cedar), and a fan palm's skirt of
dead leaves under its head.

## The lab

```bash
pnpm install
pnpm dev
```

Then open the address it prints (the lab is at `/lab/`). Drag to turn,
right-drag to move, the wheel to come nearer. The bar chooses what stands on
the ground (*One tree*, *Specimen*: one of each, *Grove*: 400, *Course*:
30,000 over 2.4 km), the eye, the hour and the wind; *Envelope* draws each
tree's measured size over it (its crown's box, outline and ellipsoid, its
trunk), which is how one sees a drawn tree fills the numbers it was given.
The rail chooses a species; the inspector changes it (colours and light at
once, its form by growing it again) or the scene (style, detail, which
tiers show, how many variants). *Preset* is all of it as JSON; *Measure*
times the graphics card over fixed views. H puts the panels away, `[` and
`]` step the scenes. `?scene=`, `?species=`, `?hour=`, `?wind=`, `?eye=`
and `?fresh` (ignore what the lab kept) set it from the address.

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
   sees and up or down by `bend`, with a lateral bud at every internode by
   the golden angle at `branchAngle`; and every branch that gathers too
   little light for its wood shed (`shed`). So the crown is a shell of lit
   shoots on bare, branching limbs, its inside shed as it shades.
4. **Leaves** hang in clumps on the lit shoots near their twigs' ends (the
   deeper the species keeps its leaves, `foliageDepth`, the further back),
   bigger the more light they have, and never more than a fifth of the
   crown's radius round (a crown grown narrow in a wood is many sprays, not
   a few balls on a stick).
5. **The wood made good**: smoothed (twice, forks held), bowed by its
   weight (thin wood more, `bend` down more), and its straight runs joined
   into single pieces. A tree that weeps then hangs its whips.
6. **Conifers** grow whorl by whorl instead: a leader to the top and
   `whorl` boughs to each of `whorlsPerMetre` (closer in a narrow crown,
   for its interwhorl branches), each as long as the outline
   lets it be (some missing, some broken short), with side shoots along
   their leafy parts; then smoothed and bowed. **Palms** grow a head of
   fronds on one stem.
7. **Fitted to its size**: across so its leaves reach the crown radius, up
   so they reach its height and come down to its crown's base, and drawn in
   to the outline where that moved them out of it. The growing aims at all
   of it, so this is a few percent: up to a tenth across, and more up only
   for a tall narrow crown that did not grow to its top.
8. **The wood's thickness** from the pipe model (Shinozaki et al. 1964): a
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
   dead stubs and the odd small twig along a long bole, more just under
   the crown; leafless.

`test/structure.test.ts` holds the wood to what measured trees are: every
species' forks to Leonardo's rule, a broadleaf's great limbs straight
enough (path over chord) and few, and the Scots pine's and the spruce's
upper crowns to Rautiainen's exponents.

## How a course's trees are drawn

- **A few are grown.** Each species' trees are sorted into shapes by how
  wide their crowns are for their height and how high the crown starts;
  each shape is grown once a seed (two by default), at the shape's typical
  size (see *How a tree grows*). Leaves hang in clumps at the twigs, never
  in the air.
- **Every tree is fitted to its own numbers.** Up the tree in two
  stretches (the trunk to its crown's base, the crown to its top), across
  to its crown radius, and the wood thickened to its trunk radius apart
  from where it runs. So a drawn tree fills the space its numbers give,
  which is what a ball hitting it meets. It is then turned, maybe mirrored,
  leant up to 3 degrees and tinted.
- **Three tiers, chosen on the graphics card.** A compute pass puts every
  tree in view on the list of the tier its size in the picture calls for:
  near (its wood, and three dabs to a clump of leaves), mid (its limbs,
  its clumps gathered into at most 56 broad dabs), far (16 dabs and a
  stroke for its trunk). Each tier is one mesh holding every variant, drawn
  once per variant by an indirect draw for as many trees as are on its
  list: nothing out of view costs a vertex. A tree passing between tiers is
  drawn by both, each in the pixels the other leaves.
- **The realistic look** draws a near tree's clumps as leaf cards set in
  the crown at angles of their own, facing out and up as leaves turn to the
  light, turned a little to the eye so none is seen edge-on; lit as the sun
  lights them, with light through the leaves to an eye looking towards it.
  The sprays are drawn by arithmetic, eight of them (broad, oak, eucalyptus,
  willow, fir, pine, box, a round-leaved shrub): a species says which kind
  its leaves are (`leafKind`). Mid and far trees are the same sprays turned
  to the eye.
- **Light from the crown's shape.** Sunlight reaching a leaf falls off as
  exp(-k L) over the length L of leafy crown it crosses (Monsi and Saeki),
  the crown taken as its ellipsoid with a hollow heart; a dab faces as the
  crown's outside does there, turned towards its own clump's face.
- **Wind from the place and the time.** The tree leans with gusts as they
  reach it, a tall one later and slower; each limb swings about its foot on
  its own beat. Nothing is kept from frame to frame.

On this Mac (Apple, 3200 x 2000, 4x MSAA), 30,000 trees over 2.4 km of 30
species cost 2.4 to 3.4 ms of the graphics card's time a frame in the painted
look and 4.5 to 7.2 ms in the realistic one, ground and sky included; the
cull pass 0.02 ms. `await __treeLab.measure()` in the lab measures it.

## Left out, for now

- Trees' shadows on each other and on what stands under them (the ground's
  shade is baked; see above).
- Impostors for the farthest trees.
- A fan palm's skirt of dead fronds; multi-stemmed trees (a sycamore's, a
  live oak's); leaning trunks.
- Phones: WebGPU only.
