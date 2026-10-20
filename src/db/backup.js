import { getDB, STORE_EXERCISES, STORE_SERIES, STORE_HISTORY, STORE_SNAPSHOTS } from './database.js';

/** Export complet : bibliothèque + séries + historique. */
export async function exportAllData() {
  const db = await getDB();
  const [exercises, series, history] = await Promise.all([
    db.getAll(STORE_EXERCISES),
    db.getAll(STORE_SERIES),
    db.getAll(STORE_HISTORY),
  ]);
  return {
    app: 'exercises-planner',
    exportedAt: new Date().toISOString(),
    version: 1,
    exercises,
    series,
    history,
  };
}

const MAX_SNAPSHOTS = 3;

/**
 * Copie de sécurité interne de l'état actuel (jamais exportée, jamais effacée par un import).
 * Ne fait rien si l'appareil est vide : il n'y a alors rien à protéger.
 * @returns {Promise<object|null>} le snapshot créé (sans ses données), ou null
 */
export async function createSnapshot(reason) {
  const data = await exportAllData();
  if (data.exercises.length + data.series.length + data.history.length === 0) return null;

  const db = await getDB();
  const snapshot = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reason,
    counts: { exercises: data.exercises.length, series: data.series.length, history: data.history.length },
    data,
  };
  await db.put(STORE_SNAPSHOTS, snapshot);

  // Ne garde que les plus récents.
  const all = await db.getAll(STORE_SNAPSHOTS);
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const old of all.slice(MAX_SNAPSHOTS)) await db.delete(STORE_SNAPSHOTS, old.id);

  const { data: _data, ...meta } = snapshot;
  return meta;
}

/** Snapshots disponibles (métadonnées seulement), du plus récent au plus ancien. */
export async function listSnapshots() {
  const db = await getDB();
  const all = await db.getAll(STORE_SNAPSHOTS);
  return all
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ data: _data, ...meta }) => meta);
}

/** Remet l'état d'un snapshot (l'état courant est lui-même mis en snapshot avant). */
export async function restoreSnapshot(id) {
  const db = await getDB();
  const snapshot = await db.get(STORE_SNAPSHOTS, id);
  if (!snapshot) throw new Error('Copie de sécurité introuvable.');
  return importAllData(snapshot.data, { snapshotReason: 'avant restauration' });
}

/**
 * Restaure des données exportées — REMPLACE entièrement le contenu local
 * actuel (bibliothèque, séries, historique). L'état actuel est d'abord copié
 * dans un snapshot : si cette copie échoue, l'import est annulé (rien n'est touché).
 */
export async function importAllData(data, { snapshotReason = 'avant import' } = {}) {
  if (!data || typeof data !== 'object') {
    throw new Error('Fichier invalide : un objet JSON est attendu.');
  }
  if (!Array.isArray(data.exercises) || !Array.isArray(data.series)) {
    throw new Error('Format non reconnu : champs « exercises »/« series » manquants.');
  }
  const history = Array.isArray(data.history) ? data.history : [];

  try {
    await createSnapshot(snapshotReason);
  } catch (err) {
    throw new Error(`Impossible de sauvegarder l'état actuel avant l'import (${err.message}). Import annulé, tes données n'ont pas été modifiées.`);
  }

  const db = await getDB();
  const tx = db.transaction([STORE_EXERCISES, STORE_SERIES, STORE_HISTORY], 'readwrite');
  await Promise.all([
    tx.objectStore(STORE_EXERCISES).clear(),
    tx.objectStore(STORE_SERIES).clear(),
    tx.objectStore(STORE_HISTORY).clear(),
  ]);
  await Promise.all([
    ...data.exercises.map((e) => tx.objectStore(STORE_EXERCISES).put(e)),
    ...data.series.map((s) => tx.objectStore(STORE_SERIES).put(s)),
    ...history.map((h) => tx.objectStore(STORE_HISTORY).put(h)),
  ]);
  await tx.done;

  return { exercises: data.exercises.length, series: data.series.length, history: history.length };
}
