# Juniper Bay — a town remembered

**An explorable, living 1953 New England harbour town, built entirely from voxels.**
It is Saturday, September 26, 1953 — the town's **Centennial "Harbor Days"** — and everybody in
Juniper Bay has somewhere to be.

Walk its streets in first person (or third), duck into any building, and watch the day unfold:
the fishing fleet coming in at six, the ovens at Halloran & Sons, a wedding at St. Brigid's, a
seven-year-old's birthday party on Maple Street, choir practice at First Congregational, the
Mayor's centennial address and time capsule at 5:30, a family eating supper in front of their
brand-new television, a welcome-home supper for a boy back from Korea, a sock hop, a street dance,
jazz at the Blue Lantern, and fireworks over the harbour at nine.

## Play it online

**▶ https://lachyc123.github.io/Voxelworld/** — opens straight in the browser, nothing to install.
(Served by GitHub Pages from the `claude/voxel-city-exploration-1wpfo7` branch; every push updates it
within a minute or two.)

## Running it locally

It's plain ES modules + Three.js (vendored) — no build step.

```bash
npm start            # zero-dependency static server → http://localhost:8080
# or any static server, e.g.  npx http-server .   /   python3 -m http.server
```

Open the page in a desktop browser (Chrome, Edge, Firefox, Safari). The town is generated and
meshed on load (a few seconds; worker threads do the meshing). Click **Step off the train**.

### Controls

| | |
|---|---|
| **W A S D** | walk (Shift to hurry, Space to hop) |
| **Mouse** | look about — click the view to capture the mouse, or drag |
| **E** | tip your hat · chat (press again to hear their story) · read plaques · sit |
| **V** | first / third person |
| **F** | aerial view (Q/E or Space/Ctrl to rise & sink, scroll for speed; F again to land there) |
| **M** | town map & *What's On* — click an event or anywhere on the map to go there |
| **J** | the Almanac: a hundred years of town history, families, institutions, streets |
| **N** | today's *Juniper Bay Courier* |
| **P / [ / ]** | pause time · slower · faster (1× real time, 60× = a minute a second) |
| **`** | performance stats |

The time slider (top-left) scrubs the clock; everyone in town is exactly where their day says
they should be at that moment, so you can jump to 6 a.m. and watch the fleet come in, or to
6 p.m. and look in on supper.

## What's in the town

* **~170 buildings, every one enterable** — houses of every style, brownstones, shops of 30+
  trades, a diner car, the Trust Building with the WJBY radio mast, City Hall, two churches, the
  Carnegie library, the high school, St. Luke's Hospital, Engine Company No. 1, Union Station with
  its arched train shed, the cannery, the waterfront sheds, piers, a cargo ship, Whitcomb Point
  Light, the beach and boardwalk, Juniper Park and the Old Burying Ground.
* **~500 townsfolk with names, ages, families, jobs, homes and a full day's schedule.** They walk
  the sidewalks and cross at the crosswalks, go to work, run errands, eat supper together, go out,
  and go to bed. Named people have real stories — tip your hat and ask.
* **History everywhere**: cornerstones and founding dates, bronze plaques, the 1938 hurricane
  high-water marks, the MARY ELLEN memorial, honour rolls, ghost signs, the time capsule — all
  from one consistent century of lore (`src/city/lore.js`).
* **A working town**: traffic with signals, the Lantern Avenue trolley, scheduled trains into Union
  Station, boats in the bay, pigeons that scatter, gulls over the piers, lamps and windows lighting
  up at dusk, TVs flickering blue in parlours, a procedural soundscape (bells on the hour, the
  choir, the band, the jazz quartet, the crowd, the sea).

## How it works (for the curious)

* `src/world/` — the voxel world is a list of box/model *brushes* at 0.25 m resolution. Chunks
  (32³) are rasterised and **greedy-meshed with ambient occlusion in Web Workers**, merged into
  32 m render regions. Materials carry procedural per-voxel surface patterns (brick courses,
  clapboard, shingles, planks, tiles…) evaluated in the shader.
* `src/render/` — custom shaders: sun + manual PCF shadow map, sky hemisphere, per-room lamp
  lighting (a room-id data texture), nearby point lights, emissive signs, fog, sky, water, clouds,
  terraced hills, fireworks.
* `src/props/` — small detailed voxel models (furniture, cars, hats…) drawn with instancing and
  distance culling.
* `src/people/` — box-people with palette-swapped pixel-art faces and outfits, fully instanced.
* `src/sim/` — clock, navigation graph, spots, the population & schedule planner, the events of
  the day, dialogue, room lights, doors, birds.
* `src/city/` — the town plan, streets, and the building generators (`src/city/gen/`).

Docs for adding to the town: `docs/BUILDINGS.md` and `docs/PROPS.md`.
Headless screenshots for testing: `node tools/shot.mjs "goto=Harbor Light Diner&t=740" out.png`.
