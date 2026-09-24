// Shared helpers for routines*.js: free windows in a person's day, walking-time estimates,
// outdoor gathering spots, spot booking, and a small trip builder that walks a person (or a
// family, couple, gang of kids, party of visitors) through a string of stops together.
// Everything is estimated with cheap Manhattan distances: the sim pathfinds lazily at runtime.
import { tm } from '../../core/util.js';

export const T = tm;
export const fmt = (m) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

const HARD = /^(Working|Back at work)/;
// meals keep their first minutes; whatever is left of a long sit at the table is free time
// (only at a sensible hour: a "Breakfast" resumed at half past ten is somebody back from a scene, not a meal)
const MEALS = [[/^Breakfast/, 25, 0, 570], [/^Lunch/, 30, 660, 840], [/^Supper/, 40, 1000, 1200], [/^(Cooking supper|Making breakfast|Getting up)/, 1e9, 0, 1440]];
const WALKISH = new Set(['walk', 'path']);
const HOMEISH = new Set(['house', 'rowhouse', 'apartment']);

export function isHard(e) { return e.act === 'sleep' || !!e.event || !!e.life || !!(e.label && HARD.test(e.label)); }

// ------------------------------------------------------------------ the routines' world
export class RW {
  constructor(L) {
    this.L = L; this.ctx = L.ctx; this.nav = L.ctx.nav; this.rng = L.rng;
    this.booked = new Map();      // spot id -> [[t0, t1]]
    this.cache = new Map();       // misc spot caches
    this.count = {};              // scene counters (diagnostics)
    this.touched = new Set();     // people given a routine
    this.diary = {};              // candidates for the Spotter's Diary
    this.wcache = new Map();      // person -> their free windows (invalidated by W.plan)
    this.homeOf = new Map();      // person -> home place
    this.outings = new Map();     // person -> filler outings so far today
  }
  tally(k, n = 1) { this.count[k] = (this.count[k] || 0) + n; }
  // a Saturday has room for three or four outings, not ten (kids and the retired get a few more)
  outingsLeft(p) { const max = p.age < 18 ? 4 : p.age >= 66 ? 3 : (p.job ? 2 : 3); return Math.max(0, max - (this.outings.get(p) || 0)); }

  // ---------------------------------------------------------------- time
  // every plan goes through here, so the windows cache stays honest
  plan(p, t0, t1, entries, o = {}) { this.L.plan(p, t0, t1, entries, o); this.wcache.delete(p); this.touched.add(p); }
  // free stretches of p's day inside [lo, hi): not asleep, working, in an event or another scene
  windows(p, lo, hi, minLen = 10) {
    lo = T(lo); hi = T(hi);
    if (p.commuter || p.visitor || !p.schedule.length) return [];
    let all = this.wcache.get(p);
    if (!all || all.n !== p.schedule.length || all.b !== (p.busy || []).length) { all = { n: p.schedule.length, b: (p.busy || []).length, w: this._windows(p) }; this.wcache.set(p, all); }
    const out = [];
    for (const [a, b] of all.w) { const a2 = Math.max(a, lo), b2 = Math.min(b, hi); if (b2 - a2 >= minLen) out.push([a2, b2]); }
    return out;
  }
  _windows(p) {
    const s = p.schedule; s.sort((a, b) => a.t - b.t);
    const segs = [];
    for (let k = 0; k < s.length; k++) {
      const e = s[k];
      let a = e.t; const b = k + 1 < s.length ? s[k + 1].t : 1440;
      if (isHard(e)) continue;
      const lab = e.label || '';
      for (const [re, len, m0, m1] of MEALS) if (re.test(lab)) { if (a >= m0 && a <= m1) a += len; break; }
      if (b > a) segs.push([a, b]);
    }
    const merged = [];
    for (const g of segs) { const m = merged[merged.length - 1]; if (m && g[0] <= m[1] + 0.01) m[1] = Math.max(m[1], g[1]); else merged.push([g[0], g[1]]); }
    let out = merged;
    for (const [c, d] of p.busy || []) {
      const nx = [];
      for (const [a, b] of out) { if (d <= a || c >= b) { nx.push([a, b]); continue; } if (c > a) nx.push([a, c]); if (d < b) nx.push([d, b]); }
      out = nx;
    }
    return out;
  }
  // the free window containing [t0, t1], or null
  windowAround(p, t0, t1) {
    t0 = T(t0); t1 = T(t1);
    for (const w of this.windows(p, 0, 1440, 1)) if (w[0] <= t0 + 0.01 && w[1] >= t1 - 0.01) return w;
    return null;
  }
  free(p, t0, t1) { t0 = T(t0); t1 = T(t1); return t1 > t0 && !!this.windowAround(p, t0, t1) && this.L.idle(p, t0, t1); }

