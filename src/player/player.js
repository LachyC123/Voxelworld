// Player controller: walking with voxel collision + step-up, first/third person, aerial flight.
import * as THREE from 'three';
import { clamp, lerp, wrapAngle } from '../core/util.js';
import { WATER_Y } from '../core/config.js';

const HW = 0.28, HEIGHT = 1.72, EYE = 1.6, STEP = 0.52;

export class Player {
  constructor(camera, input, collision) {
    this.camera = camera; this.input = input; this.col = collision;
    this.pos = new THREE.Vector3(0, 0.3, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.mode = 'first'; // 'first' | 'third' | 'aerial'
    this.onGround = false;
    this.eyeY = 0; this.eyeSmooth = null;
    this.aerial = { pos: new THREE.Vector3(), yaw: 0, pitch: -0.5, speed: 40 };
    this.walkPhase = 0; this.speed = 0;
    this.camDist = 3.6; this.camDistSmooth = 3.6;
    this.lastSafe = new THREE.Vector3();
    this.seated = null; // {x,y,z,yaw, release()}
    this.frozen = false;
  }

  setPose(x, y, z, yaw = 0, pitch = 0) {
    this.pos.set(x, y, z); this.yaw = yaw; this.pitch = pitch; this.vel.set(0, 0, 0); this.eyeSmooth = null;
    this.lastSafe.copy(this.pos);
  }

  collides(p) { return this.col.boxHits(p.x - HW, p.y + 0.02, p.z - HW, p.x + HW, p.y + HEIGHT, p.z + HW); }

  toggleView() { if (this.mode === 'aerial') this.exitAerial(); else this.mode = this.mode === 'first' ? 'third' : 'first'; }
  enterAerial() {
    if (this.mode === 'aerial') return;
    this.prevMode = this.mode;
    this.mode = 'aerial';
    const a = this.aerial;
    a.pos.set(this.pos.x - Math.sin(this.yaw) * -30, this.pos.y + 45, this.pos.z - Math.cos(this.yaw) * -30);
    a.pos.set(this.pos.x + Math.sin(this.yaw) * 40, this.pos.y + 50, this.pos.z + Math.cos(this.yaw) * 40);
    a.yaw = this.yaw; a.pitch = -0.55;
  }
  exitAerial(dropHere = false) {
    if (this.mode !== 'aerial') return;
    this.mode = this.prevMode || 'first';
    if (dropHere) {
      const a = this.aerial;
      const tx = a.pos.x, tz = a.pos.z;
      const g = this.col.groundBelow(tx, 200, tz, 220);
      if (g !== null && g > WATER_Y) { this.setPose(tx, g + 0.05, tz, a.yaw, 0); return; }
    }
  }

  update(dt) {
    const inp = this.input;
    const sens = 0.0023;
    if (this.mode === 'aerial') return this.updateAerial(dt, sens);
    this.yaw -= inp.lookDX * sens;
    this.pitch = clamp(this.pitch - inp.lookDY * sens, -1.45, 1.45);
    this.yaw = wrapAngle(this.yaw);
    if (this.seated) {
      if (inp.hit('KeyW') || inp.hit('KeyA') || inp.hit('KeyS') || inp.hit('KeyD') || inp.hit('Space')) this.stand();
      else { this.speed = 0; this.applyCamera(dt); return; }
    }
    // movement input
    let fx = 0, fz = 0;
    if (inp.down('KeyW') || inp.down('ArrowUp')) fz -= 1;
    if (inp.down('KeyS') || inp.down('ArrowDown')) fz += 1;
    if (inp.down('KeyA') || inp.down('ArrowLeft')) fx -= 1;
    if (inp.down('KeyD') || inp.down('ArrowRight')) fx += 1;
    fx += inp.touchMove.x; fz += inp.touchMove.y;
    const len = Math.hypot(fx, fz);
    if (len > 1) { fx /= len; fz /= len; }
    const run = inp.down('ShiftLeft') || inp.down('ShiftRight');
    const maxSpeed = this.frozen ? 0 : (run ? 6.2 : 3.1);
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    // camera forward is -z rotated by yaw
    const wx = (fx * c + fz * s) * maxSpeed, wz = (-fx * s + fz * c) * maxSpeed;
    const accel = this.onGround ? 14 : 3;
    this.vel.x = lerp(this.vel.x, wx, Math.min(1, accel * dt));
    this.vel.z = lerp(this.vel.z, wz, Math.min(1, accel * dt));
    if (this.onGround && inp.hit('Space') && !this.frozen) this.vel.y = 4.6;
    this.vel.y -= 16 * dt;
    if (this.vel.y < -30) this.vel.y = -30;
    // integrate with sub-steps
    const steps = Math.max(1, Math.ceil((Math.abs(this.vel.x) + Math.abs(this.vel.z) + Math.abs(this.vel.y)) * dt / 0.1));
    const sdt = dt / steps;
    this.onGround = false;
    const p = this.pos;
    const prevY = p.y;
    for (let i = 0; i < steps; i++) {
      // vertical
      p.y += this.vel.y * sdt;
      if (this.collides(p)) {
        if (this.vel.y < 0) { p.y = Math.ceil(p.y / 0.25) * 0.25; this.onGround = true; if (this.collides(p)) p.y += 0.25; }
        else p.y -= this.vel.y * sdt;
        this.vel.y = 0;
      }
      // horizontal x
      for (const axis of ['x', 'z']) {
        const d = this.vel[axis] * sdt;
        if (!d) continue;
        p[axis] += d;
        if (this.collides(p)) {
          // step up
          let stepped = false;
          const oy = p.y;
          for (let h = 0.25; h <= STEP; h += 0.25) {
            p.y = oy + h;
            if (!this.collides(p)) { stepped = true; break; }
          }
          if (!stepped || !(this.onGround || this.vel.y <= 0.1)) { p.y = oy; p[axis] -= d; this.vel[axis] *= 0.2; }
          else if (stepped) { this.onGround = true; if (this.vel.y < 0) this.vel.y = 0; }
        }
      }
    }
    // ground probe for onGround when standing still
    if (!this.onGround) {
      p.y -= 0.03;
      if (this.collides(p)) this.onGround = true;
      p.y += 0.03;
    }
    // fell into the harbour: climb back out
    if (p.y < WATER_Y - 0.6) {
      p.copy(this.lastSafe); this.vel.set(0, 0, 0);
      this.onSplash && this.onSplash();
    } else if (this.onGround && p.y > WATER_Y + 0.3) this.lastSafe.copy(p);
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround) this.walkPhase += this.speed * dt * 1.9;
    // smooth stair climbing for the eye
    if (this.eyeSmooth === null) this.eyeSmooth = p.y;
    if (p.y > this.eyeSmooth) this.eyeSmooth = Math.min(p.y, lerp(this.eyeSmooth, p.y, Math.min(1, dt * 14)));
    else this.eyeSmooth = p.y;
    void prevY;
    this.applyCamera(dt);
  }

