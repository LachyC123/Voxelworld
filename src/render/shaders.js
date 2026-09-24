// Shared GLSL + material factories. All world/prop/character shading goes through
// the same lighting model: sun (with shadow map) + sky hemisphere (scaled by AO and
// by how "indoors" a surface is) + room lamp light + nearby point lights + emissive, then fog.
import * as THREE from 'three';
import { VS } from '../core/config.js';

export const MAX_LIGHTS = 24;

export function createCommonUniforms() {
  const lp = [], lc = [];
  for (let i = 0; i < MAX_LIGHTS; i++) { lp.push(new THREE.Vector4(0, -1000, 0, 1)); lc.push(new THREE.Vector4(0, 0, 0, 0)); }
  return {
    uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
    uSunColor: { value: new THREE.Color(1, 0.95, 0.85) },
    uSkyAmb: { value: new THREE.Color(0.45, 0.55, 0.7) },
    uGroundAmb: { value: new THREE.Color(0.3, 0.26, 0.2) },
    uFogColor: { value: new THREE.Color(0.7, 0.75, 0.8) },
    uFogDensity: { value: 0.0022 },
    uTime: { value: 0 },
    uNight: { value: 0 },
    uShadowMap: { value: null },
    uShadowMatrix: { value: new THREE.Matrix4() },
    uShadowTexel: { value: 1 / 2048 },
    uShadowOn: { value: 0 },
    uShadowBias: { value: 0.0006 },
    uLightPos: { value: lp },
    uLightCol: { value: lc },
    uNumLights: { value: 0 },
    uRoomTex: { value: null },
    uCamPos: { value: new THREE.Vector3() },
    uMatTex: { value: null },
    uIndoorView: { value: 0 },
    uDebug: { value: 0 },
  };
}

