// Townsfolk routines: Saturday errands, the barber, the kitchen beauty parlor, visits, sidewalk
// chats, men on the corner, old men at the checkerboards, gangs of kids, teenagers at the soda
// fountain, families walking to the fair, confession at St. Brigid's, couples out after supper,
// and a filler that turns every long idle stretch at home into something with a purpose.
import { T, Trip, walkMin, isHard } from './routines_lib.js';
import { SHOPS, RUNS, HOME_WITH, PROJECTS, CHATS_F, CHATS_M, VISIT_TALK, PORCH_TALK, OLD_MEN, CONFESS } from './routines_data.js';
import { SURNAME_HERITAGE, HERITAGE } from '../lines.js';

// ------------------------------------------------------------------ people helpers
const TITLED = /^(Mrs|Miss|Mr|Dr|Father|Reverend|Captain|Sergeant|Officer|Nurse|Mayor|Madame)\.?$/;
export function honor(p) {
  if (p.nick && p.age < 25) return p.nick;
  if (p.age < 18) return p.first;
  if (p.title && TITLED.test(p.title)) return `${p.title} ${p.last}`;
  if (p.sex === 'M') return `Mr. ${p.last}`;
  return `${spouseOf(p) || p.age >= 30 ? 'Mrs.' : 'Miss'} ${p.last}`;
}
export function spouseOf(p) {
  const h = p.household; if (!h || p.age < 18) return null;
  return h.members.find((m) => m !== p && m.age >= 18 && m.sex !== p.sex && Math.abs(m.age - p.age) <= 15) || null;
}
const kidsOf = (p) => (p.household ? p.household.members.filter((m) => m.age < 18 && m.age <= p.age - 16) : []);
const catholic = (p) => { const k = SURNAME_HERITAGE[p.last]; return !!(k && HERITAGE[k] && HERITAGE[k].church === "St. Brigid's"); };
export const names = (list) => (list.length <= 1 ? (list[0] || '') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]);
const short = (n) => n.replace(/ (Street|Avenue)$/, '');
const inWin = (t, a, b) => t >= T(a) && t <= T(b);

// ------------------------------------------------------------------ setup
export function setupTown(W) {
  const L = W.L;
  W.orig = new Map(L.ctx.people.list.map((p) => [p, p.schedule.slice().sort((a, b) => a.t - b.t)]));
  W.fair = L.tagged('fair').filter((s) => !s.room);
  W.fairKids = L.tagged('fair_kids').filter((s) => !s.room);
  W.parkPlay = L.tagged('play').filter((s) => !s.room && s.building && s.building.name === 'Juniper Park');
  W.parkBench = L.places.benches.filter((s) => s.building && s.building.name === 'Juniper Park');
  W.checkers = W.parkBench.filter((s) => s.act === 'chess');
  W.waterBench = L.places.benches.filter((s) => s.building && /Waterfront|Beach/.test(s.building.name));
  W.beachPlay = L.tagged('play').filter((s) => !s.room && s.building && /Beach|Playland/.test(s.building.name));
  // the quay: looking out over the harbour (the fireworks spots are empty all day)
  W.quay = L.tagged('fireworks').filter((s) => s.building && /Waterfront/.test(s.building.name));
  W.homes = L.places.homes;
  W.soda = W.spotsIn("Mayhew's Pharmacy & Soda Fountain", 'soda');
  const sq = L.ctx.buildings.find((b) => b.kind === 'square');
  W.squareRect = sq && sq.rect ? sq.rect : { x0: 144, z0: -60, x1: 244, z1: -10 };
  // homes by surname (relatives) and by distance (neighbours)
  W.byLast = new Map();
  for (const P of W.homes) for (const m of P.members) { if (!W.byLast.has(m.last)) W.byLast.set(m.last, []); const a = W.byLast.get(m.last); if (!a.includes(P)) a.push(P); }
  const near = new Map();
  W.nearHomes = (P) => {
    if (!near.has(P)) near.set(P, W.homes.filter((Q) => Math.hypot(Q.door.x - P.door.x, Q.door.z - P.door.z) < 190).sort((a, b) => Math.hypot(a.door.x - P.door.x, a.door.z - P.door.z) - Math.hypot(b.door.x - P.door.x, b.door.z - P.door.z)).slice(0, 14));
    return near.get(P);
  };
  // "the Pruitts'" or "Mrs. Hatch's"
  W.theirs = (h) => (h.household && h.household.members.length > 1 ? `the ${/(s|x|z|ch|sh)$/.test(h.last) ? h.last + 'es' : h.last + 's'}'` : `${honor(h)}'s`);
}

// a spread spot looking over the harbour near z
function quaySpot(W, z, key = '') {
  if (!W.quay.length) return null;
  const q = W.quay.slice().sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[W.rng.int(0, 2)];
  return W.outSpot(q.x + 1.2, q.z, { yaw: -Math.PI / 2, act: 'look', spread: 1.1, faceTo: [q.x - 30, q.z] }, 'quay' + key);
}
// a gathering point at the edge of Founders Square nearest (x, z)
function squareEdge(W, x, z) {
  const r = W.squareRect;
  const cx = Math.max(r.x0 + 2, Math.min(r.x1 - 2, x)), cz = z < (r.z0 + r.z1) / 2 ? r.z0 + 1.5 : r.z1 - 1.5;
  const sx = Math.round((cx - r.x0) / 25) * 25 + r.x0;
  return W.outSpot(Math.min(r.x1 - 2, Math.max(r.x0 + 2, sx)), cz, { yaw: 0, act: 'look', spread: 1.2, faceTo: [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2] }, 'sqedge');
}

// what p does at home between outings: whatever they were doing there, or a quiet sit
const RESTS_F = [['knit', 'Knitting in the parlor'], ['read', 'Reading the Courier'], ['sew', 'Mending by the window'], ['doze', 'Putting her feet up']];
const RESTS_M = [['read', 'Reading the paper'], ['doze', 'Dozing in his chair'], ['listen_sit', 'Listening to the ball game on the radio']];
const RESTS_K = [['read_book', 'Reading a Superman comic'], ['read_book', 'Reading the funny papers'], ['sit', 'Waiting to be allowed out again'], ['listen_sit', 'Listening to the Lone Ranger on the radio']];
const RESTS_T = [['read_book', 'Reading a movie magazine'], ['listen_sit', 'Listening to records'], ['read_book', 'Reading Seventeen'], ['sit', 'On the telephone, officially doing homework']];
function rest(W, p, t) {
  const o = W.orig.get(p) || []; let cur = null;
  for (const e of o) { if (e.t <= t) cur = e; else break; }
  const P = W.home(p);
  if (cur && !isHard(cur) && cur.spot && P && cur.spot.building === P.building && !/^(Breakfast|Lunch|Supper|Cooking|Making|Getting|Asleep)/.test(cur.label || '') && !cur.route) return { spot: cur.spot, act: cur.act, label: cur.label || 'At home' };
  const s = W.homeSpot(p); if (!s) return null;
  const [act, label] = W.rng.pick(p.age < 13 ? RESTS_K : p.age < 18 ? RESTS_T : p.sex === 'F' ? RESTS_F : RESTS_M);
  return { spot: s, act, label };
}

