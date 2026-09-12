import { el, clear } from '../ui/dom.js';
import { resolveManualSerie } from '../domain/resolve.js';
import { buildTimeline } from '../domain/build-timeline.js';
import { listSeries } from '../db/series.js';
import { getExercisesById } from '../db/exercises.js';
import { recordCompletion } from '../db/history.js';
import { showSessionPreview } from './run.js';

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
  showSessionPreview(view, {
    title: serie.nom,
    resolved,
    steps,
    onBack: () => showChooser(view),
    onComplete: () =>
      recordCompletion({
        source: 'serie',
        serieId: serie.id,
        serieName: serie.nom,
        exerciseIds: resolved.map((r) => r.exerciseId),
      }),
  });
}
