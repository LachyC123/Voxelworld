// Sun/moon position and lighting palette as a function of the clock.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../core/util.js';

const LAT = 41.3 * Math.PI / 180;       // a New England harbour
const DECL = -1.2 * Math.PI / 180;      // late September
const SOLAR_NOON = 12 * 60 + 48;        // minutes

// palette keyed by sun elevation (degrees)
const KEYS = [
  { e: -18, sun: [0.32, 0.4, 0.62], si: 0.34, sky: [0.05, 0.07, 0.13], gnd: [0.03, 0.03, 0.05], fog: [0.035, 0.045, 0.08], top: [0.008, 0.014, 0.04], hor: [0.04, 0.055, 0.1], glow: [0.1, 0.1, 0.2], fd: 0.0028 },
  { e: -8, sun: [0.4, 0.42, 0.62], si: 0.3, sky: [0.1, 0.11, 0.2], gnd: [0.05, 0.045, 0.06], fog: [0.12, 0.11, 0.17], top: [0.03, 0.05, 0.13], hor: [0.2, 0.15, 0.24], glow: [0.35, 0.18, 0.2], fd: 0.0026 },
  { e: -2, sun: [0.95, 0.45, 0.35], si: 0.45, sky: [0.3, 0.27, 0.38], gnd: [0.12, 0.09, 0.09], fog: [0.5, 0.36, 0.4], top: [0.14, 0.18, 0.38], hor: [0.85, 0.5, 0.42], glow: [1.0, 0.45, 0.25], fd: 0.0024 },
  { e: 4, sun: [1.0, 0.6, 0.36], si: 1.35, sky: [0.36, 0.34, 0.42], gnd: [0.24, 0.18, 0.13], fog: [0.84, 0.64, 0.5], top: [0.28, 0.4, 0.68], hor: [0.98, 0.7, 0.48], glow: [1.0, 0.6, 0.3], fd: 0.0022 },
  { e: 12, sun: [1.0, 0.8, 0.58], si: 1.7, sky: [0.34, 0.39, 0.5], gnd: [0.3, 0.25, 0.19], fog: [0.8, 0.76, 0.72], top: [0.26, 0.46, 0.8], hor: [0.84, 0.82, 0.8], glow: [1.0, 0.75, 0.45], fd: 0.002 },
  { e: 30, sun: [1.0, 0.94, 0.84], si: 1.9, sky: [0.32, 0.4, 0.54], gnd: [0.32, 0.28, 0.22], fog: [0.72, 0.78, 0.86], top: [0.24, 0.47, 0.85], hor: [0.74, 0.83, 0.93], glow: [1.0, 0.85, 0.6], fd: 0.0018 },
  { e: 60, sun: [1.0, 0.97, 0.9], si: 2.0, sky: [0.32, 0.41, 0.56], gnd: [0.33, 0.29, 0.23], fog: [0.72, 0.8, 0.9], top: [0.22, 0.45, 0.86], hor: [0.72, 0.82, 0.94], glow: [1.0, 0.9, 0.7], fd: 0.0017 },
];

function sample(e) {
  if (e <= KEYS[0].e) return KEYS[0];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i], b = KEYS[i + 1];
    if (e <= b.e) {
      const t = (e - a.e) / (b.e - a.e);
      const mix = (x, y) => x.map((v, k) => lerp(v, y[k], t));
      return { sun: mix(a.sun, b.sun), si: lerp(a.si, b.si, t), sky: mix(a.sky, b.sky), gnd: mix(a.gnd, b.gnd), fog: mix(a.fog, b.fog), top: mix(a.top, b.top), hor: mix(a.hor, b.hor), glow: mix(a.glow, b.glow), fd: lerp(a.fd, b.fd, t) };
    }
  }
  return KEYS[KEYS.length - 1];
}

export function sunPosition(minutes) {
  const H = ((minutes - SOLAR_NOON) / 60) * 15 * Math.PI / 180;
  const sinE = Math.sin(LAT) * Math.sin(DECL) + Math.cos(LAT) * Math.cos(DECL) * Math.cos(H);
  const elev = Math.asin(sinE);
  // azimuth from north, clockwise
  const cosA = (Math.sin(DECL) - Math.sin(elev) * Math.sin(LAT)) / (Math.cos(elev) * Math.cos(LAT));
  let az = Math.acos(clamp(cosA, -1, 1));
  if (H > 0) az = 2 * Math.PI - az;
  // world: north = -z, east = +x
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), -Math.cos(az) * Math.cos(elev));
  return { dir, elevDeg: elev * 180 / Math.PI };
}

export class TimeOfDay {
  constructor(common, sky) { this.common = common; this.sky = sky; this.night = 0; this.elev = 30; }

  update(minutes) {
    const { dir, elevDeg } = sunPosition(minutes);
    this.elev = elevDeg;
    const p = sample(elevDeg);
    const c = this.common;
    const night = smoothstep(3, -9, elevDeg);
    this.night = night;
    c.uNight.value = night;
    // moon roughly opposite-ish, high in the south-east in the evening
    const moonDir = new THREE.Vector3(-dir.x * 0.6 + 0.3, Math.max(0.35, -dir.y * 0.9 + 0.2), -dir.z * 0.6 + 0.4).normalize();
    this.sky.uniforms.uMoonDir.value.copy(moonDir);
    let lightDir = dir.clone();
    let lightCol = new THREE.Color(p.sun[0], p.sun[1], p.sun[2]).multiplyScalar(p.si);
    if (elevDeg < -1.5) {
      // switch the key light to the moon; blend intensity through twilight
      lightDir = moonDir.clone();
      const k = smoothstep(-1.5, -10, elevDeg);
      lightCol = new THREE.Color(0.42, 0.5, 0.75).multiplyScalar(0.45 * k + 0.05);
    } else if (elevDeg < 2) {
      // the sun is nearly on the horizon: lift the light direction a bit to avoid infinite shadows
      lightDir.y = Math.max(lightDir.y, 0.05); lightDir.normalize();
      lightCol.multiplyScalar(smoothstep(-1.5, 2, elevDeg));
    }
    if (lightDir.y < 0.08) { lightDir.y = 0.08; lightDir.normalize(); }
    this.lightDir = lightDir;
    c.uSunDir.value.copy(lightDir);
    c.uSunColor.value.copy(lightCol);
    c.uSkyAmb.value.setRGB(p.sky[0], p.sky[1], p.sky[2]);
    c.uGroundAmb.value.setRGB(p.gnd[0], p.gnd[1], p.gnd[2]);
    c.uFogColor.value.setRGB(p.fog[0], p.fog[1], p.fog[2]);
    // morning mist rolling off the harbour
    const mist = Math.max(0, 1 - Math.abs(minutes - 7 * 60) / 90);
    c.uFogDensity.value = p.fd * (1 + mist * 3.5);
    if (mist > 0) c.uFogColor.value.lerp(new THREE.Color(0.78, 0.8, 0.82), mist * 0.5);
    const su = this.sky.uniforms;
    su.uSkyTop.value.setRGB(p.top[0], p.top[1], p.top[2]);
    su.uSkyHorizon.value.setRGB(p.hor[0], p.hor[1], p.hor[2]);
    su.uSunGlow.value.setRGB(p.glow[0], p.glow[1], p.glow[2]).multiplyScalar(elevDeg > -6 ? 1 : 0.2);
    // the sky shader wants the real sun direction for the disc
    this.sunDirTrue = dir;
    su.uSunDir.value.copy(dir);
    return { night, elevDeg };
  }
}
