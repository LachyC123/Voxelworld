// Prop definitions: hats (worn on heads, tinted) and hand-held items.
// Hats: origin at the top-centre of the head (the model sits on y=0), front faces +z. Head is ~0.36 m wide (≈6 voxels).
//   Scale 1/16. y=0 is 0.02 m below the head top; the head spans x ±2.9, z ±2.7 voxels and goes down to y≈-5.1.
//   Some hats (knit cap, sou'wester, headscarf, veil, straps) reach below y=0 via origin[1] > 0.
// Held items: origin at the hand (the end of the right arm, see Characters.update); the item hangs/extends in -y
//   (down the forearm) and +z (forward) in the ARM frame. Most held items are authored upright in "world"
//   orientation (y up, z = the holder's forward, x = the holder's left) and then pre-rotated for the arm pose of
//   the activity that uses them (see defineHeld + pose()), so they read correctly in that pose.
import { defineProp } from '../props.js';
import { VoxModel } from '../voxModel.js';

const T1 = (s = 0.5) => ({ tint: 1, shade: s });
const T2 = (s = 0.5) => ({ tint: 2, shade: s });

defineProp('hat_fedora', {
  size: [10, 5, 10], origin: [5, 0, 5], cat: 'exterior',
  build(m) {
    const c = { tint: 1, shade: 0.5 }, band = { tint: 2, shade: 0.5 };
    m.box(0, 0, 0, 10, 1, 10, c);
    m.box(2, 1, 2, 6, 3, 6, c); m.box(3, 4, 3, 4, 1, 4, c);
    m.box(2, 1, 2, 6, 1, 6, band); m.box(4, 4, 3, 2, 1, 4, { tint: 1, shade: 0.4 });
  },
});

// ------------------------------------------------------------------ small helpers
// filled ellipse layer (voxel centres inside (dx/rx)^2+(dz/rz)^2<=1)
function oval(m, cx, y, cz, rx, rz, col, h = 1) {
  for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz;
    if (dx * dx + dz * dz <= 1) for (let yy = y; yy < y + h; yy++) m.set(x, yy, z, col);
  }
}
// ring = disc r minus disc r2 (only sets voxels between the radii)
function ring(m, cx, y, cz, r, r2, col, h = 1) {
  for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
    if (d <= r && d > r2) for (let yy = y; yy < y + h; yy++) m.set(x, yy, z, col);
  }
}
// recolour existing voxels of a layer that lie on the outer rim (have an empty 4-neighbour)
function rimColour(m, y, col) {
  const out = [];
  for (let z = 0; z < m.sz; z++) for (let x = 0; x < m.sx; x++) {
    if (!m.get(x, y, z)) continue;
    if (!m.get(x - 1, y, z) || !m.get(x + 1, y, z) || !m.get(x, y, z - 1) || !m.get(x, y, z + 1)) out.push([x, z]);
  }
  for (const [x, z] of out) m.set(x, y, z, col);
}
// 3D line of voxels
function line(m, x0, y0, z0, x1, y1, z1, col) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 2));
  for (let i = 0; i <= n; i++) { const t = i / n; m.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, col); }
}

// ------------------------------------------------------------------ hats (scale 1/16)
function hat(name, size, origin, build, scale) { defineProp(name, { size, origin, scale, cat: 'exterior', build }); }

hat('hat_homburg', [10, 5, 10], [5, 0, 5], (m) => {
  const c = T1(0.5), edge = T1(0.36), band = T2(0.5);
  m.cyl(5, 0, 5, 4.9, 1, edge); m.cyl(5, 0, 5, 3.95, 1, c);
  for (let z = 3; z <= 6; z++) { m.set(0, 1, z, edge); m.set(9, 1, z, edge); } // curled sides
  m.set(1, 1, 3, edge); m.set(1, 1, 6, edge); m.set(8, 1, 3, edge); m.set(8, 1, 6, edge);
  m.cyl(5, 1, 5, 3.2, 3, c);
  m.cyl(5, 1, 5, 3.2, 1, band); m.set(8, 1, 4, T2(0.4)); // band + side bow
  m.box(3, 4, 2, 4, 1, 6, c); m.box(4, 4, 2, 2, 1, 6, T1(0.38)); // gutter crease front to back
});

hat('hat_trilby', [8, 4, 9], [4, 0, 4], (m) => {
  const c = T1(0.5), d = T1(0.4), band = T2(0.5);
  m.box(0, 0, 1, 8, 1, 7, c); m.box(1, 0, 8, 6, 1, 1, c); m.box(1, 0, 0, 6, 1, 1, c); // brim (snapped down front)
  m.box(1, 1, 0, 6, 1, 1, d); // back of brim turned up
  m.box(1, 1, 1, 6, 2, 6, c); m.clear(1, 1, 1, 1, 2, 1); m.clear(6, 1, 1, 1, 2, 1); m.clear(1, 1, 6, 1, 2, 1); m.clear(6, 1, 6, 1, 2, 1);
  m.box(1, 1, 1, 6, 1, 6, band); m.clear(1, 1, 1, 1, 1, 1); m.clear(6, 1, 1, 1, 1, 1); m.clear(1, 1, 6, 1, 1, 1); m.clear(6, 1, 6, 1, 1, 1);
  m.box(2, 3, 1, 4, 1, 5, c); m.box(3, 3, 2, 2, 1, 4, d); m.clear(2, 3, 5, 1, 1, 1); m.clear(5, 3, 5, 1, 1, 1); // teardrop crown, pinched front
});

hat('hat_boater', [10, 3, 10], [5, 0, 5], (m) => {
  const straw = '#dcc27a', dark = '#c2a45a', edge = '#b0924c';
  m.cyl(5, 0, 5, 4.9, 1, edge); m.cyl(5, 0, 5, 4.2, 1, straw); ring(m, 5, 0, 5, 3.9, 3.2, dark);
  m.cyl(5, 1, 5, 3.2, 1, T2(0.5));
  m.cyl(5, 2, 5, 3.2, 1, straw); m.cyl(5, 2, 5, 1.6, 1, dark);
});

hat('hat_bowler', [9, 5, 9], [4.5, 0, 4.5], (m) => {
  const c = T1(0.5), edge = T1(0.38);
  m.cyl(4.5, 0, 4.5, 4.6, 1, edge); m.cyl(4.5, 0, 4.5, 3.7, 1, c);
  m.cyl(4.5, 1, 4.5, 3.62, 1, T2(0.5)); m.cyl(4.5, 2, 4.5, 3.2, 1, c); m.cyl(4.5, 3, 4.5, 2.3, 1, c); m.cyl(4.5, 4, 4.5, 1.2, 1, c);
  m.set(3, 3, 6, T1(0.6)); m.set(2, 2, 7, T1(0.6)); m.set(4, 4, 5, T1(0.58));
});

hat('hat_top', [10, 7, 10], [5, 0, 5], (m) => {
  const c = T1(0.5), edge = T1(0.36), sheen = T1(0.64);
  m.cyl(5, 0, 5, 4.9, 1, edge); m.cyl(5, 0, 5, 3.95, 1, c);
  for (let z = 3; z <= 6; z++) { m.set(0, 1, z, edge); m.set(9, 1, z, edge); }
  m.cyl(5, 1, 5, 3.2, 5, c);
  m.cyl(5, 1, 5, 3.2, 1, T2(0.5));
  m.cyl(5, 6, 5, 3.2, 1, T1(0.44));
  for (let y = 2; y <= 5; y++) { m.set(3, y, 7, sheen); m.set(7, y, 3, sheen); }
});

hat('hat_cap', [8, 3, 9], [4, 0, 3], (m) => {
  const c = T1(0.5), peak = T1(0.42);
  m.box(1, 0, 0, 6, 2, 6, c);
  m.clear(1, 1, 0, 1, 1, 1); m.clear(6, 1, 0, 1, 1, 1); m.clear(1, 1, 5, 1, 1, 1); m.clear(6, 1, 5, 1, 1, 1);
  m.box(2, 2, 1, 4, 1, 4, c); m.box(3, 2, 2, 2, 1, 2, T1(0.46));
  m.box(1, 0, 6, 6, 1, 2, peak); m.box(2, 0, 8, 4, 1, 1, peak);
  m.box(3, 1, 5, 2, 1, 1, T2(0.5)); // badge / logo patch
});

hat('hat_flatcap', [8, 2, 9], [4, 0, 3], (m) => {
  const a = T1(0.46), b = T1(0.55);
  m.box(1, 0, 0, 6, 1, 8, T1(0.5));
  for (let x = 1; x <= 6; x++) m.box(x, 1, 0, 1, 1, 6, (x & 1) ? a : b);
  m.clear(1, 1, 0, 1, 1, 1); m.clear(6, 1, 0, 1, 1, 1);
  m.box(2, 0, 8, 4, 1, 1, T1(0.38));
  m.box(3, 1, 5, 2, 1, 1, T1(0.4)); // button snap
});

hat('hat_police', [8, 3, 10], [4, 0, 4], (m) => {
  const band = T1(0.34), top = T1(0.5), visor = '#121214';
  m.cyl(4, 0, 4, 3.2, 2, band);
  m.box(1, 0, 6, 6, 1, 1, '#1a1a1e'); // chin strap across the front
  m.box(1, 0, 7, 6, 1, 1, visor); m.box(2, 0, 8, 4, 1, 1, visor);
  m.cyl(4, 2, 4, 4.1, 1, top); rimColour(m, 2, T1(0.44));
  m.box(3, 1, 7, 2, 1, 1, T2(0.5)); m.set(3, 2, 7, T2(0.5)); m.set(4, 2, 7, T2(0.5)); // badge
});

