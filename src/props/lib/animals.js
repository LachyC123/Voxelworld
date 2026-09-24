// Props for street life (animals). Conventions as docs/PROPS.md: origin bottom centre, front faces +z.
// Every animal comes as a set of animation frames (separate props swapped at runtime by
// src/sim/life/animals.js): dogs `dog_<breed>_<frame>`, cats `cat_<coat>_<frame>`, horses
// `horse_draft_*` / `horse_mount_*`, squirrels `squirrel_*`, plus the rag wagon and a leash.
// Small animals use finer voxels than 1/16 m (dogs 1/32, cats 1/40, squirrels 1/48) so a 25 cm cat
// still has ears, paws and a tail; horses and the wagon use the usual 1/16 m.
// Models are sculpted from tapered capsules and ellipsoids in metres around the body centre
// (x = 0 centreline, y = 0 ground, z = 0 middle of the body, +z = nose), then rasterised.
import { defineProp } from '../props.js';

const A = (s = 0.5) => ({ tint: 1, shade: s });
const B = (s = 0.5) => ({ tint: 2, shade: s });
const WHITE = '#ece6d8', CREAMY = '#e2d6bc', INK = '#161312', NOSE = '#1d1715', PINK = '#c87a7a', TONGUE = '#c8505a';
const GILT = '#c9a24a', BRASS = '#b8913e', LEATHER = '#3a2618', LEATHER2 = '#5a3a22', IRON = '#34302c';

// ---------------------------------------------------------------- sculpting (metres -> voxels)
// S wraps a VoxModel (or a bounds recorder) with a voxel density V (voxels per metre) and the voxel
// index of the model origin. Shapes test voxel centres, so everything stays symmetric about x = 0.
class Sculpt {
  constructor(m, V, ox, oy, oz) { this.m = m; this.V = V; this.ox = ox; this.oy = oy; this.oz = oz; }
  _put(i, j, k, c) { this.m.set(i, j, k, c); }
  // tapered capsule a -> b; ra/rb = [half-width (x), half-height (perpendicular, in the y-z plane)] at each end.
  // col: colour, or fn(t along 0..1, v -1..1 bottom..top, s -1..1 right..left) -> colour
  cap(a, b, ra, rb, col, round = true) {
    const V = this.V;
    const ax = this.ox + a[0] * V, ay = this.oy + a[1] * V, az = this.oz + a[2] * V;
    const bx = this.ox + b[0] * V, by = this.oy + b[1] * V, bz = this.oz + b[2] * V;
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const L2 = dx * dx + dy * dy + dz * dz || 1e-6, L = Math.sqrt(L2);
    const ux = dx / L, uy = dy / L, uz = dz / L;
    // "up" axis perpendicular to the capsule axis (in the y-z plane where possible)
    let wx = 0, wy = uz, wz = -uy;
    if (Math.abs(uz) < 1e-3 && Math.abs(uy) < 1e-3) { wy = 1; wz = 0; }
    const wd = wx * ux + wy * uy + wz * uz; wx -= wd * ux; wy -= wd * uy; wz -= wd * uz;
    let wl = Math.hypot(wx, wy, wz) || 1; wx /= wl; wy /= wl; wz /= wl;
    if (wy < 0) { wx = -wx; wy = -wy; wz = -wz; }
    // side axis = u x w
    const sx = uy * wz - uz * wy, sy = uz * wx - ux * wz, sz = ux * wy - uy * wx;
    // never thinner than a voxel line, so tails and legs don't break up into dots
    const rwa = Math.max(0.72, ra[0] * V), rha = Math.max(0.72, ra[1] * V), rwb = Math.max(0.72, rb[0] * V), rhb = Math.max(0.72, rb[1] * V);
    const R = Math.max(rwa, rha, rwb, rhb) + 1;
    const x0 = Math.floor(Math.min(ax, bx) - R), x1 = Math.ceil(Math.max(ax, bx) + R);
    const y0 = Math.floor(Math.min(ay, by) - R), y1 = Math.ceil(Math.max(ay, by) + R);
    const z0 = Math.floor(Math.min(az, bz) - R), z1 = Math.ceil(Math.max(az, bz) + R);
    const fn = typeof col === 'function';
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - ax, py = y + 0.5 - ay, pz = z + 0.5 - az;
      const t = (px * dx + py * dy + pz * dz) / L2;
      const tc = t < 0 ? 0 : t > 1 ? 1 : t;
      if (!round && t !== tc) continue;
      const qx = px - tc * dx, qy = py - tc * dy, qz = pz - tc * dz;
      const rw = rwa + (rwb - rwa) * tc, rh = rha + (rhb - rha) * tc;
      if (rw <= 0 || rh <= 0) continue;
      const dv = qx * wx + qy * wy + qz * wz, ds = qx * sx + qy * sy + qz * sz;
      const da = (t - tc) * L, rc = Math.min(rw, rh);
      const n = (ds / rw) ** 2 + (dv / rh) ** 2 + (da / rc) ** 2;
      if (n > 1) continue;
      this._put(x, y, z, fn ? col(tc, dv / rh, ds / rw) : col);
    }
  }
  // ellipsoid centred at c with radii r = [rx, ry, rz]; col may be fn(nx, ny, nz) (normalised offsets)
  ell(c, r, col) {
    const V = this.V;
    const cx = this.ox + c[0] * V, cy = this.oy + c[1] * V, cz = this.oz + c[2] * V;
    const rx = Math.max(0.72, r[0] * V), ry = Math.max(0.72, r[1] * V), rz = Math.max(0.72, r[2] * V);
    const fn = typeof col === 'function';
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, nz = (z + 0.5 - cz) / rz;
      if (nx * nx + ny * ny + nz * nz > 1) continue;
      this._put(x, y, z, fn ? col(nx, ny, nz) : col);
    }
  }
  // one voxel at a point (optionally mirrored to -x)
  dot(p, col, mirror = false) {
    const V = this.V;
    const i = Math.floor(this.ox + p[0] * V), j = Math.floor(this.oy + p[1] * V), k = Math.floor(this.oz + p[2] * V);
    this._put(i, j, k, col);
    if (mirror) this._put(2 * Math.round(this.ox) - 1 - i, j, k, col);
  }
  // axis-aligned box in metres (min corner, size)
  box(p, s, col) {
    const V = this.V;
    const i0 = Math.round(this.ox + p[0] * V), j0 = Math.round(this.oy + p[1] * V), k0 = Math.round(this.oz + p[2] * V);
    const i1 = Math.round(this.ox + (p[0] + s[0]) * V), j1 = Math.round(this.oy + (p[1] + s[1]) * V), k1 = Math.round(this.oz + (p[2] + s[2]) * V);
    for (let j = j0; j < Math.max(j1, j0 + 1); j++) for (let k = k0; k < Math.max(k1, k0 + 1); k++) for (let i = i0; i < Math.max(i1, i0 + 1); i++) this._put(i, j, k, col);
  }
}

// records the voxel bounds a set of frames touches, so every frame of an animal shares one grid and origin
class Bounds {
  constructor() { this.x0 = Infinity; this.y0 = Infinity; this.z0 = Infinity; this.x1 = -Infinity; this.y1 = -Infinity; this.z1 = -Infinity; }
  set(x, y, z) { if (x < this.x0) this.x0 = x; if (x > this.x1) this.x1 = x; if (y < this.y0) this.y0 = y; if (y > this.y1) this.y1 = y; if (z < this.z0) this.z0 = z; if (z > this.z1) this.z1 = z; }
}

// define a family of frame props that share one grid: draw(S, frame) sculpts one frame around (0,0,0)
function defineFrames(prefix, frames, V, draw, o = {}) {
  const bb = new Bounds();
  const big = 4000; // generous virtual origin for the bounds pass
  for (const f of frames) draw(new Sculpt(bb, V, big, 0, big), f);
  const sx = bb.x1 - bb.x0 + 1, sy = Math.max(1, bb.y1 + 1), sz = bb.z1 - bb.z0 + 1;
  // keep x symmetric about the origin plane
  const hx = Math.max(big - bb.x0, bb.x1 + 1 - big);
  const size = [hx * 2, sy, sz];
  const ox = hx, oz = big - bb.z0;
  const out = {};
  for (const f of frames) {
    const name = `${prefix}_${f}`;
    defineProp(name, {
      size, scale: 1 / V, origin: [ox, 0, oz], cat: o.cat || 'exterior',
      build(m) { draw(new Sculpt(m, V, ox, 0, oz), f); },
    });
    out[f] = name;
  }
  void sx;
  return out;
}

