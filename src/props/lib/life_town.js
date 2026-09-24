// Props for street life downtown & on the waterfront (life_town). Conventions as docs/PROPS.md:
// 1 voxel = 1/16 m unless `scale` says otherwise, origin bottom centre, the front faces +z.
// Names are prefixed town_ (or are unmistakably ours, like organ_monkey) to stay unique repo-wide.
import { defineProp } from '../props.js';
import { layoutText } from '../../world/font.js';

// ---------------------------------------------------------------- palette & helpers
const WOOD = '#a07a4a', WOOD_D = '#6a4a2a', WOOD_L = '#c8a070', IRON = '#2a2a2c', CHROME = '#cfd3d0', STEEL = '#9aa4a8', STEEL_D = '#6e777c';
const WHITE = '#eeeae0', CREAM = '#ece4cc', BLACK = '#1c1c1e', GLASS = '#a8c4cc', TYRE = '#222224', GOLD = '#c9a24a', RED = '#b3302a', NAVY = '#233254';
const SAND = '#d8c088', SAND_D = '#b89a66', SAND_L = '#e6d2a0';
const A = (s = 0.5) => ({ tint: 1, shade: s });
const B = (s = 0.5) => ({ tint: 2, shade: s });

function line(m, x0, y0, z0, x1, y1, z1, col, t = 1) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0))));
  const o = (t - 1) / 2;
  let px = null, py = 0, pz = 0;
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = Math.round(x0 + (x1 - x0) * k - o), y = Math.round(y0 + (y1 - y0) * k - o), z = Math.round(z0 + (z1 - z0) * k - o);
    if (px !== null) { if (x !== px) m.box(x, py, pz, t, t, t, col); if (z !== pz) m.box(x, py, z, t, t, t, col); }
    m.box(x, y, z, t, t, t, col); px = x; py = y; pz = z;
  }
}
function ell(m, cx, cy, cz, rx, ry, rz, col, keep = null) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
    if (dx * dx + dy * dy + dz * dz <= 1 && (!keep || keep(x, y, z))) m.set(x, y, z, col);
  }
}
// ring in the y-z plane at x (a wheel seen from the side), thickness w along x
function ringX(m, x, cy, cz, r0, r1, w, col) {
  for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++) for (let z = Math.floor(cz - r1); z <= Math.ceil(cz + r1); z++) {
    const d = Math.hypot(y + 0.5 - cy, z + 0.5 - cz);
    if (d <= r1 && d >= r0) m.box(x, y, z, w, 1, 1, col);
  }
}
function wheel(m, x, cy, cz, r, w, rim = CHROME, tyre = TYRE) {
  ringX(m, x, cy, cz, 0, r, w, tyre);
  ringX(m, x, cy, cz, 0, r * 0.5, w + (x > 8 ? 0 : 0), rim);
}
// text along a z-running side face: x = the face plane; reads toward +z (flip: toward -z, for the +x side)
function sideText(m, str, x, y, zc, col, flip = false, scale = 1) {
  const L = layoutText(str, 'small');
  const z0 = flip ? Math.round(zc + L.width * scale / 2) : Math.round(zc - L.width * scale / 2);
  for (const p of L.pixels) m.box(x, y + p.y * scale, flip ? z0 - (p.x + 1) * scale : z0 + p.x * scale, 1, scale, scale, col);
}
// crate with plank shading
function crate(m, x, y, z, w, h, d, col, dark) {
  m.box(x, y, z, w, h, d, col);
  for (let yy = y + 2; yy < y + h; yy += 3) { m.box(x, yy, z, w, 1, 1, dark); m.box(x, yy, z + d - 1, w, 1, 1, dark); }
}

// ================================================================= the organ grinder
// Capuchin monkey in a red fez and waistcoat, sitting up with a tin cup (1/32 m voxels, ~0.5 m).
defineProp('organ_monkey', {
  size: [16, 18, 16], scale: 1 / 32, cat: 'exterior',
  build(m) {
    const fur = '#5a3a22', fur2 = '#48301c', face = '#d8b08a', vest = '#b3302a';
    // tail curling up behind
    line(m, 8, 2, 3, 12, 1, 1, fur2); line(m, 12, 1, 1, 14, 4, 1, fur2); line(m, 14, 4, 1, 13, 7, 2, fur2); m.set(12, 7, 3, fur2);
    // haunches & feet
    ell(m, 5.5, 2, 7.5, 2.2, 2, 3.2, fur); ell(m, 10.5, 2, 7.5, 2.2, 2, 3.2, fur);
    m.box(4, 0, 10, 2, 1, 2, face); m.box(10, 0, 10, 2, 1, 2, face);
    // body with the waistcoat
    ell(m, 8, 6, 6.5, 3.4, 4, 2.8, fur);
    ell(m, 8, 6.5, 6.6, 3.6, 3.2, 3.0, vest, (x, y, z) => z >= 6 && y >= 4 && y <= 8);
    m.box(7, 4, 9, 2, 5, 1, fur); m.set(7, 7, 9, GOLD); m.set(8, 5, 9, GOLD);
    m.box(4, 4, 7, 1, 5, 1, GOLD); m.box(11, 4, 7, 1, 5, 1, GOLD);
    // arms reaching forward to the cup
    line(m, 4, 8, 7, 5, 5, 11, fur); line(m, 12, 8, 7, 11, 5, 11, fur);
    m.cyl(8, 3, 12, 2, 4, STEEL); m.cyl(8, 4, 12, 1.2, 3, STEEL_D); m.set(8, 6, 12, '#d9b24a');
    m.set(5, 5, 11, face); m.set(11, 5, 11, face);
    // head
    ell(m, 8, 12, 7, 3.2, 3, 3, fur);
    ell(m, 8, 11.5, 9.2, 2.2, 2, 1.2, face);
    m.set(7, 12, 10, BLACK); m.set(9, 12, 10, BLACK); m.set(8, 11, 10, '#3a2418'); m.box(7, 10, 10, 3, 1, 1, '#8a5a3a');
    m.box(4, 11, 7, 1, 2, 2, face); m.box(11, 11, 7, 1, 2, 2, face);
    // fez with a gold tassel
    m.cyl(8, 14, 7, 2.1, 3, vest); m.cyl(8, 17, 7, 1.6, 1, '#8a1a1a');
    line(m, 8, 17, 7, 10, 15, 8, GOLD); m.set(10, 14, 8, GOLD);
  },
});
// Street organ on a two-wheeled cart with a pole leg: painted case, crank on the operator's right (-x),
// push handles behind (-z). The painted front faces the audience (+z).
defineProp('barrel_organ', {
  size: [18, 22, 14], cat: 'exterior',
  build(m) {
    const case1 = '#6a2a1e', case2 = '#8a3a26', gilt = GOLD;
    // cart: wheels, axle, pole leg
    for (const x of [1, 16]) { ringX(m, x, 3.5, 7, 2.6, 3.6, 1, '#3a2a1a'); line(m, x, 0.5, 7, x, 6.5, 7, '#5a4028'); line(m, x, 3.5, 4, x, 3.5, 10, '#5a4028'); m.set(x, 3, 6, gilt); }
    m.box(1, 3, 6, 16, 1, 1, IRON);
    m.box(8, 0, 11, 2, 7, 1, WOOD_D);
    // case
    m.box(2, 7, 3, 14, 10, 9, case1);
    m.box(2, 7, 11, 14, 10, 1, case2);
    m.box(2, 17, 2, 14, 1, 11, WOOD_D); m.box(3, 18, 3, 12, 1, 9, case1);
    m.box(2, 7, 11, 14, 1, 1, gilt); m.box(2, 16, 11, 14, 1, 1, gilt); m.box(2, 7, 11, 1, 10, 1, gilt); m.box(15, 7, 11, 1, 10, 1, gilt);
    // the painted panel on the front: a bay with a sail and a sun
    m.box(4, 9, 12, 10, 6, 1, '#8ab4d0'); m.box(4, 9, 12, 10, 2, 1, '#2a5a7a'); m.box(11, 13, 12, 2, 1, 1, '#e8c040');
    m.box(6, 11, 12, 1, 3, 1, WHITE); m.box(7, 11, 12, 1, 2, 1, WHITE); m.box(5, 10, 12, 4, 1, 1, '#5a3a22');
    // pipes peeking through a fretwork window on top
    for (let x = 4; x < 14; x += 2) m.box(x, 18, 11, 1, 2 + ((x >> 1) % 3), 1, '#c8a060');
    // crank on the operator's right
    m.box(1, 12, 6, 1, 1, 1, IRON); m.box(0, 12, 6, 1, 1, 1, IRON); m.box(0, 12, 7, 1, 3, 1, IRON); m.box(0, 14, 7, 1, 1, 2, '#d8c8a8');
    // push handles
    line(m, 3, 12, 3, 3, 13, 0, WOOD_D); line(m, 14, 12, 3, 14, 13, 0, WOOD_D);
  },
});

