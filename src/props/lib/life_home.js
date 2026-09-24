// Props for neighbourhood street life (src/sim/life/residential.js): tradesmen's trucks and kit,
// yard-work gear, kids' games. Conventions as docs/PROPS.md: 1 voxel = 1/16 m unless `scale` says
// otherwise, origin bottom centre, front faces +z.
//
// Carried items (used as a person's `held` item) hang from the hand: their origin is the grip point,
// the item's +y runs up the arm and +z points forward out of the fist (see wearables.js).
import { defineProp } from '../props.js';
import { layoutText } from '../../world/font.js';

const A = (s = 0.5) => ({ tint: 1, shade: s });
const B = (s = 0.5) => ({ tint: 2, shade: s });
const glow = (c, e = 0.6) => ({ c, emit: e });
const TYRE = '#1c1c1c', CHROME = '#d0d4d0', CHROME2 = '#a8aca8', GLASS = '#3a4a55', DARK = '#161616';
const WOOD = '#b89060', WOOD_D = '#8a6a44', IRON = '#2e3032', CANVAS = '#d8ccb0', KRAFT = '#c8a070';

// ---------------------------------------------------------------- helpers
// 3-D line of voxels (inclusive), `t` = thickness in x
function line(m, x0, y0, z0, x1, y1, z1, c, t = 1) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 1.5));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    m.box(Math.floor(x0 + (x1 - x0) * k), Math.floor(y0 + (y1 - y0) * k), Math.floor(z0 + (z1 - z0) * k), t, 1, 1, c);
  }
}
// ring (annulus) in the y-z plane at column x
function ringX(m, x, cy, cz, r0, r1, len, c) {
  for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++) for (let z = Math.floor(cz - r1); z <= Math.ceil(cz + r1); z++) {
    const d = Math.hypot(z + 0.5 - cz, y + 0.5 - cy);
    if (d <= r1 && d >= r0) m.box(x, y, z, len, 1, 1, c);
  }
}
// ring flat on the ground (x-z plane) at height y
function ringY(m, cx, y, cz, r0, r1, c) {
  for (let z = Math.floor(cz - r1); z <= Math.ceil(cz + r1); z++) for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
    const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
    if (d <= r1 && d >= r0) m.set(x, y, z, c);
  }
}
// deterministic little random stream for scatter
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// spoked wheel in the y-z plane
function wheelX(m, x, cy, cz, r, len, rim = '#c8c8c0', o = {}) {
  ringX(m, x, cy, cz, r - 1.2, r, len, TYRE);
  if (o.spokes) {
    for (let a = 0; a < 8; a++) { const s = Math.sin(a * Math.PI / 4), c = Math.cos(a * Math.PI / 4); line(m, x, cy + s * 0.6, cz + c * 0.6, x, cy + s * (r - 1.3), cz + c * (r - 1.3), rim, len); }
    m.box(x, Math.floor(cy) - 1, Math.floor(cz) - 1, len, 2, 2, o.hub || rim);
  } else { ringX(m, x, cy, cz, 0, r - 1.2, len, rim); ringX(m, x, cy, cz, 0, r * 0.3, len, CHROME); }
}
// text on both flanks of a vehicle-shaped model, reading nose-first on the right (+x) side and
// tail-first on the left, centred at zc; plane = the outermost filled voxel at that row
function flankText(m, str, y, zc, col, font = 'small') {
  const L = layoutText(str, font);
  for (const p of L.pixels) {
    const zr = Math.round(zc + L.width / 2 - 1 - p.x), zl = Math.round(zc - L.width / 2 + p.x);
    for (let x = m.sx - 1; x >= 0; x--) if (m.get(x, y + p.y, zr)) { m.set(x, y + p.y, zr, col); break; }
    for (let x = 0; x < m.sx; x++) if (m.get(x, y + p.y, zl)) { m.set(x, y + p.y, zl, col); break; }
  }
}
function paintFront(m, x, y, col) { for (let z = m.sz - 1; z >= 0; z--) if (m.get(x, y, z)) { m.set(x, y, z, col); return z; } return -1; }
function paintBack(m, x, y, col) { for (let z = 0; z < m.sz; z++) if (m.get(x, y, z)) { m.set(x, y, z, col); return z; } return -1; }

// ================================================================ ladders & painting
// Wooden extension ladder already leaning at the 4-to-1 angle: the feet are at the origin, the top
// rests against a wall 1.16 m behind them (toward -z), 5 m up. Place it at wall + outward*1.16*scale,
// yaw = the direction out of the wall.
defineProp('ladder_extension', {
  size: [9, 81, 21], origin: [4.5, 0, 19.5], cat: 'exterior',
  build(m) {
    const rail = '#b89060', rung = '#a07848', rail2 = '#a8804e';
    const zAt = (y) => Math.round(19 - y * 18 / 80);
    for (let y = 0; y <= 80; y++) {
      const z = zAt(y), c = y > 40 && y < 44 ? IRON : (y > 40 ? rail2 : rail);
      m.set(0, y, z, c); m.set(8, y, z, c);
      if (y > 40) { m.set(1, y, z, c); m.set(7, y, z, c); } // fly section inside the base section
      if (y % 5 === 3) m.box(1, y, z, 7, 1, 1, rung);
    }
    m.box(0, 0, 18, 1, 1, 2, DARK); m.box(8, 0, 18, 1, 1, 2, DARK); // rubber feet
    m.box(2, 44, zAt(44), 5, 1, 1, IRON); // rope pulley bracket
    line(m, 4, 44, zAt(44) + 1, 4, 10, zAt(10) + 1, '#d8ccb0');
  },
});
// Wooden step ladder (A-frame) with a paint shelf, 1.6 m
defineProp('ladder_step', {
  size: [10, 27, 14], cat: 'exterior',
  build(m) {
    const w = '#c8a070', d = '#9a7448', sp = '#e8e4d8';
    for (let y = 0; y <= 25; y++) {
      const zf = Math.round(12 - y * 5 / 25), zb = Math.round(1 + y * 4 / 25);
      m.set(0, y, zf, w); m.set(9, y, zf, w);
      m.set(1, y, zb, d); m.set(8, y, zb, d);
      if (y % 6 === 5 && y < 24) m.box(1, y, zf - 1, 8, 1, 2, w);
    }
    m.box(0, 25, 5, 10, 2, 5, w); m.box(3, 26, 6, 1, 1, 1, sp); m.box(6, 26, 7, 2, 1, 1, sp); // paint spatter on top
    m.box(2, 16, 5, 6, 1, 4, d); // paint shelf
    line(m, 1, 9, 10, 1, 9, 3, '#6a6a6a'); line(m, 8, 9, 10, 8, 9, 3, '#6a6a6a'); // spreaders
  },
});
// Two paint cans (tint A = the colour), lid off one, brush across it, stir stick
defineProp('paint_cans_open', {
  size: [14, 9, 8], scale: 1 / 32, cat: 'exterior',
  build(m) {
    const tin = '#b8bcbc', lab = '#e8e0c8';
    m.cyl(3.5, 0, 3.5, 3.2, 6, tin); m.cyl(3.5, 2, 3.5, 3.3, 2, lab); m.cyl(3.5, 5, 3.5, 2.6, 1, A(0.5));
    m.box(3, 6, 0, 1, 1, 7, '#a83a2a'); m.box(2, 6, 5, 3, 1, 2, '#d8d0b8'); // brush across the rim
    m.box(6, 3, 2, 1, 3, 1, A(0.5)); m.set(6, 2, 2, A(0.45)); // drip
    m.cyl(10.5, 0, 4, 3, 6, tin); m.cyl(10.5, 2, 4, 3.1, 2, A(0.45)); m.cyl(10.5, 6, 4, 2.6, 1, '#9a9e9e');
    m.box(8, 0, 7, 5, 1, 1, '#c8a878'); m.box(12, 0, 6, 1, 1, 1, A(0.5)); // stir stick
  },
});
// Canvas drop cloth, spattered (tint A)
defineProp('drop_cloth', {
  size: [24, 1, 16], cat: 'exterior',
  build(m) {
    m.box(0, 0, 0, 24, 1, 16, CANVAS); m.box(0, 0, 0, 24, 1, 1, '#c8bc9c'); m.box(23, 0, 0, 1, 1, 16, '#c8bc9c');
    const r = rnd(7); for (let i = 0; i < 14; i++) m.set(1 + r() * 22, 0, 1 + r() * 14, i % 3 ? A(0.5) : A(0.6));
  },
});
// Wooden sawhorses with a storm window laid across them (being glazed / painted)
defineProp('sawhorses_window', {
  size: [30, 13, 16], cat: 'exterior',
  build(m) {
    const w = '#c8a878', d = '#a08050';
    for (const x of [3, 25]) {
      m.box(x - 2, 10, 2, 5, 1, 12, d);
      for (const z of [2, 12]) { line(m, x - 2, 0, z - 1, x, 9, z, w); line(m, x + 2, 0, z - 1, x, 9, z, w); }
    }
    // storm sash: frame + glass lying flat
    m.box(0, 11, 1, 30, 1, 14, '#e8e4d8'); m.box(2, 11, 3, 26, 1, 10, '#a8c0c8'); m.box(14, 11, 3, 2, 1, 10, '#e8e4d8');
    m.box(4, 12, 4, 3, 1, 1, '#f8f8f0'); // putty knife
  },
});
// A storm window leaning against a wall (frame + glass), 0.85 x 1.45 m; back (-z) rests on the wall
defineProp('storm_window', {
  size: [14, 23, 4], cat: 'exterior',
  build(m) {
    const f = '#e8e4d8', g = '#9ab4c0';
    for (let y = 0; y < 23; y++) {
      const z = Math.round(3 - y * 3 / 22);
      m.box(0, y, z, 14, 1, 1, (y < 1 || y > 21 || y === 11) ? f : g);
      m.set(0, y, z, f); m.set(13, y, z, f);
    }
    m.set(6, 12, 1, '#c8dce4'); m.set(7, 13, 1, '#c8dce4');
  },
});

