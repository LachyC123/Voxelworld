// Special / unique props (dynamic text signs, one-offs). Built by the core team.
import { defineProp, PROP_DEFS } from '../props.js';

// Street name sign at a corner: two blades, one per street.
export function streetSignType(a, b) {
  const name = `street_sign:${a}|${b}`;
  if (PROP_DEFS.has(name)) return name;
  const len = Math.max(a.length, b.length) * 4 + 6;
  const sx = Math.max(len, 20) + 2;
  defineProp(name, {
    size: [sx, 52, sx], scale: 1 / 16, cat: 'exterior',
    build(m) {
      const c = Math.floor(sx / 2);
      m.box(c - 1, 0, c - 1, 2, 48, 2, '#2e3d34');
      m.box(c - 2, 0, c - 2, 4, 2, 4, '#26322b');
      m.box(c - 1, 48, c - 1, 2, 2, 2, '#c9a24a');
      // blade A along x (reads from the south), blade B along z
      const la = a.length * 4 - 1, lb = b.length * 4 - 1;
      const ax0 = c - Math.floor((la + 4) / 2);
      m.box(ax0, 40, c - 1, la + 4, 7, 1, '#1f4a33'); m.box(ax0, 40, c + 1, la + 4, 7, 1, '#1f4a33');
      m.box(ax0, 40, c, la + 4, 7, 1, '#1f4a33');
      m.text(a, ax0 + 2, 41, c + 2, '#f0ecdc', { font: 'small' });
      m.textBack(a, ax0 + 2 + la, 41, c - 2, '#f0ecdc', { font: 'small' });
      const bz0 = c - Math.floor((lb + 4) / 2);
      m.box(c - 1, 32, bz0, 3, 7, lb + 4, '#1f4a33');
      // text along z: draw pixel columns manually on both x faces
      drawZ(m, b, c + 2, 33, bz0 + 2 + lb - 1, '#f0ecdc', true);
      drawZ(m, b, c - 2, 33, bz0 + 2, '#f0ecdc', false);
    },
  });
  return name;
}

import { layoutText } from '../../world/font.js';
function drawZ(m, str, x, y, z0, col, flip) {
  const L = layoutText(str, 'small');
  for (const p of L.pixels) m.box(x, y + p.y, flip ? z0 - p.x : z0 + p.x, 1, 1, 1, col);
}

// Generic flat sign board with text, for shop fronts at prop scale.
export function textSignType(text, o = {}) {
  const bg = o.bg || '#1f4a33', fg = o.fg || '#f0e2b0', border = o.border || '#c9a24a';
  const name = `sign:${text}:${bg}:${fg}:${border}:${o.scale || 16}`;
  if (PROP_DEFS.has(name)) return name;
  const L = text.length * 4 + 5, H = 11;
  defineProp(name, {
    size: [L, H, 2], scale: o.scale || 1 / 16, origin: [L / 2, 0, 0], cat: o.cat || 'exterior',
    build(m) {
      m.box(0, 0, 0, L, H, 1, border);
      m.box(1, 1, 0, L - 2, H - 2, 1, bg);
      m.text(text, 3, 3, 1, fg, { font: 'small' });
    },
  });
  return name;
}
