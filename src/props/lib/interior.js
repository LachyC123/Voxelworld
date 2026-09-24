// Prop definitions: interior furniture & fittings. (See docs/PROPS.md for the authoring guide.)
// Conventions: 1 voxel = 1/16 m, origin = bottom centre, the "front" of the prop faces +z.
// Small table-top things use a finer grid (scale 1/32 or 1/64) so they keep their detail; wall-hung
// things (mirrors, pictures, wall clocks...) put their origin at the BACK (z=0) so they sit flush on a wall.
import { defineProp, lampLight } from '../props.js';

// A simple wooden kitchen/dining chair. Seat top at 7/16 m (0.44 m); the sitter faces +z.
defineProp('chair_wood', {
  size: [8, 15, 8], collide: [0.4, 0.45, 0.4],
  build(m) {
    const w = '#7a5234', d = '#5e3e26';
    for (const [x, z] of [[0, 0], [7, 0], [0, 7], [7, 7]]) m.box(x, 0, z, 1, 7, 1, d);
    m.box(0, 6, 0, 8, 1, 8, w);           // seat
    m.box(0, 7, 0, 1, 8, 1, d); m.box(7, 7, 0, 1, 8, 1, d); // back posts (at -z, behind the sitter)
    m.box(0, 11, 0, 8, 1, 1, w); m.box(0, 14, 0, 8, 1, 1, w); m.box(3, 8, 0, 2, 6, 1, w);
  },
});

// Dining table 1.5 x 0.9 m, top at 0.75 m, tinted cloth optional via tintA
defineProp('table_dining', {
  size: [24, 12, 14], collide: true,
  build(m) {
    const w = '#6e4a2e';
    m.box(0, 11, 0, 24, 1, 14, w);
    m.box(1, 10, 1, 22, 1, 12, '#5a3c24');
    for (const [x, z] of [[1, 1], [22, 1], [1, 12], [22, 12]]) m.box(x, 0, z, 1, 10, 1, '#5a3c24');
  },
});

// Door leaf: 1 m wide along +x from the hinge at x=0, 2.2 m tall, thin in z.
defineProp('door_wood', {
  size: [16, 35, 2], origin: [0, 0, 1], cat: 'interior',
  build(m) {
    const c = { tint: 1, shade: 0.5 };
    m.box(0, 0, 0, 16, 35, 2, c);
    m.box(2, 3, 0, 5, 12, 2, { tint: 1, shade: 0.42 }); m.box(9, 3, 0, 5, 12, 2, { tint: 1, shade: 0.42 });
    m.box(2, 18, 0, 5, 14, 2, { tint: 1, shade: 0.42 }); m.box(9, 18, 0, 5, 14, 2, { tint: 1, shade: 0.42 });
    m.box(13, 16, -1, 1, 1, 4, '#c9a24a');
  },
});
defineProp('door_glass', {
  size: [16, 35, 2], origin: [0, 0, 1], cat: 'interior',
  build(m) {
    const c = { tint: 1, shade: 0.5 };
    m.box(0, 0, 0, 16, 35, 2, c);
    m.box(2, 12, 0, 12, 20, 2, '#a8c8d0');
    m.box(13, 15, -1, 1, 1, 4, '#c9a24a');
  },
});

// Table lamp that lights its room when the room lights are on
defineProp('lamp_table', {
  size: [6, 10, 6], light: lampLight(0, 0.55, 0, [1.0, 0.78, 0.5], 4.5, 'room'),
  build(m) {
    m.box(2, 0, 2, 2, 1, 2, '#3a2a20'); m.box(2.5, 1, 2.5, 1, 4, 1, '#c9a24a');
    m.box(0, 5, 0, 6, 5, 6, { c: '#f0e2c0', emit: 0.5 });
  },
});

// ============================================================================================
// Shared palette & drawing helpers
// ============================================================================================
const WAL = '#5a3822', WAL_D = '#3f2716', WAL_L = '#6e4a2c';       // walnut
const MAH = '#4e2618', MAH_D = '#3a1a10', MAH_L = '#62321f';       // mahogany
const OAK = '#8a5e34', OAK_D = '#6c4828', OAK_L = '#9e7042';       // oak
const MAPLE = '#a8784a', MAPLE_D = '#8a5e36', MAPLE_L = '#b88a58';  // maple
const CHR = '#c3c8cd', CHR_L = '#eef2f5', CHR_D = '#868d94';       // chrome
const ENA = '#eeeae0', ENA_D = '#d4cebf', ENA_L = '#f8f6f0';       // white enamel / porcelain
const BRASS = '#c9a24a', BRASS_D = '#94732f', BRASS_L = '#e8cc78';
const BLK = '#201d1b', BLK_L = '#3b3632';                          // black lacquer / Bakelite
const IRON = '#35332f', IRON_L = '#4a4843';
const WHITE = '#f3f0e8', LINEN = '#e6dfcf', CREAM = '#eee2c4';
const GLASS = '#b4c8cf', GLASS_L = '#e2eef0';
const GREEN = '#3f6a36', GREEN_D = '#2c4e27', GREEN_L = '#5f8a48';
const FLAME = { c: '#ffcc66', emit: 1 };
const T = (s = 0.5) => ({ tint: 1, shade: s });       // per-house fabric / formica colour

// four identical legs at the corners of a rectangle
function legs4(m, x0, z0, x1, z1, y, h, col, w = 1, d = w) {
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) m.box(x, y, z, w, h, d, col);
}
// voxel line between two points (inclusive)
function line(m, x0, y0, z0, x1, y1, z1, col) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    m.set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), Math.round(z0 + (z1 - z0) * t), col);
  }
}
// horizontal disc / ring (xz plane), h tall; col may be fn(x, z, dx, dz, d)
function disc(m, cx, y, cz, r, h, col, r0 = -1) {
  for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r); x++) {
    const dx = x + 0.5 - cx, dz = z + 0.5 - cz, d = Math.hypot(dx, dz);
    if (d <= r && d > r0) { const c = typeof col === 'function' ? col(x, z, dx, dz, d) : col; if (c) m.box(x, y, z, 1, h, 1, c); }
  }
}
// horizontal ellipse (xz plane)
function oval(m, cx, y, cz, rx, rz, h, col, inner = -1) {
  for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz, d = Math.hypot(dx, dz);
    if (d <= 1 && d > inner) { const c = typeof col === 'function' ? col(x, z, d) : col; if (c) m.box(x, y, z, 1, h, 1, c); }
  }
}
// vertical disc in the xy plane (a plate / dial facing +z), depth d starting at z
function discZ(m, cx, cy, z, r, col, r0 = -1, d = 1) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r); x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, q = Math.hypot(dx, dy);
    if (q <= r && q > r0) { const c = typeof col === 'function' ? col(x, y, dx, dy, q) : col; if (c) m.box(x, y, z, 1, 1, d, c); }
  }
}
// vertical disc in the yz plane (a wheel / plate facing ±x), width w starting at x
function discX(m, x, cy, cz, r, col, r0 = -1, w = 1) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r); y++) for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r); z++) {
    const dz = z + 0.5 - cz, dy = y + 0.5 - cy, q = Math.hypot(dz, dy);
    if (q <= r && q > r0) { const c = typeof col === 'function' ? col(z, y, dz, dy, q) : col; if (c) m.box(x, y, z, w, 1, 1, c); }
  }
}
// ellipsoid; col may be fn(x, y, z, nx, ny, nz) returning a colour (or 0 to skip)
function ell(m, cx, cy, cz, rx, ry, rz, col) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
    if (dx * dx + dy * dy + dz * dz <= 1) { const c = typeof col === 'function' ? col(x, y, z, dx, dy, dz) : col; if (c) m.set(x, y, z, c); }
  }
}
// a drawer front (proud of the carcass at z) with a centred pull one voxel further out
function drawer(m, x, y, z, w, h, face, pull, pullW = 2) {
  m.box(x, y, z, w, h, 1, face);
  if (pull) m.box(x + Math.floor((w - pullW) / 2), y + Math.floor((h - 1) / 2), z + 1, pullW, 1, 1, pull);
}

// Book spine colours (muted cloth bindings) + a deterministic row filler that keeps faces cheap.
const BOOKS = ['#7a2a22', '#2b3b5c', '#2f4b33', '#a8875a', '#5b2331', '#b08a3a', '#4a3322', '#d6c9a8', '#2a2723', '#2d5b5b', '#8a4a2a', '#6b6a3c'];
const BOOK_PAT = [0, 3, 1, 1, 6, 2, 9, 4, 7, 0, 5, 10, 2, 8, 3, 11, 1, 6];
const BOOK_H = [0, 0, -1, 0, -1, 0, 0, -2, 0, -1, 0, 0, -1, -1, 0, -2];
// Books standing along x from x0..x1 on a shelf at y, spines at zf, backs at zb, max height hMax.
function bookRow(m, x0, x1, y, zb, zf, hMax, seed = 0) {
  for (let x = x0, i = seed; x <= x1; x++, i++) {
    const c = BOOKS[BOOK_PAT[i % BOOK_PAT.length]];
    const h = Math.max(2, hMax + BOOK_H[(i * 5 + seed) % BOOK_H.length]);
    const f = zf - ((i * 7 + seed) % 6 === 0 ? 1 : 0);
    m.box(x, y, zb, 1, h, f - zb + 1, c);
    if (i % 4 === 1 && h > 2) m.set(x, y + h - 2, f, BRASS); // gilt title band
  }
}
// A matching encyclopedia set: identical volumes (same colour => cheap), gilt bands at the same heights.
function bookSet(m, x0, n, y, zb, zf, h, col, col2, band = BRASS) {
  for (let i = 0; i < n; i++) m.box(x0 + i, y, zb, 1, h, zf - zb + 1, i % 2 ? col2 : col);
  m.box(x0, y + h - 2, zf, n, 1, 1, band); m.box(x0, y + 1, zf, n, 1, 1, band);
}

// ============================================================================================
// SEATING (the sitter faces +z; backs are at z=0)
// ============================================================================================

// 1950s dinette chair: chrome tube frame, tinted vinyl seat & back. Seat top 0.44 m.
defineProp('chair_kitchen', {
  size: [8, 15, 8], collide: [0.45, 0.44, 0.45],
  build(m) {
    const v = T(0.5), vd = T(0.4), vl = T(0.6);
    // legs, slightly splayed (foot one voxel further out), with dark glides
    for (const [x, z, fx, fz] of [[1, 1, 0, 0], [6, 1, 7, 0], [1, 6, 0, 7], [6, 6, 7, 7]]) {
      m.set(fx, 0, fz, CHR_D); m.box(fx, 1, fz, 1, 1, 1, CHR);
      m.box(x, 2, z, 1, 3, 1, CHR); m.set(x, 3, z, CHR_L);
    }
    m.box(1, 2, 6, 6, 1, 1, CHR); m.box(1, 2, 1, 6, 1, 1, CHR);          // stretchers
    m.box(0, 4, 0, 8, 1, 8, CHR_D);                                        // seat pan
    m.box(0, 5, 0, 8, 2, 8, v); m.box(1, 6, 1, 6, 1, 6, vl);              // vinyl cushion
    m.box(0, 5, 7, 8, 1, 1, vd); m.box(0, 5, 0, 1, 1, 8, vd); m.box(7, 5, 0, 1, 1, 8, vd); // piping shadow
    // chrome back uprights and a curved vinyl back pad
    m.box(0, 5, 0, 1, 9, 1, CHR); m.box(7, 5, 0, 1, 9, 1, CHR);
    m.set(0, 8, 0, CHR_L); m.set(7, 8, 0, CHR_L);
    m.box(0, 9, 0, 8, 5, 1, v); m.box(1, 10, 1, 6, 3, 1, v);
    m.box(1, 11, 1, 6, 1, 1, vl); m.box(0, 13, 0, 8, 1, 1, vl);
    m.clear(0, 13, 0, 1, 1, 1); m.clear(7, 13, 0, 1, 1, 1);
    m.box(1, 14, 0, 6, 1, 1, CHR);                                         // chrome crest
  },
});

// Swivel wooden office ("banker's") chair on a four-star caster base. Seat top 0.5 m.
defineProp('chair_office', {
  size: [10, 16, 10], collide: [0.6, 0.5, 0.6],
  build(m) {
    // base: four legs with casters
    m.box(1, 1, 4, 8, 1, 2, OAK_D); m.box(4, 1, 1, 2, 1, 8, OAK_D);
    for (const [x, z] of [[1, 4], [8, 4], [1, 5], [8, 5], [4, 1], [5, 1], [4, 8], [5, 8]]) m.set(x, 0, z, BLK);
    m.box(0, 1, 4, 1, 1, 2, OAK_D); m.box(9, 1, 4, 1, 1, 2, OAK_D); m.box(4, 1, 0, 2, 1, 1, OAK_D); m.box(4, 1, 9, 2, 1, 1, OAK_D);
    m.box(4, 2, 4, 2, 3, 2, IRON); m.box(3, 5, 3, 4, 1, 4, IRON_L);          // spindle + tilt iron
    // saddle seat
    m.box(0, 6, 1, 10, 2, 9, OAK); m.box(1, 7, 2, 8, 1, 7, OAK_L);
    m.clear(0, 7, 9, 1, 1, 1); m.clear(9, 7, 9, 1, 1, 1);
    m.box(0, 6, 9, 10, 1, 1, OAK_D);
    // arm posts + arms
    for (const x of [0, 9]) { m.box(x, 8, 8, 1, 3, 1, OAK_D); m.box(x, 11, 2, 1, 1, 8, OAK); m.box(x, 8, 4, 1, 3, 1, OAK_D); }
    // curved back: crest rail + spindles + central splat
    m.box(1, 13, 0, 8, 2, 1, OAK); m.box(0, 12, 1, 1, 3, 1, OAK); m.box(9, 12, 1, 1, 3, 1, OAK);
    m.box(1, 15, 0, 8, 1, 1, OAK_L);
    for (const x of [1, 3, 6, 8]) m.box(x, 8, 1, 1, 5, 1, OAK_D);
    m.box(4, 8, 1, 2, 5, 1, OAK_L);
  },
});

// Steel folding chair (church-hall beige). Seat top 0.44 m.
defineProp('chair_folding', {
  size: [7, 14, 8], collide: [0.42, 0.44, 0.45],
  build(m) {
    const f = '#7a6c55', s = '#9a8a6c', sl = '#ab9c7e';
    for (const x of [0, 6]) {
      m.box(x, 0, 1, 1, 6, 1, f); m.box(x, 6, 0, 1, 8, 1, f);             // rear leg -> back post
      line(m, x, 0, 7, x, 6, 5, f);                                         // front leg, raked
      m.set(x, 0, 7, BLK); m.set(x, 0, 1, BLK);
    }
    m.box(0, 1, 7, 7, 1, 1, f); m.box(0, 1, 1, 7, 1, 1, f);                 // braces
    m.box(0, 6, 1, 7, 1, 6, s); m.box(1, 6, 2, 5, 1, 4, sl);              // seat pan
    m.clear(0, 6, 6, 1, 1, 1); m.clear(6, 6, 6, 1, 1, 1);
    m.box(1, 10, 0, 5, 3, 1, s); m.box(1, 12, 0, 5, 1, 1, sl);            // back band
  },
});

// Upholstered wing armchair (a New England favourite). Tint A fabric, seat 0.44 m, 0.81 m wide.
defineProp('armchair', {
  size: [13, 16, 13], collide: [0.8, 0.44, 0.8],
  build(m) {
    const b = T(0.45), s = T(0.48), top = T(0.57), dk = T(0.38), cu = T(0.52);
    legs4(m, 1, 1, 11, 11, 0, 2, WAL_D);
    m.box(0, 2, 1, 13, 3, 12, b);                                         // base
    m.box(0, 2, 12, 13, 1, 1, dk);                                        // welt at the skirt
    m.box(0, 2, 0, 13, 13, 3, b);                                         // back
    m.box(1, 15, 0, 11, 1, 3, b); m.clear(0, 14, 0, 1, 1, 3); m.clear(12, 14, 0, 1, 1, 3);
    m.box(2, 15, 0, 9, 1, 2, top);
    for (const x0 of [0, 10]) {                                           // rolled arms
      const xo = x0 === 0 ? 0 : 12;
      m.box(x0 + (x0 ? 0 : 1), 2, 1, 2, 6, 12, s);
      m.box(x0, 7, 1, 3, 3, 12, s); m.box(x0, 9, 1, 3, 1, 12, top);
      m.clear(xo, 9, 1, 1, 1, 12);
      m.box(x0, 7, 12, 3, 3, 1, dk); m.set(x0 + 1, 8, 12, top);           // scroll face
      m.box(xo, 10, 2, 1, 4, 3, s); m.box(xo, 10, 5, 1, 2, 1, s);         // wings
      m.box(xo, 14, 2, 1, 1, 2, top);
    }
    m.box(3, 5, 3, 7, 2, 10, cu); m.box(3, 6, 3, 7, 1, 9, top);          // seat cushion
    m.box(3, 6, 12, 7, 1, 1, dk);                                         // front piping
    m.box(3, 7, 3, 7, 7, 1, cu); m.box(3, 13, 3, 7, 1, 1, top);          // back cushion
    for (const [x, y] of [[5, 11], [7, 11], [6, 9]]) m.set(x, y, 3, dk);  // tufting buttons
    m.box(5, 15, 1, 3, 1, 1, LINEN);                                      // antimacassar
  },
});

// Sofa / loveseat builder: rolled arms, n seat cushions, tint A fabric. Seat top 0.44 m.
function sofaBuild(m, W, n) {
  const D = 14, b = T(0.45), s = T(0.48), top = T(0.57), dk = T(0.38), cu = T(0.52);
  for (const x of [1, W - 2]) for (const z of [1, D - 2]) m.box(x, 0, z, 1, 2, 1, WAL_D);
  m.box(0, 2, 1, W, 3, D - 1, b);
  m.box(0, 2, D - 1, W, 1, 1, dk);
  m.box(0, 2, 0, W, 12, 3, b);
  m.box(1, 14, 0, W - 2, 1, 3, b); m.box(2, 14, 0, W - 4, 1, 2, top);
  for (const x0 of [0, W - 3]) {
    const xo = x0 === 0 ? 0 : W - 1;
    m.box(x0 + (x0 ? 0 : 1), 2, 1, 2, 6, D - 1, s);
    m.box(x0, 7, 1, 3, 3, D - 1, s); m.box(x0, 9, 1, 3, 1, D - 1, top);
    m.clear(xo, 9, 1, 1, 1, D - 1);
    m.box(x0, 7, D - 1, 3, 3, 1, dk); m.set(x0 + 1, 8, D - 1, top);
    m.box(x0 + (x0 ? 0 : 1), 9, 5, 2, 1, 4, LINEN);                     // arm doilies
  }
  const inner = W - 6;
  m.box(3, 5, 3, inner, 2, D - 3, cu); m.box(3, 6, 3, inner, 1, D - 4, top);
  m.box(3, 6, D - 1, inner, 1, 1, dk);
  m.box(3, 7, 3, inner, 6, 2, cu); m.box(3, 12, 3, inner, 1, 2, top);
  for (let k = 1; k < n; k++) {                                          // cushion seams
    const x = 3 + Math.round(inner * k / n);
    m.box(x, 6, 3, 1, 1, D - 3, dk); m.box(x, 5, D - 1, 1, 1, 1, dk); m.box(x, 7, 4, 1, 6, 1, dk);
  }
  m.box(Math.floor(W / 2) - 2, 14, 1, 4, 1, 1, LINEN);                  // antimacassar
}
defineProp('sofa', {
  size: [32, 16, 14], collide: [2.0, 0.44, 0.88],
  build(m) {
    sofaBuild(m, 32, 3);
    // a gold throw pillow leaning in the corner
    m.box(4, 7, 5, 4, 4, 1, '#c8a45a'); m.box(5, 8, 6, 2, 2, 1, '#d8b86c'); m.set(4, 10, 5, 0); m.set(7, 10, 5, 0);
  },
});
defineProp('loveseat', {
  size: [22, 16, 14], collide: [1.4, 0.44, 0.88],
  build(m) { sofaBuild(m, 22, 2); },
});

// Ladder-back maple rocking chair on curved runners, with a tinted tie-on cushion. Seat 0.44 m.
defineProp('rocking_chair', {
  size: [10, 19, 16], collide: [0.6, 0.44, 0.9],
  build(m) {
    const w = MAPLE, d = MAPLE_D, l = MAPLE_L;
    for (const x of [1, 8]) {
      for (let z = 0; z < 16; z++) { const y = Math.round((z - 7.5) * (z - 7.5) / 30); m.box(x, y, z, 1, 2, 1, d); }
      m.box(x, 1, 11, 1, 5, 1, w);                                        // front leg
      m.box(x, 6, 11, 1, 4, 1, w);                                        // arm post
      m.box(x, 1, 4, 1, 6, 1, w);                                         // rear leg
      m.box(x, 6, 3, 1, 7, 1, w); m.box(x, 12, 2, 1, 6, 1, w);            // raked back post
      m.set(x, 18, 2, l);                                                 // finial
      m.box(x, 10, 3, 1, 1, 10, l);                                       // arm
      m.box(x, 3, 5, 1, 1, 6, d);                                         // side stretcher
    }
    m.box(2, 3, 11, 6, 1, 1, d);
    m.box(1, 5, 3, 8, 1, 9, w); m.box(2, 5, 4, 6, 1, 7, l);               // seat
    m.box(2, 6, 4, 6, 1, 7, T(0.5)); m.box(3, 6, 5, 4, 1, 5, T(0.58));    // cushion
    for (const [y, z] of [[9, 3], [12, 2], [14, 2], [16, 2]]) m.box(2, y, z, 6, 1, 1, y === 16 ? l : w); // ladder slats
  },
});

// Tall kitchen / soda-fountain stool: chrome legs + foot ring, tinted vinyl seat 0.69 m.
defineProp('stool_tall', {
  size: [7, 11, 7], collide: [0.4, 0.69, 0.4],
  build(m) {
    for (const [x, z, fx, fz] of [[1, 1, 0, 0], [5, 1, 6, 0], [1, 5, 0, 6], [5, 5, 6, 6]]) {
      m.set(fx, 0, fz, BLK); m.box(fx, 1, fz, 1, 2, 1, CHR); m.box(x, 3, z, 1, 5, 1, CHR); m.set(x, 5, z, CHR_L);
    }
    m.box(1, 3, 1, 5, 1, 1, CHR); m.box(1, 3, 5, 5, 1, 1, CHR); m.box(1, 3, 1, 1, 1, 5, CHR); m.box(5, 3, 1, 1, 1, 5, CHR);
    disc(m, 3.5, 8, 3.5, 3.1, 1, CHR);
    disc(m, 3.5, 9, 3.5, 3.6, 2, T(0.46)); disc(m, 3.5, 10, 3.5, 2.6, 1, T(0.58));
  },
});

// Walnut piano bench with hinged lid and sheet music peeking out. Seat top 0.5 m.
defineProp('piano_bench', {
  size: [12, 8, 6], collide: [0.75, 0.5, 0.38],
  build(m) {
    legs4(m, 1, 1, 10, 4, 0, 5, WAL_D);
    m.box(1, 5, 1, 10, 2, 4, WAL);
    m.box(0, 7, 0, 12, 1, 6, WAL_L); m.box(0, 6, 5, 12, 1, 1, WAL);
    m.box(1, 2, 2, 10, 1, 2, WAL_D);                                       // stretcher
    m.box(3, 6, 5, 4, 1, 1, '#efe6d0');                                    // sheet music under the lid
    m.set(5, 7, 5, BRASS);                                                 // lid pull
  },
});

