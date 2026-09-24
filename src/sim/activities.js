// Activity animations. Each activity maps to a base posture plus procedural limb motion.
// Pose angle conventions: negative arm pitch raises the arm forward/up, positive swings back;
// negative hip pitch swings the thigh forward (sitting = -PI/2), positive knee bends the shin back.
import { DIM } from '../people/characters.js';

const HP = Math.PI / 2;

export function resetPose(p) {
  p.lean = 0; p.headYaw = 0; p.headPitch = 0; p.aLp = 0; p.aLr = 0.06; p.aRp = 0; p.aRr = 0.06;
  p.hL = 0; p.hR = 0; p.kL = 0; p.kR = 0; p.bob = 0; p.lie = 0; p.mouth = 0; p.roll = 0;
}

export function walkPose(p, phase, speed = 1, s = 1) {
  const sw = Math.sin(phase), sw2 = Math.sin(phase + Math.PI);
  const amp = 0.5 * Math.min(1.3, speed);
  p.hL = sw * amp; p.hR = sw2 * amp;
  p.kL = Math.max(0, Math.sin(phase - 1.1)) * 0.8 * Math.min(1, speed);
  p.kR = Math.max(0, Math.sin(phase - 1.1 + Math.PI)) * 0.8 * Math.min(1, speed);
  p.aLp = -sw * amp * 0.75; p.aRp = -sw2 * amp * 0.75;
  p.aLr = 0.08; p.aRr = 0.08;
  p.bob = Math.abs(Math.cos(phase)) * 0.035 * s - 0.01 * s;
  p.lean = 0.04 * speed;
}

function sitBase(p, seat, s) { p.hL = -HP; p.hR = -HP; p.kL = HP; p.kR = HP; p.bob = seat - DIM.hipY * s; p.aLp = -0.45; p.aRp = -0.45; p.aLr = 0.1; p.aRr = 0.1; }
function kneelBase(p, s) { p.hL = 0; p.hR = -0.1; p.kL = HP; p.kR = HP; p.bob = -DIM.shin[1] * s + 0.02; }
function idle(p, t, ph) { p.headYaw = Math.sin(t * 0.23 + ph * 7) * 0.35 * Math.max(0, Math.sin(t * 0.11 + ph)); p.headPitch = Math.sin(t * 0.17 + ph) * 0.05; p.bob += Math.sin(t * 1.6 + ph) * 0.004; }

const A = {};
const def = (name, base, fn, extra = {}) => { A[name] = { base, fn, ...extra }; };

// ---------------------------------------------------------------- basic postures
def('stand', 'stand', (p, t, ph) => { idle(p, t, ph); });
def('sit', 'sit', (p, t, ph) => { idle(p, t, ph); });
def('sleep', 'sleep', (p, t, ph) => { p.blinkForce = 1; p.bob += Math.sin(t * 0.9 + ph) * 0.006; p.headYaw = 0.2 * Math.sin(ph * 3); });
def('kneel', 'kneel', (p, t, ph) => { idle(p, t, ph); });
def('doze', 'sit', (p, t, ph) => { p.blinkForce = 1; p.headPitch = 0.45; p.headYaw = 0.2; p.lean = -0.18; p.aLp = -0.3; p.aRp = -0.3; p.bob += Math.sin(t * 0.8 + ph) * 0.005; });
def('lean', 'stand', (p, t, ph) => { idle(p, t, ph); p.lean = -0.06; p.aLp = -0.9; p.aLr = -0.65; p.aRp = -0.9; p.aRr = -0.65; p.hL = 0.1; p.hR = -0.08; });
def('wait', 'stand', (p, t, ph) => { idle(p, t, ph); p.headYaw = Math.sin(t * 0.4 + ph) * 0.5; if (Math.sin(t * 0.3 + ph) > 0.8) { p.aRp = -1.4; p.aRr = 0.5; p.headPitch = 0.3; } });
def('look', 'stand', (p, t, ph) => { p.headYaw = Math.sin(t * 0.3 + ph) * 0.6; p.headPitch = 0.1; p.aLp = 0.1; p.aRp = 0.1; p.aLr = -0.3; p.aRr = -0.3; });