export const GLSL_COMMON = /* glsl */`
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyAmb;
uniform vec3 uGroundAmb;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uTime;
uniform float uNight;
uniform sampler2DShadow uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowTexel;
uniform float uShadowOn;
uniform float uShadowBias;
uniform vec4 uLightPos[${MAX_LIGHTS}];
uniform vec4 uLightCol[${MAX_LIGHTS}];
uniform int uNumLights;
uniform sampler2D uRoomTex;
uniform vec3 uCamPos;
uniform int uDebug;

uint ihash(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
float hash3i(ivec3 c) { return float(ihash(uint(c.x) * 73856093u ^ ihash(uint(c.y) * 19349663u ^ ihash(uint(c.z) * 83492791u)))) / 4294967295.0; }
float hash2f(vec2 p) { return hash3i(ivec3(floor(p), 17)); }

float sampleShadow(vec4 sc, float ndl) {
  if (uShadowOn < 0.5) return 1.0;
  vec3 c = sc.xyz / sc.w;
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  float bias = uShadowBias * (1.0 + 2.0 * (1.0 - ndl));
  float z = c.z - bias;
  float t = uShadowTexel;
  float s = 0.0;
  s += texture(uShadowMap, vec3(c.xy, z));
  s += texture(uShadowMap, vec3(c.xy + vec2(-t, -t) * 1.2, z));
  s += texture(uShadowMap, vec3(c.xy + vec2(t, -t) * 1.2, z));
  s += texture(uShadowMap, vec3(c.xy + vec2(-t, t) * 1.2, z));
  s += texture(uShadowMap, vec3(c.xy + vec2(t, t) * 1.2, z));
  s /= 5.0;
  // fade out at shadow-map border
  vec2 e = min(c.xy, 1.0 - c.xy);
  float edge = clamp(min(e.x, e.y) * 20.0, 0.0, 1.0);
  return mix(1.0, s, edge);
}

// returns room light rgb (already scaled) in .rgb and sky leak in .a
vec4 roomLight(float room) {
  int r = int(room + 0.5);
  return texelFetch(uRoomTex, ivec2(r & 255, r >> 8), 0);
}

vec3 pointLights(vec3 wp, vec3 n, float room) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uNumLights) break;
    vec4 lp = uLightPos[i];
    vec4 lc = uLightCol[i];
    if (abs(lc.w - room) > 0.5) continue;
    vec3 L = lp.xyz - wp;
    float d2 = dot(L, L);
    float r = lp.w;
    if (d2 > r * r) continue;
    float d = sqrt(d2);
    float att = 1.0 - d / r; att *= att;
    float ndl = max(dot(n, L / max(d, 0.001)), 0.0) * 0.85 + 0.15;
    acc += lc.rgb * att * ndl;
  }
  return acc;
}

vec3 applyLighting(vec3 albedo, vec3 n, vec3 wp, float ao, float room, vec4 shadowCoord, float spec, float sunMask) {
  vec4 rl = roomLight(room);
  float ndl = max(dot(n, uSunDir), 0.0);
  float sh = ndl > 0.0 ? sampleShadow(shadowCoord, ndl) : 0.0;
  // indoor surfaces only receive the sun through the shadow map (i.e. through windows)
  vec3 sun = uSunColor * ndl * sh * sunMask;
  float hemi = n.y * 0.5 + 0.5;
  vec3 amb = mix(uGroundAmb, uSkyAmb, hemi) * rl.a;
  float aoF = 0.35 + 0.65 * ao;
  vec3 lamp = rl.rgb * (0.75 + 0.25 * hemi) * 1.6;
  vec3 pl = pointLights(wp, n, room);
  vec3 col = albedo * (sun + (amb + lamp) * aoF + pl);
  if (spec > 0.0) {
    vec3 V = normalize(uCamPos - wp);
    vec3 H = normalize(V + uSunDir);
    float sp = pow(max(dot(n, H), 0.0), 40.0) * spec * sh * ndl;
    col += uSunColor * sp * 0.6;
  }
  return col;
}

vec3 applyFog(vec3 col, vec3 wp) {
  float d = length(wp - uCamPos);
  float f = 1.0 - exp(-max(0.0, d - 30.0) * uFogDensity * 0.45);
  f = f * f * (3.0 - 2.0 * f) * 0.85;
  return mix(col, uFogColor, clamp(f, 0.0, 1.0));
}
`;

// ---------------------------------------------------------------- world voxel material
const WORLD_VERT = /* glsl */`
attribute vec4 aData;
attribute float aRoom;
uniform mat4 uShadowMatrix;
varying vec3 vWorld;
varying vec4 vShadow;
varying float vAO;
flat varying float vMat;
flat varying float vFace;
flat varying float vRoom;
flat varying float vFlags;
vec3 faceNormal(float f) {
  int i = int(f + 0.5);
  if (i == 0) return vec3(1.0, 0.0, 0.0);
  if (i == 1) return vec3(-1.0, 0.0, 0.0);
  if (i == 2) return vec3(0.0, 1.0, 0.0);
  if (i == 3) return vec3(0.0, -1.0, 0.0);
  if (i == 4) return vec3(0.0, 0.0, 1.0);
  return vec3(0.0, 0.0, -1.0);
}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec3 n = faceNormal(aData.y);
  vShadow = uShadowMatrix * vec4(wp.xyz + n * 0.06, 1.0);
  vAO = aData.z / 3.0;
  vMat = aData.x; vFace = aData.y; vRoom = aRoom; vFlags = aData.w;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const GLSL_PATTERNS = /* glsl */`
uniform sampler2D uMatTex;
const float VSZ = ${VS.toFixed(4)};

float lineMask(float x, float w) {
  // anti-aliased grid line at integer x, width w (fraction of a cell); fades when sub-pixel
  float fw = fwidth(x);
  float f = fract(x); float d = min(f, 1.0 - f);
  float aa = max(fw, 1e-4);
  float m = 1.0 - smoothstep(w - aa, w + aa, d);
  return m * clamp(1.0 - (fw - w) / (w * 2.0 + 1e-4), 0.0, 1.0) + w * 2.0 * clamp((fw - w) / (w * 2.0 + 1e-4), 0.0, 1.0);
}

