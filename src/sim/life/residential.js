// Street life in the neighbourhoods: yards, porches, driveways, front walks and the door-to-door
// trades of a Saturday in 1953. See docs/LIFE.md.
//
//   run(L)        builds a Hood (a survey of every home: walls, porch, lawn, what already stands in
//                 the yard, who lives there), then
//   trades(R)     the milkman, the paperboy, two letter carriers, the iceman, the Fuller Brush man,
//                 the ice-cream truck, the knife grinder, the diaper van, the grocery boy, the
//                 doctor's house call, the TV man, a telegram and moving day at the Marlowe
//   planScenes(R) fills every hour on every street with yard, porch and kids' scenes (RECIPES),
//                 least-covered street first.
//
// Everything is a function of the clock. Vehicles really drive between their stops (Fleet: a frame
// hook moves them along the right-hand lanes of the street grid); carts, bikes, mowers and hoops go
// along with their people (Trails); smoke rises off burning leaves and jump ropes turn (hooks).
import { tm } from '../../core/util.js';
import { VS } from '../../core/config.js';
import { MAT } from '../../world/materials.js';
import { AVENUES, STREETS, GAPS } from '../../city/layout.js';

export function run(L) {
  const tA = Date.now();
  const R = new Hood(L);
  const prof = { survey: Date.now() - tA };
  L.ctx.resProf = prof;
  if (!R.homes.length) return R;
  const cpu = () => (typeof process !== 'undefined' && process.cpuUsage ? process.cpuUsage().user / 1000 : Date.now());
  const step = (name, fn) => { const t = Date.now(), c = cpu(); try { fn(R); } catch (e) { console.error('residential: ' + name + ' failed', e); } prof[name] = Date.now() - t; prof[name + 'Cpu'] = Math.round(cpu() - c); };
  step('trades', trades);
  step('doorways', doorways);
  step('lessons', pianoLessons);
  step('courting', courting);
  step('scenes', planScenes);
  step('diary', diary);
  return R;
}

const T = tm;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hhmm = (m) => { m = Math.round(m); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const LAWN = new Set(['grass_lawn', 'leaf_litter', 'dirt', 'mulch', 'grass', 'grass_dry', 'flowerbed_red', 'flowerbed_yellow', 'flowerbed_purple'].map((n) => MAT[n]).filter((v) => v !== undefined));
const PAVED = new Set(['sidewalk', 'sidewalk_brick', 'plaza_cream', 'concrete', 'gravel', 'asphalt_old', 'asphalt', 'curb'].map((n) => MAT[n]).filter((v) => v !== undefined));
const GLASSF = 8, NOCOL = 4;
const OFF5 = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];

// ================================================================ names & words
const surname = (H) => (H.P.household && H.P.household.surname) || (H.members[0] && H.members[0].last) || H.name.replace(/ Residence.*/, '');
const plural = (s) => (/(s|x|z|ch|sh)$/.test(s) ? s + 'es' : s + 's');
const the = (H) => `the ${plural(surname(H))}`;          // "the Novaks"
const theirs = (H) => `the ${plural(surname(H))}'`;      // "the Novaks'"
function mr(p) {
  if (!p) return 'somebody';
  if (p.title && /^(Mr|Mrs|Miss|Dr|Officer|Father|Rev)/.test(p.title)) return `${p.title} ${p.last}`;
  if (p.age < 17) return p.first;
  if (p.sex === 'M') return `Mr. ${p.last}`;
  const h = p.household, wed = h && h.members.some((q) => q !== p && q.sex === 'M' && q.age >= 18 && Math.abs(q.age - p.age) < 16);
  return (wed || p.age > 27) ? `Mrs. ${p.last}` : `Miss ${p.last}`;
}
const first = (p) => (p ? (p.nick && p.nick.length < 10 ? p.nick : p.first) : 'somebody');
const isKid = (p) => p.age >= 4 && p.age < 13;
const isTeen = (p) => p.age >= 13 && p.age < 19;
const isAdult = (p) => p.age >= 19;
const COSTUME = {
  robe: (p) => ({ torso: 10, arm: 0, top: p.sex === 'M' ? '#6a2e2a' : '#d8a8b8', top2: p.sex === 'M' ? '#6a2e2a' : '#d8a8b8', bottom: p.sex === 'M' ? '#3a3a40' : '#d8a8b8', hat: null }),
  apron: () => ({ torso: 6, top: '#f0ece2' }),
  painter: () => ({ torso: 5, arm: 1, top: '#e8e4d8', top2: '#e8e4d8', bottom: '#e8e4d8' }),
  shirtsleeves: () => ({ torso: 0, arm: 1, top: '#e8e4d8' }),
};

// ================================================================ the neighbourhood survey
class Hood {
  constructor(L) {
    this.L = L; this.ctx = L.ctx; this.rng = L.rng; this.nav = L.ctx.nav;
    this.world = L.ctx.world;
    this.claims = [];
    this.cov = new Map();       // street -> people in scenes per quarter hour
    this.used = new Set();      // `${house}@${quarter}` taken by a scene
    this.count = {};            // scene title -> instances
    this.spotCache = new Map();
    this._g = new Map();
    this._propIndex();
    this.homes = L.places.homes.map((P) => { try { return this.survey(P); } catch (e) { return null; } }).filter(Boolean);
    this.byName = new Map(this.homes.map((H) => [H.P.name, H]));
    this.fleet = new Fleet(this);
    this.trails = new Trails(this);
  }
  home(p) { const P = this.L.homePlace(p); return P ? this.byName.get(P.name) || null : null; }

  // ---------------------------------------------------------------- voxels
  // L.ground, cached by voxel column (the survey and the recipes ask about the same spots a lot)
  ground(x, z, yTop = 3) {
    const k = Math.floor(x / VS) * 73856093 ^ Math.floor(z / VS) * 19349663 ^ Math.floor(yTop / VS) * 83492791;
    let v = this._g.get(k);
    if (v === undefined) { v = this.L.ground(x, z, yTop); this._g.set(k, v); }
    return v;
  }
  mat(x, y, z) { return this.world.matAt(Math.floor(x / VS), Math.floor(y / VS), Math.floor(z / VS)); }
  solid(x, y, z) { const m = this.mat(x, y, z); return !!m && !(this.world.matFlags[m] & NOCOL); }
  glass(x, y, z) { const m = this.mat(x, y, z); return !!m && !!(this.world.matFlags[m] & GLASSF); }
  airCol(x, z, y0, y1) { for (let y = y0; y <= y1; y += VS) if (this.solid(x, y, z)) return false; return true; }
  groundMat(x, z, y) { return this.mat(x, y - 0.1, z); }

  // ---------------------------------------------------------------- props already standing
  _propIndex() {
    const P = this.ctx.props, cells = new Map();
    this.cells = cells;
    // only what stands in or in front of the homes matters here
    const want = new Set();
    for (const Q of this.L.places.homes) { const r = Q.rect; for (let x = Math.floor((r.x0 - 8) / 8); x <= Math.floor((r.x1 + 8) / 8); x++) for (let z = Math.floor((r.z0 - 8) / 8); z <= Math.floor((r.z1 + 8) / 8); z++) want.add(x + ',' + z); }
    for (let i = 0; i < P.n; i++) {
      if (P.tCat[i] === 250) continue;
      if (!want.has(Math.floor(P.tPos[i * 3] / 8) + ',' + Math.floor(P.tPos[i * 3 + 2] / 8))) continue;
      const t = P.types[P.tType[i]]; if (!t) continue;
      const name = t.name, d = t.def, s = (d.scale || 1 / 16) * P.tScale[i];
      const x = P.tPos[i * 3], y = P.tPos[i * 3 + 1], z = P.tPos[i * 3 + 2];
      if (y > 2.4 && name !== 'tv_antenna') continue; // upstairs & rooftop clutter doesn't matter on the ground
      const o = d.origin || [d.size[0] / 2, 0, d.size[2] / 2];
      let hx = d.size[0] * s / 2, hz = d.size[2] * s / 2, cx = (d.size[0] / 2 - o[0]) * s, cz = (d.size[2] / 2 - o[2]) * s;
      if (/^tree_|^pine_/.test(name)) { hx = hz = 0.45; cx = cz = 0; }
      const rec = { i, name, x, y, z, yaw: P.tYaw[i], hx, hz, cx, cz };
      const k = Math.floor(x / 8) + ',' + Math.floor(z / 8);
      let a = cells.get(k); if (!a) cells.set(k, (a = [])); a.push(rec);
    }
  }
  propsNear(x, z, r, y = null) {
    const out = [], k0 = Math.floor((x - r - 4) / 8), k1 = Math.floor((x + r + 4) / 8), j0 = Math.floor((z - r - 4) / 8), j1 = Math.floor((z + r + 4) / 8);
    for (let a = k0; a <= k1; a++) for (let b = j0; b <= j1; b++) {
      const c = this.cells.get(a + ',' + b); if (!c) continue;
      for (const q of c) if ((y === null || Math.abs(q.y - y) < 1.2) && this.propDist(q, x, z) < r) out.push(q);
    }
    return out;
  }
  propDist(q, x, z) {
    const c = Math.cos(q.yaw), s = Math.sin(q.yaw), dx = x - q.x, dz = z - q.z;
    const lx = c * dx - s * dz - q.cx, lz = s * dx + c * dz - q.cz;
    return Math.hypot(Math.max(0, Math.abs(lx) - q.hx), Math.max(0, Math.abs(lz) - q.hz));
  }

  // ---------------------------------------------------------------- claims (my own scenes' footprints)
  claim(x, z, r, t0, t1, tag = '') { this.claims.push({ x, z, r, t0: T(t0), t1: T(t1), tag }); }
  claimed(x, z, r, t0, t1) {
    t0 = T(t0); t1 = T(t1);
    for (const c of this.claims) if (c.t0 < t1 && c.t1 > t0 && Math.hypot(c.x - x, c.z - z) < c.r + r) return c;
    return null;
  }
  // Open ground at (x, z)? o: { r, y (expected ground), tol, lawn, paved, h (clear height), props:false, t0, t1, yTop }
  open(x, z, o = {}) {
    const r = o.r ?? 0.45;
    if (o.t0 !== undefined && this.claimed(x, z, r, o.t0, o.t1)) return false;
    const g = this.ground(x, z, o.yTop ?? 3);
    if (o.y !== undefined && Math.abs(g - o.y) > (o.tol ?? 0.12)) return false;
    const m = this.groundMat(x, z, g);
    if (!o.any && !((o.lawn !== false && LAWN.has(m)) || (o.paved !== false && PAVED.has(m)))) return false;
    const h = g + (o.h ?? 1.9);
    for (let k = 0; k < 5; k++) if (!this.airCol(x + OFF5[k][0] * r, z + OFF5[k][1] * r, g + 0.1, h)) return false;
    if (o.props !== false && this.propsNear(x, z, r, g).length) return false;
    return g;
  }

  // ---------------------------------------------------------------- the home survey
  survey(P) {
    if (!P.door || !P.rect) return null;
    const L = this.L;
    const H = { P, name: P.name, members: P.members || [], kind: P.kind };
    const [ux, uz] = P.u, [rx, rz] = P.r;
    const o0 = P.at(0, 0);
    H.side = (x, z) => (x - o0.x) * rx + (z - o0.z) * rz;
    H.out = (x, z) => (x - o0.x) * ux + (z - o0.z) * uz;
    H.at = (s, o) => P.at(s, o);
    H.ent = P.building.entrances.find((e) => e.main) || P.building.entrances[0];
    const r = P.rect;
    const s0 = H.side(r.x0, r.z0), s1 = H.side(r.x1, r.z1);
    H.lotL = Math.min(s0, s1); H.lotR = Math.max(s0, s1);
    const d0 = H.out(r.x0, r.z0), d1 = H.out(r.x1, r.z1);
    H.lotBack = Math.min(d0, d1);
    H.frontage = H.lotR - H.lotL; H.depth = -H.lotBack;
    H.apt = P.kind === 'apartment';
    H.row = !H.apt && H.frontage < 11;
    H.detached = !H.row && !H.apt;
    H.street = (P.building.address || '').replace(/^\d+\s*/, '') || (P.building.lot && P.building.lot.street) || '';
    H.number = parseInt(P.building.address, 10) || 0;
    const gy = [P.walk, P.at(-1.5, 1), P.at(1.5, 1), P.at(0, 3)].map((q) => L.ground(q.x, q.z)).sort((a, b) => a - b);
    H.lawnY = gy[2] ?? 0.25;
    H.doorOut = H.out(P.door.x, P.door.z);
    H.doorY = P.door.y;
    const yScan = H.lawnY + 1.55;
    const wallAt = (s) => { const p = H.at(s, H.doorOut - 0.15); return this.solid(p.x, yScan, p.z) || this.solid(p.x, yScan + 0.6, p.z); };
    let L0 = -0.6, R0 = 0.6;
    for (let s = 0.9; s < 25; s += 0.25) { if (s > H.lotR + 0.2) break; if (wallAt(s)) R0 = s; else if (s > 1.4) break; }
    for (let s = -0.9; s > -25; s -= 0.25) { if (s < H.lotL - 0.2) break; if (wallAt(s)) L0 = s; else if (s < -1.4) break; }
    H.faceL = L0; H.faceR = R0;
    let last = H.doorOut;
    for (let d = H.doorOut - 0.25; d > H.lotBack + 0.5; d -= 0.25) {
      const hit = [-0.15, -0.05, 0.08].some((e) => { const p = H.at(H.faceR + e, d); return this.solid(p.x, yScan, p.z) || this.solid(p.x, yScan + 0.7, p.z); });
      if (hit) last = d; else if (d < last - 1.6) break;
    }
    H.backOut = Math.min(H.doorOut - 4, last);
    // porch / stoop floor in front of the door
    let porchOut = H.doorOut;
    for (let d = H.doorOut + 0.3; d < 0; d += 0.25) { const p = H.at(0, d); const g = L.ground(p.x, p.z, H.doorY + 0.4); if (g > H.lawnY + 0.12 && g > H.doorY - 0.3) porchOut = d; else break; }
    H.porchOut = porchOut;
    let pL = 0, pR = 0;
    if (porchOut > H.doorOut + 0.6) {
      const d = H.doorOut + 0.7;
      for (let s = 0.25; s < 12; s += 0.25) { const p = H.at(s, d); if (Math.abs(L.ground(p.x, p.z, H.doorY + 0.4) - H.doorY) < 0.15) pR = s; else break; }
      for (let s = -0.25; s > -12; s -= 0.25) { const p = H.at(s, d); if (Math.abs(L.ground(p.x, p.z, H.doorY + 0.4) - H.doorY) < 0.15) pL = s; else break; }
    }
    H.porchL = pL; H.porchR = pR;
    H.hasPorch = porchOut > H.doorOut + 1.2 && pR - pL > 2.5;
    let stepEnd = porchOut;
    for (let d = porchOut + 0.25; d < 0; d += 0.25) { const p = H.at(0, d); if (L.ground(p.x, p.z, H.doorY + 0.4) > H.lawnY + 0.08) stepEnd = d; else break; }
    H.stepEnd = stepEnd;
    H.yardFront = Math.max(H.porchOut, H.stepEnd, H.doorOut);   // the lawn runs from here out to the fence
    H.props = this.propsNear((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, Math.hypot(r.x1 - r.x0, r.z1 - r.z0) / 2).filter((q) => q.x >= r.x0 - 0.3 && q.x <= r.x1 + 0.3 && q.z >= r.z0 - 0.3 && q.z <= r.z1 + 0.3);
    H.antenna = H.props.find((q) => q.name === 'tv_antenna') || null;
    H.leafPiles = H.props.filter((q) => q.name === 'leaf_pile' && H.out(q.x, q.z) > H.doorOut);
    H.frontTree = H.props.find((q) => /^tree_/.test(q.name) && H.out(q.x, q.z) > H.doorOut + 1) || null;
    H.drive = null;
    for (const side of [H.lotL + 1.4, H.lotR - 1.4]) {
      const p = H.at(side, -2.5), q = H.at(side, H.doorOut - 1);
      if (PAVED.has(this.groundMat(p.x, p.z, H.lawnY + 0.02)) && PAVED.has(this.groundMat(q.x, q.z, H.lawnY + 0.02)) && (side < H.faceL || side > H.faceR)) H.drive = side;
    }
    H.babies = H.members.filter((p) => p.age <= 2);
    H.kids = H.members.filter(isKid);
    H.old = H.members.length > 0 && H.members.every((p) => p.age >= 60);
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    H.along = Math.abs(ux) > 0 ? cz : cx;
    H.zone = H.street + ':' + Math.floor((H.along + 400) / 90);
    H.x = cx; H.z = cz;
    return H;
  }

  // ---------------------------------------------------------------- spots around a house
  // somebody calling at the front door (facing it), on the porch or stoop; side = metres along the facade
  callerSpot(H, side = 0, o = {}) {
    const key = H.name + ':caller:' + side + ':' + (o.act || '') + ':' + (o.back ?? '');
    if (this.spotCache.has(key)) return this.spotCache.get(key);
    const p = H.at(side, H.doorOut + (o.back ?? 0.8));
    const y = this.ground(p.x, p.z, H.doorY + 0.45);
    const s = this.L.spot(p.x, p.z, { y, yaw: H.P.yawIn, act: o.act || 'stand', link: H.ent ? H.ent.node : undefined });
    this.spotCache.set(key, s);
    return s;
  }
  // somebody standing in their own doorway, facing out (linked to the door, so they come from inside)
  hostSpot(H, o = {}) {
    const key = H.name + ':host:' + (o.act || '');
    if (this.spotCache.has(key)) return this.spotCache.get(key);
    const p = H.at(0, H.doorOut + 0.3);
    const s = this.L.spot(p.x, p.z, { y: H.doorY, yaw: H.P.yawOut, act: o.act || 'talk', link: H.ent ? H.ent.door : undefined });
    this.spotCache.set(key, s);
    return s;
  }
  // a point on the porch floor / stoop beside the door (bottles, papers, a pie on the step)
  stoopPoint(H, side = 0.45, back = 0.5) {
    for (const s of [side, -side, side * 1.8, -side * 1.8]) {
      const p = H.at(s, H.doorOut + back);
      const y = this.ground(p.x, p.z, H.doorY + 0.45);
      if (!this.propsNear(p.x, p.z, 0.22, y).length) return { x: p.x, z: p.z, y };
    }
    const p = H.at(side, H.doorOut + back);
    return { x: p.x, z: p.z, y: this.ground(p.x, p.z, H.doorY + 0.45) };
  }
  // a spot anywhere (ground found automatically unless o.y), cached by position+options
  spotAt(x, z, o = {}) {
    const key = `${x.toFixed(2)},${z.toFixed(2)},${o.act || ''},${o.pose || ''},${o.yaw !== undefined ? o.yaw.toFixed(2) : ''},${o.faceTo ? o.faceTo.join(':') : ''},${o.pace || 0},${o.y ?? ''},${o.hidden ? 1 : 0},${o.seat ?? ''},${o.link ?? ''},${o.spread || 0}`;
    if (this.spotCache.has(key)) return this.spotCache.get(key);
    const s = o.hidden ? this.L.offstage(x, z, { y: o.y }) : this.L.spot(x, z, { ...o, y: o.y ?? this.ground(x, z, o.yTop ?? 3) });
    this.spotCache.set(key, s);
    return s;
  }
  spotH(H, side, out, o = {}) { const p = H.at(side, out); return this.spotAt(p.x, p.z, o); }
  // Free points on the front lawn, best first. o: { r, t0, t1, near:[side,out], gapHouse, gapFence, walkGap }
  // The front yard as a grid of 25 cm cells: free = open lawn you could stand on (no walk, wall,
  // fence, hedge, porch or prop). Built once per house; clearances come from the nearest blocked cell.
  lawnMask(H) {
    if (H._mask) return H._mask;
    const st = 0.5, s0 = H.lotL, o0 = H.yardFront + 0.2, ns = Math.max(1, Math.round((H.lotR - H.lotL) / st)), no = Math.max(1, Math.round((-0.1 - o0) / st));
    const free = new Uint8Array(ns * no);
    for (let j = 0; j < no; j++) for (let i = 0; i < ns; i++) {
      const sd = s0 + (i + 0.5) * st, od = o0 + (j + 0.5) * st;
      if (Math.abs(sd) < 0.75 || (H.drive !== null && Math.abs(sd - H.drive) < 1.6)) continue;
      const p = H.at(sd, od), g = H.lawnY;
      if (!LAWN.has(this.mat(p.x, g - 0.1, p.z))) continue;
      if (this.solid(p.x, g + 0.3, p.z) || this.solid(p.x, g + 0.9, p.z) || this.solid(p.x, g + 1.6, p.z)) continue;
      free[j * ns + i] = 1;
    }
    for (const q of H.props) { // props: block every cell under their footprint
      const qs = H.side(q.x, q.z), qo = H.out(q.x, q.z), ext = Math.max(q.hx, q.hz) + Math.hypot(q.cx, q.cz) + 0.1;
      for (let j = Math.floor((qo - ext - o0) / st); j <= Math.floor((qo + ext - o0) / st); j++) for (let i = Math.floor((qs - ext - s0) / st); i <= Math.floor((qs + ext - s0) / st); i++) {
        if (i < 0 || j < 0 || i >= ns || j >= no) continue;
        const p = H.at(s0 + (i + 0.5) * st, o0 + (j + 0.5) * st);
        if (this.propDist(q, p.x, p.z) < 0.25) free[j * ns + i] = 0;
      }
    }
    // chamfer distance transform: metres from each cell to the nearest blocked cell (or the yard's edge)
    const dist = new Float32Array(ns * no), D = 1.4142;
    for (let j = 0; j < no; j++) for (let i = 0; i < ns; i++) {
      const k = j * ns + i;
      if (!free[k]) { dist[k] = 0; continue; }
      let v = Math.min(i + 1, j + 1, ns - i, no - j);
      if (i > 0) v = Math.min(v, dist[k - 1] + 1);
      if (j > 0) { v = Math.min(v, dist[k - ns] + 1); if (i > 0) v = Math.min(v, dist[k - ns - 1] + D); if (i < ns - 1) v = Math.min(v, dist[k - ns + 1] + D); }
      dist[k] = v;
    }
    for (let j = no - 1; j >= 0; j--) for (let i = ns - 1; i >= 0; i--) {
      const k = j * ns + i; let v = dist[k]; if (!v) continue;
      if (i < ns - 1) v = Math.min(v, dist[k + 1] + 1);
      if (j < no - 1) { v = Math.min(v, dist[k + ns] + 1); if (i < ns - 1) v = Math.min(v, dist[k + ns + 1] + D); if (i > 0) v = Math.min(v, dist[k + ns - 1] + D); }
      dist[k] = v;
    }
    H._mask = { st, s0, o0, ns, no, free, dist };
    return H._mask;
  }
  // clearance (metres) around a front-yard point: distance to the nearest non-free cell
  clearance(H, sd, od, cap = 1.7) {
    const { st, s0, o0, ns, no, dist } = this.lawnMask(H);
    const i = Math.floor((sd - s0) / st), j = Math.floor((od - o0) / st);
    if (i < 0 || j < 0 || i >= ns || j >= no) return 0;
    return Math.min(cap, Math.max(0, dist[j * ns + i] - 0.5) * st);
  }
  // free points on the front lawn, best first. o: { r, t0, t1, near:[side,out], gapHouse, gapFence, walkGap }
  frontLawn(H, o = {}) {
    if (!H.detached) return [];
    if (!H._lawn) {
      H._lawn = [];
      for (let out = -0.7; out >= H.yardFront + 0.8; out -= 0.5) for (let sd = H.lotL + 0.8; sd <= H.lotR - 0.8; sd += 0.5) {
        const r = this.clearance(H, sd, out) - 0.12;
        if (r < 0.5) continue;
        const p = H.at(sd, out);
        H._lawn.push({ s: sd, out, x: p.x, z: p.z, y: H.lawnY, r });
      }
    }
    const r = o.r ?? 0.55, outFar = H.yardFront + (o.gapHouse ?? 1.0), outNear = -(o.gapFence ?? 0.9), wg = o.walkGap ?? 1.0;
    const pts = H._lawn.filter((q) => q.r >= r - 1e-6 && q.out <= outNear && q.out >= outFar && Math.abs(q.s) >= wg && (o.t0 === undefined || !this.claimed(q.x, q.z, r, o.t0, o.t1)));
    if (o.near) pts.sort((a, b) => Math.hypot(a.s - o.near[0], a.out - o.near[1]) - Math.hypot(b.s - o.near[0], b.out - o.near[1]));
    else this.rng.shuffle(pts);
    return pts;
  }
  // is a lawn point (world x, z) clear to radius r (and unclaimed)?
  lawnFree(H, x, z, r, t0, t1) {
    const sd = H.side(x, z), od = H.out(x, z);
    if (od > -0.3 || od < H.yardFront) return false;
    if (this.clearance(H, sd, od, r + 0.2) < r) return false;
    return t0 === undefined || !this.claimed(x, z, r, t0, t1);
  }
  // a free point on the public sidewalk in front of a house (out 0.5..3.6)
  sidewalk(H, side, out = 2, o = {}) {
    for (const ds of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, 3.2, -3.2]) {
      const p = H.at(side + ds, out);
      if (this.open(p.x, p.z, { r: o.r ?? 0.35, t0: o.t0, t1: o.t1, lawn: false, h: 1.7 }) !== false) return { s: side + ds, out, x: p.x, z: p.z };
    }
    return null;
  }
  // ---------------------------------------------------------------- walls, windows, eaves
  // windows on the front wall between heights y0..y1: [{s, w, lo, hi}]
  frontWindows(H, y0, y1) {
    const cols = [];
    for (let s = H.faceL + 0.3; s <= H.faceR - 0.3; s += 0.25) {
      const p = H.at(s, H.doorOut - 0.12);
      let lo = null, hi = null;
      for (let y = y0; y <= y1; y += VS) if (this.glass(p.x, y, p.z)) { if (lo === null) lo = y; hi = y; }
      if (lo !== null) cols.push({ s, lo, hi });
    }
    const wins = [];
    for (const c of cols) { const w = wins[wins.length - 1]; if (w && c.s - w.s1 < 0.3) { w.s1 = c.s; w.lo = Math.min(w.lo, c.lo); w.hi = Math.max(w.hi, c.hi); } else wins.push({ s0: c.s, s1: c.s, lo: c.lo, hi: c.hi }); }
    for (const w of wins) { w.s = (w.s0 + w.s1) / 2; w.w = w.s1 - w.s0 + 0.25; }
    return wins.filter((w) => w.w >= 0.5);
  }
  // top of the front wall above side s (the eave, where the gutter hangs)
  eaveAt(H, s) {
    const p = H.at(s, H.doorOut - 0.12);
    let y = H.lawnY + 2;
    while (y < H.lawnY + 12 && this.solid(p.x, y, p.z)) y += VS;
    return y;
  }
  // is the air clear along a ladder from foot (out f) to the wall (out w) at side s, h metres up?
  ladderClear(H, s, footOut, wallOut, h) {
    for (let k = 0.12; k < 0.93; k += 0.07) {
      const out = footOut + (wallOut - footOut) * k, y = H.lawnY + h * k;
      for (const ds of [-0.25, 0.25]) { const p = H.at(s + ds, out); if (this.solid(p.x, y + 0.1, p.z) || this.solid(p.x, y + 0.35, p.z)) return false; }
    }
    return true;
  }

  // ---------------------------------------------------------------- people
  isHomeEntry(p, e) {
    if (!e || !e.spot || e.route) return false;
    const b = p.home && p.home.building;
    return !!b && e.spot.building === b;
  }
  // at home (inside, yard or porch) for the whole window according to their own day
  homebody(p, t0, t1) {
    t0 = T(t0); t1 = T(t1);
    let cur = null;
    for (const e of p.schedule) {
      if (e.t <= t0) cur = e;
      else if (e.t < t1 && !this.isHomeEntry(p, e)) return false;
    }
    return this.isHomeEntry(p, cur);
  }
  idle(p, t0, t1) { return !!p && this.L.idle(p, T(t0), T(t1)); }
  // n people for a scene at H: the household first, then the nearest neighbours; homebodies only unless o.anywhere.
  // o: { filter, radius, anywhere, household, exclude, prefer }
  cast(H, t0, t1, n, o = {}) {
    t0 = T(t0); t1 = T(t1);
    const filter = o.filter || (() => true), ex = o.exclude || [];
    const ok = (p) => !ex.includes(p) && filter(p) && this.idle(p, t0, t1) && (o.anywhere || this.homebody(p, t0, t1));
    const pool = H.members.filter(ok);
    if (o.prefer) pool.sort((a, b) => (o.prefer(b) ? 1 : 0) - (o.prefer(a) ? 1 : 0));
    if (pool.length >= n || o.household) return pool.slice(0, n);
    if (!H._near) H._near = this.homes.filter((Q) => Q !== H).map((Q) => ({ Q, d: Math.hypot(Q.P.door.x - H.P.door.x, Q.P.door.z - H.P.door.z) })).filter((q) => q.d < 200).sort((a, b) => a.d - b.d);
    const want = o.anywhere ? n * 3 : n, rad = o.radius ?? 75, near = [];
    for (const { Q, d } of H._near) {
      if (d > rad || pool.length + near.length >= want) break;
      for (const p of Q.members) if (ok(p)) { near.push(p); if (pool.length + near.length >= want) break; }
    }
    if (o.anywhere) near.sort((a, b) => (this.homebody(b, t0, t1) ? 1 : 0) - (this.homebody(a, t0, t1) ? 1 : 0));
    return pool.concat(near).slice(0, n);
  }

