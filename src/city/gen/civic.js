// Generators: civic. Founders Square, City Hall, Juniper Park, the Carnegie Library, the two churches,
// St. Brigid's rectory & parish hall, the high school, St. Luke's, Engine Co. No. 1, Police HQ,
// the WPA post office and the Maritime Museum. See docs/BUILDINGS.md.
import { Building } from '../building.js';
import { MAT, shell, slab, win, winRow, doorway, stairs, partitionX, partitionZ, roomTrim, cornice, beltCourse, pilaster, quoins, chimney, flatRoof, cornerstone, officeDesk, kitchenRun, bathroom, smallSign } from './common.js';
import { linkToSidewalk } from '../streets.js';
import { textSignType } from '../../props/lib/special.js';

export function register(GEN, SITES) {
  GEN.square = buildSquare;
  GEN.cityhall = buildCityHall;
  GEN.park = buildPark;
  GEN.library = buildLibrary;
  GEN.church_catholic = buildStBrigid;
  GEN.rectory = buildRectory;
  GEN.church_congregational = buildCongregational;
  GEN.school = buildSchool;
  GEN.hospital = buildHospital;
  GEN.firestation = buildFireStation;
  GEN.police = buildPolice;
  GEN.postoffice = buildPostOffice;
  GEN.museum = buildMuseum;
  void SITES;
}

// =====================================================================================
// Shared history (names used on several monuments — keep consistent)
// =====================================================================================
const CIVIL_WAR_NINE = [
  ['Sgt. Nathaniel Crowell', 'Co. D, 19th Mass. Vol. Inf.', 'Antietam, Sept. 17, 1862'],
  ['Pvt. Thomas E. Whitcomb', 'Co. D, 19th Mass. Vol. Inf.', 'Fredericksburg, Dec. 13, 1862'],
  ['Pvt. Amos Dunmore', 'Co. D, 19th Mass. Vol. Inf.', 'Fredericksburg, Dec. 13, 1862'],
  ['Cpl. Silas Fisk', 'Co. D, 19th Mass. Vol. Inf.', 'Gettysburg, July 3, 1863'],
  ['Pvt. Ezra Hatch', '2nd Mass. Heavy Artillery', 'Andersonville Prison, Aug. 1864'],
  ['Pvt. Levi Gould', 'Co. D, 19th Mass. Vol. Inf.', 'Cold Harbor, June 3, 1864'],
  ['Seaman John Pruitt', 'U.S.S. Housatonic', 'off Charleston, Feb. 17, 1864'],
  ['Pvt. Michael Kearney', '28th Mass. Vol. Inf. (Irish Brigade)', 'Petersburg, June 16, 1864'],
  ['Pvt. Josiah Beal', 'Co. D, 19th Mass. Vol. Inf.', 'of fever, Washington, D.C., 1865'],
];
const WWI_NINE = [
  ['Lt. Richard A. Whitcomb', '101st Inf., 26th "Yankee" Division', 'Seicheprey, April 20, 1918'],
  ['Pvt. Edward J. Halloran', '101st Inf., 26th Division', 'Chateau-Thierry, July 18, 1918'],
  ['Pvt. Stanislaus Kowalski', '101st Inf., 26th Division', 'Chateau-Thierry, July 20, 1918'],
  ['Cpl. Harold Crowell', '104th Inf., 26th Division', 'St. Mihiel, Sept. 12, 1918'],
  ['Pvt. Antonio Silva', '104th Inf., 26th Division', 'Meuse-Argonne, Oct. 23, 1918'],
  ['Pvt. Francis X. Duffy', '101st Inf., 26th Division', 'Meuse-Argonne, Oct. 27, 1918'],
  ['Seaman Walter Beal', 'U.S.S. Tampa', 'lost at sea, Sept. 26, 1918'],
  ['Pvt. Arthur Pemberton', '301st Field Artillery', 'influenza, Camp Devens, Oct. 1918'],
  ['Nurse Mary Catherine Doyle', 'Army Nurse Corps', 'influenza, Base Hospital 6, Oct. 1918'],
];
const WWII_23 = [
  'Adler, Samuel J.', 'Beal, Robert F.', 'Brennan, Thomas M.', 'Castellano, Joseph A.', 'Crowell, George H.', 'Duffy, James P.',
  'Fisk, Warren A.', 'Freeman, Samuel Jr.', 'Garrity, Michael J.', 'Gould, Henry L.', 'Kaminski, Joseph', 'Kowalski, Walter',
  'Lindqvist, Erik', 'Mayhew, Charles E.', 'Moreau, Rene', 'Papadakis, George', 'Pike, Andrew N.', 'Russo, Vincent',
  'Silva, Manuel', 'Tremblay, Lucien', 'Weiss, Harold', 'Whitcomb, Elias III', 'Novak, Joseph',
];
// First settlers in the Congregational burying ground (name, born, died, epitaph)
const SETTLERS = [
  ['CAPT. ELIAS WHITCOMB', 1809, 1884, 'Founder of this town.\nHe brought the JUNIPER in out of the gale of 1851\nand came back, as he swore he would.'],
  ['MERCY WHITCOMB', 1812, 1861, 'Wife of Capt. Elias Whitcomb.\n"She hath done what she could."'],
  ['DEA. OBADIAH CROWELL', 1790, 1860, 'First deacon of this church.\n"Well done, thou good and faithful servant."'],
  ['HANNAH CROWELL', 1795, 1872, 'Relict of Dea. Obadiah Crowell.'],
  ['REV. JOSIAH TUTTLE', 1798, 1870, 'First minister of the First Church in Juniper Bay, 1853-1870.\nHe preached in the salt house until the chapel was raised.'],
  ['JONAS BEAL', 1801, 1866, 'Cooper. Built the first eleven houses with his own hands.'],
  ['ENOCH DUNMORE', 1811, 1880, 'Proprietor of the Mill Street saw mill, 1856.\n"The trees of the Lord are full of sap."'],
  ['SARAH FISK', 1830, 1854, 'The first soul buried in this ground,\naged 24 years.\n"Asleep in Jesus."'],
  ['INFANT SON OF ENOCH & ABIGAIL DUNMORE', 1857, 1857, 'Aged 3 days.\n"Suffer the little children."'],
  ['CAPT. SAMUEL BEAL', 1822, 1867, 'Master of the schooner MARY ELLEN.\nLost with all hands off Gannet Ledge in the Great Gale,\nOctober 1867. His body was not recovered.\n"The sea gave up the dead which were in it."'],
];
const MARY_ELLEN = ['Capt. Samuel Beal, master', 'Ephraim Crowell, mate', 'Jonas Beal, aged 15', 'Daniel Fisk', 'Isaac Hatch', 'William Pruitt', 'George Dunmore', 'Charles Gould', 'Moses Whitcomb', 'Patrick Doyle', 'Henry Lane'];

// =====================================================================================
// Small shared helpers
// =====================================================================================
const R4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const PI = Math.PI;

// world metres (x, z) -> local continuous voxel coords of a frame
function toLocal(f, wx, wz) {
  const px = wx * 4 - f.Ox, pz = wz * 4 - f.Oz;
  return [px * f.ax[0] + pz * f.ax[1], px * f.az[0] + pz * f.az[1]];
}
// face frame whose "front" looks toward local direction dir (0 -z, 1 +x, 2 +z, 3 -x)
function faceF(f, dir) { return dir === 0 ? f : dir === 1 ? f.faceFrame('right') : dir === 2 ? f.faceFrame('back') : f.faceFrame('left'); }
// Raised pixel text on a plane facing local direction dir. c = centre along the plane (local x for 0/2, local z for 1/3),
// layer = the local voxel index of the text layer along the facing axis.
function textFace(f, dir, str, c, y, layer, mat, o = {}) {
  const F = faceF(f, dir);
  let fx, fz;
  if (dir === 0) { fx = c; fz = layer; }
  else if (dir === 1) { fx = c; fz = f.W - 1 - layer; }
  else if (dir === 2) { fx = f.W - c; fz = f.D - 1 - layer; }
  else { fx = f.D - c; fz = layer; }
  return F.text(str, fx, y, fz, mat, { align: 'center', font: 'small', ...o });
}
// Yaw offset so a prop placed with rot=0 faces local direction (dx, dz)
function yawOff(f, dx, dz) {
  const d = f.dir(dx, dz);
  return Math.atan2(d[0], d[1]) - f.yaw(0);
}
// Prop-scale text line (bronze plaque by default). rot = the direction the text faces.
function signLine(b, text, x, y, z, rot, o = {}) {
  const t = textSignType(text, { bg: o.bg || '#5e4322', fg: o.fg || '#e6c46a', border: o.border || '#a8843c' });
  b.prop(t, x, y, z, rot, { scale: o.scale ?? 0.5, cat: o.cat, yawOffset: o.yawOffset });
  return t;
}
// A stack of text lines forming a tablet; returns total height (voxels)
function tablet(b, lines, x, y, z, rot, o = {}) {
  const sc = o.scale ?? 0.4;
  const lh = 11 / 16 * sc * 4; // line height in world voxels
  const n = Math.max(...lines.map((l) => l.length));
  lines.forEach((l, i) => {
    const pad = Math.floor((n - l.length) / 2);
    const s = ' '.repeat(pad) + l + ' '.repeat(n - l.length - pad);
    signLine(b, s, x, y + (lines.length - 1 - i) * lh, z, rot, { ...o, scale: sc });
  });
  return lines.length * lh;
}
// Readable positioned slightly in front of a surface facing rot
function readAt(b, x, y, z, rot, title, body, r = 2.4) {
  const v = R4[rot];
  b.readable(x + v[0] * 2, y, z + v[1] * 2, typeof body === 'string' ? { title, body } : { title, ...body }, { r });
}
// Plaque = a short bronze title line + readable text
function plaque(b, title, x, y, z, rot, body, o = {}) {
  signLine(b, title, x, y, z, rot, { scale: o.scale ?? 0.45, cat: o.cat });
  readAt(b, x, y + 1, z, rot, o.readTitle || title, body, o.r || 2.6);
}
// Framed picture/portrait prop hung on a wall facing rot, with readable description
function framed(b, type, x, y, z, rot, title, body, o = {}) {
  b.prop(type, x, y, z, rot, { tint: o.tint, tint2: o.tint2 });
  if (title) readAt(b, x, y + 1, z, rot, title, body, o.r || 2.2);
}
// Outdoor walkable grid of nav points. blocked(x, z) in local voxels. Nodes are kind 'path' so other buildings
// can reach them with linkToSidewalk. Edge nodes on `edges` sides link to the nearest sidewalk.
function outdoorNav(b, x0, z0, x1, z1, step, blocked, o = {}) {
  const ctx = b.ctx, nav = ctx.nav;
  const map = new Map(), list = [];
  const nx = Math.max(1, Math.round((x1 - x0) / step)), nz = Math.max(1, Math.round((z1 - z0) / step));
  const sx = (x1 - x0) / nx, sz = (z1 - z0) / nz;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = x0 + i * sx, z = z0 + j * sz;
    if (blocked(x, z)) continue;
    const n = b.navPoint(0, x, o.y ?? 0, z);
    nav.info[n].kind = 'path';
    const q = { n, x, z, i, j };
    map.set(i + ',' + j, q); list.push(q);
  }
  for (const q of list) {
    for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const r = map.get((q.i + di) + ',' + (q.j + dj));
      if (!r) continue;
      let ok = true;
      for (const t of [0.2, 0.4, 0.6, 0.8]) if (blocked(q.x + (r.x - q.x) * t, q.z + (r.z - q.z) * t)) { ok = false; break; }
      if (ok) nav.link(q.n, r.n);
    }
  }
  const edges = o.edges || ['n', 's', 'w', 'e'];
  for (const q of list) {
    const side = q.j === 0 ? 'n' : q.j === nz ? 's' : q.i === 0 ? 'e' : q.i === nx ? 'w' : null;
    const side2 = q.i === 0 ? 'e' : q.i === nx ? 'w' : null;
    if ((side && edges.includes(side)) || (side2 && edges.includes(side2))) {
      const [wx, wy, wz] = nav.pos(q.n);
      const s = nav.nearest(wx, wy, wz, (id, inf) => inf.kind === 'walk', o.sideR ?? 9);
      if (s >= 0) nav.link(q.n, s);
    }
  }
  const near = (x, z) => {
    let best = null, bd = Infinity;
    for (const q of list) { const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = q; } }
    return best ? best.n : null;
  };
  return { list, near };
}
// Convert (along-wall coordinate a, local plane coordinate) into a face frame's (x, z) for a wall facing dir.
// a0 = min edge along the wall of something `w` wide; face = the local coordinate of the wall's OUTER surface.
function onWall(f, dir, a0, w, face) {
  if (dir === 0) return [f, a0, face];
  if (dir === 2) return [f.faceFrame('back'), f.W - a0 - w, f.D - face];
  if (dir === 3) return [f.faceFrame('left'), f.D - a0 - w, face];
  return [f.faceFrame('right'), a0, f.W - face];
}
function winSide(f, dir, a0, y, face, w, h, o = {}) { const [F, x, z] = onWall(f, dir, a0, w, face); win(F, x, y, z, w, h, o); }
function doorSide(f, dir, a0, y, face, w, h, o = {}) { const [F, x, z] = onWall(f, dir, a0, w, face); return doorway(F, x, y, z, w, h, o); }
// Filled disc (clock face, medallion, rose window) on a wall facing dir; c = centre along the wall, layer = voxel layer index.
function discOn(f, dir, c, cy, layer, r, mat) {
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const t = dy + 0.5 - (cy - Math.floor(cy));
    const half = Math.sqrt(Math.max(0, r * r - t * t));
    if (half < 0.5) continue;
    const a = Math.round(c - half), bb = Math.round(c + half);
    if (dir === 0 || dir === 2) f.box(a, Math.floor(cy) + dy, layer, bb - a, 1, 1, mat);
    else f.box(layer, Math.floor(cy) + dy, a, 1, 1, bb - a, mat);
  }
}
// Tower clock: dial, rim, hour marks and hands (showing 5 o'clock) on a face.
function clockOn(f, dir, c, cy, layer, r) {
  const out = dir === 0 ? -1 : dir === 2 ? 1 : dir === 3 ? -1 : 1;
  discOn(f, dir, c, cy, layer, r + 1, MAT.trim_gold);
  discOn(f, dir, c, cy, layer + out, r, MAT.clock_face);
  const L = layer + out * 2;
  const bx = (a, y, w, h, m) => (dir === 0 || dir === 2 ? f.box(Math.round(a), Math.round(y), L, w, h, 1, m) : f.box(L, Math.round(y), Math.round(a), 1, h, w, m));
  for (let k = 0; k < 12; k++) { const an = k / 12 * 2 * PI; bx(c + Math.sin(an) * (r - 1) - 0.5, cy + Math.cos(an) * (r - 1) - 0.5, 1, 1, MAT.trim_black); }
  bx(c - 0.5, cy, 1, Math.round(r * 0.8), MAT.trim_black);             // minute hand at 12
  const s = dir === 0 || dir === 1 ? 1 : -1;                           // hour hand toward 5 o'clock (viewer's right)
  for (let k = 1; k <= Math.round(r * 0.5); k++) bx(c + s * k * 0.5 - 0.5, cy - k, 1, 1, MAT.trim_black);
}
// Spot outdoors (room 0) linked into an outdoor nav grid
function outSpot(b, grid, pose, x, y, z, rot, o = {}) {
  const s = b.spot(pose, x, y, z, rot, { room: 0, ...o });
  const n = grid ? grid.near(x, z) : null;
  if (n != null) { b.ctx.nav.link(s.node, n); s.pendingLink = false; }
  return s;
}
// Paint a patterned pavement: matAt(x, z) -> material id (or skip) evaluated per `cell` voxel square, merged in runs.
function pave(f, x0, z0, x1, z1, cell, matAt, y = -1, skip = null) {
  for (let z = z0; z < z1; z += cell) {
    const dz = Math.min(cell, z1 - z);
    let rs = x0, rm = matAt(x0 + cell / 2, z + dz / 2);
    for (let x = x0 + cell; x <= x1; x += cell) {
      const m = x < x1 ? matAt(x + cell / 2, z + dz / 2) : -1;
      if (m !== rm) { if (rm !== skip && rm !== null && rm !== undefined && rm !== -1) f.box(rs, y, z, Math.min(x, x1) - rs, 1, dz, rm); rs = x; rm = m; }
    }
  }
}
// Bunting string: pennants hanging along a sagging line from a to b ([x, y, z] local voxels)
const BUNT = () => [MAT.flag_red, MAT.flag_white, MAT.flag_blue];
function bunting(f, a, bb, sag = 3, cols = BUNT()) {
  const L = Math.max(Math.abs(bb[0] - a[0]), Math.abs(bb[2] - a[2]));
  const n = Math.max(2, Math.round(L));
  let k = 0;
  for (let i = 0; i <= n; i += 3) {
    const t = i / n;
    const x = a[0] + (bb[0] - a[0]) * t, z = a[2] + (bb[2] - a[2]) * t;
    const y = a[1] + (bb[1] - a[1]) * t - sag * 4 * t * (1 - t);
    const m = cols[k++ % cols.length];
    f.box(Math.floor(x), Math.round(y) - 1, Math.floor(z), 1, 2, 1, m);
    const t2 = Math.min(1, (i + 1) / n);
    const x2 = a[0] + (bb[0] - a[0]) * t2, z2 = a[2] + (bb[2] - a[2]) * t2;
    const y2 = a[1] + (bb[1] - a[1]) * t2 - sag * 4 * t2 * (1 - t2);
    if (Math.floor(x2) !== Math.floor(x) || Math.floor(z2) !== Math.floor(z)) f.box(Math.floor(x2), Math.round(y2), Math.floor(z2), 1, 1, 1, m);
  }
}
// Human figure (statue) of `h` voxels built from boxes. dir = local facing. parts are in (u right, v up, w forward).
function figure(f, x, y, z, dir, mat, kind, mat2 = mat) {
  const fw = R4[dir], rt = [fw[1], -fw[0]];
  const put = (u0, v0, w0, su, sv, sw, m = mat) => {
    // map u,w box to local x,z box
    const xs = [x + rt[0] * u0 + fw[0] * w0, x + rt[0] * (u0 + su) + fw[0] * (w0 + sw)];
    const zs = [z + rt[1] * u0 + fw[1] * w0, z + rt[1] * (u0 + su) + fw[1] * (w0 + sw)];
    const bx = Math.min(...xs), bz = Math.min(...zs);
    f.box(Math.round(bx), y + v0, Math.round(bz), Math.round(Math.abs(xs[1] - xs[0])), sv, Math.round(Math.abs(zs[1] - zs[0])), m);
  };
  if (kind === 'captain') {
    put(-2, 0, -1, 1, 4, 2, mat2); put(1, 0, -1, 1, 4, 2, mat2);       // legs & boots
    put(-2, 3, -1, 4, 6, 2);                                            // frock coat
    put(-2, 3, -2, 4, 3, 1);                                            // coat tails behind
    put(-3, 5, -1, 1, 4, 2); put(2, 7, -1, 1, 2, 2);                    // left arm down, right arm raised
    put(2, 8, 1, 1, 1, 3, mat2);                                        // telescope pointing out to sea
    put(-1, 9, -1, 2, 1, 2); put(-1, 10, -1, 2, 2, 2);                  // collar & head
    put(-1, 9, 1, 2, 1, 1, mat2);                                       // beard
    put(-2, 12, -2, 4, 1, 4, mat2); put(-1, 13, -1, 2, 1, 2, mat2);     // cap brim & crown
  } else if (kind === 'soldier') {
    put(-2, 0, -1, 1, 4, 2); put(1, 0, -1, 1, 4, 2);                    // legs
    put(-2, 4, -1, 4, 5, 2);                                            // greatcoat
    put(-3, 5, -1, 1, 4, 2); put(2, 5, -1, 1, 4, 2);                    // arms at parade rest
    put(-1, 4, 1, 2, 1, 1);                                             // hands folded on the muzzle
    put(0, 0, 1, 1, 12, 1, mat2);                                       // rifle, butt on the ground
    put(-1, 9, -1, 2, 2, 2);                                            // head
    put(-1, 11, -1, 2, 1, 3, mat2);                                     // kepi with visor
  }
}

