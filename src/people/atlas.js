// Procedural pixel-art atlases for character body parts. Each texel stores a palette
// SLOT in R (resolved per character in the shader) and a shade multiplier in G.
// Cells are 8x8; each style has 6 faces in BoxGeometry order: +x, -x, +y, -y, +z(front), -z(back).
export const SLOT = { SKIN: 0, HAIR: 1, TOP: 2, TOP2: 3, ACCENT: 4, BOTTOM: 5, SHOES: 6, EYE: 7, WHITE: 8, LIPS: 9, BLUSH: 10, SOCKS: 11, FRAME: 12, BEARD: 13, BLACK: 14, GOLD: 15 };
const S = SLOT;
const CELL = 8, COLS = 48;

class Atlas {
  constructor(nStyles) {
    this.cells = nStyles * 6;
    this.rows = Math.ceil(this.cells / COLS);
    this.w = COLS * CELL; this.h = this.rows * CELL;
    this.data = new Uint8Array(this.w * this.h * 4);
  }
  face(style, f) {
    const cell = style * 6 + f;
    const cx = (cell % COLS) * CELL, cy = Math.floor(cell / COLS) * CELL;
    const d = this.data, W = this.w;
    const api = {
      px(x, y, slot, shade = 1) {
        if (x < 0 || y < 0 || x >= CELL || y >= CELL) return;
        const o = ((cy + y) * W + cx + x) * 4;
        d[o] = slot; d[o + 1] = Math.max(0, Math.min(255, Math.round(shade * 128))); d[o + 2] = 0; d[o + 3] = 255;
      },
      fill(slot, shade = 1) { for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) api.px(x, y, slot, shade); },
      rect(x, y, w, h, slot, shade = 1) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) api.px(xx, yy, slot, shade); },
      get(x, y) { const o = ((cy + y) * W + cx + x) * 4; return d[o]; },
    };
    return api;
  }
}

// ---------------------------------------------------------------- heads
export const HAIR_STYLES = ['short', 'part', 'bald', 'long', 'bob', 'updo', 'curly', 'buzz'];
export const FACE_STYLES = ['plain', 'smile', 'mustache', 'glasses', 'glassesMustache', 'beard', 'lipstick', 'lashes', 'freckles', 'old', 'rosy', 'glassesLipstick'];
// style index = ((hair * FACE + face) * 2 + mouthOpen) * 2 + eyesClosed
export function headStyle(hair, face, mouth = 0, closed = 0) { return ((hair * FACE_STYLES.length + face) * 2 + mouth) * 2 + closed; }