// Maple high chair with a cream tray (and a little cup). Seat 0.62 m.
defineProp('highchair', {
  size: [9, 18, 10], collide: [0.55, 0.62, 0.6],
  build(m) {
    const w = MAPLE, d = MAPLE_D, l = MAPLE_L;
    line(m, 0, 0, 0, 2, 9, 2, w); line(m, 8, 0, 0, 6, 9, 2, w);
    line(m, 0, 0, 9, 2, 9, 7, w); line(m, 8, 0, 9, 6, 9, 7, w);
    m.box(1, 3, 1, 7, 1, 1, d); m.box(1, 3, 8, 7, 1, 1, d);                // stretchers
    m.box(1, 5, 8, 7, 1, 2, l);                                            // footrest
    m.box(2, 9, 2, 5, 1, 6, w); m.box(3, 10, 3, 3, 1, 4, T(0.55));        // seat + pad
    m.box(2, 10, 2, 1, 8, 1, w); m.box(6, 10, 2, 1, 8, 1, w);              // back posts
    m.box(2, 13, 2, 5, 1, 1, l); m.box(2, 16, 2, 5, 2, 1, l); m.box(4, 11, 2, 1, 2, 1, d);
    m.set(4, 17, 3, '#e89aa8');                                            // bunny decal
    m.box(2, 12, 3, 1, 1, 5, w); m.box(6, 12, 3, 1, 1, 5, w);              // arms
    m.box(1, 13, 7, 7, 1, 3, CREAM); m.box(1, 14, 9, 7, 1, 1, '#d8ccac');  // tray + lip
    m.box(6, 14, 7, 1, 2, 1, '#e05a4a');                                   // cup
  },
});

// Mahogany dining chair with a tinted drop-in upholstered seat and back panel. Seat 0.44 m.
defineProp('chair_upholstered_dining', {
  size: [8, 16, 8], collide: [0.45, 0.44, 0.45],
  build(m) {
    m.box(0, 0, 7, 1, 5, 1, MAH_D); m.box(7, 0, 7, 1, 5, 1, MAH_D);        // front legs
    m.box(0, 0, 0, 1, 15, 1, MAH_D); m.box(7, 0, 0, 1, 15, 1, MAH_D);     // rear legs -> back posts
    m.box(0, 1, 0, 1, 1, 8, MAH); m.box(7, 1, 0, 1, 1, 8, MAH);           // side stretchers
    m.box(0, 5, 0, 8, 1, 8, MAH);                                          // seat rail
    m.box(0, 6, 1, 8, 1, 7, T(0.48)); m.box(1, 6, 2, 6, 1, 5, T(0.57));   // drop-in seat
    m.box(0, 6, 7, 8, 1, 1, T(0.42));
    m.box(0, 8, 0, 8, 1, 1, MAH); m.box(1, 9, 0, 6, 5, 1, T(0.5)); m.set(3, 11, 0, T(0.4)); m.set(4, 11, 0, T(0.4));
    m.box(0, 14, 0, 8, 1, 1, MAH); m.box(1, 15, 0, 6, 1, 1, MAH_L);        // shaped crest rail
  },
});

// ============================================================================================
// TABLES & DESKS (desk drawers face +z, i.e. the sitter stands/sits on the +z side)
// ============================================================================================

// Chrome-edged dinette table, tinted formica top with a boomerang pattern. 1.13 x 0.75 m, top 0.75 m.
defineProp('table_kitchen', {
  size: [18, 12, 12], collide: true,
  build(m) {
    m.box(0, 10, 0, 18, 1, 12, CHR); m.box(0, 11, 0, 18, 1, 12, CHR_L);   // ribbed chrome band
    m.box(1, 11, 1, 16, 1, 10, T(0.5));
    // boomerangs & flecks (a few voxels, same two shades)
    for (const [x, z, a] of [[3, 3, 0], [9, 7, 1], [13, 3, 0], [5, 8, 1], [11, 2, 1], [15, 8, 0]]) {
      const c = a ? T(0.62) : T(0.38);
      m.set(x, 11, z, c); m.set(x + 1, 11, z, c); m.set(x + 1, 11, z + 1, c);
    }
    for (const [x, z] of [[7, 4], [2, 6], [14, 6], [10, 9], [6, 2]]) m.set(x, 11, z, T(0.62));
    m.box(1, 9, 1, 16, 1, 10, CHR_D);                                      // apron
    for (const [x, z] of [[1, 1], [16, 1], [1, 10], [16, 10]]) {
      m.set(x, 0, z, BLK); m.box(x, 1, z, 1, 8, 1, CHR); m.set(x, 6, z, CHR_L);
    }
  },
});

// Round pedestal parlour / cafe table, 0.8 m across, top 0.75 m.
defineProp('table_round', {
  size: [13, 12, 13], collide: true,
  build(m) {
    disc(m, 6.5, 11, 6.5, 6.6, 1, OAK); disc(m, 6.5, 11, 6.5, 5.2, 1, OAK_L);
    disc(m, 6.5, 10, 6.5, 6.0, 1, OAK_D);
    disc(m, 6.5, 2, 6.5, 1.3, 8, OAK_D);                                  // turned pedestal
    disc(m, 6.5, 4, 6.5, 1.9, 2, OAK); disc(m, 6.5, 8, 6.5, 1.6, 1, OAK);
    m.box(1, 0, 6, 11, 1, 1, OAK_D); m.box(6, 0, 1, 1, 1, 11, OAK_D);     // four splayed feet
    m.box(3, 1, 6, 7, 1, 1, OAK_D); m.box(6, 1, 3, 1, 1, 7, OAK_D);
    for (const [x, z] of [[1, 6], [11, 6], [6, 1], [6, 11]]) m.set(x, 0, z, BRASS_D);
  },
});

// Low mid-century coffee table with a magazine shelf. 1.13 x 0.56 m, top 0.44 m.
defineProp('table_coffee', {
  size: [18, 7, 9], collide: true,
  build(m) {
    m.box(0, 6, 0, 18, 1, 9, WAL); m.box(1, 6, 1, 16, 1, 7, WAL_L);
    m.clear(0, 6, 0, 1, 1, 1); m.clear(17, 6, 0, 1, 1, 1); m.clear(0, 6, 8, 1, 1, 1); m.clear(17, 6, 8, 1, 1, 1);
    m.box(1, 5, 1, 16, 1, 7, WAL_D);
    for (const [x, z, fx, fz] of [[1, 1, 0, 0], [16, 1, 17, 0], [1, 7, 0, 8], [16, 7, 17, 8]]) {
      m.box(fx, 0, fz, 1, 2, 1, WAL_D); m.box(x, 2, z, 1, 3, 1, WAL_D); m.set(fx, 0, fz, BRASS);
    }
    m.box(1, 2, 1, 16, 1, 7, WAL);                                         // shelf
    m.box(3, 3, 2, 4, 1, 5, '#f0ece0'); m.box(3, 3, 2, 4, 1, 1, '#c8302a'); m.set(3, 3, 3, '#c8302a'); // LIFE magazine
    m.box(8, 3, 3, 5, 1, 4, '#dcd6c4'); m.box(9, 3, 4, 3, 1, 1, '#8a867a'); // folded newspaper
  },
});

// Small mahogany end table with a drawer and lower shelf. Top 0.63 m.
defineProp('table_side', {
  size: [8, 10, 9], collide: [0.5, 0.63, 0.5],
  build(m) {
    m.box(0, 9, 0, 8, 1, 8, MAH_L); m.box(0, 8, 0, 8, 1, 8, MAH);
    legs4(m, 0, 0, 7, 7, 0, 8, MAH_D);
    m.box(1, 6, 1, 6, 2, 6, MAH); drawer(m, 1, 6, 7, 6, 2, MAH_L, BRASS, 1);
    m.box(1, 2, 1, 6, 1, 6, MAH);                                          // shelf
    m.box(2, 3, 2, 4, 1, 3, BOOKS[1]); m.box(2, 4, 2, 3, 1, 3, BOOKS[0]);  // two books on the shelf
  },
});

// Folding card table with green felt and a deck of cards. 0.88 m square, top 0.75 m.
defineProp('table_card', {
  size: [14, 13, 14], collide: [0.88, 0.75, 0.88],
  build(m) {
    m.box(0, 10, 0, 14, 2, 14, '#2a2420'); m.box(1, 11, 1, 12, 1, 12, '#2f6a3e');
    m.box(2, 11, 2, 10, 1, 10, '#347444');
    for (const [x, z] of [[1, 1], [12, 1], [1, 12], [12, 12]]) { m.box(x, 0, z, 1, 10, 1, '#4a403a'); m.set(x, 0, z, BLK); }
    m.box(1, 9, 1, 3, 1, 1, '#4a403a'); m.box(1, 9, 12, 3, 1, 1, '#4a403a');      // leg brackets
    m.box(9, 12, 3, 2, 1, 3, WHITE); m.set(9, 12, 3, '#c83a3a');                   // deck
    m.box(3, 12, 9, 1, 1, 2, WHITE); m.set(4, 12, 10, WHITE); m.set(3, 12, 10, '#c83a3a'); // a dealt hand
  },
});

// Oak double-pedestal desk with a green leather inset. 1.31 x 0.75 m, top 0.75 m. Drawers face +z.
defineProp('desk_wood', {
  size: [21, 12, 12], collide: [1.31, 0.75, 0.75],
  build(m) {
    m.box(0, 11, 0, 21, 1, 11, OAK_L); m.box(3, 11, 2, 15, 1, 7, '#2f5a38');
    m.box(4, 11, 3, 13, 1, 5, '#35643e');
    m.box(0, 10, 0, 21, 1, 11, OAK);
    for (const x0 of [0, 13]) {
      m.box(x0, 0, 0, 8, 1, 11, OAK_D);                                    // plinth
      m.box(x0 + 1, 1, 1, 6, 9, 9, OAK_D);
      for (const y of [1, 4, 7]) drawer(m, x0 + 1, y, 10, 6, 2, OAK, BRASS, 2);
    }
    m.box(8, 8, 1, 5, 2, 9, OAK_D); drawer(m, 8, 8, 10, 5, 2, OAK, BRASS, 1); // centre drawer
    m.box(8, 1, 1, 5, 7, 1, OAK);                                          // modesty panel
  },
});

// Steel office desk (grey-green) with linoleum top, blotter, in/out tray. 1.38 x 0.75 m, top 0.75 m.
defineProp('desk_office', {
  size: [22, 14, 12], collide: [1.38, 0.75, 0.75],
  build(m) {
    const st = '#6f7b73', sd = '#56605a', sl = '#86928a';
    m.box(0, 11, 0, 22, 1, 12, CHR_D); m.box(1, 11, 1, 20, 1, 10, '#3e4a44');
    m.box(6, 11, 4, 10, 1, 6, '#2f5a3a'); for (const [x, z] of [[6, 4], [15, 4], [6, 9], [15, 9]]) m.set(x, 11, z, '#5a3a22'); // blotter
    m.box(0, 10, 0, 22, 1, 11, sd);
    // right pedestal: 3 drawers, left: 2
    m.box(14, 0, 0, 8, 10, 10, st); m.box(0, 0, 0, 8, 10, 10, st);
    m.box(14, 0, 10, 8, 1, 1, sd); m.box(0, 0, 10, 8, 1, 1, sd);
    for (const [x0, ys] of [[14, [[1, 3], [4, 3], [7, 3]]], [0, [[1, 5], [7, 3]]]]) {
      for (const [y, h] of ys) {
        const py = y + Math.floor((h - 2) / 2);
        m.box(x0 + 1, y, 10, 6, h - 1, 1, sl);
        m.box(x0 + 3, py, 11, 2, 1, 1, CHR);                              // pull
        m.box(x0 + 3, py + 1, 10, 2, 1, 1, WHITE);                        // label card
      }
    }
    m.box(8, 8, 0, 6, 2, 10, sd); m.box(9, 8, 10, 4, 1, 1, sl); m.box(10, 8, 11, 2, 1, 1, CHR); // pencil drawer
    m.box(8, 1, 0, 6, 7, 1, st);                                           // modesty panel
    // wire in/out tray with papers, and a pen stand
    m.box(1, 12, 1, 4, 1, 3, '#8a6a42'); m.box(1, 13, 1, 4, 1, 3, '#f0ece0'); m.box(2, 13, 2, 2, 1, 1, '#d8d2c0');
    m.box(18, 12, 2, 2, 1, 1, BLK); line(m, 18, 13, 2, 17, 13, 3, BLK_L);
  },
});

// Lady's slant-front writing desk (secretary), lid open with pigeonholes, letters and an inkwell.
defineProp('writing_desk', {
  size: [13, 17, 11], collide: [0.81, 1.06, 0.62],
  build(m) {
    for (const [x, z, fx, fz] of [[1, 1, 0, 1], [11, 1, 12, 1], [1, 6, 0, 7], [11, 6, 12, 7]]) {
      m.box(x, 1, z, 1, 5, 1, MAH_D); m.set(fx, 0, fz, MAH_D); m.set(x, 0, z, MAH_D); m.set(fx, 5, fz, MAH);
    }
    m.box(0, 6, 0, 13, 5, 8, MAH);
    drawer(m, 1, 6, 8, 11, 2, MAH_L, BRASS, 2); drawer(m, 1, 8, 8, 11, 2, MAH_L, BRASS, 2);
    // open fall-front writing surface on lopers
    m.box(0, 11, 0, 13, 1, 10, MAH); m.box(2, 11, 5, 9, 1, 4, '#2e5a3a');
    m.box(1, 10, 8, 1, 1, 2, MAH_D); m.box(11, 10, 8, 1, 1, 2, MAH_D);
    // slanted sides + gallery of pigeonholes
    for (const [y, d] of [[12, 7], [13, 6], [14, 6], [15, 5], [16, 4]]) { m.box(0, y, 0, 1, 1, d, MAH); m.box(12, y, 0, 1, 1, d, MAH); }
    m.box(0, 16, 0, 13, 1, 4, MAH_L); m.box(1, 12, 0, 11, 4, 1, MAH_D);
    m.box(1, 14, 1, 11, 1, 3, MAH); m.box(4, 12, 1, 1, 4, 3, MAH); m.box(8, 12, 1, 1, 4, 3, MAH);
    m.box(1, 12, 1, 3, 2, 3, MAH_L); m.set(2, 12, 4, BRASS);               // little drawers
    m.box(9, 12, 1, 3, 2, 3, MAH_L); m.set(10, 12, 4, BRASS);
    m.box(5, 12, 2, 1, 2, 2, '#efe6d2'); m.box(6, 12, 2, 1, 1, 2, '#d8e0ec'); // letters in the cubbies
    m.box(2, 15, 2, 2, 1, 1, '#efe6d2'); m.box(9, 15, 2, 1, 1, 2, '#e8d8c8');
    // inkwell, pen and a letter on the leather
    m.set(10, 12, 6, BLK); m.set(10, 13, 6, BRASS); line(m, 9, 12, 8, 7, 12, 7, '#1e2a4a');
    m.box(3, 12, 6, 3, 1, 2, '#f2eee4'); m.set(4, 12, 6, '#8a8680');
  },
});

// Mahogany dining-room sideboard / buffet with lace runner. 1.5 x 0.56 m, top 0.88 m.
defineProp('sideboard', {
  size: [24, 16, 9], collide: [1.5, 0.88, 0.56],
  build(m) {
    for (const x of [0, 22]) for (const z of [0, 6]) m.box(x, 0, z, 2, 1, 2, MAH_D);   // bracket feet
    m.box(0, 1, 0, 24, 12, 7, MAH);
    m.box(0, 1, 7, 24, 1, 1, MAH_D);
    m.box(0, 13, 0, 24, 1, 8, MAH_L); m.box(1, 12, 7, 22, 1, 1, MAH_D);
    for (const x0 of [1, 16]) {                                            // cupboard doors, raised panels
      m.box(x0, 2, 7, 7, 10, 1, MAH_L); m.box(x0 + 1, 3, 7, 5, 8, 1, MAH);
      m.box(x0 + 2, 4, 7, 3, 6, 1, MAH_L);
    }
    m.set(7, 7, 8, BRASS); m.set(16, 7, 8, BRASS); m.set(7, 6, 8, BLK); m.set(16, 6, 8, BLK);
    for (const y of [2, 6, 9]) { m.box(9, y, 7, 6, y === 9 ? 3 : 3, 1, MAH_L); m.box(10, y + 1, 8, 4, 1, 1, BRASS); m.set(11, y + 1, 8, BRASS_D); m.set(12, y + 1, 8, BRASS_D); }
    m.box(0, 12, 7, 24, 1, 1, MAH_D);
    m.box(4, 13, 2, 16, 1, 4, WHITE); m.box(5, 13, 3, 14, 1, 2, LINEN);    // lace runner (flush)
    m.box(1, 14, 0, 22, 1, 1, MAH); m.box(3, 15, 0, 18, 1, 1, MAH_L);      // back gallery
    m.box(0, 14, 0, 1, 1, 2, MAH_L); m.box(23, 14, 0, 1, 1, 2, MAH_L);
  },
});

// Roll-top desk (extra): oak, tambour rolled up, pigeonholes. 1.31 m wide, writing surface 0.75 m.
defineProp('desk_rolltop', {
  size: [21, 19, 12], collide: [1.31, 1.19, 0.75],
  build(m) {
    for (const x0 of [0, 13]) {
      m.box(x0, 0, 0, 8, 1, 10, OAK_D); m.box(x0 + 1, 1, 1, 6, 9, 8, OAK_D);
      for (const y of [1, 4, 7]) drawer(m, x0 + 1, y, 9, 6, 2, OAK, BRASS, 2);
    }
    m.box(0, 10, 0, 21, 2, 11, OAK); m.box(0, 11, 1, 21, 1, 10, OAK_L);
    m.box(8, 8, 1, 5, 2, 8, OAK_D); drawer(m, 8, 8, 9, 5, 2, OAK, BRASS, 1);
    // S-curved sides and the tambour housing
    for (const [y, z0, d] of [[12, 0, 7], [13, 0, 6], [14, 0, 6], [15, 0, 5], [16, 0, 5], [17, 0, 4]]) { m.box(0, y, z0, 1, 1, d, OAK); m.box(20, y, z0, 1, 1, d, OAK); }
    m.box(0, 18, 0, 21, 1, 5, OAK_L); m.box(1, 16, 0, 19, 2, 4, OAK);
    for (let x = 1; x < 20; x += 2) m.box(x, 16, 4, 1, 2, 1, OAK_D);        // tambour slats
    m.box(1, 12, 0, 19, 4, 1, OAK_D);
    m.box(1, 14, 1, 19, 1, 3, OAK); for (const x of [5, 10, 15]) m.box(x, 12, 1, 1, 4, 3, OAK);
    m.box(2, 12, 1, 2, 1, 2, '#efe6d2'); m.box(7, 15, 2, 2, 1, 1, '#efe6d2'); m.box(12, 12, 2, 1, 2, 2, '#e0d4bc');
    m.box(8, 12, 4, 5, 1, 3, '#f2eee4'); m.set(14, 12, 5, BLK);
  },
});

// ============================================================================================
// BEDS (head of the bed at -z / z=0, foot at +z; mattress top ~0.56 m)
// ============================================================================================

// Maple spool ("Jenny Lind") single bed with a tinted chenille bedspread. 0.94 x 2.0 m.
defineProp('bed_single', {
  size: [15, 17, 32], collide: true,
  build(m) {
    const w = MAPLE, d = MAPLE_D, l = MAPLE_L;
    // spool-turned posts: alternate light/dark every voxel
    const post = (x, z, h) => { for (let y = 0; y < h; y++) m.set(x, y, z, y % 2 ? l : w); m.set(x, h, z, l); };
    post(0, 0, 16); post(14, 0, 16); post(0, 31, 11); post(14, 31, 11);
    for (const [z, y0, y1] of [[0, 8, 15], [31, 6, 10]]) {             // headboard / footboard
      m.box(1, y0, z, 13, 1, 1, w); m.box(1, y1, z, 13, 1, 1, l);
      for (let x = 2; x <= 12; x += 2) for (let y = y0 + 1; y < y1; y++) m.set(x, y, z, y % 2 ? d : w);
    }
    m.box(1, 3, 1, 1, 2, 30, d); m.box(13, 3, 1, 1, 2, 30, d);            // side rails
    m.box(2, 3, 1, 11, 3, 30, '#d9d0bc'); m.box(2, 4, 1, 11, 1, 30, '#c9bfa8'); // box spring (ticking)
    m.box(2, 6, 1, 11, 3, 30, WHITE);                                      // mattress
    // chenille bedspread over the mattress, draping down the sides and foot
    const s = T(0.52), tuft = T(0.64);
    m.box(1, 8, 8, 13, 1, 23, s); m.box(1, 4, 8, 1, 4, 23, s); m.box(13, 4, 8, 1, 4, 23, s); m.box(1, 4, 30, 13, 4, 1, s);
    for (let x = 3; x <= 11; x += 2) m.box(x, 8, 12, 1, 1, 17, tuft);       // tufted rows
    for (const z of [14, 20, 26]) m.box(1, 5, z, 1, 3, 1, tuft), m.box(13, 5, z, 1, 3, 1, tuft);
    m.box(1, 7, 30, 13, 1, 1, tuft);
    m.box(1, 8, 7, 13, 1, 2, WHITE); m.box(1, 5, 7, 1, 3, 1, WHITE); m.box(13, 5, 7, 1, 3, 1, WHITE); // sheet turn-down
    m.box(3, 9, 2, 9, 2, 4, WHITE); m.box(4, 10, 3, 7, 1, 2, ENA_L);       // pillow
    m.clear(3, 10, 2, 1, 1, 1); m.clear(11, 10, 2, 1, 1, 1); m.clear(3, 10, 5, 1, 1, 1); m.clear(11, 10, 5, 1, 1, 1);
  },
});

// Walnut double bed: carved headboard, patchwork quilt (tint A), two pillows. 1.38 x 2.0 m.
defineProp('bed_double', {
  size: [22, 21, 32], collide: true,
  build(m) {
    // posts with finials
    for (const x of [0, 20]) {
      m.box(x, 0, 0, 2, 19, 2, WAL_D); m.box(x, 19, 0, 2, 1, 2, WAL_L);
      m.box(x, 0, 30, 2, 13, 2, WAL_D); m.box(x, 13, 30, 2, 1, 2, WAL_L);
    }
    // carved headboard: panel, crest and a rosette
    m.box(2, 4, 0, 18, 14, 2, WAL); m.box(2, 18, 0, 18, 1, 2, WAL);
    m.box(4, 18, 0, 14, 1, 2, WAL_L); m.box(6, 19, 0, 10, 1, 2, WAL); m.box(9, 20, 0, 4, 1, 2, WAL_L);
    m.box(3, 10, 2, 16, 7, 1, WAL_D); m.box(4, 11, 2, 14, 5, 1, WAL_L);   // raised panel
    m.box(9, 12, 2, 4, 3, 1, WAL); m.box(10, 13, 2, 2, 1, 1, BRASS_D);   // rosette
    // footboard
    m.box(2, 4, 30, 18, 8, 2, WAL); m.box(2, 12, 30, 18, 1, 2, WAL_L); m.box(4, 6, 31, 14, 4, 1, WAL_L);
    m.box(1, 3, 2, 1, 2, 28, WAL_D); m.box(20, 3, 2, 1, 2, 28, WAL_D);    // rails
    m.box(2, 3, 2, 18, 3, 28, '#d9d0bc'); m.box(2, 4, 2, 18, 1, 28, '#9aa8b8'); // box spring w/ blue ticking stripe
    m.box(2, 6, 2, 18, 3, 28, WHITE);
    // patchwork quilt: 3x3 squares in three tint shades + cream, draping over the sides and foot
    const P = [T(0.42), T(0.58), CREAM, T(0.5)];
    const q = (a, b) => P[(Math.floor(a / 3) + 2 * Math.floor(b / 3)) % 4];
    for (let z = 9; z < 30; z++) for (let x = 1; x < 21; x++) m.set(x, 8, z, q(x, z));
    for (let z = 9; z < 30; z++) for (let y = 4; y < 8; y++) { m.set(1, y, z, q(y + 1, z)); m.set(20, y, z, q(y + 2, z)); }
    for (let x = 1; x < 21; x++) for (let y = 4; y < 9; y++) m.set(x, y, 29, q(x, y));
    m.box(1, 8, 8, 20, 1, 2, WHITE); m.box(1, 5, 8, 1, 3, 1, WHITE); m.box(20, 5, 8, 1, 3, 1, WHITE); // turn-down
    for (const x0 of [3, 12]) {                                              // pillows
      m.box(x0, 9, 2, 7, 2, 5, WHITE); m.box(x0 + 1, 10, 3, 5, 1, 3, ENA_L);
      m.clear(x0, 10, 2, 1, 1, 1); m.clear(x0 + 6, 10, 2, 1, 1, 1); m.clear(x0, 10, 6, 1, 1, 1); m.clear(x0 + 6, 10, 6, 1, 1, 1);
    }
  },
});

