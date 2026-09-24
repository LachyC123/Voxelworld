// Street life: animals. See docs/LIFE.md.
// Household dogs (one per suitable household: they doze on the porch, follow the family out on walks,
// chase the children round the yard and bark at you over the fence), town strays, cats on porch steps,
// fence posts and car hoods, Admiral up the Hatches' maple, squirrels in Juniper Park, the ragman's
// horse and wagon and a mounted policeman at the fair.
//
// Everything that matters is deterministic (each dog's home, family, walks and play dates; the strays'
// rounds; the horses' routes are pure functions of the clock). Small things run on real time: wags,
// head-ups, barking at the player, a cat sauntering off, squirrels dashing about.
// One L.every hook animates everything within ~120 m of the camera: each animal picks a frame prop
// (dog_setter_walk_a …) and draws it from a small per-frame pool of dynamic handles, nearest first.
import { tm } from '../../core/util.js';
import { hash3 } from '../../core/rng.js';
import { VS } from '../../core/config.js';
import { MFLAG, MAT } from '../../world/materials.js';
import { groundY } from './kit.js';
import { activity } from '../activities.js';
import { DOG_BREEDS, DOG_FRAMES, CAT_FRAMES, HORSE_FRAMES, SQUIRREL_FRAMES, WAGON_HITCH } from '../../props/lib/animals.js';
import { LIFE_SOUNDS } from '../../audio/audio.js';
import { SQUARE } from '../../city/layout.js';

const TAU = Math.PI * 2;
const RANGE = 120;
const pack = (hex) => parseInt(hex.slice(1), 16);
const wrapA = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const turn = (cur, want, step) => { const d = wrapA(want - cur); return cur + Math.max(-step, Math.min(step, d)); };
const H = (a, b = 0, c = 0) => hash3(a | 0, b | 0, c | 0);
const plural = (s) => (/(s|x|z|ch|sh)$/.test(s) ? s + 'es' : s + 's');
const theFamily = (s) => `the ${plural(s)}'`;
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// person (character) dimensions, for the leash hand (see src/people/characters.js DIM)
const DIM = { hipY: 0.82, torsoH: 0.56, shoulderX: 0.285, arm: 0.56 };

// per-frame pool sizes (a pool never holds more handles than there are animals using that model)
const CAP = {
  stand: 3, wag: 2, walk_a: 3, walk_b: 3, run: 2, sit: 3, lie: 4, lie_up: 3,   // dogs (per breed)
  loaf: 4, curl: 4, crouch: 2,                                                   // cats (+ stand/walk/sit)
  run_a: 5, run_b: 5, rag: 1,                                                    // squirrels, wagon
  'squirrel:sit': 8, 'squirrel:run_a': 6, 'squirrel:run_b': 6,
};
const FALLBACK = { wag: 'stand', walk_b: 'walk_a', walk_a: 'stand', run: 'walk_a', lie_up: 'lie', lie: 'sit', loaf: 'sit', curl: 'loaf', crouch: 'stand', run_a: 'sit', run_b: 'run_a' };

const BREED_NAME = { terrier: 'wire-haired terrier', setter: 'Irish setter', collie: 'collie', dachshund: 'dachshund', boxer: 'boxer', beagle: 'beagle', poodle: 'poodle', mutt: 'mutt' };
const COATS = {
  terrier: [['#b07a42', '#1e1c1a'], ['#a86a38', '#2a2420'], ['#c08a50', '#b07a42']],
  setter: [['#8a3a1a', '#8a3a1a'], ['#9a4620', '#9a4620'], ['#c8924a', '#c8924a']],
  collie: [['#b07a3a', '#1e1c1a'], ['#9a6430', '#1e1c1a'], ['#2a2622', '#b07a3a']],
  dachshund: [['#8a3a1a', '#6a2a14'], ['#1e1c1a', '#a8622a'], ['#9a4a22', '#7a3418']],
  boxer: [['#b8783a', '#1e1c1a'], ['#a8602a', '#1e1c1a'], ['#7a4a2a', '#1e1c1a']],
  beagle: [['#b07038', '#1e1c1a'], ['#a86a34', '#2a2622'], ['#c08040', '#1e1c1a']],
  poodle: [['#222222', '#222222'], ['#ece8e0', '#ece8e0'], ['#d8a870', '#d8a870'], ['#8a8a88', '#8a8a88']],
  mutt: [['#8a6a4a', '#2a2420'], ['#6a4a2a', '#e8e0d0'], ['#b89a6a', '#5a3a22'], ['#3a3230', '#e8e0d0'], ['#c8b89a', '#6a4a2a']],
};
const DOG_NAMES = {
  M: ['Rusty', 'Duke', 'Skipper', 'Pal', 'Buster', 'Rex', 'King', 'Prince', 'Laddie', 'Shep', 'Butch', 'Spot', 'Sport', 'Scamp', 'Chief', 'Smokey', 'Rags', 'Bingo', 'Gus', 'Tuffy', 'Nipper', 'Muggsy', 'Corky', 'Fritz', 'Blackie', 'Brownie', 'Pepper', 'Barney', 'Mickey', 'Toby', 'Jiggs', 'Sarge', 'Bosco', 'Tramp'],
  F: ['Lady', 'Queenie', 'Tippy', 'Trixie', 'Mitzi', 'Penny', 'Taffy', 'Sandy', 'Ginger', 'Frisky', 'Duchess', 'Missy', 'Sheba', 'Babe', 'Princess', 'Candy', 'Honey', 'Susie', 'Pixie', 'Belle', 'Cookie', 'Dixie', 'Fifi', 'Gypsy'],
};
const CAT_NAMES = ['Tiger', 'Smokey', 'Mittens', 'Boots', 'Whiskers', 'Patches', 'Pumpkin', 'Midnight', 'Inky', 'Socks', 'Puss', 'Fluffy', 'Tom', 'Felix', 'Cleo', 'Muffin', 'Marmalade', 'Sylvester', 'Butterscotch', 'Pepper', 'Tabitha', 'Mouser', 'Jasper', 'Dinah'];
const PET_LINES = [
  '{N} leans {his} whole weight against your leg.',
  '{N} sits, offers a paw, and looks deeply pleased with the arrangement.',
  '{N} thumps {his} tail on the boards. Thump. Thump. Thump.',
  '{N} sniffs your cuffs very thoroughly and approves.',
  '{N} closes {his} eyes and leans into the ear-scratch.',
  '{N} licks your hand, then sneezes.',
  '{N} rolls half over for a belly rub. It would be rude not to.',
  '{N} wags so hard the whole back end of {him} comes along.',
];
const OWNER_LINES = ['{He} likes you!', 'Don\'t let {him} fool you, {he}\'s had breakfast.', 'Say hello nicely, {N}.', 'Mind, {he}\'ll follow you home.', '{He}\'s a good {dog}, mostly.'];
const CAT_PET = [
  '{N} permits exactly one stroke, then remembers somewhere else to be.',
  '{N} arches into your hand, purrs once, and strolls off without a backward glance.',
  '{N} accepts the stroke as tribute and departs.',
  '{N} bumps your knuckles with {his} head, then walks away as if it never happened.',
];

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const K = this.k, V = this.v; K.push(key); V.push(val);
    let i = K.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= K[i]) break; [K[p], K[i]] = [K[i], K[p]]; [V[p], V[i]] = [V[i], V[p]]; i = p; }
  }
  pop() {
    const K = this.k, V = this.v, top = V[0], lk = K.pop(), lv = V.pop();
    if (K.length) {
      K[0] = lk; V[0] = lv; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < K.length && K[l] < K[m]) m = l; if (r < K.length && K[r] < K[m]) m = r; if (m === i) break; [K[m], K[i]] = [K[i], K[m]]; [V[m], V[i]] = [V[i], V[m]]; i = m; }
    }
    return top;
  }
}

// ================================================================================ the zoo
class Zoo {
  constructor(L) {
    this.L = L; this.ctx = L.ctx; this.rng = L.rng; this.W = L.ctx.world; this.nav = L.ctx.nav; this.props = L.ctx.props;
    this.animals = [];
    this.used = new Set(['Admiral', 'Duchess', 'Mackerel', 'Dewey', 'Salami', 'Barnacle', 'Nails', 'Scraps', 'Jiggs', 'Old Bones', 'Dolly', 'Duke']); // names already given (the town's own animals first)
    this.taken = [];              // occupied resting points [x, z, r]
    this.dbg = {};                // setup counters (for tools/diagnostics)
    this.index = this.indexProps();
    this.soundDefs();
  }

  add(a) {
    a.id = this.animals.length; a.ph = H(a.id, 17, 3) * 100;
    Object.assign(a, { x: a.x ?? 0, y: a.y ?? 0, z: a.z ?? 0, yaw: a.yaw ?? 0, pitch: 0, roll: 0, frame: a.frame || 'stand', vis: false, scale: a.scale ?? 1, room: 0, odo: 0, st: {}, cap: '', d2: 1e9 });
    a.range = a.range || RANGE;
    this.animals.push(a);
    return a;
  }
  name(pool, i) {
    for (let k = 0; k < pool.length; k++) { const n = pool[(i + k) % pool.length]; if (!this.used.has(n)) { this.used.add(n); return n; } }
    return pool[i % pool.length];
  }
  take(x, z, r = 0.6) { this.taken.push([x, z, r]); }
  isTaken(x, z, r = 0.6) { return this.taken.some(([a, b, q]) => Math.hypot(a - x, b - z) < r + q); }

  // ---------------------------------------------------------------- the world
  ground(x, z, yTop = 1.2) { return groundY(this.W, x, z, yTop); }
  solid(x, y, z) { const m = this.W.matAt(Math.floor(x / VS), Math.floor(y / VS), Math.floor(z / VS)); return !!m && !(this.W.matFlags[m] & MFLAG.NOCOLLIDE); }
  clear(x, y, z, h = 0.45) { for (let yy = y + 0.05; yy < y + h; yy += VS * 0.9) if (this.solid(x, yy, z)) return false; return true; }
  // a flat, clear place for a body `len` long lying along `yaw` (returns its ground height or null)
  rest(x, z, yaw, len, yTop = 1.2, want = null, tol = 0.07, h = 0.45) {
    const y0 = this.ground(x, z, yTop);
    if (want !== null && Math.abs(y0 - want) > tol) return null;
    if (!this.clear(x, y0, z, h)) return null;
    const fx = Math.sin(yaw) * len / 2, fz = Math.cos(yaw) * len / 2;
    for (const k of [-1, 1]) {
      const y = this.ground(x + fx * k, z + fz * k, yTop);
      if (Math.abs(y - y0) > tol || !this.clear(x + fx * k, y, z + fz * k, h)) return null;
    }
    return y0;
  }
  // static props (below 2.2 m) in a coarse grid, for keeping animals out of furniture, cars and trees
  indexProps() {
    const P = this.props, cells = new Map();
    for (let i = 0; i < P.n; i++) {
      if (P.tCat[i] === 250) continue;
      const y = P.tPos[i * 3 + 1];
      if (y > 2.2) continue;
      const t = P.types[P.tType[i]], d = t.def;
      if (/^(sign:|street_sign|window_box|rug_|chimney|painting|portrait|photo|clock_wall|mirror)/.test(t.name)) continue;
      const sc = (d.scale || 1 / 16) * (P.tScale[i] || 1);
      let r = Math.max(d.size[0], d.size[2]) * sc / 2;
      if (/^tree_/.test(t.name)) r = 0.45; else if (/^car_|^truck_/.test(t.name)) r = 1.3;
      const x = P.tPos[i * 3], z = P.tPos[i * 3 + 2];
      const k = Math.floor(x / 4) + ',' + Math.floor(z / 4);
      let a = cells.get(k); if (!a) { a = []; cells.set(k, a); }
      a.push({ i, x, y, z, r, name: t.name, yaw: P.tYaw[i] });
    }
    // the other street-life modules' timed props (a toy wagon on the lawn, a car at the curb…) count too
    for (const q of this.L.life.timed || []) {
      const h = q.h; if (!h || h.dummy || h.tid === undefined) continue;
      const t = P.types[h.tid]; if (!t) continue;
      const d = t.def, sc = (d.scale || 1 / 16) * (h.scale || 1);
      let r = Math.max(d.size[0], d.size[2]) * sc / 2; if (/^car_|^truck_/.test(t.name)) r = 1.3;
      const k = Math.floor(h.x / 4) + ',' + Math.floor(h.z / 4);
      let a = cells.get(k); if (!a) { a = []; cells.set(k, a); }
      a.push({ i: -1, x: h.x, y: h.y, z: h.z, r, name: t.name, yaw: h.yaw, timed: true });
    }
    return cells;
  }
  near(x, z, R, test = null) {
    const out = [];
    for (let cx = Math.floor((x - R) / 4); cx <= Math.floor((x + R) / 4); cx++) for (let cz = Math.floor((z - R) / 4); cz <= Math.floor((z + R) / 4); cz++) {
      const a = this.index.get(cx + ',' + cz); if (!a) continue;
      for (const q of a) if (!q.gone && Math.hypot(q.x - x, q.z - z) < R && (!test || test(q))) out.push(q);
    }
    return out;
  }
  blocked(x, z, pad = 0.3, y = null) { return this.near(x, z, 3.5).some((q) => (y === null || Math.abs(q.y - y) < 1.2) && Math.hypot(q.x - x, q.z - z) < q.r * 0.75 + pad); }
  removeProp(q) { if (q.i >= 0) this.props.remove(q.i); q.gone = true; }

  // outdoor-only A* over the sidewalk network (never cuts through a shop)
  outdoorPath(a, b) {
    const nav = this.nav, ok = (i) => { const f = nav.info[i]; return !f.room && (f.kind === 'walk' || f.kind === 'outside' || f.kind === 'path' || f.kind === 'spot'); };
    if (a < 0 || b < 0) return null;
    const heap = new MinHeap(), g = new Map([[a, 0]]), from = new Map(), bx = nav.x[b], bz = nav.z[b], done = new Set();
    heap.push(0, a);
    let it = 0;
    while (heap.size && it++ < 80000) {
      const u = heap.pop();
      if (u === b) break;
      if (done.has(u)) continue;
      done.add(u);
      const gu = g.get(u);
      for (const [v, w] of nav.adj[u]) {
        if (!ok(v) && v !== b) continue;
        const ng = gu + w;
        if (ng < (g.get(v) ?? Infinity)) { g.set(v, ng); from.set(v, u); heap.push(ng + Math.hypot(nav.x[v] - bx, nav.z[v] - bz), v); }
      }
    }
    if (!from.has(b)) return null;
    const out = [b]; let c = b; while (c !== a) { c = from.get(c); out.push(c); if (out.length > 5000) return null; }
    return out.reverse().map((i) => [nav.x[i], nav.z[i]]);
  }
  walkNode(x, z, r = 40) { return this.L.walkNode(x, z, r); }

  // ---------------------------------------------------------------- sounds
  soundDefs() {
    const R = Math.random;
    try {
      if (!LIFE_SOUNDS.hooves) LIFE_SOUNDS.hooves = (a, ch, i, t) => { a.hit(ch, t, { type: 'bandpass', freq: 1150 + R() * 200, q: 7, vol: 0.2, dur: 0.05 }); a.hit(ch, t + 0.16, { type: 'bandpass', freq: 880 + R() * 140, q: 7, vol: 0.15, dur: 0.05 }); return 0.6 + R() * 0.06; };
      if (!LIFE_SOUNDS.yap) LIFE_SOUNDS.yap = (a, ch, i, t) => { const n = 2 + (R() * 3 | 0); for (let k = 0; k < n; k++) { a.tone(ch, 880 + R() * 140, t + k * 0.2, 0.08, { type: 'sawtooth', vol: 0.12, filter: 2200, attack: 0.004, release: 0.04 }); a.hit(ch, t + k * 0.2, { type: 'bandpass', freq: 1500, q: 1.5, vol: 0.08, dur: 0.06 }); } return 1.6 + R() * 2.5; };
      if (!LIFE_SOUNDS.meow) LIFE_SOUNDS.meow = (a, ch, i, t) => { a.tone(ch, 640 + R() * 60, t, 0.22, { type: 'triangle', vol: 0.05, vibrato: true, attack: 0.05, release: 0.1 }); a.tone(ch, 470 + R() * 40, t + 0.18, 0.3, { type: 'triangle', vol: 0.045, vibrato: true, attack: 0.04, release: 0.15 }); return 5 + R() * 6; };
    } catch (e) { /* audio module unavailable */ }
  }
  slot(kind, range, vol, n) {
    const s = { id: `animals:${kind}:${n}`, x: 0, y: -50, z: 0, t0: 0, t1: 0, kind, range, vol, room: 0 };
    this.L.life.sounds.push(s);
    return s;
  }