  sit(seat) {
    this.seated = seat;
    this.pos.set(seat.x, seat.y, seat.z); this.vel.set(0, 0, 0);
    this.yaw = seat.yaw; this.pitch = -0.05; this.eyeSmooth = seat.y;
  }
  stand() {
    if (!this.seated) return;
    const s = this.seated; this.seated = null;
    if (s.standAt) this.pos.set(s.standAt[0], s.standAt[1], s.standAt[2]);
    this.eyeSmooth = this.pos.y;
  }

  applyCamera(dt) {
    const cam = this.camera;
    cam.rotation.order = 'YXZ';
    const seatedDrop = this.seated ? -0.62 : 0;
    const bob = this.mode === 'first' && this.onGround ? Math.sin(this.walkPhase * 2) * 0.035 * Math.min(1, this.speed / 3) : 0;
    const eye = new THREE.Vector3(this.pos.x, this.eyeSmooth + EYE + bob + seatedDrop, this.pos.z);
    if (this.mode === 'first') {
      cam.position.copy(eye);
      cam.rotation.set(this.pitch, this.yaw, 0);
      this.camDistSmooth = 0.5;
    } else {
      const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
      const head = eye.clone(); head.y += 0.1;
      // shoulder offset
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      head.addScaledVector(right, 0.35);
      const want = this.camDist;
      const hit = this.col.ray(head.x, head.y, head.z, dir.x, dir.y, dir.z, want + 0.3) - 0.3;
      const d = clamp(hit, 0.3, want);
      this.camDistSmooth = d < this.camDistSmooth ? d : lerp(this.camDistSmooth, d, Math.min(1, dt * 4));
      cam.position.copy(head).addScaledVector(dir, this.camDistSmooth);
      cam.rotation.set(this.pitch, this.yaw, 0);
    }
  }

  updateAerial(dt, sens) {
    const inp = this.input, a = this.aerial;
    a.yaw = wrapAngle(a.yaw - inp.lookDX * sens);
    a.pitch = clamp(a.pitch - inp.lookDY * sens, -1.5, 1.2);
    if (inp.wheel) a.speed = clamp(a.speed * (inp.wheel > 0 ? 0.8 : 1.25), 5, 250);
    let fx = 0, fz = 0, fy = 0;
    if (inp.down('KeyW') || inp.down('ArrowUp')) fz -= 1;
    if (inp.down('KeyS') || inp.down('ArrowDown')) fz += 1;
    if (inp.down('KeyA') || inp.down('ArrowLeft')) fx -= 1;
    if (inp.down('KeyD') || inp.down('ArrowRight')) fx += 1;
    if (inp.down('Space') || inp.down('KeyE')) fy += 1;
    if (inp.down('ControlLeft') || inp.down('KeyQ') || inp.down('KeyC')) fy -= 1;
    fx += inp.touchMove.x; fz += inp.touchMove.y;
    const sp = a.speed * (inp.down('ShiftLeft') ? 2.5 : 1);
    const cy = Math.cos(a.yaw), sy = Math.sin(a.yaw), cp = Math.cos(a.pitch), spp = Math.sin(a.pitch);
    const fwd = new THREE.Vector3(-sy * cp, spp, -cy * cp);
    const right = new THREE.Vector3(cy, 0, -sy);
    a.pos.addScaledVector(fwd, -fz * sp * dt).addScaledVector(right, fx * sp * dt);
    a.pos.y += fy * sp * dt;
    a.pos.y = clamp(a.pos.y, 2, 600);
    const cam = this.camera;
    cam.rotation.order = 'YXZ';
    cam.position.copy(a.pos);
    cam.rotation.set(a.pitch, a.yaw, 0);
  }

  // where the player "is" for culling, minimap, etc.
  focus() { return this.mode === 'aerial' ? this.aerial.pos : this.pos; }
}