  // where p is (or is heading) just before minute t
  posAt(p, t) {
    const s = p.schedule; let cur = null;
    for (const e of s) { if (e.t < t) cur = e; else break; }
    if (!cur) cur = s[s.length - 1];
    if (!cur) return null;
    if (cur.route) { const n = cur.route[cur.route.length - 1]; return { x: this.nav.x[n], z: this.nav.z[n], node: n }; }
    return cur.spot ? { x: cur.spot.x, z: cur.spot.z, spot: cur.spot } : null;
  }
  // the earliest minute >= t by which p has finished walking to wherever they were heading at t
  settle(p, t) {
    const s = p.schedule; let k = -1;
    for (let i = 0; i < s.length; i++) { if (s[i].t < t) k = i; else break; }
    if (k < 0) return t;
    const e = s[k], prev = s[(k - 1 + s.length) % s.length];
    const to = e.route ? { x: this.nav.x[e.route[e.route.length - 1]], z: this.nav.z[e.route[e.route.length - 1]] } : e.spot;
    const from = prev.route ? { x: this.nav.x[prev.route[prev.route.length - 1]], z: this.nav.z[prev.route[prev.route.length - 1]] } : prev.spot;
    if (!to || !from) return t;
    let need = walkMin(from, to, e.speed || p.speed);
    if (e.route) { let len = 0; for (let i = 1; i < e.route.length; i++) len += Math.hypot(this.nav.x[e.route[i]] - this.nav.x[e.route[i - 1]], this.nav.z[e.route[i]] - this.nav.z[e.route[i - 1]]); need = len / ((e.speed || p.speed) * 0.8 * 60) + 0.5; }
    return Math.max(t, e.t + need + 0.3);
  }
  // the entry in force at minute t
  entryAt(p, t) { let cur = null; for (const e of p.schedule) { if (e.t <= t) cur = e; else break; } return cur; }