const lerp = (a, b, t) => a + (b - a) * t;
const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];

// ================================================================ DOGS
// Breed spec (metres): legH ground->belly, bodyL rump->chest, chestD/loinD body depth, bodyW half-width,
// neck/skull/muzzle sizes, ears ('drop' | 'fold' | 'prick' | 'rose' | 'fluff'), tail ('up' | 'feather' |
// 'brush' | 'stub' | 'pom' | 'low' | 'curl'), coat pattern (tints: A main coat, B second colour).
export const DOG_BREEDS = {
  // wire fox terrier: white, black saddle (B), tan head (A)
  terrier: { legH: 0.2, bodyL: 0.4, chestD: 0.2, loinD: 0.16, bodyW: 0.07, neckL: 0.1, neckA: 1.05, neckR: 0.045, skull: [0.05, 0.055, 0.07], muz: [0.08, 0.035, 0.04], ear: 'fold', earL: 0.05, tail: 'up', tailL: 0.12, tailR: 0.02, legR: 0.024, coat: 'terrier', collar: '#b8322a', stride: 0.05 },
  // Irish setter: all red (A), feathered ears, legs and tail
  setter: { legH: 0.36, bodyL: 0.6, chestD: 0.27, loinD: 0.18, bodyW: 0.095, neckL: 0.2, neckA: 0.95, neckR: 0.055, skull: [0.06, 0.065, 0.1], muz: [0.12, 0.038, 0.045], ear: 'drop', earL: 0.15, tail: 'feather', tailL: 0.38, tailR: 0.022, legR: 0.03, coat: 'setter', collar: '#2a4a7a', stride: 0.09 },
  // rough collie: sable (A) and white, big white ruff, long narrow head
  collie: { legH: 0.33, bodyL: 0.58, chestD: 0.28, loinD: 0.21, bodyW: 0.11, neckL: 0.16, neckA: 1.0, neckR: 0.09, skull: [0.055, 0.06, 0.09], muz: [0.13, 0.03, 0.04], ear: 'tip', earL: 0.07, tail: 'brush', tailL: 0.34, tailR: 0.04, legR: 0.03, coat: 'collie', collar: null, stride: 0.085 },
  // dachshund: long and low; A coat, B points (eyebrows, muzzle, chest, feet)
  dachshund: { legH: 0.09, bodyL: 0.44, chestD: 0.16, loinD: 0.13, bodyW: 0.065, neckL: 0.1, neckA: 0.75, neckR: 0.042, skull: [0.045, 0.05, 0.07], muz: [0.09, 0.028, 0.034], ear: 'drop', earL: 0.09, tail: 'low', tailL: 0.2, tailR: 0.018, legR: 0.024, coat: 'dachshund', collar: '#2a6a3a', stride: 0.035 },
  // boxer: fawn (A), white chest and socks, black mask, cropped ears, docked tail
  boxer: { legH: 0.32, bodyL: 0.52, chestD: 0.3, loinD: 0.2, bodyW: 0.11, neckL: 0.14, neckA: 0.95, neckR: 0.07, skull: [0.07, 0.075, 0.08], muz: [0.065, 0.045, 0.048], ear: 'prick', earL: 0.08, tail: 'stub', tailL: 0.06, tailR: 0.025, legR: 0.035, coat: 'boxer', collar: '#1e1e1e', stride: 0.085 },
  // beagle: tricolour — tan (A), black saddle (B), white legs, belly and muzzle
  beagle: { legH: 0.2, bodyL: 0.42, chestD: 0.2, loinD: 0.15, bodyW: 0.085, neckL: 0.09, neckA: 0.9, neckR: 0.05, skull: [0.055, 0.058, 0.07], muz: [0.07, 0.04, 0.042], ear: 'drop', earL: 0.11, tail: 'up', tailL: 0.17, tailR: 0.02, legR: 0.028, coat: 'beagle', collar: '#b8322a', stride: 0.05 },
  // miniature poodle, continental clip: shaved loin, pom-poms, topknot (all A)
  poodle: { legH: 0.2, bodyL: 0.34, chestD: 0.18, loinD: 0.1, bodyW: 0.08, neckL: 0.12, neckA: 1.2, neckR: 0.055, skull: [0.045, 0.05, 0.06], muz: [0.07, 0.022, 0.028], ear: 'fluff', earL: 0.1, tail: 'pom', tailL: 0.12, tailR: 0.014, legR: 0.018, coat: 'poodle', collar: '#c83a6a', stride: 0.045 },
  // mongrel: medium, shaggy, A coat with B patches, one ear up
  mutt: { legH: 0.27, bodyL: 0.5, chestD: 0.23, loinD: 0.17, bodyW: 0.09, neckL: 0.13, neckA: 0.95, neckR: 0.06, skull: [0.06, 0.062, 0.08], muz: [0.09, 0.04, 0.045], ear: 'mixed', earL: 0.08, tail: 'curl', tailL: 0.22, tailR: 0.026, legR: 0.03, coat: 'mutt', collar: null, stride: 0.07 },
};
export const DOG_FRAMES = ['stand', 'wag', 'walk_a', 'walk_b', 'run', 'sit', 'lie', 'lie_up'];

// coat colour by body part: part, t (0 rump/root .. 1 chest/tip), v (-1 belly .. 1 back), s (side)
function dogCoat(kind) {
  switch (kind) {
    case 'terrier': return (part, t, v) => {
      if (part === 'body') return v > 0.15 && t > 0.12 && t < 0.78 ? B(0.5) : WHITE;
      if (part === 'head' || part === 'ear') return A(part === 'ear' ? 0.42 : 0.5);
      if (part === 'muzzle') return v > 0.4 ? A(0.55) : WHITE;
      if (part === 'tail') return t < 0.35 ? B(0.5) : WHITE;
      return WHITE;
    };
    case 'setter': return (part, t, v) => (part === 'ear' || part === 'feather' ? A(0.42) : part === 'muzzle' && v < -0.2 ? A(0.46) : A(0.5));
    case 'collie': return (part, t, v, s) => {
      if (part === 'body') return (v < -0.6 || (t > 0.86 && v < 0.2)) ? WHITE : A(0.5);
      if (part === 'ruff') return v > 0.45 ? A(0.5) : WHITE;
      if (part === 'head') return Math.abs(s) < 0.2 && v > -0.2 ? WHITE : A(0.5);
      if (part === 'muzzle') return Math.abs(s) < 0.45 || v < -0.2 ? WHITE : A(0.5);
      if (part === 'ear') return A(0.38);
      if (part === 'tail') return t > 0.78 ? WHITE : A(0.5);
      if (part === 'leg' || part === 'foot' || part === 'feather') return WHITE;
      return A(0.5);
    };
    case 'dachshund': return (part, t, v) => {
      if (part === 'muzzle') return B(0.5);
      if (part === 'foot') return B(0.5);
      if (part === 'leg') return t > 0.55 ? B(0.5) : A(0.5);
      if (part === 'body') return t > 0.86 && v < -0.1 ? B(0.5) : A(0.5);
      if (part === 'brow') return B(0.55);
      if (part === 'ear') return A(0.42);
      return A(0.5);
    };
    case 'boxer': return (part, t, v, s) => {
      if (part === 'muzzle') return t > 0.3 || v < -0.2 ? '#241e1a' : A(0.5);
      if (part === 'body') return (t > 0.8 && v < 0.15) || (v < -0.55 && t > 0.45) ? WHITE : A(0.5);
      if (part === 'head') return Math.abs(s) < 0.18 && v > -0.4 ? WHITE : A(0.5);
      if (part === 'foot') return WHITE;
      if (part === 'leg') return t > 0.7 ? WHITE : A(0.5);
      if (part === 'ear') return A(0.4);
      return A(0.5);
    };
    case 'beagle': return (part, t, v, s) => {
      if (part === 'body') return v < -0.3 || (t > 0.84 && v < 0.3) ? WHITE : (v > 0.1 && t > 0.1 && t < 0.8 ? B(0.5) : A(0.5));
      if (part === 'head') return Math.abs(s) < 0.2 && v > -0.3 ? WHITE : A(0.5);
      if (part === 'muzzle') return WHITE;
      if (part === 'ear') return A(0.44);
      if (part === 'tail') return t > 0.7 ? WHITE : B(0.5);
      if (part === 'leg' || part === 'foot' || part === 'neck-under') return WHITE;
      return A(0.5);
    };
    case 'poodle': return (part) => (part === 'fluff' || part === 'ear' ? A(0.56) : part === 'muzzle' ? A(0.46) : A(0.5));
    case 'mutt': return (part, t, v, s) => {
      if (part === 'body') { if (t > 0.84 && v < 0.2) return WHITE; return (Math.sin(t * 11 + s * 2.5) + v * 1.2 > 1.0) ? B(0.5) : A(0.5); }
      if (part === 'ear') return s > 0 ? B(0.46) : A(0.45);
      if (part === 'muzzle') return v < 0 ? WHITE : A(0.55);
      if (part === 'foot') return WHITE;
      if (part === 'tail') return t > 0.75 ? WHITE : A(0.5);
      return A(0.5);
    };
  }
  return () => A(0.5);
}

