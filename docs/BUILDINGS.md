# Building & site generator guide — Juniper Bay

Juniper Bay is a living 1953 New England harbour town (Saturday, September 26, 1953 — the town's
Centennial "Harbor Days"). The player walks around in first person and **every building can be
entered and explored**. People live, work and attend events inside. Your generators build that.
Read `src/city/lore.js` (the town's history — use it!), `src/city/layout.js` (the plan: every lot,
its size, facing and spec), `src/city/gen/common.js` (helpers) and `src/city/gen/residential.js`
(a complete reference generator: shell, floors, rooms, doors, stairs, windows, furniture, spots, home).

## Units & coordinates

* World voxels are **0.25 m** (4 per metre). The architecture is made of voxel boxes ("brushes");
  later brushes overwrite earlier ones; material `0` carves air.
* A generator works in a **local Frame** (`b.f`): `x` runs along the street frontage to the RIGHT as
  seen from the street, `y` is up, `z` goes INTO the lot away from the street. The front property
  line is `z = 0`; the lot is `lot.w` wide (x) and `lot.d` deep (z), in voxels.
* The sidewalk surface is at local `y = 0` bottom (world 0.25 m). Put the **ground-floor slab at
  local y = 0**; the first air layer (room floor level) is **y = 1**. Yards/lawns: set local
  `y = -1` to grass etc. (it's the ground layer) — people stand at y = 0 outdoors.
* Typical storey: floor slab 1 voxel + 11–13 air (houses 12 floor-to-floor, shops/offices 13–14).
  Doors 4 wide × 9 high. Windows ~3–4 wide × 5–7 high. Exterior walls 2 voxels (outer material +
  interior finish layer) — see `shell()`.
* Continuous coordinates (props, spots, nav points) use the same local voxel units but may be
  fractional (e.g. `x = 10.5`).

## Generator signature

```js
// in your module (e.g. src/city/gen/civic.js)
import { Building } from '../building.js';
import { MAT, shell, win, ... } from './common.js';
import { linkToSidewalk } from '../streets.js';
export function register(GEN, SITES) {
  GEN.library = buildLibrary;                              // lot kinds from layout.js
  SITES.push({ name: 'the harbour', order: 10, build(ctx) { ... } }); // area builders (order < 50 run before lots)
}
function buildLibrary(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name, kind: spec.kind, lot, address: lot.address, established: spec.est, lore: '…', hours: [9*60, 17*60] });
  const f = b.f;          // the Frame
  const rng = ctx.rng.fork('lib' + lot.x);
  ...
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);   // ALWAYS link entrances to the street network
  return b;
}
```
`lot = { x, z (world voxel min corner), w, d (local frontage & depth), facing, y: 1, m: {x0,z0,x1,z1} metres, street, number, address }`.
`spec` is the object from `layout.js` (`name`, `est`, `family`, `special`, `floors`, …). Handle ANY lot size
gracefully (derive everything from `lot.w`/`lot.d`). Use `rng` forks for variety — deterministic!

## Frame API (`f = b.f`, all local voxel coords)
* `f.box(x, y, z, sx, sy, sz, MAT.name)` — solid box (min corner + size). `f.carve(...)` = air.
* `f.walls(x, y, z, sx, sy, sz, mat, t=1)` — hollow rectangle of walls.
* `f.text(str, x, y, z, mat, {scale, depth, font:'big'|'small', align:'left'|'center'|'right'})` — raised
  pixel letters on the plane facing the street (x = left/centre, y = bottom, z = the layer). Big font: 5×7 px.
  At scale 1 a letter is 1.25 m × 1.75 m (shop signs). Use `font:'small'` (3×5) for smaller signage.
* `f.textWidth(str, scale, font)`.
* Shapes: `f.cylinder(cx, y, cz, r, h, mat, hollowT)`, `f.dome(cx, y, cz, r, mat, {heightScale, hollow})`,
  `f.sphere(cx, cy, cz, r, mat)`, `f.gable(x, y, z, sx, sz, mat, {axis:'x'|'z', overhang, gableMat, rise})` (stepped
  gable roof; returns its height), `f.hip(x, y, z, sx, sz, mat, {overhang, rise, fill})`, `f.archCarve(x, y, z, w, h, depth, mat=0)`.
* `f.faceFrame('left'|'right'|'back')` → a Frame for the same lot whose "front" is that side (for side-wall windows,
  signs painted on side walls, etc.). In the left frame, the lot's left edge is z = 0.
* `f.sub(dx, dy, dz, W, D)` — translated sub-frame. `f.prop(...)`, `f.light(...)` — see Building.

## Building API (`b`)
* `b.room(name, x, y, z, sx, sy, sz, {kind, lightMode:'auto'|'always'|'night'|'never'|'day', lightColor:[r,g,b], lightPower, ambient, nav:[x,z], public})`
  → room id. The box is the AIR volume of the room (floor level y). Rooms light the interior, name the location label
  ("Carnegie Library — Reading Room"), and hold a nav centre node. EVERY enclosed space the player can reach
  should be a room (hallways, stairwells, closets you can walk into). `lightMode:'always'` for shops/public halls in
  business hours (uses `hours`), `'auto'` = lit when occupied at dusk. `ambient` = sky light leaking in (0.35 default; porches 0.8).
* `b.door(roomA, roomB, x, y, z, {axis:'x'|'z', leaf:'door_wood'|'door_glass'|false, width:4, tint})` — a doorway
  between rooms at (x, z) = centre of the opening, y = floor. axis 'x' = the wall runs along x. Carve the opening
  yourself (the helpers `partitionX/Z` leave gaps). Leaves swing open automatically when someone approaches.
* `b.entrance(room, x, y, z, {outZ, outX, leaf, tint, main})` — an exterior door on the facade plane z; creates the
  street-side nav node at `outZ` (default z − 5, i.e. on the sidewalk). Call `linkToSidewalk(ctx, e.node)` for each.
* `b.stairs(roomA, [x,y,z] bottom, roomB, [x,y,z] top)` — nav link for a staircase you built (`stairs()` helper builds
  the steps and carves headroom). Every upper floor must be reachable by stairs. Step height is 1 voxel, the player
  climbs automatically. Keep flights 4 wide, run 2.
* `b.navPoint(room, x, y, z, [links])` — extra waypoint (large halls, going around obstacles, yards).
* `b.spot(pose, x, y, z, rot, {room, act, tags:[], seat, label, held, lines})` — a place where a person can be.
  pose: `'stand'|'sit'|'sleep'|'kneel'`. rot = local quarter turns the person FACES (0 = toward the street/−z,
  1 = +x, 2 = +z/back, 3 = −x). `seat` = seat height in metres for sit (chairs 0.45, stools 0.7, beds 0.55).
  `act` = default activity (see `src/sim/activities.js`: sit, eat, read, type, write, counter, cook, wash, sweep,
  serve, bartend, haircut, sing, organ, piano, conduct, pray, listen_sit, watch, drink, browse, talk, pace, play,
  fish, chess, cards, bowl, dance, trumpet, drum…). Tags connect spots to jobs, households and events (below).
* `b.seat(chairType, x, y, z, rot, o)` — chair prop + sit spot in one go.
* `b.job(role, spot | [spots], {shift:['8:00','17:00'], title, act, outfit, sex, days:'weekday'})` — a workplace position.
  The population fills every job; with several spots the worker moves between them. outfit ∈ police, fire, mail, cook,
  waitress, nurse, doctor, clergy, sailor, fisherman, dock, mechanic, barber, milkman, band, conductor, shopkeeper,
  clerk, bellhop, farmer, painter. `days:'weekday'` = not working today (Saturday).
* `b.home({family, beds:[spots], dine, lounge, kitchen, bath, yard, porch, desk, special})` — a household.
* `b.prop(type, x, y, z, rot, {tint:'#hex', tint2:'#hex', scale})` — place a prop (bottom-centre at x,y,z; its
  front faces local direction `rot` as above). Props are listed in the "Props" section below.
* `b.light(x, y, z, {color:[r,g,b], radius, mode:'night'|'always'|'room', room})` — point light (porch lamps, signs).
* `b.readable(x, y, z, {title, body} | {title, html}, {prompt, r})` — something the player can press E to read
  (plaques, cornerstones, notices, letters, framed articles, honour rolls, menus). **Use these generously; this is
  how the town's history reaches the player.**
* `b.playerSeat(x, y, z, rot, h)` — the player can press E to sit (benches, pews, stools).
* `b.elevator(x, z, [{ y, room, label }, …])` — an elevator cab at local (x, z) stopping at each floor y. The player
  presses E in the cab to ride to the next stop; people use it as a vertical nav link. Use it in tall buildings.

## common.js helpers
`shell, slab, partitionX, partitionZ, roomTrim, win, winRow, doorway, stairs, cornice, beltCourse, pilaster, quoins,
awning, fireEscape, chimney, flatRoof, bigSign, smallSign, ghostSign, cornerstone, storefront, diningSet, parlour,
kitchenRun, bedroom, bathroom, officeDesk, counterRun, shelves`. Read the file — each has a comment. Add your own
private helpers in your module (don't edit common.js; if you really need a shared change, write it in your own file).

## Materials (`MAT.name`)
See `src/world/materials.js` — bricks (brick_red/dark/brown/orange/yellow/white), stone (limestone, sandstone,
granite, marble, art_deco_cream/gold), stucco_*, siding_* (clapboard), roofs (roof_tar, roof_shingle_*, roof_copper,
roof_slate, roof_tile_red, roof_teal_tile), trims (trim_white/cream/green/dark/red/blue/teal/gold/black), iron, steel,
wood_*, awnings (awning_* striped, awning_solid_*), sign_* colours, lights (bulb_warm, lamp_glass, neon_*,
marquee_bulbs, clock_face, window_lit), glass (glass, glass_shop, glass_dark, glass_stained_red/blue/gold/green/purple),
interiors (plaster_*, wallpaper_*, wood_panel*, floor_* incl. checker/bigcheck/terrazzo/marble/linoleum, carpet_*,
rug_oriental, tile_*, chalkboard, stage_wood, velvet_*, gym_floor, bowling_lane, bar_top, chrome, counter_*, stainless,
enamel_*), nature (grass, grass_lawn, hedge, flowerbed_*, leaves_*, bark, rock, sand, water (fountains), pumpkin, hay).
Glass/water are transparent. Emissive materials glow (neon flickers at night, marquee bulbs chase).

## Props
Props are detailed voxel models placed with `b.prop(name, …)`. Names available (being built in parallel — use these
exact names; missing ones are skipped with a console warning, so it's safe):
* Furniture/household: chair_wood, chair_kitchen, chair_office, chair_folding, armchair, sofa, loveseat, rocking_chair,
  stool_tall, piano_bench, highchair, table_dining, table_kitchen, table_round, table_coffee, table_side, table_card,
  desk_wood, desk_office, writing_desk, sideboard, bed_single, bed_double, crib, cot, bunk_bed, dresser, wardrobe,
  nightstand, bookshelf, bookshelf_low, cabinet_china, filing_cabinet, coat_rack, hat_rack_wall, trunk, toy_chest,
  stove, fridge, kitchen_counter, kitchen_sink, cabinet_upper, icebox, table_setting, food_roast, food_casserole,
  food_pie, food_bread, birthday_cake, coffee_pot, teapot_set, fruit_bowl, vase_flowers, candles_pair, milk_bottles,
  tv_console, radio_console, radio_table, phonograph, piano_upright, lamp_floor, lamp_table, lamp_desk, ceiling_lamp,
  chandelier, clock_grandfather, clock_wall, mirror_wall, painting, portrait, photo_frames, plant_pot, fern_stand,
  rubber_plant, umbrella_stand, magazine_rack, sewing_machine, ironing_board, washing_machine, laundry_basket, rug_oval,
  rug_rect, radiator, wall_telephone, telephone_table, bathtub, toilet, sink_pedestal, towel_rack, medicine_cabinet,
  toy_blocks, toy_train, dollhouse, rocking_horse, teddy_bear, toy_wagon, suitcase, typewriter, telephone, globe_desk,
  books_stack, newspaper_pile, easel, door_wood, door_glass, fire_logs.
* Shops & institutions: counter_shop, display_case, shelf_goods, shelf_bread, shelf_hardware, paint_cans, cash_register,
  scale_grocery, candy_jars, gumball_machine, meat_counter, fish_ice_display, cake_stand, flower_buckets, mannequin,
  dress_rack, shoe_display, hat_display, jewelry_case, sewing_dummy, fabric_bolts, laundry_press, laundry_tubs,
  laundry_bundles, book_rack, record_bins, instrument_wall, radio_display, toy_display, tools_wall, lumber_rack,
  barber_chair, barber_mirror_station, barber_pole, shoeshine_stand, soda_fountain, soda_stool, jukebox,
  pinball_machine, pool_table, bar_counter, bar_back_shelf, beer_taps, bar_stool, diner_booth, diner_counter,
  coffee_urn, pie_display, menu_board, sandwich_board, pew, pulpit, altar, lectern, baptismal_font, hymn_board,
  candle_stand, organ_console, organ_pipes, choir_chair, desk_school, desk_teacher, school_globe, flag_stand,
  classroom_clock, basketball_hoop, trophy_case, lockers, hospital_bed, iv_stand, privacy_screen, wheelchair, bassinet,
  exam_table, nurses_desk, theater_seats (4-seat row), projector, popcorn_machine, ticket_booth, velvet_rope,
  movie_poster, bowling_pins, ball_return, bowling_ball_rack, drum_kit, upright_bass_stand, mic_stand, piano_grand,
  music_stand, club_table, stage_lights, bench_station, ticket_window, luggage_cart, departure_board, hotel_desk,
  bellhop_cart, palm_pot, mail_slots, printing_press, paper_rolls, linotype, newspaper_bundles, radio_console_studio,
  on_air_sign, ship_model_case, figurehead, diving_helmet, harpoons_rack, display_case_museum, anchor_display,
  ships_wheel_wall, bell_brass, steam_pumper, helmet_rack, fire_boots, checkers_table, police_desk, jail_cot,
  wanted_board, police_radio, teller_counter, bank_vault_door, office_water_cooler, adding_machine, safe_small,
  stamp_counter, mail_sorting_rack, po_boxes.
* Outdoors: street_lamp, street_lamp_double, fire_hydrant, mailbox_usps, trash_basket, newspaper_box, parking_meter,
  phone_booth, bus_stop_sign, trolley_stop_sign, bench_park, bench_bus, traffic_signal, street_clock, flag_pole,
  sandwich_board, planter_box, flower_pot, window_box, water_tower (rooftops!), tv_antenna, chimney_pot, laundry_line,
  picket_fence (2 m module along x), iron_fence, fence_gate, mailbox_house, lawn_mower, wheelbarrow, leaf_pile,
  pumpkin, pumpkin_small, hay_bale, scarecrow, bicycle, tricycle, wagon_red, baby_carriage, lemonade_stand, doghouse,
  swing_set, slide, seesaw, sandbox, merry_go_round, picnic_table, bbq_grill, birdbath, bird_feeder, garden_bench,
  sundial, stump, rock_small, rock_big, tree_maple_red, tree_maple_orange, tree_elm_yellow, tree_oak, tree_pine,
  tree_birch, tree_small, tree_apple, bush_round, bush_hedge, crate, crate_stack, barrel, barrel_stack, fish_crate,
  lobster_trap, lobster_trap_stack, buoy, fishing_net_pile, rope_coil, anchor, bollard, dock_cleat, life_ring_post,
  oil_drum, sack_pile, cargo_pallet, rowboat, dory, fishing_boat, lobster_boat, sailboat, tugboat, festival_stall,
  balloon_bunch, popcorn_cart, hot_dog_cart, ice_cream_cart, cotton_candy_cart, ring_toss, pie_table, bunting_fan,
  podium_outdoor, time_capsule, music_stand, band_chair, dog, cat, pigeon, seagull, duck, squirrel, horse.
* Vehicles (static parked, front +z): car_sedan, car_coupe, car_convertible, car_wagon, car_taxi, car_police,
  truck_pickup, truck_delivery, truck_milk, truck_fire, bus_city, streetcar, truck_ice_cream, locomotive, boxcar,
  passenger_car, coal_tender. Tint A = body colour.
* Text signs at prop scale: `import { textSignType } from '../../props/lib/special.js'` then
  `b.prop(textSignType('OPEN', {bg:'#1d1d22', fg:'#e8c870'}), x, y, z, rot)` or use `smallSign()` from common.js.

## Tags the rest of the town relies on (IMPORTANT)
Population and events find places by spot tags. Provide them where they belong:
* Public leisure: `eat_out` (diner/luncheonette/hotel dining seats, act eat), `soda` (soda fountain stools, act drink),
  `bar` (bar stools, act drink), `browse` (shop floor standing spots, act browse), `shop` (customer at counters),
  `bench` (park & square benches, act sit), `play` (playground/yard play areas for kids, act play/swing),
  `theater` (cinema seats, act watch), `bowling` (lanes, act bowl), `club` (Blue Lantern tables), `club_band` (4 band spots:
  piano stool act 'piano', bass 'bass', drums 'drum_sit', horn 'trumpet').
* Events: church_congregational → `choir` (≥14 standing riser spots, act sing), `choir_director` (1), `organ` (1, sit act
  organ), `pew` (many, act listen_sit). church_catholic → `pew` (many), `altar_priest` (1), `altar_couple` (2 side by
  side facing the altar), `organ`. rectory/parish hall → `reception` (≥24 seats at long tables, act eat),
  `reception_dance` (≥10). square → `fair` (≥60 crowd spots; set `spot.spread = 3` metres for loose crowds), `fair_kids`,
  `stall_keeper` (one per stall), `podium` (1, on the City Hall steps/stage), `stage_guest` (4), `band` (8 on the
  bandstand, act trumpet etc.), `crowd_speech` (≥40 facing the podium; `spread`), `dance` (≥30, spread), `time_capsule`.
  school → `sockhop` (≥20 in the gym, spread). hospital → `waiting` (1 in the waiting room, act pace), `maternity` (1 bed
  in the maternity ward, pose sleep), `nursery_window` (1 standing at the nursery glass). theater → `theater` (≥40).
  newspaper → `press` (≥4). waterfront → `fireworks` (≥50 standing along the quay/beach facing the harbour, spread),
  `dock_work` (≥6 on the fish pier), `fish` (pier fishing, act fish). station → `arrive` (platform standing spots).
  houses with spec.special: `birthday` → `party` (≥10 seats around the table/parlour), `party_yard` (≥10 in the yard),
  `cake` (1 by the table); `cat` → `cat_tree` (1 under the front-yard tree) + `watch_cat` (≥6 on the sidewalk/yard) and a
  cat prop up in the tree; `tv_dinner` → lounge seats tagged `tv` facing the tv_console.
* Put `hours: [open, close]` (minutes) on public buildings so their lights and doors make sense.

## History, detail & "realness" — the point of the whole project
The user wants to be shocked by the detail and by how real the town feels — like it has a history that matters to
people. For every building:
* Cornerstones with dates (`cornerstone()`), founding dates in signs ("EST. 1887"), ghost signs painted on side walls
  (faded advertisements: "UNEEDA BISCUIT", "HALLORAN'S BREAD — 5¢", "CASTORIA", "MAIL POUCH"), the **1938 hurricane
  high-water line** on waterfront buildings (a thin line of a darker material + small "HIGH WATER SEPT 21 1938").
* Readables (`b.readable`) with real text: bronze plaques ("On this site stood Beal's Livery, where the Great Fire of
  June 11, 1902 began"), honour rolls, framed first dollars, old photographs described in words, letters, menus,
  notices ("CHOIR PRACTICE SATURDAY 4 P.M."), lists of names (Civil War dead, MARY ELLEN crew, WWII honour roll).
  Use the names/dates in lore.js and invent consistent details.
* Lived-in interiors: not just furniture — a half-finished jigsaw, an open newspaper, coats on hooks, a cat bed,
  calendars, a boy's model airplane, dishes drying, a sewing basket, framed wedding photos. Vary every instance.
* Believable architecture: cornices, lintels, sills, pilasters, bay windows, fire escapes, water towers, chimneys,
  roof vents, skylights, awnings, flag brackets, lettering on glass, basement areaways, back alleys with trash cans.
* Keep counts sane: a building should use at most a few thousand brushes; big landmarks up to ~6–8k. Don't draw
  big areas voxel-by-voxel; use boxes. Props: a few hundred per big building max.

## Testing
Serve & screenshot headlessly (Chromium + SwiftShader, slow but fine):
```bash
# stand outside a building's main entrance (name substring), at 3 pm:
node tools/shot.mjs "goto=Carnegie Library&t=900" /tmp/claude-0/-home-user-Voxelworld/6e55a1f4-b2b9-5814-b773-96b182814404/scratchpad/lib1.png 2500
# spawn inside the Nth room of a building, facing yaw radians:
node tools/shot.mjs "inside=Carnegie Library&room=0&yaw=3.14&t=900" out.png 2500
# free aerial camera at x,y,z (metres) with yaw, pitch:
node tools/shot.mjs "cam=200,40,-20,0.6,-0.5&t=900" out.png 2500
# third-person view: add &view=third ; time t = minutes after midnight (1080 = 6 pm, 1290 = 9:30 pm)
```
Each run takes ~30 s. Look at the PNGs with the Read tool. Watch the console output: `Generator failed for …` means
your generator threw (it falls back to a generic box) — fix it. `missing prop type` warnings are expected while the
prop library is being written. World coordinates in metres: x east, z south; a lot's metre rect is `lot.m`.
You can also run a quick syntax check with `node --check src/city/gen/yourfile.js`.
Don't modify files outside your assignment. Don't commit or touch git.