  // ---------------------------------------------------------------- runtime
  finish() {
    const L = this.L, P = this.props;
    const users = new Map();
    for (const a of this.animals) if (a.model) { const k = a.model; if (!users.has(k)) users.set(k, { n: 0, frames: a.frames }); users.get(k).n++; }
    this.pools = new Map();
    let handles = 0;
    for (const [model, u] of users) for (const f of u.frames) {
      const cap = Math.min(u.n, CAP[`${model}:${f}`] ?? CAP[f] ?? 3), hs = [];
      for (let i = 0; i < cap; i++) { const h = P.addDynamic(`${model}_${f}`, {}); if (h.dummy) break; h.visible = false; hs.push(h); }
      handles += hs.length;
      this.pools.set(`${model}_${f}`, { hs, used: 0, prev: 0 });
    }
    const leashers = this.animals.filter((a) => a.leashable).length;
    this.leash = { hs: [], used: 0, prev: 0 };
    for (let i = 0; i < Math.min(5, leashers); i++) { const h = P.addDynamic('dog_leash', {}); if (!h.dummy) { h.visible = false; this.leash.hs.push(h); } }
    handles += this.leash.hs.length;
    // captions that follow the animals, a couple of "pet it" slots, bark / hoof / bell / meow sources
    for (const a of this.animals) { a.label = { x: 0, y: -100, z: 0, t0: 0, t1: 0, text: '', r: a.capR || 0.45 }; L.life.labels.push(a.label); }
    this.pet = [0, 1].map(() => {
      const s = { kind: 'life', x: 0, y: -100, z: 0, r: 1.7, prompt: '', a: null, t0: null, t1: null };
      s.when = () => !!s.a;
      s.action = (g) => { if (s.a && s.a.onPet) s.a.onPet(g, s.a, this); };
      L.life.interact.push(s);
      return s;
    });
    this.sBark = [0, 1].map((i) => this.slot('bark', 40, 0.5, i));
    this.sYap = [this.slot('yap', 34, 0.45, 0)];
    this.sHoof = [0, 1].map((i) => this.slot('hooves', 50, 0.5, i));
    this.sBell = [this.slot('bell', 60, 0.35, 0)];
    this.sMeow = [this.slot('meow', 18, 0.4, 0)];
    this.spotDefs();
    this.stats = { animals: this.animals.length, handles };
    this.vis = [];
    // horses and the wagon in the road, for traffic to wait behind (see the report: traffic.js reads these)
    this.obstacles = L.life.obstacles = L.life.obstacles || [];
    L.every((rt) => this.tick(rt));
    L.life.animals = this;
  }

  // Spotter's Diary items that follow whichever animal is doing the thing right now. (Pushed straight
  // into life.spottables: L.spottable() copies its argument, which would freeze x/y/z getters.)
  spotDefs() {
    const L = this.L, list = L.life.spottables;
    if (!list) { this.spots = []; return; }
    const defs = [
      ['an_dog_porch', 'A dog asleep on a front porch', 'The east-side streets — look up the front steps', (a) => a.kind === 'dog' && a.P && a.home.where === 'porch' && a.frame === 'lie', '6:20', '21:30'],
      ['an_dog_walk', 'A dog taking its owner for a walk', 'Mornings and evenings, on the residential sidewalks', (a) => a.kind === 'dog' && a.leash, null, null],
      ['an_dog_bark', 'A dog barking at you over the front fence', 'Stroll past the front yards on Maple and Orchard', (a) => a.kind === 'dog' && a.P && a.barking && a.st.mode === 'bark', null, null],
      ['an_dog_chase', 'A child and a dog running round in circles', 'Front yards and Juniper Park, late morning and after lunch', (a) => a.kind === 'dog' && a.sess && a.sess.kind !== 'walk' && a.sess.p.state.act === 'play', null, null],
      ['an_stray', 'A stray hoping for scraps at the butcher\'s', 'Market Street, by Russo\'s Meats', (a) => a.name === 'Scraps' && /Russo/.test(a.cap), '6:00', '21:40'],
      ['an_cat_fence', 'A cat on a fence post', 'Front fences on the east side — cats like the gateposts', (a) => a.kind === 'cat' && a.perch && a.perch.surface === 'fence' && a.st.mode === 'perch' && a.name !== 'Admiral', '6:40', '20:40'],
      ['an_cat_pigeons', 'A cat stalking the pigeons', 'Founders Square — watch the north side', (a) => a.name === 'Duchess' && /stalk|freeze|pounce/.test(a.st.mode || ''), '6:30', '20:50'],
      ['an_squirrel_tree', 'A squirrel scolding you from halfway up a tree', 'Juniper Park — walk up to one and see where it goes', (a) => a.kind === 'squirrel' && a.trees && /climb|perch/.test(a.st.mode || ''), '6:45', '18:45'],
      ['an_ragman', 'The ragman\'s horse and wagon', 'Clip-clopping round the east-side streets after breakfast', (a) => a.name === 'Dolly', null, null],
      ['an_police_horse', 'Duke, the police horse', 'Round Founders Square while the fair is on', (a) => a.name === 'Duke', null, null],
    ];
    this.spots = [];
    for (const [id, what, hint, test, t0, t1] of defs) {
      const need = { an_dog_porch: (a) => a.home && a.home.where === 'porch', an_dog_walk: (a) => a.sessions && a.sessions.some((q) => q.leash), an_dog_bark: (a) => a.barker, an_dog_chase: (a) => a.sessions && a.sessions.some((q) => q.kind === 'yard' || q.kind === 'park'), an_stray: (a) => a.name === 'Scraps', an_cat_fence: (a) => a.perch && a.perch.surface === 'fence' && a.name !== 'Admiral', an_cat_pigeons: (a) => a.name === 'Duchess', an_squirrel_tree: (a) => a.kind === 'squirrel' && a.trees, an_ragman: (a) => a.name === 'Dolly', an_police_horse: (a) => a.name === 'Duke' }[id];
      if (need && !this.animals.some(need)) continue;
      const sp = { id, cat: 'Dogs, cats & horses', what, hint, r: 1.0, range: 22, t0: t0 === null ? null : tm(t0), t1: t1 === null ? null : tm(t1), by: L.id, x: 0, y: -1000, z: 0, test };
      list.push(sp); this.spots.push(sp);
    }
  }

  playerPos(rt) { const pl = rt.player; return pl && pl.mode !== 'aerial' ? pl.pos : null; }

  tick(rt) {
    const cam = rt.cam; if (!cam) return;
    rt.dtc = Math.min(0.1, Math.max(0, rt.dt || 0));
    const pp = this.playerPos(rt);
    this.pp = pp;
    const vis = this.vis; vis.length = 0;
    const obs = this.obstacles; obs.length = 0;
    for (const a of this.animals) {
      if (a.always) a.always(rt, a, this);            // riders' spots move even when nobody is looking
      if (a.locate && !a.locate(rt, a, this)) { a.vis = false; continue; }
      if (a.kind === 'horse' || a.kind === 'wagon') obs.push({ x: a.x, z: a.z, r: 1.3, len: 3 });
      const dx = a.x - cam.x, dz = a.z - cam.z, d2 = dx * dx + dz * dz;
      const R = a.range;
      if (d2 > R * R) { a.vis = false; continue; }
      a.vis = true; a.barking = false; a.moving = false;
      a.update(rt, a, this);
      if (!a.vis) continue;
      a.d2 = (a.x - cam.x) ** 2 + (a.z - cam.z) ** 2;
      vis.push(a);
    }
    vis.sort((p, q) => p.d2 - q.d2);
    // handles, nearest first
    for (const pl of this.pools.values()) pl.used = 0;
    this.leash.used = 0;
    for (const a of vis) {
      let pl = this.pools.get(`${a.model}_${a.frame}`);
      if (!pl || pl.used >= pl.hs.length) { const fb = FALLBACK[a.frame]; pl = fb && this.pools.get(`${a.model}_${fb}`); }
      if (!pl || pl.used >= pl.hs.length) { a.drawn = false; continue; }
      const h = pl.hs[pl.used++];
      h.x = a.x; h.y = a.y; h.z = a.z; h.yaw = a.yaw; h.pitch = a.pitch; h.roll = a.roll; h.scale = a.scale;
      h.tintA = a.tintA ?? 0xffffff; h.tintB = a.tintB ?? 0xffffff; h.room = a.room || 0; h.visible = true;
      a.drawn = true;
      if (a.leash && this.leash.used < this.leash.hs.length) {
        const q = a.leash, h2 = this.leash.hs[this.leash.used++];
        const dx = q.bx - q.ax, dy = q.by - q.ay, dz = q.bz - q.az, hd = Math.hypot(dx, dz), d = Math.hypot(hd, dy);
        h2.x = q.ax; h2.y = q.ay; h2.z = q.az; h2.yaw = Math.atan2(dx, dz); h2.pitch = Math.atan2(-dy, hd); h2.roll = 0; h2.scale = d; h2.visible = true; h2.room = 0;
      }
    }
    for (const pl of this.pools.values()) { for (let i = pl.used; i < pl.prev; i++) pl.hs[i].visible = false; pl.prev = pl.used; }
    { const pl = this.leash; for (let i = pl.used; i < pl.prev; i++) pl.hs[i].visible = false; pl.prev = pl.used; }
    // captions
    for (const a of this.animals) {
      const l = a.label;
      if (a.vis && a.drawn && a.cap && a.d2 < 45 * 45) { l.x = a.x + (a.capDx || 0); l.y = a.y + (a.capY ?? 0.35) * a.scale; l.z = a.z + (a.capDz || 0); l.text = a.cap; l.t0 = 0; l.t1 = 1440; }
      else l.t1 = 0;
    }
    // pet slots: the nearest pettable animals within reach
    const near = pp ? vis.filter((a) => a.onPet && a.drawn && Math.hypot(a.x - pp.x, a.z - pp.z) < 2.4 && Math.abs(a.y - pp.y) < 1.6) : [];
    near.sort((p, q) => Math.hypot(p.x - pp.x, p.z - pp.z) - Math.hypot(q.x - pp.x, q.z - pp.z));
    this.pet.forEach((s, i) => {
      const a = near[i] || null; s.a = a;
      if (a) { const o = a.petAt ? a.petAt(a) : [a.x, a.y + 0.3, a.z]; s.x = o[0]; s.y = o[1]; s.z = o[2]; s.prompt = a.prompt || `Pet ${a.name}`; } else s.y = -100;
    });
    // sound sources
    const on = (slots, list) => slots.forEach((s, i) => { const a = list[i]; if (a) { s.x = a.x; s.y = a.y + 0.4; s.z = a.z; s.t0 = 0; s.t1 = 1440; } else s.t1 = 0; });
    on(this.sBark, vis.filter((a) => a.barking && !a.small));
    on(this.sYap, vis.filter((a) => a.barking && a.small));
    on(this.sHoof, vis.filter((a) => a.kind === 'horse' && a.moving && a.d2 < 60 * 60));
    on(this.sBell, vis.filter((a) => a.bell && a.d2 < 70 * 70));
    on(this.sMeow, vis.filter((a) => a.meowUntil > rt.t));
    // diary items follow the nearest animal doing their thing
    this._spotAcc = (this._spotAcc || 0) + rt.dtc;
    if (this._spotAcc > 0.15) {
      this._spotAcc = 0;
      for (const sp of this.spots) {
        const a = vis.find((q) => q.drawn && q.d2 < 30 * 30 && sp.test(q));
        if (a) { sp.x = a.x; sp.y = a.y + (a.capY ?? 0.3) * a.scale * 0.6; sp.z = a.z; sp.r = Math.max(0.8, a.capR || 0.5); } else sp.y = -1000;
      }
    }
  }
}

// Juniper Park has no front door, so it isn't among L.places: find it among the buildings
function parkOf(Z, name = 'Juniper Park') {
  const b = Z.ctx.buildings.find((q) => q.name === name && q.rect) || Z.ctx.buildings.find((q) => q.kind === 'park' && q.rect && q.name.includes('Park'));
  if (!b) return null;
  const r = b.rect;
  return { name: b.name, rect: r, door: { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 } };
}

// ================================================================================ shared motion
// move toward (tx, tz) at up to `speed` m/s; turns to face the way it goes; keeps an odometer for the legs
function stepTo(Z, a, rt, tx, tz, speed, o = {}) {
  const dt = rt.dtc, dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
  if (d > (o.snap ?? 14)) { a.x = tx; a.z = tz; a.y = Z.ground(tx, tz, (o.yTop ?? a.y + 0.7)); return 0; }
  const k = o.ease ? Math.min(1, dt * o.ease) : 1;
  const step = Math.min(d, Math.max(speed * dt, 0) * (o.ease ? 99 : 1)) * (o.ease ? k : 1);
  if (d > 1e-4 && step > 0) {
    a.x += dx / d * step; a.z += dz / d * step; a.odo += step;
    if (step / Math.max(dt, 1e-3) > 0.12 && !o.keepYaw) a.yaw = turn(a.yaw, Math.atan2(dx, dz), (o.turnRate ?? 7) * dt);
    if (!o.flatY) {
      const moved = Math.hypot(a.x - (a._gx ?? 1e9), a.z - (a._gz ?? 1e9));
      if (moved > 0.12) { a._gx = a.x; a._gz = a.z; a._gy = Z.ground(a.x, a.z, o.yTop ?? a.y + 0.7); }
      a.y += (a._gy - a.y) * Math.min(1, dt * 12);
    }
  }
  a.speedNow = step / Math.max(dt, 1e-3);
  return d - step;
}
// walk / trot / gallop frames from the odometer
function gait(a, spd, strideLen) {
  if (spd < 0.12) return null;
  const k = Math.floor(a.odo / strideLen) % 2;
  if (spd > 2.6) return k ? 'run' : 'walk_a';
  return k ? 'walk_a' : 'walk_b';
}