// ---------------------------------------------------------------- social
def('talk', 'stand', (p, t, ph, k) => {
  idle(p, t, ph);
  const g = Math.sin(t * 2.3 + ph * 5);
  p.aRp = -0.35 - 0.35 * Math.max(0, g) * (k.speaking ? 1.4 : 0.4); p.aRr = 0.15 + 0.1 * Math.sin(t * 1.7 + ph);
  if (Math.sin(t * 0.7 + ph * 3) > 0.3) { p.aLp = -0.3; p.aLr = 0.3; }
  p.headPitch = Math.sin(t * 3.1 + ph) * 0.05; p.headYaw *= 0.3;
});
def('talk_sit', 'sit', (p, t, ph, k) => { p.aRp = -0.6 - 0.3 * Math.max(0, Math.sin(t * 2.1 + ph)) * (k.speaking ? 1.3 : 0.3); p.headPitch = Math.sin(t * 2.7 + ph) * 0.05; p.headYaw = Math.sin(t * 0.3 + ph) * 0.3; });
def('laugh', 'stand', (p, t, ph) => { p.lean = -0.1 + Math.abs(Math.sin(t * 7)) * 0.08; p.mouth = 1; p.headPitch = -0.25; p.aLp = -0.5; p.aRp = -0.5; p.aLr = 0.4; p.aRr = 0.4; });
def('wave', 'stand', (p, t) => { p.aRp = -2.7; p.aRr = 0.25 + Math.sin(t * 9) * 0.35; p.mouth = Math.sin(t * 3) > 0 ? 1 : 0; });
def('clap', 'stand', (p, t, ph) => { p.aLp = -1.1; p.aRp = -1.1; const c = Math.abs(Math.sin(t * 8 + ph)); p.aLr = -0.1 - c * 0.35; p.aRr = -0.1 - c * 0.35; p.headPitch = -0.1; });
def('clap_sit', 'sit', (p, t, ph) => { p.aLp = -1.0; p.aRp = -1.0; const c = Math.abs(Math.sin(t * 8 + ph)); p.aLr = -0.1 - c * 0.35; p.aRr = -0.1 - c * 0.35; });
def('cheer', 'stand', (p, t, ph) => { p.aLp = -2.8 + Math.sin(t * 6 + ph) * 0.2; p.aRp = -2.8 + Math.sin(t * 6 + ph + 1) * 0.2; p.aLr = 0.3; p.aRr = 0.3; p.mouth = 1; p.bob = Math.max(0, Math.sin(t * 6 + ph)) * 0.06; });
def('listen', 'stand', (p, t, ph) => { idle(p, t, ph); p.headYaw *= 0.2; p.headPitch = -0.05; p.aLp = -0.2; p.aRp = -0.2; p.aLr = -0.25; p.aRr = -0.25; });
def('listen_sit', 'sit', (p, t, ph) => { p.headYaw = Math.sin(t * 0.2 + ph) * 0.1; p.headPitch = -0.02; });
def('hug', 'stand', (p, t, ph) => { p.aLp = -1.5; p.aRp = -1.5; p.aLr = -0.5; p.aRr = -0.5; p.headYaw = 0.3; p.bob = Math.sin(t * 2 + ph) * 0.01; });
def('dance', 'stand', (p, t, ph) => {
  const b = t * 4.2 + ph;
  p.hL = Math.sin(b) * 0.3; p.hR = -Math.sin(b) * 0.3; p.kL = Math.max(0, Math.sin(b)) * 0.5; p.kR = Math.max(0, -Math.sin(b)) * 0.5;
  p.aLp = -1.3; p.aLr = 0.4 + Math.sin(b) * 0.1; p.aRp = -0.9; p.aRr = -0.2; p.bob = Math.abs(Math.sin(b)) * 0.05; p.roll = Math.sin(b * 0.5) * 0.06;
  p.headYaw = Math.sin(b * 0.5) * 0.2; p.yawOffset = Math.sin(t * 0.8 + ph) * 0.9;
});
def('dance_jitterbug', 'stand', (p, t, ph) => {
  const b = t * 6 + ph;
  p.hL = Math.sin(b) * 0.5; p.hR = -Math.sin(b) * 0.5; p.kL = Math.max(0, Math.sin(b)) * 0.9; p.kR = Math.max(0, -Math.sin(b)) * 0.9;
  p.aLp = -1.6 + Math.sin(b) * 0.5; p.aRp = -0.6 - Math.cos(b) * 0.6; p.aLr = 0.5; p.aRr = 0.3; p.bob = Math.abs(Math.sin(b)) * 0.09; p.mouth = 1;
  p.yawOffset = t * 1.3 + ph;
});

