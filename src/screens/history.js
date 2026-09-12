import { el, clear } from '../ui/dom.js';
import { getExercisesById } from '../db/exercises.js';
import { getStats, dayKey } from '../db/history.js';

export async function renderHistory(root) {
  clear(root);
  const container = el('section', { class: 'screen history' });
  root.append(container);
  await refresh(container);
}

async function refresh(container) {
  clear(container);
  const [stats, exercisesById] = await Promise.all([getStats(), getExercisesById()]);

  container.append(el('h1', { text: 'Historique' }));

  container.append(
    el('div', { class: 'stats-row' }, [
      statTile('🔥', stats.currentStreak, stats.currentStreak > 1 ? 'jours d’affilée' : 'jour d’affilée'),
      statTile('🏆', stats.maxStreak, 'record'),
      statTile('✅', stats.totalSessions, stats.totalSessions > 1 ? 'séances' : 'séance'),
    ]),
  );

  if (stats.totalSessions === 0) {
    container.append(
      el('p', { class: 'muted', text: 'Aucune séance complétée pour l’instant — lance un Player ou une séance Random pour commencer ton historique.' }),
    );
    return;
  }

  container.append(el('h2', { text: 'Ces 10 dernières semaines' }));
  container.append(renderCalendar(stats.days));

  container.append(el('h2', { text: 'Par exercice' }));
  const rows = Object.entries(stats.byExercise)
    .map(([id, count]) => ({ nom: exercisesById[id]?.nom ?? '(exercice supprimé)', count }))
    .sort((a, b) => b.count - a.count);

  container.append(
    el(
      'ul',
      { class: 'ex-list' },
      rows.map((r) =>
        el('li', { class: 'ex-list__item' }, [
          el('span', { class: 'ex-name', text: r.nom }),
          el('span', { class: 'chip chip--time', text: `${r.count}×` }),
        ]),
      ),
    ),
  );
}

function statTile(emoji, value, label) {
  return el('div', { class: 'stat-tile' }, [
    el('div', { class: 'stat-tile__value', text: `${emoji} ${value}` }),
    el('div', { class: 'stat-tile__label muted small', text: label }),
  ]);
}

function renderCalendar(days) {
  const done = new Set(days);
  const totalDays = 70; // 10 semaines
  const cells = [];
  const now = new Date();
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    cells.push(
      el('div', {
        class: `cal-cell ${done.has(key) ? 'is-done' : ''}`,
        title: key,
      }),
    );
  }
  return el('div', { class: 'calendar-grid' }, cells);
}
