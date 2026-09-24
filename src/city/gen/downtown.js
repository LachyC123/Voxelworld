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
    f.prop('lectern', cars[0] - 9, 1, elZ - 3, 0, {});
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


// =====================================================================================================
// HARLOW'S (est. 1878) — five floors on Market Street, display windows, the 1949 escalator, a tea room
// =====================================================================================================
const HARLOWS_FLOORS = [
  { name: 'Main Floor — Cosmetics, Gloves & Millinery', kind: 'cosmetics' },
  { name: 'Second Floor — Ladies\' Apparel', kind: 'ladies' },
  { name: 'Third Floor — Men\'s & Boys\' Wear', kind: 'mens' },
  { name: 'Fourth Floor — Toys & Housewares', kind: 'toys' },
  { name: 'Fifth Floor — Furniture', kind: 'furniture' },
];
function buildDepartment(ctx, lot, spec) {
  const rng = ctx.rng.fork('dept' + lot.x + ',' + lot.z);
  const name = spec.name || 'Harlow\'s';
  const b = new Building(ctx, { name, kind: 'department', lot, address: lot.address, established: spec.est || 1878, hours: [T(9, 30), T(17, 30)],
    lore: 'Harlow\'s opened in 1878 as a one-room dry-goods shop. Burned out in the Great Fire of 1902, it came back in 1904 as five floors of glass and terracotta — with, since 1949, the only escalator in the county.' });
  const f = b.f, W = lot.w, D = lot.d, FH = 18, NF = Math.max(3, Math.min(5, spec.floors || 5));
  const BD = D - 6, H = NF * FH, cx = Math.round(W / 2);
  const sides = streetSides(lot);
  const TC = MAT.limestone, SP = MAT.brick_white, IN = MAT.plaster_cream;
  f.box(0, -1, 0, W, 1, D, MAT.sidewalk);
  f.box(0, -1, BD, W, 1, D - BD, MAT.concrete);
  shell(f, 0, 0, 0, W, H, BD, TC, IN);
  const floorMat = [MAT.floor_terrazzo, MAT.carpet_rose, MAT.floor_oak, MAT.floor_linoleum_green, MAT.carpet_beige];
  for (let i = 0; i < NF; i++) slab(f, 1, i * FH, 1, W - 2, BD - 2, floorMat[i] || MAT.floor_oak);
  f.box(0, H, 0, W, 1, BD, MAT.roof_tar);
  f.walls(0, H + 1, 0, W, 5, BD, TC, 1);
  const fc = facesOf(f, 0, 0, W, BD);
  // Chicago windows: wide plate glass between terracotta piers, white brick spandrels
  for (const side of ['front', 'left', 'right', 'back']) {
    if ((side === 'left' || side === 'right') && !sides[side]) continue;
    const face = fc[side];
    const cols = colsIn(face.a, face.b, 14, 18, 4);
    gridFacade(face, cols, 14, rowsFor(1, NF, FH, 4, 11), { wall: TC, spandrel: SP, inner: IN, sashMat: MAT.trim_dark, sill: MAT.trim_green, proud: 1, proudMat: TC });
    cornice(face.F, face.a, H - 1, face.b - face.a, MAT.roof_copper, { z: face.zf, brackets: 6 });
    face.F.box(face.a, FH - 1, face.zf - 1, face.b - face.a, 2, 1, MAT.roof_copper);
    if (side !== 'front' && side !== 'back') for (const x of colsIn(face.a + 4, face.b - 4, 12, 18, 2)) { face.F.carve(x, 2, face.zf, 12, 11, 2); face.F.box(x, 2, face.zf, 12, 1, 1, MAT.granite); face.F.box(x, 3, face.zf, 12, 10, 1, MAT.glass_shop); }
  }
  // the ground floor: continuous display windows with mannequins, the revolving door, a bronze canopy
  f.carve(4, 1, 0, W - 8, 14, 2);
  f.box(4, 1, 0, W - 8, 2, 1, MAT.granite);
  f.box(4, 3, 0, W - 8, 10, 1, MAT.glass_shop);
  f.box(4, 13, 0, W - 8, 2, 1, MAT.glass_stained_gold);
  for (let x = 4; x < W - 4; x += 16) f.box(x, 1, 0, 2, 14, 1, MAT.art_deco_gold);
  f.carve(cx - 8, 1, 0, 16, 12, 2);
  f.box(cx - 8, 1, 1, 16, 12, 1, MAT.glass); f.carve(cx - 7, 1, 1, 4, 9, 1); f.carve(cx + 3, 1, 1, 4, 9, 1);
  f.cylinder(cx, 1, -1, 3.2, 9, MAT.art_deco_gold, 1); f.box(cx, 1, -3, 1, 9, 5, MAT.glass); f.box(cx - 2, 1, -1, 5, 9, 1, MAT.glass); f.box(cx - 3, 10, -4, 7, 1, 7, MAT.art_deco_gold);
  f.box(4, 15, -6, W - 8, 1, 6, MAT.art_deco_gold); f.box(4, 16, -6, W - 8, 1, 1, MAT.trim_dark);
  for (let x = 8; x < W - 8; x += 6) f.box(x, 14, -5, 1, 1, 4, MAT.bulb_warm);
  // display boxes behind the glass: mannequins in fall coats, hats, a Centennial sale card in each
  const displays = [];
  for (let x = 10; x < W - 10; x += 16) {
    if (Math.abs(x + 6 - cx) < 12) continue;
    f.box(x - 2, 1, 2, 14, 2, 8, MAT.carpet_red); f.box(x - 2, 1, 10, 14, 13, 1, MAT.velvet_red);
    displays.push(x);
    f.prop('mannequin', x + 2, 3, 6, 0, { tint: rng.pick(['#8a2a2a', '#2a3a5a', '#6a5a3a', '#3a5a3a', '#c8b090']) });
    f.prop('mannequin', x + 7, 3, 7, 0, { tint: rng.pick(['#5a3a5a', '#c86a3a', '#2a2a2e', '#8a8a90']) });
    f.prop(rng.pick(['hat_display', 'shoe_display', 'jewelry_case']), x + 10, 3, 5, 0, {});
  }
  // name signs: a big roof sign and a blade at the corner
  {
    const sc = 3, ty = H + 8;
    const tw = f.textWidth('HARLOW\'S', sc, 'big');
    f.box(cx - tw / 2 - 3, H + 1, 6, 1, 30, 1, MAT.iron); f.box(cx + tw / 2 + 2, H + 1, 6, 1, 30, 1, MAT.iron);
    for (let x = Math.round(cx - tw / 2); x < cx + tw / 2; x += 14) { f.box(x, H + 1, 6, 1, 8, 1, MAT.iron); f.box(x, H + 1, 7, 1, 2, 8, MAT.iron); }
    f.box(cx - tw / 2 - 3, ty - 1, 6, tw + 6, 1, 1, MAT.iron);
    f.text('HARLOW\'S', cx, ty, 5, MAT.neon_red, { align: 'center', scale: sc, font: 'big' });
    f.text('SINCE 1878', cx, H - 6, -1, MAT.art_deco_gold, { align: 'center', font: 'small', scale: 1 });
    b.light(cx, ty + 10, 2, { color: [1, 0.3, 0.25], radius: 12, mode: 'night' });
    // corner blade
    const bladeX = sides.left ? 1 : W - 3;
    f.box(bladeX, 22, -12, 2, 44, 11, MAT.sign_cream);
    f.box(bladeX, 21, -12, 2, 1, 11, MAT.marquee_bulbs); f.box(bladeX, 66, -12, 2, 1, 11, MAT.marquee_bulbs);
    const L = f.faceFrame('left'), R = f.faceFrame('right');
    vtext(L, 'HARLOWS', LZ(f, -6.5), 65, LX(f, bladeX) - 1, MAT.neon_red, { gap: -1 });
    vtext(R, 'HARLOWS', RZ(f, -6.5), 65, RX(f, bladeX + 1) - 1, MAT.neon_red, { gap: -1 });
  }
  // Centennial Sale: a banner across the front and bunting drops
  f.box(12, FH + 2, -1, W - 24, 7, 1, MAT.canvas_white);
  f.box(12, FH + 2, -1, W - 24, 1, 1, MAT.flag_red); f.box(12, FH + 8, -1, W - 24, 1, 1, MAT.flag_blue);
  f.text('CENTENNIAL SALE - HARLOWS 1878-1953 - EVERY FLOOR', cx, FH + 3, -2, MAT.flag_red, { align: 'center', font: 'small' });
  for (const x of colsIn(8, W - 8, 4, 36, 2)) {
    f.box(x, 2 * FH + 2, -1, 4, 26, 1, MAT.flag_red); f.box(x + 1, 2 * FH + 2, -1, 2, 26, 1, MAT.flag_white); f.box(x, 2 * FH + 26, -1, 4, 2, 1, MAT.flag_blue);
  }
  read(b, cx + 12, 3, -1, 'Window Card', 'HARLOW\'S CENTENNIAL SALE\nSeventy-five years on Market Street!\n\nLadies\' fall coats from $19.95 · Men\'s worsted suits $39.50\nThe new Admiral 21-inch television, $199.95 — easy terms\nToys for Christmas: lay-away now!\n\nThe tea room on Five serves the Centennial Tea, 3 to 5 o\'clock.');
  cornerStone(b, f, 6, 1, 0, 1904, 'HARLOW\'S\nFounded 1878 by Silas Harlow in a room twelve feet square.\nBurned June 11, 1902. Rebuilt 1904.\n\n"We Sold Through the Smoke" — the store opened for business in a tent on Founders Square two days after the fire, and sold out.');

  // ---- core at the back: stair (left), two elevators (centre), stock rooms
  const stX = 14, stZ = BD - 2 - (FH + 8);
  const cars = [cx - 4, cx + 4];
  const floorRooms = [];
  for (let i = 0; i < NF; i++) {
    const y = i * FH + 1, inf = HARLOWS_FLOORS[i] || HARLOWS_FLOORS[HARLOWS_FLOORS.length - 1];
    const r = b.room(inf.name, 2, y, 2, W - 4, FH - 1, stZ - 3, { lightMode: 'always', lightColor: [1, 0.9, 0.72], lightPower: 1.15, nav: [cx, 20] });
    floorRooms.push(r);
    // back of house: stock room behind a partition
    partitionX(f, 2, W - 2, y, stZ - 1, FH - 1, IN, [{ at: W - 30, w: 4 }]);
    const stock = b.room(i === NF - 1 ? 'Executive Offices' : 'Stock Room', cx + 12, y, stZ, W - cx - 14, FH - 1, BD - 2 - stZ, { lightMode: 'auto' });
    b.door(r, stock, W - 28, y, stZ - 1, { leaf: 'door_wood', tint: '#5a4a3a' });
    f.box(stX + 10, y, stZ, cx - 8 - stX - 10, FH - 1, BD - 2 - stZ, IN);
    if (i < NF - 1) { f.prop('crate_stack', W - 12, y, BD - 6, 0, {}); f.prop('sack_pile', W - 22, y, BD - 6, 0, {}); f.prop('dress_rack', W - 34, y, BD - 8, 0, { tint: '#6a6a70' }); }
    // columns
    for (let x = 36; x < W - 20; x += 40) for (let z = 18; z < stZ - 6; z += 30) if (i === 0) f.box(x, 1, z, 3, H - 1, 3, TC);
    f.prop('chandelier', cx - 60, y + FH - 7, 26, 0, {}); f.prop('chandelier', cx + 60, y + FH - 7, 26, 0, {});
  }
  const core = stairCore(b, stX, stZ, FH, 0, NF, { mat: MAT.terrazzo || MAT.concrete, wall: IN, doorX: 0 });
  for (let i = 0; i < NF; i++) b.door(floorRooms[i], core.rooms[i], stX + 2, i * FH + 1, stZ - 1, { leaf: 'door_wood', tint: '#5a4a3a' });
  elevatorBank(b, cars, stZ - 1, FH, NF, (k) => (k === 0 ? Array.from({ length: NF }, (_, i) => i) : [0, NF - 1]).map((i) => ({ i, label: HARLOWS_FLOORS[i] ? HARLOWS_FLOORS[i].name.split(' — ')[0] + ' — ' + HARLOWS_FLOORS[i].name.split(' — ')[1].split(',')[0] : `${i + 1}` })), (i) => floorRooms[i], { frame: MAT.marble });
  const op = b.spot('stand', cars[0] - 6, 1, stZ - 4, 0, { room: floorRooms[0], act: 'stand', tags: ['work'], lines: ['Going up! Second floor, ladies\' coats and dresses...', 'Fifth floor: furniture and the tea room. Watch your step, madam.'] });
  b.job('elevator operator', op, { shift: ['9:15', '17:45'], title: 'elevator girl', outfit: 'bellhop', sex: 'F' });

  // ---- the 1949 escalator: two stepped flights (up & down) between Main and Second
  const eX = cx - 5, eZ = stZ - 12 - 2 * FH;
  for (const ex of [eX, eX + 6]) {
    stairs(f, ex, 1, eZ, '+z', FH, { w: 4, run: 2, mat: MAT.rubber_mat, rail: false });
    for (let k = 0; k < FH; k++) f.box(ex, k + 1, eZ + 2 * k, 4, 1, 1, MAT.chrome);
  }
  for (const bx of [eX - 1, eX + 4, eX + 5, eX + 10]) for (let k = 0; k < FH; k += 2) f.box(bx, k + 1, eZ + 2 * k, 1, 4, 4, bx === eX + 4 || bx === eX + 5 ? MAT.chrome : MAT.stainless);
  f.box(eX - 2, FH + 1, eZ + 2 * FH - 4, 1, 4, 4, MAT.chrome); f.box(eX + 11, FH + 1, eZ + 2 * FH - 4, 1, 4, 4, MAT.chrome);
  f.walls(eX - 2, FH + 1, eZ + 10, 14, 4, 2 * FH - 12, MAT.chrome, 1);
  f.carve(eX, FH + 1, eZ + 2 * FH - 3, 10, 4, 1);
  b.stairs(floorRooms[0], [eX + 2, 1, eZ - 2], floorRooms[1], [eX + 2, FH + 1, eZ + 2 * FH + 2]);
  b.stairs(floorRooms[0], [eX + 8, 1, eZ - 2], floorRooms[1], [eX + 8, FH + 1, eZ + 2 * FH + 2]);
  read(b, eX - 2, 5, eZ - 1, 'Escalator Plaque', 'OTIS ELEVATOR COMPANY · MOVING STAIRWAY\nInstalled by Harlow\'s, April 1949 — the only one in the county.\n\nOn opening day Mr. Harlow rode it forty-one times, and the Courier ran a photograph of Mrs. Bridget Halloran refusing to.\n\nPLEASE HOLD THE HANDRAIL · CHILDREN MUST BE ACCOMPANIED', 1.8);
  f.prop(textSignType('ESCALATOR TO 2', { bg: '#1d1d22', fg: '#e8c870', scale: 1 / 32 }), eX + 5, 12, eZ - 3, 0, {});

  // ---- departments
  const clerks = [];
  const browse = (i, x, z, rot = 0) => b.spot('stand', x, i * FH + 1, z, rot, { room: floorRooms[i], act: 'browse', tags: ['browse', 'shop'], label: `Shopping at Harlow's` });
  const counter = (i, x, z, type, rot = 0) => { f.prop(type, x, i * FH + 1, z, rot, {}); };
  const clerkAt = (i, x, z, rot, lines) => { const s = b.spot('stand', x, i * FH + 1, z, rot, { room: floorRooms[i], act: 'counter', tags: ['clerk'], lines }); clerks.push(s); return s; };
  // 1: cosmetics & hats — glass counters in a square, hat stands, glove cases
  {
    const y = 1;
    for (const [x0, z0] of [[30, 24], [W - 70, 24]]) {
      for (let k = 0; k < 4; k++) { counter(0, x0 + k * 10, z0, 'display_case', 0); counter(0, x0 + k * 10, z0 + 16, 'display_case', 2); }
      for (let k = 0; k < 3; k++) f.prop('hat_display', x0 + 5 + k * 10, y, z0 + 8, 0, {});
    }
    counter(0, cx - 30, 12, 'jewelry_case', 0); counter(0, cx + 30, 12, 'jewelry_case', 0);
    f.prop('cash_register', 40, y + 3.8, 24, 0, {}); f.prop('mirror_wall', 3, y + 4, 40, 1, {});
    clerkAt(0, 45, 27, 0, ['May I help you, madam? Coty, Elizabeth Arden, Tangee...', 'That shade is called "Fire and Ice". Very daring.']);
    clerkAt(0, W - 55, 27, 0, ['Gloves are on sale — kid leather, a dollar ninety-eight.', 'A hat for the Centennial? Every lady in town is in a hat today.']);
    for (let k = 0; k < 6; k++) browse(0, 26 + k * ((W - 52) / 5), 18 + (k % 2) * 22, k % 2 ? 2 : 0);
    b.spot('stand', cx + 30, y, 8, 2, { room: floorRooms[0], act: 'browse', tags: ['browse'] });
  }
  // 2: ladies' apparel — dress racks, mannequins, shoes, fabric
  {
    const i = 1, y = i * FH + 1;
    for (let k = 0; k < 6; k++) f.prop('dress_rack', 20 + k * 14, y, 20, k % 2, { tint: rng.pick(['#8a2a3a', '#2a4a6a', '#6a5a3a', '#c8a0b0', '#3a5a3a']) });
    for (let k = 0; k < 4; k++) f.prop('mannequin', W - 70 + k * 14, y, 14, 0, { tint: rng.pick(['#8a2a2a', '#2a3a5a', '#e0d0b0', '#5a3a5a']) });
    f.prop('shoe_display', W - 30, y, 34, 3, {}); f.prop('shoe_display', W - 30, y, 44, 3, {}); f.prop('fabric_bolts', 20, y, 44, 1, {}); f.prop('sewing_dummy', 26, y, 50, 0, {});
    f.prop('chair_upholstered_dining', W - 36, y, 38, 1, {}); f.prop('mirror_wall', W - 3, y + 4, 24, 3, {});
    counter(i, cx + 20, 46, 'counter_shop', 0); f.prop('cash_register', cx + 20, y + 3.8, 46, 0, {});
    clerkAt(i, cx + 20, 49, 0, ['The coats came in from New York on Tuesday.', 'Try the navy. It\'s you.']);
    clerkAt(i, W - 40, 30, 3, ['Six and a half? Let me see what we have in the back.']);
    for (let k = 0; k < 6; k++) browse(i, 22 + k * 16, 26 + (k % 3) * 8, k % 2 ? 2 : 0);
  }
  // 3: men's & boys'
  {
    const i = 2, y = i * FH + 1;
    for (let k = 0; k < 5; k++) f.prop('dress_rack', 24 + k * 16, y, 22, 0, { tint: rng.pick(['#2a2a30', '#3a3a4a', '#4a3a2a', '#5a5a60']) });
    f.prop('hat_display', W - 40, y, 18, 0, {}); f.prop('hat_display', W - 30, y, 18, 0, {}); f.prop('shoe_display', W - 20, y, 40, 3, {});
    f.prop('mannequin', cx, y, 12, 0, { tint: '#2a2a30' }); f.prop('mirror_wall', 3, y + 4, 30, 1, {}); f.prop('barber_chair', 12, y, 44, 1, { tint: '#5a3a2a' });
    counter(i, cx + 10, 44, 'counter_shop', 0);
    clerkAt(i, cx + 10, 47, 0, ['A worsted, thirty-nine fifty. Two pairs of trousers.', 'Fedora or a snap-brim? The snap-brim is very popular with the younger men.']);
    for (let k = 0; k < 5; k++) browse(i, 26 + k * 18, 30 + (k % 2) * 8, k % 2 ? 2 : 0);
  }
  // 4: toys & housewares — trains, dolls, televisions, ranges
  if (NF > 3) {
    const i = 3, y = i * FH + 1;
    for (let k = 0; k < 4; k++) f.prop('toy_display', 20 + k * 14, y, 20, 0, {});
    f.prop('toy_train', 30, y, 38, 0, {}); f.prop('rocking_horse', 44, y, 38, 1, {}); f.prop('dollhouse', 56, y, 38, 0, {}); f.prop('teddy_bear', 64, y + 3, 20, 0, {}); f.prop('wagon_red', 74, y, 36, 1, {}); f.prop('bicycle', 84, y, 36, 1, {});
    f.box(24, y - 1 + 1, 30, 20, 1, 10, MAT.wood_light); // train layout table top
    for (let k = 0; k < 3; k++) { f.prop('tv_console', W - 80 + k * 10, y, 14, 0, {}); }
    f.prop('radio_display', W - 40, y, 14, 0, {});
    for (let k = 0; k < 3; k++) f.prop(['stove', 'fridge', 'washing_machine'][k], W - 70 + k * 8, y, 40, 0, {});
    f.prop('shelf_goods', W - 20, y, 30, 3, {}); f.prop('shelf_goods', W - 20, y, 38, 3, {});
    clerkAt(i, 40, 30, 0, ['The Lionel\'s running, go ahead and watch it, son.', 'Lay-away for Christmas? A dollar down.']);
    clerkAt(i, W - 60, 26, 0, ['Twenty-one inches, and the picture\'s clear as a bell. Channel 5 from Boston.']);
    for (let k = 0; k < 6; k++) browse(i, 24 + k * 18, 28 + (k % 2) * 10, k % 2 ? 2 : 0);
    b.spot('stand', 32, y, 42, 2, { room: floorRooms[i], act: 'look', tags: ['browse', 'play'], label: 'Watching the toy trains at Harlow\'s' });
    read(b, 34, y + 3, 34, 'Lionel Layout', 'The Harlow\'s Christmas train — a Lionel No. 2026 locomotive and five cars, running on a figure-eight past a paper Union Station and a cotton-wool Juniper Hill.\n\nMr. Pruitt of the toy department sets it up on the first of September, "so the boys can start working on their fathers."');
  }
  // 5: furniture & the tea room
  if (NF > 4) {
    const i = 4, y = i * FH + 1;
    const tx0 = cx + 8;
    partitionZ(f, 2, stZ - 1, y, tx0 - 1, FH - 1, MAT.wallpaper_rose, [{ at: 30, w: 8, h: 11 }]);
    const tea = b.room('The Tea Room', tx0, y, 2, W - tx0 - 2, FH - 1, stZ - 3, { lightMode: 'always', lightColor: [1, 0.88, 0.7] });
    b.door(floorRooms[i], tea, tx0 - 1, y, 34, { axis: 'z', leaf: false, width: 8 });
    for (const [x, z] of [[20, 16], [40, 16], [60, 16]]) f.prop(rng.pick(['sofa', 'loveseat']), x, y, z, 0, { tint: rng.pick(['#6a7a5a', '#8a4a3a', '#5a6a8a', '#a88a5a']) });
    f.prop('bed_double', 24, y, 40, 0, { tint: '#d8c8b0' }); f.prop('dresser', 40, y, 44, 2, {}); f.prop('table_dining', 60, y, 40, 0, {}); f.prop('cabinet_china', 76, y, 46, 2, {}); f.prop('armchair', 80, y, 20, 3, { tint: '#6a4a3a' }); f.prop('lamp_floor', 86, y, 26, 0, {});
    clerkAt(i, 50, 30, 0, ['Solid maple, made in Vermont. It\'ll outlast us both.']);
    for (let k = 0; k < 4; k++) browse(i, 22 + k * 18, 28, k % 2 ? 1 : 3);
    const teaSeats = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const x = tx0 + 12 + c * ((W - tx0 - 24) / 2), z = 12 + r * 14;
      f.prop('table_round', x, y, z, 0, { tint: '#f4f0e6' }); f.prop('teapot_set', x, y + 3, z, 0, {});
      for (const [dx, dz, rr] of [[0, -3, 2], [0, 3, 0]]) { f.prop('chair_wood', x + dx, y, z + dz, rr, { tint: '#e8e0d0' }); teaSeats.push(b.spot('sit', x + dx, y, z + dz, rr, { room: tea, act: rng.pick(['eat', 'drink', 'talk_sit']), tags: ['eat_out', 'tea_room'], seat: 0.45, label: 'Tea at Harlow\'s' })); }
    }
    f.prop('pie_display', W - 8, y + 3.6, 8, 3, {}); f.prop('coffee_urn', W - 8, y + 3.6, 16, 3, {}); f.prop('counter_shop', W - 8, y, 12, 3, {});
    const tw = b.spot('stand', tx0 + 20, y, 20, 0, { room: tea, act: 'serve', tags: ['work'], lines: ['The Centennial Tea: sandwiches, scones and a slice of Mrs. Halloran\'s apple cake. Sixty-five cents.', 'Lemon or milk?'] });
    b.job('waitress', tw, { shift: ['11:00', '17:30'], outfit: 'waitress', sex: 'F', title: 'tea-room waitress' });
    read(b, W - 8, y + 5, 12, 'Tea Room Card', 'THE TEA ROOM AT HARLOW\'S\n\nChicken salad sandwich · 45¢\nWelsh rarebit · 55¢\nCinnamon toast · 20¢\nThe Centennial Tea (3 to 5) · 65¢\n\nThe tea room was opened in 1911 by Mrs. Silas Harlow "so that ladies might have somewhere to sit down in this town that is not a church."');
    // Mr. Harlow's office in the back (executive offices)
    const ex = b.roomAtPoint(...b.m(W - 20, y + 0.5, BD - 8));
    if (ex) { const sp = officeDesk(b, ex, W - 24, y, BD - 12, 0, { desk: 'desk_wood', act: 'write' }); b.job('store manager', sp, { shift: ['9:00', '17:30'], title: 'floor manager' }); f.prop('portrait', W - 3, y + 7, BD - 12, 3, {});
      read(b, W - 4, y + 5, BD - 14, 'Photograph', 'A brown photograph, 1878: a young man with a beard and an apron in front of a shop one window wide. Painted on the window: S. HARLOW · DRY GOODS · NOTIONS.\n\nPencilled on the mount: "Opening day. Took in $3.40. Kept the first dime." The dime is taped to the corner of the frame.'); }
  }
  // six clerks, with the stock boy and the floor walker
  clerks.slice(0, 6).forEach((s, k) => b.job('clerk', s, { shift: ['9:15', '17:45'], title: 'sales clerk', sex: k % 3 === 2 ? 'M' : 'F' }));
  clerks.slice(6).forEach((s) => b.job('clerk', s, { shift: ['9:15', '17:45'], title: 'sales clerk' }));
  b.job('floorwalker', browse(0, cx, 30, 0), { shift: ['9:15', '17:45'], title: 'floorwalker', lines: ['Good morning, madam. Gloves are to your left.'] });
  // entrances: the revolving door (main), and a side door on each street side
  b.entrance(floorRooms[0], cx, 1, 0, { outZ: -8, outY: 0, leaf: false, main: true });
  if (sides.left) { f.carve(0, 1, 30, 2, 9, 4); sideEntrance(b, floorRooms[0], 0, 1, 32, -1, { leaf: 'door_glass', tint: '#6a4a2a' }); }
  if (sides.right) { f.carve(W - 2, 1, 30, 2, 9, 4); sideEntrance(b, floorRooms[0], W - 1, 1, 32, 1, { leaf: 'door_glass', tint: '#6a4a2a' }); }
  roofClutter(b, 6, 30, W - 6, BD - 4, H + 1, rng, { towerAt: [W * 0.8, BD * 0.7], towerScale: 1.4, vents: 4, skylights: 2 });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// =====================================================================================================
