import { getDB, STORE_SERIES } from './database.js';

/**
 * Modèle Série stocké en IndexedDB :
 * {
 *   id: string (uuid),
 *   nom: string,
 *   items: {
 *     exercise_id: string,   // référence un Exercise de la bibliothèque
 *     duree: number | null,  // null = hérite de exercise.dureeDefaut
 *     repos: number | null,  // null = hérite de exercise.reposDefaut
 *   }[]
 * }
 */

function toNullableInt(value, { min }) {
  if (value === null || value === undefined || value === '') return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < min) {
    throw new Error(`Valeur numérique invalide : ${value}`);
  }
  return n;
}

function normalizeItem(raw) {
  const exercise_id = String(raw.exercise_id ?? '').trim();
  if (!exercise_id) throw new Error('Un item de série référence un exercice vide.');
  return {
    exercise_id,
    duree: toNullableInt(raw.duree, { min: 1 }),
    repos: toNullableInt(raw.repos, { min: 0 }),
  };
}

function normalize(input) {
  const nom = String(input.nom ?? '').trim();
  if (!nom) throw new Error('Le nom de la série est obligatoire.');

  const items = (Array.isArray(input.items) ? input.items : []).map(normalizeItem);
  if (items.length === 0) throw new Error('Ajoute au moins un exercice à la série.');

  return { nom, items };
}

export async function listSeries() {
  const db = await getDB();
  const all = await db.getAll(STORE_SERIES);
  return all.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function getSerie(id) {
  const db = await getDB();
  return db.get(STORE_SERIES, id);
}

export async function createSerie(input) {
  const db = await getDB();
  const serie = { id: crypto.randomUUID(), ...normalize(input) };
  await db.put(STORE_SERIES, serie);
  return serie;
}

export async function updateSerie(id, input) {
  const db = await getDB();
  const existing = await db.get(STORE_SERIES, id);
  if (!existing) throw new Error(`Série introuvable : ${id}`);
  const serie = { ...existing, ...normalize(input), id };
  await db.put(STORE_SERIES, serie);
  return serie;
}

export async function deleteSerie(id) {
  const db = await getDB();
  await db.delete(STORE_SERIES, id);
}

/** Séries (id + nom) qui référencent l'exercice donné — pour bloquer sa suppression. */
export async function seriesUsingExercise(exerciseId) {
  const all = await listSeries();
  return all
    .filter((s) => s.items.some((it) => it.exercise_id === exerciseId))
    .map((s) => ({ id: s.id, nom: s.nom }));
}
