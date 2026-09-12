import { getDB, STORE_HISTORY } from './database.js';

/**
 * Modèle Completion stocké en IndexedDB :
 * {
 *   id: string (uuid),
 *   date: 'YYYY-MM-DD' (jour local, pour le streak),
 *   timestamp: string (ISO, moment exact),
 *   source: 'serie' | 'random',
 *   serieId: string | null,   // id de la série (source==='serie'), null sinon
 *   serieName: string,        // nom affiché (série ou "Aléatoire · Fitness"…)
 *   exerciseIds: string[],    // exercices résolus, pour les stats par exercice
 * }
 */

/** Clé jour locale (pas UTC) au format YYYY-MM-DD. */
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dayKey(dt);
}

export async function recordCompletion({ source, serieId = null, serieName, exerciseIds }) {
  const db = await getDB();
  const entry = {
    id: crypto.randomUUID(),
    date: dayKey(),
    timestamp: new Date().toISOString(),
    source,
    serieId,
    serieName,
    exerciseIds,
  };
  await db.put(STORE_HISTORY, entry);
  return entry;
}

export async function listCompletions() {
  const db = await getDB();
  const all = await db.getAll(STORE_HISTORY);
  return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Jours distincts (YYYY-MM-DD) avec au moins une séance, triés croissant. */
export function completedDays(completions) {
  return [...new Set(completions.map((c) => c.date))].sort();
}

/** Streak en cours : jours consécutifs jusqu'à aujourd'hui (ou hier si rien fait aujourd'hui). */
export function currentStreak(days, today = dayKey()) {
  const set = new Set(days);
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  if (!set.has(cursor)) return 0;
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** Plus long streak jamais atteint. `days` doit être trié croissant. */
export function maxStreak(days) {
  let max = 0;
  let current = 0;
  let prev = null;
  for (const day of days) {
    current = prev !== null && shiftDay(prev, 1) === day ? current + 1 : 1;
    max = Math.max(max, current);
    prev = day;
  }
  return max;
}

/** Nombre de complétions par exercice (id). */
export function countByExercise(completions) {
  const counts = {};
  for (const c of completions) {
    for (const id of c.exerciseIds) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Streak courant d'une série précise (jours consécutifs où CETTE série a été faite). */
export function serieStreak(completions, serieId, today = dayKey()) {
  const days = completedDays(completions.filter((c) => c.serieId === serieId));
  return currentStreak(days, today);
}

/** Calcule toutes les stats globales en un appel — pratique pour l'écran Historique. */
export async function getStats() {
  const completions = await listCompletions();
  const days = completedDays(completions);
  return {
    completions,
    days,
    currentStreak: currentStreak(days),
    maxStreak: maxStreak(days),
    totalSessions: completions.length,
    byExercise: countByExercise(completions),
  };
}