// ================================================================= the beach
defineProp('town_sandcastle', {
  size: [20, 13, 20], cat: 'exterior',
  build(m) {
    // wet moat ring
    for (let z = 0; z < 20; z++) for (let x = 0; x < 20; x++) { const d = Math.hypot(x + 0.5 - 10, z + 0.5 - 10); if (d > 7.6 && d < 9.6) m.set(x, 0, z, SAND_D); }
    // mound, keep, curtain walls
    m.box(4, 0, 4, 12, 3, 12, SAND); m.box(5, 3, 5, 10, 2, 10, SAND);
    m.box(7, 5, 7, 6, 4, 6, SAND_L);
    for (let x = 7; x < 13; x += 2) { m.set(x, 9, 7, SAND_L); m.set(x, 9, 12, SAND_L); }
    for (let z = 9; z < 12; z += 2) { m.set(7, 9, z, SAND_L); m.set(12, 9, z, SAND_L); }
    // corner towers (pail-moulded, with ridges)
    for (const [x, z] of [[5, 5], [15, 5], [5, 15], [15, 15]]) {
      m.cyl(x, 3, z, 1.8, 5, SAND); m.cyl(x, 5, z, 1.9, 1, SAND_D); m.cyl(x, 8, z, 1.3, 1, SAND_L);
    }
    // gate & a bridge over the moat, shells, a paper flag
    m.box(9, 5, 13, 2, 2, 1, '#8a7048'); m.box(9, 0, 15, 2, 1, 4, SAND_L);
    for (const [x, z] of [[4, 11], [16, 8], [11, 3]]) m.set(x, 3, z, '#f4ece4');
    line(m, 10, 9, 10, 10, 12, 10, '#e8e0d0'); m.box(11, 11, 10, 2, 1, 1, RED); m.set(11, 10, 10, RED);
  },
});
defineProp('town_sandcastle_small', {
  size: [14, 9, 14], cat: 'exterior',
  build(m) {
    for (let z = 0; z < 14; z++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x + 0.5 - 7, z + 0.5 - 7); if (d > 5 && d < 6.6) m.set(x, 0, z, SAND_D); }
    m.box(3, 0, 3, 8, 2, 8, SAND);
    m.cyl(5, 2, 5, 1.7, 4, SAND_L); m.cyl(9, 2, 6, 1.7, 5, SAND); m.cyl(6, 2, 9, 1.7, 3, SAND_L);
    m.cyl(9, 7, 6, 1.1, 1, SAND_D);
    // dribble-castle drips
    for (const [x, y, z] of [[9, 8, 6], [5, 6, 5], [6, 5, 9]]) m.set(x, y, z, SAND_D);
    m.set(3, 2, 10, '#f4ece4');
  },
});
// tin pail and spade (1/32)
defineProp('town_sand_pail', {
  size: [18, 12, 14], scale: 1 / 32, cat: 'exterior',
  build(m) {
    m.cyl(6, 0, 7, 4.2, 9, A(0.5)); m.cyl(6, 1, 7, 3.2, 9, 0); m.cyl(6, 1, 7, 3.2, 5, SAND);
    m.cyl(6, 8, 7, 4.4, 1, A(0.62));
    line(m, 2, 9, 7, 6, 11, 7, STEEL_D); line(m, 6, 11, 7, 10, 9, 7, STEEL_D);
    // the spade lying beside
    line(m, 11, 0, 2, 16, 0, 9, '#e0b030'); m.box(14, 0, 9, 4, 1, 4, '#e0b030'); m.box(15, 0, 12, 2, 1, 1, '#c89a20');
  },
});
// galvanised bucket with a couple of green crabs clinging to the rim and a hand line (1/32)
defineProp('town_crab_bucket', {
  size: [16, 12, 16], scale: 1 / 32, cat: 'exterior',
  build(m) {
    m.cyl(8, 0, 8, 5, 9, STEEL); m.cyl(8, 1, 8, 4, 9, 0); m.cyl(8, 1, 8, 4, 6, '#2a4a4a');
    m.cyl(8, 8, 8, 5.2, 1, '#b8c0c4');
    const crab = '#4a5a2a', claw = '#b0502a';
    for (const [x, z, s] of [[3, 7, -1], [12, 10, 1]]) { m.box(x, 8, z, 2, 1, 2, crab); m.set(x + (s > 0 ? 2 : -1), 8, z, claw); m.set(x + (s > 0 ? 2 : -1), 8, z + 1, claw); m.set(x, 9, z, BLACK); }
    m.box(6, 6, 7, 3, 1, 2, crab); m.set(9, 6, 8, claw);
    line(m, 13, 0, 3, 15, 0, 13, '#d8c8a0');
  },
});
// A kite high on its string: the origin is the flyer's hand; the string climbs 11 m forward and up (1/8 m voxels).
defineProp('town_kite', {
  size: [10, 104, 84], scale: 1 / 8, origin: [5, 0, 0], cat: 'far',
  build(m) {
    // string with a gentle sag
    let px = 5, py = 0, pz = 0;
    for (let i = 1; i <= 40; i++) { const k = i / 40, x = 5, y = Math.round(92 * k - 10 * Math.sin(k * Math.PI)), z = Math.round(74 * k); line(m, px, py, pz, x, y, z, '#e8e4d8'); px = x; py = y; pz = z; }
    // diamond kite facing the flyer
    for (let y = -6; y <= 6; y++) { const w = 4 - Math.abs(y) * (y > 0 ? 0.66 : 0.66); for (let x = -Math.round(w); x <= Math.round(w); x++) m.set(5 + x, 94 + y, 76, (x < 0) === (y > 0) ? A(0.5) : B(0.5)); }
    line(m, 5, 88, 76, 5, 100, 76, WOOD_D); line(m, 1, 96, 76, 9, 96, 76, WOOD_D);
    // tail with bows
    for (let i = 0; i < 12; i++) { m.set(5 + Math.round(Math.sin(i * 0.8) * 1.5), 87 - i * 2, 77 + (i >> 2), '#e8e4d8'); if (i % 3 === 1) m.box(4 + Math.round(Math.sin(i * 0.8) * 1.5), 87 - i * 2, 77 + (i >> 2), 3, 1, 1, i % 2 ? RED : '#e8c030'); }
  },
});

