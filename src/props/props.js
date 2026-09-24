// Prop registry + instance store + distance-culled instanced rendering + colliders.
import * as THREE from 'three';
import { VS, PROP_VS } from '../core/config.js';
import { VoxModel, meshVoxModel, downsampleModel } from './voxModel.js';
import { hexToRgb } from '../core/util.js';

export const PROP_DEFS = new Map();

// def: { size:[sx,sy,sz], scale?, origin?, build(m), collide?: bool|[w,h,d], cat?: 'interior'|'exterior'|'far',
//        light?: {at:[x,y,z] metres, color:[r,g,b], radius, mode:'night'|'always'|'room'}, seat?: {...} }
export function defineProp(name, def) {
  if (PROP_DEFS.has(name)) throw new Error('duplicate prop ' + name);
  PROP_DEFS.set(name, def);
}

const CELL = 16;
const packRGB = (c) => { if (c === undefined || c === null) return 0xffffff; const a = hexToRgb(c); return (a[0] << 16) | (a[1] << 8) | a[2]; };

export class Props {
  constructor(ctx) {
    this.ctx = ctx;
    this.types = []; this.typeIndex = new Map();
    this.n = 0; this.cap = 16384;
    this._alloc(this.cap);
    this.dyn = [];
    this.meshes = [];
    this.lastCam = new THREE.Vector3(1e9, 0, 0);
    this.colliders = new Map(); // cell key -> [minx,miny,minz,maxx,maxy,maxz]*
    this.interactables = [];
    this.force = true;
  }
  _alloc(cap) {
    const copy = (old, T, k) => { const a = new T(cap * k); if (old) a.set(old.subarray(0, Math.min(old.length, cap * k))); return a; };
    this.tType = copy(this.tType, Int32Array, 1);
    this.tPos = copy(this.tPos, Float32Array, 3);
    this.tYaw = copy(this.tYaw, Float32Array, 1);
    this.tScale = copy(this.tScale, Float32Array, 1);
    this.tTintA = copy(this.tTintA, Uint32Array, 1);
    this.tTintB = copy(this.tTintB, Uint32Array, 1);
    this.tRoom = copy(this.tRoom, Uint16Array, 1);
    this.tCat = copy(this.tCat, Uint8Array, 1);
  }
  typeId(name) {
    let id = this.typeIndex.get(name);
    if (id !== undefined) return id;
    const def = PROP_DEFS.get(name);
    if (!def) throw new Error('Unknown prop type: ' + name);
    id = this.types.length;
    this.types.push({ name, def, geo: null, count: 0, dynCount: 0, mesh: null });
    this.typeIndex.set(name, id);
    return id;
  }
  geometry(t) {
    if (t.geo) return t.geo;
    const d = t.def;
    const [sx, sy, sz] = d.size;
    const m = new VoxModel(sx, sy, sz);
    d.build(m);
    const origin = d.origin || [sx / 2, 0, sz / 2];
    t.geo = meshVoxModel(m, d.scale || PROP_VS, origin);
    t.model = m;
    return t.geo;
  }
  // the distant version: half resolution (small props keep their full geometry)
  geometryLod(t) {
    if (t.geoLod) return t.geoLod;
    this.geometry(t);
    const m = t.model, d = t.def;
    const origin = d.origin || [m.sx / 2, 0, m.sz / 2];
    const big = Math.max(m.sx, m.sy, m.sz) >= 10;
    t.geoLod = big ? meshVoxModel(downsampleModel(m), (d.scale || PROP_VS) * 2, origin.map((v) => v / 2)) : t.geo;
    t.model = null; // (only needed once)
    return t.geoLod;
  }

