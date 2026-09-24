// Street life downtown, at Union Station, on the waterfront and at the beach. See docs/LIFE.md.
//
// Everything here is a pure function of the clock: shopkeepers sweep their walks and set out their
// displays, trucks unload at the curb, trades work the corners all day, trains bring visitors who
// spend the day in town, and small happenings (a fender-bender, a hat in the wind, a lost child)
// give people something to stop and look at. Townsfolk are used where they plausibly would be;
// the rest are Harbor Days visitors and tradesmen from out of town (L.newPerson), who wait
// off-stage (in the station, the hotel, the garage, the beach lot) between their scenes.
import { tm } from '../../core/util.js';
import { PROP_DEFS } from '../../props/props.js';
import { MFLAG } from '../../world/materials.js';
import { VS } from '../../core/config.js';

let L = null;   // this module's LifeKit
let G = null;   // module state (reset per run)

export function run(kit) {
  L = kit;
  G = { claims: [], clutter: null, off: {}, pool: [], paths: new Map(), n: 0, curb: [], spots: new Map(), nearNode: new Map() };
  buildClutter();
  const parts = [
    // shops & deliveries first: they claim their pieces of curb and sidewalk
    shopMornings, deliveries, courierNight,
    // the station and trains (the visitors arriving here are used all day)
    stationLife, trainTimes, dayTrippers, sailorsOnLeave,
    // trades & characters
    newsboys, trafficCop, rourkeBeat, crossingGuard, organGrinder, peanutMan, balloonMan, pretzelMan, flowerCart,
    goodHumor, quartet, salvationArmy, scouts, lowellPortraits, boardwalkSnaps, signPainter, windowWasher,
    // shop-front life
    windowShoppers, toyWindow, sodaFountainTeens, hardwareBench, sidewalkSale, barberDoorway, bankLine, postOfficeLine,
    harlowsOpening, ballgameWindow, tobaccoShop, elksSteps, garageMechanic, bookCart, fishMarketLine,
    wjbyInterviews, officeHalfDay, bankNoon, harborLanes,
    // happenings
    fenderBender, hatInTheWind, lostChild, streetPreacher, candidate, rialtoLines, newlyweds, whitcombTour, babyCigars,
    // transit stops
    transitStops,
    // the waterfront
    fishing, crabbing, netMenders, harborArtists, oldSalts, boatWatchers, gullFeeders, boatWorks, clamShack,
    // the beach and Playland
    sandcastles, waders, kiteFlyer, boardwalkCouples, hotDogQueue, lifeguardChair, beachPicnic, beachcomber,
    // evening
    afterTheSpeech, dinerSupper, eveningStroll, blueLanternNight, signalLampNight, dinerNightOwls,
    // last: cars parked along the curbs wherever nothing else claimed the space, and the meter man who chalks them
    parkedCars, meterMan,
    // the Spotter's Diary entries for the best of the above
    spotterDiary,
  ];
  const nt = L.life.timed.length, nf = L.life.follows.length, np = L.ctx.people.list.length;
  const ms = {};
  for (const f of parts) {
    const t0 = Date.now();
    try { f(); } catch (e) { console.error('downtown scene failed:', f.name, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e); }
    ms[f.name] = Date.now() - t0;
  }
  L.life.stats = L.life.stats || {};
  L.life.stats.downtown = { timed: L.life.timed.length - nt, follows: L.life.follows.length - nf, newPeople: L.ctx.people.list.length - np, scenes: G.n, ms };
}

// ================================================================== helpers
const T = (v) => tm(v);
const hm = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const has = (type) => PROP_DEFS.has(type);
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function place(name) { return L.places.byName.get(name) || null; }
function person(first, last) { return L.person(first, last); }

// ground height, looking below awnings and canopies (the kit's default scan starts at 3 m)
function gy(x, z) { return L.ground(x, z, 1.4); }
// the top of whatever is solid at (x, z) down to the sea bed; null over open water
function solidTop(x, z) {
  const W = L.ctx.world, vx = Math.floor(x / VS), vz = Math.floor(z / VS);
  for (let vy = 8; vy >= -60; vy--) { const m = W.matAt(vx, vy, vz); if (m && !(W.matFlags[m] & MFLAG.NOCOLLIDE)) return (vy + 1) * VS; }
  return null;
}

// frontage of a place: the side range (metres right of the door) covered by its lot
function span(P) {
  const a = P.at(0, 0), R = P.rect;
  const s = [[R.x0, R.z0], [R.x1, R.z1]].map(([x, z]) => (x - a.x) * P.r[0] + (z - a.z) * P.r[1]);
  return [Math.min(...s), Math.max(...s)];
}
function sideOf(P, x, z) { const a = P.at(0, 0); return (x - a.x) * P.r[0] + (z - a.z) * P.r[1]; }

// ------------------------------------------------------------------ clutter & claims
// static ground-level props outdoors, hashed on a 4 m grid, so scenes keep clear of hydrants, lamps, benches…
function buildClutter() {
  const Pr = L.ctx.props, W = L.ctx.world, g = new Map();
  for (let i = 0; i < Pr.n; i++) {
    if (Pr.tCat[i] === 250) continue;
    const x = Pr.tPos[i * 3], y = Pr.tPos[i * 3 + 1], z = Pr.tPos[i * 3 + 2];
    if (y > 1.3 || y < -3) continue;
    let r = Pr.tRoom[i];
    if (r === 0xffff) r = W.roomAt(Math.floor(x / VS), Math.floor((y + 0.3) / VS), Math.floor(z / VS));
    if (r) continue;
    const t = Pr.types[Pr.tType[i]].name;
    if (/^(com_glass|window_box|bunting|sign:|street_sign)/.test(t)) continue;
    const k = Math.floor(x / 4) + ',' + Math.floor(z / 4);
    let a = g.get(k); if (!a) g.set(k, (a = [])); a.push({ x, z, t });
  }
  G.clutter = g;
}
function clutterNear(x, z, r) {
  const out = [];
  for (let gx = Math.floor((x - r) / 4); gx <= Math.floor((x + r) / 4); gx++) for (let gz = Math.floor((z - r) / 4); gz <= Math.floor((z + r) / 4); gz++) {
    const a = G.clutter.get(gx + ',' + gz); if (!a) continue;
    for (const q of a) if (Math.hypot(q.x - x, q.z - z) < r) out.push(q);
  }
  return out;
}
// is (x, z) clear of street furniture and of our own claims overlapping [t0, t1)?
function clear(x, z, r = 0.9, t0 = 0, t1 = 1440) {
  if (clutterNear(x, z, r).length) return false;
  for (const c of G.claims) if (c.t0 < t1 && c.t1 > t0 && Math.hypot(c.x - x, c.z - z) < r + c.r) return false;
  return true;
}
function claim(x, z, r, t0 = 0, t1 = 1440) { G.claims.push({ x, z, r, t0: T(t0), t1: T(t1) }); }
// first clear point along a frontage: tries each side offset in turn at `out` metres from the lot line
function frontSpot(P, sides, out, r = 0.8, t0 = 0, t1 = 1440) {
  const [s0, s1] = span(P);
  for (const s of sides) {
    if (s < s0 + 0.6 || s > s1 - 0.6) continue;
    const q = P.at(s, out);
    if (clear(q.x, q.z, r, T(t0), T(t1))) return { ...q, side: s };
  }
  return null;
}
// search outward from (x, z) for a clear point
function nearClear(x, z, r = 0.8, t0 = 0, t1 = 1440, maxR = 4) {
  if (clear(x, z, r, T(t0), T(t1))) return { x, z };
  for (let d = 0.5; d <= maxR; d += 0.5) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, q = { x: x + Math.cos(a) * d, z: z + Math.sin(a) * d };
    if (clear(q.x, q.z, r, T(t0), T(t1))) return q;
  }
  return null;
}

// ------------------------------------------------------------------ spots, props, captions
function spot(x, z, o = {}) { return L.spot(x, z, { y: o.y ?? gy(x, z), ...o }); }
function timed(type, x, z, yaw, t0, t1, o = {}) { if (!has(type)) return null; return L.timed(type, x, z, yaw, T(t0), T(t1), { y: o.y ?? gy(x, z), ...o }); }
function prop(type, x, z, yaw, o = {}) { if (!has(type)) return -1; return L.prop(type, x, z, yaw, { y: o.y ?? gy(x, z), ...o }); }
function label(x, y, z, t0, t1, text, r = 2) { L.label(x, y, z, T(t0), T(t1), text, r); }
function sound(x, z, t0, t1, kind, range = 40, vol = 0.5) { L.sound(x, 1.2, z, T(t0), T(t1), kind, { range, vol }); }
function scene(title, x, z, t0, t1, n = 0) { L.scene(title, x, z, T(t0), T(t1), n); G.n++; }

// vehicles at the curb: out = 5.0 m from the lot line keeps a parked car clear of the traffic lane
function curbAt(P, side = 0) { const q = P.at(side, 5.0); return { ...q, yaw: P.yawRight }; }
function curbFree(x, z, t0, t1, len = 6.5) {
  for (const c of G.curb) if (c.t0 < t1 + 2 && c.t1 > t0 - 2 && Math.hypot(c.x - x, c.z - z) < (len + c.len) / 2 + 0.6) return false;
  return true;
}
function park(type, x, z, yaw, t0, t1, o = {}) {
  t0 = T(t0); t1 = T(t1);
  const len = o.len || (/truck|van/.test(type) ? 6.3 : 5.4);
  G.curb.push({ x, z, t0, t1, len });
  return timed(type, x, z, yaw, t0, t1, { y: 0.02, ...o });
}
// a point along a parked vehicle: fwd metres ahead of its centre, side metres to its right
function along(c, fwd, side = 0) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  return { x: c.x + fx * fwd - fz * side, z: c.z + fz * fwd + fx * side };
}

// ------------------------------------------------------------------ people
// walking distance on the nav graph (cached)
function pathLen(a, b) {
  if (a < 0 || b < 0) return 250;
  if (a === b) return 0;
  const k = a + ',' + b;
  let d = G.paths.get(k);
  if (d !== undefined) return d;
  const nav = L.ctx.nav, path = nav.path(a, b);
  d = 400;
  if (path) { d = 0; for (let i = 1; i < path.length; i++) d += Math.hypot(nav.x[path[i]] - nav.x[path[i - 1]], nav.z[path[i]] - nav.z[path[i - 1]]); }
  G.paths.set(k, d);
  return d;
}
// minutes p needs to reach `s` from wherever they are at minute t (straight line x 1.35: cheap, near enough)
function lead(p, t, s) {
  const a = L.whereAt(p, t); if (a < 0) return 3;
  const nav = L.ctx.nav, d = Math.hypot(nav.x[a] - s.x, nav.z[a] - s.z) * 1.35;
  return Math.min(25, Math.ceil(d / (p.speed * 60)) + 1);
}
// townsfolk are only known to be free from ~10 minutes before a booking; visitors we schedule ourselves
const maxLead = (p, o) => (p.visitor ? 25 : (o.maxLead ?? 10));

// has p nothing in the way from t0 to t1? (like L.idle, but allows the working — for jobs done outdoors)
function avail(p, t0, t1) {
  if (!p) return false;
  t0 = T(t0); t1 = T(t1);
  if (!L.free(p, t0, t1)) return false;
  const s = p.schedule; let cur = null;
  for (const e of s) { if (e.t <= t0) cur = e; else if (e.t < t1 && (e.event || e.life || e.act === 'sleep')) return false; }
  return !(cur && (cur.event || cur.life || cur.act === 'sleep'));
}

// Put p at spot s from t0 to t1 (arriving by about t0). o: { act, label, held, arms, costume, lines, say, song, early }
function put(p, t0, t1, s, o = {}) {
  if (!p || !s) return false;
  t0 = T(t0); t1 = T(t1);
  const w = o.early ?? Math.min(lead(p, t0, s), maxLead(p, o));
  L.plan(p, t0 - w, t1, [{ t: t0 - w, spot: s, act: o.act || s.act, label: o.label, held: o.held, arms: o.arms, costume: o.costume, lines: o.lines }], { lines: o.say, song: o.song, costume: o.costume });
  return true;
}
// several entries [{t, spot, act, label, held, arms, costume, lines, speed, route}] from t0 to t1; the first leg starts early
function plan(p, t0, t1, entries, o = {}) {
  if (!p || !entries.length) return false;
  t0 = T(t0); t1 = T(t1);
  const e0 = entries[0], w = o.early ?? (e0.spot ? Math.min(lead(p, T(e0.t), e0.spot), maxLead(p, o)) : 2);
  const es = entries.map((e, i) => ({ ...e, t: i === 0 ? T(e.t) - w : T(e.t) }));
  L.plan(p, Math.min(t0, es[0].t), t1, es, { lines: o.say, song: o.song, costume: o.costume, noResume: o.noResume });
  return true;
}

// ------------------------------------------------------------------ visitors (people from out of town)
const ORIGINS = {
  station: () => { const S = place('Union Station'); return S ? { x: S.door.x, z: S.door.z - 0.8 } : null; },
  hotel: () => { const H = place('The Whitcomb Hotel'); return H ? H.at(0, -0.8) : null; },
  garage: () => { const H = place('Mill Street Garage'); return H ? H.at(0, -1) : null; },
  beachlot: () => ({ x: 70, z: 262 }),
  north: () => ({ x: 46, z: -283 }),
  east: () => ({ x: 380, z: -64 }),
  police: () => { const H = place('Police Headquarters'); return H ? H.at(0, -1) : null; },
};
function origin(key) {
  if (G.off[key] !== undefined) return G.off[key];
  const q = ORIGINS[key] && ORIGINS[key]();
  G.off[key] = q ? L.offstage(q.x, q.z, { y: gy(q.x, q.z) }) : null;
  return G.off[key];
}
function nearestOrigin(x, z) {
  const cand = x < 60 && z > 150 ? ['beachlot'] : z < -150 ? ['station', 'hotel', 'garage'] : x < 70 ? ['north', 'station'] : ['station', 'hotel', 'garage'];
  let best = null, bd = 1e9;
  for (const k of cand) { const s = origin(k); if (!s) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = k; } }
  return best || 'station';
}
const VISITOR_BIOS = [
  'Up from Lowell for Harbor Days with the whole family.', 'Came in on the train from Boston for the Centennial.',
  'Drove down from Portsmouth in the Hudson to see the fireworks.', 'Staying on at the Whitcomb Hotel through the Centennial.',
  'Grew up on Orchard Street, moved to Worcester in \'41, back for the hundredth.', 'Here from Providence for the day. The wife wanted the pie contest.',
  'A cousin of the Castellanos, over from Gloucester for Sal Jr.\'s homecoming.', 'Summer people who never quite went home.',
];
const VISITOR_LINES = [
  ['First time in Juniper Bay. Everybody waves. Is that a local custom?', 'We came up on the 9:52. The conductor knew everybody by name.'],
  ['Some town you\'ve got. Smells like bread and fish, in that order.', 'We\'re staying for the fireworks, then it\'s the 10:05 home.'],
  ['My grandmother was born on Market Street. Before the fire, she\'d say.', 'A hundred years! Our town\'s only ninety-one. We\'re jealous.'],
  ['The wife wants to see the time capsule. I want a lobster roll.', 'Where\'s a fellow get a cup of coffee around here?'],
];
function visitor(o = {}) {
  const r = L.rng;
  const sex = o.sex || (r.chance(0.5) ? 'M' : 'F');
  const age = o.age ?? r.int(22, 62);
  const p = L.newPerson({ first: o.first, last: o.last, age, sex, outfit: o.outfit, role: o.role, look: o.look, formal: o.formal, visitor: o.visitor ?? true,
    bio: o.bio || r.pick(VISITOR_BIOS), lines: o.lines || r.pick(VISITOR_LINES) });
  const from = o.from || 'station';
  const s = origin(from) || origin('station');
  if (s) p.at(0, s, 'stand', { label: 'Out of town' });
  p._from = from;
  return p;
}
// a generic visitor free from t0 to t1 (reusing the pool when their walks fit)
function guest(t0, t1, want = {}, x = 200, z = -50, exclude = null) {
  t0 = T(t0); t1 = T(t1);
  const ok = (p) => (!want.sex || p.sex === want.sex) && (!want.age || (p.age >= want.age[0] && p.age <= want.age[1])) && (!want.outfit || p._outfit === want.outfit);
  for (const p of G.pool) {
    if (!ok(p) || (exclude && exclude.includes(p))) continue;
    const s = origin(p._from); const w = s ? Math.ceil(Math.hypot(s.x - x, s.z - z) * 1.3 / (p.speed * 60)) + 3 : 10;
    if (L.free(p, t0 - w, t1 + w)) return p;
  }
  const r = L.rng, age = want.age ? r.int(want.age[0], want.age[1]) : undefined;
  const p = visitor({ sex: want.sex, age, outfit: want.outfit, look: want.look, from: want.from || nearestOrigin(x, z) });
  p._outfit = want.outfit || null;
  G.pool.push(p);
  return p;
}
// idle townsfolk, fast: walk a shuffled roster from a rotating start and stop when we have enough
// (L.recruit scans and shuffles the whole town every call; we call this a few hundred times)
function recruit(n, t0, t1, f, prefer) {
  if (prefer) return L.recruit(n, t0, t1, f, prefer);
  if (!G.roster) { G.roster = L.rng.shuffle(L.ctx.people.list.filter((p) => !p.commuter && !p.visitor)); G.rot = 0; }
  const R = G.roster, out = [];
  G.rot = (G.rot + 97) % R.length;
  for (let k = 0; k < R.length && out.length < n; k++) { const p = R[(G.rot + k) % R.length]; if (f(p) && L.idle(p, t0, t1)) out.push(p); }
  return out;
}
// n people for a scene at (x, z) from t0 to t1: idle townsfolk first (filter/prefer), then visitors
function cast(n, t0, t1, want = {}, x = 200, z = -50) {
  t0 = T(t0); t1 = T(t1);
  const [a0, a1] = want.age || [16, 80];
  const f = (p) => p.age >= a0 && p.age <= a1 && (!want.sex || p.sex === want.sex) && (!want.filter || want.filter(p));
  const out = want.town === false ? [] : recruit(n, t0 - 10, t1, f, want.prefer || null);
  while (out.length < n && want.fill !== false) out.push(guest(t0, t1, want, x, z, out));
  return out;
}
// people at a crowd spot (spread) facing a point
function crowd(ppl, t0, t1, x, z, o = {}) {
  const s = spot(x, z, { spread: o.spread || 1.8, faceTo: o.faceTo, act: o.act || 'look' });
  ppl.forEach((p, i) => put(p, T(t0) + (o.stagger ? (i * o.stagger) % 20 : 0), t1, s, { act: typeof o.act === 'function' ? o.act(p, i) : (o.acts ? o.acts[i % o.acts.length] : o.act || 'look'), label: o.label, lines: o.lines, held: o.held }));
  return s;
}
const pick = (a) => L.rng.pick(a);
const chance = (p) => L.rng.chance(p);
const rint = (a, b) => L.rng.int(a, b);

// ================================================================== parked cars
const CAR_TYPES = [['car_sedan', 10], ['car_coupe', 5], ['car_wagon', 3], ['car_convertible', 1.5], ['truck_pickup', 2]];
const PAINT = ['#2a3a5a', '#6a2a2a', '#3a5a3a', '#d8d0b8', '#2a2a2e', '#7a8a9a', '#a8743a', '#5a8a8a', '#8a2a3a', '#c8b060', '#3a4a6a', '#e8e0d0', '#4a6a4a', '#1f3a2a', '#9a4a2a'];
// Cars that come and go along Canal and Mill Streets (the meter man's beat). The shared parking
// module fills the rest of the curbs afterwards, and leaves these spaces alone.
function parkedCars() {
  const r = L.rng.fork('parked');
  const aves = [54, 134, 214, 294], sts = [-210, -140];
  const slots = [];
  for (const z of sts) for (let k = 0; k < aves.length - 1; k++) for (let x = aves[k] + 13; x < aves[k + 1] - 12; x += 6.3) {
    slots.push({ x, z: z + 5, yaw: Math.PI / 2 });
    slots.push({ x, z: z - 5, yaw: -Math.PI / 2 });
  }
  const windows = [['7:40', '11:50'], ['8:30', '17:40'], ['9:10', '12:20'], ['10:05', '15:30'], ['11:40', '16:50'], ['12:30', '18:10'], ['13:15', '17:05'], ['16:40', '22:40'], ['18:20', '22:50'], ['6:00', '9:30'], ['14:20', '20:10']];
  let n = 0;
  for (const s of slots) {
    // keep hydrants, the station forecourt and our own curb business clear
    if (clutterNear(s.x, s.z, 3.0).some((q) => q.t === 'fire_hydrant' || /^(car_|truck_|bus_)/.test(q.t))) continue;
    if (s.z < -212 && s.x > 185 && s.x < 240) continue;
    if (!r.chance(0.62)) continue;
    const ws = [r.pick(windows)]; if (r.chance(0.4)) ws.push(r.pick(windows));
    for (const [a, b] of ws) {
      const t0 = T(a) + r.int(-15, 15), t1 = T(b) + r.int(-15, 15);
      if (!curbFree(s.x, s.z, t0, t1, 5.4)) continue;
      if (!clear(s.x, s.z, 2.2, t0, t1)) continue;
      const type = r.weighted(CAR_TYPES);
      park(type, s.x, s.z, s.yaw, t0, t1, { tint: r.pick(PAINT), tint2: r.pick(['#e8e4d8', '#d8d0b8', '#2a2a2e']) });
      G.parked = G.parked || []; G.parked.push({ ...s, t0, t1, type });
      n++;
    }
  }
  scene('Cars coming and going on Canal and Mill Streets', 200, -140, '6:00', '22:50', n);
}

