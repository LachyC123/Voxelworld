// Game clock. `minutes` = minutes since midnight of day 0 (Saturday, Sept 26 1953).
import { START_TIME } from '../core/config.js';
import { fmtTime } from '../core/util.js';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAYS_SHORT = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export class Clock {
  constructor() {
    this.abs = START_TIME;     // absolute minutes since day-0 midnight
    this.speed = 1;            // game seconds per real second (1 = real time, 60 = a minute a second)
    this.paused = false;
    this.jumped = false;
  }
  get minutes() { return ((this.abs % 1440) + 1440) % 1440; }
  get day() { return Math.floor(this.abs / 1440); }
  get dayName() { return DAYS[((this.day % 7) + 7) % 7]; }
  get dayShort() { return DAYS_SHORT[((this.day % 7) + 7) % 7]; }
  get dateLabel() { const d = 26 + this.day; return d <= 30 ? `${this.dayShort} · Sept ${d} · 1953` : `${this.dayShort} · Oct ${d - 30} · 1953`; }
  advance(dtReal) { if (!this.paused) this.abs += dtReal * this.speed / 60; }
  set(minutesOfDay) { this.abs = this.day * 1440 + minutesOfDay; this.jumped = true; }
  label() { return fmtTime(this.minutes); }
}