// ================================================================ smoke, fire, leaves
// A soft puff of leaf smoke (animated by residential.js: rises, grows, fades by shrinking)
defineProp('smoke_puff', {
  size: [12, 10, 12], cat: 'exterior',
  build(m) {
    m.sphere(6, 5, 6, 4.6, '#b4b0a8');
    m.sphere(4, 6, 5, 3.4, '#c4c0b8');
    m.sphere(8, 6.5, 7, 3.0, '#a8a49c');
    m.sphere(6, 8, 6, 2.4, '#ccc8c0');
  },
});
// Smouldering leaf pile at the curb: charred rim, glowing embers, a few low flames
defineProp('leaf_fire', {
  size: [16, 7, 14], cat: 'exterior',
  build(m) {
    const cols = ['#8a4a20', '#a83a1a', '#6a3a1a', '#b85424'], r = rnd(11);
    for (let y = 0; y < 4; y++) for (let z = 0; z < 14; z++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot((x + 0.5 - 8) / 7.5, (z + 0.5 - 7) / 6.5) + y * 0.22;
      if (d < 1) m.set(x, y, z, d > 0.82 ? '#2a2420' : cols[(x * 3 + z * 5 + y) % 4]);
    }
    for (let i = 0; i < 16; i++) m.set(3 + r() * 10, 1 + r() * 2.5, 3 + r() * 8, glow(i % 3 ? '#e85a1a' : '#f0a030', 1));
    for (const [x, z, h] of [[7, 6, 3], [9, 8, 2], [6, 8, 2]]) m.box(x, 3, z, 1, h, 1, glow('#f8c040', 1));
    m.set(7, 6, 6, glow('#fff0a0', 1));
    for (let i = 0; i < 10; i++) m.set(r() * 16, 0, r() * 14, '#3a3430'); // ash
  },
});
// Heap of cut maple branches (tree trimming)
defineProp('branch_pile', {
  size: [24, 9, 16], cat: 'exterior',
  build(m) {
    const bark = '#5a4430', r = rnd(5), leaf = ['#c8401a', '#d86a20', '#e0a030', '#a83218'];
    for (let i = 0; i < 9; i++) { const z = 2 + i * 1.4, y = (i % 3); line(m, 1 + r() * 3, y, z, 20 + r() * 3, y + 1 + r() * 2, z + r() * 2 - 1, bark); }
    for (let i = 0; i < 30; i++) { const x = 6 + r() * 17, y = 1 + r() * 6, z = 1 + r() * 14; m.box(x, y, z, 2, 1, 2, leaf[i % 4]); }
    m.box(0, 0, 6, 2, 2, 2, '#e8d8b0'); m.set(0, 1, 6, '#c8a878'); // fresh-cut end
  },
});
// A dumped cord of split firewood on the driveway
defineProp('firewood_heap', {
  size: [30, 10, 22], cat: 'exterior',
  build(m) {
    const r = rnd(3), bark = ['#5a4430', '#6a5038', '#4e3a28'], face = '#d8b888';
    for (let i = 0; i < 70; i++) {
      const x = 2 + r() * 24, z = 2 + r() * 16, d = Math.hypot((x - 15) / 14, (z - 11) / 10);
      if (d > 1) continue;
      const y = Math.floor(r() * (1 - d) * 8);
      if (r() < 0.5) { m.box(x, y, z, 6, 2, 2, bark[i % 3]); m.set(x + 5, y, z, face); m.set(x, y + 1, z + 1, face); }
      else { m.box(x, y, z, 2, 2, 6, bark[i % 3]); m.set(x, y, z + 5, face); m.set(x + 1, y + 1, z, face); }
    }
  },
});

