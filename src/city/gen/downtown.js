// Generators: downtown. The Juniper Trust Building (and WJBY), the office blocks (Mercantile, Beacon,
// Harbor Insurance), First Juniper Savings Bank, the Whitcomb Hotel, Harlow's, the Rialto, the Courier,
// Union Station with its great arched train shed, and Harbor Canning Co. See docs/BUILDINGS.md.
import { Building } from '../building.js';
import { MAT, shell, slab, win, stairs, partitionX, partitionZ, roomTrim, cornice, awning, fireEscape, chimney, officeDesk, counterRun } from './common.js';
import { linkToSidewalk } from '../streets.js';
import { textSignType } from '../../props/lib/special.js';
import { AVENUES, STREETS, ROAD_HALF, WALK, GRID } from '../layout.js';

export function register(GEN, SITES) {
  GEN.tower = buildTower;
  GEN.office = buildOffice;
  GEN.bank = buildBank;
  GEN.hotel = buildHotel;
  GEN.department = buildDepartment;
  GEN.theater = buildTheater;
  GEN.newspaper = buildNewspaper;
  GEN.station = buildStation;
  GEN.cannery = buildCannery;
  void SITES;
}

// =====================================================================================================
// shared helpers
// =====================================================================================================
const R4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const T = (h, m = 0) => h * 60 + m;

// The four faces of a rectangular volume [x0,x1) × [z0,z1) of the main frame, each expressed in its own
// face frame: { F, zf (outer wall layer), a, b (extent along the face, left→right as seen from outside) }.
function facesOf(f, x0, z0, x1, z1) {
  const W = f.W, D = f.D;
  return {
    front: { F: f, zf: z0, a: x0, b: x1 },
    back: { F: f.faceFrame('back'), zf: D - z1, a: W - x1, b: W - x0 },
    left: { F: f.faceFrame('left'), zf: x0, a: D - z1, b: D - z0 },
    right: { F: f.faceFrame('right'), zf: W - x1, a: z0, b: z1 },
  };
}
// main-frame x (a wall voxel column) → layer in the left / right face frames; main z → x' in them
const LX = (f, x) => x, RX = (f, x) => f.W - 1 - x;
const LZ = (f, z) => f.D - z, RZ = (f, z) => z;

// window columns: evenly spaced windows of width ww at centre pitch p, centred in [a, b)
function colsIn(a, b, ww, pitch, margin = 2) {
  const room = b - a - 2 * margin;
  const n = Math.max(1, Math.floor((room + (pitch - ww)) / pitch));
  const span = n * pitch - (pitch - ww);
  const s = Math.round(a + (b - a - span) / 2);
  return Array.from({ length: n }, (_, i) => s + i * pitch);
}
// one window row per floor i in [i0, i1)
function rowsFor(i0, i1, FH, sill = 3, h = 8) { const r = []; for (let i = i0; i < i1; i++) r.push({ y: i * FH + sill, h }); return r; }

// Efficient punched-window facade for a whole face: a glass sheet, then piers and spandrels on top.
// A few dozen brushes for a ten-storey wall instead of hundreds of individual windows.
function gridFacade(face, cols, ww, rows, o = {}) {
  if (!rows.length || !cols.length) return;
  const { F, zf } = face;
  const a = o.a ?? face.a, bb = o.b ?? face.b, w = bb - a;
  const wall = o.wall ?? MAT.brick_red, inner = o.inner ?? MAT.plaster_cream, pierMat = o.pier ?? wall, spand = o.spandrel ?? wall;
  const rs = rows.slice().sort((p, q) => p.y - q.y);
  const yA = rs[0].y, yB = rs[rs.length - 1].y + rs[rs.length - 1].h;
  F.box(a, yA, zf, w, yB - yA, 1, o.glass ?? MAT.glass);
  F.carve(a, yA, zf + 1, w, yB - yA, 1);
  if (o.sash !== false) for (const r of rs) if (r.h >= 6) F.box(a, r.y + Math.round(r.h * 0.55), zf, w, 1, 1, o.sashMat ?? MAT.trim_white);
  // spandrels first, so that piers run unbroken over them
  for (let i = 0; i < rs.length - 1; i++) {
    const top = rs[i].y + rs[i].h, nb = rs[i + 1].y;
    if (nb <= top) continue;
    F.box(a, top, zf, w, nb - top, 1, spand);
    F.box(a, top, zf + 1, w, nb - top, 1, inner);
  }
  const edges = [a];
  for (const c of cols) edges.push(c, c + ww);
  edges.push(bb);
  let k = 0;
  for (let i = 0; i < edges.length; i += 2, k++) {
    const p0 = edges[i], p1 = edges[i + 1];
    if (p1 <= p0) continue;
    F.box(p0, yA, zf, p1 - p0, yB - yA, 1, pierMat);
    F.box(p0, yA, zf + 1, p1 - p0, yB - yA, 1, inner);
    if (o.proud && (k % o.proud === 0) && k > 0 && i < edges.length - 2) F.box(p0, yA - (o.proudBelow ?? 0), zf - 1, p1 - p0, yB - yA + (o.proudBelow ?? 0) + (o.proudAbove ?? 0), 1, o.proudMat ?? pierMat);
  }
  if (o.sill) for (const r of rs) F.box(a, r.y - 1, zf - 1, w, 1, 1, o.sill);
  if (o.sills) for (const r of rs) for (const c of cols) F.box(c - 1, r.y - 1, zf - 1, ww + 2, 1, 1, o.sills);
  if (o.lintels) for (const r of rs) for (const c of cols) F.box(c - (o.lintelWide ? 1 : 0), r.y + r.h, zf - 1, ww + (o.lintelWide ? 2 : 0), 1, 1, o.lintels);
}

// Text painted flush into a wall (replaces wall voxels), optionally on a painted panel.
function paint(F, text, cx, y, zf, o = {}) {
  const scale = o.scale ?? 1, font = o.font ?? 'big';
  const tw = F.textWidth(text, scale, font), th = (font === 'big' ? 7 : 5) * scale, pad = o.pad ?? 2;
  if (o.bg) F.box(Math.round(cx - tw / 2) - pad, y - pad, zf, tw + 2 * pad, th + 2 * pad, 1, o.bg);
  if (o.border) {
    const x0 = Math.round(cx - tw / 2) - pad - 1, x1 = x0 + tw + 2 * pad + 2;
    F.box(x0, y - pad - 1, zf, x1 - x0, 1, 1, o.border); F.box(x0, y + th + pad, zf, x1 - x0, 1, 1, o.border);
    F.box(x0, y - pad, zf, 1, th + 2 * pad, 1, o.border); F.box(x1 - 1, y - pad, zf, 1, th + 2 * pad, 1, o.border);
  }
  F.text(text, cx, y, zf - (o.raised ? 1 : 0), o.mat ?? MAT.sign_cream, { align: 'center', scale, font });
  return { w: tw + 2 * pad, h: th + 2 * pad };
}
// Letters stacked vertically (blade signs, smokestacks): top letter first, drawn on face F at layer z.
function vtext(F, text, cx, yTop, z, mat, o = {}) {
  const scale = o.scale ?? 1, font = o.font ?? 'big', lh = ((font === 'big' ? 7 : 5) + (o.gap ?? 2)) * scale;
  let y = yTop;
  for (const ch of text) { if (ch !== ' ') F.text(ch, cx, y - lh, z, mat, { align: 'center', scale, font }); y -= lh; }
  return yTop - y;
}


// Which sides of a lot face a street (so they get real facades instead of blind party walls)?
function streetSides(lot) {
  const m = lot.m, E = ROAD_HALF + WALK;
  const onX = (x, sign) => AVENUES.some((a) => Math.abs(x - (a.x + sign * E)) < 0.6) || (sign < 0 && Math.abs(x - GRID.x1 + WALK) < 0.6);
  const onZ = (z, sign) => STREETS.some((st) => Math.abs(z - (st.z + sign * E)) < 0.6);
  const west = onX(m.x0, 1), east = onX(m.x1, -1), north = onZ(m.z0, 1), south = onZ(m.z1, -1);
  const side = { N: north, S: south, E: east, W: west };
  const LEFT = { S: 'W', W: 'N', N: 'E', E: 'S' }, RIGHT = { S: 'E', E: 'N', N: 'W', W: 'S' }, BACK = { S: 'N', N: 'S', E: 'W', W: 'E' };
  return { left: side[LEFT[lot.facing]], right: side[RIGHT[lot.facing]], back: side[BACK[lot.facing]] };
}

// Clock face in the plane of a face frame F at layer zf (facing outward), centre (cx, cy), radius r.
function clockFace(F, cx, cy, zf, r, o = {}) {
  const disc = (rad, z, mat) => { for (let dy = -Math.floor(rad); dy <= Math.floor(rad); dy++) { const hw = Math.floor(Math.sqrt(rad * rad - dy * dy) + 0.35); if (hw > 0) F.box(cx - hw, cy + dy, z, hw * 2, 1, 1, mat); } };
  disc(r + 1.2, zf, o.ring ?? MAT.art_deco_gold);
  disc(r, zf - 1, MAT.clock_face);
  // hour marks at 12, 3, 6, 9
  F.box(cx - 1, cy + r - 2, zf - 2, 2, 2, 1, MAT.trim_black); F.box(cx - 1, cy - r + 1, zf - 2, 2, 1, 1, MAT.trim_black);
  F.box(cx - r + 1, cy, zf - 2, 2, 1, 1, MAT.trim_black); F.box(cx + r - 3, cy, zf - 2, 2, 1, 1, MAT.trim_black);
  // hands: minute hand straight up (the hour), hour hand toward the three — "three o'clock" is always a good time
  const t = o.time ?? 0;
  F.box(cx - 0.5 < cx ? cx : cx, cy, zf - 2, 1, Math.floor(r * 0.8), 1, MAT.trim_black);
  if (t === 0) F.box(cx, cy, zf - 2, Math.floor(r * 0.55), 1, 1, MAT.trim_black);
  else F.box(cx - Math.floor(r * 0.55), cy, zf - 2, Math.floor(r * 0.55), 1, 1, MAT.trim_black);
  F.box(cx - 1, cy - 1, zf - 2, 2, 2, 1, MAT.art_deco_gold);
}

// Truncated hip / mansard ring roofs. Mansard: steep hollow rings (rise per step), then a hipped cap.
function mansard(f, x, y, z, sx, sz, mat, o = {}) {
  const steps = o.steps ?? 8, rise = o.rise ?? 3;
  for (let k = 0; k < steps; k++) f.walls(x + k, y + k * rise, z + k, sx - 2 * k, rise, sz - 2 * k, mat, 1);
  const y2 = y + steps * rise, x2 = x + steps, z2 = z + steps, w2 = sx - 2 * steps, d2 = sz - 2 * steps;
  f.box(x2, y2 - 1, z2, w2, 1, d2, o.deck ?? MAT.roof_tar);
  let k = 0;
  const capSteps = o.cap ?? Math.floor(Math.min(w2, d2) / 2) - 3;
  for (; k < capSteps; k++) f.box(x2 + k, y2 + k, z2 + k, w2 - 2 * k, 1, d2 - 2 * k, mat);
  return { top: y2 + k, x: x2 + k, z: z2 + k, w: w2 - 2 * k, d: d2 - 2 * k };
}

// Weekday-only positions (people who work here Monday to Friday): capped per building so the town
// isn't flooded with commuters who only exist to be off work today.
function wkJob(b, role, spot, o = {}) {
  b._wk = (b._wk || 0) + 1;
  if (!spot || b._wk > (o.cap ?? 8)) return null;
  return b.job(role, spot, { ...o, days: 'weekday' });
}

// Readable helper
const read = (b, x, y, z, title, body, r = 1.6) => b.readable(x, y, z, { title, body }, { r });
const readH = (b, x, y, z, title, html, r = 1.6) => b.readable(x, y, z, { title, html }, { r });

// Door in a wall that runs along z (side walls), outside toward dirX (-1 = local -x, +1 = +x).
function sideEntrance(b, room, x, y, z, dirX, o = {}) {
  const nav = b.ctx.nav;
  const inner = b.door(room, null, x - dirX * 3, y, z, { leaf: false });
  const dn = b.door(null, null, x, y, z, { leaf: o.leaf ?? 'door_wood', axis: 'z', width: o.width || 4, tint: o.tint });
  nav.link(inner, dn);
  const out = b.m(x + dirX * (o.out ?? 6), o.outY ?? 0, z);
  const on = nav.node(out[0], out[1], out[2], { building: b.id, kind: 'outside' });
  nav.link(dn, on);
  b.entrances.push({ node: on, door: dn, pos: out, main: false });
  return on;
}

// Switchback stair core: footprint 9 (x) × (FH + 8) (z) starting at (x, z) — near landing z..z+4 (the door
// side, −z), flights up (+z, strip x..x+4) and down (−z, strip x+5..x+9) with a spine wall, half landing at
// the back. Serves floors i0 … i1-1 (FH even, ≥ 14). Walls are built around the footprint.
function stairCore(b, x, z, FH, i0, i1, o = {}) {
  const f = b.f, nav = b.ctx.nav, h = FH / 2, L = 2 * h, depth = L + 8;
  const mat = o.mat ?? MAT.concrete, wall = o.wall ?? MAT.plaster_gray;
  const yb = (i) => i * FH + 1;
  const yBot = yb(i0) - 1, yTop = yb(i1 - 1) + FH - 1 + (o.extraTop ?? 0);
  const H = yTop - yBot;
  if (o.walls !== false) {
    f.box(x - 1, yBot, z - 1, 1, H, depth + 2, wall);
    f.box(x + 9, yBot, z - 1, 1, H, depth + 2, wall);
    f.box(x, yBot, z + depth, 9, H, 1, wall);
    f.box(x, yBot, z - 1, 9, H, 1, wall);
  }
  f.box(x + 4, yb(i0), z + 4, 1, yTop - yb(i0), L, wall);   // spine
  const rooms = [];
  const doorX = o.doorX ?? 2;
  for (let i = i0; i < i1; i++) {
    const y = yb(i);
    const r = b.room(o.name ?? 'Stairwell', x, y, z, 9, FH - 1, depth, { lightMode: 'auto', kind: 'stair', lightColor: [1, 0.92, 0.8], nav: [x + 4.5, z + 2] });
    rooms.push(r);
    if (o.doors !== false && !(o.skipDoor && o.skipDoor(i))) {
      const side = o.doorSide ? o.doorSide(i) : 'front';
      if (side === 'front') f.carve(x + doorX, y, z - 1, 4, 9, 1);
      else if (side === 'left') f.carve(x - 1, y, z, 1, 9, 4);
      else f.carve(x + 9, y, z, 1, 9, 4);
    }
  }
  f.box(x + 5, yb(i0), z + 4, 4, h, L, mat);                // solid under the first down-flight
  for (let i = i0; i < i1 - 1; i++) {
    const y = yb(i);
    f.carve(x, y + FH - 1, z + 4, 9, 1, L + 4);
    f.box(x, y, z + 4 + L, 9, h, 4, mat);
    stairs(f, x, y, z + 4, '+z', h, { w: 4, run: 2, mat, rail: false });
    stairs(f, x + 5, y + h, z + 3 + L, '-z', h, { w: 4, run: 2, mat, rail: false });
    const r0 = rooms[i - i0], r1 = rooms[i - i0 + 1];
    const nb = b.navPoint(r0, x + 2, y, z + 2), nm = b.navPoint(r0, x + 4.5, y + h, z + 6 + L), nt = b.navPoint(r1, x + 7, y + FH, z + 2);
    nav.link(nb, nm); nav.link(nm, nt);
  }
  // guard rail over the open up-flight on the top floor
  f.box(x, yb(i1 - 1), z + 4, 4, 4, 1, o.rail ?? MAT.iron);
  f.box(x, yb(i1 - 1) + 3, z + 4, 4, 1, L + 4, o.rail ?? MAT.iron);
  return { rooms, doorAt: (i) => ({ x: x + doorX + 2, y: yb(i), z: z - 1 }), depth };
}

// Elevator bank: a shaft block with a panelled cab and an open brass-framed door at every stop floor,
// closed brass doors (with a lit floor dial above) on the floors the car passes. Uses b.elevator for riding.
// cars: door-centre x's (8 voxels apart); zFront: the shaft's front wall layer (corridor side is zFront-1).
// stopsFor(k) → [{ i, label }]; roomOf(i) → the room in front of the doors on floor i.
function elevatorBank(b, cars, zFront, FH, NF, stopsFor, roomOf, o = {}) {
  const f = b.f, yb = (i) => i * FH + 1 + (o.dy ?? 0);
  const x0 = cars[0] - 4, w = cars.length * 8;
  f.box(x0, o.y0 ?? 0, zFront, w, NF * FH - (o.y0 ?? 0), 9, o.shaft ?? MAT.stone_foundation);
  const out = [];
  cars.forEach((cx, k) => {
    const stops = stopsFor(k).filter((s) => s.i >= 0 && s.i < NF && roomOf(s.i));
    const stopSet = new Set(stops.map((s) => s.i));
    const cab = new Map();
    for (let i = (o.i0 ?? 0); i < NF; i++) {
      const y = yb(i);
      if (o.skip && o.skip(i)) continue;
      f.box(cx - 3, y - 1, zFront - 1, 6, 11, 1, o.frame ?? MAT.marble);
      f.box(cx - 2, y + 10, zFront - 1, 4, 1, 1, o.dialBack ?? MAT.art_deco_gold);
      f.box(cx - 1, y + 10, zFront - 2, 2, 1, 1, MAT.bulb_warm);
      if (!stopSet.has(i)) { f.box(cx - 2, y, zFront - 1, 4, 9, 1, o.door ?? MAT.art_deco_gold); f.box(cx, y, zFront - 1, 0 || 1, 9, 1, MAT.trim_dark); continue; }
      f.box(cx - 3, y - 1, zFront + 1, 6, 1, 6, o.cabFloor ?? MAT.floor_walnut);
      f.carve(cx - 3, y, zFront + 1, 6, 10, 6);
      f.box(cx - 4, y, zFront + 1, 1, 10, 6, MAT.wood_panel); f.box(cx + 3, y, zFront + 1, 1, 10, 6, MAT.wood_panel);
      f.box(cx - 3, y, zFront + 7, 6, 10, 1, MAT.wood_panel); f.box(cx - 3, y + 4, zFront + 6, 6, 1, 1, MAT.art_deco_gold);
      f.box(cx - 3, y + 10, zFront + 1, 6, 1, 6, MAT.ceiling_tin);
      f.carve(cx - 2, y, zFront - 1, 4, 9, 2);
      f.box(cx - 3, y, zFront - 1, 1, 10, 1, MAT.art_deco_gold); f.box(cx + 2, y, zFront - 1, 1, 10, 1, MAT.art_deco_gold);
      const r = b.room('Elevator', cx - 3, y, zFront + 1, 6, 9, 6, { lightMode: 'always', lightColor: [1, 0.84, 0.58], kind: 'elevator' });
      b.door(roomOf(i), r, cx, y, zFront - 1, { leaf: false });
      cab.set(i, r);
    }
    if (stops.length >= 2) out.push(b.elevator(cx, zFront + 4, stops.map((s) => ({ y: yb(s.i), room: cab.get(s.i), label: s.label }))));
  });
  return out;
}

// Furnish an office room of a given kind. (x, z) min corner, w × d interior. Returns worker spots.
function furnishOffice(b, room, x, y, z, w, d, kind, rng, o = {}) {
  const f = b.f, spots = [];
  const cx = x + w / 2, cz = z + d / 2;
  const desk = (dx, dz, rot, extra = {}) => { const s = officeDesk(b, room, dx, y, dz, rot, extra); spots.push(s); return s; };
  if (kind === 'law') {
    f.prop('rug_rect', cx, y, cz, 0, { tint: '#6a2a2a' });
    desk(cx, z + d * 0.45, 0, { desk: 'desk_wood', typewriter: false, phone: false, act: 'write' });
    f.prop('bookshelf', x + 2, y, z + d - 1.3, 0, {}); f.prop('bookshelf', x + w - 3, y, z + d - 1.3, 0, {});
    f.prop('armchair', cx - 3, y, z + 3, 2, { tint: '#6a3a2a' });
    if (!o.light) { f.prop('globe_desk', x + w - 2.5, y, z + 3, 0, {}); f.prop('portrait', x + 0.6, y + 7, cz, 1, {}); f.prop('books_stack', cx + 1.5, y + 3, z + d * 0.45, 0, {}); }
  } else if (kind === 'dentist') {
    f.prop('barber_chair', cx, y, cz, 0, { tint: '#e8e4d8' }); f.prop('lamp_floor', cx + 2.5, y, cz - 1.5, 0, {});
    f.prop('cabinet_upper', x + 1, y + 5, cz, 1, {}); f.prop('sink_pedestal', x + 1.5, y, z + 2, 1, {});
    f.prop('privacy_screen', x + w - 2, y, z + d - 3, 3, {}); f.prop('medicine_cabinet', x + w - 0.6, y + 6, cz, 3, {});
    spots.push(b.spot('stand', cx + 2.4, y, cz + 0.5, 3, { room, act: 'counter', tags: ['work'] }));
    b.spot('sit', cx, y, cz, 0, { room, act: 'sit', tags: ['patient'], seat: 0.6 });
  } else if (kind === 'waiting') {
    for (let i = 0; i < Math.min(5, Math.floor(w / 5)); i++) { const px = x + 3 + i * 4.5; f.prop('chair_wood', px, y, z + d - 2, 0, {}); b.spot('sit', px, y, z + d - 2, 0, { room, act: rng.pick(['read', 'sit', 'doze']), tags: ['waiting_room'], seat: 0.45 }); }
    f.prop('magazine_rack', x + w - 2, y, z + d - 2, 0, {}); f.prop('table_coffee', cx, y, z + d - 6, 0, {}); f.prop('rubber_plant', x + 2, y, z + 2, 0, {});
    f.prop('desk_office', x + w - 4, y, z + 3, 2, {}); f.prop('chair_office', x + w - 4, y, z + 6, 0, {}); f.prop('telephone', x + w - 4, y + 3, z + 3, 2, {});
    spots.push(b.spot('sit', x + w - 4, y, z + 6, 0, { room, act: 'type', tags: ['work', 'reception'], seat: 0.46 }));
  } else if (kind === 'open' || kind === 'insurance' || kind === 'generic') {
    const n = Math.min(o.desks ?? 3, Math.max(1, Math.floor(w / 9) * Math.max(1, Math.floor(d / 12))));
    const perRow = Math.max(1, Math.floor(w / 9)), rowsN = Math.ceil(n / perRow);
    for (let k = 0; k < n; k++) {
      const col = k % perRow, row = Math.floor(k / perRow);
      desk(x + 4.5 + col * ((w - 9) / Math.max(1, perRow - 1 || 1)), z + 4 + row * Math.max(9, (d - 10) / Math.max(1, rowsN)), 0, k ? { lamp: false, phone: k % 2 === 0 } : {});
    }
    for (let i = 0; i < Math.min(2, Math.floor(w / 6)); i++) f.prop('filing_cabinet', x + 1.5 + i * 2.4, y, z + d - 1.2, 0, {});
    if (!o.light) { f.prop('office_water_cooler', x + w - 1.6, y, z + d - 1.6, 0, {}); f.prop('clock_wall', cx, y + 9, z + d - 0.5, 0, {}); }
    if (kind === 'insurance') { f.prop('safe_small', x + w - 1.8, y, z + 2, 3, {}); f.prop('adding_machine', x + 4.5, y + 3, z + 5.8, 0, {}); }
    if (!o.light) f.prop('coat_rack', x + 1.6, y, z + 1.8, 0, {});
    if (!o.light && rng.chance(0.4)) f.prop('rubber_plant', x + w - 2, y, z + 2, 0, {});
  } else if (kind === 'exec') {
    f.prop('rug_oriental' in MAT ? 'rug_rect' : 'rug_rect', cx, y, cz, 0, { tint: '#3a4a6a' });
    desk(cx, z + d * 0.4, 0, { desk: 'desk_wood', typewriter: false, lamp: false, act: 'phone' });
    f.prop('sofa', cx, y, z + d - 2.5, 0, { tint: '#5a3a2a' }); f.prop('bookshelf', x + 2, y, z + d - 1.3, 0, {});
    if (!o.light) { f.prop('portrait', cx, y + 7, z + d - 0.6, 2, {}); f.prop('clock_grandfather', x + 1.6, y, z + 2, 1, {}); }
  }
  return spots;
}

