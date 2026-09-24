// Prop definitions: vehicles. (See docs/PROPS.md for the authoring guide.)
// Conventions: the vehicle drives toward +z, origin = bottom centre (tyres touch y = 0).
// Cars: body paint = tint A (0.5 main panels, 0.42 lower panels), tint B = roof / two-tone.
import { defineProp, lampLight } from '../props.js';
import { layoutText } from '../../world/font.js';
void lampLight;

// ---------------------------------------------------------------- palette & helpers
const A = (s = 0.5) => ({ tint: 1, shade: s });
const B = (s = 0.5) => ({ tint: 2, shade: s });
const glow = (c, e = 0.6) => ({ c, emit: e });
const GLASS = '#3a4a55', CHROME = '#d0d4d0', CHROME2 = '#a8aca8', TYRE = '#1c1c1c', WW = '#ece8e0', DARK = '#161616';
const HEAD = glow('#fff4d0', 0.6), TAIL = glow('#b01810', 0.35), AMBER = glow('#e8a030', 0.3), PLATE = '#e0d088';
const WHITE = '#eeeae0', CREAM = '#e8dcb8', BLACK = '#1c1c1e', RED = '#b02018', GOLD = '#d8b050', SEAT = '#8a3a2a';

// piecewise-linear profile through [[z, v], ...], rounded to whole voxels
const pw = (pts) => (z) => {
  if (z <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (z <= pts[i][0]) { const [z0, v0] = pts[i - 1], [z1, v1] = pts[i]; return Math.round(v0 + (v1 - v0) * (z - z0) / (z1 - z0)); }
  return pts[pts.length - 1][1];
};
// fill a body described by shape(z, y) -> half-width (0 = empty) around the centre line cx
function fillShape(m, cx, shape, colAt) {
  for (let z = 0; z < m.sz; z++) for (let y = 0; y < m.sy; y++) {
    const h = shape(z, y); if (h <= 0) continue;
    for (let x = cx - h; x < cx + h; x++) m.set(x, y, z, colAt(x, y, z, h));
  }
}
// paint the outermost voxel seen from the front (+z) / back (-z) / sides
function paintFront(m, x, y, col, depth = 1) { for (let z = m.sz - 1; z >= 0; z--) if (m.get(x, y, z)) { for (let k = 0; k < depth; k++) m.set(x, y, z - k, col); return z; } return -1; }
function paintBack(m, x, y, col) { for (let z = 0; z < m.sz; z++) if (m.get(x, y, z)) { m.set(x, y, z, col); return z; } return -1; }
function paintSides(m, y, z, col, which = 0) {
  if (which >= 0) for (let x = m.sx - 1; x >= 0; x--) if (m.get(x, y, z)) { m.set(x, y, z, col); break; }
  if (which <= 0) for (let x = 0; x < m.sx; x++) if (m.get(x, y, z)) { m.set(x, y, z, col); break; }
}
// text painted onto both flanks, centred at zc, reading front-to-back correctly on each side
function sideText(m, str, y, zc, col, font = 'small') {
  const L = layoutText(str, font), w = L.width;
  for (const p of L.pixels) {
    paintSides(m, y + p.y, Math.round(zc + w / 2 - 1 - p.x), col, 1);   // +x side reads toward -z
    paintSides(m, y + p.y, Math.round(zc - w / 2 + p.x), col, -1);      // -x side reads toward +z
  }
}
function textFront(m, str, cx, y, col, font = 'small') { const L = layoutText(str, font); const x0 = Math.round(cx - L.width / 2); for (const p of L.pixels) paintFront(m, x0 + p.x, y + p.y, col); }
function textBack(m, str, cx, y, col, font = 'small') { const L = layoutText(str, font); const x0 = Math.round(cx + L.width / 2) - 1; for (const p of L.pixels) paintBack(m, x0 - p.x, y + p.y, col); }
function ringX(m, x, cy, cz, r0, r1, len, col) {
  for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++) for (let z = Math.floor(cz - r1); z <= Math.ceil(cz + r1); z++) {
    const d = Math.hypot(z + 0.5 - cz, y + 0.5 - cy);
    if (d <= r1 && d >= r0) for (let k = 0; k < len; k++) m.set(x + k, y, z, col);
  }
}
// wheel: tyre from x0 (len wide); `face` = x of the outer face that gets whitewall + hubcap
function wheel(m, x0, cy, cz, r, len, face, o = {}) {
  m.cylX(x0, cy, cz, r, len, TYRE);
  if (o.ww !== false) ringX(m, face, cy, cz, r * 0.64, r * 0.84, 1, WW);
  ringX(m, face, cy, cz, 0, r * 0.64, 1, o.rim || A(0.42));
  ringX(m, face, cy, cz, 0, r * (o.hub || 0.4), 1, o.hubCol || CHROME);
}
// clear a stepped wheel arch (3 steps each side, cheap to mesh) in the outer columns (x < xl or x > xr)
function arch(m, zc, cy, r, xl, xr, well = '#141414') {
  const steps = [[0, Math.round(cy + r * 0.35), r], [Math.round(cy + r * 0.35), Math.round(cy + r * 0.75), r * 0.8], [Math.round(cy + r * 0.75), Math.round(cy + r), r * 0.5]];
  for (const [y0, y1, hw] of steps) for (let y = y0; y < y1; y++) for (let z = Math.round(zc - hw); z < Math.round(zc + hw); z++) for (let x = 0; x < m.sx; x++) {
    if (x < xl || x > xr) m.set(x, y, z, 0);
    else if ((x === xl || x === xr) && m.get(x, y, z)) m.set(x, y, z, well);
  }
}
// closed passenger cabin between the beltline yb and roof yr; glass with pillars.
// z0 rear-window base, z1 roof rear, z2 roof front, z3 windshield base; h0/h1 half-widths at belt / roof.
function cabin(m, cx, c) {
  for (let y = c.yb + 1; y <= c.yr; y++) {
    const t = (y - c.yb) / (c.yr - c.yb);
    const zr = Math.round(c.z0 + (c.z1 - c.z0) * t), zf = Math.round(c.z3 - (c.z3 - c.z2) * t);
    const h = y === c.yr ? c.h1 - 1 : c.h0 - Math.round((c.h0 - c.h1) * t);
    for (let z = zr; z <= zf; z++) for (let x = cx - h; x < cx + h; x++) {
      const side = x === cx - h || x === cx + h - 1, corner = x <= cx - h + 1 || x >= cx + h - 2;
      const front = z === zf, rear = z <= zr + (c.cw ?? 1);
      let col = c.glass || GLASS;
      if (y >= c.yr - (c.roofRows ?? 0)) col = c.roof;
      else if (y === c.yb + 1) col = c.body;
      else if (side && (front || rear || y === c.yr - 1 || (c.pillars || []).some(([a, b]) => z >= a && z <= b))) col = c.roof;
      else if (corner && (front || rear)) col = c.roof;
      else if (c.split && front && (x === cx - 1 || x === cx)) col = c.roof;
      m.set(x, y, z, col);
    }
  }
}
function bumper(m, cx, hw, y0, zA, zB, over = true) { // chrome bumper between zA..zB (inclusive), wrapping round the corners
  const z0 = Math.min(zA, zB), d = Math.abs(zB - zA) + 1, back = zA > zB;
  m.box(cx - hw + 1, y0, z0, hw * 2 - 2, 3, d, CHROME);
  const zw = back ? z0 : z0 - 1;
  m.box(cx - hw, y0, zw, 1, 3, d + 1, CHROME); m.box(cx + hw - 1, y0, zw, 1, 3, d + 1, CHROME);
  if (over) for (const dx of [-6, 5]) m.box(cx + dx, y0 + 3, back ? z0 : z0 + d - 1, 1, 2, 1, CHROME);
}
function headlights(m, xs, y) { for (const x of xs) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) paintFront(m, x + dx, y + dy, HEAD); for (const [dx, dy] of [[-1, 0], [2, 0], [-1, 1], [2, 1], [0, -1], [1, -1], [0, 2], [1, 2]]) paintFront(m, x + dx, y + dy, CHROME); } }
function grille(m, x0, x1, y0, y1, bars = CHROME, gaps = DARK) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) paintFront(m, x, y, (y - y0) % 2 === 0 ? bars : gaps);
  for (let x = x0 - 1; x <= x1 + 1; x++) { paintFront(m, x, y0 - 1, CHROME); paintFront(m, x, y1 + 1, CHROME); }
}