function drawHead(A, style, hair, face, mouth, closed) {
  const hs = HAIR_STYLES[hair], fs = FACE_STYLES[face];
  const curly = hs === 'curly';
  const hairShade = (x, y) => curly ? (((x + y) & 1) ? 1.0 : 0.82) : (y === 0 ? 1.08 : 1.0);
  // front (+z) = index 4
  const F = A.face(style, 4);
  F.fill(S.SKIN);
  // subtle cheek shading
  F.px(0, 5, S.SKIN, 0.94); F.px(7, 5, S.SKIN, 0.94); F.rect(0, 7, 8, 1, S.SKIN, 0.92);
  const top = { short: 2, part: 2, bald: 0, long: 2, bob: 2, updo: 1, curly: 3, buzz: 1 }[hs];
  for (let y = 0; y < top; y++) for (let x = 0; x < 8; x++) F.px(x, y, S.HAIR, hairShade(x, y));
  if (hs === 'part') { F.px(5, 1, S.SKIN); F.px(6, 1, S.SKIN); F.px(7, 1, S.SKIN); F.px(0, 2, S.HAIR); }
  if (hs === 'short' || hs === 'buzz') { F.px(0, 2, S.HAIR); F.px(7, 2, S.HAIR); }
  if (hs === 'long' || hs === 'bob') { for (let y = 2; y < (hs === 'long' ? 8 : 6); y++) { F.px(0, y, S.HAIR, 0.95); F.px(7, y, S.HAIR, 0.95); } F.rect(1, 2, 6, 1, S.HAIR, 0.9); F.px(1, 2, S.SKIN); F.px(6, 2, S.SKIN); }
  if (hs === 'bald') { F.px(0, 1, S.HAIR, 0.9); F.px(7, 1, S.HAIR, 0.9); F.rect(0, 0, 8, 1, S.SKIN, 1.05); }
  if (hs === 'curly') { F.px(0, 3, S.HAIR, 0.9); F.px(7, 3, S.HAIR, 0.9); }
  // brows
  if (fs === 'old' || fs === 'glassesMustache' || fs === 'mustache' || fs === 'beard') { F.px(2, top === 3 ? 3 : 2, S.BEARD, 0.8); F.px(5, top === 3 ? 3 : 2, S.BEARD, 0.8); }
  // eyes
  const ey = 3 + (top === 3 ? 1 : 0) - (top === 3 ? 1 : 0);
  if (closed) { F.px(2, ey + 1, S.EYE, 0.7); F.px(5, ey + 1, S.EYE, 0.7); F.px(1, ey + 1, S.SKIN, 0.85); F.px(6, ey + 1, S.SKIN, 0.85); }
  else {
    F.px(2, ey, S.EYE); F.px(5, ey, S.EYE); F.px(2, ey + 1, S.EYE); F.px(5, ey + 1, S.EYE);
    if (fs === 'lashes' || fs === 'lipstick' || fs === 'glassesLipstick') { F.px(1, ey, S.EYE, 0.9); F.px(6, ey, S.EYE, 0.9); }
  }
  // glasses
  if (fs === 'glasses' || fs === 'glassesMustache' || fs === 'glassesLipstick') {
    for (const gx of [1, 4]) { F.px(gx, ey - 1 + 1, S.FRAME); F.px(gx + 2, ey, S.FRAME); F.px(gx, ey + 2, S.FRAME); F.px(gx + 1, ey + 2, S.FRAME); F.px(gx + 2, ey + 2, S.FRAME); F.px(gx, ey + 1, S.FRAME); F.px(gx + 2, ey + 1, S.FRAME); }
    F.px(3, ey, S.FRAME); F.px(4, ey, S.FRAME);
  }
  // nose shadow
  F.px(3, 5, S.SKIN, 0.86); F.px(4, 5, S.SKIN, 0.9);
  // mustache / beard
  if (fs === 'mustache' || fs === 'glassesMustache') { F.rect(2, 6, 4, 1, S.BEARD); F.px(1, 6, S.BEARD, 0.9); F.px(6, 6, S.BEARD, 0.9); }
  if (fs === 'beard') { F.rect(1, 6, 6, 2, S.BEARD); F.px(0, 5, S.BEARD); F.px(7, 5, S.BEARD); F.px(0, 6, S.BEARD); F.px(7, 6, S.BEARD); F.px(0, 7, S.BEARD); F.px(7, 7, S.BEARD); }
  // mouth
  const lips = (fs === 'lipstick' || fs === 'lashes' || fs === 'glassesLipstick') ? S.LIPS : S.LIPS;
  const lipShade = (fs === 'lipstick' || fs === 'glassesLipstick') ? 1.0 : 0.75;
  const my = (fs === 'mustache' || fs === 'glassesMustache' || fs === 'beard') ? 7 : 6;
  if (mouth) { F.px(3, my, S.BLACK, 0.9); F.px(4, my, S.BLACK, 0.9); if (my < 7) { F.px(3, my + 1, lips, lipShade); F.px(4, my + 1, lips, lipShade); } }
  else if (fs === 'smile' || fs === 'rosy') { F.px(2, my, lips, lipShade); F.px(5, my, lips, lipShade); F.px(3, my + (my < 7 ? 1 : 0), lips, lipShade); F.px(4, my + (my < 7 ? 1 : 0), lips, lipShade); }
  else if (fs !== 'beard') { F.px(3, my, lips, lipShade); F.px(4, my, lips, lipShade); }
  if (fs === 'rosy' || fs === 'lipstick') { F.px(1, 5, S.BLUSH); F.px(6, 5, S.BLUSH); }
  if (fs === 'freckles') { F.px(1, 5, S.BLUSH, 0.9); F.px(2, 5, S.HAIR, 0.8); F.px(5, 5, S.HAIR, 0.8); F.px(6, 5, S.BLUSH, 0.9); }
  if (fs === 'old') { F.px(1, 4, S.SKIN, 0.85); F.px(6, 4, S.SKIN, 0.85); F.px(2, 7, S.SKIN, 0.88); F.px(5, 7, S.SKIN, 0.88); }

  // back (-z) = index 5
  const B = A.face(style, 5);
  const backHair = { short: 5, part: 5, bald: 3, long: 8, bob: 6, updo: 6, curly: 7, buzz: 4 }[hs];
  B.fill(S.SKIN);
  for (let y = 0; y < backHair; y++) for (let x = 0; x < 8; x++) B.px(x, y, S.HAIR, hairShade(x, y) * (y === backHair - 1 ? 0.9 : 1));
  if (hs === 'bald') { B.rect(1, 0, 6, 1, S.SKIN, 1.04); }
  if (hs === 'updo') { B.rect(2, 1, 4, 3, S.HAIR, 1.12); B.rect(3, 2, 2, 1, S.HAIR, 0.8); }
  if (hs === 'buzz') for (let x = 0; x < 8; x++) B.px(x, 0, S.HAIR, 0.9);
  // sides
  for (const f of [0, 1]) {
    const Sd = A.face(style, f);
    Sd.fill(S.SKIN, 0.97);
    const sideH = { short: 3, part: 3, bald: 2, long: 8, bob: 6, updo: 3, curly: 5, buzz: 2 }[hs];
    for (let y = 0; y < sideH; y++) for (let x = 0; x < 8; x++) {
      // hair covers the back half of the side fully, front half only top rows
      const backSide = f === 0 ? x < 4 : x >= 4;
      if (y < (hs === 'bald' ? 0 : Math.min(2, sideH)) || backSide || hs === 'long' || hs === 'curly') Sd.px(x, y, S.HAIR, hairShade(x, y) * 0.96);
    }
    if (hs === 'bald') { for (let x = 0; x < 8; x++) { if (f === 0 ? x < 5 : x > 2) { Sd.px(x, 2, S.HAIR, 0.9); Sd.px(x, 3, S.HAIR, 0.9); } } }
    // ear
    if (hs !== 'long' && hs !== 'bob' && hs !== 'curly') { const ex = f === 0 ? 4 : 3; Sd.px(ex, 4, S.SKIN, 0.85); Sd.px(ex, 5, S.SKIN, 0.85); }
    if (fs === 'beard') for (let x = 0; x < 8; x++) { if (f === 0 ? x >= 4 : x < 4) { Sd.px(x, 6, S.BEARD); Sd.px(x, 7, S.BEARD); } }
    if (fs === 'glasses' || fs === 'glassesMustache' || fs === 'glassesLipstick') for (let x = 0; x < 8; x++) if (f === 0 ? x >= 3 : x <= 4) Sd.px(x, 4, S.FRAME);
  }
  // top
  const T = A.face(style, 2);
  if (hs === 'bald') { T.fill(S.SKIN, 1.05); T.rect(0, 0, 8, 1, S.HAIR, 0.9); T.rect(0, 7, 8, 1, S.HAIR, 0.9); }
  else { T.fill(S.HAIR); if (curly) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) T.px(x, y, S.HAIR, hairShade(x, y)); if (hs === 'part') for (let y = 0; y < 8; y++) T.px(5, y, S.HAIR, 0.8); }
  // bottom
  A.face(style, 3).fill(S.SKIN, 0.8);
}

