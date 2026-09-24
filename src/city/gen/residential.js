// Residential generators for Juniper Bay (1953): detached houses — colonial, Cape Cod, bungalow,
// foursquare, Queen Anne (with turret), Second Empire (mansard), Italianate and Federal — brick &
// brownstone rowhouses, and the Marlowe Apartments. Every house is enterable; every room is finished
// (its own wallpaper, floor, trim), furnished and made personal, and each household is registered
// with b.home() so the population can plan its day. Special households (layout spec.special) get
// their scenes: the Hallorans' TV supper, Susie Moreau's 7th birthday, Admiral up the maple, Sal
// Castellano's welcome-home feast, the Novak wedding, and Miss Whitcomb's Historical Society.
import { Building } from '../building.js';
import { MAT, win } from './common.js';
import { linkToSidewalk } from '../streets.js';
import { textSignType } from '../../props/lib/special.js';
import { TODAY } from '../lore.js';
import { PLAN } from '../layout.js';

export function register(GEN) {
  GEN.house = buildHouse;
  GEN.rowhouse = buildRowhouse;
  GEN.apartment = buildApartment;
}

// ================================================================ palettes
const M = (n) => (MAT[n] !== undefined ? MAT[n] : MAT.plaster_white);
const SIDING = ['siding_white', 'siding_white', 'siding_yellow', 'siding_blue', 'siding_green', 'siding_gray', 'siding_gray', 'siding_mint', 'siding_pink', 'siding_red', 'siding_brown', 'shingle_wall'];
const ROOFS = ['roof_shingle_gray', 'roof_shingle_brown', 'roof_shingle_red', 'roof_shingle_green', 'roof_shingle_black', 'roof_slate', 'roof_shingle_gray'];
const TRIMS = ['trim_white', 'trim_white', 'trim_white', 'trim_cream', 'trim_green', 'trim_dark', 'trim_red', 'trim_blue'];
const SHUTTERS = ['trim_green', 'trim_black', 'trim_red', 'trim_blue', 'trim_dark', 'trim_teal', 'trim_green', 'trim_black'];
// Victorian "painted lady" schemes: body, trim, accent
const LADIES = [
  ['siding_green', 'trim_cream', 'trim_red'], ['siding_yellow', 'trim_white', 'trim_green'], ['siding_blue', 'trim_white', 'trim_red'],
  ['siding_pink', 'trim_white', 'trim_teal'], ['siding_gray', 'trim_white', 'trim_red'], ['siding_mint', 'trim_cream', 'trim_brown'],
  ['siding_red', 'trim_cream', 'trim_green'], ['siding_brown', 'trim_cream', 'trim_gold'], ['siding_white', 'trim_green', 'trim_red'],
];
const PAPER = ['wallpaper_rose', 'wallpaper_green', 'wallpaper_blue', 'wallpaper_cream', 'wallpaper_yellow', 'wallpaper_teal', 'wallpaper_red'];
const PLASTER = ['plaster_cream', 'plaster_white', 'plaster_green', 'plaster_blue', 'plaster_pink', 'plaster_yellow', 'plaster_mint', 'plaster_gray'];
const WOODF = ['floor_oak', 'floor_oak_z', 'floor_walnut', 'floor_walnut_z', 'floor_pine', 'floor_pine_z'];
const KITF = ['floor_linoleum', 'floor_linoleum_green', 'floor_checker', 'floor_checker_red', 'floor_checker_green', 'floor_linoleum'];
const BATHF = ['floor_tile_white', 'floor_tile_blue', 'floor_checker', 'floor_tile_white'];
const TILEW = ['tile_kitchen', 'tile_mint', 'tile_pink', 'tile_yellow', 'tile_kitchen'];
const CARPET = ['carpet_red', 'carpet_green', 'carpet_blue', 'carpet_beige', 'carpet_rose', 'carpet_gold'];
const FABRIC = ['#6a7a5a', '#8a4a3a', '#5a6a8a', '#a88a5a', '#7a5a6a', '#4a6a6a', '#9a6a4a', '#6a5a4a', '#8a8a6a', '#a05a5a', '#3a5a4a', '#b09060'];
const QUILT = ['#c86a6a', '#6a8ac8', '#e0c070', '#8ab88a', '#d8a0b8', '#e8e0d0', '#a87ac8', '#c8905a', '#70a8a0'];
const RUGS = ['#8a3a2e', '#3a4a6a', '#6a5a3a', '#4a5a3a', '#7a2a3a', '#5a4a6a', '#9a6a3a'];
const CAR_COLORS = ['#2a3a5a', '#6a2a2a', '#3a5a3a', '#d8d0b8', '#2a2a2e', '#7a8a9a', '#a8743a', '#5a8a8a', '#8a9a7a', '#c8b890', '#4a2a3a'];
const DOORC = ['#7a2a24', '#2a4a3a', '#2a3a5a', '#e8e4d8', '#5a3a24', '#1d1d22', '#8a6a2a', '#3a5a6a'];
const CURTAIN = ['canvas_white', 'canvas_white', 'canvas_tan', 'velvet_red', 'velvet_blue', 'wallpaper_cream', 'awning_red', 'awning_green', 'awning_blue', 'awning_yellow'];
const FLOWERS = ['flowerbed_red', 'flowerbed_yellow', 'flowerbed_purple', 'flowerbed_yellow', 'mulch'];

// ================================================================ small utilities
const R4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod4 = (r) => ((r % 4) + 4) % 4;
const BACKK = { '+z': 0, '-x': 1, '-z': 2, '+x': 3 };

// footprints (voxels) of floor props: [width across the front, depth]
const FP = {
  sofa: [8.2, 3.8], loveseat: [5.8, 3.8], armchair: [3.6, 3.6], rocking_chair: [2.8, 4.2], chair_wood: [2.2, 2.2], chair_kitchen: [2.2, 2.2],
  chair_upholstered_dining: [2.2, 2.2], chair_folding: [2, 2.2], chair_office: [2.6, 2.6], stool_tall: [2, 2], piano_bench: [3.2, 1.8], highchair: [2.4, 2.6],
  table_dining: [6.2, 3.8], table_kitchen: [4.8, 3.2], table_round: [3.4, 3.4], table_coffee: [4.6, 2.4], table_side: [2.2, 2.4], table_card: [3.6, 3.6],
  desk_wood: [5.4, 3.2], desk_office: [5.6, 3.2], desk_rolltop: [5.4, 3.2], writing_desk: [3.4, 3], sideboard: [6.2, 2.4], cabinet_china: [4.2, 2.2],
  bookshelf: [4.2, 1.7], bookshelf_low: [4.2, 1.7], bed_double: [5.8, 8.3], bed_single: [4, 8.3], bunk_bed: [4.2, 8.3], crib: [3.2, 5.4], cot: [3, 7.6],
  dresser: [4.7, 2.4], wardrobe: [4.2, 3], nightstand: [2.2, 2.2], trunk: [3.6, 2.4], cedar_chest: [4.6, 2.2], toy_chest: [3.4, 2.2],
  stove: [4.1, 3], fridge: [3.2, 3.2], kitchen_counter: [3.4, 3], kitchen_sink: [3.4, 3], icebox: [3, 2.7], washing_machine: [3, 3],
  tv_console: [3.4, 2.4], radio_console: [3, 2], phonograph: [3.6, 2.4], piano_upright: [6.2, 3], clock_grandfather: [2.4, 1.7], lamp_floor: [2.4, 2.4],
  sewing_machine: [4, 2.4], ironing_board: [5, 1.6], bathtub: [7.2, 3.2], toilet: [2, 3], sink_pedestal: [2.2, 2], coat_rack: [3, 3],
  umbrella_stand: [1.4, 1.4], telephone_table: [3, 2], plant_pot: [2, 2], fern_stand: [2, 2], rubber_plant: [2.4, 2.4], dollhouse: [3.6, 2.4],
  rocking_horse: [2.4, 4.4], easel: [2.6, 2.6], globe_desk: [2, 2], magazine_rack: [2, 1.4], radiator: [3.6, 1.2], bassinet: [2.4, 4],
  sewing_dummy: [2.4, 2.4], display_case_museum: [5, 3], ship_model_case: [5, 2.4], filing_cabinet: [2, 3.2], laundry_basket: [2.2, 2.2],
  suitcase: [3, 1.4], toy_train: [4, 4], teddy_bear: [1.4, 1.4], figurehead: [3, 4], mannequin: [2.4, 2.4], trophy_case: [5, 2],
};
// height (voxels) of the top surface of furniture, for things placed on it
const TOP = { table_dining: 3, table_kitchen: 3, table_coffee: 1.75, table_side: 2.5, table_round: 3, table_card: 3.2, desk_wood: 3, desk_office: 3.4, desk_rolltop: 3,
  writing_desk: 2.8, sideboard: 3.5, kitchen_counter: 3.75, nightstand: 2.75, dresser: 3.5, bookshelf_low: 3.2, trunk: 2.4, cedar_chest: 2.25, toy_chest: 2.25,
  radio_console: 4.2, piano_upright: 5.2, cabinet_china: 7.4, stove: 3.75, telephone_table: 2.8, filing_cabinet: 5.2 };
const TALL = new Set(['bookshelf', 'wardrobe', 'cabinet_china', 'clock_grandfather', 'fridge', 'piano_upright', 'dresser', 'coat_rack', 'lamp_floor', 'rubber_plant', 'filing_cabinet', 'icebox', 'sewing_dummy', 'mannequin', 'figurehead', 'trophy_case', 'stove']);

// ================================================================ Room: an enclosed, finished, furnishable space
// Air box (x0, y, z0, w, h, d) in the building's local voxels. Furnishing works in room coordinates:
// u runs along the "back" wall, v is the distance from it; rot 0 faces away from the back wall.
class Room {
  constructor(H, name, x0, y, z0, w, d, h, o = {}) {
    this.H = H; this.b = H.b; this.f = H.f; this.rng = H.rng.fork(name + x0 + ',' + y + ',' + z0);
    this.name = name; this.x0 = x0; this.y = y; this.z0 = z0; this.w = w; this.d = d; this.h = h; this.fn = o.fn || null;
    this.id = H.b.room(name, x0, y, z0, w, h, d, { kind: o.kind || 'room', lightMode: o.lightMode, lightColor: o.lightColor, lightPower: o.lightPower, ambient: o.ambient, nav: o.nav, public: o.public });
    this.doorsB = []; this.winsB = []; this.claims = []; this.hungs = []; this.zones = null;
    this.setBack(o.back || '+z');
    H.rooms.push(this);
  }
  setBack(back) {
    this.back = back; this.k = BACKK[back];
    const zAxis = back === '+z' || back === '-z';
    this.U = zAxis ? this.w : this.d; this.V = zAxis ? this.d : this.w;
    this.zones = null;
  }
  // room (u,v) -> building local (x,z)
  xz(u, v) {
    const { x0, z0, w, d } = this;
    switch (this.back) {
      case '+z': return [x0 + u, z0 + d - v];
      case '-z': return [x0 + w - u, z0 + v];
      case '+x': return [x0 + w - v, z0 + d - u];
      default: return [x0 + v, z0 + u];
    }
  }
  uv(x, z) {
    const { x0, z0, w, d } = this;
    switch (this.back) {
      case '+z': return [x - x0, z0 + d - z];
      case '-z': return [x0 + w - x, z - z0];
      case '+x': return [z0 + d - z, x0 + w - x];
      default: return [z - z0, x - x0];
    }
  }
  r(rot) { return mod4(rot + this.k); }
  // building side ('+z' etc) of a room-relative side
  bside(side) {
    const order = ['back', 'right', 'front', 'left']; // clockwise from back when looking down with back at +z... resolved via table
    void order;
    const T = { '+z': { back: '+z', front: '-z', left: '-x', right: '+x' }, '-z': { back: '-z', front: '+z', left: '+x', right: '-x' },
      '+x': { back: '+x', front: '-x', left: '+z', right: '-z' }, '-x': { back: '-x', front: '+x', left: '-z', right: '+z' } };
    return T[this.back][side];
  }
  rside(bs) { for (const s of ['back', 'front', 'left', 'right']) if (this.bside(s) === bs) return s; return 'back'; }
  // ---------------------------------------------------------------- registration (building coords)
  markDoor(x, z, w = 4) { this.doorsB.push({ x, z, w }); this.zones = null; }
  markWin(bs, a0, a1) { this.winsB.push({ bs, a0, a1 }); this.zones = null; }
  _zones() {
    if (this.zones) return this.zones;
    const Z = { doors: [], wins: [], doorSides: [] };
    for (const dd of this.doorsB) {
      const [u, v] = this.uv(dd.x, dd.z);
      let side, t;
      const dv0 = Math.abs(v), dv1 = Math.abs(v - this.V), du0 = Math.abs(u), du1 = Math.abs(u - this.U);
      const m = Math.min(dv0, dv1, du0, du1);
      if (m === dv0) { side = 'back'; t = u; } else if (m === dv1) { side = 'front'; t = u; } else if (m === du0) { side = 'left'; t = v; } else { side = 'right'; t = v; }
      const hw = dd.w / 2 + 0.8, dep = 4.6;
      let rc;
      if (side === 'back') rc = [t - hw, 0, t + hw, dep];
      else if (side === 'front') rc = [t - hw, this.V - dep, t + hw, this.V];
      else if (side === 'left') rc = [0, t - hw, dep, t + hw];
      else rc = [this.U - dep, t - hw, this.U, t + hw];
      Z.doors.push(rc); Z.doorSides.push({ side, t0: t - hw, t1: t + hw });
    }
    for (const ww of this.winsB) {
      const side = this.rside(ww.bs);
      const along = side === 'back' || side === 'front';
      const p0 = ww.bs === '+z' || ww.bs === '-z' ? this.uv(ww.a0, this.z0) : this.uv(this.x0, ww.a0);
      const p1 = ww.bs === '+z' || ww.bs === '-z' ? this.uv(ww.a1, this.z0) : this.uv(this.x0, ww.a1);
      const t0 = Math.min(along ? p0[0] : p0[1], along ? p1[0] : p1[1]) - 0.4, t1 = Math.max(along ? p0[0] : p0[1], along ? p1[0] : p1[1]) + 0.4;
      Z.wins.push({ side, t0, t1 });
    }
    this.zones = Z;
    return Z;
  }
  // ---------------------------------------------------------------- occupancy
  _rect(u, v, fw, fd, rot) { const q = mod4(Math.round(rot)); const du = q % 2 === 0 ? fw : fd, dv = q % 2 === 0 ? fd : fw; return [u - du / 2, v - dv / 2, u + du / 2, v + dv / 2]; }
  free(rc, tall = false) {
    const e = 0.02;
    if (rc[0] < -e || rc[1] < -e || rc[2] > this.U + e || rc[3] > this.V + e) return false;
    const ov = (a) => rc[0] < a[2] - e && rc[2] > a[0] + e && rc[1] < a[3] - e && rc[3] > a[1] + e;
    for (const a of this.claims) if (ov(a)) return false;
    const Z = this._zones();
    for (const a of Z.doors) if (ov(a)) return false;
    if (tall) for (const w of Z.wins) {
      const a = w.side === 'back' ? [w.t0, 0, w.t1, 1.6] : w.side === 'front' ? [w.t0, this.V - 1.6, w.t1, this.V] : w.side === 'left' ? [0, w.t0, 1.6, w.t1] : [this.U - 1.6, w.t0, this.U, w.t1];
      if (ov(a)) return false;
    }
    return true;
  }
  claim(rc) { this.claims.push(rc); }
  fit(u, v, fw, fd, rot, tall) { const rc = this._rect(u, v, fw, fd, rot); if (!this.free(rc, tall)) return false; this.claim(rc); return true; }
  // ---------------------------------------------------------------- placement
  prop(type, u, v, rot = 0, o = {}, dy = 0) { const [x, z] = this.xz(u, v); return this.f.prop(type, x, this.y + dy, z, this.r(rot), o); }
  spot(pose, u, v, rot, o = {}) { const [x, z] = this.xz(u, v); return this.b.spot(pose, x, this.y, z, this.r(rot), { room: this.id, ...o }); }
  read(u, v, dy, text, o = {}) { const [x, z] = this.xz(u, v); this.b.readable(x, this.y + dy, z, text, o); }
  light(u, v, dy, o) { const [x, z] = this.xz(u, v); return this.b.light(x, this.y + dy, z, { room: this.id, mode: 'room', ...o }); }
  // voxel box in room coords (u0..u0+du, v0..v0+dv), y offset from floor
  box(u0, v0, du, dv, y0, h, mat) {
    const a = this.xz(u0, v0), c = this.xz(u0 + du, v0 + dv);
    const x = Math.min(a[0], c[0]), z = Math.min(a[1], c[1]);
    this.f.box(Math.round(x), this.y + y0, Math.round(z), Math.round(Math.abs(c[0] - a[0])), h, Math.round(Math.abs(c[1] - a[1])), mat);
  }
  // where an item of (fw x fd) stands with its back to a wall at position t along it
  wallPos(side, t, fw, fd, gap = 0.12) {
    if (side === 'back') return { u: t, v: fd / 2 + gap, rot: 0 };
    if (side === 'front') return { u: t, v: this.V - fd / 2 - gap, rot: 2 };
    if (side === 'left') return { u: fd / 2 + gap, v: t, rot: 1 };
    return { u: this.U - fd / 2 - gap, v: t, rot: 3 };
  }
  sideLen(side) { return side === 'back' || side === 'front' ? this.U : this.V; }
  // floor item against a wall; prefs = fractions along the wall (0..1) or {at: voxels}
  wall(type, sides, prefs = [0.5, 0.25, 0.75, 0.1, 0.9], o = {}) {
    const [fw, fd] = o.fp || FP[type] || [3, 3];
    const tall = o.tall ?? TALL.has(type);
    for (const side of [].concat(sides)) {
      const L = this.sideLen(side);
      if (L < fw + 0.2) continue;
      for (const p of prefs) {
        const t = clamp(typeof p === 'object' ? p.at : p * L, fw / 2 + 0.15, L - fw / 2 - 0.15);
        const pl = this.wallPos(side, t, fw, fd, o.gap ?? 0.12);
        if (this.fit(pl.u, pl.v, fw, fd, pl.rot, tall)) {
          pl.side = side; pl.t = t; pl.fw = fw; pl.fd = fd;
          if (type) this.prop(type, pl.u, pl.v, pl.rot, o.po || {});
          return pl;
        }
      }
    }
    return null;
  }
  // free-standing item at (u,v)
  at(type, u, v, rot, o = {}) {
    const [fw, fd] = o.fp || FP[type] || [3, 3];
    if (!o.force && !this.fit(u, v, fw, fd, rot, o.tall ?? false)) return null;
    if (o.force) this.claim(this._rect(u, v, fw, fd, rot));
    if (type) this.prop(type, u, v, rot, o.po || {});
    return { u, v, rot };
  }
  // a chair + sit spot in front of a placement pl (facing into it), at distance dist
  hang(type, side, t, dy, o = {}) {
    const hw = (o.w ?? 3) / 2;
    const Z = this._zones();
    for (const w of Z.wins) if (w.side === side && t + hw > w.t0 && t - hw < w.t1 && dy < 9) return null;
    for (const d of Z.doorSides) if (d.side === side && t + hw > d.t0 + 0.5 && t - hw < d.t1 - 0.5) return null;
    for (const hg of this.hungs) if (hg.side === side && t + hw > hg.t0 && t - hw < hg.t1 && Math.abs(hg.dy - dy) < 3.5) return null;
    const L = this.sideLen(side);
    if (t - hw < 0 || t + hw > L) return null;
    this.hungs.push({ side, t0: t - hw, t1: t + hw, dy });
    const p = side === 'back' ? [t, 0.04, 0] : side === 'front' ? [t, this.V - 0.04, 2] : side === 'left' ? [0.04, t, 1] : [this.U - 0.04, t, 3];
    if (type) this.prop(type, p[0], p[1], p[2], o.po || {}, dy);
    return { u: p[0], v: p[1], rot: p[2] };
  }
  // try hanging on any of the sides at several positions
  hangAny(type, sides, dy, o = {}, prefs = [0.5, 0.3, 0.7, 0.15, 0.85]) {
    for (const s of [].concat(sides)) for (const p of prefs) { const r = this.hang(type, s, p * this.sideLen(s), dy, o); if (r) { r.side = s; return r; } }
    return null;
  }
  // Point in front of a wall placement pl at distance dd (towards the room)
  before(pl, dd) { const v = R4[mod4(pl.rot)]; return { u: pl.u + v[0] * dd, v: pl.v - v[1] * dd }; }
}
// NB: room-space direction vectors: rot 0 = +v, rot 1 = +u, rot 2 = -v, rot 3 = -u.
const RV = [[0, 1], [1, 0], [0, -1], [-1, 0]];
function ahead(pl, dd) { const q = RV[mod4(Math.round(pl.rot))]; return { u: pl.u + q[0] * dd, v: pl.v + q[1] * dd }; }

// sit spot helper
function sit(R, u, v, rot, act, tags, seat = 0.45, o = {}) { return R.spot('sit', u, v, rot, { act, tags, seat, ...o }); }

// ================================================================ house context & structure helpers
function makeH(ctx, b, rng, lot, spec) {
  const f = b.f;
  return {
    ctx, b, f, rng, lot, spec, W: lot.w, D: lot.d, rooms: [],
    home: { beds: [], dine: [], lounge: [], kitchen: [], bath: [], yard: [], porch: [], desk: [] },
    yardNodes: [], extra: {},
    L: f.faceFrame('left'), Rf: f.faceFrame('right'), B: f.faceFrame('back'),
  };
}
// the Frame for an exterior wall side, and the conversion of (a = min coord along the wall, wall voxel c)
function sideFrame(H, bs) { return bs === '-z' ? H.f : bs === '+z' ? H.B : bs === '-x' ? H.L : H.Rf; }
function sideCoords(H, bs, a, w, c) {
  if (bs === '-z') return [a, c];
  if (bs === '+z') return [H.W - a - w, H.D - c - 1];
  if (bs === '-x') return [H.D - a - w, c];
  return [a, H.W - c - 1];
}
// window on any exterior wall. bs: '-z' front | '+z' back | '-x' left | '+x' right; a = min coord along the wall
// (x for front/back, z for sides); c = the wall's OUTER voxel (z for front/back walls, x for side walls).
function wWin(H, bs, a, y, c, w, h, o = {}, room = null) {
  const F = sideFrame(H, bs);
  const [xf, zf] = sideCoords(H, bs, a, w, c);
  win(F, xf, y, zf, w, h, { t: 2, ...o });
  if (o.curtain) {
    const cm = o.curtain, t = o.t ?? 2;
    F.box(xf - 1, y - 1, zf + t, 1, h + 1, 1, cm); F.box(xf + w, y - 1, zf + t, 1, h + 1, 1, cm);
    F.box(xf - 1, y + h, zf + t, w + 2, 1, 1, o.valance ?? cm);
  }
  if (o.star) { // Blue Star / Gold Star service flag hanging inside the window
    const z = zf + 1 + 0; void z;
    const sx = xf + Math.floor(w / 2) - 1, sy = y + h - 4;
    F.box(sx, sy, zf + 2, 2, 3, 1, MAT.flag_red); F.box(sx, sy + 1, zf + 2, 2, 1, 1, MAT.flag_white);
    F.box(sx + (w > 3 ? 0 : 0), sy + 1, zf + 2, 1, 1, 1, o.star === 'gold' ? MAT.trim_gold : MAT.flag_blue);
  }
  if (room) room.markWin(bs, a, a + w);
}
// generic box on an exterior wall face (outward = toward the outside); dz = distance out from the outer face
function wBox(H, bs, a, y, c, w, h, out, mat, dz = 0) {
  const F = sideFrame(H, bs);
  const [xf, zf] = sideCoords(H, bs, a, w, c);
  F.box(xf, y, zf - dz - out, w, h, out, mat);
}
// doorway through a 2-voxel partition whose edge is at (x|z). axis 'x' = wall along x (edge at z); 'z' = wall along z (edge at x)
function opening(H, x, y, z, axis, w = 4, h = 9, trim = null) {
  const f = H.f;
  if (axis === 'x') {
    f.carve(Math.round(x - w / 2), y, z - 1, w, h, 2);
    if (trim) { f.box(Math.round(x - w / 2) - 1, y, z - 1, 1, h + 1, 2, trim); f.box(Math.round(x + w / 2), y, z - 1, 1, h + 1, 2, trim); f.box(Math.round(x - w / 2) - 1, y + h, z - 1, w + 2, 1, 2, trim); }
  } else {
    f.carve(x - 1, y, Math.round(z - w / 2), 2, h, w);
    if (trim) { f.box(x - 1, y, Math.round(z - w / 2) - 1, 2, h + 1, 1, trim); f.box(x - 1, y, Math.round(z + w / 2), 2, h + 1, 1, trim); f.box(x - 1, y + h, Math.round(z - w / 2) - 1, 2, 1, w + 2, trim); }
  }
}
// connect two rooms with a doorway at the partition edge (x,z)
function connect(H, A, Bm, x, z, axis, o = {}) {
  const y = A.y, w = o.w ?? 4;
  opening(H, x, y, z, axis, w, o.h ?? 9, o.trim === undefined ? H.pal.itrim : o.trim);
  const dn = H.b.door(o.viaA !== undefined ? null : A.id, Bm.id, x, y, z, { axis, leaf: o.leaf === undefined ? 'door_wood' : o.leaf, width: w, tint: o.tint ?? H.pal.idoor });
  if (o.viaA !== undefined) H.ctx.nav.link(dn, o.viaA);
  A.markDoor(x, z, w); Bm.markDoor(x, z, w);
}
// finish a room: carve the air, paint floor, ceiling, wall ring, baseboard, optional wainscot/crown
function finish(H, R, o = {}) {
  const f = H.f, { x0, y, z0, w, d, h } = R;
  f.carve(x0, y, z0, w, h, d);
  if (o.floor !== null) f.box(x0, y - 1, z0, w, 1, d, o.floor ?? MAT.floor_oak);
  if (o.ceil !== null) f.box(x0, y + h, z0, w, 1, d, o.ceil ?? MAT.ceiling);
  f.walls(x0 - 1, y, z0 - 1, w + 2, h, d + 2, o.wall ?? MAT.plaster_cream, 1);
  if (o.wainscot) { f.walls(x0 - 1, y, z0 - 1, w + 2, 4, d + 2, o.wainscot, 1); f.walls(x0 - 1, y + 4, z0 - 1, w + 2, 1, d + 2, o.rail ?? MAT.wood_dark, 1); }
  if (o.base !== null) f.walls(x0 - 1, y, z0 - 1, w + 2, 1, d + 2, o.base ?? MAT.wood_dark, 1);
  if (o.crown) f.walls(x0 - 1, y + h - 1, z0 - 1, w + 2, 1, d + 2, o.crown, 1);
  if (o.rug) f.box(x0 + o.rug[0], y - 1, z0 + o.rug[1], w - o.rug[0] * 2, 1, d - o.rug[1] * 2, o.rugMat);
  R.finished = true;
}
// Straight stair flight: first step footprint min corner (x, z), rising `rise` steps along dir, 4 wide, run 2.
// Carves headroom (up to topY). Adds a banister on the open side ('L'|'R' relative to x). Returns bottom/top points.
function stairFlight(H, x, y, z, dir, rise, o = {}) {
  const f = H.f, w = o.w ?? 4, run = o.run ?? 2, mat = o.mat ?? MAT.wood_mid, head = o.head ?? 10, topY = o.topY ?? 1e9;
  const dx = dir === '+x' ? 1 : dir === '-x' ? -1 : 0, dz = dir === '+z' ? 1 : dir === '-z' ? -1 : 0;
  const rect = (i) => {
    const ax = x + dx * i * run, az = z + dz * i * run;
    return [dx === 0 ? x : (dx > 0 ? ax : ax - run + 1), dz === 0 ? z : (dz > 0 ? az : az - run + 1), dx === 0 ? w : run, dz === 0 ? w : run];
  };
  for (let i = 0; i < rise; i++) {
    const [bx, bz, sx, sz] = rect(i);
    if (o.thin) f.box(bx, y + i, bz, sx, 1, sz, mat);
    else f.box(bx, y, bz, sx, i + 1, sz, mat);
    if (o.tread) f.box(bx, y + i, bz, sx, 1, sz, o.tread);
    const hh = Math.min(head, topY - (y + i + 1));
    if (hh > 0) f.carve(bx, y + i + 1, bz, sx, hh, sz);
  }
  // runner carpet down the middle
  if (o.runner) for (let i = 0; i < rise; i++) { const [bx, bz, sx, sz] = rect(i); if (dx === 0) f.box(bx + 1, y + i, bz, sx - 2, 1, sz, o.runner); else f.box(bx, y + i, bz + 1, sx, 1, sz - 2, o.runner); }
  // banister on the open side
  if (o.rail) {
    const rm = o.railMat ?? MAT.wood_dark;
    for (let i = 0; i < rise; i++) {
      const [bx, bz, sx, sz] = rect(i);
      let px, pz, lx = 1, lz = 1;
      if (dx === 0) { px = o.rail === 'R' ? bx + sx : bx - 1; pz = bz; lz = sz; } else { pz = o.rail === 'R' ? bz + sz : bz - 1; px = bx; lx = sx; }
      if (i % 2 === 0) f.box(px, y + i + 1, pz, 1, 3, 1, o.baluster ?? MAT.trim_white);
      f.box(px, y + i + 4, pz, lx, 1, lz, rm);
    }
    // newel post
    const [bx, bz, sx, sz] = rect(0);
    if (dx === 0) f.box(o.rail === 'R' ? bx + sx : bx - 1, y, dz > 0 ? bz - 1 : bz + sz, 1, 6, 1, rm);
    else f.box(dx > 0 ? bx - 1 : bx + sx, y, o.rail === 'R' ? bz + sz : bz - 1, 1, 6, 1, rm);
  }
  const r0 = rect(0), rl = rect(rise - 1);
  const cx = (r) => r[0] + r[2] / 2, cz = (r) => r[1] + r[3] / 2;
  return {
    bottom: { x: cx(r0) - dx * (run + 0.5), z: cz(r0) - dz * (run + 0.5), y },
    top: { x: cx(rl) + dx * (run + 0.8), z: cz(rl) + dz * (run + 0.8), y: y + rise },
  };
}
// Guard rail with balusters along x or z (at floor level y)
function railing(H, x, y, z, len, axis, o = {}) {
  const f = H.f, m = o.mat ?? MAT.wood_dark, bal = o.bal ?? MAT.trim_white, h = o.h ?? 4, step = o.step ?? 2;
  if (axis === 'x') { f.box(x, y + h - 1, z, len, 1, 1, m); for (let i = 0; i < len; i += step) f.box(x + i, y, z, 1, h - 1, 1, bal); f.box(x, y, z, len, 1, 1, o.bottom ?? m); }
  else { f.box(x, y + h - 1, z, 1, 1, len, m); for (let i = 0; i < len; i += step) f.box(x, y, z + i, 1, h - 1, 1, bal); f.box(x, y, z, 1, 1, len, o.bottom ?? m); }
}
// small voxel US flag on a bracket (flies toward -z of frame F); (x,y,z) = bracket foot on the wall face
function voxFlag(F, x, y, z, big = false) {
  F.box(x, y, z - 1, 1, 1, 1, MAT.iron); F.box(x + 1, y + 1, z - 2, 1, 1, 1, MAT.iron); F.box(x + 2, y + 2, z - 3, 1, 1, 1, MAT.iron);
  const w = big ? 5 : 4, h = big ? 4 : 3;
  const fx = x + 2, fy = y + 2 - h + 1 + 1, fz = z - 3;
  for (let r = 0; r < h; r++) F.box(fx + 1, fy + r, fz, w, 1, 1, r % 2 === 0 ? MAT.flag_red : MAT.flag_white);
  F.box(fx + 1, fy + h - 2, fz, 2, 2, 1, MAT.flag_blue);
}
// Row of alternating colour bunting (thin swags) along x from x0 for len at height y on plane z of frame F
function bunting(F, x0, y, z, len, mats, sag = true) {
  let i = 0;
  for (let x = x0; x < x0 + len; x += 2) {
    const k = (x - x0) % 8, dy = sag ? (k === 2 || k === 4 ? -1 : 0) : 0;
    F.box(x, y + dy, z, 1, 1, 1, mats[i++ % mats.length]);
    F.box(x + 1, y + dy - (k === 2 ? 0 : 0), z, 1, 1, 1, mats[(i + 1) % mats.length]);
  }
}
// Exterior chimney stack against a side wall. F/side frame coords: (x = along wall min, zOut = wall outer face), from ground to top
function extChimney(F, x, zWall, top, mat = MAT.brick_red, o = {}) {
  const w = o.w ?? 6, d = o.d ?? 3, sh = o.shoulder ?? Math.round(top * 0.45);
  F.box(x, -1, zWall - d, w, sh + 1, d, mat);                     // wide base with the firebox
  F.box(x, sh, zWall - d, w, 1, d, MAT.stone_foundation);            // weathering course
  F.box(x + 1, sh + 1, zWall - d + 1, w - 2, top - sh - 1, d - 1, mat); // narrow stack
  F.box(x, top, zWall - d, w, 1, d + 1, MAT.stone_foundation);        // cap
  F.carve(x + 2, top, zWall - d + 1, 1, 1, 1);
  if (o.pots !== false) { F.prop('chimney_pot', x + 2, top + 1, zWall - d / 2 - 0.2, 0, {}); if (w > 5) F.prop('chimney_pot', x + w - 2, top + 1, zWall - d / 2 - 0.2, 0, {}); }
}
// Roof chimney (above a ceiling), with cap and pots
function roofChimney(f, x, y, z, w, d, top, mat = MAT.brick_red, pots = 1) {
  f.box(x, y, z, w, top - y, d, mat);
  f.box(x - 1, top, z - 1, w + 2, 1, d + 2, MAT.stone_foundation);
  f.box(x, top - 3, z, w, 1, d, MAT.brick_dark);
  for (let i = 0; i < pots; i++) f.prop('chimney_pot', x + (i + 0.5) * w / pots, top + 1, z + d / 2, 0, {});
}
// Profile roof (hollow-free stepped mass) over x..x+sx, z..z+sz. axis 'x' = ridge along x. profile(j) -> inset at layer j (or -1 = stop)
function profileRoof(f, x, y, z, sx, sz, mat, fill, axis, profile, over = 2) {
  let j = 0;
  for (; j < 200; j++) {
    const i = profile(j);
    if (i < 0) break;
    const span = axis === 'x' ? sz : sx;
    if (span - 2 * i + 2 * over <= 0) break;
    if (axis === 'x') { f.box(x - over, y + j, z + i - over, sx + 2 * over, 1, sz - 2 * i + 2 * over, mat); if (fill && sz - 2 * i - 2 > 0) f.box(x, y + j, z + i + 1, sx, 1, sz - 2 * i - 2, fill); }
    else { f.box(x + i - over, y + j, z - over, sx - 2 * i + 2 * over, 1, sz + 2 * over, mat); if (fill && sx - 2 * i - 2 > 0) f.box(x + i + 1, y + j, z, sx - 2 * i - 2, 1, sz, fill); }
  }
  return j;
}
// Mansard (four-sided, steep lower slopes, low hip top). Returns total height.
function mansard(f, x, y, z, sx, sz, mat, fill, o = {}) {
  const steepH = o.steep ?? 9, flare = 1;
  // flared eave
  f.box(x - flare - 1, y, z - flare - 1, sx + 2 * flare + 2, 1, sz + 2 * flare + 2, o.eave ?? mat);
  for (let j = 1; j <= steepH; j++) {
    const i = Math.floor(j / 3.2);
    f.box(x + i - 1, y + j, z + i - 1, sx - 2 * i + 2, 1, sz - 2 * i + 2, mat);
    if (fill) f.box(x + i, y + j, z + i, sx - 2 * i, 1, sz - 2 * i, fill);
  }
  const i0 = Math.floor(steepH / 3.2);
  f.box(x + i0 - 2, y + steepH + 1, z + i0 - 2, sx - 2 * i0 + 4, 1, sz - 2 * i0 + 4, o.cornice ?? mat); // top cornice
  const hh = f.hip(x + i0, y + steepH + 2, z + i0, sx - 2 * i0, sz - 2 * i0, o.top ?? mat, { overhang: 0, rise: 1, fill: fill });
  void hh;
  return { steepH, i0, h: steepH + 2 + 3 };
}
// Stacked-cylinder cone (turret / tower roof) with a finial
function cone(f, cx, y, cz, r, h, mat, finial = MAT.iron) {
  for (let k = 0; k < h; k++) {
    const rr = r * (1 - k / h) + 0.35;
    f.cylinder(cx, y + k, cz, Math.max(0.6, rr), 1, mat);
  }
  f.box(Math.floor(cx), y + h, Math.floor(cz), 1, 3, 1, finial);
  f.box(Math.floor(cx), y + h + 3, Math.floor(cz), 1, 1, 1, MAT.trim_gold);
}