// ================================================================ door-to-door trades
// Milkman's wire carrier with four quarts (held; hangs from the hand by the centre bail)
defineProp('milk_carrier', {
  size: [9, 15, 9], scale: 1 / 32, origin: [4.5, 15, 4.5], cat: 'exterior',
  build(m) {
    const wire = '#9aa0a4', milk = '#f4f2ec', cap = '#c8302a';
    for (const [x, z] of [[1, 1], [5, 1], [1, 5], [5, 5]]) { m.box(x, 1, z, 3, 7, 3, milk); m.box(x + 1, 8, z + 1, 1, 1, 1, milk); m.box(x, 8, z, 3, 1, 3, 0); m.box(x + 1, 8, z + 1, 1, 1, 1, milk); m.box(x + 1, 9, z + 1, 1, 1, 1, cap); }
    m.box(0, 0, 0, 9, 1, 9, wire); m.box(0, 4, 0, 9, 1, 1, wire); m.box(0, 4, 8, 9, 1, 1, wire); m.box(0, 4, 0, 1, 1, 9, wire); m.box(8, 4, 0, 1, 1, 9, wire);
    m.box(4, 1, 4, 1, 12, 1, wire); m.box(2, 12, 4, 5, 1, 1, wire); m.box(2, 13, 4, 5, 1, 1, '#6a5040');
  },
});
// Canvas newspaper bag, COURIER stencilled, stuffed with folded papers (rides at the hip)
defineProp('paper_bag_canvas', {
  size: [6, 22, 14], scale: 1 / 32, cat: 'exterior',
  build(m) {
    const cv = '#d8c8a0', cv2 = '#c4b48c', ink = '#2a2a2a';
    m.box(0, 0, 0, 6, 12, 14, cv); m.box(1, 12, 1, 4, 2, 12, '#ece8dc'); // papers poking out
    for (let z = 2; z < 12; z += 2) m.box(1, 13, z, 4, 1, 1, '#d8d4c8');
    m.box(0, 11, 0, 6, 1, 14, cv2); m.box(0, 0, 0, 6, 1, 14, cv2);
    // stencil on the outer (+x) face: a dark band with light letters looks too fussy at this size; a band will do
    m.box(5, 5, 2, 1, 3, 10, '#8a2a24'); for (let z = 3; z < 11; z += 2) m.set(5, 6, z, '#e8e0c8');
    m.box(2, 14, 6, 2, 8, 2, cv2); // strap rising to the shoulder
  },
});
// Folded & rolled newspaper lying on a doorstep
defineProp('newspaper_folded', {
  size: [11, 3, 5], scale: 1 / 32, cat: 'exterior',
  build(m) {
    m.box(0, 0, 0, 11, 3, 5, '#e8e3d4'); m.box(0, 2, 1, 11, 1, 3, '#dcd6c6'); m.box(0, 0, 0, 11, 1, 5, '#d0cab8');
    m.box(5, 0, 0, 1, 3, 5, '#c8302a'); // string
    for (const x of [1, 3, 7, 9]) m.set(x, 2, 0, '#8e8a80');
  },
});
// Letter carrier's leather satchel (rides at the hip; strap up to the shoulder)
defineProp('mail_satchel', {
  size: [5, 24, 14], scale: 1 / 32, cat: 'exterior',
  build(m) {
    const l = '#6a4228', d = '#4e2e1a', br = '#c8a040';
    m.box(0, 0, 0, 5, 11, 14, l); m.box(0, 0, 0, 5, 1, 14, d); m.box(1, 11, 1, 3, 1, 12, '#e8e3d4'); // letters
    for (let z = 2; z < 12; z += 3) m.set(2, 12, z, '#f2eee2');
    m.box(4, 5, 0, 1, 6, 14, d); m.box(4, 5, 6, 1, 2, 2, br); // flap & buckle
    m.box(2, 12, 6, 1, 12, 2, d); // strap
  },
});
// Iceman's tongs gripping a 25 lb block (held)
defineProp('ice_block_tongs', {
  size: [12, 17, 9], scale: 1 / 32, origin: [6, 17, 4.5], cat: 'exterior',
  build(m) {
    const ice = '#d8eef4', ice2 = '#bcdce6', ice3 = '#eef8fa';
    m.box(2, 0, 1, 8, 8, 7, ice); m.box(3, 1, 1, 6, 6, 1, ice2); m.box(2, 7, 2, 8, 1, 5, ice3); m.set(4, 5, 1, ice3); m.set(7, 2, 1, ice3);
    // tongs: two hooked arms crossing at a pivot above the block
    line(m, 1, 4, 4, 1, 9, 4, IRON); line(m, 10, 4, 4, 10, 9, 4, IRON);
    line(m, 1, 9, 4, 8, 13, 4, IRON); line(m, 10, 9, 4, 3, 13, 4, IRON);
    m.box(5, 12, 4, 2, 1, 1, '#555555');
    line(m, 3, 13, 4, 5, 16, 4, IRON); line(m, 8, 13, 4, 6, 16, 4, IRON); m.box(4, 16, 3, 4, 1, 3, '#5a3a24');
    m.set(2, 4, 4, IRON); m.set(9, 4, 4, IRON);
  },
});
// Fuller Brush man's sample case (held): tan leatherette, brass corners
defineProp('sample_case', {
  size: [5, 14, 16], scale: 1 / 32, origin: [2.5, 14, 8], cat: 'exterior',
  build(m) {
    const t = '#a8844e', d = '#7a5a30', br = '#d8b04a';
    m.box(0, 0, 0, 5, 10, 16, t); m.box(0, 9, 0, 5, 1, 16, d); m.box(0, 5, 0, 5, 1, 16, d);
    for (const [y, z] of [[0, 0], [0, 15], [9, 0], [9, 15]]) { m.set(0, y, z, br); m.set(4, y, z, br); }
    m.set(0, 7, 5, br); m.set(0, 7, 10, br); m.set(4, 7, 5, br); m.set(4, 7, 10, br);
    m.box(2, 10, 5, 1, 3, 1, d); m.box(2, 10, 10, 1, 3, 1, d); m.box(2, 13, 5, 1, 1, 6, d);
  },
});
// Doctor's black Gladstone bag (held)
defineProp('doctor_bag', {
  size: [6, 13, 12], scale: 1 / 32, origin: [3, 13, 6], cat: 'exterior',
  build(m) {
    const b = '#1c1a1a', b2 = '#2a2626', br = '#c8a040';
    m.box(0, 0, 0, 6, 7, 12, b); m.box(1, 7, 0, 4, 1, 12, b2); m.box(2, 8, 1, 2, 1, 10, b);
    m.box(0, 6, 0, 6, 1, 12, br); m.box(0, 6, 1, 6, 1, 10, b2); m.set(0, 6, 6, br); m.set(5, 6, 6, br);
    m.box(2, 9, 3, 2, 3, 1, b); m.box(2, 9, 8, 2, 3, 1, b); m.box(2, 12, 3, 2, 1, 6, b);
  },
});
// TV repairman's tube caddy (held): leatherette box with a lid and handle
defineProp('tube_caddy', {
  size: [6, 14, 14], scale: 1 / 32, origin: [3, 14, 7], cat: 'exterior',
  build(m) {
    const c = '#6a2a24', d = '#4a1c18', ch = '#c8c8c0';
    m.box(0, 0, 0, 6, 10, 14, c); m.box(0, 9, 0, 6, 1, 14, d); m.box(0, 4, 0, 6, 1, 14, d);
    m.box(0, 6, 6, 1, 2, 2, ch); m.box(5, 6, 6, 1, 2, 2, ch);
    m.box(2, 10, 4, 2, 3, 1, d); m.box(2, 10, 9, 2, 3, 1, d); m.box(2, 13, 4, 2, 1, 6, d);
  },
});
// Knife grinder's pushcart: big spoked wheels, grindstone, treadle, bell on a post; pushed toward +z
defineProp('grinder_cart', {
  size: [14, 22, 24], cat: 'exterior',
  build(m) {
    const w = '#6a8a5a', w2 = '#4e6a42', stone = '#8a8680', red = '#a8322a';
    for (const x of [0, 13]) wheelX(m, x, 6, 14, 6, 1, WOOD, { spokes: true, hub: IRON });
    m.box(1, 6, 13, 12, 1, 2, IRON); // axle
    m.box(2, 8, 6, 10, 2, 16, w); m.box(2, 10, 6, 10, 6, 2, w2); m.box(2, 10, 20, 10, 6, 2, w2); m.box(2, 10, 6, 2, 6, 16, w2); m.box(10, 10, 6, 2, 6, 16, w2);
    m.cylX(5, 15, 14, 4.2, 4, stone); m.cylX(5, 15, 14, 1.2, 4, IRON); m.box(4, 11, 10, 6, 1, 8, '#5a5a58'); // water trough
    m.box(6, 16, 18, 2, 1, 1, '#d8d4c8'); // a knife on the stone
    // handles back toward the pusher (-z)
    m.box(2, 9, 0, 1, 1, 7, WOOD_D); m.box(11, 9, 0, 1, 1, 7, WOOD_D); m.box(2, 8, 0, 1, 1, 1, WOOD_D); m.box(11, 8, 0, 1, 1, 1, WOOD_D);
    m.box(2, 0, 6, 1, 8, 1, WOOD_D); m.box(11, 0, 6, 1, 8, 1, WOOD_D); // legs
    m.box(6, 1, 7, 2, 1, 6, IRON); // treadle
    m.box(12, 16, 7, 1, 5, 1, IRON); m.box(11, 20, 6, 3, 2, 3, '#c8a040'); m.set(12, 19, 7, '#8a6a20'); // bell
    m.box(2, 16, 20, 10, 1, 2, red); // sign board edge
  },
});
// Grocer's delivery bicycle with a big front basket of groceries; tint A frame
defineProp('bicycle_delivery', {
  size: [12, 18, 32], collide: [0.5, 1.0, 1.9], cat: 'exterior',
  build(m) {
    const f = A(0.5), cx = 5, bask = '#b89060', bask2 = '#9a7448';
    for (const z of [5.5, 25.5]) { ringX(m, cx, 5.5, z, 4.2, 5.6, 1, TYRE); line(m, cx, 5, z - 3, cx, 5, z + 3, '#b8bcb8'); line(m, cx, 2, z, cx, 8, z, '#b8bcb8'); }
    line(m, cx, 5, 6, cx, 12, 11, f); line(m, cx, 6, 14, cx, 12, 11, f); line(m, cx, 6, 14, cx, 12, 22, f); line(m, cx, 12, 11, cx, 12, 22, f);
    line(m, cx, 5, 6, cx, 6, 14, f); line(m, cx, 12, 22, cx, 5, 25, CHROME);
    m.box(cx - 1, 13, 9, 3, 1, 4, '#5a3424'); m.box(cx - 3, 14, 21, 7, 1, 1, CHROME);
    m.box(cx - 1, 9, 13, 3, 3, 3, f); m.box(cx - 1, 10, 14, 3, 1, 1, '#e8e0c8'); // name plate
    // basket over the front wheel
    m.box(cx - 5, 12, 23, 11, 1, 8, bask2); for (const z of [23, 30]) m.box(cx - 5, 12, z, 11, 5, 1, bask); for (const x of [cx - 5, cx + 5]) m.box(x, 12, 23, 1, 5, 8, bask);
    for (let y = 13; y < 17; y += 2) m.box(cx - 5, y, 23, 11, 1, 8, bask2), m.box(cx - 4, y, 24, 9, 1, 6, 0);
    m.box(cx - 4, 13, 24, 4, 5, 3, KRAFT); m.box(cx + 1, 13, 26, 3, 4, 3, KRAFT); m.box(cx - 3, 18, 25, 1, 2, 1, '#6a9a3a'); m.box(cx + 1, 17, 27, 2, 1, 2, '#c8302a');
    m.box(cx - 1, 13, 27, 2, 3, 2, '#f4f2ec'); // quart of milk
  },
});
// Centennial pennant on a stick (held; points up-forward out of the fist)
defineProp('pennant_centennial', {
  size: [2, 18, 16], scale: 1 / 32, origin: [1, 2, 1], cat: 'exterior',
  build(m) {
    const felt = '#7a1c24', wh = '#f0e8d8';
    line(m, 0, 0, 0, 0, 16, 6, '#c8a070', 1);
    for (let k = 0; k < 10; k++) { const h = Math.round(5 - k * 0.45); m.box(1, 14 - h + (k * 0.2 | 0), 6 + k, 1, h, 1, felt); }
    m.box(1, 12, 7, 1, 1, 5, wh);
    m.set(1, 13, 8, '#d8b04a');
  },
});
// Toy cap pistol (held)
defineProp('cap_pistol', {
  size: [2, 5, 9], scale: 1 / 32, origin: [1, 4, 1.5], cat: 'exterior',
  build(m) {
    m.box(0, 0, 0, 2, 4, 2, '#f0ece2'); m.box(0, 3, 0, 2, 2, 9, '#a8acb0'); m.box(0, 4, 8, 2, 1, 1, '#2a2a2a'); m.set(0, 2, 3, '#5a5a5a'); m.box(0, 1, 2, 2, 1, 2, '#a8acb0');
  },
});
// Wicker rug beater (held): handle forward out of the fist, trefoil loop at the end
defineProp('rug_beater', {
  size: [2, 9, 20], scale: 1 / 32, origin: [1, 4.5, 1], cat: 'exterior',
  build(m) {
    const w = '#c8a868', d = '#a88848';
    m.box(0, 4, 0, 2, 1, 9, d);
    for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2, r = 3.2 + 1.3 * Math.cos(3 * t); m.set(0, 4.5 + Math.sin(t) * r, 14 + Math.cos(t) * r * 1.2, w); m.set(1, 4.5 + Math.sin(t) * r, 14 + Math.cos(t) * r * 1.2, w); }
  },
});

