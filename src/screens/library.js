import { el, clear } from '../ui/dom.js';
import {
  MASTER_CATEGORIES,
  listExercises,
  listCategories,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../db/exercises.js';
import { renderCategoryFilterBar } from '../ui/category-filter.js';

const MASTER_LABEL = { fitness: 'Fitness', yoga: 'Yoga' };

export async function renderLibrary(root) {
  clear(root);
  const container = el('section', { class: 'screen library' });
  root.append(container);
  // L'état du filtre survit aux re-rendus (édition, ajout, suppression)
  // tant qu'on reste sur cet écran.
  const filterState = { masters: new Set(), tags: new Set() };
  await refresh(container, filterState);
}

function applyFilter(exercises, { masters, tags }) {
  return exercises.filter(
    (e) =>
      (masters.size === 0 || masters.has(e.masterCategorie)) &&
      (tags.size === 0 || [...tags].some((t) => e.categories.includes(t))),
  );
}

async function refresh(container, filterState, { editingId = null, creating = false } = {}) {
  clear(container);
  const [allExercises, knownCategories] = await Promise.all([
    listExercises(),
    listCategories(),
  ]);

  container.append(
    el('div', { class: 'library__head' }, [
      el('h1', { text: 'Bibliothèque' }),
      el('button', {
        class: 'btn btn--primary',
        text: '+ Ajouter',
        disabled: creating,
        onClick: () => refresh(container, filterState, { creating: true }),
      }),
    ]),
  );

  if (creating) {
    container.append(
      renderForm({ container, filterState, knownCategories, exercise: null }),
    );
  }

  if (allExercises.length === 0 && !creating) {
    container.append(
      el('p', { class: 'muted', text: 'Aucun exercice. Ajoute ton premier exercice de kiné, de fitness ou de yoga.' }),
    );
    return;
  }

  container.append(
    renderCategoryFilterBar({
      exercises: allExercises,
      initialState: filterState,
      onChange: (_filtered, state) => {
        filterState.masters = state.masters;
        filterState.tags = state.tags;
        refresh(container, filterState, { editingId, creating });
      },
    }),
  );

  const exercises = applyFilter(allExercises, filterState);
  const list = el('ul', { class: 'ex-list' });
  if (exercises.length === 0) {
    list.append(el('li', { class: 'muted', text: 'Aucun exercice ne correspond à ce filtre.' }));
  } else {
    for (const ex of exercises) {
      if (ex.id === editingId) {
        list.append(
          el('li', { class: 'ex-list__item ex-list__item--editing' }, [
            renderForm({ container, filterState, knownCategories, exercise: ex }),
          ]),
        );
      } else {
        list.append(renderRow(container, filterState, ex));
      }
    }
  }
  container.append(list);
}

function renderRow(container, filterState, ex) {
  return el('li', { class: 'ex-list__item' }, [
    el('div', { class: 'ex-list__main' }, [
      el('div', { class: 'ex-list__title' }, [
        el('span', { class: 'ex-name', text: ex.nom }),
        el('span', { class: `badge badge--${ex.masterCategorie}`, text: MASTER_LABEL[ex.masterCategorie] }),
      ]),
      el('div', { class: 'ex-list__meta' }, [
        el('span', { class: 'chip chip--time', text: `${ex.dureeDefaut}s effort` }),
        el('span', { class: 'chip chip--time', text: `${ex.reposDefaut}s repos` }),
        ...ex.categories.map((c) => el('span', { class: 'chip', text: c })),
      ]),
    ]),
    el('div', { class: 'ex-list__actions' }, [
      el('button', {
        class: 'btn btn--ghost',
        text: 'Éditer',
        onClick: () => refresh(container, filterState, { editingId: ex.id }),
      }),
      el('button', {
        class: 'btn btn--danger-ghost',
        text: 'Suppr.',
        onClick: async () => {
          if (!confirm(`Supprimer « ${ex.nom} » ?`)) return;
          try {
            await deleteExercise(ex.id);
            await refresh(container, filterState);
          } catch (err) {
            alert(err.message);
          }
        },
      }),
    ]),
  ]);
}

function renderForm({ container, filterState, knownCategories, exercise }) {
  const isEdit = Boolean(exercise);
  let tags = isEdit ? [...exercise.categories] : [];

  const datalistId = 'cat-suggestions';
  const datalist = el(
    'datalist',
    { id: datalistId },
    knownCategories.map((c) => el('option', { value: c })),
  );

  const tagsBox = el('div', { class: 'tags-box' });
  const tagInput = el('input', {
    type: 'text',
    class: 'tags-box__input',
    list: datalistId,
    placeholder: 'catégorie libre, Entrée pour ajouter',
    autocomplete: 'off',
  });

  function renderTags() {
    clear(tagsBox);
    for (const t of tags) {
      tagsBox.append(
        el('span', { class: 'tag' }, [
          t,
          el('button', {
            type: 'button',
            class: 'tag__remove',
            'aria-label': `Retirer ${t}`,
            text: '×',
            onClick: () => {
              tags = tags.filter((x) => x !== t);
              renderTags();
            },
          }),
        ]),
      );
    }
    tagsBox.append(tagInput);
  }

  function commitTag() {
    const value = tagInput.value.trim();
    if (value && !tags.includes(value)) tags.push(value);
    tagInput.value = '';
    renderTags();
    tagInput.focus();
  }

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag();
    } else if (e.key === 'Backspace' && tagInput.value === '' && tags.length) {
      tags.pop();
      renderTags();
    }
  });
  tagInput.addEventListener('blur', commitTag);

  renderTags();

  const nomInput = el('input', {
    type: 'text',
    name: 'nom',
    required: 'required',
    value: isEdit ? exercise.nom : '',
    placeholder: 'ex. Fentes avant',
  });

  const masterSelect = el(
    'select',
    { name: 'masterCategorie', required: 'required' },
    MASTER_CATEGORIES.map((m) =>
      el('option', {
        value: m,
        text: MASTER_LABEL[m],
        selected: isEdit && exercise.masterCategorie === m,
      }),
    ),
  );

  const dureeInput = el('input', {
    type: 'number', name: 'dureeDefaut', min: '1', required: 'required',
    value: isEdit ? exercise.dureeDefaut : 30,
  });
  const reposInput = el('input', {
    type: 'number', name: 'reposDefaut', min: '0', required: 'required',
    value: isEdit ? exercise.reposDefaut : 10,
  });

  const errorBox = el('p', { class: 'form__error', hidden: true });

  const form = el('form', { class: 'ex-form' }, [
    datalist,
    el('label', {}, [el('span', { text: 'Nom' }), nomInput]),
    el('label', {}, [el('span', { text: 'Master catégorie' }), masterSelect]),
    el('label', {}, [el('span', { text: 'Catégories libres' }), tagsBox]),
    el('div', { class: 'ex-form__row' }, [
      el('label', {}, [el('span', { text: 'Durée effort par défaut (s)' }), dureeInput]),
      el('label', {}, [el('span', { text: 'Repos par défaut (s)' }), reposInput]),
    ]),
    errorBox,
    el('div', { class: 'ex-form__actions' }, [
      el('button', { type: 'submit', class: 'btn btn--primary', text: isEdit ? 'Enregistrer' : 'Créer' }),
      el('button', {
        type: 'button',
        class: 'btn btn--ghost',
        text: 'Annuler',
        onClick: () => refresh(container, filterState),
      }),
    ]),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    commitTag();
    const payload = {
      nom: nomInput.value,
      masterCategorie: masterSelect.value,
      categories: tags,
      dureeDefaut: dureeInput.value,
      reposDefaut: reposInput.value,
    };
    try {
      if (isEdit) await updateExercise(exercise.id, payload);
      else await createExercise(payload);
      await refresh(container, filterState);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
    }
  });

  return form;
}