  // Add a static prop at world metres. yaw rotates the model's +z front.
  add(type, x, y, z, yaw = 0, o = {}) {
    if (!PROP_DEFS.has(type)) { this._missing = this._missing || new Set(); if (!this._missing.has(type)) { this._missing.add(type); console.warn('missing prop type:', type); } return -1; }
    const tid = this.typeId(type);
    if (this.n >= this.cap) { this.cap *= 2; this._alloc(this.cap); }
    const i = this.n++;
    this.tType[i] = tid;
    this.tPos[i * 3] = x; this.tPos[i * 3 + 1] = y; this.tPos[i * 3 + 2] = z;
    this.tYaw[i] = yaw; this.tScale[i] = o.scale ?? 1;
    this.tTintA[i] = packRGB(o.tint ?? o.tintA);
    this.tTintB[i] = packRGB(o.tint2 ?? o.tintB);
    this.tRoom[i] = o.room ?? 0xffff; // resolved at finalize
    this.tCat[i] = o.cat === 'far' ? 2 : o.cat === 'exterior' ? 1 : o.cat === 'interior' ? 0 : 255;
    this.types[tid].count++;
    if (o.interact) this.interactables.push({ i, x, y, z, ...o.interact });
    return i;
  }

  // Remove a static prop before finalize (it is kept in the arrays but never drawn or collided)
  remove(i) { if (i < 0 || i >= this.n || this.tCat[i] === 250) return; this.types[this.tType[i]].count--; this.tCat[i] = 250; }

  // Dynamic prop handle (moved every frame by its owner)
  addDynamic(type, o = {}) {
    if (!PROP_DEFS.has(type)) { this._missing = this._missing || new Set(); if (!this._missing.has(type)) { this._missing.add(type); console.warn('missing prop type:', type); } return { visible: false, dummy: true }; }
    const tid = this.typeId(type);
    const h = { tid, x: 0, y: -1000, z: 0, yaw: 0, pitch: 0, roll: 0, scale: o.scale ?? 1, tintA: packRGB(o.tint), tintB: packRGB(o.tint2), room: o.room ?? 0, visible: true, matrix: null };
    const t = this.types[tid];
    t.dynCount++;
    if (t.mesh && t.count + t.dynCount > t.cap) this._growMesh(t);
    this.dyn.push(h);
    return h;
  }

  finalize(world) {
    // rooms + categories + lights + colliders
    const lights = this.ctx.lights;
    for (let i = 0; i < this.n; i++) {
      if (this.tCat[i] === 250) continue;
      const t = this.types[this.tType[i]];
      const px = this.tPos[i * 3], py = this.tPos[i * 3 + 1], pz = this.tPos[i * 3 + 2];
      if (this.tRoom[i] === 0xffff) this.tRoom[i] = world.roomAt(Math.floor(px / VS), Math.floor((py + 0.3) / VS), Math.floor(pz / VS));
      if (this.tCat[i] === 255) this.tCat[i] = t.def.cat === 'far' ? 2 : t.def.cat === 'exterior' ? 1 : t.def.cat === 'interior' ? 0 : (this.tRoom[i] ? 0 : 1);
      if (t.def.light && lights) {
        const L = t.def.light, s = this.tScale[i];
        const c = Math.cos(this.tYaw[i]), sn = Math.sin(this.tYaw[i]);
        const lx = L.at[0] * s, lz = L.at[2] * s;
        lights.add(px + c * lx + sn * lz, py + L.at[1] * s, pz - sn * lx + c * lz, { color: L.color, radius: L.radius, mode: L.mode || 'night', room: this.tRoom[i] });
      }
      if (t.def.collide) this._addCollider(i, t);
    }
    // spatial cells
    this.cells = new Map();
    for (let i = 0; i < this.n; i++) {
      if (this.tCat[i] === 250) continue;
      const k = Math.floor(this.tPos[i * 3] / CELL) + ',' + Math.floor(this.tPos[i * 3 + 2] / CELL);
      let a = this.cells.get(k); if (!a) { a = []; this.cells.set(k, a); }
      a.push(i);
    }
    for (const [k, a] of this.cells) this.cells.set(k, Int32Array.from(a));
  }