// ================================================================== shop mornings
// who opens up where, and how: sweep the walk, wash the glass, hose the sidewalk, water the flowers,
// chalk the specials board, carry out the sidewalk display.
const MORNINGS = [
  ['Halloran & Sons Bakery', 'Dottie', 'Flanagan', 'sweep', '7:05', 20, ['Four hundred loaves out the door and flour on everything.', 'Mr. Halloran says the walk\'s the shop\'s handshake.']],
  ["Russo's Meats", 'Anthony', 'Russo', 'sweep', '7:12', 20, ['Pop swept this walk every morning since 1919. Now it\'s me.', 'Sausage special today. Tell your mother.']],
  ["Russo's Meats", 'Vincenzo', 'Russo', 'chalk', '7:38', 14, ['Forty-nine cents. In 1920 it was eleven. Don\'t tell me about progress.'], 'town_chalkboard_meat'],
  ["Lee's Hand Laundry", 'Henry', 'Lee', 'sweep', '7:28', 18, ['Shirts at fifteen cents, starched the way your father liked.', 'Grace will be by later. She always is.']],
  ['Adler & Son, Tailors', 'Samuel', 'Adler', 'window', '8:02', 22, ['Pop won\'t let anyone else touch his glass.', 'A good window is a good suit. Nobody notices until it\'s wrong.']],
  ['Castellano Fish Market', 'Vincent', 'Castellano', 'hose', '6:50', 25, ['Fish market walk gets a hosing or the cats move in.', 'Sal Jr.\'s home! You heard? Home from Korea!']],
  ['Castellano Fish Market', 'Maria', 'Castellano', 'chalk', '7:20', 12, ['Haddock\'s beautiful today. The boats came in heavy.'], 'town_chalkboard_fish'],
  ["Mayhew's Pharmacy & Soda Fountain", 'Buddy', 'Keene', 'sweep', '8:08', 20, ['Soda fountain opens at nine, lime rickeys at nine-oh-one.', '♪ Oh my papa, to me he was so wonderful…']],
  ["Mayhew's Pharmacy & Soda Fountain", 'Buddy', 'Keene', 'chalk', '8:42', 10, ['Lime rickey, ten cents. Tell Shirley Oakes. No — don\'t.'], 'town_chalkboard_soda'],
  ["Freeman's Barber Shop", 'Sammy', 'Freeman', 'sweep', '8:00', 20, ['Pop says a clean walk brings in a clean customer.', 'Shine, mister? After I finish here. Ten cents.']],
  ["Woolcott's 5 & 10", 'Harold', 'Woolcott', 'sweep', '8:05', 18, ['Four hundred pennants by ten o\'clock. You watch.', 'Goldfish, pennants, thread, film. Come in, come in.']],
  ['Bloom & Bower Florist', 'Ivy', 'Bower', 'water', '8:20', 25, ['Bronze mums for the wedding, white for St. Luke\'s.', 'Rose did the bride\'s bouquet at five this morning.']],
  ["Draper's Toys", 'Ambrose', 'Draper', 'sweep', '8:32', 16, ['The boys wore that groove in my sidewalk. I leave it be.', 'Seventy-four and I still sweep my own walk.']],
  ['Silva Dress Shop', 'Filomena', 'Silva', 'window', '8:40', 22, ['Mother wants the glass so clean the dresses look outside.', 'I took up Peggy Halloran\'s taffeta two inches. Two!']],
  ['Bishop Music Co.', 'Clifford', 'Bishop', 'sweep', '8:38', 15, ['Every 45 in the store goes to the sock hop tonight.', 'Second cornet in the band at one. God help the first.']],
  ['Garrity Hardware', 'Tom', 'Garrity', 'sweep', '7:22', 20, ['Rakes out front, pails by the door. Fall\'s a good season.', 'My brother the priest marries them at two. I just sell the rice.']],
  ['The Signal Lamp Tavern', 'Mike', 'Flanagan', 'sweep', '10:20', 20, ['Doors at eleven. Ladies invited, it says on the glass.', 'Swept better than the Anchor & Chain. Tell Swede I said so.']],
  ['Tremblay Furniture', 'Armand', 'Tremblay', 'window', '9:00', 22, ['Television sets on easy terms. The future, a dollar a week.', 'Mrs. Halloran bought an Admiral from me. The whole street watches it.']],
  ["Kowalski's Market", 'Danny', 'Kowalski', 'sweep', '7:38', 18, ['Pop says sweep it like the Pope\'s coming. Every day.', 'Stock boy, sweeper, delivery boy. One salary.']],
  ['Sweet Shoppe', 'Constantine', 'Kouris', 'sweep', '8:45', 15, ['Penny candy still a penny. I am a fool. A happy fool.', 'Centennial fudge, maple walnut, from an 1853 recipe!']],
  ['Station Luncheonette', 'Myrtle', 'Beal', 'chalk', '5:52', 14, ['Blue plate\'s hash and eggs. Same as the last forty years.'], 'town_chalkboard_lunch'],
  ['Lantern Tobacco & News', 'Emmett', 'Judd', 'chalk', '7:35', 14, ['Fifty cents a square. I\'m taking the Dodgers, God help me.'], 'town_chalkboard_series'],
  ['Beaumont Shoes', 'Émile', 'Beaumont', 'window', '8:28', 20, ['Fitted by X-ray. The boys come in to look at their toes.']],
  ['Whitcomb Ship Chandlery', 'Wendell', 'Carver', 'sweep', '7:45', 18, ['Cordage, hardware, provisions. Since 1858.', 'Frank Rourke pulled my grandsons off a porch in \'38.']],
  ["Mrs. Pruitt's Rooms", 'Edna', 'Pruitt', 'sweep', '7:18', 18, ['No Vacancy. Harbor Days, you know. Even the attic.', 'Mr. Sprague\'s been up since five, walking the quay.']],
  ['Ellsworth Loan & Jewelry', 'Cyrus', 'Ellsworth', 'sweep', '9:02', 14, ['Money loaned on anything of value. I\'ve seen it all.']],
  ['Bay Travel & Telegraph', 'Marguerite', 'Abbott', 'window', '9:05', 18, ['Bermuda, a hundred and eighty-nine dollars. Imagine!']],
  ['The Anchor & Chain', 'Olaf', 'Olsen', 'sweep', '9:30', 18, ['Swede\'s the name. Seafaring men welcome. The rest, we\'ll see.']],
];
const MORNING_LABEL = { sweep: (n) => `Sweeping the walk in front of ${n}`, window: (n) => `Washing the windows at ${n}`, hose: (n) => `Sluicing down the sidewalk at ${n}`, water: (n) => `Watering the flowers outside ${n}`, chalk: (n) => `Chalking the specials board at ${n}` };
function shopMornings() {
  for (const [shop, first, last, kind, at, dur, lines, board] of MORNINGS) {
    const P = place(shop), p = person(first, last);
    if (!P || !p) continue;
    const t0 = T(at), t1 = t0 + dur;
    if (!avail(p, t0 - 12, t1)) continue;
    const [s0, s1] = span(P);
    const short = shop.replace(/^The /, 'the ');
    let s = null, held = null;
    if (kind === 'sweep' || kind === 'hose') {
      // along the frontage on the wider side of the door, sweeping toward the door
      const right = s1 > -s0, far = right ? Math.min(s1 - 0.8, 4.2) : Math.max(s0 + 0.8, -4.2);
      const q = P.at(far, 1.5), d = P.at(0, 1.5);
      const len = Math.max(1.5, Math.min(3.8, Math.abs(far) - 0.6));
      s = spot(q.x, q.z, { yaw: yawTo(q.x, q.z, d.x, d.z), pace: len, act: 'sweep' });
      held = 'broom';
      sound(q.x, q.z, t0, t1, kind === 'hose' ? 'hose' : 'sweep', 22, 0.45);
      if (kind === 'hose') timed('bucket_suds', P.at(far > 0 ? 1.2 : -1.2, 0.4).x, P.at(far > 0 ? 1.2 : -1.2, 0.4).z, 0, t0, t1);
    } else if (kind === 'window') {
      const q = frontSpot(P, [-2.6, 2.6, -4, 4, -1.8, 1.8], 0.55, 0.5, t0, t1);
      if (!q) continue;
      s = spot(q.x, q.z, { yaw: P.yawIn, act: 'wash' });
      held = 'rag';
      const b = P.at(q.side + (q.side > 0 ? 0.8 : -0.8), 0.35);
      timed('bucket_suds', b.x, b.z, 0, t0, t1);
    } else if (kind === 'water') {
      const q = frontSpot(P, [2.2, -2.2, 3.2, -3.2], 1.3, 0.4, t0, t1) || { ...P.at(1.5, 1.3), side: 1.5 };
      s = spot(q.x, q.z, { yaw: P.yawIn, act: 'water_plants' });
    } else if (kind === 'chalk') {
      const q = frontSpot(P, [-1.7, 1.7, -2.6, 2.6, -3.4, 3.4], 0.5, 0.55, t0, T('22:30'));
      if (!q || !board) continue;
      claim(q.x, q.z, 0.6, t0, T(board === 'town_chalkboard_lunch' ? '15:30' : board === 'town_chalkboard_soda' ? '21:00' : '18:30'));
      timed(board, q.x, q.z, P.yawOut, t0 + 4, board === 'town_chalkboard_lunch' ? '15:30' : board === 'town_chalkboard_soda' ? '21:00' : '18:30');
      const w = P.at(q.side, 1.35);
      s = spot(w.x, w.z, { yaw: P.yawIn, act: 'paint' });
      held = 'chalk';
    }
    if (!s) continue;
    claim(s.x, s.z, 0.6, t0, t1);
    put(p, t0, t1, s, { act: s.act, held, label: MORNING_LABEL[kind](short), lines });
    scene(MORNING_LABEL[kind](short).replace(/^\w/, (c) => c.toUpperCase()), s.x, s.z, t0, t1, 1);
  }
  // Jacob Weiss sets his watch by the street clock at 8:59, as he has since 1919
  const W = place('Weiss Jewelers'), jw = person('Jacob', 'Weiss');
  const clock = clutterNear(317.5, 7, 3).find((q) => q.t === 'street_clock');
  if (W && jw && avail(jw, '8:40', '9:06')) {
    const c = clock || W.at(-5, 3.2), q = { x: c.x + (W ? W.u[0] * -1.1 : 0), z: c.z + (W ? W.u[1] * -1.1 : -1.1) };
    const s = spot(q.x, q.z, { faceTo: [c.x, c.z], act: 'wait' });
    put(jw, '8:52', '9:05', s, { act: 'wait', label: 'Setting his watch by the street clock', lines: ['Eight fifty-nine. Otto\'s clock says so, so it is so.', 'If the clock is wrong, Juniper Bay is late for everything.'] });
    scene('Mr. Weiss sets his watch by the street clock', q.x, q.z, '8:52', '9:05', 1);
  }
  // sidewalk displays carried out and set up for the day
  const displays = [
    ["Kowalski's Market", 'Ted', 'Kowalski', 'town_fruit_stand', '7:00', '19:00', 'Setting out the fruit stand', ['Macs from the Whitaker farm. Cortlands for pie.', 'Pumpkins are early this year. Everything\'s early.'], 1.1],
    ['Garrity Hardware', 'Tom', 'Garrity', 'town_hardware_display', '7:56', '18:00', 'Setting out the rakes and pails', ['Fall clean-up. Rakes a dollar and a quarter.'], 0.8],
    ['Pike & Daughter Books', 'Josephine', 'Pike', 'town_book_cart', '9:25', '17:30', 'Wheeling out the bargain book cart', ['Any book on the cart, ten cents. Even the good ones.'], 1.0],
  ];
  for (const [shop, first, last, type, at, until, lab, lines, out] of displays) {
    const P = place(shop), p = person(first, last);
    if (!P) continue;
    const q = frontSpot(P, [3.2, -3.2, 4.5, -4.5, 2.5, -2.5, 5.5, -5.5], out, 1.1, at, until);
    if (!q) continue;
    claim(q.x, q.z, 1.2, at, until);
    timed(type, q.x, q.z, P.yawOut, T(at) + 18, until);
    (G.display = G.display || {})[type] = { ...q, P, t0: T(at) + 18, t1: T(until) };
    if (p && avail(p, T(at) - 10, T(at) + 20)) {
      const d = P.at(0, 0.3), c = P.at(q.side * 0.85, out + 0.1);
      const s = spot(d.x, d.z, { yaw: yawTo(d.x, d.z, c.x, c.z), pace: Math.max(1, Math.hypot(c.x - d.x, c.z - d.z) - 0.6), act: 'carry' });
      put(p, at, T(at) + 20, s, { act: 'carry', held: 'crate_small', label: lab, lines });
    }
    scene(`${lab} at ${shop}`, q.x, q.z, at, until, 1);
  }
}

// ================================================================== deliveries
// a vehicle at the curb in front of P with its rear doors near the shop door; returns its frame
function truckFor(P, type, t0, t1, o = {}) {
  t0 = T(t0); t1 = T(t1);
  const len = o.len || 6.2;
  for (const side of o.sides || [len / 2 - 0.4, len / 2 + 1.2, -len / 2 + 0.6, len / 2 + 3, -len / 2 - 1.5]) {
    const c = curbAt(P, side);
    const bad = clutterNear(c.x, c.z, len / 2 + 0.5).some((q) => q.t === 'fire_hydrant' || /^(car_|truck_|bus_)/.test(q.t));
    if (bad || !curbFree(c.x, c.z, t0, t1, len)) continue;
    park(type, c.x, c.z, c.yaw, t0, t1, { len, tint: o.tint, tint2: o.tint2 });
    const rear = along(c, -len / 2 - 0.2, 0), rearWalk = along(c, -len / 2 + 0.6, 1.9);
    return { ...c, len, side, rear, rearWalk };
  }
  return null;
}
// a man hauling from the truck to the door and back (a pacing spot); o: { held, act, label, lines, arms }
function haul(p, t0, t1, from, to, o = {}) {
  const yaw = yawTo(from.x, from.z, to.x, to.z), d = Math.hypot(to.x - from.x, to.z - from.z);
  const s = spot(from.x, from.z, { yaw, pace: Math.max(1.2, d - 0.3), act: o.act || 'carry' });
  put(p, t0, t1, s, { act: o.act || 'carry', held: o.held === undefined ? 'crate_small' : o.held, label: o.label, lines: o.lines });
  return s;
}
function driver(want, first, last, bio, lines, outfit = 'dock', from = 'garage') {
  return visitor({ first, last, sex: 'M', age: want || L.rng.int(24, 55), outfit, bio, lines, from, visitor: false });
}
const DELIVERIES = [
  // [place, vehicle, t0, t1, crew, what's carried (held), stack prop at the curb, caption, crew lines, firm]
  ['Lantern Tobacco & News', 'town_van_courier', '6:04', '6:24', 1, 'newspaper', 'newspaper_bundles', 'The Courier van dropping the morning bundles', ['Centennial edition! Two hundred for Mr. Judd.', 'Morning, Emmett. Same as always, only more.'], 'Courier'],
  ['Station Luncheonette', 'truck_bread', '6:00', '6:22', 1, 'crate_small', 'crate_stack', 'Halloran\'s bread for the Station Luncheonette', ['Hot from the ovens. Pat fired them at half past four.'], 'Halloran'],
  ['Harbor Light Diner', 'truck_bread', '6:32', '6:52', 1, 'crate_small', 'crate_stack', 'Halloran\'s bread for the Harbor Light Diner', ['Nick wants the rye sliced. Nick always wants the rye sliced.'], 'Halloran'],
  ["Mayhew's Pharmacy & Soda Fountain", 'truck_milk', '6:35', '6:55', 1, 'crate_small', 'milk_bottles', 'Cream and milk for Mayhew\'s soda fountain', ['Heavy cream for the malteds. Buddy goes through it like water.'], 'Dairy'],
  ['Castellano Fish Market', 'town_van_ice', '6:58', '7:24', 2, 'crate_small', 'hb_ice_blocks', 'Bayside Ice unloading for the fish market', ['Three hundred pounds for Vinnie. The boats came in heavy.', 'Mind your feet — ice coming through!'], 'Ice'],
  ["Kowalski's Market", 'truck_pickup', '6:40', '7:05', 1, 'crate_small', 'crate_stack', 'Apples in from the Whitaker farm on Juniper Hill', ['Macs, Cortlands, Baldwins. Picked yesterday.', 'Ted pays in cash and sausage. Best customer I\'ve got.'], 'Farm'],
  ['The Signal Lamp Tavern', 'town_truck_beer', '7:30', '8:02', 2, 'crate_small', 'barrel', 'The Harbor Brewing truck rolling kegs into the Signal Lamp', ['Eight kegs for Harbor Days. Mike ordered twelve.', 'Down the cellar door, easy. Easy!'], 'Brewery'],
  ["Mayhew's Pharmacy & Soda Fountain", 'town_truck_soda', '8:14', '8:44', 1, null, 'town_soda_cases', 'The Coca-Cola man at Mayhew\'s', ['Forty cases for the Centennial. Buddy says it won\'t last till six.'], 'Soda'],
  ['Union Station', 'town_van_express', '9:05', '9:42', 2, 'crate_small', 'crate', 'The Railway Express van at Union Station', ['Parcels for Harlow\'s, a crate for Tremblay\'s, and somebody\'s canary.', 'Sign here, and here, and here.'], 'Express'],
  ['The Whitcomb Hotel', 'town_van_laundry', '10:00', '10:30', 1, 'crate_small', 'laundry_bundles', "Lee's Hand Laundry collecting the hotel linens", ['Seventy rooms, seventy bundles. Harbor Days!', 'Mr. Lee starches the pillowcases. The guests notice.'], 'Laundry'],
  ['The Anchor & Chain', 'town_truck_beer', '10:32', '11:02', 2, 'crate_small', 'barrel', 'Kegs for the Anchor & Chain', ['Swede wants them in the cellar, not the bar. Last year he drank one.'], 'Brewery'],
  ['Station Luncheonette', 'town_truck_soda', '11:02', '11:26', 1, null, 'town_soda_cases', 'Soda for the Station Luncheonette', ['Myrtle takes ten cases and a lecture on the price.'], 'Soda'],
  ['Tremblay Furniture', 'town_van_express', '11:34', '12:05', 2, 'crate_small', 'crate', 'A crated Admiral television arriving at Tremblay\'s', ['Twenty-one inches. Somebody on Maple Street is getting a new life.', 'This end up. This END up!'], 'Express'],
  ["Woolcott's 5 & 10", 'town_truck_soda', '13:08', '13:34', 1, null, 'town_soda_cases', "Soda cases for Woolcott's lunch counter", ['Grilled cheese and a Coke, twenty-five cents. Best deal in town.'], 'Soda'],
  ['The Marlowe Apartments', 'town_van_tremblay', '14:28', '15:02', 2, 'crate_small', 'crate', 'Tremblay\'s delivering a new console radio to the Marlowe', ['Fourth floor, no elevator. Of course it is.', 'Easy terms, Mrs. Sayer. Free delivery. Free!'], 'Tremblay'],
  ["Lee's Hand Laundry", 'town_van_laundry', '16:02', '16:28', 1, 'crate_small', 'laundry_bundles', 'The laundry van bringing back the hotel linens', ['Shirts, collars, linens. Mr. Lee checks every one.'], 'Laundry'],
];
const FIRM = {
  Courier: ['Walt', 'Garrity', 'Drives the Courier van. Up at five, in bed by nine, knows every newsstand from here to Salem.'],
  Halloran: ['Eddie', 'Keane', 'Drives the Halloran & Sons bread route. Grandma Bridget\'s nephew\'s boy, which in Juniper Bay makes him family.'],
  Dairy: ['Leon', 'Bassett', 'Route man for the Juniper Dairy, on the downtown stops this morning.'],
  Ice: ['Nils', 'Lindgren', 'Bayside Ice & Cold Storage. Carries a hundred pounds on one shoulder and a grudge about refrigerators on the other.'],
  Farm: ['Lyman', 'Whitaker', 'Whitaker Farm, Juniper Hill. Brings apples to Kowalski\'s every Saturday from September to the first frost.'],
  Brewery: ['Joe', 'Pacheco', 'Drives for the Harbor Brewing Company. "Hi, neighbor" to every bartender on the coast.'],
  Soda: ['Ray', 'Dumont', 'The Coca-Cola route man. Red truck, yellow cases, and a bottle opener on a chain.'],
  Express: ['Gil', 'Sharkey', 'Railway Express Agency, Juniper Bay office. Moves everything from canaries to caskets.'],
  Laundry: ['Tommy', 'Wong', "Drives the van for Lee's Hand Laundry on Saturdays. Studying engineering at Northeastern."],
  Tremblay: ['Réal', 'Tremblay', "Armand Tremblay's nephew, and the \"free\" in free delivery."],
};
function deliveries() {
  const crews = G.crews = new Map();
  for (const [shop, type, a, b, n, held, stack, cap, lines, firm] of DELIVERIES) {
    const P = place(shop);
    if (!P || !has(type)) continue;
    const t0 = T(a), t1 = T(b);
    const tr = truckFor(P, type, t0 - 2, t1 + 2, { len: type.startsWith('car') ? 5.2 : 6.2 });
    if (!tr) continue;
    label(tr.x, 1.6, tr.z, t0 - 2, t1 + 2, cap, 3);
    sound(tr.x, tr.z, t0 - 2, t0 + 1, 'engine', 40, 0.4); sound(tr.x, tr.z, t1, t1 + 2, 'engine', 40, 0.4);
    // the firm's men (the same fellows all day)
    let crew = crews.get(firm);
    if (!crew) {
      const [f, l, bio] = FIRM[firm] || ['Hank', 'Doyle', 'A delivery man.'];
      crew = [driver(null, f, l, bio, lines, firm === 'Dairy' ? 'milkman' : 'dock', firm === 'Express' ? 'station' : 'garage')];
      crews.set(firm, crew);
    }
    while (crew.length < n) crew.push(driver(null, null, null, `Rides with ${crew[0].first} ${crew[0].last} on the ${firm === 'Brewery' ? 'brewery' : firm.toLowerCase()} truck.`, lines, 'dock', crew[0]._from));
    // the stack by the truck's back doors, and a smaller one at the shop door
    const sk = along(tr, -tr.len / 2 + 0.4, 1.75);
    if (stack && has(stack)) timed(stack, sk.x, sk.z, P.yawRight, t0 + 1, t1 - 2, stack === 'barrel' ? { scale: 0.8 } : {});
    const door = P.at(0.6, 0.45);
    for (let i = 0; i < n; i++) {
      const p = crew[i];
      if (!L.free(p, t0 - 6, t1 + 1)) continue;
      const from = along(tr, -tr.len / 2 + 0.3 + i * 1.1, 1.6);
      if (type === 'town_truck_soda' && i === 0) {
        // the hand truck man
        haul(p, t0, t1, from, door, { held: null, act: 'counter', label: 'Wheeling cases of Coca-Cola in on a hand truck', lines });
        L.follow(p, 'town_hand_truck', { fwd: 0.75, when: 'spot', t0, t1 });
      } else haul(p, t0, t1, from, door, { held, label: `Unloading — ${cap.charAt(0).toLowerCase()}${cap.slice(1)}`, lines });
    }
    scene(cap, tr.x, tr.z, t0, t1, n);
  }
}
// 10 PM: the presses are rolling, the vans load the Sunday Centennial edition at the Courier
function courierNight() {
  const P = place('The Juniper Bay Courier');
  if (!P || !has('town_van_courier')) return;
  const vans = [];
  for (const [a, b] of [['21:55', '22:40'], ['22:05', '22:50']]) { const v = truckFor(P, 'town_van_courier', a, b, { sides: [-4, 4, -10, 10, 3.5] }); if (v) vans.push([v, a, b]); }
  const men = [];
  vans.forEach(([v, a, b], i) => {
    label(v.x, 1.6, v.z, a, b, 'Loading the Sunday Centennial edition — 48 pages', 3);
    sound(v.x, v.z, a, b, 'engine', 35, 0.35);
    const sk = along(v, -v.len / 2 + 0.4, 1.75);
    timed('newspaper_bundles', sk.x, sk.z, P.yawRight, T(a) + 2, b);
    for (let k = 0; k < 2; k++) {
      const p = men[i * 2 + k] || (men[i * 2 + k] = visitor({ sex: 'M', age: L.rng.int(20, 45), outfit: 'dock', from: 'garage', visitor: false, bio: 'Loads the Courier vans on press nights.', lines: ['CENTURY BY THE SEA. That\'s tomorrow\'s headline. You didn\'t hear it from me.', 'Forty-eight pages. My back felt every one.'] }));
      haul(p, a, b, along(v, -v.len / 2 + 0.3 + k, 1.6), P.at(k ? 0.8 : -0.8, 0.4), { held: 'newspaper', label: 'Loading bundles of the Sunday Courier', lines: ['CENTURY BY THE SEA. That\'s the headline.', 'Hot off the press, and I mean hot.'] });
    }
  });
  if (vans.length) {
    sound(P.door.x, P.door.z, '21:30', '23:30', 'typewriter', 30, 0.4);
    scene('The Courier vans load the Sunday edition', P.door.x, P.door.z - 5, '21:55', '22:50', men.length);
  }
}

// ================================================================== Union Station and the trains
const TRAINS = ['7:15', '9:52', '12:40', '16:52', '19:30', '22:05'];
const FW = [-120, 10]; // where the fireworks burst
function hidden(x, z) { return spot(x, z, { hidden: true }); }

function stationLife() {
  const S = place('Union Station'); if (!S) return;
  // the shoeshine boy on the forecourt, between the flagpole and the doors
  const b0 = S.at(4.6, -3.0), b = nearClear(b0.x, b0.z, 0.9, 0, 1440, 3);
  if (!b) return;
  claim(b.x, b.z, 1.2);
  timed('town_shine_box', b.x, b.z, Math.PI, '6:40', '18:40');
  const boy = G.leroy = visitor({ first: 'Leroy', last: 'Tate', age: 13, sex: 'M', from: 'station', visitor: false,
    bio: 'Leroy Tate, 13, shines shoes on the station forecourt every Saturday. Ten cents, fifteen with the snap of the rag. Saving for a Schwinn.',
    lines: ['Shine, mister? Ten cents. You could see your face in \'em.', 'Fifteen with the snap. Everybody takes the snap.', 'The 9:52 is the best train. Salesmen. Salesmen always want a shine.'] });
  const ks = spot(b.x, b.z + 0.62, { yaw: Math.PI, act: 'shine' });
  const cs = spot(b.x, b.z - 0.42, { yaw: 0, act: 'read_stand' });
  put(boy, '6:45', '12:05', ks, { act: 'shine', held: 'rag', label: 'Shining shoes on the station forecourt', say: ['Shine! Shine, mister?', 'Ten cents, and fifteen with the snap!'] });
  put(boy, '12:40', '18:30', ks, { act: 'shine', held: 'rag', label: 'Shining shoes on the station forecourt', say: ['Shine! Shine, mister?', 'Ten cents, and fifteen with the snap!'] });
  let n = 0;
  for (let t = T('7:00'); t < T('18:15'); t += 13 + (n % 3) * 2) {
    if (t > T('11:55') && t < T('12:45')) continue;
    const [c] = cast(1, t, t + 8, { age: [25, 75], sex: 'M' }, b.x, b.z);
    if (c && put(c, t, t + 8, cs, { act: 'read_stand', held: 'newspaper', label: 'Getting a shine on the station forecourt', lines: ['Make it the fifteen-cent one, son.', 'Kid does a better job than the fellow at South Station.'] })) n++;
  }
  scene('Leroy Tate shines shoes on the station forecourt', b.x, b.z, '6:45', '18:30', n + 1);
}

function trainTimes() {
  const S = place('Union Station'); if (!S) return;
  const H = place('The Whitcomb Hotel');
  const door = S.at(0, -3.8);
  const cabSides = [10.5, 17, 23.5];
  const drivers = [['Joe', 'Coffin', 'Drives Juniper Cab No. 1. Thirty-five cents anywhere in town, and the news for nothing.'], ['Sully', 'Doyle', 'Juniper Cab No. 2. Knows every short cut and uses none of them.'], ['Manny', 'Pires', 'Juniper Cab No. 3. His brother fishes out of Pier 3; his cab smells like it.']]
    .map(([f, l, bio]) => visitor({ first: f, last: l, sex: 'M', age: L.rng.int(30, 58), from: 'garage', visitor: false, bio, look: { hat: 'hat_flatcap', hatTint: '#3a3a40' }, lines: ['Cab? Anywhere in town, thirty-five cents.', 'Harbor Days! I\'ve made more today than all of August.'] }));
  const porters = [['Wash', 'Tolliver'], ['Cato', 'Hines']].map(([f, l]) => visitor({ first: f, last: l, sex: 'M', age: L.rng.int(40, 62), outfit: 'conductor', from: 'station', visitor: false,
    look: { hat: 'hat_cap', hatTint: '#a8201e', hatTint2: '#1a1a1e' }, bio: 'Red cap at Union Station. Carries the bags, knows the timetables by heart, and tips his cap to every lady.', lines: ['Bags, ma\'am? Right this way.', 'The 9:52 is the busiest train of the week, Centennial or no.'] }));
  const clarence = person('Clarence', 'Ives');
  const counts = { '7:15': [2, 1, 0], '9:52': [3, 3, 1], '12:40': [3, 2, 1], '16:52': [3, 2, 1], '19:30': [2, 1, 0], '22:05': [1, 1, 0] };
  const families = (L.ctx.households || []).filter((h) => h.members && h.members.length >= 2 && h.members.every((p) => !p.commuter));
  L.rng.shuffle(families);
  let fams = 0;
  for (const at of TRAINS) {
    const t = T(at), [nCab, nHotel, nFam] = counts[at];
    // the cab rank fills up a quarter hour before the train and empties as the fares come out
    cabSides.forEach((side, i) => {
      if (i >= nCab) return;
      const c = curbAt(S, side), ta = t - 18 + i * 3, td = t + 6 + i * 5;
      if (!curbFree(c.x, c.z, ta, td, 5.4)) return;
      park('car_taxi', c.x, c.z, c.yaw, ta, td, { tint: '#e0b030', tint2: '#2a2a2a' });
      const d = drivers[i], lean = along(c, -0.9, 1.95), inCab = hidden(c.x, c.z);
      const ls = spot(lean.x, lean.z, { faceTo: [door.x, door.z], act: 'lean' });
      // while they wait, the drivers gather by the first cab and chew the fat
      const kq = along(curbAt(S, cabSides[0]), -3.6, 2.4);
      const knot = G.cabKnot || (G.cabKnot = spot(kq.x, kq.z, { spread: 0.8, act: 'talk' }));
      if (L.free(d, ta, td + 1)) plan(d, ta + 1, td + 1, [{ t: ta + 1, spot: i === 0 ? ls : knot, act: i === 0 ? 'lean' : 'talk', label: `Waiting on the ${at} with his cab` }, { t: t, spot: ls, act: 'wait', label: `Watching the doors for a fare off the ${at}`, lines: ['Cab? Anywhere in town, thirty-five cents.', 'Here she comes. Right on Otto\'s clock.'] }, { t: td, spot: inCab, act: 'stand', label: 'Driving a fare into town' }], { noResume: true });
      // the fare: out of the station, into the back seat
      const fare = visitor({ from: 'station', age: L.rng.int(25, 70) });
      const fs = spot(along(c, -0.6, 1.5).x, along(c, -0.6, 1.5).z, { faceTo: [c.x, c.z], act: 'wait' });
      plan(fare, t + 1 + i, td + 1, [{ t: t + 1 + i, spot: fs, act: 'hail_taxi', held: 'suitcase', label: 'Just off the train, hailing a cab' }, { t: td - 0.5, spot: inCab, act: 'stand', label: 'In a cab' }], { noResume: true, early: 0 });
    });
    if (nCab >= 2) L.convo(drivers.slice(0, nCab), t - 15, t, [
      [1, 'You see Marciano Thursday? Eleventh round.'], [0, 'LaStarza never saw it coming. Neither did my five bucks.'],
      [2, 'Harbor Days fares, boys. Buy the wife something nice.'], [0, 'I bought her a cab. She says it smells like fish.'],
      [1, 'The 9:52\'s late Saturdays.'], [2, 'Not with Otto Lindqvist on the platform it ain\'t.'],
    ]);
    // red caps with their carts, and the crowd
    porters.forEach((p, i) => {
      const a = S.at(2.5 + i * 3, -3.4), c = curbAt(S, cabSides[i % nCab ? i : 0]);
      const bto = along(c, -2.4, 1.8);
      if (!L.free(p, t - 4, t + 22)) return;
      haul(p, t - 2, t + 20, a, bto, { held: null, act: 'counter', label: 'Wheeling bags out to the cab rank' });
      L.follow(p, 'luggage_cart', { fwd: 1.05, when: 'spot', t0: t - 2, t1: t + 20 });
    });
    sound(door.x, door.z, t, t + 12, 'crowd', 40, 0.45);
    label(door.x, 2.2, door.z, t - 1, t + 14, `The ${at} from Boston is in`, 5);
    // hotel guests, met by Clarence Ives and his cart
    const hs = spot(S.at(-4, -2.4).x, S.at(-4, -2.4).z, { spread: 1.2, faceTo: [door.x, door.z], act: 'wait' });
    const hdoor = H ? hidden(H.at(0, -0.8).x, H.at(0, -0.8).z) : null;
    for (let k = 0; k < nHotel && hdoor; k++) {
      const g = visitor({ from: 'station', formal: true, bio: 'Checking in at the Whitcomb Hotel for the Centennial weekend.', lines: ['We had the Whitcomb booked since March. Seventy rooms and not one left.', 'Is it always this lively, or is it the Centennial?'] });
      plan(g, t + 2 + k, t + 30, [{ t: t + 2 + k, spot: hs, act: 'wait', held: 'suitcase', label: 'Waiting for the Whitcomb Hotel bellhop' }, { t: t + 7, spot: hdoor, act: 'stand', held: 'suitcase', label: 'Checking in at the Whitcomb Hotel' }], { noResume: true, early: 0 });
      (G.hotelGuests = G.hotelGuests || []).push(g);
    }
    if (clarence && H && nHotel >= 2 && avail(clarence, t - 8, t + 16)) {
      const cs = spot(S.at(-6.5, -1.6).x, S.at(-6.5, -1.6).z, { faceTo: [door.x, door.z], act: 'wait' });
      const back = spot(H.at(1.4, 1.2).x, H.at(1.4, 1.2).z, { yaw: H.yawIn, act: 'stand' });
      plan(clarence, t - 3, t + 16, [{ t: t - 3, spot: cs, act: 'wait', label: `Meeting the ${at} for the Whitcomb Hotel`, lines: ['Whitcomb Hotel! Guests of the Whitcomb, this way please.', 'Thirty-one years I\'ve met these trains.'] }, { t: t + 7, spot: back, act: 'stand', arms: 'push', held: 'suitcase', label: 'Wheeling the guests\' bags across to the hotel' }]);
      L.follow(clarence, 'bellhop_cart', { fwd: 1.0, when: 'always', t0: t - 3, t1: t + 16 });
    }
    // a family meeting a relative off the train
    for (let k = 0; k < nFam; k++) {
      let hh = null;
      while (families.length && !hh) {
        const h = families.pop();
        const m = h.members.filter((p) => L.idle(p, t - 16, t + 14));
        if (m.length >= 2 && L.homePlace(m[0])) hh = { h, m: m.slice(0, 3) };
      }
      if (!hh) break;
      const HP = L.homePlace(hh.m[0]), last = hh.m[0].last;
      const rel = visitor({ last, sex: L.rng.chance(0.6) ? 'F' : 'M', age: L.rng.int(58, 80), from: 'station', formal: true,
        bio: `Came in on the ${at} to spend the Centennial with the ${last}s.`, lines: [`Look at you! You've grown a foot since Easter!`, 'The train was forty minutes of cinders and a man with a cigar.'] });
      const ms = spot(S.at(-1.5 - k * 3, -1.2).x, S.at(-1.5 - k * 3, -1.2).z, { spread: 1.0, faceTo: [door.x, door.z], act: 'wait' });
      const home = spot(HP.front.x, HP.front.z, { act: 'talk' });
      const walk = Math.ceil(pathLen(ms.node, home.node) / 70) + 2;
      for (const p of hh.m) plan(p, t - 12, t + 6 + walk, [{ t: t - 12, spot: ms, act: 'wait', label: `Meeting the ${at} — ${rel.first} is coming to stay` }, { t: t + 2, spot: ms, act: 'hug', label: `Welcoming ${rel.first} off the train` }, { t: t + 6, spot: home, act: 'talk', label: `Walking ${rel.first} home from the station` }]);
      plan(rel, t + 1, t + 8 + walk, [{ t: t + 1, spot: ms, act: 'hug', held: 'suitcase', label: `Off the ${at} to visit the ${last}s` }, { t: t + 6, spot: home, act: 'talk', held: 'suitcase', label: `Visiting the ${last}s for the Centennial` }, { t: t + 6 + walk, spot: hidden(HP.at(0, -2).x, HP.at(0, -2).z), act: 'stand', label: `Visiting the ${last}s` }], { noResume: true, early: 0 });
      fams++;
      scene(`The ${last}s meet ${rel.first} off the ${at}`, ms.x, ms.z, t - 12, t + 6, hh.m.length + 1);
    }
    scene(`The ${at} train: cabs, red caps and arrivals`, door.x, door.z + 6, t - 18, t + 22, nCab * 2 + 2 + nHotel);
  }
}