// ------------------------------------------------------------------ errands
// a string of 1–4 shop stops for one person, continuing `trip`, then home with the parcels.
// Returns false if nothing fitted before `end`.
function errands(W, p, trip, end, keys, o = {}) {
  const rng = W.rng, home = W.homeSpot(p);
  const want = o.n ?? rng.int(2, 4);
  let carried = o.carried !== undefined ? o.carried : (p.sex === 'F' && p.age >= 18 && rng.chance(0.75) ? 'handbag' : null);
  let arms = null, food = false, project = false, stops = 0, lastShop = null;
  const seen = new Set();
  for (const key of rng.shuffle(keys.slice())) {
    if (stops >= want) break;
    if (seen.has(key)) continue;
    seen.add(key);
    const S = SHOPS[key]; if (!S) continue;
    if (S.who !== 'A' && S.who !== p.sex && p.age >= 18) continue;
    if (trip.t < S.open[0] || trip.t + 25 > S.open[1]) continue;
    const spots = W.spotsIn(S.n, ...S.tags); if (!spots.length) continue;
    // a quick Saturday purchase: 4 to 12 minutes
    const dwell = rng.int(Math.max(4, S.d[0] - 3), Math.max(6, S.d[1] - 5));
    const inner = spots.filter((s) => !s.tags.includes('customer'));
    const counter = spots.filter((s) => s.tags.includes('customer'));
    const eta = trip.t + walkMin(trip.pos, spots[0], trip.speed);
    const s1 = W.pickFree(inner.length ? inner : spots, eta, eta + dwell, rng);
    if (!trip.fits(s1, dwell + 3, home, end - 8)) continue;
    const held = (S.pre && (!carried || carried === 'handbag')) ? S.pre : carried;
    const label = rng.pick(S.L);
    const last = { label, held, arms: held === carried ? arms : null, lines: S.say };
    // between shops downtown: out onto the sidewalk and along the block, looking in the windows
    if (lastShop && rng.chance(0.55)) windowShop(W, trip, W.place(lastShop.n), s1, { held: carried, arms });
    if (counter.length && inner.length && dwell > 7) {
      trip.to(s1, dwell - 2, last);
      const c = W.pickFree(counter, trip.t, trip.t + 2, rng);
      trip.to(c, 2, { ...last, act: c.act === 'sit' ? 'sit' : 'talk' });
    } else trip.to(s1, dwell, last);
    if (S.got) { carried = S.got; arms = S.carry ? 'carry' : null; }
    if (S.food) food = true;
    if (S.project) project = true;
    lastShop = S; stops++;
  }
  // the long way home: along the shop fronts, or down by the water
  if (stops && lastShop && rng.chance(0.4) && home) windowShop(W, trip, W.place(lastShop.n), home, { held: food ? 'grocery_bag' : carried, arms, label: rng.pick(['Taking the long way home', 'Window-shopping on the way home']) });
  if (!stops) return false;
  // home
  const k = food ? 'grocery_bag' : carried && HOME_WITH[carried] ? carried : 'none';
  if (food) { carried = 'grocery_bag'; arms = null; }
  const kitchen = food ? W.kitchenSpot(p) : null;
  if (kitchen) trip.to(kitchen, rng.int(4, 8), { label: rng.pick(HOME_WITH[k]), held: carried, arms, act: 'shelve' });
  else if (home) trip.to(home, 2, { label: rng.pick(HOME_WITH[k]), held: carried, arms });
  // a Saturday project with what came home from Garrity's
  const P = W.home(p);
  if (project && P && P.kind === 'house' && p.sex === 'M' && trip.t + 30 < end - 10 && o.project !== false) {
    const [label, act, held] = rng.pick(PROJECTS);
    const s = W.doorstep(P);
    const dur = Math.min(rng.int(18, 40), end - 10 - trip.t);
    const t0 = trip.t;
    trip.to(s, dur, { label, act, held, arms: null, lines: ['Hold the door, would you? No — the other side.', 'Twenty minutes, I said. That was an hour ago.', 'The old hinge was put on by my father. With nails.'] });
    if (act === 'hammer' || act === 'hammer_kneel') W.L.sound(s.x, 1, s.z, t0 + 1, t0 + dur, 'hammer', { range: 30, vol: 0.45 });
    if (home) trip.to(home, 1, { label: 'Admiring his handiwork', held: null });
    W.tally('Saturday projects');
  }
  W.tally('Shopping runs'); W.tally('Shop stops', stops);
  void lastShop;
  return true;
}

// out of a shop onto the sidewalk, then along the block toward the next stop looking in the windows
function windowShop(W, trip, P, toward, o = {}) {
  const g = P && W.gather(P);
  if (!g || !toward) return false;
  const d = Math.abs(g.x - toward.x) + Math.abs(g.z - toward.z);
  if (d < 40) return false;
  if (trip.t + walkMin(trip.pos, g, trip.speed) + d / (trip.speed * 0.8 * 60) * 1.5 > 1439) return false;
  trip.to(g, 0.9, { label: 'Stepping out onto the sidewalk', act: 'look', held: o.held, arms: null });
  const r = W.route(g, d * 1.5 + 40, { to: toward, within: 16, jitter: 3 });
  if (!r) return false;
  const downtown = g.x > 100 && g.x < 330 && g.z > -230 && g.z < 40;
  return trip.stroll(r, { label: o.label || (downtown ? W.rng.pick(['Window-shopping along the way', 'Looking in the shop windows', 'Stopping at every window on the block']) : 'Walking the long way round'), held: o.held, arms: o.arms });
}

// ------------------------------------------------------------------ single-person outings (the filler's menu)
function outErrands(W, p, t, end, from) {
  const pm = t >= T('12:30');
  const list = p.age < 18 ? RUNS.T : p.sex === 'F' ? (pm ? RUNS.F_pm : RUNS.F_am) : (pm ? RUNS.M_pm : RUNS.M_am);
  const trip = new Trip(W, [p], t, { from, speed: p.speed * (p.age >= 66 ? 0.7 : 0.8) });
  const keys = list.slice();
  // Saturday morning: the loaves, the barber, the paper
  if (!pm && t < T('10:30') && W.rng.chance(0.65)) keys.unshift('bakery');
  // walking downtown the long way, past the Centennial bunting
  const P0 = W.home(p);
  if (P0 && W.rng.chance(0.45) && W.homeSpot(p)) {
    const g = W.gather(P0);
    const d = Math.abs(g.x - 214) + Math.abs(g.z + 60);
    if (d > 120) { trip.to(g, 0.3, { label: 'Setting out for downtown', held: p.sex === 'F' ? 'handbag' : null }); const r = W.route(g, d * 0.9, { to: { x: 214, z: -60 }, within: 60, jitter: 4 }); if (r) trip.stroll(r, { label: pm ? 'Walking downtown' : 'Walking downtown for the Saturday shopping', held: p.sex === 'F' ? 'handbag' : null }); }
  }
  if (p.sex === 'M' && !pm && W.rng.chance(0.45) && barber(W, p, trip, end)) { errands(W, p, trip, end, keys, { n: W.rng.int(0, 2) }) || homeAfter(W, p, trip, 'Home with a fresh haircut'); return trip; }
  return errands(W, p, trip, end, keys) ? trip : null;
}
function homeAfter(W, p, trip, label) { const h = W.homeSpot(p); if (h) trip.to(h, 2, { label, held: null, arms: null }); }

// Freeman's on a Saturday morning: a wait on the bench, then the chair
function barber(W, p, trip, end) {
  const chairs = W.spotsIn("Freeman's Barber Shop", 'customer'), bench = W.spotsIn("Freeman's Barber Shop", 'browse');
  if (!chairs.length || !bench.length || trip.t < T('8:00') || trip.t > T('16:30')) return false;
  const eta = trip.t + walkMin(trip.pos, chairs[0], trip.speed);
  const wait = W.rng.int(6, 22), cut = W.rng.int(12, 16);
  const chair = chairs.find((c) => W.isFree(c, eta + wait, eta + wait + cut));
  if (!chair || !trip.fits(chair, wait + cut, W.homeSpot(p), end - 5)) return false;
  const b = W.pickFree(bench, eta, eta + wait);
  trip.to(b, wait, { label: "Waiting his turn at Freeman's", lines: ['Who\'s next? Not me — I\'m reading.', 'Sox lost again. Put it in the capsule so 2053 knows.', 'Marcus, you\'ve had that Look magazine since Truman.'] });
  trip.to(chair, cut, { label: p.age < 18 ? "Getting a crew cut at Freeman's" : "Getting a Saturday haircut at Freeman's", act: 'sit', lines: ['Just a trim. Leave me something to comb.', 'Not too short. My wife says I look like a convict.'] });
  W.tally('Haircuts');
  return true;
}

function outFair(W, p, t, end, from) {
  if (t < T('10:00') || t > T('18:10')) return null;
  const rng = W.rng, home = W.homeSpot(p);
  const trip = new Trip(W, [p], t, { from, speed: p.speed * 0.8 });
  const dwell = rng.int(18, 38);
  const eta = t + trip.eta(W.fair[0] || home);
  const s = W.pickFree(W.fair, eta, eta + dwell, rng);
  if (!s || !trip.fits(s, dwell, home, end - 5)) return null;
  const held = p.sex === 'F' ? rng.pick(['handbag', 'handbag', 'popcorn_box', null]) : rng.pick([null, null, 'popcorn_box', 'hot_dog', 'flag_small']);
  trip.to(s, dwell, { label: rng.pick(['Taking in the Harbor Days fair', 'Looking over the pies at the fair', 'Trying the ring toss at the fair', 'Seeing who\'s at the fair']), act: rng.pick(['browse', 'look', 'talk', 'drink_stand', 'laugh']), held });
  if (rng.chance(0.4) && trip.fits(W.fair[0], 8, home, end - 5)) {
    const s2 = W.pickFree(W.fair, trip.t, trip.t + 12, rng);
    trip.to(s2, rng.int(8, 15), { label: rng.pick(['Watching the ring toss', 'Buying a raffle ticket for the Centennial quilt', 'Admiring the prize pies']), act: rng.pick(['look', 'browse', 'clap']), held });
  }
  // home by way of Market Street
  if (rng.chance(0.5)) windowShop(W, trip, W.place("Harlow's"), home, { label: 'Walking home along Market Street', held });
  homeAfter(W, p, trip, 'Walking home from the fair');
  W.tally('Fair visits');
  return trip;
}

function outHarbour(W, p, t, end, from) {
  const rng = W.rng, home = W.homeSpot(p), P = W.home(p);
  const trip = new Trip(W, [p], t, { from, speed: p.speed * (p.age >= 66 ? 0.7 : 0.8) });
  const q = quaySpot(W, P ? P.door.z : 0, 'h');
  if (!q) return null;
  const dwell = rng.int(7, 15);
  if (!trip.fits(q, dwell + 8, home, end - 5)) return null;
  const late = t >= T('18:30');
  trip.to(q, dwell, { label: late ? 'Watching the lights come on across the harbor' : rng.pick(['Walking down to look at the boats', 'Watching the boats in the harbor', 'Down at the harbor for some sea air']), act: rng.pick(['look', 'look', 'smoke_pipe', 'lean']), held: p.age > 70 ? 'cane' : null });
  // along the quay a way before heading home
  const r = W.route(q, rng.int(160, 340), { to: { x: q.x, z: q.z + (rng.chance(0.5) ? 300 : -300) } });
  if (r && trip.stroll(r, { label: late ? 'An evening walk along the quay' : 'Strolling along the quay', held: p.age > 70 ? 'cane' : null })) { /* walked */ }
  homeAfter(W, p, trip, 'Walking home from the harbor');
  if (trip.t > end - 3) return null;
  W.tally('Harbor walks');
  return trip;
}

