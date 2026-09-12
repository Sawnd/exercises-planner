import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { renderLibrary } from './screens/library.js';
import { renderSeries } from './screens/series.js';
import { renderRandom } from './screens/random.js';
import { renderPlayer } from './screens/player.js';
import { renderHistory } from './screens/history.js';
import { renderBackup } from './screens/backup.js';
import { checkDailyReminder } from './reminder.js';

registerSW({ immediate: true });

const routes = {
  '/bibliotheque': renderLibrary,
  '/series': renderSeries,
  '/random': renderRandom,
  '/player': renderPlayer,
  '/historique': renderHistory,
  '/export': renderBackup,
};
const DEFAULT_ROUTE = '/bibliotheque';

const appEl = document.getElementById('app');
const reminderEl = document.getElementById('reminder-banner');

function currentPath() {
  return location.hash.replace(/^#/, '') || DEFAULT_ROUTE;
}

async function router() {
  const path = currentPath();
  const render = routes[path] || routes[DEFAULT_ROUTE];

  document.querySelectorAll('.topbar__nav a').forEach((a) => {
    const active = a.dataset.route === path;
    a.classList.toggle('is-active', active);
    if (active) a.scrollIntoView({ inline: 'nearest', block: 'nearest' });
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

  if (reminderEl) checkDailyReminder(reminderEl);
}

window.addEventListener('hashchange', router);

// Réévalue le rappel au retour au premier plan (app rouverte le lendemain…).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && reminderEl) checkDailyReminder(reminderEl);
});

// Re-cliquer l'onglet déjà actif force un rafraîchissement de l'écran
// (le hash ne change pas → pas d'événement `hashchange`).
document.querySelector('.topbar__nav')?.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-route]');
  if (link && link.dataset.route === currentPath()) router();
});

router();