// Rooftop clutter on a flat roof at height y over [x0,x1)×[z0,z1): water tower, vents, skylights, antennas.
function roofClutter(b, x0, z0, x1, z1, y, rng, o = {}) {
  const f = b.f;
  const w = x1 - x0, d = z1 - z0;
  if (o.tower !== false && w > 20 && d > 20) {
    const tx = x0 + (o.towerAt ? o.towerAt[0] : w * rng.float(0.2, 0.8)), tz = z0 + (o.towerAt ? o.towerAt[1] : d * rng.float(0.55, 0.8));
    f.prop('water_tower', tx, y, tz, rng.int(0, 3), { cat: 'far', scale: o.towerScale ?? 1.25 });
  }
  const nv = o.vents ?? Math.max(1, Math.floor(w * d / 1400));
  for (let i = 0; i < nv; i++) {
    const vx = Math.round(x0 + 3 + rng.float(0, w - 8)), vz = Math.round(z0 + 3 + rng.float(0, d - 8));
    if (rng.chance(0.5)) { f.box(vx, y, vz, 3, 3, 3, MAT.steel); f.box(vx - 1, y + 3, vz - 1, 5, 1, 5, MAT.steel); }
    else { f.box(vx, y, vz, 2, 4, 2, MAT.iron); f.box(vx, y + 4, vz, 2, 1, 2, MAT.rust); }
  }
  const ns = o.skylights ?? (w > 30 && d > 30 ? 2 : 0);
  for (let i = 0; i < ns; i++) {
    const sx = Math.round(x0 + 6 + rng.float(0, w - 18)), sz = Math.round(z0 + 5 + rng.float(0, d - 14));
    f.box(sx - 1, y, sz - 1, 10, 1, 8, MAT.trim_dark); f.box(sx, y, sz, 8, 1, 6, MAT.glass_dark);
    f.box(sx, y + 1, sz + 1, 8, 1, 4, MAT.glass); f.box(sx, y + 1, sz, 8, 1, 1, MAT.iron); f.box(sx, y + 1, sz + 5, 8, 1, 1, MAT.iron);
  }
  if (o.antenna !== false && rng.chance(0.6)) f.prop('tv_antenna', x0 + w * rng.float(0.2, 0.8), y, z0 + 3, 0, {});
  if (o.bulkhead) {
    const [bx, bz] = o.bulkhead;
    f.box(bx - 1, y, bz - 1, 11, 11, 7, o.bulkMat ?? MAT.brick_dark);
    f.box(bx - 2, y + 11, bz - 2, 13, 1, 9, MAT.roof_tar);
    f.carve(bx + 2, y, bz - 1, 4, 8, 1);
    f.box(bx + 2, y, bz - 1, 4, 8, 1, MAT.wood_dark);
  }
}

// A row of people-spots for a crowd or queue
function spotRow(b, room, x0, x1, y, z, rot, n, o) {
  const out = [];
  for (let i = 0; i < n; i++) { const x = n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1); out.push(b.spot(o.pose ?? 'stand', x, y, z, rot, { room, ...o })); }
  return out;
}

