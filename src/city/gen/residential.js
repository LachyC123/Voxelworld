// Residential generators: detached houses (colonial, cape, bungalow, victorian), rowhouses.
import { Building } from '../building.js';
import { MAT, shell, slab, win, doorway, stairs, partitionX, partitionZ, roomTrim, chimney, diningSet, parlour, kitchenRun, bedroom, bathroom } from './common.js';
import { linkToSidewalk } from '../streets.js';

const SIDING = ['siding_white', 'siding_yellow', 'siding_blue', 'siding_green', 'siding_gray', 'siding_mint', 'siding_pink', 'siding_red', 'shingle_wall', 'siding_white', 'siding_brown'];
const ROOFS = ['roof_shingle_gray', 'roof_shingle_brown', 'roof_shingle_red', 'roof_shingle_green', 'roof_shingle_black', 'roof_slate'];
const TRIMS = ['trim_white', 'trim_white', 'trim_cream', 'trim_green', 'trim_dark', 'trim_red', 'trim_blue'];
const SHUTTERS = ['trim_green', 'trim_black', 'trim_red', 'trim_blue', 'trim_dark', 'trim_teal'];
const WALLS = ['wallpaper_rose', 'wallpaper_green', 'wallpaper_blue', 'wallpaper_cream', 'wallpaper_yellow', 'plaster_cream', 'plaster_green', 'plaster_blue', 'wallpaper_teal', 'plaster_pink'];
const FLOORS = ['floor_oak', 'floor_walnut', 'floor_pine', 'floor_oak_z'];
const FABRIC = ['#6a7a5a', '#8a4a3a', '#5a6a8a', '#a88a5a', '#7a5a6a', '#4a6a6a', '#9a6a4a', '#6a5a4a'];
const QUILT = ['#c86a6a', '#6a8ac8', '#e0c070', '#8ab88a', '#d8a0b8', '#e8e0d0', '#a87ac8'];

export function register(GEN) {
  GEN.house = buildHouse;
  GEN.rowhouse = buildRowhouse;
}

const M = (name) => MAT[name];