// White-painted slatted crib with a tinted baby blanket and a duck decal. 0.75 x 1.31 m, rails 1.0 m.
defineProp('crib', {
  size: [12, 17, 21], collide: true,
  build(m) {
    const p = '#ece6da', pd = '#d2cabb';
    for (const [x, z] of [[0, 0], [11, 0], [0, 20], [11, 20]]) { m.box(x, 1, z, 1, 15, 1, p); m.set(x, 16, z, pd); m.set(x, 0, z, BLK_L); }
    for (const y of [4, 15]) { m.box(0, y, 0, 1, 1, 21, p); m.box(11, y, 0, 1, 1, 21, p); m.box(0, y, 0, 12, 1, 1, p); m.box(0, y, 20, 12, 1, 1, p); }
    for (let z = 2; z <= 18; z += 2) { m.box(0, 5, z, 1, 10, 1, p); m.box(11, 5, z, 1, 10, 1, p); }
    m.box(1, 5, 0, 10, 10, 1, p); m.box(1, 5, 20, 10, 10, 1, p);           // end panels
    m.box(2, 13, 0, 8, 1, 1, pd); m.box(2, 13, 20, 8, 1, 1, pd);
    // duck decal on the foot panel
    m.box(4, 8, 20, 3, 2, 1, '#f0cc40'); m.box(6, 10, 20, 2, 2, 1, '#f0cc40'); m.set(8, 11, 20, '#e08030'); m.set(6, 11, 20, BLK);
    m.box(1, 5, 1, 10, 3, 19, '#dfe6ea');                                  // mattress
    m.box(1, 8, 9, 10, 1, 11, T(0.55)); m.box(1, 8, 9, 10, 1, 1, T(0.66)); // blanket with satin binding
    m.box(1, 6, 19, 10, 2, 1, T(0.55));
    m.box(3, 8, 2, 6, 1, 3, WHITE);                                        // little pillow
  },
});

// Folding army camp cot: olive canvas on a wood frame, X legs, grey blanket folded at the foot.
defineProp('cot', {
  size: [11, 7, 30], collide: true,
  build(m) {
    const c = '#6f6d48', cl = '#7e7c54';
    m.box(0, 4, 0, 1, 1, 30, OAK_L); m.box(10, 4, 0, 1, 1, 30, OAK_L);
    m.box(0, 4, 0, 11, 1, 1, OAK); m.box(0, 4, 29, 11, 1, 1, OAK);
    m.box(1, 4, 1, 9, 1, 28, c); m.box(2, 4, 2, 7, 1, 26, cl);
    for (const z of [2, 14, 27]) { line(m, 0, 0, z, 10, 3, z, OAK); line(m, 10, 0, z, 0, 3, z, OAK); }
    m.box(1, 5, 21, 9, 1, 7, '#6a6a62'); m.box(1, 5, 23, 9, 1, 1, '#4e4e48'); m.box(1, 5, 26, 9, 1, 1, '#4e4e48'); // blanket
    m.box(2, 5, 1, 7, 1, 3, WHITE);                                        // pillow
  },
});

// Maple bunk bed: two tinted spreads, guard rail, ladder on the +x side. 1.0 x 2.0 x 1.8 m.
defineProp('bunk_bed', {
  size: [16, 29, 32], collide: true,
  build(m) {
    const w = MAPLE, d = MAPLE_D, l = MAPLE_L;
    for (const x of [0, 14]) for (const z of [0, 30]) { m.box(x, 0, z, 2, 28, 2, w); m.box(x, 28, z, 2, 1, 2, l); }
    for (const [yr, ym] of [[3, 5], [17, 19]]) {
      m.box(1, yr, 2, 1, 2, 28, d); m.box(14, yr, 2, 1, 2, 28, d);
      m.box(2, yr, 2, 12, 2, 28, d);                                        // slat base
      m.box(2, ym, 2, 12, 3, 28, WHITE);                                    // mattress
      const sp = ym === 5 ? T(0.5) : T(0.44);
      m.box(1, ym + 2, 8, 14, 1, 22, sp); m.box(1, ym, 8, 1, 2, 22, sp); m.box(14, ym, 8, 1, 2, 22, sp);
      m.box(1, ym + 2, 16, 14, 1, 1, T(0.64)); m.box(1, ym, 29, 14, 3, 1, sp);
      m.box(1, ym + 2, 7, 14, 1, 1, WHITE);
      m.box(4, ym + 3, 2, 8, 1, 4, WHITE); m.box(5, ym + 4, 3, 6, 1, 2, ENA_L);  // pillow
    }
    for (const z of [0, 30]) {                                               // head & foot panels
      m.box(2, 6, z, 12, 5, 2, w); m.box(2, 20, z, 12, 6, 2, w); m.box(3, 21, z === 0 ? 2 : 29, 10, 4, 1, l);
    }
    m.box(0, 24, 2, 1, 1, 28, w); m.box(15, 24, 2, 1, 1, 14, w);           // guard rails
    m.box(15, 22, 2, 1, 2, 1, w); m.box(15, 22, 15, 1, 2, 1, w);
    // ladder at the foot on the +x side
    m.box(15, 0, 20, 1, 25, 1, l); m.box(15, 0, 25, 1, 25, 1, l);
    for (let y = 3; y <= 21; y += 4) m.box(15, y, 21, 1, 1, 4, w);
  },
});

// ============================================================================================
// STORAGE
// ============================================================================================

// Walnut dresser with a harp mirror, bail pulls, a doily and a few vanity things. 1.13 x 1.94 m.
defineProp('dresser', {
  size: [18, 31, 9], collide: [1.13, 1.9, 0.5],
  build(m) {
    for (const x of [0, 16]) { m.box(x, 0, 6, 2, 1, 2, WAL_D); m.box(x, 0, 0, 2, 1, 1, WAL_D); }
    m.box(0, 1, 0, 18, 12, 7, WAL_D);
    m.box(0, 13, 0, 18, 1, 8, WAL_L); m.box(0, 12, 7, 18, 1, 1, WAL);
    // drawers: two small on top, three wide below, with brass bail pulls
    m.box(1, 10, 7, 8, 2, 1, WAL); m.box(9, 10, 7, 8, 2, 1, WAL);
    m.box(4, 10, 8, 2, 1, 1, BRASS); m.box(12, 10, 8, 2, 1, 1, BRASS);
    for (const y of [1, 4, 7]) {
      m.box(1, y, 7, 16, 2, 1, WAL);
      m.box(3, y, 8, 3, 1, 1, BRASS); m.box(12, y, 8, 3, 1, 1, BRASS);
      m.set(4, y, 8, BRASS_D); m.set(13, y, 8, BRASS_D);
    }
    m.box(3, 13, 2, 12, 1, 4, WHITE); m.box(4, 13, 3, 10, 1, 2, LINEN);    // doily (flush)
    m.box(4, 14, 3, 1, 2, 1, '#d8a0b8'); m.set(4, 16, 3, BRASS);           // perfume bottle
    m.box(6, 14, 4, 1, 1, 1, '#a8c8d8'); m.box(12, 14, 3, 2, 1, 2, '#6a3a4a'); // jar, jewel box
    // harp mirror
    m.box(2, 14, 0, 1, 12, 1, WAL); m.box(15, 14, 0, 1, 12, 1, WAL);
    m.box(3, 15, 0, 12, 14, 2, WAL); m.box(5, 29, 0, 8, 1, 2, WAL); m.box(7, 30, 0, 4, 1, 2, WAL_L);
    m.clear(3, 28, 0, 1, 1, 2); m.clear(14, 28, 0, 1, 1, 2);
    m.clear(4, 16, 1, 10, 12, 1); m.box(4, 16, 0, 10, 12, 1, GLASS); m.box(6, 28, 0, 6, 1, 1, GLASS);
    line(m, 5, 18, 0, 9, 26, 0, GLASS_L); line(m, 8, 17, 0, 12, 25, 0, GLASS_L);
  },
});

// Two-door walnut wardrobe with a long door mirror, crown moulding and a bottom drawer. 1.0 x 1.94 m.
defineProp('wardrobe', {
  size: [16, 31, 11], collide: [1.0, 1.94, 0.62],
  build(m) {
    for (const x of [0, 14]) m.box(x, 0, 0, 2, 2, 10, WAL_D);
    m.box(0, 2, 0, 16, 27, 9, WAL_D);
    m.box(0, 29, 0, 16, 1, 10, WAL_L); m.box(1, 30, 0, 14, 1, 9, WAL);    // crown
    m.box(0, 2, 9, 16, 1, 1, WAL);
    drawer(m, 1, 3, 9, 14, 4, WAL, null); m.box(4, 5, 10, 2, 1, 1, BRASS); m.box(10, 5, 10, 2, 1, 1, BRASS);
    for (const x0 of [1, 8]) m.box(x0, 8, 9, 7, 20, 1, WAL);               // doors
    m.box(2, 10, 9, 5, 7, 1, WAL_L); m.box(2, 19, 9, 5, 7, 1, WAL_L);      // left raised panels
    m.box(3, 11, 9, 3, 5, 1, WAL); m.box(3, 20, 9, 3, 5, 1, WAL);
    m.box(9, 10, 9, 5, 16, 1, GLASS); line(m, 10, 12, 9, 12, 16, 9, GLASS_L); line(m, 10, 18, 9, 13, 24, 9, GLASS_L); // mirror
    m.box(7, 17, 10, 1, 1, 1, BRASS); m.box(8, 17, 10, 1, 1, 1, BRASS);
    m.set(7, 16, 9, BLK); m.set(8, 16, 9, BLK);
  },
});

// Nightstand with a drawer, an open shelf with a book, and a little twin-bell alarm clock. Top 0.69 m.
defineProp('nightstand', {
  size: [8, 15, 8], collide: [0.5, 0.69, 0.45],
  build(m) {
    for (const [x, z] of [[0, 0], [7, 0], [0, 6], [7, 6]]) m.box(x, 0, z, 1, 4, 1, MAH_D);
    m.box(0, 4, 0, 8, 6, 7, MAH); m.clear(1, 4, 1, 6, 3, 6);
    m.box(1, 4, 1, 6, 1, 6, MAH_D);
    m.box(2, 5, 2, 4, 1, 3, BOOKS[1]); m.box(2, 6, 2, 3, 1, 3, BOOKS[0]);   // books on the shelf
    drawer(m, 1, 8, 7, 6, 2, MAH_L, BRASS, 1);
    m.box(0, 10, 0, 8, 1, 7, MAH_L);
    // alarm clock (red enamel, cream face, twin bells)
    m.box(2, 11, 2, 3, 3, 2, '#b8392c'); m.box(2, 11, 4, 3, 3, 1, CREAM);
    m.set(3, 12, 4, BLK); m.set(3, 13, 4, '#6a5a4a');
    m.set(2, 14, 2, BRASS); m.set(4, 14, 2, BRASS); m.set(2, 11, 4, '#b8392c'); m.set(4, 11, 4, '#b8392c');
    m.box(5, 11, 3, 2, 1, 2, '#e8e4d8');                                   // folded hanky / glasses case
  },
});

// Tall walnut bookcase packed with books (and a few knick-knacks). 1.0 m wide, 1.94 m tall.
defineProp('bookshelf', {
  size: [16, 31, 6], collide: [1.0, 1.94, 0.38],
  build(m) {
    m.box(0, 0, 0, 1, 31, 6, WAL); m.box(15, 0, 0, 1, 31, 6, WAL);
    m.box(1, 0, 0, 14, 31, 1, WAL_D);
    m.box(0, 30, 0, 16, 1, 6, WAL_L); m.box(1, 0, 1, 14, 1, 5, WAL_D); m.box(1, 1, 1, 14, 1, 5, WAL);
    for (const y of [7, 13, 19, 25]) m.box(1, y, 1, 14, 1, 5, WAL);
    // shelf 1 (bottom): tall books, a lying stack
    bookRow(m, 1, 10, 2, 1, 4, 5, 0);
    m.box(11, 2, 1, 4, 1, 4, BOOKS[3]); m.box(11, 3, 1, 4, 1, 4, BOOKS[1]); m.box(12, 4, 1, 3, 1, 4, BOOKS[0]);
    // shelf 2: an encyclopedia set + a few
    bookSet(m, 1, 9, 8, 1, 4, 5, '#5b2331', '#4e1d2a'); bookRow(m, 10, 14, 8, 1, 4, 4, 5);
    // shelf 3: books, bookend, small vase
    bookRow(m, 1, 8, 14, 1, 4, 5, 3); m.box(9, 14, 2, 1, 3, 2, BRASS_D);
    m.box(12, 14, 2, 2, 3, 2, '#3a6a8a'); m.box(12, 17, 2, 2, 1, 2, '#4a7a9a');
    // shelf 4: books leaning
    bookRow(m, 1, 11, 20, 1, 4, 5, 7); line(m, 12, 20, 2, 14, 23, 2, BOOKS[2]); line(m, 12, 20, 3, 14, 23, 3, BOOKS[2]);
    // top shelf: short books + a framed photo
    bookRow(m, 3, 12, 26, 1, 4, 4, 11); m.box(1, 26, 2, 2, 3, 1, BRASS); m.set(1, 27, 3, '#c8b89a');
    m.set(2, 27, 3, '#c8b89a'); m.set(1, 28, 3, BRASS); m.set(2, 28, 3, BRASS); m.box(13, 26, 2, 2, 1, 2, '#a8a49c');
  },
});

// Low bookcase (0.81 m) with two shelves of books; its top holds a lamp or plant.
defineProp('bookshelf_low', {
  size: [16, 13, 6], collide: true,
  build(m) {
    m.box(0, 0, 0, 1, 13, 6, WAL); m.box(15, 0, 0, 1, 13, 6, WAL);
    m.box(1, 0, 0, 14, 13, 1, WAL_D);
    m.box(0, 12, 0, 16, 1, 6, WAL_L); m.box(1, 0, 1, 14, 1, 5, WAL_D); m.box(1, 1, 1, 14, 1, 5, WAL);
    m.box(1, 7, 1, 14, 1, 5, WAL);
    bookRow(m, 1, 14, 2, 1, 4, 5, 2);
    bookSet(m, 1, 6, 8, 1, 4, 4, '#2b3b5c', '#24324e'); bookRow(m, 7, 11, 8, 1, 4, 4, 9);
    m.box(12, 8, 1, 3, 1, 4, BOOKS[5]); m.box(12, 9, 1, 3, 1, 4, BOOKS[9]);
  },
});

// Mahogany china cabinet: glass doors over shelves of plates & cups, cupboard below. 1.0 x 1.88 m.
defineProp('cabinet_china', {
  size: [16, 30, 8], collide: [1.0, 1.88, 0.5],
  build(m) {
    const back = '#c8cdb4';
    m.box(0, 0, 0, 16, 1, 7, MAH_D);
    m.box(0, 1, 0, 16, 11, 7, MAH);
    for (const x0 of [1, 8]) { m.box(x0, 2, 7, 7, 9, 1, MAH_L); m.box(x0 + 1, 3, 7, 5, 7, 1, MAH); }
    m.set(7, 6, 7, BRASS); m.set(8, 6, 7, BRASS);
    m.box(0, 12, 0, 16, 1, 8, MAH_L);
    // upper glazed case
    m.box(0, 13, 0, 1, 15, 6, MAH); m.box(15, 13, 0, 1, 15, 6, MAH); m.box(1, 13, 0, 14, 15, 1, back);
    m.box(0, 28, 0, 16, 1, 7, MAH_L); m.box(1, 29, 0, 14, 1, 6, MAH); m.box(5, 29, 5, 6, 1, 1, MAH_L);
    for (const y of [13, 18, 23]) m.box(1, y, 1, 14, 1, 5, MAH);
    for (const [y, rim] of [[14, '#3a5a8a'], [19, '#c9a24a'], [24, '#3a5a8a']]) {
      for (const cx of [3, 8, 13]) discZ(m, cx, y + 2, 1, 2.2, (x, yy, dx, dy, q) => q > 1.6 ? rim : WHITE);
      for (const cx of [5, 10]) { m.set(cx, y, 3, WHITE); m.set(cx, y, 4, rim === BRASS ? WHITE : '#dfe6ee'); }
    }
    // glazed door frames (panes left open so the china shows) with a glint on the glass
    for (const x0 of [1, 8]) {
      m.box(x0, 13, 6, 7, 1, 1, MAH); m.box(x0, 27, 6, 7, 1, 1, MAH);
      m.box(x0, 13, 6, 1, 15, 1, MAH); m.box(x0 + 6, 13, 6, 1, 15, 1, MAH);
      m.set(x0 + 1, 26, 6, GLASS_L); m.set(x0 + 2, 25, 6, GLASS_L);
    }
    m.set(7, 20, 7, BRASS); m.set(8, 20, 7, BRASS);
  },
});

// Four-drawer steel filing cabinet with chrome pulls and label holders. 0.44 x 1.31 m.
defineProp('filing_cabinet', {
  size: [7, 21, 12], collide: [0.44, 1.31, 0.7],
  build(m) {
    const st = '#6d766c', sl = '#838c80';
    m.box(0, 0, 0, 7, 21, 10, st); m.box(0, 0, 10, 7, 1, 1, '#4a5048');
    for (const y of [1, 6, 11, 16]) {
      m.box(0, y, 10, 7, 4, 1, sl);
      m.box(2, y + 1, 11, 3, 1, 1, CHR_D); m.set(3, y + 1, 11, CHR);
      m.set(3, y + 3, 10, '#e8e0c8'); m.set(2, y + 3, 10, CHR_D); m.set(4, y + 3, 10, CHR_D);
    }
    m.box(0, 20, 0, 7, 1, 11, st);
  },
});

// Standing coat tree with a camel overcoat on a hook and a fedora on top. 1.8 m.
defineProp('coat_rack', {
  size: [12, 29, 12], collide: [0.35, 1.8, 0.35],
  build(m) {
    for (const [x, z] of [[1, 1], [10, 1], [1, 10], [10, 10]]) line(m, x, 0, z, x < 5 ? 5 : 6, 3, z < 5 ? 5 : 6, WAL_D);
    m.box(5, 0, 5, 2, 27, 2, WAL); m.box(5, 27, 5, 2, 1, 2, WAL_L);
    for (const [x, z, w, d, tx, tz] of [[3, 5, 2, 1, 3, 5], [7, 6, 2, 1, 8, 6], [5, 3, 1, 2, 5, 3], [6, 7, 1, 2, 6, 8]]) {
      m.box(x, 24, z, w, 1, d, BRASS); m.set(tx, 25, tz, BRASS_L);          // four brass hooks
    }
    // fedora on top
    oval(m, 6, 27, 6, 4, 4, 1, '#5a5048'); disc(m, 6, 28, 6, 2.4, 2, '#5a5048'); disc(m, 6, 28, 6, 2.5, 1, '#2a2420');
    m.box(5, 29, 5, 2, 1, 2, '#4a4038');
    // camel overcoat hanging on the front hook (+z side)
    const c = '#8a6a44', cd = '#6e5232', cl = '#9c7c54';
    m.box(5, 23, 8, 2, 1, 2, cd);                                           // collar at the hook
    m.box(4, 21, 8, 4, 2, 3, c); m.box(3, 20, 8, 6, 1, 3, c);               // yoke & shoulders
    m.box(3, 10, 8, 6, 10, 3, c); m.box(2, 9, 8, 8, 2, 3, c);               // body, flared hem
    m.box(2, 12, 8, 1, 8, 3, cl); m.box(9, 12, 8, 1, 8, 3, cl);             // sleeves
    m.box(2, 12, 8, 1, 1, 3, cd); m.box(9, 12, 8, 1, 1, 3, cd);             // cuffs
    m.box(6, 9, 10, 1, 11, 1, cd);                                          // front opening
    m.set(5, 20, 10, cl); m.set(7, 20, 10, cl); m.set(5, 19, 10, cl); m.set(7, 19, 10, cl); // lapels
    m.box(3, 14, 10, 6, 1, 1, cd); m.set(6, 14, 10, BRASS);                 // belt & buckle
    m.set(5, 17, 10, BLK_L); m.set(5, 11, 10, BLK_L);                        // buttons
    m.box(4, 16, 10, 1, 1, 1, cd); m.box(7, 11, 10, 1, 1, 1, cd);           // pocket flaps
    m.box(6, 21, 10, 1, 2, 1, T(0.55));                                      // scarf tucked in the collar
  },
});

// Wall hat rack: oak peg board with a fedora and a tinted scarf. Back at z=0 (origin at the back).
defineProp('hat_rack_wall', {
  size: [16, 12, 5], origin: [8, 0, 0],
  build(m) {
    m.box(0, 9, 0, 16, 2, 1, OAK); m.box(1, 9, 0, 14, 1, 1, OAK_D);
    for (const x of [2, 6, 10, 14]) { m.box(x, 9, 1, 1, 1, 2, OAK_L); m.set(x, 10, 2, OAK_L); }
    // fedora hung on the second peg
    m.box(3, 5, 2, 7, 1, 2, '#4a4f5a'); m.box(4, 6, 2, 5, 3, 2, '#4a4f5a'); m.box(4, 6, 3, 5, 1, 1, '#2a2420');
    m.box(5, 8, 2, 3, 1, 1, '#3e434c');
    // scarf draped over the last peg
    m.box(13, 2, 2, 1, 8, 1, T(0.5)); m.box(15, 3, 2, 1, 7, 1, T(0.5)); m.box(14, 9, 2, 1, 1, 1, T(0.5));
    m.box(13, 4, 2, 1, 1, 1, T(0.66)); m.box(15, 5, 2, 1, 1, 1, T(0.66));
    m.set(13, 1, 2, T(0.4)); m.set(15, 2, 2, T(0.4));
  },
});

// Canvas-and-slat steamer trunk with brass corners, lock and leather handles.
defineProp('trunk', {
  size: [14, 10, 9], collide: true,
  build(m) {
    const c = '#6a4a2e', s = OAK_L;
    m.box(1, 0, 0, 12, 9, 9, c); m.box(2, 9, 1, 10, 1, 7, c);
    m.box(1, 6, 0, 12, 1, 9, '#4a321e');                                    // lid seam band
    for (const x of [3, 10]) { m.box(x, 0, 0, 1, 9, 9, s); m.box(x, 9, 1, 1, 1, 7, s); }
    m.box(1, 3, 0, 12, 1, 9, s);
    for (const x of [1, 12]) for (const y of [0, 8]) for (const z of [0, 8]) m.set(x, y, z, BRASS);
    m.box(6, 5, 8, 2, 2, 1, BRASS); m.set(6, 5, 8, BLK);                   // lock
    m.box(0, 6, 3, 1, 1, 3, '#3e2a18'); m.box(13, 6, 3, 1, 1, 3, '#3e2a18');
  },
});

// Painted toy chest: pale blue with red trim and A B C letters.
defineProp('toy_chest', {
  size: [13, 9, 8], collide: true,
  build(m) {
    const b = '#7fa6c4', r = '#b8433a';
    m.box(0, 0, 0, 13, 7, 8, b); m.box(0, 0, 0, 13, 1, 8, r);
    m.box(0, 7, 0, 13, 1, 8, r); m.box(1, 8, 1, 11, 1, 6, b);
    m.box(0, 6, 0, 13, 1, 8, '#6a90ae');
    m.text('A', 1, 1, 7, '#f0d060'); m.text('B', 5, 1, 7, '#f4f0e8'); m.text('C', 9, 1, 7, r);
    m.set(0, 4, 3, '#c8a878'); m.set(0, 4, 4, '#c8a878'); m.set(12, 4, 3, '#c8a878'); m.set(12, 4, 4, '#c8a878'); // rope handles
    m.box(3, 8, 6, 2, 1, 1, '#e8c040');                                    // a toy peeking out under the lid
  },
});