  _addCollider(i, t) {
    const geo = this.geometry(t);
    let bb;
    if (Array.isArray(t.def.collide)) { const [w, h, d] = t.def.collide; bb = new THREE.Box3(new THREE.Vector3(-w / 2, 0, -d / 2), new THREE.Vector3(w / 2, h, d / 2)); }
    else bb = geo.boundingBox.clone();
    const s = this.tScale[i], yaw = this.tYaw[i];
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    let minx = 1e9, minz = 1e9, maxx = -1e9, maxz = -1e9;
    for (const cx of [bb.min.x, bb.max.x]) for (const cz of [bb.min.z, bb.max.z]) {
      const wx = (c * cx + sn * cz) * s, wz = (-sn * cx + c * cz) * s;
      minx = Math.min(minx, wx); maxx = Math.max(maxx, wx); minz = Math.min(minz, wz); maxz = Math.max(maxz, wz);
    }
    const px = this.tPos[i * 3], py = this.tPos[i * 3 + 1], pz = this.tPos[i * 3 + 2];
    const box = [px + minx, py + bb.min.y * s, pz + minz, px + maxx, py + bb.max.y * s, pz + maxz];
    this.addColliderBox(box);
  }
  addColliderBox(box) {
    const C = 4;
    for (let cx = Math.floor(box[0] / C); cx <= Math.floor(box[3] / C); cx++) for (let cz = Math.floor(box[2] / C); cz <= Math.floor(box[5] / C); cz++) {
      const k = cx + ',' + cz;
      let a = this.colliders.get(k); if (!a) { a = []; this.colliders.set(k, a); }
      a.push(box);
    }
  }
  collidersNear(x, z) { return this.colliders.get(Math.floor(x / 4) + ',' + Math.floor(z / 4)) || null; }