export function buildHeadAtlas() {
  const n = HAIR_STYLES.length * FACE_STYLES.length * 4;
  const A = new Atlas(n);
  for (let h = 0; h < HAIR_STYLES.length; h++) for (let f = 0; f < FACE_STYLES.length; f++) for (let m = 0; m < 2; m++) for (let c = 0; c < 2; c++) drawHead(A, headStyle(h, f, m, c), h, f, m, c);
  return A;
}

// ---------------------------------------------------------------- torsos
export const TORSO_STYLES = ['shirt', 'tie', 'suit', 'dress', 'cardigan', 'overalls', 'apron', 'uniform', 'vest', 'blouse', 'robe', 'sailor', 'coat', 'clergy', 'tshirt', 'bowtie'];
function drawTorso(A, style) {
  const name = TORSO_STYLES[style];
  for (let f = 0; f < 6; f++) {
    const F = A.face(style, f);
    const front = f === 4, back = f === 5, top = f === 2, bottom = f === 3, side = f < 2;
    F.fill(S.TOP);
    if (bottom) { F.fill(name === 'dress' || name === 'robe' || name === 'coat' ? S.TOP : S.BOTTOM, 0.8); continue; }
    if (top) { F.fill(S.TOP, 1.05); if (name === 'overalls') { F.fill(S.TOP2); F.rect(1, 0, 1, 8, S.TOP); F.rect(6, 0, 1, 8, S.TOP); } continue; }
    // shading: darker at the sides/bottom
    for (let x = 0; x < 8; x++) F.px(x, 7, S.TOP, 0.9);
    const belt = ['shirt', 'tie', 'uniform', 'vest', 'tshirt', 'bowtie', 'sailor'].includes(name);
    if (belt) { F.rect(0, 7, 8, 1, S.BLACK, 0.9); if (front) F.px(3, 7, S.GOLD); if (front) F.px(4, 7, S.GOLD); }
    if (front) {
      switch (name) {
        case 'shirt': F.px(3, 0, S.TOP, 0.8); F.px(4, 0, S.TOP, 0.8); F.px(3, 2, S.TOP, 0.85); F.px(3, 4, S.TOP, 0.85); break;
        case 'tie': F.px(2, 0, S.TOP, 1.1); F.px(5, 0, S.TOP, 1.1); F.rect(3, 0, 2, 1, S.ACCENT); F.rect(3, 1, 2, 4, S.ACCENT, 0.95); F.px(3, 5, S.ACCENT, 0.9); F.px(4, 5, S.ACCENT, 0.9); break;
        case 'suit': F.rect(2, 0, 4, 1, S.TOP2); F.rect(3, 1, 2, 2, S.TOP2); F.rect(3, 0, 2, 3, S.ACCENT); F.px(3, 3, S.ACCENT, 0.9); F.px(4, 3, S.TOP2); F.px(3, 5, S.BLACK, 0.8); F.px(3, 6, S.BLACK, 0.8); F.px(1, 3, S.TOP, 0.85); F.px(6, 3, S.TOP, 0.85); F.px(6, 1, S.WHITE); break;
        case 'dress': F.rect(2, 0, 4, 1, S.WHITE); F.px(3, 1, S.WHITE); F.px(4, 1, S.WHITE); F.rect(0, 5, 8, 1, S.ACCENT, 0.9); F.px(2, 3, S.TOP, 1.1); F.px(5, 3, S.TOP, 1.1); break;
        case 'cardigan': F.rect(3, 0, 2, 8, S.TOP2); for (let y = 1; y < 8; y += 2) F.px(4, y, S.ACCENT); F.px(2, 0, S.TOP2); F.px(5, 0, S.TOP2); break;
        case 'overalls': F.fill(S.TOP2); F.rect(1, 2, 6, 6, S.TOP); F.rect(1, 0, 1, 2, S.TOP); F.rect(6, 0, 1, 2, S.TOP); F.px(1, 2, S.GOLD); F.px(6, 2, S.GOLD); F.rect(3, 3, 2, 2, S.TOP, 0.85); break;
        case 'apron': F.rect(1, 1, 6, 7, S.WHITE); F.rect(0, 5, 8, 1, S.WHITE, 0.92); F.rect(2, 5, 4, 2, S.WHITE, 0.95); break;
        case 'uniform': F.px(1, 2, S.GOLD); F.px(3, 1, S.GOLD); F.px(3, 3, S.GOLD); F.px(3, 5, S.GOLD); F.rect(2, 0, 4, 1, S.TOP2); F.px(5, 2, S.TOP, 0.85); F.px(6, 2, S.TOP, 0.85); break;
        case 'vest': F.fill(S.TOP2); F.rect(0, 1, 3, 6, S.TOP); F.rect(5, 1, 3, 6, S.TOP); F.px(3, 3, S.BLACK, 0.8); F.px(3, 5, S.BLACK, 0.8); F.rect(3, 0, 2, 2, S.ACCENT); break;
        case 'blouse': F.rect(2, 0, 4, 1, S.WHITE); F.rect(3, 1, 2, 1, S.ACCENT); F.px(2, 1, S.ACCENT, 0.9); F.px(5, 1, S.ACCENT, 0.9); F.px(3, 3, S.TOP, 0.9); F.px(3, 5, S.TOP, 0.9); break;
        case 'robe': F.rect(1, 0, 6, 1, S.WHITE); F.rect(2, 1, 4, 1, S.WHITE); F.rect(3, 2, 2, 1, S.WHITE, 0.95); break;
        case 'sailor': for (let y = 1; y < 7; y += 2) F.rect(0, y, 8, 1, S.WHITE); F.rect(2, 0, 4, 1, S.TOP2); break;
        case 'coat': F.rect(3, 0, 1, 8, S.TOP, 0.82); F.px(4, 2, S.BLACK); F.px(4, 4, S.BLACK); F.px(4, 6, S.BLACK); F.rect(2, 0, 4, 1, S.TOP2); F.px(1, 5, S.TOP, 0.85); F.px(6, 5, S.TOP, 0.85); break;
        case 'clergy': F.rect(3, 0, 2, 1, S.WHITE); break;
        case 'tshirt': F.rect(2, 0, 4, 1, S.TOP, 0.85); break;
        case 'bowtie': F.rect(2, 0, 4, 1, S.TOP2); F.rect(2, 1, 4, 1, S.ACCENT); F.px(3, 1, S.ACCENT, 0.8); F.px(4, 1, S.ACCENT, 0.8); F.px(3, 3, S.TOP, 0.85); F.px(3, 5, S.TOP, 0.85); break;
      }
    }
    if (back) {
      if (name === 'overalls') { F.fill(S.TOP2); F.rect(1, 0, 1, 3, S.TOP); F.rect(6, 0, 1, 3, S.TOP); F.rect(1, 3, 6, 5, S.TOP); }
      if (name === 'apron') { F.rect(1, 5, 6, 1, S.WHITE); F.rect(3, 5, 2, 2, S.WHITE); }
      if (name === 'sailor') { F.rect(1, 0, 6, 3, S.TOP2); F.rect(1, 3, 6, 1, S.WHITE); }
      if (name === 'robe') F.rect(1, 0, 6, 1, S.WHITE);
      if (name === 'suit' || name === 'coat') F.rect(3, 4, 1, 4, S.TOP, 0.85);
    }
    if (side) { for (let y = 0; y < 8; y++) F.px(f === 0 ? 0 : 7, y, S.TOP, 0.9); if (name === 'overalls') F.rect(0, 2, 8, 6, S.TOP); if (name === 'apron') F.rect(0, 5, 8, 1, S.WHITE); }
  }
}
export function buildTorsoAtlas() { const A = new Atlas(TORSO_STYLES.length); for (let i = 0; i < TORSO_STYLES.length; i++) drawTorso(A, i); return A; }

