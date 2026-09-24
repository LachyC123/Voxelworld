// Street-life authoring kit. Scene modules (residential.js, downtown.js, animals.js,
// routines.js) receive a LifeKit and use it to find places, make outdoor spots, recruit
// idle townsfolk, block out their schedules, and add props, captions and sounds that only
// exist during a time window. Everything is deterministic, like the rest of the sim:
// what you see is a function of the clock. See docs/LIFE.md.
import { EventKit } from '../events.js';
import { RNG, hash3 } from '../../core/rng.js';
import { tm } from '../../core/util.js';
import { VS } from '../../core/config.js';
import { MFLAG } from '../../world/materials.js';
import { makeLook, pickName } from '../../people/appearance.js';

const SHOPISH = new Set(['shop', 'department', 'bank', 'hotel', 'theater', 'club', 'bowling', 'lodge', 'newspaper', 'postoffice', 'gasstation', 'garage', 'office', 'tower']);
const HOMEISH = new Set(['house', 'rowhouse', 'apartment']);
const WALKABLE = new Set(['walk', 'outside', 'path']);

// ------------------------------------------------------------------ shared registry (ctx.life)
export class LifeWorld {
  constructor(ctx) {
    this.ctx = ctx;
    this.timed = [];     // { h, t0, t1 }                           props that exist only in a window
    this.follows = [];   // { h, p, side, fwd, y, yawOff, when, t0, t1, bob }
    this.labels = [];    // { x, y, z, t0, t1, text, r }             captions for places/things
    this.sounds = [];    // { id, x, y, z, t0, t1, kind, range, vol, room }
    this.updaters = [];  // (rt) => void                              per-frame hooks (animals…)
    this.interact = [];  // { x, y, z, r, prompt, action(game), when?(m) }  dynamic interactables
    this.scenes = [];    // { id, title, x, z, t0, t1, n }            for diagnostics
    this.spottables = []; // extra Spotter's Diary items registered by scenes (see L.spottable)
    this.places = buildPlaces(ctx);
  }
}

// ground height (metres) at x,z: top of the first solid voxel scanning down from yTop
export function groundY(world, x, z, yTop = 3) {
  const vx = Math.floor(x / VS), vz = Math.floor(z / VS);
  for (let vy = Math.floor(yTop / VS); vy >= -8; vy--) {
    const m = world.matAt(vx, vy, vz);
    if (m && !(world.matFlags[m] & MFLAG.NOCOLLIDE)) return (vy + 1) * VS;
  }
  return 0.25;
}

// an axis-aligned frame at a building's main entrance: side = metres to the right (looking out
// of the door), out = metres from the property line toward the street (negative = into the lot)
function placeFor(ctx, b) {
  const nav = ctx.nav;
  const e = b.entrances.find((q) => q.main) || b.entrances[0];
  if (!e || !b.rect || e.door === undefined) return null;
  const [dx, dy, dz] = nav.pos(e.door);
  const [ox, oy, oz] = e.pos;
  let ux = ox - dx, uz = oz - dz;
  if (Math.abs(ux) > Math.abs(uz)) { ux = Math.sign(ux); uz = 0; } else { uz = Math.sign(uz) || 1; ux = 0; }
  const r = b.rect;
  const edge = ux > 0 ? r.x1 : ux < 0 ? r.x0 : uz > 0 ? r.z1 : r.z0;
  const rx = -uz, rz = ux; // right-hand side looking out of the door
  const ox0 = ux !== 0 ? edge : dx, oz0 = uz !== 0 ? edge : dz;
  const P = {
    building: b, name: b.name, kind: b.kind, shop: b.spec && b.spec.shop, rect: r,
    door: { x: dx, y: dy, z: dz }, outNode: e.node, u: [ux, uz], r: [rx, rz],
    yawOut: Math.atan2(ux, uz), yawIn: Math.atan2(-ux, -uz), yawRight: Math.atan2(rx, rz), yawLeft: Math.atan2(-rx, -rz),
    // point in the entrance frame
    at(side, out) { return { x: ox0 + rx * side + ux * out, z: oz0 + rz * side + uz * out }; },
  };
  // the curb-side parking place in front (right-hand traffic: the car faces along +right)
  P.curb = { ...P.at(0, 5.3), yaw: P.yawRight };
  P.walk = P.at(0, 2);                // middle of the sidewalk in front
  P.front = P.at(0, -1.5);            // front walk / step, just inside the property line
  return P;
}

