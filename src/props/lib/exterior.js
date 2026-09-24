// Prop definitions: street furniture, park & harbour props, trees, festival.
// Conventions: 1 voxel = 1/16 m, origin = bottom centre, the "front" of the prop faces +z.
import { defineProp, lampLight } from '../props.js';
import { layoutText } from '../../world/font.js';

// ---------------------------------------------------------------- palette & helpers
const IRON = '#262e29', GILT = '#c9a24a', CHROME = '#cfd3d0', ALU = '#a9b0b2', WOODD = '#6a4226';
const CREAM = '#ece4cc', WHITE = '#eeeae0', BLACK = '#1c1c1c', NAVY = '#233254', CONCRETE = '#a8a498';
const LEAF = '#3a5a26', LEAF2 = '#2c4a1e', SOIL = '#3a2a1e', ROPE = '#c2a878', BRASS = '#c9a24a';
const A = (s = 0.5) => ({ tint: 1, shade: s });
const B = (s = 0.5) => ({ tint: 2, shade: s });
const glow = (c, e = 0.9) => ({ c, emit: e });

// deterministic RNG (xorshift) and 3-D hash
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hash(x, y, z, k = 0) { let h = (x * 374761393 + y * 668265263 + z * 1274126177 + k * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

// rounded box: skips the 12 edge lines when big enough (softer voxel clumps)
function rbox(m, x, y, z, w, h, d, col, ch = 1) {
  x = Math.round(x); y = Math.round(y); z = Math.round(z); w = Math.round(w); h = Math.round(h); d = Math.round(d);
  if (w < 3 || h < 3 || d < 3) ch = 0;
  for (let yy = y; yy < y + h; yy++) for (let zz = z; zz < z + d; zz++) for (let xx = x; xx < x + w; xx++) {
    if (ch) { const ex = xx === x || xx === x + w - 1, ey = yy === y || yy === y + h - 1, ez = zz === z || zz === z + d - 1; if ((ex && ey) || (ex && ez) || (ey && ez)) continue; }
    m.set(xx, yy, zz, col);
  }
}
// straight voxel line (thickness t)
// (solid: consecutive voxels share a face, so diagonal limbs don't look dotted)
function line(m, x0, y0, z0, x1, y1, z1, col, t = 1, solid = true) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0))));
  const o = (t - 1) / 2;
  let px = null, py = 0, pz = 0;
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = Math.round(x0 + (x1 - x0) * k - o), y = Math.round(y0 + (y1 - y0) * k - o), z = Math.round(z0 + (z1 - z0) * k - o);
    if (solid && px !== null) { if (x !== px) m.box(x, py, pz, t, t, t, col); if (z !== pz) m.box(x, py, z, t, t, t, col); }
    m.box(x, y, z, t, t, t, col); px = x; py = y; pz = z;
  }
}
// ellipsoid (rx, ry, rz) with optional keep filter
function ell(m, cx, cy, cz, rx, ry, rz, col, keep = null) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
    if (dx * dx + dy * dy + dz * dz <= 1 && (!keep || keep(x, y, z))) m.set(x, y, z, col);
  }
}
// ring (disc with a hole) in the x-y plane facing +z
function ringZ(m, cx, cy, z, r0, r1, len, col, keep = null) {
  for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++) for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d <= r1 && d >= r0 && (!keep || keep(x, y))) for (let k = 0; k < len; k++) m.set(x, y, z + k, col);
  }
}
// ring in the y-z plane (a wheel seen from the side), at x .. x+len-1
function ringX(m, x, cy, cz, r0, r1, len, col, keep = null) {
  for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++) for (let z = Math.floor(cz - r1); z <= Math.ceil(cz + r1); z++) {
    const d = Math.hypot(z + 0.5 - cz, y + 0.5 - cy);
    if (d <= r1 && d >= r0 && (!keep || keep(y, z))) for (let k = 0; k < len; k++) m.set(x + k, y, z, col);
  }
}
// text on an x-facing side: dir=-1 on the +x face (reads toward -z), dir=+1 on the -x face (reads toward +z)
function textX(m, str, x, y, z0, col, dir, font = 'small') {
  const L = layoutText(str, font);
  for (const p of L.pixels) m.set(x, y + p.y, z0 + dir * p.x, col);
  return L.width;
}
// double-sided sign text (front +z at zf, back -z at zb), centred on cx
function text2(m, str, cx, y, zf, zb, col, font = 'small') {
  m.text(str, cx, y, zf, col, { align: 'center', font });
  m.textBack(str, cx, y, zb, col, { align: 'center', font });
}

// ================================================================ STREET FURNITURE
// Cast-iron lamp post (single globe). Lamp at ~4.1 m.
defineProp('street_lamp', {
  size: [8, 72, 8], collide: [0.3, 3, 0.3], cat: 'exterior', light: lampLight(0, 4.1, 0, [1.0, 0.8, 0.5], 11, 'night'),
  build(m) {
    const g = '#243a2e', gl = { c: '#fff0c8', emit: 0.9 };
    m.box(1, 0, 1, 6, 3, 6, g); m.box(2, 3, 2, 4, 3, 4, g);
    m.box(3, 6, 3, 2, 54, 2, g);
    m.box(2, 58, 2, 4, 2, 4, g);
    m.box(2, 60, 2, 4, 7, 4, gl); m.box(1, 61, 1, 6, 5, 6, gl);
    m.box(2, 67, 2, 4, 2, 4, g); m.box(3, 69, 3, 2, 2, 2, '#c9a24a');
  },
});
// Twin-globe downtown lamp
defineProp('street_lamp_double', {
  size: [24, 76, 8], collide: [0.3, 3, 0.3], cat: 'exterior', light: lampLight(0, 4.3, 0, [1.0, 0.8, 0.5], 12, 'night'),
  build(m) {
    const g = '#243a2e', gl = { c: '#fff0c8', emit: 0.9 };
    m.box(9, 0, 1, 6, 3, 6, g); m.box(10, 3, 2, 4, 4, 4, g);
    m.box(11, 7, 3, 2, 55, 2, g);
    m.box(3, 60, 3, 18, 2, 2, g); m.box(11, 62, 3, 2, 6, 2, g); m.box(11, 68, 3, 2, 2, 2, '#c9a24a');
    for (const x of [1, 17]) { m.box(x + 1, 62, 2, 4, 1, 4, g); m.box(x, 63, 1, 6, 6, 6, gl); m.box(x + 1, 69, 2, 4, 2, 4, gl); m.box(x + 2, 71, 3, 2, 1, 2, g); }
  },
});
defineProp('fire_hydrant', {
  size: [8, 12, 8], collide: [0.35, 0.7, 0.35], cat: 'exterior',
  build(m) {
    const r = '#b8322a';
    m.box(1, 0, 1, 6, 1, 6, r); m.cyl(4, 1, 4, 2.6, 8, r); m.box(0, 5, 3, 8, 2, 2, r); m.box(3, 5, 0, 2, 2, 8, r);
    m.cyl(4, 9, 4, 2, 2, r); m.box(3, 11, 3, 2, 1, 2, '#e0c060');
  },
});

// 1950s olive-drab U.S. Mail collection box (0.62 x 1.35 m). Chute door on the +z front.
defineProp('mailbox_usps', {
  size: [10, 22, 12], collide: [0.62, 1.35, 0.62], cat: 'exterior',
  build(m) {
    const od = '#4b5634', dk = '#39422a', gold = '#d8b850';
    for (const [x, z] of [[0, 1], [8, 1], [0, 9], [8, 9]]) m.box(x, 0, z, 2, 4, 2, dk);
    m.box(0, 4, 1, 10, 1, 10, dk);
    m.box(0, 5, 1, 10, 11, 10, od);
    m.cylX(0, 15, 6, 5, 10, od);
    m.box(0, 15, 1, 10, 1, 10, od);
    m.box(0, 5, 1, 10, 1, 10, dk); // base rim
    // pull-down chute
    m.box(1, 12, 11, 8, 4, 1, dk); m.box(3, 15, 11, 4, 1, 1, CHROME); m.box(1, 16, 10, 8, 1, 1, dk);
    // "US" + eagle-ish emblem & collection card
    m.text('US', 5, 6, 11, gold, { align: 'center' });
    m.box(2, 12, 0, 6, 3, 1, '#e8e2cc'); m.box(3, 13, 0, 4, 1, 1, '#555a50');
    m.set(4, 21, 6, dk); m.set(5, 21, 6, dk);
  },
});

// Wire litter basket (painted dark green), with a crumpled paper or two
defineProp('trash_basket', {
  size: [10, 14, 10], collide: [0.55, 0.85, 0.55], cat: 'exterior',
  build(m) {
    const g = '#2c4434', b = '#22362a';
    m.cyl(5, 0, 5, 3.6, 1, b);
    m.cyl(5, 1, 5, 4.7, 12, g); m.cyl(5, 2, 5, 3.7, 11, 0);
    // vertical wire gaps
    for (let y = 3; y <= 10; y++) for (let z = 0; z < 10; z++) for (let x = 0; x < 10; x++) {
      const a = Math.atan2(z + 0.5 - 5, x + 0.5 - 5), k = Math.floor((a + Math.PI) / (Math.PI * 2) * 12);
      if (k % 2 && m.get(x, y, z)) m.set(x, y, z, 0);
    }
    m.cyl(5, 11, 5, 4.7, 2, b); m.cyl(5, 11, 5, 3.7, 2, 0);
    m.box(3, 2, 3, 4, 7, 4, '#6a5a44');
    m.box(3, 9, 4, 3, 2, 3, '#e6e2d6'); m.box(5, 10, 3, 2, 1, 3, '#cfc8b4'); m.set(4, 11, 5, '#e6e2d6');
  },
});

// Coin-operated newspaper box: the Juniper Bay Courier behind the glass.
defineProp('newspaper_box', {
  size: [10, 18, 9], collide: [0.6, 1.1, 0.55], cat: 'exterior',
  build(m) {
    const c = '#2f4f6f', d = '#243c56';
    m.box(1, 0, 1, 2, 5, 2, d); m.box(7, 0, 1, 2, 5, 2, d); m.box(1, 0, 5, 2, 5, 2, d); m.box(7, 0, 5, 2, 5, 2, d);
    m.box(0, 5, 0, 10, 12, 8, c);
    m.box(0, 16, 0, 10, 1, 8, d); m.box(1, 17, 1, 8, 1, 6, d);
    // window with the paper
    m.box(1, 9, 8, 8, 7, 1, CHROME);
    m.box(2, 10, 8, 6, 5, 1, '#e8e4d6');
    m.box(2, 14, 8, 6, 1, 1, '#2a2a2a'); // masthead
    m.box(2, 11, 8, 3, 2, 1, '#8a8a84'); // photo
    m.set(6, 12, 8, '#9a968a'); m.set(6, 11, 8, '#9a968a'); m.set(7, 12, 8, '#9a968a');
    m.set(2, 10, 8, '#9a968a'); m.set(4, 10, 8, '#9a968a'); m.set(6, 10, 8, '#9a968a');
    // coin mechanism, handle, price
    m.box(6, 6, 8, 3, 2, 1, CHROME); m.set(7, 7, 8, BLACK);
    m.box(2, 7, 8, 3, 1, 1, CHROME);
    m.set(1, 6, 8, '#e8c850'); m.set(2, 6, 8, '#e8c850');
  },
});
defineProp('parking_meter', {
  size: [6, 22, 6], collide: [0.2, 1.3, 0.2], cat: 'exterior',
  build(m) {
    const p = '#5a615c', h = '#6d756f';
    m.box(1, 0, 1, 4, 1, 4, p); m.box(2, 1, 2, 2, 14, 2, p);
    m.box(1, 15, 1, 4, 5, 4, h); m.box(2, 20, 2, 2, 1, 2, h);
    m.box(1, 19, 1, 4, 1, 4, '#4a504c');
    m.box(2, 17, 5, 2, 2, 1, '#c8d8d0'); m.set(2, 17, 5, '#c83424'); // window + EXPIRED flag
    m.box(2, 17, 0, 2, 2, 1, '#c8d8d0');
    m.set(3, 16, 5, BLACK); m.set(5, 16, 3, CHROME); m.set(0, 16, 3, CHROME); // slot & knobs
  },
});

// Gamewell fire-alarm box on a red post, with a red globe that glows at night
defineProp('fire_alarm_box', {
  size: [8, 32, 8], collide: [0.3, 1.9, 0.3], cat: 'exterior',
  build(m) {
    const r = '#b02a22', d = '#8a2018';
    m.box(1, 0, 1, 6, 2, 6, d); m.box(2, 2, 2, 4, 2, 4, r); m.box(3, 4, 3, 2, 16, 2, r);
    m.box(3, 10, 3, 2, 2, 2, WHITE); m.box(2, 19, 2, 4, 1, 4, d);
    m.box(1, 20, 1, 6, 6, 5, r); m.box(1, 25, 1, 6, 1, 5, d);
    m.box(2, 21, 6, 4, 4, 1, d); m.box(3, 22, 7, 2, 2, 1, '#e8e0c8'); // door + pull handle
    m.set(3, 24, 7, GILT); m.set(4, 24, 7, GILT);
    m.box(3, 26, 3, 2, 1, 2, d); m.box(2, 27, 2, 4, 3, 4, glow('#e04030', 0.5)); m.box(3, 30, 3, 2, 1, 2, d); m.set(3, 31, 3, GILT);
  },
});

// Wood & glass telephone booth with a Bell sign; lit at night.
defineProp('phone_booth', {
  size: [16, 40, 16], collide: [1.0, 2.4, 1.0], cat: 'exterior', light: lampLight(0, 2.1, 0, [1.0, 0.88, 0.62], 4, 'night'),
  build(m) {
    const w = '#7a5230', t = '#5a3a20', gl = '#9fb8c0';
    m.box(0, 0, 0, 16, 1, 16, CONCRETE);
    for (const [x, z] of [[0, 0], [14, 0], [0, 14], [14, 14]]) m.box(x, 1, z, 2, 33, 2, t);
    m.box(0, 1, 0, 16, 33, 2, w); // back wall
    for (const x of [0, 14]) { m.box(x, 1, 2, 2, 13, 12, w); m.box(x, 14, 2, 2, 1, 12, t); m.box(x, 31, 2, 2, 3, 12, w); m.box(x, 22, 7, 2, 1, 2, t); m.box(x, 15, 8, 2, 16, 1, t); }
    // front folding door
    m.box(2, 1, 14, 12, 11, 2, w); m.box(2, 12, 14, 12, 1, 2, t); m.box(2, 31, 14, 12, 3, 2, w);
    m.box(7, 13, 14, 2, 18, 2, t); m.box(2, 22, 14, 12, 1, 2, t); m.set(10, 12, 15, CHROME); m.set(5, 12, 15, CHROME);
    m.box(4, 5, 15, 3, 4, 1, t); m.box(9, 5, 15, 3, 4, 1, t);
    // glass hint on the side panes' edges
    for (const x of [0, 15]) { m.box(x, 15, 2, 1, 1, 6, gl); m.box(x, 15, 9, 1, 1, 5, gl); }
    // roof, cap and lantern
    m.box(0, 34, 0, 16, 2, 16, t); m.box(1, 36, 1, 14, 1, 14, w); m.box(5, 37, 5, 6, 2, 6, glow('#fff2c8'));
    m.box(6, 33, 6, 4, 1, 4, glow('#fff2c8'));
    // Bell System sign (blue disc with white bell) front and back
    for (const z of [15, 0]) {
      m.box(4, 34, z, 8, 2, 1, WHITE);
      m.cylZ(8, 35, z, 3, 1, '#2a4a8a');
      m.set(7, 34, z, WHITE); m.set(8, 34, z, WHITE); m.set(7, 35, z, WHITE); m.set(8, 35, z, WHITE); m.set(6, 34, z, WHITE); m.set(9, 34, z, WHITE); m.set(7, 36, z, WHITE); m.set(8, 36, z, WHITE);
    }
    // inside: telephone, shelf, directory
    m.box(6, 18, 2, 4, 7, 2, BLACK); m.box(6, 21, 4, 4, 2, 1, CHROME); m.box(5, 22, 2, 1, 3, 2, BLACK); m.box(7, 24, 4, 2, 1, 1, '#333333');
    m.box(3, 15, 2, 10, 1, 5, t); m.box(4, 16, 3, 4, 1, 3, '#d8b030'); m.box(9, 16, 3, 3, 1, 3, '#b83a2a');
  },
});

// "BUS STOP" sign on a post (double sided)
defineProp('bus_stop_sign', {
  size: [18, 42, 4], collide: [0.15, 2.6, 0.15], cat: 'exterior',
  build(m) {
    const p = '#5c625e', bl = '#2a3f6a';
    m.box(7, 0, 0, 4, 1, 4, p); m.box(8, 1, 1, 2, 40, 2, p); m.box(8, 41, 1, 2, 1, 2, bl);
    m.box(0, 27, 1, 18, 14, 2, bl); m.box(1, 28, 1, 16, 12, 2, CREAM);
    text2(m, 'BUS', 9, 34, 3, 0, bl); text2(m, 'STOP', 9, 29, 3, 0, '#a82c24');
  },
});
// "CARS STOP HERE" trolley stop sign on a post with a white-banded pole
defineProp('trolley_stop_sign', {
  size: [18, 48, 4], collide: [0.15, 2.8, 0.15], cat: 'exterior',
  build(m) {
    const p = '#3a3f3a';
    m.box(7, 0, 0, 4, 1, 4, p); m.box(8, 1, 1, 2, 46, 2, p);
    m.box(8, 12, 1, 2, 5, 2, WHITE); m.box(8, 47, 1, 2, 1, 2, GILT);
    m.box(0, 25, 1, 18, 21, 2, BLACK); m.box(1, 26, 1, 16, 19, 2, WHITE);
    text2(m, 'CARS', 9, 39, 3, 0, BLACK); text2(m, 'STOP', 9, 33, 3, 0, '#a82c24'); text2(m, 'HERE', 9, 27, 3, 0, BLACK);
  },
});

// Park bench: wood slats on cast-iron ends. Seat top 0.44 m; the sitter faces +z. 1.9 m long.
function benchIronEnd(m, x, arm = true) {
  const i = IRON;
  m.box(x, 0, 8, 2, arm ? 10 : 6, 1, i); m.box(x, 0, 9, 2, 1, 1, i);
  m.box(x, 0, 1, 2, 6, 1, i); m.box(x, 0, 0, 2, 1, 1, i);
  m.box(x, 5, 1, 2, 1, 8, i);
  for (let y = 6; y < 14; y++) m.box(x, y, y < 10 ? 1 : 0, 2, 1, 1, i);
  if (arm) { m.box(x, 10, 1, 2, 1, 9, i); m.box(x, 9, 9, 2, 1, 1, i); }
  m.box(x, 2, 3, 2, 1, 4, i); m.set(x, 3, 3, i); m.set(x + 1, 3, 6, i);
}
defineProp('bench_park', {
  size: [30, 14, 11], collide: [1.85, 0.8, 0.6], cat: 'exterior',
  build(m) {
    const w = '#8a5a32', w2 = '#7a4e2a';
    benchIronEnd(m, 2); benchIronEnd(m, 26); benchIronEnd(m, 14, false);
    for (const z of [2, 5, 8]) m.box(0, 6, z, 30, 1, 2, z === 5 ? w2 : w);
    m.box(0, 8, 1, 30, 2, 1, w); m.box(0, 11, 0, 30, 2, 1, w2); m.box(0, 13, 0, 30, 1, 1, w);
  },
});
// Bus bench with a painted advertising back: "HALLORAN BREAD".
defineProp('bench_bus', {
  size: [34, 22, 11], collide: [2.1, 1.0, 0.6], cat: 'exterior',
  build(m) {
    const w = '#8a5a32', c = '#b0aca0', g = '#2e5a3a';
    for (const x of [2, 30]) { m.box(x, 0, 1, 2, 6, 9, c); m.box(x, 0, 0, 2, 8, 2, c); }
    for (const z of [2, 5, 8]) m.box(0, 6, z, 34, 1, 2, w);
    m.box(0, 8, 0, 34, 14, 1, GILT); m.box(1, 9, 0, 32, 12, 1, g);
    m.box(0, 8, 1, 34, 1, 1, w); m.box(15, 7, 0, 4, 1, 2, c);
    m.text('HALLORAN', 17, 15, 1, CREAM, { align: 'center' });
    m.text('BREAD', 17, 10, 1, '#e8c060', { align: 'center' });
  },
});