hat('hat_fire', [9, 7, 11], [4.5, 1, 6.5], (m) => {
  const c = T1(0.5), d = T1(0.38), l = T1(0.6), brass = '#c8a040';
  oval(m, 4.5, 1, 5.5, 4.5, 5.0, c); // brim all round
  m.box(1, 0, 0, 7, 1, 3, c); m.clear(1, 0, 0, 1, 1, 1); m.clear(7, 0, 0, 1, 1, 1); m.clear(1, 1, 0, 7, 1, 2); // long back brim sloping down
  rimColour(m, 1, d);
  m.box(1, 0, 0, 7, 1, 1, d);
  oval(m, 4.5, 2, 6.5, 3.5, 3.5, c); oval(m, 4.5, 3, 6.5, 2.6, 2.6, c); oval(m, 4.5, 4, 6.5, 1.6, 1.6, l);
  for (let y = 2; y <= 4; y++) for (let k = 0; k < 11; k++) { if (m.get(4, y, k)) m.set(4, y, k, d); if (m.get(k, y, 6)) m.set(k, y, 6, d); } // ribs
  m.box(4, 5, 5, 1, 1, 3, d); // comb
  m.box(3, 2, 10, 3, 3, 1, T2(0.5)); m.set(4, 5, 10, T2(0.5)); m.set(2, 3, 10, T2(0.44)); m.set(6, 3, 10, T2(0.44)); // front shield
  m.set(4, 3, 10, T1(0.3)); // company number
  m.box(4, 5, 9, 1, 1, 1, brass); m.set(4, 6, 9, brass); // eagle
});

hat('hat_chef', [8, 8, 8], [4, 0, 4], (m) => {
  const w = '#f6f4ee', s = '#e2dfd6';
  m.cyl(4, 0, 4, 3.2, 3, w);
  for (let y = 1; y < 3; y++) for (let z = 0; z < 8; z++) for (let x = 0; x < 8; x++) if (m.get(x, y, z) && ((x + z) & 1) && (!m.get(x - 1, y, z) || !m.get(x + 1, y, z) || !m.get(x, y, z - 1) || !m.get(x, y, z + 1))) m.set(x, y, z, s);
  m.cyl(4, 3, 4, 3.7, 1, s); m.cyl(4, 4, 4, 3.95, 2, w); m.cyl(4, 6, 4, 3.2, 1, w); m.cyl(4, 7, 4, 2.2, 1, w);
  for (let y = 4; y <= 5; y++) { m.set(0, y, 3, s); m.set(7, y, 4, s); m.set(3, y, 7, s); m.set(4, y, 0, s); }
});

hat('hat_nurse', [7, 3, 6], [3.5, 0, 3], (m) => {
  const w = '#f7f5ef', s = '#dedbd2';
  m.box(1, 0, 0, 5, 1, 5, w);
  m.box(0, 0, 4, 7, 2, 1, w); m.box(0, 2, 4, 7, 1, 1, '#1c1c20'); // folded cuff with black stripe
  m.box(1, 1, 0, 5, 1, 2, s); m.box(2, 1, 2, 3, 1, 1, w);
});

hat('hat_sailor', [8, 3, 8], [4, 0, 4], (m) => {
  const w = '#f6f4ee', s = '#e2dfd6';
  m.cyl(4, 0, 4, 3.95, 2, w);
  ring(m, 4, 2, 4, 3.95, 2.9, w); rimColour(m, 2, s);
  m.cyl(4, 1, 4, 2.2, 1, '#eceae2');
});

hat('hat_knit', [7, 4, 7], [3.5, 1, 3.5], (m) => {
  const a = T1(0.5), b = T1(0.42);
  m.cyl(3.5, 0, 3.5, 3.62, 2, a);
  for (let y = 0; y < 2; y++) for (let z = 0; z < 7; z++) for (let x = 0; x < 7; x++) if (m.get(x, y, z) && ((x + z) & 1)) m.set(x, y, z, b); // ribbed cuff
  m.cyl(3.5, 2, 3.5, 3.2, 1, T1(0.55)); m.cyl(3.5, 3, 3.5, 2.2, 1, T1(0.55));
  m.set(3, 3, 3, T1(0.46));
});

hat('hat_sou', [9, 5, 11], [4.5, 2, 5.5], (m) => {
  const y = '#e8c232', d = '#c9a324', s = '#d8b42c';
  oval(m, 4.5, 2, 6, 4.5, 4.6, y); // brim + crown base
  m.box(0, 1, 1, 9, 1, 5, y); m.clear(0, 1, 1, 1, 1, 1); m.clear(8, 1, 1, 1, 1, 1); // back & sides drooping
  m.box(1, 0, 0, 7, 1, 2, y); m.clear(1, 0, 0, 1, 1, 1); m.clear(7, 0, 0, 1, 1, 1);
  m.box(1, 0, 0, 7, 1, 1, d); rimColour(m, 2, d);
  m.box(0, 1, 1, 1, 1, 5, d); m.box(8, 1, 1, 1, 1, 5, d);
  oval(m, 4.5, 3, 5.5, 3.1, 3.2, y); oval(m, 4.5, 4, 5.5, 2.0, 2.1, y);
  for (let z = 3; z <= 8; z++) m.set(4, 3, z, s);
  m.box(4, 4, 4, 1, 1, 3, s);
});

hat('hat_band', [8, 12, 9], [4, 0, 4], (m) => {
  const c = T1(0.5), gold = '#d9b24a', plume = '#f4f2ee';
  m.cyl(4, 0, 4, 3.2, 4, c); m.cyl(4, 4, 4, 3.7, 2, c); m.cyl(4, 5, 4, 3.7, 1, T1(0.42));
  rimColour(m, 5, gold);
  m.box(1, 0, 7, 6, 1, 1, '#121214'); m.box(2, 0, 8, 4, 1, 1, '#121214'); // visor
  m.box(1, 1, 6, 6, 1, 1, gold); // chin chain
  m.box(3, 2, 7, 2, 3, 1, gold); m.set(3, 3, 7, T1(0.35)); m.set(4, 3, 7, T1(0.35)); // plate
  m.box(3, 6, 5, 2, 1, 2, gold);
  m.box(3, 7, 5, 2, 4, 2, plume); m.box(3, 11, 5, 2, 1, 1, plume); m.set(3, 10, 6, T1(0.55)); m.set(4, 11, 5, T1(0.55));
});

hat('hat_conductor', [8, 3, 10], [4, 0, 4], (m) => {
  const c = T1(0.5), visor = '#121214';
  m.cyl(4, 0, 4, 3.2, 3, c); m.cyl(4, 2, 4, 3.2, 1, T1(0.44));
  m.box(1, 0, 7, 6, 1, 1, visor); m.box(2, 0, 8, 4, 1, 1, visor);
  m.box(1, 0, 6, 6, 1, 1, T2(0.5)); // gold cord
  m.box(2, 1, 7, 4, 1, 1, T2(0.56)); // badge plate
});

hat('hat_bellhop', [9, 10, 9], [4.5, 6, 4.5], (m) => {
  const c = T1(0.5), strap = '#1c1c20';
  m.cyl(4, 6, 4.5, 2.6, 3, c); m.cyl(4, 6, 4.5, 2.6, 1, T2(0.5)); rimColour(m, 8, T2(0.5));
  m.set(3, 9, 4, T2(0.56)); m.cyl(4, 8, 4.5, 1.2, 1, T1(0.56));
  for (let y = 1; y <= 5; y++) { m.set(1, y, 5, strap); m.set(7, y, 5, strap); }
  m.box(1, 0, 5, 7, 1, 1, strap);
});

hat('hat_straw', [12, 5, 12], [6, 1, 6], (m) => {
  const s = '#dcc07a', d = '#c4a560', e = '#b08e4c';
  ring(m, 6, 0, 6, 6, 4.9, e); // drooping outer rim
  m.cyl(6, 1, 6, 4.95, 1, s); ring(m, 6, 1, 6, 4.2, 3.4, d);
  m.cyl(6, 2, 6, 3.2, 2, s); m.cyl(6, 2, 6, 3.2, 1, T2(0.5));
  m.cyl(6, 4, 6, 2.2, 1, s); m.box(5, 4, 4, 2, 1, 4, d);
});

hat('hat_garrison', [4, 3, 7], [3, 0, 3.5], (m) => {
  const c = T1(0.5), d = T1(0.4);
  m.box(0, 0, 0, 4, 2, 7, c); m.box(0, 0, 0, 4, 1, 7, d);
  m.clear(0, 1, 0, 1, 1, 1); m.clear(3, 1, 0, 1, 1, 1); m.clear(0, 1, 6, 1, 1, 1); m.clear(3, 1, 6, 1, 1, 1);
  m.box(1, 2, 1, 2, 1, 5, c); m.box(1, 2, 3, 2, 1, 1, T1(0.44));
  m.set(3, 1, 5, '#c8a040'); // insignia
});

hat('hat_veil', [9, 9, 9], [4.5, 7, 4.5], (m) => {
  const v = '#eeede8', lace = '#f8f7f3', pearl = '#fbfaf5';
  m.box(1, 0, 0, 7, 8, 1, v); m.box(0, 0, 0, 9, 3, 1, v); m.box(1, 3, 0, 7, 5, 1, v);
  for (let x = 0; x < 9; x += 2) m.set(x, 0, 0, lace);
  m.box(1, 7, 0, 7, 1, 3, v); // over the crown of the head
  m.box(2, 7, 3, 5, 1, 3, T1(0.5)); // juliet cap
  m.box(2, 8, 5, 5, 1, 1, T1(0.56)); m.set(2, 8, 5, pearl); m.set(4, 8, 5, pearl); m.set(6, 8, 5, pearl);
  m.set(4, 8, 4, pearl);
});

hat('hat_pillbox', [6, 3, 6], [3, 0, 3.5], (m) => {
  m.cyl(3, 0, 3, 2.6, 2, T1(0.5)); m.cyl(3, 1, 3, 1.6, 1, T1(0.56));
  m.cyl(3, 0, 3, 2.6, 1, T1(0.44));
  m.set(5, 1, 2, T2(0.5)); m.set(5, 2, 2, T2(0.55)); m.set(5, 1, 3, T2(0.45)); // side bow
});

hat('hat_cloche', [7, 4, 7], [3.5, 1, 3.5], (m) => {
  const c = T1(0.5);
  m.cyl(3.5, 0, 3.5, 3.62, 1, T1(0.44)); m.clear(2, 0, 6, 3, 1, 1); // brim turns up in front
  m.cyl(3.5, 1, 3.5, 3.62, 1, T2(0.5)); // ribbon band
  m.cyl(3.5, 2, 3.5, 3.2, 1, c); m.cyl(3.5, 3, 3.5, 2.2, 1, c);
  m.set(6, 1, 2, T2(0.66)); m.set(6, 1, 3, T2(0.4)); m.set(6, 2, 2, T2(0.62)); // bow on the side
});

