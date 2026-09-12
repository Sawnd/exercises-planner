import { getDB, STORE_EXERCISES, STORE_SERIES, STORE_HISTORY } from './database.js';

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

/**
 * Restaure des données exportées — REMPLACE entièrement le contenu local
 * actuel (bibliothèque, séries, historique).
 */
export async function importAllData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Fichier invalide : un objet JSON est attendu.');
  }
  if (!Array.isArray(data.exercises) || !Array.isArray(data.series)) {
    throw new Error('Format non reconnu : champs « exercises »/« series » manquants.');
  }
  const history = Array.isArray(data.history) ? data.history : [];

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
