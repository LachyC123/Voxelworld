// Game: wires the town, renderer, simulation, player and UI together and runs the loop.
import * as THREE from 'three';
import { QUALITY, VS, DATE_LABEL } from './core/config.js';
import { Renderer } from './render/renderer.js';
import { WorldMeshes } from './render/worldMeshes.js';
import { RoomTexture } from './render/roomTex.js';
import { buildCity } from './city/city.js';
import './props/lib/index.js';
import { Characters } from './people/characters.js';
import { Clock } from './sim/clock.js';
import { RoomLights } from './sim/roomLights.js';
import { Input } from './player/input.js';
import { Collision } from './player/collision.js';
import { Player } from './player/player.js';
import { HUD } from './ui/hud.js';
import { Bubbles } from './ui/bubbles.js';
import { greeting } from './sim/dialogue.js';
import { AVENUES, STREETS, SQUARE, BEACH } from './city/layout.js';
import { makeLook } from './people/appearance.js';
import { RNG } from './core/rng.js';
import { Terrain } from './render/terrain.js';
import { createWater } from './render/water.js';
import { Traffic, Trolleys, Trains } from './vehicles/traffic.js';
import { Boats } from './vehicles/boats.js';
import { Birds } from './sim/birds.js';
import { Fireworks } from './render/fireworks.js';
import { LifeRuntime } from './sim/life/runtime.js';
import { Audio } from './audio/audio.js';
import { LighthouseBeam } from './render/beam.js';
import { LIGHTHOUSE } from './city/layout.js';

const $ = (id) => document.getElementById(id);

export class Game {
  constructor() {
    this.params = new URLSearchParams(location.search);
    this.clock = new Clock();
    if (this.params.get('t')) this.clock.abs = Number(this.params.get('t'));
    this.qualityName = this.params.get('q') || (matchMedia('(pointer: coarse)').matches ? 'medium' : 'high');
    this.time = 0;
  }

  status(text, frac) {
    $('load-status').textContent = text;
    if (frac !== undefined) $('load-fill').style.width = Math.round(frac * 100) + '%';
  }

