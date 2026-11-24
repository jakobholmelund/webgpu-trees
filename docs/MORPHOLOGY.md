# Species morphology reference for the tree library

Covers 31 species plus a generic shrub, for courses in California, the Pacific Northwest, Ontario, Great Britain, France, the Netherlands and Denmark. Compiled 2026-11-24. TALLO per-species medians added the same day.

## How to read this

**Tags on every number.**
- `[S:KEY]` means the figure was read from a source during this research. The keys are listed in "Sources and licences" at the end.
- `[est.]` means my own estimate, from general forestry and dendrology knowledge and the look of the species. Use these as starting values and check them against photographs before a test treats them as truth.
- `[obs.]` means a well-known field appearance that is not given as a number in any source I read.

**Angles are measured from vertical.** 0° points straight up, 90° is horizontal, and more than 90° points below horizontal (drooping). Sources that measure "above horizontal" have been converted.

**Live crown ratio (CR)** is live crown length divided by tree height.

**Crown radius/height (r/H)** is half the mean crown spread divided by tree height. This is the figure to compare with the course data, where woodland trees come out at about 0.08.

**Architecture words.**
- *Excurrent*: the leader persists, giving a single stem to the top and a conic crown.
- *Decurrent*: the leader is lost or overtaken, giving a crown of several large limbs.
- *Sympodial*: each shoot ends and a side bud takes over, which gives zigzag twigs.
- *Monopodial*: the terminal bud keeps extending the same axis.

**Bark colours** are hex approximations of dry bark in diffuse daylight. Wet bark is roughly 30–40 % darker.

---

## Cross-species calibration data

### Open-grown crown diameter versus dbh (Hemery et al. 2005, British broadleaves) [S:HEM]

| dbh (m) | Oak | Beech | Silver birch | Poplar | Sycamore (*Acer pseudoplatanus*) |
|---|---|---|---|---|---|
| 0.10 | 2.50 | 2.52 | 2.58 | 2.71 | 2.48 |
| 0.30 | 6.05 | 5.67 | 5.81 | 6.50 | 6.26 |
| 0.50 | 9.59 | 8.82 | 9.05 | 10.29 | 10.04 |
| 0.70 | 13.14 | 11.96 | 12.29 | 14.08 | 13.82 |

Values are crown diameter in metres. The table is close to linear, and the fitted lines (my fit to the published table) are:
- oak: crown diameter ≈ 0.73 + 17.7·dbh
- beech: ≈ 0.95 + 15.7·dbh
- birch: ≈ 0.96 + 16.2·dbh
- poplar: ≈ 0.82 + 19.0·dbh

These are for open-grown trees only. Hemery says forest-grown trees will not follow them.

### Tallo global allometry database (Jucker et al. 2022, CC BY 4.0) [S:TALLO]

**What the database holds.**
- 498,838 trees with stem diameter, height and/or crown radius. It covers 5,163 species.
- The columns are `tree_id, division, family, genus, species, latitude, longitude, stem_diameter_cm, height_m, crown_radius_m, height_outlier, crown_radius_outlier, reference_id`.
- **There is no open-grown versus forest flag.** Industrial plantations, agroforestry and palms were excluded at compilation.

**Biome medians (paper Table 1).** These are medians of H and of CR taken separately, so their quotient is only an indicator, not a median ratio.

| Biome | n trees | median H (m) | median CR (m) | CR/H of medians |
|---|---|---|---|---|
| Temperate broadleaf forests | 126,517 | 11.0 | 2.0 | 0.18 |
| Temperate conifer forests | 26,849 | 11.1 | 1.7 | 0.15 |
| Boreal & montane | 21,631 | 12.9 | 1.35 | 0.10 |
| Mediterranean woodlands | 80,882 | 7.5 | 2.0 | 0.27 |
| Temperate grasslands | 9,572 | 8.4 | 1.2 | 0.14 |

**Per-species medians.** Computed from `Tallo.csv` (Zenodo 10.5281/zenodo.6637599, CC BY 4.0) for the species here, split by height band (3–10, 10–18, 18–25, 25 m and over) because the data cannot be split by open versus forest: see the measured column of the table below. Platanus, Hesperocyparis, Pinus torreyana, the palms, Quercus agrifolia and Salix × sepulcralis are not in it; Picea sitchensis has only 10 records.

### Literature-based r/H by species (my synthesis)

Each species section below gives a crown spread and a height. The open-grown r/H values follow from them, and are `[est.]` unless a source is named in the species section. The measured column is TALLO's per-species median of crown radius over height (records flagged as outliers left out), by height band, with its interquartile range and count; bands with fewer than 10 records are left out. TALLO has no open-grown flag and is mostly forest and plantation trees, so it stands for the woodland form and is a floor for the open-grown one.

| Species | r/H open-grown | r/H measured, by height band: median (IQR, n), mostly forest-grown |
|---|---|---|
| Oak (Q. robur) | 0.40–0.60 (crown wider than tall [S:TSO]) | 3–10 m: 0.30 (0.22–0.38, n=621); 10–18 m: 0.25 (0.18–0.33, n=1127); 18–25 m: 0.20 (0.16–0.27, n=338); 25 m and over: 0.14 (0.11–0.18, n=243) [S:TALLO] |
| London plane | 0.30–0.45 | not in TALLO |
| Eucalyptus globulus | 0.20–0.35 | 3–10 m: 0.12 (0.11–0.16, n=379); 10–18 m: 0.10 (0.08–0.13, n=991); 18–25 m: 0.08 (0.06–0.11, n=478); 25 m and over: 0.09 (0.07–0.13, n=402) [S:TALLO] |
| Norway spruce | 0.12–0.18 | 3–10 m: 0.17 (0.13–0.22, n=979); 10–18 m: 0.12 (0.09–0.14, n=1817); 18–25 m: 0.10 (0.08–0.12, n=1443); 25 m and over: 0.09 (0.07–0.11, n=1858) [S:TALLO] |
| Scots pine | 0.20–0.35 (old, flat-topped) | 3–10 m: 0.25 (0.17–0.32, n=5855); 10–18 m: 0.15 (0.10–0.21, n=5745); 18–25 m: 0.10 (0.07–0.13, n=2305); 25 m and over: 0.09 (0.07–0.11, n=889) [S:TALLO] |
| Beech | 0.35–0.50 | 3–10 m: 0.28 (0.21–0.35, n=563); 10–18 m: 0.19 (0.14–0.27, n=2659); 18–25 m: 0.15 (0.11–0.21, n=1922); 25 m and over: 0.13 (0.10–0.16, n=1396) [S:TALLO] |
| Silver birch | 0.20–0.30 | 3–10 m: 0.13 (0.10–0.17, n=50); 10–18 m: 0.12 (0.10–0.14, n=155); 18–25 m: 0.12 (0.11–0.15, n=308); 25 m and over: 0.12 (0.10–0.14, n=214) [S:TALLO] |
| Black alder | 0.15–0.25 | 3–10 m: 0.29 (0.22–0.36, n=12); 10–18 m: 0.11 (0.09–0.19, n=16); 18–25 m: 0.12 (0.10–0.14, n=15); 25 m and over: 0.10 (0.08–0.12, n=25) [S:TALLO] |
| Lombardy poplar | 0.06–0.10 | 3–10 m: 0.21 (0.17–0.27, n=105); 10–18 m: 0.16 (0.12–0.20, n=214); 18–25 m: 0.12 (0.08–0.16, n=177); 25 m and over: 0.10 (0.07–0.12, n=87) (the species; the Lombardy clone is not split out) [S:TALLO] |
| Weeping willow | 0.45–0.60 | not in TALLO |
| Hawthorn | 0.40–0.60 | 3–10 m: 0.25 (0.17–0.35, n=219); 10–18 m: 0.25 (0.19–0.29, n=10) [S:TALLO] |
| Sitka spruce | 0.15–0.22 | too few records (n=10) [S:TALLO] |
| Corsican pine | 0.15–0.22 | 3–10 m: 0.27 (0.21–0.33, n=4541); 10–18 m: 0.20 (0.16–0.26, n=2289); 18–25 m: 0.16 (0.14–0.21, n=199) [S:TALLO] |
| Douglas fir | 0.15–0.22 | 3–10 m: 0.14 (0.10–0.20, n=920); 10–18 m: 0.10 (0.08–0.12, n=2341); 18–25 m: 0.11 (0.09–0.15, n=477); 25 m and over: 0.11 (0.09–0.14, n=385) [S:TALLO] |
| Western red cedar | 0.15–0.25 | 3–10 m: 0.24 (0.19–0.27, n=16); 25 m and over: 0.12 (0.10–0.13, n=10) [S:TALLO] |
| Monterey cypress | 0.50–1.00 (exposed headland) | not in TALLO |
| Monterey pine | 0.30–0.45 | 3–10 m: 0.23 (0.19–0.29, n=457); 10–18 m: 0.15 (0.12–0.20, n=562); 18–25 m: 0.12 (0.09–0.15, n=449); 25 m and over: 0.11 (0.08–0.13, n=371) [S:TALLO] |
| Torrey pine | 0.40–0.70 | not in TALLO |
| Aleppo pine | 0.30–0.45 | 3–10 m: 0.31 (0.25–0.38, n=10946); 10–18 m: 0.23 (0.18–0.29, n=2923); 18–25 m: 0.19 (0.14–0.23, n=75) [S:TALLO] |
| Stone pine | 0.40–0.60 | 3–10 m: 0.35 (0.29–0.42, n=2224); 10–18 m: 0.29 (0.22–0.36, n=886); 18–25 m: 0.30 (0.23–0.35, n=26) [S:TALLO] |
| Canary date palm | 0.30–0.60 (falls with age as the trunk grows) | not in TALLO |
| Mexican fan palm | 0.05–0.12 | not in TALLO |
| California fan palm | 0.18–0.28 | not in TALLO |
| Queen palm | 0.25–0.40 | not in TALLO |
| Coast live oak | 0.50–0.80 (spread is often more than height [S:VT]) | not in TALLO |
| California sycamore | 0.30–0.50 | not in TALLO |
| Sugar maple | 0.30–0.45 (champion: 20.1 m spread, 23.8 m tall, r/H 0.42 [S:SILV]) | 3–10 m: 0.22 (0.16–0.27, n=349); 10–18 m: 0.17 (0.13–0.21, n=2370); 18–25 m: 0.16 (0.13–0.19, n=1774); 25 m and over: 0.16 (0.14–0.19, n=342) [S:TALLO] |
| Red oak | 0.35–0.50 | 3–10 m: 0.22 (0.20–0.32, n=20); 10–18 m: 0.20 (0.16–0.25, n=128); 18–25 m: 0.19 (0.15–0.23, n=197); 25 m and over: 0.16 (0.13–0.20, n=129) [S:TALLO] |
| Eastern white pine | 0.25–0.35 | 3–10 m: 0.20 (0.16–0.26, n=12); 10–18 m: 0.18 (0.14–0.21, n=117); 18–25 m: 0.15 (0.11–0.20, n=80); 25 m and over: 0.12 (0.09–0.15, n=121) [S:TALLO] |
| White spruce | 0.12–0.18 | 3–10 m: 0.18 (0.13–0.22, n=95); 10–18 m: 0.10 (0.08–0.12, n=241); 18–25 m: 0.09 (0.07–0.11, n=117) [S:TALLO] |

**How this compares with the course data.** The course woodland value of about 0.08 is a little narrower than TALLO's medians even for the conifers (0.09–0.11 for spruces, Douglas fir and Scots pine of 18 m and more), and too narrow for woodland broadleaves, where TALLO gives 0.15–0.20 for oak, beech, sugar maple and red oak at 18–25 m.

---

## Species

### 1. Oak — *Quercus robur* (pedunculate or English oak)

**Form**
- Height: 20–30 m, exceptionally to 40 m. TSO gives 18–24 m for open-grown trees and 30 m or more when close-grown [S:TSO].
- Spread: open-grown, 20–30 m. TSO describes a "broad, spreading head of rugged branches" that is **wider than the tree is high** [S:TSO].
- Architecture:
  - Open-grown: decurrent. The leader is lost at 4–10 m and the crown divides into 3–6 massive limbs.
  - In high forest the stem stays single and straight to 10–15 m, then the crown breaks into limbs.
- Crown shape: open-grown, a broad irregular dome, often lower and wider on one side. In woodland, a narrow, high, irregular crown on a long bole.
- Live crown ratio: open-grown 0.75–0.90; stand-grown 0.30–0.45 [est.].
- Clear bole in woods: 30–50 % of height, typically 8–15 m [est.].

**Branching**
- Arrangement: alternate, spiral (2/5 phyllotaxy). Buds cluster at the shoot tip, so several shoots of similar vigour arise there. This is a main cause of the crooked, many-forked look.
- Insertion angles [est.]:
  - Scaffold limbs 45–70° at the start, then levelling out. Lower open-grown limbs reach 80–100° and may dip and rest near the ground.
  - Second order: 50–80°.
  - Twigs: 40–70°.
- Limb curvature: limbs are **crooked**. There is a direction change of 15–35° every 0.5–2 m, which comes from repeated loss of the terminal shoot and takeover by a lateral. Limbs often run out nearly horizontally, then turn up at the ends. Elbows ("knees") are common [obs.].
- Scaffold limbs: 3–6. Forked main trunks are common in open-grown trees (more than half of parkland oaks fork below 6 m [est.]).
- Twig density: coarse to medium. Short, stubby, clustered twigs; winter silhouette dense and knobbly.

**Wind and special forms**
- Old pollards: a short fat bole about 3 m high with a ring of upright limbs [obs.].
- Stag-headed old oaks: dead bare limbs stick out above the live crown. This is common in parkland [obs.].

**Foliage**
- Leaf: deciduous, obovate-oblong, 5–10 × 2–6 cm, with 3–6 pairs of rounded lobes and small auricles at the base [S:TSO].
- Leaves cluster at the shoot tips.
- At 50–150 m: lumpy, cauliflower-like masses with deep shadow gaps between limb clusters. The crown reads as a "cloud of clouds", not a smooth dome. Colour: dark green #3F5A2C (summer), olive-yellow then brown (autumn), and many leaves stay on young trees in winter.

**Bark**
- Young (under about 20–30 years): smooth, silvery grey-brown #8A877D.
- Mature: deep vertical fissures 2–5 cm deep, separating rough ridges and plates that are 2–6 cm wide and 5–20 cm long and crossed by horizontal cracks, which gives a blocky, checkered texture. Ridges #6E675C, fissures #3E3A33.
- The pattern runs into the main limbs. Upper limbs are smoother.
- Green algae and moss on the windward side: #6F7F4A.

**Signature at a glance**
1. Broad crown, wider than tall, on a short stout bole.
2. Crooked, elbowed limbs that run out nearly level.
3. Lumpy, clumped foliage masses with holes.
4. Deeply checkered grey bark.

**Sources:** TSO (*Q. robur*). The EU Atlas oak chapter (combined with *Q. petraea*) is over 10 MB and could not be read here. The angles are `[est.]`.

### 2. London plane — *Platanus × hispanica*

**Form**
- Height: 25–35 m typical, to 50 m. A tree at Pau passes 52 m [S:TSO].
- Spread: 15–25 m [est.].
- Architecture:
  - Avenue and park trees: often a long straight bole [S:TSO] into a domed crown of several big, sinuous limbs.
  - Effectively decurrent above about half the height [est.].
- Crown shape:
  - Open-grown: a tall dome to a broad oval [est.].
  - Pollarded street trees: knuckle-headed [obs.].
- Live crown ratio: open-grown 0.60–0.75; in groups 0.45–0.55 [est.].

**Branching**
- Arrangement: alternate, distichous on lateral shoots. Branching is **sympodial** (Platanus is the textbook sympodial example [S:BC2007]), so twigs **zigzag** by 15–30° at each node [est.].
- Insertion angles [est.]:
  - Scaffolds: 35–55°, ascending.
  - Second order: 50–75°.
  - Fine branches: more than 90° (they hang).
- Limb curvature:
  - Limbs are sinuous and sometimes contorted, and fine branches are sometimes pendulous.
  - Some clones have "particularly zig-zag major limbs" [S:TSO].
  - Typical profile: limbs ascend, then arch over and hang at the ends, so the outer crown has a pendulous fringe [est.].
- Scaffold limbs: 3–6.

