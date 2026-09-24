// Generators: civic. Founders Square, City Hall, Juniper Park, the Carnegie Library, the two churches,
// St. Brigid's rectory & parish hall, the high school, St. Luke's, Engine Co. No. 1, Police HQ,
// the WPA post office and the Maritime Museum. See docs/BUILDINGS.md.
import { Building } from '../building.js';
import { MAT, shell, slab, win, winRow, doorway, stairs, partitionX, partitionZ, roomTrim, cornice, beltCourse, pilaster, quoins, chimney, flatRoof, cornerstone, officeDesk, kitchenRun, bathroom, smallSign } from './common.js';
import { linkToSidewalk } from '../streets.js';
import { textSignType } from '../../props/lib/special.js';
import { TIMELINE } from '../lore.js';

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
const CIVIL_WAR_NINE = [ // five of these lie in the town cemetery (nature.js); keep in step
  ['Sgt. George Crowell', 'Co. K, 35th Mass. Vol. Inf.', 'Antietam, Sept. 17, 1862 - he carried the colors'],
  ['Pvt. Thomas E. Whitcomb', 'Co. D, 19th Mass. Vol. Inf.', 'Fredericksburg, Dec. 13, 1862'],
  ['Pvt. William Snow', 'Co. B, 19th Mass. Vol. Inf.', 'Gettysburg, July 3, 1863, at the stone wall'],
  ['Seaman John Pruitt', 'U.S.S. Housatonic', 'off Charleston, Feb. 17, 1864'],
  ['Pvt. Thomas Coffin', 'Co. G, 20th Mass. Vol. Inf.', 'the Wilderness, May 1864'],
  ['Pvt. Levi Gould', 'Co. D, 19th Mass. Vol. Inf.', 'Cold Harbor, June 3, 1864'],
  ['Cpl. Amos Hallett', 'Co. F, 22nd Mass. Vol. Inf.', 'of wounds, City Point, June 1864'],
  ['Pvt. Michael Kearney', '28th Mass. Vol. Inf. (Irish Brigade)', 'Petersburg, June 16, 1864'],
  ['Pvt. James Doane', '2nd Mass. Cavalry', 'of fever at Richmond, April 1865, aged 19'],
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
const SETTLERS = [ // the Meetinghouse Burying Ground (Capt. Elias Whitcomb himself lies in the town cemetery, nature.js)
  ['MERCY WHITCOMB', 1812, 1861, 'Wife of Capt. Elias Whitcomb.\n"She hath done what she could."'],
  ['SAMUEL WHITCOMB', 1844, 1867, 'Son of Capt. Elias & Mercy Whitcomb.\nLost with the schooner MARY ELLEN off Gannet Ledge\nin the Great Gale of October 1867, aged 23.\nHis body was not recovered.\n"The sea gave up the dead which were in it."'],
  ['DEA. OBADIAH CROWELL', 1790, 1860, 'First deacon of this church.\n"Well done, thou good and faithful servant."'],
  ['HANNAH CROWELL', 1795, 1872, 'Relict of Dea. Obadiah Crowell.'],
  ['REV. JOSIAH TUTTLE', 1798, 1870, 'First minister of the First Church in Juniper Bay, 1853-1870.\nHe preached in the salt house until the chapel was raised.'],
  ['JONAS BEAL', 1801, 1866, 'Cooper. Built the first eleven houses with his own hands\nand dug the town pump.'],
  ['THANKFUL CROWELL', 1818, 1879, 'Wife of Capt. Asa Crowell.\nShe kept the first school in her own kitchen, 1853-1858.\n"Train up a child in the way he should go."'],
  ['SARAH FISK', 1830, 1854, 'The first soul buried in this ground,\naged 24 years.\n"Asleep in Jesus."'],
  ['INFANT SON OF JONAS & RUTH BEAL', 1857, 1857, 'Aged 3 days.\n"Suffer the little children."'],
  ['CAPT. ASA CROWELL', 1812, 1883, 'Master mariner. Forty-one voyages to the Grand Banks.\n"I have fought a good fight, I have finished my course."'],
];
const MARY_ELLEN = ['Capt. Josiah Dunmore, master, 41', 'Nathaniel Dunmore, his son, mate, 19', 'Samuel Whitcomb, 23', 'Ezra Coffin, 35', 'Thomas Pruitt, 28', 'John Hallett, 44', 'William Doane, 31', 'Patrick Flynn, 22', 'Benjamin Crowell, 38', 'Hiram Nickerson, cook, 52', 'Isaiah Snow, cabin boy, 14']; // as on the quay memorial (harbor.js)

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
  signLine(b, '1809 - 1889', sX + 5.05, 7, sZ, 1, { scale: 0.45 });
  signLine(b, 'FOUNDER', sX - 5.05, 8, sZ, 3, { scale: 0.45 });
  const whitcombText = 'CAPTAIN ELIAS WHITCOMB\n1809 - 1889\nMariner. Founder of Juniper Bay.\n\nIn October 1851 he brought the schooner JUNIPER in out of a gale\nand anchored in this cove, and swore he would come back.\nOn March 4, 1853, he read the charter of the town on this meadow\nto two hundred and twelve souls.\n\nHE FACES THE HARBOR HE FOUND.\n\nErected by the citizens of Juniper Bay, 1903.\n(The telescope was replaced in 1921, after the Class of 1920 stole the original.)';
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
  const cwText = 'TO THE MEN OF JUNIPER BAY\nWHO SERVED THE UNION\n1861 - 1865\n\nForty-three went. Nine did not come home.\n\n' + CIVIL_WAR_NINE.map((q) => `${q[0]}\n${q[1]} - ${q[2]}`).join('\n\n') + '\n\n"Their names shall live forevermore."\nErected by the Town and G.A.R. Post No. 97, Memorial Day, 1889.\nThe bronze soldier was modeled on Sgt. George Crowell, who carried the colors at Antietam,\nfrom his sister\'s tintype.';
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
  readAt(b, IX0 + mW / 2, y2 + 6, IZ0 + 1, 2, 'Portrait of Capt. Elias Whitcomb', 'CAPTAIN ELIAS WHITCOMB (1809 - 1889)\nFounder and first Selectman of Juniper Bay.\nOil on canvas by William M. Prior, 1858.\n\nHe is painted with his hand on a chart of the cove and the JUNIPER\nat anchor behind him. The artist charged $25 and a barrel of salt mackerel.\nEvery mayor since 1876 has worked beneath this picture.', 2.6);
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
  readAt(b, kX0 + 1, y2 + 6, IZ0 + 60, 1, 'The influenza plaque', 'IN THIS ROOM\nfrom October 3 to November 14, 1918,\nthe Council Chamber served as an emergency hospital ward\nduring the influenza epidemic.\n\nSixty-one beds. Eleven nurses, four of them volunteers from the cannery.\nDr. Josiah Pike, Nurse Ellen Mayhew and Nurse Honora Duffy never left the building.\nDr. Pike and Miss Mayhew caught it there, and died of it.\nOne hundred and forty townspeople died that autumn.\nOut of that grief the town raised St. Luke\'s Hospital by public subscription (1920).\n\n"They came up these stairs when there was nowhere else to go,\nand the town did not turn them away."\n\nPlaced by the Council, 1920.', 3);
  for (let z = IZ0 + 20; z < IZ1 - 6; z += 14) for (const dir of [1]) framed(b, 'radiator', IX1 - 0.8, y2, z + 7, 3, null, null);
  b.spot('stand', kmx, y2, IZ0 + 17, 2, { room: council, act: 'speech', tags: ['council_chair'] });
  return b;
}


// Hollow the inside of a solid f.gable(axis:'z') roof, leaving a 1-voxel shell lined with `lining`.
function vaultZ(f, x, y, z, sx, sz, lining, rise = 1) {
  const steps = Math.ceil(sx / 2);
  for (let i = 0; i < steps; i++) for (let r = 0; r < rise; r++) {
    const w = sx - 2 * i - 2;
    if (w <= 0) continue;
    f.box(x + i + 1, y + i * rise + r, z + 1, w, 1, sz - 2, lining);
    if (w > 2) f.carve(x + i + 2, y + i * rise + r, z + 1, w - 2, 1, sz - 2);
  }
}
// Stained-glass lancet on a wall facing dir: pointed window with coloured bands.
function lancet(f, dir, a0, y, face, w, h, pal, o = {}) {
  const [F, x, z] = onWall(f, dir, a0, w, face);
  win(F, x, y, z, w, h, { t: o.t ?? 2, style: 'arch', glass: pal[0], frame: o.frame ?? MAT.granite, sill: true });
  const straight = Math.max(0, h - Math.ceil(w / 2));
  const gz = z + 1;
  for (let yy = 1; yy < straight; yy += 2) F.box(x, y + yy, gz, w, 1, 1, pal[(yy >> 1) % pal.length]);
  if (w >= 4) F.box(x + Math.floor(w / 2) - (w % 2 ? 0 : 1) + (w % 2 ? 0 : 1) - 1 + 1, y, gz, 1, straight, 1, MAT.iron);
}
function rose(f, dir, c, cy, layer, r) {
  const out = dir === 0 || dir === 3 ? -1 : 1;
  discOn(f, dir, c, cy, layer, r + 1, MAT.limestone);
  const inL = layer - out; // carve through the wall behind
  discOn(f, dir, c, cy, inL, r, MAT.glass_stained_blue);
  discOn(f, dir, c, cy, inL + (-out), r, MAT.glass_stained_blue);
  discOn(f, dir, c, cy, layer, r, MAT.glass_stained_blue);
  discOn(f, dir, c, cy, layer, r * 0.72, MAT.glass_stained_red);
  discOn(f, dir, c, cy, layer, r * 0.45, MAT.glass_stained_gold);
  discOn(f, dir, c, cy, layer, r * 0.18, MAT.glass_stained_green);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 2 * PI; const px = c + Math.cos(a) * r * 0.62, py = cy + Math.sin(a) * r * 0.62; if (dir === 0 || dir === 2) f.box(Math.round(px), Math.round(py), layer, 1, 1, 1, MAT.limestone); else f.box(layer, Math.round(py), Math.round(px), 1, 1, 1, MAT.limestone); }
}
// Row of pews (prop) with 3 sit spots each, facing rot (2 = toward the back of the lot / the altar).
function pewRow(b, room, x, y, z, rot, tags, o = {}) {
  b.prop(o.type || 'pew', x, y, z, rot, { tint: o.tint });
  const out = [];
  const v = R4[rot], rt = [v[1], -v[0]];
  for (const k of o.seats || [-4, 0, 4]) out.push(b.spot('sit', x + rt[0] * k, y, z + rt[1] * k, rot, { room, act: o.act || 'listen_sit', tags, seat: 0.45, label: o.label }));
  if (o.player !== false) b.playerSeat(x, y, z, rot, 0.45);
  return out;
}