hat('hat_sunhat', [12, 4, 12], [6, 1, 6], (m) => {
  const c = T1(0.5), e = T1(0.42);
  m.cyl(6, 1, 6, 5.95, 1, c); rimColour(m, 1, e);
  for (const z of [0, 11]) for (let x = 0; x < 12; x++) if (m.get(x, 1, z)) { m.set(x, 0, z, e); m.set(x, 1, z, 0); }
  m.cyl(6, 2, 6, 3.2, 2, c); m.cyl(6, 3, 6, 3.2, 1, T1(0.56));
  m.cyl(6, 2, 6, 3.2, 1, T2(0.5)); // ribbon
  m.set(5, 1, 2, T2(0.45)); m.set(6, 1, 1, T2(0.45)); m.set(5, 0, 0, T2(0.45)); m.set(6, 0, 0, T2(0.45)); // ribbon tails at the back
  const petal = '#ee8a98', petal2 = '#f6c2c8', mid = '#f0d050';
  m.set(9, 2, 7, petal); m.set(9, 3, 7, petal2); m.set(9, 2, 8, petal2); m.set(8, 3, 8, petal); m.set(9, 3, 8, mid);
  m.set(8, 2, 9, '#5a8a3a');
});

hat('hat_party', [13, 25, 11], [6.5, 11, 5.5], (m) => { // 1/32 scale: paper cone, pompom, thin elastic
  const w = '#f4f0e6', el = '#d8d2c4';
  for (let k = 0; k < 6; k++) { const r = 5.3 - k * 0.85; m.cyl(7.5, 11 + k * 2, 5.5, r, k === 5 ? 1 : 2, k & 1 ? w : T1(0.5)); }
  for (const [x, y, z] of [[5, 12, 9], [10, 14, 7], [7, 17, 8], [9, 19, 6]]) if (m.get(x, y, z)) m.set(x, y, z, T1(0.62));
  m.sphere(7.5, 22.8, 5.5, 2.0, '#f0c840');
  for (const x of [0, 12]) { line(m, x, 10, 5, x, 2, 7, el); m.set(x, 1, 7, el); }
  m.box(0, 0, 7, 13, 1, 1, el);
}, 1 / 32);
hat('hat_mortarboard', [9, 4, 9], [4.5, 0, 4.5], (m) => {
  const c = T1(0.5);
  m.cyl(4.5, 0, 4.5, 3.2, 2, c);
  m.box(0, 2, 0, 9, 1, 9, T1(0.44)); rimColour(m, 2, T1(0.36));
  m.set(4, 3, 4, T2(0.5)); m.box(1, 3, 4, 3, 1, 1, T2(0.46));
  m.set(0, 1, 4, T2(0.5)); m.set(0, 0, 4, T2(0.56));
});

hat('hat_beret', [8, 3, 8], [4, 0, 4], (m) => {
  const c = T1(0.5);
  m.cyl(4, 0, 4, 3.2, 1, T1(0.44));
  oval(m, 3.5, 1, 4, 3.9, 3.7, c);
  m.box(0, 0, 2, 1, 1, 4, T1(0.46));
  m.set(3, 2, 4, T1(0.4));
});

hat('hat_headscarf', [8, 8, 8], [4, 6, 4], (m) => {
  const c = T1(0.5), dot = '#f4f0e6', k = T1(0.42);
  m.box(1, 6, 0, 6, 1, 7, c); m.clear(1, 6, 0, 1, 1, 1); m.clear(6, 6, 0, 1, 1, 1);
  m.box(1, 5, 7, 6, 1, 1, c); // over the hairline
  m.box(0, 1, 1, 1, 5, 6, c); m.box(7, 1, 1, 1, 5, 6, c); // sides
  m.box(1, 1, 0, 6, 5, 1, c); // back
  m.box(0, 5, 0, 8, 1, 1, 0); m.box(1, 5, 0, 6, 1, 1, c);
  m.box(0, 1, 6, 1, 1, 1, 0); m.box(7, 1, 6, 1, 1, 1, 0);
  m.box(1, 0, 6, 6, 1, 1, k); m.box(3, 0, 7, 2, 1, 1, k); // tied under the chin
  for (const [x, y, z] of [[2, 6, 1], [5, 6, 3], [3, 6, 5], [0, 4, 2], [0, 2, 4], [7, 4, 4], [7, 2, 2], [2, 3, 0], [5, 4, 0], [3, 1, 0], [6, 6, 6], [1, 6, 4]]) m.set(x, y, z, dot);
});

hat('hat_ribbon_bow', [9, 11, 5], [4.5, 5, 6.5], (m) => { // 1/32 scale, sits on the top-back of the head
  const c = T1(0.5), d = T1(0.38), l = T1(0.62);
  const h = [[1, 4], [0, 5], [0, 4], [1, 3]]; // [y0, y1] per column from the outside in
  for (let i = 0; i < 4; i++) { const [a, b] = h[i]; m.box(i, 5 + a, 2, 1, b - a + 1, 2, c); m.box(8 - i, 5 + a, 2, 1, b - a + 1, 2, c); }
  m.box(1, 7, 3, 2, 1, 1, d); m.box(6, 7, 3, 2, 1, 1, d); m.set(0, 9, 2, l); m.set(8, 9, 2, l); m.set(1, 10, 2, l); m.set(7, 10, 2, l);
  m.box(4, 6, 2, 1, 3, 2, d);
  m.box(3, 2, 0, 1, 4, 1, c); m.box(5, 1, 0, 1, 5, 1, c); m.box(3, 5, 1, 3, 1, 1, c); m.set(3, 2, 0, d); m.set(5, 1, 0, d);
}, 1 / 32);

// ------------------------------------------------------------------ held items
// Rotations are 3x3 row-major matrices; a rotation list is applied in order to item-space vectors.
function rotM(ax, a) {
  const c = Math.cos(a), s = Math.sin(a);
  if (ax === 'x') return [1, 0, 0, 0, c, -s, 0, s, c];
  if (ax === 'y') return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
function mulM(A, B) {
  const C = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
  return C;
}
const apM = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
const trM = (M) => [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]];
function chain(list) { let M = [1, 0, 0, 0, 1, 0, 0, 0, 1]; for (const r of list) M = mulM(r[0] === 'm' ? r[1] : rotM(r[0], r[1]), M); return M; }
// rotation that maps item axis `p` onto direction pv and item axis `s` (as close as possible) onto sv
function basis(p, pv, s, sv) {
  const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const P = nrm(pv), q = nrm(sv), d = P[0] * q[0] + P[1] * q[1] + P[2] * q[2];
  const Q = nrm([q[0] - d * P[0], q[1] - d * P[1], q[2] - d * P[2]]);
  const ax = { [p]: P, [s]: Q };
  if (!ax.x) ax.x = cross(ax.y, ax.z); else if (!ax.y) ax.y = cross(ax.z, ax.x); else ax.z = cross(ax.x, ax.y);
  return ['m', [ax.x[0], ax.y[0], ax.z[0], ax.x[1], ax.y[1], ax.z[1], ax.x[2], ax.y[2], ax.z[2]]];
}
// Arm-frame rotation for a right-arm pose: aRp = arm pitch (+ body lean), aRr = arm roll (from sim/activities.js).
// An item authored upright (y up, z forward) then appears upright when the arm is in that pose.
const pose = (aRp, aRr = 0) => [['x', -aRp], ['z', aRr]];

// defineHeld(name, { scale, pose, anchorPose, at, parts:[{ size, grip, rot, atN, build, ss }] } | single part fields)
//   grip: item voxel coords that land on the hand (after `atN`, natural-frame voxel offset, and `at`, arm-frame offset)
//   rot:  item -> natural (world) tilt list; pose: natural -> arm frame. anchorPose (default = pose) maps atN, so an item
//   can be snapped to a 90° rotation (crisp, few triangles) while its anchor (e.g. a mouthpiece) stays where the pose puts it.
function defineHeld(name, o) {
  const scale = o.scale || 1 / 32;
  const P = chain(o.pose || []), PA = o.anchorPose ? chain(o.anchorPose) : P;
  const at = o.at || [0, 0, 0];
  const parts = (o.parts || [o]).map((p) => {
    const M = mulM(P, chain(p.rot || []));
    const off = apM(PA, p.atN || [0, 0, 0]).map((v, i) => v + at[i]);
    return { size: p.size, grip: p.grip, build: p.build, M, Mi: trM(M), off, ss: p.ss !== false };
  });
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of parts) {
    const [sx, sy, sz] = p.size, g = p.grip;
    for (const cx of [0, sx]) for (const cy of [0, sy]) for (const cz of [0, sz]) {
      const v = apM(p.M, [cx - g[0], cy - g[1], cz - g[2]]);
      for (let i = 0; i < 3; i++) { const w = v[i] + p.off[i]; mn[i] = Math.min(mn[i], w); mx[i] = Math.max(mx[i], w); }
    }
  }
  // align the target grid with the first part's voxel grid (exact copy when it is axis-aligned)
  const c0 = apM(parts[0].M, parts[0].grip.map((g) => -g)).map((v, i) => v + parts[0].off[i]);
  for (let i = 0; i < 3; i++) { const f = c0[i] - Math.floor(c0[i]); mn[i] = Math.floor(mn[i] - f + 1e-6) + f; }
  const size = mx.map((v, i) => Math.max(1, Math.ceil(v - mn[i] - 1e-6)));
  const origin = mn.map((v) => -v);
  defineProp(name, {
    size, origin, scale, cat: 'exterior',
    build(m) {
      const src = parts.map((p) => {
        const s = new VoxModel(p.size[0], p.size[1], p.size[2]);
        p.build(s);
        const map = s.palette.map((e, i) => (i === 0 ? 0 : m.col(e.tint ? { tint: e.tint, shade: e.rgb[0] / 255 } : { c: e.rgb, emit: e.emit })));
        return { s, map };
      });
      // backward sampling (crisp), later parts win
      for (let k = 0; k < size[2]; k++) for (let j = 0; j < size[1]; j++) for (let i = 0; i < size[0]; i++) {
        const w = [i + 0.5 - origin[0], j + 0.5 - origin[1], k + 0.5 - origin[2]];
        for (let pi = parts.length - 1; pi >= 0; pi--) {
          const p = parts[pi];
          const v = apM(p.Mi, [w[0] - p.off[0], w[1] - p.off[1], w[2] - p.off[2]]);
          const c = src[pi].s.get(Math.floor(v[0] + p.grip[0] + 1e-7), Math.floor(v[1] + p.grip[1] + 1e-7), Math.floor(v[2] + p.grip[2] + 1e-7));
          if (c) { m.set(i, j, k, src[pi].map[c]); break; }
        }
      }
      // forward fill (4 sub-samples per voxel along a diagonal) so thin rods/strings stay connected after rotation
      const rotated = (p) => Math.abs(p.M[0]) + Math.abs(p.M[4]) + Math.abs(p.M[8]) < 2.999;
      parts.forEach((p, pi) => {
        const s = src[pi].s, subs = rotated(p) && p.ss ? [0.2, 0.4, 0.6, 0.8] : [0.5];
        for (let y = 0; y < s.sy; y++) for (let z = 0; z < s.sz; z++) for (let x = 0; x < s.sx; x++) {
          const c = s.get(x, y, z); if (!c) continue;
          for (const f of subs) {
            const v = apM(p.M, [x + f - p.grip[0], y + f - p.grip[1], z + (subs.length > 1 ? 1 - f : f) - p.grip[2]]);
            const t = [0, 1, 2].map((a) => Math.floor(v[a] + p.off[a] + origin[a]));
            if (!m.get(t[0], t[1], t[2])) m.set(t[0], t[1], t[2], src[pi].map[c]);
          }
        }
      });
    },
  });
}