// ================================================================ furnishing library
// seats along a placed piece (sofa etc): offsets along its width, sitter faces the piece's front
function seatsOn(R, pl, offs, fwd, act, tags, seat = 0.43, o = {}) {
  const q = RV[mod4(Math.round(pl.rot))], lat = [q[1], -q[0]];
  return offs.map((d) => sit(R, pl.u + lat[0] * d + q[0] * fwd, pl.v + lat[1] * d + q[1] * fwd, pl.rot, act, tags, seat, o));
}
// something sitting on top of a placed piece (offset along width / depth)
function onTop(R, pl, type, dy, lat = 0, fwd = 0, o = {}, rot = null) {
  if (!pl) return;
  const q = RV[mod4(Math.round(pl.rot))], l = [q[1], -q[0]];
  R.prop(type, pl.u + l[0] * lat + q[0] * fwd, pl.v + l[1] * lat + q[1] * fwd, rot ?? pl.rot, o, dy);
}
// a chair facing a placed piece (desk, vanity) at distance dd in front of it
function chairAt(R, pl, dd, chair, act, tags, o = {}) {
  const p = ahead(pl, dd), rot = mod4(pl.rot + 2);
  if (!R.fit(p.u, p.v, 2.2, 2.2, rot, false)) return null;
  if (chair) R.prop(chair, p.u, p.v, rot, o.po || {});
  return sit(R, p.u, p.v, rot, act, tags, o.seat ?? 0.45);
}
const ART = ['#8ab0d0', '#c8a870', '#6a8a5a', '#b06a4a', '#5a7aa0', '#a0a878', '#7a5a8a'];
function art(R, sides, dy = 6.5) {
  const rng = R.rng;
  if (R.H.lite && rng.chance(0.55)) return null;
  const t = rng.weighted([['painting', 5], ['portrait', 2], ['photo_frames', 3], ['mirror_wall', 1], ['clock_wall', 1]]);
  return R.hangAny(t, sides, t === 'mirror_wall' ? 4.5 : dy, { w: t === 'painting' ? 4 : 3, po: { tint: rng.pick(ART) } }, [rng.float(0.3, 0.7), 0.5, 0.25, 0.75]);
}
// voxel pennant / small plaque text on a wall (prop-scale sign)
function wallSign(R, text, side, t, dy, bg, fg, scale = 1 / 28) {
  const ty = textSignType(text, { bg, fg, border: bg, scale });
  return R.hang(ty, side, t, dy, { w: text.length * 4 * scale * 4 + 1 });
}
// model airplane hanging from the ceiling (voxels), at room (u,v)
function modelPlane(R, u, v, c1 = MAT.sign_red, c2 = MAT.sign_yellow) {
  const y = R.h - 3;
  R.box(u - 1, v, 3, 1, y, 1, c1);           // fuselage
  R.box(u, v - 1, 1, 3, y, 1, c2);           // wings
  R.box(u - 1, v, 1, 1, y + 1, 1, c1);       // tail fin
  R.box(u, v, 1, 1, y + 1, 2, MAT.iron);     // string
}
// a rug (prop) centred in the room or at (u,v)
function rug(R, type = 'rug_rect', u = null, v = null, tint = null, rot = 0) { R.prop(type, u ?? R.U / 2, v ?? R.V / 2, rot, { tint: tint ?? R.rng.pick(RUGS) }); }
// radiator under a window or against a wall
function radiator(R) {
  if (R.H.lite) return; R.wall('radiator', ['left', 'right', 'front', 'back'], [0.5, 0.3, 0.7], { tall: false }); }

// ---------------------------------------------------------------- living room / parlour
function fLiving(H, R, o = {}) {
  const rng = R.rng, lounge = [];
  const tv = !!o.tv;
  const sofaT = rng.pick(FABRIC), chairT = rng.pick(FABRIC);
  rug(R, rng.chance(0.5) ? 'rug_oval' : 'rug_rect', R.U / 2, R.V / 2);
  // media wall opposite the sofa
  const media = R.wall(tv ? 'tv_console' : (rng.chance(0.6) ? 'radio_console' : 'phonograph'), 'front', [0.5, 0.35, 0.65, 0.2, 0.8]);
  const sofa = R.wall(rng.chance(0.8) ? 'sofa' : 'loveseat', 'back', [0.5, 0.4, 0.6, 0.3, 0.7], { po: { tint: sofaT } });
  if (sofa) {
    const n = sofa.fw > 7 ? [-2.5, 0, 2.5] : [-1.4, 1.4];
    lounge.push(...seatsOn(R, sofa, n, 0.2, tv ? 'watch' : rng.pick(['read', 'sit', 'knit']), tv ? ['lounge', 'tv'] : ['lounge'], 0.43));
    const ct = ahead(sofa, 4.4);
    if (R.at('table_coffee', ct.u, ct.v, sofa.rot)) {
      R.prop(rng.pick(['books_stack', 'fruit_bowl', 'newspaper_pile', 'vase_flowers', 'magazine_rack']), ct.u + rng.float(-1, 1), ct.v, sofa.rot, { tint: rng.pick(QUILT) }, TOP.table_coffee);
      if (rng.chance(0.4)) R.prop('doily_table', ct.u - 1, ct.v, 0, {}, TOP.table_coffee);
    }
    for (const s of [-1, 1]) {
      const q = RV[mod4(sofa.rot)], lat = [q[1], -q[0]];
      const u = sofa.u + lat[0] * (sofa.fw / 2 + 1.3) * s, v = sofa.v + lat[1] * (sofa.fw / 2 + 1.3) * s;
      if (s < 0 ? R.at('table_side', u, v, sofa.rot) : R.at('lamp_floor', u, v, sofa.rot)) { if (s < 0) R.prop('lamp_table', u, v, sofa.rot, {}, TOP.table_side); }
    }
  }
  // armchairs on the side walls, angled toward the media wall
  for (const [side, rot] of [['left', 0.5], ['right', 3.5]]) {
    const pl = R.wall(rng.chance(0.25) ? 'rocking_chair' : 'armchair', side, [0.55, 0.45, 0.65, 0.35], { po: { tint: chairT } });
    if (!pl) continue;
    // re-orient: prop already placed facing inward; add an angled seat spot
    lounge.push(sit(R, pl.u, pl.v, tv ? rot : pl.rot, tv ? 'watch' : rng.pick(['read', 'knit', 'doze', 'smoke_pipe', 'read_book']), tv ? ['lounge', 'tv'] : ['lounge', 'read'], 0.42));
  }
  if (media && !tv && rng.chance(0.5)) onTop(R, media, 'photo_frames_standing', TOP.radio_console);
  // extras
  const extras = rng.shuffle(['bookshelf', 'piano_upright', 'fern_stand', 'clock_grandfather', 'cabinet_china', 'rubber_plant', 'magazine_rack', 'bookshelf_low']).slice(0, R.H.lite ? rng.int(1, 2) : rng.int(2, 4));
  if (o.piano) extras.unshift('piano_upright');
  for (const e of extras) {
    const pl = R.wall(e, ['left', 'right', 'front', 'back'], [0.12, 0.88, 0.2, 0.8, 0.5]);
    if (pl && e === 'piano_upright') {
      const bench = ahead(pl, 2.6);
      if (R.at('piano_bench', bench.u, bench.v, mod4(pl.rot + 2), { fp: [3.2, 1.8] })) lounge.push(sit(R, bench.u, bench.v, mod4(pl.rot + 2), 'piano', ['lounge', 'piano'], 0.5));
      onTop(R, pl, rng.pick(['candles_pair', 'photo_frames_standing', 'vase_flowers']), TOP.piano_upright, 1.5);
    }
    if (pl && e === 'bookshelf_low') onTop(R, pl, rng.pick(['books_stack', 'globe_desk', 'photo_frames_standing', 'plant_pot']), TOP.bookshelf_low);
  }
  art(R, ['back']); art(R, ['left', 'right']); if (rng.chance(0.6)) art(R, ['right', 'left']);
  R.prop('ceiling_lamp', R.U / 2, R.V / 2, 0, {}, R.h - 2);
  radiator(R);
  return { lounge, media, sofa };
}

// ---------------------------------------------------------------- dining room
function fDining(H, R, o = {}) {
  const rng = R.rng, seats = [];
  const n = o.seats ?? rng.pick([4, 4, 6]);
  const alongU = R.U >= R.V;
  const cu = R.U / 2 + (o.du ?? 0), cv = R.V / 2 + (o.dv ?? 0);
  const trot = alongU ? 0 : 1;
  rug(R, 'rug_rect', cu, cv, o.rugTint ?? rng.pick(RUGS), trot);
  const tables = n > 6 ? Math.ceil((n - 2) / 4) : 1;
  const tlen = 6;
  const L = tables * tlen;
  for (let i = 0; i < tables; i++) {
    const off = (i - (tables - 1) / 2) * tlen;
    const u = alongU ? cu + off : cu, v = alongU ? cv : cv + off;
    R.prop(o.table ?? 'table_dining', u, v, trot, { tint: o.cloth ?? '#e8e0d0' });
  }
  R.claim(alongU ? [cu - L / 2 - 0.2, cv - 1.9, cu + L / 2 + 0.2, cv + 1.9] : [cu - 1.9, cv - L / 2 - 0.2, cu + 1.9, cv + L / 2 + 0.2]);
  const chair = o.chair ?? rng.pick(['chair_wood', 'chair_upholstered_dining', 'chair_wood']);
  const place = (u, v, rot) => {
    if (seats.length >= n) return;
    if (!R.fit(u, v, 2, 2, rot, false)) { if (!o.force) return; R.claim(R._rect(u, v, 2, 2, rot)); }
    R.prop(chair, u, v, rot, { tint: o.chairTint });
    seats.push(sit(R, u, v, rot, o.act ?? 'eat', o.tags ?? ['dine'], 0.45));
    const q = RV[rot];
    if (o.settings !== false) R.prop('table_setting', u + q[0] * 2.3, v + q[1] * 2.3, mod4(rot + 2), {}, TOP.table_dining);
  };
  // long sides first (they are rarely blocked), then the ends, then staggered backups
  const perSide = Math.max(1, Math.min(Math.floor(n / 2), Math.floor((L + 0.6) / 2.9)));
  const sp = Math.min(3.1, L / perSide);
  const sideAt = (off) => { if (alongU) { place(cu + off, cv - 3.0, 0); place(cu + off, cv + 3.0, 2); } else { place(cu - 3.0, cv + off, 1); place(cu + 3.0, cv + off, 3); } };
  for (let i = 0; i < perSide; i++) sideAt((i - (perSide - 1) / 2) * sp);
  if (alongU) { place(cu - L / 2 - 1.3, cv, 1); place(cu + L / 2 + 1.3, cv, 3); } else { place(cu, cv - L / 2 - 1.3, 0); place(cu, cv + L / 2 + 1.3, 2); }
  for (let i = 0; i < perSide + 1; i++) sideAt((i - perSide / 2) * sp);
  if (o.centerpiece !== false) R.prop(o.centerpiece ?? rng.pick(['vase_flowers', 'candles_pair', 'fruit_bowl']), cu, cv, 0, { tint: rng.pick(['#d85a6a', '#e0c040', '#c8a0d8']) }, TOP.table_dining);
  if (!o.bare) {
    const sb = R.wall(rng.chance(0.6) ? 'sideboard' : 'cabinet_china', ['back', 'front', 'left', 'right'], [0.5, 0.3, 0.7]);
    if (sb && sb.fw > 5) { onTop(R, sb, rng.pick(['teapot_set', 'candles_pair', 'fruit_bowl']), TOP.sideboard, -1.5); onTop(R, sb, rng.pick(['vase_flowers', 'photo_frames_standing', 'coffee_pot']), TOP.sideboard, 1.6); }
    if (rng.chance(0.6)) R.wall('cabinet_china', ['left', 'right', 'front', 'back'], [0.2, 0.8, 0.5]);
    R.prop(rng.chance(0.5) ? 'chandelier' : 'ceiling_lamp', cu, cv, 0, {}, R.h - (rng.chance(0.5) ? 3.8 : 2));
    art(R, ['back', 'front']); art(R, ['left', 'right']);
  }
  radiator(R);
  return { seats };
}

// ---------------------------------------------------------------- kitchen
function fKitchen(H, R, o = {}) {
  const rng = R.rng, spots = [];
  const tint = o.tint ?? rng.pick(['#d8c89a', '#c84a3a', '#5ab0a8', '#e8e0c8', '#e0b050', '#7ab07a', '#e8e8e0']);
  const old = o.old ?? rng.chance(0.2);
  const items = [old ? 'icebox' : 'fridge', 'kitchen_counter', 'stove', 'kitchen_counter', 'kitchen_sink', 'kitchen_counter', 'kitchen_counter'];
  // counter run: back wall, then continue on the left wall
  let t = 0.2;
  const placed = [];
  for (const side of ['back', 'left']) {
    const L = R.sideLen(side);
    t = side === 'back' ? 0.15 : 3.4;
    while (items.length && t < L - 1) {
      const it = items[0];
      const [fw, fd] = FP[it];
      if (t + fw > L - 0.1) break;
      const pl = R.wallPos(side, t + fw / 2, fw, fd, 0.05);
      if (R.fit(pl.u, pl.v, fw, fd, pl.rot, TALL.has(it) && false)) {
        R.prop(it, pl.u, pl.v, pl.rot, { tint });
        pl.type = it; placed.push(pl); items.shift();
        if (it !== 'fridge' && it !== 'icebox') R.hang('cabinet_upper', side, t + fw / 2, 6.2, { w: fw - 0.2 });
        t += fw;
      } else t += 1;
    }
  }
  for (const pl of placed) {
    if (pl.type === 'stove') { const p = ahead(pl, 2.6); spots.push(R.spot('stand', p.u, p.v, mod4(pl.rot + 2), { act: 'cook', tags: ['cook'] })); onTop(R, pl, rng.pick(['coffee_pot', 'teapot_set', 'food_casserole']), TOP.stove, 0.8); }
    if (pl.type === 'kitchen_sink') { const p = ahead(pl, 2.6); spots.push(R.spot('stand', p.u, p.v, mod4(pl.rot + 2), { act: 'wash', tags: ['wash'] })); }
  }
  const counters = placed.filter((p) => p.type === 'kitchen_counter');
  const things = rng.shuffle(['bread_box', 'cookie_jar', 'dish_rack', 'radio_table', 'coffee_pot', 'fruit_bowl', 'milk_bottles', 'food_pie', 'teapot_set']);
  counters.forEach((c, i) => { if (things[i]) onTop(R, c, things[i], TOP.kitchen_counter, 0, -0.2); });
  if (o.extraTop) counters.slice(-o.extraTop.length).forEach((c, i) => onTop(R, c, o.extraTop[i], TOP.kitchen_counter, 0, 0));
  // table
  const tu = R.U * 0.55, tv = Math.max(R.V * 0.62, 7.5);
  if (o.table !== false && R.at(o.tableType ?? 'table_kitchen', tu, tv, 0, { po: { tint: o.tableTint ?? rng.pick(['#c84a3a', '#5ab0a8', '#e0b050', '#e8e0d0', '#d86a6a']) } })) {
    const chairs = [[tu, tv - 2.9, 2], [tu, tv + 2.9, 0], [tu - 3.6, tv, 1], [tu + 3.6, tv, 3]].slice(0, o.chairs ?? rng.int(2, 4));
    for (const [u, v, rot] of chairs) {
      if (!R.fit(u, v, 2, 2, rot, false)) continue;
      R.prop('chair_kitchen', u, v, rot, { tint: tint });
      spots.push(sit(R, u, v, rot, rng.pick(['drink', 'read', 'write', 'eat']), ['kitchen_table'], 0.45));
    }
    R.prop(rng.pick(['fruit_bowl', 'vase_flowers', 'newspaper_pile', 'coffee_pot']), tu, tv, 0, { tint: '#e0c040' }, TOP.table_kitchen);
  }
  R.hangAny('clock_wall', ['front', 'right', 'left'], 7.5, { w: 2 });
  if (o.baby) R.wall('highchair', ['right', 'front'], [0.5, 0.3]);
  if (rng.chance(0.4)) R.hangAny('wall_telephone', ['front', 'right', 'left'], 5, { w: 1.5 });
  R.prop('ceiling_lamp', R.U / 2, R.V / 2, 0, {}, R.h - 2);
  return { spots, cook: spots.filter((s) => s.act === 'cook' || s.act === 'wash'), seats: spots.filter((s) => s.tags.includes('kitchen_table')) };
}

// ---------------------------------------------------------------- bedrooms
// kind: master | single | twins | boy | girl | teen_girl | teen_boy | nursery | grandma | guest | couple_old
function fBedroom(H, R, kind = 'master', o = {}) {
  const rng = R.rng, beds = [];
  const quilt = o.quilt ?? rng.pick(QUILT);
  const bedDefs = kind === 'master' || kind === 'couple_old' ? [['bed_double', 2]]
    : kind === 'twins' ? [['bed_single', 1], ['bed_single', 1]]
    : kind === 'bunks' ? [['bunk_bed', 2]]
    : kind === 'nursery' ? [['crib', 1]]
    : kind === 'guest' ? [[rng.chance(0.5) ? 'bed_double' : 'bed_single', o.sleepers ?? 1]]
    : [['bed_single', 1]];
  const prefs = bedDefs.length === 2 ? [[0.28, 0.2, 0.35], [0.72, 0.8, 0.65]] : [[0.5, 0.38, 0.62, 0.3, 0.7]];
  bedDefs.forEach(([type, n], i) => {
    const pl = R.wall(type, ['back', 'left', 'right'], prefs[i], { po: { tint: i === 0 ? quilt : (o.quilt2 ?? rng.pick(QUILT)) }, tall: false });
    if (!pl) return;
    const q = RV[mod4(pl.rot)], lat = [q[1], -q[0]];
    const foot = type === 'crib' ? 4.4 : 7.5;
    const offs = n === 2 && type === 'bed_double' ? [-1.3, 1.3] : [0];
    if (type === 'bunk_bed') { beds.push(R.spot('sleep', pl.u + q[0] * (foot - pl.fd / 2), pl.v + q[1] * (foot - pl.fd / 2), pl.rot, { act: 'sleep', tags: ['sleep'], seat: 0.4 })); beds.push(R.spot('sleep', pl.u + q[0] * (foot - pl.fd / 2), pl.v + q[1] * (foot - pl.fd / 2), pl.rot, { act: 'sleep', tags: ['sleep'], seat: 1.3 })); }
    else for (const d of offs) beds.push(R.spot('sleep', pl.u + lat[0] * d + q[0] * (foot - pl.fd / 2), pl.v + lat[1] * d + q[1] * (foot - pl.fd / 2), pl.rot, { act: 'sleep', tags: ['sleep'], seat: type === 'crib' ? 0.62 : 0.55 }));
    // nightstands
    for (const s of type === 'bed_double' ? [-1, 1] : [rng.chance(0.5) ? -1 : 1]) {
      const u = pl.u + lat[0] * (pl.fw / 2 + 1.25) * s - q[0] * (pl.fd / 2 - 1.2), v = pl.v + lat[1] * (pl.fw / 2 + 1.25) * s - q[1] * (pl.fd / 2 - 1.2);
      if (type !== 'crib' && R.at('nightstand', u, v, pl.rot)) {
        R.prop(s < 0 || rng.chance(0.5) ? 'lamp_table' : rng.pick(['books_stack', 'photo_frames_standing', 'clock_wall']), u, v, pl.rot, {}, TOP.nightstand);
      }
    }
    if (i === 0) R.hang(kind === 'grandma' || kind === 'couple_old' ? 'portrait' : rng.pick(['painting', 'photo_frames', 'painting']), pl.side, pl.t, 8.2, { w: 3, po: { tint: rng.pick(ART) } });
  });
  rug(R, rng.chance(0.5) ? 'rug_oval' : 'rug_rect', R.U / 2, R.V * 0.62);
  // storage
  const dresser = R.wall('dresser', ['front', 'left', 'right'], [0.5, 0.3, 0.7]);
  if (dresser) { onTop(R, dresser, rng.pick(['photo_frames_standing', 'vase_flowers', 'lamp_table', 'books_stack']), TOP.dresser, 1.2); }
  if (kind !== 'nursery' && rng.chance(0.7)) R.wall(kind === 'master' ? rng.pick(['wardrobe', 'cedar_chest']) : 'wardrobe', ['left', 'right', 'front'], [0.2, 0.8, 0.5]);
  const ex = [];
  if (kind === 'master') ex.push(rng.pick(['armchair', 'rocking_chair', 'chair_wood']), rng.pick(['cedar_chest', 'trunk', 'laundry_basket']));
  if (kind === 'boy') ex.push('toy_chest', rng.pick(['toy_train', 'rocking_horse', 'wagon_red']), 'desk_wood');
  if (kind === 'girl') ex.push('dollhouse', 'toy_chest', rng.pick(['teddy_bear', 'rocking_horse']));
  if (kind === 'teen_girl') ex.push('writing_desk', 'phonograph', 'chair_wood');
  if (kind === 'teen_boy') ex.push('desk_wood', 'bookshelf_low', 'radio_table');
  if (kind === 'nursery') ex.push('rocking_chair', 'toy_chest', 'bassinet');
  if (kind === 'grandma') ex.push('rocking_chair', 'trunk', 'sewing_machine');
  if (kind === 'guest') ex.push('trunk', 'chair_wood', 'suitcase');
  if (kind === 'twins' || kind === 'bunks') ex.push('toy_chest', 'desk_wood');
  let desk = null, extraSeat = null;
  for (const e of ex) {
    const pl = R.wall(e, ['left', 'right', 'front', 'back'], [0.5, 0.25, 0.75, 0.15, 0.85]);
    if (!pl) continue;
    if (e === 'desk_wood' || e === 'writing_desk') {
      desk = chairAt(R, pl, 2.9, 'chair_wood', rng.pick(['write', 'read']), ['desk']);
      onTop(R, pl, kind === 'teen_girl' ? 'photo_frames_standing' : rng.pick(['lamp_desk', 'books_stack', 'globe_desk']), TOP[e] ?? 3, -1.2);
      onTop(R, pl, rng.pick(['books_stack', 'radio_table', 'typewriter']), TOP[e] ?? 3, 1.3);
    }
    if (e === 'rocking_chair' || e === 'armchair' || e === 'chair_wood') extraSeat = sit(R, pl.u, pl.v, pl.rot, kind === 'grandma' || kind === 'nursery' ? 'knit' : 'read', ['lounge', 'read'], 0.44);
  }
  // wall decor per kind
  if (kind === 'boy' || kind === 'teen_boy' || kind === 'bunks') {
    const pen = rng.pick([['RED SOX', '#1d2c5a', '#e8e4d8'], ['JBHS', '#6a1a1a', '#f0d060'], ['BRAVES', '#1d2c5a', '#d83a2a'], ['GO NAVY', '#1d2c5a', '#f0d060'], ['HARBOR DAYS', '#1f4a33', '#f0e2b0']]);
    wallSign(R, pen[0], rng.pick(['left', 'right', 'front']), R.U / 2, 7, pen[1], pen[2]);
    if (o.plane !== false) modelPlane(R, R.U * rng.float(0.35, 0.65), R.V * rng.float(0.35, 0.6), rng.pick([MAT.sign_red, MAT.sign_blue, MAT.sign_yellow, MAT.steel]), rng.pick([MAT.sign_yellow, MAT.flag_white, MAT.sign_red]));
  }
  if (kind === 'teen_girl') { wallSign(R, rng.pick(['JBHS', 'SOCK HOP!', 'CLASS OF 55']), 'left', R.V / 2, 7, '#8a2a4a', '#f4e8d0'); R.hangAny('mirror_wall', ['front', 'right'], 4.5, { w: 3 }); }
  if (kind === 'girl' || kind === 'nursery') R.hangAny('painting', ['left', 'right', 'front'], 6.5, { w: 4, po: { tint: '#e8b0c0' } });
  if (kind === 'grandma' || kind === 'couple_old') { R.hangAny('portrait', ['left', 'right'], 6.5, { w: 2.5 }); R.hangAny('photo_frames', ['front', 'right', 'left'], 6.2, { w: 3 }); }
  else art(R, ['left', 'right', 'front']);
  R.prop('ceiling_lamp', R.U / 2, R.V / 2, 0, {}, R.h - 2);
  radiator(R);
  if (o.order === 'singlesFirst') beds.sort((a, b) => (a.seat === b.seat ? 0 : 0));
  return { beds, desk, seat: extraSeat };
}

// ---------------------------------------------------------------- bathroom
function fBath(H, R) {
  const rng = R.rng;
  const tub = R.wall('bathtub', ['back', 'left', 'right', 'front'], [0.5, 0.3, 0.7], { tall: false });
  void tub;
  const toilet = R.wall('toilet', ['left', 'right', 'back', 'front'], [0.2, 0.8, 0.5]);
  const sink = R.wall('sink_pedestal', ['right', 'left', 'front', 'back'], [0.5, 0.3, 0.7]);
  void toilet;
  let spot = null;
  if (sink) {
    R.hang('medicine_cabinet', sink.side, sink.t, 5, { w: 2.2 });
    const p = ahead(sink, 2.2);
    spot = R.spot('stand', p.u, p.v, mod4(sink.rot + 2), { act: 'stand', tags: ['bath'] });
  } else spot = R.spot('stand', R.U / 2, R.V / 2, 0, { act: 'stand', tags: ['bath'] });
  R.hangAny('towel_rack', ['front', 'left', 'right'], 4, { w: 2.5 });
  if (rng.chance(0.6)) R.wall('laundry_basket', ['front', 'left', 'right'], [0.8, 0.2]);
  R.prop('ceiling_lamp', R.U / 2, R.V / 2, 0, {}, R.h - 2);
  return { spot };
}

// ---------------------------------------------------------------- entrance hall
function fHall(H, R, o = {}) {
  const rng = R.rng;
  R.wall('coat_rack', ['left', 'right', 'front', 'back'], [0.12, 0.88, 0.2]);
  const tt = R.wall(rng.chance(0.6) ? 'telephone_table' : 'table_side', ['left', 'right', 'back', 'front'], [0.3, 0.6, 0.15, 0.85]);
  if (tt) { onTop(R, tt, 'telephone', TOP.telephone_table ?? 2.8, 0.4); R.hang('mirror_wall', tt.side, tt.t, 4.5, { w: 3 }); }
  if (rng.chance(0.5)) R.wall('umbrella_stand', ['left', 'right', 'front'], [0.1, 0.9, 0.2]);
  if (rng.chance(0.35)) R.wall('clock_grandfather', ['left', 'right', 'back', 'front'], [0.5, 0.7, 0.3]);
  if (o.runner !== false) rug(R, 'rug_rect', R.U / 2, Math.min(R.V / 2, 6), rng.pick(RUGS));
  art(R, ['left', 'right', 'back', 'front'], 6.2);
  R.prop('ceiling_lamp', R.U / 2, Math.min(R.V / 2, 5), 0, {}, R.h - 2);
  return { tt };
}

// ---------------------------------------------------------------- den / study
function fDen(H, R, o = {}) {
  const rng = R.rng, out = { desk: null, lounge: [] };
  const dk = R.wall(o.desk ?? rng.pick(['desk_wood', 'desk_rolltop', 'writing_desk']), ['back', 'left', 'right', 'front'], [0.5, 0.35, 0.65]);
  if (dk) {
    out.desk = chairAt(R, dk, 3.0, 'chair_office', rng.pick(['write', 'read', 'type']), ['desk']);
    onTop(R, dk, 'lamp_desk', TOP[dk.type] ?? 3, -1.6);
    onTop(R, dk, rng.pick(['typewriter', 'books_stack', 'newspaper_pile', 'globe_desk']), 3, 0.8);
  }
  for (let i = 0; i < rng.int(1, 3); i++) R.wall('bookshelf', ['left', 'right', 'front', 'back'], [0.2, 0.8, 0.5]);
  const ac = R.wall(rng.chance(0.7) ? 'armchair' : 'rocking_chair', ['front', 'left', 'right'], [0.3, 0.7, 0.5], { po: { tint: rng.pick(FABRIC) } });
  if (ac) {
    out.lounge.push(sit(R, ac.u, ac.v, ac.rot, rng.pick(['read', 'doze', 'smoke_pipe', 'read_book']), ['lounge', 'read'], 0.42));
    const q = RV[mod4(ac.rot)], lat = [q[1], -q[0]];
    R.at('lamp_floor', ac.u + lat[0] * 2.8, ac.v + lat[1] * 2.8, ac.rot);
  }
  if (rng.chance(0.6)) R.wall(rng.pick(['radio_console', 'globe_desk', 'magazine_rack', 'trunk']), ['left', 'right', 'front', 'back'], [0.5, 0.3, 0.7]);
  rug(R, 'rug_rect');
  art(R, ['left', 'right', 'back']); art(R, ['front', 'left']);
  R.prop('ceiling_lamp', R.U / 2, R.V / 2, 0, {}, R.h - 2);
  radiator(R);
  return out;
}

// ---------------------------------------------------------------- sewing room
function fSewing(H, R, o = {}) {
  const rng = R.rng;
  const sm = R.wall('sewing_machine', ['back', 'left', 'right'], [0.5, 0.3, 0.7]);
  let spot = null;
  if (sm) spot = chairAt(R, sm, 2.6, 'chair_wood', 'sew', ['sew', 'desk']);
  const dummy = R.wall('sewing_dummy', ['left', 'right', 'front'], [0.3, 0.7, 0.5], { po: { tint: o.dressTint ?? rng.pick(['#e8e4d8', '#6a8ac8', '#c86a6a']) } });
  R.wall('ironing_board', ['front', 'right', 'left'], [0.5, 0.3]);
  R.wall(rng.pick(['laundry_basket', 'trunk', 'cedar_chest']), ['front', 'left', 'right'], [0.8, 0.2]);
  R.wall('bookshelf_low', ['left', 'right', 'front'], [0.5]);
  rug(R, 'rug_oval');
  art(R, ['left', 'right', 'front']);
  R.prop('ceiling_lamp', R.U / 2, R.V / 2, 0, {}, R.h - 2);
  return { spot, dummy };
}

// ---------------------------------------------------------------- porch
function fPorchSeat(H, R, u, v, rot, type) {
  if (!R.at(type, u, v, rot, { fp: FP[type] || [4, 2.4] })) return null;
  return sit(R, u, v, rot, R.rng.pick(['rock', 'read', 'knit', 'smoke_pipe', 'sit', 'read']), ['porch', 'lounge'], 0.45);
}

// ================================================================ detached houses
const STYLE_FLOORS = { colonial: 2, foursquare: 2, cape: 1.5, bungalow: 1, queenanne: 2, mansard: 2, italianate: 2, federal: 2 };

function design(H) {
  const { rng, spec, W, D, lot } = H;
  const fam = spec.family;
  let style;
  if (spec.special === 'historian') style = 'federal';
  else if (spec.name === 'The Parsonage') style = 'federal';
  else if (spec.special === 'cat') style = 'queenanne';
  else if (spec.special === 'tv_dinner') style = 'foursquare';
  else if (spec.special === 'birthday') style = 'cape';
  else if (spec.special === 'wedding_family') style = 'colonial';
  else if (fam === 'Kaminski') style = 'cape';
  else if (fam === 'Pemberton') style = 'mansard';
  else if (spec.victorian) style = rng.weighted([['queenanne', 5], ['mansard', 3], ['italianate', 3]]);
  else if (lot.street === 'Orchard Street') style = rng.weighted([['cape', 4], ['bungalow', 4], ['colonial', 2], ['foursquare', 1]]);
  else if (lot.street === 'Church Street') style = rng.weighted([['queenanne', 3], ['colonial', 3], ['foursquare', 3], ['cape', 1]]);
  else style = rng.weighted([['colonial', 4], ['cape', 4], ['bungalow', 3], ['foursquare', 3], ['queenanne', 1]]);
  H.style = style;
  const big = !!spec.big || W > 64;
  H.big = big;
  H.floors = STYLE_FLOORS[style];
  H.FH = (style === 'queenanne' || style === 'mansard' || style === 'italianate' || style === 'federal') ? 13 : 12;
  // palette
  const pal = {};
  if (style === 'queenanne' || style === 'italianate' || (style === 'mansard' && rng.chance(0.6))) {
    const L = rng.pick(LADIES); pal.siding = M(L[0]); pal.trim = M(L[1]); pal.accent = M(L[2]);
  } else if (style === 'federal') { pal.siding = spec.special === 'historian' ? MAT.siding_white : M(rng.pick(['siding_white', 'siding_yellow', 'brick_red'])); pal.trim = MAT.trim_white; pal.accent = MAT.trim_black; }
  else if (style === 'cape') { pal.siding = M(rng.pick(['shingle_wall', 'shingle_wall', 'siding_white', 'siding_gray', 'siding_yellow', 'siding_blue'])); pal.trim = M(rng.pick(['trim_white', 'trim_white', 'trim_cream'])); pal.accent = M(rng.pick(SHUTTERS)); }
  else if (style === 'bungalow') { pal.siding = M(rng.pick(['siding_brown', 'siding_green', 'shingle_wall', 'siding_gray', 'siding_yellow', 'siding_mint'])); pal.trim = M(rng.pick(['trim_cream', 'trim_white', 'trim_brown', 'trim_dark'])); pal.accent = M(rng.pick(['trim_red', 'trim_green', 'trim_dark'])); }
  else if (style === 'colonial' && rng.chance(0.15)) { pal.siding = MAT.brick_red; pal.trim = MAT.trim_white; pal.accent = M(rng.pick(['trim_black', 'trim_green'])); }
  else { pal.siding = M(rng.pick(SIDING)); pal.trim = M(rng.pick(TRIMS)); pal.accent = M(rng.pick(SHUTTERS)); }
  if (spec.special === 'tv_dinner') { pal.siding = MAT.siding_yellow; pal.trim = MAT.trim_white; pal.accent = MAT.trim_green; }
  if (spec.special === 'birthday') { pal.siding = MAT.siding_white; pal.trim = MAT.trim_white; pal.accent = MAT.trim_red; }
  if (spec.special === 'cat') { pal.siding = MAT.siding_green; pal.trim = MAT.trim_cream; pal.accent = MAT.trim_red; }
  pal.roof = style === 'mansard' ? M(rng.pick(['roof_slate', 'roof_slate', 'roof_shingle_black'])) : M(rng.pick(ROOFS));
  if (pal.trim === pal.siding) pal.trim = MAT.trim_white;
  pal.shutters = style === 'bungalow' || style === 'italianate' ? null : (rng.chance(style === 'queenanne' ? 0.3 : 0.8) ? pal.accent : null);
  pal.door = rng.pick(DOORC);
  pal.itrim = rng.chance(0.55) ? MAT.trim_white : MAT.wood_dark;
  pal.idoor = pal.itrim === MAT.trim_white ? '#e8e4d8' : '#6a4a2e';
  pal.curtain = M(rng.pick(CURTAIN));
  H.pal = pal;
  // footprint
  const FH = H.FH;
  if (big && W > 90) { H.hw = Math.min(W - 40, 60); H.hd = 48; H.hz = 44; }
  else if (big) { H.hw = Math.min(W - 16, style === 'federal' ? 50 : rng.int(46, 50)); H.hd = style === 'federal' ? 44 : rng.int(44, 48); H.hz = 30; }
  else {
    const maxW = W - 15;
    if (style === 'colonial') { H.hw = Math.min(maxW, rng.int(43, 46)); H.hd = 38; }
    else if (style === 'foursquare') { H.hw = Math.min(maxW, rng.int(42, 45)); H.hd = 40; }
    else if (style === 'cape') { H.hw = Math.min(maxW, rng.int(40, 44)); H.hd = 44; }
    else if (style === 'bungalow') { H.hw = Math.min(maxW, rng.int(38, 42)); H.hd = 48; }
    else { H.hw = Math.min(maxW, rng.int(40, 44)); H.hd = 42; }
    H.hz = style === 'bungalow' ? rng.int(20, 24) : rng.int(20, 26);
    if (spec.special === 'cat') H.hz = 30; // room for the big maple
  }
  // living side, driveway side (never under the Queen Anne turret)
  H.livingSide = rng.chance(0.5) ? 'L' : 'R';
  H.drive = rng.chance(0.5) ? 'L' : 'R';
  if (W - H.hw < 13 && !big) H.drive = null;
  if (style === 'queenanne' || (big && W < 90)) H.drive = null;
  const sideGap = H.drive ? W - H.hw - 12 : W - H.hw;
  H.hx = H.drive === 'L' ? 12 + Math.floor(sideGap / 2) : Math.floor(sideGap / 2);
  if (!H.drive) H.hx = Math.floor((W - H.hw) / 2);
  H.vest = style === 'cape' ? 4 : 6;
  if (H.floors === 2) H.hd = Math.max(H.hd, H.vest + 2 * FH + 9);
  H.shellH = H.floors === 2 ? 2 * FH : H.floors === 1.5 ? FH + 2 : FH;
  H.age = { colonial: rng.int(1905, 1935), foursquare: rng.int(1908, 1925), cape: rng.int(1936, 1951), bungalow: rng.int(1915, 1930), queenanne: rng.int(1882, 1899), mansard: rng.int(1868, 1885), italianate: rng.int(1860, 1880), federal: rng.int(1850, 1860) }[style];
  if (spec.special === 'cat') H.age = 1884;
  if (spec.special === 'historian') H.age = 1857;
  if (spec.name === 'The Parsonage') H.age = 1872;
}

