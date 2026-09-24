// Single directional shadow map that follows the camera, rendered with a
// depth-only override material and sampled manually (sampler2DShadow) by our shaders.
import * as THREE from 'three';

export class Shadows {
  constructor(renderer, common) {
    this.renderer = renderer; this.common = common;
    this.cam = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1200);
    this.cam.layers.set(0);
    this.depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.BackSide });
    this.size = 0; this.range = 80; this.enabled = true;
    this.bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.setSize(2048);
  }

  setSize(size) {
    if (size === this.size) return;
    if (this.rt) this.rt.dispose();
    this.size = size;
    const dt = new THREE.DepthTexture(size, size);
    dt.type = THREE.UnsignedIntType;
    dt.compareFunction = THREE.LessEqualCompare;
    dt.minFilter = THREE.LinearFilter; dt.magFilter = THREE.LinearFilter;
    this.rt = new THREE.WebGLRenderTarget(size, size, { depthTexture: dt, depthBuffer: true });
    this.rt.texture.generateMipmaps = false;
    this.common.uShadowMap.value = dt;
    this.common.uShadowTexel.value = 1 / size;
  }

  render(scene, center, lightDir, range) {
    const c = this.common;
    if (!this.enabled) { c.uShadowOn.value = 0; return; }
    this.range = range;
    const cam = this.cam;
    cam.left = -range; cam.right = range; cam.top = range; cam.bottom = -range;
    cam.near = 1; cam.far = 900;
    cam.updateProjectionMatrix();
    // snap the centre to shadow texels to avoid swimming edges
    const up = Math.abs(lightDir.y) > 0.99 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const target = center.clone();
    cam.position.copy(target).addScaledVector(lightDir, 450);
    cam.up.copy(up);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    const texel = (2 * range) / this.size;
    const v = target.clone().applyMatrix4(cam.matrixWorldInverse);
    const sx = Math.round(v.x / texel) * texel - v.x, sy = Math.round(v.y / texel) * texel - v.y;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const camUp = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    cam.position.addScaledVector(right, -sx).addScaledVector(camUp, -sy);
    cam.updateMatrixWorld();
    c.uShadowMatrix.value.copy(this.bias).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    c.uShadowBias.value = 0.00025 + texel * 0.00012;
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevOverride = scene.overrideMaterial;
    const prevAuto = r.autoClear;
    scene.overrideMaterial = this.depthMat;
    r.setRenderTarget(this.rt);
    r.autoClear = true;
    r.clear(false, true, false);
    r.render(scene, cam);
    r.setRenderTarget(prevTarget);
    scene.overrideMaterial = prevOverride;
    r.autoClear = prevAuto;
    c.uShadowOn.value = 1;
  }
}
