import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { renderLibrary } from './screens/library.js';
import { renderSeries } from './screens/series.js';
import { renderRandom } from './screens/random.js';
import { renderPlayer } from './screens/player.js';
import { renderHistory } from './screens/history.js';

registerSW({ immediate: true });

const routes = {
  '/bibliotheque': renderLibrary,
  '/series': renderSeries,
  '/random': renderRandom,
  '/player': renderPlayer,
  '/historique': renderHistory,
};
const DEFAULT_ROUTE = '/bibliotheque';

const appEl = document.getElementById('app');

function currentPath() {
  return location.hash.replace(/^#/, '') || DEFAULT_ROUTE;
}

async function router() {
  const path = currentPath();
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

// Re-cliquer l'onglet déjà actif force un rafraîchissement de l'écran
// (le hash ne change pas → pas d'événement `hashchange`).
document.querySelector('.topbar__nav')?.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-route]');
  if (link && link.dataset.route === currentPath()) router();
});

router();
