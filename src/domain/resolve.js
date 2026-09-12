/**
 * Règles de résolution — STRICTES, pas d'exception.
 *
 * Série manuelle : durée effective = item.duree ?? exercise.dureeDefaut
 *                  repos effectif  = item.repos ?? exercise.reposDefaut
 *
 * (Le mode random, lui, ignore totalement les défauts de la bibliothèque et
 *  applique durée_globale / repos_global à tous les exercices — voir étape 3.)
 */

/**
 * @param {{ items: {exercise_id: string, duree: number|null, repos: number|null}[] }} serie
 * @param {Record<string, {nom: string, dureeDefaut: number, reposDefaut: number}>} exercisesById
 * @returns {{ nom: string, duree: number, repos: number }[]}
 */
export function resolveManualSerie(serie, exercisesById) {
  return serie.items.map((item) => {
    const exercise = exercisesById[item.exercise_id];
    if (!exercise) {
      throw new Error(`Exercice introuvable dans la bibliothèque : ${item.exercise_id}`);
    }
    return {
      nom: exercise.nom,
      duree: item.duree ?? exercise.dureeDefaut,
      repos: item.repos ?? exercise.reposDefaut,
    };
  });
}

/**
 * Résolution du mode random : TOUS les exercices tirés utilisent durée_globale /
 * repos_global. Les défauts de la bibliothèque sont ignorés dans ce mode.
 *
 * @param {{nom: string}[]} drawnExercises
 * @param {{ dureeGlobale: number, reposGlobale: number }} globals
 */
export function resolveRandomDraw(drawnExercises, { dureeGlobale, reposGlobale }) {
  return drawnExercises.map((exercise) => ({
    nom: exercise.nom,
    duree: dureeGlobale,
    repos: reposGlobale,
  }));
}
