// Stockage persistant : sans lui, le navigateur peut effacer IndexedDB quand le
// téléphone manque de place. Chrome l'accorde en général aux PWA installées.

/** Demande la persistance du stockage. Retourne true si elle est (ou devient) active. */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** @returns {Promise<{supported: boolean, persisted: boolean|null, usage: number|null, quota: number|null}>} */
export async function getStorageStatus() {
  const supported = Boolean(navigator.storage?.persisted);
  let persisted = null;
  let usage = null;
  let quota = null;
  try {
    if (supported) persisted = await navigator.storage.persisted();
  } catch {
    /* état inconnu */
  }
  try {
    const estimate = await navigator.storage?.estimate?.();
    usage = estimate?.usage ?? null;
    quota = estimate?.quota ?? null;
  } catch {
    /* estimation indisponible */
  }
  return { supported, persisted, usage, quota };
}
