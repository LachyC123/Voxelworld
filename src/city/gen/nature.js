// Generators: nature & the town's edges. The Old Burying Ground (1853) on the edge of the hill north-east
// of Mill Street & Hillcrest Avenue, Haskell's farm stand on the road out of town (Grand Avenue), old
// fieldstone walls along the town line and a few apple trees. See docs/BUILDINGS.md.
import { MAT } from './common.js';
import { CEMETERY } from '../layout.js';
import { textSignType } from '../../props/lib/special.js';
import { defineProp, PROP_DEFS } from '../../props/props.js';
import { Kit, siteBuilding, finishSite, YAW } from './harbor.js';

const V = (m) => Math.round(m * 4);

export function register(GEN, SITES) {
  void GEN;
  SITES.push({ name: 'the Old Burying Ground', order: 20, build: buildBuryingGround });
  SITES.push({ name: 'the town edges', order: 22, build: buildEdges });
}

// ============================================================ gravestones (props with their inscriptions)
// style: slate (dark, round shouldered, winged death's head), marble (white, round top, willow & urn),
// granite (grey, square), gar (white marble, sunken shield, Civil War), cenotaph (marble with an anchor)
const STONE = { slate: ['#4a525e', '#3a414c', '#c8ccd0'], marble: ['#e6e2d8', '#cfcac0', '#6a665e'], granite: ['#8e8b87', '#7a7773', '#f0ece2'], gar: ['#ecebe4', '#d4d2ca', '#5a5850'], cenotaph: ['#e6e2d8', '#cfcac0', '#4a5a6a'] };
function graveType(key, lines, style = 'slate', o = {}) {
  const name = 'hb_grave:' + key;
  if (PROP_DEFS.has(name)) return name;
  const [c1, c2, ct] = STONE[style];
  const Wd = o.w || 46, Hd = o.h || 58;
  defineProp(name, {
    size: [Wd, Hd + 4, 5], scale: 1 / 56, origin: [Wd / 2, 0, 2], collide: [Wd / 56, Hd / 56, 0.12], cat: 'exterior',
    build(m) {
      m.box(0, 0, 0, Wd, Hd - 8, 4, c1);
      if (style === 'granite') { m.box(0, Hd - 8, 0, Wd, 6, 4, c1); m.box(-1, 0, -1, Wd + 2, 3, 6, c2); }
      else {
        // rounded tympanum with shoulders
        for (let y = 0; y < 12; y++) { const hw = Math.round(Math.sqrt(Math.max(0, 144 - y * y)) * (Wd / 2 - 6) / 12); m.box(Wd / 2 - hw, Hd - 8 + y - 4, 0, 2 * hw, 1, 4, c1); }
        m.box(0, Hd - 12, 0, 6, 4, 4, c1); m.box(Wd - 6, Hd - 12, 0, 6, 4, 4, c1);
      }
      m.box(0, 0, 4, Wd, 1, 1, c2);
      // motif in the tympanum
      const my = Hd - 10;
      if (style === 'slate') { m.box(Wd / 2 - 3, my, 4, 6, 5, 1, c2); m.box(Wd / 2 - 2, my + 2, 4, 1, 1, 1, c1); m.box(Wd / 2 + 1, my + 2, 4, 1, 1, 1, c1); for (let k = 0; k < 7; k++) { m.box(Wd / 2 - 4 - k * 2, my + 2 + (k >> 1), 4, 2, 1, 1, c2); m.box(Wd / 2 + 2 + k * 2, my + 2 + (k >> 1), 4, 2, 1, 1, c2); } }
      else if (style === 'marble') { m.box(Wd / 2 - 2, my, 4, 4, 4, 1, c2); m.box(Wd / 2 - 3, my + 4, 4, 6, 1, 1, c2); for (let k = 0; k < 6; k++) m.box(Wd / 2 + 4 + k, my + 5 - k, 4, 1, 3, 1, '#8a9a7a'); }
      else if (style === 'gar') { m.box(Wd / 2 - 6, my - 20, 4, 12, 14, 1, c2); m.box(Wd / 2 - 5, my - 21, 4, 10, 1, 1, c2); }
      else if (style === 'cenotaph') { m.box(Wd / 2, my - 2, 4, 1, 8, 1, ct); m.box(Wd / 2 - 3, my + 4, 4, 7, 1, 1, ct); m.box(Wd / 2 - 3, my - 2, 4, 7, 1, 1, ct); m.box(Wd / 2 - 3, my - 1, 4, 1, 1, 1, ct); m.box(Wd / 2 + 3, my - 1, 4, 1, 1, 1, ct); }
      // inscription
      const top = style === 'gar' ? my - 26 : style === 'granite' ? Hd - 12 : my - 8;
      lines.forEach((t, i) => { if (t) m.text(t, Wd / 2, top - i * 7, 4, ct, { font: 'small', align: 'center' }); });
      if (o.lichen) for (let k = 0; k < 9; k++) m.box((k * 17) % (Wd - 3), (k * 29) % (Hd - 12), 4, 2 + (k % 2), 1 + (k % 3 === 0 ? 1 : 0), 1, '#8a9a6a');
    },
  });
  return name;
}
function defineNatureProps() {
  if (!PROP_DEFS.has('hb_grave_flag')) defineProp('hb_grave_flag', {
    size: [10, 22, 2], cat: 'exterior',
    build(m) { m.box(0, 0, 0, 1, 22, 1, '#3a2a1a'); for (let y = 0; y < 7; y++) m.box(1, 13 + y, 0, 9, 1, 1, y % 2 ? '#f0ede6' : '#b3262a'); m.box(1, 16, 0, 4, 4, 1, '#1f3a6e'); m.box(2, 17, 1, 1, 1, 1, '#f0ede6'); m.box(4, 18, 1, 1, 1, 1, '#f0ede6'); },
  });
  if (!PROP_DEFS.has('hb_gar_marker')) defineProp('hb_gar_marker', {
    size: [7, 16, 2], cat: 'exterior',
    build(m) { m.box(3, 0, 0, 1, 10, 1, '#3a3a36'); m.box(1, 10, 0, 5, 5, 1, '#8a6a3a'); m.box(3, 15, 0, 1, 1, 1, '#8a6a3a'); m.box(0, 12, 0, 7, 1, 1, '#8a6a3a'); m.box(2, 11, 1, 3, 3, 1, '#c9a24a'); },
  });
  if (!PROP_DEFS.has('hb_grave_old')) for (const [k, st] of [['a', 'slate'], ['b', 'slate'], ['c', 'marble'], ['d', 'granite']]) graveType('old_' + k, ['---- ----', '-- ------', '', '---- ----', '-- ----'], st, { lichen: true, w: k === 'b' ? 40 : 46, h: k === 'b' ? 50 : 58 });
  PROP_DEFS.set('hb_grave_old', PROP_DEFS.get('hb_grave:old_a'));
}

