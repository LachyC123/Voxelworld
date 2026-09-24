// Generators: the harbour. The granite quay and its apron, the freight spur and the main line east,
// the six piers, the steamer GRAY LADY at Pier 2 and the gantry crane over her hatch, the waterfront
// sheds (warehouse / fishhouse lots), Juniper Beach with the Playland pier, and Whitcomb Point Light.
// Site work is done in world coordinates (metres for x/z, voxels for y) through a small Kit; the sheds
// use the usual lot Frame. See docs/BUILDINGS.md.
import { Building } from '../building.js';
import { Frame } from '../../world/frame.js';
import { MAT, shell, slab, win, doorway, stairs, partitionX, partitionZ, flatRoof, smallSign, officeDesk, counterRun, awning, R4dir } from './common.js';
import { linkToSidewalk } from '../streets.js';
import { PIERS, PLAN } from '../layout.js';
import { textSignType } from '../../props/lib/special.js';
import { defineProp, PROP_DEFS } from '../../props/props.js';

const V = (m) => Math.round(m * 4);
const YAW = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };
const ROT = { W: 0, S: 1, E: 2, N: 3 };
const WALK_Y = 0.25;          // quay, piers, sidewalks
const BOAT_Y = -1.7;          // static boats riding at their moorings
const FW = [-120, 10];        // where the fireworks burst (faceTo for the crowd)

export function register(GEN, SITES) {
  GEN.warehouse = buildShed;
  GEN.fishhouse = buildShed;
  SITES.push({ name: 'the waterfront', order: 10, build: buildWaterfront });
  SITES.push({ name: 'Juniper Beach', order: 12, build: buildBeach });
  SITES.push({ name: 'Whitcomb Point Light', order: 14, build: buildLighthouse });
}

// ============================================================ world-space toolkit
// A "site building" has an identity-like frame (facing W at the origin, y = 0): local x = world vz,
// local z = world vx, local y = world vy. The Kit converts world metres into that frame.
function siteBuilding(ctx, name, kind, rect, o = {}) {
  const b = new Building(ctx, { name, kind, lot: { x: 0, z: 0, w: 1, d: 1, facing: 'W', y: 0, street: o.street || 'Harbor Street' }, address: o.address || '', established: o.est || null, lore: o.lore || null, hours: o.hours || null });
  b._rect = rect;               // becomes b.m (the rect) once the site is finished — b.m() is still a method while building
  if (o.landmark !== false) {
    const lr = o.labelOnly ? { x0: (rect.x0 + rect.x1) / 2, z0: (rect.z0 + rect.z1) / 2, x1: (rect.x0 + rect.x1) / 2, z1: (rect.z0 + rect.z1) / 2 } : rect;
    ctx.landmarks.push({ name: o.label || name, kind, x: (rect.x0 + rect.x1) / 2, z: (rect.z0 + rect.z1) / 2, rect: lr, building: b });
  }
  return b;
}

function finishSite(b) { b.m = b._rect; }

class Kit {
  constructor(ctx, b) { this.ctx = ctx; this.W = ctx.world; this.nav = ctx.nav; this.b = b; }
  // box: x/z metres, y voxels (max exclusive)
  B(x0, y0, z0, x1, y1, z1, mat) { this.W.box(V(x0), y0, V(z0), V(x1), y1, V(z1), mat); }
  P(type, x, y, z, dir = 'S', o = {}) { return this.ctx.props.add(type, x, y, z, typeof dir === 'number' ? dir : YAW[dir], o); }
  node(x, z, y = WALK_Y, kind = 'path') { return this.nav.node(x, y, z, { kind, room: 0 }); }
  link(a, b) { if (a != null && b != null && a >= 0 && b >= 0 && a !== b) this.nav.link(a, b); }
  // polyline of path nodes [[x, z, y?], ...] subdivided every `step` metres
  path(pts, o = {}) {
    const step = o.step || 7, y = o.y ?? WALK_Y, ids = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, z, yy] = pts[i];
      if (i > 0) {
        const [px, pz, py] = pts[i - 1];
        const n = Math.max(1, Math.ceil(Math.hypot(x - px, z - pz) / step));
        const ya = py ?? y, yb = yy ?? y;
        for (let k = 1; k < n; k++) { const t = k / n; ids.push(this.node(px + (x - px) * t, pz + (z - pz) * t, ya + (yb - ya) * t)); }
      }
      ids.push(this.node(x, z, yy ?? y));
    }
    this.nav.chain(ids);
    return ids;
  }
  nearest(x, z, r = 12, y = WALK_Y) { return this.nav.nearest(x, y, z, (id, inf) => inf.kind === 'path' || inf.kind === 'walk', r); }
  nearestWalk(x, z, r = 6) { return this.nav.nearest(x, WALK_Y, z, (id, inf) => inf.kind === 'walk', r); }
  // activity spot at world metres; dir = 'N'|'E'|'S'|'W' or a local rot number; o.yaw overrides
  spot(pose, x, y, z, dir, o = {}) {
    const { link, spread, faceTo, yaw, ...rest } = o;
    const rot = typeof dir === 'number' ? dir : (ROT[dir] ?? 0);
    const s = this.b.spot(pose, z * 4, y * 4, x * 4, rot, { room: 0, ...rest });
    if (yaw !== undefined) s.yaw = yaw;
    if (spread) s.spread = spread;
    if (faceTo) { s.faceTo = faceTo; s.yaw = Math.atan2(faceTo[0] - x, faceTo[1] - z); }
    if (s.pendingLink) {
      const n = link ?? this.nearest(x, z, 16, y);
      if (n != null && n >= 0) { this.nav.link(s.node, n); s.pendingLink = false; }
    }
    return s;
  }
  read(x, y, z, text, o = {}) { this.ctx.interactables.push({ kind: 'read', x, y, z, r: o.r || 1.8, prompt: o.prompt || `Read “${text.title}”`, text, building: this.b }); }
  seat(x, y, z, dir, h = 0.45) { const yaw = typeof dir === 'number' ? dir : YAW[dir]; this.ctx.interactables.push({ kind: 'sit', x, y: y + h, z, r: 1.2, prompt: 'Sit down', yaw: yaw + Math.PI, seatY: y, standAt: [x, y, z] }); }
  light(x, y, z, o = {}) { return this.ctx.lights.add(x, y, z, o); }
  // room from world voxel bounds (air volume)
  vroom(name, vx0, vy0, vz0, vx1, vy1, vz1, o = {}) { return this.b.room(name, vz0, vy0, vx0, vz1 - vz0, vy1 - vy0, vx1 - vx0, o); }
  room(name, x0, y0, z0, x1, y1, z1, o = {}) { return this.vroom(name, V(x0), y0, V(z0), V(x1), y1, V(z1), o); }
  // doorway node between rooms (x/z metres, y voxels). wall: 'x' = the wall runs along world x.
  door(ra, rb, x, y, z, o = {}) { return this.b.door(ra, rb, z * 4, y, x * 4, { ...o, axis: o.wall === 'x' ? 'z' : 'x', leaf: o.leaf ?? false }); }
}

// frame whose front plane faces `side`; raised text goes in the voxel layer `planeV` (world index)
function sideFrame(ctx, side, planeV) {
  if (side === 'N') return new Frame(ctx, 0, 0, planeV + 1, 'N', 0, 0);
  if (side === 'S') return new Frame(ctx, 0, 0, planeV - 1, 'S', 0, 0);
  if (side === 'E') return new Frame(ctx, planeV - 1, 0, 0, 'E', 0, 0);
  return new Frame(ctx, planeV + 1, 0, 0, 'W', 0, 0);
}
// text in world voxels: side it faces, the voxel layer it sits in, centre along the face (world voxel), bottom y (voxel)
function worldText(ctx, str, side, planeV, centreV, yv, mat, o = {}) {
  const f = sideFrame(ctx, side, planeV);
  const lx = side === 'N' ? -centreV : side === 'S' ? centreV : side === 'E' ? -centreV : centreV;
  return f.text(str, lx, yv, -1, mat, { align: 'center', font: o.font || 'small', scale: o.scale || 1 });
}
function textWidth(ctx, str, font = 'small', scale = 1) { return new Frame(ctx, 0, 0, 0, 'S', 0, 0).textWidth(str, scale, font); }

// vertical cylinder in world voxels (centre may be fractional), hollow = wall thickness
function wcyl(W, cx, cz, r, y0, y1, mat, hollow = 0) {
  for (let dz = -Math.ceil(r) - 1; dz <= Math.ceil(r) + 1; dz++) {
    const zc = Math.floor(cz) + dz, zz = zc + 0.5 - cz;
    const half = Math.sqrt(Math.max(0, r * r - zz * zz));
    if (half <= 0) continue;
    const xa = Math.round(cx - half), xb = Math.round(cx + half);
    if (xb <= xa) continue;
    if (hollow > 0) {
      const ri = r - hollow, hi = Math.sqrt(Math.max(0, ri * ri - zz * zz));
      const ia = Math.round(cx - hi), ib = Math.round(cx + hi);
      if (ri <= 0 || ib <= ia) W.box(xa, y0, zc, xb, y1, zc + 1, mat);
      else { W.box(xa, y0, zc, ia, y1, zc + 1, mat); W.box(ib, y0, zc, xb, y1, zc + 1, mat); }
    } else W.box(xa, y0, zc, xb, y1, zc + 1, mat);
  }
}
// rasterised 3-D line (voxel coords), face-connected, merged into runs along its major axis
function lineVox(a, b) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])) * 1.5));
  const out = []; let p = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const q = [Math.floor(a[0] + (b[0] - a[0]) * t), Math.floor(a[1] + (b[1] - a[1]) * t), Math.floor(a[2] + (b[2] - a[2]) * t)];
    if (p && q[0] === p[0] && q[1] === p[1] && q[2] === p[2]) continue;
    if (p) { // keep faces touching: step one axis at a time
      if (q[0] !== p[0] && (q[1] !== p[1] || q[2] !== p[2])) out.push([q[0], p[1], p[2]]);
      if (q[2] !== p[2] && q[1] !== p[1]) out.push([q[0], p[1], q[2]]);
    }
    out.push(q); p = q;
  }
  return out;
}
function drawVox(W, pts, mat, axis = -1) {
  if (!pts.length) return;
  if (axis < 0) {
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const p of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
    const d = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    axis = d[0] >= d[1] && d[0] >= d[2] ? 0 : d[1] >= d[2] ? 1 : 2;
  }
  const u = axis === 0 ? 1 : 0, v = axis === 2 ? 1 : 2;
  const groups = new Map();
  for (const p of pts) { const k = p[u] + ',' + p[v]; let s = groups.get(k); if (!s) groups.set(k, s = new Set()); s.add(p[axis]); }
  for (const [k, set] of groups) {
    const [pu, pv] = k.split(',').map(Number);
    const xs = [...set].sort((a, b) => a - b);
    let s = xs[0], q = xs[0];
    const emit = (a, b) => { const lo = [0, 0, 0], hi = [0, 0, 0]; lo[axis] = a; hi[axis] = b + 1; lo[u] = pu; hi[u] = pu + 1; lo[v] = pv; hi[v] = pv + 1; W.box(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2], mat); };
    for (let i = 1; i <= xs.length; i++) { if (i < xs.length && xs[i] === q + 1) { q = xs[i]; continue; } emit(s, q); if (i < xs.length) s = q = xs[i]; }
  }
}
function wline(W, a, b, mat) { drawVox(W, lineVox(a, b), mat); }
// stepped gable over a world-voxel rectangle; axis 'z' = ridge runs along z. run = voxels in per voxel up.
function wgable(W, x0, y, z0, x1, z1, mat, gableMat, o = {}) {
  const axis = o.axis || 'z', over = o.over ?? 1, run = o.run || 1;
  const span = axis === 'z' ? x1 - x0 : z1 - z0;
  const steps = Math.ceil(span / (2 * run));
  for (let i = 0; i < steps; i++) {
    const yy = y + i, d = i * run;
    if (axis === 'z') {
      if (x1 - x0 - 2 * d + 2 * over <= 0) break;
      W.box(x0 + d - over, yy, z0 - over, x1 - d + over, yy + 1, z1 + over, mat);
      if (gableMat != null && x1 - x0 - 2 * d - 2 * run > 0) W.box(x0 + d + run, yy, z0, x1 - d - run, yy + 1, z1, gableMat);
    } else {
      if (z1 - z0 - 2 * d + 2 * over <= 0) break;
      W.box(x0 - over, yy, z0 + d - over, x1 + over, yy + 1, z1 - d + over, mat);
      if (gableMat != null && z1 - z0 - 2 * d - 2 * run > 0) W.box(x0, yy, z0 + d + run, x1, yy + 1, z1 - d - run, gableMat);
    }
  }
  return steps;
}
// low-pitch gable in a lot Frame (ridge along local z), run voxels in per voxel up
function lowGable(f, x, y, z, sx, sz, mat, gableMat, run = 2, over = 1) {
  const steps = Math.ceil(sx / (2 * run));
  for (let i = 0; i < steps; i++) {
    const d = i * run;
    if (sx - 2 * d + 2 * over <= 0) break;
    f.box(x + d - over, y + i, z - over, sx - 2 * d + 2 * over, 1, sz + 2 * over, mat);
    if (gableMat != null && sx - 2 * d - 2 * run > 0) f.box(x + d + run - 1, y + i, z, sx - 2 * d - 2 * run + 2, 1, sz, gableMat);
  }
  return steps;
}
function subtract(segs, a, b) { const out = []; for (const [s, e] of segs) { if (b <= s || a >= e) { out.push([s, e]); continue; } if (a > s) out.push([s, a]); if (b < e) out.push([b, e]); } return out; }

// ============================================================ custom props (harbour one-offs)
let PROPS_DONE = false;
function defineHarborProps() {
  if (PROPS_DONE) return; PROPS_DONE = true;
  const def = (name, d) => { if (!PROP_DEFS.has(name)) defineProp(name, d); };
  // railroad crossbuck (front faces +z)
  def('hb_crossbuck', {
    size: [26, 58, 4], collide: [0.2, 3.4, 0.2], cat: 'exterior',
    build(m) {
      m.box(12, 0, 1, 2, 56, 2, '#e8e4da'); m.box(11, 0, 0, 4, 2, 4, '#2a2a2a');
      for (let i = 0; i < 26; i++) {
        const y1 = 34 + Math.round(i * 19 / 25), y2 = 53 - Math.round(i * 19 / 25);
        m.box(i, y1 - 1, 2, 1, 5, 1, '#1c1c1c'); m.box(i, y1, 3, 1, 3, 1, '#f0ece2');
        m.box(i, y2 - 1, 2, 1, 5, 1, '#1c1c1c'); m.box(i, y2, 3, 1, 3, 1, '#f0ece2');
      }
      m.box(9, 20, 3, 8, 8, 1, '#1c1c1c'); m.text('RR', 10, 21, 4, '#f0ece2', { font: 'small' });
    },
  });
  // nets hung to dry on a timber rack
  def('hb_net_rack', {
    size: [50, 42, 8], collide: [3.0, 2.5, 0.4], cat: 'exterior',
    build(m) {
      const W = '#6e5a42', N1 = '#3f4a3a', N2 = '#5a4a34', F = '#d8b050';
      m.box(0, 0, 3, 2, 42, 2, W); m.box(48, 0, 3, 2, 42, 2, W); m.box(0, 39, 3, 50, 2, 2, W);
      m.box(-1, 0, 1, 4, 1, 6, W); m.box(47, 0, 1, 4, 1, 6, W);
      for (let y = 8; y < 39; y += 3) m.box(2, y, 4 + (y % 2), 46, 1, 1, y % 6 ? N1 : N2);
      for (let x = 3; x < 48; x += 3) m.box(x, 8 + (x % 4), 4, 1, 31 - (x % 4), 1, N1);
      for (let x = 4; x < 47; x += 5) m.box(x, 37, 5, 2, 2, 2, F);
      for (let x = 6; x < 45; x += 7) m.box(x, 8, 5, 2, 2, 2, '#e8e0d0');
    },
  });
  // bronze plaque of the MARY ELLEN memorial (front +z)
  def('hb_mary_ellen_plaque', {
    size: [112, 98, 2], scale: 1 / 56, origin: [56, 0, 0], cat: 'exterior',
    build(m) {
      const BR = '#6a4a26', GL = '#d8b458', DK = '#4a3218';
      m.box(0, 0, 0, 112, 98, 1, DK); m.box(2, 2, 0, 108, 94, 1, BR); m.box(2, 2, 1, 108, 1, 1, GL); m.box(2, 95, 1, 108, 1, 1, GL);
      m.text('MARY ELLEN', 56, 84, 1, GL, { font: 'big', align: 'center' });
      const lines = ['OF JUNIPER BAY, LOST WITH ALL HANDS', 'OFF GANNET LEDGE IN THE GREAT GALE', 'OCTOBER 1867'];
      lines.forEach((t, i) => m.text(t, 56, 76 - i * 6, 1, GL, { align: 'center' }));
      const names = [['CAPT. J. DUNMORE', 'N. DUNMORE'], ['S. WHITCOMB', 'E. COFFIN'], ['T. PRUITT', 'J. HALLETT'], ['W. DOANE', 'P. FLYNN'], ['B. CROWELL', 'H. NICKERSON'], ['I. SNOW', '']];
      names.forEach(([a, b], i) => { m.text(a, 30, 52 - i * 6, 1, GL, { align: 'center' }); if (b) m.text(b, 84, 52 - i * 6, 1, GL, { align: 'center' }); });
      m.text('THE SEA GAVE THEM NOT BACK', 56, 10, 1, GL, { align: 'center' });
      m.text('RAISED BY THEIR WIDOWS 1869', 56, 4, 1, GL, { align: 'center' });
    },
  });
  // small bronze plaque (generic) for walls, 0.8 x 0.5 m
  def('hb_plaque', {
    size: [26, 16, 1], scale: 1 / 32, origin: [13, 0, 0], cat: 'exterior',
    build(m) { m.box(0, 0, 0, 26, 16, 1, '#5a3e20'); m.box(1, 1, 0, 24, 14, 1, '#8a6a3a'); for (let y = 3; y < 13; y += 2) m.box(3, y, 0, 20 - (y % 4) * 2, 1, 1, '#d8b458'); },
  });
  // sawhorse (front +z)
  def('hb_sawhorse', {
    size: [18, 12, 10], cat: 'interior',
    build(m) { const W = '#a8844e'; m.box(0, 10, 4, 18, 2, 2, W); for (const x of [1, 15]) { m.box(x, 0, 1, 2, 10, 2, W); m.box(x, 0, 7, 2, 10, 2, W); m.box(x, 4, 3, 2, 1, 4, W); } },
  });
  // cork-float mooring buoy / lobster buoys on a line
  def('hb_lobster_buoys', {
    size: [10, 18, 4], cat: 'exterior',
    build(m) { const c = ['#d8402a', '#e8d040', '#f0ece2', '#2a6ab0']; for (let i = 0; i < 4; i++) { m.box(1 + (i % 2) * 5, 2 + i * 4, 1, 3, 3, 2, c[i]); m.box(2 + (i % 2) * 5, 5 + i * 4, 1, 1, 1, 2, '#6a5a3a'); } m.box(0, 17, 0, 10, 1, 4, '#6a5a3a'); },
  });
  // ice block (fish house, ice house) 0.5 m cube
  def('hb_ice_blocks', {
    size: [16, 12, 10], cat: 'interior',
    build(m) { m.box(0, 0, 0, 8, 6, 10, '#cfe6ee'); m.box(8, 0, 0, 8, 6, 10, '#bfdce6'); m.box(3, 6, 0, 8, 6, 10, '#d8eef4'); m.box(0, 5, 0, 16, 1, 1, '#a8c8d4'); },
  });
}

// ============================================================ THE WATERFRONT
function buildWaterfront(ctx) {
  defineHarborProps();
  const wf = siteBuilding(ctx, 'Juniper Bay Waterfront', 'waterfront', { x0: 0, z0: -300, x1: 20, z1: 205 }, { landmark: false, lore: 'The granite seawall was rebuilt by the WPA in 1936.' });
  const K = new Kit(ctx, wf);
  const W = ctx.world;
  const rng = ctx.rng.fork('waterfront');
  const QS = 205, QN = -300;
  const piers = PIERS.map((p, i) => ({ ...p, i, z0: p.z - p.w / 2, z1: p.z + p.w / 2, x0: -p.len }));
  const onPier = (z, m = 1) => piers.some((p) => z > p.z0 - m && z < p.z1 + m);
  const sheds = PLAN.filter((l) => l.m.x0 === 20 && l.m.x1 === 44).map((l) => ({ z0: l.m.z0, z1: l.m.z1, spec: l.spec })).sort((a, b) => a.z0 - b.z0);
  const gaps = [];
  for (let i = 0; i + 1 < sheds.length; i++) if (sheds[i + 1].z0 - sheds[i].z1 > 2) gaps.push({ z0: sheds[i].z1, z1: sheds[i + 1].z0, zc: (sheds[i].z1 + sheds[i + 1].z0) / 2 });
  const shedN = sheds.length ? sheds[0].z0 : -205, shedS = sheds.length ? sheds[sheds.length - 1].z1 : 176;

  // ---- the harbour basin: no town ground west of the quay
  W.box(V(-4), -16, V(QN), 0, 6, V(330), 0);
  // ---- the seawall: granite, a dark wet band at the tide line, dressed granite coping
  K.B(0, -14, QN, 2, 0, QS, MAT.quay_stone);
  K.B(0, -6, QN, 0.25, -4, QS, MAT.stone_foundation);
  K.B(-0.25, 0, QN, 0.75, 1, QS, MAT.granite);
  K.B(0, -14, QN, 2, 1, QN + 0.5, MAT.quay_stone);
  // apron: WPA concrete with expansion joints, cobbles behind the tracks and between the sheds
  K.B(0.75, 0, QN, 11, 1, QS, MAT.concrete);
  for (let z = QN + 6; z < QS; z += 6) K.B(0.75, 0, z, 11, 1, z + 0.25, MAT.concrete_dark);
  K.B(17, 0, QN, 44, 1, shedN, MAT.gravel);                     // freight yard north of the sheds
  K.B(17, 0, shedN, 20, 1, QS, MAT.cobble);
  for (const g of gaps) K.B(20, 0, g.z0, 44, 1, g.z1, MAT.cobble);
  K.B(20, 0, shedS, 44, 1, QS, MAT.cobble);
  for (const g of gaps) for (let z = g.z0 + 1; z < g.z1 - 0.5; z += 3) K.B(20.5, 0, z, 43.5, 1, z + 0.25, MAT.granite); // granite setts courses
  // timber fenders on the wall face, iron ladders in niches
  for (let z = QN + 3; z < QS - 2; z += 5) { if (onPier(z, 1.5)) continue; K.B(-0.25, -9, z, 0, 0, z + 0.25, MAT.wood_dark); }
  const ladderZ = [];
  for (let z = QN + 14; z < QS - 4; z += 29) { if (onPier(z, 4)) continue; ladderZ.push(z); quayLadder(W, V(z)); }

  // ---- railway: freight spur along the quay, the curve and the main line east
  buildRailway(ctx, K, piers);

  // ---- piers
  const pierNodes = [];
  const cfgs = [
    { gaps: { N: [-40], S: [-22, -50] }, endGap: [-193, -191] },
    { noRail: { N: true }, gaps: { S: [-30, -62] } },
    { gaps: { N: [-18, -36], S: [-22, -40] }, endGap: [-43, -41] },
    { gaps: { N: [-15, -35], S: [-24, -44] } },
    { gaps: { N: [-10, -17, -24], S: [-11] }, float: true },
    { noRail: { N: true, S: true }, rail: MAT.trim_white },
  ];
  piers.forEach((p, i) => pierNodes.push(buildPier(K, p, cfgs[i])));

  // ---- quay nav: promenade line (x 8.5) and a service line behind the tracks (x 18.5)
  const special = [...piers.map((p) => p.z), ...gaps.map((g) => g.zc)];
  const zs = new Set();
  for (let z = QN + 4; z <= QS - 2; z += 7) zs.add(Math.round(z));
  for (const z of special) zs.add(z);
  const zl = [...zs].sort((a, b) => a - b).filter((z, i, a) => i === 0 || z - a[i - 1] > 1.2 || special.includes(z));
  const quay = new Map();
  let prev = null;
  for (const z of zl) { const n = K.node(8.5, z); quay.set(z, n); if (prev !== null) K.link(prev, n); prev = n; }
  const quayAt = (z) => { let best = null, bd = 1e9; for (const [qz, n] of quay) { const d = Math.abs(qz - z); if (d < bd) { bd = d; best = n; } } return best; };
  const svc = new Map(); prev = null;
  for (const z of zl.filter((z) => z >= shedN - 7)) { const n = K.node(18.5, z); svc.set(z, n); if (prev !== null) K.link(prev, n); prev = n; }
  // cross the tracks at every pier head and every gap between the sheds
  for (const z of special) if (svc.has(z)) K.link(quay.get(z), svc.get(z));
  // lanes between the sheds out to the Harbor Street sidewalk
  for (const g of gaps) {
    const a = K.node(31, g.zc), bnode = K.node(44.5, g.zc);
    K.link(svc.get(g.zc), a); K.link(a, bnode);
    const w = K.nearestWalk(46, g.zc, 5); if (w >= 0) K.link(bnode, w);
  }
  { // north freight yard & south end
    const a = K.node(30, shedN - 6), bnode = K.node(44.5, shedN - 6);
    K.link(a, bnode); K.link(a, svc.get([...svc.keys()][0])); const w = K.nearestWalk(46, shedN - 6, 5); if (w >= 0) K.link(bnode, w);
    const c = K.node(30, shedS + 12), d = K.node(44.5, shedS + 12);
    K.link(c, d); K.link(c, quayAt(shedS + 12)); K.link(c, svc.get([...svc.keys()].pop())); const w2 = K.nearestWalk(46, shedS + 12, 5); if (w2 >= 0) K.link(d, w2);
  }
  // piers hang off the promenade
  piers.forEach((p, i) => K.link(pierNodes[i].head, quay.get(p.z)));

  // ---- quay furniture
  for (let z = QN + 8; z < QS - 3; z += 12) if (!onPier(z, 2)) K.P('bollard', 1.05, WALK_Y, z, 'W');
  for (const z of ladderZ) { K.P('dock_cleat', 1.0, WALK_Y, z - 1.4, 'W'); if (rng.chance(0.6)) K.P('rope_coil', 2.2, WALK_Y, z + 1.8, 'S'); }
  for (let z = QN + 10; z < QS; z += 24) K.P('street_lamp', 10.3, WALK_Y, z, 'W');
  const benchZ = [-270, -240, -160, -148, -85, -62, 2, 45, 62, 118, 135, 185];
  for (const z of benchZ) {
    K.P('bench_park', 3.6, WALK_Y, z, 'W');
    for (const dz of [-0.6, 0.6]) { K.spot('sit', 3.75, WALK_Y, z + dz, 'W', { act: rng.pick(['sit', 'read', 'feed_birds', 'smoke_pipe', 'sit']), tags: ['bench'], seat: 0.45, link: quayAt(z) }); K.seat(3.75, WALK_Y, z + dz, 'W'); }
  }
  // working clutter: barrels, crates, traps, fish boxes, nets, handcarts
  const clutter = [
    [-178, ['barrel_stack', 'crate_stack', 'cargo_pallet']], [-172, ['sack_pile', 'crate']], [-132, ['oil_drum', 'oil_drum', 'barrel']], [-104, ['crate_stack', 'cargo_pallet']],
    [-60, ['fish_crate', 'fish_crate', 'barrel', 'lobster_trap_stack']], [-28, ['fishing_net_pile', 'barrel_stack']], [-18, ['lobster_trap_stack', 'lobster_trap', 'hb_lobster_buoys']],
    [8, ['barrel', 'rope_coil']], [36, ['lobster_trap_stack', 'lobster_trap_stack', 'fishing_net_pile']], [72, ['dory', 'hb_sawhorse']], [108, ['barrel_stack', 'fish_crate']],
    [146, ['crate', 'rope_coil']], [192, ['lobster_trap_stack', 'hb_lobster_buoys', 'barrel']],
  ];
  for (const [z, items] of clutter) items.forEach((t, k) => K.P(t, t === 'dory' ? 5.5 : 6.2 + (k % 2) * 1.6, WALK_Y, z + k * 1.8, t === 'dory' ? 'N' : rng.pick(['S', 'E', 'W', 'N']), { tint: t === 'dory' ? '#d8cfa8' : undefined, tint2: '#3a6a5a' }));
  // gap yards: a parked truck, crates, a handcart
  const trucks = [['truck_delivery', '#5a6a4a'], ['truck_pickup', '#6a2a24'], ['truck_delivery', '#2a3a5a']];
  gaps.forEach((g, i) => {
    if (g.z1 - g.z0 >= 9 && i % 2 === 0) { const [t, c] = trucks[i % 3]; K.P(t, 33, WALK_Y, g.zc, 'W', { tint: c, cat: 'far' }); }
    K.P(rng.pick(['crate_stack', 'barrel_stack', 'lobster_trap_stack', 'sack_pile']), 22, WALK_Y, g.z0 + 1.2, 'E');
    K.P(rng.pick(['barrel', 'crate', 'trash_basket']), 42.5, WALK_Y, g.z1 - 1.0, 'W');
  });
  // the MARY ELLEN memorial and the WPA seawall plaque
  buildMaryEllen(K, -10, quayAt(-10));
  K.P('hb_plaque', 0.9, WALK_Y + 0.02, 60.4, 'W');
  K.read(1.2, 0.6, 60.4, { title: 'Seawall Plaque', body: 'JUNIPER BAY SEAWALL AND QUAY\nReconstructed 1936 by the Works Progress Administration\nwith the Town of Juniper Bay.\n\n1,840 feet of granite from the Pruitt quarry, laid by 212 men of this town\nwho would otherwise have had no work that winter.\n\nIt held in 1938.' }, { r: 2.2 });

  // ---- spots: fireworks crowd (quay & piers), pier fishing, the fish-cleaning table, dock jobs
  let nfw = 0;
  for (let z = -112; z < 200; z += 5.5) {
    if (z > -14 && z < -5) continue;
    K.spot('stand', 4.8, WALK_Y, z, 'W', { act: 'look', tags: ['fireworks'], spread: 2, faceTo: FW, link: quayAt(z) }); nfw++;
  }
  const pierFw = [[2, [-20, -32, -46]], [3, [-14, -26, -38]], [4, [-20, -33]], [5, [-18, -28]], [0, [-30, -52]]];
  for (const [i, xs] of pierFw) for (const x of xs) { K.spot('stand', x, WALK_Y, piers[i].z, 'W', { act: 'look', tags: ['fireworks'], spread: 2, faceTo: FW }); nfw++; }
  // pier fishing: Pier 1 end & float, Pier 4 end, Pier 5 end
  const fish = [[-69.3, -196.5, 'W'], [-69.3, -188.5, 'W'], [-49.3, 19.5, 'W'], [-49.3, 24.5, 'W'], [-43.3, 91, 'W'], [-43.3, 97, 'W'], [-79.4, -194.5, 'W', -1.0], [-79.4, -189.5, 'W', -1.0], [-30, 17.6, 'N'], [-58, -36.6, 'S']];
  for (const [x, z, d, y] of fish) K.spot('stand', x, y ?? WALK_Y, z, d, { act: 'fish', tags: ['fish'], held: 'fishing_rod', label: 'Fishing off the pier' });
  void nfw;

  // ---- static boats at their moorings (the fleet, the tug and the club sailboats are animated elsewhere)
  const boats = [
    ['tugboat', -40, -202.5, 'W', '#7a2a22'], ['dory', -22, -183.5, 'W', '#d8cfa8'], ['lobster_boat', -50, -182, 'E', '#2a5a3a'], ['rowboat', -76, -186.3, 'W', '#3a5a7a'],
    ['fishing_boat', -62, -105.5, 'W', '#2a4a6a'],
    ['dory', -63.5, -44.8, 'W', '#e0d6b0'], ['dory', -63.5, -39.4, 'W', '#c8b890'],
    ['lobster_boat', -15, 13, 'W', '#d8d0b8'], ['lobster_boat', -35, 13, 'E', '#3a3a5a'], ['fishing_boat', -44, 31.5, 'W', '#8a2a24'],
    ['rowboat', -10, 86.4, 'E', '#2a4a3a'], ['rowboat', -17, 86.4, 'W', '#8a3a2a'], ['dory', -24, 86.2, 'W', '#d8cfa8'],
    ['dory', -13, 104, 'W', '#d8cfa8'], ['rowboat', -20, 103.8, 'E', '#e8e0d0'], ['lobster_boat', -29, 104.6, 'W', '#2a3a5a'], ['sailboat', -38.5, 104.6, 'W', '#f0ece2'],
    ['sailboat', -10, 156.8, 'W', '#2a3a6a'], ['sailboat', -18, 156.8, 'W', '#f0ece2'], ['sailboat', -26, 156.8, 'W', '#8a2a24'], ['sailboat', -34, 156.8, 'W', '#e8e0c8'],
    ['lobster_boat', -70, 58, -2.4, '#4a6a4a'], ['fishing_boat', -95, -20, -1.2, '#3a4a5a'], ['sailboat', -62, 132, 0.8, '#f0ece2'], ['sailboat', -80, 150, 2.2, '#2a4a7a'],
    ['dory', -24, -78, 1.1, '#d8cfa8'], ['rowboat', -8, 140, -0.4, '#6a3a2a'], ['rowboat', -6, -262, 0.2, '#2a4a3a'],
  ];
  for (const [t, x, z, d, c] of boats) K.P(t, x, t === 'rowboat' || t === 'dory' ? BOAT_Y + 0.25 : BOAT_Y, z, d, { tint: c, cat: 'far' });
  for (const [x, z] of [[-30, -150], [-55, -62], [-110, -60], [-52, 60], [-90, 75], [-45, 125], [-70, 108], [-120, 180], [-25, 5], [-140, -140]]) K.P('buoy', x, -1.55, z, 0, { tint: '#b3302a' });

  // the cargo steamer and the crane
  buildShip(ctx);
  buildCrane(ctx);
  // waterfront jobs: longshoremen on Pier 2, hatch tender, net menders on Pier 4, the fish table on Pier 3
  pierExtras(K, piers, pierNodes, rng);
  // landmarks for the town map (labels on the piers)
  for (const p of piers) ctx.landmarks.push({ name: p.name, kind: 'pier', x: -p.len / 2, z: p.z, rect: { x0: -p.len / 2, z0: p.z, x1: -p.len / 2, z1: p.z } });
  ctx.landmarks.push({ name: 'Mary Ellen Memorial', kind: 'monument', x: 5, z: -10, rect: { x0: 5, z0: -10, x1: 5, z1: -10 } });
  finishSite(wf);
}

