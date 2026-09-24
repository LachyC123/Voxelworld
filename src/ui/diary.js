// The Spotter's Diary: a small leather notebook the player lifts into view (Tab / I / the Diary
// button). Pages are drawn in "handwriting" onto canvases mapped onto a 3D book held in two
// voxel-ish hands attached to the camera. It opens, pages flip, ticks appear in pencil, and a
// little peek of the book comes up in the corner whenever something new is spotted.
import * as THREE from 'three';
import { fmtTime } from '../core/util.js';
import { wob } from '../sim/hunt.js';

const PW = 0.124, PH = 0.172;           // one page, metres
const CW = 768, CH = Math.round(768 * PH / PW);
const HAND = '"Diary Hand", "Caveat", "Segoe Print", "Bradley Hand", cursive';
const TYPE = '"Diary Type", "Special Elite", "Courier New", monospace';
const INK = '#16214a', PENCIL = '#46464c', PAPER = '#f3ebd4';
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

function canvas() { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return c; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }

export class Diary {
  constructor(game, hunt) {
    this.g = game; this.hunt = hunt;
    const R = game.R;
    if (!R.camera.parent) R.scene.add(R.camera);
    this.s = 0; this.want = 0; this.peek = 0; this.peekUntil = 0;
    this.spread = 0; this.flipT = -1;
    this.pages = null;
    // canvases: left, right, flip front (old right), flip back (new left)
    this.cL = canvas(); this.cR = canvas(); this.cF = canvas(); this.cB = canvas();
    this.tL = tex(this.cL); this.tR = tex(this.cR); this.tF = tex(this.cF); this.tB = tex(this.cB);
    this.mats = [];
    this.build();
    R.camera.add(this.root);
    this.fontReady = false;
    const f = document.fonts;
    if (f && f.load) Promise.all([f.load(`48px ${HAND}`), f.load(`30px ${TYPE}`)]).then(() => { this.fontReady = true; this.dirty = true; }).catch(() => { this.fontReady = true; this.dirty = true; });
    else this.fontReady = true;
    this.dirty = true;
    this.buttons();
  }

