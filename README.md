# Trees

Trees for three.js on WebGPU, written in TSL: grown from a species' data to
each tree's own measured size, and drawn in their tens of thousands. It is the
sibling of [webgpu-grass](https://github.com/jakobholmelund/webgpu-grass), and
began as the trees of Couch Golf Club, a browser golf game.

It is early: the stylized look comes first (crowns laid in dabs of paint, as
the game draws them); a realistic look from the same grown trees is next.
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
- **Light and wind** (`trees.environment`) are the host's to set, as the
  grass takes them: the sun's direction, the colour of sunlight and of
  shade, the wind's heading and speed. `world.sun(xz)` and `world.air(colour,
  at)` let a host's clouds and haze reach the trees.

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

## How a course's trees are drawn

- **A few are grown.** Each species' trees are sorted into shapes by how
  wide their crowns are for their height and how high the crown starts;
  each shape is grown once a seed (two by default), at the shape's typical
  size. Growing is space colonization into the crown's outline for a
  broadleaf or a shrub (Runions et al. 2007), whorl by whorl for a conifer,
  with the wood's thickness from the pipe model, scaled to the trunk's
  measured radius. Leaves hang in clumps at the twigs, never in the air.
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
- **Light from the crown's shape.** Sunlight reaching a leaf falls off as
  exp(-k L) over the length L of leafy crown it crosses (Monsi and Saeki),
  the crown taken as its ellipsoid with a hollow heart; a dab faces as the
  crown's outside does there, turned towards its own clump's face.
- **Wind from the place and the time.** The tree leans with gusts as they
  reach it, a tall one later and slower; each limb swings about its foot on
  its own beat. Nothing is kept from frame to frame.

On this Mac (Apple, 3200 x 2000, 4x MSAA), 30,000 trees over 2.4 km cost
3 to 3.7 ms of the graphics card's time a frame, ground and sky included;
the cull pass 0.02 ms. `await __treeLab.measure()` in the lab measures it.

## Left out, for now

- The realistic look (leaf cards, bark) from the same grown trees.
- Trees' shadows: on the ground, on each other and on what stands under
  them. (Couch Golf Club bakes its own from the same numbers.)
- Impostors for the farthest trees.
- Weeping and palm forms.
- Phones: WebGPU only.