// ================================================================ vehicles
// cab-forward-ish 1940s truck front: hood, cab, fenders and front wheels. zf = back of the cab.
function truckCab(m, cx, zf, col, o = {}) {
  const top = o.cabTop ?? 30;
  m.box(cx - 13, 5, zf, 26, top - 5, 14, col); m.box(cx - 12, top, zf + 1, 24, 1, 12, col); // cab
  for (let y = 20; y < top - 1; y++) for (let x = cx - 12; x < cx + 12; x++) { m.set(x, y, zf + 13, GLASS); }
  m.box(cx - 1, 20, zf + 13, 2, top - 21, 1, col);
  for (let z = zf + 3; z < zf + 12; z++) for (let y = 20; y < top - 1; y++) { m.set(cx - 13, y, z, GLASS); m.set(cx + 12, y, z, GLASS); }
  m.box(cx - 13, 5, zf + 14, 26, 15, 12, col); // hood
  m.box(cx - 10, 19, zf + 14, 20, 2, 11, col);
  for (let y = 7; y < 17; y++) for (let x = cx - 7; x < cx + 7; x++) m.set(x, y, zf + 25, x % 2 ? CHROME : DARK); // grille
  m.box(cx - 13, 5, zf + 25, 26, 2, 1, CHROME2);
  for (const x of [cx - 12, cx + 10]) m.box(x, 13, zf + 25, 2, 2, 1, glow('#fff4d0', 0.6));
  // fenders
  for (const x of [cx - 16, cx + 13]) { m.box(x, 9, zf + 15, 3, 4, 10, o.fender || col); m.box(x, 5, zf + 22, 3, 4, 3, o.fender || col); }
  m.box(cx - 16, 3, zf + 26, 32, 3, 2, CHROME);
}
function wheels(m, xs, cy, zs, r = 5.8) { for (const z of zs) for (const x of xs) { ringX(m, x, cy, z, r - 1.6, r, 3, TYRE); ringX(m, x + (x < 16 ? 0 : 2), cy, z, 0, r - 1.6, 1, '#c8c8c0'); } }

