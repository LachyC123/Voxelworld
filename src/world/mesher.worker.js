// Mesher worker: receives the serialized world once, then meshes render regions on request.
import { createMesher } from './mesher.js';

let mesher = null;

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') {
    mesher = createMesher(msg.world);
    self.postMessage({ type: 'ready' });
  } else if (msg.type === 'region') {
    const t0 = performance.now();
    const r = mesher.meshRegion(msg.rcx, msg.rcz, msg.n, msg.minFaceY, !!msg.lod);
    const transfer = [];
    for (const k of ['opaque', 'glass']) if (r[k]) transfer.push(r[k].pos.buffer, r[k].dat.buffer, r[k].room.buffer, r[k].idx.buffer);
    self.postMessage({ type: 'region', key: msg.key, lod: !!msg.lod, result: r, ms: performance.now() - t0 }, transfer);
  }
};
