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
    this.camera.layers.enable(0); this.camera.layers.enable(1);
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
    this.pixelRatio = Math.min(q.pixelRatio, window.devicePixelRatio || 1);
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

  render(focus) {
    this.common.uCamPos.value.copy(this.camera.position);
    this.sky.update(this.camera.position, 0);
    this.shadows.render(this.scene, focus, this.common.uSunDir.value, this.shadowRange || 80);
    if (this.post.enabled) this.post.render(this.scene, this.camera, this.common.uNight.value);
    else this.r.render(this.scene, this.camera);
  }
}