// ---------------------------------------------------------------- shell, slabs, trim
function houseShell(H) {
  const { f, hx, hz, hw, hd, FH, pal } = H;
  const sh = H.shellH;
  f.box(hx - 1, -1, hz - 1, hw + 2, 1, hd + 2, MAT.stone_foundation);
  f.walls(hx, 0, hz, hw, sh, hd, pal.siding, 1);
  f.walls(hx, 0, hz, hw, 1, hd, MAT.stone_foundation, 1);
  f.box(hx + 1, 0, hz + 1, hw - 2, 1, hd - 2, MAT.wood_mid);
  const nf = Math.ceil(H.floors);
  for (let k = 1; k < nf; k++) f.box(hx + 1, k * FH - 1, hz + 1, hw - 2, 2, hd - 2, MAT.plaster_white);
  if (H.floors >= 1 && H.floors !== 1.5) f.box(hx + 1, nf * FH - 1, hz + 1, hw - 2, 1, hd - 2, MAT.ceiling);
  // corner boards & frieze
  if (pal.siding !== MAT.brick_red) for (const [x, z] of [[hx, hz], [hx + hw - 1, hz], [hx, hz + hd - 1], [hx + hw - 1, hz + hd - 1]]) f.box(x, 1, z, 1, sh - 1, 1, pal.trim);
  f.walls(hx, sh - 1, hz, hw, 1, hd, pal.trim, 1);
  if (H.floors === 2 && H.style !== 'federal') f.walls(hx, FH, hz, hw, 1, hd, H.style === 'queenanne' || H.style === 'italianate' ? pal.accent : pal.trim, 1); // belt course between storeys
  if (pal.siding === MAT.brick_red) { f.walls(hx, 1, hz, hw, 1, hd, MAT.brick_dark, 1); }
}

// ---------------------------------------------------------------- roofs
function houseRoof(H) {
  const { f, hx, hz, hw, hd, pal, style, FH } = H;
  const y = H.shellH;
  const fill = pal.siding === MAT.brick_red ? MAT.brick_red : pal.siding;
  let top = y;
  if (style === 'colonial' || style === 'federal') {
    top = y + f.gable(hx, y, hz, hw, hd, pal.roof, { axis: 'x', overhang: 2, gableMat: fill });
    f.box(hx - 2, top - 1, hz + Math.floor(hd / 2) - 1, hw + 4, 1, hd % 2 ? 1 : 2, MAT.roof_shingle_black);
    // raking trim on the gable ends
    for (let i = 0; i < Math.ceil(hd / 2); i++) { f.box(hx - 1, y + i, hz + i, 1, 1, 1, pal.trim); f.box(hx - 1, y + i, hz + hd - 1 - i, 1, 1, 1, pal.trim); f.box(hx + hw, y + i, hz + i, 1, 1, 1, pal.trim); f.box(hx + hw, y + i, hz + hd - 1 - i, 1, 1, 1, pal.trim); }
    // gable vents (half-round louvres)
    for (const bs of ['-x', '+x']) wBox(H, bs, hz + Math.floor(hd / 2) - 2, y + 6, bs === '-x' ? hx : hx + hw - 1, 4, 3, 1, MAT.trim_dark, -1);
    if (style === 'federal') {
      // widow's walk on the ridge
      const wx = hx + Math.floor(hw / 2) - 8, wz = hz + Math.floor(hd / 2) - 4;
      f.box(wx, top, wz, 16, 1, 8, MAT.wood_gray);
      railing(H, wx, top + 1, wz, 16, 'x', { mat: pal.trim, bal: pal.trim, h: 4 }); railing(H, wx, top + 1, wz + 7, 16, 'x', { mat: pal.trim, bal: pal.trim, h: 4 });
      railing(H, wx, top + 1, wz, 8, 'z', { mat: pal.trim, bal: pal.trim, h: 4 }); railing(H, wx + 15, top + 1, wz, 8, 'z', { mat: pal.trim, bal: pal.trim, h: 4 });
      top += 5;
    }
  } else if (style === 'cape') {
    top = y + f.gable(hx, y, hz, hw, hd, pal.roof, { axis: 'x', overhang: 2, gableMat: fill });
    f.box(hx - 2, top - 1, hz + Math.floor(hd / 2) - 1, hw + 4, 1, 2, MAT.roof_shingle_black);
  } else if (style === 'bungalow') {
    // low front-gable with wide eaves and exposed rafter tails
    top = y + profileRoof(f, hx, y, hz, hw, hd, pal.roof, fill, 'z', (j) => (j * 2 <= hw / 2 ? j * 2 : -1), 3);
    for (let z = hz - 3; z < hz + hd + 3; z += 3) { f.box(hx - 3, y - 1, z, 1, 1, 1, pal.trim); f.box(hx + hw + 2, y - 1, z, 1, 1, 1, pal.trim); }
    // knee braces on the gable front
    f.box(hx + 3, y - 2, hz - 1, 1, 2, 1, pal.trim); f.box(hx + hw - 4, y - 2, hz - 1, 1, 2, 1, pal.trim);
    wBox(H, '-z', hx + Math.floor(hw / 2) - 3, y + 3, hz, 6, 3, 1, pal.trim, 0);
    for (let k = 0; k < 3; k++) f.box(hx + Math.floor(hw / 2) - 3, y + 3 + k, hz - 1, 6, 1, 1, k % 2 ? pal.accent : pal.trim);
  } else if (style === 'foursquare' || style === 'italianate') {
    const over = style === 'italianate' ? 3 : 2;
    const rise = style === 'italianate' ? 1 : 1;
    top = y + f.hip(hx, y, hz, hw, hd, pal.roof, { overhang: over, rise, fill });
    if (style === 'italianate') {
      // brackets under the wide eaves
      for (let x = hx; x < hx + hw; x += 4) { f.box(x, y - 2, hz - 1, 1, 2, 1, pal.trim); f.box(x, y - 2, hz + hd, 1, 2, 1, pal.trim); }
      for (let z = hz; z < hz + hd; z += 4) { f.box(hx - 1, y - 2, z, 1, 2, 1, pal.trim); f.box(hx + hw, y - 2, z, 1, 2, 1, pal.trim); }
      // cupola / belvedere
      const cx = hx + Math.floor(hw / 2) - 5, cz = hz + Math.floor(hd / 2) - 5;
      const cy = y + Math.floor(Math.min(hw, hd) / 2) - 6;
      f.box(cx, cy, cz, 10, 7, 10, fill);
      for (const [a, bb] of [[cx + 2, cz], [cx + 6, cz]]) { f.box(a, cy + 2, bb, 2, 4, 1, MAT.glass); f.box(a, cy + 2, bb + 9, 2, 4, 1, MAT.glass); }
      f.box(cx, cy + 2, cz + 3, 1, 4, 4, MAT.glass); f.box(cx + 9, cy + 2, cz + 3, 1, 4, 4, MAT.glass);
      f.hip(cx, cy + 7, cz, 10, 10, pal.roof, { overhang: 2, fill });
      top = Math.max(top, cy + 13);
    } else {
      // front hipped dormer
      const dx = hx + Math.floor(hw / 2) - 5;
      f.box(dx, y + 1, hz + 3, 10, 6, 8, fill);
      win(f, dx + 3, y + 2, hz + 3, 4, 3, { t: 1, frame: pal.trim, style: 'cross', sill: false, lintel: false, innerSill: false });
      f.hip(dx, y + 7, hz + 3, 10, 8, pal.roof, { overhang: 1, fill });
    }
  } else if (style === 'queenanne') {
    // steep main hip + front cross gable over the dining side with fish-scale shingles
    top = y + f.hip(hx, y, hz, hw, hd, pal.roof, { overhang: 2, rise: 1, fill });
    const gw = 18, gx = H.livingSide === 'L' ? hx + hw - gw - 2 : hx + 2;
    const gh = profileRoof(f, gx, y, hz - 1, gw, 16, pal.roof, MAT.shingle_wall, 'z', (j) => (j <= gw / 2 ? Math.floor(j / 2) * 1 + Math.floor(j / 2) : -1), 1);
    void gh;
    // gable window + sunburst trim
    win(f, gx + gw / 2 - 2, y + 3, hz - 1, 4, 5, { t: 1, frame: pal.trim, style: 'arch', sill: true, lintel: false, innerSill: false });
    f.box(gx + 1, y, hz - 2, gw - 2, 1, 1, pal.trim);
    // side cross gable
    const sg = 14, sz = hz + Math.floor(hd / 2) - 7;
    const sgx = H.livingSide === 'L' ? hx + hw - 1 : hx - 1;
    void sgx;
    f.box(hx + (H.livingSide === 'L' ? hw - 8 : -1), y, sz, 9, 1, sg, pal.roof);
    top = Math.max(top, y + Math.floor(Math.min(hw, hd) / 2) * 2);
    // cresting on the ridge
    f.box(hx + Math.floor(hw / 2) - 3, top, hz + Math.floor(hd / 2), 6, 1, 1, MAT.iron);
  } else if (style === 'mansard') {
    const r = mansard(f, hx, y, hz, hw, hd, pal.roof, fill, { steep: 9, eave: pal.trim, cornice: pal.trim });
    top = y + r.h;
    // dormers with arched windows in the mansard slope
    for (const fx of [0.22, 0.5, 0.78]) {
      const dx = Math.round(hx + hw * fx - 3);
      f.box(dx, y + 1, hz - 1, 6, 8, 3, pal.trim);
      win(f, dx + 1, y + 2, hz - 1, 4, 5, { t: 1, style: 'arch', frame: pal.trim, sill: false, lintel: false, innerSill: false, glass: MAT.glass_dark });
      f.box(dx - 1, y + 8, hz - 2, 8, 1, 4, pal.roof);
    }
    // widow's walk with iron cresting
    const i0 = r.i0;
    for (let x = hx + i0 + 2; x < hx + hw - i0 - 2; x += 2) { f.box(x, y + r.steepH + 2, hz + i0 + 1, 1, 2, 1, MAT.iron); f.box(x, y + r.steepH + 2, hz + hd - i0 - 2, 1, 2, 1, MAT.iron); }
  }
  // chimneys through the roof for the big / victorian houses
  if (style === 'queenanne' || style === 'mansard' || style === 'italianate' || style === 'foursquare') {
    const cz = hz + Math.floor(hd * 0.45);
    roofChimney(f, hx + 5, H.shellH - 1, cz, 4, 4, top + 3, MAT.brick_red, 2);
    if (H.big || style === 'queenanne') roofChimney(f, hx + hw - 9, H.shellH - 1, cz + 6, 4, 4, top + 2, MAT.brick_red, 2);
  }
  H.roofTop = top;
}

// ---------------------------------------------------------------- plan: cells -> rooms
function planHouse(H) {
  const { hx, hz, hw, hd, FH, rng, spec } = H;
  const ix0 = hx + 1, ix1 = hx + hw - 1, iz0 = hz + 1, iz1 = hz + hd - 1;
  const hallW = H.floors === 1 ? 8 : 11;
  // living column gets the larger share
  const avail = (ix1 - ix0) - hallW;
  const livW = Math.round(avail * (H.floors === 1 ? 0.5 : rng.float(0.52, 0.6)));
  const hA = H.livingSide === 'L' ? ix0 + livW : ix1 - livW - hallW;
  const hB = hA + hallW;
  H.hA = hA; H.hB = hB;
  const colL = [ix0, hA], colR = [hB, ix1];
  const liv = H.livingSide === 'L' ? colL : colR, din = H.livingSide === 'L' ? colR : colL;
  H.stairSide = H.livingSide === 'L' ? 'R' : 'L';
  // stair & passage x ranges (air)
  if (H.floors > 1) {
    if (H.stairSide === 'R') { H.stairX = hB - 5; H.railX = hB - 6; H.passX = [hA + 1, hB - 6]; }
    else { H.stairX = hA + 1; H.railX = hA + 5; H.passX = [hA + 6, hB - 1]; }
  } else H.passX = [hA + 1, hB - 1];
  H.doorX = Math.round((H.passX[0] + H.passX[1]) / 2);
  H.s = hz + 2 + H.vest;           // first step z
  H.top = H.s + 2 * FH;             // stair top (z just past the last step)
  const cell = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
  const air = (c) => [c.x0 + 1, c.z0 + 1, c.x1 - c.x0 - 2, c.z1 - c.z0 - 2];
  const G = [], U = [];
  const y1 = 1, h1 = FH - 2;
  // functions for the ground-floor back room on the living side
  const fn = H.fns = H.fns || {};
  // ---- ground floor
  if (H.floors === 1) {
    const r1 = iz0 + Math.round((iz1 - iz0) * 0.4), r2 = iz0 + Math.round((iz1 - iz0) * 0.7);
    const d1 = iz0 + Math.round((iz1 - iz0) * 0.36), d2 = iz0 + Math.round((iz1 - iz0) * 0.7);
    G.push({ key: 'living', c: cell(liv[0], liv[1], iz0, r1) }, { key: 'bed2', c: cell(liv[0], liv[1], r1, r2) }, { key: 'master', c: cell(liv[0], liv[1], r2, iz1) });
    G.push({ key: 'dining', c: cell(din[0], din[1], iz0, d1) }, { key: 'kitchen', c: cell(din[0], din[1], d1, d2) }, { key: 'bath', c: cell(din[0], din[1], d2, iz1) });
    G.push({ key: 'hall', c: cell(hA, hB, iz0, iz1) });
  } else {
    const lz = iz0 + Math.round((iz1 - iz0) * rng.float(0.52, 0.6));
    const dz = iz0 + Math.round((iz1 - iz0) * rng.float(0.46, 0.55));
    G.push({ key: 'living', c: cell(liv[0], liv[1], iz0, lz) }, { key: 'back', c: cell(liv[0], liv[1], lz, iz1) });
    G.push({ key: 'dining', c: cell(din[0], din[1], iz0, dz) }, { key: 'kitchen', c: cell(din[0], din[1], dz, iz1) });
    if (H.floors === 1.5) {
      const zb = Math.min(iz1 - 10, H.top + 2);
      G.push({ key: 'hall', c: cell(hA, hB, iz0, zb) }, { key: 'bath', c: cell(hA, hB, zb, iz1) });
    } else G.push({ key: 'hall', c: cell(hA, hB, iz0, iz1) });
    H.lz = lz; H.dz = dz;
  }
  const names = { living: H.big ? 'Parlor' : 'Living Room', back: 'Den', dining: 'Dining Room', kitchen: 'Kitchen', hall: 'Front Hall', bath: 'Bathroom', bed2: 'Bedroom', master: 'Master Bedroom' };
  H.R = {};
  for (const g of G) {
    const [x, z, w, d] = air(g.c);
    const nm = fn[g.key + 'Name'] || names[g.key];
    const o = { fn: g.key, lightColor: g.key === 'bath' ? [1, 0.95, 0.85] : undefined };
    if (g.key === 'hall') o.nav = [(H.passX[0] + H.passX[1]) / 2, hz + 4];
    const R = new Room(H, nm, x, y1, z, w, d, h1, o);
    R.cell = g.c; R.floor = 0;
    H.R[g.key] = R;
  }
  // ---- upper floor
  if (H.floors === 2) {
    const y2 = FH + 1;
    const lz = iz0 + Math.round((iz1 - iz0) * rng.float(0.48, 0.56));
    const mz = iz0 + Math.round((iz1 - iz0) * rng.float(0.56, 0.64));
    U.push({ key: 'bedA', c: cell(liv[0], liv[1], iz0, lz) }, { key: 'bedB', c: cell(liv[0], liv[1], lz, iz1) });
    U.push({ key: 'master', c: cell(din[0], din[1], iz0, mz) }, { key: 'bath', c: cell(din[0], din[1], mz, iz1) });
    U.push({ key: 'hall2', c: cell(hA, hB, iz0, iz1) });
    const nm2 = { bedA: 'Bedroom', bedB: 'Back Bedroom', master: 'Master Bedroom', bath: 'Bathroom', hall2: 'Upstairs Hall' };
    for (const g of U) {
      const [x, z, w, d] = air(g.c);
      const o = { fn: g.key, lightColor: g.key === 'bath' ? [1, 0.95, 0.85] : undefined };
      if (g.key === 'hall2') o.nav = [(H.passX[0] + H.passX[1]) / 2, H.top + 1.5];
      const R = new Room(H, fn[g.key + 'Name'] || nm2[g.key], x, y2, z, w, d, h1, o);
      R.cell = g.c; R.floor = 1;
      H.R[g.key === 'master' ? 'master2' : g.key === 'bath' ? 'bath2' : g.key] = R;
    }
  } else if (H.floors === 1.5) {
    const y2 = FH + 1, bz0 = hz + 9, bz1 = hz + hd - 9;
    U.push({ key: 'bedA', c: cell(liv[0], liv[1], bz0, bz1) }, { key: 'bedB', c: cell(din[0], din[1], bz0, bz1) }, { key: 'hall2', c: cell(hA, hB, bz0, bz1) });
    const nm2 = { bedA: 'Bedroom', bedB: 'Bedroom', hall2: 'Upstairs Landing' };
    for (const g of U) {
      const [x, z, w, d] = air(g.c);
      const o = { fn: g.key };
      if (g.key === 'hall2') o.nav = [(H.passX[0] + H.passX[1]) / 2, H.top + 1.2];
      const R = new Room(H, fn[g.key + 'Name'] || nm2[g.key], x, y2, z, w, d, 9, o);
      R.cell = g.c; R.floor = 1;
      H.R[g.key] = R;
    }
  }
  void spec;
}

// finish all rooms with per-room materials
function finishHouse(H) {
  const { rng } = H;
  const trimW = H.pal.itrim;
  const paperFor = (k) => {
    const pk = H.fns && H.fns[k + 'Wall'];
    if (pk) return M(pk);
    if (k === 'kitchen') return M(rng.pick(['plaster_yellow', 'plaster_mint', 'plaster_cream', 'wallpaper_yellow', 'plaster_white', 'wallpaper_cream']));
    if (k === 'bath' || k === 'bath2') return M(rng.pick(['plaster_white', 'plaster_mint', 'plaster_pink', 'plaster_blue']));
    if (k === 'hall' || k === 'hall2') return M(rng.pick(['wallpaper_cream', 'wallpaper_green', 'plaster_cream', 'wood_panel_light', 'wallpaper_rose']));
    if (k === 'back') return M(rng.pick(['wood_panel', 'wood_panel_light', 'wallpaper_green', 'plaster_green', 'wallpaper_blue']));
    return M(rng.pick(rng.chance(0.65) ? PAPER : PLASTER));
  };
  for (const R of H.rooms) {
    const k = R.fn;
    if (!k || R.finished) continue;
    const o = { wall: paperFor(k), base: trimW === MAT.trim_white ? MAT.trim_white : MAT.wood_dark };
    if (k === 'kitchen') { o.floor = M(rng.pick(KITF)); o.wainscot = rng.chance(0.5) ? M(rng.pick(TILEW)) : null; o.rail = MAT.trim_white; }
    else if (k === 'bath' || k === 'bath2') { o.floor = M(rng.pick(BATHF)); o.wainscot = M(rng.pick(TILEW)); o.rail = MAT.trim_white; }
    else if (k === 'hall' || k === 'hall2') { o.floor = M(rng.pick(WOODF)); }
    else if (k === 'dining') { o.floor = M(rng.pick(WOODF)); o.wainscot = rng.chance(0.6) ? MAT.wood_panel : null; o.crown = trimW; }
    else if (k === 'living') { o.floor = M(rng.pick(WOODF)); o.crown = trimW; if (rng.chance(0.3)) { o.rug = [2, 2]; o.rugMat = M(rng.pick(['rug_oriental', ...CARPET])); } }
    else { o.floor = rng.chance(0.25) ? M(rng.pick(CARPET)) : M(rng.pick(WOODF)); }
    if (H.fns && H.fns[k + 'Floor']) o.floor = M(H.fns[k + 'Floor']);
    finish(H, R, o);
  }
}

// ---------------------------------------------------------------- doors, stairs
function doorsHouse(H) {
  const { f, R, hz, hd, FH, hA, hB } = H;
  const livSideEdge = H.livingSide === 'L' ? hA : hB;   // the hall wall edge on the living side
  const dinSideEdge = H.livingSide === 'L' ? hB : hA;
  const midZ = (Rm) => clamp(Math.round(Rm.z0 + Rm.d / 2), Rm.z0 + 3, Rm.z0 + Rm.d - 3);
  // ground floor
  connect(H, R.hall, R.living, livSideEdge, R.hall.z0 + Math.min(6, Math.floor(R.living.d / 2)), 'z', { w: H.floors === 1 ? 4 : 6, leaf: false });
  if (H.floors === 1) {
    connect(H, R.hall, R.bed2, livSideEdge, midZ(R.bed2), 'z');
    connect(H, R.hall, R.master, livSideEdge, midZ(R.master), 'z');
    connect(H, R.hall, R.dining, dinSideEdge, R.dining.z0 + 4, 'z', { leaf: false, w: 6 });
    connect(H, R.hall, R.kitchen, dinSideEdge, midZ(R.kitchen), 'z');
    connect(H, R.hall, R.bath, dinSideEdge, midZ(R.bath), 'z');
    connect(H, R.dining, R.kitchen, extSide(H, R.dining) === '-x' ? R.dining.x0 + 3 : R.dining.x0 + R.dining.w - 3, R.kitchen.z0 - 1, 'x', { leaf: false });
  } else {
    connect(H, R.hall, R.back, livSideEdge, midZ(R.back), 'z');
    connect(H, R.hall, R.dining, dinSideEdge, hz + 2 + Math.floor(H.vest / 2), 'z', { w: 4, leaf: false });
    const dk = extSide(H, R.dining) === '-x' ? R.dining.x0 + 3 : R.dining.x0 + R.dining.w - 3;
    connect(H, R.dining, R.kitchen, dk, R.kitchen.z0 - 1, 'x');
    const behind = (R.hall.z0 + R.hall.d) - H.top;
    const pc = (H.passX[0] + H.passX[1]) / 2;
    if (behind >= 4 && R.kitchen.z0 < H.top) { const bk = H.b.navPoint(R.hall.id, pc, 1, H.top + 2); connect(H, R.hall, R.kitchen, dinSideEdge, H.top + 2, 'z', { viaA: bk }); }
    if (R.bath) connect(H, R.hall, R.bath, Math.round((H.passX[0] + H.passX[1]) / 2), R.bath.z0 - 1, 'x');
    // the stairs
    const topY = H.floors === 1.5 ? FH + 10 : 2 * FH - 1;
    const st = stairFlight(H, H.stairX, 1, H.s, '+z', FH, { rail: H.stairSide === 'R' ? 'L' : 'R', topY, runner: H.rng.chance(0.6) ? M(H.rng.pick(['carpet_red', 'carpet_green', 'carpet_blue', 'rug_oriental'])) : null, baluster: H.pal.itrim });
    const up = R.hall2;
    H.b.stairs(R.hall.id, [st.bottom.x, 1, st.bottom.z], up.id, [st.top.x, FH + 1, Math.min(st.top.z, up.z0 + up.d - 0.6)]);
    // guard rail around the stairwell upstairs
    const y2 = FH + 1;
    railing(H, H.railX, y2, H.s + 2, 2 * FH - 3, 'z', { mat: MAT.wood_dark, bal: H.pal.itrim });
    railing(H, H.stairX, y2, H.s + 1, 4, 'x', { mat: MAT.wood_dark, bal: H.pal.itrim });
    // upstairs doors
    const upLiv = livSideEdge, upDin = dinSideEdge;
    if (H.floors === 2) {
      connect(H, up, R.bedA, upLiv, midZ(R.bedA), 'z');
      connect(H, up, R.bedB, upLiv, midZ(R.bedB), 'z');
      const f2 = H.b.navPoint(up.id, (H.passX[0] + H.passX[1]) / 2, FH + 1, hz + 4);
      connect(H, up, R.master2, upDin, hz + 2 + 2 + (H.vest > 5 ? 1 : 0), 'z', { viaA: f2 });
      connect(H, up, R.bath2, upDin, Math.min(H.top + 2, R.bath2.z0 + R.bath2.d - 2), 'z');
    } else {
      connect(H, up, R.bedA, upLiv, midZ(R.bedA), 'z');
      connect(H, up, R.bedB, upDin, Math.min(H.top + 2, up.z0 + up.d - 2), 'z');
    }
  }
  void f; void hd; void hB;
}

// ---------------------------------------------------------------- windows
function blockedWin(H, bs, a0, a1, y0, y1) {
  for (const z of H.noWin || []) if (z.bs === bs && a1 > z.a0 && a0 < z.a1 && y1 > z.y0 && y0 < z.y1) return true;
  return false;
}
function windowsHouse(H) {
  const { hx, hz, hw, hd, pal, rng, FH } = H;
  const ix0 = hx + 1, ix1 = hx + hw - 1, iz0 = hz + 1, iz1 = hz + hd - 1;
  const tall = FH >= 13;
  const star = H.star || null;
  let starDone = false;
  for (const R of H.rooms) {
    if (!R.cell || R.fn === 'porch') continue;
    const c = R.cell;
    const sides = [];
    if (c.z0 === iz0) sides.push(['-z', hz, R.x0, R.w]);
    if (c.z1 === iz1) sides.push(['+z', hz + hd - 1, R.x0, R.w]);
    if (c.x0 === ix0) sides.push(['-x', hx, R.z0, R.d]);
    if (c.x1 === ix1) sides.push(['+x', hx + hw - 1, R.z0, R.d]);
    const attic = H.floors === 1.5 && R.floor === 1;
    for (const [bs, cw, a0, len] of sides) {
      if (R.fn === 'hall' && bs === '-z') continue;
      if (attic && (bs === '-z' || bs === '+z')) continue;
      const bath = R.fn === 'bath' || R.fn === 'bath2';
      const kit = R.fn === 'kitchen';
      let n = bath ? 1 : len >= 30 ? 3 : len >= 19 ? 2 : 1;
      if (R.fn === 'hall2' && bs !== '-z' && bs !== '+z') n = 0;
      if (len < 6) n = 0;
      const w = bath ? 3 : (H.style === 'bungalow' && bs === '-z' && !kit ? 5 : 4);
      const h = bath ? 4 : kit ? 5 : (tall ? 7 : 6);
      const y = R.y + (bath || kit ? 4 : 3);
      const gap = (len - n * w) / (n + 1);
      for (let i = 0; i < n; i++) {
        const a = Math.round(a0 + gap * (i + 1) + w * i);
        if (blockedWin(H, bs, a - 2, a + w + 2, y, y + h)) continue;
        const front = bs === '-z';
        const o = { frame: pal.trim, shutters: front || rng.chance(0.3) ? pal.shutters : null, curtain: bath ? null : (kit ? MAT.awning_red : pal.curtain), glass: bath ? MAT.glass_green : undefined,
          lintelWide: H.style === 'queenanne' || H.style === 'italianate' || H.style === 'mansard' || H.style === 'federal', lintelMat: H.style === 'federal' ? MAT.trim_white : pal.trim,
          box: front && R.floor === 0 && H.windowBoxes, boxTint: H.boxTint, style: H.style === 'bungalow' && bs === '-z' ? 'cross' : 'double' };
        if (star && !starDone && front && R.floor === 1) { o.star = star; starDone = true; }
        if (attic) { o.shutters = null; }
        wWin(H, bs, a, y, cw, w, h, o, R);
        if (tall && H.style !== 'bungalow' && front) wBox(H, bs, a - 1, y + h + 1, cw, w + 2, 1, 1, pal.trim, 0); // hood mould
      }
    }
  }
}

// ---------------------------------------------------------------- porch
function porchHouse(H) {
  const { f, b, hx, hz, hw, pal, style, rng, FH, spec } = H;
  let type = { colonial: rng.chance(0.3) ? 'full' : 'portico', federal: 'portico', cape: rng.chance(0.55) ? 'stoop' : 'portico', bungalow: 'craftsman', foursquare: 'full', queenanne: 'wrap', mansard: rng.chance(0.5) ? 'full' : 'portico', italianate: 'portico' }[style];
  if (spec.special === 'birthday' || spec.special === 'tv_dinner') type = 'full';
  if (spec.special === 'cat') type = 'wrap';
  const sideRoom = H.livingSide === 'L' ? hx : H.W - hx - hw;
  if (type === 'wrap' && sideRoom < 9) type = 'full';
  H.porchType = type;
  const dcx = H.doorX;
  const trim = pal.trim;
  let px0, pw, pd, roofY;
  if (type === 'portico' || type === 'stoop') {
    pw = type === 'stoop' ? 10 : (style === 'federal' ? (H.big ? 20 : 16) : 14); pd = type === 'stoop' ? 4 : (style === 'federal' ? 8 : 6);
    px0 = Math.round(dcx - pw / 2); roofY = type === 'stoop' ? 11 : Math.min(FH, 12);
  } else { pw = hw + 2; pd = type === 'craftsman' ? 9 : 8; px0 = hx - 1; roofY = FH - 1; }
  H.porch = { px0, pw, pd, roofY, type };
  const deckM = type === 'stoop' ? MAT.brick_red : (type === 'craftsman' ? MAT.concrete : MAT.wood_gray);
  f.box(px0, -1, hz - pd, pw, 1, pd, MAT.stone_foundation);
  f.box(px0, 0, hz - pd, pw, 1, pd, deckM);
  f.box(px0, 0, hz - pd, pw, 1, 1, type === 'craftsman' ? MAT.stone_foundation : trim);
  if (type === 'stoop') {
    // brick stoop with a little hood on brackets
    f.box(px0 + 1, 10, hz - pd, pw - 2, 1, pd, pal.roof); f.box(px0 + 2, 11, hz - pd + 1, pw - 4, 1, pd - 1, pal.roof);
    f.box(px0 + 1, 8, hz - 1, 1, 2, 1, trim); f.box(px0 + pw - 2, 8, hz - 1, 1, 2, 1, trim);
  } else if (type === 'portico') {
    // columns + entablature + pediment
    const cols = style === 'federal' ? [px0, px0 + 4, px0 + pw - 6, px0 + pw - 2] : [px0, px0 + pw - 2];
    for (const x of cols) { f.box(x, 1, hz - pd, 2, roofY - 2, 2, trim); f.box(x - 0, 1, hz - pd, 2, 1, 2, MAT.stone_foundation); }
    f.box(px0, roofY - 1, hz - pd, pw, 2, pd, trim);
    f.box(px0 + 1, roofY - 2, hz - pd + 1, pw - 2, 1, pd - 1, MAT.plaster_white);
    f.gable(px0, roofY + 1, hz - pd, pw, pd + 1, pal.roof, { axis: 'z', overhang: 1, gableMat: trim });
    if (style === 'federal') { for (let i = 0; i < 3; i++) f.box(px0 + pw / 2 - 1 - i, roofY + 2 + i, hz - pd - 1, 2 + 2 * i, 1, 1, MAT.trim_white); }
    // side benches
    if (pw >= 14) { f.box(px0 + 2, 1, hz - 3, 1, 2, 3, MAT.wood_gray); f.box(px0 + pw - 3, 1, hz - 3, 1, 2, 3, MAT.wood_gray); }
  } else {
    // full / wrap / craftsman: posts, railing, roof, ceiling
    const posts = [];
    const nPost = Math.max(2, Math.round(pw / 10) + 1);
    for (let i = 0; i < nPost; i++) {
      const x = Math.round(px0 + i * (pw - 1) / (nPost - 1));
      if (Math.abs(x - dcx) < 4) continue;
      posts.push(x);
    }
    for (const x of posts) {
      if (type === 'craftsman') { f.box(x - 1, 1, hz - pd, 3, 4, 3, MAT.stone_foundation); f.box(x - 1, 5, hz - pd, 3, 1, 3, MAT.concrete); f.box(x, 6, hz - pd + 1, 1, roofY - 6, 1, trim); f.box(x - 1, 6, hz - pd, 3, 1, 3, trim); }
      else { f.box(x, 1, hz - pd, 1, roofY - 1, 1, trim); if (style === 'queenanne') { f.box(x - 1, roofY - 2, hz - pd, 3, 1, 1, trim); } }
    }
    // railing with balusters, gap at the steps
    for (const [a, len] of [[px0, dcx - 3 - px0], [dcx + 3, px0 + pw - dcx - 3]]) if (len > 0) railing(H, a, 1, hz - pd, len, 'x', { mat: trim, bal: trim, h: type === 'craftsman' ? 1 : 4, step: 2 });
    railing(H, px0, 1, hz - pd, pd, 'z', { mat: trim, bal: trim, h: 4 }); railing(H, px0 + pw - 1, 1, hz - pd, pd, 'z', { mat: trim, bal: trim, h: 4 });
    // spindle frieze (queen anne)
    if (style === 'queenanne') for (let x = px0; x < px0 + pw; x += 2) f.box(x, roofY - 2, hz - pd, 1, 1, 1, trim);
    // roof (shed) + blue ceiling
    f.box(px0 - 1, roofY, hz - pd - 1, pw + 2, 1, pd + 1, pal.roof);
    f.box(px0, roofY + 1, hz - pd + 2, pw, 1, pd - 2, pal.roof);
    f.box(px0 - 1, roofY - 1, hz - pd - 1, pw + 2, 1, 1, trim);
    f.box(px0, roofY - 1, hz - pd, pw, 1, pd, MAT.plaster_blue);
    if (type === 'wrap') {
      // wrap around the living side
      const sx = H.livingSide === 'L' ? hx - 8 : hx + hw, len = Math.min(24, H.hd - 8);
      f.box(sx, -1, hz, 8, 1, len, MAT.stone_foundation); f.box(sx, 0, hz, 8, 1, len, deckM);
      f.box(sx - 1, roofY, hz, 10, 1, len + 1, pal.roof); f.box(sx, roofY - 1, hz, 8, 1, len, MAT.plaster_blue);
      const ox = H.livingSide === 'L' ? sx : sx + 7;
      railing(H, ox, 1, hz, len, 'z', { mat: trim, bal: trim, h: 4 });
      railing(H, sx, 1, hz + len - 1, 8, 'x', { mat: trim, bal: trim, h: 4 });
      for (const z of [hz + 8, hz + len - 1]) f.box(ox, 1, z, 1, roofY - 1, 1, trim);
      if (style === 'queenanne') for (let z = hz; z < hz + len; z += 2) f.box(ox, roofY - 2, z, 1, 1, 1, trim);
      b.room('Side Porch', sx + (H.livingSide === 'L' ? 0 : 1), 1, hz, 7, roofY - 2, len - 1, { kind: 'porch', ambient: 0.85, lightMode: 'never' });
      H.sidePorch = { sx, len };
    }
  }
  // porch room & light
  const ph = type === 'portico' || type === 'stoop' ? roofY - 2 : roofY - 2;
  const porchR = new Room(H, 'Porch', px0 + 1, 1, hz - pd + 1, pw - 2, pd - 1, ph, { fn: 'porch', kind: 'porch', ambient: 0.85, lightMode: 'night', back: '+z' });
  porchR.finished = true;
  H.R.porch = porchR;
  porchR.markDoor(dcx, hz + 1, 5);
  porchR.claim([porchR.U / 2 - 3.5 + (dcx - (px0 + pw / 2)), porchR.V - 3, porchR.U / 2 + 3.5 + (dcx - (px0 + pw / 2)), porchR.V]);
  b.light(dcx, Math.min(ph, 9), hz - 1.2, { mode: 'night', radius: 5.5, color: [1, 0.8, 0.52] });
  f.box(dcx + 3, 6, hz - 1, 1, 2, 1, MAT.lamp_glass); f.box(dcx + 3, 8, hz - 1, 1, 1, 1, MAT.iron);
  // steps down to the walk
  f.box(dcx - 3, -1, hz - pd - 2, 6, 1, 2, type === 'craftsman' ? MAT.concrete : MAT.wood_gray);
  return porchR;
}