// ---------------------------------------------------------------- food & home
def('eat', 'sit', (p, t, ph) => { const c = Math.max(0, Math.sin(t * 1.25 + ph)); p.aRp = -0.8 - c * 1.05; p.aRr = -0.25 * c; p.aLp = -0.7; p.headPitch = 0.18 - c * 0.12; p.mouth = c > 0.9 ? 1 : 0; });
def('drink', 'sit', (p, t, ph) => { const c = Math.max(0, Math.sin(t * 0.6 + ph)) ** 3; p.aRp = -0.8 - c * 1.2; p.aRr = -0.2 * c; p.headPitch = -0.2 * c + 0.05; }, { held: 'coffee_cup' });
def('drink_stand', 'stand', (p, t, ph) => { idle(p, t, ph); const c = Math.max(0, Math.sin(t * 0.6 + ph)) ** 3; p.aRp = -0.9 - c * 1.3; p.aRr = -0.2 * c; p.headPitch = -0.25 * c; }, { held: 'coffee_cup' });
def('cook', 'stand', (p, t, ph) => { p.aRp = -1.0 + Math.sin(t * 3 + ph) * 0.12; p.aRr = -0.15 + Math.cos(t * 3 + ph) * 0.15; p.aLp = -0.8; p.headPitch = 0.35; p.lean = 0.08; }, { held: 'spoon' });
def('wash', 'stand', (p, t, ph) => { p.aRp = -0.95 + Math.sin(t * 4 + ph) * 0.1; p.aLp = -0.95 + Math.cos(t * 4 + ph) * 0.1; p.aLr = -0.2; p.aRr = -0.2; p.headPitch = 0.4; p.lean = 0.1; });
def('sweep', 'stand', (p, t, ph) => { const s = Math.sin(t * 2.2 + ph); p.aRp = -0.6 + s * 0.25; p.aLp = -0.9 + s * 0.25; p.aLr = -0.3; p.aRr = -0.1; p.lean = 0.18; p.headPitch = 0.3; p.headYaw = s * 0.2; }, { held: 'broom' });
def('mop', 'stand', (p, t, ph) => { const s = Math.sin(t * 1.8 + ph); p.aRp = -0.6 + s * 0.3; p.aLp = -0.9 + s * 0.3; p.lean = 0.2; p.headPitch = 0.3; p.yawOffset = s * 0.3; }, { held: 'mop' });
def('rake', 'stand', (p, t, ph) => { const s = Math.sin(t * 1.6 + ph); p.aRp = -0.7 + s * 0.35; p.aLp = -1.0 + s * 0.35; p.lean = 0.22; p.headPitch = 0.35; }, { held: 'rake' });
def('shovel', 'stand', (p, t, ph) => { const s = Math.max(0, Math.sin(t * 1.4 + ph)); p.aRp = -0.4 - s * 0.8; p.aLp = -0.8 - s * 0.6; p.lean = 0.3 - s * 0.2; p.hL = -0.2; }, { held: 'shovel' });
def('water_plants', 'stand', (p, t, ph) => { idle(p, t, ph); p.aRp = -1.1; p.aRr = 0.2; p.headPitch = 0.4; p.lean = 0.1; }, { held: 'watering_can' });
def('laundry', 'stand', (p, t, ph) => { const s = Math.max(0, Math.sin(t * 1.1 + ph)); p.aLp = -1.2 - s * 1.4; p.aRp = -1.2 - s * 1.4; p.headPitch = -0.3 * s; });
def('iron', 'stand', (p, t, ph) => { p.aRp = -0.9 + Math.sin(t * 2.5 + ph) * 0.2; p.aLp = -0.7; p.headPitch = 0.45; p.lean = 0.1; });
def('sew', 'sit', (p, t, ph) => { p.aRp = -1.0 + Math.sin(t * 5 + ph) * 0.06; p.aLp = -1.0; p.aLr = -0.2; p.aRr = -0.2; p.headPitch = 0.45; });
def('knit', 'sit', (p, t, ph) => { p.aRp = -1.0 + Math.sin(t * 6 + ph) * 0.08; p.aLp = -1.0 + Math.cos(t * 6 + ph) * 0.08; p.aLr = -0.3; p.aRr = -0.3; p.headPitch = 0.3; });
def('rock', 'sit', (p, t, ph) => { p.lean = -0.12 + Math.sin(t * 1.2 + ph) * 0.1; p.bob += Math.sin(t * 1.2 + ph) * 0.01; p.headPitch = 0.05; });
def('watch', 'sit', (p, t, ph, k) => { p.lean = -0.14; p.headPitch = 0.02; p.headYaw = 0; p.aLp = -0.35; p.aRp = -0.35; if (Math.sin(t * 0.19 + ph * 11) > 0.93) { p.mouth = 1; p.lean = -0.2; } void k; });
def('read', 'sit', (p, t, ph) => { p.aLp = -1.05; p.aRp = -1.05; p.aLr = -0.28; p.aRr = -0.28; p.headPitch = 0.35; if (Math.sin(t * 0.25 + ph * 9) > 0.96) p.aRr = 0.2; }, { held: 'newspaper' });
def('read_book', 'sit', (p, t, ph) => { p.aLp = -1.0; p.aRp = -1.0; p.aLr = -0.3; p.aRr = -0.3; p.headPitch = 0.45; void t; void ph; }, { held: 'book' });
def('read_stand', 'stand', (p, t, ph) => { p.aLp = -1.1; p.aRp = -1.1; p.aLr = -0.28; p.aRr = -0.28; p.headPitch = 0.35; void t; void ph; }, { held: 'newspaper' });
def('browse', 'stand', (p, t, ph) => { p.headYaw = Math.sin(t * 0.35 + ph) * 0.5; p.headPitch = 0.15; if (Math.sin(t * 0.5 + ph * 2) > 0.5) { p.aRp = -1.2; p.aRr = 0.1; } p.yawOffset = Math.sin(t * 0.2 + ph) * 0.5; });
def('write', 'sit', (p, t, ph) => { p.aRp = -1.0 + Math.sin(t * 7 + ph) * 0.04; p.aRr = -0.2 + Math.sin(t * 2 + ph) * 0.08; p.aLp = -0.9; p.aLr = -0.2; p.headPitch = 0.5; p.lean = 0.12; });
def('type', 'sit', (p, t, ph) => { p.aRp = -1.1 + Math.abs(Math.sin(t * 11 + ph)) * 0.08; p.aLp = -1.1 + Math.abs(Math.sin(t * 12.3 + ph)) * 0.08; p.aLr = -0.1; p.aRr = -0.1; p.headPitch = 0.25; p.lean = 0.05; });
def('phone', 'sit', (p, t, ph, k) => { p.aRp = -2.3; p.aRr = -0.5; p.headYaw = 0.25; p.mouth = k.speaking ? (Math.sin(t * 14) > 0 ? 1 : 0) : 0; p.aLp = -0.6; void ph; }, { held: 'phone_handset' });
def('phone_stand', 'stand', (p, t, ph, k) => { p.aRp = -2.3; p.aRr = -0.5; p.headYaw = 0.25; p.lean = -0.04; p.mouth = k.speaking ? (Math.sin(t * 14) > 0 ? 1 : 0) : 0; void ph; }, { held: 'phone_handset' });
def('pray', 'kneel', (p, t, ph) => { p.aLp = -1.3; p.aRp = -1.3; p.aLr = -0.35; p.aRr = -0.35; p.headPitch = 0.5; void t; void ph; });
def('pray_sit', 'sit', (p) => { p.aLp = -1.2; p.aRp = -1.2; p.aLr = -0.35; p.aRr = -0.35; p.headPitch = 0.5; });
def('garden', 'kneel', (p, t, ph) => { p.lean = 0.35; p.aRp = -0.9 + Math.sin(t * 2 + ph) * 0.2; p.aLp = -0.8; p.headPitch = 0.5; }, { held: 'trowel' });