// ---- palette
const PAPER = '#e8e3d4', INK = '#8e8a80', INK2 = '#2a2a2a';
const WOOD = '#b08858', WOOD_D = '#8a6440', WOOD_L = '#c8a070';
const STEEL = '#a8adb2', STEEL_D = '#7a7e84', CHROME = '#c8ccd0';
const BRASS = '#d8b04a', BRASS_L = '#f0d070', BRASS_D = '#a8842a';
const BLACK = '#18181a', WHITE = '#f2efe6', GLASS = '#d4e2e6';

// ---- reading (arm frame, no pose rotation: the sheet lies in the arm's x-z plane, i.e. it rises from the
//      hands and leans ~30° away from the reader in 'read'/'read_book'/'sing'; +y faces the reader)
defineHeld('newspaper', {
  size: [18, 1, 13], grip: [4.5, 2, 2],
  build(m) {
    m.box(0, 0, 0, 18, 1, 13, PAPER);
    m.box(8, 0, 0, 2, 1, 13, '#d8d2c0');
    m.box(1, 0, 10, 7, 1, 2, INK2); // headline
    for (const z of [8, 6, 4, 2]) { m.box(1, 0, z, 3, 1, 1, INK); m.box(5, 0, z, 3, 1, 1, INK); }
    m.box(11, 0, 6, 5, 1, 5, '#6e6c66'); m.box(12, 0, 7, 3, 1, 3, '#8e8a80'); // photo
    for (const z of [4, 2]) m.box(11, 0, z, 6, 1, 1, INK);
    m.box(11, 0, 11, 6, 1, 1, INK2);
  },
});

defineHeld('book', {
  size: [10, 3, 7], grip: [1, 1, 2],
  build(m) {
    const cover = '#7a2a2a', page = '#efe8d6', text = '#a8a090';
    m.box(2, 0, 0, 6, 1, 7, cover); m.box(0, 1, 0, 2, 1, 7, cover); m.box(8, 1, 0, 2, 1, 7, cover);
    m.box(4, 0, 0, 2, 1, 7, '#5a1e1e');
    m.box(2, 1, 0, 6, 1, 7, page); m.box(0, 2, 0, 2, 1, 7, page); m.box(8, 2, 0, 2, 1, 7, page);
    m.box(4, 1, 0, 2, 1, 7, '#d8d0bc');
    for (const z of [1, 3, 5]) { m.box(2, 1, z, 2, 1, 1, text); m.box(6, 1, z, 2, 1, 1, text); m.set(1, 2, z, text); m.set(8, 2, z, text); }
  },
});

defineHeld('hymnal', {
  size: [7, 3, 7], grip: [0.5, 1, 3],
  build(m) {
    const cover = '#1c1c20', page = '#efe8d6', text = '#a8a090';
    m.box(1, 0, 2, 5, 1, 5, cover); m.box(0, 1, 2, 1, 1, 5, cover); m.box(6, 1, 2, 1, 1, 5, cover);
    m.box(1, 1, 2, 5, 1, 5, page); m.box(3, 1, 2, 1, 1, 5, '#d8d0bc');
    m.box(0, 2, 2, 1, 1, 5, page); m.box(6, 2, 2, 1, 1, 5, page);
    for (const z of [3, 5]) { m.box(1, 1, z, 2, 1, 1, text); m.box(4, 1, z, 2, 1, 1, text); }
    m.box(3, 1, 0, 1, 1, 2, '#a02030'); // ribbon marker
    m.set(3, 0, 6, '#c8a040'); // gilt cross on the cover
  },
});

// ---- drinks
defineHeld('coffee_cup', {
  pose: pose(-0.85), at: [0, -1.5, 0], size: [7, 5, 7], grip: [1, 2.5, 3.5],
  build(m) {
    const china = '#f2efe6', stripe = '#4a7a5a';
    m.cyl(4, 0, 3.5, 2.6, 1, '#e4e0d4'); m.cyl(4, 0, 3.5, 1.6, 1, china);
    m.box(3, 1, 2, 3, 3, 3, china); m.box(3, 2, 2, 3, 1, 3, stripe);
    m.set(4, 3, 3, '#3a2414');
    m.set(2, 2, 3, china); m.set(2, 3, 3, china); m.set(1, 3, 3, china); m.set(1, 2, 3, china);
  },
});

defineHeld('glass_wine', {
  pose: pose(-2.5, 0.1), at: [0, -1, 0], size: [3, 8, 3], grip: [1.5, 2.5, 1.5],
  build(m) {
    const wine = '#7a1428';
    m.box(0, 0, 0, 3, 1, 3, GLASS); m.box(1, 1, 1, 1, 3, 1, GLASS);
    m.set(1, 4, 1, wine); m.box(0, 5, 0, 3, 2, 3, wine);
    m.box(0, 6, 0, 3, 2, 3, GLASS); m.clear(1, 7, 1, 1, 1, 1); m.set(1, 6, 1, wine);
  },
});

// ---- conductor, kitchen, cleaning, garden
defineHeld('baton', {
  pose: pose(-1.7, 0.35), at: [0, -1, 0], rot: [['x', -0.45]], size: [1, 1, 14], grip: [0.5, 0.5, 1],
  build(m) { m.box(0, 0, 0, 1, 1, 2, '#c8a070'); m.box(0, 0, 2, 1, 1, 12, '#f6f4ee'); },
});

defineHeld('spoon', {
  pose: pose(-0.87, -0.15), at: [0, -1, 0], rot: [['x', -0.25]], size: [2, 12, 1], grip: [0.5, 9, 0.5],
  build(m) { m.box(0, 0, 0, 2, 3, 1, '#b8894e'); m.set(0, 0, 0, 0); m.box(0, 3, 0, 1, 9, 1, '#c89a60'); },
});

defineHeld('broom', {
  at: [0, -1, 0], size: [10, 43, 2], grip: [4.5, 30, 0.5],
  build(m) {
    const straw = '#d8b45a', straw2 = '#c49c46', band = '#a8342a';
    for (let y = 0; y < 12; y++) { const w = y < 6 ? 10 : 10 - (y - 5); const x0 = Math.floor((10 - w) / 2); m.box(x0, y, 0, w, 1, 2, y === 0 ? straw2 : straw); }
    m.box(1, 7, 0, 8, 1, 2, band); m.box(2, 9, 0, 6, 1, 2, band);
    m.box(4, 12, 0, 1, 31, 1, '#b8483a'); m.box(4, 12, 0, 1, 2, 1, WOOD_D); m.set(4, 42, 0, BLACK);
  },
});

defineHeld('mop', {
  at: [0, -1, 0], size: [8, 38, 6], grip: [3.5, 29, 2.5],
  build(m) {
    const a = '#e2ddcf', b = '#c6bfae';
    for (let x = 0; x < 8; x++) for (let z = 0; z < 6; z++) { const h = 5 + ((x * 3 + z * 5) % 3 === 0 ? 1 : 0); m.box(x, 0, z, 1, h, 1, (x + z) & 1 ? a : b); }
    m.clear(0, 0, 0, 1, 6, 1); m.clear(7, 0, 0, 1, 6, 1); m.clear(0, 0, 5, 1, 6, 1); m.clear(7, 0, 5, 1, 6, 1);
    m.box(2, 6, 1, 4, 2, 4, '#8a8e92');
    m.box(3, 8, 2, 1, 30, 1, WOOD);
  },
});

defineHeld('rake', {
  at: [0, -1, 0], size: [15, 40, 2], grip: [7.5, 30, 0.5],
  build(m) {
    const bam = '#c8a860', tine = '#a88848';
    for (let i = 0; i <= 7; i++) line(m, 7.5, 11.5, 0.5, 0.5 + i * 2, 0.5, 0.5, tine);
    for (let i = 0; i <= 7; i++) m.set(i * 2, 0, 1, tine);
    m.box(2, 5, 0, 11, 1, 1, '#a83a2a');
    m.box(7, 11, 0, 1, 29, 1, bam); m.box(7, 11, 0, 1, 2, 1, '#8a6a3a');
  },
});

defineHeld('shovel', {
  at: [0, -1, 0], size: [6, 41, 2], grip: [2.5, 34, 0.5],
  build(m) {
    m.box(1, 0, 0, 4, 1, 1, STEEL_D); m.box(0, 1, 0, 6, 8, 1, STEEL); m.box(0, 2, 1, 1, 7, 1, STEEL_D); m.box(5, 2, 1, 1, 7, 1, STEEL_D);
    m.box(2, 0, 0, 2, 1, 1, STEEL);
    m.box(2, 9, 0, 2, 2, 1, '#4a4a4e');
    m.box(2, 11, 0, 1, 26, 1, WOOD);
    m.box(1, 37, 0, 1, 3, 1, WOOD_D); m.box(3, 37, 0, 1, 3, 1, WOOD_D); m.box(1, 40, 0, 3, 1, 1, WOOD_D); // D-grip
  },
});

