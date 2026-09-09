import { openDB } from 'idb';

const DB_NAME = 'exercises-planner';
const DB_VERSION = 1;

export const STORE_EXERCISES = 'exercises';

let _dbPromise = null;

export function getDB() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 : store des exercices (bibliothèque)
        if (oldVersion < 1) {
          db.createObjectStore(STORE_EXERCISES, { keyPath: 'id' });
        }
        // Les stores des étapes suivantes (séries, historique) seront
        // ajoutés ici en incrémentant DB_VERSION.
      },
    });
  }
  return _dbPromise;
}