function quayLadder(W, vz) {
  W.box(-1, -10, vz, 1, 1, vz + 3, 0);
  W.box(0, -10, vz, 1, 4, vz + 1, MAT.iron); W.box(0, -10, vz + 2, 1, 4, vz + 3, MAT.iron);
  W.box(0, 3, vz, 1, 4, vz + 3, MAT.iron);
  for (let y = -9; y <= 0; y += 2) W.box(0, y, vz + 1, 1, y + 1, vz + 2, MAT.iron);
}

// ---------------------------------------------------------------- the railway
function buildRailway(ctx, K, piers) {
  const W = ctx.world;
  const SZ0 = V(-290), SZ1 = V(199);
  const MZ = -975.5, R = 96, CX = 56.5 + R, CZ = MZ + R; // spur centre x = 56.5 vox; curve centre (152.5, -879.5)
  // ---- the spur along the quay (x 11..17): ballast, ties, crossing planks at the pier heads, rails
  W.box(44, 0, SZ0 - 8, 68, 1, SZ1 + 6, MAT.gravel);
  for (let z = SZ0; z < SZ1; z += 3) W.box(51, 0, z, 62, 1, z + 1, MAT.rail_tie);
  for (const p of piers) W.box(47, 1, V(p.z - 3), 66, 2, V(p.z + 3), MAT.dock_wood);
  W.box(53, 1, SZ0, 54, 2, SZ1, MAT.rail_steel); W.box(59, 1, SZ0, 60, 2, SZ1, MAT.rail_steel);
  // buffer stops at both ends
  W.box(50, 1, SZ0 - 4, 63, 4, SZ0 - 1, MAT.wood_dark); W.box(50, 2, SZ0 - 1, 63, 3, SZ0, MAT.trim_red);
  W.box(50, 1, SZ1 + 1, 63, 4, SZ1 + 4, MAT.wood_dark); W.box(50, 2, SZ1, 63, 3, SZ1 + 1, MAT.trim_red);
  // switch stand at the junction
  W.box(67, 1, V(-216), 68, 6, V(-216) + 1, MAT.iron); W.box(66, 6, V(-216), 69, 8, V(-216) + 1, MAT.trim_red); W.box(67, 6, V(-216) - 1, 68, 8, V(-216) + 2, MAT.trim_white);
  // ---- the curve (quarter circle from the spur, heading north, round to the main line, heading east)
  for (let vz = Math.floor(CZ - R - 12); vz < CZ; vz++) {
    const dz = vz + 0.5 - CZ;
    const ro = Math.sqrt(Math.max(0, (R + 12) ** 2 - dz * dz)), ri = Math.sqrt(Math.max(0, (R - 12) ** 2 - dz * dz));
    const xa = Math.round(CX - ro), xb = Math.min(Math.ceil(CX), Math.round(CX - ri));
    if (xb > xa) W.box(xa, 0, vz, xb, 1, vz + 1, MAT.gravel);
  }
  const arcN = Math.round((Math.PI / 2) * R / 3);
  for (let i = 1; i < arcN; i++) {
    const a = Math.PI + (i / arcN) * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    const pts = [];
    for (let r = R - 5.5; r <= R + 5.5; r += 0.5) pts.push([Math.floor(CX + r * c), 0, Math.floor(CZ + r * s)]);
    drawVox(W, pts, MAT.rail_tie, Math.abs(c) > Math.abs(s) ? 0 : 2);
  }
  for (const rr of [R - 3, R + 3]) {
    const pts = [];
    const n = Math.ceil(rr * Math.PI / 2 * 3);
    let p = null;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI / 2;
      const q = [Math.floor(CX + rr * Math.cos(a)), 1, Math.floor(CZ + rr * Math.sin(a))];
      if (p && q[0] === p[0] && q[2] === p[2]) continue;
      if (p && q[0] !== p[0] && q[2] !== p[2]) pts.push([q[0], 1, p[2]]);
      pts.push(q); p = q;
    }
    const h = Math.floor(pts.length / 2);
    drawVox(W, pts.slice(0, h), MAT.rail_steel, 2); drawVox(W, pts.slice(h), MAT.rail_steel, 0);
  }
  // ---- the main line east (z = -243.9): to the station at x 150, and from x 278 out of town
  const seg = (x0, x1) => {
    W.box(x0, 0, -988, x1, 1, -963, MAT.gravel);
    for (let x = x0 + 1; x < x1; x += 3) W.box(x, 0, -981, x + 1, 1, -970, MAT.rail_tie);
    W.box(x0, 1, -979, x1, 2, -978, MAT.rail_steel); W.box(x0, 1, -973, x1, 2, -972, MAT.rail_steel);
  };
  seg(152, 176); seg(256, 600); seg(1112, 2800);
  // level crossing over Harbor Street: planks flush with the road and the sidewalks, rails let in
  W.box(176, 0, -982, 192, 1, -969, MAT.dock_wood); W.box(240, 0, -982, 256, 1, -969, MAT.dock_wood);
  W.box(192, -1, -982, 240, 0, -969, MAT.dock_wood);
  for (const z of [-979, -973]) { W.box(176, 0, z, 192, 1, z + 1, MAT.rail_steel); W.box(240, 0, z, 256, 1, z + 1, MAT.rail_steel); W.box(192, -1, z, 240, 0, z + 1, MAT.rail_steel); }
  K.P('hb_crossbuck', 46.3, WALK_Y, -249.2, 'N'); K.P('hb_crossbuck', 61.7, WALK_Y, -238.6, 'S');
  K.P('hb_crossbuck', 46.3, WALK_Y, -238.6, 'S'); K.P('hb_crossbuck', 61.7, WALK_Y, -249.2, 'N');
  // crossing watchman's shanty
  K.B(65, 0, -254, 67.5, 1, -251.5, MAT.concrete); K.B(65.25, 1, -253.75, 67.25, 10, -251.75, MAT.siding_red);
  K.B(65, 10, -254, 67.5, 11, -251.5, MAT.roof_tar); K.B(65.5, 4, -251.75, 67, 7, -251.5, MAT.glass); K.B(65.25, 11, -253, 65.75, 13, -252.5, MAT.iron);
  // telegraph poles along the line, a home signal east of the station
  for (let x = 260; x < 2800; x += 160) {
    if (x > 590 && x < 1120) continue;
    W.box(x, 0, -995, x + 1, 32, -994, MAT.wood_post); W.box(x, 29, -999, x + 1, 30, -990, MAT.wood_post);
    for (const z of [-998, -995, -991]) W.box(x, 30, z, x + 1, 31, z + 1, MAT.glass_green);
  }
  { const x = 1360; W.box(x, 0, -999, x + 1, 44, -998, MAT.iron); W.box(x, 40, -998, x + 1, 41, -991, MAT.sign_red); W.box(x, 40, -994, x + 1, 41, -993, MAT.trim_white);
    W.box(x - 1, 37, -999, x + 2, 39, -998, MAT.trim_black); W.box(x - 1, 38, -1000, x, 39, -999, MAT.traffic_red); for (let y = 2; y < 40; y += 3) W.box(x + 1, y, -999, x + 2, y + 1, -998, MAT.iron); }
  // freight cars on the stub and at the freight shed doors
  K.P('boxcar', 14.125, 0.5, -281, 'S', { tint: '#7a3424', cat: 'far' });
  K.P('boxcar', 14.125, 0.5, -267.5, 'S', { tint: '#6a4a30', cat: 'far' });
  K.P('boxcar', 14.125, 0.5, -254, 'N', { tint: '#3a4a5a', cat: 'far' });
  K.P('boxcar', 14.125, 0.5, -195, 'S', { tint: '#8a3a2a', cat: 'far' });
  K.P('boxcar', 14.125, 0.5, -152, 'N', { tint: '#5a3a2a', cat: 'far' });
}

// ---------------------------------------------------------------- a pier on piles
function buildPier(K, p, o) {
  const x0 = p.x0, x1 = 0, z0 = p.z0, z1 = p.z1;
  const rail = o.rail || MAT.wood_gray;
  K.B(x0, 0, z0, x1, 1, z1, MAT.dock_wood_z);
  K.B(x0, -1, z0, x1, 0, z0 + 0.25, MAT.wood_dark); K.B(x0, -1, z1 - 0.25, x1, 0, z1, MAT.wood_dark); K.B(x0, -1, z0, x0 + 0.25, 0, z1, MAT.wood_dark);
  const nz = Math.max(2, Math.round(p.w / 3.2));
  for (let x = x0 + 0.25; x < -0.6; x += 3) {
    K.B(x, -1, z0, x + 0.5, 0, z1, MAT.wood_dark);
    for (let k = 0; k <= nz; k++) { const z = z0 + 0.25 + k * (p.w - 1) / nz; K.B(x, -14, z, x + 0.5, -1, z + 0.5, MAT.wood_post); }
  }
  K.B(x0, -4, z0, x1, -3, z0 + 0.25, MAT.wood_mid); K.B(x0, -4, z1 - 0.25, x1, -3, z1, MAT.wood_mid);
  // fender piles outside the stringers (the gulls sit on these)
  for (let x = x0 + 3.5; x < -2; x += 6) { K.B(x, -14, z0 - 0.5, x + 0.5, 4, z0, MAT.wood_post); K.B(x, -14, z1, x + 0.5, 4, z1 + 0.5, MAT.wood_post); }
  K.B(x0 + 0.75 + p.i, -14, z1, x0 + 1.25 + p.i, 5, z1 + 0.5, MAT.wood_post);
  K.B(x0 - 0.5, -14, z0 - 0.5, x0, 5, z0, MAT.wood_post); K.B(x0 - 0.5, -14, z1, x0, 5, z1 + 0.5, MAT.wood_post);
  // railings with openings at the berths (curb, bollards, cleat, ladder)
  const noRail = o.noRail || {};
  for (const side of ['N', 'S']) {
    const zr = side === 'N' ? z0 : z1 - 0.25;
    const inward = side === 'N' ? 0.6 : -0.6;
    let segs = [[x0 + 0.25, -0.75]];
    const gl = (o.gaps || {})[side] || [];
    for (const g of gl) segs = subtract(segs, g - 3, g + 3);
    if (!noRail[side]) for (const [s, e] of segs) {
      if (e - s < 0.75) continue;
      K.B(s, 4, zr, e, 5, zr + 0.25, rail); K.B(s, 2, zr, e, 3, zr + 0.25, rail);
      for (let x = s; x <= e - 0.25; x += 2) K.B(x, 1, zr, x + 0.25, 4, zr + 0.25, rail);
      K.B(e - 0.25, 1, zr, e, 4, zr + 0.25, rail);
    } else K.B(x0 + 0.25, 1, zr, -0.75, 2, zr + 0.25, MAT.wood_dark);
    for (const g of gl) {
      K.B(g - 3, 1, zr, g + 3, 2, zr + 0.25, MAT.wood_dark);
      K.P('bollard', g - 2.4, WALK_Y, zr + 0.125 + inward * 0.9, side === 'N' ? 'N' : 'S'); K.P('bollard', g + 2.4, WALK_Y, zr + 0.125 + inward * 0.9, side === 'N' ? 'N' : 'S');
      K.P('dock_cleat', g, WALK_Y, zr + 0.125 + inward * 0.7, side === 'N' ? 'N' : 'S');
      pierLadder(K.W, V(g + 1), side === 'N' ? V(z0) - 1 : V(z1));
    }
    if (noRail[side]) for (let x = x0 + 4; x < -3; x += 8) K.P('bollard', x, WALK_Y, zr + 0.125 + inward * 0.9, side === 'N' ? 'N' : 'S');
  }
  // the end rail (with an opening if there's a gangway or ladder)
  { let segs = [[z0, z1]]; if (o.endGap) segs = subtract(segs, o.endGap[0], o.endGap[1]);
    for (const [s, e] of segs) { K.B(x0, 4, s, x0 + 0.25, 5, e, rail); K.B(x0, 2, s, x0 + 0.25, 3, e, rail); for (let z = s; z <= e - 0.25; z += 2) K.B(x0, 1, z, x0 + 0.25, 4, z + 0.25, rail); } }
  // lamps along the pier, a life ring post
  let side = 1;
  for (let x = -9; x > x0 + 4; x -= 17) {
    const sz = side > 0 ? z1 - 0.7 : z0 + 0.7;
    const blocked = ((o.gaps || {})[side > 0 ? 'S' : 'N'] || []).some((g) => Math.abs(g - x) < 4);
    if (!blocked) K.P('street_lamp', x, WALK_Y, sz, side > 0 ? 'N' : 'S');
    side = -side;
  }
  K.P('street_lamp', x0 + 1.2, WALK_Y, z0 + 0.8, 'S'); K.P('street_lamp', x0 + 1.2, WALK_Y, z1 - 0.8, 'N');
  K.P('life_ring_post', Math.round(x0 / 2) + 0.5, WALK_Y, z1 - 0.6, 'N');
  // nav: along the centreline
  const ids = K.path([[2.5, p.z], [x0 + 2.2, p.z]], { step: 7 });
  return { head: ids[0], end: ids[ids.length - 1], ids };
}
function pierLadder(W, vx, vzOut) {
  W.box(vx, -9, vzOut, vx + 1, 4, vzOut + 1, MAT.iron); W.box(vx + 2, -9, vzOut, vx + 3, 4, vzOut + 1, MAT.iron);
  for (let y = -8; y <= 0; y += 2) W.box(vx + 1, y, vzOut, vx + 2, y + 1, vzOut + 1, MAT.iron);
  W.box(vx, 3, vzOut, vx + 3, 4, vzOut + 1, MAT.iron);
}

// ---------------------------------------------------------------- pier furnishings, jobs, the fish table
function pierExtras(K, piers, pierNodes, rng) {
  const [p1, p2, p3, p4, p5, pyc] = piers;
  // --- Pier 1: ferry landing (ticket booth, float & gangway)
  {
    const bx0 = -9, bx1 = -5.5, bz0 = -197.75, bz1 = -194.5;
    K.B(bx0, 1, bz0, bx1, 12, bz1, MAT.siding_white);
    K.B(bx0 + 0.25, 1, bz0 + 0.25, bx1 - 0.25, 12, bz1 - 0.25, 0);
    K.B(bx0 - 0.25, 12, bz0 - 0.25, bx1 + 0.25, 13, bz1 + 0.25, MAT.roof_shingle_red); K.B(bx0 + 0.25, 13, bz0 + 0.25, bx1 - 0.25, 14, bz1 - 0.25, MAT.roof_shingle_red);
    K.B(bx0 + 0.75, 5, bz1 - 0.25, bx1 - 0.75, 9, bz1, MAT.glass);                 // ticket window facing the pier
    K.B(bx0 + 0.75, 4, bz1, bx1 - 0.75, 5, bz1 + 0.25, MAT.wood_mid);               // counter shelf
    K.B(bx1 - 0.25, 1, bz0 + 1, bx1, 9, bz0 + 2, 0);                                // door on the quay side
    K.B(bx0, 10, bz1, bx1, 12, bz1 + 0.25, MAT.sign_navy);
    worldText(K.ctx, 'FERRY', 'S', V(bz1) + 1, V((bx0 + bx1) / 2), 10, MAT.sign_white, { font: 'small' });
    const r = K.room('Ferry Ticket Office', bx0 + 0.25, 1, bz0 + 0.25, bx1 - 0.25, 12, bz1 - 0.25, { public: true, lightMode: 'auto' });
    K.door(r, null, bx1 - 0.1, 1, bz0 + 1.5, { leaf: 'door_wood' });
    const near = K.nearest(bx1 + 1, bz0 + 4, 10);
    const dn = K.node(bx1 + 1, bz0 + 1.5); K.link(dn, K.b.roomNode.get(r)); K.link(dn, near);
    K.P('stool_tall', (bx0 + bx1) / 2, WALK_Y, bz1 - 1.3, 'S');
    const ag = K.spot('stand', (bx0 + bx1) / 2, WALK_Y, bz1 - 0.9, 'S', { room: r, act: 'counter', tags: ['work'] });
    K.b.job('ticket agent', ag, { shift: ['7:00', '17:30'], outfit: 'clerk', title: 'ferry ticket agent' });
    K.spot('stand', (bx0 + bx1) / 2 + 0.4, WALK_Y, bz1 + 1.2, 'N', { act: 'talk', tags: ['customer', 'shop'] });
    K.P(textSignType('GANNET ISLAND - PEMBROKE', { bg: '#1f2f4f', fg: '#f0e2b0' }), (bx0 + bx1) / 2, 2.4, bz1 + 0.3, 'S');
    K.read((bx0 + bx1) / 2, 1.2, bz1 + 0.4, { title: 'Ferry Timetable', body: 'JUNIPER BAY — GANNET ISLAND — PEMBROKE\nSteamer ISLAND BELLE, Capt. Enoch Snow\n\nLv. Juniper Bay (Pier 1): 7:00 A.M. · 11:30 A.M. · 4:15 P.M.\nLv. Gannet Island: 8:10 A.M. · 12:40 P.M. · 5:25 P.M.\nFare 35¢ · Children 15¢ · Bicycles 10¢\n\nNOTICE: The ISLAND BELLE is at Pembroke for boiler repairs until October 3rd.\nIsland passengers kindly apply at the Harbor Master\'s office for the launch.' }, { r: 2.4 });
    for (const x of [-15, -24]) { K.P('bench_park', x, WALK_Y, -197.1, 'S'); K.spot('sit', x, WALK_Y, -196.8, 'S', { act: 'sit', tags: ['bench'], seat: 0.45 }); K.seat(x, WALK_Y, -196.8, 'S'); }
    // gangway down to the float
    for (let k = 0; k < 5; k++) K.B(-70.5 - 0.5 * k, -1 - k, -193, -70 - 0.5 * k, -k, -191, MAT.dock_wood);
    K.B(-73, -3, -193.25, -70, -2, -193, MAT.iron); K.B(-73, -3, -191, -70, -2, -190.75, MAT.iron);
    K.B(-80, -5, -196, -72, -4, -188, MAT.dock_wood);
    K.B(-80, -6, -196, -72, -5, -188, MAT.wood_dark);
    K.B(-80, -4, -196, -72, -3, -195.75, MAT.wood_dark); K.B(-80, -4, -188.25, -72, -3, -188, MAT.wood_dark);
    K.P('dock_cleat', -76, -1.0, -195.6, 'N'); K.P('dock_cleat', -76, -1.0, -188.4, 'S');
    const g1 = K.node(-71.2, -192, 0.0), g2 = K.node(-76, -192, -1.0);
    K.link(pierNodes[0].end, g1); K.link(g1, g2);
  }
  // --- Pier 2: cargo stacks, longshoremen, hatch tender
  {
    const items = ['crate_stack', 'cargo_pallet', 'sack_pile', 'barrel_stack', 'oil_drum', 'crate_stack', 'paper_rolls', 'cargo_pallet'];
    let k = 0;
    for (let x = -86; x < -36; x += 4.5) { if (x > -34 && x < -18) continue; K.P(items[k++ % items.length], x, WALK_Y, -111.6 - (k % 2) * 1.8, rng.pick(['N', 'S', 'E'])); }
    for (let x = -60; x < -44; x += 4) K.P(rng.pick(['paper_rolls', 'crate_stack']), x, WALK_Y, -121.2, 'N');
    const ls = [];
    for (const x of [-48, -57, -66, -40]) ls.push(K.spot('stand', x, WALK_Y, -114.8, rng.pick(['N', 'S']), { act: 'carry', tags: ['work', 'dock_job'], label: 'Working cargo on Pier 2' }));
    K.b.job('longshoreman', [ls[0], ls[1]], { shift: ['6:00', '12:00'], outfit: 'dock' });
    K.b.job('longshoreman', [ls[2], ls[1]], { shift: ['6:00', '12:00'], outfit: 'dock' });
    K.b.job('longshoreman', [ls[3], ls[0]], { shift: ['12:00', '18:00'], outfit: 'dock' });
    const ht = K.spot('stand', -26, WALK_Y, -123.6, 'N', { act: 'wave', tags: ['work'], label: 'Signalling the crane' });
    K.b.job('hatch tender', ht, { shift: ['6:00', '12:00'], outfit: 'dock', title: 'hatch tender' });
    K.P('luggage_cart', -52, WALK_Y, -117.5, 'E'); K.P('wheelbarrow', -70, WALK_Y, -118.5, 'W');
    K.read(-38.8, 1.2, -125.2, { title: 'Notice at the Gangway', body: 'S.S. GRAY LADY — Eastern Coastwise Lines, Boston\nBuilt 1919, Hog Island, Pa. · 5,120 tons · Capt. R. T. Nickerson, Master\n\nDischarging: newsprint from Saint John, N.B., for the Courier; general cargo.\nSails Monday 6 A.M. for Portland & Halifax.\n\nNO VISITORS ABOARD WITHOUT A PASS FROM THE MATE.\n(The mate says: wipe your feet.)' }, { r: 2.2 });
  }
  // --- Pier 3: the fish-cleaning table
  {
    K.B(-9, 1, -42.5, -3, 3, -41.5, MAT.wood_post);
    K.B(-9.25, 3, -42.6, -2.75, 4, -41.4, MAT.stainless);
    K.B(-9.25, 4, -42.05, -2.75, 6, -41.95, MAT.wood_gray);
    K.B(-8.8, 1, -42.3, -8.3, 3, -41.7, MAT.wood_dark); K.B(-3.6, 1, -42.3, -3.1, 3, -41.7, MAT.wood_dark);
    for (const x of [-8.2, -6.2, -4.4]) K.P('fish_crate', x, 1.0, -42.25, 'S');
    K.P('seagull', -2.9, 1.0, -41.8, 'W'); K.P('seagull', -12, WALK_Y, -38, 'E');
    K.P('barrel', -10.5, WALK_Y, -44, 'S'); K.P('barrel', -10.5, WALK_Y, -40, 'N'); K.P('fish_crate', -11.5, WALK_Y, -42, 'E'); K.P('fish_crate', -1.5, WALK_Y, -44.5, 'W');
    const dw = [];
    for (const x of [-8.25, -6.75, -5.25, -3.75]) {
      dw.push(K.spot('stand', x, WALK_Y, -43.3, 'S', { act: 'counter', tags: ['dock_work'], label: 'Cleaning fish on Pier 3', lines: ['Haddock, haddock, cod — watch your thumbs.', 'Gulls are thick this morning.', 'Sal\'s boy is home. Did you hear?'] }));
      dw.push(K.spot('stand', x, WALK_Y, -40.7, 'N', { act: 'counter', tags: ['dock_work'], label: 'Cleaning fish on Pier 3' }));
    }
    const cut1 = K.spot('stand', -9.8, WALK_Y, -42, 'E', { act: 'counter', tags: ['work'] });
    const cut2 = K.spot('stand', -2.2, WALK_Y, -42, 'W', { act: 'counter', tags: ['work'] });
    const hose = K.spot('stand', -14, WALK_Y, -44, 'W', { act: 'mop', tags: ['work'] });
    K.b.job('fish cutter', [cut1, hose], { shift: ['6:00', '12:00'], outfit: 'fisherman', title: 'fish cutter' });
    K.b.job('fish cutter', [cut2, cut1], { shift: ['6:00', '12:00'], outfit: 'fisherman', title: 'fish cutter' });
    K.P('hb_plaque', -0.9, 1.2, -48.1, 'N');
    K.read(-0.9, 1.2, -47.4, { title: 'Pier 3', body: 'PIER 3\nRebuilt 1939\n\nThe old Pier 3 and its sheds were carried away by the sea\nin the hurricane of September 21, 1938.\n\nIn memory of\nERNEST DOANE, wharfinger, 51\nMANUEL FURTADO, fisherman, 29\nJOSEPH KOWALCZYK, 17\nwho stayed to cast off the boats.' }, { r: 2.2 });
    for (let x = -18; x > -56; x -= 9) K.P(rng.pick(['lobster_trap_stack', 'fish_crate', 'barrel', 'fishing_net_pile']), x, WALK_Y, -46.8, 'N');
    K.P('hb_net_rack', -52, WALK_Y, -37.4, 'S');
  }
  // --- Pier 4: harbour master's board, net racks, lobster gear, net menders
  {
    K.B(7.6, 1, 13.9, 7.85, 9, 14.15, MAT.wood_dark); K.B(7.6, 1, 16.35, 7.85, 9, 16.6, MAT.wood_dark);
    K.B(7.5, 4, 13.8, 7.75, 9, 16.7, MAT.wood_dark); K.B(7.4, 4.5, 14, 7.5, 8.5, 16.5, MAT.sign_cream);
    K.B(7.35, 9, 13.7, 7.9, 10, 16.8, MAT.roof_shingle_gray);
    K.P(textSignType('HARBOR MASTER', { bg: '#1f2f4f', fg: '#f0e2b0' }), 7.3, 2.3, 15.25, 'W', { scale: 0.8 });
    K.read(7.0, 1.4, 15.25, { title: 'Harbor Master\'s Board', html: '<b>PORT OF JUNIPER BAY — Saturday, September 26, 1953</b><br><br><b>TIDES</b> (Whitcomb Point)<br>High water 4:12 A.M. (9.8 ft) · 4:38 P.M. (10.1 ft)<br>Low water 10:24 A.M. (0.6 ft) · 10:51 P.M. (0.4 ft)<br>Sunrise 5:41 A.M. · Sunset 5:38 P.M.<br><br><b>WEATHER</b> Fair. Wind SW 8–12 kn, backing S tonight. Sea smooth. Visibility good.<br><br><b>NOTICE TO MARINERS</b><br>Centennial fireworks will be fired from a barge anchored off the inner harbor, 9:00–9:30 P.M. All vessels keep 200 yards clear. No anchoring in the inner harbor after 8 P.M.<br><br><b>IN PORT</b> S.S. GRAY LADY (Pier 2) — sails Monday 6 A.M.<br>Tug JUNIPER (Pier 2 south) on call — ring the office.<br><br>Moorings are NOT to be picked up without permission. — J. T. Hallett, Harbor Master' }, { r: 2.4 });
    K.P('hb_net_rack', -40, WALK_Y, 17.6, 'S'); K.P('hb_net_rack', -28, WALK_Y, 26.4, 'N');
    for (let x = -8; x > -46; x -= 6) K.P(x % 12 === 0 ? 'lobster_trap_stack' : 'lobster_trap_stack', x, WALK_Y, 26.3, 'N');
    K.P('hb_lobster_buoys', -12, WALK_Y, 17.6, 'S'); K.P('barrel', -20, WALK_Y, 17.8, 'S'); K.P('barrel', -21, WALK_Y, 18.6, 'S');
    const m1 = K.spot('sit', -33, WALK_Y, 19.6, 'N', { act: 'sew', tags: ['work'], seat: 0.4, label: 'Mending nets' });
    const m2 = K.spot('sit', -35.2, WALK_Y, 19.6, 'N', { act: 'sew', tags: ['work'], seat: 0.4, label: 'Mending nets' });
    K.P('crate', -33, WALK_Y, 20.1, 'N'); K.P('crate', -35.2, WALK_Y, 20.1, 'N'); K.P('fishing_net_pile', -34.1, WALK_Y, 18.4, 'S');
    K.b.job('net mender', [m1], { shift: ['7:00', '12:00'], outfit: 'fisherman', title: 'mending nets', age: [50, 80] });
    K.b.job('net mender', [m2], { shift: ['12:00', '17:00'], outfit: 'fisherman', title: 'mending nets', age: [50, 80] });
  }
  // --- Pier 5: the boat landing float, skiffs for hire
  {
    for (let k = 0; k < 5; k++) K.B(-12.5, -1 - k, 99 + 0.5 * k, -10.5, -k, 99.5 + 0.5 * k, MAT.dock_wood);
    K.B(-40, -5, 99.25, -8, -4, 101.75, MAT.dock_wood); K.B(-40, -6, 99.25, -8, -5, 101.75, MAT.wood_dark);
    K.B(-40, -4, 101.5, -8, -3, 101.75, MAT.wood_dark);
    for (const x of [-14, -21, -29, -37]) K.P('dock_cleat', x, -1.0, 101.4, 'S');
    const pn5 = K.nearest(-11.5, 94, 8);
    const f1 = K.node(-11.5, 98, WALK_Y), f2 = K.node(-11.5, 100.8, -1.0), f3 = K.node(-30, 100.6, -1.0);
    K.link(f1, pn5); K.link(f1, f2); K.link(f2, f3);
    // hire shack at the pier head
    K.B(-6, 1, 89.5, -3, 11, 92.5, MAT.shingle_wall); K.B(-5.75, 1, 89.75, -3.25, 11, 92.25, 0);
    K.B(-6.25, 11, 89.25, -2.75, 12, 92.75, MAT.roof_shingle_gray); K.B(-5.5, 5, 92.25, -3.5, 8, 92.5, 0); K.B(-5.5, 4, 92.5, -3.5, 5, 92.75, MAT.wood_mid);
    K.B(-3.25, 1, 90.25, -3, 9, 91.25, 0);
    const hr = K.room('Boat Hire Shack', -5.75, 1, 89.75, -3.25, 11, 92.25, { public: true });
    const pnh = K.nearest(-1.5, 94, 8);
    const hd = K.door(hr, null, -3.1, 1, 90.75); K.link(hd, pnh);
    K.P(textSignType('SKIFFS FOR HIRE 25 CENTS AN HOUR', { bg: '#f0ece2', fg: '#1f2f4f', border: '#1f2f4f' }), -4.5, 2.8, 92.8, 'S');
    const hs = K.spot('stand', -4.5, WALK_Y, 91.6, 'S', { room: hr, act: 'counter', tags: ['work'] });
    K.b.job('boat hire', hs, { shift: ['8:00', '17:00'], outfit: 'fisherman', title: 'hiring out skiffs' });
    K.spot('stand', -4.2, WALK_Y, 93.6, 'N', { act: 'talk', tags: ['customer', 'shop'] });
    K.P('hb_lobster_buoys', -7, WALK_Y, 89.6, 'S'); K.P('barrel', -8, WALK_Y, 89.8, 'S');
  }
  // --- Yacht club dock: flags, a signal mast at the end
  {
    const W = K.W, vx = V(-35), vz = V(165);
    W.box(vx, 1, vz, vx + 1, 48, vz + 1, MAT.trim_white); W.box(vx, 40, vz - 8, vx + 1, 41, vz + 9, MAT.trim_white);
    const cols = [MAT.sign_red, MAT.sign_yellow, MAT.sign_blue, MAT.trim_white, MAT.sign_green];
    const bunt = (a, b) => { const pts = lineVox(a, b); pts.forEach((p, i) => W.box(p[0], p[1], p[2], p[0] + 1, p[1] + 1, p[2] + 1, i % 3 === 2 ? MAT.iron : cols[Math.floor(i / 3) % cols.length])); };
    bunt([vx, 40, vz - 8], [vx + 60, 2, vz - 1]); bunt([vx, 40, vz + 8], [vx + 60, 2, vz + 2]); bunt([vx, 47, vz], [vx - 1, 2, vz - 30]);
    for (let x = -8; x > -34; x -= 6) { K.P('bollard', x, WALK_Y, 161.8, 'N'); K.P('bollard', x - 3, WALK_Y, 168.2, 'S'); }
  }
  void p1; void p2; void p3; void p4; void p5; void pyc;
}

