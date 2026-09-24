// Shared building-generator toolkit. Everything works in LOCAL voxel coordinates of a
// Frame (x along the frontage to the right as seen from the street, y up, z into the lot,
// front wall at z = 0). 1 voxel = 0.25 m. Floor slabs are 1 voxel; a typical storey is 12–14 voxels.
import { MAT } from '../../world/materials.js';
import { textSignType } from '../../props/lib/special.js';

export { MAT };
export const VPM = 4; // voxels per metre

// ---------------------------------------------------------------- walls, floors
// Exterior wall shell with an interior finish layer: outer material on the outside layer, `inner` inside.
export function shell(f, x, y, z, w, h, d, outer, inner = null, t = 2) {
  f.walls(x, y, z, w, h, d, outer, 1);
  if (inner) f.walls(x + 1, y, z + 1, w - 2, h, d - 2, inner, 1);
  else if (t > 1) f.walls(x + 1, y, z + 1, w - 2, h, d - 2, outer, 1);
}
export function slab(f, x, y, z, w, d, mat) { f.box(x, y, z, w, 1, d, mat); }
// Interior partition wall along x (at local z) or along z (at local x), with optional doorway gaps [{at, w}]
export function partitionX(f, x0, x1, y, z, h, mat, gaps = []) {
  let cur = x0;
  for (const g of gaps.slice().sort((a, b) => a.at - b.at)) { f.box(cur, y, z, g.at - cur, h, 1, mat); cur = g.at + (g.w || 4); }
  f.box(cur, y, z, x1 - cur, h, 1, mat);
  for (const g of gaps) { if (g.h && g.h < h) f.box(g.at, y + g.h, z, g.w || 4, h - g.h, 1, mat); else if (!g.h && h > 9) f.box(g.at, y + 9, z, g.w || 4, h - 9, 1, mat); }
}
export function partitionZ(f, z0, z1, y, x, h, mat, gaps = []) {
  let cur = z0;
  for (const g of gaps.slice().sort((a, b) => a.at - b.at)) { f.box(x, y, cur, 1, h, g.at - cur, mat); cur = g.at + (g.w || 4); }
  f.box(x, y, cur, 1, h, z1 - cur, mat);
  for (const g of gaps) { if (g.h && g.h < h) f.box(x, y + g.h, g.at, 1, h - g.h, g.w || 4, mat); else if (!g.h && h > 9) f.box(x, y + 9, g.at, 1, h - 9, g.w || 4, mat); }
}
// Baseboard + picture rail trim around a room (inside faces)
export function roomTrim(f, x, y, z, w, d, mat = MAT.wood_dark, railY = null) {
  f.box(x, y, z, w, 1, 1, mat); f.box(x, y, z + d - 1, w, 1, 1, mat); f.box(x, y, z, 1, 1, d, mat); f.box(x + w - 1, y, z, 1, 1, d, mat);
  if (railY) { f.box(x, railY, z, w, 1, 1, mat); f.box(x, railY, z + d - 1, w, 1, 1, mat); f.box(x, railY, z, 1, 1, d, mat); f.box(x + w - 1, railY, z, 1, 1, d, mat); }
}