// ================================================================================ household dogs
function householdDogs(Z) {
  const L = Z.L, rng = Z.rng, nav = Z.nav;
  const homes = L.places.homes.filter((P) => P.kind === 'house' && P.members && P.members.length && P.household && P.household.surname && P.household.surname !== 'Hatch');
  // homes with a doghouse out back have a dog already: it becomes a live one
  const hasDoghouse = new Set();
  for (const P of homes) {
    const r = P.rect, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    if (Z.near(cx, cz, Math.hypot(r.x1 - r.x0, r.z1 - r.z0) / 2 + 1, (q) => q.name === 'doghouse' && q.x >= r.x0 && q.x <= r.x1 && q.z >= r.z0 && q.z <= r.z1).length) hasDoghouse.add(P);
  }
  const kids = (P) => P.members.filter((p) => p.age >= 6 && p.age <= 13).length;
  const order = rng.shuffle(homes.slice()).sort((a, b) => (hasDoghouse.has(b) - hasDoghouse.has(a)) || (Math.min(1, kids(b)) - Math.min(1, kids(a))) * 0.5);
  const breeds = [];
  const want = 40;
  let i = 0;
  const park = parkOf(Z);
  const parkSpots = park ? parkPlaySpots(Z, park) : [];
  Z.dbg.parkSpots = parkSpots.length;
  let parkUsed = 0;
  for (const P of order) {
    if (Z.animals.filter((a) => a.kind === 'dog' && a.P).length >= want) break;
    if (!breeds.length) breeds.push(...rng.shuffle(['terrier', 'setter', 'collie', 'dachshund', 'boxer', 'beagle', 'poodle', 'mutt', 'mutt', 'beagle', 'terrier', 'collie']));
    const breed = breeds.pop(), D = DOG_BREEDS[breed];
    const rest = dogRest(Z, P, D, rng);
    if (!rest) { breeds.push(breed); continue; }
    const coat = rng.pick(COATS[breed]);
    const sex = rng.chance(0.55) ? 'M' : 'F';
    const name = Z.name(DOG_NAMES[sex], rng.int(0, 60));
    const surname = P.household.surname;
    const dog = Z.add({
      kind: 'dog', model: `dog_${breed}`, frames: DOG_FRAMES, breed, D, P, sex, name, surname,
      tintA: pack(coat[0]), tintB: pack(coat[1]), scale: 0.93 + rng.next() * 0.14,
      home: rest, x: rest.x, y: rest.y, z: rest.z, yaw: rest.yaw, frame: 'lie',
      title: `<b>${name}</b> · ${theFamily(surname)} ${BREED_NAME[breed]}`,
      small: D.legH < 0.22, leashable: true, walkers: [], sessions: [],
      barker: rest.where === 'yard' && rng.chance(0.65), friendly: rng.chance(0.85),
      barkWin: [tm('7:10') + rng.int(0, 150), tm('13:00') + rng.int(0, 240)].map((t) => [t, t + 2 + rng.int(0, 2)]),
      capY: D.legH + D.chestD * 0.8, capR: Math.max(0.35, D.bodyL * 0.7),
      update: dogUpdate, locate: dogLocate, onPet: petDog,
      stride: Math.max(0.12, D.legH * 0.75 + 0.04),
    });
    Z.take(rest.x, rest.z, 0.7);
    dog.fence = fenceLine(Z, P, dog);
    // remove the static stand-in dogs (the one by the doghouse, any indoors)
    const r = P.rect;
    for (const q of Z.near((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, Math.hypot(r.x1 - r.x0, r.z1 - r.z0) / 2 + 1, (q) => (q.name === 'dog' || q.name === 'dog_small') && q.x >= r.x0 && q.x <= r.x1 && q.z >= r.z0 && q.z <= r.z1)) Z.removeProp(q);
    // ---- the day: walks morning and evening (sometimes midday), children playing with the dog
    const homeRooms = new Set(P.building.rooms || []);
    const atHome = (p, t) => { const n = L.whereAt(p, t); if (n < 0) return false; const f = nav.info[n]; return f.room ? homeRooms.has(f.room) : Math.hypot(nav.x[n] - P.door.x, nav.z[n] - P.door.z) < 10; };
    const walkers = rng.shuffle(P.members.filter((p) => p.age >= 11 && p.age < 80 && !p.commuter && !p.visitor));
    // try a few start times in the window, and whoever in the family is free
    const plan = (a, b, dur, h, kind) => {
      for (const t0 of spread(a, b, 13, h)) for (const p of walkers) {
        const t1 = t0 + dur;
        if (dog.sessions.some((q) => q.t0 < t1 + 25 && q.t1 + 25 > t0)) continue;
        if (!L.idle(p, t0, t1 + 15) || !atHome(p, t0 - 1) || !atHome(p, t1 + 20)) continue;
        if (walkDog(Z, dog, p, t0, t1, kind)) return p;
      }
      return null;
    };
    plan(tm('6:35'), tm('8:50'), 18 + Math.floor(H(dog.id, 2) * 14), H(dog.id, 1), 'walk');
    // some take the dog along downtown to look in the shop windows
    if (H(dog.id, 13) < 0.3) errand(Z, dog, walkers.filter((p) => p.age >= 16), atHome);
    plan(tm('17:40'), tm('20:20'), 20 + Math.floor(H(dog.id, 4) * 12), H(dog.id, 3), 'walk');
    if (H(dog.id, 5) < 0.4) plan(tm('11:00'), tm('15:40'), 20 + Math.floor(H(dog.id, 7) * 15), H(dog.id, 6), 'walk');
    // children: round the yard, or off to the park with the dog (never while the dog is out walking)
    const nearHome = (p, t, R) => { const n = L.whereAt(p, t); if (n < 0) return false; const f = nav.info[n]; if (f.room) return homeRooms.has(f.room); return Math.hypot(nav.x[n] - P.door.x, nav.z[n] - P.door.z) < R; };
    const dogFree = (t0, t1) => !dog.sessions.some((q) => q.t0 < t1 + 12 && q.t1 + 12 > t0);
    const kidList = rng.shuffle(P.members.filter((p) => p.age >= 6 && p.age <= 13 && !p.visitor));
    for (const [k, kid] of kidList.entries()) {
      if (k > 1) break;
      let done = false;
      if (park && parkUsed < parkSpots.length && Math.hypot(P.door.x - park.door.x, P.door.z - park.door.z) < 320 && H(dog.id, 8, k) < 0.6) {
        for (const t0 of spread(tm('10:05'), tm('16:40'), 17, H(dog.id, 9, k))) {
          if (done) break;
          const t1 = t0 + 40 + Math.floor(H(dog.id, 10, k) * 25);
          if (!dogFree(t0, t1 + 20) || !L.idle(kid, t0, t1 + 25) || !nearHome(kid, t0 - 1, 60) || !nearHome(kid, t1 + 25, 60)) continue;
          playWithDog(Z, dog, kid, t0, t1, parkSpots[parkUsed], 'park'); parkUsed++; done = true;
        }
        if (!done) Z.dbg.parkTime = (Z.dbg.parkTime || 0) + 1;
      }
      if (done) continue;
      const spot = yardPlaySpot(Z, P, dog);
      if (!spot) { Z.dbg.yardSpot = (Z.dbg.yardSpot || 0) + 1; continue; }
      for (const t0 of spread(tm('9:05'), tm('17:30'), 23, H(dog.id, 11, k))) {
        if (done) break;
        const t1 = t0 + 25 + Math.floor(H(dog.id, 12, t0) * 20);
        if (!dogFree(t0, t1) || !L.idle(kid, t0, t1) || !nearHome(kid, t0 - 1, 70)) continue;
        playWithDog(Z, dog, kid, t0, t1, spot, 'yard'); done = true;
      }
      if (!done) Z.dbg.yardTime = (Z.dbg.yardTime || 0) + 1;
    }
    i++;
  }
  const dogs = Z.animals.filter((a) => a.kind === 'dog' && a.P);
  L.scene('Household dogs', 300, 120, '6:15', '21:40', dogs.length);
  L.scene('Dog walks', 300, 120, '6:30', '20:45', dogs.reduce((n, d) => n + d.sessions.filter((s) => s.kind === 'walk').length, 0));
  L.scene('Kids playing with the dog', 300, 120, '9:40', '17:30', dogs.reduce((n, d) => n + d.sessions.filter((s) => s.kind !== 'walk').length, 0));
  L.scene('Window shopping with the dog', 180, 10, '9:50', '17:30', dogs.reduce((n, d) => n + d.sessions.filter((s) => s.errand).length, 0));
}

// candidate start times from a to b every `step` minutes, beginning at a random point and wrapping round
function spread(a, b, step, h) {
  const n = Math.max(1, Math.floor((b - a) / step)), k0 = Math.floor(h * n), out = [];
  for (let k = 0; k < n; k++) out.push(a + ((k0 + k) % n) * step + Math.floor(h * 7));
  return out;
}

function walkDog(Z, dog, p, t0, t1, kind) {
  const L = Z.L, P = dog.P;
  const metres = Math.max(60, (t1 - t0 - 1) * p.speed * 60 * 0.8 * 0.5);
  const route = L.walkRoute(P.walk.x, P.walk.z, metres, Z.rng);
  if (!route || route.length < 3) return false;
  if (!L.stroll(p, t0, t1, { route, label: `Walking ${dog.name}` })) return false;
  tagEntries(L, p, t0, t1, dog, kind);
  dog.sessions.push({ p, t0, t1, kind, leash: p.age >= 13 });
  if (!dog.walkers.includes(p)) dog.walkers.push(p);
  return true;
}
// window shopping on Main / Market Street with the dog sitting at heel
function errand(Z, dog, walkers, atHome) {
  const L = Z.L, P = dog.P;
  const shops = L.places.shops.filter((S) => S.windows && S.kind === 'shop' && Math.hypot(S.door.x - P.door.x, S.door.z - P.door.z) < 480);
  if (!shops.length) return false;
  const S = shops[Math.floor(H(dog.id, 14) * shops.length)];
  Z.winSpots = Z.winSpots || new Map();
  const k = Math.floor(H(dog.id, 15) * 2), key = S.name + k;
  if (!Z.winSpots.has(key)) { const w = S.windows[k]; Z.winSpots.set(key, L.spot(w.x, w.z, { yaw: w.yaw, act: 'browse', label: `Looking in the window at ${S.name}` })); }
  const spot = Z.winSpots.get(key);
  const dist = Math.hypot(S.door.x - P.door.x, S.door.z - P.door.z) * 1.35;
  for (const t0 of spread(tm('9:50'), tm('16:30'), 19, H(dog.id, 16))) {
    for (const p of walkers) {
      const walk = dist / (p.speed * 60), t1 = t0 + walk + 8 + Math.floor(H(dog.id, 17) * 10);
      if (dog.sessions.some((q) => q.t0 < t1 + walk + 15 && q.t1 + 12 > t0)) continue;
      if (!L.idle(p, t0, t1 + walk + 10) || !atHome(p, t0 - 1) || !atHome(p, t1 + walk + 10)) continue;
      L.plan(p, t0, t1, [{ t: t0, spot, act: 'browse', label: `Window shopping at ${S.name}, with ${dog.name}` }]);
      tagEntries(L, p, t0, t1, dog, 'walk');
      dog.sessions.push({ p, t0, t1, kind: 'walk', leash: p.age >= 13, errand: S.name });
      if (!dog.walkers.includes(p)) dog.walkers.push(p);
      return true;
    }
  }
  return false;
}
function playWithDog(Z, dog, kid, t0, t1, spot, kind) {
  const L = Z.L;
  L.block(kid, t0, t1, spot, 'play', { label: kind === 'park' ? `Racing ${dog.name} round Juniper Park` : `Chasing ${dog.name} round the yard` });
  tagEntries(L, kid, t0, t1, dog, kind);
  dog.sessions.push({ p: kid, t0, t1, kind, leash: false });
  if (!dog.walkers.includes(kid)) dog.walkers.push(kid);
  L.sound(spot.x, 0.6, spot.z, t0 + 2, t1, 'kids', { range: 30, vol: 0.35 });
}
function tagEntries(L, p, t0, t1, dog, kind) { for (const e of p.schedule) if (e.life === L.id && e.t >= t0 && e.t < t1 && !e._dog) { e._dog = dog; e._kind = kind; } }

// open lawn in Juniper Park for a child and a dog to run circles on
function parkPlaySpots(Z, park) {
  const r = park.rect, out = [];
  for (let k = 0; k < 400 && out.length < 6; k++) {
    const x = r.x0 + 6 + H(k, 91) * (r.x1 - r.x0 - 12), z = r.z0 + 6 + H(k, 92) * (r.z1 - r.z0 - 12);
    if (out.some((s) => Math.hypot(s.x - x, s.z - z) < 9)) continue;
    if (!circleClear(Z, x, z, 2.3, 0.25)) continue;
    const s = Z.L.spot(x, z, { act: 'play', label: 'Playing in Juniper Park' });
    out.push(s);
  }
  return out;
}
function circleClear(Z, x, z, R, want) {
  for (let k = 0; k <= 12; k++) {
    const a = k / 12 * TAU, rr = k === 12 ? 0 : R;
    const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
    const y = Z.ground(px, pz, 1.5);
    if (Math.abs(y - want) > 0.06 || !Z.clear(px, y, pz, 0.8)) return false;
  }
  return !Z.near(x, z, R + 1.5, (q) => Math.hypot(q.x - x, q.z - z) < R + Math.min(q.r, 1.2) * 0.8 + 0.2).length;
}
// a play circle in the front yard, or the family's back-yard play spot
function yardPlaySpot(Z, P, dog) {
  const L = Z.L;
  for (const side of [-3.5, 3.5, -2.5, 2.5, 0]) for (const out of [-3.2, -3.8, -4.4]) {
    const q = P.at(side, out);
    if (circleClear(Z, q.x, q.z, 2.1, 0.25)) {
      if (Math.hypot(q.x - dog.home.x, q.z - dog.home.z) < 1.2) continue;
      return L.spot(q.x, q.z, { act: 'play', label: `Playing with ${dog.name}` });
    }
  }
  const back = (P.yard || []).find((s) => s.act === 'play' || (s.tags && s.tags.includes('play')));
  return back || null;
}

// where the dog spends the day: on the porch by the door, in the front yard, or on the front walk
function dogRest(Z, P, D, rng) {
  const len = D.bodyL + D.legH * 0.5 + 0.1;
  const u = P.u, r = P.r;
  const frontW = Math.abs(r[0]) ? (P.rect.x1 - P.rect.x0) : (P.rect.z1 - P.rect.z0);
  const cands = [];
  const doorY = P.door.y;
  // porch beside the door (look for porch floor at door height)
  for (const side of [1.0, -1.0, 1.5, -1.5, 2.1, -2.1]) for (const out of [0.9, 1.4, 1.9]) {
    const x = P.door.x + u[0] * out + r[0] * side, z = P.door.z + u[1] * out + r[1] * side;
    cands.push({ x, z, yaw: (side > 0 ? P.yawLeft : P.yawRight) + (rng.next() - 0.5) * 0.5, yTop: doorY + 0.6, want: doorY, where: 'porch' });
  }
  // front yard
  for (const side of [3, -3, 4.2, -4.2, 2.2, -2.2, 5.2, -5.2]) for (const out of [-2.4, -3.0, -1.8]) {
    if (Math.abs(side) > frontW / 2 - 0.8) continue;
    const q = P.at(side, out);
    cands.push({ x: q.x, z: q.z, yaw: P.yawOut + (rng.next() - 0.5) * 1.2, yTop: 1.2, want: 0.25, where: 'yard' });
  }
  // narrow rowhouse fronts: the sidewalk against the house, beside the stoop
  if (frontW < 10) for (const side of [1.5, -1.5, 2.2, -2.2]) { const q = P.at(side, 0.4); cands.push({ x: q.x, z: q.z, yaw: P.yawRight + (side > 0 ? 0 : Math.PI), yTop: 1.2, want: 0.25, where: 'walk' }); }
  // prefer: porch 45%, yard 40%, else whatever fits
  const pref = rng.next();
  const order = pref < 0.45 ? ['porch', 'yard', 'walk'] : pref < 0.85 ? ['yard', 'porch', 'walk'] : ['walk', 'porch', 'yard'];
  for (const w of order) for (const c of cands) {
    if (c.where !== w) continue;
    const y = Z.rest(c.x, c.z, c.yaw, len, c.yTop, c.want, 0.08);
    if (y === null || Z.blocked(c.x, c.z, 0.35, y) || Z.isTaken(c.x, c.z, 0.8)) continue;
    // not in the doorway itself
    if (Math.hypot(c.x - P.door.x, c.z - P.door.z) < 0.75) continue;
    return { x: c.x, y, z: c.z, yaw: c.yaw, where: c.where };
  }
  return null;
}
// the front fence line (just inside the property line) for barking at passers-by
function fenceLine(Z, P, dog) {
  const frontW = Math.abs(P.r[0]) ? (P.rect.x1 - P.rect.x0) : (P.rect.z1 - P.rect.z0);
  const half = frontW / 2 - 0.7;
  return { half, out: -0.55, ok: (side) => { const q = P.at(side, -0.55); return Z.rest(q.x, q.z, P.yawRight, 0.5, 1.2, 0.25, 0.08) !== null; } };
}

// the companion the dog is out with right now (walk, play, or walking home afterwards)
function dogSession(a) {
  for (const p of a.walkers) {
    const S = p.state; if (!S || !S.entry || S.mode === 'hidden' || S.room) continue;
    if (S.spot && S.spot.hidden) continue;
    const e = S.entry;
    if (e._dog === a) return { p, kind: e._kind };
    if (S.mode === 'walk' && S.k > 0) { const prev = p.schedule[S.k - 1]; if (prev && prev._dog === a) return { p, kind: 'home' }; }
  }
  return null;
}
function dogLocate(rt, a) {
  let s = dogSession(a);
  // a dog only joins its person once they're close (walking out of the door, or coming up the street)
  if (s && !a.following) { const S = s.p.state; if (Math.hypot(S.x - a.x, S.z - a.z) > 22) s = null; }
  a.following = !!s; a.sess = s;
  // out of sight the dog isn't updated, so keep its position with its person for the range check
  if (s) { const S = s.p.state; if (Math.hypot(S.x - a.x, S.z - a.z) > 12) { a.x = S.x; a.z = S.z; a.y = S.y; } }
  return true;
}
const nightFor = (m, a) => m < tm('6:15') + (a.id % 5) * 6 || m > tm('21:40') - (a.id % 4) * 8;

function dogUpdate(rt, a, Z) {
  const m = rt.minutes;
  if (a.sess) {
    const p = a.sess.p;
    if (p.ch && !p.ch.pose.visible) { a.vis = false; return; }
    return dogFollow(Z, a, rt, a.sess);
  }
  if (nightFor(m, a)) { a.vis = false; a.x = a.home.x; a.z = a.home.z; a.y = a.home.y; return; }
  dogHome(Z, a, rt);
}

function personPose(p) {
  const P = p.ch && p.ch.pose && p.ch.pose.visible ? p.ch.pose : null, S = p.state;
  return P ? { x: P.x, y: P.y, z: P.z, yaw: P.yaw, P } : { x: S.x, y: S.y, z: S.z, yaw: S.yaw, P: null };
}
// the person's left hand (world), from their current arm swing
function leftHand(p, pose) {
  const P = pose.P, s = (p.ch && p.ch.scale) || 1;
  const pitch = P ? P.aLp : 0, roll = P ? P.aLr : 0.06, bob = P ? P.bob : 0, lean = P ? P.lean : 0;
  const a = DIM.arm - 0.02;
  let x = DIM.shoulderX + a * Math.sin(roll), y = -a * Math.cos(roll), z = 0.02;
  const y2 = y * Math.cos(pitch) - z * Math.sin(pitch), z2 = y * Math.sin(pitch) + z * Math.cos(pitch);
  y = DIM.torsoH - 0.04 + y2; z = z2;
  const y3 = DIM.hipY + y * Math.cos(lean) - z * Math.sin(lean), z3 = y * Math.sin(lean) + z * Math.cos(lean);
  x *= s; const yy = y3 * s, zz = z3 * s;
  const c = Math.cos(pose.yaw), sn = Math.sin(pose.yaw);
  return [pose.x + x * c + zz * sn, pose.y + bob + yy, pose.z - x * sn + zz * c];
}

function dogFollow(Z, a, rt, sess) {
  const p = sess.p, S = p.state, t = rt.t, pose = personPose(p), D = a.D;
  const fx = Math.sin(pose.yaw), fz = Math.cos(pose.yaw), lx = Math.cos(pose.yaw), lz = -Math.sin(pose.yaw);
  const leashed = sess.kind === 'walk' && p.age >= 13;
  const pet = a.st.petUntil > t;
  a.leash = null;
  let frame = null;
  const who = p.first;
  if (S.mode === 'spot' && S.act === 'play' && S.spot) {
    // round and round: the dog chases the child (or is chased) on the same circle
    const A = activity('play'), R = A.circle || 1.6, w = (A.speed || 2) / R * 0.5;
    const ang = t * w + p.ph, lag = 0.95 * Math.sin(t * 0.21 + a.ph);
    const rr = R + 0.25 + 0.2 * Math.cos(t * 0.21 + a.ph);
    const da = ang - lag;
    const tx = S.spot.x + Math.cos(da) * rr, tz = S.spot.z + Math.sin(da) * rr;
    stepTo(Z, a, rt, tx, tz, 6, { snap: 6, yTop: S.y + 0.7 });
    a.yaw = Math.atan2(-Math.sin(da), Math.cos(da));
    frame = gait(a, 3, a.stride * 0.8) || 'run';
    a.cap = `${a.title}, ${sess.kind === 'park' ? `racing ${who} round Juniper Park` : `chasing ${who} round and round the yard`}`;
  } else if (S.mode === 'walk') {
    const side = leashed ? 0.6 : 0.85 + Math.sin(t * 0.7 + a.ph) * 0.3;
    const fwd = leashed ? 0.28 : 0.5 + Math.sin(t * 0.43 + a.ph) * 0.45;
    const tx = pose.x + lx * side + fx * fwd, tz = pose.z + lz * side + fz * fwd;
    const d = Math.hypot(tx - a.x, tz - a.z);
    stepTo(Z, a, rt, tx, tz, d > 1.5 ? 6 : 3.2, { snap: 9, yTop: pose.y + 0.6, turnRate: 9 });
    frame = gait(a, a.speedNow, a.stride) || (Math.sin(t * 13) > 0 ? 'stand' : 'wag');
    if (a.speedNow < 0.12) a.yaw = turn(a.yaw, pose.yaw, rt.dtc * 5);
    a.cap = `${a.title}, ${sess.kind === 'walk' ? `out for a walk with ${who}` : sess.kind === 'home' ? `heading home with ${who}` : `trotting along with ${who}`}`;
  } else {
    // the person has stopped: sit at their side
    const tx = pose.x + lx * 0.6 + fx * 0.15, tz = pose.z + lz * 0.6 + fz * 0.15;
    const left = stepTo(Z, a, rt, tx, tz, 2.5, { snap: 9, yTop: pose.y + 0.6 });
    frame = left > 0.2 ? gait(a, a.speedNow, a.stride) || 'stand' : 'sit';
    if (left <= 0.2) a.yaw = turn(a.yaw, pose.yaw, rt.dtc * 4);
    a.cap = S.act === 'browse' ? `${a.title}, sitting patiently while ${who} looks in the window` : `${a.title}, waiting on ${who}`;
  }
  if (pet) frame = (t - a.st.petAt) < 1.2 ? 'sit' : (Math.sin(t * 14) > 0 ? 'stand' : 'wag');
  a.frame = frame || 'stand';
  a.moving = a.speedNow > 0.2;
  // the leash: from the left hand to the collar
  if (leashed && pose.P) {
    const h = leftHand(p, pose);
    const cf = D.bodyL / 2 + 0.02, cy = a.frame === 'sit' ? D.legH + D.chestD * 0.95 : D.legH + D.chestD * 0.85;
    const bx = a.x + Math.sin(a.yaw) * cf * a.scale, bz = a.z + Math.cos(a.yaw) * cf * a.scale, by = a.y + cy * a.scale;
    if (Math.hypot(bx - h[0], by - h[1], bz - h[2]) < 2.2) a.leash = { ax: h[0], ay: h[1], az: h[2], bx, by, bz };
  }
}

function lineClear(Z, x0, z0, x1, z1, y) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(d / 0.3));
  for (let k = 1; k < n; k++) if (Z.solid(x0 + (x1 - x0) * k / n, y, z0 + (z1 - z0) * k / n)) return false;
  return true;
}
function familyHome(a) {
  const r = a.P.rect;
  return a.P.members.some((p) => { const S = p.state; return S && S.mode === 'spot' && S.x >= r.x0 - 1 && S.x <= r.x1 + 1 && S.z >= r.z0 - 1 && S.z <= r.z1 + 1; });
}
function outsideLot(P, x, z) { const r = P.rect; return x < r.x0 - 0.2 || x > r.x1 + 0.2 || z < r.z0 - 0.2 || z > r.z1 + 0.2; }