function drawDog(S, D, frame) {
  const coat = dogCoat(D.coat);
  const c = (part) => (t, v, s) => coat(part, t, v, s);
  const { legH, bodyL, chestD, loinD, bodyW, neckL, neckR, legR } = D;
  const [skW, skH, skL] = D.skull, [muL, muW, muH] = D.muz;
  const half = bodyL / 2;
  let neckA = D.neckA;
  const lying = frame === 'lie' || frame === 'lie_up', sitting = frame === 'sit', running = frame === 'run';
  const poodle = D.coat === 'poodle';
  // ---- body axis
  let rump, chest;
  if (sitting) {
    chest = [0, legH + chestD * 0.42, half - 0.03];
    rump = [0, loinD * 0.62, chest[2] - bodyL * 0.72];
  } else if (lying) {
    chest = [0, chestD * 0.5, half - 0.02];
    rump = [0, loinD * 0.5, -half * 0.86];
  } else {
    const drop = running ? chestD * 0.08 : 0;
    chest = [0, legH + chestD * 0.5 - drop, half + (running ? 0.02 : 0)];
    rump = [0, legH + loinD * 0.55 - drop, -half - (running ? 0.02 : 0)];
  }
  const bodyCol = (t, v, s) => coat('body', t, v, s);
  if (poodle) {
    // shaved loin, fluffy mane over the chest and shoulders, pom-poms on the hips
    S.cap(rump, chest, [bodyW * 0.6, loinD * 0.5], [bodyW * 0.75, chestD * 0.42], bodyCol);
    const m0 = [lerp(rump[0], chest[0], 0.55), lerp(rump[1], chest[1], 0.55), lerp(rump[2], chest[2], 0.55)];
    S.cap(m0, add(chest, [0, 0.01, 0.02]), [bodyW * 1.05, chestD * 0.58], [bodyW * 1.1, chestD * 0.62], A(0.56));
    for (const sx of [1, -1]) S.ell(add(rump, [sx * bodyW * 0.55, loinD * 0.1, 0.02]), [0.035, 0.04, 0.04], A(0.56));
  } else {
    S.cap(rump, chest, [bodyW * 0.88, loinD * 0.5], [bodyW, chestD * 0.5], bodyCol);
  }
  // collie ruff and chest
  if (D.coat === 'collie') S.cap(add(chest, [0, chestD * 0.05, -0.02]), add(chest, [0, chestD * 0.38, 0.06]), [bodyW * 1.15, chestD * 0.42], [bodyW * 1.0, chestD * 0.35], (t, v) => coat('ruff', t, v, 0));
  // ---- legs
  const legCol = (t) => coat('leg', t, 0, 0), footCol = coat('foot', 1, 0, 0);
  const feather = D.coat === 'setter' || D.coat === 'collie';
  const pom = (p) => S.ell(p, [legR * 1.6, legR * 1.8, legR * 1.6], A(0.56));
  if (lying) {
    // front legs stretched forward along the ground, hind legs folded against the flanks
    for (const sx of [1, -1]) {
      const f0 = [sx * bodyW * 0.62, legR * 1.1, half - 0.03], f1 = [sx * bodyW * 0.55, legR * 1.05, half + legH * 0.45 + 0.03];
      S.cap(f0, f1, [legR, legR], [legR * 0.95, legR * 0.95], legCol);
      S.ell(f1, [legR * 1.15, legR, legR * 1.3], footCol);
      S.ell([sx * bodyW * 0.92, loinD * 0.5, -half + loinD * 0.35], [bodyW * 0.35, loinD * 0.45, loinD * 0.5], bodyCol);
      S.cap([sx * (bodyW * 0.95 + legR * 0.5), legR, -half + 0.02], [sx * (bodyW * 0.95 + legR * 0.5), legR, -half + legH * 0.55 + 0.05], [legR, legR], [legR, legR], legCol);
      S.ell([sx * (bodyW * 0.95 + legR * 0.5), legR, -half + legH * 0.55 + 0.06], [legR * 1.1, legR, legR * 1.2], footCol);
    }
  } else if (sitting) {
    for (const sx of [1, -1]) {
      const x = sx * (bodyW - legR * 0.4);
      const top = [x, chest[1] + chestD * 0.05, chest[2] - 0.01], foot = [x, legR * 1.1, chest[2] + 0.01];
      S.cap(top, foot, [legR * 1.1, legR * 1.1], [legR, legR], legCol);
      S.ell(add(foot, [0, -legR * 0.1, legR * 0.4]), [legR * 1.15, legR, legR * 1.3], footCol);
      if (poodle) pom(add(foot, [0, legR * 1.3, 0]));
      // haunch and the hind foot flat along the ground
      S.ell([sx * bodyW * 0.8, loinD * 0.55, rump[2] + loinD * 0.3], [bodyW * 0.42, loinD * 0.55, loinD * 0.6], bodyCol);
      const h0 = [sx * bodyW * 0.85, legR, rump[2] + loinD * 0.35], h1 = [sx * bodyW * 0.8, legR, rump[2] + loinD * 0.35 + legH * 0.55 + 0.03];
      S.cap(h0, h1, [legR, legR], [legR, legR], legCol);
      S.ell(h1, [legR * 1.15, legR, legR * 1.3], footCol);
      if (poodle) pom(add(h1, [0, legR * 1.2, -legR]));
    }
  } else {
    const st = D.stride;
    // swing per leg: [frontLeft, frontRight, hindLeft, hindRight] (+ = forward)
    let sw = [0, 0, 0, 0], lift = [0, 0, 0, 0];
    if (frame === 'walk_a') { sw = [st, -st, -st, st]; lift = [1, 0, 0, 1]; }
    else if (frame === 'walk_b') { sw = [-st, st, st, -st]; lift = [0, 1, 1, 0]; }
    else if (running) { sw = [st * 1.9, st * 1.5, -st * 1.9, -st * 1.5]; lift = [1, 1, 1, 1]; }
    const fz = half - legR * 1.2, hz = -half + legR * 1.4;
    [[1, fz, 0], [-1, fz, 1], [1, hz, 2], [-1, hz, 3]].forEach(([sx, z, k]) => {
      const front = k < 2;
      const x = sx * (bodyW - legR * (front ? 0.5 : 0.2));
      const top = [x, front ? chest[1] : rump[1] + loinD * 0.05, z];
      const fy = legR * 1.05 + lift[k] * legR * (running ? 1.4 : 0.8);
      const foot = [x, fy, z + sw[k]];
      if (front) S.cap(top, foot, [legR * 1.15, legR * 1.2], [legR, legR], legCol);
      else {
        // hind leg: thigh down and back to the hock, then the cannon down to the paw
        const hock = [x, legH * 0.38 + lift[k] * legR * 0.5, z - legH * 0.16 + sw[k] * 0.6];
        S.ell(add(top, [0, -loinD * 0.1, 0.01]), [legR * 1.7, loinD * 0.42, loinD * 0.42], bodyCol);
        S.cap(top, hock, [legR * 1.3, legR * 1.5], [legR * 0.95, legR], legCol);
        S.cap(hock, foot, [legR * 0.95, legR], [legR * 0.9, legR * 0.9], legCol);
      }
      S.ell(add(foot, [0, -legR * 0.15, legR * 0.35]), [legR * 1.15, legR, legR * 1.3], footCol);
      if (feather && front) S.cap(add(top, [0, -0.02, -legR]), add(foot, [0, legR * 3, -legR * 1.3]), [legR * 0.5, legR * 0.6], [legR * 0.3, legR * 0.5], coat('feather', 0, 0, 0));
      if (poodle) pom(add(foot, [0, legR * 1.4, 0]));
    });
  }
  // ---- neck and head
  let neck0, headC;
  if (lying && frame === 'lie') {
    neck0 = [0, chest[1] + chestD * 0.2, chest[2] - 0.01];
    headC = [0, legR * 2 + skH * 0.85, chest[2] + legH * 0.22 + skL * 0.35];
  } else {
    if (sitting) neckA += 0.2; if (running) neckA -= 0.45; if (frame === 'lie_up') neckA += 0.1;
    neck0 = [0, chest[1] + chestD * (lying ? 0.25 : 0.28), chest[2] - 0.01];
    headC = add(neck0, [0, Math.sin(neckA) * neckL + skH * 0.35, Math.cos(neckA) * neckL + skL * 0.2]);
  }
  S.cap(neck0, headC, [neckR * 1.1, neckR * 1.25], [neckR * 0.9, neckR], (t, v, s) => coat(D.coat === 'beagle' && v < -0.2 ? 'neck-under' : D.coat === 'collie' ? 'ruff' : 'body', 0.95, v, s));
  if (poodle) S.cap(neck0, headC, [neckR * 1.15, neckR * 1.25], [neckR * 1.05, neckR * 1.1], A(0.56));
  if (D.collar) { const cc = [lerp(neck0[0], headC[0], 0.35), lerp(neck0[1], headC[1], 0.35), lerp(neck0[2], headC[2], 0.35)]; S.cap(add(cc, [0, 0, -0.008]), add(cc, [0, 0, 0.008]), [neckR * 1.25, neckR * 1.35], [neckR * 1.25, neckR * 1.35], D.collar); S.dot(add(cc, [0, -neckR * 1.45, 0.012]), GILT); }
  const asleep = frame === 'lie';
  S.ell(headC, [skW, skH, skL * 0.55], (nx, ny, nz) => coat('head', 0, ny, nx));
  // muzzle: forward (and down a touch), nose at the tip
  const mdir = asleep ? [0, -0.05, 1] : running ? [0, -0.25, 1] : [0, -0.18, 1];
  const ml = Math.hypot(mdir[1], mdir[2]);
  const m0 = add(headC, [0, -skH * 0.3, skL * 0.3]);
  const m1 = add(m0, [0, mdir[1] / ml * muL, mdir[2] / ml * muL]);
  S.cap(m0, m1, [muW * 1.05, muH], [muW * 0.85, muH * 0.8], (t, v, s) => coat('muzzle', t, v, s));
  S.dot(add(m1, [0, muH * 0.45, muW * 0.4]), NOSE);
  if (S.V * muW >= 1.2) S.dot(add(m1, [-muW * 0.5, muH * 0.45, muW * 0.35]), NOSE, true);
  if (running) S.dot(add(m1, [0, -muH * 0.95, -muL * 0.25]), TONGUE);
  if (D.coat === 'dachshund') S.dot([skW * 0.45, headC[1] + skH * 0.55, headC[2] + skL * 0.35], coat('brow', 0, 0, 0), true);
  // eyes (closed = a darker coat line)
  const eye = [Math.max(skW * 0.62, 1.05 / S.V), headC[1] + skH * 0.28, headC[2] + skL * 0.42];
  S.dot(eye, asleep ? A(0.3) : INK, true);
  // ears
  const earC = (t, v, s) => coat('ear', t, v, s);
  for (const sx of [1, -1]) {
    const base = [sx * skW * 0.78, headC[1] + skH * 0.55, headC[2] - skL * 0.1];
    const kind = D.ear === 'mixed' ? (sx > 0 ? 'prick' : 'drop') : D.ear;
    const flop = running ? -0.03 : 0;
    if (kind === 'drop') S.cap(base, add(base, [sx * 0.012, -D.earL, 0.01 + flop]), [0.012, 0.022], [0.012, 0.028], earC);
    else if (kind === 'fluff') S.cap(base, add(base, [sx * 0.02, -D.earL, 0]), [0.022, 0.03], [0.026, 0.034], A(0.56));
    else if (kind === 'fold') S.cap(add(base, [0, skH * 0.25, 0]), add(base, [sx * 0.01, 0.0, skL * 0.35]), [0.01, 0.018], [0.01, 0.02], earC);
    else if (kind === 'tip') { const up = add(base, [sx * 0.01, D.earL * 0.75, -0.005]); S.cap(base, up, [0.012, 0.024], [0.01, 0.018], earC); S.cap(up, add(up, [sx * 0.005, -0.004, 0.035]), [0.009, 0.014], [0.009, 0.012], earC); }
    else S.cap(base, add(base, [sx * 0.012, D.earL, -0.015 + (running ? -0.03 : 0)]), [0.012, 0.024], [0.008, 0.008], earC);
  }
  if (poodle) S.ell(add(headC, [0, skH * 0.95, -skL * 0.05]), [skW * 1.05, skH * 0.75, skL * 0.5], A(0.56));
  // ---- tail
  const tailC = (t, v, s) => coat('tail', t, v, s);
  const tr = D.tailR, tl = D.tailL;
  const t0 = add(rump, [0, loinD * (lying || sitting ? 0.1 : 0.3), -loinD * 0.3]);
  if (lying || sitting) {
    // lying on the ground, curled round to one side
    const side = sitting ? 1 : -1;
    const t1 = [side * bodyW * 0.8, tr * 1.1, t0[2] - tl * 0.45], t2 = [side * (bodyW * 1.3), tr * 1.1, t0[2] + (D.tail === 'stub' ? -tl * 0.4 : tl * 0.15)];
    const tg = add(t0, [0, -t0[1] + tr * 1.6, -0.01]);
    if (D.tail === 'stub') S.cap(t0, add(t0, [0, 0, -tl]), [tr, tr], [tr, tr], tailC);
    else { S.cap(tg, t1, [tr, tr], [tr, tr], (t, v, s) => tailC(t * 0.5, v, s)); S.cap(t1, t2, [tr, tr], [tr * 0.8, tr * 0.8], (t, v, s) => tailC(0.5 + t * 0.5, v, s)); if (D.tail === 'pom') S.ell(t2, [0.03, 0.03, 0.03], A(0.56)); }
  } else {
    let ang = { up: 1.2, feather: 0.15, brush: -0.9, stub: 0.6, pom: 1.1, low: -0.25, curl: 1.3 }[D.tail] ?? 0.4;
    if (running) ang = Math.min(ang, 0.3);
    const wag = frame === 'wag' ? 0.5 : frame === 'stand' ? -0.25 : 0;
    const dir = [Math.sin(wag) * Math.cos(ang), Math.sin(ang), -Math.cos(wag) * Math.cos(ang)];
    const t1 = add(t0, dir.map((q) => q * tl));
    if (D.tail === 'curl') {
      const mid = add(t0, dir.map((q) => q * tl * 0.6));
      S.cap(t0, mid, [tr, tr], [tr, tr], (t, v, s) => tailC(t * 0.6, v, s));
      S.cap(mid, add(mid, [dir[0] * 0.05, 0.02, 0.07]), [tr, tr], [tr * 0.8, tr * 0.8], (t, v, s) => tailC(0.6 + t * 0.4, v, s));
    } else if (D.tail === 'brush') {
      const low = add(t0, [dir[0] * tl * 0.5, -tl * 0.55, -tl * 0.35]);
      S.cap(t0, low, [tr, tr], [tr * 1.1, tr * 1.1], (t, v, s) => tailC(t * 0.7, v, s));
      S.cap(low, add(low, [dir[0] * 0.05, 0.06, -0.06]), [tr * 1.1, tr * 1.1], [tr * 0.7, tr * 0.7], (t, v, s) => tailC(0.7 + t * 0.3, v, s));
    } else S.cap(t0, t1, [tr, tr], [tr * 0.75, tr * 0.75], tailC);
    if (D.tail === 'feather') S.cap(add(t0, [0, -tr, -0.02]), add(t1, [0, -tr * 2, 0.02]), [tr * 0.6, tr * 1.4], [tr * 0.3, tr * 0.6], A(0.44));
    if (D.tail === 'pom') S.ell(t1, [0.032, 0.032, 0.032], A(0.56));
  }
}

