// Local building frames. A Frame maps local voxel coordinates (x along the
// frontage, to the right as seen from the street; y up; z depth into the lot,
// with the front wall at z = 0) onto world voxel coordinates for a lot that
// faces one of the four compass directions.
import { VS } from '../core/config.js';
import { layoutText } from './font.js';

const AXES = {
  S: { ax: [1, 0], az: [0, -1] },
  N: { ax: [-1, 0], az: [0, 1] },
  E: { ax: [0, -1], az: [-1, 0] },
  W: { ax: [0, 1], az: [1, 0] },
};
const RIGHT = { S: 'E', E: 'N', N: 'W', W: 'S' };
const LEFT = { S: 'W', W: 'N', N: 'E', E: 'S' };
const BACK = { S: 'N', N: 'S', E: 'W', W: 'E' };
export const FACING_VEC = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

export class Frame {
  // ox, oy, oz: world voxel min corner of the lot. W: frontage width, D: depth (local units)
  constructor(ctx, ox, oy, oz, facing, W, D, info = {}) {
    this.ctx = ctx; this.world = ctx.world;
    this.ox = ox; this.oy = oy; this.oz = oz; this.facing = facing; this.W = W; this.D = D;
    this.building = info.building ?? null;
    const a = AXES[facing];
    if (!a) throw new Error('bad facing ' + facing);
    this.ax = a.ax; this.az = a.az;
    let Ox = ox, Oz = oz;
    if (facing === 'S') { Oz = oz + D; }
    else if (facing === 'N') { Ox = ox + W; }
    else if (facing === 'E') { Ox = ox + D; Oz = oz + W; }
    this.Ox = Ox; this.Oz = Oz;
  }

  get worldW() { return (this.facing === 'N' || this.facing === 'S') ? this.W : this.D; }
  get worldD() { return (this.facing === 'N' || this.facing === 'S') ? this.D : this.W; }

  // continuous local -> world voxel coords
  px(x, z) { return this.Ox + x * this.ax[0] + z * this.az[0]; }
  pz(x, z) { return this.Oz + x * this.ax[1] + z * this.az[1]; }
  pt(x, y, z) { return { x: this.px(x, z), y: this.oy + y, z: this.pz(x, z) }; }
  // world metres
  m(x, y, z) { return [this.px(x, z) * VS, (this.oy + y) * VS, this.pz(x, z) * VS]; }

  wbox(x, y, z, sx, sy, sz) {
    const xa = this.px(x, z), za = this.pz(x, z), xb = this.px(x + sx, z + sz), zb = this.pz(x + sx, z + sz);
    return [Math.min(xa, xb), this.oy + y, Math.min(za, zb), Math.max(xa, xb), this.oy + y + sy, Math.max(za, zb)];
  }

  box(x, y, z, sx, sy, sz, mat) {
    if (sx <= 0 || sy <= 0 || sz <= 0) return this;
    const b = this.wbox(x, y, z, sx, sy, sz);
    this.world.box(b[0], b[1], b[2], b[3], b[4], b[5], mat);
    return this;
  }
  carve(x, y, z, sx, sy, sz) { return this.box(x, y, z, sx, sy, sz, 0); }
  // hollow shell (walls only) of thickness t
  walls(x, y, z, sx, sy, sz, mat, t = 1) {
    this.box(x, y, z, sx, sy, t, mat);
    this.box(x, y, z + sz - t, sx, sy, t, mat);
    this.box(x, y, z + t, t, sy, sz - 2 * t, mat);
    this.box(x + sx - t, y, z + t, t, sy, sz - 2 * t, mat);
    return this;
  }

  // world direction of a local direction vector
  dir(dx, dz) { return [dx * this.ax[0] + dz * this.az[0], dx * this.ax[1] + dz * this.az[1]]; }
  // yaw (radians) for an object whose model faces +z, facing local quarter-turn `rot`
  // rot 0 = facing the street (local -z), 1 = local +x, 2 = local +z (back), 3 = local -x
  yaw(rot = 0) {
    const a = rot * Math.PI / 2;
    const d = this.dir(Math.sin(a), -Math.cos(a));
    return Math.atan2(d[0], d[1]);
  }

