import { el, clear } from './ui/dom.js';
import { getStats, dayKey } from './db/history.js';

// Rappel passif : bandeau in-app + badge sur l'icône si la séance du jour
// n'est pas encore faite. Aucun backend, aucune notification programmée
// (voir la discussion sur les contraintes de l'app 100% locale).

function dismissKey(day) {
  return `reminder-dismissed-${day}`;
}

function wasDismissedToday(day) {
  try {
    return sessionStorage.getItem(dismissKey(day)) === '1';
  } catch {
    return false;
  }
}

function dismissToday(day) {
  try {
    sessionStorage.setItem(dismissKey(day), '1');
  } catch {
    /* stockage indisponible : le bandeau réapparaîtra, tant pis */
  }
}

async function updateBadge(done) {
  try {
    if (!('setAppBadge' in navigator)) return;
    if (done) await navigator.clearAppBadge();
    else await navigator.setAppBadge(1);
  } catch {
    /* Badge API indisponible sur ce navigateur : on continue sans */
  }
}

/** À appeler après chaque navigation pour tenir le bandeau/badge à jour. */
export async function checkDailyReminder(bannerEl) {
  const stats = await getStats();
  const today = dayKey();
  const done = stats.days.includes(today);

  await updateBadge(done);

  clear(bannerEl);
  if (done || wasDismissedToday(today)) {
    bannerEl.hidden = true;
    return;
  }

  const message = stats.currentStreak > 0
    ? `🔥 Ne casse pas ta série de ${stats.currentStreak} jour${stats.currentStreak > 1 ? 's' : ''} — fais ta séance aujourd'hui.`
    : `💪 Pas encore de séance aujourd'hui — c'est le moment.`;

  bannerEl.hidden = false;
  bannerEl.append(
    el('span', { class: 'reminder-banner__text', text: message }),
    el('a', { class: 'btn btn--primary btn--sm', href: '#/player', text: 'Lancer' }),
    el('button', {
      type: 'button',
      class: 'reminder-banner__close',
      'aria-label': 'Fermer',
      text: '✕',
      onClick: () => {
        dismissToday(today);
        bannerEl.hidden = true;
      },
    }),
  );
}