// =====================================================================================================
// THE JUNIPER TRUST BUILDING (1929) — 22-storey art-deco setback tower with the WJBY mast
// =====================================================================================================
function buildTower(ctx, lot, spec) {
  const rng = ctx.rng.fork('tower' + lot.x + ',' + lot.z);
  const name = spec.name || 'Juniper Trust Building';
  const b = new Building(ctx, { name, kind: 'tower', lot, address: lot.address, established: spec.est || 1929, hours: [T(7), T(19)],
    lore: 'Finished in October 1929 — three weeks before the Crash. Twenty-two storeys, the tallest building on the coast between Boston and Portland. WJBY broadcasts from the 21st floor; the observation terrace is open daily.' });
  const f = b.f, W = lot.w, D = lot.d, FH = 14, NF = Math.max(10, spec.floors || 22);
  const CREAM = MAT.art_deco_cream, GOLD = MAT.art_deco_gold, DARK = MAT.trim_dark, PL = MAT.plaster_cream;
  const cx = Math.round(W / 2), zc = Math.round(D * 0.47);
  const q4 = (v) => Math.round(v / 4) * 4;
  // setback sections (x0, z0, x1, z1, first floor index, end floor index)
  const mk = (w, d, i0, i1) => ({ x0: cx - q4(w) / 2, x1: cx + q4(w) / 2, z0: zc - q4(d) / 2, z1: zc + q4(d) / 2, i0, i1 });
  const iB = 5, iC = NF - 6, iD = NF - 3, iE = NF - 1;
  const A = { x0: 0, x1: W, z0: 0, z1: Math.min(D, D - 8), i0: 0, i1: iB };
  const B = mk(W * 0.72, D * 0.8, iB, iC);
  const C = mk(W * 0.56, D * 0.667, iC, iD);
  const Dd = mk(W * 0.4, D * 0.533, iD, iE);
  const E = mk(W * 0.24, D * 0.367, iE, NF);
  const SECS = [A, B, C, Dd, E];
  for (const s of SECS) { s.w = s.x1 - s.x0; s.d = s.z1 - s.z0; }
  const secOf = (i) => SECS.find((s) => i >= s.i0 && i < s.i1);
  const yb = (i) => i * FH + 1;

  // ---- core positions (inside the smallest section E)
  const stX = E.x0 + 4, stZ = E.z0 + 10;                      // stair core min corner
  const elX0 = stX + 13, elZ = stZ - 1;                        // elevator shafts start x, front wall layer z
  const cars = [elX0 + 4, elX0 + 12, elX0 + 20];               // door centres
  const lob = { x0: E.x0 - 16, x1: E.x1 + 16, z0: 2, z1: elZ }; // ground floor lobby
  const mezz = { z0: elZ - 8 };

  // ---- ground: sidewalk apron and a granite plinth
  f.box(0, -1, 0, W, 1, D, MAT.sidewalk);
  f.box(0, -1, A.z1, W, 1, D - A.z1, MAT.concrete);            // service alley behind

  // ---- shells, slabs, roofs
  for (const s of SECS) {
    const y0 = s.i0 * FH, h = (s.i1 - s.i0) * FH;
    shell(f, s.x0, y0, s.z0, s.w, h, s.d, CREAM, PL);
    for (let i = s.i0; i < s.i1; i++) slab(f, s.x0 + 1, i * FH, s.z0 + 1, s.w - 2, s.d - 2, i === 0 ? MAT.floor_marble : (i >= iD ? MAT.floor_linoleum_green : MAT.floor_linoleum));
    // roof of this section (terrace for the one below the pavilion)
    const yr = s.i1 * FH;
    f.box(s.x0, yr, s.z0, s.w, 1, s.d, s === Dd ? MAT.floor_terrazzo : MAT.roof_tar);
    f.walls(s.x0, yr + 1, s.z0, s.w, s === Dd ? 4 : 3, s.d, CREAM, 1);
    f.walls(s.x0 - 1, yr, s.z0 - 1, s.w + 2, 1, s.d + 2, GOLD, 1);       // gold band at every setback
    f.walls(s.x0, yr + (s === Dd ? 5 : 4), s.z0, s.w, 1, s.d, s === Dd ? MAT.iron : GOLD, 1);
  }
  // granite base course
  f.walls(-1, 0, -1, W + 2, 3, A.z1 + 2, MAT.granite, 1);
  // lobby double height: no floor-2 slab in front of the mezzanine
  f.carve(lob.x0, FH, lob.z0, lob.x1 - lob.x0, 1, mezz.z0 - lob.z0);

  // ---- facades
  const WW = 6, PITCH = 8;
  for (const s of SECS) {
    const fc = facesOf(f, s.x0, s.z0, s.x1, s.z1);
    const firstRow = s === A ? 1 : s.i0;
    for (const side of ['front', 'back', 'left', 'right']) {
      const face = fc[side];
      if (s === E) {   // glass pavilion: tall windows
        gridFacade(face, colsIn(face.a, face.b, 6, 8, 3), 6, [{ y: s.i0 * FH + 2, h: 10 }], { wall: CREAM, inner: PL, sash: false, proud: 1, proudAbove: 6, proudMat: GOLD });
        continue;
      }
      const cols = colsIn(face.a, face.b, WW, PITCH, 4);
      let rows = rowsFor(firstRow, s.i1, FH, 3, 8);
      if (s === A && side === 'front') rows = rowsFor(2, s.i1, FH, 3, 8);
      gridFacade(face, cols, WW, rows, { wall: CREAM, inner: PL, spandrel: DARK, sash: false, proud: 2, proudAbove: 3, proudBelow: s === A ? 0 : 2, proudMat: CREAM });
      // gold spandrel band under the top row, and deco finials above the parapet on proud piers
      const top = rows[rows.length - 1];
      face.F.box(face.a + 4, top.y - 2, face.zf, face.b - face.a - 8, 1, 1, GOLD);
      for (let k = 2; k < cols.length; k += 2) {
        const px = cols[k] - 2;
        face.F.box(px, s.i1 * FH + 4, face.zf - 1, 2, 5, 1, CREAM);
        face.F.box(px, s.i1 * FH + 9, face.zf - 1, 2, 1, 1, GOLD);
      }
    }
    // corner piers run proud the full height of the section
    for (const side of ['front', 'back']) {
      const face = fc[side];
      face.F.box(face.a - 1, s.i0 * FH, face.zf - 1, 3, (s.i1 - s.i0) * FH + 5, 1, CREAM);
      face.F.box(face.b - 2, s.i0 * FH, face.zf - 1, 3, (s.i1 - s.i0) * FH + 5, 1, CREAM);
    }
  }
  // wing floor-2 windows on the front, both sides of the lobby
  {
    const face = facesOf(f, A.x0, A.z0, A.x1, A.z1).front;
    gridFacade(face, colsIn(4, lob.x0 - 2, WW, PITCH, 2), WW, [{ y: FH + 3, h: 8 }], { a: 2, b: lob.x0 - 2, wall: CREAM, inner: PL, sash: false });
    gridFacade(face, colsIn(lob.x1 + 2, W - 4, WW, PITCH, 2), WW, [{ y: FH + 3, h: 8 }], { a: lob.x1 + 2, b: W - 2, wall: CREAM, inner: PL, sash: false });
  }

  // ---- ground floor front: grand portal + wing windows
  const P0 = cx - 18, P1 = cx + 18;                     // portal
  f.box(P0 - 3, 0, -2, P1 - P0 + 6, 27, 2, MAT.trim_black);  // black granite surround
  f.carve(P0, 1, -2, P1 - P0, 22, 4);                   // recessed vestibule
  f.box(P0, 1, 1, P1 - P0, 22, 1, MAT.marble);          // back of the recess (inner)
  for (let k = 0; k < 3; k++) { const s0 = P0 + 4 + k * 10; f.box(s0 - 1, 0, -2, 6, 1, 4, MAT.granite); }
  // stepped deco frame inside the portal
  for (let k = 0; k < 3; k++) f.box(P0 + k, 22 - k * 2, -2 + k, P1 - P0 - 2 * k, 1, 1, GOLD);
  // sunburst transom
  f.box(P0 + 2, 11, 1, P1 - P0 - 4, 9, 1, MAT.glass_stained_gold);
  f.box(cx - 1, 11, 0, 2, 9, 1, GOLD);
  for (let k = 1; k <= 4; k++) { f.box(cx - 1 - k * 3, 11 + k, 0, 1, 9 - k, 1, GOLD); f.box(cx + k * 3, 11 + k, 0, 1, 9 - k, 1, GOLD); }
  f.box(P0 + 2, 10, 0, P1 - P0 - 4, 1, 1, GOLD);
  const doorsX = [cx - 10, cx, cx + 10];
  for (const dx of doorsX) { f.carve(dx - 2, 1, 1, 4, 9, 1); f.box(dx - 3, 1, 0, 1, 9, 1, GOLD); f.box(dx + 2, 1, 0, 1, 9, 1, GOLD); }
  // tall lobby windows flanking the portal
  for (const x0 of [lob.x0 + 3, lob.x0 + 11, P1 + 6, P1 + 14]) {
    if (x0 + 6 > lob.x1 - 2) continue;
    f.carve(x0, 4, 0, 5, 22, 2); f.box(x0, 4, 0, 5, 22, 1, MAT.glass);
    f.box(x0 + 2, 4, 0, 1, 22, 1, GOLD); for (let y = 9; y < 26; y += 6) f.box(x0, y, 0, 5, 1, 1, GOLD);
  }
  // name over the portal
  f.text('JUNIPER TRUST', cx, 25, -3, GOLD, { align: 'center', font: 'big' });
  paint(f, 'BUILDING  1929', cx, 20, -3, { font: 'small', mat: GOLD, pad: 0 });
  // wing shop windows on the street
  const shopWin = (x0, x1) => {
    for (const x of colsIn(x0, x1, 10, 13, 2)) {
      f.carve(x, 1, 0, 10, 11, 2); f.box(x, 1, 0, 10, 2, 1, MAT.granite); f.box(x, 3, 0, 10, 8, 1, MAT.glass_shop);
      f.box(x, 11, 0, 10, 1, 1, GOLD); f.box(x + 5, 3, 0, 1, 8, 1, MAT.trim_black);
    }
  };
  shopWin(4, lob.x0 - 4); shopWin(lob.x1 + 4, W - 4);
  paint(f, 'JUNIPER TRUST COMPANY', (4 + lob.x0 - 4) / 2, 12, -1, { font: 'small', mat: GOLD, bg: MAT.trim_black, pad: 1 });
  paint(f, 'HALE & CROSBY - SECURITIES', (lob.x1 + 4 + W - 4) / 2, 12, -1, { font: 'small', mat: GOLD, bg: MAT.trim_black, pad: 1 });
  // flagpoles & lamps at the portal
  f.prop('flag_pole', P0 - 6, 28, -3, 0, { cat: 'far', scale: 0.7 });
  f.prop('flag_pole', P1 + 6, 28, -3, 0, { cat: 'far', scale: 0.7 });
  b.light(cx, 20, -4, { color: [1, 0.85, 0.6], radius: 9, mode: 'night' });
  // side & back ground-floor windows
  {
    const fc = facesOf(f, A.x0, A.z0, A.x1, A.z1);
    for (const side of ['left', 'right', 'back']) {
      const face = fc[side];
      gridFacade(face, colsIn(face.a, face.b, WW, PITCH * 2, 6), WW, [{ y: 3, h: 8 }], { wall: CREAM, inner: PL, sash: false });
    }
  }

  // ---- interior finish: lobby
  const LZ1 = lob.z1;
  // lobby partitions (full lobby height) and marble lining
  partitionZ(f, lob.z0, D - 10, 1, lob.x0 - 1, 2 * FH - 1, MAT.marble, [{ at: lob.z0 + 14, w: 6, h: 11 }]);
  partitionZ(f, lob.z0, D - 10, 1, lob.x1, 2 * FH - 1, MAT.marble, [{ at: lob.z0 + 14, w: 6, h: 11 }]);
  partitionX(f, lob.x0, lob.x1, 1, LZ1, 2 * FH - 1, MAT.marble, [{ at: lob.x0 + 3, w: 4 }]);
  f.box(lob.x0, 2 * FH - 1, lob.z0, lob.x1 - lob.x0, 1, mezz.z0 - lob.z0, MAT.ceiling_tin);
  for (let z = lob.z0 + 6; z < mezz.z0; z += 8) f.box(lob.x0, 2 * FH - 2, z, lob.x1 - lob.x0, 1, 1, GOLD);   // coffer beams
  f.box(cx - 1, 2 * FH - 2, lob.z0, 2, 1, mezz.z0 - lob.z0, GOLD);
  // floor inlay: a compass rose of darker marble & gold
  f.box(cx - 8, 0, 14, 16, 1, 16, MAT.floor_checker);
  f.box(cx - 1, 0, 10, 2, 1, 24, MAT.art_deco_gold); f.box(cx - 12, 0, 21, 24, 1, 2, MAT.art_deco_gold);
  // mezzanine gallery (floor 2) along the back of the lobby, with a brass rail
  f.box(lob.x0, FH, mezz.z0, lob.x1 - lob.x0, 1, LZ1 - mezz.z0, MAT.floor_marble);
  f.box(lob.x0, FH + 1, mezz.z0, lob.x1 - lob.x0, 1, 1, GOLD);
  for (let x = lob.x0; x < lob.x1; x += 3) f.box(x, FH + 2, mezz.z0, 1, 2, 1, GOLD);
  f.box(lob.x0, FH + 4, mezz.z0, lob.x1 - lob.x0, 1, 1, GOLD);
  f.carve(lob.x0 + 6, FH + 1, mezz.z0, 6, 3, 1);   // gap in the rail at the mezzanine stair head
  // mezzanine stair (lobby → mezzanine) along the left wall
  stairs(f, lob.x0 + 6, 1, mezz.z0 - 2 * (FH - 1) - 1, '+z', FH - 1, { w: 5, run: 2, mat: MAT.marble, rail: GOLD });
  // murals on the lobby side walls (painted on the marble)
  muralPanel(f, 'left', lob.x0 - 1, lob.z0 + 22, FH + 2, rng);
  muralPanel(f, 'right', lob.x1, lob.z0 + 22, FH + 2, rng);


  // ---- rooms, floors
  const floorLabel = (i) => i + 1;
  const RM = [];   // main room per floor
  // ground floor
  const lobby = b.room('Lobby', lob.x0, 1, lob.z0, lob.x1 - lob.x0, 2 * FH - 2, LZ1 - lob.z0, { lightMode: 'always', lightColor: [1, 0.86, 0.62], lightPower: 1.2 });
  RM[0] = lobby;
  const trust = b.room('Juniper Trust Company', 2, 1, 2, lob.x0 - 3, FH - 1, A.z1 - 4, { lightMode: 'day', lightColor: [1, 0.9, 0.72] });
  const broker = b.room('Hale & Crosby, Securities', lob.x1 + 1, 1, 2, W - lob.x1 - 3, FH - 1, A.z1 - 4, { lightMode: 'auto' });
  const service = b.room('Service Hall', lob.x0, 1, LZ1 + 1, lob.x1 - lob.x0, FH - 1, A.z1 - LZ1 - 3, { lightMode: 'auto' });
  for (const dx of doorsX) b.entrance(lobby, dx, 1, 0, { outZ: -7, outY: 0, leaf: 'door_glass', tint: '#c9a24a', main: dx === cx });
  b.door(lobby, trust, lob.x0 - 1, 1, lob.z0 + 17, { axis: 'z', leaf: 'door_glass', width: 6, tint: '#c9a24a' });
  b.door(lobby, broker, lob.x1, 1, lob.z0 + 17, { axis: 'z', leaf: 'door_glass', width: 6, tint: '#c9a24a' });
  b.door(lobby, service, lob.x0 + 5, 1, LZ1, { leaf: 'door_wood' });
  sideEntrance(b, trust, 0, 1, A.z1 * 0.4, -1, { leaf: 'door_glass', tint: '#2a2a2a' });
  f.carve(0, 1, Math.round(A.z1 * 0.4) - 2, 2, 9, 4);
  sideEntrance(b, broker, W - 1, 1, A.z1 * 0.4, 1, { leaf: 'door_glass', tint: '#2a2a2a' });
  f.carve(W - 2, 1, Math.round(A.z1 * 0.4) - 2, 2, 9, 4);
  // back service door
  f.carve(cx - 2, 1, A.z1 - 2, 4, 9, 2);
  b.door(service, null, cx, 1, A.z1 - 1, { leaf: 'door_wood', tint: '#4a4a4a' });
  const backOut = b.navPoint(service, cx, 0, A.z1 + 4);
  linkToSidewalk(ctx, backOut, 40);

  // lobby furniture
  for (const [dx, dz] of [[-14, 12], [14, 12], [-14, 26], [14, 26]]) f.prop('palm_pot', cx + dx, 1, lob.z0 + dz, 0, {});
  for (const z of [12, 24]) f.prop('chandelier', cx, 2 * FH - 7, lob.z0 + z, 0, {});
  // directory board (wall at the lobby back, beside the stair door)
  const dirX = stX - 7;
  f.box(dirX - 5, 4, LZ1 - 1, 10, 9, 1, MAT.trim_black);
  f.box(dirX - 6, 3, LZ1 - 1, 12, 1, 1, GOLD); f.box(dirX - 6, 13, LZ1 - 1, 12, 1, 1, GOLD);
  for (let k = 0; k < 7; k++) f.box(dirX - 4, 5 + k, LZ1 - 2 + 1, 3 + ((k * 5) % 5), 1, 0 + 1, MAT.sign_white);
  const DIRECTORY = [
    'LOBBY — Juniper Trust Company · Hale & Crosby, Securities · Cigars & News',
    '2 — Juniper Trust Co., Trust Department (mezzanine)',
    '3 — Juniper Trust Co., Executive Offices',
    '4 — Bayside Mutual Life Insurance Co.',
    '5 — Crane, Whitcomb & Lowe, Attorneys at Law',
    '6 — New England Telephone & Telegraph Co., District Office',
    '7 — Boston & Juniper Bay Railroad, Division Offices',
    '8 — Harbor Canning Co., Sales Department',
    '9 — Samuel Weir, D.D.S. · Ruth Kessler, M.D.',
    '10 — Juniper Bay Gas & Light Co.',
    '11 — Coastal Steamship Agency',
    '12 — Ellery & Marsh, Advertising',
    '13 — To Let (enquire of the Superintendent)',
    '14 — Pratt Business College',
    '15 — U.S. Coast Guard Recruiting · Selective Service Board No. 7',
    '16 — Dunmore Timber Holdings',
    '17 — Juniper Bay Chamber of Commerce — Centennial Committee',
    '18 — Merrill Engineering Co.',
    '19 — Offices To Let',
    '20 — WJBY Business Office & Transmitter',
    '21 — WJBY Studios A & B  ("The Voice of the Bay", 1340 kc.)',
    '22 — Observation Terrace — open 10 to 5 — ten cents',
  ].slice(0, NF);
  read(b, dirX, 8, LZ1 - 1.5, 'Building Directory', DIRECTORY.join('\n') + '\n\nElevators to all floors. Superintendent: Mr. A. Kowalczyk, Room 104.', 2.2);
  // cigar & news stand
  const ns = counterRun(b, lobby, lob.x1 - 16, lob.x1 - 4, 1, lob.z0 + 8, { rot: 3, type: 'counter_shop', register: true });
  void ns;
  f.prop('magazine_rack', lob.x1 - 2, 1, lob.z0 + 4, 3, {}); f.prop('candy_jars', lob.x1 - 8, 4.2, lob.z0 + 8, 0, {});
  f.prop('newspaper_pile', lob.x1 - 12, 4.2, lob.z0 + 8, 0, {});
  const newsClerk = b.spot('stand', lob.x1 - 10, 1, lob.z0 + 11, 0, { room: lobby, act: 'counter', tags: ['clerk'], lines: ['Courier, Globe, Herald — Centennial souvenir programs, a dime.', 'Cigars? Dutch Masters, White Owl...'] });
  b.spot('stand', lob.x1 - 10, 1, lob.z0 + 5, 2, { room: lobby, act: 'talk', tags: ['shop', 'customer'] });
  b.job('newsstand', newsClerk, { shift: ['7:00', '18:00'], title: 'news-stand man', outfit: 'shopkeeper' });
  // elevator starter & doorman
  const starter = b.spot('stand', cars[1], 1, elZ - 5, 0, { room: lobby, act: 'stand', tags: ['work'], lines: ['Going up! Twenty-one for WJBY, twenty-two for the terrace.', 'Step lively, please.', 'Mind the gate, ma\'am.'] });
  b.job('elevator operator', starter, { shift: ['7:00', '19:00'], title: 'elevator starter', outfit: 'bellhop' });
  const door = b.spot('stand', cx + 6, 1, lob.z0 + 4, 0, { room: lobby, act: 'stand', tags: ['work'], lines: ['Good afternoon.', 'Terrace is ten cents — worth every penny on a day like this.'] });
  b.job('doorman', door, { shift: ['8:00', '18:00'], title: 'doorman', outfit: 'bellhop' });
  for (let k = 0; k < 4; k++) b.spot('stand', cars[k % 3] + rng.float(-1, 1), 1, elZ - 7 - rng.float(0, 4), 2, { room: lobby, act: 'wait', tags: ['lobby'] });
  // lobby benches
  for (const x of [lob.x0 + 3, lob.x1 - 3]) { f.prop('bench_station', x, 1, lob.z0 + 30, x < cx ? 1 : 3, {}); b.playerSeat(x, 1, lob.z0 + 30, x < cx ? 1 : 3); b.spot('sit', x, 1, lob.z0 + 30, x < cx ? 1 : 3, { room: lobby, act: 'read', tags: ['lobby'], seat: 0.45 }); }
  read(b, cx, 3, lob.z0 + 22, 'Floor Inlay', 'A compass rose of Vermont marble and brass, set in 1929. The north point aims, not quite accurately, at Whitcomb Point Light.\n\nGenerations of boys have tried to stand exactly on the centre. The doorman does not approve.', 2.5);
  read(b, cx, 3, 1.5, 'Bronze Tablet', 'JUNIPER TRUST BUILDING\nErected MCMXXIX by the Juniper Trust Company\n\nHollis Brandt, Architect · Merrill Engineering Co., Structural Engineers\nFrame completed August 14, 1929 · Opened October 7, 1929\n\n"Built upon the Rock of Thrift"\n\n(Three weeks later the market crashed. The Trust Company never missed a payroll.)', 2.2);

  // Juniper Trust Company banking room (wing)
  {
    const x0 = 2, x1 = lob.x0 - 1, z0 = 2, z1 = A.z1 - 2;
    f.box(x0, 0, z0, x1 - x0, 1, z1 - z0, MAT.floor_marble);
    f.box(x0, 0, z0 + 6, x1 - x0, 1, 2, MAT.floor_checker);
    // banker's rail with desks behind it
    for (let x = x0 + 2; x < x1 - 2; x += 1) if (x % 12 !== 5) f.box(x, 1, z0 + 22, 1, 3, 1, MAT.wood_dark);
    f.box(x0 + 2, 4, z0 + 22, x1 - x0 - 4, 1, 1, GOLD);
    const sp = [];
    for (let k = 0; k < 3; k++) sp.push(officeDesk(b, trust, x0 + 10 + k * 16, 1, z0 + 30, 0, { desk: 'desk_wood', act: 'write' }));
    for (let k = 0; k < 3; k++) { f.prop('chair_wood', x0 + 10 + k * 16, 1, z0 + 26.5, 2, {}); b.spot('sit', x0 + 10 + k * 16, 1, z0 + 26.5, 2, { room: trust, act: 'talk_sit', tags: ['shop', 'customer'], seat: 0.45 }); }
    f.prop('safe_small', x1 - 3, 1, z1 - 3, 0, {}); f.prop('clock_grandfather', x0 + 2, 1, z1 - 3, 1, {});
    for (let k = 0; k < 4; k++) f.prop('filing_cabinet', x0 + 4 + k * 2.4, 1, z1 - 1.2, 0, {});
    f.prop('portrait', x0 + 0.6, 7, z0 + 40, 1, {});
    read(b, x0 + 1.5, 6, z0 + 40, 'Portrait — Josiah Crane', 'JOSIAH CRANE (1861–1938)\nPresident, Juniper Trust Company, 1904–1938\n\nHe kept the Trust open through the bank holiday of March 1933 by the simple expedient of refusing to close it. Depositors who lined up to withdraw were each handed their money and a cup of coffee. Most of them re-deposited it the following week.');
    b.job('trust officer', sp[0], { shift: ['9:00', '12:00'], title: 'trust officer' });
    b.job('trust clerk', sp[1], { shift: ['9:00', '12:00'], title: 'trust clerk' });
    wkJob(b, 'trust clerk', sp[2], {});
    f.prop('ceiling_lamp', (x0 + x1) / 2, 11, z0 + 16, 0, {}); f.prop('ceiling_lamp', (x0 + x1) / 2, 11, z0 + 50, 0, {});
  }
  // Hale & Crosby brokerage (wing) — a quotation board and a customers' room
  {
    const x0 = lob.x1 + 1, x1 = W - 2, z0 = 2, z1 = A.z1 - 2, w = x1 - x0;
    f.box(x0, 0, z0, w, 1, z1 - z0, MAT.floor_oak);
    // quotation board on the back wall (faces the street)
    const bz = z0 + 40;
    f.box(x0 + 3, 1, bz, w - 6, 12, 1, MAT.wood_dark);
    f.box(x0 + 4, 4, bz - 1, w - 8, 8, 1, MAT.chalkboard);
    const quotes = ['GM 58', 'ATT 156', 'USS 38', 'NYC 22', 'PRR 20', 'GE 76'];
    quotes.forEach((q, k) => f.text(q, x0 + 6 + (k % 3) * Math.floor((w - 10) / 3), 9 - Math.floor(k / 3) * 4, bz - 2, MAT.blackboard_text, { font: 'small' }));
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const sx = x0 + 8 + k * ((w - 16) / 3), sz = z0 + 14 + r * 6; f.prop('chair_wood', sx, 1, sz, 2, {}); if (r < 2) b.spot('sit', sx, 1, sz, 2, { room: broker, act: 'read', tags: ['lobby'], seat: 0.45 }); }
    f.prop('desk_rolltop', x0 + 4, 1, z1 - 4, 2, {}); f.prop('typewriter', x0 + w - 6, 3, z1 - 6, 0, {}); f.prop('table_side', x0 + w - 6, 1, z1 - 6, 0, {});
    readH(b, x0 + w - 6, 4, z1 - 6.5, 'Ticker Tape, October 29, 1929', '<div class="plaque"><h1>Framed Ticker Tape</h1></div><p class="typed" style="text-align:center">Under glass, a curl of paper tape:<br><br><b>. . . GM 40 . . . USS 186 . . . RCA 26 . . . ATT 204 . . .</b><br><br>A brass tag below reads: <i>"Tuesday, October 29, 1929. Kept by H. Crosby as a reminder."</i><br>Someone has pencilled on the mat, in a different hand: <i>"And we are still here. — T.H., 1945"</i></p>');
    read(b, x0 + 3, 4, 2.5, 'Card in the Door', 'HALE & CROSBY\nMembers, Boston Stock Exchange\n\nCLOSED SATURDAYS\n\nBy action of the New York Stock Exchange, Saturday sessions were discontinued on June 1, 1952. Mr. Crosby reports that he does not know what to do with himself.');
    const bd = officeDesk(b, broker, x0 + w / 2, 1, z1 - 8, 0, { desk: 'desk_wood' });
    wkJob(b, 'broker', bd, { title: 'broker' });
  }
  // service hall: mail room & the superintendent
  {
    const sp = officeDesk(b, service, lob.x0 + 8, 1, LZ1 + 30, 0, { desk: 'desk_wood', typewriter: false, act: 'read' });
    f.prop('mail_slots', lob.x0 + 2, 1, LZ1 + 40, 1, {}); f.prop('tools_wall', lob.x1 - 1, 3, LZ1 + 34, 3, {}); f.prop('crate_stack', lob.x1 - 6, 1, A.z1 - 8, 0, {});
    b.job('superintendent', sp, { shift: ['7:00', '16:00'], title: 'building superintendent', outfit: 'mechanic' });
  }

  // ---- upper floors
  for (let i = 1; i < NF; i++) {
    const s = secOf(i), y = yb(i);
    const x0 = s.x0 + 2, z0 = s.z0 + 2, w = s.w - 4, d = s.d - 4;
    let main;
    if (i === 1) {
      main = b.room('Mezzanine', lob.x0, y, mezz.z0 + 1, lob.x1 - lob.x0, FH - 1, LZ1 - mezz.z0 - 1, { lightMode: 'always', lightColor: [1, 0.86, 0.62] });
      const wl = b.room('Trust Department', 2, y, 2, lob.x0 - 3, FH - 1, A.z1 - 4, { lightMode: 'auto' });
      const wr = b.room('Trust Department — Records', lob.x1 + 1, y, 2, W - lob.x1 - 3, FH - 1, A.z1 - 4, { lightMode: 'auto' });
      const bk = b.room('Second Floor Offices', lob.x0, y, LZ1 + 1, lob.x1 - lob.x0, FH - 1, A.z1 - LZ1 - 3, { lightMode: 'auto' });
      // mezzanine walls: doors from the gallery into both wings and the back
      f.carve(lob.x0 - 1, y, mezz.z0 + 2, 1, 9, 4); f.carve(lob.x1, y, mezz.z0 + 2, 1, 9, 4);
      b.door(main, wl, lob.x0 - 1, y, mezz.z0 + 4, { axis: 'z' }); b.door(main, wr, lob.x1, y, mezz.z0 + 4, { axis: 'z' });
      partitionX(f, lob.x0, lob.x1, y, LZ1, FH - 1, PL, [{ at: lob.x0 + 3, w: 4 }]);
      b.door(main, bk, lob.x0 + 5, y, LZ1, {});
      furnishOffice(b, wl, 4, y, 4, lob.x0 - 7, A.z1 - 8, 'open', rng, { desks: 6 });
      furnishOffice(b, wr, lob.x1 + 3, y, 4, W - lob.x1 - 7, A.z1 - 8, 'open', rng, { desks: 3 });
      b.stairs(lobby, [lob.x0 + 8.5, 1, mezz.z0 - 2 * (FH - 1) - 2], main, [lob.x0 + 8.5, y, mezz.z0 + 2]);
      RM[i] = main;
      continue;
    }
    main = i === iE ? b.room('Observation Deck', x0, y, z0, w, FH - 1, d, { lightMode: 'always', ambient: 0.8, lightColor: [1, 0.9, 0.75] })
      : b.room(`${ordinal(floorLabel(i))} Floor`, x0, y, z0, w, FH - 1, d, { lightMode: 'auto' });
    RM[i] = main;
  }
  // ---- core: the stair through every floor (rooms registered after the floors so they take precedence)
  const core = stairCore(b, stX, stZ, FH, 0, NF, { mat: MAT.concrete, wall: MAT.plaster_cream, doorX: 0 });
  for (let i = 0; i < NF; i++) if (RM[i]) b.door(RM[i], core.rooms[i], stX + 2, yb(i), stZ - 1, { leaf: 'door_wood', tint: '#6a4a2a' });

  // office floors: furnish by tenant
  const TENANT = { 2: 'exec', 3: 'insurance', 4: 'law', 8: 'dentist', 13: 'open', 16: 'open' };
  for (let i = 2; i < iD; i++) {
    const s = secOf(i), y = yb(i), room = RM[i];
    const x0 = s.x0 + 2, z0 = s.z0 + 2, w = s.w - 4, d = s.d - 4;
    const kind = TENANT[i] || 'light';
    // front private offices along the windows, left of the core: two partitions + glazed doors
    const pz = Math.min(stZ - 10, z0 + 18);
    if (kind !== 'light') {
      partitionX(f, x0, stX - 2, y, pz, FH - 1, MAT.wood_panel_light, [{ at: x0 + 6, w: 4 }, { at: x0 + Math.round((stX - x0) / 2) + 2, w: 4 }]);
      partitionZ(f, z0, pz, y, x0 + Math.round((stX - x0) / 2), FH - 1, MAT.wood_panel_light, []);
      const o1 = b.room(`${ordinal(i + 1)} Floor — Private Office`, x0, y, z0, Math.round((stX - x0) / 2), FH - 1, pz - z0, { lightMode: 'auto' });
      const o2 = b.room(`${ordinal(i + 1)} Floor — Private Office`, x0 + Math.round((stX - x0) / 2) + 1, y, z0, stX - 2 - (x0 + Math.round((stX - x0) / 2) + 1), FH - 1, pz - z0, { lightMode: 'auto' });
      b.door(room, o1, x0 + 8, y, pz, { leaf: 'door_glass', tint: '#6a4a2a' });
      b.door(room, o2, x0 + Math.round((stX - x0) / 2) + 4, y, pz, { leaf: 'door_glass', tint: '#6a4a2a' });
      const sp1 = furnishOffice(b, o1, x0 + 1, y, z0 + 1, Math.round((stX - x0) / 2) - 2, pz - z0 - 2, kind === 'dentist' ? 'dentist' : kind === 'law' ? 'law' : 'exec', rng);
      const sp2 = furnishOffice(b, o2, x0 + Math.round((stX - x0) / 2) + 2, y, z0 + 1, stX - 4 - (x0 + Math.round((stX - x0) / 2) + 1), pz - z0 - 2, kind === 'dentist' ? 'dentist' : 'law', rng);
      const gen = furnishOffice(b, room, stX + 30, y, z0 + 2, Math.max(12, s.x1 - 4 - stX - 30), Math.max(10, stZ - z0 - 6), kind === 'dentist' ? 'waiting' : kind === 'insurance' ? 'insurance' : 'open', rng, { desks: kind === 'open' ? 4 : 3 });
      // Saturday: the dentist keeps morning hours; the Centennial Committee (floor 17) is busy all day
      if (kind === 'dentist') { if (sp1[0]) b.job('dentist', sp1[0], { shift: ['9:00', '12:30'], title: 'dentist', outfit: 'doctor' }); if (gen[0]) b.job('receptionist', gen[0], { shift: ['8:45', '12:30'], sex: 'F', title: 'dental receptionist' }); if (sp2[0]) wkJob(b, 'dentist', sp2[0], {}); }
      else { for (const s0 of [...sp1, ...gen].slice(0, i % 2 ? 1 : 2)) wkJob(b, 'office clerk', s0, { title: 'clerk' }); }
    } else {
      // lightly used floor: a pair of desks, cabinets and dust sheets
      const sp = officeDesk(b, room, x0 + 10, y, z0 + 8, 0, { lamp: false, phone: i % 2 === 0 });
      f.prop('filing_cabinet', x0 + 2, y, z0 + d - 1.3, 0, {});
      if (i % 2) f.prop('crate_stack', x0 + w - 8, y, z0 + 6, 0, {}); else f.prop('office_water_cooler', x0 + w - 2, y, z0 + d - 2, 0, {});
      void sp;
    }
    f.prop('ceiling_lamp', s.x0 + s.w * 0.3, y + 11, zc, 0, {});
  }
  // the Centennial Committee works on Saturday
  if (NF >= 18) {
    const i = 16, s = secOf(i), y = yb(i);
    const room = RM[i];
    const tbl = { x: s.x1 - 22, z: s.z0 + 12 };
    f.prop('table_dining', tbl.x, y, tbl.z, 0, { tint: '#e8e0d0' });
    const seats = [];
    for (const [dx, dz, r] of [[-2.2, -3.4, 2], [2.2, -3.4, 2], [-2.2, 3.4, 0], [2.2, 3.4, 0]]) { f.prop('chair_wood', tbl.x + dx, y, tbl.z + dz, r, {}); seats.push(b.spot('sit', tbl.x + dx, y, tbl.z + dz, r, { room, act: 'talk_sit', tags: ['work'], seat: 0.45 })); }
    f.prop('newspaper_pile', tbl.x, y + 3, tbl.z, 0, {}); f.prop('flag_stand', s.x1 - 6, y, s.z0 + 4, 0, {});
    b.job('committee secretary', seats[0], { shift: ['9:00', '17:00'], title: 'Centennial Committee secretary', lines: ['Two thousand programs, and we\'re already out of programs.', 'The fireworks barge is confirmed. Don\'t ask what it cost.'] });
    b.job('committee volunteer', seats[1], { shift: ['9:00', '16:00'], title: 'Centennial Committee volunteer' });
    read(b, s.x1 - 4, y + 5, s.z0 + 4, 'Centennial Committee — Order of the Day', 'JUNIPER BAY CENTENNIAL · HARBOR DAYS\nSaturday, September 26, 1953\n\n10:00  Fair opens, Founders Square\n2:00   Pie judging (Ladies\' Auxiliary tent)\n5:30   Centennial Address — Mayor Walter Pemberton\n       Sealing of the Time Capsule — Miss Augusta Whitcomb\n8:00   Street Dance — Harbor Days Band\n9:00   Fireworks over the harbor\n\nNOTE: WJBY will broadcast the Address live. Speakers are asked to stand CLOSE to the microphone. (Mr. Mayor.)');
  }

  // ---- WJBY: transmitter & business office (floor 20) and studios (floor 21)
  wjby(b, f, RM, secOf, yb, iD, stX, stZ, elZ, cars, FH, rng);

  // ---- observation terrace (floor 22 pavilion + terrace on the roof of the setback below)
  {
    const i = iE, y = yb(i), s = E;
    const pav = RM[i];
    const ter = b.room('Observation Terrace', Dd.x0 + 1, y, Dd.z0 + 1, Dd.w - 2, 10, Dd.d - 2, { lightMode: 'never', ambient: 1, kind: 'terrace' });
    // glass doors on all four sides of the pavilion
    const dz = Math.round((s.z0 + s.z1) / 2);
    for (const [x, zz, ax] of [[s.x0, dz, 'z'], [s.x1 - 1, dz, 'z'], [cx, s.z0, 'x']]) {
      if (ax === 'z') { f.carve(x, y, zz - 2, 1, 9, 4); b.door(pav, ter, x, y, zz, { axis: 'z', leaf: 'door_glass', tint: '#c9a24a' }); }
      else { f.carve(x - 2, y, zz, 4, 9, 2); b.door(pav, ter, x, y, zz, { leaf: 'door_glass', tint: '#c9a24a' }); }
    }
    // terrace nav ring
    const tn = [[Dd.x0 + 5, Dd.z0 + 4], [Dd.x1 - 5, Dd.z0 + 4], [Dd.x1 - 5, Dd.z1 - 4], [Dd.x0 + 5, Dd.z1 - 4]].map(([x, z]) => b.navPoint(ter, x, y, z));
    ctx.nav.chain([...tn, tn[0]]);
    // visitors' spots along the parapet, benches, coin telescopes
    const look = [];
    for (let k = 0; k < 5; k++) look.push(b.spot('stand', Dd.x0 + 8 + k * (Dd.w - 16) / 4, y, Dd.z0 + 2.2, 0, { room: ter, act: 'look', tags: ['observe'], label: 'Taking in the view from the Juniper Trust Building' }));
    for (let k = 0; k < 3; k++) look.push(b.spot('stand', Dd.x0 + 2.2, y, Dd.z0 + 12 + k * 12, 3, { room: ter, act: 'look', tags: ['observe'], label: 'Taking in the view' }));
    for (let k = 0; k < 3; k++) look.push(b.spot('stand', Dd.x1 - 2.2, y, Dd.z0 + 12 + k * 12, 1, { room: ter, act: 'look', tags: ['observe'], label: 'Looking out over the harbour' }));
    for (const [x, z, r] of [[Dd.x0 + 4, Dd.z0 + 1.5, 0], [Dd.x1 - 4, Dd.z0 + 1.5, 0], [Dd.x0 + 1.5, Dd.z1 - 6, 3], [Dd.x1 - 1.5, Dd.z1 - 6, 1]]) {
      f.box(x - 0.5, y, z - 0.5, 1, 4, 1, MAT.iron); f.box(x - 1, y + 4, z - 1, 2, 1, 2, MAT.steel);
      const [ux, uz] = R4[r]; f.box(x - 0.5 + ux, y + 4, z - 0.5 + uz, 1, 1, 1, MAT.steel);
    }
    read(b, Dd.x0 + 4, y + 3, Dd.z0 + 2, 'Coin Telescope', 'TEN CENTS — TWO MINUTES\n\nOn a clear day: Whitcomb Point Light (1868), Gannet Ledge where the MARY ELLEN was lost in 1867, the smoke of the Portland boat, and — if you are patient — the Boston train, a thread of steam along the shore.');
    for (const x of [s.x0 - 8, s.x1 + 8]) { f.prop('bench_park', x, y, s.z1 + 4, 2, {}); b.playerSeat(x, y, s.z1 + 4, 2); b.spot('sit', x, y, s.z1 + 4, 2, { room: ter, act: 'sit', tags: ['bench', 'observe'], seat: 0.45 }); }
    f.prop('flag_pole', cx, y, Dd.z1 - 3, 0, { cat: 'far', scale: 0.8 });
    // the 1929 plaque on the pavilion wall
    f.box(cx - 3, y + 3, s.z0 - 1, 6, 4, 1, MAT.art_deco_gold);
    read(b, cx + 5, y + 4, s.z0 - 2, 'Bronze Plaque — 1929', 'FROM THIS TERRACE, 1929\n\nThe Juniper Trust Building was completed in October 1929, three weeks before the Crash, the tallest building on the coast between Boston and Portland: twenty-two storeys, and with the WJBY mast (added 1931) three hundred and eighty feet to the beacon.\n\nIt was built in eleven months by 312 men. None was lost. Their names are kept in the cornerstone.\n\n"We build upward because we mean to stay." — Josiah Crane, at the topping out, August 14, 1929', 2.5);
    // attendant with a ticket desk inside
    f.prop('desk_office', s.x0 + 8, y, s.z1 - 6, 0, {});
    const att = b.spot('sit', s.x0 + 8, y, s.z1 - 3, 0, { room: pav, act: 'read', tags: ['work'], seat: 0.46, lines: ['Ten cents, please. Hold on to your hat out there.', 'On a clear day you can see the Portland boat.'] });
    f.prop('chair_office', s.x0 + 8, y, s.z1 - 3, 0, {});
    b.job('terrace attendant', att, { shift: ['10:00', '17:00'], title: 'terrace attendant', outfit: 'bellhop' });
    for (let k = 0; k < 3; k++) b.spot('stand', s.x0 + 6 + k * 8, y, s.z0 + 3, 0, { room: pav, act: 'look', tags: ['observe'] });
    void pav;
  }

  // ---- elevators: express to WJBY & the terrace, a local car, and one to the upper offices
  {
    const WJ = iD + 1;
    const lab = (i) => i === 0 ? 'Lobby' : i === 1 ? 'Mezzanine' : i === iE ? `${iE + 1} — Observation Terrace` : i === WJ ? `${WJ + 1} — WJBY Studios` : i === iD ? `${iD + 1} — WJBY Offices & Transmitter` : `${ordinal(i + 1)} Floor`;
    const stops = [
      [0, WJ, iE],
      [0, 1, 2, 4, 8, 16],
      [0, 11, iD, WJ],
    ];
    elevatorBank(b, cars, elZ, FH, NF, (k) => stops[k].map((i) => ({ i, label: lab(i) })), (i) => RM[i], {});
    // the starter's podium in the lobby
    f.prop('lectern', cars[1] - 6, 1, elZ - 4, 0, {});
  }

  // ---- crown & WJBY mast
  crownAndMast(b, f, E, NF * FH, cx, rng);

  // ---- rooftop clutter on the setback roofs
  roofClutter(b, A.x0 + 4, A.z0 + 4, B.x0 - 2, A.z1 - 4, iB * FH + 1, rng, { towerAt: [8, 60], vents: 2, skylights: 0 });
  roofClutter(b, B.x1 + 2, A.z0 + 4, A.x1 - 4, A.z1 - 4, iB * FH + 1, rng, { tower: false, vents: 3, skylights: 1, antenna: false });
  roofClutter(b, B.x0 + 2, B.z0 + 2, C.x0 - 1, B.z1 - 2, iC * FH + 1, rng, { tower: false, vents: 1, skylights: 0, antenna: false });
  f.prop('water_tower', C.x1 + 6, iC * FH + 1, B.z1 - 12, 0, { cat: 'far', scale: 1.4 });

  // cornerstone (on the Grand Avenue corner) and a readable for it
  {
    const L = f.faceFrame('left');
    L.box(LZ(f, 10) - 10, 3, LX(f, 0) - 1, 10, 4, 1, MAT.granite);
    L.text('1929', LZ(f, 10) - 5, 3, LX(f, 0) - 2, GOLD, { align: 'center', font: 'small' });
    read(b, 0.5, 4, 5, 'Cornerstone', 'JUNIPER TRUST BUILDING · MCMXXIX\n\nLaid April 2, 1929, by Josiah Crane, President.\nWithin: a Bible, a Courier of that morning, a list of the 312 men who built her, a WJBY program, and a silver dollar of 1871 — the year of the first deposit at the old Savings Bank across the alley.', 2);
  }
  // ghost sign on the old party wall facing the bank (back of the base)
  {
    const Bk = f.faceFrame('back');
    paint(Bk, 'FIREPROOF OFFICES TO LET', W / 2, 44, D - A.z1, { scale: 1, mat: MAT.sign_cream, bg: MAT.trim_dark, pad: 3 });
    paint(Bk, 'APPLY SUPT. ROOM 104', W / 2, 32, D - A.z1, { scale: 1, font: 'small', mat: MAT.sign_cream });
  }

  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