// ---------------------------------------------------------------- detached house
export function buildHouse(ctx, lot, spec) {
  const rng = ctx.rng.fork('house' + lot.x + ',' + lot.z);
  const family = spec.family || null;
  const name = spec.name || (family ? `${family} Residence` : `${lot.number} ${lot.street}`);
  const b = new Building(ctx, { name, kind: 'house', lot, address: spec.address || lot.address, tags: spec.special ? [spec.special] : [] });
  const f = b.f;
  const W = lot.w, D = lot.d;
  const big = !!spec.big || W > 64;
  const style = spec.victorian ? 'victorian' : spec.style || rng.weighted([['colonial', 4], ['cape', 3], ['bungalow', 2]]);
  const siding = M(spec.siding || rng.pick(SIDING)), roofM = M(rng.pick(ROOFS)), trim = M(rng.pick(TRIMS)), shut = M(rng.pick(SHUTTERS));
  const fl = M(rng.pick(FLOORS));

  // ---- grounds
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  // house footprint
  const hw = Math.min(W - 16, big ? 52 : 44), hd = big ? 44 : (style === 'bungalow' ? 36 : 40);
  const hx = Math.round((W - hw) / 2) + (rng.chance(0.5) ? 3 : -3), hz = big ? 26 : 22;
  const floors = style === 'bungalow' ? 1 : 2;
  const FH = 12; // floor-to-floor
  // walkway from the sidewalk to the porch
  const door = { x: hx + Math.round(hw / 2) - 2 };
  f.box(door.x - 1, -1, 0, 6, 1, hz - 6, MAT.sidewalk);
  // picket fence along the front with a gate gap
  if (!big || rng.chance(0.5)) {
    for (let x = 0; x < W; x += 8) if (Math.abs(x + 4 - (door.x + 2)) > 5) f.prop(rng.chance(0.8) ? 'picket_fence' : 'picket_fence', x + 4, 0, 0.6, 0, {});
    f.prop('mailbox_house', door.x - 3, 0, 1.2, 0, { tint: '#b3302a' });
  }
  // flower beds along the front of the house
  f.box(hx, -1, hz - 3, hw, 1, 3, M(rng.pick(['flowerbed_red', 'flowerbed_yellow', 'flowerbed_purple', 'mulch'])));
  // driveway on one side + garage in the back
  const driveLeft = hx > W / 2 - hw / 2 ? true : false;
  const dx0 = driveLeft ? 1 : W - 12;
  f.box(dx0, -1, 0, 11, 1, Math.min(D - 2, hz + hd + 26), rng.chance(0.5) ? MAT.gravel : MAT.concrete);
  // front yard tree & bushes
  f.prop(rng.pick(['tree_maple_red', 'tree_maple_orange', 'tree_elm_yellow', 'tree_oak', 'tree_birch']), driveLeft ? W - 8 : 8, 0, 9, rng.float(0, 4), { cat: 'far', scale: rng.float(0.85, 1.05) });
  for (let i = 0; i < 3; i++) f.prop('bush_round', hx + 3 + i * (hw - 6) / 2, 0, hz - 1.5, 0, { tint: rng.pick(['#3f6a2e', '#4a7a34', '#6a7a2a']) });
  if (rng.chance(0.6)) f.prop('leaf_pile', rng.float(12, W - 12), 0, rng.float(4, hz - 6), 0, {});
  if (rng.chance(0.5)) f.prop(rng.chance(0.5) ? 'pumpkin' : 'pumpkin_small', door.x - 2, 1, hz - 7, 0, {});

  // ---- the house shell
  const roofY = floors * FH;
  shell(f, hx, 0, hz, hw, roofY, hd, siding, null, 1);
  // foundation course
  f.box(hx - 0, -1, hz, hw, 1, hd, MAT.stone_foundation);
  f.box(hx, 0, hz, hw, 1, hd, MAT.stone_foundation);
  // floors
  for (let i = 0; i < floors; i++) slab(f, hx + 1, i * FH, hz + 1, hw - 2, hd - 2, fl);
  slab(f, hx, roofY, hz, hw, hd, MAT.ceiling);
  // interior finish layer (plaster/wallpaper) per floor
  const wp0 = M(rng.pick(WALLS)), wp1 = M(rng.pick(WALLS));
  f.walls(hx + 1, 1, hz + 1, hw - 2, FH - 1, hd - 2, wp0, 1);
  if (floors > 1) f.walls(hx + 1, FH + 1, hz + 1, hw - 2, FH - 1, hd - 2, wp1, 1);
  // corner boards & trim
  for (const x of [hx, hx + hw - 1]) f.box(x, 0, hz - 1 + 1, 1, roofY, 1, trim);
  f.box(hx - 1, roofY - 1, hz - 1, hw + 2, 1, 1, trim);

  // ---- roof
  let roofTop;
  if (style === 'victorian') {
    roofTop = f.gable(hx, roofY + 1, hz, hw, hd, roofM, { axis: 'z', overhang: 2, gableMat: siding });
    // front cross-gable
    f.gable(hx + 4, roofY + 1, hz - 2, 18, 20, roofM, { axis: 'x', overhang: 1, gableMat: siding });
  } else if (style === 'cape') {
    roofTop = f.gable(hx, roofY - 4, hz, hw, hd, roofM, { axis: 'x', overhang: 2, gableMat: siding, rise: 1 });
    // dormers
    for (const dxo of [0.25, 0.75]) {
      const dxp = Math.round(hx + hw * dxo - 3);
      f.box(dxp, roofY, hz + 2, 7, 6, 8, siding);
      f.gable(dxp, roofY + 6, hz + 2, 7, 8, roofM, { axis: 'z', overhang: 1 });
      win(f, dxp + 2, roofY + 1, hz + 2, 3, 4, { t: 1, frame: trim, sill: false });
    }
  } else roofTop = f.gable(hx, roofY + 1, hz, hw, hd, roofM, { axis: 'x', overhang: 2, gableMat: siding });
  void roofTop;
  chimney(f, rng.chance(0.5) ? hx + 3 : hx + hw - 7, 0, hz + Math.round(hd / 2), 4, 4, roofY + 18, MAT.brick_red);

  // ---- porch
  const porchW = style === 'bungalow' || style === 'victorian' ? hw : Math.min(hw, 20);
  const px0 = style === 'bungalow' || style === 'victorian' ? hx : door.x + 2 - Math.floor(porchW / 2);
  const porchD = 8;
  f.box(px0, 0, hz - porchD, porchW, 1, porchD, MAT.wood_gray);
  f.box(px0, -1, hz - porchD, porchW, 1, porchD, MAT.stone_foundation);
  f.box(door.x, -1, hz - porchD - 2, 4, 1, 2, MAT.wood_gray); // step
  for (const x of [px0, px0 + porchW - 1, ...(porchW > 24 ? [px0 + Math.round(porchW / 3), px0 + Math.round(porchW * 2 / 3)] : [])]) f.box(x, 1, hz - porchD, 1, FH - 2, 1, trim);
  // railing
  for (let x = px0; x < px0 + porchW; x++) if (Math.abs(x - door.x - 1.5) > 3) f.box(x, 3, hz - porchD, 1, 1, 1, trim);
  f.box(px0 - 1, FH - 1, hz - porchD - 1, porchW + 2, 1, porchD + 1, roofM);
  f.box(px0, FH - 2, hz - porchD, porchW, 1, porchD, MAT.ceiling);
  const porchRoom = b.room('Porch', px0 + 1, 1, hz - porchD + 1, porchW - 2, FH - 3, porchD - 1, { kind: 'porch', ambient: 0.8, lightMode: 'night' });
  f.light(door.x + 2, FH - 3, hz - 2, { mode: 'night', radius: 5, color: [1, 0.78, 0.5] });
  f.prop(rng.chance(0.5) ? 'rocking_chair' : 'garden_bench', px0 + 3.5, 1, hz - 3, 0, {});
  const porchSeat = b.spot('sit', px0 + 3.5, 1, hz - 3, 0, { room: porchRoom, act: rng.pick(['rock', 'read', 'knit', 'smoke_pipe']), tags: ['porch', 'lounge'], seat: 0.45 });

  // ---- ground floor plan
  const X0 = hx + 2, Z0 = hz + 2, IW = hw - 4, ID = hd - 4; // interior rectangle
  const hallX0 = door.x - 3, hallX1 = door.x + 7;          // central hall 10 voxels wide
  const midZ = Z0 + Math.round(ID * 0.52);
  const y1 = 1, ch = FH - 1;
  // front door
  const dw = doorway(f, door.x, 1, hz, 4, 9, { frame: trim, t: 2, step: false, transom: style !== 'bungalow' });
  void dw;
  // partitions: hall walls, front/back split
  partitionZ(f, Z0, Z0 + ID, y1, hallX0, ch, wp0, [{ at: Z0 + 6, w: 4 }, { at: midZ + 3, w: 4 }]);
  partitionZ(f, Z0, Z0 + ID, y1, hallX1, ch, wp0, [{ at: Z0 + 6, w: 4 }, { at: midZ + 3, w: 4 }]);
  partitionX(f, X0, hallX0, y1, midZ, ch, wp0, [{ at: X0 + 3, w: 4 }]);
  partitionX(f, hallX1 + 1, X0 + IW, y1, midZ, ch, wp0, [{ at: X0 + IW - 8, w: 4 }]);
  const hall = b.room('Front Hall', hallX0 + 1, y1, Z0, hallX1 - hallX0 - 1, ch, ID, { lightMode: 'auto', nav: [door.x + 2, Z0 + 3] });
  const leftFront = b.room('Parlor', X0, y1, Z0, hallX0 - X0, ch, midZ - Z0);
  const rightFront = b.room('Dining Room', hallX1 + 1, y1, Z0, X0 + IW - hallX1 - 1, ch, midZ - Z0);
  const leftBack = b.room('Den', X0, y1, midZ + 1, hallX0 - X0, ch, Z0 + ID - midZ - 1);
  const kitchen = b.room('Kitchen', hallX1 + 1, y1, midZ + 1, X0 + IW - hallX1 - 1, ch, Z0 + ID - midZ - 1);
  b.entrance(hall, door.x + 2, 1, hz, { outZ: hz - porchD - 3, leaf: 'door_wood', tint: rng.pick(['#7a2a24', '#2a4a3a', '#2a3a5a', '#e8e4d8', '#5a3a24']) });
  b.door(hall, leftFront, hallX0, y1, Z0 + 8, { axis: 'z', leaf: false });
  b.door(hall, rightFront, hallX1, y1, Z0 + 8, { axis: 'z', leaf: false });
  b.door(hall, leftBack, hallX0, y1, midZ + 5, { axis: 'z' });
  b.door(hall, kitchen, hallX1, y1, midZ + 5, { axis: 'z' });
  b.door(rightFront, kitchen, X0 + IW - 6, y1, midZ, { leaf: false });
  roomTrim(f, X0, y1, Z0, hallX0 - X0, midZ - Z0, MAT.wood_dark, 8);
  // windows (front)
  const winO = { frame: trim, shutters: style !== 'bungalow' ? shut : null, t: 2, box: rng.chance(0.4), boxTint: rng.pick(['#c8302a', '#e0a030', '#b04a8a']) };
  win(f, X0 + 3, 4, hz, 4, 6, winO); if (hallX0 - X0 > 14) win(f, hallX0 - 7, 4, hz, 4, 6, winO);
  win(f, hallX1 + 4, 4, hz, 4, 6, winO); if (X0 + IW - hallX1 > 14) win(f, X0 + IW - 7, 4, hz, 4, 6, winO);
  // side & back windows via side frames
  const L = f.faceFrame('left'), Rt = f.faceFrame('right'), Bk = f.faceFrame('back');
  // left side wall is at local x = hx; in the left frame it is the front plane at z = hx
  win(L, (D - (hz + hd)) + Math.round(hd * 0.3), 4, hx, 4, 6, { frame: trim, t: 2 });
  win(L, (D - (hz + hd)) + Math.round(hd * 0.7), 4, hx, 4, 6, { frame: trim, t: 2 });
  win(Rt, hz + Math.round(hd * 0.3), 4, W - (hx + hw), 4, 6, { frame: trim, t: 2 });
  win(Rt, hz + Math.round(hd * 0.72), 4, W - (hx + hw), 4, 6, { frame: trim, t: 2 });
  // back door from the kitchen
  const backZ = D - (hz + hd);
  const bdx = W - (X0 + IW - 6) - 4;
  doorway(Bk, bdx, 1, backZ, 4, 9, { frame: trim, t: 2, step: false });
  win(Bk, W - (hallX0 - 4) - 4, 4, backZ, 4, 6, { frame: trim, t: 2 });
  win(Bk, W - (hallX1 + 6) - 4, 4, backZ, 3, 5, { frame: trim, t: 2 });
  f.box(X0 + IW - 7, 0, hz + hd, 6, 1, 4, MAT.wood_gray); // back stoop
  const backOut = b.navPoint(kitchen, X0 + IW - 4, 0, hz + hd + 4);
  b.door(kitchen, null, X0 + IW - 4, 1, hz + hd - 1, { leaf: 'door_wood', width: 4 });

  // ---- furnish ground floor
  const tv = spec.special === 'tv_dinner' || rng.chance(0.3);
  const par = parlour(b, leftFront, X0, y1, Z0, hallX0 - X0, midZ - Z0, { tv, sofaTint: rng.pick(FABRIC), chairTint: rng.pick(FABRIC), chairTint2: rng.pick(FABRIC), rugTint: rng.pick(['#8a3a2e', '#3a4a6a', '#6a5a3a', '#4a5a3a']) });
  const din = diningSet(b, rightFront, hallX1 + 1 + (X0 + IW - hallX1 - 1) / 2, y1, Z0 + (midZ - Z0) / 2 + 0.5, { seats: 4, ends: rng.chance(0.4), cloth: '#e8e0d0' });
  f.prop('sideboard', hallX1 + 1 + (X0 + IW - hallX1 - 1) / 2, y1, midZ - 1.2, 0, {});
  f.prop('ceiling_lamp', hallX1 + 1 + (X0 + IW - hallX1 - 1) / 2, y1 + 8, Z0 + (midZ - Z0) / 2, 0, {});
  const kit = kitchenRun(b, kitchen, hallX1 + 1, y1, Z0 + ID, X0 + IW - hallX1 - 3, { counterTint: rng.pick(['#d8c89a', '#c84a3a', '#5ab0a8', '#e8e0c8', '#e0b050']) });
  f.prop('table_kitchen', hallX1 + 1 + (X0 + IW - hallX1 - 1) / 2, y1, midZ + 5, 0, { tint: rng.pick(['#c84a3a', '#5ab0a8', '#e0b050', '#e8e0d0']) });
  const kseat = b.spot('sit', hallX1 + 1 + (X0 + IW - hallX1 - 1) / 2, y1, midZ + 2.4, 2, { room: kitchen, act: rng.pick(['drink', 'read', 'write']), tags: ['kitchen_table'], seat: 0.45 });
  f.prop('chair_kitchen', hallX1 + 1 + (X0 + IW - hallX1 - 1) / 2, y1, midZ + 2.4, 2, { tint: '#c84a3a' });
  f.prop('radio_table', X0 + IW - 2, y1 + 4, midZ + 2, 3, {});
  // den: desk + bookshelf + armchair
  const denSpots = [];
  f.prop('bookshelf', X0 + 2.5, y1, Z0 + ID - 1.2, 0, {});
  f.prop('desk_wood', X0 + (hallX0 - X0) / 2, y1, midZ + 3, 2, {});
  f.prop('chair_office', X0 + (hallX0 - X0) / 2, y1, midZ + 6.2, 0, {});
  denSpots.push(b.spot('sit', X0 + (hallX0 - X0) / 2, y1, midZ + 6.2, 0, { room: leftBack, act: 'write', tags: ['desk'], seat: 0.46 }));
  f.prop('armchair', X0 + 3, y1, Z0 + ID - 5, 1, { tint: rng.pick(FABRIC) });
  denSpots.push(b.spot('sit', X0 + 3, y1, Z0 + ID - 5, 1, { room: leftBack, act: rng.pick(['read', 'doze', 'read_book']), tags: ['lounge', 'read'], seat: 0.42 }));
  f.prop(rng.pick(['piano_upright', 'sewing_machine', 'radio_console', 'clock_grandfather']), X0 + 3, y1, midZ + 2, 1, {});
  // hall: coat rack, telephone table, stairs
  f.prop('coat_rack', hallX0 + 2, y1, Z0 + 2, 0, {});
  f.prop('telephone_table', hallX1 - 1.5, y1, Z0 + 3, 3, {});
  f.prop('ceiling_lamp', door.x + 2, y1 + 8, Z0 + 4, 0, {});

  const spotsHome = { dine: din.seats, lounge: [...par.seats, ...denSpots.slice(1), porchSeat], kitchen: [...kit.spots, kseat], desk: [denSpots[0]], porch: [porchSeat], beds: [], bath: [], yard: [] };

  if (floors > 1) {
    // stairs in the hall going toward the back
    const top = stairs(f, hallX0 + 1, y1, Z0 + 6, '+z', FH, { w: 4, run: 2, mat: MAT.wood_mid });
    // second floor
    const y2 = FH + 1;
    const landing = b.room('Upstairs Hall', hallX0 + 1, y2, Z0, hallX1 - hallX0 - 1, ch, ID);
    b.stairs(hall, [hallX0 + 3, y1, Z0 + 4], landing, [top.x, y2, top.z + 1.5]);
    // railing around the stairwell
    for (let z = Z0 + 6; z < Z0 + 6 + FH * 2 - 2; z += 1) f.box(hallX0 + 5, y2, z, 1, (z % 3 === 0) ? 3 : 1, 1, MAT.wood_dark);
    f.box(hallX0 + 5, y2 + 3, Z0 + 6, 1, 1, FH * 2 - 2, MAT.wood_dark);
    partitionZ(f, Z0, Z0 + ID, y2, hallX0, ch, wp1, [{ at: Z0 + 4, w: 4 }, { at: midZ + 3, w: 4 }]);
    partitionZ(f, Z0, Z0 + ID, y2, hallX1, ch, wp1, [{ at: Z0 + 4, w: 4 }, { at: midZ + 3, w: 4 }]);
    partitionX(f, X0, hallX0, y2, midZ, ch, wp1, []);
    partitionX(f, hallX1 + 1, X0 + IW, y2, midZ, ch, wp1, []);
    const bed1 = b.room('Master Bedroom', X0, y2, Z0, hallX0 - X0, ch, midZ - Z0);
    const bed2 = b.room('Bedroom', hallX1 + 1, y2, Z0, X0 + IW - hallX1 - 1, ch, midZ - Z0);
    const bed3 = b.room('Children\'s Room', X0, y2, midZ + 1, hallX0 - X0, ch, Z0 + ID - midZ - 1);
    const bath = b.room('Bathroom', hallX1 + 1, y2, midZ + 1, X0 + IW - hallX1 - 1, ch, Z0 + ID - midZ - 1, { lightColor: [1, 0.95, 0.85] });
    b.door(landing, bed1, hallX0, y2, Z0 + 6, { axis: 'z' });
    b.door(landing, bed2, hallX1, y2, Z0 + 6, { axis: 'z' });
    b.door(landing, bed3, hallX0, y2, midZ + 5, { axis: 'z' });
    b.door(landing, bath, hallX1, y2, midZ + 5, { axis: 'z' });
    f.box(hallX1 + 1, y2, midZ + 1, X0 + IW - hallX1 - 1, 0 + 1, Z0 + ID - midZ - 1, MAT.tile_kitchen);
    // upstairs windows
    win(f, X0 + 3, y2 + 3, hz, 4, 6, winO); if (hallX0 - X0 > 14) win(f, hallX0 - 7, y2 + 3, hz, 4, 6, winO);
    win(f, hallX1 + 4, y2 + 3, hz, 4, 6, winO); if (X0 + IW - hallX1 > 14) win(f, X0 + IW - 7, y2 + 3, hz, 4, 6, winO);
    win(f, door.x, y2 + 4, hz, 4, 5, { ...winO, shutters: null, box: false });
    win(L, (D - (hz + hd)) + Math.round(hd * 0.3), y2 + 3, hx, 4, 6, { frame: trim, t: 2 });
    win(Rt, hz + Math.round(hd * 0.72), y2 + 3, W - (hx + hw), 3, 5, { frame: trim, t: 2 });
    win(Bk, W - (hallX0 - 4) - 4, y2 + 3, backZ, 4, 6, { frame: trim, t: 2 });
    // beds
    const r1 = bedroom(b, bed1, X0, y2, Z0, hallX0 - X0, midZ - Z0, { beds: [{ type: 'bed_double', tint: rng.pick(QUILT) }] });
    const kids = rng.int(1, 3);
    const r2 = bedroom(b, bed3, X0, y2, midZ + 1, hallX0 - X0, Z0 + ID - midZ - 1, { beds: kids >= 2 ? [{ type: 'bed_single', tint: rng.pick(QUILT) }, { type: 'bed_single', tint: rng.pick(QUILT) }] : [{ type: 'bed_single', tint: rng.pick(QUILT) }], dresser: false, extra: [['toy_chest', 3, 2, 2], [rng.pick(['rocking_horse', 'dollhouse', 'toy_train', 'teddy_bear']), (hallX0 - X0) - 4, 3, 3]] });
    const r3 = bedroom(b, bed2, hallX1 + 1, y2, Z0, X0 + IW - hallX1 - 1, midZ - Z0, { beds: [{ type: rng.chance(0.5) ? 'bed_single' : 'bed_double', tint: rng.pick(QUILT), sleepers: 1 }], wardrobe: true });
    const bt = bathroom(b, bath, hallX1 + 1, y2, midZ + 1, X0 + IW - hallX1 - 1, Z0 + ID - midZ - 1);
    spotsHome.beds = [...r1.beds, ...r2.beds, ...r3.beds];
    spotsHome.bath = bt.spots;
    f.prop('ceiling_lamp', door.x + 2, y2 + 8, Z0 + ID - 6, 0, {});
  } else {
    // bungalow: bedrooms at the back instead of den/kitchen split — reuse den as bedroom
    const r1 = bedroom(b, leftBack, X0, y1, midZ + 1, hallX0 - X0, Z0 + ID - midZ - 1, { beds: [{ type: 'bed_double', tint: rng.pick(QUILT) }], dresser: false });
    spotsHome.beds = r1.beds;
    spotsHome.bath = [];
  }
  // ---- back yard
  const yz0 = hz + hd + 4;
  if (D - yz0 > 16) {
    f.prop('laundry_line', W / 2 + (driveLeft ? 6 : -6), 0, yz0 + 12, 0, { tint: rng.pick(QUILT), tint2: rng.pick(QUILT) });
    const yardSpot = b.spot('stand', W / 2 + (driveLeft ? 6 : -6) + 2, 0, yz0 + 11, 2, { act: rng.pick(['laundry', 'rake', 'water_plants', 'stand']), tags: ['yard'], room: 0 });
    const yardNode = b.navPoint(0, W / 2, 0, yz0 + 4, [backOut]);
    ctx.nav.link(yardSpot.node, yardNode);
    spotsHome.yard.push(yardSpot);
    if (rng.chance(0.5)) {
      f.prop('swing_set', driveLeft ? W - 14 : 14, 0, D - 12, 0, {});
      const s = b.spot('sit', driveLeft ? W - 14 : 14, 0, D - 12, 0, { act: 'swing', tags: ['play', 'yard'], seat: 0.4, room: 0 });
      ctx.nav.link(s.node, yardNode);
      spotsHome.yard.push(s);
    } else {
      f.box(driveLeft ? W - 22 : 6, -1, D - 18, 16, 1, 12, MAT.dirt);
      f.prop('hay_bale', driveLeft ? W - 20 : 8, 0, D - 16, 0, {});
      const s = b.spot('kneel', driveLeft ? W - 14 : 14, 0, D - 12, 0, { act: 'garden', tags: ['yard', 'garden'], room: 0 });
      ctx.nav.link(s.node, yardNode);
      spotsHome.yard.push(s);
    }
    // detached garage at the end of the driveway
    const gx = dx0, gz = Math.min(D - 26, yz0 + 4);
    if (gz > yz0) {
      f.box(gx, -1, gz, 11, 1, 22, MAT.concrete);
      f.walls(gx, 0, gz, 11, 10, 22, siding, 1);
      f.carve(gx + 1, 0, gz, 9, 8, 1);
      f.gable(gx, 10, gz, 11, 22, roofM, { axis: 'z', overhang: 1, gableMat: siding });
      f.box(gx + 1, 8, gz, 9, 2, 1, trim);
      b.room('Garage', gx + 1, 0, gz + 1, 9, 10, 20, { kind: 'garage', ambient: 0.4 });
      if (rng.chance(0.55)) f.prop(rng.pick(['car_sedan', 'car_coupe', 'car_wagon', 'truck_pickup']), gx + 5.5, 0, gz + 11, 0, { tint: rng.pick(['#2a3a5a', '#6a2a2a', '#3a5a3a', '#d8d0b8', '#2a2a2e', '#7a8a9a', '#a8743a', '#5a8a8a']), tint2: '#e8e4d8', cat: 'far' });
      f.prop('workbench', gx + 5.5, 0, gz + 20, 0, {});
    }
  }
  // link the front walk & back yard to the sidewalk network
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  // the home record for the population
  b.home({ family, size: spotsHome.beds.length, ...spotsHome, special: spec.special || null });
  b.frontDoor = door;
  return b;
}