function outStroll(W, p, t, end, from, label = null) {
  const rng = W.rng, home = W.homeSpot(p), P = W.home(p);
  if (!P || !home) return null;
  const g = W.gather(P);
  const trip = new Trip(W, [p], t, { from, speed: p.speed * (p.age > 65 ? 0.72 : 0.82) });
  trip.to(g, 0.6, { label: 'Stepping out', held: p.age > 68 ? 'cane' : null });
  const mins = Math.min(end - trip.t - 12, rng.int(20, 45));
  if (mins < 10) return null;
  const metres = mins * trip.speed * 0.8 * 60 * 0.8;
  const targets = [{ x: 200, z: -35 }, { x: 50, z: P.door.z }, { x: 175, z: 105 }, { x: P.door.x + (rng.chance(0.5) ? 250 : -250), z: P.door.z + (rng.chance(0.5) ? 150 : -150) }];
  const r = W.route(g, metres, rng.chance(0.6) ? { to: rng.pick(targets), jitter: 6 } : {});
  const lab = label || (t > T('18:30') ? 'An evening walk' : t < T('14:00') && t > T('12:30') ? 'Walking off lunch' : rng.pick(['Out for a Saturday walk', 'A turn around the block', 'Taking the long way round to see the bunting', 'Out for some fresh air']));
  if (!r || !trip.stroll(r, { label: lab, held: p.age > 68 ? 'cane' : p.sex === 'F' && rng.chance(0.4) ? 'handbag' : null })) return null;
  homeAfter(W, p, trip, 'Walking home');
  if (trip.t > end - 3) return null;
  W.tally('Walks');
  return trip;
}

function outPark(W, p, t, end, from) {
  const rng = W.rng, home = W.homeSpot(p);
  const pool = (rng.chance(0.6) ? W.parkBench : W.waterBench).filter((s) => s.act !== 'chess');
  if (!pool.length || !home) return null;
  const old = p.age >= 66;
  const trip = new Trip(W, [p], t, { from, speed: p.speed * (old ? 0.68 : 0.8) });
  const dwell = rng.int(18, 40);
  const eta = t + trip.eta(pool[0]);
  const b = W.pickFree(pool, eta, eta + dwell, rng);
  if (!trip.fits(b, dwell, home, end - 5)) return null;
  const inPark = b.building && b.building.name === 'Juniper Park';
  trip.to(b, dwell, { label: inPark ? 'Sitting in Juniper Park' : 'On a bench by the water', act: rng.pick([b.act, 'feed_birds', 'read', 'doze', 'sit']), held: old ? 'cane' : null });
  homeAfter(W, p, trip, inPark ? 'Walking home from the park' : 'Walking home from the water');
  W.tally('Bench sits');
  return trip;
}

function outChurch(W, p, t, end, from) {
  if (!catholic(p) || p.age < 40) return null;
  const pews = W.spotsIn("St. Brigid's Church", 'pew'); const home = W.homeSpot(p);
  if (!pews.length || !home) return null;
  if (inWin(t, '13:15', '15:15')) return null; // the wedding
  const trip = new Trip(W, [p], t, { from, speed: p.speed * 0.85 });
  const dwell = W.rng.int(10, 20);
  const eta = t + trip.eta(pews[0]);
  const s = W.pickFree(pews, eta, eta + dwell);
  if (!trip.fits(s, dwell, home, end - 5)) return null;
  trip.to(s, dwell, { label: "Lighting a candle at St. Brigid's", act: 'pray_sit', held: null });
  homeAfter(W, p, trip, "Walking home from St. Brigid's");
  W.tally('Candles lit');
  return trip;
}

function outPorch(W, p, t, end) {
  const P = W.home(p);
  const porch = p.home && p.home.porch && p.home.porch[0];
  if (!porch || !P || end - t < 30) return null;
  const trip = new Trip(W, [p], t, { from: W.homeSpot(p) });
  const dwell = Math.min(end - t - 5, W.rng.int(25, 60));
  trip.to(porch, dwell, { label: t > T('18:30') ? 'Sitting out on the porch after supper' : 'Sitting out on the porch', act: W.rng.pick([porch.act || 'sit', 'read', 'sit', 'knit']), book: false });
  homeAfter(W, p, trip, 'Going back inside');
  return trip;
}

// after supper: down to the square to see the lights and the band, and watch the dancing from the curb
function outSquare(W, p, t, end, from) {
  if (t < T('18:40') || t > T('21:10')) return null;
  const rng = W.rng, home = W.homeSpot(p), P = W.home(p);
  if (!home || !P) return null;
  const trip = new Trip(W, [p], t, { from, speed: p.speed * (p.age >= 66 ? 0.68 : 0.8) });
  const s = squareEdge(W, P.door.x + rng.int(-60, 60), P.door.z);
  const dwell = rng.int(15, 30);
  if (!trip.fits(s, dwell, home, end - 4)) return null;
  const dance = t + trip.eta(s) > T('19:58');
  trip.to(s, dwell, { label: dance ? 'Watching the street dance from the curb' : 'Down on the square to see the Centennial lights', act: dance ? rng.pick(['look', 'clap', 'laugh']) : rng.pick(['look', 'talk']), held: p.sex === 'F' ? 'handbag' : null });
  windowShop(W, trip, W.place("Harlow's"), home, { label: 'Walking home under the string lights' }) ;
  homeAfter(W, p, trip, 'Walking home from the square');
  if (trip.t > end - 2) return null;
  W.tally('Evenings on the square');
  return trip;
}

// ------------------------------------------------------------------ kids on their own
// sent to the shop with a note and a dime, off to the park, round to a friend's yard, down to the boats
function kidErrand(W, p, t, end, from) {
  const rng = W.rng, home = W.homeSpot(p);
  const key = rng.pick(['bakery', 'grocer', 'drugstore', 'candy', 'bakery', 'grocer']);
  const S = SHOPS[key], sp = W.spotsIn(S.n, 'browse', 'customer');
  if (!sp.length || !home || t < S.open[0] || t > S.open[1] - 20) return null;
  const trip = new Trip(W, [p], t, { from, speed: p.speed * 0.85 });
  const dwell = rng.int(4, 8);
  const s = W.pickFree(sp, t + 3, t + 3 + dwell, rng);
  if (!trip.fits(s, dwell, home, end - 3)) return null;
  const mom = p.household && p.household.members.find((m) => m.sex === 'F' && m.age >= p.age + 16);
  const what = key === 'candy' ? 'Spending his allowance at the Sweet Shoppe' : key === 'bakery' ? `Running to Halloran's for a Centennial loaf for ${mom ? 'Mother' : 'Grandma'}` : key === 'grocer' ? `Running to Kowalski's with a list from ${mom ? 'Mother' : 'Grandma'}` : `Picking up a prescription at Mayhew's for ${mom ? 'Mother' : 'Grandma'}`;
  trip.to(s, dwell, { label: p.sex === 'F' ? what.replace('his', 'her') : what, held: key === 'candy' ? null : 'letter', lines: ['Mother says a loaf of the Centennial bread and don\'t squeeze it.', 'I have a dime and a note. The note says don\'t lose the dime.'] });
  homeAfter(W, p, trip, key === 'candy' ? 'Walking home with a mouthful of root-beer barrels' : 'Hurrying home with the shopping');
  if (key !== 'candy') trip.E[0][trip.E[0].length - 1].held = 'grocery_bag';
  W.tally('Kids sent on errands');
  return trip;
}
function kidOut(W, p, t, end, from) {
  const rng = W.rng, home = W.homeSpot(p), P = W.home(p);
  if (!home || !P) return null;
  const trip = new Trip(W, [p], t, { from, speed: p.speed * 0.85 });
  const kind = rng.pick(p.age >= 9 ? ['park', 'friend', 'quay', 'park'] : ['park', 'friend', 'friend']);
  let s = null, label = '', act = 'play';
  if (kind === 'park' && W.parkPlay.length) { s = W.pickFree(W.parkPlay, t + 5, t + 30, rng); label = 'Off to play in Juniper Park'; act = s ? s.act : 'play'; }
  else if (kind === 'quay') { s = quaySpot(W, P.door.z, 'kid'); label = 'Down at the harbor looking at the boats'; act = 'look'; }
  else {
    const Q = W.nearHomes(P).find((q) => q !== P && q.yard && q.yard.length && q.members.some((m) => m.age < 13));
    if (Q) { s = Q.yard[0]; const f = Q.members.find((m) => m.age < 13); label = `Playing in ${W.theirs(f)} yard`; act = rng.pick(['play', 'play_ball', 'jump_rope']); }
  }
  if (!s) return null;
  const dwell = rng.int(15, 30);
  if (!trip.fits(s, dwell, home, end - 3)) return null;
  trip.to(s, dwell, { label, act, held: rng.chance(0.3) ? 'ball' : null, book: kind !== 'friend' });
  homeAfter(W, p, trip, 'Running home');
  W.tally('Kids out on their own');
  return trip;
}
export function kidFiller(W) {
  const L = W.L, rng = W.rng;
  const kids = rng.shuffle(L.ctx.people.list.filter((p) => p.age >= 6 && p.age <= 12 && !p.commuter && !p.visitor && p.home));
  let n = 0;
  for (const p of kids) {
    for (const [a, b] of W.windows(p, '8:40', '17:50', 35)) {
      const a0 = W.settle(p, a);
      const entries = []; let t = a0 + rng.int(0, 15), pos = W.posAt(p, a), k = 0;
      if (t > a0) { const r = rest(W, p, a0); if (r) { entries.push({ t: a0, ...r }); t += walkMin(pos, r.spot, p.speed); pos = { x: r.spot.x, z: r.spot.z, spot: r.spot }; } }
      while (b - t >= 30 && k < 3) {
        const f = rng.chance(0.35) ? kidErrand : kidOut;
        const trip = f(W, p, t, b, pos) || (f === kidErrand ? kidOut : kidErrand)(W, p, t, b, pos);
        if (!trip) break;
        entries.push(...trip.E[0]); t = trip.t; k++;
        const r = rest(W, p, t); if (r) { entries.push({ t, ...r }); pos = { x: r.spot.x, z: r.spot.z, spot: r.spot }; }
        t += rng.int(8, 25);
      }
      if (!k || !L.idle(p, a, b)) continue;
      W.plan(p, a, b, entries.filter((e) => e.t >= a && e.t < b - 0.5)); n++;
    }
  }
  L.scene('Kids out on their own', 250, 150, '8:40', '17:50', n);
}

