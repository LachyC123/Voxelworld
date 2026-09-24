# Street life — authoring guide

Juniper Bay (1953 New England harbour town, Saturday Sept 26, the Centennial "Harbor Days") has
~514 townsfolk with deterministic daily schedules, 18 big scripted events and every building
built and furnished. What it lacks is **everyday street life**: walk down any street at 10 AM and
it is nearly empty. The goal of the street-life layer is that **wherever the player looks, at any
hour, something ordinary and specific is going on** — and they think "oh, let me see what that is".

A man on a ladder painting his shutters. Kids jumping into a leaf pile. The iceman carrying a block
with tongs. A delivery truck double-parked with a man wheeling crates in. Two neighbours talking over
a fence. A dog trotting beside its owner. A boy chasing a hoop. The milkman's truck at the curb.
A fender-bender with a policeman writing in his notebook while a crowd watches.

Everything is **a pure function of the clock** (like the rest of the sim): you add schedule entries,
props that exist during a window, captions and sounds. No per-frame state machines (except the
optional `L.every` hook).

## Where code goes

| module | file | owns |
|---|---|---|
| neighbourhood life | `src/sim/life/residential.js` + props `src/props/lib/life_home.js` | yards, porches, driveways, front walks, residential sidewalks, door-to-door trades |
| downtown & waterfront | `src/sim/life/downtown.js` + props `src/props/lib/life_town.js` | Main/Market/Lantern/Canal streets, shops' fronts, corners, square edges, station, piers, beach |
| animals | `src/sim/life/animals.js` + props `src/props/lib/animals.js` | dogs, cats, horses, squirrels … (models, animation, behaviour) |
| routines | `src/sim/life/routines.js` | everyone's errands, strolls, visits, group walks, out-of-town visitors |