// ---------------------------------------------------------------- the MARY ELLEN memorial
function buildMaryEllen(K, zc, quayNode) {
  const x0 = 2.5, x1 = 7.5, z0 = zc - 3, z1 = zc + 3;
  K.B(x0, 1, z0, x1, 2, z1, MAT.granite);                              // plinth
  K.B(x0 + 0.25, 1, z0 + 0.25, x1 - 0.25, 2, z1 - 0.25, MAT.grass_lawn);
  for (const [x, z] of [[x0, z0], [x1 - 0.25, z0], [x0, z1 - 0.25], [x1 - 0.25, z1 - 0.25], [x0, zc - 0.125], [x1 - 0.25, zc - 0.125]]) K.B(x, 2, z, x + 0.25, 5, z + 0.25, MAT.iron);
  K.B(x0, 4, z0, x0 + 0.25, 5, z1, MAT.iron); K.B(x1 - 0.25, 4, z0, x1, 5, z1, MAT.iron); K.B(x0, 4, z0, x1, 5, z0 + 0.25, MAT.iron); K.B(x0, 4, z1 - 0.25, x1, 5, z1, MAT.iron);
  K.B(x0, 2, zc - 0.75, x0 + 0.25, 5, zc + 0.75, 0);                   // opening in the chain on the sea side
  // stepped base and the stone
  K.B(3.5, 2, zc - 1.75, 6.25, 3, zc + 1.75, MAT.granite);
  K.B(3.75, 3, zc - 1.5, 6.0, 4, zc + 1.5, MAT.granite);
  K.B(4.25, 4, zc - 1.25, 5.25, 16, zc + 1.25, MAT.granite_pink);
  K.B(4.5, 16, zc - 1.0, 5.0, 17, zc + 1.0, MAT.granite_pink); K.B(4.5, 17, zc - 0.5, 5.0, 18, zc + 0.5, MAT.granite_pink);
  // carved anchor in relief at the top of the stone (west face)
  const W = K.W, fx = V(4.25) - 1, cz = V(zc);
  W.box(fx, 12, cz, fx + 1, 16, cz + 1, MAT.granite); W.box(fx, 15, cz - 1, fx + 1, 16, cz + 2, MAT.granite); W.box(fx, 12, cz - 2, fx + 1, 13, cz + 3, MAT.granite); W.box(fx, 13, cz - 2, fx + 1, 14, cz - 1, MAT.granite); W.box(fx, 13, cz + 2, fx + 1, 14, cz + 3, MAT.granite);
  K.P('hb_mary_ellen_plaque', 4.2, 1.15, zc, 'W');
  K.P('anchor', 3.1, 0.5, zc + 1.1, 'W'); K.P('vase_flowers', 3.3, 0.75, zc - 1.2, 'W', { tint: '#e8e0d0' }); K.P('flower_pot', 3.2, 0.5, zc - 0.6, 'W');
  K.read(3.4, 1.4, zc, { title: 'The MARY ELLEN Memorial', html: '<b>IN MEMORY OF THE CREW OF THE SCHOONER MARY ELLEN OF JUNIPER BAY</b><br>lost with all hands off Gannet Ledge in the Great Gale of October 1867<br><br>Capt. Josiah Dunmore, master, 41<br>Nathaniel Dunmore, his son, mate, 19<br>Samuel Whitcomb, 23<br>Ezra Coffin, 35<br>Thomas Pruitt, 28<br>John Hallett, 44<br>William Doane, 31<br>Patrick Flynn, 22<br>Benjamin Crowell, 38<br>Hiram Nickerson, cook, 52<br>Isaiah Snow, cabin boy, 14<br><br><i>The sea gave them not back, but we remember.</i><br>Raised by their widows, 1869.<br><br><small>On the second Sunday of October the eleven names are read aloud here, and a wreath is put out on the ebb. Somebody has already left fresh flowers for the Centennial.</small>' }, { r: 2.4 });
  const n = K.node(1.6, zc); K.link(n, quayNode);
  K.spot('stand', 2.0, WALK_Y, zc + 1.2, 'E', { act: 'pray', tags: ['memorial'], label: 'At the MARY ELLEN memorial', link: n });
}

// ============================================================ S.S. GRAY LADY (Pier 2, north side)
// Hull x -87..-9 m (bow west), z -140..-127 m. Main deck plate at voxel layer 11 (walk at 3.0 m),
// fo'c'sle and poop at 19, boat deck 22, bridge deck 32 (walk at 8.25 m).
function buildShip(ctx) {
  const b = siteBuilding(ctx, 'S.S. Gray Lady', 'ship', { x0: -87, z0: -140, x1: -9, z1: -127 }, { est: 1919, lore: 'Steam freighter of the Eastern Coastwise Lines, Boston, discharging newsprint at Pier 2.' });
  const K = new Kit(ctx, b), W = ctx.world;
  const X0 = -348, X1 = -36, ZC = -534, HB = 26;
  const hb = (vx) => {
    if (vx < -316) { const t = (vx - X0 + 0.5) / 32; return Math.max(1, Math.round(HB * (1 - Math.pow(1 - t, 1.9)))); }
    if (vx >= -64) { const t = (vx + 64 + 0.5) / 28; return Math.round(HB - 6 * t * t); }
    return HB;
  };
  const deckY = (vx) => (vx < -272 || vx >= -60) ? 19 : 11;
  const runs = []; let cur = null;
  for (let vx = X0; vx < X1; vx++) { const h = hb(vx), d = deckY(vx); if (cur && cur.h === h && cur.d === d) cur.x1 = vx + 1; else runs.push(cur = { x0: vx, x1: vx + 1, h, d }); }
  for (const r of runs) {
    W.box(r.x0, -16, ZC - r.h, r.x1, r.d, ZC + r.h, MAT.ship_black);
    W.box(r.x0, -9, ZC - r.h, r.x1, -4, ZC + r.h, MAT.ship_red);
    W.box(r.x0, r.d - 1, ZC - r.h, r.x1, r.d, ZC + r.h, MAT.ship_white);
    W.box(r.x0, r.d, ZC - r.h + 1, r.x1, r.d + 1, ZC + r.h - 1, MAT.wood_gray);
  }
  // bulwarks (closing the diagonal steps of the bow & stern)
  for (let vx = X0; vx < X1; vx++) {
    const h = hb(vx), d = deckY(vx), hm = Math.min(h, vx > X0 ? hb(vx - 1) : 0, vx < X1 - 1 ? hb(vx + 1) : 0);
    const top = d + 5;
    if (vx > X0 + 1 && vx < X1 - 1 && h === HB && hb(vx - 1) === HB && hb(vx + 1) === HB && deckY(vx - 1) === d && deckY(vx + 1) === d) continue;
    W.box(vx, d, ZC - h, vx + 1, top, ZC - hm + 1, MAT.ship_black); W.box(vx, d, ZC + hm - 1, vx + 1, top, ZC + h, MAT.ship_black);
  }
  for (const r of runs) if (r.h === HB && r.x1 - r.x0 > 2) { W.box(r.x0, r.d, ZC - HB, r.x1, r.d + 5, ZC - HB + 1, MAT.ship_black); W.box(r.x0, r.d, ZC + HB - 1, r.x1, r.d + 5, ZC + HB, MAT.ship_black); }
  W.box(X1 - 1, 19, ZC - hb(X1 - 1), X1, 24, ZC + hb(X1 - 1), MAT.ship_black);
  // gap in the bulwark for the gangway (south / pier side)
  W.box(-125, 11, ZC + HB - 1, -119, 17, ZC + HB, 0); W.box(-125, 11, ZC + HB - 1, -119, 12, ZC + HB, MAT.wood_gray);
  // breaks of the fo'c'sle and poop: white bulkheads with doors, and stairs up
  W.box(-273, 12, ZC - 25, -272, 19, ZC + 25, MAT.ship_white); W.box(-60, 12, ZC - 25, -59, 19, ZC + 25, MAT.ship_white);
  for (const z of [ZC - 8, ZC + 4]) { W.box(-272, 12, z, -271, 19, z + 4, MAT.trim_dark); W.box(-61, 12, z, -60, 19, z + 4, MAT.trim_dark); }
  for (const zs of [ZC + 15, ZC - 19]) for (let i = 0; i < 8; i++) {
    W.box(-258 - 2 * i, 12 + i, zs, -256 - 2 * i, 13 + i, zs + 4, MAT.steel);
    W.box(-76 + 2 * i, 12 + i, zs, -74 + 2 * i, 13 + i, zs + 4, MAT.steel);
  }
  // fo'c'sle: windlass, bitts, hawse pipes; the anchors hang at the bow
  W.box(-300, 20, ZC - 6, -292, 23, ZC + 6, MAT.trim_green); W.box(-299, 23, ZC - 4, -293, 24, ZC + 4, MAT.steel);
  for (const z of [ZC - 14, ZC + 12]) W.box(-316, 20, z, -314, 23, z + 2, MAT.ship_black);
  for (const z of [ZC - HB - 1, ZC + HB]) W.box(-334, 12, z, -330, 15, z + 1, MAT.trim_dark);
  K.P('anchor', -82.8, 1.4, -140.35, 'N'); K.P('anchor', -82.8, 1.4, -126.65, 'S');
  // portholes along the fo'c'sle and poop, the Plimsoll mark midships
  for (let vx = -312; vx < -276; vx += 6) for (const z of [ZC - HB, ZC + HB - 1]) W.box(vx, 14, z, vx + 1, 16, z + 1, MAT.glass_dark);
  for (let vx = -56; vx < -40; vx += 6) for (const z of [ZC - hb(vx), ZC + hb(vx) - 1]) W.box(vx, 14, z, vx + 1, 16, z + 1, MAT.glass_dark);
  for (const [z, o] of [[ZC - HB - 1, 0], [ZC + HB, 0]]) { void o; W.box(-240, -2, z, -234, -1, z + 1, MAT.ship_white); W.box(-238, -4, z, -236, 1, z + 1, MAT.ship_white); W.box(-244, 0, z, -230, 1, z + 1, MAT.ship_white); }
  // ---- the name, on both bows and the stern
  for (const side of ['N', 'S']) worldText(ctx, 'GRAY LADY', side, side === 'N' ? ZC - HB - 1 : ZC + HB, -292, 12, MAT.ship_white);
  worldText(ctx, 'GRAY LADY', 'E', X1, -ZC * -1, 12, MAT.ship_white);
  worldText(ctx, 'BOSTON', 'E', X1, -ZC * -1, 4, MAT.ship_white);
  // ---- hatches (hatch 3 open under the crane), masts, derricks, winches, ventilators
  const hatch = (a, bx, open) => {
    W.box(a, 12, ZC - 12, bx, 16, ZC + 12, MAT.steel);
    if (open) { W.box(a + 1, 1, ZC - 11, bx - 1, 16, ZC + 11, 0); W.box(a + 1, 0, ZC - 11, bx - 1, 1, ZC + 11, MAT.wood_dark); }
    else { W.box(a + 1, 16, ZC - 11, bx - 1, 17, ZC + 11, MAT.canvas_tan); for (let x = a + 4; x < bx - 2; x += 4) W.box(x, 16, ZC - 11, x + 1, 17, ZC + 11, MAT.awning_solid_green); W.box(a, 16, ZC - 12, bx, 17, ZC - 11, MAT.iron); W.box(a, 16, ZC + 11, bx, 17, ZC + 12, MAT.iron); }
  };
  hatch(-252, -228, false); hatch(-218, -196, false); hatch(-112, -92, true); hatch(-82, -66, false);
  for (const [x, z] of [[-26.9, -135.8], [-25.4, -135.6], [-26.4, -131.6], [-24.4, -132.0]]) K.P('paper_rolls', x, 0.0, z, 'E');
  K.P('crate_stack', -27.2, 0.0, -133.6, 'S');
  const mast = (x, top, cross, nest) => {
    W.box(x, 12, ZC - 1, x + 2, top, ZC + 1, MAT.trim_cream);
    W.box(x, cross, ZC - 12, x + 2, cross + 1, ZC + 12, MAT.trim_cream);
    W.box(x - 1, top, ZC - 2, x + 3, top + 1, ZC + 2, MAT.trim_black); W.box(x, top + 1, ZC - 1, x + 2, top + 2, ZC + 1, MAT.bulb_warm);
    if (nest) { wcyl(W, x + 1, ZC, 3.5, nest, nest + 1, MAT.ship_white); wcyl(W, x + 1, ZC, 3.5, nest + 1, nest + 4, MAT.ship_white, 1); }
    for (const s of [-1, 1]) { wline(W, [x + 1, cross, ZC + s * 12], [x + 1, 16, ZC + s * 25], MAT.iron); wline(W, [x + 1, cross, ZC + s * 12], [x - 5, 16, ZC + s * 25], MAT.iron); }
    W.box(x - 5, 12, ZC + 3, x - 1, 15, ZC + 8, MAT.trim_green); W.box(x + 3, 12, ZC - 8, x + 7, 15, ZC - 3, MAT.trim_green);
  };
  mast(-224, 104, 88, 74); mast(-90, 96, 82, 0);
  const derrick = (base, tip, mastTop) => { wline(W, base, tip, MAT.trim_cream); wline(W, tip, mastTop, MAT.iron); W.box(tip[0], tip[1] - 12, tip[2], tip[0] + 1, tip[1], tip[2] + 1, MAT.iron); W.box(tip[0] - 1, tip[1] - 14, tip[2] - 1, tip[0] + 2, tip[1] - 12, tip[2] + 2, MAT.steel); };
  derrick([-225, 17, ZC], [-244, 42, ZC], [-223, 86, ZC]); derrick([-222, 17, ZC], [-203, 40, ZC], [-223, 86, ZC]);
  derrick([-91, 17, ZC], [-104, 38, ZC], [-89, 80, ZC]); derrick([-88, 17, ZC], [-74, 36, ZC], [-89, 80, ZC]);
  wline(W, [-223, 104, ZC], [-346, 22, ZC], MAT.iron); wline(W, [-223, 100, ZC], [-89, 94, ZC], MAT.iron); wline(W, [-89, 96, ZC], [-40, 22, ZC], MAT.iron);
  for (const [x, z] of [[-268, ZC - 18], [-268, ZC + 16], [-120, ZC - 18], [-58, ZC + 16]]) { W.box(x, 12, z, x + 2, 20, z + 2, MAT.ship_white); W.box(x - 1, 19, z - 1, x + 3, 22, z + 3, MAT.ship_white); W.box(x, 20, z + 2, x + 2, 21, z + 3, MAT.trim_red); }
  // ---- midship house: A deck (12..21), boat deck (22), B deck (23..31), bridge deck (32), wheelhouse (33..41)
  W.box(-192, 12, -552, -140, 22, -516, MAT.ship_white);
  for (let vx = -190; vx < -142; vx += 5) for (const z of [-552, -517]) W.box(vx, 16, z, vx + 1, 18, z + 1, MAT.glass_dark);
  for (const z of [-552, -517]) W.box(-160, 12, z, -156, 20, z + 1, MAT.trim_dark);
  W.box(-196, 22, -556, -120, 23, -512, MAT.wood_gray);
  W.box(-196, 23, -556, -120, 24, -555, MAT.ship_white); W.box(-196, 23, -513, -120, 24, -512, MAT.ship_white);
  W.box(-121, 23, -556, -120, 26, -512, MAT.ship_white);
  for (let vx = -196; vx <= -120; vx += 8) { W.box(vx, 23, -556, vx + 1, 26, -555, MAT.ship_white); W.box(vx, 23, -513, vx + 1, 26, -512, MAT.ship_white); }
  W.box(-196, 25, -556, -120, 26, -555, MAT.ship_white); W.box(-196, 25, -513, -120, 26, -512, MAT.ship_white);
  for (const [x, z] of [[-122, -555], [-122, -514]]) W.box(x, 12, z, x + 1, 22, z + 1, MAT.ship_white);
  W.box(-192, 23, -548, -152, 32, -520, MAT.ship_white);
  for (let vx = -190; vx < -154; vx += 4) for (const z of [-548, -521]) W.box(vx, 26, z, vx + 2, 29, z + 1, MAT.glass_dark);
  W.box(-196, 32, -560, -148, 33, -508, MAT.wood_gray);
  W.box(-196, 33, -560, -148, 34, -559, MAT.ship_white); W.box(-196, 33, -509, -148, 34, -508, MAT.ship_white);
  W.box(-197, 33, -560, -196, 36, -508, MAT.ship_white);
  for (let vx = -196; vx <= -148; vx += 6) { W.box(vx, 33, -560, vx + 1, 36, -559, MAT.ship_white); W.box(vx, 33, -509, vx + 1, 36, -508, MAT.ship_white); }
  W.box(-196, 35, -560, -148, 36, -559, MAT.ship_white); W.box(-196, 35, -509, -148, 36, -508, MAT.ship_white);
  W.box(-197, 33, -561, -193, 36, -560, MAT.traffic_green); W.box(-197, 33, -508, -193, 36, -507, MAT.traffic_red);   // sidelights
  W.box(-192, 33, -548, -164, 42, -520, MAT.ship_white); W.box(-191, 33, -547, -165, 42, -521, 0);
  W.box(-193, 42, -549, -163, 43, -519, MAT.ship_white); W.box(-192, 43, -548, -164, 44, -520, MAT.ship_white);
  W.box(-192, 36, -546, -191, 40, -522, MAT.glass); for (let z = -546; z < -522; z += 5) W.box(-192, 36, z, -191, 40, z + 1, MAT.ship_white);
  for (const z of [-548, -521]) W.box(-190, 36, z, -176, 40, z + 1, MAT.glass);
  W.box(-176, 33, -521, -172, 41, -520, 0);                                        // door onto the south wing
  W.box(-183, 44, -536, -181, 47, -532, MAT.trim_gold);                            // standard compass on the monkey island
  // funnel
  wcyl(W, -134, ZC, 9, 23, 60, MAT.ship_red); wcyl(W, -134, ZC, 9, 50, 54, MAT.ship_white); wcyl(W, -134, ZC, 9, 60, 67, MAT.ship_black);
  wcyl(W, -134, ZC, 7, 64, 67, 0); W.box(-144, 56, ZC - 1, -142, 60, ZC + 1, MAT.trim_gold);
  // lifeboats in their davits
  for (const [x, z, d] of [[-47, -138.1, 'W'], [-38, -138.1, 'W'], [-47, -128.9, 'W'], [-38, -128.9, 'W']]) {
    K.P('rowboat', x, 6.0, z, d, { tint: '#f0ece2', scale: 1.25, cat: 'far' });
    for (const dx of [-2.1, 2.1]) { K.B(x + dx, 23, z < -133 ? -139 : -128.5, x + dx + 0.25, 31, z < -133 ? -138.75 : -128.25, MAT.ship_white); K.B(x + dx, 30, z < -133 ? -139 : -129, x + dx + 0.25, 31, z < -133 ? -137.75 : -128.25, MAT.ship_white); }
  }
  // stair: main deck (south side, aft of the house) up to the bridge deck (21 steps)
  for (let i = 0; i < 21; i++) {
    const xa = -128 - 2 * i;
    W.box(xa, 12 + i, -514, xa + 2, 13 + i, -510, MAT.steel);
    W.box(xa, 13 + i, -514, xa + 2, 23 + i, -510, 0);
  }
  for (let i = 0; i < 21; i += 3) W.box(-128 - 2 * i, 13 + i, -510, -127 - 2 * i, 17 + i, -509, MAT.ship_white);
  // gangway from the pier (11 steps of 0.75 m) alongside the hull
  for (let i = 0; i < 11; i++) W.box(-154 + 3 * i, 1 + i, -508, -151 + 3 * i, 2 + i, -505, MAT.wood_mid);
  for (let i = 0; i < 11; i += 2) W.box(-154 + 3 * i, 2 + i, -505, -153 + 3 * i, 6 + i, -504, MAT.iron);
  wline(W, [-154, 5, -505], [-121, 15, -505], MAT.iron);
  // ---- rooms, nav, crew
  const wh = K.vroom('Wheelhouse', -191, 33, -547, -165, 42, -521, { lightMode: 'auto', public: false, lightColor: [1, 0.9, 0.7] });
  K.P('ships_wheel_wall', -46.9, 8.25, -133.5, 'E'); K.P('desk_wood', -42.6, 8.25, -135.6, 'N'); K.P('radio_table', -42.3, 9.0, -135.8, 'N');
  K.P('clock_wall', -47.6, 9.6, -130.35, 'N'); K.P('telephone', -47.2, 8.25, -136.4, 'E');
  W.box(-184, 33, -535, -183, 37, -533, MAT.trim_gold); W.box(-185, 37, -536, -182, 38, -532, MAT.glass);   // binnacle
  W.box(-189, 33, -530, -188, 37, -529, MAT.steel); W.box(-190, 37, -531, -187, 39, -528, MAT.trim_gold);   // engine telegraph
  K.read(-43.2, 9.2, -135.2, { title: 'Log Book — S.S. Gray Lady', body: 'Sept. 25, 1953. 0610 made fast Pier 2, Juniper Bay, port side to. Wind SW light, sea calm.\n0800 commenced discharging No. 3 hatch. Newsprint in good order.\n1700 knocked off. 214 rolls discharged.\n\nSept. 26. 0600 resumed discharging. Town full of flags — a centennial.\nMaster ashore at the Harbor Master\'s. Crew liberty from 1800, back aboard by 2330\nor I\'ll know why. — R. Eldridge, Chief Mate' }, { r: 2 });
  const pierNode = K.nearest(-38.9, -118, 10);
  const gB = K.node(-38.9, -125.4, WALK_Y), gT = K.node(-30.6, -127.9, 3.0);
  K.link(gB, gT); K.link(gB, pierNode);
  const aft = K.path([[-30.6, -127.9, 3.0], [-24, -128.0, 3.0], [-19.5, -128.0, 3.0]], { step: 6 });
  const fwd = K.path([[-30.6, -127.9, 3.0], [-40, -128.0, 3.0], [-50, -128.0, 3.0], [-58, -128.0, 3.0], [-63.8, -128.0, 3.0]], { step: 6 });
  const poop = K.path([[-19.5, -128.0, 3.0], [-14.6, -129.2, 5.0], [-12, -133.5, 5.0]]); K.link(poop[0], aft[aft.length - 1]);
  const fcsl = K.path([[-63.8, -128.0, 3.0], [-68.4, -129.2, 5.0], [-75, -133.5, 5.0], [-82, -133.5, 5.0]]); K.link(fcsl[0], fwd[fwd.length - 1]);
  const sB = K.node(-31.8, -128.0, 3.0), sT = K.node(-42.3, -128.0, 8.25), wing = K.node(-43.5, -128.4, 8.25);
  K.link(sB, aft[0]); K.link(sB, sT); K.link(sT, wing);
  K.link(gT, aft[0]); K.link(gT, fwd[0]); K.link(aft[0], fwd[0]);
  K.link(K.door(wh, null, -43.5, 33, -130.1, { wall: 'x' }), wing);
  const watch = K.spot('stand', -30.2, 3.0, -128.6, 'S', { act: 'smoke_pipe', tags: ['work'], label: 'Standing gangway watch', link: gT, lines: ['Pass, please. Mate\'s orders.', 'Newsprint for the Courier. Two hundred tons of it.', 'Liberty at six. First beer in Juniper Bay is on me.'] });
  b.job('watchman', watch, { shift: ['6:00', '14:00'], outfit: 'sailor', title: 'gangway watch' });
  const watch2 = K.spot('stand', -30.2, 3.0, -129.2, 'S', { act: 'stand', tags: ['work'], link: gT });
  b.job('watchman', watch2, { shift: ['14:00', '23:30'], outfit: 'sailor', title: 'gangway watch' });
  const dh1 = K.spot('stand', -55, 3.0, -128.3, 'S', { act: 'paint', tags: ['work'], label: 'Chipping and painting' });
  const dh2 = K.spot('stand', -21.4, 3.0, -128.3, 'N', { act: 'sweep', tags: ['work'] });
  const dh3 = K.spot('stand', -70, 5.0, -133.5, 'W', { act: 'wrench', tags: ['work'] });
  b.job('deckhand', [dh1, dh3], { shift: ['7:00', '16:00'], outfit: 'sailor' });
  b.job('deckhand', [dh2, dh1], { shift: ['7:00', '16:00'], outfit: 'sailor' });
  const mw = K.spot('stand', -46.2, 8.25, -133.5, 'W', { room: wh, act: 'look', tags: ['work'] });
  const mc = K.spot('sit', -42.6, 8.25, -134.5, 'S', { room: wh, act: 'write', tags: ['work'], seat: 0.46 });
  K.P('chair_office', -42.6, 8.25, -134.5, 'S');
  b.job('mate', [mc, mw], { shift: ['8:00', '17:00'], outfit: 'sailor', title: 'chief mate' });
  // lights: masthead, gangway, deck floods
  K.light(-33, 5, -127, { color: [1, 0.85, 0.6], radius: 10, mode: 'night' });
  K.light(-60, 7, -133.5, { color: [1, 0.85, 0.6], radius: 14, mode: 'night' });
  K.light(-45, 10, -133.5, { color: [1, 0.85, 0.6], radius: 6, mode: 'room', room: wh });
  finishSite(b);
}