// 1950s traffic signal: pole + yellow 3-lamp head facing +z. Lenses are dark; the traffic system
// overlays signal_lamp at (x 0, z +0.19): red y 3.0, amber y 2.69, green y 2.375 (metres).
function signalHead(m, x0, z0, dirZ) {
  const hsg = '#c9a52c', vis = '#1e1e1e';
  const lens = ['#10301e', '#3e3010', '#3e1210'];
  if (dirZ) {
    m.box(x0, 34, z0, 6, 17, 4, hsg);
    for (let i = 0; i < 3; i++) {
      const y = 36 + i * 5;
      m.box(x0 + 1, y, z0 + 4, 4, 4, 1, lens[i]);
      m.box(x0, y + 4, z0 + 4, 6, 1, 2, vis); m.box(x0, y + 1, z0 + 5, 1, 3, 1, vis); m.box(x0 + 5, y + 1, z0 + 5, 1, 3, 1, vis);
    }
    m.box(x0 + 1, 51, z0 + 1, 4, 1, 2, hsg);
  }
}
defineProp('traffic_signal', {
  size: [10, 54, 8], collide: [0.25, 3.2, 0.25], cat: 'exterior',
  build(m) {
    const p = '#3a3f3a';
    m.box(3, 0, 2, 4, 2, 4, p); m.box(4, 2, 3, 2, 32, 2, p);
    m.box(4, 14, 3, 2, 1, 2, '#2a2f2a');
    signalHead(m, 2, 2, true);
    m.box(4, 52, 3, 2, 2, 2, p);
  },
});
// Four-faced signal head on a post (lenses on all four sides, same heights as traffic_signal; faces at ±0.19 m)
defineProp('traffic_signal_4way', {
  size: [8, 54, 8], collide: [0.3, 3.2, 0.3], cat: 'exterior',
  build(m) {
    const p = '#3a3f3a', hsg = '#c9a52c', vis = '#1e1e1e';
    const lens = ['#10301e', '#3e3010', '#3e1210'];
    m.box(2, 0, 2, 4, 2, 4, p); m.box(3, 2, 3, 2, 32, 2, p);
    m.box(1, 34, 1, 6, 17, 6, hsg); m.box(2, 51, 2, 4, 1, 4, hsg); m.box(3, 52, 3, 2, 2, 2, p);
    for (let i = 0; i < 3; i++) {
      const y = 36 + i * 5;
      m.box(2, y, 7, 4, 4, 1, lens[i]); m.box(2, y, 0, 4, 4, 1, lens[i]);
      m.box(7, y, 2, 1, 4, 4, lens[i]); m.box(0, y, 2, 1, 4, 4, lens[i]);
      m.box(1, y + 4, 7, 6, 1, 1, vis); m.box(1, y + 4, 0, 6, 1, 1, vis); m.box(7, y + 4, 1, 1, 1, 6, vis); m.box(0, y + 4, 1, 1, 1, 6, vis);
    }
  },
});
// Small glowing lens disc (~0.2 m), tint A = light colour. Origin at the disc centre; the disc is 1/16 m thick in +z.
defineProp('signal_lamp', {
  size: [4, 4, 1], origin: [2, 2, 0], cat: 'exterior',
  build(m) {
    const c = { tint: 1, shade: 0.5, emit: 1 };
    m.box(1, 0, 0, 2, 4, 1, c); m.box(0, 1, 0, 4, 2, 1, c);
  },
});

// Cast-iron four-dial pedestal clock (~4 m), dials glow softly after dark.
defineProp('street_clock', {
  size: [16, 66, 16], collide: [0.6, 4.1, 0.6], cat: 'exterior', light: lampLight(0, 3.3, 0, [1.0, 0.9, 0.7], 5, 'night'),
  build(m) {
    const g = '#1f3a2c', g2 = '#172c21', dial = glow('#f4ecd0', 0.5), ink = '#1a1a1a';
    m.box(1, 0, 1, 14, 2, 14, CONCRETE); m.box(3, 2, 3, 10, 3, 10, g2); m.box(4, 5, 4, 8, 2, 8, g);
    m.box(5, 7, 5, 6, 38, 6, g);
    for (const [x, z] of [[5, 7], [5, 8], [10, 7], [10, 8], [7, 5], [8, 5], [7, 10], [8, 10]]) m.box(x, 9, z, 1, 34, 1, g2); // fluting
    m.box(4, 43, 4, 8, 2, 8, g2); m.box(4, 44, 4, 8, 1, 8, GILT); m.box(3, 45, 3, 10, 2, 10, g);
    m.box(2, 47, 2, 12, 12, 12, g);
    m.box(2, 47, 2, 12, 1, 12, GILT); m.box(2, 58, 2, 12, 1, 12, GILT);
    // four dials
    const face = (setp) => {
      for (let v = -4; v <= 4; v++) for (let u = -4; u <= 4; u++) if (u * u + v * v <= 19) setp(u, v, dial);
      setp(0, 4, ink); setp(0, -4, ink); setp(4, 0, ink); setp(-4, 0, ink);
      setp(0, 0, ink); setp(-1, 1, ink); setp(-2, 1, ink); setp(1, 1, ink); setp(2, 2, ink); setp(3, 3, ink); // 10:10
    };
    face((u, v, c) => m.set(8 + u - (u > 0 ? 0 : 0), 53 + v, 14, c));
    face((u, v, c) => m.set(7 - u, 53 + v, 1, c));
    face((u, v, c) => m.set(14, 53 + v, 7 - u, c));
    face((u, v, c) => m.set(1, 53 + v, 8 + u, c));
    m.box(3, 59, 3, 10, 2, 10, g); m.box(5, 61, 5, 6, 2, 6, g2); m.box(7, 63, 7, 2, 3, 2, GILT);
    m.box(6, 5, 12, 4, 1, 1, GILT);
  },
});

// Flag pole ~9 m with a 48-star flag flying toward +x. Origin at the foot of the pole. (1/8 m voxels)
defineProp('flag_pole', {
  size: [30, 76, 5], scale: 1 / 8, origin: [2, 0, 2.5], collide: [0.3, 9, 0.3], cat: 'far',
  build(m) {
    const pole = '#d8d8d0';
    m.box(0, 0, 0, 4, 1, 5, CONCRETE); m.box(1, 1, 1, 2, 30, 2, pole); m.box(1, 31, 2, 1, 42, 1, pole); m.box(1, 31, 1, 1, 42, 1, pole);
    m.box(1, 73, 1, 2, 2, 2, GILT);
    const red = '#b22234', blu = '#3c3b6e';
    // 13 stripes, slight wave in z
    for (let x = 0; x < 26; x++) {
      const z = 2 + (Math.floor(x / 5) % 2 === 1 ? 1 : 0);
      for (let s = 0; s < 13; s++) m.set(3 + x, 71 - s, z, s % 2 === 0 ? red : WHITE);
    }
    for (let x = 0; x < 10; x++) {
      const z = 2 + (Math.floor(x / 5) % 2 === 1 ? 1 : 0);
      for (let s = 0; s < 7; s++) m.set(3 + x, 71 - s, z, (x % 2 === 1 && s % 2 === 1) || (x % 2 === 0 && s % 2 === 0 && x > 0 && s > 0 && s < 6) ? '#f4f2ec' : blu);
    }
  },
});

// A-frame chalkboard sandwich sign: "PIE" today
defineProp('sandwich_board', {
  size: [12, 15, 10], collide: [0.75, 0.9, 0.55], cat: 'exterior',
  build(m) {
    const f = '#6a4a2c', ch = '#26332c', chalk = '#e8e8e0';
    const board = (zz, dir) => {
      for (let y = 0; y < 14; y++) { const z = zz + dir * Math.floor(y / 5); m.box(0, y, z, 12, 1, 1, f); if (y > 1 && y < 13) m.box(1, y, z, 10, 1, 1, ch); }
    };
    board(8, -1); board(1, 1);
    m.box(0, 14, 4, 12, 1, 2, f);
    m.text('PIE', 6, 7, 8, chalk, { align: 'center' });
    m.box(2, 4, 9, 3, 1, 1, chalk); m.box(6, 4, 9, 4, 1, 1, '#e8b0a0'); m.box(3, 2, 9, 6, 1, 1, chalk);
    m.textBack('EAT', 6, 7, 1, chalk, { align: 'center' });
  },
});

// Street planter: concrete trough with flowers (tint A) and greenery
function flowers(m, x0, y, z0, w, d, seed, dense = 0.3) {
  const R = rng(seed);
  for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
    m.set(x, y, z, (x + z) % 3 === 0 ? LEAF2 : LEAF);
    if (R() < 0.35) m.set(x, y + 1, z, LEAF);
  }
  for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) if (R() < dense) { const top = m.get(x, y + 1, z) ? y + 2 : y + 1; m.set(x, top, z, R() < 0.8 ? A(R() < 0.5 ? 0.5 : 0.58) : '#f0ece0'); }
}
defineProp('planter_box', {
  size: [16, 11, 8], collide: [1.0, 0.55, 0.5], cat: 'exterior',
  build(m) {
    m.box(0, 0, 0, 16, 1, 8, '#8e8a80'); m.box(0, 1, 0, 16, 6, 8, CONCRETE); m.box(0, 7, 0, 16, 1, 8, '#b8b4a8');
    m.box(1, 7, 1, 14, 1, 6, SOIL);
    flowers(m, 1, 8, 1, 14, 6, 3);
  },
});
defineProp('flower_pot', {
  size: [6, 8, 6], collide: [0.35, 0.4, 0.35], cat: 'exterior',
  build(m) {
    const t = '#b0603a';
    m.cyl(3, 0, 3, 2.2, 4, t); m.cyl(3, 4, 3, 2.8, 1, '#c07048'); m.cyl(3, 4, 3, 1.8, 1, SOIL);
    ell(m, 3, 6, 3, 2.6, 1.8, 2.6, LEAF, (x, y) => y >= 5);
    for (const [x, y, z] of [[2, 7, 2], [3, 7, 4], [4, 6, 1], [1, 6, 3], [4, 7, 3], [3, 7, 1], [2, 6, 4]]) m.set(x, y, z, A(0.5));
  },
});
// Window flower box: back at z=0 (mount flush on the wall), 1 m wide, flowers tint A with trailing ivy
defineProp('window_box', {
  size: [16, 8, 5], origin: [8, 0, 0], cat: 'exterior',
  build(m) {
    const p = '#e8e4da';
    m.box(0, 0, 0, 16, 4, 4, p); m.box(0, 3, 0, 16, 1, 4, '#d4d0c4'); m.box(1, 3, 1, 14, 1, 2, SOIL);
    m.box(1, 0, 0, 1, 1, 4, '#b8b4a8'); m.box(14, 0, 0, 1, 1, 4, '#b8b4a8');
    flowers(m, 1, 4, 0, 14, 4, 9, 0.4);
    for (const x of [2, 5, 9, 13]) m.box(x, 1 + (x % 2), 4, 1, 3 - (x % 2), 1, LEAF2);
  },
});

// Rooftop wooden water tank on steel legs (~5.7 m) with conical cap. (1/8 m voxels)
defineProp('water_tower', {
  size: [26, 46, 26], scale: 1 / 8, collide: [3.2, 5.5, 3.2], cat: 'far',
  build(m) {
    const st = '#4a4f4c', wd = '#8a6a48', hp = '#3a3a36', cap = '#4a4238';
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; const x = 13 + Math.cos(a) * 9, z = 13 + Math.sin(a) * 9; m.box(Math.round(x - 1), 0, Math.round(z - 1), 2, 16, 2, st); }
    for (let i = 0; i < 6; i++) { // cross bracing
      const a = i / 6 * Math.PI * 2 + 0.5, b = (i + 1) / 6 * Math.PI * 2 + 0.5;
      line(m, 13 + Math.cos(a) * 9, 2, 13 + Math.sin(a) * 9, 13 + Math.cos(b) * 9, 13, 13 + Math.sin(b) * 9, st);
    }
    m.cyl(13, 15, 13, 12, 1, '#5a5a54');
    m.cyl(13, 16, 13, 11, 20, wd);
    for (const y of [18, 23, 28, 33]) m.cyl(13, y, 13, 11.4, 1, hp);
    for (let y = 36; y < 44; y++) m.cyl(13, y, 13, Math.max(0.8, 12 - (y - 36) * 1.45), 1, cap);
    m.box(12, 44, 12, 2, 2, 2, cap);
    // ladder up the front
    for (let y = 0; y < 36; y++) { m.set(11, y, 25, st); m.set(14, y, 25, st); if (y % 3 === 0) m.box(12, y, 25, 2, 1, 1, st); }
    m.box(10, 36, 22, 6, 1, 3, st);
  },
});

// Rooftop TV antenna (fishbone Yagi on a mast), ~2.5 m
defineProp('tv_antenna', {
  size: [30, 42, 16], cat: 'exterior',
  build(m) {
    const a = ALU;
    m.box(13, 0, 6, 4, 1, 4, '#555555'); m.box(14, 1, 7, 1, 38, 1, a);
    line(m, 14, 12, 7, 10, 1, 3, '#3a3a3a'); line(m, 14, 12, 8, 18, 1, 12, '#3a3a3a');
    m.box(14, 38, 0, 1, 1, 16, a);
    [[1, 28], [3, 24], [6, 20], [9, 16], [12, 12], [15, 10]].forEach(([z, w]) => m.box(15 - w / 2, 38, z, w, 1, 1, a));
    m.box(3, 30, 7, 24, 1, 1, a); m.box(7, 32, 7, 16, 1, 1, a);
  },
});
// Clay chimney pot (sits on a chimney top)
defineProp('chimney_pot', {
  size: [8, 12, 8], cat: 'exterior',
  build(m) {
    const t = '#a85a38', d = '#8a4428';
    m.box(0, 0, 0, 8, 2, 8, d); m.cyl(4, 2, 4, 3, 7, t); m.cyl(4, 9, 4, 3.6, 2, d); m.cyl(4, 11, 4, 3, 1, t);
    m.cyl(4, 3, 4, 2, 9, '#1a1614');
  },
});

// Back-yard clothesline: two T-posts 4 m apart with two lines of washing (tint A / B / white)
defineProp('laundry_line', {
  size: [70, 32, 10], cat: 'exterior',
  build(m) {
    const p = '#d8d4c8', w = '#c8c4b8';
    for (const x of [2, 66]) { m.box(x, 0, 4, 2, 30, 2, p); m.box(x, 29, 0, 2, 2, 10, p); m.box(x - 1, 0, 3, 4, 1, 4, CONCRETE); }
    m.box(4, 28, 1, 62, 1, 1, w); m.box(4, 28, 8, 62, 1, 1, w);
    const peg = (x, z) => m.set(x, 29, z, '#b89060');
    const hang = (x, wd, h, z, c) => { m.box(x, 28 - h, z, wd, h, 1, c); peg(x, z); peg(x + wd - 1, z); };
    // line 1 (front z=1)
    hang(6, 12, 11, 1, WHITE);                                    // bedsheet
    hang(20, 8, 7, 1, A(0.5)); m.box(18, 24, 1, 2, 3, 1, A(0.5)); m.box(28, 24, 1, 2, 3, 1, A(0.5)); m.box(23, 25, 1, 2, 2, 1, WHITE); // shirt
    hang(32, 6, 11, 1, B(0.5)); m.box(34, 17, 1, 2, 5, 1, 0);     // trousers
    hang(40, 5, 6, 1, WHITE); m.box(40, 23, 1, 5, 1, 1, '#c84a3a'); // towel
    hang(47, 7, 10, 1, A(0.58)); m.box(46, 18, 1, 9, 2, 1, A(0.58)); // dress
    hang(56, 2, 4, 1, '#e0ddd0'); hang(59, 2, 4, 1, B(0.45)); hang(62, 2, 4, 1, '#e0ddd0'); // socks
    // line 2 (back z=8)
    hang(8, 14, 12, 8, '#e8e4da'); hang(24, 5, 5, 8, WHITE); hang(30, 5, 5, 8, WHITE); hang(36, 12, 10, 8, B(0.55)); hang(52, 10, 9, 8, '#e8e4da');
  },
});

// Picket fence, 2.0 m module along x (7 pickets, post at the -x end), white, front +z
defineProp('picket_fence', {
  size: [35, 18, 3], scale: 2 / 35, collide: [2.0, 1.0, 0.15], cat: 'exterior',
  build(m) {
    const w = '#eeeae2', r = '#d8d4c8';
    m.box(0, 0, 0, 3, 17, 3, w); m.box(0, 17, 0, 3, 1, 3, r);
    m.box(0, 3, 0, 35, 2, 1, r); m.box(0, 12, 0, 35, 2, 1, r);
    for (let i = 0; i < 6; i++) { const x = 5 + i * 5; m.box(x, 1, 1, 3, 15, 1, w); m.set(x + 1, 16, 1, w); }
  },
});
// Wrought-iron fence, 2.0 m module along x, spear-topped bars, post at the -x end
defineProp('iron_fence', {
  size: [32, 22, 2], collide: [2.0, 1.3, 0.12], cat: 'exterior',
  build(m) {
    const i = '#1e2220';
    m.box(0, 0, 0, 2, 20, 2, i); m.box(0, 20, 0, 2, 1, 2, GILT); m.set(0, 21, 0, i);
    m.box(0, 2, 0, 32, 1, 1, i); m.box(0, 16, 0, 32, 1, 1, i);
    for (let x = 4; x < 32; x += 3) { m.box(x, 1, 1, 1, 18, 1, i); m.set(x, 19, 1, (x % 2) ? GILT : i); }
  },
});
// Picket garden gate (1.0 m), matching picket_fence; posts both sides, Z-brace, latch
defineProp('fence_gate', {
  size: [18, 19, 3], scale: 1 / 18, collide: [1.0, 1.0, 0.15], cat: 'exterior',
  build(m) {
    const w = '#eeeae2', r = '#d8d4c8';
    for (const x of [0, 15]) { m.box(x, 0, 0, 3, 18, 3, w); m.box(x, 18, 0, 3, 1, 3, r); m.set(x + 1, 18, 1, GILT); }
    for (let i = 0; i < 3; i++) { const x = 4 + i * 4; m.box(x, 1, 1, 3, 14, 1, w); m.set(x + 1, 15, 1, w); }
    m.box(3, 3, 0, 12, 2, 1, r); m.box(3, 11, 0, 12, 2, 1, r); line(m, 4, 5, 0, 13, 10, 0, r);
    m.box(13, 8, 2, 1, 1, 1, '#333333');
  },
});