// ------------------------------------------------------------------ day-trippers: visitors spending the day in town
// Each activity returns a spot for a group (spread) at (roughly) the given time, or null.
const ACTIVITIES = {
  windows: (t) => { const shops = L.places.shops.filter((P) => P.kind === 'shop' && Math.abs(P.u[1]) > 0.5 && P.door.z > 5 && P.door.z < 15); if (!shops.length) return null; const P = pick(shops), q = frontSpot(P, [-2.8, 2.8, -4, 4], 0.9, 0.5, t, t + 30); return q ? { s: spot(q.x, q.z, { yaw: P.yawIn, spread: 0.8, act: 'browse' }), act: 'browse', label: `Window shopping on Market Street` } : null; },
  quay: () => { const z = pick([-100, -104, -108, -46, -38, 40, 60, 110]), x = 1.2; return { s: spot(x, z, { spread: 1.1, faceTo: z < -90 ? [-45, -128] : [-40, z], act: 'look' }), acts: ['look', 'photograph', 'look'], label: z < -90 ? 'Admiring the S.S. Gray Lady from the quay' : 'Watching the boats from the quay' }; },
  museum: () => { const P = place('Maritime Museum (Old Custom House)'); if (!P) return null; const q = P.at(pick([-5, 6]), 2.4); return { s: spot(q.x, q.z, { spread: 1.0, faceTo: [P.door.x, P.door.z], act: 'look' }), label: 'Looking over the Old Custom House' }; },
  squareEdge: () => { const x = pick([152, 166, 184, 198, 226, 236]); return { s: spot(x, -7.6, { spread: 1.0, faceTo: [x, -40], act: 'look' }), acts: ['look', 'clap', 'look', 'talk'], label: 'Watching the fair from the edge of the square' }; },
  lunch: (t) => {
    if (chance(0.5)) {
      const z = pick([-24, -16, 32, 46, 52, 112, 118]);
      const ss = [0, 0.9, 1.8, 2.7].map((d) => edgeSpot(6, z + d, -1, 0, { sit: true, act: 'eat', t0: t, t1: t + 50 })).filter(Boolean);
      if (ss.length >= 2) { ss.forEach((q) => claim(q.x, q.z, 0.4, t, t + 50)); return { s: ss[0], spots: ss, act: ss[0].act, held: 'hot_dog', label: ss[0].pose === 'sit' ? 'Lunch on the seawall, legs over the harbour' : 'Lunch standing at the harbour rail' }; }
    }
    const P = pick([place('Harbor Light Diner'), place('Station Luncheonette'), place("Woolcott's 5 & 10")].filter(Boolean)); return P ? { s: hidden(P.at(0, -1.2).x, P.at(0, -1.2).z), label: `Having lunch at ${P.name}` } : null;
  },
  boardwalk: () => { const nav = L.ctx.nav, a = L.walkNode(0, 232, 30), b = L.walkNode(40, 232, 30); if (a < 0 || b < 0) return null; const route = nav.path(a, b); return route && route.length > 1 ? { route, label: 'Strolling the boardwalk' } : null; },
  playland: () => ({ s: spot(-31, 228.5, { spread: 1.4, faceTo: [-44, 234], act: 'look' }), acts: ['look', 'laugh', 'look', 'wave'], label: 'Watching the carousel at Playland' }),
  beach: () => { const z = pick([250, 258, 268, 282, 296]); const x = -15 - 4 * Math.sin((z - 206) / 22) + 3; return { s: spot(x, z, { spread: 1.4, faceTo: [x - 20, z], act: 'look' }), label: 'At the water\'s edge on Juniper Beach' }; },
  fireworks: () => { const z = pick([80, 88, 100, 150, 160]); return { s: spot(1.4, z, { spread: 1.5, faceTo: FW, act: 'look' }), acts: ['look', 'cheer', 'look'], label: 'Waiting on the quay for the fireworks' }; },
};
const TRIP_PLANS = [
  // arrival, from, departs (train or 'car'), itinerary
  ['9:52', 'station', '16:52', ['windows', 'museum', 'lunch', 'quay', 'squareEdge']],
  ['9:52', 'station', '16:52', ['quay', 'lunch', 'windows', 'squareEdge']],
  ['9:52', 'station', '19:30', ['squareEdge', 'lunch', 'beach', 'playland', 'boardwalk', 'quay']],
  ['9:52', 'station', '22:05', ['windows', 'lunch', 'boardwalk', 'playland', 'beach', 'quay', 'fireworks']],
  ['9:52', 'station', '16:52', ['museum', 'quay', 'lunch', 'windows']],
  ['10:30', 'garage', 'car', ['windows', 'squareEdge', 'lunch', 'quay', 'museum']],
  ['10:40', 'beachlot', 'car', ['beach', 'boardwalk', 'lunch', 'playland', 'beach']],
  ['11:00', 'garage', 'car', ['squareEdge', 'windows', 'lunch', 'boardwalk', 'fireworks']],
  ['12:40', 'station', '19:30', ['lunch', 'windows', 'quay', 'squareEdge']],
  ['12:40', 'station', '22:05', ['squareEdge', 'windows', 'beach', 'playland', 'fireworks']],
  ['12:40', 'station', '19:30', ['quay', 'museum', 'boardwalk', 'playland']],
  ['16:52', 'station', '22:05', ['windows', 'lunch', 'boardwalk', 'fireworks']],
  ['19:30', 'station', '22:05', ['squareEdge', 'fireworks']],
];
function dayTrippers() {
  let n = 0;
  TRIP_PLANS.forEach(([arr, from, dep, acts], gi) => {
    const r = L.rng.fork('trip' + gi);
    const size = r.int(2, 4), last = null;
    const grp = [];
    for (let k = 0; k < size; k++) {
      const kid = k >= 2;
      grp.push(visitor({ from, last: grp[0] ? grp[0].last : last, sex: k === 0 ? 'M' : k === 1 ? 'F' : (r.chance(0.5) ? 'M' : 'F'), age: kid ? r.int(6, 14) : r.int(26, 58),
        bio: from === 'station' ? `In from Boston on the ${arr} for Harbor Days${dep !== 'car' ? `, home on the ${dep}` : ''}.` : `Drove in for the Centennial and parked ${from === 'garage' ? 'at the Mill Street Garage' : 'by the beach'}.` }));
    }
    let t = T(arr) + 2;
    const end = dep === 'car' ? T(pick(['17:40', '18:30', '21:45'])) : T(dep) - 6;
    const entries = [];
    for (const a of acts) {
      if (t > end - 30) break;
      const act = ACTIVITIES[a](t);
      if (!act) continue;
      const dur = a === 'fireworks' ? Math.max(20, T('21:28') - t) : a === 'lunch' ? r.int(35, 50) : r.int(28, 60);
      if (a === 'fireworks' && t < T('20:20')) { t = T('20:35'); }
      entries.push({ t, ...act });
      t += dur + 8;
    }
    if (!entries.length) return;
    const home = origin(dep === 'car' ? from : 'station');
    grp.forEach((p, k) => {
      const es = entries.map((e) => e.route ? { t: e.t, route: e.route, label: e.label, arms: k === 1 ? 'arm' : null, speed: 1.05 } : { t: e.t + (k % 2) * 0.5, spot: e.spots ? e.spots[k % e.spots.length] : e.s, act: e.act || (e.acts ? e.acts[(k + Math.floor(e.t)) % e.acts.length] : e.s.act), label: e.label, held: e.held || (k === 1 && chance(0.5) ? 'handbag' : (e.acts && e.acts[k % e.acts.length] === 'photograph' ? 'camera' : null)) });
      es.push({ t: Math.max(t, end), spot: home, act: 'stand', label: dep === 'car' ? 'Driving home' : `Taking the ${dep} home`, held: 'suitcase' });
      plan(p, arr, Math.max(t, end) + 2, es, { noResume: true, early: 0 });
    });
    n += grp.length;
    scene(`Day-trippers from out of town (${arr} → ${dep})`, entries[0].s ? entries[0].s.x : 20, entries[0].s ? entries[0].s.z : 232, arr, Math.max(t, end), grp.length);
  });
  G.tripperCount = n;
}

// three sailors off the 12:40 with a day's liberty and a harbour full of opinions
function sailorsOnLeave() {
  const names = [['Eddie', 'Kowalczyk'], ['Ray', 'Lamoureux'], ['Bud', 'Hanlon']];
  const sailors = names.map(([f, l]) => visitor({ first: f, last: l, sex: 'M', age: L.rng.int(19, 23), outfit: 'sailor', from: 'station', bio: `Seaman ${f} ${l}, USS Juneau, forty-eight hours' liberty out of Boston and not a nickel of it planned.`, lines: ['Forty-eight hours liberty! Where\'s the action in this town?', 'My mother thinks I\'m at the Y.', 'Is that a Ferris wheel? Boys, it\'s a Ferris wheel.'] }));
  const A = place('The Anchor & Chain');
  const steps = [
    ['12:44', A ? { s: hidden(A.at(0, -1.2).x, A.at(0, -1.2).z), label: 'Having a beer at the Anchor & Chain' } : null, 70],
    ['14:05', ACTIVITIES.playland(), 55],
    ['15:05', { s: spot(-30.5, 239.2, { spread: 1.0, faceTo: [-35, 243], act: 'eat' }), act: 'drink_stand', held: 'hot_dog', label: 'Eating hot dogs at Playland' }, 20],
    ['15:30', ACTIVITIES.boardwalk(), 40],
    ['16:15', { s: spot(-4, 241, { spread: 1.5, faceTo: [-20, 250], act: 'look' }), acts: ['look', 'laugh', 'wave'], label: 'Looking at the girls on Juniper Beach' }, 35],
    ['17:00', ACTIVITIES.quay(), 45],
    ['18:00', { s: hidden(place('Harbor Light Diner') ? place('Harbor Light Diner').at(0, -1.2).x : 60, place('Harbor Light Diner') ? place('Harbor Light Diner').at(0, -1.2).z : -22), label: 'Supper at the Harbor Light Diner' }, 55],
    ['19:05', ACTIVITIES.playland(), 60],
    ['20:15', { s: spot(1.4, 70, { spread: 1.4, faceTo: FW, act: 'look' }), acts: ['look', 'cheer', 'look'], label: 'On the quay for the fireworks' }, 75],
  ];
  sailors.forEach((p, k) => {
    const es = [];
    for (const [at, a] of steps) { if (!a) continue; es.push(a.route ? { t: at, route: a.route, label: a.label, speed: 1.15 } : { t: T(at) + k * 0.4, spot: a.s, act: a.act || (a.acts ? a.acts[k % a.acts.length] : a.s.act), held: a.held, label: a.label }); }
    es.push({ t: '21:40', spot: origin('station'), act: 'stand', label: 'Catching the 10:05 back to the ship' });
    plan(p, '12:42', '21:44', es, { noResume: true, early: 0 });
  });
  scene('Three sailors on liberty (12:40 → 22:05)', -31, 228, '12:42', '21:40', 3);
}

// ================================================================== trades and characters
// walk a loop of stops from t0 to t1 (as far as time allows); stop.dwell minutes at each
function tour(p, t0, t1, stops, o = {}) {
  t0 = T(t0); t1 = T(t1);
  let t = t0, prev = L.whereAt(p, t0), i = o.start || 0;
  const es = [];
  while (t < t1 - 1.5 && es.length < 300) {
    const s = stops[i % stops.length]; i++;
    if (!s) continue;
    es.push({ t, spot: s, act: s.act, label: s.label || o.label, lines: s.lines || o.lines, held: o.held });
    t += pathLen(prev, s.node) / (p.speed * 60 * (o.pace || 0.9)) + (s.dwell ?? 2);
    prev = s.node;
  }
  if (es.length) plan(p, t0, t1, es, { early: o.early ?? 0, say: o.say });
  return i;
}
function cornerPt(ax, sz, qx, qz) { return { x: ax + qx * 8, z: sz + qz * 8 }; }

// newsboys hawking the Courier's Centennial edition on three busy corners
function newsboys() {
  const boys = [
    ['Mickey', 'Shea', 134, 0, [[1, 1], [-1, 1], [-1, -1]], 'Main & Market', ['13:30', '14:40']],
    ['Louie', 'Barros', 214, -140, [[-1, -1], [1, -1], [-1, 1]], 'Lantern & Canal', ['11:30', '12:40']],
    ['Artie', 'Pollard', 54, -70, [[1, 1], [1, -1]], 'Harbor & Grand', ['12:30', '13:40']],
  ];
  const cries = ['Extra! Courier Centennial edition! A hundred years for a nickel!', 'Read all about it! Juniper Bay, 1853 to 1953!', 'Fireworks tonight — program inside! Get your Courier!', 'Sal Castellano\'s home from Korea! Read all about it!', 'Paper, mister? Centennial edition, all the pictures!'];
  for (const [f, l, ax, sz, qs, name, [la, lb]] of boys) {
    let c = null;
    for (const [qx, qz] of qs) { const q = cornerPt(ax, sz, qx, qz); const cc = nearClear(q.x, q.z, 0.7, 0, 1440, 2); if (cc) { c = cc; break; } }
    if (!c) continue;
    claim(c.x, c.z, 1.0);
    const p = visitor({ first: f, last: l, sex: 'M', age: L.rng.int(11, 14), from: 'garage', visitor: false, look: { hat: 'hat_flatcap', hatTint: '#4a4038' },
      bio: `${f} ${l} sells the Courier on the corner of ${name}. Two cents a paper to him, and the tips are his own.`, lines: ['Two hundred papers by noon, or my name ain\'t Mickey. Well, it ain\'t, but you get it.', 'Paper? Nickel. Centennial edition. Worth a dime, honest.'] });
    const bundle = { x: c.x + (ax > c.x ? -0.9 : 0.9), z: c.z };
    timed('newspaper_bundles', bundle.x, bundle.z, 0, '6:25', la);
    timed('newspaper_bundles', bundle.x, bundle.z, 0, lb, '18:05');
    const face = [ax, sz];
    const s1 = spot(c.x, c.z, { faceTo: face, act: 'wave' });
    const s2 = spot(c.x, c.z, { yaw: yawTo(c.x, c.z, ax, c.z), pace: 2.2, act: 'wave', link: s1.node });
    const es = [];
    for (let t = T('6:30'); t < T('18:00'); t += 12) {
      if (t >= T(la) && t < T(lb)) continue;
      const k = (t / 12) % 3 | 0;
      es.push({ t, spot: k === 1 ? s2 : s1, act: k === 2 ? 'announce' : 'wave', held: 'newspaper', label: `Hawking the Courier on the corner of ${name}` });
      if (t + 12 > T(la) && t < T(la)) es.push({ t: T(la), spot: origin('garage'), act: 'stand', label: 'Gone for more papers' });
    }
    plan(p, '6:30', '18:00', es, { say: cries });
    sound(c.x, c.z, '6:30', '12:30', 'chatter', 20, 0.3);
    scene(`${f} ${l} hawks the Courier at ${name}`, c.x, c.z, '6:30', '18:00', 1);
  }
}

// a patrolman in white gloves directing traffic at Main & Market at the busy hours
function trafficCop() {
  const x = 134, z = 0;
  const p = visitor({ first: 'Walt', last: 'Keough', sex: 'M', age: 38, outfit: 'police', from: 'police', visitor: false, look: { arm: 4 },
    bio: 'Patrolman Walt Keough, on traffic duty at Main & Market for Harbor Days. White gloves, a whistle, and the patience of a saint with a headache.',
    lines: ['Keep it moving, folks, keep it moving.', 'Twelve years on traffic. The Centennial is the worst and the best.'] });
  G.keough = p;
  const s = spot(x, z, { yaw: Math.PI / 2, act: 'hail_taxi' });
  const s2 = spot(x, z, { yaw: 0, act: 'wave', link: s.node });
  const whistle = ['(Tweeeet!) Hold it right there, Mac!', 'Come on, come on, let\'s go!', 'Ladies, cross now. Now, please!', 'Easy with that truck! Easy!', '(Tweet! Tweet!) You — yes, you — wait.'];
  for (const [a, b] of [['7:45', '9:15'], ['11:30', '13:15'], ['16:30', '18:15']]) {
    const es = [];
    for (let t = T(a), k = 0; t < T(b); t += 2.5, k++) es.push({ t, spot: k % 2 ? s2 : s, act: k % 3 === 2 ? 'announce' : k % 2 ? 'wave' : 'hail_taxi', label: 'Directing traffic at Main & Market' });
    plan(p, a, b, es, { say: whistle });
    sound(x, z, a, b, 'whistle', 45, 0.35);
    scene('Patrolman Keough directs traffic at Main & Market', x, z, a, b, 1);
  }
}

// Officer Frank Rourke walks the Market Street beat
function rourkeBeat() {
  const frank = person('Frank', 'Rourke');
  if (!frank) return;
  const stop = (name, side, act, dwell, lines) => { const P = place(name); if (!P) return null; const q = P.at(side, 1.7); const s = spot(q.x, q.z, { faceTo: [P.door.x, P.door.z], act }); s.dwell = dwell; s.lines = lines; s.label = act === 'talk' ? `Passing the time of day at ${P.name}` : 'Walking the Market Street beat'; return s; };
  const corner = (x, z, lines) => { const s = spot(x, z, { faceTo: [x + (x < 100 ? 8 : -8), z], act: 'look' }); s.dwell = 1; s.lines = lines; s.label = 'Walking the Market Street beat'; return s; };
  const stops = [
    stop('Harbor Light Diner', 2, 'talk', 4, ['Coffee, Eleni, and whatever Nick\'s hiding under the counter.', 'Morning, Nick. Quiet night?']),
    corner(62, 8, ['Twenty-two years on this beat. Never seen a turnout like today.']),
    stop('Halloran & Sons Bakery', 1.5, 'talk', 3, ['Pat, you smell that? That\'s a hundred years of bread.']),
    stop("Russo's Meats", 1.2, 'look', 1, null),
    stop("Lee's Hand Laundry", 1.2, 'talk', 3, ['Morning, Mr. Lee. Any word from David in Yokosuka?']),
    stop('Castellano Fish Market', 1.5, 'talk', 4, ['Vinnie! Tell Rosa I\'ll be by tonight to shake Sal Jr.\'s hand.']),
    corner(142, 8, ['Keep to the sidewalk, folks. The fair crowd\'s thick today.']),
    stop("Harlow's", -8, 'look', 2, null),
    stop("Mayhew's Pharmacy & Soda Fountain", 3, 'look', 1, null),
    stop("Freeman's Barber Shop", 1.2, 'talk', 4, ['Marcus. Save me the chair at five, I\'ve got a speech to stand through.']),
    stop("Woolcott's 5 & 10", 1.5, 'talk', 3, ['Harold, if one more boy tries to walk out with a goldfish in his pocket…']),
    stop('Gould Millinery', 1.5, 'look', 1, null),
    stop("Draper's Toys", -3, 'talk', 3, ['Mr. Draper, the Rourke boy says you timed Skippy Mercer at thirty-one seconds.']),
    stop('Weiss Jewelers', 1.2, 'talk', 2, ['Right on time, Mr. Weiss. The clock and you both.']),
    stop('Bishop Music Co.', 1.2, 'look', 1, null),
    stop("Woolcott's 5 & 10", -2, 'look', 1, null),
    corner(126, -8, ['Morning. Keep to the sidewalk — the Centennial crowd\'ll be thick tonight.']),
    stop('Lowell Photography Studio', -2, 'talk', 2, ['Fred, take one of me for the capsule. Show 2053 a real policeman.']),
    stop('Bay Radio & Television', 1.2, 'look', 2, null),
    stop('Pike & Daughter Books', 1.2, 'look', 1, null),
    stop('Whitcomb Ship Chandlery', 1.5, 'talk', 3, ['Wendell. How are those grandsons of yours?']),
    stop('The Anchor & Chain', 1.5, 'look', 2, ['Swede, keep \'em sober till the fireworks, would you?']),
    corner(142, -148, null),
    stop('Station Luncheonette', 1.5, 'talk', 3, ['Myrtle, two sugars. And don\'t tell my wife.']),
    stop('Lantern Tobacco & News', 1.2, 'talk', 4, ['Put me down for the Dodgers, Emmett. A policeman has to have hope.']),
    stop('Bay Travel & Telegraph', 1.2, 'look', 1, null),
    stop('Garrity Hardware', 1.2, 'talk', 3, ['Tom. Your brother\'s marrying off the Novak girl at two, I hear.']),
    stop('The Signal Lamp Tavern', 1.2, 'talk', 3, ['Mike, no fights before the fireworks. After, we\'ll talk.']),
    stop('Tremblay Furniture', 1.2, 'look', 1, null),
    corner(142, -132, null),
    corner(62, -62, null),
  ].filter(Boolean);
  let i = 0;
  if (avail(frank, '7:25', '12:25')) i = tour(frank, '7:25', '12:25', stops, { label: 'Walking the Market Street beat' });
  if (avail(frank, '12:55', '14:28')) i = tour(frank, '12:55', '14:28', stops, { label: 'Walking the Market Street beat', start: i });
  if (avail(frank, '15:18', '17:15')) tour(frank, '15:18', '17:15', stops, { label: 'Walking the Market Street beat', start: i });
  scene('Officer Frank Rourke walks the Market Street beat', 134, -60, '7:25', '17:15', 1);
}

// the meter man chalks tyres along Canal, Mill and Main (runs after the parked cars exist)
function meterMan() {
  const cars = (G.parked || []).filter((c) => (Math.abs(c.z + 140) < 6 || Math.abs(c.z + 210) < 6) && c.x > 60 && c.x < 300);
  if (cars.length < 6) return;
  // Canal St west→east, then Mill St east→west
  const key = (c) => Math.abs(c.z + 140) < 6 ? c.x : 1000 - c.x;
  cars.sort((a, b) => key(a) - key(b));
  const p = visitor({ first: 'Horace', last: 'Nye', sex: 'M', age: 61, outfit: 'mail', from: 'police', visitor: false, look: { hat: 'hat_cap', hatTint: '#1f2a44' },
    bio: 'Horace Nye, meter man for the City of Juniper Bay. Chalks every tyre from Canal to Mill and has never once been thanked.',
    lines: ['One hour, it says on the meter. One hour. Not one hour and a Centennial.', 'I chalk \'em, I come back, I write \'em. Nothing personal.'] });
  let n = 0;
  for (const [a, b] of [['9:10', '11:50'], ['13:30', '16:50']]) {
    const es = []; let t = T(a), prev = L.whereAt(p, t);
    for (const c of cars) {
      if (t > T(b) - 3) break;
      const q = along(c, -1.6, 1.45);
      if (Math.abs(gy(q.x, q.z) - 0.25) > 0.3 || clutterNear(q.x, q.z, 0.5).length) continue;
      const s = spot(q.x, q.z, { faceTo: [c.x, c.z], act: 'kneel' });
      const arrive = t + pathLen(prev, s.node) / 70;
      if (arrive < c.t0 + 8 || arrive > c.t1 - 3) continue;
      es.push({ t, spot: s, act: 'kneel', held: 'chalk', label: 'Chalking tyres for the parking meters' });
      t = arrive + 1; prev = s.node; n++;
    }
    if (es.length) plan(p, a, b, es, { early: 8 });
    scene('Horace Nye, the meter man, chalks tyres', 180, -140, a, b, 1);
  }
}