// ============================================================ the yellow gantry crane on Pier 2
function buildCrane(ctx) {
  const W = ctx.world, Y = MAT.crane_yellow, S = MAT.steel;
  // crane rails let into the pier deck
  W.box(V(-88), 0, -497, V(-1), 1, -496, MAT.rail_steel); W.box(V(-88), 0, -447, V(-1), 1, -446, MAT.rail_steel);
  const legs = [[-116, -498], [-86, -498], [-116, -448], [-86, -448]];
  for (const [x, z] of legs) {
    W.box(x - 1, 1, z - 1, x + 4, 3, z + 4, S); W.box(x - 1, 1, z - 2, x + 4, 2, z - 1, MAT.trim_black); W.box(x - 1, 1, z + 4, x + 4, 2, z + 5, MAT.trim_black);
    for (const [dx, dz] of [[0, 0], [2, 0], [0, 2], [2, 2]]) W.box(x + dx, 3, z + dz, x + dx + 1, 45, z + dz + 1, Y);
    for (let y = 5, k = 0; y < 45; y += 4, k++) {
      W.box(x, y, z, x + 3, y + 1, z + 1, Y); W.box(x, y, z + 2, x + 3, y + 1, z + 3, Y); W.box(x, y, z, x + 1, y + 1, z + 3, Y); W.box(x + 2, y, z, x + 3, y + 1, z + 3, Y);
      const o = k % 2 ? 1 : 2; W.box(x + 1, y + o, z, x + 2, y + o + 1, z + 1, Y); W.box(x + 1, y + o, z + 2, x + 2, y + o + 1, z + 3, Y); W.box(x, y + 3 - o, z + 1, x + 1, y + 4 - o, z + 2, Y); W.box(x + 2, y + 3 - o, z + 1, x + 3, y + 4 - o, z + 2, Y);
    }
  }
  // portal girders (Warren trusses) along x and z
  const trussX = (xa, xb, z) => {
    for (const dz of [0, 2]) { W.box(xa, 44, z + dz, xb, 45, z + dz + 1, Y); W.box(xa, 48, z + dz, xb, 49, z + dz + 1, Y);
      for (let x = xa; x < xb; x += 4) { W.box(x, 45, z + dz, x + 1, 48, z + dz + 1, Y); for (let k = 1; k < 4; k++) W.box(x + k, 44 + k, z + dz, x + k + 1, 45 + k, z + dz + 1, Y); } }
  };
  const trussZ = (za, zb, x) => {
    for (const dx of [0, 2]) { W.box(x + dx, 44, za, x + dx + 1, 45, zb, Y); W.box(x + dx, 48, za, x + dx + 1, 49, zb, Y);
      for (let z = za; z < zb; z += 4) { W.box(x + dx, 45, z, x + dx + 1, 48, z + 1, Y); for (let k = 1; k < 4; k++) W.box(x + dx, 44 + k, z + k, x + dx + 1, 45 + k, z + k + 1, Y); } }
  };
  trussX(-116, -83, -498); trussX(-116, -83, -448); trussZ(-498, -445, -116); trussZ(-498, -445, -86);
  W.box(-113, 48, -495, -86, 49, -448, S);
  // slewing ring, machinery house, counterweight, cab
  wcyl(W, -100, -472, 11, 49, 50, MAT.trim_black);
  W.box(-114, 50, -484, -86, 61, -458, Y); W.box(-115, 61, -485, -85, 62, -457, S);
  for (let x = -112; x < -88; x += 5) for (const z of [-485, -458]) W.box(x, 55, z, x + 3, 58, z + 1, MAT.glass_dark);
  W.box(-114, 50, -472, -113, 58, -468, MAT.trim_dark);
  W.box(-111, 50, -458, -89, 57, -452, MAT.concrete_dark);
  W.box(-107, 50, -492, -93, 58, -484, Y); W.box(-106, 52, -493, -94, 57, -492, MAT.glass); W.box(-107, 52, -490, -106, 57, -486, MAT.glass); W.box(-94, 52, -490, -93, 57, -486, MAT.glass);
  W.box(-108, 58, -493, -92, 59, -483, S);
  worldText(ctx, 'NO. 2', 'E', -86, -471, 52, MAT.sign_black); worldText(ctx, 'NO. 2', 'W', -115, -471, 52, MAT.sign_black);
  // A-frame and the luffing jib
  wline(W, [-112, 62, -468], [-100, 78, -474], S); wline(W, [-88, 62, -468], [-100, 78, -474], S); wline(W, [-100, 62, -460], [-100, 78, -474], S);
  const A = [-104, 51, -490], B = [-96, 51, -490], C = [-104, 55, -488], D = [-96, 55, -488];
  const tA = [-103, 85, -534], tB = [-101, 85, -534], tC = [-103, 87, -533], tD = [-101, 87, -533];
  const lerp3 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  wline(W, A, tA, Y); wline(W, B, tB, Y); wline(W, C, tC, Y); wline(W, D, tD, Y);
  for (let i = 1; i < 10; i++) {
    const t = i / 10, t2 = (i + 0.5) / 10;
    wline(W, lerp3(A, tA, t), lerp3(B, tB, t), Y); wline(W, lerp3(C, tC, t), lerp3(D, tD, t), Y);
    wline(W, lerp3(A, tA, t), lerp3(C, tC, t2), Y); wline(W, lerp3(B, tB, t), lerp3(D, tD, t2), Y);
  }
  W.box(-104, 84, -536, -100, 88, -532, S);
  wline(W, [-100, 78, -474], [-102, 88, -533], MAT.iron);
  // the fall, the hook block and a sling of newsprint coming out of No. 3 hatch
  W.box(-102, 50, -534, -101, 84, -533, MAT.iron); W.box(-103, 47, -535, -100, 50, -532, MAT.trim_black); W.box(-102, 45, -534, -101, 47, -533, MAT.iron);
  wline(W, [-102, 45, -534], [-106, 38, -538], MAT.iron); wline(W, [-101, 45, -533], [-97, 38, -529], MAT.iron);
  ctx.props.add('paper_rolls', -25.4, 8.6, -133.4, 0.3, {}); ctx.props.add('cargo_pallet', -25.4, 8.4, -133.4, 0.3, {});
  ctx.props.add(textSignType('SAFE WORKING LOAD 10 TONS', { bg: '#1c1c1c', fg: '#e0b030', border: '#1c1c1c' }), -25, 12.9, -121.3, Math.PI, {});
}


// ============================================================ WATERFRONT SHEDS (lots x 20..44 m, facing E onto Harbor St)
const SHED_CFG = {
  'Pier 1 Freight Shed': { type: 'freight', outer: 'brick_red', roof: 'roof_tar', trim: 'trim_green', letters: 'sign_white', title: 'PIER 1', sub: 'FREIGHT', side: ['B. & J.B. R.R.', 'FREIGHT HOUSE'], est: 1872, hours: [7 * 60, 17 * 60],
    lore: 'The Boston & Juniper Bay Railroad\'s freight house, built the year the line came through.' },
  'Bayside Ice & Cold Storage': { type: 'ice', outer: 'brick_yellow', flat: true, trim: 'trim_blue', letters: 'sign_navy', title: 'BAYSIDE ICE', sub: 'COLD STORAGE', side: ['ICE', 'COLD STORAGE'], inner: 'plaster_white', hours: [6 * 60, 18 * 60],
    lore: 'Ice for the fleet and every icebox on Maple Street since 1912.' },
  'Pier 2 Cargo Shed': { type: 'cargo', outer: 'siding_gray', roof: 'roof_tar_light', trim: 'trim_red', letters: 'sign_red', title: 'PIER 2', sub: 'CARGO', side: ['EASTERN COASTWISE', 'LINES'], hours: [6 * 60, 18 * 60],
    lore: 'Transit shed of the Eastern Coastwise Lines: Boston, Portland, Halifax.' },
  'Castellano Fish Co.': { type: 'fish', outer: 'shingle_wall', roof: 'roof_shingle_gray', trim: 'trim_red', letters: 'sign_white', board: 'sign_green', title: 'CASTELLANO', sub: 'FISH CO.', side: ['FRESH FISH', 'WHOLESALE'], inner: 'plaster_white', floor: 'dock_wood', hours: [5 * 60, 14 * 60],
    lore: 'Founded 1894 by Giuseppe Castellano of Sciacca, Sicily, with one dory. Three boats now, every one blessed by Father Garrity.' },
  'Pier 3 Sheds': { type: 'gear', outer: 'siding_red', roof: 'roof_shingle_black', trim: 'trim_white', letters: 'sign_white', title: 'PIER 3', sub: 'NETS & GEAR', side: ['NET LOFT'], est: 1939, hours: [6 * 60, 17 * 60],
    lore: 'Rebuilt in 1939 after the hurricane carried the old Pier 3 sheds away.' },
  'Bayside Boat Works': { type: 'boats', outer: 'shingle_wall', roof: 'roof_shingle_brown', trim: 'trim_white', letters: 'sign_white', board: 'sign_navy', title: 'BAYSIDE', sub: 'BOAT WORKS', side: ['DORIES - SKIFFS', 'REPAIRS'], est: 1888, floor: 'floor_pine', H: 32, doorW: 20, doorH: 20, hours: [7 * 60, 17 * 60],
    lore: 'Builders of the Juniper Bay dory since 1888. "Rows like a dream, carries like a mule."' },
  'Pier 5 Sheds': { type: 'bait', outer: 'siding_green', roof: 'roof_shingle_gray', trim: 'trim_white', letters: 'sign_white', title: 'PIER 5', sub: 'BAIT & BOATS', side: ['BAIT', 'SKIFFS'], hours: [5 * 60, 17 * 60],
    lore: 'Herring, clams and sea worms for bait; skiffs stored for the winter.' },
};

