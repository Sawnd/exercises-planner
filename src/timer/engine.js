/**
 * Moteur de timer — indépendant du DOM.
 *
 * Le décompte s'appuie sur l'horloge (Date.now()) et non sur un compteur
 * décrémenté : un tick manqué (onglet en arrière-plan, GC…) ne décale pas
 * la séance.
 *
 * Événements :
 *   onTick(remainingSeconds, step, index)   ~5x/s
 *   onStepChange(step, index, total)        à chaque nouvelle étape
 *   onComplete()                            après la dernière étape
 *
 * API : load(steps) / start() / pause() / resume() / stop() / getState()
 */
export function createTimerEngine({ onTick, onStepChange, onComplete } = {}) {
  const TICK_MS = 200;

  let steps = [];
  let index = -1;
  let running = false;
  let stepEndsAt = 0; // timestamp ms
  let remainingWhenPaused = 0;
  let intervalId = null;

  function clearLoop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function emitTick() {
    const step = steps[index];
    const remainingMs = Math.max(0, stepEndsAt - Date.now());
    onTick?.(Math.ceil(remainingMs / 1000), step, index);
    if (remainingMs <= 0) enterStep(index + 1);
  }

  function enterStep(nextIndex) {
    clearLoop();
    index = nextIndex;

    if (index >= steps.length) {
      running = false;
      onComplete?.();
      return;
    }

    const step = steps[index];
    stepEndsAt = Date.now() + step.seconds * 1000;
    onStepChange?.(step, index, steps.length);
    onTick?.(step.seconds, step, index);
    intervalId = setInterval(emitTick, TICK_MS);
  }

  return {
    load(nextSteps) {
      clearLoop();
      steps = Array.isArray(nextSteps) ? nextSteps : [];
      index = -1;
      running = false;
      remainingWhenPaused = 0;
    },

    start() {
      if (steps.length === 0 || running) return;
      running = true;
      enterStep(0);
    },

    pause() {
      if (!running) return;
      running = false;
      clearLoop();
      remainingWhenPaused = Math.max(0, stepEndsAt - Date.now());
    },

    resume() {
      if (running || index < 0 || index >= steps.length) return;
      running = true;
      stepEndsAt = Date.now() + remainingWhenPaused;
      intervalId = setInterval(emitTick, TICK_MS);
    },

    /** Termine l'étape courante immédiatement et passe à la suivante. */
    next() {
      if (index < 0 || index >= steps.length) return;
      running = true;
      enterStep(index + 1);
    },

    stop() {
      clearLoop();
      running = false;
      index = -1;
      remainingWhenPaused = 0;
    },

    isRunning: () => running,

    getState: () => ({
      index,
      total: steps.length,
      step: index >= 0 ? steps[index] : null,
    }),
  };
}