// ============================================================ THE OLD BURYING GROUND
function buildBuryingGround(ctx) {
  defineNatureProps();
  const R = { x0: 421, x1: 469, z0: -238, z1: -211 };
  const b = siteBuilding(ctx, 'Old Burying Ground', 'park', { x0: CEMETERY.x0, z0: CEMETERY.z0, x1: CEMETERY.x1, z1: CEMETERY.z1 }, { est: 1853, street: 'Hillcrest Avenue', lore: 'Given to the town by Capt. Elias Whitcomb in 1853. The founders lie on the high ground at the east end.', label: 'Old Burying Ground' });
  const K = new Kit(ctx, b), W = ctx.world, rng = ctx.rng.fork('burying');
  // ---- ground: lawn at the walking level, the high east end a step up behind a fieldstone terrace wall
  K.B(R.x0, 0, R.z0, R.x1, 1, R.z1, MAT.grass_lawn);
  K.B(448, 0, R.z0, R.x1, 2, R.z1, MAT.grass_lawn); K.B(448, 0, R.z0, 448.5, 2, R.z1, MAT.stone_foundation);
  for (let z = R.z0 + 1; z < R.z1 - 1; z += 2.5) K.B(448 - 0.25, 1, z, 448.25, 2, z + rng.float(0.5, 1.5), MAT.rock);
  // gravel walks: the main walk from the gate, cross walks, steps up to the high ground
  K.B(R.x0, 0, -224, R.x1 - 1, 1, -221, MAT.gravel); K.B(448, 1, -224, R.x1 - 1, 2, -221, MAT.gravel); K.B(447.5, 0, -224, 448.5, 2, -221, MAT.granite); K.B(447, 0, -224, 447.5, 1, -221, MAT.granite);
  for (const x of [434, 458]) { const y = x > 448 ? 1 : 0; K.B(x - 1, y, R.z0 + 1, x + 1, y + 1, R.z1 - 1, MAT.gravel); }
  // the path from the corner of Mill Street and Hillcrest Avenue
  K.B(384, 0, -219.5, 406, 1, -217, MAT.gravel); for (let x = 406; x < R.x0; x += 1) { const z = -218.25 - (x - 406) * 0.24; K.B(x, 0, z - 1.25, x + 1, 1, z + 1.25, MAT.gravel); }
  // ---- walls: fieldstone on three sides, granite & iron railing toward the town, the gate
  const fieldstone = (x0, z0, x1, z1) => { const along = x1 - x0 > z1 - z0; const L = along ? x1 - x0 : z1 - z0; for (let t = 0; t < L; t += 1.5) { const h = rng.int(3, 4) + (x0 > 448 ? 1 : 0), m = rng.chance(0.4) ? MAT.rock : MAT.stone_foundation; if (along) K.B(x0 + t, 0, z0, Math.min(x1, x0 + t + 1.5), h, z1, m); else K.B(x0, 0, z0 + t, x1, h, Math.min(z1, z0 + t + 1.5), m); } };
  fieldstone(R.x0 - 0.5, R.z0 - 0.75, R.x1 + 0.5, R.z0); fieldstone(R.x0 - 0.5, R.z1, R.x1 + 0.5, R.z1 + 0.75); fieldstone(R.x1, R.z0, R.x1 + 0.75, R.z1);
  K.B(R.x0 - 0.75, 0, R.z0, R.x0, 2, R.z1, MAT.granite);
  for (let z = R.z0; z < R.z1; z += 1) { if (z >= -224 && z < -221) continue; K.B(R.x0 - 0.5, 2, z, R.x0 - 0.25, 6, z + 0.25, MAT.iron); K.B(R.x0 - 0.5, 6, z, R.x0 - 0.25, 7, z + 0.25, MAT.iron); }
  K.B(R.x0 - 0.5, 5, R.z0, R.x0 - 0.25, 6, -224, MAT.iron); K.B(R.x0 - 0.5, 5, -221, R.x0 - 0.25, 6, R.z1, MAT.iron);
  K.B(R.x0 - 0.75, 0, -224, R.x0, 1, -221, MAT.granite);
  for (const z of [-225, -221]) { K.B(R.x0 - 1, 0, z, R.x0 + 0.25, 11, z + 1, MAT.granite); K.B(R.x0 - 1.25, 11, z - 0.25, R.x0 + 0.5, 12, z + 1.25, MAT.granite); K.B(R.x0 - 0.75, 12, z + 0.25, R.x0, 13, z + 0.75, MAT.granite); }
  // wrought-iron arch over the gate, the gate leaves standing open
  K.B(R.x0 - 0.5, 13, -224.25, R.x0 - 0.25, 14, -220.75, MAT.iron); K.B(R.x0 - 0.5, 15, -223.75, R.x0 - 0.25, 16, -221.25, MAT.iron);
  for (const z of [-223.5, -222.5, -221.75]) K.B(R.x0 - 0.5, 13, z, R.x0 - 0.25, 15, z + 0.25, MAT.iron);
  ctx.props.add(textSignType('OLD BURYING GROUND 1853', { bg: '#1c1c1c', fg: '#d8d0b8', border: '#1c1c1c', scale: 1 / 30 }), R.x0 - 0.7, 3.55, -222.5, YAW.W, {});
  for (const z of [-223.75, -221.5]) { K.B(R.x0 + 0.25, 1, z < -223 ? -224.5 + 0.25 : -221, R.x0 + 1.5, 7, z < -223 ? -224.25 + 0.25 : -220.75, MAT.iron); }
  K.P('hb_plaque', R.x0 - 1.1, 1.6, -225.5, 'W');
  K.read(R.x0 - 1.5, 1.6, -225.5, { title: 'The Old Burying Ground', body: 'THE OLD BURYING GROUND\nJuniper Bay, 1853\n\nGiven to the town by Capt. Elias Whitcomb "for the decent rest of all who come to this cove and stay."\n\nWhen the Boston & Juniper Bay Railroad was laid along the north side in 1872, the Selectmen required the company to build the stone wall at its own expense, "that the dead shall not be troubled by the cars."\n\nThe gate is closed at sundown. Please latch it behind you — the Pruitts\' goat is out again.' }, { r: 2.4 });
  // ---- nav: from the sidewalk corner, through the gate, up the main walk, and the cross walks
  const corner = K.nearestWalk(382, -218, 6);
  const approach = K.path([[384.5, -218.25], [406, -218.25], [R.x0 - 2, -222.5]], { step: 8 });
  if (corner >= 0) K.link(approach[0], corner);
  const main = K.path([[R.x0 + 1, -222.5], [434, -222.5], [446.5, -222.5], [449, -222.5, 0.5], [458, -222.5, 0.5], [R.x1 - 2, -222.5, 0.5]], { step: 6 });
  K.link(approach[approach.length - 1], main[0]);
  const cross = [];
  for (const [x, y] of [[434, 0.25], [458, 0.5]]) {
    const at = main.reduce((best, n) => (Math.abs(ctx.nav.x[n] - x) < Math.abs(ctx.nav.x[best] - x) ? n : best), main[0]);
    const n1 = K.path([[x, -222.5, y], [x, R.z0 + 2, y]], { step: 5 }); const n2 = K.path([[x, -222.5, y], [x, R.z1 - 2, y]], { step: 5 });
    K.link(n1[0], at); K.link(n2[0], at); cross.push(...n1, ...n2);
  }
  // ---- the graves
  const Y0 = 0.25, Y1 = 0.5;
  const yAt = (x) => (x >= 448 ? Y1 : Y0);
  const stone = (type, x, z, o = {}) => { K.P(type, x, yAt(x), z, 'W', { scale: o.scale || 1 }); if (o.foot !== false) K.B(x + 1.6, x >= 448 ? 2 : 1, z - 0.125, x + 1.85, x >= 448 ? 3 : 2, z + 0.125, MAT.stone_foundation); };
  const readStone = (x, z, title, body) => K.read(x - 0.6, yAt(x) + 0.7, z, { title, body }, { r: 1.7, prompt: `Read the stone: ${title}` });
  // unnamed old stones, rows facing west, skipping the walks and the special plots
  const special = [[451, 463, -237, -226.5], [436, 446, -237.5, -228.5], [423, 432, -236.5, -233], [451, 466, -219, -212], [436, 446, -219.5, -214], [423, 432, -219.5, -212]];
  const inSpecial = (x, z) => special.some(([a, bb, c, d]) => x > a - 1 && x < bb + 1 && z > c - 1 && z < d + 1);
  const olds = ['hb_grave:old_a', 'hb_grave:old_b', 'hb_grave:old_c', 'hb_grave:old_d'];
  let nOld = 0;
  for (let x = 424; x < 467; x += 3.2) for (let z = R.z0 + 1.6; z < R.z1 - 1; z += 1.9) {
    if (Math.abs(z + 222.5) < 2.4 || Math.abs(x - 434) < 1.8 || Math.abs(x - 458) < 1.8 || Math.abs(x - 448) < 1.3 || inSpecial(x, z) || rng.chance(0.28)) continue;
    stone(rng.pick(x < 440 ? [olds[0], olds[0], olds[1], olds[2]] : [olds[0], olds[2], olds[3]]), x + rng.float(-0.2, 0.2), z + rng.float(-0.15, 0.15), { scale: rng.float(0.85, 1.1) }); nOld++;
  }
  // -- the Whitcomb plot on the high ground: granite curb, obelisk, Elias & Abigail, Samuel's cenotaph
  K.B(451, 2, -237, 463, 3, -236.75, MAT.granite); K.B(451, 2, -226.75, 463, 3, -226.5, MAT.granite); K.B(451, 2, -237, 451.25, 3, -226.5, MAT.granite); K.B(462.75, 2, -237, 463, 3, -226.5, MAT.granite);
  K.B(455, 2, -233, 457.5, 4, -230.5, MAT.granite); K.B(455.5, 4, -232.5, 457, 6, -231, MAT.granite); K.B(455.75, 6, -232.25, 456.75, 20, -231.25, MAT.granite);
  K.B(456, 20, -232, 456.5, 22, -231.5, MAT.granite);
  K.B(455.4, 3, -231.9, 455.5, 5, -231.6, MAT.trim_cream);
  ctx.props.add(textSignType('WHITCOMB', { bg: '#8e8b87', fg: '#f0ece2', border: '#8e8b87', scale: 1 / 28 }), 455.45, 1.05, -231.75, YAW.W, {});
  stone(graveType('elias', ['CAPT.', 'ELIAS', 'WHITCOMB', '1802-1879', 'FOUNDER'], 'marble', { w: 50, h: 62 }), 453, -234.5);
  stone(graveType('abigail', ['ABIGAIL', 'HIS WIFE', '1806-1881'], 'marble'), 453, -232.5);
  stone(graveType('samuel_w', ['SAMUEL', 'WHITCOMB', '1844-1867', 'LOST AT SEA'], 'cenotaph'), 453, -229.5);
  stone(graveType('henry_w', ['HENRY L.', 'WHITCOMB', '1851-1924'], 'granite'), 459.5, -234.5);
  K.P('vase_flowers', 452.2, Y1, -234.5, 'W', { tint: '#e0d0f0' });
  readStone(453, -234.5, 'Capt. Elias Whitcomb', 'CAPT. ELIAS WHITCOMB\nBorn Salem, Mass., March 3, 1802\nDied at Juniper Bay, November 18, 1879\n\nMaster of the schooner JUNIPER.\nHe found this cove in a storm, and kept his promise to come back.\nFOUNDER OF THIS TOWN\n\n"I have fought a good fight, I have finished my course."\n\n(A small bunch of asters has been left at the foot. The card says: "100 years, Grandfather. — A.W.")');
  readStone(453, -232.5, 'Abigail Whitcomb', 'ABIGAIL (HALE) WHITCOMB\nwife of Capt. Elias Whitcomb\n1806 – 1881\n\nShe kept the first school in the chapel, 1853–1860,\nand the town\'s books for twenty years after.\n"Her children arise up, and call her blessed."');
  readStone(453, -229.5, 'Samuel Whitcomb (cenotaph)', 'IN MEMORY OF\nSAMUEL WHITCOMB\nson of Elias & Abigail\nlost with the schooner MARY ELLEN\noff Gannet Ledge, October 1867\naged 23 years\n\nThere is no grave under this stone.');
  readStone(459.5, -234.5, 'Henry L. Whitcomb', 'HENRY LOWELL WHITCOMB\n1851 – 1924\nGrandson of the founder. Selectman, Commodore, and father of Augusta.\n"He gave the Cup and never won it."');
  // -- the Dunmores: Hezekiah the miller, Mercy, and the two lost on the MARY ELLEN
  K.B(436, 0, -237.5, 446, 1, -228.5, MAT.gravel);
  K.B(436, 1, -237.5, 446, 2, -237.25, MAT.granite); K.B(436, 1, -228.75, 446, 2, -228.5, MAT.granite);
  stone(graveType('hezekiah', ['HEZEKIAH', 'DUNMORE', '1799-1872', 'MILLER'], 'slate'), 438, -235.5);
  stone(graveType('mercy', ['MERCY', 'DUNMORE', '1803-1890'], 'slate'), 438, -233.5);
  stone(graveType('josiah', ['CAPT. JOSIAH', 'DUNMORE', '1826-1867', 'LOST AT SEA'], 'cenotaph'), 442, -235.5);
  stone(graveType('nathaniel', ['NATHANIEL', 'DUNMORE', '1848-1867', 'LOST AT SEA'], 'cenotaph'), 442, -233.5);
  stone(graveType('hannah', ['HANNAH', 'WIFE OF JOSIAH', '1830-1911'], 'marble'), 442, -231);
  readStone(438, -235.5, 'Hezekiah Dunmore', 'HEZEKIAH DUNMORE\n1799 – 1872\nHe built the sawmill on Mill Street in 1856 and sawed the timbers of half the town.\n"The hand of the diligent maketh rich."');
  readStone(438, -233.5, 'Mercy Dunmore', 'MERCY, WIFE OF HEZEKIAH DUNMORE\n1803 – 1890\nShe outlived her husband, her son and her grandson,\nand went every October to the stone on the quay.');
  readStone(442, -235.5, 'Capt. Josiah Dunmore (cenotaph)', 'IN MEMORY OF\nCAPT. JOSIAH DUNMORE\nmaster of the schooner MARY ELLEN\nlost with all hands off Gannet Ledge\nin the Great Gale of October 1867\naged 41\n\n"They that go down to the sea in ships, that do business in great waters;\nthese see the works of the Lord, and his wonders in the deep."');
  readStone(442, -233.5, 'Nathaniel Dunmore (cenotaph)', 'NATHANIEL DUNMORE\nmate of the MARY ELLEN, aged 19\nlost with his father, October 1867\n\n"Father and son, in the same sea."');
  readStone(442, -231, 'Hannah Dunmore', 'HANNAH (SNOW) DUNMORE\nwidow of Capt. Josiah Dunmore\n1830 – 1911\n\nWith the other widows of the MARY ELLEN she raised the memorial stone on the quay, 1869.\nShe kept her husband\'s sea-chest packed until she died.');
  // -- the MARY ELLEN cenotaphs along the south wall
  const me = [['Ezra Coffin', 35], ['Thomas Pruitt', 28], ['John Hallett', 44], ['William Doane', 31], ['Benjamin Crowell', 38], ['Hiram Nickerson', 52], ['Isaiah Snow', 14]];
  const lost = graveType('lost1867', ['LOST AT SEA', 'MARY ELLEN', 'OCT. 1867'], 'cenotaph', { w: 44, h: 50 });
  me.forEach(([n, a], i) => { const z = -219 + (i % 4) * 1.8, x = 424 + Math.floor(i / 4) * 5; stone(lost, x, z, { foot: false }); readStone(x, z, n + ' (cenotaph)', `IN MEMORY OF ${n.toUpperCase()}\naged ${a}\none of the eleven of the schooner MARY ELLEN\nlost off Gannet Ledge, October 1867\n\n"The sea gave them not back."\n\n(There is no grave here. His widow put up the stone so the family would have somewhere to stand.)`); });
  // -- the Civil War graves, with flags and G.A.R. markers
  const cw = [['CPL. AMOS', 'HALLETT', '22 MASS. INF.', '1838-1864', 'Cpl. Amos Hallett', 'Co. F, 22nd Massachusetts Infantry. Wounded at Petersburg, June 1864; died in hospital at City Point. Brought home by his brother in a coffin packed with salt.'],
    ['PVT. WILLIAM', 'SNOW', '19 MASS. INF.', '1843-1863', 'Pvt. William Snow', 'Co. B, 19th Massachusetts Infantry. Killed at Gettysburg, July 3, 1863, at the stone wall. Uncle of Isaiah Snow, the cabin boy of the MARY ELLEN.'],
    ['SGT. GEORGE', 'CROWELL', '35 MASS. INF.', '1835-1862', 'Sgt. George Crowell', 'Co. K, 35th Massachusetts Infantry. Killed at Antietam, September 17, 1862. "He carried the colors."'],
    ['PVT. THOMAS', 'COFFIN', '20 MASS. INF.', '1840-1864', 'Pvt. Thomas Coffin', 'Co. G, 20th Massachusetts Infantry. Killed in the Wilderness, May 1864. His body was not recovered; his mother had this stone cut anyway.'],
    ['PVT. JAMES', 'DOANE', '2 MASS. CAV.', '1845-1865', 'Pvt. James Doane', '2nd Massachusetts Cavalry. Died of fever at Richmond, April 1865, eleven days after the surrender. Aged 19.']];
  cw.forEach(([a, bb, c, d, t, body], i) => {
    const x = 438 + (i % 3) * 3, z = -219 + Math.floor(i / 3) * 3;
    stone(graveType('cw' + i, [a, bb, c, d], 'gar', { w: 46, h: 62 }), x, z);
    K.P('hb_grave_flag', x - 0.5, Y0, z + 0.5, 'W'); K.P('hb_gar_marker', x - 0.5, Y0, z - 0.5, 'W');
    readStone(x, z, t, `${t.toUpperCase()}\n${d}\n\n${body}\n\nA small flag and a bronze G.A.R. star mark the grave. The Legion post renews the flags every Memorial Day.`);
  });
  // -- the influenza row, 1918: plain granite, all the same autumn
  const flu = [['DR. JOSIAH', 'PIKE', '1868-1918', 'Dr. Josiah Pike', 'Physician. He tended the sick of this town until he was one of them. Father of Dr. Nathaniel Pike.'],
    ['ELLEN', 'MAYHEW', '1893-1918', 'Ellen Mayhew', 'Nurse, St. Luke\'s ward in the council chamber. Sister of Miss Harriet Mayhew, the librarian, who brings roses on the first Sunday of every month.'],
    ['ANNA', 'NOVAK', '1911-1918', 'Anna Novak', 'Aged 7. Casimir Novak\'s little sister. There is a china doll set into the stone behind a pane of glass.'],
    ['MICHAEL', 'HALLORAN', '1891-1918', 'Michael Halloran', 'Baker. Brother of Patrick Halloran II. "Rest, Mick — we\'ll keep the ovens going."'],
    ['MARY', 'DOANE', '1895-1918', 'Mary Doane', 'Telephone operator. She kept the switchboard open through the worst of October until she fell ill at it.'],
    ['BABY', 'KOWALSKI', 'OCT. 1918', 'Baby Kowalski', 'Infant son of Jan & Zofia Kowalski. "Our little one, three weeks."'],
    ['JOHN', 'SILVA', '1888-1918', 'John Silva', 'Fisherman, of the Azores and Pier 3.'],
    ['ROSA', 'CASTELLANO', '1900-1918', 'Rosa Castellano', 'Aged 18, eldest daughter of Giuseppe Castellano. Sal Sr.\'s aunt; his wife Rosa was named for her.']];
  flu.forEach(([a, bb, c, t, body], i) => {
    const x = 452 + i * 1.75, z = -216;
    stone(graveType('flu' + i, [a, bb, c], 'granite', { w: 40, h: 46 }), x, z, { foot: false });
    readStone(x, z, t, `${t.toUpperCase()}\n${c}\n\n${body}\n\nOne of the influenza row: forty-one stones, every one dated October or November, 1918.`);
  });
  for (let i = 8; i < 14; i++) stone(graveType('flu_x' + (i % 3), ['', 'OCT. 1918', ''], 'granite', { w: 40, h: 46 }), 452 + (i - 8) * 1.75 + 0.9, -213.6, { foot: false });
  K.read(451.5, 0.9, -217.5, { title: 'The Influenza Row', body: 'Forty-one plain granite stones stand in two rows here, all cut by the same stonemason in the spring of 1919, all dated October or November, 1918.\n\nFor six weeks that autumn the council chamber at City Hall was a hospital ward. St. Luke\'s Hospital was built by public subscription afterward "so that it need never be so again."' }, { r: 2.4 });
  // -- the widow's grave: fresh flowers, a watering can, a folding stool
  const hatch = graveType('hatch', ['CAPT. HORACE', 'HATCH', '1878-1949', 'MASTER MARINER'], 'granite', { w: 50, h: 52 });
  stone(hatch, 428, -231.5); K.P('vase_flowers', 427.3, Y0, -231.5, 'W', { tint: '#e8b0c0' }); K.P('flower_pot', 427.2, Y0, -230.8, 'W');
  readStone(428, -231.5, 'Capt. Horace Hatch', 'CAPT. HORACE HATCH\n1878 – 1949\nMaster Mariner\n"Home is the sailor, home from sea."\n\nThe chrysanthemums are fresh this morning, and the grass has been clipped by hand.\nOn the back of the stone, smaller: "And Admiral, who is not permitted in here, but tries."');
  const widow1 = K.spot('kneel', 426.9, Y0, -231.2, 'E', { act: 'garden', tags: ['mourn'], label: 'Placing flowers on a grave' });
  const widow2 = K.spot('stand', 426.8, Y0, -232.2, 'E', { act: 'pray', tags: ['mourn'], label: 'At a grave in the Old Burying Ground' });
  b.job('widow', [widow1, widow2], { shift: ['8:30', '10:30'], sex: 'F', age: [60, 85], title: 'placing flowers on her husband\'s grave' });
  // -- the sexton, old trees, a bench under the oak
  const sex1 = K.spot('stand', 431, Y0, -227, 'S', { act: 'rake', tags: ['work'] });
  const sex2 = K.spot('stand', 462, Y1, -218, 'W', { act: 'rake', tags: ['work'] });
  const sex3 = K.spot('stand', 444, Y0, -222.5, 'N', { act: 'sweep', tags: ['work'] });
  b.job('sexton', [sex1, sex2, sex3], { shift: ['7:00', '15:00'], outfit: 'farmer', title: 'sexton of the Old Burying Ground' });
  K.P('wheelbarrow', 432, Y0, -226, 'E'); K.P('leaf_pile', 430, Y0, -228, 'S'); K.P('leaf_pile', 460, Y1, -219, 'S');
  for (const [t, x, z, s] of [['tree_oak', 446, -228, 1.4], ['tree_maple_red', 425, -226, 1.2], ['tree_elm_yellow', 466, -228, 1.35], ['tree_oak', 432, -214, 1.3], ['tree_maple_orange', 459, -226, 1.15], ['tree_birch', 424, -237, 1.1], ['tree_oak', 467, -213, 1.25], ['tree_maple_red', 440, -212.5, 1.2]]) K.P(t, x, yAt(x), z, (x * 7) % 6.28, { cat: 'far', scale: s });
  for (let k = 0; k < 10; k++) { const x = rng.float(423, 467), z = rng.float(-237, -212); K.B(x, x >= 448 ? 2 : 1, z, x + rng.float(0.5, 1.5), x >= 448 ? 2 : 1, z + rng.float(0.5, 1.5), MAT.leaf_litter); }
  K.B(423, 1, -237.5, 468, 1, -237.25, MAT.leaf_litter);
  K.P('garden_bench', 446, Y0, -226.2, 'S');
  for (const dx of [-0.6, 0.6]) { K.spot('sit', 446 + dx, Y0, -226.4, 'S', { act: rng.pick(['sit', 'pray_sit', 'read']), tags: ['bench'], seat: 0.45 }); K.seat(446 + dx, Y0, -226.4, 'S'); }
  K.spot('stand', 455, Y1, -229.8, 'E', { act: 'look', tags: ['mourn'], label: 'At the Whitcomb plot' });
  void nOld; void cross;
  // ---- north of the tracks: the old wooded bank
  for (const [t, x, z] of [['tree_oak', 425, -262], ['tree_pine', 434, -266], ['tree_maple_red', 446, -258], ['tree_birch', 452, -265], ['tree_pine', 461, -260], ['tree_oak', 468, -267], ['tree_maple_orange', 440, -254]]) K.P(t, x, 0, z, (x * 3) % 6.28, { cat: 'far', scale: 1.1 });
  fieldstone(421, -251.5, 470, -250.75);
  finishSite(b);
}