function buildShed(ctx, lot, spec) {
  if (spec.harbormaster) return buildHarborMaster(ctx, lot, spec);
  if (spec.yacht) return buildYachtClub(ctx, lot, spec);
  const cfg = SHED_CFG[spec.name] || { type: spec.kind === 'fishhouse' ? 'fish' : 'cargo', outer: 'brick_red', roof: 'roof_tar', trim: 'trim_green', letters: 'sign_white', title: (spec.name || 'WAREHOUSE').toUpperCase().split(' ').slice(0, 2).join(' '), side: [] };
  const b = new Building(ctx, { name: spec.name, kind: spec.kind, lot, address: lot.address, established: spec.est || cfg.est || null, lore: cfg.lore || null, hours: cfg.hours || [6 * 60, 18 * 60] });
  const f = b.f, rng = ctx.rng.fork('shed' + lot.z);
  const W = lot.w, D = lot.d;
  const outer = MAT[cfg.outer], trim = MAT[cfg.trim], roof = MAT[cfg.roof || 'roof_tar'], inner = cfg.inner ? MAT[cfg.inner] : outer;
  const bx = 2, bw = W - 4, bz = 4, bd = D - 4, H = cfg.H || 30;
  const X0 = bx + 2, Z0 = bz + 2, IW = bw - 4, ID = bd - 4;
  // ---- ground, shell, roof
  f.box(0, -1, 0, W, 1, D, MAT.cobble); f.box(0, -1, 0, W, 1, bz, MAT.concrete);
  shell(f, bx, 0, bz, bw, H, bd, outer, inner, 2);
  f.walls(bx, 0, bz, bw, 2, bd, MAT.granite, 1);
  slab(f, bx + 2, 0, bz + 2, bw - 4, bd - 4, MAT[cfg.floor || 'floor_concrete']);
  if (cfg.flat) {
    flatRoof(f, bx, H, bz, bw, bd, { parapetMat: outer, coping: trim, parapetH: 3 });
    f.box(bx + bw / 2 - 30, H + 1, bz - 1, 60, 9, 1, outer); f.box(bx + bw / 2 - 31, H + 10, bz - 2, 62, 1, 2, trim);  // false front for the sign
  } else {
    lowGable(f, bx, H, bz, bw, bd, roof, outer, 2, 2);
    f.box(bx - 2, H - 1, bz - 2, bw + 4, 1, 1, trim); f.box(bx - 2, H - 1, bz + bd + 1, bw + 4, 1, 1, trim);
    for (let x = bx + 12; x < bx + bw - 10; x += 26) { f.box(x, H + 12, bz + 20, 6, 4, 6, MAT.steel); f.box(x - 1, H + 16, bz + 19, 8, 1, 8, MAT.steel); }   // roof ventilators
  }
  // ---- the 1938 high-water line all the way round (6 ft above the street)
  f.walls(bx, 6, bz, bw, 1, bd, MAT.sign_navy, 1);
  // ---- openings: big sliding doors front & back, an office door and windows
  const officeW = 20, dW = cfg.doorW || 16, dH = cfg.doorH || 18;
  const dx = Math.round(X0 + (IW - officeW - dW) / 2);
  const leafMat = cfg.type === 'fish' || cfg.type === 'boats' ? MAT.trim_red : cfg.type === 'ice' ? MAT.trim_blue : MAT.wood_mid;
  f.carve(dx, 1, bz, dW, dH, 2); slidingLeaf(f, dx, bz, dW, dH, trim, leafMat, true);
  f.carve(dx, 1, bz + bd - 2, dW, dH, 2);
  const Bk = f.faceFrame('back');
  slidingLeaf(Bk, W - dx - dW, D - (bz + bd), dW, dH, trim, leafMat, false);
  const ox0 = X0 + IW - officeW, oz1 = Z0 + 16;
  win(f, ox0 + 2, 4, bz, 8, 6, { frame: trim, t: 2, style: 'cross' });
  doorway(f, ox0 + 14, 1, bz, 4, 9, { frame: trim, t: 2, step: false });
  const L = f.faceFrame('left'), Rt = f.faceFrame('right');
  for (let zm = bz + 10; zm < bz + bd - 12; zm += 14) { win(L, D - zm - 4, 12, bx, 4, 6, { frame: trim, t: 2 }); win(Rt, zm, 12, W - (bx + bw), 4, 6, { frame: trim, t: 2 }); }
  for (let xm = X0 + 4; xm < X0 + IW - 6; xm += 14) if (xm + 4 < dx - 2 || xm > dx + dW + 2) win(Bk, W - xm - 4, 10, D - (bz + bd), 4, 6, { frame: trim, t: 2 });
  // ---- lettering: title over the big door, sub on the gable (or false front), painted side walls
  const lt = MAT[cfg.letters];
  const tw = f.textWidth(cfg.title, 1, 'big');
  if (cfg.board) f.box(Math.round(bx + bw / 2 - tw / 2) - 3, dH + 3, bz - 1, tw + 6, 11, 1, MAT[cfg.board]);
  f.text(cfg.title, bx + bw / 2, dH + 5, bz - (cfg.board ? 2 : 1), lt, { align: 'center' });
  if (cfg.sub) f.text(cfg.sub, bx + bw / 2, cfg.flat ? H + 3 : H + 2, bz - 1, cfg.flat ? MAT[cfg.letters] : lt, { align: 'center', font: 'small' });
  (cfg.side || []).forEach((t, i) => {
    const big = Rt.textWidth(t, 1, 'big') < bd - 10;
    Rt.text(t, bz + bd / 2, H - 10 - i * 9, W - (bx + bw) - 1, lt, { align: 'center', font: big ? 'big' : 'small' });
    const bigL = L.textWidth(t, 1, 'big') < bd - 10;
    L.text(t, D - (bz + bd / 2), H - 10 - i * 9, bx - 1, lt, { align: 'center', font: bigL ? 'big' : 'small' });
  });
  if (cfg.est) { f.box(bx + 3, 2, bz - 1, 10, 4, 1, MAT.granite); f.text(String(cfg.est), bx + 8, 2, bz - 2, MAT.trim_cream, { align: 'center', font: 'small' }); }
  const hwt = textSignType('HIGH WATER SEPT. 21 1938', { bg: '#e9e4d6', fg: '#1f2f4f', border: '#1f2f4f', scale: 1 / 28 });
  f.prop(hwt, dx - 12, 7, bz - 0.15, 0); Bk.prop(hwt, W - dx + 10, 7, D - (bz + bd) - 0.15, 0);
  b.readable(dx - 12, 7, bz - 0.5, { title: 'High-Water Mark, 1938', body: 'HIGH WATER — SEPT. 21, 1938\n\nThe blue line painted round this building marks where the sea stood at ten past four in the afternoon of the Great Hurricane: six feet over Harbor Street. Pier 3 went out with the tide, and three men with it.\n\nThe line is repainted every spring. Nobody has ever suggested otherwise.' }, { r: 2.4 });
  // ---- rooms, doors, nav
  partitionZ(f, Z0, oz1 + 1, 1, ox0 - 1, 11, MAT.wood_panel_light, [{ at: Z0 + 10, w: 4 }]);
  partitionX(f, ox0 - 1, X0 + IW, 1, oz1, 11, MAT.wood_panel_light, []);
  f.box(ox0 - 1, 12, Z0, officeW + 1, 1, oz1 - Z0 + 1, MAT.wood_dark);
  const hallName = { freight: 'Freight Floor', ice: 'Ice Room', cargo: 'Transit Shed', fish: 'Packing Floor', gear: 'Gear Store', boats: 'Boat Shop', bait: 'Bait Shed' }[cfg.type] || 'Warehouse Floor';
  const hall = b.room(hallName, X0, 1, Z0, IW, H - 1, ID, { lightMode: cfg.type === 'fish' ? 'always' : 'auto', public: true, lightColor: cfg.type === 'ice' ? [0.8, 0.9, 1.0] : undefined, nav: [dx + dW / 2, Z0 + ID / 2] });
  const office = b.room(cfg.type === 'ice' ? 'Ice Office' : 'Office', ox0, 1, Z0, officeW, 11, oz1 - Z0, { lightMode: 'auto', public: true });
  b.door(hall, office, ox0 - 1, 1, Z0 + 12, { axis: 'z' });
  b.entrance(hall, dx + dW / 2, 1, bz, { outZ: bz - 7, leaf: false, width: dW, main: true });
  b.entrance(office, ox0 + 16, 1, bz, { outZ: bz - 6, leaf: 'door_wood', tint: rng.pick(['#2a4a3a', '#6a2a24', '#2a3a5a']) });
  b.entrance(hall, dx + dW / 2, 1, bz + bd - 1, { outZ: D + 4, inside: -3, leaf: false, width: dW });
  const aisle = b.navPoint(hall, dx + dW / 2, 1, Z0 + 4); b.navPoint(hall, dx + dW / 2, 1, Z0 + ID - 4, [aisle]);
  // hanging lamps over the aisle
  for (let zz = Z0 + 12; zz < Z0 + ID - 6; zz += 26) {
    f.box(dx + dW / 2, H - 4, zz, 1, 3, 1, MAT.iron); f.box(dx + dW / 2 - 1, H - 5, zz - 1, 3, 1, 3, MAT.trim_green); f.box(dx + dW / 2, H - 6, zz, 1, 1, 1, MAT.bulb_warm);
    b.light(dx + dW / 2 + 0.5, H - 7, zz + 0.5, { mode: 'room', room: hall, radius: 12, color: cfg.type === 'ice' ? [0.8, 0.9, 1.0] : [1, 0.85, 0.6] });
  }
  b.light(dx + dW / 2, dH + 3, bz - 2, { mode: 'night', radius: 8 }); b.light(dx + dW / 2, dH + 3, bz + bd + 2, { mode: 'night', radius: 8 });
  // ---- the office
  const desk = officeDesk(b, office, ox0 + 7, 1, Z0 + 9, 0, {});
  f.prop('filing_cabinet', ox0 + officeW - 2, 1, Z0 + 1.5, 2, {}); f.prop('coat_rack', ox0 + 2, 1, oz1 - 2, 0, {});
  f.prop('clock_wall', ox0 + 10, 7, oz1 - 0.6, 2, {}); f.prop('office_water_cooler', ox0 + officeW - 2, 1, oz1 - 2, 3, {});
  f.prop('calendar_wall', ox0 + 4, 6, oz1 - 0.6, 2, {});
  // ---- the hall, by trade
  const keep = (x, z) => (x < dx - 3 || x > dx + dW + 3) && !(x > ox0 - 5 && z < oz1 + 4);
  const work = [];
  const cargo = (items, zStep = 8) => {
    let n = 0;
    for (let zz = Z0 + 5; zz < Z0 + ID - 5; zz += zStep) for (const xx of [X0 + 4, X0 + 10, dx - 6, dx + dW + 6, X0 + IW - 10, X0 + IW - 4]) {
      if (!keep(xx, zz) || n > 34) continue;
      f.prop(rng.pick(items), xx, 1, zz + rng.float(-1, 1), rng.int(0, 3), { tint: rng.pick(['#8a6a44', '#6a5a3a', '#7a4a2a']) }); n++;
    }
  };
  const T = cfg.type;
  if (T === 'freight' || T === 'cargo') {
    cargo(T === 'freight' ? ['crate_stack', 'sack_pile', 'barrel_stack', 'cargo_pallet', 'crate', 'trunk'] : ['crate_stack', 'cargo_pallet', 'paper_rolls', 'sack_pile', 'oil_drum', 'crate_stack']);
    f.box(X0 + 4, 0, Z0 + ID - 18, 10, 1, 10, MAT.iron); f.box(X0 + 3, 1, Z0 + ID - 19, 1, 9, 1, MAT.iron); f.box(X0 + 2, 9, Z0 + ID - 19, 3, 3, 1, MAT.clock_face);   // platform scale
    f.prop('luggage_cart', dx + dW / 2 + 3, 1, Z0 + ID - 10, 1, {}); f.prop('wheelbarrow', dx - 2, 1, Z0 + 14, 2, {});
    work.push(b.spot('stand', dx + dW / 2 - 2, 1, Z0 + 20, 3, { room: hall, act: 'carry', tags: ['work'] }), b.spot('stand', dx + dW / 2 + 2, 1, Z0 + ID - 8, 1, { room: hall, act: 'carry', tags: ['work'] }), b.spot('stand', X0 + 8, 1, Z0 + ID - 14, 2, { room: hall, act: 'write', tags: ['work'] }));
    b.job(T === 'freight' ? 'freight clerk' : 'cargo checker', desk, { shift: ['7:00', '12:00'], outfit: 'clerk' });
    b.job(T === 'freight' ? 'freight handler' : 'stevedore', [work[0], work[1]], { shift: ['6:00', '12:00'], outfit: 'dock' });
    b.job(T === 'freight' ? 'freight handler' : 'stevedore', [work[1], work[2]], { shift: ['6:00', '12:00'], outfit: 'dock' });
    b.job(T === 'freight' ? 'freight handler' : 'stevedore', [work[0], work[2]], { shift: ['12:00', '18:00'], outfit: 'dock' });
    b.readable(ox0 + 7, 5, Z0 + 8.5, T === 'freight'
      ? { title: 'Freight Notice', body: 'BOSTON & JUNIPER BAY RAILROAD — FREIGHT HOUSE, PIER 1\n\nFreight received 7 A.M. to 5 P.M.; Saturdays until noon.\nL.C.L. shipments for Boston by the 4:52.\nFish in iced barrels must be at the platform by 3 P.M.\nPerishables at owner\'s risk.\n\nC. W. Pruitt, Agent' }
      : { title: 'Cargo Manifest', body: 'EASTERN COASTWISE LINES — S.S. GRAY LADY, from Saint John, N.B.\n\n412 rolls newsprint, 32-inch — consignee: The Juniper Bay Courier\n60 bbls. salt — Castellano Fish Co.\n14 cases machine parts — Harbor Canning Co.\n2 crates "household goods, FRAGILE" — Mrs. E. Pemberton\n1 upright piano — Bishop Music Co.\n\nChecked: 214 rolls Friday. The rest today, God and the crane willing.' }, { r: 2 });
  } else if (T === 'ice') {
    for (let zz = Z0 + 4; zz < Z0 + ID - 8; zz += 14) for (const xx of [X0 + 2, X0 + IW - 14]) {
      if (!keep(xx + 6, zz)) continue;
      f.box(xx, 1, zz, 12, 8, 10, MAT.glass); f.box(xx, 9, zz, 12, 1, 10, MAT.sand); f.box(xx, 5, zz, 12, 1, 10, MAT.sand);
    }
    f.box(X0, 0, Z0, IW, 1, ID, MAT.sand);
    f.prop('hb_ice_blocks', dx + dW / 2 - 3, 1, Z0 + 10, 0, {}); f.prop('hb_ice_blocks', dx + dW / 2 + 3, 1, Z0 + ID - 12, 1, {});
    // the ice chute down to the service lane on the water side
    for (let k = 0; k < 7; k++) { Bk.box(W - dx - dW - 6, 11 - k, -1 - k, 4, 1, 1, MAT.wood_mid); Bk.box(W - dx - dW - 7, 12 - k, -1 - k, 1, 1, 1, MAT.wood_dark); Bk.box(W - dx - dW - 2, 12 - k, -1 - k, 1, 1, 1, MAT.wood_dark); }
    Bk.carve(W - dx - dW - 6, 11, 0, 4, 4, 2);
    work.push(b.spot('stand', dx + dW / 2, 1, Z0 + 8, 0, { room: hall, act: 'carry', tags: ['work'] }), b.spot('stand', dx + dW / 2, 1, Z0 + ID - 6, 2, { room: hall, act: 'carry', tags: ['work'] }));
    const c = counterRun(b, office, ox0 + 2, ox0 + 16, 1, Z0 + 5, { rot: 0, register: true });
    b.job('iceman', work, { shift: ['6:00', '12:00'], outfit: 'dock' });
    b.job('iceman', [work[1], work[0]], { shift: ['6:00', '12:00'], outfit: 'dock' });
    b.job('ice clerk', c.clerk, { shift: ['7:00', '13:00'], outfit: 'clerk' });
    b.customerSpots = [c.customer];
    b.readable(ox0 + 8, 5, Z0 + 4.5, { title: 'Ice Prices', body: 'BAYSIDE ICE & COLD STORAGE — Est. 1912\n\n25 lb. cake ... 10¢\n50 lb. cake ... 20¢\n100 lb. cake ... 35¢\nCrushed, by the barrel ... 60¢\n\nFishing vessels iced at the pier — see the office.\nHome delivery Mon.–Sat. (Maple, Church & Orchard Streets before 9 A.M.)\n\nPlease ask about our REFRIGERATORS. The ice box has had a good long run.' }, { r: 2.2 });
  } else if (T === 'fish') {
    fishHouse(b, f, hall, office, { X0, Z0, IW, ID, dx, dW, dH, bz, bd, H, ox0, oz1, rng, work });
  } else if (T === 'gear') {
    gearLoft(b, f, hall, { X0, Z0, IW, ID, dx, dW, H, ox0, oz1, rng, keep });
    b.job('gear clerk', desk, { shift: ['7:00', '12:00'], outfit: 'clerk' });
  } else if (T === 'boats') {
    boatShop(b, f, hall, { X0, Z0, IW, ID, dx, dW, H, rng, keep });
    b.job('bookkeeper', desk, { shift: ['8:00', '12:00'], outfit: 'clerk', days: 'weekday' });
  } else if (T === 'bait') {
    cargo(['barrel', 'barrel_stack', 'fish_crate', 'lobster_trap_stack', 'crate'], 10);
    for (let zz = Z0 + 30; zz < Z0 + ID - 6; zz += 9) for (const [xx, r] of [[X0 + 6, 1], [X0 + IW - 6, 3]]) { f.box(xx - 3, 6, zz - 3, 6, 1, 1, MAT.wood_dark); f.box(xx - 3, 6, zz + 3, 6, 1, 1, MAT.wood_dark); f.prop('rowboat', xx, 7, zz, r, { tint: rng.pick(['#e8e0d0', '#3a5a7a', '#8a3a2a', '#2a4a3a']) }); f.prop('rowboat', xx, 1, zz, r, { tint: rng.pick(['#e8e0d0', '#6a8a5a', '#2a3a5a']) }); }
    const c = counterRun(b, office, ox0 + 2, ox0 + 16, 1, Z0 + 5, { rot: 0 });
    f.prop('barrel', ox0 + 4, 1, Z0 + 2, 0, {}); f.prop('fish_crate', ox0 + 10, 1, Z0 + 2, 0, {});
    b.job('bait seller', c.clerk, { shift: ['5:00', '13:00'], outfit: 'fisherman' });
    b.customerSpots = [c.customer];
    work.push(b.spot('stand', dx + dW / 2, 1, Z0 + ID - 10, 2, { room: hall, act: 'carry', tags: ['work'] }));
    b.job('boat man', work, { shift: ['8:00', '16:00'], outfit: 'fisherman' });
    b.readable(ox0 + 9, 5, Z0 + 4.5, { title: 'Bait Board', body: 'PIER 5 — BAIT & BOATS\n\nFresh herring ... 15¢ doz.\nClams (for bait) ... 25¢ qt.\nSea worms ... 30¢ doz.\nSalted pogies, by the barrel — ask\n\nSkiffs stored for the winter: $6 the season.\nOars NOT included. Oars are NEVER included.' }, { r: 2.2 });
  }
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// a sliding door leaf parked beside an opening (in frame f, opening x..x+w on the wall plane z)
function slidingLeaf(f, x, z, w, h, trim, leaf, left) {
  const px = left ? x - w - 1 : x + w + 1;
  f.box(Math.min(x, px) - 1, h + 1, z - 1, 2 * w + 3, 1, 1, MAT.iron);
  f.box(x - 1, 1, z - 1, 1, h, 1, trim); f.box(x + w, 1, z - 1, 1, h, 1, trim); f.box(x - 1, h, z - 1, w + 2, 1, 1, trim);
  f.box(px, 1, z - 2, w, h - 1, 1, leaf);
  const dk = MAT.trim_dark;
  f.box(px, 1, z - 3, w, 1, 1, dk); f.box(px, h - 1, z - 3, w, 1, 1, dk); f.box(px, 1, z - 3, 1, h - 1, 1, dk); f.box(px + w - 1, 1, z - 3, 1, h - 1, 1, dk); f.box(px, Math.round(h / 2), z - 3, w, 1, 1, dk);
  for (let i = 1; i < w - 1; i++) { const y = 1 + Math.round(i * (Math.round(h / 2) - 1) / (w - 1)); f.box(px + i, y, z - 3, 1, 1, 1, dk); f.box(px + i, Math.round(h / 2) + y - 1, z - 3, 1, 1, 1, dk); }
}

// Castellano Fish Co.: the packing floor, the dock_work spots for the six o'clock fleet
function fishHouse(b, f, hall, office, g) {
  const { X0, Z0, IW, ID, dx, dW, dH, bz, bd, H, ox0, oz1, rng, work } = g;
  // two long stainless cutting tables either side of the aisle, ice bins, scales
  const tables = [dx - 8, dx + dW + 4];
  for (const tx of tables) {
    f.box(tx, 1, Z0 + 22, 4, 2, 30, MAT.wood_post); f.box(tx, 3, Z0 + 22, 4, 1, 30, MAT.stainless); f.box(tx + 1, 1, Z0 + 23, 2, 2, 28, 0);
    for (let zz = Z0 + 24; zz < Z0 + 50; zz += 6) f.prop('fish_crate', tx + 2, 4, zz, 1, {});
  }
  f.box(X0 + 2, 1, Z0 + ID - 16, 10, 4, 12, MAT.wood_dark); f.box(X0 + 3, 4, Z0 + ID - 15, 8, 1, 10, MAT.glass);          // ice bin
  f.box(X0 + IW - 12, 1, Z0 + ID - 16, 10, 4, 12, MAT.wood_dark); f.box(X0 + IW - 11, 4, Z0 + ID - 15, 8, 1, 10, MAT.glass);
  f.prop('scale_grocery', dx + dW / 2 + 5, 1, Z0 + 18, 0, {}); f.prop('fish_ice_display', dx - 10, 1, Z0 + 14, 0, {});
  for (let k = 0; k < 6; k++) f.prop(rng.pick(['barrel', 'fish_crate', 'barrel_stack', 'hb_ice_blocks']), X0 + 3 + k * 4, 1, Z0 + ID - 2.5, 0, {});
  for (let zz = Z0 + 4; zz < Z0 + 18; zz += 4) f.prop('fish_crate', X0 + 3, 1, zz, 1, {});
  // hoist beam over the water-side door
  const Bk = f.faceFrame('back'), W = b.lot.w, D = b.lot.d;
  Bk.box(W - dx - dW / 2 - 1, dH + 3, D - (bz + bd) - 6, 2, 2, 8, MAT.wood_dark); Bk.box(W - dx - dW / 2, dH - 1, D - (bz + bd) - 5, 1, 4, 1, MAT.iron); Bk.box(W - dx - dW / 2 - 1, dH - 2, D - (bz + bd) - 6, 3, 1, 3, MAT.steel);
  // the welcome-home banner on the back wall
  f.box(dx - 4, dH + 3, Z0 + ID - 1, dW + 8, 7, 1, MAT.canvas_white);
  f.faceFrame('back').text('WELCOME HOME SAL', W - (dx + dW / 2), dH + 4, D - (Z0 + ID - 1) - 1, MAT.sign_red, { align: 'center', font: 'small' });
  // dock_work spots for the fleet (6 at the tables, 2 at the water door) and the regular hands
  const dw = [];
  for (const tx of tables) for (const zz of [Z0 + 28, Z0 + 38, Z0 + 46]) dw.push(b.spot('stand', tx === tables[0] ? tx - 1.2 : tx + 5.2, 1, zz, tx === tables[0] ? 1 : 3, { room: hall, act: 'counter', tags: ['dock_work'], label: 'Unloading & packing the catch', lines: ['Haddock! Watch your backs!', 'Ice! More ice on number two!', 'Sal Jr.\'s home — his mother cried all through Mass.'] }));
  dw.push(b.spot('stand', dx + dW / 2 - 3, 1, Z0 + ID - 4, 2, { room: hall, act: 'carry', tags: ['dock_work'] }), b.spot('stand', dx + dW / 2 + 3, 1, Z0 + ID - 4, 2, { room: hall, act: 'carry', tags: ['dock_work'] }));
  work.push(b.spot('stand', tables[0] - 1.2, 1, Z0 + 33, 1, { room: hall, act: 'counter', tags: ['work'] }), b.spot('stand', tables[1] + 5.2, 1, Z0 + 33, 3, { room: hall, act: 'counter', tags: ['work'] }), b.spot('stand', dx + dW / 2, 1, Z0 + 16, 0, { room: hall, act: 'carry', tags: ['work'] }));
  b.job('fish cutter', [work[0], dw[0]], { shift: ['6:00', '12:00'], outfit: 'fisherman' });
  b.job('fish cutter', [work[1], dw[3]], { shift: ['6:00', '12:00'], outfit: 'fisherman' });
  b.job('packer', [work[2], dw[6]], { shift: ['6:00', '12:00'], outfit: 'dock' });
  b.job('foreman', [work[2], work[0], work[1]], { shift: ['5:30', '13:00'], outfit: 'dock', title: 'foreman of the packing floor' });
  b.job('packer', [work[2], work[1]], { shift: ['12:00', '18:00'], outfit: 'dock' });
  const desk = officeDesk(b, office, ox0 + 7, 1, Z0 + 9, 0, { typewriter: false });
  b.job('bookkeeper', desk, { shift: ['7:00', '12:00'], outfit: 'clerk', sex: 'F' });
  f.prop('adding_machine', ox0 + 9, 4, Z0 + 9, 2, {}); f.prop('safe_small', ox0 + 2, 1, oz1 - 2, 1, {});
  f.prop('candle_stand', ox0 + 17, 1, oz1 - 1.5, 2, {}); f.prop('vase_flowers', ox0 + 17, 4, oz1 - 1.2, 2, { tint: '#e0e0f0' });
  // readables: the price board, the photograph, the Madonna
  f.box(X0 + 2, 8, Z0 + ID - 1, 16, 8, 1, MAT.chalkboard);
  b.readable(X0 + 10, 5, Z0 + ID - 3, { title: 'Price Board', body: 'CASTELLANO FISH CO. — PRICES TO THE TRADE, SAT. SEPT. 26\n\nHaddock ... 9¢ lb.\nCod, market ... 11¢\nMackerel ... 6¢\nHake ... 5¢\nFlounder (dabs) ... 12¢\nLobster, chicken ... 45¢\nLobster, select ... 55¢\n\nFleet in 6 A.M. — packing till noon — trucks for Boston at 1.\n(Chalked underneath, in another hand: CENTENNIAL — NO SWEARING ON THE FLOOR. — R.C.)' }, { r: 2.2 });
  b.readable(ox0 + 10, 6, oz1 - 1, { title: 'A Framed Photograph', body: 'A brown photograph in a gilt frame: a young man with an enormous moustache stands in a dory named SANTA LUCIA, holding up a cod nearly as long as his leg. Pier 3, 1896.\n\nWritten underneath in pencil: "Nonno Giuseppe — il primo giorno. The first day."\n\nTucked into the corner of the frame: a newer snapshot of a young soldier in a field jacket, grinning, somewhere very cold. On the back: "Korea, Jan. 1953. Don\'t let Ma see the beard. — Sal"' }, { r: 2.2 });
  b.readable(ox0 + 17, 5, oz1 - 1.5, { title: 'A Little Shrine', body: 'A painted plaster Madonna del Soccorso, patroness of Sciacca, stands in a niche by the door with a votive candle and a jam jar of asters.\n\nEvery man going out to the boats touches the frame. Nobody talks about it. Everybody does it.' }, { r: 2 });
  b.light(ox0 + 17, 5, oz1 - 1.5, { mode: 'always', radius: 2.5, color: [1, 0.7, 0.4] });
}

// Pier 3 Sheds: gear store below, net loft above
function gearLoft(b, f, hall, g) {
  const { X0, Z0, IW, ID, dx, dW, H, ox0, oz1, rng, keep } = g;
  const LY = 13;
  // loft floor over the back two thirds, stairs along the left wall
  f.box(X0, LY, Z0 + 24, IW, 1, ID - 24, MAT.floor_pine);
  const sz = Z0 + 26;
  stairs(f, X0 + 1, 1, sz, '+z', LY, { w: 4, run: 2, mat: MAT.wood_mid });
  f.carve(X0 + 1, LY, sz, 4, 1, 2 * LY);
  const loft = b.room('Net Loft', X0, LY + 1, Z0 + 24, IW, H - LY - 2, ID - 24, { lightMode: 'auto', public: true });
  b.stairs(hall, [X0 + 3, 1, sz - 1.5], loft, [X0 + 3, LY + 1, sz + 2 * LY + 1.5]);
  for (let x = X0 + 8; x < X0 + IW - 2; x += 2) f.box(x, LY + 1, Z0 + 24, 1, 4, 1, MAT.wood_dark);
  f.box(X0 + 6, LY + 4, Z0 + 24, IW - 6, 1, 1, MAT.wood_dark);
  for (let x = X0 + 12; x < X0 + IW - 10; x += 16) f.prop('hb_net_rack', x, LY + 1, Z0 + ID - 4, 0, {});
  for (let k = 0; k < 5; k++) f.prop(rng.pick(['fishing_net_pile', 'rope_coil', 'hb_lobster_buoys']), X0 + 12 + k * 8, LY + 1, Z0 + 34, rng.int(0, 3), {});
  const menders = [b.spot('sit', X0 + 20, LY + 1, Z0 + 40, 2, { room: loft, act: 'sew', tags: ['work'], seat: 0.4 }), b.spot('sit', X0 + 28, LY + 1, Z0 + 40, 2, { room: loft, act: 'sew', tags: ['work'], seat: 0.4 })];
  f.prop('stool_tall', X0 + 20, LY + 1, Z0 + 40, 2, {});
  b.job('net mender', menders, { shift: ['7:00', '12:00'], outfit: 'fisherman', title: 'mending nets in the loft' });
  // gear below: trap stacks, buoys, oars
  let n = 0;
  for (let zz = Z0 + 6; zz < Z0 + ID - 4; zz += 7) for (const xx of [X0 + 10, dx - 5, dx + dW + 5, X0 + IW - 5]) {
    if (!keep(xx, zz) || n++ > 22 || (xx < X0 + 8 && zz > sz - 4)) continue;
    f.prop(rng.pick(['lobster_trap_stack', 'lobster_trap_stack', 'hb_lobster_buoys', 'barrel', 'fishing_net_pile', 'crate']), xx, 1, zz, rng.int(0, 3), {});
  }
  for (let k = 0; k < 8; k++) f.box(X0 + IW - 1, 2, Z0 + 30 + k * 2, 1, 12, 1, MAT.wood_light);  // oars against the wall
  b.readable(dx - 3, 5, Z0 + 1.5, { title: 'Cornerstone Notice', body: 'PIER 3 SHEDS — 1939\n\nBuilt by the fishermen of Juniper Bay the winter after the hurricane, on the stubs of the old piles, with lumber from Dunmore\'s old mill barn and nails bought by a church supper.\n\nThe net loft is free to any man who fishes out of Pier 3. Mind the stairs.' }, { r: 2.2 });
}

// Bayside Boat Works: a lobster boat in frame, a dory on its cradle, sawhorses, lumber
function boatShop(b, f, hall, g) {
  const { X0, Z0, IW, ID, dx, dW, rng } = g;
  const cx = dx + dW / 2, kz0 = Z0 + 18, kz1 = Z0 + 58;
  // keel on blocks, stem, transom and sawn frames of a 34-footer
  f.box(cx - 1, 1, kz0, 2, 2, kz1 - kz0, MAT.wood_dark);
  f.box(cx - 1, 3, kz0 - 1, 2, 3, kz1 - kz0 + 1, MAT.wood_mid);
  f.box(cx - 1, 3, kz0 - 2, 2, 12, 2, MAT.wood_mid);
  f.box(cx - 7, 5, kz1 - 1, 14, 9, 1, MAT.wood_light);
  for (let z = kz0 + 3; z < kz1 - 2; z += 3) {
    const t = (z - kz0) / (kz1 - kz0), half = Math.round(3 + 5 * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2));
    f.box(cx - half, 5, z, 2 * half, 1, 1, MAT.wood_light);
    f.box(cx - half, 5, z, 1, 9, 1, MAT.wood_light); f.box(cx + half - 1, 5, z, 1, 9, 1, MAT.wood_light);
    f.box(cx - half - 1, 10, z, 1, 4, 1, MAT.wood_light); f.box(cx + half, 10, z, 1, 4, 1, MAT.wood_light);
  }
  for (const s of [-1, 1]) f.box(s < 0 ? cx - 9 : cx + 8, 13, kz0 + 6, 1, 1, kz1 - kz0 - 8, MAT.wood_pale);    // sheer clamps
  for (const s of [-1, 1]) for (let z = kz0 + 4; z < kz1; z += 10) f.box(s < 0 ? cx - 13 : cx + 12, 1, z, 1, 12, 1, MAT.wood_post);  // shores
  // a dory on her cradle, sawhorses with planks, lumber racks, steam box
  f.box(X0 + 6, 1, Z0 + 8, 1, 3, 12, MAT.wood_dark); f.box(X0 + 14, 1, Z0 + 8, 1, 3, 12, MAT.wood_dark);
  f.prop('dory', X0 + 10, 3, Z0 + 14, 0, { tint: '#d8cfa8' });
  for (const [x, z] of [[X0 + 8, Z0 + ID - 18], [X0 + 16, Z0 + ID - 18], [X0 + IW - 18, Z0 + 12]]) { f.prop('hb_sawhorse', x, 1, z, 0, {}); f.prop('hb_sawhorse', x, 1, z + 8, 0, {}); f.box(x - 2, 4, z - 1, 1, 1, 10, MAT.wood_pale); }
  for (let y = 2; y < 14; y += 3) f.box(X0 + IW - 3, y, Z0 + 26, 3, 1, 30, MAT.wood_dark);
  for (let y = 3; y < 14; y += 3) f.box(X0 + IW - 3, y, Z0 + 26, 3, 1, 30, MAT.wood_light);
  f.box(X0 + 2, 1, Z0 + 26, 4, 5, 28, MAT.wood_gray); f.box(X0 + 3, 6, Z0 + 30, 1, 10, 1, MAT.iron);  // steam box & stack
  f.prop('barrel', X0 + 4, 1, Z0 + 56, 0, {});
  f.prop('workbench', X0 + IW - 10, 1, Z0 + ID - 2, 0, {}); f.prop('tools_wall', X0 + IW - 10, 5, Z0 + ID - 0.6, 2, {});
  f.prop('workbench', X0 + 24, 1, Z0 + ID - 2, 0, {}); f.prop('lumber_rack', X0 + 8, 1, Z0 + ID - 3, 0, {});
  f.box(X0, 0, Z0, IW, 1, ID, MAT.floor_pine); for (let k = 0; k < 14; k++) f.box(cx - 16 + rng.int(0, 32), 1, kz0 + rng.int(0, 40), rng.int(1, 3), 1, rng.int(1, 3), MAT.wood_pale); // shavings
  const s1 = b.spot('stand', cx - 10, 1, Z0 + 32, 1, { room: hall, act: 'hammer', tags: ['work'] });
  const s2 = b.spot('stand', cx + 10, 1, Z0 + 44, 3, { room: hall, act: 'saw', tags: ['work'] });
  const s3 = b.spot('stand', X0 + 12, 1, Z0 + ID - 18, 2, { room: hall, act: 'saw', tags: ['work'] });
  const s4 = b.spot('stand', X0 + 10, 1, Z0 + 22, 0, { room: hall, act: 'paint', tags: ['work'] });
  const s5 = b.spot('stand', X0 + IW - 10, 1, Z0 + ID - 5, 2, { room: hall, act: 'hammer', tags: ['work'] });
  b.job('boatbuilder', [s1, s2, s5], { shift: ['7:00', '12:00'], title: 'boatbuilder' });
  b.job('boatbuilder', [s2, s3, s1], { shift: ['7:00', '12:00'], title: 'boatbuilder' });
  b.job('apprentice', [s4, s3], { shift: ['7:00', '15:00'], title: 'apprentice boatbuilder', age: [16, 22] });
  b.readable(X0 + IW - 10, 5, Z0 + ID - 3, { title: 'The Order Book', body: 'BAYSIDE BOAT WORKS — est. 1888 — ORDERS, 1953\n\n• 3 dories, 16 ft., for Castellano Fish Co. — two delivered, one on the cradle\n• 34-ft. lobster boat for M. Furtado (Jr.) — keel laid June 2nd, frames up\n  (his father was lost off Pier 3 in \'38; the boy wants her named MANUEL)\n• new transom, launch of the ISLAND BELLE — waiting on oak\n• re-caulk & paint, sloop HALCYON II — Yacht Club, before Sunday\'s race!\n\nThe \'38 water came four feet up these walls. The line is on the door frame.' }, { r: 2.2 });
}