  async init() {
    const t0 = performance.now();
    this.R = new Renderer($('view'));
    this.R.setQuality(QUALITY[this.qualityName]);
    const R = this.R;
    // ---- build the town
    this.ctx = await buildCity((s, f) => this.status(s, f));
    const ctx = this.ctx;
    console.log(`city built in ${Math.round(performance.now() - t0)} ms: ${ctx.buildings.length} buildings, ${ctx.world.nBrush} brushes, ${ctx.props.n} props, ${ctx.people.list.length} people, ${ctx.nav.count} nav nodes, ${ctx.world.rooms.length} rooms`);
    // ---- runtime systems
    this.roomTex = new RoomTexture(ctx.world, R.common);
    this.roomLights = new RoomLights(ctx.world, this.roomTex);
    this.status('Planting the hills…', 0.49);
    this.terrain = new Terrain(R.scene, R.worldMat);
    ctx.terrain = this.terrain;
    const trees = this.terrain.plantTrees(ctx.props);
    this.water = createWater(R.scene, R.common, R.sky);
    ctx.props.finalize(ctx.world);
    ctx.doors.attach(ctx.props);
    this.chars = new Characters(R.scene, R.common, ctx.props, ctx.people.list.length + 8);
    ctx.people.attachCharacters(this.chars);
    // the player's own body (third person)
    this.playerLook = makeLook(new RNG('player'), { sex: 'M', age: 30 });
    Object.assign(this.playerLook, { top: '#b3302a', torso: 0, arm: 0, bottom: '#2a3a6a', hat: 'hat_cap', hatTint: '#1f2f5f', hairStyle: 0, face: 1, skin: '#e2b48e' });
    this.playerChar = this.chars.create(this.playerLook);
    // moving things
    this.traffic = new Traffic(ctx);
    this.traffic.spawn(ctx.props, ctx.lights, Number(this.params.get('cars') || 48));
    this.trolleys = new Trolleys(ctx.props);
    this.trains = new Trains(ctx.props);
    this.boats = new Boats(ctx.props);
    this.birds = new Birds(ctx.props);
    this.fireworks = new Fireworks(R.scene, ctx.lights);
    this.life = new LifeRuntime(ctx);
    this.beam = new LighthouseBeam(R.scene, LIGHTHOUSE.x, ctx.lighthouseLampY || 17.5, LIGHTHOUSE.z);
    this.audio = new Audio();
    this.fireworks.onBoom = (x, y, z) => this.audio.boom(x, y, z, this);
    this.locateSoundSources();
    ctx.props.attach(R.scene, R.propMat);
    ctx.props.ensureMeshes();
    this.input = new Input($('view'));
    this.collision = new Collision(ctx.world, ctx.props, this.terrain);
    this.player = new Player(R.camera, this.input, this.collision);
    this.player.onSplash = () => this.hud.toast('Splash! A passing fisherman hauls you back onto the quay.');
    this.hud = new HUD(this);
    this.bubbles = new Bubbles($('bubbles'), R.camera);
    // spawn: stepping off the train at Union Station, looking down Lantern Avenue
    const sp = this.params.get('spawn');
    if (sp) { const [x, y, z, yaw] = sp.split(',').map(Number); this.player.setPose(x, y, z, yaw || 0); }
    else this.player.setPose(214 - 2.5, 0.3, -224, Math.PI);
    const gotoName = this.params.get('goto') || this.params.get('inside');
    if (gotoName) {
      const b = ctx.buildings.find((q) => q.name.toLowerCase().includes(gotoName.toLowerCase()));
      if (b && this.params.get('inside') && b.rooms.length) {
        const r = ctx.world.rooms[b.rooms[Number(this.params.get('room') || 0)] || b.rooms[0]];
        const [x, y, z] = ctx.nav.pos(r.nav);
        this.player.setPose(x, y + 0.05, z, Number(this.params.get('yaw') || 0));
      } else if (b && b.entrances.length) {
        const e = b.entrances.find((q) => q.main) || b.entrances[0];
        const [x, y, z] = e.pos;
        const d = ctx.nav.pos(e.door);
        const yaw = Math.atan2(-(d[0] - x), -(d[2] - z));
        this.player.setPose(x - (d[0] - x) * 1.5, y + 0.05, z - (d[2] - z) * 1.5, yaw);
      } else console.warn('goto: building not found', gotoName);
    }
    if (this.params.get('view') === 'third') this.player.mode = 'third';
    if (this.params.get('aerial')) this.player.enterAerial();
    if (this.params.get('cam')) {
      const [x, y, z, yaw, pitch] = this.params.get('cam').split(',').map(Number);
      this.player.enterAerial(); const a = this.player.aerial; a.pos.set(x, y, z); a.yaw = yaw || 0; a.pitch = pitch || 0;
    }
    // ---- mesh the voxel world (workers)
    this.meshes = new WorldMeshes(ctx.world, R.scene, R.worldMat, R.glassMat);
    if (this.params.get('lod') === '0') this.meshes.lodEnabled = false;
    this.status('Laying bricks…', 0.5);
    let nearReady;
    const near = new Promise((r) => { nearReady = r; });
    const all = this.meshes.build(this.player.focus(), (d, n) => this.status(d < n * 0.5 ? 'Laying bricks and hanging bunting…' : 'Polishing the brass on Old Faithful…', 0.5 + 0.5 * d / n), () => nearReady());
    await near;
    await all;
    const ttris = this.terrain.build();
    console.log(`terrain: ${Math.round(ttris / 1000)}k tris, ${trees} trees`);
    this.meshPromise = all.then((s) => console.log(`world meshed: ${s.regions} regions, ${Math.round(s.tris / 1000)}k tris in ${Math.round(s.ms)} ms`));
    this.hud.initMap(ctx);
    if (this.params.get('diag')) this.diagnostics();
    this.lastT = performance.now();
    this.ready = true;
    console.log(`ready in ${Math.round(performance.now() - t0)} ms`);
  }