function dogHome(Z, a, rt) {
  const m = rt.minutes, t = rt.t, st = a.st, Hm = a.home, P = a.P;
  const pp = Z.pp;
  const dP = pp ? Math.hypot(pp.x - a.x, pp.z - a.z) : 99;
  const where = Hm.where === 'porch' ? 'on the porch' : Hm.where === 'yard' ? 'in the front yard' : 'by the front steps';
  a.leash = null;
  // barking at passers-by (yard dogs) or in their own little windows of the day
  if (a.barker && pp && st.mode !== 'bark' && t > (st.cool || 0) && dP < 11 && outsideLot(P, pp.x, pp.z) && Math.abs(pp.y - a.y) < 2) { st.mode = 'bark'; st.t0 = t; }
  const barkWin = a.barkWin.some(([t0, t1]) => m >= t0 && m < t1);
  if (st.mode === 'bark') {
    // run to the fence opposite the player
    const q = pp || { x: a.x, z: a.z };
    const side = Math.max(-a.fence.half, Math.min(a.fence.half, (q.x - P.at(0, 0).x) * P.r[0] + (q.z - P.at(0, 0).z) * P.r[1]));
    const f = P.at(side, a.fence.out);
    const left = stepTo(Z, a, rt, f.x, f.z, 3.4, { snap: 20, yTop: 1.2 });
    if (left > 0.15) a.frame = gait(a, a.speedNow, a.stride) || 'stand';
    else { a.yaw = turn(a.yaw, Math.atan2(q.x - a.x, q.z - a.z), rt.dtc * 6); a.frame = Math.sin(t * 9) > 0.3 ? 'wag' : 'stand'; a.pitch = Math.sin(t * 9) > 0.3 ? -0.06 : 0; a.barking = true; }
    a.moving = left > 0.15;
    a.cap = `${a.title}, telling you exactly what ${a.sex === 'M' ? 'he' : 'she'} thinks of you`;
    if (!pp || dP > 17 || t - st.t0 > 16) { st.mode = 'return'; st.cool = t + 45; a.pitch = 0; }
    return;
  }
  a.pitch = 0;
  const dh = Math.hypot(a.x - Hm.x, a.z - Hm.z);
  // coming back from the back yard or down the street: if a wall is in the way, it went round (snap)
  if (dh > 2.5 && st.mode !== 'return' && !lineClear(Z, a.x, a.z, Hm.x, Hm.z, Math.max(a.y, Hm.y) + 0.3)) { a.x = Hm.x; a.z = Hm.z; a.y = Hm.y; }
  if (dh > 0.15) {
    // trot back to the resting place (after a walk, a bark, a game)
    stepTo(Z, a, rt, Hm.x, Hm.z, dh > 3 ? 2.2 : 1.3, { snap: 30, yTop: Math.max(Hm.y, a.y) + 0.7 });
    a.frame = gait(a, a.speedNow, a.stride) || 'stand';
    a.moving = true;
    a.cap = `${a.title}, trotting home`;
    return;
  }
  a.x = Hm.x; a.z = Hm.z; a.y += (Hm.y - a.y) * Math.min(1, rt.dtc * 10);
  st.mode = 'rest';
  // resting pose from the clock (afternoons are for napping)
  const nap = m > tm('12:30') && m < tm('15:40');
  const h = H(a.id, Math.floor(m / 9), 5);
  let pose = h < (nap ? 0.55 : 0.32) ? 'lie' : h < (nap ? 0.82 : 0.68) ? 'lie_up' : h < 0.96 ? 'sit' : 'stand';
  let yaw = Hm.yaw;
  let cap;
  const home = familyHome(a);
  // someone from the family walking up or leaving: up and wagging
  let greet = null;
  for (const p of P.members) { const S = p.state; if (S && S.mode === 'walk' && !S.room && Math.hypot(S.x - a.x, S.z - a.z) < 8) { greet = p; break; } }
  if (a.st.petUntil > t) {
    pose = (t - a.st.petAt) < 1.4 ? 'sit' : (Math.sin(t * 14) > 0 ? 'stand' : 'wag');
    if (pp) yaw = Math.atan2(pp.x - a.x, pp.z - a.z);
    cap = `${a.title}, enjoying the attention`;
  } else if (greet) {
    pose = Math.sin(t * 14) > 0 ? 'stand' : 'wag'; yaw = Math.atan2(greet.state.x - a.x, greet.state.z - a.z);
    cap = `${a.title}, wagging at ${greet.first}`;
  } else if (barkWin) {
    pose = Math.sin(t * 8) > 0.2 ? 'wag' : 'stand'; a.barking = Math.sin(t * 0.9 + a.ph) > -0.2;
    cap = `${a.title}, barking at ${['the milk truck', 'a squirrel', 'the mailman', 'nothing at all', 'the Hendersons\' cat'][a.id % 5]}`;
  } else if (pp && dP < 3.4 && a.friendly) {
    pose = Math.sin(t * 13) > 0 ? 'stand' : 'wag'; yaw = Math.atan2(pp.x - a.x, pp.z - a.z);
    cap = `${a.title}, hoping you have a biscuit`;
  } else if (pp && dP < 8 && pose === 'lie') {
    pose = 'lie_up'; yaw = Hm.yaw + Math.max(-0.7, Math.min(0.7, wrapA(Math.atan2(pp.x - a.x, pp.z - a.z) - Hm.yaw)));
  }
  a.yaw = turn(a.yaw, yaw, rt.dtc * 5);
  a.frame = pose;
  if (!cap) {
    if (pose === 'lie') cap = `${a.title}, asleep ${where}`;
    else if (!home) cap = `${a.title}, waiting ${where} for ${theFamily(a.surname).slice(0, -1)} to come home`;
    else if (pose === 'lie_up') cap = `${a.title}, keeping an eye on the street`;
    else if (pose === 'sit') cap = `${a.title}, sitting ${where}, waiting for something to happen`;
    else cap = `${a.title}, ${where}`;
  }
  a.cap = cap;
}

function petDog(g, a) {
  const t = g.time;
  a.st.petUntil = t + 4.5; a.st.petAt = t;
  const he = a.sex === 'M' ? 'he' : 'she', him = a.sex === 'M' ? 'him' : 'her', his = a.sex === 'M' ? 'his' : 'her';
  const fill = (s) => s.replace(/\{N\}/g, a.name).replace(/\{he\}/g, he).replace(/\{He\}/g, cap1(he)).replace(/\{him\}/g, him).replace(/\{his\}/g, his).replace(/\{dog\}/g, a.sex === 'M' ? 'boy' : 'girl');
  const n = (a.petN = (a.petN || 0) + 1);
  const line = a.petLines ? a.petLines[(n - 1) % a.petLines.length] : PET_LINES[(a.id + n) % PET_LINES.length];
  g.hud.toast(fill(line), 4);
  const owner = a.sess && a.sess.p;
  if (owner && g.bubbles && owner.ch && owner.ch.pose.visible) g.bubbles.say(owner, fill(OWNER_LINES[(a.id + n) % OWNER_LINES.length]), t, 3.5);
}

