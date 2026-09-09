import { openDB } from 'idb';

const DB_NAME = 'exercises-planner';
const DB_VERSION = 2;

export const STORE_EXERCISES = 'exercises';
export const STORE_SERIES = 'series';

let _dbPromise = null;

export function getDB() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 : store des exercices (bibliothèque)
        if (oldVersion < 1) {
          db.createObjectStore(STORE_EXERCISES, { keyPath: 'id' });
        }
        // v2 : store des séries manuelles
        if (oldVersion < 2) {
          db.createObjectStore(STORE_SERIES, { keyPath: 'id' });
        }
        // Les stores des étapes suivantes (historique) seront ajoutés ici
        // en incrémentant DB_VERSION.
      },
    });
  }
  return _dbPromise;
}