// a crossing guard at Lantern & Market, where the children cross to the fair
function crossingGuard() {
  let pell = null;
  const x = 207.3, z = 6.9;
  const s = spot(x, z, { yaw: Math.PI, act: 'hail_taxi' });
  const s2 = spot(x, z, { yaw: Math.PI / 2, act: 'wave', link: s.node });
  const wins = [['9:40', '11:40'], ['13:20', '14:40'], ['16:40', '18:10'], ['19:45', '20:15']];
  for (const [a, b] of wins) {
    let [p] = cast(1, a, b, { age: [50, 72], sex: 'F', fill: false }, x, z);
    if (!p) p = pell || (pell = visitor({ first: 'Agatha', last: 'Pell', sex: 'F', age: 63, from: 'garage', visitor: false, bio: 'Mrs. Agatha Pell, retired schoolteacher, crossing guard for Harbor Days by appointment of the Mayor, which she mentions.', lines: ['Thirty-one years teaching third grade. Traffic is nothing.', 'Walk, don\'t run. I will not say it again. I will say it again.'] }));
    if (!L.free(p, T(a) - 10, T(b))) continue;
    const es = [];
    for (let t = T(a), k = 0; t < T(b); t += 3, k++) es.push({ t, spot: k % 2 ? s2 : s, act: k % 2 ? 'wave' : 'hail_taxi', label: 'Crossing guard at Lantern & Market for Harbor Days', costume: { hat: 'hat_cap', hatTint: '#e8e4d8', top2: '#e8e4d8' } });
    plan(p, a, b, es, { say: ['Wait for me, children. Wait. Now — walk, don\'t run!', 'Hold hands across, you two. Both hands!', 'Cars stop for me, dear. Everybody stops for me.'] });
    L.follow(p, 'town_stop_paddle', { fwd: 0.32, side: -0.28, y: 0.55, when: 'spot', t0: a, t1: b });
    scene('The crossing guard at Lantern & Market', x, z, a, b, 1);
  }
}

// the organ grinder and Beppo the monkey, working the town all day
function organGrinder() {
  const p = G.grinder = visitor({ first: 'Ottavio', last: 'Ruggiero', sex: 'M', age: 67, from: 'station', visitor: false, look: { hat: 'hat_flatcap', hatTint: '#5a2a24', face: 2 },
    bio: 'Ottavio Ruggiero of Federal Hill, Providence, and Beppo, a capuchin of uncertain age and firm opinions. They come up for every Harbor Days and take the 7:30 home.',
    lines: ['Beppo, say grazie to the lady. Grazie! Grazie!', 'Forty years I play this organ. Beppo, only twelve. He is still learning.'] });
  const at = (name, side, out, dir) => () => { const P = place(name); if (!P) return null; const q = P.at(side, out); return { ...q, yaw: dir > 0 ? P.yawRight : P.yawLeft }; };
  const stops = [
    ['9:30', '10:30', at("Harlow's", -10, 2.0, -1), 'outside Harlow\'s'],
    ['10:50', '11:50', at('Beaumont Shoes', 1.5, 2.0, 1), 'on Canal Street'],
    ['12:15', '13:15', at('Harbor Light Diner', -6, 2.0, 1), 'by the Harbor Light Diner'],
    ['13:45', '15:00', () => ({ x: -12, z: 232.4, yaw: Math.PI / 2 }), 'on the boardwalk by Playland'],
    ['15:35', '16:45', at('Bayside Savings & Loan', 1.5, 2.0, 1), 'on Market Street'],
    ['17:05', '18:20', at('Union Station', -9, 1.8, -1), 'outside Union Station'],
    ['18:40', '19:25', at('The Rialto', -7, 2.0, -1), 'working the line outside the Rialto'],
  ];
  const es = [];
  let n = 0;
  for (const [a, b, f, where] of stops) {
    const q0 = f(); if (!q0) continue;
    const q = nearClear(q0.x, q0.z, 0.9, a, b, 2.5); if (!q) continue;
    const s = spot(q.x, q.z, { yaw: q0.yaw, act: 'iron' });
    const organ = along({ x: q.x, z: q.z, yaw: q0.yaw }, 0.66), face = along({ x: q.x, z: q.z, yaw: q0.yaw }, 2.3);
    claim(face.x, face.z, 1.6, a, b); claim(q.x, q.z, 0.8, a, b);
    es.push({ t: a, spot: s, act: 'iron', arms: 'push', label: `Grinding the barrel organ ${where}` });
    sound(q.x, q.z, a, b, 'piano', 38, 0.5);
    label(organ.x, 1.3, organ.z, a, b, 'Beppo the monkey, collecting pennies in a tin cup', 0.8);
    // kids crowd round
    const kids = cast(L.rng.int(3, 5), a, b, { age: [4, 12], town: true, fill: n % 2 === 0 }, q.x, q.z);
    crowd(kids, T(a) + 5, T(b) - 5, face.x, face.z, { spread: 1.1, faceTo: [organ.x, organ.z], acts: ['cheer', 'laugh', 'clap', 'look', 'wave'], label: 'Watching the organ grinder\'s monkey', stagger: 4 });
    scene(`The organ grinder and his monkey ${where}`, q.x, q.z, a, b, kids.length + 1);
    n++;
  }
  if (!es.length) return;
  plan(p, es[0].t, '19:30', es, { say: ['♪ Funiculì, funiculà… ♪', '♪ O sole mio… ♪', 'Pennies for Beppo! Beppo says grazie!', 'Beppo! Give back the lady\'s glove!'], song: false });
  L.follow(p, 'barrel_organ', { fwd: 0.62, when: 'always', t0: es[0].t, t1: '19:30' });
  L.follow(p, 'organ_monkey', { fwd: 0.66, y: 1.15, yawOff: 0, when: 'spot', t0: es[0].t, t1: '19:30' });
  L.follow(p, 'organ_monkey', { fwd: -0.05, side: 0.2, y: 1.42, when: 'walk', t0: es[0].t, t1: '19:30' });
}

// the peanut man at the west edge of the square
function peanutMan() {
  const q = nearClear(141.6, -30, 1.0, 0, 1440, 4);
  if (!q) return;
  claim(q.x, q.z, 1.5);
  timed('town_peanut_wagon', q.x, q.z, 0, '9:40', '20:40');
  const p = visitor({ first: 'Harry', last: 'Lambros', sex: 'M', age: 58, from: 'garage', visitor: false, look: { hat: 'hat_cap', hatTint: '#f0ece0', torso: 6, top: '#f0ece0' },
    bio: 'Harry Lambros, the peanut man. His roaster whistles like the 9:52 and his peanuts are hot enough to warm your hands on the way to the fair.',
    lines: ['Hot roasted peanuts! Ten cents the bag!', 'Gus Kouris taught me fudge in 1920. I stuck to peanuts.'] });
  const vs = spot(q.x, q.z - 1.0, { yaw: 0, act: 'counter' });
  put(p, '9:45', '20:35', vs, { act: 'counter', label: 'Selling hot roasted peanuts by the square', say: ['Peanuts! Hot roasted peanuts! Ten cents!', 'Fresh out the roaster! Warm your hands, folks!', 'Peanuts for the fireworks! Peanuts for the band!'] });
  const cs = spot(q.x, q.z + 1.2, { spread: 0.6, faceTo: [q.x, q.z], act: 'wait' });
  let n = 1;
  for (let t = T('10:00'); t < T('20:15'); t += 17 + (n % 4) * 3) {
    const [c] = cast(1, t, t + 5, { age: [6, 75] }, q.x, q.z);
    if (c && put(c, t, t + 5, cs, { act: 'wait', label: 'Buying a bag of peanuts' })) n++;
  }
  label(q.x, 1.6, q.z, '9:40', '20:40', 'The peanut wagon — hot roasted, ten cents', 1.4);
  scene('Harry Lambros sells hot peanuts by the square', q.x, q.z, '9:45', '20:35', n);
}

// the balloon man circling the edges of the square
function balloonMan() {
  const p = visitor({ first: 'Morris', last: 'Tepper', sex: 'M', age: 70, from: 'station', visitor: false, look: { hat: 'hat_bowler', hatTint: '#3a3a40' },
    bio: 'Morris Tepper, balloon man, of Chelsea. Madame Gould\'s cousin, though neither of them mentions it.', lines: ['Balloons! A dime! Red, yellow, blue — pick your color!', 'Don\'t let go, sweetheart. They go straight to heaven, and heaven doesn\'t give refunds.'] });
  const pts = [[150, -7.5, 'on Market Street by the square'], [141.5, -54, 'at Main & Grand'], [205, -62.4, 'on Grand Avenue by the square'], [240, -7.5, 'by the square at Lantern Avenue'], [174, 7.5, "outside Harlow's"]];
  const es = [];
  let t = T('10:15');
  for (let k = 0; t < T('18:30'); k++) {
    const [x, z, where] = pts[k % pts.length];
    const q = nearClear(x, z, 0.7, t, t + 45, 3); if (!q) { t += 45; continue; }
    claim(q.x, q.z, 1.0, t, t + 45);
    const s = spot(q.x, q.z, { yaw: z > 0 ? Math.PI : z < -60 ? 0 : x < 145 ? Math.PI / 2 : Math.PI, act: 'wave' });
    es.push({ t, spot: s, act: k % 2 ? 'wave' : 'stand', label: `Selling balloons ${where}` });
    scene(`The balloon man ${where}`, q.x, q.z, t, t + 42, 1);
    t += 50;
  }
  if (!es.length) return;
  plan(p, '10:15', '18:30', es, { say: ['Balloons! A dime!', 'Red, yellow, blue — who wants a balloon?'] });
  L.follow(p, 'balloon_bunch', { fwd: 0.25, side: -0.35, y: 0.95, when: 'always', t0: '10:15', t1: '18:30' });
}

// the pretzel man by the post office
function pretzelMan() {
  const q = nearClear(222.8, -77.2, 0.9, 0, 1440, 3);
  if (!q) return;
  claim(q.x, q.z, 1.2);
  timed('town_pretzel_stand', q.x, q.z, 0, '9:00', '18:30');
  const p = visitor({ first: 'Karl', last: 'Emmerich', sex: 'M', age: 55, from: 'station', visitor: false, look: { hat: 'hat_cap', hatTint: '#e8e4d8' },
    bio: 'Karl Emmerich bakes soft pretzels in Lynn and sells them from a pole wherever there\'s a crowd. Harbor Days is his Christmas.', lines: ['Pretzels! Hot soft pretzels, a nickel!', 'Mustard? No mustard? You are a hard man.'] });
  const s = spot(q.x + 0.9, q.z, { yaw: -Math.PI / 2, act: 'counter' });
  put(p, '9:05', '18:25', s, { act: 'counter', label: 'Selling soft pretzels off a pole', say: ['Pretzels! Hot soft pretzels!', 'A nickel! Salt on top, mustard on the side!'] });
  const cs = spot(q.x - 1.3, q.z, { spread: 0.6, faceTo: [q.x, q.z], act: 'wait' });
  let n = 1;
  for (let t = T('9:20'); t < T('18:00'); t += 21 + (n % 3) * 4) { const [c] = cast(1, t, t + 5, { age: [8, 70] }, q.x, q.z); if (c && put(c, t, t + 5, cs, { act: 'wait', label: 'Buying a soft pretzel' })) n++; }
  scene('Karl Emmerich sells pretzels by the Post Office', q.x, q.z, '9:05', '18:25', n);
}

// a flower seller outside St. Luke's: visitors buy a bunch on the way in
function flowerCart() {
  const H = place("St. Luke's Hospital"); if (!H) return;
  const q = frontSpot(H, [4.5, 6, -4.5, -6, 8], 1.4, 1.2);
  if (!q) return;
  claim(q.x, q.z, 1.6);
  timed('town_flower_cart', q.x, q.z, H.yawOut, '9:20', '18:40');
  const p = visitor({ first: 'Conceição', last: 'Duarte', sex: 'F', age: 57, from: 'station', visitor: false, look: { hat: 'hat_headscarf', hatTint: '#2a4a6a' },
    bio: 'Mrs. Conceição Duarte of New Bedford sells flowers outside St. Luke\'s on Saturdays. She remembers every baby she ever sold a bouquet for.', lines: ['Flowers for the new mother? Mums, asters, a little fern.', 'The Kaminski baby? Not yet. I know. I always know.'] });
  const vs = spot(H.at(q.side, 0.35).x, H.at(q.side, 0.35).z, { yaw: H.yawOut, act: 'counter' });
  put(p, '9:25', '18:35', vs, { act: 'counter', label: 'Selling flowers outside St. Luke\'s', say: ['Flowers! Flowers for the patients!', 'A bunch of mums, forty cents. Brightens any room.'] });
  const cs = spot(H.at(q.side, 2.6).x, H.at(q.side, 2.6).z, { spread: 0.6, faceTo: [q.x, q.z], act: 'wait' });
  const inside = hidden(H.at(0, -1.2).x, H.at(0, -1.2).z);
  let n = 1;
  for (let t = T('9:45'); t < T('18:00'); t += 24 + (n % 3) * 5) {
    const c = guest(t, t + 40, { age: [25, 70] }, q.x, q.z);
    plan(c, t, t + 40, [{ t, spot: cs, act: 'wait', label: 'Buying flowers for a patient at St. Luke\'s' }, { t: t + 4, spot: inside, act: 'stand', held: 'bouquet', label: 'Visiting a patient at St. Luke\'s' }]);
    n++;
  }
  scene('Flowers for sale outside St. Luke\'s', q.x, q.z, '9:25', '18:35', n);
}

// the Good Humor man's route: kids come running at the bell
function goodHumor() {
  if (!has('truck_ice_cream')) return;
  const p = visitor({ first: 'Benny', last: 'Szabo', sex: 'M', age: 29, outfit: 'milkman', from: 'garage', visitor: false,
    bio: 'Benny Szabo drives the Good Humor truck out of Lynn. Rings the bells, knows every flavor by heart, and has never once eaten one.', lines: ['Toasted almond, chocolate éclair, strawberry shortcake. Ten cents.', 'I hear the bells in my sleep. My wife hears them too.'] });
  const stops = [
    ['11:15', '11:50', () => truckFor(place("Harlow's"), 'truck_ice_cream', '11:13', '11:52', { sides: [18, 22, 14, -18] }), "outside Harlow's"],
    ['12:25', '13:00', () => truckFor(place('The Clam Shack'), 'truck_ice_cream', '12:23', '13:02', { sides: [-8, -12, 8] }), 'on Harbor Street'],
    ['13:30', '14:10', () => { const c = { x: 59, z: 222.5, yaw: Math.PI }; if (!curbFree(c.x, c.z, T('13:28'), T('14:12'), 6.2)) return null; park('truck_ice_cream', c.x, c.z, c.yaw, '13:28', '14:12', { len: 6.2 }); return { ...c, len: 6.2 }; }, 'by the beach boardwalk'],
    ['15:00', '15:40', () => truckFor(place('Harbor Lanes'), 'truck_ice_cream', '14:58', '15:42'), 'on Church Street'],
    ['16:10', '16:50', () => truckFor(place('United States Post Office'), 'truck_ice_cream', '16:08', '16:52'), 'on Grand Avenue by the square'],
    ['17:10', '17:50', () => truckFor(place('The Whitcomb Hotel'), 'truck_ice_cream', '17:08', '17:52', { sides: [-12, -18, 12] }), 'on Mill Street'],
  ];
  const es = [];
  for (const [a, b, mk, where] of stops) {
    const tr = mk(); if (!tr) continue;
    const m = along(tr, -tr.len / 2 + 0.9, 1.85);
    // he stands on the sidewalk side of the truck, facing the kids
    const ms = spot(m.x, m.z, { yaw: Math.atan2(-Math.cos(tr.yaw), Math.sin(tr.yaw)), act: 'counter' });
    es.push({ t: a, spot: ms, act: 'counter', label: `Selling Good Humors ${where}` });
    sound(tr.x, tr.z, a, b, 'bell', 50, 0.55);
    label(tr.x, 1.8, tr.z, a, b, 'The Good Humor truck — ten cents a bar', 3);
    const qp = along(tr, -tr.len / 2 + 0.9, 3.2), ep = along(tr, tr.len / 2 + 1.5, 2.9);
    const qs = spot(qp.x, qp.z, { spread: 0.8, faceTo: [m.x, m.z], act: 'wait' });
    const eats = spot(ep.x, ep.z, { spread: 1.2, act: 'drink_stand' });
    const kids = cast(L.rng.int(4, 6), a, b, { age: [5, 13], fill: true, town: true }, tr.x, tr.z);
    kids.forEach((k, i) => { const t = T(a) + 2 + i * 4; plan(k, t, t + 12, [{ t, spot: qs, act: 'wait', label: 'In line for the Good Humor man' }, { t: t + 4, spot: eats, act: 'drink_stand', held: 'ice_cream_cone', label: 'Eating a Good Humor bar' }]); });
    scene(`The Good Humor truck ${where}`, tr.x, tr.z, a, b, kids.length + 1);
  }
  if (es.length) plan(p, es[0].t, '17:52', es, { say: ['Good Humor! Ice cream, ten cents!', 'Toasted almond! Chocolate éclair! Who\'s first?'] });
}

// a barbershop quartet on the walk outside Freeman's
function quartet() {
  const P = place("Freeman's Barber Shop"); if (!P) return;
  const costume = { hat: 'hat_boater', hatTint: '#e8d8a0', hatTint2: '#b3302a', torso: 8, top: '#f0ece0', top2: '#b3302a', accent: '#1c1c20', bottom: '#e8e0d0' };
  const songs = [
    ['♪ Sweet Adeline, my Adeline… ♪', '♪ At night, dear heart, for you I pine… ♪', '♪ In all my dreams, your fair face beams… ♪'],
    ['♪ Down by the old mill stream, where I first met you… ♪', '♪ With your eyes of blue, dressed in gingham too… ♪'],
    ['♪ Shine on, shine on harvest moon, up in the sky… ♪', '♪ I ain\'t had no lovin\' since January, February, June or July… ♪'],
    ['♪ Wait till the sun shines, Nellie… ♪', '♪ …and the clouds go drifting by… ♪'],
  ];
  const sides = [-6.1, -4.9, -3.7, -2.5];
  const cx = P.at(-4.3, 0.9), audience = P.at(-4.3, 2.9);
  let k = 0;
  for (const [a, b] of [['11:40', '12:20'], ['15:40', '16:20'], ['18:50', '19:30']]) {
    const men = cast(4, a, b, { age: [30, 68], sex: 'M', prefer: (p) => p.lines && p.lines.length > 0 }, cx.x, cx.z);
    if (men.length < 4) continue;
    men.forEach((p, i) => {
      const q = P.at(sides[i], 0.9 + (i === 0 || i === 3 ? 0 : 0.25));
      const s = spot(q.x, q.z, { faceTo: [audience.x, audience.z], act: 'sing_free' });
      put(p, a, b, s, { act: 'sing_free', costume, label: 'Singing with the Harbor Chords, Elks Lodge No. 812', say: i === 1 ? songs[k % songs.length] : null, song: true });
    });
    claim(cx.x, cx.z, 2.4, a, b);
    (G.quartet = G.quartet || []).push({ x: cx.x, z: cx.z, t0: T(a), t1: T(b) });
    const fans = cast(L.rng.int(4, 7), a, b, { age: [8, 80] }, cx.x, cx.z);
    crowd(fans, T(a) + 3, T(b) - 2, audience.x, audience.z, { spread: 1.5, faceTo: [cx.x, cx.z], acts: ['listen', 'clap', 'listen', 'laugh'], label: 'Listening to the barbershop quartet', stagger: 5 });
    sound(cx.x, cx.z, a, b, 'crowd', 25, 0.25);
    label(cx.x, 2.3, cx.z, a, b, 'The Harbor Chords, a barbershop quartet', 2.5);
    scene('The Harbor Chords sing outside Freeman\'s Barber Shop', cx.x, cx.z, a, b, 4 + fans.length);
    k++;
  }
}

// the Salvation Army: a street-corner service with drum, cornet and trombone
function salvationArmy() {
  const man = { torso: 7, arm: 0, top: '#1f2a44', top2: '#a8201e', bottom: '#1f2a44', hat: 'hat_cap', hatTint: '#1f2a44', hatTint2: '#a8201e' };
  const woman = { torso: 3, arm: 0, top: '#1f2a44', top2: '#a8201e', bottom: '#1f2a44', skirt: 2, hat: 'hat_cloche', hatTint: '#1f2a44', hatTint2: '#a8201e' };
  const band = [
    ['Ezra', 'Blount', 'M', 52, 'speech', 'book', 'Captain of the Juniper Bay Corps of the Salvation Army. Preaches like a foghorn, sings like a lamb.', ['Friends! A hundred years this town has stood — by the grace of God!', 'Come as you are! The Lord doesn\'t check your hat size!']],
    ['Mabel', 'Blount', 'F', 49, 'sing', 'hymnal', 'Mrs. Captain Blount. Has sung on every street corner from Lynn to Portland.', ['♪ What a friend we have in Jesus… ♪', '♪ Onward, Christian soldiers, marching as to war… ♪']],
    ['Arthur', 'Pym', 'M', 33, 'trumpet', null, 'Bandsman, cornet. A foreman at the cannery on weekdays.', null],
    ['Leonard', 'Shaw', 'M', 58, 'trombone', null, 'Bandsman, trombone, forty years. Has played "Onward, Christian Soldiers" some nine thousand times.', null],
    ['Ruthie', 'Cobb', 'F', 19, 'wave', 'newspaper', 'Sells the War Cry. Has never once been told no politely.', ['The War Cry, ten cents! God bless you, sir.', 'Just a dime for the War Cry, ma\'am. It\'s for the orphans.']],
    ['Silas', 'Pym', 'M', 15, 'drum', null, 'Beats the big drum. Arthur\'s boy.', null],
  ].map(([f, l, sex, age, act, held, bio, say]) => ({ p: visitor({ first: f, last: l, sex, age, from: 'station', visitor: false, look: sex === 'M' ? man : woman, bio, lines: ['God bless you, friend.', 'We\'re the Juniper Bay Corps. Hall\'s on Canal Street, second floor.'] }), act, held, say }));
  const sites = [
    ['13:30', '14:25', () => { const P = place('Lowell Photography Studio'); return P ? { P, side: 6.5 } : null; }, 'at Main & Market'],
    ['15:30', '16:20', () => { const P = place('The Signal Lamp Tavern'); return P ? { P, side: -3.5 } : null; }, 'outside the Signal Lamp Tavern'],
    ['19:05', '19:50', () => { const P = place('Union Station'); return P ? { P, side: -14 } : null; }, 'outside Union Station'],
  ];
  for (const [a, b, f, where] of sites) {
    const site = f(); if (!site) continue;
    const { P, side } = site;
    const c = P.at(side, 1.2), front = P.at(side, 3.0);
    const dq = P.at(side, 2.0);
    claim(c.x, c.z, 2.5, a, b);
    timed('town_sa_drum', dq.x, dq.z, P.yawIn, a, b);
    band.forEach(({ p, act, held, say }, i) => {
      const off = [0, -1.1, 1.1, 2.2, 0, -2.2][i], out = [0.9, 1.0, 1.0, 0.9, 2.4, 1.1][i];
      const q = act === 'drum' ? P.at(side, 1.4) : P.at(side + off, out);
      const s = act === 'wave' ? spot(q.x, q.z, { yaw: P.yawRight, pace: 3, act: 'wave' }) : spot(q.x, q.z, { faceTo: [front.x, front.z], act });
      put(p, a, b, s, { act, held, label: `Street-corner service with the Salvation Army ${where}`, say, song: act === 'sing' });
    });
    sound(c.x, c.z, a, b, 'crowd', 30, 0.3);
    label(dq.x, 1.0, dq.z, a, b, 'The Salvation Army, Juniper Bay Corps', 1.2);
    const fans = cast(L.rng.int(3, 5), a, b, { age: [10, 80] }, c.x, c.z);
    crowd(fans, T(a) + 4, T(b) - 3, front.x, front.z, { spread: 1.6, faceTo: [c.x, c.z], acts: ['listen', 'listen', 'look'], label: 'Listening to the Salvation Army band', stagger: 6 });
    scene(`The Salvation Army ${where}`, c.x, c.z, a, b, band.length + fans.length);
  }
}

// Boy Scouts of Troop 7 selling Centennial programs at the edges of the square
function scouts() {
  const costume = { torso: 0, arm: 1, top: '#8a8a52', top2: '#8a8a52', accent: '#b3302a', bottom: '#7a7a4a', thigh: 2, shin: 2, hat: 'hat_cap', hatTint: '#7a7a4a' };
  const tables = [[141.7, -57.5, -Math.PI / 2, 'at Main & Grand'], [226, -7.7, 0, 'on Market Street by the square']];
  for (const [x, z, yaw, where] of tables) {
    const q = nearClear(x, z, 0.9, 0, 1440, 3); if (!q) continue;
    claim(q.x, q.z, 1.4, '9:20', '17:30');
    timed('town_program_table', q.x, q.z, yaw, '9:20', '17:30');
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (const [a, b] of [['9:30', '12:30'], ['13:30', '17:20']]) {
      const boys = cast(2, a, b, { age: [11, 15], sex: 'M', fill: true }, q.x, q.z);
      boys.forEach((p, i) => {
        const s = spot(q.x + fx * 1.3 + fz * (i ? 1.2 : -1.2), q.z + fz * 1.3 - fx * (i ? 1.2 : -1.2), { yaw, act: 'wave' });
        put(p, a, b, s, { act: i ? 'wave' : 'announce', held: 'newspaper', costume, label: `Selling Centennial programs for Troop 7 ${where}`, say: ['Programs! Official Centennial program, twenty-five cents!', 'Every event, every time, and a picture of the Mayor!'] });
      });
      const [lead] = cast(1, a, b, { age: [28, 55], sex: 'M', fill: false }, q.x, q.z);
      if (lead) put(lead, a, b, spot(q.x - fx * 0.9, q.z - fz * 0.9, { yaw, act: 'counter' }), { act: 'counter', costume: { ...costume, thigh: 0, shin: 0, bottom: '#6a6a42' }, label: 'Scoutmaster of Troop 7, minding the program table' });
      scene(`Boy Scouts sell Centennial programs ${where}`, q.x, q.z, a, b, boys.length + (lead ? 1 : 0));
    }
  }
}