// ---------------------------------------------------------------- passenger cars (1/16 m voxels, 32 wide = 2.0 m incl. mirrors)
const CX = 16;
// 1949-53 "pontoon" body: slab sides, fenders flush, long hood and trunk
function pontoon(o = {}) {
  const top = pw(o.top || [[2, 10], [4, 12], [8, 14], [20, 15], [52, 15], [71, 15], [74, 14], [76, 12], [77, 10]]);
  return (z, y) => {
    if (z < 2 || z > 77) return 0;
    const t = top(z), bot = z < 9 || z > 70 ? 5 : 4;
    if (y < bot || y > t) return 0;
    let h = z <= 2 ? 13 : z <= 4 ? 14 : z >= 77 ? 13 : z >= 75 ? 14 : 15;
    if (y === t) h -= 1;
    return h;
  };
}
// 1941-48 style: narrower body with separate fat fenders and running boards
function fendered(o = {}) {
  const top = pw(o.top || [[2, 8], [5, 11], [10, 13], [48, 14], [72, 14], [75, 12], [77, 9]]);
  const zf = o.zf ?? 61, zr = o.zr ?? 16;
  return (z, y) => {
    if (z < 2 || z > 77) return 0;
    let h = 0;
    const t = top(z);
    if (y >= 5 && y <= t) h = (y === t ? 11 : 12) - (z >= 74 ? 1 : 0) - (z >= 76 ? 1 : 0) - (z <= 3 ? 1 : 0);
    const ef = ((z + 0.5 - (zf + 2)) / 15) ** 2 + ((y + 0.5 - 5) / 9.5) ** 2; // front fender teardrop
    const er = ((z + 0.5 - (zr - 1)) / 12) ** 2 + ((y + 0.5 - 5) / 8.5) ** 2;  // rear fender
    const e = Math.min(ef, er);
    if (e <= 1 && y >= 4) h = Math.max(h, e > 0.8 ? 14 : 15);
    if (y >= 4 && y <= 5 && z > zr + 9 && z < zf - 11) h = Math.max(h, 14); // running board
    return h;
  };
}
function carColour(o) {
  return (x, y, z, h) => {
    if (o.fenderZ && y <= 14 && Math.abs(x + 0.5 - CX) > 12 && o.fenderZ(z)) return o.fender || A(0.46);
    if (y === 4 && Math.abs(x + 0.5 - CX) > 12 && o.board) return '#2a2a2a';
    return y < (o.trimY ?? 9) ? (o.lower || A(0.42)) : (o.body || A(0.5));
  };
}
function carBase(m, o) {
  fillShape(m, CX, o.shape, o.colAt || carColour(o));
  const zr = o.zr ?? 16, zf = o.zf ?? 62;
  if (o.cabin) cabin(m, CX, o.cabin);
  arch(m, zr, 6, 7.2, 7, 24); arch(m, zf, 6, 7.2, 7, 24);
  for (const zc of [zr, zf]) { wheel(m, 2, 6, zc, 5.6, 4, 2, o.wheel); wheel(m, 26, 6, zc, 5.6, 4, 29, o.wheel); }
  if (o.skirt) for (let y = 7; y < 12; y++) for (let z = zr - 6; z <= zr + 6; z++) if (Math.hypot(z + 0.5 - zr, y + 0.5 - 6) < 7.2 && y > 6 + Math.abs(z + 0.5 - zr) * 0.2) { m.set(1, y, z, A(0.42)); m.set(30, y, z, A(0.42)); }
  // bumpers, lights, grille, plates
  bumper(m, CX, 15, 4, 78, 79); bumper(m, CX, 15, 4, 1, 0);
  if (o.grille !== false) grille(m, CX - 8, CX + 7, 6, 10);
  headlights(m, o.heads || [CX - 13, CX + 11], o.headY ?? 10);
  for (const x of [CX - 10, CX + 9]) paintFront(m, x, 8, AMBER);
  for (const x of [CX - 14, CX + 13]) for (const y of [10, 11, 12]) paintBack(m, x, y, TAIL);
  for (let x = CX - 2; x < CX + 2; x++) { paintBack(m, x, 7, PLATE); paintBack(m, x, 8, PLATE); paintFront(m, x, 3 + 4, PLATE); }
  // hood ornament
  let hy = 0; for (let y = m.sy - 1; y > 0; y--) if (m.get(CX, y, 74)) { hy = y; break; }
  m.set(CX - 1, hy + 1, 74, CHROME); m.set(CX, hy + 1, 74, CHROME); m.set(CX, hy + 1, 73, CHROME);
  // door seams & handles & side spear
  for (const z of o.seams || []) for (let y = 5; y <= 15; y++) paintSides(m, y, z, o.seam || A(0.36));
  for (const z of o.handles || []) paintSides(m, 13, z, CHROME);
  if (o.spear) for (let z = o.spear[0]; z <= o.spear[1]; z++) paintSides(m, o.spear[2] ?? 10, z, CHROME);
}

