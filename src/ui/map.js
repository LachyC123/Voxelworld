// Parchment town map: rendered once to an offscreen canvas, then used by the minimap
// (rotating, circular crop) and the full map overlay (labels, events, click-to-travel).
import { PIERS, BEACH, WATERFRONT, SQUARE, CITYHALL, AVENUES, STREETS, GRID } from '../city/layout.js';

export const MAP = { x0: -170, z0: -300, x1: 480, z1: 340, ppm: 2 }; // metres -> pixels

export function buildMapCanvas(ctx) {
  const W = Math.round((MAP.x1 - MAP.x0) * MAP.ppm), H = Math.round((MAP.z1 - MAP.z0) * MAP.ppm);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const X = (x) => (x - MAP.x0) * MAP.ppm, Z = (z) => (z - MAP.z0) * MAP.ppm;
  const rect = (x0, z0, x1, z1, col) => { g.fillStyle = col; g.fillRect(X(Math.min(x0, x1)), Z(Math.min(z0, z1)), Math.abs(x1 - x0) * MAP.ppm, Math.abs(z1 - z0) * MAP.ppm); };
  // parchment land
  g.fillStyle = '#d9c9a0'; g.fillRect(0, 0, W, H);
  // paper grain
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,90,40,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  // hills (greener away from town)
  const grd = g.createRadialGradient(X(215), Z(0), 200, X(215), Z(0), 900);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, 'rgba(140,150,90,0.25)'); grd.addColorStop(1, 'rgba(120,130,70,0.45)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // water
  g.fillStyle = '#8fb3c0';
  g.fillRect(0, 0, X(WATERFRONT.quayX), H);
  g.fillRect(0, Z(BEACH.z0 + 30), X(BEACH.x0 + 20), H);
  for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); const y = Math.random() * H, x = Math.random() * X(-10); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 3, x + 20, y); g.stroke(); }
  // beach
  rect(BEACH.x0, BEACH.z0, BEACH.x1, BEACH.z1, '#e8d8a8');
  // quay & piers
  rect(WATERFRONT.quayX, -300, 44, 300, '#c9bb98');
  for (const p of PIERS) rect(-p.len, p.z - p.w / 2, 2, p.z + p.w / 2, '#b0946a');
  // blocks base (lawns)
  for (let r = 0; r < STREETS.length - 1; r++) for (let q = 0; q < AVENUES.length - 1; q++) {
    const x0 = AVENUES[q].x + 6, x1 = AVENUES[q + 1].x - 6, z0 = STREETS[r].z + 6, z1 = STREETS[r + 1].z - 6;
    rect(x0, z0, x1, z1, '#e6dcc0');
    rect(x0 + 4, z0 + 4, x1 - 4, z1 - 4, '#a9b77c');
  }
  rect(GRID.x1, GRID.z0, 420, GRID.z1, '#a9b77c');
  rect(150, 220, 384, 250, '#a9b77c');
  // square
  rect(SQUARE.x0, SQUARE.z0, SQUARE.x1, SQUARE.z1, '#e8d9b0');
  g.strokeStyle = '#b08a50'; g.lineWidth = 2; g.beginPath(); g.arc(X((SQUARE.x0 + SQUARE.x1) / 2), Z((SQUARE.z0 + SQUARE.z1) / 2), 12 * MAP.ppm, 0, Math.PI * 2); g.stroke();
  // roads
  g.fillStyle = '#f2ead6';
  for (const s of ctx.streets.segs) rect(s.x0, s.z0, s.x1, s.z1, '#f4ecd8');
  g.strokeStyle = 'rgba(120,90,50,0.35)'; g.lineWidth = 1;
  for (const s of ctx.streets.segs) g.strokeRect(X(s.x0), Z(s.z0), (s.x1 - s.x0) * MAP.ppm, (s.z1 - s.z0) * MAP.ppm);
  // buildings
  for (const l of ctx.landmarks) {
    const r = l.rect;
    if (l.kind === 'park') { rect(r.x0, r.z0, r.x1, r.z1, '#8fae6a'); continue; }
    if (l.kind === 'square') continue;
    const col = { house: '#c77a5a', rowhouse: '#b85e45', shop: '#b04a36', church_catholic: '#8a7a9a', church_congregational: '#e8e4d8', cityhall: '#c9b27a', station: '#9a6a4a', warehouse: '#8a6a4a', fishhouse: '#8a6a4a', school: '#b0643a', hospital: '#d8d0c0', tower: '#c9a870', office: '#c0a070', bank: '#d0c8b0', library: '#c9b27a', hotel: '#a8543a' }[l.kind] || '#b25a40';
    const b = l.building;
    // houses: draw a smaller footprint
    if (l.kind === 'house') { const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2; const hw = Math.min(r.x1 - r.x0, r.z1 - r.z0) * 0.34; rect(cx - hw, cz - hw, cx + hw, cz + hw, col); continue; }
    rect(r.x0 + 0.5, r.z0 + 0.5, r.x1 - 0.5, r.z1 - 0.5, col);
    g.strokeStyle = 'rgba(60,30,10,0.4)'; g.strokeRect(X(r.x0 + 0.5), Z(r.z0 + 0.5), (r.x1 - r.x0 - 1) * MAP.ppm, (r.z1 - r.z0 - 1) * MAP.ppm);
    void b;
  }
  rect(CITYHALL.x0 + 4, CITYHALL.z0 + 6, CITYHALL.x1 - 2, CITYHALL.z1 - 6, '#c9b27a');
  // rail line
  g.strokeStyle = '#6a5a4a'; g.lineWidth = 2; g.setLineDash([6, 3]);
  g.beginPath(); g.moveTo(X(14), Z(300)); g.lineTo(X(14), Z(-236)); g.lineTo(X(480), Z(-236)); g.stroke(); g.setLineDash([]);
  // street names
  g.fillStyle = 'rgba(60,40,20,0.8)'; g.font = `italic ${Math.round(5 * MAP.ppm)}px Georgia`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const a of AVENUES) { g.save(); g.translate(X(a.x), Z(185)); g.rotate(-Math.PI / 2); g.fillText(a.name, 0, 0); g.restore(); }
  for (const s of STREETS) g.fillText(s.name, X(330), Z(s.z));
  return c;
}

export function drawLabels(g, ctx, ppm, X, Z) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const l of ctx.landmarks) {
    if (l.kind === 'house' || l.kind === 'rowhouse') continue;
    const fs = ['cityhall', 'station', 'church_catholic', 'church_congregational', 'park', 'square', 'tower', 'school', 'hospital'].includes(l.kind) ? 11 : 8.5;
    g.font = `${fs >= 11 ? 'bold ' : ''}${fs}px Georgia`;
    g.fillStyle = 'rgba(250,240,215,0.75)';
    const w = g.measureText(l.name).width;
    g.fillRect(X(l.x) - w / 2 - 2, Z(l.z) - fs * 0.6, w + 4, fs * 1.2);
    g.fillStyle = '#3a2410';
    g.fillText(l.name, X(l.x), Z(l.z));
  }
}