// Frederick Lowell takes Centennial portraits on the sidewalk outside his studio
function lowellPortraits() {
  const P = place('Lowell Photography Studio'), fred = person('Frederick', 'Lowell');
  if (!P) return;
  let side = null;
  for (const s of [-4.5, -5.5, -3.5, 3.5, 5]) { const c = P.at(s, 3.3), b = P.at(s, 0.6); if (clear(c.x, c.z, 0.6) && clear(b.x, b.z, 1.0)) { side = s; break; } }
  if (side === null) return;
  const bq = P.at(side, 0.5), cq = P.at(side, 3.25), fq = P.at(side, 3.85), pose = P.at(side, 1.6);
  claim(bq.x, bq.z, 1.3); claim(cq.x, cq.z, 0.6); claim(pose.x, pose.z, 1.0);
  timed('town_photo_backdrop', bq.x, bq.z, P.yawOut, '9:40', '16:40');
  timed('town_view_camera', cq.x, cq.z, P.yawIn, '9:40', '16:40');
  label(bq.x, 1.6, bq.z, '9:40', '16:40', 'Centennial portraits by Lowell — fifty cents, ready Tuesday', 1.5);
  const who = fred && avail(fred, '9:30', '16:40') ? fred : visitor({ first: 'Walter', last: 'Lowell', sex: 'M', age: 24, from: 'garage', visitor: false });
  const fs = spot(fq.x, fq.z, { yaw: P.yawIn, act: 'photograph' });
  const cries = ['Everybody look at the birdie! Mrs. — no, the birdie, not me.', 'Hold it… hold it… there. Fifty cents, ready Tuesday.', 'Tallest in the back. Little fellow on the end, chin up.'];
  put(who, '9:45', '12:15', fs, { act: 'photograph', held: 'camera', label: 'Taking Centennial portraits outside his studio', say: cries });
  put(who, '13:15', '16:35', fs, { act: 'photograph', held: 'camera', label: 'Taking Centennial portraits outside his studio', say: cries });
  const ps = spot(pose.x, pose.z, { spread: 0.9, faceTo: [cq.x, cq.z], act: 'stand' });
  const fams = (L.ctx.households || []).filter((h) => h.members && h.members.length >= 3);
  L.rng.shuffle(fams);
  let n = 0;
  const slots = [];
  for (let t = T('10:00'); t < T('12:00'); t += 16) slots.push(t);
  for (let t = T('13:25'); t < T('16:20'); t += 16) slots.push(t);
  for (const t of slots) {
    let group = null;
    while (fams.length && !group) { const h = fams.pop(); const m = h.members.filter((p) => L.idle(p, t - 12, t + 12)); if (m.length >= 3) group = m.slice(0, 5); }
    if (!group) group = cast(3, t, t + 12, { age: [5, 60], town: false });
    group.forEach((p) => put(p, t, t + 12, ps, { act: 'stand', label: `Sitting for a Centennial portrait at Lowell's` }));
    n += group.length;
  }
  scene('Frederick Lowell\'s sidewalk portraits', pose.x, pose.z, '9:45', '16:35', n + 1);
}

// a boardwalk snapshot man, photographing strollers and handing them a ticket
function boardwalkSnaps() {
  const p = visitor({ first: 'Sid', last: 'Ackerman', sex: 'M', age: 34, from: 'beachlot', visitor: false, look: { hat: 'hat_fedora', hatTint: '#6a5a48' },
    bio: 'Sid Ackerman of Revere Beach Snaps. Takes your picture walking, hands you a ticket, and the print is in the booth by six. A quarter.', lines: ['Smile, folks! Just keep walking — natural!', 'Ticket\'s a quarter. Picture\'s forever.'] });
  const s = spot(4, 233.6, { yaw: Math.PI / 2, act: 'photograph' });
  for (const [a, b] of [['11:00', '13:00'], ['14:00', '17:30']]) put(p, a, b, s, { act: 'photograph', held: 'camera', label: 'Snapping strollers on the boardwalk', say: ['Smile! Keep walking, natural as you like!', 'Here\'s your ticket — the print\'s ready by six!'] });
  claim(4, 233.6, 1.0, '11:00', '17:30');
  scene('Sid Ackerman snaps strollers on the boardwalk', 4, 233.6, '11:00', '17:30', 1);
}

// a sign painter lettering CENTENNIAL SALE on Tremblay's window, letter by letter through the day
function signPainter() {
  const P = place('Tremblay Furniture'); if (!P) return;
  const q = frontSpot(P, [-5.2, -6.5, 6, 3.5], 0.6, 0.6, '9:20', '15:40');
  if (!q) return;
  claim(q.x, q.z, 1.2, '9:20', '15:40');
  const g = P.at(q.side, 0.04);
  timed('town_lettering_1', g.x, g.z, P.yawOut, '10:10', '11:20', { y: 1.55 });
  timed('town_lettering_2', g.x, g.z, P.yawOut, '11:20', '14:30', { y: 1.55 });
  timed('town_lettering_3', g.x, g.z, P.yawOut, '14:30', '23:59', { y: 1.55 });
  const lad = P.at(q.side + (q.side < 0 ? -1.7 : 1.7), 0.55), kit = P.at(q.side + (q.side < 0 ? 1.4 : -1.4), 0.35);
  timed('town_stepladder', lad.x, lad.z, P.yawOut, '9:25', '15:35');
  timed('town_paint_kit', kit.x, kit.z, P.yawRight, '9:25', '15:35');
  const p = visitor({ first: 'Nils', last: 'Beckman', sex: 'M', age: 50, outfit: 'painter', from: 'garage', visitor: false,
    bio: 'Nils Beckman, sign painter and gilder, of Gloucester. Lettered half the shop windows on the North Shore, and signs every one in the corner, very small.', lines: ['Gold leaf, twenty-three karat. Breathe on it and it\'s gone.', 'Mr. Tremblay wanted it bigger. It\'s always bigger.'] });
  const s = spot(q.x, q.z, { yaw: P.yawIn, act: 'paint' });
  put(p, '9:30', '12:00', s, { act: 'paint', held: 'paintbrush', label: 'Lettering "CENTENNIAL SALE" on Tremblay\'s window', lines: ['Don\'t lean on the glass, son. Wet.', 'C-E-N-T-E-N… now the hard part.'] });
  put(p, '12:45', '15:30', s, { act: 'paint', held: 'paintbrush', label: 'Gilding "CENTENNIAL SALE" on Tremblay\'s window', lines: ['Gold leaf, twenty-three karat. Breathe on it and it\'s gone.', 'Nearly there. Always nearly there.'] });
  label(g.x, 1.7, g.z, '10:10', '23:59', 'CENTENNIAL SALE, in fresh gold leaf', 1.2);
  const kids = cast(2, '10:30', '11:10', { age: [7, 12] }, q.x, q.z);
  crowd(kids, '10:30', '11:10', P.at(q.side, 2.3).x, P.at(q.side, 2.3).z, { spread: 0.9, faceTo: [q.x, q.z], act: 'look', label: 'Watching the sign painter' });
  scene('A sign painter letters Tremblay\'s window', q.x, q.z, '9:30', '15:30', 1 + kids.length);
}

// a window washer on his stage, working down the face of the Beacon Building
function windowWasher() {
  const P = place('Beacon Building'); if (!P) return;
  const [s0] = span(P);
  const side = Math.max(s0 + 3, -8);
  const b = P.at(side, 0.9);
  // find the face of the building at each height (it may step back)
  const W = L.ctx.world;
  const faceAt = (y) => { for (let o = 1.5; o >= -3; o -= 0.25) { const q = P.at(side, o); const m = W.matAt(Math.floor(q.x / VS), Math.floor(y / VS), Math.floor(q.z / VS)); if (m && !(W.matFlags[m] & MFLAG.NOCOLLIDE)) return o; } return null; };
  const p = G.washer = visitor({ first: 'Dutch', last: 'Hendricks', sex: 'M', age: 41, outfit: 'painter', from: 'garage', visitor: false,
    bio: 'Dutch Hendricks washes the windows of every building in Juniper Bay taller than three stories. There are four. He does them twice a year and the Beacon Building every September.', lines: ['Best view in town, and I\'m the only one who gets it.', 'Twelve floors, forty-eight windows a floor. I count them in my sleep.'] });
  const f0 = faceAt(1.0);
  const gq = P.at(side, (f0 ?? 0) + 0.7);
  const ground = spot(gq.x, gq.z, { yaw: P.yawIn, act: 'stand' });
  const levels = [[30, '8:40'], [24, '10:05'], [18, '11:30'], [12, '13:40'], [6, '15:05']];
  const es = [{ t: '8:25', spot: ground, act: 'look', label: 'Rigging his stage on the Beacon Building' }];
  let prev = ground, n = 0;
  levels.forEach(([y, at], i) => {
    const o = faceAt(y + 1.2); if (o === null) return;
    const q = P.at(side, o + 0.42);
    const s = spot(q.x, q.z, { y, yaw: P.yawIn, act: 'wash', link: prev.node });
    const until = i + 1 < levels.length ? levels[i + 1][1] : '16:30';
    timed('town_washer_stage', q.x - P.u[0] * 0.05, q.z - P.u[1] * 0.05, P.yawOut, T(at) - 1, until, { y: y - 0.05 });
    label(q.x, y + 1, q.z, T(at), until, `Window washer on the Beacon Building, ${Math.round(y / 3.5)}th floor`, 1.8);
    es.push({ t: at, spot: s, act: 'wash', held: 'rag', label: 'Washing the windows of the Beacon Building' });
    if (y === 18) es.push({ t: '12:05', spot: s, act: 'drink_stand', held: 'coffee_cup', label: 'Lunch on his stage, eighteen metres up' }, { t: '12:35', spot: s, act: 'wash', held: 'rag', label: 'Washing the windows of the Beacon Building' });
    prev = s; n++;
  });
  es.push({ t: '16:30', spot: ground, act: 'stand', label: 'Coiling his ropes' });
  if (n) { plan(p, '8:25', '16:45', es); scene('A window washer works down the Beacon Building', b.x, b.z, '8:25', '16:45', 1); }
}

// ================================================================== shop-front life
// Saturday on Market Street: people drifting from window to window (and couples, arm in arm)
function windowShoppers() {
  const shops = L.places.shops.filter((P) => P.windows && P.kind === 'shop' && P.door.z > -220 && P.door.z < 70 && P.door.x > 60);
  if (shops.length < 4) return;
  const spots = new Map();
  const winSpot = (P, k) => {
    const key = P.name + k;
    if (!spots.has(key)) {
      const [s0, s1] = span(P);
      const sides = k % 2 ? [2.6, 3.8, 1.8, 5] : [-2.6, -3.8, -1.8, -5];
      let q = null;
      for (const sd of sides) { if (sd < s0 + 0.7 || sd > s1 - 0.7) continue; const c = P.at(sd, 0.85); if (clutterNear(c.x, c.z, 0.55).length === 0) { q = c; break; } }
      spots.set(key, q ? spot(q.x, q.z, { yaw: P.yawIn, act: 'browse' }) : null);
    }
    return spots.get(key);
  };
  let n = 0;
  const slots = [];
  for (let i = 0; i < 64; i++) slots.push(T('9:35') + ((i * 37) % 560));
  for (let i = 0; i < 16; i++) slots.push(T('18:30') + ((i * 23) % 110));
  slots.forEach((t0, i) => {
    const t1 = t0 + 30 + (i % 4) * 10;
    const pair = i % 5 === 0;
    const ppl = cast(pair ? 2 : 1, t0, t1, { age: [14, 85], fill: i % 3 === 0 }, 220, 10);
    if (!ppl.length) return;
    const start = L.rng.int(0, shops.length - 1), P0 = shops[start];
    const near = shops.slice().sort((a, b) => dist(a.door, P0.door) - dist(b.door, P0.door)).slice(0, 5);
    const stops = near.map((P, k) => winSpot(P, (i + k) % 2)).filter(Boolean);
    stops.forEach((s) => { s.dwell = 3 + L.rng.int(0, 5); });
    if (!stops.length) return;
    ppl.forEach((p, k) => {
      const held = p.sex === 'F' && L.rng.chance(0.6) ? 'handbag' : null, lab = pair ? 'Window shopping, arm in arm' : 'Window shopping';
      let t = t0 + k * 0.3, prev = stops[0];
      const es = stops.map((s, j) => { if (j) t += dist(prev, s) * 1.3 / (p.speed * 60) + prev.dwell; prev = s; return { t, spot: s, act: 'browse', label: lab, held, arms: pair && k === 1 ? 'arm' : null }; });
      plan(p, t0 + k * 0.3, t + stops[stops.length - 1].dwell, es);
      n++;
    });
  });
  scene('Window shoppers along the downtown streets', 180, -40, '9:35', '20:30', n);
}

// kids with their noses to the glass of Draper's Toys (the train layout runs in the window)
function toyWindow() {
  const P = place("Draper's Toys"); if (!P) return;
  const train = clutterNear(P.door.x - 4.7, P.door.z, 3).find((q) => q.t === 'toy_train');
  const s0 = train ? sideOf(P, train.x, train.z) : -4.5;
  const c = P.at(s0, 0.7);
  const s = spot(c.x, c.z, { spread: 0.9, faceTo: [P.at(s0, -1).x, P.at(s0, -1).z], act: 'look' });
  claim(c.x, c.z, 1.3);
  const lines = ['Look! It goes through the tunnel! Look!', 'That\'s a Lionel. A real Lionel.', 'I\'m asking for that one for Christmas. And I\'m being good.', 'Mr. Draper made that schooner himself. Forty-two blocks.'];
  let n = 0;
  for (const [a, b, k] of [['9:30', '10:15', 3], ['11:00', '11:45', 4], ['13:15', '13:55', 3], ['15:30', '16:20', 4], ['18:30', '19:10', 2]]) {
    const kids = cast(k, a, b, { age: [4, 11], fill: k > 2 }, c.x, c.z);
    kids.forEach((p, i) => put(p, T(a) + i * 3, b, s, { act: i % 3 === 2 ? 'browse' : 'look', label: "Nose pressed to the window at Draper's Toys", lines }));
    n += kids.length;
    if (kids.length) scene("Kids at the window of Draper's Toys", c.x, c.z, a, b, kids.length);
  }
  sound(c.x, c.z, '9:00', '18:00', 'kids', 18, 0.25);
  label(P.at(s0, -0.3).x, 1.0, P.at(s0, -0.3).z, '8:00', '21:00', "The Lionel train in Draper's window — running since 1924", 1.2);
}

// teenagers loafing outside Mayhew's soda fountain
function sodaFountainTeens() {
  const P = place("Mayhew's Pharmacy & Soda Fountain"); if (!P) return;
  const lines = [
    'Shirley Oakes drinks lime rickeys she doesn\'t even like. For Buddy Keene.',
    'Are you going to the hop? Everybody\'s going to the hop.', 'Mr. Bishop\'s lending every record in the store. If there\'s a polka I\'ll die.',
    'Did you see the new Ford? Two-tone. Two-tone!', 'My pop says the Braves in Milwaukee is a sin against nature.', 'Peggy\'s going with Joanie. Sure she is.',
  ];
  for (const [a, b, k] of [['10:30', '12:00', 3], ['15:05', '17:25', 5], ['18:25', '19:20', 4]]) {
    const q = frontSpot(P, [7, 8.5, 5.5, 10], 0.45, 1.0, a, b);
    if (!q) continue;
    const teens = cast(k, a, b, { age: [13, 19], fill: k > 3, prefer: (p) => ['Constance', 'Mary', 'Walter', 'Sophia', 'Josephine'].includes(p.first) }, q.x, q.z);
    if (teens.length < 2) continue;
    teens.forEach((p, i) => {
      const sd = q.side + (i - (teens.length - 1) / 2) * 1.1;
      const lean = i % 2 === 0;
      const c = P.at(sd, lean ? 0.35 : 1.5);
      const s = spot(c.x, c.z, { yaw: lean ? P.yawOut : P.yawIn, act: lean ? 'lean' : pick(['talk', 'laugh', 'drink_stand']) });
      put(p, T(a) + i * 2, b, s, { act: s.act, held: s.act === 'drink_stand' ? 'coffee_cup' : null, label: 'Loafing outside Mayhew\'s soda fountain', lines });
    });
    claim(q.x, q.z, 2.2, a, b);
    sound(q.x, q.z, a, b, 'radio', 18, 0.25);
    scene("Teenagers loafing outside Mayhew's soda fountain", q.x, q.z, a, b, teens.length);
  }
}

// old men on the bench outside Garrity Hardware, whittling and arguing
function hardwareBench() {
  const P = place('Garrity Hardware'); if (!P) return;
  const q = frontSpot(P, [-5, -4, -6], 0.7, 1.2);
  if (!q) return;
  claim(q.x, q.z, 1.6);
  prop('bench_park', q.x, q.z, P.yawOut);
  const seats = [-0.55, 0.55].map((d) => { const c = P.at(q.side + d, 1.0); return spot(c.x, c.z, { yaw: P.yawOut, pose: 'sit', act: 'talk_sit', seat: 0.45 }); });
  const st = P.at(q.side + 1.7, 1.3);
  const stand = spot(st.x, st.z, { faceTo: [q.x, q.z + (P.u[1] > 0 ? 0 : 0)], act: 'lean' });
  const talk = [
    [0, 'Milwaukee! The Boston Braves in Milwaukee. It\'s unnatural.'], [1, 'They drew twenty-eight thousand all year. You drew more at Tom\'s rake sale.'],
    [0, 'Those new mercury lamps on Harbor Street. You\'ll look like a drowned man under \'em.'], [1, 'I\'ve looked like a drowned man since \'38. Nobody noticed.'],
    [0, 'Ted Williams. Two years flying jets in Korea and he comes home hitting .400.'], [1, 'Four hundred for thirty-seven games. That\'s not a season, that\'s a vacation.'],
    [0, 'In the \'38 blow the water came up to Tom\'s second shelf. I was here.'], [1, 'You were in the Anchor & Chain. We all know where you were.'],
  ];
  let n = 0;
  for (const [a, b] of [['8:30', '11:45'], ['13:50', '17:15']]) {
    const men = cast(3, a, b, { age: [60, 92], sex: 'M', fill: false, prefer: (p) => ['Dunmore', 'Washington', 'Sprague', 'Freeman', 'Tobey', 'Wrobel'].includes(p.last) }, q.x, q.z);
    if (men.length < 2) continue;
    put(men[0], a, b, seats[0], { act: 'sew', label: 'Whittling a clothespin on the bench outside Garrity\'s' });
    put(men[1], a, b, seats[1], { act: 'talk_sit', label: 'Arguing baseball on the bench outside Garrity\'s' });
    if (men[2]) put(men[2], a, b, stand, { act: 'lean', held: 'cane', label: 'Putting in his two cents outside Garrity\'s' });
    L.convo(men.slice(0, 2), T(a), T(b), talk);
    scene('Old men on the bench outside Garrity Hardware', q.x, q.z, a, b, men.length);
    n += men.length;
  }
  label(q.x, 0.8, q.z, '6:00', '22:00', 'The liars\' bench outside Garrity Hardware', 1.0);
}

// a sidewalk sale outside Woolcott's 5 & 10
function sidewalkSale() {
  const P = place("Woolcott's 5 & 10"); if (!P) return;
  const q = frontSpot(P, [3.6, 4.4, -3.2, 2.8], 1.2, 1.2, '8:45', '17:30');
  if (!q) return;
  claim(q.x, q.z, 1.6, '8:45', '17:30');
  timed('town_sale_table', q.x, q.z, P.yawOut, '9:00', '17:15');
  label(q.x, 1.0, q.z, '9:00', '17:15', "Woolcott's Centennial sidewalk sale — everything a dime", 1.3);
  G.saleTable = { ...q, P };
  const hw = person('Harold', 'Woolcott'), sh = person('Shirley', 'Oakes');
  const d = P.at(0, 0.3), c = P.at(q.side * 0.9, 1.0);
  if (hw && avail(hw, '8:38', '9:02')) put(hw, '8:42', '9:02', spot(d.x, d.z, { yaw: yawTo(d.x, d.z, c.x, c.z), pace: Math.max(1, Math.hypot(c.x - d.x, c.z - d.z) - 0.7), act: 'carry' }), { act: 'carry', held: 'crate_small', label: 'Setting up the sidewalk sale' });
  const clerk = P.at(q.side, 0.3);
  const cs = spot(clerk.x, clerk.z, { yaw: P.yawOut, act: 'counter' });
  G.saleClerk = cs;
  if (sh) for (const [a, b] of [['9:05', '11:04'], ['11:50', '12:30'], ['13:15', '16:45']]) if (avail(sh, a, b)) put(sh, a, b, cs, { act: 'counter', label: 'Minding the sidewalk sale at Woolcott\'s', lines: ['Everything on the table a dime. Everything!', 'Four hundred pennants! My hands are blue from the dye.'] });
  const bs = P.at(q.side, 2.35);
  const buy = spot(bs.x, bs.z, { spread: 1.3, faceTo: [q.x, q.z], act: 'browse' });
  let n = 0;
  for (let t = T('9:10'); t < T('17:00'); t += 9 + (n % 3) * 3) {
    const [c2] = cast(1, t, t + 12, { age: [16, 80] }, q.x, q.z);
    if (c2 && put(c2, t, t + 12, buy, { act: 'browse', held: c2.sex === 'F' ? 'handbag' : null, label: 'Picking over the sidewalk sale at Woolcott\'s' })) n++;
  }
  scene("Woolcott's sidewalk sale", q.x, q.z, '9:00', '17:15', n + 1);
}

// Marcus Freeman in his doorway between customers
function barberDoorway() {
  const P = place("Freeman's Barber Shop"), m = person('Marcus', 'Freeman');
  if (!P || !m) return;
  const c = P.at(0.9, 0.35);
  const s = spot(c.x, c.z, { yaw: P.yawOut, act: 'lean' });
  let n = 0;
  for (const [a, b] of [['9:50', '10:12'], ['11:15', '11:32'], ['12:20', '12:38'], ['16:25', '16:40']]) {
    if (!avail(m, a, b)) continue;
    put(m, a, b, s, { act: 'lean', label: 'Standing in his doorway between customers', lines: ['Chair\'s empty, if you\'re feeling brave.', 'Pop opened this shop in \'21. Same chair, same strop.', 'Sammy! Shoe customer!'] });
    scene("Marcus Freeman in the doorway of his barber shop", c.x, c.z, a, b, 1); n++;
  }
}