Each module exports `run(L)` and receives its own `LifeKit` `L`. Run order: residential → downtown →
animals → routines. **Do not edit files outside your row** (the kit/runtime/people/game code is shared
— if you need a kit feature, write a local helper in your module, and report what you'd change).
Existing prop names are listed by `grep -o "defineProp('[a-z_0-9]*'" src/props/lib/*.js`; new props
go in your own props file, names prefixed sensibly and unique across the repo (see docs/PROPS.md for
the voxel model API and quality bar; existing `dog`, `dog_small`, `cat`, `horse`, `squirrel`, `pigeon`,
`baby_carriage`, `wagon_red`, `bicycle`, `tricycle`, `lemonade_stand`, `leaf_pile`, `lawn_mower`,
`wheelbarrow`, the trucks `truck_milk`, `truck_bread`, `truck_ice_cream`, `truck_delivery`,
`truck_garbage`, `truck_pickup`, cars `car_sedan|coupe|wagon|convertible|taxi|police` etc. exist).

## Conventions

* **Metres**, world x east, z south, y up. Ground outdoors ≈ 0.25 (sidewalk/lawn top); `L.ground(x,z)`.
* **Yaw** everywhere = `Math.atan2(fx, fz)` of the facing direction; prop models face **+z** at yaw 0.
* **Times**: minutes since midnight or `'9:30'` strings (24 h). Day windows can't wrap midnight for
  schedules; props/labels may.
* Streets: avenues (N–S) at x = 54 Harbor St, 134 Main St, 214 Lantern Ave (trolley), 294 Elm St,
  374 Hillcrest Ave. Streets (E–W) at z = −210 Mill, −140 Canal, −70 Grand Ave, 0 Market, 70 Church,
  140 Maple, 210 Orchard. Carriageway half-width 6 m, sidewalks 4 m. Traffic drives on the right
  in lanes 3 m from the centre line — **park at the curb** (`P.curb`, 5.3 m out from the property line).
  The waterfront (quay, piers, sheds) is x < 44; the beach is south (z > 229) by Harbor St; Founders
  Square is downtown around x 214–284, z −70…0; Union Station at the north end of Lantern Ave (z ≈ −225).
* Downtown ≈ x 100–320, z −230…70. Residential ≈ z > 70 or x > 300.

## The day (don't fight the big events; build around them)

| time | event (place) |
|---|---|
| 4:30–7:00 | ovens at Halloran & Sons Bakery |
| 6:00–8:30 | fishing fleet comes in (Castellano Fish Co.) |
| 7:15, 9:52, 12:40, 16:52, 19:30, 22:05 | trains arrive at Union Station (sit 14 min) |
| 10:00–19:00 | Harbor Days fair on Founders Square (band 13:00–17:20) |
| 11:00–11:45 | firemen rescue Admiral the cat (Hatch Residence, Church St) |
| 13:00–19:40 | a baby is born at St. Luke's |
| 14:00–15:00 | wedding at St. Brigid's; 14:00–17:00 Susie Moreau's 7th birthday (14 Maple St) |
| 14:00–16:00 | "Roman Holiday" matinee (Rialto); 19:30–21:30 "Shane" |
| 16:00–17:30 | choir practice (First Congregational) |
| 17:30–18:05 | Mayor's centennial speech & time capsule (City Hall steps) |
| 18:00–19:30 | Hallorans' supper in front of the new television |
| 18:30–21:00 | welcome-home supper for Sal Castellano Jr. (back from Korea) |
| 19:30–22:30 | sock hop (high school); 20:00–22:30 street dance on the square |
| 21:00–21:25 | fireworks over the harbour; 21:00– Blue Lantern late set; 21:30– presses roll |

Sunrise ~6:30, sunset ~18:40. Autumn: leaves turning, cool morning, warm afternoon.

## The kit (`L`)

`L` extends the event kit (`src/sim/events.js`), so `L.person(first,last)`, `L.building(name)`,
`L.spots(building, tag)`, `L.tagged(tag)`, `L.household(special)`, `L.say`, `L.convo` all work.

### Places — `L.places`
* `houses` (detached houses), `homes` (houses + rowhouses + the Marlowe apartments), `shops`
  (storefronts, hotel, bank, theater, club, bowling, lodge, newspaper, post office, garage, gas
  station, offices), `civic` (churches, school, hospital, fire, police, museum, library, square,
  park, station, waterfront sites…), `all`, `byName` (Map), `corners` (street intersections:
  `{x, z, ave, st, corners:[{x,z}×4]}` — the four sidewalk corners), `benches` (outdoor bench spots).
* Every place `P` has an **entrance frame**: `P.at(side, out)` → `{x, z}` where `side` is metres to the
  right looking out of the front door and `out` is metres from the property line toward the street
  (negative = into the lot; 0…4 = sidewalk; 4 = curb; 5.3 = parking lane; 9 = crown of the road).
  Also `P.door {x,y,z}`, `P.front` (front step), `P.walk` (sidewalk in front), `P.curb {x,z,yaw}`
  (parking place, yaw = parked car heading), `P.yawOut`, `P.yawIn`, `P.yawRight`, `P.yawLeft`,
  `P.u` (outward unit vector), `P.r` (rightward unit vector), `P.rect {x0,z0,x1,z1}` (the lot),
  `P.building`, `P.name`, `P.kind`, `P.shop` (shop trade key, e.g. 'grocer', 'hardware').
* Homes also have `P.members` (people living there), `P.household`, `P.homes`, `P.yard` / `P.porch`
  (existing activity spots). Shops have `P.windows` (two `{x,z,yaw}` points facing the display glass).
* `L.place(name)` finds a place by building name (exact or substring).

### Spots — `L.spot(x, z, o)`
Creates an outdoor activity spot joined to the sidewalk network. Options: `yaw` or `faceTo:[x,z]`,
`pose` ('stand' | 'sit' | 'kneel' | 'lie'), `act` (animation, see `src/sim/activities.js` — e.g. talk,
laugh, wave, look, wait, lean, read_stand, drink_stand, smoke_pipe, sweep, rake, shovel, garden,
water_plants, laundry, wash, paint, hammer, hammer_kneel, saw, carry, wrench, under_car, fish, fish_sit,
play, play_ball, jump_rope, hopscotch, swing, cheer, clap, photograph, feed_birds, pet_dog, cry, hug,
hail_taxi, counter, serve, browse, sit, doze, knit, sew, cards, chess, eat, drink), `seat` (sit height),
`held` (hand item: broom, rake, shovel, newspaper, book, umbrella, handbag, grocery_bag, suitcase,
briefcase, crate_small, fishing_rod, camera, cane, balloon, bouquet, letter, hammer, wrench, paintbrush,
watering_can, trowel, hot_dog, ice_cream_cone, popcorn_box, cotton_candy, flag_small, sign_placard,
pipe, coffee_cup, ball, bat …), `pace` (metres: the person walks back and forth along the spot's yaw
while doing the activity — mowing, hauling crates from a truck to a door, pacing), `spread` (metres:
a crowd spot — each person gets a random offset; with `faceTo` they all face that point), `label`,
`lines`, `link` (explicit nav node to join), `y` (height, e.g. a porch or a ladder rung),
`hidden` (people at it are not drawn — offstage).

### People
* `L.idle(p, t0, t1)` — awake, not at work, not in an event or another scene, not a commuter/visitor.
* `L.recruit(n, t0, t1, filter?, prefer?)` — n idle people. `L.neighbours(x, z, n, t0, t1, filter?)`
  — idle people who live nearest (x, z). `L.homePlace(p)` — the place p lives.
* `L.block(p, t0, t1, spot, act?, {label, held, lines, costume, arms})` — p is at `spot` doing `act`
  from t0 to t1, then resumes their day. `label` is what the crosshair caption says they're doing
  ("Painting the shutters"). `lines` are speech bubbles when the player is near.
* `L.plan(p, t0, t1, entries, o)` — several entries: `[{t, spot, act, label, held, arms, speed}]` or
  `{t, route}` for a stroll along nav nodes. Each entry means "at time t set off for this spot"
  (walking time is automatic); p resumes their day at t1.
* `L.rounds(p, t0, stops, {dwell, act, label, held, arms, end})` — door-to-door: visits each stop in
  order with realistic walking times; each stop may carry its own `dwell` (minutes). Returns the end time.
* `L.walkRoute(x, z, metres)` → a random sidewalk route; `L.stroll(p, t0, t1, {label, held, arms, x, z})`.
* `L.convo([a, b], t0, t1, [[0, 'line'], [1, 'reply'], …])` — a two-sided conversation (bubbles alternate).
* `arms` while walking: `'push'` (pram, mower, handcart), `'carry'` (a box in both arms — also set `held:
  'crate_small'`), `'pull'` (a wagon behind), `'arm'` (arm in arm).
* `L.newPerson({first?, last?, age, sex, outfit?, look?, bio, lines})` — someone not from town (a visitor,
  the Fuller Brush man). `L.offstage(x, z)` — a hidden spot they wait at before walking on stage.
  Give them a full-day schedule with `p.at(t, spot, act, {label, held})` (or `L.plan`).

### Props, captions, sounds
* `L.prop(type, x, z, yaw, {y, tint, tint2, scale})` — permanent static prop.
* `L.timed(type, x, z, yaw, t0, t1, {y, tint, tint2, scale, pitch, roll})` — exists only in the window
  (the milk truck from 5:40 to 6:10, the moving van, a leaf pile that grows). Not solid to the player.
* `L.follow(p, type, {side, fwd, y, yawOff, when:'walk'|'spot'|'always'|fn(state,p), t0, t1, tint, bob})`
  — a prop that moves with a person (pram pushed ahead: `fwd: 0.9`; wagon pulled: `fwd: -1.1`; a bike
  walked alongside: `side: 0.5`). Offsets are in the person's frame (fwd along their facing, side = right).
* `L.label(x, y, z, t0, t1, text, r)` — the caption the crosshair shows when looking at a thing
  (people get "Name · what they're doing" automatically from their entry `label`).
* `L.sound(x, y, z, t0, t1, kind, {range, vol})` — kinds: hammer, saw, mower, bark, kids, chatter, radio,
  piano, whistle, bell, splash, engine, sweep, typewriter, hose, crowd.
* `L.interactable({x, y, z, r, prompt, action(game), t0, t1, when(m)})` — press E (e.g.
  `action: (g) => g.hud.toast('…')`, or `g.bubbles.say(person, text, g.time, 4)`).
* `L.every((rt) => …)` — per-frame hook (`rt.minutes, rt.t, rt.dt, rt.cam, rt.props, rt.people, rt.player,
  rt.game`). Use for animals; keep it cheap (skip anything > 120 m from `rt.cam`).
* `L.scene(title, x, z, t0, t1, n)` — register the scene for diagnostics (`tools/street.mjs` lists them).

## Quality bar

* **Specific, not generic.** "Mr. Kowalski washing the '49 Buick" beats "a man washing a car". Use real
  households (`P.members`, surnames, the roster in `src/sim/roster.js`, lore in `src/city/lore.js`).
  Write lines in a warm, dry 1953 small-town New England voice, short (≤ 90 chars), a few per scene.
* **Density over the whole day and the whole map.** Scenes should last 20–120 minutes and be spread
  over every neighbourhood and every hour from ~6:00 to ~22:00 (quieter early/late). Check with
  `node tools/street.mjs` — it prints walking/outdoor counts per hour and an 80 m head-count grid.
* **Plausible physically.** Put things on the ground (`L.ground`), in the right place (a ladder against
  the house wall, a truck at the curb facing the traffic direction `P.curb.yaw`), not blocking doors.
  Don't put scenes inside the fair square, or on top of existing yard/porch props — look first.
* **Don't steal people from the big events** — `L.idle` already refuses anyone busy, working or asleep.
* **Cheap.** Timed/follow props are drawn every frame when visible; a few hundred is fine, thousands
  are not. Static `L.prop` is cheapest.

## Testing

* `node tools/street.mjs [hours…]` — headless build + street activity report + scene list + missing
  props + errors (fast, ~1 min). Run it after every change.
* `node tools/mshot.mjs views.json outdir` — screenshots from one browser load. A view is
  `{name, t, goto:'Building name', inside?, roomName?, third?, dx, dz, dy, yaw, pitch, back, wait}` or
  `{name, t, cam:[x, y, z, yaw, pitch]}` (aerial camera; yaw 0 looks north (−z), +π/2 looks west),
  or `{name, t, goto:'Building', tag:'some_spot_tag', dist}` (stand facing spots with that tag).
  Screens take ~1–2 min each under load: batch views in one file. Use `W=960 H=540`.
* Every scene must survive a missing place (return quietly) — the town layout may change.

## The Spotter's Diary

The player carries a model-village style "things to spot" list (Tab / I). Register your most
charming, most specific scenes as diary items so people go looking for them:

```js
L.spottable({ id: 'milkman', cat: 'Only at certain times', what: 'The milkman and his rattling bottles',
  hint: 'Early — the Maple Street side of town, before seven', person: milkman, t0: '5:30', t1: '8:00' });
L.spottable({ id: 'monkey', cat: 'Around town', what: "The organ grinder's monkey, collecting pennies",
  hint: 'Wherever the crowds are', x: 0, y: 1, z: 0, get x() { return h.x; }, get z() { return h.z; }, r: 0.8, range: 15 });
```

Categories: 'Around town', 'Down by the water', 'Townsfolk', 'Dogs, cats & horses', 'Only at certain times'.
Spotting happens when the thing is near the centre of the view, within `range`, and not behind a wall,
for about half a second. `person` items are spotted by looking at that person (optionally only while
their schedule entry has `label`). Keep `what` short (≤ 60 chars) and the hint gentle and useful.
Aim for 4–10 items per module; don't duplicate what's already in `src/sim/hunt.js`.