// ------------------------------------------------------------ the Harbor Master's office
function buildHarborMaster(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name, kind: spec.kind, lot, address: lot.address, established: 1868, lore: 'Office of the Harbor Master, Port of Juniper Bay. Moorings, tides, notices to mariners.', hours: [7 * 60, 17 * 60] });
  const f = b.f, rng = ctx.rng.fork('hm');
  const W = lot.w, D = lot.d;
  const outer = MAT.siding_white, inner = MAT.plaster_cream, trim = MAT.trim_green;
  const bx = 8, bw = W - 16, bz = 40, bd = D - 44, FH = 14, H = 2 * FH;
  const X0 = bx + 2, Z0 = bz + 2, IW = bw - 4, ID = bd - 4, midZ = Z0 + 24;
  // grounds: lawn, walk, flagpole, storm-signal mast, anchor & bell on display
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn); f.box(W / 2 - 3, -1, 0, 6, 1, bz, MAT.sidewalk); f.box(0, -1, bz + bd, W, 1, D - bz - bd, MAT.cobble);
  f.prop('flag_pole', W / 2 - 16, 0, 18, 0, {});
  f.box(W / 2 + 15, 0, 17, 2, 44, 2, MAT.trim_white); f.box(W / 2 + 8, 38, 17, 16, 1, 2, MAT.trim_white); f.box(W / 2 + 14, 0, 16, 4, 1, 4, MAT.granite);
  f.prop('anchor', W / 2 - 10, 0, 30, 0, {}); f.prop('bell_brass', W / 2 + 9, 0, 30, 0, {}); f.box(W / 2 + 7, 0, 29, 4, 2, 2, MAT.granite);
  f.prop('bench_park', W / 2 - 8, 0, 10, 1, {}); b.playerSeat(W / 2 - 8, 0, 10, 1, 0.45);
  b.spot('sit', W / 2 - 8, 0, 10, 1, { act: 'sit', tags: ['bench'], seat: 0.45, room: 0 });
  // shell, floors, hip roof & lookout cupola
  shell(f, bx, 0, bz, bw, H, bd, outer, inner, 2);
  f.box(bx, 0, bz, bw, 1, bd, MAT.stone_foundation);
  slab(f, X0, 0, Z0, IW, ID, MAT.floor_oak); slab(f, X0, FH, Z0, IW, ID, MAT.floor_oak);
  for (const x of [bx, bx + bw - 1]) f.box(x, 0, bz - 1, 1, H, 1, trim);
  f.box(bx - 1, H - 1, bz - 1, bw + 2, 1, 1, trim);
  const rh = f.hip(bx, H, bz, bw, bd, MAT.roof_shingle_gray, { overhang: 2 });
  const cx = bx + bw / 2, cz = bz + bd / 2, top = H + rh - 6;
  f.box(cx - 7, top - 4, cz - 7, 14, 4, 14, outer);
  f.box(cx - 7, top, cz - 7, 14, 8, 14, MAT.glass); for (const [a, c] of [[cx - 7, cz - 7], [cx + 6, cz - 7], [cx - 7, cz + 6], [cx + 6, cz + 6]]) f.box(a, top, c, 1, 8, 1, trim);
  f.hip(cx - 7, top + 8, cz - 7, 14, 14, MAT.roof_copper, { overhang: 1 }); f.box(cx, top + 16, cz, 1, 6, 1, MAT.iron);
  f.box(cx - 3, top + 22, cz, 7, 1, 1, MAT.iron); f.box(cx, top + 22, cz - 3, 1, 1, 7, MAT.iron);   // weather vane
  chimneyAt(f, bx + 4, bz + bd - 8, H + rh - 4);
  // the high-water line and signs
  f.walls(bx, 6, bz, bw, 1, bd, MAT.sign_navy, 1);
  const hwt = textSignType('HIGH WATER SEPT. 21 1938', { bg: '#e9e4d6', fg: '#1f2f4f', border: '#1f2f4f', scale: 1 / 28 });
  f.prop(hwt, bx + 12, 7, bz - 0.15, 0);
  b.readable(bx + 12, 7, bz - 0.5, { title: 'High-Water Mark, 1938', body: 'HIGH WATER — SEPT. 21, 1938\n\nThe harbor master of the day, Capt. Joshua Hallett, marked this line with a carpenter\'s pencil standing on his desk while the water went down, then went out in a dory to look for the Pier 3 men.' }, { r: 2.4 });
  f.box(W / 2 - 22, FH + 1, bz - 1, 44, 8, 1, MAT.sign_navy);
  f.text('HARBOR MASTER', W / 2, FH + 2, bz - 2, MAT.sign_gold, { align: 'center', font: 'small' });
  smallSign(f, 'PORT OF JUNIPER BAY', W / 2, FH - 3, bz, { bg: '#1f2f4f', fg: '#e8c870' });
  f.prop('hb_plaque', W / 2 + 6, 3, bz - 0.1, 0, {});
  b.readable(W / 2 + 6, 3, bz - 0.6, { title: 'Office Plaque', body: 'OFFICE OF THE HARBOR MASTER\nPORT OF JUNIPER BAY\nEstablished 1868\n\nHarbor Masters: Capt. Obed Coffin 1868–1884 · Capt. Reuben Snow 1884–1907 · Capt. Joshua Hallett 1907–1945 · Capt. John T. Hallett 1945–' }, { r: 2.2 });
  // doors & windows
  const door = { x: W / 2 - 2 };
  doorway(f, door.x, 1, bz, 4, 9, { frame: trim, t: 2, transom: true, step: true });
  const wo = { frame: trim, t: 2, shutters: MAT.trim_green };
  for (const x of [X0 + 4, X0 + 16, X0 + IW - 20, X0 + IW - 8]) { win(f, x, 4, bz, 4, 7, wo); win(f, x, FH + 4, bz, 4, 7, wo); }
  const Bk = f.faceFrame('back'), bzB = D - (bz + bd);
  win(Bk, W - (X0 + 4) - 30, FH + 3, bzB, 30, 8, { frame: trim, t: 2, style: 'shop' });   // the big harbour window upstairs
  win(Bk, W - (X0 + 4) - 12, 4, bzB, 12, 6, { frame: trim, t: 2, style: 'cross' });
  doorway(Bk, W - (X0 + IW - 10) - 4, 1, bzB, 4, 9, { frame: trim, t: 2, step: false });
  const L = f.faceFrame('left'), Rt = f.faceFrame('right');
  for (const zm of [bz + 10, bz + 32]) { win(L, D - zm - 4, 4, bx, 4, 7, { frame: trim, t: 2 }); win(L, D - zm - 4, FH + 4, bx, 4, 7, { frame: trim, t: 2 }); win(Rt, zm, 4, W - (bx + bw), 4, 7, { frame: trim, t: 2 }); win(Rt, zm, FH + 4, W - (bx + bw), 4, 7, { frame: trim, t: 2 }); }
  // ground floor: public office (front), radio room (back left), stair hall (back right)
  partitionX(f, X0, X0 + IW, 1, midZ, FH - 1, inner, [{ at: X0 + 14, w: 4 }, { at: X0 + 44, w: 4 }]);
  partitionZ(f, midZ + 1, Z0 + ID, 1, X0 + 34, FH - 1, inner, []);
  const pub = b.room('Public Office', X0, 1, Z0, IW, FH - 1, midZ - Z0, { lightMode: 'always', public: true });
  const radio = b.room('Radio Room', X0, 1, midZ + 1, 34, FH - 1, Z0 + ID - midZ - 1, { lightMode: 'auto', public: true });
  const sh = b.room('Stair Hall', X0 + 35, 1, midZ + 1, IW - 35, FH - 1, Z0 + ID - midZ - 1, { lightMode: 'auto', public: true });
  b.entrance(pub, door.x + 2, 1, bz, { outZ: bz - 6, leaf: 'door_glass', tint: '#2a4a3a', main: true });
  b.door(pub, radio, X0 + 16, 1, midZ, {}); b.door(pub, sh, X0 + 46, 1, midZ, {});
  b.entrance(sh, X0 + IW - 8, 1, bz + bd - 1, { outZ: D + 4, inside: -3, leaf: 'door_wood' });
  const c = counterRun(b, pub, X0 + 6, X0 + 46, 1, Z0 + 12, { rot: 0, register: false });
  f.prop('bench_park', X0 + IW - 8, 1, Z0 + 3, 0, {}); b.spot('sit', X0 + IW - 8, 1, Z0 + 3.4, 0, { room: pub, act: 'read', tags: ['waiting'], seat: 0.45 });
  f.box(X0, 5, Z0 + 4, 1, 7, 14, MAT.chalkboard); f.box(X0 + IW - 1, 4, Z0 + 8, 1, 8, 12, MAT.sign_cream); f.box(X0 + IW - 1, 5, Z0 + 9, 1, 6, 10, MAT.plaza_teal);
  f.prop('clock_wall', X0 + 30, 9, Z0 + 0.6, 0, {}); f.prop('ship_model_case', X0 + 56, 1, Z0 + 20, 0, {});
  b.readable(X0 + 1.5, 7, Z0 + 11, { title: 'Tide Board', body: 'TIDES — WHITCOMB POINT — SEPTEMBER 1953\n\nSat. 26  H 4:12a 9.8 · L 10:24a 0.6 · H 4:38p 10.1 · L 10:51p 0.4\nSun. 27  H 5:01a 9.6 · L 11:13a 0.8 · H 5:27p 9.9 · L 11:40p 0.6\nMon. 28  H 5:52a 9.3 · L 12:04p 1.1 · H 6:18p 9.5\n\nFull moon Sunday — watch the springs.' }, { r: 2.2 });
  b.readable(X0 + IW - 1.5, 7, Z0 + 14, { title: 'Chart of the Harbor', body: 'U.S. Coast & Geodetic Survey, Chart 1207: Juniper Bay and Approaches (1947).\n\nSomeone has drawn a small cross in pencil on Gannet Ledge, and written beside it in a fine old hand: "Mary Ellen — Oct. 1867". The cross has been gone over many times.' }, { r: 2.2 });
  // radio room
  const rs = officeDesk(b, radio, X0 + 14, 1, midZ + 8, 2, { typewriter: true });
  f.prop('police_radio', X0 + 6, 1, Z0 + ID - 1.5, 0, {}); f.prop('radio_console_studio', X0 + 26, 1, Z0 + ID - 1.5, 0, {});
  b.spot('sit', X0 + 6, 1, Z0 + ID - 4, 2, { room: radio, act: 'type', tags: ['work'], seat: 0.46 }); f.prop('chair_office', X0 + 6, 1, Z0 + ID - 4, 2, {});
  // stairs to the upper floor along the back wall
  const top2 = stairs(f, X0 + 38, 1, Z0 + ID - 5, '+x', FH, { w: 4, run: 2, mat: MAT.wood_mid });
  void top2;
  partitionX(f, X0, X0 + IW, FH + 1, midZ, FH - 1, inner, [{ at: X0 + 24, w: 4 }]);
  const chart = b.room('Chart Room', X0, FH + 1, Z0, IW, FH - 1, midZ - Z0, { lightMode: 'auto', public: true });
  const hmo = b.room('Harbor Master\'s Office', X0, FH + 1, midZ + 1, IW, FH - 1, Z0 + ID - midZ - 1, { lightMode: 'auto', public: true, nav: [X0 + 20, midZ + 10] });
  b.stairs(sh, [X0 + 37, 1, Z0 + ID - 3], hmo, [X0 + 38 + 2 * FH + 1, FH + 1, Z0 + ID - 7]);
  b.door(hmo, chart, X0 + 26, FH + 1, midZ, {});
  for (let x = X0 + 38; x < X0 + IW - 2; x += 3) f.box(x, FH + 1, Z0 + ID - 6, 1, 4, 1, MAT.wood_dark);
  f.box(X0 + 38, FH + 4, Z0 + ID - 6, IW - 40, 1, 1, MAT.wood_dark);
  const hd = officeDesk(b, hmo, X0 + 14, FH + 1, midZ + 8, 2, { typewriter: false });
  const hw = b.spot('stand', X0 + 18, FH + 1, Z0 + ID - 3.5, 2, { room: hmo, act: 'look', tags: ['work'], label: 'Watching the harbor' });
  f.prop('globe_desk', X0 + 30, FH + 1, midZ + 4, 0, {}); f.prop('bookshelf', X0 + 2, FH + 1, midZ + 3, 1, {}); f.prop('barometer', X0 + 8, FH + 6, midZ + 1.6, 0, {});
  f.prop('clock_wall', X0 + 8, FH + 7, midZ + 1.6, 2, {}); f.prop('coat_rack', X0 + 3, FH + 1, Z0 + ID - 3, 0, {});
  f.prop('table_card', X0 + 30, FH + 1, Z0 + 8, 0, {}); f.prop('books_stack', X0 + 30, FH + 4, Z0 + 8, 0, {});
  const ct = b.spot('stand', X0 + 30, FH + 1, Z0 + 11, 0, { room: chart, act: 'read_stand', tags: ['work'] });
  b.readable(X0 + 14, FH + 4, midZ + 8, { title: 'Harbor Master\'s Log', body: 'SAT. SEPT. 26, 1953\n0500 Wind SW light, fair, sea smooth. Barometer 30.12 steady.\n0558 Fleet reported off Gannet Bell. All 5 in by 0640.\n0800 Str. GRAY LADY working No. 3 hatch.\n1030 Tug JUNIPER to assist yacht HALCYON II off the flats (again).\n1400 Fireworks barge towed out & anchored per permit. 200-yd. clear zone buoyed.\n1730 Amos Fisk reports the light lit, all well at the Point.\n\nPersonal: Mother would have loved today. — J.T.H.' }, { r: 2 });
  b.readable(X0 + 30, FH + 4, Z0 + 8, { title: 'List of Moorings', body: 'MOORINGS — INNER HARBOR — 1953\n\nNo. 1–12 Castellano Fish Co. & Pier 3 fleet\nNo. 14 lobster boat ROSA C. — Castellano\nNo. 17 sloop HALCYON II — Dr. N. Pike\nNo. 22 catboat PEGGY — P. Halloran (unpaid since June)\nNo. 30 launch — Whitcomb Point Light\n...and 41 others. The waiting list is eleven years long.' }, { r: 2 });
  b.job('harbor master', [hd, hw, c.clerk], { shift: ['7:00', '17:00'], outfit: 'sailor', title: 'Harbor Master' });
  b.job('radio operator', [rs, ct], { shift: ['6:00', '14:00'], outfit: 'clerk' });
  b.job('clerk', c.clerk, { shift: ['8:00', '12:00'], outfit: 'clerk', sex: 'F' });
  b.customerSpots = [c.customer];
  b.light(W / 2, FH - 3, bz - 2, { mode: 'night', radius: 7 });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  void rng;
  return b;
}
function chimneyAt(f, x, z, h) { f.box(x, 0, z, 4, h, 4, MAT.brick_red); f.box(x - 1, h, z - 1, 6, 1, 6, MAT.stone_foundation); f.carve(x + 1, h - 1, z + 1, 2, 2, 2); }

// ------------------------------------------------------------ Juniper Bay Yacht Club
function buildYachtClub(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name, kind: spec.kind, lot, address: lot.address, established: 1902, lore: 'Organized 1902. The Whitcomb Cup has been sailed every September since 1903 — except one.', hours: [11 * 60, 23 * 60] });
  const f = b.f, rng = ctx.rng.fork('yc');
  const W = lot.w, D = lot.d;
  const outer = MAT.shingle_wall, inner = MAT.wood_panel_light, trim = MAT.trim_white, roofM = MAT.roof_shingle_green;
  const bx = 6, bw = W - 12, bz = 20, bd = 50, FH = 14, H = 2 * FH;
  const X0 = bx + 2, Z0 = bz + 2, IW = bw - 4, ID = bd - 4, midZ = Z0 + 20;
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn); f.box(W / 2 - 3, -1, 0, 6, 1, bz, MAT.gravel); f.box(0, -1, bz + bd, W, 1, D - bz - bd, MAT.cobble);
  // the deck on the water side
  f.box(2, 0, bz + bd, W - 4, 1, D - bz - bd, MAT.dock_wood);
  for (let x = 2; x < W - 2; x += 8) f.box(x, 1, D - 1, 1, 4, 1, trim);
  f.box(2, 4, D - 1, W - 4, 1, 1, trim); f.box(2, 4, bz + bd, 1, 1, D - bz - bd, trim); f.box(W - 3, 4, bz + bd, 1, 1, D - bz - bd, trim);
  for (let z = bz + bd; z < D; z += 6) { f.box(2, 1, z, 1, 3, 1, trim); f.box(W - 3, 1, z, 1, 3, 1, trim); }
  f.carve(W / 2 - 3, 1, D - 1, 6, 4, 1);
  // front lawn: flagpole with the burgee, the starting cannon
  f.prop('flag_pole', 12, 0, 8, 0, {}); f.box(W - 20, 0, 8, 6, 2, 3, MAT.wood_dark); f.box(W - 21, 2, 9, 7, 2, 2, MAT.iron); f.box(W - 22, 2, 9, 1, 2, 2, MAT.trim_black);
  // shell, floors, roof with a front cross gable
  shell(f, bx, 0, bz, bw, H, bd, outer, inner, 2);
  f.box(bx, 0, bz, bw, 1, bd, MAT.stone_foundation);
  slab(f, X0, 0, Z0, IW, ID, MAT.floor_walnut); slab(f, X0, FH, Z0, IW, ID, MAT.floor_oak);
  f.gable(bx, H, bz, bw, bd, roofM, { axis: 'x', overhang: 2, gableMat: outer });
  f.gable(W / 2 - 14, H, bz - 6, 28, 26, roofM, { axis: 'z', overhang: 1, gableMat: MAT.trim_white });
  f.box(W / 2 - 14, 0, bz - 6, 28, 1, 6, MAT.wood_gray);
  for (const x of [W / 2 - 14, W / 2 + 13]) f.box(x, 1, bz - 6, 1, H - 1, 1, trim);
  f.box(W / 2 - 14, FH, bz - 6, 28, 1, 6, MAT.wood_gray);
  for (let x = W / 2 - 14; x < W / 2 + 14; x += 3) f.box(x, FH + 1, bz - 6, 1, 3, 1, trim);
  f.box(W / 2 - 14, FH + 3, bz - 6, 28, 1, 1, trim);
  chimneyAt(f, bx + 6, bz + 20, H + 22);
  f.walls(bx, 6, bz, bw, 1, bd, MAT.sign_navy, 1);
  f.text('JUNIPER BAY YACHT CLUB', W / 2, H + 3, bz - 7, MAT.sign_navy, { align: 'center', font: 'small' });
  f.box(W / 2 - 4, H + 12, bz - 7, 8, 5, 1, MAT.sign_red); f.box(W / 2 - 1, H + 13, bz - 8, 2, 3, 1, MAT.trim_white);   // burgee on the gable
  const hwt = textSignType('HIGH WATER SEPT. 21 1938', { bg: '#e9e4d6', fg: '#1f2f4f', border: '#1f2f4f', scale: 1 / 28 });
  f.prop(hwt, bx + 12, 7, bz - 0.15, 0);
  // doors & windows (French doors onto the deck)
  const door = { x: W / 2 - 2 };
  doorway(f, door.x, 1, bz, 4, 9, { frame: trim, t: 2, transom: true, step: false });
  const wo = { frame: trim, t: 2 };
  for (const x of [X0 + 4, X0 + 14, X0 + IW - 18, X0 + IW - 8]) { win(f, x, 4, bz, 4, 7, wo); win(f, x, FH + 4, bz, 4, 7, wo); }
  const Bk = f.faceFrame('back'), bzB = D - (bz + bd);
  for (const xm of [X0 + 4, X0 + 18, X0 + IW - 30, X0 + IW - 16]) { win(Bk, W - xm - 8, 3, bzB, 8, 9, { frame: trim, t: 2, style: 'shop' }); win(Bk, W - xm - 8, FH + 3, bzB, 8, 8, { frame: trim, t: 2, style: 'cross' }); }
  doorway(Bk, W - (W / 2 + 2), 1, bzB, 4, 10, { frame: trim, t: 2, step: false });
  // rooms: lounge (front), bar (back, onto the deck); upstairs the commodore's room & the race committee room
  partitionX(f, X0, X0 + IW, 1, midZ, FH - 1, inner, [{ at: W / 2 - 4, w: 8, h: 11 }]);
  const lounge = b.room('Lounge', X0, 1, Z0, IW, FH - 1, midZ - Z0, { lightMode: 'always', public: true });
  const bar = b.room('Bar', X0, 1, midZ + 1, IW, FH - 1, Z0 + ID - midZ - 1, { lightMode: 'always', public: true, lightColor: [1, 0.8, 0.55] });
  b.entrance(lounge, door.x + 2, 1, bz, { outZ: bz - 10, leaf: 'door_glass', tint: '#1f2f4f', main: true });
  b.door(lounge, bar, W / 2, 1, midZ, { leaf: false });
  b.entrance(bar, W / 2, 1, bz + bd - 1, { outZ: bz + bd + 6, inside: -3, leaf: 'door_glass', tint: '#1f2f4f' });
  // lounge: armchairs round the fire, trophies, half models
  f.box(X0, 1, Z0 + 8, 1, 7, 6, MAT.brick_red); f.box(X0, 1, Z0 + 9, 1, 3, 4, MAT.fire); b.light(X0 + 1, 2, Z0 + 11, { mode: 'room', room: lounge, radius: 5, color: [1, 0.6, 0.3] });
  const lseats = [];
  for (const [x, z, r] of [[X0 + 6, Z0 + 6, 3], [X0 + 6, Z0 + 16, 3], [X0 + 12, Z0 + 11, 3]]) { f.prop('armchair', x, 1, z, r, { tint: rng.pick(['#5a2a24', '#2a4a3a', '#6a5a3a']) }); lseats.push(b.spot('sit', x, 1, z, r, { room: lounge, act: rng.pick(['read', 'smoke_pipe', 'talk_sit']), tags: ['lounge'], seat: 0.42 })); }
  f.prop('table_side', X0 + 9, 1, Z0 + 11, 0, {}); f.prop('rug_rect', X0 + 8, 1, Z0 + 11, 1, { tint: '#2a3a5a' });
  f.prop('trophy_case', X0 + IW - 2, 1, Z0 + 8, 3, {}); f.prop('ship_model_case', X0 + IW - 2, 1, Z0 + 16, 3, {}); f.prop('ships_wheel_wall', W / 2, 7, Z0 + 0.6, 2, {});
  f.prop('painting', X0 + 20, 6, Z0 + 0.6, 2, { tint: '#6a8ab0' }); f.prop('piano_upright', X0 + IW - 14, 1, midZ - 1.5, 0, {});
  b.readable(X0 + IW - 3, 4, Z0 + 8, { title: 'The Whitcomb Cup', body: 'THE WHITCOMB CUP\nPresented 1903 by Henry L. Whitcomb, for sloops of the Club, round Whitcomb Point and the Gannet Bell.\n\nWinners engraved on the base include:\n1903 SPRAY · 1911 NIMBLE · 1924 WANDERER · 1937 HALCYON\n1938 — no race. (HALCYON was lost at her mooring in the hurricane, two days before.)\n1946 HALCYON II · 1952 BLUE JAY\n\n1953: to be sailed Sunday at 10.' }, { r: 2.2 });
  b.readable(W / 2, 6, Z0 + 1, { title: 'Commodores of the Club', body: 'COMMODORES — JUNIPER BAY YACHT CLUB, 1902–1953\n\n1902 H. L. Whitcomb · 1910 Dr. A. Mayhew · 1919 T. Harlow · 1927 J. Hallett\n1933 E. Pemberton · 1941–45 (none — the Club was lent to the Navy)\n1946 Dr. N. Pike · 1951 W. Pemberton\n\n"Members are reminded that the bar is not a mooring."' }, { r: 2.2 });
  // the bar
  const barZ = Z0 + ID - 8;
  for (let x = X0 + 8; x <= X0 + 28; x += 4) f.prop('bar_counter', x, 1, barZ, 0, {});
  f.prop('bar_back_shelf', X0 + 18, 1, Z0 + ID - 1, 0, {}); f.prop('beer_taps', X0 + 16, 4, barZ, 0, {});
  const stools = [];
  for (let x = X0 + 8; x <= X0 + 28; x += 4) { f.prop('bar_stool', x, 1, barZ - 3, 2, {}); stools.push(b.spot('sit', x, 1, barZ - 3, 2, { room: bar, act: 'drink', tags: ['bar'], seat: 0.7 })); }
  const bt = b.spot('stand', X0 + 18, 1, barZ + 2.6, 0, { room: bar, act: 'bartend', tags: ['work'] });
  for (const [x, z] of [[X0 + IW - 20, midZ + 8], [X0 + IW - 8, midZ + 8]]) { f.prop('table_round', x, 1, z, 0, {}); for (const r of [0, 2]) { const s = R4dir(r); f.prop('chair_wood', x - s[0] * 3, 1, z - s[1] * 3, r, {}); stools.push(b.spot('sit', x - s[0] * 3, 1, z - s[1] * 3, r, { room: bar, act: 'drink', tags: ['bar'], seat: 0.45 })); } }
  // the deck: tables, a telescope's-eye view of the harbour, fireworks spots
  const deckSeats = [];
  for (const x of [14, 34, 62, 82]) { const z = bz + bd + 12; f.prop('table_round', x, 1, z, 0, {}); for (const r of [1, 3]) { const s = R4dir(r); f.prop('chair_folding', x - s[0] * 3, 1, z, r, {}); deckSeats.push(b.spot('sit', x - s[0] * 3, 1, z, r, { room: 0, act: 'drink', tags: ['bar'], seat: 0.45 })); } }
  const deckNode = b.navPoint(0, W / 2, 1, bz + bd + 6); const deckNode2 = b.navPoint(0, W / 2, 1, D - 3, [deckNode]);
  for (const s of deckSeats) { ctx.nav.link(s.node, deckNode); s.pendingLink = false; }
  for (const x of [10, 30, 66, 86]) { const s = b.spot('stand', x, 1, D - 3, 2, { room: 0, act: 'look', tags: ['fireworks'] }); s.spread = 1.5; ctx.nav.link(s.node, deckNode2); s.pendingLink = false; const p = b.m(x, 1, D - 3); s.faceTo = FW; s.yaw = Math.atan2(FW[0] - p[0], FW[1] - p[2]); }
  f.prop('life_ring_post', W - 6, 1, D - 2, 2, {});
  const ent = b.entrances[b.entrances.length - 1]; ctx.nav.link(ent.node, deckNode);
  // upstairs
  const sx = X0 + 1;
  stairs(f, sx, 1, midZ + 2, '+z', FH, { w: 4, run: 1, mat: MAT.wood_dark });
  f.carve(sx, FH, midZ + 2, 4, 1, FH);
  partitionX(f, X0, X0 + IW, FH + 1, midZ, FH - 1, inner, [{ at: X0 + 40, w: 4 }]);
  const comm = b.room('Commodore\'s Room', X0, FH + 1, Z0, IW, FH - 1, midZ - Z0, { lightMode: 'auto', public: true });
  const race = b.room('Race Committee Room', X0, FH + 1, midZ + 1, IW, FH - 1, Z0 + ID - midZ - 1, { lightMode: 'auto', public: true });
  b.stairs(bar, [sx + 2, 1, midZ + 1], race, [sx + 2, FH + 1, midZ + 2 + FH + 1]);
  b.door(race, comm, X0 + 42, FH + 1, midZ, {});
  f.prop('table_dining', W / 2, FH + 1, Z0 + 10, 0, {}); for (let k = -2; k <= 2; k++) { f.prop('chair_wood', W / 2 + k * 4, FH + 1, Z0 + 6, 2, {}); f.prop('chair_wood', W / 2 + k * 4, FH + 1, Z0 + 14, 0, {}); }
  f.prop('trophy_case', X0 + IW - 2, FH + 1, Z0 + 10, 3, {}); f.prop('portrait', W / 2, FH + 7, Z0 + 0.6, 2, {});
  f.prop('desk_wood', X0 + 30, FH + 1, Z0 + ID - 5, 2, {}); f.prop('globe_desk', X0 + 50, FH + 1, Z0 + ID - 4, 0, {});
  b.readable(X0 + 30, FH + 4, Z0 + ID - 5, { title: 'Race Notice', body: 'CENTENNIAL REGATTA — SUNDAY, SEPTEMBER 27, 1953\nFor the Whitcomb Cup\n\nStart 10:00 A.M. off the Club dock. Course: Whitcomb Point to port, the Gannet Bell to port, return.\nSkippers\' meeting 9 A.M. in this room. Coffee by the Ladies\' Committee.\n\nBy vote of the Committee, the fleet will dip its colors passing Gannet Ledge.' }, { r: 2 });
  // staff
  b.job('bartender', bt, { shift: ['11:00', '23:00'], outfit: 'waitress', title: 'bartender', sex: 'M' });
  const st1 = b.spot('stand', W / 2 + 6, 1, midZ + 4, 2, { room: bar, act: 'serve', tags: ['work'] });
  b.job('steward', [st1, lseats[2]], { shift: ['11:00', '20:00'], outfit: 'bellhop', title: 'club steward' });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// ============================================================ JUNIPER BEACH, the boardwalk, the bath house and Playland pier
// the shoreline of the beach (x where the sand meets the water) as a function of z
function shoreline(z) { return -15 - 4 * Math.sin((z - 206) / 22) - (z > 305 ? (z - 305) * 0.25 : 0); }
// top voxel layer of the sand at (x, z)
const SAND_STEPS = [[-99, -8], [0, -6], [4, -5], [9, -4], [15, -3], [22, -2], [30, -1]];
function sandLayer(x, z) { const d = x - shoreline(z); let l = -8; for (const [t, y] of SAND_STEPS) if (d >= t) l = y; return l; }