  // ---------------------------------------------------------------- bookkeeping
  scene(title, H, t0, t1, people, where = null) {
    t0 = T(t0); t1 = T(t1);
    const x = where ? where.x : H.P.door.x, z = where ? where.z : H.P.door.z;
    this.L.scene(title, x, z, t0, t1, people.length);
    (this.ctx.resScenes = this.ctx.resScenes || []).push({ title, x, z, t0, t1, people });
    this.count[title] = (this.count[title] || 0) + 1;
    const key = (where && where.street) || (H ? H.street : 'town');
    let c = this.cov.get(key); if (!c) this.cov.set(key, (c = new Float32Array(96)));
    for (let q = Math.floor(t0 / 15); q < Math.ceil(t1 / 15) && q < 96; q++) c[q] += people.length;
    if (H) for (let q = Math.floor(t0 / 15); q < Math.ceil(t1 / 15); q++) this.used.add(H.name + '@' + q);
  }
  busyHouse(H, t0, t1) { for (let q = Math.floor(T(t0) / 15); q < Math.ceil(T(t1) / 15); q++) if (this.used.has(H.name + '@' + q)) return true; return false; }
  coverage(street, t0, t1) { const c = this.cov.get(street); if (!c) return 0; let s = 0, n = 0; for (let q = Math.floor(T(t0) / 15); q < Math.ceil(T(t1) / 15); q++) { s += c[q] || 0; n++; } return n ? s / n : 0; }
  totalAt(t) { let s = 0; const q = Math.floor(T(t) / 15); for (const c of this.cov.values()) s += c[q] || 0; return s; }

  // ---------------------------------------------------------------- timing
  walkMin(p, a, b, speed = null) {
    if (a < 0 || b < 0 || a === b) return 0.2;
    const nv = this.nav, sd = Math.hypot(nv.x[a] - nv.x[b], nv.z[a] - nv.z[b]);
    // short hops (door to door along a street): a generous estimate beats running A* for every stop
    // (arriving a little early just means a slightly longer stop)
    if (sd < 28) return (sd * 1.75 + 2) / ((speed || p.speed) * 60) + 0.1;
    const path = this.nav.path(a, b);
    if (!path) return 1.5;
    let d = 0; for (let i = 1; i < path.length; i++) d += Math.hypot(this.nav.x[path[i]] - this.nav.x[path[i - 1]], this.nav.y[path[i]] - this.nav.y[path[i - 1]], this.nav.z[path[i]] - this.nav.z[path[i - 1]]);
    return d / ((speed || p.speed) * 60) + 0.1;
  }
  // remember where/when a diary-worthy thing happens: seen('leaf', {t0, t1, x, y, z} | {t0, t1, p})
  seen(key, q) { (this.seenList = this.seenList || {}); (this.seenList[key] = this.seenList[key] || []).push({ ...q, t0: T(q.t0), t1: T(q.t1) }); }
  // a running itinerary: it = R.day(p, t0); it.go(spot, dwell, {act,label,held,arms}); it.commit()
  day(p, t0, o = {}) { return new Itinerary(this, p, t0, o); }
  // leaf smoke rising off a fire from t0 to t1 (animated in planScenes' hook)
  smoke(x, y, z, t0, t1) { const h = []; for (let i = 0; i < 5; i++) { const q = this.L.timed('smoke_puff', x, z, i, t0, t1, { y, r: 140 }); if (!q.dummy) h.push(q); } (this.smokes = this.smokes || []).push({ x, y, z, h }); }
  // a timed prop that turns about its long axis (a jump rope)
  spin(h, rate) { if (h && !h.dummy) (this.spinners = this.spinners || []).push({ h, rate }); }
}

// ================================================================ itineraries (rounds, trades)
class Itinerary {
  constructor(R, p, t0, o) { this.R = R; this.p = p; this.t0 = T(t0); this.t = T(t0); this.entries = []; this.node = o.from ?? R.L.whereAt(p, this.t0); this.o = o; this.speed = o.speed || null; }
  // walk to spot (or appear there with teleport), then stay `dwell` minutes. Returns the arrival time.
  go(spot, dwell = 1, o = {}) {
    if (!spot) return this.t;
    const start = this.t;
    const w = o.teleport ? 0.02 : this.R.walkMin(this.p, this.node, spot.node, o.speed || this.speed);
    this.entries.push({ t: start, spot, act: o.act || spot.act, label: o.label ?? this.o.label, held: o.held === undefined ? this.o.held : o.held, arms: o.arms || null, speed: o.teleport ? 5000 : (o.speed || this.speed || null), costume: o.costume || this.o.costume || null });
    const arrive = start + w;
    this.t = arrive + dwell;
    this.node = spot.node;
    return arrive;
  }
  wait(min) { this.t += min; return this.t; }
  until(t) { this.t = Math.max(this.t, T(t)); return this.t; }
  commit(o = {}) {
    const end = o.end ?? this.t + 0.3;
    if (!this.entries.length) return end;
    this.R.L.plan(this.p, this.t0, end, this.entries, { noResume: o.noResume, lines: o.lines, label: this.o.label });
    return end;
  }
}

// ================================================================ the Spotter's Diary
// A few of the neighbourhood's most particular sights. Things that happen in several places are one
// diary item whose point follows whichever instance is happening right now (R.now, set every frame).
function diary(R) {
  const L = R.L, S = R.seenList || {};
  const multi = (key, o) => {
    const list = (S[key] || []).sort((a, b) => a.t0 - b.t0);
    if (!list.length) return;
    const cur = () => { const m = R.now ?? -1; return list.find((q) => m >= q.t0 && m < q.t1) || null; };
    L.spottable({ ...o, t0: list[0].t0, t1: Math.max(...list.map((q) => q.t1)), r: o.r ?? 1.2, range: o.range ?? 24,
      get x() { const q = cur(); return q ? (q.p ? q.p.state.x : q.x) : 0; },
      get y() { const q = cur(); return q ? (q.p ? q.p.state.y + 1.1 : q.y) : -1000; },
      get z() { const q = cur(); return q ? (q.p ? q.p.state.z : q.z) : 0; } });
  };
  const one = (key, o) => { const q = (S[key] || [])[0]; if (q && q.p) L.spottable({ ...o, person: q.p, t0: q.t0, t1: q.t1 }); };
  one('milkman', { id: 'res_milkman', cat: 'Only at certain times', what: 'The milkman with his wire carrier of quarts', hint: 'Before breakfast — the captains\' houses on Hillcrest first' });
  one('paperboy', { id: 'res_paperboy', cat: 'Only at certain times', what: 'The paperboy tossing the Courier onto porches', hint: 'Dawn on Maple Street (his chain comes off at Elm)' });
  one('iceman', { id: 'res_iceman', cat: 'Only at certain times', what: 'The iceman with a block in his tongs', hint: 'Mid-morning; follow the kids begging for chips' });
  one('fuller', { id: 'res_fuller', cat: 'Townsfolk', what: 'The Fuller Brush man at somebody\'s door', hint: 'All day around Maple Street — look for his maroon Plymouth' });
  one('grinder', { id: 'res_grinder', cat: 'Only at certain times', what: 'The knife grinder at his wheel', hint: 'Late morning, east end of Church and Maple — listen for a bell' });
  one('icecream', { id: 'res_icetruck', cat: 'Only at certain times', what: 'A queue of kids at the ice-cream truck', hint: 'After two — listen for the bell on the side streets' });
  multi('antenna', { id: 'res_antenna', cat: 'Townsfolk', what: 'A husband on the roof, fixing the TV antenna', hint: 'Somebody\'s picture is snowing — look up at the rooftops', range: 30 });
  multi('leaf', { id: 'res_leafjump', cat: 'Townsfolk', what: 'Kids leaping into a pile of raked leaves', hint: 'Front lawns, once the raking\'s done' });
  multi('lemonade', { id: 'res_lemonade', cat: 'Around town', what: 'A kids\' lemonade stand (five cents a glass)', hint: 'Side-street sidewalks, late morning or late afternoon' });
  multi('moving', { id: 'res_moving', cat: 'Only at certain times', what: 'A family moving in, furniture on the sidewalk', hint: 'The Marlowe Apartments, Church Street, in the morning', range: 30 });
}

// ================================================================ vehicles that really drive
const DIRV = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
const RIGHT = { N: 'E', E: 'S', S: 'W', W: 'N' }, LEFT = { N: 'W', W: 'S', S: 'E', E: 'N' }, BACK = { N: 'S', S: 'N', E: 'W', W: 'E' };
const XS = AVENUES.map((a) => a.x), ZS = STREETS.map((s) => s.z);
const dirOfYaw = (yaw) => { const x = Math.sin(yaw), z = Math.cos(yaw); return Math.abs(x) > Math.abs(z) ? (x > 0 ? 'E' : 'W') : (z > 0 ? 'S' : 'N'); };
const near1 = (arr, v) => arr.reduce((b, a) => (Math.abs(a - v) < Math.abs(b - v) ? a : b), arr[0]);
const laneOff = (d) => { const r = DIRV[RIGHT[d]]; return [r[0] * 3, r[1] * 3]; };
const gapBetween = (x, za, zb) => GAPS.some((g) => { const a = AVENUES.find((q) => q.name === g.avenue); return a && a.x === x && Math.min(za, zb) < g.z1 - 1 && Math.max(za, zb) > g.z0 + 1; });
function stepNode(n, d) {
  const i = XS.indexOf(n.x), j = ZS.indexOf(n.z);
  let m = null;
  if (d === 'E' && i < XS.length - 1) m = { x: XS[i + 1], z: n.z };
  if (d === 'W' && i > 0) m = { x: XS[i - 1], z: n.z };
  if (d === 'S' && j < ZS.length - 1) m = { x: n.x, z: ZS[j + 1] };
  if (d === 'N' && j > 0) m = { x: n.x, z: ZS[j - 1] };
  if (m && (d === 'N' || d === 'S') && gapBetween(n.x, n.z, m.z)) return null;
  return m;
}
// curb point {x,z,yaw} -> the street line it's on, its heading and its lane
function curbInfo(c) {
  const d = dirOfYaw(c.yaw);
  const ew = d === 'E' || d === 'W';
  const line = ew ? near1(ZS, c.z) : near1(XS, c.x);
  const off = laneOff(d);
  const lane = ew ? { x: c.x, z: line + off[1] } : { x: line + off[0], z: c.z };
  return { d, ew, line, lane, v: DIRV[d] };
}
// right-hand-lane polyline over the street grid from curb A to curb B
function driveRoute(A, B) {
  const a = curbInfo(A), b = curbInfo(B);
  const pts = [[A.x, A.z], [a.lane.x + a.v[0] * 5, a.lane.z + a.v[1] * 5]];
  const al = (p, v) => p.x * v[0] + p.z * v[1];
  const tail = () => { pts.push([b.lane.x - b.v[0] * 7, b.lane.z - b.v[1] * 7], [B.x, B.z]); return pts; };
  if (a.ew === b.ew && a.line === b.line && a.d === b.d && al(B, a.v) - al(A, a.v) > 14) return tail();
  const cross = (c, info, sgnDir) => {
    const arr = info.ew ? XS : ZS, pos = info.ew ? c.x : c.z, sgn = (info.ew ? info.v[0] : info.v[1]) * sgnDir;
    const cand = arr.filter((q) => (q - pos) * sgn > 3).sort((p, q) => Math.abs(p - pos) - Math.abs(q - pos))[0];
    return cand === undefined ? null : (info.ew ? { x: cand, z: info.line } : { x: info.line, z: cand });
  };
  const I0 = cross(A, a, 1), I1 = cross(B, b, -1);
  if (!I0 || !I1) return null;
  const key = (n, h) => `${n.x},${n.z},${h}`;
  const prev = new Map(); const q = [[I0, a.d]]; prev.set(key(I0, a.d), null);
  let goal = null;
  while (q.length) {
    const [n, h] = q.shift();
    if (n.x === I1.x && n.z === I1.z && b.d !== BACK[h]) { goal = [n, h]; break; }
    for (const d of [h, LEFT[h], RIGHT[h]]) {
      const m = stepNode(n, d); if (!m) continue;
      const k = key(m, d); if (prev.has(k)) continue;
      prev.set(k, [n, h]); q.push([m, d]);
    }
  }
  if (!goal) return null;
  const chain = []; let cur = goal;
  while (cur) { chain.unshift(cur); cur = prev.get(key(cur[0], cur[1])); }
  chain.forEach(([n, hin], i) => {
    const hout = i + 1 < chain.length ? chain[i + 1][1] : b.d;
    const o1 = laneOff(hin), o2 = laneOff(hout);
    pts.push(hin === hout ? [n.x + o1[0], n.z + o1[1]] : [n.x + o1[0] + o2[0], n.z + o1[1] + o2[1]]);
  });
  return tail();
}
function polyline(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, len: cum[cum.length - 1] }; }
function alongPl(pl, s) {
  const { pts, cum } = pl; s = clamp(s, 0, pl.len);
  let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
  const k = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
}

// Trade vehicles. Parked stops are ordinary L.timed props (so the curb-parking module leaves room
// for them); between stops a second handle drives the route, moved by a frame hook.
class Fleet {
  constructor(R) { this.R = R; this.list = []; R.L.every((rt) => this.update(rt)); }
  add(type, o = {}) {
    const L = this.R.L, self = this;
    const v = { type, legs: [], cur: null, since: null, speed: o.speed || 6.5, len: o.len || 5 };
    v.h = L.ctx.props.addDynamic(type, { tint: o.tint, tint2: o.tint2 });
    v.h.visible = false;
    v.parkAt = (c, t) => { v.cur = c; v.since = T(t); };
    v.close = (t1) => {
      if (!v.cur || v.since === null || T(t1) <= v.since) return;
      L.timed(type, v.cur.x, v.cur.z, v.cur.yaw, v.since, T(t1), { tint: o.tint, tint2: o.tint2, y: 0.02 });
      self.reserve(v.cur, v.since, T(t1), v.len);
      if (o.label) L.label(v.cur.x, 1.4, v.cur.z, v.since, T(t1), o.label, 2.6);
    };
    // drive from the current curb to curb c, leaving at t; returns the arrival time
    v.drive = (t, c) => {
      t = T(t);
      if (!v.cur) { v.parkAt(c, t); return t; }
      v.close(t);
      const pts = driveRoute(v.cur, c);
      if (!pts) { v.parkAt(c, t + 0.5); return t + 0.5; }
      const pl = polyline(pts), dur = pl.len / v.speed / 60 + 0.1;
      v.legs.push({ t0: t, t1: t + dur, pl, hold: true });
      v.parkAt(c, t + dur);
      return t + dur;
    };
    // come up the street and pull in to curb c, arriving at t
    v.enter = (t, c) => {
      t = T(t);
      const info = curbInfo(c), back = o.enterFrom || 70;
      const pl = polyline([[info.lane.x - info.v[0] * back, info.lane.z - info.v[1] * back], [info.lane.x - info.v[0] * 7, info.lane.z - info.v[1] * 7], [c.x, c.z]]);
      const dur = pl.len / v.speed / 60 + 0.1;
      v.legs.push({ t0: t - dur, t1: t, pl, hold: true });
      v.parkAt(c, t);
      return t;
    };
    // pull out at t and drive off down the street, then vanish
    v.leave = (t) => {
      t = T(t);
      if (!v.cur) return t;
      v.close(t);
      const info = curbInfo(v.cur);
      const pl = polyline([[v.cur.x, v.cur.z], [info.lane.x + info.v[0] * 6, info.lane.z + info.v[1] * 6], [info.lane.x + info.v[0] * 85, info.lane.z + info.v[1] * 85]]);
      const dur = pl.len / v.speed / 60;
      v.legs.push({ t0: t, t1: t + dur, pl, hold: false });
      v.cur = null;
      return t + dur;
    };
    this.list.push(v);
    return v;
  }
  // stand-in entries in the timed registry so the curb-parking module keeps the stop clear
  reserve(c, t0, t1, len) {
    const L = this.R.L, v = DIRV[dirOfYaw(c.yaw)];
    for (const k of [-1, 1]) L.life.timed.push({ h: { x: c.x + v[0] * k * len * 0.45, z: c.z + v[1] * k * len * 0.45, visible: false, stub: true }, t0, t1, r: 0 });
  }
  update(rt) {
    const m = rt.minutes, cam = rt.cam;
    this.R.now = m;
    for (const v of this.list) {
      const h = v.h; if (h.dummy) continue;
      let show = false;
      for (const g of v.legs) {
        if (m < g.t0 || m >= g.t1 + (g.hold ? 0.08 : 0)) continue;
        const u = clamp((m - g.t0) / (g.t1 - g.t0), 0, 1), e = u * u * (3 - 2 * u), s = e * g.pl.len;
        const [x, z] = alongPl(g.pl, s), [ax, az] = alongPl(g.pl, s - 1.6), [bx, bz] = alongPl(g.pl, s + 1.6);
        if (Math.abs(bx - ax) + Math.abs(bz - az) > 0.01) h.yaw = Math.atan2(bx - ax, bz - az);
        h.x = x; h.z = z; h.y = 0.02;
        show = true; break;
      }
      h.visible = show && !!cam && Math.abs(h.x - cam.x) < 170 && Math.abs(h.z - cam.z) < 170;
    }
  }
}

// ================================================================ props that go along with people
// Like L.follow, but a trail can "park": when its person stops walking the prop stays where it
// was (a bicycle left at the curb, the grinder's cart); park windows pin it somewhere explicit;
// spin() animates it (a rolling hoop). o: { side, fwd, y, yawOff, t0, t1, when:'walk'|'always',
// park, parks:[{t0,t1,x,z,yaw,y}], spin, tint, scale }
class Trails {
  constructor(R) { this.R = R; this.list = []; R.L.every((rt) => this.update(rt)); }
  add(p, type, o = {}) {
    const h = this.R.L.ctx.props.addDynamic(type, { tint: o.tint, tint2: o.tint2, scale: o.scale });
    if (h.dummy) return null;
    h.visible = false;
    const tr = { p, h, side: o.side || 0, fwd: o.fwd ?? 0.9, y: o.y || 0, yawOff: o.yawOff || 0, t0: o.t0 !== undefined ? T(o.t0) : 0, t1: o.t1 !== undefined ? T(o.t1) : 1440, when: o.when || 'walk', park: !!o.park, parks: (o.parks || []).map((q) => ({ ...q, t0: T(q.t0), t1: T(q.t1) })), spin: o.spin || null, last: null, ph: 0 };
    this.list.push(tr);
    return tr;
  }
  update(rt) {
    const m = rt.minutes, cam = rt.cam;
    if (!cam) return;
    for (const tr of this.list) {
      const h = tr.h, S = tr.p.state;
      if (m < tr.t0 || m >= tr.t1 || Math.abs(S.x - cam.x) > 150 || Math.abs(S.z - cam.z) > 150) { h.visible = false; tr.last = null; continue; }
      const pk = tr.parks.find((q) => m >= q.t0 && m < q.t1);
      if (pk) { h.x = pk.x; h.z = pk.z; h.y = pk.y ?? 0.25; h.yaw = pk.yaw; h.pitch = 0; h.visible = true; continue; }
      const P = tr.p.ch && tr.p.ch.pose;
      if (!P || !P.visible) { h.visible = false; continue; }
      const walking = S.mode === 'walk';
      if (walking || tr.when === 'always') {
        const yaw = P.yaw, s = Math.sin(yaw), c = Math.cos(yaw);
        h.x = P.x + s * tr.fwd + c * tr.side; h.z = P.z + c * tr.fwd - s * tr.side; h.y = P.y + tr.y; h.yaw = yaw + tr.yawOff;
        if (tr.spin) { tr.ph += rt.dt * (walking || tr.when === 'always' ? 1 : 0); h.pitch = tr.spin(tr.ph, rt); }
        tr.last = { x: h.x, z: h.z, y: h.y, yaw: h.yaw };
        h.visible = true;
      } else if (tr.park && tr.last) { h.x = tr.last.x; h.z = tr.last.z; h.y = tr.last.y; h.yaw = tr.last.yaw; h.pitch = 0; h.visible = true; }
      else h.visible = false;
    }
  }
}

// ================================================================ trade helpers
// a frame at a curb stop: at(a, s) = metres ahead along the heading, s metres toward the sidewalk
function curbFrame(c) {
  const d = dirOfYaw(c.yaw), v = DIRV[d], r = DIRV[RIGHT[d]];
  return { c, v, r, at: (a, s) => ({ x: c.x + v[0] * a + r[0] * s, z: c.z + v[1] * a + r[1] * s }), yawFwd: Math.atan2(v[0], v[1]), yawBack: Math.atan2(-v[0], -v[1]), yawWalk: Math.atan2(r[0], r[1]), yawRoad: Math.atan2(-r[0], -r[1]) };
}
// where a driver disappears into (and reappears from) a vehicle parked at curb c
function cabSpot(R, c, fwd = 1.0) { const f = curbFrame(c), p = f.at(fwd, 1.15); return R.spotAt(p.x, p.z, { hidden: true, y: 0.25 }); }
// nearest-neighbour ordering of items from a start point
function orderNN(items, sx, sz, xz = (it) => [it.P.door.x, it.P.door.z]) {
  const left = items.slice(), out = [];
  let x = sx, z = sz;
  while (left.length) {
    let bi = 0, bd = Infinity;
    left.forEach((it, i) => { const [ix, iz] = xz(it); const d = Math.abs(ix - x) + Math.abs(iz - z); if (d < bd) { bd = d; bi = i; } });
    const it = left.splice(bi, 1)[0]; out.push(it); [x, z] = xz(it);
  }
  return out;
}
// runs of neighbouring homes on one side of one street, in driving order, `size` at a time
function clusters(R, homes, size = 4) {
  const bySide = new Map();
  for (const H of homes) { const k = H.street + '|' + H.P.u.join(','); if (!bySide.has(k)) bySide.set(k, []); bySide.get(k).push(H); }
  const out = [];
  for (const list of bySide.values()) {
    const v = DIRV[dirOfYaw(list[0].P.curb.yaw)];
    list.sort((a, b) => (a.P.curb.x * v[0] + a.P.curb.z * v[1]) - (b.P.curb.x * v[0] + b.P.curb.z * v[1]));
    let cur = [];
    for (const H of list) {
      const prev = cur[cur.length - 1];
      if (cur.length >= size || (prev && Math.hypot(prev.P.curb.x - H.P.curb.x, prev.P.curb.z - H.P.curb.z) > 26)) { out.push(cur); cur = []; }
      cur.push(H);
    }
    if (cur.length) out.push(cur);
  }
  return out.map((g) => ({ homes: g, curb: g[Math.floor((g.length - 1) / 2)].P.curb, x: g[0].P.curb.x, z: g[0].P.curb.z }));
}
const within = (H, names) => names.some((n) => H.street === n);
const RES_STREETS = ['Church Street', 'Maple Street', 'Orchard Street', 'Hillcrest Avenue', 'Mill Street', 'Canal Street'];
function newTradesman(R, o) {
  const p = R.L.newPerson(o);
  const home = R.L.offstage(o.ox ?? 520, o.oz ?? -66);
  p.at(0, home, 'stand', { label: o.away || 'Out of town' });
  p.offstageSpot = home;
  return p;
}
// what the delivered milk and papers do on the step: wait there till somebody takes them in
function drop(R, H, kind, t, pt) { const d = R.drops.get(H.name) || { H }; d[kind] = { t: T(t), pt }; R.drops.set(H.name, d); }
function settleDrops(R) {
  const L = R.L;
  for (const d of R.drops.values()) {
    const H = d.H;
    const t0 = Math.min(d.milk ? d.milk.t : 9999, d.paper ? d.paper.t : 9999);
    let tp = Math.max(t0 + 20, T('7:05') + R.rng.int(0, 150));
    // whoever's up takes it in — in a bathrobe if it's early
    const who = H.members.filter((p) => p.age >= 12 && R.idle(p, tp - 0.5, tp + 2) && R.homebody(p, tp - 0.5, tp + 2));
    if (who.length) {
      const p = R.rng.pick(who);
      const what = d.milk && d.paper ? 'the milk and the Courier' : d.milk ? 'the milk' : 'the Courier';
      L.block(p, tp, tp + 1.7, R.hostSpot(H, { act: 'stand' }), 'stand', { label: `Taking in ${what}`, costume: tp < T('8:10') && p.age >= 16 ? COSTUME.robe(p) : null, lines: R.rng.pick([['Cold one this morning.', 'Three quarts? Somebody left a note, didn\'t they.'], ['Let\'s see what the Courier says about the Centennial.', 'Forty-eight pages tomorrow. Lord.']]) });
      R.robes = (R.robes || 0) + 1;
    } else tp = Math.max(tp, T('9:15') + R.rng.int(0, 90));
    if (d.milk) L.timed('milk_bottles', d.milk.pt.x, d.milk.pt.z, H.P.yawOut, d.milk.t, tp + 1, { y: d.milk.pt.y });
    if (d.paper) L.timed('newspaper_folded', d.paper.pt.x, d.paper.pt.z, H.P.yawRight + 0.3, d.paper.t, tp + 1, { y: d.paper.pt.y });
  }
  if (R.robes) L.scene(`Taking in the milk and the paper (${R.robes} doorsteps)`, 300, 150, '7:05', '9:40', R.robes);
}

// ================================================================ the trades
function trades(R) {
  R.drops = new Map();
  const steps = [milkman, paperboy, mailmen, iceman, fullerBrush, iceCream, knifeGrinder, diaperVan, groceryBoy, doctor, tvMan, telegram, movingDay];
  for (const f of steps) { try { f(R); } catch (e) { console.error('residential trade failed: ' + f.name, e); } }
  settleDrops(R);
}

// ---------------------------------------------------------------- the milkman, 5:20 - 8:15
// Ernie Mercer of the dairy (roster), with his step van and wire carrier; then Mrs. Hatch at noon.
function milkman(R) {
  const L = R.L;
  let p = L.person('Ernie', 'Mercer');
  if (!p) p = newTradesman(R, { first: 'Ernie', last: 'Mercer', age: 38, sex: 'M', outfit: 'milkman', bio: 'Ernie Mercer, milkman for the dairy.' });
  const homes = R.homes.filter((H) => within(H, RES_STREETS) && (H.apt || R.rng.chance(H.detached ? 0.85 : 0.7)));
  const cl = clusters(R, homes, 4);
  const route = orderNN(cl, 392, 200, (c) => [c.x, c.z]);
  const truck = R.fleet.add('truck_milk', { label: 'The dairy truck: milk, cream, butter & eggs', len: 5 });
  const t0 = T('5:18');
  const it = R.day(p, t0 - 3, { label: 'Delivering the milk', held: 'milk_carrier' });
  let t = t0, first = true, n = 0;
  const lines = ['Morning! Two quarts and a pint of cream, same as always.', 'Everybody\'s leaving notes today. "Only one quart, we\'re at the fair."', 'Glass on the doorstep, that\'s milk. That\'s a promise.', 'Skippy ran alongside the truck Tuesday. Four miles. I was winded, and I was sitting down.'];
  for (const c of route) {
    if (t > T('8:05')) break;
    const cab = cabSpot(R, c.curb);
    if (first) { it.go(cab, 0, { teleport: true }); t = truck.enter(t, c.curb); first = false; }
    else { const tD = it.t; it.go(cab, 0, { teleport: true }); t = truck.drive(tD, c.curb); }
    it.until(t + 0.2);
    for (const H of c.homes) {
      const at = it.go(R.callerSpot(H, 0.35, { back: 0.75 }), 0.8 + R.rng.float(0, 0.5), { act: 'kneel' });
      drop(R, H, 'milk', at + 0.25, R.stoopPoint(H, 0.5, 0.45));
      n++;
    }
    it.go(cab, 0.35, { label: 'Back to the milk truck' });
  }
  const tEnd = it.t;
  truck.leave(tEnd);
  // back to the dairy with the empties, then home
  it.go(R.L.offstage(380, -64), 0, { teleport: true });
  it.commit({ end: tEnd + 30, lines });
  R.scene('The milkman\'s rounds', null, t0, tEnd, [p], { x: 392, z: 100, street: 'Hillcrest Avenue' });
  R.seen('milkman', { p, t0, t1: tEnd });
  // noon: the last stop is always Mrs. Hatch, a quart of milk and a pint of cream "for the cat"
  const hatch = R.byName.get('Hatch Residence'), mildred = L.person('Mildred', 'Hatch');
  if (hatch) {
    const t1 = T('11:52');
    const it2 = R.day(p, t1 - 1, { label: 'Last stop: Mrs. Hatch\'s cream', held: 'milk_carrier' });
    const tr2 = R.fleet.add('truck_milk', { label: 'The dairy truck', len: 5 });
    const cab = cabSpot(R, hatch.P.curb);
    it2.go(cab, 0, { teleport: true });
    const ta = tr2.enter(t1, hatch.P.curb);
    it2.until(ta + 0.2);
    const at = it2.go(R.callerSpot(hatch, 0.2, { act: 'talk' }), 4.5, { act: 'talk' });
    it2.go(cab, 0.3, { held: null, label: 'Done for the day' });
    const tl = it2.t;
    tr2.leave(tl);
    it2.go(R.L.offstage(380, -64), 0, { teleport: true });
    it2.commit({ end: tl + 12 });
    if (mildred && R.idle(mildred, at, at + 4.5)) {
      L.block(mildred, at - 0.3, at + 4.5, R.hostSpot(hatch), 'talk', { label: 'Taking in a pint of cream "for the cat, who is not to be fed"' });
      L.convo([p, mildred], at, at + 4.5, [[0, 'Quart of milk and a pint of cream, Mrs. Hatch.'], [1, 'The cream is for Admiral. He is not to be fed.'], [0, 'Heard he went up the maple again this morning.'], [1, 'Engine Company Number One. A ladder, a net and a lecture.'], [0, 'And the cream?'], [1, 'Is for his nerves, Ernest.']]);
    }
    R.scene('Mrs. Hatch\'s cream (for the cat)', hatch, t1, tl, [p]);
  }
}