// ================================================================================ strays
// Three town dogs doing their rounds: the butcher's side door, the bakery, the fish pier, the diner,
// the station — with a sniff at every hydrant and lamppost on the way. Position is a pure function of
// the clock (a looping itinerary).
function strays(Z) {
  const L = Z.L;
  const defs = [
    { name: 'Scraps', breed: 'mutt', coat: ['#7a5a3a', '#e8e0d0'], sex: 'M', title: '<b>Scraps</b> · a stray mutt nobody owns and everybody feeds', sleep: 'Russo\'s Meats',
      stops: [['Russo\'s Meats', 2.6, 0.6, 14, 'sit', 'waiting hopefully by Russo\'s Meats'], ['Halloran & Sons Bakery', -2.4, 0.7, 7, 'sit', 'hoping for a dropped cruller outside Halloran\'s'], ['Castellano Fish Market', 2.4, 0.6, 10, 'lie', 'dozing outside Castellano\'s, downwind of the haddock'], ['Harbor Light Diner', 1.8, 0.8, 9, 'sit', 'waiting at the Harbor Light Diner door']] },
    { name: 'Jiggs', breed: 'terrier', coat: ['#6a4a2a', '#1e1c1a'], sex: 'M', title: '<b>Jiggs</b> · the waterfront\'s own terrier', sleep: 'Pier 3 Sheds',
      stops: [['Castellano Fish Co.', 'quay', 0, 16, 'lie', 'on the fish pier, hoping for scraps'], ['Pier 3 Sheds', 1.8, 0.7, 6, 'sit', 'watching the gulls with dark suspicion'], ['The Clam Shack', 2.2, 0.8, 11, 'sit', 'begging at the Clam Shack'], ['Harbor Master', -2.0, 0.7, 8, 'lie', 'napping in the sun by the Harbor Master\'s']] },
    { name: 'Old Bones', breed: 'collie', coat: ['#8a7a6a', '#3a3430'], sex: 'M', title: '<b>Old Bones</b> · an old stray collie, grey in the muzzle', sleep: 'Union Station',
      stops: [['Union Station', 4.5, 1.0, 15, 'lie', 'asleep in the sun by the station doors'], ['Station Luncheonette', -2.2, 0.7, 10, 'sit', 'waiting at the Luncheonette for a crust'], ['Mill Street Garage', 3.0, 0.8, 9, 'lie', 'lying on the warm concrete at the garage'], ['Kowalski\'s Market', -2.0, 0.7, 7, 'sit', 'watching the door at Kowalski\'s Market']] },
  ];
  for (const d of defs) {
    const stops = [];
    for (const [bn, side, out, dwell, pose, cap] of d.stops) {
      const P = L.place(bn); if (!P) continue;
      let q;
      if (side === 'quay') { const b = P.building, e = b.entrances.find((e) => e.pos && e.pos[0] < P.rect.x0 + 2); q = e ? { x: e.pos[0] - 1.6, z: e.pos[2] + 2.2 } : null; }
      else q = P.at(side, out);
      if (!q) continue;
      const y = Z.ground(q.x, q.z, 1.5);
      if (!Z.clear(q.x, y, q.z, 0.5)) continue;
      stops.push({ x: q.x, z: q.z, y, dwell, pose, cap, yaw: P.yawOut + (H(stops.length, 3) - 0.5) });
    }
    if (stops.length < 2) continue;
    const it = itinerary(Z, stops, 72);
    if (!it) continue;
    const D = DOG_BREEDS[d.breed];
    const a = Z.add({
      kind: 'dog', model: `dog_${d.breed}`, frames: DOG_FRAMES, breed: d.breed, D, name: d.name, sex: d.sex, title: d.title,
      tintA: pack(d.coat[0]), tintB: pack(d.coat[1]), scale: 1, it, stray: true, small: D.legH < 0.22,
      capY: D.legH + D.chestD * 0.8, capR: 0.5, stride: Math.max(0.12, D.legH * 0.75 + 0.04),
      x: stops[0].x, y: stops[0].y, z: stops[0].z,
      update: strayUpdate, onPet: petDog, locate: strayLocate,
      petLines: [`${d.name} flinches, then lets you scratch behind one ragged ear.`, `${d.name} sniffs your hand for sausage. Finding none, forgives you anyway.`, `${d.name} leans on you briefly, the way old sailors lean on a bar.`],
    });
    a.sleepAt = stops[0];
  }
  L.scene('Town strays', 90, -60, '6:00', '21:40', Z.animals.filter((a) => a.stray).length);
}

// a looping itinerary through stops (with sniffs at posts on the way): legs of {move | stay}
function itinerary(Z, stops, speed) {
  const legs = [];
  const posts = (x, z) => Z.near(x, z, 1.9, (q) => /^(fire_hydrant|street_lamp|parking_meter|mailbox_usps|fire_alarm_box)/.test(q.name));
  for (let i = 0; i < stops.length; i++) {
    const A = stops[i], B = stops[(i + 1) % stops.length];
    legs.push({ type: 'stay', x: A.x, z: A.z, y: A.y, yaw: A.yaw, pose: A.pose, dur: A.dwell, cap: A.cap });
    const na = Z.walkNode(A.x, A.z), nb = Z.walkNode(B.x, B.z);
    const mid = Z.outdoorPath(na, nb);
    if (!mid) return null;
    const pts = [[A.x, A.z], ...mid, [B.x, B.z]];
    // walk the path, pausing at posts close to it
    const seen = new Set();
    let run = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const [x0, z0] = pts[k - 1], [x1, z1] = pts[k];
      const L = Math.hypot(x1 - x0, z1 - z0);
      for (let s = 0; s < L; s += 2) {
        const x = x0 + (x1 - x0) * s / L, z = z0 + (z1 - z0) * s / L;
        for (const q of posts(x, z)) {
          if (seen.has(q.i) || seen.size > 6) continue;
          seen.add(q.i);
          const dd = Math.hypot(q.x - x, q.z - z) || 1;
          const sx = q.x + (x - q.x) / dd * 0.55, sz = q.z + (z - q.z) / dd * 0.55;
          run.push([sx, sz]); legs.push(moveLeg(run, speed));
          legs.push({ type: 'stay', x: sx, z: sz, y: null, yaw: Math.atan2(q.x - sx, q.z - sz), pose: 'stand', dur: 0.3 + H(q.i, 7) * 0.4, cap: /hydrant/.test(q.name) ? 'giving the fire hydrant a thorough reading' : 'sniffing the lamppost for news' });
          run = [[sx, sz]];
        }
      }
      run.push([x1, z1]);
    }
    legs.push(moveLeg(run, speed));
  }
  let T = 0; for (const g of legs) { g.t0 = T; T += g.dur; }
  return { legs, period: T };
}
function moveLeg(pts, speed) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return { type: 'move', pts, cum, len, dur: Math.max(0.05, len / speed) };
}
function alongPoly(g, d, out) {
  const { pts, cum } = g;
  let lo = 1, hi = cum.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < d) lo = mid + 1; else hi = mid; }
  const i = lo;
  const seg = cum[i] - cum[i - 1] || 1, k = Math.max(0, Math.min(1, (d - cum[i - 1]) / seg));
  const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
  out.x = x0 + (x1 - x0) * k; out.z = z0 + (z1 - z0) * k;
  if (Math.abs(x1 - x0) + Math.abs(z1 - z0) > 1e-3) out.yaw = Math.atan2(x1 - x0, z1 - z0);
  return out;
}
function itinAt(it, m) {
  const tt = ((m % it.period) + it.period) % it.period;
  let lo = 0, hi = it.legs.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (it.legs[mid].t0 <= tt) lo = mid; else hi = mid - 1; }
  return [it.legs[lo], tt - it.legs[lo].t0];
}

function strayLocate(rt, a) {
  const m = rt.minutes;
  if (m < tm('6:00') || m > tm('21:40')) { a.x = a.sleepAt.x; a.z = a.sleepAt.z; return true; }
  const [g, el] = itinAt(a.it, m);
  if (g.type === 'stay') { if (Math.hypot(g.x - a.x, g.z - a.z) > 6) { a.x = g.x; a.z = g.z; } }
  else { const o = alongPoly(g, Math.min(g.len, el / g.dur * g.len), {}); if (Math.hypot(o.x - a.x, o.z - a.z) > 6) { a.x = o.x; a.z = o.z; } }
  return true;
}
function strayUpdate(rt, a, Z) {
  const m = rt.minutes, t = rt.t;
  a.leash = null;
  if (m < tm('6:00') || m > tm('21:40')) {
    const s = a.sleepAt; a.x = s.x; a.z = s.z; a.y = s.y; a.yaw = s.yaw; a.frame = 'lie'; a.cap = `${a.title}, curled up asleep in a doorway`; return;
  }
  const [g, el] = itinAt(a.it, m);
  if (g.type === 'move') {
    const o = alongPoly(g, Math.min(g.len, el / g.dur * g.len), {});
    // keep to the building side of the walk a little
    const ox = Math.cos(o.yaw ?? a.yaw) * 0.7, oz = -Math.sin(o.yaw ?? a.yaw) * 0.7;
    const px = a.x, pz = a.z;
    a.x = o.x + ox; a.z = o.z + oz;
    const moved = Math.hypot(a.x - px, a.z - pz);
    a.odo += Math.min(moved, 1);
    if (o.yaw !== undefined) a.yaw = turn(a.yaw, o.yaw, rt.dtc * 8 + (moved > 2 ? 9 : 0));
    const spd = moved / Math.max(rt.dtc, 1e-3);
    a.frame = gait(a, Math.min(spd, 2.4), a.stride) || 'stand';
    if (Math.hypot(a.x - (a._gx ?? 1e9), a.z - (a._gz ?? 1e9)) > 0.15) { a._gx = a.x; a._gz = a.z; a._gy = Z.ground(a.x, a.z, 1.2); }
    a.y = a._gy ?? a.y;
    a.moving = true;
    a.cap = `${a.title}, trotting along on ${['important business', 'his rounds', 'the scent of something'][a.id % 3]}`;
  } else {
    a.x = g.x; a.z = g.z; if (g.y === null) g.y = Z.ground(g.x, g.z, 1.2); a.y = g.y;
    a.yaw = turn(a.yaw, g.yaw, rt.dtc * 6);
    a.frame = g.pose === 'stand' ? (Math.sin(t * 3 + a.ph) > 0.6 ? 'wag' : 'stand') : g.pose;
    a.pitch = g.pose === 'stand' ? 0.12 : 0;   // nose down to the post
    a.cap = `${a.title}, ${g.cap}`;
  }
  if (a.st.petUntil > t) { a.frame = (t - a.st.petAt) < 1.2 ? 'sit' : (Math.sin(t * 14) > 0 ? 'stand' : 'wag'); a.pitch = 0; }
  if (g.type !== 'stay' || g.pose !== 'stand') a.pitch = 0;
}

// ================================================================================ cats
function makeCat(Z, o) {
  const a = Z.add({
    kind: 'cat', model: `cat_${o.coat}`, frames: CAT_FRAMES, scale: o.scale || 1, tintA: pack(o.a), tintB: pack(o.b || o.a),
    name: o.name, sex: o.sex || (H(Z.animals.length, 4) < 0.5 ? 'M' : 'F'), title: o.title, perch: o.perch,
    x: o.perch.x, y: o.perch.y, z: o.perch.z, yaw: o.perch.yaw, frame: 'sit',
    capY: 0.2, capR: 0.35, where: o.where, update: o.update || catUpdate, onPet: petCat, prompt: `Stroke ${o.name}`,
    hours: o.hours || [tm('6:40'), tm('20:40')],
  });
  Z.take(o.perch.x, o.perch.z, 0.5);
  return a;
}
function cats(Z) {
  const L = Z.L, rng = Z.rng;
  const dogHomes = new Set(Z.animals.filter((a) => a.kind === 'dog' && a.P).map((a) => a.P));
  const homes = rng.shuffle(L.places.homes.filter((P) => P.kind === 'house' && P.household && P.household.surname && P.household.surname !== 'Hatch'));
  const coats = [['tabby', '#8a8074', '#3a3430'], ['tabby', '#c8742a', '#8a4418'], ['solid', '#1e1c1c', '#1e1c1c'], ['solid', '#1e1c1c', '#ece6d8'], ['calico', '#c8742a', '#2a2622'], ['tabby', '#9a7a5a', '#4a3424'], ['solid', '#8a8a88', '#ece6d8'], ['calico', '#d08a3a', '#3a3430']];
  const coatName = { tabby: (c) => (c[1] === '#c8742a' ? 'ginger tom' : 'tabby'), solid: (c) => (c[1] === '#1e1c1c' ? (c[2] === '#1e1c1c' ? 'black cat' : 'tuxedo cat') : 'grey-and-white cat'), calico: () => 'calico' };
  let n = 0;
  for (const P of homes) {
    if (n >= 16) break;
    if (dogHomes.has(P) && rng.chance(0.75)) continue;
    const perch = catPerch(Z, P, rng);
    if (!perch) continue;
    const c = coats[n % coats.length];
    const name = Z.name(CAT_NAMES, rng.int(0, 50));
    const kind = coatName[c[0]](c);
    makeCat(Z, { coat: c[0], a: c[1], b: c[2], name, perch, where: perch.where, title: `<b>${name}</b> · ${theFamily(P.household.surname)} ${kind}`, P });
    n++;
  }
  // town cats
  const town = [
    ['Castellano Fish Co.', 'quayCat', 'Mackerel', ['tabby', '#8a8074', '#3a3430'], 'the fish-house cat, who has never once paid for a sardine', 1.08],
    ['Carnegie Library', 'step', 'Dewey', ['tabby', '#c8742a', '#8a4418'], 'the library cat, shelved under Sleeping', 1.1],
    ['Russo\'s Meats', 'window', 'Salami', ['solid', '#1e1c1c', '#ece6d8'], 'Mr. Russo\'s mouser, on duty', 1.0],
    ['Nets & Tackle', 'window', 'Barnacle', ['calico', '#c8742a', '#2a2622'], 'the tackle shop cat', 0.95],
    ['Garrity Hardware', 'window', 'Nails', ['solid', '#8a8a88', '#ece6d8'], 'the hardware-store cat, guarding the seed display', 1.0],
    ['St. Brigid\'s Church', 'step', 'Sister Mary Pussycat', ['solid', '#1e1c1c', '#1e1c1c'], 'the parish cat, who attends every Mass and pays no attention', 1.0],
  ];
  for (const [bn, how, name, c, blurb, scale] of town) {
    const P = L.place(bn); if (!P) continue;
    const perch = townPerch(Z, P, how);
    if (!perch) continue;
    Z.used.add(name);
    makeCat(Z, { coat: c[0], a: c[1], b: c[2], name, perch, where: perch.where, title: `<b>${name}</b> · ${blurb}`, scale });
  }
  squareCat(Z);
  L.scene('Cats', 300, 120, '6:40', '20:40', Z.animals.filter((a) => a.kind === 'cat').length);
}
// porch step, fence post, the hood of the car in the drive, or the front lawn
function catPerch(Z, P, rng) {
  const u = P.u, r = P.r;
  const frontW = Math.abs(r[0]) ? (P.rect.x1 - P.rect.x0) : (P.rect.z1 - P.rect.z0);
  const tries = [];
  // porch edge (top of the steps), a little to the side of the front walk
  let edge = null;
  for (let out = -1; out > -12; out -= 0.25) { const q = P.at(0, out); if (Z.ground(q.x, q.z, P.door.y + 0.4) >= P.door.y - 0.05) { edge = out; break; } }
  if (edge !== null) for (const side of [0.9, -0.9, 1.3, -1.3]) tries.push(['step', P.at(side, edge - 0.2), P.yawOut + (side > 0 ? 0.4 : -0.4), P.door.y + 0.4, P.door.y]);
  // fence posts: a voxel fence along the property line
  for (const side of [1.1, -1.1, 1.6, -1.6, 3, -3]) { if (Math.abs(side) > frontW / 2 - 0.4) continue; tries.push(['fence', P.at(side, -0.06), P.yawRight + (side > 0 ? 0 : Math.PI), 1.6, null]); }
  // the car in the drive
  const cars = Z.near((P.rect.x0 + P.rect.x1) / 2, (P.rect.z0 + P.rect.z1) / 2, 20, (q) => /^car_(sedan|coupe|wagon|convertible)$/.test(q.name) && q.x > P.rect.x0 && q.x < P.rect.x1 && q.z > P.rect.z0 && q.z < P.rect.z1 && q.y < 0.6);
  for (const c of cars) { const hood = /sedan|convertible/.test(c.name) ? 1.0 : 0.94; tries.push(['car', { x: c.x + Math.sin(c.yaw) * 1.35, z: c.z + Math.cos(c.yaw) * 1.35 }, c.yaw + Math.PI / 2, null, c.y + hood, c]); }
  // front lawn
  for (const side of [2.5, -2.5, 4, -4]) { if (Math.abs(side) > frontW / 2 - 0.6) continue; tries.push(['lawn', P.at(side, -1.8), P.yawOut + 0.7, 1.2, 0.25]); }
  const pref = rng.next();
  const order = pref < 0.3 ? ['step', 'fence', 'car', 'lawn'] : pref < 0.55 ? ['fence', 'step', 'car', 'lawn'] : pref < 0.8 ? ['car', 'step', 'fence', 'lawn'] : ['lawn', 'step', 'fence', 'car'];
  for (const w of order) for (const [kind, q, yaw, yTop, want, car] of tries) {
    if (kind !== w) continue;
    if (Z.isTaken(q.x, q.z, 0.6)) continue;
    let y;
    if (kind === 'car') { y = want; if (!Z.clear(q.x, y, q.z, 3.0)) continue; }   // out in the sun, not in the garage
    else if (kind === 'fence') {
      y = Z.ground(q.x, q.z, yTop);
      if (y < 0.7 || y > 1.3 || !Z.clear(q.x, y, q.z, 0.3)) continue;
    } else {
      y = Z.rest(q.x, q.z, yaw, 0.35, yTop, want, 0.08, 0.35);
      if (y === null || Z.blocked(q.x, q.z, 0.25, y)) continue;
    }
    const where = { step: 'on the porch steps', fence: 'on the fence post', car: `on the hood of the ${car ? { car_sedan: 'sedan', car_coupe: 'coupe', car_wagon: 'station wagon', car_convertible: 'convertible' }[car.name] : 'car'}, where the sun hits it`, lawn: 'in the front grass, watching the sparrows' }[kind];
    return { x: q.x, y, z: q.z, yaw, where, surface: kind, P };
  }
  return null;
}
function townPerch(Z, P, how) {
  if (how === 'quayCat') {
    const e = P.building.entrances.find((e) => e.pos && e.pos[0] < P.rect.x0 + 2);
    if (!e) return null;
    const x = e.pos[0] - 1.2, z = e.pos[2] - 2.4, y = Z.ground(x, z, 1.5);
    return Z.clear(x, y, z, 0.4) ? { x, y, z, yaw: -Math.PI / 2 + 0.4, where: 'sitting by the fish-house door, supervising', surface: 'quay' } : null;
  }
  for (const side of how === 'window' ? [-2.4, 2.4, -3.2, 3.2] : [1.6, -1.6, 2.4, -2.4, 1.0, -1.0]) for (const out of how === 'window' ? [0.35, 0.5] : [-0.6, 0.4, -1.2, 0.8]) {
    const q = P.at(side, out);
    const y = Z.rest(q.x, q.z, P.yawRight, 0.35, P.door.y + 1.0, null, 0.08, 0.35);
    if (y === null || Z.blocked(q.x, q.z, 0.2, y) || Z.isTaken(q.x, q.z, 0.6)) continue;
    return { x: q.x, y, z: q.z, yaw: P.yawOut + (side > 0 ? 0.5 : -0.5), where: how === 'window' ? `sitting in front of ${P.name}` : `on the steps of ${P.name}`, surface: how };
  }
  return null;
}