defineHeld('watering_can', {
  pose: [['x', Math.PI / 2]], at: [0, -1, 0], size: [7, 10, 14], grip: [3.5, 9.5, 3.5], // snapped: tipped ~30° to pour in 'water_plants'
  build(m) {
    const g = '#a8adb0', d = '#8a9094';
    m.cyl(3.5, 0, 3.5, 3.6, 7, g); m.cyl(3.5, 0, 3.5, 3.6, 1, d); m.cyl(3.5, 6, 3.5, 3.6, 1, d);
    m.cyl(3.5, 6, 3.5, 2.2, 1, '#5a6064');
    m.box(3, 7, 1, 1, 2, 1, d); m.box(3, 7, 5, 1, 2, 1, d); m.box(3, 9, 1, 1, 1, 5, d); // top handle
    line(m, 3.5, 2.5, 6.5, 3.5, 7.5, 11.5, g);
    m.box(2, 7, 11, 3, 3, 2, d); m.box(3, 8, 13, 1, 1, 1, '#6a7074'); // rose
  },
});

defineHeld('trowel', {
  pose: pose(-0.55, 0.06), at: [0, -1, 0], rot: [['x', -0.4]], size: [3, 12, 2], grip: [1.5, 9, 0.5],
  build(m) {
    m.set(1, 0, 0, STEEL); m.box(0, 1, 0, 3, 4, 1, STEEL); m.box(1, 1, 0, 1, 4, 1, STEEL_D);
    m.box(1, 5, 0, 1, 1, 1, STEEL_D); m.box(1, 6, 1, 1, 1, 1, STEEL_D);
    m.box(1, 7, 0, 1, 5, 1, '#a8402a');
  },
});

// ---- service & trades
defineHeld('tray', { // 'serve': carried flat at the side, gripped at the rim
  at: [0, -1, 0], size: [13, 5, 13], grip: [6.5, 1, 0.5],
  build(m) {
    m.cyl(6.5, 0, 6.5, 6.4, 1, '#b8bcc0'); ring(m, 6.5, 1, 6.5, 6.4, 5.5, '#9ea2a6'); m.cyl(6.5, 0, 6.5, 2, 1, '#c8ccd0');
    m.box(4, 1, 7, 2, 4, 2, GLASS); m.box(4, 1, 7, 2, 3, 2, '#f4f2ec'); // milk
    m.box(8, 1, 6, 2, 3, 2, GLASS); m.box(8, 1, 6, 2, 2, 2, '#e8a030'); // orange juice
    m.box(6, 1, 10, 2, 2, 2, WHITE); m.set(6, 2, 10, '#3a2414'); m.set(8, 2, 10, WHITE); // coffee cup
  },
});

defineHeld('rag', {
  pose: pose(-0.95, -0.2), at: [0, -1, 0], size: [4, 9, 3], grip: [1.5, 7.5, 1],
  build(m) {
    const w = '#e8e4d8', b = '#4a6a9a';
    m.box(0, 6, 0, 4, 3, 3, w); m.box(1, 8, 1, 2, 1, 1, '#d8d2c4');
    m.box(0, 0, 1, 4, 6, 1, w); m.box(0, 3, 1, 4, 1, 1, b); m.box(0, 1, 1, 4, 1, 1, b);
    m.clear(3, 0, 1, 1, 1, 1); m.set(0, 0, 2, w);
  },
});

defineHeld('scissors', {
  pose: pose(-1.47, -0.2), at: [0, -1, 0], size: [4, 1, 9], grip: [2, 0.5, 1],
  build(m) {
    m.box(0, 0, 0, 2, 1, 3, '#2a2a2e'); m.box(2, 0, 0, 2, 1, 3, '#2a2a2e'); m.set(0, 0, 1, 0); m.set(3, 0, 1, 0);
    m.box(1, 0, 3, 2, 1, 1, CHROME);
    m.box(1, 0, 4, 1, 1, 2, CHROME); m.box(2, 0, 4, 1, 1, 2, CHROME);
    m.box(0, 0, 6, 1, 1, 3, CHROME); m.box(3, 0, 6, 1, 1, 3, CHROME);
  },
});

defineHeld('hammer', {
  pose: pose(-0.88, 0.06), at: [0, -1, 0], rot: [['x', 0.25]], size: [1, 6, 12], grip: [0.5, 2.5, 1.5],
  build(m) {
    m.box(0, 2, 0, 1, 1, 10, WOOD); m.box(0, 2, 0, 1, 1, 3, '#6a3a2a');
    m.box(0, 0, 10, 1, 5, 2, '#5a5e64'); m.set(0, 0, 10, '#7a7e84'); m.set(0, 0, 11, '#7a7e84');
    m.set(0, 5, 9, '#5a5e64'); m.clear(0, 4, 11, 1, 1, 1);
  },
});

defineHeld('saw', {
  pose: pose(-0.55, 0.06), at: [0, -1, 0], rot: [['x', 0.6]], size: [1, 6, 19], grip: [0.5, 3, 1.5],
  build(m) {
    m.box(0, 1, 0, 1, 5, 4, '#9a5a30'); m.box(0, 2, 1, 1, 3, 2, 0);
    for (let z = 4; z < 19; z++) { const h = z < 10 ? 5 : z < 15 ? 4 : 3; m.box(0, 1, z, 1, h, 1, '#b8bcc0'); m.set(0, 1, z, '#8a8e92'); }
    m.set(0, 3, 5, '#d0b060');
  },
});

defineHeld('wrench', {
  pose: pose(-0.85, 0), at: [0, -1, 0], rot: [['x', 0.35]], size: [1, 4, 12], grip: [0.5, 1.5, 2],
  build(m) {
    m.box(0, 1, 0, 1, 1, 9, STEEL); m.box(0, 0, 9, 1, 4, 3, STEEL_D); m.box(0, 1, 11, 1, 2, 1, 0);
    m.set(0, 1, 1, STEEL_D);
  },
});

defineHeld('crate_small', { // 'carry': held in front with both hands
  pose: [['x', Math.PI / 2]], at: [0, -1, 0], size: [13, 10, 10], grip: [2.3, 0, 7.5], // snapped: tips ~18° forward
  build(m) {
    const w = '#c8a068', d = '#a47c48', gap = '#4a3624';
    m.box(0, 0, 0, 13, 9, 10, w); m.box(1, 1, 1, 11, 9, 8, gap);
    for (const y of [2, 5]) { m.box(0, y, 0, 13, 1, 10, gap); m.box(1, y, 1, 11, 1, 8, 0); }
    m.box(1, 2, 1, 11, 7, 8, 0);
    for (const [x, z] of [[0, 0], [12, 0], [0, 9], [12, 9]]) m.box(x, 0, z, 1, 9, 1, d);
    m.box(1, 1, 1, 11, 7, 8, gap);
    for (let x = 1; x < 11; x += 2) for (let z = 1; z < 8; z += 2) m.box(x, 8, z, 2, 1, 2, (x + z) % 4 ? '#b82a2a' : '#c8402a');
    for (const [x, z] of [[2, 2], [6, 4], [9, 2], [4, 6], [8, 6]]) m.set(x, 9, z, '#a82424');
    m.set(4, 9, 3, '#5a8a3a'); m.set(9, 9, 5, '#5a8a3a');
    m.box(4, 3, 9, 5, 2, 1, '#e8dcc0'); m.set(5, 4, 9, '#b83a2a'); m.set(7, 3, 9, '#2a4a8a'); // label
  },
});

// fishing rod: the rod runs along the arm frame's +z (crisp & cheap), which is ~63° up/forward in 'fish';
// the line hangs plumb from the tip (pre-rotated for the 'fish' pose) down to about water level off a pier.
const ROD_LEN = 64, ROD_GRIP = 5, FISH_POSE = pose(-1.1, -0.25);
const rodTipN = apM(trM(chain(FISH_POSE)), [0, 0, ROD_LEN - 1 - ROD_GRIP]); // rod tip in natural (world) axes
defineHeld('fishing_rod', {
  pose: FISH_POSE, at: [0, -1, 0],
  parts: [
    { rot: [['m', trM(chain(FISH_POSE))]], size: [3, 4, ROD_LEN], grip: [1.5, 2.5, ROD_GRIP + 0.5],
      build(m) {
        m.box(1, 2, 0, 1, 1, 2, BLACK); m.box(1, 2, 2, 1, 1, 7, '#c8a070');
        m.box(1, 2, 9, 1, 1, 24, '#6a4a2a'); m.box(1, 2, 33, 1, 1, ROD_LEN - 33, '#8a6a3a');
        for (const z of [16, 30, 44, 56]) m.set(1, 2, z, '#3a2a1a');
        m.box(0, 0, 6, 3, 2, 2, '#6a6e74'); m.set(0, 1, 5, CHROME); m.set(2, 0, 7, '#2a2a2e');
      } },
    { atN: rodTipN, size: [2, 84, 2], grip: [0.5, 83.5, 0.5], ss: false,
      build(m) {
        m.box(0, 3, 0, 1, 81, 1, '#cfcfc6');
        m.box(0, 1, 0, 2, 1, 2, '#f2efe6'); m.box(0, 2, 0, 2, 1, 2, '#c8302a'); m.set(0, 0, 0, '#9a9a90');
      } },
  ],
});

defineHeld('paintbrush', {
  pose: pose(-1.35, 0), at: [0, -1, 0], size: [3, 1, 11], grip: [1.5, 0.5, 2],
  build(m) {
    m.box(1, 0, 0, 1, 1, 6, '#a83a2a'); m.box(0, 0, 6, 3, 1, 2, CHROME);
    m.box(0, 0, 8, 3, 1, 2, '#4a3422'); m.box(0, 0, 10, 3, 1, 1, '#f0ece0');
  },
});

defineHeld('cards', {
  pose: pose(-0.95, -0.2), at: [0, -1, 0], size: [11, 6, 2], grip: [5.5, 0.5, 1],
  build(m) {
    const back = '#2a4a8a', face = '#f6f4ee';
    const angs = [-0.75, -0.38, 0, 0.38, 0.75];
    angs.forEach((a, i) => {
      const s = Math.sin(a), c = Math.cos(a);
      for (let y = 0; y < 6; y++) for (let x = 0; x < 11; x++) {
        const px = x + 0.5 - 5.5, py = y + 0.5;
        const u = px * c - py * s, v = px * s + py * c;
        if (Math.abs(u) <= 1.05 && v >= 1.2 && v <= 5.6) { m.set(x, y, 1, back); m.set(x, y, 0, face); }
      }
      void i;
    });
    for (const [x, y, col] of [[1, 3, '#b82a2a'], [3, 5, BLACK], [5, 5, '#b82a2a'], [7, 5, BLACK], [9, 3, '#b82a2a']]) m.set(x, y, 0, col);
  },
});