function buildBeach(ctx) {
  defineHarborProps();
  const bb = siteBuilding(ctx, 'Juniper Beach', 'beach', { x0: -25, z0: 236, x1: 140, z1: 330 }, { labelOnly: true, street: 'Juniper Beach', hours: [9 * 60, 22 * 60] });
  const K = new Kit(ctx, bb), W = ctx.world;
  const rng = ctx.rng.fork('beach');
  // ---- the sand: carve the town ground and lay terraces down to the water
  W.box(V(-46), -16, V(205), V(44), 6, V(330), 0);
  for (let z = 205; z < 330; z += 3) {
    const xs = shoreline(z + 1.5);
    for (let i = 0; i < SAND_STEPS.length; i++) {
      const xa = Math.max(-46, i === 0 ? -46 : xs + SAND_STEPS[i][0]), xb = Math.min(44, i + 1 < SAND_STEPS.length ? xs + SAND_STEPS[i + 1][0] : 44);
      if (xb <= xa) continue;
      const top = SAND_STEPS[i][1];
      K.B(Math.round(xa * 4) / 4, -16, z, Math.round(xb * 4) / 4, top + 1, Math.min(330, z + 3), top <= -5 && top >= -6 ? MAT.ball_field : MAT.sand);
    }
  }
  K.B(0, -8, 205, 44, 1, 205.25, MAT.quay_stone);                       // retaining face at the end of the quay
  // the granite groin that shelters the beach from the harbour
  K.B(-26, -14, 203, 0, 0, 207, MAT.quay_stone); K.B(-26, 0, 203, 0, 1, 207, MAT.granite);
  for (let x = -25; x < -1; x += 3) { K.B(x, -10, 202.25, x + 1.5, -rng.int(3, 6), 203, MAT.rock); K.B(x + 1, -10, 207, x + 2.5, -rng.int(3, 6), 207.75, MAT.rock); }
  K.B(-25.5, 1, 204.75, -25.25, 12, 205.25, MAT.iron); K.B(-25.75, 12, 204.5, -25, 13, 205.5, MAT.traffic_red);
  K.light(-25.4, 3.3, 205, { color: [1, 0.25, 0.2], radius: 7, mode: 'night' });
  const quayEnd = K.nearest(6, 202, 10);
  const groin = K.path([[1.5, 205], [-23.5, 205]]); K.link(groin[0], quayEnd);
  // rocky point at the south end of the beach
  for (let k = 0; k < 9; k++) { const x = -32 + k * 4 + rng.float(-1, 1), z = 322 + rng.float(-2, 4); K.B(x, -10, z, x + rng.float(2, 4), sandLayer(x, z) + rng.int(2, 5), Math.min(330, z + rng.float(2, 4)), MAT.rock); }
  for (let k = 0; k < 6; k++) K.P('rock_big', -30 + k * 5, 0.25 * (sandLayer(-30 + k * 5, 327) + 1), 327, rng.float(0, 6), { scale: rng.float(0.8, 1.4) });
  // ---- dunes, picnic grove, playground and parking east of Harbor Street
  K.B(64, -1, 236, 140, 0, 330, MAT.sand); K.B(64, 0, 236, 140, 1, 330, 0);
  for (let k = 0; k < 16; k++) { const x = rng.float(86, 136), z = rng.float(242, 326), w = rng.float(3, 9), d = rng.float(3, 8); K.B(x, -1, z, x + w, 0, z + d, MAT.grass_dry); if (k % 3 === 0) K.B(x + 1, 0, z + 1, x + w - 1, 1, z + d - 1, MAT.sand); }
  K.B(66, -1, 238, 84, 0, 300, MAT.asphalt_old);
  for (let z = 240; z < 298; z += 3) K.B(74.8, -1, z, 75.2, 0, z + 0.2, MAT.road_white);
  const cars = [['car_sedan', '#2a3a5a'], ['car_wagon', '#8a6a3a'], ['car_coupe', '#6a2a24'], ['truck_pickup', '#3a5a3a'], ['car_convertible', '#c8b890'], ['car_sedan', '#d8d0b8']];
  cars.forEach(([t, c], i) => K.P(t, i % 2 ? 80 : 70, 0, 243 + i * 6.5, i % 2 ? 'W' : 'E', { tint: c, tint2: '#e8e4d8', cat: 'far' }));
  for (const [x, z] of [[92, 262], [98, 270], [90, 284], [104, 292], [96, 300], [110, 280], [118, 300], [126, 288], [132, 270], [124, 258]]) K.P('tree_pine', x, 0, z, rng.float(0, 6), { cat: 'far', scale: rng.float(0.8, 1.1) });
  const picnic = [];
  for (const [x, z] of [[96, 276], [104, 284], [114, 292], [122, 276]]) { K.P('picnic_table', x, 0, z, 'S'); picnic.push([x, z]); }
  // playground
  K.B(106, -1, 248, 128, 0, 266, MAT.sand);
  K.P('swing_set', 110, 0, 252, 'S'); K.P('slide', 118, 0, 252, 'S'); K.P('seesaw', 124, 0, 258, 'E'); K.P('sandbox', 112, 0, 262, 'S'); K.P('merry_go_round', 120, 0, 262, 'S');
  // ---- the boardwalk (z 229..235), west part over the sand and the east part through the dunes
  const bw0 = 229, bw1 = 235;
  const stairX = [-8, 6, 44, 80, 108, 128];
  for (const [xa, xb] of [[-24, 44], [64, 140]]) {
    K.B(xa, 0, bw0, xb, 1, bw1, MAT.dock_wood);
    K.B(xa, -1, bw1 - 0.25, xb, 0, bw1, MAT.wood_dark);
    for (let x = xa + 1; x < xb; x += 2) K.B(x, -14, bw1 - 0.5, x + 0.25, 0, bw1 - 0.25, MAT.wood_post);
    let segs = [[xa, xb]];
    for (const sx of stairX) segs = subtract(segs, sx - 1.5, sx + 1.5);
    for (const [s, e] of segs) { if (e - s < 1) continue; K.B(s, 4, bw1 - 0.25, e, 5, bw1, MAT.trim_white); K.B(s, 2, bw1 - 0.25, e, 3, bw1, MAT.trim_white); for (let x = s; x < e; x += 2) K.B(x, 1, bw1 - 0.25, x + 0.25, 4, bw1, MAT.trim_white); }
    for (const sx of stairX) if (sx > xa && sx < xb) { const tl = sandLayer(sx, bw1 + 1); for (let y = -1, k = 0; y > tl; y--, k++) K.B(sx - 1.5, y, bw1 + k * 0.5, sx + 1.5, y + 1, bw1 + (k + 1) * 0.5, MAT.dock_wood); }
    for (let x = xa + 6; x < xb - 2; x += 16) K.P('street_lamp', x, WALK_Y, bw1 - 0.6, 'N');
  }
  // crosswalk over Harbor Street
  for (let z = bw0 + 0.25; z < bw1 - 0.25; z += 1) K.B(48.5, -1, z, 59.5, 0, z + 0.5, MAT.road_white);
  const walkW = K.path([[-23, 232], [-8, 232], [6, 232], [26, 232], [43.5, 232]]);
  const walkE = K.path([[64.5, 232], [80, 232], [96, 232], [108, 232], [128, 232], [139, 232]]);
  K.link(walkW[walkW.length - 1], walkE[0]);
  for (const [n, x] of [[walkW[walkW.length - 1], 46], [walkE[0], 62]]) { const w = K.nearestWalk(x, 232, 6); if (w >= 0) K.link(n, w); }
  { const w = K.nearestWalk(139.5, 219, 8); if (w >= 0) K.link(walkE[walkE.length - 1], w); }
  // benches along the landward edge, facing the beach
  for (const x of [-18, -4, 2, 48 - 6, 70, 86, 100, 116, 134]) {
    if (x > 10 && x < 42) continue;
    K.P('bench_park', x, WALK_Y, bw0 + 0.7, 'S');
    for (const dx of [-0.6, 0.6]) { K.spot('sit', x + dx, WALK_Y, bw0 + 1.0, 'S', { act: rng.pick(['sit', 'read', 'feed_birds', 'sit']), tags: ['bench'], seat: 0.45 }); K.seat(x + dx, WALK_Y, bw0 + 1.0, 'S'); }
  }
  // ---- nav on the sand: along the tide line and along the dry sand, down from the boardwalk stairs
  const tideN = [], dryN = [];
  for (let z = 240; z <= 318; z += 7) { tideN.push(K.node(shoreline(z) + 6, z, 0.25 * (sandLayer(shoreline(z) + 6, z) + 1))); dryN.push(K.node(20, z, 0.25 * (sandLayer(20, z) + 1))); }
  ctx.nav.chain(tideN); ctx.nav.chain(dryN);
  for (let i = 0; i < tideN.length; i += 3) K.link(tideN[i], dryN[i]);
  for (const sx of [-8, 6]) { const n = K.node(sx, bw1 + 3, 0.25 * (sandLayer(sx, bw1 + 3) + 1)); K.link(n, K.nearest(sx, 232, 6)); K.link(n, tideN[0]); K.link(n, dryN[0]); }
  const eastSand = K.path([[80, 238, 0.0], [96, 262, 0.0], [110, 276, 0.0], [120, 256, 0.0]]); K.link(eastSand[0], walkE[1]);
  // beach life: sand castles, a beach umbrella, the closed lifeguard chair, kids at play, the fireworks crowd
  for (const [x, z] of [[-2, 262], [4, 288], [-6, 306]]) {
    const y = sandLayer(x, z) + 1;
    K.B(x, y, z, x + 1, y + 2, z + 1, MAT.sand); K.B(x + 1.25, y, z, x + 1.75, y + 1, z + 0.5, MAT.sand); K.B(x - 0.5, y, z + 1, x, y + 1, z + 1.5, MAT.sand); K.B(x - 1, y, z - 1, x + 2.25, y + 1, z - 0.75, MAT.ball_field);
    for (let k = 0; k < 2; k++) K.spot('stand', x + 1 + k * 1.5, 0.25 * y, z + 2, 'N', { act: 'play', tags: ['play'], label: 'Playing on the beach' });
  }
  { const x = 12, z = 272, y = sandLayer(x, z) + 1; K.B(x, y, z, x + 0.25, y + 8, z + 0.25, MAT.wood_light); wcyl(W, V(x) + 0.5, V(z) + 0.5, 7, y + 8, y + 9, MAT.awning_red); wcyl(W, V(x) + 0.5, V(z) + 0.5, 4, y + 9, y + 10, MAT.awning_yellow);
    K.P('rug_rect', x + 1.5, 0.25 * y, z + 1.5, 'S', { tint: '#c85a4a' }); K.P('laundry_basket', x - 1, 0.25 * y, z + 2, 'S');
    K.spot('sit', x + 2, 0.25 * y, z + 1, 'W', { act: 'read', tags: ['bench'], seat: 0.05, label: 'Enjoying the last warm Saturday' }); }
  { const x = 2, z = 276, y = sandLayer(x, z) + 1;
    for (const [dx, dz] of [[0, 0], [1.5, 0], [0, 1.5], [1.5, 1.5]]) K.B(x + dx, y, z + dz, x + dx + 0.25, y + 9, z + dz + 0.25, MAT.trim_white);
    K.B(x, y + 9, z, x + 1.75, y + 10, z + 1.75, MAT.wood_pale); K.B(x, y + 10, z + 1.5, x + 1.75, y + 14, z + 1.75, MAT.trim_white);
    for (let k = 0; k < 9; k += 2) K.B(x + 0.25, y + k, z - 0.25, x + 1.5, y + k + 1, z, MAT.trim_white);
    K.P(textSignType('NO LIFEGUARD ON DUTY', { bg: '#b3302a', fg: '#f0ece2', border: '#f0ece2' }), x + 0.9, 0.25 * (y + 5), z - 0.3, 'W');
    K.read(x - 0.5, 0.25 * y + 1.2, z + 0.9, { title: 'Beach Notice', body: 'JUNIPER BEACH — TOWN OF JUNIPER BAY PARKS DEPT.\n\nBATHING SEASON CLOSED AFTER LABOR DAY.\nNO LIFEGUARD ON DUTY. Bathe at your own risk.\nWater temperature this morning: 58°.\n\nNo dogs on the sand May–September. (It is September. The dogs know.)' }, { r: 2.2 }); }
  let fw = 0;
  for (let z = 240; z < 320; z += 5.5) { const x = shoreline(z) + 7 + (fw % 2) * 3, y = 0.25 * (sandLayer(x, z) + 1); K.spot('stand', x, y, z, 'W', { act: 'look', tags: ['fireworks'], spread: 2, faceTo: FW, label: 'Waiting for the fireworks' }); fw++; }
  for (let x = -20; x < -3; x += 4.5) { K.spot('stand', x, WALK_Y, 205, 'W', { act: 'look', tags: ['fireworks'], spread: 1, faceTo: FW, link: K.nearest(x, 205, 4) }); }
  for (const [x, z] of picnic) { const s = K.spot('sit', x, 0.0, z - 1.1, 'S', { act: 'eat', tags: ['bench'], seat: 0.45, label: 'Picnicking in the pines' }); void s; }
  for (let k = 0; k < 6; k++) K.spot('stand', 108 + k * 3, 0.0, 256 + (k % 2) * 6, k % 2 ? 'N' : 'S', { act: 'play', tags: ['play'], label: 'At the beach playground' });
  K.spot('sit', 110, 0.0, 252.4, 'S', { act: 'swing', tags: ['play'], seat: 0.4 });
  // ---- the bath house and Playland
  buildBathHouse(ctx);
  buildPlayland(ctx, walkW[0]);
  ctx.landmarks.push({ name: 'Juniper Beach', kind: 'beach', x: 10, z: 290, rect: { x0: 10, z0: 290, x1: 10, z1: 290 }, building: bb });
  finishSite(bb);
  // the causeway to Whitcomb Point starts from the beach at z 300
  ctx.beachNodes = { tide: tideN, dry: dryN };
}

function buildBathHouse(ctx) {
  const lot = { x: V(14), z: V(209), w: 96, d: 80, facing: 'S', y: 1, m: { x0: 14, z0: 209, x1: 38, z1: 229 }, street: 'the Boardwalk', number: 1 };
  const b = new Building(ctx, { name: 'Juniper Beach Bath House', kind: 'bathhouse', lot, address: 'The Boardwalk', established: 1926, lore: 'Built by the Town in 1926. Lockers 10 cents, towels 5.', hours: [10 * 60, 18 * 60] });
  const f = b.f;
  const W = lot.w, D = lot.d, bx = 4, bw = 88, bz = 2, bd = 40, H = 16;
  const X0 = bx + 2, Z0 = bz + 2, IW = bw - 4, ID = bd - 4;
  f.box(0, -2, 0, W, 2, D, MAT.sand); f.box(bx, -2, bz, bw, 2, bd, MAT.stone_foundation);
  shell(f, bx, 0, bz, bw, H, bd, MAT.shingle_wall, MAT.plaster_white, 2);
  slab(f, X0, 0, Z0, IW, ID, MAT.dock_wood);
  f.hip(bx, H, bz, bw, bd, MAT.roof_shingle_green, { overhang: 2 });
  f.box(bx, H - 1, bz - 1, bw, 1, 1, MAT.trim_white);
  // false front with the sign, striped awning over the door
  f.box(16, 10, bz - 1, 64, 18, 1, MAT.trim_white); f.box(15, 27, bz - 2, 66, 1, 2, MAT.sign_blue); f.box(15, 10, bz - 2, 66, 1, 2, MAT.sign_blue);
  f.text('JUNIPER BEACH', W / 2, 21, bz - 2, MAT.sign_red, { align: 'center', font: 'small' });
  f.text('BATH HOUSE', W / 2, 12, bz - 2, MAT.sign_blue, { align: 'center' });
  awning(f, W / 2 - 8, 10, 16, { depth: 4, z: bz, matA: MAT.awning_solid_navy, matB: MAT.canvas_white });
  // rooms: lobby with the ticket window, men's and women's changing rooms
  const lx0 = 36, lx1 = 57;
  partitionZ(f, Z0, Z0 + ID, 1, lx0 - 1, H - 1, MAT.plaster_white, [{ at: Z0 + 16, w: 4 }]);
  partitionZ(f, Z0, Z0 + ID, 1, lx1, H - 1, MAT.plaster_white, [{ at: Z0 + 16, w: 4 }]);
  const lobby = b.room('Lobby', lx0, 1, Z0, lx1 - lx0, H - 1, ID, { lightMode: 'always', public: true });
  const men = b.room('Men\'s Changing Room', X0, 1, Z0, lx0 - 1 - X0, H - 1, ID, { lightMode: 'auto', public: true });
  const women = b.room('Women\'s Changing Room', lx1 + 1, 1, Z0, X0 + IW - lx1 - 1, H - 1, ID, { lightMode: 'auto', public: true });
  doorway(f, W / 2 - 2, 1, bz, 4, 9, { frame: MAT.trim_white, t: 2, step: false });
  b.entrance(lobby, W / 2, 1, bz, { outZ: -4, leaf: 'door_wood', tint: '#1f2f4f', main: true });
  b.door(lobby, men, lx0 - 1, 1, Z0 + 18, { axis: 'z' }); b.door(lobby, women, lx1, 1, Z0 + 18, { axis: 'z' });
  for (const x of [X0 + 4, X0 + 16, lx1 + 6, lx1 + 20]) win(f, x, 8, bz, 6, 3, { frame: MAT.trim_white, t: 2 });
  f.prop(textSignType('MEN', { bg: '#1f2f4f', fg: '#f0ece2' }), X0 + 16, 5, bz - 0.15, 0); f.prop(textSignType('WOMEN', { bg: '#1f2f4f', fg: '#f0ece2' }), lx1 + 16, 5, bz - 0.15, 0);
  const c = counterRun(b, lobby, lx0 + 2, lx1 - 2, 1, Z0 + 14, { rot: 0, register: true });
  b.job('attendant', c.clerk, { shift: ['10:00', '18:00'], title: 'bath house attendant' });
  b.customerSpots = [c.customer];
  f.prop('lockers', lx0 + 3, 1, Z0 + ID - 1.2, 0, {}); f.prop('lockers', lx1 - 3, 1, Z0 + ID - 1.2, 0, {});
  for (const [x0, x1] of [[X0, lx0 - 1], [lx1 + 1, X0 + IW]]) {
    for (let x = x0 + 1; x < x1 - 4; x += 6) { f.box(x, 1, Z0 + ID - 10, 1, 9, 10, MAT.wood_pale); f.box(x + 1, 3, Z0 + ID - 10, 3, 7, 1, MAT.canvas_white); f.box(x, 10, Z0 + ID - 10, 6, 1, 1, MAT.iron); }
    f.box(x0 + 3, 1, Z0 + 12, x1 - x0 - 6, 2, 2, MAT.wood_mid);
    for (let x = x0 + 3; x < x1 - 3; x += 4) f.prop('lockers', x, 1, Z0 + 1.2, 2, {});
  }
  f.box(X0, 1, Z0 + 4, 1, 10, 8, MAT.tile_mint); f.box(X0 + IW - 1, 1, Z0 + 4, 1, 10, 8, MAT.tile_mint);
  f.box(X0 + 1, 9, Z0 + 6, 1, 1, 1, MAT.chrome); f.box(X0 + IW - 2, 9, Z0 + 6, 1, 1, 1, MAT.chrome);
  b.readable(W / 2, 4, Z0 + 13, { title: 'Bath House Prices', body: 'JUNIPER BEACH BATH HOUSE — Town of Juniper Bay, 1926\n\nCheck room & locker ... 10¢\nTowel ... 5¢\nBathing suit for hire (wool, washed daily) ... 15¢\n\nOPEN TODAY FOR THE CENTENNIAL, 10 A.M. to 6 P.M.\nThe bathing season is closed. The attendant will say so twice.' }, { r: 2.2 });
  b.light(W / 2, 9, bz - 2, { mode: 'night', radius: 7 });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// Playland pier: the carousel under its striped tent, the Ferris wheel, a hot dog stand
function buildPlayland(ctx, boardwalkNode) {
  const pl = siteBuilding(ctx, 'Playland Pier', 'amusement', { x0: -95, z0: 222, x1: -22, z1: 246 }, { hours: [10 * 60, 22 * 60 + 30], lore: 'Carousel 1912, Ferris wheel 1925. Five cents a ride, six for a quarter.', street: 'the Boardwalk', est: 1912 });
  const K = new Kit(ctx, pl), W = ctx.world;
  const x0 = -95, x1 = -22, z0 = 222, z1 = 246;
  K.B(x0, 0, z0, x1, 1, z1, MAT.dock_wood_z);
  K.B(x0, -1, z0, x1, 0, z0 + 0.25, MAT.wood_dark); K.B(x0, -1, z1 - 0.25, x1, 0, z1, MAT.wood_dark); K.B(x0, -1, z0, x0 + 0.25, 0, z1, MAT.wood_dark);
  for (let x = x0 + 0.25; x < x1 - 0.5; x += 3) { K.B(x, -1, z0, x + 0.5, 0, z1, MAT.wood_dark); for (let z = z0 + 0.25; z < z1; z += 3) K.B(x, -14, z, x + 0.5, -1, z + 0.5, MAT.wood_post); }
  const rail = (a, b, zz, alongX = true) => {
    if (alongX) { K.B(a, 4, zz, b, 5, zz + 0.25, MAT.trim_white); K.B(a, 2, zz, b, 3, zz + 0.25, MAT.trim_white); for (let x = a; x < b; x += 2) K.B(x, 1, zz, x + 0.25, 4, zz + 0.25, MAT.trim_white); }
    else { K.B(zz, 4, a, zz + 0.25, 5, b, MAT.trim_white); K.B(zz, 2, a, zz + 0.25, 3, b, MAT.trim_white); for (let z = a; z < b; z += 2) K.B(zz, 1, z, zz + 0.25, 4, z + 0.25, MAT.trim_white); }
  };
  rail(x0, -24, z0); rail(x0, -24, z1 - 0.25); rail(z0, z1, x0, false);
  // entrance arch with PLAYLAND in lights
  K.B(-26.5, 1, 223.5, -25.75, 22, 224.25, MAT.trim_red); K.B(-26.5, 1, 243.75, -25.75, 22, 244.5, MAT.trim_red);
  K.B(-26.5, 19, 223.5, -25.75, 28, 244.5, MAT.sign_red);
  K.B(-26.75, 18, 223.25, -25.5, 19, 244.75, MAT.marquee_bulbs); K.B(-26.75, 28, 223.25, -25.5, 29, 244.75, MAT.marquee_bulbs);
  worldText(ctx, 'PLAYLAND', 'E', V(-25.75), V(234), 20, MAT.marquee_bulbs, { font: 'big' });
  worldText(ctx, 'PLAYLAND', 'W', V(-26.5) - 1, V(234), 20, MAT.marquee_bulbs, { font: 'big' });
  // ---- the carousel
  const ccx = V(-44), ccz = V(234);
  wcyl(W, ccx, ccz, 20, 1, 2, MAT.stage_wood); wcyl(W, ccx, ccz, 20.5, 1, 2, MAT.marquee_bulbs, 1);
  wcyl(W, ccx, ccz, 4, 2, 22, MAT.mirror); for (const y of [6, 12, 18]) wcyl(W, ccx, ccz, 4.5, y, y + 1, MAT.marquee_bulbs);
  const horses = [];
  for (const [r, n, off] of [[16, 10, 0], [11, 8, 0.4]]) for (let k = 0; k < n; k++) {
    const a = off + k * 2 * Math.PI / n, px = ccx + r * Math.cos(a), pz = ccz + r * Math.sin(a);
    W.box(Math.floor(px), 2, Math.floor(pz), Math.floor(px) + 1, 22, Math.floor(pz) + 1, MAT.trim_gold);
    horses.push([px / 4, pz / 4, a]);
  }
  const tints = ['#f0ece2', '#2a2a2e', '#8a5a3a', '#d8c8a0', '#b0b0b0'];
  horses.forEach(([hx, hz, a], i) => K.P('horse', hx, 0.25 + (i % 2 ? 0.35 : 0.6), hz, Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2)) - Math.PI / 2 + Math.PI / 2, { scale: 0.52, tint: tints[i % tints.length] }));
  wcyl(W, ccx, ccz, 22, 20, 22, MAT.awning_red, 1); wcyl(W, ccx, ccz, 22.5, 20, 21, MAT.marquee_bulbs, 1);
  for (let k = 0; k < 9; k++) wcyl(W, ccx, ccz, 22 - k * 2.4, 22 + k, 23 + k, k % 2 ? MAT.awning_red : MAT.awning_yellow);
  W.box(ccx - 1, 31, ccz - 1, ccx + 1, 35, ccz + 1, MAT.trim_gold); W.box(ccx, 33, ccz, ccx + 1, 34, ccz + 4, MAT.sign_red);
  K.light(-44, 4.5, 234, { color: [1, 0.85, 0.6], radius: 14, mode: 'night' });
  // ---- the Ferris wheel (axle along x, the wheel faces the boardwalk)
  const fx = V(-73), fz = V(234), fy = 46, R = 36;
  const rimPts = (r, vx) => { const pts = []; for (let i = 0; i < 360; i++) { const a = i * Math.PI / 180; pts.push([vx, Math.floor(fy + r * Math.sin(a)), Math.floor(fz + r * Math.cos(a))]); } return pts; };
  for (const vx of [fx - 3, fx + 3]) { const pts = rimPts(R, vx); drawVox(W, pts.filter((p) => Math.abs(p[1] - fy) > R * 0.7), MAT.steel_red, 2); drawVox(W, pts.filter((p) => Math.abs(p[1] - fy) <= R * 0.7), MAT.steel_red, 1); }
  { const pts = rimPts(R + 1, fx - 4); drawVox(W, pts.filter((p) => Math.abs(p[1] - fy) > R * 0.7), MAT.marquee_bulbs, 2); drawVox(W, pts.filter((p) => Math.abs(p[1] - fy) <= R * 0.7), MAT.marquee_bulbs, 1); }
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6, ty = fy + (R - 0.5) * Math.sin(a), tz = fz + (R - 0.5) * Math.cos(a);
    wline(W, [fx - 3, fy, fz], [fx - 3, ty, tz], k % 2 ? MAT.marquee_bulbs : MAT.steel_white);
    wline(W, [fx + 3, fy, fz], [fx + 3, ty, tz], MAT.steel_white);
  }
  W.box(fx - 5, fy - 2, fz - 2, fx + 5, fy + 2, fz + 2, MAT.steel); W.box(fx - 7, fy - 1, fz - 1, fx + 7, fy + 1, fz + 1, MAT.iron);
  for (const vx of [fx - 7, fx + 6]) { wline(W, [vx, 1, fz - 22], [vx, fy, fz - 1], MAT.steel_white); wline(W, [vx, 1, fz + 22], [vx, fy, fz + 1], MAT.steel_white); W.box(vx, 20, fz - 13, vx + 1, 21, fz + 13, MAT.steel_white); }
  const gcol = [MAT.sign_red, MAT.sign_yellow, MAT.sign_blue, MAT.sign_green, MAT.sign_orange, MAT.sign_teal];
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6 + Math.PI / 12, py = Math.round(fy + R * Math.sin(a)), pz = Math.round(fz + R * Math.cos(a));
    W.box(fx - 1, py - 2, pz, fx + 1, py + 1, pz + 1, MAT.iron);
    W.box(fx - 2, py - 7, pz - 3, fx + 3, py - 6, pz + 3, gcol[k % 6]); W.box(fx - 2, py - 6, pz - 3, fx + 3, py - 4, pz - 2, gcol[k % 6]); W.box(fx - 2, py - 6, pz + 2, fx + 3, py - 4, pz + 3, gcol[k % 6]);
    W.box(fx - 2, py - 3, pz - 3, fx + 3, py - 2, pz + 3, gcol[(k + 2) % 6]);
  }
  W.box(fx - 6, 1, fz - 6, fx + 6, 2, fz + 6, MAT.wood_mid);
  K.light(-73, 11.5, 234, { color: [1, 0.75, 0.55], radius: 24, mode: 'night' });
  // ---- hot dog stand, games, carts, benches
  const stand = [];
  { const hx0 = -38, hx1 = -32, hz0 = 243, hz1 = 245.75;
    K.B(hx0, 1, hz0, hx1, 12, hz1, MAT.trim_white); K.B(hx0 + 0.25, 1, hz0 + 0.25, hx1 - 0.25, 12, hz1 - 0.25, 0);
    K.B(hx0 + 0.5, 4, hz0, hx1 - 0.5, 9, hz0 + 0.25, 0); K.B(hx0 + 0.5, 4, hz0 - 0.25, hx1 - 0.5, 5, hz0, MAT.counter_red);
    K.B(hx0 - 0.25, 12, hz0 - 0.5, hx1 + 0.25, 13, hz1 + 0.25, MAT.roof_tar); K.B(hx0, 9, hz0 - 1, hx1, 11, hz0, MAT.awning_red);
    K.B(hx0, 13, hz0, hx1, 16, hz0 + 0.25, MAT.sign_yellow);
    worldText(ctx, 'HOT DOGS', 'N', V(hz0) - 1, V((hx0 + hx1) / 2), 13, MAT.sign_red);
    K.B(hx1 - 0.25, 1, hz0 + 0.75, hx1, 9, hz0 + 1.75, 0);
    const r = K.room('Hot Dog Stand', hx0 + 0.25, 1, hz0 + 0.25, hx1 - 0.25, 12, hz1 - 0.25, { public: true });
    const dn = K.door(r, null, hx1 - 0.1, 1, hz0 + 1.25); const on = K.node(hx1 + 1, hz0 + 1.25); K.link(dn, on); stand.push(on);
    K.P('hot_dog_cart', hx0 + 1.5, WALK_Y, hz0 + 1.3, 'N'); K.P('coffee_urn', hx1 - 1.2, 1.0, hz0 + 1.8, 'N');
    const v = K.spot('stand', (hx0 + hx1) / 2 + 0.6, WALK_Y, hz0 + 1.0, 'N', { room: r, act: 'counter', tags: ['work'], lines: ['Hot dogs! Fifteen cents! Mustard, relish, onions!', 'Get \'em before the fireworks, folks!'] });
    pl.job('vendor', v, { shift: ['11:00', '22:30'], outfit: 'cook', title: 'hot dog man' });
    for (const dx of [-1, 1]) K.spot('stand', (hx0 + hx1) / 2 + dx * 1.2, WALK_Y, hz0 - 1.2, 'S', { act: 'talk', tags: ['customer', 'shop'] });
    K.P(textSignType('HOT DOGS 15 CENTS - SODA POP - CORN', { bg: '#f0ece2', fg: '#b3302a', border: '#b3302a' }), (hx0 + hx1) / 2, 2.7, hz0 - 0.05, 'N');
    K.read((hx0 + hx1) / 2, 1.3, hz0 - 0.6, { title: 'Hot Dog Stand', body: 'FRANKFURTS 15¢ · WITH KRAUT 20¢\nFRIED CLAMS 35¢ · CORN ON THE COB 10¢\nBIRCH BEER · ORANGE CRUSH · MOXIE 5¢\n\n"Serving Playland since 1931 — ask for the Centennial Special (it\'s two hot dogs)."' }, { r: 2.2 });
  }
  K.P('ring_toss', -56, WALK_Y, 243.5, 'N'); K.P('cotton_candy_cart', -60, WALK_Y, 224.8, 'S'); K.P('popcorn_cart', -33, WALK_Y, 224.8, 'S'); K.P('balloon_bunch', -52, WALK_Y, 225, 'S'); K.P('ice_cream_cart', -86, WALK_Y, 243.5, 'N');
  for (const x of [-64, -82, -90]) { K.P('bench_park', x, WALK_Y, 245.2, 'N'); K.spot('sit', x, WALK_Y, 244.9, 'N', { act: 'sit', tags: ['bench'], seat: 0.45 }); K.seat(x, WALK_Y, 244.9, 'N'); }
  for (let x = -30; x > x0 + 4; x -= 16) { K.P('street_lamp', x, WALK_Y, z0 + 0.7, 'S'); K.P('street_lamp', x - 8, WALK_Y, z1 - 0.7, 'N'); }
  // strings of bulbs from the arch to the carousel and the wheel
  const bulbs = (a, b) => { lineVox(a, b).forEach((p, i) => W.box(p[0], p[1], p[2], p[0] + 1, p[1] + 1, p[2] + 1, i % 4 ? MAT.iron : MAT.bulb_warm)); };
  bulbs([V(-26), 27, V(224)], [ccx + 8, 30, ccz - 20]); bulbs([V(-26), 27, V(244)], [ccx + 8, 30, ccz + 20]);
  bulbs([ccx - 8, 30, ccz - 20], [fx, fy + 8, fz - 28]); bulbs([ccx - 8, 30, ccz + 20], [fx, fy + 8, fz + 28]);
  // ---- nav and spots
  const loop = K.path([[-23, 232], [-30, 227], [-40, 226.5], [-52, 226.5], [-64, 226], [-80, 225.5], [-91, 229], [-91, 239], [-80, 243], [-66, 242.5], [-52, 242], [-40, 241.5], [-30, 240], [-23, 236]], { step: 6 });
  K.link(loop[loop.length - 1], loop[0]); K.link(loop[0], boardwalkNode);
  for (const n of stand) { let best = -1, bd = 1e9; for (const q of loop) { const d = Math.hypot(ctx.nav.x[q] - ctx.nav.x[n], ctx.nav.z[q] - ctx.nav.z[n]); if (d < bd) { bd = d; best = q; } } K.link(n, best); }
  const cop = K.spot('stand', -44, WALK_Y, 227.6, 'N', { act: 'counter', tags: ['work'], lines: ['Round and round, five cents a ride!', 'Hold the pole, sweetheart. Both hands.'] });
  pl.job('carousel operator', cop, { shift: ['10:00', '22:30'], title: 'runs the carousel' });
  const fop = K.spot('stand', -69.5, WALK_Y, 230, 'W', { act: 'counter', tags: ['work'], lines: ['Keep your hands inside the car!', 'Best view of the fireworks in town — from the top!'] });
  pl.job('wheel operator', fop, { shift: ['10:00', '22:30'], title: 'runs the Ferris wheel' });
  const rt = K.spot('stand', -56, WALK_Y, 242.2, 'N', { act: 'wave', tags: ['work'], lines: ['Three rings a dime! Everybody wins something!', 'Ring the bottle, win a kewpie!'] });
  pl.job('barker', rt, { shift: ['12:00', '22:00'], title: 'ring toss barker' });
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; K.spot('stand', -44 + 6.6 * Math.cos(a), WALK_Y, 234 + 6.6 * Math.sin(a), 'N', { act: k % 2 ? 'play' : 'cheer', tags: ['play'], label: 'At the carousel', yaw: a + Math.PI / 2 }); }
  for (const x of [-70, -76]) K.spot('stand', x, WALK_Y, 228.2, 'S', { act: 'wait', tags: ['browse'], label: 'In line for the Ferris wheel' });
  for (let x = -34; x > -92; x -= 7) K.spot('stand', x, WALK_Y, 223.4, 'N', { act: 'look', tags: ['fireworks'], spread: 1.5, faceTo: FW, label: 'Watching the fireworks from Playland' });
  K.read(-27.2, 1.4, 226, { title: 'Playland', body: 'PLAYLAND PIER — JUNIPER BEACH\n\nThe Carousel (Philadelphia Toboggan Co., 1912) — 5¢\nThe Big Wheel (Eli Bridge Co., 1925) — 10¢\nSix rides for a quarter.\n\nCENTENNIAL HOURS: 10 A.M. until the fireworks are over.\nLost children will be kept at the hot dog stand and fed.' }, { r: 2.4 });
  finishSite(pl);
}

