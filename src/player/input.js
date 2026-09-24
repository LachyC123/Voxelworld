// Keyboard, mouse (pointer lock or drag-to-look) and touch input.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.lookDX = 0; this.lookDY = 0; this.wheel = 0;
    this.dragging = false; this.locked = false; this.enabled = true;
    this.touchMove = { x: 0, y: 0 };
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' && e.target.type !== 'range')) return;
      const k = e.code;
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !this.locked && this.wantLock && !this.dragMoved) {}
      this.dragging = true; this.dragMoved = 0; this.downAt = performance.now();
    });
    window.addEventListener('mouseup', () => {
      if (this.dragging && this.dragMoved < 4 && performance.now() - this.downAt < 300 && !this.locked && this.enabled) {
        canvas.requestPointerLock?.();
      }
      this.dragging = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked) { this.lookDX += e.movementX; this.lookDY += e.movementY; }
      else if (this.dragging) { this.lookDX += e.movementX * 1.4; this.lookDY += e.movementY * 1.4; this.dragMoved += Math.abs(e.movementX) + Math.abs(e.movementY); }
    });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    this.setupTouch();
  }
  setupTouch() {
    const stick = document.getElementById('touch-stick'), knob = document.getElementById('touch-knob');
    if (!('ontouchstart' in window) || !stick) return;
    stick.classList.remove('hidden');
    document.getElementById('touch-act')?.classList.remove('hidden');
    let sid = null, lid = null, lx = 0, ly = 0;
    const rect = () => stick.getBoundingClientRect();
    window.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        const r = rect();
        if (t.clientX < r.right + 40 && t.clientY > r.top - 40 && sid === null) { sid = t.identifier; }
        else if (lid === null && t.target === this.canvas) { lid = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === sid) {
          const r = rect();
          let x = (t.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
          const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
          this.touchMove.x = x; this.touchMove.y = y;
          knob.style.left = (40 + x * 40) + 'px'; knob.style.top = (40 + y * 40) + 'px';
        } else if (t.identifier === lid) {
          this.lookDX += (t.clientX - lx) * 2.2; this.lookDY += (t.clientY - ly) * 2.2; lx = t.clientX; ly = t.clientY;
        }
      }
    }, { passive: true });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === sid) { sid = null; this.touchMove.x = 0; this.touchMove.y = 0; knob.style.left = '40px'; knob.style.top = '40px'; }
        if (t.identifier === lid) lid = null;
      }
    };
    window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
    document.getElementById('touch-act')?.addEventListener('touchstart', (e) => { this.pressed.add('KeyE'); e.preventDefault(); });
  }
  down(k) { return this.enabled && this.keys.has(k); }
  hit(k) { return this.enabled && this.pressed.has(k); }
  endFrame() { this.pressed.clear(); this.lookDX = 0; this.lookDY = 0; this.wheel = 0; }
}