// visit a neighbour (or a relative) who's home: knock, then coffee in the parlour or a chat on the porch
function outVisit(W, p, t, end, from) {
  const rng = W.rng, L = W.L, P0 = W.home(p), home = W.homeSpot(p);
  if (!P0 || !home || p.age < 18) return null;
  const evening = t >= T('18:30');
  const rel = p.last && W.byLast.get(p.last) ? W.byLast.get(p.last).filter((P) => P !== P0) : [];
  const near = W.nearHomes(P0).filter((P) => P !== P0);
  const cands = rng.chance(0.4) && rel.length ? rng.shuffle(rel.slice()) : near.slice(0, 10);
  for (const P of cands) {
    const trip = new Trip(W, [p], t, { from, speed: p.speed * 0.9 });
    const knock = W.doorstep(P);
    const tK = t + trip.eta(knock);
    const dur = rng.int(evening ? 15 : 20, evening ? 35 : 45);
    if (tK + dur + walkMin(knock, home, trip.speed) + 6 > end) continue;
    const host = P.members.find((h) => h !== p && h.age >= 18 && W.free(h, tK + 1, tK + dur + 2) && W.atHome(h, tK + 1));
    if (!host) continue;
    const hh = host.home || {};
    const porch = hh.porch && hh.porch[0];
    const lounge = (hh.lounge || []).filter((s) => s !== host.lounge);
    const usePorch = porch && (evening || rng.chance(0.4));
    const hostSeat = usePorch ? porch : host.lounge || lounge[0];
    const guestSeat = usePorch ? W.outSpot(porch.x + P.u[0] * 1.3, porch.z + P.u[1] * 1.3, { faceTo: [porch.x, porch.z], act: 'talk', yTop: porch.y + 1 }, 'porchguest') : lounge.find((s) => s !== hostSeat) || null;
    if (!hostSeat || !guestSeat) continue;
    const related = host.last === p.last;
    const who = related ? (host.sex === 'F' ? `her cousin ${honor(host)}` : `his cousin ${honor(host)}`) : honor(host);
    const coffee = !usePorch && rng.chance(0.7);
    trip.to(knock, 1.2, { label: `Knocking at ${W.theirs(host)} door`, act: 'wait', held: evening ? null : rng.pick(['pie', 'handbag', null, null]) });
    trip.to(guestSeat, dur, { label: usePorch ? `Visiting with ${who} on the porch` : coffee ? `Having coffee with ${who}` : `Visiting ${who}`, act: usePorch ? 'talk' : coffee ? 'drink' : 'talk_sit', held: null });
    homeAfter(W, p, trip, `Walking home from ${W.theirs(host)}`);
    W.plan(host, tK + 1, tK + dur + 2, [{ t: tK + 1, spot: hostSeat, act: usePorch ? 'talk_sit' : coffee ? 'drink' : 'talk_sit', label: usePorch ? `Visiting on the porch with ${honor(p)}` : coffee ? `Having coffee with ${honor(p)}` : `Visiting with ${honor(p)}` }]);
    W.touched.add(host);
    L.convo([host, p], tK + 1, tK + dur, rng.pick(evening ? PORCH_TALK : VISIT_TALK));
    W.tally(related ? 'Visits to relatives' : 'Visits to neighbours');
    return trip;
  }
  return null;
}

// ------------------------------------------------------------------ the filler
const MENU = {
  F_am: [[outErrands, 8], [outVisit, 2], [outFair, 2], [outStroll, 3], [outChurch, 1], [outHarbour, 2]],
  F_pm: [[outFair, 4], [outVisit, 2], [outErrands, 2], [outStroll, 3], [outHarbour, 2], [outPark, 1], [outChurch, 1]],
  M_am: [[outErrands, 7], [outHarbour, 3], [outFair, 2], [outStroll, 3], [outVisit, 1]],
  M_pm: [[outFair, 4], [outHarbour, 3], [outErrands, 2], [outStroll, 3], [outPark, 1], [outVisit, 1]],
  O_am: [[outPark, 3], [outErrands, 3], [outStroll, 3], [outChurch, 2], [outVisit, 2], [outHarbour, 2]],
  O_pm: [[outPark, 3], [outFair, 2], [outVisit, 2], [outStroll, 3], [outPorch, 1], [outHarbour, 2]],
  T: [[outErrands, 3], [outFair, 3], [outHarbour, 2], [outStroll, 3]],
  EVE: [[outStroll, 5], [outHarbour, 4], [outSquare, 3], [outVisit, 2], [outPorch, 2], [outFair, 1]],
};
function menuFor(p, t) {
  if (t >= T('18:15')) return MENU.EVE;
  const pm = t >= T('12:30');
  if (p.age < 18) return MENU.T;
  if (p.age >= 66) return pm ? MENU.O_pm : MENU.O_am;
  return p.sex === 'F' ? (pm ? MENU.F_pm : MENU.F_am) : (pm ? MENU.M_pm : MENU.M_am);
}
function order(rng, menu) {
  const pool = menu.map(([f, w]) => [f, w * (0.5 + rng.next())]);
  pool.sort((a, b) => b[1] - a[1]);
  return pool.map((x) => x[0]);
}

// fill one free window of p's day with outings, resting at home in between
export function fillWindow(W, p, a, b) {
  const rng = W.rng, L = W.L;
  const home = W.homeSpot(p);
  if (!home || !W.home(p)) return false;
  const entries = [];
  const a0 = W.settle(p, a);
  let t = a0, pos = W.posAt(p, a), outings = 0;
  if (b - a0 < 25) return false;
  // the first outing doesn't always leave the minute the window opens: wait at home first
  if (b - a0 > 60 && rng.chance(0.4)) {
    const r = rest(W, p, a0);
    if (r) { entries.push({ t: a0, ...r }); t = a0 + walkMin(pos, r.spot, p.speed) + rng.int(5, Math.min(25, Math.floor((b - a0) * 0.25))); pos = { x: r.spot.x, z: r.spot.z, spot: r.spot }; }
  }
  while (b - t >= 28 && outings < 4) {
    const menu = menuFor(p, t);
    let trip = null;
    for (const f of order(rng, menu)) { trip = f(W, p, t, b, pos); if (trip) break; }
    if (!trip) break;
    entries.push(...trip.E[0]);
    t = trip.t; outings++;
    const r = rest(W, p, t);
    if (r) { entries.push({ t, ...r }); pos = { x: r.spot.x, z: r.spot.z, spot: r.spot }; } else pos = { x: home.x, z: home.z, spot: home };
    t += rng.int(6, 22) + (t > T('18:30') ? 10 : 0);
  }
  if (!outings) return false;
  if (!L.idle(p, a, b)) return false;
  W.plan(p, a, b, entries.filter((e) => e.t >= a && e.t < b - 0.5));
  W.touched.add(p);
  return true;
}

export function filler(W) {
  const L = W.L, rng = W.rng;
  const people = rng.shuffle(L.ctx.people.list.filter((p) => !p.commuter && !p.visitor && p.age >= 13 && p.home));
  let n = 0;
  for (const p of people) {
    for (const [a, b] of W.windows(p, '7:15', '21:40', 30)) {
      // the evening: not everybody goes out again
      if (a >= T('18:15') && !rng.chance(0.85)) continue;
      if (fillWindow(W, p, a, b)) n++;
    }
  }
  L.scene('Errands, strolls and visits (filler)', 200, 0, '7:15', '21:40', n);
}

