import { el, clear } from './dom.js';
import { MASTER_CATEGORIES } from '../db/exercises.js';

const MASTER_LABEL = { fitness: 'Fitness', yoga: 'Yoga' };

/**
 * Barre de filtres réutilisable : master catégorie (multi) + tags (multi, OR).
 * Aucune sélection sur un axe = pas de restriction sur cet axe.
 *
 * @param {object} opts
 * @param {object[]} opts.exercises - pool complet (sert à dériver les tags disponibles)
 * @param {{ masters?: Set<string>, tags?: Set<string> }} [opts.initialState] - état à restaurer
 * @param {(filtered: object[], state: {masters: Set<string>, tags: Set<string>}) => void} opts.onChange
 * @returns {HTMLElement}
 */
export function renderCategoryFilterBar({ exercises, initialState, onChange }) {
  const state = {
    masters: new Set(initialState?.masters ?? []),
    tags: new Set(initialState?.tags ?? []),
  };

  const masterRow = el('div', { class: 'toggle-row' });
  const tagsRow = el('div', { class: 'toggle-row' });

  function availableTags() {
    const scoped = state.masters.size === 0
      ? exercises
      : exercises.filter((e) => state.masters.has(e.masterCategorie));
    return [...new Set(scoped.flatMap((e) => e.categories))].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  function filtered() {
    return exercises.filter(
      (e) =>
        (state.masters.size === 0 || state.masters.has(e.masterCategorie)) &&
        (state.tags.size === 0 || [...state.tags].some((t) => e.categories.includes(t))),
    );
  }

  function emit() {
    onChange(filtered(), state);
  }

  function renderMaster() {
    clear(masterRow);
    for (const m of MASTER_CATEGORIES) {
      masterRow.append(
        el('button', {
          type: 'button',
          class: `chip-toggle ${state.masters.has(m) ? 'is-active' : ''}`,
          text: MASTER_LABEL[m],
          onClick: () => {
            if (state.masters.has(m)) state.masters.delete(m);
            else state.masters.add(m);
            // les tags qui ne concernent plus aucune master catégorie sélectionnée sont retirés
            const stillAvailable = new Set(availableTagsFor(state.masters));
            for (const t of [...state.tags]) if (!stillAvailable.has(t)) state.tags.delete(t);
            renderMaster();
            renderTags();
            emit();
          },
        }),
      );
    }
  }

  function availableTagsFor(masters) {
    const scoped = masters.size === 0 ? exercises : exercises.filter((e) => masters.has(e.masterCategorie));
    return [...new Set(scoped.flatMap((e) => e.categories))];
  }

  function renderTags() {
    clear(tagsRow);
    const tags = availableTags();
    if (tags.length === 0) {
      tagsRow.append(el('span', { class: 'muted small', text: 'Aucun tag disponible.' }));
      return;
    }
    for (const t of tags) {
      tagsRow.append(
        el('button', {
          type: 'button',
          class: `chip-toggle ${state.tags.has(t) ? 'is-active' : ''}`,
          text: t,
          onClick: () => {
            if (state.tags.has(t)) state.tags.delete(t);
            else state.tags.add(t);
            renderTags();
            emit();
          },
        }),
      );
    }
  }

  renderMaster();
  renderTags();

  return el('div', { class: 'category-filter' }, [
    el('div', { class: 'random__field' }, [el('span', { class: 'muted small', text: 'Master catégorie' }), masterRow]),
    el('div', { class: 'random__field' }, [el('span', { class: 'muted small', text: 'Tags' }), tagsRow]),
  ]);
}