  sub(dx, dy, dz, W = this.W - dx, D = this.D - dz) {
    const b = this.wbox(dx, 0, dz, W, 1, D);
    const f = new Frame(this.ctx, b[0], this.oy + dy, b[2], this.facing, W, D, { building: this.building });
    return f;
  }
  faceFrame(side) {
    const facing = side === 'right' ? RIGHT[this.facing] : side === 'left' ? LEFT[this.facing] : side === 'back' ? BACK[this.facing] : this.facing;
    const swap = side === 'right' || side === 'left';
    return new Frame(this.ctx, this.ox, this.oy, this.oz, facing, swap ? this.D : this.W, swap ? this.W : this.D, { building: this.building });
  }

  // Pixel text on a plane facing the street (local -z). (x, y) = bottom-left, z = layer.
  text(str, x, y, z, mat, o = {}) {
    const scale = o.scale || 1, depth = o.depth || 1;
    const L = layoutText(str, o.font || 'big');
    let x0 = x;
    if (o.align === 'center') x0 = Math.round(x - (L.width * scale) / 2);
    else if (o.align === 'right') x0 = x - L.width * scale;
    // merge horizontal runs per row
    const rows = new Map();
    for (const p of L.pixels) { if (!rows.has(p.y)) rows.set(p.y, []); rows.get(p.y).push(p.x); }
    for (const [py, xs] of rows) {
      xs.sort((a, b) => a - b);
      let s = xs[0], prev = xs[0];
      for (let i = 1; i <= xs.length; i++) {
        if (i < xs.length && xs[i] === prev + 1) { prev = xs[i]; continue; }
        this.box(x0 + s * scale, y + py * scale, z, (prev - s + 1) * scale, scale, depth, mat);
        if (i < xs.length) { s = xs[i]; prev = xs[i]; }
      }
    }
    return { width: L.width * scale, height: L.height * scale, x0 };
  }
  textWidth(str, scale = 1, font = 'big') { return layoutText(str, font).width * scale; }