export const DOG_PROPS = {};
for (const [breed, D] of Object.entries(DOG_BREEDS)) DOG_PROPS[breed] = defineFrames(`dog_${breed}`, DOG_FRAMES, 32, (S, f) => drawDog(S, D, f));

// ================================================================ CATS
// coats: 'tabby' (A ground, B stripes — grey, brown or ginger tabbies), 'solid' (A coat, B bib, muzzle
// and socks — black, tuxedo, grey-and-white), 'calico' (white with A and B patches)
export const CAT_COATS = ['tabby', 'solid', 'calico'];
export const CAT_FRAMES = ['stand', 'walk_a', 'walk_b', 'sit', 'loaf', 'curl', 'crouch'];
const CAT = { legH: 0.105, bodyL: 0.27, chestD: 0.12, loinD: 0.115, bodyW: 0.052, neckL: 0.05, legR: 0.017, tailL: 0.27, tailR: 0.014, stride: 0.04 };
const CAT_EYE = '#6a7a2a';

function catCoat(kind) {
  if (kind === 'tabby') return (part, t, v) => {
    const band = Math.sin(t * Math.PI * 9) > 0.35;
    if (part === 'body') return v < -0.55 ? A(0.62) : band && v > -0.45 ? B(0.5) : A(0.5);
    if (part === 'tail') return Math.sin(t * Math.PI * 7) > 0.2 || t > 0.9 ? B(0.5) : A(0.5);
    if (part === 'leg') return Math.sin(t * Math.PI * 5) > 0.5 ? B(0.5) : A(0.5);
    if (part === 'head') return v > 0.55 && Math.abs(t) < 0.5 ? B(0.5) : A(0.5);
    if (part === 'muzzle') return A(0.62);
    if (part === 'ear') return A(0.45);
    return A(0.5);
  };
  if (kind === 'calico') return (part, t, v, s) => {
    const p = Math.sin(t * 7.3 + s * 2.1) + Math.cos(v * 3.1 - t * 2.3);
    if (part === 'body') return v < -0.35 ? WHITE : p > 0.9 ? A(0.5) : p < -0.5 ? B(0.5) : WHITE;
    if (part === 'head') return v < -0.2 ? WHITE : s > 0.1 ? A(0.5) : B(0.5);
    if (part === 'ear') return s > 0 ? A(0.45) : B(0.45);
    if (part === 'tail') return t < 0.5 ? A(0.5) : B(0.5);
    if (part === 'leg' || part === 'foot' || part === 'muzzle') return WHITE;
    return WHITE;
  };
  return (part, t, v) => {
    if (part === 'body') return t > 0.82 && v < 0.1 ? B(0.5) : A(0.5);
    if (part === 'foot') return B(0.5);
    if (part === 'muzzle') return v < 0.2 ? B(0.5) : A(0.5);
    if (part === 'ear') return A(0.45);
    return A(0.5);
  };
}