// ---------------------------------------------------------------- limbs
// arm styles: 0 long sleeve, 1 short sleeve, 2 suit sleeve w/ cuff, 3 bare (sleeveless), 4 gloves
export const ARM_STYLES = ['long', 'short', 'cuff', 'bare', 'gloves'];
function drawArm(A, style) {
  const name = ARM_STYLES[style];
  for (let f = 0; f < 6; f++) {
    const F = A.face(style, f);
    if (f === 2) { F.fill(name === 'bare' ? S.SKIN : S.TOP, 1.02); continue; }
    if (f === 3) { F.fill(name === 'gloves' ? S.WHITE : S.SKIN, 0.9); continue; }
    const sleeve = { long: 6, short: 3, cuff: 6, bare: 0, gloves: 6 }[name];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      if (y < sleeve) F.px(x, y, S.TOP, (x === 0 || x === 7) ? 0.9 : 1);
      else F.px(x, y, name === 'gloves' ? S.WHITE : S.SKIN, y === 7 ? 0.92 : 1);
    }
    if (name === 'cuff') F.rect(0, 5, 8, 1, S.TOP2);
    if (name === 'long' && f >= 4) F.rect(0, 5, 8, 1, S.TOP, 0.9);
  }
}
export function buildArmAtlas() { const A = new Atlas(ARM_STYLES.length); for (let i = 0; i < ARM_STYLES.length; i++) drawArm(A, i); return A; }