function buildPlaces(ctx) {
  const out = { houses: [], homes: [], shops: [], civic: [], all: [], byName: new Map(), corners: [], benches: [] };
  const hhByHome = new Map((ctx.households || []).map((h) => [h.home, h]));
  for (const b of ctx.buildings) {
    const P = placeFor(ctx, b);
    if (!P) continue;
    out.all.push(P); out.byName.set(b.name, P);
    if (HOMEISH.has(b.kind)) {
      P.homes = b.homes.map((h) => ({ home: h, household: hhByHome.get(h) || null, members: (hhByHome.get(h) || {}).members || [] }));
      P.household = P.homes[0] ? P.homes[0].household : null;
      P.members = P.homes.flatMap((h) => h.members);
      P.yard = b.homes.flatMap((h) => h.yard || []);
      P.porch = b.homes.flatMap((h) => h.porch || []);
      if (b.kind === 'house') out.houses.push(P);
      out.homes.push(P);
    } else if (SHOPISH.has(b.kind)) {
      // two window-shopping places either side of the door, facing the glass
      P.windows = [P.at(-2.6, 0.9), P.at(2.6, 0.9)].map((q) => ({ ...q, yaw: P.yawIn }));
      out.shops.push(P);
    } else out.civic.push(P);
  }
  for (const it of ctx.crossings || []) out.corners.push({ x: it.x, z: it.z, ave: it.ave, st: it.st, corners: [[-8, -8], [8, -8], [8, 8], [-8, 8]].map(([a, c]) => ({ x: it.x + a, z: it.z + c })) });
  out.benches = ctx.spots.tagged('bench').filter((s) => !s.room);
  return out;
}

// the minutes a person is spoken for (asleep, at work, in an event or another scene), cached
// until their schedule changes: [a0, b0, a1, b1, …]
const WORK = /^(Working|Back at work)/;
const blocking = (e) => e.act === 'sleep' || e.event || e.life || (e.label && WORK.test(e.label));
function blockedTimes(p) {
  const s = p.schedule, nb = p.busy ? p.busy.length : 0, c = p._lifeBlk;
  if (c && c.s === s && c.n === s.length && c.b === nb) return c.v;
  for (let k = 1; k < s.length; k++) if (s[k].t < s[k - 1].t) { s.sort((a, b) => a.t - b.t); break; }
  const v = [];
  for (let k = 0; k < s.length; k++) if (blocking(s[k])) v.push(s[k].t, k + 1 < s.length ? s[k + 1].t : 1440);
  if (s.length && s[0].t > 0 && blocking(s[s.length - 1])) v.push(0, s[0].t);
  if (p.busy) for (const [a, b] of p.busy) v.push(a, b);
  p._lifeBlk = { s, n: s.length, b: nb, v };
  return v;
}

// ------------------------------------------------------------------ the kit
export class LifeKit extends EventKit {
  constructor(ctx, id, title = '') {
    super(ctx, { id: 'life:' + id, title });
    this.life = ctx.life;
    this.places = ctx.life.places;
    this.rng = new RNG('life:' + id);
    this.id = id;
  }

  // ---------------------------------------------------------------- geometry
  ground(x, z, yTop = 3) { return groundY(this.ctx.world, x, z, yTop); }
  place(name) { return this.places.byName.get(name) || this.places.all.find((p) => p.name.includes(name)) || null; }
  // nearest walkable nav node (sidewalk / path / outside-door node)
  walkNode(x, z, maxR = 40) { return this.ctx.nav.nearest(x, 0.3, z, (id, inf) => WALKABLE.has(inf.kind), maxR); }

  // An outdoor activity spot at world (x, z). o: { y, yaw, faceTo:[x,z], pose:'stand'|'sit'|'kneel'|'lie',
  //   act, seat, tags, held, lines, label, spread (metres, for crowds), pace (metres, back and forth
  //   along yaw), link (nav node id to join to), room, hidden }
  spot(x, z, o = {}) {
    const nav = this.ctx.nav;
    const y = o.y ?? this.ground(x, z, o.yTop ?? 3);
    let yaw = o.yaw ?? 0;
    if (o.faceTo) yaw = Math.atan2(o.faceTo[0] - x, o.faceTo[1] - z);
    const pose = o.pose || 'stand';
    const s = this.ctx.spots.add({
      x, y, z, yaw, pose, room: o.room || 0, building: o.building || null,
      act: o.act || (pose === 'sit' ? 'sit' : pose === 'kneel' ? 'kneel' : 'stand'),
      tags: o.tags || [], seat: o.seat ?? (pose === 'sit' ? 0.45 : 0), group: null, held: o.held || null,
      lines: o.lines || null, label: o.label || null, public: true, pace: o.pace || 0, spread: o.spread || 0,
      faceTo: o.spread && o.faceTo ? o.faceTo : null, hidden: !!o.hidden,
    });
    const node = nav.node(x, y, z, { room: s.room, kind: 'spot', spot: s.id });
    s.node = node;
    const to = o.link ?? nav.nearest(x, y, z, (id, inf) => id !== node && (s.room ? inf.room === s.room && inf.kind !== 'spot' : WALKABLE.has(inf.kind)), 45);
    if (to >= 0) nav.link(node, to);
    return s;
  }