// ---------------------------------------------------------------- windows & doors
// Window through a wall that starts at local z (outer face) and is t voxels thick.
// style: 'double' (double-hung, default), 'single', 'cross', 'arch', 'shop' (big plate glass), 'round'
export function win(f, x, y, z, w, h, o = {}) {
  const t = o.t ?? 2, glass = o.glass ?? MAT.glass, frame = o.frame ?? MAT.trim_white, style = o.style || 'double';
  if (style === 'arch') f.archCarve(x, y, z, w, h, t);
  else f.carve(x, y, z, w, h, t);
  const gz = z + (o.recess ?? 1) - 0 ;
  const gzz = Math.min(z + t - 1, gz);
  if (style === 'arch') f.archCarve(x, y, gzz, w, h, 1, glass);
  else f.box(x, y, gzz, w, h, 1, glass);
  // mullions / sashes
  if (style === 'double' && h >= 5) f.box(x, y + Math.floor(h / 2), gzz, w, 1, 1, frame);
  if (style === 'cross') { f.box(x, y + Math.floor(h / 2), gzz, w, 1, 1, frame); if (w >= 3) f.box(x + Math.floor(w / 2), y, gzz, 1, h, 1, frame); }
  if (style === 'shop' && w > 8) for (let xx = x + 6; xx < x + w - 2; xx += 6) f.box(xx, y, gzz, 1, h, 1, frame);
  if (style === 'shop') f.box(x, y + h - 3, gzz, w, 1, 1, frame);
  // sill & lintel on the outside
  if (o.sill !== false) f.box(x - 1, y - 1, z - 1, w + 2, 1, 1, o.sillMat ?? frame);
  if (o.lintel !== false && style !== 'arch') f.box(x - (o.lintelWide ? 1 : 0), y + h, z - (o.lintelOut ? 1 : 0), w + (o.lintelWide ? 2 : 0), 1, o.lintelOut ? 1 : 1, o.lintelMat ?? frame);
  if (o.shutters) { f.box(x - 2, y, z - 1, 1, h, 1, o.shutters); f.box(x + w + 1, y, z - 1, 1, h, 1, o.shutters); }
  if (o.box && f.ctx.props) f.prop('window_box', x + w / 2, y - 1, z - 0.2, 0, { tint: o.boxTint || '#c8302a' });
  // inside sill
  if (o.innerSill !== false) f.box(x, y - 1, z + t, w, 1, 1, o.innerSillMat ?? MAT.wood_mid);
}
// a row of windows centred between x0..x1 on the wall at z
export function winRow(f, x0, x1, y, z, w, h, n, o = {}) {
  const span = x1 - x0;
  const gap = (span - n * w) / (n + 1);
  const xs = [];
  for (let i = 0; i < n; i++) { const x = Math.round(x0 + gap * (i + 1) + w * i); win(f, x, y, z, w, h, o); xs.push(x); }
  return xs;
}
// Door opening through a wall at z (t thick). Returns the local centre point {x, y, z} of the doorway at the outer face.
export function doorway(f, x, y, z, w = 4, h = 9, o = {}) {
  const t = o.t ?? 2;
  f.carve(x, y, z, w, h, t);
  if (o.frame !== false) {
    const fr = o.frame ?? MAT.trim_white;
    f.box(x - 1, y, z - 1, 1, h + 1, 1, fr); f.box(x + w, y, z - 1, 1, h + 1, 1, fr); f.box(x - 1, y + h, z - 1, w + 2, 1, 1, fr);
  }
  if (o.transom) { f.carve(x, y + h, z, w, 2, t); f.box(x, y + h, z, w, 2, 1, MAT.glass); f.box(x - 1, y + h + 2, z - 1, w + 2, 1, 1, o.frame ?? MAT.trim_white); }
  if (o.step !== false) f.box(x - 1, y - 1, z - 2, w + 2, 1, 2, o.stepMat ?? MAT.granite);
  return { x: x + w / 2, y, z };
}

// ---------------------------------------------------------------- stairs
// Straight stair from floor (x, y, z) rising `rise` voxels. dir: '+z'|'-z'|'+x'|'-x'. Each step: 1 up, `run` along.
// Also carves headroom above the flight (through the slab at the top). Returns top landing position.
export function stairs(f, x, y, z, dir, rise, o = {}) {
  const w = o.w ?? 4, run = o.run ?? 2, mat = o.mat ?? MAT.wood_mid, rail = o.rail ?? MAT.wood_dark;
  const dx = dir === '+x' ? 1 : dir === '-x' ? -1 : 0, dz = dir === '+z' ? 1 : dir === '-z' ? -1 : 0;
  for (let i = 0; i < rise; i++) {
    const ax = x + dx * i * run, az = z + dz * i * run;
    const bx = dx === 0 ? x : (dx > 0 ? ax : ax - run + 1), bz = dz === 0 ? z : (dz > 0 ? az : az - run + 1);
    const sx = dx === 0 ? w : run, sz = dz === 0 ? w : run;
    f.box(bx, y, bz, sx, i + 1, sz, mat);
    // headroom
    f.carve(bx, y + i + 1, bz, sx, 10, sz);
  }
  // hand rail posts
  if (o.rail !== false) {
    for (let i = 0; i < rise; i += 3) {
      const ax = x + dx * i * run, az = z + dz * i * run;
      const px = dx === 0 ? (x + w) : ax, pz = dz === 0 ? (z + w) : az;
      if (o.railSide !== 'none') f.box(dx === 0 ? px : px, y + i + 1, dz === 0 ? pz - (dz === 0 ? 0 : 0) : pz, 1, 4, 1, rail);
    }
  }
  const end = { x: x + dx * rise * run + (dx === 0 ? w / 2 : 0), y: y + rise, z: z + dz * rise * run + (dz === 0 ? w / 2 : 0) };
  return end;
}