// Rural mailbox on a post, tint A flag (raised)
defineProp('mailbox_house', {
  size: [8, 21, 14], collide: [0.3, 1.2, 0.3], cat: 'exterior',
  build(m) {
    const p = '#6a5a48', b = '#8e928e';
    m.box(3, 0, 5, 2, 15, 2, p); m.box(1, 14, 3, 6, 1, 7, p);
    m.box(2, 15, 1, 4, 3, 12, b); m.box(3, 18, 1, 2, 1, 12, b); m.box(2, 15, 13, 4, 3, 1, '#7a7e7a'); m.set(3, 16, 13, CHROME);
    m.box(6, 16, 5, 1, 1, 1, A(0.4)); m.box(6, 16, 5, 1, 4, 1, A(0.45)); m.box(6, 18, 5, 1, 2, 3, A(0.5));
    m.box(2, 16, 12, 1, 1, 1, '#555555');
  },
});

// ================================================================ YARD & PLAY
defineProp('lawn_mower', {
  size: [10, 17, 18], collide: [0.55, 0.5, 0.6], cat: 'exterior',
  build(m) {
    const g = '#3a6a3a', r = '#a83424';
    for (const x of [0, 8]) { ringX(m, x, 3, 14, 0, 3, 2, BLACK); m.cylX(x, 3, 14, 1.6, 2, r); }
    m.cylX(2, 3, 14, 2.2, 6, g); for (let x = 2; x < 8; x += 2) m.set(x, 5, 14, CHROME);
    m.box(2, 1, 11, 6, 1, 2, '#555555');
    line(m, 1, 5, 12, 1, 15, 2, '#8a6a44'); line(m, 8, 5, 12, 8, 15, 2, '#8a6a44');
    m.box(0, 15, 1, 10, 1, 2, '#2a2a2a');
  },
});
defineProp('wheelbarrow', {
  size: [10, 9, 22], collide: [0.6, 0.55, 1.3], cat: 'exterior',
  build(m) {
    const t = '#4a7a6a', w = '#8a6a44';
    ringX(m, 4, 3, 18, 0, 3, 2, BLACK); m.cylX(4, 3, 18, 1.2, 2, t);
    for (let y = 3; y < 8; y++) { const k = y - 3; m.box(1 - (k > 2 ? 1 : 0), y, 5 - (k > 3 ? 1 : 0), 8 + (k > 2 ? 2 : 0), 1, 11 + k, t); }
    m.box(2, 4, 6, 6, 4, 9, 0); m.box(2, 4, 6, 6, 1, 9, '#3a5a4e');
    m.box(2, 3, 0, 1, 2, 19, w); m.box(7, 3, 0, 1, 2, 19, w);
    m.box(2, 0, 7, 1, 3, 1, w); m.box(7, 0, 7, 1, 3, 1, w);
    m.box(3, 5, 7, 4, 1, 3, '#6a4a2a'); // a little soil left inside
  },
});
defineProp('leaf_pile', {
  size: [18, 7, 16], cat: 'exterior',
  build(m) {
    const cols = ['#a83a1a', '#d0702a', '#d8a030', '#8a4a20', '#b85424'];
    const R = rng(21);
    ell(m, 9, 0, 8, 8, 5.5, 7, '#8a4a20');
    for (let i = 0; i < 16; i++) { const x = 3 + R() * 12, z = 3 + R() * 10, rr = 1.6 + R() * 1.8; ell(m, x, 0, z, rr + 0.8, 5 - Math.hypot(x - 9, z - 8) * 0.45, rr, cols[i % 5], (xx, yy, zz) => m.get(xx, yy, zz) || yy === 0); }
    for (let i = 0; i < 14; i++) { const a = R() * 6.28, r = 7.5 + R() * 1.5; m.set(Math.floor(9 + Math.cos(a) * r), 0, Math.floor(8 + Math.sin(a) * r * 0.9), cols[i % 5]); }
  },
});
function pumpkin(m, cx, cz, r, h) {
  const o1 = '#d06a1a', o2 = '#b85a14';
  for (let y = 0; y < h; y++) {
    const t = (y + 0.5) / h, rr = r * Math.sqrt(Math.max(0.05, 1 - (2 * t - 1) ** 2)) + (y === 0 ? -0.3 : 0.4);
    for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz; if (dx * dx + dz * dz > rr * rr) continue;
      const k = Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI * 2) * 10);
      m.set(x, y, z, k % 2 ? o1 : o2);
    }
  }
}
defineProp('pumpkin', {
  size: [9, 8, 9], collide: [0.5, 0.4, 0.5], cat: 'exterior',
  build(m) { pumpkin(m, 4.5, 4.5, 4.2, 6); m.box(4, 6, 4, 1, 2, 1, '#5a5a2a'); m.set(5, 7, 4, '#4a4a22'); m.set(3, 6, 5, '#3e6a2a'); },
});
defineProp('pumpkin_small', {
  size: [5, 5, 5], cat: 'exterior',
  build(m) { pumpkin(m, 2.5, 2.5, 2.4, 4); m.set(2, 4, 2, '#5a5a2a'); },
});
defineProp('hay_bale', {
  size: [15, 8, 8], collide: [0.95, 0.5, 0.5], cat: 'exterior',
  build(m) {
    const h = '#d0b060', h2 = '#bea050', tw = '#8a6a34';
    rbox(m, 0, 0, 0, 15, 8, 8, h);
    for (let y = 1; y < 7; y += 2) m.box(0, y, 1, 15, 1, 6, h2), m.box(1, y, 0, 13, 1, 8, h2);
    m.box(0, 1, 1, 15, 6, 6, h);
    for (const x of [4, 10]) { m.box(x, 0, 0, 1, 8, 1, tw); m.box(x, 0, 7, 1, 8, 1, tw); m.box(x, 7, 0, 1, 1, 8, tw); }
    m.set(2, 8 - 1, 3, '#e0c070'); m.set(12, 7, 5, '#e0c070');
  },
});
defineProp('scarecrow', {
  size: [24, 31, 6], collide: [0.3, 1.9, 0.3], cat: 'exterior',
  build(m) {
    const p = '#6a5a44', st = '#d8b860', sack = '#c8b080', den = '#3a5a8a', plaid = '#a83a2a', plaid2 = '#6a2418';
    m.box(11, 0, 2, 2, 26, 2, p); m.box(1, 20, 2, 22, 2, 2, p);
    m.box(8, 8, 1, 8, 9, 4, den); m.box(11, 8, 1, 2, 5, 4, 0); m.box(9, 5, 2, 2, 3, 2, st); m.box(13, 5, 2, 2, 3, 2, st);
    m.box(9, 14, 5, 1, 4, 1, den); m.box(14, 14, 5, 1, 4, 1, den);
    m.box(7, 16, 1, 10, 7, 4, plaid); for (let x = 7; x < 17; x += 3) m.box(x, 16, 1, 1, 7, 4, plaid2); m.box(7, 19, 1, 10, 1, 4, plaid2);
    m.box(2, 19, 1, 6, 4, 4, plaid); m.box(16, 19, 1, 6, 4, 4, plaid); m.box(4, 19, 1, 1, 4, 4, plaid2); m.box(19, 19, 1, 1, 4, 4, plaid2);
    m.box(0, 19, 2, 2, 3, 2, st); m.box(22, 19, 2, 2, 3, 2, st); m.set(0, 18, 3, st); m.set(23, 22, 2, st);
    rbox(m, 9, 23, 1, 6, 6, 5, sack); m.box(11, 22, 2, 2, 1, 2, '#8a6a44');
    m.set(10, 26, 5, BLACK); m.set(13, 26, 5, BLACK); m.box(10, 24, 5, 4, 1, 1, '#5a4030');
    m.box(7, 28, 0, 10, 1, 6, st); m.box(9, 29, 1, 6, 2, 4, st); m.box(9, 29, 1, 6, 1, 4, '#a83a2a');
  },
});

// Bicycle, 1.75 m, tint A frame and fenders, chrome bars; rides toward +z
defineProp('bicycle', {
  size: [9, 17, 29], collide: [0.4, 1.0, 1.7], cat: 'exterior',
  build(m) {
    const f = A(0.5), c = CHROME, cx = 4;
    for (const z of [5.5, 23.5]) { ringX(m, cx, 5.5, z, 4.2, 5.6, 1, BLACK); ringX(m, cx, 5.5, z, 3.6, 4.2, 1, '#e8e4dc'); m.set(cx, 5, Math.floor(z), c); line(m, cx, 5, z - 3, cx, 5, z + 3, '#b8bcb8'); line(m, cx, 2, z, cx, 8, z, '#b8bcb8'); }
    for (const z of [5.5, 23.5]) ringX(m, cx, 5.5, z, 5.7, 6.5, 1, f, (y, zz) => y > 6 && Math.abs(zz + 0.5 - z) < 6);
    line(m, cx, 5, 6, cx, 12, 11, f); line(m, cx, 6, 14, cx, 12, 11, f); line(m, cx, 6, 14, cx, 13, 21, f); line(m, cx, 12, 11, cx, 12, 21, f);
    line(m, cx, 5, 6, cx, 6, 14, f); line(m, cx, 13, 21, cx, 5, 23, c);
    m.box(cx, 10, 14, 1, 3, 5, A(0.42)); // tank
    m.box(cx - 1, 13, 9, 3, 1, 4, '#5a3424'); m.box(cx, 12, 11, 1, 1, 1, c);
    m.box(cx, 14, 21, 1, 2, 1, c); m.box(cx - 4, 15, 20, 9, 1, 1, c); m.box(cx - 4, 15, 19, 1, 1, 2, BLACK); m.box(cx + 4, 15, 19, 1, 1, 2, BLACK);
    m.box(cx, 13, 23, 1, 2, 2, c); m.set(cx, 13, 25, glow('#fff4d0', 0.5));
    m.box(cx - 1, 6, 13, 3, 1, 1, '#555555'); m.box(cx - 1, 4, 14, 1, 2, 1, '#555555'); m.box(cx + 1, 6, 15, 1, 2, 1, '#555555');
    m.set(cx, 9, 3, '#c83020');
  },
});
defineProp('tricycle', {
  size: [10, 12, 15], collide: [0.6, 0.7, 0.9], cat: 'exterior',
  build(m) {
    const r = '#b8322a';
    ringX(m, 4, 4, 11, 2.6, 4, 2, BLACK); ringX(m, 4, 4, 11, 0, 2.6, 2, '#d8d4c8'); m.box(4, 3, 10, 2, 2, 2, CHROME);
    m.box(3, 4, 11, 1, 1, 1, '#555555'); m.box(6, 4, 11, 1, 1, 1, '#555555'); // pedals
    for (const x of [0, 9]) { ringX(m, x, 2.5, 3, 1.2, 2.5, 1, BLACK); m.set(x, 2, 2, '#d8d4c8'); m.set(x, 2, 3, '#d8d4c8'); }
    m.box(1, 2, 2, 8, 1, 2, r); m.box(2, 1, 0, 6, 1, 2, CHROME); // axle + back step
    line(m, 4.5, 3, 3, 4.5, 8, 10, r, 2);
    m.box(4, 8, 10, 2, 2, 2, r); m.box(4, 9, 11, 2, 1, 1, CHROME);
    m.box(1, 10, 11, 8, 1, 1, CHROME); m.set(1, 10, 11, '#e8e4dc'); m.set(8, 10, 11, '#e8e4dc');
    m.box(3, 7, 5, 4, 1, 3, BLACK); m.box(4, 5, 6, 2, 2, 1, r);
  },
});
defineProp('wagon_red', {
  size: [10, 9, 24], collide: [0.6, 0.45, 1.1], cat: 'exterior',
  build(m) {
    const r = '#b8261e', r2 = '#8e1c16';
    for (const z of [4, 14]) for (const x of [0, 9]) { ringX(m, x, 2, z, 0, 2.2, 1, BLACK); m.set(x, 1, z, '#e8e4dc'); m.set(x, 2, z - 1, '#e8e4dc'); }
    m.box(1, 1, 3, 8, 1, 13, '#333333');
    m.box(0, 3, 1, 10, 4, 16, r); m.box(1, 4, 2, 8, 3, 14, 0); m.box(1, 3, 2, 8, 1, 14, r2);
    m.box(4, 4, 5, 3, 3, 3, '#d06a1a'); m.set(5, 7, 6, '#5a5a2a'); // pumpkin passenger
    m.box(3, 4, 11, 4, 2, 3, '#c8b890'); // a folded blanket
    m.box(4, 2, 16, 2, 1, 3, '#333333'); line(m, 5, 2, 18, 5, 8, 23, '#333333'); m.box(3, 8, 23, 5, 1, 1, BLACK);
  },
});
defineProp('baby_carriage', {
  size: [12, 18, 18], collide: [0.7, 1.1, 1.0], cat: 'exterior',
  build(m) {
    const n = NAVY, cr = '#e8e0cc';
    for (const [x, z, r] of [[0, 4, 3.5], [11, 4, 3.5], [0, 14, 3], [11, 14, 3]]) { ringX(m, x, r, z, r - 1, r, 1, BLACK); line(m, x, r, z - r + 1, x, r, z + r - 1, CHROME); line(m, x, 1, z, x, r * 2 - 1, z, CHROME); }
    line(m, 1, 4, 4, 5, 7, 9, CHROME); line(m, 10, 4, 4, 6, 7, 9, CHROME); line(m, 1, 3, 14, 5, 7, 9, CHROME); line(m, 10, 3, 14, 6, 7, 9, CHROME);
    for (let y = 7; y < 12; y++) { const k = y - 7; m.box(2, y, 3 - (k > 2 ? 1 : 0), 8, 1, 13 + (k > 2 ? 2 : 0), n); }
    m.box(3, 8, 4, 6, 4, 11, 0); m.box(3, 9, 5, 6, 1, 9, cr); m.box(2, 11, 3, 8, 1, 14, cr);
    // hood over the back (-z) end
    for (let y = 12; y < 17; y++) { const k = y - 12; m.box(2, y, 2 + k, 8, 1, 6 - k, n); m.box(3, y, 3 + k, 6, 1, 5 - k, 0); }
    m.box(2, 12, 2, 8, 1, 1, cr); m.box(2, 13, 7, 8, 1, 1, cr);
    line(m, 2, 11, 3, 2, 16, 0, CHROME); line(m, 9, 11, 3, 9, 16, 0, CHROME); m.box(2, 16, 0, 8, 1, 1, BLACK);
  },
});