  // ---------------------------------------------------------------- shapes
  // Solid vertical cylinder centred at (cx, cz) (continuous centre allowed, e.g. 10.5)
  cylinder(cx, y, cz, r, h, mat, hollowT = 0) {
    for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) {
      const zz = dz + 0.5 + Math.floor(cz) - cz;
      const zc = Math.floor(cz) + dz;
      const half = Math.sqrt(Math.max(0, r * r - zz * zz));
      if (half <= 0) continue;
      const xa = Math.round(cx - half), xb = Math.round(cx + half);
      if (xb <= xa) continue;
      if (hollowT > 0) {
        const ri = r - hollowT;
        const hi = Math.sqrt(Math.max(0, ri * ri - zz * zz));
        const ia = Math.round(cx - hi), ib = Math.round(cx + hi);
        if (ri <= 0 || ib <= ia) this.box(xa, y, zc, xb - xa, h, 1, mat);
        else { this.box(xa, y, zc, ia - xa, h, 1, mat); this.box(ib, y, zc, xb - ib, h, 1, mat); }
      } else this.box(xa, y, zc, xb - xa, h, 1, mat);
    }
    return this;
  }
  // Hemisphere / dome on top of y, radius r (voxels), optionally squashed vertically
  dome(cx, y, cz, r, mat, o = {}) {
    const hs = o.heightScale ?? 1;
    const H = Math.ceil(r * hs);
    for (let dy = 0; dy < H; dy++) {
      const t = (dy + 0.5) / hs;
      const rr = Math.sqrt(Math.max(0, r * r - t * t));
      if (rr < 0.5) { this.box(Math.floor(cx), y + dy, Math.floor(cz), 1, 1, 1, mat); continue; }
      this.cylinder(cx, y + dy, cz, rr, 1, mat, o.hollow ? 1.5 : 0);
    }
    return this;
  }
  sphere(cx, cy, cz, r, mat) {
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
      const t = dy + 0.5 + Math.floor(cy) - cy;
      const rr = Math.sqrt(Math.max(0, r * r - t * t));
      if (rr < 0.5) continue;
      this.cylinder(cx, Math.floor(cy) + dy, cz, rr, 1, mat);
    }
    return this;
  }
  // Stepped gable roof over rectangle (x..x+sx, z..z+sz) starting at height y.
  // axis 'x': ridge runs along x (slopes towards front/back). rise: voxels up per voxel in.
  gable(x, y, z, sx, sz, mat, o = {}) {
    const axis = o.axis || 'x', over = o.overhang ?? 1, gableMat = o.gableMat ?? null, rise = o.rise ?? 1;
    const span = axis === 'x' ? sz : sx;
    const steps = Math.ceil(span / 2);
    for (let i = 0; i < steps; i++) {
      for (let r = 0; r < rise; r++) {
        const yy = y + i * rise + r;
        if (axis === 'x') {
          this.box(x - over, yy, z + i - over, sx + 2 * over, 1, Math.max(1, sz - 2 * i + 2 * over), mat);
          if (gableMat !== null && sz - 2 * i - 2 > 0) this.box(x, yy, z + i + 1, sx, 1, sz - 2 * i - 2, gableMat);
        } else {
          this.box(x + i - over, yy, z - over, Math.max(1, sx - 2 * i + 2 * over), 1, sz + 2 * over, mat);
          if (gableMat !== null && sx - 2 * i - 2 > 0) this.box(x + i + 1, yy, z, sx - 2 * i - 2, 1, sz, gableMat);
        }
      }
    }
    return steps * rise;
  }
  // Stepped hip (pyramid) roof
  hip(x, y, z, sx, sz, mat, o = {}) {
    const over = o.overhang ?? 1, rise = o.rise ?? 1, fill = o.fill ?? null;
    let i = 0;
    while (sx - 2 * i + 2 * over > 0 && sz - 2 * i + 2 * over > 0) {
      for (let r = 0; r < rise; r++) {
        this.box(x + i - over, y + i * rise + r, z + i - over, sx - 2 * i + 2 * over, 1, sz - 2 * i + 2 * over, mat);
        if (fill !== null && sx - 2 * i > 2 && sz - 2 * i > 2) this.box(x + i + 1, y + i * rise + r, z + i + 1, sx - 2 * i - 2, 1, sz - 2 * i - 2, fill);
      }
      i++;
    }
    return i * rise;
  }
  // Arched opening carve (semicircular top) in the front plane
  archCarve(x, y, z, w, h, depth, mat = 0) {
    const r = w / 2;
    const straight = Math.max(0, h - Math.ceil(r));
    this.box(x, y, z, w, straight, depth, mat);
    for (let dy = 0; dy < Math.ceil(r); dy++) {
      const t = dy + 0.5;
      const half = Math.sqrt(Math.max(0, r * r - t * t));
      const a = Math.round(x + r - half), b = Math.round(x + r + half);
      if (b > a) this.box(a, y + straight + dy, z, b - a, 1, depth, mat);
    }
    return this;
  }
  // ---------------------------------------------------------------- registries
  room(x, y, z, sx, sy, sz, info = {}) {
    const b = this.wbox(x, y, z, sx, sy, sz);
    const id = this.world.addRoom(b[0], b[1], b[2], b[3], b[4], b[5], { building: this.building, ...info });
    if (this.building && this.building.rooms) this.building.rooms.push(id);
    return id;
  }
  // Place a prop. (x, y, z) = local continuous voxel position of the prop origin (bottom centre).
  prop(type, x, y, z, rot = 0, o = {}) {
    if (!this.ctx.props) return null;
    const p = this.m(x, y, z);
    return this.ctx.props.add(type, p[0], p[1], p[2], this.yaw(rot) + (o.yawOffset || 0), o);
  }
  light(x, y, z, o = {}) {
    if (!this.ctx.lights) return null;
    const p = this.m(x, y, z);
    return this.ctx.lights.add(p[0], p[1], p[2], o);
  }
}