// ---------------------------------------------------------------- facade dressing
export function cornice(f, x, y, w, mat, o = {}) {
  const z = o.z ?? 0;
  f.box(x - 1, y, z - 1, w + 2, 1, 1, mat);
  f.box(x - 2, y + 1, z - 2, w + 4, 1, 2, mat);
  if (o.dentils) for (let xx = x; xx < x + w; xx += 2) f.box(xx, y - 1, z - 1, 1, 1, 1, mat);
  if (o.brackets) for (let xx = x; xx < x + w; xx += o.brackets) f.box(xx, y - 2, z - 1, 1, 2, 1, mat);
}
export function beltCourse(f, x, y, w, mat, z = 0) { f.box(x, y, z - 1, w, 1, 1, mat); }
export function pilaster(f, x, y, h, mat, z = 0, w = 1) { f.box(x, y, z - 1, w, h, 1, mat); }
export function quoins(f, x, y, h, mat, z = 0) { for (let yy = y; yy < y + h; yy += 2) f.box(x, yy, z - 1, (yy / 2) % 2 === 0 ? 2 : 1, 1, 1, mat); }
// Striped fabric awning projecting from the wall at z over x..x+w, top at y.
export function awning(f, x, y, w, o = {}) {
  const depth = o.depth ?? 5, z = o.z ?? 0, a = o.matA ?? MAT.awning_solid_red, b = o.matB ?? MAT.canvas_white, stripe = o.stripe ?? 2;
  for (let i = 0; i < depth; i++) {
    for (let xx = x; xx < x + w; xx += stripe) {
      const m = Math.floor((xx - x) / stripe) % 2 === 0 ? a : b;
      f.box(xx, y - i, z - 1 - i, Math.min(stripe, x + w - xx), 1, 1, m);
    }
  }
  // valance
  for (let xx = x; xx < x + w; xx += stripe) { const m = Math.floor((xx - x) / stripe) % 2 === 0 ? a : b; f.box(xx, y - depth - 1, z - depth, Math.min(stripe, x + w - xx), 2, 1, m); }
  if (o.text) f.text(o.text, x + w / 2, y - depth, z - depth - 1, o.textMat ?? MAT.sign_white, { align: 'center', font: 'small' });
}
// Iron fire escape on the facade: landings under each window band from floor 2 up.
export function fireEscape(f, x, w, y0, floors, floorH, o = {}) {
  const z = o.z ?? 0, mat = o.mat ?? MAT.iron;
  for (let i = 1; i < floors; i++) {
    const y = y0 + i * floorH;
    f.box(x, y, z - 5, w, 1, 5, mat);                 // landing
    f.box(x, y + 1, z - 5, w, 1, 1, mat); f.box(x, y + 4, z - 5, w, 1, 1, mat); // railings
    f.box(x, y + 1, z - 5, 1, 4, 5, mat); f.box(x + w - 1, y + 1, z - 5, 1, 4, 5, mat);
    for (let xx = x + 2; xx < x + w - 1; xx += 2) f.box(xx, y + 2, z - 5, 1, 2, 1, mat);
    // diagonal ladder to the landing below (stepped)
    if (i > 1) for (let k = 0; k < floorH; k++) f.box(x + 2 + Math.floor(k * (w - 5) / floorH), y - k, z - 3, 2, 1, 2, mat);
  }
}
export function chimney(f, x, y, z, w, d, h, mat = MAT.brick_red, cap = MAT.stone_foundation) {
  f.box(x, y, z, w, h, d, mat);
  f.box(x - 1, y + h, z - 1, w + 2, 1, d + 2, cap);
  f.carve(x + 1, y + h - 1, z + 1, Math.max(1, w - 2), 2, Math.max(1, d - 2));
}
// Flat roof with gravel and parapet
export function flatRoof(f, x, y, z, w, d, o = {}) {
  f.box(x, y, z, w, 1, d, o.mat ?? MAT.roof_tar);
  if (o.parapet !== false) { const p = o.parapetMat ?? MAT.stone_foundation; f.walls(x, y + 1, z, w, o.parapetH ?? 2, d, p, 1); if (o.coping) f.walls(x, y + 1 + (o.parapetH ?? 2), z, w, 1, d, o.coping, 1); }
}
// Voxel-scale sign board with raised letters on the facade (z = wall face). Letters are world voxels (1.75 m tall at scale 1).
export function bigSign(f, text, cx, y, z, o = {}) {
  const scale = o.scale ?? 1, font = o.font ?? 'big';
  const tw = f.textWidth(text, scale, font);
  const pad = o.pad ?? 2, h = (font === 'big' ? 7 : 5) * scale + pad * 2;
  if (o.bg !== null) {
    f.box(Math.round(cx - tw / 2) - pad, y, z - 1, tw + pad * 2, h, 1, o.bg ?? MAT.sign_black);
    if (o.border) { f.box(Math.round(cx - tw / 2) - pad - 1, y - 1, z - 1, tw + pad * 2 + 2, 1, 1, o.border); f.box(Math.round(cx - tw / 2) - pad - 1, y + h, z - 1, tw + pad * 2 + 2, 1, 1, o.border); }
  }
  f.text(text, cx, y + pad, z - (o.bg === null ? 1 : 2), o.mat ?? MAT.sign_gold, { align: 'center', scale, font });
  return { w: tw + pad * 2, h };
}
// Small prop-scale text sign mounted on a wall (reads from the street). z = wall outer face.
export function smallSign(f, text, cx, y, z, o = {}) {
  const t = textSignType(text, o);
  f.prop(t, cx, y, z - 0.15, 0, {});
  return t;
}
// Painted "ghost sign" advertisement on a side wall (large, faded). Use a side frame.
export function ghostSign(f, text, cx, y, z, o = {}) {
  f.text(text, cx, y, z - 1, o.mat ?? MAT.sign_cream, { align: 'center', scale: o.scale ?? 1, font: o.font ?? 'big' });
}
// Cornerstone with the year carved on it (bottom-left of a facade)
export function cornerstone(f, x, y, year, o = {}) {
  f.box(x, y, -1, 8, 3, 1, o.mat ?? MAT.granite);
  f.text(String(year), x + 4, y, -2, o.textMat ?? MAT.trim_cream, { align: 'center', font: 'small' });
}