defineHeld('chalk', { size: [1, 3, 1], grip: [0.5, 3, 0.5], at: [0, -0.5, 0], build(m) { m.box(0, 0, 0, 1, 3, 1, '#f6f4ee'); } });

defineHeld('camera', { // press camera with flash gun
  pose: pose(-1.6, -0.45), at: [0, -1, 0], size: [14, 10, 9], grip: [-0.5, 2.5, 2],
  build(m) {
    const body = '#1e1e20', lens = '#2a3440';
    m.box(0, 0, 0, 6, 5, 4, body); m.box(0, 4, 0, 6, 1, 4, '#2c2c30'); m.box(0, 0, 0, 6, 1, 4, CHROME);
    m.box(1, 0, 4, 4, 4, 1, CHROME); m.box(1, 0, 5, 4, 4, 1, '#2a2a2c'); m.box(2, 1, 6, 2, 2, 1, CHROME); m.box(2, 1, 7, 2, 2, 1, lens);
    m.box(2, 5, 1, 2, 1, 2, CHROME); // viewfinder
    m.box(6, 2, 1, 2, 1, 1, CHROME); m.box(8, 2, 1, 1, 4, 1, CHROME);
    m.box(8, 5, 2, 6, 1, 1, 0);
    for (let y = 4; y < 10; y++) for (let x = 7; x < 14; x++) { const d = Math.hypot(x + 0.5 - 10.5, y + 0.5 - 7); if (d <= 3.3) m.set(x, y, 2, d < 1.2 ? { c: '#fffbe8', emit: 0.35 } : d > 2.4 ? '#aeb2b6' : '#dde0e4'); }
    m.box(9, 6, 1, 3, 2, 1, '#8a8e92');
  },
});

defineHeld('pipe', {
  pose: pose(-1.9, -0.3), at: [0, -1, 0], rot: [['x', -0.2], ['y', -0.41]], size: [2, 3, 9], grip: [1, 1.5, 7.5],
  build(m) {
    m.box(0, 0, 7, 2, 3, 2, '#5a3420'); m.set(0, 2, 7, '#2a1a10'); m.set(1, 2, 8, '#3a2214'); m.set(1, 2, 7, '#2a1a10'); m.set(0, 2, 8, '#2a1a10');
    m.box(1, 1, 2, 1, 1, 5, '#6a4028'); m.box(1, 1, 0, 1, 1, 2, BLACK);
  },
});

// phone: handset from near the ear down to the mouth (pose 'phone_stand'), coiled cord hanging below
const PH_E = [-0.184 * 32, -0.144 * 32, -0.246 * 32], PH_M = [0.026 * 32, -0.264 * 32, -0.086 * 32];
const PH_MID = [(PH_E[0] + PH_M[0]) / 2, (PH_E[1] + PH_M[1]) / 2, (PH_E[2] + PH_M[2]) / 2];
defineHeld('phone_handset', {
  pose: pose(-2.34, -0.5),
  parts: [
    { rot: [basis('y', [PH_E[0] - PH_M[0], PH_E[1] - PH_M[1], PH_E[2] - PH_M[2]], 'x', [0.55, 0.33, -0.77])], atN: PH_MID, size: [3, 10, 3], grip: [1.5, 5, 1.5],
      build(m) {
        m.box(0, 1, 1, 1, 8, 1, '#141416');
        m.box(0, 7, 0, 3, 3, 3, '#141416'); m.box(0, 0, 0, 3, 3, 3, '#141416');
        m.set(2, 8, 1, '#2a2a2e'); m.set(2, 1, 1, '#2a2a2e');
      } },
    { atN: [PH_M[0], PH_M[1] - 1.5, PH_M[2]], size: [2, 10, 2], grip: [0.5, 9.5, 0.5],
      build(m) { for (let y = 0; y < 10; y++) m.set((y >> 1) & 1, y, (y >> 1) & 1, '#1a1a1c'); } },
  ],
});

// ---- band instruments (placed relative to the mouth in their activity pose)
defineHeld('trumpet', {
  pose: pose(-1.5, -0.3), atN: [4.0, 3.7, -10.1], size: [5, 6, 17], grip: [2.5, 2.5, 0.5],
  build(m) {
    m.set(2, 2, 0, CHROME);
    m.box(2, 2, 1, 1, 1, 14, BRASS);
    m.box(2, 0, 4, 1, 1, 6, BRASS_D); m.set(2, 1, 4, BRASS_D); m.set(2, 1, 9, BRASS_D);
    for (const z of [5, 6, 7]) { m.box(2, 1, z, 1, 3, 1, BRASS_L); m.set(2, 4, z, '#f0ece0'); }
    m.box(1, 1, 14, 3, 3, 1, BRASS); m.box(0, 0, 15, 5, 5, 2, BRASS); m.clear(0, 0, 15, 1, 1, 2); m.clear(4, 0, 15, 1, 1, 2); m.clear(0, 4, 15, 1, 1, 2); m.clear(4, 4, 15, 1, 1, 2);
    m.box(1, 1, 16, 3, 3, 1, BRASS_D); m.set(2, 2, 16, '#5a4010');
  },
});

defineHeld('trombone', {
  pose: [['x', Math.PI / 2]], anchorPose: pose(-1.2, 0.06), atN: [10.1, 8.9, -9.9], size: [10, 8, 25], grip: [1.5, 1.5, 7.5],
  build(m) {
    m.set(1, 1, 7, CHROME);
    m.box(1, 1, 8, 1, 1, 16, BRASS); m.box(3, 1, 8, 1, 1, 16, BRASS); m.box(1, 1, 24, 3, 1, 1, BRASS); m.set(2, 0, 24, '#2a2a2a');
    m.box(1, 1, 17, 3, 1, 1, BRASS_L); // slide brace
    m.box(1, 2, 9, 5, 1, 1, BRASS_D); m.box(6, 2, 0, 1, 1, 10, BRASS); m.box(6, 4, 0, 1, 1, 13, BRASS); m.box(6, 2, 0, 1, 3, 1, BRASS_D);
    for (let z = 13; z < 17; z++) { const r = 0.6 + (z - 13) * 0.75; for (let y = 0; y < 8; y++) for (let x = 3; x < 10; x++) { const d = Math.hypot(x + 0.5 - 6.5, y + 0.5 - 4.5); if (d <= r) m.set(x, y, z, z === 16 && d < r - 0.9 ? '#6a4a12' : BRASS); } }
  },
});

defineHeld('clarinet', {
  pose: pose(-1.0, -0.35), atN: [3.2, 11.1, -7.6], rot: [['x', -0.7]], size: [3, 20, 3], grip: [1.5, 19.5, 1.5],
  build(m) {
    m.box(1, 0, 0, 1, 2, 3, BLACK); m.box(0, 0, 1, 3, 2, 1, BLACK); m.set(1, 0, 1, '#050505');
    m.box(1, 2, 1, 1, 18, 1, BLACK); m.set(1, 17, 1, CHROME); m.set(1, 10, 1, CHROME);
    for (const y of [5, 8, 12, 14]) m.set(1, y, 2, CHROME);
  },
});

defineHeld('tuba', { // snapped upright (tilts ~20° forward in 'tuba'); bell rises beside the player's left cheek
  pose: [['x', Math.PI / 2]], anchorPose: pose(-1.2, -0.2), atN: [7.3, -3, -5.5], size: [22, 22, 12], grip: [5.5, 6, 5.5],
  build(m) {
    m.cyl(5.5, 1, 5.5, 3.1, 11, BRASS); m.cyl(5.5, 0, 5.5, 2.2, 1, BRASS_D); m.cyl(5.5, 5, 5.5, 3.1, 1, BRASS_L);
    for (const z of [2, 4, 6]) { m.box(2, 6, z, 1, 4, 1, BRASS_D); m.set(2, 10, z, CHROME); } // valves on the right side
    line(m, 6.5, 12.5, 5.5, 14.5, 15.5, 5.5, BRASS); line(m, 7.5, 12.5, 5.5, 15.5, 15.5, 5.5, BRASS);
    for (let y = 15; y < 22; y++) { const r = y < 17 ? 2.2 : y < 19 ? 3.4 : y < 21 ? 4.6 : 5.4; m.cyl(15.5, y, 5.5, r, 1, BRASS); }
    m.cyl(15.5, 21, 5.5, 4.4, 1, '#6a4a12'); m.cyl(15.5, 20, 5.5, 3.4, 1, '#6a4a12');
    line(m, 4.5, 11.5, 2.5, 4.5, 14.5, 0.5, BRASS); m.set(4, 15, 0, CHROME); // mouthpipe
  },
});

defineHeld('drumstick', {
  at: [0, -0.5, 0], rot: [['z', 0.3]], size: [1, 14, 1], grip: [0.5, 12, 0.5],
  build(m) { m.box(0, 1, 0, 1, 13, 1, '#e0c890'); m.set(0, 0, 0, '#f4e8c0'); },
});

defineHeld('fiddle', {
  pose: pose(-1.2, -0.2),
  parts: [
    { atN: [8.3, 7.1, -12.8], rot: [basis('z', [0.8, -0.1, 0.59], 'y', [-0.35, 1, 0])], size: [7, 4, 19], grip: [3.5, 0, 0],
      build(m) {
        const w = '#9a4a1a', top = '#b85a22', e = '#6a3010';
        m.box(0, 0, 0, 7, 2, 11, w); m.clear(0, 0, 4, 1, 2, 3); m.clear(6, 0, 4, 1, 2, 3);
        m.clear(0, 0, 0, 1, 2, 1); m.clear(6, 0, 0, 1, 2, 1); m.clear(0, 0, 10, 1, 2, 1); m.clear(6, 0, 10, 1, 2, 1);
        m.box(1, 1, 1, 5, 1, 9, top); m.set(2, 1, 5, e); m.set(4, 1, 5, e);
        m.box(2, 2, 0, 2, 1, 2, BLACK); // chinrest
        m.box(3, 2, 4, 1, 1, 1, '#e0c890'); // bridge
        m.box(3, 1, 11, 1, 1, 6, w); m.box(3, 2, 6, 1, 1, 11, BLACK); m.box(3, 1, 17, 1, 2, 2, e);
      } },
    { rot: [basis('z', [0.69, 0.47, -0.55], 'y', [0, 1, 0.3])], size: [2, 3, 24], grip: [0.5, 1, 1],
      build(m) { m.box(0, 1, 0, 1, 2, 3, BLACK); m.box(0, 2, 3, 1, 1, 21, '#4a2a18'); m.box(0, 1, 3, 1, 1, 20, '#e8e4d8'); } },
  ],
});