// ================================================================= shop fronts
// Tiered sidewalk fruit & vegetable stand: bushels of Macs and Cortlands, pumpkins, squash, pears, grapes.
defineProp('town_fruit_stand', {
  size: [30, 18, 16], collide: [1.8, 1.0, 1.0], cat: 'exterior',
  build(m) {
    const green = '#3a5a3a', top = '#a07a4a';
    m.box(0, 0, 10, 30, 4, 6, green); m.box(0, 4, 10, 30, 1, 6, top);
    m.box(0, 0, 5, 30, 8, 5, green); m.box(0, 8, 5, 30, 1, 5, top);
    m.box(0, 0, 0, 30, 12, 5, green); m.box(0, 12, 0, 30, 1, 5, top);
    const basket = '#b89060', bdark = '#8a6a40';
    const fills = [['#b8282a', '#d84a3a'], ['#7aa83a', '#9ac05a'], ['#c8b040', '#e0c860'], ['#5a2a6a', '#7a4a8a'], ['#8a5a32', '#a8784a'], ['#b8282a', '#e0d0a0']];
    const tiers = [[5, 13], [9, 7.5], [13, 2.5]];
    tiers.forEach(([y, z], t) => {
      for (let i = 0; i < 5; i++) {
        const cx = 3.5 + i * 5.8, f = fills[(i + t * 2) % fills.length];
        if (t === 0 && i === 2) { // pumpkins on the low tier
          ell(m, cx, y + 2, z, 2.8, 2.2, 2.4, '#d8702a'); m.box(Math.floor(cx), y + 4, Math.floor(z), 1, 1, 1, '#4a5a2a'); continue;
        }
        m.cyl(cx, y, z, 2.4, 2, basket); m.cyl(cx, y + 1, z, 2.5, 1, bdark);
        ell(m, cx, y + 2.2, z, 2.2, 1.2, 2.2, f[0]);
        m.set(Math.floor(cx) - 1, y + 3, Math.floor(z), f[1]); m.set(Math.floor(cx) + 1, y + 3, Math.floor(z) - 1, f[1]);
      }
    });
    // price cards on sticks
    for (let i = 0; i < 5; i += 2) { m.box(2 + i * 6, 5, 15, 3, 2, 1, WHITE); m.set(3 + i * 6, 6, 16, BLACK); }
  },
});
// A-frame chalkboard (1/48 m voxels): a few lines of chalk, up to 7 characters each.
function chalkboard(name, lines, o = {}) {
  defineProp(name, {
    size: [36, 52, 16], scale: 1 / 48, collide: [0.7, 1.05, 0.3], cat: 'exterior',
    build(m) {
      const frame = o.frame || '#6a4a2a', slate = '#2a322e', chalk = '#e8e8dc';
      line(m, 3, 48, 9, 3, 0, 1, frame, 2); line(m, 31, 48, 9, 31, 0, 1, frame, 2);
      m.box(1, 4, 10, 34, 46, 2, frame); m.box(3, 6, 12, 30, 42, 1, slate);
      m.box(1, 0, 10, 3, 4, 2, frame); m.box(32, 0, 10, 3, 4, 2, frame);
      const cols = o.cols || [];
      lines.forEach((s, i) => m.text(s, 18, 40 - i * 8, 13, cols[i] || chalk, { align: 'center' }));
      // a chalk box on the ledge
      m.box(4, 6, 13, 28, 1, 2, frame); m.box(8, 7, 13, 2, 1, 1, chalk); m.box(12, 7, 13, 1, 1, 1, '#e8b0b0');
    },
  });
}
chalkboard('town_chalkboard_diner', ['TODAY', 'CHOWDER', '25¢', 'PIE 15¢', 'COFFEE'], { cols: ['#f0e0a0', null, '#f0e0a0', '#f0c0c0'] });
chalkboard('town_chalkboard_lunch', ['BLUE', 'PLATE', '65¢', 'HASH', '& EGGS'], { cols: ['#a8c8f0', '#a8c8f0', '#f0e0a0'] });
chalkboard('town_chalkboard_fish', ['FRESH', 'HADDOCK', '29¢ LB', 'COD 25¢', 'CLAMS'], { cols: ['#f0e0a0', null, '#f0c0c0'] });
chalkboard('town_chalkboard_meat', ['RUSSO', 'SAUSAGE', '49¢ LB', 'CHUCK', '39¢ LB'], { cols: ['#f0c0c0'] });
chalkboard('town_chalkboard_series', ['SERIES', 'POOL', '50¢', 'NYY VS', 'BKN'], { cols: ['#f0e0a0', '#f0e0a0', '#f0c0c0'] });
chalkboard('town_chalkboard_soda', ['LIME', 'RICKEY', '10¢', 'MALTED', '20¢'], { cols: ['#b0f0b0', '#b0f0b0', '#f0e0a0', null, '#f0e0a0'] });