// Kid's lemonade stand: "LEMON-ADE 5¢" hand-lettered sign, pitcher & cups
defineProp('lemonade_stand', {
  size: [26, 30, 13], collide: [1.6, 1.0, 0.7], cat: 'exterior',
  build(m) {
    const w = '#c8a878', w2 = '#a88858', y = '#f0d840', paint = '#e8e4d8', red = '#c02a24';
    m.box(0, 0, 3, 26, 14, 8, w); m.box(1, 0, 4, 24, 13, 6, 0);
    m.box(0, 14, 2, 26, 1, 10, w2);
    m.box(1, 2, 11, 24, 11, 1, paint);
    for (const [x, yy] of [[4, 5], [9, 8], [20, 5], [15, 9]]) { m.box(x, yy, 12, 2, 2, 1, y); }
    m.box(0, 14, 10, 2, 16, 2, w2); m.box(24, 14, 10, 2, 16, 2, w2);
    m.box(0, 20, 11, 26, 10, 1, '#f0ead8'); m.box(0, 20, 11, 26, 1, 1, w2);
    m.text('LEMON-', 12, 25, 12, red, { align: 'center' });
    m.text('ADE 5', 12, 21, 12, red, { align: 'center' });
    // hand-drawn cent sign
    const cx = 22; for (const [dx, dy] of [[1, 4], [0, 3], [1, 3], [2, 3], [0, 2], [0, 1], [1, 1], [2, 1], [1, 0]]) m.set(cx + dx, 21 + dy, 12, red);
    // pitcher & cups
    m.box(10, 15, 5, 4, 5, 4, '#dce8e8'); m.box(11, 15, 6, 2, 4, 2, y); m.box(14, 17, 6, 1, 2, 1, '#dce8e8');
    for (const x of [5, 7, 17, 19]) m.box(x, 15, 7, 1, 2, 1, x < 10 ? '#e8e4d8' : y);
    m.box(2, 15, 4, 3, 2, 3, '#e8d040'); m.set(3, 17, 5, '#f8f0a0'); // bowl of lemons
  },
});
defineProp('doghouse', {
  size: [18, 21, 20], collide: [1.1, 1.2, 1.25], cat: 'exterior',
  build(m) {
    const wl = '#a8402c', tr = '#e8e4d8', rf = '#4a3a34';
    m.box(1, 0, 1, 16, 12, 16, wl); m.box(2, 1, 2, 14, 11, 14, 0);
    for (let k = 0; k < 7; k++) m.box(1 + k, 12 + k, 16, 16 - k * 2, 1, 1, wl), m.box(1 + k, 12 + k, 1, 16 - k * 2, 1, 1, wl);
    for (let k = 0; k < 9; k++) { m.box(k - 1, 11 + k, 0, 2, 1, 19, rf); m.box(17 - k, 11 + k, 0, 2, 1, 19, rf); }
    m.box(6, 1, 16, 6, 6, 1, 0); m.box(7, 7, 16, 4, 1, 1, 0); m.box(5, 1, 17, 1, 7, 1, tr); m.box(12, 1, 17, 1, 7, 1, tr); m.box(6, 8, 17, 6, 1, 1, tr);
    m.text('REX', 9, 10, 17, tr, { align: 'center' });
    m.box(13, 0, 18, 3, 1, 2, '#b8322a'); m.set(14, 0, 18, '#6a4a2a');
    m.box(3, 1, 3, 12, 1, 8, '#8a5a32'); // blanket inside
  },
});
defineProp('swing_set', {
  size: [44, 36, 24], collide: false, cat: 'exterior',
  build(m) {
    const pp = '#2e6a4a', ch = '#9aa0a0', seat = '#8a5a32';
    for (const x of [1, 41]) { line(m, x, 0, 1, x, 34, 11, pp, 2); line(m, x, 0, 21, x, 34, 11, pp, 2); m.box(x - 1, 8, 5, 4, 1, 14, pp); }
    m.box(0, 34, 10, 44, 2, 2, pp);
    for (const x of [10, 28]) {
      line(m, x, 33, 11, x, 8, 11, ch); line(m, x + 5, 33, 11, x + 5, 8, 11, ch);
      m.box(x, 7, 10, 6, 1, 3, seat);
    }
    m.box(0, 0, 0, 4, 1, 3, '#555555'); m.box(40, 0, 0, 4, 1, 3, '#555555'); m.box(0, 0, 21, 4, 1, 3, '#555555'); m.box(40, 0, 21, 4, 1, 3, '#555555');
  },
});
defineProp('slide', {
  size: [14, 30, 50], collide: [0.9, 1.8, 3.1], cat: 'exterior',
  build(m) {
    const f = '#b83a2a', s = '#c8ccc8';
    // ladder at -z
    for (const x of [2, 11]) line(m, x, 0, 0, x, 26, 8, f);
    for (let y = 3; y < 24; y += 4) m.box(3, y, Math.round(y * 8 / 26), 8, 1, 1, s);
    m.box(2, 23, 8, 10, 1, 5, s); m.box(2, 24, 8, 1, 5, 5, f); m.box(11, 24, 8, 1, 5, 5, f); m.box(2, 28, 8, 10, 1, 1, f);
    for (const x of [2, 11]) m.box(x, 0, 11, 1, 23, 1, f);
    // chute down to +z
    for (let z = 13; z < 48; z++) { const y = Math.max(1, Math.round(23 - (z - 13) * 0.62)); m.box(3, y, z, 8, 1, 1, s); m.box(2, y, z, 1, 2, 1, s); m.box(11, y, z, 1, 2, 1, s); }
    m.box(3, 1, 46, 8, 1, 4, s); m.box(3, 0, 48, 1, 1, 1, f); m.box(10, 0, 48, 1, 1, 1, f);
    m.box(3, 0, 30, 1, 12, 1, f); m.box(10, 0, 30, 1, 12, 1, f);
  },
});
defineProp('seesaw', {
  size: [52, 14, 10], collide: [3.2, 0.8, 0.5], cat: 'exterior',
  build(m) {
    const f = '#2e5a8a', w = '#c8a040';
    m.box(22, 0, 2, 8, 1, 6, f); line(m, 23, 0, 3, 25, 7, 5, f, 2); line(m, 28, 0, 3, 26, 7, 5, f, 2); m.box(24, 7, 3, 4, 2, 4, f);
    for (let x = 0; x < 52; x++) { const y = Math.round(2 + x * 10 / 51); m.box(x, y, 3, 1, 1, 4, w); }
    m.box(2, 3, 3, 4, 1, 4, '#8a5a32'); m.box(46, 12, 3, 4, 1, 4, '#8a5a32');
    m.box(8, 4, 3, 1, 3, 1, CHROME); m.box(8, 4, 6, 1, 3, 1, CHROME); m.box(8, 7, 3, 1, 1, 4, CHROME);
    m.box(43, 12, 3, 1, 2, 1, CHROME); m.box(43, 12, 6, 1, 2, 1, CHROME); m.box(43, 13, 3, 1, 1, 4, CHROME);
  },
});
defineProp('sandbox', {
  size: [32, 5, 32], collide: false, cat: 'exterior',
  build(m) {
    const w = '#9a6a3a', s = '#d8c088', s2 = '#c8b078';
    m.box(0, 0, 0, 32, 3, 32, w); m.box(2, 0, 2, 28, 3, 28, s); m.box(0, 3, 0, 32, 1, 2, w); m.box(0, 3, 30, 32, 1, 2, w); m.box(0, 3, 0, 2, 1, 32, w); m.box(30, 3, 0, 2, 1, 32, w);
    ell(m, 10, 3, 12, 4, 2, 3, s2); ell(m, 20, 3, 20, 3, 1.5, 4, s);
    m.box(18, 3, 8, 3, 3, 3, A(0.5)); m.box(19, 4, 9, 1, 2, 1, s2); m.box(17, 5, 9, 1, 1, 1, CHROME); // pail
    m.box(8, 5, 18, 1, 1, 5, '#8a5a32'); m.box(7, 4, 23, 3, 1, 2, CHROME); // shovel
  },
});
defineProp('merry_go_round', {
  size: [40, 14, 40], collide: [2.4, 0.9, 2.4], cat: 'exterior',
  build(m) {
    const cols = ['#b8322a', '#e0b030', '#2e5a8a', '#3a7a4a'];
    m.cyl(20, 0, 20, 4, 2, '#555555');
    for (let z = 0; z < 40; z++) for (let x = 0; x < 40; x++) {
      const dx = x + 0.5 - 20, dz = z + 0.5 - 20; if (dx * dx + dz * dz > 19.5 * 19.5) continue;
      m.set(x, 2, z, '#6a6e6a'); m.set(x, 3, z, cols[(dx > 0 ? 1 : 0) + (dz > 0 ? 2 : 0)]);
    }
    m.cyl(20, 4, 20, 2, 9, CHROME); m.cyl(20, 12, 20, 3, 1, '#c8322a');
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, ex = 20 + Math.cos(a) * 17, ez = 20 + Math.sin(a) * 17, px = 20 + Math.cos(a) * 3, pz = 20 + Math.sin(a) * 3;
      line(m, ex, 4, ez, ex, 9, ez, CHROME); line(m, px, 11, pz, ex, 9, ez, CHROME);
    }
  },
});
defineProp('picnic_table', {
  size: [29, 12, 26], collide: [1.8, 0.78, 1.6], cat: 'exterior',
  build(m) {
    const w = '#8a6a48', w2 = '#74583a';
    for (const z of [7, 10, 13, 16]) m.box(0, 11, z, 29, 1, 3, (z / 3) % 2 ? w : w2);
    for (const z of [0, 22]) m.box(0, 6, z, 29, 1, 4, w);
    for (const x of [3, 24]) { line(m, x, 0, 4, x, 10, 11, w2, 2); line(m, x, 0, 21, x, 10, 14, w2, 2); m.box(x, 5, 0, 2, 1, 26, w2); m.box(x, 10, 7, 2, 1, 12, w2); }
  },
});
defineProp('bbq_grill', {
  size: [12, 15, 12], collide: [0.7, 0.9, 0.7], cat: 'exterior',
  build(m) {
    const k = '#2a2a2a';
    for (const [x, z] of [[2, 2], [9, 2], [5, 10]]) line(m, x, 0, z, 6 + (x - 6) * 0.5, 8, 6 + (z - 6) * 0.5, k);
    ell(m, 6, 11, 6, 5.5, 4, 5.5, k, (x, y) => y <= 11 && y >= 8);
    m.cyl(6, 10, 6, 4.5, 2, 0); m.cyl(6, 10, 6, 4.5, 1, '#e05a20'); m.cyl(6, 11, 6, 4.5, 1, 0);
    for (let x = 2; x < 11; x += 2) m.box(x, 11, 2, 1, 1, 8, CHROME);
    m.box(4, 11, 5, 3, 1, 2, '#8a3a2a'); m.box(7, 11, 7, 2, 1, 1, '#a04a30'); // burgers
    m.box(0, 11, 5, 1, 1, 2, WOODD); m.box(11, 11, 5, 1, 1, 2, WOODD);
  },
});
defineProp('birdbath', {
  size: [12, 12, 12], collide: [0.5, 0.75, 0.5], cat: 'exterior',
  build(m) {
    const c = '#b0aca2', c2 = '#989488';
    m.cyl(6, 0, 6, 3, 2, c2); m.cyl(6, 2, 6, 1.6, 7, c); m.cyl(6, 9, 6, 5.5, 1, c2); m.cyl(6, 10, 6, 5.5, 1, c); m.cyl(6, 10, 6, 4.5, 1, '#7aa0b8');
    m.set(10, 11, 6, '#7a5a3a'); m.set(10, 11, 5, '#7a5a3a'); m.set(10, 12, 6, '#6a4a2a'); m.set(10, 11, 7, '#d8c080');
  },
});
defineProp('bird_feeder', {
  size: [8, 28, 8], collide: [0.2, 1.6, 0.2], cat: 'exterior',
  build(m) {
    const p = '#6a5a44', r = '#a83a2a';
    m.box(3, 0, 3, 2, 20, 2, p); m.box(1, 20, 1, 6, 1, 6, p); m.box(2, 21, 2, 4, 3, 4, '#e8dca0'); m.box(2, 21, 2, 4, 3, 4, '#c8a860');
    m.box(1, 21, 1, 1, 3, 1, p); m.box(6, 21, 1, 1, 3, 1, p); m.box(1, 21, 6, 1, 3, 1, p); m.box(6, 21, 6, 1, 3, 1, p);
    for (let k = 0; k < 3; k++) m.box(0 + k, 24 + k, 0, 8 - k * 2, 1, 8, r);
    m.set(7, 21, 3, '#b83a2a'); m.set(7, 22, 3, '#b83a2a'); m.set(7, 22, 4, BLACK); // cardinal
  },
});
defineProp('garden_bench', {
  size: [24, 14, 10], collide: [1.5, 0.8, 0.6], cat: 'exterior',
  build(m) {
    const w = '#e8e4da', w2 = '#d4d0c4';
    for (const x of [1, 21]) { m.box(x, 0, 8, 2, 10, 1, w2); m.box(x, 0, 1, 2, 14, 1, w2); m.box(x, 10, 1, 2, 1, 9, w); m.box(x, 5, 1, 2, 1, 8, w2); }
    for (const z of [2, 4, 6, 8]) m.box(0, 6, z, 24, 1, 1, z % 4 ? w : w2);
    for (let x = 3; x < 21; x += 2) m.box(x, 8, 1, 1, 5, 1, w);
    m.box(0, 13, 1, 24, 1, 1, w2); m.box(0, 8, 1, 24, 1, 1, w2);
  },
});
defineProp('sundial', {
  size: [10, 15, 10], collide: [0.5, 0.9, 0.5], cat: 'exterior',
  build(m) {
    const c = '#b0aca2';
    m.box(1, 0, 1, 8, 2, 8, c); m.box(3, 2, 3, 4, 9, 4, c); m.box(2, 11, 2, 6, 1, 6, c);
    m.cyl(5, 12, 5, 3.6, 1, '#8a6a3a'); for (const [x, z] of [[5, 1], [8, 2], [9, 5], [8, 8], [5, 9], [2, 8], [1, 5], [2, 2]]) m.set(x, 12, z, '#4a3a22');
    [3, 3, 2, 2, 1].forEach((h, k) => m.box(5, 13, 3 + k, 1, h, 1, '#5a4222'));
  },
});
defineProp('stump', {
  size: [12, 8, 12], collide: [0.7, 0.45, 0.7], cat: 'exterior',
  build(m) {
    m.cyl(6, 0, 6, 5.5, 1, '#4a3a2e'); m.cyl(6, 0, 6, 4.6, 7, '#5a4634'); m.cyl(6, 6, 6, 3.9, 1, '#c8a878'); m.cyl(6, 6, 6, 2.6, 1, '#b8946a'); m.cyl(6, 6, 6, 1.2, 1, '#a88458');
    for (const [x, z] of [[1, 5], [10, 7], [6, 11]]) m.box(x, 0, z, 1, 2, 1, '#4a3a2e');
    m.box(8, 7, 5, 1, 1, 2, '#8a8e90'); m.box(8, 7, 7, 1, 1, 1, '#9aa0a0'); line(m, 8, 8, 6, 8, 11, 12, '#8a6a44'); // axe
  },
});
function rock(m, cx, cz, rx, ry, rz, seed) {
  const R = rng(seed), g = ['#8a8a84', '#76766f', '#9a9a92', '#8e9070'];
  rbox(m, cx - rx, 0, cz - rz, rx * 2, ry, rz * 2, g[0], 1);
  for (let i = 0; i < 5; i++) { const w = rx * (0.6 + R() * 0.6), h = ry * (0.4 + R() * 0.5), d = rz * (0.6 + R() * 0.6); rbox(m, cx - rx * 0.9 + R() * (rx * 1.8 - w * 0.5), 0, cz - rz * 0.9 + R() * (rz * 1.8 - d * 0.5), w, h + ry * 0.3, d, g[1 + (i % 3)], 1); }
}
defineProp('rock_small', { size: [9, 5, 8], collide: [0.5, 0.3, 0.45], cat: 'exterior', build(m) { rock(m, 4.5, 4, 4, 4, 3.5, 5); } });
defineProp('rock_big', { size: [18, 12, 16], scale: 1 / 8, collide: [2.1, 1.3, 1.9], cat: 'far', build(m) { rock(m, 9, 8, 8.5, 10, 7.5, 12); } });

// ================================================================ TREES
// Big trees use 1/4 m voxels (matching the world grid), small ones 1/8 m. Canopies are clusters of
// rounded blocks in 2-3 leaf shades (sunlit on top, shaded below) with a few notches cut in.
function canopy(m, R, o) {
  const rz = o.rz || o.rx;
  const core = (y0, y1, f, col) => rbox(m, o.cx - o.rx * f, o.cy + y0 * o.ry, o.cz - rz * f, o.rx * f * 2, (y1 - y0) * o.ry, rz * f * 2, col, o.coreCh ?? 0);
  if (o.core !== false) { core(-0.75, -0.2, 0.6, o.sh[0]); core(-0.45, 0.45, 0.8, o.sh[0]); core(0.25, 0.82, 0.56, o.sh[o.coreTop ?? 1]); }
  const L = [];
  for (let i = 0; i < o.n; i++) {
    const a = i * 2.39996 + R() * 0.7;
    const e = Math.asin(1 - 2 * (i + 0.5) / o.n) * (o.eScale || 0.95) + (R() - 0.5) * 0.25;
    if (o.minE !== undefined && e < o.minE) continue;
    const x = o.cx + Math.cos(a) * Math.cos(e) * o.rx * 0.8, z = o.cz + Math.sin(a) * Math.cos(e) * rz * 0.8, y = o.cy + Math.sin(e) * o.ry * 0.82;
    const sz = o.rx * (o.lump[0] + R() * (o.lump[1] - o.lump[0])), sy = sz * (o.flat || 0.7) * (0.85 + R() * 0.3);
    let shade = e > 0.3 ? 2 : e < -0.3 ? 0 : 1;
    if (R() < 0.22) shade = Math.max(0, shade - 1);
    const col = o.accent && shade < 2 && R() < (o.accentP || 0.15) ? o.accent : o.sh[shade];
    L.push([x - sz / 2, y - sy / 2, z - sz / 2, sz, sy, sz, shade, col]);
  }
  L.sort((a, b) => a[6] - b[6] || a[1] - b[1]);
  for (const l of L) rbox(m, l[0], l[1], l[2], l[3], l[4], l[5], l[7], o.ch ?? 0);
  // notches: find the canopy surface along a random horizontal ray and cut in
  for (let i = 0; i < (o.holes ?? 2); i++) {
    const a = R() * 6.28, y = Math.round(o.cy + (R() - 0.4) * o.ry * 0.9);
    for (let r = o.rx * 1.6; r > 1; r -= 0.5) {
      const x = Math.round(o.cx + Math.cos(a) * r), z = Math.round(o.cz + Math.sin(a) * r * rz / o.rx);
      if (m.get(x, y, z)) { m.clear(x - 1, y - 1, z - 1, 2 + (o.holeW || 0), 2, 2 + (o.holeW || 0)); break; }
    }
  }
}
// dot fruit/berries onto the canopy surface (from outside inward)
function dotSurface(m, R, cx, cy, cz, rx, ry, n, cols) {
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, e = (R() - 0.35) * 1.4;
    const dx = Math.cos(a) * Math.cos(e), dz = Math.sin(a) * Math.cos(e), dy = Math.sin(e);
    for (let r = 1.6; r > 0.2; r -= 0.04) {
      const x = Math.round(cx + dx * rx * r), y = Math.round(cy + dy * ry * r), z = Math.round(cz + dz * rx * r);
      if (m.get(x, y, z)) { m.set(x, y, z, cols[i % cols.length]); break; }
    }
  }
}
function trunk(m, cx, cz, h, w, bark, flare) {
  const x0 = Math.round(cx - w / 2), z0 = Math.round(cz - w / 2);
  m.box(x0, 0, z0, w, h, w, bark);
  if (flare) { m.box(x0 - 1, 0, z0, w + 2, 1, w, flare); m.box(x0, 0, z0 - 1, w, 1, w + 2, flare); }
}
// limbs: a short diagonal run out from the fork, then straight up into the crown (cheap to mesh)
function limbs(m, cx, cz, y0, list, bark, t = 1) {
  for (const [x, y, z] of list) {
    const ky = Math.min(y, y0 + Math.round(Math.max(Math.abs(x - cx), Math.abs(z - cz)) * 0.9));
    line(m, cx, y0, cz, x, ky, z, bark, t, true);
    m.box(Math.round(x - (t - 1) / 2), ky, Math.round(z - (t - 1) / 2), t, y - ky, t, bark);
  }
}

const BARK = '#4a3a2e', BARK2 = '#3a2d24', BARKG = '#5a5248';

function broadleaf(name, o) {
  defineProp(name, {
    size: o.size, scale: o.scale || 1 / 4, cat: 'far', collide: [0.5, 3, 0.5],
    build(m) {
      const [W, , D] = o.size, cx = W / 2, cz = D / 2, R = rng(o.seed);
      trunk(m, cx, cz, o.trunkH, o.trunkW, o.bark || BARK, BARK2);
      if (o.limbs) limbs(m, cx - 0.5, cz - 0.5, o.limbY, o.limbs.map(([dx, y, dz]) => [cx + dx, y, cz + dz]), o.bark || BARK, o.limbT || 1);
      canopy(m, R, { cx, cz, ...o.canopy });
      if (o.extra) o.extra(m, R, cx, cz);
    },
  });
}

