// Compresse une image choisie par l'utilisateur en data URL JPEG, pour un
// stockage raisonnable en IndexedDB (les photos de téléphone brutes font
// plusieurs Mo). Gère l'orientation EXIF via createImageBitmap.

/**
 * @param {File} file
 * @param {{ maxSize?: number, quality?: number }} [options]
 * @returns {Promise<string>} data URL JPEG
 */
export async function fileToCompressedDataUrl(file, { maxSize = 640, quality = 0.82 } = {}) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier choisi n’est pas une image.');
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    bitmap.close?.();
  }
}