// trestle table for a sidewalk sale (1/32): towels, pots, glass, toys, and a hand-lettered apron
defineProp('town_sale_table', {
  size: [62, 34, 26], scale: 1 / 32, collide: [1.9, 0.8, 0.8], cat: 'exterior',
  build(m) {
    for (const x of [5, 55]) { line(m, x - 3, 0, 4, x + 3, 22, 22, WOOD_D); line(m, x + 3, 0, 4, x - 3, 22, 22, WOOD_D); line(m, x - 3, 0, 22, x + 3, 22, 4, WOOD_D); }
    m.box(0, 22, 2, 62, 2, 22, '#e8e0c8');
    for (let z = 3; z < 24; z += 5) m.box(0, 23, z, 62, 1, 2, '#c84a4a');
    m.box(0, 12, 23, 62, 10, 1, '#f4efe2'); m.box(0, 12, 23, 62, 1, 1, '#c84a4a'); m.box(0, 21, 23, 62, 1, 1, '#c84a4a');
    m.text('SIDEWALK SALE', 31, 14, 24, '#b02a2a', { align: 'center' });
    // goods
    const towels = ['#e8b0b0', '#a8c8e8', '#f0e0a0', '#b8d8b0'];
    towels.forEach((c, i) => m.box(3 + i * 6, 24, 5, 5, 3 + (i % 2), 7, c));
    for (let i = 0; i < 3; i++) { m.cyl(30 + i * 7, 24, 8, 2.8, 4, STEEL); m.cyl(30 + i * 7, 28, 8, 3.1, 1, STEEL_D); }
    for (let i = 0; i < 5; i++) m.cyl(29 + i * 4, 24, 17, 1.2, 4, '#b8d8e0');
    m.box(50, 24, 5, 8, 2, 4, '#c8702a'); m.box(51, 26, 6, 5, 1, 2, '#e8e4d8'); m.box(53, 27, 6, 1, 3, 1, WOOD_D);
    m.box(4, 24, 15, 10, 1, 6, '#2a5a8a'); m.box(5, 25, 16, 8, 1, 4, '#3a7ab0');
    for (let i = 0; i < 4; i++) m.box(48 + (i % 2) * 5, 24, 13 + (i >> 1) * 5, 3, 2, 3, ['#b3302a', '#23346a', '#e0c040', '#3a8a4a'][i]);
  },
});
// hardware store sidewalk display: rakes in a rack, galvanised pails, bushel baskets, brooms
defineProp('town_hardware_display', {
  size: [26, 30, 12], collide: [1.6, 1.5, 0.7], cat: 'exterior',
  build(m) {
    m.box(1, 0, 1, 12, 1, 8, WOOD_D); m.box(1, 8, 1, 12, 1, 1, WOOD_D); m.box(1, 0, 1, 1, 9, 1, WOOD_D); m.box(12, 0, 1, 1, 9, 1, WOOD_D);
    for (let i = 0; i < 4; i++) {
      const x = 2.5 + i * 3;
      line(m, x, 1, 5, x, 22, 2, WOOD_L);
      for (let k = -2; k <= 2; k++) line(m, x, 22, 2, x + k * 0.6, 27, 1 + Math.abs(k) * 0.3, STEEL_D);
    }
    // brooms
    for (const x of [11, 12]) { line(m, x, 4, 7, x, 26, 5, '#d8b070'); }
    m.box(10, 0, 6, 4, 4, 3, '#c8a050'); m.box(10, 1, 6, 4, 1, 3, RED);
    // nested pails
    for (let i = 0; i < 3; i++) { m.cyl(19, i * 3, 5, 3.4 - i * 0.2, 4, STEEL); m.cyl(19, i * 3 + 3, 5, 3.6 - i * 0.2, 1, '#b8c0c4'); }
    m.cyl(19, 10, 5, 2.5, 1, STEEL_D);
    // bushel of bulbs, and a price card
    m.cyl(20, 0, 10, 2.2, 3, '#b89060'); ell(m, 20, 3, 10, 2, 1, 1.6, '#c8a878');
    m.box(15, 0, 11, 4, 3, 1, WHITE); m.box(16, 1, 11, 2, 1, 1, RED);
  },
});
// sidewalk bargain cart of used books (1/32)
defineProp('town_book_cart', {
  size: [46, 36, 22], scale: 1 / 32, collide: [1.4, 1.0, 0.7], cat: 'exterior',
  build(m) {
    for (const x of [1, 44]) { ringX(m, x, 5, 11, 3, 4.5, 1, '#2a2a2a'); m.set(x, 5, 11, GOLD); }
    for (const [x, z] of [[4, 3], [41, 3], [4, 18], [41, 18]]) m.box(x, 0, z, 2, 18, 2, WOOD_D);
    m.box(3, 16, 2, 40, 2, 18, WOOD_D);
    // a V trough of books, spines up
    const spines = ['#8a2a2a', '#2a4a6a', '#3a5a3a', '#c8a050', '#5a3a5a', '#e0d8c0', '#6a3a1e', '#2a2a2a', '#8a6a3a', '#4a6a8a'];
    for (let x = 4; x < 42; x++) { const c = spines[(x * 7 + (x >> 2)) % spines.length]; m.box(x, 18, 4, 1, 5 + ((x * 5) % 3), 6, c); m.box(x, 18, 12, 1, 4 + ((x * 3) % 3), 6, spines[(x * 3 + 1) % spines.length]); }
    m.box(3, 18, 10, 40, 5, 2, WOOD); m.box(3, 18, 2, 40, 3, 1, WOOD); m.box(3, 18, 19, 40, 3, 1, WOOD);
    // sign on a post
    m.box(22, 18, 20, 2, 12, 1, WOOD_D); m.box(5, 26, 21, 36, 9, 1, CREAM); m.box(5, 26, 21, 36, 1, 1, '#2a4a33'); m.box(5, 34, 21, 36, 1, 1, '#2a4a33');
    m.text('BOOKS 10¢', 23, 28, 21, '#2a4a33', { align: 'center' });
  },
});
// a flat card table with Centennial programs and a sign, for the Boy Scouts (1/32)
defineProp('town_program_table', {
  size: [36, 34, 24], scale: 1 / 32, collide: [1.1, 0.8, 0.75], cat: 'exterior',
  build(m) {
    for (const [x, z] of [[2, 2], [32, 2], [2, 20], [32, 20]]) m.box(x, 0, z, 2, 22, 2, '#3a3a3e');
    m.box(0, 22, 0, 36, 1, 24, '#2a4a33');
    for (let i = 0; i < 4; i++) { m.box(3 + i * 8, 23, 4, 6, 2 + (i % 2), 8, '#f0e8d0'); m.box(3 + i * 8, 25 + (i % 2), 4, 6, 1, 8, i % 2 ? '#23346a' : '#b3302a'); m.box(4 + i * 8, 26 + (i % 2), 6, 4, 1, 1, GOLD); }
    m.cyl(28, 23, 18, 2.2, 5, '#b8d8e0'); m.cyl(28, 23, 18, 1.8, 2, '#8a8a70');
    m.box(4, 23, 18, 18, 11, 1, CREAM); m.box(4, 23, 18, 18, 1, 1, '#b3302a');
    m.text('PROGRAMS', 13, 29, 19, '#23346a', { align: 'center' }); m.text('25¢', 13, 24, 19, '#b3302a', { align: 'center' });
  },
});