// Four-door sedan (1951-ish), 5.0 m. Two-tone roof = tint B.
defineProp('car_sedan', {
  size: [32, 26, 80], collide: true, cat: 'far',
  build(m) {
    carBase(m, {
      shape: pontoon(), seams: [24, 37, 51], handles: [34, 48], spear: [20, 70, 9], skirt: true,
      cabin: { yb: 15, yr: 25, z0: 22, z1: 29, z2: 45, z3: 51, h0: 13, h1: 12, body: A(0.5), roof: B(0.5), pillars: [[36, 38]], cw: 2 },
    });
  },
});
// Two-door fastback coupe (1946-48 "sedanet"): separate fat fenders, running boards, sloping roof to the tail
defineProp('car_coupe', {
  size: [32, 26, 80], collide: true, cat: 'far',
  build(m) {
    carBase(m, {
      shape: fendered({ zf: 61, zr: 16 }), zf: 61, zr: 16, board: true, trimY: 0, fenderZ: () => true, fender: A(0.45),
      seams: [33, 49], handles: [46], grille: false, heads: [CX - 13, CX + 11], headY: 10,
      cabin: { yb: 14, yr: 25, z0: 5, z1: 32, z2: 41, z3: 49, h0: 11, h1: 10, body: A(0.5), roof: B(0.5), cw: 1, split: true },
    });
    // tall narrow waterfall grille between the fenders
    for (let y = 5; y <= 12; y++) for (let x = CX - 5; x <= CX + 4; x++) paintFront(m, x, y, x % 2 ? CHROME : DARK);
    for (let x = CX - 5; x <= CX + 4; x++) paintFront(m, x, 13, CHROME);
  },
});
// Convertible, top down: seats (tint B upholstery), dash, wheel, windshield frame, folded top behind
defineProp('car_convertible', {
  size: [32, 26, 80], collide: true, cat: 'far',
  build(m) {
    carBase(m, { shape: pontoon(), seams: [48], handles: [45], spear: [20, 70, 9], skirt: true });
    const seat = B(0.5), seat2 = B(0.42);
    m.box(CX - 13, 9, 20, 26, 7, 32, 0); m.box(CX - 13, 8, 20, 26, 1, 32, '#3a3430'); // cockpit tub
    m.box(CX - 12, 9, 36, 24, 3, 7, seat); m.box(CX - 12, 12, 36, 24, 5, 2, seat2); m.box(CX - 12, 16, 36, 24, 1, 2, seat); // front bench
    m.box(CX - 12, 9, 24, 24, 3, 6, seat); m.box(CX - 12, 12, 23, 24, 4, 2, seat2);                                   // rear bench
    m.box(CX - 13, 12, 49, 26, 4, 2, A(0.42)); m.box(CX - 12, 13, 49, 24, 1, 1, '#c8b890'); // dash
    for (let k = 0; k < 4; k++) { m.set(CX - 8 + k, 16, 46, DARK); m.set(CX - 8 + k, 19, 46, DARK); } m.box(CX - 8, 17, 46, 1, 2, 1, DARK); m.box(CX - 5, 17, 46, 1, 2, 1, DARK); m.box(CX - 7, 14, 47, 2, 3, 1, DARK);
    for (let y = 16; y <= 21; y++) { const z = 51 - Math.floor((y - 16) / 2); m.box(CX - 13, y, z, 1, 1, 1, CHROME); m.box(CX + 12, y, z, 1, 1, 1, CHROME); if (y < 21) m.box(CX - 12, y, z, 24, 1, 1, y > 16 ? '#5a7080' : CHROME); else m.box(CX - 12, y, z, 24, 1, 1, CHROME); }
    m.box(CX - 13, 15, 16, 26, 2, 6, '#c8b890'); m.box(CX - 12, 17, 17, 24, 1, 4, '#b8a880'); // folded top
    m.box(CX + 6, 21, 49, 2, 1, 1, DARK); // mirror
  },
});
// Woodie station wagon (1948): fendered front, ash-framed mahogany body, tint B roof
defineProp('car_wagon', {
  size: [32, 27, 80], collide: true, cat: 'far',
  build(m) {
    const ash = '#c89a5a', mah = '#7a4428';
    const base = fendered({ top: [[2, 15], [48, 15], [50, 14], [72, 14], [75, 12], [77, 9]] });
    carBase(m, {
      shape: (z, y) => { const h = base(z, y); if (z >= 3 && z <= 48 && y >= 5 && y <= 15) return Math.max(h, y === 15 ? 12 : 13); return h; },
      board: true, fenderZ: () => true, fender: A(0.45), grille: false,
      colAt: (x, y, z, h) => {
        const fz = Math.abs(x + 0.5 - CX) > 12.5 && y <= 14;
        if (fz && (z > 50 || z < 26)) return A(0.45);
        if (y === 4 && Math.abs(x + 0.5 - CX) > 12) return '#2a2a2a';
        if (z <= 48 && z >= 3) { const edge = y === 5 || y === 15 || y === 10 || z === 3 || z === 48 || z === 26 || z === 37; return edge ? ash : mah; }
        return A(0.5);
      },
      cabin: { yb: 15, yr: 26, z0: 3, z1: 4, z2: 44, z3: 50, h0: 12, h1: 11, body: ash, roof: B(0.5), pillars: [[25, 26], [36, 37]], cw: 1, split: true, roofRows: 0 },
    });
    for (let y = 5; y <= 12; y++) for (let x = CX - 5; x <= CX + 4; x++) paintFront(m, x, y, y % 2 ? CHROME : DARK);
    for (let y = 16; y <= 24; y++) for (const z of [25, 36]) paintSides(m, y, z, ash);
    for (let y = 5; y <= 25; y++) { paintBack(m, CX - 12, y, ash); paintBack(m, CX + 11, y, ash); }
    for (let x = CX - 11; x < CX + 11; x++) { paintBack(m, x, 15, ash); paintBack(m, x, 5, ash); }
  },
});
// Checker-style taxi: fixed yellow with a checker band, roof "TAXI" light
defineProp('car_taxi', {
  size: [32, 31, 80], collide: true, cat: 'far',
  build(m) {
    const y1 = '#e3b12c', y2 = '#c89a24';
    carBase(m, {
      shape: pontoon(), body: y1, lower: y2, seam: '#8a6a18', wheel: { rim: y2 },
      seams: [24, 37, 51], handles: [34, 48], skirt: false,
      cabin: { yb: 15, yr: 26, z0: 23, z1: 28, z2: 46, z3: 51, h0: 13, h1: 12, body: y1, roof: y1, pillars: [[36, 38]], cw: 2 },
    });
    for (let z = 10; z < 72; z++) for (const y of [13, 14]) paintSides(m, y, z, ((z >> 1) + y) % 2 ? BLACK : WHITE);
    m.box(CX - 5, 26, 36, 10, 1, 4, BLACK); m.box(CX - 4, 27, 36, 8, 3, 4, glow('#f4ecc8', 0.5));
    textFront(m, 'TAXI', CX, 27, BLACK); textBack(m, 'TAXI', CX, 27, BLACK);
    sideText(m, 'CAB', 6, 44, BLACK);
  },
});
// Police cruiser: black with white doors and roof, "POLICE" on the doors, red roof beacon and siren
defineProp('car_police', {
  size: [32, 28, 80], collide: true, cat: 'far',
  build(m) {
    carBase(m, {
      shape: pontoon(), body: BLACK, lower: '#141416', seams: [24, 37, 51], handles: [34, 48], spear: [20, 70, 9], seam: '#3a3a3a', wheel: { rim: BLACK },
      colAt: (x, y, z) => (z >= 25 && z <= 50 && y >= 5) ? WHITE : y < 9 ? '#141416' : BLACK,
      cabin: { yb: 15, yr: 25, z0: 22, z1: 29, z2: 45, z3: 51, h0: 13, h1: 12, body: WHITE, roof: WHITE, pillars: [[36, 38]], cw: 2 },
    });
    sideText(m, 'POLICE', 9, 38, BLACK);
    m.box(CX - 2, 25, 36, 4, 1, 4, CHROME); m.box(CX - 1, 26, 37, 2, 2, 2, glow('#e02018', 0.7)); m.set(CX - 1, 28, 37, glow('#e02018', 0.7));
    m.box(CX + 8, 15, 70, 3, 2, 3, CHROME); m.set(CX + 9, 15, 73, DARK); // siren on the fender
    m.box(CX - 13, 20, 50, 1, 2, 1, CHROME); // spotlight
  },
});

