import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { renderLibrary } from './screens/library.js';
import { renderSeries } from './screens/series.js';
import { renderRandom } from './screens/random.js';
import { renderPlayer } from './screens/player.js';
import { renderHistory } from './screens/history.js';
import { renderBackup } from './screens/backup.js';
import { checkDailyReminder } from './reminder.js';
import { requestPersistentStorage } from './db/persistence.js';

registerSW({ immediate: true });
requestPersistentStorage();

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

  if (reminderEl) checkDailyReminder(reminderEl);
}

window.addEventListener('hashchange', router);

// Réévalue le rappel au retour au premier plan (app rouverte le lendemain…).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && reminderEl) checkDailyReminder(reminderEl);
});

// Menu hamburger (mobile) : ouverture/fermeture du panneau de navigation.
const topbarEl = document.querySelector('.topbar');
const menuBtn = document.querySelector('.topbar__menu');

function setMenuOpen(open, { restoreFocus = false } = {}) {
  topbarEl.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? '✕' : '☰';
  if (!open && restoreFocus) menuBtn.focus();
}

menuBtn.addEventListener('click', () => {
  setMenuOpen(!topbarEl.classList.contains('is-open'));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && topbarEl.classList.contains('is-open')) {
    setMenuOpen(false, { restoreFocus: true });
  }
});

// Clic en dehors de la topbar : referme le menu.
document.addEventListener('click', (e) => {
  if (topbarEl.classList.contains('is-open') && !topbarEl.contains(e.target)) setMenuOpen(false);
});

// Passage en écran large : la nav redevient en ligne, on remet le menu à zéro.
window.matchMedia('(min-width: 720px)').addEventListener('change', () => setMenuOpen(false));

// Clic sur un onglet : referme le menu ; re-cliquer l'onglet déjà actif force un
// rafraîchissement de l'écran (le hash ne change pas → pas d'événement `hashchange`).
document.querySelector('.topbar__nav')?.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-route]');
  if (!link) return;
  setMenuOpen(false);
  if (link.dataset.route === currentPath()) router();
});

router();