// ================================================================= vendors
// peanut wagon (1/24): red wagon, glass case of hot peanuts, copper roaster with a steam whistle
defineProp('town_peanut_wagon', {
  size: [30, 40, 34], scale: 1 / 24, collide: [1.2, 1.4, 1.3], cat: 'exterior',
  build(m) {
    const red = '#a8261e', copper = '#b8703a';
    for (const x of [0, 28]) { ringX(m, x, 6, 16, 4.5, 6, 2, '#2a2a2a'); line(m, x, 1, 16, x, 11, 16, GOLD); line(m, x, 6, 11, x, 6, 21, GOLD); }
    m.box(2, 6, 15, 26, 1, 2, IRON);
    m.box(2, 8, 5, 26, 11, 24, red); m.box(2, 8, 5, 26, 1, 24, GOLD); m.box(2, 18, 5, 26, 1, 24, GOLD);
    m.box(1, 10, 29, 28, 7, 1, CREAM); m.text('PEANUTS', 15, 11, 30, red, { align: 'center' });
    // glass case with peanuts
    m.box(4, 19, 16, 22, 9, 12, GLASS); m.box(5, 19, 17, 20, 3, 10, '#b08050'); m.box(4, 28, 16, 22, 1, 12, red);
    // roaster & stack
    m.cyl(15, 19, 10, 5, 8, copper); m.cyl(15, 27, 10, 5.3, 1, '#8a4a22'); m.cyl(15, 28, 10, 1.4, 8, IRON); m.cyl(15, 36, 10, 1.8, 1, GOLD); m.box(15, 37, 10, 1, 2, 1, GOLD);
    // push handles
    line(m, 5, 14, 5, 5, 16, 0, WOOD_D); line(m, 25, 14, 5, 25, 16, 0, WOOD_D); m.box(5, 16, 0, 21, 1, 1, WOOD_D);
    m.box(13, 0, 25, 3, 8, 3, IRON);
  },
});
// soft pretzels on a pegged pole over a wicker basket
defineProp('town_pretzel_stand', {
  size: [14, 30, 14], collide: [0.7, 1.8, 0.7], cat: 'exterior',
  build(m) {
    m.cyl(7, 0, 7, 5, 4, '#b89060'); m.cyl(7, 3, 7, 5.3, 1, '#8a6a40'); ell(m, 7, 4, 7, 4, 1.5, 4, '#b8783a');
    m.box(6, 4, 6, 2, 24, 2, WOOD_D);
    const brown = '#a8642a';
    for (let k = 0; k < 4; k++) {
      const y = 12 + k * 4, a = k * Math.PI / 2 + 0.4, dx = Math.round(Math.sin(a) * 4), dz = Math.round(Math.cos(a) * 4);
      line(m, 7, y + 2, 7, 7 + dx, y + 2, 7 + dz, WOOD);
      const px = 7 + dx, pz = 7 + dz;
      for (const [ox, oy] of [[-1, 0], [1, 0], [-1, -1], [1, -1], [0, -2], [-2, -1], [2, -1]]) m.set(px + ox, y + oy, pz, brown);
      m.set(px, y - 1, pz, '#f0ece0');
    }
    m.box(6, 28, 6, 2, 1, 2, GOLD);
  },
});
// flower seller's cart: galvanised buckets of mums and asters under a striped canopy
defineProp('town_flower_cart', {
  size: [30, 30, 18], collide: [1.8, 1.8, 1.1], cat: 'exterior',
  build(m) {
    for (const x of [0, 29]) { ringX(m, x, 4, 9, 3, 4, 1, '#3a2a1a'); line(m, x, 1, 9, x, 7, 9, WOOD_D); }
    m.box(1, 5, 2, 28, 2, 14, '#3a5a3a'); m.box(1, 7, 2, 28, 4, 1, '#3a5a3a'); m.box(1, 7, 15, 28, 4, 1, '#3a5a3a');
    m.box(13, 0, 13, 2, 5, 2, WOOD_D);
    const blooms = [['#e8c030', '#c89a20'], ['#b8582a', '#8a3a1a'], ['#7a4aa8', '#5a2a88'], ['#f0ece0', '#d8d0c0'], ['#c8283a', '#a01a2a'], ['#e88aa8', '#c86a88']];
    for (let i = 0; i < 6; i++) {
      const cx = 4 + (i % 3) * 11, cz = i < 3 ? 5 : 11;
      m.cyl(cx, 7, cz, 2.4, 4, STEEL); line(m, cx, 10, cz, cx, 13, cz, '#4a6a2a');
      ell(m, cx, 13.5, cz, 2.8, 1.6, 2.6, blooms[i][0]);
      m.set(cx - 1, 14, cz + 1, blooms[i][1]); m.set(cx + 1, 15, cz - 1, blooms[i][1]); m.set(cx, 13, cz + 2, '#4a6a2a');
    }
    for (const x of [1, 28]) m.box(x, 11, 8, 1, 14, 1, WOOD_D);
    for (let x = 0; x < 30; x++) m.box(x, 25, 3, 1, 1, 12, (x >> 2) % 2 ? '#f0ece0' : '#2a6a4a');
    for (let x = 0; x < 30; x += 2) m.set(x, 24, 14, (x >> 2) % 2 ? '#f0ece0' : '#2a6a4a');
  },
});
// view camera on a wooden tripod with the black focusing cloth
defineProp('town_view_camera', {
  size: [14, 28, 16], collide: [0.6, 1.7, 0.6], cat: 'exterior',
  build(m) {
    line(m, 7, 18, 7, 1, 0, 3, WOOD); line(m, 7, 18, 7, 13, 0, 3, WOOD); line(m, 7, 18, 7, 7, 0, 14, WOOD);
    m.box(4, 18, 4, 6, 1, 8, WOOD_D);
    m.box(4, 19, 3, 6, 6, 3, '#6a3a22'); m.box(5, 19, 6, 4, 5, 5, '#2a2622'); m.box(4, 19, 11, 6, 6, 2, '#6a3a22');
    m.cylZ(7, 22, 13, 1.6, 2, '#c8a050'); m.cylZ(7, 22, 15, 1.0, 1, '#1a1a1e');
    m.box(3, 17, 0, 8, 9, 4, BLACK); m.box(4, 26, 1, 6, 1, 3, BLACK);
  },
});
// painted backdrop for Centennial portraits (1/24): harbour, lighthouse, schooner, "HARBOR DAYS 1853-1953"
defineProp('town_photo_backdrop', {
  size: [52, 56, 8], scale: 1 / 24, collide: [2.2, 2.3, 0.3], cat: 'exterior',
  build(m) {
    for (const x of [1, 49]) { m.box(x, 0, 2, 2, 54, 2, WOOD_D); m.box(x - 1, 0, 0, 4, 1, 7, WOOD_D); }
    m.box(3, 8, 3, 46, 44, 1, GOLD);
    const bands = ['#c8dce8', '#b4d0e4', '#a0c4e0'];
    for (let i = 0; i < 3; i++) m.box(4, 34 + i * 6, 4, 44, 6, 1, bands[i]);
    m.box(4, 26, 4, 44, 8, 1, '#3a6a8a'); m.box(4, 24, 4, 44, 2, 1, '#2a5a7a');
    m.box(4, 18, 4, 44, 6, 1, '#d8c890'); m.box(4, 9, 4, 44, 9, 1, '#2a4a6a');
    // lighthouse on its rock
    m.box(36, 24, 5, 8, 3, 1, '#6a6a60'); m.box(39, 27, 5, 3, 14, 1, WHITE); m.box(39, 31, 5, 3, 2, 1, RED); m.box(39, 36, 5, 3, 2, 1, RED); m.box(38, 41, 5, 5, 2, 1, IRON); m.box(39, 43, 5, 3, 1, 1, '#e8d040');
    // schooner
    m.box(10, 27, 5, 12, 2, 1, '#5a3a22'); m.box(11, 29, 5, 1, 12, 1, WOOD_D); m.box(17, 29, 5, 1, 14, 1, WOOD_D);
    for (let y = 30; y < 41; y++) { m.box(12, y, 5, Math.max(1, Math.round((y - 29) * 0.4)), 1, 1, WHITE); m.box(18, y, 5, Math.max(1, Math.round((y - 29) * 0.45)), 1, 1, WHITE); }
    m.box(27, 44, 5, 3, 3, 1, '#f0d060');
    m.text('HARBOR DAYS', 26, 12, 5, '#f0e2b0', { align: 'center' });
    m.text('1853-1953', 26, 19, 5, '#8a2a22', { align: 'center' });
  },
});
// wooden soap crate (1/32), for the sidewalk preacher
defineProp('town_soapbox', {
  size: [18, 12, 14], scale: 1 / 32, collide: [0.56, 0.38, 0.44], cat: 'exterior',
  build(m) {
    crate(m, 0, 0, 0, 18, 12, 14, '#b08a5a', '#8a6a42');
    m.text('SOAP', 9, 4, 13, '#3a2a1a', { align: 'center' });
  },
});
// a hand-painted sign on a stick for a candidate (1/32): front and back
function placard(name, lines, o = {}) {
  defineProp(name, {
    size: [36, 76, 4], scale: 1 / 32, origin: [18, 0, 2], cat: 'exterior',
    build(m) {
      m.box(17, 0, 1, 2, 50, 2, WOOD_D);
      m.box(0, 46, 0, 36, 30, 3, o.bg || WHITE);
      m.box(0, 46, 0, 36, 1, 3, o.edge || NAVY); m.box(0, 75, 0, 36, 1, 3, o.edge || NAVY);
      const cols = o.cols || [];
      lines.forEach((s, i) => { m.text(s, 18, 68 - i * 8, 3, cols[i] || NAVY, { align: 'center' }); m.textBack(s, 18, 68 - i * 8, 0, cols[i] || NAVY, { align: 'center' }); });
    },
  });
}
placard('town_placard_eames', ['EAMES', 'FOR', 'ALDERMAN'], { cols: [RED, NAVY, NAVY] });
placard('town_placard_repent', ['PREPARE', 'TO MEET', 'THY GOD'], { bg: '#f0e8c8', edge: '#2a2a2a', cols: ['#2a2a2a', '#2a2a2a', '#8a1a1a'] });
placard('town_placard_stop', ['STOP', '', 'CHILDREN'], { bg: '#e8e4d8', edge: RED, cols: [RED, RED, NAVY] });
// Salvation Army bass drum on its stand (1/48)
defineProp('town_sa_drum', {
  size: [42, 46, 20], scale: 1 / 48, collide: [0.85, 0.95, 0.4], cat: 'exterior',
  build(m) {
    line(m, 8, 0, 4, 14, 14, 10, IRON); line(m, 34, 0, 4, 28, 14, 10, IRON); line(m, 8, 0, 16, 14, 14, 10, IRON); line(m, 34, 0, 16, 28, 14, 10, IRON);
    m.cylZ(21, 25, 4, 18.5, 12, '#a8201e');
    m.cylZ(21, 25, 16, 17, 1, '#e8e0c8'); m.cylZ(21, 25, 3, 17, 1, '#e8e0c8');
    for (const z of [4, 15]) { for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2; m.set(21 + Math.round(Math.cos(t) * 18), 25 + Math.round(Math.sin(t) * 18), z, GOLD); } }
    m.text('SALVATION', 21, 27, 17, NAVY, { align: 'center' });
    m.text('ARMY', 21, 19, 17, '#a8201e', { align: 'center' });
    m.box(19, 34, 17, 5, 3, 1, '#e8c030');
  },
});
// shoeshine box with a foot-rest, brushes and polish tins (1/32)
defineProp('town_shine_box', {
  size: [16, 16, 12], scale: 1 / 32, cat: 'exterior',
  build(m) {
    crate(m, 1, 0, 2, 14, 9, 9, '#8a5a32', '#6a4222');
    m.box(4, 9, 3, 8, 3, 7, '#6a4222'); m.box(5, 12, 2, 6, 2, 9, '#4a2a18');
    m.box(6, 12, 1, 4, 1, 1, '#4a2a18');
    m.cyl(3, 9, 4, 1.4, 1, '#2a2a2a'); m.cyl(3, 9, 8, 1.4, 1, '#8a3a1a'); m.box(12, 9, 3, 3, 2, 6, '#1a1a1a'); m.box(12, 11, 4, 3, 1, 4, '#c8a060');
    m.box(3, 3, 11, 10, 2, 1, WHITE); m.box(6, 3, 11, 4, 2, 1, RED);
  },
});
// a hand truck with two cases on its nose (the man pushing stands at -z)
defineProp('town_hand_truck', {
  size: [12, 22, 10], cat: 'exterior',
  build(m) {
    for (const x of [1, 10]) { line(m, x, 2, 7, x, 20, 1, IRON); ringX(m, x === 1 ? 0 : 11, 2, 7, 0, 2.2, 1, TYRE); }
    m.box(1, 0, 6, 10, 1, 4, STEEL_D); m.box(1, 12, 4, 10, 1, 1, IRON); m.box(1, 20, 1, 10, 1, 1, '#8a2a2a');
    crate(m, 2, 1, 5, 8, 5, 4, '#e0b030', '#b88a20'); crate(m, 2, 6, 4, 8, 5, 4, '#e0b030', '#b88a20');
    for (let x = 3; x < 10; x += 2) m.set(x, 11, 6, '#3a6a4a');
    m.box(3, 3, 9, 6, 1, 1, RED);
  },
});
// a stack of three wooden soda cases, bottle caps showing on top
defineProp('town_soda_cases', {
  size: [10, 12, 8], cat: 'exterior',
  build(m) {
    for (let i = 0; i < 3; i++) { crate(m, 0, i * 4, 0, 10, 4, 8, '#e0b030', '#b88a20'); m.box(3, i * 4 + 1, 8, 4, 2, 1, RED); }
    for (let x = 1; x < 10; x += 2) for (let z = 1; z < 8; z += 2) m.set(x, 12, z, '#4a7a5a');
  },
});
// sign painter's kit: open paint box, jars, a gold-leaf book and the mahlstick (1/32)
defineProp('town_paint_kit', {
  size: [22, 10, 12], scale: 1 / 32, cat: 'exterior',
  build(m) {
    crate(m, 0, 0, 2, 12, 4, 8, WOOD, WOOD_D); m.box(0, 4, 1, 12, 6, 1, WOOD_D);
    const jars = ['#b3302a', '#e8c030', '#23346a', WHITE, '#1a1a1a'];
    jars.forEach((c, i) => { m.box(1 + i * 2, 4, 4 + (i % 2) * 2, 1, 2, 1, c); });
    m.box(14, 0, 3, 5, 1, 4, GOLD); line(m, 13, 0, 10, 21, 1, 1, WOOD_L);
    m.cyl(18, 0, 9, 1.4, 3, '#c8c8c0');
  },
});
// wooden step-ladder (about 1.7 m)
defineProp('town_stepladder', {
  size: [12, 28, 14], cat: 'exterior',
  build(m) {
    for (const x of [1, 10]) { line(m, x, 0, 12, x, 26, 7, WOOD_L); line(m, x, 0, 1, x, 26, 6, WOOD); }
    for (let k = 1; k < 6; k++) { const y = k * 4.3, z = Math.round(12 - (y / 26) * 5); m.box(1, Math.round(y), z - 1, 10, 1, 2, WOOD_L); }
    m.box(1, 26, 5, 10, 1, 4, WOOD_L); m.box(2, 27, 6, 3, 2, 2, '#b3302a');
  },
});
// window washer's hanging stage: plank, guard rail on the street side (+z), stirrups and ropes to the roof
defineProp('town_washer_stage', {
  size: [46, 120, 12], collide: false, cat: 'far',
  build(m) {
    m.box(3, 0, 2, 40, 1, 7, WOOD); m.box(3, 1, 2, 40, 1, 1, WOOD_D);
    for (const x of [3, 42]) { m.box(x, 0, 1, 1, 18, 1, IRON); m.box(x, 18, 1, 1, 1, 9, IRON); m.box(x, 0, 9, 1, 18, 1, IRON); line(m, x, 18, 5, x, 119, 5, '#d8c8a0'); }
    m.box(3, 16, 9, 40, 1, 1, IRON); m.box(3, 9, 9, 40, 1, 1, IRON);
    m.cyl(12, 1, 5, 2.2, 4, STEEL); m.cyl(12, 1, 5, 1.8, 3, '#8ab0c0'); m.box(30, 1, 4, 4, 2, 3, '#b3302a');
  },
});

