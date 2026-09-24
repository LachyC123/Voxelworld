// Chimney smoke and locomotive steam: soft sprites that rise, drift on the north-west breeze,
// swell and fade. Houses light the stove at breakfast and the fire after supper on a cool
// September evening; a few old coal furnaces smoke all day; the train steams in the station.
import * as THREE from 'three';
import { hash3 } from '../core/rng.js';

const MAXP = 3500;
const WIND = [0.55, 0, 0.35]; // m/s, blowing out toward the south-east

export class Smoke {
  constructor(scene, common) {
    this.pos = new Float32Array(MAXP * 3);
    this.vel = new Float32Array(MAXP * 3);
    this.age = new Float32Array(MAXP);
    this.life = new Float32Array(MAXP);
    this.size = new Float32Array(MAXP);
    this.tone = new Float32Array(MAXP);
    this.a = new Float32Array(MAXP); // 0..1 remaining, for the shader
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aLife', new THREE.BufferAttribute(this.a, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aTone', new THREE.BufferAttribute(this.tone, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 }, uSunColor: common.uSunColor, uSkyAmb: common.uSkyAmb, uNight: common.uNight, uFogColor: common.uFogColor, uFogDensity: common.uFogDensity, uCamPos: common.uCamPos },
      vertexShader: /* glsl */`
        attribute float aLife; attribute float aSize; attribute float aTone; uniform float uScale; uniform vec3 uCamPos; uniform float uFogDensity; uniform float uNight;
        varying float vLife; varying float vTone; varying float vFog;
        void main() {
          vLife = aLife; vTone = aTone;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aLife > 0.0 ? min(260.0, aSize * uScale / -mv.z) : 0.0;
          gl_Position = projectionMatrix * mv;
          float d = length(position - uCamPos);
          float f = 1.0 - exp(-max(0.0, d - 40.0) * uFogDensity * (0.3 + 0.25 * uNight));
          vFog = clamp(f * f * (3.0 - 2.0 * f) * 0.85, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uSunColor; uniform vec3 uSkyAmb; uniform float uNight; uniform vec3 uFogColor;
        varying float vLife; varying float vTone; varying float vFog;
        void main() {
          if (vLife <= 0.0) discard;
          vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard;
          // puffy edge: a little noise from the sprite coords
          float n = fract(sin(dot(floor(gl_PointCoord * 6.0), vec2(12.9898, 78.233)) + vTone * 40.0) * 43758.5453);
          float a = smoothstep(0.25, 0.02, d + n * 0.05) * min(1.0, vLife * 2.2) * min(1.0, (1.0 - vLife) * 6.0 + 0.15);
          vec3 lit = uSunColor * 0.55 * (1.0 - uNight) + uSkyAmb * 0.55 + vec3(0.04);
          vec3 col = mix(vec3(0.62, 0.62, 0.64), vec3(0.95, 0.95, 0.96), vTone) * lit;
          col = mix(col, uFogColor, vFog);
          gl_FragColor = vec4(col, a * (0.28 + 0.3 * vTone));
        }`,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.layers.set(1);
    this.points.renderOrder = 18;
    scene.add(this.points);
    this.emitters = [];
    this.acc = 0;
  }

  // houses: pot positions + building kind; windows decided per building so all its pots agree
  addChimneys(ctx) {
    const P = ctx.props, tid = P.typeIndex.get('chimney_pot');
    if (tid === undefined) return;
    const rects = ctx.buildings.filter((b) => b.rect);
    for (let i = 0; i < P.n; i++) {
      if (P.tType[i] !== tid || P.tCat[i] === 250) continue;
      const x = P.tPos[i * 3], y = P.tPos[i * 3 + 1] + 0.8, z = P.tPos[i * 3 + 2];
      const b = rects.find((q) => x >= q.rect.x0 - 1 && x <= q.rect.x1 + 1 && z >= q.rect.z0 - 1 && z <= q.rect.z1 + 1);
      const id = b ? b.id : i;
      const r = (k) => hash3(id, k, 77);
      const home = b && (b.kind === 'house' || b.kind === 'rowhouse' || b.kind === 'apartment');
      const wins = [];
      if (home) {
        if (r(1) < 0.75) wins.push([345 + r(2) * 60, 480 + r(3) * 110]);          // the kitchen stove at breakfast
        if (r(4) < 0.8) wins.push([990 + r(5) * 90, 1320 + r(6) * 100]);         // a fire after supper
        if (r(7) < 0.15) wins.length = 0, wins.push([0, 1440]);                    // the old coal furnace
      } else if (r(8) < 0.5) wins.push([360 + r(9) * 120, 1020 + r(10) * 200]);
      if (!wins.length) continue;
      this.emitters.push({ x, y, z, wins, rate: home ? 1.1 + r(11) * 0.8 : 1.6, tone: 0.2 + r(12) * 0.35, size: 0.5 });
    }
  }
  // a steam engine's stack: fn() -> {x, y, z, rate} or null
  addMoving(fn) { this.emitters.push({ fn, tone: 1, size: 0.9, rate: 0 }); }

  emit(x, y, z, tone, size, strong) {
    const i = this.next; this.next = (this.next + 1) % MAXP;
    this.pos[i * 3] = x + (Math.random() - 0.5) * 0.2; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.2;
    this.vel[i * 3] = (Math.random() - 0.5) * 0.25; this.vel[i * 3 + 1] = (strong ? 2.2 : 0.75) + Math.random() * 0.35; this.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.25;
    this.age[i] = 0; this.life[i] = (strong ? 4 : 7) + Math.random() * 3; this.size[i] = size; this.tone[i] = tone;
  }

  // run a few seconds of history at once (on arrival, after a time jump) so plumes are already up
  prewarm(minutes, cam, night, seconds = 9) { for (let t = 0; t < seconds; t += 0.1) this.update(0.1, minutes, cam, night, true); }

  update(dt, minutes, cam, night, warming = false) {
    if (!warming && (this._lastMin === undefined || Math.abs(minutes - this._lastMin) > 3 || this._lastCam === undefined || Math.hypot(cam.x - this._lastCam[0], cam.z - this._lastCam[1]) > 60)) {
      this._lastMin = minutes; this._lastCam = [cam.x, cam.z];
      this.prewarm(minutes, cam, night);
    }
    if (!warming) { this._lastMin = minutes; this._lastCam = [cam.x, cam.z]; }
    dt = Math.min(dt, 0.1);
    // spawn from nearby live emitters
    for (const e of this.emitters) {
      let x = e.x, y = e.y, z = e.z, rate = e.rate;
      if (e.fn) { const q = e.fn(); if (!q) continue; x = q.x; y = q.y; z = q.z; rate = q.rate; }
      else if (!e.wins.some(([a, b]) => minutes >= a && minutes < b)) continue;
      const dx = x - cam.x, dz = z - cam.z;
      if (dx * dx + dz * dz > 260 * 260) continue;
      e.acc = (e.acc || Math.random()) + dt * rate * (night > 0.5 ? 0.8 : 1);
      while (e.acc >= 1) { e.acc -= 1; this.emit(x, y, z, e.tone, e.size, !!e.fn); }
    }
    // move and age
    const P = this.pos, V = this.vel;
    for (let i = 0; i < MAXP; i++) {
      if (this.life[i] <= 0) { this.a[i] = 0; continue; }
      const age = (this.age[i] += dt), L = this.life[i];
      if (age >= L) { this.life[i] = 0; this.a[i] = 0; continue; }
      const k = age / L;
      V[i * 3 + 1] *= 1 - dt * 0.25;
      P[i * 3] += (V[i * 3] + WIND[0] * k * 1.6) * dt;
      P[i * 3 + 1] += V[i * 3 + 1] * dt;
      P[i * 3 + 2] += (V[i * 3 + 2] + WIND[2] * k * 1.6) * dt;
      this.size[i] += dt * 0.55;
      this.a[i] = 1 - k;
    }
    const g = this.geo;
    g.attributes.position.needsUpdate = true; g.attributes.aLife.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aTone.needsUpdate = true;
  }
}