// Waterfall-style cedar hope chest with matched-veneer front and a brass lock.
defineProp('cedar_chest', {
  size: [18, 9, 8], collide: true,
  build(m) {
    const c = '#66321f', cl = '#7a412a', cd = '#4a2416';
    m.box(1, 0, 1, 16, 1, 6, cd);
    m.box(0, 1, 0, 18, 7, 8, c); m.box(0, 1, 7, 18, 1, 1, cd);
    m.box(0, 8, 0, 18, 1, 8, cl); m.box(0, 7, 7, 18, 1, 1, cl);            // rounded lid edge
    m.box(1, 2, 7, 4, 5, 1, cl); m.box(13, 2, 7, 4, 5, 1, cl);
    m.box(6, 2, 7, 6, 5, 1, '#8a4c30'); m.box(7, 3, 7, 4, 3, 1, '#965636');
    m.box(8, 6, 7, 2, 1, 1, BRASS); m.set(8, 5, 7, BLK);
  },
});

// ============================================================================================
// KITCHEN (fronts face +z; counter height 0.94 m, depth 0.63 m)
// ============================================================================================

// 1950s white enamel range: 4 gas burners, deep-well cooker, oven with window, backsplash clock
// and salt & pepper shakers on the shelf. 1.0 m wide, cooktop 0.94 m.
defineProp('stove', {
  size: [16, 23, 11], collide: [1.0, 0.94, 0.63],
  build(m) {
    m.box(1, 0, 0, 14, 2, 9, BLK_L); m.box(0, 2, 0, 16, 12, 10, ENA);      // kick plate + body
    m.box(0, 14, 0, 16, 1, 10, ENA_L); m.box(0, 13, 9, 16, 1, 1, CHR); m.box(0, 13, 10, 16, 1, 1, CHR_D);
    // burners (drip pan + black grate cross) on the left, deep-well lid + work top on the right
    for (const x of [2, 6]) for (const z of [4, 7]) {
      m.box(x - 1, 14, z - 1, 3, 1, 3, CHR); m.set(x, 14, z, BLK_L);
      m.box(x - 1, 15, z, 3, 1, 1, BLK); m.box(x, 15, z - 1, 1, 1, 3, BLK);
    }
    disc(m, 12, 14, 6, 2.1, 1, CHR); disc(m, 12, 15, 6, 1.5, 1, CHR_L); m.set(11, 16, 5, BLK);
    // control knobs on the front apron
    for (const x of [1, 3, 5, 7, 10, 12, 14]) { m.set(x, 12, 10, BLK); }
    m.box(8, 11, 10, 1, 2, 1, CHR_D); m.set(8, 12, 10, { c: '#ff9a50', emit: 0.5 }); // pilot window
    // left: broiler & storage drawers; right: oven door with window & chrome handle
    m.box(0, 2, 10, 16, 1, 1, CHR_D);
    m.box(1, 7, 10, 6, 4, 1, ENA_L); m.box(2, 10, 10, 4, 1, 1, CHR); m.box(1, 3, 10, 6, 3, 1, ENA_L); m.box(2, 5, 10, 4, 1, 1, CHR);
    m.box(8, 3, 10, 7, 8, 1, ENA_L); m.box(9, 10, 10, 5, 1, 1, CHR); m.set(11, 10, 10, CHR_L);
    m.box(9, 5, 10, 5, 4, 1, CHR); m.box(10, 6, 10, 3, 2, 1, '#2c3134');
    // backsplash with clock, timer knobs and chrome trim
    m.box(0, 15, 0, 16, 7, 2, ENA); m.box(0, 21, 0, 16, 1, 3, CHR);
    m.clear(0, 21, 0, 1, 1, 3); m.clear(15, 21, 0, 1, 1, 3); m.box(1, 15, 2, 14, 1, 1, CHR_D);
    m.box(6, 16, 2, 4, 4, 1, CHR); m.box(7, 17, 2, 2, 2, 1, CREAM); m.set(7, 18, 2, BLK); m.set(8, 17, 2, BLK);
    m.set(3, 18, 2, BLK); m.set(12, 18, 2, BLK); m.box(2, 16, 2, 3, 1, 1, CREAM); m.box(11, 16, 2, 3, 1, 1, CREAM);
    m.box(2, 22, 1, 1, 1, 1, '#f4f0e8'); m.box(13, 22, 1, 1, 1, 1, '#d84a3a');  // salt & pepper
  },
});

// Rounded-top 1950s refrigerator: white enamel, big chrome lever handle, chrome badge. 1.63 m.
defineProp('fridge', {
  size: [12, 26, 12], collide: [0.75, 1.63, 0.7],
  build(m) {
    m.box(0, 0, 0, 12, 25, 10, ENA); m.box(1, 25, 0, 10, 1, 9, ENA);
    m.clear(0, 24, 0, 1, 1, 10); m.clear(11, 24, 0, 1, 1, 10);            // rounded shoulders
    m.box(1, 0, 8, 10, 3, 2, BLK_L); for (const y of [1]) m.box(2, y, 10, 8, 1, 1, CHR_D); // base grille
    m.box(0, 3, 10, 12, 21, 1, ENA_L); m.clear(0, 23, 10, 1, 1, 1); m.clear(11, 23, 10, 1, 1, 1);
    m.box(0, 3, 10, 12, 1, 1, ENA_D);
    // lever handle
    m.box(9, 13, 11, 2, 5, 1, CHR); m.set(9, 16, 11, CHR_L); m.set(9, 15, 11, CHR_L); m.box(9, 12, 11, 2, 1, 1, CHR_D);
    m.box(3, 20, 10, 6, 1, 1, CHR); m.box(4, 21, 10, 4, 1, 1, CHR_D);        // badge
    m.set(0, 5, 10, CHR); m.set(0, 21, 10, CHR);                            // hinges
  },
});

// Base cabinet module (0.81 m): cream steel, drawer over two doors, tinted counter with chrome edge.
function counterBase(m, drawerRow = true) {
  m.box(0, 0, 0, 13, 2, 8, '#3a3430');                                    // recessed toe kick
  m.box(0, 2, 0, 13, 12, 9, ENA_D);
  if (drawerRow) { m.box(1, 10, 9, 11, 3, 1, ENA); m.box(5, 11, 10, 3, 1, 1, CHR); }
  else { m.box(1, 10, 9, 11, 3, 1, ENA); m.box(1, 11, 9, 11, 1, 1, CHR_D); }
  m.box(1, 3, 9, 5, 6, 1, ENA); m.box(7, 3, 9, 5, 6, 1, ENA);
  m.box(5, 6, 10, 1, 2, 1, CHR); m.box(7, 6, 10, 1, 2, 1, CHR);
}
defineProp('kitchen_counter', {
  size: [13, 16, 11], collide: [0.81, 0.94, 0.63],
  build(m) {
    counterBase(m, true);
    m.box(0, 14, 0, 13, 1, 10, T(0.52)); m.box(0, 13, 10, 13, 2, 1, CHR); m.box(0, 14, 10, 13, 1, 1, CHR_L);
    for (const [x, z] of [[2, 3], [7, 6], [10, 2], [4, 8]]) m.set(x, 14, z, T(0.62));
    m.box(0, 15, 0, 13, 1, 1, T(0.44));                                    // little backsplash lip
  },
});

// Sink module (same 0.81 m module): porcelain basin, gooseneck faucet, soap & sponge.
defineProp('kitchen_sink', {
  size: [13, 20, 11], collide: [0.81, 0.94, 0.63],
  build(m) {
    counterBase(m, false);
    m.box(0, 14, 0, 13, 1, 10, T(0.52)); m.box(0, 13, 10, 13, 2, 1, CHR); m.box(0, 14, 10, 13, 1, 1, CHR_L);
    m.box(1, 11, 1, 11, 4, 8, ENA_L); m.clear(2, 12, 2, 9, 3, 6); m.box(2, 11, 2, 9, 1, 6, ENA);
    m.set(6, 11, 5, CHR_D); m.box(1, 14, 1, 11, 1, 1, ENA_L);
    m.box(0, 15, 0, 13, 3, 1, T(0.44)); m.box(0, 17, 0, 13, 1, 1, CHR);      // backsplash
    // faucet
    m.box(4, 15, 1, 5, 1, 1, CHR); m.box(6, 16, 1, 1, 3, 1, CHR); m.box(6, 18, 2, 1, 1, 3, CHR); m.set(6, 17, 4, CHR_L);
    m.set(4, 16, 1, CHR_L); m.set(8, 16, 1, CHR_L); m.set(4, 17, 1, '#c84a3a'); m.set(8, 17, 1, '#3a6ac8');
    m.box(10, 15, 1, 2, 1, 1, '#e8c840'); m.set(1, 15, 1, '#e8b0c0');         // sponge & soap
  },
});

// Wall cabinet (0.81 wide, 0.75 tall, 0.31 deep + pulls). Modelled floating: bottom at y=0, BACK at z=0
// (origin at the back) - placers raise it to ~1.4 m against the wall.
defineProp('cabinet_upper', {
  size: [13, 12, 7], origin: [6.5, 0, 0],
  build(m) {
    m.box(0, 0, 0, 13, 12, 5, ENA_D); m.box(0, 11, 0, 13, 1, 6, ENA);
    m.box(1, 1, 5, 5, 9, 1, ENA); m.box(7, 1, 5, 5, 9, 1, ENA);
    m.box(5, 1, 6, 1, 2, 1, CHR); m.box(7, 1, 6, 1, 2, 1, CHR);
    m.box(0, 0, 5, 13, 1, 1, ENA_D);
  },
});

// Golden-oak icebox with nickel latches and hinges and a drip pan underneath.
defineProp('icebox', {
  size: [11, 19, 10], collide: [0.69, 1.19, 0.6],
  build(m) {
    for (const x of [0, 9]) for (const z of [0, 6]) m.box(x, 0, z, 2, 1, 2, OAK_D);
    m.box(0, 1, 0, 11, 17, 8, OAK); m.box(0, 18, 0, 11, 1, 9, OAK_L);
    m.box(1, 1, 8, 9, 1, 1, OAK_D);
    for (const [y, h] of [[11, 6], [2, 8]]) {
      m.box(1, y, 8, 9, h, 1, OAK_L); m.box(2, y + 1, 8, 7, h - 2, 1, OAK); m.box(3, y + 2, 8, 5, h - 4, 1, OAK_L);
      m.box(8, y + Math.floor(h / 2), 9, 2, 1, 1, CHR); m.set(9, y + Math.floor(h / 2) - 1, 9, CHR_D); // latch
      m.set(1, y + 1, 9, CHR); m.set(1, y + h - 2, 9, CHR);                 // hinges
    }
    m.box(4, 15, 8, 3, 1, 1, BRASS);                                         // nameplate
    m.box(3, 0, 3, 5, 1, 4, CHR_D);                                          // drip pan
  },
});

// 1950s enamel bread box with red trim and a chrome knob (scale 1/32: 0.41 x 0.28 x 0.28 m).
defineProp('bread_box', {
  size: [13, 9, 9], scale: 1 / 32,
  build(m) {
    const r = '#c83a30';
    m.box(0, 0, 0, 13, 6, 9, ENA); m.box(0, 6, 0, 13, 1, 8, ENA); m.box(0, 7, 0, 13, 1, 6, ENA); m.box(1, 8, 1, 11, 1, 4, ENA);
    m.box(0, 0, 0, 13, 1, 9, r);                                            // red base band
    m.box(0, 5, 8, 13, 1, 1, CHR_D);                                        // roll-lid seam
    m.box(1, 7, 6, 11, 1, 1, r); m.box(1, 3, 8, 11, 1, 1, r);
    for (const x of [3, 6, 9]) m.set(x, 2, 8, '#d8b050');                   // wheat sprigs
    m.box(5, 6, 8, 3, 1, 1, CHR); m.set(6, 6, 8, CHR_L);
    m.box(0, 1, 0, 1, 5, 9, ENA_D); m.box(12, 1, 0, 1, 5, 9, ENA_D);
  },
});

// ============================================================================================
// TABLE-TOP ITEMS (origin at their bottom centre; scale 1/32 so they keep their detail)
// ============================================================================================
const S32 = 1 / 32;
const CHINA = '#f4f0e6', CHINA_D = '#dcd6c8';

// One place setting (diner sits at +z): tinted napkin + fork, plate with blue rim, knife, spoon,
// and a glass of milk. 0.44 x 0.31 m.
defineProp('table_setting', {
  size: [14, 5, 10], scale: S32,
  build(m) {
    m.box(0, 0, 2, 3, 1, 7, T(0.55)); m.box(0, 0, 4, 3, 1, 1, T(0.45));        // napkin
    m.box(1, 1, 5, 1, 1, 4, CHR); m.box(0, 1, 2, 3, 1, 1, CHR); m.set(0, 1, 1, CHR_L); m.set(2, 1, 1, CHR_L); m.set(1, 1, 3, CHR); m.set(1, 1, 4, CHR); // fork
    disc(m, 7, 0, 5, 4.2, 1, (x, z, dx, dz, d) => d > 3.3 ? '#5a7aa8' : d > 2.6 ? CHINA_D : CHINA);
    m.box(11, 0, 3, 1, 1, 3, CHR_L); m.box(11, 0, 6, 1, 1, 3, CHR);         // knife
    m.box(12, 0, 5, 1, 1, 4, CHR); m.box(12, 0, 3, 1, 1, 2, CHR_L); m.set(13, 0, 3, CHR_L); // spoon
    disc(m, 12, 0, 1.5, 1.5, 4, GLASS_L); disc(m, 12, 1, 1.5, 1.0, 3, WHITE);   // glass of milk
  },
});

// Roast chicken on an oval platter with potatoes, carrots and parsley.
defineProp('food_roast', {
  size: [14, 8, 11], scale: S32,
  build(m) {
    oval(m, 7, 0, 5.5, 7, 5.5, 1, CHINA); oval(m, 7, 1, 5.5, 7, 5.5, 1, '#c9a24a', 0.86);
    ell(m, 7, 2.2, 5.5, 3.6, 2.9, 3.2, (x, y, z, nx, ny) => ny > 0.55 ? '#d0924a' : ny > 0 ? '#b8742e' : '#94561e');
    for (const x of [3, 11]) { ell(m, x, 2.2, 8, 1.2, 1.2, 1.8, '#b8742e'); m.set(x, 3, 10, WHITE); }  // drumsticks + frills
    ell(m, 7, 3.8, 3, 1.5, 1, 1.2, '#c08038');
    for (const [x, z, c] of [[2, 3, '#c8943e'], [12, 3, '#c8943e'], [2, 5, '#d86a2a'], [12, 6, '#d86a2a'], [11, 2, '#c8943e'], [3, 2, '#d86a2a']]) m.set(x, 1, z, c);
    for (const [x, z] of [[1, 5], [13, 5], [4, 1], [10, 1], [7, 1]]) m.set(x, 1, z, '#4a7a2e');
  },
});

// Pyrex casserole with a golden cheesy crust and a serving spoon.
defineProp('food_casserole', {
  size: [14, 7, 9], scale: S32,
  build(m) {
    m.box(1, 0, 0, 12, 4, 9, '#ece8dc'); m.clear(1, 0, 0, 1, 4, 1); m.clear(12, 0, 0, 1, 4, 1); m.clear(1, 0, 8, 1, 4, 1); m.clear(12, 0, 8, 1, 4, 1);
    m.box(0, 3, 3, 1, 1, 3, '#ece8dc'); m.box(13, 3, 3, 1, 1, 3, '#ece8dc');  // handles
    m.box(2, 3, 1, 10, 1, 7, '#c89048');
    for (const [x, z] of [[3, 2], [6, 5], [9, 3], [4, 6], [10, 6], [7, 2]]) m.set(x, 3, z, '#9a6428');
    for (const [x, z] of [[5, 3], [8, 6], [10, 2], [3, 4]]) m.set(x, 3, z, '#e8c060');
    m.box(1, 1, 0, 12, 1, 9, '#a8c0d0');                                    // blue glass band
    line(m, 8, 4, 4, 11, 6, 7, CHR); m.box(7, 4, 3, 2, 1, 2, CHR_L);         // serving spoon
  },
});

// Lattice-top cherry pie in a glass pie plate, one slice gone.
defineProp('food_pie', {
  size: [11, 3, 11], scale: S32,
  build(m) {
    const cx = 5.5, cz = 5.5, crust = '#d8a458', crustD = '#bc8440', fill = '#9a1e22';
    disc(m, cx, 0, cz, 5.5, 1, '#d6d2c6');
    disc(m, cx, 1, cz, 5.2, 2, (x, z) => ((x + z) % 2 ? crust : crustD), 4.1);   // crimped rim
    disc(m, cx, 1, cz, 4.2, 1, fill);
    disc(m, cx, 2, cz, 4.2, 1, (x, z) => (x % 3 === 1 || z % 3 === 1 ? crust : fill));   // lattice (flush)
    for (let z = 6; z < 11; z++) for (let x = 0; x < 11; x++) {             // cut-out slice
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      if (Math.abs(dx) < dz * 0.55) { m.set(x, 2, z, 0); m.set(x, 1, z, 0); }
    }
    m.set(5, 1, 6, fill); m.set(5, 0, 7, '#b01e22');
  },
});

// Crusty loaf on a bread board, two slices cut, with a bread knife.
defineProp('food_bread', {
  size: [14, 5, 8], scale: S32,
  build(m) {
    m.box(0, 0, 0, 14, 1, 8, '#b08a5a'); m.box(1, 0, 1, 12, 1, 6, '#bc9664');
    m.box(2, 1, 2, 7, 3, 4, '#c88a44'); m.box(3, 4, 2, 5, 1, 4, '#a86a30');
    m.clear(2, 3, 2, 1, 1, 1); m.clear(2, 3, 5, 1, 1, 1);
    for (const x of [3, 5, 7]) m.set(x, 4, 3, '#dcae6c');                   // scoring
    m.box(9, 1, 2, 1, 3, 4, '#ecd8a8'); m.box(9, 3, 2, 1, 1, 4, '#c88a44');  // cut face
    m.box(10, 1, 2, 2, 1, 4, '#ecd8a8'); m.box(11, 2, 2, 1, 1, 4, '#ecd8a8'); m.set(11, 1, 5, '#c88a44'); // slices
    m.box(6, 1, 7, 6, 1, 1, CHR_L); m.box(2, 1, 7, 4, 1, 1, WAL);            // bread knife
  },
});

// Birthday cake on a glass stand: white frosting, pink trim, 7 candles with glowing flames.
defineProp('birthday_cake', {
  size: [12, 12, 12], scale: S32,
  build(m) {
    const c = 6, pink = '#f0a0b8', pinkD = '#e0809a';
    disc(m, c, 0, c, 2.2, 1, GLASS); disc(m, c, 1, c, 1.1, 1, GLASS_L); disc(m, c, 2, c, 5.9, 1, GLASS_L);
    disc(m, c, 3, c, 4.8, 4, WHITE);
    disc(m, c, 3, c, 5.0, 1, (x, z) => ((x + z) % 2 ? pink : pinkD), 4.2);          // bead border
    disc(m, c, 6, c, 4.8, 1, (x, z) => ((x + z) % 2 ? pink : WHITE), 3.9);           // top shell border
    disc(m, c, 5, c, 4.8, 1, (x, z, dx, dz) => (Math.round(Math.atan2(dz, dx) * 3) % 2 ? pink : 0), 4.2); // swags
    for (const [x, z] of [[6, 6], [4, 5]]) m.set(x, 6, z, pinkD);          // rosettes
    const cols = ['#8ab0e0', '#f090b0', '#f0d070', '#90c890'];
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2, x = Math.floor(c + 2.6 * Math.cos(a)), z = Math.floor(c + 2.6 * Math.sin(a));
      m.box(x, 7, z, 1, 3, 1, cols[k % 4]); m.set(x, 10, z, FLAME); m.set(x, 11, z, { c: '#fff0b0', emit: 1 });
    }
  },
});

// Chrome electric percolator with a glass knob and black handle.
defineProp('coffee_pot', {
  size: [9, 12, 8], scale: S32,
  build(m) {
    disc(m, 4, 0, 4, 3.2, 1, CHR_D); disc(m, 4, 1, 4, 2.9, 7, CHR); disc(m, 4, 8, 4, 2.5, 1, CHR);
    disc(m, 4, 9, 4, 2.0, 1, CHR_L); disc(m, 4, 10, 4, 1.0, 2, '#8a5a32'); m.set(4, 11, 4, '#a8744a');
    m.box(2, 1, 6, 1, 7, 1, CHR_L); m.box(5, 2, 6, 1, 5, 1, CHR_D);          // highlights
    line(m, 7, 5, 4, 8, 8, 4, CHR); m.set(8, 8, 4, CHR_L);                   // spout
    m.box(0, 3, 4, 1, 5, 1, BLK); m.set(1, 3, 4, BLK); m.set(1, 7, 4, BLK);   // handle
    m.set(4, 1, 7, BLK); m.set(4, 2, 7, { c: '#ff5030', emit: 0.6 });         // pilot light
  },
});

// Tea set on a silver tray: rose-painted teapot, two cups & saucers, sugar bowl.
defineProp('teapot_set', {
  size: [16, 8, 11], scale: S32,
  build(m) {
    const rose = '#d8708a', leaf = '#6a9a5a', gold = '#c9a24a';
    const pot = '#e2a8ae', potD = '#c98a92';
    oval(m, 8, 0, 5.5, 8, 5.5, 1, WAL); oval(m, 8, 1, 5.5, 8, 5.5, 1, WAL_L, 0.86);   // wooden tray
    m.box(0, 1, 4, 1, 1, 3, BRASS); m.box(15, 1, 4, 1, 1, 3, BRASS);
    ell(m, 4.5, 3.6, 5.5, 2.8, 2.4, 2.6, (x, y, z, nx, ny) => ny > 0.8 ? gold : ny < -0.5 ? potD : pot);
    disc(m, 4.5, 6, 5.5, 1.3, 1, pot); m.set(4, 7, 5, gold);
    m.set(4, 3, 8, CHINA); m.set(5, 4, 8, CHINA); m.set(3, 4, 8, leaf);       // painted blossom
    line(m, 7, 3, 5, 9, 5, 5, pot); m.set(9, 5, 5, gold);                     // spout
    m.box(1, 3, 5, 1, 3, 1, pot); m.set(2, 5, 5, pot);                        // handle
    for (const [x, z] of [[12, 3], [12, 8]]) {
      disc(m, x, 1, z, 1.9, 1, CHINA); disc(m, x, 2, z, 1.3, 2, CHINA); m.set(x, 3, z, '#8a4a22');
      disc(m, x, 3, z, 1.3, 1, gold, 0.9); m.set(x - 2, 3, z, CHINA); m.set(x, 2, z + 1, rose);
    }
    disc(m, 8.5, 1, 9, 1.4, 2, CHINA); m.set(8, 3, 8, CHINA); m.set(8, 2, 10, rose);   // sugar bowl
  },
});

// Fruit bowl: apples, oranges, a banana bunch and grapes in a green glazed bowl.
defineProp('fruit_bowl', {
  size: [12, 8, 12], scale: S32,
  build(m) {
    const b = '#5a8a6a', bl = '#7aaa88';
    disc(m, 6, 0, 6, 2.2, 1, b); disc(m, 6, 1, 6, 3.6, 1, b); disc(m, 6, 2, 6, 4.8, 1, b); disc(m, 6, 3, 6, 5.6, 1, bl, 4.6);
    disc(m, 6, 2, 6, 4.2, 2, '#8a3a2a');
    ell(m, 4, 4, 4.5, 1.7, 1.6, 1.7, '#b8282a'); ell(m, 8, 4, 5, 1.7, 1.6, 1.7, '#e08a2a');
    ell(m, 5, 4, 8, 1.7, 1.6, 1.7, '#e08a2a'); ell(m, 8.5, 4, 8.5, 1.6, 1.5, 1.6, '#8ab040');
    ell(m, 6, 5.6, 6.5, 1.6, 1.5, 1.6, '#c0302c'); m.set(6, 7, 6, '#5a3a1e');
    for (let i = 0; i < 5; i++) { m.set(2 + i, 5 + (i === 0 || i === 4 ? 0 : 1), 3, '#e8cc48'); m.set(2 + i, 5, 2, '#d8bc38'); } // bananas
    m.set(2, 6, 3, '#5a4a2a');
    for (const [x, y, z] of [[9, 5, 3], [10, 5, 3], [9, 6, 3], [10, 4, 2], [9, 5, 2]]) m.set(x, y, z, (x + y) % 2 ? '#5a2a5a' : '#6e3a6e'); // grapes
  },
});