// Shopfront: plate glass windows either side of a recessed door, transom, sign band and awning.
// x..x+w along the front at ground floor (floor y = 1 is the first air layer above the slab at y=0).
export function storefront(f, b, x, w, o = {}) {
  const y = 1, h = o.h ?? 11, frame = o.frame ?? MAT.trim_green, doorW = 4;
  const dx = o.doorX ?? (x + Math.floor((w - doorW) / 2));
  // base (bulkhead) under the windows
  f.carve(x + 1, y, 0, w - 2, h, 2);
  f.box(x + 1, y, 0, w - 2, 2, 1, o.bulkhead ?? MAT.wood_dark);
  f.box(x + 1, y + 2, 0, w - 2, h - 4, 1, MAT.glass_shop);
  f.box(x + 1, y + h - 2, 0, w - 2, 2, 1, MAT.glass);           // transom band
  f.box(x + 1, y + h - 3, 0, w - 2, 1, 1, frame);
  for (let xx = x + 1; xx < x + w - 1; xx += 5) f.box(xx, y + 2, 0, 1, h - 4, 1, frame);
  f.box(x, y, 0, 1, h, 1, frame); f.box(x + w - 1, y, 0, 1, h, 1, frame);
  // recessed door
  f.carve(dx, y, 0, doorW, 9, 3);
  f.box(dx - 1, y, 1, 1, 9, 2, frame); f.box(dx + doorW, y, 1, 1, 9, 2, frame);
  f.box(dx, y + 9, 1, doorW, 1, 1, frame);
  f.box(dx, y - 1, 0, doorW, 1, 3, MAT.floor_terrazzo);
  // sign band above
  if (o.sign) {
    f.box(x, y + h, -1, w, 5, 1, o.signBg ?? MAT.sign_black);
    f.box(x, y + h - 1, -1, w, 1, 1, frame); f.box(x, y + h + 5, -1, w, 1, 1, frame);
    const scale = 1;
    const tw = f.textWidth(o.sign, scale, 'small');
    if (tw + 2 <= w) f.text(o.sign, x + w / 2, y + h, -2, o.signMat ?? MAT.sign_gold, { align: 'center', font: 'small', scale });
    else smallSign(f, o.sign, x + w / 2, y + h + 1, -1, { bg: '#1d1d22', fg: '#e8c870' });
  }
  if (o.awning !== false) awning(f, x + 1, y + h - 1, w - 2, { depth: 4, matA: o.awningMat ?? MAT.awning_solid_green, matB: o.awningMat2 ?? MAT.canvas_white, text: o.awningText });
  return { door: { x: dx + doorW / 2, y, z: 1 } };
}

