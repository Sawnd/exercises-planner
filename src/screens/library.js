import { el, clear } from '../ui/dom.js';
import {
  MASTER_CATEGORIES,
  listExercises,
  listCategories,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../db/exercises.js';

const MASTER_LABEL = { fitness: 'Fitness', yoga: 'Yoga' };

export async function renderLibrary(root) {
  clear(root);
  const container = el('section', { class: 'screen library' });
  root.append(container);
  await refresh(container);
}

async function refresh(container, { editingId = null, creating = false } = {}) {
  clear(container);
  const [exercises, knownCategories] = await Promise.all([
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
        onClick: () => refresh(container, { creating: true }),
      }),
    ]),
  );

  if (creating) {
    container.append(
      renderForm({
        container,
        knownCategories,
        exercise: null,
      }),
    );
  }

  if (exercises.length === 0 && !creating) {
    container.append(
      el('p', { class: 'muted', text: 'Aucun exercice. Ajoute ton premier exercice de kiné, de fitness ou de yoga.' }),
    );
    return;
  }

  const list = el('ul', { class: 'ex-list' });
  for (const ex of exercises) {
    if (ex.id === editingId) {
      list.append(
        el('li', { class: 'ex-list__item ex-list__item--editing' }, [
          renderForm({ container, knownCategories, exercise: ex }),
        ]),
      );
    } else {
      list.append(renderRow(container, ex));
    }
  }
  container.append(list);
}

function renderRow(container, ex) {
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
        onClick: () => refresh(container, { editingId: ex.id }),
      }),
      el('button', {
        class: 'btn btn--danger-ghost',
        text: 'Suppr.',
        onClick: async () => {
          if (confirm(`Supprimer « ${ex.nom} » ?`)) {
            await deleteExercise(ex.id);
            await refresh(container);
          }
        },
      }),
    ]),
  ]);
}

function renderForm({ container, knownCategories, exercise }) {
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
        onClick: () => refresh(container),
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
      await refresh(container);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
    }
  });

  return form;
}
