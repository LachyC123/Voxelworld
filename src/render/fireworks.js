// Centennial fireworks over the harbour, 9:00–9:25 p.m.
import * as THREE from 'three';

const MAXP = 6000;
const COLORS = [[1, 0.3, 0.25], [1, 0.95, 0.85], [0.35, 0.5, 1], [1, 0.8, 0.3], [0.4, 1, 0.5], [1, 0.45, 0.8]];

export class Fireworks {
  constructor(scene, lights) {
    this.pos = new Float32Array(MAXP * 3);
    this.vel = new Float32Array(MAXP * 3);
    this.col = new Float32Array(MAXP * 3);
    this.life = new Float32Array(MAXP);
    this.size = new Float32Array(MAXP);
    this.n = 0; this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader: /* glsl */`
        attribute float aLife; attribute float aSize; attribute vec3 color; uniform float uScale;
        varying vec3 vCol; varying float vLife;
        void main() { vCol = color; vLife = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aLife > 0.0 ? max(1.5, aSize * uScale / -mv.z) : 0.0; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`
        varying vec3 vCol; varying float vLife;
        void main() { if (vLife <= 0.0) discard; vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard;
          float a = smoothstep(0.25, 0.0, d) * clamp(vLife, 0.0, 1.0);
          gl_FragColor = vec4(vCol * (1.5 + vLife), a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.layers.set(1);
    this.points.renderOrder = 20;
    scene.add(this.points);
    this.flash = lights.addDynamic({ color: [1, 0.8, 0.6], radius: 140 });
    this.rockets = [];
    this.acc = 0;
    this.bursts = 0;
    this.onBoom = null;
  }
  emit(x, y, z, vx, vy, vz, c, life, size) {
    const i = this.next; this.next = (this.next + 1) % MAXP;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = c[0]; this.col[i * 3 + 1] = c[1]; this.col[i * 3 + 2] = c[2];
    this.life[i] = life; this.size[i] = size;
  }
  burst(x, y, z) {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    const c2 = Math.random() < 0.4 ? COLORS[Math.floor(Math.random() * COLORS.length)] : c;
    const n = 160 + Math.floor(Math.random() * 120);
    const sp = 14 + Math.random() * 10;
    const ring = Math.random() < 0.25;
    for (let k = 0; k < n; k++) {
      let dx, dy, dz;
      if (ring) { const a = (k / n) * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a) * 0.3 + 0.2; dz = Math.sin(a); }
      else { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); dx = r * Math.cos(a); dy = u; dz = r * Math.sin(a); }
      const s = sp * (0.85 + Math.random() * 0.3);
      this.emit(x, y, z, dx * s, dy * s, dz * s, k % 2 ? c : c2, 2.2 + Math.random() * 0.8, 1.6);
    }
    this.flash.x = x; this.flash.y = y; this.flash.z = z; this.flash.intensity = 1.6; this.flash.color = [c[0], c[1], c[2]];
    this.bursts++;
    this.onBoom && this.onBoom(x, y, z);
  }
  update(dt, minutes, active) {
    const show = minutes >= 21 * 60 && minutes < 21 * 60 + 25;
    if (show && active) {
      const finale = minutes > 21 * 60 + 21;
      this.acc += dt;
      const every = finale ? 0.25 : 1.1;
      while (this.acc > every) {
        this.acc -= every;
        const x = -60 - Math.random() * 120, z = -60 + Math.random() * 140;
        this.rockets.push({ x, y: -1, z, vy: 38 + Math.random() * 10, t: 0, fuse: 1.6 + Math.random() * 0.8 });
      }
    }
    // rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.t += dt; r.y += r.vy * dt; r.vy -= 9 * dt;
      this.emit(r.x + (Math.random() - 0.5) * 0.3, r.y, r.z, 0, -2, 0, [1, 0.8, 0.5], 0.6, 0.8);
      if (r.t > r.fuse) { this.burst(r.x, r.y, r.z); this.rockets.splice(i, 1); }
    }
    // particles
    let any = false;
    for (let i = 0; i < MAXP; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      this.vel[i * 3] *= 0.985; this.vel[i * 3 + 2] *= 0.985; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * 0.985 - 6 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.life[i] < 1) { const k = 0.97; this.col[i * 3] *= k; this.col[i * 3 + 1] *= k; this.col[i * 3 + 2] *= k; }
    }
    this.points.visible = any;
    if (any) { for (const k of ['position', 'color', 'aLife']) this.geo.attributes[k].needsUpdate = true; }
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 2.2);
  }
}
