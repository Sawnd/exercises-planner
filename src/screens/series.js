import { el, clear } from '../ui/dom.js';
import { listExercises, getExercisesById } from '../db/exercises.js';
import { listSeries, createSerie, updateSerie, deleteSerie } from '../db/series.js';
import { resolveManualSerie } from '../domain/resolve.js';
import { buildTimeline, timelineSeconds } from '../domain/build-timeline.js';

export async function renderSeries(root) {
  clear(root);
  const container = el('section', { class: 'screen series' });
  root.append(container);
  await refresh(container);
}

async function refresh(container, { editingId = null, creating = false } = {}) {
  clear(container);
  const [series, exercises, exercisesById] = await Promise.all([
    listSeries(),
    listExercises(),
    getExercisesById(),
  ]);

  container.append(
    el('div', { class: 'library__head' }, [
      el('h1', { text: 'Mes séries' }),
      el('button', {
        class: 'btn btn--primary',
        text: '+ Nouvelle série',
        disabled: creating || editingId !== null || exercises.length === 0,
        onClick: () => refresh(container, { creating: true }),
      }),
    ]),
  );

  if (exercises.length === 0) {
    container.append(
      el('p', { class: 'muted' }, [
        'Ajoute d’abord des exercices dans la ',
        el('a', { href: '#/bibliotheque', text: 'Bibliothèque' }),
        '.',
      ]),
    );
    return;
  }

  if (creating) {
    container.append(renderEditor({ container, exercises, exercisesById, serie: null }));
  }

  if (series.length === 0 && !creating) {
    container.append(el('p', { class: 'muted', text: 'Aucune série. Crée ta première série.' }));
    return;
  }

  const list = el('ul', { class: 'ex-list' });
  for (const serie of series) {
    if (serie.id === editingId) {
      list.append(
        el('li', { class: 'ex-list__item ex-list__item--editing' }, [
          renderEditor({ container, exercises, exercisesById, serie }),
        ]),
      );
    } else {
      list.append(renderCard(container, serie, exercisesById));
    }
  }
  container.append(list);
}

function renderCard(container, serie, exercisesById) {
  const resolved = resolveManualSerie(serie, exercisesById);
  const totalMin = Math.round(timelineSeconds(buildTimeline(resolved, { prepareSeconds: 3 })) / 60);
  const n = serie.items.length;

  return el('li', { class: 'ex-list__item' }, [
    el('div', { class: 'ex-list__main' }, [
      el('div', { class: 'ex-list__title' }, [el('span', { class: 'ex-name', text: serie.nom })]),
      el('div', { class: 'ex-list__meta' }, [
        el('span', { class: 'chip chip--time', text: `${n} exercice${n > 1 ? 's' : ''}` }),
        el('span', { class: 'chip chip--time', text: `≈ ${totalMin} min` }),
        ...resolved.slice(0, 4).map((r) => el('span', { class: 'chip', text: r.nom })),
        resolved.length > 4 ? el('span', { class: 'chip', text: `+${resolved.length - 4}` }) : null,
      ]),
    ]),
    el('div', { class: 'ex-list__actions' }, [
      el('button', {
        class: 'btn btn--ghost',
        text: 'Éditer',
        onClick: () => refresh(container, { editingId: serie.id }),
      }),
      el('button', {
        class: 'btn btn--danger-ghost',
        text: 'Suppr.',
        onClick: async () => {
          if (confirm(`Supprimer la série « ${serie.nom} » ?`)) {
            await deleteSerie(serie.id);
            await refresh(container);
          }
        },
      }),
    ]),
  ]);
}

function renderEditor({ container, exercises, exercisesById, serie }) {
  const isEdit = Boolean(serie);
  let items = isEdit ? serie.items.map((it) => ({ ...it })) : [];

  const nomInput = el('input', {
    type: 'text',
    value: isEdit ? serie.nom : '',
    placeholder: 'ex. Haut du corps',
    required: 'required',
  });

  const addSelect = el(
    'select',
    {},
    [
      el('option', { value: '', text: '— choisir un exercice —' }),
      ...exercises.map((e) =>
        el('option', { value: e.id, text: `${e.nom} · ${e.dureeDefaut}s / ${e.reposDefaut}s` }),
      ),
    ],
  );
  const addBtn = el('button', {
    type: 'button',
    class: 'btn btn--ghost',
    text: 'Ajouter',
    onClick: () => {
      if (!addSelect.value) return;
      items.push({ exercise_id: addSelect.value, duree: null, repos: null });
      addSelect.value = '';
      renderItems();
    },
  });

  const itemsList = el('div', { class: 'serie-items' });
  const errorBox = el('p', { class: 'form__error', hidden: true });

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    renderItems();
  }

  function renderItems() {
    clear(itemsList);
    if (items.length === 0) {
      itemsList.append(el('p', { class: 'muted', text: 'Aucun exercice dans la série.' }));
      return;
    }
    items.forEach((it, i) => {
      const ex = exercisesById[it.exercise_id];
      const dureeInput = el('input', {
        type: 'number', min: '1', class: 'mini',
        value: it.duree ?? '', placeholder: String(ex.dureeDefaut),
      });
      const reposInput = el('input', {
        type: 'number', min: '0', class: 'mini',
        value: it.repos ?? '', placeholder: String(ex.reposDefaut),
      });
      dureeInput.addEventListener('input', () => {
        it.duree = dureeInput.value === '' ? null : Number(dureeInput.value);
      });
      reposInput.addEventListener('input', () => {
        it.repos = reposInput.value === '' ? null : Number(reposInput.value);
      });

      itemsList.append(
        el('div', { class: 'serie-item' }, [
          el('div', { class: 'serie-item__order' }, [
            el('button', {
              type: 'button', class: 'icon-btn', text: '▲', 'aria-label': 'Monter',
              disabled: i === 0, onClick: () => move(i, -1),
            }),
            el('button', {
              type: 'button', class: 'icon-btn', text: '▼', 'aria-label': 'Descendre',
              disabled: i === items.length - 1, onClick: () => move(i, 1),
            }),
          ]),
          el('div', { class: 'serie-item__body' }, [
            el('span', { class: 'serie-item__name', text: ex.nom }),
            el('div', { class: 'serie-item__fields' }, [
              el('label', {}, [el('span', { text: 'durée (s)' }), dureeInput]),
              el('label', {}, [el('span', { text: 'repos (s)' }), reposInput]),
            ]),
          ]),
          el('button', {
            type: 'button', class: 'icon-btn icon-btn--danger', text: '✕', 'aria-label': 'Retirer',
            onClick: () => {
              items.splice(i, 1);
              renderItems();
            },
          }),
        ]),
      );
    });
  }
  renderItems();

  const form = el('form', { class: 'serie-form' }, [
    el('label', {}, [el('span', { text: 'Nom de la série' }), nomInput]),
    el('div', { class: 'serie-form__add' }, [addSelect, addBtn]),
    itemsList,
    el('p', { class: 'muted small', text: 'Champs durée / repos vides = valeur par défaut de l’exercice (affichée en gris).' }),
    errorBox,
    el('div', { class: 'ex-form__actions' }, [
      el('button', { type: 'submit', class: 'btn btn--primary', text: isEdit ? 'Enregistrer' : 'Créer' }),
      el('button', {
        type: 'button', class: 'btn btn--ghost', text: 'Annuler',
        onClick: () => refresh(container),
      }),
    ]),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = { nom: nomInput.value, items };
      if (isEdit) await updateSerie(serie.id, payload);
      else await createSerie(payload);
      await refresh(container);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
    }
  });

  return form;
}