// ---------------------------------------------------------------- the paperboy, 6:00 - 7:10
// Petey Rourke walks his bike down Maple and Orchard, tossing the Courier onto the porches.
function paperboy(R) {
  const L = R.L;
  let p = L.person('Petey', 'Rourke') || L.person('Peter', 'Rourke');
  if (!p) p = newTradesman(R, { first: 'Petey', last: 'Rourke', age: 12, sex: 'M', bio: 'Petey Rourke, the Courier paperboy.' });
  const homes = R.homes.filter((H) => (H.street === 'Maple Street' || H.street === 'Orchard Street' || (H.street === 'Hillcrest Avenue' && H.P.door.z > 70)) && H.detached);
  const t0 = T('5:58');
  // he rides in from the Courier; the round starts at the corner of Lantern Avenue and Maple Street
  const startSpot = R.L.offstage(222, 148);
  const route = orderNN(homes, 222, 148);
  const it = R.day(p, t0, { label: 'Delivering the Courier — ninety-one papers', speed: 1.35 });
  it.go(startSpot, 0, { teleport: true });
  let chain = false;
  for (const H of route) {
    if (it.t > T('7:12')) break;
    const sw = R.sidewalk(H, 0.6, 1.4);
    if (!sw) continue;
    // the chain comes off at the corner of Elm, every blessed morning
    if (!chain && H.street === 'Maple Street' && H.P.door.x > 300) {
      chain = true;
      const c = L.places.corners.find((q) => q.ave === 'Elm Street' && q.st === 'Maple Street');
      if (c) {
        const cp = c.corners.sort((a, b) => Math.hypot(a.x - H.P.door.x, a.z - H.P.door.z) - Math.hypot(b.x - H.P.door.x, b.z - H.P.door.z))[0];
        const at = it.go(R.spotAt(cp.x, cp.z, { act: 'kneel', yaw: 0 }), 4, { act: 'kneel', label: 'Putting the bicycle chain back on (it always comes off at Elm)' });
        L.say(p, at, at + 4, ['Every blessed morning. Right here. Elm Street.', 'C\'mon, c\'mon... there.']);
        R.scene('The paperboy\'s chain comes off at Elm', null, at, at + 4, [p], { x: cp.x, z: cp.z, street: 'Elm Street' });
      }
    }
    const s = R.spotAt(sw.x, sw.z, { yaw: H.P.yawIn, act: 'bowl' });
    const at = it.go(s, 0.3, { act: 'bowl' });
    drop(R, H, 'paper', at + 0.2, R.stoopPoint(H, -0.55, 0.55));
  }
  const tEnd = it.t;
  it.commit({ end: tEnd + 0.5, lines: ['Ninety-one papers! Sunday\'s forty-eight pages. I\'m gonna need a bigger bag.', 'Mrs. Hatch tips a dime at Christmas and a lecture every other day.', 'Pa walks the beat, I walk the route. Between us we got the whole town covered.'] });
  R.trails.add(p, 'bicycle', { side: 0.55, fwd: 0.1, when: 'walk', park: true, t0, t1: tEnd + 0.4, tint: '#8a2a24' });
  R.trails.add(p, 'bicycle', { side: 0.55, fwd: 0.1, when: 'walk', t0: tEnd + 0.4, t1: T('8:00'), tint: '#8a2a24' }); // walking it home
  L.follow(p, 'paper_bag_canvas', { side: -0.22, fwd: 0.02, y: 0.48, when: 'always', t0, t1: tEnd });
  R.scene('The paperboy\'s route', null, t0, tEnd, [p], { x: 300, z: 150, street: 'Maple Street' });
  R.seen('paperboy', { p, t0, t1: tEnd });
  R.scene('The paperboy\'s route (Orchard)', null, t0, tEnd, [], { x: 300, z: 210, street: 'Orchard Street' });
}

// ---------------------------------------------------------------- letter carriers, 9:00 - 13:15
function mailmen(R) {
  const L = R.L;
  const po = L.place('United States Post Office');
  const poX = po ? po.door.x : 240, poZ = po ? po.door.z : -10;
  const chester = L.person('Chester', 'Oakes');
  const routeA = R.homes.filter((H) => H.street === 'Church Street' || H.street === 'Mill Street' || H.street === 'Canal Street' || (H.street === 'Hillcrest Avenue' && H.row));
  const routeB = R.homes.filter((H) => (H.street === 'Maple Street' || H.street === 'Orchard Street' || (H.street === 'Hillcrest Avenue' && !H.row)));
  const chats = {
    'Castellano Residence': [[0, 'Nothing from Korea today, Mrs. Castellano.'], [1, 'Nothing from Korea ever again, Chester. He\'s upstairs, asleep in his own bed!'], [0, 'Then I\'ll carry the bills with a light heart.']],
    'Hatch Residence': [[0, 'Seed catalog and a postcard from your nephew, Mrs. Hatch.'], [1, 'Does he mention Admiral?'], [0, 'I don\'t read the postcards, Mrs. Hatch.'], [1, 'Of course you do, Chester. Everybody does.']],
    'Halloran Residence': [[0, 'TV Guide, Mrs. Halloran. Mr. Halloran will want the Gleason listing.'], [1, 'He wants the antenna to stop blowing around, is what he wants.']],
  };
  const generic = (H, carrier, host) => R.rng.pick([
    [[1, `Anything good, ${first(carrier)}?`], [0, 'Light load today — everybody\'s saving their news for the fair.'], [1, 'Well, come in for a cup when you\'re done.']],
    [[0, `A card from Worcester, ${mr(host)}. Your sister's hand, I'd say.`], [1, 'You\'d say right. Nosy as ever, Chester.'], [0, 'Discreet as ever, ma\'am.']],
    [[1, 'Is that the seed catalog? In September?'], [0, 'Burpee\'s gets earlier every year.'], [1, 'So does Christmas.']],
    [[0, 'Postage due, two cents. Somebody in Lowell forgot to count.'], [1, 'That\'ll be my cousin Agnes. She counts nothing but other people\'s money.']],
  ]);
  const doRoute = (p, homes, t0, tStop, label, fromNode, satchelTint) => {
    const it = R.day(p, t0, { label, held: 'letter', from: fromNode });
    const order = orderNN(homes, poX, poZ);
    let talks = 0;
    for (const H of order) {
      if (it.t > tStop) break;
      const s = R.callerSpot(H, -0.35, { back: 0.65 });
      let dwell = 0.45 + R.rng.float(0, 0.3);
      const arrive = it.t + R.walkMin(p, it.node, s.node);
      const script = chats[H.name];
      if ((script || (talks < 5 && R.rng.chance(0.3))) && arrive < tStop) {
        const [host] = R.cast(H, arrive - 0.2, arrive + 5, 1, { filter: isAdult, household: true });
        if (host) {
          dwell = 4.2;
          L.block(host, arrive - 0.2, arrive + 4.2, R.hostSpot(H), 'talk', { label: `Chatting with ${first(p)} the mailman` });
          L.convo([p, host], arrive, arrive + 4.2, script || generic(H, p, host));
          talks++;
        }
      }
      it.go(s, dwell, { act: dwell > 1 ? 'talk' : 'stand' });
    }
    return it;
  };
  if (chester) {
    const it = doRoute(chester, routeA, T('9:02'), T('12:05'), 'Delivering the mail (twenty-six years on this route)', undefined);
    const tEnd = it.t;
    it.commit({ end: tEnd + 0.4, lines: ['Eleven miles a day, and the dogs of Juniper Bay have mellowed.', 'Saturday delivery, same as always. The Centennial doesn\'t cancel the gas bill.'] });
    L.follow(chester, 'mail_satchel', { side: 0.27, fwd: -0.03, y: 0.6, when: 'always', t0: '9:02', t1: tEnd });
    R.scene('Chester Oakes on his mail route', null, T('9:02'), tEnd, [chester], { x: 330, z: 60, street: 'Church Street' });
  }
  const walt = newTradesman(R, { first: 'Walt', last: 'Tibbetts', age: 44, sex: 'M', outfit: 'mail', ox: poX + 2, oz: poZ + 2, away: 'Sorting mail at the post office', bio: 'Walt Tibbetts, 44, substitute letter carrier — Maple, Orchard and the captains\' houses on Hillcrest. Flat feet, a good dog biscuit in every pocket, and a Purple Heart from Anzio he doesn\'t mention.', lines: ['Dog biscuit in every pocket. The Hillcrest dogs know the sound of my shoes.', 'Substitute carrier. Regular fellow\'s at his daughter\'s wedding in Salem.'] });
  const it = doRoute(walt, routeB, T('9:25'), T('13:10'), 'Delivering the mail — Maple, Orchard & Hillcrest', walt.offstageSpot.node);
  const tEnd = it.t;
  it.go(walt.offstageSpot, 0, { held: null, label: 'Back to the post office' });
  it.commit({ end: it.t + 1, noResume: true });
  L.follow(walt, 'mail_satchel', { side: 0.27, fwd: -0.03, y: 0.6, when: 'always', t0: '9:25', t1: tEnd + 30 });
  R.scene('Walt Tibbetts on the Maple Street mail route', null, T('9:25'), tEnd, [walt], { x: 300, z: 180, street: 'Maple Street' });
}

// ---------------------------------------------------------------- the iceman, 8:40 - 11:30
// Aldo Ferrante and the Bayside Ice truck: 25-pound blocks carried in with tongs to the old folks'
// iceboxes, and a gang of kids at the tailgate for the chips.
function iceman(R) {
  const L = R.L;
  const aldo = newTradesman(R, { first: 'Aldo', last: 'Ferrante', age: 47, sex: 'M', outfit: 'dock', bio: 'Aldo Ferrante, 47, has driven the Bayside Ice truck since Charlie Keene went through the ice on Pruitt\'s Pond in the winter of \'47. Fewer iceboxes every year; the old folks keep him in business and the kids keep him in conversation.', lines: ['Fewer iceboxes every year. Everybody wants a Frigidaire. The Duffys will have an icebox till the Second Coming.', 'Charlie Keene drove this route before me. Went through the ice on Pruitt\'s Pond in \'47. I keep his tongs.', 'Chips? Chips are for kids who say please.'] });
  const cands = R.homes.filter((H) => within(H, RES_STREETS) && !H.apt && H.members.length && H.members.every((p) => p.age >= 55) && H.P.homes[0] && (H.P.homes[0].home.kitchen || []).length);
  const pick = orderNN(cands, 90, 190).filter((H, i, a) => i === 0 || Math.hypot(H.P.door.x - a[i - 1].P.door.x, H.P.door.z - a[i - 1].P.door.z) > 12).slice(0, 9);
  if (!pick.length) return;
  const truck = R.fleet.add('truck_ice', { label: 'Bayside Ice Co. — 25-lb. blocks, 35 cents', len: 5.8 });
  const it = R.day(aldo, T('8:38'), { label: 'Delivering ice for Bayside Ice Co.', from: aldo.offstageSpot.node });
  let t = T('8:44'), firstStop = true, kidsStops = 0;
  for (const H of pick) {
    if (t > T('11:15')) break;
    const c = H.P.curb, f = curbFrame(c), cab = cabSpot(R, c, 1.6);
    if (firstStop) { it.go(cab, 0, { teleport: true }); t = truck.enter(t, c); firstStop = false; }
    else { const tD = it.t; it.go(cab, 0, { teleport: true }); t = truck.drive(tD, c); }
    it.until(t + 0.15);
    const tail = f.at(-3.1, 1.6), tailSpot = R.spotAt(tail.x, tail.z, { yaw: f.yawFwd, act: 'hammer' });
    const tChip = it.go(tailSpot, 1.5, { act: 'hammer', held: 'hammer', label: 'Chipping a 25-pound block off the load' });
    const kit = H.P.homes[0].home.kitchen[0];
    it.go(kit, 1.3, { act: 'stand', held: 'ice_block_tongs', label: `Setting 25 pounds of ice in ${theirs(H)} icebox` });
    it.go(cab, 0.3, { held: null, label: 'Back to the ice truck' });
    const tDep = it.t;
    // kids at the tailgate
    if (kidsStops < 4) {
      const kids = R.cast(H, tChip - 1, tDep, 3, { filter: (p) => p.age >= 5 && p.age <= 12, radius: 80 });
      if (kids.length >= 2) {
        kidsStops++;
        kids.forEach((k, i) => {
          const q = f.at(-3.8 - i * 0.7, 2.4 + (i % 2) * 0.6);
          L.block(k, tChip - 1.2, tDep + 0.2, R.spotAt(q.x, q.z, { faceTo: [tail.x, tail.z], act: i % 2 ? 'wait' : 'play_ball' }), i % 2 ? 'wait' : 'play_ball', { label: 'Begging ice chips at the back of the ice truck', lines: [`Got any chips, Mr. Ferrante?`, 'Me next! Me next!', 'It\'s so cold it burns!'] });
        });
        L.sound(tail.x, 1, tail.z, tChip - 1, tDep, 'kids', { range: 30, vol: 0.4 });
        R.scene('Kids begging chips off the ice truck', H, tChip - 1.2, tDep, kids);
      }
    }
    R.scene('The iceman', H, t, tDep, [aldo]);
  }
  truck.leave(it.t);
  R.seen('iceman', { p: aldo, t0: '8:44', t1: it.t });
  it.go(aldo.offstageSpot, 0, { teleport: true });
  it.commit({ end: it.t + 1, noResume: true });
}

// ---------------------------------------------------------------- the Fuller Brush man, 9:30 - 15:45
function fullerBrush(R) {
  const L = R.L;
  const harvey = newTradesman(R, { first: 'Harvey', last: 'Pettibone', age: 52, sex: 'M', formal: true, role: 'clerk', look: { hat: 'hat_fedora', hatTint: '#4a4038' }, bio: 'Harvey Pettibone, 52, the Fuller Brush man for the North Shore since 1931. A free vegetable brush for every lady of the house, a joke for every husband, and a memory for every name. Drives a \'49 Plymouth with three hundred brushes in the back seat.', lines: ['Good morning! Fuller Brush man. I have a free vegetable brush with your name on it.', 'Twenty-two years on the road. I know every dog on the North Shore by name, and most of them know me.', 'The Handy brush. For radiators. You\'ll wonder how you ever lived without it.'] });
  const homes = R.homes.filter((H) => H.detached && (H.street === 'Maple Street' || H.street === 'Orchard Street' || H.street === 'Church Street') && H.P.door.x > 200);
  if (homes.length < 6) return;
  const carH = homes.find((H) => H.street === 'Maple Street') || homes[0];
  const car = R.fleet.add('car_sedan', { tint: '#5a2a24', tint2: '#e8e4d8', label: 'The Fuller Brush man\'s \'49 Plymouth — three hundred brushes in the back seat', len: 5 });
  const c = carH.P.curb, cab = cabSpot(R, c, 0.3);
  car.enter(T('9:30'), c);
  const it = R.day(harvey, T('9:27'), { label: 'The Fuller Brush man, calling door to door', held: 'sample_case', from: harvey.offstageSpot.node });
  it.go(cab, 0, { teleport: true });
  it.until(T('9:31'));
  const pitches = [
    [[0, 'Good morning, ma\'am! Fuller Brush man. Your free vegetable brush.'], [1, 'Oh, I\'ve got a drawer full of your brushes, Mr. Pettibone.'], [0, 'Then you\'ll want the new one for the drawer.'], [1, 'Well... what does it cost?']],
    [[0, 'The new Fullergloss. Your kitchen floor will shine like a Cadillac.'], [1, 'My kitchen floor has four children walking on it.'], [0, 'Then it\'ll shine like four Cadillacs.']],
    [[1, 'Not today, thank you.'], [0, 'Just the vegetable brush, then. No charge. For the lady of the house.'], [1, '...Well, come in off the porch, then.']],
    [[0, 'The Handy brush, for the radiators. Mrs. Novak swears by it.'], [1, 'Stella Novak swears by everything. It\'s her daughter\'s wedding day.'], [0, 'Then she\'ll need the clothes brush for the groom!']],
    [[1, 'My husband says we don\'t need brushes.'], [0, 'Has he seen the bottle brush? Nine inches. Horsehair.'], [1, 'Come back when he\'s out. Oh — he is out.']],
  ];
  const visit = (H, tStop) => {
    if (it.t > tStop) return;
    const s = R.callerSpot(H, 0.2, { act: 'wait', back: 0.9 });
    const arrive = it.t + R.walkMin(harvey, it.node, s.node);
    const [host] = R.cast(H, arrive, arrive + 9, 1, { filter: (p) => isAdult(p), household: true, prefer: (p) => p.sex === 'F' });
    if (host && R.rng.chance(0.75)) {
      const dur = R.rng.int(5, 9);
      it.go(s, dur + 0.8, { act: 'talk' });
      L.block(host, arrive + 0.6, arrive + dur + 0.8, R.hostSpot(H, { act: 'listen' }), 'listen', { label: 'Hearing out the Fuller Brush man' });
      L.convo([harvey, host], arrive + 0.8, arrive + dur + 0.8, R.rng.pick(pitches));
      R.scene('The Fuller Brush man at the door', H, arrive, arrive + dur + 0.8, [harvey, host]);
    } else it.go(s, 1.1, { act: 'wait', label: 'Knocking — "Fuller Brush man!" (nobody home)' });
  };
  const order = orderNN(homes, c.x, c.z);
  for (const H of order.slice(0, 11)) visit(H, T('12:00'));
  it.go(cab, 0, { label: 'A sandwich in the Plymouth' });
  it.until(T('12:50'));
  for (const H of order.slice(11, 24)) visit(H, T('15:30'));
  it.go(cab, 0.5, { label: 'Back to the car' });
  car.leave(it.t);
  it.go(harvey.offstageSpot, 0, { teleport: true });
  it.commit({ end: it.t + 1, noResume: true });
  R.scene('The Fuller Brush man\'s rounds', carH, T('9:30'), it.t, [harvey]);
  R.seen('fuller', { p: harvey, t0: '9:31', t1: it.t });
}

// ---------------------------------------------------------------- the ice-cream truck, 13:50 - 16:45
function iceCream(R) {
  const L = R.L;
  const sonny = newTradesman(R, { first: 'Sonny', last: 'Pellegrino', age: 29, sex: 'M', outfit: 'milkman', bio: 'Sonny Pellegrino, 29, drives the ice-cream truck in a white uniform his mother starches. Knows every kid\'s flavor, and which ones are good for the nickel till Thursday.', lines: ['Fudgsicle, seven cents. Creamsicle, seven. Popsicle, a nickel, and the stick\'s a prize.', 'One at a time! Nobody\'s running out. Well — the grape ran out in Gloucester.'] });
  const kidsNear = (H) => R.homes.reduce((n, Q) => n + (Math.hypot(Q.P.door.x - H.P.door.x, Q.P.door.z - H.P.door.z) < 55 ? Q.kids.length : 0), 0);
  const cands = R.homes.filter((H) => within(H, ['Church Street', 'Maple Street', 'Orchard Street', 'Hillcrest Avenue']) && !H.apt).map((H) => ({ H, k: kidsNear(H) })).sort((a, b) => b.k - a.k);
  const stops = [];
  for (const c of cands) if (c.k >= 2 && stops.every((s) => Math.hypot(s.P.door.x - c.H.P.door.x, s.P.door.z - c.H.P.door.z) > 70)) stops.push(c.H);
  const route = orderNN(stops.slice(0, 9), 80, 210);
  if (!route.length) return;
  const truck = R.fleet.add('truck_ice_cream', { label: 'The ice-cream truck: Fudgsicles 7¢, Creamsicles 7¢, Popsicles a nickel', len: 5.3, speed: 5 });
  const it = R.day(sonny, T('13:48'), { label: 'Selling ice cream from the truck', from: sonny.offstageSpot.node });
  let t = T('13:52'), firstStop = true;
  const flavors = ['Eating a Fudgsicle on the curb', 'A Creamsicle, melting faster than he can eat it', 'A grape Popsicle — purple to the elbows', 'An Eskimo Pie, slowly', 'A Dixie cup with the wooden spoon'];
  for (const H of route) {
    if (t > T('16:30')) break;
    const c = H.P.curb, f = curbFrame(c), cab = cabSpot(R, c, 1.4);
    if (firstStop) { it.go(cab, 0, { teleport: true }); t = truck.enter(t, c); firstStop = false; }
    else { const tD = it.t; it.go(cab, 0, { teleport: true }); t = truck.drive(tD, c); }
    const dur = 13 + R.rng.int(0, 4);
    const sv = f.at(-0.9, 1.75);
    it.go(R.spotAt(sv.x, sv.z, { yaw: f.yawWalk, act: 'counter' }), dur, { act: 'counter', label: 'Scooping ice cream at the truck window' });
    it.go(cab, 0.3, {});
    const tDep = it.t;
    L.sound(c.x, 1.5, c.z, t, t + 1.8, 'bell', { range: 90, vol: 0.7 });
    const kids = R.cast(H, t + 0.3, t + dur, 6, { filter: (p) => p.age >= 4 && p.age <= 13, anywhere: true, radius: 95 });
    const used = [sonny];
    kids.forEach((k, i) => {
      const tq = t + 0.2 + i * 0.5, tServe = t + 2.4 + i * 1.5;
      if (tServe > t + dur - 0.5) return;
      const q = f.at(-0.9 - i * 0.72, 2.75 + (i % 2) * 0.25);
      const qs = R.spotAt(q.x, q.z, { yaw: i === 0 ? f.yawRoad : f.yawFwd, act: 'wait' });
      const e = f.at(2.4 + i * 0.95, 1.1);
      const eatY = R.open(e.x, e.z, { lawn: false, r: 0.25, h: 1.2 });
      const es = eatY !== false ? R.spotAt(e.x, e.z, { pose: 'sit', seat: 0.12, yaw: f.yawRoad, act: 'sit' }) : R.spotAt(e.x, e.z, { yaw: f.yawRoad, act: 'stand' });
      L.plan(k, tq, tServe + 7, [
        { t: tq, spot: qs, act: 'wait', label: 'In line at the ice-cream truck' },
        { t: tServe, spot: es, act: eatY !== false ? 'sit' : 'stand', held: 'ice_cream_cone', label: R.rng.pick(flavors) },
      ]);
      used.push(k);
    });
    if (kids.length) L.sound(c.x, 1, c.z, t + 1, t + dur, 'kids', { range: 35, vol: 0.45 });
    R.scene('The ice-cream truck', H, t, tDep, used);
  }
  truck.leave(it.t);
  R.seen('icecream', { p: sonny, t0: '13:52', t1: it.t });
  it.go(sonny.offstageSpot, 0, { teleport: true });
  it.commit({ end: it.t + 1, noResume: true });
}

// ---------------------------------------------------------------- the knife grinder, 10:10 - 14:00
function knifeGrinder(R) {
  const L = R.L;
  const pat = newTradesman(R, { first: 'Pasquale', last: 'Iannucci', age: 66, sex: 'M', look: { hat: 'hat_flatcap', hatTint: '#4a4038', torso: 8, top: '#e8e0cc', top2: '#4a3a2a' }, ox: 296, oz: 62, bio: 'Pasquale Iannucci, 66, knife and scissors grinder, walks up from Gloucester twice a year with his cart and his bell. Sharpened the Hallorans\' bread knives in 1921 and has not been allowed to stop.', lines: ['Knives! Scissors! Garden shears! Fifteen cents, sharp enough to shave a peach.', 'Nineteen-twenty-one I sharpen for Mrs. Halloran the old one. Now the young one. Same knife!'] });
  const homes = R.homes.filter((H) => H.detached && ((H.street === 'Church Street' && H.P.door.x > 290) || (H.street === 'Maple Street' && H.P.door.x > 290) || (H.street === 'Orchard Street' && H.P.door.x > 290 && H.P.door.z < 210)));
  const order = orderNN(homes, 300, 62).filter((H, i) => i % 2 === 0);
  const start = R.L.offstage(298, 64);
  const it = R.day(pat, T('10:08'), { label: 'The knife grinder, ringing his bell down the street', from: pat.offstageSpot.node });
  it.go(start, 0, { teleport: true });
  let prev = { x: 298, z: 64 };
  for (const H of order) {
    if (it.t > T('13:40')) break;
    const sw = R.sidewalk(H, 0, 2.1, { r: 0.6 });
    if (!sw) continue;
    const dx = sw.x - prev.x, dz = sw.z - prev.z;
    const along = Math.abs(H.P.u[0]) > 0 ? [0, Math.sign(dz) || 1] : [Math.sign(dx) || 1, 0];
    const yaw = Math.atan2(along[0], along[1]);
    const arrive = it.t + R.walkMin(pat, it.node, R.spotAt(sw.x, sw.z, { yaw, act: 'wait' }).node);
    const [cust] = R.cast(H, arrive + 0.5, arrive + 11, 1, { filter: (p) => isAdult(p) && p.sex === 'F', household: true });
    if (cust && R.rng.chance(0.8)) {
      const dur = R.rng.int(8, 12);
      it.go(R.spotAt(sw.x, sw.z, { yaw, act: 'saw' }), dur, { act: 'saw', label: `Sharpening ${mr(cust)}'s carving knife, fifteen cents` });
      const cx = sw.x + along[0] * 2.0, cz = sw.z + along[1] * 2.0;
      L.block(cust, arrive + 0.8, arrive + dur, R.spotAt(cx, cz, { faceTo: [sw.x, sw.z], act: 'listen' }), 'listen', { label: 'Having the knives sharpened', held: 'scissors' });
      L.convo([pat, cust], arrive + 1, arrive + dur, R.rng.pick([
        [[1, 'The carving knife and the good scissors, Mr. Iannucci.'], [0, 'Signora! This knife — who has been cutting wire with this knife?'], [1, 'My husband. The antenna.'], [0, 'Ah. Television. It ruins everything.']],
        [[0, 'Fifteen cents the knife, ten the scissors, and the pinking shears I do for love.'], [1, 'You said that last spring.'], [0, 'And I loved them last spring.']],
        [[1, 'Is it true you walked up from Gloucester?'], [0, 'The cart walks. I only follow.']],
      ]));
      L.sound(sw.x, 1, sw.z, arrive, arrive + 0.8, 'bell', { range: 60, vol: 0.55 });
      R.scene('The knife grinder at the curb', H, arrive, arrive + dur, [pat, cust]);
    } else {
      it.go(R.spotAt(sw.x, sw.z, { yaw, act: 'wait' }), 2.2, { act: 'wait', label: 'Ringing his bell: "Knives! Scissors!"' });
      L.sound(sw.x, 1, sw.z, arrive, arrive + 1, 'bell', { range: 60, vol: 0.55 });
      R.scene('The knife grinder rings his bell', H, arrive, arrive + 2.2, [pat]);
    }
    prev = sw;
  }
  const endS = R.L.offstage(376, 206);
  it.go(endS, 0, { label: 'Pushing on toward Orchard Street' });
  const tEnd = it.t;
  it.commit({ end: tEnd + 1, noResume: true });
  R.trails.add(pat, 'grinder_cart', { fwd: 1.05, when: 'walk', park: true, t0: T('10:08'), t1: tEnd });
  R.seen('grinder', { p: pat, t0: '10:10', t1: tEnd });
}

// ---------------------------------------------------------------- the diaper service, 8:15 - 10:30
function diaperVan(R) {
  const L = R.L;
  const hal = newTradesman(R, { first: 'Hal', last: 'Kimball', age: 27, sex: 'M', look: { torso: 7, arm: 1, top: '#a8c4dc', top2: '#8aa8c0', bottom: '#2a3a5a', hat: 'hat_cap', hatTint: '#2a4a7a' }, bio: 'Hal Kimball, 27, drives for the Bay State Diaper Service: fresh diapers in, used ones out, every Tuesday and Saturday. Has two of his own at home and considers himself an expert.', lines: ['Fresh in, used out. Tuesday and Saturday, rain or shine.', 'I\'ve got two of my own at home. I could do this route in my sleep. Some mornings I do.'] });
  const homes = R.homes.filter((H) => H.babies.length && !H.apt);
  const route = orderNN(homes, 392, -190).slice(0, 10);
  if (!route.length) return;
  const van = R.fleet.add('van_diaper', { label: 'Bay State Diaper Service — fresh every Tuesday & Saturday', len: 5 });
  const it = R.day(hal, T('8:12'), { label: 'Swapping diaper pails for the Bay State Diaper Service', held: 'diaper_pail', from: hal.offstageSpot.node });
  let t = T('8:16'), firstStop = true;
  for (const H of route) {
    if (t > T('10:25')) break;
    const c = H.P.curb, cab = cabSpot(R, c, 0.9);
    if (firstStop) { it.go(cab, 0, { teleport: true }); t = van.enter(t, c); firstStop = false; }
    else { const tD = it.t; it.go(cab, 0, { teleport: true }); t = van.drive(tD, c); }
    it.until(t + 0.2);
    const s = R.callerSpot(H, 0.3, { back: 0.7 });
    const arrive = it.t + R.walkMin(hal, it.node, s.node);
    const [mom] = R.cast(H, arrive, arrive + 3, 1, { filter: (p) => isAdult(p) && p.sex === 'F', household: true });
    const baby = H.babies[0];
    if (mom && R.rng.chance(0.6)) {
      it.go(s, 2.6, { act: 'talk', label: `Swapping ${theirs(H)} diaper pail` });
      L.block(mom, arrive - 0.2, arrive + 2.6, R.hostSpot(H), 'talk', { label: 'At the door for the diaper man' });
      L.convo([hal, mom], arrive, arrive + 2.6, [[0, `Fresh ones, ${mr(mom)}. How's ${baby ? first(baby) : 'the baby'}?`], [1, 'Teething. Nobody\'s slept since Wednesday.'], [0, 'Rub a little whiskey on the gums. That\'s what my mother did.'], [1, 'On whose gums?']]);
    } else it.go(s, 0.8, { act: 'stand', label: `Swapping ${theirs(H)} diaper pail` });
    it.go(cab, 0.3, { label: 'Back to the van' });
    R.scene('The diaper-service van', H, t, it.t, [hal]);
  }
  van.leave(it.t);
  it.go(hal.offstageSpot, 0, { teleport: true });
  it.commit({ end: it.t + 1, noResume: true });
}