broadleaf('tree_maple_red', {
  size: [26, 34, 26], seed: 7, trunkH: 14, trunkW: 2, limbY: 10,
  limbs: [[4, 15, 3], [-4, 15, -2], [1, 16, -4]],
  canopy: { cy: 21, rx: 10, ry: 9, n: 14, lump: [0.55, 0.8], sh: ['#5c140e', '#7e1c12', '#9a2616'], accent: '#b0401c', accentP: 0.2 },
});
broadleaf('tree_maple_orange', {
  size: [26, 34, 26], seed: 23, trunkH: 14, trunkW: 2, limbY: 10,
  limbs: [[4, 15, -3], [-4, 15, 2], [-1, 16, 4]],
  canopy: { cy: 21, rx: 10, ry: 9, n: 14, lump: [0.55, 0.8], sh: ['#8a3a10', '#b0501a', '#cc6c22'], accent: '#c88a26', accentP: 0.2 },
});
// American elm: vase-shaped, trunk forking into up-swept limbs under a wide flat-bottomed crown
broadleaf('tree_elm_yellow', {
  size: [30, 38, 30], seed: 5, trunkH: 11, trunkW: 2, limbY: 9, limbT: 1,
  limbs: [[6, 22, 5], [-6, 22, 3], [3, 23, -6]],
  canopy: { cy: 27, rx: 12.5, ry: 7.5, n: 10, lump: [0.52, 0.74], flat: 0.8, eScale: 1.1, sh: ['#7a5a10', '#a8801a', '#c8a42e'], accent: '#a4a232', accentP: 0.15 },
});
// Oak: squat, spreading, russet and brown-green
broadleaf('tree_oak', {
  size: [32, 32, 32], seed: 31, trunkH: 11, trunkW: 3, limbY: 8, limbT: 2,
  limbs: [[8, 13, 3], [-7, 13, -4]],
  canopy: { cy: 19, rx: 12, rz: 11, ry: 8, n: 11, lump: [0.55, 0.78], sh: ['#4e3a1c', '#7a4e22', '#9a6a2e'], accent: '#5e6a2a', accentP: 0.3 },
});
// Young street maple on stakes (1/8 m voxels, ~4.7 m)
broadleaf('tree_small', {
  size: [22, 38, 22], scale: 1 / 8, seed: 3, trunkH: 24, trunkW: 2, bark: '#5a4636',
  canopy: { cy: 27, rx: 8.5, ry: 8, n: 10, lump: [0.6, 0.85], sh: ['#8a2a14', '#b4461e', '#cc6026'], accent: '#d89a2a', accentP: 0.2, holes: 1 },
  extra(m, R, cx, cz) {
    for (const dx of [-4, 4]) { m.box(cx + dx - 0.5, 0, cz - 0.5, 1, 14, 1, '#b89868'); m.box(Math.min(cx + dx, cx) + (dx > 0 ? 0 : 1) - 0.5, 12, cz - 0.5, 3, 1, 1, '#3a3a3a'); }
    m.box(cx - 3, 0, cz - 3, 6, 1, 6, '#5a4030');
  },
});
// Old apple tree with red apples (1/8 m voxels, ~4.5 m, wide)
broadleaf('tree_apple', {
  size: [44, 38, 44], scale: 1 / 8, seed: 17, trunkH: 12, trunkW: 3, bark: '#5a4a3a', limbY: 10, limbT: 2,
  limbs: [[9, 17, 4], [-8, 17, -5]],
  canopy: { cy: 22, rx: 15.5, ry: 9, n: 9, lump: [0.6, 0.8], sh: ['#3a5222', '#50682a', '#6a7c32'], accent: '#8e923a', accentP: 0.15 },
  extra(m, R, cx, cz) {
    dotSurface(m, R, cx, 22, cz, 15.5, 9, 15, ['#b8201a', '#d0381e']);
    for (const [x, z] of [[cx + 6, cz + 3], [cx - 5, cz + 7], [cx + 2, cz - 8]]) m.set(Math.round(x), 0, Math.round(z), '#b8201a');
  },
});
// Paper birch: slim white trunk with dark marks, narrow golden crown (1/8 m voxels, ~8.5 m)
defineProp('tree_birch', {
  size: [30, 70, 30], scale: 1 / 8, cat: 'far', collide: [0.4, 3, 0.4],
  build(m) {
    const R = rng(11), cx = 15, cz = 15, w = '#e8e4dc', k = '#2e2a26';
    m.box(14, 0, 14, 2, 46, 2, w);
    line(m, 15, 10, 15, 20, 36, 17, w, 1); line(m, 15, 18, 15, 10, 34, 12, w, 1);
    for (let y = 3; y < 44; y += 5) { const f = (y * 7) % 4; if (f === 0) m.box(14, y, 16, 2, 1, 0 + 1, k); else if (f === 1) m.set(16 - 1, y, 13 + 1, k); else if (f === 2) m.set(13 + 1, y + 1, 14, k); else m.box(14, y, 14, 1, 1, 2, k); }
    m.box(14, 0, 14, 2, 1, 2, '#4a4038');
    canopy(m, R, { cx, cz, cy: 44, rx: 11.5, ry: 20, n: 11, lump: [0.6, 0.85], sh: ['#9a7418', '#c89e28', '#e0bc40'], accent: '#d8b030', accentP: 0.15, holes: 2 });
    canopy(m, R, { cx: 19, cz: 17, cy: 32, rx: 5.5, ry: 5, n: 3, lump: [0.7, 1.0], sh: ['#9a7418', '#c89e28', '#e0bc40'], core: false, holes: 0 });
  },
});
// Eastern white pine / spruce: dark green tiers (1/4 m voxels, ~10 m)
defineProp('tree_pine', {
  size: [22, 41, 22], scale: 1 / 4, cat: 'far', collide: [0.5, 3, 0.5],
  build(m) {
    const cx = 11, cz = 11, d = '#1a3222', md = '#244430', l = '#30563a';
    // octagonal tier = two crossed boxes
    const oct = (y, r, h, col) => { const a = Math.round(r), b = Math.round(r * 0.55); m.box(cx - a, y, cz - b, a * 2, h, b * 2, col); m.box(cx - b, y, cz - a, b * 2, h, a * 2, col); };
    m.box(10, 0, 10, 2, 36, 2, '#4a3a2e'); m.box(9, 0, 10, 4, 1, 2, BARK2); m.box(10, 0, 9, 2, 1, 4, BARK2);
    for (let i = 0; i < 7; i++) {
      const y = 5 + i * 4.6, r = 10 - i * 1.3;
      oct(y, r, 3, d); { const q = Math.round(r * 0.6); m.box(cx - q, y + 3, cz - q, q * 2, 2, q * 2, i % 2 ? md : l); }
    }
    m.box(10, 37, 10, 2, 3, 2, md); m.box(10, 40, 10, 1, 1, 1, l);
  },
});
// Round shrub, tint A greens (1/8 m voxels, ~1.5 x 1.1 m)
defineProp('bush_round', {
  size: [13, 10, 13], scale: 1 / 8, cat: 'exterior', collide: [1.2, 1.0, 1.2],
  build(m) {
    const R = rng(4);
    canopy(m, R, { cx: 6.5, cz: 6.5, cy: 4.6, rx: 5.4, ry: 4.4, n: 8, lump: [0.55, 0.8], sh: [A(0.4), A(0.5), A(0.6)], holes: 1 });
    m.box(5, 0, 5, 3, 1, 3, A(0.34));
  },
});
// Privet hedge, 1.0 m module along x (tiles seamlessly), 1.1 m tall, 0.75 m deep (1/8 m voxels)
defineProp('bush_hedge', {
  size: [8, 9, 6], scale: 1 / 8, cat: 'exterior', collide: [1.0, 1.1, 0.75],
  build(m) {
    const d = '#2a4420', md = '#36552a', l = '#46683a';
    m.box(0, 0, 0, 8, 8, 6, md);
    m.box(0, 0, 0, 8, 2, 6, d); m.box(0, 7, 1, 8, 1, 4, l);
    m.box(1, 8, 1, 3, 1, 3, l); m.box(5, 8, 2, 2, 1, 3, l);
    m.box(2, 3, 6 - 1, 3, 3, 1, l); m.box(6, 5, 5, 2, 2, 1, l); m.box(0, 4, 0, 2, 2, 1, l);
    m.box(3, 2, 0, 3, 3, 1, d);
  },
});
// Cheap distant broadleaf blob, tint A leaves (~7 m)
// Very cheap distant broadleaf (~58 faces, ~6.5 m): trunk + two chunky leaf blocks; leaf colour = tint A
defineProp('tree_far', {
  size: [18, 26, 18], scale: 1 / 4, cat: 'far',
  build(m) {
    m.box(8, 0, 8, 2, 11, 2, BARK);
    m.box(2, 10, 2, 14, 11, 14, A(0.44));
    m.box(4, 21, 4, 10, 5, 10, A(0.56));
  },
});
// Very cheap distant conifer (~62 faces, 8.5 m): three tiers, branches to the ground
defineProp('pine_far', {
  size: [14, 34, 14], scale: 1 / 4, cat: 'far',
  build(m) {
    m.box(0, 0, 0, 14, 12, 14, '#1c3424'); m.box(3, 12, 3, 8, 12, 8, '#28462f'); m.box(5, 24, 5, 4, 10, 4, '#1c3424');
  },
});

// ================================================================ HARBOUR
function crate(m, x, y, z, s = 10, stencil = true) {
  const w = '#a07a4a', d = '#7a5a36', g = '#8e6a40';
  m.box(x, y, z, s, s, s, w);
  for (const yy of [y + 3, y + 6]) { m.box(x, yy, z, s, 1, s, g); }
  m.box(x + 1, y + 1, z + 1, s - 2, s - 2, s - 2, w);
  for (const [dx, dz] of [[0, 0], [s - 1, 0], [0, s - 1], [s - 1, s - 1]]) m.box(x + dx, y, z + dz, 1, s, 1, d);
  for (const yy of [y, y + s - 1]) { m.box(x, yy, z, s, 1, 1, d); m.box(x, yy, z + s - 1, s, 1, 1, d); m.box(x, yy, z, 1, 1, s, d); m.box(x + s - 1, yy, z, 1, 1, s, d); }
  if (stencil) m.text('JB', x + s / 2, y + 2, z + s - 1, '#3a2a1a', { align: 'center' });
}
defineProp('crate', { size: [10, 10, 10], collide: [0.62, 0.62, 0.62], cat: 'exterior', build(m) { crate(m, 0, 0, 0); } });
defineProp('crate_stack', {
  size: [22, 20, 12], collide: [1.35, 1.25, 0.75], cat: 'exterior',
  build(m) { crate(m, 0, 0, 1); crate(m, 11, 0, 0, 10, false); crate(m, 5, 10, 1); m.box(17, 10, 2, 4, 3, 6, '#b89a68'); },
});
function barrel(m, cx, y0, cz, col = '#8a6038') {
  const hoop = '#3a3632';
  const rs = [3.5, 3.9, 4.3, 4.3, 4.3, 4.3, 4.3, 4.3, 4.3, 4.3, 3.9, 3.9, 3.5, 3.5];
  for (let y = 0; y < 14; y++) m.cyl(cx, y0 + y, cz, rs[y], 1, (y === 1 || y === 4 || y === 9 || y === 12) ? hoop : col);
  m.cyl(cx, y0 + 13, cz, 2.9, 1, '#6e4a2a'); m.set(cx - 1, y0 + 13, cz, '#4a3220');
}
defineProp('barrel', { size: [9, 14, 9], collide: [0.55, 0.85, 0.55], cat: 'exterior', build(m) { barrel(m, 4.5, 0, 4.5); } });
defineProp('barrel_stack', {
  size: [20, 28, 18], collide: [1.2, 1.7, 1.1], cat: 'exterior',
  build(m) { barrel(m, 5, 0, 5); barrel(m, 14, 0, 5, '#7e5832'); barrel(m, 9.5, 0, 13); barrel(m, 9.5, 14, 8, '#7e5832'); },
});
defineProp('fish_crate', {
  size: [12, 7, 9], collide: [0.75, 0.4, 0.55], cat: 'exterior',
  build(m) {
    const w = '#a88a5a', d = '#806440';
    m.box(0, 0, 0, 12, 5, 9, w); m.box(1, 1, 1, 10, 4, 7, '#dfe8ea'); m.box(0, 2, 0, 12, 1, 9, d);
    m.box(0, 5, 0, 1, 1, 9, d); m.box(11, 5, 0, 1, 1, 9, d);
    const sil = '#b8c4c8', back = '#5a7488', dark = '#222222';
    for (let r = 0; r < 4; r++) {
      const z = 1 + r * 2 - (r > 2 ? 1 : 0), flip = r % 2, y = 4 + (r % 2);
      const x0 = flip ? 2 : 1;
      m.box(x0, y, z, 8, 1, 1, r % 2 ? sil : back); m.box(x0 + 1, y, z + (r < 3 ? 1 : -1), 6, 1, 1, sil);
      m.set(flip ? x0 + 8 : x0 - 1 + 1, y, z, '#8a98a0'); m.set(flip ? x0 : x0 + 7, y, z, dark);
    }
    m.set(3, 6, 4, '#e8eef0'); m.set(8, 6, 2, '#e8eef0');
  },
});
function lobsterTrap(m, x, y, z) {
  const w = '#9a8a6a', w2 = '#7a6a50', net = '#3e5a3e';
  m.box(x, y, z, 14, 1, 9, w2);
  const arch = [[1, 0], [3, 0], [5, 0], [7, 1], [8, 3], [8, 5], [7, 7], [5, 8], [3, 8], [1, 8]];
  arch.forEach(([yy, zz], i) => { if (i % 2 === 0 || i === 9) m.box(x, y + yy, z + zz, 14, 1, 1, i % 4 === 0 ? w : w2); });
  for (const xx of [0, 6, 13]) arch.forEach(([yy, zz]) => m.set(x + xx, y + yy, z + zz, w2));
  for (const xx of [0, 13]) { m.box(x + xx, y + 1, z + 1, 1, 6, 7, net); m.box(x + xx, y + 3, z + 3, 1, 2, 3, 0); }
  m.box(x + 5, y + 1, z + 3, 3, 2, 3, net);
}
defineProp('lobster_trap', { size: [14, 9, 9], collide: [0.88, 0.55, 0.55], cat: 'exterior', build(m) { lobsterTrap(m, 0, 0, 0); } });
function buoy(m, x, y, z, flat = false) {
  if (flat) { // lying along x
    m.box(x, y + 1, z + 1, 12, 1, 1, '#8a6a44');
    m.box(x + 2, y, z, 3, 3, 3, A(0.5)); m.box(x + 5, y, z, 2, 3, 3, WHITE); m.box(x + 7, y, z, 2, 3, 3, B(0.5)); m.box(x + 1, y + 1, z + 1, 1, 1, 1, A(0.5));
    return;
  }
  m.box(x + 2, y, z + 2, 1, 14, 1, '#8a6a44');
  m.cyl(x + 2.5, y + 2, z + 2.5, 1.6, 1, A(0.46)); m.cyl(x + 2.5, y + 3, z + 2.5, 2.3, 3, A(0.5));
  m.cyl(x + 2.5, y + 6, z + 2.5, 2.3, 2, WHITE); m.cyl(x + 2.5, y + 8, z + 2.5, 2.3, 2, B(0.5)); m.cyl(x + 2.5, y + 10, z + 2.5, 1.6, 1, B(0.46));
}
defineProp('buoy', { size: [5, 14, 5], cat: 'exterior', build(m) { buoy(m, 0, 0, 0); } });
defineProp('lobster_trap_stack', {
  size: [30, 27, 12], collide: [1.85, 1.6, 0.7], cat: 'exterior',
  build(m) {
    lobsterTrap(m, 0, 0, 1); lobsterTrap(m, 15, 0, 2); lobsterTrap(m, 2, 9, 2); lobsterTrap(m, 15, 9, 1); lobsterTrap(m, 8, 18, 2);
    buoy(m, 16, 18, 3, true); buoy(m, 0, 18, 7, true);
    m.box(22, 0, 0, 1, 1, 1, ROPE);
  },
});
defineProp('fishing_net_pile', {
  size: [18, 7, 14], cat: 'exterior',
  build(m) {
    const R = rng(8), n1 = '#3e4a32', n2 = '#2e3a26', n3 = '#4a5a3a';
    ell(m, 9, 0, 7, 8.5, 5, 6.5, n1);
    for (let i = 0; i < 9; i++) ell(m, 3 + R() * 12, 0, 3 + R() * 8, 2 + R() * 2, 3.5 + R() * 2, 2 + R() * 1.5, [n2, n3][i % 2], (x, y, z) => y > 0 || true);
    dotSurface(m, R, 9, 0.5, 7, 9, 5, 14, ['#c8a060', '#c8a060', '#b89050', '#5a8a6a']);
    line(m, 1, 0, 2, 17, 0, 12, ROPE);
  },
});
defineProp('rope_coil', {
  size: [10, 3, 10], cat: 'exterior',
  build(m) {
    for (let y = 0; y < 2; y++) for (let r = 4.8; r > 1.2; r -= 1) {
      const col = (Math.round(r) + y) % 2 ? ROPE : '#a88e60';
      for (let z = 0; z < 10; z++) for (let x = 0; x < 10; x++) { const d = Math.hypot(x + 0.5 - 5, z + 0.5 - 5); if (d <= r && d > r - 1) m.set(x, y, z, col); }
    }
    m.box(5, 2, 1, 1, 1, 4, ROPE); m.box(6, 0, 9, 3, 1, 1, ROPE);
  },
});
defineProp('anchor', {
  size: [16, 23, 8], collide: [1.0, 1.4, 0.4], cat: 'exterior',
  build(m) {
    const i = '#2a2a2a', r = '#5a3a26';
    m.box(7, 2, 3, 2, 17, 2, i);
    ringZ(m, 8, 20.5, 3, 1, 2.4, 2, i);
    m.box(7, 16, 0, 2, 2, 8, i); m.set(7, 16, 0, r); m.set(8, 17, 7, r);
    const arm = [[7, 1], [5, 1], [4, 2], [3, 3], [2, 5], [2, 7]];
    for (const [x, y] of arm) { m.box(x, y, 3, 2, 2, 2, i); m.box(15 - x - 1, y, 3, 2, 2, 2, i); }
    m.box(0, 7, 3, 3, 3, 2, i); m.box(13, 7, 3, 3, 3, 2, i); m.set(1, 10, 3, i); m.set(14, 10, 3, i);
    m.box(6, 0, 3, 4, 2, 2, i); m.set(10, 2, 4, r); m.set(4, 3, 3, r);
  },
});
defineProp('bollard', {
  size: [8, 10, 8], collide: [0.45, 0.6, 0.45], cat: 'exterior',
  build(m) {
    const i = '#2a2a28', i2 = '#34342f';
    m.cyl(4, 0, 4, 3.9, 1, i2); m.cyl(4, 1, 4, 2.6, 6, i); m.cyl(4, 7, 4, 3.6, 2, i); m.cyl(4, 9, 4, 2.4, 1, i2);
    m.set(2, 3, 6, '#6a3a22'); m.set(6, 5, 2, '#6a3a22');
  },
});
defineProp('dock_cleat', {
  size: [12, 4, 5], cat: 'exterior',
  build(m) {
    const g = '#8a8e8a';
    m.box(3, 0, 1, 2, 2, 3, g); m.box(7, 0, 1, 2, 2, 3, g); m.box(0, 2, 1, 12, 1, 3, g); m.box(1, 3, 2, 10, 1, 1, g); m.set(0, 2, 1, 0); m.set(11, 2, 3, 0); m.set(0, 2, 3, 0); m.set(11, 2, 1, 0);
    m.box(2, 0, 0, 8, 1, 5, '#6a6e6a');
  },
});
defineProp('life_ring_post', {
  size: [12, 28, 7], collide: [0.2, 1.7, 0.2], cat: 'exterior',
  build(m) {
    const p = '#e8e4d8';
    m.box(5, 0, 1, 2, 26, 2, p); m.box(4, 26, 0, 4, 1, 4, '#b8322a'); m.box(5, 0, 1, 2, 1, 2, '#555555');
    m.box(5, 23, 3, 2, 1, 2, '#555555');
    ringZ(m, 6, 17.5, 3, 2.6, 5.4, 2, WHITE);
    ringZ(m, 6, 17.5, 3, 2.6, 5.4, 2, '#c03020', (x, y) => (x + 0.5 - 6) * (y + 0.5 - 17.5) > 0);
    for (const [x, y] of [[0, 17], [11, 17], [5, 12], [6, 23]]) m.set(x, y, 5, ROPE);
  },
});
defineProp('oil_drum', {
  size: [9, 14, 9], collide: [0.55, 0.88, 0.55], cat: 'exterior',
  build(m) {
    const c = '#3a5270', d = '#2a3c54';
    m.cyl(4.5, 0, 4.5, 3.9, 14, c); m.cyl(4.5, 13, 4.5, 3.9, 1, d); m.cyl(4.5, 13, 4.5, 3.2, 1, c);
    for (const y of [4, 9]) m.cyl(4.5, y, 4.5, 4.4, 1, d);
    m.cyl(4.5, 6, 4.5, 3.9, 2, '#e8e4d8'); m.set(3, 14 - 1, 3, '#888888'); m.set(6, 13, 5, '#888888');
    m.set(7, 2, 7, '#7a4a2a'); m.set(1, 11, 5, '#7a4a2a');
  },
});
defineProp('sack_pile', {
  size: [18, 11, 14], collide: [1.1, 0.65, 0.85], cat: 'exterior',
  build(m) {
    const c = ['#b89a68', '#a88a58', '#c4a878'];
    const sack = (x, y, z, k) => { rbox(m, x, y, z, 8, 4, 6, c[k % 3]); m.box(x - 1 + (k % 2 ? 9 : 0), y + 1, z + 2, 1, 2, 2, c[(k + 1) % 3]); m.set(x + 3, y + 3, z + 5, '#6a4a2a'); m.set(x + 4, y + 3, z + 5, '#6a4a2a'); };
    sack(1, 0, 1, 0); sack(9, 0, 1, 1); sack(4, 0, 7, 2); sack(4, 4, 2, 1); sack(10, 4, 6, 0); sack(6, 7, 4, 2);
  },
});
defineProp('cargo_pallet', {
  size: [22, 19, 18], collide: [1.35, 1.15, 1.1], cat: 'exterior',
  build(m) {
    const p = '#b89868', p2 = '#8a7048', net = '#6a5a3a';
    for (const z of [1, 8, 15]) m.box(1, 0, z, 20, 1, 2, p2);
    for (let x = 1; x < 21; x += 3) m.box(x, 1, 1, 2, 1, 16, p);
    crate(m, 2, 2, 2, 9, false); crate(m, 11, 2, 2, 9, true); crate(m, 2, 2, 11 - 2, 8, false); crate(m, 11, 2, 11, 6, false); crate(m, 6, 11, 5, 8, true);
    m.box(13, 2, 11, 7, 5, 6, '#b89a68');
    // cargo net over the load
    for (let x = 2; x < 21; x += 4) { m.box(x, 11, 1, 1, 1, 17, net); m.box(x, 2, 17, 1, 9, 1, net); m.box(x, 2, 1, 1, 9, 1, net); }
    for (let y = 4; y < 11; y += 4) { m.box(1, y, 1, 21, 1, 1, net); m.box(1, y, 17, 21, 1, 1, net); }
    for (let x = 6; x < 15; x += 4) m.box(x, 19 - 1, 4, 1, 1, 10, net);
    m.box(10, 18, 8, 2, 1, 2, '#555555');
  },
});

