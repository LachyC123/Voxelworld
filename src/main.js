// Juniper Bay — entry point.
import { Game } from './game.js';

const game = new Game();
window.game = game;
const btn = document.getElementById('btn-start');
game.init().then(() => {
  if (game.params.has('shot') || game.params.has('autostart')) { game.start(); window.__ready = true; return; }
  document.getElementById('load-status').textContent = 'The 4:52 from Boston is pulling in.';
  btn.classList.remove('hidden');
  btn.onclick = () => { game.start(); };
}).catch((e) => {
  console.error(e);
  document.getElementById('load-status').textContent = 'Something went wrong building the town: ' + e.message;
});
