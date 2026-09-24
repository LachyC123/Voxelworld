# Prop authoring guide — Juniper Bay

Juniper Bay is a 1953 New England harbour town rendered in voxels (Three.js, plain ES modules,
no build step). "Props" are small, finely detailed voxel models (furniture, lamps, cars, hats…)
drawn with GPU instancing. The big architecture (walls, floors, roads) is a separate, coarser
voxel grid (0.25 m voxels) — props sit inside/on top of it.

## Defining a prop

```js
import { defineProp, lampLight } from '../props.js';

defineProp('chair_wood', {
  size: [8, 15, 8],            // model grid size in voxels [x, y, z]
  scale: 1 / 16,               // metres per voxel (default 1/16 → 16 voxels = 1 m)
  origin: [4, 0, 4],           // pivot in voxel units (default: bottom-centre [sx/2, 0, sz/2])
  collide: [0.4, 0.45, 0.4],   // optional: player collision box [w, h, d] metres (or true = model bounds)
  cat: 'interior',             // optional render category: 'interior' | 'exterior' | 'far' (auto by room otherwise)
  light: lampLight(0, 0.55, 0, [1, 0.78, 0.5], 4.5, 'room'), // optional point light (metres rel. to origin)
  build(m) { /* draw into the VoxModel m */ },
});
```

* **Orientation:** the prop's FRONT faces **+z** (a chair's sitter looks toward +z; a TV screen faces
  +z; a car drives toward +z; a shop counter's customer side is +z). **y is up.** Origin at the
  bottom centre so the prop stands on the floor.
* **Scale:** 1 voxel = 1/16 m by default. A 0.45 m chair seat is ~7 voxels high; a 0.75 m table top is
  12 voxels; a door is 35 voxels (2.2 m). Big things may use a coarser scale (e.g. `scale: 1/8` for
  a 10 m ship or a tree) — keep the look consistent.
* **Light modes:** `'night'` (street lamps: on when dark), `'room'` (follows the room's lamps),
  `'always'`. Radius in metres. Use sparingly — only for real light sources.
* `cat: 'far'` for props that must stay visible from far away (trees, boats, water towers, big
  vehicles). Default categories: inside a room → interior (only drawn within ~50 m), outside → exterior (~180 m).

## The VoxModel drawing API (`m`)

Coordinates are integer voxel coords inside the grid (0 … size-1). Out-of-range writes are ignored.

| call | does |
|---|---|
| `m.box(x, y, z, w, h, d, col)` | filled box |
| `m.set(x, y, z, col)` | one voxel |
| `m.clear(x, y, z, w, h, d)` | erase to empty |
| `m.cyl(cx, y, cz, r, h, col)` | vertical cylinder centred at (cx, cz) (use .5 centres for even widths) |
| `m.cylX(x, cy, cz, r, len, col)` / `m.cylZ(cx, cy, z, r, len, col)` | horizontal cylinders |
| `m.sphere(cx, cy, cz, r, col, keep?)` | sphere; optional `keep(x,y,z)` filter |
| `m.text(str, x, y, z, col, {font:'small'|'big', scale, align:'center'})` | pixel text on a plane facing +z, reading +x (small font = 3×5 px per glyph) |
| `m.textBack(str, x, y, z, col, o)` | same text reading correctly when seen from −z |
| `m.mirrorX()` | copy the left half onto the right half |

**Colours** (`col`):
* `'#rrggbb'` — a fixed colour.
* `{ c: '#rrggbb', emit: 0.9 }` — glowing (lamp glass, dials, neon, TV screens). emit ≥ 0.98 = always on
  (fire, a running TV); lower values glow only at night (street lamps, windows, signs).
* `{ tint: 1, shade: 0.5 }` / `{ tint: 2, shade: 0.5 }` — per-instance recolourable (tint A / tint B).
  `shade` 0.5 = exactly the tint colour; 0.4 darker, 0.6 lighter. Use tints for car paint, sofa fabric,
  quilts, dresses on racks, hat colours, etc. The placer supplies `{ tint: '#hex', tint2: '#hex' }`.

## Style & quality bar

* Think **1953 small-town America**: rounded fenders, chrome, enamel, Bakelite, walnut radio
  cabinets, gingham, chenille bedspreads, milk glass, cast iron, brass, painted wood, striped awnings.
* Warm, slightly muted palette. Add small details that reward a close look: knobs, handles, trim
  lines, a book lying open, a folded newspaper, a doily, labels on cans (a few pixels), a pie
  lattice, the dial on a radio.
* **Keep triangle counts sane.** The mesher merges touching faces of the same colour, so large
  same-colour areas are cheap. Avoid per-voxel random colours over big areas (they explode into
  thousands of quads); use 2–4 shades placed in patterns/stripes instead. Typical small prop:
  under ~400 faces; big/rare props (piano, printing press, fire engine): under ~3000.
* Props shouldn't include a floor or walls.
* Names are **snake_case**, stable, and exactly those listed in your assignment (the city code
  places them by name). You may add extra props with new names.

## Checking your work

A viewer renders any subset of props with labels. From the repo root:

```bash
PAGE=propview.html node tools/shot.mjs "filter=chair,sofa&cols=6" /path/to/out.png 400
# params: filter=comma,separated,substrings  cols=N  yaw=radians  t=minutes(720=noon, 1260=9pm)  dist=zoom(0.5 = closer)  tint=%23hex
```

Then look at the PNG with the Read tool. Check scale against `chair_wood` (0.45 m seat) and
`door_wood` (2.2 m). Look closer with `dist=0.4`. A JS error prints as `[pageerror]` — fix it.
Don't edit files you weren't assigned; everything you need is `defineProp` + the `m` API.