  // ---------------------------------------------------------------- places
  home(p) { let h = this.homeOf.get(p); if (h === undefined) { h = this.L.homePlace(p); this.homeOf.set(p, h); } return h; }
  homeSpot(p) { return p.lounge || p.seat || (p.home && p.home.lounge && p.home.lounge[0]) || null; }
  kitchenSpot(p) { const k = p.home && p.home.kitchen; return (k && (k.find((s) => s.act === 'cook') || k[0])) || this.homeSpot(p); }
  atHome(p, t) {
    const P = this.home(p); const q = this.posAt(p, t);
    if (!P || !q) return false;
    if (q.spot && q.spot.building === P.building) return true;
    const r = P.rect; return !!r && q.x >= r.x0 - 1 && q.x <= r.x1 + 1 && q.z >= r.z0 - 1 && q.z <= r.z1 + 1;
  }
  place(name) { const k = 'place:' + name; if (!this.cache.has(k)) this.cache.set(k, this.L.place(name)); return this.cache.get(k); }
  spotsIn(name, ...tags) {
    const P = this.place(name); if (!P) return [];
    const k = 'in:' + name + ':' + tags.join(',');
    if (!this.cache.has(k)) this.cache.set(k, P.building.spots.filter((s) => tags.some((t) => s.tags.includes(t))));
    return this.cache.get(k);
  }
  // an outdoor spot (cached by rounded position + key)
  outSpot(x, z, o = {}, key = '') {
    const k = `o:${Math.round(x * 4)}:${Math.round(z * 4)}:${key}`;
    let s = this.cache.get(k);
    if (!s) { s = this.L.spot(x, z, o); this.cache.set(k, s); }
    return s;
  }
  // gathering place in front of a building: the front walk of a house, the sidewalk before a shop
  gather(P) {
    if (!P) return null;
    const k = 'g:' + P.name;
    if (this.cache.has(k)) return this.cache.get(k);
    const q = HOMEISH.has(P.kind) ? P.at(0.8, -1.3) : P.at(0.9, 1.3);
    const s = this.L.spot(q.x, q.z, { yaw: P.yawOut, act: 'stand', spread: 0.9, label: null });
    this.cache.set(k, s);
    return s;
  }
  // the front door step (knocking)
  doorstep(P) {
    const k = 'd:' + P.name;
    if (this.cache.has(k)) return this.cache.get(k);
    const x = P.door.x + P.u[0] * 1.1, z = P.door.z + P.u[1] * 1.1;
    const s = this.L.spot(x, z, { yaw: P.yawIn, act: 'wait', yTop: P.door.y + 1.5 });
    this.cache.set(k, s);
    return s;
  }
  // n spots in a ring around (x, z), everyone facing the middle (a chat)
  ring(x, z, n, r = 0.75, o = {}, key = '') {
    const out = [];
    const a0 = o.a0 ?? 0;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2;
      const sx = x + Math.sin(a) * r, sz = z + Math.cos(a) * r;
      out.push(this.outSpot(sx, sz, { faceTo: [x, z], act: o.act || 'talk', held: o.held || null }, key + i));
    }
    return out;
  }

  // ---------------------------------------------------------------- booking (so two people don't stand on one spot)
  isFree(s, a, b) { const r = this.booked.get(s.id); return !r || !r.some(([c, d]) => c < b && d > a); }
  book(s, a, b) { if (!s) return; let r = this.booked.get(s.id); if (!r) this.booked.set(s.id, (r = [])); r.push([a, b]); }
  pickFree(spots, a, b, rng = this.rng, near = null) {
    if (!spots || !spots.length) return null;
    let f = spots.filter((s) => this.isFree(s, a, b));
    if (!f.length) f = spots;
    if (near) { f = f.slice().sort((p, q) => Math.hypot(p.x - near.x, p.z - near.z) - Math.hypot(q.x - near.x, q.z - near.z)); return f[0]; }
    return rng.pick(f);
  }
  // n free spots (distinct) near each other
  pickN(spots, n, a, b, rng = this.rng) {
    if (!spots || !spots.length) return [];
    const f = spots.filter((s) => this.isFree(s, a, b));
    const pool = f.length >= n ? f : spots;
    const first = rng.pick(pool);
    return pool.slice().sort((p, q) => Math.hypot(p.x - first.x, p.z - first.z) - Math.hypot(q.x - first.x, q.z - first.z)).slice(0, n);
  }

  // ---------------------------------------------------------------- routes
  // a sidewalk route that starts exactly at an outdoor spot's node, `metres` long, either wandering
  // (preferring to carry straight on) or heading toward `to` {x, z}. Returns { route, len, end }.
  route(fromSpot, metres, o = {}) {
    const nav = this.nav, rng = o.rng || this.rng;
    if (!fromSpot || fromSpot.node === undefined || fromSpot.node < 0) return null;
    if (!this._wadj) {
      // sidewalk/path adjacency, built once (spots added later are never part of a route's body)
      const n = nav.count;
      this._wadj = new Array(n);
      for (let i = 0; i < n; i++) { const k = nav.info[i].kind; this._wadj[i] = WALKISH.has(k) || k === 'outside' ? nav.adj[i].filter((e) => WALKISH.has(nav.info[e[0]].kind)).map((e) => e[0]) : null; }
      this._seen = new Int32Array(n); this._stamp = 0;
    }
    const wadj = this._wadj, seen = this._seen, X = nav.x, Z = nav.z, Y = nav.y;
    const start = fromSpot.node;
    let cur = -1;
    for (const [v] of nav.adj[start]) { if (v < wadj.length && wadj[v]) { cur = v; break; } }
    if (cur < 0) return null;
    const stamp = ++this._stamp;
    seen[cur] = stamp;
    const out = [start, cur];
    const d3 = (a, b) => Math.hypot(X[a] - X[b], Y[a] - Y[b], Z[a] - Z[b]);
    let len = d3(start, cur), prev = -1;
    const to = o.to || null, within2 = (o.within ?? 10) ** 2, jit = o.jitter ?? 3;
    const cand = [];
    for (let guard = 0; guard < 900 && len < metres; guard++) {
      if (to) { const dx = X[cur] - to.x, dz = Z[cur] - to.z; if (dx * dx + dz * dz < within2) break; }
      const nb = wadj[cur]; if (!nb) break;
      cand.length = 0;
      for (const v of nb) if (seen[v] !== stamp) cand.push(v);
      if (!cand.length) break;
      let next = cand[0];
      if (to) {
        let bs = Infinity;
        for (const v of cand) { const d = Math.hypot(X[v] - to.x, Z[v] - to.z) + rng.next() * jit; if (d < bs) { bs = d; next = v; } }
      } else if (prev >= 0 && rng.chance(0.72)) {
        const dx = X[cur] - X[prev], dz = Z[cur] - Z[prev];
        let bs = -Infinity;
        for (const v of cand) { const d = (X[v] - X[cur]) * dx + (Z[v] - Z[cur]) * dz; if (d > bs) { bs = d; next = v; } }
      } else next = cand[Math.floor(rng.next() * cand.length)];
      len += d3(cur, next); seen[next] = stamp; out.push(next); prev = cur; cur = next;
    }
    if (out.length < 3) return null;
    return { route: out, len, end: { x: X[cur], z: Z[cur], node: cur } };
  }
  // one reusable outdoor spot per sidewalk node (pauses at the end of a walk, a place to set off from)
  nodeSpot(node, o = {}) {
    const k = 'n:' + node + ':' + (o.key || '');
    let s = this.cache.get(k);
    if (!s) { s = this.L.spot(this.nav.x[node], this.nav.z[node], { act: 'look', spread: 1.2, ...o, link: node }); this.cache.set(k, s); }
    return s;
  }}