// ---------------------------------------------------------------- furnishing helpers
// rot: quarter turns the furniture FRONT faces (0 = toward the street/-z, 1 = +x, 2 = +z/back, 3 = -x).
// All positions are local continuous voxel coords (4 per metre). They register activity spots and return them.

const R4 = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // local facing vectors for rot 0..3

// Dining table with chairs around it. Returns {seats:[spot], table}
export function diningSet(b, room, cx, y, cz, o = {}) {
  const f = b.f;
  const seats = o.seats ?? 4, long = o.long ?? true;
  const alongX = (o.axis ?? 'x') === 'x';
  f.prop(o.table ?? 'table_dining', cx, y, cz, alongX ? 0 : 1, { tint: o.cloth });
  const spots = [];
  const halfL = long ? 3.4 : 2.2, halfW = 2.8;
  const place = (px, pz, rot) => {
    if (o.chair !== null) f.prop(o.chair ?? 'chair_wood', px, y, pz, rot, { tint: o.chairTint });
    spots.push(b.spot('sit', px, y, pz, rot, { room, act: o.act ?? 'eat', tags: o.tags ?? ['dine'], seat: 0.45, label: o.label }));
    if (o.settings !== false) { const v = R4[rot]; f.prop('table_setting', px + v[0] * 2.1, y + 3, pz + v[1] * 2.1, (rot + 2) % 4); }
  };
  // chairs face the table centre
  const pairs = Math.max(1, Math.floor(seats / 2));
  for (let i = 0; i < pairs; i++) {
    const off = pairs === 1 ? 0 : (i - (pairs - 1) / 2) * 3.2;
    if (alongX) { place(cx + off, cz - halfW - 0.6, 2); place(cx + off, cz + halfW + 0.6, 0); }
    else { place(cx - halfW - 0.6, cz + off, 1); place(cx + halfW + 0.6, cz + off, 3); }
  }
  if (seats % 2 === 1 || o.ends) {
    if (alongX) { place(cx - halfL - 1.4, cz, 1); if (o.ends) place(cx + halfL + 1.4, cz, 3); }
    else { place(cx, cz - halfL - 1.4, 2); if (o.ends) place(cx, cz + halfL + 1.4, 0); }
  }
  if (o.centerpiece !== false) f.prop(o.centerpiece ?? 'vase_flowers', cx, y + 3, cz, 0, { tint: '#d85a6a' });
  return { seats: spots };
}

