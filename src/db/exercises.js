import { getDB, STORE_EXERCISES } from './database.js';
import { seriesUsingExercise } from './series.js';

/**
 * Modèle Exercise stocké en IndexedDB :
 * {
 *   id: string (uuid),
 *   nom: string,
 *   masterCategorie: 'fitness' | 'yoga',   // simple champ de classement, aucun effet sur le timer
 *   categories: string[],                  // tags libres
 *   dureeDefaut: number,                   // secondes
 *   reposDefaut: number,                   // secondes
 * }
 */

export const MASTER_CATEGORIES = ['fitness', 'yoga'];

function toPositiveInt(value, { min = 0 } = {}) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < min) {
    throw new Error(`Valeur numérique invalide : ${value}`);
  }
  return n;
}

function normalize(input) {
  const nom = String(input.nom ?? '').trim();
  if (!nom) throw new Error('Le nom est obligatoire.');

  const masterCategorie = String(input.masterCategorie ?? '').trim();
  if (!MASTER_CATEGORIES.includes(masterCategorie)) {
    throw new Error(`Master catégorie invalide : ${input.masterCategorie}`);
  }

  const categories = [
    ...new Set(
      (Array.isArray(input.categories) ? input.categories : [])
        .map((c) => String(c).trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'fr'));

  return {
    nom,
    masterCategorie,
    categories,
    dureeDefaut: toPositiveInt(input.dureeDefaut, { min: 1 }),
    reposDefaut: toPositiveInt(input.reposDefaut, { min: 0 }),
  };
}

export async function listExercises() {
  const db = await getDB();
  const all = await db.getAll(STORE_EXERCISES);
  return all.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function getExercise(id) {
  const db = await getDB();
  return db.get(STORE_EXERCISES, id);
}

export async function createExercise(input) {
  const db = await getDB();
  const exercise = { id: crypto.randomUUID(), ...normalize(input) };
  await db.put(STORE_EXERCISES, exercise);
  return exercise;
}

export async function updateExercise(id, input) {
  const db = await getDB();
  const existing = await db.get(STORE_EXERCISES, id);
  if (!existing) throw new Error(`Exercice introuvable : ${id}`);
  const exercise = { ...existing, ...normalize(input), id };
  await db.put(STORE_EXERCISES, exercise);
  return exercise;
}

export async function deleteExercise(id) {
  const used = await seriesUsingExercise(id);
  if (used.length > 0) {
    const noms = used.map((s) => `« ${s.nom} »`).join(', ');
    throw new Error(
      `Impossible de supprimer : cet exercice est utilisé dans ${noms}. Retire-le d'abord de ${used.length > 1 ? 'ces séries' : 'cette série'}.`,
    );
  }
  const db = await getDB();
  await db.delete(STORE_EXERCISES, id);
}

/** Map { [id]: Exercise } pour la résolution des séries. */
export async function getExercisesById() {
  const all = await listExercises();
  return Object.fromEntries(all.map((e) => [e.id, e]));
}

/** Liste distincte des tags libres déjà saisis, pour l'autocomplétion. */
export async function listCategories() {
  const all = await listExercises();
  return [...new Set(all.flatMap((e) => e.categories))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
}
