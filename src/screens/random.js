import { el, clear } from '../ui/dom.js';
import { listExercises, MASTER_CATEGORIES } from '../db/exercises.js';
import { drawRandom } from '../domain/random.js';
import { resolveRandomDraw } from '../domain/resolve.js';
import { buildTimeline } from '../domain/build-timeline.js';
import { showSessionPreview } from './run.js';

const MASTER_LABEL = { fitness: 'Fitness', yoga: 'Yoga' };

export async function renderRandom(root) {
  clear(root);
  const view = el('section', { class: 'screen random' });
  root.append(view);
  await renderForm(view);
}

async function renderForm(view) {
  clear(view);
  const exercises = await listExercises();

  if (exercises.length === 0) {
    view.append(
      el('div', { class: 'player-start' }, [
        el('h1', { text: 'Random' }),
        el('p', { class: 'muted' }, [
          'Ajoute d’abord des exercices dans la ',
          el('a', { href: '#/bibliotheque', text: 'Bibliothèque' }),
          '.',
        ]),
      ]),
    );
    return;
  }

  let masterCategorie = null;
  let selectedTags = new Set();

  const masterRow = el('div', { class: 'toggle-row' });
  const tagsRow = el('div', { class: 'toggle-row' });
  const poolInfo = el('p', { class: 'muted small' });
  const countInput = el('input', { type: 'number', min: '1', value: '4' });
  const dureeInput = el('input', { type: 'number', min: '1', value: '30' });
  const reposInput = el('input', { type: 'number', min: '0', value: '10' });
  const errorBox = el('p', { class: 'form__error', hidden: true });
  const launchBtn = el('button', {
    type: 'button', class: 'btn btn--primary btn--big', text: 'Générer et lancer', disabled: true,
  });

  function pool() {
    if (!masterCategorie) return [];
    return exercises.filter(
      (e) =>
        e.masterCategorie === masterCategorie &&
        (selectedTags.size === 0 || [...selectedTags].some((t) => e.categories.includes(t))),
    );
  }

  function renderMaster() {
    clear(masterRow);
    for (const m of MASTER_CATEGORIES) {
      masterRow.append(
        el('button', {
          type: 'button',
          class: `chip-toggle ${masterCategorie === m ? 'is-active' : ''}`,
          text: MASTER_LABEL[m],
          onClick: () => {
            masterCategorie = m;
            selectedTags = new Set();
            renderMaster();
            renderTags();
            refreshPool();
          },
        }),
      );
    }
  }

  function renderTags() {
    clear(tagsRow);
    if (!masterCategorie) return;
    const tags = [...new Set(
      exercises.filter((e) => e.masterCategorie === masterCategorie).flatMap((e) => e.categories),
    )].sort((a, b) => a.localeCompare(b, 'fr'));

    if (tags.length === 0) {
      tagsRow.append(el('p', { class: 'muted small', text: 'Aucun tag pour cette catégorie — tous les exercices seront éligibles.' }));
      return;
    }
    for (const t of tags) {
      tagsRow.append(
        el('button', {
          type: 'button',
          class: `chip-toggle ${selectedTags.has(t) ? 'is-active' : ''}`,
          text: t,
          onClick: () => {
            if (selectedTags.has(t)) selectedTags.delete(t);
            else selectedTags.add(t);
            renderTags();
            refreshPool();
          },
        }),
      );
    }
  }

  function refreshPool() {
    const n = pool().length;
    poolInfo.textContent = masterCategorie
      ? `${n} exercice${n > 1 ? 's' : ''} éligible${n > 1 ? 's' : ''}`
      : 'Choisis une master catégorie pour commencer.';
    countInput.max = String(Math.max(n, 1));
    launchBtn.disabled = n === 0;
    errorBox.hidden = true;
  }

  renderMaster();
  renderTags();
  refreshPool();

  launchBtn.addEventListener('click', () => {
    const p = pool();
    if (p.length === 0) {
      errorBox.textContent = 'Aucun exercice ne correspond à ce filtre.';
      errorBox.hidden = false;
      return;
    }
    const count = Math.max(1, Math.min(Math.round(Number(countInput.value)) || 1, p.length));
    const dureeGlobale = Math.max(1, Math.round(Number(dureeInput.value)) || 30);
    const reposGlobale = Math.max(0, Math.round(Number(reposInput.value)) || 0);

    const drawn = drawRandom(p, count);
    const resolved = resolveRandomDraw(drawn, { dureeGlobale, reposGlobale });
    const steps = buildTimeline(resolved, { prepareSeconds: 3 });

    showSessionPreview(view, {
      title: `Aléatoire · ${MASTER_LABEL[masterCategorie]}`,
      resolved,
      steps,
      onBack: () => renderForm(view),
    });
  });

  view.append(
    el('h1', { text: 'Lancer une séance aléatoire' }),
    el('div', { class: 'random__field' }, [el('span', { class: 'muted small', text: 'Master catégorie' }), masterRow]),
    el('div', { class: 'random__field' }, [el('span', { class: 'muted small', text: 'Tags (optionnel)' }), tagsRow]),
    poolInfo,
    el('div', { class: 'ex-form__row' }, [
      el('label', {}, [el('span', { text: 'Nombre d’exercices' }), countInput]),
    ]),
    el('div', { class: 'ex-form__row' }, [
      el('label', {}, [el('span', { text: 'Durée globale (s)' }), dureeInput]),
      el('label', {}, [el('span', { text: 'Repos global (s)' }), reposInput]),
    ]),
    errorBox,
    launchBtn,
  );
}