// ---------------------------------------------------------------- turret (Queen Anne)
function turretHouse(H) {
  const { f, hx, hz, hw, pal, FH } = H;
  const left = H.livingSide === 'L';
  const cx = left ? hx - 0.5 : hx + hw + 0.5, cz = hz - 0.5;
  const ro = 7.5, rl = 6, ra = 5;
  const topWall = H.shellH + 9;
  f.cylinder(cx, 0, cz, ro, topWall, pal.siding);
  f.cylinder(cx, -1, cz, ro + 0.5, 1, MAT.stone_foundation);
  f.cylinder(cx, 0, cz, ro, 1, MAT.stone_foundation);
  // belt courses & shingle band at the top
  f.cylinder(cx, FH, cz, ro + 0.4, 1, pal.accent);
  f.cylinder(cx, H.shellH - 1, cz, ro + 0.5, 1, pal.trim);
  f.cylinder(cx, H.shellH, cz, ro, 8, MAT.shingle_wall);
  f.cylinder(cx, topWall - 1, cz, ro + 1, 1, pal.trim);
  cone(f, cx, topWall, cz, ro + 1.5, 16, pal.roof);
  // floors inside
  const floors = [[1, FH - 2, 'living'], [FH + 1, FH - 2, 'bedA']];
  for (const [y, h] of floors) {
    f.cylinder(cx, y, cz, rl, h, H.turretWall ?? MAT.wallpaper_cream);
    f.cylinder(cx, y - 1, cz, rl, 1, MAT.floor_oak);
    f.cylinder(cx, y + h, cz, rl, 1, MAT.ceiling);
    f.cylinder(cx, y, cz, ra, h, 0);
  }
  // tall narrow windows around the outside (5 directions away from the house)
  const dirs = left ? [[-1, 0], [-0.7, -0.7], [0, -1], [-0.7, 0.7], [0.7, -0.7]] : [[1, 0], [0.7, -0.7], [0, -1], [0.7, 0.7], [-0.7, -0.7]];
  for (const [y, h] of [[4, 7], [FH + 4, 7], [H.shellH + 2, 4]]) {
    for (const [dx, dz] of dirs) {
      const wx = Math.round(cx + dx * (ro - 0.8) - 1), wz = Math.round(cz + dz * (ro - 0.8) - 1);
      f.carve(wx, y, wz, 2, h, 2);
      f.box(wx, y, wz, 2, h, 2, MAT.glass);
      f.box(wx, y + h, wz, 2, 1, 2, pal.trim); f.box(wx, y - 1, wz, 2, 1, 2, pal.trim);
    }
  }
  H.turret = { cx, cz, ra, floors };
  H.noWin = H.noWin || [];
  H.noWin.push({ bs: '-z', a0: left ? hx : hx + hw - 9, a1: left ? hx + 9 : hx + hw, y0: 0, y1: 99 });
  H.noWin.push({ bs: left ? '-x' : '+x', a0: hz, a1: hz + 9, y0: 0, y1: 99 });
}
function turretConnect(H) {
  const t = H.turret; if (!t) return;
  for (const [y, h] of t.floors) H.f.cylinder(t.cx, y, t.cz, t.ra, h, 0);
  // a window seat & plant in the turret alcove
  const R = H.R.living;
  if (R) { const [u, v] = R.uv(t.cx + (H.livingSide === 'L' ? 1.5 : -1.5), t.cz + 1.5); R.prop('fern_stand', u, v, 0, {}); }
}

// ---------------------------------------------------------------- bay window on a side wall of a room (ground floor)
function bayWindow(H, R, bs) {
  const { f, pal, hx, hz, hw, hd } = H;
  const along = bs === '-z' || bs === '+z';
  const L = along ? R.w : R.d;
  if (L < 14) return;
  const bw = 12, a = (along ? R.x0 : R.z0) + Math.floor((L - bw) / 2);
  const c = bs === '-z' ? hz : bs === '+z' ? hz + hd - 1 : bs === '-x' ? hx : hx + hw - 1;
  const F = sideFrame(H, bs);
  const [xf, zf] = sideCoords(H, bs, a, bw, c);
  const yb = R.y, h = R.h;
  F.box(xf, -1, zf - 3, bw, 1, 3, MAT.stone_foundation);
  F.box(xf + 1, 0, zf - 3, bw - 2, h + 2, 3, pal.siding);
  F.box(xf, 0, zf - 2, 1, h + 2, 2, pal.siding); F.box(xf + bw - 1, 0, zf - 2, 1, h + 2, 2, pal.siding);
  F.box(xf + 1, 0, zf - 3, bw - 2, 1, 3, MAT.stone_foundation);
  F.carve(xf + 1, yb, zf - 2, bw - 2, h, 4);
  F.box(xf + 1, yb - 1, zf - 2, bw - 2, 1, 4, MAT.floor_oak);
  F.box(xf + 1, yb + h, zf - 2, bw - 2, 1, 4, MAT.ceiling);
  // windows: front + two angled sides
  F.box(xf + 2, yb + 2, zf - 3, bw - 4, h - 4, 1, MAT.glass);
  F.box(xf + 5, yb + 2, zf - 3, 1, h - 4, 1, pal.trim); F.box(xf + bw - 6, yb + 2, zf - 3, 1, h - 4, 1, pal.trim);
  F.box(xf, yb + 2, zf - 2, 1, h - 4, 1, MAT.glass); F.box(xf + bw - 1, yb + 2, zf - 2, 1, h - 4, 1, MAT.glass);
  F.box(xf + 1, yb + 1, zf - 4, bw - 2, 1, 1, pal.trim);
  // little roof
  F.box(xf - 1, yb + h + 1, zf - 4, bw + 2, 1, 4, pal.roof); F.box(xf, yb + h + 2, zf - 3, bw, 1, 3, pal.roof); F.box(xf + 1, yb + h + 3, zf - 2, bw - 2, 1, 2, pal.roof);
  // window seat
  F.box(xf + 2, yb, zf - 2, bw - 4, 2, 1, MAT.wood_mid);
  H.noWin = H.noWin || [];
  H.noWin.push({ bs, a0: a - 1, a1: a + bw + 1, y0: yb, y1: yb + h });
  R.markWin(bs, a, a + bw);
}

// ---------------------------------------------------------------- dormers on the front slope (cape)
function dormersCape(H) {
  const { f, hx, hz, hw, pal, FH, rng } = H;
  const yb = H.shellH;
  const n = hw >= 42 ? 3 : 2;
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(Math.round(hx + hw * (i + 1) / (n + 1) - 3.5));
  const shed = rng.chance(0.25);
  for (const dx of xs) {
    // skip the one over the hall/landing to keep it simple
    f.box(dx, yb - 1, hz + 3, 7, 8, 7, pal.siding);
    f.gable(dx, yb + 7, hz + 3, 7, 7, pal.roof, { axis: 'z', overhang: 1, gableMat: pal.siding });
    win(f, dx + 2, yb + 1, hz + 3, 3, 5, { t: 1, frame: pal.trim, sill: true, lintel: true, innerSill: false });
    f.box(dx, yb - 1, hz + 3, 1, 8, 1, pal.trim); f.box(dx + 6, yb - 1, hz + 3, 1, 8, 1, pal.trim);
    // interior alcove into the band room
    f.carve(dx + 1, FH + 1, hz + 4, 5, 7, 6);
    f.box(dx + 1, FH, hz + 4, 5, 1, 6, MAT.floor_pine);
    f.box(dx + 1, FH + 8, hz + 4, 5, 1, 6, MAT.plaster_white);
    f.box(dx, FH + 1, hz + 4, 1, 7, 6, MAT.plaster_white); f.box(dx + 6, FH + 1, hz + 4, 1, 7, 6, MAT.plaster_white);
    f.box(dx + 2, FH + 1, hz + 3, 3, 1, 1, pal.trim);
    // open the band room's front wall behind the alcove
    f.carve(dx + 1, FH + 1, hz + 9, 5, 7, 1);
  }
  void shed;
}

// ---------------------------------------------------------------- fireplace + exterior chimney on a side wall
function fireplace(H, R, bs) {
  const { hx, hw, hz, hd, pal } = H;
  const along = R.z0 + Math.floor(R.d / 2) - 3;
  const c = bs === '-x' ? hx : hx + hw - 1;
  const F = sideFrame(H, bs);
  const [xf, zf] = sideCoords(H, bs, along, 6, c);
  const brick = pal.siding === MAT.brick_red ? MAT.brick_dark : MAT.brick_red;
  const top = (H.roofTop ?? H.shellH + 12) + 2;
  extChimney(F, xf, zf, top, brick, { w: 6, d: 3, shoulder: H.shellH - 2 });
  // firebox + mantel inside (ring layer at zf+1, room at zf+2)
  F.carve(xf + 1, 1, zf + 1, 4, 3, 1);
  F.box(xf + 1, 1, zf, 4, 3, 1, MAT.brick_dark);
  F.box(xf, 1, zf + 1, 1, 4, 1, MAT.brick_red); F.box(xf + 5, 1, zf + 1, 1, 4, 1, MAT.brick_red); F.box(xf + 1, 4, zf + 1, 4, 1, 1, MAT.brick_red);
  F.box(xf - 1, 1, zf + 1, 1, 5, 1, pal.itrim === MAT.trim_white ? MAT.trim_white : MAT.wood_dark);
  F.box(xf + 6, 1, zf + 1, 1, 5, 1, pal.itrim === MAT.trim_white ? MAT.trim_white : MAT.wood_dark);
  F.box(xf - 1, 5, zf + 1, 8, 1, 2, pal.itrim === MAT.trim_white ? MAT.trim_white : MAT.wood_dark);  // mantel shelf
  F.box(xf, 0, zf + 2, 6, 1, 2, MAT.brick_red);                                                        // hearth
  F.prop('fire_logs', xf + 3, 1, zf + 0.9, 2, {});
  F.prop('candles_pair', xf + 0.5, 6, zf + 2.3, 2, {});
  F.prop('photo_frames_standing', xf + 5.5, 6, zf + 2.3, 2, {});
  F.prop(H.rng.chance(0.6) ? 'painting' : 'mirror_wall', xf + 3, 6.6, zf + 2.02, 2, { tint: H.rng.pick(ART) });
  // register the hearth as a clearance zone in the room
  const bx = bs === '-x' ? hx + 1 : hx + hw - 1, bz = along + 3;
  R.markDoor(bx, bz, 7);
  H.noWin = H.noWin || [];
  H.noWin.push({ bs, a0: along - 1, a1: along + 7, y0: 0, y1: 99 });
  void hz; void hd;
}

// ---------------------------------------------------------------- front door, number, plaque, lamp
function frontDoor(H) {
  const { f, b, hz, pal, style, FH } = H;
  const x0 = H.doorX - 2;
  f.carve(x0, 1, hz, 4, 9, 2);
  const fr = pal.trim;
  f.box(x0 - 1, 1, hz - 1, 1, 10, 1, fr); f.box(x0 + 4, 1, hz - 1, 1, 10, 1, fr); f.box(x0 - 1, 10, hz - 1, 6, 1, 1, fr);
  if (style === 'federal' || style === 'colonial' || style === 'mansard') {
    // fanlight + sidelights + entablature
    f.carve(x0, 10, hz, 4, 2, 1); f.box(x0, 10, hz, 4, 2, 1, MAT.glass);
    f.box(x0 - 2, 2, hz, 1, 7, 1, MAT.glass); f.box(x0 + 5, 2, hz, 1, 7, 1, MAT.glass);
    f.box(x0 - 3, 1, hz - 1, 1, 11, 1, fr); f.box(x0 + 6, 1, hz - 1, 1, 11, 1, fr);
    f.box(x0 - 3, 12, hz - 1, 10, 1, 1, fr);
    if (style === 'federal') f.box(x0 - 4, 13, hz - 2, 12, 1, 2, fr);
  } else if (style === 'queenanne' || style === 'italianate') {
    f.carve(x0, 10, hz, 4, 2, 1); f.box(x0, 10, hz, 4, 2, 1, MAT.glass_stained_gold);
  } else if (style === 'bungalow') {
    f.box(x0 - 1, 11, hz - 2, 6, 1, 2, fr);
  }
  const hall = H.R.hall;
  const porch = H.R.porch;
  const outZ = hz - (H.porch ? H.porch.pd : 0) - 3.5;
  const out = b.entrance(hall.id, H.doorX, 1, hz + 1, { outZ, outY: 0, leaf: style === 'bungalow' || H.rng.chance(0.25) ? 'door_glass' : 'door_wood', tint: pal.door, main: true });
  if (porch) H.ctx.nav.link(b.roomNode.get(porch.id), out);
  hall.markDoor(H.doorX, hz + 1, 4);
  H.frontOut = out;
  // house number beside the door, doorbell, mail slot
  const num = String(H.lot.number);
  const nty = textSignType(num, { bg: '#1d1d22', fg: '#e8c870', border: '#c9a24a', scale: 1 / 22 });
  const nx = x0 + 6.4 + (style === 'federal' || style === 'colonial' || style === 'mansard' ? 1.4 : 0);
  f.prop(nty, nx, 7.2, hz - 0.12, 0, {});
  // the family's name plate under the number (households the town knows by name)
  const fam = H.spec.family;
  if (fam && H.spec.special !== 'historian' && H.spec.name !== 'The Parsonage') f.prop(textSignType(fam.toUpperCase(), { bg: '#e8e0c8', fg: '#2a2a2a', border: '#8a6a3a', scale: 1 / 36 }), nx, 5.9, hz - 0.12, 0, {});
  void FH;
}
// A readable plaque by the door / on the facade
function housePlaque(H, text, lines) {
  const { f, b, hz } = H;
  const wv = (lines.length * 4 + 5) / 30 * 4;                      // label width in voxels
  const x = H.doorX - 3.5 - wv / 2 - (H.style === 'federal' || H.style === 'colonial' || H.style === 'mansard' ? 2 : 0);
  const ty = textSignType(lines, { bg: '#4a3a1e', fg: '#e8d8a0', border: '#9a7a3a', scale: 1 / 30 });
  f.prop(ty, x, 6.2, hz - 0.12, 0, {});
  b.readable(x, 6.5, hz - 0.6, text, { prompt: `Read the plaque`, r: 1.8 });
}

// ---------------------------------------------------------------- furnishing a house
function extSide(H, R) { // an exterior side wall ('-x'|'+x') of a room's cell, or null
  const ix0 = H.hx + 1, ix1 = H.hx + H.hw - 1;
  if (!R.cell) return null;
  if (R.cell.x0 === ix0) return '-x';
  if (R.cell.x1 === ix1) return '+x';
  return null;
}
function furnishHouse(H) {
  const { R, rng, home } = H;
  const P = H.fns || {};
  const kinds = ['boy', 'girl', 'teen_girl', 'teen_boy', 'twins', 'bunks', 'guest', 'nursery', 'boy', 'girl'];
  // ---- ground floor
  R.living.setBack('+z');
  const L = P.livingFn ? P.livingFn(H, R.living) : fLiving(H, R.living, { tv: P.tv ?? rng.chance(0.3), piano: rng.chance(0.2) });
  home.lounge.push(...(L.lounge || []));
  R.dining.setBack('+z');
  const Dn = P.diningFn ? P.diningFn(H, R.dining) : fDining(H, R.dining, { seats: P.dineSeats ?? rng.pick([4, 4, 6]) });
  home.dine.push(...Dn.seats);
  const ks = extSide(H, R.kitchen);
  R.kitchen.setBack(ks || '+z');
  const K = fKitchen(H, R.kitchen, { baby: P.baby, extraTop: P.kitchenTop, chairs: P.kitchenChairs });
  home.kitchen.push(...K.cook, ...K.seats);
  R.hall.setBack('+z');
  fHall(H, R.hall);
  if (R.bath) { R.bath.setBack('+z'); const bt = fBath(H, R.bath); home.bath.push(bt.spot); }
  const bedsPrimary = [], bedsOther = [];
  const addBeds = (r, first = false) => { if (!r) return; (first ? bedsPrimary : bedsOther).push(...r.beds); if (r.desk) home.desk.push(r.desk); if (r.seat) home.lounge.push(r.seat); };
  // the back room on the living side / single-storey bedrooms
  if (H.floors === 1) {
    R.master.setBack(extSide(H, R.master) === '-x' ? '+x' : '-x');
    addBeds(fBedroom(H, R.master, 'master'), true);
    R.bed2.setBack(extSide(H, R.bed2) === '-x' ? '+x' : '-x');
    addBeds(fBedroom(H, R.bed2, P.bed2 || rng.pick(['boy', 'girl', 'twins', 'guest', 'single'])));
  } else {
    const backFn = P.back || (H.floors === 1.5 ? 'master' : rng.weighted([['den', 5], ['tv', 2], ['sewing', 2], ['guest', 1], ['music', 1]]));
    const Rb = R.back;
    Rb.setBack('-z');
    if (backFn === 'den' || backFn === 'music') { const d = fDen(H, Rb); if (d.desk) home.desk.push(d.desk); home.lounge.push(...d.lounge); if (backFn === 'music') Rb.wall('piano_upright', ['left', 'right', 'front'], [0.5]); }
    else if (backFn === 'tv') { Rb.setBack('+z'); const t = fLiving(H, Rb, { tv: true }); home.lounge.push(...t.lounge); }
    else if (backFn === 'sewing') { const s = fSewing(H, Rb, { dressTint: P.dressTint }); if (s.spot) home.desk.push(s.spot); H.sewing = s; }
    else if (backFn === 'master') addBeds(fBedroom(H, Rb, 'master'), true);
    else if (typeof backFn === 'function') backFn(H, Rb);
    else addBeds(fBedroom(H, Rb, backFn), backFn === 'grandma');
    // ---- upstairs
    const up = H.floors === 2;
    if (up) { R.master2.setBack('+z'); addBeds(fBedroom(H, R.master2, 'master'), backFn !== 'master'); if (backFn === 'master') addBeds(fBedroom(H, R.master2, 'guest')); }
    if (R.bath2) { R.bath2.setBack('+z'); const bt = fBath(H, R.bath2); home.bath.push(bt.spot); }
    R.bedA.setBack(up ? '+z' : (extSide(H, R.bedA) === '-x' ? '+x' : '-x'));
    const ka = P.bedA || rng.pick(kinds), kb = P.bedB || rng.pick(kinds);
    if (typeof ka === 'function') ka(H, R.bedA); else addBeds(fBedroom(H, R.bedA, ka));
    R.bedB.setBack(up ? '-z' : (extSide(H, R.bedB) === '-x' ? '+x' : '-x'));
    if (typeof kb === 'function') kb(H, R.bedB); else if (kb === 'sewing') { const s = fSewing(H, R.bedB, { dressTint: P.dressTint }); if (s.spot) home.desk.push(s.spot); H.sewing = s; } else addBeds(fBedroom(H, R.bedB, kb));
    // upstairs hall: a chair, a linen chest, a picture, a light
    const h2 = R.hall2; h2.setBack('+z');
    h2.wall(rng.pick(['cedar_chest', 'bookshelf_low', 'chair_wood', 'table_side']), ['back', 'left', 'right'], [0.7, 0.3]);
    art(h2, ['back', 'left', 'right']);
    h2.prop('ceiling_lamp', h2.U / 2, h2.V / 2, 0, {}, h2.h - 2);
  }
  // bed order: the household's eldest/primary sleepers first
  home.beds.push(...(P.elderFirst ? [...bedsPrimary.filter((s) => s.room === (H.R.back && H.R.back.id)), ...bedsPrimary.filter((s) => !(H.R.back && s.room === H.R.back.id)), ...bedsOther] : [...bedsPrimary, ...bedsOther]));
}

// ---------------------------------------------------------------- the lot: lawn, walk, drive, fence, planting
function siteHouse(H) {
  const { f, W, D, hx, hz, hw, hd, rng, pal } = H;
  // autumn leaf litter drifts
  for (let i = 0; i < rng.int(2, 5); i++) f.box(rng.int(1, W - 9), -1, rng.int(1, D - 9), rng.int(3, 8), 1, rng.int(3, 8), MAT.leaf_litter);
  // driveway: concrete ribbons, gravel or blacktop, to the garage at the back
  if (H.drive) {
    const dx0 = H.drive === 'L' ? 1 : W - 11;
    H.dx0 = dx0;
    const dlen = Math.min(D - 2, hz + hd + 30);
    H.dlen = dlen;
    const kind = rng.weighted([['ribbon', 3], ['gravel', 3], ['concrete', 2], ['asphalt', 1]]);
    if (kind === 'ribbon') { f.box(dx0 + 1, -1, 0, 3, 1, dlen, MAT.concrete); f.box(dx0 + 6, -1, 0, 3, 1, dlen, MAT.concrete); }
    else f.box(dx0, -1, 0, 10, 1, dlen, kind === 'gravel' ? MAT.gravel : kind === 'asphalt' ? MAT.asphalt_old : MAT.concrete);
  }
  // front walk
  const pd = H.porch ? H.porch.pd : 0;
  const walkM = rng.pick([MAT.sidewalk, MAT.sidewalk, MAT.sidewalk_brick, MAT.plaza_cream]);
  f.box(H.doorX - 2, -1, 0, 4, 1, Math.max(1, hz - pd - 2), walkM);
  // foundation planting & flower beds
  const bedM = M(rng.pick(FLOWERS));
  f.box(hx, -1, hz - (H.porch && H.porch.type !== 'stoop' && H.porch.type !== 'portico' ? pd + 2 : 2), hw, 1, 2, bedM);
  if (!H.porch || H.porch.type === 'portico' || H.porch.type === 'stoop') {
    for (const x of [hx + 3, hx + hw - 4, H.doorX - 8, H.doorX + 8]) if (x > hx && x < hx + hw) f.prop('bush_round', x, 0, hz - 1.6, rng.float(0, 4), { tint: rng.pick(['#3f6a2e', '#4a7a34', '#2f5a2a']), scale: rng.float(0.6, 0.85) });
  }
  // front fence
  const fence = H.big ? rng.weighted([['iron', 3], ['stone', 2], ['picket', 1], ['none', 1]]) : rng.weighted([['picket', 5], ['hedge', 2], ['stone', 2], ['none', 3]]);
  H.fence = fence;
  const gateX = H.doorX;
  const skip = (x) => Math.abs(x - gateX) < 5 || (H.drive && x > H.dx0 - 2 && x < H.dx0 + 12);
  if (fence === 'picket' || fence === 'iron') {
    for (let x = 4; x < W - 3; x += 8) if (!skip(x)) f.prop(fence === 'iron' ? 'iron_fence' : 'picket_fence', x, 0, 0.6, 0, { tint: pal.trim === MAT.trim_white ? '#f0ece0' : undefined });
    f.prop('fence_gate', gateX, 0, 0.6, 0, {});
  } else if (fence === 'hedge') {
    for (let x = 0; x < W; x += 4) if (!skip(x + 2)) f.box(x, 0, 0, 4, 3, 2, MAT.hedge);
  } else if (fence === 'stone') {
    for (let x = 0; x < W; x += 4) if (!skip(x + 2)) { f.box(x, 0, 0, 4, 2, 2, MAT.stone_foundation); f.box(x, 2, 0, 4, 1, 2, rng.chance(0.5) ? MAT.rock : MAT.granite); }
  }
  // front tree(s)
  if (H.spec.special !== 'cat') {
    const tx = H.drive === 'L' ? W - rng.int(8, 11) : rng.int(8, 11);
    const tree = rng.pick(['tree_maple_red', 'tree_maple_orange', 'tree_maple_red', 'tree_elm_yellow', 'tree_oak', 'tree_birch']);
    if (hz > 14) f.prop(tree, tx, 0, Math.min(hz - 8, rng.int(7, 11)), rng.float(0, 4), { cat: 'far', scale: rng.float(0.8, 1.05) });
    if (rng.chance(0.5)) f.prop('leaf_pile', tx + rng.float(-5, 5), 0, rng.float(3, Math.max(4, hz - 8)), rng.float(0, 4), {});
  }
  if (H.big && rng.chance(0.6)) f.prop('tree_pine', H.drive === 'L' ? W - 8 : 8, 0, hz + hd + 8, 0, { cat: 'far' });
  // side hedges between lots
  if (rng.chance(0.4)) { const sx = H.drive === 'L' ? W - 2 : 0; f.box(sx, 0, hz, 2, 3, Math.min(D - hz - 2, hd + 20), MAT.hedge); }
}

// ---------------------------------------------------------------- back yard, garage, nav
function yardHouse(H) {
  const { f, b, ctx, W, D, hx, hz, hw, hd, rng, pal, R } = H;
  const back = hz + hd;
  // back door from the kitchen (or the hall for single-storey houses)
  const iz1 = hz + hd - 1;
  const kr = R.kitchen.cell && R.kitchen.cell.z1 === iz1 ? R.kitchen : R.hall;
  const bx = Math.round(kr.x0 + kr.w * (kr === R.hall ? 0.5 : (extSide(H, kr) === '-x' ? 0.72 : 0.28)));
  f.carve(bx - 2, 1, iz1 - 1 + 1 - 1, 4, 9, 2);
  f.box(bx - 3, 1, back, 1, 10, 1, pal.trim); f.box(bx + 2, 1, back, 1, 10, 1, pal.trim); f.box(bx - 3, 10, back, 6, 1, 1, pal.trim);
  const bd = b.door(kr.id, null, bx, 1, iz1, { leaf: 'door_wood', width: 4, axis: 'x', tint: rng.pick(['#e8e4d8', '#2a4a3a', '#7a2a24']) });
  kr.markDoor(bx, iz1, 4);
  // back stoop with steps and a milk box
  f.box(bx - 3, 0, back, 7, 1, 4, MAT.wood_gray); f.box(bx - 3, -1, back, 7, 1, 4, MAT.stone_foundation);
  f.box(bx - 3, 9, back, 7, 1, 3, pal.roof);
  f.prop('milk_bottles', bx + 3.2, 1, back + 0.6, 2, {});
  const bo = b.navPoint(0, bx, 0, back + 5.5, [bd]);
  H.backOut = bo;
  // ---- yard nav skeleton
  const nodes = [bo];
  const yc = b.navPoint(0, W / 2, 0, Math.min(D - 8, back + 18), [bo]);
  nodes.push(yc);
  if (H.drive) {
    const cx = H.dx0 + 5;
    const d0 = b.navPoint(0, cx, 0, 3, []);
    const d1 = b.navPoint(0, cx, 0, back + 4, [d0, bo, yc]);
    linkToSidewalk(ctx, d0);
    if (H.frontOut !== undefined) ctx.nav.link(H.frontOut, d0);
    nodes.push(d0, d1);
  } else {
    const sx = hx > W - hx - hw ? hx / 2 : hx + hw + (W - hx - hw) / 2;
    const s1 = b.navPoint(0, sx, 0, hz + 2, [H.frontOut]);
    const s2 = b.navPoint(0, sx, 0, back + 4, [s1, bo, yc]);
    nodes.push(s1, s2);
  }
  H.yardNodes = nodes;
  const yardSpot = (pose, x, z, rot, act, tags = ['yard'], o = {}) => {
    const s = b.spot(pose, x, 0, z, rot, { room: 0, act, tags, ...o });
    let best = nodes[0], bdist = 1e9;
    for (const n of nodes) { const p = ctx.nav.pos(n), q = b.m(x, 0, z); const dd = Math.hypot(p[0] - q[0], p[2] - q[2]); if (dd < bdist) { bdist = dd; best = n; } }
    ctx.nav.link(s.node, best); s.pendingLink = false;
    return s;
  };
  H.yardSpot = yardSpot;
  const yardD = D - back;
  // ---- garage at the back of the driveway
  let gz = null;
  if (H.drive && yardD > 30) {
    const gx = H.dx0; gz = D - 25;
    f.box(gx, -1, gz, 11, 1, 23, MAT.concrete);
    const gm = pal.siding === MAT.brick_red ? MAT.brick_red : pal.siding;
    f.walls(gx, 0, gz, 11, 10, 23, gm, 1);
    f.carve(gx + 1, 0, gz, 9, 8, 1);
    f.gable(gx, 10, gz, 11, 23, pal.roof, { axis: 'z', overhang: 1, gableMat: gm });
    f.box(gx, 8, gz - 1, 11, 2, 1, pal.trim); f.box(gx, 0, gz - 1, 1, 8, 1, pal.trim); f.box(gx + 10, 0, gz - 1, 1, 8, 1, pal.trim);
    const open = rng.chance(0.6);
    if (!open) { for (let k = 0; k < 4; k++) f.box(gx + 1, k * 2, gz, 9, 2, 1, k % 2 ? MAT.wood_pale : MAT.wood_light); f.box(gx + 2, 5, gz, 7, 1, 1, MAT.glass); }
    const gr = b.room('Garage', gx + 1, 0, gz + 1, 9, 9, 21, { kind: 'garage', ambient: 0.45 });
    void gr;
    win(H.f, gx + 4, 4, gz + 22, 3, 3, { t: 1, frame: pal.trim, sill: false, lintel: false, innerSill: false });
    f.prop('workbench', gx + 5.5, 0, gz + 20.5, 0, {});
    f.prop(rng.pick(['bicycle', 'lawn_mower', 'wheelbarrow', 'crate_stack']), gx + 8, 0, gz + 17, 3, {});
    if (rng.chance(0.5)) f.prop('trash_basket', gx - 1.5, 0, gz + 2, 0, {});
    const car = rng.chance(0.75);
    const carT = rng.pick(['car_sedan', 'car_sedan', 'car_coupe', 'car_wagon', 'truck_pickup', 'car_convertible']);
    const col = rng.pick(CAR_COLORS);
    if (car) {
      if (open && rng.chance(0.5)) f.prop(carT, gx + 5.5, 0, gz + 10, 0, { tint: col, tint2: '#e8e4d8', cat: 'far' });
      else {
        const cz = Math.max(hz + 4, gz - 12);
        f.prop(carT, gx + 5.5, 0, cz, 2, { tint: col, tint2: '#e8e4d8', cat: 'far' });
        if (rng.chance(0.35)) H.home.yard.push(yardSpot('stand', gx + 5.5 + 2.8, cz + 3, 3, rng.pick(['under_car', 'wrench', 'wash']), ['yard']));
      }
    }
    H.garage = { gx, gz };
  } else if (H.drive && rng.chance(0.7)) {
    f.prop(rng.pick(['car_sedan', 'car_coupe', 'car_wagon']), H.dx0 + 5.5, 0, Math.max(hz + 4, 10), 2, { tint: rng.pick(CAR_COLORS), tint2: '#e8e4d8', cat: 'far' });
  }
  // ---- carriage house on the big old lots
  if (!H.garage && yardD > 44) {
    const cw = 22, cd = 16, cx0 = Math.round(W / 2 - cw / 2), cz0 = D - cd - 4;
    const cm = rng.pick([MAT.siding_red, MAT.siding_red, pal.siding, MAT.wood_gray]);
    f.box(cx0, -1, cz0, cw, 1, cd, MAT.concrete);
    f.walls(cx0, 0, cz0, cw, 11, cd, cm, 1);
    f.box(cx0 + 1, 0, cz0 + 1, cw - 2, 1, cd - 2, MAT.wood_gray);
    const rt = f.gable(cx0, 11, cz0, cw, cd, pal.roof, { axis: 'x', overhang: 1, gableMat: cm });
    for (const dx of [3, 12]) { f.carve(cx0 + dx, 1, cz0, 7, 8, 1); f.box(cx0 + dx, 1, cz0, 7, 8, 1, MAT.wood_dark); f.box(cx0 + dx + 3, 1, cz0 - 1, 1, 8, 1, MAT.trim_white); f.box(cx0 + dx, 9, cz0 - 1, 7, 1, 1, MAT.trim_white); }
    f.carve(cx0 + 12, 1, cz0, 7, 8, 1);
    f.box(cx0 + cw / 2 - 2, 11 + rt, cz0 + cd / 2 - 2, 4, 4, 4, MAT.trim_white); f.hip(cx0 + cw / 2 - 2, 15 + rt, cz0 + cd / 2 - 2, 4, 4, pal.roof, { overhang: 1 });
    f.box(cx0 + cw / 2, 17 + rt, cz0 + cd / 2, 1, 3, 1, MAT.iron); f.box(cx0 + cw / 2 - 1, 19 + rt, cz0 + cd / 2, 3, 1, 1, MAT.iron);
    win(f, cx0 + cw / 2 - 2, 13, cz0, 4, 3, { t: 1, frame: MAT.trim_white, sill: false, lintel: false, innerSill: false });
    b.room('Carriage House', cx0 + 1, 1, cz0 + 1, cw - 2, 10, cd - 2, { kind: 'garage', ambient: 0.45 });
    f.prop(rng.pick(['car_sedan', 'car_convertible', 'car_wagon']), cx0 + 15.5, 1, cz0 + 7, 0, { tint: rng.pick(CAR_COLORS), tint2: '#e8e4d8', cat: 'far' });
    f.prop('hay_bale', cx0 + 4, 1, cz0 + cd - 3, 0, {}); f.prop('workbench', cx0 + 6, 1, cz0 + cd - 2.5, 0, {});
    f.prop(rng.pick(['tree_oak', 'tree_maple_orange', 'tree_apple']), cx0 - 8, 0, cz0 + 4, rng.float(0, 4), { cat: 'far' });
    f.box(cx0 + 10, -1, back + 4, 4, 1, cz0 - back - 4, MAT.gravel);
  }
  // ---- rear fence
  if (rng.chance(0.7)) f.box(0, 0, D - 1, W, rng.chance(0.5) ? 5 : 3, 1, rng.pick([MAT.wood_gray, MAT.fence_white, MAT.wood_pale]));
  if (yardD < 16) return;
  const freeX0 = H.drive === 'L' ? 13 : 2, freeX1 = H.drive === 'R' ? W - 13 : W - 2;
  const cx = (freeX0 + freeX1) / 2;
  const S = H.extra.yardPlan || rng.shuffle(['laundry', 'garden', 'swing', 'woodpile', 'dog', 'picnic', 'birds', 'sandbox', 'apple']).slice(0, rng.int(3, 5));
  if (!S.includes('laundry') && rng.chance(0.7)) S.unshift('laundry');
  let zCur = back + 7;
  const slots = [[freeX0 + 6, back + 8], [freeX1 - 6, back + 9], [cx, back + 17], [freeX0 + 7, D - 9], [freeX1 - 7, D - 10], [cx, D - 6]];
  let si = 0;
  const next = () => slots[si++ % slots.length];
  for (const item of S) {
    const [x, z] = next();
    if (z > D - 4) continue;
    if (item === 'laundry') {
      f.prop('laundry_line', x, 0, z, rng.chance(0.5) ? 0 : 1, { tint: rng.pick(QUILT), tint2: rng.pick(QUILT) });
      f.prop('laundry_basket', x + 3, 0, z + 1.5, 0, {});
      H.home.yard.push(yardSpot('stand', x + 2, z + 1.2, 2, 'laundry'));
    } else if (item === 'garden') {
      const gw = 14, gd = 10;
      f.box(Math.round(x - gw / 2), -1, Math.round(z - gd / 2), gw, 1, gd, MAT.dirt);
      for (let r = 0; r < 4; r++) f.box(Math.round(x - gw / 2) + 1, 0, Math.round(z - gd / 2) + 1 + r * 2, gw - 2, 1, 1, r === 3 ? MAT.leaves_yellow : (r % 2 ? MAT.leaves_dark : MAT.leaves_green));
      for (let k = 0; k < 4; k++) { const sx = Math.round(x - gw / 2) + 2 + k * 3; f.box(sx, 0, Math.round(z + gd / 2) - 1, 1, 5, 1, MAT.wood_post); f.box(sx, 2, Math.round(z + gd / 2) - 1, 1, 2, 1, MAT.leaves_green); }
      // dry corn stalks
      for (let k = 0; k < 5; k++) f.box(Math.round(x + gw / 2) - 1, 0, Math.round(z - gd / 2) + k * 2, 1, 6 + (k % 2), 1, MAT.hay);
      f.prop(rng.pick(['pumpkin', 'pumpkin_small']), x - 3, 0, z + 1.5, rng.float(0, 4), {});
      f.prop('pumpkin', x + 2, 0, z - 1.5, rng.float(0, 4), {});
      if (rng.chance(0.4)) f.prop('scarecrow', x, 0, z + gd / 2 - 2, 0, {});
      else f.prop('wheelbarrow', x + gw / 2 + 2, 0, z, 1, {});
      H.home.yard.push(yardSpot('kneel', x - 2, z - gd / 2 - 1, 2, rng.pick(['garden', 'water_plants'])));
    } else if (item === 'swing') {
      f.prop('swing_set', x, 0, z, 0, {});
      H.home.yard.push(yardSpot('sit', x - 1.4, z, 0, 'swing', ['yard', 'play'], { seat: 0.4 }));
      if (rng.chance(0.5)) f.prop('slide', x + 7, 0, z, 0, {});
    } else if (item === 'sandbox') {
      f.prop('sandbox', x, 0, z, 0, {});
      f.prop(rng.pick(['toy_blocks', 'wagon_red', 'tricycle']), x + 4, 0, z + 2, rng.float(0, 4), {});
      H.home.yard.push(yardSpot('sit', x, z, rng.int(0, 3), 'play', ['yard', 'play'], { seat: 0.15 }));
    } else if (item === 'woodpile') {
      const wx = Math.round(x - 4), wz = Math.round(z);
      for (let k = 0; k < 3; k++) f.box(wx, k, wz, 8, 1, 2, k % 2 ? MAT.bark : MAT.wood_dark);
      f.box(wx - 1, 0, wz, 1, 4, 2, MAT.wood_post); f.box(wx + 8, 0, wz, 1, 4, 2, MAT.wood_post);
      f.prop('stump', wx + 11, 0, wz + 1, 0, {});
      H.home.yard.push(yardSpot('stand', wx + 11, wz + 3.2, 0, rng.pick(['saw', 'hammer', 'carry'])));
    } else if (item === 'dog') {
      f.prop('doghouse', x, 0, z, rng.int(0, 3), {});
      f.prop('dog', x + 2, 0, z + 3, rng.float(0, 4), { tint: rng.pick(['#8a5a3a', '#2a2a2a', '#d8c8a0', '#6a4a2a']) });
      H.home.yard.push(yardSpot('stand', x + 3.5, z + 4.5, 3, 'pet_dog'));
    } else if (item === 'picnic') {
      f.prop('picnic_table', x, 0, z, 0, {});
      f.prop('bbq_grill', x + 6, 0, z, 3, {});
      H.home.yard.push(yardSpot('sit', x, z - 2.6, 2, rng.pick(['read', 'drink', 'talk_sit']), ['yard'], { seat: 0.45 }));
    } else if (item === 'birds') {
      f.prop('birdbath', x, 0, z, 0, {}); f.prop('bird_feeder', x + 4, 0, z + 2, 0, {});
      f.prop('garden_bench', x, 0, z + 4, 2, {});
      H.home.yard.push(yardSpot('sit', x, z + 4, 2, 'feed_birds', ['yard'], { seat: 0.45 }));
    } else if (item === 'apple') {
      f.prop('tree_apple', x, 0, z, rng.float(0, 4), { cat: 'far' });
      for (let k = 0; k < 3; k++) f.prop('pumpkin_small', x + rng.float(-3, 3), 0, z + rng.float(-3, 3), 0, { tint: '#c83a2a' });
      H.home.yard.push(yardSpot('stand', x + 3, z + 2, 3, rng.pick(['rake', 'stand', 'carry'])));
    }
  }
  if (!H.home.yard.length) H.home.yard.push(yardSpot('stand', cx, back + 10, 2, 'rake'));
  // rake by a leaf pile
  if (rng.chance(0.6)) { f.prop('leaf_pile', cx + rng.float(-6, 6), 0, back + rng.float(10, Math.max(11, yardD - 6)), rng.float(0, 4), {}); }
  void gz; void zCur;
}