// ---------------------------------------------------------------- the grocery boy, 10:05 - 11:50
// Danny Kaminski (roster: stock boy at Kowalski's Market) on the store's delivery bicycle.
function groceryBoy(R) {
  const L = R.L;
  const mkt = L.place('Kowalski\'s Market');
  const danny = L.person('Danny', 'Kaminski');
  if (!mkt || !danny) return;
  const cands = R.homes.filter((H) => !H.apt && H.old && Math.hypot(H.P.door.x - mkt.door.x, H.P.door.z - mkt.door.z) < 260);
  const route = orderNN(cands, mkt.door.x, mkt.door.z).slice(0, 5);
  if (!route.length) return;
  const it = R.day(danny, T('10:04'), { label: 'Delivering groceries for Kowalski\'s Market' });
  const mk = mkt.at(1.4, 1.2);
  it.go(R.spotAt(mk.x, mk.z, { yaw: mkt.yawRight, act: 'stand' }), 1.2, { label: 'Loading the delivery bike at Kowalski\'s', held: 'grocery_bag' });
  const parks = [];
  for (const H of route) {
    const bs = R.sidewalk(H, 1.3, 1.5);
    if (!bs) continue;
    const bSpot = R.spotAt(bs.x, bs.z, { yaw: H.P.yawIn, act: 'stand' });
    const tA = it.go(bSpot, 0.15, { held: 'grocery_bag' });
    const s = R.callerSpot(H, -0.3, { back: 0.75 });
    const arrive = it.t + R.walkMin(danny, it.node, s.node);
    const [host] = R.cast(H, arrive, arrive + 3.5, 1, { filter: isAdult, household: true });
    if (host) {
      it.go(s, 3.2, { act: 'talk', held: 'grocery_bag', label: `Groceries for ${mr(host)}` });
      L.block(host, arrive - 0.2, arrive + 3.2, R.hostSpot(H), 'talk', { label: 'Taking in the groceries from Kowalski\'s' });
      L.convo([danny, host], arrive, arrive + 3.2, R.rng.pick([
        [[0, `Your order, ${mr(host)}. Tea, sardines, a pound of kielbasa.`], [1, 'And the Nabiscos, Daniel?'], [0, 'And the Nabiscos. Mr. Kowalski threw in a lemon.']],
        [[1, 'You\'re the Kaminski boy. Big game Friday?'], [0, 'Gloucester, ma\'am. I\'m second string.'], [1, 'Well, the first string can\'t carry groceries like you do.']],
      ]));
      R.scene('The grocery boy at the door', H, arrive, arrive + 3.2, [danny, host]);
    } else it.go(s, 0.7, { act: 'stand', held: 'grocery_bag', label: 'Leaving the groceries on the step' });
    const tC = it.go(bSpot, 0.1, { held: null });
    const pp = H.at(bs.s + 0.9, bs.out);
    parks.push({ t0: tA + 0.02, t1: tC + 0.1, x: pp.x, z: pp.z, yaw: H.P.yawRight, y: 0.25 });
  }
  it.go(R.spotAt(mk.x, mk.z, { yaw: mkt.yawRight, act: 'stand' }), 0.5, { held: null, label: 'Back at Kowalski\'s' });
  const tEnd = it.t;
  it.commit({ end: tEnd + 0.3, lines: ['Mr. Kowalski says if I drop the eggs again it comes out of my pay. I haven\'t got that much pay.'] });
  R.trails.add(danny, 'bicycle_delivery', { side: 0.6, fwd: 0.2, when: 'walk', t0: T('10:04'), t1: tEnd, parks, tint: '#2a5a3a' });
  R.scene('Danny Kaminski delivering groceries', null, T('10:04'), tEnd, [danny], { x: mkt.door.x, z: mkt.door.z, street: 'Mill Street' });
}

// an indoor spot facing a seat (a visitor at somebody's armchair or bedside)
function besideSeat(R, seat, dist = 0.95, act = 'stand') {
  if (!seat) return null;
  const f = [Math.sin(seat.yaw), Math.cos(seat.yaw)];
  const x = seat.x + f[0] * dist, z = seat.z + f[1] * dist;
  return R.L.spot(x, z, { y: seat.y - (seat.seat || 0) * 0 , room: seat.room, building: seat.building, faceTo: [seat.x, seat.z], act });
}

// ---------------------------------------------------------------- Dr. Pike's house calls
function doctor(R) {
  const L = R.L;
  const pike = L.person('Nathaniel', 'Pike');
  if (!pike) return;
  const calls = [['Dunmore Residence', 'Silas', 'Dunmore', '9:36', 'House call on old Silas Dunmore', ['Your heart\'s fine, Silas. It\'s your temper I worry about.', 'Half a pipe a day. Half. I\'ll know.']], ['106 Orchard Street', 'Rufus', 'Duffy', '15:02', 'House call on Rufus Duffy (82, his chest)', ['Deep breath, Rufus. Deeper. ...Were those cigars in the breadbox?']]];
  let vehicle = null;
  const hosp = L.place('St. Luke\'s Hospital');
  for (const [house, fn, ln, t0s, label, lines] of calls) {
    const H = R.byName.get(house) || R.homes.find((q) => q.name.includes(house));
    if (!H) continue;
    const pt = L.person(fn, ln) || H.members.find((p) => p.age > 70);
    const seat = (H.P.homes[0] && (H.P.homes[0].home.lounge || [])[0]) || null;
    const inside = besideSeat(R, seat, 0.9, 'exam');
    if (!inside) continue;
    const t0 = T(t0s);
    const far = hosp ? Math.hypot(hosp.door.x - H.P.door.x, hosp.door.z - H.P.door.z) > 180 : false;
    const it = R.day(pike, t0, { label, held: 'doctor_bag' });
    let car = null;
    if (far && hosp) {
      car = vehicle || (vehicle = R.fleet.add('car_sedan', { tint: '#1c1c1e', tint2: '#1c1c1e', label: 'Dr. Pike\'s black Buick', len: 5 }));
      car.parkAt(hosp.curb, t0 - 20);
      const cabA = cabSpot(R, hosp.curb, 0.2);
      it.go(cabA, 0.3, { label: 'Off on a house call' });
      const tD = it.t;
      it.go(cabSpot(R, H.P.curb, 0.2), 0, { teleport: true });
      const ta = car.drive(tD, H.P.curb);
      it.until(ta + 0.2);
    }
    const knock = it.go(R.callerSpot(H, 0.15, { act: 'wait' }), 0.7, { act: 'wait', label: `Knocking at ${theirs(H)} door, black bag in hand` });
    const tIn = it.go(inside, 23, { act: 'exam' });
    const tOut = it.t;
    it.go(R.callerSpot(H, 0.15, { act: 'wait' }), 0.4, { act: 'stand', label: 'Leaving the house call' });
    if (car) {
      it.go(cabSpot(R, H.P.curb, 0.2), 0.3, {});
      const tD = it.t;
      it.go(cabSpot(R, hosp.curb, 0.2), 0, { teleport: true });
      const ta = car.drive(tD, hosp.curb);
      it.until(ta + 0.3);
      car.close(ta + 90);
    }
    it.commit({ end: it.t + 0.3, lines });
    if (pt && R.idle(pt, knock - 3, tOut + 1) && seat) {
      L.block(pt, knock - 3, tOut + 1, seat, seat.act === 'sleep' ? 'sleep' : 'sit', { label: R.rng.pick(['Being told to give up his pipe', 'Saying "Ahh" for the doctor']) });
      L.convo([pike, pt], tIn + 1, tOut, [[0, lines[0]], [1, 'I was chewing tobacco before you were born, Nathaniel.'], [0, 'That\'s rather my point.']]);
    }
    R.scene('The doctor\'s house call', H, knock, tOut + 1, [pike]);
  }
}

// ---------------------------------------------------------------- the TV repairman, 10:30 - 14:40
function tvMan(R) {
  const L = R.L;
  const shop = L.place('Bay Radio & Television');
  const vic = newTradesman(R, { first: 'Vic', last: 'DeLuca', age: 41, sex: 'M', outfit: 'mechanic', look: { hatTint: '#7a2a2a' }, bio: 'Vic DeLuca, 41, radio and television serviceman for Bay Radio & Television. Believes television will kill radio, and says so to Bill Ferris of WJBY every chance he gets. Carries a caddy of forty tubes and fixes most sets by tapping them.', lines: ['Nine sets out of ten, it\'s a tube. The tenth, it\'s the husband.', 'Television\'s the future. Bill Ferris says radio\'ll outlive us all. Bill Ferris works for a radio station.'] });
  const cands = R.homes.filter((H) => H.detached && H.antenna && H.P.homes[0] && (H.P.homes[0].home.lounge || []).length);
  const jobs = [];
  for (const [a, b] of [['10:40', '11:20'], ['13:25', '14:05']]) {
    const H = R.rng.shuffle(cands.slice()).find((Q) => !jobs.some((j) => j.H === Q) && R.cast(Q, a, b, 1, { filter: isAdult, household: true }).length);
    if (H) jobs.push({ H, t: T(a), host: R.cast(H, a, b, 1, { filter: isAdult, household: true })[0] });
  }
  if (!jobs.length) return;
  const van = R.fleet.add('van_tv_repair', { label: 'Bay Radio & TV — Service, Sales, Antennas', len: 5 });
  const it = R.day(vic, T('10:20'), { label: 'Out on a television service call', held: 'tube_caddy', from: vic.offstageSpot.node });
  const home = shop ? shop.curb : jobs[0].H.P.curb;
  let first_ = true;
  for (const j of jobs) {
    const H = j.H, c = H.P.curb;
    let ta;
    if (first_) { it.go(cabSpot(R, c, 0.4), 0, { teleport: true }); ta = van.enter(j.t, c); first_ = false; }
    else { const tD = it.t; it.go(cabSpot(R, c, 0.4), 0, { teleport: true }); ta = van.drive(Math.max(tD, j.t - 3), c); }
    it.until(ta + 0.2);
    const seat = H.P.homes[0].home.lounge[0];
    const bench = besideSeat(R, seat, 1.0, 'kneel');
    const knock = it.go(R.callerSpot(H, 0.2, { act: 'wait' }), 0.8, { act: 'wait', label: `Service call at ${theirs(H)}` });
    const tIn = it.go(bench, 30, { act: 'kneel', label: `Swapping tubes in ${theirs(H)} television` });
    it.go(cabSpot(R, c, 0.4), 0.4, { label: 'Back to the van' });
    if (j.host) {
      L.plan(j.host, knock - 0.3, tIn + 30, [{ t: knock - 0.3, spot: R.hostSpot(H), act: 'talk', label: 'Letting the TV man in' }, { t: knock + 1.2, spot: seat, act: 'watch', label: 'Watching the TV man work ("Is it the tube?")' }]);
      L.convo([vic, j.host], knock, knock + 1.2, [[1, 'It rolls. The picture rolls, and then it snows.'], [0, 'Rolls, then snows. Probably the vertical hold, maybe a tube. Let\'s have a look.']]);
    }
    R.scene('The TV repairman\'s service call', H, knock, it.t, [vic]);
  }
  if (shop) { const tD = it.t; it.go(cabSpot(R, home, 0.4), 0, { teleport: true }); const ta = van.drive(tD, home); it.until(ta + 0.5); van.close(T('17:30')); }
  else van.leave(it.t);
  it.go(vic.offstageSpot, 0, { teleport: true });
  it.commit({ end: it.t + 1, noResume: true });
}

// ---------------------------------------------------------------- a telegram for the Novaks, 12:25
function telegram(R) {
  const L = R.L;
  const H = R.byName.get('Novak Residence');
  const office = L.place('Bay Travel & Telegraph');
  if (!H || !office) return;
  const [host] = R.cast(H, '12:30', '12:40', 1, { filter: isAdult, household: true, prefer: (p) => p.sex === 'F' });
  if (!host) return;
  const boy = newTradesman(R, { first: 'Freddie', last: 'Lamont', age: 16, sex: 'M', outfit: 'bellhop', ox: office.door.x, oz: office.door.z, bio: 'Freddie Lamont, 16, telegraph messenger for Bay Travel & Telegraph. Cap, jacket, bicycle and a face arranged for bad news, just in case. Today it\'s all congratulations.' });
  const it = R.day(boy, T('12:18'), { label: 'Delivering a telegram', held: 'letter', from: boy.offstageSpot.node });
  const bs = R.sidewalk(H, 1.2, 1.5);
  if (!bs) return;
  const bSpot = R.spotAt(bs.x, bs.z, { yaw: H.P.yawIn, act: 'stand' });
  const tA = it.go(bSpot, 0.1);
  const s = R.callerSpot(H, 0.1, { act: 'talk' });
  const arrive = it.go(s, 4, { act: 'talk', label: 'Delivering a telegram to the Novaks' });
  const tC = it.go(bSpot, 0.1, { held: null });
  it.go(boy.offstageSpot, 0, { label: 'Back to the telegraph office' });
  it.commit({ end: it.t + 1, noResume: true });
  L.block(host, arrive - 0.3, arrive + 4, R.hostSpot(H, { act: 'read_stand' }), 'read_stand', { label: 'Reading a telegram from Chicago', held: 'letter' });
  L.convo([boy, host], arrive, arrive + 4, [[0, `Telegram for Mrs. Casimir Novak!`], [1, 'From Chicago! Aunt Jadwiga. "CONGRATULATIONS HELEN AND ROBERT STOP SENDING PIEROGI STOP"'], [0, 'Any answer, ma\'am?'], [1, 'Tell her... tell her the bride is beautiful. Here\'s a dime for you.']]);
  const pp = H.at(bs.s + 0.9, bs.out);
  R.trails.add(boy, 'bicycle', { side: 0.55, fwd: 0.1, when: 'walk', t0: T('12:18'), t1: it.t, parks: [{ t0: tA + 0.02, t1: tC + 0.08, x: pp.x, z: pp.z, yaw: H.P.yawRight, y: 0.25 }], tint: '#2a3a6a' });
  R.scene('A telegram for the Novaks', H, arrive, arrive + 4, [boy, host]);
}

// ---------------------------------------------------------------- moving day at the Marlowe, 8:25 - 13:30
function movingDay(R) {
  const L = R.L;
  const H = R.byName.get('The Marlowe Apartments');
  if (!H) return;
  const c = H.P.curb, f = curbFrame(c);
  const van = R.fleet.add('truck_moving', { label: 'Harbor Moving & Storage: the Lindbergs of Worcester, moving in', len: 7.4, speed: 5 });
  van.enter(T('8:25'), c); van.leave(T('13:32'));
  const wagon = R.fleet.add('car_wagon', { tint: '#6a5a3a', tint2: '#d8c8a0', label: 'The Lindbergs\' Ford wagon, Massachusetts plates, a mattress on the roof rack', len: 5 });
  const c2 = { x: c.x - f.v[0] * 8.5, z: c.z - f.v[1] * 8.5, yaw: c.yaw };
  wagon.enter(T('8:31'), c2); wagon.close(T('23:59'));
  // furniture waiting its turn on the sidewalk
  const furn = [['sofa', 'The Lindbergs\' sofa, waiting its turn on the sidewalk'], ['armchair', null], ['moving_boxes', 'Cartons marked KITCHEN, KITCHEN, BOOKS, MISC.'], ['lamp_floor', null], ['dresser', null], ['moving_boxes', null], ['rocking_chair', 'Grandmother Lindberg\'s rocker, wrapped in a quilt'], ['table_kitchen', null], ['suitcase_upright', null], ['trunk', null]];
  let k = 0;
  for (let s = -9; s <= 9 && k < furn.length; s += 1.9) {
    if (Math.abs(s) < 1.8) continue;
    const p = H.at(s, 0.95);
    if (R.open(p.x, p.z, { r: 0.55, lawn: false, h: 1.5 }) === false) continue;
    const [type, lab] = furn[k];
    const tIn = T('8:40') + k * 5, tOut = T('10:20') + k * 14;
    L.timed(type, p.x, p.z, H.P.yawOut + (k % 3 === 1 ? 0.4 : 0), tIn, tOut);
    if (lab) L.label(p.x, 0.8, p.z, tIn, tOut, lab, 1.2);
    k++;
  }
  // the movers go back and forth from the tailgate to the lobby door
  const door = H.at(0, H.doorOut + 0.6), tail = f.at(-4.2, 1.9);
  const dist = Math.min(7, Math.hypot(door.x - tail.x, door.z - tail.z) - 0.6);
  const yaw = Math.atan2(door.x - tail.x, door.z - tail.z);
  const movers = [['Hub', 'Dorsey', 46, 'Hub Dorsey, 46, mover. Has carried eleven pianos up the Marlowe stairs in his career and remembers each one personally.', ['Lift with the legs, Tiny. The legs.', 'That goes upstairs. No — the OTHER upstairs.']], ['Tiny', 'Szabo', 23, 'Tiny Szabo, 23, six foot four, mover, called Tiny since the fourth grade and resigned to it.', ['Books. Why is it always books.', 'Coming through! Mind your toes, ma\'am.']]];
  movers.forEach(([fn, ln, age, bio, lines], i) => {
    const m = newTradesman(R, { first: fn, last: ln, age, sex: 'M', outfit: 'mechanic', bio, lines });
    const off = f.at(-2 + i * 0.8, 1.15);
    const it = R.day(m, T('8:24'), { label: 'Moving the Lindbergs in', from: m.offstageSpot.node });
    it.go(R.spotAt(off.x, off.z, { hidden: true, y: 0.25 }), 0, { teleport: true });
    it.until(T('8:36'));
    const base = { x: tail.x + Math.cos(yaw) * (i - 0.5) * 0.9, z: tail.z - Math.sin(yaw) * (i - 0.5) * 0.9 };
    it.go(R.spotAt(base.x, base.z, { yaw, act: 'carry', pace: dist - i * 0.6 }), T('11:05') - T('8:37'), { act: 'carry', held: 'carton_carry', label: 'Carrying the Lindbergs\' worldly goods up to the third floor' });
    const lunch = f.at(-5.6 - i * 0.7, 2.6);
    it.go(R.spotAt(lunch.x, lunch.z, { yaw: f.yawRoad, act: 'drink_stand' }), 18, { act: 'drink_stand', label: 'Coffee break on the tailgate' });
    it.go(R.spotAt(base.x, base.z, { yaw, act: 'carry', pace: dist - i * 0.6 }), T('13:05') - it.t, { act: 'carry', held: 'carton_carry', label: 'Carrying the Lindbergs\' worldly goods up to the third floor' });
    it.go(R.spotAt(off.x, off.z, { hidden: true, y: 0.25 }), 0, {});
    it.commit({ end: T('13:40'), noResume: true });
    L.sound(base.x, 1, base.z, '8:40', '13:00', 'chatter', { range: 25, vol: 0.3 });
  });
  // the new family
  const fam = [
    ['Carl', 'Lindberg', 38, 'M', 'Carl Lindberg, 38, transferred from Worcester to manage the shoe department at Harlow\'s. Moving day on the Centennial was his idea. He has been told so.', ['That goes upstairs. No, the OTHER upstairs.', 'We picked the Centennial so the whole town would be too busy to watch. Look at them all.']],
    ['Ruth', 'Lindberg', 35, 'F', 'Ruth Lindberg, 35, new to Juniper Bay by way of Worcester, and already invited to two bridge clubs and a church supper before the sofa is inside.', ['Nancy, get off the boxes. Jimmy, get off Nancy.', 'Everyone keeps bringing coffee cake. I think it\'s a custom.']],
    ['Nancy', 'Lindberg', 9, 'F', 'Nancy Lindberg, 9, new girl, sizing up the neighbourhood from the top of a stack of cartons.', ['Is there a library? Is it far? Can I go now?']],
    ['Jimmy', 'Lindberg', 6, 'M', 'Jimmy Lindberg, 6, has already found the only mud puddle on Church Street.', ['Is that the ocean? Can we go see the ocean?']],
  ].map(([fn, ln, age, sex, bio, lines]) => newTradesman(R, { first: fn, last: ln, age, sex, bio, lines }));
  const [carl, ruth, nancy, jimmy] = fam;
  const inDoor = R.spotAt(door.x, door.z, { hidden: true, y: H.doorY });
  const car = cabSpot(R, c2, 0.4);
  const famPlan = (p, spot, act, label, t1, extra = []) => {
    const it = R.day(p, T('8:31'), { label, from: p.offstageSpot.node });
    it.go(car, 0, { teleport: true });
    it.until(T('8:34'));
    it.go(spot, t1 - T('8:35'), { act });
    for (const e of extra) it.go(e.spot, e.dwell, e);
    it.go(inDoor, 0, { label: 'Going in to the new apartment' });
    it.commit({ end: it.t + 5, noResume: true });
    p.at(it.t + 5, inDoor, 'stand', { label: 'Unpacking' });
  };
  const sp = (a, s, o) => { const q = f.at(a, s); return R.spotAt(q.x, q.z, o); };
  famPlan(carl, sp(-7.4, 2.4, { faceTo: [tail.x, tail.z], act: 'talk' }), 'talk', 'Directing the movers ("That goes upstairs. No — the other upstairs.")', T('13:02'));
  famPlan(ruth, sp(-1.5, 3.3, { faceTo: [door.x, door.z], act: 'talk' }), 'talk', 'Moving into the Marlowe — third floor, front', T('9:30'), [{ spot: sp(-2.4, 3.1, { yaw: f.yawWalk, act: 'talk' }), dwell: T('12:58') - T('9:31'), act: 'talk', label: 'Meeting the neighbours on moving day' }]);
  const boxes = H.at(-3.7, 1.1);
  famPlan(nancy, R.spotAt(boxes.x, boxes.z, { pose: 'sit', seat: 0.62, yaw: H.P.yawOut, act: 'read_book' }), 'read_book', 'Reading on top of the moving boxes', T('12:55'));
  famPlan(jimmy, sp(-9.5, 3.0, { act: 'play' }), 'play', 'Running circles around the moving van', T('12:56'));
  // neighbours come by
  const clara = L.person('Clara', 'Fairweather');
  const visitors = [];
  if (clara && R.idle(clara, '9:32', '9:58')) visitors.push([clara, '9:32', '9:58', 'Welcoming the new people with a coffee cake', 'pie', [[0, 'Clara Fairweather, second floor rear. I brought a coffee cake. It\'s a custom.'], [1, 'That\'s the third coffee cake this morning!'], [0, 'Then you\'ve met the Marlowe.']]]);
  const hazel = L.person('Hazel', 'Oakes');
  if (hazel && R.idle(hazel, '10:42', '11:10')) visitors.push([hazel, '10:42', '11:10', 'Getting the particulars on the new people', null, [[0, 'Hazel Oakes. Mill Street. You\'ll be on the party line with me, dear.'], [1, 'How nice. Is that... nice?'], [0, 'Worcester, is it? And Mr. Lindberg\'s at Harlow\'s? Shoes? Men\'s or ladies\'?'], [1, 'I — both?'], [0, 'Both. I\'ll remember that.']]]);
  for (const [v, a, b, label, held, script] of visitors) {
    const q = f.at(-3.2, 3.4);
    L.block(v, a, b, R.spotAt(q.x, q.z, { faceTo: [f.at(-2.4, 3.1).x, f.at(-2.4, 3.1).z], act: 'talk' }), 'talk', { label, held });
    L.convo([v, ruth], T(a) + 1, b, script);
    R.scene('Neighbours call on moving day', H, a, b, [v]);
  }
  const gawk = R.cast(H, '9:20', '10:15', 3, { filter: isKid, radius: 60, household: false });
  gawk.forEach((g, i) => { const q = f.at(-9 - i * 0.8, 3.4); L.block(g, '9:20', '10:15', R.spotAt(q.x, q.z, { faceTo: [tail.x, tail.z], act: 'look' }), 'look', { label: 'Watching the movers carry in a piano (it\'s a radio cabinet)' }); });
  R.scene('Moving day at the Marlowe', H, '8:25', '13:30', [carl, ruth, nancy, jimmy], null);
  R.seen('moving', { t0: '8:40', t1: '13:05', x: tail.x, y: 1.5, z: tail.z });
  R.scene('Moving day at the Marlowe (movers)', H, '8:36', '13:05', [carl, ruth]);
}

// ================================================================ off to work, home from work
// Somebody at the front door waving the breadwinner off in the morning and meeting him in the evening.
function doorways(R) {
  const L = R.L;
  let off = 0, back = 0;
  for (const H of R.homes) {
    if (H.apt) continue;
    for (const w of H.members) {
      if (!w.job || w.age < 18) continue;
      const works = w.schedule.filter((e) => e.label && /^Working/.test(e.label));
      if (!works.length) continue;
      const tl = works[0].t;
      if (tl >= T('6:40') && tl <= T('9:40') && R.rng.chance(0.7)) {
        const [who] = R.cast(H, tl - 1.5, tl + 3, 1, { filter: (x) => x !== w && x.age >= 4, household: true, prefer: (x) => x.sex !== w.sex && x.age >= 18 });
        if (who) {
          L.block(who, tl - 0.8, tl + 2.8, R.hostSpot(H, { act: 'wave' }), 'wave', { label: `Waving ${first(w)} off to work`, costume: tl < T('7:50') && who.age >= 16 ? COSTUME.robe(who) : null, lines: [`Don't forget your lunch pail!`, `Bring home a loaf from Halloran's!`, 'Home by six — the fireworks!'] });
          R.scene('Waving off to work at the front door', H, tl - 0.8, tl + 2.8, [who]); off++;
        }
      }
      const home = w.schedule.find((e) => e.t > tl && e.label && /^Home from work/.test(e.label));
      if (home && home.t >= T('12:30') && home.t <= T('17:40') && R.rng.chance(0.6)) {
        const arr = home.t + R.walkMin(w, L.whereAt(w, home.t - 0.1), home.spot ? home.spot.node : -1);
        const [who] = R.cast(H, arr - 2, arr + 3, 1, { filter: (x) => x !== w && x.age >= 4, household: true });
        if (who) {
          L.block(who, arr - 2, arr + 2.5, R.hostSpot(H, { act: 'wave' }), 'wave', { label: `Watching for ${first(w)} to come home from work`, lines: [`There he is! How was it?`, 'Wipe your feet. Supper\'s at six.'] });
          R.scene('Meeting him at the door after work', H, arr - 2, arr + 2.5, [who]); back++;
        }
      }
    }
  }
  void off; void back;
}

