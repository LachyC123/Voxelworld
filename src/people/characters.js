// Instanced box-people. Each body part type is one InstancedMesh; faces/outfits come
// from palette-indexed pixel atlases and each character owns a 16-colour palette row.
import * as THREE from 'three';
import { GLSL_COMMON } from '../render/shaders.js';
import { buildHeadAtlas, buildTorsoAtlas, buildArmAtlas, buildThighAtlas, buildShinAtlas, buildFlatAtlas, headStyle, ATLAS_CELL, ATLAS_COLS } from './atlas.js';
import { hexToRgb } from '../core/util.js';

// adult dimensions (metres)
export const DIM = {
  head: [0.36, 0.34, 0.34], torso: [0.44, 0.56, 0.24], arm: [0.13, 0.56, 0.14], thigh: [0.18, 0.4, 0.2], shin: [0.17, 0.42, 0.2],
  hipY: 0.82, hipX: 0.1, shoulderX: 0.285,
};

const VERT = /* glsl */`
attribute vec4 iInfo; // style, char row, room, shadeBoost
attribute float aFace;
uniform mat4 uShadowMatrix;
varying vec3 vWorld; varying vec3 vNormal; varying vec4 vShadow; varying vec2 vUv;
flat varying float vFace; flat varying float vStyle; flat varying float vChar; flat varying float vRoom;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vShadow = uShadowMatrix * vec4(wp.xyz + vNormal * 0.02, 1.0);
  vUv = uv; vFace = aFace; vStyle = iInfo.x; vChar = iInfo.y; vRoom = iInfo.z;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const FRAG = /* glsl */`
