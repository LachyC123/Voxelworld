// Prop viewer: propview.html?filter=chair,table&cols=8&t=720&dist=1.0&yaw=0.6
// Lays out every matching prop on a grid and renders it (used for checking prop models).
import * as THREE from 'three';
import { Renderer } from '../render/renderer.js';
import { World } from '../world/world.js';
import { MAT } from '../world/materials.js';
import { Props, PROP_DEFS } from '../props/props.js';
import '../props/lib/index.js';
import { RoomTexture } from '../render/roomTex.js';
import { Lights } from '../render/lights.js';
import { QUALITY } from '../core/config.js';

const q = new URLSearchParams(location.search);
const filters = (q.get('filter') || '').split(',').filter(Boolean);
const names = [...PROP_DEFS.keys()].filter((n) => !filters.length || filters.some((f) => n.includes(f)));
const cols = Number(q.get('cols') || Math.ceil(Math.sqrt(names.length)));
const R = new Renderer(document.getElementById('view'));
R.setQuality(QUALITY.high);
const world = new World();
world.box(-400, -4, -400, 400, 0, 400, MAT.floor_concrete);
world.finalize();
const lights = new Lights();
const ctx = { world, lights };
const props = new Props(ctx);
ctx.props = props;
// spacing from bounding boxes
const sizes = names.map((n) => { const d = PROP_DEFS.get(n); const s = d.scale || 1 / 16; return Math.max(d.size[0], d.size[2]) * s; });
const cell = Math.max(1.5, Math.min(12, Math.max(...sizes) * 1.15));
const spots = [];
names.forEach((n, i) => {
  const x = (i % cols) * cell, z = Math.floor(i / cols) * cell;
  props.add(n, x, 0, z, Number(q.get('yaw') || 0.5), { tint: q.get('tint') || '#b03a2e', tint2: '#2a4a7a', cat: 'far' });
  spots.push([n, x, z]);
});
props.finalize(world);
props.attach(R.scene, R.propMat);
const rt = new RoomTexture(world, R.common); rt.flush();
const rows = Math.ceil(names.length / cols);
const cx = (cols - 1) * cell / 2, cz = (rows - 1) * cell / 2;
const span = Math.max(cols, rows) * cell;
const dist = Number(q.get('dist') || 1) * span * 0.9 + 2;
R.camera.position.set(cx, dist * 0.55, cz + dist * 0.8);
R.camera.lookAt(cx, 0.5, cz);
const t = Number(q.get('t') || 760);
R.tod.update(t);
lights.update(R.common, R.camera.position, R.common.uNight.value, [], 0, 24);
props.update(R.camera.position, [9999, 9999, 9999], true);
R.shadowRange = span;
R.render(new THREE.Vector3(cx, 0, cz));
const lab = document.getElementById('labels');
for (const [n, x, z] of spots) {
  const v = new THREE.Vector3(x, 0, z + cell * 0.35).project(R.camera);
  const d = document.createElement('div'); d.className = 'lbl'; d.textContent = n;
  d.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; d.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
  lab.appendChild(d);
}
function loop() { R.tod.update(t); lights.update(R.common, R.camera.position, R.common.uNight.value, [], performance.now() / 1000, 24); props.update(R.camera.position, [9999, 9999, 9999]); R.render(new THREE.Vector3(cx, 0, cz)); requestAnimationFrame(loop); }
loop();
window.__ready = true;
console.log('props shown:', names.length);