// ---------------------------------------------------------------- light trucks & vans (1/16 m voxels)
// 1947-53 "Advance Design" style front: narrow hood, fat front fenders, horizontal-bar grille, split windshield
function truckFront(m, o) {
  const zf = o.zf, col = o.col || A(0.5), fcol = o.fcol || A(0.46);
  fillShape(m, CX, (z, y) => {
    let h = 0;
    if (z >= o.cab0 && z <= o.cab1 && y >= 5 && y <= 17) h = y === 17 ? 12 : 13;             // cab lower
    const ht = Math.round(18 - (z - o.cab1) * 2 / 24);
    if (z > o.cab1 && z <= o.nose && y >= 11 && y <= ht) h = Math.max(h, (y === ht ? 8 : 9) - (z >= o.nose - 1 ? 1 : 0)); // hood
    if (z > o.cab1 && z <= o.nose && y >= 6 && y < 11) h = Math.max(h, 11);                  // front apron / grille
    const e = ((z + 0.5 - (zf + 2)) / 16) ** 2 + ((y + 0.5 - 5) / 11.5) ** 2;              // front fender
    if (e <= 1 && y >= 4 && z <= o.nose) h = Math.max(h, e > 0.82 ? 14 : 15);
    if (o.board && y >= 4 && y <= 5 && z > o.board[0] && z < o.board[1]) h = Math.max(h, 14);
    return h;
  }, (x, y, z) => (Math.abs(x + 0.5 - CX) > 11.5 && y <= 16 && z > o.cab1 - 2) ? fcol : (y === 4 || y === 5) && Math.abs(x + 0.5 - CX) > 12.5 && z < o.cab0 + 2 ? '#2a2a2a' : col);
  cabin(m, CX, { yb: 17, yr: o.roof || 29, z0: o.cab0 + 1, z1: o.cab0 + 2, z2: o.cab1 - 3, z3: o.cab1, h0: 13, h1: 12, body: col, roof: o.roofCol || col, split: true, cw: o.cw ?? 2 });
  // grille: five horizontal bars
  for (let y = 6; y <= 10; y++) for (let x = CX - 10; x <= CX + 9; x++) paintFront(m, x, y, (y % 2 === 0) ? CHROME : DARK);
  headlights(m, [CX - 14, CX + 12], 12);
  for (let x = CX - 1; x <= CX; x++) { let hy = 0; for (let y = m.sy - 1; y > 0; y--) if (m.get(x, y, o.nose - 2)) { hy = y; break; } m.set(x, hy + 1, o.nose - 3, CHROME); }
  m.box(CX - 15, 4, o.nose + 1, 30, 3, 2, o.bumper || CHROME);
}
function truckWheels(m, zs, rim = A(0.42), r = 5.8) {
  for (const zc of zs) arch(m, zc, 6, 7.2, 7, 24);
  for (const zc of zs) { wheel(m, 2, 6, zc, r, 4, 2, { ww: false, rim, hub: 0.3 }); wheel(m, 26, 6, zc, r, 4, 29, { ww: false, rim, hub: 0.3 }); }
}
// Pickup truck (tint A), step-side bed with a hay bale and pumpkins
defineProp('truck_pickup', {
  size: [32, 31, 84], collide: true, cat: 'far',
  build(m) {
    const zf = 63, zr = 16;
    truckFront(m, { zf, cab0: 36, cab1: 54, nose: 80, board: [26, 48] });
    // bed
    fillShape(m, CX, (z, y) => {
      let h = 0;
      if (z >= 3 && z <= 35 && y >= 6 && y <= 16) h = 12;
      const e = ((z + 0.5 - zr) / 10.5) ** 2 + ((y + 0.5 - 5) / 9) ** 2;
      if (e <= 1 && y >= 4 && z <= 34) h = Math.max(h, e > 0.8 ? 14 : 15);
      return h;
    }, (x, y, z) => Math.abs(x + 0.5 - CX) > 12 ? A(0.46) : A(0.5));
    m.box(CX - 11, 8, 5, 22, 9, 30, 0); m.box(CX - 11, 7, 5, 22, 1, 30, '#8a6a44');
    for (let z = 5; z < 35; z += 4) m.box(CX - 11, 7, z, 22, 1, 1, CHROME2);
    m.box(CX - 12, 15, 3, 24, 1, 1, CHROME2);
    truckWheels(m, [zr, zf]);
    for (const x of [CX - 13, CX + 12]) for (const y of [13, 14]) paintBack(m, x, y, TAIL);
    m.box(CX - 13, 4, 1, 26, 2, 2, CHROME2);
    // cargo
    m.box(CX - 9, 8, 22, 15, 8, 8, '#d0b060'); m.box(CX - 9, 11, 22, 15, 1, 8, '#a88a40'); m.box(CX + 1, 8, 8, 6, 5, 6, '#d06a1a'); m.box(CX - 8, 8, 9, 5, 4, 5, '#c85a14'); m.set(CX + 3, 13, 10, '#5a5a2a');
  },
});
// Panel delivery van (tint A) with a painted sign panel in tint B on each side
defineProp('truck_delivery', {
  size: [32, 31, 84], collide: true, cat: 'far',
  build(m) {
    const zf = 63, zr = 16;
    truckFront(m, { zf, cab0: 44, cab1: 54, nose: 80, cw: 0 });
    fillShape(m, CX, (z, y) => {
      let h = 0;
      if (z >= 3 && z <= 45 && y >= 5 && y <= 29) h = y === 29 ? 11 : y === 28 ? 12 : 13;
      const e = ((z + 0.5 - zr) / 10.5) ** 2 + ((y + 0.5 - 5) / 9) ** 2;
      if (e <= 1 && y >= 4) h = Math.max(h, e > 0.8 ? 14 : 15);
      if (y >= 4 && y <= 5 && z > 26 && z < 48) h = Math.max(h, 14);
      return h;
    }, (x, y, z) => Math.abs(x + 0.5 - CX) > 13 && y < 15 ? A(0.46) : (y === 4 || y === 5) && Math.abs(x + 0.5 - CX) > 13 ? '#2a2a2a' : A(0.5));
    // sign panel (tint B) with a cream border, rear doors
    for (let z = 8; z <= 40; z++) for (let y = 14; y <= 26; y++) paintSides(m, y, z, (z === 8 || z === 40 || y === 14 || y === 26) ? CREAM : B(0.5));
    for (let z = 12; z <= 36; z++) paintSides(m, 20, z, B(0.62));
    for (let y = 6; y <= 27; y++) paintBack(m, CX, y, A(0.36));
    for (let x = CX - 10; x <= CX + 9; x++) if (x !== CX) for (let y = 19; y <= 25; y++) paintBack(m, x, y, GLASS);
    paintBack(m, CX - 2, 14, CHROME); paintBack(m, CX + 1, 14, CHROME);
    truckWheels(m, [zr, zf]);
    for (const x of [CX - 13, CX + 12]) for (const y of [8, 9]) paintBack(m, x, y, TAIL);
    m.box(CX - 13, 4, 1, 26, 2, 2, CHROME2);
  },
});
// Walk-in step van (Divco style): snub nose, tall rounded body. Used for the milk & bread trucks.
function stepVan(m, o) {
  const zr = 15, zf = 57, body = o.body, trim = o.trim;
  fillShape(m, CX, (z, y) => {
    let h = 0;
    if (z >= 3 && z <= 64 && y >= 5 && y <= 38) h = y === 38 ? 12 : y === 37 ? 14 : 15;
    const nt = Math.round(18 - (z - 64) * 0.55);
    if (z > 64 && z <= 72 && y >= 5 && y <= nt) h = Math.max(h, (y === nt ? 11 : 13) - (z >= 71 ? 1 : 0));
    return h;
  }, (x, y, z) => (y === 19 || y === 20) ? trim : y < 8 ? (o.lower || body) : body);
  // windshield & side door windows
  for (let y = 22; y <= 33; y++) for (let x = CX - 13; x <= CX + 12; x++) paintFront(m, x, y, (x === CX - 1 || x === CX || y === 22 || y === 33) ? body : GLASS);
  for (let z = 52; z <= 62; z++) for (let y = 24; y <= 33; y++) paintSides(m, y, z, (z === 57 || y === 24) ? body : GLASS);
  for (let y = 5; y <= 34; y++) { paintSides(m, y, 51, '#8a8a88'); paintSides(m, y, 63, '#8a8a88'); }
  for (let y = 8; y <= 34; y++) paintBack(m, CX, y, '#8a8a88');
  for (let x = CX - 10; x <= CX + 9; x++) if (x !== CX) for (let y = 26; y <= 33; y++) paintBack(m, x, y, GLASS);
  for (let x = CX - 15; x < CX + 15; x++) { paintBack(m, x, 19, trim); paintBack(m, x, 20, trim); paintFront(m, x, 19, trim); paintFront(m, x, 20, trim); }
  headlights(m, [CX - 12, CX + 10], 13);
  for (let y = 7; y <= 11; y++) for (let x = CX - 6; x <= CX + 5; x++) paintFront(m, x, y, x % 2 ? CHROME : DARK);
  m.box(CX - 15, 4, 73, 30, 3, 2, CHROME); m.box(CX - 14, 4, 1, 28, 2, 2, CHROME2);
  for (const x of [CX - 14, CX + 13]) for (const y of [10, 11]) paintBack(m, x, y, TAIL);
  for (const zc of [zr, zf]) arch(m, zc, 6, 7.2, 7, 24);
  for (const zc of [zr, zf]) { wheel(m, 2, 6, zc, 5.8, 4, 2, { ww: false, rim: '#c8c8c0', hub: 0.3 }); wheel(m, 26, 6, zc, 5.8, 4, 29, { ww: false, rim: '#c8c8c0', hub: 0.3 }); }
}
defineProp('truck_milk', {
  size: [32, 40, 76], collide: true, cat: 'far',
  build(m) {
    const red = '#b8322a';
    stepVan(m, { body: WHITE, trim: red, lower: '#dcd8cc' });
    sideText(m, 'DAIRY', 24, 28, red, 'big');
    sideText(m, 'JUNIPER', 33, 28, '#2a4a8a');
    sideText(m, 'MILK', 12, 28, '#2a4a8a');
    m.box(CX - 3, 39, 20, 6, 1, 16, '#dcd8cc');
  },
});
defineProp('truck_bread', {
  size: [32, 40, 76], collide: true, cat: 'far',
  build(m) {
    const cr = '#e8dcb8', br = '#7a2a1e';
    stepVan(m, { body: cr, trim: br, lower: '#d8c8a0' });
    sideText(m, 'HALLORAN & SONS', 31, 32, br);
    sideText(m, 'BAKERY', 23, 32, '#b88a2a', 'big');
    sideText(m, 'EST 1887', 12, 32, br);
  },
});
// Ice cream truck: small cab + insulated white box, bells, pictures of treats
defineProp('truck_ice_cream', {
  size: [32, 33, 84], collide: true, cat: 'far',
  build(m) {
    const w = '#f2eee6', red = '#c02a2a', blu = '#2a4a9a';
    truckFront(m, { zf: 63, cab0: 42, cab1: 54, nose: 80, col: w, fcol: '#e6e2da', cw: 0 });
    fillShape(m, CX, (z, y) => (z >= 3 && z <= 43 && y >= 5 && y <= 30) ? (y === 30 ? 12 : y === 29 ? 13 : 14) : 0, (x, y) => y === 12 || y === 26 ? blu : w);
    sideText(m, 'ICE CREAM', 19, 22, red);
    for (const zc of [10, 34]) { for (let y = 14; y <= 17; y++) paintSides(m, y, zc, y === 14 ? '#c8a060' : y === 17 ? '#f0e0c0' : '#6a3a1a'); paintSides(m, 13, zc, '#c8a060'); }
    for (let z = 14; z <= 30; z++) for (let y = 8; y <= 11; y++) paintSides(m, y, z, z === 14 || z === 30 ? blu : '#dcd8cc', 1);
    for (let z = 4; z <= 42; z += 6) m.set(CX + 13, 31, z, GOLD), m.set(CX - 14, 31, z, GOLD);
    m.box(CX - 5, 31, 36, 10, 3, 2, w); textFront(m, 'ICE', CX, 31, red);
    truckWheels(m, [16, 63], red);
    for (const x of [CX - 13, CX + 12]) for (const y of [8, 9]) paintBack(m, x, y, TAIL);
    m.box(CX - 13, 4, 1, 26, 2, 2, CHROME2);
  },
});