// ================================================================ yard, porch & street scenes
// Each recipe: fn(R, H, t0, t1) -> { title, people } or null (the place or the people weren't right).
const PAINTS = [['Hunter green', '#2e5a3a'], ['Colonial red', '#8a2a24'], ['Charleston green', '#1f3a30'], ['Federal blue', '#2a3a5a'], ['barn red', '#7a2a1e'], ['Cape Cod gray', '#6a6e70'], ['black-green', '#1e2a24'], ['a cream they call Nantucket', '#e8dcb8']];
const CARS = [['car_sedan', "the '49 Buick"], ['car_sedan', "the '51 Ford"], ['car_coupe', "the '48 Chevy Fleetline"], ['car_sedan', "the '50 Plymouth"], ['car_wagon', 'the Ford woody wagon'], ['car_convertible', "the '52 Studebaker convertible"], ['car_coupe', "the '47 Hudson"], ['car_sedan', 'the Nash']];
const CAR_TINTS = ['#2a4a7a', '#7a2a2a', '#2a5a3a', '#d8d0b8', '#1a1a1a', '#6a8aa0', '#8a7a5a', '#3a5a5a'];
const GOSSIP = [
  [[0, 'Stan Kaminski\'s worn a groove in the floor at St. Luke\'s. Any time now, they say.'], [1, 'First babies take their time. Mine took two days and a thunderstorm.']],
  [[0, 'Admiral went up the Hatch maple again. The whole fire department came.'], [1, 'That cat has cost this town more than the new seawall.']],
  [[0, 'Helen Novak\'s wedding\'s at two. Stella\'s been ironing tablecloths since four.'], [1, 'The Brennan boy\'s a good one. Sets type at the Courier. Steady hands.']],
  [[0, 'The Castellano boy\'s home from Korea. Rosa\'s cooked for three days.'], [1, 'We\'re all invited, I hear. Half past six. Bring a plate.']],
  [[0, 'Irene Halloran\'s pie is in the contest again. Against her own daughter!'], [1, 'Loretta Quimby pulled hers. Says it\'s 1949 all over again.']],
  [[0, 'The Hallorans eat supper in front of the television now. On trays.'], [1, 'On trays! Bridget Halloran must be spinning. And she isn\'t even dead.']],
  [[0, 'Hazel Oakes knew about Evelyn Sayer and Bill Ferris before Bill did.'], [1, 'That party line\'s faster than the Courier and twice as accurate.']],
  [[0, 'New family moving into the Marlowe. From Worcester, Hazel says.'], [1, 'Worcester. Well. They can\'t help that.']],
  [[0, 'Sixteen games back and Ted Williams is hitting like it\'s 1941.'], [1, 'Flew jets in Korea and came home swinging. There\'s a man.']],
  [[0, 'Mayor\'s speech is half past five. Mercifully short, they say.'], [1, 'They said that in \'48. I missed supper.']],
  [[0, 'Coffee\'s ninety cents a pound at Kowalski\'s. Ninety cents!'], [1, 'Ted Kowalski says it\'s Brazil. I say it\'s Ted Kowalski.']],
  [[0, 'You going down for the fireworks?'], [1, 'We\'ll watch from the porch. You can see them over the Trust Building.']],
  [[0, 'My brother-in-law bought a Hudson. I said, Walter, why.'], [1, 'What\'d he say?'], [0, '"Because it\'s a Hudson." I had no answer to that.']],
  [[0, 'Dottie Flanagan wrote the Castellano boy every week he was gone.'], [1, 'Every week! Well. You can bet on a June wedding.']],
];
const EVENT_HOUSES = [['Hatch Residence', '10:20', '12:05'], ['Moreau Residence', '13:20', '17:30'], ['Castellano Residence', '17:00', '21:40'], ['Halloran Residence', '17:30', '19:45'], ['Novak Residence', '11:50', '15:40'], ['The Marlowe Apartments', '8:15', '13:45']];
function eventHouse(H, t0, t1) { return EVENT_HOUSES.some(([n, a, b]) => H.name.startsWith(n) && T(a) < t1 && T(b) > t0); }
function neighbourOf(R, H) {
  let best = null, bd = 22;
  for (const Q of R.homes) { if (Q === H || Q.street !== H.street || Q.P.u.join() !== H.P.u.join()) continue; const d = Math.hypot(Q.P.door.x - H.P.door.x, Q.P.door.z - H.P.door.z); if (d < bd) { bd = d; best = Q; } }
  return best;
}
// porch rockers & chairs as outdoor spots (the house's own porch spots sit in the porch "room")
function porchSeat(R, H, i = 0) {
  const src = H.P.porch && H.P.porch[i]; if (!src || src.pose !== 'sit') return null;
  const key = H.name + ':porchseat:' + i;
  if (R.spotCache.has(key)) return R.spotCache.get(key);
  const s = R.L.spot(src.x, src.z, { y: src.y, yaw: src.yaw, pose: 'sit', seat: src.seat || 0.45, act: 'sit' });
  R.spotCache.set(key, s);
  return s;
}
// the top of the porch steps / stoop, for sitting on
function stepSeat(R, H, side = 0.6) {
  const out = H.row ? (H.porchOut + H.stepEnd) / 2 : H.stepEnd + 0.15;
  const p = H.at(side, out);
  const y = R.L.ground(p.x, p.z, H.doorY + 0.4);
  const seat = Math.max(0.12, Math.min(0.5, y - H.lawnY + 0.05));
  return R.spotAt(p.x, p.z, { y: H.lawnY, pose: 'sit', seat, yaw: H.P.yawOut, act: 'sit' });
}
const blk = (R, p, t0, t1, spot, act, label, o = {}) => { if (!R.focus && spot) R.focus = spot; R.L.block(p, t0, t1, spot, act, { label, held: o.held, lines: o.lines, costume: o.costume }); };
// a free point on the front walk/lawn or sidewalk suitable for a small group, r metres across
function yardOrWalk(R, H, t0, t1, r = 1.2) {
  const pts = R.frontLawn(H, { t0, t1, r });
  if (pts.length) return pts[0];
  const sw = R.sidewalk(H, R.rng.pick([-2, 2]), 1.3, { r: Math.min(r, 0.9), t0, t1 });
  return sw ? { ...sw, y: H.lawnY } : null;
}
// Walls of a house as frames: pos(t, off) = the point t along the wall, off metres out from its face.
// front: t = side coordinate; right/left: t = out coordinate (from the facade back along the side wall)
function walls(R, H) {
  if (H._walls) return H._walls;
  const P = H.P, y = H.lawnY + 1.6;
  // the side walls aren't always in line with the facade's ends (wings, bays): find the face at each t
  const sideFace = (dir) => { const memo = new Map(); return (t) => { const k = Math.round(t * 4); if (memo.has(k)) return memo.get(k); let f = null; const lim = dir > 0 ? H.lotR : H.lotL; for (let sd = lim; dir > 0 ? sd > H.faceR - 3 : sd < H.faceL + 3; sd -= dir * 0.25) { const q = H.at(sd, t); if (R.solid(q.x, y, q.z) || R.solid(q.x, y + 1.2, q.z)) { f = sd; break; } } memo.set(k, f); return f; }; };
  const fr = sideFace(1), fl = sideFace(-1);
  const front = { name: 'front', pos: (t, off) => H.at(t, H.doorOut + 0.05 + off), yawOut: P.yawOut, yawIn: P.yawIn, t0: H.faceL + 0.35, t1: H.faceR - 0.35, blocked: (t) => H.hasPorch && t > H.porchL - 0.8 && t < H.porchR + 0.8, room: () => -H.doorOut - 0.6 };
  const right = { name: 'right', pos: (t, off) => { const f = fr(t); return f === null ? null : H.at(f + 0.06 + off, t); }, yawOut: P.yawRight, yawIn: P.yawLeft, t0: H.backOut + 0.6, t1: H.doorOut - 0.5, blocked: (t) => fr(t) === null, room: (t) => H.lotR - (fr(t) ?? H.lotR) - 0.3 };
  const left = { name: 'left', pos: (t, off) => { const f = fl(t); return f === null ? null : H.at(f - 0.06 - off, t); }, yawOut: P.yawLeft, yawIn: P.yawRight, t0: H.backOut + 0.6, t1: H.doorOut - 0.5, blocked: (t) => fl(t) === null, room: (t) => (fl(t) ?? H.lotL) - H.lotL - 0.3 };
  H._walls = [front, right, left];
  return H._walls;
}
// windows on a wall between heights (above the lawn) y0..y1: [{t, t0, t1, lo, hi}]
function wallWindows(R, H, W, y0, y1) {
  const key = W.name + ':' + y0 + ':' + y1;
  H._win = H._win || new Map();
  if (H._win.has(key)) return H._win.get(key);
  H._glass = H._glass || new Map();
  let cols = H._glass.get(W.name);
  if (!cols) {
    // one pass up each wall: which heights (above the lawn) are glass, column by column
    cols = [];
    for (let t = W.t0; t <= W.t1; t += 0.25) {
      const p = W.pos(t, -0.17);
      if (!p) continue;
      const ys = [];
      for (let y = 0.7; y <= 5.8; y += 2 * VS) if (R.glass(p.x, H.lawnY + y, p.z)) ys.push(H.lawnY + y);
      if (ys.length) cols.push({ t, ys });
    }
    H._glass.set(W.name, cols);
  }
  const wins = [];
  for (const c of cols) {
    const ys = c.ys.filter((y) => y >= H.lawnY + y0 && y <= H.lawnY + y1);
    if (!ys.length) continue;
    const w = wins[wins.length - 1], lo = ys[0], hi = ys[ys.length - 1];
    if (w && c.t - w.t1 < 0.3) { w.t1 = c.t; w.lo = Math.min(w.lo, lo); w.hi = Math.max(w.hi, hi); } else wins.push({ t0: c.t, t1: c.t, lo, hi });
  }
  for (const w of wins) { w.t = (w.t0 + w.t1) / 2; w.w = w.t1 - w.t0 + 0.25; }
  const res = wins.filter((w) => w.w >= 0.5);
  H._win.set(key, res);
  return res;
}
// top of a wall at t (metres above the lawn): where the eave and gutter are
function wallTop(R, H, W, t) {
  const key = W.name + ':' + Math.round(t * 8);
  H._top = H._top || new Map();
  if (H._top.has(key)) return H._top.get(key);
  const p = W.pos(t, -0.17);
  let v = 0;
  if (p) { let y = H.lawnY + 2; while (y < H.lawnY + 12 && R.solid(p.x, y, p.z)) y += VS; v = y - H.lawnY; }
  H._top.set(key, v);
  return v;
}
// A ladder against wall W at t reaching h metres up (null if the ground, the porch or the air is in the way)
function ladderOn(R, H, W, t, h, t0, t1) {
  if (t < W.t0 || t > W.t1 || W.blocked(t)) return null;
  const scale = clamp(h / 5, 0.5, 1.5), reach = 1.16 * scale;
  if (reach + 0.35 > W.room(t)) return null;
  const foot = W.pos(t, reach);
  if (R.open(foot.x, foot.z, { r: 0.28, y: H.lawnY, tol: 0.1, t0, t1, props: false }) === false) return null;
  if (R.propsNear(foot.x, foot.z, 0.25, H.lawnY).some((q) => !/bush|flower|leaf/.test(q.name))) return null;
  for (let k = 0.1; k < 0.84; k += 0.07) {
    for (const dt of [-0.25, 0.25]) { const q = W.pos(t + dt, reach * (1 - k) + 0.05); const y = H.lawnY + h * k; if (!q || R.solid(q.x, y + 0.15, q.z) || R.solid(q.x, y + 0.4, q.z)) return null; }
  }
  return { W, t, h, scale, reach, foot, footYaw: W.yawOut };
}
// the spot for somebody standing on a ladder with their feet hp metres up, facing the wall
function onLadder(R, H, lad, hp, act) {
  const k = clamp(hp / (5 * lad.scale), 0, 0.95);
  const p = lad.W.pos(lad.t, lad.reach * (1 - k) + 0.32);
  const f = lad.W.pos(lad.t + 0.45, lad.reach + 0.45);
  const footSpot = R.spotAt(f.x, f.z, { yaw: lad.W.yawIn, act: 'stand' });
  return R.L.spot(p.x, p.z, { y: H.lawnY + hp, yaw: lad.W.yawIn, act, link: footSpot.node });
}
// candidate (wall, position) pairs next to windows at heights y0..y1, visible side first
function besideWindows(R, H, y0, y1) {
  const out = [];
  for (const W of walls(R, H)) for (const w of wallWindows(R, H, W, y0, y1)) for (const t of [w.t0 - 0.6, w.t1 + 0.6]) out.push({ W, t, w, pri: W.name === 'front' ? 0 : Math.abs(t - H.doorOut) });
  return R.rng.shuffle(out).sort((a, b) => a.pri - b.pri);
}

const RECIPES = [];
const recipe = (key, when, dur, max, fn, o = {}) => RECIPES.push({ key, when, dur, max, fn, w: o.w || 1, homes: o.homes || ((H) => H.detached) });

// ---------------------------------------------------------------- raking, then the kids find the pile
recipe('rake', [['8:20', '12:00'], ['13:20', '17:25']], [50, 95], 16, (R, H, t0, t1) => {
  const L = R.L;
  const pts = R.frontLawn(H, { t0, t1, r: 1.2 });
  if (pts.length < 3) return null;
  const pile = pts[0];
  const rakers = R.cast(H, t0, t1, R.rng.chance(0.5) ? 2 : 1, { filter: (p) => p.age >= 11 && p.age < 76 });
  if (!rakers.length) return null;
  const spots = pts.filter((q) => { const d = Math.hypot(q.x - pile.x, q.z - pile.z); return d > 2.2 && d < 4.5; });
  if (spots.length < rakers.length) return null;
  const ppl = [];
  rakers.forEach((p, i) => {
    const q = spots[i * 3 % spots.length];
    const sp = R.spotAt(q.x, q.z, { faceTo: [pile.x, pile.z], act: 'rake', pace: 1.8 });
    blk(R, p, t0, t1, sp, 'rake', i === 0 ? `Raking ${theirs(H)} front lawn into a pile` : 'Raking leaves (and complaining about the maple)', { lines: ['That maple drops every leaf the day after I rake.', 'Leave the pile alone till I\'m done, you hear?', 'Every October. Every blessed October.'] });
    ppl.push(p);
  });
  const d = t1 - t0, yaw = R.rng.float(0, 6.28);
  L.timed('leaf_pile', pile.x, pile.z, yaw, t0 + 4, t0 + d * 0.35, { scale: 0.55 });
  L.timed('leaf_pile', pile.x, pile.z, yaw, t0 + d * 0.35, t0 + d * 0.7, { scale: 0.85 });
  L.timed('leaf_pile', pile.x, pile.z, yaw, t0 + d * 0.7, t1 + 80, { scale: 1.2 });
  L.label(pile.x, 0.5, pile.z, t0 + 4, t1 + 80, `${theirs(H)} leaf pile, growing`, 1.4);
  R.claim(pile.x, pile.z, 1.6, t0, t1 + 80);
  // the last half hour: the kids find the pile
  if (d >= 45) {
    const kids = R.cast(H, t1 - 28, t1 + 2, 3, { filter: (p) => p.age >= 4 && p.age <= 12, exclude: rakers, radius: 60 });
    if (kids.length) {
      const js = R.spotAt(pile.x, pile.z, { act: 'jump_rope', spread: 0.8, faceTo: [pile.x + 0.01, pile.z] });
      kids.forEach((k) => blk(R, k, t1 - 28, t1 + 2, js, 'jump_rope', `Jumping in ${theirs(H)} leaf pile`, { lines: ['Geronimo!', 'Don\'t tell Pop!', 'There\'s a worm in my collar!', 'Again! Again!'] }));
      R.seen('leaf', { t0: t1 - 27, t1: t1 + 2, x: pile.x, y: pile.y + 0.6, z: pile.z });
      L.sound(pile.x, 1, pile.z, t1 - 28, t1 + 2, 'kids', { range: 35, vol: 0.5 });
      L.convo([rakers[0], kids[0]], t1 - 26, t1, [[0, 'Not in the pile! ...Oh, all right. Once more.'], [1, 'Once more!'], [0, 'That was four times.']]);
      ppl.push(...kids);
      R.scene('Kids jumping in the leaf pile', H, t1 - 28, t1 + 2, kids);
    }
  }
  return { title: 'Raking leaves', people: rakers };
});

// ---------------------------------------------------------------- burning leaves in the gutter
recipe('burn', [['9:00', '12:10'], ['13:30', '17:40']], [55, 95], 10, (R, H, t0, t1) => {
  const L = R.L;
  const side = R.rng.pick([-2.5, 2.5, -3.5, 3.5]);
  const g = H.at(side, 4.45);
  if (R.claimed(g.x, g.z, 2.5, t0 - 10, t1 + 30)) return null;
  const sw = H.at(side, 3.35);
  if (R.open(sw.x, sw.z, { r: 0.35, lawn: false, t0, t1, h: 1.7 }) === false) return null;
  const [p] = R.cast(H, t0, t1, 1, { filter: (q) => q.age >= 16 && q.age < 80, prefer: (q) => q.sex === 'M' });
  if (!p) return null;
  const f = R.spotAt(sw.x, sw.z, { faceTo: [g.x, g.z], act: 'rake' });
  blk(R, p, t0, t1, f, 'rake', 'Burning leaves in the gutter', { lines: ['Smell that? That\'s October, that is.', 'Mind the sparks, now.', 'The Fire Department says don\'t. The Fire Department is at the fair.'] });
  L.timed('leaf_fire', g.x, g.z, R.rng.float(0, 6.28), t0 + 2, t1 + 25);
  L.label(g.x, 0.5, g.z, t0 + 2, t1 + 25, 'Leaves smouldering in the gutter — the smell of every October in New England', 1.6);
  R.claim(g.x, g.z, 2.2, t0, t1 + 25);
  R.smoke(g.x, R.L.ground(g.x, g.z) + 0.3, g.z, t0 + 2, t1 + 25);
  const ppl = [p];
  const nb = R.cast(H, t0 + 10, t0 + 32, 1, { filter: isAdult, exclude: [p], radius: 60 });
  if (nb.length) {
    const q = H.at(side + 1.4, 2.6);
    blk(R, nb[0], t0 + 10, t0 + 32, R.spotAt(q.x, q.z, { faceTo: [sw.x, sw.z], act: 'talk' }), 'talk', `Passing the time at ${theirs(H)} leaf fire`);
    L.convo([nb[0], p], t0 + 11, t0 + 32, [[0, 'Nothing smells like burning leaves.'], [1, 'Mary says it gets in the curtains.'], [0, 'Mary\'s right. Mary\'s always right. Still smells good.']]);
    ppl.push(nb[0]);
  }
  return { title: 'Burning leaves at the curb', people: ppl };
});

// ---------------------------------------------------------------- painting the shutters from a ladder
recipe('paint', [['8:30', '12:00'], ['13:00', '16:40']], [80, 120], 9, (R, H, t0, t1) => {
  const L = R.L;
  let lad = null, win = null;
  for (const c of besideWindows(R, H, 2.5, 5.8).concat(besideWindows(R, H, 0.8, 2.4)).slice(0, 14)) {
    const l = ladderOn(R, H, c.W, c.t, c.w.hi - H.lawnY + 0.4, t0, t1);
    if (l) { lad = l; win = c.w; break; }
  }
  if (!lad) return null;
  const [p] = R.cast(H, t0, t1, 1, { filter: (q) => q.age >= 17 && q.age < 70, prefer: (q) => q.sex === 'M' });
  if (!p) return null;
  const [name, tint] = R.rng.pick(PAINTS);
  const hp = clamp((win.lo + win.hi) / 2 - H.lawnY - 1.35, 0.4, 5.2);
  const sp = onLadder(R, H, lad, hp, 'paint');
  blk(R, p, t0, t1, sp, 'paint', `Painting the shutters ${name}`, { costume: COSTUME.painter(p), lines: [`${name}. The paint man swore it wouldn't fade. They always swear.`, 'Hold the ladder, would you? No — hold it, don\'t shake it.', 'Two coats. The Centennial only comes once.'] });
  L.timed('ladder_extension', lad.foot.x, lad.foot.z, lad.footYaw, t0 - 5, t1 + 10, { scale: lad.scale });
  const dc = lad.W.pos(lad.t + 0.9, 0.85), pc = lad.W.pos(lad.t + 1.0, 0.95);
  if (R.open(dc.x, dc.z, { r: 0.45, y: H.lawnY, props: false }) !== false) { L.timed('drop_cloth', dc.x, dc.z, lad.W.yawOut, t0 - 5, t1 + 10, { tint }); L.timed('paint_cans_open', pc.x, pc.z, lad.W.yawOut, t0 - 5, t1 + 10, { tint, y: H.lawnY + 0.05 }); }
  L.label(lad.foot.x, 1.2, lad.foot.z, t0 - 5, t1 + 10, `${mr(p)}'s ladder, and a can of ${name}`, 1.4);
  R.claim(lad.foot.x, lad.foot.z, 1.6, t0 - 5, t1 + 10);
  const ppl = [p];
  const [helper] = R.cast(H, t0 + 15, t0 + 45, 1, { filter: (q) => q.age >= 8, exclude: [p], household: true });
  if (helper) {
    const q = lad.W.pos(lad.t - 0.9, lad.reach + 0.3);
    if (R.open(q.x, q.z, { r: 0.3, y: H.lawnY, props: false }) !== false) {
      blk(R, helper, t0 + 15, t0 + 45, R.spotAt(q.x, q.z, { faceTo: [lad.foot.x, lad.foot.z], act: 'look' }), 'look', 'Holding the ladder (and supervising)');
      L.convo([helper, p], t0 + 16, t0 + 45, [[0, 'You missed a spot.'], [1, 'It\'s a shutter. It doesn\'t have spots.'], [0, 'Top left. It has a spot.'], [1, '...Hand me the small brush.']]);
      ppl.push(helper);
    }
  }
  return { title: 'Painting the shutters on a ladder', people: ppl };
});

// ---------------------------------------------------------------- cleaning the gutters
recipe('gutters', [['9:00', '12:00'], ['13:00', '16:30']], [40, 70], 6, (R, H, t0, t1) => {
  const L = R.L;
  let lad = null;
  for (const W of R.rng.shuffle(walls(R, H).slice())) {
    for (const t of R.rng.shuffle([W.t0 + 0.4, W.t1 - 0.4, (W.t0 + W.t1) / 2])) {
      const h = wallTop(R, H, W, t);
      if (h < 2.6 || h > 7.3 || Math.abs(wallTop(R, H, W, t + (t > (W.t0 + W.t1) / 2 ? -0.9 : 0.9)) - h) > 0.3) continue; // a gable end, not an eave
      const l = ladderOn(R, H, W, t, h - 0.1, t0, t1); if (l) { lad = l; break; }
    }
    if (lad) break;
  }
  if (!lad) return null;
  const [p] = R.cast(H, t0, t1, 1, { filter: (q) => q.age >= 16 && q.age < 68, prefer: (q) => q.sex === 'M' });
  if (!p) return null;
  const sp = onLadder(R, H, lad, lad.h - 1.7, 'shelve');
  blk(R, p, t0, t1, sp, 'shelve', 'Cleaning the gutters (maple leaves, a tennis ball, a robin\'s nest)', { lines: ['Found Tommy\'s ball! Tell him it was here all summer.', 'Who put a roof under all these leaves?', 'One more handful and I\'m calling it a gutter.'] });
  L.timed('ladder_extension', lad.foot.x, lad.foot.z, lad.footYaw, t0 - 3, t1 + 5, { scale: lad.scale });
  const m = lad.W.pos(lad.t + 0.8, 0.6);
  L.timed('leaf_pile', m.x, m.z, 0.7, t0 + 5, t1 + 60, { scale: 0.4 });
  R.claim(lad.foot.x, lad.foot.z, 1.5, t0 - 3, t1 + 5);
  return { title: 'Cleaning the gutters', people: [p] };
});

// ---------------------------------------------------------------- the TV antenna ("Better?" "No!")
recipe('antenna', [['10:00', '11:50'], ['13:00', '16:50'], ['18:40', '19:20']], [35, 50], 4, (R, H, t0, t1) => {
  const L = R.L;
  let a = H.antenna, fresh = false;
  if (!a) {
    // a brand-new antenna going up on the ridge
    const s = (H.faceL + H.faceR) / 2, o = (H.doorOut + H.backOut) / 2, q = H.at(s, o);
    const y = L.ground(q.x, q.z, 18);
    if (y < H.lawnY + 4) return null;
    a = { x: q.x, z: q.z, y }; fresh = true;
  }
  let lad = null;
  for (const W of walls(R, H)) {
    for (const t of [W.t0 + 0.4, W.t1 - 0.4]) {
      const h = wallTop(R, H, W, t);
      if (h < 2.6 || h > 7.3 || Math.abs(wallTop(R, H, W, t + (t > (W.t0 + W.t1) / 2 ? -0.9 : 0.9)) - h) > 0.3) continue;
      const l = ladderOn(R, H, W, t, h + 0.5, t0, t1); if (l) { lad = l; break; }
    }
    if (lad) break;
  }
  if (!lad) return null;
  const roofX = a.x + H.P.u[0] * 1.1, roofZ = a.z + H.P.u[1] * 1.1;
  const ry = R.L.ground(roofX, roofZ, 18);
  if (ry < H.lawnY + 2.5) return null;
  const [him] = R.cast(H, t0, t1, 1, { filter: (q) => q.sex === 'M' && q.age >= 20 && q.age < 66, household: true });
  const [her] = R.cast(H, t0, t1, 1, { filter: (q) => q.sex === 'F' && q.age >= 16, household: true });
  if (!him || !her) return null;
  const top = onLadder(R, H, lad, lad.h - 1.4, 'stand');
  void fresh;
  const roof = L.spot(roofX, roofZ, { y: ry, faceTo: [a.x, a.z], act: 'wrench', link: top.node });
  L.plan(him, t0, t1, [{ t: t0, spot: top, act: 'stand', label: 'Climbing up to the TV antenna' }, { t: t0 + 1.5, spot: roof, act: 'wrench', label: 'On the roof, turning the TV antenna toward Boston' }]);
  const lawn = H.at(R.rng.pick([-1.4, 1.4]), H.yardFront + 1.6);
  const shout = R.spotAt(lawn.x, lawn.z, { faceTo: [roofX, roofZ], act: 'wave' });
  const door = R.hostSpot(H, { act: 'talk' });
  const ent = []; let t = t0 + 2, k = 0;
  while (t < t1 - 2) { ent.push({ t, spot: k % 2 ? door : shout, act: k % 2 ? 'talk' : 'wave', label: k % 2 ? 'Checking the picture on the Admiral' : 'Shouting up to the roof: "Better! ...No!"' }); t += k % 2 ? 2.5 : 3.5; k++; }
  L.plan(her, t0 + 2, t1, ent);
  R.seen('antenna', { p: him, t0: t0 + 1.5, t1 });
  L.convo([him, her], t0 + 3, t1, [[0, 'How\'s that?'], [1, 'Better! ...No!'], [0, 'Now?'], [1, 'Now it\'s snowing!'], [0, 'It was snowing before!'], [1, 'It\'s snowing differently!'], [0, 'What about now?'], [1, 'You\'ve got Channel 4 and a ghost of Channel 7!'], [0, 'Which one\'s the ghost?'], [1, 'Milton Berle has two heads!'], [0, 'That\'s not the antenna.']]);
  L.timed('ladder_extension', lad.foot.x, lad.foot.z, lad.footYaw, t0 - 2, t1 + 3, { scale: lad.scale });
  if (fresh) { L.timed('tv_antenna', a.x, a.z, R.rng.float(0, 3), t0 + 4, T('23:59'), { y: a.y }); L.label(a.x, a.y + 1.5, a.z, t0 + 4, T('23:59'), `${theirs(H)} brand-new TV antenna, pointed at Boston (more or less)`, 2); }
  if (T(t0) > T('18:00')) L.say(him, t0, t1, ['Gleason\'s on at eight. I\'ve got till eight.']);
  R.claim(lad.foot.x, lad.foot.z, 1.5, t0, t1);
  return { title: 'The TV antenna ("Better?" "No!")', people: [him, her] };
});

// ---------------------------------------------------------------- the last mow of the year
recipe('mow', [['9:30', '12:00'], ['13:30', '17:20']], [30, 50], 8, (R, H, t0, t1) => {
  const L = R.L;
  const pts = R.frontLawn(H, { t0, t1, r: 0.6 });
  for (const q of pts) {
    for (const dir of [H.P.yawRight, H.P.yawLeft]) {
      const dx = Math.sin(dir), dz = Math.cos(dir);
      let ok = true;
      for (let k = 1; k <= 4; k++) if (!R.lawnFree(H, q.x + dx * k, q.z + dz * k, 0.5, t0, t1)) { ok = false; break; }
      if (!ok) continue;
      const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 13 && x.age < 72, prefer: (x) => x.sex === 'M' });
      if (!p) return null;
      const sp = R.spotAt(q.x, q.z, { yaw: dir, act: 'wash', pace: 3.4 });
      blk(R, p, t0, t1, sp, 'wash', 'Mowing the lawn with the push mower — the last cut of the year', { lines: ['Last mow of the year, I promise.', 'Clatter-clatter-clatter. Best sound in the world.'] });
      R.trails.add(p, 'lawn_mower', { fwd: 0.8, when: 'always', t0, t1 });
      L.sound(q.x + dx * 1.7, 0.5, q.z + dz * 1.7, t0, t1, 'mower', { range: 40, vol: 0.4 });
      R.claim(q.x + dx * 1.7, q.z + dz * 1.7, 2.4, t0, t1);
      return { title: 'Mowing the front lawn', people: [p] };
    }
  }
  return null;
});

// ---------------------------------------------------------------- washing the windows
// where to stand to reach a ground-floor window from outside (the porch floor if it's under the porch)
function windowStand(R, H, W, w, t0, t1) {
  const p = W.pos(w.t, 0.72);
  if (!p) return null;
  const onPorch = W.name === 'front' && W.blocked(w.t);
  const y = onPorch ? R.L.ground(p.x, p.z, H.doorY + 0.4) : H.lawnY;
  if (onPorch && Math.abs(y - H.doorY) > 0.12) return null;
  if (R.open(p.x, p.z, { r: 0.2, y, tol: 0.12, any: onPorch, yTop: onPorch ? H.doorY + 0.4 : 3, t0, t1, props: false }) === false) return null;
  if (R.propsNear(p.x, p.z, 0.3, y).some((q) => q.name !== 'window_box')) return null;
  return { x: p.x, z: p.z, y, high: w.lo - y > 1.05, onPorch };
}
recipe('windows', [['8:30', '12:00'], ['13:00', '17:00']], [35, 60], 8, (R, H, t0, t1) => {
  const L = R.L;
  for (const W of walls(R, H)) for (const w of R.rng.shuffle(wallWindows(R, H, W, 0.7, 2.4))) {
    const st = windowStand(R, H, W, w, t0, t1);
    if (!st) continue;
    const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 14 && x.age < 75, prefer: (x) => x.sex === 'F' });
    if (!p) return null;
    const sp = R.spotAt(st.x, st.z, { yaw: W.yawIn, act: 'wash', y: st.y + (st.high ? 0.62 : 0) });
    blk(R, p, t0, t1, sp, 'wash', 'Washing the windows with vinegar and the Courier', { held: 'rag', costume: COSTUME.apron(p), lines: ['Vinegar and newspaper. My mother swore by it, and so do I.', 'The front windows for the Centennial. Company can look in, if they like.'] });
    if (st.high) L.timed('ladder_step', st.x, st.z, W.yawOut, t0 - 2, t1 + 2, { y: st.y });
    const b = W.pos(w.t + 0.8, 0.55);
    L.timed('bucket_suds', b.x, b.z, 0, t0 - 2, t1 + 2, { y: R.L.ground(b.x, b.z, st.y + 0.4) });
    R.claim(st.x, st.z, 1.2, t0, t1);
    return { title: st.onPorch ? 'Washing the windows from the porch' : 'Washing the windows', people: [p] };
  }
  return null;
});

// ---------------------------------------------------------------- beating the parlor rug
recipe('rug', [['9:00', '12:00'], ['13:00', '17:00']], [25, 40], 7, (R, H, t0, t1) => {
  const L = R.L;
  const pts = R.frontLawn(H, { t0, t1, r: 1.5 });
  const q = pts[0]; if (!q) return null;
  const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 14 && x.age < 72 });
  if (!p) return null;
  const yaw = H.P.yawRight;
  L.timed('rug_on_line', q.x, q.z, yaw, t0 - 3, t1 + 8, { tint: R.rng.pick(['#8a2a2a', '#2a3a5a', '#6a2a4a', '#3a4a2a']), tint2: '#c8a060' });
  const fx = q.x + Math.sin(yaw) * 1.0, fz = q.z + Math.cos(yaw) * 1.0;
  blk(R, p, t0, t1, R.spotAt(fx, fz, { faceTo: [q.x, q.z], act: 'hammer' }), 'hammer', 'Beating the parlor rug on the line', { held: 'rug_beater', lines: ['Whump! A year of company, coming out.', 'The Centennial comes once in a hundred years. So does this rug\'s cleaning.'] });
  L.sound(q.x, 1, q.z, t0, t1, 'hammer', { range: 30, vol: 0.3 });
  L.label(q.x, 1.3, q.z, t0 - 3, t1 + 8, `${theirs(H)} parlor rug, getting what\'s coming to it`, 1.3);
  R.claim(q.x, q.z, 1.8, t0 - 3, t1 + 8);
  return { title: 'Beating a rug on the line', people: [p] };
});