// ---------------------------------------------------------------- music
def('sing', 'stand', (p, t, ph) => { p.aLp = -0.95; p.aRp = -0.95; p.aLr = -0.3; p.aRr = -0.3; p.headPitch = -0.08 + Math.sin(t * 1.3 + ph) * 0.04; p.mouth = Math.sin(t * 2.6 + ph * 0.2) > -0.3 ? 1 : 0; p.bob += Math.sin(t * 1.3) * 0.006; }, { held: 'hymnal', song: true });
def('sing_free', 'stand', (p, t, ph) => { p.aLp = -0.4; p.aRp = -0.4; p.aLr = 0.2; p.aRr = 0.2; p.headPitch = -0.15; p.mouth = Math.sin(t * 2.2 + ph) > -0.5 ? 1 : 0; p.roll = Math.sin(t * 1.5 + ph) * 0.04; }, { song: true });
def('conduct', 'stand', (p, t) => { p.aRp = -1.7 + Math.sin(t * 4.2) * 0.45; p.aRr = 0.35 + Math.sin(t * 4.2 + 1.3) * 0.25; p.aLp = -1.3 + Math.sin(t * 2.1) * 0.25; p.aLr = 0.2; p.headPitch = -0.1; p.lean = Math.sin(t * 2.1) * 0.04; }, { held: 'baton' });
def('piano', 'sit', (p, t, ph) => { p.aLp = -1.25 + Math.sin(t * 9 + ph) * 0.05; p.aRp = -1.25 + Math.sin(t * 10.3 + ph) * 0.05; p.aLr = -0.05 + Math.sin(t * 1.7) * 0.12; p.aRr = -0.05 + Math.sin(t * 1.9 + 1) * 0.12; p.headPitch = 0.15 + Math.sin(t * 2.2) * 0.05; p.lean = 0.08 + Math.sin(t * 1.1) * 0.03; });
def('organ', 'sit', (p, t, ph) => { A.piano.fn(p, t * 0.6, ph); p.headPitch = -0.05; });
def('trumpet', 'stand', (p, t, ph) => { p.aLp = -1.45; p.aRp = -1.5; p.aLr = -0.35; p.aRr = -0.3; p.headPitch = -0.1 + Math.sin(t * 2 + ph) * 0.06; p.lean = Math.sin(t * 2 + ph) * 0.05; }, { held: 'trumpet' });
def('trombone', 'stand', (p, t, ph) => { p.aLp = -1.5; p.aLr = -0.3; p.aRp = -1.2 - Math.sin(t * 3 + ph) * 0.25; p.headPitch = -0.1; }, { held: 'trombone' });
def('clarinet', 'stand', (p, t, ph) => { p.aLp = -1.1; p.aRp = -1.0; p.aLr = -0.3; p.aRr = -0.35; p.headPitch = 0.1; p.roll = Math.sin(t * 1.4 + ph) * 0.05; }, { held: 'clarinet' });
def('tuba', 'stand', (p, t, ph) => { p.aLp = -0.9; p.aRp = -1.2; p.aLr = -0.3; p.aRr = -0.2; p.bob += Math.abs(Math.sin(t * 3.5 + ph)) * 0.02; }, { held: 'tuba' });
def('drum', 'stand', (p, t, ph) => { p.aLp = -0.9 - Math.max(0, Math.sin(t * 7 + ph)) * 0.5; p.aRp = -0.9 - Math.max(0, Math.sin(t * 7 + ph + Math.PI)) * 0.5; p.aLr = -0.2; p.aRr = -0.2; p.headPitch = 0.2; }, { held: 'drumstick' });
def('drum_sit', 'sit', (p, t, ph) => { p.aLp = -0.9 - Math.max(0, Math.sin(t * 7 + ph)) * 0.5; p.aRp = -0.9 - Math.max(0, Math.sin(t * 9 + ph + Math.PI)) * 0.5; p.aLr = -0.1; p.aRr = -0.1; p.headPitch = 0.1 + Math.sin(t * 3.5) * 0.06; });
def('fiddle', 'stand', (p, t, ph) => { p.aLp = -1.5; p.aLr = 0.55; p.aRp = -1.2 + Math.sin(t * 3 + ph) * 0.3; p.aRr = -0.2; p.headYaw = 0.35; p.headPitch = 0.25; p.roll = 0.06; }, { held: 'fiddle' });
def('bass', 'stand', (p, t, ph) => { p.aLp = -1.6; p.aLr = 0.1; p.aRp = -0.8 + Math.sin(t * 5 + ph) * 0.1; p.aRr = -0.3; p.lean = 0.05; p.headYaw = 0.3; });
def('guitar', 'sit', (p, t, ph) => { p.aLp = -1.1; p.aLr = 0.6; p.aRp = -0.7 + Math.sin(t * 6 + ph) * 0.12; p.aRr = -0.3; p.headPitch = 0.3; p.headYaw = -0.3; }, { held: 'guitar' });
def('announce', 'stand', (p, t, ph, k) => { p.aLp = -0.9; p.aLr = -0.1; p.aRp = -0.6 - (k.speaking ? Math.max(0, Math.sin(t * 2 + ph)) * 0.8 : 0.1); p.aRr = 0.2; p.headYaw = Math.sin(t * 0.5 + ph) * 0.4; p.mouth = k.speaking ? (Math.sin(t * 12) > 0 ? 1 : 0) : 0; });
def('speech', 'stand', (p, t, ph, k) => { A.announce.fn(p, t, ph, k); p.aLp = -1.0; p.aLr = -0.4; });

