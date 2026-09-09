import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { renderLibrary } from './screens/library.js';
import { renderPlayer } from './screens/player.js';

registerSW({ immediate: true });

const routes = {
  '/bibliotheque': renderLibrary,
  '/player': renderPlayer,
};
const DEFAULT_ROUTE = '/bibliotheque';

const appEl = document.getElementById('app');

async function router() {
  const path = location.hash.replace(/^#/, '') || DEFAULT_ROUTE;
  const render = routes[path] || routes[DEFAULT_ROUTE];

  document.querySelectorAll('.topbar__nav a').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.route === path);
  });

  try {
    await render(appEl);
  } catch (err) {
    appEl.replaceChildren();
    const pre = document.createElement('pre');
    pre.className = 'fatal';
    pre.textContent = `Erreur : ${err?.message ?? err}`;
    appEl.append(pre);
    console.error(err);
  }
}

window.addEventListener('hashchange', router);
router();
