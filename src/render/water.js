// Harbour water: a big animated plane with sky reflection, sun glitter, and shoreline tint.
import * as THREE from 'three';
import { GLSL_COMMON } from './shaders.js';
import { WATER_Y } from '../core/config.js';

export function createWater(scene, common, sky) {
  const geo = new THREE.PlaneGeometry(9000, 9000, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...common, uSkyTop: sky.uniforms.uSkyTop, uSkyHorizon: sky.uniforms.uSkyHorizon, uTrueSun: sky.uniforms.uSunDir },
    vertexShader: /* glsl */`
      uniform mat4 uShadowMatrix;
      varying vec3 vWorld; varying vec4 vShadow;
      void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vShadow = uShadowMatrix * wp; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`
      ${GLSL_COMMON}
      uniform vec3 uSkyTop; uniform vec3 uSkyHorizon; uniform vec3 uTrueSun;
      varying vec3 vWorld; varying vec4 vShadow;
      vec2 wave(vec2 p, float t) {
        vec2 g = vec2(0.0);
        g += vec2(cos(p.x * 0.35 + t * 1.1), cos(p.y * 0.3 + t * 0.9)) * 0.06;
        g += vec2(cos((p.x + p.y) * 0.9 + t * 1.7), cos((p.x - p.y) * 0.8 + t * 1.4)) * 0.035;
        g += vec2(cos(p.x * 2.3 - t * 2.6 + p.y * 0.7), cos(p.y * 2.1 + t * 2.2)) * 0.018;
        return g;
      }
      void main() {
        float t = uTime;
        vec2 g = wave(vWorld.xz, t);
        // blocky voxel-ish ripples: quantise the normal a little
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(uCamPos - vWorld);
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(V, n), 0.0), 5.0);
        vec3 R = reflect(-V, n);
        vec3 sky = mix(uSkyHorizon, uSkyTop, clamp(R.y * 1.8, 0.0, 1.0));
        vec3 deep = vec3(0.06, 0.2, 0.25) * (uSkyTop + uSkyHorizon) * 0.9;
        float sh = sampleShadow(vShadow, 1.0);
        vec3 col = mix(deep + uSunColor * 0.03, sky, fres);
        float spec = pow(max(dot(R, uTrueSun), 0.0), 220.0) * 6.0 * (1.0 - uNight) * sh;
        spec += pow(max(dot(R, uTrueSun), 0.0), 18.0) * 0.12 * (1.0 - uNight);
        col += vec3(1.0, 0.9, 0.7) * spec;
        // moon & city-light glitter at night
        col += uSkyTop * 0.4 * uNight;
        // point lights reflected (lamps along the quay)
        col += pointLights(vWorld, n, 0.0) * 0.35;
        col = applyFog(col, vWorld);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, WATER_Y, 0);
  mesh.layers.set(1);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  scene.add(mesh);
  // dark sea bed so looking through gaps under piers isn't a void
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0b1a1e }));
  bed.position.y = WATER_Y - 6; bed.layers.set(1); scene.add(bed);
  return mesh;
}