// ---------------------------------------------------------------- rowhouse (narrow, 3 storeys, brick or brownstone)
export function buildRowhouse(ctx, lot, spec) {
  const rng = ctx.rng.fork('row' + lot.x + ',' + lot.z);
  const family = spec.family || null;
  const b = new Building(ctx, { name: spec.name || (family ? `${family} Residence` : `${lot.number} ${lot.street}`), kind: 'house', lot, address: lot.address, tags: spec.special ? [spec.special] : [] });
  const f = b.f;
  const W = lot.w, D = lot.d;
  const brown = spec.style === 'brownstone' || rng.chance(0.3);
  const outer = brown ? MAT.sandstone : M(rng.pick(['brick_red', 'brick_dark', 'brick_brown', 'brick_orange', 'brick_red']));
  const trim = brown ? MAT.sandstone : M(rng.pick(['trim_white', 'trim_cream', 'limestone']));
  const floors = 3, FH = 12;
  const hd = Math.min(D - 22, 44), hz = 6;
  f.box(0, -1, 0, W, 1, D, MAT.grass_lawn);
  f.box(0, -1, 0, W, 1, hz, MAT.sidewalk);
  shell(f, 0, 0, hz, W, floors * FH, hd, outer, null, 1);
  f.box(0, floors * FH, hz, W, 1, hd, MAT.roof_tar);
  f.walls(0, floors * FH + 1, hz, W, 2, hd, outer, 1);
  f.box(-1 + 0, floors * FH - 1, hz - 1, W, 2, 1, trim);
  for (let i = 0; i < floors; i++) slab(f, 1, i * FH, hz + 1, W - 2, hd - 2, M(rng.pick(FLOORS)));
  const wp = [M(rng.pick(WALLS)), M(rng.pick(WALLS)), M(rng.pick(WALLS))];
  for (let i = 0; i < floors; i++) f.walls(1, i * FH + 1, hz + 1, W - 2, FH - 1, hd - 2, wp[i], 1);
  // stoop: the ground floor is raised; steps up to the door
  const dx = rng.chance(0.5) ? 2 : W - 7;
  f.box(dx - 1, 0, hz - 5, 6, 1, 5, trim);
  const dwo = doorway(f, dx, 1, hz, 4, 9, { frame: trim, t: 2, step: false, transom: true });
  void dwo;
  // windows
  const wx = dx === 2 ? W - 8 : 3;
  for (let i = 0; i < floors; i++) {
    const y = i * FH + 4;
    win(f, wx, y, hz, 4, 6, { frame: trim, t: 2, lintelWide: true, box: i === 0 && rng.chance(0.4) });
    if (i > 0) win(f, dx, y, hz, 4, 6, { frame: trim, t: 2, lintelWide: true });
  }
  win(f.faceFrame('back'), W / 2 - 2, 4, D - hz - hd, 4, 6, { frame: trim, t: 2 });
  win(f.faceFrame('back'), W / 2 - 2, FH + 4, D - hz - hd, 4, 6, { frame: trim, t: 2 });
  // cornice
  f.box(-0, floors * FH + 2, hz - 1, W, 1, 1, trim);
  // rooms: ground: parlour front + kitchen back; 1st: bedroom front + bath back; 2nd: bedrooms
  const X0 = 2, Z0 = hz + 2, IW = W - 4, ID = hd - 4;
  const midZ = Z0 + Math.floor(ID / 2);
  const stairX = dx === 2 ? X0 : X0 + IW - 4;
  const roomsX0 = dx === 2 ? X0 + 5 : X0, roomsW = IW - 5;
  const hall0 = b.room('Hall', stairX, 1, Z0, 4, FH - 1, ID);
  const parlorR = b.room('Parlor', roomsX0, 1, Z0, roomsW, FH - 1, midZ - Z0);
  const kitchenR = b.room('Kitchen', roomsX0, 1, midZ + 1, roomsW, FH - 1, Z0 + ID - midZ - 1);
  b.entrance(hall0, dx + 2, 1, hz, { outZ: hz - 7, leaf: 'door_wood', tint: rng.pick(['#2a2a2e', '#5a2a24', '#2a4a3a']) });
  partitionZ(f, Z0, Z0 + ID, 1, dx === 2 ? stairX + 4 : stairX - 1, FH - 1, wp[0], [{ at: Z0 + 2, w: 4 }, { at: midZ + 2, w: 4 }]);
  partitionX(f, roomsX0, roomsX0 + roomsW, 1, midZ, FH - 1, wp[0], [{ at: roomsX0 + Math.floor(roomsW / 2) - 2, w: 4 }]);
  b.door(hall0, parlorR, dx === 2 ? stairX + 4 : stairX - 1, 1, Z0 + 4, { axis: 'z', leaf: false });
  b.door(hall0, kitchenR, dx === 2 ? stairX + 4 : stairX - 1, 1, midZ + 4, { axis: 'z', leaf: false });
  const par = parlour(b, parlorR, roomsX0, 1, Z0, roomsW, midZ - Z0, { tv: spec.special === 'tv_dinner' || rng.chance(0.25), sofaTint: rng.pick(FABRIC), pictures: true });
  const din = diningSet(b, kitchenR, roomsX0 + roomsW / 2, 1, midZ + 1 + (Z0 + ID - midZ - 1) / 2 - 1, { seats: spec.special === 'welcome_home' ? 6 : 4, axis: 'z', long: true, table: spec.special === 'welcome_home' ? 'table_dining' : 'table_kitchen', chair: 'chair_kitchen', cloth: '#e8e0d0' });
  const kit = { spots: [] };
  f.prop('stove', roomsX0 + 2, 1, Z0 + ID - 1.3, 0, {}); f.prop('fridge', roomsX0 + roomsW - 2, 1, Z0 + ID - 1.3, 0, {});
  kit.spots.push(b.spot('stand', roomsX0 + 2, 1, Z0 + ID - 4, 2, { room: kitchenR, act: 'cook', tags: ['cook'] }));
  // stairs up (along +z in the stair column)
  let lower = hall0;
  const beds = [];
  for (let i = 1; i < floors; i++) {
    const yb = (i - 1) * FH + 1, yt = i * FH + 1;
    const top = stairs(f, stairX, yb, Z0 + 4, '+z', FH, { w: 4, run: 2, rail: false });
    const up = b.room(i === 1 ? 'Second Floor Hall' : 'Third Floor Hall', stairX, yt, Z0, 4, FH - 1, ID);
    b.stairs(lower, [stairX + 2, yb, Z0 + 2], up, [top.x, yt, Math.min(Z0 + ID - 1, top.z + 1)]);
    partitionZ(f, Z0, Z0 + ID, yt, dx === 2 ? stairX + 4 : stairX - 1, FH - 1, wp[i], [{ at: Z0 + 2, w: 4 }, { at: midZ + 2, w: 4 }]);
    partitionX(f, roomsX0, roomsX0 + roomsW, yt, midZ, FH - 1, wp[i], []);
    const front = b.room(i === 1 ? 'Front Bedroom' : 'Attic Bedroom', roomsX0, yt, Z0, roomsW, FH - 1, midZ - Z0);
    const back = b.room(i === 1 ? 'Bathroom' : 'Back Bedroom', roomsX0, yt, midZ + 1, roomsW, FH - 1, Z0 + ID - midZ - 1);
    b.door(up, front, dx === 2 ? stairX + 4 : stairX - 1, yt, Z0 + 4, { axis: 'z' });
    b.door(up, back, dx === 2 ? stairX + 4 : stairX - 1, yt, midZ + 4, { axis: 'z' });
    beds.push(...bedroom(b, front, roomsX0, yt, Z0, roomsW, midZ - Z0, { beds: [{ type: i === 1 ? 'bed_double' : 'bed_single', tint: rng.pick(QUILT) }], dresser: roomsW > 16 }).beds);
    if (i === 1) bathroom(b, back, roomsX0, yt, midZ + 1, roomsW, Z0 + ID - midZ - 1);
    else beds.push(...bedroom(b, back, roomsX0, yt, midZ + 1, roomsW, Z0 + ID - midZ - 1, { beds: [{ type: 'bed_single', tint: rng.pick(QUILT) }], dresser: false }).beds);
    lower = up;
  }
  // back yard with a laundry line
  if (D - hz - hd > 12) f.prop('laundry_line', W / 2, 0, hz + hd + (D - hz - hd) / 2, 1, { tint: rng.pick(QUILT), tint2: rng.pick(QUILT) });
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  b.home({ family, size: beds.length, beds, dine: din.seats, lounge: par.seats, kitchen: kit.spots, bath: [], yard: [], porch: [], desk: [], special: spec.special || null });
  return b;
}