// ---------------------------------------------------------------- boats
// Boats float: their ORIGIN IS AT THE WATERLINE (hull extends below y=0 by the stated draft).
// hull(): bow toward +z. half(t) = plan-view half-width factor along the length (t 0 stern .. 1 bow);
// keel(t) = depth below the waterline, sheer(t) = gunwale height above it (voxels).
function hull(m, o) {
  const { cx, L, z0 = 0, B, wl } = o;
  for (let z = 0; z < L; z++) {
    const t = (z + 0.5) / L, hw = Math.round(B * o.half(t) * 2) / 2;
    if (hw <= 0.3) continue;
    const yk = Math.round(wl - o.keel(t)), ys = Math.round(wl + o.sheer(t));
    for (let y = yk; y < ys; y++) {
      const u = (y - yk + 0.5) / Math.max(1, ys - yk);
      // stepped section (keel / bilge / topsides) keeps the mesh cheap
      const w = Math.max(0.5, Math.round(hw * (o.flare ? o.flare(u) : (u < 0.22 ? 0.5 : u < 0.45 ? 0.82 : 1)) * 2) / 2);
      for (let x = Math.round(cx - w); x < Math.round(cx + w); x++) m.set(x, y, z0 + z, o.col(x, y, z0 + z, y === ys - 1, Math.abs(x + 0.5 - cx) > w - 1.2));
    }
    if (o.deck && t > 0.03 && t < 0.97) { // recessed deck inside a bulwark
      const drop = o.deckDrop ? o.deckDrop(t) : 1, wt = Math.round(hw * 2) / 2 - (o.bulwark || 1);
      for (let x = Math.round(cx - wt); x < Math.round(cx + wt); x++) { for (let k = 1; k <= drop; k++) m.set(x, ys - k, z0 + z, 0); m.set(x, ys - drop - 1, z0 + z, o.deck); }
    }
    if (o.open) { // hollow out an open boat
      const w = hw * (o.flare ? o.flare(1) : 1) - o.open;
      if (w > 0.5 && t > 0.04 && t < 0.95) for (let y = yk + 2; y < ys; y++) { const wi = Math.round((y < yk + 4 ? w - 1 : w) * 2) / 2; for (let x = Math.round(cx - wi); x < Math.round(cx + wi); x++) m.set(x, y, z0 + z, 0); }
    }
  }
}
// Small open rowing boat (origin at the waterline, draft ~0.2 m). Tint A topsides.
function rowboat(m, L, B, cx, wl, thwarts, oars) {
  const bot = '#7a2a20', inside = '#c8b48a', gun = '#8a6040';
  hull(m, {
    cx, L, B, wl, open: 1.2,
    half: (t) => t < 0.1 ? 0.62 + t * 2 : t > 0.6 ? Math.sqrt(Math.max(0, 1 - ((t - 0.6) / 0.4) ** 2)) * 0.98 + 0.02 : 1 - (0.3 - Math.min(0.3, Math.abs(t - 0.35))) * 0,
    keel: (t) => 3 - (t > 0.8 ? (t - 0.8) * 5 : 0),
    sheer: (t) => 6 + (t > 0.7 ? (t - 0.7) * 10 : 0) + (t < 0.1 ? (0.1 - t) * 8 : 0),
    col: (x, y, z, top, edge) => top ? gun : y < wl ? bot : (edge ? A(0.5) : inside),
  });
  for (const tz of thwarts) m.box(Math.round(cx - B + 1.5), wl + 3, tz, Math.round(B * 2 - 3), 1, 2, gun);
  if (oars) { line(m, cx - 3, wl + 4, Math.round(L * 0.2), cx - 2, wl + 4, Math.round(L * 0.85), '#b89060'); line(m, cx + 2, wl + 4, Math.round(L * 0.25), cx + 3, wl + 4, Math.round(L * 0.9), '#b89060'); m.box(cx - 3, wl + 4, Math.round(L * 0.85) - 4, 2, 1, 4, '#a07848'); }
  m.box(Math.round(cx - 1), wl - 2, 0, 2, 7, 1, A(0.42)); // transom
}
defineProp('rowboat', {
  size: [22, 14, 58], origin: [11, 4, 29], collide: [1.3, 0.7, 3.6], cat: 'far',
  build(m) { rowboat(m, 58, 10, 11, 4, [16, 30, 43], true); m.box(9, 5, 55, 4, 1, 3, '#555555'); },
});
defineProp('dinghy', {
  size: [18, 12, 40], origin: [9, 4, 20], collide: [1.1, 0.6, 2.5], cat: 'far',
  build(m) { rowboat(m, 40, 8, 9, 4, [12, 24], false); },
});
// Banks dory: narrow flat bottom, flared sides, sweeping sheer, tombstone transom (5 m)
defineProp('dory', {
  size: [24, 18, 80], origin: [12, 3, 40], collide: [1.5, 1.0, 5.0], cat: 'far',
  build(m) {
    const buff = '#c89a48', inside = '#b89060', gun = '#3a5a3a', bot = '#6a2a1e';
    hull(m, {
      cx: 12, L: 80, B: 11, wl: 3, open: 1.2,
      half: (t) => Math.max(0, Math.sin(Math.PI * (0.12 + t * 0.86))) * (t < 0.05 ? 0.6 : 1),
      keel: (t) => 3, sheer: (t) => 7 + Math.round(7 * ((t - 0.5) * 2) ** 2),
      flare: (u) => u < 0.3 ? 0.5 : u < 0.62 ? 0.76 : 1,
      col: (x, y, z, top, edge) => top ? gun : y < 3 ? bot : edge ? buff : inside,
    });
    for (const tz of [20, 36, 54]) m.box(5, 7, tz, 14, 1, 2, '#8a6a40');
    line(m, 9, 8, 14, 10, 8, 66, '#b89060'); line(m, 14, 8, 16, 15, 8, 68, '#b89060');
    m.box(11, 3, 0, 2, 12, 2, buff);
  },
});

// Offshore dragger / trawler ~9 m (1/8 m voxels). White hull, tint A sheer stripe. Origin at the waterline (draft 1.1 m).
defineProp('fishing_boat', {
  size: [28, 80, 76], scale: 1 / 8, origin: [14, 9, 38], collide: [3.3, 3.5, 9.2], cat: 'far',
  build(m) {
    const wl = 9, cx = 14, wh = '#e8e4dc', bot = '#8a2a20', blk = '#1e1e1e', deck = '#9a8a6a', trim = '#6a4a2a', gl = '#2a3a44';
    hull(m, {
      cx, L: 74, z0: 1, B: 13, wl,
      half: (t) => t > 0.55 ? Math.sqrt(Math.max(0, 1 - ((t - 0.55) / 0.45) ** 2)) : 0.8 + t * 0.36,
      keel: (t) => t < 0.06 ? 5 : 9 - t * 3, sheer: (t) => 7 + (t > 0.6 ? Math.round((t - 0.6) * 9) : 0), deck,
      col: (x, y, z, top, edge) => top ? trim : y < wl - 1 ? bot : y < wl ? blk : (y >= Math.round(wl + 5 + (z > 45 ? (z - 45) * 0.12 : 0)) && edge) ? A(0.5) : wh,
    });
    // wheelhouse
    const hy = 15;
    m.box(8, hy, 42, 12, 14, 12, wh); m.box(7, hy + 14, 41, 14, 1, 14, trim);
    for (const x of [9, 12, 16]) m.box(x, hy + 8, 54, 3, 4, 1, gl);
    m.box(7, hy + 8, 44, 1, 4, 8, gl); m.box(20, hy + 8, 44, 1, 4, 8, gl);
    m.box(8, hy, 42, 12, 1, 12, trim); m.box(12, hy + 1, 41, 4, 8, 1, trim);
    m.box(17, hy + 15, 44, 2, 5, 2, blk); // stack
    m.box(9, hy + 15, 50, 2, 1, 2, '#c8c8c0');
    // mast & boom
    m.box(13, hy - 1, 58, 2, 62, 2, '#b89868'); m.box(8, 66, 58, 12, 1, 1, '#b89868');
    line(m, 14, 34, 57, 14, 26, 24, '#9a8058', 1); line(m, 14, 76, 59, 14, 34, 57, '#555555', 1, false);
    line(m, 14, 76, 58, 14, hy + 1, 73, '#555555', 1, false);
    m.set(13, 77, 58, glow('#fff0c8', 0.5)); m.box(8, 66, 58, 1, 1, 1, glow('#30c050', 0.4)); m.box(19, 66, 58, 1, 1, 1, glow('#d03020', 0.4));
    // stern gallows & trawl doors
    for (const x of [2, 24]) { m.box(x, hy - 1, 6, 2, 12, 2, '#5a5a54'); m.box(x < 14 ? x : x - 2, hy + 10, 6, 4, 2, 2, '#5a5a54'); m.box(x < 14 ? x - 1 : x + 1, hy + 2, 5, 1, 7, 5, '#4a3a2a'); }
    // net drum & net heap
    m.box(6, hy, 14, 16, 5, 6, '#5a5a54'); m.cylX(7, hy + 4, 17, 3.5, 14, '#3e5a3e'); m.box(9, hy - 1, 22, 10, 3, 8, '#4a5a3a');
    m.box(6, hy - 1, 30, 6, 4, 6, '#a07a4a'); m.box(16, hy - 1, 32, 5, 3, 5, '#a07a4a');
    m.textBack('ROSA', 14, 12, 0, blk, { align: 'center' });
    m.box(10, 15, 64, 8, 2, 3, '#5a5a54'); // winch
  },
});
// Downeast lobster boat ~7 m (1/8 m voxels), tint A hull; origin at the waterline (draft 0.9 m)
defineProp('lobster_boat', {
  size: [24, 40, 58], scale: 1 / 8, origin: [12, 7, 29], collide: [2.7, 2.5, 7.0], cat: 'far',
  build(m) {
    const wl = 7, cx = 12, wh = '#ece8e0', bot = '#8a2a20', deck = '#b8aa88', gl = '#2a3a44', trim = '#7a5a3a';
    hull(m, {
      cx, L: 56, z0: 1, B: 10.5, wl,
      half: (t) => t > 0.55 ? Math.sqrt(Math.max(0, 1 - ((t - 0.55) / 0.45) ** 2)) : 0.86 + t * 0.25,
      keel: (t) => t < 0.1 ? 4 : 7 - t * 2, sheer: (t) => 5 + (t > 0.45 ? Math.round((t - 0.45) * 12) : 0), deck, deckDrop: (t) => t < 0.58 ? 2 : 1,
      col: (x, y, z, top, edge) => top ? wh : y < wl - 1 ? bot : y < wl ? '#1e1e1e' : A(0.5),
    });
    // wheelhouse / cuddy with windshield, open at the back
    const y0 = 11;
    m.box(4, y0, 30, 16, 10, 10, wh); m.box(5, y0, 30, 14, 9, 8, 0);
    m.box(5, y0 + 5, 39, 14, 3, 1, gl); m.box(11, y0 + 5, 39, 2, 3, 1, wh);
    m.box(4, y0 + 5, 32, 1, 3, 6, gl); m.box(19, y0 + 5, 32, 1, 3, 6, gl);
    m.box(3, y0 + 10, 28, 18, 1, 13, wh); m.box(3, y0 + 10, 28, 18, 1, 1, trim);
    m.box(9, y0, 34, 3, 4, 3, '#555555'); m.box(10, y0 + 4, 35, 2, 2, 1, '#222222'); // wheel console
    // hauler davit + pots + buoys in the cockpit
    m.box(4, y0 + 1, 29, 1, 9, 1, '#8a8e8a'); m.box(1, y0 + 9, 29, 4, 1, 1, '#8a8e8a'); m.box(1, y0 + 3, 28, 2, 3, 2, '#555555'); // starboard (-x) hauler
    m.box(4, y0 - 2, 6, 7, 4, 5, '#9a8a6a'); m.box(4, y0 + 2, 7, 7, 1, 3, '#7a6a50'); m.box(12, y0 - 2, 8, 7, 4, 5, '#9a8a6a');
    m.box(14, y0 - 2, 18, 2, 3, 2, A(0.5)); m.box(16, y0 - 2, 20, 2, 3, 2, B(0.5)); m.box(6, y0 - 2, 20, 2, 3, 2, A(0.5));
    // radio mast & flag
    m.box(11, y0 + 11, 32, 1, 16, 1, '#dddddd'); m.box(12, y0 + 24, 32, 3, 2, 1, '#2a4a8a');
    m.textBack('OPAL', 12, 9, 1, '#1e1e1e', { align: 'center' });
  },
});
// Sloop ~7 m with raised mainsail and jib (1/8 m voxels, mast ~9 m). Origin at the waterline (draft 1.2 m).
defineProp('sailboat', {
  size: [20, 96, 58], scale: 1 / 8, origin: [10, 10, 29], collide: [2.4, 2.0, 7.0], cat: 'far',
  build(m) {
    const wl = 10, cx = 10, bot = '#6a2a24', deck = '#d8ccb0', sail = '#f0ebe0', sail2 = '#e2dccc', mast = '#c8b890';
    hull(m, {
      cx, L: 56, z0: 1, B: 8.5, wl,
      half: (t) => t > 0.5 ? Math.sqrt(Math.max(0, 1 - ((t - 0.5) / 0.5) ** 2)) : 0.7 + t * 0.6,
      keel: (t) => 3, sheer: (t) => 4 + (t > 0.5 ? (t - 0.5) * 6 : 0),
      flare: (u) => Math.min(1, 0.25 + 0.9 * Math.sqrt(u)),
      col: (x, y, z, top, edge) => top ? '#8a6040' : y < wl - 1 ? bot : y < wl ? '#2a4a8a' : A(0.5),
    });
    // fin keel & rudder
    m.box(9, 0, 22, 2, wl - 2, 14, bot); m.box(9, 2, 3, 2, 6, 3, bot);
    // cabin trunk & cockpit
    m.box(6, wl + 4, 26, 8, 3, 14, '#ece8e0'); m.box(6, wl + 5, 28, 1, 1, 10, '#2a3a44'); m.box(13, wl + 5, 28, 1, 1, 10, '#2a3a44');
    m.box(6, wl + 4, 26, 8, 1, 14, '#ece8e0'); m.box(6, wl + 7, 27, 8, 1, 12, deck);
    m.box(6, wl + 3, 6, 8, 1, 16, 0); m.box(6, wl + 2, 6, 8, 1, 16, deck);
    // mast, boom, sails
    m.box(9, wl + 3, 37, 2, 80, 2, mast); m.box(10, wl + 16, 8, 1, 1, 29, mast);
    for (let y = wl + 17; y < wl + 82; y++) {
      const k = (y - wl - 17) / 65, zA = Math.round(37 - (1 - k) * 28);
      if (zA < 37) m.box(10, y, zA, 1, 1, 37 - zA, (Math.floor((y - wl) / 8) % 2) ? sail : sail2);
    }
    for (let y = wl + 6; y < wl + 70; y++) {
      const k = (y - wl - 6) / 64, zF = Math.round(39 + (1 - k) * 16), zB = Math.round(39 + (1 - k) * 2);
      if (zF > zB) m.box(10, y, zB, 1, 1, zF - zB, sail);
    }
    line(m, 10, wl + 83, 38, 10, wl + 6, 56, '#888888', 1, false);
    m.box(10, wl + 83, 37, 1, 3, 1, '#b8322a');
  },
});
// Harbour tug ~11 m, black hull, red deckhouse, big bow fender (1/8 m voxels). Origin at the waterline (draft 1.5 m).
defineProp('tugboat', {
  size: [34, 72, 90], scale: 1 / 8, origin: [17, 12, 45], collide: [4.2, 4.5, 11.2], cat: 'far',
  build(m) {
    const wl = 12, cx = 17, blk = '#1e1e1e', red = '#a02820', red2 = '#861e18', wh = '#ece8e0', bot = '#6a2a20', wood = '#8a6a44', fender = '#5a4228', gl = '#2a3a44';
    hull(m, {
      cx, L: 84, z0: 2, B: 16, wl,
      half: (t) => t > 0.55 ? Math.sqrt(Math.max(0, 1 - ((t - 0.55) / 0.45) ** 1.6)) : t < 0.1 ? 0.72 + t * 2.4 : 0.96 + (t - 0.1) * 0.08,
      keel: (t) => t < 0.1 ? 8 : 12, sheer: (t) => 5 + (t > 0.55 ? Math.round((t - 0.55) * 12) : 0), deck: '#7a6a52',
      col: (x, y, z, top, edge) => top ? wood : y < wl - 1 ? bot : blk,
    });
    // rubbing strake / side fenders (old tyres)
    for (let z = 10; z < 72; z += 10) { m.box(0, wl + 1, z, 2, 3, 3, '#262626'); m.box(32, wl + 1, z, 2, 3, 3, '#262626'); }
    // big bow pudding fender
    for (let y = wl - 1; y < wl + 9; y++) for (let x = 11; x < 23; x++) { const d = Math.abs(x + 0.5 - cx); if (d < 6 - Math.max(0, y - wl - 5)) { let z = 89; while (z > 60 && !m.get(x, y, z)) z--; m.box(x, y, z + 1, 1, 1, 2, fender); } }
    // deckhouse
    const y0 = wl + 5;
    m.box(8, y0, 24, 18, 11, 34, red); m.box(8, y0, 24, 18, 1, 34, red2);
    for (let z = 28; z < 56; z += 6) { m.box(7, y0 + 5, z, 1, 3, 3, gl); m.box(26, y0 + 5, z, 1, 3, 3, gl); m.box(7, y0 + 4, z - 1, 1, 1, 5, wh); m.box(26, y0 + 4, z - 1, 1, 1, 5, wh); }
    m.box(7, y0 + 11, 22, 20, 1, 38, wh);
    // pilot house on top (forward)
    m.box(10, y0 + 12, 44, 14, 10, 13, red); m.box(9, y0 + 22, 43, 16, 1, 15, wh);
    for (const x of [11, 15, 19]) m.box(x, y0 + 16, 57, 3, 4, 1, gl);
    m.box(9, y0 + 16, 46, 1, 4, 9, gl); m.box(24, y0 + 16, 46, 1, 4, 9, gl);
    m.box(10, y0 + 20, 57, 14, 1, 1, wh);
    // stack
    m.box(13, y0 + 12, 32, 8, 16, 7, red); m.box(13, y0 + 23, 32, 8, 2, 7, wh); m.box(13, y0 + 26, 32, 8, 2, 7, blk);
    m.text('J', 17, y0 + 16, 39, wh, { align: 'center' }); m.textBack('J', 17, y0 + 16, 31, wh, { align: 'center' });
    // mast with lights, searchlight, horn
    m.box(16, y0 + 23, 50, 2, 22, 2, '#c8b890'); m.box(13, y0 + 38, 50, 8, 1, 1, '#c8b890');
    m.set(16, y0 + 45, 50, glow('#fff0c8', 0.5)); m.set(17, y0 + 45, 51, glow('#fff0c8', 0.5));
    m.box(12, y0 + 23, 54, 3, 2, 3, '#b8bcb8'); m.set(13, y0 + 23, 57, glow('#fff4d0', 0.4));
    m.box(20, y0 + 23, 46, 2, 2, 3, GILT);
    // towing bitt & hook aft, life rings, name
    m.box(14, y0, 12, 6, 5, 4, blk); m.box(12, y0 + 3, 13, 10, 2, 2, blk);
    for (const x of [7, 26]) { ringX(m, x, y0 + 7, 40, 0.8, 2, 1, WHITE); ringX(m, x, y0 + 7, 40, 0.8, 2, 1, '#c03020', (y, z) => (y + 0.5 - (y0 + 7)) * (z + 0.5 - 40) > 0); }
    textX(m, 'JUNIPER', 34 - 1, wl + 1, 78, WHITE, -1); textX(m, 'JUNIPER', 0, wl + 1, 50, WHITE, 1);
    m.set(0, wl + 1, 49, 0);
  },
});