// ================================================================ readable documents (the town's memory)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function docLetter(title, body, o = {}) {
  return { title, html: `<h1>${esc(title)}</h1>${o.sub ? `<div class="masthead">${esc(o.sub)}</div>` : ''}<div class="${o.hand ? '' : 'typed'}" style="white-space:pre-line;text-align:left;${o.hand ? 'font-style:italic;font-size:19px;' : ''}">${esc(body)}</div>` };
}
function docPaper(masthead, headline, paras, o = {}) {
  return { title: o.title || 'The Juniper Bay Courier', html: `<h1>${esc(o.name || 'The Juniper Bay Courier')}</h1><div class="masthead">${esc(masthead)}</div><h2 style="text-align:center">${esc(headline)}</h2><div class="cols">${paras.map((p) => `<p>${esc(p)}</p>`).join('')}</div>` };
}
function docList(title, sub, items, o = {}) {
  return { title, html: `<h1>${esc(title)}</h1>${sub ? `<div class="masthead">${esc(sub)}</div>` : ''}<div class="${o.typed === false ? '' : 'typed'}" style="text-align:left">${items.map((i) => `<div style="margin:3px 0">${esc(i)}</div>`).join('')}</div>${o.foot ? `<p style="text-align:center;font-style:italic">${esc(o.foot)}</p>` : ''}` };
}

const DOC = {
  programme: () => docList('Harbor Days — Official Programme', 'Juniper Bay Centennial · Saturday, September 26, 1953 · 1853–1953', TODAY.map(([t, p, w]) => `${t.padEnd(9)} ${p} — ${w}`), { foot: 'Compliments of the Centennial Committee, Mrs. Walter Pemberton, Chairman. "Steadfast in Fair Weather and Foul."' }),
  courier: () => docPaper('Saturday, September 26, 1953 · Price Five Cents · Centennial Edition', 'CENTENNIAL DAY DAWNS FAIR — TOWN TURNS 100 TODAY', [
    'One hundred years ago this spring, two hundred and twelve souls signed their names to the charter of a village that was then a wharf, a salt house, a chapel and eleven houses. Today Juniper Bay counts 30,882 residents, four trains a day to Boston and, according to the Weather Bureau, not a cloud to spoil it.',
    'The Harbor Days fair opens on Founders Square at ten. Mayor Walter Pemberton will deliver the Centennial Address from the steps of City Hall at half past five, after which Miss Augusta Whitcomb, great-granddaughter of Captain Elias Whitcomb, will seal the time capsule, to be opened in the year 2053.',
    'HOME FROM KOREA. Pfc. Salvatore Castellano Jr., 7th Infantry Division, arrived on Tuesday\'s train to the embrace of his family. His mother reports she has been cooking since Sunday.',
    'NUPTIALS AT ST. BRIGID\'S. Miss Helen Novak and Mr. Robert Brennan will be married at two o\'clock by the Rev. Francis Garrity. The bride\'s gown was made by her mother.',
    'FIREWORKS AT NINE over the harbor, weather permitting. The Harbor Master asks that small craft keep clear of Pier 2.',
  ]),
  phoneList: (extra = []) => docList('Telephone Numbers — by the Phone', 'written on the back of a Kowalski\'s Market calendar', ['Operator — 0', 'Fire — 2-1100', 'Police — 2-1200', 'Dr. Pike — 3-0412', 'St. Luke\'s Hospital — 3-1000', 'Halloran & Sons (bread) — 4-1887', 'Kowalski\'s Market — 4-0915', 'Castellano Fish Mkt. — 4-1894', 'Garrity Hardware — 4-1904', 'Mayhew\'s Pharmacy — 4-1909', ...extra], { typed: false }),
  milkNote: (rng) => docLetter('Note for the Milkman', rng.pick(['2 qts. milk, 1 pt. cream, 1 doz. eggs — Sat. PLEASE no more buttermilk, Bill.\nMoney under the bottle.', 'Only 1 qt. today — we are going to the fair and won\'t be home till the fireworks.\nThank you!', 'Extra quart & a pint of cream Saturday — company coming for the Centennial.\nThe dog is friendly. Mostly.']), { hand: true }),
  groceries: (rng) => docLetter('Shopping List', rng.pick([
    'Kowalski\'s:\n  2 lbs. hamburg\n  potatoes (10 lb.)\n  Jell-O, lime\n  Crisco\nHalloran\'s: 1 white, 1 rye, crullers if any left\nMayhew\'s: aspirin, film for the Brownie (Harbor Days!)\nGarrity\'s: fuse, 15 amp — ASK Frank which kind',
    'Castellano\'s — haddock for Friday\nKowalski\'s — flour, sugar, oleo, 1 can Spam, Wheaties\nstamps at the P.O.\nget Dad\'s suit from Adler\'s — READY THURS.\nbirthday card for Aunt Dot',
    'cabbage\ncorned beef\ncarrots\nsoda crackers\nChase & Sanborn (1 lb.)\nnew shoelaces for Jimmy\nPICK UP PIE PLATES FROM THE CHURCH',
  ]), { hand: true }),
  navyLetter: (rng) => {
    const who = rng.pick(['Eddie', 'Frank', 'Tony', 'Walt', 'Joe', 'Danny', 'Charlie']);
    const where = rng.pick([['U.S.S. Boxer, somewhere off Korea', 'The chow is okay but not like yours, Ma. They say we might be home by spring now that the shooting has stopped.'], ['Fort Dix, New Jersey', 'Basic is hard but the sergeant says I have "potential," which I think is a compliment. Tell Pop I can finally make a bed he would pass.'], ['Yokosuka, Japan', 'We had liberty in Tokyo. You would not believe the trains. I bought you a silk scarf — don\'t let Dad see how much it cost.'], ['Camp Lejeune, N.C.', 'It is hot as blazes here even in September. Save me a piece of Centennial cake and a program, I want to know everything.']]);
    return docLetter('A Letter from ' + who, `${where[0]}\nSept. 14, 1953\n\nDear Ma and Pop,\n\n${where[1]}\n\nI think about the harbor a lot. Say hello to everybody at the church and tell Father I have been going to Mass (mostly). Tell the kid he can use my glove but NOT my bike.\n\nYour loving son,\n${who}`, { hand: true });
  },
  goldStar: (rng) => {
    const name = rng.pick(['Pvt. Thomas J. Fahey', 'Pfc. Anthony R. Silva', 'Sgt. Walter M. Kowalczyk', 'Lt. James D. Lathrop', 'S1c. Robert E. Doane', 'Cpl. Henry P. Beaulieu']);
    const where = rng.pick(['in the Hürtgen Forest, Germany, on November 21, 1944', 'on Okinawa on May 14, 1945', 'aboard U.S.S. Juneau off Guadalcanal, November 13, 1942', 'near Bastogne, Belgium, on December 29, 1944', 'at Anzio, Italy, on February 16, 1944']);
    return docLetter('Western Union — framed, with a photograph', `THE SECRETARY OF WAR DESIRES ME TO EXPRESS HIS DEEP REGRET THAT YOUR SON ${name.toUpperCase()} WAS KILLED IN ACTION ${where.toUpperCase()}. LETTER FOLLOWS.\n\n— Beside it, his photograph in uniform, a Purple Heart in a velvet box, and a sprig of dried juniper. His name is on the honor roll at City Hall, one of the twenty-three.`, {});
  },
  wwi: () => docLetter('Honorable Discharge, 1919', 'UNITED STATES ARMY — This is to certify that Private First Class of Company C, 101st Infantry, 26th ("Yankee") Division, is hereby honorably discharged from the military service of the United States. Given at Camp Devens, Massachusetts, April 28, 1919.\n\n(Framed in the hallway. Someone has tucked a faded snapshot of a young man with an enormous moustache into the corner.)'),
  vjday: () => docLetter('Photograph: V-J Day, 1945', 'A big glossy print from Lowell Photography, stamped on the back: "Founders Square, August 14, 1945, 7:10 P.M."\n\nThe whole town is in it — sailors on the lamp posts, a conga line around the bronze soldier, confetti torn from the telephone book. Somebody has written in ink along the bottom: "WE ARE IN THIS ONE — 3rd from the left, by the fountain. The bells rang for an hour."'),
  hurricane: () => docLetter('Photograph: September 1938', 'A snapshot pasted in an album: Harbor Street under water up to the diner\'s windows, a rowboat going past the Custom House steps.\n\nIn pencil underneath: "Sept. 22, 1938 — the morning after. Pier 3 gone. Six feet of water on Harbor St. We lost the elms on Elm St. and three good men. Never again, God willing."'),
  recipe: (rng) => rng.pick([
    docLetter('Recipe Card — Portuguese Kale Soup (Caldo Verde)', 'from Avó Silva\n\n1 lb. linguiça, sliced\n6 potatoes\n1 bunch kale, cut very fine\n1 onion, 2 cloves garlic\nolive oil, salt\n\nBoil the potatoes soft and mash them in the pot. Add the kale last so it stays green. "Enough for the whole wharf." ', { hand: true }),
    docLetter('Recipe Card — Tourtière', 'Mémère\'s, for Christmas Eve (but good any time)\n\n2 lbs. ground pork, 1 onion, 2 potatoes mashed\ncinnamon, cloves, allspice — "just a pinch, not a fistful"\nPastry top & bottom.\n\nBake 45 min. Serve with ketchup and do not tell Mémère.', { hand: true }),
    docLetter('Recipe Card — Boston Baked Beans', '2 lbs. pea beans, soaked overnight\n½ lb. salt pork\n⅓ cup molasses, 1 tsp. dry mustard, 1 onion\n\nBake SLOW all Saturday in the bean pot. Brown bread from Halloran\'s. Franks if the children insist.', { hand: true }),
    docLetter('Recipe Card — Pierogi', 'Babcia\'s way\n\nDough: 4 cups flour, 1 egg, sour cream, warm water\nFilling: potato & farmer\'s cheese, onion fried in butter\n\nPinch them shut TIGHT or they open in the pot and Babcia will know.', { hand: true }),
    docLetter('Recipe Card — Mrs. Halloran\'s Apple Pie', 'Irene H. — entered at the Harbor Days fair, 1952 (second place, robbed)\n\n6 McIntosh from the Pruitt orchard\n¾ cup sugar, cinnamon, nutmeg, a little lemon\nbutter (Pat\'s good butter)\n\nLattice top. 425° for 15 min., then 350° till it bubbles.', { hand: true }),
  ]),
  reportCard: (rng) => docList('Report Card — Maple Street School', 'Grade 3 · First Marking Period, 1953–54', ['Reading ........ B+', 'Arithmetic ..... A', 'Penmanship ..... C  "must try harder"', 'Geography ...... A-', 'Conduct ........ B  "talks during dictation"', '', 'Teacher: Miss Grace Lee', 'Parent\'s signature: ______________ (not yet!)']),
  churchBulletin: (rng) => rng.chance(0.5)
    ? docList('St. Brigid\'s Parish Bulletin', 'Twenty-fifth Sunday after Pentecost · Rev. Francis Garrity, Pastor', ['Sat. 2:00 P.M. — Nuptial Mass: Helen Novak & Robert Brennan', 'Sat. 4:00–5:30 — Confessions', 'Sun. Masses 7, 8:30, 10 and 11:30', 'Centennial Te Deum after the 11:30', 'The Holy Name Society thanks all who helped with the fair booth.', 'Blessing of the Fleet film night — Parish Hall, Oct. 3'])
    : docList('First Congregational Church', 'Order of Service · Centennial Sunday, September 27, 1953', ['Prelude — Mr. Leonard Pruitt, organ', 'Hymn — "Now Thank We All Our God"', 'Solo — Mrs. Ruth Freeman', 'Sermon — "They That Go Down to the Sea" — Rev. Theodore Ashby', 'The meetinghouse was raised in 1871 by fifty men in one day.', 'CHOIR PRACTICE SATURDAY 4 P.M. — SHARP. (Altos especially.)']),
  capsuleLetter: (rng) => {
    const kid = rng.pick(['Judy', 'Bobby', 'Linda', 'Richard', 'Carol', 'Stevie', 'Nancy']);
    return docLetter('Draft — "A Letter to 2053"', `${kid}, Grade 4, Maple Street School — for the time capsule (copy it over neat!)\n\nDear Person in 2053,\n\nMy name is ${kid} and I am 9. We live near the harbor. My father works at the cannery and my mother says I have to say we are proud of it.\n\nDo you still have the lighthouse? Do you have rocket ships? Is there still pie at the diner?\n\nWe have a television on Church Street (the Hallorans have it). I hope you are happy and nobody has a war.\n\nYours truly,\n${kid}`, { hand: true });
  },
  calendar: (rng) => docList('Calendar — September 1953', rng.pick(['Compliments of Garrity Hardware, Est. 1904 — "Everything but the kitchen sink (ask about the kitchen sink)"', 'Castellano Fish Co., Pier 3 — "Fresh from the Boat Since 1894"', 'First Juniper Savings Bank — "Thrift Is a Harbor in Every Storm"']), ['Sat 19 — Dentist, Tommy 10:30 (Dr. Pike\'s brother)', 'Sun 20 — Aunt Dot to dinner', 'Tue 22 — Sal Castellano home!', 'Thu 24 — PTA 7:30', 'Sat 26 — HARBOR DAYS — fair 10 — Mayor 5:30 — FIREWORKS 9', 'Sun 27 — Centennial service', 'Wed 30 — pay Juniper Electric']),
  postcard: (rng) => docLetter('Postcard', rng.pick([
    'OLD ORCHARD BEACH, MAINE (a picture of the pier)\n\nHaving a swell time. Water too cold for anybody but Uncle Ed. Back Sunday on the 4:52.\n— Love, Aunt Marion',
    'NIAGARA FALLS (a picture of the Maid of the Mist)\n\nIt is LOUD. Your father got soaked and says it was worth it. Home Thursday.\n— Mother',
    'GREETINGS FROM BOSTON (the State House)\n\nSaw the Red Sox lose again. Ted Williams is back from Korea and hit one out. Worth the trip.\n— Uncle Frank',
  ]), { hand: true }),
  weddingPhoto: (rng) => docLetter('Wedding Photograph', `A hand-tinted photograph in a silver frame: a bride in satin and a groom with slicked hair on the steps of ${rng.pick(['St. Brigid\'s', 'First Congregational', 'Our Lady of Good Voyage in Gloucester', 'City Hall'])}. On the back, in pencil: "${rng.pick(['June 14, 1930', 'October 3, 1936', 'May 30, 1941 — a week before he shipped out', 'April 19, 1947', 'September 2, 1922'])}. The happiest day. The rain stopped just for us."`),
  sermon: () => docLetter('Sermon Notes — Centennial Sunday', 'Rev. T. Ashby — Psalm 107:23–30\n\n"They that go down to the sea in ships, that do business in great waters; these see the works of the LORD..."\n\n1. The JUNIPER in the gale of \'51 — the cove as refuge. A town founded on shelter.\n2. The MARY ELLEN (\'67). Eleven names. The widows who raised the stone. Grief made into a monument; a monument made into a promise.\n3. 1902, 1918, 1938: fire, fever, flood. "Then they cry unto the LORD in their trouble."\n4. "He maketh the storm a calm... so He bringeth them unto their desired haven."\n\n(Keep it under 20 min. Mr. Pruitt will start the postlude regardless.)', {}),
  meetinghouse: () => docLetter('Copy from the Parish Ledger, 1871', 'June 17th, 1871. This day the frame of the new Meeting House was raised by fifty men of the congregation between sunrise and sunset, without accident, save that Deacon Pike struck his thumb. Refreshments were provided by the Ladies\' Circle: 40 loaves, 3 hams, 11 pies, cider. The old chapel of 1853 to be kept as the vestry. Praise God.\n— Obadiah Mayhew, Clerk'),
  mayorSpeech: () => docLetter('Centennial Address — DRAFT', 'W. Pemberton — pages 1 of 11 (pages 7 through 11 struck out in Eleanor\'s hand: "Walter. NO.")\n\nFellow citizens of Juniper Bay!\n\nOne hundred years ago, Captain Elias Whitcomb anchored in this cove...\nTwo hundred and twelve souls. Eleven houses. A salt house and a chapel.\n\nWe have weathered the Great Gale, the Great Fire, the influenza and the hurricane of \'38. We remember the eleven of the MARY ELLEN, and every son and daughter who did not come home.\n\n[p. 7 — on the history of the municipal water department — deleted]\n[p. 8 — on the sewer bond of 1911 — deleted]\n\n...and into this capsule we place our letters to the people of 2053. May they find us steadfast — in fair weather and foul!\n\n(Eleanor: "Six pages. Six. And SMILE.")'),
  permit: () => docList('Centennial Committee — Things To Do', 'Mrs. W. Pemberton, Chairman — kitchen table, 1 A.M.', ['✓ Fireworks permit (FINALLY — Fire Dept. signed Thurs.)', '✓ Bunting for the bandstand (Harlow\'s donated 400 ft.)', '✓ Time capsule box — copper-lined, from Garrity\'s', '— Pie contest judges (NOT Irene Halloran\'s husband)', '— Folding chairs from St. Brigid\'s AND the Elks', '— Remind Walter: SIX pages', '— Remind Walter: hat', '— Sleep (October)']),
};

// Captains of Hillcrest Avenue (for plaques on the old houses)
const CAPTAINS = ['Capt. Ezra Doane', 'Capt. Nathaniel Coffin', 'Capt. Asa Lathrop', 'Capt. Micah Dunmore', 'Capt. Jeremiah Beal', 'Capt. Thaddeus Pike', 'Capt. Obed Mayhew', 'Capt. Isaiah Lowell', 'Capt. Hiram Gould', 'Capt. Lemuel Ellsworth', 'Capt. Zenas Snow', 'Capt. Barnabas Howland', 'Capt. Elisha Crowell', 'Capt. Josiah Harding', 'Capt. Reuben Nickerson', 'Capt. Silas Hatch'];
const SHIPS = ['brig SEA FLOWER', 'schooner ABIGAIL', 'bark MORNING STAR', 'ship NORTHERN LIGHT', 'schooner LYDIA ANN', 'packet BAY STATE', 'schooner GOLDEN HIND', 'bark CYGNET', 'brig RELIANCE', 'steamer JUNIPER QUEEN'];

// ================================================================ special households
// readable helpers: a document lying on a surface / hanging on a wall
function readAt(R, u, v, dy, doc, prompt) { R.read(u, v, dy, doc, { prompt: prompt || `Read “${doc.title}”`, r: 1.5 }); }
function readHung(R, type, sides, dy, doc, o = {}) {
  const p = R.hangAny(type, sides, dy, { w: o.w ?? 3, po: o.po || { tint: R.rng.pick(ART) } });
  if (!p) return null;
  const q = RV[p.rot];
  readAt(R, p.u + q[0] * 0.8, p.v + q[1] * 0.8, dy + 1, doc, o.prompt);
  return p;
}
function readOn(R, type, sides, doc, o = {}) {
  const pl = R.wall(type, sides, o.prefs || [0.5, 0.3, 0.7, 0.15, 0.85], o);
  if (!pl) return null;
  if (o.item) onTop(R, pl, o.item, TOP[type] ?? 3, 0, 0, o.itemO || {});
  readAt(R, pl.u, pl.v, (TOP[type] ?? 3) + 1, doc, o.prompt);
  return pl;
}
function presents(R, u, v, n = 6) {
  const cols = [MAT.sign_red, MAT.sign_blue, MAT.sign_yellow, MAT.flag_white, MAT.sign_green, MAT.sign_teal, MAT.sign_orange];
  const rng = R.rng;
  for (let i = 0; i < n; i++) {
    const du = (i % 3) - 1, dv = Math.floor(i / 3) - 0.5, st = i >= 4 && rng.chance(0.6) ? 1 : 0;
    R.box(Math.round(u + du), Math.round(v + dv), 1, 1, st, 1, rng.pick(cols));
  }
}
function streamers(H, R, mats) {
  // crepe-paper swags just under the ceiling along all four walls, plus two across the room
  const y = R.h - 1;
  const f = H.f;
  const along = (x0, z0, dx, dz, len) => { for (let i = 0; i < len; i++) { const k = i % 6; const dy = k === 2 || k === 3 ? -1 : 0; f.box(x0 + dx * i, R.y + y + dy, z0 + dz * i, 1, 1, 1, mats[Math.floor(i / 2) % mats.length]); } };
  along(R.x0, R.z0, 1, 0, R.w); along(R.x0, R.z0 + R.d - 1, 1, 0, R.w);
  along(R.x0, R.z0, 0, 1, R.d); along(R.x0 + R.w - 1, R.z0, 0, 1, R.d);
  for (let i = 0; i < R.w; i++) f.box(R.x0 + i, R.y + y, R.z0 + Math.floor(R.d / 2), 1, 1, 1, mats[i % mats.length]);
}
const PARTY = () => [MAT.sign_red, MAT.sign_yellow, MAT.sign_blue, MAT.flag_white, MAT.sign_green, MAT.neon_pink];

function specialPlan(H) {
  const s = H.spec.special, fam = H.spec.family, P = H.fns = H.fns || {};
  if (s === 'tv_dinner') Object.assign(P, { back: 'grandma', backName: 'Grandma Bridget\'s Room', livingFn: halloranLiving, bedA: 'teen_girl', bedAName: 'Peggy\'s Room', bedB: 'boy', bedBName: 'Tommy\'s Room', elderFirst: true, dineSeats: 6 });
  if (s === 'birthday') Object.assign(P, { back: 'master', backName: 'Bedroom', bedA: 'girl', bedAName: 'Susie\'s Room', bedB: 'boy', bedBName: 'Paul\'s Room', livingFn: moreauLiving, diningFn: moreauDining, livingName: 'Parlor' });
  if (s === 'wedding_family') Object.assign(P, { back: 'sewing', backName: 'Sewing Room', dressTint: '#f6f2ea', bedA: 'single', bedAName: 'Helen\'s Room', bedB: 'teen_boy', bedBName: 'Walter\'s Room', diningFn: novakDining });
  if (s === 'cat') Object.assign(P, { back: hatchStudy, backName: 'The Captain\'s Study', bedA: 'guest', bedB: 'sewing', livingName: 'Parlor' });
  if (s === 'historian') Object.assign(P, { livingFn: whitcombExhibit, livingName: 'Historical Society — Exhibit Room', back: whitcombArchive, backName: 'Historical Society — Archive', diningFn: whitcombReading, diningName: 'Reading Room', bedA: 'guest', bedB: whitcombStore, bedBName: 'Box Room', livingWall: 'wallpaper_green', diningWall: 'wood_panel', backWall: 'wood_panel' });
  if (fam === 'Kaminski') Object.assign(P, { back: 'master', bedA: 'nursery', bedAName: 'Nursery', bedB: 'guest', bedAWall: 'plaster_yellow' });
  if (fam === 'Pemberton') Object.assign(P, { back: pembertonStudy, backName: 'The Mayor\'s Study', bedA: 'guest', bedB: 'sewing' });
  if (H.spec.name === 'The Parsonage') Object.assign(P, { back: parsonageStudy, backName: 'The Minister\'s Study', dineSeats: 8 });
  if (fam === 'Castellano') P.elderFirst = true;
}

// ---- Hallorans: supper in front of the new 21-inch Admiral
function halloranLiving(H, R) {
  const rng = R.rng, lounge = [];
  rug(R, 'rug_oval', R.U / 2, R.V / 2, '#7a2a24');
  const tv = R.wall('tv_console', 'front', [0.5, 0.4, 0.6]);
  // the sofa faces the set; grandma's rocker and Pat's armchair either side, angled in
  const sofa = R.wall('sofa', 'back', [0.5, 0.45, 0.55], { po: { tint: '#5a6a4a' } });
  const rocker = R.wall('rocking_chair', ['left', 'right'], [0.62, 0.5, 0.72, 0.4, 0.8, 0.3]);
  const arm = R.wall('armchair', ['right', 'left'], [0.62, 0.5, 0.72, 0.4, 0.8, 0.3], { po: { tint: '#8a4a3a' } });
  if (rocker) lounge.push(sit(R, rocker.u, rocker.v, rocker.side === 'left' ? 0.55 : 3.45, 'watch', ['lounge', 'tv'], 0.44, { label: 'Grandma Bridget\'s rocker' }));
  if (arm) lounge.push(sit(R, arm.u, arm.v, arm.side === 'left' ? 0.55 : 3.45, 'watch', ['lounge', 'tv'], 0.42, { label: 'Pat\'s chair' }));
  if (sofa) lounge.push(...seatsOn(R, sofa, [-2.5, 0, 2.5], 0.2, 'watch', ['lounge', 'tv'], 0.43));
  // TV trays in front of each chair, supper on them
  for (const pl of [rocker, arm]) {
    if (!pl) continue;
    const p = ahead(pl, 2.5);
    R.prop('table_side', p.u, p.v, pl.rot, {});
    R.prop('table_setting', p.u, p.v, mod4(pl.rot + 2), {}, TOP.table_side);
  }
  if (sofa) {
    const ct = ahead(sofa, 4.2);
    R.prop('table_coffee', ct.u, ct.v, sofa.rot, {});
    for (const d of [-1.6, 0, 1.6]) R.prop('table_setting', ct.u + d, ct.v, 2, {}, TOP.table_coffee);
    R.prop('fruit_bowl', ct.u + 2.2, ct.v + 0.2, 0, { tint: '#f4ecd0' }, TOP.table_coffee);
    readAt(R, ct.u, ct.v, 3, docList('TV Guide — Boston Edition', 'Week of Sept. 26 – Oct. 2, 1953 · 15¢ · "Lucy\'s $50,000,000 Baby" inside', ['SATURDAY', '6:00  (4) News & Weather', '6:15  (7) Industry on Parade', '6:30  (4) Beat the Clock', '7:00  (7) The Lone Ranger — "Hi-yo, Silver!"', '7:30  (4) Jackie Gleason Show', '8:30  (4) Two for the Money', '9:00  (4) Your Show of Shows', '', 'Pencilled on the cover in Irene\'s hand: "NO television during grace. — Mother H."']), 'Read the TV Guide');
  }
  if (tv) {
    readAt(R, tv.u, tv.v, 4, docLetter('Admiral Television — Owner\'s Card', 'ADMIRAL 21-INCH CONSOLE, Model 221DX15, "Super Cascode" chassis. Purchased July 11, 1953 from Bay Radio & Television, Main Street — $249.95 on the installment plan (paid in full, Pat insists).\n\n"For best results, adjust the antenna while a second person watches the picture."\n\n(Tucked inside: a note in Pat\'s hand — "TOMMY. DO NOT touch the vertical hold.")'), 'Read the card on the television');
  }
  // the carton the set came in, still in the corner (Tommy's fort)
  const bx = R.wall(null, ['left', 'right', 'front'], [0.9, 0.1, 0.85], { fp: [4.2, 4.2], tall: false });
  if (bx) {
    R.box(bx.u - 2, bx.v - 2, 4, 4, 0, 3, MAT.canvas_tan); R.box(bx.u - 2, bx.v - 2, 4, 1, 3, 1, MAT.canvas_tan);
    const ty = textSignType('ADMIRAL', { bg: '#b89a6a', fg: '#7a2018', border: '#b89a6a', scale: 1 / 26 });
    const q = RV[bx.rot]; R.prop(ty, bx.u + q[0] * 2.05, bx.v + q[1] * 2.05, bx.rot, {}, 1);
    R.prop('teddy_bear', bx.u, bx.v, bx.rot, {}, 3);
  }
  R.wall('lamp_floor', ['back', 'left', 'right'], [0.1, 0.9]);
  R.wall('bookshelf', ['left', 'right', 'front'], [0.15, 0.85]);
  R.hangAny('portrait', ['back'], 7, { w: 2.5 });
  readHung(R, 'photo_frames', ['left', 'right', 'back'], 6.5, docLetter('Photograph: Halloran & Sons, 1887', 'A brown photograph in a gilt frame: a narrow shopfront on Market Street, one oven, one window full of loaves. A young man in shirtsleeves and a young woman with her hands in her apron.\n\nOn the mount, in copperplate: "Patrick & Nora Halloran — Opening Day — May 2nd, 1887." The shop burned in 1902 and was built again in brick the next spring. The recipe did not burn.'), {});
  R.prop('ceiling_lamp', R.U / 2, R.V / 2, 0, {}, R.h - 2);
  radiator(R);
  return { lounge };
}

// ---- Moreaus: Susie's seventh birthday
function moreauLiving(H, R) {
  const rng = R.rng, lounge = [];
  rug(R, 'rug_oval', R.U / 2, R.V / 2, '#5a6a9a');
  const sofa = R.wall('sofa', 'back', [0.5, 0.4, 0.6], { po: { tint: '#8a5a6a' } });
  if (sofa) lounge.push(...seatsOn(R, sofa, [-2.5, 0, 2.5], 0.2, 'sit', ['lounge'], 0.43));
  R.wall('radio_console', 'front', [0.3, 0.7]);
  const arm = R.wall('armchair', ['left', 'right'], [0.3, 0.7], { po: { tint: '#6a7a5a' } });
  if (arm) lounge.push(sit(R, arm.u, arm.v, arm.rot, 'read', ['lounge'], 0.42));
  // musical chairs: a row of chairs back to back down the middle of the room
  const party = [];
  const n = 6, cu = R.U / 2, cv = R.V * 0.55;
  const alongU = R.U >= R.V;
  for (let i = 0; i < n / 2; i++) {
    const off = (i - 1) * 2.6;
    for (const side of [-1, 1]) {
      const u = alongU ? cu + off : cu + side * 1.2, v = alongU ? cv + side * 1.2 : cv + off;
      const rot = alongU ? (side < 0 ? 2 : 0) : (side < 0 ? 3 : 1);
      if (!R.at('chair_folding', u, v, rot, { fp: [2, 2], force: true })) continue;
      party.push(sit(R, u, v, rot, 'clap_sit', ['party'], 0.45, { label: 'Musical chairs' }));
    }
  }
  // presents piled by the radio, banner over the sofa, streamers
  presents(R, R.U - 3, R.V - 3, 7);
  if (sofa) { const ty = textSignType('HAPPY BIRTHDAY SUSIE', { bg: '#f4e8c8', fg: '#c8302a', border: '#e0a0b8', scale: 1 / 20 }); R.hang(ty, 'back', sofa.t, 7.4, { w: 17 }); }
  streamers(H, R, PARTY());
  for (const [u, v] of [[1.5, 1.5], [R.U - 1.5, 1.5]]) R.prop('balloon_bunch', u, v, 0, { tint: rng.pick(['#e05a8a', '#5a8ae0', '#e0c040']), scale: 0.8 });
  R.hangAny('photo_frames', ['left', 'right'], 6.5, { w: 3 });
  readHung(R, 'painting', ['left', 'right', 'front'], 6, docLetter('A Crayon Drawing, Framed', 'Taped into a dime-store frame: four stick people in front of a yellow house with a smoking chimney, a sun with a face, and a very large dog the family does not own.\n\nAcross the top, in careful capitals: "MY FAMILY BY SUSIE MOREAU AGE 6 AND ¾." Across the bottom, in Henri\'s hand: "First prize, Maple Street School art show, May 1953."'), { po: { tint: '#f0e8a0' } });
  R.prop('ceiling_lamp', R.U / 2, R.V / 2, 0, {}, R.h - 2);
  H.extra.party = party;
  return { lounge };
}
function moreauDining(H, R) {
  const d = fDining(H, R, { seats: 6, tags: ['dine', 'party'], act: 'eat', centerpiece: 'birthday_cake', cloth: '#f0d0dc', chair: 'chair_wood', bare: true });
  // cake knife & plates, candles
  R.prop('candles_pair', R.U / 2 + 1.6, R.V / 2, 0, {}, TOP.table_dining);
  R.prop('fruit_bowl', R.U / 2 - 1.8, R.V / 2, 0, { tint: '#f0f0e0' }, TOP.table_dining);
  const cake = R.spot('stand', R.U / 2, Math.max(1.2, R.V / 2 - 4.6), 0, { act: 'stand', tags: ['cake'], label: 'Cutting the cake' });
  void cake;
  streamers(H, R, PARTY());
  R.wall('sideboard', ['back', 'front', 'left', 'right'], [0.5, 0.3, 0.7]);
  R.prop('balloon_bunch', 1.5, R.V - 1.5, 0, { tint: '#e05a8a', scale: 0.8 });
  R.prop('chandelier', R.U / 2, R.V / 2, 0, {}, R.h - 3.8);
  for (const s of H.extra.party || []) d.seats.push(s);
  H.extra.partyDine = d.seats.filter((s) => s.tags.includes('party'));
  return { seats: d.seats.filter((s) => s.tags.includes('dine')) };
}