// 1940s ice truck: stake bed with blocks of ice under a wet canvas, BAYSIDE ICE on the rack board
defineProp('truck_ice', {
  size: [34, 32, 92], collide: true, cat: 'far',
  build(m) {
    const cx = 17, body = '#2a4a6a', stake = '#c8a068', ice = '#d8eef4', ice2 = '#bcdce6';
    truckCab(m, cx, 60, body, { fender: '#1c2a3a' });
    m.box(cx - 15, 5, 2, 30, 3, 57, '#4a3a2a'); // bed
    for (let z = 2; z < 59; z += 6) { m.box(cx - 15, 8, z, 2, 12, 2, stake); m.box(cx + 13, 8, z, 2, 12, 2, stake); }
    for (const y of [12, 18]) { m.box(cx - 15, y, 2, 2, 2, 57, stake); m.box(cx + 13, y, 2, 2, 2, 57, stake); }
    m.box(cx - 15, 8, 2, 30, 12, 2, stake);
    for (let z = 4; z < 56; z += 7) for (let x = cx - 12; x < cx + 12; x += 8) m.box(x, 8, z, 7, 6, 6, (x + z) % 3 ? ice : ice2);
    m.box(cx - 13, 14, 4, 26, 2, 34, '#8a8468'); m.box(cx - 13, 16, 8, 26, 1, 22, '#7a765c'); // wet canvas over the back half
    for (let z = 40; z < 56; z += 7) m.box(cx - 12, 14, z, 24, 1, 6, ice2);
    // rack board with the name, both sides
    m.box(cx - 16, 20, 14, 2, 7, 36, '#e8e0c8'); m.box(cx + 14, 20, 14, 2, 7, 36, '#e8e0c8');
    flankText(m, 'BAYSIDE ICE', 21, 32, '#2a4a6a');
    wheels(m, [cx - 15, cx + 12], 6, [16, 72]);
    m.box(cx - 13, 3, 0, 26, 3, 2, CHROME2); m.set(cx - 12, 8, 1, glow('#b01810', 0.35)); m.set(cx + 11, 8, 1, glow('#b01810', 0.35));
    m.box(cx - 14, 4, 30, 3, 2, 3, '#555555'); // scale hook
  },
});
// Panel delivery van body (1/16 m, ~5 m), used by the diaper service and the TV man
function panelVan(m, o) {
  const cx = 16, body = o.body, trim = o.trim;
  for (let z = 3; z < 56; z++) for (let y = 5; y < 33; y++) {
    const h = y === 32 ? 12 : y === 31 ? 14 : 15;
    for (let x = cx - h; x < cx + h; x++) m.set(x, y, z, (y === 14 || y === 15) ? trim : body);
  }
  // cab & hood
  for (let z = 56; z < 70; z++) for (let y = 5; y < 32; y++) {
    const roof = 31 - Math.max(0, z - 63) * 1.3; if (y > roof) continue;
    const h = y > 26 ? 13 : 15;
    for (let x = cx - h; x < cx + h; x++) m.set(x, y, z, (y === 14 || y === 15) ? trim : body);
  }
  for (let z = 70; z < 80; z++) for (let y = 5; y < 19 - (z - 70) * 0.5; y++) for (let x = cx - 13; x < cx + 13; x++) m.set(x, y, z, body);
  for (let y = 20; y < 29; y++) for (let x = cx - 12; x < cx + 12; x++) paintFront(m, x, y, x === cx || x === cx - 1 ? body : GLASS);
  for (let z = 58; z < 66; z++) for (let y = 20; y < 28; y++) { for (let x = 0; x < 32; x++) if (m.get(x, y, z)) { m.set(x, y, z, GLASS); break; } for (let x = 31; x >= 0; x--) if (m.get(x, y, z)) { m.set(x, y, z, GLASS); break; } }
  for (let y = 7; y < 14; y++) for (let x = cx - 6; x < cx + 6; x++) paintFront(m, x, y, x % 2 ? CHROME : DARK);
  for (const x of [cx - 12, cx + 10]) for (const y of [11, 12]) { paintFront(m, x, y, glow('#fff4d0', 0.6)); paintFront(m, x + 1, y, glow('#fff4d0', 0.6)); }
  m.box(cx - 15, 3, 79, 30, 3, 1, CHROME); m.box(cx - 15, 3, 1, 30, 3, 2, CHROME2);
  for (const x of [cx - 13, cx + 12]) for (const y of [10, 11]) paintBack(m, x, y, glow('#b01810', 0.35));
  for (let y = 16; y < 30; y++) paintBack(m, cx, y, '#6a6a68');
  for (const z of [14, 66]) for (let y = 3; y < 13; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(z + 0.5 - (z === 14 ? 14 : 66), y + 0.5 - 7); if (d < 6.5 && (x < 3 || x > 28)) m.set(x, y, z, 0); }
  for (const zc of [14, 66]) for (const x of [0, 29]) { ringX(m, x, 6.5, zc, 3.4, 5.5, 3, TYRE); ringX(m, x === 0 ? 0 : 31, 6.5, zc, 0, 3.4, 1, '#c8c8c0'); }
}
// Diaper-service panel van: pale blue & white, stork on the side
defineProp('van_diaper', {
  size: [32, 34, 80], collide: true, cat: 'far',
  build(m) {
    panelVan(m, { body: '#a8c4dc', trim: '#f2eee6' });
    flankText(m, 'DIAPER SERVICE', 20, 28, '#2a4a7a');
    flankText(m, 'BAY STATE', 25, 28, '#2a4a7a');
    flankText(m, 'FRESH EVERY TUESDAY & SATURDAY', 8, 30, '#f2eee6');
    for (const x of [0, 31]) { m.box(x, 26, 44, 1, 2, 5, '#f2eee6'); m.box(x, 28, 47, 1, 2, 2, '#f2eee6'); m.set(x, 27, 49, '#e8a030'); } // stork
  },
});
// Radio & TV repair van: maroon & cream, lightning-bolt stripe
defineProp('van_tv_repair', {
  size: [32, 40, 80], collide: true, cat: 'far',
  build(m) {
    panelVan(m, { body: '#7a2a2a', trim: '#e8dcb8' });
    flankText(m, 'BAY RADIO & TV', 24, 28, '#e8dcb8');
    flankText(m, 'SERVICE - SALES - ANTENNAS', 18, 30, '#e8dcb8');
    // ladder on the roof rack
    m.box(6, 33, 8, 1, 1, 44, '#c8c8c0'); m.box(25, 33, 8, 1, 1, 44, '#c8c8c0'); for (let z = 9; z < 52; z += 4) m.box(7, 34, z, 18, 1, 1, WOOD); for (const z of [10, 48]) m.box(8, 33, z, 16, 1, 1, IRON);
    m.box(12, 35, 20, 8, 5, 1, '#a8acb0'); m.box(15, 35, 16, 2, 1, 9, '#a8acb0'); // an aerial going out
  },
});
// Moving van: big box body, HARBOR MOVING & STORAGE, rear doors swung open
defineProp('truck_moving', {
  size: [36, 50, 112], collide: true, cat: 'far',
  build(m) {
    const cx = 18, body = '#e0a030', trim = '#2a3a5a', cab = '#2a3a5a';
    truckCab(m, cx, 80, cab, { fender: '#1c2838' });
    for (let z = 4; z < 80; z++) for (let y = 7; y < 48; y++) for (let x = cx - 17; x < cx + 17; x++) {
      const edge = y === 47 || y === 7;
      m.set(x, y, z, edge ? trim : (y === 12 || y === 13) ? trim : body);
    }
    m.box(cx - 16, 8, 4, 32, 39, 1, 0); m.box(cx - 15, 8, 5, 30, 38, 2, '#3a3226'); // open back, dark inside
    m.box(cx - 14, 8, 6, 8, 10, 6, KRAFT); m.box(cx + 4, 8, 7, 9, 14, 7, '#6a4a30'); // a carton, a dresser inside
    // rear doors swung open flat against the sides
    m.box(cx - 18, 8, 0, 1, 39, 5, body); m.box(cx + 17, 8, 0, 1, 39, 5, body);
    flankText(m, 'HARBOR MOVING', 30, 42, trim, 'big');
    flankText(m, '& STORAGE CO.', 22, 42, trim, 'big');
    flankText(m, 'LOCAL & LONG DISTANCE', 15, 42, '#7a2a1a');
    wheels(m, [cx - 16, cx + 13], 6, [20, 92]); wheels(m, [cx - 16, cx + 13], 6, [30]);
    m.box(cx - 16, 3, 1, 32, 4, 3, CHROME2); m.box(cx - 10, 1, 0, 20, 7, 3, '#5a5a58'); // step / ramp stub
    for (const x of [cx - 16, cx + 15]) m.set(x, 9, 3, glow('#b01810', 0.35));
  },
});
// Model A coupe jalopy, hood side-panels folded up, primer body (tint A) and one odd fender (tint B)
defineProp('jalopy_hood_up', {
  size: [28, 28, 66], collide: true, cat: 'far',
  build(m) {
    const cx = 14, body = A(0.5), body2 = A(0.42), fend = '#1c1c1e', odd = B(0.5);
    // chassis & running boards
    m.box(cx - 10, 5, 6, 20, 2, 54, '#2a2a2a'); m.box(cx - 13, 6, 22, 3, 1, 22, fend); m.box(cx + 10, 6, 22, 3, 1, 22, fend);
    // body tub & cabin
    m.box(cx - 10, 7, 6, 20, 11, 36, body); m.box(cx - 10, 7, 6, 20, 2, 36, body2);
    m.box(cx - 9, 18, 16, 18, 10, 20, body); m.box(cx - 9, 27, 17, 18, 1, 18, '#2a2a2a');
    for (let y = 20; y < 26; y++) { for (let z = 19; z < 33; z++) { m.set(cx - 9, y, z, GLASS); m.set(cx + 8, y, z, GLASS); } for (let x = cx - 8; x < cx + 8; x++) { m.set(x, y, 35, GLASS); m.set(x, y, 16, GLASS); } }
    m.box(cx - 10, 18, 6, 20, 2, 10, body2); // rumble seat lid
    // engine bay with the hood open: block, radiator shell
    m.box(cx - 7, 7, 42, 14, 9, 14, '#3a3a3a'); m.box(cx - 5, 16, 44, 10, 2, 10, '#4a4a48'); m.box(cx - 2, 18, 45, 4, 2, 3, '#8a6a2a'); // air cleaner
    m.box(cx - 8, 7, 56, 16, 16, 3, CHROME2); for (let y = 9; y < 21; y++) for (let x = cx - 6; x < cx + 6; x++) m.set(x, y, 58, x % 2 ? DARK : '#3a3a3a');
    m.box(cx - 1, 23, 57, 2, 2, 1, CHROME); // radiator cap
    // butterfly hood halves folded up along the centre hinge
    for (let k = 0; k < 7; k++) { m.box(cx - 1 - k, 18 + k, 42, 1, 1, 14, body); m.box(cx + k, 18 + k, 42, 1, 1, 14, body); }
    // fenders: three dark, the front right a mismatched colour
    for (const [x, z, c] of [[cx - 14, 46, fend], [cx + 10, 46, odd], [cx - 14, 8, fend], [cx + 10, 8, fend]]) { m.box(x, 11, z, 4, 2, 12, c); m.box(x, 7, z + (z > 30 ? 10 : 0), 4, 4, 2, c); }
    // wheels (wire)
    for (const z of [14, 52]) for (const x of [cx - 13, cx + 10]) { ringX(m, x, 6, z, 4.2, 6, 3, TYRE); for (let a = 0; a < 6; a++) line(m, x + 1, 6, z, x + 1, 6 + Math.sin(a) * 4, z + Math.cos(a) * 4, '#a8a8a0'); }
    for (const x of [cx - 9, cx + 7]) m.box(x, 18, 58, 3, 3, 3, CHROME); // headlamps
    m.box(cx - 11, 4, 61, 22, 2, 2, CHROME); m.box(cx - 11, 4, 3, 22, 2, 2, CHROME2);
    m.box(cx + 4, 10, 42, 3, 3, 1, '#c8a040'); // an oil can on the fender apron
  },
});

