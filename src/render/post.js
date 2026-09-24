// HDR post-processing: scene -> half-float target (MSAA), bloom mip chain, then a composite pass
// with ACES tone mapping, a gentle warm grade and a vignette.
import * as THREE from 'three';

const FS_VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class Post {
  constructor(renderer) {
    this.r = renderer;
    this.enabled = true;
    this.levels = 5;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.bright = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0.9 } },
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */`uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
                 + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
          c *= 0.25;
          float l = max(max(c.r, c.g), c.b);
          c *= clamp((l - uThreshold) / max(l, 1e-4), 0.0, 1.0);
          gl_FragColor = vec4(min(c, vec3(20.0)), 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.down = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */`uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tSrc, vUv).rgb * 0.25;
          c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb * 0.1875; c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb * 0.1875;
          c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb * 0.1875; c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb * 0.1875;
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.up = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */`uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-1.0, 0.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 0.0)).rgb
                 + texture2D(tSrc, vUv + uTexel * vec2(0.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(0.0, 1.0)).rgb;
          gl_FragColor = vec4(c * 0.25, 1.0);
        }`,
      depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
    });
    this.comp = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 0.45 }, uExposure: { value: 1.25 }, uNight: { value: 0 } },
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */`
        uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uBloom; uniform float uExposure; uniform float uNight; varying vec2 vUv;
        vec3 aces(vec3 x) { const float a = 2.51; const float b = 0.03; const float c = 2.43; const float d = 0.59; const float e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
        vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
        void main() {
          vec3 c = texture2D(tScene, vUv).rgb;
          vec3 b = texture2D(tBloom, vUv).rgb;
          c += b * uBloom * (1.0 + uNight * 0.8);
          c *= uExposure * 1.05;
          c = aces(c);
          // warm, slightly lifted grade
          c = pow(c, vec3(0.96, 0.98, 1.02));
          c = mix(c, c * vec3(1.03, 1.0, 0.95), 0.6);
          vec2 q = vUv - 0.5;
          float vig = 1.0 - dot(q, q) * 0.55;
          c *= vig;
          gl_FragColor = vec4(toSRGB(c), 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.w = 0; this.h = 0;
  }

  setSize(w, h) {
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.dispose();
    const opts = { type: THREE.HalfFloatType, depthBuffer: false };
    this.sceneRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    this.mips = [];
    let mw = Math.max(1, w >> 1), mh = Math.max(1, h >> 1);
    for (let i = 0; i < this.levels; i++) { this.mips.push(new THREE.WebGLRenderTarget(mw, mh, opts)); mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1); }
  }
  dispose() { this.sceneRT?.dispose(); this.mips?.forEach((m) => m.dispose()); }

  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); }

  render(scene, camera, night) {
    const r = this.r;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    this.setSize(size.x, size.y);
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);
    // bloom
    this.bright.uniforms.tSrc.value = this.sceneRT.texture;
    this.bright.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    this.bright.uniforms.uThreshold.value = 2.4 - 1.6 * Math.min(1, night * 1.4);
    this.pass(this.bright, this.mips[0]);
    for (let i = 1; i < this.levels; i++) {
      this.down.uniforms.tSrc.value = this.mips[i - 1].texture;
      this.down.uniforms.uTexel.value.set(1 / this.mips[i - 1].width, 1 / this.mips[i - 1].height);
      this.pass(this.down, this.mips[i]);
    }
    for (let i = this.levels - 1; i > 0; i--) {
      this.up.uniforms.tSrc.value = this.mips[i].texture;
      this.up.uniforms.uTexel.value.set(1 / this.mips[i].width, 1 / this.mips[i].height);
      this.r.autoClear = false;
      this.pass(this.up, this.mips[i - 1]);
      this.r.autoClear = true;
    }
    this.comp.uniforms.tScene.value = this.sceneRT.texture;
    this.comp.uniforms.tBloom.value = this.mips[0].texture;
    this.comp.uniforms.uNight.value = night;
    this.pass(this.comp, null);
  }
}