${GLSL_COMMON}
uniform sampler2D uAtlas;
uniform sampler2D uPal;
varying vec3 vWorld; varying vec3 vNormal; varying vec4 vShadow; varying vec2 vUv;
flat varying float vFace; flat varying float vStyle; flat varying float vChar; flat varying float vRoom;
void main() {
  int cell = int(vStyle + 0.5) * 6 + int(vFace + 0.5);
  int cx = (cell % ${ATLAS_COLS}) * ${ATLAS_CELL}, cy = (cell / ${ATLAS_COLS}) * ${ATLAS_CELL};
  int px = cx + clamp(int(vUv.x * ${ATLAS_CELL}.0), 0, ${ATLAS_CELL - 1});
  int py = cy + clamp(int((1.0 - vUv.y) * ${ATLAS_CELL}.0), 0, ${ATLAS_CELL - 1});
  vec4 a = texelFetch(uAtlas, ivec2(px, py), 0);
  int slot = int(a.r * 255.0 + 0.5);
  float shade = a.g * 255.0 / 128.0;
  vec3 c = texelFetch(uPal, ivec2(slot, int(vChar + 0.5)), 0).rgb;
  c = c * c * shade;
  vec3 n = normalize(vNormal);
  vec3 col = applyLighting(c, n, vWorld, 0.9, vRoom, vShadow, 0.0, 1.0);
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function atlasTexture(A) {
  const t = new THREE.DataTexture(A.data, A.w, A.h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

function boxGeo() {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const faces = new Float32Array(24);
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) faces[f * 4 + v] = f;
  g.setAttribute('aFace', new THREE.BufferAttribute(faces, 1));
  return g;
}

const PART_KINDS = ['head', 'torso', 'arm', 'thigh', 'shin', 'flat'];

export class Characters {
  constructor(scene, common, props, maxChars = 2400) {
    this.scene = scene; this.common = common; this.props = props;
    this.max = maxChars;
    this.list = [];
    this.pal = new Uint8Array(16 * maxChars * 4);
    this.palTex = new THREE.DataTexture(this.pal, 16, maxChars, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.palTex.minFilter = THREE.NearestFilter; this.palTex.magFilter = THREE.NearestFilter; this.palTex.generateMipmaps = false;
    const atlases = { head: buildHeadAtlas(), torso: buildTorsoAtlas(), arm: buildArmAtlas(), thigh: buildThighAtlas(), shin: buildShinAtlas(), flat: buildFlatAtlas() };
    const perChar = { head: 1, torso: 1, arm: 2, thigh: 2, shin: 2, flat: 2 };
    this.parts = {};
    for (const k of PART_KINDS) {
      const mat = new THREE.ShaderMaterial({ uniforms: { ...common, uAtlas: { value: atlasTexture(atlases[k]) }, uPal: { value: this.palTex } }, vertexShader: VERT, fragmentShader: FRAG });
      const geo = boxGeo();
      const cap = maxChars * perChar[k];
      const info = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
      info.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('iInfo', info);
      const mesh = new THREE.InstancedMesh(geo, mat, cap);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false; mesh.count = 0; mesh.name = 'people:' + k;
      scene.add(mesh);
      this.parts[k] = { mesh, info, n: 0 };
    }
    // temporaries
    this._m = [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()];
    this._t = new THREE.Matrix4(); this._r = new THREE.Matrix4(); this._s = new THREE.Matrix4();
  }

  // look: { skin, hair, top, top2, accent, bottom, shoes, eye?, hairStyle, face, torso, arm, thigh, shin, skirt: 0|1|2, hairBack, scale, hat, hatTint, hatTint2 }
  create(look) {
    const id = this.list.length;
    if (id >= this.max) throw new Error('too many characters');
    const cols = [look.skin, look.hair, look.top, look.top2 || '#e8e4d8', look.accent || '#7a2a2a', look.bottom, look.shoes || '#2a2420', look.eye || '#1c1a22', '#f4f1ea', look.lips || '#b05a50', look.blush || '#e0907e', look.socks || look.skin, look.frame || '#2a2a2e', look.beard || look.hair, '#1a1a1e', '#d9b24a'];
    for (let i = 0; i < 16; i++) { const c = hexToRgb(cols[i] || '#ff00ff'); const o = (id * 16 + i) * 4; this.pal[o] = c[0]; this.pal[o + 1] = c[1]; this.pal[o + 2] = c[2]; this.pal[o + 3] = 255; }
    this.palTex.needsUpdate = true;
    const ch = {
      id, look, scale: look.scale || 1,
      pose: { x: 0, y: -100, z: 0, yaw: 0, visible: false, room: 0, lean: 0, headYaw: 0, headPitch: 0, aLp: 0, aLr: 0, aRp: 0, aRr: 0, hL: 0, hR: 0, kL: 0, kR: 0, bob: 0, lie: 0, mouth: 0, blink: 0, held: null, roll: 0 },
      hat: null, held: null, heldName: null,
    };
    ch.baseLook = look; ch.costume = null;
    if (look.hat) { ch.hat = this.props.addDynamic(look.hat, { tint: look.hatTint || '#3a3a40', tint2: look.hatTint2 || '#1a1a1e' }); ch._hats = { [look.hat + (look.hatTint || '')]: ch.hat }; }
    if (ch.hat) ch.hat.visible = false;
    this.list.push(ch);
    return ch;
  }

  _writePalette(ch, look) {
    const id = ch.id;
    const cols = [look.skin, look.hair, look.top, look.top2 || '#e8e4d8', look.accent || '#7a2a2a', look.bottom, look.shoes || '#2a2420', look.eye || '#1c1a22', '#f4f1ea', look.lips || '#b05a50', look.blush || '#e0907e', look.socks || look.skin, look.frame || '#2a2a2e', look.beard || look.hair, '#1a1a1e', '#d9b24a'];
    for (let i = 0; i < 16; i++) { const c = hexToRgb(cols[i] || '#ff00ff'); const o = (id * 16 + i) * 4; this.pal[o] = c[0]; this.pal[o + 1] = c[1]; this.pal[o + 2] = c[2]; this.pal[o + 3] = 255; }
    this.palTex.needsUpdate = true;
  }
  // Temporarily dress a character differently (party hat, choir robe, band uniform). null restores.
  setCostume(ch, costume) {
    if (ch.costume === costume) return;
    ch.costume = costume;
    const look = costume ? { ...ch.baseLook, ...costume } : ch.baseLook;
    ch.look = look;
    this._writePalette(ch, look);
    const hatName = look.hat || null;
    if (ch.hat) ch.hat.visible = false;
    if (hatName) {
      ch._hats = ch._hats || {};
      let h = ch._hats[hatName + (look.hatTint || '')];
      if (!h) { h = this.props.addDynamic(hatName, { tint: look.hatTint || '#3a3a40', tint2: look.hatTint2 || '#1a1a1e' }); ch._hats[hatName + (look.hatTint || '')] = h; this.props.ensureMeshes(); }
      ch.hat = h;
    } else ch.hat = null;
  }

  setHeld(ch, name, tint) {
    if (ch.heldName === name) return;
    if (ch.held) ch.held.visible = false;
    ch.heldName = name;
    if (!name) { ch.held = null; return; }
    ch._heldCache = ch._heldCache || {};
    let h = ch._heldCache[name];
    if (!h) { h = this.props.addDynamic(name, { tint }); ch._heldCache[name] = h; this.props.ensureMeshes(); }
    h.visible = true; ch.held = h;
  }

  _put(kind, m, style, ch, room) {
    const P = this.parts[kind];
    const i = P.n++;
    m.toArray(P.mesh.instanceMatrix.array, i * 16);
    const a = P.info.array; a[i * 4] = style; a[i * 4 + 1] = ch.id; a[i * 4 + 2] = room; a[i * 4 + 3] = 0;
  }

  update() {
    for (const k of PART_KINDS) this.parts[k].n = 0;
    const [root, hip, tmp, tmp2, shoulder] = this._m;
    const T = this._t, R = this._r, Sm = this._s;
    for (const ch of this.list) {
      const p = ch.pose, L = ch.look;
      if (!p.visible) { if (ch.hat) ch.hat.visible = false; if (ch.held) ch.held.visible = false; continue; }
      const s = ch.scale;
      // root: feet position, yaw, optional lying rotation
      root.makeTranslation(p.x, p.y + p.bob, p.z);
      root.multiply(R.makeRotationY(p.yaw));
      if (p.lie) { root.multiply(T.makeTranslation(0, 0.18 * s, 0)); root.multiply(R.makeRotationX(-Math.PI / 2 * p.lie)); root.multiply(T.makeTranslation(0, -DIM.hipY * s * 0.0, 0)); }
      if (p.roll) root.multiply(R.makeRotationZ(p.roll));
      root.multiply(Sm.makeScale(s, s, s));
      const hy = DIM.hipY;
      // torso
      hip.copy(root).multiply(T.makeTranslation(0, hy, 0)).multiply(R.makeRotationX(p.lean));
      tmp.copy(hip).multiply(T.makeTranslation(0, DIM.torso[1] / 2, 0)).multiply(Sm.makeScale(DIM.torso[0], DIM.torso[1], DIM.torso[2]));
      this._put('torso', tmp, L.torso, ch, p.room);
      // head
      tmp.copy(hip).multiply(T.makeTranslation(0, DIM.torso[1], 0)).multiply(R.makeRotationY(p.headYaw)).multiply(R.makeRotationX(p.headPitch));
      shoulder.copy(tmp); // head frame (for hat)
      tmp.multiply(T.makeTranslation(0, DIM.head[1] / 2, 0.01)).multiply(Sm.makeScale(DIM.head[0], DIM.head[1], DIM.head[2]));
      const hs = headStyle(L.hairStyle, L.face, p.mouth ? 1 : 0, p.blink ? 1 : 0);
      this._put('head', tmp, hs, ch, p.room);
      if (L.hairBack) {
        tmp.copy(shoulder).multiply(T.makeTranslation(0, DIM.head[1] * 0.15, -DIM.head[2] / 2 - 0.035)).multiply(Sm.makeScale(DIM.head[0] * 0.92, DIM.head[1] * 0.95, 0.07));
        this._put('flat', tmp, 0, ch, p.room);
      }
      if (ch.hat) {
        const h = ch.hat; h.visible = true; h.room = p.room;
        h.matrix = h.matrix || new THREE.Matrix4();
        h.matrix.copy(shoulder).multiply(T.makeTranslation(0, DIM.head[1] - 0.02, 0.01));
      }
      // arms
      for (const side of [-1, 1]) {
        const pitch = side < 0 ? p.aRp : p.aLp, roll = side < 0 ? p.aRr : p.aLr;
        tmp2.copy(hip).multiply(T.makeTranslation(side * DIM.shoulderX, DIM.torso[1] - 0.04, 0)).multiply(R.makeRotationX(pitch)).multiply(R.makeRotationZ(side * roll));
        tmp.copy(tmp2).multiply(T.makeTranslation(0, -DIM.arm[1] / 2 + 0.03, 0)).multiply(Sm.makeScale(DIM.arm[0], DIM.arm[1], DIM.arm[2]));
        this._put('arm', tmp, L.arm, ch, p.room);
        if (side < 0 && ch.held) {
          const h = ch.held; h.visible = true; h.room = p.room;
          h.matrix = h.matrix || new THREE.Matrix4();
          h.matrix.copy(tmp2).multiply(T.makeTranslation(0, -DIM.arm[1] + 0.02, 0.02));
        }
      }
      // legs
      for (const side of [-1, 1]) {
        const hp = side < 0 ? p.hR : p.hL, kn = side < 0 ? p.kR : p.kL;
        tmp2.copy(root).multiply(T.makeTranslation(side * DIM.hipX, hy, 0)).multiply(R.makeRotationX(hp));
        tmp.copy(tmp2).multiply(T.makeTranslation(0, -DIM.thigh[1] / 2, 0)).multiply(Sm.makeScale(DIM.thigh[0], DIM.thigh[1], DIM.thigh[2]));
        this._put('thigh', tmp, L.thigh, ch, p.room);
        tmp2.multiply(T.makeTranslation(0, -DIM.thigh[1], 0)).multiply(R.makeRotationX(kn));
        tmp.copy(tmp2).multiply(T.makeTranslation(0, -DIM.shin[1] / 2, 0.005)).multiply(Sm.makeScale(DIM.shin[0], DIM.shin[1], DIM.shin[2]));
        this._put('shin', tmp, L.shin, ch, p.room);
      }
      // skirt (follows hips, flares with leg spread)
      if (L.skirt) {
        const spread = Math.max(Math.abs(p.hL), Math.abs(p.hR));
        const sitting = Math.min(p.hL, p.hR) < -1.0;
        tmp.copy(root).multiply(T.makeTranslation(0, hy - (sitting ? 0.08 : 0.2), sitting ? 0.14 : 0));
        if (sitting) tmp.multiply(R.makeRotationX(-0.5));
        tmp.multiply(Sm.makeScale(0.46 + spread * 0.08, sitting ? 0.2 : 0.42, 0.28 + spread * 0.12 + (sitting ? 0.18 : 0)));
        this._put('flat', tmp, L.skirt === 2 ? 2 : L.skirt === 3 ? 3 : 1, ch, p.room);
      }
    }
    for (const k of PART_KINDS) {
      const P = this.parts[k];
      P.mesh.count = P.n;
      P.mesh.instanceMatrix.needsUpdate = true;
      P.info.needsUpdate = true;
    }
  }
}