// ------------------------------------------------------------------ group routines
export function families(W) {
  const L = W.L, rng = W.rng;
  const homes = rng.shuffle(W.homes.filter((P) => P.members.some((m) => m.age < 13) && P.members.some((m) => m.age >= 18)));
  let n = 0;
  for (const P of homes) {
    const t0 = T('13:00') + rng.int(0, 95);
    const kids = P.members.filter((m) => m.age < 13 && m.age >= 2);
    const adults = P.members.filter((m) => m.age >= 18);
    const est = 115;
    const goKids = kids.filter((m) => W.free(m, t0, t0 + est));
    const goAd = adults.filter((m) => W.free(m, t0, t0 + est));
    if (!goKids.length || !goAd.length) continue;
    const party = [...goAd.slice(0, 3), ...goKids.slice(0, 4)];
    const speed = Math.min(...party.map((m) => m.speed)) * (party.some((m) => m.age < 5) ? 0.75 : 0.88);
    const g = W.gather(P); if (!g) continue;
    const trip = new Trip(W, party, t0, { speed, lag: 0.018 });
    const mom = goAd.find((m) => m.sex === 'F'), dad = goAd.find((m) => m.sex === 'M');
    const withWhom = mom && dad ? 'Mom and Dad' : mom ? (mom.age > 60 ? 'Grandma' : 'Mom') : dad.age > 60 ? 'Grandpa' : 'Dad';
    const kidNames = names(goKids.map((k) => k.first));
    const lab = (what) => (m) => (m.age < 18 ? `${what} with ${withWhom}` : `${what} with ${kidNames}`);
    trip.to(g, 2, { label: (m) => (m.age < 18 ? 'Waiting on the front walk' : 'Rounding everybody up for the fair'), act: 'wait' });
    const eta = trip.t + trip.eta(W.fair[0] || g);
    const dwell = rng.int(35, 60);
    const kidSpots = W.pickN(W.fairKids.length ? W.fairKids : W.fair, goKids.length, eta, eta + dwell);
    const adSpots = W.pickN(W.fair, goAd.length, eta, eta + dwell);
    const spotOf = (m) => (m.age < 18 ? kidSpots[goKids.indexOf(m) % Math.max(1, kidSpots.length)] : adSpots[goAd.indexOf(m) % Math.max(1, adSpots.length)]) || W.fair[0];
    const heldKid = rng.pick(['balloon', 'cotton_candy', 'flag_small', 'balloon']);
    trip.to((m) => spotOf(m), dwell, {
      label: lab('At the Harbor Days fair'), held: (m) => (m.age < 18 ? heldKid : m.sex === 'F' ? 'handbag' : rng.chance(0.15) ? 'camera' : null),
      act: (m) => (m.age < 18 ? rng.pick(['play', 'cheer', 'play_ball', 'look']) : rng.pick(['talk', 'look', 'browse', 'clap'])),
    });
    const edge = squareEdge(W, P.door.x, P.door.z);
    trip.to(edge, 1.5, { label: (m) => (m.age < 18 ? 'Waiting for the grown-ups' : 'Rounding up the children'), held: (m) => (m.age < 18 ? heldKid : null), act: 'look' });
    const extra = rng.pick(['harbour', 'soda', 'park', 'none']);
    if (extra === 'harbour') { const q = quaySpot(W, P.door.z, 'fam'); if (q) trip.to(q, rng.int(8, 15), { label: lab('Looking at the boats'), act: 'look', held: (m) => (m.age < 18 ? heldKid : null) }); }
    else if (extra === 'soda' && W.soda.length >= party.length) {
      const sp = W.pickN(W.soda, party.length, trip.t + 3, trip.t + 20);
      trip.to(sp, rng.int(12, 18), { label: lab('Ice-cream sodas at Mayhew\'s'), act: 'drink', held: null });
      trip.to(W.gather(W.place("Mayhew's Pharmacy & Soda Fountain")), 1, { label: 'Waiting outside Mayhew\'s', act: 'wait' });
    } else if (extra === 'park' && W.parkPlay.length) {
      const pk = W.pickN(W.parkPlay, goKids.length, trip.t + 4, trip.t + 20), pb = W.pickN(W.parkBench, goAd.length, trip.t + 4, trip.t + 20);
      trip.to((m) => (m.age < 18 ? pk[goKids.indexOf(m) % Math.max(1, pk.length)] : pb[goAd.indexOf(m) % Math.max(1, pb.length)]) || edge, rng.int(12, 20), { label: (m) => (m.age < 18 ? 'Playing in Juniper Park' : 'Resting in Juniper Park while the children play'), act: (m) => (m.age < 18 ? 'play' : 'sit') });
    }
    trip.to(g, 1, { label: lab('Walking home from the fair'), held: (m) => (m.age < 18 ? heldKid : null) });
    trip.to((m) => W.homeSpot(m) || g, 2, { label: 'Home from the fair', held: null });
    if (!party.every((m) => W.free(m, t0, trip.t))) continue;
    trip.commit();
    n++;
  }
  W.tally('Families to the fair', n);
  L.scene('Families walking to the fair', 200, -35, '13:00', '17:00', n);
}

// gangs of 3–5 kids from nearby houses roaming the town
export function kidGangs(W) {
  const L = W.L, rng = W.rng;
  const kids = L.ctx.people.list.filter((p) => p.age >= 6 && p.age <= 12 && !p.commuter && W.home(p));
  const door = new Map(kids.map((k) => [k, W.home(k).door]));
  const dist = (a, b) => Math.hypot(door.get(a).x - door.get(b).x, door.get(a).z - door.get(b).z);
  let n = 0;
  for (const [lo, hi, am] of [['8:50', '11:55', true], ['15:05', '17:35', false]]) {
    const pool = rng.shuffle(kids.filter((k) => W.free(k, T(lo) + 20, T(hi) - 30)));
    const used = new Set();
    for (const lead of pool) {
      if (used.has(lead)) continue;
      const LP = W.home(lead);
      const near = pool.filter((k) => k !== lead && !used.has(k) && dist(k, lead) < 140).sort((a, b) => dist(a, lead) - dist(b, lead));
      const gang = [lead, ...near.slice(0, rng.int(2, 4))];
      if (gang.length < 3) continue;
      const t0 = T(lo) + rng.int(0, 30);
      const end = T(hi) - rng.int(0, 10);
      if (!gang.every((k) => W.free(k, t0, end))) continue;
      const g = W.gather(LP); if (!g) continue;
      const speed = Math.min(...gang.map((k) => k.speed)) * 0.82;
      const trip = new Trip(W, gang, t0, { speed, lag: 0.02 });
      const others = (k) => names(gang.filter((x) => x !== k).map((x) => x.first));
      trip.to(g, 3, { label: (k) => (k === lead ? 'Waiting for the gang' : `Calling for ${lead.first}`), act: (k) => (k === lead ? 'wait' : 'wave') });
      const ball = rng.chance(0.5) ? gang[1] : null;
      const held = (k) => (k === ball ? 'ball' : null);
      const stops = am ? rng.shuffle(['park', 'dime', 'quay', 'candy', 'station']) : rng.shuffle(['fair', 'beach', 'candy', 'park', 'quay']);
      for (const s of stops) {
        if (trip.t > end - 25) break;
        if (s === 'park' && W.parkPlay.length) {
          const sp = W.pickN(W.parkPlay, gang.length, trip.t + 5, trip.t + 30);
          trip.to(sp, rng.int(18, 30), { label: (k) => `Playing in Juniper Park with ${others(k)}`, act: (k) => rng.pick(['play', 'play_ball', 'jump_rope', 'play', 'swing']), held });
          trip.to(W.outSpot(175, 131, { act: 'stand', spread: 1.3 }, 'parkgate'), 1, { label: 'Deciding where to go next', act: 'talk', held });
        } else if (s === 'dime' || s === 'candy') {
          const S = SHOPS[s]; const P = W.place(S.n); const sp = W.spotsIn(S.n, 'browse');
          if (!P || !sp.length || trip.t < S.open[0]) continue;
          const pick = W.pickN(sp, gang.length, trip.t + 5, trip.t + 15);
          trip.to(pick, rng.int(6, 10), { label: s === 'dime' ? 'Spending a nickel at Woolcott\'s' : 'Buying penny candy at the Sweet Shoppe', act: 'browse', held, lines: ['Two root-beer barrels and a Mary Jane.', 'I\'ve got a nickel. You\'ve got a nickel. That\'s ten cents!'] });
          trip.to(W.gather(P), 1, { label: 'Deciding where to go next', act: 'talk', held });
        } else if (s === 'quay') {
          const q = quaySpot(W, LP.door.z, 'kids'); if (!q) continue;
          trip.to(q, rng.int(12, 20), { label: (k) => `Watching the boats off the quay with ${others(k)}`, act: (k) => rng.pick(['look', 'point', 'look', 'wave']), held });
        } else if (s === 'station') {
          const tr = [T('9:52'), T('12:40'), T('16:52')].find((x) => x > trip.t + 5 && x < trip.t + 35);
          if (!tr) continue;
          const st = W.outSpot(206, -218, { act: 'look', spread: 1.5, faceTo: [206, -232] }, 'trainwatch');
          const eta = trip.t + trip.eta(st);
          trip.to(st, Math.max(6, tr + 10 - eta), { label: `Waiting to see the ${tr === T('9:52') ? '9:52' : tr === T('12:40') ? '12:40' : '4:52'} come in`, act: (k) => rng.pick(['look', 'wave', 'look']), held });
        } else if (s === 'fair') {
          const sp = W.pickN(W.fairKids.length ? W.fairKids : W.fair, gang.length, trip.t + 5, trip.t + 30);
          trip.to(sp, rng.int(20, 30), { label: (k) => `At the fair with ${others(k)}`, act: (k) => rng.pick(['play', 'cheer', 'look']), held: (k) => (k === ball ? 'ball' : rng.chance(0.4) ? 'cotton_candy' : null) });
          trip.to(squareEdge(W, LP.door.x, LP.door.z), 1, { label: 'Deciding where to go next', act: 'talk', held });
        } else if (s === 'beach' && W.beachPlay.length) {
          const sp = W.pickN(W.beachPlay, gang.length, trip.t + 8, trip.t + 35);
          trip.to(sp, rng.int(18, 28), { label: (k) => `Playing on the beach with ${others(k)}`, act: (k) => rng.pick(['play', 'play_ball', 'cheer']), held });
          trip.to(W.outSpot(60, 232, { act: 'stand', spread: 1.3 }, 'beachgate'), 1, { label: 'Shaking the sand out of their shoes', act: 'stand', held });
        }
      }
      if (trip.stops < 3) continue;
      trip.to(g, 1, { label: 'Walking home', held });
      trip.to((k) => W.homeSpot(k) || g, 2, { label: 'Home for ' + (am ? 'lunch' : 'supper'), held: null });
      if (trip.t > T(hi) + 5 || !gang.every((k) => W.free(k, t0, trip.t))) continue;
      trip.commit();
      gang.forEach((k) => used.add(k));
      n++;
    }
  }
  W.tally('Gangs of kids', n);
  L.scene('Gangs of kids roaming', 170, 50, '9:05', '17:35', n);
}