// ---------------------------------------------------------------- the wash on the line (back yards)
recipe('laundry', [['8:10', '10:30'], ['15:10', '17:20']], [20, 35], 10, (R, H, t0, t1) => {
  const ls = (H.P.yard || []).filter((s) => s.act === 'laundry');
  if (!ls.length) return null;
  const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 14, household: true, prefer: (x) => x.sex === 'F' });
  if (!p) return null;
  const morning = t0 < T('12:00');
  const sp = R.spotAt(ls[0].x, ls[0].z, { y: ls[0].y, yaw: ls[0].yaw, act: 'laundry' });
  blk(R, p, t0, t1, sp, 'laundry', morning ? 'Hanging out the wash — a good drying day' : 'Taking in the wash before the dew comes', { lines: morning ? ['Wind\'s from the west. It\'ll be dry by noon.'] : ['Stiff as boards. That\'s how you know it\'s clean.'] });
  return { title: morning ? 'Hanging out the wash' : 'Taking in the wash', people: [p] };
}, { homes: (H) => H.detached && (H.P.yard || []).some((s) => s.act === 'laundry') });

// ---------------------------------------------------------------- sweeping the porch or the front walk
recipe('sweep', [['7:10', '12:00'], ['12:20', '18:20']], [20, 35], 22, (R, H, t0, t1) => {
  const L = R.L;
  const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 11 && x.age < 85 });
  if (!p) return null;
  if (H.hasPorch && R.rng.chance(0.6)) {
    for (const s of R.rng.shuffle([H.porchL + 0.9, H.porchR - 0.9, 1.4, -1.4])) {
      const q = H.at(s, H.doorOut + 1.1);
      if (R.open(q.x, q.z, { r: 0.4, y: H.porchY ?? H.doorY, tol: 0.1, any: true, yTop: H.doorY + 0.4, t0, t1 }) === false) continue;
      blk(R, p, t0, t1, R.spotAt(q.x, q.z, { y: H.doorY, yaw: R.rng.pick([H.P.yawRight, H.P.yawLeft]), act: 'sweep', pace: 1.4 }), 'sweep', 'Sweeping the porch', { lines: ['Leaves on the porch, leaves in the hall, leaves in the soup.'] });
      return { title: 'Sweeping the porch', people: [p] };
    }
  }
  const len = Math.min(3.2, -H.stepEnd - 1.2);
  if (len < 1.2 && !H.row) return null;
  if (H.row) {
    const q = H.at(0.6, 1.2);
    blk(R, p, t0, t1, R.spotAt(q.x, q.z, { yaw: H.P.yawRight, act: 'sweep', pace: 2.2 }), 'sweep', 'Sweeping the sidewalk in front of the house', { lines: ['Mr. Brennan sweeps his half. I sweep mine. We don\'t discuss the middle.'] });
    return { title: 'Sweeping the sidewalk', people: [p] };
  }
  const q = H.at(0.1, H.stepEnd + 0.6);
  blk(R, p, t0, t1, R.spotAt(q.x, q.z, { yaw: H.P.yawOut, act: 'sweep', pace: len }), 'sweep', 'Sweeping the front walk', { lines: ['Company for the Centennial. They\'ll see the walk first.'] });
  return { title: 'Sweeping the front walk', people: [p] };
}, { homes: (H) => !H.apt });

// ---------------------------------------------------------------- snapping beans on the porch
recipe('beans', [['9:30', '12:00'], ['12:30', '17:15']], [40, 70], 12, (R, H, t0, t1) => {
  const L = R.L;
  const seat = porchSeat(R, H, 0) || (H.detached ? stepSeat(R, H, 0.7) : stepSeat(R, H, 0.5));
  if (!seat) return null;
  const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 14, prefer: (x) => x.sex === 'F' && x.age > 40 });
  if (!p) return null;
  blk(R, p, t0, t1, seat, 'sew', R.rng.pick(['Snapping green beans for supper', 'Shelling the last of the peas', 'Peeling apples for a pie']), { lines: ['The last of the garden. Next week it\'s all canned tomatoes and prayer.', 'Snap, snap. Better than a radio.'] });
  const b = { x: seat.x + Math.cos(seat.yaw) * 0.6, z: seat.z - Math.sin(seat.yaw) * 0.6 };
  L.timed('bushel_basket', b.x, b.z, seat.yaw, t0, t1, { y: seat.y, scale: 0.8 });
  const ppl = [p];
  const [kid] = R.cast(H, t0 + 5, t0 + 30, 1, { filter: (x) => x.age >= 5 && x.age <= 12, household: true });
  if (kid) {
    const s2 = porchSeat(R, H, 1) || stepSeat(R, H, -0.7);
    if (s2 && s2 !== seat) { blk(R, kid, t0 + 5, t0 + 30, s2, 'sew', 'Helping snap beans (eating every third one)'); L.convo([p, kid], t0 + 6, t0 + 30, [[0, 'Snap them, don\'t eat them.'], [1, 'I\'m testing them.'], [0, 'They passed. Snap.']]); ppl.push(kid); }
  }
  return { title: 'Snapping beans on the porch', people: ppl };
}, { homes: (H) => !H.apt });

// ---------------------------------------------------------------- the Red Sox on the porch radio
recipe('sox', [['13:20', '16:40']], [80, 120], 5, (R, H, t0, t1) => {
  const L = R.L;
  const men = R.cast(H, t0, t1, R.rng.chance(0.6) ? 2 : 1, { filter: (x) => x.sex === 'M' && x.age >= 12, radius: 40 });
  if (!men.length) return null;
  const seats = [porchSeat(R, H, 0), porchSeat(R, H, 1), stepSeat(R, H, 0.8), stepSeat(R, H, -0.8)].filter(Boolean);
  if (seats.length < men.length) return null;
  men.forEach((m, i) => blk(R, m, t0, t1, seats[i], i ? 'listen_sit' : 'talk_sit', 'Listening to the Red Sox on the radio', { lines: ['Gowdy says Williams hit one off the wall. OFF the wall!', 'Sixteen games back and I still can\'t turn it off.', 'Piersall! Piersall, you beautiful lunatic!', 'Parnell\'s tired. You can hear it in Gowdy\'s voice.'] }));
  const r0 = seats[0];
  const rp = { x: r0.x + Math.cos(r0.yaw) * 0.55, z: r0.z - Math.sin(r0.yaw) * 0.55 };
  L.timed('radio_portable', rp.x, rp.z, r0.yaw + Math.PI, t0, t1, { y: r0.y + (r0.seat > 0.3 ? 0 : 0.02) });
  L.sound(rp.x, 1, rp.z, t0, t1, 'radio', { range: 26, vol: 0.5 });
  L.label(rp.x, 0.6, rp.z, t0, t1, 'The Red Sox on the radio, Curt Gowdy calling it', 1.2);
  if (men.length > 1) L.convo(men, t0 + 2, t1, [[0, 'Two on, two out.'], [1, 'Don\'t say it.'], [0, 'I\'m not saying anything.'], [1, 'You were going to say "here we go."'], [0, '...Here we go.']]);
  return { title: 'The Red Sox game on the porch radio', people: men };
}, { homes: (H) => !H.apt });

// ---------------------------------------------------------------- neighbours talking over the fence
recipe('fence', [['7:40', '12:00'], ['12:20', '17:45'], ['18:45', '20:20']], [25, 45], 34, (R, H, t0, t1) => {
  const L = R.L;
  const N = neighbourOf(R, H); if (!N || eventHouse(N, t0, t1) || R.busyHouse(N, t0, t1)) return null;
  const [a] = R.cast(H, t0, t1, 1, { filter: isAdult, household: true });
  const [b] = R.cast(N, t0, t1, 1, { filter: isAdult, household: true });
  if (!a || !b) return null;
  // the boundary between the two lots, halfway up the front yard (or the sidewalk for row houses)
  const bx = (H.P.door.x + N.P.door.x) / 2, bz = (H.P.door.z + N.P.door.z) / 2;
  const sb = H.side(bx, bz);
  const out = H.row ? 1.0 : clamp((H.yardFront - 0.9) / 2, -3.5, -1.2);
  const dirS = Math.sign(sb) || 1;
  const pa = H.at(sb - dirS * 0.65, out), pb = H.at(sb + dirS * 0.65, out);
  const oa = R.open(pa.x, pa.z, { r: 0.3, t0, t1, h: 1.7 }), ob = R.open(pb.x, pb.z, { r: 0.3, t0, t1, h: 1.7 });
  if (oa === false || ob === false) return null;
  blk(R, a, t0, t1, R.spotAt(pa.x, pa.z, { faceTo: [pb.x, pb.z], act: 'talk' }), 'talk', `Talking over the fence with ${mr(b)}`);
  blk(R, b, t0, t1, R.spotAt(pb.x, pb.z, { faceTo: [pa.x, pa.z], act: R.rng.chance(0.4) ? 'lean' : 'talk' }), 'talk', `Talking over the fence with ${mr(a)}`);
  const script = [].concat(...R.rng.shuffle(GOSSIP.slice()).slice(0, 3));
  L.convo([a, b], t0 + 0.5, t1, script);
  R.claim((pa.x + pb.x) / 2, (pa.z + pb.z) / 2, 1.2, t0, t1);
  R.scene('Neighbours talking over the fence', N, t0, t1, []);
  return { title: 'Neighbours talking over the fence', people: [a, b] };
}, { homes: (H) => !H.apt });

// ---------------------------------------------------------------- the jalopy
recipe('jalopy', [['9:00', '12:00'], ['13:00', '17:30']], [80, 120], 3, (R, H, t0, t1) => {
  const L = R.L;
  const boys = R.cast(H, t0, t1, 2, { filter: (x) => x.sex === 'M' && x.age >= 14 && x.age <= 21, radius: 90 });
  if (!boys.length) return null;
  let c = null;
  if (H.drive !== null) { const q = H.at(H.drive, -3.2); if (R.open(q.x, q.z, { r: 1.0, lawn: false, t0, t1, h: 1.6, props: true }) !== false) c = { x: q.x, z: q.z, yaw: H.P.yawOut }; }
  if (!c) { const cp = H.P.curb; if (R.claimed(cp.x, cp.z, 3, t0, t1)) return null; c = { x: cp.x, z: cp.z, yaw: cp.yaw }; }
  const owner = boys[0];
  L.timed('jalopy_hood_up', c.x, c.z, c.yaw, t0 - 10, t1 + 40, { tint: R.rng.pick(['#6a6e70', '#7a7a70', '#5a5e62']), tint2: R.rng.pick(['#8a2a24', '#2a4a7a', '#c8a030']) });
  L.label(c.x, 1.2, c.z, t0 - 10, t1 + 40, `${first(owner)} ${owner.last}'s '31 Model A, running on hope and baling wire`, 2.4);
  if (R.fleet) R.fleet.reserve(c, T(t0) - 10, T(t1) + 40, 4.5);
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
  const front = { x: c.x + fx * 2.9, z: c.z + fz * 2.9 };
  blk(R, owner, t0, t1, R.spotAt(front.x, front.z, { faceTo: [c.x + fx * 1.6, c.z + fz * 1.6], act: 'wrench' }), 'wrench', 'Head under the hood of his Model A', { lines: ['It\'s not the carburetor.', 'Okay, it\'s the carburetor.', 'Forty dollars and a paper route. She\'s a beauty. She\'ll run. Someday.'] });
  const ppl = [owner];
  if (boys[1]) {
    const sx = c.x + fx * 0.3 + rx * 1.05, sz = c.z + fz * 0.3 + rz * 1.05;
    blk(R, boys[1], t0, t1, R.spotAt(sx, sz, { yaw: Math.atan2(rx, rz), act: 'under_car' }), 'under_car', 'Flat on his back under the Model A (legs sticking out)', { lines: ['Hand me the nine-sixteenths.', 'Something\'s dripping on me. Is it supposed to drip?'] });
    L.convo([owner, boys[1]], t0 + 2, t1, [[0, 'Try it now!'], [1, 'Try what? I\'m under the car!'], [0, 'Then who\'s gonna crank it?'], [1, 'Not me. I\'m under the car.']]);
    ppl.push(boys[1]);
  }
  const rp = { x: c.x + fx * 2.3 + rx * 1.4, z: c.z + fz * 2.3 + rz * 1.4 };
  L.timed('radio_portable', rp.x, rp.z, c.yaw, t0, t1);
  L.sound(rp.x, 0.5, rp.z, t0, t1, 'radio', { range: 22, vol: 0.35 });
  R.claim(c.x, c.z, 3.4, t0 - 10, t1 + 40);
  return { title: 'A teenager and his jalopy', people: ppl };
}, { homes: (H) => H.detached });

// ---------------------------------------------------------------- dad teaches a kid to ride a bike
recipe('bike', [['9:00', '11:50'], ['16:00', '17:35']], [25, 40], 4, (R, H, t0, t1) => {
  const L = R.L;
  const [k] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 5 && x.age <= 8, household: true });
  const [dad] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 24 && x.age < 60, household: true, prefer: (x) => x.sex === 'M' });
  if (!k || !dad) return null;
  const a = R.sidewalk(H, -2.5, 2.2, { r: 0.5, t0, t1 });
  if (!a) return null;
  for (let d = 0.8; d <= 5.2; d += 0.8) { const q = H.at(a.s + d, 2.2); if (R.open(q.x, q.z, { r: 0.4, lawn: false, t0, t1, h: 1.6 }) === false) return null; }
  const b = H.at(a.s, 1.45);
  k.ph = dad.ph; // run in step: he's holding the seat
  blk(R, k, t0, t1, R.spotAt(a.x, a.z, { yaw: H.P.yawRight, act: 'stand', pace: 5 }), 'stand', 'Learning to ride a two-wheeler (Dad has the seat)', { lines: ['Don\'t let go! Don\'t let go!', 'Did you let go? DID YOU LET GO?', 'I\'m doing it! I\'m doing it!'] });
  blk(R, dad, t0, t1, R.spotAt(b.x, b.z, { yaw: H.P.yawRight, act: 'wash', pace: 5 }), 'wash', `Running alongside, holding the seat of ${first(k)}'s bicycle`, { lines: ['Pedal! Pedal! I\'ve got you...', '...I don\'t have you. You\'re doing it yourself!', 'Look where you\'re going, not at the handlebars!'] });
  R.trails.add(k, 'bicycle', { fwd: 0.05, when: 'always', t0, t1, scale: 0.78, tint: R.rng.pick(['#c83a2a', '#2a5ab0', '#3a8a4a']) });
  R.claim(a.x, a.z, 3.5, t0, t1);
  return { title: 'Dad teaching a kid to ride a bike', people: [k, dad] };
}, { homes: (H) => !H.apt && H.kids.some((k) => k.age >= 5 && k.age <= 8) });

// ---------------------------------------------------------------- a tea party for the dolls
recipe('tea', [['9:30', '12:00'], ['15:50', '17:30']], [35, 60], 4, (R, H, t0, t1) => {
  const L = R.L;
  const girls = R.cast(H, t0, t1, 3, { filter: (x) => x.sex === 'F' && x.age >= 4 && x.age <= 9, radius: 60 });
  if (girls.length < 2) return null;
  const pts = R.frontLawn(H, { t0, t1, r: 1.0, near: [1.8, H.yardFront + 1.2] });
  const q = pts[0]; if (!q) return null;
  L.timed('toy_tea_party', q.x, q.z, H.P.yawOut, t0 - 2, t1 + 2);
  const names = ['Mrs. Teddy takes two lumps.', 'More tea, Mrs. Beasley?', 'Pinkies out! That\'s how the Queen does it.', 'This is pretend tea. Don\'t actually drink it.'];
  girls.forEach((g, i) => { const a = (i / girls.length) * 6.28 + 0.8; const x = q.x + Math.cos(a) * 0.62, z = q.z + Math.sin(a) * 0.62; blk(R, g, t0, t1, R.spotAt(x, z, { pose: 'sit', seat: 0.1, faceTo: [q.x, q.z], act: 'talk_sit' }), 'talk_sit', 'A tea party for the dolls on the front lawn', { lines: names }); });
  L.label(q.x, 0.4, q.z, t0 - 2, t1 + 2, 'A tea party: two dolls, one bear, no real tea', 1.1);
  R.claim(q.x, q.z, 1.4, t0, t1);
  return { title: 'A tea party with dolls on the lawn', people: girls };
}, { homes: (H) => H.detached });

// ---------------------------------------------------------------- the lemonade stand
recipe('lemonade', [['10:00', '12:10'], ['15:50', '17:40']], [70, 110], 4, (R, H, t0, t1) => {
  const L = R.L;
  const kids = R.cast(H, t0, t1, 2, { filter: (x) => x.age >= 6 && x.age <= 12, radius: 45 });
  if (!kids.length) return null;
  const sw = R.sidewalk(H, 2.2, 1.5, { r: 0.9, t0, t1 });
  if (!sw) return null;
  const st = H.at(sw.s, 1.5), be = H.at(sw.s, 0.75);
  if (R.open(be.x, be.z, { r: 0.4, lawn: false, h: 1.5 }) === false) return null;
  L.timed('lemonade_stand', st.x, st.z, H.P.yawOut, t0 - 3, t1 + 2);
  kids.forEach((k, i) => { const q = H.at(sw.s + (i ? 1.25 : -1.25), 1.15); blk(R, k, t0, t1, R.spotAt(q.x, q.z, { yaw: H.P.yawOut, act: i ? 'wave' : 'counter' }), i ? 'wave' : 'counter', 'Selling lemonade on the sidewalk, five cents a glass', { lines: ['Lemonade! Ice cold! Five cents!', 'Two cents for kids. Five for grown-ups. That\'s the rule.', 'We\'re saving up for a Flexible Flyer.'] }); });
  L.label(st.x, 1.1, st.z, t0 - 3, t1 + 2, `${first(kids[0])}'s lemonade stand: LEMON-ADE 5¢`, 1.4);
  R.seen('lemonade', { t0, t1, x: st.x, y: H.lawnY + 0.9, z: st.z });
  // customers
  const custs = R.cast(H, t0, t1, 5, { filter: (x) => x.age >= 8, exclude: kids, radius: 110 });
  const ppl = kids.slice();
  custs.forEach((c, i) => {
    const a = t0 + 8 + i * ((t1 - t0 - 14) / Math.max(1, custs.length));
    if (!R.idle(c, a, a + 4)) return;
    const q = H.at(sw.s + (i % 2 ? 0.4 : -0.4), 2.35);
    L.block(c, a, a + 4, R.spotAt(q.x, q.z, { yaw: H.P.yawIn, act: 'drink_stand' }), 'drink_stand', { label: 'Buying a glass of lemonade from the kids, five cents' });
    L.convo([c, kids[0]], a + 0.5, a + 4, R.rng.pick([[[0, 'One lemonade, please.'], [1, 'That\'s five cents. Ice is extra. Just kidding.'], [0, 'Keep the change.']], [[0, 'Is it fresh?'], [1, 'Squeezed it ourselves! Mostly.'], [0, 'Mostly?'], [1, 'Mom helped.']], [[1, 'Lemonade, mister? It\'s for the Flexible Flyer fund.'], [0, 'For a sled? In September?'], [1, 'We plan ahead.']]]));
    ppl.push(c);
  });
  R.claim(st.x, st.z, 1.8, t0, t1);
  return { title: 'A kids\' lemonade stand', people: ppl };
}, { homes: (H) => !H.apt });

// ---------------------------------------------------------------- trimming the dead limb off the maple
recipe('trim', [['9:00', '12:00'], ['13:00', '16:30']], [55, 90], 4, (R, H, t0, t1) => {
  const L = R.L;
  const tr = H.frontTree; if (!tr) return null;
  const d = [[H.P.u[0], H.P.u[1]], [-H.P.u[0], -H.P.u[1]], [H.P.r[0], H.P.r[1]], [-H.P.r[0], -H.P.r[1]]];
  for (const [dx, dz] of R.rng.shuffle(d)) {
    const fx = tr.x + dx * 0.95, fz = tr.z + dz * 0.95;
    if (R.open(fx, fz, { r: 0.4, t0, t1, props: false }) === false) continue;
    const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 18 && x.age < 66, prefer: (x) => x.sex === 'M' });
    if (!p) return null;
    const yaw = Math.atan2(dx, dz);
    L.timed('ladder_extension', fx, fz, yaw, t0 - 3, t1 + 3, { scale: 0.62 });
    const foot = R.spotAt(fx + dx * 0.5, fz + dz * 0.5, { yaw: yaw + Math.PI, act: 'stand' });
    const hp = 1.9, k = hp / (5 * 0.62);
    const up = L.spot(tr.x + dx * (0.72 * (1 - k) + 0.3), tr.z + dz * (0.72 * (1 - k) + 0.3), { y: L.ground(fx, fz) + hp, yaw: yaw + Math.PI, act: 'saw', link: foot.node });
    blk(R, p, t0, t1, up, 'saw', 'Up the ladder, sawing the dead limb off the maple', { lines: ['Stand clear! Timber — well, twig.', 'That limb\'s been hanging over the porch since the \'38 blow.'] });
    L.sound(tr.x, 3, tr.z, t0, t1, 'saw', { range: 40, vol: 0.4 });
    const pile = R.frontLawn(H, { t0, t1, r: 1.1, near: [H.side(tr.x, tr.z), H.out(tr.x, tr.z) + 1.5] })[0];
    if (pile) { L.timed('branch_pile', pile.x, pile.z, H.P.yawRight, t0 + (t1 - t0) * 0.4, t1 + 90); R.claim(pile.x, pile.z, 1.3, t0, t1 + 90); }
    const ppl = [p];
    const [h2] = R.cast(H, t0 + 10, t1 - 5, 1, { filter: (x) => x.age >= 10, exclude: [p], household: true });
    if (h2 && pile) { blk(R, h2, t0 + 10, t1 - 5, R.spotAt(pile.x + 0.9, pile.z, { faceTo: [tr.x, tr.z], act: 'carry' }), 'carry', 'Dragging branches to the pile'); ppl.push(h2); }
    R.claim(fx, fz, 1.2, t0, t1);
    return { title: 'Trimming the maple from a ladder', people: ppl };
  }
  return null;
});

// ---------------------------------------------------------------- bridge club arrives
recipe('bridge', [['13:10', '13:40']], [150, 170], 2, (R, H, t0, t1) => {
  const L = R.L;
  const dine = ((H.P.homes[0] && H.P.homes[0].home.dine) || []).filter((s) => s.pose === 'sit');
  if (dine.length < 4) return null;
  const [host] = R.cast(H, t0 - 5, t1, 1, { filter: (x) => x.sex === 'F' && x.age >= 35, household: true });
  if (!host) return null;
  const guests = R.cast(H, t0, t1, 3, { filter: (x) => x.sex === 'F' && x.age >= 35 && x.age <= 82, exclude: [host], radius: 160 });
  if (guests.length < 3) return null;
  const door = R.hostSpot(H), step = R.callerSpot(H, 0.4, { act: 'talk', back: 1.0 });
  L.plan(host, t0 - 2, t1, [{ t: t0 - 2, spot: door, act: 'talk', label: 'Greeting the bridge club at the door' }, { t: t0 + 16, spot: dine[0], act: 'cards', label: `Bridge at ${mr(host)}'s — the second Saturday of the month` }]);
  guests.forEach((g, i) => {
    const a = t0 + i * 3.5;
    L.plan(g, a, t1, [{ t: a, spot: step, act: 'talk', label: `Arriving for bridge at ${mr(host)}'s`, held: 'handbag' }, { t: a + R.walkMin(g, R.L.whereAt(g, a), step.node) + 2.2, spot: dine[i + 1], act: 'cards', label: `Bridge at ${mr(host)}'s (hearts are trump, and so is gossip)` }]);
  });
  L.convo([guests[0], host], t0 + 2, t0 + 8, [[0, 'I brought the lemon squares. Don\'t tell Mildred they\'re from Halloran\'s.'], [1, 'Your secret\'s safe. Come in, come in — Louise is bringing the Hatch cat story.']]);
  L.convo([host, ...guests], t0 + 20, t1, [[1, 'One no-trump.'], [2, 'Pass.'], [0, 'Did you hear the Castellano boy\'s home?'], [3, 'Two clubs. Rosa\'s been cooking for three days.'], [1, 'Whose bid is it?'], [2, 'Yours, and you\'ve had three lemon squares.']]);
  return { title: `The bridge club arrives at ${mr(host)}'s`, people: [host, ...guests] };
}, { homes: (H) => H.detached });

// ---------------------------------------------------------------- carving a jack-o'-lantern (a month early)
recipe('pumpkin', [['10:00', '12:00'], ['15:50', '17:40']], [40, 60], 4, (R, H, t0, t1) => {
  const L = R.L;
  const kids = R.cast(H, t0, t1, 2, { filter: (x) => x.age >= 5 && x.age <= 13, household: true });
  const [grown] = R.cast(H, t0, t1, 1, { filter: isAdult, household: true });
  if (!kids.length) return null;
  const q = H.at(1.3, H.stepEnd + 1.0);
  if (R.open(q.x, q.z, { r: 0.7, t0, t1, y: H.lawnY }) === false) return null;
  L.timed('pumpkin_carving', q.x, q.z, H.P.yawOut, t0 - 2, t1 + 1);
  L.timed('pumpkin', q.x + H.P.r[0] * 0.3, q.z + H.P.r[1] * 0.3, 0, t0 - 2, t1 - 8);
  const lan = R.stoopPoint(H, 1.0, 0.6);
  L.timed('jack_o_lantern', lan.x, lan.z, H.P.yawOut, t1 - 8, T('23:59'), { y: lan.y });
  L.label(lan.x, lan.y + 0.5, lan.z, t1 - 8, T('23:59'), `${theirs(H)} jack-o'-lantern, a month early and proud of it`, 1);
  const who = [...kids, ...(grown ? [grown] : [])];
  who.forEach((p, i) => { const a = i * 2.1 + 0.5; const x = q.x + Math.cos(a) * 0.7, z = q.z + Math.sin(a) * 0.7; blk(R, p, t0, t1, R.spotAt(x, z, { faceTo: [q.x, q.z], act: 'garden' }), 'garden', p === grown ? 'Supervising the pumpkin carving (holding the good knife)' : 'Carving a jack-o\'-lantern — a month early', { held: 'cake_knife', lines: ['Triangle eyes. Everybody does triangle eyes.', 'It\'s practice. For October.', 'The guts feel like cold spaghetti!'] }); });
  R.claim(q.x, q.z, 1.2, t0, t1);
  return { title: 'Carving a jack-o\'-lantern on the front walk', people: who };
}, { homes: (H) => H.detached && H.kids.length > 0 });

// ---------------------------------------------------------------- a pie for next door
recipe('pie', [['10:00', '12:00'], ['13:30', '17:15']], [15, 22], 7, (R, H, t0, t1) => {
  const L = R.L;
  const N = neighbourOf(R, H); if (!N || eventHouse(N, t0, t1)) return null;
  const [k] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 8 && x.age <= 15, household: true });
  const [host] = R.cast(N, t0, t1, 1, { filter: isAdult, household: true, prefer: (x) => x.sex === 'F' });
  if (!k || !host) return null;
  const st = R.callerSpot(N, 0.2, { act: 'talk' });
  const it = R.day(k, t0, { label: `Taking a pie next door to ${mr(host)}` });
  const arr = it.go(st, 5, { act: 'talk', held: 'pie' });
  it.go(R.hostSpot(H, { act: 'stand' }), 1, { held: null, label: 'Heading home, pie delivered' });
  it.commit({ end: it.t + 0.5 });
  L.block(host, arr - 0.3, arr + 5, R.hostSpot(N), 'talk', { label: `Accepting a pie from the ${surname(H)} kid` });
  L.convo([k, host], arr, arr + 5, R.rng.pick([
    [[0, `Mom says this is for you, ${mr(host)}. It\'s apple.`], [1, 'Oh, tell your mother she\'s an angel. McIntosh?'], [0, 'I dunno. Red ones.']],
    [[0, 'Mom made two by accident. She says.'], [1, 'Nobody makes two pies by accident, dear.'], [0, 'She says you\'d say that.']],
  ]));
  return { title: 'A pie for the neighbours', people: [k, host] };
}, { homes: (H) => !H.apt && H.members.some((x) => x.age >= 8 && x.age <= 15) });

// ---------------------------------------------------------------- putting up the storm windows
recipe('storms', [['9:00', '12:00'], ['13:00', '16:30']], [60, 100], 5, (R, H, t0, t1) => {
  const L = R.L;
  let pick = null;
  for (const W of walls(R, H)) { for (const w of R.rng.shuffle(wallWindows(R, H, W, 0.7, 2.4))) { const s0 = windowStand(R, H, W, w, t0, t1); if (s0) { pick = { W, w, st: s0 }; break; } } if (pick) break; }
  if (!pick) return null;
  const { W, w, st: at } = pick;
  const pts = R.frontLawn(H, { t0, t1, r: 1.1 });
  const sh = pts.find((q) => Math.hypot(q.x - at.x, q.z - at.z) > 2.2);
  if (!sh) return null;
  const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 18 && x.age < 70, prefer: (x) => x.sex === 'M' });
  if (!p) return null;
  L.timed('sawhorses_window', sh.x, sh.z, H.P.yawRight, t0 - 3, t1 + 3);
  const lean = W.pos(w.t0 - 0.75, 0.15);
  L.timed('storm_window', lean.x, lean.z, W.yawOut, t0 - 3, t0 + (t1 - t0) * 0.55, { y: R.L.ground(lean.x, lean.z, at.y + 0.4) });
  const sx = sh.x + Math.sin(H.P.yawIn) * 0.8, sz = sh.z + Math.cos(H.P.yawIn) * 0.8;
  L.plan(p, t0, t1, [
    { t: t0, spot: R.spotAt(sx, sz, { faceTo: [sh.x, sh.z], act: 'paint' }), act: 'paint', label: 'Glazing a storm window on the sawhorses', held: 'paintbrush' },
    { t: t0 + (t1 - t0) * 0.5, spot: R.spotAt(at.x, at.z, { yaw: W.yawIn, act: 'hammer', y: at.y + (at.high ? 0.62 : 0) }), act: 'hammer', label: 'Hanging the storm windows before the first frost' },
  ], { lines: ['Screens down, storms up. Every September, and every September I swear I\'ll label them.', 'This one goes on the kitchen. No — the pantry. It\'s the pantry.'] });
  if (at.high) L.timed('ladder_step', at.x, at.z, W.yawOut, t0 + (t1 - t0) * 0.5 - 1, t1 + 2, { y: at.y });
  R.claim(sh.x, sh.z, 1.4, t0, t1); R.claim(at.x, at.z, 0.8, t0, t1);
  return { title: 'Putting up the storm windows', people: [p] };
});

