// Retour sonore + haptique au changement d'étape.

let audioCtx = null;

/** À appeler sur un geste utilisateur (clic « Démarrer ») pour débloquer l'audio. */
export function primeAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    /* audio indisponible : on continue sans son */
  }
}

function beep({ freq = 880, durationMs = 160, volume = 0.25 } = {}) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);
    osc.start(t);
    osc.stop(t + durationMs / 1000);
  } catch {
    /* ignore */
  }
}

function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

/** Signale l'entrée dans une nouvelle étape. */
export function signalStep(step) {
  switch (step.type) {
    case 'prepare':
      beep({ freq: 660, durationMs: 110 });
      vibrate(80);
      break;
    case 'work':
      beep({ freq: 900, durationMs: 200 });
      beep({ freq: 1200, durationMs: 200 });
      vibrate([120, 40, 120]);
      break;
    case 'rest':
      beep({ freq: 480, durationMs: 220 });
      vibrate(120);
      break;
  }
}

/** Signale la fin de la séance. */
export function signalComplete() {
  beep({ freq: 700, durationMs: 140 });
  beep({ freq: 900, durationMs: 140 });
  beep({ freq: 1300, durationMs: 260 });
  vibrate([200, 80, 200, 80, 300]);
}