// ================================================================= the waterfront
// a fishing net spread out on the quay for mending: cork floats along one edge, lead line on the other
defineProp('town_net_spread', {
  size: [44, 2, 26], cat: 'exterior',
  build(m) {
    const net = '#5a5a3a';
    for (let x = 0; x < 44; x += 3) for (let z = 1; z < 25; z++) m.set(x + ((z >> 1) % 2), 0, z, net);
    for (let z = 1; z < 25; z += 3) m.box(0, 0, z, 44, 1, 1, net);
    for (let x = 1; x < 44; x += 4) m.box(x, 0, 0, 2, 2, 1, '#c8a060');
    m.box(0, 0, 25, 44, 1, 1, '#3a3a3a');
    m.box(18, 0, 9, 7, 1, 6, 0); for (let x = 18; x < 25; x += 2) m.set(x, 0, 12, '#8a8a60');
  },
});
// green metal tackle box, trays open, a coffee can of bait (1/32)
defineProp('town_tackle_box', {
  size: [18, 10, 12], scale: 1 / 32, cat: 'exterior',
  build(m) {
    m.box(0, 0, 2, 12, 5, 8, '#3a6a4a'); m.box(0, 5, 0, 12, 1, 3, '#2a5a3a'); m.box(0, 5, 9, 12, 1, 3, '#2a5a3a');
    const lures = ['#b3302a', '#e8c030', WHITE, '#3a7ab0'];
    for (let i = 0; i < 5; i++) m.set(1 + i * 2, 6, 1 + (i % 2), lures[i % 4]);
    m.box(4, 5, 5, 4, 1, 2, STEEL);
    m.cyl(15, 0, 6, 2.2, 5, '#b3302a'); m.cyl(15, 4, 6, 1.8, 1, '#5a3a22'); m.set(15, 5, 6, '#c86a6a');
  },
});
// wooden easel with a canvas of the harbour, paint box at its foot (for the Sunday painters)
defineProp('town_easel_harbor', {
  size: [14, 30, 14], collide: [0.7, 1.8, 0.7], cat: 'exterior',
  build(m) {
    line(m, 2, 0, 10, 5, 27, 6, WOOD); line(m, 11, 0, 10, 8, 27, 6, WOOD); line(m, 7, 0, 0, 7, 25, 5, WOOD_D);
    m.box(1, 12, 8, 12, 1, 3, WOOD_D);
    // the canvas (faces the painter, who stands at -z): sky, harbour, a red-sailed boat
    m.box(1, 13, 7, 12, 10, 1, '#f0ece0');
    m.box(2, 18, 6, 10, 4, 1, '#a8c8e0'); m.box(2, 15, 6, 10, 3, 1, '#3a6a8a'); m.box(2, 14, 6, 10, 1, 1, '#8a8a70');
    m.box(8, 18, 6, 1, 3, 1, '#b3302a'); m.box(7, 17, 6, 3, 1, 1, '#5a3a22'); m.box(3, 18, 6, 2, 2, 1, '#e8e4d8');
    m.box(3, 0, 11, 6, 2, 3, WOOD_D); m.set(4, 2, 12, '#b3302a'); m.set(6, 2, 12, '#e8c030');
  },
});

