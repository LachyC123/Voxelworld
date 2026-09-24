// The voxel world is described as an ordered list of "brushes" (boxes and small
// dense voxel models). Later brushes overwrite earlier ones, material 0 carves air.
// Chunks are rasterised from brushes on demand (in workers) and greedy-meshed.
// Collision / queries on the main thread do point lookups over the same brushes.
import { CHUNK } from '../core/config.js';
import { GrowI32 } from '../core/util.js';
import { MATS, matFlagsArray, MFLAG } from './materials.js';

export const BR_BOX = 0, BR_MODEL = 1;
const STRIDE = 8;

export class World {
  constructor() {
    this.br = new GrowI32(1 << 20);
    this.nBrush = 0;
    this.models = [];           // {sx, sy, sz, data: Uint8Array}; data idx = x + sx*(z + sz*y); 0 = keep, 255 = air
    this.roomBoxes = new GrowI32(4096);
    this.rooms = [null];        // id -> room record
    this.min = [1e9, 1e9, 1e9];
    this.max = [-1e9, -1e9, -1e9];
    this.finalized = false;
    this.matFlags = matFlagsArray();
  }

  _grow(x0, y0, z0, x1, y1, z1) {
    const mn = this.min, mx = this.max;
    if (x0 < mn[0]) mn[0] = x0; if (y0 < mn[1]) mn[1] = y0; if (z0 < mn[2]) mn[2] = z0;
    if (x1 > mx[0]) mx[0] = x1; if (y1 > mx[1]) mx[1] = y1; if (z1 > mx[2]) mx[2] = z1;
  }

  // Absolute voxel box, max exclusive.
  box(x0, y0, z0, x1, y1, z1, mat) {
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    if (z1 < z0) [z0, z1] = [z1, z0];
    if (x1 === x0 || y1 === y0 || z1 === z0) return;
    if (mat === undefined || mat === null || Number.isNaN(mat)) throw new Error('box without material');
    this.br.push(BR_BOX, x0, y0, z0, x1, y1, z1, mat);
    this.nBrush++;
    this._grow(x0, y0, z0, x1, y1, z1);
  }

  // Dense model with its own data array (already in world orientation).
  model(x0, y0, z0, sx, sy, sz, data) {
    const idx = this.models.length;
    this.models.push({ sx, sy, sz, data });
    this.br.push(BR_MODEL, x0, y0, z0, x0 + sx, y0 + sy, z0 + sz, idx);
    this.nBrush++;
    this._grow(x0, y0, z0, x0 + sx, y0 + sy, z0 + sz);
  }

  addRoom(x0, y0, z0, x1, y1, z1, info = {}) {
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    if (z1 < z0) [z0, z1] = [z1, z0];
    const id = this.rooms.length;
    if (id > 65000) throw new Error('too many rooms');
    const room = {
      id, name: info.name || 'Room', building: info.building || null, kind: info.kind || 'room',
      box: [x0, y0, z0, x1, y1, z1],
      lightColor: info.lightColor || [1.0, 0.82, 0.58],
      lightPower: info.lightPower ?? 1.0,
      lit: info.lit ?? 0,           // current light level 0..1 (managed by the sim)
      lightMode: info.lightMode || 'auto', // 'auto' (occupancy + darkness), 'always', 'never', 'day'
      ambient: info.ambient ?? 0.35, // how much sky light leaks in
      tv: false, flicker: 0,
    };
    this.rooms.push(room);
    this.roomBoxes.push(x0, y0, z0, x1, y1, z1, id);
    return id;
  }