// a line at the bank before the doors open at nine (Saturday hours 9 to noon)
// a line along the frontage, facing the door; when it moves, each goes inside for a while (`inside` minutes)
function queueAt(P, sides, out, t0, t1, n, want, labelText, lines, dir = 1, inside = null, insideLabel = null) {
  t0 = T(t0); t1 = T(t1);
  const ppl = cast(n, t0, t1 + (inside ? inside[1] : 0), want, P.door.x, P.door.z);
  const inn = inside ? hidden(P.at(0, -1.4).x, P.at(0, -1.4).z) : null;
  ppl.forEach((p, i) => {
    const c = P.at(sides + dir * i * 0.85, out);
    const s = spot(c.x, c.z, { yaw: dir > 0 ? P.yawLeft : P.yawRight, act: i % 3 === 1 ? 'read_stand' : 'wait' });
    const held = s.act === 'read_stand' ? 'newspaper' : (p.sex === 'F' ? 'handbag' : null);
    if (!inn) { put(p, t0 + i * 1.5, t1, s, { act: s.act, held, label: labelText, lines }); return; }
    const tin = t1 - (ppl.length - i) * 1.2 + L.rng.int(0, 1);
    plan(p, t0 + i * 1.5, tin + L.rng.int(inside[0], inside[1]), [{ t: t0 + i * 1.5, spot: s, act: s.act, held, label: labelText, lines }, { t: tin, spot: inn, act: 'stand', label: insideLabel || `Inside ${P.name}` }]);
  });
  return ppl;
}
function bankLine() {
  const P = place('First Juniper Savings Bank'); if (!P) return;
  const ppl = queueAt(P, 1.4, 0.8, '8:44', '9:08', 6, { age: [20, 80] }, 'Waiting for the bank to open at nine', ['Saturday hours, nine to noon. Nine means nine.', 'Cashing my check before the fair eats it.'], 1, [4, 10], 'At the teller\'s window, First Juniper Savings');
  if (ppl.length) scene('A line outside First Juniper Savings Bank before nine', P.door.x, P.door.z, '8:44', '9:02', ppl.length);
}
// collectors after the special Harbor Days cancellation at the Post Office
function postOfficeLine() {
  const P = place('United States Post Office'); if (!P) return;
  let n = 0;
  for (const [a, b, k] of [['9:00', '9:40', 5], ['10:10', '10:45', 4], ['11:20', '11:50', 3]]) {
    const ppl = queueAt(P, 1.6, 0.9, a, b, k, { age: [14, 85] }, 'In line for the Harbor Days postmark', ['A special cancellation! "Juniper Bay Centennial, 1853–1953." I\'ll take ten.', 'My nephew in Ohio collects covers. He\'ll never forgive me if I miss it.'], 1, [3, 7], 'Getting the Centennial postmark at the counter');
    if (ppl.length) scene('Stamp collectors line up for the Centennial postmark', P.door.x, P.door.z, a, b, ppl.length);
    n += ppl.length;
  }
  label(P.at(0, 0.5).x, 2, P.at(0, 0.5).z, '9:00', '12:00', 'Special Harbor Days cancellation today', 2);
}
// ladies waiting for Harlow's to open at half past nine
function harlowsOpening() {
  const P = place("Harlow's"); if (!P) return;
  const c = P.at(0, 1.7);
  const ppl = cast(9, '9:10', '10:05', { age: [16, 80], prefer: (p) => p.sex === 'F' }, c.x, c.z);
  const cs = spot(c.x, c.z, { spread: 2.2, faceTo: [P.door.x, P.door.z], act: 'wait' });
  const inn = hidden(P.at(0, -2).x, P.at(0, -2).z);
  ppl.forEach((p, i) => plan(p, T('9:10') + (i * 2) % 20, T('9:31') + 12 + i * 3, [{ t: T('9:10') + (i * 2) % 20, spot: cs, act: ['wait', 'talk', 'wait', 'browse'][i % 4], held: p.sex === 'F' ? 'handbag' : null, label: "Waiting for Harlow's to open at half past nine" }, { t: T('9:30') + i * 0.4, spot: inn, act: 'stand', label: "Riding the escalator at Harlow's" }]));
  if (ppl.length) scene("A crowd waits for Harlow's to open", c.x, c.z, '9:10', '9:33', ppl.length);
  sound(c.x, c.z, '9:10', '9:33', 'chatter', 25, 0.35);
}
// the ballgame on the television in the window of Bay Radio & Television
function ballgameWindow() {
  const P = place('Bay Radio & Television'); if (!P) return;
  const c = P.at(1.8, 1.7), w = P.at(1.8, -0.5);
  claim(c.x, c.z, 2.0, '13:00', '16:30');
  const lines = ['Dizzy Dean\'s calling it. "He slud into third!" Slud!', 'You can see the stitches on the ball! Twenty-one inches!', 'Vic, turn it up! Vic!', 'Television. My father would have called it witchcraft.', 'Look at that — you can see the pitcher spit.'];
  let n = 0;
  for (const [a, b, k] of [['13:00', '14:10', 7], ['14:05', '15:20', 8], ['15:15', '16:30', 6]]) {
    const ppl = cast(k, a, b, { age: [9, 80], prefer: (p) => p.sex === 'M' }, c.x, c.z);
    crowd(ppl, a, b, c.x, c.z, { spread: 1.8, faceTo: [w.x, w.z], acts: ['look', 'look', 'cheer', 'look', 'talk'], label: 'Watching the Game of the Week in the window of Bay Radio & Television', lines, stagger: 3 });
    n += ppl.length;
  }
  sound(w.x, w.z, '13:00', '16:30', 'radio', 22, 0.4);
  sound(c.x, c.z, '13:00', '16:30', 'crowd', 25, 0.3);
  label(w.x, 1.3, w.z, '13:00', '16:30', 'A twenty-one-inch RCA in the window: the Game of the Week', 1.5);
  scene('A crowd watches the ballgame on the television in the window', c.x, c.z, '13:00', '16:30', n);
}
// men with the papers outside Lantern Tobacco & News, and Emmett Judd's Series pool
function tobaccoShop() {
  const P = place('Lantern Tobacco & News'); if (!P) return;
  const q = frontSpot(P, [-3, 3.5, -4.5], 1.3, 0.9);
  if (!q) return;
  const s = spot(q.x, q.z, { spread: 1.3, act: 'read_stand' });
  const lines = ['Yankees in six. Mark it down.', 'Marciano put LaStarza down in the eleventh. A Brockton boy!', 'Fifty cents on the Dodgers. Emmett says I\'ve got a heart and no sense.', 'The Boston papers say rain Sunday. The Boston papers always say rain.'];
  let n = 0;
  for (const [a, b] of [['7:40', '8:40'], ['10:00', '11:50'], ['16:05', '18:00']]) {
    const men = cast(3, a, b, { age: [30, 85], sex: 'M' }, q.x, q.z);
    men.forEach((p, i) => put(p, T(a) + i * 6, b, s, { act: i === 1 ? 'talk' : 'read_stand', held: 'newspaper', label: 'Reading the Boston papers outside Lantern Tobacco & News', lines }));
    n += men.length;
    scene('Reading the papers outside Lantern Tobacco & News', q.x, q.z, a, b, men.length);
  }
  const ej = person('Emmett', 'Judd'), d = P.at(0.8, 0.4);
  if (ej && avail(ej, '10:15', '10:40')) put(ej, '10:20', '10:40', spot(d.x, d.z, { yaw: P.yawOut, act: 'smoke_pipe' }), { act: 'smoke_pipe', label: 'Taking the air in his doorway', lines: ['I saw Boston win the first Series, 1903. And 1918. I\'m still counting.'] });
}
// Elks on the lodge steps, cigars going
function elksSteps() {
  const P = place('Elks Lodge No. 812'); if (!P) return;
  const c = P.at(2.4, 1.2);
  let n = 0;
  for (const [a, b] of [['11:00', '12:20'], ['18:10', '19:10']]) {
    const men = cast(3, a, b, { age: [40, 80], sex: 'M', fill: false }, c.x, c.z);
    crowd(men, a, b, c.x, c.z, { spread: 1.2, act: 'smoke_pipe', acts: ['smoke_pipe', 'talk', 'laugh'], label: 'Smoking a cigar on the Elks Lodge steps', lines: ['The Mayor\'s speech will run long. The Mayor\'s speeches always run long.', 'The Harbor Chords are singing at noon. Try not to wince.'] });
    n += men.length;
    if (men.length) scene('Elks with cigars outside Lodge No. 812', c.x, c.z, a, b, men.length);
  }
}
// Hank Barnaby with his head under a customer's Plymouth outside the Mill Street Garage
function garageMechanic() {
  const P = place('Mill Street Garage'), h = person('Hank', 'Barnaby');
  if (!P) return;
  const car = truckFor(P, 'car_sedan', '9:10', '11:55', { len: 5.2, sides: [-6, -9, 5] , tint: '#3a5a3a' });
  if (!car) return;
  const q = along(car, 0.4, 1.35);
  const who = h && avail(h, '9:15', '11:40') ? h : visitor({ first: 'Joey', last: 'Barnaby', sex: 'M', age: 19, outfit: 'mechanic', from: 'garage', visitor: false });
  const s = spot(q.x, q.z, { yaw: Math.atan2(-Math.cos(car.yaw), Math.sin(car.yaw)), act: 'under_car' });
  put(who, '9:20', '10:40', s, { act: 'under_car', label: 'Under a customer\'s Plymouth outside the garage', lines: ['Hand me the nine-sixteenths. No, the other nine-sixteenths.', 'Muffler\'s shot. So\'s the fellow\'s patience.'] });
  const s2 = spot(along(car, 2.3, 1.6).x, along(car, 2.3, 1.6).z, { faceTo: [car.x, car.z], act: 'wrench' });
  put(who, '10:40', '11:40', s2, { act: 'wrench', label: 'Working under the hood of a Plymouth' });
  timed('town_tackle_box', q.x + 0.7, q.z + 0.4, 0, '9:20', '11:40');
  sound(car.x, car.z, '9:20', '11:40', 'hammer', 25, 0.25);
  scene('A mechanic under a Plymouth outside the Mill Street Garage', car.x, car.z, '9:20', '11:40', 1);
}
// browsers at the bargain book cart outside Pike & Daughter
function bookCart() {
  const c = G.display && G.display.town_book_cart; if (!c) return;
  const q = c.P.at(c.side, 2.2);
  const s = spot(q.x, q.z, { spread: 1.0, faceTo: [c.x, c.z], act: 'browse' });
  let n = 0;
  for (let t = c.t0 + 10; t < c.t1 - 20; t += 22) {
    const [p] = cast(1, t, t + 18, { age: [14, 85] }, q.x, q.z);
    if (p && put(p, t, t + 18, s, { act: n % 3 ? 'browse' : 'read_stand', held: n % 3 ? null : 'book', label: 'Browsing the ten-cent book cart at Pike & Daughter' })) n++;
  }
  scene('Browsing the bargain book cart at Pike & Daughter', q.x, q.z, c.t0, c.t1, n);
}
// Saturday morning at the fish market: a line out the door
function fishMarketLine() {
  const P = place('Castellano Fish Market'); if (!P) return;
  const ppl = queueAt(P, -1.3, 0.8, '8:05', '8:50', 5, { age: [25, 80], prefer: (p) => p.sex === 'F' }, 'In line at the fish market for Saturday haddock', ['The boats came in heavy. Vinnie says the haddock\'s the best since August.', 'Chowder tonight, if I get to the front before the clams go.'], -1, [3, 6], 'Buying haddock at Castellano\'s counter');
  if (ppl.length) scene('A Saturday line at Castellano Fish Market', P.door.x, P.door.z, '8:05', '8:50', ppl.length);
}

// WJBY's man on the street, with a microphone on a stand outside the Juniper Trust Building
function wjbyInterviews() {
  const P = place('Juniper Trust Building'); if (!P) return;
  const bf = person('Bill', 'Ferris');
  const q = frontSpot(P, [3.5, -3.5, 5, -5], 1.6, 1.0);
  if (!q) return;
  claim(q.x, q.z, 2.0, '10:25', '16:40');
  const guestPt = P.at(q.side + 1.0, 1.9), mic = P.at(q.side + 0.5, 1.75), crowdPt = P.at(q.side + 0.5, 3.4);
  let n = 0;
  for (const [a, b] of [['10:30', '11:55'], ['15:00', '16:30']]) {
    const host = bf && avail(bf, a, b) ? bf : null;
    if (!host) continue;
    timed('mic_stand', mic.x, mic.z, P.yawRight, a, b);
    put(host, a, b, spot(q.x, q.z, { faceTo: [guestPt.x, guestPt.z], act: 'announce' }), { act: 'announce', label: 'Interviewing passers-by for WJBY', say: ['This is Bill Ferris for WJBY, on Lantern Avenue for Harbor Days!', 'Tell our listeners, ma\'am: what does the Centennial mean to you?', 'And where are you folks from? Worcester! Well, welcome to the Bay!'] });
    const gs = spot(guestPt.x, guestPt.z, { faceTo: [q.x, q.z], act: 'talk' });
    for (let t = T(a) + 3, k = 0; t < T(b) - 5; t += 7, k++) {
      const [g] = cast(1, t, t + 6, { age: [12, 85] }, gs.x, gs.z);
      if (g) put(g, t, t + 6, gs, { act: 'talk', label: 'Being interviewed on the radio by Bill Ferris of WJBY', lines: ['Hello, Mother! I\'m on the radio!', 'A hundred years? I remember about sixty of \'em.', 'Is this thing on? Should I talk louder?'] });
    }
    const fans = cast(4, a, b, { age: [8, 80] }, crowdPt.x, crowdPt.z);
    crowd(fans, T(a) + 4, T(b) - 4, crowdPt.x, crowdPt.z, { spread: 1.3, faceTo: [mic.x, mic.z], acts: ['look', 'laugh', 'look', 'wave'], label: 'Watching the WJBY man interview people', stagger: 7 });
    sound(q.x, q.z, a, b, 'chatter', 25, 0.35);
    label(mic.x, 1.5, mic.z, a, b, 'WJBY 1340 on your dial — live from Lantern Avenue', 1.0);
    scene("WJBY's man on the street outside the Juniper Trust Building", q.x, q.z, a, b, 2 + fans.length);
    n++;
  }
}
// Saturday half-day: clerks walk in to the office buildings before nine and pour out at noon
function officeHalfDay() {
  const blds = ['Mercantile Building', 'Beacon Building', 'Harbor Insurance Building', 'Juniper Trust Building'];
  let n = 0;
  blds.forEach((name, bi) => {
    const P = place(name); if (!P) return;
    const inside = hidden(P.at(0, -1.5).x, P.at(0, -1.5).z);
    const knot = P.at(bi % 2 ? -3.5 : 3.5, 1.8);
    const ks = spot(knot.x, knot.z, { spread: 1.2, act: 'talk' });
    for (let k = 0; k < 5; k++) {
      const p = visitor({ sex: k % 3 === 2 ? 'F' : 'M', age: L.rng.int(22, 60), formal: true, from: pick(['station', 'garage', 'station']), visitor: false,
        bio: `Works in the ${name}. Saturdays are a half day — nine to noon — and this Saturday, everybody's watching the clock.`, lines: ['Half day Saturdays. The best three hours of the week are the last ten minutes.', 'Mr. Pemberton\'s speech is at half past five. We\'ll be there. Everybody will.'] });
      const tin = T('8:32') + k * 4 + bi, tout = T('12:00') + k * 0.7;
      plan(p, tin, tout + 6 + k, [{ t: tin, spot: inside, act: 'stand', held: 'briefcase', label: `At work in the ${name}` }, { t: tout, spot: ks, act: k % 2 ? 'talk' : 'laugh', held: 'briefcase', label: 'Out at noon — Saturday half day' }], { early: 0 });
      n++;
    }
    scene(`Clerks leave the ${name} at noon (Saturday half day)`, knot.x, knot.z, '12:00', '12:12', 5);
  });
}
// the last-minute line at the bank before it closes at noon
function bankNoon() {
  const P = place('First Juniper Savings Bank'); if (!P) return;
  const ppl = queueAt(P, 1.4, 0.8, '11:40', '11:58', 4, { age: [20, 80] }, 'Hurrying to the bank before it closes at noon', ['Saturday hours, nine to noon. It\'s eleven fifty. Hurry!', 'I need cash for the fair. The pie table doesn\'t take checks.'], 1, [2, 6], 'At the teller\'s window, just under the wire');
  if (ppl.length) scene('A last-minute line at the bank before noon', P.door.x, P.door.z, '11:40', '11:58', ppl.length);
}
// league bowlers arriving at Harbor Lanes with their bowling bags
function harborLanes() {
  const P = place('Harbor Lanes'); if (!P) return;
  const inside = hidden(P.at(0, -1.5).x, P.at(0, -1.5).z);
  let n = 0;
  for (const [a, b, team] of [['12:40', '13:05', 'the Castellano Fish Co. team'], ['15:35', '16:00', 'the Harbor Canning ladies']]) {
    const c = P.at(3, 1.8);
    const ppl = cast(4, a, T(b) + 60, { age: [20, 65], prefer: team.includes('ladies') ? (p) => p.sex === 'F' : (p) => p.sex === 'M' }, c.x, c.z);
    const s = spot(c.x, c.z, { spread: 1.3, act: 'talk' });
    ppl.forEach((p, i) => plan(p, T(a) + i * 2, T(b) + 45 + i * 5, [{ t: T(a) + i * 2, spot: s, act: i % 2 ? 'laugh' : 'talk', held: 'briefcase', label: `Bowling with ${team} at Harbor Lanes` }, { t: b, spot: inside, act: 'stand', label: `Bowling a string with ${team}` }]));
    if (ppl.length) scene(`League bowlers gather outside Harbor Lanes`, c.x, c.z, a, b, ppl.length);
    n += ppl.length;
  }
  if (n) sound(P.door.x, P.door.z, '12:40', '17:00', 'hammer', 20, 0.15);
}

// ================================================================== happenings
// 2:30 PM: a pickup noses into a Hudson pulling out by the Station Luncheonette
function fenderBender() {
  const P = place('Station Luncheonette'); if (!P) return;
  const t0 = T('14:30'), t1 = T('15:15');
  const a = curbAt(P, -6.2), yawA = a.yaw + 0.13;
  const A = { x: a.x, z: a.z + 0.1, yaw: yawA };
  const rearA = along(A, -2.6), B = { x: 0, z: 0, yaw: a.yaw - 0.32 };
  const fB = { x: Math.sin(B.yaw), z: Math.cos(B.yaw) };
  B.x = rearA.x - fB.x * 2.75; B.z = rearA.z - fB.z * 2.75 - 0.25;
  if (!curbFree(A.x, A.z, t0, t1, 11)) return;
  park('car_sedan', A.x, A.z, A.yaw, t0, t1, { len: 11, tint: '#2a4a3a', tint2: '#d8d0b8' });
  G.curb.push({ x: B.x, z: B.z, t0, t1, len: 6 });
  timed('truck_pickup', B.x, B.z, B.yaw, t0, t1, { y: 0.02, tint: '#8a2a24', tint2: '#d8d0b8' });
  const mid = G.fender = along(A, -2.9, 0.2);
  timed('town_car_debris', mid.x, mid.z, 0.4, t0, t1 + 20, { y: 0.02 });
  timed('crate', along(B, 1.2, -1.6).x, along(B, 1.2, -1.6).z, 0.7, t0, t1, { pitch: 0.4 });
  label(A.x, 1.2, A.z, t0, t1, "A '49 Hudson with a pickup truck in its trunk", 2.6);
  label(mid.x, 0.2, mid.z, t0, t1 + 20, 'Fresh glass and a hubcap on Canal Street', 1.2);
  sound(mid.x, mid.z, t0, t1, 'crowd', 35, 0.45);
  // the drivers, having it out on the sidewalk
  const lq = person('Loretta', 'Quimby');
  const d1 = lq && avail(lq, t0 - 6, t1) ? lq : visitor({ first: 'Dorothy', last: 'Mayo', sex: 'F', age: 54, from: 'garage' });
  const farm = G.crews && G.crews.get('Farm') && G.crews.get('Farm')[0];
  // (if Lyman Whitaker is busy with his apples, it's his neighbour's pickup instead — never two Lymans)
  const d2 = farm && L.free(farm, t0 - 6, t1 + 2) ? farm : visitor(farm ? { first: 'Harlan', last: 'Tuttle', sex: 'M', age: 61, outfit: 'farmer', from: 'garage' } : { first: 'Lyman', last: 'Whitaker', sex: 'M', age: 57, outfit: 'farmer', from: 'garage' });
  const q1 = P.at(-6.8, 3.2), q2 = P.at(-8.6, 3.0);
  const s1 = spot(q1.x, q1.z, { faceTo: [q2.x, q2.z], act: 'talk' }), s2 = spot(q2.x, q2.z, { faceTo: [q1.x, q1.z], act: 'talk' });
  put(d1, t0, t1, s1, { act: 'talk', label: 'Having it out after a fender-bender on Canal Street', early: 0 });
  put(d2, t0, t1, s2, { act: 'talk', label: 'Having it out after a fender-bender on Canal Street', early: 0 });
  L.convo([d1, d2], t0, t1, [
    [0, 'I signalled! I put my arm right out the window!'], [1, 'You were waving at Hazel Oakes, not at me!'],
    [0, 'Forty dollars of chrome on that Hudson. Forty dollars!'], [1, 'And a bushel of Cortlands all over Canal Street.'],
    [0, 'Who drives a truck that size down Canal Street on the Centennial?'], [1, 'Farmers, madam. Farmers bring the apples for your pie.'],
  ]);
  // Officer Rourke takes it down in his notebook
  const frank = person('Frank', 'Rourke');
  if (frank && avail(frank, t0, t1)) {
    const q = P.at(-7.7, 2.2);
    put(frank, T('14:33'), T('15:12'), spot(q.x, q.z, { faceTo: [mid.x, mid.z], act: 'read_stand' }), { act: 'read_stand', held: 'letter', label: 'Taking statements at a fender-bender on Canal Street',
      say: ['All right, one at a time. License and registration.', 'Nobody\'s hurt, that\'s the main thing. Now — who hit whom?', 'Mrs. Quimby, please. I\'m writing as fast as I can.'] });
  }
  // the Luncheonette empties onto the sidewalk to watch
  const mb = person('Myrtle', 'Beal');
  if (mb && avail(mb, t0, t1)) put(mb, T('14:32'), T('15:05'), spot(P.at(0.4, 0.35).x, P.at(0.4, 0.35).z, { yaw: P.yawOut, act: 'lean' }), { act: 'lean', label: 'Watching the fender-bender from the Luncheonette door', lines: ['I heard it from the grill. Sounded like the Great Fire all over again.'] });
  const hb = person('Hank', 'Barnaby');
  if (hb && avail(hb, '14:52', '15:15')) put(hb, '14:56', '15:14', spot(along(A, -2.9, 1.3).x, along(A, -2.9, 1.3).z, { faceTo: [mid.x, mid.z], act: 'kneel' }), { act: 'kneel', label: 'Looking over the damage for the Mill Street Garage', lines: ['Bumper\'s bent, grille\'s fine. I can have her back Tuesday.'] });
  const c = P.at(-7.5, 1.4);
  const lookers = cast(8, t0, t1, { age: [7, 85] }, c.x, c.z);
  crowd(lookers, t0 + 2, t1 - 3, c.x, c.z, { spread: 2.6, faceTo: [mid.x, mid.z], acts: ['look', 'talk', 'look', 'laugh', 'look'], label: 'Gawking at the fender-bender on Canal Street', stagger: 3 });
  scene('Fender-bender on Canal Street: a Hudson, a pickup, and Officer Rourke', mid.x, mid.z, t0, t1, lookers.length + 4);
}

// a gust takes a man's hat down the street, and he runs after it
function hatInTheWind() {
  const gusts = [['10:21', 229, -78.2, 262, -78.2, 'Grand Avenue'], ['13:06', 47, -40, 47, -2, 'Harbor Street'], ['15:41', 150, 7.6, 190, 7.6, 'Market Street'], ['17:06', 150, -202.6, 186, -202.6, 'Mill Street']];
  for (const [at, x0, z0, x1, z1, street] of gusts) {
    const tg = T(at);
    let [p] = L.recruit(1, tg - 12, tg + 6, (q) => q.sex === 'M' && q.age >= 25 && q.age <= 70 && q.look && q.look.hat);
    if (!p) p = guest(tg - 12, tg + 6, { sex: 'M', age: [30, 60] }, x0, z0);
    const a = spot(x0, z0, { yaw: yawTo(x0, z0, x1, z1), act: 'wait' });
    const b = spot(x1, z1, { yaw: yawTo(x0, z0, x1, z1), act: 'kneel' });
    plan(p, tg - 10, tg + 5, [
      { t: tg - 10, spot: a, act: 'read_stand', held: 'newspaper', label: `Reading the paper on ${street}` },
      { t: tg, spot: b, act: 'kneel', speed: 2.6, costume: { hat: null }, label: `Chasing his hat down ${street}` },
      { t: tg + 1.2, spot: b, act: 'stand', label: 'Dusting off his hat' },
    ]);
    L.follow(p, 'town_hat_blown', { fwd: 2.6, y: 0.04, bob: 0.35, yawOff: 1.3, when: 'walk', t0: tg, t1: tg + 0.8 });
    timed('town_hat_blown', along({ x: x1, z: z1, yaw: yawTo(x0, z0, x1, z1) }, 0.5).x, along({ x: x1, z: z1, yaw: yawTo(x0, z0, x1, z1) }, 0.5).z, 0.8, tg + 0.35, tg + 1.1);
    L.say(p, tg, tg + 3, ['Hey! Hey — my hat! Somebody grab that hat!', 'Four dollars at Harlow\'s! Come back here!']);
    scene(`A hat in the wind on ${street}`, x0, z0, tg - 10, tg + 5, 1);
  }
}

// a lost little boy outside Woolcott's; Shirley Oakes keeps him company till his mother comes
function lostChild() {
  const P = place("Woolcott's 5 & 10"); if (!P) return;
  const t0 = T('11:05'), tm_ = T('11:37'), t1 = T('11:47');
  let kid = null, mom = null;
  for (const h of L.rng.shuffle((L.ctx.households || []).slice())) {
    const k = h.members.find((p) => p.age >= 3 && p.age <= 6 && L.idle(p, t0 - 10, t1));
    const m = h.members.find((p) => p.sex === 'F' && p.age >= 22 && p.age <= 50 && L.idle(p, tm_ - 12, t1));
    if (k && m) { kid = k; mom = m; break; }
  }
  if (!kid) { mom = visitor({ sex: 'F', age: 31, from: 'station' }); kid = visitor({ sex: 'M', age: 5, from: 'station', last: mom.last }); }
  const c = P.at(-3.3, 1.7), sq = P.at(-2.5, 1.9);
  claim(c.x, c.z, 1.4, t0, t1);
  const ks = spot(c.x, c.z, { yaw: P.yawRight, act: 'cry' });
  plan(kid, t0, t1, [{ t: t0, spot: ks, act: 'cry', label: 'Lost, and crying outside Woolcott\'s' }, { t: tm_ + 1, spot: ks, act: 'hug', label: 'Found!' }]);
  L.say(kid, t0, tm_, ['I want my mama!', 'She was right here. She was RIGHT here.', '(sniff) …Can I have the red one?']);
  const sh = person('Shirley', 'Oakes');
  const helper = sh && avail(sh, t0, tm_ + 6) ? sh : person('Harold', 'Woolcott');
  if (helper && avail(helper, t0, tm_ + 6)) put(helper, T('11:07'), tm_ + 6, spot(sq.x, sq.z, { faceTo: [c.x, c.z], act: 'pet_dog' }), { act: 'pet_dog', label: 'Comforting a lost little boy outside Woolcott\'s',
    say: ['There now. What\'s your mother\'s name, honey?', 'Would you like a lollipop while we wait? Red or green?', 'She\'ll be along. Mothers always come back for the good ones.'] });
  const ms = spot(P.at(-4.2, 1.8).x, P.at(-4.2, 1.8).z, { faceTo: [c.x, c.z], act: 'hug' });
  plan(mom, tm_ - 5, t1, [{ t: tm_ - 5, spot: ms, act: 'hug', speed: 2.2, label: `Running to find her little ${kid.sex === 'M' ? 'boy' : 'girl'}` }, { t: tm_ + 1, spot: ms, act: 'hug', label: 'Found her child, thank heaven' }]);
  L.say(mom, tm_ - 1, t1, [`${kid.first}! Oh, ${kid.first}, don't you ever!`, 'Thank you, dear. I turned around for one second at the pie table…']);
  const lookers = cast(2, T('11:15'), T('11:35'), { age: [30, 80], prefer: (p) => p.sex === 'F' }, c.x, c.z);
  crowd(lookers, '11:15', '11:35', P.at(-3.3, 2.9).x, P.at(-3.3, 2.9).z, { spread: 1.0, faceTo: [c.x, c.z], act: 'look', label: 'Stopping to see about the lost child' });
  scene("A lost child outside Woolcott's 5 & 10", c.x, c.z, t0, t1, 3 + lookers.length);
}

// a sidewalk preacher on a soapbox
function streetPreacher() {
  const p = visitor({ first: 'Amos', last: 'Tuttle', sex: 'M', age: 66, from: 'station', visitor: false, look: { hat: 'hat_homburg', hatTint: '#1c1c20', face: 5 },
    bio: 'Brother Amos Tuttle of Haverhill preaches wherever there is a crowd and a soapbox. He has been predicting the end of the world since 1911 and is not discouraged.', lines: ['The end is nearer than you think, friend. Not today, perhaps. But nearer.', 'A hundred years, and not one of them without sin. I checked.'] });
  const S = place('Union Station'), C = place('Whitcomb Ship Chandlery');
  const sites = [['10:30', '12:20', S ? S.at(-13.5, -1.0) : null, S ? S.yawOut : 0, 'outside Union Station'], ['14:00', '15:35', C ? C.at(-4, 0.8) : null, C ? C.yawOut : 0, 'on Main Street']];
  for (const [a, b, q0, yaw, where] of sites) {
    if (!q0) continue;
    const q = nearClear(q0.x, q0.z, 0.9, a, b, 3); if (!q) continue;
    claim(q.x, q.z, 1.5, a, b);
    timed('town_soapbox', q.x, q.z, yaw, a, b);
    const sg = { x: q.x + Math.cos(yaw) * 1.0, z: q.z - Math.sin(yaw) * 1.0 };
    timed('town_placard_repent', sg.x, sg.z, yaw, a, b, { pitch: -0.12 });
    const s = spot(q.x, q.z, { yaw, y: gy(q.x, q.z) + 0.37, act: 'speech' });
    put(p, a, b, s, { act: 'speech', held: 'book', label: `Preaching from a soapbox ${where}`, say: ['A hundred years, brothers and sisters! And what is a hundred years to the Lord?', 'Harbor Days! Fireworks! And whither goest thou after the fireworks, friend?', 'Prepare to meet thy God — Amos four and twelve! My namesake!', 'Repent! Or at least stop jaywalking!'] });
    const f = { x: q.x + Math.sin(yaw) * 2.1, z: q.z + Math.cos(yaw) * 2.1 };
    const ppl = cast(3, a, b, { age: [15, 85] }, f.x, f.z);
    crowd(ppl, T(a) + 10, T(b) - 10, f.x, f.z, { spread: 1.0, faceTo: [q.x, q.z], acts: ['listen', 'laugh', 'look'], label: 'Listening to the soapbox preacher', stagger: 9 });
    scene(`A sidewalk preacher on a soapbox ${where}`, q.x, q.z, a, b, 1 + ppl.length);
  }
}