// =====================================================================================
// FOUNDERS SQUARE — the Centennial fair
// =====================================================================================
function buildSquare(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'Founders Square', kind: 'square', lot, address: 'Founders Square', established: 1853,
    lore: 'Laid out in 1853 on the salt-house meadow. Today: the Harbor Days Centennial fair.' });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('square' + lot.x);
  const cx = Math.round(W / 2), cz = Math.round(D / 2);
  const obst = [];
  const blocked = (x, z, pad = 2) => x < 1 || z < 1 || x > W - 1 || z > D - 1 || obst.some((o) => (o.r !== undefined ? Math.hypot(x - o.x, z - o.z) < o.r + pad : (x > o.x0 - pad && x < o.x1 + pad && z > o.z0 - pad && z < o.z1 + pad)));
  const circ = (x, z, r) => obst.push({ x, z, r });
  const rect = (x0, z0, x1, z1) => obst.push({ x0, z0, x1, z1 });
  const S = Math.min(1, D / 200);          // scale for smaller lots
  const RF = Math.round(30 * S);           // fountain basin radius
  const RX = Math.round(Math.min(72, W * 0.18)), RZ = Math.round(62 * S); // stall ring
  const lantern = toLocal(f, 214, 0)[0];   // Lantern Avenue's axis
  const lanX = lantern > 20 && lantern < W - 20 ? lantern : W * 0.3;
  const bandX = Math.min(W - 70, cx + RX + 46), monX = Math.min(W - 22, bandX + 54);

  // ---------------------------------------------------------------- paving
  f.box(0, -1, 0, W, 1, D, MAT.plaza_cream);
  const P = { c: MAT.plaza_cream, r: MAT.plaza_red, t: MAT.plaza_teal, d: MAT.plaza_dark };
  pave(f, 0, 0, W, D, 2, (x, z) => {
    const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
    const e = Math.min(x, z, W - x, D - z);
    if (e < 2) return P.d;
    if (e >= 5 && e < 8) return P.r;
    if (e >= 8 && e < 10) return P.t;
    if (r < RF) return null;
    if (r < RF + 3) return P.d;
    if (r < RF + 8) return P.r;
    if (r < RF * 1.95) { const k = Math.floor((a + PI) / (2 * PI) * 28); return k % 2 ? P.t : P.c; }
    if (r < RF * 1.95 + 4) return P.r;
    if (r < RF * 1.95 + 6) return P.d;
    // Lantern Avenue promenade: teal edges, red diamonds
    const lx = Math.abs(x - lanX);
    if (lx < 8) {
      if (lx >= 6) return P.t;
      const m = ((z % 16) + 16) % 16;
      return lx + Math.abs(m - 8) < 5 ? P.r : P.c;
    }
    if (e < 12) return P.c;
    // rays radiating from the sunburst to the edges of the square
    const sec = PI / 4, ang = ((a % sec) + sec) % sec;
    const off = Math.min(ang, sec - ang) * r;
    if (off < 2) return P.t;
    if (off < 3.5) return P.r;
    return P.c;
  }, -1, MAT.plaza_cream);
  // a granite compass medallion at the Lantern Avenue ends (where the old town pump stood)
  for (const mz of [18, D - 18]) {
    f.cylinder(lanX, -1, mz, 6, 1, MAT.granite);
    f.cylinder(lanX, -1, mz, 4, 1, MAT.plaza_dark);
    f.box(Math.round(lanX) - 1, -1, mz - 6, 2, 1, 12, MAT.trim_gold);
    f.box(Math.round(lanX) - 6, -1, mz - 1, 12, 1, 2, MAT.trim_gold);
  }
  readAt(b, lanX, 3, 18, 0, 'The Town Pump', 'ON THIS SPOT STOOD THE TOWN PUMP\n1853 - 1906\n\nDug by Jonas Beal, cooper, the summer the town was chartered.\nFor fifty-three years every household in Juniper Bay drew its water here,\nand every piece of news in Juniper Bay was told here first.\nRemoved when the trolley came down Lantern Avenue.', 3);

  // ---------------------------------------------------------------- the Whitcomb Fountain (1903)
  const FY = 0;
  f.cylinder(cx, -1, cz, RF, 1, MAT.plaza_dark);                 // basin floor
  f.cylinder(cx, FY, cz, RF, 3, MAT.granite, 2);                 // rim wall
  f.cylinder(cx, FY + 3, cz, RF + 0.6, 1, MAT.limestone, 3);     // coping
  f.cylinder(cx, FY, cz, RF - 2, 2, MAT.water);                  // pool
  f.cylinder(cx, FY, cz, 5, 9, MAT.granite);                     // pedestal
  f.cylinder(cx, FY + 2, cz, 6, 2, MAT.limestone);               // pedestal moulding
  f.cylinder(cx, FY + 9, cz, 15, 1, MAT.granite);                // lower bowl
  f.cylinder(cx, FY + 10, cz, 15, 1, MAT.limestone, 1);
  f.cylinder(cx, FY + 10, cz, 14, 1, MAT.water);
  f.cylinder(cx, FY + 10, cz, 3, 7, MAT.granite);                // upper pedestal
  f.cylinder(cx, FY + 17, cz, 8, 1, MAT.granite);                // upper bowl
  f.cylinder(cx, FY + 18, cz, 8, 1, MAT.limestone, 1);
  f.cylinder(cx, FY + 18, cz, 7, 1, MAT.water);
  f.cylinder(cx, FY + 18, cz, 1.5, 4, MAT.roof_copper);          // finial
  f.sphere(cx, FY + 23, cz, 1.6, MAT.roof_copper);
  f.box(cx - 1, FY + 24, cz - 1, 2, 3, 2, MAT.water);            // jet
  // falling water from the bowls
  for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * PI; f.box(Math.floor(cx + Math.cos(a) * 15.5), FY + 1, Math.floor(cz + Math.sin(a) * 15.5), 1, 8, 1, MAT.water); }
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * 2 * PI; f.box(Math.floor(cx + Math.cos(a) * 8.5), FY + 11, Math.floor(cz + Math.sin(a) * 8.5), 1, 6, 1, MAT.water); }
  // four bronze dolphin spouts on the pedestal
  for (let i = 0; i < 4; i++) { const v = R4[i]; f.box(cx + v[0] * 6 - 1, FY + 5, cz + v[1] * 6 - 1, 2, 2, 2, MAT.roof_copper); f.box(cx + v[0] * 7 - (v[0] < 0 ? 1 : 0), FY + 3, cz + v[1] * 7 - (v[1] < 0 ? 1 : 0), 1, 3, 1, MAT.water); }
  circ(cx, cz, RF + 1);
  signLine(b, 'THE WHITCOMB FOUNTAIN 1903', cx, 1.2, cz - RF - 0.7, 0, { scale: 0.4 });
  readAt(b, cx, 3, cz - RF - 1, 0, 'The Whitcomb Fountain', 'THE WHITCOMB FOUNTAIN\nErected by the Ladies\' Improvement Society of Juniper Bay\nfor the Semi-Centennial of the Town\n1853 - 1903\n\n"Let him that is athirst come."\n\nThe granite was cut at the Crowell quarry on Juniper Hill.\nThe bowls were cast in Boston. The pennies in the pool\nare collected every Monday for the St. Luke\'s children\'s ward.', 3.2);
  for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * PI; b.playerSeat(cx + Math.cos(a) * (RF + 1.2), 3, cz + Math.sin(a) * (RF + 1.2), 0, 0.75); }

  // ---------------------------------------------------------------- Captain Elias Whitcomb, on his plinth, facing the harbour
  const sX = cx + RF + 22, sZ = cz;
  f.box(sX - 7, 0, sZ - 7, 14, 1, 14, MAT.granite);
  f.box(sX - 6, 1, sZ - 6, 12, 1, 12, MAT.granite);
  f.box(sX - 5, 2, sZ - 5, 10, 12, 10, MAT.granite_pink);
  f.box(sX - 6, 14, sZ - 6, 12, 1, 12, MAT.granite);
  f.box(sX - 5, 13, sZ - 5, 10, 1, 10, MAT.limestone);
  figure(f, sX, 15, sZ, 1, MAT.roof_copper, 'captain', MAT.iron_green);
  rect(sX - 8, sZ - 8, sX + 8, sZ + 8);
  signLine(b, 'CAPT. ELIAS WHITCOMB', sX + 5.05, 8, sZ, 1, { scale: 0.45 });
  signLine(b, '1809 - 1884', sX + 5.05, 7, sZ, 1, { scale: 0.45 });
  signLine(b, 'FOUNDER', sX - 5.05, 8, sZ, 3, { scale: 0.45 });
  const whitcombText = 'CAPTAIN ELIAS WHITCOMB\n1809 - 1884\nMariner. Founder of Juniper Bay.\n\nIn October 1851 he brought the schooner JUNIPER in out of a gale\nand anchored in this cove, and swore he would come back.\nOn March 4, 1853, he read the charter of the town on this meadow\nto two hundred and twelve souls.\n\nHE FACES THE HARBOR HE FOUND.\n\nErected by the citizens of Juniper Bay, 1903.\n(The telescope was replaced in 1921, after the Class of 1920 stole the original.)';
  readAt(b, sX + 5, 5, sZ, 1, 'Capt. Elias Whitcomb', whitcombText, 3);
  readAt(b, sX - 5, 5, sZ, 3, 'Capt. Elias Whitcomb', whitcombText, 3);
  f.cylinder(sX, -1, sZ, 11, 1, MAT.flowerbed_yellow);
  f.cylinder(sX, -1, sZ, 8, 1, MAT.plaza_dark);

  // ---------------------------------------------------------------- nav grid across the plaza (needs obstacles first)
  // reserve the remaining obstacles before building the grid
  // bandstand
  const BR = Math.round(18 * S);
  circ(bandX, cz, BR + 2);
  // Civil War monument
  rect(monX - 10, cz - 10, monX + 10, cz + 10);
  // honour roll boards
  const hrZ = [Math.round(cz - 58 * S), Math.round(cz + 58 * S)];
  for (const z of hrZ) rect(monX - 3, z - 11, monX + 3, z + 11);
  // stalls in a ring around the fountain
  const stallAng = [30, 50, 70, 110, 130, 150, 210, 230, 250, 290, 310, 330];
  const stallPos = stallAng.map((d) => { const a = d * PI / 180; return { a, x: cx + Math.cos(a) * RX, z: cz + Math.sin(a) * RZ }; });
  for (const s of stallPos) circ(s.x, s.z, 7);
  // carts
  const carts = [['popcorn_cart', lanX + 14, 30, 2], ['hot_dog_cart', lanX + 14, D - 30, 0], ['cotton_candy_cart', bandX - 30, 26, 2], ['ice_cream_cart', bandX - 30, D - 26, 0]];
  for (const c of carts) circ(c[1], c[2], 5);
  // trees & beds along the north and south edges
  const treeXs = [];
  for (let x = 26; x < W - 20; x += 40) { if (Math.abs(x - lanX) < 18 || Math.abs(x - cx) < 14 || Math.abs(x - monX) < 14) continue; treeXs.push(x); }
  for (const x of treeXs) for (const z of [13, D - 13]) circ(x, z, 4);

  const grid = outdoorNav(b, 6, 6, W - 6, D - 6, 16, (x, z) => blocked(x, z, 3), { edges: ['n', 's', 'w'] });

  // ---------------------------------------------------------------- trees, beds, junipers, benches
  const TREES = ['tree_elm_yellow', 'tree_maple_red', 'tree_oak', 'tree_maple_orange', 'tree_elm_yellow'];
  let ti = 0;
  for (const x of treeXs) for (const z of [13, D - 13]) {
    f.box(x - 4, -1, z - 4, 8, 1, 8, MAT.granite);
    f.box(x - 3, -1, z - 3, 6, 1, 6, MAT.mulch);
    b.prop(TREES[ti++ % TREES.length], x, 0, z, 0, { cat: 'far', scale: rng.float(0.9, 1.1), yawOffset: rng.float(0, 6) });
    b.prop('leaf_pile', x + 3, 0, z + (z < cz ? 5 : -5), 0, { scale: 0.6 });
  }
  // raised flower beds between the trees with little junipers (the town's namesake)
  for (let i = 0; i < treeXs.length - 1; i++) {
    const x0 = treeXs[i] + 8, x1 = treeXs[i + 1] - 8;
    if (x1 - x0 < 10 || (lanX > x0 - 4 && lanX < x1 + 4)) continue;
    for (const z of [11, D - 15]) {
      f.box(x0, 0, z, x1 - x0, 1, 4, MAT.granite);
      f.box(x0 + 1, 0, z + 1, x1 - x0 - 2, 1, 2, [MAT.flowerbed_red, MAT.flowerbed_yellow, MAT.flowerbed_purple][i % 3]);
      rect(x0, z, x1, z + 4);
      for (let x = x0 + 4; x < x1 - 2; x += 8) b.prop('bush_round', x, 1, z + 2, 0, { tint: '#2e5a48', scale: 0.55 });
    }
  }
  // benches around the fountain facing the water, and along the edges
  const benchActs = ['feed_birds', 'read', 'sit', 'sit', 'feed_birds', 'knit', 'read', 'sit'];
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * 2 * PI;
    const r = RF + 12;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    b.prop('bench_park', x, 0, z, 0, { yawOffset: yawOff(f, -Math.cos(a), -Math.sin(a)) });
    const s = outSpot(b, grid, 'sit', x - Math.cos(a) * 0.4, 0, z - Math.sin(a) * 0.4, 0, { act: benchActs[i], tags: ['bench'], seat: 0.45 });
    s.yaw = Math.atan2(...f.dir(-Math.cos(a), -Math.sin(a)));
    b.playerSeat(x, 0, z, 0, 0.45);
  }
  for (let i = 0; i < treeXs.length - 1; i++) {
    const x = (treeXs[i] + treeXs[i + 1]) / 2;
    if (Math.abs(x - lanX) < 12) continue;
    for (const [z, rot] of [[19, 2], [D - 19, 0]]) {
      if (blocked(x, z, 1)) continue;
      b.prop('bench_park', x, 0, z, rot, {});
      outSpot(b, grid, 'sit', x, 0, z + (rot === 2 ? -0.4 : 0.4), rot, { act: rng.pick(['sit', 'read', 'feed_birds', 'doze']), tags: ['bench'], seat: 0.45 });
      b.playerSeat(x, 0, z, rot, 0.45);
      rect(x - 4, z - 2, x + 4, z + 2);
    }
  }
  // pigeons, of course
  for (let i = 0; i < 14; i++) { const a = rng.float(0, 2 * PI), r = rng.float(RF + 2, RF + 9); b.prop(rng.chance(0.85) ? 'pigeon' : 'seagull', cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r, 0, { yawOffset: rng.float(0, 6.28) }); }
  for (let i = 0; i < 4; i++) { const a = rng.float(0, 2 * PI); b.prop('pigeon', cx + Math.cos(a) * (RF + 0.4), 4, cz + Math.sin(a) * (RF + 0.4), 0, { yawOffset: rng.float(0, 6.28) }); }

  // ---------------------------------------------------------------- lamp posts & bunting
  const lampH = 16; // bunting attaches ~4 m up
  const edgeLamps = { n: [], s: [] };
  for (let x = 20; x <= W - 20; x += 40) {
    for (const [z, k] of [[6, 'n'], [D - 6, 's']]) { b.prop('street_lamp_double', x, 0, z, k === 'n' ? 2 : 0, {}); edgeLamps[k].push([x, lampH, z]); rect(x - 1, z - 1, x + 1, z + 1); }
  }
  for (const k of ['n', 's']) for (let i = 0; i < edgeLamps[k].length - 1; i++) bunting(f, edgeLamps[k][i], edgeLamps[k][i + 1], 2.5);
  // ring lamps between the stalls
  const ringLamps = [];
  for (const d of [0, 40, 90, 140, 180, 220, 270, 320]) {
    const a = d * PI / 180, k = d % 90 === 0 ? 1 : 1.16;
    const x = cx + Math.cos(a) * RX * k, z = cz + Math.sin(a) * RZ * k;
    b.prop('street_lamp_double', x, 0, z, 0, { yawOffset: yawOff(f, Math.sin(a), -Math.cos(a)) });
    ringLamps.push([x, lampH, z]);
  }
  for (let i = 0; i < ringLamps.length; i++) bunting(f, ringLamps[i], ringLamps[(i + 1) % ringLamps.length], 2);
  // radiating from the fountain finial to the ring
  for (const L of ringLamps) bunting(f, [cx, 22, cz], L, 1.5);
  // across the east end, over the speech crowd
  for (let i = 0; i < edgeLamps.n.length; i++) { const nL = edgeLamps.n[i], sL = edgeLamps.s[i]; if (nL[0] < lanX - 10) bunting(f, nL, sL, 5); }

  // ---------------------------------------------------------------- the stalls
  const STALLS = [
    { type: 'festival_stall', tint: '#b3302a', label: 'CANDY APPLES 5 CENTS', act: 'counter' },
    { type: 'festival_stall', tint: '#2d5a8a', label: 'CENTENNIAL PENNANTS' },
    { type: 'ring_toss', tint: '#e0b030', label: 'RING TOSS - 3 FOR A DIME', kids: true },
    { type: 'festival_stall', tint: '#2f6f4a', label: 'CASTELLANO FRIED CLAMS' },
    { type: 'pie_table', tint: '#e8e0d0', label: 'CENTENNIAL PIE CONTEST', pie: true },
    { type: 'festival_stall', tint: '#e0c040', label: 'LEMONADE' },
    { type: 'festival_stall', tint: '#5ab0a8', label: 'ST. BRIGID\'S BAKE SALE' },
    { type: 'festival_stall', tint: '#c86a2a', label: 'HALLORAN\'S CENTENNIAL LOAVES' },
    { type: 'festival_stall', tint: '#7a4a9a', label: 'LIONS CLUB RAFFLE' },
    { type: 'festival_stall', tint: '#b3302a', label: 'BALLOONS', kids: true, balloons: true },
    { type: 'festival_stall', tint: '#e8e4d8', label: 'FIRST AID - ST. LUKE\'S' },
    { type: 'festival_stall', tint: '#2a4a6a', label: 'HISTORICAL SOCIETY' },
  ];
  const kidSpots = [];
  const stallKeepers = [];
  stallPos.forEach((p, i) => {
    const st = STALLS[i % STALLS.length];
    const ox = Math.cos(p.a), oz = Math.sin(p.a); // outward
    const yo = yawOff(f, -ox, -oz);               // front faces the fountain
    b.prop(st.type, p.x, 0, p.z, 0, { tint: st.tint, tint2: '#f0ece0', yawOffset: yo });
    signLine(b, st.label, p.x - ox * 4.2, 10.5, p.z - oz * 4.2, 0, { bg: '#f0ece0', fg: '#8a1f24', border: st.tint, scale: 0.45, yawOffset: yo });
    const k = outSpot(b, grid, 'stand', p.x + ox * 2.4, 0, p.z + oz * 2.4, 0, { act: 'counter', tags: ['stall_keeper'], label: 'Minding a fair stall' });
    k.yaw = Math.atan2(...f.dir(-ox, -oz));
    stallKeepers.push(k);
    if (st.balloons || i % 4 === 1) b.prop('balloon_bunch', p.x + oz * 6, 0, p.z - ox * 6, 0, { tint: ['#e05a5a', '#5a8ae0', '#e0c040', '#6ac06a'][i % 4] });
    if (st.kids) for (let j = 0; j < 5; j++) { const a2 = p.a + (j - 2) * 0.11; const s = outSpot(b, grid, 'stand', cx + Math.cos(a2) * (RX - 13), 0, cz + Math.sin(a2) * (RZ - 11), 0, { act: j % 2 ? 'cheer' : 'play_ball', tags: ['fair_kids'], label: 'At the Harbor Days fair' }); s.faceTo = [b.m(p.x, 0, p.z)[0], b.m(p.x, 0, p.z)[2]]; s.spread = 1.2; kidSpots.push(s); }
    if (st.pie) {
      readAt(b, p.x - ox * 5, 4, p.z - oz * 5, 0, 'Centennial Pie Contest', 'HARBOR DAYS CENTENNIAL PIE CONTEST\nJudging at 3 o\'clock sharp. Judges: Mrs. W. Pemberton, Father Garrity, Mr. N. Papadakis.\n\nENTRIES\n1. Apple - Mrs. Irene Halloran, Church St.\n2. Blueberry - Mrs. Stella Novak (entered before the wedding, she wants it known)\n3. Mincemeat - Miss Augusta Whitcomb (Mercy Whitcomb\'s receipt, 1850)\n4. Pumpkin chiffon - Mrs. Claire Moreau\n5. Strawberry-rhubarb - Mrs. Rosa Castellano\n6. Lemon meringue - Mrs. Mildred Hatch\n7. Cherry - Peggy Halloran, age 16\n8. Sweet potato - Mrs. Ruth Freeman\n9. Apple, Dutch - Mrs. Eleni Papadakis\n\nFirst prize: a Sunbeam Mixmaster, courtesy of Garrity Hardware.\nThe committee regrets that Mr. Kowalski\'s kielbasa is not a pie.', 3);
      const judge = outSpot(b, grid, 'stand', p.x - ox * 5.5, 0, p.z - oz * 5.5, 0, { act: 'browse', tags: ['fair'], label: 'Admiring the pies' });
      judge.yaw = Math.atan2(...f.dir(ox, oz));
    }
    if (st.label.startsWith('HISTORICAL')) readAt(b, p.x - ox * 5, 4, p.z - oz * 5, 0, 'Historical Society table', 'JUNIPER BAY HISTORICAL SOCIETY\nMiss Augusta Whitcomb, President\n\nCENTENNIAL SOUVENIR PLATES - $1.25\n(Blue transferware: Whitcomb Point Light, City Hall and the JUNIPER)\n"ONE HUNDRED YEARS BY THE SEA" - illustrated history, 50 cents\nPostcards of Old Juniper Bay - 5 cents\n\nSign the Centennial Book! Every signature goes into the time capsule\nand will be read in 2053.', 3);
    if (st.label.startsWith('LIONS')) readAt(b, p.x - ox * 5, 4, p.z - oz * 5, 0, 'Lions Club raffle', 'JUNIPER BAY LIONS CLUB\nCENTENNIAL RAFFLE - 25 CENTS A TICKET, 5 FOR A DOLLAR\n\nGrand prize: a 1953 Philco 17-inch television set (Bay Radio & Television)\nSecond prize: a Harlow\'s gift certificate, $25\nThird prize: a ton of coal from Bayside Ice & Coal\n\nDrawing on the City Hall steps after the Mayor\'s address.\nProceeds to the St. Luke\'s children\'s ward.', 3);
  });
  // carts with vendors
  for (const [type, x, z, rot] of carts) {
    b.prop(type, x, 0, z, rot, {});
    const v = R4[rot];
    stallKeepers.push(outSpot(b, grid, 'stand', x - v[0] * 3, 0, z - v[1] * 3, rot, { act: 'counter', tags: ['stall_keeper'], label: 'Selling at the fair' }));
    for (let j = 0; j < 3; j++) { const s = outSpot(b, grid, 'stand', x + v[0] * 6 + (j - 1) * 4, 0, z + v[1] * 6, (rot + 2) % 4, { act: j === 1 ? 'drink_stand' : 'stand', tags: ['fair_kids', 'fair'], label: 'At the fair' }); s.spread = 1.0; kidSpots.push(s); }
  }
  // lemonade stand by the kids
  b.prop('lemonade_stand', lanX + 18, 0, cz + 40, 3, {});

  // ---------------------------------------------------------------- the Harbor Days bandstand (Lions Club, 1953)
  const bh = 3; // platform height (voxels); band stands at y = bh + 1
  for (let k = 0; k <= bh; k++) f.cylinder(bandX, k, cz, BR - (k === bh ? 0 : 0.5), 1, k === bh ? MAT.stage_wood : MAT.wood_mid);
  f.cylinder(bandX, 0, cz, BR + 0.4, bh, MAT.canvas_white, 0.8);
  for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * PI; f.box(Math.floor(bandX + Math.cos(a) * (BR + 0.2)), 0, Math.floor(cz + Math.sin(a) * (BR + 0.2)), 1, bh, 1, [MAT.flag_red, MAT.flag_blue][k % 2]); }
  // posts & canopy
  const postR = BR - 1.5;
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * 2 * PI; f.box(Math.floor(bandX + Math.cos(a) * postR), bh + 1, Math.floor(cz + Math.sin(a) * postR), 1, 14, 1, MAT.trim_white); }
  const cy = bh + 15;
  for (let k = 0; k < 8; k++) f.cylinder(bandX, cy + k, cz, BR + 1 - k * 2.4, 1, k % 2 ? MAT.canvas_white : MAT.awning_solid_red);
  f.box(bandX - 0.5, cy + 8, cz - 0.5, 1, 4, 1, MAT.iron);
  f.box(bandX - 0.5, cy + 10, cz + 0.5, 1, 1, 3, MAT.flag_red);
  // light bulbs around the canopy edge
  for (let k = 0; k < 20; k++) { const a = k / 20 * 2 * PI; f.box(Math.floor(bandX + Math.cos(a) * (BR + 0.6)), cy - 1, Math.floor(cz + Math.sin(a) * (BR + 0.6)), 1, 1, 1, MAT.bulb_warm); }
  b.light(bandX, cy - 2, cz, { color: [1, 0.85, 0.6], radius: 12, mode: 'night' });
  // steps at the back (west)
  for (let k = 0; k < bh; k++) f.box(bandX + BR - 1 + k * 2, 0, cz - 4, 3, bh - k, 8, MAT.wood_mid);
  signLine(b, 'HARBOR DAYS BAND', bandX - BR - 0.6, 1, cz, 3, { bg: '#1f2f4f', fg: '#f0e2b0', border: '#c9a24a', scale: 0.55 });
  readAt(b, bandX - BR, 3, cz, 3, 'The Harbor Days Band', 'THE HARBOR DAYS BAND\nConductor: Mr. Anthony Russo (Russo\'s Meats)\n\nPROGRAM - 1:00 to 5:15 and for the Street Dance at 8:00\n"The Stars and Stripes Forever" - Sousa\n"In the Good Old Summertime"\n"Anchors Aweigh"\n"The Juniper Bay Quickstep" - L. Pruitt, 1903 (first performance in fifty years)\n"Moonlight Serenade"\n"Tennessee Waltz"\n"In the Mood"\n\nBandstand erected by the Juniper Bay Lions Club. Please do not climb the posts.', 3);
  const bandFloor = b.navPoint(0, bandX, bh + 1, cz);
  const bandStairs = b.stairs(0, [bandX + BR + 6, 0, cz], 0, [bandX + BR - 3, bh + 1, cz]);
  ctx.nav.link(bandStairs[1], bandFloor);
  ctx.nav.link(bandStairs[0], grid.near(bandX + BR + 8, cz));
  const bandActs = ['trumpet', 'trombone', 'tuba', 'clarinet', 'drum', 'trumpet', 'clarinet', 'trombone'];
  // the band faces east (toward the fountain): a front arc of five and a back row of three
  for (let i = 0; i < 8; i++) {
    const front = i < 5, j = front ? i - 2 : i - 6;
    const x = bandX + (front ? -7 : 2) + Math.abs(j) * (front ? 1.6 : 1.2), z = cz + j * (front ? 5 : 6.5);
    const s = b.spot('stand', x, bh + 1, z, 3, { room: 0, act: bandActs[i], tags: ['band'], label: 'Playing with the Harbor Days Band' });
    ctx.nav.link(s.node, bandFloor); s.pendingLink = false;
    b.prop('music_stand', x - 2, bh + 1, z, 1, {});
    if (!front) b.prop('band_chair', x + 1.8, bh + 1, z, 3, {});
  }
  b.prop('balloon_bunch', bandX - BR, 0, cz - BR + 2, 0, { tint: '#e05a5a' });
  b.prop('balloon_bunch', bandX - BR, 0, cz + BR - 2, 0, { tint: '#5a8ae0' });

  // ---------------------------------------------------------------- 1889 Civil War soldier monument
  const mX = monX, mZ = cz;
  f.box(mX - 10, -1, mZ - 10, 20, 1, 20, MAT.granite);
  f.box(mX - 9, 0, mZ - 9, 18, 1, 18, MAT.granite);
  f.box(mX - 8, 1, mZ - 8, 16, 2, 16, MAT.granite);
  f.box(mX - 6, 3, mZ - 6, 12, 3, 12, MAT.granite_pink);
  f.box(mX - 5, 6, mZ - 5, 10, 12, 10, MAT.granite);
  f.box(mX - 6, 18, mZ - 6, 12, 1, 12, MAT.granite_pink);
  f.box(mX - 4, 19, mZ - 4, 8, 3, 8, MAT.granite);
  f.box(mX - 5, 22, mZ - 5, 10, 1, 10, MAT.granite_pink);
  figure(f, mX, 23, mZ, 3, MAT.roof_copper, 'soldier', MAT.iron_green);
  // bronze tablets with the names of the nine (east face = toward the plaza)
  const nineLines = ['1861 - 1865', 'THEY DID NOT COME HOME', ...CIVIL_WAR_NINE.map((q) => q[0].toUpperCase())];
  tablet(b, nineLines, mX - 5.05, 7, mZ, 3, { scale: 0.34 });
  tablet(b, ['ERECTED BY THE TOWN', 'AND THE G.A.R. POST NO. 97', 'MEMORIAL DAY 1889'], mX + 5.05, 11, mZ, 1, { scale: 0.34 });
  tablet(b, ['FORTY-THREE WENT', 'NINE REMAIN'], mX, 11, mZ - 5.05, 0, { scale: 0.34 });
  tablet(b, ['ANTIETAM  FREDERICKSBURG', 'GETTYSBURG  COLD HARBOR'], mX, 11, mZ + 5.05, 2, { scale: 0.34 });
  const cwText = 'TO THE MEN OF JUNIPER BAY\nWHO SERVED THE UNION\n1861 - 1865\n\nForty-three went. Nine did not come home.\n\n' + CIVIL_WAR_NINE.map((q) => `${q[0]}\n${q[1]} - ${q[2]}`).join('\n\n') + '\n\n"Their names shall live forevermore."\nErected by the Town and G.A.R. Post No. 97, Memorial Day, 1889.\nThe bronze soldier was modeled on Cpl. Silas Fisk, from his sister\'s tintype.';
  readAt(b, mX - 6, 5, mZ, 3, 'Soldiers\' Monument, 1889', cwText, 3.2);
  readAt(b, mX, 5, mZ - 6, 0, 'Soldiers\' Monument, 1889', cwText, 3);
  readAt(b, mX, 5, mZ + 6, 2, 'Soldiers\' Monument, 1889', cwText, 3);
  f.cylinder(mX, -1, mZ, 14, 1, MAT.flowerbed_red);
  f.box(mX - 10, -1, mZ - 10, 20, 1, 20, MAT.granite);
  for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) b.prop('flower_pot', mX + dx, 1, mZ + dz, 0, { tint: '#b3302a' });
  // flowers laid this morning by the Legion post
  b.prop('vase_flowers', mX - 7, 3, mZ - 2, 3, { tint: '#b3302a' }); b.prop('vase_flowers', mX - 7, 3, mZ + 2, 3, { tint: '#f0ece0' });
  b.prop('flag_pole', mX + 12, 0, mZ, 3, { cat: 'far' });

  // ---------------------------------------------------------------- honour roll boards (WWI & WWII) flanking the monument
  hrZ.forEach((z, k) => {
    const ww1 = k === 0;
    const bx = monX; // board faces east (toward the plaza)
    f.box(bx - 1, 0, z - 11, 2, 18, 1, MAT.trim_white); f.box(bx - 1, 0, z + 10, 2, 18, 1, MAT.trim_white);
    f.box(bx, 4, z - 10, 1, 12, 20, MAT.trim_white);
    f.box(bx - 1, 4, z - 10, 1, 12, 20, MAT.sign_navy);
    f.box(bx - 2, 16, z - 12, 3, 1, 24, MAT.roof_shingle_black); f.box(bx - 1, 17, z - 11, 2, 1, 22, MAT.roof_shingle_black);
    f.box(bx - 2, 15, z - 11, 1, 1, 22, MAT.trim_gold);
    f.box(bx - 2, 4, z - 11, 1, 1, 22, MAT.trim_white);
    const lines = ww1
      ? ['HONOR ROLL', 'JUNIPER BAY IN THE GREAT WAR', '1917 - 1918', '212 SERVED - 9 GAVE ALL', '', ...WWI_NINE.map((q) => '* ' + q[0].toUpperCase())]
      : ['HONOR ROLL', 'JUNIPER BAY IN WORLD WAR II', '1941 - 1945', '640 SERVED - 23 GAVE ALL', ''];
    if (!ww1) for (let i = 0; i < WWII_23.length; i += 3) lines.push(WWII_23.slice(i, i + 3).map((s) => '* ' + s.toUpperCase().replace(/,.*/, '')).join('  '));
    tablet(b, lines, bx - 1.05, 5, z, 3, { scale: ww1 ? 0.3 : 0.26, bg: '#1f2f4f', fg: '#f0ece0', border: '#1f2f4f' });
    b.prop('flower_pot', bx - 3, 0, z - 8, 0, { tint: '#e0c040' }); b.prop('flower_pot', bx - 3, 0, z + 8, 0, { tint: '#e0c040' });
    b.prop('flag_stand', bx - 2.5, 0, z + 12.5, 3, {});
    const body = ww1
      ? 'JUNIPER BAY IN THE GREAT WAR\n1917 - 1918\n\nTwo hundred and twelve of our men and women served.\nThese nine gave their lives:\n\n' + WWI_NINE.map((q) => `${q[0]}\n${q[1]} - ${q[2]}`).join('\n\n') + '\n\nNine oaks were planted for them in Juniper Park, Armistice Day, 1919.'
      : 'JUNIPER BAY IN THE SECOND WORLD WAR\n1941 - 1945\n\nSix hundred and forty of our men and women served.\nTwenty-three did not come home. A gold star marks each name.\n\n' + WWII_23.map((s) => '* ' + s).join('\n') + '\n\nThe Bayside Boat Works built eleven wooden minesweepers for the Navy.\nOn V-J Day, August 14, 1945, the whole town came to this square\nand the church bells rang for an hour.\n\nKOREA 1950 - 1953: fourteen of our young men went.\nWelcome home, Pfc. Salvatore Castellano Jr., 7th Infantry Division.';
    readAt(b, bx - 1, 9, z, 3, ww1 ? 'Honor Roll - The Great War' : 'Honor Roll - World War II', body, 3.4);
  });

  // ---------------------------------------------------------------- the big Centennial banner at the Lantern Avenue entrance
  const banW = 88, banX0 = Math.round(lanX - banW / 2), banY = 26, banH = 20;
  for (const px of [banX0 - 1, banX0 + banW]) { f.box(px, 0, 2, 1, banY + banH + 3, 1, MAT.iron_green); f.box(px - 1, 0, 1, 3, 2, 3, MAT.granite); f.box(px, banY + banH + 3, 2, 1, 1, 1, MAT.trim_gold); }
  f.box(banX0, banY, 2, banW, banH, 1, MAT.canvas_white);
  f.box(banX0, banY + banH - 2, 2, banW, 2, 1, MAT.flag_blue); f.box(banX0, banY, 2, banW, 2, 1, MAT.flag_red);
  f.text('HARBOR DAYS', lanX, banY + 10, 1, MAT.flag_red, { align: 'center', font: 'big' });
  f.text('CENTENNIAL 1853-1953', lanX, banY + 3, 1, MAT.flag_blue, { align: 'center', font: 'small' });
  textFace(f, 2, 'HARBOR DAYS', lanX, banY + 10, 3, MAT.flag_red, { font: 'big' });
  textFace(f, 2, 'CENTENNIAL 1853-1953', lanX, banY + 3, 3, MAT.flag_blue);
  bunting(f, [banX0 - 1, banY - 1, 2], [banX0 + banW, banY - 1, 2], 1.5);

  // ---------------------------------------------------------------- the Civic Works sign (south side, facing Market Street)
  {
    const sx0 = Math.round(Math.min(W - 60, lanX + 50)), sz = D - 3, sw = 36;
    f.box(sx0, 0, sz, 1, 14, 1, MAT.wood_post); f.box(sx0 + sw - 1, 0, sz, 1, 14, 1, MAT.wood_post);
    f.box(sx0, 5, sz - 1, sw, 9, 1, MAT.sign_navy);
    f.box(sx0 - 1, 14, sz - 1, sw + 2, 1, 1, MAT.trim_white); f.box(sx0 - 1, 4, sz - 1, sw + 2, 1, 1, MAT.trim_white);
    const mid = sx0 + sw / 2;
    // text faces south (+z): use the back face
    const lines = [['CIVIC WORKS PROJECT', 0.62, '#e8c870'], ['NEW LAMPS FOR HARBOR STREET', 0.5, '#f0ece0'], ['CITY OF JUNIPER BAY - WALTER PEMBERTON, MAYOR', 0.3, '#f0ece0'], ['40 MERCURY-VAPOR STANDARDS - COMPLETION SPRING 1954', 0.26, '#f0ece0']];
    let yy = 12.2;
    for (const [t, sc, fg] of lines) { signLine(b, t, mid, yy, sz - 1 + 1.05, 2, { bg: '#1f2f4f', fg, border: '#1f2f4f', scale: sc }); yy -= 11 / 16 * sc * 4 + 0.35; }
    readAt(b, mid, 6, sz, 2, 'Civic Works Project', 'CIVIC WORKS PROJECT\nNEW LAMPS FOR HARBOR STREET\n\nThe City of Juniper Bay will replace the 1906 arc-lamp standards on Harbor Street\nwith forty modern mercury-vapor lamps, from Pier 1 to the Yacht Club.\n\nAppropriation: $38,400 (Town Meeting, March 1953)\nContractor: Tremblay Electric Co.\nEstimated completion: Spring 1954\n\nWalter Pemberton, Mayor\nBoard of Public Works: J. Crowell, chairman\n\n"A town that lights its waterfront welcomes the world." - Courier editorial, April 1953', 3);
    rect(sx0 - 1, sz - 2, sx0 + sw + 1, sz + 1);
  }

  // ---------------------------------------------------------------- program board near the Lantern entrance
  {
    const px = lanX + 16, pz = 24;
    f.box(px - 5, 0, pz, 1, 10, 1, MAT.wood_post); f.box(px + 4, 0, pz, 1, 10, 1, MAT.wood_post);
    f.box(px - 5, 4, pz, 10, 6, 1, MAT.sign_green);
    f.box(px - 6, 10, pz - 1, 12, 1, 3, MAT.roof_shingle_green);
    signLine(b, 'HARBOR DAYS PROGRAM', px, 8.2, pz - 0.05, 0, { bg: '#1f5a3e', fg: '#f0e2b0', border: '#1f5a3e', scale: 0.4 });
    readAt(b, px, 6, pz, 0, 'Harbor Days Program', 'JUNIPER BAY CENTENNIAL - HARBOR DAYS\nSATURDAY, SEPTEMBER 26, 1953\n\n5:00 A.M.  Halloran & Sons fire the ovens - 400 centennial loaves\n6:00  The fishing fleet comes in to Pier 3\n10:00  THE FAIR OPENS on Founders Square\n11:00  Engine Co. No. 1 demonstration (and Admiral the cat, Maple St.)\n1:00 P.M.  The Harbor Days Band\n2:00  Wedding of Helen Novak & Robert Brennan, St. Brigid\'s\n3:00  Judging of the Centennial Pie Contest\n4:00  Choir practice, First Congregational (all welcome to listen)\n5:30  THE MAYOR\'S CENTENNIAL ADDRESS - City Hall steps\n        Sealing of the Time Capsule, to be opened September 26, 2053\n7:30  Centennial Sock Hop, Juniper Bay High School gym\n8:00  STREET DANCE on the square with the Harbor Days Band\n9:00  FIREWORKS OVER THE HARBOR - best seen from the quay\n\nCentennial Committee: Mrs. Eleanor Pemberton, chairman', 3);
    rect(px - 6, pz - 1, px + 6, pz + 2);
  }

  // ---------------------------------------------------------------- crowd spots
  const pod = b.m(-22, 0, cz);                         // the podium on the City Hall steps (east of the square)
  let nSpeech = 0;
  for (let x = 14; x <= lanX - 8; x += 13) for (let z = 26; z <= D - 26; z += 12) {
    if (blocked(x, z, 6)) continue;
    const s = outSpot(b, grid, 'stand', x + rng.float(-2, 2), 0, z + rng.float(-2, 2), 3, { act: 'listen', tags: ['crowd_speech'], label: 'Listening to the Mayor' });
    s.spread = 2.2; s.faceTo = [pod[0], pod[2]]; nSpeech++;
  }
  // general fair crowd across the whole plaza
  let nFair = 0;
  for (let x = 12; x < W - 10; x += 18) for (let z = 16; z < D - 14; z += 16) {
    const jx = x + rng.float(-3, 3), jz = z + rng.float(-3, 3);
    if (blocked(jx, jz, 8)) continue;
    const s = outSpot(b, grid, 'stand', jx, 0, jz, rng.int(0, 3), { act: rng.pick(['talk', 'stand', 'browse', 'look', 'talk', 'laugh']), tags: ['fair'], label: 'At the Harbor Days fair' });
    s.spread = 2.5; nFair++;
  }
  // dance floor around the bandstand
  let nDance = 0;
  for (let x = bandX - BR - 26; x <= bandX + BR + 10; x += 11) for (let z = 18; z <= D - 18; z += 10) {
    if (Math.hypot(x - bandX, z - cz) < BR + 6 || blocked(x, z, 7)) continue;
    const s = outSpot(b, grid, 'stand', x, 0, z, rng.int(0, 3), { act: 'dance', tags: ['dance'], label: 'Dancing on the square' });
    s.spread = 2.0; nDance++;
  }
  // kids at the games (more)
  for (let i = kidSpots.length; i < 24; i++) {
    const a = rng.float(0, 2 * PI), r = rng.float(RF + 6, RF + 18);
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.9;
    if (blocked(x, z, 4)) continue;
    const s = outSpot(b, grid, 'stand', x, 0, z, rng.int(0, 3), { act: rng.pick(['play', 'play_ball', 'jump_rope', 'cheer']), tags: ['fair_kids'], label: 'At the Harbor Days fair' });
    s.spread = 1.5; kidSpots.push(s);
  }
  // people looking at the monuments
  outSpot(b, grid, 'stand', monX - 16, 0, cz, 1, { act: 'look', tags: ['fair'], label: 'At the Soldiers\' Monument' });
  outSpot(b, grid, 'stand', sX + 14, 0, sZ + 3, 3, { act: 'look', tags: ['fair'], label: 'Looking up at Captain Whitcomb' });
  b.squareStats = { speech: nSpeech, fair: nFair, dance: nDance, kids: kidSpots.length, keepers: stallKeepers.length };
  return b;
}


