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