// ---------------------------------------------------------------- a cord of firewood, delivered
recipe('wood', [['9:20', '11:30'], ['13:00', '15:30']], [70, 100], 3, (R, H, t0, t1) => {
  const L = R.L;
  if (H.drive === null) return null;
  const heap = H.at(H.drive, -2.6), stack = H.at(H.drive, H.doorOut - 1.0);
  if (R.open(heap.x, heap.z, { r: 1.2, lawn: false, t0, t1, h: 1.5 }) === false) return null;
  if (R.open(stack.x, stack.z, { r: 0.5, t0, t1, h: 1.7 }) === false) return null;
  const men = R.cast(H, t0 + 12, t1, 2, { filter: (x) => x.age >= 13 && x.age < 66, household: true, prefer: (x) => x.sex === 'M' });
  if (!men.length) return null;
  const truck = R.fleet.add('truck_pickup', { tint: '#3a4a2a', label: 'Wood delivery: a cord of seasoned oak, twenty-two dollars', len: 5 });
  truck.enter(t0, H.P.curb); truck.leave(t0 + 12);
  L.timed('firewood_heap', heap.x, heap.z, H.P.yawOut, t0 + 8, T('23:59'));
  L.label(heap.x, 0.6, heap.z, t0 + 8, T('23:59'), 'A cord of seasoned oak, dumped in the driveway — twenty-two dollars, delivered', 1.8);
  const dist = Math.hypot(stack.x - heap.x, stack.z - heap.z);
  const yaw = Math.atan2(stack.x - heap.x, stack.z - heap.z);
  men.forEach((m, i) => {
    const q = { x: heap.x + Math.cos(yaw) * (i ? 0.6 : -0.6), z: heap.z - Math.sin(yaw) * (i ? 0.6 : -0.6) };
    blk(R, m, t0 + 12, t1, R.spotAt(q.x, q.z, { yaw, act: 'carry', pace: Math.max(1.5, dist - 1.2) }), 'carry', 'Stacking a cord of oak along the side of the house', { held: 'firewood_armload', lines: ['Split once, stack twice, warm all winter.', 'Bark side up. Bark side UP.'] });
  });
  R.claim(heap.x, heap.z, 1.6, t0, t1);
  return { title: 'Stacking a cord of firewood', people: men };
}, { homes: (H) => H.detached && H.drive !== null });

// ---------------------------------------------------------------- washing the family car
recipe('carwash', [['9:00', '12:00'], ['13:00', '17:10']], [45, 70], 9, (R, H, t0, t1) => {
  const L = R.L;
  const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 16 && x.age < 70, prefer: (x) => x.sex === 'M' });
  if (!p) return null;
  const [kind, name] = R.rng.pick(CARS);
  let c = null;
  const car = H.props.find((q) => /^car_|^truck_pickup/.test(q.name) && H.out(q.x, q.z) > H.backOut);
  if (car) c = { x: car.x, z: car.z, yaw: car.yaw, own: true };
  else { const cp = H.P.curb; if (R.claimed(cp.x, cp.z, 3, t0 - 20, t1 + 40)) return null; c = { x: cp.x, z: cp.z, yaw: cp.yaw }; }
  if (!c.own) { L.timed(kind, c.x, c.z, c.yaw, t0 - 20, t1 + 40, { tint: R.rng.pick(CAR_TINTS), tint2: '#e8e4d8', y: 0.02 }); R.fleet.reserve(c, T(t0) - 20, T(t1) + 40, 5); }
  const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
  let side = null;
  for (const sgn of [1, -1]) { const q = { x: c.x + rx * sgn * 1.45, z: c.z + rz * sgn * 1.45 }; if (R.open(q.x, q.z, { r: 0.3, any: true, props: false, h: 1.7 }) !== false) { side = { ...q, sgn }; break; } }
  if (!side) return null;
  blk(R, p, t0, t1, R.spotAt(side.x, side.z, { faceTo: [c.x, c.z], act: 'wash' }), 'wash', `Washing ${name}`, { held: 'rag', costume: COSTUME.shirtsleeves(p), lines: ['Nothing like a clean car for the Centennial.', 'Hand me that chamois, would you?', 'Birds. Every blessed Saturday, birds.'] });
  const b = { x: side.x + Math.sin(c.yaw) * 1.1, z: side.z + Math.cos(c.yaw) * 1.1 };
  L.timed('bucket_suds', b.x, b.z, 0, t0, t1);
  L.sound(side.x, 1, side.z, t0, t1, 'hose', { range: 25, vol: 0.4 });
  L.label(c.x, 0.9, c.z, t0, t1, `${theirs(H)} car, half soaped`, 2.2);
  const ppl = [p];
  const [k] = R.cast(H, t0 + 5, t1 - 10, 1, { filter: (x) => x.age >= 6 && x.age <= 13, household: true });
  if (k) {
    const o = { x: c.x - rx * side.sgn * 1.45 + Math.sin(c.yaw) * 1.0, z: c.z - rz * side.sgn * 1.45 + Math.cos(c.yaw) * 1.0 };
    if (R.open(o.x, o.z, { r: 0.25, any: true, props: false, h: 1.3 }) !== false) { blk(R, k, t0 + 5, t1 - 10, R.spotAt(o.x, o.z, { faceTo: [c.x, c.z], act: 'wash' }), 'wash', 'Helping wash the car (mostly the hubcaps, mostly himself)', { held: 'rag' }); ppl.push(k); }
  }
  R.claim(c.x, c.z, 3, t0, t1);
  return { title: 'Washing the family car', people: ppl };
}, { homes: (H) => H.detached });

// ---------------------------------------------------------------- planting bulbs in the front bed
recipe('bulbs', [['8:30', '12:00'], ['12:30', '17:40']], [30, 55], 24, (R, H, t0, t1) => {
  const L = R.L;
  for (const s of R.rng.shuffle([H.faceL + 1.0, H.faceR - 1.0, (H.faceL + H.porchL) / 2, (H.faceR + H.porchR) / 2, -2.2, 2.2])) {
    const q = H.at(s, H.yardFront + 0.6);
    if (Math.abs(s) < 1 || R.open(q.x, q.z, { r: 0.35, y: H.lawnY, tol: 0.1, t0, t1 }) === false) continue;
    const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 12 && x.age < 88 });
    if (!p) return null;
    blk(R, p, t0, t1, R.spotAt(q.x, q.z, { yaw: H.P.yawIn, act: 'garden' }), 'garden', R.rng.pick(['Planting tulip bulbs along the porch for spring', 'Putting in daffodil bulbs, pointy end up', 'Cutting back the peonies for winter', 'Tidying the flower bed for the Centennial']), { lines: ['Pointy end up. Every year I have to think about it.', 'You plant in September and forget. Then May comes and surprises you.'] });
    const b = H.at(s + 0.7, H.yardFront + 0.9);
    if (R.open(b.x, b.z, { r: 0.25, y: H.lawnY }) !== false) L.timed('bushel_basket', b.x, b.z, 0.4, t0, t1, { scale: 0.55 });
    R.claim(q.x, q.z, 0.8, t0, t1);
    return { title: 'Planting bulbs in the front bed', people: [p] };
  }
  return null;
});

// ---------------------------------------------------------------- on the porch after supper
recipe('porch', [['18:35', '21:05']], [45, 120], 40, (R, H, t0, t1) => {
  const L = R.L;
  const ppl = R.cast(H, t0, t1, 3, { filter: (x) => x.age >= 12, household: true });
  if (!ppl.length) return null;
  const seats = [porchSeat(R, H, 0), porchSeat(R, H, 1), porchSeat(R, H, 2), stepSeat(R, H, 0.7), stepSeat(R, H, -0.7)].filter(Boolean);
  if (!seats.length) return null;
  const n = Math.min(ppl.length, seats.length);
  const labels = ['On the porch after supper', 'Rocking on the porch, watching the street', 'Sitting out on the steps in the last of the light', 'Waiting on the porch for the fireworks'];
  for (let i = 0; i < n; i++) blk(R, ppl[i], t0, t1, seats[i], R.rng.pick(['rock', 'talk_sit', 'listen_sit', 'sit']), R.rng.pick(labels), { lines: ['Listen to those crickets. Summer\'s hanging on by its fingernails.', 'You can hear the band from the square. That\'s "In the Mood."', 'Fireworks at nine. We\'ll see them over the Trust Building.'] });
  if (n > 1) L.convo(ppl.slice(0, n), t0 + 1, t1, [].concat(...R.rng.shuffle(GOSSIP.slice()).slice(0, 2)));
  if (R.rng.chance(0.5)) { const r0 = seats[0]; const rp = { x: r0.x + Math.cos(r0.yaw) * 0.55, z: r0.z - Math.sin(r0.yaw) * 0.55 }; L.timed('radio_portable', rp.x, rp.z, r0.yaw, t0, t1, { y: r0.y }); L.sound(rp.x, 1, rp.z, t0, t1, 'radio', { range: 22, vol: 0.4 }); L.label(rp.x, 0.6, rp.z, t0, t1, 'The radio on the porch: "Your Hit Parade"', 1); }
  return { title: 'On the porch after supper', people: ppl.slice(0, n) };
}, { homes: (H) => !H.apt });

// ---------------------------------------------------------------- walking the baby
recipe('pram', [['9:20', '12:00'], ['13:30', '17:15']], [25, 40], 6, (R, H, t0, t1) => {
  const L = R.L;
  const [m] = R.cast(H, t0, t1, 1, { filter: (x) => x.sex === 'F' && x.age >= 18 && x.age < 45, household: true });
  if (!m) return null;
  if (!L.stroll(m, t0, t1, { label: H.babies.length ? `Walking ${first(H.babies[0])} around the block in the pram` : 'Pushing the baby carriage around the block', arms: 'push', speed: 0.9 })) return null;
  L.follow(m, 'baby_carriage', { fwd: 0.95, when: 'walk', t0, t1, tint: '#2a3a5a' });
  return { title: 'Walking the baby in the pram', people: [m] };
}, { homes: (H) => !H.apt && H.babies.length > 0 });

// ---------------------------------------------------------------- tricycle up and down the walk
recipe('trike', [['9:00', '12:00'], ['15:45', '17:40']], [20, 35], 5, (R, H, t0, t1) => {
  const L = R.L;
  const [k] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 2 && x.age <= 5, household: true });
  if (!k) return null;
  const len = Math.min(3.4, -H.stepEnd - 1.0);
  if (len < 1.6) return null;
  const q = H.at(0.05, H.stepEnd + 0.5);
  blk(R, k, t0, t1, R.spotAt(q.x, q.z, { yaw: H.P.yawOut, act: 'stand', pace: len }), 'stand', 'Riding the tricycle up and down the front walk', { lines: ['Beep beep!', 'Watch me! Mommy, watch!'] });
  R.trails.add(k, 'tricycle', { fwd: 0.05, when: 'always', t0, t1 });
  const [m] = R.cast(H, t0, t1, 1, { filter: isAdult, household: true });
  const ppl = [k];
  if (m) { blk(R, m, t0, t1, porchSeat(R, H, 0) || stepSeat(R, H, 0.9), 'knit', `Watching ${first(k)} on the tricycle (and knitting)`); ppl.push(m); }
  return { title: 'A toddler on a tricycle', people: ppl };
}, { homes: (H) => H.detached && H.members.some((x) => x.age >= 2 && x.age <= 5) });

// ---------------------------------------------------------------- kids' games
const KIDLINES = {
  tag: ['You\'re it!', 'Can\'t catch me!', 'No tag-backs!', 'Base! I\'m on base!'],
  cowboys: ['Bang! Bang! You\'re dead, Tex!', 'Am not! You missed me by a mile!', 'Hi-yo, Silver!', 'I\'m Hopalong. You\'re the rustler.'],
  jump: ['Cinderella, dressed in yella, went upstairs to kiss a fella...', 'Made a mistake and kissed a snake — how many doctors did it take?', 'One, two, three, four...', 'Turn faster! Faster!'],
  hop: ['You stepped on the line!', 'Did not!', 'Did so! Your turn\'s over.', 'Nine... ten... home!'],
  marbles: ['Keepsies! We said keepsies!', 'That\'s my steelie. Knuckles down!', 'No fudging! Knuckles DOWN.'],
  catch: ['Burn it in there!', 'Parnell winds up... and the pitch!', 'Go long! Longer!'],
  hide: ['...ninety-eight, ninety-nine, a hundred! Ready or not, here I come!', 'I can see your feet, Billy!', 'Olly olly oxen free!'],
};
// a group of kids somewhere near H: household first, then the neighbours' kids
const kidGang = (R, H, t0, t1, n, lo = 5, hi = 12, extra = {}) => R.cast(H, t0, t1, n, { filter: (x) => x.age >= lo && x.age <= hi && (!extra.sex || x.sex === extra.sex), radius: extra.radius ?? 70, anywhere: T(t0) >= T('15:40') });

recipe('hopscotch', [['9:00', '12:05'], ['12:25', '13:10'], ['15:50', '17:40']], [30, 50], 9, (R, H, t0, t1) => {
  const L = R.L;
  const girls = kidGang(R, H, t0, t1, 3, 5, 12, { sex: 'F' });
  if (girls.length < 2) return null;
  const sw = R.sidewalk(H, R.rng.pick([-2.5, 2.5]), 2.0, { r: 0.6, t0, t1 });
  if (!sw) return null;
  for (let d = -1.4; d <= 1.4; d += 0.7) { const q = H.at(sw.s + d, 2.0); if (R.open(q.x, q.z, { r: 0.45, lawn: false, h: 1.5, t0, t1 }) === false) return null; }
  const c = H.at(sw.s, 2.0), st = H.at(sw.s - 1.45, 2.0);
  L.timed('chalk_hopscotch', c.x, c.z, H.P.yawRight, t0 - 2, T('23:59'), { y: H.lawnY + 0.005 });
  L.label(c.x, 0.3, c.z, t0 - 2, T('23:59'), 'A hopscotch court in pink and blue chalk', 1.4);
  blk(R, girls[0], t0, t1, R.spotAt(st.x, st.z, { yaw: H.P.yawRight, act: 'hopscotch' }), 'hopscotch', 'Playing hopscotch on the sidewalk', { lines: KIDLINES.hop });
  girls.slice(1).forEach((g, i) => { const q = H.at(sw.s - 2.1 - i * 0.6, 1.4 + i * 0.4); blk(R, g, t0, t1, R.spotAt(q.x, q.z, { faceTo: [c.x, c.z], act: i ? 'clap' : 'wait' }), i ? 'clap' : 'wait', 'Waiting a turn at hopscotch (watching for toes on the line)', { lines: KIDLINES.hop }); });
  L.sound(c.x, 1, c.z, t0, t1, 'kids', { range: 30, vol: 0.4 });
  R.claim(c.x, c.z, 2.2, t0, t1);
  return { title: 'Hopscotch on the sidewalk', people: girls };
}, { homes: (H) => !H.apt });

recipe('jumprope', [['9:00', '12:05'], ['12:25', '13:10'], ['15:50', '17:40']], [30, 45], 8, (R, H, t0, t1) => {
  const L = R.L;
  const girls = kidGang(R, H, t0, t1, 4, 6, 13, { sex: 'F' });
  if (girls.length < 3) return null;
  let a = null, b = null;
  for (const p of R.frontLawn(H, { t0, t1, r: 0.7 })) {
    for (const dir of [H.P.yawRight, H.P.yawLeft]) {
      const q = { x: p.x + Math.sin(dir) * 2.6, z: p.z + Math.cos(dir) * 2.6 };
      const m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
      if (R.lawnFree(H, q.x, q.z, 0.5, t0, t1) && R.lawnFree(H, m.x, m.z, 0.7, t0, t1)) { a = p; b = q; break; }
    }
    if (a) break;
  }
  if (!a) { const sw = R.sidewalk(H, -1.3, 2.0, { r: 0.5, t0, t1 }); const sw2 = sw && R.open(H.at(sw.s + 2.6, 2).x, H.at(sw.s + 2.6, 2).z, { r: 0.5, lawn: false, t0, t1 }) !== false ? H.at(sw.s + 2.6, 2) : null; if (!sw || !sw2) return null; a = sw; b = sw2; }
  const m = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  blk(R, girls[0], t0, t1, R.spotAt(a.x, a.z, { faceTo: [b.x, b.z], act: 'play_ball' }), 'play_ball', 'Turning the jump rope', { lines: KIDLINES.jump });
  blk(R, girls[1], t0, t1, R.spotAt(b.x, b.z, { faceTo: [a.x, a.z], act: 'play_ball' }), 'play_ball', 'Turning the jump rope', { lines: KIDLINES.jump });
  const yawAB = Math.atan2(b.x - a.x, b.z - a.z);
  blk(R, girls[2], t0, t1, R.spotAt(m.x, m.z, { yaw: yawAB + Math.PI / 2, act: 'jump_rope' }), 'jump_rope', 'Jumping rope — "Cinderella, dressed in yella..."', { lines: KIDLINES.jump });
  if (girls[3]) { const w = { x: m.x + Math.sin(yawAB + Math.PI / 2) * 1.6, z: m.z + Math.cos(yawAB + Math.PI / 2) * 1.6 }; blk(R, girls[3], t0, t1, R.spotAt(w.x, w.z, { faceTo: [m.x, m.z], act: 'clap' }), 'clap', 'Waiting to jump in, clapping the count'); }
  const h = L.timed('jump_rope_arc', m.x, m.z, yawAB - Math.PI / 2, t0, t1, { y: L.ground(m.x, m.z) + 0.8 });
  R.spin(h, 7.5);
  L.sound(m.x, 1, m.z, t0, t1, 'kids', { range: 30, vol: 0.45 });
  R.claim(m.x, m.z, 1.8, t0, t1);
  return { title: 'Jump rope with two turners', people: girls };
}, { homes: (H) => !H.apt });

recipe('marbles', [['9:00', '12:05'], ['12:25', '13:10'], ['15:50', '17:40']], [30, 45], 8, (R, H, t0, t1) => {
  const L = R.L;
  const boys = kidGang(R, H, t0, t1, 3, 6, 12, { sex: 'M' });
  if (boys.length < 2) return null;
  const sw = R.sidewalk(H, R.rng.pick([-3, 3]), 1.2, { r: 0.8, t0, t1 }) ;
  const q = sw || R.frontLawn(H, { t0, t1, r: 0.9 })[0];
  if (!q) return null;
  L.timed('marbles_ring', q.x, q.z, 0, t0 - 1, t1 + 30, { y: L.ground(q.x, q.z) + 0.005 });
  boys.forEach((b, i) => { const a = i * 2.2; const x = q.x + Math.cos(a) * 0.75, z = q.z + Math.sin(a) * 0.75; blk(R, b, t0, t1, R.spotAt(x, z, { faceTo: [q.x, q.z], act: i ? 'kneel' : 'pet_dog' }), i ? 'kneel' : 'pet_dog', 'Playing marbles for keepsies', { lines: KIDLINES.marbles }); });
  L.label(q.x, 0.3, q.z, t0 - 1, t1, 'A chalk marble ring — keepsies, and somebody\'s cheating', 1);
  R.claim(q.x, q.z, 1.2, t0, t1);
  return { title: 'Marbles on the sidewalk', people: boys };
}, { homes: (H) => !H.apt });

recipe('tag', [['9:00', '12:05'], ['12:25', '13:10'], ['15:50', '17:40']], [20, 30], 9, (R, H, t0, t1) => {
  const L = R.L;
  const kids = kidGang(R, H, t0, t1, 5, 5, 12);
  if (kids.length < 3) return null;
  const pts = R.frontLawn(H, { t0, t1, r: 1.6 });
  if (pts.length < 2) return null;
  const use = [pts[0]]; for (const q of pts) if (use.length < 3 && use.every((u) => Math.hypot(u.x - q.x, u.z - q.z) > 3.2)) use.push(q);
  kids.forEach((k, i) => { const q = use[i % use.length]; blk(R, k, t0, t1, R.spotAt(q.x, q.z, { act: 'play' }), 'play', i === 0 ? 'It! Chasing everybody across the lawns' : 'Playing tag across the front lawns', { lines: KIDLINES.tag }); });
  L.sound(use[0].x, 1, use[0].z, t0, t1, 'kids', { range: 38, vol: 0.55 });
  for (const q of use) R.claim(q.x, q.z, 2, t0, t1);
  return { title: 'Tag across the front lawns', people: kids };
}, { homes: (H) => H.detached });

recipe('cowboys', [['9:00', '12:05'], ['12:25', '13:10'], ['15:50', '17:40']], [25, 40], 8, (R, H, t0, t1) => {
  const L = R.L;
  const boys = kidGang(R, H, t0, t1, 4, 5, 11, { sex: 'M' });
  if (boys.length < 2) return null;
  const pts = R.frontLawn(H, { t0, t1, r: 1.6 });
  if (!pts.length) return null;
  const use = [pts[0]]; for (const q of pts) if (use.length < 2 && Math.hypot(use[0].x - q.x, use[0].z - q.z) > 3.2) use.push(q);
  boys.forEach((b, i) => { const q = use[i % use.length]; blk(R, b, t0, t1, R.spotAt(q.x, q.z, { act: 'play' }), 'play', i === 0 ? 'Playing Hopalong Cassidy (cap pistol, no caps left)' : 'Playing cowboys with a cap pistol', { held: 'cap_pistol', lines: KIDLINES.cowboys }); });
  L.sound(use[0].x, 1, use[0].z, t0, t1, 'kids', { range: 38, vol: 0.55 });
  for (const q of use) R.claim(q.x, q.z, 2, t0, t1);
  return { title: 'Cowboys with cap pistols', people: boys };
}, { homes: (H) => H.detached });

recipe('catch', [['9:00', '12:05'], ['12:25', '13:15'], ['13:30', '17:40']], [25, 40], 10, (R, H, t0, t1) => {
  const L = R.L;
  const two = R.cast(H, t0, t1, 2, { filter: (x) => x.age >= 7 && x.age <= 45, radius: 60, prefer: (x) => x.sex === 'M' });
  if (two.length < 2) return null;
  let a = null, b = null;
  const pts = R.frontLawn(H, { t0, t1, r: 0.6 });
  for (const p of pts) { for (const q of pts) { const d = Math.hypot(p.x - q.x, p.z - q.z); if (d > 6.5 && d < 11) { a = p; b = q; break; } } if (a) break; }
  if (!a) { const s1 = R.sidewalk(H, -4, 2, { t0, t1 }), s2 = R.sidewalk(H, 4.5, 2, { t0, t1 }); if (!s1 || !s2) return null; a = s1; b = s2; }
  blk(R, two[0], t0, t1, R.spotAt(a.x, a.z, { faceTo: [b.x, b.z], act: 'play_ball' }), 'play_ball', 'Playing catch (he\'s Mel Parnell today)', { held: 'ball', lines: KIDLINES.catch });
  blk(R, two[1], t0, t1, R.spotAt(b.x, b.z, { faceTo: [a.x, a.z], act: 'play_ball' }), 'play_ball', 'Playing catch on the front lawn', { lines: KIDLINES.catch });
  R.claim((a.x + b.x) / 2, (a.z + b.z) / 2, 4, t0, t1);
  return { title: 'Playing catch', people: two };
}, { homes: (H) => !H.apt });

recipe('hide', [['9:20', '12:05'], ['15:50', '17:40']], [25, 35], 4, (R, H, t0, t1) => {
  const L = R.L;
  const kids = kidGang(R, H, t0, t1, 4, 5, 12);
  if (kids.length < 3) return null;
  const tr = H.frontTree; if (!tr) return null;
  const cp = { x: tr.x + H.P.u[0] * 0.55, z: tr.z + H.P.u[1] * 0.55 };
  if (R.open(cp.x, cp.z, { r: 0.3, props: false, t0, t1 }) === false) return null;
  blk(R, kids[0], t0, t1, R.spotAt(cp.x, cp.z, { faceTo: [tr.x, tr.z], act: 'cry' }), 'cry', 'Counting to a hundred against the maple, eyes covered (mostly)', { lines: KIDLINES.hide });
  const hides = [];
  const nb = [H, neighbourOf(R, H)].filter(Boolean);
  for (const Q of nb) for (const s of [Q.faceL - 0.7, Q.faceR + 0.7]) { const q = Q.at(s, Q.doorOut - 0.6); if (R.open(q.x, q.z, { r: 0.35, t0, t1 }) !== false) hides.push(q); }
  for (const Q of nb) for (const b of Q.props.filter((x) => x.name === 'bush_round')) { const q = { x: b.x - Q.P.u[0] * 0.7, z: b.z - Q.P.u[1] * 0.7 }; if (R.open(q.x, q.z, { r: 0.3, t0, t1 }) !== false) hides.push(q); }
  const used = [kids[0]];
  kids.slice(1).forEach((k, i) => { const q = hides[i]; if (!q) return; blk(R, k, t0 + 1, t1, R.spotAt(q.x, q.z, { faceTo: [cp.x, cp.z], act: 'kneel' }), 'kneel', 'Hiding (badly) — hide-and-seek', { lines: ['Shh!', 'Don\'t look over here!'] }); used.push(k); });
  if (used.length < 3) return null;
  L.sound(cp.x, 1, cp.z, t0, t1, 'kids', { range: 30, vol: 0.4 });
  R.claim(cp.x, cp.z, 1, t0, t1);
  return { title: 'Hide-and-seek, counting against the maple', people: used };
}, { homes: (H) => H.detached && !!H.frontTree });

recipe('wagon', [['9:00', '12:00'], ['15:45', '17:40']], [20, 35], 6, (R, H, t0, t1) => {
  const L = R.L;
  const [k] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 5 && x.age <= 11, household: true });
  if (!k) return null;
  if (!L.stroll(k, t0, t1, { label: R.rng.pick(['Hauling empty bottles to Kowalski\'s for the deposit', 'Pulling his little sister around the block in the wagon', 'Collecting newspapers for the Scout paper drive']), arms: 'pull', speed: 1.1 })) return null;
  L.follow(k, 'wagon_red', { fwd: -1.1, when: 'walk', t0, t1 });
  return { title: 'A boy pulling a red wagon', people: [k] };
}, { homes: (H) => !H.apt && H.kids.some((x) => x.age >= 5 && x.age <= 11) });

recipe('hoop', [['9:10', '12:00'], ['15:45', '17:40']], [18, 30], 3, (R, H, t0, t1) => {
  const L = R.L;
  const [k] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 6 && x.age <= 12, household: true });
  if (!k) return null;
  if (!L.stroll(k, t0, t1, { label: 'Rolling a hoop down the sidewalk with a stick', speed: 1.9 })) return null;
  R.trails.add(k, 'hoop_wood', { fwd: 0.95, y: 0.36, when: 'walk', t0, t1, spin: (ph) => ph * 5.3 });
  return { title: 'A boy rolling a hoop', people: [k] };
}, { homes: (H) => !H.apt && H.kids.some((x) => x.age >= 6 && x.age <= 12) });

recipe('dollpram', [['9:30', '12:00'], ['15:50', '17:40']], [20, 30], 3, (R, H, t0, t1) => {
  const L = R.L;
  const [g] = R.cast(H, t0, t1, 1, { filter: (x) => x.sex === 'F' && x.age >= 4 && x.age <= 8, household: true });
  if (!g) return null;
  const sw = R.sidewalk(H, -1.5, 1.4, { r: 0.4, t0, t1 });
  if (!sw) return null;
  for (let d = 0.8; d <= 3.2; d += 0.8) { const q = H.at(sw.s + d, 1.4); if (R.open(q.x, q.z, { r: 0.35, lawn: false, t0, t1, h: 1.4 }) === false) return null; }
  blk(R, g, t0, t1, R.spotAt(sw.x, sw.z, { yaw: H.P.yawRight, act: 'wash', pace: 3.2 }), 'wash', 'Taking her doll for a walk in the doll carriage', { lines: ['Shh, Betsy-Wetsy is sleeping.', 'She has a temperature. I\'m the doctor AND the mother.'] });
  R.trails.add(g, 'baby_carriage', { fwd: 0.6, when: 'always', t0, t1, scale: 0.6, tint: '#e0a0b0' });
  R.claim(sw.x, sw.z, 2.2, t0, t1);
  return { title: 'A little girl with a doll carriage', people: [g] };
}, { homes: (H) => !H.apt });