// ================================================================= vehicles (1/16 m voxels, ~6 m long, front = +z)
// the cab and hood of a 1950s medium truck; the body goes behind z = zc0
function truckCab(m, L, body, trim = CHROME) {
  const zc0 = L - 30, zc1 = L - 16; // cab
  // chassis, wheels & fenders
  m.box(4, 4, 3, 24, 3, L - 6, IRON);
  for (const zc of [16, L - 12]) { wheel(m, 1, 5.5, zc, 5.5, 3); wheel(m, 28, 5.5, zc, 5.5, 3); }
  for (const x of [0, 26]) { m.box(x, 11, L - 19, 6, 1, 13, body); m.box(x, 6, L - 7, 6, 5, 2, body); m.box(x, 6, L - 19, 6, 5, 1, body); }
  m.box(1, 7, zc0 + 1, 3, 1, 5, trim); m.box(28, 7, zc0 + 1, 3, 1, 5, trim);
  // cab with a rounded roof
  m.box(2, 7, zc0, 28, 18, zc1 - zc0, body);
  m.box(3, 25, zc0 + 1, 26, 1, zc1 - zc0 - 2, body);
  m.box(4, 17, zc1 - 1, 24, 7, 1, GLASS); m.box(15, 17, zc1 - 1, 2, 7, 1, body);
  for (const x of [2, 29]) m.box(x, 17, zc0 + 3, 1, 6, zc1 - zc0 - 6, GLASS);
  m.box(2, 12, zc0 + 6, 1, 1, 3, trim); m.box(29, 12, zc0 + 6, 1, 1, 3, trim);
  // hood, grille, lamps, bumper
  m.box(5, 7, zc1, 22, 10, L - 3 - zc1, body); m.box(6, 17, zc1, 20, 1, L - 4 - zc1, body);
  m.box(15, 17, zc1 + 2, 2, 1, L - 7 - zc1, trim);
  m.box(8, 8, L - 3, 16, 8, 1, trim); for (let x = 9; x < 24; x += 2) m.box(x, 9, L - 3, 1, 6, 1, IRON);
  for (const x of [2, 27]) { m.box(x, 12, L - 6, 3, 3, 1, { c: '#f8f0d0', emit: 0.5 }); m.box(x, 11, L - 7, 3, 1, 1, trim); }
  m.box(1, 4, L - 2, 30, 3, 2, trim); m.box(2, 4, 1, 28, 2, 2, trim);
  for (const x of [2, 27]) m.box(x, 7, 2, 3, 2, 1, { c: '#c02020', emit: 0.5 });
  return zc0;
}
// stake-bed beer truck with kegs, "HARBOR BREWING CO."
defineProp('town_truck_beer', {
  size: [32, 32, 98], collide: true, cat: 'far',
  build(m) {
    const L = 98, body = '#2a4a6a', zc0 = truckCab(m, L, body);
    m.box(1, 8, 3, 30, 2, zc0 - 4, WOOD);
    for (let z = 3; z < zc0 - 1; z += 7) for (const x of [1, 30]) m.box(x, 10, z, 1, 12, 1, WOOD_D);
    for (const y of [14, 20]) { m.box(1, y, 3, 1, 1, zc0 - 4, WOOD_D); m.box(30, y, 3, 1, 1, zc0 - 4, WOOD_D); }
    m.box(1, 10, zc0 - 2, 30, 14, 2, body);
    for (const x of [1, 30]) { m.box(x, 21, 4, 1, 1, zc0 - 6, body); }
    // kegs: two layers, standing, with red hoops
    for (let z = 8; z < zc0 - 5; z += 9) for (let x = 7; x < 30; x += 9) {
      m.cyl(x, 10, z, 3.5, 8, '#a8b0b4'); m.cyl(x, 15, z, 3.5, 1, '#a8201e'); m.set(x, 18, z, '#6a4a2a');
    }
    // a low name board along each side, under the kegs
    m.box(0, 9, 6, 1, 7, zc0 - 9, body); m.box(31, 9, 6, 1, 7, zc0 - 9, body);
    m.box(0, 15, 6, 1, 1, zc0 - 9, GOLD); m.box(31, 15, 6, 1, 1, zc0 - 9, GOLD);
    sideText(m, 'HARBOR ALE', 0, 10, zc0 / 2 + 2, '#f0e2b0', false); sideText(m, 'HARBOR ALE', 31, 10, zc0 / 2 + 2, '#f0e2b0', true);
  },
});
// Coca-Cola route truck: red, open side bays stacked with yellow cases
defineProp('town_truck_soda', {
  size: [32, 36, 98], collide: true, cat: 'far',
  build(m) {
    const L = 98, red = '#b8201e', zc0 = truckCab(m, L, red);
    m.box(1, 8, 3, 30, 2, zc0 - 4, IRON);
    m.box(1, 10, 3, 30, 1, zc0 - 4, red); m.box(1, 26, 3, 30, 2, zc0 - 4, red);
    for (let z = 3; z < zc0; z += 12) { m.box(1, 10, z, 30, 18, 1, red); }
    m.box(6, 10, 3, 20, 16, zc0 - 4, IRON);
    // stacked cases in the open bays
    for (let z = 4; z < zc0 - 1; z++) { if ((z - 3) % 12 === 0) continue; for (let y = 11; y < 26; y++) { const c = (y - 11) % 5 === 4 ? '#b88a20' : '#e0b030'; m.set(1, y, z, c); m.set(30, y, z, c); m.set(2, y, z, c); m.set(29, y, z, c); } }
    for (let z = 5; z < zc0 - 1; z += 2) for (let y = 13; y < 26; y += 5) { m.set(1, y, z, '#4a7a5a'); m.set(30, y, z, '#4a7a5a'); }
    // roof sign with the name
    m.box(2, 28, 8, 28, 7, 1, WHITE); m.box(2, 28, 8, 28, 1, 1, red); m.box(2, 34, 8, 28, 1, 1, red);
    m.box(1, 28, 10, 1, 7, zc0 - 14, red); m.box(30, 28, 10, 1, 7, zc0 - 14, red);
    sideText(m, 'COCA-COLA', 0, 29, zc0 / 2 + 3, WHITE, false); sideText(m, 'COCA-COLA', 31, 29, zc0 / 2 + 3, WHITE, true);
  },
});
// panel vans with the firm's name painted on (tint-free, one prop per firm)
function panelVan(name, o) {
  defineProp(name, {
    size: [32, 34, 94], collide: true, cat: 'far',
    build(m) {
      const L = 94, body = o.body, zc0 = truckCab(m, L, body);
      m.box(2, 7, 2, 28, 21, zc0 - 1, body);
      m.box(3, 28, 3, 26, 1, zc0 - 3, body);
      m.box(2, 13, 2, 28, 1, zc0 - 1, o.stripe); m.box(2, 25, 2, 28, 1, zc0 - 1, o.stripe);
      for (let y = 8; y < 28; y++) m.set(16, y, 2, IRON);
      m.box(5, 18, 2, 9, 5, 1, GLASS); m.box(18, 18, 2, 9, 5, 1, GLASS); m.box(14, 12, 2, 1, 2, 1, CHROME); m.box(17, 12, 2, 1, 2, 1, CHROME);
      const [l1, l2] = o.lines;
      sideText(m, l1, 2, 20, zc0 / 2 + 1, o.text, false); sideText(m, l1, 29, 20, zc0 / 2 + 1, o.text, true);
      if (l2) { sideText(m, l2, 2, 14, zc0 / 2 + 1, o.text2 || o.text, false); sideText(m, l2, 29, 14, zc0 / 2 + 1, o.text2 || o.text, true); }
    },
  });
}
panelVan('town_van_express', { body: '#1f4a33', stripe: '#b3302a', text: '#f0e2b0', lines: ['RAILWAY EXPRESS', 'AGENCY'] });
panelVan('town_van_laundry', { body: '#e8e4d8', stripe: '#2a4a8a', text: '#2a4a8a', text2: RED, lines: ["LEE'S LAUNDRY", 'SHIRTS 15¢'] });
panelVan('town_van_ice', { body: '#3a6a8a', stripe: WHITE, text: WHITE, lines: ['BAYSIDE ICE', 'COLD STORAGE'] });
panelVan('town_van_courier', { body: '#2a2a2e', stripe: '#e0b030', text: '#e0b030', text2: WHITE, lines: ['THE COURIER', 'SUNDAY 48 PAGES'] });
panelVan('town_van_tremblay', { body: '#6a2a24', stripe: GOLD, text: '#f0e2b0', lines: ['TREMBLAY', 'FREE DELIVERY'] });