defineHeld('guitar', {
  anchorPose: pose(-0.7, -0.3), atN: [1.4, 1.0, -2.2], rot: [['x', 0.55]], size: [34, 12, 3], grip: [7, 6, 2], // neck stays arm-aligned (cheap), body turned upright
  build(m) {
    const edge = '#4a2410', mid = '#9a4a1a', core = '#d0802e';
    for (let y = 0; y < 12; y++) for (let x = 0; x < 15; x++) {
      const lower = Math.hypot((x + 0.5 - 4.5) / 4.6, (y + 0.5 - 6) / 6.1) <= 1, upper = Math.hypot((x + 0.5 - 11) / 3.6, (y + 0.5 - 6) / 4.6) <= 1;
      if (!lower && !upper) continue;
      const d = Math.hypot((x + 0.5 - 6) / 7, (y + 0.5 - 6) / 6);
      m.box(x, y, 0, 1, 1, 2, edge); m.set(x, y, 2, d > 0.8 ? edge : d > 0.55 ? mid : core);
    }
    for (const [x, y] of [[9, 5], [10, 5], [9, 6], [10, 6]]) m.set(x, y, 2, '#1a1008');
    m.box(3, 4, 2, 1, 4, 1, '#2a1a10');
    m.box(15, 5, 0, 15, 2, 2, '#6a3a1a'); m.box(15, 5, 2, 15, 2, 1, '#1e1a16');
    m.box(30, 4, 0, 4, 4, 2, '#3a2010'); m.set(31, 3, 1, CHROME); m.set(33, 3, 1, CHROME); m.set(31, 8, 1, CHROME); m.set(33, 8, 1, CHROME);
  },
});

// ---- carried (hang from the hand when the arm is down; walking poses the arm at -0.25)
defineHeld('briefcase', {
  size: [3, 11, 13], grip: [1.5, 10.5, 6.5], at: [0, -0.5, 0],
  build(m) {
    const l = '#5a3a24', d = '#3e2616';
    m.box(0, 0, 0, 3, 8, 13, l); m.box(0, 7, 0, 3, 1, 13, d); m.box(0, 0, 0, 3, 1, 13, d);
    m.box(0, 0, 0, 3, 8, 1, d); m.box(0, 0, 12, 3, 8, 1, d);
    for (const z of [3, 9]) { m.set(0, 6, z, BRASS); m.set(2, 6, z, BRASS); }
    m.box(1, 8, 4, 1, 2, 1, d); m.box(1, 8, 8, 1, 2, 1, d); m.box(1, 10, 4, 1, 1, 5, d);
  },
});

defineHeld('handbag', {
  size: [3, 12, 9], grip: [1.5, 11.5, 4.5], at: [0, -0.5, 0],
  build(m) {
    const c = T1(0.5), d = T1(0.4);
    m.box(0, 0, 0, 3, 6, 9, c); m.box(0, 0, 0, 3, 1, 9, d); m.clear(0, 5, 0, 3, 1, 1); m.clear(0, 5, 8, 3, 1, 1);
    m.box(0, 6, 1, 3, 1, 7, BRASS); m.set(1, 7, 4, BRASS); m.set(1, 7, 5, BRASS_L);
    m.box(1, 7, 2, 1, 3, 1, d); m.box(1, 7, 6, 1, 3, 1, d); m.box(1, 10, 2, 1, 1, 5, d); m.box(1, 11, 3, 1, 1, 3, d);
  },
});

defineHeld('umbrella', {
  size: [3, 28, 4], grip: [1.5, 26.5, 2.5], at: [0, -0.5, 0],
  build(m) {
    const a = T1(0.5), b = T1(0.42), h = '#6a3a1a';
    m.box(1, 0, 1, 1, 4, 1, CHROME);
    m.box(1, 4, 1, 1, 4, 1, a); m.box(0, 6, 0, 3, 2, 3, a);
    m.box(0, 8, 0, 3, 11, 3, a); m.box(1, 8, 0, 1, 11, 1, b); m.box(0, 8, 2, 1, 11, 1, b); m.box(2, 8, 1, 1, 11, 1, b);
    m.box(0, 15, 0, 3, 1, 3, T1(0.34)); m.box(0, 19, 0, 3, 1, 3, T1(0.46));
    m.box(1, 20, 1, 1, 6, 1, CHROME); m.box(1, 22, 1, 1, 4, 1, h);
    m.box(1, 26, 1, 1, 2, 1, h); m.box(1, 27, 2, 1, 1, 2, h); m.box(1, 26, 3, 1, 1, 1, h); m.box(1, 25, 3, 1, 1, 1, h);
  },
});

defineHeld('cane', {
  size: [1, 28, 4], grip: [0.5, 26.5, 2.5], at: [0, -0.5, 0],
  build(m) {
    const w = '#3a2014';
    m.box(0, 0, 1, 1, 1, 1, BLACK); m.box(0, 1, 1, 1, 25, 1, w); m.set(0, 24, 1, CHROME);
    m.box(0, 26, 1, 1, 2, 1, w); m.box(0, 27, 2, 1, 1, 2, w); m.set(0, 26, 3, w);
  },
});

defineHeld('grocery_bag', {
  size: [7, 18, 10], grip: [3.5, 3, 0], at: [0, -0.5, 0],
  build(m) {
    const k = '#b89060', d = '#a07848';
    m.box(0, 0, 1, 7, 11, 9, k); m.box(0, 10, 1, 7, 1, 9, d); m.box(1, 10, 2, 5, 1, 7, '#3a2a1a');
    m.box(3, 0, 1, 1, 10, 1, d); m.box(3, 0, 9, 1, 10, 1, d);
    for (const [x, z] of [[1, 2], [2, 3], [1, 4]]) { m.box(x, 11, z, 1, 4, 1, '#8ab85a'); m.box(x, 15, z, 1, 1, 1, '#5a9a3a'); }
    m.box(1, 16, 3, 2, 1, 1, '#5a9a3a'); m.set(0, 15, 2, '#5a9a3a');
    for (let y = 11; y < 17; y++) { const z = 5 + Math.floor((y - 11) / 2); m.box(4, y, z, 2, 1, 2, (y & 1) ? '#c8904a' : '#e0b070'); }
    m.set(2, 12, 7, '#e88a2a');
  },
});

defineHeld('suitcase', {
  size: [6, 16, 19], grip: [3, 15.5, 9.5], at: [0, -0.5, 0],
  build(m) {
    const a = '#8a6040', d = '#5e3e26', strap = '#4a2e1a';
    m.box(0, 0, 0, 6, 13, 19, a); m.box(0, 0, 0, 6, 1, 19, d); m.box(0, 12, 0, 6, 1, 19, d);
    m.box(0, 0, 0, 6, 13, 1, d); m.box(0, 0, 18, 6, 13, 1, d); m.box(0, 6, 0, 6, 1, 19, '#6e4a30');
    for (const z of [5, 13]) { m.box(0, 0, z, 6, 13, 1, strap); m.set(0, 9, z, BRASS); m.set(5, 9, z, BRASS); }
    m.set(0, 10, 2, '#e8dcc0'); m.set(0, 10, 3, '#c83a2a'); // travel sticker
    m.box(2, 13, 7, 2, 2, 1, d); m.box(2, 13, 11, 2, 2, 1, d); m.box(2, 15, 7, 2, 1, 5, d);
  },
});

defineHeld('lantern', { // hurricane lantern hanging from its bail
  size: [7, 14, 7], grip: [3.5, 13.5, 3.5], at: [0, -0.5, 0],
  build(m) {
    const red = '#9a2a24', tin = '#5a5e62';
    m.cyl(3.5, 0, 3.5, 3.2, 2, red); m.cyl(3.5, 2, 3.5, 2.2, 1, tin);
    m.cyl(3.5, 3, 3.5, 2.2, 4, { c: '#f0d8a0', emit: 0.55 }); m.box(3, 3, 3, 1, 2, 1, { c: '#ffc860', emit: 1 });
    m.box(0, 3, 3, 1, 4, 1, tin); m.box(6, 3, 3, 1, 4, 1, tin);
    m.cyl(3.5, 7, 3.5, 2.6, 1, red); m.cyl(3.5, 8, 3.5, 1.6, 2, red); m.box(3, 10, 3, 1, 1, 1, tin);
    m.box(0, 7, 3, 1, 5, 1, tin); m.box(6, 7, 3, 1, 5, 1, tin); m.box(1, 12, 3, 5, 1, 1, tin); m.box(2, 13, 3, 3, 1, 1, tin);
  },
});

defineHeld('flashlight', {
  rot: [['x', 0.4]], at: [0, -1, 0], size: [3, 3, 10], grip: [1.5, 1.5, 2],
  build(m) {
    m.box(1, 1, 0, 1, 1, 7, '#2a3a5a'); m.box(0, 0, 7, 3, 3, 2, CHROME); m.box(0, 0, 9, 3, 3, 1, { c: '#fff4c8', emit: 0.9 });
    m.set(1, 2, 3, '#c83a2a'); m.box(1, 1, 0, 1, 1, 1, CHROME);
  },
});

defineHeld('bat', {
  size: [3, 27, 3], grip: [1.5, 24.5, 1.5], at: [0, -0.5, 0],
  build(m) {
    const w = '#d8b478';
    m.box(0, 25, 0, 3, 1, 3, '#8a5a30'); m.box(1, 16, 1, 1, 10, 1, '#b08858'); m.box(1, 19, 1, 1, 5, 1, '#3a2a1e');
    m.box(0, 0, 0, 3, 16, 3, w); m.clear(0, 0, 0, 1, 16, 1); m.clear(2, 0, 0, 1, 16, 1); m.clear(0, 0, 2, 1, 16, 1); m.clear(2, 0, 2, 1, 16, 1);
    m.box(1, 12, 1, 1, 4, 1, w); m.set(1, 8, 2, '#2a2a2e');
  },
});