  attach(scene, material) {
    this.material = material;
    this.scene = scene;
    for (const t of this.types) this._makeMesh(t);
  }
  _instanced(geo0, cap, name) {
    const geo = geo0.clone();
    const ta = new THREE.InstancedBufferAttribute(new Uint8Array(cap * 4), 4, true);
    const tb = new THREE.InstancedBufferAttribute(new Uint8Array(cap * 4), 4, true);
    ta.setUsage(THREE.DynamicDrawUsage); tb.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iTintA', ta); geo.setAttribute('iTintB', tb);
    const mesh = new THREE.InstancedMesh(geo, this.material, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.name = name;
    mesh.userData.ta = ta; mesh.userData.tb = tb;
    this.scene.add(mesh);
    return mesh;
  }
  _makeMesh(t) {
    const cap = t.count + t.dynCount;
    if (cap === 0 || t.mesh) return;
    t.mesh = this._instanced(this.geometry(t), cap, 'prop:' + t.name);
    t.ta = t.mesh.userData.ta; t.tb = t.mesh.userData.tb;
    // far instances: half-resolution, drawn only toward the view, and kept out of the shadow pass
    t.lod = this._instanced(this.geometryLod(t), cap, 'propLod:' + t.name);
    t.lod.layers.set(2);   // drawn by the main camera; only the aerial view's shadow pass includes it
    t.nStatic = 0; t.nStaticLod = 0; t.cap = cap;
  }
  _growMesh(t) {
    const old = t.mesh;
    this.scene.remove(old);
    old.geometry.dispose();
    if (t.lod) { this.scene.remove(t.lod); t.lod.geometry.dispose(); t.lod = null; }
    t.mesh = null;
    const want = t.count + t.dynCount;
    t.dynCount = Math.max(t.dynCount, want * 2 - t.count); // over-allocate
    this._makeMesh(t);
    t.dynCount = want - t.count;
    this.force = true;
  }
  // late-added types (dynamic handles created after attach)
  ensureMeshes() { for (const t of this.types) if (!t.mesh && (t.count + t.dynCount) > 0) this._makeMesh(t); }

  _writeInst(t, slot, x, y, z, yaw, s, tintA, tintB, room, mesh = t.mesh) {
    const e = mesh.instanceMatrix.array, o = slot * 16;
    const c = Math.cos(yaw) * s, sn = Math.sin(yaw) * s;
    e[o] = c; e[o + 1] = 0; e[o + 2] = -sn; e[o + 3] = 0;
    e[o + 4] = 0; e[o + 5] = s; e[o + 6] = 0; e[o + 7] = 0;
    e[o + 8] = sn; e[o + 9] = 0; e[o + 10] = c; e[o + 11] = 0;
    e[o + 12] = x; e[o + 13] = y; e[o + 14] = z; e[o + 15] = 1;
    const a = mesh.userData.ta.array, b = mesh.userData.tb.array, q = slot * 4;
    a[q] = (tintA >> 16) & 255; a[q + 1] = (tintA >> 8) & 255; a[q + 2] = tintA & 255; a[q + 3] = room & 255;
    b[q] = (tintB >> 16) & 255; b[q + 1] = (tintB >> 8) & 255; b[q + 2] = tintB & 255; b[q + 3] = (room >> 8) & 255;
  }

  // radii: [interior, exterior, far]. fwd: camera forward (for culling distant instances behind you).
  // lodDist: beyond this, props use their half-resolution meshes (no shadows — it's the shadow range).
  update(cam, radii, forceRebuild = false, fwd = null, lodDist = 80) {
    const yaw = fwd ? Math.atan2(fwd.x, fwd.z) : 0;
    const steep = !fwd || fwd.y < -0.8; // looking nearly straight down: don't cull by direction
    let dyaw = Math.abs(yaw - (this.lastYaw ?? 1e9)); if (dyaw > Math.PI) dyaw = 2 * Math.PI - dyaw;
    const moved = cam.distanceToSquared(this.lastCam) > 16 || (!steep && dyaw > 0.3) || steep !== this.lastSteep;
    const lod2 = lodDist * lodDist;
    // half-angle kept around the view direction: the widest horizontal FOV plus a generous margin
    const cosKeep = Math.cos(Math.min(Math.PI, (this.hfov || 1.9) / 2 + 0.75));
    if (moved || forceRebuild || this.force) {
      this.force = false;
      this.lastCam.copy(cam); this.lastYaw = yaw; this.lastSteep = steep;
      for (const t of this.types) if (t.mesh) { t.nStatic = 0; t.nStaticLod = 0; }
      const R = Math.max(radii[0], radii[1], radii[2]);
      const c0 = Math.floor((cam.x - R) / CELL), c1 = Math.floor((cam.x + R) / CELL);
      const d0 = Math.floor((cam.z - R) / CELL), d1 = Math.floor((cam.z + R) / CELL);
      const r2 = radii.map((r) => r * r);
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      for (let cz = d0; cz <= d1; cz++) for (let cx = c0; cx <= c1; cx++) {
        const a = this.cells.get(cx + ',' + cz);
        if (!a) continue;
        // coarse reject
        const ccx = (cx + 0.5) * CELL - cam.x, ccz = (cz + 0.5) * CELL - cam.z;
        const cd2 = ccx * ccx + ccz * ccz;
        if (cd2 > (R + CELL) * (R + CELL)) continue;
        // whole cells well behind the camera and beyond the LOD distance are skipped outright
        if (!steep && cd2 > (lodDist + CELL * 1.5) ** 2 && (ccx * fx + ccz * fz) / Math.sqrt(cd2) < cosKeep - 0.2) continue;
        for (let k = 0; k < a.length; k++) {
          const i = a[k];
          const dx = this.tPos[i * 3] - cam.x, dy = this.tPos[i * 3 + 1] - cam.y, dz = this.tPos[i * 3 + 2] - cam.z;
          const d2 = dx * dx + dy * dy * 0.5 + dz * dz;
          if (d2 > r2[this.tCat[i]]) continue;
          const t = this.types[this.tType[i]];
          if (!t.mesh) continue;
          if (d2 < lod2) this._writeInst(t, t.nStatic++, this.tPos[i * 3], this.tPos[i * 3 + 1], this.tPos[i * 3 + 2], this.tYaw[i], this.tScale[i], this.tTintA[i], this.tTintB[i], this.tRoom[i]);
          else {
            if (!steep) { const h = Math.hypot(dx, dz); if ((dx * fx + dz * fz) < cosKeep * h) continue; }
            this._writeInst(t, t.nStaticLod++, this.tPos[i * 3], this.tPos[i * 3 + 1], this.tPos[i * 3 + 2], this.tYaw[i], this.tScale[i], this.tTintA[i], this.tTintB[i], this.tRoom[i], t.lod);
          }
        }
      }
      for (const t of this.types) if (t.mesh) { t.mesh.count = t.nStatic; t.lod.count = t.nStaticLod; t.fullUpload = true; }
    }
    // dynamic instances every frame (appended after the static ones)
    const m4 = this._m4 || (this._m4 = new THREE.Matrix4());
    const q = this._q || (this._q = new THREE.Quaternion());
    const eu = this._eu || (this._eu = new THREE.Euler(0, 0, 0, 'YXZ'));
    const pv = this._pv || (this._pv = new THREE.Vector3());
    const sv = this._sv || (this._sv = new THREE.Vector3());
    const touched = this._touched || (this._touched = new Set()); touched.clear();
    for (const t of this.types) if (t.mesh && (t.dynCount || t.fullUpload)) { t.mesh.count = t.nStatic; t.lod.count = t.nStaticLod; touched.add(t); }
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (const h of this.dyn) {
      if (!h.visible || h.dummy) continue;
      const t = this.types[h.tid];
      if (!t.mesh) continue;
      const dx = h.x - cam.x, dz = h.z - cam.z, d2 = dx * dx + dz * dz;
      let mesh = t.mesh;
      if (d2 > lod2) {
        if (!steep && (dx * fx + dz * fz) < cosKeep * Math.sqrt(d2)) continue;
        mesh = t.lod;
      }
      const slot = mesh.count++;
      const ud = mesh.userData;
      if (h.matrix || h.pitch || h.roll) {
        if (h.matrix) h.matrix.toArray(mesh.instanceMatrix.array, slot * 16);
        else { eu.set(h.pitch, h.yaw, h.roll, 'YXZ'); q.setFromEuler(eu); m4.compose(pv.set(h.x, h.y, h.z), q, sv.setScalar(h.scale)); m4.toArray(mesh.instanceMatrix.array, slot * 16); }
        const a = ud.ta.array, b = ud.tb.array, o = slot * 4;
        a[o] = (h.tintA >> 16) & 255; a[o + 1] = (h.tintA >> 8) & 255; a[o + 2] = h.tintA & 255; a[o + 3] = h.room & 255;
        b[o] = (h.tintB >> 16) & 255; b[o + 1] = (h.tintB >> 8) & 255; b[o + 2] = h.tintB & 255; b[o + 3] = (h.room >> 8) & 255;
      } else this._writeInst(t, slot, h.x, h.y, h.z, h.yaw, h.scale, h.tintA, h.tintB, h.room, mesh);
    }
    // upload: everything after a rebuild, otherwise just the dynamic tail of each buffer
    for (const t of touched) {
      for (const [mesh, n0] of [[t.mesh, t.nStatic], [t.lod, t.nStaticLod]]) {
        const ud = mesh.userData, im = mesh.instanceMatrix;
        if (t.fullUpload) { im.clearUpdateRanges(); ud.ta.clearUpdateRanges(); ud.tb.clearUpdateRanges(); }
        else {
          const n = mesh.count - n0;
          if (n <= 0) continue;
          im.clearUpdateRanges(); im.addUpdateRange(n0 * 16, n * 16);
          ud.ta.clearUpdateRanges(); ud.ta.addUpdateRange(n0 * 4, n * 4);
          ud.tb.clearUpdateRanges(); ud.tb.addUpdateRange(n0 * 4, n * 4);
        }
        im.needsUpdate = true; ud.ta.needsUpdate = true; ud.tb.needsUpdate = true;
      }
      t.fullUpload = false;
    }
    // empty meshes stay out of the render lists entirely (no draw call, no state changes)
    for (const t of this.types) if (t.mesh) { t.mesh.visible = t.mesh.count > 0; t.lod.visible = t.lod.count > 0; }
  }

  countVisible() { let n = 0; for (const t of this.types) if (t.mesh) n += t.mesh.count + (t.lod ? t.lod.count : 0); return n; }
}

// shared helper: add a lamp-like point light definition
export function lampLight(x, y, z, color = [1.0, 0.8, 0.5], radius = 7, mode = 'night') { return { at: [x, y, z], color, radius, mode }; }
export { PROP_VS, VS };