// =====================================================================================
// CITY HALL (1876) — "the Old Granite Lady", facing Founders Square
// =====================================================================================
function buildCityHall(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'City Hall', kind: 'cityhall', lot, address: lot.address, established: spec.est || 1876,
    lore: 'The "Old Granite Lady", completed 1876. The council chamber served as an influenza ward in 1918.', hours: [8 * 60, 18 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('cityhall' + lot.x);
  const bw = Math.min(128, W - 40), bx0 = Math.round((W - bw) / 2), bx1 = bx0 + bw;
  const bz0 = Math.min(34, Math.round(D * 0.22)), bd = Math.min(96, D - bz0 - 26), bz1 = bz0 + bd;
  const cxm = Math.round(W / 2);
  const TY = 7, FH = 18, y2 = TY + FH, roofY = y2 + FH - 1;
  const tz0 = bz0 - 18, tx0 = bx0 + 12, tx1 = bx1 - 12;
  const sx0 = cxm - 36, sx1 = cxm + 36;

  // ---------------------------------------------------------------- grounds
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(0, -1, 0, W, 1, tz0 + 2, MAT.plaza_cream);
  f.box(0, -1, 0, W, 1, 2, MAT.plaza_dark);
  f.box(sx0 - 6, -1, 2, sx1 - sx0 + 12, 1, tz0 - 2, MAT.granite);
  f.box(bx0 - 4, -1, bz0 - 2, bw + 8, 1, bd + 6, MAT.sidewalk);          // walk around the building
  f.box(bx0 - 4, -1, bz1 + 4, bw + 8, 1, D - bz1 - 4, MAT.asphalt_old);  // back lot
  for (let x = bx0; x < bx1; x += 12) f.box(x, -1, bz1 + 10, 1, 1, 10, MAT.road_white);
  // terrace & grand steps
  f.box(tx0, 0, tz0, tx1 - tx0, TY, bz0 - tz0 + 1, MAT.granite);
  pave(f, tx0, tz0, tx1, bz0, 4, (x, z) => (((Math.floor(x / 4) + Math.floor(z / 4)) % 2) ? MAT.granite : MAT.granite_pink), TY - 1, MAT.granite);
  for (let k = 0; k < TY; k++) f.box(sx0, 0, tz0 - 2 * (TY - k), sx1 - sx0, k + 1, 2, MAT.granite);
  for (let k = 0; k < TY; k++) for (const x of [sx0 - 3, sx1]) f.box(x, 0, tz0 - 2 * (TY - k), 3, k + 3, 2, MAT.granite_pink);
  // balustrade
  const balus = (x0, z0, x1, z1) => {
    const alongX = z0 === z1;
    const n = alongX ? x1 - x0 : z1 - z0;
    for (let i = 0; i < n; i += 2) f.box(alongX ? x0 + i : x0, TY, alongX ? z0 : z0 + i, 1, 3, 1, MAT.limestone);
    f.box(x0, TY + 3, z0, alongX ? n : 1, 1, alongX ? 1 : n, MAT.granite_pink);
  };
  balus(tx0, tz0, sx0 - 3, tz0); balus(sx1 + 3, tz0, tx1, tz0);
  balus(tx0, tz0, tx0, bz0); balus(tx1 - 1, tz0, tx1 - 1, bz0);
  // lamp standards at the foot of the steps
  for (const x of [sx0 - 2, sx1 + 2]) b.prop('street_lamp_double', x, 0, tz0 - 16, 0, {});
  for (const x of [sx0 - 2, sx1 + 1]) b.prop('street_lamp', x, TY + 4, tz0 - 1, 0, { scale: 0.8 });

  // ---------------------------------------------------------------- the building
  f.box(bx0, 0, bz0, bw, TY, bd, MAT.granite);
  shell(f, bx0, TY, bz0, bw, roofY - TY, bd, MAT.granite, MAT.plaster_cream, 2);
  f.box(bx0, TY - 1, bz0, bw, 1, 1, MAT.granite_pink);
  beltCourse(f, bx0, y2 - 1, bw, MAT.limestone, bz0);
  for (const x of [bx0, bx1 - 2]) quoins(f, x, TY, roofY - TY, MAT.limestone, bz0);
  cornice(f, bx0, roofY - 1, bw, MAT.limestone, { z: bz0, brackets: 4 });
  f.box(bx0, roofY, bz0, bw, 1, bd, MAT.ceiling);
  // mansard roof with iron cresting and dormers
  for (let i = 0; i < 4; i++) f.walls(bx0 - 1 + i, roofY + 1 + i * 3, bz0 - 1 + i, bw + 2 - 2 * i, 3, bd + 2 - 2 * i, MAT.roof_slate, 1);
  f.box(bx0 + 3, roofY + 12, bz0 + 3, bw - 6, 1, bd - 6, MAT.roof_tar);
  for (let x = bx0 + 3; x < bx1 - 3; x += 2) { f.box(x, roofY + 13, bz0 + 3, 1, 2, 1, MAT.iron); f.box(x, roofY + 13, bz1 - 4, 1, 2, 1, MAT.iron); }
  for (const dx of [bx0 + 8, bx0 + 22, bx1 - 28, bx1 - 14]) {
    f.box(dx, roofY + 1, bz0 - 2, 6, 7, 4, MAT.roof_slate);
    f.box(dx - 1, roofY + 8, bz0 - 3, 8, 1, 5, MAT.limestone);
    win(f, dx + 1, roofY + 2, bz0 - 2, 4, 5, { t: 2, frame: MAT.trim_white, style: 'arch', sill: false });
  }
  for (const zz of [bz0 + 20, bz0 + 48, bz0 + 76]) for (const dir of [1, 3]) {
    const face = dir === 3 ? bx0 - 1 : bx1 + 1;
    const x = dir === 3 ? face - 1 : face - 3;
    f.box(x, roofY + 1, zz, 4, 7, 6, MAT.roof_slate);
    winSide(f, dir, zz + 1, roofY + 2, dir === 3 ? face - 1 : face + 1, 4, 5, { t: 1, frame: MAT.trim_white, sill: false });
  }
  chimney(f, bx0 + 6, roofY, bz1 - 12, 4, 4, 20, MAT.granite, MAT.limestone);
  chimney(f, bx1 - 10, roofY, bz1 - 12, 4, 4, 20, MAT.granite, MAT.limestone);

  // ---------------------------------------------------------------- portico, pediment & lettering
  const px0 = cxm - 40, px1 = cxm + 40, pz0 = tz0 + 2;
  const colX = [px0 + 4, px0 + 18, px0 + 32, px1 - 32, px1 - 18, px1 - 4];
  for (const x of colX) {
    f.cylinder(x, TY, pz0 + 3, 3.2, 2, MAT.granite);
    f.cylinder(x, TY + 2, pz0 + 3, 2.3, 25, MAT.limestone);
    f.cylinder(x, TY + 27, pz0 + 3, 3.2, 2, MAT.granite);
  }
  const eY = TY + 29;
  f.box(px0, eY, pz0, px1 - px0, 7, bz0 - pz0, MAT.granite);
  f.box(px0 - 1, eY + 6, pz0 - 1, px1 - px0 + 2, 1, bz0 - pz0 + 1, MAT.limestone);
  f.box(px0, eY, pz0 - 1, px1 - px0, 1, 1, MAT.limestone);
  f.text('CITY OF JUNIPER BAY', cxm, eY + 1, pz0 - 1, MAT.trim_gold, { align: 'center', font: 'small' });
  for (let i = 0; i < 10; i++) {
    f.box(px0 + 4 * i, eY + 7 + i, pz0, px1 - px0 - 8 * i, 1, bz0 - pz0 + 3, MAT.granite);
    f.box(px0 + 4 * i - 1, eY + 7 + i, pz0 - 1, 5, 1, 1, MAT.limestone);
    f.box(px1 - 4 * i - 4, eY + 7 + i, pz0 - 1, 5, 1, 1, MAT.limestone);
  }
  discOn(f, 0, cxm, eY + 11, pz0 - 1, 3.2, MAT.trim_gold);
  discOn(f, 0, cxm, eY + 11, pz0 - 2, 2.2, MAT.sign_navy);
  f.box(cxm - 2, eY + 10, pz0 - 3, 4, 1, 1, MAT.trim_gold); f.box(cxm, eY + 11, pz0 - 3, 1, 2, 1, MAT.canvas_white);
  f.text('1876', cxm - 16, eY + 8, pz0 - 1, MAT.trim_gold, { align: 'center', font: 'small' });
  f.text('1953', cxm + 16, eY + 8, pz0 - 1, MAT.trim_gold, { align: 'center', font: 'small' });
  // Centennial bunting swagged between the columns and along the entablature
  for (let i = 0; i < colX.length - 1; i++) bunting(f, [colX[i], eY - 1, pz0], [colX[i + 1], eY - 1, pz0], 3);
  for (const x of [cxm - 30, cxm, cxm + 30]) b.prop('bunting_fan', x, eY - 5, pz0 - 0.2, 0, { cat: 'exterior' });
  for (const x of [tx0 + 8, sx0 - 10, sx1 + 10, tx1 - 8]) b.prop('bunting_fan', x, TY - 3, tz0 - 0.2, 0, { cat: 'exterior' });

  // ---------------------------------------------------------------- clock tower
  const twx0 = cxm - 12, twz0 = bz0 + 4, tw = 24, tY0 = roofY + 1, tY1 = roofY + 30;
  shell(f, twx0, tY0, twz0, tw, tY1 - tY0, tw, MAT.granite, null, 1);
  f.box(twx0 + 1, tY0, twz0 + 1, tw - 2, 1, tw - 2, MAT.wood_mid);
  for (const [x, z] of [[twx0, twz0], [twx0 + tw - 2, twz0]]) quoins(f, x, tY0, tY1 - tY0, MAT.limestone, z);
  f.box(twx0 - 1, tY1 - 16, twz0 - 1, tw + 2, 1, tw + 2, MAT.limestone);
  f.box(twx0 - 1, tY1, twz0 - 1, tw + 2, 1, tw + 2, MAT.limestone);
  const clockY = tY1 - 8;
  clockOn(f, 0, cxm, clockY, twz0 - 1, 6);
  clockOn(f, 2, cxm, clockY, twz0 + tw, 6);
  clockOn(f, 3, twz0 + tw / 2, clockY, twx0 - 1, 6);
  clockOn(f, 1, twz0 + tw / 2, clockY, twx0 + tw, 6);
  f.text('1876', cxm, tY0 + 5, twz0 - 1, MAT.trim_gold, { align: 'center', font: 'small' });
  for (const dir of [0, 2]) win(dir === 0 ? f : f.faceFrame('back'), dir === 0 ? cxm - 2 : W - cxm - 2, tY0 + 2, dir === 0 ? twz0 : D - twz0 - tw, 4, 1, { t: 1, frame: MAT.limestone, sill: false });
  // belfry: corner piers and arches, the bell, then a copper cap and flagpole
  const bY0 = tY1 + 1;
  for (const [x, z] of [[twx0, twz0], [twx0 + tw - 4, twz0], [twx0, twz0 + tw - 4], [twx0 + tw - 4, twz0 + tw - 4]]) f.box(x, bY0, z, 4, 12, 4, MAT.granite);
  f.box(twx0, bY0 + 9, twz0, tw, 3, tw, MAT.granite);
  f.archCarve(twx0 + 5, bY0, twz0, tw - 10, 9, tw);
  f.faceFrame('left').archCarve(D - twz0 - tw + 5, bY0, twx0, tw - 10, 9, tw);
  f.box(twx0, bY0 - 1, twz0, tw, 1, tw, MAT.limestone);
  f.box(twx0 - 1, bY0 + 12, twz0 - 1, tw + 2, 1, tw + 2, MAT.limestone);
  f.box(cxm - 1, bY0 + 6, twz0 + 11, 2, 3, 2, MAT.wood_dark);
  f.cylinder(cxm, bY0 + 2, twz0 + 12, 3, 4, MAT.trim_gold, 1);
  f.box(cxm - 1, bY0 + 1, twz0 + 11, 2, 1, 2, MAT.trim_gold);
  const capTop = bY0 + 13 + f.hip(twx0 + 1, bY0 + 13, twz0 + 1, tw - 2, tw - 2, MAT.roof_copper, { overhang: 1, rise: 2 });
  f.box(cxm, capTop - 2, twz0 + 12, 1, 14, 1, MAT.steel_white);
  f.box(cxm, capTop + 9, twz0 + 13, 1, 3, 5, MAT.flag_red); f.box(cxm, capTop + 10, twz0 + 13, 1, 1, 5, MAT.flag_white);
  f.box(cxm, capTop + 10, twz0 + 13, 1, 2, 2, MAT.flag_blue);
  b.light(cxm, clockY, twz0 - 3, { color: [1, 0.95, 0.8], radius: 6, mode: 'night' });

  // ---------------------------------------------------------------- facade openings
  doorway(f, cxm - 4, TY, bz0, 8, 13, { frame: MAT.limestone, t: 2, transom: true, step: false });
  f.box(cxm - 6, TY + 15, bz0 - 1, 12, 1, 1, MAT.limestone);
  const wo = { t: 2, frame: MAT.limestone, lintelWide: true, glass: MAT.glass };
  const LX0 = cxm - 20, LX1 = cxm + 20;
  winRow(f, bx0 + 2, LX0, TY + 3, bz0, 5, 10, 3, wo);
  winRow(f, LX1 + 1, bx1 - 2, TY + 3, bz0, 5, 10, 3, wo);
  winRow(f, bx0 + 2, LX0, y2 + 3, bz0, 5, 10, 3, { ...wo, style: 'arch' });
  winRow(f, LX1 + 1, bx1 - 2, y2 + 3, bz0, 5, 10, 3, { ...wo, style: 'arch' });
  for (const x of [LX0 + 4, LX1 - 9]) { win(f, x, TY + 3, bz0, 5, 10, wo); win(f, x, y2 + 3, bz0, 5, 10, { ...wo, style: 'arch' }); }
  win(f, cxm - 4, y2 + 3, bz0, 8, 10, { ...wo, style: 'arch', glass: MAT.glass_stained_gold });
  for (const dir of [1, 3]) {
    const face = dir === 3 ? bx0 : bx1;
    for (const zz of [bz0 + 8, bz0 + 22, bz0 + 36, bz0 + 56, bz0 + 70, bz0 + 84]) {
      winSide(f, dir, zz, TY + 3, face, 5, 10, wo);
      winSide(f, dir, zz, y2 + 3, face, 5, 10, { ...wo, style: 'arch' });
    }
  }
  for (const x of [bx0 + 8, bx0 + 22, LX0 + 6, LX1 - 11, bx1 - 27, bx1 - 13]) { winSide(f, 2, x, TY + 3, bz1, 5, 10, wo); winSide(f, 2, x, y2 + 3, bz1, 5, 10, { ...wo, style: 'arch' }); }
  // cornerstone & dedication stones
  f.box(bx0 + 2, TY, bz0 - 1, 10, 4, 1, MAT.granite_pink);
  signLine(b, 'A.D. 1874', bx0 + 7, TY + 1.4, bz0 - 1.05, 0, { bg: '#b39488', fg: '#3a2a22', border: '#b39488', scale: 0.4 });
  readAt(b, bx0 + 7, TY + 2, bz0 - 1, 0, 'Cornerstone', 'THIS CORNER STONE\nWAS LAID JULY 4, 1874\nBY THE TOWN OF JUNIPER BAY\n\nHammatt & Loring, Architects, Boston\nGranite from the Crowell Quarry, Juniper Hill\nCompleted December 1876, at a cost of $86,300\n\n(Sealed within: a Courier of that date, a list of the 1,904 inhabitants,\nand a silver dollar given by Capt. Elias Whitcomb.)', 2.6);

  // ---------------------------------------------------------------- the 1934 strike plaque, on the steps
  f.box(sx0 - 3, 4, tz0 - 3, 3, 3, 1, MAT.granite_pink);
  plaque(b, 'JULY 1934', sx0 - 1.5, 4.6, tz0 - 3.05, 0, 'ON THESE STEPS\nIn July 1934 the men and women of the Harbor Canning Company\nstood for nineteen days.\n\nOn July 9, Casimir Novak, 29, cannery hand, spoke here\nto three thousand people:\n"We do not ask for charity. We ask for a nickel, and to be counted."\n\nThe strike was settled on July 27, 1934.\nThe union won a nickel an hour.\n\nPlaced by Local 1188, Cannery Workers\' Union, Labor Day 1946.', { scale: 0.4 });

  // ---------------------------------------------------------------- the Mayor's platform for the Centennial address
  const podZ = tz0 + 4;
  b.prop('podium_outdoor', cxm, TY, podZ, 0, {});
  b.prop('mic_stand', cxm + 1.5, TY, podZ - 1.2, 0, {});
  for (const x of [cxm - 7, cxm + 7]) b.prop('flag_stand', x, TY, podZ + 2, 0, {});
  const terr = [b.navPoint(0, cxm - 12, TY, tz0 + 7), b.navPoint(0, cxm + 12, TY, tz0 + 7), b.navPoint(0, cxm, TY, tz0 + 14)];
  ctx.nav.chain([terr[0], terr[2], terr[1]]);
  const tSpot = (pose, x, z, rot, o) => { const s = b.spot(pose, x, TY, z, rot, { room: 0, ...o }); let best = terr[0], bd2 = 1e9; for (const n of terr) { const p = ctx.nav.pos(n), q = b.m(x, TY, z); const d = Math.hypot(p[0] - q[0], p[2] - q[2]); if (d < bd2) { bd2 = d; best = n; } } ctx.nav.link(s.node, best); s.pendingLink = false; return s; };
  tSpot('stand', cxm, podZ + 2.4, 0, { act: 'speech', tags: ['podium'], label: 'At the podium' });
  for (const x of [cxm - 17, cxm - 11, cxm + 11, cxm + 17]) tSpot('stand', x, tz0 + 8, 0, { act: 'listen', tags: ['stage_guest'], label: 'On the platform' });
  for (let x = cxm - 22; x <= cxm + 22; x += 4) if (Math.abs(x - cxm) > 5) b.prop('chair_folding', x, TY, tz0 + 11, 0, {});
  // the time capsule on its draped table
  b.prop('table_dining', cxm + 27, TY, tz0 + 5, 0, { tint: '#f0ece0' });
  b.prop('time_capsule', cxm + 27, TY + 3, tz0 + 5, 0, {});
  b.prop('vase_flowers', cxm + 24.5, TY + 3, tz0 + 5, 0, { tint: '#b3302a' });
  tSpot('stand', cxm + 27, tz0 + 8, 0, { act: 'stand', tags: ['time_capsule'], label: 'Guarding the time capsule' });
  readAt(b, cxm + 27, TY + 4, tz0 + 5, 0, 'The Centennial Time Capsule', 'THE JUNIPER BAY CENTENNIAL TIME CAPSULE\nSealed September 26, 1953\nTO BE OPENED SEPTEMBER 26, 2053\n\nCopper, made by the apprentices of Bayside Boat Works.\nIt will lie beneath the Soldiers\' Monument for one hundred years.\n\nCONTENTS\nA letter from Mayor Walter Pemberton to the Mayor of 2053\nA letter from Miss Augusta Whitcomb, great-granddaughter of the founder\n312 letters from the schoolchildren of Juniper Bay\nThe Courier, Sunday Centennial edition (48 pages)\nA Harbor Canning Co. sardine tin (empty, by request of the committee)\nA Halloran & Sons centennial loaf stamp\nThe 1953 telephone directory (4,212 listings)\nA program from the Rialto: "Shane"\nPhotographs of every street in town, by Lowell Photography Studio\nThe Centennial Book, with every signature collected at the fair\n\n"Be kind to us, 2053." - A.W.', 3);

  // ---------------------------------------------------------------- side lawns: trees, the Liberty Elm, benches, flags
  const lawnSpots = [];
  for (const [x0, x1] of [[2, bx0 - 6], [bx1 + 6, W - 2]]) {
    if (x1 - x0 < 10) continue;
    const mx = (x0 + x1) / 2;
    b.prop('tree_elm_yellow', mx, 0, bz0 + 20, 0, { cat: 'far', scale: 1.2 });
    b.prop('tree_maple_red', mx, 0, bz0 + 62, 0, { cat: 'far' });
    f.box(Math.round(mx) - 5, -1, bz0 + 36, 10, 1, 10, MAT.flowerbed_red);
    b.prop('flag_pole', mx, 0, bz0 + 41, 0, { cat: 'far' });
    b.prop('bench_park', mx, 0, bz0 + 30, 0, {}); b.playerSeat(mx, 0, bz0 + 30, 0, 0.45);
    lawnSpots.push([mx, bz0 + 30.4]);
  }
  if (bx0 > 16) readAt(b, bx0 / 2, 3, bz0 + 20, 0, 'The Liberty Elm', 'THE LIBERTY ELM\nPlanted by the schoolchildren of Juniper Bay\non the dedication of City Hall, December 1876.\nIt survived the Great Gale of 1898 and the hurricane of 1938.\n"It is the oldest thing on this lawn, including the Council." - Courier, 1949', 3);
  b.prop('car_sedan', bx0 + 20, 0, bz1 + 15, 2, { tint: '#1c1c20', cat: 'far' });
  b.prop('car_police', bx0 + 44, 0, bz1 + 15, 2, { cat: 'far' });
  smallSign(b, 'RESERVED - MAYOR', bx0 + 20, 0, bz1 + 21);

  // ---------------------------------------------------------------- interior
  const IX0 = bx0 + 2, IX1 = bx1 - 2, IZ0 = bz0 + 2, IZ1 = bz1 - 2;
  const ZB = IZ1 - 30, ZW = bz0 + 50;       // back of the lobby/stair top; wing front/back split
  const stairX = cxm - 5, stairZ = ZB - FH * 2;
  // floors
  f.box(IX0, TY - 1, IZ0, IX1 - IX0, 1, IZ1 - IZ0, MAT.floor_marble);
  pave(f, LX0 + 1, IZ0, LX1, ZB, 4, (x, z) => ((Math.floor(x / 4) + Math.floor(z / 4)) % 2 ? MAT.floor_marble : MAT.marble), TY - 1, MAT.floor_marble);
  f.box(cxm - 6, TY - 1, IZ0, 12, 1, stairZ - IZ0, MAT.carpet_red);
  f.box(IX0, TY - 1, IZ0, LX0 - IX0, 1, IZ1 - IZ0, MAT.floor_oak);
  f.box(LX1 + 1, TY - 1, IZ0, IX1 - LX1 - 1, 1, IZ1 - IZ0, MAT.floor_oak);
  f.box(IX0, TY - 1, ZW + 1, LX0 - IX0, 1, IZ1 - ZW - 1, MAT.floor_concrete);  // vault
  // second floor slabs (wings + landing over the back hall)
  f.box(IX0, y2 - 1, IZ0, LX0 - IX0, 1, IZ1 - IZ0, MAT.floor_walnut);
  f.box(LX1 + 1, y2 - 1, IZ0, IX1 - LX1 - 1, 1, IZ1 - IZ0, MAT.floor_oak_z);
  f.box(LX0 + 1, y2 - 1, ZB, LX1 - LX0 - 1, 1, IZ1 - ZB, MAT.floor_marble);
  f.box(IX0, y2 - 1, IZ0, 1, 1, 1, MAT.floor_oak);
  // partitions: lobby side walls (full height), wing splits, back hall wall
  partitionZ(f, IZ0, IZ1, TY, LX0, roofY - TY, MAT.marble, [{ at: IZ0 + 18, w: 6, h: 12 }, { at: ZB + 10, w: 4 }]);
  partitionZ(f, IZ0, IZ1, TY, LX1, roofY - TY, MAT.marble, [{ at: IZ0 + 18, w: 6, h: 12 }, { at: ZB + 10, w: 4 }]);
  f.box(LX0, y2, ZB + 6, 1, 10, 6, 0); f.box(LX1, y2, ZB + 6, 1, 10, 6, 0);            // upstairs doorways off the landing
  f.box(LX0, y2 + 10, ZB + 6, 1, FH - 11, 6, MAT.marble); f.box(LX1, y2 + 10, ZB + 6, 1, FH - 11, 6, MAT.marble);
  partitionX(f, IX0, LX0, TY, ZW, FH - 1, MAT.plaster_cream, [{ at: IX0 + 18, w: 4 }]);
  partitionX(f, LX1 + 1, IX1, TY, ZW, FH - 1, MAT.plaster_cream, [{ at: IX1 - 22, w: 4 }]);
  partitionX(f, IX0, LX0, y2, ZW, FH - 1, MAT.wood_panel, [{ at: IX0 + 18, w: 4 }]);
  partitionX(f, LX0 + 1, LX1, TY, ZB, FH - 1, MAT.marble, [{ at: LX0 + 3, w: 5 }, { at: LX1 - 8, w: 5 }]);
  // lobby wainscot & pilasters
  f.walls(LX0 + 1, TY, IZ0, LX1 - LX0 - 1, 4, ZB - IZ0, MAT.marble, 1);
  for (let z = IZ0 + 6; z < ZB - 2; z += 10) for (const x of [LX0 + 1, LX1 - 1]) f.box(x, TY, z, 1, roofY - TY, 2, MAT.limestone);
  f.walls(LX0 + 1, roofY - 3, IZ0, LX1 - LX0 - 1, 2, ZB - IZ0, MAT.trim_gold, 1);
  // re-open doorways the wainscot closed
  f.carve(LX0, TY, IZ0 + 18, 2, 12, 6); f.carve(LX1 - 1, TY, IZ0 + 18, 2, 12, 6);
  f.carve(cxm - 4, TY, bz0, 8, 13, 3);

  // rooms
  const lobby = b.room('Grand Lobby', LX0 + 1, TY, IZ0, LX1 - LX0 - 1, roofY - TY, ZB - IZ0, { lightMode: 'always', kind: 'hall', nav: [cxm, IZ0 + 8] });
  const clerk = b.room("Town Clerk's Office", IX0, TY, IZ0, LX0 - IX0, FH - 1, ZW - IZ0, { lightMode: 'always' });
  const vault = b.room('Town Records Vault', IX0, TY, ZW + 1, LX0 - IX0, FH - 1, IZ1 - ZW - 1, { lightMode: 'auto', ambient: 0.1 });
  const mural = b.room('WPA Mural Room', LX1 + 1, TY, IZ0, IX1 - LX1 - 1, FH - 1, ZW - IZ0, { lightMode: 'always' });
  const deeds = b.room('Registry of Deeds', LX1 + 1, TY, ZW + 1, IX1 - LX1 - 1, FH - 1, IZ1 - ZW - 1, { lightMode: 'auto' });
  const back = b.room('Back Hall', LX0 + 1, TY, ZB + 1, LX1 - LX0 - 1, FH - 1, IZ1 - ZB - 1, { lightMode: 'auto' });
  const landing = b.room('Upper Landing', LX0 + 1, y2, ZB, LX1 - LX0 - 1, FH - 1, IZ1 - ZB, { lightMode: 'auto' });
  const mayor = b.room("Mayor's Office", IX0, y2, IZ0, LX0 - IX0, FH - 1, ZW - IZ0, { lightMode: 'auto' });
  const ante = b.room("Mayor's Anteroom", IX0, y2, ZW + 1, LX0 - IX0, FH - 1, IZ1 - ZW - 1, { lightMode: 'auto' });
  const council = b.room('Council Chamber', LX1 + 1, y2, IZ0, IX1 - LX1 - 1, FH - 1, IZ1 - IZ0, { lightMode: 'auto', kind: 'hall' });
  // doors & stairs
  const main = b.entrance(lobby, cxm - 2, TY, bz0, { outZ: 1, outY: 0, leaf: 'door_wood', tint: '#4a3020', main: true });
  b.door(null, null, cxm + 2, TY, bz0, { leaf: 'door_wood', tint: '#4a3020' });
  for (const n of terr) ctx.nav.link(n, main);
  b.door(lobby, clerk, LX0, TY, IZ0 + 21, { axis: 'z', leaf: false });
  b.door(lobby, mural, LX1, TY, IZ0 + 21, { axis: 'z', leaf: false });
  b.door(clerk, vault, IX0 + 20, TY, ZW, { leaf: false });
  b.door(mural, deeds, IX1 - 20, TY, ZW, { leaf: 'door_wood' });
  b.door(lobby, back, LX0 + 5.5, TY, ZB, { leaf: 'door_wood' });
  b.door(lobby, back, LX1 - 5.5, TY, ZB, { leaf: 'door_wood' });
  b.door(back, vault, LX0, TY, ZB + 12, { axis: 'z', leaf: 'door_wood' });
  b.door(back, deeds, LX1, TY, ZB + 12, { axis: 'z', leaf: 'door_wood' });
  b.door(landing, ante, LX0, y2, ZB + 9, { axis: 'z', leaf: 'door_wood', tint: '#3a2418' });
  b.door(landing, council, LX1, y2, ZB + 9, { axis: 'z', leaf: false });
  b.door(ante, mayor, IX0 + 20, y2, ZW, { leaf: 'door_wood', tint: '#3a2418' });
  // grand staircase (carpeted) from the lobby up to the landing, with brass-capped balustrades
  stairs(f, stairX, TY, stairZ, '+z', FH, { w: 10, run: 2, mat: MAT.marble, rail: false });
  for (let i = 0; i < FH; i++) f.box(stairX + 2, TY + i, stairZ + 2 * i, 6, 1, 2, MAT.carpet_red);
  for (let i = 0; i < FH; i += 1) for (const x of [stairX - 1, stairX + 10]) f.box(x, TY + i + 1, stairZ + 2 * i, 1, i % 2 ? 1 : 3, 2, MAT.wood_dark);
  for (const x of [stairX - 1, stairX + 10]) { f.box(x, TY, stairZ - 2, 1, 5, 1, MAT.wood_dark); f.box(x, TY + 5, stairZ - 2, 1, 1, 1, MAT.trim_gold); }
  b.stairs(lobby, [cxm, TY, stairZ - 2], landing, [cxm, y2, ZB + 2]);
  // gallery railing along the landing edge over the lobby
  for (let x = LX0 + 1; x < LX1; x += 2) if (x < stairX - 1 || x > stairX + 10) f.box(x, y2, ZB, 1, 3, 1, MAT.wood_dark);
  f.box(LX0 + 1, y2 + 3, ZB, stairX - LX0 - 2, 1, 1, MAT.wood_dark); f.box(stairX + 11, y2 + 3, ZB, LX1 - stairX - 11, 1, 1, MAT.wood_dark);
  // rear entrance down to the back lot
  doorSide(f, 2, cxm - 2, TY, bz1, 4, 9, { frame: MAT.limestone, t: 2, step: false });
  for (let k = 0; k < TY; k++) f.box(cxm - 4, 0, bz1 + 2 * (TY - 1 - k), 8, k + 1, 2, MAT.granite);
  const rear = b.entrance(back, cxm, TY, bz1 - 1, { inside: -3, outZ: bz1 + 16, outY: 0, leaf: 'door_wood', tint: '#4a3020', main: false });
  linkToSidewalk(ctx, main); linkToSidewalk(ctx, rear, 30);

  // ---------------------------------------------------------------- lobby furnishings
  for (const z of [IZ0 + 14, IZ0 + 34]) b.prop('chandelier', cxm, roofY - 8, z, 0, {});
  b.light(cxm, roofY - 10, IZ0 + 24, { mode: 'room', room: lobby, radius: 16, color: [1, 0.88, 0.7] });
  for (const z of [IZ0 + 10, IZ0 + 30]) for (const [x, rot] of [[LX0 + 3, 1], [LX1 - 3, 3]]) { b.prop('bench_station', x, TY, z, rot, {}); b.spot('sit', x, TY, z, rot, { room: lobby, act: rng.pick(['read', 'sit', 'wait']), tags: ['civic', 'wait'], seat: 0.45 }); b.playerSeat(x, TY, z, rot, 0.45); }
  b.prop('display_case_museum', cxm - 12, TY, IZ0 + 22, 1, {});
  readAt(b, cxm - 12, TY + 4, IZ0 + 22, 1, 'The Town Charter (facsimile)', 'AN ACT TO INCORPORATE THE TOWN OF JUNIPER BAY\n(Facsimile. The original is kept in the Records Vault.)\n\nBe it enacted by the Senate and House of Representatives, in General Court assembled:\nThat the territory lying about the cove called Juniper Bay, with the inhabitants thereon,\nis hereby incorporated into a town by the name of JUNIPER BAY,\nwith all the powers, privileges and immunities which other towns do enjoy.\n\nApproved March 4, 1853.\n\nFirst selectmen: Elias Whitcomb, Obadiah Crowell, Jonas Beal.\nInhabitants at incorporation: 212.');
  b.prop('display_case_museum', cxm + 12, TY, IZ0 + 22, 3, {});
  readAt(b, cxm + 12, TY + 4, IZ0 + 22, 3, 'The Centennial in Pictures', 'CENTENNIAL EXHIBIT: A HUNDRED YEARS OF CITY HALL\n\n1. The dedication, December 1876: the Hibernian band and 2,000 in the snow.\n2. The Great Fire, June 11, 1902: bucket lines on these steps, the sky black over Market Street.\n3. November 11, 1918: the Armistice, announced from the portico while the influenza ward\n    was still open upstairs.\n4. July 1934: the strikers on the steps. Casimir Novak at the top, hat in hand.\n5. September 22, 1938: the morning after the hurricane. Rowboats on Harbor Street.\n6. August 14, 1945: V-J Day. You cannot see the square for the people.\n\nLent by Lowell Photography Studio and the Historical Society.');
  b.prop('clock_grandfather', LX1 - 2, TY, ZB - 3, 3, {});
  b.prop('flag_stand', cxm - 8, TY, ZB - 38, 0, {}); b.prop('flag_stand', cxm + 8, TY, ZB - 38, 0, {});
  b.prop('palm_pot', LX0 + 3, TY, IZ0 + 2, 0, {}); b.prop('palm_pot', LX1 - 3, TY, IZ0 + 2, 0, {});
  b.prop('umbrella_stand', cxm + 6, TY, IZ0 + 1.5, 0, {});
  signLine(b, 'DIRECTORY', LX0 + 1.05, TY + 8.5, IZ0 + 10, 1, { bg: '#1d1d22', fg: '#e8c870', border: '#c9a24a', scale: 0.6 });
  tablet(b, ['TOWN CLERK .......... 1', 'RECORDS VAULT ....... 1', 'WPA MURAL ROOM ...... 1', 'REGISTRY OF DEEDS ... 1', 'MAYOR ............... 2', 'COUNCIL CHAMBER ..... 2'], LX0 + 1.05, TY + 3.5, IZ0 + 10, 1, { scale: 0.32, bg: '#1d1d22', fg: '#f0ece0', border: '#1d1d22' });
  const custodian = b.spot('stand', cxm + 6, TY, IZ0 + 26, 1, { room: lobby, act: 'mop', tags: ['work'] });
  const custodian2 = b.spot('stand', cxm - 8, TY, ZB + 10, 1, { room: back, act: 'sweep', tags: ['work'] });
  b.job('custodian', [custodian, custodian2], { shift: ['8:00', '19:30'], title: 'custodian', outfit: 'mechanic' });
  for (let i = 0; i < 3; i++) b.spot('stand', cxm + rng.float(-10, 10), TY, IZ0 + 18 + i * 6, rng.int(0, 3), { room: lobby, act: 'look', tags: ['civic', 'visit'] });

  // ---------------------------------------------------------------- Town Clerk's office
  const cW = LX0 - IX0;
  for (let x = IX0 + 3; x < LX0 - 3; x += 4) b.prop('counter_shop', x + 2, TY, IZ0 + 20, 2, { tint: '#6a4a30' });
  f.box(IX0 + 2, TY + 3, IZ0 + 20, cW - 6, 1, 1, MAT.wood_dark);
  const clerkSpot = b.spot('stand', IX0 + cW / 2, TY, IZ0 + 17, 2, { room: clerk, act: 'counter', tags: ['clerk'] });
  const clerkDesk = officeDesk(b, clerk, IX0 + 10, TY, IZ0 + 8, 1, {});
  officeDesk(b, clerk, IX0 + 26, TY, IZ0 + 8, 3, { typewriter: true });
  b.job('town clerk', [clerkSpot, clerkDesk], { shift: ['9:00', '13:00'], title: 'town clerk', outfit: 'clerk' });
  b.spot('stand', IX0 + cW / 2, TY, IZ0 + 24, 0, { room: clerk, act: 'talk', tags: ['customer', 'civic'] });
  for (let z = IZ0 + 26; z < ZW - 2; z += 4) b.prop('filing_cabinet', IX0 + 1.2, TY, z, 1, {});
  for (let x = IX0 + 4; x < LX0 - 4; x += 5) b.prop('bookshelf', x, TY, ZW - 1.2, 0, { tint: '#3a2a1c' });
  b.prop('books_stack', IX0 + 12, TY + 3.8, IZ0 + 20, 0, {});
  b.prop('clock_wall', IX0 + cW / 2, TY + 11, IZ0 + 0.6, 2, {});
  b.prop('ceiling_lamp', IX0 + cW / 2, TY + 13, IZ0 + 12, 0, {});
  b.prop('ceiling_lamp', IX0 + cW / 2, TY + 13, IZ0 + 36, 0, {});
  signLine(b, 'TOWN CLERK - LICENSES - VITAL RECORDS', IX0 + cW / 2, TY + 9, IZ0 + 20.6, 2, { bg: '#1d1d22', fg: '#e8c870', border: '#c9a24a', scale: 0.4 });
  readAt(b, IX0 + cW / 2, TY + 5, IZ0 + 21, 2, 'Notices at the Clerk\'s counter', 'NOTICES\n\nMARRIAGE INTENTIONS FILED\nHelen Stella Novak, 22, bookkeeper, of Maple Street, and\nRobert Joseph Brennan, 26, linotype operator, of Church Street.\nIntentions filed September 4; license issued September 9, 1953.\n\nDOG LICENSES are due April 1. "Admiral" (cat, Mrs. M. Hatch) is not a dog\nand does not require a license, the Clerk has explained twice.\n\nBIRTHS may be registered weekdays 9 to 5. Fathers please remain calm.\n\nThis office is open Saturday until 1 o\'clock for the Centennial.');
  readAt(b, IX0 + 26, TY + 4, IZ0 + 8, 0, 'Open ledger: Vital Records, Vol. XLI', 'BIRTHS REGISTERED, SEPTEMBER 1953\n\nSept. 2 - Dominic Paul Russo, son of Vincent & Anna Russo, Market St.\nSept. 7 - Linda Mae Gould, dau. of Henry & Frances Gould, Orchard St.\nSept. 14 - Theresa Silva, dau. of Manuel & Maria Silva, Harbor St.\nSept. 19 - twins, John and James Tremblay, sons of Lucien & Rose Tremblay, Mill St.\nSept. 26 - (space left blank. Mrs. Carol Kaminski is at St. Luke\'s.)');

  // ---------------------------------------------------------------- Town Records Vault
  b.prop('bank_vault_door', IX0 + 20, TY, ZW + 1.4, 0, {});
  for (let z = ZW + 5; z < IZ1 - 2; z += 5) for (const x of [IX0 + 1.5, LX0 - 1.5]) b.prop('bookshelf', x, TY, z, x < IX0 + 5 ? 1 : 3, { tint: '#5a4a3a' });
  for (let z = ZW + 8; z < IZ1 - 6; z += 8) { f.box(IX0 + 10, TY, z, cW - 20, 7, 2, MAT.wood_dark); f.box(IX0 + 10, TY + 1, z, cW - 20, 5, 2, MAT.bookshelf_books); }
  b.prop('display_case_museum', IX0 + cW / 2, TY, IZ1 - 4, 0, {});
  readAt(b, IX0 + cW / 2, TY + 4, IZ1 - 4, 0, 'The original charter', 'THE ORIGINAL CHARTER OF THE TOWN, 1853\nParchment, signed by the Governor. Water-stained at one corner:\nit was carried up to the church loft in the Great Fire of 1902\nand again in the hurricane of 1938, by the same clerk, Miss Lydia Beal.\n\nBeside it: the first tax list (1854), 43 names, total assessment $11,860,\nand the minute book of the first Town Meeting, opened with these words:\n"Voted, that we are a town."');
  b.prop('ceiling_lamp', IX0 + cW / 2, TY + 13, ZW + 20, 0, {});
  b.spot('stand', IX0 + cW / 2, TY, IZ1 - 8, 2, { room: vault, act: 'read_stand', tags: ['civic'] });

  // ---------------------------------------------------------------- WPA Mural Room: "The Founding of Juniper Bay" painted across the back wall
  {
    const mx0 = LX1 + 2, mx1 = IX1 - 1, mz = ZW - 1, my0 = TY + 2, mh = 12;
    const mw = mx1 - mx0;
    f.box(mx0, my0, mz, mw, mh, 1, MAT.plaster_blue);                       // sky
    f.box(mx0, my0 + mh - 3, mz, mw, 3, 1, MAT.plaster_yellow);             // sunrise band
    f.box(mx0, my0, mz, mw, 4, 1, MAT.sign_blue);                           // the bay
    f.box(mx0, my0, mz, Math.round(mw * 0.35), 6, 1, MAT.grass);            // the meadow shore
    f.box(mx0, my0 + 6, mz, Math.round(mw * 0.22), 3, 1, MAT.leaves_dark); // junipers on the hill
    // the schooner JUNIPER
    const sx = mx0 + Math.round(mw * 0.62);
    f.box(sx - 6, my0 + 3, mz, 12, 2, 1, MAT.sign_brown); f.box(sx - 5, my0 + 2, mz, 10, 1, 1, MAT.sign_black);
    f.box(sx - 2, my0 + 5, mz, 1, 7, 1, MAT.wood_dark); f.box(sx + 2, my0 + 5, mz, 1, 6, 1, MAT.wood_dark);
    f.box(sx - 5, my0 + 6, mz, 3, 5, 1, MAT.canvas_white); f.box(sx - 1, my0 + 6, mz, 3, 4, 1, MAT.canvas_white); f.box(sx + 3, my0 + 5, mz, 2, 3, 1, MAT.canvas_white);
    // settlers on the shore, the salt house and the first houses
    for (let i = 0; i < 6; i++) { const px = mx0 + 3 + i * 2; f.box(px, my0 + 6, mz, 1, 2, 1, [MAT.sign_red, MAT.sign_navy, MAT.sign_brown][i % 3]); f.box(px, my0 + 8, mz, 1, 1, 1, MAT.plaster_pink); }
    f.box(mx0 + 16, my0 + 6, mz, 5, 3, 1, MAT.wood_gray); f.box(mx0 + 16, my0 + 9, mz, 5, 1, 1, MAT.roof_shingle_brown);
    f.box(mx0 + 23, my0 + 6, mz, 3, 2, 1, MAT.siding_white); f.box(mx0 + 23, my0 + 8, mz, 3, 1, 1, MAT.roof_shingle_gray);
    f.box(mx0, my0 + mh, mz, mw, 1, 1, MAT.trim_gold); f.box(mx0, my0 - 1, mz, mw, 1, 1, MAT.trim_gold);
    readAt(b, (mx0 + mx1) / 2, TY + 4, mz, 2, '"The Founding of Juniper Bay" (WPA mural)', '"THE FOUNDING OF JUNIPER BAY, 1853"\nOil on canvas, mounted on plaster. Ilse Jorgensen, 1937.\nFederal Art Project of the Works Progress Administration.\n\nCaptain Whitcomb\'s JUNIPER rides at anchor in the cove. On the meadow\n(now Founders Square) the first settlers raise the salt house.\nThe artist used real faces: the cooper is Jorgensen\'s landlord, Mr. Pruitt;\nthe woman with the child is Nora Halloran\'s granddaughter;\nthe boy on the rock is a cannery striker\'s son, Casimir Novak\'s nephew.\n\nThe Council voted 4 to 3 to accept it. It has been admired ever since\nby everyone except Councilman Crowell, who still says the sky is too blue.', 3.4);
    for (let z = IZ0 + 8; z < ZW - 8; z += 10) { b.prop('bench_station', LX1 + (IX1 - LX1) / 2, TY, z, 2, {}); b.spot('sit', LX1 + (IX1 - LX1) / 2, TY, z, 2, { room: mural, act: 'look', tags: ['civic'], seat: 0.45 }); }
    b.prop('ceiling_lamp', (LX1 + IX1) / 2, TY + 13, IZ0 + 20, 0, {});
    framed(b, 'painting', IX1 - 0.6, TY + 7, IZ0 + 12, 3, 'Sketch for the mural', 'Charcoal study for "The Founding of Juniper Bay" by Ilse Jorgensen, 1936.\nIn the margin, in her hand: "More sky. Always more sky."', { tint: '#8ab0d0' });
    framed(b, 'photo_frames', IX1 - 0.6, TY + 6, IZ0 + 28, 3, 'WPA crews, 1936', 'Photograph: WPA Project No. 2-117 crew building the seawall, Harbor Street, 1936.\nForty-one men, $1.10 a day. Front row, third from left: Casimir Novak.');
  }
  // ---------------------------------------------------------------- Registry of Deeds
  for (let z = ZW + 5; z < IZ1 - 2; z += 5) b.prop('filing_cabinet', IX1 - 1.2, TY, z, 3, {});
  officeDesk(b, deeds, LX1 + 12, TY, ZW + 14, 0, {});
  b.prop('bookshelf', LX1 + 4, TY, IZ1 - 1.2, 0, {}); b.prop('bookshelf', LX1 + 9, TY, IZ1 - 1.2, 0, {});
  b.prop('ceiling_lamp', (LX1 + IX1) / 2, TY + 13, ZW + 20, 0, {});
  readAt(b, LX1 + 12, TY + 4, ZW + 14, 0, 'Deed Book 212, page 40', 'DEED BOOK 212, PAGE 40 (open on the desk)\n\nPruitt to Town of Juniper Bay, 1911: "the lower orchard lot on Orchard Street,\nexcepting the three oldest apple trees, which shall stand so long as they bear."\n(They still bear. The school children pick them every October.)');
  // ---------------------------------------------------------------- back hall
  b.prop('coat_rack', LX0 + 3, TY, IZ1 - 2, 0, {}); b.prop('umbrella_stand', LX0 + 5, TY, IZ1 - 2, 0, {});
  b.prop('office_water_cooler', LX1 - 3, TY, IZ1 - 2, 0, {});
  readAt(b, LX1 - 6, TY + 5, IZ1 - 1, 2, 'Bulletin board', 'CITY HALL BULLETIN BOARD\n\n- Centennial volunteers: sign in with Mrs. Pemberton by 9 A.M.\n- The Board of Health reminds all restaurateurs that chowder is not a beverage.\n- LOST: one brass key, Records Vault. Return to Miss Beal. NO QUESTIONS.\n- Softball: City Hall vs. Engine Co. No. 1, Sunday after church. The firemen are favored.\n- Civil Defense: air raid drill Thursday 10 A.M. Duck and cover.', 2.4);

  // ---------------------------------------------------------------- Mayor's office
  const mW = LX0 - IX0;
  b.prop('rug_rect', IX0 + mW / 2, y2, IZ0 + 22, 0, { tint: '#6a1f24', scale: 1.6 });
  b.prop('desk_wood', IX0 + mW / 2, y2, IZ0 + 12, 0, {});
  b.prop('chair_office', IX0 + mW / 2, y2, IZ0 + 8.8, 2, {});
  const mayorSeat = b.spot('sit', IX0 + mW / 2, y2, IZ0 + 8.8, 2, { room: mayor, act: 'write', tags: ['mayor'], seat: 0.46 });
  void mayorSeat;
  b.prop('lamp_desk', IX0 + mW / 2 + 2, y2 + 3, IZ0 + 12, 2, {}); b.prop('telephone', IX0 + mW / 2 - 2, y2 + 3, IZ0 + 12, 2, {});
  readAt(b, IX0 + mW / 2, y2 + 4, IZ0 + 12, 2, 'The Mayor\'s speech (draft)', 'CENTENNIAL ADDRESS - DRAFT No. 4\n(eleven pages; pages 7 through 11 crossed out in Mrs. Pemberton\'s green ink)\n\n"Fellow citizens of Juniper Bay! One hundred years ago, Captain Elias Whitcomb\nanchored in this cove, with nothing but a schooner, a stubborn heart\nand the promise he had made to the sea..."\n\nIn the margin, in green: "Walter. Six pages. They will be standing."', 2);
  for (const x of [IX0 + mW / 2 - 3.2, IX0 + mW / 2 + 3.2]) b.prop('chair_wood', x, y2, IZ0 + 16, 0, {});
  b.prop('portrait', IX0 + mW / 2, y2 + 6, IZ0 + 0.6, 2, { tint: '#3a4a5a' });
  readAt(b, IX0 + mW / 2, y2 + 6, IZ0 + 1, 2, 'Portrait of Capt. Elias Whitcomb', 'CAPTAIN ELIAS WHITCOMB (1809 - 1884)\nFounder and first Selectman of Juniper Bay.\nOil on canvas by William M. Prior, 1858.\n\nHe is painted with his hand on a chart of the cove and the JUNIPER\nat anchor behind him. The artist charged $25 and a barrel of salt mackerel.\nEvery mayor since 1876 has worked beneath this picture.', 2.6);
  for (const x of [IX0 + 3, IX0 + mW - 3]) b.prop('flag_stand', x, y2, IZ0 + 2, 0, {});
  b.prop('bookshelf', IX0 + 1.2, y2, IZ0 + 26, 1, {}); b.prop('bookshelf', IX0 + 1.2, y2, IZ0 + 31, 1, {});
  b.prop('globe_desk', LX0 - 3, y2, IZ0 + 28, 3, {});
  b.prop('sofa', IX0 + mW / 2, y2, ZW - 3, 0, { tint: '#5a2a24' });
  b.prop('table_coffee', IX0 + mW / 2, y2, ZW - 8, 0, {});
  b.prop('clock_grandfather', LX0 - 2, y2, IZ0 + 3, 3, {});
  b.prop('chandelier', IX0 + mW / 2, y2 + 12, IZ0 + 20, 0, {});
  framed(b, 'photo_frames', LX0 - 0.6, y2 + 6, IZ0 + 18, 3, 'Photographs on the Mayor\'s wall', 'Mayor Pemberton with Governor Herter, 1953.\nThe 1938 hurricane: the Mayor (then Councilman) in hip boots on Harbor Street.\nEleanor Pemberton launching the minesweeper YMS-412 at Bayside Boat Works, 1943.');
  // anteroom (secretary)
  const sec = officeDesk(b, ante, IX0 + 12, y2, ZW + 14, 0, {});
  b.job('secretary', sec, { shift: ['9:00', '12:30'], title: "mayor's secretary", sex: 'F', outfit: 'clerk' });
  for (let x = IX0 + 4; x < LX0 - 4; x += 5) b.prop('chair_wood', x, y2, IZ1 - 2, 0, {});
  b.prop('filing_cabinet', LX0 - 2, y2, ZW + 3, 3, {}); b.prop('coat_rack', IX0 + 2, y2, IZ1 - 2, 0, {});
  b.prop('ceiling_lamp', IX0 + mW / 2, y2 + 12, ZW + 20, 0, {});
  // landing
  b.prop('chandelier', cxm, y2 + 12, ZB + 16, 0, {});
  framed(b, 'painting', cxm, y2 + 7, IZ1 - 0.6, 2, 'The Great Gale, 1867', 'THE GREAT GALE OF OCTOBER 1867\nOil, attributed to Fitz Henry Lane\'s circle. Gift of the Beal family, 1901.\nThe MARY ELLEN is the small schooner at the left, already half hidden in the spray.\nEleven men. The widows raised the stone on the quay the following spring.', { tint: '#5a6a7a' });

  // ---------------------------------------------------------------- Council Chamber (an influenza ward in 1918)
  const kX0 = LX1 + 1, kW = IX1 - kX0, kmx = kX0 + kW / 2;
  f.box(kX0, y2, IZ0, kW, 2, 12, MAT.wood_mid);                                  // the dais
  f.box(kX0 + 4, y2, IZ0 + 12, kW - 8, 1, 2, MAT.wood_mid);                      // step
  f.box(kX0, y2 + 2, IZ0, kW, 1, 12, MAT.carpet_blue);
  f.walls(kX0, y2, IZ0, kW, 5, IZ1 - IZ0, MAT.wood_panel, 1);
  f.carve(LX1, y2, ZB + 6, 2, 10, 6);
  for (let i = 0; i < 7; i++) {
    const x = kX0 + 5 + i * (kW - 10) / 6;
    b.prop('desk_wood', x, y2 + 2, IZ0 + 8, 0, {});
    b.prop('chair_office', x, y2 + 2, IZ0 + 4.5, 0, { tint: '#3a2418' });
    b.spot('sit', x, y2 + 2, IZ0 + 4.5, 2, { room: council, act: 'listen_sit', tags: ['council'], seat: 0.46 });
  }
  b.prop('flag_stand', kX0 + 2, y2 + 2, IZ0 + 1.5, 0, {}); b.prop('flag_stand', IX1 - 2, y2 + 2, IZ0 + 1.5, 0, {});
  signLine(b, 'CITY OF JUNIPER BAY - STEADFAST IN FAIR WEATHER AND FOUL', kmx, y2 + 11, IZ0 + 0.6, 2, { bg: '#1f2f4f', fg: '#e8c870', border: '#c9a24a', scale: 0.5 });
  discOn(f, 2, kmx, y2 + 13, IZ0, 3, MAT.trim_gold);
  b.prop('lectern', kmx, y2, IZ0 + 17, 2, {});
  for (let r = 0; r < 6; r++) for (const side of [-1, 1]) {
    const z = IZ0 + 24 + r * 7;
    for (let k = 0; k < 3; k++) {
      const x = kmx + side * (4 + k * 3.2);
      b.prop('chair_wood', x, y2, z, 0, { tint: '#5a3a24' });
      b.spot('sit', x, y2, z, 0, { room: council, act: 'listen_sit', tags: ['council', 'civic'], seat: 0.45 });
    }
  }
  for (const z of [IZ0 + 22, IZ0 + 50, IZ0 + 76]) b.prop('chandelier', kmx, y2 + 12, z, 0, {});
  b.light(kmx, y2 + 10, IZ0 + 45, { mode: 'room', room: council, radius: 14 });
  for (let i = 0; i < 4; i++) b.prop('portrait', IX1 - 0.6, y2 + 7, IZ0 + 26 + i * 16, 3, { tint: ['#3a4a3a', '#4a3a2a', '#2a3a4a', '#3a2a3a'][i] });
  readAt(b, IX1 - 1, y2 + 6, IZ0 + 42, 3, 'Portraits of former mayors', 'FORMER MAYORS OF JUNIPER BAY\n(Juniper Bay became a city in 1896)\n\nHon. Josiah Crowell, 1896 - 1902\nHon. Patrick J. Kearney, 1902 - 1910 ("the Fire Mayor")\nHon. Edmund Pruitt, 1910 - 1922\nHon. Margaret Beal Doyle, 1922 - 1926 (the first woman mayor in the county)\nHon. Arthur Gould, 1926 - 1942\nHon. Walter Pemberton, 1942 -', 2.6);
  // the influenza plaque
  signLine(b, 'OCTOBER - NOVEMBER 1918', kX0 + 0.6, y2 + 7, IZ0 + 60, 1, { scale: 0.45 });
  signLine(b, 'IN THIS ROOM', kX0 + 0.6, y2 + 8, IZ0 + 60, 1, { scale: 0.45 });
  readAt(b, kX0 + 1, y2 + 6, IZ0 + 60, 1, 'The influenza plaque', 'IN THIS ROOM\nfrom October 3 to November 14, 1918,\nthe Council Chamber served as an emergency hospital ward\nduring the influenza epidemic.\n\nSixty-one beds. Eleven nurses, four of them volunteers from the cannery.\nDr. Josiah Pike and Nurse Honora Duffy never left the building.\nOne hundred and forty townspeople died that autumn.\nOut of that grief the town raised St. Luke\'s Hospital by public subscription (1920).\n\n"They came up these stairs when there was nowhere else to go,\nand the town did not turn them away."\n\nPlaced by the Council, 1920.', 3);
  for (let z = IZ0 + 20; z < IZ1 - 6; z += 14) for (const dir of [1]) framed(b, 'radiator', IX1 - 0.8, y2, z + 7, 3, null, null);
  b.spot('stand', kmx, y2, IZ0 + 17, 2, { room: council, act: 'speech', tags: ['council_chair'] });
  return b;
}

// =====================================================================================
// placeholders for the remaining generators (filled in below)
// =====================================================================================
function buildPark(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildLibrary(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildStBrigid(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildRectory(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildCongregational(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildSchool(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildHospital(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildFireStation(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildPolice(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildPostOffice(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
function buildMuseum(ctx, lot, spec) { return GEN_FALLBACK(ctx, lot, spec); }
import { buildFallback as GEN_FALLBACK } from './fallback.js';
void slab; void win; void winRow; void doorway; void stairs; void partitionX; void partitionZ; void roomTrim; void cornice; void beltCourse; void pilaster; void quoins; void chimney; void flatRoof; void cornerstone; void officeDesk; void kitchenRun; void bathroom; void shell; void linkToSidewalk; void MARY_ELLEN; void SETTLERS; void faceF; void framed; void plaque; void pave;