// ---- Novaks: the wedding presents and the veil
function novakDining(H, R) {
  const d = fDining(H, R, { seats: 6, centerpiece: 'vase_flowers', cloth: '#f4f0e8' });
  // presents stacked on the table (voxels sit on the table top: y = 3)
  const cols = [MAT.flag_white, MAT.sign_cream, MAT.sign_white, MAT.canvas_white, MAT.sign_teal, MAT.trim_gold];
  for (let i = 0; i < 9; i++) { const du = (i % 3) - 1, dv = Math.floor(i / 3) - 1; R.box(Math.round(R.U / 2 + du * 1.3), Math.round(R.V / 2 + dv), 1, 1, 3 + (i === 4 ? 1 : 0), 1, cols[i % cols.length]); }
  R.box(Math.round(R.U / 2), Math.round(R.V / 2), 1, 1, 4, 1, MAT.sign_white);
  readAt(R, R.U / 2, R.V / 2, 4, docLetter('Wedding Invitation', 'Mr. and Mrs. Casimir Novak\nrequest the honour of your presence\nat the marriage of their daughter\n\nHelen Marie\n\nto\n\nMr. Robert Joseph Brennan\n\non Saturday, the twenty-sixth of September\nNineteen hundred and fifty-three\nat two o\'clock\nSt. Brigid\'s Church, Juniper Bay\n\nReception following at the Parish Hall\n\n(Propped against the gravy boat — a pile of cards: "From the girls at the cannery office", "Love, Aunt Zofia & Uncle Stefan (Chicopee)", "To Helen & Bob — from the Linotype Dept., Juniper Bay Courier.")'), 'Read the wedding invitation');
  readHung(R, 'photo_frames', ['left', 'right', 'back', 'front'], 6.5, docLetter('Photograph: City Hall Steps, July 1934', 'A newspaper photograph, cut out and framed: a crowd of cannery workers on the steps of City Hall, straw hats and rolled sleeves. In the middle, a young man with one fist in the air.\n\nCaption from the Courier: "CANNERY STRIKE, NINETEENTH DAY — Casimir Novak, 29, addresses the crowd." Underneath, in Stella\'s writing: "A nickel an hour. Worth it."'), {});
  return d;
}

// ---- Mrs. Hatch: the Captain's study
function hatchStudy(H, R) {
  const d = fDen(H, R, { desk: 'desk_rolltop' });
  if (d.desk) H.home.desk.push(d.desk);
  H.home.lounge.push(...d.lounge);
  R.wall('ship_model_case', ['left', 'right', 'front'], [0.5, 0.3, 0.7]);
  R.wall('trunk', ['front', 'left', 'right'], [0.8, 0.2]);
  readHung(R, 'portrait', ['back', 'left', 'right'], 6.5, docLetter('Portrait: Captain Horace Hatch', 'CAPT. HORACE HATCH (1879–1949)\nMaster of the coastal steamer JUNIPER QUEEN, Boston–Portland, 1911–1938.\n\nHe stood her off Gannet Ledge through the hurricane of \'38 with ninety passengers aboard and brought every one of them in. He named the cat. He would.\n\n— his grandfather, Capt. Silas Hatch, built this house in 1884 with money from the bark MORNING STAR.'), { w: 2.5 });
  readHung(R, 'clock_wall', ['front', 'left', 'right'], 6.5, docLetter('The Barometer', 'A brass ship\'s barometer from the JUNIPER QUEEN, still tapped every morning. The needle points between CHANGE and FAIR. On the card below, in Mildred\'s hand: "Horace tapped it every morning for forty years. So do I."'), { w: 2 });
  R.wall('laundry_basket', ['front', 'left', 'right'], [0.5, 0.2, 0.8]);
  readAt(R, R.U / 2, R.V / 2, 1, docLetter('Note by the Telephone', 'FIRE DEPT. — 2-1100\nAsk for Capt. Joe Brennan.\nTell them: the TALL ladder.\n(Admiral: 4 times since Easter.)\n\nAdmiral\'s dinner — 1/2 can Puss\'n Boots, NOT the good salmon.', { hand: true }), 'Read the note');
}

// ---- Whitcomb House & the Historical Society
function whitcombExhibit(H, R) {
  const rng = R.rng;
  rug(R, 'rug_rect', R.U / 2, R.V / 2, '#5a2a2a');
  // glass case with the JUNIPER's logbook in the middle of the room
  const cu = R.U / 2, cv = R.V / 2;
  R.at('display_case_museum', cu, cv, 0, { force: true });
  readAt(R, cu, cv, 4, docLetter('Log of the Schooner JUNIPER, 1851', 'Under glass, open to October 1851. The ink has gone brown.\n\n"Tues. Oct. 14th. Wind NE, blowing a whole gale & rising. Carried away the fore-topmast at 4 bells. Mr. Pike reports 3 ft. of water in the well. Ran in under bare poles for a cove not on our chart.\n\nWed. Oct. 15th. Let go both anchors in 6 fathoms, good holding in mud. All hands safe, thank God. Gale moderating.\n\nThurs. Oct. 16th. Went ashore with Mr. Pike. A fine spring, a stand of juniper on the hill, and a deep cove sheltered from every quarter but the SW. Not a soul. I have given the place the name of my vessel. I shall come back to it. — E.W."'), 'Read the JUNIPER\'s logbook');
  R.prop('velvet_rope', cu - 4, cv + 3.2, 0, {}); R.prop('velvet_rope', cu + 4, cv + 3.2, 0, {});
  const fh = R.wall('figurehead', ['left', 'right'], [0.5, 0.3, 0.7]);
  if (fh) readAt(R, fh.u, fh.v, 5, docLetter('Figurehead of the JUNIPER', 'Carved pine, painted: a woman holding a sprig of juniper. She rode the bow of Captain Whitcomb\'s schooner from 1846 until the vessel was broken up at Whitcomb\'s wharf in 1874. Found in a barn on Orchard Street in 1931 and restored by the Society. The Pruitt family would like it known that it was their barn.'), 'Read the card');
  const smc = R.wall('ship_model_case', ['front', 'left', 'right'], [0.3, 0.7]);
  if (smc) readAt(R, smc.u, smc.v, 4, docLetter('Model: the Schooner MARY ELLEN', 'Built by her mate\'s son, 1870, from memory. The MARY ELLEN was lost with all eleven hands on Gannet Ledge in the Great Gale of 1867. Her widows raised the memorial stone on the quay by public subscription in 1869.\n\nTHE ELEVEN: Capt. Jonas Lathrop · Amos Pike · William Pike · Thomas Doane · Nathaniel Coffin Jr. · Patrick Fahey · Ebenezer Snow · Henry Beal · Samuel Dunmore · John Hatch · Asa Whitcomb, aged 15.'), 'Read the card');
  R.hangAny('harpoons_rack', ['front', 'back', 'left', 'right'], 6, { w: 10.5 }, [0.5, 0.3, 0.7]);
  R.hangAny('ships_wheel_wall', ['back', 'front'], 5, { w: 4 });
  readHung(R, 'portrait', ['back', 'left', 'right'], 6.5, docLetter('Portrait: Captain Elias Whitcomb', 'CAPTAIN ELIAS WHITCOMB (1809–1889)\nMaster of the schooner JUNIPER · Founder of Juniper Bay · First Selectman 1853–1861\n\nPainted in Boston in 1862. He built the first wharf, the salt house, the chapel and (his granddaughter always added) the first argument at town meeting. He is buried on Juniper Hill, facing the harbor, at his own insistence.'), { w: 2.5 });
  readHung(R, 'painting', ['left', 'right', 'front', 'back'], 6.5, docLetter('The Town Charter, 1853', 'A framed copy of the charter: "...granted by the General Court of the Commonwealth of Massachusetts this Fourth day of March, 1853, unto the two hundred and twelve inhabitants of the cove called Juniper Bay..."\n\nSigned by the first selectmen: Elias Whitcomb, Josiah Pike, Ezra Dunmore. Motto added in 1868, when the Light was lit: STEADFAST IN FAIR WEATHER AND FOUL.'), { po: { tint: '#e8dcb8' }, w: 4 });
  readHung(R, 'painting', ['front', 'left', 'right', 'back'], 6.5, docLetter('Honor Roll, 1861–1865', 'Forty-three men of Juniper Bay went to war for the Union. Nine did not come home. Their names are cast on the bronze soldier in Founders Square (1889):\n\nSgt. George Pike · Cpl. Benjamin Snow · Pvt. Charles Doane · Pvt. Michael Fahey · Pvt. Lemuel Coffin · Pvt. Isaac Beal · Pvt. Eli Howland · Pvt. Daniel Lathrop · Pvt. James Mayhew\n\n(The Society holds Pvt. Doane\'s letters home, 1862–63. Ask Miss Whitcomb.)'), { po: { tint: '#6a5a3a' }, w: 4 });
  R.wall('anchor_display', ['front'], [0.5]);
  R.prop('chandelier', cu, cv, 0, {}, R.h - 3.8);
  const bench = R.wall('garden_bench', ['back'], [0.3, 0.7], { fp: [6, 2.5] });
  const lounge = bench ? [sit(R, bench.u, bench.v, bench.rot, 'read', ['lounge'], 0.45)] : [];
  // sign in the front window
  void rng;
  return { lounge };
}
function whitcombArchive(H, R) {
  const d = fDen(H, R, { desk: 'desk_rolltop' });
  if (d.desk) H.home.desk.push(d.desk);
  H.home.lounge.push(...d.lounge);
  // archive boxes stacked along the walls (voxels: 1 box = 25 cm)
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 'left' : 'right';
    const t = 2 + Math.floor(i / 2) * 1.3;
    const u = side === 'left' ? 0.5 : R.U - 1.5;
    if (t > R.V - 5) break;
    const h = 1 + (i % 3);
    R.box(u, t, 1, 1, 0, h, i % 4 === 0 ? MAT.wood_pale : MAT.canvas_tan);
  }
  R.wall('filing_cabinet', ['front', 'left', 'right'], [0.2, 0.8]);
  R.wall('filing_cabinet', ['front', 'left', 'right'], [0.35, 0.65]);
  readAt(R, R.U / 2, R.V * 0.6, 3, docLetter('Letter to the People of 2053 — draft', 'Juniper Bay, September 1953\n\nTo the people of Juniper Bay in the year 2053,\n\nWe are thirty thousand souls, give or take the summer people. We have four trains a day to Boston, one television on Church Street, a lighthouse kept by a man who has not missed a sunset in thirty-two years, and a cat who will not stay out of the Hatches\' maple.\n\nWe lost boys in two wars and in Korea. We lost the MARY ELLEN, Market Street and Pier 3. We built them back, most of them.\n\nI am told you will have machines to do everything. Keep the light lit anyway. Mind the tide. Be kind to one another; it is the only thing that has ever worked.\n\nAugusta Whitcomb, aged 81\nPresident, Juniper Bay Historical Society\n\n(crossed out: "P.S. If the Pembertons are still arguing about the sewer bond, I am not surprised.")', { hand: true }), 'Read Miss Whitcomb\'s letter');
  readAt(R, 2, R.V - 3, 2, docList('Time Capsule — Contents', 'Juniper Bay Historical Society · to be opened September 26, 2053', ['1. This morning\'s Courier (Centennial Edition)', '2. Harbor Days programme', '3. A loaf of Halloran\'s bread, sealed (God help them)', '4. Castellano Fish Co. price list — haddock 29¢ lb.', '5. Letters to 2053 from the 4th grade, Maple Street School', '6. Mayor Pemberton\'s address (six pages)', '7. 1953 telephone directory', '8. Union button, Cannery Strike 1934 — lent by C. Novak', '9. A photograph of every church choir in town', '10. Juniper sprig from the Hill', '11. Miss Whitcomb\'s letter (sealed)']), 'Read the list');
  readHung(R, 'painting', ['back', 'front', 'left', 'right'], 6.5, docLetter('Plan of the Cove, 1853', 'A hand-drawn survey, framed: "PLAN OF THE COVE AND VILLAGE OF JUNIPER BAY, surveyed March 1853." Whitcomb\'s wharf, the salt house, the chapel, eleven houses, the spring. The trail over Juniper Hill is marked "Indian path — very old."\n\nSomebody has pencilled on the glass, much later: "Market St. burned here — 1902" and "Pier 3 — gone Sept. 21, 1938."'), { po: { tint: '#d8c890' }, w: 4 });
  readHung(R, 'photo_frames', ['left', 'right', 'front'], 6.2, docLetter('Scrapbook: The Great Fire of 1902', 'THE JUNIPER BAY COURIER, Thursday, June 12, 1902 — "MARKET STREET IN ASHES"\n\n"Fire discovered at half past two o\'clock yesterday afternoon in the hay loft of Beal\'s livery stable spread with terrible speed along the wooden block... By nightfall three blocks lay in ruins... By the mercy of Providence, no lives were lost. The horses were led out by the stable boys and by several young women of the neighborhood, whose courage is the talk of the town."\n\nPasted beside it: the 1903 subscription list to rebuild in brick and stone.'), {});
  readHung(R, 'photo_frames', ['front', 'left', 'right'], 6.2, docLetter('Album: The Hurricane of 1938', 'Photographs by Lowell Studio, September 21–22, 1938: Harbor Street under six feet of water; the Custom House steps with a dory tied to the lamp post; the place where Pier 3 was; the Elm Street elms lying across the road like matchsticks.\n\nA note in Miss Whitcomb\'s hand: "Three lives lost. The high-water line is painted on the buildings along Harbor Street — go and look at it, and then look at the harbor on a calm day, and remember."'), {});
}
function whitcombReading(H, R) {
  const d = fDining(H, R, { seats: 4, centerpiece: 'books_stack', cloth: '#6a4a2e', chair: 'chair_wood' });
  // archive boxes on the table and on the floor
  for (let i = 0; i < 5; i++) R.box(Math.round(R.U / 2 - 2 + i), Math.round(R.V / 2 + (i % 2 ? 1 : -1)), 1, 1, 3, 1, i % 2 ? MAT.canvas_tan : MAT.wood_pale);
  R.wall('bookshelf', ['left', 'right', 'front', 'back'], [0.15, 0.85]); R.wall('bookshelf', ['left', 'right', 'front', 'back'], [0.3, 0.7]);
  R.wall('globe_desk', ['left', 'right', 'front', 'back'], [0.5]);
  readAt(R, R.U / 2 + 1, R.V / 2, 4, docList('Juniper Bay Historical Society — Minutes', 'Meeting of September 10, 1953, at Whitcomb House · Miss A. Whitcomb presiding', ['Present: 14 members, 1 cat (not ours).', 'Resolved: that the Society shall seal the Centennial time capsule on Founders Square following the Mayor\'s address. Carried.', 'Mrs. Pemberton to supply the box (copper-lined, Garrity\'s).', 'Mr. Pruitt again raised the question of the figurehead and the barn. Tabled, again.', 'Treasurer reports $41.12 on hand.', 'Refreshments: Mrs. Halloran (soda bread). Adjourned 9:40.']), 'Read the minutes');
  readHung(R, 'painting', ['back', 'front', 'left', 'right'], 6.5, docLetter('Painting: Whitcomb Point Light, 1868', 'Oil on canvas, by a summer painter from Boston: the new light on the point the year it was first lit, paid for by public subscription after the MARY ELLEN. A brass plate on the frame: "Fixed white light, visible fourteen miles. Kept by Amos Fisk since 1921."'), { po: { tint: '#5a7aa0' }, w: 4 });
  return d;
}
function whitcombStore(H, R) {
  R.setBack('+z');
  for (let i = 0; i < 16; i++) R.box(1 + (i % 6) * 1.5, 1 + Math.floor(i / 6) * 1.5, 1, 1, 0, 1 + (i % 3), i % 3 ? MAT.canvas_tan : MAT.wood_pale);
  R.wall('trunk', ['left', 'right', 'front'], [0.5]); R.wall('trunk', ['left', 'right', 'front'], [0.2, 0.8]);
  R.wall('bookshelf', ['left', 'right', 'front'], [0.5, 0.3]);
  readAt(R, R.U / 2, R.V / 2, 1, docLetter('Box 17: Pvt. Charles Doane, Letters Home', 'Camp near Falmouth, Va., Dec. 19th, 1862\n\nDear Mother,\n\nWe have been in a great battle at Fredericksburg and I am not hurt. Tell Father the boots he sent are the best in the company. Tell Lizzie I have not forgot her. I think about the cove and the smell of the salt house and I would give a month\'s pay for a plate of your chowder.\n\nYour aff. son, Charley\n\n(He was killed at Gettysburg the following July. His is the third name on the bronze soldier.)', { hand: true }), 'Read the letter in the box');
  R.prop('ceiling_lamp', R.U / 2, R.V / 2, 0, {}, R.h - 2);
}

// ---- Mayor Pemberton & the Minister
function pembertonStudy(H, R) {
  const d = fDen(H, R, { desk: 'desk_wood' });
  if (d.desk) H.home.desk.push(d.desk);
  H.home.lounge.push(...d.lounge);
  readAt(R, R.U / 2, R.V * 0.3, 3, DOC.mayorSpeech(), 'Read the speech');
  readAt(R, R.U * 0.3, R.V * 0.7, 3, DOC.permit(), 'Read Mrs. Pemberton\'s list');
  R.wall('flag_stand', ['back', 'left', 'right'], [0.1, 0.9]);
  readHung(R, 'photo_frames', ['left', 'right', 'front'], 6.2, docLetter('Photograph: Inauguration, 1946', 'Walter Pemberton taking the oath on the City Hall steps, January 1946, his hand on the Whitcomb family Bible (borrowed; Miss Whitcomb stood beside it the whole time). His first campaign slogan is on a button pinned to the frame: "PEMBERTON — HE FIXED THE SEAWALL."'), {});
}
function parsonageStudy(H, R) {
  const d = fDen(H, R, { desk: 'desk_rolltop' });
  if (d.desk) H.home.desk.push(d.desk);
  H.home.lounge.push(...d.lounge);
  R.wall('bookshelf', ['left', 'right', 'front'], [0.3, 0.7]);
  readAt(R, R.U / 2, R.V * 0.3, 3, DOC.sermon(), 'Read the sermon notes');
  readHung(R, 'painting', ['left', 'right', 'front'], 6.5, DOC.meetinghouse(), { po: { tint: '#d8c890' } });
}

// ---- after furnishing: exterior scenes and household documents
function specialsAfter(H) {
  const { f, b, ctx, rng, spec, R, W } = H;
  const s = spec.special;
  // --- Hatch: Admiral up the big front-yard maple
  if (s === 'cat') {
    const tx = H.drive === 'L' ? W - 14 : 14, tz = 13;
    f.box(tx - 1, -1, tz - 1, 4, 1, 4, MAT.dirt);
    f.box(tx, 0, tz, 2, 19, 2, MAT.bark);
    f.box(tx - 1, 0, tz - 1, 4, 2, 4, MAT.bark);
    // branches
    f.box(tx + 2, 14, tz, 5, 1, 1, MAT.bark); f.box(tx - 5, 16, tz + 1, 5, 1, 1, MAT.bark);
    f.box(tx, 17, tz - 9, 1, 1, 9, MAT.bark);          // the cat's branch, reaching toward the street
    f.box(tx, 16, tz - 3, 1, 1, 3, MAT.bark);
    // canopy: overlapping blobs of red, orange and maroon leaves
    const L = [MAT.leaves_red, MAT.leaves_orange, MAT.leaves_maroon, MAT.leaves_red];
    const blobs = [[0, 24, 0, 8, 7, 8], [-5, 21, 2, 6, 5, 7], [5, 21, -1, 6, 5, 7], [0, 21, 5, 7, 5, 6], [-2, 28, 1, 6, 4, 6], [3, 19, 4, 5, 4, 5], [-4, 19, -4, 5, 3, 5], [1, 20, -6, 5, 5, 4]];
    blobs.forEach(([dx, y, dz, hx, hy, hz], i) => { f.box(tx + 1 + dx - hx, y - hy, tz + 1 + dz - hz, hx * 2, hy * 2, hz * 2, L[i % L.length]); });
    // carve a notch so Admiral is visible from the sidewalk
    f.carve(tx - 1, 18, tz - 10, 3, 4, 4);
    f.box(tx, 17, tz - 10, 1, 1, 2, MAT.bark);
    const catP = [tx + 0.5, 18, tz - 8.5];
    f.prop('cat', catP[0], catP[1], catP[2], 0, { tint: '#d88a3a' });
    // a wooden ladder leaning on the trunk (too short, of course)
    for (let k = 0; k < 14; k++) { const zz = tz - 5 + Math.floor(k / 3); f.box(tx - 1, k, zz, 1, 1, 1, MAT.wood_pale); f.box(tx + 2, k, zz, 1, 1, 1, MAT.wood_pale); if (k % 2 === 1) f.box(tx, k, zz, 2, 1, 1, MAT.wood_light); }
    f.prop('leaf_pile', tx + 4, 0, tz - 3, 0, {});
    const cw = b.m(catP[0], catP[1], catP[2]);
    const under = b.spot('stand', tx + 0.5, 0, tz - 4, 2, { room: 0, act: 'wave', tags: ['cat_tree', 'yard'], label: 'Calling Admiral down' });
    under.faceTo = [cw[0], cw[2]];
    ctx.nav.link(under.node, H.frontOut); under.pendingLink = false;
    for (let i = 0; i < 9; i++) {
      const x = tx + 0.5 + (i - 4) * 2.4, z = i % 2 ? -4 : -8.5;
      const sp = b.spot('stand', x, 0, z, 0, { room: 0, act: 'cheer', tags: ['watch_cat'], label: 'Watching the cat rescue' });
      sp.faceTo = [cw[0], cw[2]]; sp.spread = 0.7;
      linkToSidewalk(ctx, sp.node); sp.pendingLink = false;
    }
    H.home.yard.push(under);
    housePlaque(H, docLetter('Brass Plaque', 'BUILT 1884\nFOR\nCAPT. SILAS HATCH\nMASTER OF THE BARK MORNING STAR\n\n“Fair winds and a following sea”'), 'BUILT 1884');
  }
  // --- Moreau: balloons, banner and the party in the back yard
  if (s === 'birthday') {
    const pr = H.porch;
    const ty = textSignType('SUSIE IS 7!', { bg: '#f4e8c8', fg: '#c8302a', border: '#5a8ae0', scale: 1 / 14 });
    f.prop(ty, H.doorX, (pr ? pr.roofY : 10) - 2.4, H.hz - (pr ? pr.pd : 1) + 0.2, 0, {});
    for (const x of [H.doorX - 4, H.doorX + 4]) f.prop('balloon_bunch', x, 1, H.hz - (pr ? pr.pd : 1) + 0.6, 0, { tint: rng.pick(['#e05a8a', '#5a8ae0', '#e0c040']) });
    f.prop('balloon_bunch', H.doorX + 3.5, 0, 2.2, 0, { tint: '#e05a8a', scale: 0.85 });
    if (pr && pr.type !== 'portico' && pr.type !== 'stoop') bunting(f, pr.px0, pr.roofY - 2, H.hz - pr.pd, pr.pw, PARTY());
    // yard: party games
    const back = H.hz + H.hd, D = H.D;
    const x0 = H.drive === 'L' ? 14 : 3, x1 = H.drive === 'R' ? W - 14 : W - 3;
    const yz0 = back + 8, yz1 = D - 6;
    let k = 0;
    for (let i = 0; i < 12; i++) {
      const x = x0 + 3 + ((i * 7) % Math.max(4, x1 - x0 - 6)), z = yz0 + ((i * 5) % Math.max(4, yz1 - yz0));
      const sp = H.yardSpot('stand', x, z, rng.int(0, 3), rng.pick(['play', 'play_ball', 'jump_rope', 'play']), ['party_yard']);
      sp.spread = 1.2; k++;
    }
    void k;
    f.prop('table_card', x0 + 5, 0, yz1 - 2, 0, { tint: '#f0d0dc' });
    f.prop('fruit_bowl', x0 + 5, 3.25, yz1 - 2, 0, { tint: '#e0c040' });
    f.prop('easel', x1 - 4, 0, yz1 - 1, 0, {});
    f.prop('painting', x1 - 4, 3.2, yz1 - 1.3, 0, { tint: '#b0a080' });
    b.readable(x1 - 4, 4, yz1 - 2.5, docLetter('Pin the Tail on the Donkey', 'A donkey drawn on butcher paper by Henri, tacked to the easel. Eleven paper tails with names on them: SUSIE, PAUL, JUDY, BOBBY, LINDA, RICHARD, CAROL, STEVIE, NANCY, MARGIE, and one that just says "?". Somebody has already stuck one on the donkey\'s nose.', { hand: true }), { prompt: 'Look at the game' });
    f.prop('lemonade_stand', x0 + 12, 0, yz0 - 3, 0, {});
    f.prop('bicycle', H.doorX + 5, 1, H.hz - 3, 1, { tint: '#d8403a' });
    f.prop('balloon_bunch', H.doorX + 5, 1, H.hz - 2, 0, { tint: '#e0c040' });
    for (let i = 0; i < 4; i++) f.prop('balloon_bunch', x0 + 2 + i * ((x1 - x0) / 4), 0, D - 2, 0, { tint: rng.pick(['#e05a8a', '#5a8ae0', '#e0c040', '#6ac06a']) });
    const kit = R.kitchen;
    readAt(kit, kit.U / 2, 1.5, 5, docLetter('Invitation, on the Icebox', 'YOU\'RE INVITED!\n\nSUSIE is turning 7!\nSaturday, September 26\n2 o\'clock\n14 Maple Street\n\nGames · Cake · Ice Cream\n\nRSVP Mrs. Henri Moreau · telephone 4-2217\n\n(Clipped behind it, Claire\'s schedule: 2:00 guests — 2:30 musical chairs — 3:00 pin the tail — 3:30 CAKE — 4:15 presents — and nobody cries.)', { hand: true }), 'Read the invitation');
    readAt(kit, 1, kit.V / 2, 4, docLetter('Pencil Marks on the Door Frame', 'SUSIE — 3 yrs · 4 yrs · 5 · 6 · (a fresh line, this morning:) 7!!\nPAUL — 2 · 3 · 4 (standing on his toes)\n\nHenri says they are not allowed to grow any more. Nobody listens.', { hand: true }), 'Look at the door frame');
    const sr = R.bedA;
    if (sr) readAt(sr, sr.U / 2, sr.V / 2, 3, docLetter('Birthday Card from Québec', 'Bonne fête, ma petite Susie!\n\nSept ans déjà! Be good for your Maman, and save us a piece of cake — we will come at Christmas on the train.\n\nGros bisous,\nGrand-maman et Grand-papa Moreau\nTrois-Rivières\n\n(A crisp one-dollar bill is still in the envelope.)', { hand: true }), 'Read the card');
  }
  // --- Hallorans: antenna, and the family's papers
  if (s === 'tv_dinner') {
    f.prop('tv_antenna', H.hx + H.hw / 2, H.roofTop ?? H.shellH + 12, H.hz + H.hd / 2, 0, { cat: 'far' });
    const gr = R.back;
    if (gr) {
      gr.wall('clock_grandfather', ['left', 'right', 'front'], [0.8, 0.2]);
      readHung(gr, 'photo_frames', ['left', 'right', 'front', 'back'], 6.2, docPaper('Thursday, June 12, 1902 · Clipping, yellowed, pinned above the bed', 'MARKET STREET IN ASHES', ['Fire discovered at half past two o\'clock in the hay loft of Beal\'s livery spread with terrible speed along the wooden block. The bakery of Mr. Patrick Halloran was among the last to fall; Mrs. Halloran was seen carrying the sourdough crock through the smoke.', 'By nightfall three blocks lay in ruins. By the mercy of Providence, no lives were lost.', '(In Bridget\'s hand, in the margin: "I was there. Keep a bucket by the back door. ALWAYS.")'], { title: 'Clipping: The Great Fire' }), {});
      gr.box(1, gr.V - 2, 1, 1, 0, 1, MAT.steel);
      gr.hangAny('portrait', ['left', 'right', 'front', 'back'], 7, { w: 2 });
    }
    const kit = R.kitchen;
    readAt(kit, kit.U / 2, 2, 5, docLetter('Recipe Card, Much Handled', 'NORA HALLORAN\'S SODA BREAD — 1887\n\n4 cups flour\n1 tsp. bread soda\n1 tsp. salt\n1¾ cups buttermilk\n(a handful of currants on Sundays)\n\nMix light and quick — "a heavy hand makes a heavy loaf." Cut a deep cross on top to let the fairies out. 45 min. in a hot oven.\n\n— N.H.', { hand: true }), 'Read the recipe card');
    if (R.bedA) readAt(R.bedA, R.bedA.U / 2, R.bedA.V / 2, 3, docLetter('Peggy\'s Diary (Locked. Mostly.)', 'Saturday, Sept. 26, 1953\n\nSOCK HOP TONIGHT!!! 7:30 in the gym. If Daddy asks, I am going with Joanie. (I am going with Joanie. And also with somebody else who shall remain NAMELESS, D.K.)\n\nMust do: pin curls, iron the blue skirt, dishes (ugh), be nice to Tommy (ugh).\n\nGrandma says in her day girls did not go to dances with boys whose fathers they did not know. I said Grandma, EVERYBODY knows everybody\'s father in this town.', { hand: true }), 'Read Peggy\'s diary');
    if (R.bedB) readAt(R.bedB, R.bedB.U / 2, R.bedB.V / 2, 1, docList('Tommy\'s Baseball Cards (in a cigar box)', '1953 Topps & Bowman — DO NOT TOUCH — this means you PEGGY', ['Mickey Mantle, Yankees (TRADED 2 Musials + a Kiner for him)', 'Ted Williams, Red Sox — "back from Korea!!"', 'Jackie Robinson, Dodgers', 'Warren Spahn, Braves', 'Yogi Berra, Yankees', 'Mel Parnell, Red Sox', '...and a Bazooka comic, and 212 bottle caps (counted)']), 'Look in the cigar box');
  }
  if (s === 'wedding_family') {
    const sw = R.back;
    if (sw) readAt(sw, sw.U / 2, sw.V / 2, 4, docLetter('Pinned to the Dress Form', 'Something old — Babcia\'s rosary (in the bouquet)\nSomething new — the dress (212 seed pearls — counted twice. S.N.)\nSomething borrowed — Aunt Zofia\'s veil (Chicopee, 1924)\nSomething blue — the garter (Walter is NOT to know about it)\n\nPress the veil LAST. 12:30 at the latest!!', { hand: true }), 'Read the note on the dress form');
    if (R.bedA) { R.bedA.wall('suitcase', ['left', 'right', 'front'], [0.5, 0.2]); readAt(R.bedA, R.bedA.U / 2, R.bedA.V / 2, 2, docLetter('Honeymoon', 'Two train tickets, Juniper Bay to Boston, Boston to Montréal, and a card from the Château Champlain: "Mr. & Mrs. Robert Brennan — Reservation confirmed, Sept. 27 – Oct. 3." The suitcase is packed. The going-away suit is navy blue, with a hat from Gould Millinery still in its box.', { hand: true }), 'Look at the packed suitcase'); }
    if (R.bedB) readAt(R.bedB, R.bedB.U / 2, R.bedB.V / 2, 2, docLetter('Usher\'s Instructions', 'WALTER —\n1. Bride\'s side on the LEFT. Groom\'s side on the right.\n2. Offer your RIGHT arm to the ladies.\n3. Do not run.\n4. Do NOT take off the collar until after the photographs.\n5. Cousin Stefan is not to be seated near the punch.\n— Mother', { hand: true }), 'Read the usher\'s card');
  }
  if (spec.family === 'Kaminski') {
    const kit = R.kitchen;
    readAt(kit, kit.U * 0.55, Math.max(kit.V * 0.62, 7.5), 3, docLetter('Note on the Kitchen Table', 'CAROL — PAINS STARTED 11:20.\nGONE TO ST. LUKE\'S!!!\nCalled Dr. Pike. Took the SUITCASE.\nFeed the cat. Tell my mother.\n— S.\n\n(underneath, in pencil, not Carol\'s hand: "Stan you forgot your hat. — Mrs. Kowalski next door")', { hand: true }), 'Read the note');
    if (R.bedA) readAt(R.bedA, R.bedA.U / 2, R.bedA.V / 2, 3, docLetter('Calendar in the Nursery', 'September 1953\n\nThe 20th circled twice in red: "DUE!!"\n20 — crossed out. 21 — crossed out. 22, 23, 24, 25 — crossed out, harder each day.\n\nOn the crib, a tag from Harlow\'s: "Maple crib, $24.95 — delivered Aug. 29." A pair of yellow booties sits on the pillow, knitted by Opal Fisk, who knits for every baby born in town.', { hand: true }), 'Look at the calendar');
  }
  if (spec.family === 'Castellano') { /* handled in the rowhouse */ }
  // --- Hillcrest captains' houses: a plaque by the door
  if (spec.victorian && s !== 'historian') {
    const cap = CAPTAINS[(H.lot.number >> 1) % CAPTAINS.length], ship = SHIPS[(H.lot.number >> 2) % SHIPS.length];
    housePlaque(H, docLetter('Juniper Bay Historical Society', `THE ${cap.toUpperCase()} HOUSE\nBuilt ${H.age}\n\nMaster of the ${ship}. One of the "captains' row" houses built on Hillcrest Avenue with the fortunes of the coasting trade and the cannery.\n\nPlaque placed by the Historical Society, 1938.`), `BUILT ${H.age}`);
  }
  if (s === 'historian') {
    housePlaque(H, docLetter('Whitcomb House', 'WHITCOMB HOUSE\nBuilt 1857 by Capt. Elias Whitcomb (1809–1889)\nmaster of the schooner JUNIPER, founder of Juniper Bay\n\nHOME OF THE JUNIPER BAY HISTORICAL SOCIETY\nFounded 1903 · Open Saturdays, 10 to 4\nRing the ship\'s bell and Miss Whitcomb will let you in.'), 'WHITCOMB 1857');
    const ty = textSignType('HISTORICAL SOCIETY', { bg: '#1f3a2a', fg: '#e8d8a0', border: '#c9a24a', scale: 1 / 12 });
    f.prop(ty, H.doorX + 11, 0, 2, 0, {});
    f.box(H.doorX + 11, 0, 2, 1, 4, 1, MAT.wood_dark);
    f.prop('bell_brass', H.doorX + 3.5, 5, H.hz - 0.3, 0, {});
    f.prop('anchor_display', H.doorX - 9, 0, H.hz - 12, 0, {});
    b.readable(H.doorX - 9, 1, H.hz - 13.5, docLetter('The Anchor', 'Anchor of the schooner JUNIPER, raised from Whitcomb\'s wharf when the old pilings were pulled in 1931. It held her through the gale of October 1851 "in six fathoms, good holding in mud." The Society asks that children not climb on it. The children of Juniper Bay have climbed on it since 1931.'), { prompt: 'Read the card on the anchor' });
  }
  if (spec.name === 'The Parsonage') housePlaque(H, docLetter('The Parsonage', 'THE PARSONAGE\nFirst Congregational Church\nBuilt 1872, the year after the new Meeting House was raised\n\nHome of the settled ministers of the church:\nRev. Obadiah Mayhew · Rev. Josiah Pike · Rev. Charles Lathrop · Rev. Theodore Ashby'), 'PARSONAGE 1872');
  if (spec.family === 'Pemberton') {
    f.prop('flag_pole', H.doorX - 12, 0, 6, 0, { cat: 'far' });
    const ty = textSignType('RE-ELECT PEMBERTON', { bg: '#1d2c5a', fg: '#f0e8d8', border: '#c83a2a', scale: 1 / 18 });
    f.prop(ty, H.doorX + 9, 0.2, 3, 0, {});
  }
}