vec3 matColor(int mat, vec3 wp, vec3 n, float dist, out float emissive, out int emode, out float spec) {
  vec4 t0 = texelFetch(uMatTex, ivec2(mat, 0), 0);
  vec4 t1 = texelFetch(uMatTex, ivec2(mat, 1), 0);
  vec4 t2 = texelFetch(uMatTex, ivec2(mat, 2), 0);
  vec3 c1 = t0.rgb * t0.rgb; // approx sRGB -> linear
  vec3 c2 = t1.rgb * t1.rgb;
  float jit = t0.a * 0.5;
  int pat = int(t1.a * 255.0 + 0.5);
  emissive = t2.r * 1.5; emode = int(t2.g * 255.0 + 0.5); spec = t2.b;
  vec3 vox = wp / VSZ;
  ivec3 cell = ivec3(floor(vox - n * 0.5));
  float h = hash3i(cell);
  // face-plane coordinates in voxel units
  vec2 fp; bool vert = abs(n.y) < 0.5;
  if (abs(n.x) > 0.5) fp = vec2(vox.z, vox.y); else if (abs(n.y) > 0.5) fp = vec2(vox.x, vox.z); else fp = vec2(vox.x, vox.y);
  float detail = clamp(1.0 - (dist - 18.0) / 70.0, 0.0, 1.0);
  vec3 col = c1 * (1.0 + (h - 0.5) * jit);
  if (pat == 0) return col;
  if (pat == 1) { // brick
    if (!vert) return col;
    float rows = 3.0, blen = 0.75;
    float rv = fp.y * rows;
    float row = floor(rv);
    float u = fp.x / blen + mod(row, 2.0) * 0.5;
    float bid = floor(u);
    float bh = hash3i(ivec3(int(bid), int(row), cell.x * 7 + cell.z * 13));
    vec3 b = c1 * (0.9 + bh * 0.22) * (1.0 + (h - 0.5) * jit * 0.5);
    float m = max(lineMask(rv, 0.09), lineMask(u, 0.05));
    return mix(mix(b, c1 * 0.95 + c2 * 0.05, 1.0 - detail), c2, m * detail * 0.85);
  }
  if (pat == 2 || pat == 3) { // planks
    vec2 q = fp;
    if (vert) q = vec2(fp.x, fp.y);
    else if (pat == 3) q = vec2(fp.y, fp.x);
    float across = vert ? q.y * 2.0 : q.y * 2.0;
    float board = floor(across);
    float off = hash3i(ivec3(int(board), 3, 9)) * 4.0;
    float along = (q.x + off) / 4.0;
    float seg = floor(along);
    float bh = hash3i(ivec3(int(board), int(seg), 5));
    vec3 b = mix(c1, c2, bh * 0.7) * (1.0 + (h - 0.5) * jit * 0.4);
    float m = max(lineMask(across, 0.06), lineMask(along, 0.012));
    return mix(b, b * 0.55, m * detail);
  }
  if (pat == 4) { return ((cell.x + cell.y + cell.z) & 1) == 0 ? c1 : c2 * (1.0 + (h - 0.5) * 0.05); }
  if (pat == 22) { int k = ((cell.x >> 1) + (cell.y >> 1) + (cell.z >> 1)) & 1; return (k == 0 ? c1 : c2) * (1.0 + (h - 0.5) * 0.04); }
  if (pat == 5) { // stripes (book spines etc.)
    float s = vert ? floor(fp.x * 4.0) : float(cell.x + cell.z);
    float sh = hash3i(ivec3(int(s), cell.y, 3));
    vec3 a = mix(c1, c2, step(0.5, sh));
    return a * (0.7 + sh * 0.5);
  }
  if (pat == 6) { // clapboard
    if (!vert) return col;
    float f = fract(fp.y * 2.0);
    return col * mix(1.0, 0.72 + 0.28 * smoothstep(0.0, 0.35, f), detail * 0.9 + 0.1);
  }
  if (pat == 7) { // shingles
    float rv = (vert ? fp.y : fp.y) * 2.0;
    float row = floor(rv);
    float u = fp.x * 2.0 + mod(row, 2.0) * 0.5;
    float sh = hash3i(ivec3(int(floor(u)), int(row), 11));
    vec3 b = mix(c1, c2, sh) * (0.9 + sh * 0.2);
    float edge = 1.0 - smoothstep(0.0, 0.25, fract(rv));
    float seam = lineMask(u, 0.04);
    return mix(b, b * 0.6, max(edge * 0.6, seam) * detail);
  }
  if (pat == 8) { float m = max(lineMask(fp.x * 2.0, 0.05), lineMask(fp.y * 2.0, 0.05)); return mix(col, c2, m * detail); }
  if (pat == 9) { if (!vert) return col; float s = mod(floor(fp.x * 4.0), 2.0); return mix(c1, c2, s * detail); }
  if (pat == 10) { if (!vert) return col; vec2 g = fract(fp * 2.0 + vec2(mod(floor(fp.y * 2.0), 2.0) * 0.5, 0.0)) - 0.5; float d = length(g); return mix(c1, c2, (1.0 - smoothstep(0.1, 0.16, d)) * detail); }
  if (pat == 11) { // stone blocks
    float rv = fp.y; float row = floor(rv);
    float u = fp.x / 2.0 + mod(row, 2.0) * 0.5;
    if (!vert) { rv = fp.y; u = fp.x / 2.0 + mod(floor(fp.y), 2.0) * 0.5; }
    float bh = hash3i(ivec3(int(floor(u)), int(row), 21));
    vec3 b = mix(c1, c2, bh * 0.6) * (1.0 + (h - 0.5) * jit * 0.4);
    float m = max(lineMask(rv, 0.03), lineMask(u, 0.015));
    return mix(b, b * 0.7, m * detail);
  }
  if (pat == 12 || pat == 21) { // noise / leaves
    ivec3 sub = ivec3(floor(vox * 2.0));
    float s = hash3i(sub);
    vec3 a = mix(c1, c2, step(0.55, h));
    a *= 1.0 + (s - 0.5) * jit * 0.8 * detail;
    if (pat == 21) a *= mix(1.0, 0.55 + s * 0.45, 0.6 * detail);
    return a * (1.0 + (h - 0.5) * jit);
  }
  if (pat == 13) { // cobbles
    vec2 q = fp * 2.0;
    vec2 g = fract(q) - 0.5;
    float sh = hash3i(ivec3(ivec2(floor(q)), 31));
    vec3 b = mix(c1, c2, sh * 0.8) * (0.85 + sh * 0.3);
    float d = max(abs(g.x), abs(g.y));
    return mix(b, c2 * 0.55, smoothstep(0.36, 0.48, d) * detail);
  }
  if (pat == 14) { ivec3 sub = ivec3(floor(vox * 8.0)); float s = hash3i(sub); return col * (1.0 + (s - 0.5) * 0.18 * detail); }
  if (pat == 15) { return c1; }
  if (pat == 16) { if (!vert) return col; float m = lineMask(fp.x * 2.0, 0.06); float bh = hash3i(ivec3(int(floor(fp.x * 2.0)), 1, 2)); vec3 b = mix(c1, c2, bh * 0.6); return mix(b, b * 0.5, m * detail); }
  if (pat == 17 || pat == 19) { ivec3 sub = ivec3(floor(vox * 4.0)); float s = hash3i(sub); return mix(col, c2, step(0.7, s) * 0.8 * detail) * (1.0 + (s - 0.5) * 0.12 * detail); }
  if (pat == 18) { // sidewalk slabs
    vec2 q = fp / 4.0;
    float sh = hash3i(ivec3(ivec2(floor(q)), 41));
    vec3 b = c1 * (0.94 + sh * 0.1) * (1.0 + (h - 0.5) * jit * 0.4);
    float m = max(lineMask(q.x, 0.012), lineMask(q.y, 0.012));
    if (vert) m = 0.0;
    return mix(b, c2 * 0.8, m * detail);
  }
  if (pat == 20) { // brick pavers
    float rv = fp.y * 2.0; float row = floor(rv);
    float u = fp.x + mod(row, 2.0) * 0.5;
    float bh = hash3i(ivec3(int(floor(u)), int(row), 51));
    vec3 b = mix(c1, c2, bh) * (0.9 + bh * 0.15);
    float m = max(lineMask(rv, 0.06), lineMask(u, 0.04));
    return mix(b, vec3(0.45, 0.42, 0.38) * 0.6, m * detail * 0.8);
  }
  if (pat == 23) { float s = hash3i(ivec3(int(floor((vert ? fp.x : fp.x) * 8.0)), cell.y, 61)); return col * (1.0 + (s - 0.5) * 0.08 * detail); }
  if (pat == 24) { float v = sin(fp.x * 1.7 + sin(fp.y * 2.3) * 1.5 + h * 2.0) * 0.5 + 0.5; return mix(c1, c2, smoothstep(0.85, 1.0, v) * 0.8); }
  if (pat == 25) { ivec3 sub = ivec3(floor(vox * 6.0)); float s = hash3i(sub); vec3 chip = s > 0.93 ? vec3(0.5, 0.3, 0.2) : (s > 0.86 ? c2 : c1); return chip * (1.0 + (h - 0.5) * 0.05); }
  return col;
}