// Parlour: sofa facing a TV/radio along one wall, armchairs, coffee table, rug, lamps.
// (x, z) = room min corner, w x d = room size (voxels); the sofa sits against the back (+z) side facing -z (rot 0) by default.
export function parlour(b, room, x, y, z, w, d, o = {}) {
  const f = b.f;
  const cx = x + w / 2, spots = [];
  f.prop(o.rug ?? 'rug_oval', cx, y, z + d / 2, 0, { tint: o.rugTint ?? '#8a3a2e' });
  // sofa along the back wall
  const sz = z + d - 3.2;
  f.prop('sofa', cx, y, sz, 0, { tint: o.sofaTint ?? '#6a7a5a' });
  for (const dx of [-2.6, 0, 2.6]) spots.push(b.spot('sit', cx + dx, y, sz - 0.3, 0, { room, act: o.act ?? 'watch', tags: ['lounge', 'tv'], seat: 0.42 }));
  f.prop('table_coffee', cx, y, sz - 5.5, 0, {});
  // entertainment against the front side
  const ez = z + 1.6;
  if (o.tv !== false) f.prop('tv_console', cx, y, ez, 2, {});
  else f.prop('radio_console', cx, y, ez, 2, {});
  // armchairs at the sides facing inward
  if (w > 18) {
    f.prop('armchair', x + 2.5, y, z + d / 2, 1, { tint: o.chairTint ?? '#8a5a3a' });
    spots.push(b.spot('sit', x + 2.5, y, z + d / 2, 1, { room, act: 'read', tags: ['lounge', 'read'], seat: 0.42 }));
    f.prop('armchair', x + w - 2.5, y, z + d / 2, 3, { tint: o.chairTint2 ?? '#5a6a8a' });
    spots.push(b.spot('sit', x + w - 2.5, y, z + d / 2, 3, { room, act: 'knit', tags: ['lounge'], seat: 0.42 }));
  }
  f.prop('lamp_floor', x + 1.6, y, z + d - 1.6, 0, {});
  f.prop('table_side', x + w - 1.8, y, z + d - 1.8, 0, {});
  f.prop('lamp_table', x + w - 1.8, y + 2.4, z + d - 1.8, 0, {});
  if (o.pictures !== false) { f.prop('painting', cx, y + 7, z + d - 0.6, 2, { tint: '#8ab0d0' }); f.prop('photo_frames', x + w - 0.6, y + 6, z + d / 2, 3, {}); }
  if (o.plant !== false) f.prop('fern_stand', x + 1.6, y, z + 1.6, 0, {});
  return { seats: spots };
}

// Kitchen run along the back wall (+z side) from x to x+len (voxels). Faces rot 0 (toward -z).
export function kitchenRun(b, room, x, y, zBack, len, o = {}) {
  const f = b.f;
  const z = zBack - 1.3;
  const items = o.items ?? ['fridge', 'kitchen_counter', 'stove', 'kitchen_counter', 'kitchen_sink', 'kitchen_counter'];
  let cx = x + 1.6;
  const spots = [];
  for (const it of items) {
    if (cx > x + len - 1.5) break;
    f.prop(it, cx, y, z, 0, { tint: o.counterTint ?? '#d8c89a' });
    if (it === 'stove') spots.push(b.spot('stand', cx, y, z - 2.6, 2, { room, act: 'cook', tags: ['cook'] }));
    if (it === 'kitchen_sink') spots.push(b.spot('stand', cx, y, z - 2.6, 2, { room, act: 'wash', tags: ['wash'] }));
    if (it !== 'fridge' && o.upper !== false) f.prop('cabinet_upper', cx, y + 6, zBack - 0.8, 0, {});
    cx += 3.3;
  }
  return { spots };
}

// Bedroom: bed(s) with the head against the back wall (+z), nightstands, dresser, lamp. Returns sleep spots.
export function bedroom(b, room, x, y, z, w, d, o = {}) {
  const f = b.f;
  const spots = [];
  const beds = o.beds ?? [{ type: 'bed_double', tint: o.quilt ?? '#c86a6a', sleepers: 2 }];
  const n = beds.length;
  beds.forEach((bd, i) => {
    const bx = x + w * (i + 1) / (n + 1);
    const headZ = z + d - 0.6;
    // bed model: head at -z of the model; we want the head at +z (back wall) so rotate 2 (model front faces -z local)
    f.prop(bd.type, bx, y, headZ - 4.2, 0, { tint: bd.tint });
    const footZ = headZ - 8.2;
    const sleepers = bd.sleepers ?? (bd.type === 'bed_double' ? 2 : 1);
    for (let s = 0; s < sleepers; s++) {
      const off = sleepers === 1 ? 0 : (s === 0 ? -1.3 : 1.3);
      spots.push(b.spot('sleep', bx + off, y, footZ + 0.6, 0, { room, act: 'sleep', tags: ['sleep'], seat: bd.type === 'crib' ? 0.6 : 0.55 }));
    }
    f.prop('nightstand', bx - (bd.type === 'bed_double' ? 5 : 3.6), y, headZ - 1.2, 0, {});
    f.prop('lamp_table', bx - (bd.type === 'bed_double' ? 5 : 3.6), y + 2.4, headZ - 1.2, 0, {});
  });
  if (o.dresser !== false) f.prop('dresser', x + w - 3, y, z + 1.3, 2, {});
  if (o.wardrobe) f.prop('wardrobe', x + 2.4, y, z + 1.4, 2, {});
  if (o.rug !== false) f.prop('rug_rect', x + w / 2, y, z + d / 2 - 1, 0, { tint: o.rugTint ?? '#6a7a9a' });
  if (o.extra) for (const [p, px, pz, r] of o.extra) f.prop(p, x + px, y, z + pz, r, {});
  return { beds: spots };
}

