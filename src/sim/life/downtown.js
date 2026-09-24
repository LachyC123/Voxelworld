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
    newsboys, trafficCop, rourkeBeat, meterMan, crossingGuard, organGrinder, peanutMan, balloonMan, pretzelMan, flowerCart,
    goodHumor, quartet, salvationArmy, scouts, lowellPortraits, boardwalkSnaps, signPainter, windowWasher,
    // shop-front life
    windowShoppers, toyWindow, sodaFountainTeens, hardwareBench, sidewalkSale, barberDoorway, bankLine, postOfficeLine,
    harlowsOpening, ballgameWindow, tobaccoShop, elksSteps, garageMechanic, bookCart, fishMarketLine,
    // happenings
    fenderBender, hatInTheWind, lostChild, streetPreacher, candidate, rialtoLines, newlyweds, whitcombTour, babyCigars,
    // transit stops
    transitStops,
    // the waterfront
    fishing, crabbing, netMenders, harborArtists, oldSalts, boatWatchers, gullFeeders, boatWorks, clamShack,
    // the beach and Playland
    sandcastles, waders, kiteFlyer, boardwalkCouples, hotDogQueue, lifeguardChair, beachPicnic, beachcomber,
    // evening
    eveningStroll, blueLanternNight, signalLampNight, dinerNightOwls,
    // last: cars parked along the curbs wherever nothing else claimed the space
    parkedCars,
  ];
  for (const f of parts) {
    try { f(); } catch (e) { console.error('downtown scene failed:', f.name, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e); }
  }
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
// minutes p needs to reach `s` from wherever they are at minute t
function lead(p, t, s) { const a = L.whereAt(p, t); return Math.min(25, Math.ceil(pathLen(a, s.node) / (p.speed * 60)) + 1); }

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
  const w = o.early ?? lead(p, t0, s);
  L.plan(p, t0 - w, t1, [{ t: t0 - w, spot: s, act: o.act || s.act, label: o.label, held: o.held, arms: o.arms, costume: o.costume, lines: o.lines }], { lines: o.say, song: o.song, costume: o.costume });
  return true;
}
// several entries [{t, spot, act, label, held, arms, costume, lines, speed, route}] from t0 to t1; the first leg starts early
function plan(p, t0, t1, entries, o = {}) {
  if (!p || !entries.length) return false;
  t0 = T(t0); t1 = T(t1);
  const e0 = entries[0], w = o.early ?? (e0.spot ? lead(p, T(e0.t), e0.spot) : 2);
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
function guest(t0, t1, want = {}, x = 200, z = -50) {
  t0 = T(t0); t1 = T(t1);
  const ok = (p) => (!want.sex || p.sex === want.sex) && (!want.age || (p.age >= want.age[0] && p.age <= want.age[1])) && (!want.outfit || p._outfit === want.outfit);
  for (const p of G.pool) {
    if (!ok(p)) continue;
    const s = origin(p._from); const w = s ? Math.ceil(Math.hypot(s.x - x, s.z - z) * 1.3 / (p.speed * 60)) + 3 : 10;
    if (L.free(p, t0 - w, t1 + w)) return p;
  }
  const r = L.rng, age = want.age ? r.int(want.age[0], want.age[1]) : undefined;
  const p = visitor({ sex: want.sex, age, outfit: want.outfit, look: want.look, from: want.from || nearestOrigin(x, z) });
  p._outfit = want.outfit || null;
  G.pool.push(p);
  return p;
}
// n people for a scene at (x, z) from t0 to t1: idle townsfolk first (filter/prefer), then visitors
function cast(n, t0, t1, want = {}, x = 200, z = -50) {
  t0 = T(t0); t1 = T(t1);
  const [a0, a1] = want.age || [16, 80];
  const f = (p) => p.age >= a0 && p.age <= a1 && (!want.sex || p.sex === want.sex) && (!want.filter || want.filter(p));
  const out = want.town === false ? [] : L.recruit(n, t0 - 10, t1, f, want.prefer || null);
  while (out.length < n && want.fill !== false) out.push(guest(t0, t1, want, x, z));
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
function parkedCars() {
  const r = L.rng.fork('parked');
  const aves = [54, 134, 214, 294], sts = [-210, -140, -70, 0, 70];
  const slots = [];
  // avenues: x ± 5, heading north on the east side, south on the west side
  for (const x of aves) for (let k = 0; k < sts.length - 1; k++) {
    if (x === 214 && sts[k] === -70) continue; // Founders Square
    for (let z = sts[k] + 13; z < sts[k + 1] - 12; z += 6.3) {
      if (x !== 54) slots.push({ x: x - 5, z, yaw: 0 });
      slots.push({ x: x + 5, z, yaw: Math.PI });
    }
  }
  // streets: z ± 5, heading east on the south side, west on the north side
  for (const z of sts) for (let k = 0; k < aves.length - 1; k++) for (let x = aves[k] + 13; x < aves[k + 1] - 12; x += 6.3) {
    slots.push({ x, z: z + 5, yaw: Math.PI / 2 });
    if (z !== 70) slots.push({ x, z: z - 5, yaw: -Math.PI / 2 });
  }
  const windows = [['7:40', '11:50'], ['8:30', '17:40'], ['9:10', '12:20'], ['10:05', '15:30'], ['11:40', '16:50'], ['12:30', '18:10'], ['13:15', '17:05'], ['16:40', '22:40'], ['18:20', '22:50'], ['6:00', '9:30'], ['14:20', '20:10']];
  let n = 0;
  for (const s of slots) {
    // keep hydrants, the station forecourt and our own curb business clear
    if (clutterNear(s.x, s.z, 3.0).some((q) => q.t === 'fire_hydrant' || /^(car_|truck_|bus_)/.test(q.t))) continue;
    if (s.z < -212 && s.x > 185 && s.x < 240) continue;
    if (!r.chance(0.46)) continue;
    const ws = [r.pick(windows)]; if (r.chance(0.35)) ws.push(r.pick(windows));
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
  scene('Cars parked along the downtown curbs', 200, -70, '6:00', '22:50', n);
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
  ["Mayhew's Pharmacy & Soda Fountain", 'Buddy', 'Keene', 'chalk', '8:30', 10, ['Lime rickey, ten cents. Tell Shirley Oakes. No — don\'t.'], 'town_chalkboard_soda'],
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
    ['Garrity Hardware', 'Tom', 'Garrity', 'town_hardware_display', '7:44', '18:00', 'Setting out the rakes and pails', ['Fall clean-up. Rakes a dollar and a quarter.'], 0.8],
    ['Pike & Daughter Books', 'Josephine', 'Pike', 'town_book_cart', '9:25', '17:30', 'Wheeling out the bargain book cart', ['Any book on the cart, ten cents. Even the good ones.'], 1.0],
  ];
  for (const [shop, first, last, type, at, until, lab, lines, out] of displays) {
    const P = place(shop), p = person(first, last);
    if (!P) continue;
    const q = frontSpot(P, [3.2, -3.2, 4.5, -4.5, 2.5, -2.5, 5.5, -5.5], out, 1.1, at, until);
    if (!q) continue;
    claim(q.x, q.z, 1.2, at, until);
    timed(type, q.x, q.z, P.yawOut, T(at) + 18, until);
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
  const crews = new Map();
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
        const s = haul(p, t0, t1, from, door, { held: 'crate_small', act: 'carry', label: cap.replace(/^The /, '').replace(/^\w/, (c) => c.toUpperCase()), lines });
        void s;
        const h = L.follow(p, 'town_hand_truck', { fwd: 0.75, when: 'spot', t0, t1 });
        void h;
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
