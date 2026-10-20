import { el, clear } from '../ui/dom.js';
import { exportAllData, importAllData, listSnapshots, restoreSnapshot } from '../db/backup.js';
import { getStorageStatus, requestPersistentStorage } from '../db/persistence.js';
import { markBackupDone, daysSinceLastBackup } from '../backup-state.js';

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
  const snapshots = renderSnapshots();

  const lastBackupBox = el('p', { class: 'small' });
  function refreshLastBackup() {
    const days = daysSinceLastBackup();
    lastBackupBox.textContent = days === null
      ? '💾 Dernière sauvegarde : jamais'
      : `💾 Dernière sauvegarde : ${days === 0 ? 'aujourd’hui' : `il y a ${days} jour${days > 1 ? 's' : ''}`}`;
  }
  refreshLastBackup();

  function setBusy(busy) {
    shareBtn.disabled = busy;
    exportBtn.disabled = busy;
    importBtn.disabled = busy;
  }

  function backupFileOf(data) {
    return new File(
      [JSON.stringify(data, null, 2)],
      `exercises-planner-${data.exportedAt.slice(0, 10)}.json`,
      { type: 'application/json' },
    );
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const link = el('a', { href: url, download: file.name });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const summaryOf = (data) =>
    `${data.exercises.length} exercice(s), ${data.series.length} série(s), ${data.history.length} séance(s)`;

  function showStatus(text, { spinner = false } = {}) {
    clear(statusBox);
    if (spinner) statusBox.append(el('span', { class: 'spinner' }));
    statusBox.append(el('span', { text }));
  }

  // Sauvegarde en un geste : feuille de partage du téléphone (Drive, mail, Notes…),
  // avec repli sur un téléchargement si le partage de fichiers n'est pas supporté.
  const shareBtn = el('button', { class: 'btn btn--primary', text: 'Sauvegarder' });
  shareBtn.addEventListener('click', async () => {
    errorBox.hidden = true;
    setBusy(true);
    showStatus('Préparation de la sauvegarde…', { spinner: true });
    try {
      const data = await exportAllData();
      const file = backupFileOf(data);
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Sauvegarde Exercises Planner' });
        } catch (err) {
          if (err.name === 'AbortError') {
            showStatus('Partage annulé : aucune sauvegarde enregistrée.');
            return;
          }
          throw err;
        }
        markBackupDone();
        refreshLastBackup();
        showStatus(`Sauvegarde envoyée : ${summaryOf(data)}. Vérifie qu'elle est bien arrivée (Drive, mail…).`);
      } else {
        downloadFile(file);
        markBackupDone();
        refreshLastBackup();
        showStatus(`Fichier téléchargé : ${summaryOf(data)}. Mets-le à l'abri hors de cet appareil.`);
      }
    } catch (err) {
      clear(statusBox);
      errorBox.textContent = `Échec de la sauvegarde : ${err.message}`;
      errorBox.hidden = false;
    } finally {
      setBusy(false);
    }
  });

  const exportBtn = el('button', { class: 'btn btn--ghost', text: 'Télécharger (JSON)' });
  exportBtn.addEventListener('click', async () => {
    errorBox.hidden = true;
    setBusy(true);
    showStatus('Export en cours…', { spinner: true });
    try {
      const data = await exportAllData();
      downloadFile(backupFileOf(data));
      markBackupDone();
      refreshLastBackup();
      showStatus(`Export généré : ${summaryOf(data)}.`);
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
      await snapshots.refresh();
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
    lastBackupBox,
    el('div', { class: 'ex-form__actions backup__actions' }, [shareBtn, exportBtn, importBtn, fileInput]),
    statusBox,
    errorBox,
    el('p', { class: 'muted small', text: 'L’import remplace intégralement les données actuelles : exporte d’abord si tu veux garder une sauvegarde de ce qui est déjà sur cet appareil.' }),
    renderStorageProtection(),
    snapshots.el,
  );
}

const REASON_LABEL = { 'avant import': 'Avant un import', 'avant restauration': 'Avant une restauration' };

/** Copies de sécurité automatiques (prises avant chaque import) : liste + restauration. */
function renderSnapshots() {
  const box = el('div', { class: 'storage-status' });

  async function refresh() {
    const list = await listSnapshots();
    clear(box);
    if (list.length === 0) {
      box.append(el('p', { class: 'muted small', text: 'Copies de sécurité : aucune pour l’instant. Avant chaque import, l’état actuel est copié automatiquement ici.' }));
      return;
    }
    box.append(el('p', { class: 'small', text: '🕘 Copies de sécurité automatiques (les 3 dernières, prises avant un import) :' }));
    for (const s of list) {
      const when = new Date(s.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      box.append(
        el('div', { class: 'snapshot-row' }, [
          el('span', { class: 'small', text: `${REASON_LABEL[s.reason] ?? s.reason} · ${when} · ${s.counts.exercises} exo, ${s.counts.series} série(s), ${s.counts.history} séance(s)` }),
          el('button', {
            type: 'button', class: 'btn btn--ghost btn--sm', text: 'Restaurer',
            onClick: async () => {
              if (!confirm(`Remettre l’état du ${when} ? L’état actuel sera lui aussi gardé en copie de sécurité.`)) return;
              try {
                await restoreSnapshot(s.id);
              } catch (err) {
                alert(`Restauration impossible : ${err.message}`);
              }
              await refresh();
            },
          }),
        ]),
      );
    }
  }

  refresh();
  return { el: box, refresh };
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
