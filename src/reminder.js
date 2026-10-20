import { el, clear } from './ui/dom.js';
import { getStats, dayKey } from './db/history.js';
import { backupReminderMessage, dataLossSuspected, rememberDataPresence } from './backup-state.js';

// Bandeau de rappel (aucun backend, aucune notification programmée — voir la
// discussion sur les contraintes de l'app 100% locale). Par priorité :
//   1. rappel de sauvegarde des données (si rien/trop ancien),
//   2. rappel de séance du jour (+ badge sur l'icône).

function dismissKey(scope) {
  return `reminder-dismissed-${scope}`;
}

function wasDismissed(scope) {
  try {
    return sessionStorage.getItem(dismissKey(scope)) === '1';
  } catch {
    return false;
  }
}

function dismiss(scope) {
  try {
    sessionStorage.setItem(dismissKey(scope), '1');
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

function showBanner(bannerEl, { message, href, actionLabel, scope }) {
  bannerEl.hidden = false;
  bannerEl.append(
    el('span', { class: 'reminder-banner__text', text: message }),
    el('a', { class: 'btn btn--primary btn--sm', href, text: actionLabel }),
    el('button', {
      type: 'button',
      class: 'reminder-banner__close',
      'aria-label': 'Fermer',
      text: '✕',
      onClick: () => {
        dismiss(scope);
        bannerEl.hidden = true;
      },
    }),
  );
}

/** À appeler après chaque navigation pour tenir le bandeau/badge à jour. */
export async function checkDailyReminder(bannerEl) {
  const stats = await getStats();
  const today = dayKey();
  const done = stats.days.includes(today);

  await updateBadge(done);

  clear(bannerEl);
  bannerEl.hidden = true;

  const onExportScreen = location.hash === '#/export';

  // Priorité 0 : les données ont disparu → pousser vers la restauration.
  if (await dataLossSuspected()) {
    if (!onExportScreen && !wasDismissed(`loss-${today}`)) {
      showBanner(bannerEl, {
        message: '⚠️ Tes données ont disparu de cet appareil. Restaure ta dernière sauvegarde (Drive, mail…).',
        href: '#/export',
        actionLabel: 'Restaurer',
        scope: `loss-${today}`,
      });
    }
    return;
  }
  await rememberDataPresence();

  const backupMessage = onExportScreen ? null : await backupReminderMessage();
  if (backupMessage && !wasDismissed(`backup-${today}`)) {
    showBanner(bannerEl, {
      message: backupMessage,
      href: '#/export',
      actionLabel: 'Sauvegarder',
      scope: `backup-${today}`,
    });
    return;
  }

  if (done || wasDismissed(today)) return;

  const message = stats.currentStreak > 0
    ? `🔥 Ne casse pas ta série de ${stats.currentStreak} jour${stats.currentStreak > 1 ? 's' : ''} — fais ta séance aujourd'hui.`
    : `💪 Pas encore de séance aujourd'hui — c'est le moment.`;
  showBanner(bannerEl, { message, href: '#/player', actionLabel: 'Lancer', scope: today });
}
