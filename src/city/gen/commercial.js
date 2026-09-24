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
  if (k === 'club') return 33; if (k === 'bowling') return 26; if (k === 'lodge') return 40; if (k === 'garage') return 26;
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
  const at = wall === 'L' ? S.X0 : wall === 'R' ? S.X1 - 1 : wall === 'A' ? 2 : S.Zb - 1;
  const axis = wall === 'B' ? 'z' : 'x', dir = (wall === 'L' || wall === 'A') ? 1 : -1;
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
// A booth (built-in voxel benches + table) perpendicular to a wall; returns the seat spots. The booth occupies
// x u..u+6 (bench, table, bench) and z z0..z0+3 (4 deep) when along='x'.
function vBooth(S, u, z0, o = {}) {
  const f = S.f, y = o.y ?? 1, room = o.room ?? S.sales;
  const seatM = o.seat ?? MAT.velvet_red, frame = o.frame ?? MAT.wood_dark, top = o.top ?? MAT.counter_formica;
  const dep = o.depth ?? 4;
  f.box(u, y, z0, 2, 1, dep, frame); f.box(u, y + 1, z0, 2, 1, dep, seatM); f.box(u, y + 2, z0, 1, 3, dep, seatM); f.box(u, y + 5, z0, 1, 1, dep, frame);
  f.box(u + 5, y, z0, 2, 1, dep, frame); f.box(u + 5, y + 1, z0, 2, 1, dep, seatM); f.box(u + 6, y + 2, z0, 1, 3, dep, seatM); f.box(u + 6, y + 5, z0, 1, 1, dep, frame);
  f.box(u + 3, y, z0 + 1, 1, 2, dep - 2, o.leg ?? MAT.chrome); f.box(u + 2, y + 2, z0, 3, 1, dep - (o.open ? 1 : 0), top);
  const spots = [], tags = o.tags ?? ['eat_out'], act = o.act ?? 'eat';
  const zs = dep >= 4 ? [z0 + 1, z0 + dep - 1] : [z0 + dep / 2];
  for (const zz of zs) {
    spots.push(S.b.spot('sit', u + 1.3, y, zz, 1, { room, act, tags, seat: 0.5 }));
    spots.push(S.b.spot('sit', u + 5.7, y, zz, 3, { room, act, tags, seat: 0.5 }));
  }
  if (o.settings !== false) for (const zz of zs) { P(S, 'table_setting', u + 2.6, y + 3, zz, 1); P(S, 'table_setting', u + 4.4, y + 3, zz, 3); }
  return spots;
}
// Stools along x in front of a counter; customers face rot. Returns spots.
function stoolRow(S, x0, x1, z, rot, o = {}) {
  const out = [];
  for (let x = x0; x <= x1 + 1e-6; x += o.step ?? 3) {
    P(S, o.type ?? 'stool_tall', x, o.y ?? 1, z, rot, { tint: o.tint });
    out.push(S.b.spot('sit', x, o.y ?? 1, z, rot, { room: o.room ?? S.sales, act: o.act ?? 'eat', tags: o.tags ?? ['eat_out'], seat: o.seat ?? 0.7 }));
  }
  return out;
}
// Voxel television set with a glowing screen facing rot 0 (the street) — for shop windows and bars.
function vTV(S, x, y, z, o = {}) {
  const f = S.f, w = o.w ?? 3, h = o.h ?? 3;
  f.box(x, y, z, w, h, 2, o.cab ?? MAT.wood_mid);
  f.box(x + (w > 2 ? 0 : 0), y + (o.legs ? 1 : 0), z, w, 1, 2, o.cab ?? MAT.wood_mid);
  const sw = Math.max(1, w - (w > 3 ? 2 : 1)), sh = Math.max(1, h - 1);
  f.box(x + Math.floor((w - sw) / 2), y + h - sh, z - (o.facing === 2 ? -1 : 0) + (o.facing === 2 ? 1 : 0), sw, sh, 1, MAT.tv_screen);
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
    pier: P1(s.pier, ['same', 'same', 'iron_green', 'granite', 'trim_dark']) ,
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
  if (st.pier === MAT.same || st.pier === undefined) st.pier = st.outer;
  const built = buildYear(lot, spec, rng);
  const hasUp = floors > 1;
  const X0 = hasUp ? 7 : 2, X1 = W - 2;
  const backD = T.backD ?? clamp(Math.round((bd - 4) * 0.27), 12, 24);
  const Zb = bd - 3 - backD;
  const hallEnd = 38;
  const S = { ctx, b, f, rng, T, spec, lot, W, D, bd, H, floors, st, built, est, name, hasUp, X0, X1, Zb, Z0: 4, y: 1, cust: [], windows: [], upWalls: [], hallEnd };

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
    P(S, 'wall_telephone', 3, 6, -0.2, 0); // (a brass mailbox slot / bell plate by the door)
  }
  // ---- upper floors
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
  const office = (S.T.upper && S.T.upper[k - 1] === 'office') || S.upUse?.[k] === 'office';
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
    if (rng.chance(0.55)) f.box(x, y + 6 - rng.int(1, 3), 1, wide, rng.int(1, 3), 1, rng.chance(0.7) ? MAT.canvas_tan : MAT.canvas_white);
    if (k === 1 && rng.chance(0.08)) f.box(x + 1, y, -1, 2, 2, 2, MAT.steel_white);
  }
  if (k > 1) f.box(0, slabY(k), -1, W, 1, 1, trim);                 // belt course
  if (k === S.floors - 1 && rng.chance(0.55)) for (const x of xs) P(S, 'bunting_fan', x + wide / 2, y - 4.2, -0.3, 0, {});
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
  } else {
    // cornice with brackets, parapet with a name/date panel
    f.box(0, H - 1, -1, W, 1, 1, st.trim);
    f.box(-1, H, -2, W + 2, 1, 2, st.trim);
    for (let x = 1; x < W - 1; x += 4) f.box(x, H - 2, -1, 1, 1, 1, st.trim);
    f.box(0, H - 3, -1, W, 1, 1, st.trim);
    f.walls(0, H + 1, 0, W, 2, bd, st.outer, 1);
    f.box(0, H + 3, -1, W, 1, 2, st.trim);
    const txt = S.T.panel ? S.T.panel(S) : String(S.built);
    const tw = f.textWidth(txt, 1, 'small');
    const pw = Math.min(W - 6, tw + 6), px = Math.round(W / 2 - pw / 2);
    if (tw <= W - 8) {
      f.box(px, H + 1, 0, pw, 7, 1, st.outer);
      f.box(px - 1, H + 8, -1, pw + 2, 1, 2, st.trim);
      f.box(px, H + 1, -1, pw, 1, 1, st.trim);
      f.text(txt, Math.round(W / 2), H + 2, -1, st.trim, { align: 'center', font: 'small' });
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
  const z0 = 4, z1 = full ? Math.round(bd * 0.58) : bd - 4;
  const wAvail = z1 - z0 - 2, hAvail = yHi - yLo;
  if (hAvail < 6 || wAvail < 20) return;
  const pool = [...(S.T.ghost || []), ...GHOST_ADS];
  const ad = rng.chance(0.6) && S.T.ghost ? rng.pick(S.T.ghost) : rng.pick(pool);
  const fit = (font, lh, per) => {
    const lines = [];
    for (const src of ad) {
      const words = src.split(' ');
      let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (Fr.textWidth(t, 1, font) <= wAvail) cur = t; else { if (cur) lines.push(cur); cur = w; } }
      if (cur) lines.push(cur);
    }
    if (lines.some((l) => Fr.textWidth(l, 1, font) > wAvail)) return null;
    if (lines.length * lh - (lh - per) > hAvail) return null;
    return lines;
  };
  let font = 'big', lh = 9, per = 7;
  let lines = fit('big', 9, 7);
  if (!lines) { font = 'small'; lh = 7; per = 5; lines = fit('small', 7, 5); }
  if (!lines) return;
  const blockH = lines.length * lh - (lh - per);
  const yTop = Math.min(yHi, yLo + Math.round((hAvail + blockH) / 2));
  const cx = side === 'left' ? D - (z0 + z1) / 2 : (z0 + z1) / 2;
  const panel = rng.pick([null, MAT.brick_paint_red, MAT.brick_dark, MAT.sign_navy, null]);
  const letter = panel === MAT.sign_navy ? MAT.plaster_cream : rng.pick([MAT.sign_cream, MAT.plaster_cream, MAT.trim_cream, MAT.plaster_white]);
  if (panel) Fr.box(Math.round(cx - wAvail / 2 - 1), yTop - blockH - 1, 0, wAvail + 2, blockH + 2, 1, panel);
  lines.forEach((l, i) => Fr.text(l, Math.round(cx), yTop - per - i * lh, 0, i === 0 ? letter : (rng.chance(0.5) ? letter : MAT.sign_yellow), { align: 'center', font }));
  // 1938 high-water line on flood-plain buildings
  if (full && floodLot(lot)) highWaterSide(S, Fr, X);
}
function highWaterSide(S, Fr, X) {
  const { bd } = S;
  Fr.box(X(0, bd), 7, 0, bd, 1, 1, MAT.trim_dark);
  Fr.text('HIGH WATER SEPT 21 1938', X(4, 0) + (X(4, 0) > X(8, 0) ? -30 : 30), 8, 0, MAT.trim_dark, { align: 'center', font: 'small' });
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
    const use = S.upUse[k] || (T.upper && T.upper[k - 1]) || (k === 1 ? 'apt' : rng.pick(['apt', 'apt', 'store', 'office']));
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
  // lived-in odds and ends
  const extras = [['coat_rack', X0 + 1.5, zA + 2.5, 0], ['radio_table', X1 - 1.2, zA + 1.5, 3, 4], ['newspaper_pile', X0 + AW / 2, zA - 6, 0, 1.8], ['clock_wall', X0 + AW / 2, zB - 0.4, 0, 6.5],
    ['sewing_machine', X0 + 2, Z0 + 3, 1], ['books_stack', X0 + 2, zA - 1.5, 0], ['laundry_basket', xBath - 2, Z1 - 1.5, 0], ['photo_frames', X0 + 0.4, (Z0 + zA) / 2, 1, 6], ['cat', X0 + AW / 2 + 3, zA - 4, 1],
    ['toy_blocks', X0 + 6, Z0 + 8, 0], ['ironing_board', X0 + 3, zB - 2.5, 0], ['dish_rack', X1 - 1.3, zA + 5.5, 3, 4], ['teddy_bear', xBath - 3, zB + 3, 2], ['umbrella_stand', X0 + 1, zA + 5, 0]];
  for (const [t, x, z, r, yy] of rng.shuffle(extras).slice(0, rng.int(4, 7))) P(S, t, x, y + (yy || 0), z, r);
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
  const O = S.T.office || OFFICES[idx];
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
  const cx = Math.round((X0 + X1) / 2) - 2;       // corridor x cx..cx+3
  // passage from the landing to the corridor
  const pz = land0;
  wallZ(f, Z0, Z1, y, cx - 1, h, wm, []);
  wallZ(f, Z0, Z1, y, cx + 4, h, wm, []);
  wallX(f, X0, cx - 1, y, pz - 1, h, wm); wallX(f, X0, cx - 1, y, pz + 4, h, wm);
  f.carve(cx - 1, y, pz, 1, 9, 4);
  const cor = b.room('Corridor', cx, y, Z0, 4, h, Z1 - Z0, { public: false, nav: [cx + 2, pz + 2] });
  const pas = b.room('Corridor', X0, y, pz, cx - 1 - X0, h, 4, { public: false });
  b.door(hall, pas, 6, y, pz + 2, { axis: 'z', leaf: false });
  b.door(pas, cor, cx - 1, y, pz + 2, { axis: 'z', leaf: false });
  f.box(cx, y - 1, Z0, 4, 1, Z1 - Z0, MAT.carpet_red); f.box(X0, y - 1, pz, cx - 1 - X0, 1, 4, MAT.carpet_red);
  for (let z = Z0 + 6; z < Z1; z += 14) P(S, 'ceiling_lamp', cx + 2, y + 8, z, 0);
  // room slots
  const slots = [];
  const cut = (x0, x1, za, zb) => { const n = Math.max(1, Math.round((zb - za) / 17)); const d = (zb - za) / n; for (let i = 0; i < n; i++) slots.push({ x0, x1, z0: Math.round(za + i * d), z1: Math.round(za + (i + 1) * d) }); };
  cut(X0, cx - 1, Z0, pz - 1); cut(X0, cx - 1, pz + 5, Z1); cut(cx + 5, X1, Z0, Z1);
  const dine = S.boardDine || [];
  let n = 0;
  slots.forEach((s, i) => {
    const w = s.x1 - s.x0, d = s.z1 - s.z0;
    if (w < 8 || d < 9) return;
    if (i > 0) { if (s.x0 === X0) wallX(f, s.x0, s.x1, y, s.z0 - 1 + (s.z0 === Z0 ? 1 : 0), h, wm); else wallX(f, s.x0, s.x1, y, s.z0, h, wm); }
    const left = s.x1 <= cx;
    const dx = left ? cx - 1 : cx + 4, dz = s.z0 + 2;
    f.carve(dx, y, dz, 1, 9, 4);
    const isBath = !left && i === slots.length - 1 && !S.lodgeBath;
    const r = b.room(isBath ? 'Bathroom' : `Room ${k + 1}${String.fromCharCode(65 + n)}`, s.x0 + (left ? 0 : 1), y, s.z0 + (s.z0 === Z0 ? 0 : 1), w - (left ? 0 : 1), h, d - 1, { public: false });
    b.door(cor, r, dx, y, dz + 2, { axis: 'z', tint: '#6a4a2a' });
    if (isBath) { S.lodgeBath = true; bathroom(b, r, s.x0 + 1, y, s.z0 + 1, w - 1, d - 1); return; }
    n++;
    const bx = left ? s.x0 + 3 : s.x1 - 3;
    const rot = left ? 1 : 3;
    // bed along the outer wall, head at the back of the slot
    P(S, 'bed_single', bx, y, s.z0 + d / 2 + 1, 2, { tint: rng.pick(QUILT) });
    const bedSpot = b.spot('sleep', bx, y, s.z0 + d / 2 - 2.5, 2, { room: r, act: 'sleep', tags: ['sleep', 'lodger'], seat: 0.55 });
    P(S, 'dresser', left ? s.x0 + 3 : s.x1 - 3, y, s.z1 - 1.5, 0);
    P(S, 'chair_wood', left ? s.x1 - 3 : s.x0 + 4, y, s.z0 + 3, rot);
    const chair = b.spot('sit', left ? s.x1 - 3 : s.x0 + 4, y, s.z0 + 3, rot, { room: r, act: rng.pick(['read', 'write', 'smoke_pipe', 'read_book']), tags: ['lounge'], seat: 0.45 });
    P(S, 'sink_pedestal', left ? s.x1 - 2.2 : s.x0 + 2.2, y, s.z1 - 2.5, rot);
    P(S, rng.pick(['suitcase_upright', 'trunk', 'coat_rack', 'hat_rack_wall']), left ? s.x0 + 6 : s.x1 - 6, y, s.z0 + 2, 0);
    P(S, 'lamp_table', left ? s.x0 + 3 : s.x1 - 3, y + 7.8, s.z1 - 1.5, 0);
    if (rng.chance(0.5)) P(S, rng.pick(['radio_table', 'books_stack', 'newspaper_pile', 'photo_frames_standing', 'typewriter']), left ? s.x0 + 3 : s.x1 - 3, y + 7.8, s.z1 - 1.2, 0);
    b.home({ family: null, size: 1, beds: [bedSpot], lounge: [chair], dine, kitchen: [], bath: [], yard: [], porch: [], desk: [chair], lodger: true, single: true, room: r });
    S.lodgers = (S.lodgers || 0) + 1;
    if (S.lodgerNotes && S.lodgerNotes.length) { const [t, body] = S.lodgerNotes.shift(); read(S, left ? s.x1 - 3 : s.x0 + 4, y + 4, s.z0 + 4, t, body); }
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
  // Harbor Days posters in some windows
  if (S.windows.length && rng.chance(0.5)) { const [a, c] = S.windows[S.windows.length - 1]; sign(S, 'HARBOR DAYS 1853-1953', c - 3.5, 3.2, 1.4, 0, { bg: '#1f2f5f', fg: '#f0ecdc', border: '#b3302a', scale: 0.55 }); }
  if (S.hasUp && (S.flats || S.offices)) read(S, 5.5, 5, -0.4, 'Directory', `${S.lot.address}\n\n${S.name}\n${(S.offices || []).map((o) => o + ' — upstairs').join('\n')}${S.flats ? `\n${S.flats} apartment${S.flats > 1 ? 's' : ''} above — ring bell` : ''}`, { prompt: 'Read the doorbell plate' });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
}
