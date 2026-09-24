// Prop definitions: shop fixtures and institution interiors (church, school, hospital, theatre, etc.).
// Conventions: 1 voxel = 1/16 m, origin = bottom centre, the "front" of the prop faces +z.
// Some small counter-top items use a finer scale (1/32 m per voxel) for detail and a few very large
// showpieces use a coarser one; every such case is noted beside the prop.
// "Back at z=0" props (wall shelving, wall boards) have their origin at the bottom centre of the BACK
// face, so placing one at a wall position with its +z facing into the room puts it flush on the wall.
import { defineProp as registerProp, lampLight, PROP_DEFS } from '../props.js';
import { layoutText } from '../../world/font.js';

// Guarded registration: if another library already defined a name, keep theirs and skip ours
// (a duplicate would throw and take this whole module down).
function defineProp(name, def) {
  if (PROP_DEFS.has(name)) return false;
  registerProp(name, def); return true;
}

// ---------------------------------------------------------------- shared palette
const WOOD = '#7a5234', WOOD_D = '#5e3e26', WOOD_L = '#9a6c44';
const OAK = '#a8784a', OAK_D = '#86592f', OAK_L = '#c09060';
const WALNUT = '#5a3a22', WALNUT_D = '#42291a', WALNUT_L = '#74503a';
const MAHOG = '#6a2e1e', MAHOG_D = '#4e2014';
const CHROME = '#e2e7eb', CHROME_M = '#b4bcc4', CHROME_D = '#7d868f';
const BRASS = '#b8903a', BRASS_L = '#d8b458', BRASS_D = '#86662a';
const ENAMEL = '#efebe2', ENAMEL_D = '#d2cdc2';
const IRON = '#2c2c2e', BLACK = '#18181a';
const CREAM = '#efe6cc', PAPER = '#ece4cf', KRAFT = '#b58a5a';
const RED = '#b8322a', RED_D = '#8a2420', GREEN = '#2f6a3e', GREEN_D = '#23502e', NAVY = '#243a66';
const GLASS = '#d6e8ec', GOLD = '#d8b04a', SILVER = '#c8ccd0';
const TA = (s = 0.5) => ({ tint: 1, shade: s });
const TB = (s = 0.5) => ({ tint: 2, shade: s });
const glow = (c, e = 0.95) => ({ c, emit: e });

// ---------------------------------------------------------------- helpers
// 12 edges of a box: frames for glass cases (glass itself is left open so the goods show)
function frame(m, x, y, z, w, h, d, c) {
  m.box(x, y, z, w, 1, 1, c); m.box(x, y, z + d - 1, w, 1, 1, c);
  m.box(x, y + h - 1, z, w, 1, 1, c); m.box(x, y + h - 1, z + d - 1, w, 1, 1, c);
  m.box(x, y, z, 1, h, 1, c); m.box(x + w - 1, y, z, 1, h, 1, c);
  m.box(x, y, z + d - 1, 1, h, 1, c); m.box(x + w - 1, y, z + d - 1, 1, h, 1, c);
  m.box(x, y, z, 1, 1, d, c); m.box(x + w - 1, y, z, 1, 1, d, c);
  m.box(x, y + h - 1, z, 1, 1, d, c); m.box(x + w - 1, y + h - 1, z, 1, 1, d, c);
}
function legs(m, x, y, z, w, d, h, c, t = 1) {
  for (const [a, b] of [[x, z], [x + w - t, z], [x, z + d - t], [x + w - t, z + d - t]]) m.box(a, y, b, t, h, t, c);
}
// a short diagonal glint on an (invisible) glass pane lying in the x-y plane
function glint(m, x, y, z, n = 3) { for (let i = 0; i < n; i++) m.set(x + i, y + i, z, '#f4fbfc'); }
// small-font text that also understands the cent sign (¢), optional align:'center'
const CENT = ['.#.', '###', '#..', '###', '.#.'];
function label(m, str, x, y, z, col, o = {}) {
  const parts = String(str).split('¢');
  const widths = parts.map((p) => (p ? layoutText(p, 'small').width : 0));
  let total = widths.reduce((a, b) => a + b, 0) + (parts.length - 1) * 4;
  for (let i = 0; i < parts.length - 1; i++) if (!parts[i]) total -= 1;
  let cx = o.align === 'center' ? Math.round(x - total / 2) : x;
  parts.forEach((p, i) => {
    if (p) { m.text(p, cx, y, z, col, { font: 'small' }); cx += widths[i] + 1; }
    if (i < parts.length - 1) {
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (CENT[r][c] === '#') m.set(cx + c, y + 4 - r, z, col);
      cx += 4;
    }
  });
  return total;
}
// a hanging/standing bottle, 1 voxel wide (at whatever scale): body h, neck + cap
function bottle(m, x, y, z, h, body, cap = '#d8d0b0', w = 1) {
  m.box(x, y, z, w, h, w, body); m.box(x + (w > 1 ? 0.5 : 0), y + h, z, 1, 1, 1, body);
  m.set(x + (w > 1 ? 0.5 : 0), y + h + 1, z, cap);
}
// rounded square column (cheap "cylinder": far fewer faces than m.cyl). x0,z0 = min corner.
function col(m, x0, y, z0, w, h, c, d = w) {
  m.box(x0, y, z0, w, h, d, c);
  const big = w >= 7 && d >= 7;
  for (const [cx, cz, sx, sz] of [[x0, z0, 1, 1], [x0 + w - 1, z0, -1, 1], [x0, z0 + d - 1, 1, -1], [x0 + w - 1, z0 + d - 1, -1, -1]]) {
    m.clear(cx, y, cz, 1, h, 1);
    if (big) { m.clear(cx + sx, y, cz, 1, h, 1); m.clear(cx, y, cz + sz, 1, h, 1); }
  }
}
// A view of model m mirrored front-to-back (z -> sz-1-z), for building a prop "facing the other way".
function flipZ(m) {
  const S = m.sz;
  return {
    box: (x, y, z, w, h, d, c) => m.box(x, y, S - z - d, w, h, d, c),
    set: (x, y, z, c) => m.set(x, y, S - 1 - Math.floor(z), c),
    cylZ: (cx, cy, z, r, len, c) => m.cylZ(cx, cy, S - z - len, r, len, c),
    cyl: (cx, y, cz, r, h, c) => m.cyl(cx, y, S - cz, r, h, c),
    clear: (x, y, z, w, h, d) => m.box(x, y, S - z - d, w, h, d, 0),
  };
}
// sphere-ish hash for scattered multicolour fills
const hash3 = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return h; };

// =====================================================================================================
// SHOP FIXTURES
// =====================================================================================================

// Shop counter module: 1.0 m wide, 0.95 m high, 0.62 m deep. Customer side +z (raised wood panels),
// clerk side -z (open shelf with paper bags & a twine cone). Top = tint A (linoleum / marble colour).
defineProp('counter_shop', {
  size: [16, 16, 10], collide: [1.0, 0.95, 0.62],
  build(m) {
    m.box(0, 0, 0, 16, 1, 8, WOOD_D);                       // recessed kick
    m.box(0, 1, 0, 16, 13, 9, WOOD);                        // carcass
    m.clear(1, 1, 0, 14, 12, 5);                            // clerk-side cubby
    m.box(1, 1, 0, 14, 1, 5, WOOD_D); m.box(1, 7, 0, 14, 1, 5, WOOD_D);
    m.box(7, 2, 0, 1, 11, 5, WOOD_D);                       // divider
    m.box(2, 2, 1, 4, 4, 3, KRAFT); m.box(2, 6, 1, 4, 1, 3, '#a47a4c');            // stacked paper bags
    m.box(9, 2, 1, 5, 2, 3, '#e6e0d0'); m.box(9, 4, 1, 5, 1, 3, '#d8d2c2');       // wrapping paper roll
    m.cyl(10.5, 8, 2.5, 1.5, 3, '#d9c7a0'); m.set(10, 11, 2, '#b89e70');         // twine cone
    m.box(3, 8, 1, 3, 3, 2, '#8a3a2a'); m.box(3, 11, 1, 3, 1, 2, '#6a2a1e');     // receipt box
    for (const x0 of [1, 8.5]) { m.box(x0, 2, 9, 6.5, 10, 1, WOOD_L); m.box(x0 + 1, 3, 9, 4.5, 8, 1, WOOD); }
    m.box(0, 13, 9, 16, 1, 1, WOOD_D);                      // front cornice
    m.box(0, 14, 0, 16, 1, 10, TA(0.5)); m.box(0, 14, 9, 16, 1, 1, TA(0.42)); // top with nosing
    m.box(0, 15, 1, 16, 1, 1, TA(0.44));                    // back-edge lip
  },
});

// Glass-topped display counter: wood base, open "glass" case framed in nickel, goods on green felt.
defineProp('display_case', {
  size: [16, 15, 10], collide: [1.0, 0.95, 0.62],
  build(m) {
    m.box(0, 0, 0, 16, 1, 9, WOOD_D);
    m.box(0, 1, 0, 16, 7, 10, WOOD);
    m.box(1, 2, 9, 14, 5, 1, WOOD_L); m.box(2, 3, 9, 12, 3, 1, WOOD);
    m.box(0, 8, 0, 16, 1, 10, WOOD_D);                      // case floor
    m.box(1, 8, 1, 14, 1, 8, '#2e5a3a');                    // felt
    frame(m, 0, 8, 0, 16, 7, 10, CHROME_M);
    m.box(0, 14, 0, 16, 1, 1, CHROME_D);                    // back rail
    // goods: boxed chocolates, fountain pens, pocket knives, a watch, perfume bottles
    m.box(2, 9, 2, 3, 1, 3, '#b8323a'); m.box(2, 10, 2, 3, 1, 3, '#d8b04a'); m.set(3, 10, 3, '#b8323a');
    m.box(2, 9, 6, 3, 1, 2, '#f2e8d8'); m.box(3, 9, 6, 1, 1, 2, '#c05070');
    m.box(6, 9, 2, 1, 1, 4, '#1a1a1a'); m.box(7.5, 9, 2, 1, 1, 4, '#2a4a8a'); m.set(6, 9, 1, GOLD);
    m.box(9, 9, 2, 2, 1, 1, '#8a5a3a'); m.box(9, 9, 4, 2, 1, 1, '#c8c8c8'); m.box(9, 9, 6, 2, 1, 1, '#6a3a2a');
    m.box(12, 9, 2, 2, 1, 2, GOLD); m.set(12, 10, 2, '#f8f4e8');                  // watch
    bottle(m, 12, 9, 6, 2, '#d890b0', GOLD); bottle(m, 14, 9, 5, 1, '#a0c8e0', GOLD);
    m.box(6, 9, 7, 2, 2, 1, TA(0.5)); m.box(6, 11, 7, 2, 1, 1, TA(0.4));          // gift box in tint A
    glint(m, 3, 10, 9); glint(m, 10, 9, 9, 2);
  },
});

// Grocery wall shelving 1.0 m x 2.0 m, back at z=0. Cans, cereal boxes, jars, oats & ketchup bottles.
defineProp('shelf_goods', {
  size: [16, 33, 7], origin: [8, 0, 0], collide: [1.0, 2.0, 0.44],
  build(m) {
    const fr = '#8a6a48', frd = '#6e5236';
    m.box(0, 0, 0, 16, 32, 1, frd);                          // back board
    m.box(0, 0, 0, 1, 32, 7, fr); m.box(15, 0, 0, 1, 32, 7, fr);
    m.box(1, 0, 1, 14, 2, 6, frd);                           // plinth
    for (const y of [2, 9, 16, 23]) { m.box(1, y, 1, 14, 1, 6, fr); m.box(1, y, 6, 14, 1, 1, '#e8e2d0'); }
    for (const y of [2, 9, 16, 23]) for (const x of [3, 8, 12]) m.set(x, y, 7, '#f8f4ea');   // price tickets (just proud)
    m.box(0, 30, 0, 16, 2, 7, fr); m.box(0, 32, 0, 16, 1, 7, frd);                        // crown
    // row 1: tomato & soup cans
    for (const [x, lab] of [[1, '#c0302a'], [4, '#c0302a'], [8, '#d88a2a'], [11, '#3a7a3a']]) {
      m.box(x, 3, 2, 3, 4, 3, CHROME_M); m.box(x, 4, 2, 3, 2, 3, lab); m.box(x, 5, 4, 3, 1, 1, '#f2ead8');
      m.box(x, 7, 3, 3, 1, 2, CHROME_M);
    }
    m.box(14, 3, 3, 1, 3, 2, '#c0302a');
    // row 2: cereal boxes
    for (const [x, a, b] of [[1, '#e8c23a', '#c0302a'], [4, '#e8c23a', '#c0302a'], [7, '#3a5aa0', '#f2ead8'], [10, '#3a5aa0', '#f2ead8']]) {
      m.box(x, 10, 3, 3, 6, 2, a); m.box(x, 12, 4, 3, 2, 1, b); m.set(x + 1, 14, 4, b);
    }
    m.box(13, 10, 3, 2, 5, 2, '#d8d2b8'); m.box(13, 12, 4, 2, 1, 1, '#2a6a4a');
    // row 3: jars (pickles, jam, peanut butter), lids
    for (const [x, fill, lid] of [[1, '#6a8a2a', GOLD], [4, '#7a1e3a', '#c0302a'], [7, '#c08a4a', '#2a4a8a'], [10, '#7a1e3a', '#c0302a'], [13, '#e0a02a', GOLD]]) {
      m.box(x, 17, 3, 2, 3, 2, fill); m.box(x, 19, 3, 2, 1, 2, GLASS); m.box(x, 20, 3, 2, 1, 2, lid);
      m.box(x, 18, 5, 2, 1, 1, '#f2ead8');
    }
    // row 4: oats cylinders, ketchup bottles, soap flakes
    for (const x of [1.5, 4.5]) { m.cyl(x + 1, 24, 3.5, 1.5, 5, '#2a4a8a'); m.box(x + 0.5, 26, 5, 2, 2, 1, '#f2ead8'); m.box(x + 0.5, 29, 3, 2, 1, 2, '#c0302a'); }
    for (const x of [8, 9, 10]) bottle(m, x, 24, 4, 4, '#a8201a', '#f2ead8');
    m.box(12, 24, 2, 3, 5, 3, '#f2ead8'); m.box(12, 25, 4, 3, 2, 1, '#3a8ac0'); m.box(12, 28, 2, 3, 1, 3, '#3a8ac0');
  },
});

// Bakery bread rack, back at z=0: baskets of rolls, wrapped sliced loaves, round boules, Italian loaves.
defineProp('shelf_bread', {
  size: [16, 28, 8], origin: [8, 0, 0], collide: [1.0, 1.7, 0.5],
  build(m) {
    const fr = '#9a7048', frd = '#7a5434', crust = '#b8742e', crustD = '#8a5020', crustL = '#d49a50';
    m.box(0, 0, 0, 1, 27, 8, fr); m.box(15, 0, 0, 1, 27, 8, fr);
    for (let y = 2; y < 26; y += 3) m.box(1, y, 0, 14, 1, 1, frd);              // slatted back
    m.box(1, 0, 1, 14, 1, 7, frd);
    for (const y of [1, 8, 14, 20]) { m.box(1, y, 1, 14, 1, 7, fr); m.box(1, y + 1, 7, 14, 1, 1, frd); } // shelves with lip
    m.box(0, 26, 0, 16, 2, 8, frd);
    // bottom: two wicker baskets of rolls
    for (const x of [1, 8]) {
      m.box(x, 2, 2, 7, 3, 5, '#b89058'); m.box(x, 3, 2, 7, 1, 5, '#8a6a3a');
      m.clear(x + 1, 4, 3, 5, 1, 3);
      for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) m.set(x + 1 + i, 4 + ((i + k) & 1), 3 + k, (i + k) & 1 ? crustL : crust);
    }
    // wrapped sliced bread (white wax paper, coloured balloon dots)
    for (const x of [1, 5, 9]) {
      m.box(x, 9, 2, 3, 3, 5, '#f4f0e6'); m.box(x, 12, 3, 3, 1, 3, '#f4f0e6');
      m.set(x, 11, 6, '#c0302a'); m.set(x + 1, 10, 6, '#2a5ab0'); m.set(x + 2, 11, 6, '#e8c23a');
      m.box(x, 9, 6, 3, 1, 1, '#2a5ab0');
    }
    m.box(13, 9, 2, 2, 3, 4, crust); m.box(13, 12, 2, 2, 1, 4, crustD);
    // round boules & dark rye, scored tops
    for (const [x, c, t] of [[1, crust, crustL], [5, '#5a3420', '#7a5238'], [9, crust, crustL]]) {
      m.box(x, 15, 3, 4, 1, 4, c); m.clear(x, 15, 3, 1, 1, 1); m.clear(x + 3, 15, 3, 1, 1, 1); m.clear(x, 15, 6, 1, 1, 1); m.clear(x + 3, 15, 6, 1, 1, 1);
      m.box(x + 1, 16, 4, 2, 1, 2, c); m.set(x + 1, 16, 5, t); m.set(x + 2, 16, 4, t);
    }
    m.box(13, 15, 3, 2, 2, 4, '#5a3420'); m.box(13, 17, 4, 2, 1, 2, '#6e4430');
    // long Italian loaves, tapered with slashes
    for (const [y, z] of [[21, 2], [21, 4], [23, 3]]) {
      m.box(3, y, z, 10, 2, 2, crust); m.box(2, y, z, 12, 1, 2, crust);
      for (let x = 4; x < 12; x += 3) m.box(x, y + 1, z, 2, 1, 1, crustL);
    }
  },
});

// Hardware wall unit, back at z=0: tilted nail/bolt bins below, hanging tools & a shelf of stock above.
defineProp('shelf_hardware', {
  size: [16, 33, 9], origin: [8, 0, 0], collide: [1.0, 2.0, 0.5],
  build(m) {
    const fr = '#6e5a44', frd = '#54442f', bin = '#8a6a4a', peg = '#b89a70';
    m.box(0, 0, 0, 16, 32, 1, peg);                          // pegboard back
    for (let y = 16; y < 30; y += 3) for (let x = 2; x < 15; x += 3) m.set(x, y, 1, '#8a7050');   // peg holes
    m.box(0, 0, 0, 1, 32, 8, fr); m.box(15, 0, 0, 1, 32, 8, fr);
    m.box(1, 0, 1, 14, 14, 6, frd);                          // bin cabinet
    const stuff = ['#9aa0a6', '#c8a860', '#5a5e62', '#b4bac0', '#c09a50', '#70767c', '#a8aeb4', '#b89048', '#4a4e52'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const xi = 1 + c * 5 - (c === 2 ? 1 : 0), yi = 1 + r * 4 + (r === 2 ? 1 : 0), w = c === 1 ? 4 : 4;
      m.box(xi, yi, 7, w, 2, 1, bin); m.box(xi, yi + 2, 7, w, 1, 1, '#a07e58');   // bin front
      m.box(xi, yi + 2, 3, w, 1, 4, stuff[r * 3 + c]);                            // heaped contents
      m.box(xi + 1, yi + 3, 4, w - 2, 1, 2, stuff[r * 3 + c]);
      m.set(xi + 1, yi + 1, 8, BRASS);                                            // label holder
    }
    m.box(0, 14, 0, 16, 1, 9, fr);                           // counter shelf
    // hanging on pegs: claw hammer, hand saw, rope coil, wrench
    m.box(2, 16, 1, 1, 4, 1, '#c0302a'); m.box(1, 20, 1, 3, 1, 1, '#6a7076'); m.set(3, 21, 1, '#6a7076');
    m.box(5, 15, 1, 4, 6, 1, '#c4ccd4'); m.box(5, 15, 1, 1, 6, 1, '#8a9298'); m.box(8, 19, 1, 2, 3, 1, OAK);    // saw
    m.cylZ(12.5, 18.5, 1, 2, 1, '#d4bc84'); m.cylZ(12.5, 18.5, 1, 1, 1, peg);                                  // rope
    m.box(12, 21, 1, 1, 1, 1, CHROME_D);
    m.box(10, 16, 1, 1, 4, 1, '#8a9298'); m.box(10, 20, 1, 1, 1, 1, CHROME_D);
    // upper shelf: galvanised bucket, red kerosene lantern, boxed nails
    m.box(0, 23, 0, 16, 1, 8, fr);
    m.cyl(3.5, 24, 4, 2, 4, '#b8c0c6'); m.cyl(3.5, 27, 4, 2, 1, '#8a9298'); m.box(1, 28, 4, 5, 1, 1, '#6a6e72');
    m.box(8, 24, 3, 3, 1, 3, '#c0302a'); m.box(8.5, 25, 3.5, 2, 2, 2, GLASS); m.set(9, 26, 4, glow('#ffd890', 0.3));
    m.box(8, 27, 3, 3, 1, 3, '#c0302a'); m.set(9, 28, 4, '#c0302a');
    m.box(12, 24, 2, 3, 2, 4, '#c8a878'); m.box(12, 26, 2, 3, 2, 4, '#b89868'); m.box(12, 25, 6, 3, 1, 1, '#2a4a8a');
    m.box(0, 30, 0, 16, 2, 8, frd);
  },
});

// Pyramid display of gallon paint cans (4-3-2-1), 1/32 m voxels. Faces +z.
defineProp('paint_cans', {
  size: [26, 27, 8], scale: 1 / 32, collide: [0.8, 0.8, 0.25],
  build(m) {
    const cols = ['#c0302a', '#2a5ab0', '#e8c23a', '#3a8a4a', '#f2ede0', '#2a7a8a', '#d8783a', '#6a3a8a', '#b8322a', '#f2ede0'];
    let k = 0;
    for (let row = 0; row < 4; row++) {
      const n = 4 - row, x0 = 1 + row * 3;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * 6, y = row * 7, c = cols[k++ % cols.length];
        col(m, x, y, 1, 6, 7, '#b8bec4');
        col(m, x, y + 1, 1, 6, 4, c);                        // label
        m.box(x, y + 3, 2, 6, 1, 4, '#f8f4ea');              // white brand band
        m.box(x + 1, y + 6, 2, 4, 1, 4, '#8a9298');          // lid
        m.set(x + 3, y + 6, 6, c); m.set(x + 3, y + 5, 7, c); // drip of paint over the rim
        m.set(x + 2, y + 7, 3, CHROME_D); m.set(x + 3, y + 7, 3, CHROME_D);   // bail handle
      }
    }
  },
});

// Ornate brass National-style cash register, 1/32 m voxels, sits on a counter.
// Keys & cash drawer face -z (the clerk, behind a counter_shop); the "amount" flags read from both sides.
defineProp('cash_register', {
  size: [16, 24, 16], scale: 1 / 32, collide: [0.5, 0.72, 0.5],
  build(m) {
    m.box(0, 0, 0, 16, 1, 16, BRASS_D);
    m.box(1, 1, 0, 14, 4, 16, BRASS);                        // drawer body
    m.box(2, 2, 0, 12, 2, 1, BRASS_L); m.box(7, 2, 0, 2, 1, 1, BLACK);        // drawer front + pull
    m.box(2, 5, 6, 12, 7, 9, BRASS);                         // cabinet
    for (const x of [1, 14]) { m.box(x, 6, 8, 1, 5, 6, BRASS_D); m.box(x, 7, 9, 1, 3, 4, BRASS_L); }   // side panels
    m.box(3, 6, 15, 10, 5, 1, BRASS_D); m.box(4, 7, 15, 8, 3, 1, BRASS);      // customer-side panel
    m.box(6, 7, 15, 4, 3, 1, BRASS_L); m.set(6, 7, 15, BRASS); m.set(9, 7, 15, BRASS); m.set(6, 9, 15, BRASS); m.set(9, 9, 15, BRASS);
    m.box(1, 1, 15, 14, 4, 1, BRASS_D); m.box(2, 2, 15, 12, 2, 1, BRASS);
    // key bank stepping up from the clerk (-z)
    for (let r = 0; r < 5; r++) {
      m.box(2, 5, 1 + r, 12, 1 + r, 1, BRASS_D);
      for (let c = 0; c < 6; c++) m.set(3 + c * 2, 6 + r, 1 + r, r === 4 ? '#c0302a' : '#f4ecd6');
    }
    // amount-flag cabinet on top, windows both sides
    m.box(3, 12, 7, 10, 7, 7, BRASS);
    m.box(4, 13, 13, 8, 5, 1, BLACK); m.box(4, 13, 7, 8, 5, 1, BLACK);
    m.text('25', 6, 13, 14, '#f4f0e0', { font: 'small' }); m.set(5, 13, 14, '#f4f0e0');
    m.textBack('25', 10, 13, 6, '#f4f0e0', { font: 'small' }); m.set(10, 13, 6, '#f4f0e0');
    m.box(2, 19, 6, 12, 1, 9, BRASS_D);
    m.box(4, 20, 9, 8, 1, 3, BRASS_L); m.box(6, 21, 10, 4, 1, 1, BRASS_L); m.box(7, 22, 10, 2, 1, 1, BRASS_L);
    // crank on the right
    m.cylX(15, 8, 11, 1.5, 1, BRASS_D); m.box(15, 8, 11, 1, 5, 1, BRASS); m.box(15, 12, 11, 1, 1, 3, WALNUT);
  },
});

// Computing fan scale with a chrome pan on top, 1/32 m voxels, sits on a counter. The fan dial faces +z.
defineProp('scale_grocery', {
  size: [16, 24, 12], scale: 1 / 32, collide: [0.5, 0.75, 0.38],
  build(m) {
    m.box(1, 0, 2, 14, 2, 9, '#3a3a3c'); m.box(2, 2, 3, 12, 3, 7, ENAMEL);
    m.box(6, 5, 5, 4, 3, 3, ENAMEL);
    // fan housing: half disc
    for (let y = 0; y <= 9; y++) for (let x = -8; x <= 8; x++) {
      const r = Math.hypot(x + 0.5, y + 0.5);
      if (r <= 8) {
        m.box(8 + x, 8 + y, 5, 1, 1, 3, r > 6.8 ? ENAMEL : '#f6f0dc');
        if (r > 6.8) { m.set(8 + x, 8 + y, 8, ENAMEL); m.set(8 + x, 8 + y, 4, ENAMEL); }
      }
    }
    for (let a = 0; a <= 8; a++) {                            // tick marks
      const t = Math.PI * a / 8, x = Math.round(8 + Math.cos(t) * 5.8 - 0.5), y = Math.round(8 + Math.sin(t) * 5.8 - 0.5);
      m.set(x, y, 8, '#2a2a2a');
    }
    for (let i = 0; i < 5; i++) m.set(7 + Math.round(i * 0.5), 9 + i, 8, '#c0302a');   // pointer
    m.set(7, 8, 8, BLACK);
    // pan
    m.box(7, 17, 5, 2, 2, 2, CHROME_D);
    m.box(1, 19, 1, 14, 1, 10, CHROME_M); m.box(0, 20, 0, 16, 1, 12, CHROME); m.clear(1, 20, 1, 14, 1, 10);
  },
});

// Row of four glass candy jars (1/32 m voxels) for a counter top: peppermints, lemon drops,
// jelly beans, licorice. Labels face +z.
defineProp('candy_jars', {
  size: [36, 14, 10], scale: 1 / 32, collide: [1.1, 0.42, 0.3],
  build(m) {
    const fills = [
      (y) => (y & 1 ? '#f4f0ea' : '#c8202a'),
      (y) => (y % 3 === 0 ? '#e89a2a' : '#f0d23a'),
      (y) => ['#d8303a', '#3a9a4a', '#f0c02a', '#7a3a9a', '#f07a2a'][y % 5],
      (y) => (y % 3 === 1 ? '#b8202a' : '#1c1414'),
    ];
    for (let j = 0; j < 4; j++) {
      const x = 1 + j * 9, lid = j & 1 ? CHROME : '#c0302a';
      col(m, x, 0, 1, 7, 1, GLASS);
      for (let y = 1; y < 8; y++) col(m, x, y, 1, 7, 1, fills[j](y));
      col(m, x, 8, 1, 7, 1, GLASS); col(m, x + 1, 9, 2, 5, 1, GLASS);
      col(m, x + 1, 10, 2, 5, 1, lid); m.box(x + 3, 11, 4, 1, 1, 1, lid); m.set(x + 3, 12, 4, GLASS);
      m.box(x + 2, 3, 8, 3, 2, 1, '#f8f4e8');   // paper label
      m.set(x + 1, 7, 8, '#f8fcfc');                                        // glint
    }
  },
});

// Floor-standing penny gumball machine (1/32 m voxels, ~1.3 m tall). Coin slot & crank face +z.
defineProp('gumball_machine', {
  size: [16, 42, 16], scale: 1 / 32, collide: [0.4, 1.3, 0.4],
  build(m) {
    const r = '#b8202a', rd = '#8a1820';
    m.cyl(8, 0, 8, 6, 1, rd); m.cyl(8, 1, 8, 4, 1, r);
    m.cyl(8, 2, 8, 1.5, 17, r); m.cyl(8, 8, 8, 2, 1, rd); m.cyl(8, 18, 8, 3, 1, rd);
    m.box(3, 19, 3, 10, 8, 10, r); m.box(4, 26, 4, 8, 1, 8, rd);
    m.box(5, 21, 13, 6, 5, 1, CHROME_M);                    // coin mechanism plate
    m.cylZ(8, 23.5, 14, 1.6, 1, CHROME); m.box(7, 23, 15, 2, 1, 1, CHROME_D);   // crank
    m.box(6, 25, 14, 1, 1, 1, BLACK); label(m, '1¢', 8, 26.2, 14, '#f4f0e0', { align: 'center' });
    m.box(6, 19, 13, 4, 2, 2, CHROME);                      // chute & flap
    const gum = ['#d8303a', '#f0c02a', '#3a8ad0', '#3aa04a', '#f4f0ea', '#f07a2a', '#d060a0'];
    m.sphere(8, 33, 8, 6.2, GLASS, (x, y) => y >= 36);
    m.sphere(8, 33, 8, 6.2, gum[0], (x, y) => y < 36);
    for (let y = 26; y < 36; y++) for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) {
      if (m.get(x, y, z) && y > 26) m.set(x, y, z, gum[hash3(x, y, z) % gum.length]);
    }
    m.cyl(8, 39, 8, 3, 1, r); m.cyl(8, 40, 8, 1.5, 1, rd); m.set(8, 41, 8, CHROME);
  },
});

// Butcher's refrigerated display counter, 1.5 m wide, white enamel, slanted "glass" front (+z, customer).
// Trays of steaks, chops, ground beef, sausages, a ham, a chicken; parsley; price tags. Fluorescent strip.
defineProp('meat_counter', {
  size: [24, 20, 14], collide: [1.5, 1.2, 0.88],
  build(m) {
    m.box(0, 0, 1, 24, 1, 12, CHROME_D);                     // kick plate
    m.box(0, 1, 0, 24, 8, 13, ENAMEL);
    m.box(0, 1, 13, 24, 1, 1, CHROME_M); m.box(0, 7, 13, 24, 1, 1, CHROME_M);    // chrome bands
    label(m, 'MEATS', 12, 2, 13, '#b8202a', { align: 'center' });
    m.box(0, 8, 0, 24, 1, 14, '#2a2a2a');                    // black trim ledge
    m.box(1, 9, 1, 22, 1, 12, ENAMEL_D);                     // display floor
    m.box(1, 10, 1, 22, 1, 5, ENAMEL_D);                     // raised back step
    for (const x of [0, 23]) for (let y = 9; y < 18; y++) m.box(x, y, 0, 1, 1, 13 - Math.floor((y - 9) * 5 / 8), ENAMEL);
    for (let y = 9; y < 18; y++) { const z = 12 - Math.floor((y - 9) * 5 / 8); m.set(1, y, z, CHROME); m.set(22, y, z, CHROME); }
    m.box(0, 17, 0, 24, 1, 8, ENAMEL); m.box(0, 18, 0, 24, 1, 8, ENAMEL_D);   // top
    m.box(0, 16, 7, 24, 1, 1, CHROME); m.box(0, 9, 13, 24, 1, 1, CHROME);    // glass rails
    m.box(2, 16, 3, 20, 1, 1, glow('#f4f8ff', 0.6));        // fluorescent tube
    m.box(1, 9, 0, 22, 8, 1, '#c8ccc8');                     // butcher-side sliding doors
    m.box(11, 9, 0, 1, 8, 1, CHROME_M);
    // front trays (lower): steaks, ground beef, pork chops, sausages
    const tray = (x, z, w, d) => { m.box(x, 10, z, w, 1, d, '#f8f6f0'); };
    tray(2, 8, 5, 4); tray(8, 8, 4, 4); tray(13, 8, 4, 4); tray(18, 8, 4, 4);
    for (const [x, z] of [[2, 8], [4, 9], [2, 10], [5, 10]]) { m.box(x, 11, z, 2, 1, 2, '#a82a2a'); m.set(x, 11, z, '#f0e0d0'); }
    m.box(8, 11, 8, 4, 1, 4, '#c04a4a'); m.box(9, 12, 9, 2, 1, 2, '#c85454');
    for (const [x, z] of [[13, 8], [15, 9], [13, 10]]) { m.box(x, 11, z, 2, 1, 2, '#e0968c'); m.set(x + 1, 11, z + 1, '#f4e0d8'); }
    for (let z = 8; z < 12; z += 2) for (let x = 18; x < 22; x += 2) m.box(x, 11, z, 1, 1, 1, '#b86a58');
    for (let z = 8; z < 12; z += 2) for (let x = 19; x < 22; x += 2) m.set(x, 11, z + 1, '#b86a58');
    // back trays (raised): ham, chicken, bacon slab, liver
    tray(2, 2, 6, 4); tray(9, 2, 5, 4); tray(15, 2, 7, 4);
    m.box(3, 12, 2, 4, 2, 3, '#d0707a'); m.box(3, 12, 2, 4, 2, 1, '#8a4a2a'); m.box(4, 14, 3, 2, 1, 1, '#d0707a');
    m.box(10, 12, 2, 3, 2, 3, '#e8cc9a'); m.set(9, 12, 3, '#e8cc9a'); m.set(13, 12, 3, '#e8cc9a'); m.box(11, 14, 3, 1, 1, 1, '#e8cc9a');
    for (let x = 15; x < 22; x++) m.box(x, 12, 2, 1, 1, 3, x & 1 ? '#c8545a' : '#f4e4dc');
    // parsley & price tags
    for (const [x, y, z] of [[7, 11, 11], [12, 11, 8], [17, 11, 11], [8, 12, 2], [14, 12, 4]]) m.set(x, y, z, '#3f8a2e');
    for (const x of [4, 10, 15, 20]) { m.set(x, 11, 12, '#f8f8f0'); m.set(x, 12, 12, '#f8f8f0'); m.set(x, 12, 12, '#f8f8f0'); }
  },
});

// Fishmonger's display, 1/32 m voxels (1.5 m wide): a crushed-ice bed sloping down toward the
// customer (+z) with rows of haddock, mackerel & cod, two cooked lobsters and a live one, lemon slices,
// price cards and a "FRESH FISH" apron sign.
defineProp('fish_ice_display', {
  size: [48, 42, 32], scale: 1 / 32, collide: [1.5, 1.0, 1.0],
  build(m) {
    const top = (z) => 22 + Math.floor((31 - z) * 9 / 29);   // ice surface height per z
    // stand
    legs(m, 1, 0, 1, 46, 30, 12, '#7a8288', 2);
    m.box(1, 3, 1, 46, 1, 30, '#8a9298');
    m.box(0, 12, 0, 48, 2, 32, '#dcd8cc');                   // trough bottom
    m.box(0, 12, 30, 48, 11, 1, ENAMEL); m.box(0, 14, 0, 48, 20, 1, ENAMEL);   // apron + back
    m.box(1, 33, 0, 46, 9, 1, WOOD_D); m.box(2, 34, 1, 44, 7, 1, '#2a302c');   // chalk slate on the back
    label(m, 'LOBSTER 69¢', 24, 35, 2, '#f0ece0', { align: 'center' });
    label(m, 'FRESH FISH', 24, 15, 31, '#2a4a8a', { align: 'center' });
    m.box(4, 21, 31, 40, 1, 1, '#2a4a8a'); m.box(4, 13, 31, 40, 1, 1, '#2a4a8a');
    for (let z = 1; z < 30; z++) {
      const h = top(z);
      m.box(0, 14, z, 1, h - 13, 1, ENAMEL); m.box(47, 14, z, 1, h - 13, 1, ENAMEL);     // side walls
      m.box(1, 14, z, 46, h - 14, 1, ((z >> 1) & 1) ? '#e6eff2' : '#d4e4ea');              // ice
    }
    // a fish lying along x at (x, z) facing +x or -x
    const fish = (x, z, len, back, side, dir) => {
      const y = top(z);
      for (let i = 0; i < len; i++) {
        const xx = dir > 0 ? x + i : x + len - 1 - i;
        const body = i > 0 && i < len - 2, head = i >= len - 3;
        m.box(xx, y, z, 1, 1, 4, side);
        if (body) { m.box(xx, y + 1, z + 1, 1, 1, 2, head ? side : back); m.set(xx, y, z + 3, '#f0f2f0'); }
      }
      const tail = dir > 0 ? x - 1 : x + len;
      m.set(tail, y, z, back); m.set(tail, y, z + 3, back); m.set(tail, y + 1, z, back);
      const eye = dir > 0 ? x + len - 2 : x + 1, gill = dir > 0 ? x + len - 4 : x + 3;
      m.set(eye, y + 1, z + 2, '#101010'); m.set(gill, y + 1, z + 2, '#8a8078');
    };
    const rows = [
      [26, '#6a7a86', '#c4ccd2', 12], [20, '#2a5a6a', '#b8c8c8', 10], [14, '#6a6a4a', '#c8c4b0', 13], [8, '#6a7a86', '#c4ccd2', 12], [2, '#2a5a6a', '#b8c8c8', 10],
    ];
    rows.forEach(([z, back, side, len], r) => {
      if (r === 0) return;                                    // front row is lobsters & lemons
      for (let x = 3, i = 0; x + len < 46; x += len + 3, i++) fish(x, z, len, back, side, (i + r) & 1 ? 1 : -1);
    });
    // mackerel bars
    for (const z of [2, 20]) for (let x = 4; x < 45; x += 3) { const y = top(z) + 1; if (m.get(x, y, z + 1)) m.set(x, y, z + 1, '#1a3a44'); }
    // lobsters along the front row
    const lobster = (x0, c, cd) => {
      const z = 24, y = top(25);
      for (let i = 0; i < 6; i++) m.box(x0 + i, y, z + 1, 1, 1, 3, i & 1 ? c : cd);           // tail segments
      m.box(x0 - 2, y, z + 1, 2, 1, 3, cd); m.set(x0 - 3, y, z, cd); m.set(x0 - 3, y, z + 4, cd);  // tail fan
      m.box(x0 + 6, y, z + 1, 5, 2, 3, c);                                                   // carapace
      m.set(x0 + 10, y + 2, z + 1, '#101010'); m.set(x0 + 10, y + 2, z + 3, '#101010');
      m.box(x0 + 11, y, z, 3, 1, 1, c); m.box(x0 + 11, y, z + 4, 3, 1, 1, c);             // arms
      m.box(x0 + 13, y, z - 1, 4, 2, 2, cd); m.box(x0 + 13, y, z + 4, 4, 2, 2, cd);       // claws
      m.set(x0 + 16, y + 1, z - 1, c); m.set(x0 + 16, y + 1, z + 5, c);
      m.box(x0 + 11, y + 1, z + 2, 5, 1, 1, cd);                                          // antennae
      for (let i = 0; i < 3; i++) { m.set(x0 + 7 + i, y, z, cd); m.set(x0 + 7 + i, y, z + 4, cd); } // legs
    };
    lobster(3, '#c8382a', '#a02a20'); lobster(29, '#c8382a', '#a02a20');
    lobster(16, '#2e4656', '#1e3040');                       // a live one, still dark green-blue
    for (const x of [22, 25, 44]) { const y = top(27); m.box(x, y, 27, 2, 1, 2, '#f0d23a'); m.set(x, y, 27, '#f8f0b0'); }
    for (const x of [21, 44]) { const y = top(24); m.box(x, y, 23, 2, 1, 1, '#3f8a2e'); }
    // little price cards on picks
    for (const [x, z] of [[7, 13], [22, 7], [38, 13], [30, 19]]) {
      const y = top(z) + 1;
      m.box(x, y, z, 1, 2, 1, '#d8d0b0'); m.box(x - 2, y + 2, z, 5, 3, 1, '#f8f6ee'); m.box(x - 1, y + 3, z + 1, 3, 1, 1, '#b8202a');
    }
  },
});

// Bakery shop-window display (sits behind the glass, faces the street +z): three white stepped tiers
// with lace doilies — cupcakes, a lattice pie & cookies in front; loaves & a braided loaf in the middle;
// a frosted layer cake with cherries and a stack of doughnuts at the back. 1/16 m voxels.
defineProp('bread_display_window', {
  size: [24, 16, 12], collide: [1.5, 0.6, 0.75],
  build(m) {
    const wh = '#f2eee4', lace = '#fbfaf6', crust = '#b8742e', crustL = '#d49a50', crustD = '#8a5020';
    m.box(0, 0, 0, 24, 3, 12, wh); m.box(0, 3, 0, 24, 3, 8, wh); m.box(0, 6, 0, 24, 3, 4, wh);
    for (const [y, z] of [[3, 11], [6, 7], [9, 3]]) for (let x = 0; x < 24; x += 2) m.set(x, y - 1, z + 1, lace);
    // front tier: cupcakes, lattice pie, cookies
    for (let i = 0; i < 4; i++) { const x = 1 + i * 2; m.box(x, 3, 9, 1, 1, 1, i & 1 ? '#e8c0d0' : '#f4f0e8'); m.box(x, 4, 9, 1, 1, 1, i & 1 ? '#f090b0' : '#f8f4ec'); m.set(x, 5, 9, '#c8202a'); }
    m.box(10, 3, 8, 6, 1, 4, crustD); m.box(10, 4, 8, 6, 1, 4, crust);
    for (let x = 10; x < 16; x++) for (let z = 8; z < 12; z++) if ((x + z) % 2 === 0) m.set(x, 4, z, crustL);
    m.box(18, 3, 9, 4, 1, 2, '#c89048'); m.box(19, 4, 9, 2, 1, 2, '#b88038'); m.set(19, 5, 9, '#c89048');
    // middle tier: loaves, braided loaf
    for (const x of [1, 5]) { m.box(x, 6, 5, 3, 2, 2, crust); m.box(x, 8, 5, 3, 1, 2, crustD); m.set(x + 1, 8, 5, crustL); }
    for (let x = 9; x < 16; x++) m.box(x, 6, 5, 1, 2, 2, (x & 1) ? crust : crustL);
    m.box(10, 8, 5, 5, 1, 1, crustD);
    m.box(17, 6, 4, 4, 2, 3, '#5a3420'); m.box(18, 8, 5, 2, 1, 1, '#6e4430');
    // back tier: frosted layer cake on a stand, stack of doughnuts
    m.box(8, 9, 1, 2, 1, 2, '#e8e4dc'); m.box(6, 10, 0, 6, 1, 4, '#f4f0ea');
    m.box(6, 11, 0, 6, 4, 4, '#f6eef4'); m.box(6, 12, 0, 6, 1, 4, '#e890b0'); m.box(6, 15, 0, 6, 1, 4, '#fbf6f8');
    for (const x of [7, 9, 11]) m.set(x, 16 - 1, 1, '#c8202a');
    m.set(8, 15, 3, '#c8202a'); m.set(10, 15, 3, '#c8202a');
    for (let i = 0; i < 3; i++) { m.box(15, 9 + i, 1, 3, 1, 3, i === 2 ? '#f0e0e8' : '#c89048'); }
    m.set(16, 12, 2, '#8a5020');
    m.box(1, 9, 1, 3, 1, 2, '#c89048'); m.box(1, 10, 1, 3, 1, 2, '#6a3a20');
    m.box(19, 9, 3, 1, 3, 1, WOOD_D); m.box(18, 12, 3, 5, 3, 1, '#f8f8f0'); m.set(19, 13, 4, '#b8202a'); m.set(20, 13, 4, '#b8202a'); m.set(21, 13, 4, '#b8202a');
  },
});

// Cake stand: milk-glass pedestal plate with a cut layer cake under a glass dome (drawn as bright
// glass ribs), 1/32 m voxels, for a counter top. The cut wedge faces +z.
defineProp('cake_stand', {
  size: [16, 22, 16], scale: 1 / 32, collide: [0.45, 0.66, 0.45],
  build(m) {
    m.cyl(8, 0, 8, 4, 1, '#f0ece4'); m.cyl(8, 1, 8, 1.6, 3, '#f0ece4'); m.cyl(8, 4, 8, 7, 1, '#f4f0e8');
    // cake: sponge with filling, frosted shell
    for (let y = 5; y < 12; y++) m.cyl(8, y, 8, 5.2, 1, y === 8 ? '#d85a7a' : '#f0d49a');
    m.cyl(8, 12, 8, 5.2, 1, '#5a3020');
    for (let y = 5; y < 12; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const r = Math.hypot(x + 0.5 - 8, z + 0.5 - 8);
      if (r > 4.3 && r <= 5.2) m.set(x, y, z, '#5a3020');
    }
    for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6; m.set(Math.floor(8 + Math.cos(t) * 4.4), 13, Math.floor(8 + Math.sin(t) * 4.4), '#f8f0f0'); }
    for (const [x, z] of [[7, 7], [9, 8], [7, 9]]) m.set(x, 13, z, '#c8202a');
    m.clear(8, 5, 8, 6, 9, 6);                               // cut wedge (front-right quarter)
    // glass dome ribs + knob
    const rim = '#e8f4f8';
    for (let y = 5; y < 21; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x + 0.5 - 8, (y - 5) * 0.95, z + 0.5 - 8);
      if (Math.abs(d - 7.2) < 0.5 && ((x === 7 && z < 8) || (z === 7 && x < 8) || y === 5)) m.set(x, y, z, rim);
    }
    m.box(7, 20, 7, 2, 1, 2, GLASS); m.box(7, 21, 7, 2, 1, 2, rim);
  },
});

// Florist's tiered stand of galvanised buckets: front row low, back row raised. Blooms in tint A and
// tint B plus white daisies, yellow mums, gladioli & ferns. 1/16 m voxels.
defineProp('flower_buckets', {
  size: [20, 20, 10], collide: [1.25, 0.9, 0.62],
  build(m) {
    const stand = '#3e6a4a', standD = '#2e5038', zinc = '#b8c0c6', zincD = '#8a9298', stem = '#3f7a2e', leaf = '#2e6a28';
    m.box(0, 0, 5, 20, 2, 5, stand); m.box(0, 0, 0, 20, 6, 5, stand); m.box(0, 5, 0, 20, 1, 5, standD); m.box(0, 1, 5, 20, 1, 5, standD);
    const bucket = (x, y, z) => { col(m, x, y, z, 4, 4, zinc); m.box(x, y + 3, z, 4, 1, 4, zincD); m.clear(x, y + 3, z, 1, 1, 1); m.clear(x + 3, y + 3, z, 1, 1, 1); m.clear(x, y + 3, z + 3, 1, 1, 1); m.clear(x + 3, y + 3, z + 3, 1, 1, 1); };
    // a tight bunch: foliage dome studded with bloom heads in two shades
    const bunch = (x, y, z, c, c2, lift = 1) => {
      const b = y + 3 + lift;
      m.box(x + 1, y + 3, z + 1, 2, lift, 2, stem);
      m.box(x, b, z, 4, 2, 4, leaf); m.box(x + 1, b + 2, z + 1, 2, 1, 2, leaf);
      for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) if ((i + k) % 2 === 0) m.set(x + i, b + 2, z + k, (i * 3 + k) % 4 ? c : c2);
      for (let i = 0; i < 4; i++) { m.set(x + i, b + 1 - (i & 1), z + 3 + 1, i & 1 ? c2 : c); m.set(x - 1, b + (i & 1), z + i, c); m.set(x + 4, b + 1 - (i & 1), z + i, c2); }
      m.set(x + 1, b + 3, z + 2, c); m.set(x + 2, b + 3, z + 1, c2);
      m.set(x - 1, b - 1, z + 1, leaf); m.set(x + 4, b - 1, z + 2, leaf);
    };
    // front row
    bucket(1, 2, 5); bunch(1, 2, 5, TA(0.5), TA(0.4));
    bucket(8, 2, 5); bunch(8, 2, 5, '#f8f6ee', '#f0c030', 0);
    bucket(15, 2, 5); bunch(15, 2, 5, TB(0.5), TB(0.4));
    // back row (raised): mums, tint-A carnations with gladioli spikes, fern
    bucket(3, 6, 0); bunch(3, 6, 0, '#f0c030', '#d89020', 1);
    bucket(10, 6, 0); bunch(10, 6, 0, TA(0.58), TA(0.46), 2);
    for (const [x, z, h] of [[10, 1, 5], [12, 2, 6], [13, 0, 4]]) { m.box(x, 14, z, 1, h, 1, TA(0.55)); m.set(x, 14 + h, z, TA(0.62)); m.set(x, 13 + h, z, leaf); }
    m.box(15, 6, 0, 4, 1, 4, zincD); m.box(16, 7, 1, 2, 3, 2, leaf); m.set(15, 10, 0, leaf); m.set(18, 9, 3, leaf); m.set(16, 11, 2, leaf); m.set(18, 11, 0, leaf);
    for (const x of [2, 9, 16]) m.box(x, 1, 9, 2, 1, 1, '#f8f6ee');                // price cards on the step
  },
});

// ---------------------------------------------------------------- dry goods & clothing

// Display mannequin: 1950s female form in a full-skirted tint-A dress with white collar, belt & pearls,
// on a chrome disc base. ~1.8 m. Faces +z.
defineProp('mannequin', {
  size: [12, 29, 8], collide: [0.45, 1.8, 0.4],
  build(m) {
    const skin = '#e8d4c0', hair = '#4a3020', dress = TA(0.5), dressD = TA(0.42);
    m.cyl(6, 0, 4, 3.2, 1, CHROME_M);
    m.box(4, 1, 3, 1, 7, 1, skin); m.box(7, 1, 3, 1, 7, 1, skin);                 // legs
    m.box(4, 1, 3, 1, 1, 2, TB(0.35)); m.box(7, 1, 3, 1, 1, 2, TB(0.35));         // heels
    // full skirt, flaring
    for (let y = 7; y < 15; y++) {
      const w = y < 9 ? 10 : y < 11 ? 9 : y < 13 ? 7 : 6, d = y < 9 ? 7 : y < 11 ? 6 : y < 13 ? 5 : 4;
      m.box(6 - w / 2, y, 4 - d / 2, w, 1, d, y === 7 ? dressD : dress);
    }
    m.box(3.5, 15, 2.5, 5, 1, 3, '#1a1a1a');                 // belt
    m.set(6, 15, 5, GOLD);
    m.box(3.5, 16, 2.5, 5, 5, 3, dress); m.box(4, 18, 5, 4, 2, 1, dress);           // bodice + bust
    m.box(2.5, 20, 2.5, 7, 1, 3, dress);                     // shoulders
    m.box(4.5, 21, 3, 3, 1, 2, '#f8f6ee'); m.set(5, 20, 5, '#f8f6f0'); m.set(6, 20, 5, '#f8f6f0'); m.set(7, 20, 5, '#f8f6f0');  // collar & pearls
    m.box(2, 18, 3, 1, 2, 2, dress); m.box(9, 18, 3, 1, 2, 2, dress);             // cap sleeves
    m.box(2, 14, 3, 1, 4, 1, skin); m.box(9, 15, 3, 1, 3, 1, skin); m.set(8, 15, 3, skin);   // arms, right hand on hip
    m.box(5, 22, 3, 2, 1, 2, skin);                          // neck
    m.box(4, 23, 2, 3, 4, 3, skin);                          // head x4-6, y23-26, z2-4
    m.box(4, 27, 2, 3, 1, 3, hair); m.box(4, 23, 1, 3, 5, 1, hair);               // crown & back
    m.box(3, 24, 1, 1, 3, 3, hair); m.box(7, 24, 1, 1, 3, 3, hair);               // sides (set curls)
    m.box(4, 26, 4, 3, 1, 1, hair); m.box(5, 28, 1, 1, 1, 2, hair);                // bangs, top curl
    m.set(4, 25, 4, '#2a2020'); m.set(6, 25, 4, '#2a2020'); m.set(5, 23, 4, '#b8303a');   // eyes & lips
  },
});

// Chrome clothes rail (1.25 m) with dresses & blouses on hangers in tint A / tint B shades.
// Garments hang side-on along the rail; the end one faces out toward +x. Browsed from +z.
defineProp('dress_rack', {
  size: [20, 27, 9], collide: [1.25, 1.65, 0.55],
  build(m) {
    for (const x of [0, 19]) { m.box(x, 0, 0, 1, 1, 9, CHROME_D); m.box(x, 1, 4, 1, 25, 1, CHROME_M); }
    m.box(0, 26, 4, 20, 1, 1, CHROME);
    const cols = [TA(0.5), TB(0.5), TA(0.42), '#f4f0e6', TB(0.6), TA(0.58), TB(0.42), '#2a2a3a', TA(0.5), TB(0.5), '#e8d8b0', TA(0.44), TB(0.56), TA(0.6), TB(0.46), TA(0.5)];
    for (let i = 0; i < 16; i++) {
      const x = 2 + i, c = cols[i], long = i % 3 !== 1;
      m.set(x, 26, 4, CHROME_D); m.box(x, 25, 2, 1, 1, 5, '#8a6a48');             // hook & wooden hanger
      m.box(x, long ? 10 : 17, 2, 1, long ? 14 : 7, 5, c); m.box(x, 24, 3, 1, 1, 3, c);  // garment body + shoulders
      if (long) { m.box(x, 10, 1, 1, 5, 7, c); m.box(x, 15, 3, 1, 1, 3, c === '#2a2a3a' ? '#6a6a6a' : '#1a1a1a'); } // skirt flare & belt
      if (!long) { m.set(x, 24, 4, '#f8f6f0'); m.set(x, 22, 4, '#f8f6f0'); }     // buttons on blouses
    }
    m.box(18, 10, 1, 1, 5, 7, TA(0.5));
    m.box(0, 26, 3, 1, 1, 3, CHROME_D); m.box(19, 26, 3, 1, 1, 3, CHROME_D);
    m.box(4, 0, 3, 12, 1, 3, CHROME_D);                      // bottom bar (shoe shelf)
  },
});

// Angled shoe display, 1/32 m voxels (0.9 m wide): four slanted oak tiers of shoes, toes toward +z —
// brogues, black pumps, saddle shoes, red heels, loafers, children's Mary Janes.
defineProp('shoe_display', {
  size: [30, 36, 16], scale: 1 / 32, collide: [0.94, 1.1, 0.5],
  build(m) {
    const fr = OAK_D, sh = OAK;
    m.box(0, 0, 0, 2, 35, 16, fr); m.box(28, 0, 0, 2, 35, 16, fr); m.box(2, 0, 0, 26, 35, 1, '#c8b89a');
    m.box(0, 34, 0, 30, 2, 16, fr);
    const shoe = (x, y, z, c, sole, kind) => {
      m.box(x, y, z, 3, 1, 8, sole);
      if (kind === 'heel') { m.box(x, y + 1, z, 3, 2, 2, c); m.box(x, y + 1, z + 2, 3, 1, 6, c); m.box(x + 1, y - 2, z, 1, 2, 1, sole); m.clear(x + 1, y + 2, z, 1, 1, 1); }
      else if (kind === 'mary') { m.box(x, y + 1, z, 3, 2, 8, c); m.clear(x + 1, y + 2, z + 1, 1, 1, 4); m.box(x, y + 3, z + 4, 3, 1, 1, c); }
      else { m.box(x, y + 1, z, 3, 2, 8, c); m.box(x, y + 3, z, 3, 1, 3, c); m.clear(x + 1, y + 3, z + 1, 1, 1, 1); m.clear(x + 1, y + 2, z + 1, 1, 1, 3); }
      if (kind === 'saddle') m.box(x, y + 1, z + 3, 3, 2, 2, '#1a1a1a');
      if (kind === 'loafer') m.box(x, y + 2, z + 4, 3, 1, 1, '#4a2a18');
      if (kind === 'brogue') { m.set(x + 1, y + 2, z + 7, '#3a2010'); m.set(x, y + 2, z + 6, '#3a2010'); }
    };
    const tiers = [
      [['#6a3a1e', '#2a1a10', 'brogue'], ['#18181a', '#101010', 'heel'], ['#f4f0e6', '#b8563a', 'saddle']],
      [['#b8202a', '#1a1010', 'heel'], ['#7a4a28', '#3a2010', 'loafer'], ['#18181a', '#101010', 'brogue']],
      [['#f4f0e6', '#b8563a', 'saddle'], ['#1a1a24', '#101010', 'mary'], ['#c8a878', '#5a4028', 'heel']],
      [['#8a1a2a', '#301010', 'mary'], ['#18181a', '#101010', 'heel'], ['#6a3a1e', '#2a1a10', 'loafer']],
    ];
    tiers.forEach((row, t) => {
      const y = 2 + t * 8, z0 = 7 - t * 2;
      m.box(2, y - 1, z0, 26, 1, 9, sh); m.box(2, y - 1, z0 + 8, 26, 2, 1, fr);   // tier + toe rail
      row.forEach(([c, s, k], i) => { const x = 3 + i * 8.5; shoe(Math.round(x), y + 1, z0, c, s, k); shoe(Math.round(x) + 4, y + 1, z0, c, s, k); });
    });
    for (let t = 0; t < 4; t++) m.box(2, 0, 7 - t * 2, 26, 2 + t * 8 - 1, 1, fr);
  },
});

// Milliner's hat stand, 1/32 m voxels (~1.6 m): chrome pole with two arms; a wide-brimmed picture hat
// (tint B) on top, a pillbox (tint A) and a cloche with a feather (tint A dark). Faces +z.
defineProp('hat_display', {
  size: [30, 54, 16], scale: 1 / 32, collide: [0.45, 1.65, 0.45],
  build(m) {
    m.cyl(15, 0, 8, 6, 1, '#1a1a1a'); m.cyl(15, 1, 8, 4, 1, CHROME_M);
    m.box(14.5, 2, 7.5, 1, 42, 1, CHROME);
    m.box(7, 36, 7.5, 8, 1, 1, CHROME); m.box(7, 36, 7.5, 1, 4, 1, CHROME);       // left arm
    m.box(15, 26, 7.5, 8, 1, 1, CHROME); m.box(22, 26, 7.5, 1, 4, 1, CHROME);     // right arm
    for (const [x, y] of [[7, 40], [22, 30], [15, 44]]) m.cyl(x + 0.5, y, 8, 1.5, 1, '#e8e0d0');   // hat blocks
    // top: picture hat (tint B) with a tint A ribbon & bow
    m.cyl(15.5, 45, 8, 7.5, 1, TB(0.5)); m.cyl(15.5, 46, 8, 3.2, 3, TB(0.5)); m.cyl(15.5, 49, 8, 2.5, 1, TB(0.46));
    m.cyl(15.5, 46, 8, 3.3, 1, TA(0.5)); m.box(16, 46, 11, 3, 2, 1, TA(0.5)); m.set(17, 45, 12, TA(0.44));
    // left: pillbox (tint A) with a little white veil dotted at the front
    m.cyl(7.5, 41, 8, 3.2, 3, TA(0.5)); m.cyl(7.5, 44, 8, 3.2, 1, TA(0.44));
    for (let x = 5; x < 11; x += 2) m.set(x, 40, 11, '#f8f6f0');
    m.set(10, 43, 11, '#f8f6f0');
    // right: cloche (tint A, dark) with a feather
    m.sphere(22.5, 31, 8, 4, TA(0.38), (x, y) => y >= 31); m.cyl(22.5, 31, 8, 4.5, 1, TA(0.34));
    m.cyl(22.5, 32, 8, 3.9, 1, '#1a1a1a');
    for (let i = 0; i < 6; i++) m.set(25 + (i >> 1), 33 + i, 7, i < 5 ? '#e8d8b0' : '#b8a070');
  },
});

// Jeweller's counter case, 1/32 m voxels (1.0 m x 0.95 m): mahogany base, nickel-framed glass top,
// black & blue velvet trays of gold/silver rings, pearl strands, watches, brooches; a few glinting bits.
defineProp('jewelry_case', {
  size: [32, 30, 20], scale: 1 / 32, collide: [1.0, 0.95, 0.62],
  build(m) {
    m.box(0, 0, 0, 32, 2, 18, MAHOG_D); m.box(0, 2, 0, 32, 15, 20, MAHOG);
    m.box(2, 4, 19, 28, 11, 1, MAHOG_D); m.box(3, 5, 19, 26, 9, 1, MAHOG);          // front panel
    m.box(0, 16, 0, 32, 1, 20, MAHOG_D);
    m.box(1, 17, 1, 30, 1, 18, '#1c1c2a');                   // velvet floor
    frame(m, 0, 17, 0, 32, 13, 20, CHROME_M); m.box(0, 29, 0, 32, 1, 2, CHROME_M);
    const gold = GOLD, gl = { c: '#fff4c0', emit: 0.35 }, sil = '#e0e4e8', sl = { c: '#ffffff', emit: 0.35 };
    // ring trays
    for (const [x0, tray] of [[2, '#2a2a5a'], [12, '#1a1a1a']]) {
      m.box(x0, 18, 3, 8, 1, 6, tray);
      for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) {
        const x = x0 + 1 + i * 2, z = 4 + k * 3, c = (i + k) & 1 ? sil : gold;
        m.set(x, 19, z, c); m.set(x, 20, z, (i + k) % 3 === 0 ? { c: ['#d8203a', '#2a60e0', '#30b050'][i % 3], emit: 0.2 } : c);
      }
      m.set(x0 + 3, 20, 4, x0 === 2 ? gl : sl);
    }
    // pearl necklaces on a bust-form and strands laid out
    m.box(23, 18, 3, 5, 5, 3, '#1a1a1a'); m.box(24, 23, 4, 3, 2, 1, '#1a1a1a');
    for (let x = 23; x < 28; x++) m.set(x, 20 + (x === 23 || x === 27 ? 1 : 0), 6, '#f8f4ec');
    for (let x = 24; x < 27; x++) m.set(x, 21 - (x === 25 ? 1 : 0) + 0, 6, '#f4f0e0');
    m.set(25, 19, 6, gold);
    for (let i = 0; i < 9; i++) m.set(3 + i, 18, 12 + (i % 3 === 1 ? 1 : 0), '#f8f4ec');
    for (let i = 0; i < 9; i++) m.set(3 + i, 18, 15 + (i % 2), gold);
    // watches on a slanted stand
    m.box(14, 18, 11, 12, 2, 6, '#2a2a5a');
    for (const x of [15, 19, 23]) { m.box(x, 20, 12, 2, 1, 3, '#3a2418'); m.box(x, 20, 13, 2, 1, 1, x === 19 ? sil : gold); m.set(x, 21, 13, '#f8f6ee'); }
    // brooches & cufflinks
    for (const [x, c] of [[28, '#d8203a'], [29, '#2a60e0'], [27, '#30b050']]) { m.set(x, 18, 14, gold); m.set(x, 19, 14, { c, emit: 0.25 }); }
    m.set(28, 18, 17, sil); m.set(29, 18, 17, sil); m.set(28, 19, 16, sl);
    glint(m, 4, 21, 19, 4); glint(m, 20, 19, 19, 3);
  },
});

// Dressmaker's form: linen torso with seam lines on a wooden tripod, a yellow tape measure draped over
// the shoulders and a pincushion. ~1.5 m. Faces +z.
defineProp('sewing_dummy', {
  size: [10, 25, 10], collide: [0.45, 1.5, 0.45],
  build(m) {
    const lin = '#c8b898', seam = '#a09070', wd = WALNUT;
    m.box(1, 0, 4, 3, 1, 1, wd); m.box(6, 0, 4, 3, 1, 1, wd); m.box(4, 0, 6, 1, 1, 3, wd);   // tripod feet
    m.box(3, 1, 4, 1, 1, 1, wd); m.box(6, 1, 4, 1, 1, 1, wd); m.box(4, 1, 5, 1, 1, 2, wd);
    m.box(4, 1, 4, 2, 2, 2, wd); m.box(4.5, 3, 4.5, 1, 9, 1, wd); m.box(4, 7, 4, 2, 1, 2, BRASS);  // pole & adjuster
    const prof = [[12, 6, 5], [13, 7, 5], [14, 6, 5], [15, 5, 4], [16, 5, 4], [17, 6, 5], [18, 7, 5], [19, 7, 5], [20, 7, 4], [21, 5, 3]];
    for (const [y, w, d] of prof) m.box(5 - w / 2, y, 5 - d / 2, w, 1, d, lin);
    m.box(4, 22, 4, 2, 1, 2, lin); m.box(4.5, 23, 4.5, 1, 1, 1, wd); m.box(4, 24, 4, 2, 1, 2, wd);   // neck cap & knob
    m.box(3, 12, 7, 1, 9, 1, seam); m.box(6, 12, 7, 1, 9, 1, seam); m.box(3, 15, 6, 1, 2, 1, seam); m.box(6, 15, 6, 1, 2, 1, seam);
    m.box(2, 12, 2, 6, 1, 6, lin);
    // tape measure draped over the shoulders, hanging down the front
    m.box(3, 21, 3, 1, 1, 3, '#e8c83a'); m.box(6, 21, 3, 1, 1, 3, '#e8c83a');
    m.box(3, 14, 7, 1, 7, 1, '#e8c83a'); m.box(6, 16, 7, 1, 5, 1, '#e8c83a');
    for (const y of [15, 17, 19]) m.set(3, y, 7, '#2a2a2a');
    m.set(6, 18, 7, '#2a2a2a');
    m.box(7, 20, 4, 2, 1, 2, '#b8202a'); m.set(8, 21, 5, CHROME); m.set(7, 21, 4, CHROME);   // pincushion
  },
});

// Wall shelving of fabric bolts, back at z=0 (1.0 m x 1.9 m): flat bolts stacked with their folded
// ends toward +z in solids, gingham, stripes & polka dots (several in tint A / B), upright bolts on top.
defineProp('fabric_bolts', {
  size: [16, 31, 8], origin: [8, 0, 0], collide: [1.0, 1.9, 0.5],
  build(m) {
    const fr = '#8a6a48', frd = '#6e5236';
    m.box(0, 0, 0, 16, 26, 1, frd); m.box(0, 0, 0, 1, 26, 8, fr); m.box(15, 0, 0, 1, 26, 8, fr);
    for (const y of [0, 7, 13, 19, 25]) m.box(1, y, 1, 14, 1, 7, fr);
    const bolt = (x, y, w, c, pat, c2) => {
      m.box(x, y, 1, w, 1, 6, c);
      if (pat === 'check') for (let i = 0; i < w; i++) if (i & 1) m.set(x + i, y, 6, c2);
      if (pat === 'stripe') m.box(x + 1, y, 6, 1, 1, 1, c2);
      if (pat === 'dot') m.set(x + (w >> 1), y, 6, c2);
      m.box(x, y, 1, 1, 1, 5, '#e8dcc0');                      // cardboard core edge
    };
    const stacks = [
      [[TA(0.5)], ['#f4f0e6', 'check', '#c0302a'], [TB(0.5)], ['#2a3a6a', 'dot', '#f4f0e6'], ['#e8c23a']],
      [['#3a7a4a'], [TA(0.42), 'stripe', '#f4f0e6'], ['#f4f0e6', 'check', '#2a5ab0'], [TB(0.6)], ['#8a3a5a']],
      [['#c8a878'], ['#f4c0c8', 'dot', '#f8f8f0'], [TA(0.58)], ['#1a1a2a'], [TB(0.42), 'stripe', '#e8c23a']],
    ];
    // three shelves × three stacks of 3-5 bolts each
    for (let s = 0; s < 3; s++) {
      const y0 = [1, 8, 14][s];
      for (let k = 0; k < 3; k++) {
        const x = 1 + k * 5, n = s === 0 ? 5 : s === 1 ? 4 : 5;
        for (let i = 0; i < n; i++) { const [c, p, c2] = stacks[(k + s) % 3][(i + s) % 5]; bolt(x, y0 + i, 4, c, p, c2); }
      }
    }
    // upright bolts on top
    const up = [TA(0.5), '#f4f0e6', TB(0.5), '#c0302a', '#3a7a4a', TA(0.4), '#e8c23a'];
    for (let i = 0; i < 7; i++) { m.box(1 + i * 2, 20, 2, 1, 5 + (i % 3), 4, up[i]); m.box(1 + i * 2, 20, 2, 1, 1, 4, '#e8dcc0'); }
    m.box(0, 26, 0, 16, 2, 8, frd);
    m.box(1, 28, 3, 14, 3, 1, '#f4f0e6'); m.box(2, 29, 4, 12, 1, 1, '#c0302a');     // "sale" card on top
  },
});

// Laundry steam press (Hoffman type), 1.4 m wide: padded buck, raised steel head on a hinged arm,
// front handle bar, foot pedals, steam pipe with a pressure gauge. Operator stands at +z.
defineProp('laundry_press', {
  size: [22, 22, 13], collide: [1.4, 1.2, 0.8],
  build(m) {
    const body = '#5e6e62', bodyD = '#46544a';
    m.box(1, 0, 2, 20, 1, 10, bodyD); m.box(2, 1, 3, 18, 10, 8, body);
    m.box(3, 2, 11, 16, 7, 1, bodyD);                        // front panel
    m.box(4, 1, 11, 3, 1, 2, '#1a1a1a'); m.box(15, 1, 11, 3, 1, 2, '#1a1a1a');    // pedals
    m.box(1, 11, 3, 20, 1, 8, bodyD);
    // buck: tapered padded board
    m.box(2, 12, 4, 18, 1, 6, '#8a9298'); m.box(2, 13, 4, 18, 1, 6, '#f2efe6'); m.box(0, 13, 5, 2, 1, 4, '#f2efe6');
    // head raised (open), steel, on hinge arms at the back
    m.box(3, 17, 4, 16, 1, 6, '#b8c0c6'); m.box(4, 18, 5, 14, 1, 4, '#9aa2a8');
    m.box(3, 12, 1, 2, 7, 2, bodyD); m.box(17, 12, 1, 2, 7, 2, bodyD); m.box(3, 18, 1, 16, 1, 3, bodyD);
    m.box(4, 16, 10, 14, 1, 1, CHROME); m.box(4, 15, 10, 1, 2, 1, CHROME); m.box(17, 15, 10, 1, 2, 1, CHROME);  // handle bar
    // steam pipe & gauge
    m.box(20, 1, 1, 1, 20, 1, '#7a7a78'); m.box(19, 20, 1, 1, 1, 1, '#7a7a78');
    m.box(18, 19, 0, 3, 3, 1, '#2a2a2a'); m.box(19, 20, 0, 1, 1, 1, '#f4f0e0');
    m.cylZ(19.5, 20.5, 1, 1.5, 1, '#f4f0e0'); m.set(19, 21, 2, '#c0302a'); m.set(20, 20, 2, '#1a1a1a');
    // a folded shirt waiting on the end of the machine
    m.box(1, 12, 0, 4, 1, 3, '#f4f6f8'); m.box(2, 13, 0, 2, 1, 1, '#f4f6f8'); m.set(2, 12, 2, '#c8d0e0');
  },
});

// Twin soapstone laundry tubs on iron legs with brass faucets, a washboard & soap; a galvanised
// bucket beside. 1.35 m wide, rim at 0.9 m. Faces +z.
defineProp('laundry_tubs', {
  size: [22, 18, 12], collide: [1.35, 0.95, 0.7],
  build(m) {
    const st = '#5a605e', stD = '#484c4a';
    legs(m, 1, 0, 2, 16, 9, 8, IRON);
    m.box(0, 8, 1, 18, 7, 11, st);
    m.clear(1, 10, 2, 7, 5, 8); m.clear(10, 10, 2, 7, 5, 8); // two basins
    m.box(1, 9, 2, 7, 1, 8, stD); m.box(10, 9, 2, 7, 1, 8, stD);
    m.box(1, 10, 3, 7, 2, 6, '#8ab0c0');                      // water in the left tub
    m.box(0, 15, 0, 18, 3, 1, st);                           // backsplash
    for (const x of [4, 13]) { m.box(x, 16, 1, 1, 1, 2, BRASS); m.set(x, 15, 2, BRASS); m.set(x - 1, 17, 1, BRASS); m.set(x + 1, 17, 1, BRASS); }
    // washboard leaning in the right tub
    m.box(11, 10, 3, 5, 7, 1, OAK); for (let y = 11; y < 16; y++) m.box(12, y, 4, 3, 1, 1, y & 1 ? '#c8ccd0' : '#9aa0a6');
    m.box(3, 15, 10, 2, 1, 1, '#f0e0a0');                    // soap bar on the rim
    // galvanised bucket beside
    col(m, 18, 0, 5, 4, 6, '#b8c0c6'); m.box(18, 5, 5, 4, 1, 4, '#8a9298'); m.clear(19, 5, 6, 2, 1, 2); m.box(19, 4, 6, 2, 1, 2, '#8ab0c0');
    m.box(18, 7, 7, 4, 1, 1, '#6a6e72');
  },
});

// Finished laundry: a heap of brown-paper parcels tied with white string, numbered tickets.
// 1/32 m voxels, ~0.7 m wide.
defineProp('laundry_bundles', {
  size: [24, 20, 18], scale: 1 / 32, collide: [0.7, 0.55, 0.5],
  build(m) {
    const kr = ['#b58a5a', '#a87c4e', '#c49a68', '#9c7448'];
    const parcel = (x, y, z, w, h, d, k) => {
      m.box(x, y, z, w, h, d, kr[k % 4]);
      const cx = x + (w >> 1), cz = z + (d >> 1);
      m.box(cx, y, z - 0, 1, h, 1, '#f4f0e6'); m.box(cx, y + h - 1, z, 1, 1, d, '#f4f0e6'); m.box(cx, y, z + d - 1, 1, h, 1, '#f4f0e6');
      m.box(x, y + h - 1, cz, w, 1, 1, '#f4f0e6'); m.box(x, y, cz, 1, h, 1, '#f4f0e6'); m.box(x + w - 1, y, cz, 1, h, 1, '#f4f0e6');
      m.set(cx, y + h, cz, '#f4f0e6'); m.set(cx + 1, y + h, cz, '#f4f0e6');       // bow
      m.box(x + 1, y + 1, z + d - 1, 3, 2, 1, '#f8e8a0'); m.set(x + 2, y + 1, z + d - 1, '#b8202a');   // ticket
    };
    parcel(1, 0, 2, 11, 5, 8, 0); parcel(12, 0, 4, 10, 6, 9, 1); parcel(2, 0, 10, 9, 4, 7, 2);
    parcel(3, 5, 3, 9, 5, 7, 3); parcel(13, 6, 5, 8, 4, 7, 0); parcel(5, 10, 4, 7, 4, 6, 2);
    parcel(14, 10, 6, 6, 3, 5, 1);
  },
});

// ---------------------------------------------------------------- books, records, music, radio, toys, hardware

// Bookshop table (1.2 x 0.75 m, 1/32 m voxels) piled with stacks of new books (spines toward -x/+x,
// page edges toward +z), a row of upright books between bookends, and an open book on a little stand.
defineProp('book_rack', {
  size: [38, 34, 24], scale: 1 / 32, collide: [1.2, 0.8, 0.75],
  build(m) {
    m.box(0, 22, 0, 38, 2, 24, OAK); m.box(1, 21, 1, 36, 1, 22, OAK_D);
    legs(m, 1, 0, 1, 36, 22, 21, OAK_D, 2); m.box(3, 4, 3, 32, 1, 18, OAK_D);   // legs & lower shelf
    const covers = ['#8a2a2a', '#2a4a7a', '#2e5e3a', '#c89a3a', '#5a2a5a', '#1e2a3a', '#b8562a', '#6a7a8a', '#f0e8d0', '#3a6a7a'];
    const stack = (x, y, z, w, d, n, k0) => {
      for (let i = 0; i < n; i++) {
        const c = covers[(k0 + i * 3) % covers.length], wi = w - ((i * 7 + k0) % 2), di = d - ((i * 5 + k0) % 2);
        m.box(x, y + i, z, wi, 1, di, c);
        m.box(x + 1, y + i, z + di - 1, wi - 1, 1, 1, '#f2ecd8');                  // page edge (front)
        m.box(x + wi - 1, y + i, z + 1, 1, 1, di - 2, '#f2ecd8');                  // page edge (side)
      }
      const top = covers[(k0 + (n - 1) * 3) % covers.length];
      m.box(x + 2, y + n, z + 2, 3, 0, 1, top);
    };
    stack(2, 24, 13, 8, 10, 6, 0); stack(11, 24, 14, 7, 9, 4, 1); stack(20, 24, 13, 8, 10, 7, 2); stack(29, 24, 14, 7, 9, 5, 3);
    // upright row between bookends at the back
    m.box(2, 24, 3, 1, 7, 6, CHROME_D); m.box(26, 24, 3, 1, 7, 6, CHROME_D);
    for (let x = 3; x < 26; x++) { const h = 5 + ((x * 7) % 3); m.box(x, 24, 4, 1, h, 5, covers[(x * 3) % covers.length]); if (x % 4 === 0) m.set(x, 24 + h - 2, 8, '#d8b04a'); }
    // open book on a stand
    m.box(29, 24, 3, 7, 2, 5, OAK_D); m.box(29, 26, 3, 7, 1, 4, '#f8f4e8'); m.set(32, 26, 3, '#c8c0a8');
    for (const x of [30, 31, 33, 34]) m.set(x, 27, 5, '#3a3a3a');
    m.box(29, 27, 3, 7, 1, 1, '#f8f4e8');
    // books on the lower shelf
    stack(4, 5, 5, 8, 10, 3, 4); stack(24, 5, 6, 8, 9, 4, 5);
  },
});

// Record-shop browser bin, 1/32 m voxels (1.0 m wide, 0.9 m): two slanted bins of LP sleeves standing
// upright, fronts toward +z; the front sleeve in each shows cover art; divider tabs "JAZZ" & "POP".
defineProp('record_bins', {
  size: [32, 36, 20], scale: 1 / 32, collide: [1.0, 0.9, 0.62],
  build(m) {
    m.box(0, 0, 0, 32, 2, 20, WALNUT_D); m.box(0, 2, 0, 32, 16, 20, WALNUT);
    m.box(1, 3, 19, 30, 14, 1, WALNUT_L); m.box(2, 4, 19, 28, 12, 1, WALNUT);
    m.box(0, 18, 0, 32, 1, 20, WALNUT_D);
    m.box(0, 19, 0, 1, 10, 20, WALNUT); m.box(31, 19, 0, 1, 10, 20, WALNUT); m.box(15, 19, 0, 2, 10, 20, WALNUT);
    m.box(1, 19, 0, 30, 10, 1, WALNUT); m.box(1, 19, 19, 30, 4, 1, WALNUT_L);
    const sleeves = ['#c83a2a', '#2a3a6a', '#e8c23a', '#1a1a1a', '#3a8a6a', '#f0e8d8', '#8a3a7a', '#d87a2a', '#2a6a9a', '#6a1a1a'];
    for (const [x0, off] of [[1, 0], [17, 5]]) {
      for (let i = 0; i < 12; i++) {
        const z = 3 + i * 1.3, c = sleeves[(i + off) % sleeves.length];
        m.box(x0 + 1, 19, Math.round(z), 12, 10 + (i % 2), 1, c);
      }
      // front sleeve art
      const z = 18;
      m.box(x0 + 1, 19, z, 12, 11, 1, x0 === 1 ? '#1a2a4a' : '#f0e0c0');
    }
    // cover art 1: jazz — trumpet & notes on navy
    m.box(4, 25, 19, 6, 1, 1, '#d8b04a'); m.box(9, 24, 19, 2, 3, 1, '#d8b04a'); m.box(3, 25, 19, 1, 1, 1, '#d8b04a');
    m.set(5, 27, 19, '#f0e8d8'); m.set(7, 28, 19, '#f0e8d8'); m.box(3, 21, 19, 8, 1, 1, '#c83a2a');
    // cover art 2: pop crooner — red circle portrait on cream
    m.box(21, 23, 19, 5, 5, 1, '#c83a2a'); m.box(22, 24, 19, 3, 3, 1, '#e8c8a8'); m.box(22, 26, 19, 3, 1, 1, '#3a2a1a');
    m.box(19, 21, 19, 9, 1, 1, '#2a3a6a');
    // divider tabs sticking up at the back
    m.box(2, 29, 2, 13, 5, 1, '#f4f0e0'); label(m, 'JAZZ', 8, 29, 3, '#2a3a6a', { align: 'center' });
    m.box(18, 29, 2, 13, 5, 1, '#f4f0e0'); label(m, 'POP', 24, 29, 3, '#c83a2a', { align: 'center' });
  },
});

// Music-shop wall display, back at z=0, 1/32 m voxels (1.5 m x 2.0 m): a walnut slat board with two
// sunburst guitars, a banjo, a mandolin and a ukulele hanging from hooks.
defineProp('instrument_wall', {
  size: [48, 64, 6], scale: 1 / 32, origin: [24, 0, 0],
  build(m) {
    m.box(0, 8, 0, 48, 53, 1, WALNUT_D);
    for (let y = 8; y < 62; y += 6) m.box(0, y, 0, 48, 5, 1, WALNUT_L);
    m.box(0, 6, 0, 48, 2, 2, WALNUT_D); m.box(0, 61, 0, 48, 3, 2, WALNUT_D);
    const hook = (x, y) => { m.box(x, y, 1, 1, 1, 2, CHROME_D); m.set(x, y + 1, 2, CHROME_D); };
    // guitar hanging from the headstock: body centre (cx, by)
    const guitar = (cx, by, burst) => {
      const inside = (x, y) => Math.hypot(x, y + 1) <= 7.2 || Math.hypot(x, y - 8) <= 5.2 || (Math.abs(y - 3.5) < 1.5 && Math.abs(x) <= 5);
      for (let y = -8; y <= 12; y++) for (let x = -7; x <= 7; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1);
        const r = Math.min(Math.hypot(x, y + 1) / 7.2, Math.hypot(x, y - 8) / 5.2);
        const c = edge ? '#f0e6cc' : burst ? (r > 0.78 ? '#3a1a0a' : r > 0.55 ? '#8a3a12' : '#d8902a') : (r > 0.8 ? '#6a4020' : '#c8a060');
        m.box(cx + x, by + y, 1, 1, 1, 3, c);
      }
      m.cylZ(cx + 0.5, by + 4.5, 4, 2.3, 1, '#1a0e08');         // sound hole
      m.box(cx - 2, by - 4, 4, 5, 1, 1, '#2a1a10');              // bridge
      m.box(cx, by + 11, 2, 1, 16, 2, '#5a3a1e'); m.box(cx, by + 11, 4, 1, 16, 1, '#2a1a10');  // neck & fretboard
      for (let y = 13; y < 27; y += 3) m.set(cx, by + y, 4, '#8a8a80');
      m.box(cx - 1, by + 27, 2, 3, 5, 2, '#2a1a10');
      for (const y of [28, 30]) { m.set(cx - 2, by + y, 3, CHROME); m.set(cx + 2, by + y, 3, CHROME); }
      m.box(cx, by - 3, 4, 1, 14, 1, '#d8d8d0');                // strings (a pale line)
      hook(cx, by + 32);
    };
    guitar(10, 19, true); guitar(37, 21, false);
    // banjo: round pot with a cream head, chrome rim & brackets, long neck
    const bx = 23, bY = 22;
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      const r = Math.hypot(x, y);
      if (r <= 6.3) m.box(bx + x, bY + y, 1, 1, 1, 3, r > 5.2 ? CHROME : '#f2ead4');
    }
    for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6; m.set(Math.round(bx + Math.cos(t) * 5.8), Math.round(bY + Math.sin(t) * 5.8), 4, CHROME_D); }
    m.box(bx - 1, bY - 3, 4, 3, 1, 1, '#5a3a1e'); m.box(bx, bY - 5, 4, 1, 12, 1, '#d8d8d0');
    m.box(bx, bY + 7, 2, 1, 20, 2, '#4a2a14'); m.box(bx, bY + 7, 4, 1, 20, 1, '#1a1008');
    m.box(bx - 1, bY + 27, 2, 3, 4, 2, '#4a2a14'); m.set(bx - 2, bY + 28, 3, CHROME); m.set(bx + 2, bY + 28, 3, CHROME); m.set(bx + 2, bY + 30, 3, CHROME);
    hook(bx, bY + 32);
    // mandolin (teardrop) and ukulele along the top rail
    for (let y = 0; y <= 7; y++) for (let x = -4; x <= 4; x++) if (Math.hypot(x, (y - 3) * (y > 3 ? 0.6 : 1)) <= 4) m.box(6 + x, 42 + y, 1, 1, 1, 2, y > 5 ? '#c86a1a' : '#8a3a12');
    m.box(6, 50, 2, 1, 7, 1, '#4a2a14'); m.box(5, 57, 2, 3, 3, 1, '#2a1a10'); m.set(6, 45, 3, '#1a0e08'); hook(6, 60);
    for (let y = 0; y <= 9; y++) for (let x = -4; x <= 4; x++) if (Math.hypot(x, y - 3) <= 3.8 || Math.hypot(x, y - 7) <= 2.8) m.box(40 + x, 42 + y, 1, 1, 1, 2, '#d8a860');
    m.box(40, 52, 2, 1, 6, 1, '#6a4020'); m.box(39, 58, 2, 3, 2, 1, '#4a2a14'); m.set(40, 45, 3, '#2a1a10'); hook(40, 60);
  },
});

// Radio & television display stand, 1/32 m voxels (1.2 m wide): a 17-inch table TV (screen glows) on
// the top step; on the lower step a walnut cathedral radio, a maroon Bakelite set, a butterscotch
// Catalin radio and a white kitchen radio, dials lit.
defineProp('radio_display', {
  size: [38, 44, 16], scale: 1 / 32, collide: [1.2, 1.35, 0.5],
  build(m) {
    const st = '#e8e2d2', stD = '#b8b0a0';
    m.box(0, 0, 0, 38, 14, 16, st); m.box(0, 14, 0, 38, 8, 8, st);
    m.box(0, 13, 8, 38, 1, 8, stD); m.box(0, 21, 0, 38, 1, 8, stD); m.box(0, 0, 15, 38, 2, 1, stD);
    const dial = { c: '#f8e0a0', emit: 0.5 };
    // TV on the top step
    m.box(9, 22, 1, 20, 17, 7, WALNUT); m.box(9, 22, 7, 20, 1, 1, WALNUT_D);
    m.box(11, 26, 7, 14, 11, 1, '#30383a'); m.box(12, 27, 7, 12, 9, 1, { c: '#8aa4b4', emit: 0.45 });
    m.box(13, 28, 7, 5, 3, 1, { c: '#b8ccd8', emit: 0.5 });
    m.box(26, 27, 7, 2, 2, 1, '#d8c8a0'); m.box(26, 31, 7, 2, 2, 1, '#d8c8a0'); m.box(26, 34, 7, 2, 1, 1, BRASS);
    m.box(11, 23, 7, 14, 2, 1, '#b8a888');                   // speaker grille
    m.box(17, 39, 3, 1, 4, 1, CHROME); m.box(20, 39, 3, 1, 4, 1, CHROME); m.set(16, 43, 3, CHROME); m.set(21, 43, 3, CHROME);   // rabbit ears
    // radios on the lower step
    // cathedral
    m.box(1, 14, 10, 8, 7, 5, WALNUT); m.box(2, 21, 10, 6, 2, 5, WALNUT); m.box(3, 23, 10, 4, 1, 5, WALNUT);
    for (let x = 3; x < 7; x++) m.box(x, 17, 14, 1, 5, 1, x & 1 ? '#c8b080' : WALNUT_D);
    m.box(3, 15, 14, 4, 1, 1, dial); m.set(2, 15, 14, WALNUT_D); m.set(7, 15, 14, WALNUT_D);
    // maroon Bakelite
    m.box(10, 14, 10, 8, 6, 5, '#5a1a1a'); m.box(11, 20, 10, 6, 1, 5, '#5a1a1a');
    for (let y = 15; y < 19; y++) m.box(11, y, 14, 3, 1, 1, y & 1 ? '#3a1010' : '#7a2a2a');
    m.box(15, 16, 14, 2, 2, 1, dial); m.set(15, 15, 14, '#e8d8b0'); m.set(16, 15, 14, '#e8d8b0');
    // butterscotch Catalin with red knobs
    m.box(19, 14, 10, 9, 6, 5, '#e0a030'); m.box(20, 20, 10, 7, 1, 5, '#e0a030');
    for (let x = 20; x < 24; x++) m.box(x, 16, 14, 1, 3, 1, x & 1 ? '#b87818' : '#e0a030');
    m.box(24, 16, 14, 3, 3, 1, dial); m.set(20, 15, 14, '#c0202a'); m.set(26, 15, 14, '#c0202a');
    // white kitchen radio
    m.box(29, 14, 10, 8, 6, 5, '#f2eee4'); m.box(30, 20, 11, 6, 1, 3, '#f2eee4');
    m.box(30, 16, 14, 6, 1, 1, '#c8c0b0'); m.box(30, 18, 14, 6, 1, 1, '#c8c0b0'); m.box(31, 15, 14, 4, 1, 1, dial);
    // price cards
    for (const x of [3, 13, 22, 32]) m.box(x, 14, 15, 3, 1, 1, '#f8f8f0');
    m.box(4, 0, 15, 30, 1, 1, stD);
    label(m, 'RADIO & TV', 19, 5, 15, '#2a3a6a', { align: 'center' });
  },
});

// Toy-shop wall shelves, back at z=0, 1/32 m voxels (1.0 m x 1.6 m): dump truck, fire engine & wooden
// train; two dolls (tint A / B dresses) and a teddy bear; a tin robot, spinning top, jack-in-the-box &
// ABC blocks; a toy drum, baseball glove & ball and board-game boxes on top.
defineProp('toy_display', {
  size: [32, 54, 12], scale: 1 / 32, origin: [16, 0, 0], collide: [1.0, 1.65, 0.38],
  build(m) {
    const fr = '#f0ead8', frd = '#c8c0a8';
    m.box(0, 0, 0, 32, 52, 1, '#a8c4b0'); m.box(0, 0, 0, 1, 52, 12, fr); m.box(31, 0, 0, 1, 52, 12, fr);
    for (const y of [0, 13, 26, 39]) { m.box(1, y, 1, 30, 2, 11, fr); m.box(1, y + 1, 11, 30, 1, 1, frd); }
    m.box(0, 51, 0, 32, 3, 12, frd);
    const wheel = (x, y, z) => { m.box(x, y, z, 2, 2, 1, '#1a1a1a'); m.set(x, y + 1, z, '#8a8a8a'); };
    // --- shelf 1: dump truck, fire engine, train engine
    m.box(2, 3, 4, 4, 4, 5, '#e8c23a'); m.box(2, 5, 4, 1, 2, 5, '#a8c8d8');
    m.box(6, 3, 4, 7, 1, 5, '#6a6a6a'); m.box(6, 4, 4, 7, 3, 5, '#c8302a'); m.clear(7, 5, 5, 5, 2, 3);
    wheel(3, 2, 9); wheel(9, 2, 9); wheel(3, 2, 3); wheel(9, 2, 3);
    m.box(15, 3, 4, 9, 3, 5, '#c8302a'); m.box(15, 6, 4, 3, 2, 5, '#c8302a'); m.box(15, 6, 5, 1, 1, 3, '#a8c8d8');
    m.box(18, 6, 5, 6, 1, 3, '#d8d8d8'); for (let x = 18; x < 24; x += 2) m.set(x, 7, 6, '#d8d8d8');   // ladder
    m.set(16, 8, 6, '#e8c23a'); wheel(16, 2, 9); wheel(21, 2, 9);
    m.box(25, 3, 5, 5, 3, 4, '#1a1a1a'); m.box(28, 6, 5, 2, 3, 4, '#c8302a'); m.box(25, 6, 6, 1, 3, 2, '#1a1a1a');
    m.box(26, 2, 9, 1, 2, 1, '#c8302a'); m.box(28, 2, 9, 1, 2, 1, '#c8302a'); m.set(24, 3, 7, '#c8302a');
    // --- shelf 2: two dolls and a teddy bear
    const doll = (x, dress, hair) => {
      m.box(x + 1, 15, 6, 1, 3, 1, '#f0d8c0'); m.box(x + 3, 15, 6, 1, 3, 1, '#f0d8c0');
      m.box(x, 18, 5, 5, 2, 3, dress); m.box(x + 1, 20, 5, 3, 3, 3, dress);
      m.set(x, 21, 6, '#f0d8c0'); m.set(x + 4, 21, 6, '#f0d8c0');
      m.box(x + 1, 23, 5, 3, 3, 3, '#f0d8c0'); m.box(x + 1, 26, 5, 3, 1, 3, hair); m.box(x + 1, 24, 5, 3, 2, 1, hair);
      m.set(x, 25, 6, hair); m.set(x + 4, 25, 6, hair);
      m.set(x + 1, 24, 7, '#2a4a8a'); m.set(x + 3, 24, 7, '#2a4a8a'); m.set(x + 2, 23, 7, '#d8404a');
      m.box(x, 18, 8, 5, 1, 1, '#f8f6f0');                     // petticoat lace
    };
    doll(2, TA(0.5), '#e8c860'); doll(9, TB(0.5), '#6a3a1e');
    const bear = '#9a6a3a';
    m.sphere(21, 18, 6.5, 3.5, bear); m.sphere(21, 23, 6.5, 2.6, bear);
    m.box(19, 15, 7, 2, 2, 3, bear); m.box(22, 15, 7, 2, 2, 3, bear);
    m.box(18, 25, 6, 1, 2, 1, bear); m.box(23, 25, 6, 1, 2, 1, bear);
    m.box(20, 22, 9, 3, 2, 1, '#c8a070'); m.set(21, 23, 10, '#1a1a1a'); m.set(20, 24, 9, '#1a1a1a'); m.set(22, 24, 9, '#1a1a1a');
    m.box(19, 20, 9, 5, 1, 1, '#c8302a');                    // ribbon
    m.box(26, 15, 4, 4, 4, 5, '#2a5ab0'); m.box(26, 19, 4, 4, 1, 5, '#f0d23a');  // boxed toy
    // --- shelf 3: tin robot, spinning top, jack-in-the-box, ABC blocks
    const tin = '#b8c0c8', tinD = '#7a848c';
    m.box(3, 28, 6, 2, 3, 2, tinD); m.box(6, 28, 6, 2, 3, 2, tinD);
    m.box(2, 31, 5, 7, 6, 4, tin); m.box(3, 32, 9, 5, 3, 1, '#c8302a'); m.set(4, 33, 9, { c: '#f0d23a', emit: 0.4 }); m.set(6, 33, 9, { c: '#30c050', emit: 0.4 });
    m.box(1, 32, 6, 1, 4, 2, tinD); m.box(9, 32, 6, 1, 4, 2, tinD); m.box(1, 31, 7, 1, 1, 1, '#c8302a'); m.box(9, 31, 7, 1, 1, 1, '#c8302a');
    m.box(3, 37, 5, 5, 4, 4, tin); m.box(4, 38, 9, 3, 1, 1, { c: '#80d0ff', emit: 0.5 }); m.box(5, 41, 7, 1, 2, 1, tinD); m.set(5, 43, 7, '#c8302a');
    for (let i = 0; i < 4; i++) m.cyl(13.5, 28 + i, 7, 3 - i * 0.6, 1, i & 1 ? '#f0d23a' : '#c8302a');
    m.box(13, 32, 6, 1, 3, 1, '#6a4020'); m.box(13, 27, 6, 1, 1, 1, '#6a4020');
    m.box(18, 28, 5, 5, 5, 5, '#2a5ab0'); m.box(18, 28, 9, 5, 5, 1, '#f0d23a');
    m.box(19, 33, 6, 3, 2, 3, '#f0e0d0'); m.box(19, 35, 6, 3, 1, 3, '#c8302a'); m.set(20, 36, 7, '#f0d23a'); m.set(20, 34, 9, '#c8302a');
    m.box(23, 30, 7, 1, 1, 1, '#8a8a8a'); m.box(24, 30, 7, 1, 2, 1, '#8a8a8a');
    const bl = ['#c8302a', '#2a5ab0', '#3a9a4a', '#f0d23a'];
    for (const [x, y, z, i] of [[25, 28, 6, 0], [28, 28, 6, 1], [25, 31, 6, 2], [28, 28, 3, 3], [26, 34, 6, 3]]) { m.box(x, y, z, 3, 3, 3, bl[i]); m.set(x + 1, y + 1, z + 3, '#f8f6f0'); }
    // --- shelf 4: drum, glove & ball, board games
    m.cyl(6, 41, 6.5, 4, 6, '#c8302a'); m.cyl(6, 42, 6.5, 4, 4, '#f4f0e6'); m.cyl(6, 47, 6.5, 3.5, 1, '#f4f0e6');
    for (let i = 0; i < 4; i++) m.set(3 + i * 2, 43 + (i & 1) * 2, 10, GOLD);
    m.box(10, 47, 5, 1, 1, 5, '#e8d8b0'); m.box(12, 46, 4, 1, 3, 1, '#e8d8b0');
    m.box(13, 41, 5, 6, 5, 4, '#8a5a2a'); m.box(14, 46, 5, 4, 2, 4, '#8a5a2a');
    m.box(14, 43, 9, 4, 1, 1, '#6a3a1a'); m.sphere(21.5, 43.5, 8, 2.2, '#f4f0e6'); m.set(21, 44, 10, '#c8302a'); m.set(22, 43, 10, '#c8302a');
    m.box(24, 41, 2, 7, 1, 8, '#c8302a'); m.box(24, 42, 2, 7, 1, 8, '#2a5ab0'); m.box(24, 43, 2, 7, 1, 8, '#f0d23a'); m.box(25, 44, 3, 5, 1, 6, '#3a9a4a');
    m.set(26, 42, 10, '#f8f6f0'); m.set(28, 42, 10, '#f8f6f0');
  },
});

// Hardware-store pegboard of tools, back at z=0, 1/32 m voxels (1.25 m x 1.25 m): two hand saws,
// claw hammers, a graded set of wrenches, screwdrivers, pliers, a level and a brace & bit.
defineProp('tools_wall', {
  size: [40, 40, 5], scale: 1 / 32, origin: [20, 0, 0],
  build(m) {
    const peg = '#b89a70', hole = '#7a6448', steel = '#b8c0c8', steelD = '#7a848c';
    m.box(0, 0, 0, 40, 40, 1, peg);
    for (let y = 2; y < 40; y += 4) for (let x = 2; x < 40; x += 4) m.set(x, y, 0, hole);
    m.box(0, 0, 0, 40, 1, 2, WOOD_D); m.box(0, 39, 0, 40, 1, 2, WOOD_D); m.box(0, 0, 0, 1, 40, 2, WOOD_D); m.box(39, 0, 0, 1, 40, 2, WOOD_D);
    const pin = (x, y) => m.box(x, y, 1, 1, 1, 2, '#5a5a5a');
    // hand saws (blade along x, handle at right)
    for (const [x, y] of [[3, 31], [3, 24]]) {
      for (let i = 0; i < 15; i++) m.box(x + i, y + (i > 9 ? 0 : 0), 1, 1, 3 + Math.floor(i / 6), 1, steel);
      m.box(x, y, 2, 15, 1, 1, steelD);
      m.box(x + 15, y, 1, 4, 5, 1, WOOD_L); m.clear(x + 16, y + 1, 1, 2, 2, 1); m.box(x + 16, y + 1, 1, 2, 2, 1, peg);
      pin(x + 7, y + 6);
    }
    // claw hammers
    for (const [x, c] of [[25, WOOD_L], [29, '#c8302a'], [33, OAK]]) {
      m.box(x, 22, 1, 1, 10, 2, c); m.box(x - 2, 32, 1, 5, 2, 2, steelD); m.set(x - 2, 31, 1, steelD); m.set(x + 2, 34, 1, steelD);
      pin(x, 35);
    }
    // wrenches, graded
    for (let i = 0; i < 6; i++) { const x = 4 + i * 3, h = 6 + i; m.box(x, 14 - h + 6, 1, 1, h, 1, steel); m.box(x - 1, 14 + 6 - 1, 1, 3, 2, 1, steel); m.clear(x, 14 + 6, 1, 1, 1, 1); pin(x, 14 + 6 - h - 1 + h + 1 - 8); }
    // screwdrivers
    const hc = ['#c8302a', '#f0d23a', '#3a8a4a', '#2a5ab0', '#c8302a'];
    for (let i = 0; i < 5; i++) { const x = 25 + i * 3; m.box(x, 14, 1, 1, 4, 2, hc[i]); m.box(x, 9 + (i % 2), 1, 1, 5 - (i % 2), 1, steel); pin(x, 18); }
    // pliers
    m.box(4, 3, 1, 1, 5, 1, '#c8302a'); m.box(6, 3, 1, 1, 5, 1, '#c8302a'); m.box(4, 8, 1, 3, 2, 1, steelD); m.box(5, 10, 1, 1, 2, 1, steelD);
    // level
    m.box(10, 5, 1, 16, 2, 2, '#d8b060'); m.box(17, 6, 2, 2, 1, 1, { c: '#80e080', emit: 0.2 }); pin(12, 7); pin(23, 7);
    // brace & bit
    m.box(30, 2, 1, 1, 8, 1, steelD); m.box(30, 5, 1, 4, 1, 1, steelD); m.box(33, 5, 1, 1, 3, 1, steelD); m.box(34, 7, 1, 2, 2, 1, WOOD_L);
    m.box(29, 9, 1, 3, 2, 2, WOOD_L); m.box(30, 1, 1, 1, 1, 1, steel);
  },
});

// Lumber-yard rack (2.5 m long): three posts with arms carrying stacked pine boards of several sizes,
// pale end grain at +x/-x; a bundle of dowels on top. Browsed from +z.
defineProp('lumber_rack', {
  size: [40, 27, 10], collide: [2.5, 1.65, 0.62],
  build(m) {
    const post = '#5a5e62', pine = ['#c8a060', '#b89050', '#d4b070'], endg = '#e4c888';
    for (const x of [1, 19, 37]) { m.box(x, 0, 0, 2, 26, 2, post); m.box(x - 1, 0, 0, 4, 1, 9, post); }
    for (const y of [5, 11, 17, 23]) for (const x of [1, 19, 37]) m.box(x, y, 2, 2, 1, 8, post);
    const lv = [[6, [[1, 3], [2, 2], [1, 3]]], [12, [[2, 4], [1, 2], [1, 2]]], [18, [[1, 5], [1, 5]]]];
    lv.forEach(([y0, stack], li) => {
      let y = y0;
      stack.forEach(([h, d], i) => {
        for (let z = 2; z + d <= 10; z += d + 1) {
          const c = pine[(li + i + z) % 3];
          m.box(0, y, z, 40, h, d, c); m.box(0, y, z, 1, h, d, endg); m.box(39, y, z, 1, h, d, endg);
          if ((z + i) % 2) m.set(12 + li * 5, y + h - 1, z, '#a07848');    // knot
        }
        y += h;
      });
    });
    // dowels on the top arms
    for (let z = 3; z < 9; z += 2) m.box(0, 24, z, 40, 1, 1, pine[z % 3]);
    for (let z = 4; z < 8; z += 2) m.box(1, 25, z, 38, 1, 1, pine[(z + 1) % 3]);
  },
});

// =====================================================================================================
// BARBER, SODA FOUNTAIN, DINER, BAR & AMUSEMENTS
// =====================================================================================================

// Hydraulic barber chair: porcelain & chrome pedestal, oxblood-red leather seat (top at 0.5 m), padded
// arms, tall back with a paper-covered headrest and a chrome footrest in front. Customer faces +z.
defineProp('barber_chair', {
  size: [14, 23, 17], collide: [0.85, 1.1, 0.95],
  build(m) {
    const lea = '#8a1e22', leaD = '#6a1418', por = '#f0ece4';
    m.cyl(7, 0, 7, 4.2, 1, por); m.cyl(7, 1, 7, 3.2, 1, CHROME_M); m.cyl(7, 2, 7, 2, 3, por); m.cyl(7, 5, 7, 2.4, 1, CHROME);
    m.box(10, 2, 7, 3, 1, 1, CHROME_D); m.box(12, 2, 7, 1, 3, 1, CHROME_D);        // pump pedal
    m.box(2, 6, 2, 10, 1, 10, CHROME_D);                     // seat pan
    m.box(2, 7, 3, 10, 1, 9, lea); m.box(3, 8, 3, 8, 1, 8, lea); m.box(2, 7, 12, 10, 1, 1, CHROME);
    for (const x of [3, 5, 7, 9]) m.set(x + 0.5, 8, 11, leaD);                   // tufting
    // arms
    for (const x of [0, 12]) {
      m.box(x + 0.5, 7, 3, 1, 4, 1, CHROME); m.box(x + 0.5, 7, 10, 1, 4, 1, CHROME);
      m.box(x, 11, 2, 2, 1, 10, lea); m.box(x, 10, 11, 2, 1, 1, CHROME);
    }
    // back (leans slightly back toward -z)
    for (let y = 8; y < 19; y++) { const z = 2 - Math.floor((y - 8) / 6); m.box(2, y, z, 10, 1, 2, lea); m.box(1, y, z, 1, 1, 2, CHROME_M); m.box(12, y, z, 1, 1, 2, CHROME_M); }
    for (const y of [11, 14, 17]) m.box(3, y, 3 - (y > 13 ? 1 : 0), 8, 1, 1, leaD);   // channel tufts
    m.box(6, 19, 0, 2, 1, 1, CHROME); m.box(4, 20, 0, 6, 3, 2, lea); m.box(4, 20, 2, 6, 3, 1, '#f8f8f4');  // headrest + paper
    // footrest: chrome bars to a ribbed plate in front
    m.box(5, 4, 11, 1, 1, 4, CHROME_D); m.box(8, 4, 11, 1, 1, 4, CHROME_D);
    m.box(3, 3, 14, 8, 1, 3, CHROME_M); for (let x = 3; x < 11; x += 2) m.box(x, 4, 14, 1, 1, 3, CHROME); m.box(3, 4, 16, 8, 1, 1, CHROME);
  },
});

// Barber's back-bar station, back at z=0 (1.25 m): porcelain counter with a sink & drawers, big mirror
// with glass shelf of tonics (bay rum, lilac, amber), shaving mug & brush, a blue Barbicide jar of combs,
// clippers, and a razor strop hanging at the side.
defineProp('barber_mirror_station', {
  size: [20, 34, 8], origin: [10, 0, 0], collide: [1.25, 0.95, 0.5],
  build(m) {
    const top = '#f2eee6', wd = OAK_D;
    m.box(0, 0, 0, 20, 1, 7, WALNUT_D); m.box(0, 1, 0, 20, 13, 7, wd);
    for (const [x, w] of [[1, 5], [14, 5]]) for (const y of [2, 6, 10]) { m.box(x, y, 7, w, 3, 1, OAK); m.set(x + (w >> 1), y + 1, 8, BRASS); }
    m.box(7, 2, 7, 6, 11, 1, OAK); m.box(8, 3, 7, 4, 9, 1, OAK_D);               // door
    m.box(0, 14, 0, 20, 1, 8, top); m.box(0, 14, 7, 20, 1, 1, CHROME_M);
    m.box(8, 13, 2, 5, 2, 4, 0); m.box(8, 12, 2, 5, 1, 4, '#dcd8d0'); m.set(10, 12, 3, '#6a6a6a');   // sink
    m.box(10, 15, 1, 1, 2, 1, CHROME); m.box(10, 17, 1, 1, 1, 2, CHROME); m.set(9, 15, 1, CHROME); m.set(11, 15, 1, CHROME);
    // mirror
    m.box(0, 15, 0, 20, 19, 1, OAK_D); m.box(1, 17, 0, 18, 15, 1, '#a8bcc6');
    for (let i = 0; i < 6; i++) { m.set(3 + i, 22 + i, 0, '#d8e8ee'); m.set(4 + i, 22 + i, 0, '#d8e8ee'); }
    m.box(0, 33, 0, 20, 1, 2, OAK); m.box(7, 32, 0, 6, 2, 1, OAK);
    m.box(1, 18, 1, 18, 1, 2, '#c8dce0');                    // glass shelf
    const tonics = ['#3a8a4a', '#b8782a', '#8a4aa8', '#c83a2a', '#3a8a4a', '#e8d070', '#2a6a9a'];
    tonics.forEach((c, i) => { const x = 2 + i * 2 + (i > 3 ? 3 : 0); m.box(x, 19, 1, 1, 2, 1, c); m.set(x, 21, 1, CHROME); });
    // counter-top clutter
    m.box(2, 15, 3, 2, 3, 2, '#3a6ad0'); m.box(2, 17, 3, 2, 1, 2, '#6a9ae8');    // Barbicide jar
    m.set(2, 18, 3, '#1a1a1a'); m.set(3, 18, 4, '#1a1a1a'); m.set(3, 19, 3, '#1a1a1a');   // combs
    m.box(5, 15, 3, 1, 2, 1, '#f4f0e6'); m.set(5, 17, 3, '#c8a878');              // shaving mug & brush
    m.box(15, 15, 3, 2, 1, 3, '#2a2a2a'); m.set(16, 15, 6, CHROME);               // clippers
    m.box(17, 15, 2, 2, 2, 2, '#f0ece0'); m.set(17, 16, 3, '#c8202a');            // talc tin
    m.box(19, 6, 7, 1, 8, 1, '#6a3a1a'); m.set(19, 14, 7, CHROME_D);              // razor strop
  },
});

// Barber pole, 1/32 m voxels (~1.1 m): wall-mounted. Origin = centre-bottom of the wall mount, i.e. the
// back face (z=0) sits on the wall and the pole stands 0.2 m out from it. Red/white/blue spiral in a
// glass cylinder, chrome caps, milk-glass globe on top that glows at night.
defineProp('barber_pole', {
  size: [12, 36, 12], scale: 1 / 32, origin: [6, 0, 0], cat: 'exterior',
  light: lampLight(0, 1.02, 0.19, [1.0, 0.9, 0.8], 3, 'night'),
  build(m) {
    const cx = 6, cz = 6;
    m.box(3, 5, 0, 6, 3, 1, CHROME_D); m.box(5, 6, 1, 2, 1, 3, CHROME);           // lower bracket
    m.box(3, 27, 0, 6, 3, 1, CHROME_D); m.box(5, 28, 1, 2, 1, 3, CHROME);         // upper bracket
    m.set(cx, 0, cz, CHROME); m.cyl(cx, 1, cz, 2, 1, CHROME); m.cyl(cx, 2, cz, 3.6, 3, CHROME_M); m.cyl(cx, 4, cz, 3.9, 1, CHROME);
    const R = '#c8202a', W = '#f4f4f0', B = '#2a4ab0', cols = [R, R, R, W, B, B, B, W];
    for (let y = 5; y < 27; y++) for (let z = 0; z < 12; z++) for (let x = 0; x < 12; x++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz, r = Math.hypot(dx, dz);
      if (r > 3.5) continue;
      const a = (Math.atan2(dz, dx) / (2 * Math.PI) + 1) % 1;
      m.set(x, y, z, r < 2.6 ? W : cols[Math.floor(a * 8 + y / 1.3) % 8]);
    }
    m.cyl(cx, 27, cz, 3.9, 1, CHROME); m.cyl(cx, 28, cz, 3.2, 1, CHROME_M);
    m.sphere(cx, 31.5, cz, 3.4, { c: '#f8f4ea', emit: 0.55 });
    m.cyl(cx, 34, cz, 1.5, 1, CHROME); m.set(cx, 35, cz, CHROME);
  },
});

// Shoeshine stand: raised oak platform with steps, a leather armchair on top, brass shoe-shaped foot
// rests, and a drawer of polish tins & brushes in front. Customer faces +z (the shiner kneels at +z).
defineProp('shoeshine_stand', {
  size: [16, 32, 18], collide: [1.0, 1.6, 1.1],
  build(m) {
    const lea = '#5a2a1a';
    m.box(0, 0, 0, 16, 7, 14, OAK_D); m.box(0, 7, 0, 16, 1, 14, OAK);
    m.box(1, 1, 14, 14, 3, 3, OAK_D); m.box(1, 4, 14, 14, 1, 3, OAK);          // step
    m.box(2, 1, 17, 12, 2, 1, OAK); m.box(3, 2, 17, 10, 1, 1, OAK_D);           // polish drawer
    m.box(3, 3, 17, 2, 1, 1, '#1a1a1a'); m.box(6, 3, 17, 2, 1, 1, '#6a3a1a'); m.box(9, 3, 17, 2, 1, 1, '#b8202a'); m.box(12, 3, 17, 1, 1, 1, '#c8a878');
    for (const x of [1, 14]) m.box(x, 8, 0, 1, 5, 11, OAK_D);                   // chair sides
    m.box(1, 8, 1, 14, 5, 10, OAK_D);
    m.box(2, 13, 2, 12, 2, 9, lea); m.box(2, 15, 1, 12, 13, 2, lea);           // seat & back
    for (const y of [18, 22]) m.box(3, y, 3, 10, 1, 1, '#4a2014');
    for (const x of [0, 14]) { m.box(x, 13, 1, 2, 8, 1, OAK_D); m.box(x, 20, 1, 2, 1, 11, OAK); m.box(x, 13, 10, 2, 7, 1, OAK_D); }
    m.box(1, 28, 0, 14, 2, 3, OAK); m.box(4, 30, 1, 8, 1, 1, OAK);
    // foot rests on brass posts
    for (const x of [4, 10]) { m.box(x + 0.5, 7, 11, 1, 4, 1, BRASS); m.box(x, 11, 11, 2, 1, 3, BRASS_L); m.box(x, 12, 11, 2, 1, 1, BRASS); }
  },
});

// Soda-fountain counter module (1.0 m): customers sit at +z (red & cream enamel front, marble top with
// chrome nosing); on the server's side (-z) stand chrome soda taps, syrup pumps and a green milkshake
// mixer with its steel cup, plus a stack of sundae dishes.
defineProp('soda_fountain', {
  size: [16, 26, 12], collide: [1.0, 1.05, 0.75],
  build(m) {
    const red = '#b8202a', cream = '#f2ead6', marble = '#f0ece6';
    m.box(0, 0, 1, 16, 1, 10, '#2a2a2a');
    m.box(0, 1, 0, 16, 14, 11, '#c8ccd0');                   // stainless server-side body
    m.box(0, 1, 11, 16, 14, 1, cream);                        // customer front
    for (let x = 0; x < 16; x += 4) m.box(x + 1, 2, 11, 2, 12, 1, red);          // red enamel flutes
    m.box(0, 1, 11, 16, 1, 1, CHROME); m.box(0, 13, 11, 16, 1, 1, CHROME);
    m.box(0, 15, 0, 16, 1, 12, marble); m.box(0, 15, 11, 16, 1, 1, CHROME);      // top & nosing
    for (const x of [3, 9]) m.set(x, 15, 8, '#dcd4cc');                           // marble veins
    // server side: ice-cream cabinet lids below the counter edge
    for (const x of [1, 6, 11]) { m.box(x, 13, 0, 4, 1, 1, CHROME_M); m.set(x + 1, 12, 0, '#2a2a2a'); }
    // fountain head: chrome taps on a pedestal
    m.box(4, 16, 3, 8, 3, 2, CHROME_M); m.box(4, 19, 3, 8, 1, 2, CHROME);
    for (const x of [5, 8, 11]) { m.box(x - 0.5, 20, 3, 1, 3, 1, CHROME); m.box(x - 0.5, 22, 2, 1, 1, 2, CHROME); m.set(x - 0.5, 21, 2, CHROME_D); m.set(x - 0.5, 23, 4, '#1a1a1a'); }
    // syrup pumps with coloured labels
    for (const [x, c] of [[1, '#6a3a1a'], [2.5, '#c8202a'], [14, '#f0d23a']]) { m.box(x, 16, 1, 1, 3, 1, c); m.box(x, 19, 1, 1, 1, 1, CHROME); m.set(x, 20, 1, CHROME_D); }
    // milkshake mixer (green) on the right
    m.box(13, 16, 5, 2, 1, 3, '#3a8a5a'); m.box(13, 17, 5, 2, 6, 1, '#3a8a5a'); m.box(13, 22, 5, 2, 2, 3, '#3a8a5a');
    m.box(13.5, 17, 6, 1, 3, 1, CHROME); m.set(13.5, 21, 7, CHROME_D);
    // stack of sundae dishes & a glass holder
    m.box(1, 16, 5, 2, 1, 2, GLASS); m.box(1, 17, 5, 2, 1, 2, GLASS); m.box(1, 18, 5, 2, 1, 2, '#e4f0f2');
    m.box(6, 16, 7, 1, 2, 1, GLASS); m.box(8, 16, 7, 1, 2, 1, GLASS); m.box(10, 16, 7, 1, 2, 1, GLASS);
  },
});

// Soda-fountain / lunch-counter stool: chrome pedestal, red vinyl cushion with a chrome band, seat at
// 0.7 m. Bolted to the floor; rotationally symmetric.
defineProp('soda_stool', {
  size: [8, 12, 8], collide: [0.4, 0.72, 0.4],
  build(m) {
    m.cyl(4, 0, 4, 3, 1, CHROME_M); m.cyl(4, 1, 4, 1.6, 1, CHROME);
    m.cyl(4, 2, 4, 1, 7, CHROME); m.cyl(4, 5, 4, 3.2, 1, CHROME_D);
    m.cyl(4, 5, 4, 2.5, 1, 0);
    m.box(1, 5, 3.5, 6, 1, 1, CHROME_D); m.box(3.5, 5, 1, 1, 1, 6, CHROME_D);     // foot ring spokes
    m.cyl(4, 9, 4, 3.2, 1, CHROME); m.cyl(4, 10, 4, 3.2, 1, '#b8202a'); m.cyl(4, 11, 4, 2.6, 1, '#c8303a');
  },
});

// A pair of tall fluted soda glasses — chocolate & strawberry milkshakes with whipped cream, cherries
// and striped straws — and the steel mixing cup. 1/32 m voxels, for a counter top.
defineProp('milkshake_glasses', {
  size: [18, 22, 8], scale: 1 / 32, collide: false,
  build(m) {
    const glass = (x, fill) => {
      m.box(x + 1, 0, 3, 3, 1, 3, GLASS); m.box(x + 2, 1, 4, 1, 2, 1, GLASS);
      for (let y = 3; y < 13; y++) { const w = y < 6 ? 3 : 5, o = y < 6 ? 1 : 0; m.box(x + o, y, 2 + o, w, 1, w, y < 12 ? fill : GLASS); }
      m.box(x, 13, 2, 5, 2, 5, '#fbf8f0'); m.box(x + 1, 15, 3, 3, 1, 3, '#fbf8f0'); m.set(x + 2, 16, 4, '#fbf8f0');
      m.set(x + 2, 17, 4, '#c8102a'); m.set(x + 2, 18, 5, '#3a6a2a');
      for (let i = 0; i < 6; i++) m.set(x + 3 + (i >> 2), 13 + i, 3, i & 1 ? '#f8f8f8' : '#d8202a');
    };
    glass(0, '#7a4a2a'); glass(6, '#f0a0b0');
    m.box(12, 0, 2, 5, 12, 5, CHROME_M); m.box(12, 11, 2, 5, 1, 5, CHROME); m.clear(13, 11, 3, 3, 1, 3); m.box(13, 10, 3, 3, 1, 3, '#e8d0b8');
    m.box(13, 3, 3, 3, 4, 3, CHROME_D);
  },
});

// Wurlitzer-style jukebox (1.55 m): walnut cabinet, glowing coloured arch and bubble-tube pilasters,
// window onto the record changer, chrome title-strip panel & selector buttons, gilt speaker grille.
// Casts a warm coloured glow into the room when the room lamps are on.
defineProp('jukebox', {
  size: [16, 25, 11], collide: [1.0, 1.55, 0.7], light: lampLight(0, 1.1, 0.45, [1.0, 0.62, 0.35], 4.5, 'room'),
  build(m) {
    const wal = '#6a3a1e', walD = '#4a2814';
    m.box(0, 0, 0, 16, 1, 11, walD); m.box(1, 1, 0, 14, 16, 10, wal);
    // gilt grille
    m.box(4, 2, 10, 8, 7, 1, '#3a2a1a');
    for (let y = 2; y < 9; y++) for (let x = 4; x < 12; x++) if ((x + y) % 2 === 0) m.set(x, y, 10, BRASS_L);
    // bubble-tube pilasters
    const tube = [{ c: '#ff7a2a', emit: 0.95 }, { c: '#ffd040', emit: 0.95 }, { c: '#ff4040', emit: 0.95 }];
    for (const x of [0, 14]) { m.box(x, 1, 1, 2, 16, 9, wal); for (let y = 2; y < 17; y++) m.box(x, y, 9, 2, 1, 2, tube[(y >> 1) % 3]); }
    // selector panel & title strips
    m.box(3, 9, 10, 10, 1, 1, CHROME); m.box(3, 10, 9, 10, 2, 2, CHROME_M);
    for (let x = 4; x < 12; x++) m.set(x, 11, 10, x & 1 ? '#f8f4e8' : '#e8e0c8');
    for (let x = 4; x < 12; x += 2) m.set(x, 10, 11, '#c8202a');
    // record changer window
    m.box(3, 12, 3, 10, 5, 7, { c: '#2a2030', emit: 0.2 });
    m.clear(3, 12, 8, 10, 5, 3);
    m.box(5, 13, 5, 6, 1, 3, '#101010'); m.box(5, 14, 5, 6, 1, 3, '#181818'); m.set(8, 15, 6, CHROME); m.box(7, 13, 7, 3, 1, 1, { c: '#ffd040', emit: 0.6 });
    m.box(3, 12, 10, 10, 1, 1, CHROME); frame(m, 2, 12, 8, 12, 5, 3, CHROME_D);
    // glowing arch on top
    for (let y = 16; y < 25; y++) for (let x = 0; x < 16; x++) {
      const r = Math.hypot(x + 0.5 - 8, y + 0.5 - 16);
      if (r > 8.2) continue;
      const c = r > 7.2 ? wal : r > 6.2 ? { c: '#ff3a3a', emit: 0.95 } : r > 5.2 ? { c: '#ff9a2a', emit: 0.95 } : r > 4.2 ? { c: '#ffe070', emit: 0.95 } : r > 3.2 ? { c: '#50c8ff', emit: 0.9 } : CHROME;
      m.box(x, y, r > 7.2 ? 0 : 1, 1, 1, r > 7.2 ? 11 : 10, c);
    }
    m.box(7, 17, 10, 2, 2, 1, '#c8202a'); m.set(7.5, 18, 11, BRASS_L);
  },
});

// 1950s pinball machine: chrome legs, walnut & red cabinet, glass-covered playfield sloping up toward
// the back with bumpers, flippers & rails, and an illuminated backbox (rocket-and-stars backglass,
// score window) standing at the far end. The player stands at +z.
defineProp('pinball_machine', {
  size: [12, 30, 24], collide: [0.75, 1.1, 1.45],
  build(m) {
    const cab = '#a82a2a', cabD = '#7a1a1a';
    for (const [x, z] of [[0, 1], [11, 1], [0, 22], [11, 22]]) { m.box(x, 0, z, 1, 11, 1, CHROME); m.box(x, 0, z, 1, 1, 1, CHROME_D); }
    // cabinet slopes: 3 high at front, rising to the back
    for (let z = 0; z < 24; z++) {
      const top = 14 + Math.floor((23 - z) / 8);
      m.box(0, 11, z, 12, top - 11, 1, cab); m.box(0, top, z, 1, 1, 1, CHROME_M); m.box(11, top, z, 1, 1, 1, CHROME_M);
      m.box(1, top - 1, z, 10, 1, 1, z % 6 < 3 ? '#1e3a6a' : '#2a4a8a');      // playfield
    }
    m.box(0, 11, 23, 12, 3, 1, cabD); m.box(4, 12, 23, 4, 2, 1, CHROME_M); m.set(5, 12, 23, '#1a1a1a'); m.set(6, 12, 23, '#1a1a1a');  // coin door
    m.box(5, 14, 23, 2, 1, 1, CHROME);                       // plunger
    const pf = (z) => 14 + Math.floor((23 - z) / 8) - 1;
    // bumpers (mushroom caps), flippers, rails, targets
    for (const [x, z, c] of [[3, 8, '#e84040'], [8, 8, '#f0d040'], [5.5, 5, '#40c0f0'], [3, 13, '#f0d040'], [8, 13, '#e84040']]) {
      m.set(x, pf(z) + 1, z, CHROME); m.set(x, pf(z) + 2, z, { c, emit: 0.6 });
    }
    m.box(3, pf(19) + 1, 19, 2, 1, 1, '#f4f0e6'); m.box(7, pf(19) + 1, 19, 2, 1, 1, '#f4f0e6');
    m.box(1, pf(16) + 1, 16, 1, 1, 3, CHROME_M); m.box(10, pf(16) + 1, 16, 1, 1, 3, CHROME_M);
    for (let x = 2; x < 10; x += 2) m.set(x, pf(2) + 1, 2, { c: '#ff8040', emit: 0.5 });
    m.set(6, pf(17) + 1, 17, CHROME);                         // the ball
    // backbox
    m.box(0, 16, 0, 12, 14, 3, cabD); m.box(0, 29, 0, 12, 1, 3, CHROME_M);
   
    m.box(1, 18, 2, 10, 10, 1, { c: '#1a1a4a', emit: 0.7 });
    for (const [x, y] of [[2, 26], [9, 25], [3, 21], [8, 19], [5, 27]]) m.set(x, y, 3, { c: '#fff8c0', emit: 0.95 });
    m.box(5, 20, 3, 2, 5, 1, { c: '#e0e0e0', emit: 0.8 }); m.set(5.5, 25, 3, { c: '#e84040', emit: 0.9 }); m.box(4, 20, 3, 4, 1, 1, { c: '#e84040', emit: 0.9 });
    m.box(5, 19, 3, 2, 1, 1, { c: '#ffa020', emit: 0.95 });
    m.box(2, 16, 3, 8, 2, 1, '#101010'); for (const x of [3, 5, 7]) m.set(x, 17, 3, { c: '#f8f4e0', emit: 0.8 });
  },
});

// Pool table (2.5 x 1.35 m, long axis along x): mahogany rails with mother-of-pearl sights, green felt,
// six leather pockets, fifteen balls racked at the -x end, cue ball at the +x end, a cue & chalk.
defineProp('pool_table', {
  size: [40, 14, 22], collide: [2.5, 0.85, 1.375],
  build(m) {
    const mah = '#5a2616', mahD = '#401a0e', felt = '#2e7a4a', feltD = '#246a3e', pocket = '#1a1410';
    for (const x of [2, 19, 36]) for (const z of [2, 18]) { m.box(x, 0, z, 2, 1, 2, mahD); m.box(x + 0.5, 1, z + 0.5, 1, 7, 1, mah); m.box(x, 4, z, 2, 1, 2, mahD); }
    m.box(1, 8, 1, 38, 3, 20, mah); m.box(1, 8, 1, 38, 1, 20, mahD);          // apron
    m.box(0, 11, 0, 40, 2, 22, mah);                          // rails
    m.box(2, 11, 2, 36, 2, 18, feltD); m.box(3, 12, 3, 34, 1, 16, 0);           // cushions
    m.box(3, 11, 3, 34, 1, 16, felt);                         // bed
    for (const [x, z] of [[1, 1], [38, 1], [1, 20], [38, 20], [19.5, 0], [19.5, 21]]) m.box(x, 11, z, x === 19.5 ? 1 : 1, 2, 1, pocket);
    for (const [x, z] of [[1, 1], [37, 1], [1, 19], [37, 19]]) m.box(x, 10, z, 2, 1, 2, pocket);
    for (const x of [8, 14, 25, 31]) { m.set(x, 12, 0, '#f0ece0'); m.set(x, 12, 21, '#f0ece0'); }
    for (const z of [6, 11, 16]) { m.set(0, 12, z, '#f0ece0'); m.set(39, 12, z, '#f0ece0'); }
    // racked balls
    const balls = ['#e8c020', '#2a4ab0', '#c8202a', '#5a2a7a', '#e87020', '#2a7a3a', '#7a1a1a', '#101010', '#e8c020', '#2a4ab0', '#c8202a', '#5a2a7a', '#e87020', '#2a7a3a', '#7a1a1a'];
    let k = 0;
    for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) {
      const x = 10 - row, z = 11 - row / 2 + i - 0.5 + (row % 2 ? 0.5 : 0);
      m.set(x, 12, Math.round(z), row === 2 && i === 1 ? '#101010' : balls[k % 15]); k++;
    }
    m.set(29, 12, 11, '#f8f6f0');                            // cue ball
    m.box(18, 12, 16, 15, 1, 1, '#d8b878'); m.box(18, 12, 16, 5, 1, 1, '#2a1a10'); m.set(32, 12, 16, '#f0ece0');   // cue on the felt
    m.set(38, 13, 3, '#3a6ad0');                             // chalk on the rail
  },
});

// Tavern bar counter module (1.0 m): dark walnut with raised panels facing the patrons (+z), a brass
// foot rail on posts, bar top with a bull-nose edge; bartender's shelf & glass-washing well at -z.
defineProp('bar_counter', {
  size: [16, 18, 12], collide: [1.0, 1.1, 0.72],
  build(m) {
    m.box(0, 0, 1, 16, 1, 9, WALNUT_D); m.box(0, 1, 0, 16, 16, 10, WALNUT);
    m.clear(1, 1, 0, 14, 12, 4); m.box(1, 6, 0, 14, 1, 4, WALNUT_D);          // back shelves
    for (const x of [2, 4, 6]) m.box(x, 7, 1, 1, 2, 1, GLASS);                  // glasses
    m.box(9, 7, 0, 5, 3, 3, '#b8c0c6'); m.box(10, 9, 1, 3, 1, 1, '#8ab0c0');    // washing well
    m.box(3, 1, 1, 3, 3, 3, '#6a4a2a'); m.box(3, 4, 1, 3, 1, 3, '#4a3018');     // keg
    for (const x0 of [0.5, 8.5]) { m.box(x0, 3, 10, 7, 12, 1, WALNUT_L); m.box(x0 + 1, 4, 10, 5, 10, 1, WALNUT); }
    m.box(0, 15, 10, 16, 1, 1, WALNUT_D);
    m.box(0, 17, 0, 16, 1, 12, WALNUT_D); m.box(0, 16, 11, 16, 1, 1, WALNUT_D);   // top & bull-nose
    m.box(0, 17, 11, 16, 1, 1, '#6a4a2e');
    // brass foot rail
    for (const x of [3, 12]) { m.box(x, 1, 11, 1, 2, 1, BRASS_D); }
    m.box(0, 2, 11, 16, 1, 1, BRASS);
    m.box(0, 0, 10, 16, 1, 2, '#3a3a3a');                   // spittoon-proof kick plate
  },
});

// Back bar, back at z=0 (1.5 m x 2.2 m): walnut cabinet, arched mirror, two glass shelves of bottles
// (whiskey amber, gin clear, green, red), stacked glasses, a cash drawer & a small neon beer sign.
defineProp('bar_back_shelf', {
  size: [24, 36, 8], origin: [12, 0, 0], collide: [1.5, 1.0, 0.5],
  build(m) {
    m.box(0, 0, 0, 24, 1, 7, WALNUT_D); m.box(0, 1, 0, 24, 14, 7, WALNUT);
    for (const x of [1, 9, 17]) { m.box(x, 3, 7, 6, 10, 1, WALNUT_L); m.box(x + 1, 4, 7, 4, 8, 1, WALNUT); m.set(x + 3, 8, 8, BRASS); }
    m.box(0, 15, 0, 24, 1, 8, WALNUT_D);
    // mirror with arched top, pilasters
    m.box(0, 16, 0, 2, 19, 2, WALNUT); m.box(22, 16, 0, 2, 19, 2, WALNUT); m.box(0, 33, 0, 24, 3, 2, WALNUT_D);
    m.box(2, 16, 0, 20, 17, 1, '#9ab0b8');
    for (let x = 2; x < 22; x++) { const h = Math.round(Math.sqrt(Math.max(0, 100 - (x + 0.5 - 12) ** 2)) * 0.3); m.box(x, 33 - (3 - h), 0, 1, 3 - h, 1, WALNUT_D); }
    for (let i = 0; i < 5; i++) m.set(5 + i, 22 + i, 0, '#c8dce2');
    // glass shelves & bottles
    const bot = ['#9a5a1a', '#b87a2a', '#e8eef0', '#2a6a3a', '#7a1a1a', '#c8902a', '#e8eef0', '#5a3a1a', '#2a6a3a', '#b87a2a'];
    for (const y of [16, 23]) {
      m.box(2, y, 1, 20, 1, 3, '#c8dce0');
      for (let i = 0; i < 10; i++) { const x = 2 + i * 2, h = 3 + (i % 3 === 0 ? 1 : 0); bottle(m, x, y + 1, 2, h, bot[(i + (y > 20 ? 3 : 0)) % 10], i % 2 ? '#d8b040' : '#1a1a1a'); if (i % 3 === 1) m.set(x, y + 2, 3, '#f0e8d0'); }
    }
    // stacked glasses & a neon sign
    for (const x of [4, 6, 8]) { m.box(x, 16, 5, 1, 1, 1, GLASS); m.box(x, 17, 5, 1, 1, 1, GLASS); }
    m.box(9, 28, 1, 6, 4, 1, '#1a1a1a'); label(m, 'ALE', 12, 28, 2, { c: '#ff5a3a', emit: 0.95 }, { align: 'center' });
    m.box(18, 16, 4, 3, 2, 3, BRASS); m.box(18, 18, 5, 3, 1, 1, BRASS_L);        // cash drawer
  },
});

// Three-tap beer tower for the bar top: chrome column with drip tray and wooden tap handles
// (enamel badges). 1/32 m voxels. Badges face +z (the patrons); the bartender pulls from -z.
defineProp('beer_taps', {
  size: [16, 22, 8], scale: 1 / 32, collide: false,
  build(m) {
    m.box(0, 0, 3, 16, 1, 5, CHROME_D); for (let x = 1; x < 16; x += 2) m.box(x, 1, 4, 1, 1, 3, CHROME_M);
    m.box(2, 1, 1, 12, 9, 2, CHROME); m.box(1, 10, 1, 14, 2, 2, CHROME_M);
    for (const [x, c] of [[3, '#c8202a'], [7.5, '#2a4ab0'], [12, '#e8c020']]) {
      m.box(x, 7, 3, 1, 1, 2, CHROME_M); m.box(x, 5, 4, 1, 2, 1, CHROME);       // spout
      m.box(x, 12, 2, 1, 7, 1, '#3a2418'); m.box(x - 0.5, 16, 3, 2, 3, 1, c); m.set(x, 17, 4, '#f8f4e0');   // handle & badge
    }
  },
});

// Bar stool: turned walnut legs with a brass-capped foot ring, round seat at 0.75 m.
defineProp('bar_stool', {
  size: [8, 13, 8], collide: [0.42, 0.78, 0.42],
  build(m) {
    for (const [x, z] of [[1, 1], [6, 1], [1, 6], [6, 6]]) { m.box(x, 0, z, 1, 11, 1, WALNUT); m.set(x, 0, z, WALNUT_D); }
    m.box(1, 4, 1, 6, 1, 1, BRASS); m.box(1, 4, 6, 6, 1, 1, BRASS); m.box(1, 4, 1, 1, 1, 6, BRASS); m.box(6, 4, 1, 1, 1, 6, BRASS);
    m.box(1, 10, 1, 6, 1, 6, WALNUT_D);
    m.cyl(4, 11, 4, 3.6, 1, WALNUT); m.cyl(4, 12, 4, 3.1, 1, '#6a3a1e');
  },
});

// ---------------------------------------------------------------- diner

// Diner booth for four. LAYOUT: the table is centred on the origin; the two benches run along x at
// z = -0.6 m and z = +0.6 m (seat centres), high backs on the outside. Diners on the -z bench face +z,
// diners on the +z bench face -z, looking at each other across the table. Seat 0.45 m, table 0.75 m,
// footprint 1.25 x 1.85 m. Benches are tint A vinyl (red in the classic scheme) with chrome trim; a
// wall-box jukebox selector, napkin dispenser, sugar pourer, salt & pepper and ketchup on the table.
defineProp('diner_booth', {
  size: [20, 18, 30], origin: [10, 0, 15], collide: [1.25, 1.1, 1.85],
  build(m) {
    const v = TA(0.5), vD = TA(0.4), vL = TA(0.58);
    const bench = (zSeat, zBack, zFront) => {
      m.box(0, 0, Math.min(zSeat, zBack), 20, 6, 8, '#5a3a24');                 // wooden base
      m.box(0, 0, zFront, 20, 1, 1, CHROME_D);
      m.box(0, 6, zSeat, 20, 1, 7, v); m.box(0, 7, zSeat, 20, 1, 7, vL);           // seat cushion
      m.box(0, 7, zFront, 20, 1, 1, CHROME);
      m.box(0, 8, zBack, 20, 10, 2, v);                                              // back
      for (let x = 2; x < 20; x += 3) m.box(x, 9, zBack + (zBack === 0 ? 2 : -1), 1, 8, 1, vD);   // channel tufts
      m.box(0, 17, zBack, 20, 1, 2, CHROME); m.box(0, 8, zBack, 20, 1, 2, CHROME_D);
    };
    bench(1, 0, 8); bench(22, 28, 21);
    // table: chrome pedestal, formica top with ribbed chrome edge
    m.box(7, 0, 12, 6, 1, 6, CHROME_M); m.box(9, 1, 14, 2, 10, 2, CHROME);
    m.box(1, 11, 9, 18, 1, 12, '#e8e2d4'); m.box(0, 11, 9, 20, 1, 1, CHROME); m.box(0, 11, 20, 20, 1, 1, CHROME);
    m.box(0, 11, 9, 1, 1, 12, CHROME); m.box(19, 11, 9, 1, 1, 12, CHROME);
    for (const [x, z] of [[5, 12], [12, 17], [15, 11]]) m.set(x, 11, z, '#c8d0d8');   // boomerang flecks
    // wall-box jukebox selector at the -x end, condiments
    m.box(1, 12, 13, 3, 3, 4, CHROME_M); m.box(1, 13, 13, 3, 1, 4, { c: '#f8f0d0', emit: 0.4 }); m.box(1, 15, 14, 3, 1, 2, CHROME);
    m.set(2, 12, 17, '#c8202a');
    m.box(5, 12, 14, 2, 2, 2, CHROME); m.set(5, 13, 16, '#f8f8f8');              // napkin dispenser
    m.set(8, 12, 15, GLASS); m.set(8, 13, 15, CHROME);                            // sugar pourer
    m.set(10, 12, 14, '#f4f4f0'); m.set(10, 12, 16, '#2a2a2a');                   // salt & pepper
    m.box(12, 12, 15, 1, 2, 1, '#b8201a'); m.set(12, 14, 15, '#f4f0e0');           // ketchup
  },
});

// Diner counter module (1.0 m): customers at +z. Ribbed stainless front with a red stripe, chrome kick,
// grey-blue formica top with chrome edge; on top toward the server a two-tier pie shelf (cherry pie &
// a cut lemon meringue), napkin holder & sugar shaker; server's shelf of plates & cups below at -z.
defineProp('diner_counter', {
  size: [16, 24, 12], collide: [1.0, 1.05, 0.75],
  build(m) {
    const ss = '#c4cad0', ssD = '#9aa2a8';
    m.box(0, 0, 1, 16, 1, 10, '#2a2a2a');
    m.box(0, 1, 0, 16, 15, 11, ss);
    m.clear(1, 2, 0, 14, 11, 4); m.box(1, 7, 0, 14, 1, 4, ssD);
    for (let x = 2; x < 14; x += 3) { m.box(x, 2, 1, 2, 1, 2, '#f4f2ec'); m.box(x, 3, 1, 2, 1, 2, '#f4f2ec'); }      // plates
    for (let x = 2; x < 14; x += 3) { m.set(x, 8, 2, '#f4f2ec'); m.set(x + 1, 8, 2, '#f4f2ec'); }                    // cups
    for (let x = 0; x < 16; x += 2) m.box(x, 1, 11, 1, 14, 1, ssD);                                                 // ribbing
    m.box(0, 1, 11, 16, 1, 1, CHROME); m.box(0, 9, 11, 16, 2, 1, '#b8202a');
    m.box(0, 15, 0, 16, 1, 12, '#a8b8c0'); m.box(0, 15, 11, 16, 1, 1, CHROME);
    for (const [x, z] of [[3, 8], [9, 10], [13, 7]]) m.set(x, 15, z, '#c8d4da');
    // pie shelf
    m.box(3, 16, 1, 10, 1, 5, CHROME_M); m.box(3, 17, 1, 1, 6, 1, CHROME); m.box(12, 17, 1, 1, 6, 1, CHROME);
    m.box(3, 20, 1, 10, 1, 5, '#d0e0e4'); m.box(3, 23, 1, 10, 1, 5, CHROME_M);
    m.box(4, 17, 2, 4, 1, 3, '#c89048'); m.box(4, 18, 2, 4, 1, 3, '#a8202a'); m.set(5, 18, 3, '#c89048'); m.set(7, 18, 2, '#c89048');
    m.box(8, 21, 2, 4, 1, 3, '#c89048'); m.box(8, 22, 2, 4, 1, 3, '#f0d860'); m.set(9, 22, 3, '#fbf6e8'); m.set(11, 22, 2, '#fbf6e8');
    m.clear(10, 21, 4, 2, 2, 1);
    // napkins & sugar
    m.box(1, 16, 8, 2, 2, 1, CHROME); m.set(1, 17, 9, '#f8f8f8');
    m.set(14, 16, 8, GLASS); m.set(14, 17, 8, CHROME);
  },
});

// Restaurant coffee urn, 1/32 m voxels (0.8 m): polished chrome tank on stubby legs, sight-glass gauge,
// spigot with a black handle facing +z, domed lid & knob, brass nameplate, cups at its foot.
defineProp('coffee_urn', {
  size: [16, 27, 16], scale: 1 / 32, collide: [0.45, 0.85, 0.45],
  build(m) {
    m.cyl(8, 0, 8, 7, 1, CHROME_D);
    for (const [x, z] of [[4, 4], [11, 4], [4, 11], [11, 11]]) m.box(x, 1, z, 1, 3, 1, CHROME_D);
    m.cyl(8, 4, 8, 6.2, 1, CHROME_M); m.cyl(8, 5, 8, 6, 15, CHROME); m.cyl(8, 20, 8, 6.2, 1, CHROME_M);
    m.cyl(8, 12, 8, 6.1, 1, '#c8d0d6');                                              // band
    m.cyl(8, 21, 8, 5, 2, CHROME); m.cyl(8, 23, 8, 3, 1, CHROME_M); m.cyl(8, 24, 8, 1.2, 2, '#1a1a1a');
    // spigot & gauge on the front
    m.box(7, 7, 14, 2, 2, 2, CHROME_M); m.box(7.5, 6, 15, 1, 1, 1, CHROME_D); m.box(7, 9, 15, 2, 3, 1, '#1a1a1a');
    m.box(11, 7, 14, 1, 11, 1, GLASS); m.box(11, 7, 14, 1, 7, 1, '#4a2a14'); m.set(11, 6, 14, CHROME_M); m.set(11, 18, 14, CHROME_M);
    m.box(4, 14, 14, 5, 2, 1, BRASS);
    m.box(1, 1, 13, 2, 2, 2, '#f4f2ec'); m.set(1, 3, 13, '#f4f2ec');
  },
});

// Rotating pie case, 1/32 m voxels (0.55 m dia, 0.8 m): chrome base with a red band, lit cap, glass
// sides (posts only), three turning shelves of pies & cakes — cherry lattice, lemon meringue,
// chocolate cream, apple, coconut layer cake.
defineProp('pie_display', {
  size: [18, 27, 18], scale: 1 / 32, collide: [0.55, 0.85, 0.55], light: lampLight(0, 0.75, 0, [1.0, 0.9, 0.75], 2.5, 'room'),
  build(m) {
    m.cyl(9, 0, 9, 8.5, 1, CHROME_D); m.cyl(9, 1, 9, 8.2, 2, '#b8202a'); m.cyl(9, 3, 9, 8.5, 1, CHROME);
    for (const [x, z] of [[1.5, 8.5], [15.5, 8.5], [8.5, 1.5], [8.5, 15.5]]) m.box(x, 4, z, 1, 20, 1, CHROME_M);
    m.cyl(9, 24, 9, 8.5, 1, CHROME); m.cyl(9, 23, 9, 7, 1, { c: '#fff4d8', emit: 0.6 }); m.cyl(9, 25, 9, 6, 1, CHROME_M); m.cyl(9, 26, 9, 2, 1, '#b8202a');
    m.box(8.5, 4, 8.5, 1, 19, 1, CHROME_D);
    const pie = (x, y, z, top, crust = '#c89048', lat = false) => {
      m.box(x, y, z, 5, 1, 5, crust); m.box(x + 1, y + 1, z + 1, 3, 1, 3, top);
      m.set(x, y + 1, z + 2, crust); m.set(x + 4, y + 1, z + 2, crust); m.set(x + 2, y + 1, z, crust); m.set(x + 2, y + 1, z + 4, crust);
      if (lat) { m.set(x + 1, y + 1, z + 1, crust); m.set(x + 3, y + 1, z + 3, crust); m.set(x + 1, y + 1, z + 3, crust); m.set(x + 3, y + 1, z + 1, crust); }
    };
    for (const y of [4, 10, 16]) m.cyl(9, y, 9, 7.2, 1, '#dce8ec');
    pie(3, 5, 9, '#a8202a', '#c89048', true); pie(10, 5, 9, '#c8a060', '#c89048', true); pie(6, 5, 3, '#6a3a1e');
    pie(3, 11, 4, '#f0d860'); m.set(4, 13, 5, '#fbf6e8'); m.set(6, 13, 7, '#fbf6e8'); m.set(5, 13, 6, '#fbf6e8');
    pie(10, 11, 10, '#5a2e18'); m.set(12, 13, 12, '#fbf6e8');
    m.cyl(9, 17, 9, 4, 4, '#fbf8f0'); m.cyl(9, 21, 9, 3, 1, '#f4f0e6'); m.set(9, 22, 9, '#c8102a');
    m.clear(9, 17, 9, 4, 4, 4); m.box(9, 17, 9, 1, 4, 1, '#f0d898'); m.box(9, 19, 10, 1, 1, 3, '#f8f0f0');
  },
});

// Diner menu board, back at z=0, 1/32 m voxels (1.5 x 1.4 m): black felt letter-board in a chrome
// frame with white letters and prices (small pixel font), red "MENU" header.
defineProp('menu_board', {
  size: [48, 46, 2], scale: 1 / 32, origin: [24, 0, 0],
  build(m) {
    m.box(0, 0, 0, 48, 46, 2, CHROME_M); m.box(1, 1, 1, 46, 44, 1, '#1c1c1e');
    m.text('MENU', 24, 37, 1, '#d83a2a', { font: 'big', align: 'center' });       // letters set flush in the felt
    const rows = [['CHOWDER', '25¢'], ['HOT DOG', '15¢'], ['HAMBURG', '20¢'], ['PIE', '15¢'], ['COFFEE', '5¢'], ['FRAPPE', '20¢']];
    rows.forEach(([a, p], i) => {
      const y = 30 - i * 6;
      label(m, a, 3, y, 1, '#f4f2ea');
      const w = label(m, p, 0, -10, 1, '#f4f2ea');        // measure only (drawn below the grid, discarded)
      label(m, p, 45 - w, y, 1, '#f4f2ea');
      const x0 = 3 + layoutText(a, 'small').width + 2;
      m.box(x0, y, 1, 45 - w - 2 - x0, 1, 1, '#5a5a58');   // leader line
    });
  },
});

// A-frame sidewalk chalkboard for the diner, 1/48 m voxels (0.63 m wide, 0.92 m): slate faces in a
// wooden frame reading "FRESH / CHOWDER / 25¢" with a chalk bowl doodle; the back reads "OPEN".
function slantText(m, str, cx, y, zf, col) {
  const L = layoutText(str, 'small'); const x0 = Math.round(cx - L.width / 2);
  for (const p of L.pixels) m.set(x0 + p.x, y + p.y, zf(y + p.y), col);
}
function buildChalkboard(m) {
  const H = 44, fr = '#8a6a48', slate = '#2c322e', chalk = '#f0ece0';
  const zf = (y) => 22 - Math.floor(y * 10 / H), zb = (y) => 1 + Math.floor(y * 10 / H);
  for (let y = 0; y < H; y++) {
    m.box(0, y, zf(y), 30, 1, 1, y < 3 || y > H - 4 ? fr : slate); m.box(0, y, zb(y), 30, 1, 1, y < 3 || y > H - 4 ? fr : slate);
    for (const x of [0, 1, 28, 29]) { m.set(x, y, zf(y), fr); m.set(x, y, zb(y), fr); }
  }
  for (let z = zb(H - 1); z <= zf(H - 1); z++) m.box(0, H - 1, z, 30, 1, 1, fr);
  const f = (y) => zf(y) + 1, b = (y) => zb(y) - 1;
  slantText(m, 'FRESH', 15, 34, f, '#f0d060'); slantText(m, 'CHOWDER', 15, 26, f, chalk);
  // "25¢"
  const L = layoutText('25', 'small'); for (const p of L.pixels) m.set(9 + p.x, 18 + p.y, f(18 + p.y), chalk);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (CENT[r][c] === '#') m.set(17 + c, 18 + 4 - r, f(22 - r), chalk);
  // bowl doodle with steam
  for (let x = 9; x < 21; x++) m.set(x, 8, f(8), chalk);
  for (let x = 10; x < 20; x++) m.set(x, 6 + (x === 10 || x === 19 ? 1 : 0), f(6), chalk);
  for (const x of [12, 15, 18]) { m.set(x, 10, f(10), chalk); m.set(x + 1, 11, f(11), chalk); m.set(x, 12, f(12), chalk); }
  // back side
  const Lb = layoutText('OPEN', 'small'); const xb = Math.round(15 + Lb.width / 2);
  for (const p of Lb.pixels) m.set(xb - 1 - p.x, 24 + p.y, b(24 + p.y), chalk);
  m.box(4, 12, zb(12) + 1, 1, 1, zf(12) - zb(12) - 1, '#6a6a6a'); m.box(25, 12, zb(12) + 1, 1, 1, zf(12) - zb(12) - 1, '#6a6a6a');   // spreader chains
}
defineProp('sandwich_board', {
  size: [30, 44, 24], scale: 1 / 48, cat: 'exterior', collide: [0.6, 0.9, 0.5], build: buildChalkboard,
});
defineProp('sandwich_board_chowder', {
  size: [30, 44, 24], scale: 1 / 48, cat: 'exterior', collide: [0.6, 0.9, 0.5], build: buildChalkboard,
});

// =====================================================================================================
// CIVIC & INSTITUTIONS
// =====================================================================================================

// ---------------------------------------------------------------- church

// Church pew, 3.0 m long along x. Seat 0.45 m, the congregation faces +z. Scrolled end panels with a
// brass number plate; on the back (-z) a hymnal rack with hymnals & pew cards for the row behind.
defineProp('pew', {
  size: [48, 16, 11], collide: [3.0, 0.95, 0.68],
  build(m) {
    const wd = '#6a4428', wdD = '#523420', wdL = '#7e5434';
    m.box(1, 6, 3, 46, 1, 8, wd); m.box(1, 5, 10, 46, 1, 1, wdD);             // seat
    m.box(1, 2, 4, 46, 1, 1, wdD);                                                // stretcher
    for (let y = 7; y < 15; y++) m.box(1, y, 2 - (y > 11 ? 1 : 0), 46, 1, 1, wd);    // back, leaning
    m.box(1, 14, 0, 46, 1, 3, wdL);                                               // top rail
    m.box(1, 9, 2, 46, 1, 1, wdD); m.box(1, 12, 1, 46, 1, 1, wdD);                // back mouldings
    // hymnal rack on the back
    m.box(1, 7, 0, 46, 1, 2, wdD); m.box(1, 8, 0, 46, 2, 1, wd);
    const hy = ['#5a1a1a', '#1a1a2a', '#5a1a1a', '#1a1a2a'];
    for (let i = 0; i < 6; i++) { const x = 3 + i * 7; m.box(x, 8, 1, 3, 3, 1, hy[i % 4]); m.set(x + 1, 10, 1, '#c8a848'); m.set(x + 4, 9, 0, '#f0ead8'); }
    // ends
    for (const x of [0, 47]) {
      m.box(x, 0, 0, 1, 14, 11, wdD);
      m.box(x, 14, 0, 1, 1, 8, wdD); m.box(x, 15, 0, 1, 1, 5, wdD);
      m.box(x, 2, 2, 1, 9, 7, wd); m.box(x, 12, 8, 1, 2, 3, 0); m.box(x, 13, 7, 1, 1, 1, 0);
      m.box(x, 12, 8, 1, 1, 1, wdD);
    }
    m.box(47, 8, 5, 1, 1, 2, BRASS); m.box(0, 8, 5, 1, 1, 2, BRASS);
  },
});

// Raised New England pulpit (1.5 m wide): panelled platform with a stair on the -x side, panelled
// desk with a crimson velvet fall & gold cross toward the congregation (+z), big Bible on the sloped
// book rest, a brass reading lamp. The preacher stands on the platform behind the desk (-z).
defineProp('pulpit', {
  size: [24, 36, 18], collide: [1.5, 1.4, 1.1],
  build(m) {
    const wd = '#e8e2d4', wdD = '#c8c0b0', trim = '#6a4428', vel = '#8a1a22';
    m.box(4, 0, 2, 20, 10, 16, wd);                           // platform (painted white, as in many NE churches)
    for (const x of [6, 14]) m.box(x, 2, 18 - 1, 6, 6, 1, wdD);
    m.box(4, 9, 2, 20, 1, 16, trim);
    for (let i = 0; i < 5; i++) m.box(0, 0, 3 + i * 2, 4, 2 + i * 2, 2, i & 1 ? wdD : wd);   // stair up from -x
    m.box(0, 2, 2, 1, 14, 1, trim); m.box(0, 15, 2, 1, 1, 10, trim);           // stair rail
    for (let i = 0; i < 5; i++) m.box(0, 3 + i * 2, 3 + i * 2, 1, 12 - i * 2, 1, trim);
    // desk box
    m.box(6, 10, 10, 16, 14, 7, wd); m.box(6, 24, 9, 16, 1, 9, trim);
    for (const x of [7, 17]) m.box(x, 12, 17, 4, 10, 1, wdD);
    m.box(10, 24, 10, 8, 1, 7, vel); m.box(11, 13, 17, 6, 11, 1, vel);          // velvet fall
   
    m.box(13, 16, 17, 2, 6, 1, BRASS_L); m.box(12, 19, 17, 4, 1, 1, BRASS_L);    // gold cross embroidered
    for (let x = 11; x < 17; x += 2) m.set(x, 13, 17, BRASS_L);                // fringe
    // sloped book rest with the Bible
    m.box(8, 25, 11, 12, 1, 6, trim); m.box(8, 26, 11, 12, 1, 3, trim);
    m.box(9, 26, 12, 10, 1, 5, '#2a1a14'); m.box(10, 27, 12, 8, 1, 3, '#f4ecd8'); m.set(14, 27, 12, '#c8b890');
    m.box(10, 27, 15, 3, 1, 1, '#8a1a22');                                     // ribbon marker
    m.box(19, 25, 11, 1, 5, 1, BRASS); m.box(18, 30, 11, 3, 1, 2, '#2a5a3a'); m.box(18, 29, 12, 3, 1, 1, { c: '#fff0c0', emit: 0.5 });  // green-shaded lamp
    m.box(4, 10, 2, 20, 12, 1, wd); m.box(4, 10, 2, 1, 12, 8, wd); m.box(23, 10, 2, 1, 12, 8, wd);       // back & side walls of the pulpit
    m.box(4, 22, 2, 20, 1, 1, trim);
  },
});

// Altar (1.9 m): panelled oak table dressed with a white linen cloth & lace edge with a gold cross,
// a gradine shelf carrying a brass cross, two brass candlesticks with lit candles and vases of white
// lilies. Faces the congregation (+z). Candle glow follows the room lamps.
defineProp('altar', {
  size: [30, 38, 14], collide: [1.9, 1.0, 0.85], light: lampLight(0, 1.3, 0.1, [1.0, 0.78, 0.45], 4, 'room'),
  build(m) {
    const oak = '#7a5030', oakD = '#5a3a22', linen = '#f8f6f0', lace = '#ecE6d6';
    m.box(0, 0, 0, 30, 1, 14, oakD); m.box(1, 1, 1, 28, 14, 12, oak);
    for (const x of [3, 12, 21]) { m.box(x, 3, 13, 6, 9, 1, oakD); m.box(x + 1, 4, 13, 4, 7, 1, oak); }
    m.box(0, 15, 0, 30, 1, 14, linen); m.box(0, 9, 13, 30, 6, 1, linen);        // cloth & frontal
    for (let x = 0; x < 30; x += 2) m.set(x, 8, 13, lace);
   
    m.box(14, 10, 13, 2, 4, 1, GOLD); m.box(13, 12, 13, 4, 1, 1, GOLD);         // embroidered cross
    m.box(0, 12, 0, 1, 3, 14, linen); m.box(29, 12, 0, 1, 3, 14, linen);          // side drops
    // gradine & brass cross
    m.box(3, 16, 0, 24, 2, 4, oakD); m.box(3, 18, 0, 24, 1, 4, linen);
    m.box(14, 19, 1, 2, 2, 2, BRASS_D); m.box(14.5, 21, 1.5, 1, 12, 1, BRASS); m.box(12, 29, 1.5, 6, 1, 1, BRASS);
    m.set(14.5, 33, 1.5, BRASS_L);
    // candlesticks with lit candles
    for (const x of [6, 23]) {
      m.box(x - 1, 16, 7, 3, 1, 3, BRASS_D); m.box(x, 17, 8, 1, 5, 1, BRASS); m.box(x - 1, 22, 7, 3, 1, 3, BRASS);
      m.box(x, 23, 8, 1, 6, 1, '#f8f4e8'); m.set(x, 29, 8, { c: '#ffc860', emit: 1 }); m.set(x, 30, 8, { c: '#fff0a0', emit: 1 });
    }
    // vases of lilies on the gradine
    for (const x of [9, 20]) {
      m.box(x, 19, 1, 2, 3, 2, BRASS); m.box(x, 22, 1, 2, 3, 2, '#3a7a2e');
      m.set(x - 1, 25, 1, '#f8f8f0'); m.set(x + 2, 25, 2, '#f8f8f0'); m.set(x, 26, 2, '#f8f8f0'); m.set(x + 1, 25, 1, '#f8f8f0'); m.set(x + 1, 26, 1, '#f0e080');
    }
  },
});

// Wooden lectern (1.25 m): turned column on a stepped base, sloped desk with an open Bible facing the
// reader (-z), a green pulpit fall with a gold cross toward the congregation (+z).
defineProp('lectern', {
  size: [10, 21, 10], collide: [0.6, 1.25, 0.6],
  build(m) {
    const wd = '#6a4428', wdD = '#4e3220';
    m.box(1, 0, 1, 8, 1, 8, wdD); m.box(2, 1, 2, 6, 1, 6, wd);
    m.box(4, 2, 4, 2, 12, 2, wd); m.box(3, 5, 3, 4, 1, 4, wdD); m.box(3, 12, 3, 4, 2, 4, wdD);
    // sloped desk, high at +z, low at -z (toward the reader)
    for (let z = 1; z < 9; z++) { const y = 14 + Math.floor(z / 3); m.box(1, 14, z, 8, y - 13, 1, wd); m.box(1, y + 1, z, 8, 1, 1, wdD); }
    m.box(1, 14, 0, 8, 2, 1, wdD);
    m.box(2, 17, 2, 6, 1, 5, '#f4ecd8'); m.set(5, 17, 3, '#c8b890'); m.set(4, 17, 4, '#c8b890'); m.box(2, 16, 2, 6, 1, 5, '#2a1a14');
    for (let z = 2; z < 7; z++) m.set(5, 18 + (z > 4 ? 0 : 0), z, '#e8dcc0');
    // green fall on the front
    m.box(3, 10, 9, 4, 7, 1, '#2a5a3a');
    m.box(4, 12, 9, 2, 4, 1, GOLD); m.box(3, 14, 9, 4, 1, 1, GOLD);
    m.box(4, 13, 9, 2, 1, 1, '#2a5a3a');
    m.box(4, 14, 9, 2, 1, 1, GOLD);
    for (let x = 3; x < 7; x += 2) m.set(x, 9, 9, GOLD);
  },
});

// Baptismal font (1.0 m): octagonal white marble bowl with carved band, filled with water, on a
// fluted pedestal & stepped base; a silver shell dish rests on the rim.
defineProp('baptismal_font', {
  size: [12, 16, 12], collide: [0.7, 1.0, 0.7],
  build(m) {
    const mar = '#eeeae4', marD = '#d4cec4';
    col(m, 1, 0, 1, 10, 1, marD); col(m, 2, 1, 2, 8, 1, mar);
    col(m, 4, 2, 4, 4, 8, mar); for (const [x, z] of [[4, 5], [7, 5], [5, 4], [5, 7]]) m.box(x, 3, z, 1, 6, 1, marD);  // fluting
    col(m, 3, 10, 3, 6, 1, marD);
    col(m, 1, 11, 1, 10, 4, mar); col(m, 1, 12, 1, 10, 1, marD);
    for (const [x, z] of [[3, 11], [8, 11], [11, 3], [0, 8]]) m.set(x, 13, z, marD);
    col(m, 2, 14, 2, 8, 1, 0); col(m, 2, 13, 2, 8, 1, '#9ac4d0');
    m.box(8, 15, 9, 2, 1, 2, SILVER);
  },
});

// Hymn board, back at z=0, 1/32 m voxels (0.63 x 1.15 m): oak board with a pointed-arch top and cross,
// "HYMN" header and four black cards with white numbers.
defineProp('hymn_board', {
  size: [20, 44, 2], scale: 1 / 32, origin: [10, 0, 0],
  build(m) {
    const oak = '#7a5030', oakD = '#5a3a22';
    m.box(0, 0, 0, 20, 38, 1, oakD); m.box(1, 1, 0, 18, 36, 2, oak);
    for (let y = 38; y < 44; y++) { const w = Math.round((44 - y) * 10 / 6); m.box(10 - w, y, 0, w * 2, 1, 1, oakD); }
    m.box(9, 36, 1, 2, 6, 1, GOLD); m.box(8, 39, 1, 4, 1, 1, GOLD);
    m.text('HYMN', 10, 29, 1, '#f0e6c8', { font: 'small', align: 'center' });
    ['112', '47', '350', '8'].forEach((n, i) => {
      const y = 23 - i * 7;
      m.box(3, y - 1, 1, 14, 6, 1, '#18181a'); m.box(3, y - 2, 1, 14, 1, 1, BRASS_D);   // card on a brass ledge
      m.text(n, 10, y, 1, '#f4f2ea', { font: 'small', align: 'center' });
    });
  },
});

// Votive candle stand, 1/32 m voxels (1.0 m wide, 1.0 m): black wrought-iron frame with three stepped
// rows of red glass votives (most lit), a brass offering box and a tin of tapers. Faces +z.
defineProp('candle_stand', {
  size: [32, 32, 16], scale: 1 / 32, collide: [1.0, 1.0, 0.5], light: lampLight(0, 0.85, 0, [1.0, 0.7, 0.4], 3, 'room'),
  build(m) {
    const ir = '#1e1e20';
    for (const x of [1, 30]) { m.box(x, 0, 2, 1, 24, 1, ir); m.box(x, 0, 13, 1, 12, 1, ir); m.box(x, 0, 2, 1, 1, 12, ir); }
    for (const [y, z] of [[12, 9], [18, 6], [24, 3]]) {
      m.box(1, y, z, 30, 1, 5, ir); m.box(1, y + 1, z + 4, 30, 1, 1, ir);
      for (let i = 0; i < 9; i++) {
        const x = 3 + i * 3, lit = (i * 7 + y) % 5 !== 0;
        m.box(x, y + 1, z + 1, 2, 3, 2, { c: '#a8141e', emit: lit ? 0.35 : 0 });
        if (lit) { m.set(x, y + 4, z + 1, { c: '#ffd070', emit: 1 }); m.set(x + 1, y + 4, z + 2, { c: '#fff4c0', emit: 1 }); }
      }
    }
    for (let x = 4; x < 30; x += 6) { m.box(x, 25, 3, 1, 5, 1, ir); m.set(x, 30, 3, ir); }   // scrollwork finials
    m.box(1, 29, 3, 30, 1, 1, ir);
    m.box(12, 2, 10, 8, 7, 5, BRASS); m.box(13, 9, 11, 6, 1, 3, BRASS_D); m.box(14, 9, 12, 4, 1, 1, '#1a1a1a');  // offering box & slot
    m.box(22, 12, 14, 2, 4, 1, SILVER); m.set(22, 16, 14, '#f4f0e0'); m.set(23, 17, 14, '#f4f0e0');           // tin of tapers
  },
});

// Church organ console (1.6 m wide): walnut case with roll-top canopy, three manuals, stop-knob jambs
// either side, a music rack with a hymnal & brass lamp, pedalboard and bench. NOTE: the keys & bench
// are on the +z side — the organist sits at +z facing -z (toward the case), like piano_grand.
defineProp('organ_console', {
  size: [26, 24, 20], collide: [1.6, 1.3, 1.25],
  build(m) {
    const wal = '#5a3620', walD = '#42281a', walL = '#704a30';
    m.box(0, 0, 0, 26, 21, 9, wal); m.box(0, 21, 0, 26, 2, 9, walD); m.box(1, 23, 1, 24, 1, 7, walD);
    m.box(0, 0, 9, 2, 16, 8, wal); m.box(24, 0, 9, 2, 16, 8, wal);             // cheeks
    m.box(2, 8, 9, 22, 2, 5, walD);                                            // key bed
    // three manuals, each stepped back and up
    for (let k = 0; k < 3; k++) {
      const y = 10 + k * 2, z = 13 - k * 2;
      m.box(3, y, z - 1, 20, 1, 2, '#f4f0e4');
      for (let x = 3; x < 23; x++) if ([1, 2, 4, 5, 6].includes(x % 7)) m.set(x, y + 1, z - 1, '#1a1a1a');
      m.box(2, y, z - 2, 22, 2, 1, walL);
    }
    // stop jambs with drawknobs
    const knob = ['#f4f0e4', '#e8c8c8', '#f4f0e4', '#c8d8e8'];
    for (const x0 of [2, 20]) for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) m.set(x0 + c * 2, 12 + r * 2, 9, knob[(r + c) % 4]);
    // music rack, hymnal & lamp
    m.box(6, 17, 8, 14, 1, 1, walD); m.box(7, 18, 7, 12, 4, 1, walL);
    m.box(9, 18, 8, 8, 4, 1, '#f4ecd8'); m.box(12.5, 18, 8, 1, 4, 1, '#c8b890');
    m.box(12, 22, 7, 2, 1, 2, BRASS); m.box(11, 21, 8, 4, 1, 1, { c: '#fff0c0', emit: 0.6 });
    // pedalboard
    m.box(2, 0, 11, 22, 1, 7, walD);
    for (let x = 3; x < 23; x += 2) m.box(x, 1, 11, 1, 1, 6, x % 4 === 1 ? '#1a1a1a' : '#c8a878');
    // bench
    m.box(2, 5, 15, 22, 2, 4, wal); m.box(2, 0, 15, 2, 5, 4, walD); m.box(22, 0, 15, 2, 5, 4, walD);
    m.box(4, 1, 17, 18, 1, 1, walD);
  },
});

// Organ pipe facade, 1/12 m voxels (3.7 m wide, 4.2 m tall): panelled walnut impost, three towers of
// gilded speaking pipes (tallest in the centre) with dark mouths, carved cresting. Pipes face +z.
defineProp('organ_pipes', {
  size: [44, 50, 10], scale: 1 / 12, collide: [3.6, 4.2, 0.8], cat: 'interior',
  build(m) {
    const wal = '#5a3620', walD = '#42281a', gold = ['#d8b04a', '#c49a38', '#e0bc58'];
    m.box(0, 0, 0, 44, 14, 9, wal); m.box(0, 13, 0, 44, 2, 10, walD);
    for (let x = 2; x < 42; x += 8) m.box(x, 2, 9, 6, 9, 1, walL(wal));
    m.box(0, 15, 0, 44, 30, 2, '#2a1a10');                   // dark case interior behind the pipes
    // groups: [x0, count, width, peak length, z, shape]
    const groups = [[0, 3, 3, 26, 5, 'mitre'], [12, 2, 2, 17, 3, 'up'], [17, 3, 3, 31, 5, 'mitre'], [29, 2, 2, 17, 3, 'down'], [33, 3, 3, 26, 5, 'mitre']];
    let k = 0;
    for (const [x0, n, w, peak, z, shape] of groups) {
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (w + 1) + (w === 2 ? 0 : 0), c = gold[k++ % 3];
        const h = shape === 'mitre' ? peak - (i === 1 ? 0 : 4) : shape === 'up' ? peak - (1 - i) * 3 : peak - i * 3;
        m.box(x, 19, z, w, h, w, c);
        if (w === 3) { m.clear(x, 19, z, 1, h, 1); m.clear(x + 2, 19, z, 1, h, 1); m.clear(x, 19, z + 2, 1, h, 1); m.clear(x + 2, 19, z + 2, 1, h, 1); }
        const mx = x + (w === 3 ? 1 : 0);
        m.set(mx, 16, z + 1, c); m.box(mx, 17, z, 1, 2, w, c); if (w === 3) m.box(x, 18, z + 1, 3, 1, 1, c);   // conical foot
        m.box(mx, 22, z + w - 1, w === 3 ? 1 : 2, 1, 1, '#2a1a0a'); m.box(mx, 23, z + w - 1, w === 3 ? 1 : 2, 1, 1, '#f4dc98');  // mouth & lip
        m.set(mx, 19 + h - 1, z + (w === 3 ? 1 : 0), '#6a4a18');                 // open top
      }
    }
    // tower cornices, cresting & finials
    for (const [x0, x1, y] of [[0, 11, 45], [17, 28, 50], [33, 44, 45]]) {
      m.box(x0, y - 2, 1, x1 - x0, 2, 9, walD); m.box(x0 + 1, y - 3, 8, x1 - x0 - 2, 1, 1, wal);
      for (let x = x0 + 1; x < x1; x += 3) m.set(x, y, 8, BRASS);
    }
    m.box(11, 36, 1, 6, 2, 6, walD); m.box(28, 36, 1, 5, 2, 6, walD);           // flat cornices
    m.box(0, 15, 0, 1, 30, 9, walD); m.box(43, 15, 0, 1, 30, 9, walD);           // case sides
  },
});
function walL(c) { return c === '#5a3620' ? '#704a30' : c; }

// Choir chair: oak with a crimson seat cushion, hymnal box on the back. Seat 0.45 m, faces +z.
defineProp('choir_chair', {
  size: [8, 16, 9], collide: [0.45, 0.9, 0.5],
  build(m) {
    const oak = '#7a5030', oakD = '#5a3a22';
    for (const [x, z] of [[0, 1], [7, 1], [0, 8], [7, 8]]) m.box(x, 0, z, 1, 6, 1, oakD);
    m.box(0, 6, 1, 8, 1, 8, oak); m.box(1, 7, 2, 6, 1, 6, '#8a1a22');
    m.box(0, 7, 1, 1, 9, 1, oakD); m.box(7, 7, 1, 1, 9, 1, oakD);
    m.box(0, 15, 1, 8, 1, 1, oak); m.box(1, 10, 1, 6, 4, 1, oak); m.set(3.5, 12, 2, GOLD); m.set(4, 12, 2, GOLD);
    m.box(1, 8, 0, 6, 3, 1, oakD); m.box(2, 9, 0, 1, 2, 1, '#1a1a2a'); m.box(4, 9, 0, 1, 2, 1, '#5a1a1a');   // hymnal box
    m.box(0, 2, 1, 8, 1, 1, oakD);
  },
});

// Brass collection plate with a red felt bottom, a few folded bills, coins & offering envelopes.
// 1/32 m voxels (0.34 m).
defineProp('collection_plate', {
  size: [12, 3, 12], scale: 1 / 32,
  build(m) {
    m.cyl(6, 0, 6, 4, 1, BRASS_D); m.cyl(6, 1, 6, 5.6, 1, BRASS); m.cyl(6, 2, 6, 6, 1, BRASS_L);
    m.cyl(6, 1, 6, 4.2, 1, '#8a1a22'); m.cyl(6, 2, 6, 5, 1, 0);
    m.box(3, 2, 4, 3, 1, 2, '#9ab89a'); m.box(7, 2, 6, 2, 1, 3, '#f4ecd8'); m.set(5, 2, 8, '#c8ccd0'); m.set(8, 2, 3, '#b87a3a');
  },
});

// ---------------------------------------------------------------- school

// 1950s combination school desk: maple seat & back on a tubular steel frame, attached writing top with
// pencil groove and inkwell in front, book box beneath, book rack under the seat. Student faces +z.
defineProp('desk_school', {
  size: [10, 13, 15], collide: [0.6, 0.78, 0.9],
  build(m) {
    const st = '#3e5048', map = '#c8986a', mapD = '#a87a4e';
    // frame runners
    m.box(1, 0, 1, 1, 1, 13, st); m.box(8, 0, 1, 1, 1, 13, st);
    m.box(1, 1, 2, 1, 5, 1, st); m.box(8, 1, 2, 1, 5, 1, st); m.box(1, 1, 12, 1, 10, 1, st); m.box(8, 1, 12, 1, 10, 1, st);
    m.box(1, 3, 3, 8, 1, 5, st);                               // book rack under the seat
    m.box(2, 4, 4, 5, 1, 3, '#2a4a7a'); m.box(3, 5, 4, 3, 1, 3, '#8a2a2a');
    // seat & back
    m.box(1, 6, 1, 8, 1, 6, map); m.box(1, 6, 7, 8, 1, 1, mapD);
    m.box(1, 7, 1, 1, 5, 1, st); m.box(8, 7, 1, 1, 5, 1, st); m.box(1, 9, 0, 8, 3, 1, map);
    m.box(1, 6, 7, 1, 1, 5, st); m.box(8, 6, 7, 1, 1, 5, st);  // side rails to the desk
    // desk: book box and top
    m.box(1, 8, 9, 8, 3, 5, st); m.box(1, 11, 8, 8, 1, 7, map); m.box(1, 11, 14, 8, 1, 1, mapD);
    m.box(2, 11, 9, 6, 1, 1, mapD); m.set(7, 11, 9, '#1a1a1a');                // pencil groove & inkwell
    m.set(3, 12, 11, '#e8c23a'); m.set(4, 12, 11, '#e8c23a');                   // a yellow pencil
  },
});

// Teacher's oak desk (1.5 x 0.75 m): twin drawer pedestals, green blotter, apple, hand bell, books,
// inkwell & pen. The teacher sits at -z; the modesty panel faces the class (+z).
defineProp('desk_teacher', {
  size: [24, 14, 12], collide: [1.5, 0.78, 0.75],
  build(m) {
    const oak = '#a8784a', oakD = '#86592f';
    m.box(0, 0, 0, 7, 12, 12, oak); m.box(17, 0, 0, 7, 12, 12, oak);
    m.box(7, 4, 11, 10, 8, 1, oak); m.box(8, 5, 11, 8, 6, 1, oakD);          // modesty panel (front)
    for (const x of [0, 17]) for (const y of [1, 5, 9]) { m.box(x + 1, y, 0, 5, 3, 1, oakD); m.set(x + 3, y + 1, 0, BRASS); }
    m.box(7, 10, 0, 10, 2, 1, oakD); m.set(12, 10, 0, BRASS);
    m.box(0, 12, 0, 24, 1, 12, oakD); m.box(0, 12, 0, 24, 1, 1, oak);
    m.box(5, 13, 2, 10, 1, 6, '#2e5a3a'); m.box(5, 13, 2, 1, 1, 6, '#6a3a1e'); m.box(14, 13, 2, 1, 1, 6, '#6a3a1e');   // blotter
    m.set(8, 13, 4, '#f4f0e0'); m.set(9, 13, 4, '#f4f0e0'); m.set(10, 13, 5, '#f4f0e0');                               // papers
    m.set(19, 13, 8, '#c8202a'); m.set(19, 14, 8, '#6a3a1a');                  // apple
    m.set(21, 13, 4, BRASS); m.set(21, 14, 4, WALNUT);                          // hand bell
    m.box(1, 13, 7, 3, 1, 4, '#2a4a7a'); m.box(1, 14, 7, 3, 1, 4, '#8a2a2a'); m.box(2, 15, 8, 2, 1, 3, '#2e5a3a');    // books
    m.set(16, 13, 3, '#1a1a2a'); m.set(17, 14, 3, '#1a1a1a');                  // inkwell & pen
  },
});

// Chalk ledge for a blackboard, back at z=0, 1/32 m voxels (1.2 m): oak trough with felt erasers and
// sticks of white & yellow chalk, a dusting of chalk.
defineProp('chalk_eraser_tray', {
  size: [38, 4, 4], scale: 1 / 32, origin: [19, 0, 0],
  build(m) {
    m.box(0, 0, 0, 38, 1, 4, OAK_D); m.box(0, 1, 3, 38, 1, 1, OAK_D); m.box(0, 1, 0, 38, 1, 3, '#e8e4dc');
    for (const x of [4, 17, 29]) { m.box(x, 1, 1, 5, 1, 2, '#3a3a3a'); m.box(x, 2, 1, 5, 1, 2, OAK); }
    for (const [x, c] of [[11, '#f8f8f4'], [13, '#f8f8f4'], [24, '#f0e060'], [35, '#f8f8f4']]) m.box(x, 2, 1, 2, 1, 1, c);
  },
});

// Classroom globe, 1/32 m voxels (0.55 m): tilted globe with 1950s political colours on a pale-blue
// ocean (Americas toward +z), brass half-meridian, turned walnut stand.
defineProp('school_globe', {
  size: [16, 18, 16], scale: 1 / 32, collide: [0.4, 0.55, 0.4],
  build(m) {
    m.cyl(8, 0, 8, 5, 1, WALNUT_D); m.cyl(8, 1, 8, 3, 1, WALNUT); m.cyl(8, 2, 8, 1.2, 3, WALNUT);
    const cy = 10.5, R = 5.6, tilt = 0.41;
    // continents as lat/lon boxes: [lat0, lat1, lon0, lon1, colour]   (lon 0 = facing +z)
    const land = [   // [lat0, lat1, lon0, lon1, colour] in real degrees; the view is turned so the Americas face +z
      [15, 50, -125, -65, '#e8a8b8'], [50, 70, -140, -60, '#e8c070'], [-55, 10, -80, -35, '#e8e090'], [60, 83, -55, -20, '#f4f2ea'],
      [36, 70, -10, 40, '#c8d890'], [-35, 35, -17, 50, '#8ac080'], [10, 75, 40, 150, '#e8c070'], [8, 30, 68, 90, '#e8a8b8'], [-40, -12, 113, 153, '#e8a8b8'],
    ];
    for (let y = 0; y < 18; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - cy, dz = z + 0.5 - 8;
      const r = Math.hypot(dx, dy, dz);
      if (r > R) continue;
      // un-tilt around z axis
      const ux = dx * Math.cos(tilt) + dy * Math.sin(tilt), uy = -dx * Math.sin(tilt) + dy * Math.cos(tilt);
      const lat = Math.asin(uy / r) * 180 / Math.PI, lon = ((Math.atan2(ux, dz) * 180 / Math.PI - 90 + 540) % 360) - 180;
      let c = '#a8cce0';
      for (const [a0, a1, o0, o1, col] of land) if (lat >= a0 && lat <= a1 && lon >= o0 && lon <= o1) { c = col; break; }
      m.set(x, y, z, c);
    }
    // brass meridian half-ring & axis pins
    for (let a = 0; a <= Math.PI; a += 0.1) {
      const lx = -Math.sin(a) * (R + 0.9), ly = Math.cos(a) * (R + 0.9);
      const x = 8 + lx * Math.cos(tilt) - ly * Math.sin(tilt), y = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
      if (!m.get(Math.floor(x), Math.floor(y), 8)) m.set(Math.floor(x), Math.floor(y), 8, BRASS);
    }
    m.box(7.5, 4, 7.5, 1, 1, 1, BRASS);
  },
});

// Indoor flag stand: 48-star U.S. flag with gold fringe rippling toward +x from a walnut pole topped by
// a gilt eagle, on a weighted brass base. ORIGIN at the foot of the pole (flag extends toward +x);
// the flag's face is seen from +z.
defineProp('flag_stand', {
  size: [30, 43, 10], origin: [2, 0, 5], collide: [0.4, 2.6, 0.4],
  build(m) {
    m.cyl(2, 0, 5, 2.5, 1, BRASS_D); m.cyl(2, 1, 5, 1.6, 1, BRASS);
    m.box(2, 1, 5, 1, 37, 1, WALNUT);
    m.box(1, 38, 4, 3, 1, 3, GOLD); m.set(2, 39, 5, GOLD);                    // eagle: body, wings, head
    m.box(0, 40, 5, 5, 1, 1, GOLD); m.box(1, 41, 5, 3, 1, 1, GOLD); m.set(0, 41, 5, GOLD); m.set(4, 41, 5, GOLD); m.set(2, 42, 5, GOLD);
    const R = '#b8202a', W = '#f4f2ea', B = '#243a70';
    for (let x = 3; x < 29; x++) {
      const z = 5 + Math.round(Math.sin((x - 3) / 3.2) * 1.4), droop = Math.floor((x - 3) / 9);
      for (let s = 0; s < 13; s++) {
        const y = 36 - s - droop;
        let c = s % 2 === 0 ? R : W;
        if (s < 7 && x < 13) c = ((x + s) % 2 === 0) ? W : B;                    // canton, 48 stars as a dot grid
        m.set(x, y, z, c);
      }
      if (x === 28) for (let s = 0; s < 13; s++) m.set(x + 1, 36 - s - droop, z, GOLD);
      m.set(x, 36 - 13 - droop, z, GOLD);                                       // bottom fringe
    }
    m.box(3, 36, 5, 1, 1, 1, '#d8d0b8');
  },
});

// Schoolroom wall clock, back at z=0, 1/32 m voxels (0.4 m): black bezel, white face, hour ticks,
// hands at ten past ten, red sweep hand. Origin = bottom-centre of the back face.
defineProp('classroom_clock', {
  size: [14, 14, 3], scale: 1 / 32, origin: [7, 0, 0],
  build(m) {
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
      const r = Math.hypot(x + 0.5 - 7, y + 0.5 - 7);
      if (r <= 7) { m.box(x, y, 0, 1, 1, 2, r > 5.8 ? '#1a1a1a' : '#f6f4ee'); if (r > 5.8) m.set(x, y, 2, '#2a2a2a'); }
    }
    for (let h = 0; h < 12; h++) { const a = h * Math.PI / 6; m.set(Math.floor(7 + Math.sin(a) * 4.9), Math.floor(7 + Math.cos(a) * 4.9), 2, h % 3 === 0 ? '#1a1a1a' : '#6a6a6a'); }
    m.set(7, 7, 2, '#1a1a1a'); m.set(6, 7, 2, '#1a1a1a'); m.set(5, 8, 2, '#1a1a1a');                  // hour hand (≈10)
    m.set(7, 8, 2, '#1a1a1a'); m.set(8, 9, 2, '#1a1a1a'); m.set(9, 10, 2, '#1a1a1a');                 // minute hand (2)
    m.set(7, 6, 2, '#c8202a'); m.set(7, 5, 2, '#c8202a'); m.set(7, 4, 2, '#c8202a');
  },
});

// Gymnasium basketball goal, back at z=0 (wall): steel wall bracket, white wooden backboard with a
// black target square, orange rim at regulation 3.05 m with a white cord net. The origin is on the
// floor at the wall, so the whole goal sits at the correct height when placed at floor level.
defineProp('basketball_hoop', {
  size: [20, 62, 17], origin: [10, 0, 0],
  build(m) {
    const st = '#4a5054';
    m.box(7, 40, 0, 6, 20, 1, st);                           // wall plate
    m.box(8, 44, 1, 1, 1, 5, st); m.box(11, 44, 1, 1, 1, 5, st); m.box(8, 56, 1, 1, 1, 5, st); m.box(11, 56, 1, 1, 1, 5, st);
    for (let i = 0; i < 11; i++) { m.set(8, 45 + i, 1 + Math.floor(i / 2.2), st); m.set(11, 45 + i, 1 + Math.floor(i / 2.2), st); }
    m.box(0, 45, 6, 20, 16, 1, '#f4f2ea'); m.box(0, 45, 5, 20, 16, 1, '#c8c4b8');
    m.box(0, 45, 7, 20, 1, 1, '#2a2a2a'); m.box(0, 60, 7, 20, 1, 1, '#2a2a2a'); m.box(0, 45, 7, 1, 16, 1, '#2a2a2a'); m.box(19, 45, 7, 1, 16, 1, '#2a2a2a');
    m.box(6, 49, 7, 8, 1, 1, '#2a2a2a'); m.box(6, 54, 7, 8, 1, 1, '#2a2a2a'); m.box(6, 49, 7, 1, 6, 1, '#2a2a2a'); m.box(13, 49, 7, 1, 6, 1, '#2a2a2a');
    // rim at y=48 (3.05 m), centre z=12
    m.box(9, 48, 7, 2, 1, 2, '#d8601a');
    for (let a = 0; a < 32; a++) { const t = a * Math.PI / 16; m.set(Math.floor(10 + Math.cos(t) * 3.7), 48, Math.floor(12.5 + Math.sin(t) * 3.7), '#e8702a'); }
    for (let y = 44; y < 48; y++) {
      const r = 3.4 - (48 - y) * 0.35;
      for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6 + (y & 1) * 0.26; m.set(Math.floor(10 + Math.cos(t) * r), y, Math.floor(12.5 + Math.sin(t) * r), '#f4f4f0'); }
    }
  },
});

// Trophy case, back at z=0 (1.5 x 1.9 m): oak cabinet with a glass front (frame only), three glass
// shelves of gold loving cups, a football, plaques, a bronze runner, a team photograph and felt pennants
// in the school colours (tint A with tint B lettering).
defineProp('trophy_case', {
  size: [24, 31, 8], origin: [12, 0, 0], collide: [1.5, 1.9, 0.5],
  build(m) {
    const oak = '#a8784a', oakD = '#86592f';
    m.box(0, 0, 0, 24, 6, 8, oak); for (const x of [1, 12]) { m.box(x, 1, 7, 11, 4, 1, oakD); m.set(x + 5, 3, 8, BRASS); }
    m.box(0, 6, 0, 24, 1, 8, oakD); m.box(0, 29, 0, 24, 2, 8, oakD);
    m.box(0, 7, 0, 1, 22, 8, oak); m.box(23, 7, 0, 1, 22, 8, oak); m.box(1, 7, 0, 22, 22, 1, '#3a2a4a');   // velvet back
    frame(m, 0, 6, 0, 24, 24, 8, oakD); m.box(12, 7, 7, 1, 22, 1, oakD);
    for (const y of [13, 20]) m.box(1, y, 1, 22, 1, 6, '#c8dce0');
    const cup = (x, y, h) => {
      m.box(x, y, 3, 3, 1, 3, '#3a2a1a'); m.box(x + 1, y + 1, 4, 1, 1, 1, GOLD);
      m.box(x, y + 2, 3, 3, h, 3, GOLD); m.box(x + 1, y + 2, 3, 1, h, 1, BRASS_L);
      m.set(x - 1, y + 2 + (h >> 1), 4, GOLD); m.set(x + 3, y + 2 + (h >> 1), 4, GOLD);
    };
    cup(3, 7, 3); cup(9, 7, 2); m.box(15, 7, 3, 4, 2, 3, '#7a4a2a'); m.box(16, 9, 4, 2, 1, 1, '#7a4a2a'); m.box(16, 8, 6, 2, 1, 1, '#f4f0e0');   // football
    m.box(20, 7, 2, 2, 4, 3, oakD);
    cup(3, 14, 4); m.box(8, 14, 2, 4, 5, 1, oakD); m.box(9, 15, 2, 2, 3, 1, BRASS);   // plaque
    m.box(15, 14, 4, 2, 1, 2, '#3a2a1a'); m.box(15, 15, 4, 1, 3, 1, '#8a5a2a'); m.set(16, 17, 4, '#8a5a2a'); m.set(14, 16, 4, '#8a5a2a');   // bronze runner
    cup(19, 14, 3);
    m.box(3, 21, 1, 7, 5, 1, '#1a1a1a'); m.box(4, 22, 1, 5, 3, 1, '#b8b0a0');       // team photo
    for (const x of [5, 7]) m.set(x, 23, 1, '#5a5048');
    // pennants hung on the back
    for (const [x, y] of [[13, 25], [18, 22]]) {
      for (let i = 0; i < 6; i++) m.box(x + i, y + (i >> 1), 1, 1, 4 - (i >> 1) * 2 + (i > 3 ? 1 : 0), 1, TA(0.5));
      m.set(x + 1, y + 1, 2, TB(0.55)); m.set(x + 2, y + 2, 2, TB(0.55));
    }
    cup(10, 21, 4);
    glint(m, 3, 9, 7, 4); glint(m, 15, 16, 7, 3);
  },
});

// Bank of three school lockers, back at z=0 (0.9 x 1.8 m, 0.4 m deep): institutional green steel with
// louvre vents, chrome lift handles, combination dials and brass number plates.
defineProp('lockers', {
  size: [15, 30, 7], origin: [7.5, 0, 0], collide: [0.94, 1.85, 0.44],
  build(m) {
    const gr = '#6a8a78', grD = '#4e6a58', grL = '#7a9a88';
    m.box(0, 0, 0, 15, 2, 6, '#2a2a2a');
    m.box(0, 2, 0, 15, 27, 6, gr); m.box(0, 29, 0, 15, 1, 6, grD);
    for (let i = 0; i < 3; i++) {
      const x = i * 5;
      m.box(x, 2, 5, 1, 27, 1, grD);                           // door gaps
      m.box(x + 1, 3, 6, 4, 25, 1, gr);                        // door leaf, proud of the frame
      for (const y of [4, 6, 24, 26]) m.box(x + 1, y, 6, 4, 1, 1, grD);            // louvres
      m.box(x + 4, 13, 6, 1, 4, 1, grD); m.set(x + 4, 14, 6, CHROME); m.set(x + 4, 15, 6, CHROME);   // lift handle
      m.set(x + 2, 15, 6, '#1a1a1a'); m.set(x + 2, 16, 6, '#e8e8e0');               // combination dial
      m.box(x + 2, 21, 6, 2, 1, 1, BRASS);                     // number plate
    }
    m.box(14, 2, 5, 1, 27, 1, grD);
  },
});

// ---------------------------------------------------------------- hospital

// Hospital bed: white enamelled iron with spindled head & foot boards, crank at the foot, castors;
// made up with white sheets, a pale-blue blanket and pillow. The patient's head is at -z. Chart on the
// footboard.
defineProp('hospital_bed', {
  size: [15, 20, 33], collide: [0.95, 0.75, 2.05],
  build(m) {
    const w = '#eef0ee', wD = '#c8ccc8', sheet = '#f8f8f4', blanket = '#a8c0d8';
    for (const [x, z] of [[0, 0], [14, 0], [0, 32], [14, 32]]) { m.box(x, 1, z, 1, 1, 1, '#2a2a2a'); m.set(x, 0, z, '#1a1a1a'); }
    // head board (tall) & foot board
    m.box(0, 2, 0, 1, 18, 1, w); m.box(14, 2, 0, 1, 18, 1, w); m.box(0, 19, 0, 15, 1, 1, w); m.box(0, 13, 0, 15, 1, 1, w);
    for (let x = 2; x < 14; x += 2) m.box(x, 13, 0, 1, 6, 1, w);
    m.box(0, 2, 32, 1, 13, 1, w); m.box(14, 2, 32, 1, 13, 1, w); m.box(0, 14, 32, 15, 1, 1, w); m.box(0, 10, 32, 15, 1, 1, w);
    for (let x = 2; x < 14; x += 2) m.box(x, 10, 32, 1, 4, 1, w);
    // spring frame & mattress
    m.box(0, 7, 1, 15, 1, 31, wD);
    m.box(1, 8, 1, 13, 2, 31, sheet); m.box(1, 10, 1, 13, 1, 31, sheet);
    m.box(0, 8, 9, 15, 3, 23, blanket); m.box(1, 11, 9, 13, 1, 22, blanket); m.box(0, 10, 9, 15, 1, 2, sheet);   // blanket with turned-down sheet
    m.box(2, 11, 2, 11, 2, 5, '#fbfbf8'); m.box(3, 13, 3, 9, 1, 3, '#fbfbf8');     // pillow
    // crank & chart
    m.box(7, 6, 33 - 1, 1, 1, 1, CHROME_D); m.box(7, 5, 32, 1, 2, 1, CHROME);
    m.box(5, 11, 32, 5, 3, 1, '#8a6a48'); m.box(6, 11, 32, 3, 2, 1, '#f4f0e6'); m.set(7, 14, 32, CHROME);
  },
});

// IV stand, 1/32 m voxels (~1.9 m): chrome pole on a four-castor base, two hooks, an upturned glass
// bottle of saline with a rubber stopper, drip chamber and coiled tubing.
defineProp('iv_stand', {
  size: [16, 62, 16], scale: 1 / 32, collide: [0.3, 1.9, 0.3],
  build(m) {
    m.box(1, 1, 7.5, 14, 1, 1, CHROME); m.box(7.5, 1, 1, 1, 1, 14, CHROME);
    for (const [x, z] of [[1, 7.5], [14, 7.5], [7.5, 1], [7.5, 14]]) m.set(x, 0, z, '#1a1a1a');
    m.box(7, 2, 7, 2, 2, 2, CHROME_M); m.box(7.5, 4, 7.5, 1, 55, 1, CHROME);
    m.box(7.5, 30, 7.5, 1, 2, 1, CHROME_D);
    m.box(3, 58, 7.5, 10, 1, 1, CHROME); m.set(3, 57, 7.5, CHROME); m.set(12, 57, 7.5, CHROME); m.set(7.5, 59, 7.5, CHROME_M);
    // bottle hanging upside down from the left hook
    m.box(2, 56, 7.5, 3, 1, 1, CHROME_D); m.box(2, 47, 6.5, 3, 9, 3, GLASS); m.box(2, 47, 6.5, 3, 6, 3, '#d8ecf0');
    m.box(3, 45, 7.5, 1, 2, 1, '#8a3a2a'); m.box(3, 42, 7.5, 1, 3, 1, '#e8f0f0'); m.box(3, 38, 7.5, 1, 4, 1, '#d8dcd8');
    m.box(3, 30, 8.5, 1, 8, 1, '#d8dcd8'); m.box(4, 30, 9.5, 3, 1, 1, '#d8dcd8');
    m.box(3, 52, 9.5, 3, 2, 1, '#f4f0e0');                    // label
  },
});

// Three-panel folding privacy screen (1.8 m wide, 1.75 m): white-enamel tube frames with pale green
// cotton panels, set in a zigzag, on small castors. Faces +z.
defineProp('privacy_screen', {
  size: [30, 28, 9], collide: [1.85, 1.75, 0.5],
  build(m) {
    const fr = '#eeeeea', cl = '#c8dcc8', clD = '#b0c8b4';
    const panel = (x0, zA, zB) => {
      for (let i = 0; i < 10; i++) {
        const z = Math.round(zA + (zB - zA) * i / 9), x = x0 + i;
        m.box(x, 2, z, 1, 25, 1, i === 0 || i === 9 ? fr : (i % 3 === 1 ? clD : cl));
        m.set(x, 2, z, fr); m.set(x, 26, z, fr); m.set(x, 27, z, fr);
        if (i === 0 || i === 9) { m.box(x, 0, z, 1, 2, 1, fr); m.set(x, 0, z, '#2a2a2a'); }
      }
    };
    panel(0, 7, 2); panel(10, 2, 7); panel(20, 7, 2);
  },
});

// 1950s folding wheelchair, 1/32 m voxels: chrome tube frame, brown leatherette sling seat & back,
// large rear wheels with push rims & spokes, small front casters, footplates. The sitter faces +z.
defineProp('wheelchair', {
  size: [22, 30, 30], scale: 1 / 32, collide: [0.68, 0.95, 0.95],
  build(m) {
    const fr = CHROME, lea = '#5a3a2a', tyre = '#1e1e1e';
    // big rear wheels at the sides (x=0..1 and x=20..21), centre y=9.5, z=9
    for (const x of [0, 20]) {
      for (let y = 0; y < 20; y++) for (let z = 0; z < 20; z++) {
        const r = Math.hypot(y + 0.5 - 9.5, z + 0.5 - 9.5);
        if (r <= 9.5 && r > 8.3) m.box(x, y, z, 2, 1, 1, tyre);
        else if (r <= 8.3 && r > 7.5) m.set(x + (x ? 1 : 0), y, z, CHROME_M);
        else if (r < 7.5 && (Math.abs(y + 0.5 - 9.5) < 0.6 || Math.abs(z + 0.5 - 9.5) < 0.6 || Math.abs((y - z)) < 0.8 || Math.abs(y + z - 18) < 0.8)) m.set(x + (x ? 0 : 1), y, z, CHROME_D);
      }
      m.box(x + (x ? -1 : 2), 9, 9, 1, 1, 1, CHROME);         // hub
      for (let y = 1; y < 19; y++) for (let z = 1; z < 19; z++) { const r = Math.hypot(y + 0.5 - 9.5, z + 0.5 - 9.5); if (r <= 9.6 && r > 8.9) m.set(x ? 21 : 0, y, z, CHROME); }   // push rim
    }
    // frame sides
    for (const x of [3, 18]) {
      m.box(x, 10, 6, 1, 1, 16, fr); m.box(x, 10, 6, 1, 18, 1, fr); m.box(x, 27, 3, 1, 1, 4, fr);   // seat rail, back post, push handle
      m.box(x, 3, 22, 1, 8, 1, fr); m.box(x, 16, 7, 1, 1, 14, fr); m.box(x, 11, 20, 1, 5, 1, fr);   // front post, armrest
      m.box(x, 16, 8, 1, 1, 12, '#2a2a2a');
      m.box(x, 3, 22, 1, 1, 6, fr); m.box(x, 0, 25, 1, 3, 1, fr); m.box(x, 0, 24, 1, 1, 3, tyre);   // caster
    }
    m.box(4, 10, 7, 14, 1, 14, lea); m.box(4, 11, 6, 14, 11, 1, lea); m.box(4, 11, 7, 14, 1, 1, '#4a2a1a');
    m.box(4, 3, 25, 6, 1, 4, '#8a9298'); m.box(12, 3, 25, 6, 1, 4, '#8a9298');   // footplates
    m.box(4, 4, 23, 1, 7, 1, fr); m.box(17, 4, 23, 1, 7, 1, fr);
    for (const x of [3, 18]) m.box(x, 27, 2, 1, 1, 2, '#1a1a1a');
  },
});

// Hospital nursery bassinet, 1/32 m voxels: enamelled stand on castors with a shelf for linens, a white
// basket with a tiny swaddled baby (tint A blanket: pink or blue) in a knitted cap and a name card.
defineProp('bassinet', {
  size: [18, 30, 26], scale: 1 / 32, collide: [0.55, 0.9, 0.8],
  build(m) {
    const w = '#eeeeea', wD = '#c8ccc8';
    for (const [x, z] of [[1, 1], [16, 1], [1, 24], [16, 24]]) { m.box(x, 1, z, 1, 18, 1, CHROME); m.set(x, 0, z, '#1a1a1a'); }
    m.box(1, 6, 1, 16, 1, 24, wD); m.box(3, 7, 4, 10, 2, 8, '#f8f8f4'); m.box(3, 9, 4, 10, 1, 8, '#e0ecf4');    // linen shelf
    m.box(0, 19, 0, 18, 1, 26, wD); m.box(0, 20, 0, 18, 8, 26, w); m.clear(1, 21, 1, 16, 7, 24);          // basket
    m.box(1, 20, 1, 16, 2, 24, '#f8f8f4');                    // mattress & sheet
    // swaddled baby: head at -z
    m.box(6, 22, 8, 6, 3, 11, TA(0.55)); m.box(7, 25, 9, 4, 1, 9, TA(0.6)); m.box(6, 22, 18, 6, 2, 1, TA(0.5));
    for (let z = 10; z < 18; z += 3) m.box(6, 24, z, 6, 1, 1, TA(0.48));      // folds
    m.box(7, 22, 4, 4, 3, 4, '#f0d0b8'); m.box(7, 25, 4, 4, 1, 4, TA(0.62)); m.box(7, 24, 4, 4, 1, 1, TA(0.62));  // face & cap
    m.set(8, 23, 7, '#6a4a3a'); m.set(10, 23, 7, '#6a4a3a'); m.set(9, 22, 7, '#e0a8a0');
    // name card on the foot of the basket
    m.box(3, 21, 26 - 1, 12, 6, 1, '#f8f6ee'); m.text('BABY', 9, 22, 25, TA(0.4), { font: 'small', align: 'center' });
    m.box(3, 21, 25, 12, 1, 1, TA(0.5));
  },
});

// Doctor's examination table (1.85 m): white-enamel steel cabinet with drawers & a pull-out step,
// padded black leatherette top with the head section raised at -z, paper sheet from a roll.
defineProp('exam_table', {
  size: [12, 18, 31], collide: [0.75, 0.95, 1.9],
  build(m) {
    const w = '#eeeeea', wD = '#c8ccc8', lea = '#2a2a2e';
    m.box(0, 0, 0, 12, 1, 30, '#3a3a3a'); m.box(0, 1, 0, 12, 11, 30, w);
    for (const [z, h] of [[2, 4], [7, 4], [12, 4], [17, 4], [22, 4]]) { m.box(12 - 1, 2, z, 1, 3, h, wD); m.set(11, 3, z + 2, CHROME); }
    for (const z of [2, 12, 22]) { m.box(0, 7, z, 1, 3, 8, wD); m.set(0, 8, z + 4, CHROME); }
    m.box(2, 1, 30, 8, 3, 1, CHROME_M); m.box(2, 4, 30, 8, 1, 1, '#2a2a2a');   // pull-out step at the foot (+z)
    m.box(0, 12, 8, 12, 2, 22, lea);                          // flat section
    for (let z = 0; z < 8; z++) m.box(0, 12 + Math.floor((8 - z) / 2), z, 12, 2, 1, lea);   // raised head section
    m.box(2, 14, 10, 8, 1, 20, '#f4f2ea');                     // paper sheet
    for (let z = 1; z < 8; z++) m.box(2, 14 + Math.floor((8 - z) / 2), z, 8, 1, 1, '#f4f2ea');
    m.cylX(1, 13, 30, 1.3, 10, '#f4f2ea'); m.box(0, 12, 30, 1, 2, 1, CHROME); m.box(11, 12, 30, 1, 2, 1, CHROME);   // paper roll
  },
});

// Tall medicine cabinet, back at z=0 (0.8 x 1.9 m, 0.4 m): white enamel with a glazed upper case (frame
// only) of bottles — brown, cobalt, clear — boxes & a jar of swabs; solid doors below; a red cross.
defineProp('medicine_cabinet_tall', {
  size: [13, 31, 7], origin: [6.5, 0, 0], collide: [0.82, 1.92, 0.44],
  build(m) {
    const w = '#eeeeea', wD = '#c8ccc8';
    m.box(0, 0, 0, 13, 1, 7, '#3a3a3a'); m.box(0, 1, 0, 13, 11, 7, w);
    m.box(1, 2, 6, 5, 9, 1, wD); m.box(7, 2, 6, 5, 9, 1, wD); m.set(5, 7, 7 - 1, CHROME); m.set(7, 7, 7 - 1, CHROME);
    m.box(0, 12, 0, 13, 1, 7, wD); m.box(0, 12, 0, 1, 18, 7, w); m.box(12, 12, 0, 1, 18, 7, w); m.box(0, 30, 0, 13, 1, 7, w); m.box(1, 12, 0, 11, 18, 1, w);
    frame(m, 0, 12, 0, 13, 19, 7, w); m.box(6, 13, 6, 1, 17, 1, w);
    for (const y of [17, 22, 26]) m.box(1, y, 1, 11, 1, 5, '#d8e8ec');
    const bot = ['#6a3a1a', '#2a4ab0', '#e8eef0', '#6a3a1a', '#2a4ab0', '#e8eef0', '#6a3a1a', '#3a8a4a'];
    for (const [y, o] of [[13, 0], [18, 2], [23, 4]]) for (let i = 0; i < 5; i++) { const x = 2 + i * 2; bottle(m, x, y, 3, 2 + ((i + o) % 2), bot[(i + o) % 8], i % 2 ? '#1a1a1a' : '#f4f0e0'); }
    m.box(2, 27, 2, 3, 2, 3, '#f4f0e6'); m.box(7, 27, 2, 3, 3, 3, GLASS); m.box(7, 27, 2, 3, 2, 3, '#f8f8f4');   // box & swab jar
    m.box(5, 9, 7 - 1, 3, 1, 1, '#c8202a'); m.box(6, 8, 7 - 1, 1, 3, 1, '#c8202a');
  },
});

// Nurses' station counter module (1.0 m, 1.05 m high): white steel with a linoleum top; black rotary
// telephone, gooseneck lamp, clipboard chart rack, call-bell. Visitors at +z, the nurse at -z.
defineProp('nurses_desk', {
  size: [16, 23, 12], collide: [1.0, 1.05, 0.75],
  build(m) {
    const w = '#eeeeea', wD = '#c8ccc8';
    m.box(0, 0, 1, 16, 1, 10, '#3a3a3a'); m.box(0, 1, 0, 16, 16, 11, w);
    m.box(0, 10, 11, 16, 1, 1, wD); m.box(0, 16, 0, 16, 1, 12, '#8aa0a8'); m.box(0, 16, 11, 16, 1, 1, CHROME);
    m.clear(1, 1, 0, 14, 10, 4); m.box(1, 5, 0, 14, 1, 4, wD);
    for (let x = 2; x < 14; x += 3) m.box(x, 6, 1, 2, 4, 2, '#8a6a48');           // files
    m.box(0, 11, 0, 16, 1, 12, '#b8c8cc');                    // writing shelf at -z
    // phone
    m.box(2, 17, 3, 3, 2, 3, '#1a1a1a'); m.box(2, 19, 3, 3, 1, 1, '#1a1a1a'); m.box(2, 19, 5, 3, 1, 1, '#1a1a1a'); m.set(3, 18, 6, '#e8e8e0');
    // gooseneck lamp
    m.box(12, 17, 2, 2, 1, 2, '#2a4a3a'); m.box(12.5, 18, 2.5, 1, 4, 1, CHROME); m.box(12, 22, 3, 2, 1, 3, '#2a4a3a'); m.set(12.5, 21, 5, { c: '#fff4d0', emit: 0.6 });
    // chart rack with clipboards
    m.box(6, 17, 1, 5, 1, 4, CHROME_D); for (let i = 0; i < 3; i++) { m.box(6 + i * 2, 18, 2, 1, 4, 3, '#8a6a48'); m.set(6 + i * 2, 22, 3, CHROME); }
    m.set(14, 17, 9, CHROME); m.set(14, 18, 9, '#1a1a1a');     // call bell
  },
});

// Infant incubator (Isolette-style), 1/32 m voxels: white cabinet on castors with controls, clear hood
// (frame only) with chrome porthole rings, a tiny baby in a tint-A cap on a white mattress.
defineProp('incubator', {
  size: [30, 34, 18], scale: 1 / 32, collide: [0.95, 1.05, 0.56],
  build(m) {
    const w = '#eeeeea', wD = '#c8ccc8';
    for (const [x, z] of [[1, 1], [28, 1], [1, 16], [28, 16]]) m.box(x, 0, z, 1, 2, 1, '#1a1a1a');
    m.box(0, 2, 0, 30, 18, 18, w); m.box(1, 3, 17, 28, 1, 1, wD);
    m.box(3, 6, 18 - 1, 10, 6, 1, '#c8ccc8'); m.set(5, 9, 17, { c: '#ff6040', emit: 0.6 }); m.set(8, 9, 17, { c: '#60e060', emit: 0.6 }); m.set(11, 8, 17, '#2a2a2a');   // control panel
    m.box(17, 6, 17, 9, 10, 1, wD); m.set(24, 11, 17, CHROME);
    m.box(0, 20, 0, 30, 1, 18, wD); m.box(2, 21, 2, 26, 1, 14, '#f8f8f4');
    frame(m, 1, 21, 1, 28, 12, 16, '#d8e4e8'); m.box(1, 32, 1, 28, 1, 16, '#e8f2f4');
    for (const x of [7, 22]) for (let a = 0; a < 16; a++) { const t = a * Math.PI / 8; m.set(Math.floor(x + Math.cos(t) * 2.8), Math.floor(26.5 + Math.sin(t) * 2.8), 16, CHROME); }
    // baby
    m.box(11, 22, 6, 9, 2, 6, '#f4f2ee'); m.box(8, 22, 7, 3, 3, 4, '#f0d0b8'); m.box(8, 25, 7, 3, 1, 4, TA(0.6)); m.box(7, 23, 7, 1, 2, 4, TA(0.6));
    m.set(11, 23, 7, '#f0d0b8'); m.set(11, 23, 10, '#f0d0b8');
  },
});

// ---------------------------------------------------------------- theatre

// Row module of four theatre seats, 2.2 m wide: crimson velvet tip-up seats (0.45 m) & backs, walnut
// armrests, cast-iron end standards with a little amber aisle lamp, brass seat numbers on the backs.
// Sitters face +z. Rows tile along x.
defineProp('theater_seats', {
  size: [36, 16, 11], collide: [2.25, 0.95, 0.68],
  build(m) {
    const vel = '#8a1420', velD = '#6a0e18', velL = '#a01c28', ir = '#26262a', wal = '#5a3620';
    const arms = [0, 9, 18, 27, 35];
    for (const x of arms) {
      m.box(x, 0, 2, 1, 10, 7, ir); m.box(x, 10, 1, 1, 1, 9, wal);
      if (x === 0 || x === 35) { m.box(x, 0, 1, 1, 11, 9, ir); m.box(x, 3, 8, 1, 2, 1, { c: '#ffb050', emit: 0.5 }); m.set(x, 7, 5, '#3a3a3e'); }
    }
    for (let i = 0; i < 4; i++) {
      const x0 = arms[i] + 1, w = arms[i + 1] - x0;
      m.box(x0, 5, 3, w, 2, 6, vel); m.box(x0, 7, 3, w, 1, 5, velL); m.box(x0, 5, 9, w, 2, 1, velD);   // seat cushion
      for (let y = 7; y < 16; y++) m.box(x0, y, 2 - (y > 12 ? 1 : 0), w, 1, 1, y === 15 ? velD : vel);   // back
      m.box(x0, 7, 1, w, 8, 1, wal);                                                                       // wooden back shell
      m.box(x0 + (w >> 1) - 1, 12, 0, 2, 1, 1, BRASS);                                                     // seat number
      m.box(x0 + 1, 9, 3 - 0, w - 2, 1, 1, velD);                                                          // tufting line
    }
  },
});

// 1950s carbon-arc projector (1.8 m): lamphouse with chimney at the rear, projector head with lens
// pointing +z (toward the screen), open 2,000-ft reels above and below, sound head, heavy pedestal.
defineProp('projector', {
  size: [14, 31, 28], collide: [0.8, 1.9, 1.7],
  build(m) {
    const gr = '#3e4a44', grD = '#2c3632', grL = '#56645c', blk = '#1a1a1c';
    m.box(2, 0, 6, 10, 1, 16, grD); m.box(4, 1, 9, 6, 10, 10, gr); m.box(3, 10, 4, 8, 2, 20, grD);   // pedestal & bed
    // lamphouse (rear, -z)
    m.box(2, 12, 3, 10, 9, 9, gr); m.box(2, 12, 3, 10, 1, 9, grD); m.box(12 - 1, 14, 5, 1, 5, 5, grL); m.set(11, 16, 7, { c: '#ffe0a0', emit: 0.7 });
    m.box(5, 21, 5, 4, 3, 4, grD); m.box(6, 24, 6, 2, 4, 2, CHROME_D);           // chimney
    // projector head & lens
    m.box(4, 12, 12, 6, 8, 8, grL); m.box(4, 12, 12, 1, 8, 8, gr);
    m.cylZ(7, 16, 20, 1.6, 4, CHROME_M); m.cylZ(7, 16, 24, 1.2, 2, blk); m.set(6.5, 15.5, 25, { c: '#d8e8ff', emit: 0.4 });
    m.box(9, 16, 16, 2, 2, 2, CHROME);                        // framing knob
    // sound head below, lower reel arm
    m.box(4, 8, 13, 6, 4, 6, gr); m.box(5, 7, 20, 4, 2, 2, grD);
    // reels: upper (above the head) & lower (on an arm at the front)
    const reel = (cy, cz, r) => {
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let z = Math.floor(cz - r); z <= cz + r; z++) {
        const d = Math.hypot(y + 0.5 - cy, z + 0.5 - cz);
        if (d > r) continue;
        const c = d > r - 1 ? CHROME_M : d < 1.2 ? CHROME : d < r * 0.62 ? '#3a2a1a' : (Math.abs(y + 0.5 - cy) < 0.6 || Math.abs(z + 0.5 - cz) < 0.6 ? CHROME_D : 0);
        if (c) m.box(6, y, z, 2, 1, 1, c);
      }
    };
    m.box(6.5, 20, 15, 1, 2, 1, grD); reel(25.5, 15.5, 5.5);
    m.box(6.5, 2, 22, 1, 6, 1, grD); reel(4.5, 23.5, 4.5);
    m.box(7, 21, 13, 0.5, 5, 1, '#3a2a1a'); m.box(7, 6, 19, 0.5, 6, 1, '#3a2a1a');   // film path
  },
});

// Popcorn cart, 1/32 m voxels (1.0 x 1.7 m): red cabinet on spoked wheels, glass case (frame) heaped
// with popcorn under a hanging kettle, warm lamp glow inside, "POPCORN" header in gold, a scoop and
// striped bags. Lights its surroundings when the room lamps are on.
defineProp('popcorn_machine', {
  size: [32, 54, 22], scale: 1 / 32, collide: [1.0, 1.7, 0.7], light: lampLight(0, 1.2, 0, [1.0, 0.8, 0.45], 3.5, 'room'),
  build(m) {
    const red = '#b8202a', redD = '#8a1820', gold = '#d8b04a', pop = '#f8ecc0', popD = '#e8d090';
    // wheels
    for (const x of [0, 30]) for (let y = 0; y < 12; y++) for (let z = 5; z < 17; z++) {
      const d = Math.hypot(y + 0.5 - 6, z + 0.5 - 11);
      if (d <= 6 && (d > 5 || d < 1.2 || Math.abs(y + 0.5 - 6) < 0.6 || Math.abs(z + 0.5 - 11) < 0.6)) m.box(x, y, z, 2, 1, 1, d > 5 ? '#2a2a2a' : gold);
    }
    m.box(2, 3, 2, 28, 16, 18, red); m.box(2, 3, 19, 28, 1, 1, gold); m.box(2, 18, 19, 28, 1, 1, gold);
    m.box(5, 6, 20 - 1, 10, 10, 1, redD); m.box(17, 6, 19, 10, 10, 1, redD); m.set(14, 11, 19, gold); m.set(17, 11, 19, gold);
    m.box(2, 19, 2, 28, 1, 18, gold);
    // glass case
    frame(m, 2, 20, 2, 28, 22, 18, gold); m.box(15, 20, 19, 2, 22, 1, gold);
    m.box(3, 20, 3, 26, 5, 16, pop);
    for (let x = 3; x < 29; x += 2) for (let z = 3; z < 19; z += 2) { const h = Math.round(2 + Math.sin(x * 0.5) * 1.3 + Math.cos(z * 0.6) * 1.3); if (h > 0) m.box(x, 25, z, 2, h, 2, (x + z) % 8 === 0 ? popD : pop); }
    // kettle hanging from the roof
    m.box(12, 36, 7, 8, 4, 8, CHROME_M); m.box(13, 35, 8, 6, 1, 6, CHROME_D); m.box(15, 40, 10, 2, 2, 2, CHROME_D);
    m.box(10, 38, 8, 2, 1, 1, CHROME); m.box(14, 34, 9, 4, 1, 4, pop);
    m.box(4, 40, 4, 24, 1, 14, { c: '#fff0c0', emit: 0.7 });   // lamp strip
    // roof & header
    m.box(0, 42, 0, 32, 2, 22, red); m.box(1, 44, 1, 30, 1, 20, redD);
    m.box(2, 45, 10, 28, 9, 2, red); m.box(2, 45, 12, 28, 1, 1, gold); m.box(2, 53, 10, 28, 1, 2, gold);
    label(m, 'POPCORN', 16, 47, 12, { c: '#f8d860', emit: 0.8 }, { align: 'center' });
    // bags & scoop
    for (let i = 0; i < 3; i++) { const x = 5 + i * 4; m.box(x, 19, 16, 3, 1, 3, '#f8f4ec'); for (let y = 20; y < 24; y++) m.box(x, y, 16, 3, 1, 3, (y + i) % 2 ? '#f8f4ec' : red); m.box(x, 24, 16, 3, 1, 3, pop); }
    m.box(22, 25, 10, 4, 1, 3, CHROME); m.box(26, 26, 11, 3, 1, 1, CHROME_D);
  },
});

// Art-deco ticket booth, 1/20 m voxels (1.6 m wide, 2.7 m): maroon & cream enamel with chrome bands,
// a window with a brass speaking grille and money trough, a ticket-issuing machine inside, a glowing
// "TICKETS" marquee on top. Customers at +z.
defineProp('ticket_booth', {
  size: [32, 54, 28], scale: 1 / 20, cat: 'exterior', collide: [1.6, 2.7, 1.4], light: lampLight(0, 2.55, 0.7, [1.0, 0.85, 0.6], 4, 'night'),
  build(m) {
    const mar = '#6a1a24', cream = '#efe6cc', chr = CHROME_M;
    m.box(0, 0, 0, 32, 3, 28, '#2a2a2a');
    m.box(1, 3, 1, 30, 16, 26, mar);
    for (const y of [6, 12]) m.box(0, y, 0, 32, 1, 28, chr);
    m.box(1, 19, 1, 30, 22, 26, cream);                       // upper body
    m.box(4, 22, 25, 24, 16, 3, 0); m.box(4, 22, 25, 24, 1, 1, chr);            // window opening
    frame(m, 3, 21, 25, 26, 18, 3, chr);
    m.box(4, 22, 3, 24, 16, 1, '#d8c8a8');                    // inside back wall
    m.box(4, 22, 3, 24, 1, 22, mar);                          // counter inside
    m.box(10, 23, 12, 10, 5, 8, CHROME_D); m.box(11, 28, 13, 8, 1, 6, CHROME); for (let x = 11; x < 19; x += 2) m.set(x, 26, 20, '#f0d860');  // ticket machine
    m.box(13, 29, 10, 6, 3, 4, '#f4e8c8');                    // roll of tickets
    m.box(12, 30, 26, 8, 5, 1, BRASS_D); for (let x = 13; x < 20; x += 2) for (let y = 31; y < 35; y += 2) m.set(x, y, 26, '#2a2a2a');   // speaking grille
    m.box(10, 21, 25, 12, 1, 3, BRASS);                       // money trough
    m.box(0, 41, 0, 32, 2, 28, chr); m.box(1, 43, 1, 30, 1, 26, mar);
    // marquee
    m.box(0, 44, 10, 32, 10, 3, mar); m.box(0, 44, 13, 32, 1, 1, chr); m.box(0, 53, 10, 32, 1, 4, chr);
    label(m, 'TICKETS', 16, 46, 13, { c: '#ffe070', emit: 0.95 }, { align: 'center' });
    for (let x = 2; x < 32; x += 3) m.set(x, 52, 13, { c: '#fff4c0', emit: 0.95 });
  },
});

// Velvet rope line, 1/32 m voxels (1.25 m): two polished brass stanchions with ball tops & weighted
// bases, a crimson velvet rope sagging between brass hooks. Runs along x.
defineProp('velvet_rope', {
  size: [40, 32, 8], scale: 1 / 32, collide: [1.25, 0.95, 0.25],
  build(m) {
    for (const x of [3.5, 36.5]) {
      m.cyl(x, 0, 4, 3.5, 1, BRASS_D); m.cyl(x, 1, 4, 2.4, 1, BRASS); m.cyl(x, 2, 4, 1, 26, BRASS_L);
      m.cyl(x, 12, 4, 1.4, 1, BRASS); m.sphere(x, 29.5, 4, 2, BRASS_L);
    }
    for (let x = 5; x <= 35; x++) {
      const t = (x - 5) / 30, y = Math.round(27 - Math.sin(t * Math.PI) * 7);
      m.box(x, y, 3, 1, 2, 2, x & 1 ? '#9a1420' : '#8a101c');
    }
    m.box(4, 27, 3, 2, 2, 2, BRASS); m.box(34, 27, 3, 2, 2, 2, BRASS);
  },
});

// Framed one-sheet movie poster, back at z=0, 1/32 m voxels (0.88 x 1.25 m): chrome frame; a
// 1950s space picture — starfield, ringed planet, red & silver rocket, a hero & heroine, "ROCKET"
// title and credit lines.
defineProp('movie_poster', {
  size: [28, 40, 2], scale: 1 / 32, origin: [14, 0, 0],
  build(m) {
    m.box(0, 0, 0, 28, 40, 1, CHROME_M); m.box(0, 0, 1, 28, 1, 1, CHROME_D); m.box(0, 39, 1, 28, 1, 1, CHROME_D); m.box(0, 0, 1, 1, 40, 1, CHROME_D); m.box(27, 0, 1, 1, 40, 1, CHROME_D);
    for (let y = 1; y < 39; y++) m.box(1, y, 1, 26, 1, 1, y > 26 ? '#141a3a' : y > 14 ? '#1e2a5a' : '#3a2a5a');
    for (const [x, y] of [[3, 36], [8, 33], [20, 35], [24, 30], [5, 28], [14, 37], [22, 25], [11, 24]]) m.set(x, y, 1, '#f8f4d0');
    // ringed planet
    for (let y = 20; y < 30; y++) for (let x = 16; x < 27; x++) { const d = Math.hypot(x + 0.5 - 21, y + 0.5 - 25); if (d < 3.6) m.set(x, y, 1, d < 2.2 ? '#f0a040' : '#d87a2a'); }
    for (let x = 15; x < 28; x++) m.set(x, Math.round(25 + (x - 21) * 0.25), 1, '#f4e0a0');
    // rocket on a diagonal with exhaust
    for (let i = 0; i < 9; i++) { m.set(4 + i, 16 + i, 1, '#d8dde2'); m.set(5 + i, 16 + i, 1, '#b8c0c8'); }
    m.set(13, 25, 1, '#c8202a'); m.set(12, 25, 1, '#c8202a'); m.set(13, 24, 1, '#c8202a');
    m.set(4, 18, 1, '#c8202a'); m.set(6, 15, 1, '#c8202a'); m.set(3, 15, 1, '#ffd060'); m.set(2, 14, 1, '#ff8030'); m.set(3, 14, 1, '#ffd060');
    // hero & heroine heads
    m.box(4, 7, 1, 4, 5, 1, '#e8c0a0'); m.box(4, 11, 1, 4, 2, 1, '#3a2a1a'); m.set(5, 9, 1, '#2a2a2a'); m.set(7, 9, 1, '#2a2a2a');
    m.box(9, 6, 1, 4, 5, 1, '#f0cdb0'); m.box(8, 10, 1, 6, 3, 1, '#e8c060'); m.box(8, 6, 1, 1, 4, 1, '#e8c060'); m.set(10, 8, 1, '#2a2a2a'); m.set(12, 8, 1, '#2a2a2a'); m.set(11, 7, 1, '#c8202a');
    m.box(4, 4, 1, 4, 3, 1, '#2a3a6a'); m.box(9, 4, 1, 4, 2, 1, '#c8202a');
    // title & credits
    m.box(1, 30, 1, 26, 8, 1, '#141a3a');
    m.text('ROCKET', 14, 32, 1, '#f8d030', { font: 'small', align: 'center' });
    m.box(4, 31, 1, 20, 1, 1, '#c8202a');
    for (const y of [2, 3]) for (let x = 15; x < 26; x += 2) m.set(x, y, 1, '#8a90b0');
    m.box(16, 8, 1, 9, 1, 1, '#f8f4d0'); m.box(17, 6, 1, 7, 1, 1, '#c8c8d8');
  },
});

// ---------------------------------------------------------------- bowling alley

// Full rack of ten maple pins in the triangle, 1/32 m voxels: white with twin red neck stripes. The
// head pin is nearest the bowler at +z; 30 cm spacing.
defineProp('bowling_pins', {
  size: [36, 13, 32], scale: 1 / 32,
  build(m) {
    const prof = [1.2, 1.6, 2.1, 2.1, 2.1, 1.6, 1.2, 1.2, 0.8, 0.8, 1.2, 1.2, 0.8];
    const pin = (cx, cz) => prof.forEach((r, y) => m.cyl(cx, y, cz, r, 1, y === 8 || y === 9 ? '#c8202a' : '#f6f4ee'));
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) pin(18 + (i - row / 2) * 9.6, 27.5 - row * 8.3);
  },
});

// Ball return at the end of the approach, 1/32 m voxels (1.5 m long along z): mahogany & chrome hood
// where balls emerge, a sloped rail holding three balls, a hand-dryer grille. Bowlers stand at +z.
defineProp('ball_return', {
  size: [20, 26, 48], scale: 1 / 32, collide: [0.62, 0.8, 1.5],
  build(m) {
    const mah = '#6a2e1e', mahD = '#4e2014';
    m.box(2, 0, 0, 16, 3, 48, mahD);
    m.box(3, 3, 0, 14, 16, 14, mah); for (let z = 0; z < 14; z++) m.box(3, 19, z, 14, Math.round(4 - Math.abs(z - 7) * 0.5), 1, mah);  // rounded hood
    m.box(4, 4, 14, 12, 12, 1, '#1a1a1a'); m.box(3, 16, 14, 14, 1, 1, CHROME); m.box(3, 3, 14, 14, 1, 1, CHROME);
    for (let y = 6; y < 11; y += 2) m.box(5, y, 14, 10, 1, 1, CHROME_D);          // air vent grille
    // rails sloping down toward +z
    for (let z = 14; z < 46; z++) { const y = 10 - Math.floor((z - 14) / 6); m.box(4, y, z, 1, 1, 1, CHROME); m.box(15, y, z, 1, 1, 1, CHROME); m.box(4, 3, z, 12, y - 3, 1, mah); }
    m.box(3, 3, 46, 14, 5, 2, mah); m.box(3, 8, 46, 14, 1, 2, CHROME);
    const balls = ['#1a1a1c', '#6a1a2a', '#1e3a6a'];
    balls.forEach((c, i) => { const z = 20 + i * 8.5, y = 10 - Math.floor((z - 14) / 6) + 3.3; m.sphere(10, y, z, 4.2, c); m.set(9, Math.floor(y + 3), Math.floor(z), '#e8e8e8'); m.set(11, Math.floor(y + 3), Math.floor(z) + 1, '#e8e8e8'); });
    for (let i = 0; i < 3; i++) m.set(8 + i, 20, 16, '#101010');
  },
});

// House-ball rack, 1/32 m voxels (1.25 m): two tiers of cupped chrome rails on a walnut frame holding
// ten balls in black, maroon, blue, green & mottled colours, finger holes toward +z.
defineProp('bowling_ball_rack', {
  size: [40, 30, 14], scale: 1 / 32, collide: [1.25, 0.95, 0.44],
  build(m) {
    const wal = '#5a3620';
    for (const x of [0, 38]) m.box(x, 0, 0, 2, 26, 14, wal);
    m.box(2, 0, 7, 36, 2, 7, wal); m.box(2, 13, 0, 36, 2, 7, wal); m.box(2, 0, 0, 36, 13, 1, wal);
    for (const [y, z] of [[2, 10], [15, 3.5]]) { m.box(2, y, z - 2.5, 36, 1, 1, CHROME); m.box(2, y, z + 1.5, 36, 1, 1, CHROME); }
    const cols = ['#1a1a1c', '#6a1a2a', '#1e3a6a', '#1e5a3a', '#3a2a4a', '#8a3a1a', '#1a1a1c', '#1e3a6a', '#6a1a2a', '#2a4a4a'];
    for (let i = 0; i < 10; i++) {
      const top = i >= 5, x = 5.5 + (i % 5) * 7.2, y = top ? 18.5 : 5.5, z = top ? 3.5 : 10;
      m.sphere(x, y, z, 3.4, cols[i]);
      m.set(Math.floor(x) - 1, Math.floor(y) + 1, Math.floor(z + 3), '#0a0a0a'); m.set(Math.floor(x), Math.floor(y) + 1, Math.floor(z + 3), '#0a0a0a'); m.set(Math.floor(x) - 1, Math.floor(y) - 1, Math.floor(z + 3), '#0a0a0a');
    }
  },
});

// Bowling scorer's table: a sloped maple desk with a gridded score sheet & pencils on a pedestal,
// swivel stool, and an overhead hooded lamp on a post with a small lit score screen above it.
defineProp('score_table', {
  size: [14, 36, 14], collide: [0.8, 1.2, 0.8],
  build(m) {
    const map = '#c8986a', mapD = '#a87a4e';
    m.box(4, 0, 2, 6, 1, 6, CHROME_D); m.box(6, 1, 4, 2, 10, 2, CHROME);
    for (let z = 1; z < 9; z++) m.box(2, 11 + Math.floor((9 - z) / 4), z, 10, 1, 1, map);
    m.box(2, 10, 1, 10, 1, 8, mapD);
    for (let z = 2; z < 8; z++) m.box(3, 12 + Math.floor((9 - z) / 4), z, 8, 1, 1, '#f4f2ea');
    for (let x = 3; x < 11; x += 2) for (let z = 3; z < 8; z += 2) m.set(x, 12 + Math.floor((9 - z) / 4), z, '#8a9ab0');
    m.set(10, 13, 8, '#e8c23a'); m.set(11, 13, 8, '#e8c23a');
    m.cyl(7, 0, 11.5, 1.5, 1, CHROME_D); m.box(6.5, 1, 11, 1, 6, 1, CHROME); m.cyl(7, 7, 11.5, 2.5, 1, '#8a1a22');   // stool
    // post, screen & lamp
    m.box(12, 11, 1, 1, 24, 1, CHROME_D);
    m.box(3, 28, 0, 10, 6, 2, '#2a2a2e'); m.box(4, 29, 2, 8, 4, 1, { c: '#e8f0e0', emit: 0.6 });
    for (let x = 5; x < 12; x += 2) m.box(x, 29, 2, 1, 4, 1, { c: '#6a8a6a', emit: 0.4 });
    m.box(4, 25, 3, 7, 1, 5, '#2e5a3a'); m.box(5, 24, 4, 5, 1, 3, { c: '#fff4d0', emit: 0.7 }); m.box(7, 26, 4, 1, 2, 1, CHROME_D);
  },
});

// ---------------------------------------------------------------- nightclub & music

// Jazz drum kit, 1/32 m voxels (1.5 m wide): tint-A sparkle shells with chrome hoops — bass drum with a
// painted cream head, mounted tom, floor tom, snare on its stand, hi-hat, ride & crash cymbals, and
// the drummer's throne behind (at -z). The kit faces the audience at +z.
defineProp('drum_kit', {
  size: [48, 40, 36], scale: 1 / 32, collide: [1.5, 1.1, 1.1],
  build(m) {
    const sh = TA(0.5), shD = TA(0.4), hoop = CHROME, head = '#f2ecd8', cym = '#d8b050', cymD = '#b89038', st = CHROME_M;
    // bass drum lying on its side, heads facing +z/-z
    m.cylZ(24, 9.5, 20, 9.5, 8, sh); m.cylZ(24, 9.5, 20, 9.5, 1, hoop); m.cylZ(24, 9.5, 27, 9.5, 1, hoop);
    m.cylZ(24, 9.5, 28, 8.7, 1, head); m.text('JB', 24, 7, 29, '#8a1a22', { font: 'small', align: 'center' });
    for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; m.set(Math.floor(24 + Math.cos(t) * 9.6), Math.floor(9.5 + Math.sin(t) * 9.6), 24, CHROME_D); }
    m.box(15, 0, 26, 1, 3, 1, st); m.box(32, 0, 26, 1, 3, 1, st);               // spurs
    m.box(22, 0, 18, 4, 1, 2, CHROME_D); m.box(23, 1, 18, 2, 5, 1, st);           // pedal & beater
    // mounted tom on the bass drum
    m.box(23.5, 19, 23, 1, 3, 1, st); m.cyl(24, 22, 23, 4.5, 5, sh); m.cyl(24, 26, 23, 4.6, 1, hoop); m.cyl(24, 27, 23, 4.2, 1, head); m.cyl(24, 22, 23, 4.6, 1, hoop);
    // floor tom (right from the audience = -x side)
    for (const [x, z] of [[4, 18], [12, 18], [8, 27]]) m.box(x, 0, z, 1, 12, 1, st);
    m.cyl(8.5, 4, 22.5, 6, 12, sh); m.cyl(8.5, 15, 22.5, 6.1, 1, hoop); m.cyl(8.5, 16, 22.5, 5.6, 1, head); m.cyl(8.5, 4, 22.5, 6.1, 1, hoop);
    // snare on a stand (drummer's left = +x side here)
    m.box(35.5, 0, 12, 1, 12, 1, st); m.box(33, 0, 12, 6, 1, 1, st); m.box(35.5, 0, 9, 1, 1, 6, st);
    m.cyl(36, 12, 12.5, 5.5, 4, sh); m.cyl(36, 15, 12.5, 5.6, 1, hoop); m.cyl(36, 16, 12.5, 5, 1, head); m.cyl(36, 12, 12.5, 5.6, 1, hoop);
    m.box(41, 13, 12, 1, 2, 1, CHROME_D);
    // hi-hat
    m.box(44.5, 0, 9, 1, 26, 1, st); m.box(42, 0, 9, 6, 1, 1, st); m.box(44.5, 0, 6, 1, 1, 6, st); m.box(43, 1, 10, 3, 1, 3, CHROME_D);
    m.cyl(45, 24, 9.5, 4.5, 1, cym); m.cyl(45, 25, 9.5, 4.5, 1, cymD); m.cyl(45, 25, 9.5, 1, 1, cym);
    // ride & crash cymbals on boom stands
    m.box(3.5, 0, 12, 1, 30, 1, st); m.cyl(4, 30, 12.5, 6.5, 1, cym); m.cyl(4, 31, 12.5, 1.2, 1, cymD);
    m.box(39.5, 0, 27, 1, 33, 1, st); m.cyl(40, 33, 27.5, 5.5, 1, cym); m.cyl(40, 34, 27.5, 1, 1, cymD);
    // throne & sticks
    m.box(23.5, 0, 5, 1, 12, 1, st); m.box(20, 0, 5, 8, 1, 1, st); m.cyl(24, 12, 5.5, 4, 2, '#1a1a1a');
    m.box(33, 17, 10, 6, 1, 1, '#e8d8b0'); m.box(34, 17, 13, 5, 1, 1, '#e8d8b0');
  },
});

// Double bass standing in a chrome cradle stand, 1/32 m voxels (1.85 m): amber-brown varnished body
// with darker edges, f-holes, bridge, black fingerboard, scroll & tuning pegs. Faces +z.
defineProp('upright_bass_stand', {
  size: [26, 60, 14], scale: 1 / 32, collide: [0.7, 1.85, 0.45],
  build(m) {
    const inside = (x, y) => Math.hypot((x + 0.5 - 13) / 11.5, (y + 0.5 - 13) / 12) <= 1 || Math.hypot((x + 0.5 - 13) / 9, (y + 0.5 - 30) / 8.5) <= 1 || (y > 17 && y < 26 && Math.abs(x + 0.5 - 13) < 8.5 - Math.sin((y - 17) / 9 * Math.PI) * 2.5);
    for (let y = 1; y < 40; y++) for (let x = 0; x < 26; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1);
      m.box(x, y, 4, 1, 1, 6, edge ? '#3a1a0a' : Math.abs(x + 0.5 - 13) > 7 ? '#8a3a12' : '#b8561a');
    }
    // f-holes, bridge, tailpiece, strings
    for (let i = 0; i < 6; i++) { m.set(8 + (i === 0 || i === 5 ? 1 : 0), 19 + i, 10, '#1a0a04'); m.set(17 - (i === 0 || i === 5 ? 1 : 0), 19 + i, 10, '#1a0a04'); }
    m.box(10, 17, 10, 6, 2, 1, '#e8d0a0'); m.box(11, 6, 10, 4, 8, 1, '#1a1a1a');
    m.box(12, 14, 11, 2, 38, 1, '#e8e0c8');                  // strings (pale)
    m.box(12, 24, 10, 2, 30, 1, '#1a1a1a');                   // fingerboard
    m.box(12, 40, 6, 2, 13, 3, '#8a3a12');                    // neck
    m.box(11, 53, 6, 4, 4, 3, '#6a2a0e'); m.box(12, 57, 6, 3, 2, 3, '#6a2a0e'); m.set(13, 59, 7, '#6a2a0e');   // pegbox & scroll
    for (const y of [54, 56]) { m.box(9, y, 7, 2, 1, 1, CHROME); m.box(15, y, 7, 2, 1, 1, CHROME); }
    m.box(12.5, 0, 6, 1, 2, 1, CHROME_D);                     // endpin
    // cradle stand
    m.box(4, 0, 0, 18, 1, 3, '#2a2a2a'); m.box(12.5, 0, 0, 1, 1, 12, '#2a2a2a'); m.box(12.5, 1, 1, 1, 30, 1, CHROME_M);
    m.box(8, 30, 1, 10, 1, 3, CHROME_M); m.box(8, 30, 3, 1, 3, 1, '#2a2a2a'); m.box(17, 30, 3, 1, 3, 1, '#2a2a2a');
  },
});

// Vintage chrome microphone on a round-base stand, 1/32 m voxels (1.6 m): ribbed "unidyne" style head
// in a yoke, cloth cord trailing to the base. Faces +z.
defineProp('mic_stand', {
  size: [14, 54, 14], scale: 1 / 32, collide: [0.3, 1.6, 0.3],
  build(m) {
    m.cyl(7, 0, 7, 5.5, 1, '#1e1e20'); m.cyl(7, 1, 7, 3.5, 1, CHROME_M);
    m.box(6.5, 2, 6.5, 1, 40, 1, CHROME); m.box(6, 24, 6, 2, 2, 2, CHROME_D); m.box(6.5, 42, 6.5, 1, 1, 3, CHROME_D);
    m.box(4, 43, 8, 1, 4, 1, CHROME_D); m.box(9, 43, 8, 1, 4, 1, CHROME_D);       // yoke
    for (let y = 43; y < 52; y++) {
      const w = y < 45 || y > 49 ? 3 : 4, x0 = 7 - w / 2;
      m.box(x0, y, 7, w, 1, 4, (y & 1) ? CHROME : CHROME_D);
    }
    m.box(6, 52, 8, 2, 1, 2, CHROME);
    m.box(6, 43, 11, 2, 1, 1, '#1a1a1a');
    m.box(7.5, 2, 8, 1, 40, 1, '#3a3a3a');                                           // cloth cord taped down the pole
    m.box(8, 1, 7, 1, 1, 6, '#2a2a2a');
  },
});

// Black grand piano (1.5 x 1.8 m), lid open on its stick: gold iron frame & strings visible inside,
// music desk with sheet music, brass-capped legs, pedal lyre. The KEYBOARD is on the +z side: the
// pianist sits at +z facing -z. The bass (straight) side is +x; the lid rises on the curved -x side.
defineProp('piano_grand', {
  size: [24, 28, 29], collide: [1.5, 1.0, 1.8],
  build(m) {
    const blk = '#141416', blkL = '#2a2a30', plate = '#c8a040', board = '#d8b878';
    const xmin = (z) => z >= 14 ? 0 : Math.round(13 * Math.pow((14 - z) / 14, 1.6));
    const inCase = (x, z) => z >= 1 && z <= 23 && x >= xmin(z) && x <= 23 && !(z < 4 && x > 23 - (4 - z) * 2);
    for (let z = 0; z < 24; z++) for (let x = 0; x < 24; x++) {
      if (!inCase(x, z)) continue;
      const rim = !inCase(x - 1, z) || !inCase(x + 1, z) || !inCase(x, z - 1) || !inCase(x, z + 1);
      m.box(x, 8, z, 1, rim ? 5 : 1, 1, blk);
      if (!rim) m.set(x, 9, z, (x + z) % 7 === 0 ? plate : x % 2 ? board : '#c8a868');   // soundboard & strings
      if (!rim && z > 3 && z < 21 && x > 3 && (x % 5 === 0)) m.set(x, 10, z, plate);           // iron frame struts
    }
    // keyboard & cheek blocks at +z
    m.box(0, 8, 24, 24, 3, 5, blk); m.box(1, 11, 24, 22, 1, 4, '#f4f2ea');
    for (let x = 1; x < 23; x++) if ([0, 1, 3, 4, 5].includes(x % 7)) m.set(x, 12, 24, '#101010');
    m.box(0, 11, 24, 1, 2, 5, blk); m.box(23, 11, 24, 1, 2, 5, blk); m.box(1, 11, 28, 22, 1, 1, blk);
    // music desk with sheet music
    m.box(3, 12, 21, 18, 1, 2, blk); m.box(4, 13, 21, 16, 4, 1, blk); m.box(7, 13, 22, 10, 4, 1, '#f4f0e0');
    for (const y of [14, 16]) for (let x = 8; x < 16; x += 2) m.set(x, y, 22, '#6a6a6a');   // notes
    // legs & pedal lyre
    for (const [x, z] of [[1, 25], [21, 25], [16, 3]]) { m.box(x, 0, z, 2, 8, 2, blk); m.box(x, 0, z, 2, 1, 2, BRASS); }
    m.box(11, 1, 21, 2, 7, 1, blk); m.box(10, 1, 22, 4, 1, 2, BRASS);
    // lid: hinged along the straight +x side, raised on the -x side, held by the stick
    for (let z = 1; z < 24; z++) for (let x = 0; x < 24; x++) {
      if (!inCase(x, z) || z > 22) continue;
      const y = 13 + Math.round((23 - x) * 0.62);
      m.set(x, y, z, x === xmin(z) ? blkL : blk);
    }
    const sx = Math.max(2, xmin(12) + 1);
    for (let y = 13; y < 13 + Math.round((23 - sx) * 0.62); y++) m.set(sx, y, 12, blk);
  },
});

// Orchestra music stand, 1/32 m voxels (1.25 m): black tripod, telescoping post, tilted desk with an
// open score. Faces +z (the reader is at +z).
const MUSIC_STAND = {
  size: [16, 42, 12], scale: 1 / 32, collide: [0.35, 1.25, 0.3],
  build(m) {
    const bl = '#1e1e20';
    m.box(2, 0, 5, 12, 1, 1, bl); m.box(7.5, 0, 1, 1, 1, 10, bl);
    m.box(7.5, 1, 5, 1, 16, 1, bl); m.box(7.5, 17, 5, 1, 12, 1, CHROME_D); m.box(7, 16, 4.5, 2, 1, 2, bl);
    // desk tilted back (top toward -z) so the score faces up toward the reader at +z
    for (let y = 29; y < 41; y++) { const z = 7 - Math.floor((y - 29) / 4); m.box(1, y, z, 14, 1, 1, bl); }
    m.box(1, 29, 7, 14, 1, 3, bl); m.box(1, 30, 9, 14, 1, 1, bl);                 // ledge & lip
    for (let y = 30; y < 40; y++) { const z = 8 - Math.floor((y - 29) / 4); m.box(2, y, z, 5, 1, 1, '#f4f0e0'); m.box(8, y, z, 5, 1, 1, '#f4f0e0'); if (y % 2) { m.set(3, y, z, '#6a6a6a'); m.set(10, y, z, '#6a6a6a'); } }
  },
};
// exterior.js may already own 'music_stand' (a bandstand one); this orchestra stand is always
// available as 'music_stand_orchestra'.
defineProp('music_stand', MUSIC_STAND);
defineProp('music_stand_orchestra', MUSIC_STAND);

// Nightclub two-top, 1/32 m voxels (0.6 m dia, 0.75 m): white tablecloth over a round table, red glass
// candle-holder with a flickering flame, two cocktail glasses (a martini with an olive, a Manhattan
// with a cherry), matchbook & ashtray. Glows softly when the room lamps are on.
defineProp('club_table', {
  size: [22, 30, 22], scale: 1 / 32, collide: [0.62, 0.78, 0.62], light: lampLight(0, 0.85, 0, [1.0, 0.6, 0.35], 2.2, 'room'),
  build(m) {
    m.cyl(11, 0, 11, 5, 1, '#1e1e20'); m.cyl(11, 1, 11, 1.2, 21, '#1e1e20');
    m.cyl(11, 22, 11, 10, 2, '#f8f6f0'); m.cyl(11, 17, 11, 10.6, 5, '#f4f2ea'); m.cyl(11, 17, 11, 9.6, 5, 0);
    m.cyl(11, 24, 11, 1.8, 3, { c: '#c02028', emit: 0.55 }); m.set(11, 27, 11, { c: '#ffd070', emit: 1 });
    // martini
    m.set(5, 24, 9, GLASS); m.set(5, 25, 9, GLASS); m.box(4, 26, 8, 3, 1, 3, '#e8f0f0'); m.box(3, 27, 7, 5, 1, 5, GLASS); m.set(5, 27, 9, '#6a8a2a');
    // Manhattan
    m.set(16, 24, 13, GLASS); m.box(15, 25, 12, 3, 2, 3, '#a8401a'); m.box(15, 27, 12, 3, 1, 3, GLASS); m.set(16, 27, 13, '#c8102a');
    m.box(14, 24, 5, 3, 1, 2, '#1a1a1a'); m.set(14, 24, 5, '#c8202a');             // matchbook
    m.cyl(7, 24, 15, 1.8, 1, '#3a3a3a');
  },
});

// Stage lighting batten: a pipe with five can lights (red, amber, blue, amber, red gels) on C-clamps
// and a cable run. ORIGIN at the TOP centre of the pipe: place it at ceiling height and it hangs down.
// The lamps aim down toward +z (the stage in front). Throws a warm light when the room lamps are on.
defineProp('stage_lights', {
  size: [40, 10, 8], origin: [20, 10, 4], cat: 'interior', light: lampLight(0, -0.6, 0.4, [1.0, 0.7, 0.55], 7, 'room'),
  build(m) {
    m.box(0, 8, 3, 40, 1, 1, '#3a3a3e'); m.box(0, 9, 4, 40, 1, 1, '#1a1a1a');   // pipe & cable
    for (const x of [0, 39]) m.box(x, 9, 3, 1, 1, 2, '#3a3a3e');
    const gels = ['#ff4040', '#ffb040', '#4080ff', '#ffb040', '#ff4040'];
    gels.forEach((g, i) => {
      const x = 3 + i * 8;
      m.box(x + 1, 7, 3, 1, 1, 1, '#5a5a5e');                  // clamp
      m.box(x, 3, 2, 3, 4, 3, '#1e1e20'); m.box(x, 2, 3, 3, 2, 3, '#1e1e20');    // can body, tilted forward
      m.box(x, 1, 4, 3, 2, 2, { c: g, emit: 0.8 }); m.box(x + 1, 6, 1, 1, 1, 1, '#3a3a3e');
      m.box(x - 1, 4, 3, 1, 2, 1, '#5a5a5e'); m.box(x + 3, 4, 3, 1, 2, 1, '#5a5a5e');   // yoke
    });
  },
});

// ---------------------------------------------------------------- railroad station & hotel

// Station waiting bench (2.4 m): heavy oak slats on cast-iron ends with scrolled armrests, a centre
// armrest dividing it into seats. Sitters face +z; seat 0.45 m.
defineProp('bench_station', {
  size: [39, 15, 10], collide: [2.45, 0.9, 0.62],
  build(m) {
    const oak = '#a8784a', oakD = '#86592f', ir = '#26262a';
    for (const x of [0, 19, 38]) {
      m.box(x, 0, 1, 1, 7, 1, ir); m.box(x, 0, 8, 1, 7, 1, ir); m.box(x, 0, 1, 1, 1, 8, ir);   // legs
      m.box(x, 6, 1, 1, 1, 9, ir); m.box(x, 10, 2, 1, 1, 8, ir); m.set(x, 9, 9, ir); m.set(x, 8, 9, ir);   // arm scroll
      m.box(x, 7, 0, 1, 8, 1, ir);
    }
    for (const z of [2, 4, 6, 8]) m.box(0, 7, z, 39, 1, 1, z % 4 ? oak : oakD);
    for (const y of [9, 11, 13]) m.box(0, y, 1, 39, 1, 1, y === 11 ? oakD : oak);
    m.box(0, 15 - 1, 0, 39, 1, 1, oakD);
  },
});

// Railroad ticket window counter module (1.5 m wide): oak & marble counter, brass grille with an arched
// opening and money cup, "FARES" plate, timetable rack & date-stamp press inside. Travellers at +z.
defineProp('ticket_window', {
  size: [24, 39, 10], collide: [1.5, 2.3, 0.62],
  build(m) {
    const oak = '#8a6040', oakD = '#6a4428', mar = '#e8e2d8';
    m.box(0, 0, 0, 24, 1, 9, oakD); m.box(0, 1, 0, 24, 14, 9, oak);
    for (const x of [1, 12]) { m.box(x, 3, 9, 11, 10, 1, oakD); m.box(x + 1, 4, 9, 9, 8, 1, oak); }
    m.box(0, 15, 0, 24, 1, 10, mar);
    m.box(0, 16, 0, 2, 20, 2, oak); m.box(22, 16, 0, 2, 20, 2, oak); m.box(0, 32, 0, 24, 7, 2, oakD);
    // brass grille with an arched window
    for (let x = 2; x < 22; x++) for (let y = 16; y < 32; y++) {
      const inWin = x >= 8 && x < 16 && (y < 24 || Math.hypot(x + 0.5 - 12, y - 24) < 4);
      if (inWin) continue;
      if (x % 2 === 0 || y % 4 === 0) m.set(x, y, 1, BRASS);
    }
    for (let a = 0; a <= 16; a++) { const t = a * Math.PI / 16; m.set(Math.floor(12 + Math.cos(t) * 4.2), Math.floor(24 + Math.sin(t) * 4.2), 1, BRASS_D); }
    m.box(8, 16, 1, 1, 8, 1, BRASS_D); m.box(15, 16, 1, 1, 8, 1, BRASS_D);
    m.box(9, 15, 1, 6, 1, 3, BRASS_D); m.box(10, 15, 2, 4, 1, 1, '#3a2a1a');       // money cup
    m.box(3, 32, 2, 18, 7, 1, '#1a2a1a'); label(m, 'FARES', 12, 33, 2, '#e8d090', { align: 'center' });
    // behind the glass: date stamp & tickets rack
    m.box(3, 16, 0, 4, 3, 1, '#2a2a2a'); m.box(17, 16, 0, 4, 6, 1, oakD); for (let y = 17; y < 22; y++) m.box(18, y, 0, 2, 1, 1, y & 1 ? '#e8d8a0' : '#c8e0c0');
  },
});

// Station baggage cart: iron-shod oak deck on four spoked wheels, a T-handle, piled with a steamer
// trunk, leather suitcases (tint A / tint B) and a hat box. ~1.9 m long along z. Pulled from +z.
defineProp('luggage_cart', {
  size: [16, 20, 31], collide: [1.0, 1.25, 1.9],
  build(m) {
    const oak = '#8a6040', ir = '#2a2a2c';
    for (const x of [0, 15]) for (const zc of [5, 23]) for (let y = 0; y < 7; y++) for (let z = zc - 3; z <= zc + 3; z++) {
      const d = Math.hypot(y + 0.5 - 3.5, z + 0.5 - (zc + 0.5));
      if (d <= 3.5 && (d > 2.6 || d < 0.9 || Math.abs(y - 3) < 0.6 || Math.abs(z - zc) < 0.6)) m.set(x, y, z, d > 2.6 ? ir : '#8a2a1a');
    }
    m.box(1, 3, 5, 14, 1, 1, ir); m.box(1, 3, 23, 14, 1, 1, ir);
    m.box(0, 7, 0, 16, 1, 29, oak); m.box(0, 7, 0, 16, 1, 1, ir); m.box(0, 7, 28, 16, 1, 1, ir);
    for (let x = 1; x < 16; x += 3) m.box(x, 7, 1, 1, 1, 27, '#7a5234');
    m.box(0, 8, 0, 1, 4, 1, ir); m.box(15, 8, 0, 1, 4, 1, ir); m.box(0, 11, 0, 16, 1, 1, ir);   // rear rail
    m.box(7, 7, 29, 2, 1, 2, ir); m.box(7.5, 8, 30, 1, 10, 1, ir); m.box(5, 18, 30, 6, 1, 1, '#6a4428');   // T-handle
    // luggage
    m.box(1, 8, 2, 14, 7, 9, '#2a4a3a'); for (const x of [1, 14]) m.box(x, 8, 2, 1, 7, 9, '#3a2a1a');
    m.box(1, 11, 2, 14, 1, 9, BRASS_D); m.box(7, 12, 11, 2, 1, 1, BRASS);                               // steamer trunk
    m.box(2, 8, 13, 12, 3, 7, TA(0.5)); m.box(2, 10, 13, 12, 1, 7, TA(0.42)); m.box(7, 11, 16, 2, 1, 1, '#2a2a2a');   // suitcase A
    m.box(3, 11, 14, 10, 3, 5, TB(0.5)); m.box(7, 14, 15, 2, 1, 1, '#2a2a2a'); m.set(3, 12, 18, BRASS);            // suitcase B
    m.box(3, 15, 3, 7, 3, 7, '#f0e0c8'); m.box(3, 17, 3, 7, 1, 7, '#c8202a'); m.box(3, 18, 3, 7, 1, 7, '#f0e0c8');  // hat box
    m.box(2, 8, 21, 11, 4, 6, '#6a3a1a'); m.box(2, 10, 21, 11, 1, 6, '#4a2a10'); m.set(7, 12, 23, '#2a2a2a');       // brown case
    m.box(4, 12, 22, 3, 1, 3, '#f4ecd8');                                                                          // baggage tag
  },
});

// Station departures board, back at z=0, 1/32 m voxels (2.25 x 1.1 m): black board in an oak frame,
// "DEPARTURES" header, columns of destinations and times in small white letters; a track-number column.
defineProp('departure_board', {
  size: [72, 36, 2], scale: 1 / 32, origin: [36, 0, 0],
  build(m) {
    const oak = '#7a5030';
    m.box(0, 0, 0, 72, 36, 1, oak); m.box(1, 1, 0, 70, 34, 2, '#1c1e1c');
    m.box(0, 35, 0, 72, 1, 2, oak); m.box(0, 0, 0, 72, 1, 2, oak); m.box(0, 0, 0, 1, 36, 2, oak); m.box(71, 0, 0, 1, 36, 2, oak);
    m.text('DEPARTURES', 36, 28, 1, '#f0d060', { font: 'small', align: 'center' }); m.box(3, 26, 1, 66, 1, 1, '#5a5a50');
    const rows = [['BOSTON', '7:15', '1'], ['PORTLAND', '8:40', '2'], ['PROVIDENCE', '9:05', '1'], ['NEW YORK', '11:30', '3']];
    rows.forEach(([d, t, tr], i) => {
      const y = 19 - i * 6;
      m.text(d, 3, y, 1, '#f4f2ea', { font: 'small' });
      m.text(t, 46, y, 1, '#f4f2ea', { font: 'small' });
      m.text(tr, 67, y, 1, '#f0d060', { font: 'small' });
    });
  },
});

// Hotel reception desk module (1.25 m): mahogany panelled front toward the guests (+z), marble top
// with a brass service bell, open guest register & pen stand, a small brass lamp; mail slots are a
// separate prop (mail_slots) for the wall behind.
defineProp('hotel_desk', {
  size: [20, 22, 11], collide: [1.25, 1.1, 0.7],
  build(m) {
    const mah = MAHOG, mahD = MAHOG_D, mar = '#ece6dc';
    m.box(0, 0, 0, 20, 1, 10, mahD); m.box(0, 1, 0, 20, 15, 10, mah);
    m.clear(1, 2, 0, 18, 12, 4); m.box(1, 7, 0, 18, 1, 4, mahD);
    for (const x0 of [1, 10]) { m.box(x0, 3, 10, 9, 11, 1, mahD); m.box(x0 + 1, 4, 10, 7, 9, 1, mah); m.box(x0 + 3, 7, 10, 3, 3, 1, '#7a3624'); }
    m.box(0, 16, 0, 20, 1, 11, mar); m.box(0, 15, 10, 20, 1, 1, BRASS_D);
    // register, pen, bell, lamp
    m.box(6, 17, 5, 8, 1, 5, '#f4ecd8'); m.box(9.5, 17, 5, 1, 1, 5, '#c8b890'); m.box(6, 17, 5, 8, 1, 1, '#5a1a1a');
    for (const x of [7, 8, 11, 12]) m.set(x, 17, 7, '#8a8a88');
    m.box(15, 17, 6, 2, 1, 2, '#1a1a1a'); m.set(16, 18, 6, '#1a1a1a');
    m.box(3, 17, 7, 2, 1, 2, BRASS_D); m.box(3, 18, 7, 2, 1, 2, BRASS_L); m.set(3.5, 19, 7.5, BRASS);          // bell
    m.box(16, 17, 2, 2, 1, 2, BRASS); m.box(16.5, 18, 2.5, 1, 2, 1, BRASS); m.box(15, 20, 1, 4, 2, 4, '#2a5a3a'); m.box(16, 20, 2, 2, 1, 2, { c: '#fff0c0', emit: 0.6 });
  },
});

// Bellhop's brass luggage cart: carpeted platform on castors under a brass bird-cage frame with a
// hanging rail, loaded with suitcases (tint A / B), a hat box and a garment bag.
defineProp('bellhop_cart', {
  size: [12, 30, 20], collide: [0.75, 1.85, 1.25],
  build(m) {
    const car = '#8a1a22';
    for (const [x, z] of [[1, 1], [10, 1], [1, 18], [10, 18]]) { m.set(x, 0, z, '#1a1a1a'); m.box(x, 1, z, 1, 1, 1, BRASS_D); }
    m.box(0, 2, 0, 12, 1, 20, BRASS); m.box(1, 3, 1, 10, 1, 18, car);
    for (const z of [0, 19]) { m.box(0, 3, z, 1, 26, 1, BRASS); m.box(11, 3, z, 1, 26, 1, BRASS); }
    for (let x = 0; x < 12; x++) { const y = 26 + Math.round(Math.sin((x + 0.5) / 12 * Math.PI) * 3); m.set(x, y, 0, BRASS_L); m.set(x, y, 19, BRASS_L); }
    m.box(5.5, 26, 0, 1, 3, 20, BRASS_L);                    // hanging rail
    m.box(4, 12, 3, 4, 14, 3, '#3a3a4a'); m.box(5.5, 25, 4, 1, 1, 1, BRASS);      // garment bag
    m.box(1, 4, 7, 10, 3, 8, TA(0.5)); m.box(1, 6, 7, 10, 1, 8, TA(0.42)); m.box(5, 7, 10, 2, 1, 1, '#2a2a2a');
    m.box(2, 7, 8, 8, 3, 6, TB(0.5)); m.box(5, 10, 10, 2, 1, 1, '#2a2a2a');
    m.box(2, 4, 16, 6, 5, 3, '#f0e0c8'); m.box(2, 8, 16, 6, 1, 3, '#2a4a8a');
    m.box(0, 14, 0, 12, 1, 1, BRASS); m.box(0, 14, 19, 12, 1, 1, BRASS);
  },
});

// Potted parlour palm (≈1.9 m): glazed Chinese-style jardinière with a blue band on a stand, several
// arching fronds of kentia palm.
defineProp('palm_pot', {
  size: [30, 34, 30], collide: [0.55, 1.9, 0.55],
  build(m) {
    col(m, 11, 0, 11, 8, 1, '#3a2a1a'); col(m, 10, 1, 10, 10, 6, '#e8e2d4'); col(m, 10, 3, 10, 10, 2, '#2a4a8a'); col(m, 10, 7, 10, 10, 1, '#d8d0c0');
    col(m, 11, 7, 11, 8, 1, '#4a3020');                       // soil
    m.box(14, 8, 14, 2, 9, 2, '#6a5a3a'); m.box(14, 10, 14, 2, 1, 2, '#5a4a2e'); m.box(14, 13, 14, 2, 1, 2, '#5a4a2e');   // ringed trunk
    const frond = (a, len, lift) => {
      const dx = Math.cos(a), dz = Math.sin(a);
      for (let i = 0; i < len; i++) {
        const x = 15 + dx * i, z = 15 + dz * i, y = 17 + lift * i - 0.13 * i * i;
        m.set(x, y, z, '#3e6e2c');
        if (i > 2 && i % 2 === 0) for (const s of [1, -1]) m.set(x + dz * s * 1.5, y - 1, z - dx * s * 1.5, '#4e7e36');
      }
    };
    for (let k = 0; k < 8; k++) frond(k * Math.PI / 4 + 0.2, 13, 1.35);
    for (let k = 0; k < 4; k++) frond(k * Math.PI / 2 + 0.9, 9, 1.9);
    m.box(14, 17, 14, 2, 3, 2, '#4e7e36');
  },
});

// Hotel pigeonhole key rack, back at z=0 (1.25 x 0.9 m): oak grid of 5 x 4 cubbies with brass
// numbers, room keys on brass tags hanging below, and letters & telegrams tucked into some cubbies.
defineProp('mail_slots', {
  size: [20, 15, 5], origin: [10, 0, 0], collide: false,
  build(m) {
    const oak = '#8a6040', oakD = '#6a4428';
    m.box(0, 0, 0, 20, 15, 1, oakD);
    for (let x = 0; x <= 20; x += 4) m.box(Math.min(x, 19), 0, 0, 1, 15, 4, oak);
    for (let y = 0; y <= 15; y += 3.5) m.box(0, Math.min(Math.round(y), 14), 0, 20, 1, 4, oak);
    let k = 0;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const x = 1 + c * 4, y = 1 + Math.round(r * 3.5);
      m.set(x + 1, y - 1, 3, BRASS);
      if ((k * 7) % 5 === 1) m.box(x, y, 1, 3, 2, 1, '#f4ecd8');
      if ((k * 3) % 4 === 2) { m.box(x + 1, y, 1, 1, 1, 2, BRASS_D); m.set(x + 1, y, 3, BRASS_L); }
      if (k % 7 === 3) m.box(x, y, 1, 2, 1, 1, '#f0e0a0');
      k++;
    }
  },
});

// ---------------------------------------------------------------- newspaper & radio station

// Rotary newspaper press, 1/12 m voxels (3.2 m long, 2.3 m tall, 1.6 m deep): cast-iron side frames
// painted green-grey with big gears, a reel stand with a full newsprint roll at -x, the white paper web
// threading over & under the plate and impression cylinders and inking rollers, a folder at +x
// delivering folded papers onto a conveyor, walkway & railing on the operator's side (+z).
defineProp('printing_press', {
  size: [40, 28, 20], scale: 1 / 12, collide: [3.3, 2.3, 1.7], cat: 'interior',
  build(m) {
    const fr = '#46564e', frD = '#34423a', steel = '#b4bcc4', ink = '#1c1c1e', web = '#f4f2ea', gear = '#5e6e64';
    m.box(0, 0, 1, 40, 1, 18, '#2a2a2a');                     // bedplate
    for (const z of [2, 15]) {
      m.box(8, 1, z, 24, 20, 2, fr); m.box(8, 1, z, 24, 2, 2, frD); m.box(8, 20, z, 24, 1, 2, frD);
      m.clear(12, 5, z, 4, 12, 2); m.clear(24, 5, z, 4, 12, 2);
    }
    // gears on the +z frame
    for (const [cx, cy, r] of [[14, 11, 4.5], [22, 7, 3], [26, 13, 4.5]]) for (let y = 0; y < 28; y++) for (let x = 0; x < 40; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r && (d > r - 1 ? (Math.atan2(y - cy, x - cx) * 6 / Math.PI + 12) % 2 < 1.2 : true)) m.set(x, y, 17, d < 1.2 ? CHROME : d > r - 1 ? gear : (d < r - 2 ? gear : frD));
    }
    // cylinders spanning the frames (along z)
    for (const [x, y, r, c] of [[14, 8, 2.6, steel], [14, 14, 2.6, steel], [26, 8, 2.6, steel], [26, 14, 2.6, steel], [11, 17, 1.2, ink], [17, 17, 1.2, ink], [23, 17, 1.2, ink], [29, 17, 1.2, ink], [11, 5, 1.2, ink], [29, 5, 1.2, ink], [20, 11, 1.4, CHROME_M]]) m.cylZ(x + 0.5, y + 0.5, 4, r, 11, c);
    // reel stand & roll at -x
    m.box(1, 1, 3, 2, 12, 1, fr); m.box(1, 1, 15, 2, 12, 1, fr);
    m.cylZ(4, 9, 4, 5.5, 11, web); m.cylZ(4, 9, 4, 5.6, 1, '#d8d4c8'); m.cylZ(4, 9, 14, 5.6, 1, '#d8d4c8'); m.cylZ(4, 9, 3, 1, 13, '#6a4a2a');
    // the paper web: from the roll over the top, down between the cylinder pairs, out to the folder
    m.box(4, 14, 4, 7, 1, 11, web); m.box(10, 14, 4, 1, 1, 11, web);
    m.box(16, 11, 4, 1, 1, 11, web); m.box(17, 11, 4, 7, 1, 11, web); m.box(28, 11, 4, 5, 1, 11, web);
    m.box(11, 11, 4, 1, 3, 11, web); m.box(12, 11, 4, 1, 1, 11, web);
    // folder & delivery at +x
    m.box(32, 1, 3, 6, 14, 14, fr); m.box(32, 15, 3, 6, 1, 14, frD); m.box(33, 9, 17, 4, 4, 1, frD);
    m.box(33, 11, 3, 1, 3, 14, web);
    m.box(38, 6, 5, 2, 1, 10, '#3a3a3a');
    for (let i = 0; i < 4; i++) m.box(38, 7 + i, 6 + i % 2, 2, 1, 7, i % 2 ? '#e8e4d8' : web);
    // walkway & railing along the operator side
    m.box(8, 3, 18, 24, 1, 2, '#5a5a5a'); for (const x of [8, 18, 31]) m.box(x, 4, 19, 1, 7, 1, '#e8c23a'); m.box(8, 10, 19, 24, 1, 1, '#e8c23a');
    m.box(19, 21, 5, 2, 3, 10, frD); m.box(18, 24, 4, 4, 1, 12, '#5a5a5a');   // ink fountain on top
  },
});

// Stack of newsprint rolls on a pallet: two rolls lying side by side and one on top, kraft wrappers,
// white spiralled ends with dark cores and a stencilled mill label. ~2.1 x 1.8 m.
defineProp('paper_rolls', {
  size: [34, 29, 18], collide: [2.1, 1.8, 1.1],
  build(m) {
    m.box(0, 0, 0, 34, 1, 18, '#8a6a48'); for (let x = 1; x < 34; x += 5) m.box(x, 1, 0, 3, 1, 18, '#9a7a58');
    const roll = (cx, cy) => {
      m.cylZ(cx, cy, 1, 8.2, 16, '#c8a878'); m.cylZ(cx, cy, 0, 7.8, 1, '#f4f0e6'); m.cylZ(cx, cy, 17, 7.8, 1, '#f4f0e6');
      for (const z of [0, 17]) { m.cylZ(cx, cy, z, 5.2, 1, '#e8e4d8'); m.cylZ(cx, cy, z, 4.6, 1, '#f4f0e6'); m.cylZ(cx, cy, z, 1.6, 1, '#6a4a2a'); m.cylZ(cx, cy, z, 0.9, 1, '#2a1a10'); }
      m.box(cx - 3, cy + 5, 17, 6, 1, 1, '#2a4a8a');
    };
    roll(8.5, 10.2); roll(25.5, 10.2); roll(17, 20.5);
  },
});

// Linotype typesetting machine (≈2.1 m): black & nickel with brass — the 90-key keyboard (black,
// white & blue sections) toward the operator at +z, slanted brass type magazine, distributor bar on
// top, copy holder, melting pot with a blue gas flame at the right, galley of slugs at the left.
defineProp('linotype', {
  size: [28, 35, 20], collide: [1.75, 2.15, 1.25],
  build(m) {
    const ir = '#26282a', irL = '#3a3e42', nick = CHROME_M;
    m.box(4, 0, 3, 20, 2, 14, ir); m.box(8, 2, 5, 12, 10, 10, ir);           // base & column
    // keyboard at the front
    m.box(6, 11, 13, 16, 2, 5, irL);
    for (let r = 0; r < 4; r++) for (let x = 7; x < 21; x++) {
      const c = x < 11 ? '#1a1a1a' : x < 17 ? '#f4f0e6' : '#2a4a9a';
      if ((x + r) % 2 === 0) m.set(x, 13, 14 + r, c);
    }
    m.box(12, 13, 17, 5, 1, 1, '#f4f0e6');                    // space band
    // assembler & mould disc
    m.box(8, 12, 10, 12, 4, 3, irL); m.cylZ(20.5, 10, 10, 3.5, 2, nick); m.set(20, 10, 12, ir);
    // brass magazine sloping up toward the back
    for (let i = 0; i < 12; i++) m.box(7, 16 + i, 11 - Math.floor(i * 0.7), 14, 1, 3, i % 3 === 0 ? BRASS_D : BRASS);
    m.box(6, 16, 3, 1, 14, 9, ir); m.box(21, 16, 3, 1, 14, 9, ir);
    // distributor on top
    m.box(6, 28, 2, 16, 2, 4, irL); m.box(6, 30, 3, 16, 1, 2, nick); m.box(12, 31, 3, 2, 3, 2, ir); m.box(7, 31, 3, 1, 4, 1, nick);
    // melting pot with flame (right) & galley (left)
    m.box(22, 4, 6, 5, 7, 6, irL); m.box(23, 11, 7, 3, 2, 4, '#8a8a8a'); m.box(23, 3, 7, 3, 1, 4, { c: '#5a8aff', emit: 0.9 }); m.set(24, 4, 8, { c: '#ffb040', emit: 0.9 });
    m.box(0, 10, 8, 7, 1, 6, nick); m.box(1, 11, 9, 5, 1, 4, '#9a9aa0'); for (let x = 1; x < 6; x++) m.set(x, 12, 10, '#7a7a80');
    m.box(0, 2, 9, 1, 8, 1, ir); m.box(6, 2, 9, 1, 8, 1, ir);
    // copy holder with a typed sheet
    m.box(21, 13, 15, 1, 6, 1, nick); m.box(20, 18, 14, 5, 5, 1, '#f4f0e6'); for (const y of [19, 21]) m.box(21, y, 14, 3, 1, 1, '#8a8a88');
    m.box(20, 18, 15, 5, 1, 1, nick);
  },
});

// Tied bundles of the evening edition, 1/32 m voxels (0.75 m): folded papers stacked and crossed with
// twine, grey column-text and a black headline bar on the top sheets, one bundle leaning.
defineProp('newspaper_bundles', {
  size: [24, 24, 20], scale: 1 / 32, collide: [0.75, 0.7, 0.62],
  build(m) {
    const pap = '#ece8dc', papD = '#d8d2c2', tw = '#c8a870';
    const bundle = (x, y, z, h) => {
      for (let i = 0; i < h; i++) m.box(x, y + i, z, 10, 1, 13, i % 2 ? pap : papD);
      m.box(x + 1, y + h - 1, z + 1, 8, 1, 11, pap);
      m.box(x + 1, y + h - 1, z + 2, 8, 1, 2, '#2a2a2a');                        // headline
      for (let r = 5; r < 12; r += 2) for (let c = 0; c < 3; c++) m.box(x + 1 + c * 3, y + h - 1, z + r, 2, 1, 1, '#9a9690');
      m.box(x + 4, y, z - 0, 1, h, 1, tw); m.box(x + 4, y + h, z, 1, 1, 13, tw); m.box(x + 4, y, z + 12, 1, h, 1, tw);
      m.box(x, y + h, z + 6, 10, 1, 1, tw);
    };
    bundle(1, 0, 1, 7); bundle(12, 0, 3, 8); bundle(4, 7, 3, 6); bundle(13, 8, 5, 5);
  },
});

// Radio-station control console (1.8 m): walnut & grey-enamel desk with a sloped panel of rotary faders,
// four lit VU meters, key switches & pilot lamps, a program clock, and a big ribbon microphone on a
// desk stand. The operator sits at +z facing -z (the controls face +z).
defineProp('radio_console_studio', {
  size: [30, 26, 16], collide: [1.85, 1.1, 1.0],
  build(m) {
    const gr = '#7a8288', grD = '#5a6268', wal = WALNUT;
    m.box(0, 0, 0, 30, 12, 16, wal); m.clear(8, 0, 9, 14, 11, 7);           // desk with a knee-hole at +z
    m.box(1, 1, 0, 28, 10, 1, WALNUT_L); m.box(0, 12, 0, 30, 1, 16, WALNUT_D);
    // sloped control turret at the back of the desk, facing the operator (+z)
    for (let y = 13; y < 21; y++) m.box(2, y, 2, 26, 1, 23 - y - 2, gr);
    m.box(2, 21, 2, 26, 1, 2, grD); m.box(1, 13, 2, 1, 8, 9, grD); m.box(28, 13, 2, 1, 8, 9, grD);
    for (let x = 4; x < 27; x += 3) { m.set(x, 14, 9, '#1a1a1a'); m.set(x, 15, 8, '#1a1a1a'); m.set(x, 15, 9, '#f4f0e6'); }        // rotary faders
    for (let x = 5; x < 26; x += 4) m.set(x, 16, 7, i2c(x));                                                                       // pilot lamps
    for (let i = 0; i < 4; i++) { const x = 4 + i * 6; m.box(x, 17, 5, 4, 1, 1, { c: '#f8d890', emit: 0.8 }); m.box(x, 18, 4, 4, 1, 1, { c: '#f8d890', emit: 0.8 }); m.set(x + 1, 18, 5, '#1a1a1a'); }   // VU meters
    for (let x = 4; x < 27; x += 2) m.set(x, 20, 3, x % 4 ? '#1a1a1a' : '#c8202a');                                               // key switches
    m.box(26, 22, 2, 3, 3, 1, grD); m.box(26.5, 22.5, 3, 2, 2, 1, '#f4f0e6'); m.set(27, 23, 4, '#1a1a1a');                        // program clock
    // ribbon microphone on a desk stand, toward the operator
    m.box(3, 13, 11, 4, 1, 3, CHROME_D); m.box(4.5, 14, 12, 1, 5, 1, CHROME);
    m.box(3, 19, 11, 4, 5, 3, CHROME_M); m.box(4, 24, 12, 2, 1, 1, CHROME_M); m.box(4, 18, 12, 2, 1, 1, CHROME_M);
    for (let y = 20; y < 23; y++) m.box(3, y, 14, 4, 1, 1, y % 2 ? '#3a3a3e' : CHROME);
    m.box(4, 20, 10, 2, 2, 1, '#8a1a22');                     // call-letter plate on the back
    m.box(12, 13, 12, 6, 1, 3, '#f4f0e6'); m.box(13, 13, 13, 4, 1, 1, '#9a9690');   // program log
  },
});
function i2c(x) { return [{ c: '#ff4030', emit: 0.9 }, { c: '#40e060', emit: 0.9 }, { c: '#ffd040', emit: 0.9 }][x % 3]; }

// "ON AIR" warning light box, back at z=0, 1/32 m voxels (0.9 x 0.36 m): chrome case with a glowing
// red lens and bright lettering; tints the room red when lit.
defineProp('on_air_sign', {
  size: [30, 13, 4], scale: 1 / 32, origin: [15, 0, 0], light: lampLight(0, 0.2, 0.2, [1.0, 0.2, 0.15], 2.5, 'always'),
  build(m) {
    m.box(0, 0, 0, 30, 13, 3, CHROME_M); m.box(1, 1, 3, 28, 11, 1, CHROME);
    m.box(2, 2, 3, 26, 9, 1, { c: '#e02020', emit: 0.95 });
    m.text('ON AIR', 15, 4, 3, { c: '#fff0e0', emit: 1 }, { font: 'small', align: 'center' });
    m.box(13, 12, 0, 4, 1, 1, CHROME_D);
  },
});

// Pair of broadcast transcription turntables in one walnut console, 1/32 m voxels (1.6 m): two 16-inch
// platters with discs, long chrome tone arms, a small mixing panel with knobs between, sleeved
// transcription discs on the shelf below. The operator stands at +z.
defineProp('turntables_studio', {
  size: [52, 30, 22], scale: 1 / 32, collide: [1.62, 0.95, 0.7],
  build(m) {
    m.box(0, 0, 0, 52, 2, 22, WALNUT_D); m.box(0, 2, 0, 52, 24, 22, WALNUT);
    m.clear(2, 3, 12, 48, 9, 10); m.box(2, 3, 12, 48, 1, 10, WALNUT_D);
    for (let i = 0; i < 9; i++) m.box(4 + i * 5, 4, 14, 1, 8, 7, ['#c8b898', '#e8e0c8', '#b8a888'][i % 3]);   // sleeved discs
    m.box(0, 26, 0, 52, 1, 22, '#5a6268');
    for (const cx of [12, 40]) {
      m.cyl(cx, 27, 10.5, 9.8, 1, '#2a2a2e'); m.cyl(cx, 28, 10.5, 9.2, 1, '#141416'); m.cyl(cx, 28, 10.5, 3, 1, '#c8202a'); m.set(cx, 29, 10, CHROME);
      m.box(cx + 10, 27, 17, 2, 2, 2, CHROME_D); m.box(cx + 10, 29, 6, 1, 1, 12, CHROME); m.box(cx + 7, 29, 5, 4, 1, 1, CHROME); m.box(cx + 7, 28, 5, 1, 1, 1, '#1a1a1a');   // tone arm
    }
    m.box(23, 27, 14, 6, 1, 6, '#3a3e42'); for (const x of [24, 26, 28]) m.set(x, 28, 18, '#f4f0e6'); m.set(26, 28, 15, { c: '#ffd040', emit: 0.8 });
  },
});

// ---------------------------------------------------------------- maritime museum

function line2(m, x0, y0, x1, y1, z, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) m.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), z, c);
}

// Glass case (frame only) on a mahogany stand holding a clipper-ship model, 1/32 m voxels (1.25 m long,
// 1.6 m overall): black hull with a gold sheer stripe & copper bottom, three masts of square sails,
// jibs on the bowsprit, rigging lines, a red ensign. The broadside faces +z; bow toward +x.
defineProp('ship_model_case', {
  size: [40, 54, 18], scale: 1 / 32, collide: [1.25, 1.7, 0.56],
  build(m) {
    const mah = MAHOG, mahD = MAHOG_D, sail = '#f0ead8', sailD = '#ddd4bc', rig = '#8a7a5a';
    legs(m, 2, 0, 3, 36, 12, 22, mahD, 2); m.box(0, 22, 1, 40, 3, 16, mah); m.box(2, 8, 4, 36, 1, 10, mahD);
    m.box(15, 23, 17, 10, 2, 1, BRASS);                       // name plate
    frame(m, 0, 25, 1, 40, 29, 16, mahD); m.box(0, 25, 1, 40, 1, 16, mahD);
    // cradle & hull (keel at y=27)
    m.box(12, 26, 8, 2, 2, 2, mahD); m.box(26, 26, 8, 2, 2, 2, mahD);
    for (let x = 4; x < 36; x++) {
      const t = (x - 4) / 31, half = Math.max(0.6, 2.6 * Math.sin(Math.min(1, t * 1.3 + 0.15) * Math.PI * 0.9)), z0 = Math.round(9 - half), z1 = Math.round(9 + half);
      m.box(x, 28, z0 + 1, 1, 1, Math.max(1, z1 - z0 - 1), '#b86a3a');                // copper bottom
      m.box(x, 29, z0, 1, 2, z1 - z0 + 1, '#1a1a1a'); m.box(x, 30, z0, 1, 1, 1, GOLD); m.box(x, 30, z1, 1, 1, 1, GOLD);
      m.box(x, 31, z0 + 1, 1, 1, Math.max(1, z1 - z0 - 1), '#c8a878');                 // deck
    }
    m.box(4, 27, 9, 30, 1, 1, '#1a1a1a');                      // keel
    line2(m, 35, 31, 39, 34, 9, '#3a2a1a');                    // bowsprit
    // masts and square sails
    for (const [x, h] of [[28, 21], [20, 23], [12, 19]]) {
      m.box(x, 31, 9, 1, h, 1, '#5a3a1e');
      for (let k = 0; k < 4; k++) {
        const w = 11 - k * 2, y = 33 + k * 4 + (h - 19) / 2;
        m.box(x - Math.floor(w / 2), y, 9, w, 3, 1, k % 2 ? sailD : sail);
        m.box(x - Math.floor(w / 2) - 1, y + 3, 9, w + 2, 1, 1, '#5a3a1e');          // yard
      }
      line2(m, x, 31 + h, x + 8, 31, 8, rig); line2(m, x, 31 + h, x - 8, 31, 8, rig);
    }
    // jibs
    for (let i = 0; i < 7; i++) m.box(30 + i, 33 + i, 9, 1, 12 - i * 2 > 0 ? 12 - i * 2 : 1, 1, sail);
    line2(m, 28, 52, 39, 34, 9, rig);
    // spanker & ensign
    m.box(7, 33, 9, 5, 6, 1, sailD); m.box(5, 38, 9, 7, 1, 1, '#5a3a1e'); m.box(4, 36, 9, 2, 2, 1, '#b8202a'); m.set(4, 37, 9, '#f4f0e6');
    glint(m, 3, 30, 16, 4); glint(m, 30, 44, 16, 3);
  },
});

// Carved figurehead of a maiden on a painted plinth (≈1.7 m): white gown with a gold sash, flowing
// dark hair, hands clasping a garland to her breast, scrolled gilt base; she leans forward toward +z
// as she did on the bow.
defineProp('figurehead', {
  size: [12, 28, 16], collide: [0.6, 1.7, 0.8],
  build(m) {
    const skin = '#e8c8a8', gown = '#f2eee4', gownD = '#d8d0c0', hair = '#3a2418';
    m.box(1, 0, 1, 10, 4, 10, '#2a3a5a'); m.box(0, 4, 0, 12, 1, 12, '#1e2a44');   // plinth
    m.box(2, 5, 2, 8, 2, 8, '#6a4428');                                          // mounting block
    // scrollwork base curling forward
    for (let i = 0; i < 5; i++) m.box(3, 7 + i, 4 + i, 6, 1, 2, i % 2 ? GOLD : BRASS);
    // gown: leaning forward as it rises
    for (let y = 9; y < 20; y++) {
      const z = 4 + Math.floor((y - 9) * 0.55), w = y < 14 ? 6 : 5;
      m.box(6 - w / 2, y, z, w, 1, 4, y % 3 === 0 ? gownD : gown);
    }
    m.box(3.5, 16, 8, 5, 1, 1, GOLD); m.box(4, 15, 9, 1, 2, 1, GOLD);            // sash
    // arms & garland at the breast
    m.box(2, 16, 9, 1, 3, 2, skin); m.box(9, 16, 9, 1, 3, 2, skin); m.box(3, 17, 11, 6, 1, 1, skin);
    m.box(4, 18, 11, 4, 1, 1, '#3a7a2e'); m.set(4, 18, 12, '#d83a4a'); m.set(7, 18, 12, '#f0d040'); m.set(5, 19, 11, '#d83a4a');
    // head, face forward & up, hair streaming back
    m.box(5, 20, 9, 2, 1, 2, skin); m.box(4, 21, 9, 4, 4, 4, skin);
    m.set(4, 23, 12, '#2a4a8a'); m.set(7, 23, 12, '#2a4a8a'); m.set(5, 21, 12, '#c86a6a'); m.set(6, 21, 12, '#c86a6a');
    m.box(4, 25, 8, 4, 1, 5, hair); m.box(3, 21, 7, 1, 4, 5, hair); m.box(8, 21, 7, 1, 4, 5, hair); m.box(4, 19, 5, 4, 6, 3, hair);
    m.box(4, 17, 4, 4, 3, 2, hair);
    m.box(4, 26, 9, 4, 1, 1, GOLD);                                               // diadem
  },
});

// Brass Mark V diving helmet on a turned walnut plinth, 1/32 m voxels (0.7 m): copper-bronze bonnet with
// a round front port (faces +z) and side ports behind grilles, bolted breastplate with wing nuts,
// air & exhaust elbows at the back.
defineProp('diving_helmet', {
  size: [18, 24, 18], scale: 1 / 32, collide: [0.5, 0.75, 0.5],
  build(m) {
    const br = '#c89040', brD = '#9a6a28', cu = '#b8703a';
    m.box(2, 0, 2, 14, 2, 14, WALNUT_D); m.box(3, 2, 3, 12, 1, 12, WALNUT);
    // breastplate
    m.box(2, 3, 3, 14, 3, 12, br); m.box(3, 6, 4, 12, 1, 10, brD);
    for (const [x, z] of [[2, 5], [15, 5], [2, 11], [15, 11], [6, 14], [11, 14], [6, 3], [11, 3]]) m.set(x, 5, z, BRASS_L);
    // bonnet
    m.sphere(9, 13, 9, 6.6, cu); m.sphere(9, 13, 9, 6.6, br, (x, y) => y < 9 || y > 17);
    // front port with a brass rim & cross guard
    for (let a = 0; a < 20; a++) { const t = a * Math.PI / 10; m.set(Math.floor(9 + Math.cos(t) * 3), Math.floor(13 + Math.sin(t) * 3), 15, br); }
    m.cylZ(9, 13, 15, 2.2, 1, '#4a6a70'); m.box(8, 11, 16, 2, 4, 1, brD); m.box(7, 12, 16, 4, 2, 1, brD); m.set(8, 13, 16, '#a8c8d0');
    // side ports
    for (const x of [2, 15]) { m.box(x, 11, 7, 1, 4, 4, '#4a6a70'); m.box(x + (x < 9 ? -1 : 1), 11, 8, 1, 4, 1, brD); m.box(x + (x < 9 ? -1 : 1), 12, 7, 1, 1, 4, brD); }
    // top port & air elbows at the back
    m.box(7, 19, 7, 4, 1, 4, br); m.box(8, 20, 8, 2, 1, 2, '#4a6a70');
    m.box(6, 15, 2, 2, 2, 1, br); m.box(6, 16, 1, 2, 1, 1, br); m.box(11, 11, 2, 2, 2, 1, br); m.box(11, 12, 1, 2, 3, 1, brD);
  },
});

// Whaling harpoons on a wall rack, back at z=0 (2.6 m x 1.2 m): an oak board with pegs carrying two
// toggle-iron harpoons, a barbed two-flued harpoon, a killing lance and a flensing spade on hickory
// poles; a coil of whale line.
defineProp('harpoons_rack', {
  size: [42, 20, 4], origin: [21, 0, 0],
  build(m) {
    const oak = '#8a6040', pole = '#b89060', iron = '#4a4a4c', rust = '#6a3a22';
    m.box(0, 0, 0, 42, 20, 1, oak); m.box(0, 0, 0, 42, 1, 2, '#6a4428'); m.box(0, 19, 0, 42, 1, 2, '#6a4428');
    const rack = (y) => { for (const x of [6, 20, 34]) m.box(x, y - 1, 1, 1, 1, 2, '#5a3a22'); };
    // harpoon: pole from x=1, iron shank to the head at +x
    const harpoon = (y, head) => {
      rack(y); m.box(1, y, 2, 24, 1, 1, pole); m.box(25, y, 2, 12, 1, 1, iron); m.set(24, y, 2, rust);
      if (head === 'toggle') { m.box(37, y, 2, 3, 1, 1, iron); m.set(38, y + 1, 2, iron); m.set(40, y, 2, rust); }
      else if (head === 'barb') { m.box(37, y, 2, 3, 1, 1, iron); m.set(37, y + 1, 2, iron); m.set(37, y - 1, 2, iron); m.set(38, y + 1, 2, iron); m.set(38, y - 1, 2, iron); m.set(40, y, 2, iron); }
      else if (head === 'lance') { m.box(37, y, 2, 3, 1, 1, CHROME_D); m.set(40, y, 2, CHROME_D); }
      else if (head === 'spade') { m.box(37, y - 1, 2, 3, 3, 1, CHROME_D); m.set(40, y, 2, CHROME_D); }
    };
    harpoon(17, 'toggle'); harpoon(13, 'barb'); harpoon(9, 'toggle'); harpoon(5, 'lance'); harpoon(2, 'spade');
    m.cylZ(40.5, 11, 1, 1.5, 2, '#d8c8a0'); m.cylZ(40.5, 11, 3, 0.8, 1, oak);
  },
});

// Arch of a pair of right-whale jawbones (≈3.4 m high, 1/12 m voxels): bleached, curving bones set in
// granite footings, meeting at the top. A walk-through arch along z. (Classic New England lawn relic.)
defineProp('whale_jawbone', {
  size: [30, 42, 8], scale: 1 / 12, cat: 'exterior', collide: false,
  build(m) {
    const bone = '#e8e0cc', boneD = '#cfc4a8';
    for (const s of [0, 1]) {
      for (let y = 0; y < 40; y++) {
        const t = y / 40, x = 3 + Math.round(Math.pow(t, 2.2) * 10.5), w = y > 34 ? 2 : 3;
        const xx = s ? 29 - x - w + 1 : x;
        m.box(xx, y + 2, 2, w, 1, 4, y % 7 === 3 ? boneD : bone);
      }
      m.box(s ? 23 : 1, 0, 1, 6, 3, 6, '#8a8a88');
    }
    m.box(13, 41, 2, 4, 1, 4, bone);
  },
});

// Museum vitrine (1.0 m, 1.75 m tall): mahogany base with a glass case (frame only) on top holding a
// tint-A lustreware jug & vase, scrimshaw whale teeth, a brass sextant, a logbook open on a stand and a
// ship's compass, with a typed card for each.
defineProp('display_case_museum', {
  size: [16, 28, 10], collide: [1.0, 1.75, 0.62],
  build(m) {
    const mah = MAHOG, mahD = MAHOG_D;
    m.box(0, 0, 0, 16, 1, 10, mahD); m.box(0, 1, 0, 16, 12, 10, mah); m.box(1, 3, 9, 14, 8, 1, mahD); m.box(2, 4, 9, 12, 6, 1, mah);
    m.box(0, 13, 0, 16, 1, 10, mahD); m.box(1, 14, 1, 14, 1, 8, '#2a3a2a');
    frame(m, 0, 13, 0, 16, 15, 10, mahD); m.box(0, 27, 0, 16, 1, 10, mahD); m.box(1, 21, 1, 14, 1, 8, '#c8dce0');
    // lower shelf: jug & vase in tint A, scrimshaw teeth, cards
    m.box(2, 15, 3, 2, 3, 2, TA(0.5)); m.set(1, 16, 3, TA(0.45)); m.box(2, 18, 3, 2, 1, 1, TA(0.55));
    m.box(5, 15, 4, 2, 4, 2, TA(0.45)); m.box(5, 17, 4, 2, 1, 2, TA(0.6)); m.box(5.5, 19, 4.5, 1, 1, 1, TA(0.5));
    for (const x of [9, 11]) { m.box(x, 15, 4, 1, 3, 1, '#f0e8d4'); m.set(x, 16, 5, '#2a2a2a'); m.set(x + 1, 15, 4, '#f0e8d4'); }
    m.box(13, 15, 3, 2, 1, 3, BRASS); m.set(13, 16, 3, BRASS); m.set(14, 17, 3, BRASS);                                // sextant
    for (const x of [2, 6, 10, 13]) m.box(x, 15, 7, 2, 1, 1, '#f4f0e6');
    // upper shelf: logbook on a stand, compass
    m.box(3, 22, 3, 6, 1, 4, '#5a3a22'); m.box(3, 23, 3, 6, 1, 3, '#efe6cc'); m.set(6, 23, 3, '#b8a888'); m.set(4, 23, 4, '#6a6a6a'); m.set(7, 23, 5, '#6a6a6a');
    m.box(11, 22, 3, 3, 2, 3, WALNUT); m.box(11, 24, 3, 3, 1, 3, '#f4f0e6'); m.set(12, 24, 4, '#c8202a');             // compass
    glint(m, 2, 17, 9, 3); glint(m, 10, 23, 9, 3);
  },
});

// Admiralty-pattern anchor on a granite plinth (≈1.9 m): iron shank, ring and oak stock (the stock
// runs along z), curved arms with spade flukes along x, a length of chain draped over the plinth.
defineProp('anchor_display', {
  size: [24, 31, 14], collide: [1.4, 1.9, 0.85],
  build(m) {
    const ir = '#3a3634', rust = '#6a3e26', gran = '#8a8a88', granD = '#6e6e6c';
    m.box(1, 0, 1, 22, 3, 12, granD); m.box(2, 3, 2, 20, 1, 10, gran);
    m.box(11, 4, 6, 2, 22, 2, ir);                            // shank
    // arms curving up to the flukes
    for (let i = 0; i < 9; i++) { const y = 5 + Math.round((i * i) / 9); m.box(11 - i - 1, y, 6, 1, 2, 2, ir); m.box(12 + i + 1, y, 6, 1, 2, 2, ir); }
    m.box(0, 13, 5, 4, 5, 4, ir); m.box(20, 13, 5, 4, 5, 4, ir); m.box(1, 17, 6, 2, 2, 2, ir); m.box(21, 17, 6, 2, 2, 2, ir);   // flukes & bills
    m.box(10, 4, 5, 4, 2, 4, ir);                             // crown
    m.box(11, 24, 0, 2, 2, 14, '#6a4a2a'); for (const z of [0, 13]) m.box(11, 24, z, 2, 2, 1, '#2a2a2a');   // oak stock with iron bands
    for (let a = 0; a < 16; a++) { const t = a * Math.PI / 8; m.set(Math.floor(12 + Math.cos(t) * 2.2), Math.floor(28.5 + Math.sin(t) * 2.2), 7, ir); }   // ring
    m.set(10, 9, 6, rust); m.set(13, 16, 7, rust); m.set(4, 14, 8, rust); m.set(19, 15, 5, rust);
    // chain
    for (let i = 0; i < 12; i++) m.box(2 + i * 1.6, 4, 10 + (i % 2), 1, 1, 1, i % 2 ? ir : '#2a2826');
    for (let y = 1; y < 4; y++) m.set(21, y, 12, ir);
  },
});

// Ship's wheel mounted on a wall, back at z=0, 1/32 m voxels (1.1 m dia): teak rim with brass rings,
// eight turned spokes & handles, brass hub, on an iron wall bracket. Origin = bottom-centre of the back.
defineProp('ships_wheel_wall', {
  size: [36, 36, 6], scale: 1 / 32, origin: [18, 0, 0],
  build(m) {
    const teak = '#7a4a26', teakD = '#5a3418';
    for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) {
      const d = Math.hypot(x + 0.5 - 18, y + 0.5 - 18);
      if (d >= 10.5 && d <= 12.5) m.box(x, y, 3, 1, 1, 2, Math.abs(d - 11.5) < 0.35 ? BRASS : teak);
    }
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      for (let r = 3; r <= 17.5; r += 0.5) {
        const x = Math.floor(18 + Math.cos(a) * r), y = Math.floor(18 + Math.sin(a) * r);
        m.box(x, y, 3, 1, 1, 2, r > 12.5 ? (r > 16 ? teakD : teak) : teakD);
      }
    }
    m.cylZ(18, 18, 2, 3.2, 4, BRASS); m.cylZ(18, 18, 5, 1.6, 1, BRASS_L);
    m.box(16, 12, 0, 4, 12, 2, '#2a2a2c'); m.box(17, 17, 2, 2, 2, 1, '#2a2a2c');
  },
});

// Ship's bell on a stand, 1/32 m voxels (1.25 m): polished brass bell hung from an oak gallows with an
// iron crown bracket, a white braided bell-rope with a Turk's-head knot.
defineProp('bell_brass', {
  size: [24, 40, 14], scale: 1 / 32, collide: [0.6, 1.25, 0.45],
  build(m) {
    const oak = '#7a5030';
    m.box(2, 0, 2, 20, 2, 10, oak); m.box(3, 2, 6, 2, 36, 2, oak); m.box(19, 2, 6, 2, 36, 2, oak); m.box(2, 36, 5, 20, 3, 4, oak);
    m.box(3, 2, 3, 2, 3, 8, oak); m.box(19, 2, 3, 2, 3, 8, oak);
    m.box(11, 33, 6, 2, 3, 2, '#2a2a2c');                    // crown bracket
    const prof = [5.6, 5.4, 5.0, 4.6, 4.3, 4.1, 4.0, 3.9, 3.9, 3.8, 3.6, 3.2, 2.4];
    prof.forEach((r, i) => m.cyl(12, 19 + i, 7, r, 1, i === 0 ? BRASS_D : i === 2 || i === 9 ? BRASS_L : BRASS));
    m.cyl(12, 19, 7, 4.4, 1, 0); m.box(11.5, 16, 6.5, 1, 4, 1, BRASS_D); m.set(11.5, 16, 6.5, BRASS);   // clapper
    m.box(11.5, 12, 6.5, 1, 4, 1, '#f4f0e6'); m.box(11, 10, 6, 2, 2, 2, '#e8e0cc'); m.box(11.5, 7, 6.5, 1, 3, 1, '#f4f0e6');   // bell rope
  },
});

// ---------------------------------------------------------------- fire station & police

// "Old Faithful", the town's 1903 horse-drawn steam fire engine — the fire-house showpiece. 1/12 m voxels
// (≈2.0 m wide, 3.0 m tall, 4.2 m long). Polished brass boiler with banded jacket and flared stack over
// the rear axle, big red wheels with gold hubs & iron tyres, red frame with gold striping, brass pump
// air-chamber, driver's box with lamps & bell, coal box and stoker's step at the rear, hard suction hose
// along the sides, and the horses' pole. The pole/front points +z.
defineProp('steam_pumper', {
  size: [24, 38, 52], scale: 1 / 12, collide: [2.0, 3.0, 4.3],
  build(m) {
    const red = '#a81c1c', redD = '#801414', gold = '#d8b04a', tyre = '#2a2a2a', nick = '#d8dce0';
    const wheel = (x, cy, cz, r, spokes) => {
      for (let y = 0; y < 38; y++) for (let z = 0; z < 52; z++) {
        const d = Math.hypot(y + 0.5 - cy, z + 0.5 - cz);
        if (d > r) continue;
        if (d > r - 1) m.box(x, y, z, 2, 1, 1, tyre);
        else if (d > r - 2) m.box(x, y, z, 2, 1, 1, red);
        else if (d < 1.8) m.box(x, y, z, 2, 1, 1, gold);
      }
      const sx = x + (x < 12 ? 1 : 0);
      for (let k = 0; k < spokes; k++) {
        const a = (k + 0.5) * 2 * Math.PI / spokes;
        for (let t = 1.5; t < r - 1.5; t += 0.5) m.set(sx, cy + Math.sin(a) * t, cz + Math.cos(a) * t, red);
      }
      m.box(x < 12 ? x - 1 : x + 2, cy - 0.5, cz - 0.5, 1, 1, 1, gold);          // hub cap
    };
    wheel(0, 9, 10, 9, 10); wheel(22, 9, 10, 9, 10);            // rear wheels (1.5 m)
    wheel(2, 6.5, 38, 6.5, 8); wheel(20, 6.5, 38, 6.5, 8);    // front wheels (1.1 m)
    m.box(1, 8.5, 9.5, 22, 1, 1, '#2a2a2a'); m.box(3, 6, 37.5, 18, 1, 1, '#2a2a2a');   // axles
    // frame rails with gold pinstripe, curving up to the driver's box
    for (const x of [4, 19]) {
      m.box(x, 11, 3, 1, 2, 26, red); m.box(x, 12, 3, 1, 1, 26, gold);
      for (let i = 0; i < 6; i++) m.box(x, 13 + i * 1.3, 29 + i, 1, 2, 1, red);
    }
    m.box(5, 10, 16, 14, 1, 6, redD);
    // boiler over the rear axle
    m.cyl(12, 7, 8, 4.6, 19, BRASS); for (const y of [9, 13, 17, 21, 25]) m.cyl(12, y, 8, 4.8, 1, BRASS_D);
    m.cyl(12, 26, 8, 3.6, 2, nick); m.cyl(12, 28, 8, 2.6, 4, BRASS); m.cyl(12, 32, 8, 3.6, 1, BRASS_L); m.cyl(12, 33, 8, 4.4, 2, BRASS);   // stack & crown
    m.cyl(12, 35, 8, 3.2, 1, '#2a2a2a');
    m.box(10, 9, 12, 5, 4, 1, '#2a2a2a'); m.box(11, 10, 13, 3, 2, 1, '#e86a20');      // firebox door (glow)
    m.box(15, 18, 12, 2, 2, 1, '#f4f0e6'); m.set(15, 19, 13, '#1a1a1a');              // steam gauge
    // pump & brass air chamber
    m.box(8, 11, 17, 8, 5, 5, nick); m.box(9, 16, 18, 6, 1, 3, BRASS_D);
    m.cyl(12, 17, 19.5, 2, 5, BRASS); m.sphere(12, 23.5, 19.5, 2.8, BRASS_L); m.set(12, 26, 19, BRASS);
    for (const x of [3, 20]) { m.box(x, 12, 18, 1, 2, 3, BRASS); m.box(x < 12 ? x - 1 : x + 1, 12, 19, 1, 2, 1, BRASS_L); }   // suction inlets
    // driver's box, seat, lamps & bell
    m.box(5, 19, 30, 14, 5, 7, red); m.box(5, 19, 36, 14, 5, 1, redD); m.box(6, 20, 37, 12, 3, 1, red);
    m.text('NO 1', 12, 20, 37, gold, { font: 'small', align: 'center' });
    m.box(6, 24, 30, 12, 2, 5, '#1a1a1a'); m.box(6, 24, 29, 12, 5, 1, '#1a1a1a');     // seat & back
    m.box(4, 16, 37, 16, 1, 4, '#5a3a22');                                            // footboard
    for (const x of [3, 20]) { m.box(x, 22, 36, 1, 3, 1, BRASS); m.box(x, 25, 35, 1, 3, 3, BRASS_L); m.set(x, 26, 37, { c: '#fff0b0', emit: 0.5 }); }
    m.box(11.5, 26, 34, 1, 4, 1, '#2a2a2a'); m.sphere(12, 29, 34.5, 1.8, BRASS, (x, y) => y < 30); m.set(12, 30, 34, BRASS);   // bell
    // coal box & stoker's step at the rear
    m.box(7, 11, 0, 10, 5, 3, '#1a1a1a'); m.box(8, 16, 1, 8, 1, 1, '#3a3a3a');
    m.box(5, 6, 0, 14, 1, 2, '#5a3a22'); m.box(4, 7, 0, 1, 9, 1, BRASS); m.box(19, 7, 0, 1, 9, 1, BRASS);
    // suction hose along both sides
    for (const x of [2, 21]) { m.box(x, 14, 4, 1, 1, 24, '#1a1a1a'); for (let z = 6; z < 28; z += 5) m.set(x, 14, z, BRASS_D); }
    // horses' pole & whippletree
    m.box(11.5, 7, 40, 1, 1, 12, '#8a6a48'); m.box(7, 7, 43, 10, 1, 1, '#8a6a48'); m.set(12, 7, 51, BRASS);
    for (const x of [7, 16]) m.set(x, 7, 44, BRASS);
  },
});

// Fire-house wall rack, back at z=0 (2.0 x 1.9 m): oak board with four pegs, each with a black leather
// helmet (the captain's is white) above a hanging turnout coat, plus a coiled length of rope and an axe.
defineProp('helmet_rack', {
  size: [32, 31, 7], origin: [16, 0, 0], collide: false,
  build(m) {
    const oak = '#8a6040', coat = '#2a2a2c', coatL = '#3e3e40', refl = '#d8c060';
    m.box(0, 20, 0, 32, 5, 1, oak); m.box(0, 25, 0, 32, 1, 2, '#6a4428');
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 8, helm = i === 0 ? '#f0ece4' : '#1e1e20';
      m.box(x + 2, 22, 1, 1, 1, 3, BRASS);                      // peg
      // coat hanging from the peg
      m.box(x, 8, 1, 6, 13, 3, i % 2 ? coatL : coat); m.box(x + 1, 21, 1, 4, 1, 2, i % 2 ? coatL : coat);
      m.box(x, 11, 4, 6, 1, 1, refl); m.box(x + 2, 12, 4, 1, 8, 1, '#1a1a1a');
      for (const y of [13, 16, 19]) m.set(x + 3, y, 4, '#b8b0a0');                  // clasps
      m.box(x - 1, 9, 1, 1, 11, 2, i % 2 ? coatL : coat); m.box(x + 6, 9, 1, 1, 11, 2, i % 2 ? coatL : coat);   // sleeves
      // leather helmet with long back brim & front shield
      m.box(x, 25, 1, 6, 1, 6, helm); m.box(x + 1, 26, 2, 4, 2, 4, helm); m.box(x + 2, 28, 3, 2, 1, 2, helm);
      m.box(x - 1, 25, 0, 8, 1, 2, helm);
      m.box(x + 2, 26, 6, 2, 3, 1, i === 0 ? '#1e1e20' : '#c8202a'); m.set(x + 2.5, 29, 6, BRASS);     // front shield & eagle
      m.text(String(i + 1), x + 2, 26, 7, '#f4f0e6', { font: 'small' });
    }
    m.cylZ(30, 5, 1, 2, 2, '#d8c8a0'); m.cylZ(30, 5, 3, 1, 1, '#b8a880');
    m.box(28, 12, 1, 1, 7, 1, '#8a6a48'); m.box(27, 18, 1, 3, 2, 1, '#8a8a8e'); m.set(26, 18, 1, '#c8202a');
  },
});

// Fireman's boots with turnout pants pushed down over them, ready to step into — 1/32 m voxels: black
// rubber boots with red tops, tan canvas trousers bunched at the ankles, red suspenders.
defineProp('fire_boots', {
  size: [18, 22, 14], scale: 1 / 32, collide: [0.5, 0.65, 0.42],
  build(m) {
    const rub = '#1a1a1c', red = '#b8202a', can = '#b89a6a', canD = '#9a7e52';
    for (const x of [2, 10]) {
      m.box(x, 0, 2, 6, 1, 10, '#101010'); m.box(x, 1, 3, 6, 3, 9, rub); m.box(x, 1, 3, 6, 12, 5, rub);
      m.box(x, 13, 3, 6, 1, 5, red); m.set(x + 2, 1, 11, red);
    }
    // bunched trousers around both boots
    for (let y = 8; y < 16; y++) m.box(1, y, 2, 16, 1, 7, y % 3 === 0 ? canD : can);
    m.box(2, 16, 2, 14, 2, 7, can); m.box(3, 18, 2, 12, 1, 7, canD); m.clear(4, 18, 3, 10, 1, 5);
    m.box(4, 18, 3, 1, 4, 1, red); m.box(13, 18, 3, 1, 4, 1, red); m.box(4, 18, 7, 1, 4, 1, red); m.box(13, 18, 7, 1, 4, 1, red);   // suspenders
    m.box(4, 21, 3, 10, 1, 1, red); m.box(4, 21, 7, 10, 1, 1, red);
  },
});

// Fire-house checkers table, 1/32 m voxels (0.62 m square, 0.75 m): oak table with a painted red &
// black checkerboard top, a game in progress, a coffee mug and an ashtray.
defineProp('checkers_table', {
  size: [20, 26, 20], scale: 1 / 32, collide: [0.62, 0.78, 0.62],
  build(m) {
    const oak = '#8a6040';
    legs(m, 1, 0, 1, 18, 18, 22, '#6a4428', 2); m.box(2, 12, 2, 16, 1, 16, '#6a4428');
    m.box(0, 22, 0, 20, 2, 20, oak);
    for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) m.box(2 + i * 2, 23, 2 + k * 2, 2, 1, 2, (i + k) % 2 ? '#1a1a1a' : '#a82020');
    const pcs = [[0, 0, 'r'], [2, 0, 'r'], [4, 0, 'r'], [1, 1, 'r'], [5, 1, 'r'], [7, 1, 'r'], [2, 2, 'r'], [3, 3, 'r'], [6, 2, 'r'],
      [1, 7, 'b'], [3, 7, 'b'], [7, 7, 'b'], [0, 6, 'b'], [4, 6, 'b'], [6, 6, 'b'], [5, 5, 'b'], [4, 4, 'b']];
    for (const [i, k, t] of pcs) m.box(2 + i * 2, 24, 2 + k * 2, 2, 1, 2, t === 'r' ? '#e04040' : '#f0ece0');
    m.box(4, 25, 10, 2, 1, 2, '#e04040');                      // a king
    m.box(16, 24, 16, 2, 2, 2, '#f4f0e6'); m.set(18, 25, 16, '#f4f0e6'); m.set(16, 26, 16, '#4a2a18');
  },
});

// Desk sergeant's high desk (2.0 m, 1.3 m high): raised oak counter with brass rail, "SERGEANT" plate,
// the big blotter/register book, green-shaded lamp, telephone & spike of reports; the sergeant sits on a
// platform behind (at -z), visitors stand at +z.
defineProp('police_desk', {
  size: [32, 28, 16], collide: [2.0, 1.35, 1.0],
  build(m) {
    const oak = '#7a5030', oakD = '#5a3a22';
    m.box(0, 0, 0, 32, 4, 8, oakD);                          // platform behind
    m.box(0, 0, 8, 32, 20, 7, oak);
    for (const x of [1, 11, 21]) { m.box(x, 2, 15, 10, 14, 1, oakD); m.box(x + 1, 3, 15, 8, 12, 1, oak); }
    m.box(0, 20, 6, 32, 1, 10, oakD); m.box(0, 21, 14, 32, 1, 1, BRASS);      // top & brass rail
    for (const x of [1, 15, 30]) m.box(x, 20, 14, 1, 1, 1, BRASS_D);
    m.box(8, 16, 15, 16, 4, 1, '#1a1a1a'); label(m, 'SERGEANT', 16, 16, 16, '#e8d090', { align: 'center' });
    // blotter book, lamp, phone, spike
    m.box(9, 21, 7, 12, 1, 6, '#f4ecd8'); m.box(9, 21, 7, 12, 1, 1, '#5a1a1a'); m.box(15, 21, 7, 1, 1, 6, '#c8b890');
    for (const x of [10, 12, 17, 19]) m.set(x, 21, 10, '#6a6a6a');
    m.box(3, 21, 8, 2, 1, 2, BRASS); m.box(3.5, 22, 8.5, 1, 3, 1, BRASS); m.box(2, 25, 7, 4, 1, 4, '#2a5a3a'); m.box(3, 24, 8, 2, 1, 2, { c: '#fff0c0', emit: 0.6 });
    m.box(25, 21, 8, 3, 2, 3, '#1a1a1a'); m.box(25, 23, 8, 3, 1, 1, '#1a1a1a'); m.box(25, 23, 10, 3, 1, 1, '#1a1a1a');
    m.box(29, 21, 11, 1, 3, 1, '#5a5a5a'); m.box(28, 21, 10, 3, 1, 3, '#f4ecd8');
  },
});

// Jail-cell cot: riveted steel frame with strap springs, thin ticking-striped mattress, grey army
// blanket folded at the foot and a flat pillow. Along z; head at -z.
defineProp('jail_cot', {
  size: [12, 8, 32], collide: [0.75, 0.5, 2.0],
  build(m) {
    const st = '#4a5054';
    legs(m, 0, 0, 0, 12, 32, 5, st);
    m.box(0, 5, 0, 12, 1, 32, st); m.clear(1, 5, 1, 10, 1, 30); for (let z = 2; z < 31; z += 3) m.box(1, 5, z, 10, 1, 1, st);
    m.box(1, 6, 1, 10, 1, 30, '#e8e4d8'); for (let x = 2; x < 11; x += 2) m.box(x, 6, 1, 1, 1, 30, '#8a9ab0');   // ticking stripes
    m.box(2, 7, 2, 8, 1, 4, '#f0ece4');
    m.box(1, 7, 24, 10, 1, 6, '#6a6e6a'); m.box(1, 7, 27, 10, 1, 1, '#5a5e5a');
  },
});

// Police-station bulletin board, back at z=0, 1/32 m voxels (1.25 x 0.95 m): cork in an oak frame with a
// "WANTED" poster and mug shot, typed bulletins, a map with pins, a photo; red thumbtacks.
defineProp('wanted_board', {
  size: [40, 30, 2], scale: 1 / 32, origin: [20, 0, 0],
  build(m) {
    const oak = '#7a5030', cork = '#b8905a', paper = '#f0e8d4', tack = '#c8202a';
    m.box(0, 0, 0, 40, 30, 1, oak); m.box(2, 2, 0, 36, 26, 2, cork);
    for (const [x, y] of [[7, 5], [30, 24], [22, 4], [35, 12], [4, 22]]) m.set(x, y, 1, '#9a7448');   // cork speckle
    // WANTED poster
    m.box(3, 4, 1, 25, 23, 1, paper); m.text('WANTED', 15.5, 21, 1, '#1a1a1a', { font: 'small', align: 'center' });
    m.box(11, 11, 1, 9, 8, 1, '#8a8478'); m.box(13, 12, 1, 5, 5, 1, '#c8b8a0'); m.box(13, 16, 1, 5, 2, 1, '#3a3028'); m.set(14, 14, 1, '#2a2a2a'); m.set(16, 14, 1, '#2a2a2a');
    m.text('$500', 15.5, 5, 1, '#8a1a1a', { font: 'small', align: 'center' });
    m.set(4, 26, 1, tack); m.set(27, 26, 1, tack);
    // typed bulletin & a notice
    m.box(29, 15, 1, 9, 12, 1, '#f4e8a8'); for (let y = 17; y < 25; y += 2) m.box(30, y, 1, 7, 1, 1, '#8a8a88'); m.set(33, 26, 1, tack);
    // street map with pins
    m.box(29, 3, 1, 9, 10, 1, '#e8e4c8'); for (let x = 31; x < 37; x += 3) m.box(x, 3, 1, 1, 10, 1, '#c8c0a0'); for (let y = 5; y < 13; y += 3) m.box(29, y, 1, 9, 1, 1, '#c8c0a0');
    m.box(29, 7, 1, 3, 6, 1, '#a8c8d8'); m.set(33, 9, 1, tack); m.set(35, 6, 1, '#2a4ab0'); m.set(34, 11, 1, tack);
  },
});

// Police radio dispatch set (1.5 m): grey steel transmitter/receiver cabinet with glowing meters & dial,
// rows of knobs and toggle switches, a speaker grille, a chrome desk microphone with push-to-talk bar,
// headphones and the call log on the writing shelf. Operator at +z.
defineProp('police_radio', {
  size: [16, 25, 12], collide: [1.0, 1.55, 0.75],
  build(m) {
    const gr = '#6a7278', grD = '#4e565c';
    m.box(0, 0, 0, 16, 1, 7, grD); m.box(0, 1, 0, 16, 24, 7, gr);
    for (const y of [8, 16]) m.box(0, y, 7 - 1, 16, 1, 1, grD);
    m.box(0, 10, 7, 16, 1, 5, '#5a3a22');                      // writing shelf
    // lower: speaker grille
    for (let y = 2; y < 7; y++) for (let x = 3; x < 13; x++) if ((x + y) % 2 === 0) m.set(x, y, 6, grD);
    // meters, dial & knobs
    for (const x of [2, 7]) { m.box(x, 20, 7 - 1, 3, 3, 1, '#2a2a2a'); m.box(x + 0.5, 21, 6, 2, 2, 1, { c: '#f8e0a0', emit: 0.8 }); }
    m.box(11, 19, 6, 4, 4, 1, '#2a2a2a'); m.box(11.5, 20, 6, 3, 2, 1, { c: '#a0e0a0', emit: 0.7 }); m.set(13, 21, 6, '#1a1a1a');
    for (let x = 2; x < 15; x += 3) { m.set(x, 13, 7 - 1, '#1a1a1a'); m.set(x, 17, 7 - 1, '#1a1a1a'); m.set(x + 1, 13, 6, { c: '#ff5040', emit: 0.9 }); }
    m.set(2, 24, 6, { c: '#ff3020', emit: 0.95 });
    // desk mic, headphones, log
    m.box(4, 11, 8, 3, 1, 3, CHROME_D); m.box(5, 12, 9, 1, 2, 1, CHROME); m.box(4, 14, 9, 3, 2, 2, CHROME_M); m.box(4, 11, 11, 3, 1, 1, '#1a1a1a');
    m.box(10, 11, 8, 1, 1, 2, '#1a1a1a'); m.box(13, 11, 8, 1, 1, 2, '#1a1a1a'); m.box(10, 12, 8, 4, 1, 1, CHROME_D);
    m.box(9, 11, 10, 5, 1, 2, '#f4ecd8');
  },
});

// ---------------------------------------------------------------- bank & post office

// Bank teller's counter module (1.5 m): veined marble counter with a bronze-trimmed base, ornate brass
// grille screen with an arched teller's window, marble deal-plate, pen on a chain, "TELLER" plate.
// Customers at +z, the teller at -z (with a cash drawer & ledger on the inner shelf).
defineProp('teller_counter', {
  size: [24, 38, 10], collide: [1.5, 2.35, 0.62],
  build(m) {
    const mar = '#ece6dc', marD = '#d4ccc0', vein = '#b8b0a4';
    m.box(0, 0, 0, 24, 1, 10, '#3a2a1a'); m.box(0, 1, 0, 24, 16, 9, mar);
    for (const x of [1, 12]) { m.box(x, 3, 9, 11, 12, 1, marD); m.box(x + 1, 4, 9, 9, 10, 1, mar); }
    for (const [x, y] of [[3, 6], [4, 7], [5, 7], [15, 11], [16, 10], [17, 10], [8, 12]]) m.set(x, y, 9, vein);
    m.box(0, 1, 9, 24, 1, 1, BRASS_D); m.box(0, 17, 0, 24, 1, 10, marD);
    m.clear(1, 8, 0, 22, 8, 3); m.box(1, 8, 0, 22, 1, 3, MAHOG); m.box(3, 9, 0, 6, 2, 2, BRASS_D); m.box(12, 9, 0, 6, 1, 3, '#2a4a2a');   // teller's shelf
    // brass grille
    m.box(0, 18, 1, 1, 18, 2, BRASS_D); m.box(23, 18, 1, 1, 18, 2, BRASS_D); m.box(0, 35, 1, 24, 3, 2, BRASS_D);
    for (let x = 1; x < 23; x++) for (let y = 18; y < 35; y++) {
      const win = x >= 8 && x < 16 && (y < 27 || Math.hypot(x + 0.5 - 12, y - 27) < 4);
      if (!win && (x % 3 === 0 || (y - 18) % 4 === 0)) m.set(x, y, 2, (x + y) % 6 === 0 ? BRASS_L : BRASS);
    }
    for (let a = 0; a <= 16; a++) { const t = a * Math.PI / 16; m.set(Math.floor(12 + Math.cos(t) * 4.2), Math.floor(27 + Math.sin(t) * 4.2), 2, BRASS_D); }
    m.box(8, 18, 2, 1, 9, 1, BRASS_D); m.box(15, 18, 2, 1, 9, 1, BRASS_D);
    m.box(9, 17, 3, 6, 1, 4, '#dcd4c8'); m.box(10, 17, 5, 4, 1, 1, vein);            // deal plate (trough)
    m.box(0, 31, 3, 24, 7, 1, '#1a1a1a'); label(m, 'TELLER', 12, 32, 3, '#e8d090', { align: 'center' });
    m.box(18, 18, 7, 1, 1, 2, '#1a1a1a'); m.box(17, 18, 8, 1, 1, 1, CHROME_D); m.box(19, 18, 6, 1, 1, 1, CHROME_D);   // pen on its chain
    m.box(2, 18, 6, 4, 1, 3, '#f4ecd8');                        // deposit slips
  },
});

// Great round bank-vault door standing OPEN, back at z=0 (≈2.2 m ring). The steel jamb ring is flush on
// the wall around a dark vault opening barred by a day gate; the 0.45 m-thick door has swung out 90°
// on its massive hinge at +x, showing its bolt ring, polished inner face with linkage bars and a
// four-dial time lock (facing -x toward the opening) and the spoked handwheel on its outer face.
// Origin = floor point below the centre of the ring, at the wall.
defineProp('bank_vault_door', {
  size: [46, 36, 30], origin: [17, 0, 0], collide: [0.8, 2.2, 1.8],
  build(m) {
    const st = '#8a9096', stD = '#5e666c', stL = '#b8c0c6', pol = '#c8d0d6', dark = '#141618';
    const cx = 17, cy = 17.5;
    for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= 17.5 && d > 13.5) m.box(x, y, 0, 1, 1, 2, d > 16.5 ? stD : d < 14.5 ? stL : st);
      else if (d <= 13.5) { m.set(x, y, 0, dark); if ((x - 5) % 3 === 0 && y > 4 && y < 31) m.set(x, y, 1, stD); }   // opening & day-gate bars
    }
    for (let y = 6; y < 31; y += 8) for (let x = 4; x < 31; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 13.5) m.set(x, y, 1, stD);
    // hinge arm
    m.box(33, 8, 1, 4, 4, 4, stD); m.box(33, 23, 1, 4, 4, 4, stD); m.box(35, 6, 3, 3, 23, 3, st);
    // the door, swung out: a disc in the y-z plane, x = 37..43, z centre 16
    const dz = 16, R = 13;
    for (let y = 0; y < 36; y++) for (let z = 2; z < 30; z++) {
      const d = Math.hypot(y + 0.5 - cy, z + 0.5 - dz);
      if (d > R) continue;
      m.box(37, y, z, 7, 1, 1, d > R - 1 ? stD : st);
      m.set(37, y, z, d > R - 1.2 ? stD : d > R - 3 ? st : pol);                 // inner face (-x)
      m.set(43, y, z, d > R - 1.2 ? stD : stL);                                  // outer face (+x)
    }
    // bolts protruding from the rim
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; const y = cy + Math.sin(a) * (R + 0.5), z = dz + Math.cos(a) * (R + 0.5); m.box(39, y, z, 3, 1, 1, CHROME); }
    // inner face: linkage bars, time lock with four dials, hinge plate
    m.box(36, 17, 6, 1, 1, 20, CHROME_M); m.box(36, 6, 16, 1, 23, 1, CHROME_M);
    m.box(36, 21, 9, 1, 8, 12, stD); for (const [y, z] of [[26, 11], [26, 17], [23, 11], [23, 17]]) { m.box(36, y, z, 1, 2, 3, '#f4f0e6'); m.set(36, y + 1, z + 1, dark); }
    m.box(36, 21, 9, 1, 1, 12, BRASS); m.box(36, 28, 9, 1, 1, 12, BRASS);
    m.box(36, 8, 13, 1, 6, 6, stL); m.set(36, 10, 15, BRASS); m.set(36, 11, 16, BRASS);
    // outer face: spoked handwheel & dial
    m.box(44, 16, 15, 1, 3, 3, CHROME_D);
    for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; for (let t = -5; t <= 5; t += 0.5) m.set(45, cy + Math.sin(a) * t, dz + Math.cos(a) * t, CHROME); }
    for (let a = 0; a < 24; a++) { const t = a * Math.PI / 12; m.set(45, cy + Math.sin(t) * 5.5, dz + Math.cos(t) * 5.5, CHROME_M); }
    m.box(44, 25, 15, 1, 3, 3, '#1a1a1a'); m.set(45, 26, 16, '#f4f0e6');
  },
});

// Office water cooler, 1/32 m voxels (1.55 m): cream enamel cabinet with a chrome bubbler & push lever,
// drip grille, an upturned five-gallon glass bottle of water on top, paper cone-cup dispenser at the side.
defineProp('office_water_cooler', {
  size: [16, 50, 14], scale: 1 / 32, collide: [0.42, 1.55, 0.42],
  build(m) {
    const cr = '#ece4cc', crD = '#cfc6ac';
    m.box(1, 0, 1, 12, 1, 12, '#3a3a3a'); m.box(1, 1, 1, 12, 28, 12, cr); m.box(1, 1, 12, 12, 1, 1, crD);
    for (let y = 4; y < 10; y += 2) m.box(3, y, 13 - 1, 8, 1, 1, crD);
    m.box(1, 27, 1, 12, 2, 12, CHROME_M); m.box(3, 28, 3, 8, 1, 8, CHROME_D); for (let x = 4; x < 10; x += 2) m.box(x, 29, 4, 1, 1, 6, CHROME);
    m.box(6, 29, 10, 2, 2, 2, CHROME); m.box(6, 31, 11, 2, 1, 1, CHROME_M);              // bubbler
    m.box(10, 24, 13, 2, 3, 1, CHROME);                                                // lever
    m.box(3, 29, 3, 8, 2, 8, crD);                                                     // collar
    col(m, 3, 31, 3, 8, 12, '#b8d8e4'); col(m, 4, 31, 4, 6, 12, '#a0c8d8'); col(m, 3, 43, 3, 8, 2, '#c8e0e8'); col(m, 5, 45, 5, 4, 1, '#d8ecf0');
    m.box(3, 34, 10, 1, 8, 1, '#e8f4f8');                                              // glint on the bottle
    col(m, 13, 14, 5, 3, 10, CHROME_M); m.box(13, 13, 5, 3, 1, 3, '#f4f4f0');           // cone-cup dispenser
  },
});

// Office adding machine, 1/32 m voxels (0.4 m): grey-green case with nine rows of column keys (white,
// with red & green function bars), a crank handle on the right, and a paper tape rising from the roll.
defineProp('adding_machine', {
  size: [14, 12, 16], scale: 1 / 32,
  build(m) {
    const cs = '#5a6a60', csD = '#46544c';
    m.box(1, 0, 1, 11, 2, 14, csD);
    for (let z = 1; z < 15; z++) m.box(1, 2, z, 11, Math.max(1, Math.round((15 - z) * 0.45)), 1, cs);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) { const z = 12 - r, y = 2 + Math.round((15 - z) * 0.45); m.set(2 + c, y, z, c === 7 ? '#c8202a' : c === 6 ? '#3a8a4a' : '#f4f0e6'); }
    m.box(2, 8, 2, 9, 2, 3, csD); m.cylX(3, 9, 2.5, 1.5, 7, '#f4f0e6');               // paper roll
    m.box(4, 10, 2, 5, 1, 1, '#f4f0e6'); m.box(4, 11, 1, 5, 1, 1, '#f4f0e6'); m.set(5, 11, 1, '#6a6a6a');
    m.box(12, 4, 5, 1, 2, 2, CHROME_D); m.box(13, 4, 5, 1, 6, 1, CHROME); m.box(13, 9, 5, 1, 1, 3, '#1a1a1a');   // crank
  },
});

// Small office safe on castors, 1/32 m voxels (0.55 x 0.7 m): black enamel with gold pinstriping, a
// painted landscape panel above the door, brass combination dial & T-handle, maker's plate.
defineProp('safe_small', {
  size: [18, 23, 18], scale: 1 / 32, collide: [0.56, 0.72, 0.56],
  build(m) {
    const blk = '#1c1e1c', gold = '#c8a040';
    for (const [x, z] of [[1, 1], [15, 1], [1, 15], [15, 15]]) m.box(x, 0, z, 2, 2, 2, '#3a3a3a');
    m.box(0, 2, 0, 18, 21, 18, blk);
    m.box(2, 3, 17, 14, 14, 1, '#262826'); m.box(2, 3, 17, 14, 1, 1, gold); m.box(2, 16, 17, 14, 1, 1, gold); m.box(2, 3, 17, 1, 14, 1, gold); m.box(15, 3, 17, 1, 14, 1, gold);
    // painted landscape panel
    m.box(3, 18, 17, 12, 4, 1, '#88b0c8'); m.box(3, 18, 17, 12, 1, 1, '#4a7a3a'); m.box(9, 19, 17, 4, 1, 1, '#4a7a3a'); m.set(5, 19, 17, '#f4f0e6'); m.set(12, 21, 17, '#f8e080');
    m.box(2, 17, 17, 14, 1, 1, gold); m.box(2, 22, 17, 14, 1, 1, gold);
    // dial & handle
    m.cylZ(9, 11.5, 17, 2.6, 1, BRASS); m.cylZ(9, 11.5, 18 - 1, 1.2, 1, BRASS_L); m.set(9, 13, 17, '#1a1a1a');
    m.box(8, 6, 17, 3, 1, 1, BRASS); m.box(9, 5, 17, 1, 3, 1, BRASS_D);
    m.box(4, 14, 17, 3, 1, 1, BRASS_L);
  },
});

// Post-office stamp window counter module (1.5 m): oak counter with brass grille & arched window,
// "STAMPS" plate, a postal scale, sheets & booklets of stamps, moistener sponge, ink pad & cancelling
// stamp. Customers at +z, the clerk at -z.
defineProp('stamp_counter', {
  size: [24, 34, 10], collide: [1.5, 2.1, 0.62],
  build(m) {
    const oak = '#8a6040', oakD = '#6a4428';
    m.box(0, 0, 0, 24, 1, 9, oakD); m.box(0, 1, 0, 24, 15, 9, oak);
    for (const x of [1, 12]) { m.box(x, 3, 9, 11, 10, 1, oakD); m.box(x + 1, 4, 9, 9, 8, 1, oak); }
    m.box(0, 16, 0, 24, 1, 10, '#6a7a70');                   // green linoleum top
    m.box(0, 17, 1, 1, 14, 2, oak); m.box(23, 17, 1, 1, 14, 2, oak); m.box(0, 31, 1, 24, 3, 2, oakD);
    for (let x = 1; x < 23; x++) for (let y = 17; y < 31; y++) {
      const win = x >= 7 && x < 17 && (y < 25 || Math.hypot(x + 0.5 - 12, y - 25) < 5);
      if (!win && (x % 2 === 0 || (y - 17) % 4 === 0)) m.set(x, y, 2, BRASS);
    }
    m.box(0, 27, 3, 24, 7, 1, '#1a1a1a'); label(m, 'STAMPS', 12, 28, 3, '#e8d090', { align: 'center' });
    // counter-top: scale, stamps, sponge, ink pad & canceller
    m.box(3, 17, 4, 4, 2, 3, ENAMEL); m.box(3, 19, 4, 4, 1, 3, CHROME); m.box(4, 18, 7, 2, 1, 1, '#f4f0e6');
    m.box(9, 17, 6, 4, 1, 3, '#d86a6a'); m.box(10, 17, 6, 1, 1, 3, '#f4f0e6'); m.box(13, 17, 7, 2, 1, 2, '#6a8ad0');
    m.box(17, 17, 6, 2, 1, 2, '#3a5a8a'); m.set(18, 18, 6, '#e8d890');                                            // sponge cup
    m.box(19, 17, 3, 3, 1, 2, '#1a1a1a'); m.box(20, 18, 2, 1, 2, 1, WALNUT); m.set(20, 17, 2, '#1a1a1a');       // ink pad & canceller
  },
});

// Post-office sorting case, back at z=0 (1.5 x 2.0 m): oak table base with a tall rack of 8 x 7
// pigeonholes, route labels, letters and postcards in many of the holes, a bundle waiting on the table.
defineProp('mail_sorting_rack', {
  size: [24, 33, 9], origin: [12, 0, 0], collide: [1.5, 2.05, 0.56],
  build(m) {
    const oak = '#9a7048', oakD = '#7a5434';
    legs(m, 0, 0, 0, 24, 9, 13, oakD); m.box(0, 13, 0, 24, 1, 9, oak); m.box(1, 4, 1, 22, 1, 7, oakD);
    m.box(0, 14, 0, 24, 19, 1, oakD); m.box(0, 14, 0, 1, 19, 6, oak); m.box(23, 14, 0, 1, 19, 6, oak); m.box(0, 32, 0, 24, 1, 6, oak);
    for (let y = 14; y < 32; y += 2.5) m.box(1, Math.round(y), 0, 22, 1, 6, oak);
    for (let x = 1; x < 23; x += 2.75) m.box(Math.round(x), 14, 0, 1, 18, 6, oak);
    let k = 0;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) {
      const x = 2 + Math.round(c * 2.75), y = 15 + Math.round(r * 2.5);
      if ((k * 5 + r) % 3 !== 0) m.box(x, y, 1, 1, 1, 4, (k % 4) === 0 ? '#e8e0c0' : '#f4f0e6');
      if (k % 5 === 2) m.set(x + 1, y, 3, '#d8c890');
      m.set(x, y - 1, 5, '#f4f0e6');                          // route label on the shelf lip
      k++;
    }
    m.box(3, 14, 5, 4, 1, 3, '#f4f0e6'); m.box(3, 15, 5, 4, 1, 3, '#e8e0c8'); m.box(5, 14, 5, 1, 2, 3, '#c8a870');   // bundle
    m.box(14, 14, 6, 5, 1, 2, '#8a6a48');
  },
});

// Wall of brass post-office boxes, back at z=0, 1/32 m voxels (1.25 x 1.3 m): 6 x 8 lock-boxes with
// bevelled brass doors, dark glass windows, tiny combination dials and numbers, in an oak surround.
defineProp('po_boxes', {
  size: [42, 42, 3], scale: 1 / 32, origin: [21, 0, 0],
  build(m) {
    const oak = '#7a5030', br = '#b8903a', brL = '#d8b458', brD = '#86662a';
    m.box(0, 0, 0, 42, 42, 1, oak); m.box(0, 0, 1, 42, 2, 2, oak); m.box(0, 40, 1, 42, 2, 2, oak); m.box(0, 0, 1, 2, 42, 2, oak); m.box(40, 0, 1, 2, 42, 2, oak);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) {
      const x = 2 + c * 6.33, y = 2 + r * 4.75, xi = Math.round(x), yi = Math.round(y);
      m.box(xi, yi, 1, 6, 5, 1, brD); m.box(xi + 1, yi + 1, 1, 5, 4, 1, br); m.box(xi + 1, yi + 4, 1, 5, 1, 1, brL);
      m.box(xi + 1, yi + 2, 2, 2, 2, 1, '#1a1c20');           // window
      m.set(xi + 4, yi + 2, 2, brL);                           // dial
      if ((r + c) % 3 === 0) m.set(xi + 1, yi + 1, 2, '#f4f0e6');   // mail showing
    }
  },
});

// =====================================================================================================
// WORKSHOP & WALL EXTRAS (used by the building generators)
// =====================================================================================================

// Garage / woodshop workbench, 1.6 m x 0.65 m, top at 0.9 m; the worker stands at +z. Thick maple top
// on a stout frame with a lower shelf (paint cans, a toolbox), an iron vise on the front-right corner,
// a pegged backboard with a saw, square and chisels; on the top a claw hammer, a hand plane with
// shavings, a coffee can of nails and an oil can.
defineProp('workbench', {
  size: [26, 22, 11], collide: [1.62, 0.95, 0.7],
  build(m) {
    const fr = '#7a5a3a', frD = '#5e4228', top = '#c09a68', topD = '#a07c4e', ir = '#3a3e42';
    legs(m, 0, 0, 1, 26, 10, 13, fr, 2);
    m.box(1, 3, 2, 24, 1, 8, frD); m.box(2, 11, 1, 22, 2, 1, fr); m.box(2, 11, 10, 22, 2, 1, fr);   // shelf & aprons
    m.box(0, 13, 0, 26, 2, 11, top); m.box(0, 14, 10, 26, 1, 1, topD);
    for (const x of [6, 13]) m.box(x, 14, 10, 1, 1, 1, topD);                         // board seams on the front edge
    m.box(0, 15, 0, 26, 7, 1, frD);                                                    // pegged backboard
    // on the backboard: saw, square, chisels
    m.box(2, 17, 1, 7, 3, 1, '#b8c0c8'); m.box(9, 17, 1, 2, 3, 1, OAK); m.box(2, 17, 1, 7, 1, 1, '#8a9298');
    m.box(13, 16, 1, 1, 5, 1, '#c8ccd0'); m.box(13, 20, 1, 4, 1, 1, '#c8ccd0');
    for (const x of [19, 21, 23]) { m.box(x, 16, 1, 1, 2, 1, '#9aa0a6'); m.box(x, 18, 1, 1, 2, 1, x === 21 ? '#c8302a' : WOOD_L); }
    // vise at the front right
    m.box(19, 11, 10, 5, 2, 1, ir); m.box(19, 13, 10, 5, 3, 1, ir); m.box(20, 15, 9, 3, 1, 1, ir);
    m.box(21, 12, 11 - 1, 1, 1, 1, CHROME_D); m.box(19, 12, 10, 1, 1, 1, CHROME_D);
    // tools on the top
    m.box(3, 15, 6, 5, 1, 1, WOOD_L); m.box(7, 15, 5, 1, 2, 3, '#5a5e62');              // claw hammer
    m.box(10, 15, 4, 4, 2, 2, '#3a4a6a'); m.box(11, 17, 4, 2, 1, 2, '#6a4a2a');          // hand plane
    for (const [x, z] of [[14, 6], [15, 4], [9, 7]]) m.set(x, 15, z, '#e8d0a0');       // shavings
    m.box(15, 15, 7, 2, 2, 2, '#c8302a'); m.set(15, 17, 7, '#8a9096'); m.set(16, 17, 8, '#8a9096');   // can of nails
    m.box(4, 15, 2, 2, 2, 2, '#b8a038'); m.set(5, 17, 2, '#b8a038'); m.set(6, 17, 2, '#8a8a8a');     // oil can
    // lower shelf: paint cans & a red toolbox
    m.box(2, 4, 3, 2, 3, 2, '#e8e0cc'); m.box(2, 5, 4, 2, 1, 1, '#2a5ab0'); m.box(5, 4, 3, 2, 3, 2, '#e8e0cc'); m.box(5, 5, 4, 2, 1, 1, '#3a8a4a');
    m.box(14, 4, 3, 7, 3, 5, '#b8202a'); m.box(14, 7, 5, 7, 1, 1, '#8a1818'); m.box(16, 8, 5, 3, 1, 1, CHROME_D);
  },
});

// 1953 promotional wall calendar, back at z=0, 1/32 m voxels (0.56 x 0.95 m) hung from a nail: a harbour
// painting (sunset sky, lighthouse, schooner), the "JUNIPER BAY" fuel-merchant's strip, "SEPT" and the
// month grid with Saturday the 26th ringed in red. Origin = bottom-centre of the back.
defineProp('calendar_wall', {
  size: [18, 31, 2], scale: 1 / 32, origin: [9, 0, 0],
  build(m) {
    const pap = '#f4efe2';
    m.box(0, 0, 0, 18, 29, 1, pap);
    // painting
    const sky = ['#f0c078', '#f0b070', '#e8a070', '#c890a0', '#8aa0c8', '#7a98c8'];
    for (let y = 22; y < 28; y++) m.box(1, y, 1, 16, 1, 1, sky[y - 22]);
    m.box(1, 18, 1, 16, 4, 1, '#2a4a7a'); m.box(1, 21, 1, 16, 1, 1, '#4a6a9a');
    m.box(12, 23, 1, 2, 2, 1, '#f8e090');                                             // sun
    m.box(3, 21, 1, 3, 1, 1, '#5a6a5a'); m.box(3, 22, 1, 2, 5, 1, '#f4f0e6'); m.set(3, 23, 1, '#c8202a'); m.set(4, 25, 1, '#c8202a'); m.set(3, 27, 1, { c: '#fff4c0', emit: 0.4 });   // lighthouse
    m.box(9, 20, 1, 5, 1, 1, '#3a2a1a'); m.box(10, 21, 1, 1, 5, 1, '#f4f0e6'); m.box(11, 22, 1, 1, 3, 1, '#f4f0e6'); m.box(12, 21, 1, 1, 3, 1, '#e8e4d8');   // schooner
    // merchant's strip & month
    m.box(0, 16, 1, 18, 2, 1, '#b8202a');
    for (let x = 2; x < 16; x += 2) m.set(x, 16, 1, '#f4f0e6');
    m.text('SEPT', 9, 10, 1, '#1a2a4a', { font: 'small', align: 'center' });
    // month grid: Sept 1953 starts on a Tuesday; Saturday column last
    let day = 1;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
      if ((r === 0 && c < 2) || day > 30) continue;
      const x = 2 + c * 2, y = 8 - r * 2;
      m.set(x, y, 1, c === 0 ? '#b8202a' : '#4a4a4a');
      if (day === 26) { m.set(x - 1, y, 1, '#d82020'); m.set(x + 1, y, 1, '#d82020'); m.set(x, y + 1, 1, '#d82020'); m.set(x, y - 1, 1, '#d82020'); }
      day++;
    }
    m.box(8, 29, 0, 2, 1, 1, '#f4f0e6'); m.set(8.5, 30, 0, '#5a5a5a');                 // hanging loop & nail
  },
});

// Brass ship's-style wall barometer on a mahogany backplate, back at z=0, 1/32 m voxels (0.45 x 0.7 m):
// round brass case with a silvered dial, arc of scale ticks, weather sectors (blue RAIN / gold FAIR),
// a black pointer and a brass set hand, with a matching brass thermometer below.
defineProp('barometer', {
  size: [14, 22, 4], scale: 1 / 32, origin: [7, 0, 0],
  build(m) {
    const mah = MAHOG, mahD = MAHOG_D;
    // shield-shaped backplate
    for (let y = 0; y < 22; y++) { const w = y > 18 ? 12 - (y - 18) * 2 : y < 3 ? 8 + y * 2 : 14; m.box(7 - w / 2, y, 0, w, 1, 1, y % 7 === 0 ? mahD : mah); }
    // barometer case, centre (7, 14)
    for (let y = 7; y < 22; y++) for (let x = 0; x < 14; x++) {
      const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 14.5);
      if (d > 6.2) continue;
      if (d > 5.2) { m.box(x, y, 1, 1, 1, 2, BRASS); m.set(x, y, 3, d > 5.8 ? BRASS_D : BRASS_L); }
      else m.set(x, y, 2, '#eeeae0');
    }
    for (let a = 0; a <= 12; a++) {                            // scale arc & sectors
      const t = Math.PI * (1.15 - a * 0.1917), x = Math.floor(7 + Math.cos(t) * 4.3), y = Math.floor(14.5 + Math.sin(t) * 4.3);
      m.set(x, y, 3, a < 4 ? '#3a5aa0' : a > 8 ? '#c8a030' : '#2a2a2a');
    }
    m.set(7, 14, 3, BRASS_D); m.set(8, 15, 3, '#1a1a1a'); m.set(9, 16, 3, '#1a1a1a'); m.set(10, 17, 3, '#1a1a1a');   // pointer toward FAIR
    m.set(6, 15, 3, BRASS); m.set(5, 16, 3, BRASS);                                  // set hand
    // thermometer below
    m.box(5, 2, 1, 4, 5, 1, BRASS); m.box(6, 2, 2, 2, 5, 1, '#eeeae0'); m.box(6.5, 3, 3, 1, 3, 1, '#c8202a'); m.set(6.5, 2, 3, '#c8202a');
    m.box(6, 21, 1, 2, 1, 1, BRASS_D);                                                // hanging ring
  },
});