  // ---------------------------------------------------------------- props
  // permanent static prop (y defaults to the ground)
  prop(type, x, z, yaw = 0, o = {}) { return this.ctx.props.add(type, x, o.y ?? this.ground(x, z), z, yaw, { cat: o.cat || 'exterior', tint: o.tint, tint2: o.tint2, scale: o.scale, room: o.room, collide: o.collide, interact: o.interact }); }
  // prop that exists only from t0 to t1 (a delivery truck, a lemonade stand, a leaf pile)
  timed(type, x, z, yaw, t0, t1, o = {}) {
    const h = this.ctx.props.addDynamic(type, { tint: o.tint, tint2: o.tint2, scale: o.scale, room: o.room });
    if (h.dummy) return h;
    h.x = x; h.y = o.y ?? this.ground(x, z); h.z = z; h.yaw = yaw; h.pitch = o.pitch || 0; h.roll = o.roll || 0; h.visible = false;
    this.life.timed.push({ h, t0: tm(t0), t1: tm(t1), r: o.r || 170 });
    return h;
  }
  // prop carried along by a person (a pram pushed ahead, a wagon pulled behind, a bicycle walked)
  // o: { side, fwd (metres in the person's frame), y (height above their feet), yawOff, when:'walk'|'spot'|'always',
  //      t0, t1 (only during a window), tint, tint2, scale, bob }
  follow(p, type, o = {}) {
    const h = this.ctx.props.addDynamic(type, { tint: o.tint, tint2: o.tint2, scale: o.scale });
    if (h.dummy) return h;
    h.visible = false;
    this.life.follows.push({ h, p, side: o.side || 0, fwd: o.fwd ?? 0.9, y: o.y || 0, yawOff: o.yawOff || 0, when: o.when || 'walk', t0: o.t0 !== undefined ? tm(o.t0) : null, t1: o.t1 !== undefined ? tm(o.t1) : null, bob: o.bob || 0 });
    return h;
  }

  // ---------------------------------------------------------------- captions, sounds, interaction
  // what the crosshair caption says when you look at this place between t0 and t1
  label(x, y, z, t0, t1, text, r = 4) { this.life.labels.push({ x, y, z, t0: tm(t0), t1: tm(t1), text, r }); }
  // kinds: hammer, saw, mower, bark, kids, radio, piano, whistle, bell, chatter, splash, engine, sweep, typewriter
  sound(x, y, z, t0, t1, kind, o = {}) { this.life.sounds.push({ id: this.id + ':' + this.life.sounds.length, x, y, z, t0: tm(t0), t1: tm(t1), kind, range: o.range || 45, vol: o.vol ?? 0.6, room: o.room || 0 }); }
  // something the player can press E on while it exists (x/y/z may be getters)
  interactable(o) { this.life.interact.push({ r: 1.8, ...o, t0: o.t0 !== undefined ? tm(o.t0) : null, t1: o.t1 !== undefined ? tm(o.t1) : null }); }
  // register a per-frame hook: fn(rt) with rt = { minutes, abs, t (seconds), dt, cam, props, people, player }
  every(fn) { this.life.updaters.push(fn); }
  // Add a thing to the Spotter's Diary (the player's list of things to spot). o: { id (unique),
  //   what ('The milkman and his truck'), hint ('Early — Maple Street, before 7'), cat ('Around town' |
  //   'Down by the water' | 'Townsfolk' | 'Only at certain times' | 'Dogs, cats & horses'),
  //   x, y, z (numbers or getters, e.g. { get x() { return h.x; } }) or person (a Person — spotted when
  //   seen while doing this scene) , t0, t1 (window it can be spotted in), r (target radius, m), range (m) }
  spottable(o) {
    // (kept as the same object so x/y/z getters stay live)
    if (o.cat === undefined) o.cat = 'Around town';
    if (o.r === undefined) o.r = 1.2;
    if (o.range === undefined) o.range = 25;
    o.t0 = o.t0 !== undefined ? tm(o.t0) : null; o.t1 = o.t1 !== undefined ? tm(o.t1) : null; o.by = this.id;
    this.life.spottables.push(o);
  }
  // note a scene (diagnostics / almanac)
  scene(title, x, z, t0, t1, n = 0) { this.life.scenes.push({ id: this.id, title, x, z, t0: tm(t0), t1: tm(t1), n }); }