// a candidate for alderman working the crowd, with his nephew carrying the sign
function candidate() {
  const w = visitor({ first: 'Wilbur', last: 'Eames', sex: 'M', age: 52, from: 'garage', visitor: false, formal: true, look: { hat: 'hat_fedora', hatTint: '#4a4038' },
    bio: 'Wilbur Eames, insurance agent (Harbor Insurance Building, fourth floor), candidate for alderman in Ward Two this November. Has shaken four hundred hands today and remembers eleven names.', lines: ['Eames — E-A-M-E-S — for alderman. I\'d appreciate your vote in November.', 'New sidewalks on Orchard Street. That\'s my whole platform. People love it.'] });
  const nep = visitor({ first: 'Dickie', last: 'Eames', sex: 'M', age: 16, from: 'garage', visitor: false, bio: 'Wilbur Eames\'s nephew, carrying the sign for fifty cents and a hot dog.', lines: ['Uncle Wilbur says if he wins I get a job at the insurance office. I\'d rather he lost.'] });
  const sites = [['11:00', '12:30', 184, -62.4, 0, 'on Grand Avenue by the square'], ['15:30', '17:20', 196, -7.6, Math.PI, 'on Market Street by the square']];
  for (const [a, b, x, z, yaw, where] of sites) {
    const q = nearClear(x, z, 0.9, a, b, 3); if (!q) continue;
    claim(q.x, q.z, 2.0, a, b);
    const ws = spot(q.x, q.z, { yaw: yaw + Math.PI / 2, pace: 3.5, act: 'wave' });
    const ns = spot(q.x + Math.cos(yaw) * 1.4, q.z - Math.sin(yaw) * 1.4, { yaw, act: 'stand' });
    put(w, a, b, ws, { act: 'wave', label: `Shaking hands for alderman ${where}`, say: ['Wilbur Eames, for alderman! Pleasure, pleasure.', 'How\'s your mother? Give her my best. Eames — for alderman!', 'Fine town, fine day, fine people. Vote Eames!'] });
    put(nep, a, b, ns, { act: 'stand', label: 'Holding up his uncle\'s campaign sign' });
    L.follow(nep, 'town_placard_eames', { fwd: 0.3, side: -0.2, y: 0.55, when: 'spot', t0: a, t1: b });
    for (let t = T(a) + 6, k = 0; t < T(b) - 6; t += 11, k++) {
      const [c] = cast(1, t, t + 4, { age: [21, 80] }, q.x, q.z);
      if (c) put(c, t, t + 4, spot(q.x + Math.sin(yaw) * 1.1 + (k % 2 ? 1 : -1), q.z + Math.cos(yaw) * 1.1, { faceTo: [q.x, q.z], act: 'talk' }), { act: 'talk', label: 'Being introduced to a candidate for alderman' });
    }
    scene(`Wilbur Eames, candidate for alderman, works the crowd ${where}`, q.x, q.z, a, b, 2);
  }
}

// the line outside the Rialto before the 2:00 matinee (and the evening show)
function rialtoLines() {
  const P = place('The Rialto'); if (!P) return;
  for (const [ev, a, cap, lines] of [['matinee', '13:18', 'In line for the "Roman Holiday" matinee', ['Twenty-five cents! I\'ve got thirty. I\'m rich.', 'It\'s a love picture. Ugh. There\'s a Woody Woodpecker first, though.', 'Audrey Hepburn. My sister cut her hair like that. Ma cried.']],
    ['evening_show', '18:58', 'In line for "Shane"', ['Alan Ladd. He\'s shorter than you\'d think. They stand him on a box.', 'Mr. Peck has seen it eleven times. He hollers back at the screen.']]]) {
    const fans = L.ctx.people.list.map((p) => { const e = p.schedule.find((q) => q.event === ev); return e ? [p, e.t] : null; }).filter(Boolean)
      .filter(([p, t]) => t > T(a) + 12 && L.free(p, T(a) - 8, t) && avail(p, T(a) - 8, t)).sort((x, y) => (x[0].age - y[0].age));
    const q = fans.slice(0, 16);
    q.forEach(([p, t], i) => {
      const c = P.at(1.6 + i * 0.75, 1.1 + (i % 2) * 0.25);
      put(p, T(a) + i * 1.3, t, spot(c.x, c.z, { yaw: P.yawLeft, act: i % 4 === 3 ? 'talk' : 'wait' }), { act: i % 4 === 3 ? 'talk' : 'wait', label: cap, lines });
    });
    if (q.length) {
      label(P.at(1, 0.4).x, 2.2, P.at(1, 0.4).z, a, ev === 'matinee' ? '14:00' : '19:30', ev === 'matinee' ? 'ROMAN HOLIDAY — 2:00 — 25¢' : 'SHANE — 7:30', 2);
      scene(`${cap.replace('In line for', 'The line for')} outside the Rialto`, P.at(4, 1).x, P.at(4, 1).z, a, ev === 'matinee' ? '14:00' : '19:30', q.length);
    }
  }
}

// the Novak–Brennan getaway car: tin cans, a JUST MARRIED card, and a send-off at the parish hall
function newlyweds() {
  const P = place("St. Brigid's Rectory & Parish Hall"); if (!P) return;
  const helen = person('Helen', 'Novak'), bob = person('Robert', 'Brennan');
  const car = truckFor(P, 'car_convertible', '14:05', '18:47', { len: 5.2, sides: [2.6, 5, -2], tint: '#f0ece0', tint2: '#c8c0b0' });
  if (!car) return;
  const rear = along(car, -2.55);
  G.getaway = { x: rear.x, z: rear.z };
  timed('town_just_married', rear.x, rear.z, car.yaw, '14:52', '18:47', { y: 0.02 });
  label(car.x, 1.3, car.z, '14:52', '18:47', "The Brennans' getaway car, tin cans and all", 2.6);
  // two boys tie the cans on during the ceremony
  const boys = cast(2, '14:15', '14:52', { age: [11, 17], sex: 'M', fill: false }, car.x, car.z);
  boys.forEach((p, i) => { const q = along(car, -2.0 - i * 0.9, 1.35); put(p, '14:18', '14:52', spot(q.x, q.z, { faceTo: [rear.x, rear.z], act: 'kneel' }), { act: 'kneel', label: 'Tying tin cans to the Brennans\' bumper', lines: ['Tie it tighter! It\'s gotta rattle all the way to Niagara Falls!', 'If Father Garrity comes out, we\'re just admiring the car.'] }); });
  if (boys.length) scene('Tying tin cans to the newlyweds\' car', car.x, car.z, '14:15', '14:52', boys.length);
  // the send-off at 6:30
  const door = P.at(0, 0.4), side = along(car, 0.2, 1.5);
  const guests = cast(10, '18:28', '18:48', { age: [8, 80] }, P.door.x, P.door.z);
  const g = P.at(car.side, 2.2);
  crowd(guests, '18:29', '18:47', g.x, g.z, { spread: 2.8, faceTo: [side.x, side.z], acts: ['cheer', 'wave', 'cheer', 'clap'], label: 'Throwing rice at the newlyweds', stagger: 1 });
  sound(g.x, g.z, '18:30', '18:48', 'crowd', 40, 0.55);
  const inCar = hidden(car.x, car.z);
  for (const p of [helen, bob].filter(Boolean)) {
    if (!avail(p, '18:30', '18:47')) continue;
    let until = T('23:50');
    for (const [a] of p.busy || []) if (a > T('18:47')) until = Math.min(until, a);
    plan(p, '18:30', until, [{ t: '18:30', spot: spot(door.x, door.z, { yaw: P.yawOut, act: 'wave' }), act: 'wave', label: 'Coming out to a shower of rice' }, { t: '18:36', spot: spot(side.x, side.z, { yaw: P.yawIn, act: 'wave' }), act: 'wave', label: 'Waving goodbye — off to Niagara Falls' }, { t: '18:45', spot: inCar, act: 'stand', label: 'Off on their honeymoon' }], { early: 0, noResume: true });
  }
  scene('The send-off: rice, cans and a white convertible', car.x, car.z, '18:29', '18:47', guests.length + 2);
}

// Miss Augusta Whitcomb leads a walking tour of the waterfront for visitors
function whitcombTour() {
  const aw = person('Augusta', 'Whitcomb');
  const M = place('Maritime Museum (Old Custom House)'), D = place('Harbor Light Diner');
  if (!M || !D) return;
  const win = [0, 200, 270, 310].find((d) => aw && avail(aw, T('10:20') + d, T('11:50') + d));
  if (win === undefined) return;
  const guide = aw, sh = (v) => T(v) + win;
  const stops = [
    ['10:30', M.at(2, 2.6), M.at(2, 1.2), 'At the Old Custom House, 1859', ['Granite, from the Juniper Hill quarry. Built in 1859 for the collector of customs.', 'The anchor is from the JUNIPER herself. My great-grandfather\'s schooner.']],
    ['10:50', { x: 8.2, z: -14 }, { x: 6.6, z: -11.5 }, 'At the fishermen\'s memorial', ['The MARY ELLEN, lost off Gannet Ledge, 1867. All eleven hands.', 'Their widows raised this stone. Thirty-one dollars, by subscription.']],
    ['11:08', { x: 6, z: -38 }, { x: 3.8, z: -40.5 }, 'At the head of Pier 3', ['The \'38 hurricane took the old Pier 3 clean away. Three lives.', 'Giuseppe Castellano started here in 1894 with one dory.']],
    ['11:25', D.at(-2.5, 2.7), D.at(-2.5, 1.2), 'At the 1938 high-water mark', ['Six feet of water on Harbor Street. See the line? Right there.', 'The diner car came that winter. Nick\'s father called it an ark.']],
  ];
  const es = [], grp = cast(7, sh('10:25'), sh('11:45'), { age: [10, 75], town: false }, 60, -40);
  let n = 0;
  stops.forEach(([at, gq, aq, cap, say]) => {
    const gs = spot(gq.x, gq.z, { spread: 1.5, faceTo: [aq.x, aq.z], act: 'listen' });
    es.push({ t: sh(at), spot: spot(aq.x, aq.z, { faceTo: [gq.x, gq.z], act: 'announce' }), act: 'announce', label: 'Leading a Centennial walking tour of the waterfront', lines: say });
    grp.forEach((p) => { (p._tour = p._tour || []).push({ t: sh(at) + 0.5, spot: gs, act: pick(['listen', 'listen', 'look', 'photograph']), label: `On Miss Whitcomb's waterfront tour — ${cap.toLowerCase()}` }); });
    n++;
  });
  plan(guide, sh('10:28'), sh('11:45'), es, { say: ['This way, please! Mind the rails.', 'Questions at the end. Unless they are good questions.'] });
  grp.forEach((p) => { p._tour.forEach((e) => { if (e.act === 'photograph') e.held = 'camera'; }); plan(p, sh('10:28'), sh('11:45'), p._tour); delete p._tour; });
  scene('Miss Whitcomb\'s walking tour of the waterfront', 30, -30, sh('10:28'), sh('11:45'), grp.length + 1);
}

// Stan Kaminski, a father at last, hands out cigars on the hospital steps
// 6 PM: the speech is over and the square spills out onto the sidewalks, everybody with an opinion
function afterTheSpeech() {
  const heard = L.ctx.people.list.filter((p) => p.schedule.some((e) => e.event === 'speech') && avail(p, T('18:05'), T('18:34')) && L.free(p, T('18:05'), T('18:34')));
  L.rng.shuffle(heard);
  const knots = [[248, -7.6], [262, -7.6], [140.5, -38], [205, -62.4], [228, -62.4]];
  const lines = ['Long speech. Good speech. Long, though.', 'Two thousand fifty-three! Imagine who\'ll open that capsule.', 'Did you see Miss Whitcomb\'s hat? Since 1911, that hat.', 'Walter never could say "centennial" without whistling.'];
  let n = 0;
  knots.forEach(([x, z], k) => {
    const grp = heard.splice(0, 4);
    if (grp.length < 2) return;
    const q = nearClear(x, z, 0.8, '18:05', '18:34', 2.5); if (!q) return;
    crowd(grp, T('18:06') + k, '18:34', q.x, q.z, { spread: 1.1, acts: ['talk', 'laugh', 'talk', 'listen'], label: 'Talking over the Mayor\'s speech on the way home', lines });
    n += grp.length;
  });
  if (n) scene('Talking over the Mayor\'s speech on the sidewalks', 230, -30, '18:06', '18:34', n);
}
// supper: a line for a booth at the Harbor Light Diner
function dinerSupper() {
  const P = place('Harbor Light Diner'); if (!P) return;
  const ppl = queueAt(P, -2.2, 0.9, '18:02', '18:40', 5, { age: [16, 80] }, 'Waiting for a booth at the Harbor Light Diner', ['Chowder on Fridays, pie always. It\'s Saturday. Pie, then.', 'Eleni says ten minutes. Eleni always says ten minutes.'], -1);
  if (ppl.length) scene('A supper line at the Harbor Light Diner', P.door.x, P.door.z, '18:02', '18:40', ppl.length);
}
function babyCigars() {
  const H = place("St. Luke's Hospital"), stan = person('Stan', 'Kaminski');
  if (!H || !stan || !avail(stan, '21:00', '21:26')) return;
  const q = H.at(-1.6, 1.4);
  put(stan, '21:02', '21:26', spot(q.x, q.z, { yaw: H.yawOut, act: 'wave' }), { act: 'wave', held: 'pipe', label: 'A new father, handing out cigars on the hospital steps', early: 0,
    say: ['It\'s a girl! Rose Kaminski! Seven pounds, two ounces! Have a cigar!', 'Have a cigar! Have two! I\'m a father!', 'Fireworks! For Rose! Well — for the Centennial. But also for Rose.'] });
  const ppl = cast(3, '21:05', '21:25', { age: [18, 80] }, q.x, q.z);
  crowd(ppl, '21:05', '21:25', H.at(-1.6, 2.9).x, H.at(-1.6, 2.9).z, { spread: 1.2, faceTo: [q.x, q.z], acts: ['talk', 'laugh', 'smoke_pipe'], label: 'Congratulating Stan Kaminski', stagger: 6 });
  scene('Stan Kaminski hands out cigars outside St. Luke\'s', q.x, q.z, '21:02', '21:26', 1 + ppl.length);
}

// ================================================================== trolley and bus stops
function transitStops() {
  const stops = [
    ['trolley_stop_sign', 207.4, -196, 'the Lantern Avenue trolley, at Mill Street'], ['trolley_stop_sign', 220.6, -126, 'the Lantern Avenue trolley, at Canal Street'],
    ['trolley_stop_sign', 207.4, 56, 'the Lantern Avenue trolley, at Church Street'], ['bus_stop_sign', 127.4, -129, 'the Harbor Street bus, on Main Street'],
    ['bus_stop_sign', 60.6, -13, 'the Harbor Street bus, by the waterfront'],
  ];
  let total = 0;
  stops.forEach(([sign, x, z, name], si) => {
    const q = nearClear(x, z, 0.5, 0, 1440, 3); if (!q) return;
    claim(q.x, q.z, 1.2);
    prop(sign, q.x, q.z, x < 134 ? (x < 100 ? Math.PI / 2 : -Math.PI / 2) : x < 214 ? -Math.PI / 2 : Math.PI / 2);
    const inward = x < 134 ? (x < 100 ? 1 : -1) : x < 214 ? -1 : 1;
    const w = { x: q.x + inward * 1.2, z: q.z };
    if (sign === 'bus_stop_sign' && has('bench_bus')) { const bq = { x: q.x + inward * 2.4, z: q.z + 1.6 }; if (clear(bq.x, bq.z, 0.9)) { prop('bench_bus', bq.x, bq.z, inward > 0 ? -Math.PI / 2 : Math.PI / 2); claim(bq.x, bq.z, 1.2); } }
    const s = spot(w.x, w.z, { spread: 1.1, faceTo: [q.x - inward * 4, q.z], act: 'wait' });
    let n = 0;
    for (let t = T('6:40') + si * 3; t < T('21:30'); t += 11) {
      const rush = (t > T('7:20') && t < T('9:15')) || (t > T('16:30') && t < T('18:15'));
      const k = rush ? 2 : 1;
      const ppl = cast(k, t, t + 9, { age: [12, 85], fill: si % 2 === 0 || rush }, w.x, w.z);
      ppl.forEach((p, i) => { if (put(p, t + i * 2, t + 7 + (n % 3) * 2, s, { act: (n + i) % 3 === 0 ? 'read_stand' : 'wait', held: (n + i) % 3 === 0 ? 'newspaper' : (p.sex === 'F' ? 'handbag' : null), label: `Waiting for ${name}` })) n++; });
    }
    total += n;
    scene(`Waiting for ${name}`, w.x, w.z, '6:40', '21:30', n);
  });
}

// ================================================================== the waterfront
// a point just inside the edge of a pier or the quay, looking out over the water: walk from (x, z)
// along (dx, dz) until there's no deck underfoot
function edgeSpot(x, z, dx, dz, o = {}) {
  const top0 = solidTop(x, z);
  if (top0 === null) return null;
  let last = null, railed = false;
  for (let d = 0; d < 20; d += 0.25) {
    const qx = x + dx * d, qz = z + dz * d, t = solidTop(qx, qz);
    if (t === null || t < top0 - 0.6) break;
    if (Math.abs(t - top0) < 0.3) last = { x: qx, z: qz, y: t };
    else if (t > top0 + 0.5 && last) railed = true;
  }
  if (!last) return null;
  // a railing along the edge: stand at it (legs don't dangle through rails)
  if (railed && o.sit) { o = { ...o, sit: false, act: o.act === 'fish_sit' ? 'fish' : o.act === 'eat' ? 'drink_stand' : o.act, inset: 0.45 }; }
  const inset = o.inset ?? 0.3;
  const q = { x: last.x - dx * inset, z: last.z - dz * inset };
  if (!clear(q.x, q.z, 0.5, o.t0 ?? 0, o.t1 ?? 1440)) return null;
  const y = solidTop(q.x, q.z);
  if (y === null || Math.abs(y - top0) > 0.3) return null;
  const yaw = Math.atan2(dx, dz);
  const sp = spot(q.x, q.z, { y, yaw, act: o.act || 'fish', pose: o.sit ? 'sit' : 'stand', seat: o.sit ? 0.1 : undefined });
  sp.railed = railed;
  return sp;
}
function fishing() {
  // [x, z along the pier, outward direction]: Pier 4 south edge, Pier 5 north edge, Pier 1 both edges, the quay
  const edges = [
    [-10, 22, 0, 1, true], [-17, 22, 0, 1, true], [-24, 22, 0, 1, false], [-38, 22, 0, 1, true],
    [-12, 94, 0, -1, false], [-20, 94, 0, -1, true], [-30, 94, 0, -1, false],
    [-22, -192, 0, -1, false], [-36, -192, 0, -1, true], [-48, -192, 0, 1, true], [-28, -192, 0, 1, false],
    [4, 136, -1, 0, true], [4, 146, -1, 0, false], [4, -140, -1, 0, true],
  ];
  const sessions = [['6:30', '9:50', [55, 85], 'M'], ['9:40', '12:30', [8, 60], null], ['13:10', '16:20', [9, 16], 'M'], ['16:10', '18:40', [20, 70], 'M']];
  let n = 0, k = 0;
  for (const [a, b, age, sex] of sessions) {
    const picks = L.rng.shuffle(edges.slice()).slice(0, 7);
    for (const [x, z, dx, dz, sit] of picks) {
      const s = edgeSpot(x, z, dx, dz, { sit, act: sit ? 'fish_sit' : 'fish', t0: T(a), t1: T(b) });
      if (!s) continue;
      const [p] = cast(1, a, b, { age, sex, fill: k++ % 2 === 0, prefer: (q) => ['Sprague', 'Tobey', 'Fisk', 'Yates', 'Dunmore', 'Wrobel'].includes(q.last) }, s.x, s.z);
      if (!p) continue;
      claim(s.x, s.z, 1.0, a, b);
      put(p, a, b, s, { act: s.pose === 'sit' ? 'fish_sit' : 'fish', held: 'fishing_rod', label: p.age < 16 ? 'Fishing off the pier for mackerel' : 'Fishing off the pier', lines: p.age < 16 ? ['I got a bite! …Seaweed.', 'Pop says the mackerel run at the turn of the tide.'] : ['Cunners and a pollock. The mackerel are out past the ledge.', 'Been fishing this pier since before it was rebuilt.'] });
      const tb = { x: s.x - Math.sin(s.yaw) * 0.6 + Math.cos(s.yaw) * 0.7, z: s.z - Math.cos(s.yaw) * 0.6 - Math.sin(s.yaw) * 0.7 };
      timed(p.age < 16 ? 'town_crab_bucket' : 'town_tackle_box', tb.x, tb.z, s.yaw, a, b, { y: s.y });
      n++;
    }
    sound(-20, 22, a, b, 'splash', 30, 0.25); sound(-25, -192, a, b, 'splash', 30, 0.25);
    scene('Fishing off the piers', -24, 22, a, b, n);
  }
}
// kids crabbing from the float at the end of Pier 5
function crabbing() {
  let n = 0;
  for (const [a, b] of [['10:00', '12:10'], ['14:00', '16:30']]) {
    const kids = cast(3, a, b, { age: [7, 13], fill: true }, -20, 100);
    kids.forEach((p, i) => {
      const s = edgeSpot(-14 - i * 3.2, 100.5, 0, 1, { act: 'kneel', t0: T(a), t1: T(b) });
      if (!s) return;
      put(p, a, b, s, { act: i === 1 ? 'fish_sit' : 'kneel', held: i === 1 ? 'fishing_rod' : null, label: 'Crabbing off the float with a chicken neck on a string', lines: ['I got one! I got one! …It got away.', 'Green crabs don\'t count. Only blue crabs count.', 'Don\'t put your finger near it, stupid!'] });
      timed('town_crab_bucket', s.x + 0.8, s.z - 0.5, 0, a, b, { y: s.y });
      n++;
    });
    if (kids.length) { sound(-18, 100, a, b, 'kids', 25, 0.35); scene('Kids crabbing off the Pier 5 float', -18, 100, a, b, kids.length); }
  }
}
// men mending a net on the quay in the afternoon
function netMenders() {
  const x = 6.0, z = -68.5;
  if (!clear(x, z, 1.4)) return;
  claim(x, z, 2.4, '12:40', '17:00');
  timed('town_net_spread', x, z, Math.PI / 2, '12:40', '17:00');
  timed('fishing_net_pile', x - 0.2, z + 2.2, 0.3, '12:40', '17:00');
  const seats = [[x + 1.5, z - 0.7], [x + 1.5, z + 0.8], [x - 1.4, z - 0.2]];
  const joe = person('José', 'Silva');
  const men = [];
  if (joe && avail(joe, '12:40', '16:50')) men.push(joe);
  men.push(...cast(3 - men.length, '12:40', '16:50', { age: [55, 88], sex: 'M', fill: true, prefer: (q) => ['Sprague', 'Tobey', 'Yates', 'Medeiros', 'Costa'].includes(q.last) }, x, z));
  men.forEach((p, i) => {
    const [sx, sz] = seats[i];
    timed('crate', sx, sz, 0, '12:40', '17:00');
    put(p, '12:45', '16:50', spot(sx, sz, { faceTo: [x, z], pose: 'sit', seat: 0.5, act: 'sew' }), { act: 'sew', label: 'Mending a herring net on the quay', lines: ['A needle, a mesh board and forty years. That\'s all it takes.', 'Every hole in this net\'s got a story. Most of \'em lies.'] });
  });
  label(x, 0.3, z, '12:40', '17:00', 'A herring net spread on the quay for mending', 1.8);
  scene('Mending nets on the quay', x, z, '12:45', '16:50', men.length);
}
// Sunday painters at their easels (on a Saturday)
function harborArtists() {
  const artists = [
    ['Winifred', 'Ames', 'F', 63, 3.2, 197, [-150, 300], 'Painting Whitcomb Point Light from the end of the quay', 'Miss Winifred Ames of the Rockport art colony. Paints the same lighthouse every September and swears this year she has it.'],
    ['Anselm', 'Dorr', 'M', 71, 2.6, -103, [-45, -128], 'Painting the S.S. Gray Lady at her berth', 'Anselm Dorr, retired draughtsman from Salem, paints ships because they hold still. Mostly.'],
  ];
  for (const [f, l, sex, age, x, z, look, cap, bio] of artists) {
    const q = nearClear(x, z, 0.8, 0, 1440, 2); if (!q) continue;
    const yaw = yawTo(q.x, q.z, look[0], look[1]);
    const e = { x: q.x + Math.sin(yaw) * 1.1, z: q.z + Math.cos(yaw) * 1.1 };
    claim(q.x, q.z, 1.5);
    timed('town_easel_harbor', e.x, e.z, yaw + Math.PI, '9:40', '16:40');
    const p = visitor({ first: f, last: l, sex, age, from: 'north', look: sex === 'F' ? { hat: 'hat_sunhat', hatTint: '#e8d8a0' } : { hat: 'hat_beret', hatTint: '#2a2a2e' }, bio, lines: ['The light\'s wrong until half past two. Then it\'s perfect for eleven minutes.', 'Everyone\'s a critic. The gulls especially.'] });
    const s = spot(q.x, q.z, { yaw, act: 'paint' });
    put(p, '9:45', '12:30', s, { act: 'paint', held: 'paintbrush', label: cap });
    put(p, '13:25', '16:35', s, { act: 'paint', held: 'paintbrush', label: cap });
    const kids = cast(2, '10:30', '11:05', { age: [6, 12], fill: false }, q.x, q.z);
    crowd(kids, '10:30', '11:05', q.x - Math.sin(yaw) * 1.6, q.z - Math.cos(yaw) * 1.6, { spread: 0.8, faceTo: [e.x, e.z], act: 'look', label: 'Looking over the painter\'s shoulder' });
    scene(`${f} ${l} at an easel on the waterfront`, q.x, q.z, '9:45', '16:35', 1 + kids.length);
  }
}
// old salts yarning on a bench on the quay
function oldSalts() {
  const x = 6.4, z = 10.8;
  if (!clear(x, z, 1.2)) return;
  prop('bench_park', x, z, -Math.PI / 2); claim(x, z, 1.8);
  const seats = [-0.55, 0.55].map((d) => spot(x - 0.3, z + d, { yaw: -Math.PI / 2, pose: 'sit', seat: 0.45, act: 'talk_sit' }));
  prop('bollard', x - 3.4, z + 1.8, 0);
  const third = spot(x - 2.2, z + 1.0, { faceTo: [x, z], act: 'smoke_pipe' });
  const yarns = [
    [0, 'The MARY ELLEN went down off Gannet Ledge in \'67. Grandfather saw her lights go out.'], [1, 'Your grandfather was nine and in bed. He told it better every year.'],
    [0, 'In \'38 the sea came up Harbor Street like it owned it. Took Pier 3 whole.'], [1, 'Took my dory, my shed and my wife\'s mother\'s piano. The piano I don\'t miss.'],
    [0, 'That Gray Lady\'s a fine-looking steamer. Burns oil, though. No soul.'], [1, 'Neither have you and you still float.'],
    [0, 'Whales in the bay in \'09. Right up to the breakwater.'], [1, 'That was Swede Olsen swimming home from the Anchor & Chain.'],
  ];
  let n = 0;
  for (const [a, b] of [['9:05', '11:40'], ['14:00', '16:50'], ['18:10', '19:40']]) {
    const men = cast(3, a, b, { age: [60, 95], sex: 'M', fill: n === 0, prefer: (q) => ['Sprague', 'Dunmore', 'Fisk', 'Tobey', 'Yates', 'Wrobel', 'Carver', 'Olsen'].includes(q.last) }, x, z);
    if (men.length < 2) continue;
    put(men[0], a, b, seats[0], { act: 'talk_sit', label: 'Yarning on the bench on the quay' });
    put(men[1], a, b, seats[1], { act: 'talk_sit', label: 'Yarning on the bench on the quay' });
    if (men[2]) put(men[2], a, b, third, { act: 'smoke_pipe', held: 'pipe', label: 'Leaning on a bollard, listening to the lies' });
    L.convo(men.slice(0, 2), T(a), T(b), yarns);
    scene('Old salts yarning on the quay', x, z, a, b, men.length);
    n++;
  }
}
// early risers watch the fleet unload at Pier 3; later, families point out the boats
function boatWatchers() {
  const s = spot(1.4, -31, { spread: 1.6, faceTo: [-20, -42], act: 'look' });
  const ppl = cast(5, '6:20', '7:50', { age: [8, 85] }, 1.4, -31);
  crowd(ppl, '6:25', '7:50', 1.4, -31.5, { spread: 1.6, faceTo: [-20, -42], acts: ['look', 'look', 'talk', 'wave'], label: 'Watching the fishing fleet unload at Pier 3', stagger: 7 });
  void s;
  if (ppl.length) scene('Early risers watch the fleet unload', 1.4, -31, '6:25', '7:50', ppl.length);
  const pp2 = cast(4, '13:30', '14:30', { age: [6, 80] }, 1.4, -112);
  crowd(pp2, '13:30', '14:30', 1.4, -112, { spread: 1.5, faceTo: [-45, -128], acts: ['look', 'photograph', 'look'], label: 'Looking over the S.S. Gray Lady', stagger: 8 });
  if (pp2.length) scene('Admiring the S.S. Gray Lady from the quay', 1.4, -112, '13:30', '14:30', pp2.length);
}
// feeding the gulls from a crate on the quay
function gullFeeders() {
  const sites = [[1.9, 76, '10:30', '11:35'], [1.9, -150, '15:00', '16:05'], [2.2, 186, '12:20', '13:10']];
  for (const [x, z, a, b] of sites) {
    if (!clear(x, z, 0.8, T(a), T(b))) continue;
    const [p] = cast(1, a, b, { age: [55, 90], fill: true, prefer: (q) => q.sex === 'F' }, x, z);
    if (!p) continue;
    claim(x, z, 1.4, a, b);
    timed('crate', x + 0.35, z, 0, a, b);
    put(p, a, b, spot(x, z, { yaw: -Math.PI / 2, pose: 'sit', seat: 0.5, act: 'feed_birds' }), { act: 'feed_birds', held: 'grocery_bag', label: 'Feeding yesterday\'s bread to the gulls', lines: ['Halloran\'s day-old. The gulls know the difference.', 'That big one\'s Admiral Nelson. He\'s missing a toe and all his manners.'] });
    for (let k = 0; k < 5; k++) { const a2 = -Math.PI / 2 + (k - 2) * 0.45, r = 1.1 + (k % 2) * 0.6; timed('seagull', x + Math.sin(a2) * r, z + Math.cos(a2) * r, a2 + Math.PI, T(a) + 3 + k, b); }
    if (has('seagull_flying')) timed('seagull_flying', x - 1.8, z + 0.6, 0.5, T(a) + 5, b, { y: 2.6 });
    sound(x, z, a, b, 'splash', 18, 0.2);
    scene('Feeding the gulls on the quay', x, z, a, b, 1);
  }
}
// Elmer Yates planking a dory outside the Bayside Boat Works
function boatWorks() {
  const P = place('Bayside Boat Works'), ey = person('Elmer', 'Yates');
  if (!P) return;
  const x = 12.5, z = 60;
  if (!clear(x, z, 1.8)) return;
  claim(x, z, 2.6, '8:30', '17:30');
  if (has('hb_sawhorse')) { timed('hb_sawhorse', x, z - 1.4, Math.PI / 2, '8:30', '17:30'); timed('hb_sawhorse', x, z + 1.4, Math.PI / 2, '8:30', '17:30'); }
  timed('dory', x, z, 0, '8:30', '17:30', { y: gy(x, z) + 0.55, tint: '#d8cfa8' });
  const who = ey && avail(ey, '8:40', '12:00') ? ey : null;
  const s = spot(x + 1.3, z - 0.6, { faceTo: [x, z], act: 'hammer' });
  const s2 = spot(x - 1.3, z + 0.4, { faceTo: [x, z], act: 'saw' });
  if (who) { put(who, '8:45', '11:55', s, { act: 'hammer', label: 'Planking a new dory outside the Boat Works', lines: ['Cedar on oak, copper rivets. Same as my father did it.', 'Seventy-one and still the fastest riveter on the waterfront. The only one, too.'] }); if (avail(who, '13:00', '16:30')) put(who, '13:00', '16:30', s2, { act: 'saw', label: 'Fitting a thwart in a new dory' }); }
  const [boy] = cast(1, '9:30', '11:30', { age: [11, 16], sex: 'M', fill: false }, x, z);
  if (boy) put(boy, '9:30', '11:30', spot(x - 1.2, z - 1.0, { faceTo: [x, z], act: 'look' }), { act: 'look', label: 'Watching old Mr. Yates build a boat', lines: ['Can I hold the rivets? I won\'t drop \'em.'] });
  sound(x, z, '8:45', '11:55', 'hammer', 35, 0.4); sound(x, z, '13:00', '16:30', 'saw', 30, 0.35);
  label(x, 1.0, z, '8:30', '17:30', 'A new sixteen-foot dory on the horses, half planked', 1.8);
  scene('Elmer Yates builds a dory outside the Boat Works', x, z, '8:45', '16:30', who ? 2 : 1);
}
// the lunch and supper line at the Clam Shack window
function clamShack() {
  const P = place('The Clam Shack'); if (!P) return;
  let n = 0;
  for (const [a, b, k] of [['11:45', '12:40', 5], ['12:35', '13:30', 4], ['17:15', '18:10', 5], ['18:05', '18:50', 3]]) {
    const ppl = queueAt(P, 2.6, 1.0, a, b, k, { age: [8, 80] }, 'In line at the Clam Shack window', ['Fried clams, bellies, not strips. Strips are for tourists.', 'Bea Furtado fries \'em in lard. You can taste the lard. That\'s the point.'], 1);
    n += ppl.length;
    if (ppl.length) scene('A line at the Clam Shack window', P.at(4, 1).x, P.at(4, 1).z, a, b, ppl.length);
  }
}

