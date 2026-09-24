// The sweeping beam of Whitcomb Point Light (visible from dusk to dawn).
import * as THREE from 'three';

export class LighthouseBeam {
  constructor(scene, x, y, z) {
    const len = 260;
    const geo = new THREE.ConeGeometry(14, len, 24, 1, true);
    geo.translate(0, -len / 2, 0);
    geo.rotateZ(Math.PI / 2); // point along +x
    const mat = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uLen: { value: len } },
      vertexShader: /* glsl */`varying float vD; varying vec3 vN; varying vec3 vV;
        void main() { vD = position.x; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`uniform float uI; uniform float uLen; varying float vD; varying vec3 vN; varying vec3 vV;
        void main() { float f = 1.0 - clamp(vD / uLen, 0.0, 1.0); float edge = pow(abs(dot(vN, vV)), 1.5);
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.8) * uI * f * f * edge * 0.35, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mat = mat;
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    const a = new THREE.Mesh(geo, mat), b = new THREE.Mesh(geo, mat);
    b.rotation.y = Math.PI;
    a.frustumCulled = false; b.frustumCulled = false;
    this.group.add(a, b);
    this.group.traverse((o) => o.layers.set(1));
    this.group.rotation.z = -0.03;
    scene.add(this.group);
  }
  update(t, night) {
    this.group.rotation.y = t * 0.55;
    this.mat.uniforms.uI.value = night;
    this.group.visible = night > 0.02;
  }
}