  finalize() {
    const b = this.br.a, n = this.nBrush;
    const cx0 = Math.floor((this.min[0] - 1) / CHUNK), cz0 = Math.floor((this.min[2] - 1) / CHUNK);
    const cx1 = Math.floor(this.max[0] / CHUNK), cz1 = Math.floor(this.max[2] / CHUNK);
    const ncx = cx1 - cx0 + 1, ncz = cz1 - cz0 + 1;
    const ncol = ncx * ncz;
    const count = new Int32Array(ncol + 1);
    const yMin = new Int32Array(ncol).fill(1 << 30), yMax = new Int32Array(ncol).fill(-(1 << 30));
    const forCols = (x0, z0, x1, z1, fn) => {
      const a0 = Math.floor((x0 - 1) / CHUNK) - cx0, a1 = Math.floor(x1 / CHUNK) - cx0;
      const c0 = Math.floor((z0 - 1) / CHUNK) - cz0, c1 = Math.floor(z1 / CHUNK) - cz0;
      for (let cz = Math.max(0, c0); cz <= Math.min(ncz - 1, c1); cz++)
        for (let cx = Math.max(0, a0); cx <= Math.min(ncx - 1, a1); cx++) fn(cx + cz * ncx);
    };
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      forCols(b[o + 1], b[o + 3], b[o + 4], b[o + 6], (c) => { count[c]++; });
    }
    const start = new Int32Array(ncol + 1);
    for (let c = 0; c < ncol; c++) start[c + 1] = start[c] + count[c];
    const fill = start.slice(0, ncol);
    const list = new Int32Array(start[ncol]);
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      const isAir = b[o] === BR_BOX && b[o + 7] === 0;
      forCols(b[o + 1], b[o + 3], b[o + 4], b[o + 6], (c) => {
        list[fill[c]++] = i;
        if (!isAir) { if (b[o + 2] < yMin[c]) yMin[c] = b[o + 2]; if (b[o + 5] > yMax[c]) yMax[c] = b[o + 5]; }
      });
    }
    this.col = { cx0, cz0, ncx, ncz, start, list, yMin, yMax };

    // rooms index (same column grid)
    const rb = this.roomBoxes.a, nr = this.roomBoxes.n / 7;
    const rcount = new Int32Array(ncol + 1);
    for (let i = 0; i < nr; i++) { const o = i * 7; forCols(rb[o], rb[o + 2], rb[o + 3], rb[o + 5], (c) => { rcount[c]++; }); }
    const rstart = new Int32Array(ncol + 1);
    for (let c = 0; c < ncol; c++) rstart[c + 1] = rstart[c] + rcount[c];
    const rfill = rstart.slice(0, ncol);
    const rlist = new Int32Array(rstart[ncol]);
    for (let i = 0; i < nr; i++) { const o = i * 7; forCols(rb[o], rb[o + 2], rb[o + 3], rb[o + 5], (c) => { rlist[rfill[c]++] = i; }); }
    this.rcol = { start: rstart, list: rlist };
    this.finalized = true;
  }

  colIndex(vx, vz) {
    const c = this.col;
    const cx = Math.floor(vx / CHUNK) - c.cx0, cz = Math.floor(vz / CHUNK) - c.cz0;
    if (cx < 0 || cz < 0 || cx >= c.ncx || cz >= c.ncz) return -1;
    return cx + cz * c.ncx;
  }

  // Material at a voxel (0 = air). Point query over the brush list.
  matAt(x, y, z) {
    const ci = this.colIndex(x, z);
    if (ci < 0) return 0;
    const b = this.br.a, { start, list } = this.col;
    for (let k = start[ci + 1] - 1; k >= start[ci]; k--) {
      const o = list[k] * STRIDE;
      if (x < b[o + 1] || y < b[o + 2] || z < b[o + 3] || x >= b[o + 4] || y >= b[o + 5] || z >= b[o + 6]) continue;
      if (b[o] === BR_BOX) return b[o + 7];
      const m = this.models[b[o + 7]];
      const v = m.data[(x - b[o + 1]) + m.sx * ((z - b[o + 3]) + m.sz * (y - b[o + 2]))];
      if (v === 0) continue;
      return v === 255 ? 0 : v;
    }
    return 0;
  }

  solidAt(x, y, z) {
    const m = this.matAt(x, y, z);
    return m !== 0 && !(this.matFlags[m] & MFLAG.NOCOLLIDE);
  }

  roomAt(x, y, z) {
    const ci = this.colIndex(x, z);
    if (ci < 0) return 0;
    const rb = this.roomBoxes.a, { start, list } = this.rcol;
    for (let k = start[ci + 1] - 1; k >= start[ci]; k--) {
      const o = list[k] * 7;
      if (x >= rb[o] && y >= rb[o + 1] && z >= rb[o + 2] && x < rb[o + 3] && y < rb[o + 4] && z < rb[o + 5]) return rb[o + 6];
    }
    return 0;
  }

  // All chunk coordinates that may contain geometry.
  chunkList() {
    const c = this.col, out = [];
    for (let cz = 0; cz < c.ncz; cz++) for (let cx = 0; cx < c.ncx; cx++) {
      const ci = cx + cz * c.ncx;
      if (c.yMin[ci] > c.yMax[ci]) continue;
      // include padding so faces next to geometry in neighbouring chunks are generated
      const y0 = Math.floor((c.yMin[ci] - 1) / CHUNK), y1 = Math.floor(c.yMax[ci] / CHUNK);
      for (let cy = y0; cy <= y1; cy++) out.push([cx + c.cx0, cy, cz + c.cz0]);
    }
    return out;
  }

  // Data handed to mesher workers.
  serialize() {
    let total = 0;
    for (const m of this.models) total += m.data.length;
    const info = new Int32Array(this.models.length * 4);
    const data = new Uint8Array(total);
    let off = 0;
    this.models.forEach((m, i) => { info[i * 4] = m.sx; info[i * 4 + 1] = m.sy; info[i * 4 + 2] = m.sz; info[i * 4 + 3] = off; data.set(m.data, off); off += m.data.length; });
    return {
      brushes: this.br.a.slice(0, this.nBrush * STRIDE),
      modelInfo: info, modelData: data,
      col: { cx0: this.col.cx0, cz0: this.col.cz0, ncx: this.col.ncx, ncz: this.col.ncz, start: this.col.start, list: this.col.list },
      roomBoxes: this.roomBoxes.a.slice(0, this.roomBoxes.n),
      rcol: { start: this.rcol.start, list: this.rcol.list },
      matFlags: this.matFlags,
    };
  }
}

export function materialName(id) { return MATS[id] ? MATS[id].name : 'air'; }