function catUpdate(rt, a, Z) {
  const m = rt.minutes, t = rt.t, st = a.st, pp = Z.pp;
  if (m < a.hours[0] || m > a.hours[1]) { a.vis = false; return; }
  const dP = pp ? Math.hypot(pp.x - a.x, pp.z - a.z) : 99;
  const petting = st.petUntil > t;
  // alarmed by the player coming close: look, then saunter off (unless it's being stroked)
  if (!st.mode) st.mode = 'perch';
  if (st.mode === 'perch' && pp && dP < 2.0 && Math.abs(pp.y - a.y) < 1.8) { st.mode = 'alert'; st.t0 = t; }
  if (st.mode === 'alert') {
    a.frame = 'stand'; a.yaw = turn(a.yaw, Math.atan2((pp ? pp.x : a.x) - a.x, (pp ? pp.z : a.z) - a.z), rt.dtc * 4);
    a.cap = `${a.title}, eyeing you`;
    if (petting) return;
    if (st.petDone || t - st.t0 > 2.6) { if (pp && dP < 2.6) startSaunter(Z, a, rt, pp); else st.mode = 'perch'; }
    return;
  }
  if (st.mode === 'hop') {
    // down off a fence, step or car: a little arc
    const k = Math.min(1, (t - st.t0) / 0.45);
    a.x = st.fx + (st.tx - st.fx) * k; a.z = st.fz + (st.tz - st.fz) * k;
    a.y = st.fy + (st.ty - st.fy) * k + Math.sin(k * Math.PI) * 0.25;
    a.frame = 'walk_a';
    if (k >= 1) { st.mode = 'saunter'; }
    return;
  }
  if (st.mode === 'saunter' || st.mode === 'back') {
    const tgt = st.mode === 'back' ? a.perch : st.goal;
    const left = stepTo(Z, a, rt, tgt.x, tgt.z, 0.75, { snap: 25, yTop: Math.max(a.y, 0.25) + 0.6, flatY: st.mode === 'back' && a.perch.surface !== 'lawn' && Math.hypot(tgt.x - a.x, tgt.z - a.z) < 0.6 });
    a.frame = gait(a, a.speedNow, 0.09) || 'stand';
    a.cap = st.mode === 'back' ? `${a.title}, strolling back as if nothing happened` : `${a.title}, walking away from you with great dignity`;
    if (left < 0.1) {
      if (st.mode === 'back') { a.y = a.perch.y; a.yaw = a.perch.yaw; st.mode = 'perch'; }
      else { st.mode = 'away'; st.t0 = t; }
    }
    return;
  }
  if (st.mode === 'away') {
    a.frame = H(a.id, Math.floor(t / 20)) < 0.5 ? 'sit' : 'loaf';
    a.cap = `${a.title}, pointedly ignoring you`;
    if (t - st.t0 > 40 && (!pp || dP > 7)) {
      // back to the perch (jumping back up where needed)
      if (a.perch.surface === 'fence' || a.perch.surface === 'car' || a.perch.surface === 'step') {
        const P0 = a.perch, gx = P0.x + Math.sin(P0.yaw + Math.PI / 2) * 0.5, gz = P0.z + Math.cos(P0.yaw + Math.PI / 2) * 0.5;
        const left = stepTo(Z, a, rt, gx, gz, 0.7, { snap: 25 });
        a.frame = gait(a, a.speedNow, 0.09) || 'stand';
        if (left < 0.1) { st.mode = 'hopup'; st.t0 = t; st.fx = a.x; st.fz = a.z; st.fy = a.y; }
      } else st.mode = 'back';
    }
    return;
  }
  if (st.mode === 'hopup') {
    const k = Math.min(1, (t - st.t0) / 0.45), P0 = a.perch;
    a.x = st.fx + (P0.x - st.fx) * k; a.z = st.fz + (P0.z - st.fz) * k; a.y = st.fy + (P0.y - st.fy) * k + Math.sin(k * Math.PI) * 0.3;
    a.frame = 'walk_b';
    if (k >= 1) { st.mode = 'perch'; a.yaw = P0.yaw; }
    return;
  }
  // on the perch: sit / loaf / curl up by the clock
  a.x = a.perch.x; a.z = a.perch.z; a.y = a.perch.y;
  const h = H(a.id, Math.floor(m / 13), 9);
  let f = h < 0.35 ? 'curl' : h < 0.7 ? 'loaf' : 'sit';
  if (a.perch.surface === 'fence' && f === 'curl') f = 'loaf';
  if (pp && dP < 6 && f === 'curl') f = 'loaf';
  if (petting) f = 'sit';
  a.frame = f;
  a.yaw = turn(a.yaw, a.perch.yaw, rt.dtc * 3);
  a.cap = `${a.title}, ${f === 'curl' ? 'asleep ' : ''}${a.perch.where}`;
}
function startSaunter(Z, a, rt, pp) {
  const st = a.st;
  // walk away from the player, somewhere flat on the ground
  const away = Math.atan2(a.x - pp.x, a.z - pp.z);
  let goal = null;
  for (const da of [0, 0.6, -0.6, 1.2, -1.2, 2.0, -2.0]) for (const d of [4.5, 3.2, 2.2]) {
    const x = a.x + Math.sin(away + da) * d, z = a.z + Math.cos(away + da) * d;
    const y = Z.ground(x, z, 1.4);
    if (y > 0.6 || !Z.clear(x, y, z, 0.35) || Z.blocked(x, z, 0.2, y)) continue;
    // clear straight line (no walls)
    let ok = true; for (let k = 1; k < 6; k++) { const px = a.x + (x - a.x) * k / 6, pz = a.z + (z - a.z) * k / 6; const py = Z.ground(px, pz, Math.max(a.y, 0.25) + 0.5); if (py > Math.max(a.y, 0.3) + 0.3 || !Z.clear(px, py, pz, 0.3)) ok = false; }
    if (ok) { goal = { x, y, z }; break; }
  }
  if (!goal) { st.mode = 'perch'; return; }
  st.goal = goal;
  const high = a.y > 0.45;
  if (high) {
    // hop down first, a step toward the goal
    const dd = Math.hypot(goal.x - a.x, goal.z - a.z) || 1;
    const tx = a.x + (goal.x - a.x) / dd * 0.6, tz = a.z + (goal.z - a.z) / dd * 0.6;
    Object.assign(st, { mode: 'hop', t0: rt.t, fx: a.x, fz: a.z, fy: a.y, tx, tz, ty: Z.ground(tx, tz, 0.9) });
    a.yaw = Math.atan2(goal.x - a.x, goal.z - a.z);
  } else st.mode = 'saunter';
}
function petCat(g, a) {
  const t = g.time, st = a.st;
  if (st.petDone && t - st.petAt < 30) { g.hud.toast(`${a.name} has had quite enough attention for one day, thank you.`, 3); return; }
  st.petUntil = t + 1.3; st.petAt = t; st.petDone = true;
  if (st.mode === 'perch') { st.mode = 'alert'; st.t0 = t; }
  a.meowUntil = t + 3;
  const his = a.sex === 'M' ? 'his' : 'her';
  const n = (a.petN = (a.petN || 0) + 1);
  const line = a.petLines ? a.petLines[(n - 1) % a.petLines.length] : CAT_PET[(a.id + n) % CAT_PET.length];
  g.hud.toast(line.replace(/\{N\}/g, a.name).replace(/\{his\}/g, his), 4);
}

// a cat at the edge of Founders Square stalking the pigeons (the live ones in src/sim/birds.js)
function squareCat(Z) {
  const x = (SQUARE.x0 + SQUARE.x1) / 2 + 2, z = SQUARE.z0 + 2.8, y = Z.ground(x, z, 1.2);
  if (!Z.clear(x, y, z, 0.4)) return;
  Z.used.add('Duchess');
  makeCat(Z, { coat: 'calico', a: '#c8742a', b: '#2a2622', name: 'Duchess', title: '<b>Duchess</b> · the square\'s calico, who believes the pigeons are hers', perch: { x, y, z, yaw: Math.PI, where: 'at the edge of the square, watching the pigeons', surface: 'ground' }, update: stalkerUpdate, hours: [tm('6:30'), tm('20:50')] });
}
function stalkerUpdate(rt, a, Z) {
  const t = rt.t, st = a.st, m = rt.minutes;
  if (m < a.hours[0] || m > a.hours[1]) { a.vis = false; return; }
  const birds = rt.game && rt.game.birds && rt.game.birds.pigeons;
  if (!st.mode) { st.mode = 'wait'; st.until = t + 8 + H(a.id, 1) * 20; }
  const P0 = a.perch;
  if (st.petUntil > t) { a.frame = 'sit'; a.cap = `${a.title}, briefly allowing it`; return; }
  if (st.mode === 'wait') {
    stepTo(Z, a, rt, P0.x, P0.z, 0.7, { snap: 40 });
    a.frame = a.speedNow > 0.1 ? gait(a, a.speedNow, 0.09) : 'sit';
    if (a.speedNow < 0.1) a.yaw = turn(a.yaw, P0.yaw, rt.dtc * 2);
    a.cap = `${a.title}, ${P0.where}`;
    if (t > st.until && birds) {
      let best = null, bd = 17;
      for (const b of birds) { if (b.state !== 'ground' || b.h.dummy) continue; const d = Math.hypot(b.x - a.x, b.z - a.z); if (d < bd) { bd = d; best = b; } }
      if (best) { st.mode = 'stalk'; st.bird = best; st.t0 = t; } else st.until = t + 10;
    }
    return;
  }
  const b = st.bird;
  if (!b || (b.state !== 'ground' && st.mode !== 'watch')) { st.mode = 'watch'; st.t0 = t; }
  if (st.mode === 'stalk') {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    stepTo(Z, a, rt, b.x, b.z, 0.35, { snap: 40 });
    a.frame = Math.floor(a.odo / 0.06) % 3 === 0 ? 'crouch' : 'crouch';
    a.cap = `${a.title}, stalking a pigeon, very slowly`;
    if (d < 2.3) { st.mode = 'freeze'; st.t0 = t; st.hold = 1.5 + H(a.id, Math.floor(t)) * 2; }
    if (t - st.t0 > 60) { st.mode = 'watch'; st.t0 = t; }
    return;
  }
  if (st.mode === 'freeze') {
    a.frame = 'crouch'; a.yaw = turn(a.yaw, Math.atan2(b.x - a.x, b.z - a.z), rt.dtc * 3);
    a.cap = `${a.title}, wiggling her hindquarters`;
    if (t - st.t0 > st.hold) { st.mode = 'pounce'; st.t0 = t; }
    return;
  }
  if (st.mode === 'pounce') {
    const left = stepTo(Z, a, rt, b.x, b.z, 4.2, { snap: 40 });
    a.frame = Math.floor(a.odo / 0.14) % 2 ? 'walk_a' : 'walk_b';
    a.cap = `${a.title}, pouncing!`;
    if (left < 0.9) { b.state = 'fly'; b.t = 0; b.fa = Math.atan2(b.z - a.z, b.x - a.x); st.mode = 'watch'; st.t0 = t; }
    if (t - st.t0 > 3) { st.mode = 'watch'; st.t0 = t; }
    return;
  }
  if (st.mode === 'watch') {
    a.frame = 'sit';
    if (b) a.yaw = turn(a.yaw, Math.atan2(b.x - a.x, b.z - a.z), rt.dtc * 2);
    a.cap = `${a.title}, watching the one that got away`;
    if (t - st.t0 > 5) { st.mode = 'wait'; st.until = t + 25 + H(a.id, Math.floor(t)) * 40; st.bird = null; }
  }
}