// Milk-glass vase of flowers: tinted blooms (tint A) with leaves and baby's breath.
defineProp('vase_flowers', {
  size: [10, 15, 10], scale: S32,
  build(m) {
    const v = '#e8ecee', vd = '#cfd6da';
    disc(m, 5, 0, 5, 1.8, 1, vd); disc(m, 5, 1, 5, 2.3, 4, v); disc(m, 5, 5, 5, 1.5, 2, v); disc(m, 5, 7, 5, 2.1, 1, vd);
    const blooms = [[5, 12, 5, 1.8], [2.8, 10.5, 4, 1.5], [7.4, 10.5, 6, 1.5], [3.4, 9.8, 7, 1.4], [6.8, 11.2, 2.8, 1.4], [5, 9.5, 7.8, 1.3], [8.2, 9, 3.8, 1.2]];
    for (const [x, y, z] of blooms) line(m, 5, 7, 5, Math.floor(x), Math.floor(y) - 1, Math.floor(z), GREEN);
    for (const [x, y, z] of [[2, 8, 6], [8, 8, 7], [7, 9, 1], [1, 9, 3]]) m.set(x, y, z, GREEN_L);   // leaves
    for (const [x, y, z, r] of blooms) {
      ell(m, x, y, z, r, r * 0.8, r, (xx, yy, zz, nx, ny) => ny > 0.4 ? T(0.64) : ny < -0.3 ? T(0.4) : T(0.52));
      m.set(Math.floor(x), Math.floor(y + r * 0.8) - 0, Math.floor(z), T(0.36));
    }
    for (const [x, y, z] of [[1, 11, 5], [9, 11, 5], [4, 13, 8], [7, 13, 2], [2, 12, 2]]) m.set(x, y, z, WHITE);
  },
});

// A pair of brass candlesticks with ivory tapers and glowing flames.
defineProp('candles_pair', {
  size: [10, 14, 5], scale: S32,
  build(m) {
    for (const x of [2, 7]) {
      m.box(x - 1, 0, 1, 3, 1, 3, BRASS_D); m.box(x, 1, 2, 1, 4, 1, BRASS); m.box(x - 1, 2, 1, 3, 1, 3, BRASS);
      m.box(x - 1, 5, 1, 3, 1, 3, BRASS_L); m.box(x, 6, 2, 1, 6, 1, '#f4ecd8'); m.set(x, 11, 2, '#e8dcc0');
      m.set(x, 12, 2, { c: '#ff9a3a', emit: 1 }); m.set(x, 13, 2, FLAME);
    }
  },
});

// Three glass quart milk bottles (cardboard caps) in a wire carrier.
defineProp('milk_bottles', {
  size: [10, 10, 7], scale: S32,
  build(m) {
    const w = CHR_D;
    m.box(0, 0, 0, 10, 1, 7, w); m.clear(1, 0, 1, 8, 1, 5);
    for (const [x, z] of [[0, 0], [9, 0], [0, 6], [9, 6]]) m.box(x, 0, z, 1, 3, 1, w);
    m.box(0, 3, 0, 10, 1, 1, w); m.box(0, 3, 6, 10, 1, 1, w); m.box(0, 3, 0, 1, 1, 7, w); m.box(9, 3, 0, 1, 1, 7, w);
    m.box(4, 3, 3, 2, 1, 1, w); m.box(5, 4, 3, 1, 5, 1, w); m.box(3, 9, 3, 5, 1, 1, CHR);  // centre handle
    const caps = ['#c03030', '#3050a0', '#c03030'];
    [[2.5, 2], [7.5, 2], [2.5, 5]].forEach(([x, z], i) => {
      disc(m, x, 0, z, 1.6, 5, WHITE); disc(m, x, 5, z, 1.2, 1, GLASS_L); disc(m, x, 6, z, 0.8, 1, GLASS_L);
      m.set(Math.floor(x), 7, Math.floor(z), caps[i]);
      m.set(Math.floor(x), 3, Math.floor(z) + 1, '#d86a2a');                // dairy logo
    });
  },
});

// Ceramic cookie jar with painted bands and a flower, lid with knob.
defineProp('cookie_jar', {
  size: [8, 10, 8], scale: S32,
  build(m) {
    const c = '#efe2c4', b = '#8a5a2e';
    disc(m, 4, 0, 4, 3.2, 6, c); disc(m, 4, 1, 4, 3.2, 1, b); disc(m, 4, 5, 4, 3.2, 1, b);
    disc(m, 4, 6, 4, 3.4, 1, c); disc(m, 4, 7, 4, 2.6, 1, c); disc(m, 4, 8, 4, 1.1, 2, b);
    m.set(4, 3, 7, T(0.55)); m.set(3, 3, 7, T(0.55)); m.set(4, 4, 7, T(0.55)); m.set(3, 2, 7, GREEN_L); // painted flower
  },
});

// Coated-wire dish drainer with plates on edge and upturned cups on a drainboard mat.
defineProp('dish_rack', {
  size: [15, 9, 10], scale: S32,
  build(m) {
    const w = '#e8e8e2';
    m.box(0, 0, 0, 15, 1, 10, '#8ab0a0');
    m.box(0, 1, 0, 15, 1, 1, w); m.box(0, 1, 9, 15, 1, 1, w); m.box(0, 1, 0, 1, 1, 10, w); m.box(14, 1, 0, 1, 1, 10, w);
    m.box(0, 4, 0, 10, 1, 1, w); m.box(0, 4, 9, 10, 1, 1, w);
    for (const [x, z] of [[0, 0], [0, 9], [9, 0], [9, 9], [14, 0], [14, 9]]) m.box(x, 1, z, 1, 3, 1, w);
    for (const x of [2, 4, 6, 8]) discX(m, x, 4.5, 5, 3.4, (z, y, dz, dy, q) => q > 3.0 ? '#7a9ac0' : CHINA);  // plates on edge
    for (const z of [2.5, 7]) { disc(m, 12, 1, z, 1.4, 3, z > 5 ? '#e8c040' : WHITE); disc(m, 12, 3, z, 1.4, 1, z > 5 ? '#c89a20' : '#5a7aa8', 0.9); }
  },
});

// Round crocheted lace doily (extra): flat, for table tops.
defineProp('doily_table', {
  size: [12, 1, 12], scale: S32,
  build(m) {
    disc(m, 6, 0, 6, 5.8, 1, (x, z, dx, dz, d) => (d > 4.8 ? ((x + z) % 2 ? WHITE : 0) : d > 3.6 && (x * 3 + z) % 4 === 0 ? 0 : WHITE));
  },
});

// ============================================================================================
// LIVING ROOM: radio, television, music, lamps, clocks
// ============================================================================================

// 1953 console television: walnut cabinet (0.94 m), rounded glowing screen in a gold mask,
// knobs, speaker grille with fretwork, a doily and rabbit-ear antenna on top.
defineProp('tv_console', {
  size: [13, 23, 9], collide: [0.81, 0.94, 0.56],
  light: lampLight(0, 0.7, 0.3, [0.5, 0.62, 0.9], 3.5, 'room'),
  build(m) {
    legs4(m, 1, 1, 11, 6, 0, 2, WAL_D);
    m.box(0, 2, 0, 13, 13, 8, WAL); m.box(0, 14, 0, 13, 1, 8, WAL_L);
    m.box(0, 2, 7, 13, 1, 1, WAL_D);
    // screen: gold-tan mask, rounded tube face, faint picture
    m.box(1, 7, 8, 9, 7, 1, '#c8b48a');
    const scr = { c: '#aabbd0', emit: 0.9 }, scrL = { c: '#c4d2e2', emit: 0.9 }, scrD = { c: '#8a9cb4', emit: 0.9 };
    m.box(2, 8, 8, 7, 5, 1, scr); m.box(4, 10, 8, 3, 2, 1, scrL); m.box(2, 8, 8, 7, 1, 1, scrD);
    for (const [x, y] of [[2, 8], [8, 8], [2, 12], [8, 12]]) m.set(x, y, 8, '#c8b48a');
    // knobs + channel indicator
    m.set(11, 12, 8, BLK); m.set(11, 10, 8, BLK); m.set(11, 13, 8, BRASS_L); m.set(11, 8, 8, { c: '#ffb060', emit: 0.6 });
    // speaker grille
    m.box(1, 3, 8, 11, 3, 1, '#b8a47a'); for (const x of [3, 6, 9]) m.box(x, 3, 8, 1, 3, 1, WAL_L);
    m.box(1, 6, 8, 11, 1, 1, BRASS_D);
    // doily + rabbit ears
    m.box(3, 14, 2, 7, 1, 4, WHITE); m.box(4, 14, 3, 5, 1, 2, LINEN);
    m.box(5, 15, 3, 3, 1, 2, BLK); m.set(6, 16, 3, BLK_L);
    line(m, 6, 16, 3, 1, 22, 2, CHR); line(m, 6, 16, 3, 11, 22, 2, CHR);
    m.set(1, 22, 2, CHR_L); m.set(11, 22, 2, CHR_L);
  },
});

// Walnut floor radio with an arched top, fretwork grille and a glowing amber dial. 1.06 m.
defineProp('radio_console', {
  size: [11, 17, 7], collide: [0.69, 1.06, 0.44],
  build(m) {
    m.box(0, 0, 0, 11, 2, 6, WAL_D); m.box(1, 0, 6, 9, 1, 1, WAL_D);
    m.box(0, 2, 0, 11, 13, 6, WAL);
    m.box(1, 15, 0, 9, 1, 6, WAL); m.box(3, 16, 0, 5, 1, 6, WAL_L);          // arched top
    m.box(0, 2, 5, 1, 13, 1, WAL_L); m.box(10, 2, 5, 1, 13, 1, WAL_L);       // pilasters
    // grille cloth + fretwork arch
    m.box(2, 3, 6, 7, 6, 1, '#c2a878'); for (const x of [3, 5, 7]) m.box(x, 3, 6, 1, 5, 1, WAL_L);
    m.box(3, 8, 6, 5, 1, 1, WAL_L); m.box(2, 9, 6, 7, 1, 1, WAL_L);
    // dial + knobs
    m.box(3, 11, 6, 5, 3, 1, BRASS_D);
    m.box(4, 11, 6, 3, 3, 1, { c: '#ffb040', emit: 0.9 }); m.set(5, 12, 6, { c: '#7a3a10', emit: 0.4 });
    for (const x of [1, 3, 7, 9]) m.set(x, 10, 6, BLK);
    m.box(4, 14, 5, 3, 1, 1, WAL_L);
  },
});

// Brown Bakelite tabletop radio: louvred grille, glowing round dial, cream knobs. (1/32: 0.34 m wide)
defineProp('radio_table', {
  size: [11, 8, 7], scale: 1 / 32,
  build(m) {
    const b = '#5a2e1c', bl = '#74402a', bd = '#3e1e12';
    m.box(0, 0, 0, 11, 6, 6, b); m.box(1, 6, 0, 9, 1, 6, b); m.box(3, 7, 1, 5, 1, 4, bl);
    m.clear(0, 5, 5, 1, 1, 1); m.clear(10, 5, 5, 1, 1, 1);
    for (const y of [1, 3]) m.box(1, y, 5, 5, 1, 1, bd);                     // louvres
    m.box(1, 5, 5, 5, 1, 1, bl);
    m.box(7, 2, 5, 3, 3, 1, { c: '#ffb04a', emit: 0.8 }); m.set(8, 3, 5, { c: '#8a4a10', emit: 0.3 });
    m.set(7, 1, 6, CREAM); m.set(9, 1, 6, CREAM);
    m.box(0, 0, 0, 11, 1, 6, bd);
  },
});

// Walnut phonograph cabinet with the lid propped open, an LP on the turntable, records below.
defineProp('phonograph', {
  size: [14, 21, 9], collide: [0.88, 0.81, 0.5],
  build(m) {
    legs4(m, 0, 0, 13, 7, 0, 1, WAL_D);
    m.box(0, 1, 0, 14, 12, 8, WAL); m.box(0, 12, 0, 14, 1, 8, WAL_L);
    m.clear(1, 2, 2, 6, 8, 6); m.box(1, 2, 2, 6, 1, 6, WAL_D);             // record shelf
    const sl = ['#c83a30', '#2a4a8a', '#e8d8a0', '#1e1c1a', '#3a7a4a', '#d88a30'];
    for (let x = 1; x < 7; x++) m.box(x, 3, 3, 1, 6 - (x % 2), 4, sl[x - 1]);  // LP sleeves on edge
    m.box(8, 2, 8, 5, 8, 1, '#c2a878'); m.box(10, 2, 8, 1, 8, 1, WAL_L);    // speaker grille
    m.box(0, 1, 8, 14, 1, 1, WAL_D); m.box(0, 10, 8, 14, 2, 1, WAL);
    // turntable: platter, black LP, red label, spindle, tone arm
    disc(m, 6, 13, 4, 3.2, 1, BLK_L); disc(m, 6, 13, 4, 2.8, 1, BLK); m.box(5, 13, 3, 2, 1, 2, '#c83a30');
    m.set(6, 14, 4, CHR_L); m.box(11, 13, 6, 2, 1, 2, CHR_D); line(m, 11, 14, 6, 8, 14, 4, CHR);
    m.set(12, 13, 1, CREAM);
    // lid, propped open at the back
    m.box(0, 13, 0, 14, 8, 1, WAL); m.box(1, 14, 0, 12, 6, 1, WAL_L); line(m, 13, 13, 3, 13, 17, 1, BRASS);
  },
});

// Walnut upright piano: keyboard, music desk with sheet music, pedals, metronome & photo on top.
defineProp('piano_upright', {
  size: [24, 24, 11], collide: [1.5, 1.31, 0.69],
  build(m) {
    m.box(0, 0, 0, 24, 1, 7, WAL_D);
    m.box(0, 1, 0, 24, 19, 6, WAL); m.box(0, 20, 0, 24, 1, 7, WAL_L);
    m.box(2, 2, 6, 20, 7, 1, WAL); m.box(3, 3, 6, 8, 5, 1, WAL_L); m.box(13, 3, 6, 8, 5, 1, WAL_L); // lower panels
    for (const x of [0, 22]) { m.box(x, 0, 7, 2, 9, 2, WAL_D); m.box(x, 9, 6, 2, 4, 4, WAL); }   // toe blocks & key cheeks
    m.box(2, 9, 6, 20, 2, 4, WAL); m.box(2, 9, 9, 20, 2, 1, WAL_D);          // keybed & key slip
    m.box(2, 11, 6, 20, 1, 4, WHITE);
    for (let x = 2; x < 22; x++) { const k = (x - 2) % 7; if (k !== 2 && k !== 6) m.box(x, 12, 6, 1, 1, 2, BLK); }
    m.box(2, 12, 5, 20, 1, 1, '#7a1e22');                                    // red felt strip
    m.box(2, 13, 5, 20, 7, 1, WAL_L); m.box(4, 14, 5, 16, 5, 1, WAL);      // upper panel
    m.box(9, 15, 5, 6, 3, 1, '#b8a47a');
    m.box(5, 13, 6, 14, 1, 2, WAL_D);                                        // music desk ledge
    m.box(7, 14, 6, 5, 5, 1, '#efe8d8'); m.box(12, 14, 6, 5, 5, 1, '#f4efe2');  // open sheet music
    for (const y of [15, 17]) { m.box(7, y, 6, 10, 1, 1, '#b4ac9c'); m.set(9, y, 6, '#3a3632'); m.set(14, y, 6, '#3a3632'); }
    for (const x of [10, 12, 14]) m.box(x, 1, 7, 1, 1, 2, BRASS);            // pedals
    for (const x of [5, 18]) m.set(x, 16, 6, BRASS);                         // candle sconces
    m.box(3, 21, 2, 3, 3, 1, BRASS); m.set(4, 22, 2, '#c8b89a');            // framed photo
    m.box(18, 21, 2, 3, 1, 2, WAL_D); m.box(18, 22, 2, 3, 1, 2, WAL); m.set(19, 23, 2, WAL); line(m, 19, 21, 4, 20, 23, 4, CHR); // metronome
  },
});

// Floor lamp: brass column, pleated silk shade with a gold fringe. Lights its room.
defineProp('lamp_floor', {
  size: [9, 27, 9], collide: [0.35, 1.6, 0.35],
  light: lampLight(0, 1.35, 0, [1.0, 0.8, 0.52], 5, 'room'),
  build(m) {
    disc(m, 4.5, 0, 4.5, 3.4, 1, BRASS_D); disc(m, 4.5, 1, 4.5, 2.4, 1, BRASS);
    m.box(4, 2, 4, 1, 19, 1, BRASS); disc(m, 4.5, 9, 4.5, 1.3, 2, BRASS_L); disc(m, 4.5, 16, 4.5, 1.0, 1, BRASS_D);
    const sh = { c: '#f2dfb8', emit: 0.55 }, shd = { c: '#e4cc9e', emit: 0.55 };
    disc(m, 4.5, 19, 4.5, 4.5, 2, (x, z) => ((x + z) % 2 ? sh : shd));      // pleated shade
    disc(m, 4.5, 21, 4.5, 4.0, 2, (x, z) => ((x + z) % 2 ? sh : shd));
    disc(m, 4.5, 23, 4.5, 3.4, 2, sh);
    disc(m, 4.5, 25, 4.5, 2.2, 1, shd); m.set(4, 26, 4, BRASS);
    disc(m, 4.5, 18, 4.5, 4.5, 1, (x, z) => ((x + z) % 2 ? '#c9a24a' : 0), 3.4);   // fringe
    disc(m, 4.5, 19, 4.5, 3.5, 1, { c: '#fff4d8', emit: 0.9 });               // glowing underside
  },
});

// Green-glass banker's desk lamp with a brass base and pull chain (1/32). Lights nearby.
defineProp('lamp_desk', {
  size: [12, 14, 8], scale: 1 / 32,
  light: lampLight(0, 0.3, 0, [1.0, 0.86, 0.6], 3, 'room'),
  build(m) {
    oval(m, 6, 0, 4, 5, 3.5, 1, BRASS_D); oval(m, 6, 1, 4, 4, 2.6, 1, BRASS);
    m.box(5, 2, 3, 2, 6, 2, BRASS); m.box(4, 7, 3, 4, 1, 2, BRASS_L); m.box(3, 8, 3, 1, 2, 2, BRASS); m.box(8, 8, 3, 1, 2, 2, BRASS);
    const g = { c: '#2d7a4c', emit: 0.25 }, gl = { c: '#4a9a6a', emit: 0.3 };
    for (let x = 1; x <= 10; x++) {                                         // half-cylinder shade
      m.box(x, 10, 1, 1, 1, 6, g); m.box(x, 11, 1, 1, 1, 6, g); m.box(x, 12, 2, 1, 1, 4, gl); m.box(x, 13, 3, 1, 1, 2, gl);
    }
    m.box(1, 10, 1, 10, 1, 6, g); m.box(2, 10, 2, 8, 1, 4, { c: '#fff2c8', emit: 0.9 });
    m.box(1, 10, 1, 1, 2, 6, BRASS); m.box(10, 10, 1, 1, 2, 6, BRASS);
    line(m, 8, 9, 5, 8, 6, 5, CHR_L); m.set(8, 5, 5, BRASS_L);                // pull chain
  },
});

// Pendant ceiling light: milk-glass bowl on a brass stem. Origin at the BOTTOM of the bowl;
// the canopy is 0.75 m above it (placers set its y so the canopy touches the ceiling).
defineProp('ceiling_lamp', {
  size: [10, 12, 10],
  light: lampLight(0, 0.15, 0, [1.0, 0.86, 0.64], 6, 'room'),
  build(m) {
    disc(m, 5, 11, 5, 2.2, 1, BRASS); disc(m, 5, 10, 5, 1.2, 1, BRASS_D);
    m.box(4, 5, 4, 1, 5, 1, BRASS_D); m.set(4, 7, 4, BRASS_L);
    const g = { c: '#f5eedc', emit: 0.7 };
    disc(m, 5, 0, 5, 1.6, 1, BRASS); disc(m, 5, 1, 5, 3.0, 1, g); disc(m, 5, 2, 5, 4.0, 1, g);
    disc(m, 5, 3, 5, 4.6, 1, g); disc(m, 5, 4, 5, 4.9, 1, BRASS, 3.9); disc(m, 5, 4, 5, 3.9, 1, { c: '#fff6e0', emit: 0.9 });
    disc(m, 5, 5, 5, 1.5, 1, BRASS);
  },
});

// Eight-arm brass chandelier with flame-shaped bulbs and crystal drops. Origin at the bottom finial.
defineProp('chandelier', {
  size: [17, 15, 17],
  light: lampLight(0, 0.4, 0, [1.0, 0.84, 0.6], 8, 'room'),
  build(m) {
    const c = 8;
    disc(m, c + 0.5, 14, c + 0.5, 2.2, 1, BRASS);
    for (let y = 9; y < 14; y++) m.set(c, y, c, y % 2 ? BRASS : BRASS_D);   // chain
    disc(m, c + 0.5, 8, c + 0.5, 1.2, 1, BRASS); disc(m, c + 0.5, 4, c + 0.5, 2.0, 3, BRASS); disc(m, c + 0.5, 7, c + 0.5, 1.4, 1, BRASS_L);
    disc(m, c + 0.5, 3, c + 0.5, 1.2, 1, BRASS_D); m.set(c, 2, c, BRASS); m.set(c, 1, c, BRASS_L); m.set(c, 0, c, GLASS_L);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
      const x1 = Math.round(c + 4 * ca), z1 = Math.round(c + 4 * sa), x2 = Math.round(c + 6.5 * ca), z2 = Math.round(c + 6.5 * sa);
      line(m, c, 5, c, x1, 4, z1, BRASS); line(m, x1, 4, z1, x2, 6, z2, BRASS);
      m.set(x2, 7, z2, BRASS_L); m.set(x2, 8, z2, WHITE);
      m.set(x2, 9, z2, { c: '#fff0c0', emit: 1 }); m.set(x2, 10, z2, { c: '#ffe4a0', emit: 1 });
      m.set(x1, 3, z1, GLASS_L);                                             // crystal drop
    }
  },
});

// Mahogany grandfather clock: bonnet with finials, moon dial, brass pendulum behind glass. 2.06 m.
defineProp('clock_grandfather', {
  size: [9, 33, 6], collide: [0.56, 2.0, 0.38],
  build(m) {
    m.box(0, 0, 0, 9, 2, 6, MAH_D); m.box(0, 2, 0, 9, 7, 6, MAH); m.box(1, 3, 5, 7, 5, 1, MAH_L); m.box(2, 4, 5, 5, 3, 1, MAH);
    m.box(0, 8, 0, 9, 1, 6, MAH_L);
    m.box(1, 9, 0, 7, 13, 5, MAH); m.box(1, 9, 4, 7, 13, 1, MAH_L);
    m.clear(3, 11, 4, 3, 9, 1); m.box(3, 11, 3, 3, 9, 1, '#2a1a12');        // glazed pendulum window
    m.box(4, 13, 3, 1, 7, 1, BRASS); m.box(3, 11, 3, 3, 2, 1, BRASS_L); m.set(4, 12, 3, BRASS);
    m.box(0, 21, 0, 9, 1, 6, MAH_L);
    m.box(0, 22, 0, 9, 8, 5, MAH);                                           // hood
    m.box(0, 22, 5, 1, 8, 1, BRASS_D); m.box(8, 22, 5, 1, 8, 1, BRASS_D);   // columns
    m.box(2, 23, 5, 5, 5, 1, CREAM); m.box(3, 28, 5, 3, 1, 1, '#3a5a9a'); m.set(4, 28, 5, BRASS_L); // dial + moon arch
    for (const [x, y] of [[4, 27], [6, 25], [4, 23], [2, 25]]) m.set(x, y, 5, BLK_L);
    m.set(4, 25, 5, BLK); m.set(4, 26, 5, BLK); m.set(5, 26, 5, BLK);        // hands
    m.box(0, 30, 0, 9, 1, 6, MAH_L); m.box(0, 31, 0, 3, 1, 6, MAH); m.box(6, 31, 0, 3, 1, 6, MAH); // broken pediment
    m.set(4, 31, 3, BRASS); m.set(4, 32, 3, BRASS_L); m.set(0, 32, 3, BRASS); m.set(8, 32, 3, BRASS);
  },
});