defineHeld('ball', {
  size: [5, 5, 5], grip: [2.5, 5.5, 1], at: [0, -0.5, 0],
  build(m) { m.sphere(2.5, 2.5, 2.5, 2.6, '#c83a2a'); m.sphere(2.5, 2.5, 2.5, 2.6, '#f0e8d8', (x, y) => y === 2); m.set(2, 4, 2, '#d85a4a'); },
});

defineHeld('cake_knife', {
  size: [3, 11, 2], grip: [1, 9, 0.5], at: [0, -0.5, 0],
  build(m) {
    m.box(1, 0, 0, 1, 7, 1, '#d8dce0'); m.box(0, 1, 0, 1, 5, 1, '#c0c4c8');
    m.box(1, 7, 0, 1, 4, 1, '#f4f2ee'); m.set(2, 8, 0, '#f4f2ee'); m.set(2, 8, 1, '#e8e0d0'); m.set(0, 7, 1, '#f4f2ee');
  },
});

defineHeld('letter', { // envelope pinched at one corner, face toward the front
  size: [10, 6, 1], grip: [0.5, 5.5, 0.5], at: [0, -0.5, 2.5],
  build(m) {
    m.box(0, 0, 0, 10, 6, 1, '#f2eee2');
    m.box(7, 3, 0, 2, 2, 1, '#c83a2a'); m.set(8, 4, 0, '#2a4a8a');
    m.box(2, 1, 0, 4, 1, 1, '#8e8a80'); m.box(2, 2, 0, 3, 1, 1, '#8e8a80');
  },
});

defineHeld('pie', { // pie on a plate, carried flat (walking pose), held at the rim
  at: [0, -1, 0], size: [11, 3, 11], grip: [5.5, 1, 0.5],
  build(m) {
    m.cyl(5.5, 0, 5.5, 5.4, 1, '#f2efe6'); ring(m, 5.5, 0, 5.5, 5.4, 4.6, '#dcd6c8');
    m.cyl(5.5, 1, 5.5, 4.2, 1, '#d8a860'); m.cyl(5.5, 1, 5.5, 3.3, 1, '#9a2a2a');
    for (const k of [3, 5, 7]) { m.box(k, 1, 2, 1, 1, 7, '#e0b870'); m.box(2, 1, k, 7, 1, 1, '#e0b870'); }
    ring(m, 5.5, 1, 5.5, 4.2, 3.3, '#c89048');
    for (let x = 1; x < 10; x += 2) { if (m.get(x, 1, 1)) m.set(x, 2, 1, '#d8a860'); if (m.get(x, 1, 9)) m.set(x, 2, 9, '#d8a860'); }
  },
});

defineHeld('bouquet', { // held low in front, stems in the fist
  rot: [['x', 0.6]], at: [0, -1, 0.5], size: [8, 13, 8], grip: [3.5, 3, 3.5],
  build(m) {
    const w = '#f6f3ec', p = '#eea0b0', leaf = '#4a7a3a';
    m.box(3, 0, 3, 2, 7, 2, '#5a8a3a');
    m.box(2, 2, 2, 4, 3, 4, '#f0ece4'); m.box(3, 0, 5, 1, 2, 1, '#f0ece4'); m.box(4, 0, 6, 1, 2, 1, '#f0ece4'); // satin wrap & ribbons
    m.sphere(3.5, 9, 3.5, 3.9, leaf, (x, y) => y >= 6 && y <= 7);
    m.sphere(3.5, 9, 3.5, 3.6, w, (x, y) => y >= 7);
    for (const [x, y, z] of [[2, 11, 2], [5, 10, 4], [3, 9, 6], [1, 9, 4], [6, 9, 1], [4, 12, 4], [2, 10, 5], [5, 11, 2]]) m.set(x, y, z, p);
  },
});

defineHeld('balloon', { // string rises from the fist to a balloon ~1.5 m above the hand
  at: [0, 0, 2.5], size: [11, 62, 11], grip: [5.5, 0, 5.5],
  build(m) {
    for (let y = 0; y < 49; y++) m.set(5 + ((y >> 3) & 1), y, 5, '#e8e4d8');
    m.box(5, 49, 5, 1, 1, 1, T1(0.4));
    for (const [y, h, r] of [[50, 1, 1.6], [51, 1, 3.2], [52, 2, 4.3], [54, 4, 4.9], [58, 2, 4.3], [60, 1, 3.2], [61, 1, 1.6]]) m.cyl(5.5, y, 5.5, r, h, T1(0.5));
    m.box(3, 57, 9, 1, 2, 1, T1(0.66)); m.set(2, 58, 8, T1(0.62));
  },
});

defineHeld('ice_cream_cone', {
  rot: [['x', 0.55]], at: [0, -1, 0.5], size: [4, 9, 4], grip: [1.5, 1, 1.5],
  build(m) {
    const cone = '#c89050', cone2 = '#a87038';
    m.box(1, 0, 1, 1, 2, 1, cone2); m.box(1, 2, 1, 2, 2, 2, cone); m.box(0, 4, 0, 4, 1, 4, cone2); m.box(1, 4, 1, 2, 1, 2, cone);
    m.set(2, 2, 1, cone2); m.set(1, 3, 2, cone2);
    m.sphere(2, 6.5, 2, 2.2, '#f0b8c8', (x, y) => y >= 5); m.set(1, 5, 0, '#f0b8c8'); m.set(3, 5, 3, '#f0b8c8');
    m.set(2, 8, 2, '#a82a3a'); m.set(1, 7, 1, '#e8a0b4');
  },
});

defineHeld('cotton_candy', {
  rot: [['x', 0.5]], at: [0, -1, 0.5], size: [9, 16, 9], grip: [4.5, 1, 4.5],
  build(m) {
    m.box(4, 0, 4, 1, 8, 1, '#f2efe6');
    m.sphere(4.5, 11.5, 4.5, 3.9, '#f4b0c8', (x, y) => y >= 7);
    for (const [x, y, z] of [[2, 13, 2], [6, 11, 1], [7, 12, 5], [3, 10, 7], [5, 15, 4], [1, 11, 5]]) m.set(x, y, z, '#fac8da');
    for (const [x, y, z] of [[4, 13, 8], [8, 11, 4], [0, 12, 4]]) m.set(x, y, z, '#e898b4');
  },
});

defineHeld('hot_dog', {
  at: [0, -1.5, 0], size: [3, 3, 9], grip: [1.5, 1.5, 1.5],
  build(m) {
    const bun = '#d8a060', dog = '#a8482a';
    m.box(0, 0, 1, 3, 2, 7, bun); m.box(1, 1, 0, 1, 1, 9, dog); m.box(1, 1, 1, 1, 1, 7, dog);
    for (let z = 1; z < 8; z++) m.set(1, 2, z, (z & 1) ? '#e8c020' : 0);
    m.set(0, 0, 1, '#c08848'); m.set(2, 0, 7, '#c08848');
  },
});

defineHeld('popcorn_box', {
  at: [0, -1, 0.5], size: [5, 8, 5], grip: [2.5, 3, 0],
  build(m) {
    for (let x = 0; x < 5; x++) m.box(x, 0, 0, 1, 6, 5, (x & 1) ? '#f2efe6' : '#c83a2a');
    m.box(1, 0, 1, 3, 6, 3, '#e8d8a8');
    m.box(0, 6, 0, 5, 1, 5, '#f4ecc8'); m.box(1, 7, 1, 3, 1, 3, '#f8f2d8');
    for (const [x, z] of [[0, 1], [4, 3], [2, 0], [3, 4]]) m.set(x, 7, z, '#f0dca0');
    m.box(1, 3, 0, 3, 1, 1, '#2a4a8a');
  },
});

// ---- flags & signs (1/48 scale). 'raised' versions: held up high with the arm raised (wave/cheer, aRp≈-2.7);
//      the plain names are for arms down / walking (stick rises in front of the fist).
function flagBuild(m) {
  // 48-star flag 22x13 px on a stick; flag occupies x 1..22, stick x 0
  m.box(0, 0, 0, 1, 26, 1, '#b8a070'); m.set(0, 26, 0, '#d9b24a');
  for (let r = 0; r < 13; r++) {
    const col = r % 2 === 0 ? '#b0283a' : '#f2efe6';
    m.box(1, 13 + r, 0, 11, 1, 1, col); m.box(12, 13 + r, 1, 11, 1, 1, col);
  }
  m.box(1, 19, 0, 9, 7, 1, '#23346a');
  for (let y = 20; y < 26; y += 2) for (let x = 2; x < 10; x += 2) m.set(x + ((y >> 1) & 1), y, 0, '#f2efe6');
}
defineHeld('flag_small', {
  scale: 1 / 48, rot: [['y', Math.PI]], at: [0, -1.5, 3], size: [23, 27, 2], grip: [0.5, 2, 0.5], build: flagBuild,
});
defineHeld('flag_small_raised', {
  scale: 1 / 48, rot: [['y', Math.PI], ['x', Math.PI]], at: [0, -1.5, 0], size: [23, 27, 2], grip: [0.5, 2, 0.5], build: flagBuild,
});

function signBuild(m, stick) {
  const board = '#f4efe2', red = '#b02a2a', blue = '#23346a';
  m.box(15, 0, 1, 2, stick + 3, 1, '#a88050');
  const y0 = stick;
  m.box(0, y0, 0, 32, 26, 2, board);
  m.box(0, y0, 0, 32, 1, 2, red); m.box(0, y0 + 25, 0, 32, 1, 2, red); m.box(0, y0, 0, 1, 26, 2, red); m.box(31, y0, 0, 1, 26, 2, red);
  for (const [f, z] of [['text', 1], ['textBack', 0]]) {
    m[f]('WELCOME', 16, y0 + 19, z, blue, { align: 'center' });
    m[f]('HOME', 16, y0 + 13, z, blue, { align: 'center' });
    m[f]('SAL', 16, y0 + 2, z, red, { align: 'center', scale: 2 });
  }
}
defineHeld('sign_placard_low', { // arms down: tall stick, sign above head height
  scale: 1 / 48, at: [0, -1, 3], size: [32, 86, 2], grip: [16, 4, 1.5], build: (m) => signBuild(m, 60),
});
defineHeld('sign_placard', { // held up high (cheer / wave)
  scale: 1 / 48, rot: [['z', Math.PI]], at: [0, -1, 0], size: [32, 56, 2], grip: [16, 4, 1.5], build: (m) => signBuild(m, 30),
});
