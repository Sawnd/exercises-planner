import { el, clear } from '../ui/dom.js';
import { exportAllData, importAllData } from '../db/backup.js';

export async function renderBackup(root) {
  clear(root);
  const container = el('section', { class: 'screen backup' });
  root.append(container);
  render(container);
}

function render(container) {
  clear(container);

  const statusBox = el('p', { class: 'muted small' });
  const errorBox = el('p', { class: 'form__error', hidden: true });

  const exportBtn = el('button', { class: 'btn btn--primary', text: 'Exporter (JSON)' });
  exportBtn.addEventListener('click', async () => {
    errorBox.hidden = true;
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: `exercises-planner-${data.exportedAt.slice(0, 10)}.json` });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    statusBox.textContent = `Export généré : ${data.exercises.length} exercice(s), ${data.series.length} série(s), ${data.history.length} séance(s).`;
  });

  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    errorBox.hidden = true;

    if (!confirm('Importer ce fichier va REMPLACER toutes les données actuelles (bibliothèque, séries, historique). Continuer ?')) {
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importAllData(data);
      statusBox.textContent = `Import réussi : ${result.exercises} exercice(s), ${result.series} série(s), ${result.history} séance(s).`;
    } catch (err) {
      errorBox.textContent = `Échec de l'import : ${err.message}`;
      errorBox.hidden = false;
    }
  });
  const importBtn = el('button', {
    type: 'button', class: 'btn btn--ghost', text: 'Importer un fichier…',
    onClick: () => fileInput.click(),
  });

  container.append(
    el('h1', { text: 'Export / Import' }),
    el('p', { class: 'muted', text: 'Sauvegarde locale complète (bibliothèque, séries, historique) au format JSON — aucune donnée ne quitte cet appareil.' }),
    el('div', { class: 'ex-form__actions' }, [exportBtn, importBtn, fileInput]),
    statusBox,
    errorBox,
    el('p', { class: 'muted small', text: 'L’import remplace intégralement les données actuelles : exporte d’abord si tu veux garder une sauvegarde de ce qui est déjà sur cet appareil.' }),
  );
}