// ============================================================ WHITCOMB POINT LIGHT (x -150, z 300), the keeper's cottage and the causeway
function buildLighthouse(ctx) {
  defineHarborProps();
  const b = siteBuilding(ctx, 'Whitcomb Point Light', 'lighthouse', { x0: -162, z0: 288, x1: -136, z1: 312 }, { est: 1868, street: 'Whitcomb Point', address: 'Whitcomb Point', lore: 'Fixed white light, visible 14 miles. First lit 1868, paid for by public subscription. Kept by Amos Fisk since 1921.' });
  const K = new Kit(ctx, b), W = ctx.world, rng = ctx.rng.fork('light');
  // ---- the islet: rough granite, a grassy top at 0.75 m
  const levels = [[-16, -9, 17], [-9, -6, 15.5], [-6, -3, 14], [-3, 0, 12.8], [0, 2, 12]];
  for (const [y0, y1, r] of levels) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + rng.float(-0.3, 0.3), cx = -149 + Math.cos(a) * r * 0.35, cz = 300 + Math.sin(a) * r * 0.35;
    const hx = r * rng.float(0.55, 0.8), hz = r * rng.float(0.55, 0.8);
    K.B(cx - hx, y0, cz - hz, cx + hx, y1 + (y1 === 2 ? 0 : rng.int(0, 1)), cz + hz, MAT.rock);
  }
  K.B(-161, 2, 290, -136, 3, 310, MAT.grass_dry);
  for (let k = 0; k < 14; k++) { const a = rng.float(0, 6.28), r = rng.float(11, 15); K.P('rock_big', -149 + Math.cos(a) * r, rng.float(-0.4, 0.4), 300 + Math.sin(a) * r, rng.float(0, 6), { scale: rng.float(0.8, 1.6), cat: 'far' }); }
  K.B(-140, 2, 299, -136, 3, 301, MAT.gravel); K.B(-150, 2, 299.25, -140, 3, 300.75, MAT.gravel);
  // ---- the causeway from the beach: granite core, paved top, armour stone both sides
  const xs = shoreline(300), cx0 = -137, cx1 = xs + 10;
  K.B(cx0 - 1, -14, 298.5, cx1, 0, 301.5, MAT.quay_stone); K.B(cx0 - 1, 0, 298.5, cx1, 1, 301.5, MAT.granite);
  K.B(cx0 - 1, 0, 298.5, cx1, 1, 298.75, MAT.quay_stone); K.B(cx0 - 1, 0, 301.25, cx1, 1, 301.5, MAT.quay_stone);
  for (let x = cx0; x < cx1 - 1; x += 2) {
    K.B(x, -12, 296 - rng.float(0, 1.5), x + rng.float(1.5, 2.5), -rng.int(0, 3), 298.5, MAT.rock);
    K.B(x + 0.5, -12, 301.5, x + rng.float(1.5, 2.5), -rng.int(0, 3), 304 + rng.float(0, 1.5), MAT.rock);
  }
  K.B(-138, 1, 298.5, -136, 2, 301.5, MAT.granite);
  { const tl = sandLayer(cx1, 300); for (let y = -1, k = 0; y > tl; y--, k++) K.B(cx1 + k * 0.75, y, 298.5, cx1 + (k + 1) * 0.75, y + 1, 301.5, MAT.granite); }
  for (let x = cx0 + 6; x < cx1 - 4; x += 20) K.P('street_lamp', x, WALK_Y, 301.1, 'N');
  const cw = K.path([[cx1 + 4, 300, 0.25 * (sandLayer(cx1 + 4, 300) + 1)], [cx1 - 1, 300], [cx0 + 1, 300], [-138.4, 300, 0.75]], { step: 8 });
  if (ctx.beachNodes) { const t = ctx.beachNodes.tide; let best = t[0], bd = 1e9; for (const n of t) { const d = Math.abs(ctx.nav.z[n] - 300); if (d < bd) { bd = d; best = n; } } K.link(cw[0], best); }
  const islet = cw[cw.length - 1];
  // ---- the tower: white conical brick, spiral stair, gallery and black lantern
  const TX = -620, TZ = 1200;
  wcyl(W, TX, TZ, 15, 2, 4, MAT.granite);
  for (let y = 4; y < 62; y += 4) { const r = 13 - 3 * (y - 4) / 58; wcyl(W, TX, TZ, r, y, Math.min(62, y + 4), MAT.stucco_white, 2); }
  wcyl(W, TX, TZ, 11.5, 58, 62, MAT.stucco_white, 2.5);
  W.box(-611, 4, 1198, -605, 13, 1202, 0); W.box(-608, 13, 1197, -605, 14, 1203, MAT.trim_black);
  for (const [y, dx, dz] of [[20, 0, 1], [34, -1, 0], [48, 0, -1], [27, 1, 0]]) {
    const r = 13 - 3 * (y - 4) / 58, vx = Math.floor(TX + dx * (r - 0.5)), vz = Math.floor(TZ + dz * (r - 0.5));
    if (dx) { W.box(vx - 2 * dx, y, TZ, vx + 1, y + 3, TZ + 1, 0); W.box(vx, y, TZ, vx + 1, y + 3, TZ + 1, MAT.glass); }
    else { W.box(TX, y, vz - 2 * dz, TX + 1, y + 3, vz + 1, 0); W.box(TX, y, vz, TX + 1, y + 3, vz + 1, MAT.glass); }
  }
  // spiral stair: 58 treads round a newel, 16 to the turn, starting on the south side
  const a0 = Math.PI / 2, sect = 2 * Math.PI / 16;
  const rows = new Map();
  for (let vz = TZ - 8; vz < TZ + 8; vz++) for (let vx = TX - 8; vx < TX + 8; vx++) {
    const dx = vx + 0.5 - TX, dz = vz + 0.5 - TZ, r = Math.hypot(dx, dz);
    if (r < 2.3 || r > 7.6) continue;
    const rel = ((Math.atan2(dz, dx) - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const k = Math.floor(rel / sect);
    for (let t = 0; t < 4; t++) { const i = 16 * t + k; if (i >= 58) continue; const key = (4 + i) + ',' + vz; let a = rows.get(key); if (!a) rows.set(key, a = []); a.push(vx); }
  }
  for (const [key, xs2] of rows) { const [y, vz] = key.split(',').map(Number); drawVox(W, xs2.map((x) => [x, y, vz]), MAT.iron, 0); }
  wcyl(W, TX, TZ, 2.2, 4, 62, MAT.iron);
  // lantern floor & gallery at layer 62, with the stairwell left open over the last ten treads
  const fl = [];
  for (let vz = TZ - 14; vz < TZ + 14; vz++) for (let vx = TX - 14; vx < TX + 14; vx++) {
    const dx = vx + 0.5 - TX, dz = vz + 0.5 - TZ, r = Math.hypot(dx, dz);
    if (r > 14) continue;
    const rel = ((Math.atan2(dz, dx) - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    if (r >= 2.3 && r <= 8.2 && rel < 10 * sect) continue;
    fl.push([vx, 62, vz]);
  }
  drawVox(W, fl, MAT.iron, 0);
  wcyl(W, TX, TZ, 14, 64, 65, MAT.iron, 1); wcyl(W, TX, TZ, 14, 66, 67, MAT.iron, 1);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; W.box(Math.floor(TX + 13.5 * Math.cos(a)), 63, Math.floor(TZ + 13.5 * Math.sin(a)), Math.floor(TX + 13.5 * Math.cos(a)) + 1, 66, Math.floor(TZ + 13.5 * Math.sin(a)) + 1, MAT.iron); }
  wcyl(W, TX, TZ, 7, 63, 65, MAT.trim_black, 1); wcyl(W, TX, TZ, 7, 65, 73, MAT.glass, 1); wcyl(W, TX, TZ, 7.5, 73, 74, MAT.trim_black);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; const vx = Math.floor(TX + 6.6 * Math.cos(a)), vz = Math.floor(TZ + 6.6 * Math.sin(a)); W.box(vx, 65, vz, vx + 1, 73, vz + 1, MAT.trim_black); }
  for (let k = 0; k < 6; k++) wcyl(W, TX, TZ, 8 - k * 1.35, 74 + k, 75 + k, MAT.trim_black);
  W.box(TX - 1, 80, TZ - 1, TX + 1, 82, TZ + 1, MAT.trim_black); W.box(TX, 82, TZ, TX + 1, 88, TZ + 1, MAT.iron);
  W.box(TX + 5, 63, TZ - 1, TX + 8, 72, TZ + 1, 0);                                   // door out to the gallery (east)
  wcyl(W, TX, TZ, 1.5, 63, 65, MAT.trim_gold); wcyl(W, TX, TZ, 2.3, 65, 71, MAT.lighthouse_lamp); wcyl(W, TX, TZ, 1.6, 71, 72, MAT.trim_gold);
  K.light(-155, 16.9, 300, { color: [1, 0.96, 0.82], radius: 48, mode: 'night' });
  K.light(-155, 17.2, 300, { color: [1, 0.92, 0.75], radius: 9, mode: 'night' });
  // plaque by the tower door
  K.P('hb_plaque', -151.6, 1.9, 301.3, 'E');
  K.read(-151.2, 1.9, 301.3, { title: 'Whitcomb Point Light', body: 'WHITCOMB POINT LIGHT\nFirst lit October 1868\n\nERECTED BY PUBLIC SUBSCRIPTION OF THE CITIZENS OF JUNIPER BAY\nin memory of the eleven of the schooner MARY ELLEN\n"That none be lost again upon Gannet Ledge."\n\nFixed white light · 64 ft. above high water · visible 14 miles\nFourth-order Fresnel lens, Henry-Lepaute, Paris, 1867' }, { r: 2.2 });
  // ---- the covered passage and the keeper's cottage (Cape, facing the causeway)
  K.B(-152.5, 3, 298.75, -150, 4, 301.25, MAT.stone_foundation);
  K.B(-152.5, 4, 298.5, -150, 13, 298.75, MAT.siding_white); K.B(-152.5, 4, 301.25, -150, 13, 301.5, MAT.siding_white);
  K.B(-152.75, 13, 298.25, -150, 14, 301.75, MAT.roof_shingle_red); K.B(-151.75, 7, 298.5, -151, 10, 298.75, MAT.glass);
  const cf = new Frame(ctx, V(-150), 3, V(294), 'E', 48, 40, { building: b });
  const trim = MAT.trim_green, sid = MAT.siding_white, pl = MAT.plaster_cream;
  cf.box(-2, -3, -2, 52, 3, 44, MAT.stone_foundation);
  shell(cf, 0, 0, 0, 48, 12, 40, sid, pl, 2);
  cf.box(2, 0, 2, 44, 1, 36, MAT.floor_pine);
  lowGable(cf, 0, 12, 0, 48, 40, MAT.roof_shingle_red, sid, 2, 2);
  win(cf, 22, 14, 0, 4, 4, { frame: MAT.trim_white, t: 2, style: 'cross' }); cf.box(-2, 11, -1, 52, 1, 1, MAT.trim_white);
  cf.box(40, 0, 26, 4, 34, 4, MAT.brick_red); cf.box(39, 34, 25, 6, 1, 6, MAT.stone_foundation); cf.carve(41, 33, 27, 2, 2, 2);
  for (const x of [0, 47]) cf.box(x, 0, -1, 1, 12, 1, MAT.trim_white);
  // interior walls: a hall straight through from the front door to the tower passage
  partitionZ(cf, 2, 38, 1, 19, 11, pl, [{ at: 6, w: 4 }, { at: 28, w: 4 }]);
  partitionZ(cf, 2, 38, 1, 28, 11, pl, [{ at: 6, w: 4 }, { at: 28, w: 4 }]);
  partitionX(cf, 2, 19, 1, 18, 11, pl, []); partitionX(cf, 29, 46, 1, 16, 11, pl, []);
  doorway(cf, 22, 1, 0, 4, 9, { frame: MAT.trim_white, t: 2, step: false, transom: true });
  cf.carve(22, 1, 38, 4, 9, 2);
  const wo = { frame: MAT.trim_white, t: 2, shutters: trim };
  win(cf, 7, 4, 0, 4, 6, wo); win(cf, 13, 4, 0, 4, 6, wo); win(cf, 33, 4, 0, 4, 6, wo); win(cf, 40, 4, 0, 4, 6, wo);
  const Lf = cf.faceFrame('left'), Rf = cf.faceFrame('right'), Bf = cf.faceFrame('back');
  win(Lf, 40 - 12, 4, 0, 4, 6, wo); win(Lf, 40 - 32, 4, 0, 4, 6, wo); win(Rf, 8, 4, 0, 4, 6, wo); win(Rf, 30, 4, 0, 4, 6, wo);
  win(Bf, 48 - 12, 4, 0, 4, 6, wo); win(Bf, 48 - 40, 4, 0, 4, 6, wo);
  // rooms (world bounds from the frame)
  const RM = (name, x, z, sx, sz, o = {}) => { const bb2 = cf.wbox(x, 1, z, sx, 11, sz); return K.vroom(name, bb2[0], bb2[1], bb2[2], bb2[3], bb2[4], bb2[5], { lightMode: 'auto', public: false, ...o }); };
  const parlour = RM('Parlor', 2, 2, 17, 16), bedroomR = RM('Bedroom', 2, 19, 17, 19), office = RM('Keeper\'s Office', 29, 2, 17, 14), kitchen = RM('Kitchen', 29, 17, 17, 21), hall = RM('Front Hall', 20, 2, 8, 36);
  const tower = K.vroom('Tower Stair', TX - 10, 4, TZ - 10, TX + 10, 62, TZ + 10, { lightMode: 'auto', public: true, lightColor: [1, 0.9, 0.75], nav: [TZ, TX + 8] });
  const lantern = K.vroom('Lantern Room', TX - 7, 63, TZ - 7, TX + 7, 73, TZ + 7, { lightMode: 'never', public: true, nav: [TZ, TX + 4.5] });
  const M = (x, z, y = 1) => cf.m(x, y, z);
  const Dr = (ra, rb, x, z, wall) => { const p = M(x, z); return K.door(ra, rb, p[0], 4, p[2], { wall, leaf: 'door_wood' }); };
  Dr(hall, parlour, 19, 8, 'x'); Dr(hall, bedroomR, 19, 30, 'x'); Dr(hall, office, 28, 8, 'x'); Dr(hall, kitchen, 28, 30, 'x');
  const td = K.door(hall, tower, -151.9, 4, 300, { wall: 'z', leaf: 'door_wood', tint: '#2a4a3a' });
  void td;
  const tl = K.b.roomNode.get(tower), ll = K.b.roomNode.get(lantern);
  K.link(tl, ll);
  const gallery = K.node(-151.9, 300, 15.75); K.link(gallery, ll);
  // the front door onto the islet
  const fd = K.door(hall, null, -140.2, 4, 300, { wall: 'z', leaf: 'door_wood', tint: '#2a4a3a' });
  const out = K.node(-138.8, 300, 0.75); K.link(fd, out); K.link(out, islet);
  b.entrances.push({ node: out, door: fd, pos: [-138.8, 0.75, 300], main: true }); b.mainEntrance = out;
  K.light(-139.6, 3.3, 301.3, { mode: 'night', radius: 6 });
  // ---- furnishing (cf local rot: 0 = east/front, 1 = north, 2 = west/back, 3 = south)
  const SP = (pose, x, z, rot, o) => { const p = M(x, z); return K.spot(pose, p[0], p[1], p[2], 0, { ...o, yaw: cf.yaw(rot) }); };
  // parlour: Opal's rocker and her knitting, Amos's chair, the radio
  cf.prop('rug_oval', 10, 1, 10, 0, { tint: '#6a3a2e' });
  cf.prop('rocking_chair', 6, 1, 12, 1, {}); cf.prop('armchair', 14.5, 1, 12, 3, { tint: '#5a4a3a' });
  cf.prop('radio_console', 10.5, 1, 16.6, 0, {}); cf.prop('table_side', 10.5, 1, 4, 0, {}); cf.prop('lamp_table', 10.5, 3.4, 4, 0, {});
  cf.prop('laundry_basket', 4.5, 1, 14, 0, { tint: '#d8c040' }); cf.prop('photo_frames', 2.6, 6, 9, 1, {}); cf.prop('clock_wall', 10.5, 8, 17.4, 0, {}); cf.prop('ship_model_case', 3.5, 1, 4, 1, {});
  const knit = SP('sit', 6, 12, 1, { room: parlour, act: 'knit', tags: ['lounge'], seat: 0.45, label: 'Knitting for the Kaminski baby' });
  const read = SP('sit', 14.5, 12, 3, { room: parlour, act: 'read', tags: ['lounge'], seat: 0.42 });
  const kp = M(5, 14); K.read(kp[0], 1.6, kp[2], { title: 'Opal\'s Knitting Basket', body: 'A basket of yarn by the rocker. On top, a half-finished baby sweater in yellow — for the Kaminskis. (She has already done one in pink and one in blue, to be safe.)\n\nUnderneath is a school composition book. Since 1921 Opal Fisk has written in it the name of every baby in Juniper Bay she has knitted for, and what she made. The first entry: "No. 1 — Doane, Ernest Jr. — bonnet & booties." The last: "No. 1,114 — Kaminski — ?"' }, { r: 2 });
  // office: the log, the barometer, the spare lamp
  cf.prop('writing_desk', 37, 1, 3.6, 2, {}); cf.prop('chair_wood', 37, 1, 6.4, 0, {}); cf.prop('bookshelf', 45, 1, 9, 3, {}); cf.prop('barometer', 30, 6, 9, 1, {}); cf.prop('lamp_desk', 35.5, 3.6, 3.6, 2, {});
  const desk = SP('sit', 37, 6.4, 0, { room: office, act: 'write', tags: ['work', 'desk'], seat: 0.45 });
  const lp = M(37, 3.6); K.read(lp[0], 1.9, lp[2], { title: 'The Keeper\'s Log', body: 'WHITCOMB POINT LIGHT — JOURNAL OF THE KEEPER\n\nSept. 25, 1953. Wind SW light, fair. Lit 5:40 P.M., extinguished 5:43 A.M. Polished lens. Painted gallery rail (2nd coat). 3 schooners and the GRAY LADY passed in.\n\nSept. 26. Wind SW, fair and warm. Fleet in at 6. Opal to town for the Centennial — says she will bring back a pie and all the news. Barge for the fireworks anchored off the inner harbor at 2. Must mind the light — the smoke will lie on the water tonight.\n\nThirty-two years, and I have not missed a night. — A. Fisk' }, { r: 2 });
  // kitchen: range, icebox, sink, the table for two
  cf.prop('stove', 45, 1, 34, 3, {}); cf.prop('icebox', 45, 1, 21, 3, {}); cf.prop('kitchen_sink', 38, 1, 37, 2, {}); cf.prop('kitchen_counter', 34, 1, 37, 2, {}); cf.prop('cabinet_upper', 36, 7, 37.4, 2, {});
  cf.prop('table_kitchen', 36, 1, 26, 0, { tint: '#e8e0d0' }); cf.prop('chair_kitchen', 36, 1, 23.4, 2, { tint: '#3a6a5a' }); cf.prop('chair_kitchen', 36, 1, 28.6, 0, { tint: '#3a6a5a' });
  cf.prop('teapot_set', 36, 3.2, 26, 0, {}); cf.prop('food_pie', 34.5, 3.2, 26.5, 0, {}); cf.prop('clock_wall', 29.6, 7, 26, 1, {});
  const d1 = SP('sit', 36, 23.4, 2, { room: kitchen, act: 'eat', tags: ['dine'], seat: 0.45 }), d2 = SP('sit', 36, 28.6, 0, { room: kitchen, act: 'eat', tags: ['dine'], seat: 0.45 });
  const cook = SP('stand', 42.4, 34, 1, { room: kitchen, act: 'cook', tags: ['cook'] }), wash = SP('stand', 38, 34.4, 2, { room: kitchen, act: 'wash', tags: ['wash'] });
  // bedroom: the double bed under the quilt Opal made in 1922
  cf.prop('bed_double', 10.5, 1, 37.4 - 4.2, 0, { tint: '#c86a6a' }); cf.prop('nightstand', 5.5, 1, 36.2, 0, {}); cf.prop('lamp_table', 5.5, 3.4, 36.2, 0, {});
  cf.prop('dresser', 16.5, 1, 22, 3, {}); cf.prop('wardrobe', 3.2, 1, 22, 1, {}); cf.prop('rug_rect', 10.5, 1, 26, 0, { tint: '#3a4a6a' });
  const s1 = SP('sleep', 9.2, 29.8, 0, { room: bedroomR, act: 'sleep', tags: ['sleep'], seat: 0.55 }), s2 = SP('sleep', 11.8, 29.8, 0, { room: bedroomR, act: 'sleep', tags: ['sleep'], seat: 0.55 });
  // hall: oilskins, the list of keepers
  cf.prop('coat_rack', 21.5, 1, 4, 0, { tint: '#e0c030' }); cf.prop('umbrella_stand', 26.5, 1, 4, 0, {}); cf.prop('hat_rack_wall', 27.4, 6, 12, 3, {});
  const hp = M(20.6, 16); K.read(hp[0], 1.8, hp[2], { title: 'Keepers of Whitcomb Point Light', body: 'KEEPERS OF WHITCOMB POINT LIGHT\n(lettered by hand on a board by the door)\n\nJonas Crowell, 1868–1891\nEben Crowell, his son, 1891–1907\nSilas Hallett, 1907–1921\nAmos Fisk, 1921 —\n\nBelow, in pencil: "Sept. 21, 1938 — lamp lit through the whole of it. Boathouse gone, dory found at Pembroke. Opal and I are well. — A.F."' }, { r: 2 });
  // ---- outdoors: fog bell, oil house, the boathouse ruin, washing, a bench facing the sea
  K.B(-158, 3, 307.5, -157.75, 12, 307.75, MAT.wood_dark); K.B(-155.75, 3, 307.5, -155.5, 12, 307.75, MAT.wood_dark); K.B(-158, 12, 307.5, -155.5, 13, 307.75, MAT.wood_dark);
  K.P('bell_brass', -156.75, 2.2, 307.6, 'S', { scale: 1.3 });
  K.B(-146, 3, 306.75, -143.5, 11, 309, MAT.brick_red); K.B(-146.25, 11, 306.5, -143.25, 12, 309.25, MAT.roof_slate); K.B(-145.25, 3, 306.5, -144.25, 9, 306.75, MAT.trim_dark);
  worldText(ctx, '1890', 'N', V(306.75) - 1, V(-144.75), 9, MAT.trim_white);
  K.B(-161, 2, 303, -156.5, 5, 303.25, MAT.stone_foundation); K.B(-161, 2, 303, -160.75, 4, 309, MAT.stone_foundation); K.B(-161, 2, 308.75, -157, 3, 309, MAT.stone_foundation); K.B(-157, 2, 303, -156.75, 3, 306, MAT.stone_foundation);
  K.read(-158.5, 1.2, 304, { title: 'The Old Boathouse', body: 'Granite footings are all that is left of the keeper\'s boathouse, carried off whole in the hurricane of September 21, 1938.\n\nThe station dory turned up three days later on the beach at Pembroke, upside down and without a scratch. Amos rowed her home.' }, { r: 2.4 });
  K.P('dory', -159.5, 0.75, 296, 0.5, { tint: '#d8cfa8' }); K.P('rope_coil', -157.5, 0.75, 294.5, 'S');
  K.P('laundry_line', -145, 0.75, 291.4, 'S', { tint: '#e8e0d0', tint2: '#6a8ac8' }); K.P('flag_pole', -137.6, 0.75, 296.5, 'S');
  K.B(-141, 2, 303.5, -137.5, 3, 306.5, MAT.dirt); for (const [x, z] of [[-140, 304.2], [-138.6, 305.6], [-139.4, 305]]) K.P('pumpkin', x, 0.75, z, rng.float(0, 6));
  K.P('garden_bench', -147, 0.75, 309.2, 'S');
  const bench = K.spot('sit', -147, 0.75, 309, 'S', { act: 'sit', tags: ['bench'], seat: 0.45, link: islet });
  K.seat(-147, 0.75, 309, 'S');
  const yard1 = K.spot('stand', -145, 0.75, 292.4, 'N', { act: 'laundry', tags: ['yard'], link: islet });
  const yard2 = K.spot('kneel', -139.2, 0.75, 303.2, 'S', { act: 'garden', tags: ['yard', 'garden'], link: islet });
  // ---- the keeper at work
  const lens = K.spot('stand', -154.2, 15.75, 300.6, 'W', { room: lantern, act: 'wash', tags: ['work'], label: 'Polishing the lens', lines: ['Light goes on at sundown. Thirty-two years and I\'ve not missed one.', 'Every speck of salt on this glass is a mile of light lost.'] });
  const gal = K.spot('stand', -151.6, 15.75, 299.4, 'E', { act: 'look', tags: ['work'], label: 'Watching the weather from the gallery', link: gallery });
  const bellS = K.spot('stand', -156.8, 0.75, 306.8, 'S', { act: 'wrench', tags: ['work'], link: islet });
  const boat = K.spot('kneel', -158.2, 0.75, 296.4, 'W', { act: 'hammer_kneel', tags: ['work'], link: islet });
  b.job('keeper', [lens, desk, gal, bellS, boat], { shift: ['5:30', '22:30'], outfit: 'fisherman', title: 'keeper of the light' });
  b.home({ family: 'Fisk', size: 2, beds: [s1, s2], dine: [d1, d2], lounge: [knit, read, bench], kitchen: [cook, wash], bath: [], yard: [yard1, yard2], porch: [bench], desk: [desk], special: null });
  finishSite(b);
}

// shared with nature.js
export { Kit, siteBuilding, finishSite, worldText, wcyl, wline, YAW };