  start() {
    this.audio.start();
    $('loading').classList.add('hidden');
    $('hud').classList.remove('hidden');
    this.hud.hint('Swell evening for a stroll! W A S D to walk · drag to look about · E to tip your hat · M for the town map', 10);
    const loop = () => { this.frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  setQuality(name) {
    this.qualityName = name;
    this.R.setQuality(QUALITY[name]);
    this.ctx.props.force = true;
  }

  onTimeJump() { for (const p of this.ctx.people.list) p.paths.clear(); }

  fadeTeleport(x, y, z, yaw, msg) {
    const fade = $('fade');
    fade.style.opacity = 1;
    setTimeout(() => { this.player.setPose(x, y, z, yaw); this.ctx.props.force = true; if (msg) this.hud.toast(msg, 3); setTimeout(() => { fade.style.opacity = 0; }, 250); }, 380);
  }

  travelTo(x, z, ev = null) {
    const fade = $('fade');
    fade.style.opacity = 1;
    setTimeout(() => {
      // find a nearby walkable node
      const nav = this.ctx.nav;
      const n = nav.nearest(x, 0.3, z, (id, inf) => inf.kind === 'walk' || inf.kind === 'outside' || inf.kind === 'room' || inf.kind === 'path', 60);
      const [px, py, pz] = n >= 0 ? nav.pos(n) : [x, 0.3, z];
      if (this.player.mode === 'aerial') this.player.exitAerial();
      this.player.setPose(px, py + 0.05, pz, this.player.yaw);
      if (ev) this.hud.toast(`${ev.icon || ''} ${ev.title} — ${ev.place}`, 5);
      this.ctx.props.force = true;
      setTimeout(() => { fade.style.opacity = 0; }, 150);
    }, 380);
  }

  frame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    this.time += dt;
    const g = this, R = this.R, ctx = this.ctx, inp = this.input;
    // keys
    if (inp.hit('KeyV')) { this.player.toggleView(); this.hud.syncMode(); }
    if (inp.hit('KeyF')) { if (this.player.mode === 'aerial') this.player.exitAerial(true); else this.player.enterAerial(); this.hud.syncMode(); ctx.props.force = true; }
    if (inp.hit('KeyM')) this.hud.overlay === 'map-overlay' ? this.hud.close() : this.hud.open('map-overlay');
    if (inp.hit('KeyJ')) this.hud.overlay === 'almanac' ? this.hud.close() : this.hud.open('almanac');
    if (inp.hit('KeyH')) this.hud.overlay === 'help' ? this.hud.close() : this.hud.open('help');
    if (inp.hit('KeyN')) this.hud.newspaper();
    if (inp.hit('KeyP')) { this.clock.paused = !this.clock.paused; this.hud.syncButtons(); }
    if (inp.hit('BracketRight')) { this.clock.speed = Math.min(600, this.clock.speed * (this.clock.speed < 60 ? 60 : 2)); this.hud.syncButtons(); }
    if (inp.hit('BracketLeft')) { this.clock.speed = Math.max(1, this.clock.speed / (this.clock.speed <= 60 ? 60 : 2)); this.hud.syncButtons(); }
    if (inp.hit('Backquote')) $('stats').classList.toggle('hidden');
    // simulation
    this.clock.advance(dt);
    const minutes = this.clock.minutes;
    const tod = R.tod.update(minutes);
    R.common.uTime.value = this.time;
    this.player.update(dt);
    const focus = this.player.focus();
    const cam = R.camera.position;
    const Q = QUALITY[this.qualityName];
    const aerial = this.player.mode === 'aerial';
    ctx.people.playerPos = this.player.mode === 'aerial' ? null : this.player.pos;
    ctx.people.update(this.clock.abs, this.time, cam, aerial ? [0, Q.peopleRadius * 1.6] : [Q.interiorRadius, Q.peopleRadius]);
    // player body in third person
    const pc = this.playerChar.pose;
    if (this.player.mode === 'third') {
      pc.visible = true; pc.x = this.player.pos.x; pc.y = this.player.pos.y; pc.z = this.player.pos.z; pc.yaw = this.player.yaw + Math.PI;
      pc.room = this.playerRoom || 0;
      this.posePlayer(pc);
    } else { pc.visible = false; if (this.playerChar.hat) this.playerChar.hat.visible = false; }
    this.chars.update();
    const movers = ctx.people.visible.map((p) => p.state);
    movers.push({ x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z });
    ctx.doors.update(dt, cam, movers, this.time);
    const active = 0.25 + 0.75 * Math.max(0, Math.min(1, (minutes < 360 ? 0 : minutes < 480 ? (minutes - 360) / 120 : minutes < 1260 ? 1 : minutes < 1440 ? 1 - (minutes - 1260) / 180 * 0.7 : 0.3)));
    this.traffic.update(dt, this.time, this.player.pos, tod.night, active);
    this.trolleys.update(this.time);
    this.trains.update(minutes);
    this.boats.update(minutes, this.time);
    this.birds.update(dt, this.time, this.player.focus(), tod.night);
    this.fireworks.update(dt, minutes, !this.clock.paused);
    this.life.update(this, dt);
    this.beam.update(this.time, tod.night);
    this.audio.update(this, dt);
    this.meshes.updateLOD(cam, aerial ? 150 : 190);
    ctx.props.update(cam, aerial ? [0, Q.propRadius * 1.3, 900] : [Q.interiorRadius, Q.propRadius, 800]);
    ctx.lights.update(R.common, cam, tod.night, ctx.world.rooms, this.time, Q.lights);
    this.roomLights.update(dt, minutes, tod.night, ctx.people, this.time);
    // announce events as they begin
    if (this._lastMin !== undefined && !this.clock.jumped) {
      for (const ev of ctx.events) {
        const crossed = (this._lastMin < ev.start && minutes >= ev.start) || (this._lastMin > minutes && ev.start <= minutes);
        if (crossed && minutes - ev.start < 5) this.hud.toast(`${ev.icon || '★'} ${ev.title} — now at ${ev.place}. (M to find it)`, 7);
      }
    }
    this.clock.jumped = false;
    this._lastMin = minutes;
    // where am I?
    this.updateLocation();
    this.handleInteraction();
    this.bubbles.update(ctx.people, this.player, this.time, minutes, this.playerRoom || 0);
    this.hud.update(dt);
    // shadows follow the player (or the view centre in aerial)
    const sf = aerial ? new THREE.Vector3(cam.x, 0, cam.z).addScaledVector(R.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize(), 80) : new THREE.Vector3(focus.x, focus.y, focus.z);
    R.shadowRange = aerial ? 200 : Q.shadowRange;
    R.render(sf);
    if (!$('stats').classList.contains('hidden') && (this._st = (this._st || 0) + 1) % 15 === 0) {
      const info = R.r.info;
      $('stats').textContent = `fps ${Math.round(1 / dt)}  calls ${info.render.calls}  tris ${Math.round(info.render.triangles / 1000)}k\npeople ${ctx.people.visible.length}/${ctx.people.list.length}  props ${ctx.props.countVisible()}\npos ${focus.x.toFixed(1)}, ${focus.y.toFixed(1)}, ${focus.z.toFixed(1)}  room ${this.playerRoom}`;
    }
    inp.endFrame();
  }

  diagnostics() {
    const ctx = this.ctx;
    const { EVENT_DEFS } = ctx._eventDefs || {};
    void EVENT_DEFS;
    const out = [];
    out.push('events: ' + ctx.events.map((e) => e.id).join(', '));
    out.push('missing props: ' + [...(ctx.props._missing || [])].join(', '));
    const comps = ctx.nav.components();
    const sizes = new Map(); for (const c of comps.comp) sizes.set(c, (sizes.get(c) || 0) + 1);
    const big = [...sizes.entries()].sort((a, b) => b[1] - a[1]);
    let nan = 0; const nanKinds = new Map();
    for (let i = 0; i < ctx.nav.count; i++) if (!Number.isFinite(ctx.nav.x[i] + ctx.nav.y[i] + ctx.nav.z[i])) { nan++; const inf = ctx.nav.info[i]; const b = ctx.buildings[inf.building]; const k = (inf.kind || '?') + ':' + (b ? b.name : '-'); nanKinds.set(k, (nanKinds.get(k) || 0) + 1); }
    let badCost = 0; for (const a of ctx.nav.adj) for (const [, w] of a) if (!Number.isFinite(w)) badCost++;
    out.push(`NaN nodes: ${nan} ${[...nanKinds.entries()].slice(0, 12).map(([k, v]) => k + '×' + v).join(' | ')} ; bad costs ${badCost}`);
    out.push(`nav: ${ctx.nav.count} nodes, ${comps.count} components; largest ${big[0] && big[0][1]}; next ${big.slice(1, 6).map((b) => b[1]).join(',')}`);
    const main = big[0][0];
    const offBuildings = new Set();
    for (const s of ctx.spots.list) if (s.node !== undefined && s.node >= 0 && comps.comp[s.node] !== main && s.building) offBuildings.add(s.building.name);
    out.push('buildings with unreachable spots: ' + [...offBuildings].slice(0, 40).join(' | '));
    const tags = ['eat_out', 'soda', 'bar', 'browse', 'shop', 'bench', 'play', 'theater', 'bowling', 'club', 'club_band', 'choir', 'choir_director', 'organ', 'pew', 'altar_priest', 'altar_couple', 'reception', 'reception_dance', 'fair', 'fair_kids', 'stall_keeper', 'podium', 'stage_guest', 'band', 'crowd_speech', 'dance', 'sockhop', 'waiting', 'maternity', 'nursery_window', 'press', 'fireworks', 'dock_work', 'fish', 'arrive', 'party', 'party_yard', 'cake', 'cat_tree', 'watch_cat', 'tv'];
    out.push('tags: ' + tags.map((t) => `${t}=${ctx.spots.tagged(t).length}`).join(' '));
    const noSched = ctx.people.list.filter((p) => !p.schedule.length).length;
    const jobsOpen = ctx.jobs.filter((j) => !j.person).length;
    const names = new Map(); for (const p of ctx.people.list) { const k = p.first + ' ' + p.last; names.set(k, (names.get(k) || 0) + 1); }
    const dupes = [...names].filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`);
    const homeless = ctx.people.list.filter((p) => p.notable && !p.home && !p.commuter).map((p) => p.first + ' ' + p.last);
    const fg = ctx.people.find('Francis', 'Garrity');
    out.push(`duplicate names: ${dupes.length} ${dupes.slice(0, 12).join(', ')}\nnotables without a home: ${homeless.join(', ') || 'none'}\nFather Garrity: ${fg ? fg.age + ' ' + (fg.home ? fg.home.building.name : '-') + ' / ' + (fg.job ? fg.job.building.name : '-') : 'missing'}`);
    out.push(`people ${ctx.people.list.length}, no schedule ${noSched}, jobs ${ctx.jobs.length} (unfilled ${jobsOpen}), homes ${ctx.homes.length}, households ${(ctx.households || []).length}`);
    let fails = 0; const why = new Map();
    const node = (e) => e.route ? e.route[0] : e.spot ? e.spot.node : undefined;
    for (const p of ctx.people.list) for (let k = 0; k < p.schedule.length; k++) {
      const r = ctx.people._path(p, k);
      if (r.nodes || p.schedule.length < 2) continue;
      fails++;
      const e = p.schedule[k], pr = p.schedule[(k - 1 + p.schedule.length) % p.schedule.length];
      const a = pr.route ? pr.route[pr.route.length - 1] : pr.spot && pr.spot.node, b = node(e);
      let reason;
      if (a === b) { fails--; continue; }
      if (a === undefined || a < 0) reason = 'bad-from:' + (pr.spot && pr.spot.building ? pr.spot.building.name : pr.spot && pr.spot.tags.join('/'));
      else if (b === undefined || b < 0) reason = 'bad-to:' + (e.spot && e.spot.building ? e.spot.building.name : e.spot && e.spot.tags.join('/'));
      else if (comps.comp[a] !== comps.comp[b]) reason = 'disconnected:' + (comps.comp[a] !== main ? (pr.spot && pr.spot.building ? pr.spot.building.name : 'from?') : (e.spot && e.spot.building ? e.spot.building.name : 'to?'));
      else {
        reason = 'astar-limit';
      }
      why.set(reason, (why.get(reason) || 0) + 1);
    }
    out.push('path failures: ' + fails + ' — ' + [...why.entries()].sort((x, y) => y[1] - x[1]).slice(0, 25).map(([k, v]) => `${k}×${v}`).join(' | '));
    console.log('[diag]\n' + out.join('\n'));
  }

  locateSoundSources() {
    const ctx = this.ctx;
    const avg = (spots) => spots.length ? { x: spots.reduce((a, s) => a + s.x, 0) / spots.length, y: 2, z: spots.reduce((a, s) => a + s.z, 0) / spots.length } : null;
    ctx.bandstand = avg(ctx.spots.tagged('band'));
    const ch = ctx.spots.tagged('choir'); ctx.choirRoom = ch.length ? ch[0].room : 0;
    const cb = ctx.spots.tagged('club_band'); ctx.clubRoom = cb.length ? cb[0].room : 0;
    const hop = ctx.spots.tagged('sockhop'); ctx.gymRoom = hop.length ? hop[0].room : 0;
    const brig = ctx.buildings.find((b) => b.name.startsWith('St. Brigid'));
    ctx.bellTower = brig && brig.rect ? { x: (brig.rect.x0 + brig.rect.x1) / 2, y: 25, z: brig.rect.z0 + 6 } : { x: 90, y: 25, z: 86 };
  }

  posePlayer(P) {
    const pl = this.player;
    const sp = pl.speed;
    P.lean = 0; P.headYaw = 0; P.headPitch = -pl.pitch * 0.4; P.bob = 0; P.lie = 0; P.mouth = 0; P.blink = (this.time % 3.3) < 0.1 ? 1 : 0; P.roll = 0;
    if (pl.seated) { P.hL = P.hR = -Math.PI / 2; P.kL = P.kR = Math.PI / 2; P.bob = 0.45 - 0.82; P.aLp = P.aRp = -0.45; P.aLr = P.aRr = 0.1; P.y = pl.seated.seatY; return; }
    const ph = pl.walkPhase * 2.3 / 1.9;
    const amp = Math.min(1, sp / 3) * 0.55;
    P.hL = Math.sin(ph) * amp; P.hR = -Math.sin(ph) * amp;
    P.kL = Math.max(0, Math.sin(ph - 1.1)) * amp * 1.4; P.kR = Math.max(0, Math.sin(ph - 1.1 + Math.PI)) * amp * 1.4;
    P.aLp = -Math.sin(ph) * amp * 0.8; P.aRp = Math.sin(ph) * amp * 0.8; P.aLr = P.aRr = 0.08;
    if (this.tipUntil > this.time) { P.aRp = -2.6; P.aRr = -0.3; }
    P.bob = Math.abs(Math.cos(ph)) * 0.03 * Math.min(1, sp / 2);
  }

  updateLocation() {
    const f = this.player.focus();
    const w = this.ctx.world;
    const room = this.player.mode === 'aerial' ? 0 : w.roomAt(Math.floor(f.x / VS), Math.floor((f.y + 0.6) / VS), Math.floor(f.z / VS));
    this.playerRoom = room;
    R_setIndoor(this.R, room);
    let label;
    if (room) {
      const r = w.rooms[room];
      const bn = r.building ? r.building.name : '';
      label = bn && r.name && r.name !== bn ? `${bn} — ${r.name}` : (bn || r.name);
      if (this._lastBuilding !== r.building && r.building) {
        this._lastBuilding = r.building;
        const b = r.building;
        if (b.lore || b.established) this.hud.toast(`${b.name}${b.established ? ' · est. ' + b.established : ''}${b.lore ? ' — ' + b.lore : ''}`, 5);
      }
    } else {
      this._lastBuilding = null;
      label = this.areaName(f.x, f.z);
    }
    this.hud.setLocation(label);
  }

  areaName(x, z) {
    if (x >= SQUARE.x0 && x <= 284 && z >= SQUARE.z0 && z <= SQUARE.z1) return 'Founders Square';
    // the smallest named place containing the point wins (the lighthouse over the beach, a shed over the waterfront)
    let hit = null, ha = Infinity;
    for (const l of this.ctx.landmarks) {
      const r = l.rect; if (l.kind === 'house' || !(x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)) continue;
      const a = (r.x1 - r.x0) * (r.z1 - r.z0); if (a < ha) { ha = a; hit = l.name; }
    }
    if (hit) return hit;
    if (z > BEACH.z0 && x < BEACH.x1) return 'Juniper Beach & Boardwalk';
    if (x < 0) return 'Juniper Bay Harbor';
    if (x < 44) return 'The Waterfront';
    let best = null, bd = 12;
    for (const a of AVENUES) { const d = Math.abs(x - a.x); if (d < bd) { bd = d; best = a.name; } }
    for (const s of STREETS) { const d = Math.abs(z - s.z); if (d < bd) { bd = d; best = s.name; } }
    if (best) return best;
    for (const l of this.ctx.landmarks) { const r = l.rect; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return l.building ? l.building.name : l.name; }
    return 'Juniper Bay';
  }

  handleInteraction() {
    if (this.player.mode === 'aerial') { this.hud.prompt(null); if (this._capHtml) this.updateCaption(null); return; }
    const cam = this.R.camera;
    const fwd = cam.getWorldDirection(new THREE.Vector3());
    const pos = this.player.pos;
    let best = null, bs = Infinity;
    const consider = (kind, x, y, z, r, obj) => {
      const dx = x - pos.x, dz = z - pos.z, dy = y - (pos.y + 1);
      const d = Math.hypot(dx, dz);
      if (d > r || Math.abs(dy) > 2.2) return;
      const facing = d < 0.8 ? 1 : (dx * fwd.x + dz * fwd.z) / d;
      if (facing < 0.35) return;
      const score = d * (1.6 - facing);
      if (score < bs) { bs = score; best = { kind, obj }; }
    };
    for (const p of this.ctx.people.visible) { const S = p.state; if (S.camDist < 6) consider('person', S.x, S.y + 1, S.z, 2.6, p); }
    for (const it of this.ctx.interactables) { if (Math.abs(it.x - pos.x) < 4 && Math.abs(it.z - pos.z) < 4) consider(it.kind, it.x, it.y, it.z, it.r || 1.6, it); }
    for (const it of this.life.interactables(this.clock.minutes)) { if (Math.abs(it.x - pos.x) < 4 && Math.abs(it.z - pos.z) < 4) consider(it.kind || 'life', it.x, it.y, it.z, it.r || 1.6, it); }
    this.updateCaption(fwd);
    if (this.player.seated) { this.hud.prompt('<b>W</b>Stand up'); return; }
    if (!best) { this.hud.prompt(null); return; }
    const o = best.obj;
    let text;
    if (best.kind === 'person') {
      const asleep = o.state.act === 'sleep';
      text = asleep ? `<b>E</b>Let ${o.first} sleep` : `<b>E</b>${o.greeted ? 'Chat with' : 'Tip your hat to'} ${o.full}`;
    } else text = `<b>E</b>${o.prompt}`;
    this.hud.prompt(text);
    if (!this.input.hit('KeyE')) return;
    if (best.kind === 'person') this.talkTo(o);
    else if (best.kind === 'read') this.hud.read(o.text);
    else if (best.kind === 'sit') this.player.sit({ x: o.x, y: o.seatY ?? o.y - 0.45, z: o.z, yaw: o.yaw, standAt: o.standAt, seatY: o.seatY ?? (o.y - 0.45) });
    else if (o.action) o.action(this);
  }

  // the small caption under the crosshair: who that is and what they're up to
  updateCaption(fwd) {
    const el = this._cap || (this._cap = document.getElementById('focus'));
    if (!el) return;
    this._capT = (this._capT || 0) + 1;
    if (this._capT % 4) return;
    const hit = this.player.mode === 'aerial' ? null : this.life.lookAt(this, this.R.camera.position, fwd);
    let html = '';
    if (hit && hit.obj.first !== undefined) {
      const p = hit.obj;
      const what = this.ctx.people.describeActivity(p);
      html = `<b>${p.full}</b>${what ? ' · ' + what : ''}`;
    } else if (hit) html = hit.obj.text;
    if (html !== this._capHtml) { this._capHtml = html; el.innerHTML = html; el.classList.toggle('hidden', !html); }
  }

  talkTo(p) {
    const t = this.time;
    this.tipUntil = t + 0.8;
    p.greetUntil = t + 6;
    p.greetYaw = Math.atan2(this.player.pos.x - p.state.x, this.player.pos.z - p.state.z);
    if (p.state.act === 'sleep') { this.bubbles.say(p, 'Zzz…', t, 2.5, 'thought'); return; }
    let line;
    if (!p.greeted) { line = greeting(this.clock.minutes); p.greeted = 1; p.talkIdx = 0; }
    else {
      const pool = p.lines.length ? p.lines : ['Nice talking with you.'];
      line = pool[p.talkIdx % pool.length];
      p.talkIdx++;
      if (p.talkIdx === 1) this.hud.toast(`${p.full}${p.age ? ', ' + p.age : ''} — ${p.bio || ''}`, 6);
    }
    this.bubbles.say(p, line, t, 5 + line.length / 30);
  }
}

function R_setIndoor(R, room) { R.common.uIndoorView.value = room ? 1 : 0; }
export { DATE_LABEL };
