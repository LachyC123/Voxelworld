// Generators: commercial. Every storefront in Juniper Bay (lot kind 'shop', spec.shop = trade), plus the
// Bay Esso station, the Mill Street Garage, the Blue Lantern jazz club, Harbor Lanes and Elks Lodge No. 812.
// See docs/BUILDINGS.md. Local frame: x along the frontage (to the right from the street), y up, z into the lot.
//
// Shop anatomy (all derived from lot.w / lot.d):
//   ground floor  y 1..15 (tin ceiling at 16), slab of floor 2 at 17; upper floors every 13 voxels.
//   x 0..1 party wall, x 2..5 stair column (own street door, straight-run stairs to the flats above),
//   x 6 partition, x 7..W-3 the shop, back partition at Zb, stockroom behind, back door to the yard.
import { Building } from '../building.js';
import { MAT, shell, win, winRow, doorway, stairs, cornice, awning, fireEscape, chimney, parlour, diningSet, bedroom, bathroom, officeDesk } from './common.js';
import { linkToSidewalk } from '../streets.js';
import { textSignType } from '../../props/lib/special.js';
import { defineProp, PROP_DEFS } from '../../props/props.js';
import { layoutText } from '../../world/font.js';
import { PLAN } from '../layout.js';
import { RNG } from '../../core/rng.js';

export function register(GEN, SITES) {
  void SITES;
  GEN.shop = buildShop;
  GEN.gasstation = buildGasStation;
  GEN.garage = buildGarage;
  GEN.club = buildClub;
  GEN.bowling = buildBowling;
  GEN.lodge = buildLodge;
}

// ================================================================ constants & tiny helpers
const FH0 = 17, FHU = 13;                         // ground floor / upper floor heights (slab to slab)
const roofY = (n) => FH0 + (n - 1) * FHU;           // roof slab y for n floors
const slabY = (k) => (k === 0 ? 0 : FH0 + (k - 1) * FHU);
const flY = (k) => slabY(k) + 1;                    // first air layer of floor k
const tm = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
const Mt = (n) => MAT[n] ?? MAT.brick_red;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const WALLPAPERS = ['wallpaper_rose', 'wallpaper_green', 'wallpaper_blue', 'wallpaper_cream', 'wallpaper_yellow', 'plaster_cream', 'plaster_green', 'plaster_blue', 'wallpaper_teal', 'plaster_pink', 'plaster_yellow'];
const FABRIC = ['#6a7a5a', '#8a4a3a', '#5a6a8a', '#a88a5a', '#7a5a6a', '#4a6a6a', '#9a6a4a', '#6a5a4a'];
const QUILT = ['#c86a6a', '#6a8ac8', '#e0c070', '#8ab88a', '#d8a0b8', '#e8e0d0', '#a87ac8'];
const CAR_TINTS = ['#2a3a5a', '#6a2a2a', '#3a5a3a', '#d8d0b8', '#2a2a2e', '#7a8a9a', '#a8743a', '#5a8a8a', '#8a2a3a', '#c8c0a0'];

// Voxel "goods" palettes for shelving (each voxel is a 25 cm lump of stock)
const G = {
  grocery: ['sign_red', 'sign_white', 'sign_yellow', 'sign_green', 'sign_orange', 'canvas_tan', 'sign_cream', 'sign_blue', 'trim_red', 'sign_brown'],
  hardware: ['iron', 'steel', 'sign_red', 'rust', 'wood_light', 'trim_green', 'sign_yellow', 'canvas_tan', 'steel_red', 'sign_blue'],
  books: ['bookshelf_books', 'bookshelf_books', 'bookshelf_books', 'trim_red', 'sign_navy', 'trim_green', 'sign_brown'],
  pharmacy: ['glass_stained_red', 'glass_green', 'glass_stained_blue', 'glass_dark', 'sign_white', 'enamel_white', 'glass_stained_gold', 'sign_cream', 'enamel_mint'],
  boxes: ['sign_cream', 'canvas_tan', 'sign_white', 'trim_brown', 'sign_brown', 'wood_pale', 'canvas_white'],
  fabric: ['trim_blue', 'sign_navy', 'wood_mid', 'canvas_tan', 'trim_dark', 'granite', 'trim_brown', 'sign_red', 'flag_blue', 'stucco_sage', 'wood_light', 'carpet_green'],
  candy: ['sign_red', 'tile_pink', 'sign_yellow', 'sign_white', 'enamel_mint', 'sign_orange', 'glass_stained_red', 'glass_stained_green', 'glass_stained_purple', 'carpet_rose'],
  toys: ['sign_red', 'sign_yellow', 'sign_blue', 'sign_green', 'sign_orange', 'sign_white', 'flag_blue', 'sign_teal'],
  bottles: ['glass_green', 'glass_dark', 'glass_stained_gold', 'glass_stained_red', 'glass', 'glass_stained_green', 'glass_green'],
  bundles: ['canvas_tan', 'sign_brown', 'canvas_white', 'canvas_tan', 'sign_cream', 'wood_pale'],
  marine: ['rust', 'iron', 'sign_yellow', 'canvas_tan', 'wood_light', 'trim_gold', 'sign_red', 'steel', 'sign_white'],
  records: ['trim_black', 'sign_red', 'sign_cream', 'sign_blue', 'sign_yellow', 'trim_black', 'sign_orange'],
  radio: ['wood_mid', 'wood_dark', 'enamel_white', 'trim_brown', 'sign_cream', 'enamel_black'],
  flowers: ['flowerbed_red', 'flowerbed_yellow', 'flowerbed_purple', 'leaves_green', 'canvas_white', 'tile_pink'],
  hats: ['canvas_tan', 'carpet_rose', 'trim_dark', 'sign_navy', 'canvas_white', 'tile_pink', 'wood_light'],
};

// Faded painted advertisements for exposed brick side walls
const GHOST_ADS = [
  ['UNEEDA BISCUIT'], ['MAIL POUCH TOBACCO', 'TREAT YOURSELF TO THE BEST'], ['DRINK MOXIE', 'NERVE FOOD'], ['CASTORIA', 'CHILDREN CRY FOR IT'],
  ['GOLD MEDAL FLOUR', 'EVENTUALLY - WHY NOT NOW?'], ['SALADA TEA'], ['BULL DURHAM', 'SMOKING TOBACCO'], ['READ THE COURIER', 'SINCE 1866'],
  ['HOOD MILK', 'SINCE 1846'], ['FATIMA', 'TURKISH CIGARETTES'], ['ARM & HAMMER', 'BAKING SODA'], ['BOSTON & JUNIPER BAY R.R.', 'FOUR TRAINS DAILY'],
  ["HALLORAN'S BREAD", '5 CENTS A LOAF'], ['CASTELLANO FISH CO.', 'FRESH EVERY MORNING'], ['HARBOR CANNING CO.', 'SARDINES & MACKEREL'],
  ['THE WHITCOMB HOTEL', '70 ROOMS - STEAM HEAT'], ["HARLOW'S", 'DRY GOODS SINCE 1878'], ['COAL & ICE', 'BAYSIDE ICE CO. - TEL. 212'],
  ['BEAL LIVERY', 'HORSES TO LET'], ['LYDIA PINKHAM', 'VEGETABLE COMPOUND'], ['DR. MILES NERVINE'], ['WHITCOMB POINT CIGARS', '5 CENTS'],
];

// ---------------------------------------------------------------- custom props (lettering)
// Gold-leaf / painted lettering with no background, for shop windows and letter boards.
function glassType(text, o = {}) {
  const color = o.color || '#e2b84a', font = o.font || 'small', px = o.px || 1 / 16;
  const name = `com_glass:${text}:${color}:${font}:${px.toFixed(4)}`;
  if (PROP_DEFS.has(name)) return name;
  const L = layoutText(text, font);
  const w = L.width + 2, h = L.height + 2;
  defineProp(name, {
    size: [w, h, 1], scale: px, origin: [w / 2, 0, 0.5], cat: o.cat || 'exterior',
    build(m) { if (o.shadow) m.text(text, 2, 0, 0, o.shadow, { font }); m.text(text, 1, 1, 0, color, { font }); },
  });
  return name;
}
// width in local voxels of a glass lettering prop
const glassW = (text, o = {}) => (layoutText(text, o.font || 'small').width + 2) * (o.px || 1 / 16) * 4;

// ---------------------------------------------------------------- wall helpers
function wallX(f, x0, x1, y, z, h, mat, gaps = [], o = {}) {
  if (x1 <= x0) return;
  f.box(x0, y, z, x1 - x0, h, 1, mat);
  if (o.wains) f.box(x0, y, z, x1 - x0, 4, 1, o.wains);
  for (const g of gaps) f.carve(g.at, y, z, g.w ?? 4, Math.min(h, g.h ?? 9), 1);
}
function wallZ(f, z0, z1, y, x, h, mat, gaps = [], o = {}) {
  if (z1 <= z0) return;
  f.box(x, y, z0, 1, h, z1 - z0, mat);
  if (o.wains) f.box(x, y, z0, 1, 4, z1 - z0, o.wains);
  for (const g of gaps) f.carve(x, y, g.at, 1, Math.min(h, g.h ?? 9), g.w ?? 4);
}

// ---------------------------------------------------------------- neighbours (for exposed side walls)
function shopDepth(D) { return clamp(D - 10, 24, 96); }
function shopFloors(spec, D) {
  const T = TRADES[spec.shop] || {};
  const bd = shopDepth(D);
  let n = T.floors ?? (new RNG('fl:' + (spec.name || '')).chance(0.5) ? 3 : 2);
  if (n >= 3 && bd < 74) n = 2;
  if (bd < 44) n = 1;
  return n;
}
function lotDepthM(l) { return (l.facing === 'N' || l.facing === 'S') ? l.m.z1 - l.m.z0 : l.m.x1 - l.m.x0; }
function estHeight(l) {
  const k = l.spec.kind;
  if (k === 'shop') { const T = TRADES[l.spec.shop] || {}; if (T.custom) return 20; return roofY(shopFloors(l.spec, Math.round(lotDepthM(l) * 4))) + 3; }
  if (k === 'rowhouse') return 39;
  if (k === 'house') return 0;
  if (k === 'club') return 24; if (k === 'bowling') return 26; if (k === 'lodge') return 42; if (k === 'garage') return 26;
  return 1e9;
}
function neighbour(lot, side) {
  const m = lot.m, fac = lot.facing;
  const R = { N: ['x', m.x0], S: ['x', m.x1], E: ['z', m.z0], W: ['z', m.z1] }[fac];
  const L = { N: ['x', m.x1], S: ['x', m.x0], E: ['z', m.z1], W: ['z', m.z0] }[fac];
  const [ax, v] = side === 'right' ? R : L;
  for (const l of PLAN) {
    if (l.m === m) continue;
    const q = l.m;
    if (ax === 'x') { if ((Math.abs(q.x0 - v) < 0.6 || Math.abs(q.x1 - v) < 0.6) && Math.min(q.z1, m.z1) - Math.max(q.z0, m.z0) > 2) return l; }
    else if ((Math.abs(q.z0 - v) < 0.6 || Math.abs(q.z1 - v) < 0.6) && Math.min(q.x1, m.x1) - Math.max(q.x0, m.x0) > 2) return l;
  }
  return null;
}
const neighbourHeight = (lot, side) => { const n = neighbour(lot, side); return n ? estHeight(n) : 0; };
// is this lot on the flood plain of the 1938 hurricane (Harbor Street / waterfront)?
const floodLot = (lot) => lot.street === 'Harbor Street' || (lot.m && lot.m.x0 < 50);

// ================================================================ fit-out toolkit
function P(S, type, x, y, z, rot = 0, o = {}) { return S.b.prop(type, x, y, z, rot, o); }
function spotAt(S, pose, x, z, rot, act, tags, o = {}) {
  return S.b.spot(pose, x, o.y ?? 1, z, rot, { room: o.room ?? S.sales, act, tags, seat: o.seat, label: o.label, lines: o.lines, held: o.held });
}
function stand(S, x, z, rot, act, tags = [], o = {}) { return spotAt(S, 'stand', x, z, rot, act, tags, o); }
function sit(S, x, z, rot, act, tags = [], seat = 0.45, o = {}) { return spotAt(S, 'sit', x, z, rot, act, tags, { ...o, seat }); }
function browse(S, x, z, rot, o = {}) { const s = stand(S, x, z, rot, o.act || 'browse', ['browse', 'shop', ...(o.tags || [])], o); S.cust.push(s); return s; }
function customer(S, x, z, rot, o = {}) { const s = stand(S, x, z, rot, o.act || 'talk', ['shop', 'customer', ...(o.tags || [])], o); S.cust.push(s); return s; }
function job(S, role, spots, shift, o = {}) { return S.b.job(role, spots, { shift, ...o }); }
function read(S, x, y, z, title, body, o = {}) { S.b.readable(x, y, z, { title, body }, o); }
function sign(S, text, x, y, z, rot = 0, o = {}) {
  return S.b.prop(textSignType(text, { bg: o.bg || '#1d1d22', fg: o.fg || '#e8c870', border: o.border }), x, y, z, rot, { scale: o.scale || 1, cat: o.cat });
}
function glass(S, text, x, y, z, rot = 0, o = {}) { return S.b.prop(glassType(text, o), x, y, z, rot, {}); }
function lamps(S, pts, y = 13, type = 'ceiling_lamp') { for (const [x, z] of pts) P(S, type, x, y, z, 0); }
// standard grid of pendant lamps over the sales floor
function shopLamps(S, type = 'ceiling_lamp', n = null) {
  const L = S.Zb - 4, k = n ?? clamp(Math.round(L / 14), 2, 5);
  const cx = (S.X0 + S.X1) / 2;
  for (let i = 0; i < k; i++) P(S, type, cx, type === 'chandelier' ? 12 : 13, 6 + (i + 0.5) * (L / k), 0);
}

// Voxel shelving against a wall. wall: 'L' (x = X0, facing +x), 'R' (x = X1-1, facing -x), 'B' (z = Zb-1, facing -z),
// 'A' (alcove wall x = 2, facing +x). a0..a1 = extent along the wall.
function shelfWall(S, wall, a0, a1, o = {}) {
  const f = S.f, rng = S.rng;
  if (a1 - a0 < 2) return;
  const top = o.top ?? 12, dep = o.depth ?? 2, board = o.board ?? MAT.wood_mid, base = o.base ?? MAT.wood_dark;
  const levels = o.levels ?? [5, 8, 11].filter((l) => l < top);
  const goods = (o.goods ?? G.grocery).map((n) => (typeof n === 'number' ? n : Mt(n)));
  const at = typeof wall === 'object' ? wall.at : wall === 'L' ? S.X0 : wall === 'R' ? S.X1 - 1 : wall === 'A' ? 2 : S.Zb - 1;
  const axis = typeof wall === 'object' ? wall.axis : wall === 'B' ? 'z' : 'x';
  const dir = typeof wall === 'object' ? wall.dir : (wall === 'L' || wall === 'A') ? 1 : -1;
  const put = (a, y, d, la, h, dd, mat) => {
    if (la <= 0 || dd <= 0 || h <= 0) return;
    if (axis === 'x') f.box(dir > 0 ? at + d : at - d - dd + 1, y, a, dd, h, la, mat);
    else f.box(a, y, dir > 0 ? at + d : at - d - dd + 1, la, h, dd, mat);
  };
  const cab = o.cabinet ?? 2;
  if (cab) put(a0, 1, 0, a1 - a0, cab, dep, base);
  for (const y of levels) put(a0, y, 0, a1 - a0, 1, dep, board);
  const tiers = [cab ? cab + 1 : 1, ...levels.map((l) => l + 1)].filter((y) => y < top);
  for (const y of tiers) {
    const nxt = [...levels, top].find((l) => l > y) ?? top;
    const room = nxt - y;
    let a = a0 + 1;
    while (a < a1 - 1) {
      const la = Math.min(rng.int(1, o.seg ?? 3), a1 - 1 - a);
      if (!rng.chance(o.gap ?? 0.18)) put(a, y, 0, la, Math.min(room, rng.chance(o.tall ?? 0.35) ? 2 : 1), rng.chance(0.6) ? dep : 1, rng.pick(goods));
      a += la;
    }
  }
  const bay = o.bay ?? 8;
  for (let a = a0; a < a1; a += bay) put(a, cab ? cab + 1 : 1, 0, 1, top - (cab ? cab + 1 : 1), dep, board);
  put(a1 - 1, cab ? cab + 1 : 1, 0, 1, top - (cab ? cab + 1 : 1), dep, board);
  put(a0, top, 0, a1 - a0, 1, dep + (o.crown === false ? 0 : 1), o.crownMat ?? board);
  if (o.ladder) { // rolling library ladder on a brass rail
    put(a0, top - 1, dep, a1 - a0, 1, 1, MAT.trim_gold);
    const la = a0 + Math.floor((a1 - a0) * rng.float(0.3, 0.7));
    put(la, 1, dep + 1, 1, top - 1, 1, MAT.wood_light); put(la + 2, 1, dep + 1, 1, top - 1, 1, MAT.wood_light);
    for (let y = 3; y < top - 1; y += 3) put(la + 1, y, dep + 1, 1, 1, 1, MAT.wood_light);
  }
}
// A built-in counter (voxel) from (x, z) sized sx × sz; top at y = h (surface at h+1).
function vCounter(S, x, z, sx, sz, o = {}) {
  const f = S.f, h = o.h ?? 4, y = o.y ?? 1;
  f.box(x, y, z, sx, h - 1, sz, o.base ?? MAT.wood_dark);
  f.box(x, y + h - 1, z, sx, 1, sz, o.top ?? MAT.wood_light);
  if (o.kick) { if (sz > sx) f.box(o.kickSide === 'x+' ? x + sx - 1 : x, y, z, 1, 1, sz, o.kick); else f.box(x, y, o.kickSide === 'z+' ? z + sz - 1 : z, sx, 1, 1, o.kick); }
}
// Glass display case with voxel goods inside: base y 1..2, goods layer y 3 (with glass between), glass top y 4.
function vCase(S, x, z, sx, sz, goods, o = {}) {
  const f = S.f, rng = S.rng;
  f.box(x, 1, z, sx, 2, sz, o.base ?? MAT.wood_dark);
  f.box(x, 3, z, sx, 1, sz, MAT.glass);
  f.box(x, 4, z, sx, 1, sz, o.lid ?? MAT.glass);
  const long = sx >= sz;
  const n = long ? sx : sz;
  for (let i = 1; i < n - 1; i++) {
    if (rng.chance(0.35)) continue;
    const m = Mt(rng.pick(goods));
    if (long) f.box(x + i, 3, z + (sz > 2 ? 1 : 0), 1, 1, Math.max(1, sz - 2), m); else f.box(x + (sx > 2 ? 1 : 0), 3, z + i, Math.max(1, sx - 2), 1, 1, m);
  }
  f.box(x, 4, z, sx, 1, 1, o.rim ?? MAT.trim_gold);
}
// Row of props from a to b along x (or z) at fixed other coordinate.
function propRow(S, type, a, b, fixed, rot, step, axis = 'x', y = 1, o = {}) {
  for (let t = a; t <= b + 1e-6; t += step) P(S, type, axis === 'x' ? t : fixed, y, axis === 'x' ? fixed : t, rot, o);
}
// A booth (built-in voxel benches + table) standing out from a wall. Units run along `axis` from u (bench, table,
// bench = 7 voxels); the booth is `depth` voxels deep from w0 (flip: grows toward -coordinate). Returns seat spots.
function vBooth(S, u, w0, o = {}) {
  const f = S.f, y = o.y ?? 1, room = o.room ?? S.sales, ax = o.axis ?? 'x', dep = o.depth ?? 4, fl = o.flip ? -1 : 1;
  const seatM = o.seat ?? MAT.velvet_red, frame = o.frame ?? MAT.wood_dark, top = o.top ?? MAT.counter_formica;
  const bx = (a, la, t, lt, yy, h, m) => { const b0 = fl > 0 ? w0 + t : w0 - t - lt + 1; if (ax === 'x') f.box(u + a, yy, b0, la, h, lt, m); else f.box(b0, yy, u + a, lt, h, la, m); };
  const pos = (a, t) => { const w = fl > 0 ? w0 + t : w0 + 1 - t; return ax === 'x' ? [u + a, w] : [w, u + a]; };
  const rPlus = ax === 'x' ? 1 : 2, rMinus = ax === 'x' ? 3 : 0;
  bx(0, 2, 0, dep, y, 1, frame); bx(0, 2, 0, dep, y + 1, 1, seatM); bx(0, 1, 0, dep, y + 2, 3, seatM); bx(0, 1, 0, dep, y + 5, 1, frame);
  bx(5, 2, 0, dep, y, 1, frame); bx(5, 2, 0, dep, y + 1, 1, seatM); bx(6, 1, 0, dep, y + 2, 3, seatM); bx(6, 1, 0, dep, y + 5, 1, frame);
  bx(3, 1, 1, Math.max(1, dep - 2), y, 2, o.leg ?? MAT.chrome); bx(2, 3, 0, dep - 1, y + 2, 1, top);
  const spots = [], tags = o.tags ?? ['eat_out'], act = o.act ?? 'eat';
  const ts = dep >= 4 ? [1, dep - 1] : [dep / 2];
  for (const t of ts) {
    const [ax1, az1] = pos(1.3, t), [ax2, az2] = pos(5.7, t);
    spots.push(S.b.spot('sit', ax1, y, az1, rPlus, { room, act, tags, seat: 0.5 }));
    spots.push(S.b.spot('sit', ax2, y, az2, rMinus, { room, act, tags, seat: 0.5 }));
    if (o.settings !== false) { const [p1x, p1z] = pos(2.6, t), [p2x, p2z] = pos(4.4, t); P(S, 'table_setting', p1x, y + 3, p1z, rMinus); P(S, 'table_setting', p2x, y + 3, p2z, rPlus); }
  }
  return spots;
}
// Stools along x (or z with o.axis = 'z') in front of a counter; customers face rot. Returns spots.
function stoolRow(S, a0, a1, fixed, rot, o = {}) {
  const out = [];
  for (let t = a0; t <= a1 + 1e-6; t += o.step ?? 3) {
    const x = o.axis === 'z' ? fixed : t, z = o.axis === 'z' ? t : fixed;
    P(S, o.type ?? 'stool_tall', x, o.y ?? 1, z, rot, { tint: o.tint });
    out.push(S.b.spot('sit', x, o.y ?? 1, z, rot, { room: o.room ?? S.sales, act: o.act ?? 'eat', tags: o.tags ?? ['eat_out'], seat: o.seat ?? 0.7 }));
  }
  return out;
}
// Voxel television set (a 1 m console) with a glowing screen on its -z face (or +z with o.back).
function vTV(S, x, y, z, o = {}) {
  const f = S.f, w = o.w ?? 4, h = o.h ?? 4, d = o.d ?? 2;
  f.box(x, y, z, w, h, d, o.cab ?? MAT.wood_mid);
  f.box(x + 1, y + 1, o.back ? z + d - 1 : z, Math.max(1, w - 2), Math.max(1, h - 2), 1, MAT.tv_screen);
}

// ================================================================ the shop building (shell, facade, upstairs)
function buildShop(ctx, lot, spec) {
  const T = TRADES[spec.shop] || TRADES.general;
  const rng = ctx.rng.fork('com:' + (spec.name || '') + ':' + lot.x + ',' + lot.z);
  if (T.custom) return T.custom(ctx, lot, spec, T, rng);
  const S = shopShell(ctx, lot, spec, T, rng);
  T.fit(S);
  for (const [a, c] of S.windows) if (T.window) T.window(S, a, c);
  shopFinish(S);
  return S.b;
}

function shopStyle(T, rng) {
  const s = T.style || {};
  const P1 = (v, arr) => Mt(v ?? rng.pick(arr));
  const aw = s.awning ?? rng.pick([['awning_red', 'canvas_white'], ['awning_green', 'canvas_white'], ['awning_blue', 'canvas_white'], ['awning_yellow', 'canvas_white'], ['awning_teal', 'canvas_white'], ['awning_solid_red', 'canvas_white'], ['awning_solid_green', 'canvas_white'], ['awning_solid_navy', 'canvas_white']]);
  return {
    outer: P1(s.outer, ['brick_red', 'brick_red', 'brick_dark', 'brick_brown', 'brick_orange', 'brick_yellow', 'brick_paint_red', 'brick_white', 'brick_red', 'brick_brown']),
    trim: P1(s.trim, ['limestone', 'trim_cream', 'granite', 'trim_white', 'sandstone', 'limestone']),
    frame: P1(s.frame, ['trim_green', 'trim_dark', 'trim_black', 'trim_red', 'trim_blue', 'iron_green', 'wood_dark', 'trim_teal', 'trim_brown']),
    bulk: P1(s.bulk, ['wood_panel', 'wood_dark', 'marble', 'granite', 'tile_mint', 'enamel_black', 'wood_panel']),
    awA: Mt(aw[0]), awB: Mt(aw[1]),
    awning: s.awningMode ?? rng.pick(['out', 'out', 'out', 'rolled', 'out']),
    signBg: P1(s.signBg, ['sign_black', 'sign_green', 'sign_navy', 'sign_red', 'sign_black', 'trim_brown']),
    signFg: P1(s.signFg, ['sign_gold', 'sign_gold', 'sign_white', 'sign_cream', 'sign_gold']),
    floor0: P1(s.floor, ['floor_oak', 'floor_oak_z', 'floor_linoleum', 'floor_checker', 'floor_pine_z']),
    wall0: P1(s.wall, ['plaster_cream', 'plaster_white', 'wallpaper_cream', 'plaster_green', 'plaster_yellow']),
    wains: s.wains === null ? null : P1(s.wains, ['wood_panel', 'wood_panel_light', 'wood_dark', 'wood_panel']),
    ceil0: P1(s.ceil, ['ceiling_tin', 'ceiling_tin', 'ceiling_tin', 'ceiling']),
    backFloor: P1(s.backFloor, ['floor_concrete', 'floor_pine', 'floor_oak', 'floor_concrete']),
    vest: P1(s.vest, ['floor_terrazzo', 'floor_tile_white', 'floor_checker', 'floor_marble', 'floor_bigcheck']),
    platform: P1(s.platform, ['wood_panel_light', 'carpet_red', 'wood_mid', 'carpet_green', 'carpet_beige']),
    winFrame: P1(s.winFrame, ['trim_white', 'trim_cream', 'trim_dark', 'trim_green', 'trim_white']),
    door: s.door ?? rng.pick(['center', 'center', 'left', 'right']),
    doorTint: s.doorTint ?? rng.pick(['#2a3a2a', '#4a2a1a', '#1d1d22', '#6a2a24', '#2a3a5a', '#5a4a3a']),
    pier: (() => { const n = s.pier ?? rng.pick(['same', 'same', 'iron_green', 'granite', 'trim_dark']); return n === 'same' ? null : Mt(n); })(),
    oriel: s.oriel ?? rng.chance(0.25),
    gable: !!s.gable, roofMat: Mt(s.roofMat ?? 'roof_shingle_gray'),
  };
}

function buildYear(lot, spec, rng) {
  if (lot.street === 'Market Street') return 1903 + rng.int(0, 2);  // rebuilt after the Great Fire of 1902
  if (spec.built) return spec.built;
  if (spec.est && spec.est >= 1868 && rng.chance(0.45)) return spec.est;
  return rng.pick([1872, 1878, 1884, 1889, 1891, 1896, 1899, 1907, 1910, 1912, 1915, 1922, 1926, 1928]);
}

function shopShell(ctx, lot, spec, T, rng) {
  const W = lot.w, D = lot.d;
  const name = spec.name || T.label || 'Shop';
  const est = spec.est || T.est || null;
  const hours = (T.hours || ['9:00', '18:00']).map(tm);
  const b = new Building(ctx, { name, kind: 'shop', lot, address: lot.address, established: est, lore: T.lore ? T.lore(spec) : null, hours, tags: ['shop', spec.shop || 'shop'] });
  const f = b.f;
  const floors = shopFloors(spec, D);
  const bd = shopDepth(D);
  const H = roofY(floors);
  const st = shopStyle(T, rng);
  if (!st.pier) st.pier = st.outer;
  const built = buildYear(lot, spec, rng);
  const hasUp = floors > 1;
  const X0 = hasUp ? 7 : 2, X1 = W - 2;
  const backD = T.backD ?? clamp(Math.round((bd - 4) * 0.27), 12, 24);
  const Zb = bd - 3 - backD;
  const hallEnd = 38;
  const S = { ctx, b, f, rng, T, spec, lot, W, D, bd, H, floors, st, built, est, name, hasUp, X0, X1, Zb, Z0: 4, y: 1, cust: [], windows: [], upWalls: [], hallEnd };
  if (T.pre) T.pre(S);

  // ---- ground, shell, floors, finishes
  f.box(0, -1, 0, W, 1, bd, MAT.stone_foundation);
  if (D > bd) f.box(0, -1, bd, W, 1, D - bd, Mt(T.yard || rng.pick(['concrete', 'gravel', 'dirt', 'concrete'])));
  shell(f, 0, 0, 0, W, H, bd, st.outer, null, 2);
  f.box(1, 0, 1, W - 2, 1, bd - 2, st.floor0);
  f.box(2, 0, Zb + 1, W - 4, 1, bd - 3 - Zb, st.backFloor);
  for (let k = 1; k < floors; k++) f.box(1, slabY(k), 1, W - 2, 1, bd - 2, Mt(rng.pick(['floor_oak', 'floor_pine', 'floor_walnut', 'floor_oak_z'])));
  f.box(0, H, 0, W, 1, bd, MAT.roof_tar);
  f.walls(1, 1, 1, W - 2, FH0 - 1, bd - 2, st.wall0, 1);
  if (st.wains) f.walls(1, 1, 1, W - 2, 4, bd - 2, st.wains, 1);
  f.box(2, FH0 - 1, 2, W - 4, 1, bd - 4, st.ceil0);
  f.box(2, FH0 - 2, 2, W - 4, 1, 1, st.wains || MAT.wood_dark); // cornice moulding along the front
  for (let k = 1; k < floors; k++) {
    const wm = Mt(rng.pick(WALLPAPERS));
    S.upWalls[k] = wm;
    f.walls(1, flY(k), 1, W - 2, FHU - 1, bd - 2, wm, 1);
    f.box(2, (k + 1 < floors ? slabY(k + 1) : H) - 1, 2, W - 4, 1, bd - 4, MAT.ceiling);
  }

  // ---- ground floor plan: stair column, shop, alcove, stockroom
  const wallM = st.wall0;
  if (hasUp) {
    wallZ(f, 2, hallEnd, 1, 6, 15, wallM, [], { wains: st.wains });
    f.box(2, 1, hallEnd, 4, 15, 1, wallM);
    f.box(2, 0, 2, 4, 1, 2, MAT.floor_tile_white);
    stairs(f, 2, 1, 4, '+z', FH0, { w: 4, run: 2, mat: MAT.wood_mid, rail: false });
  }
  wallX(f, 2, W - 2, 1, Zb, 15, wallM, [{ at: W - 10, w: 4 }], { wains: st.wains });
  const doorC = st.door === 'left' ? X0 + 3 : st.door === 'right' ? X1 - 3 : Math.round((X0 + X1) / 2);
  S.doorC = doorC;
  S.sales = b.room(T.front || 'Shop', X0, 1, 2, X1 - X0, 15, Zb - 2, { lightMode: 'always', kind: 'shop', public: true, lightColor: T.light || [1, 0.9, 0.74], nav: [doorC, Math.min(Zb - 3, 12)] });
  if (hasUp && Zb - hallEnd > 4) {
    S.alcove = b.room(T.front || 'Shop', 2, 1, hallEnd + 1, 4, 15, Zb - hallEnd - 1, { lightMode: 'always', kind: 'shop', public: true });
    b.door(S.sales, S.alcove, 6, 1, (hallEnd + 1 + Zb) / 2, { leaf: false });
    S.alcoveZ = [hallEnd + 1, Zb];
  }
  S.back = b.room(T.back || 'Stockroom', 2, 1, Zb + 1, W - 4, 15, bd - 3 - Zb, { lightMode: 'auto', kind: 'work' });
  b.door(S.sales, S.back, W - 8, 1, Zb, { leaf: 'door_wood', tint: '#6a5a44' });
  if (hasUp) S.hall = b.room('Stair Hall', 2, 1, 2, 4, 15, hallEnd - 2, { lightMode: 'auto', nav: [4, 3], public: false });

  // ---- storefront (the entrance must be created before the stair door so it is the main one)
  storefront(S);
  if (hasUp) {
    f.carve(2, 1, 0, 4, 10, 2);
    f.box(2, 0, 0, 4, 1, 2, MAT.granite);
    f.box(2, 11, 0, 4, 2, 1, MAT.glass); f.carve(2, 11, 1, 4, 2, 1);
    f.box(1, 1, -1, 1, 13, 1, st.frame === st.outer ? MAT.trim_dark : st.frame);
    b.entrance(S.hall, 4, 1, 1, { outZ: -5, leaf: 'door_wood', tint: rng.pick(['#3a2a1a', '#2a3a2a', '#5a2a24', '#1d1d22']) });
    glass(S, String(lot.number), 4, 11.3, -0.06, 0, { color: '#e8c860' });
  }
  // ---- upper floors (decide their use first: offices get wider windows with lettering)
  S.upUse = {};
  for (let k = 1; k < floors; k++) S.upUse[k] = (T.upper && T.upper[k - 1]) || (k === 1 ? 'apt' : rng.pick(['apt', 'apt', 'store', 'office']));
  for (let k = 1; k < floors; k++) facadeUpper(S, k);
  if (hasUp) upperFloors(S);
  // ---- cornice, parapet, roof
  roofline(S);
  backside(S);
  for (const side of ['left', 'right']) sideWall(S, side);
  return S;
}

function storefront(S) {
  const { f, b, W, st, X0, X1, rng } = S;
  const x0 = X0, x1 = X1, wdt = x1 - x0;
  let dx = S.doorC - 2;
  dx = clamp(dx, x0 + 1, x1 - 5);
  S.doorX = dx;
  f.carve(x0, 1, 0, wdt, 13, 2);
  f.box(x0, 1, 0, wdt, 2, 1, st.bulk);
  f.box(x0, 3, 0, wdt, 8, 1, MAT.glass_shop);
  f.box(x0, 11, 0, wdt, 1, 1, st.frame);
  f.box(x0, 12, 0, wdt, 2, 1, MAT.glass);
  f.box(x0, 1, 0, 1, 13, 1, st.frame); f.box(x1 - 1, 1, 0, 1, 13, 1, st.frame);
  for (let x = x0 + 4; x < x1 - 2; x += 4) f.box(x, 12, 0, 1, 2, 1, st.frame);
  // door recess (tiled vestibule, glass returns)
  f.carve(dx, 1, 0, 4, 10, 3);
  f.box(dx, 0, 0, 4, 1, 3, st.vest);
  for (const sx of [dx - 1, dx + 4]) if (sx > x0 && sx < x1 - 1) { f.box(sx, 1, 0, 1, 2, 3, st.bulk); f.box(sx, 3, 0, 1, 8, 3, MAT.glass_shop); f.box(sx, 11, 0, 1, 1, 3, st.frame); }
  f.box(dx, 11, 0, 4, 1, 3, st.frame);
  f.box(dx - 1, 1, 3, 1, 10, 1, st.frame); f.box(dx + 4, 1, 3, 1, 10, 1, st.frame);
  // display windows: platforms behind the glass
  const wins = [];
  if (dx - 1 - (x0 + 1) >= 2) wins.push([x0 + 1, dx - 1]);
  if (x1 - 1 - (dx + 5) >= 2) wins.push([dx + 5, x1 - 1]);
  for (const [a, c] of wins) {
    f.box(a, 1, 1, c - a, 2, 3, st.platform);
    if (c - a > 16) f.box(Math.round((a + c) / 2), 3, 0, 1, 8, 1, st.frame);
  }
  S.windows = wins;
  // piers / pilasters with capitals
  f.box(0, 0, -1, 2, 14, 1, st.pier); f.box(W - 2, 0, -1, 2, 14, 1, st.pier);
  if (x0 === 7) f.box(6, 0, -1, 1, 14, 1, st.pier);
  f.box(0, 13, -2, 2, 1, 1, st.trim); f.box(W - 2, 13, -2, 2, 1, 1, st.trim);
  // sign band with raised letters
  f.box(1, 14, -1, W - 2, 7, 1, st.signBg);
  f.box(1, 14, -2, W - 2, 1, 1, st.frame === st.signBg ? st.trim : st.frame);
  f.box(0, 21, -2, W, 1, 2, st.trim);
  f.box(1, 20, -2, W - 2, 1, 1, st.trim);
  const cands = [...(S.T.sign ? S.T.sign(S.spec) : []), (S.spec.name || '').toUpperCase().replace(/^THE /, '')];
  let done = false;
  for (const t of cands) {
    if (!t) continue;
    const tw = f.textWidth(t, 1, 'small');
    if (tw <= W - 6) { f.text(t, Math.round(W / 2), 15, -2, st.signFg, { align: 'center', font: 'small' }); done = true; break; }
  }
  if (!done) { const t = cands[0] || 'SHOP'; const sc = Math.min(2.4, (W - 6) * 4 / (t.length * 4 + 5)); sign(S, t, W / 2, 15.5, -1.1, 0, { scale: sc, bg: '#1d1d22', fg: '#e8c870' }); }
  // est. date in the corners of the band when there is room
  if (S.est && f.textWidth(cands.find((t) => t && f.textWidth(t, 1, 'small') <= W - 6) || '', 1, 'small') < W - 26) {
    glass(S, 'EST.', 4.5, 17.3, -2.1, 0, { color: '#e8d8a8', px: 1 / 14 });
    glass(S, String(S.est), W - 4.5, 17.3, -2.1, 0, { color: '#e8d8a8', px: 1 / 14 });
  }
  // gooseneck sign lamps
  for (const x of [Math.round(W * 0.25), Math.round(W * 0.75)]) { f.box(x, 21, -3, 1, 1, 1, MAT.iron); f.box(x, 20, -4, 1, 1, 1, MAT.lamp_glass); b.light(x + 0.5, 19.5, -4.5, { mode: 'night', radius: 5, color: [1, 0.85, 0.6] }); }
  // awning
  if (st.awning === 'out') awning(f, x0, 13, wdt, { depth: 4, matA: st.awA, matB: st.awB, stripe: 2 });
  else if (st.awning === 'rolled') { f.box(x0, 13, -1, wdt, 1, 1, st.awA); f.box(x0, 12, -1, 1, 1, 1, MAT.iron); f.box(x1 - 1, 12, -1, 1, 1, 1, MAT.iron); }
  // gold leaf on the display glass
  const gl = S.T.glass ? S.T.glass(S.spec) : [];
  if (gl.length && wins.length) {
    const [a, c] = wins.reduce((p, q) => (q[1] - q[0] > p[1] - p[0] ? q : p));
    const cx = (a + c) / 2, maxW = c - a - 1;
    gl.slice(0, 3).forEach((line, i) => {
      let px = 1 / 16;
      while (glassW(line, { px }) > maxW && px > 1 / 40) px *= 0.85;
      glass(S, line, cx, 8.6 - i * 1.7 * (px * 16), -0.06, 0, { px, color: i === 0 ? '#e2b84a' : '#f0e8d0' });
    });
  }
  // entrance
  b.entrance(S.sales, dx + 2, 1, 3, { outZ: -5, leaf: 'door_glass', tint: st.doorTint, main: true });
  // display-window light at night
  for (const [a, c] of wins) b.light((a + c) / 2, 10, 2.5, { mode: 'room', room: S.sales, radius: 5, color: [1, 0.9, 0.7] });
  // door furniture: OPEN sign / hours card in the door glass, a boot scraper
  if (rng.chance(0.7)) sign(S, rng.pick(['OPEN', 'COME IN', 'OPEN', 'WELCOME']), dx + 2, 6.5, 3.15, 0, { bg: '#b3302a', fg: '#f0ecdc', border: '#f0ecdc', scale: 0.8, cat: 'exterior' });
}

function facadeUpper(S, k) {
  const { f, b, W, st, rng } = S;
  const y = flY(k) + 4;
  const trim = st.trim;
  if (S.hasUp) win(f, 3, y, 0, 2, 6, { frame: st.winFrame, t: 2, lintelMat: trim, sillMat: trim });
  const office = S.upUse[k] === 'office';
  const wide = office ? 6 : 4;
  const n = Math.max(2, Math.floor((W - 9) / (office ? 14 : 11)));
  let xs;
  if (k === 1 && st.oriel && W >= 48 && !office) {
    // oriel (bay) window over the shop, with a window seat inside
    const ow = 14, ox = Math.round((7 + W - 2) / 2 - ow / 2);
    const oy = flY(1) + 2;
    f.box(ox, oy, -3, ow, 10, 3, st.outer);
    f.box(ox - 1, oy - 1, -4, ow + 2, 1, 4, trim);
    f.box(ox - 1, oy + 10, -4, ow + 2, 1, 4, trim);
    f.box(ox, oy + 11, -3, ow, 1, 3, MAT.roof_copper);
    f.carve(ox + 1, oy, -2, ow - 2, 9, 4);
    f.box(ox + 2, oy + 2, -3, ow - 4, 6, 1, MAT.glass); f.box(ox + Math.round(ow / 2), oy + 2, -3, 1, 6, 1, st.winFrame);
    f.box(ox, oy + 2, -2, 1, 6, 1, MAT.glass); f.box(ox + ow - 1, oy + 2, -2, 1, 6, 1, MAT.glass);
    f.box(ox + 1, oy, -2, ow - 2, 1, 2, MAT.wood_mid);
    f.box(ox + 1, oy - 1, 0, ow - 2, 1, 2, MAT.wood_mid);
    xs = [];
    const left = winRow(f, 7, ox - 1, y, 0, 4, 6, ox - 8 >= 8 ? 1 : 0, { frame: st.winFrame, t: 2, lintelWide: true, lintelMat: trim, sillMat: trim });
    const right = winRow(f, ox + ow + 1, W - 2, y, 0, 4, 6, W - 2 - ox - ow - 1 >= 8 ? 1 : 0, { frame: st.winFrame, t: 2, lintelWide: true, lintelMat: trim, sillMat: trim });
    xs.push(...left, ...right);
    S.oriel = { x: ox, w: ow };
  } else xs = winRow(f, 7, W - 2, y, 0, wide, 6, n, { frame: st.winFrame, t: 2, lintelWide: true, lintelMat: trim, sillMat: trim, box: rng.chance(0.3), boxTint: rng.pick(['#c8302a', '#e0a030', '#b04a8a', '#e8e0d0']) });
  S['win' + k] = xs;
  // shades half-drawn, the odd window air-conditioner, bunting for Harbor Days
  for (const x of xs) {
    if (rng.chance(0.55)) { const a = rng.int(1, 3); f.box(x, y + 6 - a, 1, wide, a, 1, rng.chance(0.7) ? MAT.canvas_tan : MAT.canvas_white); }
    if (k === 1 && rng.chance(0.08)) f.box(x + 1, y, -1, 2, 2, 2, MAT.steel_white);
  }
  if (k > 1) f.box(0, slabY(k), -1, W, 1, 1, trim);                 // belt course
  if (k >= 2 && k === S.floors - 1 && rng.chance(0.55)) for (const x of xs) P(S, 'bunting_fan', x + wide / 2, y - 4.2, -0.3, 0, {});
  // a flag on a bracket for the Centennial
  if (k === 1 && rng.chance(0.45)) {
    const fx = rng.chance(0.5) ? 1 : W - 2;
    for (let i = 0; i < 4; i++) f.box(fx, y + 1 + i, -1 - i, 1, 1, 1, MAT.iron);
    f.box(fx, y + 5, -5, 1, 1, 1, MAT.trim_gold);
    for (let r = 0; r < 4; r++) f.box(fx, y - 2 + r, -5, 1, 1, 4, r % 2 ? MAT.flag_white : MAT.flag_red);
    f.box(fx, y, -5, 1, 2, 2, MAT.flag_blue);
  }
}

function roofline(S) {
  const { f, b, W, bd, H, st, rng } = S;
  if (st.gable) {
    f.gable(0, H + 1, 0, W, bd, st.roofMat, { axis: 'z', overhang: 1, gableMat: st.outer });
    f.box(-1, H, -1, W + 2, 1, 1, st.trim);
    const gt = S.est ? 'EST. ' + S.est : String(S.built);
    if (f.textWidth(gt, 1, 'small') < W - 20) f.text(gt, Math.round(W / 2), H + 4, 0, MAT.trim_white, { align: 'center', font: 'small' });
    f.box(Math.round(W / 2) - 3, H + 11, 0, 6, 4, 1, MAT.trim_white); f.box(Math.round(W / 2) - 2, H + 12, 0, 4, 2, 1, MAT.glass_dark);
  } else {
    // cornice with brackets, parapet with a name/date panel
    f.box(0, H - 1, -1, W, 1, 1, st.trim);
    f.box(-1, H, -2, W + 2, 1, 2, st.trim);
    for (let x = 1; x < W - 1; x += 4) f.box(x, H - 2, -1, 1, 1, 1, st.trim);
    f.box(0, H - 3, -1, W, 1, 1, st.trim);
    f.walls(0, H + 1, 0, W, 2, bd, st.outer, 1);
    f.box(0, H + 3, -1, W, 1, 2, st.trim);
    const BLOCKS = [S.lot.street === 'Market Street' ? 'PHOENIX BLOCK' : 'BEAL BLOCK', 'A.D. ' + S.built, 'CROWELL BLOCK', 'MERCHANTS BLOCK', 'UNION BLOCK', 'KELLEY BLOCK', 'ODD FELLOWS', 'NYE BLOCK'];
    let txt = S.T.panel ? S.T.panel(S) : (rng.chance(0.35) ? rng.pick(BLOCKS) : String(S.built));
    if (f.textWidth(txt, 1, 'small') > W - 8) txt = String(S.built);
    const tw = f.textWidth(txt, 1, 'small');
    const pw = Math.min(W - 6, tw + 6), px = Math.round(W / 2 - pw / 2);
    if (tw <= W - 8) {
      f.box(px, H + 1, -1, pw, 7, 2, st.outer);
      f.box(px - 1, H + 8, -2, pw + 2, 1, 3, st.trim);
      f.box(px - 1, H + 1, -2, pw + 2, 1, 1, st.trim);
      f.text(txt, Math.round(W / 2), H + 2, -2, st.trim, { align: 'center', font: 'small' });
    }
    if (rng.chance(0.4)) for (let x = 6; x < W - 6; x += 14) P(S, 'bunting_fan', x + 4, H - 3.7, -2.4, 0, {});
  }
  // chimney, antenna, hatch, skylight, vents
  chimney(f, W - 4, H + 1, Math.round(bd * 0.6), 3, 4, 7, Mt(rng.pick(['brick_red', 'brick_dark', 'brick_brown'])));
  if (!st.gable) {
    f.box(3, H + 1, S.hallEnd + 4, 4, 3, 4, MAT.wood_gray);
    if (rng.chance(0.5)) f.box(Math.round(W / 2) - 3, H, bd - 12, 6, 2, 5, MAT.glass);
    if (rng.chance(0.6)) P(S, 'tv_antenna', W / 2 + rng.int(-6, 6), H + 1, bd * 0.4, rng.int(0, 3), {});
    f.box(Math.round(W * 0.3), H + 1, Math.round(bd * 0.75), 2, 3, 2, MAT.steel);
    if (S.floors >= 3 && W >= 56 && rng.chance(0.5)) P(S, 'water_tower', W * 0.35, H + 1, bd * 0.55, 0, { cat: 'far' });
  }
}

function backside(S) {
  const { f, b, W, D, bd, floors, rng } = S;
  const Bk = f.faceFrame('back'), bz = D - bd;
  const bx = (x, w) => W - x - w;  // local x → back-frame x
  doorway(Bk, bx(W - 10, 4), 1, bz, 4, 9, { frame: MAT.trim_dark, t: 2, step: false });
  const dn = b.door(S.back, null, W - 8, 1, bd - 1, { leaf: 'door_wood', tint: '#5a4a3a' });
  S.yardNode = b.navPoint(0, W - 8, 0, Math.min(D - 1, bd + 4), [dn]);
  f.box(W - 11, 0, bd, 6, 1, 2, MAT.concrete);
  win(Bk, bx(10, 4), 5, bz, 4, 5, { frame: MAT.trim_white, t: 2 });
  for (let k = 1; k < floors; k++) {
    win(Bk, bx(10, 4), flY(k) + 4, bz, 4, 6, { frame: MAT.trim_white, t: 2 });
    win(Bk, bx(W - 14, 4), flY(k) + 4, bz, 4, 6, { frame: MAT.trim_white, t: 2 });
  }
  if (floors >= 3) fireEscape(Bk, bx(W - 16, 10), 10, 4, floors, FHU, { z: bz });
  // the yard: ash cans, crates, a line of washing
  if (D - bd >= 6) {
    const y0 = bd + 1;
    P(S, 'oil_drum', 3, 0, y0 + 1, 0, { tint: '#6a6a64' }); P(S, 'oil_drum', 4.8, 0, y0 + 1.2, 0, { tint: '#5a5a54' });
    if (rng.chance(0.6)) P(S, 'crate_stack', 10, 0, D - 2.5, 0, {});
    if (rng.chance(0.4)) P(S, 'bicycle', W - 16, 0, y0 + 1.5, 1, { tint: rng.pick(['#b3302a', '#2a4a8a', '#2a6a3a']) });
    if (floors > 1 && rng.chance(0.5)) P(S, 'laundry_line', W / 2, 0, D - 4, 0, { tint: rng.pick(QUILT), tint2: rng.pick(QUILT) });
    if (rng.chance(0.3)) P(S, 'cat', 6, 0, D - 2, rng.int(0, 3), {});
    if (S.T.yardProps) S.T.yardProps(S, y0);
  }
}

// Exposed side walls: windows, clerestory lights and painted ghost signs above the neighbour's roof.
function sideWall(S, side) {
  const { f, W, D, bd, H, floors, rng, lot } = S;
  const nh = neighbourHeight(lot, side);
  if (nh >= H - 6) return;
  const Fr = f.faceFrame(side);
  const X = (z0, w) => (side === 'left' ? D - z0 - w : z0);
  const full = nh < 6;
  if (full) {
    // clerestory transoms along the shop and windows in the flats (right side only: the stair is on the left)
    for (let z = 8; z < S.Zb - 6; z += 10) { f.carve(side === 'left' ? 0 : W - 2, 12, z, 2, 2, 4); Fr.box(X(z, 4), 12, 0, 4, 2, 1, MAT.glass); }
    if (side === 'right') for (let k = 1; k < floors; k++) for (const zz of [Math.round(bd * 0.66), Math.round(bd * 0.84)]) win(Fr, X(zz, 4), flY(k) + 4, 0, 4, 6, { frame: S.st.winFrame, t: 2, lintelMat: S.st.trim, sillMat: S.st.trim });
    // corner quoins
    for (let y = 1; y < H; y += 2) Fr.box(X(0, 2) - (side === 'left' ? 0 : 0), y, -1, 2, 1, 1, S.st.trim);
  }
  // ghost sign region
  const yLo = Math.max(nh + 2, full ? 16 : 0), yHi = H - 2;
  const z0 = 4, z1 = full && side === 'right' ? Math.round(bd * 0.58) : bd - 4;
  const wAvail = z1 - z0 - 2, hAvail = yHi - yLo;
  if (hAvail < 6 || wAvail < 20) return;
  const pool = [...(S.T.ghost || []), ...GHOST_ADS];
  const ad = rng.chance(0.75) && S.T.ghost ? rng.pick(S.T.ghost) : rng.pick(pool);
  const fit = (font, sc, lh, per) => {
    const lines = [];
    for (const src of ad) {
      const words = src.split(' ');
      let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (Fr.textWidth(t, sc, font) <= wAvail) cur = t; else { if (cur) lines.push(cur); cur = w; } }
      if (cur) lines.push(cur);
    }
    if (lines.some((l) => Fr.textWidth(l, sc, font) > wAvail)) return null;
    if (lines.length * lh - (lh - per) > hAvail) return null;
    return lines;
  };
  let font = 'big', lh = 16, per = 14, sc = 2;
  let lines = fit('big', 2, 16, 14);
  if (!lines || lines.length > 2) { sc = 1; lh = 9; per = 7; lines = fit('big', 1, 9, 7); }
  if (!lines) { font = 'small'; lh = 7; per = 5; lines = fit('small', 1, 7, 5); }
  if (!lines) return;
  const blockH = lines.length * lh - (lh - per);
  const yTop = Math.min(yHi, yLo + Math.round((hAvail + blockH) / 2));
  const cx = side === 'left' ? D - (z0 + z1) / 2 : (z0 + z1) / 2;
  const panel = rng.pick([null, MAT.brick_paint_red, MAT.brick_dark, MAT.sign_navy, null]);
  const letter = panel === MAT.sign_navy ? MAT.plaster_cream : rng.pick([MAT.sign_cream, MAT.plaster_cream, MAT.trim_cream, MAT.plaster_white]);
  if (panel) Fr.box(Math.round(cx - wAvail / 2 - 1), yTop - blockH - 1, 0, wAvail + 2, blockH + 2, 1, panel);
  lines.forEach((l, i) => Fr.text(l, Math.round(cx), yTop - per - i * lh, 0, i === 0 ? letter : (rng.chance(0.5) ? letter : MAT.sign_yellow), { align: 'center', font, scale: sc }));
  // 1938 high-water line on flood-plain buildings
  if (full && floodLot(lot)) highWaterSide(S, Fr, X);
}
function highWaterSide(S, Fr, X) {
  const { bd } = S;
  Fr.box(X(0, bd), 7, 0, bd, 1, 1, MAT.trim_dark);
  Fr.prop(glassType('HIGH WATER - SEPT. 21, 1938', { px: 1 / 18, color: '#26262a' }), X(14, 0), 7.3, -0.06, 0, {});
}

// ---------------------------------------------------------------- upstairs: flats, offices, rooms, storage
function upperFloors(S) {
  const { b, f, bd, floors, rng, T } = S;
  let lower = S.hall;
  S.upUse = S.upUse || {};
  for (let k = 1; k < floors; k++) {
    const y = flY(k), wm = S.upWalls[k];
    const land0 = k === 1 ? 36 : 64;
    const hall = b.room(k === 1 ? 'Upstairs Landing' : 'Top Floor Landing', 2, y, 2, 4, 11, bd - 4, { lightMode: 'auto', nav: [4, land0 + 2], public: false });
    if (k === 1) b.stairs(lower, [4, 1, 3], hall, [4, y, land0 + 1.5]);
    else {
      stairs(f, 2, flY(1), 40, '+z', FHU, { w: 4, run: 2, mat: MAT.wood_mid, rail: false });
      b.stairs(lower, [4, flY(1), 38.5], hall, [4, y, land0 + 2.5]);
    }
    wallZ(f, 2, bd - 2, y, 6, 11, wm, [{ at: land0, w: 4 }]);
    P(S, 'ceiling_lamp', 4, y + 8, land0 + 2, 0);
    const use = S.upUse[k];
    if (use === 'apt') apartment(S, k, hall, land0, wm);
    else if (use === 'office') officeFloor(S, k, hall, land0, wm);
    else if (use === 'lodging') lodgingFloor(S, k, hall, land0, wm);
    else if (typeof use === 'function') use(S, k, hall, land0, wm);
    else storeFloor(S, k, hall, land0, wm);
    lower = hall;
  }
}
function splitZ(S, land0) {
  const Z0 = 2, Z1 = S.bd - 2, AD = Z1 - Z0;
  let zA = Z0 + Math.round(AD * 0.42), zB = zA + 1 + Math.round(AD * 0.3);
  const bad = (z) => (z >= 35 && z <= 41) || (z >= 63 && z <= 69);
  while (bad(zA)) zA--;
  while (bad(zB) || zB - zA < 10) zB++;
  if (zB > Z1 - 10) zB = Z1 - 10;
  return { Z0, Z1, zA, zB };
}
function apartment(S, k, hall, land0, wm, o = {}) {
  const { b, f, W, rng } = S;
  const y = flY(k), h = 11;
  const X0 = 7, X1 = W - 2, AW = X1 - X0;
  const { Z0, Z1, zA, zB } = splitZ(S, land0);
  const xBath = X1 - 12;
  wallX(f, X0, X1, y, zA, h, wm, [{ at: X0 + 3, w: 4 }]);
  wallX(f, X0, X1, y, zB, h, wm, [{ at: X0 + 7, w: 4 }, { at: X1 - 8, w: 4 }]);
  wallZ(f, zB + 1, Z1, y, xBath, h, wm, []);
  const front = b.room(o.frontName || 'Front Room', X0, y, Z0, AW, h, zA - Z0, { public: false });
  const mid = b.room('Kitchen', X0, y, zA + 1, AW, h, zB - zA - 1, { public: false });
  const bed = b.room('Bedroom', X0, y, zB + 1, xBath - X0, h, Z1 - zB - 1, { public: false });
  const bath = b.room('Bathroom', xBath + 1, y, zB + 1, X1 - xBath - 1, h, Z1 - zB - 1, { public: false, lightColor: [1, 0.96, 0.88] });
  b.door(front, mid, X0 + 5, y, zA, { tint: '#e8e0d0' });
  b.door(mid, bed, X0 + 9, y, zB, { tint: '#e8e0d0' });
  b.door(mid, bath, X1 - 6, y, zB, { tint: '#e8e0d0' });
  const zd = land0 + 2;
  const entry = zd < zA ? front : zd < zB ? mid : bed;
  b.door(hall, entry, 6, y, zd, { axis: 'z', tint: rng.pick(['#6a4a2a', '#e8e0d0', '#3a4a3a']) });
  f.box(X0, y, Z0, AW, 1, 1, MAT.wood_dark);
  // furnish
  const par = parlour(b, front, X0, y, Z0, AW, zA - Z0, { tv: rng.chance(0.35), sofaTint: rng.pick(FABRIC), chairTint: rng.pick(FABRIC), chairTint2: rng.pick(FABRIC), rugTint: rng.pick(['#8a3a2e', '#3a4a6a', '#6a5a3a', '#4a5a3a']) });
  P(S, 'ceiling_lamp', X0 + AW / 2, y + 8, (Z0 + zA) / 2, 0);
  const kspots = [];
  let kz = zA + 2.2;
  const ct = rng.pick(['#d8c89a', '#c84a3a', '#5ab0a8', '#e8e0c8', '#e0b050']);
  for (const it of ['stove', 'kitchen_counter', 'kitchen_sink', 'kitchen_counter', 'fridge', 'kitchen_counter']) {
    if (kz > zB - 2) break;
    P(S, it, X1 - 1.3, y, kz, 3, { tint: ct });
    if (it === 'stove') kspots.push(b.spot('stand', X1 - 3.8, y, kz, 1, { room: mid, act: 'cook', tags: ['cook'] }));
    if (it === 'kitchen_sink') kspots.push(b.spot('stand', X1 - 3.8, y, kz, 1, { room: mid, act: 'wash', tags: ['wash'] }));
    if (it !== 'fridge') P(S, 'cabinet_upper', X1 - 0.8, y + 6, kz, 3);
    kz += 3.3;
  }
  const din = diningSet(b, mid, X0 + Math.min(AW * 0.4, 14), y, (zA + zB) / 2 + 0.5, { seats: 4, table: 'table_kitchen', chair: 'chair_kitchen', long: false, cloth: rng.pick(['#c84a3a', '#5ab0a8', '#e0b050', '#e8e0d0']), centerpiece: rng.pick(['fruit_bowl', 'vase_flowers', 'bread_box', 'milk_bottles']) });
  P(S, 'ceiling_lamp', X0 + AW / 2, y + 8, (zA + zB) / 2, 0);
  const wide = xBath - X0 >= 26;
  const bedr = bedroom(b, bed, X0, y, zB + 1, xBath - X0, Z1 - zB - 1, { beds: wide ? [{ type: 'bed_double', tint: rng.pick(QUILT) }, { type: 'bed_single', tint: rng.pick(QUILT) }] : [{ type: 'bed_double', tint: rng.pick(QUILT) }], wardrobe: false });
  const bt = bathroom(b, bath, xBath + 1, y, zB + 1, X1 - xBath - 1, Z1 - zB - 1);
  // lived-in odds and ends (a different handful in every flat)
  const cxA = X0 + AW / 2;
  const extras = [['newspaper_pile', cxA, zA - 8.7, 0, 1.8], ['clock_wall', cxA, zB - 0.3, 0, 6.5], ['sewing_machine', X1 - 2, Z0 + 2.5, 3], ['photo_frames', X0 + 0.2, (Z0 + zA) / 2 - 3, 1, 6],
    ['cat', cxA - 4, zA - 7, 1], ['toy_blocks', cxA + 3, Z0 + 7, 0], ['coat_rack', X0 + 1.4, zB - 1.6, 0], ['laundry_basket', X0 + 2, zB + 3, 0], ['bread_box', X1 - 1.3, zA + 5.5, 3, 4],
    ['books_stack', cxA + 1, zA - 8.7, 0, 1.8], ['radio_table', X1 - 1.3, zA + 5.5, 3, 4], ['baseball_glove', X0 + 3, zB + 5, 0], ['cookie_jar', X1 - 1.3, zA + 5.5, 3, 4], ['umbrella_stand', X0 + 1, zB - 4, 0]];
  if (zA + 12.1 < zB - 2) extras.push(['dish_rack', X1 - 1.3, zA + 12.1, 3, 4]);
  const used = new Set();
  for (const [t, x, z, r, yy] of rng.shuffle(extras).slice(0, rng.int(5, 8))) { const key = Math.round(x) + ',' + Math.round(z) + ',' + (yy || 0); if (used.has(key)) continue; used.add(key); P(S, t, x, y + (yy || 0), z, r); }
  const beds = bedr.beds;
  b.home({ family: o.family ?? S.T.family ?? S.spec.family ?? null, size: beds.length, beds, dine: din.seats, lounge: par.seats, kitchen: kspots, bath: bt.spots, yard: [], porch: [], desk: [], special: null, above: S.name });
  S.flats = (S.flats || 0) + 1;
}
const OFFICES = [
  { name: 'DR. M. KESSLER', line2: 'DENTIST', role: 'dentist', shift: ['9:00', '12:00'], room: 'Dental Office', chair: true },
  { name: 'J. T. HOLLIS', line2: 'ATTORNEY AT LAW', role: 'attorney', room: 'Law Office' },
  { name: 'BAY INSURANCE', line2: 'AGENCY', role: 'agent', room: 'Insurance Office' },
  { name: 'A. COHEN, C.P.A.', line2: 'ACCOUNTANT', role: 'accountant', room: 'Office' },
  { name: 'HARBOR REALTY', line2: 'HOMES - LOTS', role: 'realtor', shift: ['9:00', '13:00'], room: 'Realty Office' },
  { name: 'LOCAL 219', line2: 'CANNERY WORKERS', role: 'union secretary', shift: ['9:00', '13:00'], room: 'Union Hall', union: true },
  { name: 'DR. R. SILVA', line2: 'OPTOMETRIST', role: 'optometrist', shift: ['9:00', '13:00'], room: 'Eye Examinations' },
  { name: 'MISS LORRAINE', line2: 'DANCE STUDIO', role: 'dance teacher', shift: ['10:00', '14:00'], room: 'Dance Studio', dance: true },
  { name: 'NOTARY PUBLIC', line2: 'E. FARNSWORTH', role: 'notary', room: 'Office' },
];
function officeFloor(S, k, hall, land0, wm) {
  const { b, f, W, rng, lot } = S;
  const y = flY(k), h = 11;
  const X0 = 7, X1 = W - 2, AW = X1 - X0;
  const { Z0, Z1, zA, zB } = splitZ(S, land0);
  const idx = Math.floor(new RNG('off' + lot.x + ',' + lot.z + k).next() * OFFICES.length);
  const O = (k === 1 && S.T.office) || OFFICES[idx];
  wallX(f, X0, X1, y, zA, h, wm, [{ at: X0 + 3, w: 4 }]);
  wallX(f, X0, X1, y, zB, h, wm, [{ at: X0 + 3, w: 4 }]);
  const front = b.room(O.room || 'Office', X0, y, Z0, AW, h, zA - Z0, { public: true, lightMode: 'auto' });
  const mid = b.room('Waiting Room', X0, y, zA + 1, AW, h, zB - zA - 1, { public: true, lightMode: 'auto' });
  const back = b.room('Files', X0, y, zB + 1, AW, h, Z1 - zB - 1, { public: false });
  b.door(front, mid, X0 + 5, y, zA, { leaf: 'door_glass', tint: '#6a4a2a' });
  b.door(mid, back, X0 + 5, y, zB, {});
  const zd = land0 + 2;
  b.door(hall, zd < zA ? front : zd < zB ? mid : back, 6, y, zd, { axis: 'z', leaf: 'door_glass', tint: '#6a4a2a' });
  const work = [];
  if (O.dance) {
    f.box(X0, y - 1, Z0, AW, 1, zA - Z0, MAT.floor_oak);
    f.box(X1 - 1, y + 3, Z0 + 2, 1, 1, zA - Z0 - 4, MAT.wood_light);
    f.box(X1 - 1, y + 1, Z0 + 2, 1, 7, zA - Z0 - 4, MAT.mirror);
    P(S, 'piano_upright', X0 + 3, y, Z0 + 3, 1);
    work.push(stand(S, X0 + AW / 2, Z0 + 6, 0, 'dance', ['work'], { y, room: front }));
    for (let i = 0; i < 4; i++) stand(S, X0 + 6 + i * 5, Z0 + 12, 0, 'dance', ['browse'], { y, room: front });
  } else {
    work.push(officeDesk(b, front, X0 + AW / 2, y, Z0 + 9, 0, { tags: ['work', 'desk'] }));
    if (O.chair) { P(S, 'barber_chair', X0 + AW / 2 - 8, y, Z0 + 5, 0, { tint: '#6a8a8a' }); P(S, 'lamp_floor', X0 + AW / 2 - 10, y, Z0 + 5, 0); }
    else officeDesk(b, front, X0 + AW * 0.8, y, Z0 + 12, 0, { typewriter: true });
    for (let i = 0; i < 3; i++) P(S, 'filing_cabinet', X0 + 1.2, y, Z0 + 3 + i * 2.2, 1);
    P(S, O.union ? 'flag_stand' : 'bookshelf', X1 - 1.2, y, Z0 + 4, 3);
    P(S, 'painting', X0 + AW / 2, y + 6, zA - 0.4, 0, { tint: '#8ab0d0' });
  }
  for (let i = 0; i < 4; i++) P(S, 'chair_wood', X0 + 3 + i * 3, y, zB - 1.5, 0);
  P(S, 'magazine_rack', X1 - 2, y, zB - 1.5, 0); P(S, 'office_water_cooler', X1 - 1.5, y, zA + 2.5, 3);
  for (let i = 0; i < Math.floor(AW / 5); i++) P(S, i % 2 ? 'filing_cabinet' : 'crate_stack', X0 + 2 + i * 5, y, Z1 - 1.5, 0);
  sit(S, X0 + 6, zB - 1.5, 0, 'read', ['waiting'], 0.45, { y, room: mid });
  job(S, O.role, work, O.shift || ['9:00', '17:00'], { days: O.shift ? null : 'weekday', title: O.role });
  // lettering on the office windows
  const xs = S['win' + k] || [];
  if (xs.length) { const wx = xs[0] + 3; glass(S, O.name, wx, y + 7.6, -0.06, 0, { px: 1 / 30, color: '#e8c060' }); glass(S, O.line2, wx, y + 6.8, -0.06, 0, { px: 1 / 34, color: '#f0e8d0' }); }
  if (xs.length > 1) glass(S, O.line2, xs[1] + 3, y + 7.4, -0.06, 0, { px: 1 / 30, color: '#e8c060' });
  if (O.union) read(S, X0 + AW / 2, y + 5, zA - 1, 'Cannery Workers Local 219', 'ORGANIZED JULY 1934\n\nNineteen days on the steps of City Hall, and a nickel an hour.\n\nOn the wall: a photograph of Casimir Novak, 29, in shirtsleeves, speaking to a crowd that fills Grand Avenue. Someone has written underneath in pencil: "He was right."\n\nMEETING — FIRST TUESDAY — 7 P.M.\nDues 50 cents. Bring a friend.');
  S.offices = (S.offices || []).concat([O.name]);
}
function storeFloor(S, k, hall, land0, wm) {
  const { b, f, W, bd, rng } = S;
  const y = flY(k);
  const room = b.room('Storage Loft', 7, y, 2, W - 9, 11, bd - 4, { public: false });
  b.door(hall, room, 6, y, land0 + 2, { axis: 'z' });
  const items = ['crate_stack', 'trunk', 'crate', 'barrel', 'sack_pile', 'mannequin', 'suitcase_upright', 'cedar_chest', 'chair_folding', 'filing_cabinet', 'rocking_chair', 'lamp_floor', 'crate_stack', 'hatbox'];
  for (let i = 0; i < 14; i++) P(S, rng.pick(items), rng.float(9, W - 5), y, rng.float(4, bd - 6), rng.int(0, 3), {});
  P(S, 'ceiling_lamp', W / 2, y + 8, bd / 2, 0);
  if (S.T.loft) S.T.loft(S, room, y);
}
// Boarding-house floor: a corridor down the middle, rented rooms each side, a shared bath.
function lodgingFloor(S, k, hall, land0, wm) {
  const { b, f, W, rng } = S;
  const y = flY(k), h = 11;
  const X0 = 7, X1 = W - 2, Z0 = 2, Z1 = S.bd - 2;
  const cx = Math.round((X0 + X1) / 2) - 2;       // corridor air x cx..cx+3, walls at cx-1 and cx+4
  const pz = land0;                                // passage from the landing: z pz..pz+3
  wallZ(f, Z0, Z1, y, cx - 1, h, wm, [{ at: pz, w: 4 }]);
  wallZ(f, Z0, Z1, y, cx + 4, h, wm, []);
  wallX(f, X0, cx - 1, y, pz - 1, h, wm); wallX(f, X0, cx - 1, y, pz + 4, h, wm);
  const cor = b.room('Corridor', cx, y, Z0, 4, h, Z1 - Z0, { public: false, nav: [cx + 2, pz + 2] });
  const pas = b.room('Corridor', X0, y, pz, cx - 1 - X0, h, 4, { public: false });
  b.door(hall, pas, 6, y, pz + 2, { axis: 'z', leaf: false });
  b.door(pas, cor, cx - 1, y, pz + 2, { axis: 'z', leaf: false });
  f.box(cx, y - 1, Z0, 4, 1, Z1 - Z0, MAT.carpet_red); f.box(X0, y - 1, pz, cx - 1 - X0, 1, 4, MAT.carpet_red);
  for (let z = Z0 + 6; z < Z1; z += 14) P(S, 'ceiling_lamp', cx + 2, y + 8, z, 0);
  const slots = [];
  const cut = (x0, x1, za, zb, left) => { const n = Math.max(1, Math.round((zb - za) / 17)); const d = (zb - za) / n; for (let i = 0; i < n; i++) slots.push({ x0, x1, z0: Math.round(za + i * d), z1: Math.round(za + (i + 1) * d), first: i === 0, left }); };
  cut(X0, cx - 1, Z0, pz - 1, true); cut(X0, cx - 1, pz + 5, Z1, true); cut(cx + 5, X1, Z0, Z1, false);
  let n = 0;
  S.lodgerHomes = S.lodgerHomes || [];
  slots.forEach((s, i) => {
    const rz0 = s.first ? s.z0 : s.z0 + 1, w = s.x1 - s.x0, d = s.z1 - rz0;
    if (w < 8 || d < 9) return;
    if (!s.first) wallX(f, s.x0, s.x1, y, s.z0, h, wm);
    const dx = s.left ? cx - 1 : cx + 4, dz = s.left ? s.z1 - 5 : rz0 + 1;
    f.carve(dx, y, dz, 1, 9, 4);
    const isBath = !s.left && i === slots.length - 1;
    const r = b.room(isBath ? 'Bath' : `Room ${k + 1}${String.fromCharCode(65 + n)}`, s.x0, y, rz0, w, h, d, { public: false });
    b.door(cor, r, dx, y, dz + 2, { axis: 'z', tint: '#6a4a2a' });
    if (isBath) { bathroom(b, r, s.x0, y, rz0, w, d); return; }
    n++;
    const bed = bedroom(b, r, s.x0, y, rz0, w, d, { beds: [{ type: 'bed_single', tint: rng.pick(QUILT) }], dresser: true, rug: rng.chance(0.6), rugTint: rng.pick(['#6a3a2e', '#3a4a5a', '#5a5a3a']) });
    const chX = s.left ? s.x0 + 3 : s.x1 - 3, chR = s.left ? 1 : 3;
    P(S, 'writing_desk', chX, y, rz0 + d / 2 - 1, chR);
    P(S, 'chair_wood', s.left ? chX + 2.6 : chX - 2.6, y, rz0 + d / 2 - 1, s.left ? 3 : 1);
    const chair = b.spot('sit', s.left ? chX + 2.6 : chX - 2.6, y, rz0 + d / 2 - 1, s.left ? 3 : 1, { room: r, act: rng.pick(['read', 'write', 'smoke_pipe', 'read_book']), tags: ['lounge'], seat: 0.45 });
    P(S, 'sink_pedestal', s.left ? s.x0 + 1.2 : s.x1 - 1.2, y, rz0 + 3, s.left ? 1 : 3);
    P(S, rng.pick(['suitcase_upright', 'trunk', 'coat_rack', 'cedar_chest']), s.left ? s.x0 + 2 : s.x1 - 2, y, s.z1 - 2, 0);
    if (rng.chance(0.6)) P(S, rng.pick(['radio_table', 'books_stack', 'newspaper_pile', 'photo_frames_standing', 'typewriter', 'pipe_stand']), chX, y + 3.3, rz0 + d / 2 - 1, chR);
    P(S, 'ceiling_lamp', s.x0 + w / 2, y + 8, rz0 + d / 2, 0);
    const home = b.home({ family: null, size: 1, beds: bed.beds.slice(0, 1), lounge: [chair], dine: [], kitchen: [], bath: [], yard: [], porch: [], desk: [chair], lodger: true, single: true });
    S.lodgerHomes.push(home);
    if (S.lodgerNotes && S.lodgerNotes.length) { const [t, body] = S.lodgerNotes.shift(); read(S, chX, y + 4, rz0 + d / 2 - 1, t, body); }
  });
}

function shopFinish(S) {
  const { b, ctx, rng } = S;
  // cornerstone/plaque at the base of the right pier
  read(S, S.W - 1, 2, -1.5, `Cornerstone — ${S.built}`, `${(S.name || '').toUpperCase()}\n${S.lot.address}\n\nBuilt ${S.built}${S.lot.street === 'Market Street' ? ', after the Great Fire of June 11, 1902 burned this block to the cellar holes' : ''}.${S.est ? `\nThe business was established in ${S.est}.` : ''}`, { prompt: 'Read the cornerstone' });
  S.f.box(S.W - 2, 1, -2, 2, 2, 1, MAT.granite);
  if (floodLot(S.lot)) {
    // painted line inside the shop too — nobody has had the heart to paint over it
    S.f.box(S.X0, 7, S.Zb - 1, S.X1 - S.X0, 1, 1, MAT.trim_dark);
    read(S, S.X0 + 4, 7, S.Zb - 1.2, 'High Water — September 21, 1938', 'A thin black line, painted at the height the water reached in this room during the Great Hurricane.\n\nSix feet on Harbor Street. Pier 3 went out to sea; three people were lost.\n\nUnderneath, in smaller letters: "We opened again on the 28th."');
  }
  if (S.T.readables) S.T.readables(S);
  // the clock over the stockroom door and this month's calendar from the Courier
  P(S, 'clock_wall', S.W - 8, 13.2, S.Zb - 0.3, 0);
  sign(S, rng.pick(['SEPTEMBER 1953', 'SEPT. 1953', 'SEPTEMBER']), S.W - 14, 10.5, S.Zb - 0.2, 0, { bg: '#f0ecdc', fg: '#b3302a', border: '#6a5a44', scale: 0.45 });
  // Harbor Days posters in some windows
  if (S.windows.length && rng.chance(0.5)) { const [a, c] = S.windows[S.windows.length - 1]; sign(S, 'HARBOR DAYS 1853-1953', c - 3.5, 3.2, 1.4, 0, { bg: '#1f2f5f', fg: '#f0ecdc', border: '#b3302a', scale: 0.55 }); }
  if (S.hasUp && (S.flats || S.offices)) read(S, 5.5, 5, -0.4, 'Directory', `${S.lot.address}\n\n${S.name}\n${(S.offices || []).map((o) => o + ' — upstairs').join('\n')}${S.flats ? `\n${S.flats} apartment${S.flats > 1 ? 's' : ''} above — ring bell` : ''}`, { prompt: 'Read the doorbell plate' });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
}

// ================================================================ trades: fit-outs
// Shared back-room fit: shelving on the back wall, a desk with the books, crates, a calendar.
function stockroom(S, o = {}) {
  const { b, W, Zb, bd, rng } = S;
  const z0 = Zb + 1, z1 = bd - 2, d = z1 - z0;
  shelfWall(S, { axis: 'z', at: z1 - 1, dir: -1 }, 3, W - 12, { goods: o.goods ?? G.boxes, top: 11, levels: [4, 7, 10], cabinet: 1 });
  const desk = d >= 9 ? officeDesk(b, S.back, 4.4, 1, z0 + 4, 3, { typewriter: false, tags: ['work', 'desk'], act: 'write' }) : null;
  const items = o.items ?? ['crate_stack', 'crate', 'sack_pile', 'barrel', 'crate_small', 'trash_can_small', 'crate'];
  for (let i = 0; i < (o.n ?? 5); i++) P(S, rng.pick(items), rng.float(12, Math.max(13, W - 14)), 1, rng.float(z0 + 2, Math.max(z0 + 2.5, z1 - 4)), rng.int(0, 3), {});
  P(S, 'ceiling_lamp', W / 2, 13, z0 + d / 2, 0);
  P(S, 'clock_wall', 4, 8, Zb + 1.2, 2);
  if (o.sink !== false) P(S, 'kitchen_sink', W - 4, 1, z0 + 2, 3);
  return desk;
}
// Standard right-hand counter (parallel to the right wall) with shelving behind; returns {x, clerk, cust}.
function rightCounter(S, z0, z1, o = {}) {
  const x = S.X1 - 7;
  vCounter(S, x, z0, 2, z1 - z0, { base: o.base, top: o.top, kick: o.kick });
  const zc = (z0 + z1) / 2;
  const clerk = stand(S, S.X1 - 3.5, zc, 3, o.act || 'counter', ['work']);
  const cust = customer(S, x - 1.8, zc + (o.custOff ?? 0), 1);
  if (o.register !== false) P(S, 'cash_register', x + 1, 5, z0 + 2.5, 3);
  if (o.shelves !== false) shelfWall(S, 'R', z0, z1 + 2, { goods: o.goods ?? G.grocery, top: o.top2 ?? 12, depth: 2 });
  return { x, clerk, cust };
}
function posters(S, list, side, y = 7, o = {}) {
  const zs = [];
  const n = list.length, z0 = 8, z1 = Math.min(S.Zb - 6, side === 'L' ? S.hallEnd - 2 : S.Zb - 6);
  list.forEach((t, i) => {
    const z = z0 + (i + 0.5) * (z1 - z0) / n; zs.push(z);
    sign(S, t, side === 'L' ? S.X0 + 0.15 : S.X1 - 0.15, y, z, side === 'L' ? 1 : 3, { bg: o.bg || '#e8dcc0', fg: o.fg || '#2a3a5a', border: o.border || '#b3302a', scale: o.scale || 1.1 });
  });
  return zs;
}

const TRADES = {};

// ---------------------------------------------------------------- Station Luncheonette
TRADES.luncheonette = {
  label: 'Luncheonette', hours: ['5:30', '19:00'], front: 'Lunch Room', back: 'Kitchen', floors: 2,
  style: { floor: 'floor_checker', wall: 'tile_mint', wains: 'enamel_white', signBg: 'sign_red', signFg: 'sign_white', door: 'left', awning: ['awning_red', 'canvas_white'], frame: 'trim_red' },
  sign: () => ['LUNCHEONETTE'], glass: () => ['STATION LUNCHEONETTE', 'BREAKFAST - LUNCH - FOUNTAIN'],
  lore: () => 'Across Mill Street from Union Station. Commuters for the 6:10 to Boston take their coffee standing up.',
  ghost: [['LUNCHEONETTE', 'OPEN FOR THE FIRST TRAIN']],
  fit(S) {
    const { f, Zb, X0, X1, rng } = S;
    const bx = X1 - 9, z0 = 7, z1 = Zb - 8;
    vCounter(S, bx, z0, 3, z1 - z0, { base: MAT.enamel_white, top: MAT.counter_red, kick: MAT.chrome, kickSide: 'x' });
    f.box(bx, 4, z0, 3, 1, z1 - z0, MAT.marble);
    const stools = stoolRow(S, z0 + 1.5, z1 - 1.5, bx - 1.4, 1, { axis: 'z', type: 'soda_stool', tint: '#b3302a' });
    // back bar: griddle, urns, pie case, mirror strip
    f.box(X1 - 3, 1, z0, 3, 3, z1 - z0, MAT.stainless); f.box(X1 - 3, 4, z0, 3, 1, z1 - z0, MAT.stainless);
    f.box(X1 - 3, 4, z0 + 2, 3, 1, 6, MAT.enamel_black); f.box(X1 - 1, 8, z0, 1, 3, z1 - z0, MAT.mirror);
    f.box(X1 - 3, 11, z0 + 1, 3, 2, 8, MAT.stainless);
    P(S, 'coffee_urn', X1 - 2, 5, z0 + 11, 3); P(S, 'coffee_urn', X1 - 2, 5, z0 + 14, 3);
    P(S, 'pie_display', X1 - 2, 5, z0 + 18, 3); P(S, 'cake_stand', bx + 1.5, 5, z0 + 6, 3); P(S, 'cake_stand', bx + 1.5, 5, z1 - 5, 3);
    P(S, 'menu_board', X1 - 0.3, 11, z0 + 16, 3); P(S, 'clock_wall', X1 - 0.3, 12, z0 + 24, 3);
    for (let z = z0 + 3; z < z1 - 2; z += 6) P(S, 'coffee_cup', bx + 0.8, 5, z, 3);
    const cook = stand(S, X1 - 5, z0 + 5, 1, 'cook', ['work']);
    const counterman = stand(S, X1 - 5, (z0 + z1) / 2, 3, 'serve', ['work']);
    // booths along the left wall, tables in the middle
    const booths = [];
    for (let u = 8; u + 7 <= Math.min(S.hallEnd, Zb - 4); u += 8) booths.push(...vBooth(S, u, X0, { axis: 'z', depth: 4, seat: MAT.velvet_red, top: MAT.counter_formica }));
    const tables = [];
    for (let z = 12; z < Zb - 10; z += 10) {
      const tx = (X0 + 5 + bx - 2) / 2;
      P(S, 'table_round', tx, 1, z, 0);
      for (const [dx, r] of [[-2.6, 1], [2.6, 3]]) { P(S, 'chair_kitchen', tx + dx, 1, z, r, { tint: '#b3302a' }); tables.push(sit(S, tx + dx, z, r, 'eat', ['eat_out'], 0.45)); }
      P(S, 'table_setting', tx, 4, z, 0);
    }
    const waitress = stand(S, X0 + 7, 20, 3, 'serve', ['work']);
    P(S, 'jukebox', X0 + 1.5, 1, Math.min(S.hallEnd - 2, Zb - 6), 1);
    P(S, 'magazine_rack', X1 - 11, 1, 4.5, 0); P(S, 'newspaper_pile', X1 - 11, 1.8, 4.5, 0);
    shopLamps(S);
    job(S, 'cook', [cook], ['5:30', '15:00'], { outfit: 'cook', title: 'short-order cook' });
    job(S, 'counterman', [counterman, cook], ['6:00', '19:00'], { outfit: 'cook', title: 'counterman' });
    job(S, 'waitress', [waitress, counterman], ['7:00', '15:00'], { outfit: 'waitress', sex: 'F' });
    S.eat = [...stools, ...booths, ...tables];
    const k = stockroom(S, { items: ['sack_pile', 'crate', 'milk_bottles', 'crate_stack'] });
    P(S, 'stove', S.W / 2, 1, S.bd - 3.5, 0); P(S, 'stove', S.W / 2 + 4, 1, S.bd - 3.5, 0);
    const cook2 = stand(S, S.W / 2 + 2, S.bd - 6.5, 2, 'cook', ['work'], { room: S.back });
    S.b.jobs[0].spots.push(cook2); void k; void rng;
    browse(S, X0 + 9, 6, 0, { act: 'read_stand', lines: ['The 6:10 was late again.', 'Coffee and a cruller, and step on it.'] });
    browse(S, X1 - 11, 7, 0);
  },
  window(S, a, c) { P(S, 'pie_display', (a + c) / 2, 3, 2.5, 0); P(S, 'cake_stand', a + 1.5, 3, 2.2, 0); sign(S, 'BLUE PLATE 65C', (a + c) / 2, 7.4, 1.2, 0, { bg: '#1f2f5f', fg: '#f0ecdc', scale: 0.7 }); },
  readables(S) {
    read(S, S.X1 - 1, 9, S.Z0 + 16, 'Bill of Fare', 'STATION LUNCHEONETTE\n\nCoffee ..... 10\nCoffee & Cruller ..... 15\nTwo Eggs, Toast, Home Fries ..... 45\nFlapjacks & Syrup ..... 40\nFried Clam Roll ..... 55\nFrankfurt, Beans & Brown Bread ..... 50\nHot Turkey Sandwich ..... 70\nBLUE PLATE (Sat.): Yankee Pot Roast ..... 65\nPie, any kind ..... 15   à la mode ..... 25\nFrappes ..... 20\n\nWe are open for the first train.');
    read(S, S.X0 + 5, 7, 5, 'Train Schedule', 'BOSTON & JUNIPER BAY R.R. — Weekday & Saturday Service\n\nFor Boston (North Station): 6:10 — 9:40 — 1:15 — 5:35\nFrom Boston, arriving: 9:02 — 12:30 — 4:52 — 8:40\n\nThe 4:52 has been on time since 1911.\n— O. Lindqvist, Stationmaster');
  },
};

// ---------------------------------------------------------------- Lantern Tobacco & News
TRADES.tobacco = {
  label: 'Tobacco & News', hours: ['6:00', '20:00'], front: 'Tobacco Counter', back: 'Back Room',
  style: { wall: 'wood_panel', wains: 'wood_dark', floor: 'floor_oak_z', signBg: 'sign_green', signFg: 'sign_gold', frame: 'trim_green' },
  sign: () => ['TOBACCO-NEWS', 'TOBACCO'], glass: () => ['LANTERN TOBACCO & NEWS', 'CIGARS - PIPES - PERIODICALS', 'BOSTON PAPERS DAILY'],
  lore: () => 'Tobacconist and newsdealer since 1912. The Boston papers come in on the 9:02; the Courier comes in on a boy\'s bicycle.',
  ghost: [['CIGARS', 'LANTERN TOBACCO'], ['WHITCOMB POINT CIGARS', '5 CENTS']],
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    // glass cigar counter along the right, pipes and tins behind
    const cx = X1 - 7, z0 = 8, z1 = Zb - 9;
    for (let z = z0; z < z1; z += 6) vCase(S, cx, z, 2, Math.min(6, z1 - z), ['sign_brown', 'wood_light', 'trim_gold', 'sign_cream', 'trim_red', 'wood_mid']);
    shelfWall(S, 'R', z0, z1 + 2, { goods: ['sign_brown', 'trim_red', 'sign_blue', 'sign_yellow', 'wood_light', 'trim_gold', 'sign_green', 'sign_cream'], levels: [5, 7, 9, 11], top: 13 });
    P(S, 'cash_register', cx + 1, 5, z0 + 2, 3);
    for (let z = z0 + 6; z < z1 - 2; z += 7) P(S, 'pipe_stand', cx + 1, 5, z, 3);
    f.box(cx, 5, z0 + 4, 1, 1, 1, MAT.trim_gold); f.box(cx, 6, z0 + 4, 1, 1, 1, MAT.fire);   // the eternal cigar lighter
    b.light(cx + 0.5, 6.5, z0 + 4.5, { color: [1, 0.6, 0.3], radius: 2.5, mode: 'always' });
    const clerk = stand(S, X1 - 3.5, (z0 + z1) / 2, 3, 'counter', ['work'], { lines: ['Evening Globe or the Courier?', 'Half a pound of the Prince Albert, same as always.'] });
    customer(S, cx - 1.8, z0 + 5, 1);
    // the humidor: a glass room in the back corner
    const hx0 = X0 + 1, hx1 = X0 + 12, hz0 = Zb - 12, hz1 = Zb - 1;
    f.box(hx0, 1, hz0, hx1 - hx0, 10, 1, MAT.glass); f.box(hx1, 1, hz0, 1, 10, hz1 - hz0 + 1, MAT.glass);
    f.box(hx0, 11, hz0, hx1 - hx0 + 1, 1, hz1 - hz0 + 1, MAT.wood_dark);
    f.carve(hx1, 1, hz0 + 3, 1, 9, 3);
    shelfWall(S, { axis: 'z', at: hz1, dir: -1 }, hx0, hx1, { goods: ['sign_brown', 'wood_light', 'trim_gold', 'sign_cream', 'wood_pale'], levels: [4, 6, 8], top: 10, board: MAT.wood_light, base: MAT.wood_light });
    browse(S, hx0 + 5, hz0 + 3, 2, { lines: ['Havanas. Smell that.'] });
    // magazines along the left wall, newspapers by the door
    shelfWall(S, 'L', 6, Math.min(S.hallEnd - 1, Zb - 14), { goods: G.toys, levels: [4, 6, 8, 10], top: 11, depth: 1, gap: 0.05, seg: 2, cabinet: 3 });
    for (let z = 8; z < Math.min(S.hallEnd - 2, Zb - 16); z += 5) P(S, 'magazine_rack', X0 + 2, 1, z, 1);
    vCounter(S, S.doorC + 4, 5, 5, 3, { h: 3, base: MAT.wood_mid, top: MAT.wood_light });
    for (let i = 0; i < 3; i++) P(S, 'newspaper_pile', S.doorC + 5 + i * 1.6, 4, 6.5, 0);
    const news = stand(S, S.doorC + 6.5, 9.5, 0, 'counter', ['work']);
    // the regulars' chairs by the window
    P(S, 'chair_wood', X0 + 3, 1, 6, 2); P(S, 'chair_wood', X0 + 6, 1, 6, 2); P(S, 'ashtray', X0 + 4.5, 1, 7, 0);
    sit(S, X0 + 3, 6, 2, 'read', ['browse', 'shop'], 0.45, { lines: ['Pemberton\'ll talk for an hour. Mark my words.', 'The Braves are gone to Milwaukee. Milwaukee!'] });
    sit(S, X0 + 6, 6, 2, 'smoke_pipe', ['browse', 'shop'], 0.45);
    browse(S, X0 + 4, 16, 3); browse(S, X0 + 4, 24, 3);
    shopLamps(S);
    job(S, 'tobacconist', [clerk], ['6:00', '20:00'], { outfit: 'shopkeeper', title: 'tobacconist' });
    job(S, 'newsdealer', [news, clerk], ['6:00', '13:00'], { title: 'newsdealer' });
    stockroom(S, { items: ['crate', 'crate_stack', 'newspaper_pile', 'sack_pile'] });
    // cigar blade sign
    sign(S, 'CIGARS', S.W - 3, 9, -3, 1, { bg: '#1f4a33', fg: '#e8c870', scale: 2 }); sign(S, 'CIGARS', S.W - 3, 9, -3, 3, { bg: '#1f4a33', fg: '#e8c870', scale: 2 });
    void rng;
  },
  window(S, a, c) { for (let x = a + 1.5; x < c - 1; x += 2.5) P(S, 'pipe_stand', x, 3, 2.5, 0); P(S, 'newspaper_pile', c - 2, 3, 2.2, 0); },
  readables(S) {
    read(S, S.X1 - 5, 5, 10, 'Price card', 'CIGARS\nWhitcomb Point Perfecto ..... 5c\nHavana Panatela ..... 15c\nBox of 50 (the Mayor\'s brand) ..... $6.50\n\nPIPE TOBACCO by the ounce\nCIGARETTES ..... 23c a pack\n\nPipes repaired. Lighters filled free.\nRacing Form in by noon.');
    read(S, S.X0 + 4, 8, 10, 'Front page — The Juniper Bay Courier', 'SATURDAY, SEPTEMBER 26, 1953 — FIVE CENTS\n\nHARBOR DAYS TODAY: TOWN MARKS 100 YEARS\nParade at 10, Mayor Pemberton to speak at 5:30; time capsule to be sealed for 2053\n\nNovak–Brennan Nuptials at St. Brigid\'s at Two\nPfc. Castellano Home From Korea\nFireworks Over the Harbor at Nine — "Biggest Ever," Says Committee');
  },
};

// ---------------------------------------------------------------- Beaumont Shoes
TRADES.shoes = {
  label: 'Shoes', hours: ['9:00', '18:00'], front: 'Shoe Salon', back: 'Stockroom',
  style: { floor: 'carpet_green', wall: 'wallpaper_cream', wains: 'wood_panel_light', signBg: 'sign_black', signFg: 'sign_gold' },
  sign: () => ['BEAUMONT SHOES', 'BEAUMONT'], glass: () => ['BEAUMONT SHOES', 'FITTED BY X-RAY', 'FOR THE WHOLE FAMILY'],
  lore: () => 'Shoes for the whole family, fitted by X-ray. Mr. Beaumont will tell you your arches are falling.',
  fit(S) {
    const { f, Zb, X0, X1 } = S;
    const zEnd = Math.min(S.hallEnd - 1, Zb - 2);
    shelfWall(S, 'L', 5, zEnd, { goods: G.boxes, levels: [3, 5, 7, 9, 11, 13], top: 14, depth: 2, seg: 2, gap: 0.04, tall: 0, cabinet: 1, ladder: true });
    shelfWall(S, 'R', 5, Zb - 6, { goods: G.boxes, levels: [3, 5, 7, 9, 11, 13], top: 14, depth: 2, seg: 2, gap: 0.04, tall: 0, cabinet: 1 });
    // two back-to-back rows of fitting chairs down the middle
    const cx = Math.round((X0 + X1) / 2), seats = [], kneel = [];
    for (let z = 10; z < Zb - 12; z += 5) {
      for (const [dx, r] of [[-1.4, 3], [1.4, 1]]) {
        P(S, 'chair_upholstered_dining', cx + dx, 1, z, r, { tint: '#3a5a3a' });
        seats.push(sit(S, cx + dx, z, r, 'sit', ['shop'], 0.45, { lines: ['They pinch a little.', 'Do you have these in brown?'] }));
        f.box(cx + dx * 3.2 - 0.5, 1, z, 1, 1, 1, MAT.wood_mid);
        kneel.push(spotAt(S, 'kneel', cx + dx * 3.6, z, r === 1 ? 3 : 1, 'kneel', ['work']));
      }
    }
    f.box(cx - 1, 1, 8, 2, 3, Zb - 20 - 8 + 4, MAT.wood_dark);
    // X-ray shoe fitter
    const xz = Zb - 9;
    f.box(cx - 2, 1, xz, 4, 5, 3, MAT.wood_mid); f.box(cx - 2, 6, xz + 1, 4, 1, 1, MAT.enamel_black); f.carve(cx - 1, 1, xz, 2, 1, 1);
    f.box(cx - 1, 7, xz + 1, 2, 1, 1, MAT.enamel_black);
    browse(S, cx, xz - 1.5, 2, { act: 'look', lines: ['Look! You can see my toes wiggle!'] });
    // mirror, shoeshine stand, small cash desk
    f.box(X0, 1, Zb - 5, 1, 5, 3, MAT.mirror);
    P(S, 'shoeshine_stand', X1 - 4, 1, 6.5, 0);
    const shine = stand(S, X1 - 4, 9, 0, 'shine', ['work']);
    vCounter(S, X1 - 8, Zb - 12, 5, 2, { base: MAT.wood_dark, top: MAT.wood_light });
    P(S, 'cash_register', X1 - 6, 5, Zb - 11, 0);
    const cashier = stand(S, X1 - 5.5, Zb - 8.5, 0, 'counter', ['work']);
    for (let z = 8; z < Zb - 16; z += 7) P(S, 'shoe_display', X1 - 3.2, 1, z, 3);
    shopLamps(S, 'chandelier', 2);
    job(S, 'salesman', [kneel[0], kneel[2] || kneel[0], cashier], ['9:00', '18:00'], { outfit: 'shopkeeper', title: 'shoe salesman' });
    job(S, 'salesman', [kneel[1] || kneel[0], kneel[3] || kneel[0]], ['9:00', '18:00'], { outfit: 'shopkeeper', title: 'shoe salesman' });
    job(S, 'shoeshine', [shine], ['8:00', '16:00'], { title: 'shoeshine boy', age: [14, 19] });
    browse(S, X0 + 4, 14, 3); browse(S, X1 - 6, 12, 1); customer(S, X1 - 6.5, Zb - 14.5, 2);
    stockroom(S, { goods: G.boxes, items: ['crate_stack', 'crate', 'crate_small'] });
  },
  window(S, a, c) { for (let x = a + 1.5; x < c - 1; x += 3) P(S, 'shoe_display', x, 3, 2.3, 0); },
  readables(S) {
    read(S, (S.X0 + S.X1) / 2, 6, S.Zb - 10, 'The X-Ray Shoe Fitter', 'SEE HOW YOUR SHOES FIT!\n\nPut your feet in the slot and look through the viewer — see your very own toes wiggle inside your new shoes.\nFree. Children love it.\n\n(Mr. Beaumont lets the Halloran boy look three times a week. His mother has asked him to stop.)');
  },
};

// ---------------------------------------------------------------- Bay Travel & Telegraph
TRADES.travel = {
  label: 'Travel', hours: ['9:00', '17:00'], front: 'Travel Office', back: 'Back Office', upper: ['office'],
  style: { floor: 'floor_linoleum_green', wall: 'plaster_blue', wains: 'wood_panel', signBg: 'sign_navy', signFg: 'sign_white', frame: 'trim_blue' },
  sign: () => ['BAY TRAVEL', 'TRAVEL'], glass: () => ['BAY TRAVEL & TELEGRAPH', 'STEAMSHIP - AIR - RAIL', 'TELEGRAMS SENT & RECEIVED'],
  lore: () => 'Steamship tickets, railway passage, and the town\'s telegraph office. Every telegram from Korea came through this counter.',
  fit(S) {
    const { f, b, Zb, X0, X1 } = S;
    // two agents' desks facing the door, clients' chairs in front
    const agents = [];
    for (const [x, z] of [[X0 + 7, 16], [X0 + 7, 30]]) {
      agents.push(officeDesk(b, S.sales, x, 1, z, 0, { typewriter: true, act: 'write' }));
      for (const dx of [-1.5, 1.5]) { P(S, 'chair_wood', x + dx, 1, z - 3.4, 2); sit(S, x + dx, z - 3.4, 2, 'talk_sit', ['shop'], 0.45); }
      P(S, 'globe_desk', x + 2, 4, z + 0.4, 0);
    }
    // telegraph counter on the right, with the clocks of the world above
    const tz0 = 8, tz1 = Zb - 10;
    vCounter(S, X1 - 7, tz0, 2, tz1 - tz0, { base: MAT.wood_panel, top: MAT.marble });
    for (let x = 0; x < 3; x++) f.box(X1 - 7, 5, tz0 + 3 + x * 6, 2, 4, 1, MAT.wood_dark);
    P(S, 'typewriter', X1 - 3, 1 + 3, tz0 + 5, 3);
    const tele = stand(S, X1 - 3.5, tz0 + 8, 3, 'type', ['work']);
    customer(S, X1 - 8.8, tz0 + 6, 1, { lines: ['How much for ten words to Boston?'] });
    ['BOSTON', 'LONDON', 'HONOLULU', 'TOKYO'].forEach((c, i) => { const z = tz0 + 2 + i * ((tz1 - tz0 - 4) / 3); P(S, 'clock_wall', X1 - 0.2, 10, z, 3); sign(S, c, X1 - 0.2, 8.6, z, 3, { bg: '#1f2f5f', fg: '#f0ecdc', scale: 0.6 }); });
    posters(S, ['SAIL TO EUROPE', 'FLY TO BERMUDA', 'FLORIDA BY TRAIN', 'SEE ITALY'], 'L', 8, { bg: '#e8dcc0', fg: '#1f2f5f', scale: 1.4 });
    P(S, 'ship_model_case', X0 + 16, 1, Zb - 5, 0);
    P(S, 'magazine_rack', X0 + 2, 1, S.hallEnd - 4, 1);
    P(S, 'bench_park', X0 + 18, 1, 6, 2, {});
    shopLamps(S);
    job(S, 'travel agent', [agents[0]], ['9:00', '17:00'], { outfit: 'clerk', title: 'travel agent' });
    job(S, 'travel agent', [agents[1]], ['9:00', '13:00'], { outfit: 'clerk', title: 'travel agent' });
    job(S, 'telegrapher', [tele], ['8:00', '20:00'], { outfit: 'clerk', title: 'telegraph operator' });
    browse(S, X0 + 3, 12, 3); browse(S, X0 + 16, Zb - 8, 2);
    stockroom(S, { items: ['filing_cabinet', 'crate', 'suitcase_upright'] });
  },
  window(S, a, c) { P(S, 'suitcase_upright', a + 2, 3, 2.3, 0, { tint: '#8a5a3a' }); P(S, 'globe_desk', (a + c) / 2, 3, 2.3, 0); P(S, 'suitcase', c - 2, 3, 2.3, 1, { tint: '#3a4a6a' }); sign(S, 'BERMUDA $189', (a + c) / 2, 6.8, 1.3, 0, { bg: '#e8dcc0', fg: '#1f2f5f', scale: 0.7 }); },
  readables(S) {
    read(S, S.X1 - 6, 6, 14, 'Telegram (carbon copy)', 'WESTERN BAY TELEGRAPH — RECEIVED SEPT 21 1953 — SAN FRANCISCO CAL\n\nMRS ROSA CASTELLANO 31 MARKET ST JUNIPER BAY MASS\n\nMA LANDED SAFE STOP HOME TUESDAY ON THE 452 FROM BOSTON STOP DONT MAKE A FUSS STOP I MEAN IT STOP LOVE SAL\n\n(The clerk wrote on the back: "She made a fuss. Whole block came.")');
    read(S, S.X1 - 6, 6, 26, 'Rates', 'TELEGRAMS — 10 words or less\nTo Boston ..... 45c\nTo New York ..... 60c\nTo Chicago ..... 90c\nTo San Francisco ..... $1.35\nNight letters at reduced rates.\n\nCablegrams to all the world. Money orders.');
  },
};

// ---------------------------------------------------------------- Garrity Hardware
TRADES.hardware = {
  label: 'Hardware', hours: ['7:30', '18:00'], front: 'Hardware Store', back: 'Stockroom',
  style: { floor: 'floor_oak_z', wall: 'plaster_cream', wains: 'wood_panel', signBg: 'sign_green', signFg: 'sign_gold', frame: 'trim_green', door: 'center' },
  sign: () => ['GARRITY HARDWARE', 'HARDWARE'], glass: () => ['GARRITY HARDWARE', 'EST. 1904', 'PAINTS - TOOLS - HOUSEWARES'],
  panel: (S) => 'GARRITY ' + S.built,
  lore: () => 'Michael Garrity opened in 1904 with a wagonload of nails. His son Tom runs it now; Tom\'s brother Francis became Father Garrity of St. Brigid\'s. They grew up in the rooms upstairs.',
  ghost: [['GARRITY HARDWARE', 'PAINTS - GLASS - NAILS'], ['SHERWIN PAINTS', 'COVER THE EARTH']],
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    // wall of little drawers + shelves on the left
    const zL = Math.min(S.hallEnd - 1, Zb - 2);
    f.box(X0, 1, 5, 2, 8, zL - 5, MAT.wood_panel);
    for (let z = 6; z < zL; z += 2) for (let y = 2; y < 9; y += 2) f.box(X0 + 1, y, z, 1, 1, 1, MAT.trim_gold);
    shelfWall(S, 'L', 5, zL, { goods: G.hardware, levels: [11], top: 13, cabinet: 0 });
    f.box(X0, 9, 5, 2, 1, zL - 5, MAT.wood_mid);
    const rc = rightCounter(S, 8, Zb - 12, { goods: G.hardware, top: MAT.wood_light, base: MAT.wood_dark });
    for (let z = 10; z < Zb - 14; z += 6) P(S, 'tools_wall', S.X1 - 0.2, 8, z, 3);
    P(S, 'scale_grocery', rc.x + 1, 5, 14, 3);
    // islands: paint, nail kegs, housewares, rakes for the fall
    const cx = Math.round((X0 + X1) / 2);
    for (let i = 0; i < 3; i++) P(S, 'paint_cans', cx - 4 + i * 3.4, 1, 10, 0);
    for (let i = 0; i < 4; i++) P(S, 'barrel', cx - 5 + i * 2.6, 1, 17, 0, { tint: '#8a6a48' });
    vCounter(S, cx - 6, 22, 12, 4, { h: 3, base: MAT.wood_dark, top: MAT.wood_light });
    for (let x = cx - 5; x < cx + 6; x += 2) f.box(x, 4, 23, 1, 1, 2, Mt(rng.pick(G.hardware)));
    for (let i = 0; i < 6; i++) f.box(cx + 7, 1, 28 + i, 1, 7, 1, MAT.wood_light);
    P(S, 'rope_coil', cx - 4, 1, 30, 0); P(S, 'rope_coil', cx - 4, 1.2, 30, 1);
    P(S, 'lawn_mower', cx - 3, 1, 34, 0); P(S, 'wheelbarrow', cx + 2, 1, 34, 1);
    // the pot-bellied stove and its two chairs
    const sx = X0 + 6, sz = Zb - 7;
    f.cylinder(sx, 1, sz, 1.5, 4, MAT.iron); f.box(sx - 1, 5, sz - 1, 2, 1, 2, MAT.iron); f.box(sx - 0.5 | 0, 6, sz - 0.5 | 0, 1, 9, 1, MAT.iron);
    P(S, 'chair_wood', sx + 3, 1, sz - 2, 3); P(S, 'chair_wood', sx - 1, 1, sz - 3.5, 2);
    sit(S, sx + 3, sz - 2, 3, 'talk_sit', ['browse', 'shop'], 0.45, { lines: ['Coldest winter since \'34, you watch.', 'Tom, you still got those stovepipe elbows?'] });
    sit(S, sx - 1, sz - 3.5, 2, 'smoke_pipe', ['browse', 'shop'], 0.45);
    shopLamps(S);
    job(S, 'proprietor', [rc.clerk], ['7:30', '18:00'], { outfit: 'shopkeeper', title: 'hardware man' });
    job(S, 'clerk', [stand(S, cx, 13, 0, 'shelve', ['work']), stand(S, X0 + 4, 20, 3, 'shelve', ['work'])], ['7:30', '17:00'], { outfit: 'shopkeeper', title: 'hardware clerk' });
    browse(S, cx - 2, 8, 2); browse(S, X0 + 4, 12, 3); browse(S, cx + 1, 20, 2);
    stockroom(S, { goods: G.hardware, items: ['lumber_rack', 'crate_stack', 'paint_cans', 'barrel', 'sack_pile'] });
    P(S, 'lumber_rack', S.W / 2, 1, S.bd - 4, 0);
  },
  window(S, a, c) { P(S, 'paint_cans', a + 2, 3, 2.3, 0); for (let x = a + 4; x < c - 2; x += 1.5) S.f.box(Math.round(x), 3, 2, 1, 6, 1, MAT.wood_light); P(S, 'pumpkin', c - 2, 3, 2.3, 0); sign(S, 'FALL CLEAN-UP', (a + c) / 2, 8.2, 1.2, 0, { bg: '#d9782e', fg: '#1d1d22', scale: 0.7 }); },
  readables(S) {
    read(S, S.X1 - 6, 6, 12, 'A framed dollar bill', 'THE FIRST DOLLAR\ntaken in trade by Michael Garrity, Market Street, April 4, 1904 — for a keg of tenpenny nails.\n\nA pencilled note underneath, in a boy\'s hand: "Pop says never spend it." — F.G., age 9');
    read(S, S.X0 + 3, 6, S.Zb - 8, 'Ledger, 1932', 'Accounts carried, winter 1932–33. Page after page, the same entry in Mike Garrity\'s hand:\n\n"Coal shovel, stovepipe, glass for the front window — pay when you can."\n\nMost of them did. The last one in 1941.');
  },
};

// ---------------------------------------------------------------- Ellsworth Loan & Jewelry
TRADES.pawn = {
  label: 'Loans', hours: ['9:00', '18:00'], front: 'Loan Office', back: 'Pledge Room',
  style: { floor: 'floor_linoleum', wall: 'plaster_green', wains: 'wood_dark', signBg: 'sign_black', signFg: 'sign_gold', awningMode: 'rolled' },
  sign: () => ['LOANS', 'ELLSWORTH'], glass: () => ['ELLSWORTH LOAN & JEWELRY', 'MONEY LOANED ON ANYTHING OF VALUE', 'UNREDEEMED PLEDGES FOR SALE'],
  lore: () => 'Uncle Ellsworth\'s, the sailors call it. Half the town\'s wedding rings have spent a winter in the back.',
  fit(S) {
    const { f, Zb, X0, X1, W } = S;
    // the three golden balls
    f.box(W - 2, 26, -6, 1, 1, 5, MAT.iron); f.box(W - 2, 24, -6, 1, 2, 1, MAT.iron); f.box(W - 2, 24, -1, 1, 2, 1, MAT.iron);
    f.sphere(W - 1.5, 22.6, -7.2, 1.1, MAT.trim_gold); f.sphere(W - 1.5, 22.6, -4.8, 1.1, MAT.trim_gold); f.sphere(W - 1.5, 20.5, -6, 1.1, MAT.trim_gold);
    // a caged counter across the back of the shop
    const cz = Zb - 10;
    vCounter(S, X0 + 2, cz, X1 - X0 - 12, 2, { base: MAT.wood_dark, top: MAT.wood_light });
    for (let x = X0 + 2; x < X1 - 10; x += 2) f.box(x, 5, cz, 1, 7, 1, MAT.iron);
    f.box(X0 + 2, 12, cz, X1 - X0 - 12, 1, 1, MAT.iron); f.carve(X0 + 8, 5, cz, 5, 4, 1);
    const broker = stand(S, X0 + 10.5, cz + 3, 0, 'counter', ['work'], { lines: ['I can do eleven dollars. Not a nickel more.', 'Sixty days, two percent a month. Sign here.'] });
    customer(S, X0 + 10.5, cz - 2, 2, { lines: ['It was my father\'s.'] });
    P(S, 'jewelry_case', X0 + 6, 1, cz - 4, 0); P(S, 'jewelry_case', X0 + 16, 1, cz - 4, 0);
    // walls of unredeemed pledges
    P(S, 'instrument_wall', X0 + 0.2, 5, 14, 1); P(S, 'instrument_wall', X0 + 0.2, 5, 22, 1);
    shelfWall(S, 'R', 6, cz - 2, { goods: G.radio, levels: [4, 7, 10], top: 12 });
    for (let z = 8; z < cz - 3; z += 5) P(S, 'radio_table', S.X1 - 1.2, 5, z, 3);
    P(S, 'guitar', X0 + 2, 1, 30, 1); P(S, 'typewriter', X1 - 1.2, 8, 12, 3); P(S, 'camera', X1 - 1.2, 8, 16, 3);
    P(S, 'safe_small', X1 - 3, 1, Zb - 3, 0); P(S, 'suitcase_upright', X0 + 3, 1, cz - 3, 0);
    P(S, 'trumpet', X0 + 1, 9, 30, 1); P(S, 'clarinet', X0 + 1, 9, 32, 1);
    shopLamps(S, 'ceiling_lamp', 2);
    job(S, 'pawnbroker', [broker], ['9:00', '18:00'], { outfit: 'shopkeeper', title: 'pawnbroker' });
    browse(S, X0 + 4, 16, 3); browse(S, X0 + 14, 10, 0);
    stockroom(S, { items: ['trunk', 'suitcase_upright', 'crate', 'radio_console', 'sewing_machine'] });
  },
  window(S, a, c) { P(S, 'radio_table', a + 1.5, 3, 2.2, 0); P(S, 'trumpet', (a + c) / 2, 3, 2.2, 0); P(S, 'camera', c - 1.5, 3, 2.2, 0); P(S, 'typewriter', (a + c) / 2 + 2, 3, 2.3, 0); },
  readables(S) {
    read(S, S.X0 + 10.5, 6, S.Zb - 11, 'Pledge ticket No. 4471', 'ELLSWORTH LOAN & JEWELRY — PLEDGE No. 4471\nDate: Feb. 9, 1932\nArticle: One gold pocket watch, hunter case, engraved inside the lid:\n"J. TOBEY — MARY ELLEN — 1866"\nLoaned: $4.00\n\nNever redeemed. Old Ellsworth would not sell it. It is still in the safe.\n\n(John Tobey was the MARY ELLEN\'s mate until he broke his arm on the wharf a week before her last voyage. Young Nathaniel Dunmore sailed in his place. The schooner was lost with all eleven hands off Gannet Ledge in the Great Gale of October 1867, and Tobey never went to sea again.)');
  },
};

// ---------------------------------------------------------------- taverns: The Signal Lamp, The Anchor & Chain
function fitBar(S, o) {
  const { f, b, Zb, X0, X1, rng } = S;
  const z0 = 7, z1 = Math.min(Zb - 5, S.hallEnd + 12);
  // back bar against the left wall: cabinet, bottles, mirror, crown
  f.box(X0, 1, z0, 2, 3, z1 - z0, MAT.wood_dark); f.box(X0, 4, z0, 2, 1, z1 - z0, MAT.bar_top);
  for (let z = z0 + 1; z < z1 - 1; z++) if (rng.chance(0.75)) f.box(X0, 5, z, 1, rng.int(1, 2), 1, Mt(rng.pick(G.bottles)));
  f.box(X0, 7, z0, 1, 4, z1 - z0, MAT.mirror); f.box(X0, 11, z0, 2, 1, z1 - z0, MAT.wood_dark);
  for (let z = z0 + 1; z < z1 - 1; z++) if (rng.chance(0.8)) f.box(X0, 12, z, 1, 1, 1, Mt(rng.pick(G.bottles)));
  f.box(X0, 13, z0, 2, 2, z1 - z0, MAT.wood_dark);
  for (let z = z0; z < z1; z += 6) f.box(X0 + 1, 5, z, 1, 8, 1, MAT.wood_dark);
  // the bar itself
  const bx = X0 + 4;
  f.box(bx, 1, z0, 3, 3, z1 - z0, MAT.wood_panel); f.box(bx, 4, z0, 3, 1, z1 - z0, MAT.bar_top); f.box(bx - 1, 4, z0, 1, 1, z1 - z0, MAT.bar_top);
  f.box(bx + 3, 1, z0, 1, 1, z1 - z0, MAT.trim_gold);
  f.box(bx, 1, z1, 3, 4, 1, MAT.wood_panel);
  P(S, 'beer_taps', bx + 1, 5, z0 + 6, 1); P(S, 'beer_taps', bx + 1, 5, z1 - 8, 1);
  P(S, 'cash_register', X0 + 1, 5, z1 - 3, 1); P(S, 'bar_back_shelf', X0 + 0.5, 5, (z0 + z1) / 2, 1);
  for (let z = z0 + 3; z < z1 - 2; z += 7) P(S, 'glass_wine', bx + 1, 5, z, 1);
  const stools = stoolRow(S, z0 + 2, z1 - 2, bx + 5.3, 3, { axis: 'z', type: 'bar_stool', tags: ['bar'], act: 'drink', step: 3 });
  const tend = stand(S, X0 + 2.5, (z0 + z1) / 2, 1, 'bartend', ['work'], { lines: o.bartenderLines });
  const tend2 = stand(S, X0 + 2.5, z0 + 5, 1, 'bartend', ['work']);
  // television up at the end of the bar
  vTV(S, X0, 11, z1 + 1, { back: false, w: 3, h: 3 });
  // booths along the right wall
  const booths = [];
  for (let u = 8; u + 7 <= Zb - 6; u += 8) booths.push(...vBooth(S, u, X1 - 1, { axis: 'z', flip: true, depth: 4, seat: o.boothSeat ?? MAT.velvet_red, top: MAT.bar_top, tags: ['bar'], act: 'drink', settings: false }));
  P(S, 'jukebox', X1 - 2, 1, Zb - 3, 0);
  if (o.pool && Zb - z1 > 14) { P(S, 'pool_table', (bx + 6 + X1 - 5) / 2, 1, Zb - 8, 1); stand(S, (bx + 6 + X1 - 5) / 2 - 5, Zb - 8, 1, 'lean', ['bar']); }
  else P(S, 'pinball_machine', X0 + 3, 1, Zb - 3, 0);
  for (let z = 10; z < Zb - 4; z += 12) P(S, 'ceiling_lamp', (X0 + X1) / 2, 13, z, 0);
  // neon in the window
  if (S.windows.length) { const [a, c] = S.windows[S.windows.length - 1]; S.f.text(o.neon || 'BEER', Math.round((a + c) / 2), 5, 3, MAT.neon_red, { align: 'center', font: 'small' }); }
  S.stools = stools; S.booths = booths;
  return { tend, tend2, stools, booths };
}
TRADES.bar = {
  label: 'Tavern', hours: ['11:00', '24:00'], front: 'Barroom', back: 'Back Room', light: [1, 0.78, 0.5],
  style: { floor: 'floor_walnut', wall: 'wallpaper_red', wains: 'wood_panel', signBg: 'sign_black', signFg: 'sign_gold', awningMode: 'none', bulk: 'wood_panel' },
  pre(S) { S.anchor = /anchor/i.test(S.spec.name); if (S.anchor) S.st.wall0 = MAT.wood_panel_light; },
  sign: (spec) => /anchor/i.test(spec.name) ? ['ANCHOR & CHAIN'] : ['SIGNAL LAMP', 'TAVERN'],
  glass: (spec) => /anchor/i.test(spec.name) ? ['THE ANCHOR & CHAIN', 'ALES - LAGER - CHOWDER', 'SEAFARING MEN WELCOME'] : ['THE SIGNAL LAMP', 'TAVERN', 'LADIES INVITED'],
  lore: (spec) => /anchor/i.test(spec.name) ? 'Sailors\' bar since the whaling days. The chain over the door came off the MARY ELLEN\'s sister ship.' : 'Named for the brass lamp over the bar, which hung in the lantern room of Whitcomb Point Light from 1868 until 1901.',
  fit(S) {
    const A = S.anchor;
    const r = fitBar(S, { pool: A, neon: A ? 'ALE' : 'BEER', boothSeat: A ? MAT.velvet_blue : MAT.velvet_red, bartenderLines: A ? ['What\'ll it be, sailor?', 'Chowder\'s on. Clam, not the red stuff.'] : ['Narragansett or Ballantine?', 'Fights are on at ten. Marciano\'s getting married, did you hear?'] });
    job(S, 'bartender', [r.tend], ['11:00', '23:59'], { title: 'bartender' });
    job(S, 'bartender', [r.tend2, r.tend], ['17:00', '23:59'], { title: 'bartender' });
    if (A) job(S, 'waitress', [stand(S, S.X1 - 7, 20, 3, 'serve', ['work'])], ['17:00', '23:59'], { outfit: 'waitress', sex: 'F' });
    const { f, b } = S;
    if (!A) {
      // the old lighthouse signal lamp hanging over the bar
      const lx = S.X0 + 5, lz = 18;
      f.box(lx, 13, lz, 1, 2, 1, MAT.iron); f.box(lx - 1, 10, lz - 1, 3, 3, 3, MAT.trim_gold); f.box(lx, 11, lz - 1, 1, 1, 3, MAT.lamp_glass); f.box(lx - 1, 11, lz, 3, 1, 1, MAT.lamp_glass);
      b.light(lx + 0.5, 11, lz + 0.5, { color: [1, 0.75, 0.4], radius: 6, mode: 'room', room: S.sales });
    } else {
      P(S, 'ships_wheel_wall', S.X1 - 0.3, 9, S.Zb - 10, 3); P(S, 'anchor', S.X0 + 12, 1, 6, 0);
      P(S, 'fishing_net_pile', S.X1 - 3, 1, 5, 0); P(S, 'life_ring_post', S.X1 - 2, 1, S.Zb - 16, 3);
    }
    browse(S, S.X0 + 12, 8, 3, { act: 'drink_stand', tags: ['bar'] });
    stockroom(S, { items: ['barrel', 'barrel_stack', 'crate_stack', 'crate'] });
  },
  readables(S) {
    if (S.anchor) {
      read(S, S.X1 - 1, 7, 14, 'Photograph over the booths', 'The schooner MARY ELLEN at Whitcomb\'s wharf, summer of 1867 — the last picture of her.\n\nLost off Gannet Ledge in the Great Gale, October 1867, with all eleven hands:\nCapt. Josiah Dunmore, master, 41 — Nathaniel Dunmore, his son, mate, 19 — Samuel Whitcomb, 23 — Ezra Coffin, 35 — Thomas Pruitt, 28 — John Hallett, 44 — William Doane, 31 — Patrick Flynn, 22 — Benjamin Crowell, 38 — Hiram Nickerson, cook, 52 — and Isaiah Snow, cabin boy, 14.\n\nThere is a glass of rum on the shelf under the picture that nobody drinks.');
    } else {
      read(S, S.X0 + 6, 8, 18, 'The Signal Lamp', 'This brass lamp hung in the lantern room of Whitcomb Point Light from its first lighting in 1868 until the new Fresnel lens came in 1901.\n\nKeeper Amos Fisk comes in every Saturday at four for one beer, and to check that it is being polished.');
    }
    read(S, S.X0 + 7, 6, 8, 'Chalkboard', 'TONIGHT\nFights on the television at 10\n\nDraft ..... 15\nBottle ..... 25\nShot & a beer ..... 40\nPickled eggs ..... 5\nChowder (cup) ..... 20\n\nNO CREDIT — NO SINGING BEFORE NINE');
  },
};

// ---------------------------------------------------------------- Tremblay Furniture
TRADES.furniture = {
  label: 'Furniture', hours: ['9:00', '18:00'], front: 'Showroom', back: 'Warehouse', upper: ['store', 'apt'],
  style: { floor: 'carpet_beige', wall: 'wallpaper_cream', wains: 'wood_panel_light', signBg: 'sign_navy', signFg: 'sign_gold', frame: 'trim_dark' },
  sign: () => ['TREMBLAY FURNITURE', 'FURNITURE'], glass: () => ['TREMBLAY FURNITURE', 'EASY TERMS - FREE DELIVERY', 'TELEVISION - APPLIANCES'],
  lore: () => 'Armand Tremblay, cabinetmaker, came down from Trois-Rivières in 1922. Half the parlors on Maple Street were furnished on his layaway plan.',
  ghost: [['TREMBLAY FURNITURE', 'EASY TERMS']],
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const cx = (X0 + X1) / 2;
    const tag = (t, x, z) => sign(S, t, x, 1.1, z, 0, { bg: '#f0ecdc', fg: '#b3302a', border: '#1d1d22', scale: 0.4 });
    // living-room suite with a new television
    f.box(X0 + 2, 0, 6, 26, 1, 16, MAT.rug_oriental);
    P(S, 'sofa', X0 + 15, 1, 19, 0, { tint: '#5a6a4a' }); P(S, 'armchair', X0 + 5, 1, 13, 1, { tint: '#8a5a3a' }); P(S, 'armchair', X0 + 25, 1, 13, 3, { tint: '#8a5a3a' });
    P(S, 'table_coffee', X0 + 15, 1, 13.5, 0); P(S, 'tv_console', X0 + 15, 1, 8, 2); P(S, 'lamp_floor', X0 + 3, 1, 20, 0); tag('$189 THE SUITE', X0 + 15, 16);
    tag('ADMIRAL 21 IN. $239', X0 + 15, 10.5);
    // dining room
    P(S, 'table_dining', cx + 12, 1, 14, 0); for (const [dx, dz, r] of [[-3, -2.8, 2], [0, -2.8, 2], [3, -2.8, 2], [-3, 2.8, 0], [0, 2.8, 0], [3, 2.8, 0]]) P(S, 'chair_upholstered_dining', cx + 12 + dx, 1, 14 + dz, r);
    P(S, 'sideboard', cx + 12, 1, 7, 2); P(S, 'chandelier', cx + 12, 12, 14, 0); P(S, 'cabinet_china', X1 - 2, 1, 14, 3); tag('9 PC. MAPLE $149', cx + 12, 18.5);
    // bedroom
    P(S, 'bed_double', X0 + 12, 1, 34, 0, { tint: '#d8a0b8' }); P(S, 'nightstand', X0 + 6.5, 1, 37, 0); P(S, 'dresser', X0 + 22, 1, 30, 3); P(S, 'lamp_table', X0 + 6.5, 3.4, 37, 0); tag('BEDROOM $129', X0 + 12, 28);
    // dinette in chrome and red
    P(S, 'table_kitchen', cx + 12, 1, 32, 0, { tint: '#c84a3a' }); for (const [dx, dz, r] of [[-2.8, 0, 1], [2.8, 0, 3], [0, -2.6, 2], [0, 2.6, 0]]) P(S, 'chair_kitchen', cx + 12 + dx, 1, 32 + dz, r, { tint: '#c84a3a' }); tag('DINETTE $59.95', cx + 12, 27.5);
    // rockers and recliners by the back
    for (let i = 0; i < 4; i++) P(S, i % 2 ? 'rocking_chair' : 'armchair', X0 + 6 + i * 6, 1, Zb - 8, 0, { tint: rng.pick(FABRIC) });
    // sales desk
    const desk = officeDesk(b, S.sales, X1 - 8, 1, Zb - 12, 0, { typewriter: false, act: 'write' });
    shopLamps(S, 'chandelier', 3);
    const s1 = stand(S, X0 + 20, 22, 3, 'talk', ['work'], { lines: ['A little down and a little each week, Mrs. Kowalski.', 'That\'s solid maple. Your grandchildren will fight over it.'] });
    const s2 = stand(S, cx + 6, 24, 1, 'talk', ['work']);
    job(S, 'salesman', [s1, desk], ['9:00', '18:00'], { outfit: 'shopkeeper', title: 'furniture salesman' });
    job(S, 'salesman', [s2, desk], ['9:00', '18:00'], { outfit: 'shopkeeper', title: 'furniture salesman' });
    job(S, 'deliveryman', [stand(S, S.W - 8, S.Zb + 6, 2, 'carry', ['work'], { room: S.back })], ['8:00', '16:00'], { outfit: 'dock', title: 'delivery man' });
    sit(S, X0 + 15 - 2.4, 19, 0, 'sit', ['shop'], 0.42); sit(S, X0 + 15 + 2.4, 19, 0, 'sit', ['shop'], 0.42);
    browse(S, X0 + 14, 26, 2); browse(S, cx + 12, 22, 0); browse(S, cx + 8, 36, 0);
    stockroom(S, { items: ['crate_stack', 'wardrobe', 'dresser', 'sofa', 'armchair', 'mattress'] });
  },
  window(S, a, c) { P(S, 'armchair', a + 2.5, 3, 2.3, 0, { tint: '#b3302a' }); P(S, 'lamp_floor', a + 5, 3, 2.3, 0); if (c - a > 12) P(S, 'tv_console', c - 3, 3, 2.3, 0); },
  yardProps(S, y0) { P(S, 'truck_delivery', S.W / 2, 0, y0 + 1, 1, { tint: '#2a4a3a', cat: 'far' }); },
  readables(S) { read(S, S.X1 - 8, 6, S.Zb - 13, 'Layaway card', 'TREMBLAY FURNITURE — LAYAWAY No. 1187\nMr. & Mrs. Robert Brennan (Helen Novak)\n1 Bedroom suite, maple, 4 pc. ..... $129.00\nDown ..... $10.00\nWeekly ..... $2.00\n\nDeliver: Sept. 28 — "after the honeymoon," says the note. "Niagara Falls. Don\'t come early."'); },
};

// ---------------------------------------------------------------- Kowalski's Market
TRADES.grocery = {
  label: 'Market', hours: ['7:00', '19:00'], front: 'Market', back: 'Stockroom', family: 'Kowalski',
  style: { floor: 'floor_oak', wall: 'plaster_cream', wains: 'wood_panel', signBg: 'sign_red', signFg: 'sign_white', awning: ['awning_red', 'canvas_white'], door: 'center' },
  sign: () => ["KOWALSKI'S MARKET", 'KOWALSKI', 'MARKET'], glass: () => ["KOWALSKI'S MARKET", 'GROCERIES - MEATS - PROVISIONS', 'POLISH SAUSAGE - FRESH DAILY'],
  lore: () => 'Walter Kowalski came to work the cannery in 1908 and opened this market in 1915. The kielbasa is his mother\'s recipe; the credit ledger kept a street alive in 1932.',
  ghost: [['KOWALSKI', 'GROCERIES & MEATS']],
  fit(S) {
    const { f, Zb, X0, X1, rng } = S;
    const zL = Math.min(S.hallEnd - 1, Zb - 2);
    shelfWall(S, 'L', 5, zL, { goods: G.grocery, levels: [5, 8, 11], top: 13, ladder: true });
    if (S.alcoveZ) shelfWall(S, 'A', S.alcoveZ[0], S.alcoveZ[1] - 1, { goods: G.grocery, levels: [5, 8, 11], top: 13 });
    const rc = rightCounter(S, 8, Zb - 14, { goods: G.grocery, top: MAT.wood_light });
    P(S, 'scale_grocery', rc.x + 1, 5, 14, 3); P(S, 'candy_jars', rc.x + 1, 5, 19, 3); P(S, 'bread_box', rc.x + 1, 5, 23, 3);
    // produce stand in the middle
    const cx = Math.round((X0 + X1) / 2) - 1;
    f.box(cx - 6, 1, 10, 12, 2, 5, MAT.wood_mid); f.box(cx - 6, 3, 13, 12, 1, 2, MAT.wood_mid);
    const produce = ['sign_red', 'sign_orange', 'leaves_green', 'sign_yellow', 'pumpkin', 'sign_brown'];
    for (let i = 0; i < 6; i++) { f.box(cx - 6 + i * 2, 3, 10, 2, 1, 3, Mt(produce[i])); f.box(cx - 6 + i * 2, 4, 13, 2, 1, 2, Mt(produce[(i + 3) % 6])); }
    P(S, 'barrel', cx - 4, 1, 19, 0); P(S, 'barrel', cx - 1.5, 1, 19, 0); P(S, 'sack_pile', cx + 3, 1, 19, 0); P(S, 'pumpkin', cx - 7, 1, 8, 0);
    // meat case at the back
    P(S, 'meat_counter', cx - 3, 1, Zb - 7, 0); P(S, 'meat_counter', cx + 3, 1, Zb - 7, 0);
    const butcher = stand(S, cx, Zb - 3, 0, 'counter', ['work'], { lines: ['Kielbasa\'s fresh this morning.', 'Two pounds of the chuck for Mrs. Novak — for the wedding people.'] });
    customer(S, cx, Zb - 10, 2);
    shopLamps(S);
    job(S, 'grocer', [rc.clerk], ['7:00', '19:00'], { outfit: 'shopkeeper', title: 'grocer' });
    job(S, 'butcher', [butcher], ['7:00', '18:00'], { outfit: 'cook', title: 'butcher' });
    job(S, 'stock boy', [stand(S, X0 + 4, 16, 3, 'shelve', ['work']), stand(S, X0 + 4, 30, 3, 'shelve', ['work'])], ['8:00', '17:00'], { title: 'stock boy', age: [15, 22] });
    browse(S, X0 + 4, 10, 3); browse(S, cx, 8, 2); browse(S, X0 + 4, 24, 3); browse(S, cx + 5, 22, 1);
    stockroom(S, { goods: G.grocery, items: ['sack_pile', 'crate_stack', 'barrel', 'crate', 'milk_bottles'] });
    void rng;
  },
  window(S, a, c) {
    const f = S.f, rng = S.rng;
    for (let i = 0; i < 4; i++) for (let x = a + 1 + i; x < c - 1 - i; x++) f.box(x, 3 + i, 2, 1, 1, 1, (x + i) % 2 ? MAT.sign_red : MAT.sign_white);
    sign(S, 'SPECIALS', (a + c) / 2, 8.4, 1.2, 0, { bg: '#f0ecdc', fg: '#b3302a', scale: 0.7 }); void rng;
  },
  readables(S) {
    read(S, S.X1 - 6, 6, 10, 'Price card', 'THIS WEEK AT KOWALSKI\'S\nCoffee, 1 lb ..... 93c\nButter, 1 lb ..... 73c\nEggs, doz. ..... 69c\nBread (Halloran\'s) ..... 18c\nPolish Kielbasa, lb ..... 59c\nPotatoes, 10 lb ..... 35c\nMacIntosh apples, 3 lb ..... 25c\nPumpkins ..... 15c and up\n\nWe deliver. Tel. 418.');
    read(S, 4, 6, S.Zb + 5, 'The credit ledger, 1932–1934', 'A thick book with a cracked green spine. Families, pages, amounts: $3.10, $11.45, $26.80.\n\nAcross the page for July 1934 — the strike — Walter Kowalski has drawn a single line and written in Polish: "Zapłacone. Wszystko." ("Paid. All of it.")\n\nNobody had paid anything.');
  },
};

// ---------------------------------------------------------------- Sweet Shoppe
TRADES.candy = {
  label: 'Candy', hours: ['9:00', '21:00'], front: 'Candy Shop', back: 'Kitchen',
  style: { floor: 'floor_checker_red', wall: 'tile_pink', wains: 'enamel_white', signBg: 'sign_red', signFg: 'sign_white', awning: ['awning_red', 'canvas_white'], frame: 'trim_red' },
  sign: () => ['SWEET SHOPPE', 'SWEETS'], glass: () => ['SWEET SHOPPE', 'HOMEMADE CANDIES', 'PENNY CANDY'],
  lore: () => 'Penny candy, fudge made in the back, salt-water taffy in summer. The town\'s children know the exact price of everything in the case.',
  fit(S) {
    const { f, Zb, X0, X1 } = S;
    const cz = 14;
    vCase(S, X0 + 4, cz, X1 - X0 - 12, 3, G.candy, { rim: MAT.chrome });
    vCase(S, X1 - 8, cz, 3, Zb - 12 - cz, G.candy, { rim: MAT.chrome });
    for (let x = X0 + 6; x < X1 - 10; x += 4) P(S, 'candy_jars', x, 5, cz + 1.5, 0);
    shelfWall(S, 'B', X0 + 1, S.W - 12, { goods: G.candy, levels: [5, 7, 9, 11], top: 12 });
    shelfWall(S, 'L', 5, Math.min(S.hallEnd - 1, Zb - 2), { goods: G.candy, levels: [6, 9], top: 11, cabinet: 3 });
    P(S, 'gumball_machine', S.doorC - 4, 1, 6, 0); P(S, 'gumball_machine', S.doorC + 4, 1, 6, 0);
    P(S, 'cash_register', X1 - 6.5, 5, cz + 4, 3);
    const clerk = stand(S, (X0 + X1) / 2, cz + 5, 0, 'counter', ['work'], { lines: ['Two for a penny, dear.', 'Fudge is fresh at four.'] });
    for (const x of [X0 + 8, X0 + 14, X0 + 20]) browse(S, x, cz - 2.2, 2, { act: 'look', lines: ['I want the red ones.', 'How much are the wax lips?'] });
    shopLamps(S);
    job(S, 'clerk', [clerk], ['9:00', '21:00'], { sex: 'F', title: 'candy counter girl' });
    const cook = stand(S, S.W / 2, S.Zb + 5, 2, 'cook', ['work'], { room: S.back });
    job(S, 'candymaker', [cook, clerk], ['9:00', '17:00'], { outfit: 'cook', title: 'candymaker' });
    stockroom(S, { items: ['sack_pile', 'crate', 'barrel'] });
    P(S, 'stove', S.W / 2, 1, S.Zb + 2.5, 2);
  },
  window(S, a, c) { for (let x = a + 1.5; x < c - 1; x += 2) P(S, 'candy_jars', x, 3, 2.3, 0); P(S, 'cake_stand', (a + c) / 2, 3, 2.4, 0); },
  readables(S) { read(S, (S.X0 + S.X1) / 2, 6, 13, 'Penny Candy', 'ONE CENT\nMary Janes — Squirrel Nut Zippers — Tootsie Rolls — Root Beer Barrels — Bit-O-Honey\n\nTWO FOR A CENT\nSwedish Fish — Licorice Pipes — Wax Lips (Sat. only)\n\nFUDGE (made here) ..... 49c lb\nCENTENNIAL FUDGE, maple walnut, 1853 recipe ..... 59c lb'); },
};

// ---------------------------------------------------------------- Nets & Tackle (downtown & waterfront)
TRADES.tackle = {
  label: 'Tackle', hours: ['5:00', '17:00'], front: 'Tackle Shop', back: 'Net Loft', floors: 2,
  style: { floor: 'floor_pine_z', wall: 'wood_panel_light', wains: 'wood_dark', signBg: 'sign_navy', signFg: 'sign_white', frame: 'trim_blue', awning: ['awning_blue', 'canvas_white'] },
  pre(S) {
    if (S.lot.m.x0 < 50) {
      // the waterfront shop is an old shingled net shed with a gable to the street
      S.shed = true;
      Object.assign(S.st, { outer: MAT.shingle_wall, gable: true, roofMat: MAT.roof_shingle_gray, trim: MAT.trim_white, pier: MAT.wood_gray, wains: MAT.wood_gray, wall0: MAT.wood_panel_light, awning: 'rolled', oriel: false, winFrame: MAT.trim_white });
    }
  },
  sign: (spec) => [(spec.name || '').toUpperCase(), 'NETS & TACKLE', 'TACKLE'], glass: () => ['NETS & TACKLE', 'BAIT - ICE - FOUL WEATHER GEAR', 'EST. 1911'],
  lore: () => 'Nets mended, lines spooled, bait and ice before dawn. The tide table is chalked on the door every morning.',
  ghost: [['NETS & TACKLE', 'BAIT - ICE - GEAR']],
  fit(S) {
    const { f, Zb, X0, X1, rng } = S;
    // rod racks along the left wall
    const zL = Math.min(S.hallEnd - 1, Zb - 2);
    f.box(X0, 1, 5, 2, 1, zL - 5, MAT.wood_dark); f.box(X0, 11, 5, 2, 1, zL - 5, MAT.wood_dark);
    for (let z = 6; z < zL - 1; z += 2) f.box(X0 + 1, 2, z, 1, rng.int(8, 10), 1, Mt(rng.pick(['wood_light', 'trim_dark', 'sign_yellow', 'wood_pale', 'trim_dark'])));
    // buoys and floats hung on the right wall, nets on the shelves above
    for (let z = 8; z < Zb - 10; z += 3) P(S, 'buoy', S.X1 - 0.6, 7 + (z % 2), z, 3, { tint: rng.pick(['#c8302a', '#e8e0d0', '#e0b030', '#2a6a3a', '#2a4a8a']) });
    f.box(S.X1 - 2, 11, 6, 2, 1, Zb - 14, MAT.wood_mid);
    for (let z = 8; z < Zb - 12; z += 5) P(S, 'fishing_net_pile', S.X1 - 1.5, 12, z, 3);
    // lure case & counter at the back, bait tank, traps
    const cz = Zb - 12;
    vCase(S, X0 + 6, cz, X1 - X0 - 16, 3, G.marine);
    P(S, 'cash_register', X0 + 8, 5, cz + 1.5, 0);
    const clerk = stand(S, X0 + 14, cz + 5, 0, 'counter', ['work'], { lines: ['Stripers are running off the ledge.', 'High water\'s at 11:40. You\'ve got time.'] });
    customer(S, X0 + 14, cz - 2, 2);
    f.box(X1 - 9, 1, 8, 5, 3, 4, MAT.wood_dark); f.box(X1 - 8, 4, 9, 3, 1, 2, MAT.water); f.box(X1 - 9, 4, 8, 5, 1, 1, MAT.wood_dark);
    P(S, 'lobster_trap_stack', (X0 + X1) / 2, 1, 22, 0); P(S, 'rope_coil', (X0 + X1) / 2 + 4, 1, 16, 0); P(S, 'rope_coil', (X0 + X1) / 2 + 4, 1.2, 16, 2);
    P(S, 'anchor', (X0 + X1) / 2 - 4, 1, 14, 0); P(S, 'coat_rack', X0 + 4, 1, cz - 3, 0, { tint: '#e0b030' }); P(S, 'oil_drum', X1 - 4, 1, cz - 3, 0, { tint: '#2a4a3a' });
    // a mounted striper on the back wall
    const fz = Zb - 1;
    f.box(X0 + 10, 9, fz, 8, 3, 1, MAT.wood_dark); f.box(X0 + 11, 10, fz - 1, 6, 1, 1, MAT.steel); f.box(X0 + 12, 11, fz - 1, 3, 1, 1, MAT.granite); f.box(X0 + 17, 10, fz - 1, 1, 1, 1, MAT.trim_dark);
    shopLamps(S);
    job(S, 'clerk', [clerk], ['5:00', '17:00'], { outfit: 'fisherman', title: 'tackle man' });
    job(S, 'net mender', [sit(S, S.W / 2, S.Zb + 6, 0, 'sew', ['work'], 0.45, { room: S.back })], ['6:00', '15:00'], { outfit: 'fisherman', title: 'net mender' });
    browse(S, X0 + 4, 12, 3); browse(S, S.X1 - 4, 14, 1); browse(S, (X0 + X1) / 2, 18, 2);
    stockroom(S, { goods: G.marine, items: ['lobster_trap', 'fishing_net_pile', 'rope_coil', 'buoy', 'crate'] });
    P(S, 'fishing_net_pile', S.W / 2 - 3, 1, S.Zb + 5, 0);
  },
  window(S, a, c) { P(S, 'lobster_trap', a + 2, 3, 2.3, 0); P(S, 'buoy', (a + c) / 2, 3, 2.2, 0, { tint: '#c8302a' }); P(S, 'rope_coil', c - 2, 3, 2.2, 0); },
  yardProps(S, y0) { P(S, 'lobster_trap_stack', 8, 0, y0 + 2, 0); P(S, 'dory', S.W / 2, 0, y0 + 5, 1, { tint: '#e8e0d0' }); },
  readables(S) {
    read(S, S.X0 + 14, 6, S.Zb - 12, 'Tide table — Juniper Bay — September 1953', 'SAT 26: High 11:40 AM (9.8 ft) — 11:58 PM (9.4 ft)\n        Low 5:31 AM — 5:49 PM\nSUN 27: High 12:22 PM — Low 6:14 AM, 6:30 PM\n\nSunrise 5:34 — Sunset 5:32\nNew moon Oct. 8 — good tides for the fireworks tonight.');
    read(S, S.X0 + 14, 11, S.Zb - 1.5, 'Mounted striped bass', 'STRIPED BASS — 51 LBS\nTaken off Gannet Ledge, Sept. 30, 1949\nby Amos Fisk, Keeper of Whitcomb Point Light\n\n"On a hand line, in a dory, in the dark. He rowed it home."');
  },
};

// ---------------------------------------------------------------- Mrs. Pruitt's Rooms (boarding house)
TRADES.boarding = {
  label: 'Rooms', hours: ['6:00', '22:00'], front: 'Front Parlor', back: 'Kitchen', floors: 3, upper: ['lodging', 'lodging'],
  style: { floor: 'floor_oak', wall: 'wallpaper_rose', wains: 'wood_panel', signBg: 'sign_black', signFg: 'sign_cream', awningMode: 'none', bulk: 'wood_panel', platform: 'carpet_red', frame: 'wood_dark', outer: 'brick_brown', trim: 'trim_cream', oriel: true },
  sign: () => ["PRUITT'S ROOMS", 'ROOMS'], glass: () => ['ROOMS BY THE DAY OR WEEK', 'BOARD - BATHS - STEAM HEAT'],
  lore: () => 'Mrs. Edna Pruitt, widow of the organist\'s brother, has kept rooms here since 1926: sailors between ships, cannery men, a schoolteacher, a bellhop of thirty-one years\' standing.',
  pre(S) {
    S.lodgerNotes = [
      ['A letter on the desk', 'Ponta Delgada, 2 September 1953\n\nMy dear son — the fig tree gave so much this year that your sisters are sick of figs. Your father says to tell you the Juniper Bay boats are too big and you will forget how to fish. Come home for Christmas if the boss allows. Your mother, who prays for you.'],
      ['A union card', 'CANNERY WORKERS LOCAL 219 — MEMBER IN GOOD STANDING\nStanislaw Wrobel — Line 3, Harbor Canning Co. — Dues paid to Oct. 1953\n\nTucked behind it: a ticket stub for tonight\'s sock hop, which is odd, as Mr. Wrobel is 58.'],
      ['Discharge papers', 'HONORABLE DISCHARGE — UNITED STATES NAVY\nThis is to certify that Boatswain\'s Mate First Class Leo Sprague served aboard USS JUNIPER BAY (YMS-412), a wooden minesweeper built at Bayside Boat Works in 1943.\n\nHe has taped a photograph of her to the mirror.'],
      ['A schoolteacher\'s grade book', 'Grade 4, Maple Street School — Miss Dora Vance\n\nIn the margin of Monday\'s spelling list: "ask Mrs. P. if I may keep a cat. (She will say no.) (Ask anyway.)"'],
      ['A postcard from Korea', 'APO 7 — Aug. 1953\nDear Mr. Dunn — they signed it. We are coming home. Keep my room, I paid through October. Tell Mrs. P. I want pot roast. — Sal C.\n\n(Pfc. Castellano boarded here the winter before he enlisted, when things were hard at home.)'],
    ];
  },
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const cx = (X0 + X1) / 2;
    // front parlour with a registration desk by the door
    f.box(X0 + 2, 0, 6, X1 - X0 - 4, 1, 18, MAT.rug_oriental);
    P(S, 'writing_desk', X1 - 4, 1, 7, 3); P(S, 'chair_wood', X1 - 6.4, 1, 7, 1);
    const desk = sit(S, X1 - 6.4, 7, 1, 'write', ['work'], 0.45, { lines: ['Supper is at six. Sharp.', 'No gentlemen callers above the first floor. That means you, Mr. Sprague.'] });
    P(S, 'sofa', cx, 1, 22, 0, { tint: '#6a3a3a' }); P(S, 'armchair', X0 + 4, 1, 14, 1, { tint: '#5a6a4a' }); P(S, 'armchair', X0 + 4, 1, 19, 1, { tint: '#5a6a4a' });
    P(S, 'table_coffee', cx, 1, 17, 0); P(S, 'radio_console', cx, 1, 8, 2); P(S, 'piano_upright', X0 + 1.6, 1, 28, 1); P(S, 'clock_grandfather', X1 - 1.4, 1, 20, 3);
    P(S, 'fern_stand', X0 + 3, 1, 6, 0); P(S, 'lamp_floor', X1 - 3, 1, 24, 0);
    const lounge = [sit(S, cx - 2.6, 21.7, 0, 'read', ['lounge'], 0.42), sit(S, cx + 2.6, 21.7, 0, 'knit', ['lounge'], 0.42), sit(S, X0 + 4, 14, 1, 'read', ['lounge'], 0.42)];
    // dining room at the back of the parlour: one long table
    const dz = Math.min(Zb - 10, 38);
    const d1 = diningSet(b, S.sales, cx - 5, 1, dz, { seats: 6, table: 'table_dining', chair: 'chair_wood', cloth: '#e8e0d0', centerpiece: 'food_bread' });
    const d2 = diningSet(b, S.sales, cx + 5, 1, dz, { seats: 6, table: 'table_dining', chair: 'chair_wood', cloth: '#e8e0d0', centerpiece: 'vase_flowers' });
    P(S, 'sideboard', cx, 1, Zb - 1.5, 0); P(S, 'chandelier', cx, 12, dz, 0); P(S, 'chandelier', cx, 12, 16, 0);
    const dine = [...d1.seats, ...d2.seats];
    for (const h of S.lodgerHomes || []) { h.dine = dine; h.lounge = [...h.lounge, ...lounge]; }
    // kitchen at the back
    const kz = S.bd - 3.4;
    P(S, 'stove', 6, 1, kz, 0); P(S, 'stove', 9.5, 1, kz, 0); P(S, 'kitchen_counter', 13, 1, kz, 0); P(S, 'kitchen_sink', 16.3, 1, kz, 0); P(S, 'icebox', 19.6, 1, kz, 0);
    P(S, 'table_kitchen', 12, 1, Zb + 6, 0); P(S, 'chair_kitchen', 12, 1, Zb + 3.5, 2);
    const cook = stand(S, 7.7, kz - 2.6, 2, 'cook', ['work'], { room: S.back });
    const wash = stand(S, 16.3, kz - 2.6, 2, 'wash', ['work'], { room: S.back });
    job(S, 'landlady', [desk, cook, stand(S, cx, dz - 5, 2, 'serve', ['work'])], ['6:00', '20:00'], { sex: 'F', age: [55, 72], title: 'landlady', name: 'Mrs. Edna Pruitt' });
    job(S, 'hired girl', [wash, cook], ['6:00', '14:00'], { sex: 'F', title: 'hired girl' });
    browse(S, X1 - 8.5, 9, 3, { lines: ['I\'d like a room by the week, if you have one.'] });
    shopLamps(S, 'chandelier', 0);
    void rng;
  },
  window(S, a, c) {
    const f = S.f;
    f.box(a, 9, 1, c - a, 2, 1, MAT.canvas_white); f.box(a, 3, 1, 1, 6, 1, MAT.canvas_white); f.box(c - 1, 3, 1, 1, 6, 1, MAT.canvas_white);
    P(S, 'fern_stand', (a + c) / 2, 3, 2.3, 0);
    sign(S, (S.lodgerHomes || []).length > 7 ? 'NO VACANCY' : 'VACANCY', (a + c) / 2, 6.6, 1.1, 0, { bg: '#b3302a', fg: '#f0ecdc', scale: 0.6 });
  },
  readables(S) {
    read(S, S.X1 - 4, 6, 7, 'House Rules', 'MRS. PRUITT\'S ROOMS — HOUSE RULES\n\n1. Breakfast 6:30 to 8. Supper at 6 SHARP. Sunday dinner at 1.\n2. No cooking in rooms. No hot plates. I can smell a hot plate, Mr. Sprague.\n3. Callers in the front parlor only.\n4. Baths: one per week included. Additional baths 25 cents.\n5. Rent due Saturday, in advance.\n6. Doors locked at 11. Knock loudly; I am a light sleeper and will be displeased.\n\n— E. Pruitt');
    read(S, S.X1 - 4, 5, 9, 'The Register', 'Current guests (in Mrs. Pruitt\'s hand):\n2A Mr. S. Wrobel, cannery — since 1938\n2B Mr. M. Dunn, Ives\'s friend from the hotel\n2C Miss D. Vance, schoolteacher\n3A Mr. L. Sprague, Navy (ret.)\n3B Mr. J. Medeiros, Castellano boats\n3C — held for Pfc. S. Castellano through October. "He\'s home. He won\'t need it. Keep it anyway." ');
  },
};

// ---------------------------------------------------------------- Whitcomb Ship Chandlery (1858)
TRADES.chandlery = {
  label: 'Ship Chandlery', hours: ['7:00', '17:00'], front: 'Chandlery', back: 'Sail Loft', floors: 3, upper: ['store', 'apt'],
  style: { outer: 'brick_brown', pier: 'granite', floor: 'floor_pine_z', wall: 'wood_panel_light', wains: 'wood_dark', signBg: 'sign_navy', signFg: 'sign_gold', frame: 'trim_dark', trim: 'granite', awningMode: 'none' },
  sign: () => ['SHIP CHANDLERY', 'CHANDLERY'], glass: () => ['WHITCOMB SHIP CHANDLERY', 'EST. 1858', 'CORDAGE - HARDWARE - PROVISIONS'],
  panel: () => 'WHITCOMB 1858',
  lore: () => 'Founded by Captain Elias Whitcomb\'s brother Nathaniel in 1858, five years after the charter. Every vessel out of Juniper Bay for ninety-five years has been fitted out from these shelves.',
  ghost: [['WHITCOMB SHIP CHANDLERY', 'CORDAGE - CANVAS - PAINTS']],
  fit(S) {
    const { f, Zb, X0, X1, rng } = S;
    const zL = Math.min(S.hallEnd - 1, Zb - 2);
    shelfWall(S, 'L', 5, zL, { goods: G.marine, levels: [5, 8, 11], top: 13 });
    shelfWall(S, 'R', 5, Zb - 14, { goods: G.marine, levels: [5, 8, 11], top: 13 });
    for (let z = 8; z < zL; z += 6) P(S, 'lantern', X0 + 1, 12, z, 1);
    // long counter across the back, brass scale, the ship's bell
    const cz = Zb - 11;
    vCounter(S, X0 + 3, cz, X1 - X0 - 14, 2, { base: MAT.wood_dark, top: MAT.wood_light });
    P(S, 'cash_register', X0 + 6, 5, cz + 1, 0); P(S, 'bell_brass', X0 + 12, 5, cz + 1, 0); P(S, 'scale_grocery', X0 + 18, 5, cz + 1, 0);
    shelfWall(S, 'B', X0 + 1, S.W - 12, { goods: G.marine, levels: [6, 9, 12], top: 13 });
    P(S, 'ships_wheel_wall', X0 + 10, 7, Zb - 0.4, 0);
    const c1 = stand(S, X0 + 9, cz + 4, 0, 'counter', ['work'], { lines: ['Forty fathoms of manila? We\'ve got it.', 'Captain Whitcomb bought his lanterns across this counter.'] });
    const c2 = stand(S, X0 + 4, 20, 3, 'shelve', ['work']);
    customer(S, X0 + 9, cz - 2.2, 2);
    // floor goods: anchors, chain, coils of rope, oars, barrels of salt pork
    const cx = (X0 + X1) / 2;
    P(S, 'anchor', cx - 6, 1, 12, 0); P(S, 'anchor', cx - 3, 1, 12, 1);
    for (let i = 0; i < 6; i++) P(S, 'rope_coil', cx + 2 + (i % 3) * 2.6, 1 + Math.floor(i / 3) * 0.2, 12 + Math.floor(i / 3) * 2.6, i);
    for (let i = 0; i < 8; i++) f.box(Math.round(cx - 7 + i), 1, 20 + (i % 2), 1, 1, 1, MAT.iron);
    for (let i = 0; i < 5; i++) f.box(X1 - 3, 1, Zb - 13 + i, 1, 12, 1, MAT.wood_light);
    P(S, 'barrel', cx + 5, 1, 22, 0); P(S, 'barrel', cx + 7.4, 1, 22, 0); P(S, 'trunk', cx - 2, 1, 26, 0); P(S, 'display_case', cx + 2, 1, 28, 0);
    P(S, 'fabric_bolts', cx - 6, 1, 28, 0, { tint: '#e8e0c8' }); P(S, 'coat_rack', X1 - 4, 1, 8, 0, { tint: '#e0b030' });
    shopLamps(S);
    job(S, 'chandler', [c1], ['7:00', '17:00'], { outfit: 'shopkeeper', title: 'ship chandler' });
    job(S, 'clerk', [c2, c1], ['7:00', '16:00'], { title: 'chandlery clerk' });
    browse(S, cx, 16, 2); browse(S, X0 + 4, 12, 3); browse(S, S.X1 - 4, 16, 1);
    stockroom(S, { goods: G.marine, items: ['fabric_bolts', 'rope_coil', 'barrel', 'crate_stack', 'anchor'] });
    void rng;
  },
  window(S, a, c) { P(S, 'lantern', a + 2, 3, 2.3, 0); P(S, 'bell_brass', (a + c) / 2, 3, 2.3, 0); P(S, 'rope_coil', c - 2, 3, 2.2, 0); P(S, 'globe_desk', (a + c) / 2 + 3, 3, 2.3, 0); },
  yardProps(S, y0) { P(S, 'dory', S.W / 2, 0, y0 + 4, 1, { tint: '#3a5a4a' }); },
  readables(S) {
    read(S, S.X0 + 12, 6, S.Zb - 12, 'Day book, October 1867', 'Oct. 3, 1867 — Sch. MARY ELLEN, Capt. J. Dunmore, for the Banks:\n  40 fms manila 2 in. — 2 lanterns — 1 bbl salt pork — 1 bbl flour\n  6 lbs coffee — 1 compass (repaired) — oakum, pitch — 11 oilskins\nAccount: settle on return.\n\nThe account was never settled. In the margin, in another hand, much later: "Forgiven. N.W."');
    read(S, S.X0 + 10, 9, S.Zb - 0.6, 'Portrait', 'Captain Elias Whitcomb (1809–1889), founder of Juniper Bay.\nPainted in 1860 by a traveling artist for the price of a new mainsail.\n\nHe is not smiling. "He never did," says Miss Augusta Whitcomb, "except at the sea."');
  },
};

// ---------------------------------------------------------------- Pike & Daughter Books
TRADES.bookshop = {
  label: 'Books', hours: ['9:00', '18:00'], front: 'Bookshop', back: 'Back Room',
  style: { floor: 'floor_walnut', wall: 'wood_panel', wains: 'wood_dark', signBg: 'sign_green', signFg: 'sign_gold', frame: 'trim_green', ceil: 'ceiling' },
  sign: () => ['PIKE & DAUGHTER', 'BOOKS'], glass: () => ['PIKE & DAUGHTER', 'BOOKS NEW & USED', 'MAPS - PRINTS - LENDING LIBRARY'],
  lore: () => 'Ezra Pike opened in 1919; his daughter Josephine has run the shop since his eyes gave out. The cat is named Mr. Hawthorne. He does not care for Hawthorne.',
  fit(S) {
    const { f, b, Zb, X0, X1 } = S;
    const zL = Math.min(S.hallEnd - 1, Zb - 2);
    const bk = { goods: G.books, levels: [3, 5, 7, 9, 11, 13], top: 14, gap: 0.06, tall: 0, seg: 2, cabinet: 0 };
    shelfWall(S, 'L', 5, zL, { ...bk, ladder: true });
    shelfWall(S, 'R', 5, Zb - 2, { ...bk, ladder: true });
    if (S.alcoveZ) shelfWall(S, 'A', S.alcoveZ[0], S.alcoveZ[1] - 1, bk);
    shelfWall(S, 'B', X0 + 3, S.W - 12, bk);
    // tables of new books, a rare-book case, the reading nook
    const cx = (X0 + X1) / 2;
    for (let z = 12; z < Zb - 14; z += 8) P(S, 'book_rack', cx, 1, z, 0);
    vCase(S, cx - 3, Zb - 11, 7, 2, ['bookshelf_books', 'trim_red', 'sign_brown', 'trim_gold']);
    P(S, 'armchair', X0 + 5, 1, Zb - 6, 1, { tint: '#6a3a2e' }); P(S, 'armchair', X0 + 5, 1, Zb - 12, 1, { tint: '#3a4a3a' }); P(S, 'lamp_floor', X0 + 4, 1, Zb - 9, 0);
    P(S, 'cat', X0 + 5, 2.1, Zb - 12, 1);
    sit(S, X0 + 5, Zb - 6, 1, 'read_book', ['browse', 'shop'], 0.42);
    P(S, 'globe_desk', cx + 6, 1, 8, 0);
    // the counter by the door
    vCounter(S, X1 - 11, 6, 6, 3, { base: MAT.wood_dark, top: MAT.wood_mid });
    P(S, 'cash_register', X1 - 9, 5, 7.5, 0); P(S, 'books_stack', X1 - 6.5, 5, 7.5, 0);
    const jo = stand(S, X1 - 8, 11, 0, 'read_stand', ['work'], { lines: ['Have you read the new Steinbeck? East of Eden. Take it, pay me Monday.', 'Mr. Hawthorne, get off the poetry.'] });
    const ez = stand(S, cx, Zb - 13, 0, 'shelve', ['work']);
    shopLamps(S, 'ceiling_lamp', 4);
    job(S, 'bookseller', [jo, ez], ['9:00', '18:00'], { sex: 'F', title: 'bookseller', name: 'Josephine Pike' });
    job(S, 'bookseller', [ez], ['12:00', '18:00'], { title: 'clerk' });
    for (const [x, z, r] of [[X0 + 4, 10, 3], [X0 + 4, 20, 3], [S.X1 - 4, 14, 1], [S.X1 - 4, 26, 1], [cx - 3, 16, 1], [cx + 3, 22, 3]]) browse(S, x, z, r, { act: 'read_stand' });
    stockroom(S, { goods: G.books, items: ['books_stack', 'crate', 'crate_stack'] });
    void b; void f;
  },
  window(S, a, c) { for (let x = a + 1.5; x < c - 1; x += 1.6) P(S, 'books_stack', x, 3, 2.3, 0); P(S, 'globe_desk', (a + c) / 2, 3, 2.6, 0); },
  readables(S) {
    const cx = (S.X0 + S.X1) / 2;
    read(S, cx, 5, 12, 'Staff recommendations', 'J.P. RECOMMENDS\n\n"The Old Man and the Sea" — Hemingway. A fisherman, a fish, and not a word wasted. Every man on the town wharf should read it; several have.\n\n"Charlotte\'s Web" — E.B. White. For the children. Also for you.\n\n"The Adventures of Augie March" — Bellow. Long. Worth it.\n\n"Juniper Bay: A Centennial History" — Miss A. Whitcomb. Signed copies, $2.50. She will know if you have not read it.');
    read(S, cx, 6, S.Zb - 11, 'Rare Books', 'IN THE CASE:\n— Bowditch, "The New American Practical Navigator," 1837, with Capt. E. Whitcomb\'s signature on the flyleaf\n— A ship\'s log of the whaler ORION, New Bedford to the Pacific, 1849–52\n— "The Great Fire at Juniper Bay," a pamphlet, 1902, 10 cents\n\nNot for sale. Ask anyway; Josephine likes to be asked.');
  },
};

// ---------------------------------------------------------------- Bay Radio & Television
TRADES.radio = {
  label: 'Radio & Television', hours: ['9:00', '21:00'], front: 'Showroom', back: 'Repair Shop',
  style: { floor: 'floor_linoleum_green', wall: 'plaster_white', wains: 'wood_panel_light', ceil: 'ceiling', signBg: 'sign_blue', signFg: 'sign_white', frame: 'trim_blue', awningMode: 'none', bulk: 'enamel_black' },
  sign: () => ['BAY RADIO & TV', 'RADIO - TV'], glass: () => ['BAY RADIO & TELEVISION', 'SALES & SERVICE', 'RCA - ADMIRAL - PHILCO - ZENITH'],
  panel: () => 'RADIO - TELEVISION',
  lore: () => 'Seven sets were sold in Juniper Bay in 1951. This year, sixty. On fight nights there are men three-deep on the sidewalk watching the window.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    // radios on the left wall, consoles in rows
    shelfWall(S, 'L', 5, Math.min(S.hallEnd - 1, Zb - 2), { goods: G.radio, levels: [5, 8, 11], top: 12 });
    for (let z = 7; z < Math.min(S.hallEnd - 1, Zb - 2); z += 4) P(S, 'radio_table', X0 + 1, 5.2, z, 1);
    P(S, 'radio_display', X0 + 2, 1, S.hallEnd + 4 < Zb - 4 ? S.hallEnd + 4 : 30, 1);
    const cx = (X0 + X1) / 2;
    for (let z = 10; z < Zb - 16; z += 6) { P(S, 'tv_console', cx - 4, 1, z, 3); P(S, 'tv_console', cx + 4, 1, z, 1); }
    for (let z = 8; z < Zb - 16; z += 7) P(S, 'radio_console', S.X1 - 2, 1, z, 3);
    P(S, 'phonograph', S.X1 - 2.5, 1, Zb - 14, 3);
    // repair bench along the back partition, visible from the floor
    const rz = Zb - 4;
    vCounter(S, X0 + 2, rz, 20, 3, { base: MAT.wood_dark, top: MAT.wood_light });
    for (let x = X0 + 3; x < X0 + 20; x += 5) { f.box(x, 5, rz + 1, 3, 2, 2, Mt(rng.pick(['steel', 'wood_mid', 'enamel_black']))); f.box(x + 1, 7, rz + 2, 1, 1, 1, MAT.lamp_glass); }
    P(S, 'lamp_desk', X0 + 8, 5, rz + 1, 0); P(S, 'lamp_desk', X0 + 16, 5, rz + 1, 0);
    P(S, 'stool_tall', X0 + 8, 1, rz - 1.6, 2);
    const fix = sit(S, X0 + 8, rz - 1.6, 2, 'microscope', ['work'], 0.7, { lines: ['Your picture tube\'s fine. It was the vertical hold.', 'Six-L-six tube. Got one somewhere.'] });
    const sales = stand(S, cx, 14, 0, 'talk', ['work'], { lines: ['Twenty-one inches. Picks up Boston and Providence on a clear night.', 'World Series starts Wednesday. You want to see it, don\'t you?'] });
    vCounter(S, S.X1 - 9, Zb - 10, 6, 2, { base: MAT.wood_dark, top: MAT.wood_light }); P(S, 'cash_register', S.X1 - 7, 5, Zb - 9, 0);
    shopLamps(S);
    job(S, 'salesman', [sales], ['9:00', '21:00'], { outfit: 'shopkeeper', title: 'television salesman' });
    job(S, 'repairman', [fix], ['9:00', '18:00'], { title: 'radio repairman' });
    for (const [x, z, r] of [[cx - 7, 12, 1], [cx + 7, 18, 3], [X0 + 4, 14, 3]]) browse(S, x, z, r, { act: 'watch' });
    // the crowd on the sidewalk watching the window sets
    const out = b.entrances[0] ? b.entrances[0].node : null;
    for (const [x, rot] of [[S.windows[0] ? (S.windows[0][0] + S.windows[0][1]) / 2 - 2 : 12, 2], [S.windows[0] ? (S.windows[0][0] + S.windows[0][1]) / 2 + 2 : 16, 2]]) {
      const s = b.spot('stand', x, 0, -2.2, rot, { room: 0, act: 'watch', tags: ['browse'], label: 'Watching the televisions in the window' });
      if (out !== null) S.ctx.nav.link(s.node, out);
    }
    stockroom(S, { goods: G.radio, items: ['tv_console', 'radio_console', 'crate', 'crate_stack'] });
    // antennas on the roof
    P(S, 'tv_antenna', S.W * 0.3, S.H + 1, 20, 0); P(S, 'tv_antenna', S.W * 0.7, S.H + 1, 30, 1);
  },
  window(S, a, c) {
    for (let x = a + 1; x + 4 <= c; x += 5) vTV(S, x, 3, 1, { w: 4, h: 4 });
    sign(S, 'WORLD SERIES HERE', (a + c) / 2, 9.2, 0.6, 0, { bg: '#1f2f5f', fg: '#f0ecdc', scale: 0.6 });
    S.b.light((a + c) / 2, 6, 0, { color: [0.6, 0.7, 1.0], radius: 4, mode: 'night', flicker: 1 });
  },
  readables(S) { read(S, (S.X0 + S.X1) / 2, 6, 12, 'Sign on a console', 'NEW! 21-INCH TABLE MODEL — $199.95\nCONSOLE WITH DOORS — $289.50\nRoof antenna installed ..... $35\n\nCh. 4 & 7 Boston — Ch. 12 Providence\n"The Hallorans on Church Street have one. Don\'t you want one?"'); },
};

// ---------------------------------------------------------------- Lowell Photography Studio
TRADES.photo = {
  label: 'Photographs', hours: ['9:00', '17:00'], front: 'Studio', back: 'Darkroom',
  style: { floor: 'floor_oak', wall: 'plaster_gray', wains: 'wood_dark', signBg: 'sign_black', signFg: 'sign_white', frame: 'trim_black', ceil: 'ceiling' },
  sign: () => ['LOWELL STUDIO', 'PHOTOGRAPHS'], glass: () => ['LOWELL PHOTOGRAPHY', 'PORTRAITS - WEDDINGS - COMMERCIAL'],
  lore: () => 'Frederick Lowell, the editor\'s brother, has photographed every wedding, graduating class and drowned pier in Juniper Bay since 1924.',
  fit(S) {
    const { f, b, Zb, X0, X1 } = S;
    const cx = (X0 + X1) / 2;
    // reception at the front: desk, settee, walls of portraits
    const desk = officeDesk(b, S.sales, X1 - 7, 1, 10, 0, { typewriter: false, act: 'write' });
    P(S, 'loveseat', X0 + 4, 1, 12, 1, { tint: '#5a3a4a' }); sit(S, X0 + 4, 12, 1, 'sit', ['shop'], 0.42);
    for (let z = 8; z < 24; z += 4) { P(S, 'portrait', X0 + 0.1, 7, z, 1); P(S, 'painting', S.X1 - 0.1, 7, z + 2, 3, { tint: '#c8c0b0' }); }
    // a curtain half-dividing the studio
    const sz = 26;
    wallX(f, X0, X0 + 8, 1, sz, 14, MAT.velvet_red); wallX(f, X1 - 8, X1, 1, sz, 14, MAT.velvet_red);
    // studio: painted backdrop with a floor sweep, posing chair, the big view camera, lights
    const bz = Zb - 3;
    f.box(cx - 10, 1, bz, 20, 13, 1, MAT.stucco_sage); f.box(cx - 10, 1, bz - 1, 20, 1, 1, MAT.stucco_sage);
    f.box(cx - 12, 14, bz - 1, 24, 1, 1, MAT.iron);
    P(S, 'armchair', cx, 1, bz - 4, 0, { tint: '#6a2a2a' });
    const sitter = sit(S, cx, bz - 4, 0, 'sit', ['shop'], 0.42, { lines: ['Do I smile? I never know whether to smile.'] });
    // camera on a tripod
    const kz = sz + 6;
    f.box(cx - 1, 1, kz, 1, 5, 1, MAT.wood_dark); f.box(cx + 1, 1, kz, 1, 5, 1, MAT.wood_dark); f.box(cx, 1, kz + 1, 1, 5, 1, MAT.wood_dark);
    f.box(cx - 1, 6, kz, 3, 2, 3, MAT.wood_mid); f.box(cx, 6, kz + 3, 1, 2, 2, MAT.trim_black); f.box(cx, 7, kz + 5, 1, 1, 1, MAT.trim_gold);
    const photog = stand(S, cx, kz - 1.6, 2, 'photograph', ['work'], { lines: ['Chin up. Up. There.', 'Hold it... hold it...'] });
    P(S, 'stage_lights', cx - 8, 1, bz - 7, 2); P(S, 'stage_lights', cx + 8, 1, bz - 7, 2);
    f.box(cx - 9, 8, bz - 9, 3, 3, 1, MAT.canvas_white); f.box(cx + 7, 8, bz - 9, 3, 3, 1, MAT.canvas_white);
    b.light(cx, 9, bz - 6, { color: [1, 0.95, 0.85], radius: 7, mode: 'room', room: S.sales });
    shopLamps(S, 'ceiling_lamp', 2);
    job(S, 'photographer', [photog, desk], ['9:00', '17:00'], { title: 'photographer', name: 'Frederick Lowell' });
    job(S, 'receptionist', [desk], ['9:00', '17:00'], { sex: 'F', title: 'receptionist' });
    browse(S, X0 + 3, 18, 3, { act: 'look' }); browse(S, S.X1 - 3, 20, 1, { act: 'look' }); void sitter;
    // darkroom: red safelight, trays, enlarger, prints drying on a line
    const z0 = Zb + 1;
    vCounter(S, 3, z0 + 2, 2, S.bd - 5 - z0, { base: MAT.wood_dark, top: MAT.enamel_black });
    for (let z = z0 + 3; z < S.bd - 5; z += 3) f.box(3, 5, z, 2, 1, 2, MAT.enamel_white);
    f.box(S.W / 2 - 1, 1, S.bd - 5, 3, 3, 2, MAT.wood_dark); f.box(S.W / 2, 4, S.bd - 4, 1, 6, 1, MAT.steel); f.box(S.W / 2 - 1, 8, S.bd - 5, 3, 2, 3, MAT.enamel_black);
    f.box(6, 11, z0 + 2, 1, 1, S.bd - 8 - z0, MAT.iron);
    for (let z = z0 + 3; z < S.bd - 6; z += 2) f.box(6, 9, z, 1, 2, 1, MAT.canvas_white);
    b.light(S.W / 2, 12, (z0 + S.bd) / 2, { color: [1, 0.12, 0.08], radius: 6, mode: 'room', room: S.back });
    job(S, 'darkroom man', [stand(S, 5.8, z0 + 6, 3, 'wash', ['work'], { room: S.back })], ['10:00', '16:00'], { title: 'darkroom assistant' });
  },
  window(S, a, c) { for (let x = a + 1.5; x < c - 1; x += 2.5) P(S, 'photo_frames_standing', x, 3, 2.3, 0); P(S, 'portrait', (a + c) / 2, 6, 3.6, 0); },
  readables(S) {
    read(S, S.X0 + 0.5, 7, 12, 'Framed photograph', 'HARBOR STREET, SEPTEMBER 22, 1938 — 7 A.M.\n\nThe morning after. A rowboat tied to a lamppost in front of the Harbor Light lunch counter. A man in shirtsleeves wading to his knees, carrying a birdcage. Pier 3 is simply not there.\n\n(F. Lowell sold this print to LIFE magazine for $25 and gave the money to the relief committee.)');
    read(S, S.X0 + 0.5, 7, 20, 'Framed photograph', 'MISS AUGUSTA WHITCOMB, CENTENNIAL PORTRAIT — September 12, 1953\n\nShe sat for forty minutes in her great-grandfather\'s chair and would not smile. On the last plate, just as the shutter closed, she did.');
    read(S, S.X1 - 7, 6, 9, 'Price list', 'PORTRAITS — three poses, one 8x10 ..... $12.50\nWEDDINGS — church & reception, album ..... $45\nPASSPORT — while you wait ..... $2\nBABY\'S FIRST — at your home ..... $8\n\nClosed 1:30–4 Saturday: at St. Brigid\'s (Novak–Brennan).');
  },
};

// ---------------------------------------------------------------- Halloran & Sons Bakery (1887)
TRADES.bakery = {
  label: 'Bakery', hours: ['6:00', '18:00'], front: 'Bake Shop', back: 'Bakehouse', backD: 30, family: null,
  style: { floor: 'floor_tile_white', wall: 'tile_kitchen', wains: 'enamel_white', signBg: 'sign_green', signFg: 'sign_gold', frame: 'trim_green', awning: ['awning_green', 'canvas_white'], door: 'right', ceil: 'ceiling_tin' },
  sign: () => ['HALLORAN & SONS', 'HALLORAN'], glass: () => ['HALLORAN & SONS', 'BAKERS SINCE 1887', 'BREAD - CAKES - PASTRY'],
  panel: (S) => 'HALLORAN ' + S.built,
  lore: () => 'Patrick Halloran opened in 1887 with one oven and his wife Nora\'s soda bread. In 1932 the bread was a penny a loaf, and the rest went quietly out the back door. Today: four hundred Centennial loaves.',
  ghost: [["HALLORAN'S BREAD", '5 CENTS A LOAF'], ['HALLORAN & SONS', 'BAKERS SINCE 1887']],
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const loaves = ['wood_light', 'terracotta', 'sandstone', 'wood_pale', 'sign_brown'];
    // glass pastry cases in an L, bread racks behind
    const cz = 16;
    vCase(S, X0 + 2, cz, X1 - X0 - 10, 3, ['sign_yellow', 'terracotta', 'wood_light', 'sign_cream', 'sign_brown', 'tile_pink', 'enamel_white']);
    vCase(S, X1 - 8, cz, 3, 14, loaves);
    for (let x = X0 + 4; x < X1 - 10; x += 5) P(S, 'cake_stand', x, 5, cz + 1.5, 0);
    P(S, 'birthday_cake', X0 + 6, 5, cz + 1.5, 0, { tint: '#f0b0c0' });
    P(S, 'cash_register', X1 - 6.5, 5, cz + 10, 3);
    const rz = cz + 7;
    for (let x = X0 + 2; x < X1 - 10; x += 4) P(S, 'shelf_bread', x + 2, 1, rz + 1.2, 0);
    // slanted voxel bread shelves on the left wall
    const zL = Math.min(S.hallEnd - 1, Zb - 2);
    shelfWall(S, 'L', rz + 3, zL, { goods: loaves, levels: [4, 6, 8, 10], top: 11, gap: 0.05, tall: 0, board: MAT.wood_light });
    const clerk = stand(S, (X0 + X1) / 2 - 2, cz + 4.5, 0, 'counter', ['work'], { lines: ['A Centennial loaf? Last few, love — stamped with the town seal.', 'Soda bread\'s Nora Halloran\'s recipe, 1887. Don\'t let anyone tell you different.'] });
    customer(S, (X0 + X1) / 2 - 4, cz - 2.2, 2); customer(S, (X0 + X1) / 2 + 3, cz - 2.2, 2);
    browse(S, X0 + 4, 10, 2); browse(S, X1 - 11, 12, 2);
    P(S, 'bench_park', X0 + 4, 1, 6, 2);
    shopLamps(S, 'ceiling_lamp', 2);
    // ---- the bakehouse: two brick ovens along the back wall, trough, table, flour
    const z0 = Zb + 1, bz = S.bd - 2;
    for (const ox of [3, 16]) {
      f.box(ox, 1, bz - 6, 11, 8, 6, MAT.brick_red); f.box(ox - 1, 9, bz - 7, 13, 1, 7, MAT.stone_foundation);
      f.box(ox + 3, 3, bz - 7, 5, 3, 1, MAT.iron); f.box(ox + 4, 3, bz - 7, 3, 1, 1, MAT.fire);
      f.box(ox + 5, 10, bz - 3, 2, 5, 2, MAT.brick_red);
      b.light(ox + 5.5, 4, bz - 8, { color: [1, 0.55, 0.25], radius: 5, mode: 'always' });
    }
    const tz = z0 + 6;
    vCounter(S, 6, tz, 16, 4, { base: MAT.wood_mid, top: MAT.wood_pale });
    for (let x = 7; x < 21; x += 3) f.box(x, 5, tz + 1, 2, 1, 2, MAT.plaster_cream);
    f.box(24, 1, tz, 3, 4, 8, MAT.wood_dark); f.box(24, 4, tz + 1, 3, 1, 6, MAT.plaster_cream);
    P(S, 'sack_pile', S.W - 13, 1, z0 + 3, 0); P(S, 'sack_pile', S.W - 13, 1.6, z0 + 3.6, 1); P(S, 'sack_pile', S.W - 16, 1, z0 + 2.5, 2);
    for (let x = 4; x < 22; x += 4) P(S, 'shelf_bread', x, 1, z0 + 1.2, 2);
    const baker1 = stand(S, 10, tz - 1.8, 2, 'counter', ['work'], { room: S.back, lines: ['Four hundred loaves by nine. We did it by eight-thirty.'] });
    const baker2 = stand(S, 18, tz + 5.8, 0, 'counter', ['work'], { room: S.back });
    const oven = stand(S, 8.5, bz - 9, 2, 'cook', ['work'], { room: S.back });
    const oven2 = stand(S, 21.5, bz - 9, 2, 'cook', ['work'], { room: S.back });
    job(S, 'baker', [baker1, oven, baker1], ['4:30', '13:00'], { outfit: 'cook', title: 'master baker' });
    job(S, 'baker', [baker2, oven2], ['4:30', '13:00'], { outfit: 'cook', title: 'baker' });
    job(S, 'clerk', [clerk], ['6:30', '18:00'], { sex: 'F', title: 'counter girl' });
    P(S, 'ceiling_lamp', S.W / 2, 13, z0 + 8, 0); P(S, 'ceiling_lamp', S.W / 2, 13, bz - 10, 0);
    void rng;
  },
  window(S, a, c) {
    const f = S.f;
    if (c - a >= 12 && !S.bigLoaf) {
      // THE CENTENNIAL LOAF
      S.bigLoaf = true;
      const x0 = Math.round((a + c) / 2) - 5;
      f.box(x0, 3, 1, 10, 2, 3, MAT.sandstone); f.box(x0 + 1, 5, 1, 8, 1, 3, MAT.terracotta); f.box(x0 + 2, 6, 2, 6, 1, 1, MAT.terracotta);
      f.box(x0 + 3, 5, 1, 1, 1, 1, MAT.wood_pale); f.box(x0 + 6, 5, 1, 1, 1, 1, MAT.wood_pale);
      glass(S, '1853 - 1953', x0 + 5, 7.3, 0.85, 0, { px: 1 / 22, color: '#e8c060' });
      sign(S, 'THE CENTENNIAL LOAF', x0 + 5, 9.3, 1.1, 0, { bg: '#1f4a33', fg: '#e8c870', scale: 0.55 });
    } else { P(S, 'bread_display_window', (a + c) / 2, 3, 2.3, 0); }
    P(S, 'cake_stand', a + 1.2, 3, 2.4, 0);
  },
  yardProps(S, y0) { P(S, 'truck_bread', S.W / 2 - 2, 0, y0 + 2, 1, { tint: '#2a5a3a', cat: 'far' }); P(S, 'sack_pile', 4, 0, y0 + 1, 0); },
  readables(S) {
    const cx = (S.X0 + S.X1) / 2;
    read(S, cx, 6, 16, 'The Centennial Loaf', 'THE CENTENNIAL LOAF — 1853 · 1953\n\nBaked this morning from Nora Halloran\'s 1887 soda-bread recipe, doubled, and doubled again. Twelve pounds. Stamped with the town seal.\n\nIt will be cut by Mayor Pemberton at the fair at 4 o\'clock. Four hundred smaller ones were baked at five a.m. and are, as of noon, gone.');
    read(S, S.X0 + 1, 8, 26, 'Photograph, 1887', 'Patrick and Nora Halloran in front of their first shop on Market Street — one window, one oven, and a sign that says only BREAD.\n\nNora is holding a baby, the first of the "Sons." Patrick is holding a loaf the same way.');
    read(S, 4, 6, S.Zb + 2, 'Notice, 1932 (framed)', 'DAY-OLD BREAD — ONE CENT\n\nNO ONE LEAVES HUNGRY.\nIf you cannot pay, come to the back door after six.\n— P. Halloran\n\n(They came. For three winters. Pat III says his father never once asked a name.)');
    read(S, S.W - 8, 7, S.Zb + 2, 'Order board — Saturday, Sept. 26', 'CENTENNIAL LOAVES ..... 400 (DONE 8:30)\nMoreau — birthday cake, pink roses, "HAPPY 7TH SUSIE" — pick up 1 PM\nSt. Brigid\'s — reception, 12 doz. rolls, 3 sheet cakes\nCastellano — 4 Italian, 2 doz. cannoli shells (Rosa fills her own)\nElks 812 — 6 doz. hard rolls\nThe Big Loaf — to the fair by 3:45. DON\'T DROP IT.');
  },
};

// ---------------------------------------------------------------- Russo's Meats
TRADES.butcher = {
  label: 'Meats', hours: ['7:00', '18:00'], front: 'Meat Market', back: 'Cutting Room',
  style: { floor: 'floor_tile_white', wall: 'tile_kitchen', wains: null, signBg: 'sign_red', signFg: 'sign_white', frame: 'trim_red', awning: ['awning_red', 'canvas_white'] },
  sign: () => ["RUSSO'S MEATS", "RUSSO'S"], glass: () => ["RUSSO'S MEATS", 'PRIME - POULTRY - SAUSAGE'],
  lore: () => 'Vincenzo Russo\'s sausage has won the Harbor Days blue ribbon six years running. He weighs with his thumb off the scale, which everyone agrees is rare.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const cx = (X0 + X1) / 2;
    for (let z = 8; z < 30; z += 7) f.box(Math.round(cx - 6 + rng.int(-3, 3)), 0, z, 3, 1, 3, MAT.sand);  // sawdust on the tile
    P(S, 'meat_counter', cx - 6, 1, 18, 0); P(S, 'meat_counter', cx, 1, 18, 0); P(S, 'meat_counter', cx + 6, 1, 18, 0);
    // butcher blocks and the rail of hanging meat
    f.box(Math.round(cx - 7), 1, 26, 4, 4, 3, MAT.wood_light); f.box(Math.round(cx + 3), 1, 26, 4, 4, 3, MAT.wood_light);
    f.box(X0 + 2, 11, 30, X1 - X0 - 4, 1, 1, MAT.iron);
    for (let x = X0 + 3; x < X1 - 3; x += 3) { f.box(x, 10, 30, 1, 1, 1, MAT.iron); if (rng.chance(0.75)) f.box(x, 7, 30, 1, 3, 1, Mt(rng.pick(['terracotta_red', 'carpet_rose', 'brick_paint_red']))); }
    // walk-in cooler door on the back partition, a scale, chalkboard
    f.box(X0 + 3, 1, Zb - 1, 5, 10, 1, MAT.steel_white); f.box(X0 + 7, 5, Zb - 2, 1, 2, 1, MAT.iron);
    f.box(X1 - 12, 7, Zb - 1, 8, 5, 1, MAT.chalkboard);
    P(S, 'scale_grocery', cx - 3, 5.2, 18.5, 0); P(S, 'cash_register', cx + 8, 5.2, 18.5, 0);
    const b1 = stand(S, cx - 4, 22, 0, 'counter', ['work'], { lines: ['Two legs of lamb for the Castellanos — paid. Rosa\'s been in three times to check.', 'Sausage just came out of the grinder. Blue ribbon six years.'] });
    const b2 = stand(S, cx + 4, 27.5, 0, 'saw', ['work']);
    customer(S, cx - 4, 14.5, 2); customer(S, cx + 3, 14.5, 2); browse(S, X0 + 4, 10, 3);
    shopLamps(S, 'ceiling_lamp', 2);
    job(S, 'butcher', [b1, b2], ['7:00', '18:00'], { outfit: 'cook', title: 'butcher' });
    job(S, 'butcher', [b2, b1], ['7:00', '18:00'], { outfit: 'cook', title: 'butcher\'s helper' });
    stockroom(S, { items: ['crate', 'barrel', 'crate_stack'] });
  },
  window(S, a, c) { for (let x = a + 1; x < c - 1; x += 2) S.f.box(x, 3, 2, 1, 1, 1, S.rng.chance(0.5) ? MAT.terracotta_red : MAT.carpet_rose); P(S, 'scale_grocery', (a + c) / 2, 3, 2.4, 0); },
  readables(S) { read(S, S.X1 - 8, 9, S.Zb - 1.2, 'Chalkboard', 'TODAY\nPork Chops ..... 69 lb\nChuck Roast ..... 49\nHamburg ..... 45\nFowl ..... 39\nVeal Cutlet ..... 98\nSpring Lamb (leg) ..... 79\nRUSSO\'S SAUSAGE — hot or sweet ..... 59\n\nBlue Ribbon — Harbor Days 1947 48 49 50 51 52'); },
};

// ---------------------------------------------------------------- Lee's Hand Laundry (1911)
TRADES.laundry = {
  label: 'Hand Laundry', hours: ['7:00', '19:00'], front: 'Laundry Counter', back: 'Washroom', family: 'Lee',
  style: { floor: 'floor_linoleum', wall: 'plaster_mint', wains: 'wood_dark', signBg: 'sign_red', signFg: 'sign_gold', frame: 'trim_red', awningMode: 'rolled' },
  sign: () => ['LAUNDRY'], glass: () => ["LEE'S HAND LAUNDRY", 'SHIRTS - COLLARS - LINENS', 'EST. 1911'],
  lore: () => 'Lee Wing opened the laundry in 1911, the year the library opened. His son Henry, 62, still starches collars the way Captain Whitcomb\'s son liked them: heavy.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    // counter across the shop with a flap at the right
    const cz = 12;
    vCounter(S, X0, cz, X1 - X0 - 5, 3, { base: MAT.wood_dark, top: MAT.wood_light });
    P(S, 'cash_register', X0 + 4, 5, cz + 1.5, 0); P(S, 'laundry_bundles', X0 + 10, 5, cz + 1.5, 0); P(S, 'bell_brass', X0 + 14, 5, cz + 1.5, 0);
    const henry = stand(S, X0 + 8, cz + 5, 0, 'counter', ['work'], { lines: ['Ticket? Ah — Mrs. Hatch. Six shirts, starch heavy. Tuesday.', 'David writes from Yokosuka. He says the sea is the same everywhere.'] });
    customer(S, X0 + 8, cz - 2.2, 2); customer(S, X0 + 15, cz - 2.2, 2);
    // the wall of wrapped bundles behind the counter
    const wz = cz + 9;
    shelfWall(S, { axis: 'z', at: wz, dir: -1 }, X0, X1 - 6, { goods: G.bundles, levels: [3, 5, 7, 9, 11], top: 12, depth: 2, gap: 0.05, tall: 0, cabinet: 1 });
    f.box(X0, 1, wz + 1, X1 - X0 - 6, 12, 1, MAT.wood_dark);
    // pressing room: presses, ironing boards, a boiler, shirts drying overhead
    const pz = wz + 5;
    P(S, 'laundry_press', X0 + 5, 1, pz + 2, 0); P(S, 'laundry_press', X0 + 13, 1, pz + 2, 0);
    P(S, 'ironing_board', X0 + 21, 1, pz + 2, 0);
    const p1 = stand(S, X0 + 5, pz + 5, 0, 'iron', ['work']), p2 = stand(S, X0 + 13, pz + 5, 0, 'iron', ['work']), p3 = stand(S, X0 + 21, pz + 4.5, 0, 'iron', ['work']);
    f.cylinder(X1 - 4, 1, Zb - 5, 2, 8, MAT.steel); f.box(X1 - 5, 9, Zb - 6, 2, 6, 2, MAT.iron);
    f.box(X0 + 1, 12, pz + 8, X1 - X0 - 8, 1, 1, MAT.iron);
    for (let x = X0 + 2; x < X1 - 8; x += 2) f.box(x, 9, pz + 8, 1, 3, 1, rng.chance(0.8) ? MAT.canvas_white : MAT.plaster_blue);
    shopLamps(S, 'ceiling_lamp', 3);
    job(S, 'clerk', [henry, p3], ['7:00', '19:00'], { title: 'laundryman', name: 'Henry Lee' });
    job(S, 'presser', [p1, p2], ['7:00', '17:00'], { title: 'presser' });
    job(S, 'presser', [p2, p3], ['7:00', '17:00'], { title: 'presser' });
    // washroom: tubs, baskets, a mangle
    const z0 = Zb + 1;
    for (let x = 5; x < S.W - 14; x += 7) P(S, 'laundry_tubs', x, 1, S.bd - 3.8, 0);
    for (let i = 0; i < 4; i++) P(S, 'laundry_basket', 6 + i * 4, 1, z0 + 3, i);
    P(S, 'washing_machine', S.W - 13, 1, z0 + 2.5, 2);
    job(S, 'washerman', [stand(S, 8.5, S.bd - 6.5, 2, 'wash', ['work'], { room: S.back })], ['6:00', '15:00'], { title: 'washerman' });
    P(S, 'ceiling_lamp', S.W / 2, 13, (z0 + S.bd) / 2, 0);
  },
  window(S, a, c) { P(S, 'laundry_bundles', (a + c) / 2, 3, 2.3, 0); sign(S, 'SHIRTS 15C', (a + c) / 2, 7.5, 1.2, 0, { bg: '#f0ecdc', fg: '#b3302a', scale: 0.6 }); },
  readables(S) {
    read(S, S.X0 + 8, 6, 12, 'Price card', 'SHIRTS, washed & pressed ..... 15c\nCOLLARS, starched ..... 4c\nSHEETS, pair ..... 20c\nTABLECLOTHS ..... 15c to 40c\n\nStarch: light, medium, or "Whitcomb" (heavy).\nPlease keep your ticket — it helps us find your bundle quickly. — H. Lee');
    read(S, S.X1 - 7, 8, 20.5, 'Photographs on the wall', 'LEE WING, 1911 — standing in this doorway in a new suit, the day the laundry opened. The sign above him is hand-painted.\n\nDAVID LEE, 1952 — Seaman, U.S. Navy, in dress blues, grinning.\n\nGRACE LEE, 1953 — with her third-grade class at Maple Street School. Thirty-one children; she has written every name on the back.');
    read(S, S.X0 + 4, 6, S.Zb - 4, 'A letter, much folded', 'Yokosuka, Japan — Aug. 30, 1953\n\nDear Pop — Ship is fine, I am fine, the chow is terrible. I saw a laundry here with a sign just like ours. The old man inside laughed when I showed him your picture. He said all laundrymen are cousins. Tell Grace I will bring her a kimono. Home by Easter, they say. — Your son, David');
  },
};

// ---------------------------------------------------------------- Adler & Son, Tailors (1906)
TRADES.tailor = {
  label: 'Tailors', hours: ['8:00', '17:30'], front: 'Tailor Shop', back: 'Workroom', family: 'Adler',
  style: { floor: 'floor_oak', wall: 'wood_panel_light', wains: 'wood_panel', signBg: 'sign_black', signFg: 'sign_gold', frame: 'trim_black', awning: ['awning_solid_navy', 'canvas_white'] },
  sign: () => ['ADLER & SON'], glass: () => ['ADLER & SON', 'CUSTOM TAILORS', 'SINCE 1906'],
  lore: () => 'Isaac Adler came from Vilna in 1905 with a pair of shears and a thimble. Forty-seven years later he still cuts every suit by hand. His son Samuel does the fittings; Isaac does the arguing.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const cx = (X0 + X1) / 2;
    // the great cutting table
    vCounter(S, Math.round(cx - 7), 18, 14, 5, { base: MAT.wood_dark, top: MAT.wood_light });
    f.box(Math.round(cx - 6), 5, 19, 9, 1, 3, MAT.sign_navy);
    P(S, 'scissors', cx - 3, 5.3, 20, 0); P(S, 'chalk', cx + 1, 5.3, 20, 0);
    const isaac = stand(S, cx, 16, 2, 'counter', ['work'], { lines: ['A machine doesn\'t know a man\'s shoulders.', 'The Mayor\'s suit? Third fitting. He keeps eating.'] });
    // bolts of cloth floor to ceiling on the left
    shelfWall(S, 'L', 5, Math.min(S.hallEnd - 1, Zb - 2), { goods: G.fabric, levels: [4, 7, 10, 13], top: 14, gap: 0.02, seg: 2, tall: 0.9 });
    for (let z = 8; z < 30; z += 6) P(S, 'fabric_bolts', X0 + 3.5, 1, z, 1, { tint: rng.pick(['#3a4a6a', '#5a4a3a', '#6a6a6a', '#2a2a3a']) });
    // three-way mirror and fitting platform on the right
    const mz = 12;
    f.box(X1 - 1, 1, mz, 1, 10, 6, MAT.mirror); f.box(X1 - 4, 1, mz - 1, 3, 10, 1, MAT.mirror); f.box(X1 - 4, 1, mz + 6, 3, 10, 1, MAT.mirror);
    f.box(X1 - 5, 1, mz + 1, 4, 1, 4, MAT.carpet_red);
    customer(S, X1 - 3, mz + 3, 1, { y: 2, lines: ['Is it supposed to pinch there?'] });
    const sam = stand(S, X1 - 6.5, mz + 3, 1, 'kneel', ['work']);
    // a fitting room with a curtain
    const fz = mz + 10;
    f.box(X1 - 7, 1, fz, 1, 11, 7, MAT.wood_dark); f.box(X1 - 7, 1, fz + 7, 7, 11, 1, MAT.wood_dark); f.box(X1 - 6, 11, fz, 6, 1, 7, MAT.wood_dark);
    f.box(X1 - 6, 1, fz, 6, 10, 1, MAT.velvet_red); f.carve(X1 - 4, 1, fz, 2, 8, 1);
    // sewing machines under the side window / back, dress forms, suits on the rack
    for (const [x, z] of [[cx - 5, Zb - 6], [cx + 4, Zb - 6]]) { P(S, 'sewing_machine', x, 1, z, 0); P(S, 'chair_wood', x, 1, z - 2.4, 2); }
    const sew1 = sit(S, cx - 5, Zb - 8.4, 2, 'sew', ['work'], 0.45), sew2 = sit(S, cx + 4, Zb - 8.4, 2, 'sew', ['work'], 0.45);
    for (const [x, z] of [[cx - 8, 10], [cx + 6, 10], [cx + 9, 28]]) P(S, 'sewing_dummy', x, 1, z, 0, { tint: rng.pick(['#2a2a3a', '#4a4a5a', '#5a4a3a']) });
    P(S, 'dress_rack', cx - 2, 1, 30, 0, { tint: '#2a2a33' }); P(S, 'dress_rack', cx + 3, 1, 30, 0, { tint: '#3a3a44' });
    P(S, 'hat_rack_wall', X1 - 0.2, 8, 30, 3); P(S, 'ironing_board', X0 + 8, 1, Zb - 4, 0);
    P(S, 'cash_register', cx + 5, 5, 19, 0);
    shopLamps(S, 'ceiling_lamp', 3);
    job(S, 'tailor', [isaac, sew1], ['8:00', '17:30'], { outfit: 'shopkeeper', title: 'master tailor' });
    job(S, 'tailor', [sam, sew2, isaac], ['8:00', '17:30'], { outfit: 'shopkeeper', title: 'tailor' });
    job(S, 'presser', [stand(S, X0 + 8, Zb - 6.5, 2, 'iron', ['work'])], ['8:00', '16:00'], { title: 'presser' });
    browse(S, X0 + 5, 14, 3); browse(S, cx, 26, 2);
    stockroom(S, { goods: G.fabric, items: ['fabric_bolts', 'crate', 'sewing_dummy', 'hatbox'] });
  },
  window(S, a, c) { P(S, 'sewing_dummy', a + 2.5, 3, 2.3, 0, { tint: '#2a2a3a' }); if (c - a > 8) P(S, 'sewing_dummy', c - 2.5, 3, 2.3, 0, { tint: '#5a4a3a' }); P(S, 'fabric_bolts', (a + c) / 2, 3, 2.6, 0, { tint: '#3a4a6a' }); },
  readables(S) {
    const cx = (S.X0 + S.X1) / 2;
    read(S, cx, 6, 18, 'Pattern — pinned to the table', 'BRENNAN, Robert — wedding suit\nNavy worsted, 3-button, single-breasted. 3 fittings.\nChest 38 — Waist 31 — Inseam 32 (the boy will not stand still)\nPaid in full by his father, Capt. J. Brennan, Engine Co. No. 1\n\nNote in Isaac\'s hand: "Delivered Friday. He cried. So did the Captain. So — never mind."');
    read(S, S.X1 - 2, 8, 9, 'Certificate (framed)', 'A journeyman\'s certificate in Russian and Yiddish, Vilna, 1903, with a wax seal.\n\nBeside it, a small photograph: a room over Market Street in 1906, one table, one window, and a very young man holding a pair of shears as though they might escape.');
    read(S, S.X0 + 4, 8, S.Zb - 6, 'Card index', 'MEASUREMENTS — A drawer of cards going back to 1906.\n\nPEMBERTON, Walter (Mayor) — 1931: chest 40. 1941: 42. 1953: "44. Do not tell him."\nWHITCOMB, Miss A. — riding habit, 1911. "Still fits. She checks every year."');
  },
};

// ---------------------------------------------------------------- Castellano Fish Market (1894)
TRADES.fish = {
  label: 'Fish Market', hours: ['5:00', '14:00'], front: 'Fish Market', back: 'Ice Room',
  style: { floor: 'floor_tile_white', wall: 'tile_kitchen', wains: 'tile_mint', signBg: 'sign_navy', signFg: 'sign_white', frame: 'trim_blue', awning: ['awning_blue', 'canvas_white'] },
  sign: () => ['CASTELLANO', 'FISH MARKET'], glass: () => ['CASTELLANO FISH MARKET', 'FRESH FROM OUR OWN BOATS', 'EST. 1894'],
  panel: () => 'CASTELLANO',
  lore: () => 'Giuseppe Castellano came from Sciacca, Sicily, in 1894 with one dory. Three boats now, every one blessed by Father Garrity. Today the whole family is waiting for one boy: Sal Jr., home from Korea.',
  ghost: [['CASTELLANO FISH CO.', 'FRESH EVERY MORNING']],
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const cx = (X0 + X1) / 2;
    // ice displays across the shop, the mongers behind
    for (const dx of [-8, -2.5, 3, 8.5]) if (cx + dx > X0 + 3 && cx + dx < X1 - 3) P(S, 'fish_ice_display', cx + dx, 1, 16, 0);
    vCounter(S, X0 + 2, 22, X1 - X0 - 12, 2, { base: MAT.enamel_white, top: MAT.stainless });
    P(S, 'scale_grocery', cx - 4, 5, 23, 0); P(S, 'cash_register', cx + 6, 5, 23, 0);
    const m1 = stand(S, cx - 4, 19.8, 0, 'counter', ['work'], { lines: ['Haddock this morning, off the Ledge. Look at the eyes — clear as glass.', 'My boy is home. My boy is home from Korea!'] });
    const m2 = stand(S, cx + 4, 19.8, 0, 'counter', ['work'], { lines: ['Three pounds of cod, Mrs. Kowalski? For you, three and a half.'] });
    customer(S, cx - 4, 12.5, 2); customer(S, cx + 4, 12.5, 2); browse(S, X0 + 4, 10, 1);
    // lobster tank, crates, the hanging scale, a chalkboard
    const tz = 28;
    f.box(X1 - 10, 1, tz, 8, 3, 5, MAT.enamel_white); f.box(X1 - 9, 4, tz + 1, 6, 2, 3, MAT.water); f.box(X1 - 10, 4, tz, 8, 3, 1, MAT.glass); f.box(X1 - 10, 4, tz, 1, 3, 5, MAT.glass); f.box(X1 - 3, 4, tz, 1, 3, 5, MAT.glass); f.box(X1 - 10, 4, tz + 4, 8, 3, 1, MAT.glass);
    for (let i = 0; i < 4; i++) f.box(X1 - 9 + i * 2, 4, tz + 2, 1, 1, 1, MAT.rust);
    for (let i = 0; i < 5; i++) P(S, 'fish_crate', X0 + 3 + (i % 3) * 3.2, 1 + Math.floor(i / 3) * 1.8, tz + 3, 0);
    f.box(X0 + 2, 7, Zb - 1, 10, 5, 1, MAT.chalkboard);
    P(S, 'scale_grocery', X1 - 6, 9, Zb - 1.2, 0);
    // Santa Rosalia's little shelf
    f.box(X1 - 4, 9, Zb - 2, 3, 1, 1, MAT.wood_dark); P(S, 'candles_pair', X1 - 2.5, 10, Zb - 1.6, 0);
    shopLamps(S, 'ceiling_lamp', 3);
    job(S, 'fishmonger', [m1], ['5:00', '13:00'], { outfit: 'fisherman', title: 'fishmonger' });
    job(S, 'fishmonger', [m2, m1], ['5:00', '13:00'], { outfit: 'fisherman', title: 'fishmonger' });
    // the ice room
    const z0 = Zb + 1;
    f.box(3, 1, S.bd - 6, S.W - 16, 3, 3, MAT.snow);
    for (let i = 0; i < 6; i++) P(S, 'fish_crate', 5 + i * 3, 1, z0 + 3, 0);
    job(S, 'iceman', [stand(S, S.W / 2, z0 + 6, 2, 'carry', ['work'], { room: S.back })], ['5:00', '11:00'], { outfit: 'dock', title: 'ice man' });
    P(S, 'ceiling_lamp', S.W / 2, 13, (z0 + S.bd) / 2, 0);
    void rng;
  },
  window(S, a, c) {
    const f = S.f;
    f.box(a, 3, 1, c - a, 1, 3, MAT.snow);
    for (let x = a + 1; x < c - 1; x += 2) f.box(x, 4, 2, 1, 1, 1, S.rng.chance(0.5) ? MAT.steel : MAT.granite);
    if (!S.banner) { S.banner = true; sign(S, 'WELCOME HOME SAL', (a + c) / 2, 10.4, 1.3, 0, { bg: '#f0ecdc', fg: '#b3302a', border: '#1f3a6e', scale: 0.75 }); }
  },
  readables(S) {
    read(S, S.X0 + 7, 9, S.Zb - 1.4, 'Today\'s Catch', 'TODAY\'S CATCH — boats in at 6\nHaddock ..... 29 lb\nCod ..... 25\nMackerel ..... 19\nFlounder ..... 35\nSea Scallops ..... 79 pt\nLive Lobsters ..... 69 lb\nSteamers ..... 25 qt\n\nNO FISH SUNDAY. SEE YOU AT MASS.');
    read(S, S.X1 - 2.5, 10, S.Zb - 2, 'Holy card & photograph', 'A holy card of Santa Rosalia, patroness against plague, propped against a votive candle.\n\nTucked in its corner: GIUSEPPE CASTELLANO, 1894 — a lean young man in a cap, standing in a dory named SANTA ROSALIA, not quite smiling at the camera. On the back: "Sciacca — Juniper Bay — sempre avanti."');
    read(S, (S.X0 + S.X1) / 2, 11, 1.4, 'Banner', 'WELCOME HOME SAL!\n\nHand-lettered on a bedsheet by Maria and the girls from the cannery. Somebody has added, in smaller letters, "AND DON\'T EVER DO THAT AGAIN" — it looks like Rosa\'s writing.');
  },
};

// ---------------------------------------------------------------- Mayhew's Pharmacy & Soda Fountain (1909)
TRADES.drugstore = {
  label: 'Pharmacy', hours: ['9:00', '21:00'], front: 'Drugstore', back: 'Dispensary Stock', upper: ['office', 'apt'],
  style: { floor: 'floor_bigcheck', wall: 'plaster_white', wains: 'wood_dark', signBg: 'sign_black', signFg: 'sign_gold', frame: 'trim_black', ceil: 'ceiling_tin', door: 'right' },
  sign: () => ["MAYHEW'S PHARMACY", "MAYHEW'S DRUGS", 'PHARMACY'], glass: () => ["MAYHEW'S PHARMACY", 'SODA FOUNTAIN - PRESCRIPTIONS', 'EST. 1909'],
  lore: () => 'Theodore Mayhew, Ph.G., brother of Miss Harriet Mayhew the librarian, filled prescriptions around the clock for six weeks in 1918. The soda fountain came in 1926. Saturday afternoons it belongs to the high school.',
  ghost: [['DRUGS', 'MAYHEW PHARMACY'], ['LYDIA PINKHAM', 'VEGETABLE COMPOUND']],
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    // soda fountain along the left: back bar + counter + nine stools
    const z0 = 7, z1 = Math.min(S.hallEnd - 1, 8 + 3 * 10);
    f.box(X0, 1, z0, 2, 3, z1 - z0, MAT.wood_dark); f.box(X0, 4, z0, 2, 1, z1 - z0, MAT.marble);
    f.box(X0, 5, z0, 1, 4, z1 - z0, MAT.mirror); f.box(X0, 9, z0, 2, 1, z1 - z0, MAT.wood_dark);
    for (let z = z0 + 2; z < z1 - 1; z += 3) { f.box(X0 + 1, 5, z, 1, 2, 1, MAT.chrome); f.box(X0, 10, z, 1, 1, 1, Mt(rng.pick(G.pharmacy))); }
    const fx = X0 + 4;
    f.box(fx, 1, z0, 3, 3, z1 - z0, MAT.enamel_white); f.box(fx, 4, z0, 3, 1, z1 - z0, MAT.marble); f.box(fx + 3, 1, z0, 1, 1, z1 - z0, MAT.chrome);
    P(S, 'soda_fountain', fx + 1, 5, z0 + 6, 1); P(S, 'soda_fountain', fx + 1, 5, z1 - 8, 1);
    P(S, 'cake_stand', fx + 1.5, 5, z0 + 2, 1); P(S, 'coffee_urn', X0 + 1, 5, z1 - 3, 1);
    for (let z = z0 + 4; z < z1 - 3; z += 6) P(S, 'coffee_cup', fx + 0.8, 5, z, 1);
    const stools = stoolRow(S, z0 + 1.5, z1 - 1.5, fx + 5.2, 3, { axis: 'z', type: 'soda_stool', tags: ['soda', 'eat_out'], act: 'drink', tint: '#b3302a', step: 3 });
    const jerk1 = stand(S, X0 + 2.5, z0 + 8, 1, 'serve', ['work'], { lines: ['One black cow, two straws. Coming up.', 'Sock hop at seven-thirty, huh? You going with Peggy Halloran?'] });
    const jerk2 = stand(S, X0 + 2.5, z1 - 8, 1, 'serve', ['work']);
    P(S, 'menu_board', X0 + 0.3, 11, (z0 + z1) / 2, 1);
    // the prescription department, raised at the back
    const pz = Zb - 9, px0 = X0 + 10, px1 = X1 - 10;
    f.box(px0, 1, pz, px1 - px0, 1, Zb - pz, MAT.wood_dark);
    vCounter(S, px0, pz, px1 - px0, 2, { y: 2, h: 3, base: MAT.wood_dark, top: MAT.marble });
    shelfWall(S, 'B', px0, px1, { goods: G.pharmacy, levels: [6, 8, 10, 12], top: 13, cabinet: 4 });
    sign(S, 'PRESCRIPTIONS', (px0 + px1) / 2, 11.5, Zb - 1.2, 0, { bg: '#1d1d22', fg: '#e8c870', scale: 1.1 });
    P(S, 'scale_grocery', px0 + 3, 5, pz + 1, 0);
    const rx = stand(S, (px0 + px1) / 2, pz + 4, 0, 'counter', ['work'], { y: 2, lines: ['Take one every four hours with water. Not with coffee, Mr. Garrity.', 'My sister says you have a library book out since June.'] });
    customer(S, (px0 + px1) / 2 + 2, pz - 2, 2);
    // patent medicines along the right, magazines and cards, a phone booth, the penny scale
    shelfWall(S, 'R', 5, pz - 2, { goods: G.pharmacy, levels: [5, 8, 11], top: 12 });
    for (let z = 6; z < 18; z += 5) P(S, 'magazine_rack', S.X1 - 3, 1, z, 3);
    P(S, 'book_rack', (fx + 6 + X1 - 4) / 2, 1, 22, 0);
    vCounter(S, S.doorX - 7, 6, 5, 3, { base: MAT.wood_dark, top: MAT.glass }); P(S, 'cash_register', S.doorX - 5, 5, 7.5, 0);
    const cash = stand(S, S.doorX - 4.5, 11, 0, 'counter', ['work']);
    P(S, 'phone_booth', S.X1 - 3, 1, pz - 4, 3);
    const psx = (fx + 6 + X1 - 4) / 2 | 0;
    f.box(psx, 1, 30, 2, 1, 2, MAT.enamel_white); f.box(psx, 2, 31, 2, 4, 1, MAT.enamel_white); f.box(psx, 6, 31, 2, 2, 1, MAT.clock_face);
    shopLamps(S, 'ceiling_lamp', 4);
    job(S, 'pharmacist', [rx], ['9:00', '18:00'], { outfit: 'doctor', title: 'pharmacist', name: 'Theodore Mayhew' });
    job(S, 'soda jerk', [jerk1, jerk2], ['10:00', '21:00'], { outfit: 'cook', title: 'soda jerk', age: [16, 24] });
    job(S, 'soda jerk', [jerk2, jerk1], ['12:00', '21:00'], { outfit: 'waitress', sex: 'F', title: 'fountain girl', age: [16, 24] });
    job(S, 'clerk', [cash], ['9:00', '18:00'], { sex: 'F', title: 'drugstore clerk' });
    for (const [x, z, r] of [[S.X1 - 5, 10, 1], [S.X1 - 5, 20, 1], [(fx + 6 + X1 - 4) / 2, 19, 2], [(fx + 6 + X1 - 4) / 2 + 1, 28, 2]]) browse(S, x, z, r);
    S.eat = stools;
    stockroom(S, { goods: G.pharmacy, items: ['crate', 'crate_small', 'crate_stack'] });
  },
  window(S, a, c) {
    // the show globes: great glass vessels of coloured water
    const f = S.f, x = (a + c) / 2;
    f.box(Math.round(x - 3), 3, 2, 1, 2, 1, MAT.trim_gold); f.sphere(x - 2.5, 6.5, 2.5, 1.6, MAT.glass_stained_red);
    f.box(Math.round(x + 2), 3, 2, 1, 2, 1, MAT.trim_gold); f.sphere(x + 2.5, 6.5, 2.5, 1.6, MAT.glass_stained_green);
    S.b.light(x, 6.5, 2.5, { color: [1, 0.5, 0.5], radius: 3, mode: 'night' });
  },
  readables(S) {
    read(S, S.X0 + 1, 11, 20, 'Fountain menu', 'MAYHEW\'S FOUNTAIN\nIce Cream Soda ..... 20\nBanana Split ..... 35\nHot Fudge Sundae ..... 25\nEgg Cream ..... 15\nBlack Cow ..... 20\nLime Rickey ..... 10\nCherry Phosphate ..... 10\nGrilled Cheese ..... 30\n\nTHE CENTENNIAL SUNDAE — three scoops, maple syrup, Kowalski\'s walnuts, a cherry and a tiny flag ..... 35');
    read(S, (S.X0 + S.X1) / 2, 7, S.Zb - 1.4, 'Framed certificate', 'COMMONWEALTH OF MASSACHUSETTS — BOARD OF REGISTRATION IN PHARMACY\nTheodore A. Mayhew, Ph.G. — 1909\n\nPinned below it, a yellowed note: "Oct. 1918 — Open all night until further notice. Ring the bell. — T.M."\nHe rang it himself, the town says, for six weeks.');
  },
};

// ---------------------------------------------------------------- Freeman's Barber Shop (1921)
TRADES.barber = {
  label: 'Barber Shop', hours: ['8:00', '18:00'], front: 'Barber Shop', back: 'Back Room', family: 'Freeman',
  style: { floor: 'floor_checker', wall: 'plaster_mint', wains: 'wood_dark', signBg: 'sign_red', signFg: 'sign_white', frame: 'trim_red', door: 'left', awning: ['awning_red', 'canvas_white'] },
  sign: () => ["FREEMAN'S", 'BARBERS', 'BARBER'], glass: () => ["FREEMAN'S BARBER SHOP", 'EST. 1921', 'HAIRCUTS - SHAVES - SHINES'],
  lore: () => 'Samuel Freeman came north from Virginia in 1919 and opened with one chair and a secondhand mirror. His son Marcus runs it now. By Tuesday he knows everything that happened in town.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    // mirror wall on the right with a marble shelf of tonics
    f.box(X1 - 1, 5, 7, 1, 6, 28, MAT.mirror); f.box(X1 - 2, 4, 7, 2, 1, 28, MAT.marble);
    for (let z = 8; z < 34; z += 2) if (rng.chance(0.7)) f.box(X1 - 2, 5, z, 1, 1, 1, Mt(rng.pick(G.pharmacy)));
    f.box(X1 - 2, 1, 7, 2, 3, 28, MAT.wood_dark);
    const chairs = [], barbers = [];
    [10, 19, 28].forEach((z, i) => {
      P(S, 'barber_chair', X1 - 7, 1, z, 1, { tint: '#e8e4d8' });
      P(S, 'barber_mirror_station', X1 - 1.2, 1, z, 3);
      if (i < 2) {
        chairs.push(sit(S, X1 - 7, z, 1, 'sit', ['shop', 'customer'], 0.62, { lines: ['Just a trim, Marcus. Wedding.', 'Take a little more off the sides.'] }));
        barbers.push(stand(S, X1 - 9.4, z + 1.2, 1, 'haircut', ['work']));
      }
    });
    // waiting chairs along the left, magazines, the radio on a shelf, coat rack, shoeshine
    const wait = [];
    for (let z = 12; z < 32; z += 3.5) { P(S, 'chair_wood', X0 + 1.6, 1, z, 1); wait.push(sit(S, X0 + 1.6, z, 1, rng.pick(['read', 'talk_sit', 'listen_sit']), ['shop', 'browse'], 0.45)); }
    f.box(X0, 8, 16, 1, 1, 6, MAT.wood_mid); P(S, 'radio_table', X0 + 0.8, 9, 19, 1);
    P(S, 'magazine_rack', X0 + 4, 1, 10, 1); P(S, 'coat_rack', X0 + 2, 1, 34, 0); P(S, 'ashtray', X0 + 4, 1, 20, 0);
    P(S, 'shoeshine_stand', X0 + 5, 1, 5.5, 2);
    // Pop's photograph on the back wall above the third chair
    P(S, 'portrait', X1 - 8, 8, Zb - 0.4, 0); P(S, 'photo_frames', X1 - 14, 8, Zb - 0.4, 0);
    P(S, 'clock_wall', X0 + 12, 11, Zb - 0.4, 0);
    // barber pole out front
    P(S, 'barber_pole', S.W - 1, 4, -1.4, 0); S.b.light(S.W - 1, 9, -2, { mode: 'night', radius: 3, color: [1, 0.9, 0.8] });
    shopLamps(S, 'ceiling_lamp', 3);
    job(S, 'barber', [barbers[0], barbers[0], barbers[1]], ['8:00', '18:00'], { outfit: 'barber', title: 'barber', name: 'Marcus Freeman' });
    job(S, 'barber', [barbers[1], barbers[1], barbers[0]], ['8:00', '18:00'], { outfit: 'barber', title: 'barber' });
    job(S, 'shoeshine', [stand(S, X0 + 5, 8.5, 0, 'shine', ['work'])], ['9:00', '17:00'], { title: 'shoeshine boy', age: [12, 17] });
    stockroom(S, { items: ['crate', 'laundry_basket', 'crate_small'] });
    void chairs; void wait;
  },
  window(S, a, c) { P(S, 'barber_pole', a + 1.5, 3, 2.3, 0); sign(S, 'HAIRCUT 75C', (a + c) / 2, 6.8, 1.2, 0, { bg: '#f0ecdc', fg: '#b3302a', scale: 0.6 }); },
  readables(S) {
    const { X1, Zb } = S;
    read(S, X1 - 8, 8, Zb - 0.6, 'Photograph — Samuel Freeman, 1921', 'SAMUEL FREEMAN (1889–1950)\nOpening day, May 2, 1921 — one chair, one secondhand mirror, a straight razor from Richmond.\n\nHis first customer, standing beside him in a boater hat, is Captain Horace Hatch — who paid with a silver dollar and came back every other Saturday for twenty-nine years.\n\nThe third chair is Pop\'s. Nobody sits in it. Marcus oils it every Monday.');
    read(S, X1 - 14, 8, Zb - 0.6, 'A framed dollar & a lantern', 'THE FIRST DOLLAR — a silver dollar, 1921, from Capt. H. Hatch.\n\nAnd a photograph of a blue glass lantern hanging by the back door of this shop, 1927. On Saturday nights, when the lantern was lit, the back room was open for music — Sam on guitar, a fiddler from the cannery, and a boy named Earl on an old upright piano.\n\nEarl grew up. The club on Church Street is named for the lantern.');
    read(S, S.X0 + 3, 7, 26, 'Price board', 'HAIRCUT ..... 75c\nSHAVE ..... 50c\nCHILDREN (under 12) ..... 50c\nSHAMPOO ..... 35c\nSHINE ..... 15c\n\nClosed Sunday & Monday.\n"Shave and a haircut? Two bits." — Not since 1929.');
  },
};

// ---------------------------------------------------------------- Woolcott's 5 & 10
TRADES.dime = {
  label: '5 & 10', hours: ['9:00', '18:00'], front: 'Five & Ten', back: 'Stockroom',
  style: { floor: 'floor_oak_z', wall: 'plaster_cream', wains: 'wood_panel_light', signBg: 'sign_red', signFg: 'sign_gold', frame: 'trim_red', awningMode: 'none', door: 'center' },
  sign: () => ["WOOLCOTT'S 5 & 10", "WOOLCOTT'S", '5 & 10'], glass: () => ["WOOLCOTT'S", '5 - 10 - 25 CENT STORE'],
  lore: () => 'Everything from thread to goldfish. The lunch counter at the back does a grilled cheese that the high school considers the best in the county.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const cx = (X0 + X1) / 2;
    const mixed = [...G.toys, ...G.candy, ...G.grocery];
    // two island counters with glass bin dividers
    const clerks = [];
    for (const ix of [Math.round(cx - 9), Math.round(cx + 6)]) {
      f.box(ix, 1, 8, 3, 3, 20, MAT.wood_dark); f.box(ix, 4, 8, 3, 1, 20, MAT.wood_light);
      for (let z = 8; z < 28; z++) { if (z % 4 === 0) f.box(ix, 5, z, 3, 1, 1, MAT.glass); else f.box(ix + 1, 5, z, 1, 1, 1, Mt(rng.pick(mixed))); }
      clerks.push(stand(S, ix + 1.5, 29.5, 0, 'counter', ['work']));
      browse(S, ix - 1.5, 14, 1); browse(S, ix + 4.5, 20, 3);
    }
    shelfWall(S, 'L', 5, Math.min(S.hallEnd - 1, Zb - 2), { goods: mixed, levels: [5, 8, 11], top: 12 });
    shelfWall(S, 'R', 5, Zb - 14, { goods: mixed, levels: [5, 8, 11], top: 12 });
    P(S, 'candy_jars', cx - 7.5, 5, 10, 0); P(S, 'candy_jars', cx + 7.5, 5, 12, 0);
    P(S, 'cash_register', cx - 7.5, 5, 25, 0); P(S, 'cash_register', cx + 7.5, 5, 25, 0);
    // goldfish tank
    f.box(X1 - 6, 1, Zb - 13, 4, 3, 4, MAT.wood_dark); f.box(X1 - 6, 4, Zb - 13, 4, 2, 4, MAT.glass); f.box(X1 - 5, 4, Zb - 12, 2, 1, 2, MAT.water); f.box(X1 - 5, 5, Zb - 12, 1, 1, 1, MAT.sign_orange);
    browse(S, X1 - 7.5, Zb - 11, 1, { act: 'look', lines: ['Mama, can we get one? Just one?'] });
    // lunch counter at the back
    const lz = Zb - 5;
    f.box(X0 + 2, 1, lz, 20, 3, 2, MAT.enamel_white); f.box(X0 + 2, 4, lz, 20, 1, 2, MAT.counter_red);
    f.box(X0 + 2, 1, Zb - 1, 20, 4, 1, MAT.stainless); P(S, 'coffee_urn', X0 + 6, 5, Zb - 1.5, 0); P(S, 'pie_display', X0 + 14, 5, Zb - 1.5, 0);
    const stools = stoolRow(S, X0 + 4, X0 + 20, lz - 1.6, 2, { type: 'soda_stool', tint: '#b3302a', tags: ['eat_out'], act: 'eat' });
    const lunch = stand(S, X0 + 12, Zb - 2.5, 0, 'serve', ['work']);
    shopLamps(S, 'ceiling_lamp', 4);
    job(S, 'clerk', [clerks[0]], ['9:00', '18:00'], { sex: 'F', title: 'counter girl' });
    job(S, 'clerk', [clerks[1]], ['9:00', '18:00'], { sex: 'F', title: 'counter girl' });
    job(S, 'clerk', [stand(S, X0 + 4, 20, 3, 'shelve', ['work']), clerks[0]], ['9:00', '17:00'], { sex: 'F', title: 'stock girl' });
    job(S, 'lunch counter', [lunch], ['10:00', '17:00'], { outfit: 'waitress', sex: 'F', title: 'lunch counter girl' });
    S.eat = stools;
    stockroom(S, { goods: mixed, items: ['crate_stack', 'crate', 'crate_small'] });
  },
  window(S, a, c) { for (let x = a + 1.5; x < c - 1; x += 2.5) P(S, S.rng.pick(['toy_blocks', 'teddy_bear', 'spinning_top', 'jack_in_the_box', 'candy_jars', 'ball']), x, 3, 2.3, 0); },
  readables(S) { read(S, S.X0 + 12, 6, S.Zb - 4, 'Lunch counter', 'GRILLED CHEESE ..... 25\nTUNA SALAD SANDWICH ..... 30\nHOT DOG ..... 15\nCUP OF CHOWDER ..... 20\nCOCA-COLA ..... 5\nPIE ..... 15\n\n"Seat yourself. No loitering after 3. That means you, Walter Novak."'); },
};

// ---------------------------------------------------------------- Bloom & Bower Florist
TRADES.florist = {
  label: 'Florist', hours: ['8:00', '18:00'], front: 'Flower Shop', back: 'Workroom',
  style: { floor: 'floor_linoleum_green', wall: 'plaster_green', wains: 'wood_panel_light', signBg: 'sign_green', signFg: 'sign_white', frame: 'trim_green', awning: ['awning_green', 'canvas_white'] },
  sign: () => ['BLOOM & BOWER', 'FLOWERS'], glass: () => ['BLOOM & BOWER', 'FLOWERS FOR ALL OCCASIONS', 'FLOWERS BY WIRE'],
  lore: () => 'Two sisters, Ivy and Rose Bower. Today they have done the flowers for a wedding, a christening, the Mayor\'s podium and the time capsule ceremony — and they are not speaking to each other.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    // the cooler: a glass wall across the back with flowers behind it
    const cz = Zb - 7;
    f.box(X0 + 2, 1, cz, X1 - X0 - 14, 11, 1, MAT.glass); f.box(X0 + 2, 12, cz, X1 - X0 - 14, 1, 7, MAT.steel_white);
    for (let x = X0 + 2; x < X1 - 12; x += 6) f.box(x, 1, cz, 1, 11, 1, MAT.steel_white);
    shelfWall(S, 'B', X0 + 2, X1 - 12, { goods: G.flowers, levels: [4, 7, 10], top: 11, depth: 3, gap: 0.05 });
    for (let z = 8; z < cz - 3; z += 4) P(S, 'flower_buckets', S.X1 - 1.8, 1, z, 3);
    for (const [t, z] of [['fern_stand', 8], ['rubber_plant', 14], ['plant_pot', 20], ['fern_stand', 26]]) P(S, t, X0 + 2, 1, z, 1);
    // the work table with the wedding order
    const cx = (X0 + X1) / 2;
    vCounter(S, Math.round(cx - 5), 16, 9, 4, { base: MAT.wood_mid, top: MAT.wood_pale });
    P(S, 'bouquet', cx - 2, 5, 17.5, 0); P(S, 'vase_flowers', cx + 2, 5, 17.5, 0, { tint: '#f0f0e8' }); P(S, 'scissors', cx, 5.2, 18.5, 0);
    for (let x = Math.round(cx - 4); x < cx + 3; x += 2) f.box(x, 5, 19, 1, 1, 1, MAT.flowerbed_red);
    const ivy = stand(S, cx - 2, 21.8, 0, 'counter', ['work'], { lines: ['Twelve pew bows, white satin. Twelve.', 'Rose did the podium. It\'s crooked.'] });
    const rose = stand(S, cx + 5, 12, 3, 'counter', ['work'], { lines: ['Ivy did the bride\'s cascade. It\'s lopsided.'] });
    vCounter(S, X0 + 2, 6, 6, 3, { base: MAT.wood_dark, top: MAT.wood_light }); P(S, 'cash_register', X0 + 4, 5, 7.5, 0);
    shopLamps(S, 'ceiling_lamp', 2);
    job(S, 'florist', [ivy, rose], ['8:00', '18:00'], { sex: 'F', title: 'florist', name: 'Ivy Bower' });
    job(S, 'florist', [rose, ivy], ['8:00', '18:00'], { sex: 'F', title: 'florist', name: 'Rose Bower' });
    browse(S, X1 - 5, 10, 1, { act: 'look' }); browse(S, X0 + 5, 18, 3, { act: 'look' }); customer(S, X0 + 5, 11, 2);
    // mums and pumpkins out on the sidewalk
    const out = b.entrances[0] ? b.entrances[0].node : null;
    for (let x = 3; x < S.W - 3; x += 6) if (Math.abs(x - S.doorC) > 4) { P(S, rng.chance(0.5) ? 'flower_buckets' : 'flower_pot', x, 0, -1.8, 0); if (rng.chance(0.5)) P(S, 'pumpkin', x + 2, 0, -1.6, 0); }
    void out;
    stockroom(S, { goods: G.flowers, items: ['flower_buckets', 'crate', 'plant_pot'] });
  },
  window(S, a, c) { P(S, 'flower_buckets', a + 2, 3, 2.3, 0); P(S, 'vase_flowers', (a + c) / 2, 3, 2.3, 0, { tint: '#d85a6a' }); P(S, 'fern_stand', c - 2, 3, 2.4, 0); },
  readables(S) { read(S, (S.X0 + S.X1) / 2, 6, 16, 'Order slip', 'NOVAK — BRENNAN — St. Brigid\'s, 2 o\'clock\nBride: cascade, white roses & stephanotis\nBridesmaids (4): pink sweetheart roses\nPew bows: 12, white satin\nAltar: 2 urns white gladioli\nCorsages: Mrs. Novak, Mrs. Brennan (Mrs. B. wants yellow. Mrs. N. says NO yellow.)\n\nALSO TODAY: Mayor\'s podium, red white & blue carnations — Time capsule, one white rose, per Miss Whitcomb.'); },
};

// ---------------------------------------------------------------- Gould Millinery
TRADES.hatshop = {
  label: 'Millinery', hours: ['9:00', '17:30'], front: 'Hat Salon', back: 'Workroom',
  style: { floor: 'carpet_rose', wall: 'wallpaper_rose', wains: 'trim_white', signBg: 'sign_black', signFg: 'sign_gold', frame: 'trim_black', awning: ['awning_solid_navy', 'canvas_white'] },
  sign: () => ['GOULD MILLINERY', 'MILLINERY'], glass: () => ['GOULD MILLINERY', 'HATS FOR EVERY OCCASION', 'MOURNING - BRIDAL - SPORT'],
  lore: () => 'Madame Gould (born Minnie Gold, of Chelsea) has hatted every bride, widow and mayor\'s wife in Juniper Bay since 1924.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const hats = ['hat_cloche', 'hat_pillbox', 'hat_veil', 'hat_sunhat', 'hat_straw', 'hat_beret', 'hat_ribbon_bow', 'hat_cloche', 'hat_fedora'];
    const cx = (X0 + X1) / 2;
    // wall shelves of hats and hatboxes
    for (const side of ['L', 'R']) {
      const x = side === 'L' ? X0 : S.X1 - 2, rot = side === 'L' ? 1 : 3;
      const z1 = side === 'L' ? Math.min(S.hallEnd - 1, Zb - 2) : Zb - 8;
      for (const y of [4, 7, 10]) f.box(x, y, 6, 2, 1, z1 - 6, MAT.trim_white);
      for (let z = 7; z < z1 - 1; z += 2.5) for (const y of [4, 7, 10]) P(S, rng.pick(hats), x + 1, y + 1, z, rot, { tint: rng.pick(['#2a2a3a', '#b3302a', '#e8e0d0', '#6a4a8a', '#3a5a4a', '#d8a0b8', '#1f2f5f']) });
    }
    for (const [x, z] of [[cx - 5, 12], [cx + 5, 12], [cx - 5, 22], [cx + 5, 22], [cx, 30]]) P(S, 'hat_display', x, 1, z, 0);
    // vanities with chairs, mirrors
    const seats = [];
    for (const x of [cx - 6, cx + 2]) {
      f.box(Math.round(x), 1, Zb - 3, 5, 3, 2, MAT.trim_white); f.box(Math.round(x), 4, Zb - 3, 5, 1, 2, MAT.marble); f.box(Math.round(x) + 1, 5, Zb - 1, 3, 5, 1, MAT.mirror);
      P(S, 'chair_upholstered_dining', x + 2.5, 1, Zb - 5.5, 2, { tint: '#d8a0b8' });
      seats.push(sit(S, x + 2.5, Zb - 5.5, 2, 'sit', ['shop'], 0.45, { lines: ['Is the veil too much? For a wedding?', 'Something for the Centennial. Something with a feather.'] }));
    }
    for (let i = 0; i < 5; i++) P(S, 'hatbox', X0 + 5 + (i % 2) * 0.4, 1 + i * 1.25, Zb - 5, i);
    const g = stand(S, cx, Zb - 8, 2, 'talk', ['work']);
    vCounter(S, X1 - 11, 6, 6, 3, { base: MAT.trim_white, top: MAT.glass }); P(S, 'cash_register', X1 - 9, 5, 7.5, 0);
    const c2 = stand(S, X1 - 8, 11, 0, 'counter', ['work']);
    shopLamps(S, 'chandelier', 2);
    job(S, 'milliner', [g, c2], ['9:00', '17:30'], { sex: 'F', title: 'milliner', name: 'Madame Gould' });
    job(S, 'milliner', [sit(S, S.W / 2, S.Zb + 6, 0, 'sew', ['work'], 0.45, { room: S.back }), c2], ['9:00', '17:00'], { sex: 'F', title: 'milliner\'s apprentice' });
    browse(S, cx - 3, 16, 1); browse(S, cx + 3, 26, 3); browse(S, X0 + 4, 14, 3);
    stockroom(S, { goods: G.hats, items: ['hatbox', 'crate', 'sewing_dummy', 'fabric_bolts'] });
  },
  window(S, a, c) { for (let x = a + 2; x < c - 1; x += 3) P(S, 'hat_display', x, 3, 2.3, 0); },
  readables(S) { read(S, S.X1 - 8, 6, 7, 'Appointment book', 'SATURDAY SEPT. 26\n9:00 Mrs. Stella Novak — dove-gray pillbox, short veil — FINAL. (She has changed her mind four times.)\n9:30 Mrs. Joseph Brennan — navy straw. "Nothing that competes with Stella."\n10:00 Mrs. Pemberton — something for the podium. "Not too tall; the Mayor is sensitive."\n11:00 Miss Whitcomb — re-trim the 1911 black felt. Again.'); },
};

// ---------------------------------------------------------------- Draper's Toys
TRADES.toys = {
  label: 'Toys', hours: ['9:00', '18:00'], front: 'Toy Shop', back: 'Stockroom',
  style: { floor: 'floor_oak', wall: 'wallpaper_yellow', wains: 'wood_panel_light', signBg: 'sign_blue', signFg: 'sign_yellow', frame: 'trim_blue', awning: ['awning_yellow', 'canvas_white'] },
  sign: () => ["DRAPER'S TOYS", 'DRAPER TOYS', 'TOYS'], glass: () => ["DRAPER'S TOYS", 'GAMES - DOLLS - ELECTRIC TRAINS'],
  lore: () => 'Old Mr. Draper runs the train layout in the window himself. The boys of Juniper Bay have worn a groove in the sidewalk in front of it.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const cx = (X0 + X1) / 2;
    const zL = Math.min(S.hallEnd - 1, Zb - 2);
    shelfWall(S, 'L', 5, zL, { goods: G.toys, levels: [5, 8, 11], top: 12 });
    for (let z = 8; z < zL - 2; z += 5) P(S, 'toy_display', X0 + 3, 1, z, 1);
    for (let z = 8; z < Zb - 10; z += 5) P(S, 'toy_display', S.X1 - 2, 1, z, 3);
    // the big train table in the middle
    f.box(Math.round(cx - 6), 1, 14, 12, 3, 10, MAT.wood_dark); f.box(Math.round(cx - 6), 4, 14, 12, 1, 10, MAT.grass_lawn);
    f.walls(Math.round(cx - 5), 4, 15, 10, 1, 8, MAT.iron); f.box(Math.round(cx - 1), 4, 17, 2, 2, 3, MAT.stucco_white); f.box(Math.round(cx - 1), 6, 17, 2, 1, 3, MAT.roof_tile_red);
    P(S, 'toy_train', cx - 3, 5.1, 15.5, 1);
    for (const [x, z, r] of [[cx - 8, 18, 1], [cx + 8, 20, 3], [cx, 26, 0]]) browse(S, x, z, r, { act: 'look', lines: ['Can I work the switch? Please?', 'That\'s a Hudson. Four-six-four.'] });
    // big toys on the floor
    const floorToys = ['rocking_horse', 'dollhouse', 'tricycle', 'wagon_red', 'bicycle', 'teddy_bear', 'toy_wagon', 'toy_chest'];
    for (let i = 0; i < 6; i++) P(S, floorToys[i], cx - 8 + (i % 3) * 8, 1, 30 + Math.floor(i / 3) * 5, rng.int(0, 3), { tint: rng.pick(['#b3302a', '#2a4a8a', '#e0b030']) });
    // kites and a model plane from the ceiling
    for (let i = 0; i < 4; i++) { const kx = Math.round(X0 + 5 + i * (X1 - X0 - 10) / 3), kz = 10 + (i % 2) * 8; f.box(kx, 13, kz, 1, 1, 1, Mt(rng.pick(G.toys))); f.box(kx - 1, 12, kz, 3, 1, 1, Mt(rng.pick(G.toys))); f.box(kx, 11, kz, 1, 1, 1, Mt(rng.pick(G.toys))); }
    f.box(Math.round(cx + 5), 12, 28, 5, 1, 1, MAT.sign_red); f.box(Math.round(cx + 7), 12, 26, 1, 1, 5, MAT.sign_red); f.box(Math.round(cx + 5), 13, 28, 1, 1, 1, MAT.sign_red);
    vCounter(S, X1 - 12, Zb - 7, 8, 3, { base: MAT.wood_dark, top: MAT.wood_light }); P(S, 'cash_register', X1 - 9, 5, Zb - 5.5, 0);
    const clerk = stand(S, X1 - 8, Zb - 2.5, 0, 'counter', ['work'], { lines: ['Christmas layaway starts October first.', 'Careful with the switch, son.'] });
    const draper = stand(S, cx, 12.2, 2, 'look', ['work'], { lines: ['She\'ll do a scale sixty miles an hour. Watch the curve.'] });
    shopLamps(S, 'ceiling_lamp', 3);
    job(S, 'clerk', [clerk], ['9:00', '18:00'], { title: 'toy clerk' });
    job(S, 'proprietor', [draper, clerk], ['9:00', '18:00'], { outfit: 'shopkeeper', title: 'toymaker', age: [60, 75] });
    stockroom(S, { goods: G.toys, items: ['crate', 'crate_stack', 'toy_chest', 'rocking_horse'] });
  },
  window(S, a, c) {
    const f = S.f;
    f.walls(a + 1, 3, 1, Math.max(3, c - a - 2), 1, 3, MAT.iron);
    P(S, 'toy_train', (a + c) / 2, 3.2, 1.6, 1);
    P(S, 'teddy_bear', a + 1.5, 3, 3, 0); P(S, 'jack_in_the_box', c - 1.5, 3, 3, 0);
  },
  readables(S) { read(S, (S.X0 + S.X1) / 2, 6, 14, 'The train layout', 'JUNIPER BAY IN MINIATURE — built by E. Draper, 1946–1953\n\nThe station, the canning company, Whitcomb Point Light (it lights up), and a very small Founders Square.\nThe trains run every Saturday from ten to four.\n\nPLEASE DO NOT TOUCH THE LIGHTHOUSE. IT IS DELICATE. SO IS MR. DRAPER.'); },
};

// ---------------------------------------------------------------- Weiss Jewelers (1919)
TRADES.jeweler = {
  label: 'Jewelers', hours: ['9:30', '17:30'], front: 'Jewelry Store', back: 'Workshop',
  style: { floor: 'carpet_blue', wall: 'wallpaper_cream', wains: 'wood_panel', signBg: 'sign_black', signFg: 'sign_gold', frame: 'trim_black', awningMode: 'none', bulk: 'marble' },
  sign: () => ['WEISS JEWELERS', 'JEWELERS'], glass: () => ['WEISS JEWELERS', 'DIAMONDS - WATCHES - SILVER', 'SINCE 1919'],
  lore: () => 'Jacob Weiss sets the town\'s clocks by the station clock every morning at 8:59. He engraved the rings for today\'s wedding last night by lamplight.',
  fit(S) {
    const { f, b, Zb, X0, X1 } = S;
    const cx = (X0 + X1) / 2;
    // cases in a U
    for (const z of [12, 16, 20, 24]) { P(S, 'jewelry_case', X0 + 5, 1, z, 1); P(S, 'jewelry_case', S.X1 - 5, 1, z, 3); }
    for (const x of [cx - 3, cx + 1]) P(S, 'jewelry_case', x, 1, 28, 0);
    const c1 = stand(S, X0 + 2.5, 18, 1, 'counter', ['work'], { lines: ['Fourteen karat, engraved H.N. to R.B. — nine, twenty-six, fifty-three.'] });
    customer(S, X0 + 8.5, 16, 3); customer(S, cx, 25, 2);
    // clocks everywhere
    P(S, 'clock_grandfather', X0 + 1.5, 1, 6, 1); P(S, 'clock_grandfather', S.X1 - 1.5, 1, 6, 3);
    for (let z = 10; z < 28; z += 4) { P(S, 'clock_wall', X0 + 0.2, 9, z, 1); P(S, 'clock_wall', S.X1 - 0.2, 9, z + 2, 3); }
    // the watchmaker's bench at the back, the safe
    vCounter(S, Math.round(cx - 6), Zb - 4, 12, 3, { base: MAT.wood_dark, top: MAT.wood_light });
    P(S, 'lamp_desk', cx - 3, 5, Zb - 2.5, 0); P(S, 'stool_tall', cx - 3, 1, Zb - 6, 2);
    const watch = sit(S, cx - 3, Zb - 6, 2, 'microscope', ['work'], 0.7);
    P(S, 'bank_vault_door', S.X1 - 4, 1, Zb - 0.6, 0);
    shopLamps(S, 'chandelier', 2);
    job(S, 'jeweler', [c1, watch], ['9:30', '17:30'], { outfit: 'shopkeeper', title: 'jeweler', name: 'Jacob Weiss' });
    job(S, 'watchmaker', [watch], ['9:30', '17:30'], { title: 'watchmaker' });
    browse(S, cx, 14, 2); browse(S, cx + 3, 20, 3);
    // the street clock at the curb
    P(S, 'street_clock', S.W - 6, 0, -12, 0, { cat: 'far' });
    stockroom(S, { items: ['safe_small', 'crate_small', 'filing_cabinet'] });
  },
  window(S, a, c) { for (let x = a + 1.5; x < c - 1; x += 3) P(S, 'jewelry_case', x, 3, 2.3, 0); },
  readables(S) {
    const cx = (S.X0 + S.X1) / 2;
    read(S, cx - 3, 6, S.Zb - 3, 'Repair tickets', 'No. 5512 — Otto Lindqvist — Waltham railroad watch. "Loses 4 seconds a week. Unacceptable." — Regulated.\nNo. 5519 — Amos Fisk — keeper\'s chronometer, cleaned. "Salt air."\nNo. 5520 — Mrs. Hatch — Capt. Hatch\'s pocket watch. Not broken. "She just likes it to be looked at."');
    read(S, S.X0 + 5, 6, 18, 'Engraving order', 'Two wedding bands, 14k yellow gold.\nInside: "H.N. to R.B. — 9 · 26 · 53"\n\nThe groom asked for "Forever" as well. The bride\'s mother asked that it not be spelled wrong. It has been checked three times.');
  },
};

// ---------------------------------------------------------------- Bayside Savings & Loan
TRADES.bank_branch = {
  label: 'Savings & Loan', hours: ['9:00', '12:00'], front: 'Banking Room', back: 'Vault', upper: ['office', 'office'],
  style: { floor: 'floor_marble', wall: 'plaster_cream', wains: 'marble', signBg: 'sign_navy', signFg: 'sign_gold', frame: 'trim_dark', awningMode: 'none', bulk: 'granite', outer: 'limestone', trim: 'granite', pier: 'granite' },
  sign: () => ['BAYSIDE SAVINGS', 'BAYSIDE'], glass: () => ['BAYSIDE SAVINGS & LOAN', 'HOME LOANS - G.I. MORTGAGES', 'SATURDAY 9 TO 12'],
  lore: () => 'Founded in 1924 by the cannery workers\' building club, "so a man could own his own roof." The first mortgage it wrote is framed behind the tellers.',
  office: { name: 'BAYSIDE S & L', line2: 'MORTGAGE DEPT.', role: 'loan officer', room: 'Mortgage Department' },
  fit(S) {
    const { f, b, Zb, X0, X1 } = S;
    const cx = (X0 + X1) / 2;
    // teller line with bronze grilles
    const tz = Zb - 12;
    vCounter(S, X0 + 2, tz, X1 - X0 - 12, 3, { base: MAT.marble, top: MAT.granite, h: 4 });
    for (let x = X0 + 2; x < X1 - 10; x += 1) if (x % 6 !== 3 && x % 6 !== 4) f.box(x, 5, tz + 1, 1, 6, 1, MAT.trim_gold);
    f.box(X0 + 2, 11, tz, X1 - X0 - 12, 1, 3, MAT.wood_dark);
    const tellers = [];
    for (let x = X0 + 5; x < X1 - 11; x += 6) { tellers.push(stand(S, x - 1.5, tz + 5, 0, 'counter', ['work'])); customer(S, x - 1.5, tz - 2, 2, { lines: ['I\'d like to make a deposit to the Christmas Club.'] }); P(S, 'adding_machine', x - 1.5, 5, tz + 2, 2); }
    P(S, 'bank_vault_door', cx - 6, 1, Zb - 0.6, 0);
    // check-writing island, loan officer behind a rail
    vCounter(S, Math.round(cx - 3), 12, 6, 3, { base: MAT.marble, top: MAT.granite });
    P(S, 'flag_stand', X0 + 2, 1, 6, 1); P(S, 'clock_wall', cx, 12, tz - 0.2 + 3, 0);
    f.box(X0 + 1, 1, 20, 10, 2, 1, MAT.wood_dark);
    const loan = officeDesk(b, S.sales, X0 + 5, 1, 24, 1, { typewriter: false, act: 'write' });
    P(S, 'chair_wood', X0 + 9, 1, 24, 3);
    shopLamps(S, 'chandelier', 2);
    job(S, 'teller', [tellers[0]], ['9:00', '12:15'], { title: 'teller' });
    if (tellers[1]) job(S, 'teller', [tellers[1]], ['9:00', '12:15'], { sex: 'F', title: 'teller' });
    job(S, 'manager', [loan], ['9:00', '17:00'], { days: 'weekday', title: 'branch manager' });
    browse(S, cx, 10, 2, { act: 'write' });
    stockroom(S, { items: ['safe_small', 'filing_cabinet', 'crate_small'] });
  },
  window(S, a, c) { sign(S, 'SAVE FOR A RAINY DAY', (a + c) / 2, 6, 2.4, 0, { bg: '#1f2f5f', fg: '#f0ecdc', scale: 0.7 }); P(S, 'plant_pot', a + 1.5, 3, 2.3, 0); },
  readables(S) {
    read(S, (S.X0 + S.X1) / 2, 7, S.Zb - 11, 'Framed mortgage No. 1', 'BAYSIDE CO-OPERATIVE BANK — MORTGAGE No. 1\nMarch 3, 1924 — $2,400 at 5% over 15 years\nMortgagor: Stanislaw Kaminski, cannery, Line 2\nProperty: 11 Orchard Street, "a two-family house with a pear tree"\n\nPaid in full, March 1939. His grandson Stan is at St. Luke\'s today, waiting on a baby.');
    read(S, (S.X0 + S.X1) / 2, 5, 12, 'Rate card', 'PASSBOOK SAVINGS ..... 2 1/2%\nCHRISTMAS CLUB — 50 weeks, 50c to $5\nHOME LOANS — G.I. Bill mortgages available — 4%\n\nSaturday hours 9 to 12. Closed for the Mayor\'s address.');
  },
};

// ---------------------------------------------------------------- Silva Dress Shop
TRADES.dress = {
  label: 'Dress Shop', hours: ['9:00', '17:30'], front: 'Dress Salon', back: 'Sewing Room',
  style: { floor: 'carpet_rose', wall: 'wallpaper_teal', wains: 'trim_white', signBg: 'sign_black', signFg: 'sign_gold', frame: 'trim_teal', awning: ['awning_teal', 'canvas_white'] },
  sign: () => ['SILVA DRESS SHOP', 'DRESS SHOP'], glass: () => ['SILVA', 'DRESSES - GOWNS - ALTERATIONS'],
  lore: () => 'Maria Silva came from São Miguel in the Azores in 1923 and sewed in her kitchen for ten years before she could afford a window. Today she dressed four bridesmaids.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const cx = (X0 + X1) / 2;
    for (const [x, z, r] of [[X0 + 3, 10, 1], [X0 + 3, 18, 1], [X0 + 3, 26, 1], [cx, 14, 0], [cx, 22, 0]]) P(S, 'dress_rack', x, 1, z, r, { tint: rng.pick(['#b3302a', '#2a4a8a', '#d8a0b8', '#3a5a4a', '#e8e0d0', '#6a4a8a']) });
    for (const [x, z] of [[cx - 5, 30], [cx + 5, 30]]) P(S, 'mannequin', x, 1, z, 0, { tint: rng.pick(['#b3302a', '#1f2f5f', '#e8e0d0']) });
    // two fitting rooms at the back right
    for (let i = 0; i < 2; i++) {
      const fx = X1 - 7, fz = Zb - 16 + i * 8;
      f.box(fx, 1, fz, 1, 11, 7, MAT.trim_white); f.box(fx, 1, fz + 7, 7, 11, 1, MAT.trim_white); f.box(fx + 1, 11, fz, 6, 1, 7, MAT.trim_white);
      f.box(fx, 1, fz + 2, 1, 9, 3, MAT.velvet_red); f.carve(fx, 1, fz + 3, 1, 8, 1);
      f.box(X1 - 1, 2, fz + 2, 1, 7, 3, MAT.mirror);
    }
    // three-way mirror and the husbands' chair
    f.box(X1 - 1, 1, 8, 1, 10, 5, MAT.mirror); f.box(X1 - 3, 1, 7, 2, 10, 1, MAT.mirror); f.box(X1 - 3, 1, 13, 2, 10, 1, MAT.mirror);
    customer(S, X1 - 4, 10, 1, { lines: ['Is the hem right? Tell me the truth.'] });
    P(S, 'armchair', X0 + 8, 1, Zb - 4, 0, { tint: '#6a4a4a' });
    sit(S, X0 + 8, Zb - 4, 0, 'doze', ['shop'], 0.42, { label: 'Waiting for his wife', lines: ['Take your time, dear. I\'m fine. Really.'] });
    vCounter(S, Math.round(cx - 4), 6, 8, 3, { base: MAT.trim_white, top: MAT.glass }); P(S, 'cash_register', cx - 2, 5, 7.5, 0);
    const m = stand(S, cx, 10.5, 0, 'counter', ['work'], { lines: ['Four bridesmaids, four fittings, one morning. Never again. Until next Saturday.'] });
    const m2 = stand(S, X1 - 9, 12, 1, 'talk', ['work']);
    shopLamps(S, 'chandelier', 2);
    job(S, 'saleslady', [m, m2], ['9:00', '17:30'], { sex: 'F', title: 'dressmaker', name: 'Maria Silva' });
    job(S, 'saleslady', [m2, m], ['9:00', '17:30'], { sex: 'F', title: 'saleslady' });
    job(S, 'seamstress', [sit(S, 8, S.Zb + 6, 0, 'sew', ['work'], 0.45, { room: S.back })], ['9:00', '17:00'], { sex: 'F', title: 'seamstress' });
    P(S, 'sewing_machine', 8, 1, S.Zb + 3.6, 2);
    browse(S, X0 + 6, 14, 3); browse(S, cx + 3, 18, 2); browse(S, X0 + 6, 22, 3);
    stockroom(S, { goods: G.fabric, items: ['sewing_dummy', 'fabric_bolts', 'hatbox', 'crate'] });
  },
  window(S, a, c) { P(S, 'mannequin', a + 2.5, 3, 2.4, 0, { tint: '#b3302a' }); if (c - a > 8) P(S, 'mannequin', c - 2.5, 3, 2.4, 0, { tint: '#1f2f5f' }); },
  readables(S) { read(S, (S.X0 + S.X1) / 2, 6, 7, 'Alterations book', 'NOVAK WEDDING — BRIDESMAIDS (4), pink taffeta\n— Helen\'s cousin Dorota: let out 1 in. (don\'t say anything)\n— Irene Halloran\'s Peggy (junior bridesmaid): take up 2 in.\n— the Brennan girl: fine\n— Maria Castellano: fine; cried at the fitting because her brother is home\n\nMrs. Novak sewed the bride\'s gown herself — 212 seed pearls. I only pressed it. It is perfect. — M.S.'); },
};

// ---------------------------------------------------------------- Bishop Music Co.
TRADES.music = {
  label: 'Music', hours: ['9:00', '18:00'], front: 'Music Store', back: 'Stockroom', upper: ['office'],
  office: { name: 'BISHOP MUSIC', line2: 'LESSONS - PIANO - VIOLIN', role: 'music teacher', shift: ['9:00', '14:00'], room: 'Lesson Studio', dance: false },
  style: { floor: 'floor_walnut', wall: 'wallpaper_blue', wains: 'wood_panel', signBg: 'sign_black', signFg: 'sign_gold', frame: 'trim_dark' },
  sign: () => ['BISHOP MUSIC CO.', 'BISHOP MUSIC', 'BISHOP'], glass: () => ['BISHOP MUSIC CO.', 'RECORDS - PIANOS - INSTRUMENTS', 'SHEET MUSIC'],
  lore: () => 'Pianos, band instruments and the latest records. Earl Freeman bought his first real piano here on time payments in 1937; it took him four years.',
  fit(S) {
    const { f, b, Zb, X0, X1, rng } = S;
    const cx = (X0 + X1) / 2;
    const zL = Math.min(S.hallEnd - 1, Zb - 2);
    P(S, 'piano_upright', X0 + 1.6, 1, 10, 1); P(S, 'piano_upright', X0 + 1.6, 1, 18, 1); P(S, 'piano_bench', X0 + 4.2, 1, 10, 3);
    const player = sit(S, X0 + 4.2, 10, 3, 'piano', ['browse', 'shop'], 0.5, { label: 'Trying out a piano' });
    P(S, 'instrument_wall', S.X1 - 0.3, 5, 10, 3); P(S, 'instrument_wall', S.X1 - 0.3, 5, 17, 3);
    for (const [x, z] of [[cx - 3, 12], [cx + 3, 12], [cx - 3, 18], [cx + 3, 18]]) P(S, 'record_bins', x, 1, z, 0);
    P(S, 'book_rack', X0 + 3, 1, zL - 4, 1);
    P(S, 'guitar', S.X1 - 2, 1, 24, 3); P(S, 'fiddle', S.X1 - 1, 6, 24, 3); P(S, 'trumpet', S.X1 - 1, 6, 26, 3);
    // listening booth: a glass cubicle with a phonograph and a chair
    const bx0 = X1 - 10, bz0 = Zb - 13;
    f.box(bx0, 1, bz0, 8, 10, 1, MAT.glass); f.box(bx0, 1, bz0, 1, 10, 8, MAT.glass); f.box(bx0, 11, bz0, 8, 1, 8, MAT.wood_dark);
    f.box(bx0, 1, bz0, 1, 10, 1, MAT.wood_dark); f.box(bx0, 1, bz0 + 7, 1, 10, 1, MAT.wood_dark); f.box(bx0 + 7, 1, bz0, 1, 10, 1, MAT.wood_dark);
    f.carve(bx0, 1, bz0 + 3, 1, 9, 3);
    P(S, 'phonograph', X1 - 1.4, 1, bz0 + 5, 3); P(S, 'chair_wood', X1 - 5, 1, bz0 + 5, 1);
    sit(S, X1 - 5, bz0 + 5, 1, 'listen_sit', ['browse', 'shop'], 0.45, { label: 'In the listening booth', lines: ['"Vaya con Dios." Again. Just once more.'] });
    vCounter(S, Math.round(cx - 5), Zb - 6, 10, 3, { base: MAT.wood_dark, top: MAT.wood_light }); P(S, 'cash_register', cx - 3, 5, Zb - 4.5, 0); P(S, 'radio_table', cx + 2, 5, Zb - 4.5, 0);
    const clerk = stand(S, cx, Zb - 2, 0, 'counter', ['work'], { lines: ['Number one this week: Les Paul and Mary Ford.', 'Earl Freeman? Bought that Steinway on time. Four years. Never missed a payment.'] });
    shopLamps(S, 'ceiling_lamp', 3);
    job(S, 'clerk', [clerk], ['9:00', '18:00'], { title: 'music store clerk' });
    job(S, 'piano tuner', [stand(S, X0 + 4, 18, 3, 'piano', ['work']), clerk], ['10:00', '16:00'], { title: 'piano tuner' });
    for (const [x, z, r] of [[cx - 3, 15, 2], [cx + 3, 15, 2], [cx, 21, 0]]) browse(S, x, z, r);
    stockroom(S, { goods: G.records, items: ['crate', 'record_bins', 'crate_small'] });
    void player; void rng;
  },
  window(S, a, c) { P(S, 'guitar', a + 2, 3, 2.3, 0); P(S, 'trumpet', (a + c) / 2, 3.4, 2.3, 0); P(S, 'record_bins', c - 2, 3, 2.3, 0); },
  readables(S) { read(S, (S.X0 + S.X1) / 2, 6, S.Zb - 6, 'This week\'s top records', 'BISHOP\'S TOP TEN — week of Sept. 19, 1953\n1. Vaya Con Dios — Les Paul & Mary Ford\n2. You, You, You — The Ames Brothers\n3. Crying in the Chapel — June Valli\n4. No Other Love — Perry Como\n5. Ebb Tide — Frank Chacksfield\n6. Rags to Riches — Tony Bennett\n7. St. George and the Dragonet — Stan Freberg\n8. Dragnet — Ray Anthony\n9. Istanbul — The Four Lads\n10. Crazy Man, Crazy — Bill Haley & His Comets ("not for the parlor" — Mr. Bishop)'); },
};

// ---------------------------------------------------------------- anything else
TRADES.general = {
  label: 'Shop', hours: ['9:00', '18:00'],
  fit(S) {
    const rc = rightCounter(S, 8, S.Zb - 12, { goods: G.grocery });
    shelfWall(S, 'L', 5, Math.min(S.hallEnd - 1, S.Zb - 2), { goods: G.grocery });
    shopLamps(S);
    job(S, 'clerk', [rc.clerk], ['9:00', '18:00'], { outfit: 'shopkeeper', title: 'shopkeeper' });
    browse(S, S.X0 + 4, 14, 3); browse(S, (S.X0 + S.X1) / 2, 18, 2);
    stockroom(S);
  },
};

// ================================================================ Harbor Light Diner — a 1938 stainless dining car
TRADES.diner = { label: 'Diner', custom: buildDiner };
function buildDiner(ctx, lot, spec, T, rng) {
  const W = lot.w, D = lot.d;
  const b = new Building(ctx, { name: spec.name || 'Harbor Light Diner', kind: 'shop', lot, address: lot.address, established: 1924, hours: [5 * 60, 24 * 60], tags: ['shop', 'diner', 'eat_out'],
    lore: 'Yannis Papadakis opened a lunch counter here in 1924. The 1938 hurricane put six feet of water through it; that winter he bought a stainless-steel dining car from Worcester and set it in front of the old brick lunchroom, which became the kitchen. His son Nick runs the grill. Open 5 a.m. to midnight. Chowder on Fridays, pie always.' });
  const f = b.f;
  const S = { ctx, b, f, rng, T, spec, lot, W, D, cust: [], windows: [], X0: 2, X1: W - 2, Zb: D - 2, hallEnd: 0 };
  const CX0 = Math.round(W / 2) - 34, CX1 = CX0 + 68, CZ0 = 10, CZ1 = 32;
  const vx = Math.round(W / 2) - 4;                     // vestibule x vx..vx+7
  // ---- the lot: asphalt, a concrete apron, parking
  f.box(0, -1, 0, W, 1, D, MAT.asphalt_old);
  f.box(0, -1, 0, W, 1, 8, MAT.concrete);
  for (const x of [4, 13, W - 13]) f.box(x, -1, 12, 1, 1, 18, MAT.road_white);
  // ---- the kitchen annex: the original 1924 brick lunchroom
  const AX0 = CX0 + 16, AX1 = CX1 - 4, AZ0 = CZ1, AZ1 = CZ1 + 28;
  f.box(AX0, -1, AZ0, AX1 - AX0, 2, AZ1 - AZ0, MAT.stone_foundation);
  shell(f, AX0, 1, AZ0, AX1 - AX0, 14, AZ1 - AZ0, MAT.brick_red, MAT.tile_kitchen, 2);
  f.box(AX0 + 2, 1, AZ0 + 2, AX1 - AX0 - 4, 1, AZ1 - AZ0 - 4, MAT.floor_tile_white);
  f.box(AX0, 15, AZ0, AX1 - AX0, 1, AZ1 - AZ0, MAT.roof_tar); f.walls(AX0, 16, AZ0, AX1 - AX0, 2, AZ1 - AZ0, MAT.brick_red, 1);
  f.box(AX0 + 2, 14, AZ0 + 2, AX1 - AX0 - 4, 1, AZ1 - AZ0 - 4, MAT.ceiling);
  chimney(f, AX1 - 8, 16, AZ0 + 10, 3, 3, 8, MAT.brick_dark);
  f.box(AX0 + 10, 16, AZ0 + 14, 4, 3, 4, MAT.stainless);  // exhaust fan housing
  // high-water line on both side walls of the old lunchroom
  for (const [x, rot] of [[AX0, 3], [AX1 - 1, 1]]) {
    f.box(x, 7, AZ0, 1, 1, AZ1 - AZ0, MAT.trim_dark);
    b.prop(glassType('HIGH WATER - SEPT. 21, 1938', { px: 1 / 18, color: '#26262a' }), x + (rot === 3 ? -0.06 : 1.06), 7.3, AZ0 + 14, rot, {});
  }
  read(S, AX0 - 0.5, 7, AZ0 + 14, 'High Water — September 21, 1938', 'A black line painted on the old brick, six feet above the parking lot.\n\nOn the night of the hurricane the water came over the seawall and up Harbor Street "like a wall of slate," Nick Papadakis remembers. The lunch counter — this room — filled to the line. His father stood on the counter until three in the morning holding the cash box and a framed photograph of his mother.\n\nThe dining car arrived that winter.', { prompt: 'Read the high-water mark' });
  // 1924 datestone on the old lunchroom
  const Lf = f.faceFrame('left');
  Lf.box(D - AZ0 - 12, 3, AX0 - 1, 8, 5, 1, MAT.granite);
  Lf.text('1924', D - AZ0 - 8, 3, AX0 - 2, MAT.trim_cream, { align: 'center', font: 'small' });
  // ---- the dining car
  f.box(CX0, -1, CZ0, CX1 - CX0, 2, CZ1 - CZ0, MAT.stone_foundation);
  f.walls(CX0, 1, CZ0, CX1 - CX0, 16, CZ1 - CZ0, MAT.stainless, 1);
  f.walls(CX0 + 1, 2, CZ0 + 1, CX1 - CX0 - 2, 14, CZ1 - CZ0 - 2, MAT.enamel_white, 1);
  f.walls(CX0 + 1, 2, CZ0 + 1, CX1 - CX0 - 2, 4, CZ1 - CZ0 - 2, MAT.tile_mint, 1);
  f.box(CX0 + 1, 1, CZ0 + 1, CX1 - CX0 - 2, 1, CZ1 - CZ0 - 2, MAT.floor_tile_white);
  f.box(CX0 + 2, 1, CZ0 + 6, CX1 - CX0 - 4, 1, 3, MAT.floor_checker_red);
  f.box(CX0 + 1, 16, CZ0 + 1, CX1 - CX0 - 2, 1, CZ1 - CZ0 - 2, MAT.enamel_white);
  // facade bands: black skirt, fluted stainless, red enamel, the window band, chrome, the letter board
  const face = (z) => {
    f.box(CX0, 1, z, CX1 - CX0, 1, 1, MAT.enamel_black);
    for (let x = CX0; x < CX1; x += 2) f.box(x, 2, z, 1, 3, 1, MAT.chrome);
    f.box(CX0, 5, z, CX1 - CX0, 1, 1, MAT.counter_red);
    f.box(CX0, 12, z, CX1 - CX0, 1, 1, MAT.chrome);
    f.box(CX0, 13, z, CX1 - CX0, 3, 1, MAT.counter_red);
    f.box(CX0, 16, z, CX1 - CX0, 1, 1, MAT.chrome);
  };
  face(CZ0); face(CZ1 - 1);
  for (let x = CX0 + 2; x + 3 <= CX1 - 2; x += 4) {
    if (x + 3 > vx - 1 && x < vx + 9) continue;
    f.carve(x, 6, CZ0, 3, 6, 2); f.box(x, 6, CZ0, 3, 6, 1, MAT.glass); f.box(x, 9, CZ0, 3, 1, 1, MAT.chrome);
  }
  for (let x = CX0 + 4; x + 3 <= AX0 - 1; x += 4) { f.carve(x, 6, CZ1 - 2, 3, 6, 2); f.box(x, 6, CZ1 - 1, 3, 6, 1, MAT.glass); }
  // car ends: rounded-corner look + end windows
  for (const x of [CX0, CX1 - 1]) { f.box(x, 2, CZ0, 1, 14, 1, MAT.chrome); f.box(x, 2, CZ1 - 1, 1, 14, 1, MAT.chrome); f.carve(x - (x === CX0 ? 0 : 1), 6, CZ0 + 6, 2, 6, 10); f.box(x, 6, CZ0 + 6, 1, 6, 10, MAT.glass); f.box(x, 9, CZ0 + 6, 1, 1, 10, MAT.chrome); }
  b.prop(glassType('HARBOR LIGHT DINER', { font: 'big', px: 1 / 10, color: '#f4eee0' }), (CX0 + CX1) / 2, 13.1, CZ0 - 0.06, 0, {});
  b.prop(glassType('HARBOR LIGHT DINER', { font: 'big', px: 1 / 10, color: '#f4eee0' }), (CX0 + CX1) / 2, 13.1, CZ1 - 0.94, 2, {});
  // barrel roof with a raised monitor
  f.box(CX0 - 1, 17, CZ0 - 1, CX1 - CX0 + 2, 1, CZ1 - CZ0 + 2, MAT.steel_white);
  f.box(CX0, 18, CZ0 + 2, CX1 - CX0, 1, CZ1 - CZ0 - 4, MAT.steel_white);
  f.box(CX0 + 2, 19, CZ0 + 5, CX1 - CX0 - 4, 1, CZ1 - CZ0 - 10, MAT.steel_white);
  f.box(CX0 + 4, 20, CZ0 + 8, CX1 - CX0 - 8, 1, CZ1 - CZ0 - 16, MAT.steel_white);
  f.carve(CX0 + 3, 16, CZ0 + 4, CX1 - CX0 - 6, 2, CZ1 - CZ0 - 8); f.box(CX0 + 3, 16, CZ0 + 4, CX1 - CX0 - 6, 1, 1, MAT.chrome); f.box(CX0 + 3, 16, CZ1 - 5, CX1 - CX0 - 6, 1, 1, MAT.chrome);
  // the roof sign
  const sx = Math.round(W / 2);
  const sz = CZ0 + 11;
  for (const px of [sx - 18, sx + 17]) { f.box(px, 21, sz, 1, 4, 1, MAT.steel); f.box(px, 21, sz + 1, 1, 1, 3, MAT.steel); }
  f.box(sx - 26, 25, sz, 53, 17, 1, MAT.sign_navy);
  f.box(sx - 27, 24, sz, 55, 1, 1, MAT.chrome); f.box(sx - 27, 42, sz, 55, 1, 1, MAT.chrome); f.box(sx - 27, 24, sz, 1, 19, 1, MAT.chrome); f.box(sx + 27, 24, sz, 1, 19, 1, MAT.chrome);
  f.text('DINER', sx, 33, sz - 1, MAT.neon_red, { align: 'center', font: 'big' });
  f.text('HARBOR LIGHT', sx, 27, sz - 1, MAT.neon_blue, { align: 'center', font: 'small' });
  f.box(sx - 24, 32, sz - 1, 1, 1, 1, MAT.neon_yellow); f.box(sx + 23, 32, sz - 1, 1, 1, 1, MAT.neon_yellow);
  b.light(sx, 33, CZ0 + 7, { color: [1, 0.35, 0.25], radius: 12, mode: 'night' });
  // ---- vestibule
  f.box(vx, -1, 3, 8, 2, 8, MAT.stone_foundation);
  f.walls(vx, 1, 3, 8, 11, 7, MAT.stainless, 1);
  f.box(vx + 1, 1, 4, 6, 1, 6, MAT.floor_checker_red);
  f.carve(vx + 2, 2, 3, 4, 9, 1); f.carve(vx + 2, 2, CZ0, 4, 9, 2);
  f.box(vx, 5, 4, 1, 6, 5, MAT.glass); f.box(vx + 7, 5, 4, 1, 6, 5, MAT.glass);
  f.box(vx - 1, 12, 2, 10, 1, 8, MAT.steel_white); f.box(vx - 1, 11, 2, 10, 1, 1, MAT.chrome);
  b.prop(glassType('OPEN 5 A.M. TO MIDNIGHT', { px: 1 / 22, color: '#e8c060' }), vx + 4, 11.2, 2.94, 0, {});
  f.box(vx + 1, 0, 1, 6, 1, 2, MAT.granite);
  b.light(vx + 4, 12, 1.5, { mode: 'night', radius: 6, color: [1, 0.85, 0.6] });
  const vest = b.room('Vestibule', vx + 1, 2, 4, 6, 10, 6, { lightMode: 'always', kind: 'shop' });
  const car = b.room('Dining Car', CX0 + 2, 2, CZ0 + 2, CX1 - CX0 - 4, 14, CZ1 - CZ0 - 4, { lightMode: 'always', kind: 'shop', lightColor: [1, 0.93, 0.8], nav: [vx + 4, CZ0 + 6] });
  S.sales = car;
  b.entrance(vest, vx + 4, 2, 3, { outZ: -4, outY: 0, leaf: 'door_glass', tint: '#c9ccd0', main: true });
  b.door(vest, car, vx + 4, 2, CZ0 + 1, { leaf: false });
  // ---- inside the car: booths under the windows, the counter and its stools, the back bar
  const y = 2;
  const eat = [];
  for (let u = CX0 + 2; u + 7 <= vx; u += 7) eat.push(...vBooth(S, u, CZ0 + 2, { axis: 'x', depth: 4, y, room: car, seat: MAT.counter_teal, top: MAT.counter_formica, frame: MAT.chrome }));
  for (let u = vx + 8; u + 7 <= CX1 - 2; u += 7) eat.push(...vBooth(S, u, CZ0 + 2, { axis: 'x', depth: 4, y, room: car, seat: MAT.counter_teal, top: MAT.counter_formica, frame: MAT.chrome }));
  const kz = CZ0 + 10;                                    // counter z kz..kz+2
  f.box(CX0 + 6, y, kz, CX1 - CX0 - 8, 3, 3, MAT.stainless); f.box(CX0 + 6, y + 3, kz, CX1 - CX0 - 8, 1, 3, MAT.marble);
  f.box(CX0 + 6, y, kz - 1, CX1 - CX0 - 8, 1, 1, MAT.chrome);
  eat.push(...stoolRow(S, CX0 + 8, CX1 - 4, kz - 1.4, 2, { y, room: car, type: 'soda_stool', tint: '#2a8a7a', tags: ['eat_out'], act: 'eat', step: 3 }));
  for (let x = CX0 + 9; x < CX1 - 4; x += 6) { P(S, 'coffee_cup', x, y + 4, kz + 0.8, 0); if (rng.chance(0.5)) P(S, 'food_pie', x + 1.5, y + 4, kz + 1, 0); }
  P(S, 'cake_stand', CX0 + 12, y + 4, kz + 1.5, 0); P(S, 'cake_stand', CX1 - 10, y + 4, kz + 1.5, 0); P(S, 'cash_register', CX0 + 8, y + 4, kz + 1.5, 0);
  // back bar with griddle & hood, urns, pie case, mirror strip and menu boards
  const bz = CZ1 - 5, doorX = AX1 - 6;
  f.box(CX0 + 2, y, bz, doorX - 1 - CX0 - 2, 3, 3, MAT.stainless); f.box(CX0 + 2, y + 3, bz, doorX - 1 - CX0 - 2, 1, 3, MAT.stainless);
  f.box(doorX + 4, y, bz, CX1 - 2 - doorX - 4, 4, 3, MAT.stainless);
  const gx = CX0 + 18;
  f.box(gx, y + 3, bz, 12, 1, 3, MAT.enamel_black); f.box(gx - 1, y + 9, bz, 14, 2, 3, MAT.stainless); f.box(gx - 1, y + 11, bz + 1, 14, 3, 2, MAT.stainless);
  for (let i = 0; i < 4; i++) f.box(gx + 1 + i * 3, y + 4, bz + 1, 1, 1, 1, rng.pick([MAT.sign_yellow, MAT.terracotta, MAT.wood_light]));
  f.box(CX0 + 2, y + 6, CZ1 - 3, CX1 - CX0 - 4, 3, 1, MAT.mirror);
  P(S, 'coffee_urn', CX0 + 36, y + 4, bz + 1.5, 0); P(S, 'coffee_urn', CX0 + 39, y + 4, bz + 1.5, 0);
  P(S, 'pie_display', CX0 + 44, y + 4, bz + 1.5, 0); P(S, 'milk_bottles', CX0 + 48, y + 4, bz + 1.5, 0); P(S, 'bread_box', CX0 + 51, y + 4, bz + 1.5, 0);
  P(S, 'coffee_pot', gx + 13, y + 4, bz + 1.5, 0);
  for (const x of [CX0 + 10, CX0 + 40, CX0 + 58]) P(S, 'menu_board', x, y + 9, CZ1 - 2.6, 0);
  P(S, 'clock_wall', CX0 + 33, y + 11, CZ1 - 2.6, 0);
  P(S, 'jukebox', CX1 - 3.5, y, CZ0 + 8.5, 3);
  for (let x = CX0 + 10; x < CX1 - 6; x += 12) P(S, 'ceiling_lamp', x, 13, CZ0 + 11, 0);
  // staff spots
  const grill = stand(S, gx + 6, bz - 1.6, 2, 'cook', ['work'], { y, room: car, lines: ['Two over easy, hash, rye — working!', 'Chowder\'s Friday. Pie is always.'] });
  const counterIn = stand(S, CX0 + 30, kz + 4, 0, 'serve', ['work'], { y, room: car });
  const counterIn2 = stand(S, CX1 - 16, kz + 4, 0, 'serve', ['work'], { y, room: car });
  const floor = stand(S, CX0 + 24, CZ0 + 7, 0, 'serve', ['work'], { y, room: car, lines: ['Coffee, black, two sugars? I knew it.', 'Booths are for ladies and families, dear — try the counter.'] });
  const floor2 = stand(S, CX1 - 20, CZ0 + 7, 0, 'serve', ['work'], { y, room: car });
  // ---- the kitchen (old lunchroom)
  f.carve(doorX, y, CZ1 - 2, 4, 9, 4);
  const kitchen = b.room('Kitchen', AX0 + 2, y, AZ0 + 2, AX1 - AX0 - 4, 12, AZ1 - AZ0 - 4, { lightMode: 'always', kind: 'work' });
  b.door(car, kitchen, doorX + 2, y, CZ1, { leaf: 'door_wood', tint: '#c9ccd0' });
  const kb = AZ1 - 3.4;
  for (let i = 0; i < 3; i++) P(S, 'stove', AX0 + 5 + i * 4, y, kb, 0);
  P(S, 'kitchen_sink', AX0 + 19, y, kb, 0); P(S, 'kitchen_sink', AX0 + 22.5, y, kb, 0); P(S, 'dish_rack', AX0 + 22.5, y + 4.5, kb, 0);
  f.box(AX1 - 12, y, AZ1 - 11, 9, 11, 8, MAT.steel_white); f.box(AX1 - 12, y + 4, AZ1 - 11, 1, 2, 1, MAT.iron);
  vCounter(S, AX0 + 6, AZ0 + 9, 16, 4, { y, base: MAT.stainless, top: MAT.wood_pale });
  P(S, 'sack_pile', AX0 + 4, y, AZ0 + 4, 0); P(S, 'crate_stack', AX0 + 8, y, AZ0 + 3.5, 0);
  shelfWall(S, { axis: 'x', at: AX0 + 2, dir: 1 }, AZ0 + 14, AZ1 - 6, { goods: G.grocery, levels: [4, 7, 10], top: 11, cabinet: 1 });
  // Nick's desk in the corner
  P(S, 'desk_wood', AX1 - 5, y, AZ0 + 6, 3); P(S, 'chair_office', AX1 - 8, y, AZ0 + 6, 1); P(S, 'telephone', AX1 - 5, y + 3, AZ0 + 5, 3); P(S, 'newspaper_pile', AX1 - 5, y + 3, AZ0 + 7, 3);
  const stove = stand(S, AX0 + 9, kb - 2.6, 2, 'cook', ['work'], { y, room: kitchen });
  const prep = stand(S, AX0 + 14, AZ0 + 7.2, 2, 'counter', ['work'], { y, room: kitchen });
  const sink = stand(S, AX0 + 20.5, kb - 2.6, 2, 'wash', ['work'], { y, room: kitchen });
  const desk = sit(S, AX1 - 8, AZ0 + 6, 1, 'write', ['work'], 0.46, { y, room: kitchen });
  // back door & yard
  const Bk = f.faceFrame('back');
  doorway(Bk, W - (AX0 + 4) - 4, 2, D - AZ1, 4, 9, { frame: MAT.trim_dark, t: 2, step: false });
  const bdn = b.door(kitchen, null, AX0 + 6, y, AZ1 - 1, { leaf: 'door_wood', tint: '#6a5a44' });
  b.navPoint(0, AX0 + 6, 0, AZ1 + 4, [bdn]);
  f.box(AX0 + 3, 0, AZ1, 6, 1, 2, MAT.concrete);
  P(S, 'oil_drum', AX0 + 1, 0, AZ1 + 2, 0, { tint: '#6a6a64' }); P(S, 'oil_drum', AX0 - 1, 0, AZ1 + 2.5, 0, { tint: '#5a5a54' }); P(S, 'crate_stack', AX0 + 12, 0, AZ1 + 3, 0); P(S, 'milk_bottles', AX0 + 9, 0, AZ1 + 0.5, 0);
  P(S, 'truck_milk', AX1 + 8, 0, AZ1 + 6, 0, { tint: '#e8e4d8', cat: 'far' });
  // parked out front and the sandwich board
  P(S, 'car_sedan', 8.5, 0, 22, 2, { tint: rng.pick(CAR_TINTS), cat: 'far' }); P(S, 'truck_pickup', W - 8.5, 0, 22, 2, { tint: '#6a2a2a', cat: 'far' });
  P(S, 'sandwich_board', vx + 13, 0, 3, 0); P(S, 'newspaper_box', vx - 4, 0, 2, 0); P(S, 'bench_park', vx + 18, 0, 6, 2);
  // ---- jobs
  job(S, 'cook', [grill, stove, grill], ['5:00', '15:00'], { outfit: 'cook', title: 'grill cook' });
  job(S, 'cook', [grill, stove, prep], ['14:00', '23:59'], { outfit: 'cook', title: 'night cook' });
  job(S, 'waitress', [floor, counterIn, floor2], ['6:00', '16:00'], { outfit: 'waitress', sex: 'F', title: 'waitress' });
  job(S, 'waitress', [counterIn2, floor2, counterIn], ['11:00', '23:59'], { outfit: 'waitress', sex: 'F', title: 'waitress' });
  job(S, 'dishwasher', [sink, prep], ['7:00', '20:00'], { title: 'dishwasher' });
  void desk;
  customer(S, CX0 + 8, kz - 3.2, 2, { y, room: car, lines: ['Just coffee. And the pie. Which pie? Surprise me.'] });
  // ---- readables
  read(S, CX0 + 40, 11, CZ1 - 3, 'Bill of Fare', 'HARBOR LIGHT DINER — Open 5 A.M. to Midnight\n\nBREAKFAST ALL DAY\nTwo eggs any style, home fries, toast ..... 45\nHam & eggs ..... 75\nPancakes, a stack ..... 40\nCorned beef hash, poached egg ..... 65\n\nFROM THE GRILL\nHamburg, deluxe ..... 35\nCheeseburger ..... 40\nFried clam plate ..... 95\nFish & chips (Castellano haddock) ..... 85\nYankee pot roast ..... 90\n\nChowder — FRIDAYS ..... 25 cup / 40 bowl\nPIE — ALWAYS ..... 15 (Apple, Blueberry, Lemon Meringue, Custard, Boston Cream)\nCoffee ..... 10 — bottomless for Mr. Fisk, by order of the management.', { prompt: 'Read the menu' });
  read(S, CX0 + 8, 8, CZ1 - 3, 'Framed newspaper clipping', 'THE JUNIPER BAY COURIER — JULY 19, 1934\nLUNCH-MAN FEEDS STRIKERS "ON THE HOUSE"\n\nFor the eleventh straight morning, Yannis Papadakis of the Harbor Street lunch counter carried two urns of coffee and a basket of buttered rolls up Grand Avenue to the men on the City Hall steps. Asked by this reporter who was paying, Mr. Papadakis said, "Nobody. Put that in your paper."\n\nThe Harbor Canning Co. has since cancelled its account with the lunch counter.\n\n(Underneath, in Nick\'s hand: "The cannery came back in 1936. Pop charged them double for a year.")');
  read(S, CX0 + 58, 8, CZ1 - 3, 'Photograph, February 1939', 'THE DINING CAR ARRIVES\n\nA brand-new Worcester Lunch Car, No. 739, on a flatbed behind a Mack truck, inching down Harbor Street in the snow. Half the town is on the sidewalk. A small boy — Nick, fifteen — is sitting on the roof, which was not permitted.\n\nIn the background, the old brick lunchroom still has the water stain on it.');
  read(S, CX0 + 8, y + 5, kz + 1.5, 'The first dollar', 'A dollar bill in a dime-store frame taped beside the register:\n"FIRST DOLLAR — Y. PAPADAKIS — APRIL 2, 1924 — COFFEE & DOUGHNUTS FOR THE MEN OF ENGINE CO. No. 1"\n\nAnd a snapshot of a white village on a hillside: "Chios. Someday." It has been someday since 1920.');
  read(S, vx + 13, 3, 3, 'Sandwich board', 'TODAY — HARBOR DAYS SPECIAL\nCENTENNIAL PLATTER: fried clams, chowder, pie ..... $1.00\n\nCHOWDER ON FRIDAYS\nPIE ALWAYS\n\nOpen till midnight for the fireworks crowd.');
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  S.eat = eat;
  return b;
}

// ================================================================ The Clam Shack (waterfront, rebuilt 1939)
TRADES.seafood = { label: 'Clam Shack', custom: buildClamShack };
function buildClamShack(ctx, lot, spec, T, rng) {
  const W = lot.w, D = lot.d;
  const b = new Building(ctx, { name: spec.name || 'The Clam Shack', kind: 'shop', lot, address: lot.address, established: 1931, hours: [11 * 60, 21 * 60], tags: ['shop', 'seafood', 'eat_out'],
    lore: 'Fried clams in a paper boat, chowder in a paper cup, a picnic table and the whole harbor. The first shack went out on the tide in the \'38 hurricane with the fryers still hot; it was found three days later in Gannet Cove, right side up.' });
  const f = b.f;
  const S = { ctx, b, f, rng, T, spec, lot, W, D, cust: [], windows: [] };
  f.box(0, -1, 0, W, 1, D, MAT.gravel); f.box(0, -1, 0, W, 1, 4, MAT.concrete);
  const x0 = Math.round(W / 2) - 24, x1 = x0 + 48, z0 = 30, z1 = 62, H = 12;
  f.box(x0, -1, z0, x1 - x0, 1, z1 - z0, MAT.stone_foundation);
  shell(f, x0, 0, z0, x1 - x0, H, z1 - z0, MAT.shingle_wall, MAT.wood_panel_light, 2);
  f.box(x0 + 1, 0, z0 + 1, x1 - x0 - 2, 1, z1 - z0 - 2, MAT.floor_pine_z);
  f.box(x0 + 2, H - 1, z0 + 2, x1 - x0 - 4, 1, z1 - z0 - 4, MAT.wood_pale);
  f.gable(x0, H, z0, x1 - x0, z1 - z0, MAT.roof_shingle_gray, { axis: 'x', overhang: 2, gableMat: MAT.siding_white });
  for (const x of [x0, x1 - 1]) f.box(x, 0, z0 - 1, 1, H, 1, MAT.trim_white);
  // the CLAMS sign on the roof
  const cx = (x0 + x1) / 2;
  f.box(Math.round(cx) - 16, H + 8, z0 + 6, 33, 10, 1, MAT.sign_white); f.box(Math.round(cx) - 17, H + 7, z0 + 6, 35, 1, 1, MAT.sign_red); f.box(Math.round(cx) - 17, H + 18, z0 + 6, 35, 1, 1, MAT.sign_red);
  f.text('CLAMS', Math.round(cx), H + 10, z0 + 5, MAT.sign_red, { align: 'center', font: 'big' });
  for (const dx of [-10, 10]) f.box(Math.round(cx) + dx, H + 3, z0 + 6, 1, 5, 1, MAT.wood_gray);
  f.text('CHOWDER', Math.round(cx), 13, z0 - 1, MAT.sign_navy, { align: 'center', font: 'small' });
  // order windows with a shelf and an awning, a screen door between them
  const wins = [[x0 + 5, 10], [x1 - 15, 10]];
  for (const [wx, ww] of wins) { f.carve(wx, 4, z0, ww, 6, 2); f.box(wx - 1, 4, z0 - 2, ww + 2, 1, 2, MAT.wood_light); awning(f, wx - 1, 11, ww + 2, { depth: 3, z: z0, matA: MAT.awning_red, matB: MAT.canvas_white, stripe: 2 }); }
  const dx = Math.round(cx) - 2;
  f.carve(dx, 1, z0, 4, 9, 2); f.box(dx - 1, 0, z0 - 2, 6, 1, 2, MAT.wood_gray);
  sign(S, 'ORDER HERE', wins[0][0] + 5, 10.2, z0 - 0.2, 0, { bg: '#b3302a', fg: '#f0ecdc', scale: 0.7 }); sign(S, 'PICK UP', wins[1][0] + 5, 10.2, z0 - 0.2, 0, { bg: '#b3302a', fg: '#f0ecdc', scale: 0.7 });
  f.box(x0 + 18, 5, z0 - 1, 5, 4, 1, MAT.chalkboard);
  const room = b.room('Clam Shack', x0 + 2, 1, z0 + 2, x1 - x0 - 4, H - 2, z1 - z0 - 4, { lightMode: 'always', kind: 'shop', nav: [dx + 2, z0 + 5] });
  b.entrance(room, dx + 2, 1, z0, { outZ: z0 - 6, leaf: 'door_wood', tint: '#e8e0d0', main: true });
  // counter inside the windows, fryers & the chowder kettle along the back
  vCounter(S, x0 + 2, z0 + 4, x1 - x0 - 4, 2, { base: MAT.wood_mid, top: MAT.stainless });
  f.carve(dx, 1, z0 + 4, 4, 5, 2);
  const girl = stand(S, wins[0][0] + 5, z0 + 7.5, 0, 'counter', ['work'], { room, lines: ['Clam roll, chowder, a tonic. Pick up at the other window, hon.', 'Tartar sauce is in the jar. Don\'t let the gulls get it.'] });
  const girl2 = stand(S, wins[1][0] + 5, z0 + 7.5, 0, 'serve', ['work'], { room });
  const bz = z1 - 5;
  for (let x = x0 + 4; x < x0 + 20; x += 5) { f.box(x, 1, bz, 4, 4, 3, MAT.stainless); f.box(x + 1, 5, bz, 2, 1, 2, MAT.sand); }
  f.cylinder(x0 + 26, 1, bz + 1.5, 2, 5, MAT.stainless); f.box(x0 + 25, 6, bz + 1, 2, 1, 2, MAT.chalkboard);
  P(S, 'stove', x0 + 34, 1, bz + 1.4, 0); P(S, 'fridge', x1 - 5, 1, bz + 1.4, 0); P(S, 'sack_pile', x1 - 10, 1, bz, 0);
  for (let i = 0; i < 4; i++) P(S, 'fish_crate', x0 + 32 + i * 2.5, 1, z0 + 12, 0);
  const fry = stand(S, x0 + 11, bz - 2.2, 2, 'cook', ['work'], { room }), kettle = stand(S, x0 + 26, bz - 2.5, 2, 'cook', ['work'], { room });
  P(S, 'ceiling_lamp', cx - 10, 8, z0 + 14, 0); P(S, 'ceiling_lamp', cx + 10, 8, z0 + 14, 0);
  job(S, 'cook', [fry, kettle], ['11:00', '21:00'], { outfit: 'cook', title: 'fry cook' });
  job(S, 'cook', [kettle, fry], ['11:00', '21:00'], { outfit: 'cook', title: 'chowder cook' });
  job(S, 'counter girl', [girl, girl2], ['11:00', '21:00'], { outfit: 'waitress', sex: 'F', title: 'counter girl' });
  // picnic tables out front, with the harbor at their backs
  const out = b.entrances[0].node;
  const yard = b.navPoint(0, cx, 0, 14, [out]);
  const eat = [];
  for (let i = 0; i < 6; i++) {
    const tx = x0 - 2 + (i % 3) * 20 + (i >= 3 ? 8 : 0), tz = 8 + Math.floor(i / 3) * 11;
    if (tx < 4 || tx > W - 4) continue;
    P(S, 'picnic_table', tx, 0, tz, 0, {});
    for (const [ddx, dz, r] of [[-2.2, -3, 2], [2.2, -3, 2], [-2.2, 3, 0], [2.2, 3, 0]]) {
      const s = b.spot('sit', tx + ddx, 0, tz + dz, r, { room: 0, act: 'eat', tags: ['eat_out'], seat: 0.45, label: 'Eating fried clams at the Clam Shack' });
      ctx.nav.link(s.node, yard); eat.push(s);
    }
    if (rng.chance(0.5)) P(S, 'seagull', tx + 1, 0.8, tz, rng.int(0, 3));
  }
  P(S, 'trash_basket', cx - 12, 0, 20, 0); P(S, 'trash_basket', cx + 14, 0, 20, 0);
  P(S, 'lobster_trap_stack', x1 + 4, 0, z1 - 4, 0); P(S, 'oil_drum', x0 - 4, 0, z1 - 2, 0, { tint: '#6a6a64' });
  // the old piling with the high-water line
  f.box(x1 + 6, 0, z0 - 6, 2, 10, 2, MAT.wood_gray); f.box(x1 + 6, 7, z0 - 6, 2, 1, 2, MAT.trim_dark);
  read(S, x1 + 6, 7, z0 - 7, 'The old piling', 'All that is left of the first Clam Shack (1931–1938): one piling, with a black line painted at the height of the water on September 21, 1938.\n\nThe shack went out on the tide with the fryers still hot. It was found three days later in Gannet Cove, right side up. "The chowder was gone," says the owner. "The gulls, probably."\n\nREBUILT 1939.');
  read(S, x0 + 20, 7, z0 - 1.2, 'Chalkboard menu', 'FRIED CLAMS — whole bellies, in a boat ..... 65\nCLAM ROLL ..... 50\nCLAM CHOWDER — cup 20, pint 45\nLOBSTER ROLL ..... 95\nSTEAMERS & DRAWN BUTTER — quart ..... 60\nFRENCH FRIES ..... 15\nONION RINGS ..... 20\nTONIC — birch beer, root beer, orange ..... 10\n\nDON\'T FEED THE GULLS. THEY TALK.');
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  S.eat = eat;
  return b;
}

// ================================================================ special buildings
function sBase(ctx, lot, spec, o) {
  const b = new Building(ctx, { name: spec.name || o.name, kind: o.kind || spec.kind, lot, address: lot.address, established: spec.est || o.est || null, lore: o.lore, hours: o.hours.map(tm), tags: o.tags || [] });
  const rng = ctx.rng.fork('com:' + (spec.name || o.name) + ':' + lot.x + ',' + lot.z);
  return { ctx, b, f: b.f, rng, spec, lot, W: lot.w, D: lot.d, cust: [], windows: [], X0: 2, X1: lot.w - 2, Zb: lot.d - 2, hallEnd: 0 };
}

// ---------------------------------------------------------------- Bay Esso Service
function buildGasStation(ctx, lot, spec) {
  const S = sBase(ctx, lot, spec, { name: 'Bay Esso Service', hours: ['7:00', '21:00'], kind: 'gasstation', est: 1931, tags: ['gas'],
    lore: 'Gas, oil, lube and a free road map. Joe Medeiros\'s boy pumps the gas; Joe fixes whatever you drove in on. On Harbor Days the Mayor\'s Packard gets washed here for free.' });
  const { b, f, W, D, rng } = S;
  f.box(0, -1, 0, W, 1, D, MAT.concrete);
  f.box(0, -1, 80, W, 1, D - 80, MAT.grass);
  for (let x = 6; x < W - 4; x += 12) f.box(x, -1, 0, 6, 1, 1, MAT.curb);
  // ---- the station: white enamel box with an office and two service bays
  const x0 = 8, x1 = W - 8, z0 = 44, z1 = 76, H = 14;
  f.box(x0, -1, z0, x1 - x0, 1, z1 - z0, MAT.stone_foundation);
  shell(f, x0, 0, z0, x1 - x0, H, z1 - z0, MAT.enamel_white, MAT.tile_kitchen, 2);
  f.box(x0 + 1, 0, z0 + 1, x1 - x0 - 2, 1, z1 - z0 - 2, MAT.floor_concrete);
  f.box(x0 - 1, H, z0 - 2, x1 - x0 + 2, 1, z1 - z0 + 3, MAT.roof_tar);
  f.box(x0 - 1, H + 1, z0 - 2, x1 - x0 + 2, 5, 1, MAT.enamel_white); f.box(x0 - 1, H, z0 - 3, x1 - x0 + 2, 1, 1, MAT.sign_red); f.box(x0 - 1, H + 6, z0 - 3, x1 - x0 + 2, 1, 1, MAT.sign_blue);
  f.text('ESSO SERVICE', Math.round((x0 + x1) / 2), H + 1, z0 - 3, MAT.sign_blue, { align: 'center', font: 'small' });
  f.box(x0 + 2, H - 1, z0 + 2, x1 - x0 - 4, 1, z1 - z0 - 4, MAT.ceiling);
  f.box(x0, 1, z0 - 1, x1 - x0, 1, 1, MAT.sign_red);
  const ox1 = x0 + 22;                                      // office x0+2 .. ox1-1, partition at ox1
  wallZ(f, z0 + 2, z1 - 2, 1, ox1, H - 2, MAT.tile_kitchen, [{ at: z0 + 20, w: 4 }]);
  f.box(x0 + 2, 0, z0 + 2, ox1 - x0 - 2, 1, z1 - z0 - 4, MAT.floor_linoleum_green);
  // office front: door + big windows
  f.carve(x0 + 4, 1, z0, 4, 9, 2); f.carve(x0 + 10, 3, z0, 11, 7, 2); f.box(x0 + 10, 3, z0, 11, 7, 1, MAT.glass_shop); f.box(x0 + 15, 3, z0, 1, 7, 1, MAT.enamel_white);
  const office = b.room('Office', x0 + 2, 1, z0 + 2, ox1 - x0 - 2, H - 3, z1 - z0 - 4, { lightMode: 'always', kind: 'shop' });
  b.entrance(office, x0 + 6, 1, z0, { outZ: z0 - 8, leaf: 'door_glass', tint: '#e8e8e0', main: true });
  // service bays with open overhead doors
  const bay = b.room('Lube Bay', ox1 + 1, 1, z0 + 2, x1 - ox1 - 3, H - 3, z1 - z0 - 4, { lightMode: 'always', kind: 'work' });
  b.door(office, bay, ox1, 1, z0 + 22, { leaf: 'door_wood', axis: 'z' });
  const bw = Math.floor((x1 - ox1 - 5) / 2);
  for (const bx of [ox1 + 2, ox1 + 3 + bw]) { f.carve(bx, 1, z0, bw, 11, 2); f.box(bx, 11, z0 + 1, bw, 1, 1, MAT.steel); for (let y = 12; y < 13; y++) f.box(bx, y, z0 + 2, bw, 1, 8, MAT.steel_white); }
  const bayOut = b.navPoint(bay, ox1 + 2 + bw, 1, z0 + 3);
  const bayNode = b.navPoint(0, ox1 + 2 + bw, 0, z0 - 4, [bayOut]);
  linkToSidewalk(ctx, bayNode, 40);
  sign(S, 'LUBRICATION', ox1 + 2 + bw / 2, 12.2, z0 - 0.2, 0, { bg: '#1f2f5f', fg: '#f0ecdc', scale: 0.8 }); sign(S, 'WASHING', ox1 + 3 + bw * 1.5, 12.2, z0 - 0.2, 0, { bg: '#1f2f5f', fg: '#f0ecdc', scale: 0.8 });
  // the lift with a Buick up on it, the mechanic underneath
  const lx = ox1 + 2 + Math.round(bw / 2), lz = z0 + 16;
  f.box(lx, 1, lz, 1, 5, 1, MAT.steel); f.box(lx - 3, 6, lz - 9, 2, 1, 20, MAT.steel_red); f.box(lx + 2, 6, lz - 9, 2, 1, 20, MAT.steel_red);
  P(S, 'car_sedan', lx + 0.5, 7, lz + 1, 0, { tint: rng.pick(CAR_TINTS) });
  const mech = stand(S, lx + 0.5, lz - 3, 2, 'wrench', ['work'], { room: bay, lines: ['Muffler\'s shot. So\'s the tailpipe. So\'s the... you want the whole list?'] });
  P(S, 'car_wagon', ox1 + 3 + bw * 1.5, 1, z0 + 16, 0, { tint: '#8a6a4a' });
  const wash = stand(S, ox1 + 3 + bw * 1.5 + 5, z0 + 16, 3, 'wash', ['work'], { room: bay });
  P(S, 'tools_wall', x1 - 2.2, 6, z0 + 10, 3); P(S, 'tools_wall', x1 - 2.2, 6, z0 + 20, 3);
  vCounter(S, x1 - 6, z1 - 10, 3, 7, { base: MAT.wood_dark, top: MAT.wood_mid });
  P(S, 'oil_drum', x1 - 4, 1, z1 - 4, 0, { tint: '#b3302a' }); P(S, 'oil_drum', x1 - 6.5, 1, z1 - 4, 0, { tint: '#1f3a6e' });
  for (let i = 0; i < 4; i++) f.cylinder(ox1 + 4, 1 + i, z1 - 6, 1.6, 1, MAT.rubber_mat);
  // office: counter, register, maps, oil-can pyramid, cold drinks, chairs
  vCounter(S, x0 + 3, z0 + 10, 10, 3, { base: MAT.enamel_white, top: MAT.counter_red });
  P(S, 'cash_register', x0 + 6, 5, z0 + 11.5, 0); P(S, 'magazine_rack', x0 + 12, 1, z0 + 5, 0);
  for (let i = 0; i < 4; i++) for (let x = x0 + 16 + i; x < x0 + 22 - i; x++) f.box(x, 1 + i, z0 + 3, 1, 1, 1, (x + i) % 2 ? MAT.sign_red : MAT.sign_blue);
  f.box(x0 + 3, 1, z1 - 6, 4, 5, 3, MAT.sign_red); f.box(x0 + 3, 6, z1 - 6, 4, 1, 3, MAT.enamel_white);
  P(S, 'chair_wood', x0 + 14, 1, z0 + 20, 3); P(S, 'chair_wood', x0 + 14, 1, z0 + 24, 3); P(S, 'clock_wall', x0 + 10, 9, z1 - 2.6, 0); P(S, 'radio_table', x0 + 4, 5, z0 + 11.5, 0);
  const owner = stand(S, x0 + 8, z0 + 15, 0, 'counter', ['work'], { room: office, lines: ['Fill \'er up? Twenty-nine a gallon, and I\'ll check the oil.', 'Free road map with every fill. Boston\'s that way.'] });
  sit(S, x0 + 14, z0 + 20, 3, 'read', ['shop'], 0.45, { room: office });
  customer(S, x0 + 8, z0 + 7.5, 2, { room: office });
  P(S, 'ceiling_lamp', x0 + 12, 10, z0 + 16, 0); P(S, 'ceiling_lamp', ox1 + 12, 10, z0 + 16, 0); P(S, 'ceiling_lamp', ox1 + 24, 10, z0 + 16, 0);
  // restroom doors on the side (painted)
  const Rf = f.faceFrame('right');
  for (const [z, t] of [[z0 + 8, 'MEN'], [z0 + 16, 'LADIES']]) { Rf.box(z, 1, W - x1, 4, 9, 1, MAT.trim_green); Rf.prop(textSignType(t, { bg: '#f0ecdc', fg: '#1d1d22' }), z + 2, 10, W - x1 - 0.1, 0, { scale: 0.7 }); }
  // ---- the pump island
  const iz = 18;
  f.box(14, 0, iz, W - 28, 1, 4, MAT.concrete); f.box(14, 0, iz - 1, W - 28, 1, 1, MAT.sign_yellow); f.box(14, 0, iz + 4, W - 28, 1, 1, MAT.sign_yellow);
  const pumps = [];
  for (const px of [22, Math.round(W / 2) - 1, W - 24]) {
    f.box(px, 1, iz + 1, 2, 6, 2, MAT.enamel_white); f.box(px, 7, iz + 1, 2, 1, 2, MAT.sign_red); f.box(px, 8, iz + 1, 2, 2, 2, MAT.lamp_glass);
    f.box(px, 4, iz + 1, 2, 2, 1, MAT.clock_face); f.box(px + 2, 3, iz + 1, 1, 3, 1, MAT.trim_black);
    b.light(px + 1, 9, iz + 2, { mode: 'night', radius: 6, color: [1, 0.95, 0.85] });
    pumps.push(px);
  }
  for (const lx2 of [14, W - 15]) { f.box(lx2, 1, iz + 2, 1, 16, 1, MAT.steel_white); f.box(lx2 - 1, 17, iz + 1, 3, 1, 3, MAT.bulb_warm); b.light(lx2, 16, iz + 2, { mode: 'night', radius: 12 }); }
  const islandNode = b.navPoint(0, W / 2, 0, iz - 3, [b.entrances[0].node]);
  linkToSidewalk(ctx, islandNode, 40);
  const att1 = b.spot('stand', pumps[0] + 1, 0, iz - 1.5, 0, { room: 0, act: 'wait', tags: ['work'], lines: ['Fill \'er up, check the oil, wipe the glass. That\'s service.'] });
  const att2 = b.spot('stand', pumps[2] + 1, 0, iz + 6, 2, { room: 0, act: 'stand', tags: ['work'] });
  ctx.nav.link(att1.node, islandNode); ctx.nav.link(att2.node, islandNode);
  P(S, 'car_sedan', pumps[1] + 1, 0, iz - 4, 1, { tint: rng.pick(CAR_TINTS), cat: 'far' });
  const cust = b.spot('stand', pumps[1] + 6, 0, iz - 7, 3, { room: 0, act: 'wait', tags: ['shop'] }); ctx.nav.link(cust.node, islandNode);
  // air pump, tire display, the tall ESSO sign at the corner
  f.box(W - 8, 0, 8, 1, 5, 1, MAT.sign_red); f.box(W - 9, 5, 8, 3, 2, 1, MAT.sign_red);
  for (let i = 0; i < 3; i++) f.cylinder(W - 10, 1 + i * 2, 30, 1.6, 2, MAT.rubber_mat);
  f.box(9, 0, 4, 1, 24, 1, MAT.steel_white);
  f.box(1, 23, 4, 18, 9, 1, MAT.sign_red); f.box(2, 24, 3, 16, 7, 1, MAT.enamel_white);
  f.text('ESSO', 10, 25, 2, MAT.sign_blue, { align: 'center', font: 'small' });
  S.b.prop(glassType('ESSO', { color: '#1f3a8a', font: 'big', px: 1 / 9 }), 10, 25.4, 5.08, 2, {});
  b.light(10, 22, 2, { mode: 'night', radius: 8, color: [1, 0.95, 0.9] });
  // ---- jobs
  job(S, 'attendant', [att1, att2], ['7:00', '21:00'], { outfit: 'mechanic', title: 'gas station attendant', age: [17, 30] });
  job(S, 'mechanic', [mech, wash, mech], ['8:00', '17:00'], { outfit: 'mechanic', title: 'mechanic' });
  job(S, 'proprietor', [owner, mech], ['7:00', '18:00'], { outfit: 'mechanic', title: 'station owner' });
  read(S, x0 + 8, 6, z0 + 11, 'Price board', 'ESSO EXTRA ..... 29.9c gal.\nESSO REGULAR ..... 26.9c gal.\nMotor oil, qt. ..... 35c\nLubrication ..... $1.25\nWash ..... $1.50\nTire repair ..... 50c\n\nFREE: Air — Water — Road maps — Restrooms\n"Happy Motoring!"');
  read(S, x1 - 5, 7, z1 - 7, 'Work order', 'Sept. 26 — Mayor Pemberton\'s Packard — WASH & WAX, whitewalls — FOR THE PARADE. No charge (the Mayor insists on paying. Don\'t let him.)\nDr. Pike\'s Buick — brakes. He drives like a man delivering a baby, because he usually is.\nCastellano Fish truck — clutch. AGAIN.');
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// ---------------------------------------------------------------- Mill Street Garage (1921)
function buildGarage(ctx, lot, spec) {
  const S = sBase(ctx, lot, spec, { name: 'Mill Street Garage', hours: ['7:30', '17:00'], kind: 'garage', est: 1921,
    lore: 'Built in 1921 by Arthur Pelletier on the site of Dunmore\'s sawmill (1856–1911). The old millstone is set in the shop floor. Repairs, storage, towing, and the best-informed coffee pot in town.' });
  const { b, f, W, D, rng } = S;
  const bd = Math.min(D - 12, 90), H = 20;
  f.box(0, -1, 0, W, 1, D, MAT.concrete);
  f.box(0, -1, 0, W, 1, bd, MAT.stone_foundation);
  shell(f, 0, 0, 0, W, H, bd, MAT.brick_red, MAT.brick_red, 2);
  f.box(1, 0, 1, W - 2, 1, bd - 2, MAT.floor_concrete);
  f.box(0, H, 0, W, 1, bd, MAT.roof_tar);
  f.walls(0, H + 1, 0, W, 2, bd, MAT.brick_red, 1);
  // skylights and trusses
  for (let x = 12; x < W - 12; x += 24) f.box(x, H, 12, 8, 1, bd - 24, MAT.glass);
  for (let z = 10; z < bd - 4; z += 12) { f.box(2, H - 2, z, W - 4, 1, 1, MAT.wood_dark); for (let x = 8; x < W - 8; x += 16) f.box(x, H - 4, z, 1, 2, 1, MAT.wood_dark); }
  // ---- facade: two big arched openings, a storefront office between, stepped parapet with the name
  const doors = [[8, 22], [W - 30, 22]];
  for (const [dx, dw] of doors) {
    f.carve(dx, 1, 0, dw, 13, 2); f.box(dx - 1, 14, -1, dw + 2, 1, 1, MAT.limestone);
    f.box(dx, 14, 0, dw, 4, 1, MAT.glass); for (let x = dx + 3; x < dx + dw; x += 4) f.box(x, 14, 0, 1, 4, 1, MAT.iron); f.box(dx, 16, 0, dw, 1, 1, MAT.iron);
    f.box(dx, 13, 1, dw, 1, 3, MAT.steel);
  }
  const ox0 = 36, ox1 = W - 36;
  f.carve(ox0, 1, 0, ox1 - ox0, 11, 2); f.box(ox0, 1, 0, ox1 - ox0, 2, 1, MAT.wood_dark); f.box(ox0, 3, 0, ox1 - ox0, 8, 1, MAT.glass_shop);
  const odx = Math.round((ox0 + ox1) / 2) - 2; f.carve(odx, 1, 0, 4, 10, 2);
  for (let x = ox0 + 5; x < ox1 - 2; x += 6) if (Math.abs(x - odx - 2) > 3) f.box(x, 3, 0, 1, 8, 1, MAT.trim_green);
  f.box(ox0 - 1, 11, -1, ox1 - ox0 + 2, 1, 1, MAT.limestone);
  for (let y = 1; y < H; y += 2) { f.box(0, y, -1, 2, 1, 1, MAT.limestone); f.box(W - 2, y, -1, 2, 1, 1, MAT.limestone); }
  f.box(-1, H - 1, -2, W + 2, 1, 2, MAT.limestone);
  const pw = 76, px = Math.round(W / 2 - pw / 2);
  f.box(px, H + 1, -1, pw, 8, 2, MAT.brick_red); f.box(px - 1, H + 9, -2, pw + 2, 1, 3, MAT.limestone);
  f.text('MILL STREET GARAGE', Math.round(W / 2), H + 3, -2, MAT.limestone, { align: 'center', font: 'small' });
  f.box(Math.round(W / 2) - 8, H + 10, -1, 16, 6, 2, MAT.brick_red); f.box(Math.round(W / 2) - 9, H + 16, -2, 18, 1, 3, MAT.limestone);
  f.text('1921', Math.round(W / 2), H + 11, -2, MAT.limestone, { align: 'center', font: 'small' });
  sign(S, 'REPAIRS - STORAGE - TOWING', W / 2, 12.3, -1.2, 0, { bg: '#1f4a33', fg: '#e8c870', scale: 1.4 });
  // ---- rooms
  const officeZ1 = 20;
  wallX(f, ox0, ox1, 1, officeZ1, 12, MAT.wood_panel, [{ at: odx, w: 4 }]); wallZ(f, 2, officeZ1, 1, ox0 - 1, 12, MAT.wood_panel, [{ at: 10, w: 4 }]); wallZ(f, 2, officeZ1, 1, ox1, 12, MAT.wood_panel);
  f.box(ox0 - 1, 13, 2, ox1 - ox0 + 2, 1, officeZ1 - 1, MAT.wood_panel);
  const office = b.room('Office', ox0, 1, 2, ox1 - ox0, 12, officeZ1 - 2, { lightMode: 'always', kind: 'shop' });
  const shop = b.room('Repair Shop', 2, 1, officeZ1 + 1, W - 4, H - 2, bd - officeZ1 - 3, { lightMode: 'always', kind: 'work', ambient: 0.5 });
  const west = b.room('Repair Shop', 2, 1, 2, ox0 - 3, H - 2, officeZ1 - 1, { lightMode: 'always', kind: 'work', ambient: 0.5 });
  const east = b.room('Repair Shop', ox1 + 1, 1, 2, W - 3 - ox1, H - 2, officeZ1 - 1, { lightMode: 'always', kind: 'work', ambient: 0.5 });
  b.entrance(office, odx + 2, 1, 0, { outZ: -5, leaf: 'door_glass', tint: '#2a4a3a', main: true });
  for (const [dx, dw] of doors) { const r = dx < W / 2 ? west : east; const e = b.navPoint(r, dx + dw / 2, 1, 3); const o = b.navPoint(0, dx + dw / 2, 0, -5, [e]); b.entrances.push({ node: o, door: e, pos: b.m(dx + dw / 2, 0, -5), main: false }); }
  b.door(office, shop, odx + 2, 1, officeZ1, { leaf: 'door_wood' });
  b.door(west, shop, 18, 1, officeZ1, { leaf: false }); b.door(east, shop, W - 18, 1, officeZ1, { leaf: false });
  b.door(office, west, ox0 - 1, 1, 12, { leaf: 'door_wood', axis: 'z' });
  // ---- the shop floor: lifts, a car on the floor with a mechanic under it, benches, tires, the stove, the millstone
  const lifts = [[20, 44], [W - 22, 44]];
  for (const [lx, lz] of lifts) { f.box(lx, 1, lz, 1, 7, 1, MAT.steel); f.box(lx - 3, 8, lz - 9, 2, 1, 20, MAT.steel_red); f.box(lx + 2, 8, lz - 9, 2, 1, 20, MAT.steel_red); }
  P(S, 'car_sedan', lifts[0][0] + 0.5, 9, lifts[0][1] + 1, 0, { tint: '#2a2a2e' });
  P(S, 'truck_pickup', lifts[1][0] + 0.5, 9, lifts[1][1] + 1, 0, { tint: '#6a4a2a' });
  const cx = W / 2;
  P(S, 'car_coupe', cx - 12, 1, 56, 1, { tint: '#8a2a2a' });
  const under = spotAt(S, 'lie', cx - 12, 56, 0, 'under_car', ['work'], { room: shop, lines: ['Hand me the nine-sixteenths. No — the nine-sixteenths.', '(from under the car) Who\'s asking?'] });
  const lift1 = stand(S, lifts[0][0] + 0.5, lifts[0][1] - 2, 2, 'wrench', ['work'], { room: shop });
  const lift2 = stand(S, lifts[1][0] + 0.5, lifts[1][1] + 3, 0, 'wrench', ['work'], { room: shop });
  P(S, 'car_taxi', cx + 16, 1, 60, 2, {}); P(S, 'motorcycle', cx + 4, 1, 72, 1, { tint: '#2a2a2e' });
  // benches & tools along the back wall
  const bz = bd - 5;
  vCounter(S, 6, bz, W - 40, 3, { base: MAT.wood_dark, top: MAT.wood_mid });
  for (let x = 10; x < W - 36; x += 8) P(S, 'tools_wall', x, 6, bd - 2.2, 0);
  const bench = stand(S, 20, bz - 1.8, 2, 'hammer', ['work'], { room: shop });
  for (let i = 0; i < 6; i++) f.cylinder(W - 8, 1 + i * 2, bd - 10, 1.8, 2, MAT.rubber_mat);
  for (let i = 0; i < 3; i++) P(S, 'oil_drum', W - 14 + i * 2.4, 1, bd - 4, 0, { tint: rng.pick(['#b3302a', '#1f3a6e', '#2a4a3a']) });
  f.cylinder(cx + 6, 1, 32, 1.6, 5, MAT.iron); f.box(Math.round(cx + 5.5), 6, 31, 1, H - 7, 1, MAT.iron);
  P(S, 'chair_wood', cx + 9, 1, 30, 3); P(S, 'chair_folding', cx + 3, 1, 34, 1); P(S, 'coffee_pot', cx + 6, 6, 32, 0);
  sit(S, cx + 9, 30, 3, 'drink', ['shop'], 0.45, { room: shop, label: 'Waiting on a repair', lines: ['They said Tuesday. It\'s Saturday.'] });
  // the millstone in the floor
  f.cylinder(cx - 4, 0, 30, 4, 1, MAT.granite); f.box(Math.round(cx - 5), 0, 29, 2, 1, 2, MAT.iron);
  read(S, cx - 4, 1, 30, 'The millstone', 'DUNMORE\'S SAWMILL — 1856–1911\n\nThis stone turned the grist wheel of Robert Dunmore\'s mill, which cut the timbers for half the houses on Hillcrest Avenue and the first Whitcomb wharf. When the mill came down, Arthur Pelletier set the stone in the floor of his new garage "so the place would remember what it was."\n\nMechanics call it "the table." Don\'t put your coffee on it; Pelletier will know.', { prompt: 'Look at the millstone', r: 2.5 });
  // soda cooler, a calendar, the tow truck outside
  f.box(4, 1, officeZ1 + 3, 4, 5, 3, MAT.sign_red); f.box(4, 6, officeZ1 + 3, 4, 1, 3, MAT.enamel_white);
  P(S, 'truck_pickup', 18, 0, -8 + 0, 1, { tint: '#8a2a2a', cat: 'far' });
  for (let x = 12; x < W - 10; x += 26) P(S, 'ceiling_lamp', x, H - 5, 50, 0);
  // office furnishings
  const desk = officeDesk(b, office, ox0 + 8, 1, 10, 1, { typewriter: true, act: 'write' });
  vCounter(S, ox1 - 12, 8, 10, 3, { base: MAT.wood_dark, top: MAT.wood_light }); P(S, 'cash_register', ox1 - 8, 5, 9.5, 0);
  shelfWall(S, { axis: 'z', at: officeZ1 - 1, dir: -1 }, ox1 - 16, ox1 - 1, { goods: G.hardware, levels: [4, 7, 10], top: 11 });
  const parts = stand(S, ox1 - 7, 14, 0, 'counter', ['work'], { room: office });
  customer(S, ox1 - 7, 5, 2, { room: office });
  P(S, 'clock_wall', ox0 + 4, 9, officeZ1 - 0.6, 0); P(S, 'filing_cabinet', ox0 + 1.2, 1, 16, 1);
  job(S, 'mechanic', [under, lift1], ['7:30', '17:00'], { outfit: 'mechanic', title: 'mechanic' });
  job(S, 'mechanic', [lift1, lift2, bench], ['7:30', '17:00'], { outfit: 'mechanic', title: 'mechanic' });
  job(S, 'mechanic', [bench, lift2, under], ['7:30', '17:00'], { outfit: 'mechanic', title: 'mechanic\'s helper', age: [16, 25] });
  job(S, 'owner', [desk, parts], ['7:30', '17:00'], { outfit: 'mechanic', title: 'garage owner' });
  job(S, 'parts clerk', [parts, desk], ['8:00', '16:00'], { title: 'parts man' });
  read(S, ox1 - 7, 6, 8, 'Repair board', 'IN THE SHOP — SAT. SEPT. 26\n1. Dr. Pike\'s Buick — valve job. "Before Monday — babies."\n2. Kowalski delivery truck — springs\n3. Rourke (police car #2) — siren stuck ON. Fix first.\n4. Brennan (Capt.) — wedding car! Wash, polish, tin cans NOT to be tied on until 3 P.M.\n5. Miss Whitcomb\'s 1928 Packard — "just listen to it." (Nothing wrong. Never is.)');
  read(S, ox0 + 2, 7, 3, 'Photograph, 1921', 'THE MILL STREET GARAGE OPENS — June 1921\nArthur Pelletier in a white duster in front of the new building, with a Model T, a Stanley Steamer and a horse (not his) that wandered into the picture.\n\nThe gas pump in the photograph cost $180. It pumped until 1947.');
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// ---------------------------------------------------------------- The Blue Lantern — Earl Freeman's jazz club
function buildClub(ctx, lot, spec) {
  const S = sBase(ctx, lot, spec, { name: 'The Blue Lantern', hours: ['17:00', '24:00'], kind: 'club', est: 1946, tags: ['club', 'bar'],
    lore: 'Earl Freeman came home from the Army in 1946 and opened a room for music. It is named for the blue glass lantern his uncle Samuel hung by the barbershop\'s back door on Saturday nights in the 1920s, when the back room was open for music. Late set at nine.' });
  const { b, f, W, D, rng } = S;
  const bd = Math.min(D - 10, 86), H = 20;
  f.box(0, -1, 0, W, 1, bd, MAT.stone_foundation); f.box(0, -1, bd, W, 1, D - bd, MAT.gravel);
  shell(f, 0, 0, 0, W, H, bd, MAT.brick_dark, MAT.velvet_blue, 2);
  f.walls(1, 1, 1, W - 2, 4, bd - 2, MAT.wood_panel, 1);
  f.box(1, 0, 1, W - 2, 1, bd - 2, MAT.floor_walnut);
  f.box(0, H, 0, W, 1, bd, MAT.roof_tar); f.walls(0, H + 1, 0, W, 2, bd, MAT.brick_dark, 1);
  f.box(2, H - 1, 2, W - 4, 1, bd - 4, MAT.wood_dark);
  // ---- facade: black enamel band, porthole windows, the canopy and the neon
  f.box(0, 1, -1, W, 2, 1, MAT.enamel_black);
  f.box(2, 15, -1, W - 4, 10, 1, MAT.enamel_black);
  f.text('BLUE LANTERN', Math.round(W / 2), 16, -2, MAT.neon_blue, { align: 'center', font: 'big' });
  b.light(W / 2, 19, -4, { color: [0.35, 0.55, 1], radius: 12, mode: 'night' });
  for (const x of [8, 20, W - 23, W - 11]) { f.carve(x, 5, 0, 3, 3, 2); f.box(x, 5, 0, 3, 3, 1, MAT.glass_stained_blue); f.box(x - 1, 4, -1, 5, 1, 1, MAT.trim_gold); f.box(x - 1, 8, -1, 5, 1, 1, MAT.trim_gold); }
  const dx = Math.round(W / 2) - 2;
  f.carve(dx - 1, 1, 0, 6, 11, 3); f.box(dx - 1, 0, 0, 6, 1, 3, MAT.floor_marble);
  f.box(dx - 8, 12, -8, 20, 1, 9, MAT.enamel_black); f.box(dx - 8, 11, -8, 20, 1, 1, MAT.marquee_bulbs); f.box(dx - 8, 11, -8, 1, 1, 9, MAT.marquee_bulbs); f.box(dx + 11, 11, -8, 1, 1, 9, MAT.marquee_bulbs);
  f.box(dx - 8, 13, -8, 1, 3, 1, MAT.iron); f.box(dx + 11, 13, -8, 1, 3, 1, MAT.iron);
  b.light(dx + 2, 10, -5, { color: [1, 0.8, 0.5], radius: 7, mode: 'night' });
  // the neon lantern over the canopy
  const lx = dx + 2, ly = 26;
  f.box(lx - 3, ly, -1, 7, 11, 1, MAT.enamel_black);
  f.box(lx - 2, ly + 1, -2, 5, 1, 1, MAT.neon_blue); f.box(lx - 2, ly + 8, -2, 5, 1, 1, MAT.neon_blue); f.box(lx - 2, ly + 1, -2, 1, 8, 1, MAT.neon_blue); f.box(lx + 2, ly + 1, -2, 1, 8, 1, MAT.neon_blue);
  f.box(lx, ly + 9, -2, 1, 1, 1, MAT.neon_blue); f.box(lx, ly + 3, -2, 1, 3, 1, MAT.neon_yellow); f.box(lx - 1, ly + 4, -2, 3, 1, 1, MAT.neon_yellow);
  sign(S, 'EARL FREEMAN QUARTET', dx - 6, 6.5, -0.2, 0, { bg: '#1d1d22', fg: '#e8c870', scale: 0.55 });
  sign(S, 'LATE SET 9 PM', dx - 6, 5.2, -0.2, 0, { bg: '#1d1d22', fg: '#5ab0ff', scale: 0.55 });
  // ---- plan: foyer with coat check, the room, the stage, back rooms
  const fz1 = 12, stZ0 = 54, backZ = 68;
  wallX(f, 2, W - 2, 1, fz1, 12, MAT.wood_panel, [{ at: dx - 2, w: 8, h: 10 }]);
  wallX(f, 2, W - 2, 1, backZ, H - 2, MAT.velvet_blue, [{ at: 6, w: 4 }, { at: W - 10, w: 4 }]);
  const foyer = b.room('Foyer', 2, 1, 3, W - 4, 11, fz1 - 3, { lightMode: 'always', kind: 'shop', lightColor: [1, 0.8, 0.55], nav: [dx + 2, 6] });
  const room = b.room('Club Room', 2, 1, fz1 + 1, W - 4, H - 2, backZ - fz1 - 1, { lightMode: 'always', kind: 'shop', lightColor: [0.85, 0.8, 1.0], lightPower: 1.25, nav: [dx + 2, 30] });
  for (let z = fz1 + 6; z < 52; z += 12) for (const x of [W - 2.3]) { f.box(x < W / 2 ? 2 : W - 3, 9, Math.round(z), 1, 2, 1, MAT.lamp_glass); b.light(x < W / 2 ? 3 : W - 4, 9.5, z, { color: [1, 0.72, 0.45], radius: 6, mode: 'room', room }); }
  S.sales = room;
  b.entrance(foyer, dx + 2, 1, 3, { outZ: -5, leaf: 'door_wood', tint: '#1f2f5f', main: true });
  b.door(foyer, room, dx + 2, 1, fz1, { leaf: false });
  // coat check
  vCounter(S, 4, 4, 8, 3, { base: MAT.wood_dark, top: MAT.trim_gold });
  P(S, 'hat_rack_wall', 7, 7, 1.4, 2); P(S, 'coat_rack', 5, 1, 9.5, 0); P(S, 'coat_rack', 9, 1, 9.5, 0);
  const check = stand(S, 8, 8.5, 0, 'counter', ['work'], { room: foyer, lines: ['Hat and coat? That\'s your ticket, don\'t lose it.'] });
  // the bar along the left wall
  const z0 = fz1 + 3, z1 = stZ0 - 4;
  f.box(2, 1, z0, 2, 3, z1 - z0, MAT.wood_dark); f.box(2, 4, z0, 2, 1, z1 - z0, MAT.bar_top);
  for (let z = z0 + 1; z < z1 - 1; z++) if (rng.chance(0.8)) f.box(2, 5, z, 1, rng.int(1, 2), 1, Mt(rng.pick(G.bottles)));
  f.box(2, 7, z0, 1, 4, z1 - z0, MAT.mirror); f.box(2, 11, z0, 2, 1, z1 - z0, MAT.wood_dark);
  for (let z = z0 + 1; z < z1 - 1; z++) if (rng.chance(0.8)) f.box(2, 12, z, 1, 1, 1, Mt(rng.pick(G.bottles)));
  f.box(6, 1, z0, 3, 3, z1 - z0, MAT.wood_panel); f.box(6, 4, z0, 3, 1, z1 - z0, MAT.bar_top); f.box(9, 1, z0, 1, 1, z1 - z0, MAT.trim_gold);
  P(S, 'beer_taps', 7, 5, z0 + 5, 1); P(S, 'cash_register', 3, 5, z1 - 3, 1);
  const barStools = stoolRow(S, z0 + 2, z1 - 2, 11.2, 3, { axis: 'z', type: 'bar_stool', tags: ['bar', 'club'], act: 'drink', room, step: 3 });
  const tender = stand(S, 4.8, (z0 + z1) / 2, 1, 'bartend', ['work'], { room, lines: ['What\'ll it be? The house special\'s a Sidecar.', 'Earl goes on at nine. Get a table while you can.'] });
  // club tables
  const seats = [];
  const tables = [[26, 22], [40, 22], [54, 22], [68, 22], [33, 33], [47, 33], [61, 33], [75, 33]].filter(([x]) => x < W - 8);
  for (const [tx, tz] of tables.slice(0, 7)) {
    P(S, 'club_table', tx, 1, tz, 0); P(S, 'candles_pair', tx, 3.1, tz, 0);
    for (const [ox, oz, r] of [[-2.6, 0, 1], [2.6, 0, 3], [0, -2.6, 2]]) { P(S, 'chair_upholstered_dining', tx + ox, 1, tz + oz, r, { tint: '#2a3a6a' }); seats.push(sit(S, tx + ox, tz + oz, r, 'drink', ['club', 'bar'], 0.45, { room })); }
  }
  f.box(26, 0, 42, 44, 1, 11, MAT.floor_checker);
  // the stage
  const sx0 = 20, sx1 = W - 16;
  f.box(sx0, 1, stZ0, sx1 - sx0, 2, backZ - stZ0, MAT.stage_wood); f.box(sx0, 1, stZ0, sx1 - sx0, 2, 1, MAT.trim_gold);
  f.box(sx0 - 2, 1, backZ - 1, sx1 - sx0 + 4, H - 3, 1, MAT.velvet_blue);
  f.box(sx0 - 2, 1, stZ0, 2, H - 3, backZ - stZ0, MAT.velvet_blue); f.box(sx1, 1, stZ0, 2, H - 3, backZ - stZ0, MAT.velvet_blue);
  f.box(sx0 - 2, H - 4, stZ0, sx1 - sx0 + 4, 2, 1, MAT.velvet_blue);
  const sy = 3, mid = Math.round((sx0 + sx1) / 2);
  P(S, 'piano_grand', mid - 12, sy, 61, 1); P(S, 'piano_bench', mid - 7.5, sy, 61, 3);
  P(S, 'upright_bass_stand', mid - 2, sy, 64.5, 0); P(S, 'drum_kit', mid + 6, sy, 62, 0); P(S, 'mic_stand', mid + 1, sy, 57, 0); P(S, 'mic_stand', mid - 9, sy, 58, 0);
  P(S, 'stage_lights', sx0 + 2, sy, stZ0 + 1, 2); P(S, 'stage_lights', sx1 - 2, sy, stZ0 + 1, 2);
  P(S, 'music_stand', mid + 1, sy, 59.5, 0);
  const band = [
    b.spot('sit', mid - 7.5, sy, 61, 3, { room, act: 'piano', tags: ['club_band'], seat: 0.5, label: 'At the piano' }),
    b.spot('stand', mid - 2, sy, 63, 0, { room, act: 'bass', tags: ['club_band'], label: 'Playing bass' }),
    b.spot('sit', mid + 6, sy, 64.5, 0, { room, act: 'drum_sit', tags: ['club_band'], seat: 0.5, label: 'On drums' }),
    b.spot('stand', mid + 1, sy, 58.5, 0, { room, act: 'trumpet', tags: ['club_band'], label: 'Playing the horn' }),
  ];
  b.navPoint(room, mid, sy, stZ0 + 3, []);
  b.light(mid - 8, 14, 58, { color: [0.4, 0.55, 1], radius: 9, mode: 'room', room }); b.light(mid + 6, 14, 60, { color: [1, 0.7, 0.4], radius: 8, mode: 'room', room });
  for (const [tx, tz] of tables.slice(0, 7)) b.light(tx, 3.5, tz, { color: [1, 0.7, 0.4], radius: 3, mode: 'room', room });
  P(S, 'jukebox', W - 4, 1, 16, 3);
  const waitress = stand(S, 40, 28, 1, 'serve', ['work'], { room, lines: ['Cigarettes? Cigars? Two Sidecars coming up.'] });
  const door = stand(S, dx + 5, -2.5, 0, 'stand', ['work'], { room: 0, lines: ['Evening. Mind the step.'] });
  ctx.nav.link(door.node, b.entrances[0].node);
  // back rooms: Earl's office, the dressing room, stock
  const office = b.room('Office', 2, 1, backZ + 1, 26, H - 2, bd - backZ - 3, { lightMode: 'auto' });
  const dress = b.room('Dressing Room', 29, 1, backZ + 1, 30, H - 2, bd - backZ - 3, { lightMode: 'auto' });
  const stock = b.room('Stockroom', 60, 1, backZ + 1, W - 62, H - 2, bd - backZ - 3, { lightMode: 'auto' });
  wallZ(f, backZ + 1, bd - 2, 1, 28, H - 2, MAT.plaster_cream, [{ at: backZ + 3, w: 4 }]); wallZ(f, backZ + 1, bd - 2, 1, 59, H - 2, MAT.plaster_cream, [{ at: backZ + 3, w: 4 }]);
  b.door(room, office, 8, 1, backZ, {}); b.door(room, stock, W - 8, 1, backZ, {});
  b.door(office, dress, 28, 1, backZ + 5, { axis: 'z' }); b.door(dress, stock, 59, 1, backZ + 5, { axis: 'z' });
  const earlDesk = officeDesk(b, office, 12, 1, bd - 7, 2, { typewriter: false, act: 'write' });
  P(S, 'safe_small', 4, 1, bd - 4, 0); P(S, 'sofa', 18, 1, backZ + 4, 2, { tint: '#3a3a5a' }); P(S, 'piano_upright', 4, 1, backZ + 5, 1);
  P(S, 'photo_frames', 3, 7, backZ + 10, 1); P(S, 'portrait', 20, 8, bd - 2.6, 0);
  f.box(32, 1, bd - 4, 24, 3, 2, MAT.wood_dark); f.box(32, 4, bd - 3, 24, 5, 1, MAT.mirror);
  for (let x = 33; x < 56; x += 3) f.box(x, 9, bd - 3, 1, 1, 1, MAT.bulb_always);
  P(S, 'dress_rack', 44, 1, backZ + 5, 0, { tint: '#2a2a3a' }); P(S, 'chair_wood', 40, 1, bd - 6, 2); P(S, 'trumpet', 38, 4, bd - 4, 0);
  for (let i = 0; i < 5; i++) P(S, rng.pick(['crate_stack', 'barrel', 'crate', 'barrel_stack']), 64 + (i % 3) * 6, 1, backZ + 4 + Math.floor(i / 3) * 6, i);
  P(S, 'ceiling_lamp', 14, 14, backZ + 8, 0); P(S, 'ceiling_lamp', 44, 14, backZ + 8, 0); P(S, 'ceiling_lamp', 70, 14, backZ + 8, 0);
  // back door to the alley
  const Bk = f.faceFrame('back');
  doorway(Bk, W - 70 - 4, 1, D - bd, 4, 9, { frame: MAT.trim_dark, t: 2, step: false });
  const bdn = b.door(stock, null, 72, 1, bd - 1, { leaf: 'door_wood', tint: '#2a2a3a' });
  b.navPoint(0, 72, 0, bd + 4, [bdn]);
  P(S, 'oil_drum', 66, 0, bd + 2, 0, { tint: '#5a5a54' }); P(S, 'crate_stack', 78, 0, bd + 3, 0);
  // a blue glass lantern by the back door, lit at night
  f.box(74, 9, bd, 1, 1, 1, MAT.iron); f.box(74, 7, bd + 1, 1, 2, 1, MAT.glass_stained_blue); b.light(74.5, 8, bd + 1.5, { color: [0.3, 0.5, 1], radius: 4, mode: 'night' });
  // ---- jobs
  job(S, 'bandleader', [band[0], earlDesk, tender], ['17:00', '23:59'], { outfit: 'band', title: 'bandleader', name: 'Earl Freeman' });
  job(S, 'bartender', [tender], ['17:00', '23:59'], { title: 'bartender' });
  job(S, 'waitress', [waitress, check], ['18:00', '23:59'], { outfit: 'waitress', sex: 'F', title: 'cigarette girl' });
  job(S, 'hat check', [check], ['19:00', '23:59'], { sex: 'F', title: 'hat-check girl' });
  job(S, 'doorman', [door], ['19:00', '23:59'], { title: 'doorman' });
  S.eat = [...seats, ...barStools];
  // ---- readables
  read(S, dx - 6, 6, -0.4, 'Poster', 'TONIGHT — HARBOR DAYS — NO COVER\n\nTHE EARL FREEMAN QUARTET\nEarl Freeman, piano — Lonnie Pierce, bass — "Sticks" Medeiros, drums\nand from Providence, Cyrus Hale, tenor saxophone\n\nFirst set 8 — Late set 9 till they stop\n"Bring someone you like."', { prompt: 'Read the poster' });
  read(S, mid - 7.5, 5, 61, 'Set list, taped to the piano', 'LATE SET\nPerdido\nMood Indigo\nNow\'s the Time (Cy)\nBody and Soul\nHarbor Lights (for the Mayor, who won\'t come)\nA Night in Tunisia\nSatin Doll\n—\nIf Ruth comes by: Summertime. Ask her. Don\'t let her say no.');
  read(S, 3, 7, backZ + 10, 'Photographs on the office wall', 'FORT HUACHUCA, ARIZONA, 1943 — the 92nd Division dance band; Earl at the piano, nineteen years old.\n\nTHE HI-HAT, BOSTON, 1947 — Earl sitting in with a band whose leader has signed the photo "to the kid from Juniper Bay — you\'ll do."\n\nAND a snapshot, very worn: a blue glass lantern hanging by a back door on Market Street, 1927.');
  read(S, 20, 8, bd - 3, 'A letter in the desk', 'Juniper Bay, May 1946\nEarl — Pop always said the back room was the best part of the shop. You go on and make a whole house of it. I put the old lantern in the box. Hang it where people can see it from the street.\nYour cousin, Marcus\n\nP.S. Ruth says she\'ll sing on Saturdays when the choir lets her. The choir never lets her.');
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}

// ---------------------------------------------------------------- Harbor Lanes (1948)
function buildBowling(ctx, lot, spec) {
  const S = sBase(ctx, lot, spec, { name: 'Harbor Lanes', hours: ['10:00', '24:00'], kind: 'bowling', est: 1948, tags: ['bowling'],
    lore: 'Six lanes, opened in 1948 in the old Bayside Ice skating barn. The pinboys are high-school kids at a dime a line. League night is Tuesday; Saturday is for everybody.' });
  const { b, f, W, D, rng } = S;
  const bd = Math.min(D - 6, 90), H = 22;
  f.box(0, -1, 0, W, 1, bd, MAT.stone_foundation); f.box(0, -1, bd, W, 1, D - bd, MAT.gravel);
  shell(f, 0, 0, 0, W, H, bd, MAT.stucco_cream, MAT.plaster_white, 2);
  f.walls(1, 1, 1, W - 2, 4, bd - 2, MAT.wood_panel_light, 1);
  f.box(1, 0, 1, W - 2, 1, bd - 2, MAT.floor_linoleum_green);
  f.box(0, H, 0, W, 1, bd, MAT.roof_tar); f.walls(0, H + 1, 0, W, 2, bd, MAT.stucco_cream, 1);
  f.box(2, H - 1, 2, W - 4, 1, bd - 4, MAT.ceiling);
  // ---- streamline facade: teal bands, glass block, the big neon sign and a giant pin
  f.box(0, 1, -1, W, 1, 1, MAT.stucco_teal); f.box(0, 13, -1, W, 1, 1, MAT.stucco_teal); f.box(0, 15, -1, W, 1, 1, MAT.stucco_teal);
  for (let x = 6; x < 96; x += 14) { f.carve(x, 4, 0, 8, 7, 2); f.box(x, 4, 0, 8, 7, 1, MAT.glass_green); }
  f.box(2, 16, -1, W - 4, 9, 1, MAT.stucco_white);
  f.text('HARBOR LANES', 58, 17, -2, MAT.neon_red, { align: 'center', font: 'big' });
  f.text('BOWLING', W - 30, 18, -2, MAT.neon_blue, { align: 'center', font: 'small' });
  const pinX = W - 12;
  f.box(pinX - 2, H + 1, 2, 5, 2, 3, MAT.enamel_white); f.box(pinX - 1, H + 3, 2, 3, 3, 3, MAT.enamel_white); f.box(pinX - 2, H + 6, 2, 5, 5, 3, MAT.enamel_white);
  f.box(pinX - 1, H + 11, 2, 3, 3, 3, MAT.enamel_white); f.box(pinX - 1, H + 7, 1, 3, 1, 1, MAT.neon_red); f.box(pinX - 1, H + 9, 1, 3, 1, 1, MAT.neon_red); f.box(pinX, H + 14, 3, 1, 1, 1, MAT.enamel_white);
  b.light(58, 20, -4, { color: [1, 0.35, 0.3], radius: 12, mode: 'night' });
  // entrance with a rounded canopy
  const ex = W - 30;
  f.carve(ex, 1, 0, 6, 10, 2); f.box(ex - 1, 0, -1, 8, 1, 1, MAT.floor_terrazzo);
  f.box(ex - 6, 11, -6, 18, 1, 6, MAT.stucco_teal); f.box(ex - 6, 10, -6, 18, 1, 1, MAT.chrome);
  // ---- the lanes (along x), pins at the left end, the approach at the right
  const laneZ = (i) => 34 + 9 * i;
  const pitX0 = 3, pinX0 = 8, laneX0 = 14, foul = 78, appX1 = 92, setX1 = 104;
  const bowl = [], sitters = [], pinboys = [];
  const lanesRoom = b.room('Lanes', 2, 1, 32, setX1 - 2, H - 2, bd - 34, { lightMode: 'always', kind: 'shop', lightColor: [1, 0.96, 0.88], nav: [setX1 - 4, 60] });
  const lounge = b.room('Lounge', 2, 1, 2, setX1 - 2, H - 2, 29, { lightMode: 'always', kind: 'shop', lightColor: [1, 0.88, 0.7] });
  const lobby = b.room('Lobby', setX1 + 1, 1, 2, W - setX1 - 3, H - 2, bd - 4, { lightMode: 'always', kind: 'shop', nav: [ex + 3, 8] });
  S.sales = lanesRoom;
  b.entrance(lobby, ex + 3, 1, 0, { outZ: -6, leaf: 'door_glass', tint: '#c9ccd0', main: true, width: 4 });
  for (const z of [10, 24]) b.door(lounge, lobby, setX1 + 0.5, 1, z, { leaf: false, axis: 'z' });
  for (const z of [44, 70]) b.door(lanesRoom, lobby, setX1 + 0.5, 1, z, { leaf: false, axis: 'z' });
  for (const x of [60, 96]) b.door(lounge, lanesRoom, x, 1, 31.5, { leaf: false });
  f.box(2, 1, 31, 88, 2, 1, MAT.wood_dark); f.box(2, 3, 31, 88, 1, 1, MAT.trim_gold);   // rail between the lanes and the lounge
  for (let i = 0; i < 6; i++) {
    const z = laneZ(i);
    f.box(laneX0, 0, z + 1, foul - laneX0, 1, 5, MAT.bowling_lane); f.box(pinX0, 0, z + 1, laneX0 - pinX0, 1, 5, MAT.bowling_lane);
    f.box(foul, 0, z + 1, appX1 - foul, 1, 5, MAT.floor_pine_z); f.box(foul, 0, z + 1, 1, 1, 5, MAT.trim_black);
    for (let a = foul - 14; a < foul - 10; a++) f.box(a, 0, z + 3, 1, 1, 1, MAT.trim_dark);
    for (const gz of [z, z + 6]) { f.carve(laneX0 - 6, 0, gz, foul - laneX0 + 6, 1, 1); f.box(laneX0 - 6, -1, gz, foul - laneX0 + 6, 1, 1, MAT.trim_dark); }
    f.box(laneX0, 1, z + 7, appX1 - laneX0, 1, 2, MAT.wood_dark);
    f.carve(pitX0, 0, z, pinX0 - pitX0, 1, 9); f.box(pitX0, -1, z, pinX0 - pitX0, 1, 9, MAT.rubber_mat);
    P(S, 'bowling_pins', pinX0 + 3, 1, z + 3.5, 1);
    f.box(pinX0 - 1, 7, z, laneX0 - pinX0 + 3, 5, 9, MAT.wood_panel);
    sign(S, String(i + 1), laneX0 + 2.1, 8.5, z + 3.5, 1, { bg: '#1f2f5f', fg: '#f0ecdc', scale: 1.4 });
    b.light(pinX0 + 3, 6, z + 3.5, { color: [1, 0.95, 0.85], radius: 5, mode: 'room', room: lanesRoom });
    f.box(laneX0 + 4, H - 2, z + 3, foul - laneX0 - 8, 1, 1, MAT.bulb_always);
    P(S, 'ball_return', appX1 - 3, 1, z + 7.5, 1);
    // the bowler on the approach, a friend waiting on the settee, the scorer
    bowl.push(b.spot('stand', appX1 - 6, 1, z + 3.5, 3, { room: lanesRoom, act: 'bowl', tags: ['bowling'], label: `Bowling on lane ${i + 1}` }));
    P(S, 'loveseat', setX1 - 3, 1, z + 3.5, 3, { tint: rng.pick(['#b3302a', '#2a6a6a', '#e0b030']) });
    sitters.push(b.spot('sit', setX1 - 3, 1, z + 2.2, 3, { room: lanesRoom, act: 'talk_sit', tags: ['bowling'], seat: 0.42 }));
    sitters.push(b.spot('sit', setX1 - 3, 1, z + 4.8, 3, { room: lanesRoom, act: 'watch', tags: ['bowling'], seat: 0.42 }));
    // pinboy on his perch behind the pit
    f.box(pitX0 - 1, 2, z + 2, 1, 1, 5, MAT.wood_mid);
    if (i % 3 === 0) pinboys.push(b.spot('sit', pitX0 - 0.5, 1, z + 4.5, 1, { room: lanesRoom, act: 'sit', tags: ['work'], seat: 0.5 }));
  }
  // score tables at the approach
  for (let i = 0; i < 3; i++) {
    const z = laneZ(i * 2) + 8;
    f.box(appX1 + 2, 1, z - 1, 3, 3, 3, MAT.wood_dark); f.box(appX1 + 2, 4, z - 1, 3, 1, 3, MAT.counter_formica);
    P(S, 'stool_tall', appX1 + 6, 1, z + 0.5, 3); sitters.push(b.spot('sit', appX1 + 6, 1, z + 0.5, 3, { room: lanesRoom, act: 'write', tags: ['bowling'], seat: 0.7, label: 'Keeping score' }));
  }
  for (let i = 0; i < 3; i++) P(S, 'bowling_ball_rack', appX1 + 3, 1, 36 + i * 20, 3);
  // ---- lounge: snack bar along the front, tables, pinball, the trophy case
  const sbx0 = 58, sbx1 = 100;
  f.box(sbx0, 1, 3, sbx1 - sbx0, 4, 2, MAT.stainless); P(S, 'coffee_urn', sbx0 + 6, 5, 4, 2); P(S, 'popcorn_machine', sbx0 + 14, 5, 4, 2); P(S, 'pie_display', sbx0 + 22, 5, 4, 2);
  f.box(sbx0, 1, 9, sbx1 - sbx0, 3, 2, MAT.enamel_white); f.box(sbx0, 4, 9, sbx1 - sbx0, 1, 2, MAT.counter_red);
  const snack = stoolRow(S, sbx0 + 2, sbx1 - 2, 12.5, 0, { type: 'soda_stool', tint: '#b3302a', tags: ['eat_out', 'bowling'], act: 'eat', room: lounge, step: 3 });
  const snackMan = stand(S, (sbx0 + sbx1) / 2, 6.5, 2, 'serve', ['work'], { room: lounge, lines: ['Hot dog and a birch beer. Mustard?', 'Lane four\'s open in ten minutes.'] });
  const loungeSeats = [];
  for (const [tx, tz] of [[20, 14], [32, 14], [44, 14], [26, 24], [38, 24], [70, 22], [84, 22]]) {
    P(S, 'table_round', tx, 1, tz, 0);
    for (const [ox, r] of [[-2.6, 1], [2.6, 3]]) { P(S, 'chair_kitchen', tx + ox, 1, tz, r, { tint: '#2a6a6a' }); loungeSeats.push(sit(S, tx + ox, tz, r, 'talk_sit', ['bowling', 'eat_out'], 0.45, { room: lounge })); }
  }
  P(S, 'pinball_machine', 4, 1, 8, 1); P(S, 'pinball_machine', 4, 1, 14, 1); P(S, 'jukebox', 4, 1, 22, 1);
  P(S, 'trophy_case', 14, 1, 3.5, 0); P(S, 'trophy_case', 30, 1, 3.5, 0);
  // ---- lobby: the desk with shoe cubbies, lockers, benches, the manager's office
  vCounter(S, setX1 + 6, 16, 3, 24, { base: MAT.wood_dark, top: MAT.counter_formica });
  shelfWall(S, { axis: 'x', at: setX1 + 1, dir: 1 }, 14, 42, { goods: G.boxes, levels: [4, 6, 8, 10], top: 11, depth: 2, seg: 1, gap: 0.02, cabinet: 1 });
  P(S, 'cash_register', setX1 + 7.5, 5, 20, 1);
  const desk = stand(S, setX1 + 4.2, 28, 1, 'counter', ['work'], { room: lobby, lines: ['Shoes are a dime. What size? Don\'t tell me, I can tell.', 'Two strings for fifty cents, Saturday rate.'] });
  customer(S, setX1 + 11.5, 26, 3, { room: lobby });
  P(S, 'lockers', W - 4, 1, 50, 3); P(S, 'lockers', W - 4, 1, 55, 3);
  for (const z of [8, 60, 70]) P(S, 'bench_park', W - 6, 1, z, 3);
  P(S, 'bowling_ball_rack', W - 4, 1, 40, 3); P(S, 'office_water_cooler', setX1 + 4, 1, 60, 1);
  const office = b.room('Office', setX1 + 1, 1, bd - 16, 20, 12, 14, { lightMode: 'auto' });
  wallX(f, setX1 + 1, setX1 + 22, 1, bd - 17, 13, MAT.wood_panel, [{ at: setX1 + 14, w: 4 }]); wallZ(f, bd - 17, bd - 2, 1, setX1 + 21, 13, MAT.wood_panel);
  b.door(lobby, office, setX1 + 16, 1, bd - 17, {});
  const mgr = officeDesk(b, office, setX1 + 8, 1, bd - 8, 0, { typewriter: true, act: 'write' });
  for (let x = 12; x < W - 10; x += 22) { P(S, 'ceiling_lamp', x, H - 4, 16, 0); }
  // ---- jobs
  job(S, 'desk clerk', [desk], ['10:00', '23:59'], { title: 'lanes desk clerk' });
  job(S, 'counterman', [snackMan], ['11:00', '23:00'], { outfit: 'cook', title: 'snack bar counterman' });
  for (const p of pinboys) job(S, 'pinsetter', [p], ['12:00', '23:30'], { title: 'pinboy', age: [14, 19], sex: 'M' });
  job(S, 'manager', [mgr, desk], ['10:00', '18:00'], { title: 'manager' });
  S.eat = snack;
  // ---- readables
  read(S, 22, 7, 3.2, 'Trophy case', 'HARBOR LANES FALL LEAGUE — standings, Sept. 22, 1953\n1. Cannery Keglers ..... 14–2\n2. Engine Co. No. 1 ..... 12–4\n3. Courier Pressmen ..... 9–7\n4. Halloran\'s Bread ..... 8–8\n5. St. Brigid\'s Holy Rollers ..... 5–11\n6. Garrity Hardware ..... 0–16 ("rebuilding")\n\nIn the middle of the case, a pin signed by everyone in the building:\nPERFECT GAME — 300 — STAN KAMINSKI — FEB. 3, 1951\n(Stan is at St. Luke\'s today, waiting on his first baby. The pin has been moved to the front of the case for luck.)');
  read(S, setX1 + 8, 6, 22, 'Price card', 'OPEN BOWLING\nOne string ..... 30c\nSaturday: two strings for 50c\nShoes ..... 10c\nPinboys are tipped by the good-hearted.\n\nHARBOR DAYS: free string for anyone in a Centennial hat.');
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  void sitters; void bowl; void loungeSeats;
  return b;
}

// ---------------------------------------------------------------- Elks Lodge No. 812
function buildLodge(ctx, lot, spec) {
  const S = sBase(ctx, lot, spec, { name: 'Elks Lodge No. 812', hours: ['11:00', '24:00'], kind: 'lodge', est: 1902, tags: ['lodge', 'bar'],
    lore: 'Juniper Bay Lodge No. 812, Benevolent and Protective Order of Elks, instituted 1902. The building went up in 1912. Every night at eleven the lights dim for the Eleven O\'Clock Toast to absent brothers.' });
  const { b, f, W, D, rng } = S;
  const x0 = 4, x1 = W - 4, z0 = 10, z1 = Math.min(D - 8, 110), FH = 17, H = FH + 18;
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn); f.box(Math.round(W / 2) - 6, -1, 0, 12, 1, z0, MAT.sidewalk);
  f.box(x0, -1, z0, x1 - x0, 1, z1 - z0, MAT.stone_foundation);
  shell(f, x0, 0, z0, x1 - x0, H, z1 - z0, MAT.brick_red, MAT.wood_panel, 2);
  f.box(x0 + 1, 0, z0 + 1, x1 - x0 - 2, 1, z1 - z0 - 2, MAT.floor_oak);
  f.box(x0 + 1, FH, z0 + 1, x1 - x0 - 2, 1, z1 - z0 - 2, MAT.floor_walnut);
  f.box(x0 + 2, FH - 1, z0 + 2, x1 - x0 - 4, 1, z1 - z0 - 4, MAT.ceiling_tin);
  f.box(x0 + 2, H - 1, z0 + 2, x1 - x0 - 4, 1, z1 - z0 - 4, MAT.ceiling);
  f.walls(x0 + 1, FH + 1, z0 + 1, x1 - x0 - 2, H - FH - 2, z1 - z0 - 2, MAT.wallpaper_red, 1);
  f.walls(x0 + 1, FH + 1, z0 + 1, x1 - x0 - 2, 5, z1 - z0 - 2, MAT.wood_panel, 1);
  f.box(x0, H, z0, x1 - x0, 1, z1 - z0, MAT.roof_tar);
  // ---- facade: rusticated limestone base, brick above, portico, frieze, the elk and the eleven o'clock clock
  const Z = z0;
  f.box(x0, 0, Z - 1, x1 - x0, FH, 1, MAT.limestone);
  for (let y = 2; y < FH; y += 3) f.box(x0, y, Z - 1, x1 - x0, 1, 1, MAT.granite);
  f.box(x0 - 1, FH, Z - 2, x1 - x0 + 2, 1, 2, MAT.limestone);
  f.box(x0 - 1, H - 1, Z - 2, x1 - x0 + 2, 2, 2, MAT.limestone); f.walls(x0, H + 1, z0, x1 - x0, 3, z1 - z0, MAT.brick_red, 1); f.box(x0 - 1, H + 4, Z - 2, x1 - x0 + 2, 1, 2, MAT.limestone);
  const cx = Math.round(W / 2);
  f.box(cx - 42, FH + 12, Z - 1, 84, 7, 1, MAT.limestone); f.text('B.P.O.E. LODGE No. 812', cx, FH + 13, Z - 2, MAT.trim_dark, { align: 'center', font: 'small' });
  // windows
  for (const x of [x0 + 6, x0 + 18, x1 - 22, x1 - 10]) { win(f, x, 4, Z, 4, 8, { frame: MAT.trim_white, t: 2, lintelMat: MAT.limestone, sillMat: MAT.limestone }); win(f, x, FH + 3, Z, 4, 7, { frame: MAT.trim_white, t: 2, style: 'arch', sillMat: MAT.limestone }); }
  // portico
  const dx = cx - 2;
  f.carve(dx, 1, Z, 4, 10, 2); f.box(dx, 11, Z, 4, 2, 1, MAT.glass);
  f.box(dx - 6, 0, Z - 8, 16, 1, 8, MAT.granite); f.box(dx - 5, -1, Z - 10, 14, 1, 2, MAT.granite);
  for (const px of [dx - 5, dx + 7]) { f.box(px, 1, Z - 7, 2, 13, 2, MAT.limestone); f.box(px - 1, 1, Z - 8, 4, 1, 4, MAT.limestone); f.box(px - 1, 14, Z - 8, 4, 1, 4, MAT.limestone); }
  f.box(dx - 7, 15, Z - 9, 18, 1, 9, MAT.limestone);
  f.gable(dx - 7, 16, Z - 9, 18, 9, MAT.roof_copper, { axis: 'z', overhang: 0, gableMat: MAT.limestone });
  // the bronze elk head with antlers above the portico
  const ey = 18, gold = MAT.art_deco_gold;
  f.box(cx - 2, ey, Z - 2, 4, 4, 1, gold); f.box(cx - 1, ey - 1, Z - 3, 2, 2, 1, gold); f.box(cx - 2, ey + 3, Z - 2, 1, 1, 1, gold); f.box(cx + 1, ey + 3, Z - 2, 1, 1, 1, gold);
  for (const s of [-1, 1]) {
    const bx2 = s < 0 ? cx - 3 : cx + 2;
    f.box(bx2, ey + 4, Z - 2, 1, 6, 1, gold); f.box(bx2 + s, ey + 6, Z - 2, 1, 1, 1, gold); f.box(bx2 + 2 * s, ey + 7, Z - 2, 1, 3, 1, gold);
    f.box(bx2 + s, ey + 9, Z - 2, 1, 1, 1, gold); f.box(bx2 + 3 * s, ey + 9, Z - 2, 1, 2, 1, gold); f.box(bx2, ey + 10, Z - 2, 1, 2, 1, gold); f.box(bx2 + 4 * s, ey + 8, Z - 2, 1, 1, 1, gold);
  }
  // clock at the parapet showing eleven o'clock
  f.box(cx - 5, H + 3, Z - 1, 11, 11, 2, MAT.limestone); f.box(cx - 4, H + 4, Z - 2, 9, 9, 1, MAT.clock_face);
  f.box(cx, H + 8, Z - 3, 1, 3, 1, MAT.trim_black); f.box(cx - 1, H + 9, Z - 3, 1, 1, 1, MAT.trim_black); f.box(cx - 2, H + 9, Z - 3, 1, 1, 1, MAT.trim_black);
  for (const [ddx, ddy] of [[4, 0], [0, -4], [-4, 0]]) f.box(cx + ddx, H + 8 + ddy, Z - 3, 1, 1, 1, MAT.trim_dark);
  P(S, 'flag_pole', cx - 14, 0, 4, 0, { cat: 'far' });
  for (const x of [x0 + 2, x1 - 3]) P(S, 'bush_round', x, 0, Z - 2, 0);
  // ---- ground floor: lobby with the grand stair, bar & grill (left), card room (right), kitchen & office behind
  const lx0 = cx - 13, lx1 = cx + 13;
  wallZ(f, z0 + 2, z1 - 2, 1, lx0 - 1, FH - 2, MAT.wood_panel, [{ at: z0 + 16, w: 4 }, { at: z0 + 48, w: 4 }]);
  wallZ(f, z0 + 2, z1 - 2, 1, lx1, FH - 2, MAT.wood_panel, [{ at: z0 + 16, w: 4 }, { at: z0 + 48, w: 4 }]);
  const kz = z0 + 58;
  wallX(f, x0 + 2, lx0 - 1, 1, kz, FH - 2, MAT.wood_panel, [{ at: lx0 - 8, w: 4 }]);
  wallX(f, lx1 + 1, x1 - 2, 1, kz, FH - 2, MAT.wood_panel, [{ at: lx1 + 4, w: 4 }]);
  const lobby = b.room('Lobby', lx0, 1, z0 + 2, lx1 - lx0, FH - 2, z1 - z0 - 4, { lightMode: 'always', kind: 'shop', nav: [cx, z0 + 6] });
  const bar = b.room('Grill Room', x0 + 2, 1, z0 + 2, lx0 - 1 - x0 - 2, FH - 2, kz - z0 - 2, { lightMode: 'always', kind: 'shop', lightColor: [1, 0.82, 0.6] });
  const cards = b.room('Card Room', lx1 + 1, 1, z0 + 2, x1 - 2 - lx1 - 1, FH - 2, kz - z0 - 2, { lightMode: 'always', kind: 'shop', lightColor: [1, 0.85, 0.65] });
  const kitchen = b.room('Kitchen', x0 + 2, 1, kz + 1, lx0 - 1 - x0 - 2, FH - 2, z1 - kz - 3, { lightMode: 'auto', kind: 'work' });
  const office = b.room('Secretary\'s Office', lx1 + 1, 1, kz + 1, x1 - 2 - lx1 - 1, FH - 2, z1 - kz - 3, { lightMode: 'auto' });
  S.sales = bar;
  b.entrance(lobby, cx, 1, Z, { outZ: -3, leaf: 'door_wood', tint: '#4a2a1a', main: true });
  b.door(lobby, bar, lx0 - 1, 1, z0 + 18, { axis: 'z', leaf: false }); b.door(lobby, bar, lx0 - 1, 1, z0 + 50, { axis: 'z' });
  b.door(lobby, cards, lx1, 1, z0 + 18, { axis: 'z', leaf: false }); b.door(lobby, cards, lx1, 1, z0 + 50, { axis: 'z' });
  b.door(bar, kitchen, lx0 - 6, 1, kz, {}); b.door(cards, office, lx1 + 6, 1, kz, {});
  f.box(lx0, 0, z0 + 2, lx1 - lx0, 1, z1 - z0 - 4, MAT.floor_marble);
  f.box(cx - 4, 0, z0 + 2, 8, 1, 14, MAT.carpet_red);
  // grand stair up the middle of the lobby
  const st0 = z0 + 16;
  stairs(f, cx - 4, 1, st0, '+z', FH, { w: 8, run: 2, mat: MAT.wood_dark, rail: MAT.wood_dark });
  f.box(cx - 5, 1, st0, 1, 4, FH * 2, MAT.wood_dark); f.box(cx + 4, 1, st0, 1, 4, FH * 2, MAT.wood_dark);
  // lobby: honour roll, trophy case, flag
  P(S, 'trophy_case', lx0 + 2, 1, z0 + 8, 1); P(S, 'flag_stand', lx1 - 2, 1, z0 + 5, 3); P(S, 'clock_grandfather', lx1 - 1.5, 1, z0 + 11, 3);
  f.box(lx0, 5, z0 + 3, 1, 8, 10, MAT.wood_dark); f.box(lx0, 6, z0 + 4, 1, 6, 8, MAT.trim_gold);
  // the grill room: bar, stools, tables, antlers, a television for the fights
  const bz0 = z0 + 6, bz1 = kz - 8;
  f.box(x0 + 2, 1, bz0, 2, 3, bz1 - bz0, MAT.wood_dark); f.box(x0 + 2, 4, bz0, 2, 1, bz1 - bz0, MAT.bar_top); f.box(x0 + 2, 7, bz0, 1, 4, bz1 - bz0, MAT.mirror);
  for (let z = bz0 + 1; z < bz1 - 1; z++) if (rng.chance(0.8)) f.box(x0 + 2, 5, z, 1, 1, 1, Mt(rng.pick(G.bottles)));
  f.box(x0 + 6, 1, bz0, 3, 3, bz1 - bz0, MAT.wood_panel); f.box(x0 + 6, 4, bz0, 3, 1, bz1 - bz0, MAT.bar_top); f.box(x0 + 9, 1, bz0, 1, 1, bz1 - bz0, MAT.trim_gold);
  P(S, 'beer_taps', x0 + 7, 5, bz0 + 6, 1); P(S, 'cash_register', x0 + 3, 5, bz1 - 4, 1);
  const stools = stoolRow(S, bz0 + 2, bz1 - 2, x0 + 11.3, 3, { axis: 'z', type: 'bar_stool', tags: ['bar'], act: 'drink', room: bar, step: 3 });
  const steward = stand(S, x0 + 4.8, (bz0 + bz1) / 2, 1, 'bartend', ['work'], { room: bar, lines: ['Brother. What\'ll it be?', 'Eleven o\'clock toast tonight — stick around.'] });
  vTV(S, x0 + 2, 11, bz1 + 1, { w: 3, h: 3 });
  for (const [tx, tz] of [[x0 + 20, z0 + 14], [x0 + 20, z0 + 28], [x0 + 20, z0 + 42]]) if (tx < lx0 - 4) { P(S, 'table_round', tx, 1, tz, 0); for (const [ox, r] of [[-2.6, 1], [2.6, 3]]) { P(S, 'chair_wood', tx + ox, 1, tz, r); sit(S, tx + ox, tz, r, 'drink', ['bar'], 0.45, { room: bar }); } }
  // antlers over the bar mirror
  const aw = MAT.wood_pale;
  for (const az of [bz0 + 8, bz1 - 8]) { f.box(x0 + 2, 12, az, 1, 2, 2, MAT.wood_dark); for (const s of [-1, 1]) { f.box(x0 + 2, 13, az + (s < 0 ? -1 : 2), 1, 1, 1, aw); f.box(x0 + 2, 14, az + (s < 0 ? -2 : 3), 1, 2, 1, aw); f.box(x0 + 2, 15, az + (s < 0 ? -3 : 4), 1, 1, 1, aw); } }
  // card room: four tables of pinochle, a pool table, checkers
  const players = [];
  const ctabs = [[lx1 + 8, z0 + 10], [lx1 + 20, z0 + 10], [lx1 + 8, z0 + 22], [lx1 + 20, z0 + 22]].filter(([x]) => x < x1 - 6);
  for (const [tx, tz] of ctabs) {
    P(S, 'table_card', tx, 1, tz, 0); P(S, 'ashtray', tx + 0.5, 3.3, tz + 0.5, 0);
    for (const [ox, oz, r] of [[-2.6, 0, 1], [2.6, 0, 3], [0, -2.6, 2], [0, 2.6, 0]]) { P(S, 'chair_wood', tx + ox, 1, tz + oz, r); players.push(sit(S, tx + ox, tz + oz, r, 'cards', ['bar', 'cards'], 0.45, { room: cards, label: 'Playing pinochle at the Elks', lines: ['Double pinochle! Pay up, Walt.', 'Whose deal? It\'s always your deal.', 'In \'34 we played for soup. Now we play for nickels. Progress.'] })); }
  }
  P(S, 'pool_table', lx1 + 14, 1, z0 + 36, 1); stand(S, lx1 + 8, z0 + 36, 1, 'lean', ['bar'], { room: cards });
  P(S, 'checkers_table', lx1 + 14, 1, z0 + 46, 0);
  for (let z = z0 + 6; z < kz - 4; z += 8) P(S, 'portrait', x1 - 2.6, 8, z, 3);
  // kitchen & office
  for (let i = 0; i < 3; i++) P(S, 'stove', x0 + 5 + i * 4, 1, z1 - 5.4, 0);
  P(S, 'kitchen_sink', x0 + 18, 1, z1 - 5.4, 0); P(S, 'fridge', x0 + 22, 1, z1 - 5.4, 0);
  const cook = stand(S, x0 + 9, z1 - 8, 2, 'cook', ['work'], { room: kitchen });
  const sec = officeDesk(b, office, lx1 + 12, 1, z1 - 10, 0, { typewriter: true, act: 'type' });
  P(S, 'filing_cabinet', x1 - 4, 1, z1 - 6, 3); P(S, 'safe_small', x1 - 4, 1, kz + 4, 3);
  // ---- upstairs: anteroom at the head of the stair, lodge hall behind, committee rooms at the front
  const y2 = FH + 1, hz0 = z0 + 52;
  const top = st0 + FH * 2;
  wallX(f, x0 + 2, x1 - 2, y2, hz0, H - FH - 2, MAT.wood_panel, [{ at: cx - 2, w: 4, h: 10 }]);
  wallZ(f, z0 + 2, hz0, y2, lx0 - 1, H - FH - 2, MAT.wood_panel, [{ at: z0 + 8, w: 4 }]);
  wallZ(f, z0 + 2, hz0, y2, lx1, H - FH - 2, MAT.wood_panel, [{ at: z0 + 8, w: 4 }]);
  const ante = b.room('Anteroom', lx0, y2, z0 + 2, lx1 - lx0, H - FH - 2, hz0 - z0 - 2, { lightMode: 'auto', nav: [cx, top - 2] });
  const hall = b.room('Lodge Hall', x0 + 2, y2, hz0 + 1, x1 - x0 - 4, H - FH - 2, z1 - hz0 - 3, { lightMode: 'auto', kind: 'hall', lightColor: [1, 0.85, 0.65] });
  const parlor = b.room('Committee Room', x0 + 2, y2, z0 + 2, lx0 - 1 - x0 - 2, H - FH - 2, hz0 - z0 - 2, { lightMode: 'auto' });
  const ladies = b.room('Ladies\' Parlor', lx1 + 1, y2, z0 + 2, x1 - 2 - lx1 - 1, H - FH - 2, hz0 - z0 - 2, { lightMode: 'auto' });
  b.stairs(lobby, [cx, 1, st0 - 1.5], ante, [cx, y2, Math.min(hz0 - 2, top + 1)]);
  b.door(ante, hall, cx, y2, hz0, { leaf: 'door_wood', tint: '#4a2a1a' });
  b.door(ante, parlor, lx0 - 1, y2, z0 + 10, { axis: 'z' }); b.door(ante, ladies, lx1, y2, z0 + 10, { axis: 'z' });
  f.box(cx - 5, y2, st0, 1, 4, top - st0, MAT.wood_dark); f.box(cx + 4, y2, st0, 1, 4, top - st0, MAT.wood_dark);
  // hall: carpet, the Exalted Ruler's dais at the far end, altar in the middle, members' chairs along the walls
  f.box(x0 + 2, y2 - 1, hz0 + 1, x1 - x0 - 4, 1, z1 - hz0 - 3, MAT.carpet_red);
  const daisZ = z1 - 10;
  f.box(cx - 10, y2, daisZ, 20, 2, 7, MAT.wood_dark); f.box(cx - 10, y2, daisZ, 20, 1, 1, MAT.trim_gold);
  P(S, 'lectern', cx, y2 + 2, daisZ + 2, 0); P(S, 'armchair', cx, y2 + 2, daisZ + 5, 0, { tint: '#6a1a2a' });
  const hm = (z1 + hz0) / 2;
  f.box(cx - 2, y2, Math.round(hm) - 2, 4, 3, 4, MAT.wood_dark); f.box(cx - 2, y2 + 3, Math.round(hm) - 2, 4, 1, 4, MAT.velvet_red); P(S, 'book', cx, y2 + 4, hm, 0); P(S, 'flag_stand', cx + 4, y2, hm, 0);
  const hallSeats = [];
  for (let z = hz0 + 4; z < daisZ - 3; z += 3) for (const [x, r] of [[x0 + 5, 1], [x1 - 5, 3]]) { P(S, 'chair_folding', x, y2, z, r); hallSeats.push(sit(S, x, z, r, 'listen_sit', ['lodge'], 0.45, { y: y2, room: hall })); }
  // antlers over the Exalted Ruler's chair
  const az = z1 - 3;
  f.box(cx - 1, y2 + 8, az, 3, 2, 1, MAT.wood_dark);
  for (const s of [-1, 1]) { const ax = s < 0 ? cx - 2 : cx + 2; f.box(ax, y2 + 9, az, 1, 3, 1, aw); f.box(ax + s, y2 + 11, az, 1, 1, 1, aw); f.box(ax + 2 * s, y2 + 12, az, 1, 3, 1, aw); f.box(ax + s, y2 + 14, az, 1, 1, 1, aw); f.box(ax + 3 * s, y2 + 13, az, 1, 2, 1, aw); }
  for (let z = hz0 + 6; z < z1 - 6; z += 8) { P(S, 'portrait', x0 + 2.4, y2 + 8, z, 1); P(S, 'portrait', x1 - 2.4, y2 + 8, z, 3); }
  P(S, 'piano_upright', x1 - 4, y2, hz0 + 4, 3); P(S, 'chandelier', cx, H - 5, hm, 0); P(S, 'chandelier', cx, H - 5, hz0 + 8, 0);
  // committee room & ladies' parlor
  diningSet(b, parlor, (x0 + lx0) / 2, y2, (z0 + hz0) / 2, { seats: 8, table: 'table_dining', chair: 'chair_wood', settings: false, centerpiece: 'books_stack' });
  parlour(b, ladies, lx1 + 1, y2, z0 + 2, x1 - 3 - lx1, hz0 - z0 - 2, { tv: false, sofaTint: '#6a3a4a', pictures: true });
  // ---- jobs
  job(S, 'steward', [steward], ['11:00', '23:59'], { title: 'lodge steward' });
  job(S, 'cook', [cook], ['11:00', '20:00'], { outfit: 'cook', title: 'lodge cook' });
  job(S, 'secretary', [sec], ['9:00', '16:00'], { days: 'weekday', title: 'lodge secretary' });
  for (let i = 0; i < Math.min(4, players.length / 4); i++) job(S, 'member', [players[i * 4], players[i * 4 + 1]], ['13:00', '18:30'], { act: 'cards', sex: 'M', age: [55, 80], title: 'Saturday pinochle' });
  S.eat = stools;
  // ---- readables
  read(S, lx0 + 1, 8, z0 + 8, 'Honor Roll', 'JUNIPER BAY LODGE No. 812 — B.P.O.E.\nBROTHERS WHO SERVED 1941–1945\n\n(a long bronze tablet of 64 names; beside nine of them, a small gold star)\n\n★ Lt. James W. Hale, U.S.N. — USS Juneau, 1942\n★ Sgt. Michael T. Duffy — Anzio, 1944\n★ Pfc. Anthony Russo — Saipan, 1944\n★ S/Sgt. Walter J. Novak — over Schweinfurt, 1943 (Casimir\'s cousin)\n★ Cpl. Henry O\'Connell — the Bulge, 1944\n★ Ens. Peter Silva — Leyte Gulf, 1944\n★ Pvt. Samuel Nye — Okinawa, 1945\n★ Chief Machinist Raymond Coffin — USS Indianapolis, 1945\n★ Pfc. Edward Tremblay — Normandy, 1944\n\n"Absent brothers — never forgotten."', { prompt: 'Read the honor roll', r: 2.2 });
  read(S, cx, 6, Z + 4, 'Charter', 'JUNIPER BAY LODGE No. 812\nBenevolent and Protective Order of Elks of the United States of America\nInstituted April 12, 1902 — twenty-eight charter members\n\nIn the corner, a smaller framed card: "July 1934 — this lodge served 2,300 bowls of soup to the families of the cannery strikers. No questions asked." ');
  read(S, x0 + 7, 8, bz1 - 6, 'The Eleven O\'Clock Toast', 'You have heard the tolling of eleven strokes. This is to remind you that with us the hour of eleven has a tender significance. Wherever Elks may roam, whatever their lot in life may be, when this hour falls upon the dial of night the great heart of Elkdom swells and throbs. It is the golden hour of recollection, the homecoming of those who wander, the mystic roll call of those who will come no more.\n\nTo our absent brothers.');
  read(S, cx, y2 + 4, daisZ + 3, 'Exalted Ruler\'s station', 'The Exalted Ruler for 1953–54: Brother Joseph Brennan, Captain of Engine Co. No. 1.\n\nA note left on the lectern: "Joe — lodge meeting moved to Tuesday on account of your boy\'s wedding. Congratulations. Don\'t cry at the reception, you\'ll never hear the end of it."');
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  void hallSeats; void rng;
  return b;
}