// ============================================================ the town's edges: Haskell's farm stand, stone walls, apple trees
function buildEdges(ctx) {
  const fs = siteBuilding(ctx, 'Haskell Farm Stand', 'shop', { x0: 432, z0: -92, x1: 446, z1: -82 }, { street: 'Grand Avenue', est: 1921, hours: [8 * 60, 17 * 60], lore: 'Pumpkins, cider and Macintosh apples from the Haskell farm up the Grand Avenue road.' });
  const K = new Kit(ctx, fs), rng = ctx.rng.fork('edges');
  // ---- the stand: an open-fronted shed facing the road, a counter, pumpkins on hay, a scarecrow
  const x0 = 434, x1 = 442, z0 = -88, z1 = -84;
  K.B(x0 - 1, 0, z0 - 1, x1 + 1, 1, z1 + 1.5, MAT.gravel);
  K.B(x0, 1, z0, x1, 12, z0 + 0.25, MAT.wood_gray); K.B(x0, 1, z0, x0 + 0.25, 11, z1, MAT.wood_gray); K.B(x1 - 0.25, 1, z0, x1, 11, z1, MAT.wood_gray);
  for (let k = 0; k < 5; k++) K.B(x0 - 0.5, 12 - k * 0.0, z0 - 0.5 + k, x1 + 0.5, 13 - (k > 2 ? 1 : 0), z0 + 0.5 + k, MAT.roof_shingle_red);
  K.B(x0 - 0.5, 10, z1 - 0.25, x1 + 0.5, 11, z1 + 0.25, MAT.roof_shingle_red);
  K.B(x0 + 0.5, 1, z1 - 1.25, x1 - 0.5, 4, z1 - 0.5, MAT.wood_mid);
  K.B(x0 + 1, 12, z1 + 0.25, x1 - 1, 15, z1 + 0.5, MAT.trim_white);
  ctx.props.add(textSignType('HASKELL FARM', { bg: '#f0ece2', fg: '#8e2a24', border: '#8e2a24' }), (x0 + x1) / 2, 3.05, z1 + 0.55, YAW.S, {});
  ctx.props.add(textSignType('PUMPKINS - CIDER - MACS', { bg: '#2f4f3a', fg: '#f0e2b0' }), (x0 + x1) / 2, 0.3, z1 + 1.9, YAW.S, {});
  for (let k = 0; k < 4; k++) K.P('hay_bale', x0 - 2.5 + k * 0.1, 0.25, z1 + 1.2 - k * 1.3, 'S');
  for (let k = 0; k < 9; k++) K.P(k % 3 ? 'pumpkin_small' : 'pumpkin', x0 - 3 + rng.float(-0.6, 0.6), 0.25 + (k < 4 ? 0.5 : 0), z1 + 1 - (k % 4) * 1.2, rng.float(0, 6));
  for (let k = 0; k < 6; k++) K.P('pumpkin', x1 + 1.5 + (k % 3) * 1.1, 0.25, z1 + 0.6 - Math.floor(k / 3) * 1.2, rng.float(0, 6));
  K.P('fruit_bowl', x0 + 2, 1.0, z1 - 0.9, 'S'); K.P('fruit_bowl', x0 + 4, 1.0, z1 - 0.9, 'S'); K.P('milk_bottles', x0 + 6, 1.0, z1 - 0.9, 'S');
  K.P('scarecrow', x1 + 4, 0, z0 + 1, 'S'); K.P('truck_pickup', x0 - 6, 0, z0 + 2, 'S', { tint: '#4a5a3a', cat: 'far' }); K.P('wagon_red', x1 + 2, 0.25, z1 + 2.5, 'S');
  for (let k = 0; k < 6; k++) K.B(x1 + 5 + k * 0.6, 0, z0 - 1 + (k % 2) * 0.4, x1 + 5.3 + k * 0.6, 7 + (k % 3), z0 - 0.6 + (k % 2) * 0.4, MAT.hay);   // corn shocks
  const walk = K.nearestWalk((x0 + x1) / 2, -78, 6);
  const front = K.node((x0 + x1) / 2, z1 + 2.2, 0.25); if (walk >= 0) K.link(front, walk);
  const farmer = K.spot('stand', (x0 + x1) / 2, 0.25, z1 - 2.1, 'S', { act: 'counter', tags: ['work'], link: front, lines: ['Pumpkins a nickel, the big ones a dime.', 'Cider\'s this week\'s pressing. Sweet as you like.', 'Centennial or no, the cows still want milking.'] });
  fs.job('farmer', farmer, { shift: ['8:00', '17:00'], outfit: 'farmer', title: 'minding the farm stand' });
  const cust = K.spot('stand', (x0 + x1) / 2 + 1, 0.25, z1 + 0.9, 'N', { act: 'browse', tags: ['customer', 'shop', 'browse'], link: front });
  fs.customerSpots = [cust];
  K.read((x0 + x1) / 2, 1.2, z1 + 0.6, { title: 'Haskell Farm Stand', body: 'HASKELL FARM — est. 1921 — 2 miles up the road\n\nPumpkins ... 5¢ & 10¢\nMacintosh apples ... 35¢ peck\nSweet cider (this week\'s pressing) ... 40¢ gal.\nIndian corn ... 10¢ bunch\nFresh eggs ... 55¢ doz.\n\nHONOR BOX when nobody\'s here. We trust you. Mother counts it anyway.' }, { r: 2.2 });
  // a small orchard behind the stand
  for (let k = 0; k < 10; k++) K.P('tree_apple', 438 + (k % 5) * 6 + rng.float(-1, 1), 0, -104 - Math.floor(k / 5) * 7 + rng.float(-1, 1), rng.float(0, 6), { cat: 'far', scale: rng.float(0.85, 1.05) });
  // ---- old fieldstone walls along the town line (east edge), open where Grand Avenue passes
  const wall = (x, z0w, z1w) => { for (let z = z0w; z < z1w; z += 1.5) { const h = rng.int(2, 4); K.B(x, 0, z, x + rng.float(0.75, 1.1), h, Math.min(z1w, z + 1.5), rng.chance(0.35) ? MAT.rock : MAT.stone_foundation); if (rng.chance(0.2)) K.B(x - 0.25, 0, z + 0.25, x + 1.25, h - 1, z + 1, MAT.rock); } };
  wall(467.5, -205, -84); wall(467.5, -56, 212);
  // field wall round the orchard
  for (let x = 430; x < 467; x += 1.5) K.B(x, 0, -114.5, x + 1.5, rng.int(2, 3), -113.75, rng.chance(0.35) ? MAT.rock : MAT.stone_foundation);
  finishSite(fs);
}