export function bathroom(b, room, x, y, z, w, d) {
  const f = b.f;
  f.prop('bathtub', x + w - 3.5, y, z + d - 2.2, 3, {});
  f.prop('toilet', x + 1.6, y, z + d - 1.6, 2, {});
  f.prop('sink_pedestal', x + 1.6, y, z + 2, 1, {});
  f.prop('medicine_cabinet', x + 0.6, y + 6, z + 2, 1, {});
  f.prop('towel_rack', x + w - 0.6, y + 4, z + 2, 3, {});
  return { spots: [b.spot('stand', x + 3, y, z + 2, 3, { room, act: 'stand', tags: ['bath'] })] };
}

// Office desk with chair (worker faces rot), phone, lamp, typewriter. Returns worker spot.
export function officeDesk(b, room, x, y, z, rot = 0, o = {}) {
  const f = b.f;
  const v = R4[rot];
  f.prop(o.desk ?? 'desk_office', x, y, z, (rot + 2) % 4, {});
  const sx = x - v[0] * 3.2, sz = z - v[1] * 3.2;
  f.prop(o.chair ?? 'chair_office', sx, y, sz, rot, {});
  if (o.typewriter !== false) f.prop('typewriter', x, y + 3, z, (rot + 2) % 4, {});
  if (o.lamp !== false) f.prop('lamp_desk', x + (v[1] !== 0 ? 1.8 : 0), y + 3, z + (v[0] !== 0 ? 1.8 : 0), (rot + 2) % 4, {});
  if (o.phone !== false) f.prop('telephone', x - (v[1] !== 0 ? 1.8 : 0), y + 3, z - (v[0] !== 0 ? 1.8 : 0), (rot + 2) % 4, {});
  return b.spot('sit', sx, y, sz, rot, { room, act: o.act ?? 'type', tags: o.tags ?? ['work', 'desk'], seat: 0.46 });
}

// Shop counter run along x at local z facing the customers (rot 0 = customers toward the street).
export function counterRun(b, room, x0, x1, y, z, o = {}) {
  const f = b.f;
  for (let x = x0 + 2; x <= x1 - 2; x += 4) f.prop(o.type ?? 'counter_shop', x, y, z, o.rot ?? 0, { tint: o.tint ?? '#c8a870' });
  const r = o.rot ?? 0;
  const clerk = b.spot('stand', (x0 + x1) / 2, y, z + (r === 2 ? -2.6 : 2.6), r, { room, act: 'counter', tags: ['clerk'] });
  const customer = b.spot('stand', (x0 + x1) / 2 + 2, y, z - (r === 2 ? -2.8 : 2.8), (r + 2) % 4, { room, act: 'talk', tags: ['customer', o.custTag ?? 'shop'] });
  if (o.register !== false) f.prop('cash_register', x0 + 2, y + 3.8, z, o.rot ?? 0, {});
  return { clerk, customer };
}
// Wall shelves along the inside of a wall. side: 'left' (x = x0), 'right', 'back'
export function shelves(b, x0, x1, y, zBack, type = 'shelf_goods', rot = 0, step = 4) {
  for (let x = x0 + 2; x <= x1 - 2; x += step) b.f.prop(type, x, y, zBack - 0.8, rot, {});
}

export function R4dir(rot) { return R4[((rot % 4) + 4) % 4]; }