recipe('soapbox', [['9:30', '12:00'], ['14:30', '17:40']], [55, 90], 3, (R, H, t0, t1) => {
  const L = R.L;
  const boys = kidGang(R, H, t0, t1, 2, 9, 14, { sex: 'M' });
  if (!boys.length) return null;
  let q = null;
  if (H.drive !== null) { const d = H.at(H.drive, H.doorOut + 0.5); if (R.open(d.x, d.z, { r: 1.0, lawn: false, t0, t1, h: 1.5 }) !== false) q = d; }
  if (!q) q = R.frontLawn(H, { t0, t1, r: 1.1 })[0];
  if (!q) return null;
  L.timed('soapbox_racer', q.x, q.z, H.P.yawOut, t0 - 2, t1 + 60, { tint: R.rng.pick(['#c83a2a', '#e8a030', '#2a5ab0']) });
  L.label(q.x, 0.5, q.z, t0 - 2, t1 + 60, `The ${surname(H)} boys' soapbox racer, built for the Elm Street hill`, 1.4);
  boys.forEach((b, i) => { const a = i ? 2.4 : 0.6; const x = q.x + Math.cos(a) * 0.95, z = q.z + Math.sin(a) * 0.95; blk(R, b, t0, t1, R.spotAt(x, z, { faceTo: [q.x, q.z], act: i ? 'saw' : 'hammer_kneel' }), i ? 'saw' : 'hammer_kneel', 'Building a soapbox racer out of an orange crate and pram wheels', { lines: ['Elm Street hill, all the way to Orchard. No brakes. That\'s the point.', 'Hand me the pram wheels. Don\'t tell Ma where we got them.'] }); });
  L.sound(q.x, 1, q.z, t0, t1, 'hammer', { range: 35, vol: 0.4 });
  R.claim(q.x, q.z, 1.6, t0, t1);
  return { title: 'Building a soapbox racer', people: boys };
}, { homes: (H) => H.detached });

// a boy selling Centennial pennants door to door
recipe('pennants', [['9:40', '11:40'], ['15:40', '17:20']], [50, 80], 3, (R, H, t0, t1) => {
  const L = R.L;
  const [k] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 9 && x.age <= 13, household: true });
  if (!k) return null;
  const doors = orderNN(R.homes.filter((Q) => Q !== H && Q.street === H.street && !eventHouse(Q, t0, t1) && Math.hypot(Q.P.door.x - H.P.door.x, Q.P.door.z - H.P.door.z) < 90), H.P.door.x, H.P.door.z).slice(0, 9);
  if (doors.length < 4) return null;
  const it = R.day(k, t0, { label: 'Selling Centennial pennants door to door, a quarter apiece', held: 'pennant_centennial' });
  const ppl = [k];
  for (const Q of doors) {
    if (it.t > t1 - 4) break;
    const s = R.callerSpot(Q, 0.15, { act: 'talk' });
    const arr = it.t + R.walkMin(k, it.node, s.node);
    const [b] = R.cast(Q, arr, arr + 2.5, 1, { filter: isAdult, household: true });
    if (b) {
      it.go(s, 2.5, { act: 'talk' });
      L.block(b, arr - 0.2, arr + 2.5, R.hostSpot(Q), 'talk', { label: 'Buying a Centennial pennant off the neighbour boy' });
      L.convo([k, b], arr, arr + 2.5, R.rng.pick([[[0, 'Centennial pennant? Genuine felt! A quarter.'], [1, 'A quarter! Woolcott\'s wants thirty cents.'], [0, 'Woolcott\'s ran out. I\'ve got the last twelve in town.']], [[0, '1853 to 1953! It\'s history, mister.'], [1, 'I was there for about half of it. All right, one.']]]));
      ppl.push(b);
    } else it.go(s, 1, { act: 'wait', label: 'Knocking — nobody home' });
  }
  it.commit({ end: Math.max(it.t + 0.3, t0 + 10) });
  return { title: 'A boy selling Centennial pennants door to door', people: ppl };
}, { homes: (H) => !H.apt && H.kids.some((x) => x.age >= 9 && x.age <= 13) });

// ---------------------------------------------------------------- row houses: life on the stoop
recipe('stoop', [['7:40', '12:00'], ['12:20', '17:45'], ['18:35', '21:05']], [30, 80], 34, (R, H, t0, t1) => {
  const L = R.L;
  const ppl = R.cast(H, t0, t1, 2, { filter: (x) => x.age >= 10, household: true });
  if (!ppl.length) return null;
  const N = neighbourOf(R, H);
  const other = N && !eventHouse(N, t0, t1) && !R.busyHouse(N, t0, t1) ? R.cast(N, t0, t1, 1, { filter: (x) => x.age >= 10, household: true })[0] : null;
  const s1 = stepSeat(R, H, 0.45), s2 = stepSeat(R, H, -0.45);
  const lab = R.rng.pick(['Sitting out on the front stoop', 'On the stoop, watching the street go by', 'On the front steps with a cup of coffee']);
  blk(R, ppl[0], t0, t1, s1, 'talk_sit', lab, { held: R.rng.chance(0.4) ? 'coffee_cup' : undefined });
  const all = [ppl[0]];
  if (ppl[1]) { blk(R, ppl[1], t0, t1, s2, 'listen_sit', lab); all.push(ppl[1]); }
  if (other) { blk(R, other, t0, t1, stepSeat(R, N, 0.45), 'talk_sit', `Talking stoop to stoop with ${mr(ppl[0])}`); all.push(other); R.scene('Talking stoop to stoop', N, t0, t1, []); }
  if (all.length > 1) L.convo(all, t0 + 1, t1, [].concat(...R.rng.shuffle(GOSSIP.slice()).slice(0, 3)));
  return { title: 'Sitting out on the stoop', people: all };
}, { homes: (H) => H.row });

recipe('scrub', [['7:30', '11:30'], ['14:00', '17:00']], [20, 35], 7, (R, H, t0, t1) => {
  const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 12 && x.age < 80, household: true, prefer: (x) => x.sex === 'F' });
  if (!p) return null;
  const q = H.at(0.15, H.stepEnd + 0.55);
  const L = R.L;
  blk(R, p, t0, t1, R.spotAt(q.x, q.z, { yaw: H.P.yawIn, act: 'shine' }), 'shine', 'Scrubbing the front steps with a brush and a bucket', { costume: COSTUME.apron(p), lines: ['Company for the Centennial. They\'ll see the steps first.', 'My mother did these steps every Saturday of her life. So do I.'] });
  const b = H.at(0.9, H.stepEnd + 0.6);
  L.timed('bucket_suds', b.x, b.z, 0, t0, t1);
  return { title: 'Scrubbing the front steps', people: [p] };
}, { homes: (H) => H.row || H.apt });

// ---------------------------------------------------------------- piano practice through the window
recipe('piano', [['9:00', '11:45'], ['15:30', '17:30']], [30, 50], 4, (R, H, t0, t1) => {
  const L = R.L;
  const [k] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 7 && x.age <= 15, household: true });
  if (!k) return null;
  const seat = pianoBench(H);
  if (!seat) return null;
  blk(R, k, t0, t1, seat, 'piano', 'Practicing scales — the same four bars, again', { lines: ['C, D, E, F, G... F, E, D...', 'Mrs. Sayer says thirty minutes. It\'s been thirty minutes.'] });
  const w = H.at(R.rng.pick([-2, 2]), H.doorOut + 0.3);
  L.sound(w.x, 1.5, w.z, t0, t1, 'piano', { range: 30, vol: 0.45 });
  L.label(w.x, 1.6, w.z, t0, t1, 'Scales through the parlor window — the same four bars, again', 2);
  // mother on the porch pretending not to count the minutes
  const [m] = R.cast(H, t0, t1, 1, { filter: isAdult, household: true });
  const ppl = [];
  if (m) { const s = porchSeat(R, H, 0) || stepSeat(R, H, 0.8); blk(R, m, t0, t1, s, 'knit', 'Knitting on the porch, listening to the piano practice'); ppl.push(m); }
  return { title: 'Piano practice heard through the window', people: ppl.length ? ppl : [k] };
}, { homes: (H) => H.detached && !!pianoBench(H) && H.kids.some((x) => x.age >= 7 && x.age <= 15) });

// the bench at the family piano, if the house has one
function pianoBench(H) {
  for (const h of H.P.homes || []) for (const s of h.home.lounge || []) if (s.tags && s.tags.includes('piano')) return s;
  return null;
}

// ---------------------------------------------------------------- stickball on the side street
const STICKBALL = ['Two sewers! That\'s a homer!', 'Car! CAR! ...okay, go.', 'You\'re out — it hit Mrs. Tobin\'s hedge!', 'I\'m Duke Snider. You can be the Yankees.', 'Who\'s got the Spaldeen? Don\'t lose the Spaldeen.', 'Ghost man on first!'];
recipe('stickball', [['9:30', '12:05'], ['15:50', '17:45']], [35, 60], 6, (R, H, t0, t1) => {
  const L = R.L;
  const kids = R.cast(H, t0, t1, 6, { filter: (x) => x.age >= 8 && x.age <= 17, radius: 220, anywhere: true, prefer: (x) => x.sex === 'M' });
  if (kids.length < 3) return null;
  // home plate is the sewer lid by the curb; the pitcher is up the sidewalk; the outfield strings along it
  const plate = R.sidewalk(H, -7, 3.2, { t0, t1 }), mound = R.sidewalk(H, 3, 3.2, { t0, t1 });
  if (!plate || !mound) return null;
  const field = [R.sidewalk(H, 9, 1.4, { t0, t1 }), R.sidewalk(H, 14, 2.8, { t0, t1 }), R.sidewalk(H, 6.5, 0.8, { t0, t1 }), R.sidewalk(H, -10, 2.2, { t0, t1 })].filter(Boolean);
  blk(R, kids[0], t0, t1, R.spotAt(plate.x, plate.z, { faceTo: [mound.x, mound.z], act: 'play_ball' }), 'play_ball', 'At bat — stickball with a broom handle and a pink Spaldeen', { held: 'bat', lines: STICKBALL });
  blk(R, kids[1], t0, t1, R.spotAt(mound.x, mound.z, { faceTo: [plate.x, plate.z], act: 'play_ball' }), 'play_ball', 'Pitching — stickball on the side street', { held: 'ball', lines: STICKBALL });
  const used = [kids[0], kids[1]];
  kids.slice(2).forEach((k, i) => {
    const q = field[i % Math.max(1, field.length)]; if (!q) return;
    const act = i % 2 ? 'cheer' : 'wait';
    blk(R, k, t0, t1, R.spotAt(q.x + (i >= field.length ? 0.9 : 0), q.z, { faceTo: [plate.x, plate.z], act }), act, i === 0 ? 'Catching — stickball (the sewer lid is home)' : 'In the outfield — two sewers is a home run', { lines: STICKBALL });
    used.push(k);
  });
  L.sound(plate.x, 1, plate.z, t0, t1, 'kids', { range: 35, vol: 0.5 });
  L.label(plate.x, 0.3, plate.z, t0, t1, 'Home plate: a sewer lid. First base: the lamppost.', 1.2);
  R.claim((plate.x + mound.x) / 2, (plate.z + mound.z) / 2, 7, t0, t1);
  return { title: 'Stickball on the side street', people: used, at: plate };
}, { homes: (H) => !H.apt, w: 2.5 });

// ---------------------------------------------------------------- the porch swing: old folks by day, courting by night
recipe('swing', [['9:40', '12:00'], ['19:10', '21:00']], [35, 80], 8, (R, H, t0, t1) => {
  const L = R.L;
  const src = H.P.porch && H.P.porch[0];
  if (!src || src.pose !== 'sit' || src.label !== 'On the porch swing') return null;
  const seat = porchSeat(R, H, 0); if (!seat) return null;
  const f = [Math.cos(seat.yaw), -Math.sin(seat.yaw)]; // the seat's right-hand side
  const next = R.L.spot(seat.x + f[0] * 0.55, seat.z + f[1] * 0.55, { y: seat.y, yaw: seat.yaw, pose: 'sit', seat: seat.seat, act: 'rock', link: seat.node });
  if (t0 >= T('19:00')) {
    // a young couple, one of them lives here — and a curtain twitching in the front window
    const [a] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 16 && x.age <= 26, household: true });
    if (!a) return null;
    const [b] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 16 && x.age <= 28 && x.sex !== a.sex && !H.members.includes(x), radius: 220, anywhere: true });
    if (!b) return null;
    blk(R, a, t0, t1, seat, 'rock', `Courting on ${theirs(H)} porch swing`);
    blk(R, b, t0, t1, next, 'talk_sit', `Calling on ${a.first} ${a.last} — on the porch swing, under the porch light`);
    L.convo([a, b], t0 + 1, t1, [[0, 'Your father\'s been reading the same page for an hour.'], [1, 'He\'s a very thorough reader.'], [1, 'Will you save me a dance tomorrow night?'], [0, 'I might. If you ask Pop first.'], [0, 'Listen — you can hear the band from the square.'], [1, 'That\'s "Moonlight Serenade." They play it for the couples.']]);
    const w = H.at(R.rng.pick([-2.2, 2.2]), H.doorOut - 0.2);
    L.label(w.x, 1.6, w.z, t0, t1, 'A curtain twitches in the front window. Mother is "dusting."', 1.1);
    return { title: 'Courting on the porch swing', people: [a, b], at: seat };
  }
  const ppl = R.cast(H, t0, t1, 2, { filter: (x) => x.age >= 38, household: true, prefer: (x) => x.age >= 60 });
  if (!ppl.length) return null;
  blk(R, ppl[0], t0, t1, seat, 'rock', 'Swinging gently on the porch swing, watching the street go by', { lines: ['That\'s the Kowalski boy\'s new Ford. Two-tone. Well.', 'Forty years we\'ve sat on this swing. The chains squeak in the same place.'] });
  if (ppl[1]) blk(R, ppl[1], t0, t1, next, R.rng.pick(['knit', 'doze', 'talk_sit']), 'On the porch swing, keeping an eye on the neighbours');
  return { title: 'A morning on the porch swing', people: ppl, at: seat };
}, { homes: (H) => H.detached && !!(H.P.porch && H.P.porch[0] && H.P.porch[0].label === 'On the porch swing') && H.members.some((x) => x.age >= 38 || (x.age >= 16 && x.age <= 26)), w: 2 });

// ---------------------------------------------------------------- dawn: the early risers
recipe('early', [['6:05', '7:30']], [25, 45], 16, (R, H, t0, t1) => {
  const L = R.L;
  const olds = H.members.filter((x) => x.age >= 58 && awakeish(R, x, t0, t1));
  const p = olds[0]; if (!p) return null;
  if (H.detached && R.rng.chance(0.6)) {
    const len = Math.min(3.2, -H.stepEnd - 1.2);
    if (len < 1.2) return null;
    const q = H.at(0.1, H.stepEnd + 0.6);
    L.plan(p, t0, t1, [{ t: t0, spot: R.spotAt(q.x, q.z, { yaw: H.P.yawOut, act: 'sweep', pace: len }), act: 'sweep', label: 'Sweeping the walk before the town wakes up' }]);
  } else {
    const s = H.row ? stepSeat(R, H, 0.4) : (porchSeat(R, H, 0) || stepSeat(R, H, 0.6));
    L.plan(p, t0, t1, [{ t: t0, spot: s, act: 'drink', label: 'First coffee on the steps, watching the milk truck', held: 'coffee_cup' }]);
  }
  L.say(p, t0, t1, ['Up before the milkman. Sixty years, up before the milkman.', 'Listen. You can hear the fishing boats coming in.']);
  return { title: 'An early riser at dawn', people: [p] };
}, { homes: (H) => !H.apt && H.members.some((x) => x.age >= 58) });
function awakeish(R, p, t0, t1) {
  if (p.commuter || p.visitor || !R.L.free(p, T(t0), T(t1))) return false;
  return !p.schedule.some((e, k) => { const nx = k + 1 < p.schedule.length ? p.schedule[k + 1].t : 1440; return nx > T(t0) && e.t < T(t1) && (e.event || e.life || (e.label && /^(Working|Back at work)/.test(e.label))); });
}

// ---------------------------------------------------------------- "Tom-my! Sup-per!"
recipe('supper', [['17:20', '17:45']], [4, 7], 10, (R, H, t0, t1) => {
  const L = R.L;
  if (!H.kids.length) return null;
  const [m] = R.cast(H, t0, t1, 1, { filter: (x) => isAdult(x) && x.sex === 'F', household: true });
  if (!m) return null;
  const k = H.kids[0];
  blk(R, m, t0, t1, R.hostSpot(H, { act: 'wave' }), 'wave', 'Calling the kids in for supper', { lines: [`${first(k)}! Sup-per!`, `${first(k)} ${k.last}, you come in this minute and wash those hands!`, 'I\'m not calling twice!'] });
  return { title: 'Calling the kids in for supper', people: [m] };
}, { homes: (H) => !H.apt && H.kids.length > 0 });

// ---------------------------------------------------------------- fireworks from the front steps
recipe('fireworks', [['20:52', '20:58']], [32, 38], 8, (R, H, t0, t1) => {
  const L = R.L;
  const ppl = R.cast(H, t0, t1, 4, { filter: (x) => x.age >= 3, household: true });
  if (!ppl.length) return null;
  const pts = R.frontLawn(H, { t0, t1, r: 0.5, near: [0, -1.5] });
  const base = pts[0] || R.sidewalk(H, 1, 1.5, { t0, t1 });
  if (!base) return null;
  const s = R.spotAt(base.x, base.z, { act: 'look', spread: 1.0, faceTo: [-120, 60] });
  ppl.forEach((p) => blk(R, p, t0, t1, s, p.age < 10 ? 'cheer' : 'look', 'Watching the fireworks over the rooftops from the front yard', { lines: ['Ooh — a red one!', 'That one sounded like the \'38 hurricane.', 'Look, over the Trust Building!'] }));
  return { title: 'Watching the fireworks from the front yard', people: ppl };
}, { homes: (H) => !H.apt });

// ---------------------------------------------------------------- watering the flower bed
recipe('water', [['7:00', '10:30'], ['16:20', '17:45']], [20, 35], 14, (R, H, t0, t1) => {
  for (const s of R.rng.shuffle([H.faceL + 0.9, H.faceR - 0.9, -2.2, 2.2, 3.2, -3.2])) {
    const q = H.at(s, H.yardFront + 0.9);
    if (Math.abs(s) < 1 || R.open(q.x, q.z, { r: 0.35, y: H.lawnY, tol: 0.1, t0, t1 }) === false) continue;
    const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 10 && x.age < 88 });
    if (!p) return null;
    const eve = T(t0) > T('15:00');
    blk(R, p, t0, t1, R.spotAt(q.x, q.z, { yaw: H.P.yawIn, act: 'water_plants', pace: 1.2 }), 'water_plants', eve ? 'Watering the chrysanthemums before supper' : 'Watering the mums while the dew\'s still on', { lines: ['Mums for the Centennial. Bronze and gold, like the bunting.', 'Hasn\'t rained since Labor Day. Not a drop.'] });
    R.claim(q.x, q.z, 1.2, t0, t1);
    return { title: 'Watering the flower bed', people: [p] };
  }
  return null;
}, { homes: (H) => H.detached });

// ---------------------------------------------------------------- the evening paper on the steps
recipe('evpaper', [['16:30', '17:45']], [25, 45], 14, (R, H, t0, t1) => {
  const [p] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 25, household: true, prefer: (x) => x.sex === 'M' });
  if (!p) return null;
  const s = H.row ? stepSeat(R, H, 0.4) : (porchSeat(R, H, 0) || stepSeat(R, H, 0.6));
  if (!s) return null;
  blk(R, p, t0, t1, s, 'read', R.rng.pick(['Reading the Courier on the steps before supper', 'The box scores, on the porch, shoes off', 'Reading about the Centennial in the Courier']), { lines: ['Says here the time capsule opens in 2053. I\'ll be ninety... and some.', 'Sixteen games out. They print it like it\'s good news.'] });
  return { title: 'The paper on the porch before supper', people: [p] };
}, { homes: (H) => !H.apt });

// ---------------------------------------------------------------- the planner
// Fill the day in ten-minute slots: wherever the neighbourhoods have fewer people out doing things
// than the hour calls for, pick a recipe that fits the time and put it on the least-busy street.
const TARGET = [[6, 6], [6.5, 10], [7, 18], [7.5, 26], [8, 36], [8.5, 46], [9, 56], [12, 56], [12.25, 42], [13, 42], [13.25, 52], [17, 52], [17.5, 40], [17.75, 14], [18.6, 14], [18.75, 40], [20.5, 34], [21, 22], [21.5, 8]];
function targetAt(t) {
  const h = t / 60;
  for (let i = 1; i < TARGET.length; i++) if (h < TARGET[i][0]) { const [h0, v0] = TARGET[i - 1], [h1, v1] = TARGET[i]; return v0 + (v1 - v0) * (h - h0) / (h1 - h0); }
  return 0;
}
function planScenes(R) {
  const L = R.L;
  R.spinners = []; R.smokes = [];
  if (typeof process !== 'undefined' && process.env && process.env.RESDBG) R.dbg = [];
  // each recipe's budget is shared out over its time windows by length, so mornings can't use it all up
  const recs = RECIPES.map((r) => { const lens = r.when.map(([a, b]) => T(b) - T(a)), tot = lens.reduce((x, y) => x + y, 0); return { ...r, left: r.max, wleft: lens.map((l) => Math.max(1, Math.round(r.max * 1.25 * l / tot))) }; });
  const streets = [...new Set(R.homes.map((H) => H.street))];
  for (const r of recs) { r.by = new Map(); for (const H of R.homes) { if (!r.homes(H)) continue; if (!r.by.has(H.street)) r.by.set(H.street, []); r.by.get(H.street).push(H); } }
  for (let t = T('6:05'); t < T('21:10'); t += 15) {
    const target = targetAt(t + 7);
    let guard = 0;
    while (R.totalAt(t + 7) < target && guard++ < 18) {
      const avail = recs.filter((r) => r.left > 0.3 && r.when.some(([a, b], i) => t >= T(a) && t < T(b) && r.wleft[i] > 0.3));
      if (!avail.length) break;
      let tot = 0; for (const r of avail) tot += r.w * r.left / r.max;
      let x = R.rng.next() * tot, rec = avail[0];
      for (const r of avail) { x -= r.w * r.left / r.max; if (x <= 0) { rec = r; break; } }
      const wi = rec.when.findIndex(([a, b], i) => t >= T(a) && t < T(b) && rec.wleft[i] > 0.3), win = rec.when[wi];
      const t0 = t + R.rng.int(0, 9), t1 = Math.min(t0 + R.rng.int(rec.dur[0], rec.dur[1]), T(win[1]) + rec.dur[1] * 0.5);
      // least-busy streets first, then houses in random order
      const ranked = streets.map((s) => ({ s, c: R.coverage(s, t0, t1) + R.rng.next() * 2 })).sort((a, b) => a.c - b.c);
      let done = false, tries = 0;
      for (const { s } of ranked) {
        const cands = R.rng.shuffle((rec.by.get(s) || []).filter((H) => !eventHouse(H, t0 - 5, t1 + 5) && !R.busyHouse(H, t0 - 10, t1 + 10)));
        for (const H of cands.slice(0, 4)) {
          if (tries++ > 7) break;
          let res = null;
          R.focus = null;
          try { res = rec.fn(R, H, t0, t1); } catch (e) { if (!R._warned) { R._warned = true; console.error('residential recipe failed', rec.key, e); } }
          if (res && res.people && res.people.length) { const f = res.at || R.focus; R.scene(res.title, H, t0, t1, res.people, f ? { x: f.x, z: f.z, street: H.street } : null); rec.left -= 1; rec.wleft[wi] -= 1; done = true; break; }
        }
        if (done || tries > 7) break;
      }
      if (!done) { rec.left -= 0.5; rec.wleft[wi] -= 0.5; }
      if (R.dbg) R.dbg.push(`${hhmm(t)} tgt ${target.toFixed(0)} have ${R.totalAt(t + 7).toFixed(0)} ${rec.key} ${done ? 'OK' : 'fail'}`);
    }
  }
  // per-frame animation for smoke and jump ropes
  if (R.smokes.length || R.spinners.length) L.every((rt) => animate(R, rt));
  if (R.dbg) L.ctx.resDbg = R.dbg;
}
function animate(R, rt) {
  const cam = rt.cam; if (!cam) return;
  for (const s of R.smokes) {
    if (Math.abs(s.x - cam.x) > 140 || Math.abs(s.z - cam.z) > 140) continue;
    s.h.forEach((h, i) => {
      const ph = (rt.t * 0.16 + i / s.h.length) % 1;
      h.x = s.x + ph * 1.3 + Math.sin(rt.t * 0.7 + i) * 0.2; h.z = s.z + ph * 0.5; h.y = s.y + 0.2 + ph * 3.4;
      h.scale = 0.3 + ph * 0.85; h.yaw = i + ph;
    });
  }
  for (const sp of R.spinners) { if (Math.abs(sp.h.x - cam.x) < 90 && Math.abs(sp.h.z - cam.z) < 90) sp.h.pitch = rt.t * sp.rate; }
}

// (exported for tools and diagnostics)
export { Hood };
export const _dbg = { walls, wallWindows, wallTop, windowStand, ladderOn };

// ---------------------------------------------------------------- Mrs. Sayer's piano lessons
// Evelyn Sayer teaches piano, fifty cents a lesson. The Marlowe won't have a piano on the fourth
// floor, so she goes to her pupils: music case in hand, a morning round of parlours with pianos.
function pianoLessons(R) {
  const L = R.L;
  const teacher = L.person('Evelyn', 'Sayer');
  if (!teacher) return;
  const homes = R.homes.filter((H) => H.detached && pianoBench(H) && H.members.some((x) => x.age >= 6 && x.age <= 15));
  if (!homes.length) return;
  // three lessons, wherever she has forty minutes (and the walk) free between nine and five
  let n = 0, hi = 0;
  for (let a = T('9:20'); a <= T('16:40') && n < 3 && hi < homes.length; a += 10) {
    const b = a + 40;
    if (!L.idle(teacher, a - 20, b)) continue;
    const H = homes[hi];
    const bench = pianoBench(H);
    const pupil = H.members.filter((x) => x.age >= 6 && x.age <= 15).find((x) => L.idle(x, a, b));
    if (!pupil) { if (a % 60 === 0) hi++; continue; }
    const beside = besideSeat(R, bench, 0.7, 'listen');
    if (!beside) { hi++; continue; }
    hi++;
    L.plan(teacher, a - 20, b, [{ t: a - 20, spot: beside, act: 'listen', label: `Giving ${pupil.first} ${pupil.last} a piano lesson — fifty cents, and "wrists up!"`, held: 'book' }], { lines: ['Wrists up, dear. You\'re not kneading bread.', 'And one, and two — no, the other F.', 'Lovely. Now once more, and this time with the left hand.'] });
    L.plan(pupil, a, b, [{ t: a, spot: bench, act: 'piano', label: 'Having a piano lesson with Mrs. Sayer' }], { lines: ['Is it time yet?', 'My wrists ARE up.', 'Can I learn "How Much Is That Doggie in the Window" next?'] });
    const w = H.at(R.rng.pick([-2, 2]), H.doorOut + 0.3);
    L.sound(w.x, 1.5, w.z, a, b, 'piano', { range: 30, vol: 0.45 });
    L.label(w.x, 1.6, w.z, a, b, `A piano lesson through ${theirs(H)} parlor window — the same bar, with feeling`, 2);
    R.scene("Mrs. Sayer's piano lesson", H, a, b, [teacher, pupil]);
    if (n === 0 && L.spottable) L.spottable({ id: 'res_piano_lesson', cat: 'Only at certain times', what: 'A piano lesson — "wrists up!"', hint: 'Mrs. Sayer does her rounds of the Hillcrest parlors, Saturday morning', person: teacher, t0: a - 20, t1: b });
    n++;
  }
  return n;
}

// ---------------------------------------------------------------- courting on the porch swing
// After supper, a few porch swings have a young couple on them, and a curtain in the front window.
function courting(R) {
  const L = R.L;
  const swing = R.homes.filter((H) => H.detached && H.P.porch && H.P.porch[0] && H.P.porch[0].label === 'On the porch swing' && H.members.some((x) => x.age >= 16 && x.age <= 26));
  let n = 0;
  for (const H of R.rng.shuffle(swing.slice())) {
    if (n >= 4) break;
    const t0 = T('19:10') + R.rng.int(0, 25), t1 = t0 + R.rng.int(50, 85);
    const seat = porchSeat(R, H, 0); if (!seat) continue;
    const a = H.members.find((x) => x.age >= 16 && x.age <= 26 && L.idle(x, t0, t1));
    if (!a) continue;
    const [b] = R.cast(H, t0, t1, 1, { filter: (x) => x.age >= 16 && x.age <= 28 && x.sex !== a.sex && !H.members.includes(x), radius: 260, anywhere: true });
    if (!b) continue;
    const f = [Math.cos(seat.yaw), -Math.sin(seat.yaw)];
    const next = L.spot(seat.x + f[0] * 0.55, seat.z + f[1] * 0.55, { y: seat.y, yaw: seat.yaw, pose: 'sit', seat: seat.seat, act: 'talk_sit', link: seat.node });
    blk(R, a, t0, t1, seat, 'rock', `Courting on ${theirs(H)} porch swing`);
    blk(R, b, t0, t1, next, 'talk_sit', `Calling on ${a.first} ${a.last} — on the porch swing, under the porch light`);
    L.convo([a, b], t0 + 1, t1, [[0, 'Your father\'s been reading the same page for an hour.'], [1, 'He\'s a very thorough reader.'], [1, 'Will you save me a dance tomorrow night?'], [0, 'I might. If you ask Pop first.'], [0, 'Listen — you can hear the band from the square.'], [1, 'That\'s "Moonlight Serenade." They play it for the couples.']]);
    const w = H.at(R.rng.pick([-2.2, 2.2]), H.doorOut - 0.2);
    L.label(w.x, 1.6, w.z, t0, t1, 'A curtain twitches in the front window. Mother is "dusting."', 1.1);
    R.scene('Courting on the porch swing', H, t0, t1, [a, b]);
    if (!n && L.spottable) L.spottable({ id: 'res_courting', cat: 'Only at certain times', what: 'A young couple courting on a porch swing', hint: 'After supper — and watch the front window', person: a, t0, t1 });
    n++;
  }
  return n;
}
