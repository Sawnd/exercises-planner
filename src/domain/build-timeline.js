/**
 * Transforme une série résolue en liste d'étapes consommables par le moteur.
 *
 * - Un compte à rebours de préparation (3 s par défaut) ouvre la séance.
 * - Enchaînement : travail → repos → travail → repos → ... → dernier travail.
 * - PAS de repos après le dernier exercice.
 * - Un repos de 0 s est omis.
 *
 * @param {{ nom: string, duree: number, repos: number }[]} resolved
 * @param {{ prepareSeconds?: number }} [options]
 * @returns {{ type: 'prepare'|'work'|'rest', label: string, seconds: number, exerciseName: string }[]}
 */
export function buildTimeline(resolved, { prepareSeconds = 3 } = {}) {
  const steps = [];
  if (resolved.length === 0) return steps;

  steps.push({
    type: 'prepare',
    label: 'Préparez-vous',
    seconds: prepareSeconds,
    exerciseName: resolved[0].nom,
  });

  resolved.forEach((entry, i) => {
    steps.push({
      type: 'work',
      label: entry.nom,
      seconds: entry.duree,
      exerciseName: entry.nom,
    });

    const isLast = i === resolved.length - 1;
    if (!isLast && entry.repos > 0) {
      steps.push({
        type: 'rest',
        label: 'Repos',
        seconds: entry.repos,
        exerciseName: resolved[i + 1].nom, // prochain exercice
      });
    }
  });

  return steps;
}