// legs: thigh styles: 0 trousers, 1 bare/stocking (under skirt), 2 shorts
export const THIGH_STYLES = ['trousers', 'stocking', 'shorts'];
// shin styles: 0 trousers+shoes, 1 stocking+shoes, 2 socks+shoes (kids), 3 boots
export const SHIN_STYLES = ['trousers', 'stocking', 'socks', 'boots'];
function drawThigh(A, style) {
  const name = THIGH_STYLES[style];
  for (let f = 0; f < 6; f++) {
    const F = A.face(style, f);
    if (name === 'trousers') { F.fill(S.BOTTOM); if (f >= 4) F.rect(0, 0, 8, 1, S.BOTTOM, 0.9); if (f === 4) F.rect(3, 1, 1, 7, S.BOTTOM, 0.9); }
    else if (name === 'stocking') F.fill(S.SOCKS);
    else { F.fill(S.BOTTOM); F.rect(0, 5, 8, 3, S.SKIN); }
  }
}
function drawShin(A, style) {
  const name = SHIN_STYLES[style];
  for (let f = 0; f < 6; f++) {
    const F = A.face(style, f);
    if (f === 3) { F.fill(S.SHOES, 0.7); continue; }
    if (f === 2) { F.fill(name === 'trousers' ? S.BOTTOM : name === 'socks' ? S.SKIN : S.SOCKS); continue; }
    const leg = name === 'trousers' ? S.BOTTOM : name === 'socks' ? S.SKIN : name === 'boots' ? S.SHOES : S.SOCKS;
    F.fill(leg);
    if (name === 'socks') F.rect(0, 3, 8, 3, S.WHITE);
    const shoeTop = name === 'boots' ? 2 : 6;
    F.rect(0, shoeTop, 8, 8 - shoeTop, S.SHOES);
    if (f === 4) { F.rect(1, 6, 6, 1, S.SHOES, 1.15); }
    F.rect(0, 7, 8, 1, S.SHOES, 0.75);
  }
}
export function buildThighAtlas() { const A = new Atlas(THIGH_STYLES.length); for (let i = 0; i < THIGH_STYLES.length; i++) drawThigh(A, i); return A; }
export function buildShinAtlas() { const A = new Atlas(SHIN_STYLES.length); for (let i = 0; i < SHIN_STYLES.length; i++) drawShin(A, i); return A; }

// generic flat-coloured parts: 0 = hair slot, 1 = bottom slot (skirt), 2 = top slot (dress skirt), 3 = white (apron skirt)
export function buildFlatAtlas() {
  const A = new Atlas(5);
  const slots = [S.HAIR, S.BOTTOM, S.TOP, S.WHITE, S.TOP2];
  for (let s = 0; s < slots.length; s++) for (let f = 0; f < 6; f++) {
    const F = A.face(s, f);
    F.fill(slots[s]);
    if (s === 0) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) F.px(x, y, S.HAIR, ((x + y * 3) % 5 === 0) ? 0.88 : 1);
    if (s !== 0 && f !== 2 && f !== 3) { F.rect(0, 7, 8, 1, slots[s], 0.85); for (let x = 1; x < 8; x += 3) F.rect(x, 2, 1, 5, slots[s], 0.9); }
  }
  return A;
}
export const ATLAS_CELL = CELL, ATLAS_COLS = COLS;