// Motorcycle (tint A tank & fenders), ~2.2 m
defineProp('motorcycle', {
  size: [14, 18, 36], collide: true, cat: 'far',
  build(m) {
    const cx = 6, t = A(0.5), frame = '#2a2a2a';
    for (const zc of [7, 29]) { ringX(m, cx, 5.5, zc, 3.4, 5.5, 2, TYRE); ringX(m, cx, 5.5, zc, 2.6, 3.4, 2, CHROME2); ringX(m, cx, 5.5, zc, 0, 1.4, 2, CHROME); }
    for (const zc of [7, 29]) for (let y = 7; y < 12; y++) for (let z = zc - 6; z <= zc + 6; z++) { const d = Math.hypot(z + 0.5 - zc, y + 0.5 - 5.5); if (d > 5.6 && d < 6.7 && y >= 8) m.box(cx, y, z, 2, 1, 1, t); }
    m.box(cx, 5, 7, 2, 2, 8, frame); m.box(cx - 1, 5, 13, 4, 6, 7, '#6a6e70'); for (let y = 6; y < 11; y += 2) m.box(cx - 2, y, 14, 6, 1, 5, CHROME2);
    m.box(cx, 10, 11, 2, 2, 12, frame); m.box(cx - 1, 11, 14, 4, 3, 8, t); m.box(cx - 1, 13, 15, 4, 1, 6, A(0.6));
    m.box(cx - 1, 12, 7, 4, 2, 7, '#3a2a22'); m.box(cx, 11, 5, 2, 1, 4, frame);
    for (let k = 0; k < 9; k++) m.box(cx, 7 + k, 27 - Math.round(k * 0.35), 2, 1, 1, CHROME);
    m.box(cx - 1, 15, 24, 4, 3, 3, CHROME); m.box(cx, 15, 27, 2, 2, 1, glow('#fff4d0', 0.6));
    m.box(0, 17, 23, 14, 1, 1, CHROME); m.box(0, 17, 22, 1, 1, 2, frame); m.box(13, 17, 22, 1, 1, 2, frame);
    m.box(cx + 2, 4, 2, 1, 2, 16, CHROME); m.box(cx - 1, 4, 2, 1, 2, 12, CHROME);
    m.set(cx, 10, 1, glow('#b01810', 0.35)); m.set(cx + 1, 10, 1, glow('#b01810', 0.35));
  },
});