// Schoolhouse regulator wall clock (1/32): octagon face, drop case with pendulum. Back at z=0.
defineProp('clock_wall', {
  size: [12, 20, 3], scale: 1 / 32, origin: [6, 0, 0],
  build(m) {
    m.box(3, 0, 0, 6, 8, 2, OAK); m.box(4, 2, 2, 4, 4, 1, OAK_D); m.box(5, 3, 2, 2, 2, 1, BRASS); m.set(5, 0, 1, OAK_D);
    discZ(m, 6, 13, 0, 6, (x, y, dx, dy, q) => (Math.abs(dx) + Math.abs(dy) < 8.2 ? OAK : 0), -1, 2);
    discZ(m, 6, 13, 2, 4.4, CREAM); discZ(m, 6, 13, 2, 4.4, OAK_D, 3.8);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; m.set(Math.floor(6 + 3.2 * Math.sin(a)), Math.floor(13 + 3.2 * Math.cos(a)), 2, k % 3 ? '#8a8070' : BLK); }
    m.set(5, 13, 2, BLK); m.set(5, 14, 2, BLK); m.set(5, 15, 2, BLK); m.set(6, 13, 2, BLK); m.set(7, 12, 2, BLK); // hands (~5:00)
  },
});

// Gilt wall mirror with an arched top and crest. Back at z=0 (origin at the back). 0.75 x 1.13 m.
defineProp('mirror_wall', {
  size: [12, 19, 2], origin: [6, 0, 0],
  build(m) {
    const g = '#b8923e', gd = '#8a6a2a';
    m.box(0, 0, 0, 12, 17, 2, g); m.box(1, 17, 0, 10, 1, 2, g); m.box(4, 18, 0, 4, 1, 2, gd);
    m.clear(0, 16, 0, 1, 1, 2); m.clear(11, 16, 0, 1, 1, 2);
    m.box(0, 0, 1, 12, 1, 1, gd); m.set(5, 17, 1, BRASS_L); m.set(6, 17, 1, BRASS_L);
    m.clear(1, 1, 1, 10, 15, 1); m.box(1, 1, 0, 10, 15, 1, GLASS); m.clear(1, 15, 1, 1, 1, 1);
    line(m, 2, 4, 0, 6, 12, 0, GLASS_L); line(m, 5, 3, 0, 9, 11, 0, GLASS_L); line(m, 3, 4, 0, 7, 12, 0, GLASS_L);
  },
});

// Landscape oil painting: harbour, lighthouse and sailboat under a tint-A sky, gilt frame (1/32).
// Back at z=0 (origin at the back). 0.88 x 0.63 m.
defineProp('painting', {
  size: [28, 20, 2], scale: 1 / 32, origin: [14, 0, 0],
  build(m) {
    const g = '#b8923e', gd = '#8a6a2a';
    m.box(0, 0, 0, 28, 20, 2, g); m.box(1, 1, 1, 26, 18, 1, gd);
    m.box(2, 2, 0, 24, 16, 1, 0); m.clear(2, 2, 1, 24, 16, 1);
    m.box(2, 14, 0, 24, 4, 1, T(0.5)); m.box(2, 11, 0, 24, 3, 1, T(0.6));  // sky
    m.box(6, 15, 0, 5, 1, 1, '#f0ece4'); m.box(7, 16, 0, 3, 1, 1, '#f0ece4'); m.box(17, 13, 0, 4, 1, 1, '#f0ece4');
    m.box(2, 10, 0, 9, 1, 1, '#6a8a7a'); m.box(2, 11, 0, 5, 1, 1, '#6a8a7a'); m.box(14, 10, 0, 12, 1, 1, '#5a7a6a'); // far hills
    m.box(2, 5, 0, 24, 5, 1, '#3e6a8a'); m.box(4, 8, 0, 5, 1, 1, '#6a92ae'); m.box(12, 6, 0, 6, 1, 1, '#6a92ae'); // sea
    m.box(2, 2, 0, 24, 3, 1, '#6a5a3a'); m.box(15, 4, 0, 11, 2, 1, '#5a4a32'); m.box(2, 4, 0, 6, 1, 1, '#7a8a4a'); // shore
    m.box(20, 6, 0, 2, 6, 1, '#f0ece4'); m.box(20, 8, 0, 2, 1, 1, '#c03a2e'); m.box(20, 12, 0, 2, 1, 1, '#3a3a3a');
    m.set(20, 13, 0, '#ffe8a0'); m.set(21, 13, 0, '#ffe8a0'); m.box(19, 14, 0, 4, 1, 1, '#c03a2e');   // lighthouse
    m.box(8, 6, 0, 5, 1, 1, '#4a3222'); m.box(10, 7, 0, 1, 6, 1, '#4a3222');  // sailboat
    for (let y = 7; y < 12; y++) m.box(11, y, 0, Math.max(1, Math.floor((12 - y) * 0.7)), 1, 1, '#f4f0e6');
    m.box(8, 8, 0, 2, 3, 1, '#e8e0d0');
  },
});

// Portrait of a stern whiskered gentleman in a heavy gilt frame (1/32). Back at z=0.
defineProp('portrait', {
  size: [16, 21, 2], scale: 1 / 32, origin: [8, 0, 0],
  build(m) {
    const g = '#b8923e', gd = '#8a6a2a', skin = '#d8b090', skinD = '#b88a68', grey = '#a8a49c';
    m.box(0, 0, 0, 16, 21, 2, g); m.box(1, 1, 1, 14, 19, 1, gd);
    m.clear(2, 2, 1, 12, 17, 1); m.box(2, 2, 0, 12, 17, 1, '#2e2418'); m.box(2, 12, 0, 12, 7, 1, '#3a2e1e');
    m.box(3, 2, 0, 10, 5, 1, '#1a1816'); m.box(4, 7, 0, 8, 1, 1, '#1a1816');   // black coat
    m.box(7, 4, 0, 2, 4, 1, '#e8e0d0'); m.box(7, 5, 0, 2, 1, 1, '#2a2620');  // shirt & cravat
    m.box(5, 8, 0, 6, 8, 1, skin); m.box(6, 16, 0, 4, 1, 1, skin);          // head (bald crown)
    m.box(5, 12, 0, 1, 4, 1, grey); m.box(10, 12, 0, 1, 4, 1, grey);        // grey hair at the sides
    m.box(5, 8, 0, 1, 4, 1, grey); m.box(10, 8, 0, 1, 4, 1, grey);          // mutton chops
    m.box(6, 13, 0, 2, 1, 1, '#4a3a2a'); m.box(8, 13, 0, 2, 1, 1, '#4a3a2a'); m.set(6, 14, 0, '#4a3a2a'); m.set(9, 14, 0, '#4a3a2a'); // stern brows
    m.set(6, 12, 0, '#2a2018'); m.set(9, 12, 0, '#2a2018');                  // eyes
    m.box(7, 10, 0, 2, 2, 1, skinD); m.box(6, 9, 0, 4, 1, 1, grey); m.box(7, 8, 0, 2, 1, 1, '#6a4a3a'); // nose, moustache, mouth
    m.box(6, 0, 1, 4, 1, 1, BRASS_L);                                         // name plate
  },
});

// Cluster of three small family photographs for a wall (1/32). Back at z=0.
defineProp('photo_frames', {
  size: [20, 12, 2], scale: 1 / 32, origin: [10, 0, 0],
  build(m) {
    const sep = '#cbb89a', fig = '#5a4632';
    // centre: wedding couple in dark wood
    m.box(7, 3, 0, 6, 9, 2, WAL); m.clear(8, 4, 1, 4, 7, 1); m.box(8, 4, 0, 4, 7, 1, sep);
    m.box(8, 4, 0, 2, 4, 1, '#f0ece4'); m.set(8, 8, 0, '#d8c0a0'); m.box(10, 4, 0, 2, 5, 1, fig); m.set(11, 9, 0, '#c8a888');
    // left: baby in silver
    m.box(0, 1, 0, 6, 6, 2, CHR); m.clear(1, 2, 1, 4, 4, 1); m.box(1, 2, 0, 4, 4, 1, '#d8d4cc');
    m.box(2, 2, 0, 2, 2, 1, WHITE); m.set(2, 4, 0, '#d8b8a0'); m.set(3, 4, 0, '#d8b8a0');
    // right: sailor son in gilt
    m.box(14, 5, 0, 6, 7, 2, BRASS); m.clear(15, 6, 1, 4, 5, 1); m.box(15, 6, 0, 4, 5, 1, sep);
    m.box(16, 6, 0, 2, 2, 1, '#1e2a4a'); m.box(16, 8, 0, 2, 2, 1, '#d8b8a0'); m.box(16, 10, 0, 2, 1, 1, WHITE);
  },
});

// Three standing photo frames for a mantel, piano or sideboard (1/32). Front +z.
defineProp('photo_frames_standing', {
  size: [16, 9, 4], scale: 1 / 32,
  build(m) {
    const sep = '#cbb89a';
    m.box(0, 0, 1, 5, 6, 1, CHR); m.box(1, 1, 2, 3, 4, 1, sep); m.box(2, 1, 2, 1, 3, 1, '#5a4632'); m.set(2, 0, 0, CHR_D);
    m.box(5, 0, 1, 6, 9, 1, WAL); m.box(6, 1, 2, 4, 7, 1, sep); m.box(6, 1, 2, 2, 4, 1, '#f0ece4'); m.box(8, 1, 2, 2, 5, 1, '#5a4632'); m.set(7, 0, 0, WAL_D);
    m.box(11, 0, 2, 5, 5, 1, BRASS); m.box(12, 1, 3, 3, 3, 1, sep); m.set(13, 2, 3, '#1e2a4a'); m.set(13, 3, 3, '#d8b8a0'); m.set(13, 0, 1, BRASS_D);
  },
});

// ============================================================================================
// LIVING ROOM & HOUSEHOLD: plants, sewing & laundry, rugs, fireplace, radiator, telephones
// ============================================================================================

// Terracotta pot with a leafy philodendron. 0.5 x 0.75 m.
defineProp('plant_pot', {
  size: [8, 12, 8], collide: [0.3, 0.7, 0.3],
  build(m) {
    const tc = '#b8643a', tcd = '#9a4e2c';
    disc(m, 4, 0, 4, 2.3, 1, tcd); disc(m, 4, 1, 4, 2.6, 3, tc); disc(m, 4, 4, 4, 3.0, 1, tcd); disc(m, 4, 4, 4, 2.2, 1, '#4a3222');
    const leaf = (x, y, z, nx, ny) => (ny > 0.35 ? GREEN_L : (x + z) % 3 === 0 ? GREEN_D : GREEN);
    ell(m, 4, 7, 4, 3.4, 2.4, 3.4, leaf); ell(m, 3, 9.5, 4.5, 2, 1.8, 2, leaf); ell(m, 5.5, 9, 3, 1.8, 1.8, 1.8, leaf);
    for (const [x, y, z] of [[0, 6, 4], [7, 6, 3], [4, 6, 7], [3, 5, 0], [6, 11, 5]]) m.set(x, y, z, GREEN_L);
  },
});

// Boston fern spilling over a brass jardiniere on a tall walnut plant stand. 1.25 m.
defineProp('fern_stand', {
  size: [13, 20, 13], collide: [0.4, 1.2, 0.4],
  build(m) {
    m.box(4, 11, 4, 5, 1, 5, WAL_L); legs4(m, 4, 4, 8, 8, 0, 11, WAL); m.box(4, 3, 4, 5, 1, 5, WAL_D);
    disc(m, 6.5, 12, 6.5, 2.2, 1, BRASS_D); disc(m, 6.5, 13, 6.5, 2.7, 2, BRASS); disc(m, 6.5, 15, 6.5, 2.9, 1, BRASS_L);
    ell(m, 6.5, 16.2, 6.5, 2.6, 1.6, 2.6, (x, y, z, nx, ny) => ny > 0.3 ? GREEN_L : GREEN);
    for (let k = 0; k < 12; k++) {                                         // arching, drooping fronds
      const a = k * Math.PI / 6 + 0.2, ca = Math.cos(a), sa = Math.sin(a);
      const r1 = 3.5, r2 = 5.6, x1 = 6.5 + r1 * ca, z1 = 6.5 + r1 * sa, x2 = 6.5 + r2 * ca, z2 = 6.5 + r2 * sa;
      const c = k % 2 ? GREEN : GREEN_L;
      line(m, Math.floor(6.5 + 1.5 * ca), 17, Math.floor(6.5 + 1.5 * sa), Math.floor(x1), 17 + (k % 3 === 0 ? 1 : 0), Math.floor(z1), c);
      line(m, Math.floor(x1), 16, Math.floor(z1), Math.floor(x2), 11 + (k % 3), Math.floor(z2), k % 2 ? GREEN_D : GREEN);
    }
  },
});

// Rubber plant (ficus) in a glazed pot: tall stem with big glossy leaves. 1.44 m.
defineProp('rubber_plant', {
  size: [11, 23, 11], collide: [0.4, 1.4, 0.4],
  build(m) {
    const pot = '#3e6a5a', potl = '#4e7e6c';
    disc(m, 5.5, 0, 5.5, 2.4, 1, pot); disc(m, 5.5, 1, 5.5, 3.0, 4, pot); disc(m, 5.5, 5, 5.5, 3.4, 1, potl); disc(m, 5.5, 5, 5.5, 2.6, 1, '#4a3222');
    m.box(5, 5, 5, 1, 16, 1, '#5a4a2e');
    const L = '#1f4a2a', Lh = '#2f6a3a';
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
    for (let i = 0; i < 12; i++) {
      const [dx, dz] = dirs[(i * 3) % 8], y = 7 + i;
      if (y > 20) break;
      for (let t = 1; t <= 4; t++) {
        const x = 5 + dx * t, z = 5 + dz * t, yy = y - (t > 2 ? 1 : 0);
        m.set(x, yy, z, t === 4 ? L : Lh);
        if (dx === 0) { m.set(x + 1, yy, z, L); } else if (dz === 0) { m.set(x, yy, z + 1, L); } else { m.set(x - dx, yy, z, L); }
      }
    }
    m.set(5, 21, 5, '#8a3a2a');                                              // new leaf sheath
  },
});

// Glazed umbrella stand with two umbrellas and a crook-handled cane.
defineProp('umbrella_stand', {
  size: [6, 15, 6], collide: [0.3, 0.6, 0.3],
  build(m) {
    disc(m, 3, 0, 3, 2.6, 8, '#2e4a3a'); disc(m, 3, 8, 3, 2.8, 1, BRASS); disc(m, 3, 7, 3, 2.0, 2, 0);
    disc(m, 3, 3, 3, 2.7, 1, '#3e5e4a');
    line(m, 2, 7, 2, 1, 12, 1, BLK); m.box(1, 8, 1, 2, 3, 2, BLK_L); m.set(1, 13, 1, WAL); m.set(0, 13, 1, WAL); m.set(0, 12, 1, WAL);
    line(m, 4, 7, 3, 4, 12, 4, '#8a2a2a'); m.box(4, 8, 3, 1, 3, 2, '#9a3434'); m.set(4, 13, 4, CHR); m.set(4, 14, 4, CHR_L);
    line(m, 3, 7, 4, 3, 13, 5, WAL_L); m.set(3, 14, 5, WAL_L); m.set(2, 14, 5, WAL_L); m.set(2, 13, 5, WAL_L);
  },
});

// Wooden magazine rack with Life, the Post and a folded newspaper.
defineProp('magazine_rack', {
  size: [9, 8, 6],
  build(m) {
    m.box(0, 0, 0, 1, 6, 6, WAL); m.box(8, 0, 0, 1, 6, 6, WAL); m.clear(0, 2, 2, 1, 3, 2); m.clear(8, 2, 2, 1, 3, 2);
    m.box(1, 1, 0, 7, 1, 6, WAL_D); m.box(1, 3, 0, 7, 1, 1, WAL); m.box(1, 3, 5, 7, 1, 1, WAL); m.box(1, 5, 0, 7, 1, 1, WAL); m.box(1, 5, 5, 7, 1, 1, WAL);
    m.box(1, 1, 2, 7, 6, 2, WAL_L); m.box(3, 5, 2, 3, 1, 2, 0);                // centre divider with hand hole
    m.box(1, 2, 1, 4, 5, 1, '#f0ece0'); m.box(1, 5, 1, 2, 2, 1, '#c8302a');    // LIFE
    m.box(5, 2, 1, 3, 4, 1, '#d8c89a'); m.box(5, 5, 1, 3, 1, 1, '#2a4a8a');    // the Post
    m.box(2, 2, 4, 5, 5, 1, '#dcd6c4'); m.box(3, 5, 4, 3, 1, 1, '#6a665e');    // newspaper
  },
});

// Treadle sewing machine: cast-iron base, oak cabinet, black japanned head with gold decals.
defineProp('sewing_machine', {
  size: [15, 19, 8], collide: [0.94, 0.75, 0.5],
  build(m) {
    for (const x of [0, 13]) {                                              // ornate iron sides
      m.box(x, 0, 0, 2, 1, 8, IRON); m.box(x, 1, 1, 2, 10, 1, IRON); m.box(x, 1, 6, 2, 10, 1, IRON);
      line(m, x, 2, 2, x, 9, 5, IRON_L); line(m, x, 2, 5, x, 9, 2, IRON_L); m.box(x, 10, 1, 2, 1, 6, IRON);
    }
    m.box(2, 2, 2, 11, 1, 4, IRON); for (let x = 3; x < 12; x += 2) m.box(x, 2, 3, 1, 1, 2, IRON_L);   // treadle grille
    discX(m, 12, 6, 4, 3.0, IRON, 2.0); m.box(12, 6, 4, 1, 1, 1, IRON_L); line(m, 12, 6, 4, 12, 3, 4, IRON_L); // flywheel
    line(m, 12, 9, 3, 12, 15, 3, '#a88a5a');                                // belt
    m.box(0, 11, 0, 15, 1, 8, OAK); m.box(2, 9, 1, 4, 2, 6, OAK_D); m.box(2, 9, 7, 4, 2, 1, OAK); m.set(3, 10, 7, BRASS);
    m.box(0, 12, 1, 4, 1, 6, T(0.5)); m.box(0, 12, 2, 3, 1, 1, T(0.4));      // fabric being sewn
    // machine head
    m.box(3, 12, 2, 9, 1, 4, BLK); m.box(9, 13, 2, 3, 4, 3, BLK); m.box(3, 16, 2, 9, 2, 3, BLK); m.box(3, 13, 2, 2, 3, 3, BLK);
    m.set(4, 13, 4, CHR); m.set(4, 12, 5, CHR_L);                             // needle bar & foot
    for (const [x, y] of [[6, 17], [8, 16], [10, 15], [7, 16]]) m.set(x, y, 4, BRASS);   // gold decals
    discX(m, 12, 15, 3.5, 1.8, CHR); m.set(8, 18, 3, '#b83030'); m.set(8, 17, 3, CHR);   // hand wheel, spool
  },
});

// Ironing board (tinted striped cover) on X legs, with an electric iron and its cord.
defineProp('ironing_board', {
  size: [20, 18, 7], collide: [1.25, 0.85, 0.4],
  build(m) {
    line(m, 4, 0, 2, 14, 12, 2, CHR_D); line(m, 14, 0, 2, 4, 12, 2, CHR_D);
    line(m, 4, 0, 4, 14, 12, 4, CHR_D); line(m, 14, 0, 4, 4, 12, 4, CHR_D);
    for (const x of [4, 14]) { m.set(x, 0, 2, BLK); m.set(x, 0, 4, BLK); }
    m.box(0, 13, 1, 17, 1, 5, '#e8e2d2'); m.box(17, 13, 2, 2, 1, 3, '#e8e2d2'); m.set(19, 13, 3, '#e8e2d2');
    m.box(0, 13, 2, 18, 1, 1, T(0.55)); m.box(0, 13, 4, 18, 1, 1, T(0.55)); m.box(0, 12, 1, 17, 1, 5, CHR_D);
    m.set(10, 13, 3, '#b89a6a');                                            // a scorch mark
    // iron on its heel-rest plate
    m.box(1, 14, 2, 6, 1, 3, CHR_D); m.box(2, 15, 2, 5, 1, 3, CHR); m.set(7, 15, 3, CHR); m.box(3, 16, 3, 3, 1, 1, CHR_L);
    m.box(3, 17, 3, 3, 1, 1, BLK); m.set(3, 16, 3, BLK); m.set(5, 16, 3, BLK); m.set(4, 15, 4, { c: '#ff6a30', emit: 0.5 });
    line(m, 2, 16, 3, 0, 8, 5, BLK_L); line(m, 0, 8, 5, 1, 2, 6, BLK_L);        // cord
  },
});

// Wringer washing machine: white enamel tub on casters, lid, and a two-roller wringer head.
defineProp('washing_machine', {
  size: [12, 20, 12], collide: [0.7, 1.2, 0.7],
  build(m) {
    for (const [x, z] of [[2, 2], [9, 2], [2, 9], [9, 9]]) { m.set(x, 0, z, BLK); m.box(x, 1, z, 1, 3, 1, ENA_D); }
    m.box(4, 1, 4, 4, 3, 4, CHR_D);                                          // motor housing
    disc(m, 6, 4, 6, 5.2, 1, ENA_D); disc(m, 6, 5, 6, 5.4, 8, ENA); disc(m, 6, 12, 6, 5.5, 1, CHR);
    disc(m, 6, 8, 6, 5.45, 1, ENA_D);
    disc(m, 6, 13, 6, 5.0, 1, ENA_L); disc(m, 6, 14, 6, 1.2, 1, CHR);        // lid & knob
    const fr = '#8e8e88', rub = '#ddd6c2';
    m.box(9, 13, 1, 2, 3, 2, fr);                                              // wringer post
    m.box(2, 15, 1, 1, 5, 3, fr); m.box(10, 15, 1, 1, 5, 3, fr);              // wringer frame
    m.box(3, 16, 1, 7, 1, 3, rub); m.box(3, 17, 1, 7, 1, 3, '#6a665e'); m.box(3, 18, 1, 7, 1, 3, rub); // two rollers
    m.box(2, 19, 1, 9, 1, 3, fr); m.box(5, 20, 2, 3, 1, 1, '#c83a30');        // release bar
    m.box(3, 16, 4, 7, 1, 1, CHR);                                            // drainboard
    m.box(11, 17, 2, 1, 1, 1, fr); m.set(11, 18, 2, BLK);                     // crank stub
    line(m, 11, 6, 7, 11, 1, 9, BLK_L);                                       // drain hose
  },
});

// Wicker laundry basket (banded weave) heaped with washing: sheets, a tinted shirt, jeans.
defineProp('laundry_basket', {
  size: [12, 7, 8],
  build(m) {
    const w1 = '#c8a468', w2 = '#b08c50';
    oval(m, 6, 0, 4, 6, 4, 1, w2);
    for (let y = 1; y <= 4; y++) oval(m, 6, y, 4, 6, 4, 1, y % 2 ? w1 : w2, 0.78);
    oval(m, 6, 5, 4, 6, 4, 1, '#9a7440', 0.78); m.clear(0, 4, 3, 1, 2, 2); m.clear(11, 4, 3, 1, 2, 2);
    oval(m, 6, 1, 4, 4.8, 3, 4, '#f0ede4'); oval(m, 6, 5, 4, 4, 2.6, 1, '#f0ede4'); m.set(5, 6, 4, WHITE); m.set(7, 6, 3, WHITE);
    m.box(3, 5, 5, 3, 1, 2, T(0.5)); m.box(4, 3, 7, 2, 3, 1, T(0.5)); m.set(4, 5, 7, T(0.4));   // shirt over the rim
    m.box(7, 5, 2, 3, 1, 2, '#3a5a8a'); m.set(8, 6, 3, '#4a6a9a');
  },
});