// ---- generic lived-in details for every other house
function lifeDetails(H) {
  const { rng, R, f, spec } = H;
  if (spec.special || spec.name) return;
  const docs = [];
  docs.push([R.hall, 'table', DOC.programme()]);
  if (rng.chance(0.5)) docs.push([R.kitchen, 'wall', DOC.calendar(rng)]);
  if (rng.chance(0.4)) docs.push([R.kitchen, 'table', DOC.groceries(rng)]);
  if (rng.chance(0.25)) docs.push([R.kitchen, 'table', DOC.recipe(rng)]);
  if (rng.chance(0.3)) docs.push([R.living, 'wall', DOC.weddingPhoto(rng)]);
  if (rng.chance(0.3)) docs.push([R.living, 'table', DOC.courier()]);
  if (rng.chance(0.2)) docs.push([R.hall, 'wall', rng.chance(0.5) ? DOC.wwi() : DOC.vjday()]);
  if (rng.chance(0.15)) docs.push([R.living, 'wall', DOC.hurricane()]);
  if (rng.chance(0.2)) docs.push([R.bedA || R.bed2, 'table', DOC.capsuleLetter(rng)]);
  if (rng.chance(0.15)) docs.push([R.bedB || R.bed2, 'table', DOC.reportCard(rng)]);
  if (rng.chance(0.2)) docs.push([R.hall, 'table', DOC.churchBulletin(rng)]);
  if (rng.chance(0.15)) docs.push([R.living, 'table', DOC.postcard(rng)]);
  if (H.star === 'blue') docs.push([R.living, 'table', DOC.navyLetter(rng)]);
  if (H.star === 'gold') docs.push([R.living, 'wall', DOC.goldStar(rng)]);
  for (const [room, how, doc] of docs) {
    if (!room) continue;
    if (how === 'wall') { if (!readHung(room, 'photo_frames', ['left', 'right', 'front', 'back'], 6.2, doc, {})) readAt(room, room.U / 2, room.V / 2, 3, doc); }
    else readAt(room, room.U * rng.float(0.35, 0.65), room.V * rng.float(0.35, 0.65), 3, doc);
  }
  // little scenes
  const L = R.living;
  if (rng.chance(0.3) && L) { // a half-finished jigsaw on a card table
    if (L.at('table_card', L.U * 0.72, L.V * 0.3, 0)) { L.box(Math.round(L.U * 0.72) - 1, Math.round(L.V * 0.3) - 1, 2, 2, 3, 1, rng.pick([MAT.sign_teal, MAT.sign_blue, MAT.leaves_green])); readAt(L, L.U * 0.72, L.V * 0.3, 4, docLetter('Jigsaw Puzzle', `A 500-piece jigsaw on the card table, about half done: "${rng.pick(['The Old Mill at Sudbury', 'Clipper Ship CUTTY SARK', 'Autumn in Vermont', 'Washington Crossing the Delaware'])}". The box lid is propped against the lamp. The sky is all that is left, and nobody wants to do the sky.`), 'Look at the puzzle'); }
  }
  if (rng.chance(0.3)) f.prop('cat', L.x0 + 2, L.y, L.z0 + 2, rng.float(0, 4), { tint: rng.pick(['#2a2a2a', '#d88a3a', '#8a8a8a', '#f0ece0']) });
}

// ---------------------------------------------------------------- porch furniture & facade extras
function porchLife(H) {
  const { f, rng, R, hz, pal, spec } = H;
  const P = R.porch, pr = H.porch;
  if (!P || !pr) return;
  const out = [];
  if (pr.type === 'full' || pr.type === 'wrap' || pr.type === 'craftsman') {
    // porch swing on chains at one end
    const end = rng.chance(0.5) ? 'left' : 'right';
    const su = end === 'left' ? 2.2 : P.U - 2.2, sv = P.V / 2, srot = end === 'left' ? 1 : 3;
    if (P.at('garden_bench', su, sv, srot, { fp: [6, 2.6] })) {
      out.push(sit(P, su, sv, srot, rng.pick(['rock', 'read', 'talk_sit', 'knit']), ['porch', 'lounge'], 0.45, { label: 'On the porch swing' }));
      P.box(su - 0.5, sv - 3, 1, 1, 3, pr.roofY - 4, MAT.iron); P.box(su - 0.5, sv + 2, 1, 1, 3, pr.roofY - 4, MAT.iron);
    }
    for (const t of [0.3, 0.7]) {
      const pl = P.wall(rng.chance(0.6) ? 'rocking_chair' : 'chair_wood', 'back', [t, t + 0.08, t - 0.08]);
      if (pl) out.push(sit(P, pl.u, pl.v, pl.rot, rng.pick(['rock', 'read', 'smoke_pipe', 'sit']), ['porch', 'lounge'], 0.45));
    }
    if (rng.chance(0.5)) P.wall('table_side', 'back', [0.5, 0.2, 0.8]);
    if (rng.chance(0.4)) P.wall('plant_pot', ['back', 'left', 'right'], [0.05, 0.95]);
    if (rng.chance(0.25)) P.at('dog', P.U * rng.float(0.3, 0.7), P.V * 0.4, rng.int(0, 3), { fp: [2.5, 4] });
    // Harbor Days bunting & a flag on a post
    if (H.bunting) for (let x = pr.px0 + 2; x < pr.px0 + pr.pw - 2; x += 8) if (Math.abs(x - H.doorX) > 4) f.prop('bunting_fan', x, pr.roofY - 2.5, hz - pr.pd + 0.3, 0, {});
    if (H.flag) voxFlag(f, H.doorX + 4, 7, hz, false);
  } else {
    if (pr.type === 'portico' && rng.chance(0.5)) { const pl = P.wall('chair_wood', 'back', [0.12, 0.88]); if (pl) out.push(sit(P, pl.u, pl.v, pl.rot, 'read', ['porch', 'lounge'], 0.45)); }
    if (H.flag) voxFlag(f, H.doorX + 4, 9, hz, false);
  }
  if (!out.length) out.push(P.spot('stand', P.U / 2 + 3, P.V * 0.45, 0, { act: rng.pick(['look', 'stand', 'sweep']), tags: ['porch'] }));
  H.home.porch.push(...out);
  H.home.lounge.push(...out.filter((s) => s.pose === 'sit'));
  // everyday things by the door
  f.box(H.doorX - 2, 0, hz - 2, 4, 1, 1, rng.pick([MAT.rubber_mat, MAT.carpet_red, MAT.carpet_green]));
  if (rng.chance(0.6)) f.prop('milk_bottles', H.doorX + 2.8, 1, hz - 0.7, 0, {});
  if (rng.chance(0.5)) f.prop('newspaper_pile', H.doorX + rng.float(-1.5, 1.5), 0, hz - pr.pd - 1.3, rng.float(0, 4), { scale: 0.55 });
  // pumpkins & mums on the steps
  if (rng.chance(0.65)) { f.prop('pumpkin', H.doorX - 3.2, 0, hz - pr.pd - 1, rng.float(0, 4), {}); if (rng.chance(0.6)) f.prop('pumpkin_small', H.doorX - 4.3, 0, hz - pr.pd - 1.6, 0, {}); }
  if (rng.chance(0.5)) f.prop('flower_pot', H.doorX + 3.4, 0, hz - pr.pd - 1, 0, { tint: rng.pick(['#e0a030', '#9a4ab0', '#c83a2a']) });
  if (rng.chance(0.3)) f.prop(rng.pick(['bicycle', 'tricycle', 'wagon_red']), H.doorX + rng.float(6, 12) * (rng.chance(0.5) ? 1 : -1), 0, hz - pr.pd - rng.float(2, 6), rng.float(0, 4), { tint: rng.pick(['#c8302a', '#2a5a9a', '#2a7a4a']) });
  void spec; void pal;
}

// ---------------------------------------------------------------- the detached house
export function buildHouse(ctx, lot, spec) {
  const rng = ctx.rng.fork('house' + lot.x + ',' + lot.z);
  const family = spec.family || null;
  const name = spec.name || (family ? `${family} Residence` : `${lot.number} ${lot.street}`);
  const b = new Building(ctx, { name, kind: 'house', lot, address: spec.address || lot.address, tags: spec.special ? [spec.special] : [] });
  const H = makeH(ctx, b, rng, lot, spec);
  design(H);
  H.windowBoxes = rng.chance(0.35); H.boxTint = rng.pick(['#c8302a', '#e0a030', '#b04a8a', '#e8e0d0']);
  H.star = spec.special || spec.name ? null : rng.weighted([[null, 20], ['blue', 2], ['gold', 1.2]]);
  if (spec.family === 'Castellano') H.star = 'blue';
  H.flag = rng.chance(0.45) || spec.special === 'wedding_family' || spec.family === 'Pemberton';
  H.bunting = rng.chance(0.35) || spec.special === 'birthday';
  specialPlan(H);
  if (H.fns.livingWall) H.fns.livingWall = H.fns.livingWall;
  planHouse(H);
  // ground & structure
  H.f.box(0, -1, 0, H.W, 1, H.D, MAT.grass_lawn);
  houseShell(H);
  houseRoof(H);
  porchHouse(H);
  if (H.style === 'queenanne' && (!H.big || rng.chance(0.7))) turretHouse(H);
  if (H.turret && H.R.porch) { const P = H.R.porch, t = H.turret; const a = P.uv(t.cx - 8, t.cz - 8), c = P.uv(t.cx + 8, t.cz + 8); P.claim([Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1])]); }
  finishHouse(H);
  turretConnect(H);
  if (H.style === 'cape') dormersCape(H);
  doorsHouse(H);
  const lx = extSide(H, H.R.living);
  if (lx && spec.special !== 'tv_dinner' && (H.style === 'colonial' || H.style === 'cape' || H.style === 'federal' || (H.style === 'bungalow' && rng.chance(0.6)) || (H.style === 'foursquare' && rng.chance(0.5)))) fireplace(H, H.R.living, lx);
  if (H.style === 'queenanne' || H.style === 'italianate' || H.style === 'mansard' || (H.style === 'foursquare' && rng.chance(0.4))) { const ds = extSide(H, H.R.dining); if (ds) bayWindow(H, H.R.dining, ds); }
  windowsHouse(H);
  frontDoor(H);
  // grounds (after the porch so the walk meets its steps)
  siteHouse(H);
  // interiors
  furnishHouse(H);
  yardHouse(H);
  specialsAfter(H);
  lifeDetails(H);
  porchLife(H);
  if (!spec.special && rng.chance(0.18)) f_tvAntenna(H);
  // plaques on the older houses of Church Street / elsewhere
  if (!spec.victorian && !spec.special && !spec.name && H.age < 1900 && rng.chance(0.7)) {
    const cap = CAPTAINS[(lot.number >> 1) % CAPTAINS.length];
    housePlaque(H, docLetter('House Marker', `${cap.toUpperCase()} HOUSE\nc. ${H.age}\n\nJuniper Bay Historical Society`), `C. ${H.age}`);
  }
  // link the front to the street
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  // ---- the household record
  const home = H.home;
  if (!home.dine.length) home.dine.push(...home.kitchen.filter((s) => s.tags.includes('kitchen_table')));
  if (!home.kitchen.length) home.kitchen.push(H.R.kitchen.spot('stand', H.R.kitchen.U / 2, 3, 0, { act: 'cook', tags: ['cook'] }));
  if (!home.lounge.length) home.lounge.push(...home.porch);
  if (!home.beds.length) home.beds.push(H.R.living.spot('sleep', H.R.living.U / 2, H.R.living.V / 2, 0, { act: 'sleep', tags: ['sleep'], seat: 0.4 }));
  if (spec.special === 'birthday') {
    // make sure there are at least 10 party seats
    const party = H.b.spots.filter((s) => s.tags.includes('party'));
    void party;
  }
  b.home({ family, size: home.beds.length, beds: home.beds, dine: home.dine, lounge: home.lounge, kitchen: home.kitchen, bath: home.bath, yard: home.yard, porch: home.porch, desk: home.desk, special: spec.special || null });
  b.frontDoor = { x: H.doorX };
  b.lore = H.age ? `Built c. ${H.age} (${styleName(H.style)}).` : null;
  return b;
}
function styleName(s) { return { colonial: 'Colonial Revival', foursquare: 'American Foursquare', cape: 'Cape Cod', bungalow: 'Craftsman bungalow', queenanne: 'Queen Anne', mansard: 'Second Empire', italianate: 'Italianate', federal: 'Federal' }[s] || s; }
function f_tvAntenna(H) { H.f.prop('tv_antenna', H.hx + H.hw * 0.3, H.roofTop ?? H.shellH + 10, H.hz + H.hd / 2, H.rng.float(0, 4), { cat: 'far' }); }

// ================================================================ rowhouses (brick & brownstone)
// Is there another lot touching this one on its left / right side? (party walls vs. exposed end walls)
function rowNeighbours(b, lot) {
  const f = b.f;
  const probe = (x) => { const p = f.m(x, 0, lot.d / 2); return PLAN.some((l) => l.m !== lot.m && p[0] > l.m.x0 - 0.3 && p[0] < l.m.x1 + 0.3 && p[2] > l.m.z0 - 0.3 && p[2] < l.m.z1 + 0.3 && l.spec.kind !== 'gap'); };
  return { left: probe(-1.5), right: probe(lot.w + 1.5) };
}
// thin-tread flight (can be stacked floor above floor in the same column): first tread footprint at (x, z)
function stairThin(H, x, y, z, dir, rise, o = {}) {
  return stairFlight(H, x, y, z, dir, rise, { ...o, thin: true });
}
const GHOSTS = ['UNEEDA BISCUIT', 'HALLORAN\'S BREAD', 'CASTORIA', 'MAIL POUCH', 'MOXIE', 'ARM & HAMMER', 'COCA-COLA', 'BULL DURHAM', 'SAPOLIO', 'LYDIA PINKHAM\'S'];

export function buildRowhouse(ctx, lot, spec) {
  const rng = ctx.rng.fork('row' + lot.x + ',' + lot.z);
  const family = spec.family || null;
  const b = new Building(ctx, { name: spec.name || (family ? `${family} Residence` : `${lot.number} ${lot.street}`), kind: 'house', lot, address: lot.address, tags: spec.special ? [spec.special] : [] });
  const H = makeH(ctx, b, rng, lot, spec);
  const { f } = H;
  const W = lot.w, D = lot.d;
  const brown = spec.style === 'brownstone';
  const nb = rowNeighbours(b, lot);
  const outer = brown ? (rng.chance(0.6) ? MAT.granite_pink : MAT.sandstone) : M(rng.pick(['brick_red', 'brick_dark', 'brick_brown', 'brick_orange', 'brick_red', 'brick_paint_red']));
  const trim = brown ? MAT.sandstone : M(rng.pick(['limestone', 'limestone', 'trim_white', 'granite']));
  const corniceM = brown ? MAT.trim_dark : M(rng.pick(['trim_dark', 'trim_cream', 'trim_green', 'trim_black', 'trim_white']));
  const pal = H.pal = { siding: outer, trim, accent: corniceM, roof: MAT.roof_tar, shutters: null, door: rng.pick(['#2a2a2e', '#5a2a24', '#2a4a3a', '#3a2a1a', '#7a2a24']), curtain: M(rng.pick(CURTAIN)), itrim: rng.chance(0.5) ? MAT.trim_white : MAT.wood_dark };
  pal.idoor = pal.itrim === MAT.trim_white ? '#e8e4d8' : '#6a4a2e';
  H.FH = 12; H.floors = 3; H.style = brown ? 'brownstone' : 'row';
  const FH = 12, Y0 = brown ? 3 : 2, A0 = Y0 + 1;
  const hz = brown ? 7 : 6, hd = Math.min(D - hz - 28, 56);
  H.hx = 0; H.hz = hz; H.hw = W; H.hd = hd;
  const A = (k) => A0 + k * FH;
  const topY = A(3) - 1;
  // ---- ground, shell, slabs
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(0, -1, 0, W, 1, hz, MAT.sidewalk);
  f.walls(0, 0, hz, W, topY + 3, hd, outer, 1);
  f.box(1, 0, hz + 1, W - 2, Y0, hd - 2, MAT.stone_foundation);
  f.box(0, 0, hz, W, Y0 + 1, 1, brown ? MAT.sandstone : MAT.granite);          // raised base course
  for (let k = 1; k < 3; k++) f.box(1, A(k) - 2, hz + 1, W - 2, 2, hd - 2, MAT.plaster_white);
  f.box(1, A(3) - 2, hz + 1, W - 2, 1, hd - 2, MAT.ceiling);
  f.box(0, topY, hz, W, 1, hd, MAT.roof_tar);
  f.walls(0, topY + 1, hz, W, 2, hd, outer, 1);
  f.walls(0, topY + 3, hz, W, 1, hd, trim, 1);
  // ---- facade: cornice, belt courses
  f.box(0, topY - 1, hz - 1, W, 1, 1, corniceM); f.box(-0, topY, hz - 2, W, 1, 2, corniceM); f.box(0, topY + 1, hz - 3, W, 1, 3, corniceM);
  for (let x = 1; x < W - 1; x += 3) f.box(x, topY - 2, hz - 1, 1, 1, 1, corniceM);                           // brackets/dentils
  f.box(0, A(1) - 2, hz - 1, W, 1, 1, trim);
  if (!nb.left) f.box(0, 0, hz, 1, topY + 3, hd, outer);
  // ---- plan
  const doorSide = rng.chance(0.5) ? 'L' : 'R';
  const hallW = 11;
  const hA = doorSide === 'L' ? 1 : W - 1 - hallW, hB = hA + hallW;
  const rc0 = doorSide === 'L' ? hB : 1, rc1 = doorSide === 'L' ? W - 1 : hA;   // room column cells
  const stairX = doorSide === 'L' ? hA + 1 : hB - 5, railX = doorSide === 'L' ? hA + 5 : hB - 6;
  const passX = doorSide === 'L' ? [hA + 6, hB - 1] : [hA + 1, hB - 6];
  H.passX = passX; H.doorX = Math.round((passX[0] + passX[1]) / 2);
  const iz0 = hz + 1, iz1 = hz + hd - 1;
  const vest = 5, s = hz + 2 + vest;
  const air = (x0, x1, z0, z1) => [x0 + 1, z0 + 1, x1 - x0 - 2, z1 - z0 - 2];
  const castel = spec.special === 'welcome_home';
  const rows = [
    castel ? [['parlor', 'Parlor', 0.28], ['dining', 'Dining Room', 0.4], ['kitchen', 'Kitchen', 0.32]] : [['parlor', 'Parlor', 0.36], ['dining', 'Dining Room', 0.32], ['kitchen', 'Kitchen', 0.32]],
    [['master', 'Front Bedroom', 0.42], ['bath', 'Bathroom', 0.2], ['bedB', 'Back Bedroom', 0.38]],
    [['bedC', 'Front Bedroom', 0.5], ['bedD', 'Back Bedroom', 0.5]],
  ];
  if (castel) { rows[1][2][1] = 'Nonna Lucia\'s Room'; rows[2][0][1] = 'Sal\'s Room'; rows[2][1][1] = 'Maria\'s Room'; }
  H.R = {};
  const halls = [];
  for (let k = 0; k < 3; k++) {
    const [hx, hzz, hw, hdd] = air(hA, hB, iz0, iz1);
    const hall = new Room(H, k === 0 ? 'Front Hall' : k === 1 ? 'Second Floor Hall' : 'Third Floor Hall', hx, A(k), hzz, hw, hdd, FH - 2, { fn: k === 0 ? 'hall' : 'hall2', nav: [(passX[0] + passX[1]) / 2, (iz0 + iz1) / 2] });
    hall.frontN = b.navPoint(hall.id, (passX[0] + passX[1]) / 2, A(k), hz + 4);
    hall.backN = b.navPoint(hall.id, (passX[0] + passX[1]) / 2, A(k), s + 2 * FH + 2);
    hall.cell = { x0: hA, x1: hB, z0: iz0, z1: iz1 }; hall.floor = k;
    halls.push(hall);
    let z = iz0;
    rows[k].forEach(([key, nm, frac], i) => {
      const z1 = i === rows[k].length - 1 ? iz1 : z + Math.round((iz1 - iz0) * frac);
      const [x, zz, w, d] = air(rc0, rc1, z, z1);
      const R = new Room(H, nm, x, A(k), zz, w, d, FH - 2, { fn: key === 'parlor' ? 'living' : key === 'master' || key.startsWith('bed') ? 'bed' : key });
      R.cell = { x0: rc0, x1: rc1, z0: z, z1 }; R.floor = k; R.key = key;
      H.R[key] = R;
      z = z1;
    });
  }
  H.R.hall = halls[0];
  // ---- finishes
  const wallP = () => M(rng.pick(rng.chance(0.6) ? PAPER : PLASTER));
  for (const R of H.rooms) {
    const k = R.fn;
    const o = { wall: wallP(), floor: M(rng.pick(WOODF)), base: pal.itrim === MAT.trim_white ? MAT.trim_white : MAT.wood_dark };
    if (k === 'kitchen') { o.floor = M(rng.pick(KITF)); o.wall = M(rng.pick(['plaster_yellow', 'plaster_mint', 'plaster_cream', 'wallpaper_yellow'])); o.wainscot = rng.chance(0.5) ? M(rng.pick(TILEW)) : null; o.rail = MAT.trim_white; }
    if (k === 'bath') { o.floor = M(rng.pick(BATHF)); o.wall = M(rng.pick(['plaster_white', 'plaster_mint', 'plaster_pink'])); o.wainscot = M(rng.pick(TILEW)); o.rail = MAT.trim_white; }
    if (k === 'living' || k === 'dining') { o.crown = pal.itrim; if (brown) o.ceil = MAT.ceiling_tin; }
    if (k === 'hall' || k === 'hall2') o.wall = M(rng.pick(['wallpaper_cream', 'wood_panel_light', 'wallpaper_green', 'plaster_cream']));
    if (castel && k === 'dining') o.wall = MAT.wallpaper_cream;
    finish(H, R, o);
  }
  // ---- doors between hall and rooms
  const hallEdge = doorSide === 'L' ? hB : hA;
  for (let k = 0; k < 3; k++) {
    for (const [key] of rows[k]) {
      const R = H.R[key];
      const zc = castel && key === 'dining' ? R.z0 + R.d - 3 : clamp(Math.round(R.z0 + (key === 'parlor' ? 4 : R.d / 2)), R.z0 + 3, R.z0 + R.d - 3);
      connect(H, halls[k], R, hallEdge, zc, 'z', { leaf: key === 'parlor' || key === 'dining' ? false : 'door_wood', w: key === 'parlor' ? 5 : 4 });
    }
  }
  // pocket doors between parlour and dining room
  connect(H, H.R.parlor, H.R.dining, H.R.parlor.x0 + Math.round(H.R.parlor.w / 2), H.R.dining.z0 - 1, 'x', { w: castel ? 10 : 6, leaf: false });
  // ---- stairs (stacked straight flights, thin treads)
  for (let k = 0; k < 2; k++) {
    const st = stairThin(H, stairX, A(k), s, '+z', FH, { rail: doorSide === 'L' ? 'R' : 'L', topY: A(k + 1) + FH - 2, head: 10, runner: k === 0 && rng.chance(0.5) ? MAT.carpet_red : null, baluster: pal.itrim });
    const bn = b.navPoint(0, st.bottom.x, A(k), Math.max(st.bottom.z, halls[k].z0 + 0.6), [halls[k].frontN]);
    const tn = b.navPoint(0, st.top.x, A(k + 1), Math.min(st.top.z, halls[k + 1].z0 + halls[k + 1].d - 0.6), [halls[k + 1].backN]);
    ctx.nav.link(bn, tn);
    railing(H, railX, A(k + 1), s + 2, 2 * FH - 3, 'z', { mat: MAT.wood_dark, bal: pal.itrim });
    if (k === 1) railing(H, stairX, A(k + 1), s + 1, 4, 'x', { mat: MAT.wood_dark, bal: pal.itrim });
  }
  // skylight over the stairwell
  f.box(stairX, topY, s + 4, 4, 1, 10, MAT.glass); f.box(stairX - 1, topY + 1, s + 3, 6, 1, 12, trim); f.carve(stairX, topY + 1, s + 4, 4, 1, 10); f.box(stairX, topY + 2, s + 4, 4, 1, 10, MAT.glass);
  f.carve(stairX, A(3) - 2, s + 4, 4, 1, 10);
  // ---- front door with stoop, transom, number
  const dx = H.doorX - 2;
  f.carve(dx, A0, hz, 4, 9, 2);
  f.box(dx - 1, A0, hz - 1, 1, 11, 1, trim); f.box(dx + 4, A0, hz - 1, 1, 11, 1, trim); f.box(dx - 2, A0 + 10, hz - 2, 8, 1, 2, trim);
  f.carve(dx, A0 + 9, hz, 4, 1, 1); f.box(dx, A0 + 9, hz, 4, 1, 1, MAT.glass);
  if (brown) { f.box(dx - 2, A0, hz - 1, 1, 10, 1, trim); f.box(dx + 5, A0, hz - 1, 1, 10, 1, trim); f.box(dx - 3, A0 + 11, hz - 3, 10, 1, 3, trim); }
  // stoop: landing at the door + steps down toward the street, iron railings
  const sw = 6, sx0 = dx - 1;
  for (let k = 0; k < Y0; k++) f.box(sx0, 0, hz - 2 - k * 2, sw, Y0 - k, 2, brown ? MAT.sandstone : MAT.granite);
  const stoopLen = Y0 * 2;
  for (const x of [sx0 - 1, sx0 + sw]) { for (let k = 0; k < stoopLen; k += 2) f.box(x, Y0 - Math.floor(k / 2), hz - 1 - k, 1, 4, 1, MAT.iron); f.box(x, Y0 + 3, hz - stoopLen, 1, 1, stoopLen, MAT.iron); }
  const out = b.entrance(halls[0].id, H.doorX, A0, hz + 1, { outZ: -2.5, outY: 0, leaf: 'door_wood', tint: pal.door, main: true });
  halls[0].markDoor(H.doorX, hz + 1, 4);
  H.frontOut = out;
  const nty = textSignType(String(lot.number), { bg: '#1d1d22', fg: '#e8c870', border: '#c9a24a', scale: 1 / 22 });
  f.prop(nty, H.doorX, A0 + 9.3, hz - 0.1, 0, {});
  if (family) f.prop(textSignType(family.toUpperCase(), { bg: '#e8e0c8', fg: '#2a2a2a', border: '#8a6a3a', scale: 1 / 36 }), H.doorX + 3.6, A0 + 5.5, hz - 0.12, 0, {});
  // ---- windows (room-driven)
  const tallW = 7;
  for (const R of H.rooms) {
    if (!R.cell) continue;
    const bath = R.fn === 'bath', kit = R.fn === 'kitchen';
    const sides = [];
    if (R.cell.z0 === iz0) sides.push(['-z', hz, R.x0, R.w]);
    if (R.cell.z1 === iz1) sides.push(['+z', hz + hd - 1, R.x0, R.w]);
    if (R.cell.x0 === 1 && !nb.left) sides.push(['-x', 0, R.z0, R.d]);
    if (R.cell.x1 === W - 1 && !nb.right) sides.push(['+x', W - 1, R.z0, R.d]);
    for (const [bs, cw, a0, len] of sides) {
      if (R === halls[0] && bs === '-z') continue;
      const n = bath ? 1 : len >= 17 ? 2 : 1;
      const w = bath ? 3 : 4, h = bath ? 4 : (R.floor === 0 && R.fn === 'living' ? 8 : tallW);
      const y = R.y + (bath || kit ? 3 : 2);
      const gap = (len - n * w) / (n + 1);
      for (let i = 0; i < n; i++) {
        const a = Math.round(a0 + gap * (i + 1) + w * i);
        wWin(H, bs, a, y, cw, w, h, { frame: brown ? MAT.trim_dark : MAT.trim_white, lintelWide: true, lintelMat: trim, sillMat: trim, curtain: bath ? null : pal.curtain, glass: bath ? MAT.glass_green : undefined, box: bs === '-z' && R.floor === 0 && rng.chance(0.4), boxTint: rng.pick(['#c8302a', '#e0a030']), star: castel && bs === '-z' && R.floor === 1 && i === 0 ? 'blue' : null }, R);
        if (bs === '-z' && brown) f.box(a + 1, y + h + 1, hz - 2, 2, 1, 1, trim); // keystone
      }
    }
  }
  // ---- side wall of an end unit: ghost sign
  if (!nb.left || !nb.right) {
    const side = !nb.left ? 'left' : 'right';
    const F = f.faceFrame(side);
    const zc = side === 'left' ? 0 : W - 1;
    const txt = GHOSTS[(lot.number >> 1) % GHOSTS.length];
    const tw = F.textWidth(txt, 1, 'small');
    if (tw < hd - 6) F.text(txt, D - hz - hd / 2, A(2) + 2, (side === 'left' ? zc : W - zc - 1) - 1, MAT.sign_cream, { align: 'center', font: 'small' });
    H.endUnit = side;
  }
  // ---- roof: chimneys, antenna, water tower on the end units, a hatch
  roofChimney(f, 1, topY + 1, hz + 10, 3, 3, topY + 7, MAT.brick_red, 2);
  roofChimney(f, W - 4, topY + 1, hz + hd - 14, 3, 3, topY + 6, MAT.brick_dark, 1);
  if (rng.chance(0.5)) f.prop('tv_antenna', W / 2, topY + 1, hz + hd / 2, rng.float(0, 4), { cat: 'far' });
  if (H.endUnit && rng.chance(0.6)) f.prop('water_tower', W / 2, topY + 1, hz + hd - 12, 0, { cat: 'far' });
  f.box(W - 9, topY + 1, hz + hd / 2 + 4, 5, 3, 5, outer); f.box(W - 9, topY + 4, hz + hd / 2 + 4, 5, 1, 5, MAT.roof_tar);
  // ---- fire escape on the back (or front, on some brick rows)
  if (!brown && rng.chance(0.35)) {
    const B = H.B, zb = D - (hz + hd);
    B.box(W / 2 - 5, 0, zb - 1, 1, 1, 1, MAT.iron);
    for (let k = 1; k < 3; k++) {
      const y = A(k) - 1, x0 = Math.round(W / 2 - 6);
      B.box(x0, y, zb - 5, 12, 1, 5, MAT.iron); B.box(x0, y + 1, zb - 5, 12, 1, 1, MAT.iron); B.box(x0, y + 4, zb - 5, 12, 1, 1, MAT.iron);
      B.box(x0, y + 1, zb - 5, 1, 4, 5, MAT.iron); B.box(x0 + 11, y + 1, zb - 5, 1, 4, 5, MAT.iron);
      for (let j = 0; j < FH; j++) B.box(x0 + 2 + Math.floor(j * 7 / FH), y - j, zb - 3, 2, 1, 2, MAT.iron);
    }
  }
  // ---- back door, stoop and yard
  const kr = H.R.kitchen;
  const bx = Math.round(kr.x0 + kr.w * 0.7);
  f.carve(bx - 2, A0, iz1 - 1, 4, 9, 2);
  const bd = b.door(kr.id, null, bx, A0, iz1, { leaf: 'door_wood', width: 4, axis: 'x' });
  kr.markDoor(bx, iz1, 4);
  for (let k = 0; k < Y0; k++) f.box(bx - 3, 0, hz + hd + k * 2, 6, Y0 - k, 2, MAT.concrete);
  const bo = b.navPoint(0, bx, 0, hz + hd + Y0 * 2 + 2, [bd]);
  H.home.kitchen = [];
  // ---- furnish
  const P = H.fns = {};
  const R = H.R;
  R.parlor.setBack(R.parlor.cell.z0 === iz0 ? '+z' : '-z');
  const lv = fLiving(H, R.parlor, { tv: rng.chance(0.25), piano: brown && rng.chance(0.4) });
  H.home.lounge.push(...lv.lounge);
  R.dining.setBack(doorSide === 'L' ? '+x' : '-x');
  if (castel) R.dining.setBack('+z');
  const dn = castel ? fDining(H, R.dining, { seats: 10, force: true, centerpiece: 'vase_flowers', cloth: '#f4f0e8', chair: 'chair_wood' }) : fDining(H, R.dining, { seats: rng.pick([4, 4, 6]) });
  H.home.dine.push(...dn.seats);
  R.kitchen.setBack('+z');
  const K = fKitchen(H, R.kitchen, { chairs: castel ? 2 : undefined });
  H.home.kitchen.push(...K.cook, ...K.seats);
  halls[0].setBack('+z'); fHall(H, halls[0]);
  for (let k = 1; k < 3; k++) { halls[k].setBack('+z'); art(halls[k], ['left', 'right', 'back']); halls[k].prop('ceiling_lamp', halls[k].U / 2, 3, 0, {}, halls[k].h - 2); }
  const beds1 = [];
  R.master.setBack('+z'); const m1 = fBedroom(H, R.master, 'master'); beds1.push(...m1.beds);
  R.bath.setBack(doorSide === 'L' ? '+x' : '-x'); H.home.bath.push(fBath(H, R.bath).spot);
  const kinds = ['boy', 'girl', 'teen_girl', 'teen_boy', 'twins', 'guest', 'single', 'bunks'];
  R.bedB.setBack('-z'); const kb = castel ? 'grandma' : rng.pick(kinds); const m2 = fBedroom(H, R.bedB, kb);
  R.bedC.setBack('+z'); const m3 = fBedroom(H, R.bedC, castel ? 'single' : rng.pick(kinds));
  R.bedD.setBack('-z'); const m4 = fBedroom(H, R.bedD, castel ? 'girl' : rng.pick(kinds));
  for (const m of [m2, m3, m4]) { if (m.desk) H.home.desk.push(m.desk); if (m.seat) H.home.lounge.push(m.seat); }
  H.home.beds.push(...(castel ? [...m2.beds, ...m1.beds, ...m3.beds, ...m4.beds] : [...m1.beds, ...m2.beds, ...m3.beds, ...m4.beds]));
  // ---- yard nav & spots
  const yz = hz + hd + Y0 * 2 + 4, yardD = D - (hz + hd);
  const yc = b.navPoint(0, W / 2, 0, Math.min(D - 4, yz + 6), [bo]);
  const ys = (pose, x, z, rot, act, tags = ['yard'], o = {}) => { const sp = b.spot(pose, x, 0, z, rot, { room: 0, act, tags, ...o }); ctx.nav.link(sp.node, yc); sp.pendingLink = false; return sp; };
  H.yardSpot = ys;
  if (yardD > 14) {
    f.box(0, 0, D - 1, W, 5, 1, rng.pick([MAT.wood_gray, MAT.wood_pale, MAT.brick_red]));
    f.prop('laundry_line', W / 2, 0, Math.min(D - 5, yz + 8), 0, { tint: rng.pick(QUILT), tint2: rng.pick(QUILT) });
    H.home.yard.push(ys('stand', W / 2 + 2, Math.min(D - 5, yz + 8) + 1.2, 2, 'laundry'));
    f.prop('trash_basket', 2, 0, hz + hd + 2, 0, {}); if (rng.chance(0.5)) f.prop('trash_basket', 4.5, 0, hz + hd + 2, 0, {});
    if (castel) {
      // grape arbor with a table beneath, tomato plants
      const ax = 3, az = yz + 10;
      for (const [px, pz] of [[ax, az], [ax + 10, az], [ax, az + 8], [ax + 10, az + 8]]) f.box(px, 0, pz, 1, 9, 1, MAT.wood_post);
      f.box(ax, 9, az, 11, 1, 9, MAT.leaves_green); f.box(ax + 2, 8, az + 1, 3, 1, 2, MAT.leaves_maroon); f.box(ax + 7, 8, az + 5, 2, 1, 2, MAT.leaves_maroon);
      f.prop('picnic_table', ax + 5, 0, az + 4, 1, {});
      H.home.yard.push(ys('sit', ax + 5, az + 1.5, 2, 'talk_sit', ['yard'], { seat: 0.45 }));
      f.box(W - 10, -1, az, 8, 1, 8, MAT.dirt);
      for (let k = 0; k < 3; k++) { f.box(W - 9 + k * 3, 0, az + 2, 1, 5, 1, MAT.wood_post); f.box(W - 9 + k * 3, 1, az + 2, 1, 3, 1, MAT.leaves_green); }
      f.prop('tree_small', W - 5, 0, D - 5, 0, { cat: 'far' });
    } else if (rng.chance(0.5)) {
      f.box(2, -1, D - 10, W - 4, 1, 7, MAT.dirt);
      for (let k = 0; k < 3; k++) f.box(3, 0, D - 9 + k * 2, W - 6, 1, 1, k % 2 ? MAT.leaves_dark : MAT.leaves_green);
      H.home.yard.push(ys('kneel', W / 2, D - 11, 2, 'garden'));
    } else if (rng.chance(0.5)) { f.prop('garden_bench', W / 2, 0, D - 4, 0, {}); H.home.yard.push(ys('sit', W / 2, D - 4, 0, rng.pick(['read', 'smoke_pipe']), ['yard'], { seat: 0.45 })); }
  }
  if (!H.home.yard.length) H.home.yard.push(ys('stand', W / 2, yz + 3, 2, 'sweep'));
  // front: window boxes, a flower plot, the stoop life
  if (rng.chance(0.5)) f.prop('milk_bottles', H.doorX + 2.6, A0, hz - 0.6, 0, {});
  if (rng.chance(0.4)) f.prop('newspaper_pile', H.doorX - 1, A0, hz - 1.2, rng.float(0, 4), { scale: 0.55 });
  if (rng.chance(0.4)) f.prop('pumpkin', sx0 + (rng.chance(0.5) ? 0.8 : sw - 0.8), Y0, hz - 1.5, rng.float(0, 4), {});
  const stoopSeat = b.spot('sit', sx0 + sw / 2, Math.max(0, Y0 - 1), hz - 3.2, 0, { room: 0, act: rng.pick(['sit', 'read', 'talk_sit', 'smoke_pipe']), tags: ['porch'], seat: 0.25 + (Y0 - 1) * 0.25 });
  linkToSidewalk(ctx, stoopSeat.node); stoopSeat.pendingLink = false;
  H.home.porch.push(stoopSeat);
  if (rng.chance(0.4) || castel) voxFlag(f, sx0 + sw + 1, A0 + 7, hz, false);
  // ---- Castellano: welcome home, Sal
  if (castel) castellanoDress(H, R, halls);
  lifeRow(H);
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  const home = H.home;
  if (!home.lounge.length) home.lounge.push(...home.porch);
  b.home({ family, size: home.beds.length, beds: home.beds, dine: home.dine.length ? home.dine : home.kitchen, lounge: home.lounge, kitchen: home.kitchen, bath: home.bath, yard: home.yard, porch: home.porch, desk: home.desk, special: spec.special || null });
  b.lore = brown ? 'A brownstone row house of the 1890s, with a high stoop and a parlor floor.' : 'A brick row house, built for cannery and wharf families around 1900.';
  void P; void out; void rc1;
  return b;
}
function lifeRow(H) {
  const { rng, R } = H;
  if (H.spec.special) return;
  readAt(R.hall, R.hall.U / 2, 3, 3, DOC.programme());
  if (rng.chance(0.5)) readAt(R.kitchen, R.kitchen.U / 2, R.kitchen.V / 2, 3, rng.chance(0.5) ? DOC.groceries(rng) : DOC.recipe(rng));
  if (rng.chance(0.3)) readHung(R.parlor, 'photo_frames', ['left', 'right', 'front'], 6.2, rng.chance(0.5) ? DOC.weddingPhoto(rng) : DOC.hurricane(), {});
  if (rng.chance(0.25)) readAt(R.parlor, R.parlor.U / 2, R.parlor.V / 2, 2, DOC.courier());
  if (rng.chance(0.2)) readAt(R.bedC, R.bedC.U / 2, R.bedC.V / 2, 3, DOC.capsuleLetter(rng));
  if (rng.chance(0.15)) readAt(R.parlor, R.parlor.U / 2, R.parlor.V * 0.3, 2, DOC.navyLetter(rng));
  if (rng.chance(0.25)) H.f.prop('cat', R.parlor.x0 + 2, R.parlor.y, R.parlor.z0 + 3, rng.float(0, 4), { tint: rng.pick(['#2a2a2a', '#d88a3a', '#8a8a8a']) });
}
function castellanoDress(H, R, halls) {
  const { f, hz } = H;
  const W = H.W;
  // banner across the facade and flags
  const ty = textSignType('WELCOME HOME SAL', { bg: '#f4f0e0', fg: '#1d2c5a', border: '#c8302a', scale: 1 / 12 });
  f.prop(ty, W / 2, halls[1].y + 8.6, hz - 0.3, 0, { cat: 'far' });
  voxFlag(f, 1, halls[1].y + 6, hz, true); voxFlag(f, W - 7, halls[1].y + 6, hz, true);
  bunting(f, 1, halls[0].y + 11, hz - 1, W - 2, [MAT.flag_red, MAT.flag_white, MAT.flag_blue]);
  // the feast
  const D = R.dining, cu = D.U / 2, cv = D.V / 2;
  const top = TOP.table_dining;
  const foods = [['food_roast', 0, -3.5], ['food_casserole', 0, -1], ['food_casserole', 0, 1.8], ['food_bread', -0.9, 4], ['food_bread', 0.9, -5.2], ['candles_pair', 0, 3.2], ['fruit_bowl', 0, 5.3], ['food_pie', 0.8, 2.6]];
  for (const [t, du, dv] of foods) D.prop(t, cu + du, cv + dv, 0, { tint: '#e0c040' }, top);
  readAt(D, cu, cv, 4, docLetter('Rosa\'s Menu, on the Back of an Envelope', 'SABATO — per Salvatore!\n\narancini (Maria rolls them)\ncaponata\npasta con le sarde — Nonna, her way, don\'t argue\nbraciole\nthe roast (Russo\'s — ask for the good one)\nhaddock fried in the pan for Pop\nbread from Halloran\'s (4 loaves, Irene is saving them)\nsfinci & cannoli\n\nFather Garrity is coming. Set a place. SET TWO.', { hand: true }), 'Read Rosa\'s menu');
  const sb = D.wall('sideboard', ['left', 'right', 'back', 'front'], [0.5, 0.3, 0.7]);
  const photo = readHung(D, 'portrait', ['back', 'left', 'right', 'front'], 6.5, docLetter('Photograph: Pfc. Salvatore Castellano Jr.', 'A studio portrait in a gilt frame: a young man in Army dress uniform, garrison cap tilted, trying not to smile. Stamped on the mount: "Hallmark Studio, Augusta, Ga. — Camp Gordon, 1951."\n\nFor fourteen months it stood on the sideboard with a votive candle in front of it and a palm from Palm Sunday tucked in the corner. Tonight the candle is out. Rosa says she will keep lighting it anyway, "for the ones who didn\'t come home."'), { w: 2.5 });
  void photo;
  if (sb) onTop(D, sb, 'candles_pair', TOP.sideboard, 0);
  readHung(D, 'painting', ['left', 'right', 'front', 'back'], 6.5, docLetter('Painting: Sciacca, Sicily', 'A bright, amateur painting of a harbor town climbing a hill above blue water — fishing boats with eyes painted on their bows. On the back: "Sciacca — painted for Giuseppe by his brother Calogero, 1893. So you don\'t forget where you come from."'), { po: { tint: '#5a8ac0' }, w: 4 });
  readHung(R.parlor, 'photo_frames', ['left', 'right', 'back', 'front'], 6.2, docLetter('Photograph: Castellano Fish Co., 1894', 'A faded print of a man standing proudly beside a single dory pulled up on the stones below Whitcomb\'s wharf. Chalked on a board propped against the boat: "G. CASTELLANO — FISH." Written on the back in Italian and then in careful English: "The first day. One boat. God is good."'), {});
  readAt(R.parlor, R.parlor.U / 2, R.parlor.V / 2, 2, docLetter('Letter from Korea, Much Folded', 'Pfc. S. Castellano Jr., 7th Inf. Div., Korea — June 30, 1953\n\nDear Ma and Pop and Maria and Nonna,\n\nThey say it will be over soon. I hope so. It is hot here and then it rains and then it is hot again. I dream about the harbor and your gravy, Ma, not in that order.\n\nTell Pop I have not forgot how to gut a fish, I just have not had the chance. Tell Maria if she becomes a nurse she will be better at it than the ones here, and they are pretty good.\n\nPray for Eddie Doane\'s brother, he is in the hospital in Pusan but he will be okay.\n\nI will be home before you know it.\n\nYour son,\nSal', { hand: true }), 'Read Sal\'s letter');
  const kit = R.kitchen;
  readAt(kit, kit.U / 2, 2, 5, docLetter('Western Union Telegram', 'ARRIVED SAN FRANCISCO STOP HOME TUESDAY 4 52 TRAIN STOP TELL MA NOT TO COOK TOO MUCH STOP LOVE SAL', {}), 'Read the telegram');
  f.prop('balloon_bunch', H.doorX + 3, halls[0].y, hz - 1, 0, { tint: '#c8302a' });
}