// ================================================================================ Admiral
// Mrs. Hatch's big grey tom. At 9:31 a squirrel dashes across the lawn and up the maple, and Admiral
// goes up after it. He sits on the long branch over the sidewalk through the fire company's visit
// (11:00, see src/sim/eventDefs.js) and comes down on his own at 11:26, "when the ladder touched the
// branch". The generator's stand-in cat in the tree is replaced by this one.
function admiral(Z) {
  const L = Z.L, P = L.place('Hatch Residence');
  if (!P) return;
  const r = P.rect;
  // (the tree cat sits 4+ m up, so it isn't in the low index: find it directly)
  const props = Z.props;
  let perch = null;
  for (let i = 0; i < props.n; i++) {
    if (props.tCat[i] === 250 || props.types[props.tType[i]].name !== 'cat') continue;
    const x = props.tPos[i * 3], y = props.tPos[i * 3 + 1], z = props.tPos[i * 3 + 2];
    if (y > 3 && x >= r.x0 - 1 && x <= r.x1 + 1 && z >= r.z0 - 1 && z <= r.z1 + 1) { perch = { x, y, z }; props.remove(i); break; }
  }
  if (!perch) return;
  // the trunk: bark voxels a couple of metres in from the perch
  const u = P.u, W = Z.W;
  let tx = 0, tz = 0, n = 0;
  const ex = perch.x - u[0] * 2.4, ez = perch.z - u[1] * 2.4;
  for (let dx = -1.5; dx <= 1.5; dx += VS) for (let dz = -1.5; dz <= 1.5; dz += VS) {
    const x = ex + dx, z = ez + dz;
    const mm = W.matAt(Math.floor(x / VS), Math.floor(1.6 / VS), Math.floor(z / VS));
    if (mm && mm === MAT.bark) { tx += Math.floor(x / VS) * VS + VS / 2; tz += Math.floor(z / VS) * VS + VS / 2; n++; }
  }
  if (!n) { tx = ex; tz = ez; } else { tx /= n; tz /= n; }
  const trunk = { x: tx, z: tz, r: 0.26 };
  const g = Z.ground(tx + u[0] * 0.9, tz + u[1] * 0.9, 1.2);
  // porch step and fence post for the rest of the day
  const step = catPerch(Z, P, { next: () => 0.1, chance: () => true }) || { x: P.door.x + u[0] * 1.2, y: P.door.y, z: P.door.z + u[1] * 1.2, yaw: P.yawOut, where: 'on the porch' };
  const a = makeCat(Z, { coat: 'tabby', a: '#8a8a88', b: '#4a4846', name: 'Admiral', title: '<b>Admiral</b> · Mrs. Hatch\'s tomcat, a large grey animal of poor judgment', perch: step, scale: 1.2, update: admiralUpdate, hours: [tm('6:30'), tm('21:30')] });
  Z.used.add('Admiral');
  a.tree = { trunk, perch, g, u };
  a.petLines = ['Admiral submits to one pat with the air of a ship\'s captain inspecting the crew.', 'Admiral looks at your hand, then at you, and decides to allow it. Once.', 'Admiral purrs like an outboard motor, then bites you, gently, to make a point.'];
  a.capY = 0.24;
  // the squirrel that starts it all
  const sq = Z.add({ kind: 'squirrel', model: 'squirrel', frames: SQUIRREL_FRAMES, scale: 1, name: 'squirrel', title: 'A grey squirrel', capY: 0.12, capR: 0.25, tree: a.tree, update: admiralSquirrel, x: trunk.x, y: g, z: trunk.z });
  void sq;
  L.scene('Admiral goes up the maple', P.door.x, P.door.z, '9:31', '11:28', 1);
}
// position of a cat/squirrel on the trunk face toward the street at height h (pitched up the bark)
function onTrunk(a, T, h, up = true) {
  const { trunk, u } = T;
  a.x = trunk.x + u[0] * (trunk.r + 0.02); a.z = trunk.z + u[1] * (trunk.r + 0.02); a.y = h;
  const inward = Math.atan2(-u[0], -u[1]);
  if (up) { a.pitch = -Math.PI / 2; a.yaw = inward; } else { a.pitch = Math.PI / 2; a.yaw = inward + Math.PI; }
  a.roll = 0;
}
function admiralUpdate(rt, a, Z) {
  const m = rt.minutes, T = a.tree, t = rt.t;
  const t0 = tm('9:31') + 0.5;
  a.pitch = 0; a.roll = 0;
  if (m < a.hours[0] || m > a.hours[1]) { a.vis = false; return; }
  const P = a.perch, base = { x: T.trunk.x + T.u[0] * 0.9, z: T.trunk.z + T.u[1] * 0.9 };
  const lerp2 = (A, B, k) => ({ x: A.x + (B.x - A.x) * k, z: A.z + (B.z - A.z) * k });
  const seg = (A, B, k, y0, y1) => { const q = lerp2(A, B, k); a.x = q.x; a.z = q.z; a.y = y0 + (y1 - y0) * k; a.yaw = Math.atan2(B.x - A.x, B.z - A.z); };
  const branchY = T.perch.y, root = { x: T.trunk.x + T.u[0] * 0.28, z: T.trunk.z + T.u[1] * 0.28 };
  const gallop = () => { a.odo = m * 60 * 3; a.frame = Math.floor(m * 60 * 7) % 2 ? 'walk_a' : 'walk_b'; };
  if (m >= t0 && m < t0 + 0.35) {
    // off the post (or step) in one hop, then flat out across the lawn
    const k = (m - t0) / 0.35, kh = 0.12;
    if (k < kh && P.y > T.g + 0.2) { seg(P, base, k, P.y, P.y); a.y = P.y + (T.g - P.y) * (k / kh) + Math.sin(k / kh * Math.PI) * 0.2; }
    else seg(P, base, k, T.g, T.g);
    gallop(); a.cap = `${a.title}, after a squirrel!`; return;
  }
  if (m >= t0 + 0.35 && m < t0 + 0.6) { onTrunk(a, T, T.g + (branchY - T.g) * (m - t0 - 0.35) / 0.25); gallop(); a.cap = `${a.title}, going up the maple after a squirrel`; return; }
  if (m >= t0 + 0.6 && m < t0 + 0.8) { seg(root, T.perch, (m - t0 - 0.6) / 0.2, branchY, T.perch.y); a.frame = 'crouch'; a.cap = `${a.title}, edging out along the branch`; return; }
  const down = tm('11:26');
  if (m >= t0 + 0.8 && m < down) {
    a.x = T.perch.x; a.z = T.perch.z; a.y = T.perch.y; a.yaw = Math.atan2(T.u[0], T.u[1]) + 0.3;
    const ev = m >= tm('10:50');
    a.frame = ev ? (H(a.id, Math.floor(m / 3)) < 0.5 ? 'sit' : 'loaf') : (H(a.id, Math.floor(m / 7)) < 0.6 ? 'loaf' : 'sit');
    a.cap = ev ? `${a.title}, up the maple, ignoring the Fire Department` : `${a.title}, up the maple again. He is not coming down.`;
    return;
  }
  if (m >= down && m < down + 0.25) { seg(T.perch, root, (m - down) / 0.25, T.perch.y, branchY); a.frame = 'walk_a'; a.yaw += 0; a.cap = `${a.title}, coming down on his own terms`; a.frame = Math.floor(m * 60 * 3) % 2 ? 'walk_a' : 'walk_b'; return; }
  if (m >= down + 0.25 && m < down + 0.5) { onTrunk(a, T, branchY + (T.g - branchY) * (m - down - 0.25) / 0.25, false); a.frame = Math.floor(m * 60 * 4) % 2 ? 'walk_a' : 'walk_b'; a.cap = `${a.title}, coming down on his own terms`; return; }
  if (m >= down + 0.5 && m < down + 1.0) {
    const k = (m - down - 0.5) / 0.5;
    seg(base, P, k, T.g, T.g);
    if (k > 0.9 && P.y > T.g + 0.2) a.y = T.g + (P.y - T.g) * ((k - 0.9) / 0.1) + Math.sin((k - 0.9) / 0.1 * Math.PI) * 0.2;
    a.frame = Math.floor(m * 60 * 2) % 2 ? 'walk_a' : 'walk_b'; a.cap = `${a.title}, strolling home as if nothing happened`; return;
  }
  // the rest of the day: the porch (fence post in the early evening), asleep after lunch
  catUpdate(rt, a, Z);
  if (a.st.mode === 'perch') {
    if (m > down && m < down + 45) a.cap = `${a.title}, looking extremely pleased with himself`;
    else if (m < t0 && m > tm('9:00')) a.cap = `${a.title}, watching the maple with interest`;
  }
  void t;
}
function admiralSquirrel(rt, a, Z) {
  const m = rt.minutes, T = a.tree, t0 = tm('9:31') + 0.5 - 0.3;
  a.pitch = 0; a.roll = 0;
  if (m < t0 || m > t0 + 0.9) { a.vis = false; return; }
  const start = { x: T.trunk.x + T.u[0] * 6 + T.u[1] * 6, z: T.trunk.z + T.u[1] * 6 - T.u[0] * 6 }, base = { x: T.trunk.x + T.u[0] * 0.5, z: T.trunk.z + T.u[1] * 0.5 };
  if (m < t0 + 0.3) { const k = (m - t0) / 0.3; a.x = start.x + (base.x - start.x) * k; a.z = start.z + (base.z - start.z) * k; a.y = Z.ground(a.x, a.z, 1.0); a.yaw = Math.atan2(base.x - start.x, base.z - start.z); a.frame = Math.floor(m * 60 * 9) % 2 ? 'run_a' : 'run_b'; a.cap = 'A grey squirrel · in a tearing hurry'; return; }
  const k = Math.min(1, (m - t0 - 0.3) / 0.4);
  onTrunk(a, T, T.g + k * (T.perch.y + 1.2 - T.g));
  a.frame = Math.floor(m * 60 * 9) % 2 ? 'run_a' : 'run_b';
  a.cap = 'A grey squirrel · going up the maple, with Admiral after it';
  if (k >= 1) a.vis = false;
}

// ================================================================================ squirrels
function squirrels(Z) {
  const L = Z.L, park = parkOf(Z);
  if (!park) return;
  const r = park.rect;
  const trees = Z.near((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, 60, (q) => /^tree_(oak|maple|elm)/.test(q.name) && q.x > r.x0 && q.x < r.x1 && q.z > r.z0 && q.z < r.z1);
  if (trees.length < 2) return;
  const T = trees.map((q) => {
    const sc = Z.props.tScale[q.i] || 1, def = Z.props.types[Z.props.tType[q.i]].def;
    const w = /oak/.test(q.name) ? 3 : 2, o = w === 3 ? 0.125 * sc : 0, c = Math.cos(q.yaw), sn = Math.sin(q.yaw);
    return { x: q.x + o * c + o * sn, z: q.z - o * sn + o * c, r: w * (def.scale || 0.25) * sc / 2, top: 2.2 * sc, y: q.y };
  });
  // the generator's stand-in squirrels become live ones
  for (const q of Z.near((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, 60, (q) => q.name === 'squirrel' && q.x > r.x0 && q.x < r.x1 && q.z > r.z0 && q.z < r.z1)) Z.removeProp(q);
  const n = Math.min(7, T.length);
  for (let i = 0; i < n; i++) {
    const home = T[(i * 7 + 3) % T.length];
    Z.add({ kind: 'squirrel', model: 'squirrel', frames: SQUIRREL_FRAMES, name: 'squirrel', title: 'A grey squirrel', trees: T, home, capY: 0.12, capR: 0.3,
      x: home.x + 1.5, y: home.y, z: home.z + 1.5, update: squirrelUpdate });
  }
  L.scene('Squirrels in Juniper Park', (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, '6:45', '18:45', n);
}
function lawnLine(Z, x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.ceil(d / 0.8));
  for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n, y = Z.ground(x, z, 1.4); if (Math.abs(y - 0.25) > 0.06 || !Z.clear(x, y, z, 0.3)) return false; }
  return true;
}
function squirrelUpdate(rt, a, Z) {
  const m = rt.minutes, t = rt.t, st = a.st, pp = Z.pp;
  a.pitch = 0; a.roll = 0;
  if (m < tm('6:45') + (a.id % 5) * 4 || m > tm('18:45') - (a.id % 3) * 6) { a.vis = false; return; }
  if (!st.mode) { st.mode = 'forage'; st.until = t + 3; st.tree = a.home; }
  const dP = pp ? Math.hypot(pp.x - a.x, pp.z - a.z) : 99;
  if (pp && dP < 4.5 && (st.mode === 'forage' || st.mode === 'dash')) {
    // up the nearest tree
    let best = null, bd = 1e9; for (const T of a.trees) { const d = Math.hypot(T.x - a.x, T.z - a.z); if (d < bd && lawnLine(Z, a.x, a.z, T.x, T.z)) { bd = d; best = T; } }
    if (best) { st.mode = 'totree'; st.tree = best; st.flee = true; }
  }
  const T = st.tree;
  if (st.mode === 'forage') {
    a.frame = (t % 3) < 0.25 ? 'run_b' : 'sit';
    a.cap = `${a.title} · ${['burying an acorn it will never find again', 'nibbling something', 'considering its options'][Math.floor(t / 7 + a.id) % 3]}`;
    if (t > st.until) {
      const roll = H(a.id, Math.floor(t));
      if (roll < 0.5) {
        // hop a little way across the grass
        const ang = H(a.id, Math.floor(t), 2) * TAU, d = 1 + H(a.id, Math.floor(t), 3) * 3;
        let x = a.x + Math.cos(ang) * d, z = a.z + Math.sin(ang) * d;
        if (Math.hypot(x - T.x, z - T.z) > 8) { x = T.x + (x - T.x) * 0.5; z = T.z + (z - T.z) * 0.5; }
        if (lawnLine(Z, a.x, a.z, x, z)) { st.mode = 'dash'; st.gx = x; st.gz = z; } else st.until = t + 1;
      } else if (roll < 0.7) {
        const T2 = a.trees[Math.floor(H(a.id, Math.floor(t), 4) * a.trees.length)];
        if (T2 && Math.hypot(T2.x - a.x, T2.z - a.z) < 25 && lawnLine(Z, a.x, a.z, T2.x, T2.z)) { st.mode = 'totree'; st.tree = T2; st.flee = false; } else st.until = t + 1;
      } else st.until = t + 2 + H(a.id, Math.floor(t), 5) * 5;
    }
  } else if (st.mode === 'dash') {
    const left = stepTo(Z, a, rt, st.gx, st.gz, 3.6, { snap: 30, yTop: 1.0 });
    a.frame = Math.floor(a.odo / 0.18) % 2 ? 'run_a' : 'run_b';
    a.y = 0.25 + Math.abs(Math.sin(a.odo / 0.36 * Math.PI)) * 0.05;
    a.cap = `${a.title} · in a tearing hurry`;
    if (left < 0.05) { st.mode = 'forage'; st.until = t + 1.5 + H(a.id, Math.floor(t)) * 4; a.y = 0.25; }
  } else if (st.mode === 'totree') {
    const ang = Math.atan2(a.x - T.x, a.z - T.z);
    const bx = T.x + Math.sin(ang) * (T.r + 0.05), bz = T.z + Math.cos(ang) * (T.r + 0.05);
    const left = stepTo(Z, a, rt, bx, bz, st.flee ? 4.5 : 3.4, { snap: 30, yTop: 1.0 });
    a.frame = Math.floor(a.odo / 0.18) % 2 ? 'run_a' : 'run_b';
    a.cap = `${a.title} · making for the tree`;
    if (left < 0.05) { st.mode = 'climb'; st.h = 0; st.ang = ang; st.hold = 4 + H(a.id, Math.floor(t)) * 10; st.top = T.top * (0.55 + H(a.id, Math.floor(t), 6) * 0.45); }
  } else if (st.mode === 'climb' || st.mode === 'perch' || st.mode === 'down') {
    const up = st.mode !== 'down';
    if (st.mode === 'climb') { st.h = Math.min(st.top, st.h + rt.dtc * 1.6); if (st.h >= st.top) { st.mode = 'perch'; st.t0 = t; } }
    else if (st.mode === 'perch') { if (t - st.t0 > st.hold && (!pp || dP > 6)) st.mode = 'down'; }
    else { st.h = Math.max(0, st.h - rt.dtc * 1.3); if (st.h <= 0) { st.mode = 'forage'; st.until = t + 2; a.home = T; } }
    a.x = T.x + Math.sin(st.ang) * (T.r + 0.02); a.z = T.z + Math.cos(st.ang) * (T.r + 0.02); a.y = T.y + st.h;
    a.pitch = up ? -Math.PI / 2 : Math.PI / 2; a.yaw = st.ang + Math.PI + (up ? 0 : Math.PI);
    a.frame = st.mode === 'perch' ? 'sit' : (Math.floor(t * 8) % 2 ? 'run_a' : 'run_b');
    if (st.mode === 'perch') { a.pitch = -Math.PI / 2; a.frame = 'run_b'; }
    a.cap = st.mode === 'perch' ? `${a.title} · halfway up the tree, scolding you` : `${a.title} · ${up ? 'going up the tree' : 'coming down head first'}`;
    if (st.mode === 'forage') { a.pitch = 0; a.y = 0.25; a.x = T.x + Math.sin(st.ang) * (T.r + 0.35); a.z = T.z + Math.cos(st.ang) * (T.r + 0.35); }
  }
}

// ================================================================================ horses
// a route along the right-hand side of the road, corners rounded; stops are {s (metres), dur (min)}
function roadRoute(pts, stops = []) {
  // round the corners (Chaikin, twice)
  let p = pts;
  for (let it = 0; it < 2; it++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [x0, z0] = p[i], [x1, z1] = p[i + 1], L = Math.hypot(x1 - x0, z1 - z0), c = Math.min(0.25, 3.5 / Math.max(L, 1e-3));
      if (i > 0) q.push([x0 + (x1 - x0) * c, z0 + (z1 - z0) * c]);
      if (i < p.length - 2) q.push([x1 - (x1 - x0) * c, z1 - (z1 - z0) * c]);
    }
    q.push(p[p.length - 1]); p = q;
  }
  const g = moveLeg(p, 1);
  return { ...g, stops };
}
// the whole trip as a function of the clock: where along the route (metres) at minute m
function tripAt(trip, m) {
  if (m < trip.t0 || m >= trip.t1) return null;
  let t = m - trip.t0;
  for (const leg of trip.legs) {
    if (t < leg.dur) return leg.type === 'move' ? { s: leg.s0 + (leg.s1 - leg.s0) * (t / leg.dur), moving: true } : { s: leg.s0, moving: false, stop: leg.stop };
    t -= leg.dur;
  }
  return { s: trip.route.len, moving: false };
}
function planTrip(route, t0, speed) {
  const legs = []; let s = 0, T = 0;
  for (const st of route.stops.slice().sort((a, b) => a.s - b.s)) { if (st.s <= s) continue; const d = (st.s - s) / speed; legs.push({ type: 'move', s0: s, s1: st.s, dur: d }); legs.push({ type: 'stay', s0: st.s, dur: st.dur, stop: st }); T += d + st.dur; s = st.s; }
  const d = (route.len - s) / speed; legs.push({ type: 'move', s0: s, s1: route.len, dur: d }); T += d;
  return { route, legs, t0: t0, t1: t0 + T };
}
function poseOnRoute(route, s, out) {
  s = Math.max(0, Math.min(route.len, s));
  const a = alongPoly(route, s, {}), b = alongPoly(route, Math.max(0, s - 1.2), {}), c = alongPoly(route, Math.min(route.len, s + 1.2), {});
  out.x = a.x; out.z = a.z; out.yaw = Math.atan2(c.x - b.x, c.z - b.z);
  return out;
}
// a townsperson who rides: they sit (or straddle) a spot that moves with the horse every frame
function rider(Z, o) {
  const L = Z.L;
  const p = L.newPerson(o.person);
  const s0 = L.spot(o.x, o.z, { act: o.act, pose: o.act === 'sit' ? 'sit' : 'stand', seat: o.seat, label: o.label, lines: o.lines });
  const off0 = L.offstage(o.x, o.z, { link: s0.node }), off1 = L.offstage(o.x, o.z, { link: s0.node });
  p.at('0:00', off0, 'stand', { label: o.offLabel });
  p.at(o.t0, s0, o.act, { label: o.label, lines: o.lines });
  p.at(o.t1, off1, 'stand', { label: o.offLabel });
  return { p, spot: s0 };
}

