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
    desk(cx, z + d * 0.45, 0, { desk: 'desk_wood', typewriter: false, act: 'write' });
    f.prop('bookshelf', x + 2, y, z + d - 1.3, 0, {}); f.prop('bookshelf', x + 6, y, z + d - 1.3, 0, {}); f.prop('bookshelf', x + w - 3, y, z + d - 1.3, 0, {});
    f.prop('armchair', cx - 3, y, z + 3, 2, { tint: '#6a3a2a' }); f.prop('armchair', cx + 3, y, z + 3, 2, { tint: '#6a3a2a' });
    f.prop('globe_desk', x + w - 2.5, y, z + 3, 0, {}); f.prop('coat_rack', x + 1.8, y, z + 2, 0, {});
    f.prop('portrait', x + 0.6, y + 7, cz, 1, {}); f.prop('books_stack', cx + 1.5, y + 3, z + d * 0.45, 0, {});
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
    const n = o.desks ?? Math.max(2, Math.min(8, Math.floor(w / 9) * Math.max(1, Math.floor(d / 12))));
    const perRow = Math.max(1, Math.floor(w / 9)), rowsN = Math.ceil(n / perRow);
    for (let k = 0; k < n; k++) {
      const col = k % perRow, row = Math.floor(k / perRow);
      desk(x + 4.5 + col * ((w - 9) / Math.max(1, perRow - 1 || 1)), z + 4 + row * Math.max(9, (d - 10) / Math.max(1, rowsN)), 0);
    }
    for (let i = 0; i < Math.min(4, Math.floor(w / 6)); i++) f.prop('filing_cabinet', x + 1.5 + i * 2.4, y, z + d - 1.2, 0, {});
    f.prop('office_water_cooler', x + w - 1.6, y, z + d - 1.6, 0, {});
    f.prop('clock_wall', cx, y + 9, z + d - 0.5, 0, {});
    if (kind === 'insurance') { f.prop('safe_small', x + w - 1.8, y, z + 2, 3, {}); f.prop('adding_machine', x + 4.5, y + 3, z + 5.8, 0, {}); }
    f.prop('coat_rack', x + 1.6, y, z + 1.8, 0, {});
    if (rng.chance(0.5)) f.prop('rubber_plant', x + w - 2, y, z + 2, 0, {});
  } else if (kind === 'exec') {
    f.prop('rug_oriental' in MAT ? 'rug_rect' : 'rug_rect', cx, y, cz, 0, { tint: '#3a4a6a' });
    desk(cx, z + d * 0.4, 0, { desk: 'desk_wood', typewriter: false, act: 'phone' });
    f.prop('sofa', cx, y, z + d - 2.5, 0, { tint: '#5a3a2a' }); f.prop('bookshelf', x + 2, y, z + d - 1.3, 0, {});
    f.prop('portrait', cx, y + 7, z + d - 0.6, 2, {}); f.prop('globe_desk', x + w - 2.5, y, z + d - 3, 0, {});
    f.prop('clock_grandfather', x + 1.6, y, z + 2, 1, {});
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
    b.job('trust clerk', sp[2], { days: 'weekday' });
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
    b.job('broker', bd, { days: 'weekday', title: 'broker' });
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
  const TENANT = { 2: 'exec', 3: 'insurance', 4: 'law', 6: 'open', 8: 'dentist', 9: 'open', 11: 'open', 13: 'open', 16: 'open' };
  for (let i = 2; i < iD; i++) {
    const s = secOf(i), y = yb(i), room = RM[i];
    const x0 = s.x0 + 2, z0 = s.z0 + 2, w = s.w - 4, d = s.d - 4;
    const kind = TENANT[i] || (i % 3 === 0 ? 'open' : 'light');
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
      if (kind === 'dentist') { if (sp1[0]) b.job('dentist', sp1[0], { shift: ['9:00', '12:30'], title: 'dentist', outfit: 'doctor' }); if (gen[0]) b.job('receptionist', gen[0], { shift: ['8:45', '12:30'], sex: 'F', title: 'dental receptionist' }); if (sp2[0]) b.job('dentist', sp2[0], { days: 'weekday' }); }
      else { for (const s0 of [...sp1, ...gen].slice(0, i % 2 ? 1 : 2)) b.job('office clerk', s0, { days: 'weekday', title: 'clerk' }); }
    } else {
      // lightly used floor: a pair of desks, cabinets and dust sheets
      const sp = officeDesk(b, room, x0 + 10, y, z0 + 8, 0, {});
      officeDesk(b, room, x0 + 22, y, z0 + 8, 0, { typewriter: false });
      f.prop('filing_cabinet', x0 + 2, y, z0 + d - 1.3, 0, {}); f.prop('office_water_cooler', x0 + w - 2, y, z0 + d - 2, 0, {});
      if (i % 2) f.prop('crate_stack', x0 + w - 8, y, z0 + 6, 0, {});
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
function buildOffice(ctx, lot, spec) { return null; }
function buildBank(ctx, lot, spec) { return null; }
function buildHotel(ctx, lot, spec) { return null; }
function buildDepartment(ctx, lot, spec) { return null; }
function buildTheater(ctx, lot, spec) { return null; }
function buildNewspaper(ctx, lot, spec) { return null; }
function buildStation(ctx, lot, spec) { return null; }
function buildCannery(ctx, lot, spec) { return null; }
