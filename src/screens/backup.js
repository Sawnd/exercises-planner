import { el, clear } from '../ui/dom.js';
import { exportAllData, importAllData } from '../db/backup.js';
import { getStorageStatus, requestPersistentStorage } from '../db/persistence.js';

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

  function setBusy(busy) {
    exportBtn.disabled = busy;
    importBtn.disabled = busy;
  }

  function showStatus(text, { spinner = false } = {}) {
    clear(statusBox);
    if (spinner) statusBox.append(el('span', { class: 'spinner' }));
    statusBox.append(el('span', { text }));
  }

  const exportBtn = el('button', { class: 'btn btn--primary', text: 'Exporter (JSON)' });
  exportBtn.addEventListener('click', async () => {
    errorBox.hidden = true;
    setBusy(true);
    showStatus('Export en cours…', { spinner: true });
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = el('a', { href: url, download: `exercises-planner-${data.exportedAt.slice(0, 10)}.json` });
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showStatus(`Export généré : ${data.exercises.length} exercice(s), ${data.series.length} série(s), ${data.history.length} séance(s).`);
    } finally {
      setBusy(false);
    }
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
    setBusy(true);
    showStatus('Import en cours…', { spinner: true });
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importAllData(data);
      showStatus(`Import réussi : ${result.exercises} exercice(s), ${result.series} série(s), ${result.history} séance(s).`);
    } catch (err) {
      clear(statusBox);
      errorBox.textContent = `Échec de l'import : ${err.message}`;
      errorBox.hidden = false;
    } finally {
      setBusy(false);
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
    renderStorageProtection(),
  );
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Bloc « protection du stockage » : état de la persistance + bouton pour la demander. */
function renderStorageProtection() {
  const box = el('div', { class: 'storage-status' });

  async function refresh() {
    const status = await getStorageStatus();
    clear(box);
    const usage = status.usage != null ? ` · ${formatMB(status.usage)} utilisés` : '';

    if (!status.supported) {
      box.append(el('p', { class: 'muted small', text: `Protection du stockage : non gérée par ce navigateur${usage}. Exporte régulièrement.` }));
      return;
    }
    if (status.persisted) {
      box.append(el('p', { class: 'small', text: `🛡️ Stockage protégé : le navigateur n’efface pas tes données automatiquement${usage}. Une sauvegarde reste utile (effacement manuel, désinstallation).` }));
      return;
    }
    box.append(
      el('p', { class: 'small', text: `⚠️ Stockage non protégé : le navigateur peut effacer tes données si le téléphone manque de place${usage}. Exporte régulièrement.` }),
      el('button', {
        type: 'button', class: 'btn btn--ghost btn--sm', text: 'Protéger le stockage',
        onClick: async () => {
          await requestPersistentStorage();
          await refresh();
        },
      }),
    );
  }

  refresh();
  return box;
}
