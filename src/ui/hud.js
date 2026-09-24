// Heads-up display: clock panel, time controls, minimap, location, hints, prompts, overlays.
import { fmtTime } from '../core/util.js';
import { QUALITY } from '../core/config.js';
import { buildMapCanvas, drawLabels, MAP } from './map.js';
import { TIMELINE, FAMILIES, INSTITUTIONS, STREETS as STREET_LORE, TOWN } from '../city/lore.js';
import { newspaperHTML } from './newspaper.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(game) {
    this.g = game;
    this.el = { hud: $('hud'), clock: $('clock-time'), ampm: $('clock-ampm'), date: $('date-line'), mode: $('mode-label'), slider: $('time-slider'), loc: $('location'), hint: $('hint'), toast: $('toast'), prompt: $('prompt'), mm: $('minimap') };
    this.mmCtx = this.el.mm.getContext('2d');
    this.hintUntil = 0; this.toastUntil = 0;
    this.overlay = null;
    this.bind();
  }

  bind() {
    const g = this.g, c = g.clock;
    $('btn-pause').onclick = () => { c.paused = !c.paused; this.syncButtons(); };
    $('btn-1x').onclick = () => { c.speed = 1; c.paused = false; this.syncButtons(); };
    $('btn-60x').onclick = () => { c.speed = 60; c.paused = false; this.syncButtons(); };
    $('btn-quality').onclick = () => { const order = ['high', 'medium', 'low']; const i = (order.indexOf(g.qualityName) + 1) % 3; g.setQuality(order[i]); $('btn-quality').textContent = QUALITY[order[i]].label; };
    $('btn-help').onclick = () => this.open('help');
    $('btn-map').onclick = () => this.open('map-overlay');
    $('btn-view').onclick = () => { g.player.toggleView(); this.syncMode(); };
    $('btn-aerial').onclick = () => { if (g.player.mode === 'aerial') g.player.exitAerial(true); else g.player.enterAerial(); this.syncMode(); };
    $('btn-almanac').onclick = () => this.open('almanac');
    this.el.slider.addEventListener('input', () => { c.set(Number(this.el.slider.value)); g.onTimeJump(); });
    for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => this.close();
    for (const o of ['map-overlay', 'reader', 'help', 'almanac']) $(o).addEventListener('mousedown', (e) => { if (e.target.id === o) this.close(); });
    $('bigmap').addEventListener('click', (e) => {
      const r = e.target.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fz = (e.clientY - r.top) / r.height;
      const x = MAP.x0 + fx * (MAP.x1 - MAP.x0), z = MAP.z0 + fz * (MAP.z1 - MAP.z0);
      this.close(); g.travelTo(x, z);
    });
  }

  syncButtons() {
    const c = this.g.clock;
    $('btn-pause').classList.toggle('on', c.paused);
    $('btn-1x').classList.toggle('on', !c.paused && c.speed === 1);
    $('btn-60x').classList.toggle('on', !c.paused && c.speed === 60);
    $('btn-pause').textContent = c.paused ? '▶' : '❚❚';
  }
  syncMode() {
    const m = this.g.player.mode;
    this.el.mode.textContent = m === 'aerial' ? 'AERIAL VIEW' : m === 'third' ? 'ON FOOT' : 'ON FOOT';
    document.getElementById('crosshair').style.display = m === 'first' ? 'block' : 'none';
  }

  initMap(ctx) {
    this.mapCanvas = buildMapCanvas(ctx);
    // big map with labels
    const big = $('bigmap');
    const bg = big.getContext('2d');
    bg.drawImage(this.mapCanvas, 0, 0, big.width, big.height);
    const s = big.width / this.mapCanvas.width;
    drawLabels(bg, ctx, MAP.ppm * s, (x) => (x - MAP.x0) * MAP.ppm * s, (z) => (z - MAP.z0) * MAP.ppm * s);
    this.bigBase = bg.getImageData(0, 0, big.width, big.height);
    this.syncButtons(); this.syncMode();
  }

  open(id) {
    this.close();
    const g = this.g;
    if (id === 'map-overlay') this.renderEvents();
    if (id === 'almanac') this.renderAlmanac();
    $(id).classList.remove('hidden');
    this.overlay = id;
    g.input.enabled = false;
    if (document.pointerLockElement) document.exitPointerLock();
    if (id === 'map-overlay') this.drawBigMapMarkers();
  }
  close() {
    if (this.overlay) $(this.overlay).classList.add('hidden');
    this.overlay = null;
    this.g.input.enabled = true;
  }
  read(text) {
    $('reader-content').innerHTML = text.html || `<div class="plaque"><h1>${text.title}</h1></div><p class="typed" style="text-align:center;white-space:pre-line">${text.body || ''}</p>`;
    this.open('reader');
  }
  newspaper() { $('reader-content').innerHTML = newspaperHTML(this.g); this.open('reader'); }

  renderEvents() {
    const g = this.g, m = g.clock.minutes;
    const now = [], later = [];
    for (const ev of g.ctx.events) {
      const on = m >= ev.start && m < ev.end;
      (on ? now : ev.start > m ? later : null)?.push(ev);
    }
    later.sort((a, b) => a.start - b.start);
    const row = (ev) => `<div class="ev" data-ev="${ev.id}"><span class="t">${fmtTime(ev.start)}</span>${ev.icon || ''} ${ev.title}<span class="w">${ev.place} — ${ev.blurb}</span></div>`;
    $('events-now').innerHTML = now.length ? now.map(row).join('') : '<p class="fine">A quiet moment in Juniper Bay.</p>';
    $('events-later').innerHTML = later.length ? later.map(row).join('') : '<p class="fine">That\'s all for today. Tomorrow: the Centennial service at First Congregational.</p>';
    for (const el of document.querySelectorAll('#whats-on .ev')) el.onclick = () => { const ev = g.ctx.events.find((e) => e.id === el.dataset.ev); if (ev && ev.x !== null) { this.close(); g.travelTo(ev.x, ev.z, ev); } };
  }
  drawBigMapMarkers() {
    const big = $('bigmap'), bg = big.getContext('2d');
    bg.putImageData(this.bigBase, 0, 0);
    const s = big.width / this.mapCanvas.width;
    const X = (x) => (x - MAP.x0) * MAP.ppm * s, Z = (z) => (z - MAP.z0) * MAP.ppm * s;
    const m = this.g.clock.minutes;
    for (const ev of this.g.ctx.events) {
      if (ev.x === null) continue;
      const on = m >= ev.start && m < ev.end;
      bg.fillStyle = on ? '#c0302a' : 'rgba(80,60,30,0.6)';
      bg.beginPath(); bg.arc(X(ev.x), Z(ev.z), on ? 6 : 4, 0, Math.PI * 2); bg.fill();
      if (on) { bg.font = 'bold 11px Georgia'; bg.fillStyle = '#7a1a14'; bg.fillText(`${ev.icon || ''} ${ev.title}`, X(ev.x), Z(ev.z) - 12); }
    }
    const f = this.g.player.focus();
    bg.fillStyle = '#1a3a8a'; bg.beginPath(); bg.arc(X(f.x), Z(f.z), 6, 0, Math.PI * 2); bg.fill();
    bg.strokeStyle = '#fff'; bg.lineWidth = 2; bg.stroke();
  }

  renderAlmanac() {
    const tl = TIMELINE.map(([y, t]) => `<p><span class="yr">${y}</span>${t}</p>`).join('');
    const fam = Object.entries(FAMILIES).map(([n, f]) => `<p class="person"><b>${n}</b> — <i>${f.origin}.</i> ${f.note}</p>`).join('');
    const inst = INSTITUTIONS.map((i) => `<p class="person"><b>${i.name}</b> (${i.est}) — ${i.note}</p>`).join('');
    const st = Object.entries(STREET_LORE).map(([n, t]) => `<p class="person"><b>${n}</b> — ${t}</p>`).join('');
    const people = this.g.ctx.people.list.filter((p) => p.notable).slice(0, 60).map((p) => `<p class="person"><b>${p.full}</b> — ${p.bio}</p>`).join('');
    $('almanac-body').innerHTML = `<h3>${TOWN.name}, founded ${TOWN.founded}</h3><p><i>“${TOWN.motto}.”</i> Population ${TOWN.population}.</p>${tl}<h3>Families</h3>${fam}<h3>Institutions</h3>${inst}<h3>The Streets</h3>${st}<h3>Folks You May Meet</h3>${people}`;
  }

  hint(text, secs = 7) { this.el.hint.textContent = text; this.el.hint.classList.remove('hidden'); this.el.hint.style.opacity = 1; this.hintUntil = performance.now() / 1000 + secs; }
  toast(text, secs = 4) { this.el.toast.textContent = text; this.el.toast.classList.remove('hidden'); this.toastUntil = performance.now() / 1000 + secs; }
  prompt(html) { if (html) { if (this._prompt !== html) { this.el.prompt.innerHTML = html; this._prompt = html; } this.el.prompt.classList.remove('hidden'); } else if (this._prompt) { this.el.prompt.classList.add('hidden'); this._prompt = null; } }

  update(dt) {
    const g = this.g, c = g.clock, now = performance.now() / 1000;
    const t = fmtTime(c.minutes);
    const [hm, ap] = t.split(' ');
    if (this.el.clock.textContent !== hm) this.el.clock.textContent = hm;
    if (this.el.ampm.textContent !== ap) this.el.ampm.textContent = ap;
    const dl = c.dateLabel; if (this.el.date.textContent !== dl) this.el.date.textContent = dl;
    if (document.activeElement !== this.el.slider) this.el.slider.value = String(Math.floor(c.minutes));
    if (this.hintUntil && now > this.hintUntil) { this.el.hint.style.opacity = 0; if (now > this.hintUntil + 0.8) { this.el.hint.classList.add('hidden'); this.hintUntil = 0; } }
    if (this.toastUntil && now > this.toastUntil) { this.el.toast.classList.add('hidden'); this.toastUntil = 0; }
    this.drawMinimap();
    if (this.overlay === 'map-overlay' && (this._mapTick = (this._mapTick || 0) + dt) > 1) { this._mapTick = 0; this.drawBigMapMarkers(); }
  }

  drawMinimap() {
    if (!this.mapCanvas) return;
    const g = this.mmCtx, W = this.el.mm.width, H = this.el.mm.height;
    const f = this.g.player.focus();
    const yaw = this.g.player.mode === 'aerial' ? this.g.player.aerial.yaw : this.g.player.yaw;
    const aerial = this.g.player.mode === 'aerial';
    const scale = aerial ? 0.7 : 2.2; // canvas px per map px
    g.save();
    g.clearRect(0, 0, W, H);
    g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#d9c9a0'; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H / 2);
    g.scale(scale, scale);
    g.translate(-(f.x - MAP.x0) * MAP.ppm, -(f.z - MAP.z0) * MAP.ppm);
    g.imageSmoothingEnabled = false;
    g.drawImage(this.mapCanvas, 0, 0);
    // people dots nearby
    g.fillStyle = 'rgba(60,40,120,0.8)';
    for (const p of this.g.ctx.people.visible) { if (p.state.room) continue; g.fillRect((p.state.x - MAP.x0) * MAP.ppm - 0.8, (p.state.z - MAP.z0) * MAP.ppm - 0.8, 1.6, 1.6); }
    // events now
    const m = this.g.clock.minutes;
    for (const ev of this.g.ctx.events) { if (ev.x === null || m < ev.start || m >= ev.end) continue; g.fillStyle = '#c0302a'; g.beginPath(); g.arc((ev.x - MAP.x0) * MAP.ppm, (ev.z - MAP.z0) * MAP.ppm, 3.2 / scale * 2, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // player arrow
    g.save(); g.translate(W / 2, H / 2); g.rotate(-yaw);
    g.fillStyle = '#c0302a'; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.strokeStyle = '#7a5a22'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 1.5, 0, Math.PI * 2); g.stroke();
  }
  setLocation(text) { if (this.el.loc.textContent !== text) this.el.loc.textContent = text; }
}