// teenagers walking to the soda fountain together, then the fair and the record shop
export function teens(W) {
  const L = W.L, rng = W.rng;
  const pool = rng.shuffle(L.ctx.people.list.filter((p) => p.age >= 13 && p.age <= 18 && !p.commuter && W.home(p)));
  const used = new Set(); let n = 0;
  for (const a of pool) {
    if (used.has(a)) continue;
    const t0 = T('12:50') + rng.int(0, 90);
    if (!W.free(a, t0, t0 + 110)) continue;
    const friends = pool.filter((b) => b !== a && !used.has(b) && Math.abs(b.age - a.age) <= 2 && W.free(b, t0, t0 + 110)).slice(0, rng.int(1, 2));
    if (!friends.length) continue;
    const grp = [a, ...friends];
    const PA = W.home(a), g = W.gather(PA);
    const trip = new Trip(W, grp, t0, { speed: Math.min(...grp.map((q) => q.speed)) * 0.9, lag: 0.015 });
    const others = (k) => names(grp.filter((x) => x !== k).map((x) => x.first));
    trip.to(g, 2, { label: (k) => (k === a ? 'Waiting for the others' : `Calling for ${a.first}`), act: 'talk' });
    if (W.soda.length >= grp.length) {
      const sp = W.pickN(W.soda, grp.length, trip.t + 5, trip.t + 35);
      trip.to(sp, rng.int(22, 35), { label: (k) => `Ice-cream sodas at Mayhew's with ${others(k)}`, act: 'drink', lines: ['Did you see him? Don\'t look! Okay, look.', 'Two straws, one soda. That\'s economics.', 'The sock hop starts at half past seven. Not that I\'m counting.'] });
      trip.to(W.gather(W.place("Mayhew's Pharmacy & Soda Fountain")), 1, { label: 'Hanging around outside Mayhew\'s', act: 'talk' });
    }
    const f = W.pickN(W.fair, grp.length, trip.t + 3, trip.t + 30);
    trip.to(f, rng.int(20, 30), { label: (k) => `At the fair with ${others(k)}`, act: (k) => rng.pick(['talk', 'laugh', 'look']), held: (k) => (rng.chance(0.4) ? 'cotton_candy' : null) });
    const rec = W.spotsIn('Bishop Music Co.', 'browse', 'waiting');
    if (rec.length) trip.to(W.pickN(rec, grp.length, trip.t + 3, trip.t + 20), rng.int(10, 18), { label: "Looking through the records at Bishop's", act: 'browse', lines: ['Have you heard “Crying in the Chapel”? Everybody\'s got it.', 'Mr. Bishop\'s lending records for the sock hop.'] });
    trip.to((k) => W.homeSpot(k) || g, 2, { label: 'Walking home', held: null });
    if (!grp.every((k) => W.free(k, t0, trip.t))) continue;
    trip.commit(); grp.forEach((k) => used.add(k)); n++;
  }
  W.tally('Teenagers to the soda fountain', n);
  L.scene('Teenagers at the soda fountain', 234, 15, '12:50', '16:30', n);
}

// old men walking slowly, with canes, to the checkerboards in Juniper Park
export function oldMen(W) {
  const L = W.L, rng = W.rng;
  const tables = W.checkers.length >= 4 ? W.checkers : W.parkBench;
  if (tables.length < 2) return;
  const pool = rng.shuffle(L.ctx.people.list.filter((p) => p.sex === 'M' && p.age >= 60 && !p.commuter && W.home(p)));
  let n = 0, k = 0;
  const used = new Set();
  const slots = [['9:10', 70], ['10:20', 75], ['14:40', 70], ['15:50', 60]];
  for (const [st, len] of slots) {
    const tA = T(st) + rng.int(0, 10);
    const grp = [];
    for (const p of pool) { if (grp.length >= 4) break; if (!used.has(p) && W.free(p, tA - 30, tA + len + 30)) grp.push(p); }
    if (grp.length < 2) continue;
    const seats = W.pickN(tables, grp.length, tA, tA + len);
    const went = [];
    grp.forEach((p, i) => {
      const home = W.homeSpot(p); if (!home || !seats[i]) return;
      const speed = p.speed * (p.age >= 70 ? 0.72 : 0.82), pos = W.posAt(p, tA - 30);
      const t0 = Math.max(W.settle(p, tA - 30), tA + i * 3 - walkMin(pos, seats[i], speed));
      const trip = new Trip(W, [p], t0, { from: pos, speed });
      trip.to(seats[i], len - i * 5, { label: `Playing checkers in Juniper Park with ${names(grp.filter((q) => q !== p).map(honor))}`, act: seats[i].act === 'chess' ? 'chess' : 'talk_sit', held: 'cane' });
      trip.to(home, 2, { label: 'Walking home from the checkerboards', held: 'cane' });
      if (!W.free(p, t0, trip.t)) return;
      trip.commit(); n++; went.push(p); used.add(p);
    });
    if (went.length >= 2) L.convo(went.slice(0, 2), tA + 8, tA + len - 10, OLD_MEN[k++ % OLD_MEN.length]);
  }
  W.tally('Old men at the checkerboards', n);
  L.scene('Old men at the checkerboards', 160, 90, '9:00', '17:00', n);
}

// two women meet on the sidewalk and stop to talk, then go on with their errands
export function chats(W) {
  const L = W.L, rng = W.rng;
  const shops = L.places.shops.filter((P) => P.kind === 'shop' || P.kind === 'department' || P.kind === 'postoffice' || P.kind === 'bank');
  const women = rng.shuffle(L.ctx.people.list.filter((p) => p.sex === 'F' && p.age >= 22 && !p.commuter && W.home(p)));
  const used = new Set(); let n = 0;
  for (const a of women) {
    if (n >= 22) break;
    if (used.has(a)) continue;
    const tm0 = T('8:50') + rng.int(0, 165);
    const P = rng.pick(shops);
    const spA = W.outSpot(...xy(P.at(-0.55, 2.2)), { faceTo: xy(P.at(0.55, 2.2)), act: 'talk' }, 'chatA');
    const spB = W.outSpot(...xy(P.at(0.55, 2.2)), { faceTo: xy(P.at(-0.55, 2.2)), act: 'talk' }, 'chatB');
    if (!W.isFree(spA, tm0 - 1, tm0 + 12)) continue;
    const b = women.find((q) => q !== a && !used.has(q) && q.household !== a.household && W.free(q, tm0 - 25, tm0 + 60));
    if (!b || !W.free(a, tm0 - 25, tm0 + 60)) continue;
    const dur = rng.int(7, 13);
    const plan = (p, s, other) => {
      const pos = W.posAt(p, tm0 - 25);
      let t0 = tm0 - walkMin(pos, s, p.speed * 0.9) - rng.int(0, 2); t0 = W.settle(p, t0);
      const win = W.windowAround(p, t0, tm0 + dur);
      if (!win) return null;
      const trip = new Trip(W, [p], t0, { from: pos, speed: p.speed * 0.9 });
      trip.to(s, tm0 + dur - (t0 + walkMin(pos, s, trip.speed)), { label: `Chatting with ${honor(other)} outside ${P.name}`, act: rng.pick(['talk', 'talk', 'laugh']), held: 'handbag' });
      const end = Math.min(win[1], trip.t + 110);
      const list = trip.t > T('12:00') ? RUNS.F_pm : RUNS.F_am;
      if (!errands(W, p, trip, end, list, { carried: 'handbag', n: rng.int(1, 3) })) homeAfter(W, p, trip, 'Walking home');
      if (!W.free(p, t0, trip.t)) return null;
      return trip;
    };
    const ta = plan(a, spA, b), tb = ta && plan(b, spB, a);
    if (!ta || !tb) continue;
    ta.commit(); tb.commit();
    L.convo([a, b], tm0, tm0 + dur, rng.pick(CHATS_F));
    used.add(a); used.add(b); n++;
  }
  W.tally('Sidewalk chats', n);
  L.scene('Women stopping to chat on the sidewalk', 200, -60, '8:50', '12:00', n);
}
const xy = (q) => [q.x, q.z];

