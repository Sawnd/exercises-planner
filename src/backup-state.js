import { getDB, STORE_EXERCISES, STORE_SERIES, STORE_HISTORY } from './db/database.js';

// État léger lié à la sauvegarde (date de la dernière sauvegarde, etc.), gardé
// dans localStorage. Ce n'est PAS une donnée utilisateur : le perdre ne fait
// qu'afficher un rappel de sauvegarde en trop.

const KEY_LAST_BACKUP = 'ep:lastBackupAt';
export const STALE_AFTER_DAYS = 7;

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : tant pis */
  }
}

export function markBackupDone() {
  write(KEY_LAST_BACKUP, new Date().toISOString());
}

/** @returns {Date|null} */
export function getLastBackupAt() {
  const raw = read(KEY_LAST_BACKUP);
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

/** Nombre de jours entiers depuis la dernière sauvegarde, ou null si jamais. */
export function daysSinceLastBackup(now = new Date()) {
  const last = getLastBackupAt();
  if (!last) return null;
  return Math.max(0, Math.floor((now - last) / 86_400_000));
}

/** Y a-t-il quoi que ce soit à perdre (exercices, séries ou séances) ? */
export async function hasAnyData() {
  const db = await getDB();
  const counts = await Promise.all([
    db.count(STORE_EXERCISES),
    db.count(STORE_SERIES),
    db.count(STORE_HISTORY),
  ]);
  return counts.some((n) => n > 0);
}

// Détection de perte : on se souvient (localStorage) que l'appareil a déjà contenu des
// données. Si la base est ensuite vide alors que ce souvenir existe, on propose de
// restaurer. Limite : un « effacer les données du site » efface aussi ce souvenir.
const KEY_HAD_DATA = 'ep:hadData';

/** À appeler régulièrement : mémorise qu'il y a des données (ne l'efface jamais). */
export async function rememberDataPresence() {
  if (await hasAnyData()) write(KEY_HAD_DATA, '1');
}

/** À appeler après une suppression VOLONTAIRE : si tout est vide, ce n'est pas une perte. */
export async function forgetDataMarkerIfEmpty() {
  if (await hasAnyData()) return;
  try {
    localStorage.removeItem(KEY_HAD_DATA);
  } catch {
    /* ignore */
  }
}

/** La base est vide alors qu'elle a déjà contenu des données. */
export async function dataLossSuspected() {
  return read(KEY_HAD_DATA) === '1' && !(await hasAnyData());
}

/** Texte du rappel de sauvegarde, ou null s'il n'y a rien à rappeler. */
export async function backupReminderMessage() {
  if (!(await hasAnyData())) return null;
  const days = daysSinceLastBackup();
  if (days === null) {
    return '💾 Tes données ne sont pas encore sauvegardées : elles n’existent que sur ce téléphone.';
  }
  if (days >= STALE_AFTER_DAYS) {
    return `💾 Dernière sauvegarde il y a ${days} jours — pense à en refaire une.`;
  }
  return null;
}