// walking time in minutes between two points ({x, z}, a spot, or {x, z, spot}): the streets are a grid;
// add a little for doors, and more for getting out of (or into) a building, and for stairs
export function walkMin(a, b, speed) {
  if (!a || !b) return 3;
  const sa = a.spot || a, sb = b.spot || b;
  const d = Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  const extra = 18 + (sa.room ? 24 : 0) + (sb.room ? 24 : 0) + Math.abs((sa.y ?? 0.3) - (sb.y ?? 0.3)) * 6;
  return (d * 1.12 + extra) / (Math.max(0.4, speed) * 60);
}

// ------------------------------------------------------------------ trips
// A person or a party moving from stop to stop together: the same departure place and time, the
// same destination and the same pace (entry speed). Entries are handed to L.plan by commit().
export class Trip {
  constructor(W, people, t, o = {}) {
    this.W = W; this.people = people.filter(Boolean); this.t0 = T(t); this.t = this.t0;
    // nobody sets off before they've got to where they were already going
    if (!o.from) { this.t0 = Math.max(this.t0, ...this.people.map((p) => W.settle(p, this.t0))); this.t = this.t0; }
    this.pos = o.from || W.posAt(this.people[0], this.t0) || { x: 200, z: 0 };
    this.starts = this.people.map((p, i) => (i === 0 ? this.pos : o.from || W.posAt(p, this.t0) || this.pos));
    this.speed = o.speed || Math.min(...this.people.map((p) => p.speed)) * (o.pace ?? 1);
    this.lag = o.lag ?? (this.people.length > 1 ? 0.012 : 0);
    this.E = this.people.map(() => []);
    this.base = o;
    this.last = null;       // the last outdoor spot shared by everyone (strolls start from it)
    this.stops = 0;
  }
  v(x, p, i) { return typeof x === 'function' ? x(p, i) : x; }
  entry(p, i, t, s, o) {
    const b = this.base;
    return {
      t, spot: s, act: this.v(o.act, p, i) ?? (s ? s.act : 'stroll'),
      label: this.v(o.label ?? b.label, p, i),
      held: this.v(o.held !== undefined ? o.held : b.held, p, i) || null,
      arms: this.v(o.arms !== undefined ? o.arms : b.arms, p, i) || null,
      lines: this.v(o.lines, p, i) || null,
      speed: this.speed,
    };
  }
  // go to a stop and stay `dwell` minutes. spot: one spot for everyone (use a spread spot for groups),
  // an array (one per person) or fn(p, i)
  to(spot, dwell, o = {}) {
    const each = (i) => (Array.isArray(spot) ? spot[i % spot.length] : typeof spot === 'function' ? spot(this.people[i], i) : spot);
    const first = each(0);
    if (!first) return this;
    let walk = walkMin(this.pos, first, this.speed);
    if (!this.stops && this.people.length > 1) for (const q of this.starts) walk = Math.max(walk, walkMin(q, first, this.speed));
    const arrive = this.t + walk * (o.slow ?? 1);
    this.people.forEach((p, i) => {
      const s = each(i) || first;
      this.E[i].push(this.entry(p, i, this.t + i * this.lag, s, o));
      if (o.book !== false) this.W.book(s, arrive, arrive + dwell);
    });
    const shared = !Array.isArray(spot) && typeof spot !== 'function';
    this.last = shared && !first.room ? first : null;
    this.t = arrive + dwell; this.pos = { x: first.x, z: first.z };
    this.stops++;
    return this;
  }
  // how long until we'd be there
  eta(spot) { return walkMin(this.pos, spot, this.speed); }
  // walk a sidewalk route from the last shared outdoor stop (see RW.route); returns false if it can't
  stroll(r, o = {}) {
    if (!r || !this.last || r.route[0] !== this.last.node) return false;
    this.people.forEach((p, i) => {
      const e = this.entry(p, i, this.t + i * this.lag, null, o);
      delete e.spot; e.route = r.route; e.act = 'stroll';
      this.E[i].push(e);
    });
    this.t += r.len / (this.speed * 0.8 * 60) + 0.04;
    this.pos = { x: r.end.x, z: r.end.z };
    this.last = null;
    return true;
  }
  wait(min) { this.t += min; return this; }
  // would a stop (plus the walk on to `then`) still end by `end`?
  fits(spot, dwell, then, end) { return this.t + walkMin(this.pos, spot, this.speed) + dwell + (then ? walkMin(spot, then, this.speed) : 0) + 1 <= end; }
  commit(end = null, o = {}) {
    const L = this.W.L;
    const t1 = end ?? this.t;
    // never write past the end of the window (whatever comes next — an event, supper — keeps its time)
    this.people.forEach((p, i) => { const E = this.E[i].filter((e) => e.t >= this.t0 - 0.001 && e.t < t1 - 0.01); if (E.length) this.W.plan(p, this.t0, t1, E, o); });
    return t1;
  }
}

// ------------------------------------------------------------------ small text helpers
export const the = (surname) => `the ${surname.endsWith('s') ? surname + 'es' : surname + 's'}`;
export const their = (surname) => `the ${surname.endsWith('s') ? surname + "es'" : surname + "s'"}`;
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : ''));