function drawCat(S, kind, frame) {
  const coat = catCoat(kind), C = CAT;
  const { legH, bodyL, chestD, loinD, bodyW, legR, tailR, tailL } = C;
  const half = bodyL / 2;
  const body = (t, v, s) => coat('body', t, v, s), legC = (t) => coat('leg', t, 0, 0), foot = coat('foot', 1, 0, 0);
  const tail = (t, v, s) => coat('tail', t, v, s);
  const paw = (p) => S.ell(p, [legR * 1.1, legR * 0.9, legR * 1.3], foot);
  let chest, rump, headC, headTilt = 0, eyesShut = false;
  if (frame === 'sit') {
    chest = [0, legH + chestD * 0.55, half * 0.45];
    rump = [0, loinD * 0.6, chest[2] - bodyL * 0.5];
    S.cap(rump, chest, [bodyW * 1.05, loinD * 0.62], [bodyW, chestD * 0.5], body);
    for (const sx of [1, -1]) {
      const x = sx * (bodyW - legR * 0.4);
      S.cap([x, chest[1], chest[2] + 0.01], [x, legR, chest[2] + 0.02], [legR * 1.1, legR * 1.1], [legR, legR], legC);
      paw([x, legR * 0.8, chest[2] + 0.03]);
      S.ell([sx * bodyW * 0.75, loinD * 0.55, rump[2] + 0.03], [bodyW * 0.5, loinD * 0.55, loinD * 0.62], body);
      paw([sx * bodyW * 0.7, legR * 0.8, rump[2] + loinD * 0.7]);
    }
    headC = [0, chest[1] + chestD * 0.62 + 0.035, chest[2] + 0.02];
    // tail wrapped round the front paws
    const t0 = [0, tailR * 1.2, rump[2] - loinD * 0.45], t1 = [bodyW * 1.6, tailR * 1.2, rump[2]], t2 = [bodyW * 1.2, tailR * 1.2, chest[2] + 0.06], t3 = [-bodyW * 0.3, tailR * 1.2, chest[2] + 0.07];
    S.cap(t0, t1, [tailR, tailR], [tailR, tailR], (t, v, s) => tail(t * 0.3, v, s));
    S.cap(t1, t2, [tailR, tailR], [tailR, tailR], (t, v, s) => tail(0.3 + t * 0.4, v, s));
    S.cap(t2, t3, [tailR, tailR], [tailR * 0.9, tailR * 0.9], (t, v, s) => tail(0.7 + t * 0.3, v, s));
  } else if (frame === 'loaf' || frame === 'curl') {
    const curl = frame === 'curl';
    chest = [0, chestD * 0.5, half * (curl ? 0.55 : 0.85)];
    rump = [0, loinD * 0.5, -half * (curl ? 0.55 : 0.85)];
    S.cap(rump, chest, [bodyW * 1.2, loinD * 0.55], [bodyW * 1.15, chestD * 0.52], body);
    if (curl) {
      // a ball: haunch swung round to one side, head tucked in at the front on the other
      S.ell([bodyW * 0.9, loinD * 0.45, rump[2] + 0.04], [bodyW * 0.8, loinD * 0.45, loinD * 0.6], body);
      headC = [-bodyW * 0.5, chestD * 0.42, chest[2] + 0.035]; headTilt = 1; eyesShut = true;
      const t0 = [0, tailR * 1.3, rump[2] - loinD * 0.4], t1 = [bodyW * 1.9, tailR * 1.3, rump[2] + 0.06], t2 = [bodyW * 1.4, tailR * 1.4, chest[2] + 0.07], t3 = [-bodyW * 0.9, tailR * 1.8, chest[2] + 0.1];
      S.cap(t0, t1, [tailR, tailR], [tailR, tailR], (t, v, s) => tail(t * 0.3, v, s));
      S.cap(t1, t2, [tailR, tailR], [tailR, tailR], (t, v, s) => tail(0.3 + t * 0.4, v, s));
      S.cap(t2, t3, [tailR, tailR], [tailR, tailR], (t, v, s) => tail(0.7 + t * 0.3, v, s));
    } else {
      for (const sx of [1, -1]) paw([sx * bodyW * 0.55, legR * 0.8, chest[2] + chestD * 0.42]);
      headC = [0, chestD + 0.035, chest[2] + 0.03];
      const t0 = [0, tailR * 1.2, rump[2] - loinD * 0.45], t1 = [bodyW * 1.45, tailR * 1.2, rump[2] + 0.02], t2 = [bodyW * 1.35, tailR * 1.2, chest[2] - 0.02];
      S.cap(t0, t1, [tailR, tailR], [tailR, tailR], (t, v, s) => tail(t * 0.4, v, s));
      S.cap(t1, t2, [tailR, tailR], [tailR * 0.9, tailR * 0.9], (t, v, s) => tail(0.4 + t * 0.6, v, s));
    }
  } else {
    // stand / walk / crouch (stalking: low, head forward, tail straight back)
    const crouch = frame === 'crouch';
    const lh = crouch ? legH * 0.55 : legH;
    chest = [0, lh + chestD * 0.5, half];
    rump = [0, (crouch ? legH * 0.75 : legH) + loinD * 0.5, -half];
    S.cap(rump, chest, [bodyW, loinD * 0.5], [bodyW * 0.95, chestD * 0.5], body);
    let sw = [0, 0, 0, 0];
    if (frame === 'walk_a') sw = [C.stride, -C.stride, -C.stride, C.stride];
    if (frame === 'walk_b') sw = [-C.stride, C.stride, C.stride, -C.stride];
    [[1, half - legR, 0], [-1, half - legR, 1], [1, -half + legR * 1.5, 2], [-1, -half + legR * 1.5, 3]].forEach(([sx, z, k]) => {
      const front = k < 2, x = sx * (bodyW - legR * 0.4);
      const top = [x, front ? chest[1] : rump[1], z];
      const f = [x, legR * 0.9 + (sw[k] > 0 ? legR * 0.6 : 0), z + sw[k] + (crouch && front ? 0.04 : 0)];
      if (front) {
        if (crouch) { const el = [x, legR * 1.6, z - 0.02]; S.cap(top, el, [legR * 1.1, legR * 1.1], [legR, legR], legC); S.cap(el, f, [legR, legR], [legR, legR], legC); }
        else S.cap(top, f, [legR * 1.15, legR * 1.2], [legR, legR], legC);
      } else {
        const hock = [x, legH * 0.4, z - 0.035 + sw[k] * 0.5];
        S.ell(add(top, [0, -loinD * 0.15, 0.01]), [legR * 1.8, loinD * 0.42, loinD * 0.45], body);
        S.cap(top, hock, [legR * 1.3, legR * 1.4], [legR, legR], legC);
        S.cap(hock, f, [legR, legR], [legR * 0.9, legR * 0.9], legC);
      }
      paw(add(f, [0, -legR * 0.1, legR * 0.35]));
    });
    headC = crouch ? [0, chest[1] + 0.01, chest[2] + 0.07] : [0, chest[1] + chestD * 0.5 + 0.03, chest[2] + 0.045];
    // tail: a raised question mark when walking, lower when standing, straight back when stalking
    const t0 = add(rump, [0, loinD * 0.3, -loinD * 0.4]);
    if (crouch) S.cap(t0, add(t0, [0.02, -0.02, -tailL]), [tailR, tailR], [tailR * 0.9, tailR * 0.9], tail);
    else {
      const up = frame === 'stand' ? 0.55 : 1.15;
      const t1 = add(t0, [0, Math.sin(up) * tailL * 0.8, -Math.cos(up) * tailL * 0.8]);
      S.cap(t0, t1, [tailR, tailR], [tailR, tailR], (t, v, s) => tail(t * 0.8, v, s));
      S.cap(t1, add(t1, [0, 0.02, 0.05]), [tailR, tailR], [tailR * 0.9, tailR * 0.9], (t, v, s) => tail(0.8 + t * 0.2, v, s));
    }
  }
  // head: round skull, small muzzle, triangular ears, almond eyes
  const hr = [0.054, 0.048, 0.048];
  S.ell(headC, hr, (nx, ny, nz) => coat('head', nx, ny, nx));
  const mz = add(headC, [0, -hr[1] * 0.35, hr[2] * 0.75]);
  S.ell(mz, [0.022, 0.017, 0.017], (nx, ny) => coat('muzzle', 0, ny, 0));
  S.dot(add(mz, [0, 0.004, 0.016]), PINK);
  for (const sx of [1, -1]) {
    const e0 = add(headC, [sx * hr[0] * 0.62, hr[1] * 0.62, -0.004]);
    S.cap(e0, add(e0, [sx * 0.006, 0.036, -0.002]), [0.022, 0.02], [0.006, 0.006], (t, v, s) => coat('ear', t, v, sx));
  }
  S.dot([Math.max(hr[0] * 0.55, 1.05 / S.V), headC[1] + hr[1] * 0.2, headC[2] + hr[2] * 0.72], eyesShut ? coat('head', 0, 0, 0) : CAT_EYE, true);
  {
  }
  void headTilt;
}