  // ---------------------------------------------------------------- the book & hands
  mat(color, map = null) {
    const m = new THREE.MeshBasicMaterial({ color, map, fog: false });
    m.userData.base = new THREE.Color(color);
    this.mats.push(m);
    return m;
  }
  box(w, h, d, mat, x, y, z, parent) {
    const g = new THREE.BoxGeometry(w, h, d);
    const shade = [0.78, 0.78, 1.0, 0.62, 0.95, 0.7], col = [];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) col.push(shade[f], shade[f], shade[f]);
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    if (!mat.vertexColors && !mat.map) { mat.vertexColors = true; mat.needsUpdate = true; }
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); parent.add(m); return m;
  }
  plane(map, x, parent, ry = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), this.mat('#ffffff', map)); m.position.set(x, 0, 0.0007); m.rotation.y = ry; parent.add(m); return m; }

  build() {
    const root = this.root = new THREE.Group();
    root.visible = false;
    const book = this.book = new THREE.Group(); root.add(book);
    const leather = this.mat('#2e4634'), leatherD = this.mat('#223528'), edge = this.mat('#e8dcbc'), gilt = this.mat('#c9a24a');
    // right half (fixed)
    const rh = new THREE.Group(); book.add(rh);
    this.box(PW + 0.006, PH + 0.008, 0.003, leather, PW / 2 + 0.003, 0, -0.0062, rh);
    this.box(PW, PH, 0.0052, edge, PW / 2, 0, -0.0022, rh);
    this.pR = this.plane(this.tR, PW / 2, rh);
    // left half hinges at the spine
    const lh = this.lh = new THREE.Group(); book.add(lh);
    this.box(PW + 0.006, PH + 0.008, 0.003, leather, -PW / 2 - 0.003, 0, -0.0062, lh);
    this.box(PW, PH, 0.0052, edge, -PW / 2, 0, -0.0022, lh);
    this.pL = this.plane(this.tL, -PW / 2, lh);
    // cover lettering (seen when closed): a gilt label on the outside of the left cover
    const lab = this.box(0.05, 0.022, 0.0008, gilt, -PW / 2 - 0.003, 0.03, -0.0081, lh); void lab;
    // spine, ribbon, elastic
    this.box(0.007, PH + 0.008, 0.012, leatherD, 0, 0, -0.004, book);
    const rib = this.box(0.0035, 0.05, 0.0006, this.mat('#9a2424'), 0.02, -PH / 2 - 0.012, 0.0012, book); rib.rotation.z = 0.12;
    // a pencil tucked along the right edge
    const pencil = new THREE.Group(); pencil.position.set(PW + 0.007, -0.004, -0.004); book.add(pencil);
    this.box(0.0042, 0.082, 0.0042, this.mat('#c79a34'), 0, 0, 0, pencil);
    this.box(0.0045, 0.007, 0.0045, this.mat('#a8a8a0'), 0, 0.0445, 0, pencil);
    this.box(0.004, 0.007, 0.004, this.mat('#b87070'), 0, 0.051, 0, pencil);
    this.box(0.0028, 0.008, 0.0028, this.mat('#d8b890'), 0, -0.045, 0, pencil);
    this.box(0.0012, 0.004, 0.0012, this.mat('#2a2a2a'), 0, -0.051, 0, pencil);
    // flip page (turns over the spine)
    const fl = this.flip = new THREE.Group(); fl.visible = false; book.add(fl);
    const ff = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), this.mat('#ffffff', this.tF)); ff.position.set(PW / 2, 0, 0.0015); fl.add(ff);
    const fb = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), this.mat('#ffffff', this.tB)); fb.position.set(PW / 2, 0, 0.0013); fb.rotation.y = Math.PI; fl.add(fb);
    // hands: the player's red sleeves and a thumb over each page's bottom corner
    const skin = this.mat('#e2b48e'), sleeve = this.mat('#b3302a'), cuff = this.mat('#8a2420');
    for (const side of [-1, 1]) {
      const h = new THREE.Group(); h.position.set(side * (PW + 0.002), -PH / 2 + 0.006, 0); book.add(h);
      const th = this.box(0.013, 0.024, 0.005, skin, -side * 0.012, 0.004, 0.0035, h); th.rotation.z = side * 0.55;   // thumb on the page corner
      this.box(0.034, 0.03, 0.012, skin, side * 0.004, -0.012, -0.012, h);       // palm & fingers behind the cover
      const arm = new THREE.Group(); arm.position.set(side * 0.006, -0.034, -0.014); h.add(arm);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(side * 0.24, -0.34, 0.26).normalize());
      const s = this.box(0.056, 0.05, 0.34, sleeve, 0, 0, 0.19, arm);
      this.box(0.06, 0.054, 0.018, cuff, 0, 0, 0.022, arm); void s;
    }
    for (const m of this.mats) m.depthTest = true;
    root.traverse((o) => { o.layers.set(1); o.renderOrder = 30; o.frustumCulled = false; });
  }

  // ---------------------------------------------------------------- pages
  layout() {
    const items = this.hunt.items;
    const cats = [...new Set(items.map((i) => i.cat))];
    const pages = [{ kind: 'intro' }];
    for (const c of cats) {
      const list = items.filter((i) => i.cat === c);
      for (let k = 0; k < list.length; k += 9) pages.push({ kind: 'list', cat: c, items: list.slice(k, k + 9), cont: k > 0 });
    }
    pages.push({ kind: 'end' });
    if (pages.length % 2) pages.splice(pages.length - 1, 0, { kind: 'notes' });
    this.pages = pages;
  }
  get spreads() { return Math.ceil(this.pages.length / 2); }

  paper(c, idx) {
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = PAPER; x.fillRect(0, 0, CW, CH);
    // soft age at the edges
    const gr = x.createRadialGradient(CW / 2, CH / 2, CH * 0.25, CW / 2, CH / 2, CH * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(120,90,40,0.16)');
    x.fillStyle = gr; x.fillRect(0, 0, CW, CH);
    x.strokeStyle = 'rgba(90,130,190,0.35)'; x.lineWidth = 2;
    for (let y = 150; y < CH - 60; y += 44) { x.beginPath(); x.moveTo(0, y); x.lineTo(CW, y); x.stroke(); }
    x.strokeStyle = 'rgba(200,60,60,0.45)'; x.beginPath(); x.moveTo(idx % 2 ? 70 : CW - 70, 0); x.lineTo(idx % 2 ? 70 : CW - 70, CH); x.stroke();
    x.fillStyle = PENCIL; x.font = `26px ${HAND}`; x.textAlign = 'center'; x.fillText(String(idx + 1), CW / 2, CH - 28); x.textAlign = 'left';
    return x;
  }
  write(x, text, px, py, size, color = INK, o = {}) {
    x.font = `${o.bold ? '700' : (o.weight || '600')} ${size}px ${o.font || HAND}`; x.fillStyle = color;
    const maxW = o.maxW || CW - px - 60;
    const words = String(text).split(' ');
    let line = '', y = py, n = 0;
    const flush = () => { x.save(); x.translate(px, y); x.rotate(wob(n, py) * 0.012); x.fillText(line, 0, 0); x.restore(); n++; };
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { flush(); line = w; y += o.lh || size * 1.02; } else line = t;
    }
    if (line) flush();
    return y + (o.lh || size * 1.02);
  }
  tick(x, cx, cy, s, seed) {
    x.strokeStyle = 'rgba(60,60,64,0.9)'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(cx - s * 0.45, cy - s * 0.05 + wob(seed, 1) * 4); x.quadraticCurveTo(cx - s * 0.2, cy + s * 0.25, cx - s * 0.08, cy + s * 0.38);
    x.quadraticCurveTo(cx + s * 0.2, cy - s * 0.2, cx + s * 0.62, cy - s * 0.62 + wob(seed, 2) * 6); x.stroke();
  }
  stamp(x, cx, cy, r, top, mid, color, rot) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.globalAlpha = 0.72;
    x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 5;
    x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(0, 0, r - 9, 0, Math.PI * 2); x.stroke();
    x.textAlign = 'center'; x.font = `${Math.round(r * 0.28)}px ${TYPE}`; x.fillText(top, 0, -r * 0.3);
    x.font = `${Math.round(r * 0.36)}px ${TYPE}`; x.fillText(mid, 0, r * 0.12);
    x.font = `${Math.round(r * 0.2)}px ${TYPE}`; x.fillText('★ JUNIPER BAY ★', 0, r * 0.5);
    x.restore(); x.textAlign = 'left';
  }

  drawPage(c, idx) {
    const x = this.paper(c, idx);
    const pg = this.pages[idx];
    if (!pg) return;
    const H = this.hunt, n = H.count, N = H.total;
    const L = idx % 2 === 0 ? 100 : 110;
    if (pg.kind === 'intro') {
      this.write(x, 'My Spotter\'s Diary', L, 118, 76, INK, { bold: true });
      this.write(x, 'Juniper Bay · Harbor Days · Saturday, Sept. 26, 1953', L, 190, 36, PENCIL);
      let y = this.write(x, 'Keep your eyes peeled! Everything on my list is somewhere in town. When I look at one properly, I tick it off.', L, 282, 42, INK, { lh: 44 });
      y = this.write(x, 'Some things only happen at certain times of day — the pencil hints help.', L, y + 44, 42, INK, { lh: 44 });
      x.fillStyle = INK; x.font = `700 56px ${HAND}`; x.fillText(`Spotted: ${n} of ${N}`, L, y + 88);
      // a little lighthouse doodle
      this.doodle(x, CW - 190, y + 40);
      const sy = CH - 250;
      if (n >= 10) this.stamp(x, 200, sy, 92, 'KEEN', 'EYES', '#2a5aa0', -0.22);
      if (n >= Math.ceil(N / 2)) this.stamp(x, 400, sy + 30, 92, 'SHARP AS', 'A TACK', '#a02a2a', 0.15);
      if (n >= N) this.stamp(x, 590, sy - 10, 92, 'TOWN', 'DETECTIVE', '#2a7a3a', -0.08);
      if (n < 10) this.write(x, '(ten spotted gets a stamp)', L, sy, 34, PENCIL);
      this.write(x, 'Tab / I — close · A D or ← → — turn pages', L, CH - 80, 30, PENCIL);
    } else if (pg.kind === 'list') {
      this.write(x, pg.cat + (pg.cont ? ' (cont.)' : ''), L, 118, 58, INK, { bold: true });
      let y = 200;
      pg.items.forEach((it, k) => {
        const got = H.spotted.has(it.id);
        x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(L, y - 30, 30, 30);
        if (got) this.tick(x, L + 15, y - 15, 36, k + idx * 13);
        const ny = this.write(x, it.what, L + 50, y, 40, got ? '#3a4a78' : INK, { maxW: CW - L - 110, lh: 40 });
        let hy = ny - 6;
        if (got) { x.fillStyle = PENCIL; x.font = `30px ${HAND}`; x.fillText(`spotted at ${fmtTime(H.spotted.get(it.id)).toLowerCase()}`, L + 50, hy); }
        else if (it.hint) this.write(x, it.hint, L + 50, hy, 30, PENCIL, { maxW: CW - L - 110, lh: 30 });
        y = hy + 58;
      });
    } else if (pg.kind === 'notes') {
      this.write(x, 'Notes', L, 118, 58, INK, { bold: true });
      const notes = ['Mother says home by the time the fireworks finish.', 'Ask Mr. Fisk how many steps up the lighthouse.', 'The trolley bell means it\'s coming — stand back.', 'Admiral has been up that tree four times since Easter.', 'Pie judging at the fair. Mrs. Halloran\'s apple is the one to beat.'];
      let y = 210; notes.forEach((t, i) => { y = this.write(x, '— ' + t, L, y, 38, i % 2 ? PENCIL : INK, { lh: 40 }) + 24; });
    } else if (pg.kind === 'end') {
      if (n >= N) {
        this.write(x, 'Certificate', CW / 2 - 150, 150, 70, '#2a5a2a', { bold: true });
        let y = this.write(x, 'This is to certify that the bearer of this diary has spotted every last thing on the list, and is hereby declared an Honorary Town Detective of Juniper Bay.', L, 260, 42, INK, { lh: 46 });
        this.write(x, 'Signed, Frank Rourke, Juniper Bay Police', L, y + 60, 38, PENCIL);
        this.stamp(x, CW / 2, CH - 330, 130, 'HONORARY', 'DETECTIVE', '#2a7a3a', -0.12);
      } else {
        this.write(x, 'Still to find', L, 118, 58, INK, { bold: true });
        const left = H.items.filter((i) => !H.spotted.has(i.id));
        let y = 210;
        for (const it of left.slice(0, 13)) { y = this.write(x, '· ' + it.what, L, y, 32, PENCIL, { lh: 34 }) + 10; if (y > CH - 140) break; }
        if (left.length > 13) this.write(x, `…and ${left.length - 13} more`, L, y + 10, 32, PENCIL);
      }
    }
  }
  doodle(x, cx, cy) {
    x.save(); x.strokeStyle = PENCIL; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx - 22, cy + 120); x.lineTo(cx - 12, cy); x.lineTo(cx + 12, cy); x.lineTo(cx + 22, cy + 120); x.stroke();
    x.strokeRect(cx - 16, cy - 26, 32, 26); x.beginPath(); x.moveTo(cx - 20, cy - 26); x.lineTo(cx, cy - 44); x.lineTo(cx + 20, cy - 26); x.stroke();
    for (const [a, l] of [[-0.25, 70], [0.2, 90], [-3.0, 60]]) { x.beginPath(); x.moveTo(cx, cy - 13); x.lineTo(cx + Math.cos(a) * l, cy - 13 + Math.sin(a) * l * 0.3); x.stroke(); }
    x.beginPath(); for (let i = 0; i < 6; i++) { const wx = cx - 80 + i * 28; x.moveTo(wx, cy + 128); x.quadraticCurveTo(wx + 7, cy + 120, wx + 14, cy + 128); } x.stroke();
    x.restore();
  }

  redraw() {
    if (!this.pages) this.layout();
    const i = this.spread * 2;
    this.drawPage(this.cL, i); this.drawPage(this.cR, i + 1);
    this.tL.needsUpdate = true; this.tR.needsUpdate = true;
    this.dirty = false;
  }

  // ---------------------------------------------------------------- controls
  get isUp() { return this.want === 1 || this.s > 0.02; }
  toggle() { if (this.want) this.close(); else this.openBook(); }
  openBook() {
    if (this.g.player.mode === 'aerial') { this.g.hud.toast('Land first — the diary lives in your pocket.', 3); return; }
    this.want = 1; this.layout(); this.dirty = true;
    this.prevFrozen = this.g.player.frozen; this.g.player.frozen = true;
    this.g.audio.page && this.g.audio.page();
    this.el.classList.remove('hidden');
    this.g.syncDiaryButton && this.g.syncDiaryButton();
  }
  close() { this.want = 0; this.g.player.frozen = this.prevFrozen || false; this.el.classList.add('hidden'); }
  turn(d) {
    if (!this.want || this.flipT >= 0) return;
    const to = Math.max(0, Math.min(this.spreads - 1, this.spread + d));
    if (to === this.spread) return;
    const from = this.spread;
    // flip page: forward = the old right page turns over onto the left; back = the old left turns back
    if (d > 0) { this.drawPage(this.cF, from * 2 + 1); this.drawPage(this.cB, to * 2); this.drawPage(this.cR, to * 2 + 1); this.tR.needsUpdate = true; }
    else { this.drawPage(this.cF, to * 2 + 1); this.drawPage(this.cB, from * 2); this.drawPage(this.cL, to * 2); this.tL.needsUpdate = true; }
    this.tF.needsUpdate = true; this.tB.needsUpdate = true;
    this.flipDir = d; this.flipT = 0; this.spread = to;
    this.g.audio.page && this.g.audio.page();
  }
  spottedPeek() { this.peekUntil = this.g.time + 2.2; this.dirty = true; }

  buttons() {
    const el = this.el = document.createElement('div');
    el.id = 'diary-nav'; el.className = 'hidden';
    el.innerHTML = '<button class="pill ghost" data-d="-1">‹ page</button><button class="pill ghost" data-d="0">Close</button><button class="pill ghost" data-d="1">page ›</button>';
    el.addEventListener('click', (e) => { const d = e.target.dataset && e.target.dataset.d; if (d === undefined) return; if (d === '0') this.close(); else this.turn(Number(d)); });
    document.body.appendChild(el);
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.g, inp = g.input;
    if (this.want) {
      if (inp.hit('KeyA') || inp.hit('ArrowLeft')) this.turn(-1);
      if (inp.hit('KeyD') || inp.hit('ArrowRight')) this.turn(1);
      if (inp.wheel) this.turn(inp.wheel > 0 ? 1 : -1);
      if (inp.hit('Escape') || g.player.mode === 'aerial') this.close();
    }
    if (this.dirty && this.fontReady && (this.want || this.s > 0)) this.redraw();
    this.s += (this.want - this.s) * Math.min(1, dt * 5.5);
    if (Math.abs(this.want - this.s) < 0.002) this.s = this.want;
    const peekOn = !this.want && g.time < this.peekUntil ? 1 : 0;
    this.peek += (peekOn - this.peek) * Math.min(1, dt * 5);
    const vis = this.s > 0.004 || this.peek > 0.01;
    this.root.visible = vis;
    if (!vis) return;
    // poses: hidden (at the hip) → peek (corner) → open (in front of the eyes)
    const cam = g.R.camera, aspect = cam.aspect;
    const d = Math.max(0.2, 0.27 / (2 * Math.tan(cam.fov * Math.PI / 360) * aspect * 0.9));
    const e = ease(this.s);
    let px = lerp(0.12, 0, e), py = lerp(-0.33, -0.004, e), pz = lerp(-0.3, -d, e);
    let rx = lerp(-1.25, -0.05, e), ry = lerp(0.35, 0, e), rz = lerp(0.3, 0, e);
    const pk = ease(this.peek) * (1 - e);
    px = lerp(px, 0.16 * aspect / 1.6, pk); py = lerp(py, -0.2, pk); pz = lerp(pz, -0.34, pk);
    rx = lerp(rx, -0.45, pk); ry = lerp(ry, -0.25, pk); rz = lerp(rz, 0.12, pk);
    // a gentle breathing sway
    const t = g.time;
    this.root.position.set(px + Math.sin(t * 0.9) * 0.0015, py + Math.sin(t * 1.3) * 0.0012, pz);
    this.root.rotation.set(rx + Math.sin(t * 1.1) * 0.004, ry, rz);
    const open = ease(Math.max(0, Math.min(1, (this.s - 0.45) / 0.55)));
    this.lh.rotation.y = Math.PI * (1 - open);
    // page flip
    if (this.flipT >= 0) {
      this.flipT += dt / 0.45;
      const k = ease(Math.min(1, this.flipT));
      this.flip.visible = true;
      this.flip.rotation.y = this.flipDir > 0 ? -Math.PI * k : -Math.PI * (1 - k);
      if (this.flipT >= 1) {
        this.flipT = -1; this.flip.visible = false;
        this.redraw();
      }
    }
    // dim the book at night (read by street light), bright by day
    const night = g.R.common.uNight.value;
    const b = lerp(1.18, 0.62, night) * (g.playerRoom ? 0.95 : 1);
    for (const m of this.mats) m.color.copy(m.userData.base).multiplyScalar(b);
  }
}