  // ---------------------------------------------------------------- people
  // awake, not at work, not already in an event or scene, and a townsperson (not a commuter)
  idle(p, t0, t1) {
    if (p.commuter || p.visitor || !p.schedule.length) return false;
    t0 = tm(t0); t1 = tm(t1);
    const v = blockedTimes(p);
    for (let i = 0; i < v.length; i += 2) if (v[i] < t1 && v[i + 1] > t0) return false;
    return true;
  }
  recruit(n, t0, t1, filter = () => true, prefer = null) {
    t0 = tm(t0); t1 = tm(t1);
    const pool = this.ctx.people.list.filter((p) => filter(p) && this.idle(p, t0, t1));
    this.rng.shuffle(pool);
    if (prefer) pool.sort((a, b) => (prefer(b) ? 1 : 0) - (prefer(a) ? 1 : 0));
    return pool.slice(0, n);
  }
  // idle people who live closest to (x, z)
  neighbours(x, z, n, t0, t1, filter = () => true) {
    t0 = tm(t0); t1 = tm(t1);
    const out = [];
    for (const p of this.ctx.people.list) {
      if (!p.home || !filter(p) || !this.idle(p, t0, t1)) continue;
      const P = this.homePlace(p);
      out.push([P ? Math.hypot(P.door.x - x, P.door.z - z) : 1e9, p]);
    }
    out.sort((a, b) => a[0] - b[0] || a[1].id - b[1].id);
    return out.slice(0, n).map((q) => q[1]);
  }
  homePlace(p) { return p.home && p.home.building ? this.places.byName.get(p.home.building.name) || null : null; }
  // the nav node a person is at (or heading to) at minute t
  whereAt(p, t) {
    t = tm(t);
    const s = p.schedule; let cur = s[s.length - 1];
    for (const e of s) if (e.t <= t) cur = e;
    if (!cur) return -1;
    return cur.route ? cur.route[cur.route.length - 1] : cur.spot ? cur.spot.node : -1;
  }
  // Replace p's schedule from t0 to t1 with `entries` ([{ t, spot, act, label, held, lines, route, speed, costume }]),
  // then let them resume whatever they were doing. Marks p busy so no other scene takes them.
  plan(p, t0, t1, entries, o = {}) {
    if (!p) return;
    t0 = tm(t0); t1 = tm(t1);
    const s = p.schedule; s.sort((a, b) => a.t - b.t);
    let resume = null; for (const e of s) if (e.t <= t1) resume = e;
    p.schedule = s.filter((e) => !(e.t >= t0 && e.t < t1) || e.keep);
    for (const e of entries) {
      if (!e.spot && !e.route) continue;
      p.schedule.push({ t: tm(e.t), spot: e.spot || null, route: e.route || null, act: e.act || (e.route ? 'stroll' : e.spot.act), lines: e.lines || null, label: e.label || o.label || this.ev.title, held: e.held || o.held || null, event: null, life: this.id, speed: e.speed || o.speed || null, costume: e.costume || o.costume || null, arms: e.arms || o.arms || null });
    }
    if (resume && !o.noResume) p.schedule.push({ ...resume, t: t1 });
    p.schedule.sort((a, b) => a.t - b.t);
    (p.busy = p.busy || []).push([t0, t1]);
    const lines = o.lines; if (lines) this.say(p, t0, t1, lines, o.song);
  }
  // one spot from t0 to t1 (EventKit.block, but tagged as street life)
  block(p, t0, t1, spot, act = null, o = {}) { this.plan(p, t0, t1, [{ t: t0, spot, act: act || spot.act, label: o.label, held: o.held, costume: o.costume, arms: o.arms }], o); }
  // Door-to-door: visit each stop in order, dwelling `dwell` minutes at each. Returns the finish time.
  // o: { dwell, act, label, held, lines, speed, end (spot to finish at) }
  rounds(p, t0, stops, o = {}) {
    t0 = tm(t0);
    const nav = this.ctx.nav, speed = (o.speed || p.speed) * 60;
    let prev = this.whereAt(p, t0), t = t0;
    const entries = [];
    for (const s of stops) {
      if (!s) continue;
      // city-block distance is a good walking estimate on a street grid (the real route is found
      // lazily at run time; A* for every stop here made big rounds slow to build)
      const d = prev >= 0 ? (Math.abs(nav.x[s.node] - nav.x[prev]) + Math.abs(nav.z[s.node] - nav.z[prev])) * 1.08 + 4 : 40;
      entries.push({ t, spot: s, act: o.act || s.act, label: o.label, held: o.held });
      t += d / speed + (s.dwell ?? o.dwell ?? 1);
      prev = s.node;
    }
    if (o.end) entries.push({ t, spot: o.end, act: o.end.act, label: o.label, held: o.held });
    this.plan(p, t0, t + 0.5, entries, o);
    return t;
  }
  // A random walk along the sidewalks starting near (x, z), about `metres` long, never doubling straight back.
  walkRoute(x, z, metres, rng = this.rng) {
    const nav = this.ctx.nav;
    let cur = this.walkNode(x, z, 60);
    if (cur < 0) return null;
    const out = [cur];
    let prev = -1, len = 0, guard = 0;
    while (len < metres && guard++ < 4000) {
      const nb = nav.adj[cur].map((e) => e[0]).filter((v) => nav.info[v].kind === 'walk' && v !== prev);
      if (!nb.length) { if (prev < 0) break; const t = prev; prev = cur; cur = t; out.push(cur); continue; }
      // prefer carrying straight on
      let next;
      if (prev >= 0 && rng.chance(0.7)) {
        const dx = nav.x[cur] - nav.x[prev], dz = nav.z[cur] - nav.z[prev];
        next = nb.slice().sort((a, b) => ((nav.x[b] - nav.x[cur]) * dx + (nav.z[b] - nav.z[cur]) * dz) - ((nav.x[a] - nav.x[cur]) * dx + (nav.z[a] - nav.z[cur]) * dz))[0];
      } else next = rng.pick(nb);
      len += Math.hypot(nav.x[next] - nav.x[cur], nav.z[next] - nav.z[cur]);
      prev = cur; cur = next; out.push(cur);
    }
    return out;
  }
  // stroll the sidewalks from t0 to t1, then go back to whatever they were doing
  stroll(p, t0, t1, o = {}) {
    t0 = tm(t0); t1 = tm(t1);
    const start = this.whereAt(p, t0);
    const [x, , z] = start >= 0 ? this.ctx.nav.pos(start) : [o.x ?? 200, 0, o.z ?? 0];
    const route = o.route || this.walkRoute(o.x ?? x, o.z ?? z, (t1 - t0) * (o.speed || p.speed) * 60 * 0.85 + 30, o.rng || this.rng);
    if (!route) return false;
    this.plan(p, t0, t1, [{ t: t0, route, label: o.label || 'Out for a stroll', held: o.held, arms: o.arms, speed: o.speed }], o);
    return true;
  }
  // A new person who isn't in a household (a visitor up for Harbor Days, a travelling salesman,
  // the iceman from Gloucester). o: { first, last, age, sex, role/outfit, look, bio, lines, visitor }
  // Give them a schedule with p.at(...) / L.plan(...). They have no home; start them at a hidden spot
  // (L.offstage(x, z)) so they appear from off the edge of town / out of the station.
  newPerson(o = {}) {
    const r = this.rng.fork('person' + this.ctx.people.list.length);
    const sex = o.sex || (r.chance(0.5) ? 'M' : 'F');
    const age = o.age ?? r.int(20, 65);
    let nm = o.first ? { first: o.first, last: o.last } : pickName(r, sex, age, o.last);
    for (let t = 0; !o.first && t < 16 && this.ctx.people.byName.has(`${nm.first} ${nm.last}`.toLowerCase()); t++) nm = pickName(r, sex, age, o.last);
    const look = { ...makeLook(r, { sex, age, role: o.outfit || o.role, formal: o.formal }), ...(o.look || {}) };
    const p = this.ctx.people.add({ first: nm.first, last: nm.last, nick: o.nick || null, title: o.title || null, age, sex, look, role: o.role || null, home: null, bio: o.bio || null, lines: o.lines || [], tags: o.tags || [], notable: false, job: null, household: null });
    p.visitor = o.visitor ?? true;
    return p;
  }
  // a hidden spot where off-stage people wait (station platform, edge of town): they walk in from here
  offstage(x, z, o = {}) { const s = this.spot(x, z, { ...o, hidden: true }); s.hidden = true; return s; }
  // a small hash helper for deterministic variety
  h(a, b = 0, c = 0) { return hash3(a | 0, b | 0, c | 0); }
}
