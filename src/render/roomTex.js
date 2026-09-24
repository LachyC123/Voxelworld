// Per-room lamp light + sky-leak data texture, read by every shader via the room id.
import * as THREE from 'three';

export class RoomTexture {
  constructor(world, common) {
    this.world = world;
    const n = world.rooms.length;
    this.rows = Math.max(1, Math.ceil(n / 256));
    this.data = new Uint8Array(256 * this.rows * 4);
    this.tex = new THREE.DataTexture(this.data, 256, this.rows, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.tex.minFilter = THREE.NearestFilter; this.tex.magFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.tex.needsUpdate = true;
    common.uRoomTex.value = this.tex;
    this.data[3] = 255; // room 0 = outdoors, full sky
    for (let i = 1; i < n; i++) this.data[i * 4 + 3] = Math.round((world.rooms[i].ambient ?? 0.35) * 255);
    this.dirty = true;
  }

  set(id, r, g, b) {
    const o = id * 4;
    const R = Math.min(255, Math.round(r * 255)), G = Math.min(255, Math.round(g * 255)), B = Math.min(255, Math.round(b * 255));
    if (this.data[o] !== R || this.data[o + 1] !== G || this.data[o + 2] !== B) {
      this.data[o] = R; this.data[o + 1] = G; this.data[o + 2] = B;
      this.dirty = true;
    }
  }

  setAmbient(id, a) { const v = Math.round(a * 255); if (this.data[id * 4 + 3] !== v) { this.data[id * 4 + 3] = v; this.dirty = true; } }

  flush() { if (this.dirty) { this.tex.needsUpdate = true; this.dirty = false; } }
}