// ================================================================ FESTIVAL (Centennial "Harbor Days" fair)
// striped canopy sloping from the back (high) to the front (low), stripes along z in tint A & white, scalloped front valance
function stripedCanopy(m, x0, x1, zb, zf, yb, yf, stripe = 4) {
  for (let z = zb; z <= zf; z++) {
    const y = Math.round(yb + (yf - yb) * (z - zb) / (zf - zb));
    for (let x = x0; x <= x1; x++) m.set(x, y, z, Math.floor((x - x0) / stripe) % 2 ? WHITE : A(0.5));
  }
  for (let x = x0; x <= x1; x++) { const c = Math.floor((x - x0) / stripe) % 2 ? WHITE : A(0.5); const k = (x - x0) % stripe; m.box(x, yf - (k === 1 || k === 2 ? 3 : 2), zf, 1, k === 1 || k === 2 ? 3 : 2, 1, c); }
}
function pennants(m, x0, x1, y, z) {
  const cols = ['#b8322a', WHITE, '#2a4a8a'];
  for (let x = x0, i = 0; x + 2 <= x1; x += 4, i++) { const c = cols[i % 3]; m.box(x, y, z, 3, 1, 1, c); m.set(x + 1, y - 1, z, c); }
}
function pie(m, x, y, z, fill, lattice = true) {
  const crust = '#d8a860', dk = '#b87a3a';
  m.cyl(x + 3, y, z + 3, 3.2, 1, '#c8ccd0'); m.cyl(x + 3, y + 1, z + 3, 3.2, 1, crust); m.cyl(x + 3, y + 1, z + 3, 2.2, 1, fill);
  if (lattice) { m.box(x + 1, y + 1, z + 2, 5, 1, 1, dk); m.box(x + 1, y + 1, z + 4, 5, 1, 1, dk); m.box(x + 2, y + 1, z + 1, 1, 1, 5, crust); m.box(x + 4, y + 1, z + 1, 1, 1, 5, crust); }
}
// Fair booth 2.5 m wide: counter to the +z front, striped canopy (tint A & white), "1853-1953" board, goods.
defineProp('festival_stall', {
  size: [40, 46, 31], collide: [2.5, 2.4, 1.9], cat: 'exterior',
  build(m) {
    const w = '#8a5a32', wl = '#b08050', post = '#e8e4da';
    for (const [x, z] of [[0, 1], [38, 1], [0, 26], [38, 26]]) m.box(x, 0, z, 2, 36, 2, post);
    m.box(1, 0, 1, 38, 30, 1, w); // back wall
    m.box(2, 12, 2, 36, 1, 4, wl); m.box(2, 20, 2, 36, 1, 4, wl); // back shelves
    for (let x = 3; x < 37; x += 3) { m.box(x, 13, 3, 2, 3, 2, x % 2 ? '#a82a3a' : '#6a2a5a'); m.set(x, 16, 3, '#e8e0c8'); m.box(x, 21, 3, 2, 2, 2, x % 4 ? '#d8a830' : '#b8501a'); }
    m.box(0, 0, 22, 40, 14, 6, w); m.box(0, 13, 21, 40, 1, 8, wl);
    m.box(1, 1, 28, 38, 10, 1, '#e8e0c8'); pennants(m, 2, 38, 10, 28 + 1 - 1);
    m.box(1, 1, 28, 38, 1, 1, w);
    // goods on the counter: pies, apples, a pumpkin
    pie(m, 3, 14, 22, '#a02020'); pie(m, 11, 14, 22, '#c8742a'); pie(m, 29, 14, 22, '#3a2a5a', false);
    m.box(20, 14, 23, 6, 2, 4, '#8a6a44'); m.box(21, 16, 24, 4, 1, 2, '#b8201a'); m.set(22, 16, 23, '#c83a1a');
    m.box(34, 14, 24, 4, 3, 4, '#d06a1a'); m.set(35, 17, 25, '#5a5a2a');
    stripedCanopy(m, 0, 39, 0, 30, 40, 36);
    m.box(1, 37, 29, 38, 8, 1, GILT); m.box(2, 38, 29, 36, 6, 1, CREAM);
    m.text('1853-1953', 20, 38, 30, '#a82c24', { align: 'center' });
  },
});
// Six balloons on strings, knot at the origin (tie it to a stall, a post or a hand), ~2.6 m tall
defineProp('balloon_bunch', {
  size: [16, 42, 16], cat: 'exterior',
  build(m) {
    const cols = ['#d02a2a', '#e8c030', '#2a5ac8', '#3a9a4a', '#e87a2a', '#e878a8'];
    const pos = [[4, 33, 5], [11, 35, 6], [7, 38, 10], [3, 30, 11], [12, 30, 11], [8, 32, 3]];
    pos.forEach(([x, y, z], i) => {
      line(m, 8, 1, 8, x, y - 4, z, '#e8e4d8', 1, false);
      ell(m, x, y, z, 2.6, 3.3, 2.6, cols[i]);
      m.set(x - 1, y + 1, z - 2, '#f8f0e8'); m.set(x, y - 4, z, cols[i]);
    });
    m.box(7, 0, 7, 2, 1, 2, '#8a7a5a');
  },
});
function cartWheel(m, x, cy, cz, r, col = '#2a2a2a', hub = GILT) {
  ringX(m, x, cy, cz, r - 1, r, 1, col);
  line(m, x, cy - r + 1, cz, x, cy + r - 1, cz, hub); line(m, x, cy, cz - r + 1, x, cy, cz + r - 1, hub);
  m.set(x, Math.floor(cy), Math.floor(cz), hub);
}
defineProp('popcorn_cart', {
  size: [30, 36, 18], collide: [1.8, 2.0, 1.1], cat: 'exterior',
  build(m) {
    const r = '#b8261e', r2 = '#8e1c16', pc = '#f0e6c0', pc2 = '#e8d070';
    for (const x of [0, 29]) cartWheel(m, x, 6, 9, 6, '#2a2a2a', GILT);
    m.box(1, 5, 8, 28, 1, 2, '#555555');
    m.box(3, 6, 2, 24, 11, 14, r); m.box(3, 6, 2, 24, 1, 14, r2); m.box(3, 16, 2, 24, 1, 14, GILT);
    m.box(4, 8, 16, 22, 7, 1, r2); m.text('5C', 15, 9, 16, GILT, { align: 'center' });
    // glass case with popcorn (open panes)
    m.box(4, 17, 3, 22, 1, 12, GILT);
    for (const [x, z] of [[4, 3], [25, 3], [4, 14], [25, 14]]) m.box(x, 17, z, 1, 11, 1, GILT);
    m.box(5, 18, 4, 20, 4, 10, pc); for (let x = 5; x < 25; x += 3) m.set(x, 22, 4 + (x % 5), pc2); ell(m, 15, 22, 9, 6, 2.5, 3.5, pc, (x, y) => y >= 22);
    m.box(4, 28, 3, 22, 1, 12, GILT); m.box(3, 29, 2, 24, 1, 14, r);
    // "POPCORN" sign on top
    m.box(1, 30, 8, 28, 6, 2, r2); m.box(2, 30, 8, 26, 5, 2, CREAM);
    text2(m, 'POPCORN', 15, 30, 10, 7, r);
    // handle at the back, bags on a shelf
    m.box(8, 12, 0, 14, 1, 1, '#555555'); m.box(8, 12, 0, 1, 1, 2, '#555555'); m.box(21, 12, 0, 1, 1, 2, '#555555');
    for (const x of [26, 28]) { m.box(x, 17, 6, 2, 3, 2, WHITE); m.box(x, 18, 6, 2, 1, 2, r); m.set(x, 20, 6, pc); }
  },
});
defineProp('hot_dog_cart', {
  size: [32, 44, 30], collide: [1.9, 1.2, 1.1], cat: 'exterior',
  build(m) {
    const s = '#c8ccc8', s2 = '#a8aca8', red = '#b8261e';
    for (const x of [0, 31]) { ringX(m, x, 5, 13, 3.5, 5, 1, '#2a2a2a'); m.set(x, 5, 13, s); }
    m.box(1, 5, 12, 30, 1, 2, '#555555'); m.box(14, 0, 21, 2, 5, 2, s2);
    m.box(2, 5, 7, 28, 13, 16, s); m.box(2, 5, 7, 28, 1, 16, s2); m.box(2, 17, 7, 28, 1, 16, s2);
    m.box(2, 12, 23, 28, 5, 1, WHITE); text2(m, 'HOT DOGS', 16, 12, 23, 6, red);
    m.box(2, 7, 23, 28, 4, 1, '#e0c040'); m.box(2, 7, 6, 28, 4, 1, '#e0c040');
    // lids, condiments, buns
    m.box(4, 18, 9, 10, 2, 8, s2); m.box(8, 20, 12, 2, 1, 2, '#333333');
    m.box(18, 18, 10, 2, 4, 2, '#e8c020'); m.box(21, 18, 10, 2, 4, 2, red); m.set(18, 22, 10, red); m.set(21, 22, 10, '#e8c020');
    m.box(24, 18, 9, 5, 2, 6, '#d8a860');
    // umbrella: pole + 8 wedges tint A / white
    m.box(15, 18, 14, 2, 22, 2, '#dddddd');
    for (let y = 37; y < 41; y++) {
      const r = 15 - (y - 37) * 3.5;
      for (let z = 0; z < 30; z++) for (let x = 0; x < 32; x++) {
        const dx = x + 0.5 - 16, dz = z + 0.5 - 15, d = Math.hypot(dx, dz);
        if (d > r || (y > 37 && d < r - 4.5 && y < 40)) continue;
        m.set(x, y, z, Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI / 4)) % 2 ? WHITE : A(0.5));
      }
    }
    m.box(15, 41, 14, 2, 1, 2, A(0.5)); m.set(15, 42, 14, GILT);
  },
});
defineProp('ice_cream_cart', {
  size: [24, 26, 34], collide: [1.5, 1.4, 2.1], cat: 'exterior',
  build(m) {
    const w = '#f0ece4', w2 = '#d8d4cc', red = '#c02a2a', blu = '#2a4a9a';
    for (const x of [0, 22]) { ringX(m, x, 5, 24, 3.5, 5, 2, '#2a2a2a'); m.box(x, 5, 24, 2, 1, 1, CHROME); }
    ringX(m, 11, 5, 4, 3.5, 5, 2, '#2a2a2a'); m.box(11, 5, 4, 2, 1, 1, CHROME);
    m.box(2, 6, 15, 20, 14, 18, w); m.box(2, 6, 15, 20, 1, 18, w2); m.box(2, 20, 15, 20, 1, 18, CHROME);
    m.box(2, 17, 33, 20, 1, 1, blu); m.box(2, 7, 33, 20, 1, 1, blu);
    m.text('ICE', 12, 12, 33, red, { align: 'center' }); m.text('CREAM', 12, 8, 33, red, { align: 'center' });
    for (const x of [2, 21]) { m.box(x === 2 ? 1 : 22, 9, 20, 1, 6, 8, w2); m.box(x === 2 ? 1 : 22, 11, 22, 1, 3, 2, '#6a3a1a'); m.box(x === 2 ? 1 : 22, 9, 23, 1, 2, 1, '#d8b870'); }
    m.box(11, 5, 4, 2, 2, 12, CHROME); line(m, 12, 6, 6, 12, 14, 12, CHROME);
    m.box(9, 14, 10, 6, 1, 4, '#2a2a2a'); m.box(11, 12, 11, 2, 2, 2, CHROME);
    m.box(4, 21, 16, 16, 1, 3, CHROME); m.box(4, 21, 29, 16, 1, 3, CHROME); m.box(3, 20, 24, 18, 2, 1, '#bbbbbb');
    m.box(5, 21, 13, 14, 1, 1, CHROME); m.set(4, 22, 16, GILT); m.set(19, 22, 16, GILT); m.set(12, 22, 16, GILT); // bells
    m.box(10, 18, 13, 4, 1, 3, '#2a2a2a'); // handlebars
    m.box(5, 18, 12, 14, 1, 1, CHROME);
  },
});
defineProp('cotton_candy_cart', {
  size: [26, 42, 18], collide: [1.6, 2.0, 1.1], cat: 'exterior',
  build(m) {
    const p = '#e890b0', p2 = '#c86a90', fl = '#f8c0d8', fb = '#b8d8f0';
    for (const x of [0, 25]) cartWheel(m, x, 5, 9, 5, '#2a2a2a', '#e8e4dc');
    m.box(1, 4, 8, 24, 1, 2, '#555555');
    m.box(2, 5, 2, 22, 12, 14, p); m.box(2, 16, 2, 22, 1, 14, WHITE); m.box(2, 5, 2, 22, 1, 14, p2);
    for (let x = 3; x < 23; x += 4) m.box(x, 7, 16, 2, 8, 1, WHITE);
    m.cyl(8, 17, 9, 5, 3, CHROME); m.cyl(8, 18, 9, 4, 2, 0); ell(m, 8, 19, 9, 4, 3, 4, fl, (x, y) => y >= 19);
    // display: cones on a rack
    m.box(18, 17, 7, 2, 10, 2, '#dddddd');
    for (const [dx, y, dz, c] of [[-3, 21, -2, fl], [3, 22, 2, fb], [-2, 25, 2, fl], [3, 26, -2, fl], [0, 28, 0, fb]]) { m.box(19 + Math.sign(dx), y - 2, 8 + Math.sign(dz), 1, 3, 1, '#e8e0c8'); ell(m, 19 + dx, y + 1, 8 + dz, 2.1, 2.3, 2.1, c); }
    m.box(0, 29, 7, 26, 13, 2, p2); m.box(1, 30, 7, 24, 11, 2, WHITE);
    text2(m, 'COTTON', 13, 36, 9, 6, p2); text2(m, 'CANDY', 13, 30, 9, 6, '#d05a8a');
  },
});
defineProp('ring_toss', {
  size: [40, 46, 31], collide: [2.5, 2.4, 1.9], cat: 'exterior',
  build(m) {
    const w = '#8a5a32', post = '#e8e4da';
    for (const [x, z] of [[0, 1], [38, 1], [0, 26], [38, 26]]) m.box(x, 0, z, 2, 36, 2, post);
    m.box(1, 0, 1, 38, 32, 1, '#2a4a8a');
    for (let y = 0; y < 32; y += 8) m.box(1, y, 1, 38, 4, 1, '#e8c040');
    // stepped shelves of milk bottles (white with red caps)
    for (let k = 0; k < 3; k++) {
      const y = 4 + k * 5, z = 3 + k * 3;
      m.box(4, 0, z, 32, y, 3, k % 2 ? '#b8322a' : WHITE);
      for (let x = 5; x < 35; x += 3) { m.box(x, y, z + 1, 2, 3, 1, '#f4f2ec'); m.set(x, y + 3, z + 1, '#c82a2a'); }
    }
    m.box(0, 0, 22, 40, 11, 6, w); m.box(0, 11, 21, 40, 1, 8, '#b08050'); m.box(1, 1, 28, 38, 9, 1, '#e8e0c8'); pennants(m, 2, 38, 9, 28);
    // rings on a peg + prizes (teddy bears) hanging from the posts
    for (const [x, c] of [[6, '#c82a2a'], [9, '#e8c030'], [12, '#2a6ac8']]) { ringZ(m, x, 13.5, 24, 0.6, 1.6, 1, c); }
    for (const x of [2, 36]) { m.box(x, 22, 26, 2, 3, 2, '#8a5a3a'); m.box(x, 25, 26, 2, 2, 2, '#9a6a44'); m.set(x, 27, 26, '#8a5a3a'); m.set(x + 1, 27, 27, '#8a5a3a'); }
    stripedCanopy(m, 0, 39, 0, 30, 40, 36);
    m.box(1, 37, 29, 38, 8, 1, '#b8322a'); m.box(2, 38, 29, 36, 6, 1, CREAM);
    m.text('RING TOSS', 20, 38, 30, '#2a4a8a', { align: 'center' });
  },
});
defineProp('pie_table', {
  size: [32, 26, 20], collide: [2.0, 0.8, 1.2], cat: 'exterior',
  build(m) {
    const r = '#c83a3a', w = '#f4f0e8';
    for (let z = 5; z < 19; z++) for (let x = 0; x < 32; x++) m.set(x, 11, z, ((x >> 1) + (z >> 1)) % 2 ? w : r);
    for (let y = 5; y < 11; y++) for (let x = 0; x < 32; x++) { const c = ((x >> 1) + (y >> 1)) % 2 ? w : r; m.set(x, y, 18, c); m.set(x, y, 5, c); }
    for (let y = 5; y < 11; y++) for (let z = 5; z < 19; z++) { const c = ((z >> 1) + (y >> 1)) % 2 ? w : r; m.set(0, y, z, c); m.set(31, y, z, c); }
    for (const [x, z] of [[2, 7], [29, 7], [2, 16], [29, 16]]) m.box(x, 0, z, 1, 5, 1, '#6a4a2a');
    pie(m, 1, 12, 7, '#a02020'); pie(m, 8, 12, 11, '#3a2a5a'); pie(m, 15, 12, 7, '#d8b870'); pie(m, 22, 12, 11, '#c8742a', false); pie(m, 25, 12, 6, '#a02020');
    m.cylZ(19, 16, 14, 1.6, 1, '#2a4ac8'); m.box(18, 12, 14, 1, 3, 1, '#2a4ac8'); m.box(20, 12, 14, 1, 3, 1, '#2a4ac8'); m.set(19, 16, 15, GILT); // blue ribbon
    // sign on two posts behind
    m.box(1, 0, 1, 1, 25, 1, '#6a4a2a'); m.box(30, 0, 1, 1, 25, 1, '#6a4a2a');
    m.box(0, 13, 2, 32, 13, 1, '#6a4a2a'); m.box(1, 14, 2, 30, 11, 1, CREAM);
    m.text('PIE', 16, 20, 3, '#a82c24', { align: 'center' }); m.text('CONTEST', 16, 14, 3, '#2a4a8a', { align: 'center' });
  },
});
// Pleated red-white-blue half-fan bunting; back flush at z=0 (hang it on railings / podiums), 1.9 m x 0.94 m, hangs down from its top edge
defineProp('bunting_fan', {
  size: [30, 15, 2], origin: [15, 0, 0], cat: 'exterior',
  build(m) {
    const red = '#b8322a', blu = '#2a3a7a';
    for (let y = 0; y < 15; y++) for (let x = 0; x < 30; x++) {
      const dx = x + 0.5 - 15, dy = 15 - (y + 0.5), d = Math.hypot(dx, dy);
      if (d > 14.8) continue;
      if (d < 5) { m.set(x, y, 0, blu); continue; }
      const k = Math.floor(Math.atan2(dy, dx) / (Math.PI / 9));
      m.set(x, y, 0, k % 2 ? WHITE : red); if (k % 2 === 0) m.set(x, y, 1, red);
    }
    for (const [x, y] of [[12, 13], [15, 12], [18, 13], [14, 14], [16, 14]]) m.set(x, y, 1, WHITE);
    m.box(0, 14, 1, 30, 1, 1, blu);
  },
});
defineProp('podium_outdoor', {
  size: [16, 28, 14], collide: [1.0, 1.2, 0.8], cat: 'exterior',
  build(m) {
    const w = '#6a4226', w2 = '#553418';
    m.box(1, 0, 2, 14, 1, 11, w2); m.box(2, 1, 3, 12, 16, 9, w); m.box(3, 1, 11, 10, 15, 1, w2);
    for (let z = 2; z < 13; z++) m.box(1, 17 + Math.round((z - 2) * 0.25), z, 14, 1, 1, w);
    m.box(1, 17, 12, 14, 3, 1, w2);
    // small fan of bunting on the front
    for (let y = 6; y < 15; y++) for (let x = 2; x < 14; x++) {
      const dx = x + 0.5 - 8, dy = 15 - (y + 0.5), d = Math.hypot(dx, dy);
      if (d > 6.2) continue; const k = Math.floor(Math.atan2(dy, dx) / (Math.PI / 6));
      m.set(x, y, 12, d < 2.4 ? '#2a3a7a' : k % 2 ? WHITE : '#b8322a');
    }
    // microphone on a stem, papers, a glass of water
    m.box(7, 20, 11, 2, 1, 1, CHROME); m.box(8, 21, 11, 1, 4, 1, CHROME); m.box(7, 25, 10, 3, 3, 2, '#2a2a2a'); m.box(7, 25, 11, 3, 3, 1, CHROME); m.set(8, 26, 12, '#2a2a2a');
    m.box(3, 18, 4, 5, 1, 4, '#f0ece0'); m.set(11, 19, 5, '#c8dce4'); m.set(11, 20, 5, '#c8dce4');
  },
});
// Riveted copper time capsule: "1953" on the lid, "OPEN 2053" on the front
defineProp('time_capsule', {
  size: [20, 21, 14], collide: [1.25, 1.3, 0.9], cat: 'exterior',
  build(m) {
    const cu = '#b06a3a', cu2 = '#94552c', hi = '#e09a6a', ink = '#4a2a18', pat = '#5a9a8a';
    m.box(0, 0, 0, 20, 13, 14, cu); m.box(0, 0, 0, 20, 1, 14, cu2);
    m.box(0, 13, 0, 20, 1, 14, cu2); m.box(0, 14, 0, 20, 7, 14, cu); m.box(1, 20, 1, 18, 1, 12, cu2);
    for (let x = 1; x < 20; x += 3) { m.set(x, 12, 13, hi); m.set(x, 1, 13, hi); m.set(x, 15, 13, hi); m.set(x, 19, 13, hi); }
    for (let y = 2; y < 12; y += 3) { m.set(0, y, 13, hi); m.set(19, y, 13, hi); }
    m.text('1953', 10, 15, 13, ink, { align: 'center' });
    m.text('OPEN', 10, 7, 13, ink, { align: 'center' }); m.text('2053', 10, 2, 13, ink, { align: 'center' });
    for (const x of [0, 19]) { m.box(x, 8, 5, 1, 1, 4, BRASS); m.set(x, 7, 5, BRASS); m.set(x, 7, 8, BRASS); }
    m.box(0, 0, 0, 2, 2, 2, pat); m.box(18, 0, 12, 2, 2, 2, pat); m.box(9, 13, 13, 2, 2, 1, BRASS); // hasp
  },
});
// Music stand: the sheet faces +z (the player stands/sits on the +z side looking at it)
defineProp('music_stand', {
  size: [9, 20, 6], cat: 'exterior',
  build(m) {
    const k = '#2a2a2a';
    line(m, 4, 1, 2, 0, 0, 0, k, 1, false); line(m, 4, 1, 2, 8, 0, 0, k, 1, false); line(m, 4, 1, 2, 4, 0, 5, k, 1, false);
    m.box(4, 1, 2, 1, 12, 1, k);
    m.box(0, 13, 3, 9, 6, 1, k); m.box(0, 13, 4, 9, 1, 1, k);
    m.box(1, 14, 4, 7, 5, 1, '#f0ece0'); for (const y of [15, 17]) m.box(1, y, 4 + 1 - 1, 7, 1, 1, '#b8b4a8');
    m.set(2, 16, 4, k); m.set(5, 18, 4, k); m.set(6, 15, 4, k);
  },
});
// Wooden folding band chair, seat 0.44 m, sitter faces +z
defineProp('band_chair', {
  size: [8, 15, 8], collide: [0.45, 0.5, 0.45], cat: 'exterior',
  build(m) {
    const w = '#9a7040', d = '#7a5430';
    for (const x of [0, 7]) { line(m, x, 0, 1, x, 6, 7, d); line(m, x, 0, 7, x, 6, 1, d); m.box(x, 6, 0, 1, 9, 1, d); }
    for (const z of [1, 3, 5]) m.box(0, 6, z, 8, 1, 2, z === 3 ? d : w);
    m.box(0, 10, 0, 8, 2, 1, w); m.box(0, 13, 0, 8, 2, 1, w);
  },
});
defineProp('parade_drum', {
  size: [14, 18, 10], collide: [0.8, 1.1, 0.6], cat: 'exterior',
  build(m) {
    const shell = '#a82424', head = '#f0ead8', hoop = '#e0c060';
    for (const x of [2, 11]) { line(m, x, 0, 1, x, 5, 5, '#555555'); line(m, x, 0, 8, x, 5, 5, '#555555'); }
    m.cylZ(7, 11, 2, 6.3, 6, shell); m.cylZ(7, 11, 1, 5.6, 1, head); m.cylZ(7, 11, 8, 5.6, 1, head);
    ringZ(m, 7, 11, 1, 5.6, 6.8, 1, hoop); ringZ(m, 7, 11, 8, 5.6, 6.8, 1, hoop);
    m.text('JB', 7, 9, 9, '#2a3a7a', { align: 'center' }); m.textBack('JB', 7, 9, 0, '#2a3a7a', { align: 'center' });
    for (let z = 3; z < 8; z += 2) { m.set(0, 11, z, hoop); m.set(13, 11, z, hoop); }
  },
});
// Post with a sagging string of coloured bulbs running 4 m toward +x (chain posts 4 m apart). Origin at the post foot.
defineProp('string_lights_post', {
  size: [68, 50, 4], origin: [2, 0, 2], cat: 'exterior', collide: [0.2, 3, 0.2], light: lampLight(2.0, 2.6, 0, [1.0, 0.85, 0.6], 6, 'night'),
  build(m) {
    const p = '#6a5a44', cols = ['#e83a2a', '#f0c830', '#3ac04a', '#3a7ae8', '#f08a2a'];
    m.box(1, 0, 1, 2, 48, 2, p); m.box(0, 46, 1, 4, 1, 2, p); m.box(1, 0, 0, 2, 1, 4, '#555555');
    let prev = null;
    for (let x = 3; x < 68; x++) {
      const t = (x - 3) / 64, y = Math.round(46 - Math.sin(Math.PI * t) * 7);
      if (prev !== null && Math.abs(prev - y) > 1) m.box(x, Math.min(prev, y) + 1, 2, 1, Math.abs(prev - y) - 1, 1, '#333333');
      m.set(x, y, 2, '#333333'); prev = y;
      if ((x - 3) % 5 === 2) { m.set(x, y - 1, 2, glow(cols[((x - 3) / 5 | 0) % 5], 0.6)); m.set(x, y - 2, 2, glow(cols[((x - 3) / 5 | 0) % 5], 0.6)); }
    }
  },
});

