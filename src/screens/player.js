import { el, clear, formatTime } from '../ui/dom.js';
import { createTimerEngine } from '../timer/engine.js';
import { primeAudio, signalStep, signalComplete } from '../timer/feedback.js';
import { requestWakeLock, releaseWakeLock } from '../timer/wakelock.js';
import { resolveManualSerie } from '../domain/resolve.js';
import { buildTimeline } from '../domain/build-timeline.js';
import { DEMO_SERIE, DEMO_EXERCISES } from '../fixtures/demo-serie.js';

const STEP_LABEL = { prepare: 'Préparation', work: 'Effort', rest: 'Repos' };

export function renderPlayer(root) {
  clear(root);

  // Étape 1 : la série est codée en dur (fixtures). En étape 2, on la
  // récupérera depuis « Mes séries » via le même resolve + buildTimeline.
  const exercisesById = Object.fromEntries(DEMO_EXERCISES.map((e) => [e.id, e]));
  const resolved = resolveManualSerie(DEMO_SERIE, exercisesById);
  const steps = buildTimeline(resolved, { prepareSeconds: 3 });

  const view = el('section', { class: 'screen player' });
  root.append(view);

  showStartScreen(view, { serie: DEMO_SERIE, resolved, steps });
}

function showStartScreen(view, ctx) {
  clear(view);
  view.append(
    el('div', { class: 'player-start' }, [
      el('p', { class: 'muted', text: 'Série codée en dur (étape 1)' }),
      el('h1', { text: ctx.serie.nom }),
      el(
        'ol',
        { class: 'player-start__list' },
        ctx.resolved.map((r) =>
          el('li', {}, [
            el('span', { text: r.nom }),
            el('span', { class: 'muted', text: `${r.duree}s · repos ${r.repos}s` }),
          ]),
        ),
      ),
      el('button', {
        class: 'btn btn--primary btn--big',
        text: 'Démarrer',
        onClick: () => startRun(view, ctx),
      }),
    ]),
  );
}

function startRun(view, ctx) {
  primeAudio();
  requestWakeLock();

  clear(view);
  const runEl = el('div', { class: 'run run--prepare' });
  const stepKind = el('p', { class: 'run__kind' });
  const bigTime = el('div', { class: 'run__time' });
  const exerciseName = el('h1', { class: 'run__exercise' });
  const nextUp = el('p', { class: 'run__next muted' });
  const progress = el('div', { class: 'run__progress' });
  const progressBar = el('div', { class: 'run__progress-bar' });
  progress.append(progressBar);

  const pauseBtn = el('button', { class: 'btn btn--ghost', text: 'Pause' });
  const stopBtn = el('button', { class: 'btn btn--danger-ghost', text: 'Stop' });

  runEl.append(
    progress,
    stepKind,
    exerciseName,
    bigTime,
    nextUp,
    el('div', { class: 'run__controls' }, [pauseBtn, stopBtn]),
  );
  view.append(runEl);

  const workSteps = ctx.steps.filter((s) => s.type === 'work').length;
  let workDone = 0;

  const engine = createTimerEngine({
    onStepChange(step, index, total) {
      signalStep(step);
      runEl.className = `run run--${step.type}`;
      stepKind.textContent = STEP_LABEL[step.type];
      if (step.type === 'work') {
        workDone += 1;
        exerciseName.textContent = step.exerciseName;
        nextUp.textContent = `Exercice ${workDone}/${workSteps}`;
      } else if (step.type === 'rest') {
        exerciseName.textContent = step.exerciseName;
        nextUp.textContent = 'À suivre';
      } else {
        exerciseName.textContent = step.exerciseName;
        nextUp.textContent = 'Prêt ?';
      }
      progressBar.style.width = `${Math.round((index / total) * 100)}%`;
    },
    onTick(remaining) {
      bigTime.textContent = formatTime(remaining);
    },
    onComplete() {
      signalComplete();
      releaseWakeLock();
      showDoneScreen(view, ctx);
    },
  });

  pauseBtn.addEventListener('click', () => {
    if (engine.isRunning()) {
      engine.pause();
      pauseBtn.textContent = 'Reprendre';
      runEl.classList.add('run--paused');
    } else {
      engine.resume();
      pauseBtn.textContent = 'Pause';
      runEl.classList.remove('run--paused');
    }
  });

  stopBtn.addEventListener('click', () => {
    engine.stop();
    releaseWakeLock();
    showStartScreen(view, ctx);
  });

  engine.load(ctx.steps);
  engine.start();
}

function showDoneScreen(view, ctx) {
  clear(view);
  view.append(
    el('div', { class: 'player-start' }, [
      el('h1', { text: 'Séance terminée 🎉' }),
      el('p', { class: 'muted', text: ctx.serie.nom }),
      el('button', {
        class: 'btn btn--primary btn--big',
        text: 'Recommencer',
        onClick: () => showStartScreen(view, ctx),
      }),
    ]),
  );
}
