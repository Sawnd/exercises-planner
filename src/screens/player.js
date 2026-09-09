import { el, clear, formatTime } from '../ui/dom.js';
import { createTimerEngine } from '../timer/engine.js';
import { primeAudio, signalStep, signalComplete } from '../timer/feedback.js';
import { requestWakeLock, releaseWakeLock } from '../timer/wakelock.js';
import { resolveManualSerie } from '../domain/resolve.js';
import { buildTimeline } from '../domain/build-timeline.js';
import { listSeries } from '../db/series.js';
import { getExercisesById } from '../db/exercises.js';

const STEP_LABEL = { prepare: 'Préparation', work: 'Effort', rest: 'Repos' };

export async function renderPlayer(root) {
  clear(root);
  const view = el('section', { class: 'screen player' });
  root.append(view);
  await showChooser(view);
}

async function showChooser(view) {
  clear(view);
  const [series, exercisesById] = await Promise.all([listSeries(), getExercisesById()]);

  if (series.length === 0) {
    view.append(
      el('div', { class: 'player-start' }, [
        el('h1', { text: 'Player' }),
        el('p', { class: 'muted', text: 'Aucune série pour l’instant.' }),
        el('a', { class: 'btn btn--primary', href: '#/series', text: 'Créer une série' }),
      ]),
    );
    return;
  }

  view.append(
    el('div', { class: 'player-start' }, [
      el('h1', { text: 'Choisir une série' }),
      el(
        'ul',
        { class: 'chooser' },
        series.map((serie) =>
          el('li', {}, [
            el('button', {
              class: 'chooser__item',
              onClick: () => launch(view, serie, exercisesById),
            }, [
              el('span', { class: 'chooser__name', text: serie.nom }),
              el('span', { class: 'muted', text: `${serie.items.length} exo${serie.items.length > 1 ? 's' : ''}` }),
            ]),
          ]),
        ),
      ),
    ]),
  );
}

function launch(view, serie, exercisesById) {
  let resolved;
  try {
    resolved = resolveManualSerie(serie, exercisesById);
  } catch (err) {
    clear(view);
    view.append(
      el('div', { class: 'player-start' }, [
        el('h1', { text: 'Série non lançable' }),
        el('p', { class: 'form__error', text: err.message }),
        el('button', { class: 'btn btn--ghost', text: '← Retour', onClick: () => showChooser(view) }),
      ]),
    );
    return;
  }
  const steps = buildTimeline(resolved, { prepareSeconds: 3 });
  showStartScreen(view, { serie, resolved, steps });
}

function showStartScreen(view, ctx) {
  clear(view);
  view.append(
    el('div', { class: 'player-start' }, [
      el('button', { class: 'link-back', text: '← Autre série', onClick: () => showChooser(view) }),
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
      el('div', { class: 'ex-form__actions' }, [
        el('button', {
          class: 'btn btn--primary',
          text: 'Recommencer',
          onClick: () => showStartScreen(view, ctx),
        }),
        el('button', {
          class: 'btn btn--ghost',
          text: 'Autre série',
          onClick: () => showChooser(view),
        }),
      ]),
    ]),
  );
}