// Braided oval rag rug (1 voxel thick), tint A rings with a cream band. ~2.2 x 1.5 m. No collider.
defineProp('rug_oval', {
  size: [35, 1, 24], cat: 'interior',
  build(m) {
    const bands = [T(0.34), T(0.52), T(0.42), CREAM, T(0.58), T(0.4), T(0.5), '#d8cdb0', T(0.62)];
    oval(m, 17.5, 0, 12, 17.5, 12, 1, (x, z, d) => bands[Math.min(bands.length - 1, Math.floor((1 - d) * 11))]);
  },
});

// Rectangular parlour rug: tint A field, dark patterned border, medallion, fringed ends. 2.4 x 1.6 m.
defineProp('rug_rect', {
  size: [38, 1, 26], cat: 'interior',
  build(m) {
    m.box(1, 0, 0, 36, 1, 26, T(0.46));
    m.box(1, 0, 0, 36, 1, 3, T(0.3)); m.box(1, 0, 23, 36, 1, 3, T(0.3)); m.box(1, 0, 0, 3, 1, 26, T(0.3)); m.box(34, 0, 0, 3, 1, 26, T(0.3));
    m.box(4, 0, 3, 30, 1, 1, CREAM); m.box(4, 0, 22, 30, 1, 1, CREAM); m.box(4, 0, 3, 1, 1, 20, CREAM); m.box(33, 0, 3, 1, 1, 20, CREAM);
    for (let x = 4; x < 34; x += 4) { m.set(x, 0, 1, T(0.62)); m.set(x, 0, 24, T(0.62)); }
    for (let z = 4; z < 23; z += 4) { m.set(2, 0, z, T(0.62)); m.set(35, 0, z, T(0.62)); }
    for (let z = 0; z < 26; z++) for (let x = 0; x < 38; x++) {             // central medallion
      const q = Math.abs(x + 0.5 - 19) / 10 + Math.abs(z + 0.5 - 13) / 6.5;
      if (q <= 1) m.set(x, 0, z, q > 0.8 ? CREAM : q > 0.45 ? T(0.62) : q > 0.2 ? T(0.32) : CREAM);
    }
    for (const [x, z] of [[7, 6], [30, 6], [7, 19], [30, 19]]) { m.set(x, 0, z, T(0.32)); m.set(x + 1, 0, z, T(0.62)); m.set(x, 0, z + 1, T(0.62)); }
    for (let z = 1; z < 26; z += 2) { m.set(0, 0, z, CREAM); m.set(37, 0, z, CREAM); }  // fringe
  },
});

// Fireplace companion set: poker, shovel, brush and tongs on a brass-topped stand.
defineProp('fireplace_tools', {
  size: [7, 13, 6], collide: [0.3, 0.8, 0.3],
  build(m) {
    m.box(1, 0, 1, 5, 1, 4, IRON); m.box(3, 1, 2, 1, 10, 2, IRON); m.box(1, 10, 2, 5, 1, 2, IRON);
    m.box(3, 11, 2, 1, 1, 2, BRASS); m.set(3, 12, 2, BRASS_L);
    m.box(1, 2, 1, 1, 8, 1, IRON_L); m.set(1, 9, 1, BRASS); m.set(0, 2, 1, IRON_L);                 // poker
    m.box(5, 3, 1, 1, 7, 1, IRON_L); m.set(5, 9, 1, BRASS); m.box(4, 1, 0, 3, 2, 1, IRON);          // shovel
    m.box(1, 3, 4, 1, 7, 1, IRON_L); m.set(1, 9, 4, BRASS); m.box(0, 1, 4, 3, 2, 1, '#4a3222');     // brush
    m.box(5, 2, 4, 1, 8, 1, IRON_L); m.set(5, 9, 4, BRASS); m.set(6, 2, 4, IRON_L);                 // tongs
  },
});

// Andirons with a burning log fire: glowing embers and flames. For fireplaces; lights the hearth.
defineProp('fire_logs', {
  size: [12, 8, 8], cat: 'interior',
  light: lampLight(0, 0.3, 0.1, [1.0, 0.55, 0.25], 4, 'always'),
  build(m) {
    for (const x of [1, 10]) { m.box(x, 1, 0, 1, 1, 7, IRON); m.box(x, 0, 6, 1, 4, 1, IRON); m.set(x, 4, 6, BRASS); m.set(x, 5, 6, BRASS_L); m.set(x, 0, 0, IRON); }
    m.box(1, 0, 2, 10, 1, 1, IRON); m.box(1, 0, 5, 10, 1, 1, IRON);
    const ember = { c: '#ff6a1a', emit: 1 }, ember2 = { c: '#ff9a3a', emit: 1 };
    m.box(2, 0, 3, 8, 1, 2, ember); m.set(4, 1, 4, ember2); m.set(7, 1, 3, ember2);
    const bark = (x, y, z, dx, dy) => (x === 1 || x === 10 ? '#8a6a44' : dy > 0.4 ? '#4a3222' : (x + y) % 4 === 0 ? { c: '#ff7a2a', emit: 0.95 } : '#35241a');
    for (let x = 1; x < 11; x++) { discX(m, x, 2.5, 2.8, 1.4, (z, y, dz, dy) => bark(x, y, z, dz, dy)); discX(m, x, 2.5, 5.3, 1.4, (z, y, dz, dy) => bark(x, y, z, dz, dy)); }
    for (let x = 2; x < 10; x++) discX(m, x, 4.3, 4.0, 1.3, (z, y, dz, dy) => bark(x === 2 ? 1 : x === 9 ? 10 : x, y, z, dz, dy));
    const fl = { c: '#ffb040', emit: 1 }, fl2 = { c: '#ffd070', emit: 1 };
    for (const [x, z, h] of [[3, 4, 2], [5, 3, 3], [6, 4, 2], [8, 4, 2], [4, 5, 1]]) { m.box(x, 5, z, 1, h, 1, fl); m.set(x, 5, z, ember2); if (h > 1) m.set(x, 5 + h - 1, z, fl2); }
  },
});

// Cast-iron radiator (silver-painted), ribbed sections, valve and feet. 0.88 x 0.69 x 0.25 m.
defineProp('radiator', {
  size: [14, 11, 4], collide: true,
  build(m) {
    const s = '#b4b2aa', sd = '#8f8d86';
    m.box(1, 1, 1, 12, 9, 2, sd);
    for (let x = 1; x < 13; x += 2) m.box(x, 1, 0, 1, 9, 4, s);             // sections
    m.box(1, 9, 1, 12, 1, 2, s); m.box(1, 1, 1, 12, 1, 2, s);
    m.set(1, 0, 1, sd); m.set(12, 0, 1, sd); m.set(1, 0, 2, sd); m.set(12, 0, 2, sd);
    m.box(13, 2, 1, 1, 1, 2, BRASS_D); m.set(13, 3, 2, BLK); m.box(13, 0, 1, 1, 2, 1, sd); // valve + pipe
  },
});

// Black wall telephone with rotary dial and handset on its hook (1/32). Back at z=0.
defineProp('wall_telephone', {
  size: [10, 16, 6], scale: 1 / 32, origin: [5, 0, 0],
  build(m) {
    m.box(2, 3, 0, 7, 10, 3, BLK); m.box(3, 13, 0, 5, 1, 3, BLK); m.box(3, 3, 3, 5, 1, 1, BLK_L);
    discZ(m, 5.5, 8, 3, 2.2, CHR_L); discZ(m, 5.5, 8, 3, 1.1, WHITE);
    for (const [x, y] of [[4, 10], [6, 10], [7, 8], [7, 7], [6, 6], [4, 6], [4, 8]]) m.set(x, y, 3, BLK_L);
    m.set(8, 6, 3, CHR);                                                     // finger stop
    m.box(0, 4, 1, 1, 10, 2, BLK); m.box(0, 12, 1, 2, 2, 3, BLK); m.box(0, 4, 1, 2, 2, 3, BLK); m.set(1, 12, 1, CHR); // handset
    for (let y = 0; y < 4; y++) m.set(y % 2 ? 1 : 0, y, 2, BLK_L);           // coiled cord
    m.box(4, 1, 1, 3, 2, 1, BLK_L);
  },
});

// Small walnut telephone stand: rotary phone on top, phone book and notepad on the shelf (1/32).
defineProp('telephone_table', {
  size: [14, 29, 13], scale: 1 / 32, collide: [0.44, 0.75, 0.4],
  build(m) {
    m.box(0, 23, 0, 14, 1, 13, WAL_L); m.box(1, 20, 1, 12, 3, 11, WAL); drawer(m, 3, 20, 12, 8, 2, WAL_L, BRASS, 2);
    legs4(m, 1, 1, 12, 11, 0, 20, WAL_D);
    m.box(1, 6, 1, 12, 1, 11, WAL);
    m.box(2, 7, 2, 7, 2, 8, '#e8c840'); m.box(2, 7, 2, 7, 2, 1, '#d8b830'); m.box(3, 8, 3, 5, 1, 6, '#f0e8c0'); // phone book
    m.box(10, 7, 4, 2, 1, 3, WHITE); m.set(11, 8, 5, '#3a6ac8');               // notepad & pencil
    // rotary desk phone
    m.box(4, 24, 3, 6, 2, 6, BLK); m.box(5, 26, 4, 4, 1, 4, BLK);
    discZ(m, 7, 25.5, 9, 1.8, CHR_L); m.set(6, 25, 9, WHITE); m.set(7, 25, 9, WHITE);
    m.box(3, 27, 5, 8, 1, 2, BLK); m.box(3, 26, 4, 1, 1, 4, BLK); m.box(10, 26, 4, 1, 1, 4, BLK);    // handset
    line(m, 4, 24, 3, 1, 24, 1, BLK_L);
  },
});

// ============================================================================================
// BATHROOM
// ============================================================================================

// Clawfoot tub (1.63 m long along x, its open side faces +z), rolled rim, chrome taps at the x=0
// end, and a rubber duck on the rim.
defineProp('bathtub', {
  size: [26, 11, 13], collide: [1.63, 0.62, 0.8],
  build(m) {
    const cx = 13, cz = 6.5, L = 6.5, R = 6.4;
    const inside = (x, z, shrink) => { const dx = Math.max(0, Math.abs(x + 0.5 - cx) - L), dz = z + 0.5 - cz; return dx * dx + dz * dz <= (R - shrink) * (R - shrink); };
    for (let y = 2; y <= 9; y++) for (let z = 0; z < 13; z++) for (let x = 0; x < 26; x++) {
      const shrink = y === 9 ? -0.2 : y >= 5 ? 0.3 : y >= 3 ? 0.8 : 1.4;
      if (inside(x, z, shrink)) m.set(x, y, z, y === 9 ? ENA_L : ENA);
    }
    for (let y = 4; y <= 9; y++) for (let z = 0; z < 13; z++) for (let x = 0; x < 26; x++) if (inside(x, z, y >= 6 ? 1.3 : 1.9)) m.set(x, y, z, 0);
    for (let z = 0; z < 13; z++) for (let x = 0; x < 26; x++) if (inside(x, z, 1.9)) m.set(x, 3, z, ENA_L);
    m.set(5, 3, 6, CHR_D);                                                     // drain
    for (const [x, z] of [[4, 2], [21, 2], [4, 10], [21, 10]]) { m.box(x, 0, z, 1, 2, 1, BRASS); m.set(x, 0, z + (z < 6 ? -1 : 1), BRASS_D); m.set(x + (x < 13 ? -1 : 1), 0, z, BRASS_D); } // claw feet
    // taps at the x=0 end
    m.box(1, 10, 5, 1, 1, 3, CHR); m.box(2, 10, 6, 2, 1, 1, CHR_L); m.set(3, 9, 6, CHR);
    m.set(1, 10, 4, CHR_L); m.set(1, 10, 8, CHR_L); m.set(2, 7, 6, CHR);      // cross handles, overflow
    m.set(22, 10, 3, '#f0d040'); m.set(23, 10, 3, '#f0d040'); m.set(23, 10, 2, '#e08030'); // rubber duck
  },
});

// Close-coupled porcelain toilet with tank, lid down, chrome lever and supply pipe.
defineProp('toilet', {
  size: [8, 13, 11], collide: [0.45, 0.5, 0.65],
  build(m) {
    oval(m, 4, 0, 5.8, 2.2, 2.8, 3, ENA_D); oval(m, 4, 3, 6.5, 2.8, 3.2, 1, ENA);
    oval(m, 4, 4, 6.8, 3.4, 3.8, 3, ENA); oval(m, 4, 5, 6.8, 2.4, 2.8, 2, 0); oval(m, 4, 4, 6.8, 2.4, 2.8, 1, '#a8c4cc');
    oval(m, 4, 7, 6.8, 3.4, 3.8, 1, ENA_L, 2.0); oval(m, 4, 8, 6.6, 3.2, 3.6, 1, WHITE);   // seat + lid
    m.box(1, 3, 0, 6, 1, 3, ENA); m.box(1, 7, 0, 6, 5, 3, ENA); m.box(0, 12, 0, 8, 1, 4, ENA_L); // tank + lid
    m.box(2, 4, 1, 4, 3, 2, ENA_D);
    m.box(1, 11, 3, 2, 1, 1, CHR); m.set(1, 11, 4, CHR_L);                   // flush lever
    m.box(3, 8, 3, 2, 1, 1, CHR_D);                                           // hinge
    m.box(7, 1, 0, 1, 1, 1, CHR); m.box(7, 1, 1, 1, 6, 1, CHR);                // supply pipe
  },
});

// Pedestal wash basin with twin taps, backsplash ledge and a bar of pink soap. Basin top 0.88 m.
defineProp('sink_pedestal', {
  size: [10, 16, 8], collide: [0.6, 0.88, 0.5],
  build(m) {
    m.box(3, 0, 1, 4, 1, 4, ENA_D); m.box(4, 1, 1, 2, 8, 3, ENA); m.box(3, 8, 1, 4, 2, 4, ENA);
    m.box(0, 10, 0, 10, 4, 8, ENA); m.box(0, 13, 0, 10, 1, 8, ENA_L);
    m.clear(0, 10, 7, 1, 4, 1); m.clear(9, 10, 7, 1, 4, 1); m.clear(0, 10, 0, 10, 1, 8); m.box(1, 10, 1, 8, 1, 6, ENA_D);
    m.clear(2, 12, 2, 6, 2, 5); m.box(2, 11, 2, 6, 1, 5, WHITE); m.set(4, 11, 4, CHR_D);
    m.box(0, 14, 0, 10, 2, 2, ENA); m.box(0, 15, 0, 10, 1, 2, ENA_L);          // backsplash ledge
    for (const [x, c] of [[1, '#c84a3a'], [8, '#3a6ac8']]) { m.set(x, 14, 2, CHR); m.set(x, 15, 2, CHR_L); m.set(x, 16, 2, c); }
    m.box(4, 14, 2, 2, 1, 2, CHR); m.set(4, 14, 3, CHR_L);                    // spout
    m.box(7, 16, 0, 2, 1, 1, '#e8a8b0');                                      // soap on the ledge
  },
});

// Freestanding oak towel stand with a tinted bath towel (white stripe) and a hand towel.
defineProp('towel_rack', {
  size: [12, 14, 5], collide: [0.75, 0.85, 0.3],
  build(m) {
    for (const x of [0, 11]) { m.box(x, 0, 0, 1, 1, 5, OAK_D); m.box(x, 1, 2, 1, 12, 1, OAK); m.set(x, 13, 2, OAK_L); }
    m.box(1, 12, 2, 10, 1, 1, OAK_L); m.box(1, 7, 2, 10, 1, 1, OAK_L); m.box(1, 2, 2, 10, 1, 1, OAK);
    const t = T(0.5);
    m.box(2, 13, 1, 7, 1, 3, t); m.box(2, 5, 3, 7, 8, 1, t); m.box(2, 6, 1, 7, 7, 1, t);
    m.box(2, 7, 3, 7, 1, 1, WHITE); m.box(2, 8, 1, 7, 1, 1, WHITE); m.box(2, 5, 3, 7, 1, 1, T(0.42));
    m.box(3, 3, 3, 4, 4, 1, WHITE); m.box(3, 4, 1, 4, 3, 1, WHITE); m.box(3, 3, 3, 4, 1, 1, '#c8d4e4');  // hand towel
  },
});

// Wall medicine cabinet: white enamel frame, mirror door, chrome knob, a little glass shelf with
// a tooth glass. Back at z=0 (origin at the back).
defineProp('medicine_cabinet', {
  size: [8, 11, 3], origin: [4, 0, 0],
  build(m) {
    m.box(0, 1, 0, 8, 10, 2, ENA); m.box(0, 10, 0, 8, 1, 2, CHR);
    m.box(1, 2, 1, 6, 7, 1, GLASS); m.set(2, 6, 1, GLASS_L); m.set(3, 7, 1, GLASS_L); m.set(2, 5, 1, GLASS_L);
    m.set(6, 5, 2, CHR_L);
    m.box(1, 0, 0, 6, 1, 3, GLASS_L); m.box(1, 0, 0, 6, 1, 1, CHR);           // glass shelf
    m.box(2, 1, 2, 1, 2, 1, GLASS_L); m.set(2, 3, 2, '#c84a3a'); m.set(5, 1, 2, '#e8e0cc');  // tooth glass & brush, soap
  },
});

// ============================================================================================
// KIDS' THINGS (small ones on finer grids)
// ============================================================================================

// Wooden alphabet blocks: a little stack plus two strays (1/64: blocks ~8 cm).
const GLYPH3 = { A: ['.#.', '###', '#.#'], B: ['##.', '###', '##.'], C: ['###', '#..', '###'], D: ['##.', '#.#', '##.'], E: ['###', '##.', '###'], X: ['#.#', '.#.', '#.#'] };
function letterBlock(m, x, y, z, col, letter, ink) {
  m.box(x, y, z, 5, 5, 5, col);
  for (const [xx, yy, zz] of [[x, y, z], [x + 4, y, z], [x, y + 4, z], [x + 4, y + 4, z], [x, y, z + 4], [x + 4, y, z + 4], [x, y + 4, z + 4], [x + 4, y + 4, z + 4]]) m.set(xx, yy, zz, '#d8b888');
  const g = GLYPH3[letter];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '#') {
    m.set(x + 1 + c, y + 3 - r, z + 4, ink);                                   // front face (+z)
    m.set(x + 1 + c, y + 4, z + 1 + r, ink);                                   // top face
  }
}
defineProp('toy_blocks', {
  size: [21, 10, 16], scale: 1 / 64,
  build(m) {
    letterBlock(m, 1, 0, 8, '#c83a30', 'A', '#f4ecd8');
    letterBlock(m, 6, 0, 9, '#3a5aa8', 'B', '#f4ecd8');
    letterBlock(m, 3, 5, 8, '#e8c040', 'C', '#c83a30');
    letterBlock(m, 14, 0, 2, '#4a8a4a', 'D', '#f4ecd8');
    letterBlock(m, 15, 0, 10, '#e8dcc0', 'E', '#3a5aa8');
  },
});

// Wind-up toy train: an oval of tin track with ties, a black locomotive, tender and a red car (1/32).
defineProp('toy_train', {
  size: [26, 7, 16], scale: 1 / 32,
  build(m) {
    const cx = 13, cz = 8, rx = 11.5, rz = 6.5;
    for (let i = 0; i < 360; i++) {
      const a = i * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      m.set(Math.floor(cx + rx * c), 1, Math.floor(cz + rz * s), '#7a7e84');
      m.set(Math.floor(cx + (rx - 2) * c), 1, Math.floor(cz + (rz - 2) * s), '#7a7e84');
      if (i % 20 === 0) line(m, Math.floor(cx + (rx + 0.6) * c), 0, Math.floor(cz + (rz + 0.6) * s), Math.floor(cx + (rx - 2.6) * c), 0, Math.floor(cz + (rz - 2.6) * s), '#5a3a22');
    }
    // locomotive on the front straight (heading +x), tender, and a red box car
    const z0 = 13;
    m.box(14, 2, z0 - 1, 6, 1, 3, BLK_L); m.box(15, 3, z0 - 1, 5, 2, 3, BLK); m.box(15, 5, z0, 5, 1, 1, BLK);
    m.box(12, 2, z0 - 1, 3, 5, 3, BLK); m.box(12, 7 - 1, z0 - 1, 3, 1, 3, '#b83030'); m.set(13, 4, z0 + 1, { c: '#ffd070', emit: 0.5 });
    m.box(18, 5, z0, 1, 2, 1, BLK); m.set(20, 3, z0, BRASS_L); m.box(20, 2, z0 - 1, 1, 1, 3, CHR);   // stack, lamp, cowcatcher
    for (const x of [13, 15, 17, 19]) { m.set(x, 1, z0 - 1, '#b83030'); m.set(x, 1, z0 + 1, '#b83030'); }
    m.box(8, 2, z0 - 1, 3, 3, 3, BLK); m.box(8, 5, z0, 3, 1, 1, '#2a2826');     // tender with coal
    m.box(3, 2, z0 - 2, 4, 4, 3, '#b83030'); m.box(3, 6, z0 - 2, 4, 1, 3, '#8a2424'); m.set(5, 4, z0, '#e8c040');  // box car
    for (const x of [4, 6, 9]) { m.set(x, 1, z0 - 2 + (x === 9 ? 1 : 0), BLK); }
  },
});

// Open-front dollhouse: two storeys of papered rooms with tiny furniture, gable roof, chimney (1/32).
defineProp('dollhouse', {
  size: [22, 27, 12], scale: 1 / 32, collide: [0.69, 0.84, 0.38],
  build(m) {
    const wall = '#efe9dc', floor = '#a8784a', roof = '#a83a2e', roofD = '#8a2e24';
    m.box(0, 0, 0, 22, 1, 12, '#6a8a4a');                                     // lawn base
    m.box(1, 1, 1, 20, 1, 10, floor); m.box(1, 10, 1, 20, 1, 10, floor); m.box(1, 18, 1, 20, 1, 10, wall);
    m.box(1, 1, 0, 20, 18, 1, wall); m.box(1, 1, 0, 1, 18, 11, wall); m.box(20, 1, 0, 1, 18, 11, wall);
    m.box(10, 2, 1, 2, 16, 9, wall);                                          // centre partition
    const papers = ['#e8b8b8', '#a8c0d8', '#e8d898', '#b8d0a8'];
    [[2, 2], [12, 2], [2, 11], [12, 11]].forEach(([x, y], i) => m.box(x, y, 1, 8, 7, 1, papers[i]));
    // tiny furniture
    m.box(3, 2, 2, 4, 2, 3, '#7a4a2e'); m.box(4, 4, 2, 2, 1, 1, '#f0e8d8');     // table (kitchen)
    m.box(13, 2, 2, 6, 2, 3, '#6a8ab8'); m.box(13, 4, 2, 6, 2, 1, '#6a8ab8');   // sofa (parlour)
    m.box(3, 11, 2, 5, 2, 5, WHITE); m.box(3, 13, 2, 5, 3, 1, '#7a4a2e'); m.box(4, 12, 5, 4, 1, 2, '#c8506a'); // bed
    m.box(13, 11, 2, 5, 2, 3, WHITE); m.box(18, 11, 2, 1, 4, 1, CHR);          // bathtub
    // side windows
    for (const x of [1, 20]) { m.box(x, 5, 4, 1, 3, 3, '#8ab0d0'); m.box(x, 13, 4, 1, 3, 3, '#8ab0d0'); }
    // gable roof along x, attic front with a round window
    for (let k = 0; k < 8; k++) {
      m.box(k, 19 + k, 0, 1, 1, 12, k % 2 ? roof : roofD); m.box(21 - k, 19 + k, 0, 1, 1, 12, k % 2 ? roof : roofD);
      if (k > 0) m.box(k + 1, 19 + k - 1, 1, 20 - 2 * k, 1, 10, wall);
    }
    m.box(8, 26, 0, 6, 1, 12, roofD);
    m.box(2, 19, 11, 18, 1, 1, wall); discZ(m, 11, 21.5, 11, 1.5, '#8ab0d0');
    m.box(15, 24, 4, 2, 3, 2, '#9a4a3a');                                      // chimney
  },
});