**Foliage**
- Leaf: deciduous, maple-like, with 3–5(–7) lobes, up to 18 × 25 cm or more [S:TSO]. Fruit balls about 3 cm wide, usually 2–4 on a stalk, hanging all winter [S:TSO].
- At 50–150 m: a large-leaved, fairly uniform, coarse-textured dome with mid-green to slightly yellowish-green colour (#5C7536). Fruit balls show in winter.

**Bark: the key identifier**
- Pattern: jigsaw exfoliation. Younger bark flakes shallowly in "brown, beige and pale grey" [S:TSO].
  - Patches: 3–15 cm across on the trunk, 1–5 cm on the limbs [est.].
  - Patch shapes: irregular, rounded-polygonal plates.
- Colours [est.]:
  - Base layer: olive-grey #7D7A5E.
  - Fresh underbark: cream to pale yellow #E3DCC0.
  - Ochre patches: #C2A970.
  - Sage patches: #9AA07A.
  - Older brown flakes: #6B5A43.
- Change with height on the stem:
  - Old trees: bark is darker and more rugged at the base, and can crack into small squares [S:TSO].
  - The pale cream fraction increases upward; limbs and upper stem are mostly cream and pale olive [obs.].

**Signature at a glance**
1. Camouflage-patched pale trunk.
2. Big rounded dome on a clean, tall bole.
3. Large maple-like leaves.
4. Hanging fruit balls.
5. Sinuous limbs that pale to cream higher up.

**Sources:** TSO (*P. × hispanica*); Barthélémy & Caraglio 2007 (sympodial *Platanus*).

### 3. Eucalyptus — *Eucalyptus globulus* (Tasmanian blue gum)

**Form**
- Height:
  - 30–55 m typical, to 70 m [S:EUCLID]. The Agroforestry Database gives 40–55 (max. 60) m.
  - Planted California trees: 30–50 m.
- Spread: 10–20 m.
- Architecture:
  - Young trees: excurrent.
  - Mature trees: a long, clean, straight bole with an open, irregular crown of a few large ascending limbs. The trunk often splits in the upper third [est.].
- Crown shape:
  - Narrow and irregular in groves.
  - Open-grown: "broadly rounded or irregular with branches nearly to the ground" (secondary source in search results, unverified).
- Live crown ratio: groves and windbreaks 0.25–0.40; open-grown 0.6–0.8 [est.].
- Clear bole in groves: 50–70 % of height [est.].

**Branching**
- Arrangement: opposite on juvenile shoots, alternate on adult shoots [S:EUCLID].
- Insertion angles [est.]:
  - Scaffolds: 25–45°, ascending.
  - Second order: 40–70°.
  - Twigs: hang, carrying vertical leaves.
- Limb curvature: limbs ascend steeply and straight, with mild S-curves. Foliage hangs from them in clumps [obs.].
- Scaffold limbs: 3–6. Forks in the upper stem are common.

**Wind and special forms**
- California windbreak rows: tall, ragged, narrow crowns.
- Old coastal trees: lose limbs and look raggedy [obs.].

**Foliage**
- Adult leaves: alternate, lanceolate to falcate, 12–30 × 1.7–3 cm, glossy bright green, on 2–3.5 cm petioles [S:EUCLID]. They hang vertically [S:EUAT].
- Juvenile leaves: opposite, sessile, ovate, glaucous blue-grey, 4–10.5 × 2.2–5 cm [S:EUCLID]. They show on coppice regrowth and young trees.
- At 50–150 m:
  - An **open, airy, see-through crown** of hanging foliage clumps with sky gaps.
  - The crown edge looks streaky and pendulous.
  - Colour: grey-green to olive (#6C7A55) at distance.

**Bark**
- Smooth bark: white, cream, grey, yellowish or pale creamy-orange [S:EUCLID]. It sheds yearly in **long ribbons** that hang in the crown and pile at the base [S:EUAT].
- Base: rough, grey, persistent slabs (a "stocking") over the lower 1–4 m [est.] [S:EUCLID].
- Colours:
  - Smooth: #D9D4C2 / #C9C7B8.
  - Fresh patches: #D8C68E yellowish to #D9A777 pale orange.
  - Grey: #A9A79A.
  - Stocking: #6F6A62.
  - Ribbons: #B08A63.
- Pattern scale: long vertical streaks 0.5–3 m long and 3–15 cm wide [est.].

**Signature at a glance**
1. Very tall, pale, streaky trunk with hanging bark ribbons.
2. Open, droopy, grey-green crown high on the tree.
3. Dark rough stocking at the base.
4. Ragged silhouette.

**Sources:** EUCLID (CSIRO); EU Atlas *Eucalyptus globulus* chapter. Jepson and SelecTree could not be reached.

### 4. Norway spruce — *Picea abies*

**Form**
- Height: 30–50 m typical, up to 50–60 m [S:EUAT]; record 62.7 m [S:GDB].
- Spread: 6–10 m [est.].
- Architecture: strongly excurrent; the leader persists for life.
- Crown shape: "regularly conic, columnar" [S:EUAT]. Mountain races are narrow and columnar [S:Silvae Genetica 1971].
- Live crown ratio:
  - Open-grown: 0.85–1.0, with branches to the ground.
  - Plantation: 0.35–0.55 [est.].
- Clear bole in plantations: 40–60 % of height, but dead branch stubs persist for a long time [est.].

**Branching**
- Arrangement: one whorl per year of 4–7 main branches, plus smaller interwhorl branches [est.].
- Insertion angles: young-tree branches measured at 40–70° [S:search summary of a 2019 study]. On mature trees:
  - Upper branches: 50–75°, ascending.
  - Mid-crown: about 90°.
  - Lower crown: 100–130°, drooping, with tips **turned up** [S:EUAT "upper level ascending and the lower drooping"].
- The J-curve: lower and middle branches sag down and out, then their tips sweep up.
- Branching types for second-order shoots [S:Silvae Genetica 1971; Beskydy 2015]:
  - Comb ("Kamm"): curtains of second-order shoots hanging vertically from the main branch. Common at low elevations.
  - Brush.
  - Plate (flat): second-order shoots stay in the branch plane. Common at high elevations.
  - Beskydy plots: brush type most common (45 %), then brush/plate (31 %), comb/brush (12 %), plate (11 %).
- Twig density: fine.

**Foliage**
- Needles: 1–2.5 cm, 4-angled, dark green, spread all round the shoot [S:GDB].
- Cones: hang, 10–16 cm [S:GDB].
- At 50–150 m:
  - A dark (#2E4330), dense, spire-topped cone.
  - Comb-type trees show vertical curtains under the boughs.
  - Hanging cones cluster in the top few metres in mast years.

**Bark**
- Young: orange-brown, finely flaking [S:GDB/EUAT].
- Old: grey-brown with small, thin, rounded scales 1–3 cm across [est.].
- Resin droplets common [S:EUAT].
- Colours: young #8A5A3C, old #6A5A4E, scale edges #4C3F37.

**Signature at a glance**
1. Dark narrow spire with a sharp single leader.
2. Drooping lower boughs with upturned tips.
3. Hanging curtains of shoots (comb type).
4. Long hanging cones near the top.

**Sources:** EU Atlas *Picea abies*; GDB; Silvae Genetica 20(5–6) 1971 (branching forms); Beskydy 2015 (frequencies).

### 5. Scots pine — *Pinus sylvestris*

**Form**
- Height: 23–27 m on average, over 40 m possible [S:EUAT]; to 40 m [S:GDB].
- Spread: old open-grown trees 8–15 m [est.].
- Architecture:
  - Excurrent and "open ovoid-conic when young" [S:GDB].
  - Old trees become decurrent: "dense, broadly domed or even flat-topped" [S:GDB].
- Crown shape:
  - Heathland and golf-course trees (Sunningdale and similar): a tall bare stem with a high, flat or umbrella-like, often lopsided crown [obs.].
  - Plantations: a short conic or rounded crown in the top third [est.].
  - Wild populations vary from level-branched to near-fastigiate [S:GDB].
- Live crown ratio: plantation 0.25–0.40; open-grown 0.5–0.8 (lower branches die even in the open) [est.].

**Branching**
- Arrangement: one whorl per year (uninodal) [S:GDB], typically 3–6 branches per whorl [est.].
- Insertion angles [est.]:
  - Upper: 40–60°.
  - Lower and old limbs: 70–95°.
  - Second order: 50–70°.
- Limb curvature [obs.]:
  - Old limbs are long and snaky.
  - They often run out nearly level, kink, and turn up at the ends.
  - Foliage is borne in flattened tufts and plates at the tips.
- Old trees often fork into 2–4 sub-leaders.

**Wind and special forms**
- Flat-topped old age.
- Leaning and wind-swept trees on dune and heath edges.
- Trees with "broad crowns and crooked stems" are more frequent on the coast in some regions [S:SLU summary].

**Foliage**
- Needles: in pairs, (2.5–)4–6(–9) cm (5–7 cm per the EU Atlas), twisted, blue-green to grey-green [S:GDB, EUAT].
- At 50–150 m:
  - **Blue-grey-green (#4F6650) tufts and flat plates** at limb ends, with open sky between the masses.
  - Not a solid dome.

**Bark: the key identifier**
- Upper stem and branches: "thin, flaking, orange-red" [S:GDB]. Flakes are papery, 1–5 cm [est.]. Colours #C8693A to #D98A4E, with fresh flakes #E0A070.
- Lower stem: "thick, scaly-plated, grey-brown" [S:GDB], and "deeply fissured" [S:EUAT].
  - Plates: 5–15 cm wide and 10–30 cm long.
  - Fissures: 2–5 cm deep [est.].
  - Colours: plates #5E5047, fissures #2E2620, with reddish showing in the fissures.
- Transition height: in mature trees, typically at 30–60 % of stem height. It is ragged, with orange "flames" of upper bark reaching down between grey plates [est.].

**Signature at a glance**
1. Orange-copper upper trunk and limbs.
2. Tall bare stem with a high, flat-topped, irregular crown.
3. Blue-green needle tufts in plates.
4. Grey plated base.

**Sources:** EU Atlas *Pinus sylvestris*; GDB.

### 6. Beech — *Fagus sylvatica*

**Form**
- Height: commonly 30–40 m, up to 50 m [S:EUAT]; record 49.2 m [S:TSO].
- Spread: open-grown 15–25 m [est.]. Usually single-stemmed [S:EUAT].
- Architecture:
  - Strong apical control in forest, where trees are "drawn up tall" [S:TSO]. The leader persists to the upper crown, then the crown breaks into several ascending limbs.
  - Open-grown trees are "spreading, low-branched" [S:TSO] and broadly domed.
- Crown shape: oval to domed [S:TSO].
- Live crown ratio:
  - Open-grown: 0.85–0.95, with branches to the ground; parkland beeches skirt down.
  - Forest: 0.35–0.50 [est.].
- Clear bole in woods: 10–15 m; the bole is smooth, cylindrical and elephantine [est.].

**Branching**
- Arrangement: alternate and **distichous** (two-ranked) on lateral shoots. These shoots grow plagiotropic, as flat fans [obs.]. Beech is the usual example of Troll's architectural model [est.: textbook attribution, not confirmed in the source read].
- Insertion angles [est.]:
  - Scaffolds: 30–50°, steeply ascending, many and similar.
  - Second order: 60–85°.
  - Twigs: in flat horizontal sprays.
- Limb curvature:
  - Limbs ascend fairly straight and smooth.
  - Outer branches arch over, and the fine branch systems spread **level in layered horizontal fans**.
  - Lower limbs of open trees sweep down and out, then up at the tips [obs.].
- Twigs: slender zigzag, 10–20° at each bud [est.].
- Twig density: **very fine and dense**.

**Foliage**
- Leaf: oval to elliptic, typically 10 × 7 cm [S:EUAT]. TSO gives 4–10 × 2.5–4 cm (the widths differ by source). Wavy margin, 5–9 vein pairs.
- At 50–150 m:
  - A dense, smooth-surfaced dome built of **horizontal layered sprays** with little gap.
  - Colour: fresh green #6A8A3A in spring, dark #3D5A2A in summer, copper #A0562A in autumn.
  - Young trees and hedges keep brown leaves in winter.

**Bark**
- Smooth, **silver-grey** [S:EUAT], and smooth into old age [S:TSO].
- Fine features:
  - Horizontal lenticel lines.
  - Wrinkled "elephant skin" collars below branch junctions.
  - Chevron ("moustache") marks over old branch scars.
- Green algae streak the windward side.
- Colours: #9A9A91, lighter #B5B5AC, algae #7C8A5A.

**Signature at a glance**
1. Smooth elephant-grey, columnar trunk.
2. Dense dome made of flat layered sprays.
3. Branches to the ground in the open.
4. Copper autumn colour and dead-leaf retention.

**Sources:** EU Atlas *Fagus sylvatica*; TSO.

### 7. Silver birch — *Betula pendula*

**Form**
- Height: 15–25 m typical, to 30 m [S:WT].
- Spread: 6–12 m [est.].
- Architecture:
  - Excurrent while young: a single slender stem with a narrow conic-oval crown.
  - Older trees become irregular, with the leader lost in the top third [est.].
- Crown shape: light, open and sparse [S:WT]; a narrow oval. On heathland it is often multi-stemmed from the base [obs.].
- Live crown ratio: open-grown 0.6–0.8; stand-grown 0.3–0.5 [est.].

**Branching**
- Arrangement: alternate. Twigs are slender, warty and zigzag [est.].
- Insertion angles [est.]:
  - Scaffolds: 30–50°, ascending.
  - Second order: 60–90°.
  - Third order and twigs: **pendulous, hanging 150–180°**, in long whip-like curtains on mature trees.
- Limb curvature: limbs ascend, then arch out and over, and the fine twigs hang straight down. The weeping is in the twigs, not the limbs [S:WT "elegant and drooping"].
- Twig density: very fine.

**Foliage**
- Leaf: small, triangular-ovate, doubly toothed, about 3–7 × 2–5 cm [est.; Stace not fetched].
- At 50–150 m:
  - A light, airy, **see-through crown** with a dappled texture.
  - Bright yellow-green (#7A9A3E) in spring and early summer.
  - Butter-yellow in autumn.
  - Purple-brown haze of twigs in winter.

**Bark: the key identifier**
- Young and upper stem: white, peeling in thin papery layers [S:WT].
  - Base white: #EDEBE6.
  - Horizontal dark lenticels: 0.5–3 cm long, 1–3 mm high [est.], #2A2725.
- Base of mature trees: black and rugged [S:WT]. Thick, dark, blocky bark with deep fissures over the lowest 0.5–3 m; #2B2926 with grey ridges #4A4642.
- Mature trees develop **dark diamond-shaped fissures** in the white zone [S:WT]. These are rhomboid, about 5–20 cm tall, densest just above the black base and thinning upward [est.].
- Dark chevron "eyebrows" over branch scars.
- Pinkish-peach underbark (#D9B9A0) where the outer layer peels.

**Signature at a glance**
1. White trunk with black lenticels and a black diamond-fissured base.
2. Pendulous hanging twigs.
3. Small airy crown.
4. Often in clumps.

**Sources:** Woodland Trust (silver birch). The EU Atlas *Betula* chapter is over 10 MB and could not be read here.

### 8. Black alder — *Alnus glutinosa*

**Form**
- Height: to 35 m [S:TSO]; usually 15–25 m [est.].
- Spread: 6–10 m [est.].
- Architecture: **strongly excurrent**, with a persistent straight leader into maturity. Occasionally multi-stemmed [S:TSO]; often coppiced and multi-stemmed along rivers [obs.].
- Crown shape: pyramidal or oval [S:TSO]. Becomes a broad, irregular, open dome when old [est.].
- Live crown ratio: open-grown 0.6–0.8; stand-grown 0.35–0.55 [est.].

**Branching**
- Arrangement: alternate.
- Insertion angles [est.]:
  - Scaffolds: 60–80°, spreading nearly level, short and fairly straight.
  - Second order: 50–70°.
- Limb curvature: little. Limbs are straight and regular, like a broadleaved conifer [obs.].
- Twig density: medium. Last year's woody cones and next year's purple male catkins show all winter [S:TSO].

**Foliage**
- Leaf: obovate to nearly round, with a notched or blunt tip, 4–11 × 3.5–11 cm [S:TSO].
- At 50–150 m:
  - A dark, uniform, matt green (#2F4A2A) oval to dome, darker than any other riverside tree.
  - Stays green late; no real autumn colour [obs.].

**Bark**
- Dark grey-brown, darkening and fissuring with age [S:TSO].
- Old trees: small squarish plates, 2–5 cm [est.].
- Colours: #4D4741, plates #5A534C, fissures #2F2A26.

**Signature at a glance**
1. Dark-green, dark-barked, cone-shaped tree at the water's edge.
2. Straight leader.
3. Little cones and catkins in winter.
4. Often several stems.

**Sources:** TSO (*A. glutinosa*). The EU Atlas chapter could not be read (over 10 MB).

### 9. Lombardy poplar — *Populus nigra* 'Italica'

**Form**
- Height: about 15 m at 25 years; largest specimens 30–35 m; UK champion 38.5 m [S:TSO]. Black poplar (the species) reaches 40 m [S:EUAT].
- Spread: 3–6 m [est.]. Width is about 0.12–0.20 of height.
- Architecture: fastigiate. Many nearly vertical branches arise along the whole stem from near the ground. The leader is not dominant, so the crown is a sheaf. The trunk is buttressed [S:TSO].
- Crown shape: a slender column or narrow spindle that tapers to a point [S:TSO; EU Atlas photo caption "columnar form"].
- Live crown ratio: 0.85–0.95 [est.].
- The true Lombardy is a **male clone**. "Female Lombardy" forms are broader [S:TSO].

**Branching**
- Arrangement: alternate.
- Insertion angles [est.]:
  - Scaffolds: 10–25°, "quite erect" [S:TSO].
  - Second order: 15–35°.
- Limb curvature: limbs leave the stem at a slightly wider angle, then curve back parallel to it within 0.5–1 m [est.].
- Scaffold count: many, 30 or more small limbs, with no dominant ones.
- Twig density: medium.
- Old trees: dead lower branches and a ragged base [obs.].

**Wind and special forms**
- Planted in rows as windbreaks and avenue markers (common in the Netherlands and France) [obs.].
- Prone to dieback of the top, which leaves a dead spike [obs.].

**Foliage**
- Leaf: deltoid, 5–11 cm, flattened petiole so the leaves flutter [S:TSO].
- At 50–150 m:
  - A **dark green flickering column** with an even texture.
  - Leaves turn silvery and pale in wind.
  - Bright yellow in autumn.

**Bark**
- Grey-brown and deeply furrowed (black poplar: "dark brown or black, with numerous fissures" [S:EUAT]).
- Trunk base: fluted, buttressed and burry [S:TSO].
- Colours: ridges #6B655C, furrows #3D3833.

**Signature at a glance**
1. Pencil column 8–10 times taller than wide.
2. Branches parallel to the stem along its full length.
3. Planted in lines.

**Sources:** TSO (*Populus nigra*); EU Atlas *Populus nigra*.

### 10. Weeping willow — *Salix × sepulcralis* (incl. 'Chrysocoma', golden weeping willow)

**Form**
- Height: 15–23 m. The largest 'Chrysocoma' was 76 ft (23 m) [S:TSO].
- Spread: 15–20 m; about as wide as tall [est.].
- Architecture: decurrent. A short trunk of 1.5–3 m divides into a few heavy ascending limbs.
- Crown shape: a broad dome draped by a **curtain of hanging branchlets** that "usually reach the ground" [S:TSO].
- Live crown ratio: about 0.9 measured to the bottom of the hanging fringe [est.].

**Branching**
- Arrangement: alternate.
- Insertion angles:
  - Main branches rise at about **45–50°** [S:TSO]. That source measures from horizontal, so this is about 40–45° from vertical.
  - Second order: arch out at 60–90°, then turn down.
  - Third order: **steeply pendulous at 170–180°**, straight hanging whips 1–4 m long [S:TSO "steeply pendulous"].
- Limb curvature: ascend, then arch, then hang. The scaffolds are fairly straight and heavy; the curtain is in orders 2 and 3.
- Scaffold limbs: 3–6.
- Brittle, and often loses limbs [S:TSO].

**Foliage**
- Leaf: narrow-lanceolate, 7.5–11.5 × 1–1.6 cm, glaucous underneath [S:TSO].
- Shoots: clear yellow by late summer [S:TSO].
- At 50–150 m:
  - A **soft hanging curtain** with vertical streaky texture.
  - Yellow-green (#9AAA4A) in summer.
  - Golden-yellow twig haze (#C8B048) in winter.
  - Strongly tied to water [obs.].

**Bark**
- Grey-brown, with deep interlacing furrows and corky ridges (white willow parent: "deeply fissured bark is dark grey with corky ridges" [S:EUAT Salix alba]).
- Colours: #6E675E, furrows #3B3631.

**Signature at a glance**
1. Hanging curtain of branchlets to the ground.
2. Golden-yellow shoots.
3. Wide dome next to water.
4. Short heavy trunk.

**Sources:** TSO (*S. × sepulcralis*); EU Atlas *Salix alba* (parent).

### 11. Hawthorn — *Crataegus monogyna*

**Form**
- Height: to about 15 m [S:WT]; usually 5–10 m [est.].
- Spread: 4–8 m [est.].
- Architecture: decurrent. Often a "dense, thorny shrub-like tree" [S:WT]. Single-stem trees exist, and hedgerow and pasture trees often have 1–3 stems [obs.].
- Crown shape: a dense, rounded, irregular mop [est.].
- Live crown ratio: 0.7–0.9 [est.].

**Branching**
- Arrangement: alternate. Many short thorny spur shoots.
- Insertion angles [est.]:
  - Scaffolds: 45–70°.
  - Second order: 50–80°.
- Limb curvature: very twisty, angular and gnarled.
- Twig density: very fine and very dense. Twigs zigzag at 20–30° [est.].
- Old trunks: fluted and twisted, often looking like several stems fused together [obs.].

**Wind and special forms**
- **Wind-pruned exposed trees** on downs and links [obs.]:
  - A one-sided crown streaming leeward.
  - Windward buds killed.
  - The stem leans 20–45° downwind.
  - The crown top is sheared into a smooth sloping wedge.
  - This is the classic "wind-swept thorn" of coastal golf.

**Foliage**
- Leaf: about 2–6 cm, deeply 3–7-lobed, lobes cut at least halfway to the midrib [S:WT].
- At 50–150 m:
  - A very dense, fine-textured, dark green (#3B5A2C) mass.
  - May: **covered in white blossom** (#F2EFE6).
  - Autumn: dark red haws (#8A1E1E).

**Bark**
- Grey-brown, knotted and fissured [S:WT]. Small rectangular plates 1–4 cm, with orange-brown underbark in the cracks [est.].
- Colours: #7A7068, cracks #A0663C.

**Signature at a glance**
1. Small, dense, round-headed or wind-sheared tree.
2. Gnarled fluted trunk.
3. White in May, red haws in autumn.
4. Wind-leaning on exposed sites.

**Sources:** Woodland Trust (hawthorn). No EU Atlas chapter exists. The wind forms are `[obs.]`.

### 12. Gorse — *Ulex europaeus* (shrub)

**Form**
- Height: usually about 2 m, up to 4 m if left uncut [S:BSBI Fermanagh, search summary]; up to 4.5 m [secondary].
- Spread: forms continuous banks and mounds, single bushes 1–3 m [est.].
- Architecture: a dense, rigid, multi-stemmed, spiny mound. Old stands are leggy, with dead grey interiors [obs.].

**Branching**
- Very dense and stiff. Shoots end in branched green spines, 1.5–3 cm long, with secondary and tertiary spines [S: Burren flora; NZ flora; search summaries].

**Foliage**
- Adults have only scale leaves and spines; seedling leaves are trifoliate.
- At 50–150 m:
  - Dark blue-green (#34502E) rough mounds.
  - **Bright yellow flowers (#F2C230)**, peaking in spring but present in most months.

**Bark**
- Stems grey-brown (#6B5E4E). Rarely visible.

**Signature at a glance**
1. Dark spiny mounds 1–2.5 m tall.
2. Bright yellow flowers.
3. Banks lining links fairways.

**Sources:** Search summaries of the BSBI Fermanagh flora, the Burren flora and the NZ flora. Treat the sizes as approximate.

### 13. Sitka spruce — *Picea sitchensis*

**Form**
- Height:
  - Native range: to 80 m, record about 100 m [S:GDB].
  - Europe: rarely over 50 m [S:EUAT].
  - British plantations: 25–40 m at harvest [est.].
- Spread: 8–12 m [est.].
- Architecture: strongly excurrent, with a straight trunk from a **buttressed base** [S:GDB, EUAT, FEIS].
- Crown shape: "open, conical crown of horizontal branches" [S:EUAT]. Old trees can regrow crowns from epicormic shoots [S:GDB/EUAT].
- Live crown ratio:
  - Plantation: 0.30–0.50.
  - Open-grown: 0.85–1.0 [est.].
  - Forest-grown trees have long trunks with no lower limbs [S:FEIS].

**Branching**
- Arrangement: one whorl per year of 4–6 branches, plus interwhorl branches [est.].
- Insertion angles [est.]:
  - Upper: 70–90°.
  - Mid to lower: 90–110°.
  - Branches are "somewhat drooping" [S:GDB], and the branchlets only slightly pendent.
- Limb curvature: long, nearly straight horizontal branches with a gentle sag and tips slightly upturned. Less curtain-like than Norway spruce [est.].
- Twig density: medium.

**Foliage**
- Needles: 1.5–2.5 cm, flattened, painfully sharp, blue-green with glaucous stomatal bands underneath [S:GDB].
- At 50–150 m:
  - A **blue-grey-green** (#3E5A55) cone that is noticeably bluer and paler than Norway spruce.
  - Plantations read as uniform blue-green blocks.

**Bark**
- Young: thin, grey, smooth.
- Old: "broken into large reddish to brown scales" [S:EUAT], dark purplish-brown scaly plates [S:GDB].
- Scales: 3–10 cm, flaking [est.].
- Colours: #7D6E66, scale edges #5A4A44, fresh #8E6A55.

**Signature at a glance**
1. Blue-grey plantation spruce.
2. Level branches.
3. Buttressed base.
4. Scaly purplish bark.

**Sources:** EU Atlas *Picea sitchensis*; GDB; FEIS (*picsit*).

### 14. Corsican pine — *Pinus nigra* subsp. *laricio*

**Form**
- Height: to 50 m [S:GDB]. The species commonly reaches 30 m, exceptionally 40 m [S:EUAT]. UK plantations: 25–35 m [est.].
- Spread: 6–10 m [est.].
- Architecture: strongly excurrent, with a very straight, single round trunk [S:GDB]. The leader persists much longer than in Scots pine [est.].
- Crown shape: "conical, becoming umbrella-shaped on older trees" [S:EUAT].
  - Laricio stays narrower and more open than the Austrian type [est.].
  - Plantation crowns are narrow and short.
- Live crown ratio: plantation 0.25–0.40; open-grown 0.6–0.8 [est.].

**Branching**
- Arrangement: one whorl per year, 3–6 branches [est.].
- Insertion angles [est.]:
  - Upper: 50–70°.
  - Lower: 75–95°.
- Limb curvature: short, fairly straight, nearly level branches, tips slightly ascending. Old crowns flatten [S:EUAT].
- Twig density: medium-coarse.

**Foliage**
- Needles: in pairs, slender, flexible, often twisted, 8–15 cm, light green [S:GDB, Farjon].
- At 50–150 m:
  - An **open, grey-green (#4A5E48), somewhat transparent crown** of long-needled tufts.
  - Darker and longer-needled than Scots pine, with no orange.

**Bark**
- Grey with deep longitudinal fissures and irregular scaly plates [S:GDB]. Dark greyish-brown to black, deeply furrowed [S:EUAT].
- Old trees develop long, flat-topped, pinkish-grey plates [est.] ("can be pinkish on some old trees" [S:GDB]).
- Colours: #5B5752, plates #8A847C, old #9C8A84.

**Signature at a glance**
1. Ramrod-straight dark-grey trunk.
2. Open grey-green crown of long needles.
3. No orange bark.
4. Planted on dunes, as in the Netherlands and Norfolk.

**Sources:** GDB (*P. nigra*, incl. Farjon on *laricio*); EU Atlas *Pinus nigra*.

### 15. Douglas fir — *Pseudotsuga menziesii* (coastal)

**Form**
- Height: 60–80 m in Europe's terms, exceptionally over 100 m [S:EUAT]. Old-growth commonly 76 m [S:FEIS]. Europe and UK plantations: 35–55 m [est.].
- Spread: 8–15 m [est.].
- Architecture: excurrent.
- Crown shape: "narrow to broadly conic", becoming flattened and irregular with age [S:GDB]. Trees over about 350 years are mostly epicormic-branched [S:GDB].
- Old-growth crown: narrow and cylindrical, starting **20–40 m above a branch-free bole** [S:FEIS]. Cylindrical trunk with a short flat-topped crown giving a columnar shape [S:EUAT].
- Live crown ratio:
  - Old-growth: about 0.4–0.6.
  - Managed stands: 0.30–0.50.
  - Open-grown young trees: about 1.0, with branches near the ground [S:FEIS].
  - Ratios are [est.] from these descriptions.
- Self-pruning is slow: about 77 years to clear 5 m and 107 years to clear 10 m [S:FEIS].

**Branching**
- Arrangement: one whorl per year of 3–6 branches, plus interwhorl branches [est.].
- Insertion angles [est.]:
  - Upper: 60–80°.
  - Mid: 85–95°.
  - Lower: 100–120°, drooping, with upturned tips.
- Limb curvature: a mild J-curve.
- Second-order branchlets: hang loosely [obs.], giving a softer, fuller look than spruce.
- Twig density: medium-fine.

**Foliage**
- Needles: 1.5–3 cm, soft, yellow-green in coastal forms [S:GDB]; about 2.5 cm [S:FEIS].
- Cones: hang, 6–10 cm, with three-pointed bracts [S:GDB].
- At 50–150 m:
  - Soft dark green (#344C35) layered boughs.
  - Old trees: ragged, irregular, flat-topped crowns high on huge columns.

**Bark**
- Young: thin, smooth, grey, with resin blisters [S:FEIS].
- Mature: 10–30 cm thick, corky, reddish-brown to blackish, with deep furrows between broad interlacing ridges [S:FEIS, EUAT].
- Ridges: 5–15 cm wide; furrows 5–15 cm deep [est.].
- Colours: ridges #6B4A36, furrows #2D2018, young #7F8079.

**Signature at a glance**
1. Huge straight column with deeply furrowed, corky, red-brown bark.
2. Soft layered boughs with drooping branchlets.
3. Old trees: crown only in the top third, flat-topped and ragged.

**Sources:** FEIS (*psemenm*); EU Atlas *Pseudotsuga menziesii*; GDB.

### 16. Western red cedar — *Thuja plicata*

**Form**
- Height: 50(–70) m [S:GDB]. Ornamental and UK trees 20–35 m [est.].
- Spread: 8–15 m [est.].
- Architecture:
  - Excurrent; the leader is slightly nodding and flexible [obs.].
  - Old trees have "many leaders and many dead spike tops" [S:GDB].
  - The base is often buttressed and fluted [S:GDB].
- Crown shape: conical to irregular [S:GDB]. Dense to the ground when open-grown.
- Live crown ratio: open-grown 0.85–1.0; stand-grown 0.4–0.6 [est.].

**Branching**
- Arrangement: irregular, not whorled.
- Insertion angles [est.]:
  - Upper: 60–80°.
  - Lower: 100–130°.
- Limb curvature:
  - Branches arch [S:GDB].
  - The lower branches droop down and out, then the tips sweep upward. This is the classic cedar **J-curve** [obs.]; GDB itself only says "branches arch".
- Foliage sprays: flat, slightly hanging and concave below, 15–50 × 5–15 cm, each with 14–30 alternate lateral shoots [S:GDB].
- Twig density: fine, in fern-like flat sprays.

**Foliage**
- Leaves: scale-like, 1–6 mm, glossy dark green [S:GDB]. Sprays hang from the branches like a fringe.
- At 50–150 m:
  - A **glossy, yellowish-to-dark green (#3B5A2E) layered, drapey cone**.
  - Sprays catch the light, giving a stringy, hanging texture.
  - Dead spike tops show on old trees.

**Bark**
- Red-brown or grey-brown, 10–25 mm thick, fibrous, shallowly fissured, and peels in long strips [S:GDB].
- Colours: fresh #8B5A3C, weathered #8E8478.
- Pattern: long vertical fibrous strips 1–5 cm wide, running the full length. The base is fluted [est.].

**Signature at a glance**
1. Drooping J-curved branches with hanging flat sprays.
2. Fluted, buttressed base.
3. Stringy red-brown bark.
4. Several spike tops on old trees.

**Sources:** GDB (*Thuja plicata*). The FEIS page (*thupla*) returned 404.

### 17. Monterey cypress — *Hesperocyparis macrocarpa*

**Form**
- Height: typical maximum 25 m [S:GDB]. Planted trees reach 31 m (US) and 48 m (San Francisco) [S:GDB].
- Spread: up to 33.8 m on the largest US tree [S:GDB]. Exposed headland trees are often wider than tall.
- Architecture:
  - Excurrent and narrowly conic when young.
  - Decurrent when old [S: UF/IFAS search summary, "conical in youth, broad and spreading with age"].
  - Often "a few major limbs arise near the base of the trunk" [S:GDB].
- Crown shape:
  - Generally broad-spreading and fairly sparse; more upright in sheltered spots [S:GDB].
  - Headlands: **flat-topped, wind- and salt-sculpted** [S:GDB photo captions].
- Live crown ratio: 0.6–1.0 [est.].

**Branching**
- Insertion angles [est.]:
  - Main limbs leave low at 40–70°, then **bend out nearly level** (85–95°) on exposed trees.
  - Upper limbs end in a horizontal flat-topped surface.
- Limb curvature: the strongest bend of any species here. Limbs rise, elbow and run horizontally, often twisting [obs.].

**Wind and special forms (signature at Cypress Point and Pebble Beach)**
- Foliage gathers in **flat dense pads or shelves** on top of horizontal limbs, with open space below each pad and sky between the pads [obs.].
- The crown is sheared and swept leeward [obs.].
- Iconic single trees (the Lone Cypress) and wind-tortured groves [obs.].
- Point Lobos branches are often stained bright orange by the alga *Trentepohlia* [obs.; regional].

**Foliage**
- Leaves: scale leaves in decussate pairs on 1.5–2 mm twigs; bright to dark green, not glaucous [S:GDB].
- Cones: 2.5–4 cm, grey-brown [S:GDB].
- At 50–150 m:
  - **Dark green (#2E4A2C) horizontal pads and tiers** with hard flat tops.
  - Tufted and lumpy within each pad.
  - Sheltered trees: a dense, dark, columnar-conic mass.

**Bark**
- Rough and fibrous [S:GDB]. Grey-brown to reddish-brown, with long shallow fibrous ridges [est.].
- Exposed old trunks weather to silver-grey.
- Colours: #7A6E62, weathered #A8A49C, *Trentepohlia* #D9822B (local).

**Signature at a glance**
1. Flat-topped, wider-than-tall coastal crown.
2. Dense foliage pads on near-horizontal limbs.
3. Few massive limbs from low on the trunk, often twisted.
4. Leeward lean.

**Sources:** GDB (*H. macrocarpa*); search summaries of UF/IFAS and NC State. Jepson and SelecTree could not be reached.

### 18. Monterey pine — *Pinus radiata*

**Form**
- Height: 15–30 m typical, occasionally 64 m (New Zealand plantations to 68.7 m) [S:GDB]. 15–35 m [S:FEIS].
- Spread: old open-grown trees 10–25 m [est.].
- Architecture:
  - Excurrent and "broadly conic" when young [S:GDB].
  - Old trees: rounded to flattened, often decurrent with heavy limbs [S:GDB].
- Crown shape: closed stands have a "very shallow" crown, about **10–20 % of tree height** [S:GDB].
- Live crown ratio: stands 0.10–0.20 [S:GDB]; open-grown 0.6–0.9 [est.].

**Branching**
- Arrangement: **multinodal**, with 2–5 branch clusters per year's growth [est.; well known for the species, the source gives no count]. This gives a dense, many-layered branching look.
- Insertion angles: primary branches are "variably level, downcurved, or ascending" [S:GDB]; scaffolds 50–90° [est.].
- Limb curvature: heavy old limbs ascend steeply and are crooked.
- Cones: closed cones persist in clusters of 3–5 around branches for 6–20 or more years [S:GDB, FEIS]. Visible as knobbly clusters along old limbs.
- Twig density: medium-coarse.

**Foliage**
- Needles: in threes (pairs on the island variety), 8–15 cm, deep green to grass green [S:GDB, FEIS].
- At 50–150 m:
  - **Dense, rich deep green (#2F4D2A) rounded masses** that are dark and heavy.
  - Old trees have flat, irregular, dome-shaped tops.

**Bark**
- Red-brown turning grey with age, furrowed between long rectangular scaly ridges [S:GDB].
- Old trees: thick, dark grey-brown to almost black, with deep furrows [est.].
- Ridges 3–8 cm wide [est.].
- Colours: #3F3833, ridges #5C524A, red-brown in fissures #6E4A38.

**Signature at a glance**
1. Heavy dark-green dome on a thick, dark, deeply furrowed trunk.
2. Persistent cone clusters on limbs.
3. Dense, many-tiered branching.

**Sources:** GDB (*P. radiata*); FEIS (*pinrad*).

### 19. Torrey pine — *Pinus torreyana*

**Form**
- Height: to 15(–23) m [S:GDB]. Natural trees are often 5–12 m [est.]. The tallest trees are cultivated [S:GDB].
- Spread: 8–15 m [est.].
- Architecture: decurrent. The trunk is "mostly crooked and leaning" in the wild, and "tall and straight in planted stands" [S:GDB].
- Crown shape: rounded to flattened or irregular [S:GDB]. Wild crowns are contorted and sparse [S:GDB, Kral], and can be "almost prostrate" in ocean gales [S:GDB, Torrey 1858].
- Live crown ratio: 0.5–0.8 [est.].

**Branching**
- Habit: **candelabra**. Branches are irregular and spread upward; Torrey described them as horizontal, curving upward toward the tips [S:GDB].
- Insertion angles [est.]:
  - Main limbs leave at 60–90°, then turn up to 20–40° at the ends.
- Twigs: stout, 1–2 cm thick [S:GDB].
- Twig density: **coarse and sparse**. Few, thick limbs.

**Wind and special forms**
- Wind-sculpted, leaning and contorted trees on sandstone bluffs. This is the Torrey Pines golf course landscape [obs.].

**Foliage**
- Needles: 5 per bundle, (15–)20–30(–33) cm long, about 2 mm wide, dark grey-green, **clustered at branch tips** in tufts [S:GDB].
- Cones: 10–15 cm, heavy, chocolate to red-brown [S:GDB].
- At 50–150 m:
  - **Big shaggy tufts (#3E5A40) at the ends of bare upcurved limbs**.
  - Lots of sky.
  - Each tuft about 0.5–1 m [est.].

**Bark**
- Red-brown to purple-red, deeply furrowed, with irregular flat scaly ridges [S:GDB].
- Ridges: 3–8 cm [est.].
- Colours: #6E4A3A, purplish #5A3A36, fissures #2E201C.

**Signature at a glance**
1. Leaning, crooked trunk.
2. Sparse candelabra of upturned limbs.
3. Huge long-needle tufts at the limb ends.
4. Wind-sculpted, on coastal bluffs.

**Sources:** GDB (*P. torreyana*, incl. Torrey 1858 and Kral 1993).

### 20. Aleppo pine — *Pinus halepensis*

**Form**
- Height: 15–25 m [S:GDB]; up to 20 m [S:EUAT].
- Trunk diameter: 80–100 cm [S:EUAT].
- Spread: 8–15 m [est.].
- Architecture: decurrent. A single trunk, often divided [S:GDB]. Frequently leaning and sinuous [obs.].
- Crown shape: "broadly conical to dome-shaped, flattening and opening up with age" [S:EUAT]; rounded or flat-topped, often wind-shaped near the sea [S:GDB].
- Live crown ratio: 0.4–0.7. Lower branches die back [S:EUAT].

**Branching**
- Habit: slender, irregular, horizontal branches that turn up at the tips [S:GDB].
- Insertion angles [est.]: scaffolds 45–80°.
- Branchlets stay smooth and grey-green [S:GDB].
- Twig density: fine to medium, open.
- Shoots: often polycyclic, with 2–3 flushes a year [est.].

**Foliage**
- Needles: in pairs, sometimes threes, 6–12 cm, under 1 mm wide, **light green**, sparse on the shoot [S:EUAT, GDB].
- Cones: pendant on thick stalks, red-brown, persistent [S:GDB].
- At 50–150 m:
  - **Light yellowish-green (#7A8A55), airy, wispy, see-through crown**.
  - The palest pine here.

**Bark**
- Young: smooth, silver-grey.
- Older: reddish- to purple-brown, finely fissured into scaly plates [S:EUAT, GDB].
- Branches stay grey.
- Colours: young #A8A9A3; old plates #6B4E45, fissures #3A2B26.

**Signature at a glance**
1. Pale, light-green, airy, irregular crown.
2. Leaning trunk.
3. Silver-grey branches.
4. Pendant cones.

**Sources:** EU Atlas *P. halepensis / brutia*; GDB.

### 21. Stone pine (umbrella pine) — *Pinus pinea*

**Form**
- Height: 12–25(–35) m [S:GDB]; up to 25–30 m [S:EUAT].
- Spread: 10–20 m [est.]. Usually about 0.6–1.0 of the height.
- Architecture:
  - Decurrent from an early age. "Globose and shrubby when young, umbrella-shaped in mid-age and flat and broad in maturity" [S:EUAT].
  - Conic only in the first 2 years [S:GDB].
  - The trunk is often short and slightly sinuous [S:GDB, EUAT].
- Crown shape: **umbrella**. The high crown carries no low branches [S:EUAT].
- Live crown ratio: mature trees 0.25–0.45 [est.].

**Branching**
- Insertion angles:
  - Long branches rise at **30–60° above horizontal** [S:GDB], which is 30–60° from vertical.
  - Numerous upward-angled branches carry foliage near their ends [S:EUAT].
  - Branch **tips curve up to vertical** [S:GDB].
- Shoots: usually uninodal [S:GDB].
- Scaffold limbs: 3–8 major ascending limbs forming a vase under the umbrella [est.].
- Limb curvature: straight to gently sinuous ascents, flaring evenly to a level canopy.

**Foliage**
- Needles: in pairs, 10–18(–28) cm [S:GDB] (8–15 cm per the EU Atlas), mid-green to bluish-green.
- Juvenile glaucous needles: 1.5–4 cm, for 3–10 years [S:GDB].
- Cones: 8–12 cm, globose, 3 years to ripen [S:GDB].
- At 50–150 m:
  - **A smooth, dense, flat-topped canopy disc** (#3E5A36) with a softly lumpy upper surface and a sharp flat underside.
  - Bare limbs visible below.

**Bark**
- Thick, deeply fissured plates [S:GDB]. "Reddish brown, deeply fissured, with broad, flat-topped, orange-purple plates" [S:EUAT], with blackish plate edges [S:GDB].
- Plates: 10–30 cm long, 5–12 cm wide [est.].
- Colours: plates #B06A3E, fissures and edges #3A2A22.

**Signature at a glance**
1. Umbrella: a flat dense parasol on several ascending limbs.
2. Short trunk.
3. Orange-plated bark.
4. No low branches.

**Sources:** EU Atlas *Pinus pinea*; GDB.

### 22. Canary Island date palm — *Phoenix canariensis*

**Form**
- Height: 6 m currently in the Santa Monica range, potentially 15 m or more [S:SMM]. Old planted trees reach 15–20 m [est.].
- Trunk: 0.5 m or more across at the base of mature trees, excluding leaf bases [S:SMM]; to about 1 m across in landscape specimens [secondary].
- Crown spread: 8–12 m [est.; about 12 m per a Sunset summary].
- Architecture: Corner's model, a single unbranched axis with lateral inflorescences [S:BC2007 defines the model; attributing it to palms is standard].
- Crown shape: a **rounded, dense, spherical-to-hemispherical head** of arching leaves [S:SMM "rounded canopy"].

**Leaves (the "branches")**
- Size: pinnate, (0.85–)3–4.5 m long [S:SMM].
- Leaflets: 20–70 cm × 2–3.5 cm, 8–11 per 100 mm of rachis, ascending at about 45° from the rachis in a V-fold [S:SMM].
- Lower leaflets: rigid spines to 40 cm [S:SMM].
- Petiole: thick, about 75 mm at the base [S:SMM].
- Leaf count: healthy palms carry a full round canopy of **130–150 leaves**; potassium deficiency cuts this to half or less, and the average South Florida palm holds about 65 [S:UFPC; S:UFPP]. It makes about 50 leaves a year in South Florida [S:UFPC; S:UFPP]. A well-kept Californian course palm after pruning: about 60–100 green leaves [est.].
- Leaf angles: from about 0–30° from vertical at the top to 100–130° for the old lower leaves, which arch strongly down [est.].
- Curvature: the rachis arches along its whole length; tips droop.

**Trunk pattern**
- Persistent, cut leaf bases form a **diamond or lattice pattern**. Trimmed landscape palms show a "pineapple" knob just under the crown [obs.].
- Leaf-base scars: about 10–15 cm wide [est.].
- Colours: trunk #8A7B66, scars #6E604E, fresh cut bases #B8A27A, foliage #4E6B2F.

**Signature at a glance**
1. Massive thick trunk with diamond leaf-base pattern.
2. Huge round ball of arching feather leaves.
3. Pineapple knob under the crown.

**Pruning on courses and in landscapes**
- **The "pineapple" cut is the usual landscape look.** UC defines the pineapple as "the ball-like mass of persistent leaf bases just below the leaves" [S:IPMPN]. Crews sculpt it from the cut petiole stubs, and often "skin" or "peel" the old leaf bases off the trunk below [S:IPMPN], or cut them back to a neat diamond lattice [obs.].
- **Ball size** [obs./est.]: an egg- or onion-shaped knob, widest about a third of the way down, then tapering into the trunk. It is about 1.3–1.6 times the trunk diameter across and 1.2–2 times the trunk diameter tall: roughly 1.0–1.3 m across and 1.0–1.5 m tall on a 0.8 m trunk. The stubs form a tight spiral of pale cut ends (#B8A27A fresh, weathering to the scar colour #6E604E).
- **What the cut does to the crown.** Making a pineapple removes living lower leaves, so the green crown stops at about 70–90° from vertical instead of hanging to 100–130° [est.]. A properly pruned palm instead has a round canopy "with green leaves right down to the bottom" [S:UFPP].
- **Pineapples are discouraged.** Pruning living leaves spreads Fusarium wilt on tools, and freshly cut living leaf bases attract palm weevils [S:UFPP; S:UFPC]. UC links sculpted pineapples and skinned trunks to sudden crown drop [S:IPMPN]. Hodel (UC Cooperative Extension) says to remove only dead leaves "or, at the most, leaves up to the horizontal (an imaginary line through the middle of the crown, from 3 to 9 o'clock)", and to refrain from excessive trunk skinning and "ball shaping" [S:HODGC].
- **The hurricane cut** leaves only a tuft of the youngest leaves. It is discouraged: after the 2004–2005 Florida hurricanes, hurricane-cut palms were more likely to lose their crowns than full-crowned ones [S:UFPP]. UF cites the ANSI A300 (2001) pruning standard: no leaves with tips above the horizontal (the 9:00 and 3:00 positions on a clock face) should be removed [S:UFPP]. ISA's consumer guidance is reported to set the same limit [secondary].
- **Cut height in a game** [est.]: "natural" keeps the full ball of leaves down to about 130°. "Pineapple" keeps only leaves within about 80–90° of vertical and adds the knob. A "hurricane" cut keeps only leaves within about 30° of vertical and should be rare.

**Sources:** Prigge & Gibson, Flora of the Santa Monica Mountains (SMM); Broschat, UF/IFAS ENH-598 and ENH1182 (UFPC, UFPP); Hodel, UC IPM Pest Notes 74148 (IPMPN) and UCCE palm care sheet (HODGC).

### 23. Mexican fan palm — *Washingtonia robusta*

**Form**
- Height: in range under 16 m; old cultivated trees over 30 m [S:SMM]. Up to 25 m [secondary].
- Trunk: slender, very gradually tapered toward the crown, and **expanded at the base** [S:SMM]. Up to about 30 cm across [S:RBG Vic summary].
- Crown: green leaves occupy only the **upper 2 m** of the axis [S:SMM]. Crown diameter about 3–5 m [est.].
- Architecture: Corner's model.

**Leaves**
- Blade: costapalmate fan, round in outline, (200–)600–1350 mm across [S:SMM].
- Petiole: up to 1.5 m or more, longer than the blade. Teeth are red to orange and hooked; on adults they occur only on the lower third [S:SMM].
- Segments: split about halfway; **drooping on adult plants** [S:SMM].
- Dead leaves: hang in a **skirt (petticoat)** until blown or trimmed off, leaving ring-like scars [S:SMM]. Many landscape palms are trimmed bare.
- Leaf angles [est.]: about 20–60° from vertical in the green crown; the skirt hangs at about 170–180°.

**Trunk**
- Exposed trunk: dark grey with shallow vertical fissures [S:SMM].
- Ring-like leaf scars 2–5 cm apart [est.].
- Colours: trunk #8C857A (grey) to #6E675E; skirt #A88F68 (straw-brown); leaves #5E7A3A (bright glossy green).

**Signature at a glance**
1. Very tall, thin, slightly tapering grey pole.
2. Small compact head of fan leaves at the top.
3. Straw skirt below the head, or a clean trimmed trunk.
4. Flared base.

**Further figures (UF/IFAS)**
- Healthy palms have a full, rounded canopy of **at least 30 leaves**; potassium deficiency halves that [S:UFMF]. Up to 50 new leaves a year [S:UFMF]; UF's pruning paper gives 60 a year in South Florida [S:UFPP].
- Leaves are about 3–5 ft (0.9–1.5 m) wide, on sharply toothed petioles about 4–6 ft (1.2–1.8 m) long. Leaf bases are split and reddish-brown [S:UFMF].
- The trunk is reddish-brown, weathering to light grey. It tapers from nearly 2 ft (0.6 m) at the base to as little as 8 in (0.2 m) near the top of old specimens [S:UFMF]. Its base is abruptly and prominently flared, unlike *W. filifera* [S:HOD14].
- In Florida young palms keep their dead leaves, or the leaf bases if the leaves are cut off, as a skirt. At about 30 ft (9 m), or 10–15 years old, the leaves and bases drop within a year or two, and the palm becomes largely self-cleaning [S:UFMF; S:UFNA; S:UFPP]. In arid climates the bases are reported to persist much longer [secondary].

**Pruning on courses and in landscapes**
- **Three looks are common.** (1) The *skirt cut*: the dead leaves are cut off at the petioles, and the split leaf bases ("boots") stay tightly attached in a criss-cross lattice the full length of the trunk [S:UFNA]. (2) *Skinned*: the skirt is trimmed, then the boots are removed to leave a smooth trunk [secondary; UF summary]. (3) *Natural*: the full dead skirt, rarer on maintained grounds.
- **Why skirts come off.** Removing the skirt removes hiding places for rats, snakes and scorpions [S:UFPP]. Dead *Washingtonia* fronds are a fire hazard and must be removed by law in some areas [S:UFWF].
- **The band of boots on a skinned palm.** The bases of living and recently dead leaves are firmly attached. Pulling off bases that do not come away easily tears a strip of trunk tissue, which lets in Thielaviopsis trunk rot [S:UFPP], so skinning stops short of the crown. Skinned trunks therefore keep a collar of boots under the green leaves, about **1–3 m deep (roughly 10–25 rows of bases)** below the lowest green petiole, ending in a fairly clean horizontal line [est.; growers report skinning only up to where the bases still look alive, secondary]. Phoenix city guidance recommends keeping the petiole bases ("peel") to protect the trunk from climbing spikes [S:PHX].
- **How high to cut.** Phoenix guidance, given as a nationally accepted standard, says fan palm fronds "should not be pruned higher than fronds originating at a 45-degree angle from horizontal" [S:PHX]: no green leaf less than 45° from vertical is cut. The Californian and ANSI rule is gentler: dead leaves only, or at most leaves up to the horizontal (3 to 9 o'clock) [S:HODGC; S:UFPP, citing ANSI A300]. Hodel's sheet shows a "correctly pruned *Washingtonia robusta*" [S:HODGC].
- **Over-pruning.** Severe pruning depletes the palm and gradually narrows and weakens the trunk [S:PHX; S:UFPP]. The hurricane cut (a tuft of the youngest leaves only) makes crowns more likely to snap [S:UFPP]. Over-pruned palms show a "feather-duster" crown instead of a round one [S:UFPP].
- **In a game** [est.]: a "skinned" robusta shows the smooth grey trunk, a 1–3 m band of reddish-brown boots, then green leaves from about 90° from vertical upward. A "skirt" palm has boots to the ground and no dead blades.

**Sources:** Prigge & Gibson, Flora of the Santa Monica Mountains (SMM); Broschat et al., UF/IFAS ENH-827, ENH1077 and ENH1182 (UFMF, UFNA, UFPP); Gilman et al., ENH-826 (UFWF); Hodel 2014 (HOD14) and UCCE palm care sheet (HODGC); City of Phoenix (PHX).

### 24. Coast live oak — *Quercus agrifolia*

**Form**
- Height: 6–25 m [S:FEIS]; up to 30 m [S:VT].
- Spread: often greater than height [S:VT]. Typically 10–30 m [est.].
- Architecture: decurrent. Open-grown trunks are only **1.2–2.4 m** tall before the primary branches grow out horizontally [S:FEIS].
- Crown shape:
  - Open-grown: broad and dense, with foliage often reaching the ground [S:FEIS]. Lower limbs may recline on the ground [secondary].
  - Dense stands: irregular crowns and few low branches. Trunks may be branchless to about 6 m, with several branches angling up diagonally [S:FEIS].
- Live crown ratio: open-grown 0.85–1.0; stand-grown 0.5–0.7 [est.].

**Branching**
- Habit: "numerous large, crooked, spreading branches" [S:VT].
- Insertion angles [est.]:
  - Open-grown limbs: 60–100°, horizontal or reclining. Stand-grown: about 45°.
- Limb curvature: very crooked, serpentine limbs that snake out level and sometimes touch down. Gnarl comparable to or above *Q. robur* [obs.].
- Scaffold limbs: 3–8.
- Twig density: fine and dense.

**Foliage**
- Leaf: evergreen, elliptic, 2.5–6.4 cm. Thick and **convex (edges curl down)**, with spiny holly-like teeth; shiny dark green above [S:VT].
- At 50–150 m:
  - A **dense, dark, glossy green (#2F4A2A) dome**, evergreen and very uniform.
  - Often a hemisphere sitting on the ground.

**Bark**
- Young: smooth, grey-brown.
- Older: darkens, with broad lighter-grey ridges [S:VT], deep furrows and thick bark [S:FEIS].
- Colours: young #8A8680; mature ridges #7E7A73, furrows #3E3A36.

**Signature at a glance**
1. Wide, low, evergreen dark dome, wider than tall.
2. Short trunk and serpentine horizontal limbs.
3. Holly-like cupped leaves.

**Sources:** FEIS (*queagr*); VT dendrology.

### 25. California sycamore — *Platanus racemosa*

**Form**
- Height: 12–30 m [S:VT 40–100 ft]; to about 40 m [S:TSO].
- Spread: 10–25 m [est.]; "wide-spreading" [S:TSO].
- Architecture: decurrent. One or several trunks [secondary]; often **leaning, forked low, or reclining** in stream beds [obs.].
- Crown shape: open, rounded and irregular [S:VT]. Open-textured with visible limbs.
- Live crown ratio: 0.5–0.8 [est.].

**Branching**
- Arrangement: sympodial (Platanus), with strong twig zigzag [S:BC2007].
- Insertion angles [est.]:
  - Scaffolds: 40–80°.
  - Second order: 50–90°.
- Limb curvature: **sinuous, wildly twisted and bent**. Trunks can be "wildly twisted and bent" [secondary]. More contorted and white than London plane.
- Scaffold limbs: 2–6.

**Foliage**
- Leaf: deeply (3–)5(–7)-lobed with narrow sinuses, 8–18 × 10–25 cm (to 35 × 53 cm) [S:TSO]. Fuzzy beneath.
- Fruit: balls in chains of 2–7 [est.].
- At 50–150 m:
  - **Open, patchy, light grey-green (#7A8A5A) masses** with white limbs showing through.
  - Yellow-brown in autumn.

**Bark**
- Upper stem and limbs: **nearly pure white** under peeling greenish-grey and tan flakes [S:VT]; "often whitish", flaking in fine scales [S:TSO].
- Base of old trees: brown, furrowed and rugged [S:VT, TSO]; 2.5–7.5 cm thick, furrowed, dark brown.
- Patches: 2–10 cm [est.].
- Colours: white #ECE9E0, tan patches #CDBE9C, grey-green flakes #A9A79E, base #5E5348.

**Signature at a glance**
1. Bone-white, mottled, twisting limbs.
2. Leaning or multiple trunks in creek beds.
3. Open, patchy crown.
4. Deeply lobed leaves.

**Sources:** TSO (*P. racemosa*); VT dendrology. The FEIS page returned 404.

### 26. Sugar maple — *Acer saccharum*

**Form**
- Height: 27–37 m, exceptionally 40 m [S:FEIS]; up to 35 m [S:NRCAN].
- Spread: open-grown 12–20 m. The champion is 20.1 m wide at 23.8 m tall [S:SILV].
- Architecture: **opposite branching**. Frequent loss of the terminal bud causes **forking** [S:SILV].
  - Forest trees: excurrent-looking, straight, with the trunk "often branch-free for two-thirds or more of its height" [S:NRCAN].
  - Open trees: decurrent dome.
- Crown shape:
  - Forest: narrow, round-topped [S:NRCAN].
  - Open: very dense oval [S:VT].
- Live crown ratio:
  - Forest: about 0.30–0.35 [from S:NRCAN two-thirds clear bole].
  - Open: 0.75–0.90 [est.].

**Branching**
- Arrangement: opposite and decussate. Forks are V-shaped where twin buds replace a lost terminal [S:SILV].
- Insertion angles [est.]:
  - Scaffolds: 25–45°, upright and ascending.
  - Second order: 40–60°.
- Limb curvature: limbs are fairly straight, ascending and slightly outcurving. Twigs are straight, not zigzag.
- Scaffold limbs: 4–8.
- Twig density: fine.

**Foliage**
- Leaf: opposite, 5-lobed, 8–20 cm long, wider than long; petiole 4–8 cm [S:NRCAN].
- At 50–150 m:
  - A **dense, smooth, even oval** of mid-green (#4A6E30).
  - Autumn: brilliant orange-red-yellow (#E06A1E / #F0A020), the Ontario signature.

**Bark**
- Grey, smooth when young [S:NRCAN].
- Mature: long, firm, irregular vertical ridges that **curl outward along one edge** [S:NRCAN, VT]. Light grey to grey-brown, deeply furrowed with age [S:FEIS].
- Ridges: 2–5 cm wide and 20–60 cm long [est.].
- Colours: #77746D, ridge faces #8D8A82, curls #5A5650.

**Signature at a glance**
1. Dense, smooth oval crown.
2. Spectacular orange and red in autumn.
3. Opposite, upright branching.
4. Grey bark with outward-curling plates.

**Sources:** NRCAN factsheet 86; FEIS (*acesac*); Silvics (Godman, Yawney & Tubbs, via VT mirror); VT dendrology.

### 27. Northern red oak — *Quercus rubra*

**Form**
- Height: 20–30 m, up to 49 m on good sites [S:FEIS]; up to 27 m [S:VT 90 ft].
- Spread: open-grown 15–25 m [est.].
- Architecture: forest-grown trees develop a "tall, straight columnar bole and large crowns"; open-grown trees have "short boles and spreading crowns" [S:SILV].
  - The bole is more excurrent in the forest than in *Q. robur* [S:SILV].
  - Dieback and resprouting can make young stems "crooked, flat-topped, or forked" [S:SILV].
- Crown shape: open-grown, rounded [S:VT]. Forest: large crowns on long clear boles.
- Live crown ratio: forest 0.35–0.45; open-grown 0.70–0.85 [est.].

**Branching**
- Arrangement: alternate, clustered terminal buds.
- Insertion angles [est.]:
  - Scaffolds: 40–60°, ascending.
  - Second order: 50–70°.
- Limb curvature: **noticeably straighter, longer and more regular** than English oak. Gentle upward curves, few elbows [obs.].
- Scaffold limbs: 3–6.
- Twig density: medium-coarse.

**Foliage**
- Leaf: 12–20 cm, 7–11 bristle-tipped lobes, sinuses ⅓–½ of the way to the midrib [S:VT].
- At 50–150 m:
  - A broad, fairly even dome of mid to dark green (#3F5E2E).
  - Autumn: red to russet (#9A2E1E).

**Bark**
- Smooth when young.
- Older: wide flat-topped ridges separated by shallow furrows, like **ski tracks** [S:VT]. Grey to grey-brown, checkered with age [S:FEIS].
- Ridges: shiny light grey, 2–5 cm wide and 0.3–1 m long [est.].
- Furrows: dark.
- Colours: ridges #9A9892, furrows #3E3934, base #6E6A64.

**Signature at a glance**
1. Straight-limbed, broad-domed oak.
2. Pointed bristle-lobed leaves, red in autumn.
3. Ski-track bark with shiny grey ridges.

**Sources:** Silvics (Sander, via VT mirror); FEIS (*querub*); VT dendrology.

### 28. Eastern white pine — *Pinus strobus*

**Form**
- Height: to 30 m, occasionally more [S:NRCAN]. Virgin-forest trees reached 46 m [S:FEIS]; record 57.6 m [S:GDB].
- Spread: 10–15 m [est.].
- Architecture: excurrent when young.
  - Old trees: the crown becomes "irregular with a few long, stout branches set roughly at right angles to the trunk" [S:NRCAN].
  - Weevil damage often forks the stem [obs.].
- Crown shape:
  - Young open-grown: "conical with regular whorls of branches" [S:NRCAN].
  - Old open-grown: "broadly oval, flat-topped", often one-sided from the prevailing wind [S:NRCAN].
  - Forest: columnar, with the trunk branch-free for the lower two-thirds [S:NRCAN, FEIS].
- Live crown ratio: forest about 0.30–0.35 [from S:NRCAN/FEIS]; open-grown 0.6–0.9 [est.].

**Branching**
- Arrangement: one whorl per year, typically 3–7 branches per whorl (about 5) [est.; the sources confirm "regular whorls" and give no count].
- Insertion angles:
  - Mid and lower: about 90° (right angles [S:NRCAN]).
  - Upper: 40–60°, ascending [S:NRCAN].
- Limb curvature: long, nearly straight, **level limbs that sweep up at the tips** ("spreading-upswept" [S:GDB]).
- Layering: old trees show **distinct horizontal tiers** of foliage separated by gaps [obs.].
- Wind flagging: limbs on the leeward side only [S:NRCAN].

**Foliage**
- Needles: 5 per bundle, 5–15 cm, soft, flexible, blue-green [S:NRCAN, GDB].
- At 50–150 m:
  - **Soft, feathery, blue-green (#4A6658) horizontal tiers and plates**, with sky between them.
  - Old trees: a flag- or pagoda-like silhouette above the hardwoods.

**Bark**
- Young: thin, smooth, greyish-green [S:NRCAN].
- Mature: broad scaly ridges 2–5 cm thick, separated by deep longitudinal furrows; dark greyish-brown [S:NRCAN].
- Colours: young #6F7A66, mature #4E4741, ridges #5E564F.

**Signature at a glance**
1. Tall pine rising above the hardwoods with layered horizontal tiers.
2. Soft blue-green plumes.
3. Wind-flagged, one-sided crown on exposed sites.
4. Long clear stem in the forest.

**Sources:** NRCAN factsheet 50; FEIS (*pinstr*); GDB.

### 29. White spruce — *Picea glauca*

**Form**
- Height: average about 25 m, over 30 m on good sites [S:FEIS]; up to 50 m [S:GDB]. Ontario: 15–30 m [est.].
- Spread: 4–8 m [est.].
- Architecture: excurrent, with a straight trunk [S:FEIS].
- Crown shape: "broadly conical to narrow, almost linear" [S:FEIS]; broadly conic to spire-like [S:GDB].
- Live crown ratio: the live crown reaches close to the ground; trees in dense stands shed lower branches [S:FEIS]. Open-grown 0.85–1.0; stand-grown 0.5–0.7 [est.].

**Branching**
- Arrangement: one whorl per year, 4–6 branches, plus interwhorl branches [est.].
- Insertion angles [est.]:
  - Upper: 70–90°.
  - Lower: 95–115°.
- Branches slightly drooping [S:FEIS, GDB]; twigs not pendent [S:GDB].
- Limb curvature: gentle sag with upturned tips. Denser and stiffer than Norway spruce, and no hanging curtains.
- Twig density: fine and dense.

**Foliage**
- Needles: 0.5–1.8 cm [S:FEIS] (1.5–2 cm [S:GDB]), blue-green, 4-angled [S:GDB].
- Cones: 2.5–6 cm, slender [S:GDB].
- At 50–150 m:
  - A **dense, narrow, blue-green (#3E5A50) spire**, bluish-grey compared with other spruces.
  - The crown surface is smooth and dense.

**Bark**
- Thin, smooth, scaly or flaky, generally under 8 mm thick [S:FEIS]. Grey-brown [S:GDB].
- Scales: 1–3 cm [est.].
- Colours: #8A8580 grey-brown with a silvery cast; inner #8B5A44.

**Signature at a glance**
1. Dense, narrow, blue-grey spire.
2. Branches nearly to the ground.
3. Short stiff needles.
4. Small cones.

**Sources:** FEIS (*picgla*); GDB.

### 30. Generic "Shrub"

This is not a species. For golf-course understorey and rough, model it as a multi-stem mound:
- Height 0.5–3 m.
- Width 1–2 times the height.
- 5–20 stems from the base at 10–40° from vertical, arching out.
- Very fine, dense twigs.
- Foliage as a continuous lumpy skin.

Gorse is the spiny, yellow-flowered special case. Hawthorn, broom (*Cytisus scoparius*), heather (*Calluna*, under 0.6 m) and Californian chaparral would be further variants.

### 31. California fan palm — *Washingtonia filifera*

The native Californian palm: desert oases in southeastern California, western Arizona and northern Baja California [S:HOD14; S:SEINET]. Planted all over California, and the classic palm of the Coachella Valley courses. It hybridises freely with *W. robusta*; the hybrid (*W.* × *filibusta*) is now common in the trade and sits between the parents in every respect below [S:HOD14].

**Form**
- Height: commonly 40–50 ft (12–15 m), capable of 80 ft (24 m) [S:UFWF]; the fact-sheet range is 40–60 ft (12–18 m) [S:UFWF]. Other sources give 9–15 m [S:FEIS], to 20 m [S:HOD14], and wild Arizona trees to 15 m [S:SEINET]. It is shorter and slower-growing than *W. robusta* [S:UFWF]. A typical planted palm on a Californian course: 10–14 m [est.].
- Trunk: **the stout one**. Hodel's comparison gives 50–90 cm dbh against 25–30 cm for *W. robusta* [S:HOD14]. FEIS gives 0.3–0.6 m [S:FEIS] and the Arizona flora "to 1 m" [S:SEINET]. The Flora of North America excerpt on SEINet reads "Stems massive, … 100–150 cm diam." [S:SEINET]; that text is garbled there and probably measures over the leaf bases. A skinned trunk of a mature planted palm is about 0.6–0.9 m across [est.].
- Base: **only slightly flared**, where *W. robusta* is abruptly and prominently flared [S:HOD14]. Model a gentle swelling over the bottom 0.5–1 m, about 1.2 times the trunk diameter [est.], not robusta's bottle foot.
- Taper: little; the column is close to uniform [obs.].
- Crown spread: 10–15 ft (3–4.5 m) [S:UFWF]. That looks low for leaves 3.5–4 m long, which reach 2.5–3.5 m out from the axis, so a healthy planted palm is more like 5–7 m across [est.].
- Canopy: loose and open, larger and more expansive than robusta's dense, compact head [S:HOD14]. UF rates the crown symmetrical and open [S:UFWF]. FEIS: "a rosette of large leaves" [S:FEIS].
- Architecture: Corner's model, as entry 23.

**Leaves**
- Type: costapalmate fan [S:UFWF].
- Total length, petiole and blade together: **3.5–4 m**, against 2–2.5 m in *W. robusta* [S:HOD14].
- Blade: 1.5–2 m long, palmately divided nearly to the middle into 40–60 segments [S:SEINET, Simono 2014]. Overall leaf 3–6 ft (0.9–1.8 m) across [S:VT]. Blade width about 1.5–1.8 m [est.].
- Petiole: about half the leaf, 1.5–2 m [est.; a search summary gives "up to 2 m", secondary]. Green, sharply toothed at the base [S:SEINET]. The spines are curved or hooked, prominent at the base and smaller toward the blade [S:SEINET, Mason 1999]. The teeth are relatively small and blunt compared with robusta's, and the petiole bases are mostly green [S:WPWF].
- Hastula: no patch of white felt beneath, which robusta and the hybrid have [S:HOD14].
- Split depth: nearly to the middle [S:SEINET]. In the hybrid the split runs about 30 % of the blade in the middle, 50 % at the sides and 90 % at the base, with pendulous free tips [S:HOD14]; use the same gradient for *filifera* [est.].
- Drooping tips: the free segment tips hang down over the outer third of the blade [est., by analogy with the hybrid and robusta].
- **Threads**: long, white, thread-like fibres hang between the segments, like cotton on young palms; hence "cotton palm" [S:WPWF]. The leaflet edges bear "fibrous white strands or filaments" [S:VT]. They are far more plentiful than on adult robusta [obs.]. Model them as 10–30 cm white strands hanging from most sinuses [est.].
- Colour: **dull, grey-green or leaden green**, against robusta's bright, shiny dark green [S:HOD14]. Also "grey-green" [S:VT; S:SEINET], "grey/green" [S:UFWF] and grey-blue-green [S:WPWF].
- Leaf count: no source gives one. A healthy tree carries about 25–40 green leaves [est.]; the hybrid has about 40 in a smaller, denser canopy [S:HOD14]. In coastal California and valleys with marine influence, diamond scale disease kills the lower leaves early and leaves a much reduced canopy [S:IPMPN], so 10–20 green leaves is normal on coastal courses [est.]. Desert palms are not affected [S:IPMPN].
- Leaf angles, from vertical [est.]:
  - spear: 0–5°;
  - young: 10–30°;
  - mature: 40–75°;
  - old green: 80–110°, the petiole near level and the blade hanging;
  - dead: the leaf drops and hangs against the trunk, 165–180° (the general habit of palms without a crownshaft [S:UFPP]).

**The dead-leaf skirt**
- Dead lower leaves persist and form a dense, brown, shaggy covering below the living leaves, which gives the name "petticoat palm" [S:UFWF]. Leaves die at the end of the summer growing season and stay attached [S:FEIS].
- Untrimmed, the thatch may run the full length of the trunk [S:WPWF]; "nearly to the ground" [S:VT]. In FEIS's photographs the skirts reach from the base of the bole to the crown [S:FEIS]. **In the wild, model the full skirt to the ground.**
- Fire: in a fire all the dead leaves usually burn, with most of the living rosette; each fire also burns off some of the trunk and reduces its diameter [S:FEIS]. The trunk is highly fire-resistant and fires rarely kill the palm [S:WPWF]. Wild oasis palms are therefore often skirtless, with blackened trunks under a regrown crown [obs.].
- In landscapes the skirt is a fire hazard and a popular rodent roost, and must be removed by law in some areas [S:UFWF].
- Shape [est.]: the dead leaves fold down with the petioles against the trunk and the folded blades overlapping like shingles. The skirt is about 1.5–2.5 m across at the top and narrows slightly downward.
- Colour [est.]: straw grey-tan, #A39373 when newly dry, weathering to #8E8270.

**Trunk**
- Skinned: grey-brown, tough, splitting vertically [S:VT]; brown where exposed [S:WPWF]. The hybrid's skinned trunk is smooth and brown with vertical fissures [S:HOD14].
- Rings: close horizontal leaf scars, about 2–5 cm apart, fading low on old trunks [est.].
- Boots, when not skinned: persistent split leaf bases in a criss-cross lattice [obs.]. Each base is about as wide as the petiole foot, 10–15 cm (14 cm in the hybrid [S:HOD14]).
- Colours [est.]: skinned trunk #857A6A, scar rings #6F6556, boots #8A6F52 weathering to #8C8476, crown #6F7F5E, threads #D8D2C2.

**Signature at a glance**
1. A thick, straight, nearly untapered column, two to three times robusta's girth, with only a slight flare at the foot.
2. A big, loose, open head of grey-green fans, with white threads hanging from the segments.
3. In the wild, a full straw skirt from crown to ground. On courses, a skinned trunk or a lattice of boots.
4. Shorter than robusta: rarely above 15–18 m.

**Pruning on courses and in landscapes.** The options and limits are those of entry 23: a skirt cut that keeps the boots, a skinned trunk with a 1–3 m band of boots under the crown, or the natural skirt. Remove dead leaves only, or at most leaves up to the horizontal [S:HODGC]. Removing leaves infected with diamond scale does not control the disease [S:IPMPN].

**Sources:** Gilman et al., UF/IFAS ENH-826 (UFWF); Hodel 2014, *Phytoneuron* (HOD14); FEIS review by Howard 1992 (FEIS); SEINet portal page carrying the FNA, Mason 1999 and Simono 2014 descriptions (SEINET); Virginia Tech factsheet 598 (VT); Wikipedia (WPWF); UC IPM Pest Notes 74148 (IPMPN); Broschat, ENH1182 (UFPP). Jepson eFlora, FNA (floranorthamerica.org, efloras), Calscape and Palmpedia were not reachable.

### 32. Queen palm — *Syagrus romanzoffiana*

A South American feather palm (Atlantic and semideciduous forests of the Paraná basin [S:NOB17]), widely planted in coastal Southern California and Florida.

**Form**
- Height: up to 50 ft (15 m) [S:UFQP; S:VT]. The stem is 7–17 m [S:NOB17]; usually 10–15 m, to 20 m [S:BBNE]. A typical planted palm on a Californian course: 8–12 m [est.].
- Trunk: smooth and grey, 8–15 in (20–38 cm) across depending on seed source and site, and may contain bulges [S:UFQP]. Noblick gives (14–)20–40(–50) cm, dark to light grey, with the leaf-scar intervals indistinct on older trunks [S:NOB17]; Frew gives typically about 30 cm, to 60 cm [S:BBNE]. "Light grayish brown, ringed, becoming more smooth and cement-like with age" [S:VT].
- Rings: smooth lower trunk with faint scars; the scars are more distinct higher up, where leaves fell recently. The rings are widely spaced low down and closer near the top [S:BBNE]. No crownshaft [S:BBNE; S:UFPP].
- Bulges: UF notes them [S:UFQP]. A gentle irregular waist or bulge along 10–20 % of trunks is a good variation [est.].
- Spread: 20–25 ft (6–7.5 m) [S:UFQP].
- Crown shape: a rounded, open head of arching plumes; when not over-pruned, the lowest green leaves hang below horizontal [est.].
- Architecture: Corner's model.

**Leaves**
- Count: **7–25 in the crown**, spirally arranged and spreading [S:NOB17]; 10–25 [S:BBNE]. Potassium deficiency kills the oldest leaves early and reduces the number the palm can carry [S:UFQP]. A well-kept Californian palm: 12–18 [est.].
- Size: the sheathing leaf base is 50–84 cm long and fibrous; the pseudopetiole 110–167 cm; the petiole proper 0–10 cm; the rachis 167–440 cm [S:NOB17]. The visible leaf (pseudopetiole and rachis) is therefore 2.8–6 m. Other sources: up to about 5 m [S:BBNE]; up to 15 ft (4.6 m) [S:VT]. Unarmed [S:NOB17].
- Leaflets: 147–250(–340) per side, irregularly set in clusters of 2–5(–7) in divergent planes [S:NOB17]. Frew: groups of 2–7 pointing in different directions, which gives the plume-like, three-dimensional look, with the leaflets near the tip in a single plane [S:BBNE]. This is the **plumose** leaf: not a flat comb like the Canary date palm.
- Leaflet size: middle 60–116 × 1.9–4.3 cm, basal 24–96 × 0.2–1.3 cm, apical 20–80 × 0.1–2.5 cm [S:NOB17].
- Softness: the outer 60 cm or so of each leaflet often hangs down [S:BBNE]. The rachis arches strongly, so the whole leaf is soft and drooping [obs.].
- Colour: dark green above, paler beneath [S:NOB17]. Crown seen from a distance #4A6B32; undersides #6E8458 [est.].
- Leaf angles, measured at the leaf base, from vertical [est.]:
  - spear: 0–5°;
  - young: 10–30°;
  - mature: 40–80°, with the rachis arching so its tip ends at 100–140°;
  - old green: 80–110°, the tip hanging at 150–170°;
  - dead: hangs against the trunk, 160–180° [S:UFPP, which uses the queen palm as its example of a palm without a crownshaft].

**Dead leaves**
- **Not self-cleaning**: every leaf must be cut off by hand after it dies, and the flower and fruit stalks are usually removed at the same time [S:UFQP]. Dead leaves stay on the palm a long time before they eventually fall [S:BBNE].
- Do not pull off leaf bases that are still firmly attached: the wound lets in Thielaviopsis trunk rot [S:UFQP]. Avoid removing leaves that are not completely dead [S:UFQP].
- Unpruned, expect 2–6 brown dead leaves hanging flat against the trunk under the green head, colour #8C7352 weathering grey [est.].
- Fruit: large clusters of bright orange fruit, ¾–1 in long, can weigh over 100 lb [S:UFQP]. Hanging orange clusters in the crown are a strong cue [obs.].

**Trunk colours** [est.]: smooth grey #A29D92, rings #8E897F, upper trunk near the crown browner #8D8470, fibrous sheaths at the top #7A6A55.

**Signature at a glance**
1. A slender, smooth, pale grey ringed column, like concrete, sometimes with a bulge.
2. A head of 10–20 long, soft, arching feather leaves whose leaflets stick out in several planes, so each leaf reads as a plume.
3. A few brown dead leaves hanging against the trunk under the green head, unless pruned.
4. Orange fruit clusters hanging in the crown.

**Pruning on courses and in landscapes.** Routine care is removing dead leaves and fruit stalks [S:UFQP], which leaves the clean grey ringed trunk. The ANSI limit applies as for the other palms: no leaves with tips above the horizontal should be removed [S:UFPP]. Queen palms are also cut into "feather-duster" heads that keep only the upper leaves [obs.]; this is the same over-pruning UF warns against [S:UFPP].

**Sources:** Broschat et al., UF/IFAS ENH-767 (UFQP); Noblick 2017, *Phytotaxa* (NOB17); Frew, Botany Brisbane (BBNE); Virginia Tech factsheet 899 (VT); Broschat, ENH1182 (UFPP). Palmpedia, PACSOA and PalmWeb were not reachable.

## Young, old and narrow trees: what a fitted tree is

The species sections above describe each kind's **specimen**: a grown tree old enough to show all it comes to. The game fits each tree to its own survey (height, crown radius, crown base from lidar), and most course trees are much smaller or narrower than that. Measured on the first holes of three courses in the game on 2026-11-25 (10th, 50th and 90th percentiles, each number on its own; lab/courseSizes.ts) [S:COURSE]:

| Course | Species | n | Height (m) | Crown radius (m) | Crown base (m) |
|---|---|---|---|---|---|
| Riviera | Stone pine | 29 | 3.6 / 5.7 / 10.5 | 2.3 / 3 / 5 | 2 / 3.5 / 5.5 |
| Riviera | Eucalyptus | 350 | 4.9 / 10.6 / 26.5 | 1.4 / 3.6 / 6 | 2 / 4.5 / 11.5 |
| Riviera | Mexican fan palm | 66 | 6.8 / 14 / 31 | 1 / 1.4 / 4.7 | 4.6 / 9.3 / 22 |
| Torrey Pines | Torrey pine | 179 | 3.4 / 4.8 / 14.1 | 1.9 / 2.9 / 5.2 | 0.8 / 2 / 6 |
| Torrey Pines | Eucalyptus | 376 | 4.4 / 12.3 / 17.8 | 1.9 / 3.6 / 5.6 | 1 / 4.6 / 9.5 |
| Torrey Pines | Mexican fan palm | 42 | 6.7 / 13.2 / 19.8 | 1 / 2.3 / 4.2 | 3.6 / 6.5 / 12 |
| Walton Heath | Scots pine | 357 | 13.7 / 15.9 / 18.2 | 2.4 / 3.9 / 4.8 | 4.2 / 7.5 / 10.3 |
| Walton Heath | Silver birch | 316 | 13.4 / 15.6 / 18 | 2.8 / 4.1 / 4.9 | 3.6 / 5.8 / 9.1 |

So a Torrey pine on its own course is mostly a young tree a third of its specimen's height, and a Riviera stone pine of 12 m may have a crown half as wide as its specimen's. The grower takes such a tree as a younger or narrower tree of its kind (src/age.ts). What the sources say changes with age, by species:

- **Stone pine.** "Globose and shrubby when young, umbrella-shaped in mid-age and flat and broad in maturity" [S:EUAT]; conic only in its first 2 years, and its juvenile glaucous needles last 3–10 years [S:GDB]. So the umbrella, its flat top and its bare underside on V-forked limbs, come with age; a young tree is a rounded crown on one short stem. A crown deep for its width (12 m tall, 5.9 m radius from 5.5 m) is a domed umbrella, not the flat slab of a wide old one stood on edge [obs.]. TALLO's stone pines of 3–10 m have r/H 0.35 (0.29–0.42), of 10–18 m 0.29 [S:TALLO]: the course's 0.5 is an open tree's.
- **Torrey pine.** Wild crowns "rounded to flattened or irregular", trunks crooked and leaning in the wild, tall and straight in planted stands [S:GDB]. The sparse candelabra of long bare upcurved limbs with tufts at their ends is an old tree's [obs.]; a young tree is a rounded, bushy, irregular crown of tufts with branches low, its leader still leading [est.].
- **Eucalyptus (blue gum).** Excurrent when young; mature trees have a long clean bole and an open irregular crown of a few big ascending limbs, the trunk often splitting in its upper third [est.; S:EUCLID for size]. Its juvenile foliage is opposite, sessile and glaucous on young trees and coppice [S:EUCLID]. TALLO's blue gums are narrow at every size: r/H 0.12 (0.11–0.16) at 3–10 m, 0.10 at 10–18 m [S:TALLO], about what the courses measure (3.6 m on 10.6–12.3 m). The hanging bunches with sky between are the open adult crown's [obs.].
- **Scots pine.** "Open ovoid-conic when young", old trees "dense, broadly domed or even flat-topped" and often forking into sub-leaders [S:GDB]. TALLO's 10–18 m Scots pines have r/H 0.15 (0.10–0.21) [S:TALLO]: Walton Heath's 3.9 m on 15.9 m (0.25) is a wood's edge or a heath tree, not an old open one (the specimen's 0.42).
- **Silver birch.** Excurrent while young, a single slender stem and a narrow conic-oval crown; the leader is lost in the top third with age, and the pendulous twigs hang in long curtains on mature trees [S:WT; est.]. TALLO's birches are r/H 0.12 at every height band [S:TALLO], the courses' 0.26 is an open or edge tree's.
- **Mexican fan palm.** A palm's leaves are its kind's size at any height: blades 0.9–1.5 m across on stalks of 1.2–1.8 m [S:UFMF]; the head is about 3–5 m across [est.]. A head lidar measures 1.4 m round is a narrow one, most likely over-pruned ("feather-duster" heads, [S:UFPP]) or one whose spread lidar under-reads; its leaves are not a third of their size. The grower keeps a palm's leaves within a fifth of its specimen's length and, for a narrow head, cuts its hanging leaves and holds the rest up (palm.ts).

A weeping willow is a cultivar that weeps from its first years [obs.]: its whips are not an old tree's, and are kept at any size.

## Forked trunks and clumps of stems

Many trees divide low into a few great trunks, or rise as a clump of stems from one root plate. The library decides this per tree from its seed (`forkShare`, `fork` ± `forkSpread`, `forkStems`..`forkStemsMost`; `stemShare`, `stemRange`). No free source gives a forking *frequency* for an open-grown tree of any of these species. The shares below are therefore `[est.]`: set from the sources' qualitative statements and checked against the reference photographs. In a closed wood, the library makes forks 60 % rarer and clumps 35 % rarer, and raises the remaining forks halfway towards the crown base. This follows the forest-versus-open contrast the sources draw: oak and beech are "drawn up" on one stem in woodland [S:TSO], and a coast live oak in a stand is "branchless up to 20 feet" [S:FEIS].

| Species | forkShare | fork ± spread (share of crown base) | stems at a fork | stemShare | clump stems | Basis |
|---|---|---|---|---|---|---|
| Oak (*Q. robur*) | 0.35 | 0.7 ± 0.3 | 2–3 | – | – | TSO: open-grown trees form "a broad, spreading head of rugged branches"; it records trees with "two boles parting low" and "30 ft to fork" [S:TSO]. Parkland oaks often fork below 6 m [est.]. |
| Beech (*F. sylvatica*) | 0.2 | 0.6 ± 0.35 | 2 | – | – | "Usually single-stemmed" [S:EUAT]. Open parkland trees are low-branched and spreading [S:TSO]. The "double solitary beech" reference photograph (lab/REFERENCE.md) shows two trees a few metres apart under one shared crown, each giving way to the other where they meet [obs.]. The library shares a forked tree's crown between its stems the same way. |
| Silver birch (*B. pendula*) | – | – | – | 0.3 | 2–4 | Often multi-stemmed on heathland [obs.]. Birch is coppiced on short rotations of 6–12 years and re-sprouts best when young [S:EUCOP]. |
| Black alder (*A. glutinosa*) | – | – | – | 0.3 | 2–4 | "Occasionally multi-stemmed"; coppice stools are recorded [S:TSO]. It "coppices well" [S:WT]. It sprouts abundantly up to about 40 years, on rotations of up to 60 years [S:EUCOP]. |
| Weeping willow (*S. × sepulcralis*) | 0.4 | 0.7 ± 0.3 | 2–3 | – | – | *S. babylonica* has "the rugged trunk branching low" [S:TSO]. UF/IFAS advises training a single leader to get "a strong, central trunk", so an untrained tree divides [S:UFSB]. |
| Eucalyptus (*E. globulus*, *E. camaldulensis*) | 0.2 | 0.8 ± 0.2 | 2 | 0.25 | 2–3 | The trunk often splits in the upper third [est.]. Blue gum sprouts from the stump, lignotuber and roots, and 70–80 % of cut stumps sprouted in Hawaiian coppice [S:FEIS]. River red gum is a "single-stemmed, large-boled" tree [S:ANBG], but is multistemmed on frosty sites [S:TSO]. California's planted gums are often regrowth from cut stumps, several stems to a stool, as in the Wildomar reference photograph (lab/REFERENCE.md) [obs.]. |
| Monterey cypress (*H. macrocarpa*) | 0.45 | 0.35 ± 0.3 | 2–3 | – | – | "A few major limbs emerging from near the base of the trunk"; one New Zealand tree is "a very large multiple-trunk tree" [S:GDB]. Landscape trees are "typically one trunk" [S:UFMC]. Headland trees forking low into two or three great stems are [obs.]. |
| Stone pine (*P. pinea*) | 1 | 0.72 ± 0.08 | 2–3 | – | – | The trunk is "often short and with numerous upward angled branches" [S:EUAT] and "commonly slightly sinuous" [S:GDB]. Neither source says the trunk forks into stems: the umbrella on a few thick stems is from the reference photographs [obs.]. The spread is kept narrow because the umbrella's flat top depends on it (test/pines.test.ts). |
| Coast live oak (*Q. agrifolia*) | 0.45 | 0.45 ± 0.4 | 2–3 | 0.15 | 2–3 | Open-grown trunks are "usually 4 to 8 feet (1.2-2.8 m) tall" before the primary branches. A size table notes "Some trees had multiple stems". It sprouts from the root crown after top-kill or cutting [S:FEIS]. Several leaning trunks from near the ground are [obs.]. |
| California sycamore (*P. racemosa*) | 0.45 | 0.35 ± 0.3 | 2–3 | 0.15 | 2–3 | Leaning, forked low or reclining in stream beds [obs.]. Search snippets from the CNPS San Diego and Glendale pages say "often multi-trunked", but those pages could not be read (403/404), so this is **not verified**. Neither TSO nor VT mentions trunk form. |

**How the stems are shaped** (README, *How a tree grows*):
- The trunk is one root plate up to where the stems part:
  - a clump's stems part 1.4–2.2 flare heights up;
  - a fork is never under the root plate, and never within a stem's first piece (0.2–1.4 trunk radii, short enough that a fork just over the root plate still ends under it) of breast height.
- Each stem eases into its lean over 1.6 trunk radii, then turns up. At most it leans 12° (an excurrent tree's) to 38° (a decurrent tree's) where it leaves.
- Each stem carries its own leader and great limbs over its own share of the crown.
- Radii follow Leonardo's rule with Δ 2 at the fork. Under breast height, the stems' basal areas there sum to the measured trunk.

**Spread at the foot**, for a host's colliders. These are the outer edges of the stems from the tree's axis, at the species' own size, over 8–24 forked or clumped seeds (mean / max, m):

| Species, form | trunk r | at 1 m | at 2 m | at 3 m |
|---|---|---|---|---|
| Oak, forked | 0.45 | 0.46 / 0.46 | 0.49 / 0.57 | 0.87 / 1.19 |
| Beech, forked | 0.45 | 0.47 / 0.51 | 0.55 / 0.93 | 0.92 / 1.37 |
| Silver birch, clump | 0.2 | 0.25 / 0.30 | 0.50 / 0.63 | 0.74 / 0.95 |
| Black alder, clump | 0.25 | 0.28 / 0.30 | 0.49 / 0.53 | 0.71 / 0.85 |
| Weeping willow, forked | 0.5 | 0.59 / 0.65 | 1.32 / 1.87 | 2.36 / 3.33 |
| Eucalyptus, forked | 0.4 | 0.41 / 0.41 | 0.39 / 0.39 | 0.37 / 0.37 |
| Eucalyptus, clump | 0.4 | 0.41 / 0.43 | 0.71 / 0.82 | 1.04 / 1.27 |
| Monterey cypress, forked | 0.6 | 0.65 / 0.72 | 1.00 / 2.09 | 1.74 / 2.30 |
| Stone pine, forked (sinuous stem) | 0.55 | 0.73 / 0.81 | 0.84 / 0.97 | 0.88 / 1.04 |
| Coast live oak, forked | 0.5 | 0.54 / 0.65 | 0.81 / 1.31 | 1.87 / 3.95 |
| Coast live oak, clump | 0.5 | 0.60 / 0.64 | 1.19 / 1.26 | 2.00 / 2.81 |
| California sycamore, forked | 0.5 | 0.53 / 0.61 | 0.63 / 1.20 | 1.07 / 1.84 |
| California sycamore, clump | 0.5 | 0.58 / 0.61 | 0.95 / 1.12 | 1.40 / 1.68 |

At 1 m, the stems still lie within 0.1–0.3 m of a single trunk cylinder, and within 0.4 m for the stone pine's sinuous stem. Higher up, they spread to 1–4 m. The willow's, the coast live oak's and the cypress's figures at 2–3 m include their lowest great limbs, because their crowns start at 1–3 m. Measured with `stemsAt(tree, y, 0.3)` (wood at least 0.3 of the trunk's radius). Trees fitted to another size scale these across by their crown radius.

---

## Parameters a grower needs

**Definitions**
- **Leader**: probability or strength of the persistent leader. 1 = strictly excurrent for life; 0 = lost early.
- **Scaff.**: number of main limbs (decurrent) or branches per whorl (whorled conifers, written `w`).
- **θ1/θ2/θ3**: insertion angles in degrees from vertical for branch orders 1–3. Ranges run from the top of the crown to the bottom where they differ.
- **Curve1**: shape of first-order limbs along their length. `up` = keeps ascending; `lvl` = straight level; `arch` = rises, then bends down at the ends; `J` = droops down and out, then turns up at the tip; `kink` = crooked with random elbows; `up-tip` = level, then turned up at the tip. The number is the total bend over the limb in degrees.
- **Tip-up**: back-curve of tips toward vertical (degrees).
- **Phyllo.**: `alt` = spiral 137.5°; `dist` = two-ranked; `opp` = opposite decussate 90°; `whorl` = whorled. Pines are whorls of uninodal shoots unless marked `multi`.
- **Zig**: twig zigzag per node (degrees).
- **Gnarl**: random direction change per metre on orders 1–2 (degrees).
- **Whorls/yr**: number of branch whorls per year of height growth.
- **CR open / wood**: live crown ratio, open-grown / woodland or plantation.
- **r/H open / wood**: crown radius over height. The wood values are `[est.]`; TALLO's measured medians (in "Literature-based r/H by species" above) replace them where the species is in it.
- **Flat**: crown-top flatness from 0 (pointed or round) to 1 (flat table).
- **Pad**: how much foliage gathers into separated clumps or pads, from 0 (uniform skin) to 1 (discrete pads).
- **Droop**: share of terminal twigs hanging below horizontal, from 0 to 1.
- **Twig**: twig fineness from 0 (coarse) to 1 (very fine and dense).

**Status of the values.** Everything in this table is a suggested starting value. Values backed by a source are explained in the species sections. Angles, gnarl, zig, pad and droop are `[est.]` unless stated there.

| Species | Leader | Scaff. | θ1 | θ2 | θ3 | Curve1 | Tip-up | Phyllo. | Zig | Gnarl | Whorls/yr | CR open / wood | r/H open / wood | Flat | Pad | Droop | Twig |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Oak *Q. robur* | 0.2 | 3–6 | 45–90 | 50–80 | 40–70 | kink, lvl-then-up, 40° | 15 | alt (clustered tips) | 15 | 25 | – | 0.85 / 0.40 | 0.50 / 0.18 | 0.3 | 0.6 | 0.1 | 0.4 |
| London plane | 0.5 | 3–6 | 35–55 | 50–75 | 90–130 | arch, 50° | 0 | alt / dist | 25 | 15 | – | 0.70 / 0.50 | 0.38 / 0.17 | 0.2 | 0.3 | 0.4 | 0.3 |
| Eucalyptus globulus | 0.5 | 3–6 | 25–45 | 40–70 | 120–170 | up, 15° | 0 | opp (juv) / alt | 5 | 8 | – | 0.70 / 0.33 | 0.28 / 0.11 | 0.2 | 0.7 | 0.7 | 0.3 |
| Norway spruce | 1.0 | 4–7 w + interwhorl | 55–120 | 60–90 | 150–180 (comb) | J, 30° | 25 | whorl | 0 | 3 | 1 | 0.95 / 0.45 | 0.15 / 0.08 | 0.0 | 0.1 | 0.5 | 0.8 |
| Scots pine | 0.3 (old) | 3–6 w | 40–95 | 50–70 | 50–70 | lvl-then-up (kink), 35° | 30 | whorl | 0 | 12 | 1 | 0.65 / 0.33 | 0.28 / 0.10 | 0.7 | 0.7 | 0.0 | 0.4 |
| Beech | 0.7 | 4–8 | 30–50 (low: 70–100) | 60–85 | 80–95 (flat sprays) | arch (outer), 30° | 10 | dist | 15 | 5 | – | 0.90 / 0.42 | 0.42 / 0.15 | 0.2 | 0.2 | 0.3 | 0.9 |
| Silver birch | 0.7 | 4–8 | 30–50 | 60–90 | 150–180 | arch, 40° | 0 | alt | 15 | 6 | – | 0.70 / 0.40 | 0.25 / 0.12 | 0.1 | 0.2 | 0.8 | 0.95 |
| Black alder | 0.9 | 8–15 (along stem) | 60–80 | 50–70 | 50–70 | lvl, 10° | 5 | alt | 8 | 5 | – | 0.70 / 0.45 | 0.20 / 0.10 | 0.0 | 0.2 | 0.1 | 0.6 |
| Lombardy poplar | 0.6 | 30+ | 10–25 | 15–35 | 20–40 | up (parallel to stem), 10° | 0 | alt | 5 | 3 | – | 0.90 / – | 0.08 / – | 0.0 | 0.1 | 0.0 | 0.6 |
| Weeping willow | 0.1 | 3–6 | 40–45 | 60–90 | 170–180 | arch, 60° | 0 | alt | 5 | 8 | – | 0.90 / – | 0.50 / – | 0.2 | 0.1 | 1.0 | 0.9 |
| Hawthorn | 0.2 | 2–5 (multi-stem) | 45–70 | 50–80 | 40–80 | kink, 40° | 10 | alt | 25 | 30 | – | 0.80 / 0.70 | 0.50 / 0.25 | 0.3 (sheared: 0.6) | 0.4 | 0.1 | 1.0 |
| Gorse (shrub) | 0 | 10–30 stems | 10–40 | 30–60 | 30–60 | up, 10° | 0 | alt | 10 | 15 | – | 1.0 | 0.6–1.0 | 0.3 | 0.3 | 0.0 | 1.0 |
| Sitka spruce | 1.0 | 4–6 w + interwhorl | 70–110 | 60–90 | 90–120 | lvl, slight J, 15° | 15 | whorl | 0 | 3 | 1 | 0.95 / 0.40 | 0.18 / 0.08 | 0.0 | 0.1 | 0.2 | 0.7 |
| Corsican pine | 0.9 | 3–6 w | 50–95 | 50–70 | 50–70 | lvl / up-tip, 15° | 20 | whorl | 0 | 5 | 1 | 0.70 / 0.33 | 0.18 / 0.08 | 0.3 (old: 0.6) | 0.5 | 0.0 | 0.4 |
| Douglas fir | 1.0 | 3–6 w + interwhorl | 60–120 | 60–90 | 120–160 | J, 25° | 20 | whorl | 0 | 5 | 1 | 0.95 / 0.40 | 0.18 / 0.08 | 0.1 (old: 0.6) | 0.3 | 0.4 | 0.7 |
| Western red cedar | 0.9 (old: multi-leader) | irregular, many | 60–130 | 60–90 | 120–160 (sprays) | J, 45° | 35 | alt (irregular) | 0 | 6 | – | 0.95 / 0.50 | 0.20 / 0.10 | 0.0 | 0.2 | 0.6 | 0.9 |
| Monterey cypress (exposed) | 0.1 | 2–5 from near base | 40–95 | 70–95 | 60–90 | kink, lvl-then-flat, 50° | 5 | opp (scale) | 5 | 20 | – | 0.85 / 0.60 | 0.70 / 0.25 | 0.9 | 0.9 | 0.0 | 0.8 |
| Monterey pine | 0.5 | 4–6 per node | 50–90 | 50–70 | 50–70 | up / downcurved, 20° | 20 | whorl, multi | 0 | 10 | 2–5 | 0.75 / 0.15 | 0.38 / 0.12 | 0.5 | 0.5 | 0.1 | 0.4 |
| Torrey pine | 0.2 | 3–6 | 60–90 | 50–80 | 40–60 | lvl-then-up (candelabra), 50° | 45 | whorl | 0 | 15 | 1 | 0.65 / – | 0.55 / – | 0.5 | 0.9 | 0.0 | 0.1 |
| Aleppo pine | 0.3 | 3–6 | 45–80 | 50–80 | 50–80 | lvl-then-up, 30° | 30 | whorl, multi (young) | 0 | 12 | 1–3 | 0.55 / 0.40 | 0.38 / 0.20 | 0.5 | 0.4 | 0.1 | 0.6 |
| Stone pine | 0.0 | 3–8 | 30–60 | 40–70 | 40–70 | up, flaring to level top, 25° | 40 | whorl | 0 | 6 | 1 | 0.35 / 0.35 | 0.50 / 0.35 | 1.0 | 0.4 | 0.0 | 0.5 |
| Canary date palm | 1.0 (single axis) | 60–150 leaves | 0–130 (leaves) | leaflets 45 to rachis | – | arch (rachis), 60° | 0 | spiral | – | 0 | – | crown only | 0.45 | 0.0 | 0.0 | 0.4 | – |
| Mexican fan palm | 1.0 | 20–40 green leaves + skirt | 20–60 (leaves) | – | – | petiole straight, blade droops | 0 | spiral | – | 0 | – | top 2 m green | 0.08 | 0.0 | 0.0 | 0.3 (skirt 1.0) | – |
| California fan palm | 1.0 | 25–40 green leaves (coast 10–20) + skirt | 5–110 (leaves) | – | – | petiole straight, blade tips droop, white threads | 0 | spiral | – | 0 | – | top 2–3 m green | 0.23 | 0.0 | 0.0 | 0.3 (skirt 1.0) | – |
| Queen palm | 1.0 | 7–25 leaves (about 15) | 5–110 (leaves) | leaflets in clusters of 2–5, divergent planes | – | arch (rachis), 70° | 0 | spiral | – | 0 | – | crown only | 0.30 | 0.0 | 0.0 | 0.6 | – |
| Coast live oak | 0.1 | 3–8 from 1.2–2.4 m | 60–100 | 50–80 | 50–80 | kink, lvl / reclining, 50° | 10 | alt | 15 | 30 | – | 0.95 / 0.60 | 0.65 / 0.25 | 0.4 | 0.3 | 0.1 | 0.8 |
| California sycamore | 0.2 | 2–6 (often multi-trunk, leaning) | 40–80 | 50–90 | 60–110 | kink, sinuous, 60° | 10 | alt | 25 | 30 | – | 0.65 / 0.45 | 0.40 / 0.25 | 0.2 | 0.5 | 0.2 | 0.3 |
| Sugar maple | 0.5 | 4–8 | 25–45 | 40–60 | 40–60 | up, slight outcurve, 15° | 5 | opp | 0 | 5 | – | 0.85 / 0.33 | 0.40 / 0.15 | 0.1 | 0.1 | 0.1 | 0.8 |
| Northern red oak | 0.5 | 3–6 | 40–60 | 50–70 | 40–70 | up, gentle, 20° | 10 | alt (clustered tips) | 10 | 10 | – | 0.80 / 0.40 | 0.42 / 0.17 | 0.2 | 0.4 | 0.1 | 0.4 |
| Eastern white pine | 0.6 | 3–7 w (about 5) | 40–90 | 60–80 | 60–80 | lvl / up-tip, 20° | 30 | whorl | 0 | 6 | 1 | 0.75 / 0.33 | 0.30 / 0.12 | 0.6 | 0.8 (tiers) | 0.0 | 0.6 |
| White spruce | 1.0 | 4–6 w + interwhorl | 70–115 | 60–90 | 80–110 | slight J, 15° | 20 | whorl | 0 | 3 | 1 | 0.95 / 0.60 | 0.15 / 0.08 | 0.0 | 0.0 | 0.1 | 0.9 |

**Bark parameters to add beside the table.** Each species section gives base and secondary hex colours, pattern type, pattern scale in cm, and how the bark changes with height on the stem.

| Pattern type | Species |
|---|---|
| Smooth | Beech, young birch |
| Exfoliating patches | Plane, California sycamore, eucalyptus ribbons, Scots pine upper stem |
| Checkered plates | Oak, alder, hawthorn |
| Long ridges | Red oak, sugar maple, Douglas fir, white pine |
| Large plates | Stone pine, old Corsican pine, Torrey pine |
| Fibrous strips | Western red cedar, Monterey cypress |
| Scaly | Spruces |
| Lenticel bands with dark diamonds | Birch |
| Leaf-base lattice or rings | Palms |

**Stem-height changes.** These species need a height-dependent bark blend:
- Scots pine: grey plates turning orange flakes from about 30–60 % of stem height.
- Birch: black base over 0.5–3 m, then diamonds, then white.
- Plane and California sycamore: rugged dark base, becoming pale patches and then cream or white higher up.
- Eucalyptus: rough stocking over 1–4 m, then smooth with ribbons.
- Oak and many others: rough trunk, becoming smoother on the upper limbs.

---

## Sources and licences

| Key | Source | What it covered here | URL | Licence |
|---|---|---|---|---|
| EUAT | San-Miguel-Ayanz J. et al. (eds) 2016, *European Atlas of Forest Tree Species*, EU JRC | Beech, Norway spruce, Scots pine, black poplar, Douglas fir, black pine, stone pine, Sitka spruce, *E. globulus*, Aleppo pine, *Salix alba*. The oak, alder and birch chapters are over 10 MB and could not be fetched. No chapters exist for hawthorn, plane, *P. radiata*, *Q. rubra* or *P. strobus*. | https://forest.jrc.ec.europa.eu/en/european-atlas/ (chapters at `.../media/atlas/<Species>.pdf` or `ies-ows.jrc.ec.europa.eu/efdac/download/Atlas/pdf/`) | Open access. Reported as CC BY 4.0, but the copyright notice was not opened here; EC reuse policy (Decision 2011/833/EU) allows reuse with acknowledgement. Photos carry their own CC-BY credits. |
| SILV | Burns & Honkala 1990, *Silvics of North America*, USDA Agric. Handbook 654 | Red oak (Sander) and sugar maple (Godman et al.): forest versus open form, forking, champion size. The srs.fs.usda.gov host did not resolve, so the Virginia Tech mirror was used. | https://dendro.cnre.vt.edu/DENDROLOGY/USDAFSSilvics/38.pdf, `/2.pdf` | Public domain (US Government work) |
| FEIS | USDA Forest Service Fire Effects Information System species reviews | Coast live oak (open versus stand form), Monterey pine, sugar maple, red oak, white pine (two-thirds clear bole), white spruce, Douglas fir (crown base 20–40 m, self-pruning rates), Sitka spruce, California fan palm (Howard 1992, *wasfil*: size, skirt, fire); coast live oak's multiple stems and root-crown sprouting; *E. globulus* (*eucglo*) sprouting from stumps and lignotuber. The *plarac* and *thupla* pages returned 404. | https://research.fs.usda.gov/feis/species-reviews/<code> | Public domain (US Government work) |
| GDB | Earle C.J., *The Gymnosperm Database* | All conifers: sizes, crown, branching, needles, cones, bark | https://conifers.org/ | Free to read, © C.J. Earle. Reuse terms not checked; cite, do not copy text. |
| TSO | *Trees and Shrubs Online* (International Dendrology Society; incl. Bean) | Oak, London plane, beech, alder, weeping willow, Lombardy poplar, California sycamore; forks and multiple stems (oak's recorded boles, alder's multi-stemmed trees and stools, *S. babylonica*'s low-branching trunk, *E. camaldulensis* multistemmed on frosty sites) | https://www.treesandshrubsonline.org/ | Free to read, © IDS. Cite; do not copy text. |
| WT | Woodland Trust species pages | Hawthorn, silver birch. The gorse page returned 404. | https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/ | Free to read, © Woodland Trust |
| NRCAN | Natural Resources Canada, *Trees, insects and diseases of Canada's forests* | Eastern white pine (#50), sugar maple (#86) | https://tidcf.nrcan.gc.ca/en/trees/factsheet/50, `/86` | Crown copyright (Canada). Free to read; reproduction terms not checked. |
| VT | Virginia Tech Dendrology factsheets | Coast live oak (#548), California sycamore (#473), red oak (#38), sugar maple (#2), California fan palm (#598), queen palm (#899) | https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=<n> | Free to read, © Virginia Tech |
| EUCLID | *EUCLID: Eucalypts of Australia* (CSIRO, Lucidcentral) | *E. globulus* height, bark, juvenile and adult leaves | https://apps.lucidcentral.org/euclid/text/entities/eucalyptus_globulus_subsp._globulus.htm | Free to read, © CSIRO |
| SMM | Prigge B.A. & Gibson A.C., Flora of the Santa Monica Mountains descriptions (UCLA) | *Washingtonia robusta*, *Phoenix canariensis*: full morphology | https://www.smmflowers.org/bloom/ANF-descriptions/Washingtonia_robusta_UCLA_SantaMonicas.pdf (and Phoenix_canariensis_…) | Free to read; licence not stated |
| HEM | Hemery, Savill & Pryor 2005, *For. Ecol. Manage.* 215:285–294, via the co-author's blog table | Open-grown crown diameter versus dbh for oak, beech, birch, poplar and others | https://gabrielhemery.com/how-big-will-this-tree-grow | Paper © Elsevier; blog free to read |
| TALLO | Jucker T. et al. 2022, *Global Change Biology* 28:5254–5268; dataset Zenodo 10.5281/zenodo.6637599 (also github.com/selva-lab-repo/TALLO) | Biome medians of H and CR; column list; per-species medians of crown radius over height by height band, computed from Tallo.csv. | https://doi.org/10.5281/zenodo.6637599 | CC BY 4.0 |
| BC2007 | Barthélémy & Caraglio 2007, *Annals of Botany* 99:375 | Sympodial *Platanus*, monopodial *Acer*; definitions of the architectural models | https://pmc.ncbi.nlm.nih.gov/articles/PMC2802949 | Open access (OUP); check the article licence before copying |
| EUCOP | Nicolescu V.-N. et al. 2018, *Silvicultural guidelines for European coppice forests* (EuroCoppice, COST Action FP1301) | Birch coppice rotations (6–12 years; best re-sprouting under 20), black alder sprouting to about 40 years on rotations to 60 | https://www.eurocoppice.uni-freiburg.de/intern/coppiceineurope-volume/coppiceforestsineurope-2-1-nicolescu-silvicultural-guidelines-sept2018.pdf | Open access; licence not checked |
| ANBG | Australian National Botanic Gardens, *Eucalyptus camaldulensis* (Water for a Healthy Country pages) | Single-stemmed and large-boled; straight-trunked in dense regeneration, more gnarled when isolated; no lignotuber | https://www.anbg.gov.au/cpbr/WfHC/Eucalyptus-camaldulensis/ | © Commonwealth of Australia; free to read |
| UFMC | Gilman E.F. et al., *Hesperocyparis macrocarpa: Monterey Cypress*, UF/IFAS ENH383 (EDIS ST224), revised 2024 | Landscape form: "typically one trunk", columnar to pyramidal, spreading with age | https://ask.ifas.ufl.edu/publication/ST224 | As UFWF |
| UFSB | Gilman E.F. et al., *Salix babylonica: Weeping Willow*, UF/IFAS ENH-734 (EDIS ST576) | Size; to be trained to a single leader for "a strong, central trunk" | https://ask.ifas.ufl.edu/publication/ST576 | As UFWF |
| SG71 / BESK | *Silvae Genetica* 20(5–6) 1971; *Beskydy* 2015 (Mendel Univ.) | Norway spruce branching types (comb, brush, plate) and their frequencies (search summaries only) | https://www.thuenen.de/media/institute/fg/PDF/Silvae_Genetica/1971/Vol._20_Heft_5-6/20_5-6_204.pdf ; https://beskydy.mendelu.cz/media/pdf/beskyd_2015008010009.pdf | Journal terms; not checked |
| UFWF | Gilman E.F., Watson D.G., Klein R.W. & Hilbert D.R., *Washingtonia filifera: Desert Palm*, UF/IFAS ENH-826 (EDIS ST669), revised April 2024 | Height, spread, crown, leaf type and colour, petticoat skirt, fire hazard, removal by law | https://ask.ifas.ufl.edu/publication/ST669 | Free to read, © UF/IFAS. No licence stated in the copy read; ENH1182 from the same series is CC BY-NC-ND 4.0. |
| UFQP | Broschat T.K., Klein R.W. & Hilbert D.R., *Syagrus romanzoffiana: Queen Palm*, UF/IFAS ENH-767 (EDIS ST609), revised March 2024 | Height, spread, trunk diameter, not self-cleaning, fruit, pruning cautions | https://ask.ifas.ufl.edu/publication/ST609 | As UFWF |
| UFMF | Broschat T.K., Klein R.W. & Hilbert D.R., *Washingtonia robusta: Mexican Fan Palm*, UF/IFAS ENH-827 (EDIS ST670), revised April 2024 | Leaf count, leaf width, petiole length, trunk colour and taper, skirt shedding | https://ask.ifas.ufl.edu/publication/ST670 | As UFWF |
| COURSE | Couch Golf Club's courses, measured in the game on 2026-11-25 (library a66c411): p10, p50 and p90 of each tree's lidar height, crown radius and crown base by species on the first holes of Riviera (c01), Torrey Pines (c03) and Walton Heath (c05) | The sizes the game fits trees to (lab/courseSizes.ts) | not public | the game's own data |
| UFPC | Broschat T.K., *Phoenix canariensis: Canary Island Date Palm*, UF/IFAS ENH-598 (EDIS ST439), revised 2013 | Leaf count (130–150), leaf production, pineapple cut discouraged | https://ask.ifas.ufl.edu/publication/ST439 | As UFWF |
| UFNA | Broschat T.K. & Elliott M.L., *Normal "Abnormalities" in Palms*, UF/IFAS ENH1077 (EDIS EP344), revised 2013 | *Washingtonia* skirt and leaf-base retention and shedding; booted versus smooth trunks | https://ask.ifas.ufl.edu/publication/EP344 | As UFWF |
| UFPP | Broschat T.K., *Pruning Palms*, UF/IFAS ENH1182 (EDIS EP443), 2011, revised May 2014, doi:10.32473/EDIS-EP443-2011 | Proper canopy, pineapple and hurricane cuts, ANSI A300 9:00–3:00 rule, skirts and wildlife, leaf counts and leaf production table, wounding | https://ask.ifas.ufl.edu/publication/EP443 | CC BY-NC-ND 4.0 (stated in the PDF), © UF/IFAS |
| HOD14 | Hodel D.R. 2014, *Washingtonia × filibusta* (Arecaceae: Coryphoideae), a new hybrid from cultivation, *Phytoneuron* 2014-68: 1–7 | Side-by-side table of *W. filifera*, hybrid and *W. robusta*: trunk height and dbh, base flare, canopy, leaf colour, leaf length; hybrid leaf dimensions | https://www.phytoneuron.net/2014Phytoneuron/68PhytoN-Washingtoniahybrid.pdf | Open access; photographs © D.R. Hodel; reuse terms not checked |
| HODGC | Hodel D.R., *General Care and Maintenance of Palms*, UC Cooperative Extension, Los Angeles County (undated handout) | Pruning limit "up to the horizontal … from 3 to 9 o'clock", against trunk skinning and ball shaping | https://ucanr.edu/sites/default/files/2010-07/29078.pdf | Free to read, © UC Regents; licence not stated |
| IPMPN | Hodel D.R. 2019, *UC IPM Pest Notes: Palm Diseases in the Landscape*, UC ANR Publication 74148 | Definition of the "pineapple", skinned or peeled trunks and sudden crown drop, diamond scale on California fan palm | https://ipm.ucanr.edu/legacy_assets/pdf/pestnotes/pnpalmdiseases.pdf | Free to read, © UC Regents; reuse terms not checked |
| PHX | Adkins R. van-C., *Palm Maintenance in Historic Districts*, City of Phoenix Historic Preservation Office, 2009 | 45° above horizontal pruning limit for fan palms, keeping the petiole bases ("peel") | https://www.phoenix.gov/pddsite/Documents/HP/pdd_hp_pdf_00070.pdf | Municipal publication; licence not stated |
| NOB17 | Noblick L.R. 2017, A revision of the genus *Syagrus* (Arecaceae), *Phytotaxa* 294(1) (species 52; journal pp. 181–182 in the page footers, cited by Plazi as pp. 448–450) | Full description of *S. romanzoffiana*: stem, leaf count, sheath, pseudopetiole and rachis lengths, leaflet numbers, clusters and planes | https://doi.org/10.11646/phytotaxa.294.1.1 ; read via https://tb.plazi.org/GgServer/xhtml/03A087ABFF15BDE50AECF89A05C2F7C3 | Paper © Magnolia Press; Plazi treatment text is offered as open data, but the licence for this treatment was not checked |
| BBNE | Frew J., Botany Brisbane, *Syagrus romanzoffiana* page | Height, trunk, rings, 10–25 leaves, leaf length, leaflets in groups of 2–7 in several planes, drooping tips, persistent dead leaves | https://www.botanybrisbane.com/?p=16512 | © 2026 J. Frew; no licence stated. Read through a summarising fetch, not raw text. |
| SEINET | NEON Biorepository (Symbiota/SEINet portal) taxon page for *W. filifera*, carrying Zona in *Flora of North America* vol. 22, Mason 1999 (*J. Ariz.-Nev. Acad. Sci.* 32(1)) and Simono 2014 | Trunk size, petiole spines, blade length, 40–60 segments split nearly to the middle, thread-like fibres, grey-green blades, native range | https://biorepo.neonscience.org/portal/taxa/index.php?taxon=8529 | Descriptions © their authors; portal terms not checked. The FNA excerpt is garbled on the page. |
| WPWF | Wikipedia, *Washingtonia filifera* | Trunk 0.3–0.6 m, skirt to the full trunk length, white threads ("cotton palm"), grey-blue-green leaves, blunt petiole teeth, fire resistance | https://en.wikipedia.org/wiki/Washingtonia_filifera | CC BY-SA 4.0. Read through a summarising fetch; treat as a lead where it is the only source. |

**Not reached**
- **Jepson eFlora**: the connection was refused from this machine (again on the palm pass, for *W. filifera*).
- **Flora of North America** (floranorthamerica.org, efloras.org), **Calscape**, **Palmpedia**, **PalmWeb**, the USDA Woody Plant Seed Manual and the ISA "Pruning Palms" brochure copies: blocked by bot checks or 403 errors during the palm pass. The FNA text for *W. filifera* was read only as an excerpt on the SEINet portal.
- **Cal Poly SelecTree**: the pages are JavaScript-only and returned no text.
- **UK Forest Research species pages**: not fetched.

The Californian species therefore rest on GDB, FEIS, VT, SMM and EUCLID. A follow-up pass on Jepson (Torrey pine, Monterey cypress and pine, coast live oak, California sycamore, *Washingtonia*) would be worthwhile.

**Secondary snippets.** Statements marked "secondary" or "search summary" come from search-engine summaries of pages I did not open (Wikipedia, UF/IFAS, NC State, BSBI Fermanagh, Burren flora, NZ flora, RBG Victoria, Sunset). Treat them as leads, not citations.