function ragWagon(Z) {
  const L = Z.L;
  const lane = 4.5;
  // in by Grand Avenue from the Boston road, round the residential streets, and out the same way
  const pts = [[468, -70 - lane], [374 - lane, -70 - lane], [374 - lane, 210 - lane], [214 + lane, 210 - lane], [214 + lane, 140 + lane], [294 + lane, 140 + lane], [294 + lane, 70 + lane], [374 + lane, 70 + lane], [374 + lane, -70 + lane], [468, -70 + lane]];
  const route = roadRoute(pts);
  // stops in front of houses along the way (every other one, a few minutes each)
  const stops = [];
  const homes = L.places.homes.filter((P) => P.kind === 'house' && P.curb);
  for (const P of homes) {
    let best = 1e9, bs = 0;
    for (let s = 0; s < route.len; s += 2) { const q = alongPoly(route, s, {}); const d = Math.hypot(q.x - P.curb.x, q.z - P.curb.z); if (d < best) { best = d; bs = s; } }
    if (best < 3.2) stops.push({ s: bs, P, d: best });
  }
  stops.sort((a, b) => a.s - b.s);
  const chosen = [];
  for (const st of stops) if (!chosen.length || st.s - chosen[chosen.length - 1].s > 26) chosen.push(st);
  chosen.forEach((st, i) => { st.dur = 4 + (H(i, 31) * 7 | 0); });
  route.stops = chosen;
  const t0 = tm('8:40');
  const trip = planTrip(route, t0, 62);
  Z.dbg.ragman = [trip.t0, trip.t1, chosen.length];
  const start = alongPoly(route, 0, {});
  const R = rider(Z, {
    x: start.x, z: start.z, t0, t1: trip.t1, act: 'sit', seat: 0.45,
    person: { first: 'Sal', last: 'Pignatelli', age: 61, sex: 'M', outfit: 'farmer', bio: 'Salvatore Pignatelli, 61, the ragman: rags, bottles, old iron and bedsteads, bought for pennies from the back of a green wagon since 1921. His mare Dolly knows the route better than he does and stops at the good houses on her own.', lines: ['Rags! Any old rags!', 'Bottles, old iron, rags!', 'Whoa, Dolly. Whoa.', 'I give you a dime for the lot, lady, and that is robbery.', 'Any old pots? Any old iron?'] },
    label: 'Driving the rag wagon — "Rags! Any old rags!"', lines: ['Rags! Any old rags!', 'Bottles, old iron, rags!', 'Whoa, Dolly. Whoa.', 'Any old pots? Any old iron?'], offLabel: 'On the Boston road with the rag wagon',
  });
  // housewives come out to the curb with a bundle at some stops
  let sellers = 0;
  let tt = t0; const whenAt = new Map();
  for (const leg of trip.legs) { if (leg.type === 'stay') whenAt.set(leg.stop, tt); tt += leg.dur; }
  for (const st of chosen) {
    const ts = whenAt.get(st); if (ts === undefined || H(st.s | 0, 5) < 0.4) continue;
    const who = st.P.members.filter((p) => p.age >= 16 && L.idle(p, ts - 2, ts + st.dur + 3)).sort((a, b) => (a.sex === 'F' ? 0 : 1) - (b.sex === 'F' ? 0 : 1))[0];
    if (!who) continue;
    const q = st.P.at(1.2, 3.4);
    const s = L.spot(q.x, q.z, { faceTo: [st.P.curb.x, st.P.curb.z], act: 'talk' });
    L.block(who, ts - 1.5, ts + st.dur, s, 'talk', { label: 'Selling old rags to the ragman', held: 'crate_small', lines: ['Mind, that was my mother\'s bedstead.', 'A nickel? For good wool?', 'Take the lot and good riddance.'] });
    sellers++;
  }
  const route0 = route;
  const pose = {};
  const wagon = Z.add({ kind: 'wagon', model: 'wagon', frames: ['rag'], frame: 'rag', name: 'rag wagon', title: '<b>Sal Pignatelli\'s rag wagon</b> · rags, bottles, old iron', capY: 1.3, capR: 1.3, range: 170, tintA: 0xffffff,
    locate: (rt, a) => { const q = tripAt(trip, rt.minutes); if (!q) return false; poseOnRoute(route0, q.s - WAGON_HITCH, pose); a.x = pose.x; a.z = pose.z; a.yaw = pose.yaw; a.y = 0; a.q = q; return true; },
    update: (rt, a) => { if (R.p.ch && !R.p.ch.pose.visible) { a.vis = false; return; } a.cap = a.title; a.bell = !a.q.moving && (rt.t % 6) < 3; },
    // the driver's seat moves with the wagon
    always: (rt) => { const q = tripAt(trip, rt.minutes); if (!q) return; const o = poseOnRoute(route0, q.s - WAGON_HITCH, {}); const s = R.spot, c = Math.cos(o.yaw), sn = Math.sin(o.yaw); s.x = o.x + sn * 1.05 + c * 0.22; s.z = o.z + c * 1.05 - sn * 0.22; s.y = 0.9; s.yaw = o.yaw; },
  });
  void wagon;
  const horse = Z.add({ kind: 'horse', model: 'horse_draft', frames: HORSE_FRAMES, name: 'Dolly', title: '<b>Dolly</b> · the ragman\'s mare, a patient bay who knows every stop', tintA: pack('#7a4a2a'), tintB: pack('#221c18'), scale: 1, capY: 1.5, capR: 1.2, range: 170,
    locate: (rt, a) => { const q = tripAt(trip, rt.minutes); if (!q) return false; poseOnRoute(route0, q.s, pose); a.x = pose.x; a.z = pose.z; a.yaw = pose.yaw; a.y = 0; a.q = q; return true; },
    update: (rt, a) => { if (R.p.ch && !R.p.ch.pose.visible) { a.vis = false; return; } a.moving = a.q.moving; a.frame = a.q.moving ? (Math.floor(a.q.s / 0.55) % 2 ? 'walk_a' : 'walk_b') : 'stand'; a.cap = a.q.moving ? `${a.title}, clopping along` : `${a.title}, waiting while Sal haggles`; },
    onPet: (g, a) => { g.hud.toast('Dolly lowers her big head and blows warm hay-smelling air down your collar.', 4); if (R.p.ch && R.p.ch.pose.visible && g.bubbles) g.bubbles.say(R.p, 'She likes you. She likes carrots better.', g.time, 3.5); },
    prompt: 'Pat Dolly\'s neck', petAt: (a) => [a.x + Math.sin(a.yaw) * 1.1, a.y + 1.3, a.z + Math.cos(a.yaw) * 1.1],
  });
  void horse;
  L.scene('The ragman\'s wagon', 374, 70, t0, trip.t1, 1 + sellers);
}

function mountedPolice(Z) {
  const L = Z.L;
  const hq = L.place('Police Headquarters');
  if (!hq) return;
  const lane = 4.5;
  const loop = [[134 + lane, -70 + lane], [294 - lane, -70 + lane], [294 - lane, 0 - lane], [134 + lane, 0 - lane]];
  // out from headquarters, round the square and City Hall again and again, then home
  const pts = [[54 + lane, -104], [54 + lane, -70 - lane], [134 - lane, -70 - lane]];
  const t0 = tm('10:05'), tEnd = tm('18:12');
  const loopLen = 2 * (160 - 2 * lane) + 2 * (70 - 2 * lane);
  const nLoops = 13;
  for (let k = 0; k < nLoops; k++) pts.push(...loop);
  pts.push([134 + lane, -70 + lane], [134 + lane, -70 - lane], [54 + lane, -70 - lane], [54 + lane, -104]);
  const route = roadRoute(pts);
  // pauses: at the corners of the square (watching the crowd), long ones at lunch and for the Mayor's speech
  const stops = [];
  const lead = 36 + 80;
  for (let k = 0; k < nLoops; k++) {
    const s0 = lead + k * loopLen;
    stops.push({ s: s0 + 40, dur: 5 + (H(k, 1) * 5 | 0) }, { s: s0 + 150, dur: 4 + (H(k, 2) * 5 | 0) }, { s: s0 + 150 + 66 + 40, dur: 5 + (H(k, 3) * 6 | 0) });
  }
  route.stops = stops.filter((s) => s.s < route.len - 150);
  // the last stop is on Market Street by City Hall: stay there through the Mayor's speech (17:30)
  let trip = planTrip(route, t0, 66);
  const last = route.stops[route.stops.length - 1];
  if (last && trip.t1 < tEnd) { last.dur += tEnd - trip.t1; trip = planTrip(route, t0, 66); }
  Z.dbg.police = [trip.t0, trip.t1];
  const start = alongPoly(route, 0, {});
  const R = rider(Z, {
    x: start.x, z: start.z, t0, t1: trip.t1, act: 'kneel',
    person: { first: 'Leo', last: 'Kerrigan', title: 'Officer', age: 44, sex: 'M', outfit: 'police', bio: 'Patrolman Leo Kerrigan, 44, the department\'s only mounted officer, and Duke the department\'s only horse. They do the fair, the parades and the Fourth, and the rest of the year Duke pulls the Kerrigans\' sleigh at Christmas. Neither of them will hear a word against the other.', lines: ['Mind the horse, son. He minds you.', 'Afternoon.', 'Easy, Duke. Easy.', 'Keep it moving, folks, keep it moving.'] },
    label: 'On mounted patrol at the fair', lines: ['Easy, Duke.', 'Keep it moving, folks.', 'Afternoon, ma\'am.'], offLabel: 'Seeing to Duke at the stable',
  });
  const pose = {};
  Z.add({ kind: 'horse', model: 'horse_mount', frames: HORSE_FRAMES, name: 'Duke', title: '<b>Duke</b> · the police horse, sixteen hands of patience', tintA: pack('#3a2418'), tintB: pack('#141210'), scale: 1, capY: 1.3, capR: 1.2, range: 170,
    locate: (rt, a) => { const q = tripAt(trip, rt.minutes); if (!q) return false; poseOnRoute(route, q.s, pose); a.x = pose.x; a.z = pose.z; a.yaw = pose.yaw; a.y = 0; a.q = q; return true; },
    update: (rt, a) => { if (R.p.ch && !R.p.ch.pose.visible) { a.vis = false; return; } a.moving = a.q.moving; a.frame = a.q.moving ? (Math.floor(a.q.s / 0.55) % 2 ? 'walk_a' : 'walk_b') : 'stand'; a.cap = a.q.moving ? `${a.title}, carrying Officer Kerrigan round the fair` : `${a.title}, standing like a statue while the children stare`; },
    always: (rt) => {
      const q = tripAt(trip, rt.minutes); if (!q) return;
      const o = poseOnRoute(route, q.s, {}); const s = R.spot, sc = (R.p.ch && R.p.ch.scale) || 1;
      s.x = o.x + Math.sin(o.yaw) * 0.02; s.z = o.z + Math.cos(o.yaw) * 0.02; s.yaw = o.yaw;
      s.y = 1.68 - (0.4 * sc + 0.02);   // hips on the saddle (kneeling pose: the legs are inside the horse)
    },
    onPet: (g) => { g.hud.toast('Duke considers you with one enormous dark eye and permits a pat on the nose.', 4); if (R.p.ch && R.p.ch.pose.visible && g.bubbles) g.bubbles.say(R.p, 'Flat hand, son. He\'s a gentleman, but he\'s nearsighted.', g.time, 4); },
    prompt: 'Pat Duke\'s nose', petAt: (a) => [a.x + Math.sin(a.yaw) * 1.3, a.y + 1.4, a.z + Math.cos(a.yaw) * 1.3],
  });
  L.scene('Mounted patrol at the fair', 214, -35, t0, trip.t1, 1);
}

// ================================================================================ entry
export function run(L) {
  const Z = new Zoo(L);
  const parts = [['Admiral', admiral], ['household dogs', householdDogs], ['strays', strays], ['cats', cats], ['squirrels', squirrels], ['rag wagon', ragWagon], ['mounted police', mountedPolice]];
  for (const [name, fn] of parts) { try { fn(Z); } catch (e) { console.error('animals:', name, e); } }
  Z.finish();
}