// Dapple-grey rocking horse with red saddle and rockers, yarn mane & tail (1/32). Faces +z.
defineProp('rocking_horse', {
  size: [10, 22, 30], scale: 1 / 32, collide: [0.3, 0.6, 0.9],
  build(m) {
    const red = '#a8342a', hide = '#ece6da', dap = '#a8a49c', mane = '#4a3222';
    for (const x of [1, 8]) for (let z = 0; z < 30; z++) { const y = Math.round((z - 14.5) * (z - 14.5) / 55); m.box(x, y, z, 1, 2, 1, red); }
    for (const z of [6, 23]) m.box(1, 2, z, 8, 1, 1, red);
    line(m, 1, 2, 22, 3, 10, 19, hide); line(m, 8, 2, 22, 6, 10, 19, hide);   // legs
    line(m, 1, 2, 7, 3, 10, 10, hide); line(m, 8, 2, 7, 6, 10, 10, hide);
    for (const [x, z] of [[1, 22], [8, 22], [1, 7], [8, 7]]) m.set(x, 2, z, BLK_L);   // hooves
    ell(m, 5, 12.5, 14.5, 2.7, 2.8, 7, (x, y, z) => (y > 12 && (x + z * 3) % 7 === 0 ? dap : hide));
    for (let i = 0; i <= 5; i++) ell(m, 5, 14 + i, 20 + i * 0.8, 1.8, 1.6, 1.8, hide);   // neck
    ell(m, 5, 19, 25.5, 1.7, 1.8, 3.2, (x, y, z) => (z > 27 ? dap : hide));   // head
    m.set(3, 20, 25, BLK); m.set(6, 20, 25, BLK); m.set(4, 19, 28, BLK_L); m.set(5, 19, 28, BLK_L);
    m.box(4, 21, 24, 1, 1, 1, hide); m.box(5, 21, 24, 1, 1, 1, hide); m.set(4, 22, 24, dap); m.set(5, 22, 24, dap); // ears
    for (let i = 0; i <= 6; i++) { m.set(5, 20 - i, 23 - i * 0.6, mane); m.set(4, 19 - i, 23 - i * 0.6, mane); }  // mane
    line(m, 5, 13, 7, 5, 6, 5, mane); line(m, 4, 12, 7, 4, 7, 5, mane);      // tail
    m.box(2, 15, 12, 6, 1, 6, red); m.box(3, 16, 12, 4, 1, 1, red); m.box(3, 16, 17, 4, 1, 1, red);  // saddle
    m.box(2, 11, 14, 1, 4, 1, '#3a2a1e'); m.box(7, 11, 14, 1, 4, 1, '#3a2a1e'); m.set(2, 10, 14, BRASS); m.set(7, 10, 14, BRASS);
    m.box(3, 18, 27, 4, 1, 1, red); line(m, 3, 18, 27, 3, 16, 18, red); line(m, 6, 18, 27, 6, 16, 18, red);   // bridle & reins
  },
});

// Sitting teddy bear with a red bow tie (1/32). Faces +z.
defineProp('teddy_bear', {
  size: [10, 12, 10], scale: 1 / 32,
  build(m) {
    const f = '#8a5a32', l = '#c49a6a', d = '#6e4626';
    ell(m, 5, 4, 4.5, 3, 3.5, 2.7, (x, y, z) => (z >= 6 && y < 6 && Math.abs(x + 0.5 - 5) < 2 ? l : f));
    for (const x of [3, 7]) { m.box(x - 1, 0, 4, 2, 2, 5, f); m.box(x - 1, 0, 9, 2, 2, 1, l); }  // legs forward
    ell(m, 1.5, 4.5, 5, 1.2, 2, 1.2, f); ell(m, 8.5, 4.5, 5, 1.2, 2, 1.2, f);  // arms
    ell(m, 5, 8.6, 4.5, 2.8, 2.6, 2.6, f);                                    // head
    ell(m, 5, 8, 7, 1.3, 1.0, 1.1, l); m.set(4, 8, 7, BLK); m.set(5, 8, 7, BLK); // muzzle + nose
    m.set(3, 9, 6, BLK); m.set(6, 9, 6, BLK);                                 // eyes
    for (const x of [2, 7]) { m.box(x, 10, 4, 1, 2, 1, f); m.box(x + (x < 5 ? -1 : 1), 10, 4, 1, 2, 1, f); m.set(x, 10, 5, d); }  // ears
    m.box(3, 6, 7, 4, 1, 1, '#c83030'); m.set(4, 6, 8, '#a82020');            // bow tie
  },
});

// Red coaster wagon with white stripe, black tyres and a handle; a ball rides in it (1/32). Front +z.
defineProp('toy_wagon', {
  size: [12, 10, 29], scale: 1 / 32, collide: [0.38, 0.3, 0.9],
  build(m) {
    const r = '#b8302a', rd = '#8a2420';
    m.box(1, 3, 2, 10, 4, 20, r); m.clear(2, 4, 3, 8, 3, 18); m.box(1, 5, 2, 1, 1, 20, WHITE); m.box(10, 5, 2, 1, 1, 20, WHITE);
    m.box(1, 3, 2, 10, 1, 20, rd);
    for (const z of [5.5, 18.5]) { m.box(1, 2, Math.floor(z), 10, 1, 1, IRON); for (const x of [0, 11]) { discX(m, x, 2.3, z, 2.4, BLK); discX(m, x, 2.3, z, 1.0, WHITE); } }
    m.box(5, 2, 22, 2, 1, 2, IRON); line(m, 5, 2, 23, 5, 8, 27, BLK_L); line(m, 6, 2, 23, 6, 8, 27, BLK_L);
    m.box(3, 8, 27, 6, 1, 2, BLK);                                            // T-handle grip
    ell(m, 5, 5.5, 8, 2, 2, 2, (x, y) => (y > 5 ? '#3a6ac8' : WHITE));        // ball
  },
});

// Jack-in-the-box, sprung open: patterned box, crank, coil spring and jester (1/32). Faces +z.
defineProp('jack_in_the_box', {
  size: [9, 15, 9], scale: 1 / 32,
  build(m) {
    m.box(1, 0, 1, 6, 6, 6, '#c83a30'); m.box(1, 0, 6, 6, 6, 1, '#3a5aa8');
    for (const [x, y] of [[3, 2], [4, 3], [2, 3], [3, 4], [4, 1], [5, 2], [5, 4]]) m.set(x, y, 6, '#e8c040');  // star-ish pattern
    m.box(1, 0, 1, 1, 6, 5, '#4a8a4a'); m.box(6, 0, 1, 1, 6, 5, '#e8c040');
    m.box(7, 3, 3, 1, 1, 1, CHR); m.box(8, 2, 3, 1, 2, 1, CHR); m.set(8, 2, 4, '#c83a30');   // crank
    m.box(1, 6, 0, 6, 6, 1, '#e8c040'); m.box(2, 7, 0, 4, 4, 1, '#c83a30');    // lid, flipped open at the back
    for (let y = 6; y < 9; y++) m.box(3 + (y % 2), y, 3 + (y % 2), 2 - (y % 2), 1, 2 - (y % 2), CHR); // spring
    disc(m, 4, 9, 4, 2.3, 1, WHITE);                                            // ruff
    ell(m, 4, 11, 4, 1.8, 1.8, 1.8, '#f0d0b0');
    m.set(3, 11, 5, BLK); m.set(4, 11, 5, BLK); m.set(3, 10, 5, '#c83030'); m.set(4, 10, 5, '#c83030'); m.set(4, 12, 5, '#d83a3a'); // face
    m.box(2, 12, 3, 2, 1, 3, '#c83a30'); m.box(4, 12, 3, 2, 1, 3, '#3a8a4a');   // jester cap
    m.set(1, 13, 4, '#c83a30'); m.set(6, 13, 4, '#3a8a4a'); m.set(0, 14, 4, '#e8c040'); m.set(7, 14, 4, '#e8c040');
  },
});

// Striped tin spinning top with a plunger (1/32).
defineProp('spinning_top', {
  size: [7, 8, 7], scale: 1 / 32,
  build(m) {
    m.set(3, 0, 3, CHR_D);
    const bands = ['#c83a30', '#e8c040', '#3a5aa8', '#f4ecd8', '#c83a30'];
    [1.2, 2.3, 3.1, 3.5, 2.8].forEach((r, i) => disc(m, 3.5, i + 1, 3.5, r, 1, bands[i]));
    m.box(3, 6, 3, 1, 1, 1, CHR); m.set(3, 7, 3, '#c83a30');
  },
});

// Leather baseball mitt lying palm-up with a ball in the pocket (1/32).
defineProp('baseball_glove', {
  size: [10, 5, 10], scale: 1 / 32,
  build(m) {
    const l = '#a8743e', d = '#8a5a2e', lace = '#4a2e18';
    oval(m, 5, 0, 5.5, 4.2, 4.2, 2, l); oval(m, 5, 1, 5.5, 2.4, 2.4, 1, d);
    for (const x of [1, 3, 5, 7]) m.box(x, 1, 0, 2, 2, 4, l);                 // fingers
    for (const x of [2, 4, 6]) m.box(x, 2, 0, 1, 1, 3, lace);
    m.box(0, 1, 5, 2, 2, 4, l); m.box(1, 2, 3, 1, 1, 2, lace);               // thumb + web
    m.box(2, 1, 9, 6, 1, 1, lace);
    ell(m, 5, 2.5, 5.5, 1.6, 1.6, 1.6, (x, y, z) => ((x + z) % 3 === 0 && y > 2 ? '#c0302a' : WHITE));
  },
});

// ============================================================================================
// MISCELLANEOUS
// ============================================================================================

// Tan leather suitcase standing upright on the floor: straps, brass latches, handle and travel labels.
// (Named suitcase_upright because wearables.js owns 'suitcase' as a carried item.)
defineProp('suitcase_upright', {
  size: [12, 10, 4], collide: [0.75, 0.55, 0.25],
  build(m) {
    const c = '#8a6038', d = '#5a3a20';
    m.box(0, 0, 0, 12, 8, 4, c); m.clear(0, 0, 0, 1, 1, 4); m.clear(11, 0, 0, 1, 1, 4); m.clear(0, 7, 0, 1, 1, 4); m.clear(11, 7, 0, 1, 1, 4);
    m.box(0, 4, 0, 12, 1, 4, d);                                              // seam binding
    for (const x of [3, 8]) { m.box(x, 0, 3, 1, 8, 1, d); m.set(x, 6, 3, BRASS); }
    m.set(2, 7, 3, BRASS); m.set(9, 7, 3, BRASS);
    m.box(4, 8, 1, 1, 1, 2, d); m.box(7, 8, 1, 1, 1, 2, d); m.box(4, 9, 1, 4, 1, 2, '#4a2e18');   // handle
    m.box(5, 1, 3, 2, 2, 1, '#e8e0c8'); m.set(5, 2, 3, '#c83a30');             // hotel label
    m.box(9, 2, 3, 2, 2, 1, '#3a6aa8'); m.set(10, 3, 3, '#f0d060'); m.box(1, 5, 3, 1, 2, 1, '#e8c040'); // more labels
  },
});

// Striped round hatbox with a ribbon cord (1/32).
defineProp('hatbox', {
  size: [12, 10, 12], scale: 1 / 32,
  build(m) {
    const p = '#d8899a', c = '#f4ece0';
    disc(m, 6, 0, 6, 5.5, 7, (x, z, dx, dz) => (Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI / 8)) % 2 ? p : c));
    disc(m, 6, 1, 6, 5.0, 5, c);
    disc(m, 6, 7, 6, 5.8, 1, p); disc(m, 6, 7, 6, 4.5, 1, c, 3.6);
    line(m, 1, 8, 6, 3, 9, 6, '#6a4a7a'); line(m, 3, 9, 6, 9, 9, 6, '#6a4a7a'); line(m, 9, 9, 6, 11, 8, 6, '#6a4a7a');
  },
});

// Kitchen step-on pedal bin: cream enamel with a chrome lid and pedal (1/32).
defineProp('trash_can_small', {
  size: [9, 13, 10], scale: 1 / 32,
  build(m) {
    disc(m, 4.5, 0, 4.5, 4.2, 1, BLK_L); disc(m, 4.5, 1, 4.5, 4.0, 10, '#ece6d4');
    disc(m, 4.5, 3, 4.5, 4.05, 1, '#c83a30'); disc(m, 4.5, 11, 4.5, 4.1, 1, CHR); disc(m, 4.5, 12, 4.5, 3.0, 1, CHR_L);
    m.box(4, 0, 8, 1, 1, 2, CHR); m.box(3, 0, 9, 3, 1, 1, CHR_L);              // pedal
    m.box(4, 11, 0, 1, 1, 1, CHR_D);                                          // hinge
  },
});

// Tapered tin wastebasket (painted green, gold band) with crumpled paper (1/32).
defineProp('wastebasket', {
  size: [8, 10, 8], scale: 1 / 32,
  build(m) {
    for (let y = 0; y < 9; y += 3) disc(m, 4, y, 4, 3.0 + y * 0.12, 3, '#5a6a4a', y ? 2.1 + y * 0.12 : -1);
    disc(m, 4, 0, 4, 2.2, 1, '#4a5a3e'); disc(m, 4, 7, 4, 3.9, 1, '#c9a24a', 3.0);
    ell(m, 3.5, 8, 4, 1.4, 1.3, 1.4, WHITE); ell(m, 5, 8.5, 5, 1.2, 1.2, 1.2, '#e8e4da'); m.set(4, 9, 3, '#f4f0e6');
  },
});

// Black office typewriter: stepped keyboard, platen with a sheet of paper, return lever (1/32).
defineProp('typewriter', {
  size: [14, 10, 11], scale: 1 / 32,
  build(m) {
    m.box(0, 0, 0, 14, 2, 11, BLK); m.box(1, 2, 0, 12, 3, 5, BLK); m.box(2, 2, 5, 10, 1, 5, BLK_L);
    for (let r = 0; r < 3; r++) for (let x = 3; x <= 10; x += 2) m.set(x + (r % 2), 3 + r * 0 + 0, 9 - r * 2, CREAM);   // round keys
    for (let r = 0; r < 3; r++) m.box(2, 2 + 0, 9 - r * 2 - 1, 10, 1, 1, BLK);
    m.box(4, 2, 10, 6, 1, 1, CHR);                                            // space bar
    m.box(1, 2, 5, 12, 1, 1, CHR_D); m.box(0, 1, 10, 14, 1, 1, CHR_D);
    m.box(0, 5, 1, 14, 2, 3, BLK); m.box(0, 5, 2, 14, 1, 1, BLK_L);          // carriage + platen
    m.box(0, 6, 2, 1, 1, 1, CHR); m.box(13, 6, 2, 1, 1, 1, CHR);              // knobs
    line(m, 0, 7, 3, 0, 7, 5, CHR_L);                                         // return lever
    m.box(3, 7, 2, 8, 3, 1, WHITE); m.box(4, 8, 2, 5, 1, 1, '#b8b4aa');       // paper with a typed line
    m.set(3, 4, 5, '#c83a30'); m.set(10, 4, 5, '#c83a30');                    // ribbon spools
  },
});

// Black Bakelite rotary desk telephone (1/32).
defineProp('telephone', {
  size: [9, 6, 9], scale: 1 / 32,
  build(m) {
    m.box(0, 0, 0, 9, 2, 8, BLK); m.box(1, 2, 1, 7, 1, 6, BLK); m.box(2, 3, 2, 5, 1, 4, BLK_L);
    discZ(m, 4.5, 1.6, 8, 1.8, CHR_L); m.set(4, 1, 8, WHITE); m.set(4, 2, 8, WHITE);
    m.set(3, 2, 8, BLK_L); m.set(5, 1, 8, BLK_L);
    m.box(0, 4, 3, 9, 1, 2, BLK); m.box(0, 3, 2, 2, 1, 4, BLK); m.box(7, 3, 2, 2, 1, 4, BLK);   // handset
    m.set(0, 1, 0, BLK_L); m.set(0, 0, 0, BLK_L);
  },
});

// Grey-green steel cash box with a handle and keyhole (1/32).
defineProp('cash_box', {
  size: [9, 6, 7], scale: 1 / 32,
  build(m) {
    m.box(0, 0, 0, 9, 4, 7, '#5a6a5e'); m.box(0, 3, 0, 9, 1, 7, '#6a7a6e'); m.box(0, 2, 0, 9, 1, 7, '#4a5a4e');
    m.box(3, 4, 3, 1, 1, 1, CHR); m.box(5, 4, 3, 1, 1, 1, CHR); m.box(3, 5, 3, 3, 1, 1, CHR_L);
    m.box(4, 1, 6, 1, 1, 1, BRASS); m.set(4, 0, 6, '#5a6a5e');
  },
});

// Desk globe: walnut stand, brass meridian, pastel political map on blue oceans (1/32).
defineProp('globe_desk', {
  size: [10, 15, 10], scale: 1 / 32,
  build(m) {
    disc(m, 5, 0, 5, 3, 1, WAL); disc(m, 5, 1, 5, 1.2, 3, WAL_L);
    const lands = ['#d8c078', '#8ab070', '#d8a070', '#c88a8a'];
    ell(m, 5, 8.5, 5, 4.1, 4.1, 4.1, (x, y, z, nx, ny, nz) => {
      const lat = Math.asin(Math.max(-1, Math.min(1, ny))), lon = Math.atan2(nz, nx);
      if (Math.abs(lat) > 1.15) return '#eef0f0';
      const v = Math.sin(lon * 2 + 1) * Math.cos(lat * 3) + 0.6 * Math.sin(lon * 5 + lat * 2);
      return v > 0.55 ? lands[Math.floor((lon + Math.PI) / (Math.PI / 2)) % 4] : (lat > 0 ? '#4a7aa8' : '#5a88b4');
    });
    for (let y = 4; y <= 13; y++) { const dy = y + 0.5 - 8.5, dx = Math.sqrt(Math.max(0, 25 - dy * dy)); m.set(Math.floor(5 - dx), y, 5, BRASS); }
    m.set(4, 4, 5, BRASS); m.set(5, 13, 5, BRASS_L); m.set(5, 4, 5, BRASS);
  },
});

// Walnut pipe rack holding three briar pipes, with a tobacco humidor (1/32).
defineProp('pipe_stand', {
  size: [11, 8, 6], scale: 1 / 32,
  build(m) {
    m.box(0, 0, 0, 11, 1, 6, WAL); m.box(0, 1, 0, 1, 7, 2, WAL); m.box(7, 1, 0, 1, 7, 2, WAL); m.box(0, 6, 0, 8, 1, 3, WAL_L);
    for (const x of [1.5, 3.5, 5.5]) {
      const xi = Math.floor(x);
      disc(m, x, 1, 3.5, 1.1, 3, '#6a3a1e'); m.set(xi, 3, 3, '#2a1a10');
      line(m, xi, 3, 2, xi, 7, 1, BLK);
    }
    disc(m, 9, 1, 3, 1.7, 4, '#8a6a4a'); disc(m, 9, 5, 3, 1.9, 1, WAL); m.set(9, 6, 3, BRASS);
  },
});

// Amber glass ashtray with a smouldering cigarette resting in a notch (1/32).
defineProp('ashtray', {
  size: [7, 3, 7], scale: 1 / 32,
  build(m) {
    const a = '#b87a3a';
    disc(m, 3.5, 0, 3.5, 3.4, 2, a); disc(m, 3.5, 1, 3.5, 2.3, 1, '#8a8680'); disc(m, 3.5, 0, 3.5, 2.3, 1, '#a86a2a');
    m.set(3, 1, 0, 0); m.set(3, 1, 6, 0); m.set(0, 1, 3, 0); m.set(6, 1, 3, 0);    // notches
    m.box(4, 2, 3, 2, 1, 1, WHITE); m.set(6, 2, 3, '#d8a860'); m.set(3, 2, 3, { c: '#ff6a30', emit: 1 });
  },
});

// Stack of four cloth-bound books with an open one on top (1/32).
defineProp('books_stack', {
  size: [11, 8, 8], scale: 1 / 32,
  build(m) {
    const page = '#efe6d0';
    const book = (x, y, z, w, d, col) => { m.box(x, y, z, w, 3, d, col); m.box(x + 1, y + 1, z, w - 1, 1, d, page); m.box(x + 1, y + 1, z + 1, w - 1, 1, d - 2, col); m.box(x + 1, y + 1, z + 1, w - 2, 1, d - 2, page); };
    book(0, 0, 0, 10, 8, '#7a2a22'); book(1, 3, 1, 9, 6, '#2b3b5c');
    m.box(1, 6, 1, 8, 1, 6, '#2f4b33');
    m.box(1, 7, 1, 4, 1, 6, page); m.box(5, 7, 1, 4, 1, 6, WHITE); m.clear(4, 7, 1, 2, 1, 6); m.box(4, 7, 1, 2, 1, 6, '#e0d8c4');
    for (const z of [2, 4]) { m.box(2, 7, z, 2, 1, 1, '#a8a090'); m.box(6, 7, z, 2, 1, 1, '#a8a090'); }
  },
});

// Pile of old newspapers tied with twine, headline on top (1/32).
defineProp('newspaper_pile', {
  size: [12, 7, 9], scale: 1 / 32,
  build(m) {
    const np = '#e4dfcf', npd = '#cfc8b4';
    for (let y = 0; y < 6; y++) m.box(y % 2, y, (y % 3) === 1 ? 1 : 0, 11, 1, 8, y % 2 ? np : npd);
    m.box(0, 5, 0, 11, 1, 8, np);
    m.box(1, 5, 1, 9, 1, 1, '#2a2826'); m.box(1, 5, 3, 4, 1, 3, '#8a867a');       // masthead + photo
    for (const z of [3, 5]) m.box(6, 5, z, 4, 1, 1, '#a8a498');
    m.box(5, 0, 0, 1, 6, 9, '#a88a5a'); m.box(0, 6, 4, 12, 1, 1, '#a88a5a'); m.box(5, 6, 0, 1, 1, 9, '#a88a5a');  // twine
    m.clear(0, 6, 4, 1, 1, 1);
  },
});

// Artist's easel with a harbour painting in progress, palette and brushes on the ledge. 1.7 m.
defineProp('easel', {
  size: [11, 27, 10], collide: [0.6, 1.7, 0.6],
  build(m) {
    line(m, 1, 0, 8, 4, 25, 5, OAK); line(m, 9, 0, 8, 6, 25, 5, OAK); line(m, 5, 0, 0, 5, 23, 4, OAK_D);
    m.box(4, 25, 4, 3, 1, 2, OAK_L);
    m.box(0, 9, 6, 11, 1, 3, OAK_L); m.box(0, 10, 8, 11, 1, 1, OAK);          // ledge
    // canvas (front +z)
    m.box(0, 10, 6, 11, 11, 1, '#f2eee4'); m.box(4, 21, 6, 3, 1, 2, OAK);
    m.box(0, 15, 7, 11, 5, 1, '#8ab0d0'); m.box(0, 13, 7, 8, 2, 1, '#3e6a8a'); m.box(0, 11, 7, 6, 2, 1, '#6a5a3a');
    m.box(0, 20, 7, 11, 1, 1, '#f2eee4'); m.box(8, 11, 7, 3, 4, 1, '#f2eee4'); m.box(8, 13, 7, 1, 1, 1, '#3e6a8a'); // unfinished corner
    m.box(3, 14, 7, 1, 4, 1, '#f4f0e6'); m.box(4, 15, 7, 1, 2, 1, '#f4f0e6'); m.set(2, 13, 7, '#4a3222');      // sail
    // palette & brushes on the ledge
    m.box(1, 10, 8, 3, 1, 1, '#a8804a'); m.set(1, 11, 8, '#c83a30'); m.set(2, 11, 8, '#3a6ac8'); m.set(3, 11, 8, '#e8c040');
    m.box(7, 11, 8, 3, 1, 1, WAL); m.set(10, 11, 8, '#3a6ac8');
  },
});