// ================================================================ The Marlowe Apartments (1926)
const TENANTS = ['O\'Connell', 'Doyle', 'Silva', 'Medeiros', 'Lindgren', 'Russo', 'Goldberg', 'Tremblay', 'Sullivan', 'Pappas', 'Beaulieu', 'Fitzgerald', 'Marino', 'Wojcik', 'Kelley', 'Costa', 'Levesque', 'Nolan', 'Bianchi'];
export function buildApartment(ctx, lot, spec) {
  const rng = ctx.rng.fork('apt' + lot.x + ',' + lot.z);
  const name = spec.name || 'The Marlowe Apartments';
  const b = new Building(ctx, { name, kind: 'apartment', lot, address: lot.address, established: 1926, lore: 'Built in 1926 by the Harlow family for the clerks and teachers of a growing town: sixteen flats, a lobby with brass mailboxes, and the only elevator-less building in the county that everyone still calls "modern".' });
  const H = makeH(ctx, b, rng, lot, spec);
  const { f } = H;
  const W = lot.w, D = lot.d;
  const floors = Math.max(3, Math.min(5, spec.floors || 4));
  const FH = 13, A0 = 2;
  const A = (k) => A0 + k * FH;
  const x0 = 4, x1 = W - 4, z0 = 8, z1 = Math.min(D - 10, z0 + 68);
  const hw = x1 - x0, hd = z1 - z0;
  H.hx = x0; H.hz = z0; H.hw = hw; H.hd = hd; H.FH = FH; H.floors = floors;
  const brick = M(rng.pick(['brick_yellow', 'brick_brown', 'brick_yellow']));
  const stone = MAT.limestone;
  H.pal = { siding: brick, trim: stone, accent: MAT.trim_dark, roof: MAT.roof_tar, shutters: null, door: '#2a3a2a', curtain: M(rng.pick(CURTAIN)), itrim: MAT.wood_dark, idoor: '#6a4a2e' };
  const topY = A(floors) - 1;
  // ---- site & shell
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(0, -1, 0, W, 1, z0, MAT.grass_lawn);
  f.box(W / 2 - 6, -1, 0, 12, 1, z0, MAT.sidewalk);
  f.box(0, -1, z1, W, 1, D - z1, MAT.concrete);
  f.walls(x0, 0, z0, hw, topY + 4, hd, brick, 1);
  f.box(x0 + 1, 0, z0 + 1, hw - 2, A0 - 1, hd - 2, MAT.stone_foundation);
  for (let k = 1; k < floors; k++) f.box(x0 + 1, A(k) - 2, z0 + 1, hw - 2, 2, hd - 2, MAT.plaster_white);
  f.box(x0 + 1, A(floors) - 2, z0 + 1, hw - 2, 1, hd - 2, MAT.ceiling);
  f.box(x0, topY, z0, hw, 1, hd, MAT.roof_tar);
  f.walls(x0, topY + 1, z0, hw, 3, hd, brick, 1);
  f.walls(x0 - 1, topY + 4, z0 - 1, hw + 2, 1, hd + 2, stone, 1);
  // base, belt course, cornice
  f.walls(x0, 0, z0, hw, A0 + 1, hd, MAT.granite, 1);
  f.box(x0 - 1, A(1) - 2, z0 - 1, hw + 2, 1, 1, stone);
  f.box(x0 - 1, topY - 1, z0 - 1, hw + 2, 1, 1, stone); f.box(x0 - 2, topY, z0 - 2, hw + 4, 1, 2, stone);
  for (let x = x0; x < x1; x += 4) f.box(x, topY - 2, z0 - 1, 2, 1, 1, stone);
  // quoins at the corners
  for (const x of [x0, x1 - 1]) for (let y = A0; y < topY; y += 3) f.box(x - (x === x0 ? 0 : 0), y, z0 - 1, 1, 2, 1, stone);
  // ---- stair hall (centre), stairs in the middle with passages both sides
  const hA = Math.round(W / 2) - 8, hB = hA + 16;       // cell
  const stairX = hA + 6, s = z0 + 14;                   // first tread z
  const passL = hA + 3, passR = hB - 3;                  // passage centre lines
  const iz0 = z0 + 1, iz1 = z1 - 1;
  const midZ = Math.round((iz0 + iz1) / 2);
  const halls = [];
  const navP = [];
  for (let k = 0; k < floors; k++) {
    const hall = new Room(H, k === 0 ? 'Lobby' : `Stair Hall — ${['Ground', 'Second', 'Third', 'Fourth', 'Fifth'][k]} Floor`, hA + 1, A(k), iz0 + 1, hB - hA - 2, iz1 - iz0 - 2, FH - 2, { fn: k === 0 ? 'lobby' : 'stairhall', public: true, lightMode: 'always', nav: [W / 2, s - 3] });
    hall.cell = { x0: hA, x1: hB, z0: iz0, z1: iz1 };
    halls.push(hall);
    finish(H, hall, { wall: k === 0 ? MAT.wood_panel : MAT.plaster_cream, floor: k === 0 ? MAT.floor_bigcheck : MAT.floor_linoleum, base: MAT.wood_dark, wainscot: k === 0 ? MAT.marble : MAT.wood_panel, rail: MAT.wood_dark });
    const cf = b.roomNode.get(hall.id);
    const pLF = b.navPoint(0, passL, A(k), s - 2, [cf]), pRF = b.navPoint(0, passR, A(k), s - 2, [cf]);
    const cb = b.navPoint(0, W / 2, A(k), s + 2 * FH + 3, []);
    const pLB = b.navPoint(0, passL, A(k), s + 2 * FH + 3, [pLF, cb]), pRB = b.navPoint(0, passR, A(k), s + 2 * FH + 3, [pRF, cb]);
    navP.push({ cf, cb, L: [pLF, pLB], R: [pRF, pRB] });
  }
  // stacked flights (thin treads) up the middle
  for (let k = 0; k < floors - 1; k++) {
    stairFlight(H, stairX, A(k), s, '+z', FH, { thin: true, rail: 'L', topY: A(k + 1) + FH - 2, head: 11, runner: MAT.carpet_red, baluster: MAT.iron, railMat: MAT.wood_dark });
    for (let i = 0; i < FH; i += 2) f.box(stairX + 4, A(k) + i + 1, s + 2 * i, 1, 3, 1, MAT.iron);
    const bot = b.navPoint(0, stairX + 2, A(k), s - 2.5, [navP[k].cf]);
    const top = b.navPoint(0, stairX + 2, A(k + 1), s + 2 * FH + 1, [navP[k + 1].cb]);
    ctx.nav.link(bot, top);
    railing(H, stairX - 1, A(k + 1), s + 2, 2 * FH - 2, 'z', { mat: MAT.wood_dark, bal: MAT.iron });
    railing(H, stairX + 4, A(k + 1), s + 2, 2 * FH - 2, 'z', { mat: MAT.wood_dark, bal: MAT.iron });
  }
  railing(H, stairX, A(floors - 1), s + 1, 4, 'x', { mat: MAT.wood_dark, bal: MAT.iron });
  // skylight
  f.carve(stairX, topY - 1, s + 4, 4, 1, 16); f.box(stairX, topY, s + 4, 4, 1, 16, MAT.glass); f.box(stairX - 1, topY + 1, s + 3, 6, 1, 18, MAT.glass);
  // ---- flats
  const fams = rng.shuffle(TENANTS.slice());
  let fi = 0;
  const flats = [];
  const letters = 'ABCD';
  H.lite = true;
  for (let k = 0; k < floors; k++) {
    const sides = [['L', x0 + 1, hA], ['R', hB, x1 - 1]];
    const bands = [['front', iz0, midZ], ['back', midZ, iz1]];
    let li = 0;
    for (const [side, cx0, cx1] of sides) for (const [band, cz0, cz1] of bands) {
      const label = `${k + 1}${letters[li++]}`;
      const superFlat = k === 0 && side === 'L' && band === 'front';
      const fam = superFlat ? 'Kowalczyk' : fams[fi++ % fams.length];
      flats.push(buildFlat(H, { k, side, band, cx0, cx1, cz0, cz1, y: A(k), FH, label, fam, superFlat, hall: halls[k], nav: navP[k], passX: side === 'L' ? passL : passR, hallEdge: side === 'L' ? hA : hB }));
    }
  }
  H.lite = false;
  for (const q of rng.shuffle(flats.filter((q) => !q.superFlat)).concat(flats.filter((q) => q.superFlat))) b.home(q.home);
  // ---- lobby: mailboxes, directory, bench, palm, notices
  const L = halls[0];
  L.setBack('+z');
  const mb = L.hang(null, 'left', 5, 3, { w: 6 });
  if (mb) { L.box(0, 2, 1, 6, 3, 4, MAT.trim_gold); L.box(0, 2.5, 1, 5, 4, 1, MAT.brass ?? MAT.trim_gold); }
  const dir = {
    title: 'Tenants — The Marlowe',
    get html() {
      const hh = (ctx.households || []).filter((x) => x.home.building === b);
      const who = (q) => { const h = hh.find((x) => x.home === q.home || x.home.flat === q.label); if (!h) return q.fam.toUpperCase(); const m = h.members[0]; const sn = (h.surname || (m && m.last) || q.fam).toUpperCase(); return h.members.length === 1 && m && m.title ? `${m.title.toUpperCase()} ${sn}` : sn; };
      return docList('Tenants — The Marlowe', 'Brass mailboxes, polished every Friday by the super', flats.map((q) => `${q.label} ........ ${who(q)}${q.superFlat ? '  (SUPT.)' : ''}`)).html;
    },
  };
  readAt(L, 1.2, 5, 4, dir, 'Read the mailboxes');
  L.wall('garden_bench', 'right', [0.25], { fp: [6, 2.5] });
  const bs = L.spot('sit', L.U - 1.6, L.V * 0.25, 3, { act: 'read', tags: ['bench'], seat: 0.45, public: true });
  void bs;
  L.wall('palm_pot', ['left', 'right'], [0.9, 0.1]);
  L.wall('radiator', ['right', 'left'], [0.5]);
  L.hangAny('mirror_wall', ['right'], 4.5, { w: 3 });
  L.prop('chandelier', L.U / 2, 5, 0, {}, L.h - 3.8);
  L.prop('baby_carriage', L.U - 2.5, L.V * 0.1 + 2, 1, {});
  readHung(L, 'painting', ['right', 'left'], 6, docList('NOTICE TO TENANTS', 'posted by the Superintendent', ['Laundry on the roof MONDAYS & THURSDAYS only.', 'No radios after 10 P.M. — this means YOU, 3C.', 'Coal delivery Tuesday. Keep the areaway clear.', 'Rent is due the 1st. Mr. Harlow does not accept pies.', 'HARBOR DAYS: the roof will be OPEN for the fireworks at 9 P.M. Bring a chair. No children on the parapet!', '— J. Kowalczyk, Supt., apt. 1A']), { po: { tint: '#e8e0c8' } });
  // ---- entrance: steps, limestone surround, canopy, name
  const dcx = W / 2;
  f.carve(dcx - 3, A0, z0, 6, 10, 2);
  f.box(dcx - 5, A0, z0 - 1, 2, 12, 1, stone); f.box(dcx + 3, A0, z0 - 1, 2, 12, 1, stone); f.box(dcx - 6, A0 + 12, z0 - 2, 12, 2, 2, stone);
  f.carve(dcx - 3, A0 + 10, z0, 6, 2, 1); f.box(dcx - 3, A0 + 10, z0, 6, 2, 1, MAT.glass);
  for (let k = 0; k < A0; k++) f.box(dcx - 5, k, z0 - 2 - (A0 - 1 - k) * 2, 10, 1, 2 + (A0 - 1 - k) * 2, MAT.granite);
  // canopy on iron rods
  f.box(dcx - 6, A0 + 11, z0 - 7, 12, 1, 6, MAT.awning_solid_navy); f.box(dcx - 6, A0 + 10, z0 - 7, 12, 1, 1, MAT.trim_gold);
  f.box(dcx - 6, A0 + 11, z0 - 7, 1, 3, 1, MAT.iron); f.box(dcx + 5, A0 + 11, z0 - 7, 1, 3, 1, MAT.iron);
  // name plate in the parapet, above the top floor
  f.box(dcx - 26, topY + 1, z0 - 1, 52, 12, 1, stone);
  f.box(dcx - 27, topY + 13, z0 - 2, 54, 1, 2, stone);
  f.text('THE MARLOWE', dcx, topY + 6, z0 - 2, MAT.trim_dark, { align: 'center', font: 'small' });
  f.text('1926', dcx, topY + 1, z0 - 2, MAT.trim_dark, { align: 'center', font: 'small' });
  // canopy lettering
  f.box(dcx - 6, A0 + 9, z0 - 7, 12, 1, 1, MAT.awning_solid_navy);
  const out = b.entrance(L.id, dcx, A0, z0 + 1, { outZ: -3, outY: 0, leaf: 'door_glass', width: 4, tint: '#2a3a2a', main: true });
  L.markDoor(dcx, z0 + 1, 6);
  void out;
  for (const x of [dcx - 8, dcx + 8]) { f.box(x, A0 + 6, z0 - 1, 1, 1, 1, MAT.iron); f.box(x, A0 + 7, z0 - 1, 1, 2, 1, MAT.lamp_glass); b.light(x, A0 + 8, z0 - 1.5, { mode: 'night', radius: 6 }); }
  const nty = textSignType(String(lot.number), { bg: '#1d1d22', fg: '#e8c870', border: '#c9a24a', scale: 1 / 18 });
  f.prop(nty, dcx, A0 + 12.6, z0 - 2.2, 0, {});
  // front garden: hedges & iron fence
  for (const [a, c] of [[1, dcx - 7], [dcx + 7, W - 1]]) { f.box(a, 0, z0 - 3, c - a, 2, 2, MAT.hedge); for (let x = a; x < c - 1; x += 8) f.prop('iron_fence', x + 4, 0, 0.5, 0, {}); }
  // back door to the yard
  const bdz = iz1;
  f.carve(dcx - 2, A0, bdz - 1, 4, 9, 2);
  const bd = b.door(null, null, dcx, A0, bdz, { leaf: 'door_wood', width: 4 });
  ctx.nav.link(bd, navP[0].cb);
  halls[0].markDoor(dcx, bdz, 4);
  const yo = b.navPoint(0, dcx, 0, z1 + 4, [bd]);
  for (let x = 6; x < W - 6; x += 5) if (Math.abs(x - dcx) > 5) f.prop('trash_basket', x, 0, z1 + 1.5, 0, {});
  f.box(0, 0, D - 1, W, 5, 1, MAT.brick_red);
  // ---- windows: every exterior room face (the flats registered theirs as cells)
  const ext = { x0: x0 + 1, x1: x1 - 1, z0: iz0, z1: iz1 };
  for (const R of H.rooms) {
    if (!R.cell || R.fn === 'lobby' || R.fn === 'stairhall') continue;
    const c = R.cell, sides = [];
    if (c.z0 === ext.z0) sides.push(['-z', z0, R.x0, R.w]);
    if (c.z1 === ext.z1) sides.push(['+z', z1 - 1, R.x0, R.w]);
    if (c.x0 === ext.x0) sides.push(['-x', x0, R.z0, R.d]);
    if (c.x1 === ext.x1) sides.push(['+x', x1 - 1, R.z0, R.d]);
    for (const [bsd, cw, a0, len] of sides) {
      const bath = R.fn === 'bath';
      const n = bath ? 1 : len >= 22 ? 2 : 1;
      const w = bath ? 3 : 4, h = bath ? 4 : 7, y = R.y + (bath ? 4 : 2);
      const gap = (len - n * w) / (n + 1);
      for (let i = 0; i < n; i++) {
        const a = Math.round(a0 + gap * (i + 1) + w * i);
        if (bsd === '-z' && R.floor === 0 && Math.abs(a + w / 2 - dcx) < 12) continue;
        wWin(H, bsd, a, y, cw, w, h, { frame: MAT.trim_white, lintelWide: true, lintelMat: stone, sillMat: stone, curtain: bath ? null : M(rng.pick(CURTAIN)), glass: bath ? MAT.glass_green : undefined, box: bsd === '-z' && rng.chance(0.25), boxTint: rng.pick(['#c8302a', '#e0a030', '#b04a8a']) }, R);
      }
    }
  }
  // hall windows front/back on each floor above the ground
  for (let k = 1; k < floors; k++) { wWin(H, '-z', dcx - 2, A(k) + 2, z0, 4, 7, { frame: MAT.trim_white, lintelWide: true, lintelMat: stone, sillMat: stone }); wWin(H, '+z', dcx - 2, A(k) + 2, z1 - 1, 4, 7, { frame: MAT.trim_white, lintelWide: true, lintelMat: stone, sillMat: stone }); }
  // fire escapes on the back
  const B = H.B, zb = D - z1;
  for (const cx of [W * 0.25, W * 0.75]) {
    const xx = Math.round(W - cx - 7);
    for (let k = 1; k < floors; k++) {
      const y = A(k) - 1;
      B.box(xx, y, zb - 5, 14, 1, 5, MAT.iron); B.box(xx, y + 4, zb - 5, 14, 1, 1, MAT.iron); B.box(xx, y + 1, zb - 5, 1, 4, 5, MAT.iron); B.box(xx + 13, y + 1, zb - 5, 1, 4, 5, MAT.iron);
      for (let x = xx + 2; x < xx + 13; x += 2) B.box(x, y + 1, zb - 5, 1, 3, 1, MAT.iron);
      if (k > 1) for (let j = 0; j < FH; j++) B.box(xx + 2 + Math.floor(j * 8 / FH), y - j, zb - 3, 2, 1, 2, MAT.iron);
    }
    // a potted geranium and a milk bottle on a landing
    B.prop('flower_pot', xx + 3, A(2), zb - 2.5, 0, { tint: '#c8302a' });
  }
  // ---- roof: water tower, bulkhead, chimneys, antennas, the "tar beach"
  f.prop('water_tower', x0 + 16, topY + 1, z0 + hd - 16, 0, { cat: 'far' });
  f.box(stairX - 2, topY + 1, s + 20, 10, 9, 10, brick); f.box(stairX - 3, topY + 10, s + 19, 12, 1, 12, MAT.roof_tar); f.box(stairX + 1, topY + 1, s + 19, 4, 8, 1, MAT.wood_dark);
  roofChimney(f, x0 + 4, topY + 1, z0 + 12, 4, 4, topY + 10, MAT.brick_dark, 2);
  roofChimney(f, x1 - 8, topY + 1, z1 - 16, 4, 4, topY + 10, MAT.brick_dark, 2);
  for (let i = 0; i < 4; i++) f.prop('tv_antenna', x0 + 10 + i * 26, topY + 1, z0 + 6 + (i % 2) * 40, rng.float(0, 4), { cat: 'far' });
  f.prop('laundry_line', x1 - 20, topY + 1, z0 + 20, 0, { tint: '#e8e0d0', tint2: '#6a8ac8' });
  f.prop('laundry_line', x1 - 20, topY + 1, z0 + 30, 0, { tint: '#d8a0b8', tint2: '#e8e0d0' });
  f.prop('garden_bench', x0 + 30, topY + 1, z0 + 30, 1, {});
  f.prop('flag_pole', x0 + 6, topY + 1, z0 + 3, 0, { cat: 'far' });
  // ghost sign on the side wall facing the Rialto
  const Lf = f.faceFrame('left');
  Lf.text('HARLOW\'S', D - z0 - hd / 2, A(floors - 1) + 2, x0 - 1, MAT.sign_cream, { align: 'center', font: 'big' });
  Lf.text('DRY GOODS SINCE 1878', D - z0 - hd / 2, A(floors - 1) - 5, x0 - 1, MAT.sign_cream, { align: 'center', font: 'small' });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  linkToSidewalk(ctx, yo);
  return b;
}

// One flat: living room + bedroom on the window band; kitchen, bath, dinette-foyer on the inner band.
function buildFlat(H, q) {
  const { b, ctx, rng } = H;
  const { k, side, band, cx0, cx1, cz0, cz1, y, FH, label, fam } = q;
  const h = FH - 2;
  const outerSideLeft = side === 'L';            // the flat's exterior side wall is at cx0 (L) or cx1 (R)
  const winBand = band === 'front' ? [cz0, cz0 + 17] : [cz1 - 17, cz1];
  const inBand = band === 'front' ? [cz0 + 17, cz1] : [cz0, cz1 - 17];
  const W = cx1 - cx0;
  const liv = Math.round(W * 0.55);
  const cell = (a0, a1, b0, b1) => ({ x0: a0, x1: a1, z0: b0, z1: b1 });
  const air = (c) => [c.x0 + 1, c.z0 + 1, c.x1 - c.x0 - 2, c.z1 - c.z0 - 2];
  // x ranges from the exterior side toward the stair hall
  const X = (a, bw) => outerSideLeft ? [cx0 + a, cx0 + a + bw] : [cx1 - a - bw, cx1 - a];
  const [lx0, lx1] = X(0, liv), [bx0, bx1] = X(liv, W - liv);
  const kw = Math.round(W * 0.34), bw2 = 10;
  const [kx0, kx1] = X(0, kw), [tx0, tx1] = X(kw, bw2), [fx0, fx1] = X(kw + bw2, W - kw - bw2);
  const mk = (nm, c, fn, o = {}) => { const [x, z, w, d] = air(c); const R = new Room(H, `Apt. ${label} — ${nm}`, x, y, z, w, d, h, { fn, ...o }); R.cell = c; R.floor = k; return R; };
  const Rl = mk('Living Room', cell(lx0, lx1, winBand[0], winBand[1]), 'living');
  const Rb = mk('Bedroom', cell(bx0, bx1, winBand[0], winBand[1]), 'bed');
  const Rk = mk('Kitchen', cell(kx0, kx1, inBand[0], inBand[1]), 'kitchen');
  const Rt = mk('Bath', cell(tx0, tx1, inBand[0], inBand[1]), 'bath', { lightColor: [1, 0.95, 0.85] });
  const Rf = mk('Dinette', cell(fx0, fx1, inBand[0], inBand[1]), 'dining');
  const paper = () => M(rng.pick(rng.chance(0.6) ? PAPER : PLASTER));
  finish(H, Rl, { wall: paper(), floor: M(rng.pick(WOODF)), crown: MAT.trim_white, base: MAT.wood_dark });
  finish(H, Rb, { wall: paper(), floor: rng.chance(0.4) ? M(rng.pick(CARPET)) : M(rng.pick(WOODF)), base: MAT.wood_dark });
  finish(H, Rk, { wall: M(rng.pick(['plaster_yellow', 'plaster_mint', 'plaster_cream', 'plaster_white'])), floor: M(rng.pick(KITF)), wainscot: rng.chance(0.5) ? M(rng.pick(TILEW)) : null, rail: MAT.trim_white, base: MAT.wood_dark });
  finish(H, Rt, { wall: MAT.plaster_white, floor: M(rng.pick(BATHF)), wainscot: M(rng.pick(TILEW)), rail: MAT.trim_white, base: MAT.trim_white });
  finish(H, Rf, { wall: paper(), floor: M(rng.pick(WOODF)), base: MAT.wood_dark });
  // doors: hall -> dinette (with the flat number), dinette -> living, bedroom, bath; living -> kitchen
  const dz = Math.round(Rf.z0 + Rf.d / 2);
  opening(H, q.hallEdge, y, dz, 'z', 4, 9, MAT.wood_dark);
  const dn = b.door(null, Rf.id, q.hallEdge, y, dz, { axis: 'z', leaf: 'door_wood', width: 4, tint: q.superFlat ? '#3a4a3a' : '#6a4a2e' });
  Rf.markDoor(q.hallEdge, dz, 4);
  const pp = b.navPoint(0, q.passX, y, dz, [...(side === 'L' ? q.nav.L : q.nav.R)]);
  ctx.nav.link(dn, pp);
  // door plate with the flat number on the hall side
  const plate = textSignType(`APT ${label}`, { bg: '#c9a24a', fg: '#2a2012', border: '#8a6a2a', scale: 1 / 32 });
  b.f.prop(plate, q.hallEdge + (side === 'L' ? 0.1 : -0.1), y + 6, dz + 3.2, side === 'L' ? 1 : 3, {});
  const bandEdge = band === 'front' ? winBand[1] : winBand[0];
  connect(H, Rf, Rb, Math.round((Math.max(fx0, bx0) + Math.min(fx1, bx1)) / 2), bandEdge, 'x');
  const ovl = [Math.max(fx0, lx0) + 2, Math.min(fx1, lx1) - 2];
  if (ovl[1] - ovl[0] >= 4) connect(H, Rf, Rl, Math.round((ovl[0] + ovl[1]) / 2), bandEdge, 'x', { leaf: false, w: 4 });
  else connect(H, Rf, Rl, outerSideLeft ? fx0 : fx1, Math.round(Rl.z0 + Rl.d / 2), 'z', { leaf: false });
  connect(H, Rl, Rk, Math.round((kx0 + kx1) / 2), bandEdge, 'x');
  connect(H, Rf, Rt, outerSideLeft ? fx0 : fx1, Math.round(Rt.z0 + Rt.d / 2), 'z');
  // orient & furnish
  const wb = band === 'front' ? '+z' : '-z';
  Rl.setBack(wb);
  const tv = rng.chance(0.3);
  const lv = fLiving(H, Rl, { tv });
  Rb.setBack(outerSideLeft ? '+x' : '-x');
  const kind = q.superFlat ? 'master' : rng.weighted([['master', 6], ['couple_old', 2], ['guest', 1]]);
  const bd = fBedroom(H, Rb, kind);
  const extraBeds = [];
  if (rng.chance(0.35) && !q.superFlat) { const cr = Rb.wall(rng.chance(0.5) ? 'crib' : 'bed_single', ['left', 'right', 'front'], [0.8, 0.2], { tall: false }); if (cr) extraBeds.push(Rb.spot('sleep', cr.u, cr.v, cr.rot, { act: 'sleep', tags: ['sleep'], seat: 0.55 })); }
  Rk.setBack(outerSideLeft ? '-x' : '+x');
  const K = fKitchen(H, Rk, { table: false });
  Rt.setBack(wb === '+z' ? '-z' : '+z');
  const bt = fBath(H, Rt);
  Rf.setBack(outerSideLeft ? '-x' : '+x');
  const dn2 = fDining(H, Rf, { seats: rng.pick([2, 4, 4]), table: 'table_kitchen', chair: 'chair_kitchen', bare: true, centerpiece: rng.pick(['fruit_bowl', 'vase_flowers', 'coffee_pot']) });
  Rf.wall('coat_rack', ['left', 'right', 'front', 'back'], [0.1, 0.9]);
  Rf.wall(rng.pick(['telephone_table', 'cabinet_china', 'bookshelf_low']), ['left', 'right', 'back', 'front'], [0.5, 0.2, 0.8]);
  art(Rf, ['left', 'right', 'back']);
  Rf.prop('ceiling_lamp', Rf.U / 2, Rf.V / 2, 0, {}, Rf.h - 2);
  // documents
  if (q.superFlat) {
    readAt(Rf, Rf.U / 2, Rf.V / 2, 3, docList('Super\'s Work List', 'J. Kowalczyk — Saturday', ['3C — radiator knocking AGAIN', '2B — Mrs. Tremblay\'s faucet (washer)', 'Sweep the roof for tonight — fireworks', 'Brass on the mailboxes', 'Ash cans out by 7', 'Tell 4A no more pigeons on the fire escape']), 'Read the work list');
    Rf.hangAny('tools_wall', ['left', 'right', 'back'], 5, { w: 5 });
  } else if (rng.chance(0.5)) readAt(Rl, Rl.U / 2, Rl.V / 2, 2, rng.pick([DOC.courier(), DOC.postcard(rng), DOC.navyLetter(rng), DOC.programme(), DOC.weddingPhoto(rng)]));
  const home = {
    family: fam, beds: [...bd.beds, ...extraBeds], dine: dn2.seats.length ? dn2.seats : K.seats, lounge: [...lv.lounge, ...(bd.seat ? [bd.seat] : [])], kitchen: K.cook.length ? K.cook : [Rk.spot('stand', Rk.U / 2, 3, 0, { act: 'cook', tags: ['cook'] })],
    bath: [bt.spot], yard: [], porch: [], desk: bd.desk ? [bd.desk] : [], special: 'flat', flat: label,
  };
  if (!home.lounge.length) home.lounge.push(...home.dine);
  return { label, fam, superFlat: q.superFlat, home: { ...home, size: home.beds.length } };
}