// "JUST MARRIED" card and a string of tin cans, placed behind a car (origin = the car's rear bumper, facing the car's way)
defineProp('town_just_married', {
  size: [40, 22, 50], scale: 1 / 32, origin: [20, 0, 46], cat: 'exterior',
  build(m) {
    m.box(4, 10, 45, 32, 12, 1, WHITE); m.box(4, 10, 45, 32, 1, 1, '#c86a88'); m.box(4, 21, 45, 32, 1, 1, '#c86a88');
    m.textBack('JUST', 20, 16, 44, '#b3302a', { align: 'center' }); m.textBack('MARRIED', 20, 11, 44, '#b3302a', { align: 'center' });
    const cans = [[8, 10], [14, 3], [20, 14], [27, 6], [33, 12], [24, 1]];
    for (const [x, z] of cans) { m.cylZ(x, 1.5, z, 1.5, 3, (x % 3) ? '#b8c0c4' : '#c8a060'); line(m, x, 2, z + 3, 20 + (x - 20) * 0.4, 6, 46, '#e8e4d8'); }
    m.box(15, 0, 18, 4, 3, 6, '#3a2a1a'); m.box(15, 3, 18, 4, 3, 2, '#3a2a1a');
  },
});
// what's left on the road after a fender-bender: glass, a hubcap, a strip of chrome
defineProp('town_car_debris', {
  size: [24, 2, 20], cat: 'exterior',
  build(m) {
    const glass = '#c8dce4', amber = '#e8a040';
    for (const [x, z] of [[3, 4], [5, 7], [8, 3], [9, 9], [12, 6], [4, 12], [14, 11], [7, 15], [16, 4], [11, 13]]) m.set(x, 0, z, x % 3 ? glass : amber);
    m.cyl(18, 0, 14, 2.6, 1, CHROME); m.set(18, 1, 14, '#8a8a8a');
    line(m, 2, 0, 18, 12, 0, 17, CHROME);
  },
});
// a fedora on its own, tumbling along in the wind (1/32)
defineProp('town_hat_blown', {
  size: [12, 7, 12], scale: 1 / 32, cat: 'exterior',
  build(m) {
    m.cyl(6, 0, 6, 5.6, 1, '#4a4038');
    m.cyl(6, 1, 6, 3.5, 4, '#4a4038'); m.cyl(6, 1, 6, 3.6, 1, '#1a1a1e'); m.box(5, 5, 3, 3, 1, 6, '#3a3230');
  },
});

// the crossing guard's STOP paddle on a short pole (1/32)
defineProp('town_stop_paddle', {
  size: [14, 46, 3], scale: 1 / 32, origin: [7, 0, 1], cat: 'exterior',
  build(m) {
    m.box(6, 0, 1, 2, 34, 1, '#d8d0c0');
    for (let y = 32; y < 46; y++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 39); if (d <= 6.8) m.box(x, y, 0, 1, 1, 3, d > 5.8 ? WHITE : RED); }
    m.text('STOP', 7, 37, 3, WHITE, { align: 'center' }); m.textBack('STOP', 7, 37, 0, WHITE, { align: 'center' });
  },
});
// gold-leaf window lettering, in the stages a sign painter gets through the day (1/24; faces +z, glass behind)
function lettering(name, text) {
  const full = 'CENTENNIAL SALE', W = full.length * 4 + 1;
  defineProp(name, {
    size: [W + 2, 8, 2], scale: 1 / 24, origin: [(W + 2) / 2, 0, 0], cat: 'exterior',
    build(m) {
      m.text(text, 2, 1, 0, '#3a2a12');
      m.text(text, 1, 2, 1, { c: '#e8c050', emit: 0.25 });
    },
  });
}
lettering('town_lettering_1', 'CENTEN');
lettering('town_lettering_2', 'CENTENNIAL');
lettering('town_lettering_3', 'CENTENNIAL SALE');