// ---------------------------------------------------------------- heavy vehicles (1/12 m voxels)
const S12 = 1 / 12;
function bigWheel(m, x0, cy, cz, r, face, rim = '#8a8a88', ww = false) { m.cylX(x0, cy, cz, r, 4, TYRE); if (ww) ringX(m, face, cy, cz, r * 0.62, r * 0.82, 1, WW); ringX(m, face, cy, cz, 0, r * 0.6, 1, rim); ringX(m, face, cy, cz, 0, r * 0.25, 1, CHROME); }
// 1940s open-cab pumper: Engine Co. No. 1. Red with gold trim, ladders, hose bed, brass bell.
defineProp('truck_fire', {
  size: [30, 36, 100], scale: S12, collide: true, cat: 'far',
  build(m) {
    const cx = 15, zr = 24, zf = 78, gold = '#d8b050', hose = '#c8b890', wood = '#c8a060';
    fillShape(m, cx, (z, y) => {
      let h = 0;
      if (z >= 3 && z <= 60 && y >= 7 && y <= 20) h = y === 20 ? 12 : 13;                     // body
      if (z > 60 && z <= 74 && y >= 7 && y <= 17) h = Math.max(h, 12);                          // cab tub (open)
      const ht = Math.round(21 - (z - 74) * 3 / 19);
      if (z > 74 && z <= 93 && y >= 10 && y <= ht) h = Math.max(h, y === ht ? 7 : 8);          // long hood
      if (z > 74 && z <= 93 && y >= 7 && y < 10) h = Math.max(h, 10);
      const e = ((z + 0.5 - (zf + 2)) / 15) ** 2 + ((y + 0.5 - 7) / 9.5) ** 2;
      if (e <= 1 && y >= 6 && z <= 94) h = Math.max(h, e > 0.8 ? 13 : 14);                    // front fenders
      const er = ((z + 0.5 - zr) / 10) ** 2 + ((y + 0.5 - 7) / 8.5) ** 2;
      if (er <= 1 && y >= 6) h = Math.max(h, 14);
      if (y >= 6 && y <= 7 && z > 34 && z < 66) h = Math.max(h, 14);                            // running boards
      return h;
    }, (x, y, z) => (y === 13 && Math.abs(x + 0.5 - cx) > 12) ? gold : (y <= 7 && Math.abs(x + 0.5 - cx) > 13) ? '#8a8a88' : RED);
    m.box(cx - 11, 12, 61, 22, 6, 13, 0); m.box(cx - 11, 11, 61, 22, 1, 13, '#3a3430');
    m.box(cx - 11, 12, 62, 22, 3, 5, '#2a2a2a'); m.box(cx - 11, 15, 61, 22, 5, 2, '#2a2a2a'); // bench seat
    m.box(cx - 12, 18, 72, 24, 1, 2, RED); for (let y = 19; y <= 25; y++) { m.box(cx - 12, y, 73, 1, 1, 1, CHROME); m.box(cx + 11, y, 73, 1, 1, 1, CHROME); m.box(cx - 11, y, 73, 22, 1, 1, y === 25 ? CHROME : '#5a7080'); }
    m.box(cx - 5, 16, 69, 1, 3, 1, '#2a2a2a'); ringX(m, cx - 5, 19, 67, 1, 2, 1, '#2a2a2a'); // steering wheel
    // grille, lights, bell, siren, bumper
    for (let y = 8; y <= 19; y++) for (let x = cx - 6; x <= cx + 5; x++) paintFront(m, x, y, x % 2 ? CHROME : DARK);
    headlights(m, [cx - 12, cx + 10], 15);
    m.box(cx - 14, 5, 95, 28, 3, 3, CHROME);
    m.cyl(cx - 7, 8, 96, 1.8, 3, CHROME); m.box(cx - 8, 11, 96, 2, 1, 2, CHROME); // siren
    m.box(cx + 5, 9, 96, 4, 4, 3, gold); m.box(cx + 6, 13, 97, 2, 2, 1, gold); m.box(cx + 6, 8, 96, 2, 1, 3, '#8a6a2a'); // bell
    m.box(cx - 1, 22, 74, 2, 2, 2, glow('#e02018', 0.7));
    // pump panel, hose bed, ladders
    m.box(cx - 13, 8, 58, 26, 12, 3, '#9a9a98'); for (const x of [cx - 13, cx + 12]) { m.box(x, 14, 59, 1, 3, 1, gold); m.box(x, 10, 58, 1, 2, 2, CHROME); }
    for (let z = 4; z < 42; z++) m.box(cx - 10, 21, z, 20, 2, 1, (z % 3) ? hose : '#b0a078');
    for (const x of [cx - 14, cx + 13]) { m.box(x, 21, 1, 1, 1, 90, wood); m.box(x, 24, 1, 1, 1, 90, wood); for (let z = 2; z < 91; z += 4) m.box(x, 22, z, 1, 2, 1, wood); m.box(x, 20, 20, 1, 1, 1, CHROME); m.box(x, 20, 70, 1, 1, 1, CHROME); }
    m.cylX(cx - 6, 24, 50, 3, 12, '#8a3a2a'); m.cylX(cx - 7, 24, 50, 1, 14, CHROME2); // booster reel
    for (let z = 8; z <= 56; z += 12) for (let y = 9; y <= 19; y++) paintSides(m, y, z, '#8a1810');
    for (let z = 10; z <= 55; z += 12) paintSides(m, 15, z + 5, CHROME);
    sideText(m, 'NO 1', 13, 67, gold);
    sideText(m, 'JBFD', 15, 30, gold);
    m.box(cx - 12, 5, 0, 24, 2, 3, CHROME2);
    for (const x of [cx - 12, cx + 11]) paintBack(m, x, 18, TAIL);
    for (const zc of [zr, zf]) arch(m, zc, 6, 7.5, 5, 24);
    for (const zc of [zr, zf]) { bigWheel(m, 1, 6, zc, 6.2, 1, '#c8c8c0'); bigWheel(m, 25, 6, zc, 6.2, 28, '#c8c8c0'); }
  },
});
// 1950s refuse packer: cab + rounded packer body, city green
defineProp('truck_garbage', {
  size: [30, 38, 92], scale: S12, collide: true, cat: 'far',
  build(m) {
    const cx = 15, g = '#2e4a36', g2 = '#243c2c', zr = 22, zf = 70;
    fillShape(m, cx, (z, y) => {
      let h = 0;
      if (z >= 6 && z <= 55 && y >= 8 && y <= 34) h = y >= 33 ? 11 : y >= 31 ? 13 : 14;          // packer body
      if (z >= 0 && z < 6 && y >= 6 && y <= 30 - (5 - z) * 2) h = Math.max(h, 13);              // rear hopper
      if (z > 55 && z <= 70 && y >= 7 && y <= 22) h = Math.max(h, 13);                           // cab
      const ht = Math.round(19 - (z - 70) * 2 / 17);
      if (z > 70 && z <= 87 && y >= 11 && y <= ht) h = Math.max(h, 8);
      if (z > 70 && z <= 87 && y >= 7 && y < 11) h = Math.max(h, 10);
      const e = ((z + 0.5 - (zf + 2)) / 15) ** 2 + ((y + 0.5 - 6) / 10) ** 2;
      if (e <= 1 && y >= 5 && z <= 88) h = Math.max(h, 14);
      return h;
    }, (x, y, z) => (z < 6 ? '#3a3a38' : y === 20 && z <= 55 ? '#d8d0b0' : g));
    cabin(m, cx, { yb: 22, yr: 31, z0: 57, z1: 58, z2: 66, z3: 69, h0: 12, h1: 11, body: g, roof: g, split: true, cw: 0 });
    for (let y = 8; y <= 16; y++) for (let x = cx - 7; x <= cx + 6; x++) paintFront(m, x, y, y % 2 ? CHROME : DARK);
    headlights(m, [cx - 12, cx + 10], 13);
    m.box(cx - 14, 5, 88, 28, 3, 3, '#8a8a88');
    for (let y = 8; y <= 30; y++) for (let x = cx - 12; x <= cx + 11; x++) if (y > 14) paintBack(m, x, y, (y + x) % 5 === 0 ? g2 : '#3a3a38');
    sideText(m, 'JUNIPER BAY', 26, 31, '#e8dcb0'); sideText(m, 'SANITATION', 13, 31, '#e8dcb0');
    for (const x of [cx - 13, cx + 12]) paintBack(m, x, 10, TAIL);
    for (const zc of [zr, zf]) arch(m, zc, 6, 7.5, 5, 24);
    for (const zc of [zr, zf]) { bigWheel(m, 1, 6, zc, 6.2, 1); bigWheel(m, 25, 6, zc, 6.2, 28); }
  },
});
// GM "old look" city transit bus, green & cream, ~10.3 m (1/12 m voxels). Front door on the right (+x) side.
defineProp('bus_city', {
  size: [32, 38, 126], scale: S12, collide: true, cat: 'far',
  build(m) {
    const cx = 16, grn = '#2e5a3a', grn2 = '#244a30', cr = '#e8dcb8', zr = 28, zf = 97;
    fillShape(m, cx, (z, y) => {
      if (z < 2 || z > 123 || y < 5 || y > 35) return 0;
      let h = 15;
      if (y >= 34) h = 13; else if (y >= 33) h = 14;
      if (z >= 122 && y > 28) h -= 1;
      if (z >= 123) h -= 1;
      if (z <= 2) h -= 1;
      return h;
    }, (x, y, z) => y <= 16 ? grn : y === 17 ? cr : y <= 28 ? cr : y <= 30 ? grn : cr);
    if (true) for (let y = 34; y <= 35; y++) for (let z = 120; z <= 123; z++) for (let x = 0; x < 32; x++) if (z - 119 > 36 - y) m.set(x, y, z, 0);
    // side windows
    for (let k = 0; k < 9; k++) { const z0 = 12 + k * 11; for (let z = z0; z < z0 + 8; z++) for (let y = 19; y <= 27; y++) paintSides(m, y, z, y === 23 ? cr : GLASS); }
    // doors on the right side: front (ahead of the front axle) and centre exit
    for (const [z0, z1] of [[106, 117], [58, 66]]) for (let z = z0; z <= z1; z++) for (let y = 5; y <= 28; y++) paintSides(m, y, z, (z === z0 || z === z1 || z === ((z0 + z1) >> 1)) ? grn2 : y > 12 ? GLASS : grn, 1);
    // front: windshield, destination sign, route number, lights
    for (let y = 18; y <= 29; y++) for (let x = cx - 14; x <= cx + 13; x++) paintFront(m, x, y, (x === cx - 1 || x === cx) ? cr : GLASS);
    for (let y = 30; y <= 34; y++) for (let x = cx - 13; x <= cx + 12; x++) paintFront(m, x, y, DARK);
    textFront(m, 'HARBOR', cx, 30, glow('#f0e0a0', 0.8));
    headlights(m, [cx - 13, cx + 11], 9);
    for (let x = cx - 8; x <= cx + 7; x++) for (const y of [6, 8, 10]) paintFront(m, x, y, CHROME);
    m.box(cx - 15, 4, 123, 30, 2, 2, '#8a8a88'); m.box(cx - 15, 4, 0, 30, 2, 2, '#8a8a88');
    // rear: engine louvres, small window, lights
    for (let y = 7; y <= 15; y += 2) for (let x = cx - 10; x <= cx + 9; x++) paintBack(m, x, y, grn2);
    for (let y = 23; y <= 28; y++) for (let x = cx - 8; x <= cx + 7; x++) paintBack(m, x, y, GLASS);
    for (const x of [cx - 14, cx + 13]) for (const y of [11, 12]) paintBack(m, x, y, TAIL);
    sideText(m, 'JUNIPER BAY TRANSIT', 11, 60, cr);
    for (const zc of [zr, zf]) arch(m, zc, 6, 7.5, 5, 26);
    for (const zc of [zr, zf]) { bigWheel(m, 2, 6, zc, 6.2, 2, '#b8b8b0'); bigWheel(m, 26, 6, zc, 6.2, 29, '#b8b8b0'); }
    m.box(cx - 3, 36, 30, 6, 1, 20, '#9a9a98'); // roof vent
  },
});