// men meeting on a downtown corner for a smoke and a talk, then on to the barber or the hardware store
export function cornerMen(W) {
  const L = W.L, rng = W.rng;
  const corners = L.places.corners.filter((c) => c.x >= 100 && c.x <= 320 && c.z >= -220 && c.z <= 75);
  if (!corners.length) return;
  const men = rng.shuffle(L.ctx.people.list.filter((p) => p.sex === 'M' && p.age >= 25 && p.age < 75 && !p.commuter && W.home(p)));
  const used = new Set(); let n = 0;
  for (let g = 0; g < 14; g++) {
    const c = corners[g % corners.length];
    const cc = c.corners[rng.int(0, 3)];
    const tm0 = (g % 2 ? T('13:40') : T('8:40')) + rng.int(0, 150);
    const k = rng.int(2, 3);
    const grp = men.filter((p) => !used.has(p) && W.free(p, tm0 - 25, tm0 + 55)).slice(0, k);
    if (grp.length < 2) continue;
    const spots = W.ring(cc.x, cc.z, grp.length, 0.8, { act: 'talk' }, 'corner' + g % 3);
    const dur = rng.int(12, 22);
    const where = `on the corner of ${short(c.ave)} and ${short(c.st)}`;
    const trips = grp.map((p, i) => {
      const pos = W.posAt(p, tm0 - 25);
      let t0 = tm0 - walkMin(pos, spots[i], p.speed * 0.95) - rng.int(0, 3); t0 = W.settle(p, t0);
      const win = W.windowAround(p, t0, tm0 + dur); if (!win) return null;
      const trip = new Trip(W, [p], t0, { from: pos, speed: p.speed * 0.95 });
      trip.to(spots[i], tm0 + dur - (t0 + walkMin(pos, spots[i], trip.speed)), { label: `Talking with ${names(grp.filter((q) => q !== p).map(honor))} ${where}`, act: rng.pick(['talk', 'smoke_pipe', 'talk', 'laugh']) });
      const end = Math.min(win[1], trip.t + 90);
      const list = trip.t > T('12:30') ? RUNS.M_pm : RUNS.M_am;
      if (!(trip.t < T('12:00') && rng.chance(0.4) && barber(W, p, trip, end) && (homeAfter(W, p, trip, 'Home with a fresh haircut'), true)) && !errands(W, p, trip, end, list, { n: rng.int(1, 2) })) homeAfter(W, p, trip, 'Walking home');
      return W.free(p, t0, trip.t) ? trip : null;
    });
    if (trips.some((x) => !x)) continue;
    trips.forEach((x) => x.commit());
    L.convo(grp.slice(0, 2), tm0, tm0 + dur, rng.pick(CHATS_M));
    grp.forEach((p) => used.add(p)); n++;
  }
  W.tally('Men on the corner', n);
  L.scene('Men talking on the corner', 214, -70, '8:40', '16:30', n);
}

// a woman who does hair in her kitchen on Saturday mornings, and her neighbours coming in turn
export function beautyKitchens(W) {
  const L = W.L, rng = W.rng;
  const houses = rng.shuffle(W.homes.filter((P) => P.kind === 'house'));
  let n = 0;
  for (const P of houses) {
    if (n >= 2) break;
    const hd = P.members.find((m) => m.sex === 'F' && m.age >= 30 && m.age <= 62 && W.free(m, '9:00', '12:05') && W.atHome(m, T('9:00')));
    if (!hd || !hd.home) continue;
    const chair = (hd.home.dine || [])[0]; if (!chair) continue;
    const bx = chair.x - Math.sin(chair.yaw) * 0.6, bz = chair.z - Math.cos(chair.yaw) * 0.6;
    const stand = L.spot(bx, bz, { room: chair.room, y: chair.y, yaw: chair.yaw, act: 'haircut' });
    const clients = W.nearHomes(P).filter((Q) => Q !== P).flatMap((Q) => Q.members.filter((m) => m.sex === 'F' && m.age >= 25)).filter((m) => !W.touched.has(m));
    let t = T('9:10'); const done = [];
    for (const c of clients) {
      if (t > T('11:20')) break;
      const dur = rng.int(28, 38);
      const home = W.homeSpot(c); if (!home) continue;
      const pos = W.posAt(c, t - 10);
      const t0 = Math.max(W.settle(c, t - 10), t - walkMin(pos, W.doorstep(P), c.speed) - 2);
      if (!W.free(c, t0, t + dur + 12)) continue;
      const trip = new Trip(W, [c], t0, { from: pos, speed: c.speed * 0.9 });
      trip.to(W.doorstep(P), 1, { label: `Knocking at ${W.theirs(hd)} kitchen door`, act: 'wait', held: 'handbag' });
      trip.wait(Math.max(0, t - trip.t));
      trip.to(chair, dur, { label: `Getting a shampoo and set in ${honor(hd)}'s kitchen`, act: 'sit', held: null, lines: ['Not too tight this time. I want to look surprised, not frightened.', 'Tell me everything. Start with the Bower sisters.', 'Pin curls for the service tomorrow. And the fireworks tonight.'] });
      homeAfter(W, c, trip, 'Walking home with a fresh set');
      trip.commit(); done.push([c, t, t + dur]);
      t += dur + rng.int(2, 6);
    }
    if (done.length < 2) continue;
    const hs = [];
    hs.push({ t: T('9:00'), spot: hd.home.kitchen && hd.home.kitchen[0] ? hd.home.kitchen[0] : chair, act: 'wash', label: 'Setting out the curlers and the pin tray' });
    for (const [c, a, b] of done) { hs.push({ t: a, spot: stand, act: 'haircut', label: `Doing ${honor(c)}'s hair in her kitchen`, lines: ['Hold still, dear, or you\'ll have one curl on the side like a question mark.', 'Fifty cents, and I won\'t hear a word about it.', 'Did you hear Carol Kaminski went in last night?'] }); L.convo([hd, c], a + 2, b - 2, rng.pick(VISIT_TALK)); }
    const lastEnd = done[done.length - 1][2];
    hs.push({ t: lastEnd, spot: W.homeSpot(hd), act: 'doze', label: 'Putting her feet up after a morning of curls' });
    W.plan(hd, T('9:00'), Math.min(T('12:05'), lastEnd + 25), hs);
    W.touched.add(hd);
    L.scene('Kitchen beauty parlor', P.door.x, P.door.z, '9:00', lastEnd, done.length + 1);
    n++;
  }
  W.tally('Kitchen beauty parlors', n);
}

// Saturday-afternoon confession at St. Brigid's, 3:30 to 5
export function confession(W) {
  const L = W.L, rng = W.rng;
  const box = L.tagged('confession')[0]; if (!box) return;
  const pews = W.spotsIn("St. Brigid's Church", 'pew').slice().sort((a, b) => Math.hypot(a.x - box.x, a.z - box.z) - Math.hypot(b.x - box.x, b.z - box.z)).slice(0, 12);
  const ladies = rng.shuffle(L.ctx.people.list.filter((p) => p.sex === 'F' && p.age >= 35 && catholic(p) && !p.commuter && W.home(p)));
  let slot = T('15:32'), n = 0;
  for (const p of ladies) {
    if (slot > T('16:52')) break;
    const home = W.homeSpot(p); if (!home) continue;
    const wait = rng.int(8, 18), inBox = rng.int(3, 5), penance = rng.int(5, 9);
    const pos = W.posAt(p, slot - wait - 10);
    const t0 = Math.max(W.settle(p, slot - wait - 10), slot - wait - walkMin(pos, box, p.speed * 0.85));
    const tEnd = slot + inBox + penance + walkMin(box, home, p.speed * 0.85) + 3;
    if (!W.free(p, t0, tEnd)) continue;
    const trip = new Trip(W, [p], t0, { from: pos, speed: p.speed * 0.85 });
    const pw = W.pickFree(pews, slot - wait, slot, rng);
    trip.to(pw, 0, { label: 'Waiting her turn for confession', act: 'pray_sit', held: 'handbag', lines: CONFESS });
    trip.t = slot;
    trip.to(box, inBox, { label: 'At confession', act: 'pray_sit', held: null });
    const pn = W.pickFree(pews, trip.t, trip.t + penance, rng);
    trip.to(pn, penance, { label: 'Saying her penance', act: 'pray_sit', held: 'handbag' });
    trip.to(home, 2, { label: "Walking home from St. Brigid's", held: 'handbag' });
    trip.commit();
    slot += inBox + 1; n++;
  }
  W.tally('Confessions', n);
  L.scene("Saturday confession at St. Brigid's", box.x, box.z, '15:20', '17:10', n);
}