vec3 emissiveColor(vec3 base, float emissive, int emode, vec3 wp, float room) {
  if (emissive <= 0.0) return vec3(0.0);
  float k = 1.0;
  if (emode == 2) k = mix(0.12, 1.0, uNight);
  else if (emode == 3) { float fl = step(0.03, fract(sin(floor(uTime * 7.0) + wp.x * 0.1) * 43758.5)); k = mix(0.25, 1.0, uNight) * mix(0.6, 1.0, fl); }
  else if (emode == 4) { float t = uTime; float f = 0.6 + 0.25 * sin(t * 13.0 + sin(t * 3.1) * 4.0) + 0.15 * sin(t * 31.0); return vec3(0.55, 0.7, 0.9) * f * emissive * 1.4; }
  else if (emode == 5) { float f = 0.75 + 0.25 * sin(uTime * 17.0 + wp.x * 3.0) * sin(uTime * 11.0 + wp.z * 2.0); return base * f * emissive * 1.6; }
  else if (emode == 6) {
    // movie screen: slowly changing grainy black-and-white picture
    float t = floor(uTime * 12.0);
    vec2 p = wp.xy * 0.7 + wp.zy * 0.7;
    float scene = floor(uTime / 7.0);
    float img = 0.55 + 0.35 * sin(p.x * (1.0 + mod(scene, 3.0)) + scene) * cos(p.y * 1.3 + scene * 0.7);
    img += (fract(sin(dot(floor(wp * 20.0), vec3(12.9, 78.2, 37.7)) + t) * 43758.5) - 0.5) * 0.12;
    return vec3(img) * emissive * 1.2;
  }
  return base * emissive * k;
}
`;

const WORLD_FRAG = /* glsl */`
${GLSL_COMMON}
${GLSL_PATTERNS}
varying vec3 vWorld;
varying vec4 vShadow;
varying float vAO;
flat varying float vMat;
flat varying float vFace;
flat varying float vRoom;
flat varying float vFlags;
vec3 faceNormalF(float f) {
  int i = int(f + 0.5);
  if (i == 0) return vec3(1.0, 0.0, 0.0);
  if (i == 1) return vec3(-1.0, 0.0, 0.0);
  if (i == 2) return vec3(0.0, 1.0, 0.0);
  if (i == 3) return vec3(0.0, -1.0, 0.0);
  if (i == 4) return vec3(0.0, 0.0, 1.0);
  return vec3(0.0, 0.0, -1.0);
}
void main() {
  vec3 n = faceNormalF(vFace);
  float dist = length(vWorld - uCamPos);
  float em; int emode; float spec;
  vec3 albedo = matColor(int(vMat + 0.5), vWorld, n, dist, em, emode, spec);
  float ao = vAO * vAO * (3.0 - 2.0 * vAO);
  vec3 col = applyLighting(albedo, n, vWorld, ao, vRoom, vShadow, spec, 1.0);
  col += emissiveColor(albedo, em, emode, vWorld, vRoom);
  col = applyFog(col, vWorld);
  if (uDebug == 1) col = vec3(fract(vRoom * 0.37), fract(vRoom * 0.71), vRoom > 0.5 ? 1.0 : 0.0);
  if (uDebug == 2) col = vec3(sampleShadow(vShadow, 1.0));
  if (uDebug == 3) col = vec3(ao);
  if (uDebug == 4) col = roomLight(vRoom).aaa;
  if (uDebug == 5) col = albedo;
  if (uDebug == 6) col = applyLighting(vec3(0.5), n, vWorld, ao, vRoom, vShadow, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------- glass
const GLASS_FRAG = /* glsl */`
${GLSL_COMMON}
${GLSL_PATTERNS}
varying vec3 vWorld;
varying vec4 vShadow;
varying float vAO;
flat varying float vMat;
flat varying float vFace;
flat varying float vRoom;
flat varying float vFlags;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
vec3 faceNormalF(float f) {
  int i = int(f + 0.5);
  if (i == 0) return vec3(1.0, 0.0, 0.0);
  if (i == 1) return vec3(-1.0, 0.0, 0.0);
  if (i == 2) return vec3(0.0, 1.0, 0.0);
  if (i == 3) return vec3(0.0, -1.0, 0.0);
  if (i == 4) return vec3(0.0, 0.0, 1.0);
  return vec3(0.0, 0.0, -1.0);
}
void main() {
  vec3 n = faceNormalF(vFace);
  float dist = length(vWorld - uCamPos);
  float em; int emode; float spec;
  int mat = int(vMat + 0.5);
  vec3 tint = matColor(mat, vWorld, n, dist, em, emode, spec);
  vec4 t2 = texelFetch(uMatTex, ivec2(mat, 2), 0);
  bool water = t2.a * 255.0 > 1.5;
  vec3 V = normalize(uCamPos - vWorld);
  float fres = pow(1.0 - clamp(abs(dot(V, n)), 0.0, 1.0), 3.0);
  vec3 R = reflect(-V, n);
  vec3 sky = mix(uSkyHorizon, uSkyTop, clamp(R.y * 1.5, 0.0, 1.0));
  vec4 rl = roomLight(vRoom);
  bool inner = vFlags > 0.5;
  float stained = step(0.2, t2.r) ; // unused
  vec3 col; float alpha;
  float lum = max(max(tint.r, tint.g), tint.b);
  bool coloured = (tint.r > tint.g * 1.6 || tint.b > tint.r * 1.6 || tint.g > tint.b * 1.8) && !water;
  if (water) {
    vec2 p = vWorld.xz * 3.0;
    float w = sin(p.x + uTime * 2.0) * sin(p.y * 1.3 + uTime * 1.7) * 0.5 + 0.5;
    col = tint * (0.5 + 0.5 * uSunColor) + sky * 0.4 + w * 0.08;
    alpha = 0.72;
  } else if (coloured) {
    // stained glass: glows with daylight when seen from inside
    float day = max(0.0, 1.0 - uNight);
    vec3 glow = tint * (inner ? (1.3 * day + 0.05) : (0.18 + rl.r * 0.9));
    col = glow + sky * fres * 0.25;
    alpha = inner ? 0.9 : 0.85;
  } else {
    vec3 refl = sky * (0.25 + 0.75 * fres);
    float sunSpec = pow(max(dot(R, uSunDir), 0.0), 200.0) * 3.0 * (1.0 - uNight);
    if (inner) {
      col = tint * 0.25 + refl * 0.15;
      alpha = 0.12 + fres * 0.3;
    } else {
      // lamplight glow of the room behind the pane
      vec3 lampGlow = rl.rgb * 0.9;
      col = tint * 0.18 + refl * 0.8 + uSunColor * sunSpec + lampGlow;
      alpha = clamp(0.35 + fres * 0.45 + dot(lampGlow, vec3(0.3)), 0.0, 0.92);
    }
  }
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createWorldMaterial(common) {
  return new THREE.ShaderMaterial({
    uniforms: common,
    vertexShader: WORLD_VERT,
    fragmentShader: WORLD_FRAG,
  });
}

export function createGlassMaterial(common, skyUniforms) {
  return new THREE.ShaderMaterial({
    uniforms: { ...common, ...skyUniforms },
    vertexShader: WORLD_VERT,
    fragmentShader: GLASS_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

// ---------------------------------------------------------------- props (instanced voxel models)
const PROP_VERT = /* glsl */`
attribute vec4 aCol;      // rgb + ao (0..255)
attribute vec2 aInfo;     // tint slot, emissive (0..255)
#ifdef USE_INSTANCING
attribute vec4 iTintA;    // rgb + room lo
attribute vec4 iTintB;    // rgb + room hi
#else
uniform vec4 iTintAU;
uniform vec4 iTintBU;
#endif
uniform mat4 uShadowMatrix;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vShadow;
varying vec3 vColor;
varying float vAO;
varying float vEmit;
flat varying float vRoom;
void main() {
  #ifdef USE_INSTANCING
  vec4 ta = iTintA; vec4 tb = iTintB;
  mat4 im = instanceMatrix;
  #else
  vec4 ta = iTintAU; vec4 tb = iTintBU;
  mat4 im = mat4(1.0);
  #endif
  vec4 wp = modelMatrix * im * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec3 nrm = normalize(mat3(modelMatrix) * mat3(im) * normal);
  vNormal = nrm;
  vShadow = uShadowMatrix * vec4(wp.xyz + nrm * 0.03, 1.0);
  vec3 raw = aCol.rgb / 255.0;
  vec3 c = raw * raw;
  int slot = int(aInfo.x + 0.5);
  if (slot == 1) c = ta.rgb * ta.rgb * (raw.r * 2.0);
  else if (slot == 2) c = tb.rgb * tb.rgb * (raw.r * 2.0);
  vColor = c;
  vAO = aCol.a / 255.0;
  vEmit = aInfo.y / 255.0;
  vRoom = floor(ta.a * 255.0 + 0.5) + floor(tb.a * 255.0 + 0.5) * 256.0;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const PROP_FRAG = /* glsl */`
${GLSL_COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vShadow;
varying vec3 vColor;
varying float vAO;
varying float vEmit;
flat varying float vRoom;
uniform float uEmitNightOnly;
void main() {
  vec3 n = normalize(vNormal);
  float ao = vAO;
  vec3 col = applyLighting(vColor, n, vWorld, ao, vRoom, vShadow, 0.1, 1.0);
  if (vEmit > 0.0) {
    float k = vEmit > 0.9 ? 1.0 : mix(0.15, 1.0, uNight);
    col += vColor * vEmit * 1.6 * k;
  }
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createPropMaterial(common) {
  return new THREE.ShaderMaterial({
    uniforms: { ...common, iTintAU: { value: new THREE.Vector4(1, 1, 1, 0) }, iTintBU: { value: new THREE.Vector4(1, 1, 1, 0) }, uEmitNightOnly: { value: 1 } },
    vertexShader: PROP_VERT,
    fragmentShader: PROP_FRAG,
  });
}
