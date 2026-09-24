// Worker pool that meshes the voxel world region by region and turns the results
// into Three.js meshes (one opaque + one glass mesh per 32 m region).
import * as THREE from 'three';
import { VS, CHUNK, REGION } from '../core/config.js';

export class WorldMeshes {
  constructor(world, scene, worldMat, glassMat) {
    this.world = world; this.scene = scene; this.worldMat = worldMat; this.glassMat = glassMat;
    this.group = new THREE.Group(); this.group.name = 'world';
    this.glassGroup = new THREE.Group(); this.glassGroup.name = 'glass';
    scene.add(this.group); scene.add(this.glassGroup);
    this.regions = new Map();
    this.stats = { tris: 0, regions: 0, ms: 0 };
  }

  regionKeys() {
    const c = this.world.col;
    const rx0 = Math.floor(c.cx0 / REGION), rz0 = Math.floor(c.cz0 / REGION);
    const rx1 = Math.floor((c.cx0 + c.ncx - 1) / REGION), rz1 = Math.floor((c.cz0 + c.ncz - 1) / REGION);
    const out = [];
    for (let rz = rz0; rz <= rz1; rz++) for (let rx = rx0; rx <= rx1; rx++) {
      // skip regions with no geometry at all
      let any = false;
      for (let dz = 0; dz < REGION && !any; dz++) for (let dx = 0; dx < REGION && !any; dx++) {
        const cx = rx * REGION + dx - c.cx0, cz = rz * REGION + dz - c.cz0;
        if (cx < 0 || cz < 0 || cx >= c.ncx || cz >= c.ncz) continue;
        const ci = cx + cz * c.ncx;
        if (c.yMin[ci] <= c.yMax[ci]) any = true;
      }
      if (any) out.push({ rx, rz, key: rx + ',' + rz });
    }
    return out;
  }

  // Build everything; resolves when all regions are done. onProgress(done, total).
  build(focus, onProgress, onNearReady) {
    const data = this.world.serialize();
    const n = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
    const keys = this.regionKeys();
    const fx = focus.x / VS, fz = focus.z / VS;
    const cen = (k) => [(k.rx + 0.5) * REGION * CHUNK, (k.rz + 0.5) * REGION * CHUNK];
    keys.sort((a, b) => { const ca = cen(a), cb = cen(b); return Math.hypot(ca[0] - fx, ca[1] - fz) - Math.hypot(cb[0] - fx, cb[1] - fz); });
    const nearCount = keys.filter((k) => { const c = cen(k); return Math.hypot(c[0] - fx, c[1] - fz) < 110 / VS; }).length;
    let next = 0, done = 0, nearDone = 0, nearFired = false;
    const total = keys.length;
    const t0 = performance.now();
    return new Promise((resolve, reject) => {
      const workers = [];
      const dispatch = (w) => {
        if (next >= keys.length) return;
        const k = keys[next++];
        w.postMessage({ type: 'region', key: k.key, rcx: k.rx * REGION, rcz: k.rz * REGION, n: REGION, minFaceY: -24 });
      };
      for (let i = 0; i < n; i++) {
        const w = new Worker(new URL('../world/mesher.worker.js', import.meta.url), { type: 'module' });
        w.onerror = (e) => { console.error('mesher worker error', e); reject(e); };
        w.onmessage = (e) => {
          const m = e.data;
          if (m.type === 'ready') { dispatch(w); return; }
          if (m.type === 'region') {
            this.addRegion(m.key, m.result);
            done++;
            const k = keys.find((q) => q.key === m.key);
            const c = cen(k);
            if (Math.hypot(c[0] - fx, c[1] - fz) < 110 / VS) nearDone++;
            onProgress && onProgress(done, total);
            if (!nearFired && nearDone >= nearCount) { nearFired = true; onNearReady && onNearReady(); }
            if (done >= total) {
              this.stats.ms = performance.now() - t0;
              workers.forEach((ww) => ww.terminate());
              resolve(this.stats);
            } else dispatch(w);
          }
        };
        w.postMessage({ type: 'init', world: data });
        workers.push(w);
      }
      if (total === 0) resolve(this.stats);
    });
  }

  makeGeometry(r, origin) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Int16BufferAttribute(r.pos, 3));
    g.setAttribute('aData', new THREE.Uint8BufferAttribute(r.dat, 4));
    g.setAttribute('aRoom', new THREE.Uint16BufferAttribute(r.room, 1));
    g.setIndex(new THREE.Uint32BufferAttribute(r.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }

  addRegion(key, res) {
    const o = res.origin;
    const entry = {};
    if (res.opaque) {
      const m = new THREE.Mesh(this.makeGeometry(res.opaque), this.worldMat);
      m.position.set(o[0] * VS, o[1] * VS, o[2] * VS); m.scale.setScalar(VS);
      m.matrixAutoUpdate = false; m.updateMatrix();
      this.group.add(m); entry.opaque = m;
      this.stats.tris += res.opaque.idx.length / 3;
    }
    if (res.glass) {
      const m = new THREE.Mesh(this.makeGeometry(res.glass), this.glassMat);
      m.position.set(o[0] * VS, o[1] * VS, o[2] * VS); m.scale.setScalar(VS);
      m.matrixAutoUpdate = false; m.updateMatrix();
      m.layers.set(1); m.renderOrder = 5;
      this.glassGroup.add(m); entry.glass = m;
      this.stats.tris += res.glass.idx.length / 3;
    }
    this.stats.regions++;
    this.regions.set(key, entry);
  }
}