// ================================================================ yard, porch & moving day
// Oriental rug thrown over a clothesline between two T-posts (tint A field, tint B border)
defineProp('rug_on_line', {
  size: [38, 31, 8], cat: 'exterior',
  build(m) {
    const post = '#d8d4c8';
    for (const x of [0, 36]) { m.box(x, 0, 3, 2, 30, 2, post); m.box(x, 29, 0, 2, 2, 8, post); }
    m.box(2, 28, 4, 34, 1, 1, '#c8c4b8');
    for (let y = 12; y < 28; y++) for (let x = 7; x < 31; x++) {
      const b = x < 9 || x > 28 || y < 14;
      const pat = ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0) ? A(0.62) : A(0.5);
      m.set(x, y, 3, b ? B(0.5) : pat); m.set(x, y, 5, b ? B(0.5) : A(0.45));
    }
    m.box(7, 28, 3, 24, 1, 3, A(0.45));
    for (let x = 7; x < 31; x += 2) { m.set(x, 11, 3, '#e8e0c8'); m.set(x, 11, 5, '#e8e0c8'); } // fringe
    m.box(15, 0, 1, 6, 1, 2, '#9a8a6a'); // dust on the grass
  },
});
// Bushel basket heaped with green beans (porch bean-snapping)
defineProp('bushel_basket', {
  size: [9, 9, 9], collide: [0.55, 0.5, 0.55], cat: 'exterior',
  build(m) {
    const s = '#c8a068', s2 = '#a88048', bean = '#5a9a3a', bean2 = '#4a8a2e';
    for (let y = 0; y < 7; y++) { const r = 3.4 + y * 0.18; m.cyl(4.5, y, 4.5, r, 1, y % 3 === 1 ? s2 : s); }
    m.cyl(4.5, 1, 4.5, 3.2, 6, 0); m.cyl(4.5, 0, 4.5, 3.2, 1, s2);
    for (let z = 1; z < 8; z++) for (let x = 1; x < 8; x++) { const d = Math.hypot(x + 0.5 - 4.5, z + 0.5 - 4.5); if (d < 3.6) m.box(x, 6, z, 1, d < 2.2 ? 3 : 2, 1, (x + z) % 2 ? bean : bean2); }
    m.box(0, 5, 4, 1, 2, 1, s2); m.box(8, 5, 4, 1, 2, 1, s2);
  },
});
// Portable radio (cream & red plastic) for the porch step
defineProp('radio_portable', {
  size: [10, 10, 5], scale: 1 / 32, cat: 'exterior',
  build(m) {
    const c = '#e8dcc0', r = '#b8322a';
    m.box(0, 0, 0, 10, 7, 5, c); m.box(0, 0, 0, 10, 1, 5, r); m.box(0, 6, 0, 10, 1, 5, r);
    m.box(1, 2, 4, 5, 3, 1, '#8a7a5a'); for (let x = 1; x < 6; x += 2) m.box(x, 2, 4, 1, 3, 1, '#6a5a3a'); // grille
    m.box(7, 3, 4, 2, 2, 1, glow('#f0d890', 0.5)); m.set(7, 3, 4, '#2a2a2a'); // dial
    m.box(1, 7, 2, 1, 3, 1, '#2a2a2a'); m.box(8, 7, 2, 1, 3, 1, '#2a2a2a'); m.box(1, 9, 2, 8, 1, 1, '#2a2a2a');
  },
});
// Little girls' tea party: gingham cloth, tin tea set, a doll and a teddy bear as guests
defineProp('toy_tea_party', {
  size: [30, 12, 30], scale: 1 / 32, cat: 'exterior',
  build(m) {
    for (let z = 0; z < 30; z++) for (let x = 0; x < 30; x++) m.set(x, 0, z, ((x >> 2) + (z >> 2)) % 2 ? '#e8e4dc' : '#d86a7a');
    m.cyl(15, 1, 15, 3, 4, '#e8f0f4'); m.cyl(15, 5, 15, 1.5, 1, '#e8f0f4'); m.box(18, 2, 15, 2, 1, 1, '#e8f0f4'); m.set(12, 3, 15, '#e8f0f4'); // teapot
    for (const [x, z] of [[9, 9], [21, 9], [9, 21], [21, 21]]) { m.box(x, 1, z, 2, 2, 2, '#e8f0f4'); m.set(x, 1, z - 1, '#9ac0d8'); }
    m.cyl(15, 1, 22, 2.5, 1, '#f0ece2'); for (const x of [14, 16]) m.set(x, 2, 22, '#c8904a'); // plate of cookies
    // doll (sitting, pink dress) at the -x side
    m.box(1, 1, 13, 4, 4, 4, '#e8a0b0'); m.box(2, 5, 14, 2, 3, 2, '#f0d0b8'); m.box(2, 7, 14, 2, 1, 2, '#e8c070'); m.box(5, 1, 14, 3, 1, 2, '#f0d0b8');
    // teddy at the +x side
    m.box(25, 1, 13, 4, 4, 4, '#a87848'); m.box(25, 5, 14, 3, 3, 3, '#a87848'); m.set(25, 8, 14, '#8a6038'); m.set(27, 8, 14, '#8a6038'); m.set(24, 6, 15, '#2a2a2a');
  },
});
// Carved jack-o'-lantern: glows faintly after dark
defineProp('jack_o_lantern', {
  size: [9, 8, 9], collide: [0.5, 0.4, 0.5], cat: 'exterior',
  build(m) {
    const o1 = '#d06a1a', o2 = '#b85a14', lit = glow('#f8b040', 0.9);
    for (let y = 0; y < 6; y++) {
      const t = (y + 0.5) / 6, rr = 4.2 * Math.sqrt(Math.max(0.05, 1 - (2 * t - 1) ** 2)) + (y === 0 ? -0.3 : 0.4);
      for (let z = 0; z < 9; z++) for (let x = 0; x < 9; x++) { const dx = x + 0.5 - 4.5, dz = z + 0.5 - 4.5; if (dx * dx + dz * dz <= rr * rr) m.set(x, y, z, (Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI * 2) * 10)) % 2 ? o1 : o2); }
    }
    m.box(2, 1, 1, 5, 4, 7, lit); m.cyl(4.5, 1, 4.5, 3.2, 4, lit);
    const face = [[2, 4], [3, 4], [6, 4], [5, 4], [4, 3], [2, 2], [3, 1], [4, 1], [5, 1], [6, 2], [3, 2], [5, 2]];
    for (const [x, y] of face) for (let z = 8; z >= 4; z--) if (m.get(x, y, z)) { m.set(x, y, z, lit); break; }
    m.box(4, 6, 4, 1, 2, 1, '#5a5a2a');
  },
});
// Newspaper spread on the steps: pumpkin guts & seeds, the cut lid, a paring knife
defineProp('pumpkin_carving', {
  size: [16, 3, 12], cat: 'exterior',
  build(m) {
    m.box(0, 0, 0, 16, 1, 12, '#e8e3d4'); for (let z = 2; z < 11; z += 2) m.box(1, 0, z, 6, 1, 1, '#b8b4a8'); m.box(9, 0, 1, 6, 1, 4, '#8e8a80');
    const r = rnd(9); for (let i = 0; i < 12; i++) m.set(3 + r() * 10, 1, 3 + r() * 7, i % 2 ? '#e8a040' : '#f0e0b0');
    m.box(10, 1, 7, 3, 1, 3, '#d06a1a'); m.set(11, 2, 8, '#5a5a2a'); // lid
    m.box(3, 1, 9, 4, 1, 1, '#d8dce0'); m.box(1, 1, 9, 2, 1, 1, '#5a3a24'); // knife
  },
});
// Stack of cardboard moving cartons
defineProp('moving_boxes', {
  size: [16, 17, 13], collide: [1.0, 1.05, 0.8], cat: 'exterior',
  build(m) {
    const k = KRAFT, k2 = '#b89060', tape = '#d8c8a0', ink = '#3a3a3a';
    const carton = (x, y, z, w, h, d) => { m.box(x, y, z, w, h, d, k); m.box(x, y + h - 1, z + Math.floor(d / 2), w, 1, 1, tape); m.box(x, y, z, w, 1, d, k2); m.box(x + 1, y + 2, z + d - 1, Math.min(4, w - 2), 1, 1, ink); };
    carton(0, 0, 0, 9, 7, 7); carton(9, 0, 1, 7, 6, 7); carton(1, 7, 1, 7, 5, 6); carton(9, 6, 2, 6, 5, 6); carton(3, 12, 2, 6, 5, 5);
    m.box(0, 0, 8, 7, 5, 5, k); m.box(1, 3, 12, 4, 1, 1, ink); m.box(0, 4, 10, 7, 1, 1, tape);
  },
});
// Hand truck with a crated washing machine
defineProp('appliance_dolly', {
  size: [14, 27, 16], cat: 'exterior',
  build(m) {
    const cr = '#d8c8a0', sl = '#b89868';
    m.box(1, 3, 3, 12, 20, 12, cr); for (let y = 3; y < 23; y += 5) m.box(1, y, 3, 12, 1, 12, sl);
    for (const x of [1, 12]) for (const z of [3, 14]) m.box(x, 3, z, 1, 20, 1, sl);
    m.text('WASHER', 7, 12, 15, '#2a4a7a', { align: 'center' });
    m.box(0, 0, 1, 1, 26, 1, IRON); m.box(13, 0, 1, 1, 26, 1, IRON); m.box(0, 25, 0, 14, 1, 2, IRON); m.box(1, 2, 1, 12, 1, 14, IRON); // frame & nose plate
    for (const x of [0, 13]) ringX(m, x, 2.5, 1, 0, 2.5, 1, TYRE);
  },
});