// THE RIALTO (1927) — marquee, blade sign, lobby, a dark auditorium with a glowing screen
// =====================================================================================================
function buildTheater(ctx, lot, spec) {
  const rng = ctx.rng.fork('rialto' + lot.x + ',' + lot.z);
  const name = spec.name || 'The Rialto';
  const b = new Building(ctx, { name, kind: 'theater', lot, address: lot.address, established: spec.est || 1927, hours: [T(12, 30), T(23, 30)],
    lore: 'Opened December 1927 with Douglas Fairbanks in "The Gaucho" and a Wurlitzer organ. Talkies came in 1929. Today: "Roman Holiday" at 2, "Shane" at 7:30.' });
  const f = b.f, W = lot.w, D = lot.d, cx = Math.round(W / 2);
  const BD = D - 2, H = 48;
  const sides = streetSides(lot);
  const TC = MAT.terracotta, CR = MAT.art_deco_cream, IN = MAT.velvet_red;
  f.box(0, -1, 0, W, 1, D, MAT.sidewalk);
  shell(f, 0, 0, 0, W, H, BD, MAT.brick_brown, MAT.plaster_pink);
  // facade: cream terracotta front with a big arched window and a stepped parapet
  f.box(0, 0, 0, W, H + 8, 2, CR);
  for (let k = 0; k < 4; k++) f.box(cx - 30 + k * 6, H + 8 + k * 3, 0, 60 - k * 12, 3, 2, CR);
  f.box(cx - 12, H + 20, 0, 24, 2, 2, MAT.art_deco_gold);
  for (const x of [4, W - 8]) { f.box(x, 0, -1, 4, H + 8, 1, TC); f.box(x, H + 8, -1, 4, 4, 1, MAT.art_deco_gold); }
  f.archCarve(cx - 14, 26, 0, 28, 26, 2); f.archCarve(cx - 14, 26, 1, 28, 26, 1, MAT.glass_stained_gold);
  for (let x = cx - 10; x < cx + 12; x += 6) f.box(x, 26, 0, 1, 18, 1, MAT.art_deco_gold);
  f.box(cx - 15, 25, -1, 30, 1, 1, MAT.art_deco_gold);
  f.text('RIALTO', cx, H - 2, -1, MAT.sign_red, { align: 'center', font: 'big' });
  // poster cases flanking the doors
  for (const x of [12, W - 22]) { f.box(x - 1, 2, -1, 12, 12, 1, MAT.art_deco_gold); f.box(x, 3, -1, 10, 10, 1, MAT.glass); }
  f.prop('movie_poster', 17, 3, -0.6, 0, { tint: '#c86a3a' }); f.prop('movie_poster', W - 17, 3, -0.6, 0, { tint: '#3a6ac8' });
  read(b, 17, 6, -1.5, 'Poster — Roman Holiday', 'PARAMOUNT PRESENTS\nGREGORY PECK · AUDREY HEPBURN\nin William Wyler\'s\nROMAN HOLIDAY\nwith Eddie Albert\n\nMatinee today 2:00 · Adults 35¢ · Children 12¢\n\n"Introducing Audrey Hepburn" — and after this, nobody will need to.');
  read(b, W - 17, 6, -1.5, 'Poster — Shane', 'GEORGE STEVENS\' production of\nSHANE\nALAN LADD · JEAN ARTHUR · VAN HEFLIN\nwith Brandon De Wilde · Jack Palance\nColor by Technicolor\n\nTonight 7:30 · Adults 50¢\n\nCOMING OCT. 8: "THE ROBE" — in CinemaScope! (The new screen is on order.)');
  // the marquee
  const MZ = -16, MX0 = cx - 38, MX1 = cx + 38, MY = 13, MH = 15;
  f.box(MX0, MY, MZ, MX1 - MX0, MH, -MZ, MAT.trim_dark);
  f.box(MX0 + 1, MY - 1, MZ + 1, MX1 - MX0 - 2, 1, -MZ - 1, MAT.art_deco_gold);
  f.box(MX0 - 1, MY, MZ - 1, MX1 - MX0 + 2, 1, 1, MAT.marquee_bulbs); f.box(MX0 - 1, MY + MH - 1, MZ - 1, MX1 - MX0 + 2, 1, 1, MAT.marquee_bulbs);
  f.box(MX0 - 1, MY, MZ - 1, 1, MH, 1, MAT.marquee_bulbs); f.box(MX1, MY, MZ - 1, 1, MH, 1, MAT.marquee_bulbs);
  f.box(MX0 + 2, MY + 2, MZ - 1, MX1 - MX0 - 4, 11, 1, MAT.sign_white);
  f.text('ROMAN HOLIDAY 2PM', cx, MY + 8, MZ - 2, MAT.trim_black, { align: 'center', font: 'small' });
  f.text('SHANE 7:30', cx, MY + 2, MZ - 2, MAT.sign_red, { align: 'center', font: 'small' });
  f.box(MX0, MY + MH, MZ, MX1 - MX0, 1, -MZ, MAT.marquee_bulbs);
  f.box(MX0, MY + MH + 1, MZ + 2, MX1 - MX0, 3, 1, MAT.art_deco_gold);
  for (let x = MX0 + 3; x < MX1 - 2; x += 4) for (let z = MZ + 2; z < -1; z += 4) f.box(x, MY - 1, z, 1, 1, 1, MAT.bulb_warm);
  // marquee ends: RIALTO on each side
  {
    const L = f.faceFrame('left'), R = f.faceFrame('right');
    L.box(LZ(f, -1) , MY + 2, LX(f, MX0) - 1, 14, 11, 1, MAT.sign_white);
    L.text('RIALTO', LZ(f, MZ / 2), MY + 5, LX(f, MX0) - 2, MAT.sign_red, { align: 'center', font: 'small' });
    R.box(RZ(f, MZ + 1), MY + 2, RX(f, MX1 - 1) - 1, 14, 11, 1, MAT.sign_white);
    R.text('RIALTO', RZ(f, MZ / 2), MY + 5, RX(f, MX1 - 1) - 2, MAT.sign_red, { align: 'center', font: 'small' });
    // vertical blade sign above the marquee
    const bx = cx - 1;
    f.box(bx, MY + MH + 4, -12, 2, 50, 11, MAT.sign_navy);
    f.box(bx, MY + MH + 3, -13, 2, 1, 13, MAT.marquee_bulbs); f.box(bx, MY + MH + 54, -13, 2, 1, 13, MAT.marquee_bulbs); f.box(bx, MY + MH + 3, -13, 2, 52, 1, MAT.marquee_bulbs);
    f.box(bx, MY + MH + 54, -10, 2, 6, 6, MAT.art_deco_gold);
    vtext(L, 'RIALTO', LZ(f, -6.5), MY + MH + 53, LX(f, bx) - 1, MAT.neon_red, { gap: 1 });
    vtext(R, 'RIALTO', RZ(f, -6.5), MY + MH + 53, RX(f, bx + 1) - 1, MAT.neon_red, { gap: 1 });
    b.light(cx, MY + MH + 30, -8, { color: [1, 0.3, 0.25], radius: 12, mode: 'night' });
    b.light(cx, MY - 2, MZ / 2, { color: [1, 0.85, 0.55], radius: 11, mode: 'night' });
  }
  // doors & the ticket booth under the marquee
  for (const dx of [-12, -6, 2, 8]) { f.carve(cx + dx, 1, 0, 4, 9, 2); f.box(cx + dx - 1, 1, -1, 1, 10, 1, MAT.art_deco_gold); }
  f.box(cx - 13, 10, -1, 26, 1, 1, MAT.art_deco_gold);
  f.box(cx - 20, 0, -12, 40, 1, 12, MAT.floor_terrazzo);
  f.prop('ticket_booth', cx, 1, -6, 0, {});
  // ---- rooms
  const LZ1 = 24;                                   // lobby depth
  const lobby = b.room('Lobby', 2, 1, 2, W - 4, 16, LZ1 - 2, { lightMode: 'always', lightColor: [1, 0.78, 0.5], lightPower: 1.1 });
  f.box(2, 0, 2, W - 4, 1, LZ1 - 2, MAT.carpet_red);
  f.box(2, 17, 2, W - 4, 1, LZ1 - 2, MAT.ceiling_tin);
  const booth = b.room('Ticket Booth', cx - 3, 1, -9, 6, 9, 6, { lightMode: 'always', lightColor: [1, 0.85, 0.6] });
  const cashier = b.spot('sit', cx, 1, -5, 0, { room: booth, act: 'counter', tags: ['work'], seat: 0.6, lines: ['Two for "Roman Holiday"? That\'s seventy cents.', 'Children twelve cents, under six free on a lap.', '"Shane" at seven-thirty. It\'s a western, but the ladies like it too.'] });
  b.job('cashier', cashier, { shift: ['13:00', '21:30'], title: 'ticket girl', sex: 'F' });
  f.carve(cx - 1, 1, -3, 2, 8, 1);
  for (const dx of [-10, 4]) b.entrance(lobby, cx + dx + 2, 1, 0, { outZ: -18, outY: 0, leaf: 'door_glass', tint: '#c9a24a', main: dx === -10 });
  b.door(booth, lobby, cx - 4, 1, 0, { leaf: false });
  // concession: the popcorn machine, candy counter, posters, a velvet rope
  f.prop('popcorn_machine', W - 14, 1, LZ1 - 3, 0, {});
  for (let x = W - 40; x < W - 18; x += 4) f.prop('display_case', x + 2, 1, LZ1 - 5, 0, {});
  f.prop('candy_jars', W - 30, 4, LZ1 - 5, 0, {}); f.prop('cash_register', W - 24, 4, LZ1 - 5, 0, {});
  const conc = b.spot('stand', W - 28, 1, LZ1 - 2.5, 0, { room: lobby, act: 'counter', tags: ['clerk'], lines: ['Popcorn\'s a dime. Butter\'s free.', 'Jujubes, Milk Duds, Good & Plenty — a nickel each.'] });
  b.job('concession', conc, { shift: ['13:00', '21:30'], title: 'candy-counter girl', sex: 'F' });
  for (let k = 0; k < 3; k++) b.spot('stand', W - 34 + k * 4, 1, LZ1 - 9, 2, { room: lobby, act: 'wait', tags: ['shop', 'customer'] });
  for (const [x, z, r] of [[3, 8, 1], [3, 16, 1], [W - 3, 8, 3]]) f.prop('movie_poster', x, 5, z, r, { tint: rng.pick(['#c83a3a', '#3a6ac8', '#e0b040', '#3a8a5a']) });
  read(b, 3.5, 7, 16, 'Poster — Coming Attractions', 'COMING SOON TO THE RIALTO\n\nFROM HERE TO ETERNITY — Burt Lancaster, Montgomery Clift, Deborah Kerr, Frank Sinatra\nTHE ROBE — the first picture in CinemaScope! (Oct. 8)\nHOUSE OF WAX — in 3-Dimension (glasses provided)\n\nSaturday Kiddie Matinee: Flash Gordon serial, Chapter 7, plus cartoons. 10 a.m., twelve cents.');
  f.prop('velvet_rope', cx - 8, 1, LZ1 - 4, 0, {}); f.prop('velvet_rope', cx + 8, 1, LZ1 - 4, 0, {});
  f.prop('chandelier', cx, 11, 12, 0, {});
  read(b, cx - 30, 4, 3, 'Bronze Plaque', 'THE RIALTO\nOpened December 23, 1927, with Douglas Fairbanks in "The Gaucho", accompanied by Miss Viola Pratt at the Mighty Wurlitzer.\n\nThe first talking picture shown in Juniper Bay, "The Broadway Melody", played here for three weeks in 1929. Miss Pratt, who had lost her job, sat in the front row every night and applauded the organ parts.\n\nThe Wurlitzer is still here. Mr. Pruitt plays it on Christmas Eve.');
  const usher = b.spot('stand', cx, 1, LZ1 - 2, 2, { room: lobby, act: 'stand', tags: ['work'], lines: ['Tickets, please. Balcony\'s closed today, folks — down front is best.', 'No talking during the picture.'] });
  b.job('usher', usher, { shift: ['13:30', '22:00'], title: 'usher', outfit: 'bellhop' });
  // ---- the auditorium
  const A0 = LZ1 + 1, SZ = BD - 16;                 // auditorium from A0; stage from SZ
  partitionX(f, 2, W - 2, 1, LZ1, 16, MAT.wood_panel, [{ at: 14, w: 6, h: 10 }, { at: W - 20, w: 6, h: 10 }]);
  const aud = b.room('Auditorium', 2, 1, A0, W - 4, H - 4, BD - 2 - A0, { lightMode: 'never', ambient: 0.02, kind: 'auditorium', nav: [cx, A0 + 6] });
  f.box(2, 0, A0, W - 4, 1, BD - 2 - A0, MAT.carpet_red);
  f.walls(2, 1, A0, W - 4, H - 4, BD - 2 - A0, MAT.plaster_pink, 1);
  b.door(lobby, aud, 17, 1, LZ1, { leaf: 'door_wood', tint: '#6a1a1a', width: 6 });
  b.door(lobby, aud, W - 17, 1, LZ1, { leaf: 'door_wood', tint: '#6a1a1a', width: 6 });
  // wall panels, pilasters, organ grilles, sconces glowing in the dark
  for (const x of [2, W - 3]) {
    for (let z = A0 + 6; z < SZ; z += 12) { f.box(x, 1, z, 1, H - 8, 2, MAT.art_deco_gold); f.box(x + (x < cx ? 1 : -1), 12, z, 1, 1, 2, MAT.bulb_always); }
    f.box(x, 18, SZ - 14, 1, 14, 10, MAT.art_deco_gold); for (let yy = 19; yy < 32; yy += 2) f.box(x + (x < cx ? 1 : -1), yy, SZ - 13, 1, 1, 8, MAT.trim_dark);
  }
  f.box(2, H - 5, A0, W - 4, 1, BD - 2 - A0, MAT.ceiling_tin);
  for (let z = A0 + 8; z < BD - 4; z += 10) f.box(2, H - 6, z, W - 4, 1, 1, MAT.art_deco_gold);
  // proscenium, curtains, stage, the screen
  f.box(2, 1, SZ, W - 4, H - 5, 2, MAT.plaster_pink);
  f.archCarve(cx - 32, 5, SZ, 64, 34, 2);
  f.box(cx - 34, 4, SZ - 1, 2, 30, 1, MAT.art_deco_gold); f.box(cx + 32, 4, SZ - 1, 2, 30, 1, MAT.art_deco_gold);
  f.box(2, 0, SZ - 6, W - 4, 4, BD - 2 - SZ + 6, MAT.stage_wood);
  f.box(cx - 34, 1, SZ - 6, 68, 3, 1, MAT.art_deco_gold);
  f.box(cx - 30, 5, SZ + 1, 6, 30, 2, IN); f.box(cx + 24, 5, SZ + 1, 6, 30, 2, IN);
  f.box(cx - 30, 30, SZ + 1, 60, 6, 2, IN);
  f.box(cx - 26, 8, BD - 3, 52, 22, 1, MAT.movie_screen);
  f.box(cx - 27, 7, BD - 3, 54, 1, 1, MAT.trim_black); f.box(cx - 27, 30, BD - 3, 54, 1, 1, MAT.trim_black);
  f.prop('organ_console', 14, 4, SZ - 3, 1, {});
  read(b, 14, 6, SZ - 4, 'The Mighty Wurlitzer', 'Rudolph Wurlitzer Co., North Tonawanda, N.Y. — Opus 1742, Style 190, two manuals, eight ranks.\n\nIt can do a cathedral organ, a calliope, a steam whistle, a thunderstorm, horses\' hooves, a doorbell and a Model T horn. In 1927 it did all of them during "The Gaucho".');
  // raked floor and seats: rows facing the screen
  const rows = Math.max(4, Math.min(8, Math.floor((SZ - 8 - (A0 + 6)) / 4)));
  const seatXs = [];
  for (const [a, c] of [[8, cx - 22], [cx - 16, cx + 16], [cx + 22, W - 8]]) { const n = Math.max(1, Math.floor((c - a) / 9.4)); for (let k = 0; k < n; k++) seatXs.push(a + 4.7 + k * ((c - a - 9.4) / Math.max(1, n - 1))); }
  let seatCount = 0;
  for (let r = 0; r < rows; r++) {
    const z = SZ - 10 - r * 4, hr = Math.floor(r / 2);
    if (hr > 0) f.box(4, 1, z - 2, W - 8, hr, 4, MAT.carpet_red);
    for (const x of seatXs) {
      f.prop('theater_seats', x, 1 + hr, z, 2, { tint: '#8a1f24' });
      for (let s = 0; s < 4; s++) { b.spot('sit', x - 3.3 + s * 2.2, 1 + hr, z, 2, { room: aud, act: 'watch', tags: ['theater'], seat: 0.45, label: 'At the pictures' }); seatCount++; }
    }
    b.playerSeat(seatXs[Math.floor(seatXs.length / 2)], 1 + hr, z, 2);
  }
  // aisle lights
  for (const x of [cx - 19, cx + 19]) for (let z = A0 + 4; z < SZ - 8; z += 6) f.box(x, 1, z, 1, 1, 1, MAT.bulb_always);
  const nav0 = b.navPoint(aud, cx - 19, 1, SZ - 12), nav1 = b.navPoint(aud, cx + 19, 1, SZ - 12);
  void nav0; void nav1;
  // exit to Main Street near the stage
  if (sides.left || sides.right) {
    const ex = sides.left ? 1 : W - 2;
    f.carve(sides.left ? 0 : W - 2, 1, SZ - 16, 2, 9, 4);
    sideEntrance(b, aud, sides.left ? 0 : W - 1, 1, SZ - 14, sides.left ? -1 : 1, { leaf: 'door_wood', tint: '#4a2a1a' });
    f.box(ex, 10, SZ - 16, 1, 1, 4, MAT.neon_red);
  }
  // ---- projection booth over the lobby, up a narrow stair
  const PB = { x0: cx - 14, x1: cx + 14, z0: 4, z1: LZ1 };
  f.box(PB.x0 - 1, 17, PB.z0 - 1, PB.x1 - PB.x0 + 2, 1, PB.z1 - PB.z0 + 2, MAT.floor_concrete);
  f.walls(PB.x0 - 1, 18, PB.z0 - 1, PB.x1 - PB.x0 + 2, 12, PB.z1 - PB.z0 + 2, MAT.plaster_gray, 1);
  f.box(PB.x0 - 1, 30, PB.z0 - 1, PB.x1 - PB.x0 + 2, 1, PB.z1 - PB.z0 + 2, MAT.concrete);
  const pbooth = b.room('Projection Booth', PB.x0, 18, PB.z0, PB.x1 - PB.x0, 11, PB.z1 - PB.z0, { lightMode: 'auto', lightColor: [0.9, 0.9, 1] });
  f.carve(cx - 6, 23, PB.z1, 3, 3, 2); f.carve(cx + 3, 23, PB.z1, 3, 3, 2);
  f.carve(PB.x0 + 1, 17, LZ1, 1, 1, 1);
  f.prop('projector', cx - 5, 18, PB.z1 - 3, 2, {}); f.prop('projector', cx + 4, 18, PB.z1 - 3, 2, {});
  f.prop('filing_cabinet', PB.x0 + 2, 18, PB.z0 + 2, 1, {}); f.prop('stool_tall', cx, 18, PB.z1 - 6, 2, {});
  const proj = b.spot('stand', cx - 1, 18, PB.z1 - 6, 2, { room: pbooth, act: 'wrench', tags: ['work'], lines: ['Reel two, changeover in ten seconds... and... there.', 'Carbon arcs burn hot. Don\'t touch that.'] });
  b.job('projectionist', proj, { shift: ['13:15', '23:15'], title: 'projectionist' });
  read(b, PB.x0 + 3, 21, PB.z0 + 2, 'Projectionist\'s Log', 'SAT 9/26/53\n\n2:00  ROMAN HOLIDAY — 12 reels. Changeover marks OK. Reel 7 splice at 440 ft — watch it.\n       Newsreel: Korea armistice, the Queen\'s Coronation (repeat), Rocky Marciano.\n7:30  SHANE — 12 reels, Technicolor. Mind the focus in reel 3.\n\nNote to self: Mr. Pruitt wants the organ lift greased before Christmas.');
  const st = stairs(f, W - 10, 1, 4, '+z', 16, { w: 4, run: 1, mat: MAT.wood_dark, rail: false });
  void st;
  f.carve(W - 10, 17, 4, 4, 1, 16);
  f.carve(PB.x1, 18, LZ1 - 6, 1, 9, 4);
  f.box(PB.x1 + 1, 17, 4, W - 11 - PB.x1, 1, LZ1 - 4, MAT.floor_concrete); f.carve(W - 10, 17, 4, 4, 1, 16);
  const landing = b.room('Booth Stair', PB.x1 + 1, 18, 4, W - 11 - PB.x1 + 4, 11, LZ1 - 4, { lightMode: 'auto' });
  b.stairs(lobby, [W - 8, 1, 3], landing, [W - 8, 17, 21]);
  b.door(landing, pbooth, PB.x1, 18, LZ1 - 4, { axis: 'z', leaf: 'door_wood', tint: '#4a3a2a' });
  // roof
  f.box(0, H, 2, W, 1, BD - 2, MAT.roof_tar);
  roofClutter(b, 6, 30, W - 6, BD - 4, H + 1, rng, { tower: false, vents: 3, skylights: 0, antenna: false });
  void seatCount;
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// =====================================================================================================
// THE JUNIPER BAY COURIER (est. 1866) — counter, pressroom, newsroom, editor's office, composing room
// =====================================================================================================
function buildNewspaper(ctx, lot, spec) {
  const rng = ctx.rng.fork('courier' + lot.x + ',' + lot.z);
  const name = spec.name || 'The Juniper Bay Courier';
  const b = new Building(ctx, { name, kind: 'newspaper', lot, address: lot.address, established: spec.est || 1866, hours: [T(8), T(24)],
    lore: 'Founded 1866 by Josiah Lowell with a hand press in a sail loft; in this building since 1891. Editor Ada Lowell. The Sunday Centennial edition runs forty-eight pages — "CENTURY BY THE SEA".' });
  const f = b.f, W = lot.w, D = lot.d, FH = 16, NF = 3;
  const BD = D - 6, H = NF * FH, cx = Math.round(W / 2);
  const sides = streetSides(lot);
  const BR = MAT.brick_red, TR = MAT.sandstone, IN = MAT.plaster_cream;
  f.box(0, -1, 0, W, 1, D, MAT.sidewalk);
  f.box(0, -1, BD, W, 1, D - BD, MAT.concrete);
  shell(f, 0, 0, 0, W, H, BD, BR, IN);
  for (let i = 0; i < NF; i++) slab(f, 1, i * FH, 1, W - 2, BD - 2, i === 0 ? MAT.floor_concrete : MAT.floor_pine);
  f.box(0, H, 0, W, 1, BD, MAT.roof_tar);
  f.walls(0, H + 1, 0, W, 4, BD, BR, 1);
  const fc = facesOf(f, 0, 0, W, BD);
  for (const side of ['front', 'left', 'right', 'back']) {
    if ((side === 'left' || side === 'right') && !sides[side]) continue;
    const face = fc[side];
    const cols = colsIn(face.a, face.b, 5, 11, 5);
    gridFacade(face, cols, 5, rowsFor(1, NF, FH, 4, 9), { wall: BR, inner: IN, sill: TR, lintels: TR, lintelWide: true });
    cornice(face.F, face.a, H - 1, face.b - face.a, TR, { z: face.zf, brackets: 5 });
    if (side !== 'front') for (const x of colsIn(face.a + 4, face.b - 4, 8, 16, 2)) { face.F.archCarve(x, 3, face.zf, 8, 11, 2); face.F.archCarve(x, 3, face.zf + 1, 8, 11, 1, MAT.glass); }
  }
  // ground floor front: the counter's door and big arched windows onto the pressroom
  const CX1 = 44;                                      // counter office width
  for (const x of colsIn(CX1 + 4, W - 4, 12, 18, 2)) { f.archCarve(x, 2, 0, 12, 13, 2); f.archCarve(x, 2, 1, 12, 13, 1, MAT.glass); f.box(x - 1, 1, -1, 14, 1, 1, TR); }
  f.carve(8, 1, 0, 4, 10, 2); f.box(7, 1, -1, 1, 11, 1, TR); f.box(12, 1, -1, 1, 11, 1, TR); f.box(7, 11, -1, 6, 1, 1, TR);
  f.carve(18, 3, 0, 20, 8, 2); f.box(18, 3, 0, 20, 8, 1, MAT.glass_shop);
  // the name across the front, EST. 1866, and the bulletin board
  f.box(2, FH - 3, -1, W - 4, 9, 1, MAT.sign_black);
  f.box(2, FH - 4, -1, W - 4, 1, 1, MAT.art_deco_gold); f.box(2, FH + 6, -1, W - 4, 1, 1, MAT.art_deco_gold);
  const nm = 'THE JUNIPER BAY COURIER';
  if (f.textWidth(nm, 1, 'big') < W - 8) f.text(nm, cx, FH - 2, -2, MAT.art_deco_gold, { align: 'center', font: 'big' });
  else f.text(nm, cx, FH - 1, -2, MAT.art_deco_gold, { align: 'center', font: 'small' });
  f.text('EST. 1866', cx, H - 6, -1, MAT.trim_cream, { align: 'center', font: 'small' });
  f.box(20, 12, -1, 16, 1, 1, TR);
  f.box(40, 3, -1, 1, 1, 1, TR);
  read(b, 26, 4, -1, 'Bulletin Board in the Window', 'COURIER BULLETINS — posted as they come in\n\n10:40 a.m. — Harbor Days fair opens. Record crowd, says Chief Duffy.\n11:30 a.m. — Mrs. Hatch\'s cat rescued (again) from the maple on Maple St. Engine Co. No. 1: 1, Admiral: 3 lifetime.\n1:05 p.m. — Red Sox trail Yankees 4–1, 5th inning.\n\nSUNDAY: Special 48-page CENTENNIAL EDITION — "CENTURY BY THE SEA." Order extra copies at the counter, 15¢.');
  f.prop('newspaper_box', 14, 0, -3, 0, {}); f.prop('newspaper_bundles', 40, 0, -2, 0, {});
  cornerStone(b, f, W - 12, 1, 0, 1891, 'THE JUNIPER BAY COURIER\nFounded 1866 · This building 1891\n\n"The Truth, Plainly Printed."\n\nLaid by Josiah Lowell, publisher, and Ada Lowell, aged 1 week, "who is expected to take over the business in due course." (She did, in 1946.)');
  // truck at the curb
  f.prop('truck_delivery', W - 18, 0, -20, 1, { tint: '#2a4a3a', cat: 'far' });

  // ---- ground floor: the counter, the pressroom, the mailroom
  const PZ0 = 28;
  const counterR = b.room('Front Counter', 2, 1, 2, CX1 - 2, FH - 1, PZ0 - 3, { lightMode: 'always', lightColor: [1, 0.9, 0.72] });
  const press = b.room('Pressroom', 2, 1, PZ0, W - 4, FH - 1, BD - 2 - PZ0, { lightMode: 'always', lightColor: [0.95, 0.95, 0.88], kind: 'industrial' });
  const lobbyR = b.room('Front Hall', CX1 + 1, 1, 2, W - CX1 - 3, FH - 1, PZ0 - 3, { lightMode: 'auto' });
  partitionZ(f, 2, PZ0 - 1, 1, CX1, FH - 1, MAT.wood_panel, [{ at: 12, w: 4 }]);
  partitionX(f, 2, W - 2, 1, PZ0 - 1, FH - 1, IN, [{ at: 20, w: 4 }, { at: W - 30, w: 6, h: 12 }]);
  f.box(40, 5, PZ0 - 1, W - 80, 6, 1, MAT.glass);           // viewing window into the pressroom
  b.entrance(counterR, 10, 1, 0, { outZ: -6, outY: 0, leaf: 'door_glass', tint: '#2a2a2a', main: true });
  b.door(counterR, lobbyR, CX1, 1, 14, { axis: 'z', leaf: 'door_wood' });
  b.door(counterR, press, 22, 1, PZ0 - 1, { leaf: 'door_wood', tint: '#4a4a4a' });
  b.door(lobbyR, press, W - 27, 1, PZ0 - 1, { leaf: false, width: 6 });
  const cc = counterRun(b, counterR, 4, CX1 - 4, 1, 14, { rot: 0, type: 'counter_shop' });
  b.job('counter clerk', cc.clerk, { shift: ['8:30', '17:00'], title: 'classified-ads clerk', sex: 'F', lines: ['Classified ads are three cents a word, ten-word minimum.', 'Sunday Centennial edition? Fifteen cents, and you\'d better order two.'] });
  f.prop('newspaper_pile', 8, 4, 14, 0, {}); f.prop('clock_wall', CX1 / 2, 10, 2.6, 2, {});
  readH(b, 4, 6, 20, 'Framed Front Page, 1902', '<div class="plaque"><h1>The Juniper Bay Courier</h1></div><p class="typed" style="text-align:center"><b>Thursday, June 12, 1902 · Extra</b><br><br><b style="font-size:1.3em">MARKET STREET IN ASHES</b><br><i>Fire Starts in Beal\'s Livery at Four O\'Clock — Three Blocks Lost — Not One Life Taken</i><br><br>"By the grace of God and the Harbor Street bucket line, every soul in Juniper Bay slept under a roof last night, if not their own..."<br><br>(Printed on a borrowed press in Gloucester. The Courier\'s own building, on Mill Street, was spared by a change in the wind.)</p>');
  // the pressroom: two big presses, paper rolls, bundles, the press crew
  const pcx = W / 2, pcz = (PZ0 + BD) / 2;
  f.prop('printing_press', pcx - 16, 1, pcz, 0, {}); f.prop('printing_press', pcx + 16, 1, pcz, 0, {});
  f.box(pcx - 30, 0, pcz - 8, 60, 1, 16, MAT.rubber_mat);
  for (let k = 0; k < 5; k++) f.prop('paper_rolls', 8 + k * 6, 1, BD - 6, 0, {});
  for (let k = 0; k < 4; k++) f.prop('newspaper_bundles', W - 10, 1, PZ0 + 6 + k * 5, 3, {});
  f.prop('tools_wall', 3, 4, pcz, 1, {}); f.prop('oil_drum', 6, 1, PZ0 + 4, 0, {}); f.prop('oil_drum', 9, 1, PZ0 + 4, 0, {});
  const pressSpots = [];
  for (const [dx, dz, r] of [[-16, -7, 2], [-16, 7, 0], [16, -7, 2], [16, 7, 0], [-4, 0, 1], [4, 0, 3]]) pressSpots.push(b.spot('stand', pcx + dx, 1, pcz + dz, r, { room: press, act: dx % 16 === 0 && dx !== 0 ? 'wrench' : 'counter', tags: ['press', 'work'], label: 'Running the presses', lines: ['Mind your sleeves near the rollers!', 'Forty-eight pages. She\'ll run till two in the morning.'] }));
  b.job('pressman', [pressSpots[0], pressSpots[4]], { shift: ['14:00', '23:59'], title: 'pressman', outfit: 'mechanic', sex: 'M' });
  b.job('pressman', [pressSpots[3], pressSpots[5]], { shift: ['14:00', '23:59'], title: 'pressman', outfit: 'mechanic', sex: 'M' });
  const mail = b.spot('stand', W - 14, 1, PZ0 + 14, 1, { room: press, act: 'carry', tags: ['work'], held: 'newspaper' });
  b.job('mailroom', mail, { shift: ['15:00', '23:59'], title: 'mailroom hand', age: [16, 30] });
  read(b, pcx, 5, pcz - 9, 'Press Plate', 'R. HOE & CO., NEW YORK — ROTARY PERFECTING PRESS, 1924\nPrints 24,000 eight-page papers an hour, folded.\n\nThe old Washington hand press that printed the first Courier, on April 2, 1866 — one sheet, both sides, 300 copies — stands in the front hall.');
  // loading door at the back
  f.carve(W - 26, 1, BD - 2, 10, 11, 2);
  f.box(W - 26, 1, BD - 1, 10, 11, 1, MAT.wood_gray);
  b.door(press, null, W - 21, 1, BD - 1, { leaf: false, width: 8 });
  linkToSidewalk(ctx, b.navPoint(press, W - 21, 0, BD + 4), 40);
  // front hall: the 1866 hand press
  f.prop('printing_press', CX1 + 20, 1, 12, 0, { scale: 0.6 });
  read(b, CX1 + 14, 4, 10, 'The Washington Hand Press', 'THE FIRST PRESS OF THE JUNIPER BAY COURIER\nR. Hoe & Co., 1851 — bought second-hand in Salem for $140.\n\nJosiah Lowell printed Vol. I, No. 1 on it on April 2, 1866, in a sail loft on Whitcomb\'s wharf: one sheet, 300 copies, "and sold 212 of them, which is the population of this town in 1853 and, I choose to believe, not a coincidence."');

  // ---- upper floors: newsroom & editor (2), composing room & morgue (3)
  const stX = W - 14, stZ = BD - 2 - (FH + 8);
  const news = b.room('Newsroom', 2, FH + 1, 2, W - 4, FH - 1, stZ - 3, { lightMode: 'always', lightColor: [1, 0.95, 0.85] });
  const comp = b.room('Composing Room', 2, 2 * FH + 1, 2, W - 4, FH - 1, stZ - 3, { lightMode: 'always', lightColor: [1, 0.95, 0.85] });
  const wire = b.room('Wire Room', 2, FH + 1, stZ, stX - 4, FH - 1, BD - 2 - stZ, { lightMode: 'auto' });
  const morgue = b.room('The Morgue (Archives)', 2, 2 * FH + 1, stZ, stX - 4, FH - 1, BD - 2 - stZ, { lightMode: 'auto' });
  for (const [y, r1, r2] of [[FH + 1, news, wire], [2 * FH + 1, comp, morgue]]) {
    partitionX(f, 2, stX - 1, y, stZ - 1, FH - 1, IN, [{ at: 12, w: 4 }]);
    b.door(r1, r2, 14, y, stZ - 1, { leaf: 'door_wood' });
  }
  // newsroom desks
  const reporters = [];
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
    const s0 = officeDesk(b, news, 12 + k * 14, FH + 1, 26 + r * 12, 0, { lamp: k % 2 === 0, act: 'type', tags: ['work', 'newsroom'] });
    reporters.push(s0);
  }
  b.job('reporter', reporters[0], { shift: ['10:00', '19:00'], title: 'reporter', lines: ['I\'ve got the cat story. Front page? No? Page three.', 'Mayor\'s speech is eleven pages. We\'re running six.'] });
  b.job('reporter', [reporters[5], reporters[2]], { shift: ['12:00', '22:00'], title: 'reporter', lines: ['I\'m covering the fireworks, then the presses. Then sleep, maybe.'] });
  b.job('copy editor', reporters[3], { shift: ['14:00', '23:30'], title: 'copy editor' });
  f.prop('newspaper_pile', 30, FH + 4, 38, 0, {}); f.prop('coat_rack', 4, FH + 1, 4, 0, {}); f.prop('office_water_cooler', W - 6, FH + 1, 4, 3, {}); f.prop('clock_wall', 40, FH + 10, 2.6, 2, {});
  f.box(4, FH + 4, stZ - 2, 30, 7, 1, MAT.chalkboard);
  f.text('SUNDAY 48 PP', 19, FH + 7, stZ - 3, MAT.blackboard_text, { align: 'center', font: 'small' });
  // the editor's glass office in the front corner
  const ed = { x0: W - 40, x1: W - 3, z0: 2, z1: 22 };
  partitionX(f, ed.x0, ed.x1, FH + 1, ed.z1, FH - 1, MAT.wood_dark, [{ at: ed.x0 + 3, w: 4 }]);
  partitionZ(f, ed.z0, ed.z1, FH + 1, ed.x0 - 1, FH - 1, MAT.wood_dark, []);
  f.box(ed.x0 + 9, FH + 4, ed.z1, ed.x1 - ed.x0 - 12, 7, 1, MAT.glass); f.box(ed.x0 - 1, FH + 4, ed.z0 + 3, 1, 7, ed.z1 - ed.z0 - 6, MAT.glass);
  const edR = b.room('Editor\'s Office', ed.x0, FH + 1, ed.z0, ed.x1 - ed.x0, FH - 1, ed.z1 - ed.z0, { lightMode: 'always' });
  b.door(news, edR, ed.x0 + 5, FH + 1, ed.z1, { leaf: 'door_glass', tint: '#4a3a2a' });
  f.prop('desk_rolltop', ed.x0 + 20, FH + 1, ed.z0 + 4, 2, {});
  const editor = b.spot('sit', ed.x0 + 20, FH + 1, ed.z0 + 7.2, 2, { room: edR, act: 'write', tags: ['work'], seat: 0.46, lines: ['"CENTURY BY THE SEA." Don\'t you dare leak it.', 'Forty-eight pages and not a comma out of place. Not one.'] });
  f.prop('chair_office', ed.x0 + 20, FH + 1, ed.z0 + 7.2, 2, {}); f.prop('typewriter', ed.x0 + 30, FH + 4, ed.z0 + 12, 1, {}); f.prop('table_side', ed.x0 + 30, FH + 1, ed.z0 + 12, 0, {});
  f.prop('bookshelf', ed.x1 - 2, FH + 1, ed.z0 + 16, 3, {}); f.prop('ashtray_stand' in {} ? 'coat_rack' : 'coat_rack', ed.x0 + 2, FH + 1, ed.z0 + 2, 0, {});
  b.job('editor', editor, { shift: ['9:00', '23:59'], title: 'editor of the Courier', sex: 'F' });
  // the Sunday proofs pinned to the wall
  f.box(ed.x0 + 6, FH + 5, ed.z1 - 1, 10, 7, 1, MAT.canvas_white);
  f.box(ed.x0 + 7, FH + 10, ed.z1 - 2, 8, 1, 1, MAT.trim_black); f.box(ed.x0 + 7, FH + 8, ed.z1 - 2, 6, 1, 1, MAT.trim_black);
  readH(b, ed.x0 + 11, FH + 8, ed.z1 - 2, 'Proof — Sunday Centennial Edition', '<div class="plaque"><h1>The Juniper Bay Courier</h1></div><p class="typed" style="text-align:center">SUNDAY, SEPTEMBER 27, 1953 · CENTENNIAL EDITION · 48 PAGES · 15¢<br><br><b style="font-size:1.6em;letter-spacing:0.05em">CENTURY BY THE SEA</b><br><i>Juniper Bay Marks Its Hundredth Year With Fair, Fireworks and a Letter to 2053</i><br><br>"A town is not its wharves, its steeples or its brick. It is a hundred years of people deciding, every morning, to stay." — from the Mayor\'s address<br><br>INSIDE: The Great Gale of 1867 · The Fire of 1902 · The Strike of 1934 · The Hurricane of 1938 · Our Honor Rolls · 212 Souls: The Families of 1853 · Harlow\'s at 75 · What the Capsule Holds<br><br><span style="color:#a33">(proof — A.L. — "Check spelling of Castellano on p. 12. Check it TWICE.")</span></p>', 2);
  read(b, ed.x0 + 20, FH + 6, ed.z0 + 1, 'Photograph on the Editor\'s Wall', 'Four generations of Lowells on the Courier steps, 1946: old Josiah\'s grandson Edmund in his wheelchair, Ada holding the first copy she edited, her son Tom (now at the Globe), and a baby — her granddaughter, "the fifth Lowell, who will certainly be a reporter, because she has never once stopped asking questions."');
  // wire room teletypes
  for (let k = 0; k < 3; k++) { f.prop('table_card', 8 + k * 10, FH + 1, BD - 8, 0, {}); f.prop('typewriter', 8 + k * 10, FH + 4, BD - 8, 0, {}); }
  b.spot('stand', 18, FH + 1, BD - 11, 2, { room: wire, act: 'read_stand', tags: ['work', 'newsroom'] });
  read(b, 8, FH + 4, BD - 9, 'Teletype Tape', 'AP BOSTON 1247P — ... JUNIPER BAY MASS. CELEBRATES CENTENNIAL TODAY WITH FAIR AND FIREWORKS. TOWN FOUNDED 1853 BY SEA CAPT. ELIAS WHITCOMB ... MORE ...\nAP NEW YORK — YANKEES 6 RED SOX 3 (FINAL)\nAP WASHINGTON — PRESIDENT EISENHOWER SPENDS WEEKEND AT CAMP DAVID ...');
  // composing room: linotypes along the front windows, the stone, the proof press
  const linos = [];
  for (let k = 0; k < 5; k++) {
    const x = 14 + k * ((W - 40) / 4);
    f.prop('linotype', x, 2 * FH + 1, 10, 2, {});
    linos.push(b.spot('sit', x, 2 * FH + 1, 14, 0, { room: comp, act: 'type', tags: ['work', 'linotype'], seat: 0.55, label: 'Setting type on the Linotype', lines: ['Etaoin shrdlu.', 'Hot metal, hot room. Mind your elbows.'] }));
    f.prop('stool_tall', x, 2 * FH + 1, 14, 0, {});
  }
  b.job('linotype', linos[0], { shift: ['10:00', '18:00'], title: 'linotype operator' });
  b.job('linotype', linos[2], { shift: ['16:00', '23:59'], title: 'linotype operator' });
  f.box(cx - 12, 2 * FH + 1, 30, 24, 4, 8, MAT.stainless);            // the imposing stone
  b.spot('stand', cx, 2 * FH + 1, 27, 2, { room: comp, act: 'counter', tags: ['work', 'press'], label: 'Making up pages on the stone' });
  b.job('compositor', b.spot('stand', cx + 6, 2 * FH + 1, 39, 0, { room: comp, act: 'counter', tags: ['work'] }), { shift: ['12:00', '23:30'], title: 'make-up man' });
  for (let k = 0; k < 3; k++) f.prop('shelf_hardware', W - 8, 2 * FH + 1, 28 + k * 5, 3, {});
  read(b, 14, 2 * FH + 5, 8, 'Wedding Announcement, in Type', 'A column of hot-metal type, locked in a galley on the Linotype\'s tray, read backwards:\n\nNOVAK–BRENNAN. Miss Helen Novak, daughter of Mr. and Mrs. Casimir Novak of Maple Street, will be married to Mr. Robert Brennan...\n\nA note taped to the galley: "Set by the groom. Proofed by the groom. Proofed again by the groom. — ETAOIN"');
  // the morgue: bound volumes back to 1866
  for (let k = 0; k < 5; k++) f.prop('bookshelf', 6 + k * 6, 2 * FH + 1, BD - 4, 0, {});
  for (let k = 0; k < 3; k++) f.prop('filing_cabinet', 40 + k * 3, 2 * FH + 1, BD - 4, 0, {});
  read(b, 12, 2 * FH + 4, BD - 5, 'Bound Volumes, 1866–1953', 'Eighty-seven years of the Courier, bound in red buckram.\n\nThe volume for 1934 falls open by itself at July 30: "STRIKE ENDS — NICKEL WON." The volume for 1938 is swollen and stained; it was on the bottom shelf the night of the hurricane.\n\nThe volume for 1945 has a dried rose pressed at V-J Day. Nobody will say who put it there.');
  // stair core
  const core = stairCore(b, stX, stZ, FH, 0, NF, { mat: MAT.wood_mid, wall: IN, doorSide: () => 'left' });
  b.door(press, core.rooms[0], stX - 1, 1, stZ + 2, { axis: 'z', leaf: 'door_wood' });
  b.door(wire, core.rooms[1], stX - 1, FH + 1, stZ + 2, { axis: 'z', leaf: 'door_wood' });
  b.door(morgue, core.rooms[2], stX - 1, 2 * FH + 1, stZ + 2, { axis: 'z', leaf: 'door_wood' });
  roofClutter(b, 4, 10, W - 20, BD - 4, H + 1, rng, { towerAt: [W * 0.3, BD * 0.6], vents: 3, skylights: 1 });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// =====================================================================================================
// UNION STATION (1889) — brick & granite head house with a clock tower, and the great arched train shed
// =====================================================================================================
function buildStation(ctx, lot, spec) {
  const rng = ctx.rng.fork('station' + lot.x + ',' + lot.z);
  const name = spec.name || 'Union Station';
  const b = new Building(ctx, { name, kind: 'station', lot, address: lot.address, established: spec.est || 1889, hours: [T(5), T(24)],
    lore: 'Opened 1889 by the Boston & Juniper Bay Railroad, with its great arched train shed. Four trains a day to Boston. The station clock, says stationmaster Otto Lindqvist, has not been wrong since 1911.' });
  const f = b.f, W = lot.w, D = lot.d, cx = Math.round(W / 2);
  const BR = MAT.brick_red, GR = MAT.granite, IN = MAT.plaster_cream;
  // tracks: centre lines in local z. Track 1 lines up with the main line (rails at world z −979/−973 vox).
  const oz = lot.z, trackZ1 = Math.round((oz + D) - (-976) - 0.5) - 1;           // local z of the rail pair centre
  const T1 = Math.max(80, Math.min(D - 60, trackZ1));
  const HZ0 = 20, HZ1 = T1 - 20;                        // head house z range
  const P1 = [HZ1, T1 - 7], P2 = [T1 + 8, T1 + 26];     // platforms
  const T2 = T1 + 33, T3 = T1 + 50;
  const SZ1 = Math.min(D - 2, T3 + 18);                 // shed back wall
  // ---- ground: forecourt, cab stand, the whole lot in gravel & ballast
  f.box(0, -1, 0, W, 1, D, MAT.gravel);
  f.box(0, -1, 0, W, 1, HZ0 + 2, MAT.sidewalk_brick);
  f.box(cx - 70, -1, 0, 140, 1, HZ0, MAT.cobble);
  // ---- tracks (full lot width): ballast, ties, rails
  const track = (zc, x0 = 0, x1 = W) => {
    f.box(x0, -1, zc - 12, x1 - x0, 1, 25, MAT.gravel);
    for (let x = x0 + 1; x < x1; x += 3) f.box(x, -1, zc - 5, 1, 1, 11, MAT.rail_tie);
    f.box(x0, 0, zc - 3, x1 - x0, 1, 1, MAT.rail_steel); f.box(x0, 0, zc + 3, x1 - x0, 1, 1, MAT.rail_steel);
  };
  const T1c = T1 + 0.5;
  track(T1); track(T2, 24, W - 24); track(T3, 24, W - 24);
  for (const [zc, x] of [[T2, 24], [T2, W - 25], [T3, 24], [T3, W - 25]]) { f.box(x, 0, zc - 5, 1, 3, 11, MAT.wood_dark); f.box(x + (x < cx ? -1 : 1), 1, zc - 5, 1, 1, 11, MAT.trim_red); }
  // ---- platforms under the shed
  const SX0 = 40, SX1 = W - 40;
  f.box(SX0, 0, P1[0], SX1 - SX0, 1, P1[1] - P1[0], MAT.concrete);
  f.box(SX0, 0, P2[0], SX1 - SX0, 1, P2[1] - P2[0], MAT.concrete);
  f.box(SX0, 0, P1[1] - 1, SX1 - SX0, 1, 1, MAT.trim_white); f.box(SX0, 0, P2[0], SX1 - SX0, 1, 1, MAT.trim_white); f.box(SX0, 0, P2[1] - 1, SX1 - SX0, 1, 1, MAT.trim_white);
  // barrow crossing from platform 1 to platform 2 at the east end
  const BX = SX1 - 16;
  f.box(BX, -1, P1[1], 8, 1, P2[0] - P1[1], MAT.dock_wood); f.box(BX, 0, P1[1], 8, 1, P2[0] - P1[1], MAT.dock_wood);
  f.box(BX, 0, T1 - 3, 8, 1, 1, MAT.rail_steel); f.box(BX, 0, T1 + 3, 8, 1, 1, MAT.rail_steel);

  // ---- head house: waiting room pavilion + wings + clock tower
  const PX0 = cx - 50, PX1 = cx + 50, WX0 = cx - 92, WX1 = cx + 92;
  const PH = 40, WH = 26, HD = HZ1 - HZ0;
  shell(f, PX0, 0, HZ0, PX1 - PX0, PH, HD, BR, IN);
  shell(f, WX0, 0, HZ0 + 4, PX0 - WX0 + 1, WH, HD - 4, BR, IN);
  shell(f, PX1 - 1, 0, HZ0 + 4, WX1 - PX1 + 1, WH, HD - 4, BR, IN);
  f.box(WX0 + 1, 0, HZ0 + 5, WX1 - WX0 - 2, 1, HD - 6, MAT.floor_terrazzo);
  f.box(PX0 + 1, 0, HZ0 + 1, PX1 - PX0 - 2, 1, HD - 2, MAT.floor_bigcheck);
  // granite base & belt courses, round-arched windows
  f.walls(WX0 - 1, 0, HZ0 + 3, WX1 - WX0 + 2, 4, HD - 2, GR, 1);
  f.walls(PX0 - 1, 0, HZ0 - 1, PX1 - PX0 + 2, 4, HD + 2, GR, 1);
  f.walls(PX0 - 1, PH - 12, HZ0 - 1, PX1 - PX0 + 2, 1, HD + 2, GR, 1);
  f.walls(WX0 - 1, WH - 6, HZ0 + 3, WX1 - WX0 + 2, 1, HD - 2, GR, 1);
  for (const x of colsIn(WX0 + 4, PX0 - 4, 6, 12, 2).concat(colsIn(PX1 + 4, WX1 - 4, 6, 12, 2))) { f.archCarve(x, 4, HZ0 + 4, 6, 12, 2); f.archCarve(x, 4, HZ0 + 5, 6, 12, 1, MAT.glass); f.box(x - 1, 3, HZ0 + 3, 8, 1, 1, GR); }
  for (const x of [PX0 + 6, PX0 + 22, PX1 - 32, PX1 - 16]) { f.archCarve(x, 6, HZ0, 10, 26, 2); f.archCarve(x, 6, HZ0 + 1, 10, 26, 1, MAT.glass); f.box(x + 4, 6, HZ0, 2, 18, 1, MAT.trim_dark); f.box(x - 1, 5, HZ0 - 1, 12, 1, 1, GR); }
  // roofs: slate hips on the wings, a steep hip on the pavilion
  f.hip(WX0 - 1, WH, HZ0 + 3, PX0 - WX0 + 2, HD - 2, MAT.roof_slate, { overhang: 1, rise: 1, fill: MAT.roof_slate });
  f.hip(PX1 - 1, WH, HZ0 + 3, WX1 - PX1 + 2, HD - 2, MAT.roof_slate, { overhang: 1, rise: 1, fill: MAT.roof_slate });
  f.gable(PX0 - 1, PH, HZ0 - 1, PX1 - PX0 + 2, HD + 2, MAT.roof_slate, { axis: 'x', overhang: 1, gableMat: BR });
  // UNION STATION across the pavilion front, 1889
  f.box(PX0 + 2, PH - 10, HZ0 - 1, PX1 - PX0 - 4, 8, 1, GR);
  f.text('UNION STATION', cx, PH - 9, HZ0 - 2, MAT.trim_dark, { align: 'center', font: 'big' });
  // clock tower on the Lantern Avenue axis, flush with the pavilion front
  const TW = 24, tx0 = cx - TW / 2, TH = 96;
  f.walls(tx0, 0, HZ0, TW, TH, TW, BR, 2);
  f.walls(tx0 - 1, 0, HZ0 - 1, TW + 2, 5, TW + 2, GR, 1);
  for (let yy = 8; yy < TH; yy += 22) f.walls(tx0 - 1, yy, HZ0 - 1, TW + 2, 1, TW + 2, GR, 1);
  const tf = facesOf(f, tx0, HZ0, tx0 + TW, HZ0 + TW);
  for (const side of ['front', 'back', 'left', 'right']) {
    const face = tf[side];
    clockFace(face.F, Math.round((face.a + face.b) / 2), TH - 12, face.zf, 8, {});
    for (const dx of [-5, 2]) { const ax = Math.round((face.a + face.b) / 2) + dx; face.F.archCarve(ax, TH - 30, face.zf, 3, 8, 2); face.F.box(ax, TH - 30, face.zf + 1, 3, 8, 1, MAT.glass_dark); }
  }
  f.walls(tx0 - 2, TH, HZ0 - 2, TW + 4, 2, TW + 4, GR, 1);
  const rh = f.hip(tx0 - 1, TH + 2, HZ0 - 1, TW + 2, TW + 2, MAT.roof_slate, { overhang: 0, rise: 2 });
  f.box(cx, TH + 2 + rh, HZ0 + TW / 2, 1, 10, 1, MAT.iron); f.box(cx - 3, TH + 8 + rh, HZ0 + TW / 2, 7, 1, 1, MAT.iron);
  f.sphere(cx + 0.5, TH + 13 + rh, HZ0 + TW / 2 + 0.5, 1.2, MAT.art_deco_gold);
  b.light(cx, TH - 12, HZ0 - 3, { color: [1, 0.95, 0.8], radius: 10, mode: 'night' });
  // the entrance: a great arch in the tower base, three doors
  f.archCarve(tx0 + 4, 1, HZ0, TW - 8, 22, 2);
  f.box(tx0 + 3, 0, HZ0 - 1, TW - 6, 1, 1, GR);
  for (let k = 0; k < 5; k++) f.box(tx0 + 3 + k * 4, 19 + (k === 2 ? 3 : k === 1 || k === 3 ? 2 : 0), HZ0 - 1, 2, 2, 1, GR);
  f.box(tx0 + 4, 12, HZ0 + 1, TW - 8, 8, 1, MAT.glass_stained_gold);
  f.box(tx0 + 4, 1, HZ0 + 1, TW - 8, 11, 1, MAT.wood_dark);
  for (const dx of [-6, 0, 6]) f.carve(cx + dx - 2, 1, HZ0 + 1, 4, 9, 1);
  const vest = b.room('Vestibule', tx0 + 2, 1, HZ0 + 2, TW - 4, 20, TW - 4, { lightMode: 'always', lightColor: [1, 0.85, 0.6] });
  for (const dx of [-6, 6]) b.entrance(vest, cx + dx, 1, HZ0, { outZ: HZ0 - 8, outY: 0, leaf: 'door_wood', tint: '#4a2a1a', main: dx === -6 });
  b.entrance(vest, cx, 1, HZ0, { outZ: HZ0 - 8, outY: 0, leaf: 'door_wood', tint: '#4a2a1a', main: true });
  f.carve(tx0 + 6, 1, HZ0 + TW - 2, TW - 12, 16, 2);
  // porte-cochère canopy over the forecourt (clear of the doors)
  for (const x of [cx - 40, cx + 40]) { f.box(x, 0, 2, 2, 16, 2, MAT.iron_green); }
  f.box(cx - 42, 16, 1, 84, 1, HZ0 - 1, MAT.iron_green); f.box(cx - 42, 17, 1, 84, 1, HZ0 - 1, MAT.glass);
  f.box(cx - 42, 16, 0, 84, 2, 1, MAT.iron_green);
  for (let x = cx - 38; x < cx + 40; x += 12) f.box(x, 15, 3, 1, 1, HZ0 - 4, MAT.bulb_warm);
  // forecourt furniture (kept clear of the doorway axis)
  for (const x of [cx - 60, cx + 58]) { f.prop('car_taxi', x, 0, 8, 1, { tint: '#e0b030', cat: 'far' }); }
  f.prop('flag_pole', cx - 34, 0, 4, 0, { cat: 'far' }); f.prop('flag_pole', cx + 34, 0, 4, 0, { cat: 'far' });
  f.prop('bench_park', cx - 50, 0, HZ0 - 3, 0, {}); f.prop('bench_park', cx + 50, 0, HZ0 - 3, 0, {});
  f.prop('luggage_cart', cx + 24, 0, HZ0 - 4, 1, {});
  b.spot('stand', cx - 60, 0, 12, 1, { act: 'wait', tags: ['taxi'], lines: ['Taxi? Anywhere in town, thirty-five cents.'] });
  cornerStone(b, f, PX0 + 4, 4, HZ0, 1889, 'UNION STATION\nBoston & Juniper Bay Railroad\nErected 1889 · Bradlee, Winslow & Wetherell, Architects\n\nThe first train into Juniper Bay arrived on July 4, 1872, fourteen minutes late. The town band played through all fourteen.');

  // ---- waiting room
  const wr = b.room('Waiting Room', PX0 + 2, 1, HZ0 + 2, PX1 - PX0 - 4, PH - 4, HD - 4, { lightMode: 'always', lightColor: [1, 0.86, 0.62], lightPower: 1.2, nav: [cx, HZ0 + TW + 8] });
  b.door(vest, wr, cx, 1, HZ0 + TW - 1, { leaf: false, width: 10 });
  f.walls(PX0 + 1, 1, HZ0 + 1, PX1 - PX0 - 2, 5, HD - 2, MAT.wood_panel, 1); f.walls(PX0 + 1, 6, HZ0 + 1, PX1 - PX0 - 2, 1, HD - 2, MAT.wood_dark, 1);
  f.box(PX0 + 2, PH - 3, HZ0 + 2, PX1 - PX0 - 4, 1, HD - 4, MAT.wood_panel_light);
  for (let x = PX0 + 10; x < PX1 - 4; x += 12) f.box(x, PH - 4, HZ0 + 2, 1, 1, HD - 4, MAT.wood_dark);
  for (const x of [cx - 30, cx + 30]) f.prop('chandelier', x, PH - 12, HZ0 + HD / 2, 0, {});
  // benches: rows of back-to-back pairs
  const benches = [];
  for (const bx of [PX0 + 14, PX0 + 30, PX1 - 30, PX1 - 14]) for (const [bz, r] of [[HZ0 + TW + 6, 0], [HZ0 + TW + 9, 2]]) {
    if (bz > HZ1 - 8) continue;
    f.prop('bench_station', bx, 1, bz, r, {});
    b.playerSeat(bx, 1, bz, r);
    for (const dx of [-3.4, -1.1, 1.1, 3.4]) benches.push(b.spot('sit', bx + dx, 1, bz, r, { room: wr, act: rng.pick(['wait', 'read', 'sit', 'doze']), tags: ['station', 'waiting'], seat: 0.45, label: 'Waiting for a train' }));
  }
  // ticket windows on the west wall (the ticket office behind)
  const TO = { x0: WX0 + 2, x1: PX0 - 1 };
  const tix = [];
  for (let k = 0; k < 3; k++) {
    const tz = HZ0 + 10 + k * 8;
    f.prop('ticket_window', PX0 + 1.8, 1, tz, 1, {});
    f.carve(PX0, 4, tz - 1, 2, 4, 3); f.box(PX0 + 1, 4, tz - 1, 1, 4, 3, MAT.glass);
    tix.push(b.spot('stand', PX0 - 2, 1, tz, 1, { act: 'counter', tags: ['clerk'], lines: ['Boston, round trip? Two dollars and ten cents.', 'The 4:52 is on time. It\'s always on time.'] }));
    b.spot('stand', PX0 + 5, 1, tz, 3, { room: wr, act: 'wait', tags: ['shop', 'customer', 'station'] });
  }
  f.box(PX0 + 1, 10, HZ0 + 6, 1, 3, 26, MAT.sign_black);
  // departure board & the big clock over the platform doors (back wall faces the hall)
  const BZw = HZ1 - 2;
  f.box(cx - 22, 14, BZw - 1, 44, 12, 1, MAT.sign_black);
  f.box(cx - 23, 13, BZw - 1, 46, 1, 1, MAT.art_deco_gold); f.box(cx - 23, 26, BZw - 1, 46, 1, 1, MAT.art_deco_gold);
  f.text('4:52 BOSTON - ON TIME', cx, 20, BZw - 2, MAT.sign_yellow, { align: 'center', font: 'small' });
  f.text('6:15 PORTLAND - TRK 2', cx, 15, BZw - 2, MAT.sign_white, { align: 'center', font: 'small' });
  f.prop('departure_board', cx - 30, 12, BZw - 1.5, 0, {});
  clockFace(f, cx, 32, BZw, 5, {});
  read(b, cx, 22, BZw - 2, 'Departure Board', 'BOSTON & JUNIPER BAY RAILROAD — DEPARTURES\n\n 6:40 a.m.  BOSTON (North Station) — Track 1 — DEPARTED\n11:05 a.m.  BOSTON — Track 1 — DEPARTED\n 4:52 p.m.  BOSTON — Track 1 — ON TIME\n 6:15 p.m.  PORTLAND, ME. (via Newburyport) — Track 2 — ON TIME\n\nARRIVALS\n 4:40 p.m.  from BOSTON — Track 1 — ON TIME\n\nCentennial Special: extra coaches added to the 4:52 for Harbor Days visitors.', 2.4);
  read(b, cx + 8, 30, BZw - 1, 'The Station Clock', 'SETH THOMAS CLOCK CO. — REGULATOR No. 2, 1889\n\nA small brass plate under the dial, screwed on by the stationmaster himself:\n"This clock has not been wrong since 1911. — O. Lindqvist, Stationmaster"\n\n(In 1911 the railroad installed a telegraph time signal from the Naval Observatory. Mr. Lindqvist does not mention this.)', 2.4);
  // doors to platform 1
  for (const dx of [-30, 0, 30]) { f.carve(cx + dx - 3, 1, HZ1 - 2, 6, 10, 2); }
  // newsstand in the hall
  const nsx = PX1 - 12;
  f.prop('counter_shop', nsx, 1, HZ0 + 8, 3, {}); f.prop('magazine_rack', nsx + 4, 1, HZ0 + 14, 3, {}); f.prop('newspaper_pile', nsx, 4, HZ0 + 8, 0, {}); f.prop('candy_jars', nsx, 4, HZ0 + 11, 0, {});
  const nsc = b.spot('stand', nsx + 3, 1, HZ0 + 8, 3, { room: wr, act: 'counter', tags: ['clerk'], lines: ['Globe, Herald, Post — or the Courier, hometown news.', 'Life magazine, twenty cents. Marilyn Monroe on the cover — she\'s selling fast.'] });
  b.job('news vendor', nsc, { shift: ['6:00', '19:00'], title: 'news vendor', outfit: 'shopkeeper' });
  b.spot('stand', nsx - 3, 1, HZ0 + 8, 1, { room: wr, act: 'browse', tags: ['browse', 'shop'] });
  read(b, PX0 + 6, 6, HZ1 - 3, 'Honor Roll', 'BOSTON & JUNIPER BAY RAILROAD EMPLOYEES WHO SERVED 1941–1945\n\nForty-one names in gilt. Three have gold stars:\nFireman Walter Kowalski · Brakeman James Duffy · Clerk Arthur Pease\n\nBelow, added in 1953 on a separate card: "Welcome home, Sal. — The 4:52 crew."');
  read(b, cx - 12, 4, HZ0 + TW + 1, 'Notice', 'PASSENGERS ARE REQUESTED\nnot to spit on the floor, not to place parcels on the benches, and not to ask the stationmaster about the clock unless they have a quarter of an hour to spare.');

  // ---- west wing: ticket office & stationmaster; east wing: lunch room
  const tRoom = b.room('Ticket Office', TO.x0, 1, HZ0 + 6, TO.x1 - TO.x0, WH - 4, HD - 8, { lightMode: 'always' });
  const lRoom = b.room('Station Lunch Room', PX1 + 1, 1, HZ0 + 6, WX1 - PX1 - 3, WH - 4, HD - 8, { lightMode: 'always', lightColor: [1, 0.9, 0.7] });
  f.carve(PX0 - 1, 1, HZ1 - 12, 2, 9, 4); b.door(wr, tRoom, PX0 - 1, 1, HZ1 - 10, { axis: 'z', leaf: 'door_wood', tint: '#4a3a2a' });
  f.carve(PX1 - 1, 1, HZ0 + 14, 2, 9, 6); b.door(wr, lRoom, PX1 - 1, 1, HZ0 + 17, { axis: 'z', leaf: false, width: 6 });
  tix.forEach((s) => { s.room = tRoom; });
  const smDesk = officeDesk(b, tRoom, TO.x0 + 12, 1, HZ1 - 12, 0, { desk: 'desk_rolltop', act: 'write' });
  f.prop('telephone', TO.x0 + 20, 4, HZ1 - 12, 0, {}); f.prop('safe_small', TO.x0 + 3, 1, HZ0 + 9, 1, {}); f.prop('clock_wall', TO.x0 + 10, 9, HZ0 + 6.6, 2, {});
  f.prop('radio_table', TO.x0 + 24, 1, HZ1 - 5, 0, {});
  read(b, TO.x0 + 6, 5, HZ1 - 5, 'Stationmaster\'s Commission', 'BOSTON & JUNIPER BAY RAILROAD CO.\nOtto Lindqvist is hereby appointed Station Agent and Stationmaster at Juniper Bay, effective March 1, 1920.\n\nPinned beside it: a telegram, yellow with age — "CLOCK SLOW 2 SECONDS STOP PLEASE ADVISE STOP" — and his reply, framed: "CLOCK CORRECT STOP SUN SLOW STOP LINDQVIST."');
  // platform spots for the stationmaster, conductor, porter
  const plat = (x, z, rot, o = {}) => b.spot('stand', x, 1, z, rot, { act: 'stand', tags: o.tags || ['work'], ...o });
  const shed = b.room('Train Shed', SX0, 1, HZ1, SX1 - SX0, 52, SZ1 - HZ1, { lightMode: 'night', ambient: 0.85, kind: 'shed', lightColor: [1, 0.85, 0.6], nav: [cx, (P1[0] + P1[1]) / 2] });
  for (const dx of [-30, 0, 30]) b.door(wr, shed, cx + dx, 1, HZ1 - 1, { leaf: 'door_wood', tint: '#4a2a1a', width: 6 });
  const sm1 = plat(cx - 8, P1[1] - 3, 2, { act: 'look', lines: ['The 4:52 is on time. It\'s always on time.', 'Clock hasn\'t been wrong since 1911. Not once.'] });
  b.job('stationmaster', [smDesk, sm1], { shift: ['6:00', '18:30'], title: 'stationmaster', outfit: 'conductor' });
  b.job('ticket clerk', tix, { shift: ['6:00', '19:00'], title: 'ticket clerk', outfit: 'clerk' });
  const cond = plat(SX0 + 120, P1[1] - 2, 2, { act: 'wait', lines: ['Boooard! All aboard for Boston!', 'Watch your step, ma\'am — mind the gap.'] });
  b.job('conductor', cond, { shift: ['15:30', '19:00'], title: 'conductor', outfit: 'conductor' });
  const porter = plat(SX0 + 160, P1[0] + 4, 1, { act: 'carry', held: 'suitcase', lines: ['Carry your bags, sir?', 'The Whitcomb? Right across the street. I\'ll walk you over.'] });
  b.job('porter', [porter, plat(cx + 20, P1[0] + 3, 2, { act: 'stand' })], { shift: ['8:00', '20:00'], title: 'redcap porter', outfit: 'bellhop' });
  const bag = plat(TO.x0 + 4, P1[0] + 4, 2, { act: 'carry' });
  b.job('baggage man', bag, { shift: ['7:00', '17:00'], title: 'baggage man', outfit: 'dock' });
  // lunch room: counter with stools, booths
  const LX0 = PX1 + 2, LX1 = WX1 - 3;
  for (let x = LX0 + 4; x < LX1 - 4; x += 4) f.prop('diner_counter', x + 2, 1, HZ0 + 22, 0, {});
  const lunch = [];
  for (let x = LX0 + 5; x < LX1 - 4; x += 3.3) { f.prop('soda_stool', x, 1, HZ0 + 19.4, 2, {}); lunch.push(b.spot('sit', x, 1, HZ0 + 19.4, 2, { room: lRoom, act: 'eat', tags: ['eat_out'], seat: 0.7, label: 'Coffee at the station lunch room' })); b.playerSeat(x, 1, HZ0 + 19.4, 2, 0.7); }
  f.prop('coffee_urn', LX0 + 4, 4, HZ0 + 22, 0, {}); f.prop('pie_display', LX1 - 6, 4, HZ0 + 22, 0, {}); f.prop('stove', LX0 + 8, 1, HZ0 + 29, 0, {}); f.prop('menu_board', (LX0 + LX1) / 2, 7, HZ0 + 30.5, 0, {});
  const lcook = b.spot('stand', LX0 + 8, 1, HZ0 + 26, 2, { room: lRoom, act: 'cook', tags: ['work'] });
  const lwait = b.spot('stand', (LX0 + LX1) / 2, 1, HZ0 + 25, 0, { room: lRoom, act: 'serve', tags: ['work'], lines: ['Coffee and a doughnut, fifteen cents. Train\'s not for an hour, hon.'] });
  b.job('cook', lcook, { shift: ['5:30', '19:00'], outfit: 'cook', title: 'lunch-room cook' });
  b.job('waitress', lwait, { shift: ['5:30', '19:00'], outfit: 'waitress', sex: 'F', title: 'lunch-room waitress' });
  for (let k = 0; k < 2; k++) { const tx = LX0 + 8 + k * 14, tz = HZ0 + 10; f.prop('diner_booth', tx, 1, tz, 0, {}); lunch.push(b.spot('sit', tx - 1, 1, tz - 1.2, 2, { room: lRoom, act: 'eat', tags: ['eat_out'], seat: 0.45 })); lunch.push(b.spot('sit', tx + 1, 1, tz + 1.2, 0, { room: lRoom, act: 'eat', tags: ['eat_out'], seat: 0.45 })); }
  f.carve(LX0 + 30, 1, HZ1 - 2, 4, 9, 2); b.door(lRoom, shed, LX0 + 32, 1, HZ1 - 1, { leaf: 'door_wood' });
  f.carve(TO.x0 + 6, 1, HZ1 - 2, 4, 9, 2); b.door(tRoom, shed, TO.x0 + 8, 1, HZ1 - 1, { leaf: 'door_wood' });

  // ---- the great arched train shed
  const Rz0 = HZ1 - 2, Rz1 = SZ1, span = Rz1 - Rz0, R = span / 2, zc = Rz0 + R, spring = 10;
  const yOut = (z) => { const d = z + 0.5 - zc; return d * d >= R * R ? 0 : Math.sqrt(R * R - d * d); };
  // brick side wall along the back (north) with arched windows, up to the springing
  f.box(SX0 - 8, 0, SZ1 - 2, SX1 - SX0 + 16, spring, 2, BR);
  for (let x = SX0; x < SX1 - 8; x += 20) { f.archCarve(x + 6, 2, SZ1 - 2, 6, 7, 2); }
  // ribs every 24 voxels: steel arches (run-length merged columns)
  const ribX = [];
  for (let x = SX0 - 6; x <= SX1 + 6; x += 24) ribX.push(x);
  const ribCols = [];
  for (let z = Rz0; z < Rz1; z++) { const yo = Math.floor(yOut(z)); const yi = Math.max(0, Math.floor(yOut(z) - 3)); ribCols.push([z, yi, yo]); }
  const runs = [];
  for (const [z, yi, yo] of ribCols) { const last = runs[runs.length - 1]; if (last && last.yi === yi && last.yo === yo) last.n++; else runs.push({ z, yi, yo, n: 1 }); }
  for (const x of ribX) for (const r of runs) f.box(x, spring + r.yi, r.z, 2, Math.max(1, r.yo - r.yi + 1), r.n, MAT.iron);
  for (const x of ribX) { f.box(x, 0, Rz1 - 3, 2, spring, 2, MAT.iron); f.box(x, 0, Rz0, 2, spring, 2, MAT.iron); }
  // roof skin: slate on the flanks, a broad glazed band along the crown; stepped to close the slopes
  let prev = null;
  for (let z = Rz0; z < Rz1; z++) {
    const yo = Math.floor(yOut(z)), yn = Math.floor(yOut(z < zc ? z - 1 : z + 1));
    const y0 = Math.min(yo, Math.max(0, yn)), h = yo - y0 + 1;
    const glass = Math.abs(z + 0.5 - zc) < R * 0.55;
    f.box(SX0 - 8, spring + y0 + 1, z, SX1 - SX0 + 16, h, 1, glass ? MAT.glass : MAT.roof_slate);
    prev = yo;
  }
  void prev;
  // purlins & a lantern ridge
  for (const dz of [-0.55, -0.3, 0, 0.3, 0.55]) { const z = Math.round(zc + dz * R); f.box(SX0 - 8, spring + Math.floor(yOut(z)), z, SX1 - SX0 + 16, 1, 1, MAT.iron); }
  f.box(SX0 - 8, spring + Math.floor(R) + 1, Math.round(zc) - 3, SX1 - SX0 + 16, 3, 6, MAT.iron_green);
  // glazed end screens down to the height of the trains
  for (const x of [SX0 - 8, SX1 + 7]) {
    for (let y = 22; y < spring + R; y += 1) { const hw = Math.sqrt(Math.max(0, R * R - (y - spring) * (y - spring))); if (hw < 2) continue; f.box(x, y, Math.round(zc - hw + 1), 1, 1, Math.round(2 * hw - 2), MAT.glass); }
    f.box(x, 21, Rz0 + 2, 1, 1, span - 4, MAT.iron);
    for (let z = Rz0 + 8; z < Rz1 - 6; z += 12) f.box(x, 22, z, 1, Math.floor(yOut(z)) + spring - 22, 1, MAT.iron);
  }
  b.light(cx, 40, zc, { color: [1, 0.85, 0.6], radius: 22, mode: 'night' });
  b.light(cx - 120, 34, zc, { color: [1, 0.85, 0.6], radius: 18, mode: 'night' }); b.light(cx + 120, 34, zc, { color: [1, 0.85, 0.6], radius: 18, mode: 'night' });

  // ---- the train at platform 1, heading west: locomotive, tender, two coaches
  const trainY = 1, S8 = 4 / 8;              // prop units 1/8 m → voxels (0.25 m): 2 prop px per voxel
  const loco = 124 * S8, tender = 74 * S8, coach = 148 * S8;
  let tx = SX0 + 24;
  f.prop('locomotive', tx + loco / 2, trainY, T1c, 3, { tint: '#26272b', cat: 'far' }); tx += loco + 1;
  f.prop('coal_tender', tx + tender / 2, trainY, T1c, 3, { tint: '#26272b', cat: 'far' }); tx += tender + 1;
  f.prop('passenger_car', tx + coach / 2, trainY, T1c, 3, { tint: '#2f4f3a', cat: 'far' }); const coach1 = tx; tx += coach + 1;
  f.prop('passenger_car', tx + coach / 2, trainY, T1c, 3, { tint: '#2f4f3a', cat: 'far' }); tx += coach + 1;
  f.prop('passenger_car', SX1 - 60, trainY, T2 + 0.5, 1, { tint: '#6a2a24', cat: 'far' });
  f.prop('boxcar', W - 80, trainY, T3 + 0.5, 1, { tint: '#8a3a2a', cat: 'far' }); f.prop('boxcar', W - 80 - 50, trainY, T3 + 0.5, 1, { tint: '#6a5a3a', cat: 'far' });
  b.light(SX0 + 26, 8, T1c, { color: [1, 0.9, 0.6], radius: 8, mode: 'night' });
  read(b, SX0 + 50, 6, P1[1] - 1.5, 'Locomotive No. 3712', 'BOSTON & JUNIPER BAY R.R. No. 3712 — Pacific type (4-6-2), Baldwin, 1924.\nDriver: Walt Kowalczyk. Fireman: Eddie Ross.\n\nThe railroad has ordered diesels. The men who run 3712 have a pool going on how long she lasts. The stationmaster has put a dollar on "forever."');
  // platform furniture
  for (let x = SX0 + 20; x < SX1 - 20; x += 48) {
    f.prop('bench_station', x, 1, P1[0] + 3, 2, {}); b.playerSeat(x, 1, P1[0] + 3, 2);
    f.prop('bench_station', x + 24, 1, (P2[0] + P2[1]) / 2, 0, {});
    f.prop('street_lamp', x + 12, 1, P1[0] + 1.5, 0, {}); f.prop('street_lamp', x + 12, 1, (P2[0] + P2[1]) / 2, 0, {});
  }
  f.prop('luggage_cart', SX0 + 100, 1, P1[0] + 5, 1, {}); f.prop('trunk', SX0 + 104, 1, P1[0] + 5, 1, {}); f.prop('suitcase', SX0 + 110, 1, P1[0] + 4, 2, {});
  f.prop('sack_pile', SX1 - 40, 1, P2[0] + 6, 0, {}); f.prop('milk_bottles', SX1 - 46, 1, P2[0] + 5, 0, {}); f.prop('crate_stack', SX1 - 34, 1, P2[0] + 7, 0, {});
  f.prop(textSignType('TRACK 1 - BOSTON', { bg: '#1d1d22', fg: '#f0ecdc', scale: 1 / 24 }), cx, 12, P1[0] + 1, 2, {});
  f.prop(textSignType('TRACK 2 - PORTLAND', { bg: '#1d1d22', fg: '#f0ecdc', scale: 1 / 24 }), cx, 12, (P2[0] + P2[1]) / 2, 0, {});
  // people waiting on the platforms: 'arrive' spots (the first also serves as the commuters' "out of town")
  const arrive = [];
  arrive.push(b.spot('stand', coach1 + 10, 1, P1[1] - 2.5, 2, { room: shed, act: 'wait', tags: ['arrive'], label: 'Meeting the train' }));
  for (let k = 0; k < 9; k++) arrive.push(b.spot('stand', SX0 + 70 + k * 30 + rng.float(-4, 4), 1, P1[1] - 3 - (k % 2) * 3, 2, { room: shed, act: k % 3 === 0 ? 'look' : 'wait', tags: ['arrive'], label: 'Waiting on the platform' }));
  for (let k = 0; k < 6; k++) arrive.push(b.spot('stand', SX0 + 90 + k * 40, 1, P2[0] + 3 + (k % 2) * 4, 0, { room: shed, act: 'wait', tags: ['arrive'], label: 'Waiting for the Portland train' }));
  // nav along the platforms and across the barrow crossing
  const p1a = b.navPoint(shed, SX0 + 20, 1, P1[0] + 5), p1b = b.navPoint(shed, SX1 - 20, 1, P1[0] + 5);
  const cr1 = b.navPoint(shed, BX + 4, 1, P1[0] + 5), cr2 = b.navPoint(shed, BX + 4, 1, (P2[0] + P2[1]) / 2);
  const p2a = b.navPoint(0, SX0 + 20, 1, (P2[0] + P2[1]) / 2), p2b = b.navPoint(0, SX1 - 20, 1, (P2[0] + P2[1]) / 2);
  ctx.nav.chain([p1a, b.roomCenter(shed), cr1, p1b]); ctx.nav.link(cr1, cr2); ctx.nav.chain([p2a, cr2, p2b]);
  for (const s0 of b.spots) if (s0.room === 0 || (s0.tags.includes('arrive') && s0.z !== undefined)) { /* linked via room node */ }
  for (const s0 of arrive.slice(10)) ctx.nav.link(s0.node, p2a);
  read(b, SX0 + 20, 5, P1[0] + 2, 'Enamel Sign', 'BOSTON & JUNIPER BAY RAILROAD\n\nDO NOT CROSS THE TRACKS.\nUse the barrow crossing at the east end, and only when the Station Agent says so.\n\nPenalty for walking on the tracks: $10 and a talking-to from Mr. Lindqvist.');
  void GR; void IN;
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// =====================================================================================================
// HARBOR CANNING CO. (est. 1899) — the whole block on the waterfront: brick works with a sawtooth roof,
// a square smokestack with the name down its side, loading docks, the canning floor, boiler house, offices
// =====================================================================================================
function buildCannery(ctx, lot, spec) {
  const rng = ctx.rng.fork('cannery' + lot.x + ',' + lot.z);
  const name = spec.name || 'Harbor Canning Co.';
  const b = new Building(ctx, { name, kind: 'cannery', lot, address: lot.address, established: spec.est || 1899, hours: [T(6), T(12)],
    lore: 'Sardines, mackerel and the smell everyone pretends not to notice, since 1899. Still the town\'s biggest employer. In July 1934 its workers struck for nineteen days and won a nickel an hour.' });
  const f = b.f, W = lot.w, D = lot.d, FH = 16;
  const sides = streetSides(lot);
  const BR = MAT.brick_red, BR2 = MAT.brick_dark, IN = MAT.plaster_white;
  const FZ1 = 44, HZ1 = Math.min(D - 56, 184), BZ1 = D - 4;          // front block, canning hall, back buildings
  f.box(0, -1, 0, W, 1, D, MAT.concrete);
  // ---- the front block on Harbor Street: 3 storeys
  const NF = 3, H = NF * FH;
  shell(f, 0, 0, 0, W, H, FZ1, BR, IN);
  for (let i = 0; i < NF; i++) slab(f, 1, i * FH, 1, W - 2, FZ1 - 2, i === 0 ? MAT.floor_concrete : MAT.wood_gray);
  f.box(0, H, 0, W, 1, FZ1, MAT.roof_tar); f.walls(0, H + 1, 0, W, 3, FZ1, BR, 1);
  const fcF = facesOf(f, 0, 0, W, FZ1);
  for (const side of ['front', 'left', 'right']) {
    const face = fcF[side];
    const cols = colsIn(face.a, face.b, 5, 12, 4);
    gridFacade(face, cols, 5, rowsFor(1, NF, FH, 4, 9), { wall: BR, inner: IN, sill: MAT.granite, sashMat: MAT.trim_green });
    for (let yy = 4; yy < H; yy += FH) face.F.box(face.a, yy + 13, face.zf - 1, face.b - face.a, 1, 1, BR2);
    for (const x of cols) face.F.archCarve(x - 1, 1 * FH + 12, face.zf - 1, 7, 3, 1, BR2);
  }
  // the name, big, and the year
  f.text('HARBOR CANNING CO.', W / 2, H - 13, -1, MAT.sign_white, { align: 'center', scale: 2, font: 'big' });
  f.box(W / 2 - 16, FH - 2, -1, 32, 3, 1, MAT.stone_foundation);
  f.text('EST. 1899', W / 2, H + 5, 0, MAT.sign_white, { align: 'center', font: 'small' });
  f.box(W / 2 - 18, H + 4, 1, 36, 7, 1, BR);
  // ground floor: office door, four loading bays onto Harbor Street with a dock platform
  const OX1 = 56;
  f.carve(8, 1, 0, 4, 9, 2); f.box(7, 1, -1, 1, 10, 1, MAT.granite); f.box(12, 1, -1, 1, 10, 1, MAT.granite); f.box(7, 10, -1, 6, 1, 1, MAT.granite);
  f.carve(20, 3, 0, 24, 7, 2); f.box(20, 3, 0, 24, 7, 1, MAT.glass);
  const bays = colsIn(OX1 + 6, W - 6, 14, 34, 2);
  for (const x of bays) {
    f.carve(x, 1, 0, 14, 12, 2);
    f.box(x - 1, 13, -1, 16, 1, 1, MAT.granite);
    f.box(x, 12, 0, 14, 1, 1, MAT.wood_gray);
    f.box(x, 11, 1, 14, 1, 1, MAT.iron);          // rolled-up door
  }
  f.box(OX1 + 2, 0, -8, W - OX1 - 4, 3, 8, MAT.concrete);            // loading dock
  f.box(OX1 + 2, 3, -8, W - OX1 - 4, 1, 1, MAT.iron);
  for (const x of bays) { f.carve(x + 3, 3, -8, 8, 1, 1); }
  f.box(OX1 + 2, 0, -9, 1, 3, 9, MAT.wood_dark);
  f.prop('truck_delivery', bays[0] + 7, 0, -20, 0, { tint: '#8a2a24', cat: 'far' });
  for (let k = 0; k < 4; k++) f.prop(k % 2 ? 'fish_crate' : 'crate_stack', bays[1] + k * 4, 3, -4, 0, {});
  f.prop('barrel_stack', bays[bays.length - 1] + 8, 3, -4, 0, {});
  // the 1938 high-water line along the front
  f.box(0, 7, -1, W, 1, 1, MAT.trim_dark);
  f.text('HIGH WATER SEPT 21 1938', 30, 8, -1, MAT.trim_dark, { font: 'small' });
  read(b, 34, 8, -1.5, 'High-Water Mark', 'Painted by the company carpenter on September 24, 1938, three days after the hurricane, at the height of the brown line the sea left on the bricks: six feet above the sidewalk.\n\nThat night the night watchman, Tadeusz Wojcik, rode out the storm on the third floor with the payroll in a tin box and the office cat in his coat. Both were fine. The cat lived to be nineteen.');
  // ghost sign on the Mill Street side
  if (sides.left) {
    const L = f.faceFrame('left'), zf = LX(f, 0);
    paint(L, 'JUNIPER BRAND SARDINES', LZ(f, FZ1 / 2 + 60), H - 16, zf, { scale: 1, mat: MAT.sign_cream, bg: MAT.sign_navy, pad: 3 });
    paint(L, 'IN PURE OLIVE OIL - 10 CENTS', LZ(f, FZ1 / 2 + 60), H - 26, zf, { font: 'small', mat: MAT.sign_cream });
  }
  cornerStone(b, f, W - 14, 1, 0, 1899, 'HARBOR CANNING COMPANY\nIncorporated 1899\n\nJ. Whitcomb Crane, President · E. Dunmore Jr., Treasurer\n"From the Bay to Your Table"');

  // ---- canning hall with a sawtooth roof (glazing faces north, toward Mill Street)
  const HH = 26;
  f.walls(0, 0, FZ1 - 1, W, HH, HZ1 - FZ1 + 1, BR, 1);
  f.box(1, 0, FZ1, W - 2, 1, HZ1 - FZ1 - 1, MAT.floor_concrete);
  const TWt = 20;
  for (let x0 = 0; x0 < W; x0 += TWt) {
    const w = Math.min(TWt, W - x0);
    f.box(x0, HH, FZ1, 1, 10, HZ1 - FZ1, MAT.glass);                 // north-facing glazing
    for (let k = 0; k < w / 2; k++) f.box(x0 + 1 + 2 * k, HH + 10 - k, FZ1, Math.min(2, w - 1 - 2 * k), 1, HZ1 - FZ1, MAT.roof_tar);
    f.box(x0, HH, FZ1, 1, 1, HZ1 - FZ1, MAT.iron);
  }
  f.box(0, HH, HZ1 - 1, W, 11, 2, BR);                                 // parapet closing the teeth at the back
  f.box(0, HH - 1, FZ1, W, 1, HZ1 - FZ1, MAT.iron);
  f.carve(1, HH - 1, FZ1 + 1, W - 2, 1, HZ1 - FZ1 - 3);
  for (let x = 10; x < W; x += TWt) f.box(x, 0, FZ1 + 1, 1, HH, 1, MAT.iron);
  // side windows of the hall
  const fcH = facesOf(f, 0, FZ1 - 1, W, HZ1);
  for (const side of ['left', 'right']) { const face = fcH[side]; for (const x of colsIn(face.a + 4, face.b - 4, 6, 14, 2)) { face.F.archCarve(x, 6, face.zf, 6, 14, 1); face.F.archCarve(x, 6, face.zf, 6, 14, 1, MAT.glass); } }
  // ---- back: warehouse and boiler house
  const BHX0 = Math.round(W * 0.68);
  shell(f, 0, 0, HZ1, BHX0, 24, BZ1 - HZ1, BR2, IN);
  shell(f, BHX0 - 1, 0, HZ1, W - BHX0 + 1, 30, BZ1 - HZ1, BR, IN);
  f.box(0, 24, HZ1, BHX0, 1, BZ1 - HZ1, MAT.roof_tar); f.box(BHX0 - 1, 30, HZ1, W - BHX0 + 1, 1, BZ1 - HZ1, MAT.roof_tar);
  f.box(1, 0, HZ1 + 1, W - 2, 1, BZ1 - HZ1 - 2, MAT.floor_concrete);
  const fcB = facesOf(f, 0, HZ1, W, BZ1);
  gridFacade(fcB.back, colsIn(fcB.back.a, fcB.back.b, 5, 14, 6), 5, [{ y: 8, h: 9 }], { wall: BR2, inner: IN, sill: MAT.granite });
  // truck doors onto the back street
  for (const x of [20, 60]) { f.carve(x, 1, BZ1 - 2, 16, 13, 2); b.door(0, null, x + 8, 1, BZ1 - 1, { leaf: false }); }
  f.prop('truck_delivery', 28, 0, BZ1 + 12, 2, { tint: '#2a4a6a', cat: 'far' });
  // the smokestack
  const sx = Math.round((BHX0 + W) / 2), sz = Math.round((HZ1 + BZ1) / 2);
  const tiers = [[16, 0, 24], [14, 24, 70], [12, 94, 70]];
  for (const [w, y0, h] of tiers) f.box(sx - w / 2, y0, sz - w / 2, w, h, w, BR);
  f.box(sx - 8, 164, sz - 8, 16, 3, 16, BR2); f.box(sx - 7, 167, sz - 7, 14, 2, 14, MAT.iron);
  f.carve(sx - 4, 160, sz - 4, 8, 9, 8);
  for (let y = 40; y < 160; y += 30) f.walls(sx - 7, y, sz - 7, 14, 1, 14, MAT.iron, 1);
  {
    // HARBOR CANNING CO. painted down the west face (toward the harbour) and the north face
    const Fr = f, zfr = sz - 7;
    vtext(Fr, 'HARBOR', sx, 158, zfr - 0, MAT.sign_white, { gap: 1 });
    vtext(Fr, 'CANNING', sx, 158 - 6 * 8 - 4, zfr - 0, MAT.sign_white, { gap: 1 });
    const L = f.faceFrame('left');
    vtext(L, 'HARBOR', LZ(f, sz), 158, LX(f, sx - 7), MAT.sign_white, { gap: 1 });
    vtext(L, 'CANNING', LZ(f, sz), 158 - 6 * 8 - 4, LX(f, sx - 7), MAT.sign_white, { gap: 1 });
    f.text('CO', sx, 158 - 13 * 8 - 10, zfr, MAT.sign_white, { align: 'center', font: 'big' });
  }
  b.light(sx, 170, sz, { color: [1, 0.2, 0.1], radius: 5, mode: 'night' });
  f.box(sx - 1, 169, sz - 1, 2, 1, 2, MAT.traffic_red);

  // ---- rooms
  const office = b.room('Front Office', 2, 1, 2, OX1 - 3, FH - 1, FZ1 - 4, { lightMode: 'day', lightColor: [1, 0.92, 0.75] });
  const recv = b.room('Receiving Room', OX1 + 1, 1, 2, W - OX1 - 3, FH - 1, FZ1 - 4, { lightMode: 'day', kind: 'industrial', ambient: 0.5 });
  const hall = b.room('Canning Floor', 1, 1, FZ1, W - 2, HH + 8, HZ1 - FZ1 - 1, { lightMode: 'day', kind: 'industrial', ambient: 0.6, lightColor: [0.95, 0.97, 1] });
  const wh = b.room('Warehouse', 1, 1, HZ1 + 1, BHX0 - 3, 22, BZ1 - HZ1 - 2, { lightMode: 'auto', kind: 'industrial' });
  const boiler = b.room('Boiler Room', BHX0, 1, HZ1 + 1, W - BHX0 - 1, 28, BZ1 - HZ1 - 2, { lightMode: 'always', lightColor: [1, 0.6, 0.35], kind: 'industrial' });
  partitionZ(f, 2, FZ1 - 2, 1, OX1, FH - 1, IN, [{ at: 20, w: 4 }]);
  b.entrance(office, 10, 1, 0, { outZ: -6, outY: 0, leaf: 'door_wood', tint: '#2f4f3a', main: true });
  bays.forEach((x, k) => { if (k < 2) b.entrance(recv, x + 7, 1, 0, { outZ: -12, outY: 0, leaf: false }); });
  b.door(office, recv, OX1, 1, 22, { axis: 'z', leaf: 'door_wood' });
  // openings between the front block, the hall and the back buildings
  for (const x of [OX1 + 20, W - 40]) { f.carve(x, 1, FZ1 - 2, 10, 12, 2); b.door(recv, hall, x + 5, 1, FZ1 - 1, { leaf: false, width: 10 }); }
  f.carve(30, 1, HZ1 - 1, 12, 12, 2); b.door(hall, wh, 36, 1, HZ1, { leaf: false, width: 12 });
  f.carve(BHX0 + 10, 1, HZ1 - 1, 6, 10, 2); b.door(hall, boiler, BHX0 + 13, 1, HZ1, { leaf: 'door_wood', tint: '#4a4a4a' });
  // canning lines: long conveyors along z with packing tables
  const lines = [], workSpots = [];
  const nLines = Math.max(2, Math.min(4, Math.floor(W / 50)));
  for (let k = 0; k < nLines; k++) {
    const lx = Math.round(W * (k + 1) / (nLines + 1));
    const z0 = FZ1 + 12, z1 = HZ1 - 16;
    f.box(lx - 1, 1, z0, 3, 3, z1 - z0, MAT.stainless);
    f.box(lx - 1, 4, z0, 3, 1, z1 - z0, MAT.rubber_mat);
    for (let z = z0; z < z1; z += 6) { f.box(lx - 2, 1, z, 1, 3, 1, MAT.iron); f.box(lx + 2, 1, z, 1, 3, 1, MAT.iron); }
    f.box(lx - 7, 1, z0 + 4, 4, 3, z1 - z0 - 8, MAT.wood_gray); f.box(lx + 4, 1, z0 + 4, 4, 3, z1 - z0 - 8, MAT.wood_gray);
    f.box(lx - 3, 1, z1, 7, 7, 8, MAT.steel);                        // the seamer at the end of the line
    f.box(lx - 2, 8, z1 + 2, 5, 3, 4, MAT.iron);
    for (let j = 0; j < 3; j++) { f.prop('fish_crate', lx - 10, 1, z0 + 10 + j * 22, 1, {}); f.prop('crate', lx + 10, 1, z0 + 14 + j * 22, 0, {}); }
    lines.push(lx);
    for (let j = 0; j < 4; j++) {
      const zz = z0 + 10 + j * ((z1 - z0 - 20) / 3);
      workSpots.push(b.spot('stand', lx - 5 - (j % 2 ? 0 : 0), 1, zz, 1, { room: hall, act: 'counter', tags: ['work', 'cannery'], label: 'Packing sardines', lines: ['Tails left, heads right, and don\'t let Novak see you slow down.', 'Half shift today — then the wedding!', 'You get used to the smell. Mostly.'] }));
      workSpots.push(b.spot('stand', lx + 6, 1, zz + 3, 3, { room: hall, act: j % 2 ? 'carry' : 'counter', tags: ['work', 'cannery'], label: 'On the canning line' }));
    }
  }
  // Saturday half-shift, 6 to noon
  for (let k = 0; k < 6; k++) b.job('cannery hand', [workSpots[(k * 3) % workSpots.length], workSpots[(k * 3 + 1) % workSpots.length]], { shift: ['6:00', '12:00'], title: 'packer at Harbor Canning', act: k % 3 === 2 ? 'carry' : 'counter', sex: k % 2 ? 'F' : null });
  const fore = b.spot('stand', lines[0] + 12, 1, FZ1 + 8, 2, { room: hall, act: 'look', tags: ['work'], lines: ['Line two, pick it up!', 'Mr. Novak\'s off today — his Helen\'s getting married. So I\'m the foreman. Heaven help us.'] });
  b.job('shift foreman', fore, { shift: ['5:45', '12:15'], title: 'shift foreman', sex: 'M' });
  f.prop('clock_wall', W / 2, 14, FZ1 + 0.6, 2, {});
  // steam in the boiler room: two boilers, the coal pile, the firemen
  for (const bx of [BHX0 + 10, BHX0 + 30]) { f.box(bx - 5, 1, HZ1 + 10, 10, 9, 20, MAT.iron); f.box(bx - 4, 10, HZ1 + 12, 8, 2, 16, MAT.rust); f.box(bx - 2, 2, HZ1 + 9, 4, 3, 1, MAT.fire); }
  f.box(W - 14, 1, BZ1 - 18, 10, 5, 12, MAT.trim_black);
  const fireman = b.spot('stand', BHX0 + 20, 1, HZ1 + 6, 2, { room: boiler, act: 'shovel', tags: ['work'], lines: ['Keep her at eighty pounds and she\'ll never give you trouble.'] });
  b.job('boiler man', fireman, { shift: ['5:00', '13:00'], title: 'boiler tender', outfit: 'mechanic', sex: 'M' });
  b.light(BHX0 + 20, 6, HZ1 + 8, { color: [1, 0.5, 0.2], radius: 7, mode: 'always' });
  // warehouse: cases of cans stacked to the roof
  for (let x = 8; x < BHX0 - 10; x += 12) for (let z = HZ1 + 8; z < BZ1 - 10; z += 12) f.prop(rng.chance(0.6) ? 'crate_stack' : 'cargo_pallet', x, 1, z, rng.int(0, 3), {});
  f.prop('sack_pile', BHX0 - 12, 1, BZ1 - 8, 0, {});
  b.job('warehouseman', b.spot('stand', 40, 1, HZ1 + 30, 1, { room: wh, act: 'carry', tags: ['work'] }), { shift: ['6:00', '12:00'], title: 'warehouseman', outfit: 'dock', sex: 'M' });
  // receiving room: fish arriving from the piers
  for (let k = 0; k < 5; k++) f.prop('fish_crate', OX1 + 12 + k * 10, 1, 12, 0, {});
  f.prop('scale_grocery', OX1 + 30, 1, 24, 0, {}); f.box(OX1 + 40, 1, 24, 30, 3, 6, MAT.stainless);
  b.job('receiving clerk', b.spot('stand', OX1 + 30, 1, 27, 0, { room: recv, act: 'write', tags: ['work'] }), { shift: ['6:00', '12:00'], title: 'receiving clerk', outfit: 'dock' });
  // front office: the time clock and card racks, the framed 1934 front page, the paymaster's window
  f.box(4, 4, FZ1 - 3, 3, 4, 1, MAT.steel); f.box(5, 6, FZ1 - 4, 1, 1, 1, MAT.clock_face);
  f.prop('mail_slots', 10, 1, FZ1 - 3.2, 0, {}); f.prop('mail_slots', 16, 1, FZ1 - 3.2, 0, {});
  read(b, 5, 6, FZ1 - 4, 'Time Clock & Card Rack', 'INTERNATIONAL TIME RECORDING CO., ENDICOTT, N.Y.\n\nPUNCH IN — PUNCH OUT. NO CARD, NO PAY.\n\nSaturday, Sept. 26: HALF SHIFT, 6 A.M. TO NOON.\nThe office will close at noon. Congratulations to Miss Helen Novak (bookkeeping) and Mr. Robert Brennan!\n\nCard No. 1 in the rack, faded and never removed, belongs to C. NOVAK — hired June 3, 1920.');
  readH(b, 20, 7, 2.5, 'Framed Front Page, 1934', '<div class="plaque"><h1>The Juniper Bay Courier</h1></div><p class="typed" style="text-align:center"><b>Monday, July 30, 1934 · Three Cents</b><br><br><b style="font-size:1.4em">STRIKE ENDS — CANNERY WORKERS WIN NICKEL</b><br><i>Nineteen Days on the City Hall Steps; Company Agrees to 42¢ an Hour; All Hands Back Tuesday</i><br><br>"We stood together, and we stood on the steps, and we stood in the rain," said Casimir Novak, 29, of Maple Street, who spoke for the packers. "Tomorrow we go back to work, and we will pack the best sardines on this coast."<br><br>Mr. J. Whitcomb Crane, president of the company, said only: "The men and women of Harbor Canning have always been its greatest asset. I am glad we have agreed on what that is worth."</p><p style="text-align:center;font-style:italic">Framed and hung here, at the company\'s own expense, in 1935 — by order of Mr. Crane.</p>', 2);
  for (let k = 0; k < 2; k++) officeDesk(b, office, 14 + k * 16, 1, 20, 0, { act: 'write' });
  f.prop('safe_small', OX1 - 4, 1, 4, 3, {}); f.prop('filing_cabinet', OX1 - 3, 1, 12, 3, {}); f.prop('adding_machine', 14, 4, 20, 0, {});
  const pay = b.spot('sit', 30, 1, 23.2, 0, { room: office, act: 'write', tags: ['work'], seat: 0.46, lines: ['Pay envelopes Friday. Today\'s a half day.'] });
  b.job('paymaster', pay, { shift: ['6:00', '12:00'], title: 'paymaster', sex: 'M' });
  read(b, 14, 5, 18, 'Nameplate on a Desk', 'MISS H. NOVAK — BOOKKEEPING\n\nThe desk is very tidy. On the blotter: a list in a neat hand — "flowers ✓ · veil ✓ · Aunt Zofia\'s train ✓ · RING — Robert has it (ask him again)". Beside it, a small box wrapped in white paper with a card: "From the girls on Line 2."');
  // upstairs: can loft & labelling room, reached by a stair at the south end
  const stX = W - 14, stZ = 4;
  const loft1 = b.room('Label Room', 2, FH + 1, 2, W - 18, FH - 1, FZ1 - 4, { lightMode: 'auto', kind: 'industrial' });
  const loft2 = b.room('Can Loft', 2, 2 * FH + 1, 2, W - 18, FH - 1, FZ1 - 4, { lightMode: 'auto', kind: 'industrial' });
  for (let k = 0; k < 4; k++) { f.box(12 + k * 36, FH + 1, 14, 20, 3, 6, MAT.wood_gray); f.prop('sack_pile', 20 + k * 36, FH + 4, 16, 0, {}); }
  for (let x = 8; x < W - 24; x += 14) f.prop('crate_stack', x, 2 * FH + 1, 20, 0, {});
  read(b, 20, FH + 5, 14, 'Can Labels', 'Stacks of lithographed labels, still smelling of ink:\n\nJUNIPER BRAND — Fancy Maine Sardines in Pure Olive Oil\nHARBOR QUEEN — Mackerel in Tomato Sauce\nGULL ROCK — Kippered Herring\n\nOne label has been drawn on in crayon: a lighthouse, a boat, and "PAPA\'S FISH". It is pinned to the wall.');
  const core = stairCore(b, stX, stZ, FH, 0, NF, { mat: MAT.wood_gray, wall: IN, doorSide: () => 'left' });
  b.door(recv, core.rooms[0], stX - 1, 1, stZ + 2, { axis: 'z', leaf: 'door_wood' });
  b.door(loft1, core.rooms[1], stX - 1, FH + 1, stZ + 2, { axis: 'z', leaf: 'door_wood' });
  b.door(loft2, core.rooms[2], stX - 1, 2 * FH + 1, stZ + 2, { axis: 'z', leaf: 'door_wood' });
  roofClutter(b, 4, 4, W - 20, FZ1 - 4, H + 1, rng, { towerAt: [W * 0.2, 20], vents: 2, skylights: 0, towerScale: 1.5 });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}