export const CAT_PROPS = {};
for (const kind of CAT_COATS) CAT_PROPS[kind] = defineFrames(`cat_${kind}`, CAT_FRAMES, 40, (S, f) => drawCat(S, kind, f));

// ================================================================ HORSES (1/16 m)
// A heavy draught horse in collar-and-hames harness for the rag wagon (coat = tint A, mane and tail =
// tint B, white feathered fetlocks), and a saddled police mount. Frames: stand, walk_a, walk_b.
export const HORSE_FRAMES = ['stand', 'walk_a', 'walk_b'];
const HORSE = { legH: 0.84, bodyL: 1.42, chestD: 0.76, loinD: 0.7, bodyW: 0.31 };

function drawHorse(S, kind, frame) {
  const { legH, bodyL, chestD, loinD, bodyW } = HORSE;
  const half = bodyL / 2, draft = kind === 'draft';
  const coat = A(0.5), dark = A(0.4), mane = B(0.5), hoof = '#2a2622', feather = draft ? '#e4dccb' : A(0.42);
  const chest = [0, legH + chestD * 0.5, half], rump = [0, legH + loinD * 0.5, -half];
  S.cap(rump, chest, [bodyW * 0.95, loinD * 0.5], [bodyW * 0.92, chestD * 0.5], coat);
  S.ell([0, legH + loinD * 0.56, -half + 0.12], [bodyW, loinD * 0.56, 0.42], coat);        // hindquarters
  S.ell([0, legH + chestD * 0.5, half - 0.08], [bodyW * 0.95, chestD * 0.52, 0.34], coat); // shoulders & chest
  // legs (stride: diagonal pairs)
  const st = 0.2;
  let sw = [0, 0, 0, 0];
  if (frame === 'walk_a') sw = [st, -st * 0.6, -st, st * 0.6];
  if (frame === 'walk_b') sw = [-st * 0.6, st, st * 0.6, -st];
  [[1, half - 0.1, 0], [-1, half - 0.1, 1], [1, -half + 0.16, 2], [-1, -half + 0.16, 3]].forEach(([sx, z, k]) => {
    const front = k < 2, x = sx * (bodyW - 0.1), lift = sw[k] > 0.1 ? 1 : 0;
    const fz = z + sw[k];
    if (front) {
      const top = [x, legH + 0.22, z], knee = [x, 0.46 + lift * 0.06, z + sw[k] * 0.5];
      const fet = [x, 0.14 + lift * 0.1, fz + (lift ? -0.05 : 0.02)];
      S.cap(top, knee, [0.085, 0.1], [0.06, 0.065], coat);
      S.cap(knee, fet, [0.055, 0.055], [0.05, 0.05], dark);
      S.cap(fet, add(fet, [0, -0.08, 0.04]), [draft ? 0.085 : 0.055, draft ? 0.08 : 0.05], [0.07, 0.06], feather);
      S.box([x - 0.07, lift * 0.1, fz - 0.02], [0.14, 0.07, 0.15], hoof);
    } else {
      const top = [x, legH + 0.3, z], hock = [x, 0.52 + lift * 0.05, z - 0.16 + sw[k] * 0.4];
      const fet = [x, 0.14 + lift * 0.1, fz - 0.06];
      S.ell([x * 0.95, legH + 0.2, z + 0.02], [0.13, 0.3, 0.2], coat);                     // gaskin
      S.cap(top, hock, [0.1, 0.12], [0.065, 0.07], coat);
      S.cap(hock, fet, [0.055, 0.055], [0.05, 0.05], dark);
      S.cap(fet, add(fet, [0, -0.08, 0.04]), [draft ? 0.085 : 0.055, draft ? 0.08 : 0.05], [0.07, 0.06], feather);
      S.box([x - 0.07, lift * 0.1, fz - 0.04], [0.14, 0.07, 0.15], hoof);
    }
  });
  // neck, head, ears, mane
  const n0 = [0, legH + chestD * 0.62, half - 0.02], n1 = [0, legH + chestD + 0.42, half + 0.42];
  S.cap(n0, n1, [0.15, 0.26], [0.1, 0.15], coat);
  const poll = add(n1, [0, 0.06, 0.02]), muzzle = add(poll, [0, -0.44, 0.34]);
  S.cap(poll, muzzle, [0.1, 0.12], [0.075, 0.09], coat);
  S.ell(add(muzzle, [0, -0.01, 0.02]), [0.08, 0.085, 0.08], dark);
  S.dot(add(muzzle, [0.045, 0.0, 0.07]), '#1a1614', true);
  S.dot(add(poll, [0.08, -0.08, 0.06]), '#141210', true);                                   // eyes
  for (const sx of [1, -1]) S.cap(add(poll, [sx * 0.05, 0.06, -0.02]), add(poll, [sx * 0.07, 0.2, -0.05]), [0.03, 0.035], [0.015, 0.015], coat);
  S.cap(add(n0, [0, chestD * 0.42, -0.1]), add(n1, [0, 0.13, -0.05]), [0.035, 0.05], [0.03, 0.05], mane);
  S.cap(add(poll, [0, 0.05, 0.02]), add(poll, [0, -0.03, 0.12]), [0.035, 0.03], [0.03, 0.02], mane); // forelock
  // tail
  const t0 = [0, legH + loinD * 0.9, -half - 0.24], t1 = [0, legH + loinD * 0.4, -half - 0.38], t2 = [0.02, 0.5, -half - 0.36];
  S.cap(t0, t1, [0.06, 0.07], [0.07, 0.09], mane);
  S.cap(t1, t2, [0.07, 0.09], [0.05, 0.08], mane);
  // bridle
  const strap = draft ? LEATHER : LEATHER2;
  S.cap(add(poll, [0, -0.1, 0.07]), add(poll, [0, -0.1, 0.09]), [0.115, 0.13], [0.115, 0.13], strap, false);          // browband / cheek
  S.cap(add(muzzle, [0, 0.03, -0.06]), add(muzzle, [0, 0.03, -0.03]), [0.09, 0.1], [0.09, 0.1], draft ? strap : '#e8e2d4', false); // noseband
  S.dot(add(muzzle, [0.085, -0.05, -0.04]), BRASS, true);
  if (draft) {
    S.box([0.1, poll[1] - 0.16, poll[2] + 0.0], [0.03, 0.12, 0.12], INK); S.box([-0.13, poll[1] - 0.16, poll[2] + 0.0], [0.03, 0.12, 0.12], INK); // blinkers
    // collar & hames round the base of the neck
    const c0 = add(n0, [0, 0.06, 0.06]), c1 = add(n0, [0, 0.16, 0.2]);
    S.cap(c0, c1, [0.2, 0.34], [0.19, 0.32], LEATHER, false);
    S.cap(add(c0, [0, 0.02, 0.03]), add(c1, [0, 0.0, -0.02]), [0.21, 0.35], [0.2, 0.33], '#2e1e14', false);
    for (const sx of [1, -1]) { S.cap(add(n0, [sx * 0.2, -0.08, 0.12]), add(n1, [sx * 0.1, -0.12, -0.12]), [0.02, 0.02], [0.02, 0.02], BRASS); S.dot(add(n1, [sx * 0.09, -0.06, -0.15]), BRASS); }
    // back pad and belly band, traces running back to the wagon, breeching round the quarters
    S.cap([0, legH + chestD * 0.5, 0.18], [0, legH + chestD * 0.5, 0.28], [bodyW * 1.04, chestD * 0.53], [bodyW * 1.04, chestD * 0.53], LEATHER, false);
    S.box([-0.16, legH + chestD + 0.0, 0.14], [0.32, 0.06, 0.18], '#2a1c12');
    for (const sx of [1, -1]) S.dot([sx * 0.1, legH + chestD + 0.08, 0.22], BRASS);
    for (const sx of [1, -1]) S.cap([sx * (bodyW + 0.02), legH + chestD * 0.42, half + 0.08], [sx * (bodyW + 0.05), legH + chestD * 0.3, -half - 0.5], [0.02, 0.03], [0.02, 0.03], '#241810');
    S.cap([0, legH + loinD * 0.45, -half + 0.02], [0, legH + loinD * 0.47, -half + 0.08], [bodyW * 1.03, loinD * 0.52], [bodyW * 1.03, loinD * 0.52], LEATHER, false);
  } else {
    // saddle on a blue cloth with a gold border, stirrups, breastplate
    S.box([-bodyW - 0.03, legH + chestD * 0.62, -0.28], [bodyW * 2 + 0.06, chestD * 0.4, 0.62], '#2a3a6a');
    S.box([-bodyW - 0.035, legH + chestD * 0.6, -0.29], [bodyW * 2 + 0.07, 0.04, 0.64], GILT);
    S.ell([0, legH + chestD + 0.02, 0.02], [0.2, 0.08, 0.3], LEATHER2);
    S.ell([0, legH + chestD + 0.07, 0.22], [0.1, 0.07, 0.07], LEATHER2);   // pommel
    S.ell([0, legH + chestD + 0.07, -0.2], [0.14, 0.07, 0.06], LEATHER2);  // cantle
    for (const sx of [1, -1]) { S.cap([sx * (bodyW + 0.05), legH + chestD * 0.95, 0.02], [sx * (bodyW + 0.06), legH + 0.12, 0.02], [0.012, 0.015], [0.012, 0.015], LEATHER); S.box([sx * (bodyW + 0.06) - 0.05, legH + 0.06, -0.03], [0.1, 0.05, 0.1], '#9a9a9a'); }
    S.cap([bodyW, legH + chestD * 0.7, half - 0.15], [-bodyW, legH + chestD * 0.7, half - 0.15], [0.03, 0.03], [0.03, 0.03], LEATHER2);
    S.cap([0, legH + chestD * 0.45, half + 0.3], [0, legH + chestD * 0.75, half + 0.26], [0.2, 0.03], [0.17, 0.03], LEATHER2, false);
  }
}
export const HORSE_PROPS = {
  draft: defineFrames('horse_draft', HORSE_FRAMES, 16, (S, f) => drawHorse(S, 'draft', f), { cat: 'far' }),
  mount: defineFrames('horse_mount', HORSE_FRAMES, 16, (S, f) => drawHorse(S, 'mount', f), { cat: 'far' }),
};