// ================================================================ ANIMALS (origin at the feet, facing +z)
defineProp('dog', {
  size: [8, 13, 19], cat: 'exterior',
  build(m) {
    const c = A(0.5), dk = A(0.4), lt = A(0.6), k = '#1a1a1a';
    for (const [x, z] of [[1, 3], [5, 3], [1, 11], [5, 11]]) { m.box(x, 0, z, 2, 5, 2, c); m.box(x, 0, z, 2, 1, 2, dk); }
    rbox(m, 1, 4, 2, 6, 5, 12, c); m.box(2, 8, 3, 4, 1, 9, dk); m.box(2, 4, 5, 4, 1, 7, lt);
    m.box(2, 7, 12, 4, 4, 3, c);                                       // chest & neck
    m.box(2, 9, 14, 4, 4, 3, c); m.box(2, 12, 14, 4, 1, 3, dk);        // head
    m.box(3, 9, 17, 2, 2, 2, lt); m.box(3, 10, 18, 2, 1, 1, k);        // muzzle & nose
    m.set(2, 11, 16, k); m.set(5, 11, 16, k);                          // eyes
    m.box(1, 9, 14, 1, 3, 2, dk); m.box(6, 9, 14, 1, 3, 2, dk);        // floppy ears
    m.box(2, 8, 13, 4, 1, 1, '#b8322a'); m.set(4, 7, 14, GILT);        // collar & tag
    line(m, 4, 8, 2, 4, 10, 0, c); m.set(4, 11, 0, lt);                // tail
  },
});
defineProp('dog_small', {
  size: [6, 8, 12], cat: 'exterior',
  build(m) {
    const c = A(0.5), dk = A(0.4), lt = A(0.62), k = '#1a1a1a';
    for (const [x, z] of [[1, 2], [4, 2], [1, 7], [4, 7]]) m.box(x, 0, z, 1, 3, 1, dk);
    m.box(1, 2, 1, 4, 3, 8, c); m.box(1, 1, 2, 4, 1, 6, dk); m.box(1, 5, 2, 4, 1, 6, dk);
    m.box(1, 3, 8, 4, 4, 3, c); m.box(2, 3, 11, 2, 2, 1, lt); m.box(2, 2, 10, 2, 1, 2, lt); m.set(2, 4, 11, k); m.set(3, 4, 11, k);
    m.set(1, 6, 10, k); m.set(4, 6, 10, k); m.set(1, 7, 9, dk); m.set(4, 7, 9, dk);
    m.box(2, 5, 0, 1, 3, 1, c); m.box(1, 3, 7, 4, 1, 1, '#b8322a');
  },
});
defineProp('cat', {
  size: [4, 7, 11], cat: 'exterior',
  build(m) {
    const c = A(0.5), dk = A(0.4), lt = A(0.62);
    for (const [x, z] of [[0, 2], [3, 2], [0, 7], [3, 7]]) m.box(x, 0, z, 1, 3, 1, c);
    m.box(0, 3, 1, 4, 2, 8, c); m.box(1, 5, 2, 2, 1, 6, dk); m.box(1, 3, 3, 2, 1, 5, lt);
    m.box(0, 4, 8, 4, 3, 3, c); m.set(0, 7, 9, c); m.set(3, 7, 9, c);
    m.set(1, 5, 10, '#6ab04a'); m.set(2, 5, 10, '#6ab04a'); m.box(1, 4, 10, 2, 1, 1, lt); m.set(1, 4, 10, '#d88a8a');
    m.box(2, 5, 0, 1, 1, 1, c); m.box(2, 6, 0, 1, 1, 1, dk);
  },
});
defineProp('pigeon', {
  size: [3, 5, 6], cat: 'exterior',
  build(m) {
    const g = '#8a8e98', g2 = '#6a6e78';
    m.set(1, 0, 2, '#c87a7a'); m.set(1, 0, 3, '#c87a7a');
    m.box(0, 1, 1, 3, 2, 4, g); m.box(0, 2, 1, 3, 1, 3, g2); m.box(1, 1, 0, 1, 2, 1, '#4a4e58');
    m.box(0, 2, 4, 3, 2, 1, '#5a7a6a'); m.box(1, 4, 4, 1, 1, 1, g); m.box(1, 3, 5, 1, 1, 1, '#3a3a3a');
    m.set(0, 3, 3, '#8a6a9a'); m.set(2, 3, 3, '#8a6a9a');
  },
});
defineProp('seagull', {
  size: [5, 7, 9], cat: 'exterior',
  build(m) {
    const w = '#f2f0ea', g = '#9aa0a8', k = '#1e1e1e', y = '#e8c030';
    m.set(2, 0, 3, '#e8b050'); m.set(2, 0, 5, '#e8b050'); m.box(2, 1, 3, 1, 1, 3, '#e8b050');
    m.box(1, 2, 2, 3, 3, 5, w); m.box(0, 3, 1, 1, 2, 6, g); m.box(4, 3, 1, 1, 2, 6, g); m.box(1, 5, 2, 3, 1, 4, g);
    m.box(1, 3, 0, 3, 2, 2, k); m.box(2, 3, 0, 1, 1, 1, w);
    m.box(1, 4, 6, 3, 3, 2, w); m.box(2, 5, 8, 1, 1, 1, y); m.set(2, 4, 8, y); m.set(2, 4, 8, '#c8322a');
    m.set(1, 6, 7, k); m.set(3, 6, 7, k);
  },
});
// Gull in flight, wings spread (origin at the body centre bottom)
defineProp('seagull_flying', {
  size: [17, 4, 7], cat: 'exterior',
  build(m) {
    const w = '#f2f0ea', g = '#9aa0a8', k = '#1e1e1e';
    m.box(7, 1, 1, 3, 2, 5, w); m.box(8, 1, 6, 1, 1, 1, '#e8c030'); m.box(8, 3, 4, 1, 1, 2, w);
    m.box(1, 2, 2, 6, 1, 3, g); m.box(10, 2, 2, 6, 1, 3, g); m.box(0, 3, 2, 2, 1, 2, k); m.box(15, 3, 2, 2, 1, 2, k);
    m.box(4, 3, 2, 3, 1, 2, g); m.box(10, 3, 2, 3, 1, 2, g); m.box(7, 1, 0, 3, 1, 1, w);
  },
});
defineProp('duck', {
  size: [4, 6, 8], cat: 'exterior',
  build(m) {
    m.set(1, 0, 3, '#e87a2a'); m.set(2, 0, 3, '#e87a2a');
    m.box(0, 1, 1, 4, 3, 5, '#9a9a92'); m.box(0, 3, 1, 4, 1, 4, '#8a7a6a'); m.box(1, 2, 0, 2, 2, 1, '#1e1e1e'); m.set(1, 3, 0, '#f0f0f0');
    m.box(0, 2, 5, 4, 2, 1, '#6a3a2a'); m.box(1, 4, 5, 2, 1, 1, '#f0f0e8');
    m.box(1, 5, 5, 2, 1, 2, '#2a6a3a'); m.box(1, 4, 6, 2, 1, 1, '#2a6a3a'); m.box(1, 4, 7, 2, 1, 1, '#e8c030');
    m.set(0, 3, 3, '#3a5aa8'); m.set(3, 3, 3, '#3a5aa8');
  },
});
defineProp('squirrel', {
  size: [3, 7, 8], cat: 'exterior',
  build(m) {
    const g = '#8a8580', g2 = '#a8a29a', lt = '#d8d0c4';
    m.box(0, 0, 4, 1, 1, 2, g); m.box(2, 0, 4, 1, 1, 2, g);
    m.box(0, 1, 4, 3, 3, 3, g); m.box(1, 1, 6, 1, 2, 1, lt);
    m.box(0, 4, 5, 3, 2, 2, g); m.box(1, 4, 7, 1, 1, 1, g); m.set(0, 5, 6, '#1e1e1e'); m.set(2, 5, 6, '#1e1e1e'); m.set(0, 6, 5, g); m.set(2, 6, 5, g);
    m.box(1, 2, 7, 1, 1, 1, '#8a5a2a'); // acorn
    m.box(1, 1, 2, 1, 2, 2, g2); m.box(1, 3, 1, 1, 3, 2, g2); m.box(1, 5, 2, 1, 2, 2, g2); m.set(1, 6, 3, lt); m.set(1, 1, 3, g);
  },
});
function horseBody(m) {
  const c = A(0.5), dk = A(0.42), mane = A(0.28), hoof = '#2a2622';
  for (const [x, z] of [[1, 6], [7, 6], [1, 30], [7, 30]]) { m.box(x, 0, z, 2, 13, 2, c); m.box(x, 0, z, 2, 1, 2, hoof); m.box(x, 4, z, 2, 1, 2, dk); }
  rbox(m, 0, 12, 4, 10, 10, 29, c); m.box(1, 12, 6, 8, 1, 25, dk);
  // neck rising forward, head
  for (let k = 0; k < 7; k++) m.box(2, 18 + k, 29 + k, 6, 5, 3, c);
  for (let k = 0; k < 7; k++) m.box(4, 22 + k, 28 + k, 2, 1, 2, mane);
  m.box(2, 23, 34, 6, 5, 4, c); m.box(3, 21, 37, 4, 5, 3, c); m.box(3, 21, 39, 4, 3, 1, dk);
  m.set(3, 22, 40 - 1, '#1e1e1e'); m.set(6, 22, 39, '#1e1e1e');
  m.set(2, 25, 36, '#1e1e1e'); m.set(7, 25, 36, '#1e1e1e');
  m.box(3, 28, 34, 1, 2, 1, c); m.box(6, 28, 34, 1, 2, 1, c);
  // tail
  m.box(4, 12, 1, 2, 9, 3, mane); m.box(4, 19, 3, 2, 2, 1, mane);
  // bridle
  m.box(2, 23, 38, 6, 1, 1, '#3a2a1e'); m.box(2, 23, 34, 1, 4, 1, '#3a2a1e'); m.box(7, 23, 34, 1, 4, 1, '#3a2a1e');
}
// Horse ~2.5 m long, withers 1.6 m, coat = tint A (mane/tail a darker shade). With a work collar (ice wagon / milk horse).
defineProp('horse', {
  size: [10, 30, 41], cat: 'exterior',
  build(m) { horseBody(m); for (let k = 0; k < 3; k++) m.box(1, 17 + k * 2, 30 + k, 8, 2, 2, '#5a3a24'); m.box(1, 22, 32, 1, 1, 1, BRASS); m.box(8, 22, 32, 1, 1, 1, BRASS); },
});
// Police horse with saddle and blue saddle-cloth
defineProp('horse_police', {
  size: [10, 30, 41], cat: 'exterior',
  build(m) {
    horseBody(m);
    m.box(0, 16, 12, 10, 7, 11, '#2a3a6a'); m.box(0, 16, 12, 10, 1, 11, GILT);
    m.box(1, 22, 13, 8, 2, 9, '#3a2a1e'); m.box(2, 24, 13, 6, 1, 2, '#3a2a1e'); m.box(2, 23, 21, 6, 2, 1, '#3a2a1e');
    m.box(0, 12, 17, 1, 5, 1, '#555555'); m.box(9, 12, 17, 1, 5, 1, '#555555'); m.box(0, 11, 17, 1, 1, 2, CHROME); m.box(9, 11, 17, 1, 1, 2, CHROME);
  },
});
