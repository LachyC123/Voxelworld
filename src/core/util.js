export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;

export function hexToRgb(hex) {
  if (Array.isArray(hex)) return hex;
  const n = typeof hex === 'number' ? hex : parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function wrapAngle(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

// "HH:MM" or minutes -> minutes
export function tm(v) {
  if (typeof v === 'number') return v;
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(v.trim());
  if (!m) throw new Error('bad time ' + v);
  let h = +m[1]; const mi = +m[2];
  if (m[3]) { const pm = m[3].toLowerCase() === 'pm'; if (h === 12) h = 0; if (pm) h += 12; }
  return h * 60 + mi;
}

export function fmtTime(minutes, withAmPm = true) {
  const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  let h = Math.floor(m / 60); const mi = m % 60;
  const pm = h >= 12; h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(mi).padStart(2, '0')}${withAmPm ? (pm ? ' PM' : ' AM') : ''}`;
}

// Growable typed arrays used by builders.
export class GrowI32 {
  constructor(cap = 1024) { this.a = new Int32Array(cap); this.n = 0; }
  push(...v) { this.reserve(v.length); for (let i = 0; i < v.length; i++) this.a[this.n++] = v[i]; }
  reserve(k) { if (this.n + k > this.a.length) { const b = new Int32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a.subarray(0, this.n)); this.a = b; } }
  view() { return this.a.subarray(0, this.n); }
}