// ================================================================ THE RAG WAGON (1/16 m)
// Sal Pignatelli's four-wheeled junk wagon: high sides, a driver's box, shafts reaching 3.1 m forward
// for the horse, and a load of rags, sacks, bottles, a washtub and an iron bedstead. Origin: between
// the axles on the ground; the horse's body centre goes 2.75 m ahead (WAGON_HITCH).
export const WAGON_HITCH = 2.75;
function wheel(S, x, zc, r, spokes = 8) {
  const V = S.V, wood = '#5a3a22', rim = IRON;
  for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; S.dot([x, r + Math.sin(a) * (r - 0.03), zc + Math.cos(a) * (r - 0.03)], rim); S.dot([x, r + Math.sin(a) * (r - 0.09), zc + Math.cos(a) * (r - 0.09)], wood); }
  for (let k = 0; k < spokes; k++) { const a = (k + 0.5) / spokes * Math.PI * 2; for (let d = 0.06; d < r - 0.09; d += 0.5 / V) S.dot([x, r + Math.sin(a) * d, zc + Math.cos(a) * d], wood); }
  S.cap([x - 0.05, r, zc], [x + 0.05, r, zc], [0.06, 0.06], [0.06, 0.06], '#3a2a1c');
}
defineFrames('wagon', ['rag'], 16, (S) => {
  const board = '#7a5a3a', board2 = '#6a4a2e', green = '#3a5a3a', red = '#8a2a1e';
  const zb = -1.25, ze = 1.15, w = 0.66;
  // chassis, floor, sides (green with red trim), tailboard
  S.box([-w, 0.72, zb], [w * 2, 0.08, ze - zb], board2);
  for (const sx of [1, -1]) { S.box([sx > 0 ? w - 0.06 : -w, 0.8, zb], [0.06, 0.4, ze - zb], green); S.box([sx > 0 ? w - 0.07 : -w - 0.01, 1.18, zb], [0.08, 0.05, ze - zb], red); for (let z = zb + 0.05; z < ze; z += 0.6) S.box([sx > 0 ? w - 0.02 : -w - 0.04, 0.72, z], [0.06, 0.52, 0.06], board2); }
  S.box([-w, 0.8, zb], [w * 2, 0.4, 0.06], green); S.box([-w, 1.18, zb - 0.01], [w * 2, 0.05, 0.08], red);
  if (S.m.textBack) S.m.textBack('RAGS', Math.round(S.ox), Math.round((0.86) * S.V), Math.round(S.oz + zb * S.V) - 1, '#e8d8a8', { align: 'center' });
  // driver's box and footboard
  S.box([-w, 0.8, ze - 0.05], [w * 2, 0.55, 0.3], board);
  S.box([-w + 0.02, 1.32, ze - 0.12], [w * 2 - 0.04, 0.06, 0.42], '#4a3020');
  S.box([-w + 0.02, 1.38, ze - 0.14], [w * 2 - 0.04, 0.3, 0.05], '#4a3020');
  S.box([-w, 0.8, ze + 0.25], [w * 2, 0.06, 0.35], board2);
  S.box([-w, 0.86, ze + 0.56], [w * 2, 0.34, 0.05], board2);
  // axles, wheels, shafts
  S.box([-0.8, 0.52, -0.83], [1.6, 0.06, 0.06], IRON); S.box([-0.8, 0.4, 0.72], [1.6, 0.06, 0.06], IRON);
  for (const sx of [1, -1]) { wheel(S, sx * 0.76, -0.8, 0.55); wheel(S, sx * 0.74, 0.75, 0.42); }
  for (const sx of [1, -1]) S.cap([sx * 0.5, 0.78, 1.2], [sx * 0.46, 1.05, 3.1], [0.045, 0.045], [0.04, 0.04], '#8a6a44');
  S.cap([-0.5, 0.78, 1.25], [0.5, 0.78, 1.25], [0.04, 0.04], [0.04, 0.04], '#5a3a22');
  // the load
  const rags = ['#8a3a3a', '#3a4a6a', '#c8b890', '#6a6a4a', '#a8783a', '#5a3a5a', '#d8d0c0'];
  rags.forEach((c, i) => S.ell([((i * 37) % 9 - 4) * 0.12, 0.95 + (i % 3) * 0.08, -0.9 + i * 0.2], [0.22, 0.14, 0.2], c));
  for (const [x, z] of [[0.35, -0.2], [-0.35, 0.25], [0.3, 0.55]]) S.ell([x, 1.02, z], [0.2, 0.24, 0.18], '#a08a60');
  S.box([-0.3, 0.8, 0.45], [0.36, 0.3, 0.3], '#6a5030');
  for (let i = 0; i < 6; i++) S.cap([-0.26 + (i % 3) * 0.12, 1.08, 0.5 + Math.floor(i / 3) * 0.12], [-0.26 + (i % 3) * 0.12, 1.2, 0.5 + Math.floor(i / 3) * 0.12], [0.03, 0.03], [0.02, 0.02], i % 2 ? '#2a5a3a' : '#6a4a1e');
  S.cap([0.2, 0.82, -0.75], [0.2, 1.12, -0.75], [0.22, 0.22], [0.26, 0.26], '#9aa0a4');                   // washtub
  S.box([-0.55, 0.82, -1.12], [1.1, 0.8, 0.05], IRON);                                               // bedstead head
  for (let x = -0.45; x < 0.5; x += 0.15) S.box([x, 0.82, -1.12], [0.03, 0.7, 0.04], '#4a4640');
  S.box([-0.55, 1.58, -1.13], [1.1, 0.05, 0.07], BRASS);
  S.box([-0.2, 1.1, -0.35], [0.36, 0.05, 0.36], '#7a5a3a'); for (const [dx, dz] of [[-0.18, -0.33], [0.13, -0.33], [-0.18, -0.02], [0.13, -0.02]]) S.box([dx, 1.15, dz], [0.04, 0.35, 0.04], '#7a5a3a'); // upturned chair
  // the ragman's bell on its bracket
  S.box([w - 0.04, 1.2, ze - 0.02], [0.04, 0.5, 0.04], IRON); S.box([w - 0.04, 1.66, ze - 0.02], [0.14, 0.04, 0.04], IRON);
  S.ell([w + 0.08, 1.58, ze], [0.05, 0.07, 0.05], BRASS);
}, { cat: 'far' });