// ================================================================ kids' games
// Chalk hopscotch on the sidewalk: 1-2-3, 4|5, 6, 7|8, 9, HOME; a pebble on the 4
defineProp('chalk_hopscotch', {
  size: [30, 1, 100], scale: 1 / 32, cat: 'exterior',
  build(m) {
    const ch = '#f4f2ec', ch2 = '#f0c8d0', ch3 = '#c8e0f0';
    const sq = (x, z, w, d, c) => { m.box(x, 0, z, w, 1, 1, c); m.box(x, 0, z + d - 1, w, 1, 1, c); m.box(x, 0, z, 1, 1, d, c); m.box(x + w - 1, 0, z, 1, 1, d, c); };
    const n = 14;
    const rows = [[1], [2], [3], [4, 5], [6], [7, 8], [9]];
    rows.forEach((r, i) => { const z = 2 + i * n; if (r.length === 1) sq(8, z, n, n + 1, ch); else { sq(1, z, n, n + 1, ch); sq(15, z, n, n + 1, ch); } });
    // numbers (pixel strokes, coloured chalk)
    rows.forEach((r, i) => r.forEach((num, j) => { const x = r.length === 1 ? 13 : (j ? 20 : 6), z = 2 + i * n + 5; for (let k = 0; k < Math.min(num, 4); k++) m.set(x + k, 0, z + 2, i % 2 ? ch2 : ch3); m.set(x, 0, z + 3, ch2); }));
    for (let a = 0; a < 30; a++) { const t = a / 29 * Math.PI; m.set(15 + Math.cos(t) * 8, 0, 2 + 7 * n + Math.sin(t) * 8, ch); }
    m.box(9, 0, 2 + 3 * n + 5, 2, 1, 2, '#8a8680'); // pebble
  },
});
// Chalk marble ring on the walk with a scatter of marbles and a shooter
defineProp('marbles_ring', {
  size: [36, 2, 36], scale: 1 / 32, cat: 'exterior',
  build(m) {
    ringY(m, 18, 0, 18, 15.2, 16.2, '#f4f2ec');
    const cols = ['#3a6ab8', '#c83a2a', '#e0b030', '#4a9a5a', '#e8e4dc', '#7a5ab8', '#3aa8b8'], r = rnd(17);
    for (let i = 0; i < 13; i++) { const a = r() * 6.28, d = r() * 9; m.set(18 + Math.cos(a) * d, 1, 18 + Math.sin(a) * d, cols[i % cols.length]); }
    m.box(30, 1, 6, 2, 1, 2, '#c8e8f0'); // steely shooter outside the ring
  },
});
// Jump rope in mid-swing: an arc between two turners 2.6 m apart. Origin on the rope's axis at
// hand height; residential.js spins it (pitch) about its long x axis.
defineProp('jump_rope_arc', {
  size: [43, 13, 2], origin: [21.5, 12.5, 1], cat: 'exterior',
  build(m) {
    for (let x = 0; x < 43; x++) { const y = 12 - Math.round(12 * Math.sin(Math.PI * x / 42)); m.set(x, y, 0, '#e8dcc0'); if (x > 0) { const yp = 12 - Math.round(12 * Math.sin(Math.PI * (x - 1) / 42)); for (let yy = Math.min(y, yp); yy <= Math.max(y, yp); yy++) m.set(x, yy, 0, '#e8dcc0'); } }
    m.box(0, 11, 0, 2, 2, 2, '#c83a2a'); m.box(41, 11, 0, 2, 2, 2, '#c83a2a');
  },
});
// Wooden hoop, 0.7 m, standing on its rim; origin at the hub so it can spin (pitch) as it rolls
defineProp('hoop_wood', {
  size: [2, 18, 18], scale: 1 / 25, origin: [1, 9, 9], cat: 'exterior',
  build(m) { ringX(m, 0, 9, 9, 7.8, 9, 2, '#c89a60'); for (const a of [0, 1.6, 3.1, 4.7]) m.set(0, 9 + Math.sin(a) * 8.4, 9 + Math.cos(a) * 8.4, '#a8783e'); },
});
// Orange-crate soapbox racer on pram wheels, No. 7, tint A paint
defineProp('soapbox_racer', {
  size: [14, 11, 30], collide: [0.8, 0.6, 1.8], cat: 'exterior',
  build(m) {
    const p = A(0.5), p2 = A(0.4), pl = '#b89060';
    m.box(4, 3, 0, 6, 1, 30, pl); // plank chassis
    m.box(3, 4, 2, 8, 5, 10, p); m.box(4, 5, 3, 6, 4, 8, 0); m.box(4, 4, 3, 6, 1, 8, '#6a4a2a'); // seat crate
    m.box(3, 4, 12, 8, 4, 12, p2); m.box(4, 8, 14, 6, 1, 9, p); m.box(3, 4, 24, 8, 3, 4, p); // cowl & nose crate
    m.text('7', 7, 5, 28, '#f4f2ec', { align: 'center' });
    for (const x of [0, 13]) { ringX(m, x, 3, 4, 1.8, 3, 1, TYRE); ringX(m, x, 3, 26, 1.8, 3, 1, TYRE); }
    m.box(1, 3, 4, 12, 1, 1, IRON); m.box(1, 3, 26, 12, 1, 1, IRON);
    line(m, 3, 5, 27, 1, 7, 18, '#d8ccb0'); line(m, 10, 5, 27, 12, 7, 18, '#d8ccb0'); // steering rope
    for (const [x, c] of [[4, '#e0b030'], [9, '#c83a2a']]) m.set(x, 9, 2, c);
  },
});
