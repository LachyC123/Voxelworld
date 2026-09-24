// Generic fallback building for any lot kind that has no dedicated generator yet.
// Produces an enterable multi-storey building with rooms, stairs, furniture and jobs.
import { Building } from '../building.js';
import { MAT, shell, slab, win, winRow, doorway, stairs, storefront, cornice, flatRoof, bigSign, counterRun, shelves, officeDesk, cornerstone } from './common.js';
import { linkToSidewalk } from '../streets.js';

const BRICKS = ['brick_red', 'brick_dark', 'brick_brown', 'brick_orange', 'brick_yellow', 'limestone', 'sandstone', 'stucco_cream', 'brick_red'];
const STOREFRONT_AWNINGS = [['awning_solid_red', 'canvas_white'], ['awning_solid_green', 'canvas_white'], ['awning_solid_navy', 'canvas_white'], ['awning_red', 'canvas_white'], ['awning_teal', 'canvas_white'], ['awning_yellow', 'canvas_white']];

export function register(GEN) { GEN.__fallback = buildFallback; }

export function buildFallback(ctx, lot, spec) {
  const rng = ctx.rng.fork('fb' + lot.x + ',' + lot.z);
  const kind = spec.kind === 'shop' ? 'shop' : spec.kind;
  const b = new Building(ctx, { name: spec.name || kind, kind, lot, address: lot.address, established: spec.est, hours: spec.hours || (kind === 'shop' ? [8 * 60, 18 * 60] : [8 * 60, 17 * 60]) });
  const f = b.f;
  const W = lot.w, D = lot.d;
  const floors = spec.floors || ({ shop: rng.int(2, 3), office: 6, tower: 16, hotel: 6, bank: 2, apartment: 4, department: 4, hospital: 4, school: 2, station: 2, warehouse: 2, cannery: 3 }[kind] || 2);
  const FH = kind === 'shop' ? 13 : 14;
  const outer = MAT[spec.mat || rng.pick(BRICKS)];
  const trim = rng.pick([MAT.trim_cream, MAT.limestone, MAT.trim_white, MAT.granite]);
  const bw = W, bd = Math.min(D, kind === 'shop' ? D - 8 : D);
  f.box(0, -1, 0, W, 1, D, MAT.sidewalk);
  shell(f, 0, 0, 0, bw, floors * FH, bd, outer, MAT.plaster_cream, 2);
  for (let i = 0; i < floors; i++) slab(f, 1, i * FH, 1, bw - 2, bd - 2, i === 0 ? MAT.floor_linoleum : MAT.floor_oak);
  flatRoof(f, 0, floors * FH, 0, bw, bd, { parapetMat: outer, coping: trim });
  cornice(f, 0, floors * FH - 1, bw, trim, { brackets: 4 });
  if (spec.est) cornerstone(f, 2, 1, spec.est);
  // ground floor
  const X0 = 2, Z0 = 2, IW = bw - 4, ID = bd - 4;
  const ground = b.room(spec.name || 'Ground Floor', X0, 1, Z0, IW, FH - 1, ID - 6, { lightMode: 'always', public: true });
  const back = b.room('Back Room', X0, 1, Z0 + ID - 5, IW, FH - 1, 5, { lightMode: 'auto' });
  f.box(X0, 1, Z0 + ID - 6, IW - 6, FH - 1, 1, MAT.plaster_cream);
  b.door(ground, back, X0 + IW - 4, 1, Z0 + ID - 6, {});
  if (kind === 'shop' || spec.shop) {
    const aw = rng.pick(STOREFRONT_AWNINGS);
    const sf = storefront(f, b, 0, bw, { sign: (spec.name || '').toUpperCase(), awningMat: MAT[aw[0]], awningMat2: MAT[aw[1]], h: 11 });
    b.entrance(ground, sf.door.x, 1, 0, { outZ: -6, leaf: 'door_glass', tint: '#2a4a3a' });
    const c = counterRun(b, ground, X0 + 2, X0 + Math.min(IW - 2, 20), 1, Z0 + ID - 12, { rot: 0 });
    shelves(b, X0 + 1, X0 + IW - 1, 1, Z0 + ID - 6, 'shelf_goods', 0, 4);
    b.job('clerk', c.clerk, { shift: ['8:00', '18:00'], title: 'shopkeeper' });
    b.customerSpots = [c.customer];
    b.spot('stand', X0 + IW / 2, 1, Z0 + 6, 0, { room: ground, act: 'browse', tags: ['browse', 'shop'] });
  } else {
    const dx = Math.floor(bw / 2) - 2;
    doorway(f, dx, 1, 0, 4, 10, { frame: trim, t: 2, transom: true });
    winRow(f, 2, dx - 2, 4, 0, 4, 7, Math.max(1, Math.floor((dx - 4) / 9)), { frame: trim, t: 2 });
    winRow(f, dx + 6, bw - 2, 4, 0, 4, 7, Math.max(1, Math.floor((bw - dx - 8) / 9)), { frame: trim, t: 2 });
    b.entrance(ground, dx + 2, 1, 0, { outZ: -6, leaf: 'door_wood' });
    const s = counterRun(b, ground, X0 + 4, X0 + 16, 1, Z0 + 10, { rot: 0, type: 'counter_shop', register: false });
    b.job('receptionist', s.clerk, { shift: ['8:00', '17:00'] });
    b.customerSpots = [s.customer];
    bigSign(f, (spec.name || '').toUpperCase().slice(0, Math.floor(bw / 6)), bw / 2, FH - 2, 0, { bg: null, mat: MAT.sign_gold, font: 'small' });
  }
  // upper floors: offices or apartments
  let lower = ground;
  const sx = X0 + IW - 5;
  for (let i = 1; i < floors; i++) {
    const yb = (i - 1) * FH + 1, yt = i * FH + 1;
    const top = stairs(f, sx, yb, Z0 + 2, '+z', FH, { w: 4, run: 2, rail: false });
    const r = b.room(`Floor ${i + 1}`, X0, yt, Z0, IW, FH - 1, ID, { lightMode: 'auto' });
    b.stairs(lower, [sx + 2, yb, Z0 + 1], r, [top.x, yt, Math.min(Z0 + ID - 1, top.z + 1)]);
    winRow(f, 2, bw - 2, yt + 3, 0, 4, 7, Math.max(1, Math.floor((bw - 4) / 8)), { frame: trim, t: 2 });
    const nDesk = Math.max(1, Math.floor((IW - 10) / 10));
    for (let k = 0; k < nDesk; k++) {
      const sp = officeDesk(b, r, X0 + 5 + k * 10, yt, Z0 + 8 + (k % 2) * 8, 0, {});
      if (k < 2) b.job('clerk', sp, { shift: ['9:00', '17:00'], days: 'weekday' });
    }
    lower = r;
  }
  for (const e of b.entrances) linkToSidewalk(ctx, e.node);
  return b;
}
