// Empêche l'écran de s'éteindre pendant le Player (Screen Wake Lock API).
// Ré-acquisition automatique au retour de l'onglet au premier plan.

let sentinel = null;
let wanted = false;

async function acquire() {
  if (!wanted || sentinel) return;
  try {
    sentinel = await navigator.wakeLock?.request('screen');
    sentinel?.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    /* refusé (batterie faible, non supporté…) : on continue sans */
  }
}

export async function requestWakeLock() {
  wanted = true;
  await acquire();
}

export async function releaseWakeLock() {
  wanted = false;
  try {
    await sentinel?.release();
  } catch {
    /* ignore */
  }
  sentinel = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') acquire();
});