// Deco mural painted on a lobby side wall. side 'left' = the wall at main x = X whose lobby face points +x.
function muralPanel(f, side, X, z0, y0, rng) {
  // left wall (lobby on +x side) → paint in the RIGHT face frame; right wall → LEFT face frame
  const F = side === 'left' ? f.faceFrame('right') : f.faceFrame('left');
  const zl = side === 'left' ? RX(f, X) : LX(f, X);
  const xa = side === 'left' ? RZ(f, z0) : LZ(f, z0 + 40);
  const w = 40, h = 10;
  F.box(xa - 1, y0 - 1, zl, w + 2, h + 2, 1, MAT.art_deco_gold);
  F.box(xa, y0 + 5, zl, w, h - 5, 1, MAT.plaster_blue);            // sky
  F.box(xa, y0, zl, w, 5, 1, MAT.sign_teal);                        // sea
  // sunburst
  F.box(xa + 20, y0 + 5, zl, 6, 3, 1, MAT.sign_yellow); F.box(xa + 21, y0 + 8, zl, 4, 1, 1, MAT.sign_yellow);
  for (let k = 0; k < 4; k++) F.box(xa + 14 + k * 5, y0 + 9, zl, 1, 1, 1, MAT.sign_gold);
  if (side === 'left') {
    // the schooner JUNIPER, 1851, riding out the gale in the cove
    F.box(xa + 5, y0 + 3, zl, 11, 2, 1, MAT.sign_brown); F.box(xa + 6, y0 + 2, zl, 9, 1, 1, MAT.sign_brown);
    F.box(xa + 8, y0 + 5, zl, 1, 5, 1, MAT.wood_dark); F.box(xa + 12, y0 + 5, zl, 1, 5, 1, MAT.wood_dark);
    F.box(xa + 6, y0 + 6, zl, 2, 3, 1, MAT.canvas_white); F.box(xa + 9, y0 + 6, zl, 3, 3, 1, MAT.canvas_white); F.box(xa + 13, y0 + 6, zl, 2, 2, 1, MAT.canvas_white);
    // the lighthouse on the point
    F.box(xa + 33, y0 + 4, zl, 3, 5, 1, MAT.trim_white); F.box(xa + 33, y0 + 6, zl, 3, 1, 1, MAT.sign_red); F.box(xa + 33, y0 + 9, zl, 3, 1, 1, MAT.lamp_glass);
    F.box(xa + 30, y0 + 3, zl, 9, 2, 1, MAT.rock);
  } else {
    // industry: the cannery stack, a train and the fishing fleet
    F.box(xa + 3, y0 + 3, zl, 10, 4, 1, MAT.brick_red); F.box(xa + 10, y0 + 7, zl, 2, 3, 1, MAT.brick_dark);
    F.box(xa + 16, y0 + 3, zl, 8, 2, 1, MAT.trim_black); F.box(xa + 22, y0 + 5, zl, 2, 2, 1, MAT.trim_black); F.box(xa + 23, y0 + 7, zl, 3, 1, 1, MAT.canvas_white);
    F.box(xa + 29, y0 + 2, zl, 6, 1, 1, MAT.sign_red); F.box(xa + 31, y0 + 3, zl, 1, 4, 1, MAT.wood_dark); F.box(xa + 35, y0 + 2, zl, 4, 1, 1, MAT.sign_white);
  }
  return F;
}

// WJBY — floor 20 (business office & transmitter) and floor 21 (studios)
function wjby(b, f, RM, secOf, yb, iD, stX, stZ, elZ, cars, FH, rng) {
  const s = secOf(iD);
  // ---- floor 20: business office & transmitter room
  {
    const i = iD, y = yb(i), room = RM[i];
    const x0 = s.x0 + 2, z0 = s.z0 + 2, x1 = s.x1 - 2, z1 = s.z1 - 2;
    // transmitter room behind a glass partition at the back
    const tz = stZ + 8 + FH + 1;
    const tz0 = Math.min(z1 - 8, tz);
    partitionX(f, x0, x1, y, tz0 - 1, FH - 1, MAT.plaster_gray, [{ at: x0 + 4, w: 4 }]);
    f.box(x0 + 12, y + 3, tz0 - 1, Math.max(4, x1 - x0 - 20), 6, 1, MAT.glass);
    const tr = b.room('WJBY Transmitter Room', x0, y, tz0, x1 - x0, FH - 1, z1 - tz0, { lightMode: 'always', lightColor: [0.85, 0.95, 1] });
    b.door(room, tr, x0 + 6, y, tz0 - 1, { leaf: 'door_wood', tint: '#4a4a4a' });
    for (let k = 0; k < 5; k++) {
      const tx = x0 + 6 + k * 8;
      if (tx > x1 - 4) break;
      f.box(tx - 3, y, z1 - 4, 6, 9, 3, MAT.enamel_black); f.box(tx - 2, y + 5, z1 - 5, 4, 2, 1, MAT.lamp_glass); f.box(tx - 2, y + 2, z1 - 5, 1, 1, 1, MAT.traffic_red);
    }
    const eng = b.spot('stand', x0 + 14, y, z1 - 8, 2, { room: tr, act: 'counter', tags: ['work'], lines: ['Five thousand watts, day and night.', 'Plate current\'s steady. She\'s a good old rig.'] });
    b.job('transmitter engineer', eng, { shift: ['6:00', '23:59'], title: 'WJBY transmitter engineer', outfit: 'mechanic' });
    read(b, x0 + 6, y + 6, z1 - 5, 'WJBY Transmitter', 'Western Electric 5-kilowatt transmitter, installed 1938 (the old 250-watt set from the bank closet is in the Maritime Museum\'s basement, awaiting a home).\n\nCall letters: WJBY · 1340 kilocycles · "The Voice of the Bay"\nFirst broadcast: March 3, 1928, from a closet above the First Juniper Savings Bank.\nMoved to the 21st floor: January 1930.');
    furnishOffice(b, room, x0 + 2, y, z0 + 2, Math.max(12, stX - x0 - 6), Math.max(10, stZ - z0 - 6), 'open', rng, { desks: 4 });
    f.prop('radio_console', x1 - 4, y, z0 + 3, 2, {});
  }
  // ---- floor 21: studios
  {
    const i = iD + 1, y = yb(i), room = RM[i];
    const x0 = s.x0 + 2, z0 = s.z0 + 2, x1 = s.x1 - 2, z1 = s.z1 - 2;
    const back = stZ + FH + 9;             // behind the stair core
    // big letters on the wall facing the elevators? The reception faces the front windows: paint on the back partition.
    // studio A (left, behind), control room (centre), record library (right)
    const sa = { x0, x1: Math.round(x0 + (x1 - x0) * 0.5), z0: back, z1 };
    const cr = { x0: sa.x1 + 1, x1: Math.round(x0 + (x1 - x0) * 0.78), z0: back, z1 };
    const lib = { x0: cr.x1 + 1, x1, z0: back, z1 };
    partitionX(f, x0, x1, y, back - 1, FH - 1, MAT.wood_panel, [{ at: sa.x0 + 6, w: 4 }, { at: cr.x0 + 3, w: 4 }, { at: lib.x0 + 3, w: 4 }]);
    partitionZ(f, back, z1, y, sa.x1, FH - 1, MAT.wood_panel, []);
    partitionZ(f, back, z1, y, cr.x1, FH - 1, MAT.wood_panel, [{ at: back + 3, w: 4 }]);
    // observation window from the control room into studio A
    f.box(sa.x1, y + 4, back + 6, 1, 5, Math.max(4, z1 - back - 10), MAT.glass);
    const studio = b.room('WJBY Studio A', sa.x0, y, sa.z0, sa.x1 - sa.x0, FH - 1, sa.z1 - sa.z0, { lightMode: 'always', lightColor: [1, 0.9, 0.78] });
    const ctl = b.room('WJBY Control Room', cr.x0, y, cr.z0, cr.x1 - cr.x0, FH - 1, cr.z1 - cr.z0, { lightMode: 'always', lightColor: [0.95, 0.95, 0.9] });
    const recs = b.room('WJBY Record Library', lib.x0, y, lib.z0, lib.x1 - lib.x0, FH - 1, lib.z1 - lib.z0, { lightMode: 'auto' });
    b.door(room, studio, sa.x0 + 8, y, back - 1, { leaf: 'door_wood', tint: '#3a2a20' });
    b.door(room, ctl, cr.x0 + 5, y, back - 1, { leaf: 'door_wood', tint: '#3a2a20' });
    b.door(room, recs, lib.x0 + 5, y, back - 1, { leaf: 'door_wood', tint: '#3a2a20' });
    b.door(ctl, recs, cr.x1, y, back + 5, { axis: 'z', leaf: false });
    // acoustic tile walls in the studio (quilted look), carpet
    f.box(sa.x0, y - 1, sa.z0, sa.x1 - sa.x0, 1, sa.z1 - sa.z0, MAT.carpet_blue);
    f.box(sa.x0, y + 1, sa.z1 - 0, sa.x1 - sa.x0, FH - 3, 0 + 1, MAT.ceiling_tin);
    f.prop('on_air_sign', sa.x0 + 8, y + 10, back - 1.6, 0, {});
    f.box(sa.x0 + 6, y + 10, back - 2, 5, 2, 1, MAT.neon_red);
    const scx = (sa.x0 + sa.x1) / 2, scz = (sa.z0 + sa.z1) / 2;
    f.prop('piano_grand', sa.x0 + 6, y, sa.z1 - 7, 1, {});
    f.prop('mic_stand', scx, y, scz, 2, {});
    const ann = b.spot('stand', scx, y, scz - 2, 2, { room: studio, act: 'announce', tags: ['work', 'radio'], label: 'On the air at WJBY',
      lines: ['This is WJBY, 1340 on your dial — the Voice of the Bay.', 'Live from the twenty-first floor of the Juniper Trust Building...', 'Harbor Days coverage continues all afternoon. The pie judging is, we are told, tense.', 'And now, a word from Halloran & Sons, bakers since 1887.', 'At five-thirty we take you live to Founders Square for the Mayor\'s Centennial Address.'] });
    b.job('announcer', ann, { shift: ['6:00', '23:30'], title: 'WJBY announcer' });
    f.prop('mic_stand', sa.x1 - 6, y, scz + 3, 3, {}); f.prop('music_stand', sa.x1 - 5, y, scz + 6, 3, {});
    for (let k = 0; k < 3; k++) { f.prop('chair_folding', sa.x1 - 3, y, scz + 1 + k * 3, 3, {}); b.spot('sit', sa.x1 - 3, y, scz + 1 + k * 3, 3, { room: studio, act: 'listen_sit', tags: ['radio'], seat: 0.45 }); }
    f.prop('clock_wall', scx, y + 9, sa.z1 - 0.6, 2, {});
    // control room: the console, two turntables, the engineer
    const ccx = (cr.x0 + cr.x1) / 2;
    f.prop('radio_console_studio', cr.x0 + 3, y, (cr.z0 + cr.z1) / 2, 3, {});
    const engr = b.spot('sit', cr.x0 + 6.2, y, (cr.z0 + cr.z1) / 2, 3, { room: ctl, act: 'type', tags: ['work', 'radio'], seat: 0.46, lines: ['Stand by... and you\'re on.', 'Levels are good. Tell him to back off the mike a hair.'] });
    f.prop('chair_office', cr.x0 + 6.2, y, (cr.z0 + cr.z1) / 2, 3, {});
    b.job('engineer', engr, { shift: ['6:00', '23:30'], title: 'WJBY studio engineer' });
    f.prop('phonograph', ccx + 1, y, cr.z1 - 2, 0, {}); f.prop('phonograph', ccx + 4, y, cr.z1 - 2, 0, {});
    f.prop('clock_wall', ccx, y + 9, cr.z0 + 0.6, 2, {});
    read(b, ccx, y + 5, cr.z1 - 2, 'Today\'s Log — WJBY', 'SATURDAY, SEPT. 26, 1953 — CENTENNIAL SCHEDULE\n\n6:00  Sign-on. Farm & Fisheries Report\n7:00  Breakfast with Bill Ferris\n10:00 Harbor Days — remote from Founders Square\n1:00  Red Sox vs. Yankees (network)\n4:00  First Congregational Choir (transcription)\n5:30  LIVE: Mayor Pemberton\'s Centennial Address\n7:00  "The Lone Ranger" (network)\n8:00  Street Dance remote — Harbor Days Band\n9:00  Fireworks — description by Bill Ferris\n11:00 Earl Freeman Quartet, live from the Blue Lantern\n12:00 Sign-off: "The Star-Spangled Banner"');
    // record library
    for (let k = 0; k < 4; k++) f.prop('record_bins', lib.x0 + 3 + k * 4, y, lib.z1 - 2, 0, {});
    f.prop('bookshelf', lib.x1 - 2, y, lib.z0 + 3, 3, {});
    b.spot('stand', lib.x0 + 6, y, lib.z1 - 5, 2, { room: recs, act: 'browse', tags: ['radio'] });
    // reception by the elevators
    const rx = x1 - 12, rz = z0 + 6;
    f.prop('desk_office', rx, y, rz, 2, {}); f.prop('chair_office', rx, y, rz + 3, 0, {}); f.prop('telephone', rx, y + 3, rz, 2, {});
    const rec = b.spot('sit', rx, y, rz + 3, 0, { room, act: 'phone', tags: ['work'], seat: 0.46, lines: ['WJBY, good afternoon.', 'Request line is open until nine.'] });
    b.job('receptionist', rec, { shift: ['9:00', '17:00'], sex: 'F', title: 'WJBY receptionist' });
    f.prop('sofa', x0 + 8, y, z0 + 3, 2, { tint: '#8a2a2a' }); f.prop('rubber_plant', x0 + 3, y, z0 + 3, 0, {});
    b.spot('sit', x0 + 8, y, z0 + 3.4, 2, { room, act: 'wait', tags: ['radio'], seat: 0.42 });
    // WJBY letters on the partition, facing the front windows? (the partition faces +z). Use neon on the reception wall.
    paint(f, 'WJBY 1340', (x0 + x1) / 2, y + 7, z0 - 1 + 1, { font: 'small', mat: MAT.neon_red, pad: 0 });
    read(b, (x0 + x1) / 2, y + 5, z0 + 1, 'Framed Letter', 'The White House, Washington\nMarch 12, 1933\n\nTo the Management of Station WJBY:\n\nThe President has asked me to thank your station for carrying his radio address of this evening to the people of your coast. He hopes that it has brought to your listeners some measure of confidence in the days ahead.\n\n— Secretary to the President\n\n(Station manager\'s note, pinned below: "Three hundred and eleven people wrote in. Forty-one asked us to play it again.")');
  }
}

// Stepped deco crown on top of the pavilion and the red-and-white WJBY lattice mast with beacons.
function crownAndMast(b, f, E, y0, cx, rng) {
  const CREAM = MAT.art_deco_cream, GOLD = MAT.art_deco_gold;
  const zc = (E.z0 + E.z1) / 2;
  const tiers = [[E.w - 12, E.d - 12, 12], [E.w - 26, E.d - 24, 10], [E.w - 36, E.d - 32, 8]];
  let y = y0 + 1;
  tiers.forEach(([w, d, h], k) => {
    w = Math.max(6, Math.round(w / 2) * 2); d = Math.max(6, Math.round(d / 2) * 2);
    const x0 = cx - w / 2, z0 = Math.round(zc - d / 2);
    f.box(x0, y, z0, w, h, d, k === 2 ? GOLD : CREAM);
    // vertical gold fins on the long faces
    for (let x = x0 + 2; x < x0 + w - 1; x += 4) { f.box(x, y, z0 - 1, 1, h + (k < 2 ? 2 : 0), 1, GOLD); f.box(x, y, z0 + d, 1, h + (k < 2 ? 2 : 0), 1, GOLD); }
    for (let z = z0 + 2; z < z0 + d - 1; z += 4) { f.box(x0 - 1, y, z, 1, h, 1, GOLD); f.box(x0 + w, y, z, 1, h, 1, GOLD); }
    f.walls(x0, y + h, z0, w, 1, d, GOLD, 1);
    if (k === 0) {
      // WJBY in red neon on front and back
      f.text('WJBY', cx, y + 2, z0 - 2, MAT.neon_red, { align: 'center', font: 'big' });
      const Bk = f.faceFrame('back');
      Bk.text('WJBY', f.W - cx, y + 2, f.D - (z0 + d) - 1, MAT.neon_red, { align: 'center', font: 'big' });
      b.light(cx, y + 5, z0 - 3, { color: [1, 0.25, 0.2], radius: 10, mode: 'night' });
    }
    y += h;
  });
  // the mast: tapering square lattice in red and white bands
  const Hm = 124, band = 8;
  const base = y;
  for (let k = 0; k * band < Hm; k++) {
    const yy = base + k * band;
    const t = (k * band) / Hm;
    const half = Math.max(1, Math.round(6 - t * 4.5));
    const mat = k % 2 === 0 ? MAT.steel_red : MAT.steel_white;
    const x0 = cx - half, z0 = Math.round(zc) - half, s = half * 2;
    for (const [lx, lz] of [[x0, z0], [x0 + s - 1, z0], [x0, z0 + s - 1], [x0 + s - 1, z0 + s - 1]]) f.box(lx, yy, lz, 1, band, 1, mat);
    if (s > 2) {
      f.walls(x0, yy + band - 1, z0, s, 1, s, mat, 1);
      // K-bracing: a short diagonal of three steps on each face
      for (let j = 0; j < 3 && s > 3; j++) {
        const px = x0 + Math.round((s - 1) * (j + 1) / 4), py = yy + Math.round((band - 1) * (j + 1) / 4);
        f.box(px, py, z0, 1, 1, 1, mat); f.box(px, py, z0 + s - 1, 1, 1, 1, mat);
        f.box(x0, py, z0 + s - 1 - Math.round((s - 1) * (j + 1) / 4), 1, 1, 1, mat); f.box(x0 + s - 1, py, z0 + Math.round((s - 1) * (j + 1) / 4), 1, 1, 1, mat);
      }
    }
    // obstruction beacons every few bands
    if (k % 5 === 4) {
      for (const [lx, lz] of [[x0 - 1, z0 - 1], [x0 + s, z0 + s]]) f.box(lx, yy + band - 2, lz, 1, 1, 1, MAT.traffic_red);
      b.light(cx, yy + band - 1, zc, { color: [1, 0.12, 0.08], radius: 6, mode: 'night' });
    }
  }
  const top = base + Math.ceil(Hm / band) * band;
  f.box(cx - 1, top, Math.round(zc) - 1, 2, 2, 2, MAT.traffic_red);
  f.box(cx - 0.5 < cx ? cx : cx, top + 2, Math.round(zc), 1, 6, 1, MAT.steel);
  b.light(cx, top + 1, zc, { color: [1, 0.1, 0.05], radius: 14, mode: 'night' });
  void rng;
  return top;
}

// Placeholders filled in below

// =====================================================================================================
// OFFICE BLOCKS — the Mercantile Building (1905, clock tower), the Beacon Building (1926, green-tile
// mansard with a beacon lantern) and the Harbor Insurance Building (1911)
// =====================================================================================================
const OFFICE_INFO = {
  'Mercantile Building': {
    lore: 'Built 1905 on the ashes of the Great Fire, in yellow brick "that will not burn twice". Its corner clock tower has kept Juniper Bay\'s time for half a century.',
    ground: [['Juniper Bay Gas & Electric', 'utility'], ['Mercantile Lunch', 'lunch']],
    floors: {
      2: [['Whitcomb & Pike, Attorneys', 'law'], ['Whitcomb & Pike, Attorneys', 'law'], ['Hollis Real Estate', 'open'], ['Hollis Real Estate', 'exec']],
      3: [['Harold Alden, D.D.S.', 'dentist'], ['Dr. Alden - Waiting Room', 'waiting'], ['Lena Weiss, Optometrist', 'exam'], ['Vacant', 'empty']],
      4: [['Bayside Mutual Insurance', 'insurance'], ['Bayside Mutual Insurance', 'exec']],
      5: [['Ellis & Co., Accountants', 'open'], ['Ellis & Co., Accountants', 'exec']],
      6: [['Pratt Secretarial School', 'school']],
      7: [['Juniper Bay Board of Trade', 'exec'], ['Board of Trade - Library', 'law']],
    },
  },
  'Beacon Building': {
    lore: 'Put up in 1926 by the Beacon Mutual Life Assurance Society, with a green-tiled roof and a lantern that has burned every night since — "a light for the living".',
    ground: [['New England Tel. & Tel.', 'phoneco'], ['Beacon Cigars & Shoe Shine', 'cigar']],
    floors: {
      2: [['Martin Hale, M.D.', 'exam'], ['Dr. Hale - Waiting Room', 'waiting']],
      3: [['Crane, Whitcomb & Lowe', 'law'], ['Crane, Whitcomb & Lowe', 'law']],
      4: [['Beacon Mutual Life', 'insurance'], ['Beacon Mutual Life', 'insurance'], ['Beacon Mutual Life', 'exec']],
      5: [['Beacon Mutual Life', 'insurance'], ['Beacon Mutual Life', 'open']],
      6: [['Atlantic Fisheries Assn.', 'open']],
      7: [['Selective Service Board 7', 'open'], ['Veterans Service Office', 'exec']],
      8: [['Frances Moody, D.D.S.', 'dentist'], ['Dr. Moody - Waiting Room', 'waiting']],
      9: [['Merrill & Sons, Architects', 'open']],
      10: [['Portland Steamship Co.', 'open']],
      11: [['Vacant', 'empty']],
      12: [['Beacon Mutual - Executive', 'exec'], ['Beacon Mutual - Board Room', 'law']],
    },
  },
  'Harbor Insurance Building': {
    lore: 'Home since 1911 of the Harbor Mutual Insurance Company, which wrote the policies on half the fleet — and paid every claim after the hurricane of 1938.',
    ground: [['Harbor Mutual Insurance Co.', 'agency'], ['Juniper Bay Realty', 'realty']],
    floors: {
      2: [['Harbor Mutual - Underwriting', 'insurance'], ['Harbor Mutual - Underwriting', 'insurance'], ['Harbor Mutual - Underwriting', 'open']],
      3: [['Harbor Mutual - Marine Claims', 'insurance'], ['Harbor Mutual - Marine Claims', 'open'], ['Harbor Mutual - President', 'exec']],
      4: [['Kessler & Ross, Attorneys', 'law'], ['Kessler & Ross, Attorneys', 'law'], ['J. P. Lowe, Notary Public', 'exec']],
      5: [['Samuel Weir, D.D.S.', 'dentist'], ['Dr. Weir - Waiting Room', 'waiting'], ['Coastal Surveyors', 'open']],
      6: [['Harbor Pilots Association', 'open'], ['American Red Cross', 'open']],
      7: [['Harbor Mutual - Records', 'open']],
    },
  },
};
const TENANT_POOL = ['Coastal Surveyors', 'Dunmore Timber Co.', 'Bay State Mutual', 'Wm. Tolliver, Stenographer', 'Harbor Pilots Assn.', 'Crosby Advertising', 'New England Linen Supply', 'Juniper Bay Realty Trust', 'Garden Club of Juniper Bay', 'R. Kessler, Physician'];