// casseroles and pies: a baby on the way, a boy home from Korea, a fright with the cat
export function casseroles(W) {
  const L = W.L, rng = W.rng;
  const drops = [
    { home: 'Kaminski', from: '13:40', to: '17:20', n: 3, leave: true, label: 'Leaving a pie on the Kaminskis\' step for the new baby', lines: ['Nobody\'s home. Of course nobody\'s home — they\'re at St. Luke\'s!', 'I\'ll leave it by the door. A new mother shouldn\'t have to cook.'] },
    { home: 'Castellano', from: '16:10', to: '18:10', n: 3, leave: false, label: 'Taking a pie over for Sal Jr.\'s welcome-home supper', lines: ['Tell Rosa it\'s blueberry. Sal always liked blueberry.', 'Home from Korea! God bless him. Here — this is for the table.'] },
    { home: 'Hatch', from: '12:40', to: '15:30', n: 2, leave: false, label: 'Bringing Mrs. Hatch a coffee cake after all the excitement', lines: ['Mildred, you poor thing. Up a ladder at your age!', 'That cat will be the death of us all. Here — sit down.'] },
  ];
  let total = 0;
  for (const d of drops) {
    const P = W.homes.find((Q) => Q.household && Q.household.surname === d.home && Q.kind === 'house') || W.homes.find((Q) => Q.name.startsWith(d.home));
    if (!P) continue;
    const step = W.doorstep(P);
    const cands = W.nearHomes(P).filter((Q) => Q !== P).flatMap((Q) => Q.members.filter((m) => m.sex === 'F' && m.age >= 25));
    let k = 0;
    for (const c of rng.shuffle(cands.slice(0, 24))) {
      if (k >= d.n) break;
      let t0 = T(d.from) + rng.int(0, T(d.to) - T(d.from) - 30);
      const home = W.homeSpot(c); if (!home) continue;
      const pos = W.posAt(c, t0);
      t0 = W.settle(c, t0);
      const stay = d.leave ? 1.5 : rng.int(4, 8);
      const tEnd = t0 + walkMin(pos, step, c.speed * 0.85) + stay + walkMin(step, home, c.speed * 0.85) + 3;
      if (!W.free(c, t0, tEnd)) continue;
      const trip = new Trip(W, [c], t0, { from: pos, speed: c.speed * 0.85 });
      const tArr = trip.t + trip.eta(step);
      trip.to(step, stay, { label: d.label, act: d.leave ? 'kneel' : 'talk', held: 'pie', lines: d.lines });
      homeAfter(W, c, trip, 'Walking home, feeling useful');
      trip.commit();
      if (d.leave) L.timed('food_pie', step.x + P.r[0] * 0.5 * (k - 1), step.z + P.r[1] * 0.5 * (k - 1), P.yawOut, tArr + stay, '23:59', { y: step.y + 0.02, scale: 0.8 });
      else {
        const host = P.members.find((m) => m.age >= 18 && W.free(m, tArr, tArr + stay) && W.atHome(m, tArr));
        if (host) {
          const inside = W.outSpot(P.door.x + P.u[0] * 0.2, P.door.z + P.u[1] * 0.2, { yaw: P.yawOut, act: 'talk', yTop: P.door.y + 1.5 }, 'doorway');
          W.plan(host, tArr, tArr + stay, [{ t: tArr, spot: inside, act: 'talk', label: `Thanking ${honor(c)} for the ${d.home === 'Hatch' ? 'coffee cake' : 'pie'}` }]);
          L.convo([c, host], tArr, tArr + stay, [[0, d.lines[0]], [1, 'Oh, you shouldn\'t have. You really shouldn\'t have.'], [0, d.lines[1]], [1, 'Come in for a minute, at least.']]);
        }
      }
      k++; total++;
    }
    if (k) L.scene(d.label, P.door.x, P.door.z, d.from, d.to, k);
  }
  W.tally('Pies and casseroles', total);
}

// husbands and wives out arm in arm after supper (and some old couples in the afternoon)
export function couples(W) {
  const L = W.L, rng = W.rng;
  let n = 0;
  const homes = rng.shuffle(W.homes.slice());
  for (const P of homes) {
    for (const hh of P.homes || []) {
      const h = hh.household; if (!h) continue;
      const man = h.members.find((m) => m.sex === 'M' && m.age >= 20), wife = man && spouseOf(man);
      if (!wife) continue;
      const old = man.age >= 62;
      const eve = !old || rng.chance(0.5);
      const t0 = eve ? T('18:50') + rng.int(0, 80) : T('14:10') + rng.int(0, 80);
      const dur = rng.int(40, 75);
      if (!W.free(man, t0, t0 + dur + 10) || !W.free(wife, t0, t0 + dur + 10)) continue;
      if (!W.atHome(man, t0) || !W.atHome(wife, t0)) continue;
      if (!rng.chance(eve ? 0.95 : 0.6)) continue;
      const g = W.gather(P); if (!g) continue;
      const trip = new Trip(W, [man, wife], t0, { speed: Math.min(man.speed, wife.speed) * (old ? 0.72 : 0.8), lag: 0.008 });
      trip.to(g, 1.5, { label: (p) => (p === man ? 'Waiting on the front walk for his wife' : 'Stepping out with her husband'), act: 'wait', held: (p) => (p === wife ? 'handbag' : old ? 'cane' : null) });
      const target = rng.pick(eve ? [{ x: 40, z: P.door.z }, { x: 200, z: -35 }, { x: 175, z: 105 }, { x: 60, z: 230 }] : [{ x: 175, z: 105 }, { x: 40, z: P.door.z }]);
      const metres = (dur * 0.45) * trip.speed * 0.8 * 60;
      const r = W.route(g, metres, { to: target, jitter: 5 });
      const lab = (p) => (eve ? `Evening walk arm in arm with ${p === man ? wife.first : man.first}` : `Out walking arm in arm with ${p === man ? wife.first : man.first}`);
      if (!r || !trip.stroll(r, { label: lab, arms: 'arm', held: (p) => (p === wife ? 'handbag' : old ? 'cane' : null) })) continue;
      // a pause on the way: the harbour, the square, a bench
      const nearWater = r.end.x < 90;
      const stop = nearWater ? quaySpot(W, r.end.z, 'cpl') : W.outSpot(r.end.x, r.end.z, { act: 'look', spread: 0.7 }, 'cplstop');
      const other = (p) => (p === man ? wife.first : man.first);
      if (stop) trip.to(stop, rng.int(6, 14), { label: (p) => (nearWater ? `${eve ? 'Watching the harbor lights' : 'Looking at the boats'} with ${other(p)}` : `Stopping to look at the bunting with ${other(p)}`), act: nearWater ? 'look' : 'talk', held: (p) => (p === wife ? 'handbag' : null) });
      trip.to(g, 1, { label: 'Walking home arm in arm', arms: 'arm', held: (p) => (p === wife ? 'handbag' : old ? 'cane' : null) });
      trip.to((p) => W.homeSpot(p) || g, 2, { label: 'Home from the evening walk', held: null, arms: null });
      if (!W.free(man, t0, trip.t) || !W.free(wife, t0, trip.t)) continue;
      trip.commit();
      man.lane = 0.3; wife.lane = -0.3; // side by side, arm in arm
      n++;
    }
  }
  W.tally('Couples out walking', n);
  L.scene('Couples walking arm in arm', 120, 60, '14:10', '20:40', n);
}

// people who'll watch the fireworks walk down early for a good spot
export function earlyFireworks(W) {
  const L = W.L, rng = W.rng;
  let n = 0;
  for (const p of L.ctx.people.list) {
    if (p.commuter || p.visitor || !W.home(p)) continue;
    const e = p.schedule.find((x) => x.event === 'fireworks');
    if (!e || !e.spot) continue;
    const lead = rng.int(22, 55);
    const win = W.windowAround(p, e.t - lead, e.t);
    if (!win || !rng.chance(0.75)) continue;
    const P = W.home(p), g = W.gather(P);
    if (!g) continue;
    const t0 = Math.max(win[0], e.t - lead);
    const trip = new Trip(W, [p], t0, { speed: p.speed * 0.9 });
    trip.to(g, 0.5, { label: 'Setting out for the fireworks', held: null });
    const left = e.t - trip.t - 1;
    if (left < 6) continue;
    const r = W.route(g, left * trip.speed * 0.8 * 60, { to: { x: e.spot.x + 40, z: e.spot.z }, jitter: 3 });
    if (!r || !trip.stroll(r, { label: 'Walking down early to get a good spot for the fireworks', held: p.age < 13 ? 'flag_small' : null })) continue;
    trip.to(W.outSpot(r.end.x, r.end.z, { act: 'look', spread: 1.2 }, 'fwwait'), 0, { label: 'Waiting for the fireworks', act: 'look' });
    if (trip.t > e.t - 0.5) continue;
    trip.commit(e.t); n++;
  }
  W.tally('Walking down early for the fireworks', n);
}
