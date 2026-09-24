// Small dense voxel models for props (furniture, street furniture, vehicles, signs...).
// Authoring DSL + greedy mesher producing BufferGeometry with baked AO.
import * as THREE from 'three';
import { hexToRgb } from '../core/util.js';
import { layoutText } from '../world/font.js';

export class VoxModel {
  constructor(sx, sy, sz) {
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.data = new Uint8Array(sx * sy * sz);
    this.palette = [null]; // {rgb, tint, emit}
    this._pmap = new Map();
  }
  // colour spec: '#rrggbb' | [r,g,b] | {c, tint:1|2, shade, emit}
  col(spec) {
    let key, entry;
    if (typeof spec === 'object' && !Array.isArray(spec)) {
      const rgb = spec.tint ? [Math.round((spec.shade ?? 0.5) * 255), 0, 0] : hexToRgb(spec.c);
      entry = { rgb, tint: spec.tint || 0, emit: spec.emit || 0 };
    } else entry = { rgb: hexToRgb(spec), tint: 0, emit: 0 };
    key = entry.rgb.join(',') + '|' + entry.tint + '|' + entry.emit;
    let i = this._pmap.get(key);
    if (i === undefined) {
      i = this.palette.length;
      if (i > 254) throw new Error('prop palette overflow');
      this.palette.push(entry); this._pmap.set(key, i);
    }
    return i;
  }
  idx(x, y, z) { return x + this.sx * (z + this.sz * y); }
  set(x, y, z, c) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (x < 0 || y < 0 || z < 0 || x >= this.sx || y >= this.sy || z >= this.sz) return;
    this.data[this.idx(x, y, z)] = c === 0 || c === null ? 0 : (typeof c === 'number' ? c : this.col(c));
  }
  get(x, y, z) { if (x < 0 || y < 0 || z < 0 || x >= this.sx || y >= this.sy || z >= this.sz) return 0; return this.data[this.idx(x, y, z)]; }
  box(x, y, z, w, h, d, c) {
    const ci = c === 0 || c === null ? 0 : (typeof c === 'number' ? c : this.col(c));
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y)), z0 = Math.max(0, Math.floor(z));
    const x1 = Math.min(this.sx, Math.floor(x + w)), y1 = Math.min(this.sy, Math.floor(y + h)), z1 = Math.min(this.sz, Math.floor(z + d));
    for (let yy = y0; yy < y1; yy++) for (let zz = z0; zz < z1; zz++) {
      const o = x0 + this.sx * (zz + this.sz * yy);
      this.data.fill(ci, o, o + Math.max(0, x1 - x0));
    }
    return this;
  }
  clear(x, y, z, w, h, d) { return this.box(x, y, z, w, h, d, 0); }
  // vertical cylinder centred (cx, cz)
  cyl(cx, y, cz, r, h, c) {
    const ci = typeof c === 'number' ? c : this.col(c);
    for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      if (dx * dx + dz * dz <= r * r) for (let yy = y; yy < y + h; yy++) this.set(x, yy, z, ci);
    }
    return this;
  }
  // cylinder along x axis centred (cy, cz)
  cylX(x, cy, cz, r, len, c) {
    const ci = typeof c === 'number' ? c : this.col(c);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
      const dy = y + 0.5 - cy, dz = z + 0.5 - cz;
      if (dy * dy + dz * dz <= r * r) for (let xx = x; xx < x + len; xx++) this.set(xx, y, z, ci);
    }
    return this;
  }
  cylZ(cx, cy, z, r, len, c) {
    const ci = typeof c === 'number' ? c : this.col(c);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dy = y + 0.5 - cy, dx = x + 0.5 - cx;
      if (dy * dy + dx * dx <= r * r) for (let zz = z; zz < z + len; zz++) this.set(x, y, zz, ci);
    }
    return this;
  }
  sphere(cx, cy, cz, r, c, keep = null) {
    const ci = typeof c === 'number' ? c : this.col(c);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, dz = z + 0.5 - cz;
      if (dx * dx + dy * dy + dz * dz <= r * r && (!keep || keep(x, y, z))) this.set(x, y, z, ci);
    }
    return this;
  }
  // text on the +z face plane at depth z, reading +x, bottom-left at (x, y)
  text(str, x, y, z, c, o = {}) {
    const L = layoutText(str, o.font || 'small');
    const s = o.scale || 1, d = o.depth || 1;
    let x0 = x;
    if (o.align === 'center') x0 = Math.round(x - L.width * s / 2);
    for (const p of L.pixels) this.box(x0 + p.x * s, y + p.y * s, z, s, s, d, c);
    return L.width * s;
  }
  // text on the -z face plane (reads +x when seen from -z means reversed x)
  textBack(str, x, y, z, c, o = {}) {
    const L = layoutText(str, o.font || 'small');
    const s = o.scale || 1, d = o.depth || 1;
    let xr = x;
    if (o.align === 'center') xr = Math.round(x + L.width * s / 2);
    for (const p of L.pixels) this.box(xr - (p.x + 1) * s, y + p.y * s, z, s, s, d, c);
    return L.width * s;
  }
  // mirror the model left/right half onto the other (for symmetric props)
  mirrorX() {
    for (let y = 0; y < this.sy; y++) for (let z = 0; z < this.sz; z++) for (let x = 0; x < this.sx >> 1; x++) {
      const a = this.data[this.idx(x, y, z)];
      if (a) this.data[this.idx(this.sx - 1 - x, y, z)] = a;
    }
    return this;
  }
}

