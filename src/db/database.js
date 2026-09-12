import { openDB } from 'idb';

const DB_NAME = 'exercises-planner';
const DB_VERSION = 3;

export const STORE_EXERCISES = 'exercises';
export const STORE_SERIES = 'series';
export const STORE_HISTORY = 'history';

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
        // v3 : historique des séances complétées (séries + random)
        if (oldVersion < 3) {
          const store = db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
          store.createIndex('date', 'date');
          store.createIndex('serieId', 'serieId');
        }
      },
    });
  }
  return _dbPromise;
}