// ================================================================== the beach and Playland
const shoreX = (z) => -15 - 4 * Math.sin((z - 206) / 22) - (z > 305 ? (z - 305) * 0.25 : 0);
function sandcastles() {
  const sites = [[10, 250], [27, 266], [15, 298], [31, 290]];
  let n = 0;
  sites.forEach(([x, z], i) => {
    if (!clear(x, z, 1.5)) return;
    let built = false;
    for (const [a, b] of [['10:00', '12:10'], ['13:40', '15:50']].slice(i % 2, i % 2 + 1).concat(i < 2 ? [['15:50', '17:30']] : [])) {
      const kids = cast(L.rng.int(2, 3), a, b, { age: [4, 11], fill: true }, x, z);
      if (!kids.length) continue;
      claim(x, z, 2.2, a, b);
      kids.forEach((p, k) => {
        const ang = k * 2.1 + i;
        const q = { x: x + Math.cos(ang) * 0.95, z: z + Math.sin(ang) * 0.95 };
        put(p, a, b, spot(q.x, q.z, { faceTo: [x, z], act: 'garden' }), { act: 'garden', label: 'Building a sandcastle on Juniper Beach', lines: ['It\'s got a moat! A real moat! Get more water!', 'That tower\'s the dungeon. You\'re the dragon.', 'The tide\'s coming! Build the wall, build the wall!'] });
      });
      if (!built) { timed('town_sandcastle_small', x, z, i * 0.9, T(a) + 20, T(a) + 55); timed('town_sandcastle', x, z, i * 0.9, T(a) + 55, '21:30'); built = true; if (!G.castle) G.castle = { x, z, t0: T(a) + 20 }; }
      timed('town_sand_pail', x + 1.3, z - 0.9, i, a, b);
      // a parent on a towel close by
      const pq = { x: x + 2.6, z: z + 1.8 };
      if (clear(pq.x, pq.z, 0.7, T(a), T(b))) {
        const [pa] = cast(1, a, b, { age: [25, 50], fill: kids.some((q) => q.visitor) }, pq.x, pq.z);
        if (pa) { timed('rug_rect', pq.x, pq.z, 0.3, a, b, { tint: pick(['#c85a4a', '#3a6a9a', '#d8b040']) }); put(pa, a, b, spot(pq.x, pq.z, { yaw: yawTo(pq.x, pq.z, x, z), pose: 'sit', seat: 0.06, act: 'read' }), { act: 'read', held: 'newspaper', label: 'Keeping an eye on the sandcastle builders' }); }
      }
      sound(x, z, a, b, 'kids', 25, 0.3);
      scene('Kids building a sandcastle', x, z, a, b, kids.length);
      n += kids.length;
    }
  });
}
function waders() {
  const zs = [252, 271, 286];
  let n = 0;
  for (const [a, b] of [['11:00', '11:40'], ['12:30', '13:15'], ['14:10', '14:55'], ['15:30', '16:20']]) {
    zs.forEach((z, i) => {
      const x = shoreX(z) - 1.6;
      const [p] = cast(1, a, b, { age: [6, 75], fill: (n + i) % 2 === 0 }, x, z);
      if (!p) return;
      put(p, T(a) + i * 3, b, spot(x, z, { yaw: 0, pace: 4, act: 'look', y: -1.72 }), { act: 'look', label: 'Wading at the tide line — the water is 58 degrees', lines: ['Cold! Cold cold cold cold!', 'It\'s bracing. That\'s what my father called it. Bracing.'] });
      n++;
    });
    sound(shoreX(270) - 1, 270, a, b, 'splash', 25, 0.3);
    scene('Wading at the tide line on Juniper Beach', shoreX(270), 270, a, b, 3);
  }
}
function kiteFlyer() {
  const x = 22, z = 305;
  const [kid] = cast(1, '13:00', '16:30', { age: [8, 13], sex: 'M', fill: true }, x, z);
  if (!kid) return;
  const s = spot(x, z, { yaw: Math.PI / 2 + 0.2, act: 'look' });
  put(kid, '13:00', '16:30', s, { act: 'look', label: 'Flying a kite on Juniper Beach', lines: ['Let out more string! More!', 'It\'s higher than the lighthouse! Almost!'] });
  { const ky = Math.PI / 2 + 0.2; G.kite = { x: x + Math.sin(ky) * 9.2, z: z + Math.cos(ky) * 9.2 }; }
  L.follow(kid, 'town_kite', { fwd: 0.35, y: 1.15, when: 'spot', t0: '13:05', t1: '16:30', bob: 0.3, tint: '#c83a2a', tint2: '#f0d040' });
  const [dad] = cast(1, '13:00', '16:30', { age: [30, 55], sex: 'M', fill: kid.visitor }, x, z);
  if (dad) put(dad, '13:00', '16:30', spot(x - 1.6, z + 1.2, { yaw: Math.PI / 2, act: 'look' }), { act: 'look', label: 'Minding the kite string', lines: ['Keep it out of the wires, son.'] });
  scene('A kite over Juniper Beach', x, z, '13:00', '16:30', dad ? 2 : 1);
}
function boardwalkCouples() {
  const nav = L.ctx.nav, a = L.walkNode(-20, 232, 20), b = L.walkNode(128, 232, 20);
  if (a < 0 || b < 0) return;
  const route = nav.path(a, b);
  if (!route || route.length < 3) return;
  const hh = (L.ctx.households || []).filter((h) => h.members && h.members.filter((p) => p.age >= 18).length >= 2);
  L.rng.shuffle(hh);
  let n = 0;
  const times = ['10:30', '11:20', '12:45', '14:10', '15:05', '16:20', '17:30', '19:05', '19:40'];
  for (const t of times) {
    let pair = null;
    while (hh.length && !pair) {
      const h = hh.pop();
      const ad = h.members.filter((p) => p.age >= 18 && L.idle(p, T(t) - 12, T(t) + 45));
      const m = ad.find((p) => p.sex === 'M'), f = ad.find((p) => p.sex === 'F');
      if (m && f && Math.abs(m.age - f.age) < 20) pair = [m, f];
    }
    if (!pair) pair = [guest(t, T(t) + 45, { sex: 'M', age: [20, 60] }, 20, 232), guest(t, T(t) + 45, { sex: 'F', age: [20, 60] }, 20, 232)];
    pair.forEach((p, i) => plan(p, t, T(t) + 42, [{ t, route, label: 'Strolling the boardwalk arm in arm', arms: i ? 'arm' : null, speed: 1.0 }], { early: 8 }));
    n += 2;
  }
  scene('Couples strolling the boardwalk', 30, 232, '10:30', '20:25', n);
}
function hotDogQueue() {
  const slots = [[-34.8, 240.4], [-34.9, 239.3], [-35.1, 238.2], [-35.4, 237.1]];
  let n = 0;
  for (const [a, b] of [['11:30', '14:00'], ['16:30', '19:30'], ['20:05', '20:50']]) {
    for (let t = T(a), k = 0; t < T(b) - 8; t += 4, k++) {
      const [x, z] = slots[k % slots.length];
      const [p] = cast(1, t, t + 10, { age: [6, 80], fill: k % 2 === 0 }, x, z);
      if (p && put(p, t, t + 10, spot(x, z, { yaw: 0, act: 'wait' }), { act: 'wait', label: 'In line at the Playland hot dog stand', lines: ['Two with kraut and a Moxie.', 'The Centennial Special is two hot dogs. That\'s the whole special.'] })) n++;
    }
    scene('A line at the Playland hot dog stand', -35, 239, a, b, n);
  }
}
function lifeguardChair() {
  label(2.9, 2.6, 276.9, '0:00', '23:59', 'The lifeguard chair, empty since Labor Day', 1.6);
  const pair = cast(2, '19:10', '20:30', { age: [16, 19], fill: false }, 2, 274);
  pair.forEach((p, i) => put(p, '19:10', '20:30', spot(1.3 + i * 1.0, 274.4, { yaw: -Math.PI / 2 - 0.3, pose: 'sit', seat: 0.06, act: 'talk_sit' }), { act: 'talk_sit', label: 'Sitting under the empty lifeguard chair', lines: ['Don\'t tell anybody we left the hop early.', 'Look, you can see the Gray Lady\'s lights from here.'] }));
  if (pair.length === 2) scene('Two teenagers under the lifeguard chair', 2, 274, '19:10', '20:30', 2);
}
function beachPicnic() {
  const x = 24, z = 283;
  if (!clear(x, z, 1.4)) return;
  const fam = cast(4, '12:00', '13:30', { age: [4, 60], fill: true }, x, z);
  if (!fam.length) return;
  claim(x, z, 2.2, '11:50', '13:40');
  timed('rug_rect', x, z, 0.2, '11:55', '13:35', { tint: '#c8403a', scale: 1.4 });
  timed('laundry_basket', x + 1.1, z - 0.9, 0.4, '11:55', '13:35', { tint: '#c8a060' });
  fam.forEach((p, i) => { const a = i * Math.PI / 2 + 0.2; const q = { x: x + Math.cos(a) * 0.8, z: z + Math.sin(a) * 0.8 }; put(p, '12:00', '13:30', spot(q.x, q.z, { faceTo: [x, z], pose: 'sit', seat: 0.06, act: 'eat' }), { act: 'eat', label: 'A picnic on Juniper Beach', lines: ['Egg salad again? It\'s always egg salad.', 'Sand in the sandwiches. That\'s how you know it\'s the beach.'] }); });
  scene('A family picnic on Juniper Beach', x, z, '12:00', '13:30', fam.length);
}
function beachcomber() {
  const tide = L.ctx.beachNodes && L.ctx.beachNodes.tide;
  if (!tide || tide.length < 3) return;
  const [p] = cast(1, '9:30', '11:00', { age: [60, 85], sex: 'F', fill: true }, -8, 270);
  if (!p) return;
  plan(p, '9:30', '11:00', [{ t: '9:30', route: tide.slice(), label: 'Beachcombing for sea glass along the tide line', held: 'grocery_bag', speed: 0.55 }], { early: 10 });
  if (L.free(p, '15:30', '17:00')) plan(p, '15:30', '17:00', [{ t: '15:30', route: tide.slice().reverse(), label: 'Beachcombing for sea glass along the tide line', held: 'grocery_bag', speed: 0.55 }], { early: 10 });
  scene('Beachcombing for sea glass', -8, 280, '9:30', '17:00', 1);
}

// ================================================================== the evening
function eveningStroll() {
  const nav = L.ctx.nav, a = L.walkNode(8.5, -60, 12), b = L.walkNode(8.5, 60, 12);
  if (a < 0 || b < 0) return;
  const route = nav.path(a, b);
  if (!route || route.length < 3) return;
  const hh = (L.ctx.households || []).filter((h) => h.members && h.members.filter((p) => p.age >= 18).length >= 2);
  L.rng.shuffle(hh);
  let n = 0;
  for (const t of ['19:05', '19:25', '19:45', '20:00', '20:15']) {
    let pair = null;
    while (hh.length && !pair) { const h = hh.pop(); const ad = h.members.filter((p) => p.age >= 18 && L.idle(p, T(t) - 12, T(t) + 30)); if (ad.length >= 2) pair = ad.slice(0, 2); }
    if (!pair) continue;
    pair.forEach((p, i) => plan(p, t, T(t) + 28, [{ t, route, label: 'An evening walk along the quay before the fireworks', arms: i ? 'arm' : null, speed: 0.95 }], { early: 10 }));
    n += 2;
  }
  // hotel guests out for an after-supper walk down Market Street
  for (const g of (G.hotelGuests || []).slice(0, 6)) {
    const t = T('19:00') + L.rng.int(0, 60);
    if (!L.free(g, t - 10, t + 35)) continue;
    const r = L.walkRoute(200, 8, 300);
    if (r) { plan(g, t, t + 30, [{ t, route: r, label: 'An after-supper walk from the Whitcomb Hotel' }], { early: 6 }); n++; }
  }
  if (n) scene('Evening walks along the quay and Market Street', 8, 0, '19:00', '20:45', n);
}
function blueLanternNight() {
  const P = place('The Blue Lantern'); if (!P) return;
  const club = L.ctx.people.list.map((p) => { const e = p.schedule.find((q) => q.event === 'bluelantern' && q.t > T('21:00')); return e ? [p, e.t] : null; }).filter(Boolean).filter(([p, t]) => avail(p, T('20:50'), t));
  club.slice(0, 10).forEach(([p, t], i) => { const c = P.at(1.4 + i * 0.7, 1.1); put(p, T('20:52') + i * 0.6, t, spot(c.x, c.z, { yaw: P.yawLeft, act: i % 3 ? 'wait' : 'talk' }), { act: i % 3 ? 'wait' : 'talk', label: 'In line for the Earl Freeman Quartet\'s late set', lines: ['Earl\'s got a tenor man down from Providence tonight.', 'After the fireworks, the Blue Lantern. That\'s a Harbor Days.'] }); });
  const d = visitor({ first: 'Leon', last: 'Tilley', sex: 'M', age: 45, from: 'garage', visitor: false, formal: true, bio: 'Big Leon, doorman at the Blue Lantern. Hasn\'t raised his voice since 1937. Hasn\'t had to.', lines: ['Evening. Hats off inside, please. Earl\'s rule.', 'Late set at nine. Full house by nine-oh-five.'] });
  const dq = P.at(-1.1, 0.4);
  put(d, '20:40', '22:45', spot(dq.x, dq.z, { yaw: P.yawOut, act: 'lean' }), { act: 'lean', label: 'Minding the door at the Blue Lantern' });
  const smokers = cast(3, '21:45', '22:30', { age: [21, 60] }, P.at(-3, 1.8).x, P.at(-3, 1.8).z);
  crowd(smokers, '21:45', '22:30', P.at(-3.4, 1.8).x, P.at(-3.4, 1.8).z, { spread: 1.1, acts: ['smoke_pipe', 'talk', 'laugh'], label: 'Stepping out of the Blue Lantern for a smoke' });
  scene('A line and a doorman outside the Blue Lantern', P.door.x, P.door.z, '20:40', '22:45', club.length + smokers.length + 1);
}
function signalLampNight() {
  const P = place('The Signal Lamp Tavern'); if (!P) return;
  const c = P.at(-2.2, 1.6);
  const regs = cast(3, '20:15', '20:50', { age: [25, 75], sex: 'M' }, c.x, c.z);
  crowd(regs, '20:15', '20:50', c.x, c.z, { spread: 1.1, acts: ['smoke_pipe', 'talk', 'laugh'], label: 'Out front of the Signal Lamp, arguing the Series', lines: ['Yankees in six. Stengel\'s a genius and I hate him.', 'Brooklyn, this year. This is the year. I can feel it.'] });
  const regs2 = cast(3, '21:40', '22:30', { age: [25, 75], sex: 'M' }, c.x, c.z);
  crowd(regs2, '21:40', '22:30', c.x, c.z, { spread: 1.1, acts: ['smoke_pipe', 'talk', 'laugh'], label: 'Out front of the Signal Lamp after the fireworks' });
  if (regs.length + regs2.length) scene('Regulars out front of the Signal Lamp Tavern', c.x, c.z, '20:15', '22:30', regs.length + regs2.length);
  // Frank Rourke walks Lonnie Tobey home. Says he's going that way.
  const frank = person('Frank', 'Rourke'), lon = person('Alonzo', 'Tobey'), H = place('Harbor Nets & Tackle');
  if (!frank || !lon || !H || !avail(frank, '21:40', '22:35') || !avail(lon, '21:30', '22:35')) return;
  const d = P.at(0.8, 0.8), f = P.at(1.8, 1.8), home = H.at(0, 0.8);
  const hs = spot(home.x, home.z, { yaw: H.yawIn, act: 'talk' }), hf = spot(H.at(1.2, 1.6).x, H.at(1.2, 1.6).z, { faceTo: [home.x, home.z], act: 'talk' });
  const walk = Math.ceil(pathLen(spot(d.x, d.z).node, hs.node) / 60) + 1;
  plan(lon, '21:32', T('21:55') + walk + 3, [{ t: '21:32', spot: spot(d.x, d.z, { yaw: P.yawOut, act: 'lean' }), act: 'lean', label: 'Leaning on the Signal Lamp doorframe, singing' }, { t: '21:55', spot: hs, act: 'talk', speed: 0.8, label: 'Being walked home by Officer Rourke' }], { say: ['♪ Oh, the Mary Ellen\'s gone to sea… ♪', 'Frank! Frankie Rourke! You going my way?'] });
  plan(frank, '21:48', T('21:55') + walk + 4, [{ t: '21:48', spot: spot(f.x, f.z, { faceTo: [d.x, d.z], act: 'talk' }), act: 'talk', label: 'Stopping by the Signal Lamp on his way home' }, { t: '21:55', spot: hf, act: 'talk', speed: 0.8, label: 'Walking Lonnie Tobey home — says he\'s going that way' }], { say: ['Evening, Lonnie. I\'m going that way.', 'Mind the curb. Mind the — there you go.'] });
  scene('Officer Rourke walks Lonnie Tobey home from the Signal Lamp', d.x, d.z, '21:48', T('21:55') + walk + 4, 2);
}
function dinerNightOwls() {
  const P = place('Harbor Light Diner'); if (!P) return;
  const c = P.at(-6.5, 1.8);
  const ppl = cast(5, '21:38', '22:30', { age: [18, 70] }, c.x, c.z);
  crowd(ppl, '21:38', '22:30', c.x, c.z, { spread: 1.6, acts: ['drink_stand', 'talk', 'laugh', 'drink_stand'], held: 'coffee_cup', label: 'Coffee outside the Harbor Light Diner after the fireworks', lines: ['Best fireworks since V-J Day.', 'Pie, Eleni. Whatever\'s left. All of it.'], stagger: 4 });
  const early = cast(4, '7:05', '8:05', { age: [20, 70], sex: 'M' }, c.x, c.z);
  crowd(early, '7:05', '8:05', c.x, c.z, { spread: 1.5, acts: ['drink_stand', 'talk', 'drink_stand'], held: 'coffee_cup', label: 'Coffee outside the Harbor Light Diner', lines: ['Boats came in heavy. Castellano\'s paying time and a half.'], stagger: 6 });
  if (ppl.length + early.length) scene('Coffee outside the Harbor Light Diner', c.x, c.z, '7:05', '22:30', ppl.length + early.length);
}

// ================================================================== the Spotter's Diary
function spotterDiary() {
  if (!L.spottable) return;
  // the runtime clock, for the items that come and go (kept by a tiny per-frame hook)
  let now = 0;
  L.every((rt) => { now = rt.minutes; });
  const far = -1000;
  if (G.grinder) L.spottable({ id: 'town_monkey', cat: 'Around town', what: "The organ grinder's monkey, collecting pennies", hint: "Wherever there's a crowd: Harlow's at half past nine, Playland after lunch", person: G.grinder, t0: '9:30', t1: '19:25', range: 20 });
  if (G.keough) L.spottable({ id: 'town_traffic_cop', cat: 'Townsfolk', what: 'A policeman in white gloves directing traffic', hint: 'Main & Market, at breakfast, lunch and half past four', person: G.keough, label: 'Directing traffic at Main & Market', range: 30 });
  if (G.washer) L.spottable({ id: 'town_window_washer', cat: 'Around town', what: 'A window washer, high on the Beacon Building', hint: 'Canal Street — look up, any time from nine till four', person: G.washer, label: 'Washing the windows of the Beacon Building', range: 45 });
  if (G.leroy) L.spottable({ id: 'town_shoeshine', cat: 'Townsfolk', what: 'A shoeshine boy at work', hint: 'Where the salesmen come off the trains', person: G.leroy, label: 'Shining shoes on the station forecourt', range: 16 });
  if (G.fender) L.spottable({ id: 'town_fender_bender', cat: 'Only at certain times', what: "A fender-bender, and a policeman's notebook", hint: 'Canal Street by the Luncheonette, about half past two', x: G.fender.x, y: 0.9, z: G.fender.z, r: 2.4, range: 30, t0: '14:30', t1: '15:15' });
  if (G.quartet && G.quartet.length) {
    const Q = G.quartet, on = () => Q.find((q) => now >= q.t0 && now < q.t1);
    L.spottable({ id: 'town_quartet', cat: 'Only at certain times', what: 'A barbershop quartet in straw boaters', hint: "Outside Freeman's Barber Shop: noon, four, and before seven",
      get x() { const q = on(); return q ? q.x : 0; }, get y() { return on() ? 1.6 : far; }, get z() { const q = on(); return q ? q.z : 0; }, r: 2.2, range: 25 });
  }
  if (G.castle) L.spottable({ id: 'town_sandcastle', cat: 'Down by the water', what: 'A sandcastle with a moat and a paper flag', hint: 'Juniper Beach, from late morning — follow the shrieks', x: G.castle.x, y: 0.1, z: G.castle.z, r: 1.2, range: 22, t0: G.castle.t0, t1: '21:30' });
  if (G.getaway) L.spottable({ id: 'town_getaway_car', cat: 'Only at certain times', what: 'A getaway car trailing tin cans', hint: "Church Street by St. Brigid's, after the wedding", x: G.getaway.x, y: 0.8, z: G.getaway.z, r: 2.0, range: 30, t0: '14:52', t1: '18:47' });
  if (G.kite) L.spottable({ id: 'town_kite', cat: 'Down by the water', what: 'A kite over Juniper Beach', hint: 'Afternoons, the south end of the beach — look up', x: G.kite.x, y: 13, z: G.kite.z, r: 3, range: 80, t0: '13:05', t1: '16:30' });
}