const FACES = [
  // d, dir, normal
  [0, 1, [1, 0, 0]], [0, -1, [-1, 0, 0]], [1, 1, [0, 1, 0]], [1, -1, [0, -1, 0]], [2, 1, [0, 0, 1]], [2, -1, [0, 0, -1]],
];

// Greedy mesh a VoxModel. scale = metres per voxel; origin in voxel units (subtracted).
export function meshVoxModel(model, scale, origin) {
  const { sx, sy, sz, data, palette } = model;
  const dims = [sx, sy, sz];
  const get = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) ? 0 : data[x + sx * (z + sz * y)];
  const pos = [], nrm = [], col = [], info = [], idx = [];
  const p = [0, 0, 0];
  for (const [d, dir, n] of FACES) {
    const u = (d + 1) % 3, v = (d + 2) % 3;
    const du = dims[u], dv = dims[v];
    const mask = new Int32Array(du * dv);
    for (let i = 0; i < dims[d]; i++) {
      let any = false;
      for (let k = 0; k < dv; k++) for (let j = 0; j < du; j++) {
        p[d] = i; p[u] = j; p[v] = k;
        const a = get(p[0], p[1], p[2]);
        let key = 0;
        if (a) {
          p[d] = i + dir;
          if (!get(p[0], p[1], p[2])) {
            const q = [p[0], p[1], p[2]];
            const occ = (du_, dv_) => { const r = [q[0], q[1], q[2]]; r[u] += du_; r[v] += dv_; return get(r[0], r[1], r[2]) ? 1 : 0; };
            const um = occ(-1, 0), up = occ(1, 0), vm = occ(0, -1), vp = occ(0, 1);
            const a0 = (um && vm) ? 0 : 3 - (um + vm + occ(-1, -1));
            const a1 = (up && vm) ? 0 : 3 - (up + vm + occ(1, -1));
            const a2 = (up && vp) ? 0 : 3 - (up + vp + occ(1, 1));
            const a3 = (um && vp) ? 0 : 3 - (um + vp + occ(-1, 1));
            key = a | (a0 << 8) | (a1 << 10) | (a2 << 12) | (a3 << 14) | (1 << 20);
            any = true;
          }
        }
        mask[j + k * du] = key;
      }
      if (!any) continue;
      for (let k = 0; k < dv; k++) for (let j = 0; j < du;) {
        const key = mask[j + k * du];
        if (!key) { j++; continue; }
        let w = 1; while (j + w < du && mask[j + w + k * du] === key) w++;
        let h = 1;
        outer: for (; k + h < dv; h++) for (let t = 0; t < w; t++) if (mask[j + t + (k + h) * du] !== key) break outer;
        for (let hh = 0; hh < h; hh++) for (let t = 0; t < w; t++) mask[j + t + (k + hh) * du] = 0;
        const pe = palette[key & 255];
        const aos = [(key >> 8) & 3, (key >> 10) & 3, (key >> 12) & 3, (key >> 14) & 3];
        const cu = [j, j + w, j + w, j], cv = [k, k, k + h, k + h];
        const base = pos.length / 3;
        for (let c = 0; c < 4; c++) {
          const q = [0, 0, 0];
          q[d] = i + (dir > 0 ? 1 : 0); q[u] = cu[c]; q[v] = cv[c];
          pos.push((q[0] - origin[0]) * scale, (q[1] - origin[1]) * scale, (q[2] - origin[2]) * scale);
          nrm.push(n[0] * 127, n[1] * 127, n[2] * 127);
          const ao = [0.45, 0.65, 0.84, 1.0][aos[c]];
          col.push(pe.rgb[0], pe.rgb[1], pe.rgb[2], Math.round(ao * 255));
          info.push(pe.tint, Math.round(pe.emit * 255));
        }
        const flip = aos[0] + aos[2] > aos[1] + aos[3];
        if (dir > 0) {
          if (flip) idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          else idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
        } else {
          if (flip) idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
          else idx.push(base + 1, base + 3, base + 2, base + 1, base, base + 3);
        }
        j += w;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Int8BufferAttribute(new Int8Array(nrm), 3, true));
  g.setAttribute('aCol', new THREE.Uint8BufferAttribute(new Uint8Array(col), 4));
  g.setAttribute('aInfo', new THREE.Uint8BufferAttribute(new Uint8Array(info), 2));
  g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}