// =====================================================================================
// ST. BRIGID'S CHURCH (1882) — granite Gothic; the Novak-Brennan wedding at 2 o'clock
// =====================================================================================
function buildStBrigid(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || "St. Brigid's Church", kind: 'church_catholic', lot, address: lot.address, established: spec.est || 1882,
    lore: 'Built by the Irish families who laid the railroad. Granite, with a bell cast in Troy, New York, in 1884.', hours: [6 * 60 + 30, 20 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('brigid' + lot.x);
  const FY = 3;
  const NX0 = Math.max(8, Math.round(W * 0.15)), NX1 = Math.min(W - 32, NX0 + 84), NW = NX1 - NX0, cxm = Math.round((NX0 + NX1) / 2);
  const FZ = 30, BZ = Math.min(D - 30, 170), WH = 36, wallTop = FY + WH;
  const TX0 = NX1, TX1 = Math.min(W - 4, NX1 + 24), TZ0 = FZ - 12, TZ1 = TZ0 + (TX1 - TX0);
  // grounds
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(NX0 + 8, -1, 0, NW - 16, 1, FZ, MAT.sidewalk);
  f.box(4, -1, 0, 6, 1, D - 4, MAT.gravel);
  // plinth & steps
  f.box(NX0 - 2, 0, FZ - 2, NW + 4, FY, BZ - FZ + 26, MAT.granite);
  for (let k = 0; k < FY; k++) f.box(NX0 + 8, 0, FZ - 2 - 2 * (FY - k), NW - 16, k + 1, 2, MAT.granite);
  // nave shell, apse, roof
  shell(f, NX0, FY, FZ, NW, WH, BZ - FZ, MAT.granite, MAT.plaster_white, 2);
  f.cylinder(cxm, FY, BZ, NW / 2 - 16, WH - 6, MAT.granite, 2);
  f.cylinder(cxm, FY - 1, BZ, NW / 2 - 16, 1, MAT.marble);
  f.dome(cxm, FY + WH - 6, BZ, NW / 2 - 15, MAT.roof_slate, { heightScale: 0.9 });
  f.carve(NX0 + 2, FY, FZ + 2, NW - 4, WH, BZ - FZ - 2);          // open the nave into the apse
  f.cylinder(cxm, FY, BZ, NW / 2 - 18, WH - 7, MAT.plaster_blue);
  f.cylinder(cxm, FY, BZ, NW / 2 - 18, WH - 7, 0);
  f.box(NX0 - 1, wallTop, FZ - 1, NW + 2, 1, BZ - FZ + 2, MAT.granite);
  const rise = f.gable(NX0, wallTop + 1, FZ, NW, BZ - FZ, MAT.roof_slate, { axis: 'z', overhang: 2, gableMat: MAT.granite });
  vaultZ(f, NX0, wallTop + 1, FZ, NW, BZ - FZ, MAT.plaster_blue);
  for (let i = 4; i < rise - 2; i += 6) for (let z = FZ + 8; z < BZ - 4; z += 14) f.box(NX0 + i + 1 + ((z >> 2) % 5), wallTop + 1 + i, z, 1, 1, 1, MAT.trim_gold);
  for (let z = FZ + 14; z < BZ; z += 14) for (let i = 0; i < rise - 1; i++) { f.box(NX0 + i + 1, wallTop + 1 + i, z, 1, 1, 1, MAT.wood_dark); f.box(NX1 - i - 2, wallTop + 1 + i, z, 1, 1, 1, MAT.wood_dark); }
  // buttresses along the sides
  for (let z = FZ + 12; z < BZ; z += 14) for (const x of [NX0 - 3, NX1]) { f.box(x, FY, z, 3, WH - 6, 3, MAT.granite); f.box(x + (x < NX0 ? 1 : 0), FY + WH - 6, z, 2, 4, 3, MAT.granite); }
  // cross on the front gable
  f.box(cxm, wallTop + rise + 1, FZ - 1, 1, 8, 1, MAT.trim_gold); f.box(cxm - 2, wallTop + rise + 5, FZ - 1, 5, 1, 1, MAT.trim_gold);
  // ---- facade: portal, side doors, rose window, lancets
  doorway(f, cxm - 4, FY, FZ, 8, 14, { frame: false, t: 2, step: false });
  f.archCarve(cxm - 4, FY, FZ, 8, 17, 2);
  f.archCarve(cxm - 6, FY, FZ - 1, 12, 19, 1, MAT.limestone); f.archCarve(cxm - 5, FY, FZ - 1, 10, 18, 1);
  f.box(cxm - 4, FY + 14, FZ, 8, 3, 1, MAT.glass_stained_gold); f.archCarve(cxm - 4, FY + 14, FZ, 8, 3, 1, MAT.glass_stained_gold);
  for (const dx of [NX0 + 12, NX1 - 16]) { f.archCarve(dx, FY, FZ, 4, 11, 2); f.archCarve(dx - 1, FY, FZ - 1, 6, 12, 1, MAT.limestone); f.archCarve(dx, FY, FZ - 1, 4, 11, 1); }
  rose(f, 0, cxm, FY + 27, FZ - 1, 8);
  for (const dx of [NX0 + 11, NX1 - 17]) lancet(f, 0, dx, FY + 16, FZ, 6, 16, [MAT.glass_stained_blue, MAT.glass_stained_red, MAT.glass_stained_gold]);
  f.text('ST. BRIGID', cxm, FY + 38, FZ - 1, MAT.trim_gold, { align: 'center', font: 'small' });
  // side lancets: dedication windows
  const pals = [[MAT.glass_stained_blue, MAT.glass_stained_red, MAT.glass_stained_gold], [MAT.glass_stained_red, MAT.glass_stained_gold, MAT.glass_stained_green], [MAT.glass_stained_purple, MAT.glass_stained_blue, MAT.glass_stained_gold], [MAT.glass_stained_green, MAT.glass_stained_gold, MAT.glass_stained_red]];
  let wi = 0;
  for (let z = FZ + 17; z < BZ - 8; z += 14) {
    lancet(f, 3, z, FY + 8, NX0, 6, 22, pals[wi % 4]);
    lancet(f, 1, z, FY + 8, NX1, 6, 22, pals[(wi + 2) % 4]);
    wi++;
  }
  // ---- the bell tower & spire (front right)
  shell(f, TX0, 0, TZ0, TX1 - TX0, 90, TZ1 - TZ0, MAT.granite, null, 2);
  const tcx = (TX0 + TX1) / 2, tcz = (TZ0 + TZ1) / 2, tw = TX1 - TX0;
  for (const [x, z] of [[TX0 - 1, TZ0 - 1], [TX1 - 2, TZ0 - 1]]) for (let y = 0; y < 90; y += 18) f.box(x, y, z, 3, 12, 3, MAT.granite);
  f.box(TX0, FY - 1, TZ0 + 2, tw, 1, TZ1 - TZ0 - 4, MAT.floor_concrete);
  for (let y = 20; y < 80; y += 18) { lancet(f, 0, Math.round(tcx) - 2, y, TZ0, 4, 10, [MAT.glass_dark]); }
  f.box(TX0 - 1, 90, TZ0 - 1, tw + 2, 1, tw + 2, MAT.limestone);
  const belY = 91;
  for (const [x, z] of [[TX0, TZ0], [TX1 - 4, TZ0], [TX0, TZ1 - 4], [TX1 - 4, TZ1 - 4]]) f.box(x, belY, z, 4, 16, 4, MAT.granite);
  f.box(TX0, belY + 13, TZ0, tw, 3, TZ1 - TZ0, MAT.granite);
  f.archCarve(TX0 + 5, belY, TZ0, tw - 10, 13, TZ1 - TZ0);
  f.faceFrame('left').archCarve(D - TZ1 + 5, belY, TX0, tw - 10, 13, tw);
  f.box(TX0, belY - 1, TZ0, tw, 1, TZ1 - TZ0, MAT.wood_dark);
  f.box(TX0, belY, TZ0, tw, 2, 1, MAT.granite); f.box(TX0, belY, TZ1 - 1, tw, 2, 1, MAT.granite);
  // the bell (Meneely, Troy N.Y., 1884)
  f.box(Math.round(tcx) - 4, belY + 11, Math.round(tcz) - 1, 8, 1, 2, MAT.wood_dark);
  f.cylinder(tcx, belY + 6, tcz, 3.2, 5, MAT.trim_gold, 1);
  f.cylinder(tcx, belY + 5, tcz, 4, 1, MAT.trim_gold, 1);
  f.box(Math.round(tcx) - 1, belY + 4, Math.round(tcz) - 1, 1, 2, 1, MAT.iron);
  b.prop('bell_brass', tcx, belY, tcz, 0, {});
  const spireBase = belY + 16;
  f.box(TX0 - 1, spireBase, TZ0 - 1, tw + 2, 1, tw + 2, MAT.limestone);
  for (const [x, z] of [[TX0, TZ0], [TX1 - 3, TZ0], [TX0, TZ1 - 3], [TX1 - 3, TZ1 - 3]]) { f.box(x, spireBase + 1, z, 3, 6, 3, MAT.granite); f.box(x + 1, spireBase + 7, z + 1, 1, 3, 1, MAT.granite); }
  const sp = f.hip(TX0 + 2, spireBase + 1, TZ0 + 2, tw - 4, TZ1 - TZ0 - 4, MAT.roof_slate, { overhang: 0, rise: 6 });
  f.box(Math.round(tcx), spireBase + sp, Math.round(tcz), 1, 10, 1, MAT.trim_gold);
  f.box(Math.round(tcx) - 2, spireBase + sp + 6, Math.round(tcz), 5, 1, 1, MAT.trim_gold);
  clockOn(f, 0, tcx, 72, TZ0 - 1, 5);
  // tower base doorway into the narthex
  f.carve(TX0, FY, FZ + 4, 2, 9, 4);
  // ---- interior
  const IX0 = NX0 + 2, IX1 = NX1 - 2, IZ0 = FZ + 2;
  const NZ = IZ0 + 13;           // narthex back wall
  const LY = FY + 14;            // organ loft slab
  const SZ = BZ - 24;            // sanctuary front (altar rail)
  f.box(IX0, FY - 1, IZ0, IX1 - IX0, 1, BZ - IZ0 + 20, MAT.floor_terrazzo);
  f.box(IX0, FY - 1, NZ, 12, 1, SZ - NZ, MAT.floor_checker_red);
  f.box(IX1 - 12, FY - 1, NZ, 12, 1, SZ - NZ, MAT.floor_checker_red);
  f.box(cxm - 3, FY - 1, NZ, 6, 1, SZ - NZ, MAT.carpet_red);
  f.box(cxm - 2, FY - 1, NZ + 1, 4, 1, SZ - NZ - 1, MAT.canvas_white);     // the white aisle runner for the wedding
  // narthex wall with three openings, organ loft above
  partitionX(f, IX0, IX1, FY, NZ, LY - FY, MAT.plaster_white, [{ at: cxm - 4, w: 8, h: 11 }, { at: NX0 + 12, w: 4 }, { at: NX1 - 16, w: 4 }]);
  f.box(IX0, LY, IZ0, IX1 - IX0, 1, NZ - IZ0 + 4, MAT.wood_dark);
  for (let x = IX0; x < IX1; x += 2) f.box(x, LY + 1, NZ + 3, 1, 3, 1, MAT.wood_mid);
  f.box(IX0, LY + 4, NZ + 3, IX1 - IX0, 1, 1, MAT.wood_dark);
  // arcade columns
  const colXs = [IX0 + 12, IX1 - 12];
  for (let z = NZ + 8; z < SZ; z += 13) for (const x of colXs) { f.cylinder(x, FY, z, 1.6, WH - 2, MAT.granite); f.cylinder(x, FY, z, 2.4, 1, MAT.granite); f.cylinder(x, FY + WH - 4, z, 2.4, 2, MAT.limestone); }
  // sanctuary: raised floor, altar rail, high altar & reredos in the apse
  f.box(IX0, FY, SZ, IX1 - IX0, 2, BZ - SZ + 18, MAT.marble);
  f.box(IX0, FY, SZ - 2, IX1 - IX0, 1, 2, MAT.marble);
  f.box(IX0 + 14, FY + 1, SZ, IX1 - IX0 - 28, 1, BZ - SZ + 18, MAT.carpet_red);
  for (let x = IX0 + 14; x < IX1 - 14; x += 2) if (Math.abs(x + 0.5 - cxm) > 3) f.box(x, FY + 2, SZ + 1, 1, 3, 1, MAT.marble);
  f.box(IX0 + 14, FY + 5, SZ + 1, cxm - 3 - IX0 - 14, 1, 1, MAT.marble); f.box(cxm + 3, FY + 5, SZ + 1, IX1 - 14 - cxm - 3, 1, 1, MAT.marble);
  const altZ = BZ + 8;
  f.box(cxm - 12, FY + 2, altZ - 6, 24, 2, 10, MAT.marble);
  b.prop('altar', cxm, FY + 4, altZ - 2, 0, {});
  // reredos: gilded Gothic screen with a crucifix
  f.box(cxm - 10, FY + 4, altZ + 2, 20, 16, 1, MAT.trim_white);
  for (const dx of [-10, -5, 4, 9]) { f.box(cxm + dx, FY + 4, altZ + 1, 1, 18 + (Math.abs(dx) < 6 ? 4 : 0), 1, MAT.trim_gold); f.box(cxm + dx, FY + 22 + (Math.abs(dx) < 6 ? 4 : 0), altZ + 1, 1, 2, 1, MAT.trim_gold); }
  f.box(cxm - 1, FY + 8, altZ + 1, 2, 14, 1, MAT.wood_dark); f.box(cxm - 4, FY + 17, altZ + 1, 8, 2, 1, MAT.wood_dark);
  f.box(cxm - 1, FY + 14, altZ, 2, 3, 1, MAT.plaster_pink);
  f.box(cxm - 2, FY + 6, altZ, 4, 3, 1, MAT.trim_gold);                  // tabernacle
  b.prop('candles_pair', cxm - 5, FY + 7, altZ - 2, 0, {}); b.prop('candles_pair', cxm + 5, FY + 7, altZ - 2, 0, {});
  for (const dx of [-9, 9]) { b.prop('vase_flowers', cxm + dx, FY + 4, altZ - 5, 0, { tint: '#f4f0e8', scale: 1.4 }); b.prop('flower_buckets', cxm + dx * 1.6, FY + 2, SZ + 3, 0, { tint: '#f4f0e8' }); }
  b.prop('lectern', IX0 + 16, FY + 2, SZ + 6, 1, {});
  b.prop('candle_stand', IX1 - 16, FY + 2, SZ + 6, 3, {});
  // wedding: the kneeler for the couple and the priest's place
  b.prop('piano_bench', cxm, FY + 2, SZ + 9, 0, { tint: '#f4f0e8' });
  const sanctRoom = b.room('Sanctuary', IX0, FY + 2, SZ, IX1 - IX0, WH - 2, BZ - SZ + 16, { lightMode: 'always', kind: 'hall', nav: [cxm, SZ + 6] });
  b.spot('stand', cxm, FY + 2, SZ + 13, 0, { room: sanctRoom, act: 'speech', tags: ['altar_priest'], label: 'Officiating' });
  b.spot('stand', cxm - 1.6, FY + 2, SZ + 7.5, 2, { room: sanctRoom, act: 'stand', tags: ['altar_couple'], label: 'At the altar' });
  b.spot('stand', cxm + 1.6, FY + 2, SZ + 7.5, 2, { room: sanctRoom, act: 'stand', tags: ['altar_couple'], label: 'At the altar' });
  for (const dx of [-8, 8]) b.spot('stand', cxm + dx, FY + 2, SZ + 9, 2, { room: sanctRoom, act: 'stand', tags: ['wedding_party'], label: 'In the wedding party' });
  // rooms
  const narthex = b.room('Narthex', IX0, FY, IZ0, IX1 - IX0, LY - FY, NZ - IZ0, { lightMode: 'always', nav: [cxm, IZ0 + 6] });
  const nave = b.room('Nave', IX0, FY, NZ + 1, IX1 - IX0, WH + rise - 2, SZ - NZ - 1, { lightMode: 'always', kind: 'hall', nav: [cxm, NZ + 6] });
  const loft = b.room('Organ Loft', IX0, LY + 1, IZ0, IX1 - IX0, WH - LY, NZ - IZ0 + 3, { lightMode: 'auto' });
  const tower = b.room('Bell Tower', TX0 + 2, FY, TZ0 + 2, tw - 4, 14, TZ1 - TZ0 - 4, { lightMode: 'auto', ambient: 0.2 });
  const ent = b.entrance(narthex, cxm - 2, FY, FZ, { outZ: FZ - 12, outY: 0, leaf: 'door_wood', tint: '#7a2a24', main: true });
  b.door(null, null, cxm + 2, FY, FZ, { leaf: 'door_wood', tint: '#7a2a24' });
  const e2 = b.entrance(narthex, NX0 + 14, FY, FZ, { outZ: FZ - 10, outY: 0, leaf: 'door_wood', tint: '#7a2a24' });
  const e3 = b.entrance(narthex, NX1 - 14, FY, FZ, { outZ: FZ - 10, outY: 0, leaf: 'door_wood', tint: '#7a2a24' });
  b.door(narthex, nave, cxm, FY, NZ, { leaf: false });
  b.door(narthex, nave, NX0 + 14, FY, NZ, { leaf: false });
  b.door(narthex, nave, NX1 - 14, FY, NZ, { leaf: false });
  b.door(narthex, tower, TX0 + 1, FY, FZ + 6, { axis: 'z', leaf: 'door_wood' });
  const railGap = b.door(nave, sanctRoom, cxm, FY + 2, SZ + 1, { leaf: false });
  void railGap;
  // stair to the organ loft along the narthex's left end
  stairs(f, IX0 + 1, FY, NZ - 5, '+x', LY + 1 - FY, { w: 4, run: 2, mat: MAT.wood_mid, rail: false });
  b.stairs(narthex, [IX0 + 1, FY, NZ - 3], loft, [IX0 + 1 + (LY + 1 - FY) * 2 + 1, LY + 1, NZ - 3]);
  // organ loft
  b.prop('organ_pipes', cxm, LY + 1, IZ0 + 1.2, 2, {});
  b.prop('organ_console', cxm, LY + 1, IZ0 + 7, 0, {});
  const organ = b.spot('sit', cxm, LY + 1, IZ0 + 9.4, 0, { room: loft, act: 'organ', tags: ['organ'], seat: 0.55, label: 'At the organ' });
  b.job('organist', organ, { shift: ['13:15', '15:15'], title: 'organist at St. Brigid\'s' });
  for (let i = 0; i < 6; i++) { const x = IX0 + 34 + i * 4 + (i >= 3 ? 20 : 0); b.prop('choir_chair', x, LY + 1, NZ, 0, {}); b.spot('sit', x, LY + 1, NZ, 0, { room: loft, act: 'sing', tags: ['choir_catholic'], seat: 0.45 }); }
  // pews with white ribbons and bows for the wedding
  const pews = [];
  const pewXL = (IX0 + 13 + cxm - 3) / 2, pewXR = (cxm + 3 + IX1 - 13) / 2;
  for (let r = 0, z = SZ - 8; z > NZ + 5; z -= 4.5, r++) {
    for (const x of [pewXL, pewXR]) pews.push(...pewRow(b, nave, x, FY, z, 2, ['pew'], { tint: '#5a3a24', label: 'At Mass' }));
    if (r < 12) for (const x of [cxm - 4, cxm + 3]) { f.box(x, FY + 2, Math.round(z), 1, 2, 1, MAT.canvas_white); f.box(x, FY + 4, Math.round(z), 1, 1, 1, MAT.flowerbed_red); }
  }
  // side aisles: confessionals, side altars, votive candles, Stations of the Cross
  for (const [x0, dir] of [[IX0, 1], [IX1 - 10, 3]]) {
    const mid = x0 + 5;
    // side altar with a statue (St. Brigid on the left, Our Lady on the right)
    f.box(x0, FY, SZ - 10, 10, 3, 6, MAT.marble);
    figure(f, mid, FY + 3, SZ - 7, 0, dir === 1 ? MAT.plaster_white : MAT.plaster_blue, 'captain', dir === 1 ? MAT.plaster_cream : MAT.plaster_white);
    b.prop('candle_stand', mid, FY, SZ - 14, 0, {});
    b.prop('vase_flowers', mid - 3, FY + 3, SZ - 8, 0, { tint: '#f4f0e8' });
    b.spot('kneel', mid, FY, SZ - 17, 2, { room: nave, act: 'pray', tags: ['pray'] });
  }
  readAt(b, IX0 + 5, FY + 5, SZ - 10, 0, 'Shrine of St. Brigid', 'SAINT BRIGID OF KILDARE\nPatroness of Ireland, of dairymaids, of travelers and of mariners.\n\nThis statue came from County Clare in 1882 in the hold of the barque\nNORA CREINA, packed in straw and prayed over the whole way.\nThe Halloran and Doyle families paid for its passage.\n\nThe votive lights are lit today for the Novak-Brennan wedding,\nfor Sal Castellano\'s safe return, and for Carol Kaminski.', 2.4);
  // confessionals on the left aisle
  for (const cz0 of [NZ + 30, NZ + 58]) {
    f.box(IX0, FY, cz0, 5, 12, 14, MAT.wood_dark);
    f.carve(IX0 + 1, FY, cz0 + 1, 4, 10, 3); f.carve(IX0 + 1, FY, cz0 + 5, 4, 10, 4); f.carve(IX0 + 1, FY, cz0 + 10, 4, 10, 3);
    f.box(IX0 + 4, FY + 1, cz0 + 1, 1, 9, 3, MAT.velvet_red); f.box(IX0 + 4, FY + 1, cz0 + 10, 1, 9, 3, MAT.velvet_red);
    f.box(IX0 + 5, FY + 12, cz0 + 4, 1, 3, 6, MAT.wood_dark);
    f.box(IX0 + 5, FY + 13, cz0 + 6, 1, 1, 2, MAT.trim_gold);
  }
  const confess = b.spot('sit', IX0 + 2.5, FY, NZ + 37, 1, { room: nave, act: 'listen_sit', tags: ['confession'], seat: 0.45 });
  b.spot('kneel', IX0 + 2.5, FY, NZ + 32, 1, { room: nave, act: 'pray', tags: ['pray'] });
  readAt(b, IX0 + 6, FY + 6, NZ + 37, 1, 'Confessions', 'CONFESSIONS\nSaturdays 4:00 - 5:30 and 7:30 - 8:30 P.M.\nand by appointment at the Rectory.\n\nFr. Francis X. Garrity, Pastor', 2.2);
  const stations = ['I. Jesus is condemned to death', 'II. Jesus takes up His Cross', 'III. Jesus falls the first time', 'IV. Jesus meets His Mother', 'V. Simon helps carry the Cross', 'VI. Veronica wipes His face', 'VII. Jesus falls the second time', 'VIII. Jesus meets the women of Jerusalem', 'IX. Jesus falls the third time', 'X. Jesus is stripped', 'XI. Jesus is nailed to the Cross', 'XII. Jesus dies on the Cross', 'XIII. Jesus is taken down', 'XIV. Jesus is laid in the tomb'];
  for (let i = 0; i < 14; i++) {
    const left = i < 7, k = left ? i : 13 - i;
    const z = NZ + 10 + k * ((SZ - NZ - 24) / 6);
    const x = left ? IX0 + 0.6 : IX1 - 0.6;
    b.prop('painting', x, FY + 10, z, left ? 1 : 3, { tint: '#8a6a3a', scale: 0.55 });
    f.box(left ? IX0 : IX1 - 1, FY + 14, Math.round(z), 1, 2, 1, MAT.wood_dark);
    if (i === 0 || i === 13) readAt(b, x, FY + 9, z, left ? 1 : 3, 'Stations of the Cross', 'THE STATIONS OF THE CROSS\n\n' + stations.join('\n') + '\n\nCarved in Oberammergau, 1893. Given by the Cannery Workers of St. Brigid\'s Parish,\n"a penny a week for four years."', 2.2);
  }
  // window dedications
  readAt(b, IX0 + 1, FY + 8, FZ + 20, 1, 'Memorial windows', 'MEMORIAL WINDOWS (north aisle, from the door)\n\n1. In memory of Patrick Flynn, seaman, aged 22, lost with the schooner MARY ELLEN, October 1867.\n2. In memory of Pvt. Michael Kearney, 28th Mass. (Irish Brigade), Petersburg, 1864.\n3. Given by the Ancient Order of Hibernians, Div. 4, 1890.\n4. In memory of Nurse Mary Catherine Doyle, Army Nurse Corps, 1918.\n5. The Blessing of the Fleet window, given by the Portuguese Holy Ghost Society, 1924.', 2.4);
  // narthex: holy water fonts, notices, the pastors' board
  for (const x of [cxm - 7, cxm + 7]) b.prop('baptismal_font', x, FY, NZ - 2, 0, { scale: 0.7 });
  b.prop('baptismal_font', IX1 - 6, FY, IZ0 + 4, 3, {});
  readAt(b, IX1 - 3, FY + 5, IZ0 + 8, 3, 'Parish notice board', 'ST. BRIGID\'S PARISH - NOTICES\n\nMASSES: Sunday 7, 8:30, 10 (High Mass) and 11:30. Weekdays 7 A.M.\nCONFESSIONS: Saturday 4 - 5:30 and 7:30 - 8:30 P.M.\n\nTODAY at 2 o\'clock: the Nuptial Mass of\nHELEN STELLA NOVAK and ROBERT JOSEPH BRENNAN.\nReception to follow in the Parish Hall. All parishioners welcome to the church.\n\nThe Altar Society bake sale is at the Centennial fair (Founders Square) until 5.\nC.Y.O. dance postponed on account of the Sock Hop. You know who you are.\nThe Blessing of the Fleet raised $412.60 for the new roof. God bless you all.', 2.6);
  f.box(NX0 + 2, FY, FZ - 1, 10, 4, 1, MAT.granite_pink);
  signLine(b, 'A.D. 1882', NX0 + 7, FY + 1.4, FZ - 1.05, 0, { bg: '#b39488', fg: '#3a2a22', border: '#b39488', scale: 0.4 });
  readAt(b, NX0 + 7, FY + 2, FZ - 1, 0, 'Cornerstone', 'ST. BRIGID\'S CHURCH\nCORNER STONE LAID AUGUST 15, 1882\nRt. Rev. John J. Williams, Bishop of Boston, officiating.\nBuilt by the Irish families of Juniper Bay, who came to lay the railroad\nand stayed to work the wharves.', 2.4);
  readAt(b, tcx, FY + 4, TZ0 + 4, 2, 'The bell', 'THE BELL\nCast by Meneely & Kimberly, Troy, New York, 1884. 2,100 pounds.\nInscription: "SANCTA BRIGIDA ORA PRO NOBIS - JUNIPER BAY 1884"\n\nIt rang for an hour on V-J Day, 1945, until the rope broke.\nIt will ring today at three o\'clock for Helen and Robert.', 2.4);
  // sacristy & rectory path: priest's job spots, sexton
  const priestA = b.spot('kneel', cxm, FY + 2, altZ - 8, 2, { room: sanctRoom, act: 'pray', tags: ['priest'] });
  const priestB = b.spot('stand', cxm + 6, FY, IZ0 + 6, 0, { room: narthex, act: 'talk', tags: ['priest'] });
  b.job('priest', [priestA, confess, priestB], { shift: ['7:00', '20:30'], title: 'pastor of St. Brigid\'s', outfit: 'clergy', sex: 'M', age: [45, 75] });
  const sexton = b.spot('stand', cxm - 10, FY, NZ + 20, 2, { room: nave, act: 'sweep', tags: ['work'] });
  b.job('sexton', [sexton, b.spot('stand', IX1 - 18, FY + 2, SZ + 8, 3, { room: sanctRoom, act: 'stand', tags: ['work'] })], { shift: ['8:00', '18:00'], title: 'sexton', sex: 'M' });
  // lights
  for (let z = NZ + 16; z < SZ; z += 26) { b.prop('chandelier', cxm, wallTop - 6, z, 0, {}); }
  b.light(cxm, FY + 14, (NZ + SZ) / 2, { mode: 'room', room: nave, radius: 18, color: [1, 0.85, 0.6] });
  b.light(cxm, FY + 12, SZ + 10, { mode: 'room', room: sanctRoom, radius: 12, color: [1, 0.9, 0.7] });
  // churchyard: a Celtic cross, trees, the wedding car waiting
  const gx = Math.round(NX0 / 2) + 1;
  if (NX0 > 10) { f.box(gx - 2, 0, FZ + 40, 4, 1, 4, MAT.granite); f.box(gx - 1, 1, FZ + 41, 2, 10, 2, MAT.granite); f.box(gx - 3, 7, FZ + 41, 6, 2, 2, MAT.granite); f.cylinder(gx, 6, FZ + 42, 2.5, 1, MAT.granite, 1); }
  b.prop('tree_maple_red', gx, 0, FZ + 12, 0, { cat: 'far' });
  b.prop('tree_oak', gx, 0, BZ - 10, 0, { cat: 'far' });
  b.prop('car_sedan', NX0 + NW / 2 + 22, 0, -8, 1, { tint: '#1c1c20', cat: 'far' });
  for (const e of [ent, e2, e3]) linkToSidewalk(ctx, e);
  void rng; void pews; void tower;
  return b;
}


// Long banquet table (world voxels) along z with white cloth, folding chairs & sit spots on both sides.
function banquetZ(b, room, x, y, z0, len, tags, o = {}) {
  const f = b.f;
  f.box(x - 3, y + 2, z0, 6, 1, len, MAT.canvas_white);
  f.box(x - 3, y + 1, z0, 6, 1, 1, MAT.canvas_white); f.box(x - 3, y + 1, z0 + len - 1, 6, 1, 1, MAT.canvas_white);
  for (const zz of [z0 + 1, z0 + len - 2]) for (const xx of [x - 3, x + 2]) f.box(xx, y, zz, 1, 2, 1, MAT.wood_dark);
  const seats = [];
  for (let z = z0 + 2; z <= z0 + len - 2; z += 3.2) {
    for (const [dx, rot] of [[-4.6, 1], [4.6, 3]]) {
      b.prop(o.chair || 'chair_folding', x + dx, y, z, rot, { tint: o.chairTint });
      seats.push(b.spot('sit', x + dx, y, z, rot, { room, act: o.act || 'eat', tags, seat: 0.45, label: o.label }));
      b.prop('table_setting', x + dx * 0.55, y + 3, z, (rot + 2) % 4, {});
    }
  }
  for (let z = z0 + 4; z < z0 + len - 2; z += 10) b.prop(o.centre || 'vase_flowers', x, y + 3, z, 0, { tint: o.centreTint || '#f4f0e8' });
  return seats;
}

// =====================================================================================
// ST. BRIGID'S RECTORY & PARISH HALL — the Novak-Brennan wedding reception
// =====================================================================================
function buildRectory(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || "St. Brigid's Rectory & Parish Hall", kind: 'rectory', lot, address: lot.address, established: 1884,
    lore: 'The priests\' house (1884) and the parish hall (1925), where half the town has had its wedding breakfast.', hours: [8 * 60, 22 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('rectory' + lot.x);
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  // side path from the street to the parish hall
  const PX = 3;
  f.box(PX - 2, -1, 0, 6, 1, D - 10, MAT.sidewalk);
  // ---------------------------------------------------------------- the rectory (priests' house)
  const hx0 = PX + 8, hx1 = Math.min(W - 10, hx0 + 60), hz0 = 16, hz1 = 58, FH = 13;
  const hw = hx1 - hx0, hd = hz1 - hz0;
  f.box(hx0, 0, hz0, hw, 1, hd, MAT.floor_oak);
  shell(f, hx0, 0, hz0, hw, FH * 2, hd, MAT.brick_red, MAT.wallpaper_cream, 2);
  f.box(hx0, FH, hz0 + 1, hw - 1, 1, hd - 2, MAT.floor_oak);
  f.box(hx0, FH * 2, hz0, hw, 1, hd, MAT.ceiling);
  f.hip(hx0, FH * 2 + 1, hz0, hw, hd, MAT.roof_slate, { overhang: 2, rise: 1 });
  chimney(f, hx0 + 6, 0, hz0 + 20, 4, 4, FH * 2 + 16, MAT.brick_red);
  chimney(f, hx1 - 10, 0, hz0 + 20, 4, 4, FH * 2 + 16, MAT.brick_red);
  f.box(hx0 - 1, FH * 2 - 1, hz0 - 1, hw + 2, 1, hd + 2, MAT.limestone);
  const dX = hx0 + Math.round(hw / 2) - 2;
  doorway(f, dX, 1, hz0, 4, 9, { frame: MAT.limestone, t: 2, transom: true, step: false });
  f.box(dX - 4, 0, hz0 - 5, 12, 1, 5, MAT.granite);
  f.box(dX - 4, 11, hz0 - 5, 12, 1, 5, MAT.roof_slate);
  for (const x of [dX - 4, dX + 7]) f.box(x, 1, hz0 - 5, 1, 10, 1, MAT.trim_white);
  const wo = { t: 2, frame: MAT.limestone, lintelWide: true, shutters: MAT.trim_green };
  for (const x of [hx0 + 5, hx0 + 14, dX + 10, dX + 19]) if (x + 4 < hx1 - 2) { win(f, x, 4, hz0, 4, 7, wo); win(f, x, FH + 3, hz0, 4, 7, wo); }
  win(f, dX, FH + 3, hz0, 4, 7, wo);
  f.box(hx0 + 1, 1, hz0 + 1, 1, 1, 1, MAT.floor_oak);
  const midX = dX - 3, midX2 = dX + 7, midZ = hz0 + 22;
  partitionZ(f, hz0 + 2, hz1 - 2, 1, midX, FH - 1, MAT.wallpaper_cream, [{ at: hz0 + 6, w: 4 }, { at: midZ + 4, w: 4 }]);
  partitionZ(f, hz0 + 2, hz1 - 2, 1, midX2, FH - 1, MAT.wallpaper_cream, [{ at: hz0 + 6, w: 4 }, { at: midZ + 4, w: 4 }]);
  partitionX(f, hx0 + 2, midX, 1, midZ, FH - 1, MAT.wallpaper_cream, [{ at: hx0 + 6, w: 4 }]);
  partitionX(f, midX2 + 1, hx1 - 2, 1, midZ, FH - 1, MAT.wallpaper_cream, [{ at: hx1 - 10, w: 4 }]);
  const hall = b.room('Rectory Hall', midX + 1, 1, hz0 + 2, midX2 - midX - 1, FH - 1, hd - 4, { lightMode: 'auto' });
  const parlor = b.room('Rectory Parlor', hx0 + 2, 1, hz0 + 2, midX - hx0 - 2, FH - 1, midZ - hz0 - 2, { lightMode: 'auto' });
  const study = b.room("Father Garrity's Study", midX2 + 1, 1, hz0 + 2, hx1 - midX2 - 3, FH - 1, midZ - hz0 - 2, { lightMode: 'auto' });
  const dining = b.room('Rectory Dining Room', hx0 + 2, 1, midZ + 1, midX - hx0 - 2, FH - 1, hz1 - midZ - 3, { lightMode: 'auto' });
  const kitchen = b.room('Rectory Kitchen', midX2 + 1, 1, midZ + 1, hx1 - midX2 - 3, FH - 1, hz1 - midZ - 3, { lightMode: 'auto' });
  const eR = b.entrance(hall, dX + 2, 1, hz0, { outZ: hz0 - 8, leaf: 'door_wood', tint: '#2a3a2a', main: true });
  b.door(hall, parlor, midX, 1, hz0 + 8, { axis: 'z', leaf: 'door_wood' });
  b.door(hall, study, midX2, 1, hz0 + 8, { axis: 'z', leaf: 'door_wood' });
  b.door(hall, dining, midX, 1, midZ + 6, { axis: 'z', leaf: false });
  b.door(hall, kitchen, midX2, 1, midZ + 6, { axis: 'z', leaf: 'door_wood' });
  // parlor: where couples come to post the banns
  b.prop('rug_oval', (hx0 + midX) / 2, 1, (hz0 + midZ) / 2, 0, { tint: '#6a2a2a' });
  b.prop('sofa', (hx0 + midX) / 2, 1, midZ - 3, 0, { tint: '#5a3a3a' });
  b.prop('armchair', hx0 + 4, 1, hz0 + 10, 1, { tint: '#6a5a3a' }); b.prop('armchair', midX - 3, 1, hz0 + 10, 3, { tint: '#6a5a3a' });
  b.prop('piano_upright', hx0 + 4, 1, midZ - 3, 1, {});
  framed(b, 'portrait', (hx0 + midX) / 2, 7, hz0 + 2.6, 2, 'Portrait of Pope Pius XII', 'His Holiness Pope Pius XII. The frame is from the parlor of the first pastor, Fr. Dennis Mahoney (1882 - 1906).');
  f.box(midX - 1, 6, hz0 + 14, 1, 5, 1, MAT.wood_dark); f.box(midX - 1, 9, hz0 + 13, 1, 1, 3, MAT.wood_dark);
  // study
  const gx0 = midX2 + 1, gw = hx1 - midX2 - 3;
  b.prop('desk_rolltop', gx0 + gw / 2, 1, hz0 + 3.5, 2, {});
  b.prop('chair_office', gx0 + gw / 2, 1, hz0 + 6.5, 0, {});
  const studySeat = b.spot('sit', gx0 + gw / 2, 1, hz0 + 6.5, 0, { room: study, act: 'write', tags: ['priest'], seat: 0.46 });
  b.prop('bookshelf', gx0 + 1.2, 1, hz0 + 12, 1, {}); b.prop('bookshelf', gx0 + 1.2, 1, hz0 + 17, 1, {});
  b.prop('armchair', gx0 + gw - 3, 1, midZ - 4, 3, { tint: '#4a3a2a' });
  b.prop('radio_table', gx0 + gw - 2, 1, hz0 + 4, 3, {});
  readAt(b, gx0 + gw / 2, 5, hz0 + 3.5, 2, 'Father Garrity\'s desk', 'On the blotter, in Father Garrity\'s hand:\n\nSAT. 26th\n- 11: Castellano boat? (No - blessed in June. Tell Sal Sr. it\'s still blessed.)\n- 2:00 NOVAK / BRENNAN. Nuptial Mass. Rings - ask Walter N. (usher) NOT Joe B.\n- 3:00 bell. Tell Mickey to ring it till his arms fall off.\n- Reception: say grace, one polka with Stella Novak, leave before the Mayor starts.\n- 4:00 confessions.\n- 6:30 supper at the Castellanos\'. Bring the good wine. Home safe, thanks be to God.\n\nAnd underneath: "Kaminski - St. Luke\'s - visit Sunday."', 2);
  // dining & kitchen (the housekeeper, Mrs. Doyle)
  const din = [];
  b.prop('table_dining', (hx0 + midX) / 2, 1, (midZ + hz1) / 2, 0, { tint: '#e8e0d0' });
  for (const [dx, rot] of [[-2.6, 2], [2.6, 0]]) { b.prop('chair_wood', (hx0 + midX) / 2, 1, (midZ + hz1) / 2 + dx, rot, {}); din.push(b.spot('sit', (hx0 + midX) / 2, 1, (midZ + hz1) / 2 + dx, rot, { room: dining, act: 'eat', tags: ['rectory'], seat: 0.45 })); }
  b.prop('sideboard', hx0 + 3, 1, (midZ + hz1) / 2, 1, {});
  const kit = kitchenRun(b, kitchen, midX2 + 1, 1, hz1 - 2, hx1 - midX2 - 4, { counterTint: '#e8e0c8' });
  b.job('housekeeper', [...kit.spots, b.spot('stand', midX2 + 6, 1, midZ + 5, 1, { room: kitchen, act: 'sweep', tags: ['work'] })], { shift: ['7:00', '19:00'], title: 'rectory housekeeper', sex: 'F', age: [45, 70] });
  b.prop('table_kitchen', midX2 + gw / 2 + 1, 1, midZ + 8, 0, { tint: '#e0e0d0' });
  // upstairs bedrooms (the pastor and the curate)
  const up = b.room('Rectory Upstairs', hx0 + 2, FH + 1, hz0 + 2, hw - 4, FH - 1, hd - 4, { lightMode: 'auto' });
  stairs(f, midX + 1, 1, midZ + 3, '+z', FH, { w: 4, run: 1, mat: MAT.wood_mid, rail: false });
  b.stairs(hall, [midX + 3, 1, midZ + 1], up, [midX + 3, FH + 1, midZ + 3 + FH + 1]);
  b.prop('bed_single', hx0 + 6, FH + 1, hz0 + 8, 0, { tint: '#e8e4d8' }); b.prop('bed_single', hx1 - 8, FH + 1, hz0 + 8, 0, { tint: '#e8e4d8' });
  b.prop('dresser', hx0 + 4, FH + 1, hz1 - 4, 0, {}); b.prop('wardrobe', hx1 - 5, FH + 1, hz1 - 4, 0, {});
  // ---------------------------------------------------------------- the parish hall (1925)
  const px0 = PX + 6, px1 = W - 3, pz0 = Math.max(hz1 + 12, 72), pz1 = D - 8, HH = 22;
  const pw = px1 - px0, pd = pz1 - pz0;
  f.box(px0, 0, pz0, pw, 1, pd, MAT.floor_oak_z);
  shell(f, px0, 0, pz0, pw, HH, pd, MAT.brick_brown, MAT.plaster_cream, 2);
  f.box(px0, HH, pz0, pw, 1, pd, MAT.ceiling);
  f.gable(px0, HH + 1, pz0, pw, pd, MAT.roof_shingle_gray, { axis: 'z', overhang: 1, gableMat: MAT.brick_brown });
  f.box(px0 + 2, HH - 1, pz0 + 2, pw - 4, 1, pd - 4, MAT.ceiling_tin);
  f.text('PARISH HALL', px0 + pw / 2, HH - 7, pz0 - 1, MAT.limestone, { align: 'center', font: 'small' });
  f.text('1925', px0 + pw / 2, HH - 13, pz0 - 1, MAT.limestone, { align: 'center', font: 'small' });
  const hdX = px0 + Math.round(pw / 2) - 4;
  doorway(f, hdX, 1, pz0, 8, 10, { frame: MAT.limestone, t: 2, transom: true });
  for (let x = px0 + 6; x < px1 - 6; x += 12) if (Math.abs(x + 2 - (hdX + 4)) > 8) win(f, x, 5, pz0, 4, 9, { t: 2, frame: MAT.trim_white });
  for (let z = pz0 + 10; z < pz1 - 8; z += 14) { winSide(f, 3, z, 5, px0, 4, 10, { t: 2, frame: MAT.trim_white }); winSide(f, 1, z, 5, px1, 4, 10, { t: 2, frame: MAT.trim_white }); }
  const IX0 = px0 + 2, IX1 = px1 - 2, IZ0 = pz0 + 2, IZ1 = pz1 - 2, cxh = (IX0 + IX1) / 2;
  const KZ = IZ1 - 18;       // kitchen partition (back)
  partitionX(f, IX0, IX1, 1, KZ, HH - 2, MAT.plaster_cream, [{ at: IX0 + 6, w: 4 }, { at: IX1 - 22, w: 12, h: 6 }]);
  f.box(IX1 - 22, 1, KZ, 12, 4, 1, MAT.counter_formica);     // pass-through counter
  const phall = b.room('Parish Hall', IX0, 1, IZ0, IX1 - IX0, HH - 2, KZ - IZ0, { lightMode: 'always', kind: 'hall', nav: [cxh, IZ0 + 6] });
  const pkit = b.room('Parish Hall Kitchen', IX0, 1, KZ + 1, IX1 - IX0, HH - 2, IZ1 - KZ - 1, { lightMode: 'always' });
  const eH = b.entrance(phall, hdX + 2, 1, pz0, { outZ: pz0 - 6, leaf: 'door_wood', tint: '#5a3a24' });
  b.door(null, null, hdX + 6, 1, pz0, { leaf: 'door_wood', tint: '#5a3a24' });
  b.door(phall, pkit, IX0 + 8, 1, KZ, { leaf: 'door_wood' });
  // path: hall door -> side walk -> street (around the rectory)
  const n1 = b.navPoint(0, PX, 0, pz0 - 6), n2 = b.navPoint(0, PX, 0, hz0 - 4), n3 = b.navPoint(0, PX, 0, 2);
  ctx.nav.chain([eH, n1, n2, n3]);
  ctx.nav.link(eR, n2);
  for (const n of [n1, n2, n3]) ctx.nav.info[n].kind = 'path';
  linkToSidewalk(ctx, eR); linkToSidewalk(ctx, n3);
  // the head table on the stage end, the long tables, dance floor & band corner
  const stageZ = KZ - 14;
  f.box(IX0, 1, stageZ, IX1 - IX0, 2, KZ - stageZ, MAT.stage_wood);
  f.box(IX0 + 4, 1, stageZ - 2, IX1 - IX0 - 8, 1, 2, MAT.stage_wood);
  const recSeats = [];
  // head table (bride & groom in the middle)
  f.box(cxh - 16, 5, stageZ + 5, 32, 1, 5, MAT.canvas_white); f.box(cxh - 16, 3, stageZ + 5, 32, 2, 1, MAT.canvas_white);
  for (let i = 0; i < 8; i++) {
    const x = cxh - 14 + i * 4;
    b.prop('chair_wood', x, 3, stageZ + 11.5, 0, { tint: '#e8e4d8' });
    recSeats.push(b.spot('sit', x, 3, stageZ + 11.5, 0, { room: phall, act: 'eat', tags: ['reception', 'head_table'], seat: 0.45, label: 'At the head table' }));
    b.prop('table_setting', x, 6, stageZ + 7.5, 2, {});
  }
  b.prop('vase_flowers', cxh - 8, 6, stageZ + 7, 0, { tint: '#f4f0e8', scale: 1.3 }); b.prop('vase_flowers', cxh + 8, 6, stageZ + 7, 0, { tint: '#f4f0e8', scale: 1.3 });
  b.prop('candles_pair', cxh, 6, stageZ + 7.5, 0, {});
  const stageNode = b.navPoint(phall, cxh, 3, stageZ + 3);
  // two long tables
  const tlen = Math.min(56, stageZ - IZ0 - 26);
  for (const x of [IX0 + 14, IX1 - 14]) recSeats.push(...banquetZ(b, phall, x, 1, IZ0 + 6, tlen, ['reception'], { label: 'At the wedding reception', centreTint: '#f4d0d8' }));
  // dance floor between the long tables and the stage
  const dz0 = IZ0 + 6 + tlen + 3, dz1 = stageZ - 3;
  f.box(cxh - 18, 0, dz0, 36, 1, dz1 - dz0, MAT.floor_checker);
  const danceSpots = [];
  for (let z = dz0 + 3; z < dz1 - 1; z += 4) for (let x = cxh - 14; x <= cxh + 14; x += 5) { const s = b.spot('stand', x, 1, z, rng.int(0, 3), { room: phall, act: 'dance', tags: ['reception_dance'], label: 'Dancing at the reception' }); s.spread = 0.8; danceSpots.push(s); }
  for (let z = IZ0 + 8; z < IZ0 + 6 + tlen; z += 8) { const s = b.spot('stand', cxh, 1, z, rng.int(0, 3), { room: phall, act: 'dance', tags: ['reception_dance'], label: 'Dancing at the reception' }); s.spread = 0.8; danceSpots.push(s); }
  // the band corner: the Kowalski Polka Boys
  const bx = IX1 - 10, bzz = stageZ + 2;
  b.prop('piano_upright', IX1 - 2.5, 3, bzz + 3, 3, {});
  b.prop('drum_kit', bx - 2, 3, bzz + 8, 0, {});
  b.prop('upright_bass_stand', bx + 3, 3, bzz + 8, 0, {});
  b.prop('music_stand', bx, 3, bzz + 2.5, 2, {});
  const bandActs = ['piano', 'drum_sit', 'bass', 'trumpet'];
  const bandSpots = [[IX1 - 4.5, bzz + 3, 1, 'sit'], [bx - 2, bzz + 10, 0, 'sit'], [bx + 3, bzz + 10, 0, 'stand'], [bx, bzz + 5, 0, 'stand']].map(([x, z, rot, pose], i) => b.spot(pose, x, 3, z, i === 0 ? 1 : rot, { room: phall, act: bandActs[i], tags: ['reception_band'], seat: pose === 'sit' ? 0.5 : 0, label: 'Playing polkas at the reception' }));
  for (const s of bandSpots) { ctx.nav.link(s.node, stageNode); }
  b.job('musician', bandSpots, { shift: ['15:15', '18:45'], title: 'musician, the Kowalski Polka Boys' });
  signLine(b, 'THE KOWALSKI POLKA BOYS', IX1 - 0.6, 9, bzz + 6, 3, { bg: '#8a1f24', fg: '#f0ece0', border: '#e8c870', scale: 0.4 });
  // the wedding cake, the gift table, the punch
  f.box(IX0 + 3, 1, stageZ - 10, 6, 3, 6, MAT.canvas_white);
  b.prop('birthday_cake', IX0 + 6, 4, stageZ - 7, 0, { scale: 2.2, tint: '#f4f0e8' });
  b.prop('birthday_cake', IX0 + 6, 5.6, stageZ - 7, 0, { scale: 1.5, tint: '#f4f0e8' });
  b.prop('birthday_cake', IX0 + 6, 6.7, stageZ - 7, 0, { scale: 0.9, tint: '#f4f0e8' });
  readAt(b, IX0 + 6, 5, stageZ - 7, 1, 'The wedding cake', 'THE WEDDING CAKE\nThree tiers, white fondant, sugar lilies-of-the-valley.\nBaked by Halloran & Sons (Pat Halloran would not take a penny:\n"Casimir Novak got my father a nickel an hour in \'34.")\nThe top tier goes in the Novaks\' freezer until the first anniversary.', 2.2);
  f.box(IX0 + 3, 1, IZ0 + 3, 12, 3, 5, MAT.canvas_white);
  const giftCols = [MAT.sign_white, MAT.sign_blue, MAT.tile_pink, MAT.sign_yellow, MAT.plaster_mint, MAT.sign_white];
  giftCols.forEach((m, i) => { f.box(IX0 + 4 + i * 2, 4, IZ0 + 4 + (i % 2) * 2, 1 + (i % 2), 1 + (i % 3 === 0 ? 1 : 0), 1, m); });
  readAt(b, IX0 + 9, 5, IZ0 + 5, 1, 'The gift table', 'THE GIFT TABLE\nA Sunbeam toaster (the Brennans). A set of Fiesta ware, turquoise (the Kowalskis).\nA quilt pieced by Grandma Novak from her mother\'s linens, Krakow, 1908.\nA savings bond from Local 1188. A copper saucepan from Garrity Hardware.\nAn envelope from Father Garrity marked "For the rent, not for the races."\nAnd a card, in a child\'s hand: "Dear Helen I hope you are Happy. Love Susie Moreau (7)."', 2.2);
  f.box(IX1 - 12, 1, IZ0 + 3, 8, 3, 5, MAT.canvas_white);
  b.prop('coffee_urn', IX1 - 10, 4, IZ0 + 5, 0, {}); b.prop('fruit_bowl', IX1 - 6, 4, IZ0 + 5, 0, {});
  // decorations: white & gold streamers, wedding bells, the banner
  const streamers = [MAT.canvas_white, MAT.trim_gold, MAT.canvas_white, MAT.tile_pink];
  for (let z = IZ0 + 16; z < KZ - 4; z += 26) bunting(f, [IX0 + 1, HH - 3, z], [IX1 - 1, HH - 3, z], 2.5, streamers);
  bunting(f, [cxh, HH - 2, IZ0 + 2], [cxh, HH - 2, KZ - 2], 2.5, streamers);
  f.text('HELEN & ROBERT', cxh, 13, KZ - 1, MAT.trim_gold, { align: 'center', font: 'small' });
  f.text('SEPT. 26, 1953', cxh, 7, KZ - 1, MAT.sign_blue, { align: 'center', font: 'small' });
  for (const x of [cxh - 34, cxh + 34]) { f.cylinder(x, 11, KZ - 2, 1.6, 3, MAT.sign_white, 1); f.box(Math.round(x), 14, KZ - 2, 1, 1, 1, MAT.trim_gold); }
  for (const z of [IZ0 + 18, IZ0 + 42]) b.prop('ceiling_lamp', cxh, HH - 4, z, 0, {});
  b.light(cxh, HH - 5, (IZ0 + KZ) / 2, { mode: 'room', room: phall, radius: 16, color: [1, 0.85, 0.65] });
  readAt(b, cxh, 6, IZ0 + 2, 0, 'Parish Hall notices', 'ST. BRIGID\'S PARISH HALL\nBuilt 1925 by the men of the parish, "on Saturdays and after Mass."\n\nTODAY: Reception for Mr. & Mrs. Robert Brennan, from 3:15.\nMusic by the Kowalski Polka Boys. Buffet by the Altar Society:\nham, pierogi, kielbasa, Mrs. Castellano\'s ziti, Irish soda bread,\nand a great deal of potato salad.\n\nBINGO resumes Tuesday. Please return all folding chairs to the stage closet.', 2.4);
  // kitchen: the Altar Society ladies
  const kk = kitchenRun(b, pkit, IX0 + 16, 1, IZ1, IX1 - IX0 - 20, { counterTint: '#e8e0c8', items: ['stove', 'kitchen_counter', 'stove', 'kitchen_sink', 'kitchen_counter', 'fridge', 'kitchen_counter', 'kitchen_sink'] });
  b.prop('table_kitchen', cxh, 1, KZ + 8, 0, { tint: '#e8e0d0' });
  b.prop('food_roast', cxh - 2, 4, KZ + 8, 0, {}); b.prop('food_casserole', cxh + 2, 4, KZ + 8, 0, {}); b.prop('food_bread', cxh, 4, KZ + 7, 0, {});
  b.job('cook', kk.spots.slice(0, 2), { shift: ['11:00', '19:30'], title: 'Altar Society cook', sex: 'F', age: [35, 75] });
  b.job('cook', kk.spots.slice(2).concat([b.spot('stand', IX1 - 16, 1, KZ + 3, 0, { room: pkit, act: 'counter', tags: ['work'] })]), { shift: ['12:00', '19:30'], title: 'Altar Society cook', sex: 'F', age: [30, 75] });
  b.prop('coffee_urn', IX1 - 16, 5, KZ, 0, {});
  // yard
  b.prop('tree_maple_orange', W - 10, 0, hz0 + 10, 0, { cat: 'far' });
  f.box(PX + 5, 0, hz0 + 25, 3, 2, 3, MAT.granite); figure(f, PX + 6, 2, hz0 + 26, 1, MAT.marble, 'captain', MAT.plaster_white);
  b.prop('garden_bench', W - 12, 0, hz1 + 4, 0, {});
  void din; void studySeat; void recSeats; void danceSpots;
  return b;
}

// =====================================================================================
// FIRST CONGREGATIONAL CHURCH (1871 meetinghouse) — choir practice at four
// =====================================================================================
function buildCongregational(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'First Congregational Church', kind: 'church_congregational', lot, address: lot.address, established: spec.est || 1853,
    lore: 'The oldest congregation in town (gathered 1853). The meetinghouse was raised in 1871 by fifty men in one day.', hours: [8 * 60, 19 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('congo' + lot.x);
  const FY = 3;
  const NW = Math.min(68, W - 40), NX0 = Math.round((W - NW) / 2), NX1 = NX0 + NW, cxm = Math.round(W / 2);
  const FZ = 44, BZ = Math.min(D - 60, 140), WH = 30, wallTop = FY + WH;
  // lawn, walk, fence
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(cxm - 5, -1, 0, 10, 1, FZ, MAT.sidewalk);
  for (let x = 4; x < W - 4; x += 8) if (Math.abs(x + 4 - cxm) > 8) b.prop('picket_fence', x + 4, 0, 1, 0, {});
  // plinth, steps
  f.box(NX0 - 1, 0, FZ - 16, NW + 2, FY, BZ - FZ + 17, MAT.granite);
  for (let k = 0; k < FY; k++) f.box(cxm - 12, 0, FZ - 16 - 2 * (FY - k), 24, k + 1, 2, MAT.granite);
  // the meetinghouse
  shell(f, NX0, FY, FZ, NW, WH, BZ - FZ, MAT.siding_white, MAT.plaster_white, 2);
  for (const x of [NX0, NX1 - 1]) f.box(x, FY, FZ - 1, 1, WH, 1, MAT.trim_white);
  f.box(NX0 - 1, wallTop - 1, FZ - 1, NW + 2, 2, BZ - FZ + 2, MAT.trim_white);
  const rise = f.gable(NX0, wallTop + 1, FZ, NW, BZ - FZ, MAT.roof_shingle_black, { axis: 'z', overhang: 2, gableMat: MAT.siding_white });
  vaultZ(f, NX0, wallTop + 1, FZ, NW, BZ - FZ, MAT.plaster_white);
  f.box(NX0 + 2, wallTop + 1, FZ + 2, NW - 4, 1, BZ - FZ - 4, MAT.plaster_white);
  f.carve(NX0 + 3, wallTop + 1, FZ + 2, NW - 6, 1, BZ - FZ - 4);
  // pediment trim on the front gable & the portico
  for (let i = 0; i < rise - 1; i++) { f.box(NX0 + i, wallTop + 1 + i, FZ - 1, 1, 1, 1, MAT.trim_white); f.box(NX1 - 1 - i, wallTop + 1 + i, FZ - 1, 1, 1, 1, MAT.trim_white); }
  const PZ = FZ - 14;
  for (const x of [cxm - 18, cxm - 7, cxm + 6, cxm + 17]) { f.box(x, FY, PZ + 1, 2, WH - 2, 2, MAT.trim_white); f.box(x - 1, FY, PZ, 4, 1, 4, MAT.trim_white); }
  f.box(cxm - 20, wallTop - 2, PZ, 40, 3, FZ - PZ, MAT.trim_white);
  for (let i = 0; i < 8; i++) f.box(cxm - 20 + 2 * i, wallTop + 1 + i, PZ, 40 - 4 * i, 1, FZ - PZ, MAT.siding_white);
  for (let i = 0; i < 8; i++) { f.box(cxm - 21 + 2 * i, wallTop + 1 + i, PZ - 1, 3, 1, 1, MAT.trim_white); f.box(cxm + 18 - 2 * i, wallTop + 1 + i, PZ - 1, 3, 1, 1, MAT.trim_white); }
  f.box(cxm - 20, FY - 1, PZ, 40, 1, FZ - PZ, MAT.wood_gray);
  f.text('FIRST CHURCH', cxm, wallTop - 2, PZ - 1, MAT.trim_black, { align: 'center', font: 'small' });
  f.text('1853', cxm, wallTop + 3, PZ - 1, MAT.trim_black, { align: 'center', font: 'small' });
  // the steeple (rises from behind the portico): tower, belfry, clock, lantern, spire, codfish weathervane
  const SX0 = cxm - 10, SZ0 = FZ + 2, SW = 20;
  const sy0 = wallTop + rise - 16;
  f.box(SX0, sy0, SZ0, SW, 20, SW, MAT.siding_white);
  for (const [x, z] of [[SX0, SZ0], [SX0 + SW - 1, SZ0], [SX0, SZ0 + SW - 1], [SX0 + SW - 1, SZ0 + SW - 1]]) f.box(x, sy0, z, 1, 20, 1, MAT.trim_white);
  const by0 = sy0 + 20;
  f.box(SX0 - 1, by0, SZ0 - 1, SW + 2, 1, SW + 2, MAT.trim_white);
  // belfry with louvred arches
  f.walls(SX0 + 1, by0 + 1, SZ0 + 1, SW - 2, 14, SW - 2, MAT.siding_white, 1);
  for (const dir of [0, 1, 2, 3]) {
    const [F, x, z] = onWall(f, dir, (dir === 0 || dir === 2 ? SX0 : SZ0) + 5, 8, dir === 0 ? SZ0 + 1 : dir === 2 ? SZ0 + SW - 1 : dir === 3 ? SX0 + 1 : SX0 + SW - 1);
    F.archCarve(x, by0 + 2, z, 8, 11, 1);
    for (let yy = by0 + 2; yy < by0 + 9; yy += 2) F.box(x, yy, z, 8, 1, 1, MAT.trim_white);
  }
  f.cylinder(cxm, by0 + 5, SZ0 + SW / 2, 2.6, 4, MAT.trim_gold, 1);
  f.box(cxm - 1, by0 + 9, SZ0 + SW / 2 - 1, 2, 1, 2, MAT.wood_dark);
  const cy0 = by0 + 15;
  f.box(SX0, cy0, SZ0, SW, 12, SW, MAT.siding_white);
  f.box(SX0 - 1, cy0, SZ0 - 1, SW + 2, 1, SW + 2, MAT.trim_white); f.box(SX0 - 1, cy0 + 12, SZ0 - 1, SW + 2, 1, SW + 2, MAT.trim_white);
  clockOn(f, 0, cxm, cy0 + 6, SZ0 - 1, 4.5);
  clockOn(f, 2, cxm, cy0 + 6, SZ0 + SW, 4.5);
  clockOn(f, 3, SZ0 + SW / 2, cy0 + 6, SX0 - 1, 4.5);
  clockOn(f, 1, SZ0 + SW / 2, cy0 + 6, SX0 + SW, 4.5);
  const ly0 = cy0 + 13;
  f.cylinder(cxm, ly0, SZ0 + SW / 2, 7, 10, MAT.siding_white, 1);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 2 * PI; f.box(Math.floor(cxm + Math.cos(a) * 6.5), ly0 + 2, Math.floor(SZ0 + SW / 2 + Math.sin(a) * 6.5), 1, 6, 1, MAT.glass_dark); }
  f.cylinder(cxm, ly0 + 10, SZ0 + SW / 2, 8, 1, MAT.trim_white);
  let sr = 7, sy = ly0 + 11;
  while (sr > 0.8) { f.cylinder(cxm, sy, SZ0 + SW / 2, sr, 3, MAT.roof_shingle_black); sy += 3; sr -= 0.55; }
  f.box(cxm, sy, SZ0 + SW / 2, 1, 6, 1, MAT.trim_gold);
  f.box(cxm - 2, sy + 5, SZ0 + SW / 2, 5, 1, 1, MAT.trim_gold); f.box(cxm + 2, sy + 6, SZ0 + SW / 2, 1, 1, 1, MAT.trim_gold); f.box(cxm - 3, sy + 4, SZ0 + SW / 2, 1, 3, 1, MAT.trim_gold);
  b.light(cxm, cy0 + 6, SZ0 - 3, { color: [1, 0.95, 0.8], radius: 5, mode: 'night' });
  // facade: doors & windows
  doorway(f, cxm - 3, FY, FZ, 6, 11, { frame: MAT.trim_white, t: 2, transom: true, step: false });
  for (const x of [cxm - 16, cxm + 12]) doorway(f, x, FY, FZ, 4, 10, { frame: MAT.trim_white, t: 2, step: false });
  win(f, cxm - 3, FY + 17, FZ, 6, 8, { t: 2, frame: MAT.trim_white, style: 'arch' });
  const wo = { t: 2, frame: MAT.trim_white, shutters: MAT.trim_black, lintelWide: true };
  for (const x of [NX0 + 5, NX1 - 10]) { win(f, x, FY + 4, FZ, 5, 12, wo); win(f, x, FY + 19, FZ, 5, 7, wo); }
  for (let z = FZ + 22; z < BZ - 6; z += 13) { winSide(f, 3, z, FY + 6, NX0, 6, 17, wo); winSide(f, 1, z, FY + 6, NX1, 6, 17, wo); }
  // ---- interior
  const IX0 = NX0 + 2, IX1 = NX1 - 2, IZ0 = FZ + 2, IZ1 = BZ - 2;
  const VZ = IZ0 + 12, GY = FY + 13, CZ = IZ1 - 26;
  f.box(IX0, FY - 1, IZ0, IX1 - IX0, 1, IZ1 - IZ0, MAT.floor_pine_z);
  f.box(cxm - 2, FY - 1, VZ, 4, 1, CZ - VZ, MAT.carpet_red);
  partitionX(f, IX0, IX1, FY, VZ, GY - FY, MAT.plaster_white, [{ at: cxm - 3, w: 6 }, { at: cxm - 16, w: 4 }, { at: cxm + 12, w: 4 }]);
  f.box(IX0, GY, IZ0, IX1 - IX0, 1, VZ - IZ0 + 6, MAT.floor_pine);
  for (let x = IX0; x < IX1; x += 2) f.box(x, GY + 1, VZ + 5, 1, 3, 1, MAT.trim_white);
  f.box(IX0, GY + 4, VZ + 5, IX1 - IX0, 1, 1, MAT.wood_mid);
  for (const x of [IX0 + 10, IX1 - 11]) f.box(x, FY, VZ + 5, 1, GY - FY, 1, MAT.trim_white);
  const vest = b.room('Vestibule', IX0, FY, IZ0, IX1 - IX0, GY - FY, VZ - IZ0, { lightMode: 'always', nav: [cxm, IZ0 + 5] });
  const sanct = b.room('Meeting Room', IX0, FY, VZ + 1, IX1 - IX0, WH + rise - 2, IZ1 - VZ - 1, { lightMode: 'always', kind: 'hall', nav: [cxm, VZ + 5] });
  const gallery = b.room('Gallery', IX0, GY + 1, IZ0, IX1 - IX0, WH - GY + FY, VZ - IZ0 + 6, { lightMode: 'auto' });
  const eM = b.entrance(vest, cxm - 1.5, FY, FZ, { outZ: PZ - 8, outY: 0, leaf: 'door_wood', tint: '#2a2a2e', main: true });
  b.door(null, null, cxm + 1.5, FY, FZ, { leaf: 'door_wood', tint: '#2a2a2e', width: 3 });
  const eL = b.entrance(vest, cxm - 14, FY, FZ, { outZ: PZ - 6, outY: 0, leaf: 'door_wood', tint: '#2a2a2e' });
  const eRr = b.entrance(vest, cxm + 14, FY, FZ, { outZ: PZ - 6, outY: 0, leaf: 'door_wood', tint: '#2a2a2e' });
  b.door(vest, sanct, cxm, FY, VZ, { leaf: false });
  b.door(vest, sanct, cxm - 14, FY, VZ, { leaf: false });
  b.door(vest, sanct, cxm + 14, FY, VZ, { leaf: false });
  stairs(f, IX1 - 5, FY, IZ0 + 1, '+z', GY + 1 - FY, { w: 4, run: 1, mat: MAT.wood_mid, rail: false });
  b.stairs(vest, [IX1 - 3, FY, IZ0 + 1], gallery, [IX1 - 3, GY + 1, IZ0 + 2 + GY + 1 - FY]);
  // box pews (world voxels, painted white with mahogany rails) in two blocks
  const pews = [];
  const pewW = Math.floor((IX1 - IX0 - 10) / 2) - 3;
  for (let z = VZ + 4; z + 5 < CZ - 3; z += 6) {
    for (const [x0, doorSide] of [[IX0 + 2, 1], [cxm + 3, 0]]) {
      f.walls(x0, FY, z, pewW, 4, 6, MAT.trim_white, 1);
      f.box(x0, FY + 4, z, pewW, 1, 1, MAT.wood_dark); f.box(x0, FY + 4, z + 5, pewW, 1, 1, MAT.wood_dark);
      f.carve(doorSide ? x0 + pewW - 1 : x0, FY, z + 2, 1, 4, 2);
      f.box(doorSide ? x0 + pewW - 1 : x0, FY, z + 2, 1, 4, 1, MAT.wood_mid);
      f.box(x0 + 1, FY, z + 1, pewW - 2, 2, 1, MAT.wood_mid);
      f.box(x0 + 1, FY + 2, z + 1, pewW - 2, 1, 1, MAT.wood_dark);
      const n = Math.max(2, Math.floor((pewW - 2) / 4));
      for (let k = 0; k < n; k++) {
        const x = x0 + 1 + (pewW - 2) * (k + 0.5) / n;
        pews.push(b.spot('sit', x, FY, z + 2.3, 2, { room: sanct, act: 'listen_sit', tags: ['pew'], seat: 0.5, label: 'In a box pew' }));
      }
      b.playerSeat(x0 + pewW / 2, FY, z + 2.3, 2, 0.5);
    }
  }
  // gallery pews
  for (const x of [IX0 + 10, cxm, IX1 - 12]) pews.push(...pewRow(b, gallery, x, GY + 1, VZ + 1, 2, ['pew'], { tint: '#6a4a30', label: 'In the gallery' }));
  // the chancel: platform, choir risers (world voxel steps), organ, pulpit
  f.box(IX0, FY, CZ, IX1 - IX0, 2, IZ1 - CZ, MAT.floor_oak);
  f.box(IX0 + 6, FY, CZ - 2, IX1 - IX0 - 12, 1, 2, MAT.floor_oak);
  const RZ0 = IZ1 - 12;
  for (let t = 0; t < 3; t++) f.box(cxm - 16, FY + 2, RZ0 + t * 4, 32, t + 1, 12 - t * 4, MAT.wood_mid);
  for (let t = 0; t < 3; t++) f.box(cxm - 16, FY + 2 + t, RZ0 + t * 4, 32, 1, 1, MAT.wood_dark);
  const choirRoom = sanct;
  const choir = [];
  for (let t = 0; t < 3; t++) for (let k = 0; k < 6; k++) {
    const x = cxm - 13 + k * 5.2 + (t % 2) * 1.2;
    choir.push(b.spot('stand', x, FY + 3 + t, RZ0 + t * 4 + 2, 0, { room: choirRoom, act: 'sing', tags: ['choir'], label: 'Choir practice' }));
  }
  b.spot('stand', cxm, FY + 2, RZ0 - 5, 2, { room: sanct, act: 'conduct', tags: ['choir_director'], label: 'Directing the choir' });
  b.prop('music_stand', cxm, FY + 2, RZ0 - 3, 0, {});
  b.prop('organ_pipes', cxm, FY + 5, IZ1 - 0.9, 0, { scale: 1.2 });
  b.prop('organ_console', IX0 + 7, FY + 2, CZ + 7, 1, {});
  const organ = b.spot('sit', IX0 + 4.6, FY + 2, CZ + 7, 1, { room: sanct, act: 'organ', tags: ['organ'], seat: 0.55, label: 'At the organ' });
  b.job('organist', organ, { shift: ['13:30', '18:00'], title: 'organist & choirmaster', sex: 'M' });
  f.box(IX1 - 14, FY + 2, CZ + 1, 10, 3, 8, MAT.wood_dark);
  b.prop('pulpit', IX1 - 9, FY + 5, CZ + 4, 0, {});
  b.prop('lectern', cxm, FY, CZ - 5, 0, {});
  b.prop('baptismal_font', IX0 + 12, FY, CZ - 5, 0, {});
  b.prop('hymn_board', IX1 - 0.4, FY + 7, CZ - 6, 3, {});
  b.prop('hymn_board', IX0 + 0.4, FY + 7, CZ - 6, 1, {});
  b.prop('vase_flowers', cxm - 18, FY + 2, CZ + 3, 0, { tint: '#e0a030', scale: 1.4 });
  b.prop('vase_flowers', cxm + 18, FY + 2, CZ + 3, 0, { tint: '#b3302a', scale: 1.4 });
  for (const z of [VZ + 20, VZ + 44]) b.prop('chandelier', cxm, wallTop - 2, z, 0, {});
  b.light(cxm, FY + 14, (VZ + CZ) / 2, { mode: 'room', room: sanct, radius: 16, color: [1, 0.9, 0.72] });
  readAt(b, IX1 - 1, FY + 7, CZ - 6, 3, 'Hymn board', 'HYMNS FOR THE CENTENNIAL SERVICE\nSunday, September 27, 1953\n\n  12   "Now Thank We All Our God"\n 410   "O God, Our Help in Ages Past"\n 285   "Eternal Father, Strong to Save"\n 316   "Blest Be the Tie That Binds"\n\nAnthem: "Shall We Gather at the River" - soloist, Mrs. Ruth Freeman', 2.2);
  // readable history
  readAt(b, cxm - 14, FY + 5, VZ - 1, 0, 'Choir notice', 'CHOIR PRACTICE SAT 4 PM\nCENTENNIAL SERVICE SUN 10 AM\n\nAll voices welcome. Altos, please come.\nWe are singing "Now Thank We All Our God" (the Pachelbel setting)\nand "Shall We Gather at the River," Mrs. Freeman, solo.\nRobes will be pressed by the Ladies\' Aid - leave them on the rail.\n\n- L. Pruitt, Organist & Choirmaster (since 1923)', 2.4);
  b.prop('display_case_museum', cxm + 12, FY, IZ0 + 5, 0, {});
  readAt(b, cxm + 12, FY + 4, IZ0 + 5, 0, 'The founding ledger, 1853', 'THE RECORDS OF THE FIRST CHURCH IN JUNIPER BAY\nVolume I, 1853 - 1880. Open to the first page:\n\n"On this fourth day of March 1853, being the day the Town was made,\nwe whose names are underwritten did covenant together to walk with God\nand one with another. Meeting held in Beal\'s salt house for want of a better."\n\nSigned: Elias Whitcomb, Mercy Whitcomb, Obadiah Crowell, Hannah Crowell,\nJonas Beal, Hezekiah Dunmore, Josiah Tuttle (minister), and fourteen others.\n\nA later page: "June 12, 1871. The new meeting house raised this day\nby fifty men between sunrise and dusk. Voted a vote of thanks to the women,\nwithout whose dinners it could not have been done."', 2.4);
  readAt(b, IX0 + 1, FY + 6, IZ0 + 6, 1, 'Pastors of this church', 'MINISTERS OF THE FIRST CHURCH\n\nRev. Josiah Tuttle, 1853 - 1870\nRev. Amos Pruitt, 1870 - 1898\nRev. Charles H. Endicott, 1898 - 1926\nRev. Samuel P. Gould, 1926 - 1946\nRev. Theodore Ashby, 1946 -', 2.2);
  f.box(NX0 + 2, FY, FZ - 1, 10, 4, 1, MAT.granite);
  signLine(b, '1853 - 1871', NX0 + 7, FY + 1.4, FZ - 1.05, 0, { bg: '#8e8b87', fg: '#1c1c20', border: '#8e8b87', scale: 0.4 });
  // sexton & minister's spots
  const sext = b.spot('stand', IX0 + 6, FY, VZ + 10, 1, { room: sanct, act: 'sweep', tags: ['work'] });
  b.job('sexton', [sext, b.spot('stand', cxm - 6, FY, IZ0 + 4, 0, { room: vest, act: 'stand', tags: ['work'] })], { shift: ['9:00', '17:30'], title: 'sexton', sex: 'M' });
  // ---- the front lawn: signboard; the old burying ground behind
  {
    const sx = W - 22, sz = 10;
    f.box(sx - 8, 0, sz, 1, 10, 1, MAT.trim_white); f.box(sx + 7, 0, sz, 1, 10, 1, MAT.trim_white);
    f.box(sx - 8, 4, sz, 16, 6, 1, MAT.sign_black); f.box(sx - 9, 10, sz - 1, 18, 1, 3, MAT.trim_white);
    tablet(b, ['FIRST CONGREGATIONAL CHURCH', 'GATHERED 1853', 'REV. THEODORE ASHBY, PASTOR', 'CHOIR PRACTICE SAT 4 PM', 'CENTENNIAL SERVICE SUN 10 AM'], sx, 4.5, sz - 0.05, 0, { scale: 0.32, bg: '#1d1d22', fg: '#f0ece0', border: '#1d1d22' });
    readAt(b, sx, 6, sz, 0, 'Church signboard', 'FIRST CONGREGATIONAL CHURCH\nGathered March 4, 1853 - Meetinghouse raised 1871\nRev. Theodore Ashby, Pastor\n\nCHOIR PRACTICE SAT 4 PM\nCENTENNIAL SERVICE SUN 10 AM\nSermon: "The Lines Are Fallen Unto Me in Pleasant Places" (Psalm 16)\n\nAll are welcome.', 2.6);
  }
  b.prop('tree_elm_yellow', 14, 0, 20, 0, { cat: 'far', scale: 1.15 });
  b.prop('tree_maple_red', W - 14, 0, 30, 0, { cat: 'far' });
  const gz0 = BZ + 8, gz1 = D - 4, gx0 = 6, gx1 = W - 6;
  f.box(gx0, 0, gz0, gx1 - gx0, 2, 1, MAT.stone_foundation); f.box(gx0, 0, gz1 - 1, gx1 - gx0, 2, 1, MAT.stone_foundation);
  f.box(gx0, 0, gz0, 1, 2, gz1 - gz0, MAT.stone_foundation); f.box(gx1 - 1, 0, gz0, 1, 2, gz1 - gz0, MAT.stone_foundation);
  f.carve(cxm - 2, 0, gz0, 4, 2, 1);
  f.box(cxm - 3, 0, gz0, 1, 4, 1, MAT.granite); f.box(cxm + 2, 0, gz0, 1, 4, 1, MAT.granite);
  f.box(cxm - 1, -1, gz0 - 8, 2, 1, gz1 - gz0 + 4, MAT.gravel);
  f.box(NX1 + 2, -1, BZ - 30, 4, 1, gz0 - BZ + 30, MAT.gravel);
  b.prop('tree_oak', gx0 + 12, 0, gz0 + 14, 0, { cat: 'far', scale: 1.3 });
  b.prop('tree_birch', gx1 - 10, 0, gz1 - 10, 0, { cat: 'far' });
  const stoneMats = [MAT.roof_slate, MAT.stone_foundation, MAT.granite, MAT.roof_slate, MAT.marble];
  const cols = Math.max(2, Math.floor((gx1 - gx0 - 16) / 14));
  SETTLERS.forEach((st, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const x = gx0 + 10 + col * 14 + (row % 2) * 4 + (col >= cols / 2 ? 6 : 0), z = gz0 + 8 + row * 10;
    if (z > gz1 - 4) return;
    const m = stoneMats[i % stoneMats.length];
    const lean = rng.chance(0.3) ? 1 : 0;
    f.box(x - 2, 0, z, 4, 4, 1, m); f.box(x - 1, 4, z, 2, 1, 1, m);
    if (lean) f.box(x - 2, 3, z - 1, 4, 1, 1, m);
    f.box(x - 2, -1, z + 1, 4, 1, 6, MAT.grass_dry);
    signLine(b, st[0].length > 18 ? st[0].split(' ').slice(-2).join(' ') : st[0], x, 2, z - 0.05, 0, { bg: '#5a5e66', fg: '#d8d8d0', border: '#5a5e66', scale: 0.22 });
    readAt(b, x, 2, z, 0, st[0], `HERE LIES\n${st[0]}\n${st[1]} - ${st[2]}\n\n${st[3]}`, 1.8);
  });
  readAt(b, cxm, 3, gz0 - 1, 0, 'The Meetinghouse Burying Ground', 'THE MEETINGHOUSE BURYING GROUND\nof the First Church in Juniper Bay, 1854 - 1889\n\nHere lie the first families of the town, its first deacon and first minister,\nand the first soul buried in Juniper Bay, Sarah Fisk, aged 24.\nThe slate stones were cut in Boston and came up by schooner.\nClosed to burials in 1889; Capt. Whitcomb himself lies in the town cemetery on the hill.\n\n"Remember me as you pass by: as you are now, so once was I."', 2.6);
  for (const e of [eM, eL, eRr]) linkToSidewalk(ctx, e);
  void choir; void pews;
  return b;
}


// Institutional block with a central corridor on every floor, rooms in front and back rows, a switchback
// stair in one back-row segment named 'Stairwell', windows front & back. Returns per-floor room records by name.
// o: { x0, x1, z0, z1, floors, FH, FY, outer, inner, floors: n, floorMats:[...], corrFloor, cz0, cz1,
//      plan(i) -> { front: { bounds:[...], names:[...] }, back: { bounds, names } }, win: {w, h, o}, light }
function corridorBlock(b, o) {
  const f = b.f, ctx = b.ctx;
  const { x0, x1, z0, z1, n, FH } = o;
  const FY = o.FY ?? 1, H = n * FH;
  const IX0 = x0 + 2, IX1 = x1 - 2, IZ0 = z0 + 2, IZ1 = z1 - 2, cz0 = o.cz0, cz1 = o.cz1;
  f.box(x0, 0, z0, x1 - x0, FY, z1 - z0, o.base ?? MAT.stone_foundation);
  shell(f, x0, FY, z0, x1 - x0, H, z1 - z0, o.outer, o.inner, 2);
  f.box(x0, FY + H - 1, z0, x1 - x0, 1, z1 - z0, MAT.roof_tar);
  const out = [];
  let stairPrev = null;
  for (let i = 0; i < n; i++) {
    const y = FY + i * FH;
    const fm = (o.floorMats || [MAT.floor_linoleum])[i % (o.floorMats || [1]).length];
    f.box(IX0, y - 1, IZ0, IX1 - IX0, 1, IZ1 - IZ0, fm);
    f.box(IX0, y - 1, cz0, IX1 - IX0, 1, cz1 - cz0, o.corrFloor ?? MAT.floor_terrazzo);
    const P = o.plan(i);
    const rec = { y, corr: null, rooms: {}, list: [] };
    rec.corr = b.room(o.corrName ? o.corrName(i) : (i === 0 ? 'Main Corridor' : `Corridor, Floor ${i + 1}`), IX0, y, cz0, IX1 - IX0, FH - 1, cz1 - cz0, { lightMode: o.light ?? 'auto', kind: 'hall' });
    for (const [row, rz0, rz1, wallZ] of [['front', IZ0, cz0 - 1, cz0 - 1], ['back', cz1 + 1, IZ1, cz1]]) {
      const R = P[row]; if (!R) continue;
      const gaps = [];
      R.names.forEach((nm, k) => {
        const a = k === 0 ? IX0 : R.bounds[k] + 1, bb = R.bounds[k + 1];
        if (k > 0) partitionZ(f, rz0, rz1, y, R.bounds[k], FH - 1, o.inner, []);
        if (!nm) { f.box(a, y, rz0, bb - a, FH - 1, rz1 - rz0, o.inner); return; }
        const opts = (R.opts && R.opts[k]) || {};
        const id = b.room(nm, a, y, rz0, bb - a, FH - 1, rz1 - rz0, { lightMode: opts.lightMode ?? o.light ?? 'auto', kind: opts.kind, lightColor: opts.lightColor });
        const dx = opts.doorX ?? Math.round((a + bb) / 2) - 2, dw = opts.doorW ?? 4;
        gaps.push({ at: dx, w: dw });
        b.door(rec.corr, id, dx + dw / 2, y, wallZ, { leaf: opts.leaf ?? (dw > 4 ? false : 'door_wood'), tint: opts.tint });
        const r = { id, x0: a, x1: bb, z0: rz0, z1: rz1, y, name: nm, row, cx: (a + bb) / 2, cz: (rz0 + rz1) / 2 };
        rec.rooms[nm] = r; rec.list.push(r);
        // windows on the outside wall
        if (o.win !== false) {
          const ww = o.winW ?? 5, wh = o.winH ?? Math.min(8, FH - 5);
          const cnt = Math.max(1, Math.floor((bb - a) / (ww + 5)));
          if (!opts.noWin) for (let q = 0; q < cnt; q++) {
            const wx = Math.round(a + (bb - a) * (q + 0.5) / cnt - ww / 2);
            if (row === 'front') { if (!(o.skipFrontWin && o.skipFrontWin(wx, i))) win(f, wx, y + 3, z0, ww, wh, o.winO ?? {}); }
            else winSide(f, 2, wx, y + 3, z1, ww, wh, o.winO ?? {});
          }
        }
      });
      partitionX(f, IX0, IX1, y, wallZ, FH - 1, o.inner, gaps);
    }
    // corridor end windows
    winSide(f, 3, cz0, y + 3, x0, cz1 - cz0, Math.min(8, FH - 5), o.winO ?? {});
    winSide(f, 1, cz0, y + 3, x1, cz1 - cz0, Math.min(8, FH - 5), o.winO ?? {});
    // stairs
    const st = rec.rooms.Stairwell;
    if (st) {
      if (stairPrev) {
        const k = i - 1, sa = stairPrev.x0, bandA = stairPrev.z0 + 1, bandB = stairPrev.z0 + 6;
        if (k % 2 === 0) { stairs(f, sa + 2, stairPrev.y, bandA, '+x', FH, { w: 4, run: 2, mat: o.stairMat ?? MAT.floor_terrazzo, rail: false }); b.stairs(stairPrev.id, [sa + 1, stairPrev.y, bandA + 2], st.id, [sa + 3 + 2 * FH, y, bandA + 2]); }
        else { stairs(f, sa + 1 + 2 * FH, stairPrev.y, bandB, '-x', FH, { w: 4, run: 2, mat: o.stairMat ?? MAT.floor_terrazzo, rail: false }); b.stairs(stairPrev.id, [sa + 3 + 2 * FH, stairPrev.y, bandB + 2], st.id, [sa + 1, y, bandB + 2]); }
      }
      stairPrev = st;
    }
    out.push(rec);
  }
  return out;
}
// Classroom furnishings: desks in rows facing the chalkboard on the corridor wall... (board on the -x wall)
function classroom(b, r, rng, board) {
  const f = b.f, y = r.y;
  const w = r.x1 - r.x0, d = r.z1 - r.z0;
  // chalkboard on the left (x0) wall, desks face -x (rot 3)
  f.box(r.x0, y + 3, r.z0 + 2, 1, 6, d - 4, MAT.chalkboard);
  f.box(r.x0, y + 2, r.z0 + 2, 1, 1, d - 4, MAT.wood_mid);
  // chalk writing: prop-scale lettering on the board, plus half-erased chalk strokes in the slate itself
  (board || []).forEach((line, k) => signLine(b, line, r.x0 + 1.03, y + 7.4 - k * 1.25, r.z0 + d / 2, 1, { bg: '#2f4a3a', fg: '#e8e8e0', border: '#2f4a3a', scale: 0.5 }));
  f.box(r.x0, y + 4, r.z0 + 3, 1, 1, 4, MAT.blackboard_text); f.box(r.x0, y + 4, r.z1 - 8, 1, 1, 5, MAT.blackboard_text);
  f.box(r.x0, y + 3, r.z0 + 4, 1, 1, 2, MAT.blackboard_text);
  readAt(b, r.x0 + 1, y + 5, r.z0 + d / 2, 1, 'Chalkboard', (board || []).join('\n') + '\n\n(In the corner, small, in a different hand: "Mr. W. is a square." Half erased.)', 2.6);
  b.prop('desk_teacher', r.x0 + 5, y, r.z0 + d / 2, 1, {});
  b.prop('chair_wood', r.x0 + 2.8, y, r.z0 + d / 2, 1, {});
  const teach = b.spot('stand', r.x0 + 3, y, r.z0 + d / 2 - 3, 1, { room: r.id, act: 'teach', tags: ['teacher'] });
  const cols = Math.max(2, Math.floor((d - 4) / 4)), rows = Math.max(2, Math.floor((w - 12) / 4.5));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) b.prop('desk_school', r.x0 + 11 + i * 4.5, y, r.z0 + 2.5 + j * ((d - 4) / cols) + 1, 3, {});
  b.prop('flag_stand', r.x0 + 2, y, r.z0 + 1.5, 1, {});
  b.prop('classroom_clock', r.x1 - 0.6, y + 9, r.z0 + d / 2, 3, {});
  b.prop('bookshelf_low', r.x1 - 1, y, r.z0 + 3, 3, {});
  if (rng.chance(0.5)) b.prop('school_globe', r.x1 - 1.5, y + 3, r.z0 + 3, 3, {});
  b.prop('ceiling_lamp', r.x0 + w / 2, y + FHc(r) - 3, r.z0 + d / 2, 0, {});
  return teach;
}
function FHc() { return 12; }

// =====================================================================================
// JUNIPER BAY HIGH SCHOOL (1908) — the Centennial Sock Hop in the gym tonight
// =====================================================================================
function buildSchool(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'Juniper Bay High School', kind: 'school', lot, address: lot.address, established: spec.est || 1908,
    lore: 'Brick, three storeys, 1908. Home of the Mariners. Tonight: the Centennial Sock Hop in the gym.', hours: [8 * 60, 23 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('school' + lot.x);
  const x0 = 16, x1 = W - 16, z0 = 24, z1 = 80, FH = 14, n = 3;
  const cx = Math.round(W / 2);
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(cx - 8, -1, 0, 16, 1, z0, MAT.sidewalk);
  // front plan: [office | classroom | classroom | ENTRY HALL | classroom | classroom | principal]
  const bf = [x0 + 2, x0 + 34, x0 + 68, cx - 16, cx + 16, x1 - 68, x1 - 34, x1 - 2];
  const bb = [x0 + 2, x0 + 40, cx - 18, cx + 18, x1 - 40, x1 - 2];
  const grades = [['Room 101 - English', 'Room 102 - History', 'Front Hall', 'Room 103 - Latin', 'Room 104 - Mathematics'], ['Room 201 - Biology', 'Room 202 - Civics', 'Library', 'Room 203 - French', 'Room 204 - Typing'], ['Room 301 - Chemistry', 'Room 302 - Physics', 'Assembly Room', 'Room 303 - Art', 'Room 304 - Music']];
  const floors = corridorBlock(b, {
    x0, x1, z0, z1, n, FH, FY: 1, outer: MAT.brick_red, inner: MAT.plaster_cream, cz0: 48, cz1: 57,
    floorMats: [MAT.floor_oak, MAT.floor_oak, MAT.floor_oak], corrFloor: MAT.floor_linoleum_green, light: 'auto',
    winW: 5, winH: 8, winO: { t: 2, frame: MAT.limestone, lintelWide: true },
    skipFrontWin: (wx, i) => i === 0 && wx > cx - 18 && wx < cx + 14,
    plan: (i) => ({
      front: { bounds: bf, names: i === 0 ? ["Main Office", grades[0][0], grades[0][1], 'Front Hall', grades[0][3], grades[0][4], "Principal's Office"] : [`Room ${i + 1}05`, grades[i][0], grades[i][1], grades[i][2], grades[i][3], grades[i][4], `Room ${i + 1}06`],
        opts: [{}, {}, {}, i === 0 ? { doorW: 12, leaf: false } : { doorW: 8, leaf: false }, {}, {}, {}] },
      back: { bounds: bb, names: ['Stairwell', i === 0 ? 'Boys\' Lockers' : `Room ${i + 1}07`, i === 0 ? 'Trophy Hall' : `Room ${i + 1}08`, i === 0 ? 'Girls\' Lockers' : `Room ${i + 1}09`, i === 0 ? 'Gym Passage' : `Room ${i + 1}10`], opts: [{ doorW: 8, leaf: false }, {}, { doorW: 10, leaf: false }, {}, { doorW: 6, leaf: false }] },
    }),
  });
  // facade: central pavilion with lettering, cornice, parapet, cupola
  const top = 1 + n * FH;
  f.box(cx - 20, 0, z0 - 4, 40, top + 4, 4, MAT.brick_red);
  f.box(cx - 21, top + 3, z0 - 5, 42, 1, 6, MAT.limestone);
  for (let i = 0; i < 8; i++) f.box(cx - 20 + i * 2.5, top + 4 + i, z0 - 5, 40 - i * 5, 1, 5, MAT.brick_red);
  f.text('JUNIPER BAY HIGH SCHOOL', cx, top - 4, z0 - 5, MAT.limestone, { align: 'center', font: 'small' });
  f.text('1908', cx, top + 6, z0 - 6, MAT.limestone, { align: 'center', font: 'small' });
  doorway(f, cx - 5, 1, z0 - 4, 10, 11, { frame: MAT.limestone, t: 6, transom: true });
  for (const y of [1 + FH + 3, 1 + 2 * FH + 3]) win(f, cx - 6, y, z0 - 4, 12, 8, { t: 6, frame: MAT.limestone, lintelWide: true });
  f.box(cx - 8, 0, z0 - 10, 16, 1, 6, MAT.granite);
  cornice(f, x0, top - 1, x1 - x0, MAT.limestone, { z: z0, brackets: 6 });
  f.walls(x0, top, z0, x1 - x0, 2, z1 - z0, MAT.brick_red, 1);
  for (const y of [1 + FH - 1, 1 + 2 * FH - 1]) beltCourse(f, x0, y, x1 - x0, MAT.limestone, z0);
  f.box(cx - 6, top, z0 + 20, 12, 8, 12, MAT.trim_white); f.hip(cx - 7, top + 8, z0 + 19, 14, 14, MAT.roof_copper, { rise: 2 });
  f.box(cx, top + 22, z0 + 25, 1, 5, 1, MAT.iron);
  b.prop('flag_pole', cx - 26, 0, 8, 0, { cat: 'far' });
  // cornerstone & honour tablet
  f.box(x0 + 2, 1, z0 - 1, 10, 4, 1, MAT.limestone);
  signLine(b, 'A.D. 1908', x0 + 7, 2.4, z0 - 1.05, 0, { bg: '#dccfb2', fg: '#3a2a22', border: '#dccfb2', scale: 0.4 });
  readAt(b, x0 + 7, 3, z0 - 1, 0, 'Cornerstone', 'JUNIPER BAY HIGH SCHOOL\nERECTED A.D. 1908\n\n"Knowledge is the lighthouse of the mind."\nSchool Committee: E. Pruitt, P. J. Kearney, Mrs. A. Crowell\nBuilt for 300 pupils. It now holds 612.', 2.4);
  const F0 = floors[0], R0 = F0.rooms;
  // Front Hall: main entrance, trophy case, notices, the sock hop poster
  const fh = R0['Front Hall'];
  const main = b.entrance(fh.id, cx, 1, z0 - 4, { outZ: z0 - 12, leaf: 'door_wood', tint: '#5a2a24', main: true, inside: 6 });
  b.prop('trophy_case', fh.x0 + 3, 1, fh.z0 + 6, 1, {});
  b.prop('trophy_case', fh.x1 - 3, 1, fh.z0 + 6, 3, {});
  readAt(b, fh.x0 + 4, 5, fh.z0 + 6, 1, 'Trophy case', 'JUNIPER BAY MARINERS - TROPHIES\n\n1911  Class C Football, North Shore League\n1926  Debating: State Runners-Up ("Resolved, that the radio will improve the American home")\n1937  Baseball, North Shore League\n1947  Football, State Class B Champions (undefeated; coach: Walter "Buzz" Crowell)\n1951  Girls\' Basketball, League Champions\n1953  Regional Science Fair: Walter Novak, "A Tide Clock for Juniper Bay" (honorable mention)', 2.4);
  readAt(b, fh.x1 - 4, 5, fh.z0 + 6, 3, 'Honor roll of alumni', 'IN HONOR OF THE ALUMNI OF JUNIPER BAY HIGH SCHOOL\nWHO SERVED IN THE ARMED FORCES OF THE UNITED STATES\n\nWorld War I: 118 alumni served. World War II: 406 alumni served.\nKorea: 14 alumni. (Pfc. Salvatore Castellano, Class of 1947, home September 1953.)\n\nThe gold stars in the corridor mark the classrooms of those who did not return.', 2.4);
  readAt(b, (fh.x0 + fh.x1) / 2, 5, fh.z1, 0, 'Sock Hop poster', 'CENTENNIAL SOCK HOP!\nSATURDAY, SEPT. 26 - 7:30 TO 10:30 P.M. - THE GYM\nRecords courtesy of Bishop Music Co.\nPunch by the Home Economics Club - Admission 25 cents\nShoes OFF on the gym floor, by order of Mr. Tuttle, custodian.\nChaperones: Miss Grace Lee, Mr. Donald Weiss, Mrs. Anna Russo', 2.4);
  b.prop('bench_station', fh.x0 + 5, 1, fh.z1 - 2, 0, {});
  // Principal's office & main office
  const po = R0["Principal's Office"];
  b.prop('desk_wood', po.cx, 1, po.z0 + 6, 0, {}); b.prop('chair_office', po.cx, 1, po.z0 + 3, 2, {});
  b.prop('filing_cabinet', po.x1 - 2, 1, po.z1 - 2, 0, {}); b.prop('bookshelf', po.x0 + 2, 1, po.z1 - 1.5, 0, {});
  b.prop('flag_stand', po.x1 - 2, 1, po.z0 + 2, 0, {}); b.prop('portrait', po.cx, 7, po.z0 + 0.6, 2, { tint: '#3a4a5a' });
  readAt(b, po.cx, 5, po.z0 + 6, 2, 'The principal\'s desk', 'Mr. Harold J. Weiss, Principal (since 1946)\n\nOn the desk: a paddle, never used since 1946 (it says so on a card taped to it);\nthe Centennial essay contest winners ("What Juniper Bay Will Be in 2053"):\n1st - Peggy Halloran: "We will still have the Light, and the Light will still be kept."\n2nd - Tommy Adler: "Rocket boats to Boston in eleven minutes."\nand a note: "Sock hop - NO MORE THAN ONE ELVIS - no, wait, who is Elvis? - NO MORE THAN ONE JOHNNIE RAY."', 2.4);
  const mo = R0['Main Office'];
  officeDesk(b, mo.id, mo.cx - 5, 1, mo.z0 + 8, 0, {}); b.prop('filing_cabinet', mo.x0 + 2, 1, mo.z1 - 2, 0, {});
  b.prop('counter_shop', mo.cx + 4, 1, mo.z1 - 4, 0, { tint: '#8a6a48' });
  // classrooms with chalkboards
  const boards = [['SEPT. 25, 1953', 'HOMEWORK: CH. 4', 'HAPPY CENTENNIAL!'], ['1853 - 1953', 'WHO WAS ELIAS WHITCOMB?', 'ESSAY DUE MONDAY'], ['AMO AMAS AMAT', 'AMAMUS AMATIS AMANT'], ['A2 + B2 = C2', 'PAGE 112, PROBS 1-20'], ['H2O  NACL  CO2', 'LAB REPORTS FRIDAY'], ['DO NOT ERASE!', 'SOCK HOP 7:30']];
  let bi = 0;
  const teachers = [];
  for (const F of floors) for (const r of F.list) if (/^Room /.test(r.name) || r.name === 'Library' || r.name === 'Assembly Room') {
    if (r.name === 'Library') { for (let x = r.x0 + 3; x < r.x1 - 2; x += 5) b.prop('bookshelf', x, r.y, r.z0 + 1.2, 2, {}); b.prop('table_dining', r.cx, r.y, r.cz + 3, 0, { tint: '#8a6a48' }); continue; }
    if (r.name === 'Assembly Room') { f.box(r.x0, r.y, r.z0, 10, 2, r.z1 - r.z0, MAT.stage_wood); b.prop('piano_upright', r.x0 + 4, r.y + 2, r.z0 + 3, 1, {}); for (let x = r.x0 + 14; x < r.x1 - 2; x += 4) for (let z = r.z0 + 3; z < r.z1 - 2; z += 4) b.prop('chair_folding', x, r.y, z, 3, {}); continue; }
    teachers.push(classroom(b, r, rng, boards[bi++ % boards.length]));
  }
  // lockers in the corridors
  for (const F of floors) for (let x = x0 + 44; x < x1 - 44; x += 4) if (Math.abs(x - cx) > 22) b.prop('lockers', x, F.y, 56.2, 0, { tint: ['#5a7a5a', '#6a6a7a', '#7a5a4a'][Math.floor(x / 40) % 3] });
  // stair walls of the corridor: gold stars for the fallen
  for (let k = 0; k < 6; k++) f.box(x0 + 60 + k * 16, 1 + FH + 9, 48, 1, 1, 1, MAT.trim_gold);
  // ---- the gym (behind the east wing), decorated for the Sock Hop
  const gx0 = cx + 18, gx1 = x1 - 2, gz0 = z1 + 6, gz1 = Math.min(D - 10, gz0 + 64), GH = 30;
  f.box(gx0, 0, gz0, gx1 - gx0, 1, gz1 - gz0, MAT.gym_floor);
  shell(f, gx0, 1, gz0, gx1 - gx0, GH, gz1 - gz0, MAT.brick_red, MAT.brick_yellow, 2);
  f.box(gx0, GH + 1, gz0, gx1 - gx0, 1, gz1 - gz0, MAT.roof_tar);
  f.walls(gx0, GH + 2, gz0, gx1 - gx0, 2, gz1 - gz0, MAT.brick_red, 1);
  for (let x = gx0 + 3; x < gx1 - 3; x += 10) f.box(x, GH - 2, gz0 + 2, 1, 2, gz1 - gz0 - 4, MAT.steel);
  for (let z = gz0 + 8; z < gz1 - 6; z += 12) { winSide(f, 1, z, 18, gx1, 8, 8, { t: 2, frame: MAT.limestone }); winSide(f, 3, z, 18, gx0, 8, 8, { t: 2, frame: MAT.limestone }); }
  // passage from the main corridor
  const pass = R0['Gym Passage'];
  f.box(pass.x0, 0, z1 - 2, pass.x1 - pass.x0, 1, gz0 - z1 + 4, MAT.floor_linoleum);
  f.walls(pass.x0 - 1, 1, z1 - 2, pass.x1 - pass.x0 + 2, 12, gz0 - z1 + 4, MAT.brick_red, 1);
  f.box(pass.x0 - 1, 13, z1 - 2, pass.x1 - pass.x0 + 2, 1, gz0 - z1 + 4, MAT.roof_tar);
  f.carve(pass.cx - 3, 1, z1 - 2, 6, 10, 3); f.carve(pass.cx - 3, 1, gz0, 6, 10, 3);
  const passR = b.room('Passage to the Gym', pass.x0, 1, z1, pass.x1 - pass.x0, 11, gz0 - z1, { lightMode: 'auto' });
  const gym = b.room('Gymnasium', gx0 + 2, 1, gz0 + 2, gx1 - gx0 - 4, GH - 1, gz1 - gz0 - 4, { lightMode: 'auto', kind: 'hall', lightColor: [1, 0.85, 0.7] });
  b.door(pass.id, passR, pass.cx, 1, z1 - 1, { leaf: false });
  b.door(passR, gym, pass.cx, 1, gz0 + 1, { leaf: 'door_wood' });
  // court lines, hoops at each end, bleachers along the west wall
  const gcx = (gx0 + gx1) / 2, gcz = (gz0 + gz1) / 2;
  f.box(gx0 + 6, 0, gcz, gx1 - gx0 - 12, 1, 1, MAT.road_white);
  f.cylinder(gcx, 0, gcz, 7, 1, MAT.road_white, 1);
  b.prop('basketball_hoop', gcx, 1, gz0 + 2.5, 2, {}); b.prop('basketball_hoop', gcx, 1, gz1 - 2.5, 0, {});
  for (let t = 0; t < 4; t++) f.box(gx0 + 2 + t * 3, 1, gz0 + 8, 3, (t + 1) * 2, gz1 - gz0 - 16, MAT.wood_light);
  for (let t = 0; t < 4; t++) for (let z = gz0 + 10; z < gz1 - 10; z += 7) b.spot('sit', gx0 + 3.5 + t * 3, 1 + (t + 1) * 2, z, 1, { room: gym, act: t % 2 ? 'clap_sit' : 'talk_sit', tags: ['sockhop_bleachers'], seat: 0.05, label: 'On the bleachers at the Sock Hop' });
  // decorations
  const sw = gx1 - gx0 - 4;
  f.box(gx1 - 3, 13, gz0 + 4, 1, 17, gz1 - gz0 - 8, MAT.sign_blue);
  f.box(gx1 - 3, 12, gz0 + 4, 1, 1, gz1 - gz0 - 8, MAT.sign_red); f.box(gx1 - 3, 30, gz0 + 4, 1, 1, gz1 - gz0 - 8, MAT.sign_red);
  textFace(f, 3, 'CENTENNIAL', gcz, 23, gx1 - 4, MAT.sign_white, { font: 'small' });
  textFace(f, 3, 'SOCK HOP', gcz, 14, gx1 - 4, MAT.sign_yellow, { font: 'big' });
  const hop = [MAT.sign_blue, MAT.sign_yellow, MAT.sign_white];
  for (let z = gz0 + 8; z < gz1 - 4; z += 16) bunting(f, [gx0 + 3, GH - 4, z], [gx1 - 3, GH - 4, z], 3, hop);
  for (let x = gx0 + 10; x < gx1 - 6; x += 18) bunting(f, [x, GH - 5, gz0 + 3], [x, GH - 5, gz1 - 3], 3, [MAT.sign_red, MAT.sign_white]);
  void sw;
  // the record player on its table, the punch bowl, balloons, shoes by the door
  f.box(gx1 - 12, 1, gcz - 4, 5, 3, 8, MAT.canvas_white);
  b.prop('phonograph', gx1 - 9.5, 4, gcz, 3, {});
  b.prop('record_bins', gx1 - 9.5, 1, gcz + 7, 3, {});
  const dj = b.spot('stand', gx1 - 6, 1, gcz, 3, { room: gym, act: 'counter', tags: ['sockhop_dj'], label: 'Spinning records at the Sock Hop' });
  b.job('disc jockey', dj, { shift: ['19:15', '22:40'], title: 'record spinner (Bishop Music Co.)', age: [18, 40] });
  f.box(gx0 + 18, 1, gz1 - 10, 8, 3, 5, MAT.canvas_white);
  b.prop('coffee_urn', gx0 + 20, 4, gz1 - 8, 0, {}); b.prop('fruit_bowl', gx0 + 24, 4, gz1 - 8, 0, {});
  const chap = [b.spot('stand', gx0 + 22, 1, gz1 - 13, 0, { room: gym, act: 'stand', tags: ['chaperone'] }), b.spot('stand', gx0 + 16, 1, gz0 + 6, 2, { room: gym, act: 'look', tags: ['chaperone'] })];
  b.job('chaperone', chap, { shift: ['19:00', '22:45'], title: 'Sock Hop chaperone', age: [25, 60] });
  for (const [x, z] of [[gx0 + 16, gz0 + 4], [gx1 - 6, gz0 + 4], [gx0 + 16, gz1 - 4], [gx1 - 6, gz1 - 4]]) b.prop('balloon_bunch', x, 1, z, 0, { tint: ['#5a8ae0', '#e0c040', '#f0ece0', '#e05a5a'][Math.floor(x + z) % 4] });
  for (let i = 0; i < 12; i++) f.box(pass.cx - 7 + i, 1, gz0 + 3 + (i % 2), 1, 1, 1, [MAT.sign_black, MAT.trim_brown, MAT.sign_white, MAT.sign_red][i % 4]);
  readAt(b, gx1 - 9, 5, gcz, 3, 'The record pile', 'TONIGHT\'S RECORDS (stack by the phonograph)\n"Rags to Riches" - Tony Bennett\n"Crying in the Chapel" - June Valli\n"Vaya con Dios" - Les Paul & Mary Ford\n"Doggie in the Window" - Patti Page (under protest)\n"Crazy Man, Crazy" - Bill Haley & His Comets\n"Stranger in Paradise" - Tony Bennett\n"You Belong to Me" - Jo Stafford\n"Shake a Hand" - Faye Adams\n\nA note taped to the lid: "Handle by the EDGES. - Mr. Bishop"', 2.2);
  let nHop = 0;
  for (let x = gx0 + 20; x < gx1 - 14; x += 7) for (let z = gz0 + 8; z < gz1 - 6; z += 7) {
    const s = b.spot('stand', x + rng.float(-1, 1), 1, z + rng.float(-1, 1), rng.int(0, 3), { room: gym, act: 'dance_jitterbug', tags: ['sockhop'], label: 'At the Sock Hop' });
    s.spread = 1.5; nHop++;
  }
  b.prop('ceiling_lamp', gcx, GH - 3, gcz, 0, {});
  b.light(gcx, GH - 6, gcz, { mode: 'room', room: gym, radius: 20, color: [1, 0.85, 0.7] });
  // custodian
  const cust = [b.spot('stand', cx + 30, 1, 52, 1, { room: F0.corr, act: 'mop', tags: ['work'] }), b.spot('stand', gcx, 1, gcz + 10, 0, { room: gym, act: 'sweep', tags: ['work'] })];
  b.job('custodian', cust, { shift: ['9:00', '23:00'], title: 'custodian (Mr. Tuttle)', sex: 'M', outfit: 'mechanic', age: [45, 66] });
  // ---- ball field & track behind the west wing
  const fx0 = 8, fx1 = cx + 8, fz0 = z1 + 8, fz1 = D - 6;
  if (fx1 - fx0 > 40 && fz1 - fz0 > 40) {
    f.box(fx0, -1, fz0, fx1 - fx0, 1, fz1 - fz0, MAT.dirt);
    f.box(fx0 + 5, -1, fz0 + 5, fx1 - fx0 - 10, 1, fz1 - fz0 - 10, MAT.grass);
    for (let z = fz0 + 12; z < fz1 - 8; z += 10) f.box(fx0 + 8, -1, z, fx1 - fx0 - 16, 1, 1, MAT.road_white);
    // baseball diamond in one corner
    const hx = fx0 + 14, hz = fz1 - 14;
    f.box(hx - 2, -1, hz - 22, 24, 1, 24, MAT.ball_field);
    f.box(hx - 1, -1, hz - 1, 2, 1, 2, MAT.road_white);
    for (const [bx2, bz2] of [[hx + 18, hz], [hx + 18, hz - 18], [hx, hz - 18]]) f.box(bx2, -1, bz2, 2, 1, 2, MAT.road_white);
    f.box(hx - 6, 0, hz + 4, 12, 10, 1, MAT.iron);
    for (let t = 0; t < 3; t++) f.box(fx1 - 12 + t * 3, 0, fz0 + 10, 3, (t + 1) * 2, 40, MAT.wood_light);
    for (const z of [fz0 + 7, fz1 - 7]) { f.box(Math.round((fx0 + fx1) / 2) - 8, 0, z, 1, 14, 1, MAT.steel_white); f.box(Math.round((fx0 + fx1) / 2) + 7, 0, z, 1, 14, 1, MAT.steel_white); f.box(Math.round((fx0 + fx1) / 2) - 8, 5, z, 16, 1, 1, MAT.steel_white); }
    const grid = outdoorNav(b, fx0 + 6, fz0 + 6, fx1 - 6, fz1 - 6, 24, () => false, { edges: [] });
    const g0 = grid.list[0];
    if (g0) ctx.nav.link(g0.n, b.navPoint(0, fx0 + 6, 0, z1 + 4, [main]));
    for (let i = 0; i < 6; i++) { const s = outSpot(b, grid, 'stand', fx0 + 20 + i * 8, 0, fz0 + 20 + (i % 3) * 10, rng.int(0, 3), { act: rng.pick(['play_ball', 'play', 'play_ball']), tags: ['play'], label: 'Playing ball behind the high school' }); s.spread = 3; }
  }
  b.prop('bicycle', cx + 14, 0, z0 - 6, 1, {}); b.prop('bicycle', cx + 17, 0, z0 - 6, 1, { tint: '#2a4a8a' });
  b.prop('bus_city', x1 - 30, 0, 6, 3, { tint: '#e0b030', cat: 'far' });
  linkToSidewalk(ctx, main);
  b.sockhopCount = nHop;
  void teachers;
  return b;
}

// =====================================================================================
// ST. LUKE'S HOSPITAL (1920) — Stan Kaminski paces the waiting room
// =====================================================================================
function buildHospital(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || "St. Luke's Hospital", kind: 'hospital', lot, address: lot.address, established: spec.est || 1920,
    lore: 'Built by public subscription after the influenza of 1918. Eighty-four beds.', hours: [0, 24 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('hosp' + lot.x);
  const x0 = 16, x1 = W - 16, z0 = 22, z1 = Math.min(D - 20, 86), FH = 14, n = 4;
  const cx = Math.round(W / 2);
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(cx - 12, -1, 0, 24, 1, z0, MAT.concrete);
  const bf = [x0 + 2, x0 + 44, cx - 22, cx + 22, x1 - 44, x1 - 2];
  const bb = [x0 + 2, x0 + 40, cx - 18, cx + 16, x1 - 40, x1 - 2];
  const plan = [
    { front: ['Emergency Room', 'Admissions', 'Lobby', 'Waiting Room', 'Doctors\' Offices'], back: ['Stairwell', 'Chapel', 'Operating Room', 'X-Ray & Laboratory', 'Pharmacy'] },
    { front: ["Men's Ward", "Men's Ward (Annex)", "Nurses' Station", "Women's Ward", "Women's Ward (Annex)"], back: ['Stairwell', 'Private Room 21', 'Linen & Supply', 'Private Room 22', 'Private Room 23'] },
    { front: ["Children's Ward", 'Private Room 31', "Nurses' Station, Floor 3", 'Maternity Ward', 'Delivery Room'], back: ['Stairwell', 'Private Room 32', 'Nursery', "Mothers' Lounge", 'Private Room 33'] },
    { front: ['Solarium', 'Private Room 41', 'Nurses\' Station, Floor 4', 'Private Room 42', 'Isolation Room'], back: ['Stairwell', 'Private Room 43', 'Records Room', 'Private Room 44', 'Staff Room'] },
  ];
  const floors = corridorBlock(b, {
    x0, x1, z0, z1, n, FH, FY: 1, outer: MAT.brick_yellow, inner: MAT.plaster_mint, cz0: 50, cz1: 58,
    floorMats: [MAT.floor_terrazzo, MAT.floor_linoleum, MAT.floor_linoleum, MAT.floor_linoleum], corrFloor: MAT.floor_linoleum_green, light: 'always',
    winW: 5, winH: 7, winO: { t: 2, frame: MAT.limestone },
    skipFrontWin: (wx, i) => i === 0 && wx > cx - 14 && wx < cx + 10,
    plan: (i) => ({
      front: { bounds: bf, names: plan[i].front, opts: [{ doorW: 6, leaf: false }, {}, { doorW: 10, leaf: false }, { doorW: 6, leaf: false }, {}] },
      back: { bounds: bb, names: plan[i].back, opts: [{ doorW: 8, leaf: false }, {}, i === 2 ? { doorW: 4, doorX: bb[2] + 2 } : {}, {}, {}] },
    }),
    corrName: (i) => i === 0 ? 'Main Corridor' : `Floor ${i + 1} Corridor`,
  });
  const top = 1 + n * FH;
  // facade: entrance pavilion, portico, lettering, cornice, the red cross lamp
  f.box(cx - 22, 0, z0 - 6, 44, top + 3, 6, MAT.brick_yellow);
  f.box(cx - 23, top + 2, z0 - 7, 46, 1, 8, MAT.limestone);
  f.text("ST. LUKE'S HOSPITAL", cx, top - 5, z0 - 7, MAT.trim_dark, { align: 'center', font: 'small' });
  f.box(cx - 12, 0, z0 - 16, 24, 1, 10, MAT.granite);
  for (const x of [cx - 12, cx + 11]) f.box(x, 1, z0 - 16, 1, 14, 1, MAT.limestone);
  f.box(cx - 13, 15, z0 - 17, 26, 1, 11, MAT.limestone);
  f.text('1920', cx, 16, z0 - 17, MAT.trim_dark, { align: 'center', font: 'small' });
  doorway(f, cx - 4, 1, z0 - 6, 8, 11, { frame: MAT.limestone, t: 8, transom: true, step: false });
  for (let i = 1; i < n; i++) win(f, cx - 8, 1 + i * FH + 3, z0 - 6, 16, 7, { t: 8, frame: MAT.limestone });
  f.box(cx - 3, 12, z0 - 17, 6, 1, 1, MAT.sign_red); f.box(cx - 1, 10, z0 - 17, 2, 5, 1, MAT.sign_red);
  cornice(f, x0, top - 1, x1 - x0, MAT.limestone, { z: z0, brackets: 5 });
  f.walls(x0, top, z0, x1 - x0, 2, z1 - z0, MAT.brick_yellow, 1);
  for (let i = 1; i < n; i++) beltCourse(f, x0, 1 + i * FH - 1, x1 - x0, MAT.limestone, z0);
  chimney(f, x1 - 20, top, z1 - 8, 6, 5, 14, MAT.brick_yellow);
  b.prop('flag_pole', cx + 30, 0, 8, 0, { cat: 'far' });
  b.prop('car_wagon', cx + 20, 0, 6, 1, { tint: '#f0ece0', cat: 'far' });
  signLine(b, 'AMBULANCE ENTRANCE', x0 + 23, 10, z0 - 0.05, 0, { bg: '#b3302a', fg: '#f0ece0', border: '#f0ece0', scale: 0.5 });
  // the influenza subscription plaque at the entrance
  plaque(b, "ST. LUKE'S HOSPITAL - 1920", cx - 9, 6, z0 - 16.05, 0, 'ST. LUKE\'S HOSPITAL\nERECTED 1920 BY THE PEOPLE OF JUNIPER BAY\n\nIn the autumn of 1918 the influenza took one hundred and forty of our neighbors,\nand the sick were nursed in the Council Chamber of City Hall\nbecause the town had no hospital.\n\nThat winter the town resolved that it would never be so again.\n2,311 subscribers gave $184,000 - the cannery workers a day\'s pay each,\nthe schoolchildren their pennies, the Whitcomb family the land.\n\n"Inasmuch as ye have done it unto one of the least of these." - Matthew 25:40', { scale: 0.45 });
  const F0 = floors[0], R0 = F0.rooms;
  const lob = R0.Lobby;
  const main = b.entrance(lob.id, cx, 1, z0 - 6, { outZ: z0 - 20, leaf: 'door_glass', tint: '#2a3a3a', main: true, inside: 8 });
  // lobby: reception, bench, the portrait of the founding matron
  b.prop('nurses_desk', lob.cx, 1, lob.z1 - 5, 0, {});
  const recep = b.spot('stand', lob.cx, 1, lob.z1 - 2.5, 0, { room: lob.id, act: 'counter', tags: ['clerk'] });
  b.job('receptionist', recep, { shift: ['7:00', '19:00'], title: 'hospital receptionist', sex: 'F', outfit: 'nurse' });
  b.prop('bench_station', lob.x0 + 4, 1, lob.cz, 1, {}); b.prop('palm_pot', lob.x1 - 3, 1, lob.z0 + 3, 0, {});
  framed(b, 'portrait', lob.x0 + 0.6, 7, lob.cz, 1, 'Miss Honora Duffy, R.N.', 'MISS HONORA DUFFY, R.N. (1871 - 1944)\nFirst Superintendent of Nurses, St. Luke\'s Hospital, 1920 - 1939.\nIn 1918 she nursed the influenza ward in the Council Chamber for six weeks\nwithout going home. She is Sgt. Augustine Duffy\'s aunt, and he will tell you so.');
  readAt(b, lob.x1 - 2, 5, lob.cz, 3, 'Visiting hours', 'ST. LUKE\'S HOSPITAL - VISITING HOURS\nWards: 2 - 4 P.M. and 7 - 8 P.M.\nMaternity: Fathers 7 - 8 P.M. only. (Fathers may view the Nursery through the glass.)\nChildren under 12 not admitted to the wards.\nPlease do not smoke in the corridors.\n\nSuperintendent: Miss Margaret Kearney, R.N.   Chief of Staff: Nathaniel Pike, M.D.', 2.4);
  // waiting room — Stan Kaminski's groove in the linoleum
  const wr = R0['Waiting Room'];
  for (let x = wr.x0 + 3; x < wr.x1 - 2; x += 4) { b.prop('chair_wood', x, 1, wr.z0 + 2, 2, { tint: '#6a8a7a' }); }
  b.prop('magazine_rack', wr.x1 - 2, 1, wr.cz, 3, {}); b.prop('clock_wall', wr.cx, 9, wr.z1 - 0.6, 0, {});
  b.prop('table_side', wr.x0 + 2, 1, wr.cz, 0, {}); b.prop('radiator', wr.x0 + 1, 1, wr.z1 - 4, 1, {});
  f.box(wr.x0 + 6, 0, wr.cz - 1, wr.x1 - wr.x0 - 12, 1, 2, MAT.floor_linoleum);
  b.spot('stand', wr.cx, 1, wr.cz, 1, { room: wr.id, act: 'pace', tags: ['waiting'], label: 'Pacing the waiting room' });
  for (let k = 0; k < 3; k++) b.spot('sit', wr.x0 + 3 + k * 4, 1, wr.z0 + 2, 2, { room: wr.id, act: rng.pick(['read', 'sit', 'doze']), tags: ['hospital_visitor'], seat: 0.45 });
  readAt(b, wr.cx, 5, wr.z1 - 1, 0, 'Waiting room', 'On the side table: a Saturday Evening Post (July), a Life (the Coronation issue),\nand an ashtray holding eleven pipe dottles and one unlit cigar\nwith a paper band that reads IT\'S A GIRL! (Somebody is being optimistic.)\n\nThe linoleum in the middle of the room is noticeably worn.', 2.2);
  // emergency room, operating room, x-ray, pharmacy, chapel
  const er = R0['Emergency Room'];
  b.prop('exam_table', er.cx - 6, 1, er.cz, 0, {}); b.prop('exam_table', er.cx + 6, 1, er.cz, 0, {}); b.prop('privacy_screen', er.cx, 1, er.cz, 1, {});
  b.prop('iv_stand', er.cx - 3, 1, er.cz - 3, 0, {}); b.prop('wheelchair', er.x1 - 3, 1, er.z0 + 3, 3, {});
  const orr = R0['Operating Room'];
  f.box(orr.x0, 0, orr.z0, orr.x1 - orr.x0, 1, orr.z1 - orr.z0, MAT.floor_tile_white);
  b.prop('exam_table', orr.cx, 1, orr.cz, 1, { tint: '#d8e0e0' });
  f.box(Math.round(orr.cx) - 2, 11, Math.round(orr.cz) - 2, 4, 1, 4, MAT.chrome); f.box(Math.round(orr.cx) - 1, 10, Math.round(orr.cz) - 1, 2, 1, 2, MAT.bulb_always);
  b.prop('iv_stand', orr.cx + 4, 1, orr.cz + 2, 0, {}); b.prop('cabinet_upper', orr.x1 - 1, 6, orr.cz, 3, {});
  const doc0 = b.spot('stand', orr.cx - 3.5, 1, orr.cz, 1, { room: orr.id, act: 'exam', tags: ['doctor'] });
  const xr = R0['X-Ray & Laboratory'];
  b.prop('exam_table', xr.cx - 4, 1, xr.cz, 1, {}); b.prop('desk_office', xr.x1 - 4, 1, xr.cz, 3, {}); b.prop('books_stack', xr.x1 - 4, 4, xr.cz, 3, {});
  f.box(Math.round(xr.cx) - 5, 1, xr.z1 - 2, 2, 12, 2, MAT.steel);
  const ph = R0.Pharmacy;
  for (let x = ph.x0 + 3; x < ph.x1 - 2; x += 5) b.prop('shelf_goods', x, 1, ph.z1 - 1.2, 0, {});
  b.prop('counter_shop', ph.cx, 1, ph.z0 + 4, 2, { tint: '#e8e8e0' });
  const ch = R0.Chapel;
  for (let z = ch.z0 + 3; z < ch.z1 - 3; z += 4.5) pewRow(b, ch.id, ch.cx, 1, z, 3, ['pray'], { act: 'pray_sit', seats: [-2, 2], player: true });
  b.prop('altar', ch.x0 + 3, 1, ch.cz, 1, { scale: 0.7 }); b.prop('candles_pair', ch.x0 + 3, 4, ch.cz, 1, {});
  f.box(ch.x0, 5, Math.round(ch.cz) - 2, 1, 6, 4, MAT.glass_stained_blue);
  readAt(b, ch.x0 + 3, 4, ch.cz, 1, 'Hospital chapel', 'THE CHAPEL OF THE GOOD PHYSICIAN\nGiven in memory of the one hundred and forty who died in the influenza, 1918.\nOpen to all faiths at all hours.\n\nThe prayer book on the lectern is open to a page with a pencilled note:\n"For Carol, and for the baby. - S.K."', 2.2);
  // Floor 2: wards & nurses' station
  const F1 = floors[1], R1 = F1.rooms;
  const wardBeds = (r, k) => {
    const beds = [];
    const per = Math.max(2, Math.floor((r.x1 - r.x0 - 4) / 7));
    for (let q = 0; q < per; q++) {
      const x = r.x0 + 4 + q * ((r.x1 - r.x0 - 6) / per) + 1;
      b.prop('hospital_bed', x, r.y, r.z0 + 5.2, 2, { tint: '#e8ece8' });
      b.prop('nightstand', x + 2.6, r.y, r.z0 + 2, 2, {});
      if (q < k) beds.push(b.spot('sleep', x, r.y, r.z0 + 4.5, 2, { room: r.id, act: rng.pick(['sleep', 'read', 'sleep']), tags: ['patient'], seat: 0.7, label: 'A patient at St. Luke\'s' }));
      if (q % 2 === 0) b.prop('privacy_screen', x + 3.5, r.y, r.z0 + 7, 0, { scale: 0.9 });
    }
    b.prop('ceiling_lamp', r.cx, r.y + 11, r.cz, 0, {});
    return beds;
  };
  const nurseSpots = [];
  for (const nm of ["Men's Ward", "Men's Ward (Annex)", "Women's Ward", "Women's Ward (Annex)"]) { wardBeds(R1[nm], 2); nurseSpots.push(b.spot('stand', R1[nm].cx, R1[nm].y, R1[nm].z1 - 3, 0, { room: R1[nm].id, act: 'exam', tags: ['nurse'] })); }
  const ns = R1["Nurses' Station"];
  b.prop('nurses_desk', ns.cx, ns.y, ns.z1 - 4, 0, {}); b.prop('filing_cabinet', ns.x0 + 2, ns.y, ns.z0 + 2, 1, {});
  b.prop('telephone', ns.cx + 1.5, ns.y + 3, ns.z1 - 4, 0, {});
  const nsSpot = b.spot('stand', ns.cx, ns.y, ns.z1 - 1.5, 0, { room: ns.id, act: 'write', tags: ['nurse'] });
  readAt(b, ns.cx, ns.y + 4, ns.z1 - 4, 0, 'Nurses\' station duty book', 'DUTY BOOK - SAT. SEPT. 26, 1953\n\n7 A.M. Miss Kearney: "All leave cancelled until after the fireworks. Expect\n  one cut hand per clam stall and at least one fall from the bandstand."\n9:40 Bed 4 (Mr. Gould) asks again for the Red Sox score. Game is not until 1:30.\n12:55 Mrs. C. Kaminski admitted, Maternity. Dr. Pike notified. Mr. Kaminski notified.\n  Mr. Kaminski notified again. Mr. Kaminski asked to sit down.\n2:00 Church bells (St. Brigid\'s wedding). Bed 7 asks if it is the fire alarm.', 2.2);
  for (const nm of ['Private Room 21', 'Private Room 22', 'Private Room 23']) wardBeds(R1[nm], 1);
  const lin = R1['Linen & Supply'];
  for (let x = lin.x0 + 3; x < lin.x1 - 2; x += 5) b.prop('shelf_goods', x, lin.y, lin.z1 - 1.2, 0, { tint: '#f0f0f0' });
  // Floor 3: maternity, delivery, the nursery behind glass
  const F2 = floors[2], R2 = F2.rooms;
  const mat = R2['Maternity Ward'];
  const matBeds = wardBeds(mat, 0);
  void matBeds;
  b.spot('sleep', mat.x0 + 5, mat.y, mat.z0 + 4.5, 2, { room: mat.id, act: 'sleep', tags: ['maternity'], seat: 0.7, label: 'In the maternity ward' });
  b.prop('vase_flowers', mat.x0 + 7.6, mat.y + 3, mat.z0 + 2, 0, { tint: '#f4c0c8' });
  readAt(b, mat.x0 + 6, mat.y + 4, mat.z0 + 4, 2, 'Bed 1, Maternity', 'CHART - BED 1, MATERNITY\nKaminski, Mrs. Carol A., age 25. Primipara. Admitted 12:55 P.M.\nPhysician: N. Pike, M.D.\n\nOn the nightstand: a knitted yellow blanket with a card:\n"For the new little one, from Opal Fisk, Whitcomb Point Light."\n(Mrs. Fisk has knitted one for every baby born in Juniper Bay since 1921.)', 2);
  const dr = R2['Delivery Room'];
  f.box(dr.x0, dr.y - 1, dr.z0, dr.x1 - dr.x0, 1, dr.z1 - dr.z0, MAT.floor_tile_white);
  b.prop('exam_table', dr.cx, dr.y, dr.cz, 1, {}); b.prop('bassinet', dr.x1 - 3, dr.y, dr.z0 + 3, 3, {});
  const doc1 = b.spot('stand', dr.cx - 3, dr.y, dr.cz, 1, { room: dr.id, act: 'exam', tags: ['doctor'] });
  const nur = R2.Nursery;
  f.box(nur.x0 + 5, nur.y + 2, 58, nur.x1 - nur.x0 - 8, 6, 1, MAT.glass);    // the viewing window onto the corridor
  f.box(nur.x0 + 5, nur.y + 1, 57, nur.x1 - nur.x0 - 8, 1, 1, MAT.wood_mid);
  f.box(nur.x0, nur.y - 1, nur.z0, nur.x1 - nur.x0, 1, nur.z1 - nur.z0, MAT.tile_pink);
  for (let q = 0; q < 6; q++) b.prop('bassinet', nur.x0 + 5 + q * ((nur.x1 - nur.x0 - 8) / 6), nur.y, nur.z0 + 3 + (q % 2) * 5, 0, { tint: q % 2 ? '#a8c8e8' : '#f0c0c8' });
  b.prop('rocking_chair', nur.x1 - 3, nur.y, nur.z1 - 3, 3, {});
  const nurNurse = b.spot('stand', nur.cx, nur.y, nur.z1 - 3, 0, { room: nur.id, act: 'counter', tags: ['nurse'] });
  const nw = b.spot('stand', nur.cx, nur.y, 55.5, 2, { room: F2.corr, act: 'look', tags: ['nursery_window'], label: 'At the nursery window' });
  void nw;
  readAt(b, nur.cx, nur.y + 4, 56, 2, 'The nursery window', 'THE NURSERY\nBorn at St. Luke\'s this week:\nSept. 21 - boy, 8 lb. 1 oz. (Silva)\nSept. 23 - girl, 6 lb. 12 oz. (Gould)\nSept. 24 - twins! 5 lb. 9 oz. and 6 lb. 0 oz. (Tremblay)\nSept. 26 - ...\n\nA card is taped to the glass in pencil: "KAMINSKI - any minute now."', 2);
  wardBeds(R2["Children's Ward"], 2);
  b.prop('teddy_bear', R2["Children's Ward"].x0 + 5, R2["Children's Ward"].y + 3, R2["Children's Ward"].z0 + 3, 2, {});
  b.prop('toy_blocks', R2["Children's Ward"].cx, R2["Children's Ward"].y, R2["Children's Ward"].z1 - 3, 0, {});
  const ns3 = R2["Nurses' Station, Floor 3"];
  b.prop('nurses_desk', ns3.cx, ns3.y, ns3.z1 - 4, 0, {});
  const ns3Spot = b.spot('stand', ns3.cx, ns3.y, ns3.z1 - 1.5, 0, { room: ns3.id, act: 'write', tags: ['nurse'] });
  const ml = R2["Mothers' Lounge"];
  b.prop('sofa', ml.cx, ml.y, ml.z1 - 2.5, 0, { tint: '#c8a8b0' }); b.prop('radio_table', ml.x0 + 2, ml.y, ml.cz, 1, {});
  // Floor 4: solarium & private rooms
  const F3 = floors[3], R3 = F3.rooms;
  const sol = R3.Solarium;
  for (let x = sol.x0 + 4; x < sol.x1 - 3; x += 6) { b.prop('rocking_chair', x, sol.y, sol.z0 + 4, 0, {}); b.prop('plant_pot', x + 3, sol.y, sol.z0 + 2, 0, {}); }
  for (const nm of ['Private Room 41', 'Private Room 42', 'Private Room 43', 'Private Room 44', 'Isolation Room']) if (R3[nm]) wardBeds(R3[nm], 1);
  for (const nm of ['Private Room 31', 'Private Room 32', 'Private Room 33']) if (R2[nm]) wardBeds(R2[nm], 1);
  // jobs
  b.job('nurse', [nsSpot, ...nurseSpots.slice(0, 2)], { shift: ['7:00', '19:00'], title: 'nurse', sex: 'F', outfit: 'nurse' });
  b.job('nurse', [ns3Spot, nurNurse], { shift: ['7:00', '19:00'], title: 'maternity nurse', sex: 'F', outfit: 'nurse' });
  b.job('nurse', [nurseSpots[2], nurseSpots[3], b.spot('stand', er.cx, 1, er.cz + 4, 0, { room: er.id, act: 'exam', tags: ['nurse'] })], { shift: ['11:00', '23:00'], title: 'nurse', sex: 'F', outfit: 'nurse' });
  b.job('doctor', [doc1, doc0, b.spot('stand', mat.cx, mat.y, mat.z1 - 3, 0, { room: mat.id, act: 'exam', tags: ['doctor'] })], { shift: ['8:00', '21:00'], title: 'chief of staff', outfit: 'doctor', sex: 'M' });
  const docs = R0["Doctors' Offices"];
  officeDesk(b, docs.id, docs.cx, 1, docs.z0 + 7, 0, { typewriter: false });
  b.prop('bookshelf', docs.x0 + 2, 1, docs.z1 - 1.2, 0, {});
  const adm = R0.Admissions;
  b.job('admissions clerk', officeDesk(b, adm.id, adm.cx, 1, adm.z0 + 7, 0, {}), { shift: ['8:00', '16:00'], title: 'admissions clerk', outfit: 'clerk' });
  // garden with benches for convalescents
  for (const x of [x0 + 10, x1 - 10]) { b.prop('tree_maple_red', x, 0, 10, 0, { cat: 'far' }); b.prop('bench_park', x + (x < cx ? 10 : -10), 0, 12, 0, {}); }
  linkToSidewalk(ctx, main);
  return b;
}


// =====================================================================================
// ENGINE COMPANY No. 1 (1903) — home of "Old Faithful"
// =====================================================================================
function buildFireStation(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'Engine Company No. 1', kind: 'firestation', lot, address: lot.address, established: spec.est || 1903,
    lore: 'Brick firehouse of 1903. Home of "Old Faithful", the steam pumper that saved half of Market Street.', hours: [0, 24 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('fire' + lot.x);
  const BW = W, BD = Math.min(D - 16, 84), G = 18, U = 13;
  f.box(0, -1, 0, W, 1, D, MAT.concrete);
  f.box(0, 0, 0, BW, 1, BD, MAT.floor_concrete);
  shell(f, 0, 1, 0, BW, G + U, BD, MAT.brick_red, MAT.brick_white, 2);
  f.box(2, G, 2, BW - 4, 1, BD - 4, MAT.floor_oak);
  f.box(0, G + U, 0, BW, 1, BD, MAT.roof_tar);
  f.walls(0, G + U + 1, 0, BW, 3, BD, MAT.brick_red, 1);
  cornice(f, 0, G + U - 1, BW, MAT.limestone, { brackets: 3 });
  // stepped parapet with the date stone
  f.box(Math.round(BW / 2) - 10, G + U + 1, -1, 20, 5, 2, MAT.brick_red);
  f.box(Math.round(BW / 2) - 5, G + U + 6, -1, 10, 2, 2, MAT.brick_red);
  f.text('1903', BW / 2, G + U + 1, -2, MAT.limestone, { align: 'center', font: 'small' });
  // bay doors (open) with red folding leaves pushed back
  const bays = [[6, 22], [BW - 28, 22]];
  for (const [bx, bw] of bays) {
    f.carve(bx, 1, 0, bw, 16, 2);
    f.archCarve(bx, 13, 0, bw, 6, 2);
    f.box(bx - 1, 1, -1, 1, 17, 1, MAT.limestone); f.box(bx + bw, 1, -1, 1, 17, 1, MAT.limestone);
    f.box(bx, 1, 2, 3, 15, 1, MAT.steel_red); f.box(bx + bw - 3, 1, 2, 3, 15, 1, MAT.steel_red);
    f.box(bx - 1, -1, -8, bw + 2, 1, 8, MAT.concrete_dark);
  }
  doorway(f, Math.round(BW / 2) - 2, 1, 0, 4, 10, { frame: MAT.limestone, t: 2, transom: true, step: false });
  f.text('ENGINE CO. NO. 1', BW / 2, G + 1, -1, MAT.trim_gold, { align: 'center', font: 'small' });
  f.box(0, G - 1, -1, BW, 1, 1, MAT.limestone);
  for (const x of [8, 18, BW / 2 - 3, BW - 26, BW - 16]) win(f, Math.round(x), G + 3, 0, 5, 8, { t: 2, frame: MAT.limestone, style: 'arch' });
  for (let z = 8; z < BD - 6; z += 12) { winSide(f, 3, z, 7, 0, 4, 8, { t: 2, frame: MAT.limestone }); winSide(f, 3, z, G + 3, 0, 4, 7, { t: 2, frame: MAT.limestone }); }
  // hose-drying tower at the back corner
  const tx = BW - 16;
  shell(f, tx, 1, BD - 2, 14, 64, 14, MAT.brick_red, null, 1);
  f.box(tx - 1, 65, BD - 3, 16, 1, 16, MAT.limestone);
  f.hip(tx, 66, BD - 2, 14, 14, MAT.roof_slate, { rise: 2 });
  f.box(tx + 6, 12, BD + 5, 2, 50, 1, MAT.canvas_tan);
  win(f.faceFrame('back'), W - tx - 9, 50, D - BD - 12, 4, 6, { t: 1, frame: MAT.limestone });
  // ---- interior
  const IX0 = 2, IX1 = BW - 2, BZ = BD - 28;
  partitionX(f, IX0, IX1, 1, BZ, G - 1, MAT.brick_white, [{ at: 10, w: 4 }, { at: IX1 - 16, w: 4 }]);
  partitionZ(f, BZ + 1, BD - 2, 1, 36, G - 1, MAT.brick_white, []);
  const app = b.room('Apparatus Floor', IX0, 1, 2, IX1 - IX0, G - 1, BZ - 2, { lightMode: 'always', kind: 'garage', ambient: 0.5 });
  const kit = b.room('Kitchen & Day Room', IX0, 1, BZ + 1, 34, G - 1, BD - 3 - BZ, { lightMode: 'auto' });
  const off = b.room("Captain's Office & Watch Desk", 37, 1, BZ + 1, IX1 - 37, G - 1, BD - 3 - BZ, { lightMode: 'auto' });
  const bunk = b.room('Bunk Room', IX0, G + 1, 2, 44, U - 1, BD - 4, { lightMode: 'auto' });
  const capq = b.room("Captain's Quarters", 47, G + 1, 2, IX1 - 47, U - 1, 30, { lightMode: 'auto' });
  const bath = b.room('Washroom', 47, G + 1, 33, IX1 - 47, U - 1, BD - 35, { lightMode: 'auto' });
  partitionZ(f, 2, BD - 2, G + 1, 46, U - 1, MAT.plaster_cream, [{ at: 12, w: 4 }, { at: 40, w: 4 }]);
  partitionX(f, 47, IX1, G + 1, 32, U - 1, MAT.plaster_cream, []);
  const e1 = b.entrance(app, 17, 1, 0, { outZ: -9, leaf: false, main: true });
  const e2 = b.entrance(app, BW - 17, 1, 0, { outZ: -9, leaf: false });
  const e3 = b.entrance(app, BW / 2, 1, 0, { outZ: -6, leaf: 'door_wood', tint: '#8a1f24' });
  b.door(app, kit, 12, 1, BZ, { leaf: 'door_wood' });
  b.door(app, off, IX1 - 14, 1, BZ, { leaf: 'door_wood' });
  b.door(bunk, capq, 46, G + 1, 14, { axis: 'z', leaf: 'door_wood' });
  b.door(bunk, bath, 46, G + 1, 42, { axis: 'z', leaf: 'door_wood' });
  // stairs up from the kitchen
  stairs(f, 5, 1, BD - 7, '+x', G, { w: 4, run: 1, mat: MAT.wood_mid, rail: false });
  b.stairs(kit, [4, 1, BD - 5], bunk, [5 + G + 1, G + 1, BD - 5]);
  // the brass poles, down through holes in the bunk room floor
  for (const [px, pz] of [[30, 20], [30, 36]]) { f.carve(px - 1, G, pz - 1, 3, 1, 3); f.box(px, 1, pz, 1, G + U - 1, 1, MAT.trim_gold); f.box(px - 1, G + 1, pz - 1, 3, 1, 1, MAT.iron); }
  // the apparatus: the 1951 Maxim pumper and Old Faithful (1903 Amoskeag steamer)
  b.prop('truck_fire', 17, 1, 22, 0, { cat: 'far' });
  b.prop('steam_pumper', BW - 17, 1, 20, 0, {});
  for (const [dx, dz] of [[-6, -8], [6, -8], [-6, 10], [6, 10]]) b.prop('velvet_rope', BW - 17 + dx, 1, 20 + dz, dz < 0 ? 0 : 2, {});
  plaque(b, 'OLD FAITHFUL', BW - 24, 4, 12, 3, '"OLD FAITHFUL"\nSecond-size Amoskeag steam fire engine, No. 712\nManchester, New Hampshire, 1889\n\nLent by the City of Portsmouth for the GREAT FIRE of June 11, 1902,\nshe pumped for thirty-one hours from the Market Street cistern\nand saved the Savings Bank, Harlow\'s and the Mercantile Building.\nThe town bought her the next spring for $3,200 and she answered every alarm\nuntil 1931. Her boiler is still sound. Captain Brennan polishes her brass\nevery Saturday, whether she needs it or not.', { scale: 0.45 });
  b.prop('helmet_rack', IX0 + 0.6, 1, 8, 1, {}); b.prop('fire_boots', IX0 + 1.2, 1, 12, 1, {}); b.prop('fire_boots', IX0 + 1.2, 1, 15, 1, {});
  b.prop('helmet_rack', IX0 + 0.6, 1, 32, 1, {});
  for (let z = 10; z < BZ - 4; z += 8) b.prop('rope_coil', IX1 - 1.5, 1, z, 3, { tint: '#a8a090' });
  b.prop('dog', 33, 1, 30, 3, { tint: '#f0ece0', tint2: '#1c1c20' });
  readAt(b, 33, 2, 30, 3, 'Sparky', 'SPARKY, the firehouse dog. Dalmatian, age 6.\nHas ridden to every alarm since 1948 and bitten nobody but the Fuller Brush man.\nHe does not like cats. This morning\'s run to Maple Street was a trial for him.', 2);
  // alarm board on the wall
  f.box(BW / 2 - 6, 6, BZ - 1, 12, 6, 1, MAT.wood_dark);
  b.prop('bell_brass', BW / 2, 12, BZ - 1, 0, {});
  readAt(b, BW / 2, 7, BZ - 1, 0, 'Running card & alarm log', 'ENGINE COMPANY No. 1 - ALARM LOG, SEPTEMBER 1953\n\nSept. 3  Box 23, Canal & Lantern. Chimney fire. Out on arrival.\nSept. 11  Box 41, Pier 2. Oil drum burning. 20 min.\nSept. 19  Still alarm. Kitten in storm drain, Orchard St. Rescued. (Pvt. Silva scratched.)\nSept. 26  11:00 A.M. Still alarm. 22 Maple St. "Admiral" (cat) up the maple.\n           Ladder raised. Cat descended on his own when the ladder touched the branch.\n\nIN MEMORIAM: Lt. Daniel Fisk and Pvt. Owen Doyle, lost at Pier 3\nin the hurricane of Sept. 21, 1938, going back for the harbormaster\'s boy. (The boy lived.)', 2.6);
  // kitchen: the checkers table and the stove
  const kr = kitchenRun(b, kit, IX0, 1, BD - 11, 30, { items: ['stove', 'kitchen_counter', 'kitchen_sink', 'fridge'], upper: true });
  b.prop('checkers_table', 18, 1, BZ + 10, 0, {});
  const chk = [];
  for (const [dx, dz, rot] of [[-2.6, 0, 1], [2.6, 0, 3], [0, -2.6, 2], [0, 2.6, 0]]) { b.prop('chair_kitchen', 18 + dx, 1, BZ + 10 + dz, rot, { tint: '#8a1f24' }); chk.push(b.spot('sit', 18 + dx, 1, BZ + 10 + dz, rot, { room: kit, act: rot % 2 ? 'chess' : 'cards', tags: ['firehouse'], seat: 0.45 })); }
  b.prop('coffee_pot', 6, 4, BD - 12, 0, {}); b.prop('radio_table', 30, 1, BD - 6, 3, {});
  b.prop('calendar_wall', 34.4, 7, BZ + 8, 3, {});
  readAt(b, 26, 5, BZ + 2, 2, 'Firehouse kitchen', 'THE KITCHEN\nCook this week: Pvt. Silva (kale soup again).\nOn the board: "BRENNAN WEDDING - SAT 2 PM - DRESS BLUES. Pvt. Kowalski has the watch."\nThe checkers game has been running since Labor Day. Kowalski is ahead 41 games to 39.', 2.2);
  // office & watch desk
  officeDesk(b, off, 54, 1, BZ + 12, 0, {});
  const watch = b.spot('sit', 54, 1, BZ + 15.2, 0, { room: off, act: 'read', tags: ['firehouse'], seat: 0.46 });
  b.prop('filing_cabinet', IX1 - 2, 1, BD - 5, 0, {}); b.prop('police_radio', 42, 4, BD - 5, 0, {});
  framed(b, 'photo_frames', IX1 - 0.6, 7, BZ + 12, 3, 'Engine Co. No. 1, 1903', 'Photograph: the company on the day Old Faithful came home from Portsmouth, April 1903.\nCapt. Michael Brennan (Joe Brennan\'s grandfather) at the reins of the team,\nDolly and Duke, who pulled her until the motor pumper came in 1921.');
  // upstairs: bunks, lockers, captain's quarters, washroom
  for (let i = 0; i < 6; i++) { const x = 6 + (i % 3) * 13, z = i < 3 ? 6 : 44; b.prop('bed_single', x, G + 1, z, i < 3 ? 2 : 0, { tint: '#6a7a5a' }); b.prop('lockers', x + 5, G + 1, i < 3 ? 2.5 : BD - 4.5, i < 3 ? 2 : 0, { tint: '#6a6a5a' }); }
  b.prop('ceiling_lamp', 22, G + 10, 28, 0, {});
  b.prop('bed_single', 60, G + 1, 8, 2, { tint: '#3a4a6a' }); b.prop('desk_wood', 66, G + 1, 26, 3, {}); b.prop('wardrobe', 52, G + 1, 29, 0, {});
  bathroom(b, bath, 47, G + 1, 33, IX1 - 47, BD - 35);
  // jobs
  const wash1 = b.spot('stand', 11, 1, 22, 1, { room: app, act: 'wash', tags: ['firehouse'] });
  const polish = b.spot('stand', BW - 23, 1, 20, 1, { room: app, act: 'wash', tags: ['firehouse'] });
  b.job('captain', [polish, watch, chk[0]], { shift: ['7:00', '19:00'], title: 'captain, Engine Co. No. 1', outfit: 'fire', sex: 'M' });
  b.job('fireman', [chk[1], wash1], { shift: ['7:00', '19:00'], title: 'fireman', outfit: 'fire', sex: 'M' });
  b.job('fireman', [chk[2], kr.spots[0] || chk[2]], { shift: ['7:00', '19:00'], title: 'fireman', outfit: 'fire', sex: 'M' });
  b.job('fireman', [chk[3], b.spot('stand', 17, 1, -4, 0, { room: 0, act: 'stand', tags: ['firehouse'] })], { shift: ['7:00', '19:00'], title: 'fireman', outfit: 'fire', sex: 'M' });
  b.job('fireman', [b.spot('sleep', 6, G + 1, 10, 2, { room: bunk, act: 'sleep', tags: ['firehouse'] }), b.spot('stand', BW / 2, 1, -3, 0, { room: 0, act: 'lean', tags: ['firehouse'] })], { shift: ['19:00', '23:59'], title: 'night-watch fireman', outfit: 'fire', sex: 'M' });
  b.prop('fire_hydrant', -1, 0, -6, 0, {});
  for (const e of [e1, e2, e3]) linkToSidewalk(ctx, e);
  void rng;
  return b;
}

// =====================================================================================
// POLICE HEADQUARTERS
// =====================================================================================
function buildPolice(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'Police Headquarters', kind: 'police', lot, address: lot.address, established: 1897,
    lore: 'The Juniper Bay Police Department: a chief, a sergeant, eleven patrolmen and two cars.', hours: [0, 24 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const BD = Math.min(D - 20, 76), FH = 14, cx = Math.round(W / 2);
  f.box(0, -1, 0, W, 1, D, MAT.concrete);
  f.box(0, 0, 0, W, 1, BD, MAT.floor_terrazzo);
  shell(f, 0, 1, 0, W, FH * 2, BD, MAT.brick_dark, MAT.plaster_green, 2);
  f.box(2, FH, 2, W - 4, 1, BD - 4, MAT.floor_linoleum);
  f.box(0, FH * 2, 0, W, 1, BD, MAT.roof_tar); f.walls(0, FH * 2 + 1, 0, W, 2, BD, MAT.brick_dark, 1);
  cornice(f, 0, FH * 2 - 1, W, MAT.granite, { dentils: true });
  f.box(0, 1, -1, W, 3, 1, MAT.granite);
  doorway(f, cx - 3, 1, 0, 6, 10, { frame: MAT.granite, t: 2, transom: true });
  f.box(cx - 5, 0, -5, 10, 1, 4, MAT.granite);
  f.text('POLICE', cx, FH + 4, -1, MAT.trim_gold, { align: 'center', font: 'big' });
  f.text('HEADQUARTERS', cx, 12, -1, MAT.granite, { align: 'center', font: 'small' });
  for (const x of [cx - 6, cx + 5]) { f.box(x, 6, -2, 1, 1, 2, MAT.iron); f.sphere(x + 0.5, 7.5, -2.5, 1.2, MAT.traffic_green); }
  b.light(cx, 8, -3, { color: [0.4, 1, 0.5], radius: 4, mode: 'night' });
  for (const x of [6, 14, W - 20, W - 12]) { win(f, x, 5, 0, 4, 7, { t: 2, frame: MAT.granite }); win(f, x, FH + 4, 0, 4, 7, { t: 2, frame: MAT.granite }); }
  const IX0 = 2, IX1 = W - 2, Z1 = 24, Z2 = 48;
  partitionX(f, IX0, IX1, 1, Z1, FH - 1, MAT.plaster_green, [{ at: IX0 + 6, w: 4 }, { at: IX1 - 12, w: 4 }]);
  partitionX(f, IX0, IX1, 1, Z2, FH - 1, MAT.plaster_green, [{ at: IX0 + 6, w: 4 }]);
  partitionZ(f, Z1 + 1, Z2, 1, 34, FH - 1, MAT.plaster_green, []);
  const lobby = b.room('Front Desk', IX0, 1, 2, IX1 - IX0, FH - 1, Z1 - 2, { lightMode: 'always' });
  const squad = b.room('Squad Room', IX0, 1, Z1 + 1, 32, FH - 1, Z2 - Z1 - 1, { lightMode: 'always' });
  const chief = b.room("Chief's Office", 35, 1, Z1 + 1, IX1 - 35, FH - 1, Z2 - Z1 - 1, { lightMode: 'auto' });
  const cells = b.room('Cell Block', IX0, 1, Z2 + 1, IX1 - IX0, FH - 1, BD - 3 - Z2, { lightMode: 'always', ambient: 0.15 });
  const radio = b.room('Radio Room', IX0, FH + 1, 2, 30, FH - 1, 30, { lightMode: 'always' });
  const recs = b.room('Records & Lockers', 33, FH + 1, 2, IX1 - 33, FH - 1, BD - 4, { lightMode: 'auto' });
  const upHall = b.room('Upstairs Hall', IX0, FH + 1, 33, 30, FH - 1, BD - 35, { lightMode: 'auto' });
  partitionZ(f, 2, BD - 2, FH + 1, 32, FH - 1, MAT.plaster_green, [{ at: 40, w: 4 }]);
  partitionX(f, IX0, 32, FH + 1, 32, FH - 1, MAT.plaster_green, [{ at: 12, w: 4 }]);
  const ent = b.entrance(lobby, cx, 1, 0, { outZ: -7, leaf: 'door_wood', tint: '#2a3a2a', main: true });
  b.door(lobby, squad, IX0 + 8, 1, Z1, { leaf: 'door_wood' });
  b.door(lobby, chief, IX1 - 10, 1, Z1, { leaf: 'door_wood', tint: '#3a2a1a' });
  b.door(squad, cells, IX0 + 8, 1, Z2, { leaf: 'door_wood', tint: '#4a4a4a' });
  b.door(upHall, radio, 14, FH + 1, 32, { leaf: 'door_wood' });
  b.door(upHall, recs, 32, FH + 1, 42, { axis: 'z', leaf: 'door_wood' });
  stairs(f, 26, 1, Z1 + 2, '+z', FH, { w: 4, run: 1, mat: MAT.wood_mid, rail: false });
  b.stairs(squad, [28, 1, Z1 + 2], upHall, [28, FH + 1, Z1 + 3 + FH]);
  // desk sergeant's high desk
  b.prop('police_desk', cx, 1, 15, 0, {});
  const sgt = b.spot('stand', cx, 1, 18.5, 0, { room: lobby, act: 'counter', tags: ['police'] });
  b.job('desk sergeant', [sgt], { shift: ['7:00', '19:00'], title: 'desk sergeant', outfit: 'police', sex: 'M' });
  b.prop('bench_station', 8, 1, 6, 1, {}); b.spot('sit', 8, 1, 6, 1, { room: lobby, act: 'wait', tags: ['police_visitor'], seat: 0.45 });
  b.prop('wanted_board', IX1 - 0.6, 1, 12, 3, {});
  readAt(b, IX1 - 2, 5, 12, 3, 'Notice board', 'JUNIPER BAY POLICE DEPARTMENT\n\nWANTED by the F.B.I.: (three circulars, the faces stern and unfamiliar)\n\nLOST AND FOUND, CENTENNIAL DAY:\n- one child\'s red mitten (it is September)\n- a set of false teeth, upper, found on the bandstand steps\n- a pocket watch engraved "J.C. 1889"\n- one small boy, "Paul," age 4. (Returned to the Moreau residence, 2:10 P.M.)\n\nPARKING on Lantern Avenue suspended until midnight. Fireworks: NO VEHICLES on Harbor St.\nafter 8 P.M. By order, Chief Thomas F. Kearney.', 2.4);
  b.prop('clock_wall', cx, 11, 2.6, 2, {}); b.prop('flag_stand', 5, 1, 20, 0, {});
  signLine(b, 'DESK SERGEANT', cx, 10, 2.6, 2, { bg: '#1d1d22', fg: '#e8c870', border: '#c9a24a', scale: 0.45 });
  // squad room
  for (let i = 0; i < 3; i++) officeDesk(b, squad, 8 + i * 8, 1, Z1 + 12, 0, { typewriter: i === 1 });
  b.prop('lockers', 4, 1, Z2 - 1.5, 0, {}); b.prop('lockers', 8, 1, Z2 - 1.5, 0, {});
  readAt(b, 16, 5, Z1 + 1, 2, 'Duty roster', 'DUTY ROSTER - SATURDAY, SEPTEMBER 26 (CENTENNIAL)\n\nDESK: Sgt. A. Duffy (7 - 7)\nMARKET ST. BEAT: Ptl. F. Rourke\nFOUNDERS SQUARE: Ptls. Silva, Gould, Weiss (fair & Mayor\'s address)\nHARBOR ST. & PIERS: Ptls. Kowalski, Tremblay (fireworks detail from 8)\nCAR 1: Ptls. Beal & Russo\nCAR 2: in the shop (Mill Street Garage). Again.\n\nALL LEAVE CANCELLED. Wear the white gloves at 5:30.', 2.2);
  // chief's office
  const cw = IX1 - 35;
  b.prop('desk_wood', 35 + cw / 2, 1, Z1 + 8, 0, {}); b.prop('chair_office', 35 + cw / 2, 1, Z1 + 5, 2, {});
  b.prop('flag_stand', IX1 - 2, 1, Z1 + 3, 0, {}); b.prop('filing_cabinet', 37, 1, Z2 - 2, 0, {}); b.prop('safe_small', IX1 - 2, 1, Z2 - 2, 0, {});
  framed(b, 'photo_frames', IX1 - 0.6, 7, Z1 + 12, 3, 'Department photograph, 1934', 'The Juniper Bay Police Department, 1934. Twelve men and a horse named Major.\nThe caption is carefully silent about July of that year.');
  // cell block: two cells with bars
  const cz0 = Z2 + 8;
  for (const [cx0, cx1] of [[20, 38], [40, 60]]) {
    f.box(cx0, 1, cz0, 1, FH - 1, BD - 3 - cz0, MAT.iron);
    for (let x = cx0; x < cx1; x += 2) f.box(x, 1, cz0, 1, FH - 1, 1, MAT.iron);
    f.box(cx0, 9, cz0, cx1 - cx0, 1, 1, MAT.iron);
    f.carve(cx0 + 3, 1, cz0, 1, 8, 1);
    b.prop('jail_cot', (cx0 + cx1) / 2, 1, BD - 5, 0, {});
  }
  f.box(60, 1, cz0, 1, FH - 1, BD - 3 - cz0, MAT.iron);
  const cellCot = b.spot('sleep', 29, 1, BD - 6, 0, { room: cells, act: 'sleep', tags: ['cell'], label: 'Sleeping it off in a cell' });
  void cellCot;
  readAt(b, 30, 5, cz0, 0, 'Cell No. 1', 'CELL No. 1\nOccupant: Horace "Hap" Gould, 71, retired lobsterman.\nCharge: none. He asked to sleep here after the Anchor & Chain\n"so Mrs. Gould won\'t know." Mrs. Gould knows. She sent over a pie.', 2);
  // radio room
  b.prop('police_radio', 8, FH + 1, 4, 2, {}); b.prop('radio_console_studio', 16, FH + 1, 4, 2, {});
  b.prop('chair_office', 8, FH + 1, 7, 0, {});
  const disp = b.spot('sit', 8, FH + 1, 7, 0, { room: radio, act: 'phone', tags: ['police'], seat: 0.46 });
  b.job('dispatcher', disp, { shift: ['8:00', '20:00'], title: 'radio dispatcher', outfit: 'police' });
  readAt(b, 12, FH + 5, 3, 2, 'Radio log', 'RADIO LOG - KQB-712 JUNIPER BAY\n1:42 P.M. Car 1: traffic at St. Brigid\'s, wedding party. Double-parked Buick (Brennan). No action.\n2:10 P.M. Found child returned to Maple St.\n3:05 P.M. Car 1: dog fight, Founders Square, pie table. One pie lost.\n4:15 P.M. Boston Police advise: 4:52 train carrying extra 300 for fireworks.', 2);
  for (let z = 6; z < BD - 6; z += 6) b.prop('filing_cabinet', IX1 - 1.5, FH + 1, z, 3, {});
  for (let x = 36; x < IX1 - 6; x += 4) b.prop('lockers', x, FH + 1, BD - 3.5, 0, {});
  // patrolmen: on the front steps and at the corners
  const pat = [b.spot('stand', cx - 6, 0, -4, 0, { room: 0, act: 'stand', tags: ['police', 'beat'] }), b.spot('stand', 2, 0, -10, 3, { room: 0, act: 'look', tags: ['police', 'beat'] }), b.spot('stand', W - 2, 0, -10, 1, { room: 0, act: 'look', tags: ['police', 'beat'] })];
  b.job('patrolman', pat, { shift: ['7:00', '19:00'], title: 'patrolman', outfit: 'police', sex: 'M' });
  b.job('patrolman', [pat[2], pat[0]], { shift: ['15:00', '23:59'], title: 'patrolman', outfit: 'police', sex: 'M' });
  b.prop('car_police', 12, 0, -20, 1, { cat: 'far' });
  linkToSidewalk(ctx, ent);
  return b;
}

// =====================================================================================
// UNITED STATES POST OFFICE (1938, WPA) — closed Saturday afternoons
// =====================================================================================
function buildPostOffice(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'United States Post Office', kind: 'postoffice', lot, address: lot.address, established: spec.est || 1938,
    lore: 'Built 1938 under the Treasury Department. Inside: the mural "The Harvest of the Sea".', hours: [8 * 60, 12 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const x0 = 8, x1 = W - 8, z0 = 18, z1 = Math.min(D - 12, 84), FY = 3, H = 24, cx = Math.round(W / 2);
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(cx - 10, -1, 0, 20, 1, z0, MAT.sidewalk);
  f.box(x0, 0, z0, x1 - x0, FY, z1 - z0, MAT.granite);
  for (let k = 0; k < FY; k++) f.box(cx - 10, 0, z0 - 2 * (FY - k), 20, k + 1, 2, MAT.granite);
  shell(f, x0, FY, z0, x1 - x0, H, z1 - z0, MAT.limestone, MAT.plaster_cream, 2);
  f.box(x0, FY + H, z0, x1 - x0, 1, z1 - z0, MAT.roof_tar);
  f.walls(x0, FY + H + 1, z0, x1 - x0, 3, z1 - z0, MAT.limestone, 1);
  f.box(x0 - 1, FY + H - 1, z0 - 1, x1 - x0 + 2, 1, 1, MAT.limestone);
  f.text('UNITED STATES POST OFFICE', cx, FY + H - 7, z0 - 1, MAT.trim_dark, { align: 'center', font: 'small' });
  f.text('JUNIPER BAY', cx, FY + H + 1 - 0, z0 - 1, MAT.trim_dark, { align: 'center', font: 'small' });
  // five tall arched bays: the door in the middle
  const bayW = 8, gap = Math.floor((x1 - x0 - 5 * bayW) / 6);
  for (let i = 0; i < 5; i++) {
    const bx = x0 + gap * (i + 1) + bayW * i;
    if (i === 2) { doorway(f, bx + 1, FY, z0, 6, 11, { frame: MAT.granite, t: 2, transom: true, step: false }); win(f, bx + 1, FY + 13, z0, 6, 5, { t: 2, frame: MAT.granite, style: 'arch' }); }
    else win(f, bx, FY + 3, z0, bayW, 14, { t: 2, frame: MAT.granite, style: 'arch', glass: MAT.glass });
    pilaster(f, bx - Math.round(gap / 2), FY, H - 2, MAT.limestone, z0, 2);
  }
  pilaster(f, x1 - Math.round(gap / 2) - 1, FY, H - 2, MAT.limestone, z0, 2);
  // the gilded eagle over the door
  const ey = FY + 19;
  f.box(cx - 1, ey, z0 - 1, 2, 3, 1, MAT.trim_gold); f.box(cx - 5, ey + 2, z0 - 1, 4, 1, 1, MAT.trim_gold); f.box(cx + 1, ey + 2, z0 - 1, 4, 1, 1, MAT.trim_gold);
  f.box(cx - 6, ey + 3, z0 - 1, 2, 1, 1, MAT.trim_gold); f.box(cx + 4, ey + 3, z0 - 1, 2, 1, 1, MAT.trim_gold); f.box(cx, ey + 3, z0 - 1, 1, 1, 1, MAT.trim_gold);
  b.prop('flag_pole', cx + 18, 0, 6, 0, { cat: 'far' });
  b.prop('mailbox_usps', cx - 14, 0, 6, 0, {}); b.prop('mailbox_usps', cx - 16, 0, 6, 0, {});
  // cornerstone (as on every Treasury post office of the period)
  f.box(x0 + 2, FY, z0 - 1, 12, 4, 1, MAT.granite);
  signLine(b, '1938', x0 + 8, FY + 1.4, z0 - 1.05, 0, { bg: '#8e8b87', fg: '#1c1c20', border: '#8e8b87', scale: 0.45 });
  readAt(b, x0 + 8, FY + 2, z0 - 1, 0, 'Cornerstone', 'UNITED STATES POST OFFICE\nJUNIPER BAY, MASSACHUSETTS\n\nHENRY MORGENTHAU JR., SECRETARY OF THE TREASURY\nJAMES A. FARLEY, POSTMASTER GENERAL\nLOUIS A. SIMON, SUPERVISING ARCHITECT\nNEAL A. MELICK, SUPERVISING ENGINEER\n1938', 2.4);
  // interior: lobby, counter screen, boxes, mural; sorting room & postmaster behind
  const IX0 = x0 + 2, IX1 = x1 - 2, IZ0 = z0 + 2, IZ1 = z1 - 2, SZ = IZ0 + 22;
  f.box(IX0, FY - 1, IZ0, IX1 - IX0, 1, SZ - IZ0, MAT.floor_terrazzo);
  f.box(IX0, FY - 1, SZ, IX1 - IX0, 1, IZ1 - SZ, MAT.floor_oak);
  partitionX(f, IX0, IX1, FY, SZ, H - 1, MAT.wood_panel, [{ at: IX1 - 12, w: 4 }]);
  partitionZ(f, SZ + 1, IZ1, FY, IX1 - 26, H - 1, MAT.plaster_cream, [{ at: SZ + 6, w: 4 }]);
  const lobby = b.room('Post Office Lobby', IX0, FY, IZ0, IX1 - IX0, H - 1, SZ - IZ0, { lightMode: 'always', kind: 'hall' });
  const sort = b.room('Sorting Room', IX0, FY, SZ + 1, IX1 - 26 - IX0, H - 1, IZ1 - SZ - 1, { lightMode: 'always' });
  const pm = b.room("Postmaster's Office", IX1 - 25, FY, SZ + 1, 25, H - 1, IZ1 - SZ - 1, { lightMode: 'auto' });
  const ent = b.entrance(lobby, cx, FY, z0, { outZ: z0 - 10, outY: 0, leaf: 'door_glass', tint: '#3a3a2a', main: true });
  b.door(lobby, pm, IX1 - 10, FY, SZ, { leaf: 'door_wood', tint: '#3a2a1a' });
  b.door(sort, pm, IX1 - 26, FY, SZ + 8, { axis: 'z', leaf: 'door_wood' });
  // counter windows with brass grilles, PO boxes either side
  const winXs = [cx - 12, cx, cx + 12];
  for (const x of winXs) {
    f.carve(x - 3, FY + 3, SZ, 6, 5, 1);
    for (let k = 0; k < 6; k += 2) f.box(x - 3 + k, FY + 3, SZ, 1, 5, 1, MAT.trim_gold);
    b.prop('stamp_counter', x, FY, SZ - 1.2, 0, {});
  }
  for (let x = IX0 + 3; x < cx - 18; x += 4) b.prop('po_boxes', x, FY, SZ - 0.5, 0, {});
  for (let x = cx + 18; x < IX1 - 14; x += 4) b.prop('po_boxes', x, FY, SZ - 0.5, 0, {});
  signLine(b, 'STAMPS - REGISTRY - MONEY ORDERS - PARCEL POST', cx, FY + 9.5, SZ - 0.05, 0, { bg: '#1d1d22', fg: '#e8c870', border: '#c9a24a', scale: 0.38 });
  const clerk = b.spot('stand', cx, FY, SZ + 2.5, 0, { room: sort, act: 'counter', tags: ['clerk'] });
  const clerk2 = b.spot('stand', cx - 12, FY, SZ + 2.5, 0, { room: sort, act: 'counter', tags: ['clerk'] });
  b.spot('stand', cx, FY, SZ - 3, 2, { room: lobby, act: 'talk', tags: ['customer', 'shop'] });
  b.prop('writing_desk', cx - 22, FY, IZ0 + 8, 0, {}); b.prop('writing_desk', cx + 22, FY, IZ0 + 8, 0, {});
  for (const x of [IX0 + 4, IX1 - 4]) b.prop('ceiling_lamp', x, FY + 18, IZ0 + 10, 0, {});
  b.prop('chandelier', cx, FY + 17, IZ0 + 10, 0, {});
  readAt(b, cx - 22, FY + 4, IZ0 + 8, 0, 'Notice on the writing desk', 'CENTENNIAL COMMEMORATIVE CANCELLATION\n"JUNIPER BAY, MASS. - CENTENNIAL - SEPT. 26, 1953"\nwill be applied to all first-class mail posted today.\nCollectors: covers may be left at Window 2 until noon.\n\nThe Post Office is open Saturdays 8 A.M. to 12 NOON.\nLobby open until 6 P.M. for box holders.\nLast collection: 4:30 P.M. The 4:52 to Boston carries the mail.', 2.2);
  // the WPA mural above the counters: "The Harvest of the Sea"
  {
    const mx0 = cx - 34, mx1 = cx + 34, my = FY + 12, mz = SZ - 1, mh = 10;
    f.box(mx0 - 1, my - 1, mz, mx1 - mx0 + 2, mh + 2, 1, MAT.trim_gold);
    f.box(mx0, my, mz, mx1 - mx0, mh, 1, MAT.plaster_blue);
    f.box(mx0, my + mh - 2, mz, mx1 - mx0, 2, 1, MAT.plaster_yellow);
    f.box(mx0, my, mz, mx1 - mx0, 4, 1, MAT.sign_blue);
    f.box(mx0, my + 2, mz, mx1 - mx0, 1, 1, MAT.sign_teal);
    // schooner & dories, fishermen hauling a net
    f.box(mx0 + 8, my + 4, mz, 12, 2, 1, MAT.sign_black); f.box(mx0 + 13, my + 6, mz, 1, 4, 1, MAT.wood_dark);
    f.box(mx0 + 10, my + 6, mz, 3, 3, 1, MAT.canvas_tan); f.box(mx0 + 14, my + 6, mz, 3, 2, 1, MAT.canvas_tan);
    for (const dx of [26, 36]) { f.box(mx0 + dx, my + 3, mz, 5, 1, 1, MAT.sign_orange); f.box(mx0 + dx + 1, my + 4, mz, 1, 2, 1, MAT.sign_yellow); f.box(mx0 + dx + 3, my + 4, mz, 1, 2, 1, MAT.sign_yellow); }
    f.box(mx0 + 30, my + 1, mz, 6, 2, 1, MAT.leaf_litter);
    // the shore, the cannery, the lighthouse
    f.box(mx1 - 20, my, mz, 20, 5, 1, MAT.sand);
    f.box(mx1 - 16, my + 5, mz, 8, 3, 1, MAT.brick_red); f.box(mx1 - 13, my + 8, mz, 1, 2, 1, MAT.brick_dark);
    f.box(mx1 - 4, my + 4, mz, 2, 5, 1, MAT.sign_white); f.box(mx1 - 4, my + 9, mz, 2, 1, 1, MAT.lighthouse_lamp);
    for (let k = 0; k < 4; k++) { f.box(mx1 - 22 + k * 2, my + 5, mz, 1, 2, 1, [MAT.sign_yellow, MAT.sign_navy, MAT.sign_red, MAT.sign_brown][k]); f.box(mx1 - 22 + k * 2, my + 7, mz, 1, 1, 1, MAT.plaster_pink); }
    for (let k = 0; k < 5; k++) f.box(mx0 + 20 + k * 7, my + mh - 3 - (k % 2), mz, 2, 1, 1, MAT.sign_white);
    readAt(b, cx, FY + 8, SZ - 1, 0, '"The Harvest of the Sea" (mural)', '"THE HARVEST OF THE SEA"\nOil on canvas. Anton Silva, 1939.\nSection of Fine Arts, Treasury Department.\n\nA schooner of the Juniper Bay fleet rides off Gannet Ledge while two dories\nhaul a trawl of cod; on the shore the women of the cannery wait, and beyond them\nWhitcomb Point Light. The painter was a fisherman\'s son from the south wharves;\nthe man in the yellow oilskin is his father, Manuel Silva, and the dory is the TERESA.\n\nWhen it was unveiled in 1939 the fishermen argued for a month about the knots.\nThe knots, they finally agreed, are correct.', 3);
  }
  // sorting room
  for (let i = 0; i < 4; i++) b.prop('mail_sorting_rack', IX0 + 8 + i * 12, FY, IZ1 - 2, 0, {});
  b.prop('sack_pile', IX0 + 5, FY, SZ + 12, 0, { tint: '#8a8a6a' }); b.prop('luggage_cart', IX0 + 20, FY, SZ + 14, 1, {});
  b.prop('table_dining', IX0 + 30, FY, SZ + 12, 0, { tint: '#8a6a48' });
  const carrier = b.spot('stand', IX0 + 8, FY, IZ1 - 5, 2, { room: sort, act: 'shelve', tags: ['mail'] });
  const carrier2 = b.spot('stand', IX0 + 20, FY, IZ1 - 5, 2, { room: sort, act: 'shelve', tags: ['mail'] });
  b.job('postal clerk', [clerk, clerk2], { shift: ['7:45', '12:05'], title: 'postal clerk', outfit: 'clerk' });
  b.job('mail carrier', [carrier, carrier2], { shift: ['7:00', '12:30'], title: 'letter carrier', outfit: 'mail', sex: 'M' });
  // postmaster
  const pmx = IX1 - 13;
  const pmSeat = officeDesk(b, pm, pmx, FY, SZ + 12, 0, {});
  b.job('postmaster', pmSeat, { shift: ['7:30', '12:15'], title: 'postmaster', outfit: 'clerk' });
  b.prop('safe_small', IX1 - 3, FY, IZ1 - 3, 0, {}); b.prop('flag_stand', IX1 - 3, FY, SZ + 3, 0, {});
  framed(b, 'portrait', pmx, FY + 8, IZ1 - 0.6, 0, 'Portrait', 'President Dwight D. Eisenhower (hung in March; the Roosevelt portrait went to the Historical Society).');
  // loading dock
  doorSide(f, 2, IX0 + 10, FY, z1, 10, 10, { frame: MAT.limestone, t: 2, step: false });
  f.box(IX0 + 8, 0, z1, 14, FY, 6, MAT.concrete);
  b.prop('truck_delivery', IX0 + 15, 0, z1 + 14, 0, { tint: '#3a5a3a', cat: 'far' });
  const dock = b.entrance(sort, IX0 + 15, FY, z1 - 1, { inside: -3, outZ: z1 + 8, outY: 0, leaf: false });
  linkToSidewalk(ctx, ent); linkToSidewalk(ctx, dock, 30);
  return b;
}


// =====================================================================================
// MARITIME MUSEUM in the OLD CUSTOM HOUSE (1859)
// =====================================================================================
function buildMuseum(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'Maritime Museum (Old Custom House)', kind: 'museum', lot, address: lot.address, established: spec.est || 1859,
    lore: 'The granite Custom House of 1859. Since 1931 the Juniper Bay Maritime Museum.', hours: [10 * 60, 17 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const x0 = 10, x1 = W - 10, z0 = 20, z1 = Math.min(D - 12, 86), FH = 16, FY = 3, cx = Math.round(W / 2);
  f.box(0, -1, 0, W, 1, D, MAT.cobble);
  f.box(x0, 0, z0, x1 - x0, FY, z1 - z0, MAT.granite);
  for (let k = 0; k < FY; k++) f.box(cx - 16, 0, z0 - 12 - 2 * (FY - k), 32, k + 1, 2, MAT.granite);
  f.box(cx - 16, 0, z0 - 12, 32, FY, 12, MAT.granite);
  shell(f, x0, FY, z0, x1 - x0, FH * 2, z1 - z0, MAT.granite, MAT.plaster_cream, 2);
  f.box(x0 + 2, FY + FH - 1, z0 + 2, x1 - x0 - 4, 1, z1 - z0 - 4, MAT.floor_oak);
  const top = FY + FH * 2;
  f.box(x0 - 1, top - 1, z0 - 1, x1 - x0 + 2, 1, z1 - z0 + 2, MAT.granite);
  f.hip(x0, top, z0, x1 - x0, z1 - z0, MAT.roof_slate, { overhang: 1, rise: 1, fill: MAT.ceiling });
  // portico: four granite columns and a pediment
  for (const x of [cx - 14, cx - 5, cx + 4, cx + 13]) { f.cylinder(x + 0.5, FY, z0 - 8, 2, FH * 2 - 3, MAT.granite); f.cylinder(x + 0.5, FY + FH * 2 - 4, z0 - 8, 2.6, 1, MAT.granite); }
  f.box(cx - 17, top - 3, z0 - 11, 34, 3, 12, MAT.granite);
  for (let i = 0; i < 6; i++) f.box(cx - 17 + 3 * i, top + i, z0 - 11, 34 - 6 * i, 1, 12, MAT.granite);
  f.text('CUSTOM HOUSE', cx, top - 3, z0 - 12, MAT.trim_dark, { align: 'center', font: 'small' });
  f.text('1859', cx, top + 1, z0 - 12, MAT.trim_dark, { align: 'center', font: 'small' });
  // cupola
  const ry = top + Math.ceil(Math.min(x1 - x0, z1 - z0) / 2) - 6;
  f.cylinder(cx, ry, (z0 + z1) / 2, 6, 8, MAT.trim_white, 1);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 2 * PI; f.box(Math.floor(cx + Math.cos(a) * 5.6), ry + 2, Math.floor((z0 + z1) / 2 + Math.sin(a) * 5.6), 1, 4, 1, MAT.glass); }
  f.dome(cx, ry + 8, (z0 + z1) / 2, 6.5, MAT.roof_copper, { heightScale: 0.8 });
  f.box(cx, ry + 13, Math.round((z0 + z1) / 2), 1, 5, 1, MAT.trim_gold);
  f.box(cx - 2, ry + 16, Math.round((z0 + z1) / 2), 5, 1, 1, MAT.trim_gold);
  // the 1938 hurricane high-water mark
  f.box(x0, FY + 6, z0 - 1, x1 - x0, 1, 1, MAT.stone_foundation);
  signLine(b, 'HIGH WATER SEPT 21 1938', x0 + 12, FY + 6.3, z0 - 1.05, 0, { bg: '#2a2a2e', fg: '#f0ece0', border: '#2a2a2e', scale: 0.32 });
  readAt(b, x0 + 12, FY + 5, z0 - 1, 0, 'High water mark', 'HIGH WATER - SEPTEMBER 21, 1938\nThe storm surge of the Great Hurricane stood at this line for two hours.\nThe Custom House was the only building on this block that did not lose its doors:\nthey were made in 1859 to keep out smugglers, and they kept out the sea.', 2.4);
  doorway(f, cx - 4, FY, z0, 8, 12, { frame: MAT.granite, t: 2, transom: true, step: false });
  const wo = { t: 2, frame: MAT.granite, lintelWide: true };
  for (const x of [x0 + 6, x0 + 16, x1 - 21, x1 - 11]) { win(f, x, FY + 3, z0, 5, 9, wo); win(f, x, FY + FH + 3, z0, 5, 9, wo); }
  win(f, cx - 3, FY + FH + 3, z0, 6, 9, wo);
  for (let z = z0 + 8; z < z1 - 6; z += 14) { winSide(f, 3, z, FY + 3, x0, 5, 9, wo); winSide(f, 1, z, FY + 3, x1, 5, 9, wo); winSide(f, 3, z, FY + FH + 3, x0, 5, 9, wo); winSide(f, 1, z, FY + FH + 3, x1, 5, 9, wo); }
  // sign on posts out front
  f.box(x0 + 2, 0, 4, 1, 7, 1, MAT.wood_post); f.box(x0 + 20, 0, 4, 1, 7, 1, MAT.wood_post);
  f.box(x0 + 2, 3, 3, 19, 4, 1, MAT.sign_navy);
  signLine(b, 'JUNIPER BAY MARITIME MUSEUM', x0 + 11.5, 5.3, 2.95, 0, { bg: '#1f2f4f', fg: '#f0e2b0', border: '#1f2f4f', scale: 0.33 });
  signLine(b, 'OPEN 10 TO 5 - ADULTS 10 CENTS', x0 + 11.5, 3.6, 2.95, 0, { bg: '#1f2f4f', fg: '#f0ece0', border: '#1f2f4f', scale: 0.28 });
  b.prop('anchor', x0 + 30, 0, 8, 0, { scale: 1.4 });
  readAt(b, x0 + 30, 2, 8, 0, 'The anchor', 'BOWER ANCHOR of the bark CYGNET of Juniper Bay, lost in 1871 off Pollock Rip\nand hauled up in a dragger\'s net in 1949 by the Castellano boat SANTA ROSALIA.', 2.2);
  // interior
  const IX0 = x0 + 2, IX1 = x1 - 2, IZ0 = z0 + 2, IZ1 = z1 - 2, BZ = IZ1 - 18, y2 = FY + FH;
  f.box(IX0, FY - 1, IZ0, IX1 - IX0, 1, IZ1 - IZ0, MAT.floor_marble);
  partitionX(f, IX0, IX1, FY, BZ, FH - 1, MAT.plaster_cream, [{ at: IX0 + 14, w: 6 }, { at: IX1 - 20, w: 6 }]);
  partitionZ(f, BZ + 1, IZ1, FY, cx, FH - 1, MAT.plaster_cream, []);
  partitionX(f, IX0, IX1, y2, BZ, FH - 1, MAT.plaster_cream, [{ at: IX0 + 14, w: 4 }, { at: IX1 - 20, w: 4 }]);
  partitionZ(f, IZ0, BZ, y2, cx, FH - 1, MAT.plaster_cream, [{ at: IZ0 + 10, w: 4 }]);
  const hall = b.room('Great Hall', IX0, FY, IZ0, IX1 - IX0, FH - 1, BZ - IZ0, { lightMode: 'always', kind: 'hall' });
  const whale = b.room('Whaling Room', IX0, FY, BZ + 1, cx - IX0, FH - 1, IZ1 - BZ - 1, { lightMode: 'always' });
  const stairH = b.room('Stair Hall', cx + 1, FY, BZ + 1, IX1 - cx - 1, FH - 1, IZ1 - BZ - 1, { lightMode: 'always' });
  const coll = b.room("Collector's Office (1859)", IX0, y2, IZ0, cx - IX0, FH - 1, BZ - IZ0, { lightMode: 'always' });
  const dive = b.room('Diving & Salvage', cx + 1, y2, IZ0, IX1 - cx - 1, FH - 1, BZ - IZ0, { lightMode: 'always' });
  const storm = b.room('The Hurricane of 1938', IX0, y2, BZ + 1, IX1 - IX0, FH - 1, IZ1 - BZ - 1, { lightMode: 'always' });
  const ent = b.entrance(hall, cx - 2, FY, z0, { outZ: z0 - 16, outY: 0, leaf: 'door_wood', tint: '#3a2a1a', main: true });
  b.door(null, null, cx + 2, FY, z0, { leaf: 'door_wood', tint: '#3a2a1a' });
  b.door(hall, whale, IX0 + 17, FY, BZ, { leaf: false });
  b.door(hall, stairH, IX1 - 17, FY, BZ, { leaf: false });
  b.door(storm, coll, IX0 + 16, y2, BZ, { leaf: 'door_wood' });
  b.door(storm, dive, IX1 - 18, y2, BZ, { leaf: 'door_wood' });
  b.door(coll, dive, cx, y2, IZ0 + 12, { axis: 'z', leaf: false });
  stairs(f, cx + 3, FY, IZ1 - 5, '+x', FH, { w: 4, run: 1, mat: MAT.wood_dark, rail: false });
  b.stairs(stairH, [cx + 2, FY, IZ1 - 3], storm, [cx + 4 + FH, y2, IZ1 - 3]);
  const label = (x, y, z, rot, title, body) => { signLine(b, title.toUpperCase().slice(0, 30), x, y, z, rot, { bg: '#e8e0c8', fg: '#2a2a2e', border: '#8a6a48', scale: 0.26 }); readAt(b, x, y + 1, z, rot, title, body, 2.2); };
  // Great Hall exhibits
  const hz = (IZ0 + BZ) / 2;
  b.prop('ship_model_case', cx - 14, FY, hz - 6, 0, {}); label(cx - 14, FY + 1, hz - 8.5, 0, 'The schooner JUNIPER', 'THE SCHOONER JUNIPER, 1846\nBuilt at Essex, 98 tons. Capt. Elias Whitcomb, master and owner.\nIn October 1851, running for Boston ahead of a northeast gale, he found this cove\nand rode out the storm under Juniper Hill. He came back in 1853 with eleven families.\nModel made by Capt. Whitcomb himself in his last winter, 1888.');
  b.prop('ship_model_case', cx + 14, FY, hz - 6, 0, {}); label(cx + 14, FY + 1, hz - 8.5, 0, 'Minesweeper YMS-412', 'U.S. NAVY MOTOR MINESWEEPER YMS-412\nOne of eleven wooden minesweepers built at Bayside Boat Works, 1942 - 1944.\nLaunched by Mrs. Eleanor Pemberton, April 1943. Swept the approaches to Cherbourg, 1944.\nBuilder\'s half-model, given by the Boat Works.');
  b.prop('ship_model_case', cx - 14, FY, hz + 8, 2, {}); label(cx - 14, FY + 1, hz + 10.5, 2, 'The trawler SANTA ROSALIA', 'THE STERN TRAWLER SANTA ROSALIA, 1948\nCastellano Fish Co. The first diesel dragger in the fleet.\nBlessed by Father Garrity at the Blessing of the Fleet every June since.\nModel carved by Sal Castellano Jr. in 1951 - in Korea, from an ammunition crate.');
  // figurehead
  f.box(IX0 + 2, FY, hz - 4, 6, 3, 8, MAT.wood_dark);
  b.prop('figurehead', IX0 + 5, FY + 3, hz, 1, {});
  label(IX0 + 9, FY + 1, hz, 1, 'Figurehead of the NORA CREINA', 'FIGUREHEAD: "THE LADY"\nFrom the barque NORA CREINA of Cork, which brought the statue of St. Brigid\nand thirty Irish families to Juniper Bay in 1882. Broken up at Pier 2, 1897.\nThe Hallorans say their grandmother is the only woman who ever kissed her.');
  // lighthouse lens
  const lx = IX1 - 10, lz = hz;
  f.box(lx - 4, FY, lz - 4, 8, 2, 8, MAT.wood_dark);
  for (let k = 0; k < 7; k++) { f.cylinder(lx, FY + 2 + k * 2, lz, 3.2 - Math.abs(k - 3) * 0.35, 1, MAT.glass, 1); f.cylinder(lx, FY + 3 + k * 2, lz, 3.4 - Math.abs(k - 3) * 0.35, 1, MAT.trim_gold, 1); }
  f.box(lx - 1, FY + 7, lz - 1, 2, 2, 2, MAT.lighthouse_lamp);
  f.dome(lx, FY + 16, lz, 2.6, MAT.trim_gold);
  label(lx - 5, FY + 1, lz, 3, 'Fourth-order Fresnel lens', 'FOURTH-ORDER FRESNEL LENS\nMade by Henry-Lepaute, Paris, 1867. Lit Whitcomb Point Light from 1868 until 1931,\nwhen the station was electrified and given a new lens.\nKeeper Amos Fisk polished it every morning for ten years and asked that it come here,\n"where somebody will still look at it."\nFixed white light, visible fourteen miles.');
  b.prop('bell_brass', IX1 - 3, FY + 6, IZ0 + 4, 3, {});
  b.prop('ships_wheel_wall', IX0 + 0.6, FY + 6, IZ0 + 8, 1, {});
  b.prop('anchor_display', cx, FY, IZ0 + 5, 0, {});
  label(cx, FY + 1, IZ0 + 2.5, 0, 'Welcome', 'JUNIPER BAY MARITIME MUSEUM\nin the Old Custom House, 1859 - 1913 (Collector\'s office closed when the port\nwas made part of the Boston district). Opened as a museum in 1931\nby the Juniper Bay Historical Society, Miss Augusta Whitcomb, founder.\n\nGround floor: the fleet, the lights, the JUNIPER, and the MARY ELLEN.\nUpstairs: the Collector\'s office as it was, diving & salvage, and the Hurricane of 1938.');
  // the MARY ELLEN memorial exhibit on the back wall of the Great Hall
  {
    const mz = BZ - 1, mx0 = cx - 14, mx1 = cx + 14, my = FY + 4;
    f.box(mx0 - 1, my - 1, mz, mx1 - mx0 + 2, 10, 1, MAT.wood_dark);
    f.box(mx0, my, mz, mx1 - mx0, 8, 1, MAT.plaster_gray);
    f.box(mx0, my, mz, mx1 - mx0, 3, 1, MAT.sign_navy);
    f.box(mx0 + 8, my + 3, mz, 11, 2, 1, MAT.sign_black); f.box(mx0 + 11, my + 5, mz, 1, 3, 1, MAT.wood_dark); f.box(mx0 + 15, my + 5, mz, 1, 3, 1, MAT.wood_dark);
    f.box(mx0 + 9, my + 5, mz, 2, 2, 1, MAT.canvas_white); f.box(mx0 + 12, my + 5, mz, 3, 3, 1, MAT.canvas_white);
    tablet(b, ['THE SCHOONER MARY ELLEN', 'LOST OFF GANNET LEDGE', 'IN THE GREAT GALE OF OCTOBER 1867', 'WITH ALL ELEVEN HANDS'], cx, my - 0.3 + 0.2, mz - 0.05, 0, { scale: 0.3, bg: '#2a2a2e', fg: '#e8e0c8', border: '#2a2a2e' });
    b.prop('display_case_museum', cx, FY, BZ - 5, 0, {});
    b.prop('candle_stand', mx1 + 3, FY, BZ - 3, 0, { scale: 0.7 });
    readAt(b, cx, FY + 5, BZ - 3, 0, 'The MARY ELLEN', 'THE SCHOONER MARY ELLEN\n62 tons, built at Juniper Bay 1859 by Jonas Beal\'s sons. Capt. Josiah Dunmore, master.\nSailed for the Georges Bank October 9, 1867. Lost with all hands off Gannet Ledge\nin the Great Gale of October 13 - 14, 1867. Nothing came ashore but a hatch cover\nand a boy\'s mitten. They were:\n\n' + MARY_ELLEN.join('\n') + '\n\nIn the case: the hatch cover; the mitten, knitted for Isaiah Snow, the cabin boy, aged 14;\nand the letter the widows wrote to the Selectmen in 1868 asking for a stone on the quay\n"so that when the boats come in, our men are counted with them."\nThe stone stands on the quay today.');
    framed(b, 'portrait', cx + 18, FY + 7, BZ - 0.6, 0, 'Capt. Josiah Dunmore', 'Captain Josiah Dunmore (1826 - 1867), master of the MARY ELLEN. Daguerreotype, 1860.\nHis son Nathaniel sailed with him as mate. Their stones in the town cemetery mark empty graves.');
  }
  // whaling room
  const wz = (BZ + IZ1) / 2;
  b.prop('harpoons_rack', IX0 + 0.6, FY, wz, 1, {});
  f.cylinder(IX0 + 12, FY, wz, 3, 3, MAT.iron, 1); f.cylinder(IX0 + 12, FY, wz, 2, 1, MAT.iron);
  label(IX0 + 12, FY + 1, wz - 4, 0, 'Try-pot', 'TRY-POT from the whaling bark CYGNET (1855 - 1871).\nJuniper Bay sent out four whalers before the war; the last came home in 1871.\nThe blubber was boiled down in this pot on deck, and it smelled, said one hand,\n"like the Devil frying doughnuts."');
  b.prop('display_case_museum', cx - 6, FY, wz + 3, 2, {});
  label(cx - 6, FY + 1, wz + 5.5, 2, 'Scrimshaw', 'SCRIMSHAW: sperm-whale teeth engraved by the crew of the CYGNET, 1868 - 1870.\nThe largest shows Juniper Bay from the sea: the Custom House, the chapel,\nand Whitcomb Point Light, lit, with every window drawn.');
  // upstairs: the Collector's office as it was
  const ox = (IX0 + cx) / 2;
  b.prop('desk_rolltop', ox, y2, IZ0 + 3, 2, {}); b.prop('chair_wood', ox, y2, IZ0 + 6, 0, {});
  b.prop('bookshelf', IX0 + 2, y2, IZ0 + 12, 1, {}); b.prop('clock_grandfather', cx - 2, y2, IZ0 + 3, 3, {});
  b.prop('safe_small', IX0 + 2, y2, BZ - 3, 1, {}); b.prop('portrait', ox, y2 + 7, IZ0 + 0.6, 2, { tint: '#3a3a4a' });
  readAt(b, ox, y2 + 4, IZ0 + 3, 2, 'Collector\'s ledger, 1860', 'IMPOST BOOK, PORT OF JUNIPER BAY, 1860 (open)\n\nApr. 3  Sch. MARY ELLEN, Dunmore, from La Have, N.S.: 400 qtls. dry cod. Duty $31.00\nApr. 19  Brig ORIOLE, Crowell, from Cadiz: salt, 140 hhds. Duty $88.20\nMay 2  Bark CYGNET, Doyle, from the Pacific: 1,100 bbls. sperm oil. (No duty. Home port.)\nMay 30  Sch. JUNIPER, Whitcomb, from Boston: nails, window glass, a church bell (for the chapel).\n        Duty on the bell remitted by order of the Collector, "it being for the Lord."', 2.2);
  b.prop('diving_helmet', (cx + IX1) / 2, y2 + 3, IZ0 + 6, 2, {});
  f.box(Math.round((cx + IX1) / 2) - 2, y2, IZ0 + 4, 4, 3, 4, MAT.wood_dark);
  readAt(b, (cx + IX1) / 2, y2 + 4, IZ0 + 8, 0, 'Diving helmet', 'MARK V DIVING HELMET, U.S. Navy pattern, used by the Bayside salvage crew 1938 - 1949.\nIn October 1938 diver Lucien Tremblay went down eleven times at Pier 3\nto free the boats sunk at their moorings by the hurricane.', 2.2);
  b.prop('globe_desk', IX1 - 3, y2, BZ - 3, 3, {}); b.prop('easel', cx + 6, y2, BZ - 4, 0, {});
  // the 1938 hurricane room
  for (let x = IX0 + 6; x < IX1 - 4; x += 12) framed(b, 'photo_frames', x, y2 + 6, IZ1 - 0.6, 0, null, null);
  f.box(IX0, y2 + 5, IZ1 - 1, IX1 - IX0, 1, 1, MAT.sign_blue);
  readAt(b, cx, y2 + 5, IZ1 - 1, 0, 'The Hurricane of 1938', 'THE GREAT NEW ENGLAND HURRICANE - SEPTEMBER 21, 1938\n\nNo warning came. At 3:30 in the afternoon the wind backed east and the sea rose.\nBy five o\'clock Harbor Street was under six feet of water; Pier 3 went out whole,\nwith the harbormaster\'s shed, and three men were lost:\nLt. Daniel Fisk and Pvt. Owen Doyle of Engine Co. No. 1, and Joseph Silva, fisherman.\nThe elms of Elm Street fell in a night. The Light never went out.\n\nThe blue line on this wall is the height of the water in the Custom House: 5 ft. 2 in.\n\nPhotographs: Lowell Photography Studio. "A rowboat on Market Street."\n"The Whitcomb Hotel from the bandstand." "Keeper Fisk at the lantern, morning."', 2.8);
  // staff
  const cur = b.spot('stand', cx + 6, FY, IZ0 + 6, 0, { room: hall, act: 'talk', tags: ['docent'] });
  const cur2 = b.spot('stand', (cx + IX1) / 2, y2, IZ0 + 12, 3, { room: dive, act: 'look', tags: ['docent'] });
  b.job('curator', [cur, cur2], { shift: ['9:45', '17:15'], title: 'museum curator' });
  for (const [x, z, r] of [[cx - 14, hz - 11, 2], [lx - 7, lz, 1], [cx, BZ - 8, 2], [cx - 14, hz + 13, 0]]) b.spot('stand', x, FY, z, r, { room: hall, act: 'look', tags: ['browse', 'museum'], label: 'At the Maritime Museum' });
  linkToSidewalk(ctx, ent);
  void whale; void coll; void storm;
  return b;
}

// =====================================================================================
// CARNEGIE LIBRARY (1911) — with the Historical Society's "100 Years of Juniper Bay"
// =====================================================================================
function buildLibrary(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'Carnegie Library', kind: 'library', lot, address: lot.address, established: spec.est || 1911,
    lore: 'Beaux-Arts limestone, 1911, a gift of Andrew Carnegie. Librarian: Miss Harriet Mayhew, since 1927.', hours: [9 * 60, 17 * 60] });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('lib' + lot.x);
  const x0 = 8, x1 = W - 8, z0 = 26, z1 = Math.min(D - 14, 100), FY = 5, H = 22, cx = Math.round(W / 2);
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(cx - 8, -1, 0, 16, 1, z0, MAT.sidewalk);
  f.box(x0, 0, z0, x1 - x0, FY, z1 - z0, MAT.limestone);
  shell(f, x0, FY, z0, x1 - x0, H, z1 - z0, MAT.limestone, MAT.plaster_cream, 2);
  f.box(x0, 1, z0 - 1, x1 - x0, 1, 1, MAT.granite);
  f.box(x0, FY + H, z0, x1 - x0, 1, z1 - z0, MAT.roof_copper);
  f.walls(x0, FY + H + 1, z0, x1 - x0, 2, z1 - z0, MAT.limestone, 1);
  cornice(f, x0, FY + H - 1, x1 - x0, MAT.limestone, { z: z0, dentils: true });
  // central pavilion with four columns, pediment, lettering, steps
  const px0 = cx - 18, px1 = cx + 18, pz = z0 - 10;
  f.box(px0 - 2, 0, pz, px1 - px0 + 4, FY, z0 - pz, MAT.limestone);
  for (let k = 0; k < FY; k++) f.box(px0, 0, pz - 2 * (FY - k), px1 - px0, k + 1, 2, MAT.granite);
  for (const x of [px0 + 3, px0 + 12, px1 - 12, px1 - 3]) { f.cylinder(x, FY, pz + 3, 2.1, H - 3, MAT.limestone); f.cylinder(x, FY + H - 4, pz + 3, 2.8, 1, MAT.limestone); f.box(Math.round(x) - 3, FY + H - 4, pz + 2, 6, 1, 2, MAT.limestone); }
  f.box(px0 - 2, FY + H - 3, pz, px1 - px0 + 4, 4, z0 - pz + 1, MAT.limestone);
  f.text('CARNEGIE LIBRARY', cx, FY + H - 2, pz - 1, MAT.trim_dark, { align: 'center', font: 'small' });
  for (let i = 0; i < 7; i++) f.box(px0 - 2 + 3 * i, FY + H + 1 + i, pz, px1 - px0 + 4 - 6 * i, 1, z0 - pz + 1, MAT.limestone);
  f.text('1911', cx, FY + H + 2, pz - 1, MAT.trim_dark, { align: 'center', font: 'small' });
  doorway(f, cx - 4, FY, z0, 8, 12, { frame: MAT.limestone, t: 2, transom: true, step: false });
  f.text('FREE TO ALL', cx, FY + 15, z0 - 1, MAT.trim_dark, { align: 'center', font: 'small' });
  // the dome over the rotunda (skylit)
  const rz = z0 + 26;
  f.cylinder(cx, FY + H + 1, rz, 13, 6, MAT.limestone, 2);
  f.dome(cx, FY + H + 7, rz, 13, MAT.roof_copper, { heightScale: 0.75, hollow: true });
  f.cylinder(cx, FY + H + 15, rz, 3, 1, MAT.glass);
  f.cylinder(cx, FY + H + 16, rz, 2, 3, MAT.roof_copper, 1); f.box(cx, FY + H + 19, rz, 1, 3, 1, MAT.trim_gold);
  f.carve(cx - 10, FY + H, rz - 10, 20, 1, 20); f.cylinder(cx, FY + H, rz, 12, 1, MAT.plaster_cream, 1.2);
  for (const x of [x0 + 6, x0 + 18, x1 - 23, x1 - 11]) win(f, x, FY + 5, z0, 5, 13, { t: 2, frame: MAT.limestone, style: 'arch', glass: MAT.glass });
  for (let z = z0 + 10; z < z1 - 6; z += 14) { winSide(f, 3, z, FY + 5, x0, 5, 13, { t: 2, frame: MAT.limestone, style: 'arch' }); winSide(f, 1, z, FY + 5, x1, 5, 13, { t: 2, frame: MAT.limestone, style: 'arch' }); }
  for (const x of [px0 - 6, px1 + 6]) b.prop('street_lamp', x, FY, pz + 2, 0, { scale: 0.8 });
  // interior
  const IX0 = x0 + 2, IX1 = x1 - 2, IZ0 = z0 + 2, IZ1 = z1 - 2, LX0 = cx - 14, LX1 = cx + 14, BZ = IZ1 - 22;
  f.box(IX0, FY - 1, IZ0, IX1 - IX0, 1, IZ1 - IZ0, MAT.floor_oak);
  f.cylinder(cx, FY - 1, rz, 11, 1, MAT.floor_marble); f.cylinder(cx, FY - 1, rz, 4, 1, MAT.floor_checker);
  partitionZ(f, IZ0, BZ, FY, LX0, H - 1, MAT.plaster_cream, [{ at: rz - 4, w: 8, h: 12 }]);
  partitionZ(f, IZ0, BZ, FY, LX1, H - 1, MAT.plaster_cream, [{ at: rz - 4, w: 8, h: 12 }]);
  partitionX(f, IX0, IX1, FY, BZ, H - 1, MAT.plaster_cream, [{ at: cx - 22, w: 6 }, { at: cx + 16, w: 6 }]);
  partitionZ(f, BZ + 1, IZ1, FY, cx, H - 1, MAT.plaster_cream, [{ at: BZ + 6, w: 4 }]);
  const rot = b.room('Rotunda & Delivery Hall', LX0 + 1, FY, IZ0, LX1 - LX0 - 1, H + 14, BZ - IZ0, { lightMode: 'always', kind: 'hall', nav: [cx, IZ0 + 6] });
  const read = b.room('Reading Room', IX0, FY, IZ0, LX0 - IX0, H - 1, BZ - IZ0, { lightMode: 'always', lightColor: [0.9, 1, 0.85] });
  const kids = b.room("Children's Room", LX1 + 1, FY, IZ0, IX1 - LX1 - 1, H - 1, BZ - IZ0, { lightMode: 'always' });
  const stacks = b.room('The Stacks', IX0, FY, BZ + 1, cx - IX0, H - 1, IZ1 - BZ - 1, { lightMode: 'always' });
  const hist = b.room('Historical Society Room', cx + 1, FY, BZ + 1, IX1 - cx - 1, H - 1, IZ1 - BZ - 1, { lightMode: 'always' });
  const ent = b.entrance(rot, cx - 2, FY, z0, { outZ: pz - 12, outY: 0, leaf: 'door_wood', tint: '#3a2a1a', main: true });
  b.door(null, null, cx + 2, FY, z0, { leaf: 'door_wood', tint: '#3a2a1a' });
  b.door(rot, read, LX0, FY, rz, { axis: 'z', leaf: false });
  b.door(rot, kids, LX1, FY, rz, { axis: 'z', leaf: false });
  b.door(rot, stacks, cx - 19, FY, BZ, { leaf: false });
  b.door(rot, hist, cx + 19, FY, BZ, { leaf: false });
  b.door(stacks, hist, cx, FY, BZ + 8, { axis: 'z', leaf: 'door_wood' });
  // rotunda: circulation desk, card catalog, the Carnegie portrait
  f.cylinder(cx, FY, rz + 2, 6, 4, MAT.wood_dark, 1.2); f.carve(cx - 2, FY, rz - 4, 4, 4, 3);
  f.cylinder(cx, FY + 4, rz + 2, 6.4, 1, MAT.wood_mid, 1.6);
  const libDesk = b.spot('stand', cx, FY, rz + 3, 0, { room: rot, act: 'counter', tags: ['librarian'], label: 'At the circulation desk' });
  b.prop('lamp_desk', cx + 3, FY + 5, rz - 1, 0, { tint: '#2f6a3a' }); b.prop('books_stack', cx - 3, FY + 5, rz - 1, 0, {});
  for (const x of [LX0 + 2, LX1 - 5]) { f.box(x, FY, IZ0 + 3, 3, 6, 10, MAT.wood_light); for (let yy = FY + 1; yy < FY + 6; yy += 1) f.box(x + (x < cx ? 3 : -1), yy, IZ0 + 3, 1, 1, 10, yy % 2 ? MAT.wood_mid : MAT.trim_gold); }
  readAt(b, LX0 + 5, FY + 4, IZ0 + 8, 1, 'Card catalog', 'CARD CATALOG - drawer "WHI - WIN" pulled half open:\n\nWhitcomb, Augusta. "A Hundred Years by the Sea: Juniper Bay 1853 - 1953." (1953) 974.4 W\nWhitcomb, Elias. "Log of the Schooner JUNIPER, 1846 - 1853." MS. (Ask at desk.)\nWhitman, Walt. "Leaves of Grass." 811 W  (3 copies; 1 missing since 1931)\nWilder, Thornton. "Our Town." 812 W\nWilliams, Ben Ames. "Come Spring." F WIL  (reserve list: 9 names)', 2.2);
  b.prop('portrait', cx, FY + 12, IZ0 + 0.6, 2, { tint: '#3a3a2a' });
  readAt(b, cx, FY + 9, IZ0 + 1, 2, 'Portrait of Andrew Carnegie', 'ANDREW CARNEGIE (1835 - 1919)\n"There is not such a cradle of democracy upon the earth as the Free Public Library."\nHe gave $22,500 for this building in 1909, on condition the town maintain it forever.\nIt has. Miss Mayhew sees to that.', 2.4);
  b.prop('chandelier', cx, FY + H + 4, rz, 0, {});
  b.light(cx, FY + H - 2, rz, { mode: 'room', room: rot, radius: 14, color: [1, 0.92, 0.75] });
  b.prop('bench_station', cx - 8, FY, IZ0 + 3, 0, {}); b.prop('bench_station', cx + 8, FY, IZ0 + 3, 0, {});
  const readSpots = [];
  // reading room: two long oak tables with green-shaded lamps
  const rw = LX0 - IX0, rcx = IX0 + rw / 2;
  for (const tz of [IZ0 + 12, IZ0 + 30]) {
    f.box(rcx - 10, FY + 2, tz - 3, 20, 1, 6, MAT.wood_dark);
    for (const [xx, zz] of [[rcx - 9, tz - 2], [rcx + 8, tz - 2], [rcx - 9, tz + 2], [rcx + 8, tz + 2]]) f.box(xx, FY, zz, 1, 2, 1, MAT.wood_dark);
    for (let k = 0; k < 4; k++) {
      const x = rcx - 7.5 + k * 5;
      b.prop('lamp_desk', x, FY + 3, tz, 0, { tint: '#2f6a3a' });
      for (const [dz, r] of [[-5.2, 2], [5.2, 0]]) { b.prop('chair_wood', x, FY, tz + dz, r, { tint: '#5a3a24' }); readSpots.push(b.spot('sit', x, FY, tz + dz, r, { room: read, act: rng.pick(['read_book', 'read', 'read_book', 'write']), tags: ['read_book', 'library'], seat: 0.45, label: 'Reading at the Carnegie Library' })); }
      if (k % 2 === 0) b.prop('books_stack', x + 1.5, FY + 3, tz - 1.2, 0, {});
    }
  }
  for (let z = IZ0 + 3; z < BZ - 3; z += 5) b.prop('bookshelf', IX0 + 1.2, FY, z, 1, {});
  b.prop('magazine_rack', rcx, FY, BZ - 2, 0, {}); b.prop('newspaper_pile', rcx + 4, FY, BZ - 2, 0, {});
  b.prop('fire_logs', rcx, FY, IZ0 + 1.5, 2, {});
  b.prop('clock_wall', rcx, FY + 12, BZ - 0.6, 0, {});
  readAt(b, rcx, FY + 5, BZ - 1, 0, 'Newspaper rack', 'ON THE RACK TODAY\nThe Juniper Bay Courier (Sat. Sept. 26): "HARBOR DAYS! TOWN TURNS 100"\nThe Boston Globe: "Ike Signs Korea Aid Bill"; "Bosox Split with Yankees"\nThe Saturday Evening Post; Life ("The Coronation in Color"); National Geographic;\nYankee Magazine; The Atlantic Fisherman.\n\nPlease return newspapers to the rack. - H.M.', 2.2);
  // children's room
  const kx = LX1 + 1 + (IX1 - LX1 - 1) / 2;
  b.prop('rug_oval', kx, FY, IZ0 + 14, 0, { tint: '#3a6a8a', scale: 1.8 });
  for (let k = 0; k < 6; k++) { const a = k / 6 * 2 * PI; const x = kx + Math.cos(a) * 5, z = IZ0 + 14 + Math.sin(a) * 4; const s2 = b.spot('sit', x, FY, z, 0, { room: kids, act: 'read_book', tags: ['read_book', 'story_hour'], seat: 0.05, label: 'Story hour' }); s2.yaw = Math.atan2(...f.dir(kx - x, IZ0 + 14 - z)); readSpots.push(s2); }
  b.prop('rocking_chair', kx, FY, IZ0 + 8, 2, {});
  for (const z of [IZ0 + 26, IZ0 + 34]) { b.prop('table_card', kx, FY, z, 0, {}); for (const dx of [-2.2, 2.2]) b.prop('chair_kitchen', kx + dx, FY, z, dx < 0 ? 1 : 3, { tint: '#e0b030', scale: 0.8 }); }
  for (let z = IZ0 + 3; z < BZ - 3; z += 5) b.prop('bookshelf_low', IX1 - 1, FY, z, 3, {});
  b.prop('dollhouse', IX1 - 3, FY, BZ - 3, 3, {}); b.prop('school_globe', LX1 + 3, FY, BZ - 3, 0, {});
  b.prop('teddy_bear', kx + 5, FY, IZ0 + 20, 0, {});
  readAt(b, kx, FY + 5, IZ0 + 1, 2, 'Story hour notice', 'STORY HOUR - SATURDAYS AT 10\nThis week: "Make Way for Ducklings" (Mr. McCloskey)\nand "The Little House" (Miss Burton).\nNext week: "Charlotte\'s Web," a new book by Mr. E. B. White. Ask Miss Mayhew.\n\nCentennial Reading Club: 100 books by Christmas and your name goes in the time capsule!', 2.2);
  // the stacks: rows of shelving (world voxels) with a step-stool
  const sw = cx - IX0;
  for (let x = IX0 + 3; x < cx - 3; x += 5) { f.box(x, FY, BZ + 4, 2, 9, IZ1 - BZ - 8, MAT.wood_mid); f.box(x - 1, FY + 1, BZ + 4, 1, 7, IZ1 - BZ - 8, MAT.bookshelf_books); f.box(x + 2, FY + 1, BZ + 4, 1, 7, IZ1 - BZ - 8, MAT.bookshelf_books); for (let yy = FY + 2; yy < FY + 9; yy += 2) { f.box(x - 1, yy, BZ + 4, 1, 1, IZ1 - BZ - 8, MAT.wood_mid); f.box(x + 2, yy, BZ + 4, 1, 1, IZ1 - BZ - 8, MAT.wood_mid); } }
  const shelve = b.spot('stand', IX0 + 5.5, FY, BZ + 10, 2, { room: stacks, act: 'shelve', tags: ['librarian'] });
  void sw;
  // Historical Society: "100 Years of Juniper Bay" — panels drawn from the town's timeline
  const hx0 = cx + 1, hx1 = IX1, hz0 = BZ + 1, hz1 = IZ1;
  signLine(b, '100 YEARS OF JUNIPER BAY', (hx0 + hx1) / 2, FY + 12, hz1 - 0.6, 0, { bg: '#2a4a6a', fg: '#f0e2b0', border: '#c9a24a', scale: 0.6 });
  const decades = [];
  for (const [yr, txt] of TIMELINE) { const k = yr < 1860 ? 'Before 1860' : yr < 1880 ? '1860 - 1879' : yr < 1900 ? '1880 - 1899' : yr < 1915 ? '1900 - 1914' : yr < 1930 ? '1915 - 1929' : yr < 1940 ? '1930 - 1939' : '1940 - 1953'; let d = decades.find((q) => q.k === k); if (!d) { d = { k, items: [] }; decades.push(d); } d.items.push(`${yr}: ${txt}`); }
  const wallSpots = [];
  for (let i = 0; i < decades.length; i++) {
    const t = i / Math.max(1, decades.length - 1);
    // along the back wall, then the right wall
    let x, z, r;
    if (i < 4) { x = hx0 + 5 + i * ((hx1 - hx0 - 10) / 3); z = hz1 - 0.6; r = 0; } else { x = hx1 - 0.6; z = hz0 + 4 + (i - 4) * 5; r = 3; }
    void t;
    b.prop('photo_frames', x, FY + 6, z, r, {});
    signLine(b, decades[i].k, x + (r === 3 ? -0.1 : 0), FY + 9.5, z, r, { bg: '#e8e0c8', fg: '#2a2a2e', border: '#8a6a48', scale: 0.32 });
    readAt(b, x, FY + 6, z, r, `100 Years of Juniper Bay: ${decades[i].k}`, 'JUNIPER BAY HISTORICAL SOCIETY - CENTENNIAL EXHIBIT\n' + decades[i].k.toUpperCase() + '\n\n' + decades[i].items.join('\n\n'), 2.2);
    wallSpots.push([x, z, r]);
  }
  b.prop('display_case_museum', (hx0 + hx1) / 2 - 5, FY, (hz0 + hz1) / 2, 0, {});
  readAt(b, (hx0 + hx1) / 2 - 5, FY + 4, (hz0 + hz1) / 2, 0, 'Case: relics of the founding', 'IN THIS CASE\n- The log of the schooner JUNIPER, open at October 14, 1851:\n  "Anchored in a cove under a hill of junipers. Holding ground good. Shall return."\n- Mercy Whitcomb\'s receipt book (1850), open at Mince Pie\n- The first Town Meeting warrant, 1853, nailed to the salt-house door\n- A brick from Beal\'s livery, where the Great Fire of 1902 began\n- A striker\'s union button, July 1934 ("A NICKEL AND RESPECT")\n- A ration book, 1943, belonging to Tommy Halloran\'s grandmother\n\nLent by Miss Augusta Whitcomb and the families of Juniper Bay.', 2.4);
  b.prop('display_case_museum', (hx0 + hx1) / 2 + 6, FY, (hz0 + hz1) / 2, 0, {});
  readAt(b, (hx0 + hx1) / 2 + 6, FY + 4, (hz0 + hz1) / 2, 0, 'Case: the peoples of Juniper Bay', 'THE PEOPLES OF JUNIPER BAY\nThe English of the first eleven houses (1853). The Irish who laid the railroad (1880).\nThe Portuguese of the south wharves (1891). The Sicilians of the fishing fleet (1894).\nThe Polish families of the cannery (1908). The Jewish tailors and merchants of Market Street (1905).\nThe Lee family of the laundry (1911). The Freemans, from Virginia (1919).\nThe Greeks of the Harbor Light Diner (1920). The French-Canadians of the mills (1920s).\n\n"A town is not its buildings. It is the people who keep coming back." - A. Whitcomb', 2.4);
  for (const [x, z, r] of wallSpots.slice(0, 3)) b.spot('stand', x - R4[r][0] * -3 + R4[r][0] * 3, FY, z + R4[r][1] * 3, (r + 2) % 4, { room: hist, act: 'read_stand', tags: ['browse', 'library'], label: 'At the centennial exhibit' });
  // jobs
  b.job('librarian', [libDesk, shelve], { shift: ['8:45', '17:15'], title: 'librarian', sex: 'F' });
  b.job('assistant librarian', [b.spot('stand', rcx, FY, BZ - 4, 0, { room: read, act: 'shelve', tags: ['librarian'] }), libDesk], { shift: ['9:00', '13:00'], title: 'library page', age: [15, 25] });
  f.box(x0 + 2, FY, z0 - 1, 10, 4, 1, MAT.granite);
  signLine(b, 'A.D. 1911', x0 + 7, FY + 1.4, z0 - 1.05, 0, { bg: '#8e8b87', fg: '#1c1c20', border: '#8e8b87', scale: 0.4 });
  b.prop('tree_elm_yellow', 10, 0, 12, 0, { cat: 'far' }); b.prop('tree_maple_red', W - 10, 0, 12, 0, { cat: 'far' });
  b.prop('bench_park', px0 - 10, 0, 10, 0, {}); b.prop('bench_park', px1 + 10, 0, 10, 0, {});
  linkToSidewalk(ctx, ent);
  void readSpots;
  return b;
}

// =====================================================================================
// JUNIPER PARK — the WPA bandstand, the duck pond, the nine oaks
// =====================================================================================
function buildPark(ctx, lot, spec) {
  const b = new Building(ctx, { name: spec.name || 'Juniper Park', kind: 'park', lot, address: 'Juniper Park', established: 1896,
    lore: 'Laid out in 1896 on the old ropewalk. The oaks were planted in 1919 for the nine who did not come home.' });
  const f = b.f, W = lot.w, D = lot.d;
  const rng = ctx.rng.fork('park' + lot.x);
  const cx = Math.round(W / 2), cz = Math.round(D / 2);
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  const pond = { x: Math.round(W * 0.24), z: Math.round(D * 0.3), rx: Math.round(W * 0.13), rz: Math.round(D * 0.12) };
  const inPond = (x, z, pad = 0) => ((x - pond.x) / (pond.rx + pad)) ** 2 + ((z - pond.z) / (pond.rz + pad)) ** 2 < 1;
  const play = { x0: Math.round(W * 0.64), z0: Math.round(D * 0.6), x1: W - 12, z1: D - 34 };
  const chessA = { x0: Math.round(W * 0.66), z0: 22, x1: W - 14, z1: Math.round(D * 0.38) };
  const BR = 14;
  // paths: perimeter loop, diagonals, cross path, ring around the bandstand
  pave(f, 0, 0, W, D, 2, (x, z) => {
    const e = Math.min(x, z, W - x, D - z);
    if (e > 6 && e < 12) return MAT.gravel;
    const r = Math.hypot(x - cx, z - cz);
    if (r > BR + 3 && r < BR + 9) return MAT.gravel;
    if (Math.abs(x - cx) < 3 && e > 6) return MAT.gravel;
    const d1 = Math.abs((x / W) - (z / D)) * Math.min(W, D), d2 = Math.abs((x / W) - (1 - z / D)) * Math.min(W, D);
    if ((d1 < 2.6 || d2 < 2.6) && e > 6 && !inPond(x, z, 4)) return MAT.gravel;
    return null;
  }, -1, null);
  // leaf litter under the trees
  for (let i = 0; i < 26; i++) { const x = rng.int(14, W - 20), z = rng.int(14, D - 20); if (inPond(x, z, 6) || Math.hypot(x - cx, z - cz) < BR + 10) continue; f.box(x, -1, z, rng.int(3, 7), 1, rng.int(3, 7), MAT.leaf_litter); }
  // the duck pond, with an island and a rock rim
  for (let z = pond.z - pond.rz - 3; z <= pond.z + pond.rz + 3; z++) {
    const t = (z + 0.5 - pond.z) / (pond.rz + 2);
    if (Math.abs(t) >= 1) continue;
    const half = (pond.rx + 2) * Math.sqrt(1 - t * t);
    f.box(Math.round(pond.x - half), -1, z, Math.round(half * 2), 1, 1, MAT.rock);
    const t2 = (z + 0.5 - pond.z) / pond.rz;
    if (Math.abs(t2) < 1) { const h2 = pond.rx * Math.sqrt(1 - t2 * t2); f.box(Math.round(pond.x - h2), -2, z, Math.round(h2 * 2), 1, 1, MAT.dirt); f.box(Math.round(pond.x - h2), -1, z, Math.round(h2 * 2), 1, 1, MAT.water); }
  }
  f.cylinder(pond.x + 6, -1, pond.z + 2, 4, 1, MAT.grass); f.cylinder(pond.x + 6, 0, pond.z + 2, 2.5, 1, MAT.rock);
  b.prop('tree_birch', pond.x + 6, 1, pond.z + 2, 0, { cat: 'far', scale: 0.8 });
  for (let i = 0; i < 9; i++) { const a = rng.float(0, 2 * PI), r = rng.float(0.2, 0.8); b.prop('duck', pond.x + Math.cos(a) * pond.rx * r, -0.2, pond.z + Math.sin(a) * pond.rz * r, 0, { yawOffset: rng.float(0, 6.28) }); }
  for (let i = 0; i < 3; i++) b.prop('duck', pond.x + pond.rx + 3 + i * 2, 0, pond.z - 4 + i, 0, { yawOffset: rng.float(0, 6.28) });
  readAt(b, pond.x, 2, pond.z - pond.rz - 4, 0, 'The duck pond', 'THE DUCK POND\nDug in 1896 where the old ropewalk\'s tar pit was. Fed by Juniper Brook.\nThe ducks are mallards, and one domestic white duck named Commodore\nwho arrived in 1949 and has never left. Please feed them bread, not popcorn.\nSkating in winter when the red flag is down.', 2.8);
  // the WPA bandstand (1936)
  f.cylinder(cx, 0, cz, BR + 1, 1, MAT.granite);
  f.cylinder(cx, 1, cz, BR, 3, MAT.granite);
  f.cylinder(cx, 3, cz, BR - 0.5, 1, MAT.floor_oak);
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * 2 * PI; const x = Math.floor(cx + Math.cos(a) * (BR - 1.5)), z = Math.floor(cz + Math.sin(a) * (BR - 1.5)); f.box(x, 4, z, 1, 14, 1, MAT.trim_white); }
  for (let k = 0; k < 32; k++) { const a = k / 32 * 2 * PI; if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) < 0) continue; f.box(Math.floor(cx + Math.cos(a) * (BR - 1)), 4, Math.floor(cz + Math.sin(a) * (BR - 1)), 1, 2, 1, MAT.trim_white); }
  for (let k = 0; k < 6; k++) f.cylinder(cx, 18 + k, cz, BR + 1 - k * 2.4, 1, k % 2 ? MAT.roof_shingle_green : MAT.roof_copper);
  f.cylinder(cx, 24, cz, 2.2, 3, MAT.trim_white, 1); f.dome(cx, 27, cz, 2.5, MAT.roof_copper); f.box(cx, 29, cz, 1, 3, 1, MAT.iron);
  for (let k = 0; k < 3; k++) f.box(cx - BR - 5 + k * 2, 0, cz - 3, 2, k + 1, 6, MAT.granite);
  f.box(cx - BR - 1, 1, cz - 3, 2, 3, 6, MAT.granite); f.carve(cx - BR, 4, cz - 3, 2, 2, 6);
  f.box(cx - 3, 1, cz - BR - 1, 6, 3, 1, MAT.granite_pink);
  plaque(b, 'W.P.A. 1936', cx, 1.8, cz - BR - 1.05, 0, 'THE JUNIPER PARK BANDSTAND\nBuilt 1936 by the Works Progress Administration, Project No. 2-117,\nwith granite from the old Mill Street wall and oak from the Pruitt woodlot.\nForty-one men of Juniper Bay, $1.10 a day, eleven weeks.\n\nFirst concert: July 4, 1936, the Juniper Bay Municipal Band,\n"The Stars and Stripes Forever," twice, by popular demand.\n\n"We built it so that there would be music in hard times." - Casimir Novak, foreman', { scale: 0.45 });
  const bsFloor = b.navPoint(0, cx, 4, cz);
  for (let i = 0; i < 4; i++) { b.prop('music_stand', cx - 4 + i * 2.6, 4, cz - 3, 0, {}); b.prop('band_chair', cx - 4 + i * 2.6, 4, cz - 0.5, 0, {}); }
  // nav grid across the lawn
  const blocked = (x, z) => inPond(x, z, 3) || Math.hypot(x - cx, z - cz) < BR + 2 || (x > play.x0 + 4 && x < play.x1 - 4 && z > play.z0 + 4 && z < play.z1 - 4 && false);
  const grid = outdoorNav(b, 9, 9, W - 9, D - 9, 16, blocked, { edges: ['n', 's', 'e', 'w'] });
  const bsSteps = b.stairs(0, [cx - BR - 7, 0, cz], 0, [cx - BR + 1, 4, cz]);
  ctx.nav.link(bsSteps[1], bsFloor); ctx.nav.link(bsSteps[0], grid.near(cx - BR - 8, cz));
  for (const [x, z] of [[cx - 3, cz + 2], [cx + 2, cz - 4], [cx + 4, cz + 4]]) { const s = b.spot('stand', x, 4, z, rng.int(0, 3), { room: 0, act: rng.pick(['look', 'talk']), tags: ['park'] }); ctx.nav.link(s.node, bsFloor); s.pendingLink = false; }
  // the nine memorial oaks along the south walk
  const oakZ = D - 20;
  WWI_NINE.forEach((q, i) => {
    const x = 22 + i * ((W - 44) / 8);
    b.prop('tree_oak', x, 0, oakZ, 0, { cat: 'far', scale: 1.05 + (i % 3) * 0.05, yawOffset: i * 1.3 });
    f.box(Math.round(x) - 1, 0, oakZ + 4, 2, 1, 1, MAT.granite);
    signLine(b, q[0].replace(/^(Pvt\.|Cpl\.|Lt\.|Seaman|Nurse) /, '').toUpperCase(), x, 0.3, oakZ + 3.95, 0, { bg: '#8e8b87', fg: '#1c1c20', border: '#8e8b87', scale: 0.18 });
  });
  f.box(cx - 3, 0, oakZ - 8, 6, 3, 3, MAT.rock);
  plaque(b, 'THE NINE OAKS', cx, 1, oakZ - 8.05, 0, 'THE NINE OAKS\nPlanted on Armistice Day, November 11, 1919, by the children of Juniper Bay,\none for each of the nine who did not come home from the Great War.\n\n1917 - 212 SERVED - 9 LOST\n\n' + WWI_NINE.map((q) => `${q[0]} - ${q[2]}`).join('\n') + '\n\n"They shall grow not old, as we that are left grow old."', { scale: 0.42 });
  // the playground
  f.box(play.x0, -1, play.z0, play.x1 - play.x0, 1, play.z1 - play.z0, MAT.sand);
  for (let x = play.x0; x < play.x1; x += 8) b.prop('picket_fence', x + 4, 0, play.z0 - 0.5, 0, { scale: 0.7 });
  const pw = play.x1 - play.x0, ph = play.z1 - play.z0;
  const swingX = play.x0 + pw * 0.25, swingZ = play.z0 + ph * 0.3;
  b.prop('swing_set', swingX, 0, swingZ, 0, {});
  b.prop('slide', play.x0 + pw * 0.75, 0, play.z0 + ph * 0.3, 0, {});
  b.prop('seesaw', play.x0 + pw * 0.3, 0, play.z0 + ph * 0.72, 0, {});
  b.prop('sandbox', play.x0 + pw * 0.75, 0, play.z0 + ph * 0.75, 0, {});
  b.prop('merry_go_round', play.x0 + pw * 0.52, 0, play.z0 + ph * 0.52, 0, {});
  const playSpots = [];
  for (const dx of [-3, -1, 1, 3]) playSpots.push(outSpot(b, grid, 'sit', swingX + dx * 1.1, 0, swingZ, 0, { act: 'swing', tags: ['play'], seat: 0.4, label: 'On the swings in Juniper Park' }));
  for (const [fx, fz, act] of [[0.75, 0.42, 'play'], [0.75, 0.2, 'play'], [0.22, 0.72, 'play'], [0.38, 0.72, 'play'], [0.72, 0.75, 'play_ball'], [0.78, 0.78, 'play'], [0.52, 0.4, 'play'], [0.44, 0.6, 'play'], [0.6, 0.6, 'jump_rope'], [0.5, 0.9, 'play_ball']]) {
    const s = outSpot(b, grid, 'stand', play.x0 + pw * fx, 0, play.z0 + ph * fz, rng.int(0, 3), { act, tags: ['play'], label: 'Playing in Juniper Park' }); s.spread = 1.2; playSpots.push(s);
  }
  b.prop('bench_park', play.x0 - 4, 0, play.z0 + ph / 2, 1, {});
  outSpot(b, grid, 'sit', play.x0 - 4, 0, play.z0 + ph / 2, 1, { act: 'knit', tags: ['bench'], seat: 0.45, label: 'Watching the children' });
  b.prop('baby_carriage', play.x0 - 6, 0, play.z0 + ph / 2 + 4, 1, {});
  // drinking fountain
  f.box(play.x0 - 8, 0, play.z0 - 8, 2, 4, 2, MAT.granite); f.box(play.x0 - 8, 4, play.z0 - 8, 2, 1, 2, MAT.chrome);
  // chess tables
  const chess = [];
  for (let i = 0; i < 4; i++) {
    const x = chessA.x0 + 8 + (i % 2) * 20, z = chessA.z0 + 8 + Math.floor(i / 2) * 18;
    b.prop('checkers_table', x, 0, z, 0, { scale: 1.3 });
    for (const [dx, rot] of [[-3.2, 1], [3.2, 3]]) { b.prop('stump', x + dx, 0, z, 0, { scale: 0.8 }); chess.push(outSpot(b, grid, 'sit', x + dx, 0, z, rot, { act: 'chess', tags: ['chess', 'bench'], seat: 0.45, label: 'Playing chess in Juniper Park' })); }
  }
  readAt(b, chessA.x0 + 18, 3, chessA.z0 + 2, 2, 'The chess tables', 'THE CHESS TABLES\nGiven 1947 by the Juniper Bay Workmen\'s Circle.\nChallenge rules: winner stays, loser buys the coffee at the Harbor Light.\nMr. Isaac Adler has held the south table every Saturday since 1947,\nexcept for Yom Kippur and the day of the hurricane of \'49 (there was no hurricane in \'49;\nhe had a cold).', 2.4);
  // benches along the walks
  const benchPlaces = [[cx - 30, 14, 2], [cx + 30, 14, 2], [cx - 30, D - 14, 0], [cx + 30, D - 14, 0], [14, cz + 20, 1], [W - 14, cz - 20, 3], [pond.x - pond.rx - 8, pond.z, 1], [pond.x, pond.z + pond.rz + 8, 0], [pond.x + pond.rx + 8, pond.z + 8, 3], [cx - BR - 14, cz + 14, 1], [cx + BR + 12, cz - 12, 3], [cx + BR + 12, cz + 14, 3]];
  for (const [x, z, rot] of benchPlaces) {
    if (blocked(x, z)) continue;
    b.prop('bench_park', x, 0, z, rot, {});
    const nearPond = Math.hypot(x - pond.x, z - pond.z) < pond.rx + 16;
    outSpot(b, grid, 'sit', x, 0, z, rot, { act: nearPond ? 'feed_birds' : rng.pick(['read', 'sit', 'feed_birds', 'doze', 'knit']), tags: ['bench'], seat: 0.45, label: 'On a bench in Juniper Park' });
    b.playerSeat(x, 0, z, rot, 0.45);
  }
  // trees, flagpole, lamps, squirrels, pigeons
  const trees = ['tree_maple_red', 'tree_maple_orange', 'tree_elm_yellow', 'tree_birch', 'tree_maple_red', 'tree_pine'];
  for (let i = 0; i < 18; i++) {
    const x = rng.int(18, W - 18), z = rng.int(18, D - 34);
    if (inPond(x, z, 6) || Math.hypot(x - cx, z - cz) < BR + 14 || (x > play.x0 - 6 && z > play.z0 - 6) || (x > chessA.x0 - 4 && z < chessA.z1)) continue;
    b.prop(rng.pick(trees), x, 0, z, 0, { cat: 'far', scale: rng.float(0.85, 1.15), yawOffset: rng.float(0, 6.28) });
    if (rng.chance(0.4)) b.prop('leaf_pile', x + 3, 0, z + 2, 0, {});
  }
  b.prop('flag_pole', cx, 0, 16, 0, { cat: 'far' });
  for (const [x, z] of [[cx - 12, 9], [cx + 12, 9], [9, cz], [W - 9, cz], [cx - 12, D - 9], [cx + 12, D - 9], [cx - BR - 10, cz - 10], [cx + BR + 10, cz + 10]]) b.prop('street_lamp', x, 0, z, 0, {});
  for (let i = 0; i < 4; i++) b.prop('squirrel', rng.int(20, W - 20), 0, rng.int(20, D - 20), 0, { yawOffset: rng.float(0, 6.28) });
  for (let i = 0; i < 8; i++) b.prop('pigeon', cx + rng.float(-10, 10), 0, cz - BR - 6 + rng.float(-3, 3), 0, { yawOffset: rng.float(0, 6.28) });
  // park rules board
  f.box(cx + 4, 0, 10, 1, 8, 1, MAT.wood_post); f.box(cx + 12, 0, 10, 1, 8, 1, MAT.wood_post); f.box(cx + 4, 4, 10, 9, 4, 1, MAT.sign_green);
  signLine(b, 'JUNIPER PARK', cx + 8.5, 6, 9.95, 0, { bg: '#1f5a3e', fg: '#f0e2b0', border: '#1f5a3e', scale: 0.45 });
  readAt(b, cx + 8.5, 5, 10, 0, 'Park rules', 'JUNIPER PARK - RULES\nPark closes at 10 P.M. (Tonight: at the end of the fireworks.)\nNo bicycles on the walks. No dogs in the pond. No swimming in the pond (this means you, Class of 1954).\nDo not feed the ducks popcorn.\nBand concerts Sundays at 3, June through September.\n\nBoard of Park Commissioners, City of Juniper Bay', 2.4);
  // strollers & park regulars
  for (let i = 0; i < 6; i++) { const q = grid.list[rng.int(0, grid.list.length - 1)]; if (!q) continue; const s = outSpot(b, grid, 'stand', q.x + 2, 0, q.z + 2, rng.int(0, 3), { act: rng.pick(['look', 'talk', 'stand']), tags: ['park'], label: 'Strolling in Juniper Park' }); s.spread = 2; }
  void chess; void playSpots;
  return b;
}

void slab; void roomTrim; void flatRoof; void cornerstone; void FHc;