// ================================================================ SQUIRRELS (1/32 m)
export const SQUIRREL_FRAMES = ['sit', 'run_a', 'run_b'];
defineFrames('squirrel', SQUIRREL_FRAMES, 48, (S, f) => {
  const g = '#8a8580', g2 = '#6f6a66', belly = '#d8d0c4', tl = '#9a948c', fringe = '#c8c2b8', acorn = '#8a5a2a';
  const tail = (pts) => { for (let i = 0; i < pts.length - 1; i++) { S.cap(pts[i], pts[i + 1], [0.034, 0.04], [0.04, 0.046], tl); } for (let i = 0; i < pts.length - 1; i++) S.cap(add(pts[i], [0, 0.016, -0.01]), add(pts[i + 1], [0, 0.02, -0.01]), [0.02, 0.026], [0.024, 0.028], fringe); };
  let head;
  if (f === 'sit') {
    S.ell([0, 0.07, -0.005], [0.04, 0.065, 0.042], (nx, ny, nz) => (nz > 0.45 && ny < 0.4 ? belly : g));
    for (const sx of [1, -1]) { S.ell([sx * 0.03, 0.03, 0.0], [0.022, 0.03, 0.035], g2); S.cap([sx * 0.025, 0.008, 0.01], [sx * 0.025, 0.008, 0.05], [0.01, 0.008], [0.01, 0.008], g2); }
    head = [0, 0.15, 0.02];
    S.cap([0.015, 0.1, 0.04], [0.008, 0.11, 0.06], [0.009, 0.009], [0.008, 0.008], g2); S.cap([-0.015, 0.1, 0.04], [-0.008, 0.11, 0.06], [0.009, 0.009], [0.008, 0.008], g2);
    S.ell([0, 0.112, 0.068], [0.012, 0.014, 0.012], acorn);
    tail([[0, 0.02, -0.05], [0, 0.1, -0.1], [0, 0.19, -0.08], [0, 0.23, -0.03]]);
  } else {
    const stretched = f === 'run_a';
    if (stretched) {
      S.cap([0, 0.055, -0.07], [0, 0.06, 0.06], [0.034, 0.034], [0.03, 0.032], (t, v) => (v < -0.5 ? belly : g));
      for (const sx of [1, -1]) { S.cap([sx * 0.02, 0.04, 0.05], [sx * 0.018, 0.01, 0.12], [0.008, 0.008], [0.008, 0.008], g2); S.cap([sx * 0.025, 0.045, -0.06], [sx * 0.022, 0.01, -0.13], [0.012, 0.012], [0.01, 0.01], g2); }
      head = [0, 0.07, 0.1];
      tail([[0, 0.07, -0.09], [0, 0.11, -0.19], [0, 0.16, -0.25], [0, 0.2, -0.26]]);
    } else {
      S.cap([0, 0.05, -0.04], [0, 0.07, 0.04], [0.036, 0.04], [0.032, 0.036], (t, v) => (v < -0.5 ? belly : g));
      for (const sx of [1, -1]) { S.cap([sx * 0.02, 0.04, 0.04], [sx * 0.02, 0.008, 0.06], [0.008, 0.008], [0.008, 0.008], g2); S.ell([sx * 0.03, 0.03, -0.02], [0.02, 0.03, 0.035], g2); S.cap([sx * 0.028, 0.01, 0.0], [sx * 0.028, 0.008, 0.05], [0.009, 0.007], [0.009, 0.007], g2); }
      head = [0, 0.08, 0.075];
      tail([[0, 0.06, -0.05], [0, 0.14, -0.1], [0, 0.22, -0.08], [0, 0.25, -0.03]]);
    }
  }
  S.ell(head, [0.026, 0.026, 0.03], g);
  S.ell(add(head, [0, -0.008, 0.024]), [0.014, 0.013, 0.014], belly);
  S.dot(add(head, [0.034, 0.006, 0.01]), INK, true);
  for (const sx of [1, -1]) S.cap(add(head, [sx * 0.016, 0.02, -0.01]), add(head, [sx * 0.018, 0.04, -0.014]), [0.008, 0.008], [0.004, 0.004], g2);
});

// ================================================================ LEASH
// A 1 m strap along +z from its origin (the hand); the runtime scales it to the hand-to-collar distance
// and aims it with yaw/pitch.
defineProp('dog_leash', {
  size: [2, 2, 32], scale: 1 / 32, origin: [1, 1, 0], cat: 'exterior',
  build(m) { m.box(0, 0, 0, 2, 2, 32, '#6a2a1a'); m.box(0, 0, 30, 2, 2, 2, '#9a9a90'); },
});