function buildOffice(ctx, lot, spec) {
  const rng = ctx.rng.fork('office' + lot.x + ',' + lot.z);
  const name = spec.name || 'Office Building';
  const NF = Math.max(3, spec.floors || 6), FH = 14, W = lot.w, D = lot.d;
  const style = spec.clock ? 'clock' : NF >= 10 ? 'beacon' : 'classic';
  const est = spec.est || 1910;
  const INFO = OFFICE_INFO[name] || { floors: {}, ground: [['Offices', 'open'], ['Offices', 'open']] };
  const b = new Building(ctx, { name, kind: 'office', lot, address: lot.address, established: est, hours: [T(7), T(18)], lore: INFO.lore || `${name}, erected ${est}.` });
  const f = b.f;
  const BD = Math.max(48, D - 8), H = NF * FH, cx = Math.round(W / 2);
  const sides = streetSides(lot);
  const pal = style === 'clock' ? { outer: MAT.brick_yellow, trim: MAT.limestone, base: MAT.sandstone, cornice: MAT.limestone, inner: MAT.plaster_cream, sash: MAT.trim_green }
    : style === 'beacon' ? { outer: MAT.brick_brown, trim: MAT.limestone, base: MAT.limestone, cornice: MAT.limestone, inner: MAT.plaster_green, sash: MAT.trim_white }
      : { outer: MAT.brick_red, trim: MAT.limestone, base: MAT.granite, cornice: MAT.roof_copper, inner: MAT.plaster_cream, sash: MAT.trim_white };
  f.box(0, -1, 0, W, 1, D, MAT.sidewalk);
  f.box(0, -1, BD, W, 1, D - BD, MAT.concrete);
  shell(f, 0, 0, 0, W, H, BD, pal.outer, pal.inner);
  for (let i = 0; i < NF; i++) slab(f, 1, i * FH, 1, W - 2, BD - 2, i === 0 ? MAT.floor_terrazzo : (i % 2 ? MAT.floor_linoleum : MAT.floor_oak));
  f.walls(0, 0, 0, W, style === 'beacon' ? 2 * FH : FH, BD, pal.base, 1);
  f.walls(-1, 0, -1, W + 2, 2, BD + 2, MAT.granite, 1);

  // ---- facades
  const fc = facesOf(f, 0, 0, W, BD);
  const WW = 5, PITCH = 9;
  const faceRows = (face, first, last, o = {}) => {
    const cols = colsIn(face.a, face.b, WW, PITCH, 5);
    const lo = style === 'beacon' ? Math.min(2, last) : first;
    if (style === 'beacon' && first < 2) gridFacade(face, cols, WW, rowsFor(first, Math.min(2, last), FH, 3, 8), { wall: pal.base, inner: pal.inner, sashMat: pal.sash, sill: pal.trim });
    const topRow = style === 'beacon' ? last - 1 : last;
    if (topRow > lo) gridFacade(face, cols, WW, rowsFor(lo, topRow, FH, 3, 8), { wall: pal.outer, inner: pal.inner, sashMat: pal.sash, sill: pal.trim, lintels: o.lintels === false ? null : pal.trim, lintelWide: true });
    if (style === 'beacon' && last > topRow) gridFacade(face, cols, WW, rowsFor(topRow, last, FH, 3, 8), { wall: pal.trim, inner: pal.inner, sashMat: pal.sash, sill: pal.trim });
    return cols;
  };
  faceRows(fc.front, 1, NF);
  for (const side of ['left', 'right']) {
    if (sides[side]) {
      const cols = faceRows(fc[side], 0, NF);
      if (style === 'classic' && side === 'left') fireEscape(fc[side].F, cols[Math.floor(cols.length / 2)] - 3, 12, 0, NF, FH, { z: fc[side].zf });
    }
  }
  // back: windows on the lower floors, the rest a blank wall carrying an old painted sign
  const backRows = Math.min(NF, 4);
  faceRows(fc.back, 1, backRows, { lintels: false });
  {
    const F = fc.back.F, zf = fc.back.zf;
    const y0 = backRows * FH + 6;
    const GH = {
      'Mercantile Building': [['HALLORAN\'S BREAD', 'FRESH DAILY - 5 CENTS', MAT.sign_cream, MAT.sign_red]],
      'Beacon Building': [['UNEEDA BISCUIT', 'NATIONAL BISCUIT CO.', MAT.sign_cream, MAT.sign_navy]],
      'Harbor Insurance Building': [['MAIL POUCH', 'CHEW - TREAT YOURSELF TO THE BEST', MAT.sign_yellow, MAT.trim_dark]],
    }[name] || [['CASTORIA', 'CHILDREN CRY FOR IT', MAT.sign_cream, MAT.sign_brown]];
    const [l1, l2, fg, bg] = GH[0];
    if (H - y0 > 30) {
      const sc = W >= 160 ? 3 : 2;
      paint(F, l1, W / 2, y0 + 14, zf, { scale: sc, mat: fg, bg, pad: 4 });
      paint(F, l2, W / 2, y0 + 4, zf, { font: 'small', scale: sc > 2 ? 2 : 1, mat: fg });
    }
  }
  // Beacon: the upper floors rise above its neighbour — a second ghost sign on the exposed party wall
  if (style === 'beacon' && !sides.left) paint(fc.left.F, 'CASTORIA', (fc.left.a + fc.left.b) / 2, H - 44, fc.left.zf, { scale: 3, mat: MAT.sign_cream, bg: MAT.sign_brown, pad: 4 });
  if (style === 'beacon' && !sides.left) paint(fc.left.F, 'CHILDREN CRY FOR IT', (fc.left.a + fc.left.b) / 2, H - 58, fc.left.zf, { font: 'small', scale: 2, mat: MAT.sign_cream });

  // ---- cornice & roof
  const topY = H;
  for (const side of ['front', 'left', 'right']) {
    if (side !== 'front' && !sides[side]) continue;
    const face = fc[side];
    if (style !== 'beacon') cornice(face.F, face.a, topY - 1, face.b - face.a, pal.cornice, { z: face.zf, brackets: 4 });
    face.F.box(face.a, FH - 1, face.zf - 1, face.b - face.a, 1, 1, pal.trim);     // belt over the ground floor
  }
  let roofTop = topY;
  if (style === 'beacon') {
    const mm = mansard(f, -1, topY, -1, W + 2, BD + 2, MAT.roof_teal_tile, { steps: 7, rise: 3, cap: 6 });
    f.walls(-2, topY - 1, -2, W + 4, 1, BD + 4, pal.trim, 1);
    // dormers on the front and back of the mansard
    for (const side of ['front', 'back']) {
      const F = fc[side].F, zf = fc[side].zf;
      for (const x of colsIn(8, W - 8, 6, 18, 2)) {
        F.box(x - 1, topY + 2, zf - 1, 8, 10, 5, MAT.roof_teal_tile);
        F.box(x, topY + 3, zf - 1, 6, 7, 1, MAT.glass_dark);
        F.box(x - 1, topY + 2, zf - 2, 8, 1, 1, pal.trim);
        F.gable(x - 1, topY + 12, zf - 1, 8, 5, MAT.roof_teal_tile, { axis: 'z', overhang: 0, gableMat: pal.trim });
      }
    }
    // the lantern with the beacon lamp
    const lx = cx - 5, lz = Math.round(BD / 2) - 5;
    f.box(lx - 2, mm.top, lz - 2, 14, 1, 14, pal.trim);
    f.walls(lx, mm.top + 1, lz, 10, 10, 10, pal.trim, 1);
    for (const [ax, az, w, d] of [[lx + 2, lz, 6, 1], [lx + 2, lz + 9, 6, 1], [lx, lz + 2, 1, 6], [lx + 9, lz + 2, 1, 6]]) f.box(ax, mm.top + 3, az, w, 6, d, MAT.glass);
    f.box(lx + 3, mm.top + 3, lz + 3, 4, 5, 4, MAT.lighthouse_lamp);
    f.box(lx - 1, mm.top + 11, lz - 1, 12, 1, 12, MAT.roof_copper);
    f.dome(lx + 5, mm.top + 12, lz + 5, 6, MAT.roof_copper, { heightScale: 0.9 });
    f.box(lx + 5, mm.top + 17, lz + 5, 1, 6, 1, MAT.iron); f.box(lx + 4.5 < lx + 5 ? lx + 5 : lx + 5, mm.top + 23, lz + 5, 1, 1, 1, MAT.art_deco_gold);
    b.light(lx + 5, mm.top + 6, lz + 5, { color: [1, 0.92, 0.7], radius: 16, mode: 'night' });
    roofTop = mm.top + 24;
    // name on the base frieze
  } else {
    f.box(0, topY, 0, W, 1, BD, MAT.roof_tar);
    f.walls(0, topY + 1, 0, W, 3, BD, pal.outer, 1);
    f.walls(-1, topY + 4, -1, W + 2, 1, BD + 2, pal.trim, 1);
    roofClutter(b, 4, BD * 0.45, W - (style === 'clock' ? 34 : 4), BD - 4, topY + 1, rng, { towerAt: [W * 0.25, BD * 0.3], towerScale: 1.35, vents: 3, skylights: 1 });
  }

  // ---- ground floor
  const stX = cx - 13, stZ = BD - 24;                // stair core (near landing faces the corridor)
  const carX = cx + 4;                                // elevator car centre (shaft cx .. cx+8)
  const corr0 = stZ - 11, corr1 = stZ - 1;            // corridor z range on the upper floors
  const lobX0 = cx - 16, lobX1 = cx + 12;
  // entrance: a stone surround with the name and the date
  f.carve(cx - 4, 1, 0, 8, 10, 2);
  f.box(cx - 6, 0, -1, 12, 14, 1, pal.trim);
  f.carve(cx - 4, 1, -1, 8, 10, 1);
  f.box(cx - 4, 1, 1, 8, 10, 1, MAT.glass); f.carve(cx - 2, 1, 1, 4, 9, 1);
  f.box(cx - 4, 8, 0, 8, 1, 1, MAT.art_deco_gold);
  f.box(cx - 6, 11, -2, 12, 1, 1, pal.trim);
  const nm = name.toUpperCase();
  const nmW = f.textWidth(nm, 1, 'small');
  if (nmW < W - 8) f.text(nm, cx, FH + 1, -1, style === 'beacon' ? MAT.art_deco_gold : MAT.trim_dark, { align: 'center', font: 'small' });
  f.text(String(est), cx, 12, -2, MAT.art_deco_gold, { align: 'center', font: 'small' });
  // shopfronts left and right of the entrance
  const shops = INFO.ground;
  const shopX = [[2, lobX0 - 1], [lobX1 + 1, W - 2]];
  shopX.forEach(([x0, x1], k) => {
    const w = x1 - x0;
    f.carve(x0 + 1, 1, 0, w - 2, 10, 2);
    f.box(x0 + 1, 1, 0, w - 2, 2, 1, MAT.wood_dark); f.box(x0 + 1, 3, 0, w - 2, 7, 1, MAT.glass_shop);
    for (let x = x0 + 1; x < x1 - 1; x += 6) f.box(x, 3, 0, 1, 7, 1, MAT.trim_dark);
    const dx = k === 0 ? x1 - 7 : x0 + 3;
    f.carve(dx, 1, 0, 4, 9, 2); f.box(dx, 10, 0, 4, 1, 1, MAT.trim_dark);
    const label = (shops[k] || ['Offices'])[0].toUpperCase();
    f.box(x0 + 1, 11, -1, w - 2, 5, 1, MAT.sign_black);
    if (f.textWidth(label, 1, 'small') < w - 4) f.text(label, (x0 + x1) / 2, 11, -2, MAT.sign_gold, { align: 'center', font: 'small' });
    awning(f, x0 + 2, 10, w - 4, { depth: 4, matA: k === 0 ? MAT.awning_solid_green : MAT.awning_solid_red, matB: MAT.canvas_white });
  });
  // cornerstone
  f.box(2, 1, -1, 8, 3, 1, MAT.granite);
  f.text(String(est), 6, 1, -2, MAT.trim_cream, { align: 'center', font: 'small' });
  read(b, 6, 2, -1.5, 'Cornerstone', `${nm}\nA.D. ${est}` + (est >= 1903 && est <= 1906 ? '\n\nLaid in the year after the Great Fire of June 11, 1902, which burned three blocks of Market Street. Every building on this block was rebuilt in brick or stone by order of the Selectmen.' : est === 1926 ? '\n\n"Beacon Mutual Life Assurance Society — A Light for the Living."\nLaid by Mrs. Eliza Whitcomb Crane, June 1926.' : '\n\nHarbor Mutual Insurance Company. "We sail with you."'), 1.8);

  // rooms: ground floor
  const lobby = b.room('Lobby', lobX0, 1, 2, lobX1 - lobX0, FH - 1, corr1 - 2, { lightMode: 'always', lightColor: [1, 0.88, 0.68] });
  partitionZ(f, 2, BD - 2, 1, lobX0 - 1, FH - 1, MAT.marble, []);
  partitionZ(f, 2, BD - 2, 1, lobX1, FH - 1, MAT.marble, []);
  f.box(lobX0, 0, 2, lobX1 - lobX0, 1, corr1 - 2, MAT.floor_marble);
  const shopRooms = shopX.map(([x0, x1], k) => b.room((shops[k] || ['Offices'])[0], x0, 1, 2, x1 - x0 - 1, FH - 1, BD - 4, { lightMode: 'day', lightColor: [1, 0.9, 0.72] }));
  b.entrance(lobby, cx, 1, 0, { outZ: -7, outY: 0, leaf: 'door_glass', tint: '#6a4a2a', main: true });
  shopX.forEach(([x0, x1], k) => b.entrance(shopRooms[k], k === 0 ? x1 - 5 : x0 + 5, 1, 0, { outZ: -7, outY: 0, leaf: 'door_glass', tint: k === 0 ? '#2f4f3a' : '#8e2a24' }));
  // lobby dressing
  f.prop('ceiling_lamp', cx, 10, 12, 0, {}); f.prop('ceiling_lamp', cx, 10, corr1 - 12, 0, {});
  f.box(lobX0 + 2, 4, 20, 1, 8, 10, MAT.trim_black);
  for (let k = 0; k < 6; k++) f.box(lobX0 + 3, 5 + k, 21 + (k % 3), 0 + 1, 1, 5 + (k * 3) % 4, MAT.sign_white);
  const floorsList = [];
  for (let n = 2; n <= NF; n++) { const t = (INFO.floors[n] || []).map((q) => q[0]).filter((q, i, a) => a.indexOf(q) === i && !/Waiting|Vacant/.test(q)); floorsList.push(`${n} — ${t.length ? t.join(' · ') : TENANT_POOL[(n * 3 + est) % TENANT_POOL.length]}`); }
  read(b, lobX0 + 3.5, 8, 25, 'Directory', `${nm}\n\nLOBBY — ${shops.map((q) => q[0]).join(' · ')}\n` + floorsList.join('\n') + '\n\nElevator attendant on duty 7 to 6.', 2);
  f.prop('mailbox_usps', lobX1 - 2, 1, 6, 3, {}); f.prop('umbrella_stand', lobX0 + 2, 1, 4, 1, {});

  // ---- upper floors: corridor, front offices, back offices around the core
  const RM = [lobby];
  const nFront = Math.max(2, Math.round((W - 4) / 29));
  const fw = (W - 4) / nFront;
  let poolK = 0;
  for (let i = 1; i < NF; i++) {
    const y = i * FH + 1, flr = i + 1;
    const wall = i % 2 ? MAT.plaster_cream : pal.inner;
    const corr = b.room(`${ordinal(flr)} Floor Corridor`, 2, y, corr0, W - 4, FH - 1, corr1 - corr0, { lightMode: 'auto', nav: [cx, corr0 + 5] });
    RM[i] = corr;
    f.box(2, y - 1, corr0, W - 4, 1, corr1 - corr0, MAT.floor_linoleum_green);
    // front offices
    const gaps = [];
    for (let k = 0; k < nFront; k++) gaps.push({ at: Math.round(2 + k * fw + fw / 2 - 2), w: 4 });
    partitionX(f, 2, W - 2, y, corr0 - 1, FH - 1, wall, gaps);
    for (let k = 1; k < nFront; k++) partitionZ(f, 2, corr0 - 1, y, Math.round(2 + k * fw), FH - 1, wall, []);
    const tenants = INFO.floors[flr] || [];
    for (let k = 0; k < nFront; k++) {
      const x0 = Math.round(2 + k * fw) + (k > 0 ? 1 : 0), x1 = Math.round(2 + (k + 1) * fw);
      let [tn, kind] = tenants[k] || tenants[tenants.length - 1] || [TENANT_POOL[(poolK++ + est) % TENANT_POOL.length], rng.pick(['open', 'law', 'exec', 'open'])];
      if (!tenants[k] && tenants.length && kind !== 'school') kind = rng.pick(['open', 'exec']);
      if (kind === 'school' && k > 0) { tn = 'Pratt Secretarial School - Office'; kind = 'exec'; }
      const r = b.room(tn, x0, y, 2, x1 - x0, FH - 1, corr0 - 3, { lightMode: 'auto' });
      const dxd = Math.round(2 + k * fw + fw / 2);
      b.door(corr, r, dxd, y, corr0 - 1, { leaf: kind === 'empty' ? 'door_wood' : 'door_glass', tint: '#6a4a30' });
      if (kind !== 'waiting') f.prop(textSignType(tn.toUpperCase().slice(0, 28), { bg: '#e9e1c9', fg: '#1d1d22', border: '#6a4a30', scale: 1 / 56 }), dxd + 4.2, y + 6.5, corr0 - 1 + 1.15, 2, {});
      officeRoom(b, r, x0, y, 2, x1 - x0, corr0 - 3, kind, tn, rng, { flr, name, i, light: !INFO.floors[flr] || k >= tenants.length || (NF > 8 && flr > 5 && flr < NF && kind !== 'dentist' && kind !== 'exam' && kind !== 'waiting' && k > 0) });
    }
    // back offices beside the core
    partitionX(f, 2, stX - 1, y, corr1, FH - 1, wall, [{ at: 6, w: 4 }]);
    partitionX(f, cx + 9, W - 2, y, corr1, FH - 1, wall, [{ at: W - 10, w: 4 }]);
    f.box(stX + 10, y, corr1, cx - stX - 10, FH - 1, BD - 2 - corr1, wall);
    const backL = b.room(i % 3 === 1 ? 'Washroom' : 'Files & Storage', 2, y, corr1 + 1, stX - 3, FH - 1, BD - 3 - corr1, { lightMode: 'auto' });
    const backR = b.room(tenants.length ? tenants[0][0] + ' - Back Office' : 'Back Office', cx + 9, y, corr1 + 1, W - cx - 11, FH - 1, BD - 3 - corr1, { lightMode: 'auto' });
    b.door(corr, backL, 8, y, corr1, { leaf: 'door_wood', tint: '#5a4a3a' });
    b.door(corr, backR, W - 8, y, corr1, { leaf: 'door_wood', tint: '#5a4a3a' });
    if (i % 3 === 1) { f.prop('toilet', 4, y, BD - 4, 2, {}); f.prop('sink_pedestal', 8, y, BD - 3.5, 2, {}); f.prop('mirror_wall', 8, y + 5, BD - 2.6, 2, {}); f.box(2, y - 1, corr1 + 1, stX - 3, 1, BD - 3 - corr1, MAT.floor_tile_white); }
    else { f.prop('filing_cabinet', 4, y, BD - 3.3, 0, {}); if (i % 2) f.prop('crate_stack', stX - 5, y, BD - 6, 0, {}); }
    if (W - cx - 11 > 14 && i < 5) furnishOffice(b, backR, cx + 11, y, corr1 + 2, W - cx - 14, BD - 6 - corr1, 'open', rng, { desks: 1, light: true });
    if (i % 2) f.prop('office_water_cooler', W - 4, y, corr0 + 2, 3, {});
  }

  // ---- ground floor shops
  shopX.forEach(([x0, x1], k) => groundShop(b, shopRooms[k], x0 + 1, 1, 2, x1 - x0 - 2, BD - 4, (shops[k] || ['Offices', 'open'])[1], (shops[k] || ['Offices'])[0], rng));
  // lobby → shops side doors
  b.door(lobby, shopRooms[0], lobX0 - 1, 1, 10, { axis: 'z', leaf: 'door_glass', tint: '#6a4a30' }); f.carve(lobX0 - 1, 1, 8, 1, 9, 4);
  b.door(lobby, shopRooms[1], lobX1, 1, 10, { axis: 'z', leaf: 'door_glass', tint: '#6a4a30' }); f.carve(lobX1, 1, 8, 1, 9, 4);

  // ---- core: stair & elevator (registered after the floors)
  const core = stairCore(b, stX, stZ, FH, 0, NF, { mat: MAT.concrete, wall: MAT.plaster_gray, doorX: 0 });
  for (let i = 0; i < NF; i++) b.door(RM[i], core.rooms[i], stX + 2, i * FH + 1, stZ - 1, { leaf: 'door_wood', tint: '#5a4a3a' });
  const stopFloors = style === 'beacon' ? [0, 1, 3, 7, NF - 1] : [0, 2, Math.max(3, NF - 3), NF - 1];
  elevatorBank(b, [carX], stZ - 1, FH, NF, () => [...new Set(stopFloors)].filter((i) => i < NF).map((i) => ({ i, label: i === 0 ? 'Lobby' : `${ordinal(i + 1)} Floor` })), (i) => RM[i], { frame: pal.trim });
  const op = b.spot('stand', carX - 4, 1, stZ - 4, 0, { room: lobby, act: 'stand', tags: ['work'], lines: ['Going up?', 'Mind the gate.', 'Dentist? Third floor, turn left.'] });
  b.job('elevator operator', op, { shift: ['7:00', '18:00'], title: 'elevator operator', outfit: 'bellhop' });
  b.spot('stand', carX - 1, 1, stZ - 6, 0, { room: lobby, act: 'wait', tags: ['lobby'] });

  // ---- clock tower (Mercantile): at the corner, with four clock faces and a copper pyramid roof
  if (style === 'clock') clockTower(b, f, W, BD, NF, FH, RM, pal, rng, sides);
  void roofTop;
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// Furnish an office room of the given kind and register its (Saturday) jobs.
function officeRoom(b, r, x0, y, z0, w, d, kind, tn, rng, o) {
  const f = b.f;
  if (kind === 'empty') {
    f.prop('crate_stack', x0 + 4, y, z0 + 4, 0, {}); f.prop('chair_folding', x0 + w / 2, y, z0 + d / 2, rng.int(0, 3), {});
    read(b, x0 + w / 2, y + 4, z0 + d - 1, 'Card in the Window', 'TO LET\nOffice suite, 2 rooms, steam heat, elevator service.\nApply to the Superintendent.');
    return;
  }
  if (kind === 'school') {
    const rows = Math.max(2, Math.floor((d - 10) / 7)), per = Math.max(2, Math.floor((w - 6) / 7));
    const seats = [];
    for (let rr = 0; rr < rows; rr++) for (let k = 0; k < per; k++) seats.push(officeDesk(b, r, x0 + 4 + k * 7, y, z0 + 5 + rr * 7, 2, { lamp: false, phone: false, act: 'type', tags: ['class'] }));
    f.box(x0 + 3, y + 3, z0 + d, Math.min(20, w - 6), 7, 0 + 1, MAT.chalkboard);
    f.text('ASDF JKL;', x0 + 3 + Math.min(20, w - 6) / 2, y + 6, z0 + d - 1 + 1, MAT.blackboard_text, { align: 'center', font: 'small' });
    const t = b.spot('stand', x0 + w / 2, y, z0 + d - 3, 0, { room: r, act: 'teach', tags: ['work'], lines: ['Eyes on the copy, not the keys, girls.', 'Sixty words a minute by Christmas!'] });
    b.job('typing instructor', t, { shift: ['9:00', '12:00'], sex: 'F', title: 'typing instructor at Pratt Secretarial School' });
    seats.slice(0, 5).forEach((s) => b.job('typing student', s, { shift: ['9:00', '12:00'], sex: 'F', title: 'student at Pratt Secretarial School', age: [16, 24] }));
    read(b, x0 + w / 2, y + 6, z0 + d - 1, 'Notice', 'PRATT SECRETARIAL SCHOOL\nEst. 1911\n\nShorthand · Typewriting · Comptometer · Filing\nSaturday Morning Class, 9 to 12\n\n"A Pratt Girl Is Always Employed."\n\nMiss Pratt regrets that the Centennial is not an excuse.');
    return;
  }
  if (kind === 'exam') {
    const cx = x0 + w / 2, cz = z0 + d / 2;
    f.prop('barber_chair', cx, y, cz, 2, { tint: '#3a3a3a' }); f.prop('lamp_floor', cx + 2.5, y, cz, 0, {});
    // eye chart on the corridor wall (raised panel facing the patient)
    f.box(cx - 4, y + 2, z0 + d - 1, 8, 9, 1, MAT.sign_white);
    f.text('E', cx, y + 6, z0 + d - 2, MAT.trim_black, { align: 'center', font: 'small' });
    f.text('FP', cx, y + 4, z0 + d - 2, MAT.trim_black, { align: 'center', font: 'small' });
    f.box(cx - 2, y + 3, z0 + d - 2, 4, 1, 1, MAT.trim_black);
    f.prop('desk_office', x0 + 4, y, z0 + 4, 2, {}); f.prop('chair_office', x0 + 4, y, z0 + 7, 0, {}); f.prop('cabinet_upper', x0 + w - 1, y + 5, z0 + 3, 3, {});
    const doc = b.spot('stand', cx + 2.5, y, cz - 1.5, 2, { room: r, act: 'exam', tags: ['work'] });
    b.spot('sit', cx, y, cz, 2, { room: r, act: 'sit', tags: ['patient'], seat: 0.6 });
    b.job(/Optometrist/.test(tn) ? 'optometrist' : 'doctor', doc, { shift: ['9:00', '12:00'], title: /Optometrist/.test(tn) ? 'optometrist' : 'physician', outfit: 'doctor' });
    read(b, cx, y + 6, z0 + d - 1.5, 'Framed Diploma', /Optometrist/.test(tn) ? 'Massachusetts School of Optometry\nLena Weiss\nDoctor of Optometry, 1936\n\nTucked in the frame: a snapshot of a girl in thick spectacles, labelled "Me, 1918, before."' : 'Harvard Medical School\nMartin Hale, Doctor of Medicine, 1924\n\nBeside it, a smaller frame: a thank-you card in a child\'s hand — "Dear Dr Hale thank you for my arm it is better now."');
    return;
  }
  if (o.light) {
    const sp = officeDesk(b, r, x0 + w / 2, y, z0 + d * 0.45, 0, { lamp: false, phone: false, typewriter: rng.chance(0.5) });
    f.prop('filing_cabinet', x0 + 2, y, z0 + d - 1.3, 0, {});
    if (rng.chance(0.3)) wkJob(b, 'office clerk', sp, { title: 'clerk' });
    return;
  }
  const spots = furnishOffice(b, r, x0 + 1, y, z0 + 1, w - 2, d - 2, kind, rng, { light: o.flr > 6 });
  if (kind === 'dentist' && spots[0]) {
    b.job('dentist', spots[0], { shift: ['9:00', '12:30'], title: 'dentist', outfit: 'doctor' });
    read(b, x0 + 2, y + 5, z0 + d - 1.5, 'Appointment Card', `${tn}\nHours: Mon.–Fri. 9 to 5, Saturday 9 to 12:30\n\nYOUR NEXT APPOINTMENT IS:\nSat. Sept. 26 at 10:15\n\n(On the back, in pencil: "Tommy H. — the molar. Bring his mother.")`);
  } else if (kind === 'waiting' && spots[0]) b.job('receptionist', spots[0], { shift: ['8:45', '12:30'], sex: 'F', title: 'receptionist' });
  else if (kind === 'insurance' && spots[0]) {
    if (o.i % 2 === 1) b.job('insurance clerk', spots[0], { shift: ['9:00', '12:00'], title: 'insurance clerk' });
    for (const s0 of spots.slice(1, 2)) wkJob(b, 'insurance clerk', s0, { title: 'insurance clerk' });
    if (o.i === 1 || o.i === 3) read(b, x0 + w - 3, y + 5, z0 + 2, 'Framed Claim, 1938', 'CLAIM No. 38-1142 — PAID IN FULL\nInsured: Castellano Fish Co., Pier 3\nLoss: one fish house, two dories, 400 lobster traps\nCause: the hurricane of September 21, 1938\n\nThe company paid 1,312 claims that autumn and did not contest one. The president framed the first and the last.');
  } else if (kind === 'law' && spots[0]) {
    wkJob(b, 'attorney', spots[0], { title: 'attorney' });
    if (o.flr === 2 || o.flr === 3) read(b, x0 + w / 2, y + 5, z0 + 2, 'Diploma & Photograph', 'Harvard Law School, Class of 1921.\n\nOn the wall beside it, a photograph of eleven young men on the steps of City Hall in 1934, strikers\' armbands on their sleeves. The firm represented the cannery workers for nothing. The senior partner has written across the bottom: "Best case we ever lost money on."');
  } else if (spots[0]) wkJob(b, 'office clerk', spots[0], { title: 'clerk' });
}

// Ground-floor shops and public offices in the office blocks.
function groundShop(b, r, x0, y, z0, w, d, kind, label, rng) {
  const f = b.f, cx = x0 + w / 2;
  f.prop('ceiling_lamp', cx, y + 10, z0 + d * 0.3, 0, {}); f.prop('ceiling_lamp', cx, y + 10, z0 + d * 0.7, 0, {});
  if (kind === 'lunch') {
    f.box(x0, y - 1, z0, w, 1, d, MAT.floor_checker);
    const cz = z0 + 18;
    for (let x = x0 + 3; x < x0 + w - 3; x += 4) f.prop('diner_counter', x + 2, y, cz, 0, {});
    const seats = [];
    for (let x = x0 + 5; x < x0 + w - 4; x += 3.2) { f.prop('soda_stool', x, y, cz - 2.6, 2, {}); seats.push(b.spot('sit', x, y, cz - 2.6, 2, { room: r, act: 'eat', tags: ['eat_out'], seat: 0.7, label: `Lunch at ${label}` })); b.playerSeat(x, y, cz - 2.6, 2, 0.7); }
    f.prop('coffee_urn', x0 + 3, y + 3.6, cz, 2, {}); f.prop('pie_display', x0 + w - 5, y + 3.6, cz, 0, {}); f.prop('menu_board', cx, y + 6, cz + 7.5, 0, {});
    f.prop('stove', x0 + 5, y, cz + 7, 0, {}); f.prop('kitchen_counter', x0 + 9, y, cz + 7, 0, {}); f.prop('kitchen_sink', x0 + 13, y, cz + 7, 0, {});
    const cook = b.spot('stand', x0 + 5, y, cz + 4.5, 2, { room: r, act: 'cook', tags: ['work'], lines: ['Two on a raft, wreck \'em!', 'Chowder\'s Friday. Today\'s the hash.'] });
    const wait = b.spot('stand', cx, y, cz + 2.6, 0, { room: r, act: 'serve', tags: ['work'], lines: ['Coffee\'s a nickel, refills free.', 'Pie? We\'ve got apple and we\'ve got apple.'] });
    b.job('cook', cook, { shift: ['6:00', '15:00'], outfit: 'cook', title: 'short-order cook' });
    b.job('waitress', wait, { shift: ['6:00', '15:00'], outfit: 'waitress', sex: 'F', title: 'counter waitress' });
    for (let k = 0; k < 2; k++) { const tx = x0 + 6 + k * 10, tz = z0 + d - 8; f.prop('diner_booth', tx, y, tz, 0, {}); b.spot('sit', tx - 1, y, tz - 1, 2, { room: r, act: 'eat', tags: ['eat_out'], seat: 0.45 }); b.spot('sit', tx + 1, y, tz + 1, 0, { room: r, act: 'eat', tags: ['eat_out'], seat: 0.45 }); }
    read(b, cx, y + 6, cz + 7, 'Menu Board', `${label.toUpperCase()}\n\nCoffee ............ 5¢\nFrankfurt & beans ... 35¢\nHaddock chowder (Fri) 25¢\nTuna salad sandwich . 30¢\nHot turkey plate ... 65¢\nApple pie ......... 15¢\n   à la mode ...... 20¢\n\nCENTENNIAL SPECIAL: Yankee pot roast, 75¢`);
    return;
  }
  if (kind === 'cigar') {
    f.box(x0, y - 1, z0, w, 1, d, MAT.floor_checker_red);
    const c = counterRun(b, r, x0 + 2, x0 + w * 0.6, y, z0 + 14, { rot: 0, type: 'counter_shop' });
    f.prop('candy_jars', x0 + 5, y + 3.8, z0 + 14, 0, {}); f.prop('magazine_rack', x0 + w - 3, y, z0 + 4, 3, {}); f.prop('newspaper_pile', x0 + 9, y + 3.8, z0 + 14, 0, {});
    f.prop('shoeshine_stand', x0 + w - 5, y, z0 + d - 6, 0, {});
    const sh = b.spot('kneel', x0 + w - 5, y, z0 + d - 9, 2, { room: r, act: 'shine', tags: ['work'], lines: ['Shine, mister? Ten cents, and you\'ll see your face in \'em.'] });
    b.spot('sit', x0 + w - 5, y, z0 + d - 6, 0, { room: r, act: 'read', tags: ['shop'], seat: 0.8 });
    b.job('shoeshine', sh, { shift: ['9:00', '17:00'], title: 'shoeshine man', age: [14, 70] });
    b.job('clerk', c.clerk, { shift: ['7:00', '18:00'], title: 'tobacconist', outfit: 'shopkeeper' });
    b.spot('stand', cx, y, z0 + 6, 0, { room: r, act: 'browse', tags: ['browse', 'shop'] });
    return;
  }
  // counters for the utility / telephone company / insurance agency / realty
  f.box(x0, y - 1, z0, w, 1, d, kind === 'utility' ? MAT.floor_bigcheck : MAT.floor_terrazzo);
  const c = counterRun(b, r, x0 + 3, x0 + Math.min(w - 3, 26), y, z0 + 16, { rot: 0, type: 'counter_shop', register: kind === 'utility' });
  f.prop(kind === 'phoneco' ? 'phone_booth' : 'rubber_plant', x0 + 3, y, z0 + 4, 1, {});
  if (kind === 'phoneco') f.prop('phone_booth', x0 + 3, y, z0 + 9, 1, {});
  const desks = [];
  for (let k = 0; k < Math.min(3, Math.floor(w / 10)); k++) desks.push(officeDesk(b, r, x0 + 6 + k * 10, y, z0 + 26, 0, {}));
  for (let k = 0; k < 3; k++) f.prop('filing_cabinet', x0 + 2 + k * 2.4, y, z0 + d - 1.3, 0, {});
  for (let k = 0; k < 3; k++) b.spot('stand', x0 + 6 + k * 5, y, z0 + 8 + (k % 2) * 3, 0, { room: r, act: 'wait', tags: ['shop', 'customer'] });
  const open = kind !== 'realty';
  if (open) b.job('clerk', c.clerk, { shift: ['9:00', '12:00'], title: 'counter clerk' }); else wkJob(b, 'clerk', c.clerk, {});
  if (desks[0]) { if (open) b.job('clerk', desks[0], { shift: ['9:00', '12:00'], title: 'clerk' }); else wkJob(b, 'clerk', desks[0], {}); }
  if (kind === 'utility') {
    f.prop('stove', x0 + w - 4, y, z0 + 4, 3, { tint: '#f0eee8' }); f.prop('fridge', x0 + w - 4, y, z0 + 8, 3, {}); f.prop('washing_machine', x0 + w - 4, y, z0 + 12, 3, {});
    read(b, x0 + w - 5, y + 4, z0 + 8, 'Showroom Card', 'LIVE BETTER ELECTRICALLY!\n\nThe new 1953 Westinghouse refrigerator — $239.95, or $2 a week on your light bill.\n\nCentennial Offer: a free electric clock with every range installed before Thanksgiving.\n\nPAY YOUR BILL HERE · Saturdays 9 to 12');
  } else if (kind === 'agency') {
    read(b, x0 + w - 3, y + 5, z0 + 3, 'Framed Poster', 'HARBOR MUTUAL INSURANCE CO.\nEst. 1911 · "We Sail With You"\n\nFire · Marine · Life · Automobile\n\nBelow, a list in gold leaf of every Juniper Bay vessel insured by the company and lost at sea, 1911–1953. Nineteen names. The last is the dragger ESTHER M., November 1951.');
  } else if (kind === 'realty') {
    for (let k = 0; k < 3; k++) f.prop('painting', x0 + 6 + k * 6, y + 4, z0 + 2.6, 0, {});
    read(b, x0 + 12, y + 3, z0 + 3, 'Window Cards', 'JUNIPER BAY REALTY\n\nCAPE COD COTTAGE, Orchard St. — 2 bedrooms, new furnace, apple tree. $8,900.\nCAPTAIN\'S HOUSE, Hillcrest Ave. — 11 rooms, widow\'s walk, "needs love." $14,500.\nBUNGALOW, Maple St. — near school, G.I. terms. $7,400.\n\nClosed Saturdays during the Centennial. Happy Harbor Days!');
  }
  void rng;
}

// The Mercantile's corner clock tower: four clock faces, a belfry and a copper pyramid roof,
// with a stair from the top floor up into the clock room.
function clockTower(b, f, W, BD, NF, FH, RM, pal, rng, sides) {
  const H = NF * FH, S = 28;
  const onRight = sides.right || !sides.left;
  const tx0 = onRight ? W - S : 0, tz0 = 0;
  const shaftH = 40, y0 = H;
  // shaft (hollow), corner quoins
  f.walls(tx0, y0, tz0, S, shaftH, S, pal.outer, 2);
  f.box(tx0 + 2, y0, tz0 + 2, S - 4, 1, S - 4, MAT.floor_oak);
  for (let yy = y0; yy < y0 + shaftH; yy += 4) for (const [qx, qz] of [[tx0 - 1, tz0 - 1], [tx0 + S - 2, tz0 - 1], [tx0 - 1, tz0 + S - 2], [tx0 + S - 2, tz0 + S - 2]]) f.box(qx, yy, qz, 3, 2, 3, pal.trim);
  // belt courses
  f.walls(tx0 - 1, y0 + 10, tz0 - 1, S + 2, 1, S + 2, pal.trim, 1);
  f.walls(tx0 - 1, y0 + shaftH, tz0 - 1, S + 2, 2, S + 2, pal.trim, 1);
  // four clock faces
  const tf = facesOf(f, tx0, tz0, tx0 + S, tz0 + S);
  for (const side of ['front', 'back', 'left', 'right']) {
    const face = tf[side];
    clockFace(face.F, Math.round((face.a + face.b) / 2), y0 + 25, face.zf, 9, {});
    // arched louvred belfry openings above
    for (const dx of [-6, 3]) { const ax = Math.round((face.a + face.b) / 2) + dx; face.F.archCarve(ax, y0 + shaftH + 2, face.zf, 4, 9, 2); face.F.box(ax, y0 + shaftH + 2, face.zf + 1, 4, 5, 1, MAT.wood_gray); }
    // small window lower down
    face.F.archCarve(Math.round((face.a + face.b) / 2) - 2, y0 + 3, face.zf, 4, 6, 2);
    face.F.box(Math.round((face.a + face.b) / 2) - 2, y0 + 3, face.zf + 1, 4, 6, 1, MAT.glass);
  }
  // belfry stage & copper pyramid roof with a spire
  f.walls(tx0, y0 + shaftH + 2, tz0, S, 12, S, pal.outer, 2);
  for (const side of ['front', 'back', 'left', 'right']) { const face = tf[side]; for (const dx of [-6, 3]) { const ax = Math.round((face.a + face.b) / 2) + dx; face.F.archCarve(ax, y0 + shaftH + 2, face.zf, 4, 9, 2); face.F.box(ax, y0 + shaftH + 2, face.zf + 1, 4, 5, 1, MAT.wood_gray); } }
  f.walls(tx0 - 1, y0 + shaftH + 13, tz0 - 1, S + 2, 1, S + 2, pal.trim, 1);
  const rh = f.hip(tx0 - 1, y0 + shaftH + 14, tz0 - 1, S + 2, S + 2, MAT.roof_copper, { overhang: 0, rise: 2 });
  const ty = y0 + shaftH + 14 + rh;
  f.box(tx0 + S / 2 - 0.5 < 0 ? 0 : tx0 + S / 2, ty, tz0 + S / 2, 1, 12, 1, MAT.iron);
  f.box(tx0 + S / 2 - 1, ty + 6, tz0 + S / 2, 3, 1, 1, MAT.iron); f.box(tx0 + S / 2, ty + 6, tz0 + S / 2 - 1, 1, 1, 3, MAT.iron);
  f.sphere(tx0 + S / 2 + 0.5, ty + 12, tz0 + S / 2 + 0.5, 1.4, MAT.art_deco_gold);
  // the clock room, reached by a stair from the top office floor
  const cr = b.room('Clock Room', tx0 + 2, y0 + 1, tz0 + 2, S - 4, shaftH - 2, S - 4, { lightMode: 'auto', lightColor: [1, 0.85, 0.6], ambient: 0.5 });
  const sx = onRight ? tx0 + 2 : tx0 + S - 11;
  const core = stairCore(b, sx, tz0 + 3, FH, NF - 1, NF + 1, { mat: MAT.wood_mid, wall: pal.inner, doorSide: () => (onRight ? 'left' : 'right'), walls: true });
  // (the top-floor door opens into the front office under the tower; the upper door into the clock room)
  b.door(core.rooms[1], cr, onRight ? sx - 1 : sx + 9, y0 + 1, tz0 + 5, { axis: 'z', leaf: 'door_wood', tint: '#4a3a2a' });
  const topFloorRoom = b.roomAtPoint(...b.m(onRight ? sx - 6.5 : sx + 14.5, (NF - 1) * FH + 1.5, tz0 + 6.5));
  if (topFloorRoom) b.door(topFloorRoom, core.rooms[0], onRight ? sx - 1 : sx + 9, (NF - 1) * FH + 1, tz0 + 5, { axis: 'z', leaf: 'door_wood', tint: '#4a3a2a' });
  // the movement: a green iron frame, brass wheels, the pendulum
  const mx = tx0 + S / 2 + (onRight ? 3 : -3), mz = tz0 + S / 2 + 3;
  f.box(mx - 3, y0 + 1, mz - 2, 6, 4, 4, MAT.iron_green);
  f.box(mx - 2, y0 + 5, mz - 1, 4, 3, 2, MAT.art_deco_gold);
  f.box(mx, y0 + 8, mz, 1, 14, 1, MAT.steel);
  f.box(mx - 1, y0 + 1, mz + 4, 3, 1, 3, MAT.iron); f.box(mx, y0 + 2, mz + 5, 1, 8, 1, MAT.steel);
  for (const side of [[0, -1], [0, 1], [-1, 0], [1, 0]]) f.box(mx + side[0] * 4, y0 + 25, mz + side[1] * 4, 1, 1, 1, MAT.steel);
  f.box(mx - 0.5 < mx ? mx : mx, y0 + 25, mz - 11, 1, 1, 22, MAT.steel);
  read(b, mx, y0 + 4, mz - 3, 'Tower Clock Movement', 'E. HOWARD & CO., BOSTON — No. 1146\nInstalled in the Mercantile Building, 1905.\n\nFour dials, seven feet across. Wound by hand once a week — 212 turns of the crank for the time train, 190 for the strike.\n\nA card nailed to the frame lists the winders: J. Beal 1905–1918 · T. Grant 1919– \nBeneath it, in pencil: "Stopped 4:17 a.m., Sept. 21, 1938. Water in the works. Restarted Sept. 24. — T.G."', 2);
  const win = b.spot('stand', mx, y0 + 1, mz - 4, 2, { room: cr, act: 'wrench', tags: ['work'], lines: ['Two hundred and twelve turns. Every Saturday since 1919.', 'She loses four seconds a week in August. Brass expands.'] });
  b.job('clock winder', win, { shift: ['8:30', '9:30'], title: 'keeper of the Mercantile clock', age: [55, 75], sex: 'M' });
  b.light(tx0 + S / 2, y0 + 25, tz0 - 2, { color: [1, 0.95, 0.8], radius: 8, mode: 'night' });
  void rng; void BD; void RM;
}


// Shallow classical pediment: a stepped triangle facing the street over [x, x+sx), from layer z, depth sz.
function pediment(f, x, y, z, sx, sz, mat, run = 3, tymp = null) {
  let i = 0;
  while (sx - 2 * run * i > 2) {
    f.box(x + run * i, y + i, z, sx - 2 * run * i, 1, sz, mat);
    if (tymp && sx - 2 * run * (i + 1) > 4) f.box(x + run * (i + 1), y + i + 1, z - 0, sx - 2 * run * (i + 1), 1, 1, tymp);
    i++;
  }
  return i;
}

// =====================================================================================================
// FIRST JUNIPER SAVINGS BANK (1871) — a granite temple front, the banking hall, the vault
// =====================================================================================================
function buildBank(ctx, lot, spec) {
  const rng = ctx.rng.fork('bank' + lot.x + ',' + lot.z);
  const name = spec.name || 'First Juniper Savings Bank';
  const b = new Building(ctx, { name, kind: 'bank', lot, address: lot.address, established: spec.est || 1871, hours: [T(9), T(12)],
    lore: 'Opened in 1871 with $4,112 in deposits. The Greek temple front went up in 1889; WJBY first went on the air in 1928 from a closet on the second floor. Saturday hours, nine to noon.' });
  const f = b.f, W = lot.w, D = lot.d, cx = Math.round(W / 2);
  const Y = 4;                                  // raised banking-hall floor (standing level)
  const Z0 = 22, BD = D - 4, H = 34;            // hall front wall, back wall, cornice height
  const sides = streetSides(lot);
  const STONE = MAT.granite, MARBLE = MAT.marble, LIME = MAT.limestone;
  f.box(0, -1, 0, W, 1, D, MAT.sidewalk);
  // podium & steps
  f.box(4, 0, 8, W - 8, Y - 1, BD - 8, STONE);
  for (let k = 0; k < Y - 1; k++) f.box(10, 0, 2 + k * 2, W - 20, k + 1, 2, STONE);
  f.box(4, 0, 8, W - 8, Y - 1, Z0 - 8, LIME);
  // the hall block
  shell(f, 6, 0, Z0, W - 12, H, BD - Z0, LIME, MAT.plaster_cream);
  f.box(7, Y - 1, Z0 + 1, W - 14, 1, BD - Z0 - 2, MAT.floor_marble);
  f.box(cx - 10, Y - 1, Z0 + 10, 20, 1, 20, MAT.floor_checker);
  // rusticated base lines
  for (let y = 2; y < H - 8; y += 4) f.box(6, y, Z0 - 1, W - 12, 1, 1, MAT.stone_foundation);
  // portico: six columns, entablature, pediment
  const colsX = [];
  for (let k = 0; k < 6; k++) colsX.push(Math.round(14 + k * (W - 28) / 5));
  for (const x of colsX) {
    f.box(x - 3, Y - 1, 10, 6, 1, 6, LIME);
    f.cylinder(x, Y, 13, 2.4, H - Y - 4, MARBLE);
    for (let yy = Y + 4; yy < H - 5; yy += 6) f.cylinder(x, yy, 13, 2.6, 1, MARBLE);
    f.box(x - 3, H - 4, 10, 6, 2, 6, LIME);
  }
  f.box(4, H - 2, 8, W - 8, 6, Z0 - 6, LIME);           // entablature
  f.box(4, H - 2, 7, W - 8, 1, 1, LIME); f.box(3, H + 3, 6, W - 6, 1, 2, LIME);
  f.text(name.toUpperCase(), cx, H - 1, 7, MAT.trim_dark, { align: 'center', font: 'small' });
  const ph = pediment(f, 3, H + 4, 6, W - 6, BD - 2, LIME, 3);
  f.box(cx - 10, H + 5, 5, 20, 5, 1, LIME);
  f.text('1871', cx, H + 5, 4, MAT.art_deco_gold, { align: 'center', font: 'small' });
  // roof behind the pediment (low hip in slate)
  f.hip(6, H + 4, Z0 + 4, W - 12, BD - Z0 - 4, MAT.roof_slate, { overhang: 1, rise: 1, fill: MAT.roof_slate });
  void ph;
  // bronze doors & tall windows in the portico wall
  f.carve(cx - 4, Y, Z0, 8, 14, 2); f.box(cx - 5, Y, Z0 - 1, 1, 15, 1, MAT.art_deco_gold); f.box(cx + 4, Y, Z0 - 1, 1, 15, 1, MAT.art_deco_gold); f.box(cx - 5, Y + 14, Z0 - 1, 10, 1, 1, MAT.art_deco_gold);
  f.box(cx - 4, Y + 10, Z0, 8, 4, 1, MAT.glass_stained_gold);
  for (const x of [colsX[1] + 4, colsX[3] + 4]) { f.archCarve(x, Y + 6, Z0, 6, 18, 2); f.archCarve(x, Y + 6, Z0 + 1, 6, 18, 1, MAT.glass); }
  // side windows (tall arched) on a street side
  const fcb = facesOf(f, 6, Z0, W - 6, BD);
  for (const side of ['left', 'right']) {
    const face = fcb[side];
    if (!sides[side]) continue;
    for (const x of colsIn(face.a + 6, face.b - 6, 6, 16, 2)) { face.F.archCarve(x, Y + 6, face.zf, 6, 20, 2); face.F.archCarve(x, Y + 6, face.zf + 1, 6, 20, 1, MAT.glass); face.F.box(x - 1, Y + 5, face.zf - 1, 8, 1, 1, LIME); }
    for (let y = 2; y < H - 8; y += 4) face.F.box(face.a, y, face.zf - 1, face.b - face.a, 1, 1, MAT.stone_foundation);
  }
  // back: small windows of the second-floor offices
  for (const x of colsIn(fcb.back.a + 4, fcb.back.b - 4, 4, 12, 2)) win(fcb.back.F, x, 22, fcb.back.zf, 4, 7, { frame: LIME, t: 2 });

  // ---- rooms
  const BZ = BD - 28;                                     // back section (vault, offices) starts here
  const hall = b.room('Banking Hall', 8, Y, Z0 + 2, W - 16, H - Y - 2, BZ - Z0 - 2, { lightMode: 'always', lightColor: [1, 0.88, 0.68], lightPower: 1.1 });
  const portico = b.room('Portico', 8, Y, 8, W - 16, H - Y - 4, Z0 - 9, { kind: 'porch', ambient: 0.9, lightMode: 'night' });
  b.door(portico, hall, cx, Y, Z0 + 1, { leaf: 'door_wood', tint: '#8a6a2a', width: 6 });
  const ent = b.navPoint(portico, cx, Y, 12);
  const out = ctx.nav.node(...b.m(cx, 0, -4), { building: b.id, kind: 'outside' });
  ctx.nav.link(ent, out);
  b.entrances.push({ node: out, door: ent, pos: b.m(cx, 0, -4), main: true });
  b.mainEntrance = out;
  // coffered ceiling & chandeliers
  f.box(8, H - 2, Z0 + 2, W - 16, 1, BZ - Z0 - 2, MAT.ceiling_tin);
  for (let z = Z0 + 8; z < BZ; z += 10) f.box(8, H - 3, z, W - 16, 1, 1, MAT.art_deco_gold);
  for (let x = 20; x < W - 12; x += 20) f.box(x, H - 3, Z0 + 2, 1, 1, BZ - Z0 - 2, MAT.art_deco_gold);
  for (const z of [Z0 + 14, Z0 + 32]) f.prop('chandelier', cx, H - 9, z, 0, {});
  // teller line: a marble counter with brass grilles across the hall
  const TZ = BZ - 12;
  f.box(10, Y, TZ, W - 20, 4, 2, MARBLE);
  f.box(10, Y + 4, TZ, W - 20, 1, 2, MAT.bar_top);
  const tellers = [];
  for (let k = 0; k < 4; k++) {
    const tx = Math.round(20 + k * (W - 40) / 3);
    f.prop('teller_counter', tx, Y, TZ + 1, 0, {});
    f.box(tx - 3, Y + 5, TZ, 1, 6, 1, MAT.art_deco_gold); f.box(tx + 3, Y + 5, TZ, 1, 6, 1, MAT.art_deco_gold); f.box(tx - 3, Y + 11, TZ, 7, 1, 1, MAT.art_deco_gold);
    for (let gx = tx - 2; gx <= tx + 2; gx += 2) f.box(gx, Y + 8, TZ, 1, 3, 1, MAT.art_deco_gold);
    const t = b.spot('stand', tx, Y, TZ + 4, 0, { room: hall, act: 'counter', tags: ['clerk', 'teller'], lines: ['Next, please.', 'Deposit or withdrawal?', 'Christmas Club? You\'re a week early, Mrs. Hatch.'] });
    tellers.push(t);
    b.spot('stand', tx, Y, TZ - 3, 2, { room: hall, act: 'wait', tags: ['shop', 'customer', 'bank'] });
    b.spot('stand', tx + 1, Y, TZ - 7, 2, { room: hall, act: 'wait', tags: ['bank', 'queue'] });
  }
  b.job('teller', tellers[1], { shift: ['8:45', '12:15'], title: 'teller' });
  b.job('teller', tellers[2], { shift: ['8:45', '12:15'], title: 'teller' });
  // gate at the end of the counter
  f.carve(W - 14, Y, TZ, 4, 4, 2); f.box(W - 14, Y + 3, TZ, 4, 1, 1, MAT.art_deco_gold);
  // check-writing desk in the middle, a bench, portraits, the clock
  f.prop('writing_desk', cx, Y, Z0 + 18, 0, {}); f.prop('writing_desk', cx, Y, Z0 + 22, 2, {});
  b.spot('stand', cx, Y, Z0 + 15.5, 2, { room: hall, act: 'write', tags: ['bank'] });
  for (const x of [12, W - 12]) { f.prop('bench_park', x, Y, Z0 + 14, x < cx ? 1 : 3, { tint: '#4a3020' }); b.playerSeat(x, Y, Z0 + 14, x < cx ? 1 : 3); b.spot('sit', x, Y, Z0 + 14, x < cx ? 1 : 3, { room: hall, act: 'wait', tags: ['bank'], seat: 0.45 }); }
  f.prop('clock_grandfather', 10, Y, TZ - 4, 1, {});
  f.prop('portrait', 7.6, Y + 12, Z0 + 26, 1, {}); f.prop('portrait', W - 7.6, Y + 12, Z0 + 26, 3, {});
  read(b, 8.5, Y + 8, Z0 + 26, 'Portrait — Ezra Dunmore', 'EZRA DUNMORE (1819–1894)\nFounder and First President, 1871–1890\n\nThe sawmill man. He opened the bank because, as he put it, "a town that keeps its savings in a sock will never build a school." The first loan the bank ever made was to the town, for the schoolhouse on Orchard Street.');
  read(b, W - 8.5, Y + 8, Z0 + 26, 'Portrait — Margaret Halloran Pruitt', 'MARGARET HALLORAN PRUITT (1880–1947)\nTrustee, 1921–1947\n\nThe first woman to sit on the board of any bank in the county. In 1932 she persuaded the trustees to carry every cannery family\'s mortgage, interest-free, until the plant went back to full shifts. It took two years. The bank did not lose a dollar.');
  // the first ledger, framed
  f.box(cx - 3, Y + 5, BZ - 0, 6, 5, 1, MAT.wood_dark); f.box(cx - 2, Y + 6, BZ - 1, 4, 3, 1, MAT.canvas_white);
  readH(b, cx, Y + 7, BZ - 1.5, 'The First Deposit Ledger, 1871', `<div class="plaque"><h1>First Juniper Savings Bank</h1></div><p class="typed" style="text-align:center">Ledger No. 1 · Opened Monday, May 1, 1871<br><br></p>
<table style="margin:0 auto;font-family:Georgia,serif;border-collapse:collapse;min-width:360px">
<tr><td>E. Dunmore, sawmill</td><td style="text-align:right">$1,500.00</td></tr>
<tr><td>Capt. E. Whitcomb (estate)</td><td style="text-align:right">1,000.00</td></tr>
<tr><td>Whitcomb Wharf Co.</td><td style="text-align:right">620.00</td></tr>
<tr><td>First Congregational Society</td><td style="text-align:right">310.00</td></tr>
<tr><td>Beal's Livery</td><td style="text-align:right">212.50</td></tr>
<tr><td>M. Coffin, chandler</td><td style="text-align:right">180.00</td></tr>
<tr><td>Fishermen's Widows' Fund (MARY ELLEN)</td><td style="text-align:right">142.00</td></tr>
<tr><td>47 small depositors</td><td style="text-align:right">147.50</td></tr>
<tr><td><b>Total, opening day</b></td><td style="text-align:right;border-top:1px solid #333"><b>$4,112.00</b></td></tr>
</table>
<p class="typed" style="text-align:center">The smallest deposit, 12 cents, belongs to "Nellie Coffin, aged 9". Her account is still open.<br>Balance, September 1953: $31.84.</p>`, 2);
  // manager's office: a glassed-in corner at the front
  const mo = { x0: W - 38, x1: W - 9, z0: Z0 + 2, z1: Z0 + 20 };
  partitionX(f, mo.x0, mo.x1, Y, mo.z1, 12, MAT.wood_dark, [{ at: mo.x0 + 3, w: 4 }]);
  partitionZ(f, mo.z0, mo.z1, Y, mo.x0 - 1, 12, MAT.wood_dark, []);
  f.box(mo.x0 + 9, Y + 4, mo.z1, mo.x1 - mo.x0 - 12, 7, 1, MAT.glass); f.box(mo.x0 - 1, Y + 4, mo.z0 + 3, 1, 7, mo.z1 - mo.z0 - 6, MAT.glass);
  const mgrRoom = b.room('Manager\'s Office', mo.x0, Y, mo.z0, mo.x1 - mo.x0, 11, mo.z1 - mo.z0, { lightMode: 'day' });
  b.door(hall, mgrRoom, mo.x0 + 5, Y, mo.z1, { leaf: 'door_glass', tint: '#4a3020' });
  f.prop('desk_rolltop', mo.x0 + 14, Y, mo.z0 + 4, 2, {});
  const mgr = b.spot('sit', mo.x0 + 14, Y, mo.z0 + 7.2, 2, { room: mgrRoom, act: 'write', tags: ['work'], seat: 0.46, lines: ['Thrift, young man. Thrift built this town.', 'We\'re open till noon. Harbor Days or no Harbor Days.'] });
  f.prop('chair_office', mo.x0 + 14, Y, mo.z0 + 7.2, 2, {});
  f.prop('armchair', mo.x0 + 8, Y, mo.z0 + 12, 1, { tint: '#5a2a2a' }); f.prop('safe_small', mo.x1 - 3, Y, mo.z0 + 3, 3, {}); f.prop('rug_rect', mo.x0 + 14, Y, mo.z0 + 9, 0, { tint: '#6a2a2a' });
  b.job('manager', mgr, { shift: ['8:30', '12:30'], title: 'bank manager' });
  // back section: the vault (left) and the back office with a stair (right), offices upstairs
  const VX = Math.round(W * 0.5);
  f.box(8, Y, BZ, W - 16, H - Y - 2, 1, MAT.plaster_cream);            // wall behind the tellers
  f.box(8, Y, BZ, VX - 8, 14, 2, MAT.steel);                           // vault front (steel)
  f.carve(VX - 16, Y, BZ, 8, 10, 2);
  f.prop('bank_vault_door', VX - 12, Y, BZ + 0.5, 0, {});
  const vault = b.room('Vault', 8, Y, BZ + 2, VX - 9, 13, BD - BZ - 3, { lightMode: 'auto', lightColor: [0.95, 0.95, 1] });
  f.walls(8, Y, BZ + 2, VX - 8, 14, BD - BZ - 2, MAT.steel, 1);
  f.box(8, Y - 1, BZ + 2, VX - 8, 1, BD - BZ - 3, MAT.floor_concrete);
  f.box(8, Y + 14, BZ, VX - 8, 1, BD - BZ, MAT.steel);
  b.door(hall, vault, VX - 12, Y, BZ + 1, { leaf: false });
  for (let k = 0; k < 4; k++) f.prop('po_boxes', 11 + k * 5, Y, BD - 3, 0, {});
  f.prop('safe_small', VX - 4, Y, BD - 4, 3, {});
  read(b, VX - 10, Y + 5, BZ + 4, 'The Vault', 'Mosler Safe Co., Hamilton, Ohio — installed 1906.\nTwenty-four inches of steel; time lock set for 8:45 each morning.\n\nIn 1938 the hurricane flooded the cellars of half of Harbor Street. The vault stayed dry. For a week afterward, families kept their photographs and their marriage lines in it, free of charge, in cigar boxes with their names chalked on the lids.');
  const bo = b.room('Back Office', VX + 1, Y, BZ + 1, W - 9 - VX - 1, 13, BD - BZ - 2, { lightMode: 'auto' });
  f.carve(VX + 4, Y, BZ, 4, 9, 1);
  b.door(hall, bo, VX + 6, Y, BZ, { leaf: 'door_wood', tint: '#4a3020' });
  f.box(VX + 1, Y + 14, BZ + 1, W - 10 - VX, 1, BD - BZ - 2, MAT.floor_oak);
  const top = stairs(f, VX + 12, Y, BD - 7, '+x', 15, { w: 4, run: 2, mat: MAT.wood_mid });
  void top;
  const up = b.room('Second Floor — Bookkeeping', VX + 1, Y + 15, BZ + 1, W - 9 - VX - 1, H - Y - 18, BD - BZ - 2, { lightMode: 'auto' });
  b.stairs(bo, [VX + 10, Y, BD - 5], up, [VX + 12 + 30, Y + 15, BD - 5]);
  const clerkSp = officeDesk(b, bo, VX + 12, Y, BZ + 8, 0, { act: 'write' });
  b.job('bookkeeper', clerkSp, { shift: ['8:30', '12:30'], title: 'bookkeeper' });
  f.prop('adding_machine', VX + 20, Y + 3, BZ + 8, 0, {}); f.prop('filing_cabinet', W - 12, Y, BZ + 3, 3, {});
  officeDesk(b, up, VX + 10, Y + 15, BZ + 6, 0, {}); f.prop('filing_cabinet', VX + 4, Y + 15, BZ + 3, 1, {});
  // the old WJBY closet
  const cl = { x0: W - 20, z0: BZ + 2 };
  f.box(cl.x0 - 1, Y + 15, cl.z0, 1, 12, 10, MAT.plaster_cream);
  const closet = b.room('The WJBY Closet', cl.x0, Y + 15, cl.z0, 9, 11, 9, { lightMode: 'auto' });
  f.carve(cl.x0 - 1, Y + 15, cl.z0 + 3, 1, 9, 4);
  b.door(up, closet, cl.x0 - 1, Y + 15, cl.z0 + 5, { axis: 'z', leaf: 'door_wood', tint: '#6a5a4a' });
  f.prop('radio_table', cl.x0 + 5, Y + 15, cl.z0 + 6, 0, {}); f.prop('chair_wood', cl.x0 + 5, Y + 15, cl.z0 + 3, 2, {}); f.prop('mic_stand', cl.x0 + 3, Y + 15, cl.z0 + 6, 0, {});
  read(b, cl.x0 + 4, Y + 18, cl.z0 + 7, 'Brass Plate on the Closet Wall', 'IN THIS CLOSET, ON THE EVENING OF MARCH 3, 1928,\nRADIO STATION WJBY FIRST WENT ON THE AIR.\n\nEquipment: one 50-watt transmitter built by Walter Pike, aged 19, from a kit and two Ford coils; one microphone borrowed from the Rialto.\nFirst words broadcast: "Hello, Juniper Bay. Can anybody hear me? Somebody please telephone the bank."\nThey did — eleven people, all at once.\n\nPresented by the WJBY Old-Timers, 1948.');
  // Saturday notice at the door
  read(b, cx + 7, Y + 4, Z0 - 1, 'Notice by the Door', 'FIRST JUNIPER SAVINGS BANK\nIncorporated 1871\n\nBanking Hours: Monday–Friday 9 to 3 · Saturday 9 to 12\n\nThe Bank will close at noon on Saturday, September 26, for the Centennial, and wishes every depositor a Happy Harbor Days.\n\nChristmas Club now forming — 50¢ a week.');
  f.box(4, Y + 1, 8, 1, 3, Z0 - 8, MAT.iron); f.box(W - 5, Y + 1, 8, 1, 3, Z0 - 8, MAT.iron);
  f.prop('flag_pole', 8, Y, 9, 0, { cat: 'far', scale: 0.8 });
  b.light(cx, H - 6, 12, { color: [1, 0.85, 0.6], radius: 8, mode: 'night' });
  cornerStone(b, f, 8, Y, Z0 - 1, 1889, 'First Juniper Savings Bank\nThis building erected 1889 · Organized 1871\n\n"Thrift is the Foundation of the Commonwealth."');
  void rng;
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}
function cornerStone(b, f, x, y, z, year, text) {
  f.box(x, y, z - 1, 8, 3, 1, MAT.granite);
  f.text(String(year), x + 4, y, z - 2, MAT.trim_cream, { align: 'center', font: 'small' });
  read(b, x + 4, y + 1.5, z - 1.5, 'Cornerstone', text, 1.8);
}

// =====================================================================================================
// THE WHITCOMB HOTEL (1896) — six storeys on Mill Street, facing Union Station
// =====================================================================================================
function buildHotel(ctx, lot, spec) {
  const rng = ctx.rng.fork('hotel' + lot.x + ',' + lot.z);
  const name = spec.name || 'The Whitcomb Hotel';
  const b = new Building(ctx, { name, kind: 'hotel', lot, address: lot.address, established: spec.est || 1896, hours: [T(0), T(24)],
    lore: 'Seventy rooms, a palm court and the Schooner Room bar, across Mill Street from Union Station since 1896. Built by the founder\'s grandson, Captain Josiah Whitcomb, "for the drummers and the honeymooners alike".' });
  const f = b.f, W = lot.w, D = lot.d, FH = 14, NF = Math.max(3, spec.floors || 6);
  const BD = D - 6, H = NF * FH, cx = Math.round(W / 2);
  const sides = streetSides(lot);
  const BR = MAT.brick_dark, SS = MAT.sandstone, IN = MAT.wallpaper_cream;
  f.box(0, -1, 0, W, 1, D, MAT.sidewalk);
  f.box(0, -1, BD, W, 1, D - BD, MAT.concrete);
  shell(f, 0, 0, 0, W, H, BD, BR, MAT.plaster_cream);
  for (let i = 0; i < NF; i++) slab(f, 1, i * FH, 1, W - 2, BD - 2, i === 0 ? MAT.floor_marble : MAT.carpet_red);
  f.walls(0, 0, 0, W, FH, BD, SS, 1);           // sandstone ground storey
  f.box(0, H, 0, W, 1, BD, MAT.roof_tar);
  f.walls(0, H + 1, 0, W, 4, BD, BR, 1);
  const fc = facesOf(f, 0, 0, W, BD);
  // facades: rows of windows with sandstone sills & lintels; arched top floor on the street faces
  for (const side of ['front', 'left', 'right', 'back']) {
    if (side !== 'front' && side !== 'back' && !sides[side]) continue;
    const face = fc[side];
    const cols = colsIn(face.a, face.b, 5, 10, 6);
    gridFacade(face, cols, 5, rowsFor(1, NF - 1, FH, 3, 8), { wall: BR, inner: MAT.plaster_cream, sill: SS, lintels: SS, lintelWide: true, sashMat: MAT.trim_white });
    for (const x of cols) { face.F.archCarve(x, (NF - 1) * FH + 3, face.zf, 5, 9, 2); face.F.archCarve(x, (NF - 1) * FH + 3, face.zf + 1, 5, 9, 1, MAT.glass); face.F.box(x - 1, (NF - 1) * FH + 2, face.zf - 1, 7, 1, 1, SS); }
    face.F.box(face.a, FH - 1, face.zf - 1, face.b - face.a, 1, 1, SS);
    cornice(face.F, face.a, H - 1, face.b - face.a, SS, { z: face.zf, dentils: true });
    if (side === 'left' && sides.left) fireEscape(face.F, cols[Math.floor(cols.length / 2)] - 3, 12, 0, NF, FH, { z: face.zf });
  }
  // ground floor: arched windows for the dining room (left) and the bar (right)
  const DX1 = Math.round(W * 0.34), BX0 = Math.round(W * 0.66);
  for (const x of colsIn(4, DX1 - 4, 8, 14, 2)) { f.archCarve(x, 2, 0, 8, 10, 2); f.archCarve(x, 2, 1, 8, 10, 1, MAT.glass); f.box(x - 1, 1, -1, 10, 1, 1, SS); }
  for (const x of colsIn(BX0 + 4, W - 4, 8, 14, 2)) { f.archCarve(x, 2, 0, 8, 10, 2); f.archCarve(x, 2, 1, 8, 10, 1, MAT.glass_stained_gold); f.box(x - 1, 1, -1, 10, 1, 1, SS); }
  // main entrance: revolving door under a canopy with the hotel's name
  f.carve(cx - 8, 1, 0, 16, 11, 2);
  f.box(cx - 8, 1, 1, 16, 11, 1, MAT.glass);
  f.carve(cx - 6, 1, 1, 4, 9, 1); f.carve(cx + 2, 1, 1, 4, 9, 1);
  f.cylinder(cx, 1, -1, 3.2, 9, MAT.art_deco_gold, 1);
  f.box(cx - 0.5 < cx ? cx : cx, 1, -3, 1, 9, 5, MAT.glass); f.box(cx - 2, 1, -1, 5, 9, 1, MAT.glass);
  f.box(cx - 3, 10, -4, 7, 1, 7, MAT.art_deco_gold);
  f.carve(cx - 2, 1, -2, 1, 9, 1);
  const CZ = -16;
  f.box(cx - 14, 12, CZ, 28, 1, -CZ, MAT.iron);
  f.box(cx - 14, 13, CZ, 28, 4, 1, MAT.trim_dark);
  f.box(cx - 15, 12, CZ - 1, 30, 1, 1, MAT.art_deco_gold); f.box(cx - 15, 17, CZ - 1, 30, 1, 1, MAT.art_deco_gold);
  f.text('THE WHITCOMB', cx, 13, CZ - 1, MAT.bulb_warm, { align: 'center', font: 'small' });
  for (const sx of [cx - 14, cx + 13]) { f.box(sx, 12, CZ, 1, 4, -CZ, MAT.trim_dark); f.box(sx, 0, CZ + 1, 1, 12, 1, MAT.art_deco_gold); }
  for (let x = cx - 12; x < cx + 12; x += 4) f.box(x, 11, CZ + 2, 1, 1, -CZ - 3, MAT.bulb_warm);
  f.box(cx - 13, 0, CZ + 1, 26, 1, -CZ - 1, MAT.carpet_red);
  b.light(cx, 10, CZ / 2, { color: [1, 0.82, 0.55], radius: 10, mode: 'night' });
  f.prop('bellhop_cart', cx + 10, 1, -6, 0, {});
  // rooftop sign: WHITCOMB HOTEL in lamp letters on a steel frame
  {
    const sz = 8, ty = H + 6, sc = 2;
    const tw = f.textWidth('WHITCOMB HOTEL', sc, 'big');
    f.box(cx - tw / 2 - 2, H + 1, sz, 1, ty - H + 16, 1, MAT.iron); f.box(cx + tw / 2 + 1, H + 1, sz, 1, ty - H + 16, 1, MAT.iron);
    for (let x = Math.round(cx - tw / 2); x < cx + tw / 2; x += 12) { f.box(x, H + 1, sz, 1, ty - H - 1, 1, MAT.iron); f.box(x, H + 1, sz + 1, 1, 3, 6, MAT.iron); }
    f.box(cx - tw / 2 - 2, ty - 1, sz, tw + 4, 1, 1, MAT.iron);
    f.text('WHITCOMB HOTEL', cx, ty, sz - 1, MAT.bulb_warm, { align: 'center', scale: sc, font: 'big' });
    const Bk = f.faceFrame('back');
    Bk.box(W - (cx + tw / 2 + 2), ty, D - sz - 1, tw + 4, 14, 1, MAT.iron);
  }
  // corner turret (Queen Anne) on the Lantern Avenue corner
  {
    const tx = sides.left ? 6 : W - 6, tz = 6, r = 8;
    f.cylinder(tx, FH, tz, r, H - FH + 10, BR);
    for (let i = 1; i < NF; i++) for (const [dx, dz] of [[-r, 0], [0, -r], [-r * 0.7, -r * 0.7]]) { f.box(Math.round(tx + dx) - 1 + (dx === 0 ? 0 : 1), i * FH + 3, Math.round(tz + dz) - (dz === 0 ? 1 : 0), dx === 0 ? 3 : 1, 8, dz === 0 ? 3 : 1, MAT.glass); }
    f.cylinder(tx, H + 10, tz, r + 1, 1, SS);
    f.dome(tx, H + 11, tz, r + 1, MAT.roof_slate, { heightScale: 2.2 });
    f.box(tx, H + 11 + Math.ceil((r + 1) * 2.2), tz, 1, 6, 1, MAT.iron);
  }
  // readable name & date on the frieze over the door
  f.box(cx - 12, FH + 1, -1, 24, 5, 1, SS);
  f.text('1896', cx, FH + 1, -2, MAT.trim_dark, { align: 'center', font: 'small' });

  // ---- ground floor rooms
  const LZ1 = BD - 30;
  const lobby = b.room('Palm Court', DX1 + 1, 1, 2, BX0 - DX1 - 2, FH - 1, LZ1 - 2, { lightMode: 'always', lightColor: [1, 0.86, 0.62], lightPower: 1.15 });
  const dining = b.room('Dining Room', 2, 1, 2, DX1 - 2, FH - 1, LZ1 + 4, { lightMode: 'always', lightColor: [1, 0.84, 0.6] });
  const bar = b.room('The Schooner Room', BX0 + 1, 1, 2, W - BX0 - 3, FH - 1, LZ1 - 2, { lightMode: 'always', lightColor: [1, 0.72, 0.45], lightPower: 0.85 });
  const kitchen = b.room('Hotel Kitchen', 2, 1, LZ1 + 7, DX1 - 2, FH - 1, BD - LZ1 - 9, { lightMode: 'always', lightColor: [1, 0.97, 0.9] });
  const svc = b.room('Service Hall', DX1 + 1, 1, LZ1 + 1, W - DX1 - 3, FH - 1, BD - LZ1 - 3, { lightMode: 'auto' });
  partitionZ(f, 2, LZ1 + 6, 1, DX1, FH - 1, IN, [{ at: 20, w: 8, h: 11 }]);
  partitionZ(f, 2, LZ1, 1, BX0, FH - 1, MAT.wood_panel, [{ at: 20, w: 6, h: 11 }]);
  partitionX(f, DX1 + 1, W - 2, 1, LZ1, FH - 1, IN, [{ at: cx + 20, w: 4 }, { at: W - 20, w: 4 }]);
  partitionX(f, 2, DX1, 1, LZ1 + 6, FH - 1, MAT.tile_kitchen, [{ at: DX1 - 12, w: 4 }]);
  b.door(lobby, dining, DX1, 1, 24, { axis: 'z', leaf: false, width: 8 });
  b.door(lobby, bar, BX0, 1, 23, { axis: 'z', leaf: 'door_wood', width: 6, tint: '#4a2a1a' });
  b.door(dining, kitchen, DX1 - 10, 1, LZ1 + 6, { leaf: 'door_wood', tint: '#e0dcd0' });
  b.door(lobby, svc, cx + 22, 1, LZ1, { leaf: 'door_wood' });
  b.door(bar, svc, W - 18, 1, LZ1, { leaf: 'door_wood' });
  b.entrance(lobby, cx, 1, 0, { outZ: -18, outY: 0, leaf: false, main: true });
  // street doors into the dining room and the bar
  f.carve(DX1 - 8, 1, 0, 4, 9, 2); b.entrance(dining, DX1 - 6, 1, 0, { outZ: -6, outY: 0, leaf: 'door_glass', tint: '#4a2a1a' });
  f.carve(BX0 + 4, 1, 0, 4, 9, 2); b.entrance(bar, BX0 + 6, 1, 0, { outZ: -6, outY: 0, leaf: 'door_wood', tint: '#4a2a1a' });
  f.box(DX1 - 9, 10, -1, 6, 1, 1, SS); f.box(BX0 + 3, 10, -1, 6, 1, 1, SS);
  // back door to the service alley
  f.carve(W - 30, 1, BD - 2, 4, 9, 2);
  b.door(svc, null, W - 28, 1, BD - 1, { leaf: 'door_wood', tint: '#5a5a5a' });
  linkToSidewalk(ctx, b.navPoint(svc, W - 28, 0, BD + 3), 40);

  // palm court: palms, armchairs, the desk with its bell, mail slots, the bellhop
  f.box(DX1 + 1, 0, 2, BX0 - DX1 - 2, 1, LZ1 - 2, MAT.floor_bigcheck);
  f.box(DX1 + 8, 0, 8, BX0 - DX1 - 16, 1, LZ1 - 20, MAT.rug_oriental);
  for (const [dx, dz] of [[-24, 8], [24, 8], [-24, 30], [24, 30], [-10, 42], [10, 42]]) f.prop('palm_pot', cx + dx, 1, dz, 0, {});
  const lounge = [];
  for (const [dx, dz, r] of [[-14, 14, 1], [14, 14, 3], [-14, 22, 1], [14, 22, 3], [-5, 30, 0], [5, 30, 0]]) { f.prop('armchair', cx + dx, 1, dz, r, { tint: rng.pick(['#6a2a2a', '#2a4a3a', '#8a6a3a']) }); lounge.push(b.spot('sit', cx + dx, 1, dz, r, { room: lobby, act: rng.pick(['read', 'sit', 'doze', 'talk_sit']), tags: ['lobby', 'lounge'], seat: 0.42 })); b.playerSeat(cx + dx, 1, dz, r, 0.42); }
  f.prop('table_coffee', cx, 1, 18, 0, {}); f.prop('sofa', cx, 1, 26, 0, { tint: '#6a2a2a' });
  f.prop('chandelier', cx, FH - 6, 18, 0, {}); f.prop('chandelier', cx, FH - 6, 36, 0, {});
  const DZ = LZ1 - 8;
  f.prop('hotel_desk', cx - 4, 1, DZ, 0, {}); f.prop('hotel_desk', cx + 4, 1, DZ, 0, {});
  f.prop('mail_slots', cx, 1, LZ1 - 1.3, 0, {}); f.prop('clock_wall', cx, 9, LZ1 - 0.6, 0, {});
  f.prop('clock_wall', cx - 8, 9, LZ1 - 0.6, 0, {}); f.prop('clock_wall', cx + 8, 9, LZ1 - 0.6, 0, {});
  read(b, cx, 1.5, DZ - 2.2, 'Brass Bell', 'Ring for Service.\n\n(The bell is engraved: "Presented to the Whitcomb Hotel by the Travelling Salesmen of New England, 1904 — We Rang, You Came.")', 1.4);
  read(b, cx - 8, 8, LZ1 - 1, 'Three Clocks', 'Three brass clocks above the desk, labelled BOSTON, JUNIPER BAY and PORTLAND.\n\nAll three show the same time. They have since 1883, when the railroads put New England on Standard Time — but the Whitcomb\'s first owner thought the labels looked cosmopolitan.');
  const clerk = b.spot('stand', cx - 3, 1, DZ + 2.8, 0, { room: lobby, act: 'counter', tags: ['clerk'], lines: ['Welcome to the Whitcomb. Sign here, please.', 'Room 214, second floor, front — a view of the station.', 'Checkout is at noon. Harbor Days or not.'] });
  b.job('clerk', clerk, { shift: ['7:00', '19:00'], title: 'desk clerk', outfit: 'clerk' });
  const night = b.spot('stand', cx + 3, 1, DZ + 2.8, 0, { room: lobby, act: 'read_stand', tags: ['clerk'] });
  b.job('night clerk', night, { shift: ['19:00', '23:59'], title: 'night clerk', outfit: 'clerk' });
  const bell = b.spot('stand', cx + 9, 1, DZ - 3, 0, { room: lobby, act: 'stand', tags: ['work'], lines: ['Carried Mr. Harlow\'s bags in \'22. Carried the Governor\'s in \'48. Heavier.', 'Front! Yes sir, right away.', 'The 4:52\'s due. Better get the cart.'] });
  const bellDoor = b.spot('stand', cx + 6, 1, 4, 0, { room: lobby, act: 'stand', tags: ['work'] });
  b.job('bellhop', [bell, bellDoor], { shift: ['8:00', '20:00'], title: 'bellhop', outfit: 'bellhop' });
  f.prop('luggage_cart', cx + 12, 1, DZ - 4, 1, {}); f.prop('suitcase', cx + 12, 1, DZ - 1, 0, {}); f.prop('suitcase', cx + 13, 1, DZ - 1, 1, { tint: '#6a3a2a' });
  for (let k = 0; k < 3; k++) b.spot('stand', cx - 6 + k * 3, 1, DZ - 3, 2, { room: lobby, act: 'wait', tags: ['shop', 'customer', 'lobby'] });
  read(b, cx + 18, 5, 3, 'Register, Open on a Stand', 'THE WHITCOMB HOTEL — REGISTER\nSaturday, September 26, 1953\n\nMr. & Mrs. H. Albright, Worcester — 214\nMiss D. Pease, Hartford — 302\nCapt. R. Lindqvist, USN, Norfolk — 216\nMr. J. Kowalczyk & family, Lowell — 218, 220\nThe Ellison Sisters, Bangor — 304\nMr. & Mrs. T. Duffy, South Boston — 306 ("here for the wedding")\nMr. A. Brandt, Boston (architect) — 510\n\nOn the first page of the volume, pasted in: the signature of Mr. John L. Sullivan, 1897, who "paid in advance and broke a chair".');
  // dining room: tables of four (eat_out), a maitre d', waiters
  f.box(2, 0, 2, DX1 - 2, 1, LZ1 + 4, MAT.carpet_green);
  const eat = [];
  const tcols = Math.max(2, Math.floor((DX1 - 8) / 16)), trows = Math.max(2, Math.floor((LZ1 - 6) / 14));
  for (let r = 0; r < trows; r++) for (let c = 0; c < tcols; c++) {
    const tx = 10 + c * (DX1 - 16) / Math.max(1, tcols - 1), tz = 10 + r * 14;
    f.prop('table_round', tx, 1, tz, 0, { tint: '#f0ece0' });
    f.prop('vase_flowers', tx, 4, tz, 0, { tint: rng.pick(['#d85a6a', '#e0c040', '#c86ad8']) });
    for (const [dx, dz, rr] of [[0, -3, 2], [0, 3, 0], [-3, 0, 1], [3, 0, 3]]) { f.prop('chair_wood', tx + dx, 1, tz + dz, rr, {}); eat.push(b.spot('sit', tx + dx, 1, tz + dz, rr, { room: dining, act: 'eat', tags: ['eat_out', 'hotel_dining'], seat: 0.45, label: 'Dining at the Whitcomb' })); }
  }
  f.prop('chandelier', DX1 / 2, FH - 6, LZ1 / 2, 0, {}); f.prop('sideboard', 3, 1, LZ1 / 2, 1, {}); f.prop('lectern', DX1 - 6, 1, 14, 3, {});
  const md = b.spot('stand', DX1 - 8, 1, 14, 3, { room: dining, act: 'stand', tags: ['work'], lines: ['Table for two? Right this way.', 'The chowder is excellent today, sir.'] });
  b.job('maitre d', md, { shift: ['11:00', '21:00'], title: 'maître d\'', outfit: 'waitress', sex: 'M' });
  const wt = [b.spot('stand', DX1 / 2, 1, 18, 0, { room: dining, act: 'serve', tags: ['work'] }), b.spot('stand', DX1 / 2 - 8, 1, 32, 2, { room: dining, act: 'serve', tags: ['work'] })];
  b.job('waitress', wt, { shift: ['7:00', '15:00'], outfit: 'waitress', sex: 'F', title: 'dining-room waitress' });
  b.job('waitress', wt.slice().reverse(), { shift: ['15:00', '22:00'], outfit: 'waitress', sex: 'F', title: 'dining-room waitress' });
  read(b, DX1 - 6, 4, 14, 'Menu — Centennial Dinner', 'THE WHITCOMB HOTEL · DINING ROOM\nSaturday, September 26, 1953 — Centennial Menu\n\nClam Chowder, Juniper Bay Style\nBroiled Scrod, Lemon Butter · or · Roast Native Turkey, Chestnut Dressing\nWhipped Potato · Buttered Beets · Parker House Rolls\nIndian Pudding with Vanilla Ice Cream · or · Halloran\'s Apple Pie\nCoffee · Tea · Milk\n\n$2.25 complete\n\n"The Whitcomb has served every Governor of the Commonwealth since 1896, and one President (Taft, 1911, who had the turkey twice)."');
  // kitchen
  const kz = BD - 4;
  for (let k = 0; k < 4; k++) f.prop(k % 2 ? 'stove' : 'kitchen_counter', 6 + k * 4, 1, kz - 1.3, 0, {});
  f.prop('kitchen_sink', DX1 - 8, 1, kz - 1.3, 0, {}); f.prop('coffee_urn', DX1 - 14, 4, kz - 1.3, 0, {});
  const cooks = [b.spot('stand', 10, 1, kz - 4, 2, { room: kitchen, act: 'cook', tags: ['work'] }), b.spot('stand', 18, 1, kz - 4, 2, { room: kitchen, act: 'cook', tags: ['work'] })];
  b.job('cook', cooks[0], { shift: ['6:00', '15:00'], outfit: 'cook', title: 'hotel cook' });
  b.job('cook', cooks[1], { shift: ['14:00', '22:00'], outfit: 'cook', title: 'hotel cook' });
  b.job('dishwasher', b.spot('stand', DX1 - 8, 1, kz - 4, 2, { room: kitchen, act: 'wash', tags: ['work'] }), { shift: ['10:00', '21:00'], title: 'dishwasher' });
  // the Schooner Room: bar, stools, tables, a ship model
  f.box(BX0 + 1, 0, 2, W - BX0 - 3, 1, LZ1 - 2, MAT.floor_walnut);
  const barZ = LZ1 - 8;
  for (let x = BX0 + 6; x < W - 8; x += 4) f.prop('bar_counter', x, 1, barZ, 0, {});
  for (let x = BX0 + 6; x < W - 8; x += 5) f.prop('bar_back_shelf', x, 1, LZ1 - 1.2, 0, {});
  f.prop('beer_taps', BX0 + 14, 4, barZ, 0, {});
  const stools = [];
  for (let x = BX0 + 7; x < W - 8; x += 3.5) { f.prop('bar_stool', x, 1, barZ - 2.6, 2, {}); stools.push(b.spot('sit', x, 1, barZ - 2.6, 2, { room: bar, act: 'drink', tags: ['bar'], seat: 0.7, label: 'A drink in the Schooner Room' })); b.playerSeat(x, 1, barZ - 2.6, 2, 0.7); }
  for (let k = 0; k < 3; k++) { const tx = BX0 + 10 + k * 14, tz = 12; f.prop('club_table', tx, 1, tz, 0, {}); for (const [dx, rr] of [[-2.5, 1], [2.5, 3]]) { f.prop('chair_wood', tx + dx, 1, tz, rr, {}); b.spot('sit', tx + dx, 1, tz, rr, { room: bar, act: rng.pick(['drink', 'talk_sit', 'cards']), tags: ['bar'], seat: 0.45 }); } }
  const bt = b.spot('stand', (BX0 + W) / 2, 1, barZ + 2.6, 0, { room: bar, act: 'bartend', tags: ['work'], lines: ['What\'ll it be?', 'Narragansett on tap, or there\'s Ballantine.', 'Sal Castellano\'s boy came home Tuesday. Drinks were on the house.'] });
  b.job('bartender', bt, { shift: ['12:00', '23:59'], title: 'bartender', outfit: 'waitress', sex: 'M' });
  f.prop('ship_model_case', W - 6, 1, 6, 3, {}); f.prop('ships_wheel_wall', W - 2.6, 7, 20, 3, {});
  read(b, W - 6, 4, 8, 'Ship Model — the JUNIPER', 'THE SCHOONER JUNIPER, 1846\nModel built by Capt. Josiah Whitcomb, 1896, for the opening of this room.\n\nIn October 1851 Captain Elias Whitcomb rode out a gale in this cove aboard her and swore he would come back. He did, in 1853, with eleven families.\n\nThe real JUNIPER was broken up in 1872. Her figurehead is in the Maritime Museum. Her bell hangs over the door of this bar, and is rung for every Juniper Bay man who comes home from the sea — or from a war.');
  f.prop('bell_brass', BX0 + 4, 9, 22, 1, {});
  // service hall: luggage room, back office
  f.prop('crate_stack', W - 10, 1, BD - 6, 0, {}); f.prop('laundry_bundles', cx + 30, 1, BD - 5, 0, {}); f.prop('trunk', cx + 36, 1, BD - 5, 0, {});
  f.prop('trunk', cx + 40, 1, BD - 5, 1, { tint: '#3a4a6a' });

  // ---- upper floors: corridor, guest rooms front and back, the core
  const stX = cx - 18, stZ = BD - 2 - 22, carX = cx + 4;
  const C0 = stZ - 11, C1 = stZ - 1;
  const RM = [lobby];
  const nF = Math.max(3, Math.round((W - 4) / 28)), fw = (W - 4) / nF;
  const homes = [];
  for (let i = 1; i < NF; i++) {
    const y = i * FH + 1;
    const corr = b.room(`${ordinal(i + 1)} Floor Hall`, 2, y, C0, W - 4, FH - 1, C1 - C0, { lightMode: 'auto', nav: [cx, C0 + 5], lightColor: [1, 0.8, 0.55] });
    RM[i] = corr;
    f.box(2, y - 1, C0, W - 4, 1, C1 - C0, MAT.carpet_red);
    f.box(2, y - 1, C0 + 3, W - 4, 1, 4, MAT.rug_oriental);
    const gapsF = [], gapsB = [];
    for (let k = 0; k < nF; k++) gapsF.push({ at: Math.round(2 + k * fw + fw - 8), w: 4 });
    partitionX(f, 2, W - 2, y, C0 - 1, FH - 1, IN, gapsF);
    for (let k = 1; k < nF; k++) partitionZ(f, 2, C0 - 1, y, Math.round(2 + k * fw), FH - 1, IN, []);
    // back rooms left & right of the core
    const backL = [2, stX - 2], backR = [carX + 5, W - 2];
    const nbL = Math.max(1, Math.round((backL[1] - backL[0]) / 28)), nbR = Math.max(1, Math.round((backR[1] - backR[0]) / 28));
    const bRooms = [];
    for (const [[a, c], n] of [[backL, nbL], [backR, nbR]]) {
      const w = (c - a) / n;
      for (let k = 0; k < n; k++) { const x0 = Math.round(a + k * w), x1 = Math.round(a + (k + 1) * w); bRooms.push([x0 + (k ? 1 : 0), x1]); gapsB.push({ at: x0 + 5, w: 4 }); if (k) partitionZ(f, C1 + 1, BD - 2, y, x0, FH - 1, IN, []); }
    }
    partitionX(f, 2, W - 2, y, C1, FH - 1, IN, gapsB);
    f.box(stX - 2, y, C1 + 1, 1, FH - 1, BD - 3 - C1, IN); f.box(carX + 4, y, C1 + 1, 1, FH - 1, BD - 3 - C1, IN);
    f.box(stX + 10, y, C1, carX - 4 - stX - 10, FH - 1, BD - 2 - C1, IN);
    const guestRooms = [];
    for (let k = 0; k < nF; k++) {
      const x0 = Math.round(2 + k * fw) + (k ? 1 : 0), x1 = Math.round(2 + (k + 1) * fw);
      const no = i * 100 + 1 + k * 2;
      const r = b.room(`Room ${no}`, x0, y, 2, x1 - x0, FH - 1, C0 - 3, { lightMode: 'auto', public: false });
      b.door(corr, r, Math.round(2 + k * fw + fw - 6), y, C0 - 1, { leaf: 'door_wood', tint: '#5a3a24' });
      f.prop(textSignType(String(no), { bg: '#c9a24a', fg: '#1d1d22', border: '#6a4a20', scale: 1 / 40 }), Math.round(2 + k * fw + fw - 6) - 3.5, y + 7, C0 - 1 + 1.15, 2, {});
      guestRooms.push({ r, x0, x1, z0: 2, z1: C0 - 1, front: true, no });
    }
    bRooms.forEach(([x0, x1], k) => {
      const no = i * 100 + 2 + k * 2;
      const r = b.room(`Room ${no}`, x0, y, C1 + 1, x1 - x0, FH - 1, BD - 3 - C1, { lightMode: 'auto', public: false });
      b.door(corr, r, x0 + 7, y, C1, { leaf: 'door_wood', tint: '#5a3a24' });
      guestRooms.push({ r, x0, x1, z0: C1 + 1, z1: BD - 2, front: false, no });
    });
    // furnish: floors 2–3 fully, the rest simply
    guestRooms.forEach((g, k) => {
      const full = i <= 2;
      const bx = (g.x0 + g.x1) / 2, w = g.x1 - g.x0;
      const headZ = g.front ? g.z0 + 1 : g.z1 - 1;
      const bedRot = g.front ? 2 : 0;
      const twin = full && k % 3 === 1;
      const beds = [];
      const bedAt = (x) => {
        f.prop(twin ? 'bed_single' : 'bed_double', x, y, g.front ? headZ + 4.2 : headZ - 4.2, bedRot, { tint: rng.pick(['#e8e0d0', '#c8b890', '#d8c8b0', '#b8c8d8']) });
        const n = twin ? 1 : 2;
        for (let s = 0; s < n; s++) beds.push(b.spot('sleep', x + (n === 1 ? 0 : s ? 1.3 : -1.3), y, g.front ? headZ + 7.6 : headZ - 7.6, bedRot, { room: g.r, act: 'sleep', tags: ['sleep'], seat: 0.55, public: false }));
      };
      if (twin) { bedAt(bx - 4); bedAt(bx + 4); } else bedAt(bx);
      if (full) {
        f.prop('nightstand', bx - (twin ? 0 : 5), y, g.front ? headZ + 1.2 : headZ - 1.2, bedRot, {});
        f.prop('dresser', g.x0 + 2.5, y, g.front ? g.z1 - 1.5 : g.z0 + 1.5, g.front ? 0 : 2, {});
        f.prop('armchair', g.x1 - 3, y, g.front ? g.z1 - 4 : g.z0 + 4, g.front ? 3 : 3, { tint: rng.pick(['#6a4a3a', '#4a5a6a', '#7a6a4a']) });
        if (k % 2 === 0) { f.prop('suitcase', g.x0 + 3, y, g.front ? g.z0 + 10 : g.z1 - 10, rng.int(0, 3), { tint: rng.pick(['#6a3a2a', '#2a3a5a', '#8a7a5a']) }); f.prop('hat_fedora', g.x0 + 2.5, y + 3.4, g.front ? g.z1 - 1.5 : g.z0 + 1.5, 0, {}); }
        else f.prop('trunk', g.x1 - 3, y, g.front ? g.z0 + 8 : g.z1 - 8, 1, {});
        f.prop('radiator', g.x1 - 1, y, g.front ? g.z0 + 3 : g.z1 - 3, 3, {});
        const lsp = b.spot('sit', g.x1 - 3, y, g.front ? g.z1 - 4 : g.z0 + 4, 3, { room: g.r, act: rng.pick(['read', 'sit', 'doze']), tags: ['lounge'], seat: 0.42, public: false });
        g.lounge = lsp;
      }
      g.beds = beds;
      void w;
    });
    // households of travelling guests: one party per two rooms on the fully furnished floors
    if (i <= 2) for (let k = 0; k + 1 < guestRooms.length; k += 2) {
      const a = guestRooms[k], c = guestRooms[k + 1];
      if (homes.length >= 8) break;
      homes.push(b.home({ family: null, size: a.beds.length + c.beds.length, beds: [...a.beds, ...c.beds], dine: eat.slice((homes.length * 4) % eat.length, (homes.length * 4) % eat.length + 4), lounge: [a.lounge, c.lounge, ...lounge.slice(homes.length % 3, homes.length % 3 + 2)].filter(Boolean), kitchen: [], bath: [], yard: [], porch: [], desk: [], special: 'hotel_guests', visitors: true }));
    }
    // a shared bath at the end of the hall
    f.prop('ceiling_lamp', cx - 30, y + 10, (C0 + C1) / 2, 0, {}); f.prop('ceiling_lamp', cx + 30, y + 10, (C0 + C1) / 2, 0, {});
    if (i <= 2) { f.prop('bench_station', W - 6, y, (C0 + C1) / 2, 3, {}); f.prop('palm_pot', 5, y, (C0 + C1) / 2, 0, {}); }
  }
  read(b, cx + 10, FH + 5, C0 + 1, 'Card on a Door — Room 214', 'PLEASE DO NOT DISTURB\n\nWritten underneath, in a lady\'s hand: "Honeymoon. Worcester. Married Thursday. Please tell the bellhop he may stop winking."');

  // core
  const core = stairCore(b, stX, stZ, FH, 0, NF, { mat: MAT.wood_mid, wall: IN, doorX: 0 });
  for (let i = 0; i < NF; i++) b.door(i === 0 ? svc : RM[i], core.rooms[i], stX + 2, i * FH + 1, stZ - 1, { leaf: 'door_wood', tint: '#5a3a24' });
  elevatorBank(b, [carX], stZ - 1, FH, NF, () => Array.from({ length: NF }, (_, i) => ({ i, label: i === 0 ? 'Lobby' : `${ordinal(i + 1)} Floor` })).filter((q) => q.i === 0 || q.i === 1 || q.i === 2 || q.i === NF - 1), (i) => (i === 0 ? svc : RM[i]), { frame: SS });
  // a direct way from the palm court to the elevator & stairs through the service hall is the door above
  void homes;
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

function buildDepartment(ctx, lot, spec) { return null; }
function buildTheater(ctx, lot, spec) { return null; }
function buildNewspaper(ctx, lot, spec) { return null; }
function buildStation(ctx, lot, spec) { return null; }
function buildCannery(ctx, lot, spec) { return null; }
