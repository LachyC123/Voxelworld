// Renderer, scene, camera and the shared shading state.
import * as THREE from 'three';
import { createCommonUniforms, createWorldMaterial, createGlassMaterial, createPropMaterial } from './shaders.js';
import { materialTextureData } from '../world/materials.js';
import { Sky } from './sky.js';
import { TimeOfDay } from './timeOfDay.js';
import { Shadows } from './shadows.js';
import { Post } from './post.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: false, preserveDrawingBuffer: /[?&]shot/.test(location.search) });
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = false;
    r.setClearColor(0x000000, 1);
    this.r = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.08, 5000);
    this.camera.layers.enable(0); this.camera.layers.enable(1); this.camera.layers.enable(2);
    this.common = createCommonUniforms();
    const md = materialTextureData();
    const mt = new THREE.DataTexture(md.data, md.width, md.height, THREE.RGBAFormat, THREE.UnsignedByteType);
    mt.minFilter = THREE.NearestFilter; mt.magFilter = THREE.NearestFilter; mt.needsUpdate = true;
    this.common.uMatTex.value = mt;
    this.sky = new Sky(this.scene, this.common);
    this.tod = new TimeOfDay(this.common, this.sky);
    this.worldMat = createWorldMaterial(this.common);
    this.glassMat = createGlassMaterial(this.common, { uSkyTop: this.sky.uniforms.uSkyTop, uSkyHorizon: this.sky.uniforms.uSkyHorizon });
    this.propMat = createPropMaterial(this.common);
    this.shadows = new Shadows(r, this.common);
    this.post = new Post(r);
    this.pixelRatio = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setQuality(q) {
    this.pixelRatio = this.basePixelRatio = Math.min(q.pixelRatio, window.devicePixelRatio || 1);
    this.shadows.setSize(q.shadowSize);
    this.shadowRange = q.shadowRange;
    this.post.enabled = q.post !== false;
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.r.setPixelRatio(this.pixelRatio);
    this.r.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Adaptive resolution: if frames run long for a few seconds, render a little smaller (down to
  // 60% of the quality setting); when there's headroom again, creep back up. Nothing is removed.
  adapt(dt) {
    if (this.fixedResolution || !this.basePixelRatio) return;
    this._ema = this._ema === undefined ? 1 / 60 : this._ema * 0.94 + Math.min(dt, 0.1) * 0.06;
    this._adaptT = (this._adaptT || 0) + dt;
    const base = this.basePixelRatio;
    if (this._adaptT > 2.5 && this._ema > 1 / 40 && this.pixelRatio > base * 0.61) {
      this.pixelRatio = Math.max(base * 0.6, this.pixelRatio * 0.88); this.resize(); this._adaptT = 0;
    } else if (this._adaptT > 6 && this._ema < 1 / 56 && this.pixelRatio < base - 1e-3) {
      this.pixelRatio = Math.min(base, this.pixelRatio / 0.92); this.resize(); this._adaptT = 0;
    }
  }

  render(focus) {
    this.common.uCamPos.value.copy(this.camera.position);
    this.sky.update(this.camera.position, 0);
    // the shadow map is redrawn every other frame (moving shadows update 30 times a second), or at
    // once after a jump or when the sun has moved
    this._frame = (this._frame || 0) + 1;
    const sun = this.common.uSunDir.value;
    const jumped = !this._shFocus || Math.abs(focus.x - this._shFocus.x) + Math.abs(focus.z - this._shFocus.z) > 6;
    const sunMoved = !this._shSun || this._shSun.dot(sun) < 0.99999;
    if (this.shadowsEveryFrame || jumped || sunMoved || this._frame % 2 === 0 || this.shadows.range !== (this.shadowRange || 80)) {
      this.shadows.render(this.scene, focus, sun, this.shadowRange || 80);
      (this._shFocus || (this._shFocus = focus.clone())).copy(focus);
      (this._shSun || (this._shSun = sun.clone())).copy(sun);
    }
    if (this.post.enabled) this.post.render(this.scene, this.camera, this.common.uNight.value);
    else this.r.render(this.scene, this.camera);
  }
}
