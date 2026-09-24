// Sky dome (gradient, sun, moon, stars) and drifting voxel clouds.
import * as THREE from 'three';
import { RNG } from '../core/rng.js';

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;
const SKY_FRAG = /* glsl */`
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSunGlow;
uniform float uNight;
uniform float uTime;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  float t = pow(clamp(h, 0.0, 1.0), 0.55);
  vec3 col = mix(uSkyHorizon, uSkyTop, t);
  if (d.y < 0.0) col = mix(uSkyHorizon, uSkyHorizon * 0.7, clamp(-d.y * 4.0, 0.0, 1.0));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunGlow * pow(sd, 6.0) * 0.55;
  col += uSunGlow * pow(sd, 64.0) * 0.6;
  // sun disc
  float disc = smoothstep(0.9993, 0.9997, sd);
  col += vec3(1.0, 0.92, 0.75) * disc * 6.0 * clamp(uSunDir.y * 8.0 + 0.6, 0.0, 1.0);
  // stars
  if (uNight > 0.01 && d.y > 0.0) {
    vec3 sp = floor(d * 380.0);
    float s = hash(sp);
    float tw = 0.6 + 0.4 * sin(uTime * 3.0 + s * 50.0);
    if (s > 0.9965) col += vec3(0.9, 0.92, 1.0) * uNight * tw * smoothstep(0.0, 0.25, d.y) * (s - 0.9965) * 300.0 * 0.4;
    // milky haze
    col += vec3(0.05, 0.06, 0.1) * uNight * 0.3 * smoothstep(0.3, 0.0, abs(d.x * 0.6 + d.z * 0.8 - 0.1)) * d.y;
  }
  // moon
  float md = dot(d, uMoonDir);
  float moon = smoothstep(0.99955, 0.9997, md);
  col = mix(col, vec3(0.95, 0.93, 0.85), moon * uNight);
  col += vec3(0.4, 0.45, 0.6) * pow(max(md, 0.0), 300.0) * uNight * 0.5;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class Sky {
  constructor(scene, common) {
    this.uniforms = {
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uMoonDir: { value: new THREE.Vector3(-0.3, 0.6, -0.4).normalize() },
      uSkyTop: { value: new THREE.Color(0.28, 0.5, 0.85) },
      uSkyHorizon: { value: new THREE.Color(0.75, 0.84, 0.93) },
      uSunGlow: { value: new THREE.Color(1, 0.8, 0.5) },
      uNight: common.uNight,
      uTime: common.uTime,
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    this.mesh.layers.set(1);
    scene.add(this.mesh);
    this.buildClouds(scene, common);
  }

  buildClouds(scene, common) {
    const rng = new RNG('clouds');
    const pos = [], nrm = [], shade = [], cen = [];
    let curC = [0, 0];
    const box = (x, y, z, sx, sy, sz) => {
      const faces = [
        [[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]], [[-1, 0, 0], [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]]],
        [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
        [[0, 0, 1], [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]]], [[0, 0, -1], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]],
      ];
      for (const [n, vs] of faces) {
        const q = vs.map((v) => [x + v[0] * sx, y + v[1] * sy, z + v[2] * sz]);
        for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...q[i]); nrm.push(...n); shade.push(0.9 + rng.next() * 0.1); cen.push(curC[0], curC[1]); }
      }
    };
    this.cloudSpan = 2400;
    for (let c = 0; c < 46; c++) {
      const cx = rng.float(-1200, 1200), cz = rng.float(-1200, 1200), cy = rng.float(170, 260);
      const puffs = rng.int(4, 9);
      curC = [cx, cz];
      const s = rng.float(0.7, 1.6);
      for (let p = 0; p < puffs; p++) {
        const w = rng.float(14, 34) * s, h = rng.float(6, 12) * s, d = rng.float(12, 28) * s;
        box(cx + rng.float(-30, 30) * s, cy + rng.float(0, 8) * s, cz + rng.float(-18, 18) * s, w, h, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('aShade', new THREE.Float32BufferAttribute(shade, 1));
    g.setAttribute('aCen', new THREE.Float32BufferAttribute(cen, 2));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSunDir: common.uSunDir, uSunColor: common.uSunColor, uSkyAmb: common.uSkyAmb, uFogColor: common.uFogColor, uTime: common.uTime, uNight: common.uNight, uOffset: { value: new THREE.Vector2() }, uSpan: { value: this.cloudSpan }, uCam: common.uCamPos },
      vertexShader: /* glsl */`
        attribute float aShade; attribute vec2 aCen; uniform vec2 uOffset; uniform float uSpan; uniform vec3 uCam;
        varying vec3 vN; varying float vS; varying float vD;
        void main() {
          vec3 p = position;
          vec2 c = aCen + uOffset;
          vec2 w = mod(c - uCam.xz + uSpan * 0.5, uSpan) - uSpan * 0.5 + uCam.xz;
          p.xz += w - aCen;
          vN = normal; vS = aShade; vD = length(p.xz - uCam.xz);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uSkyAmb; uniform vec3 uFogColor; uniform float uNight;
        varying vec3 vN; varying float vS; varying float vD;
        void main() {
          float ndl = max(dot(normalize(vN), uSunDir), 0.0);
          vec3 c = vec3(1.0) * (uSkyAmb * 1.25 + uSunColor * ndl * 0.55) * vS;
          c = mix(c, uFogColor, clamp(vD / 1400.0, 0.0, 0.8));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.clouds = new THREE.Mesh(g, mat);
    this.clouds.frustumCulled = false;
    this.clouds.layers.set(1);
    this.cloudMat = mat;
    scene.add(this.clouds);
  }

  update(cameraPos, dtReal) {
    this.mesh.position.copy(cameraPos);
    const o = this.cloudMat.uniforms.uOffset.value;
    o.x += dtReal * 2.2; o.y += dtReal * 0.8;
  }
}