// ---------------------------------------------------------------- work
def('counter', 'stand', (p, t, ph) => { idle(p, t, ph); p.aLp = -0.55; p.aRp = -0.55; p.aLr = -0.08; p.aRr = -0.08; p.lean = 0.06; if (Math.sin(t * 0.21 + ph * 4) > 0.7) { p.aRp = -1.0; p.headPitch = 0.3; } });
def('shelve', 'stand', (p, t, ph) => { const s = Math.max(0, Math.sin(t * 1.3 + ph)); p.aRp = -1.3 - s * 0.9; p.aLp = -0.4; p.headPitch = -0.2 * s; });
def('serve', 'stand', (p, t, ph) => { idle(p, t, ph); p.aLp = -1.5; p.aLr = 0.35; p.aRp = -0.2; }, { held: 'tray' });
def('bartend', 'stand', (p, t, ph) => { const s = Math.sin(t * 2.8 + ph); p.aRp = -0.95 + s * 0.12; p.aRr = -0.2 + Math.cos(t * 2.8) * 0.1; p.aLp = -0.9; p.headPitch = 0.25; p.headYaw = Math.sin(t * 0.3 + ph) * 0.4; }, { held: 'rag' });
def('haircut', 'stand', (p, t, ph) => { p.aRp = -1.55 + Math.sin(t * 6 + ph) * 0.08; p.aRr = -0.2; p.aLp = -1.45; p.aLr = -0.35; p.headPitch = 0.3; p.lean = 0.08; p.yawOffset = Math.sin(t * 0.3 + ph) * 0.5; }, { held: 'scissors' });
def('shine', 'kneel', (p, t, ph) => { p.lean = 0.3; p.aRp = -0.8 + Math.sin(t * 6 + ph) * 0.15; p.aLp = -0.8 + Math.cos(t * 6 + ph) * 0.15; p.headPitch = 0.5; }, { held: 'rag' });
def('hammer', 'stand', (p, t, ph) => { const s = Math.max(0, Math.sin(t * 5 + ph)); p.aRp = -1.0 - s * 1.2; p.aLp = -0.8; p.headPitch = 0.45; p.lean = 0.12; }, { held: 'hammer' });
def('hammer_kneel', 'kneel', (p, t, ph) => { const s = Math.max(0, Math.sin(t * 5 + ph)); p.aRp = -0.7 - s * 1.1; p.aLp = -0.6; p.headPitch = 0.5; p.lean = 0.3; }, { held: 'hammer' });
def('saw', 'stand', (p, t, ph) => { p.aRp = -0.8 + Math.sin(t * 5 + ph) * 0.25; p.aLp = -0.7; p.lean = 0.25; p.headPitch = 0.5; }, { held: 'saw' });
def('carry', 'stand', (p) => { p.aLp = -1.2; p.aRp = -1.2; p.aLr = -0.3; p.aRr = -0.3; p.lean = -0.06; }, { held: 'crate_small' });
def('wrench', 'stand', (p, t, ph) => { p.aRp = -1.2 + Math.sin(t * 3 + ph) * 0.3; p.aRr = Math.cos(t * 3 + ph) * 0.2; p.aLp = -1.0; p.lean = 0.35; p.headPitch = 0.5; }, { held: 'wrench' });
def('under_car', 'lie', (p, t, ph) => { p.lie = 1; p.aRp = -2.8 + Math.sin(t * 3 + ph) * 0.2; p.aLp = -2.9; p.bob = 0.05; }, { held: 'wrench' });
def('fish', 'stand', (p, t, ph) => { p.aLp = -1.0; p.aRp = -1.1; p.aLr = -0.2; p.aRr = -0.25; if (Math.sin(t * 0.3 + ph * 5) > 0.97) { p.aRp = -1.7; p.aLp = -1.6; } p.headPitch = 0.1; }, { held: 'fishing_rod' });
def('fish_sit', 'sit', (p, t, ph) => { p.aLp = -1.0; p.aRp = -1.1; p.aLr = -0.2; p.aRr = -0.25; if (Math.sin(t * 0.3 + ph * 5) > 0.97) { p.aRp = -1.7; } }, { held: 'fishing_rod' });
def('paint', 'stand', (p, t, ph) => { p.aRp = -1.35 + Math.sin(t * 2.5 + ph) * 0.12; p.aRr = Math.cos(t * 3 + ph) * 0.12; p.aLp = -0.7; p.aLr = 0.2; p.headPitch = 0.05; p.headYaw = Math.sin(t * 0.3) > 0.8 ? 0.8 : 0; }, { held: 'paintbrush' });
def('chess', 'sit', (p, t, ph) => { p.headPitch = 0.55; p.lean = 0.15; p.aLp = -0.8; p.aRp = -0.8; p.aLr = -0.3; if (Math.sin(t * 0.33 + ph * 5) > 0.85) { p.aRp = -1.2; p.aRr = 0; } else { p.aRr = -0.5; } });
def('cards', 'sit', (p, t, ph) => { p.aLp = -1.1; p.aLr = -0.2; p.aRp = -0.9; p.aRr = -0.2; p.headPitch = 0.3; if (Math.sin(t * 0.5 + ph * 5) > 0.8) p.aRp = -1.3; }, { held: 'cards' });
def('bowl', 'stand', (p, t, ph) => { const c = (t * 0.25 + ph) % 1; if (c < 0.3) { p.aRp = 1.2 - c * 8; p.lean = 0.3; p.hL = -0.6; p.kL = 0.5; p.hR = 0.4; } else idle(p, t, ph); });
def('microscope', 'sit', (p) => { p.headPitch = 0.6; p.lean = 0.2; p.aLp = -1.0; p.aRp = -1.0; });
def('exam', 'stand', (p, t, ph) => { idle(p, t, ph); p.aRp = -1.2; p.aLp = -0.9; p.headPitch = 0.4; p.lean = 0.12; });
def('teach', 'stand', (p, t, ph, k) => { A.talk.fn(p, t, ph, k); if (Math.sin(t * 0.2 + ph) > 0.5) { p.aRp = -1.9; p.aRr = 0.3; } }, { held: 'chalk' });
def('pace', 'walk', null, { pace: 3.0 });
def('stroll', 'walk', null, {});
def('play', 'walk', null, { circle: 1.6, speed: 2.4 });
def('play_ball', 'stand', (p, t, ph) => { const c = Math.sin(t * 2.2 + ph); p.aLp = -1.0 + c * 0.6; p.aRp = -1.0 - c * 0.6; p.bob = Math.max(0, Math.sin(t * 4.4 + ph)) * 0.08; p.mouth = c > 0.5 ? 1 : 0; });
def('jump_rope', 'stand', (p, t, ph) => { p.bob = Math.max(0, Math.sin(t * 7 + ph)) * 0.14; p.kL = p.kR = Math.max(0, -Math.sin(t * 7 + ph)) * 0.4; p.aLp = -0.3 + Math.sin(t * 7) * 0.2; p.aRp = -0.3 + Math.sin(t * 7) * 0.2; p.aLr = 0.5; p.aRr = 0.5; p.mouth = 1; });
def('hopscotch', 'walk', null, { pace: 2.0, hop: true });
def('swing', 'sit', (p, t, ph) => { const s = Math.sin(t * 1.9 + ph); p.aLp = -2.5; p.aRp = -2.5; p.aLr = 0.1; p.aRr = 0.1; p.lean = -s * 0.25; p.kL = p.kR = Math.PI / 2 - s * 0.6; p.swing = s; p.mouth = s > 0.8 ? 1 : 0; });
def('cry', 'stand', (p, t, ph) => { p.aLp = -2.2; p.aRp = -2.2; p.aLr = -0.6; p.aRr = -0.6; p.headPitch = 0.4; p.bob = Math.abs(Math.sin(t * 5 + ph)) * 0.01; });
def('pet_dog', 'kneel', (p, t, ph) => { p.lean = 0.2; p.aRp = -0.6 + Math.sin(t * 3 + ph) * 0.15; p.headPitch = 0.4; p.mouth = 1; });
def('feed_birds', 'sit', (p, t, ph) => { const s = Math.max(0, Math.sin(t * 0.9 + ph)); p.aRp = -0.7 - s * 0.4; p.aRr = 0.3 * s; p.headPitch = 0.4; });
def('photograph', 'stand', (p) => { p.aLp = -1.6; p.aRp = -1.6; p.aLr = -0.45; p.aRr = -0.45; p.headPitch = 0.15; }, { held: 'camera' });
def('toast', 'stand', (p, t, ph) => { idle(p, t, ph); p.aRp = -2.6; p.aRr = 0.1; p.mouth = 1; }, { held: 'glass_wine' });
def('toast_sit', 'sit', (p) => { p.aRp = -2.4; p.aRr = 0.1; p.mouth = 1; }, { held: 'glass_wine' });
def('blow_candles', 'stand', (p, t) => { p.lean = 0.3; p.headPitch = 0.3; p.mouth = Math.sin(t * 3) > 0 ? 1 : 0; p.aLp = -0.4; p.aRp = -0.4; });
def('smoke_pipe', 'stand', (p, t, ph) => { idle(p, t, ph); const c = Math.max(0, Math.sin(t * 0.3 + ph)) ** 4; p.aRp = -0.6 - c * 1.3; p.aRr = -0.3 * c; }, { held: 'pipe' });
def('hail_taxi', 'stand', (p, t) => { p.aRp = -2.9; p.aRr = 0.3 + Math.sin(t * 5) * 0.05; p.headYaw = 0.5; });
def('lie_grass', 'lie', (p, t, ph) => { p.lie = 1; p.aLp = -2.6; p.aRp = -2.6; p.aLr = 0.6; p.aRr = 0.6; p.bob = 0.02; p.headYaw = Math.sin(t * 0.2 + ph) * 0.2; });
def('sunbathe', 'lie', (p) => { p.lie = 1; p.bob = 0.02; p.blinkForce = 1; });

export const ACTIVITIES = A;
export function activity(name) { return A[name] || A.stand; }

// Build the posture for an activity at a spot. k: { t (seconds), ph (per-person phase), seat, s (scale), speaking }
export function applyActivity(p, name, k) {
  const a = activity(name);
  resetPose(p);
  p.yawOffset = 0; p.blinkForce = 0; p.swing = 0;
  const s = k.s || 1;
  if (a.base === 'sit') sitBase(p, k.seat || 0.45, s);
  else if (a.base === 'kneel') kneelBase(p, s);
  else if (a.base === 'sleep') { p.lie = 1; p.bob = (k.seat || 0.55) - 0.12; p.aLr = 0.05; p.aRr = 0.05; }
  if (a.fn) a.fn(p, k.t, k.ph, k);
  return a;
}
